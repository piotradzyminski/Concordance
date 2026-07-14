"use strict";

const { test, expect, USERS, login } = require("./fixtures.cjs");

const COLD_ENTRY_MODULES = [
  "citizen-card",
  "service",
  "system-index",
  "system",
  "encyclopedia"
];

for (const moduleId of COLD_ENTRY_MODULES) {
  test(`${moduleId} opens as the first module without leaking loading state`, async ({ page, consoleErrors }) => {
    await login(page, USERS.admin);
    await page.evaluate(() => window.WS_APP.setTestModeEnabled(true));

    const moduleCard = page.locator(`.module-card.is-openable[data-id="${moduleId}"]`);
    await expect(moduleCard).toBeVisible();
    await moduleCard.click();

    await page.waitForFunction((targetModuleId) => window.WS_APP?.currentModuleId === targetModuleId, moduleId);
    await expect(page.locator("#module-grid")).not.toHaveClass(/is-module-transitioning/);
    await expect(page.locator(".terminal-grid")).not.toHaveClass(/is-module-loading/);
    await expect(page.locator("#module-grid .is-module-error")).toHaveCount(0);
    expect(consoleErrors).toEqual([]);
  });
}
