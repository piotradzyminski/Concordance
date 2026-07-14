"use strict";

const { test: base, expect } = require("@playwright/test");

const USERS = Object.freeze({
  admin: { login: "Admin", password: "admin", role: "admin" },
  player: { login: "Obywatel A", password: "alpha", role: "citizen" }
});

const HEAVY_RUNTIME_APIS = Object.freeze([
  "getEquipmentState",
  "getEquipmentRuntimeState",
  "invalidateEquipmentRuntimeState",
  "renderEquipmentModule",
  "renderEquipmentCybergridPanel",
  "renderEquipmentCyberwareWorkspace",
  "refreshEquipmentWorkspace",
  "refreshEquipmentCyberwareWorkspace",
  "invalidateCyberwareWorkspaceRuntime"
]);

async function login(page, user) {
  await page.goto("/");
  await page.locator("#login-input").fill(user.login);
  await page.locator("#password-input").fill(user.password);
  await page.locator("#auth-form").press("Enter");
  await expect(page.locator("#terminal-screen")).toHaveClass(/is-active/, { timeout: 15_000 });
}

async function ensureLoggedIn(page, user = USERS.admin) {
  const terminal = page.locator("#terminal-screen");
  if (await terminal.count()) {
    const className = await terminal.getAttribute("class");
    if (/\bis-active\b/.test(className || "")) return;
  }
  const loginInput = page.locator("#login-input");
  if (!(await loginInput.count())) {
    await page.goto("/");
  }
  await page.locator("#login-input").fill(user.login);
  await page.locator("#password-input").fill(user.password);
  await page.locator("#auth-form").press("Enter");
  await expect(page.locator("#terminal-screen")).toHaveClass(/is-active/, { timeout: 15_000 });
}

async function waitForRuntime(page, apiNames = []) {
  await page.waitForFunction((names) => names.every((name) => typeof window.WS_APP?.[name] === "function"), apiNames, {
    timeout: 15_000
  });
}

async function resolveFixtureCitizenId(page) {
  return page.evaluate(() => {
    const app = window.WS_APP || {};
    const candidates = [
      app.currentUser?.citizenId,
      app.currentUser?.linkedCitizenId,
      app.currentCitizenId,
      app.getCurrentCitizen?.()?.id,
      app.getCurrentCitizen?.()?.citizenId
    ].map((value) => String(value || "").trim()).filter(Boolean);
    for (const candidate of candidates) {
      if (typeof app.getCitizenById !== "function" || app.getCitizenById(candidate)) return candidate;
    }
    const citizens = typeof app.getCitizens === "function"
      ? app.getCitizens()
      : (Array.isArray(window.APP_DATA?.citizens) ? window.APP_DATA.citizens : []);
    const first = Array.isArray(citizens) ? citizens.find((record) => record && (record.id || record.citizenId)) : null;
    return String(first?.id || first?.citizenId || "").trim();
  });
}

async function installFailureInjection(page, apiName, result, options = {}) {
  await installApiOverrides(page, [{ apiName, result, once: options.once !== false }]);
}

async function installApiOverrides(page, overrides = []) {
  await page.evaluate((definitions) => {
    window.__WS_TEST_HOOKS__ = window.__WS_TEST_HOOKS__ || { originals: {}, counters: {}, overrideState: {} };
    const hooks = window.__WS_TEST_HOOKS__;
    for (const definition of definitions) {
      const apiName = String(definition?.apiName || "").trim();
      if (!apiName) throw new Error("API name is required for override");
      const original = window.WS_APP?.[apiName];
      if (typeof original !== "function") throw new Error(`API not found for failure injection: ${apiName}`);
      if (!Object.prototype.hasOwnProperty.call(hooks.originals, apiName)) hooks.originals[apiName] = original;
      hooks.overrideState[apiName] = { used: 0 };
      window.WS_APP[apiName] = function injectedApiOverride(...args) {
        hooks.counters[apiName] = (hooks.counters[apiName] || 0) + 1;
        const state = hooks.overrideState[apiName];
        state.used += 1;
        if (definition.once === true && state.used > 1) return original.apply(this, args);
        if (Array.isArray(definition.sequence) && definition.sequence.length) {
          const index = Math.min(state.used - 1, definition.sequence.length - 1);
          return structuredClone(definition.sequence[index]);
        }
        return structuredClone(definition.result);
      };
    }
  }, overrides);
}

