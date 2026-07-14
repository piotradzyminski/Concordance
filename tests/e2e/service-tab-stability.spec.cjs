"use strict";

const { test, expect, login } = require("./fixtures.cjs");

const SERVICE_USER = Object.freeze({ login: "Obywatel B", password: "beta", role: "citizen" });

async function readServiceGeometry(page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-service-root]");
    const tabs = root?.querySelector(".service-tabs");
    const body = root?.querySelector(".service-section-body");
    const active = document.activeElement;
    const diagnostics = window.WS_APP?.getServiceUiDiagnostics?.() || {};
    return {
      scrollY: window.scrollY,
      documentHeight: document.documentElement.scrollHeight,
      tabsTop: tabs?.getBoundingClientRect().top ?? null,
      tabsDocumentTop: tabs ? window.scrollY + tabs.getBoundingClientRect().top : null,
      activePanel: root?.dataset.serviceActivePanel || null,
      activeControl: active?.getAttribute?.("data-service-panel") || null,
      shellToken: root?.dataset.serviceShellToken || null,
      tabsToken: tabs?.dataset.serviceTabsToken || null,
      bodyToken: body?.dataset.serviceBodyToken || null,
      bodyElementCount: body?.querySelectorAll("*").length || 0,
      contractTileCount: body?.querySelectorAll(".service-contract-tile").length || 0,
      bodyHeightLocked: body?.dataset.serviceHeightLocked === "true",
      generateWeeklyOffersCalls: diagnostics.generateWeeklyOffersCalls || 0,
      sectionRenderCount: diagnostics.sectionRenderCount || 0,
      activeTabNoopCount: diagnostics.activeTabNoopCount || 0,
      lastRenderPanel: diagnostics.lastRenderPanel || "",
      lastRenderDurationMs: Number(diagnostics.lastRenderDurationMs || 0),
      incomePreloadRequests: diagnostics.incomePreloadRequests || 0,
      incomeRendererReady: typeof window.renderIncomeSourcesPanel === "function"
    };
  });
}

async function waitForLayout(page) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function waitForSettledLayout(page) {
  await waitForLayout(page);
  await page.waitForTimeout(100);
  await waitForLayout(page);
}

async function openServiceFromAccessPanel(page) {
  await login(page, SERVICE_USER);
  const serviceCard = page.locator('.module-card[data-id="service"]');
  await expect(serviceCard).toBeVisible({ timeout: 15_000 });
  await serviceCard.evaluate((element) => element.scrollIntoView({ block: "center", inline: "nearest" }));
  await waitForLayout(page);
  await serviceCard.click();

  const root = page.locator("[data-service-root]");
  await expect(root).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-service-panel="contracts"]')).toHaveAttribute("aria-selected", "true");
  await waitForSettledLayout(page);
}

async function sampleTabTransition(page, panel) {
  return page.evaluate((panelId) => new Promise((resolve) => {
    const read = () => {
      const root = document.querySelector("[data-service-root]");
      const tabs = root?.querySelector(".service-tabs");
      const body = root?.querySelector(".service-section-body");
      const diagnostics = window.WS_APP?.getServiceUiDiagnostics?.() || {};
      return {
        label: "",
        scrollY: window.scrollY,
        tabsTop: tabs?.getBoundingClientRect().top ?? null,
        tabsDocumentTop: tabs ? window.scrollY + tabs.getBoundingClientRect().top : null,
        activePanel: root?.dataset.serviceActivePanel || null,
        bodyHeightLocked: body?.dataset.serviceHeightLocked === "true",
        generateWeeklyOffersCalls: diagnostics.generateWeeklyOffersCalls || 0,
        sectionRenderCount: diagnostics.sectionRenderCount || 0,
        lastRenderPanel: diagnostics.lastRenderPanel || "",
        lastRenderDurationMs: Number(diagnostics.lastRenderDurationMs || 0)
      };
    };

    const samples = [];
    const button = document.querySelector(`[data-service-panel="${panelId}"]`);
    button.click();
    samples.push({ ...read(), label: "immediate" });

    requestAnimationFrame(() => {
      samples.push({ ...read(), label: "raf1" });
      requestAnimationFrame(() => {
        samples.push({ ...read(), label: "raf2" });
        setTimeout(() => {
          samples.push({ ...read(), label: "100ms" });
          resolve(samples);
        }, 100);
      });
    });
  }), panel);
}

function expectStableFrames(samples, baseline, panel) {
  expect(samples).toHaveLength(4);
  for (const sample of samples) {
    expect(sample.activePanel, `${panel}/${sample.label} active panel`).toBe(panel);
    expect(Math.abs(sample.scrollY - baseline.scrollY), `${panel}/${sample.label} scroll drift`).toBeLessThanOrEqual(1);
    expect(Math.abs(sample.tabsTop - baseline.tabsTop), `${panel}/${sample.label} tabs viewport drift`).toBeLessThanOrEqual(1);
    expect(Math.abs(sample.tabsDocumentTop - baseline.tabsDocumentTop), `${panel}/${sample.label} tabs document drift`).toBeLessThanOrEqual(1);
  }
  expect(samples[0].bodyHeightLocked).toBe(true);
  expect(samples[1].bodyHeightLocked).toBe(false);
}

