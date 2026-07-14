"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

test("Campaign Data I/O registry and self-snapshot readiness are valid", () => {
  const runtime = createBrowserRuntime();
  runtime.loadMany([
    "js/campaign-data-io-registry.js",
    "js/campaign-data-io-adapters.js",
    "js/campaign-data-io-v6.js"
  ]);
  const readiness = runtime.window.WS_APP.getCampaignDataIoReadiness();
  assert.equal(readiness.ready, true, JSON.stringify(readiness.errors));
  assert.equal(readiness.atomicImport, true);
  assert.equal(readiness.rollback, true);
  assert.ok(readiness.campaignPersistentDomainCount >= 20);
});