async function installRuntimeCounter(page, apiNames = []) {
  await page.evaluate((names) => {
    window.__WS_TEST_HOOKS__ = window.__WS_TEST_HOOKS__ || { originals: {}, counters: {}, overrideState: {} };
    const hooks = window.__WS_TEST_HOOKS__;
    for (const apiName of names) {
      const original = window.WS_APP?.[apiName];
      if (typeof original !== "function" || Object.prototype.hasOwnProperty.call(hooks.originals, apiName)) continue;
      hooks.originals[apiName] = original;
      window.WS_APP[apiName] = function countedRuntimeApi(...args) {
        hooks.counters[apiName] = (hooks.counters[apiName] || 0) + 1;
        return original.apply(this, args);
      };
    }
  }, apiNames);
}

async function restoreRuntimeHooks(page) {
  await page.evaluate(() => {
    const hooks = window.__WS_TEST_HOOKS__;
    if (!hooks) return;
    for (const [apiName, original] of Object.entries(hooks.originals || {})) {
      if (typeof original === "function") window.WS_APP[apiName] = original;
    }
    window.__WS_TEST_HOOKS__ = { originals: {}, counters: {}, overrideState: {} };
  });
}

async function getRuntimeCounters(page) {
  return page.evaluate(() => structuredClone(window.__WS_TEST_HOOKS__?.counters || {}));
}

async function dispatchCyberwareWorldOperationEvent(page, detail) {
  await page.evaluate((payload) => {
    window.dispatchEvent(new CustomEvent("ws:cyberware-world-operation-updated", {
      detail: structuredClone(payload)
    }));
  }, detail);
}

async function getOperationNotifications(page, citizenId, operationId) {
  return page.evaluate(({ citizenId, operationId }) => {
    const entries = window.WS_APP?.getTerminalEntries?.(citizenId, {
      folder: "INBOX",
      audience: "PLAYER"
    }) || [];
    return entries.filter((entry) => entry.correlationId === operationId || entry.dedupeKey === `world-operation:${operationId}`);
  }, { citizenId, operationId });
}

async function settleRuntime(page, delayMs = 75) {
  await page.waitForTimeout(delayMs);
}

async function resetCampaignStorage(page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

const test = base.extend({
  localOnlyNetwork: [async ({ context }, use) => {
    await context.route("**/*", async (route) => {
      const url = route.request().url();
      if (/^(?:https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/|data:|blob:|about:)/i.test(url)) {
        await route.continue();
        return;
      }
      await route.abort("blockedbyclient");
    });
    await use();
  }, { auto: true }],
  consoleErrors: async ({ page }, use) => {
    const errors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && !/ERR_BLOCKED_BY_CLIENT/i.test(message.text())) errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await use(errors);
  }
});

test.afterEach(async ({ page }) => {
  try {
    await restoreRuntimeHooks(page);
  } catch (error) {
    // The page may already be closed after a failed navigation.
  }
});

module.exports = {
  test,
  expect,
  USERS,
  HEAVY_RUNTIME_APIS,
  login,
  ensureLoggedIn,
  waitForRuntime,
  resolveFixtureCitizenId,
  installFailureInjection,
  installApiOverrides,
  installRuntimeCounter,
  restoreRuntimeHooks,
  getRuntimeCounters,
  dispatchCyberwareWorldOperationEvent,
  getOperationNotifications,
  settleRuntime,
  resetCampaignStorage
};
