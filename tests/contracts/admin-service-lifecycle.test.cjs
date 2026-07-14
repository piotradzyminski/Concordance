"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

test("Admin Service UI separates Citizen Service Log from Service Bridge Orders", () => {
  const core = read("js/admin-control.js");
  const renderer = read("js/admin/workspaces/admin-workspace-service.js");
  assert.match(renderer, /Citizen Service Log \/ Work Records/);
  assert.match(core, /SERVICE BRIDGE ORDERS/);
  assert.match(core, /getCitizenServiceAllowedTransitions/);
  assert.match(core, /transitionCitizenServiceRecord/);
  assert.doesNotMatch(core, /const options = \["ACTIVE", "SUSPENDED", "COMPLETED", "FAILED", "TERMINATED", "ARCHIVED"\]/);
});

test("Service Log lifecycle registry loads before Citizen Store", () => {
  const index = read("index.html");
  const lifecycleIndex = index.indexOf("js/service-log-lifecycle.js?v=1");
  const storeIndex = index.indexOf("js/store.js?v=144");
  assert.ok(lifecycleIndex >= 0);
  assert.ok(storeIndex > lifecycleIndex);
});
