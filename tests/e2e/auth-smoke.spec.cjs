"use strict";

const { test, expect, USERS, login } = require("./fixtures.cjs");

for (const [label, user] of Object.entries(USERS)) {
  test(`${label} login opens the terminal without console errors`, async ({ page, consoleErrors }) => {
    await login(page, user);
    await expect(page.locator("#terminal-screen")).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
}
