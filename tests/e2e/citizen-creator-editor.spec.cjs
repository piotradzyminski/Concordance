"use strict";

const { test, expect, USERS, login } = require("./fixtures.cjs");

async function openCitizenCards(page) {
  await page.evaluate(() => window.WS_APP.openModule?.("citizen-cards", window.WS_APP.currentUser, { skipLoader: true }));
  await expect(page.locator(".citizen-cards-view")).toBeVisible();
}

test("Admin creates and activates a templated Citizen through Character Creator", async ({ page, consoleErrors }) => {
  await login(page, USERS.admin);
  await openCitizenCards(page);
  await page.locator("#citizen-default-button").click();
  await expect(page.locator("#citizen-creator-form")).toBeVisible();

  await page.locator('[name="firstName"]').fill("Creator");
  await page.locator('[name="surname"]').fill("E2E");
  await page.locator('[name="birthDate"]').fill("2080-02-03");
  await page.keyboard.press("Alt+2");
  await expect(page.locator('[data-creator-step="ABILITIES"]')).toHaveClass(/is-active/);
  await page.locator("[data-creator-apply-template]").click();
  await page.keyboard.press("Alt+5");
  await expect(page.locator('[data-creator-step="REVIEW"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-creator-admin-action="ACCEPT"]')).toBeEnabled();
  await page.locator('[data-creator-admin-action="ACCEPT"]').click();

  await expect(page.locator(".citizen-card-view")).toBeVisible();
  const state = await page.evaluate(() => {
    const citizen = window.WS_APP.getCitizenById?.(window.WS_APP.currentCitizenCardsSelectedId);
    return citizen?.recordState || "";
  });
  expect(state).toBe("ACTIVE");
  expect(consoleErrors).toEqual([]);
});

test("Admin creates an active NPC with Quick NPC Creator", async ({ page, consoleErrors }) => {
  await login(page, USERS.admin);
  await openCitizenCards(page);
  await page.locator("#citizen-quick-npc-button").click();
  await expect(page.locator("#citizen-quick-npc-form")).toBeVisible();
  await page.locator('[name="pseudonym"]').fill("E2E QUICK NPC");
  await page.locator("#citizen-quick-npc-form").press("Control+Enter");
  await expect(page.locator(".citizen-card-view")).toBeVisible();

  const npc = await page.evaluate(() => (window.WS_APP.getCitizens?.({ includeArchived: true }) || [])
    .find((citizen) => citizen.identity?.pseudonym === "E2E QUICK NPC"));
  expect(npc).toBeTruthy();
  expect(npc.characterType).toBe("NPC");
  expect(npc.recordState).toBe("ACTIVE");
  expect(consoleErrors).toEqual([]);
});

test("Citizen Profile Editor saves with Ctrl+S", async ({ page, consoleErrors }) => {
  await login(page, USERS.player);
  const citizenId = await page.evaluate(() => window.WS_APP.getUserCitizen?.(window.WS_APP.currentUser)?.id || "");
  expect(citizenId).not.toBe("");
  await page.evaluate((id) => window.WS_APP.openCitizenProfileEditor?.(id), citizenId);
  await expect(page.locator("#citizen-profile-editor-form")).toBeVisible();
  await page.locator('#citizen-profile-editor-form [name="pseudonym"]').fill("PROFILE E2E");
  await page.locator("#citizen-profile-editor-form").press("Control+s");
  await expect.poll(() => page.evaluate((id) => window.WS_APP.getCitizenById?.(id)?.identity?.pseudonym || "", citizenId)).toBe("PROFILE E2E");
  await expect(page.locator("#citizen-profile-editor-overlay")).toHaveAttribute("aria-hidden", "true");
  expect(consoleErrors).toEqual([]);
});

test("Admin Citizen Editor navigates sections and saves the active section by keyboard", async ({ page, consoleErrors }) => {
  await login(page, USERS.admin);
  const citizenId = await page.evaluate(() => (window.WS_APP.getCitizens?.() || []).find((citizen) => citizen.recordState === "ACTIVE" && citizen.recordType !== "admin")?.id || "");
  expect(citizenId).not.toBe("");
  await page.evaluate((id) => window.WS_APP.openCitizenAdminEditor?.(id), citizenId);
  await expect(page.locator(".citizen-admin-editor-shell")).toBeVisible();
  await page.keyboard.press("Alt+2");
  await expect(page.locator('[data-admin-editor-panel="identity"]')).toHaveClass(/is-active/);
  await page.locator('[data-admin-editor-panel="identity"] [name="pseudonym"]').fill("ADMIN E2E");
  await page.keyboard.press("Control+s");
  await expect(page.locator("[data-admin-editor-message]")).toContainText("Identity saved");
  await expect.poll(() => page.evaluate((id) => window.WS_APP.getCitizenById?.(id)?.identity?.pseudonym || "", citizenId)).toBe("ADMIN E2E");
  expect(consoleErrors).toEqual([]);
});

test("Admin Citizen Editor restores mechanics cards, persistent actions and Short ID preview", async ({ page, consoleErrors }) => {
  await login(page, USERS.admin);
  const citizenId = await page.evaluate(() => (window.WS_APP.getCitizens?.() || [])
    .find((citizen) => citizen.recordState === "ACTIVE" && citizen.recordType !== "admin")?.id || "");
  expect(citizenId).not.toBe("");
  await page.evaluate((id) => window.WS_APP.openCitizenAdminEditor?.(id), citizenId);
  await expect(page.locator(".citizen-admin-editor-shell")).toBeVisible();

  await page.keyboard.press("Alt+3");
  await expect(page.locator('[data-admin-editor-panel="mechanics"]')).toHaveClass(/is-active/);
  await expect(page.locator("[data-ability-card]")).toHaveCount(8);
  await expect(page.locator("[data-skill-group]").first()).toBeVisible();
  const natural = page.locator("[data-ability-card] [data-ability-natural]").first();
  await natural.fill("4");
  await expect(page.locator('[data-admin-editor-action="save-current"]')).toBeEnabled();
  await expect(page.locator('[data-admin-editor-action="discard-current"]')).toBeEnabled();
  await page.locator('[data-admin-editor-action="discard-current"]').click();
  await expect(page.locator('[data-admin-editor-action="save-current"]')).toBeDisabled();

  await page.keyboard.press("Alt+2");
  const birthDate = page.locator('[data-admin-editor-panel="identity"] [name="birthDate"]');
  await birthDate.fill("2081-01-17");
  await expect(page.locator("[data-citizen-short-id-preview]")).toHaveValue(/20810117\./);
  await page.locator('[data-admin-editor-action="save-current"]').click();
  await expect(page.locator("[data-admin-editor-message]")).toContainText("Identity saved");
  await expect.poll(() => page.evaluate((id) => window.WS_APP.getCitizenById?.(id)?.shortId || "", citizenId)).toMatch(/^20810117\./);
  expect(consoleErrors).toEqual([]);
});
