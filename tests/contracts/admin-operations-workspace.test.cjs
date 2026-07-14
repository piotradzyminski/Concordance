"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

test("Admin Operations workspace is lazy, renderer-owned and uses canonical World Bridge commands", () => {
  const registry = read("js/admin/admin-workspace-registry.js");
  const modules = read("js/modules.js");
  const control = read("js/admin-control.js");
  const renderer = read("js/admin/workspaces/admin-workspace-operations.js");
  const command = read("js/admin-operations-command.js");

  assert.match(registry, /id: "operations"/);
  assert.match(registry, /bundleId: "admin-workspace-operations"/);
  assert.match(modules, /"admin-workspace-operations":\s*\{[\s\S]*admin-operations-command\.js\?v=1[\s\S]*admin-workspace-operations\.js\?v=1/);
  assert.match(renderer, /registerRenderer\("operations"/);
  assert.match(renderer, /getWorldBridgeOperations/);
  assert.match(renderer, /AdminOperationsControl/);
  assert.match(control, /AdminOperationsControl\?\.bind/);
  assert.match(control, /AdminOperationsControl\?\.renderInspector/);

  assert.match(command, /retryWorldBridgeOperation/);
  assert.match(command, /reconcileWorldBridgeOperation/);
  assert.match(command, /claimWorldBridgeOperationResources/);
  assert.match(command, /releaseWorldBridgeOperationClaims/);
  assert.match(command, /appendAdminAuditResult/);
  assert.doesNotMatch(renderer, /updateWorldBridgeOperation/);
  assert.doesNotMatch(renderer, /transitionWorldBridgeOperation/);
});
