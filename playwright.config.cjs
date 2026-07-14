"use strict";

const { defineConfig } = require("@playwright/test");

const configuredChromiumExecutable = String(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "").trim();

module.exports = defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.cjs",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: ".test-results/playwright",
  projects: [
    {
      name: "desktop-1440x960"
    },
    {
      name: "service-1320x720",
      testMatch: "**/service-tab-stability.spec.cjs",
      use: { viewport: { width: 1320, height: 720 } }
    },
    {
      name: "service-1265x720",
      testMatch: "**/service-tab-stability.spec.cjs",
      use: { viewport: { width: 1265, height: 720 } }
    },
    {
      name: "service-1180x720",
      testMatch: "**/service-tab-stability.spec.cjs",
      use: { viewport: { width: 1180, height: 720 } }
    }
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    viewport: { width: 1440, height: 960 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    launchOptions: {
      ...(configuredChromiumExecutable ? { executablePath: configuredChromiumExecutable } : {}),
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-software-rasterizer"]
    }
  },
  webServer: {
    command: "node tests/e2e/static-server.cjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 15_000
  }
});