test("Service tab switching has no frame bounce and light panels do not generate Contracts", async ({ page, consoleErrors }) => {
  await openServiceFromAccessPanel(page);

  const viewport = page.viewportSize();
  const root = page.locator("[data-service-root]");
  await root.evaluate((element) => {
    element.dataset.serviceShellToken = "stable-shell";
    element.querySelector(".service-tabs").dataset.serviceTabsToken = "stable-tabs";
    element.querySelector(".service-section-body").dataset.serviceBodyToken = "stable-body";
  });

  await page.waitForFunction(() => typeof window.renderIncomeSourcesPanel === "function", null, { timeout: 10_000 });

  const baseline = await readServiceGeometry(page);
  expect(baseline.contractTileCount).toBeGreaterThan(0);
  expect(baseline.contractTileCount).toBeLessThanOrEqual(20);
  expect(baseline.documentHeight).toBeGreaterThan(viewport.height);
  expect(baseline.tabsTop).toBeGreaterThanOrEqual(0);
  expect(baseline.tabsTop).toBeLessThan(viewport.height);
  if (viewport.height <= 720) expect(baseline.scrollY).toBeGreaterThan(0);

  const generationBaseline = baseline.generateWeeklyOffersCalls;

  for (const panel of ["income", "log", "experience"]) {
    const samples = await sampleTabTransition(page, panel);
    expectStableFrames(samples, baseline, panel);
    const settled = samples.at(-1);
    expect(settled.generateWeeklyOffersCalls).toBe(generationBaseline);
    expect(settled.lastRenderPanel).toBe(panel);
    expect(settled.lastRenderDurationMs).toBeLessThan(50);
    await expect(page.locator(`[data-service-panel="${panel}"]`)).toBeFocused();
  }

  const contractsSamples = await sampleTabTransition(page, "contracts");
  expectStableFrames(contractsSamples, baseline, "contracts");
  expect(contractsSamples.at(-1).lastRenderDurationMs).toBeLessThan(100);
  expect((await readServiceGeometry(page)).contractTileCount).toBeLessThanOrEqual(20);

  const beforeNoop = await readServiceGeometry(page);
  await page.locator('[data-service-panel="contracts"]').click();
  const afterNoop = await readServiceGeometry(page);
  expect(afterNoop.sectionRenderCount).toBe(beforeNoop.sectionRenderCount);
  expect(afterNoop.activeTabNoopCount).toBe(beforeNoop.activeTabNoopCount + 1);
  expect(afterNoop.bodyToken).toBe("stable-body");

  expect(afterNoop.shellToken).toBe("stable-shell");
  expect(afterNoop.tabsToken).toBe("stable-tabs");
  expect(consoleErrors).toEqual([]);
});

test("First Service entry preloads Income before the first click", async ({ page, consoleErrors }) => {
  await openServiceFromAccessPanel(page);

  await page.waitForFunction(() => typeof window.renderIncomeSourcesPanel === "function", null, { timeout: 10_000 });
  const before = await readServiceGeometry(page);
  expect(before.incomePreloadRequests).toBeGreaterThanOrEqual(1);
  expect(before.incomeRendererReady).toBe(true);

  const samples = await sampleTabTransition(page, "income");
  expect(samples.at(-1).activePanel).toBe("income");
  expect(samples.at(-1).lastRenderDurationMs).toBeLessThan(50);
  await expect(page.locator(".service-panel-loading")).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test("Cold Service entry resolves subscription eligibility as one shared batch", async ({ page, consoleErrors }) => {
  await login(page, SERVICE_USER);
  const entitlementBaseline = await page.evaluate(() => {
    window.WS_APP?.invalidateSubscriptionEntitlement?.("citizen-b");
    return Number(window.WS_APP?.getSubscriptionEntitlementCacheStats?.().contractSnapshotMisses || 0);
  });

  const serviceCard = page.locator('.module-card[data-id="service"]');
  await expect(serviceCard).toBeVisible({ timeout: 15_000 });
  await serviceCard.evaluate((element) => element.scrollIntoView({ block: "center", inline: "nearest" }));
  await waitForLayout(page);
  await serviceCard.click();

  await expect(page.locator("[data-service-root]")).toBeVisible({ timeout: 15_000 });
  await waitForSettledLayout(page);

  const result = await page.evaluate(() => {
    const diagnostics = window.WS_APP?.getServiceUiDiagnostics?.() || {};
    const citizen = window.WS_APP?.getCitizenById?.("citizen-b") || {};
    return {
      subscriptionCount: Array.isArray(citizen.subscriptions) ? citizen.subscriptions.length : 0,
      renderDuration: Number(diagnostics.lastRenderDurationMs || 0),
      generationCalls: Number(diagnostics.generateWeeklyOffersCalls || 0),
      eligibilityContexts: Number(diagnostics.eligibility?.eligibilityContextsCreated || 0),
      coverageComputations: Number(diagnostics.eligibility?.insuranceCoverageComputations || 0),
      entitlementChecks: Number(diagnostics.eligibility?.subscriptionEntitlementChecks || 0),
      installedCyberwareScans: Number(diagnostics.eligibility?.installedCyberwareScans || 0),
      contractSnapshotMisses: Number(diagnostics.subscriptionEntitlement?.contractSnapshotMisses || 0)
    };
  });
  result.contractSnapshotMisses -= entitlementBaseline;

  expect(result.generationCalls).toBe(1);
  expect(result.eligibilityContexts).toBe(1);
  expect(result.coverageComputations).toBeLessThanOrEqual(1);
  expect(result.entitlementChecks).toBeLessThanOrEqual(result.subscriptionCount);
  expect(result.installedCyberwareScans).toBeLessThanOrEqual(1);
  expect(result.contractSnapshotMisses).toBeLessThanOrEqual(result.subscriptionCount);
  expect(result.renderDuration).toBeLessThan(200);
  expect(consoleErrors).toEqual([]);
});
