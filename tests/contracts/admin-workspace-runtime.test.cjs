"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readProjectFile, extractFunctionSource } = require("../helpers/source-contract.cjs");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

test("Admin base bundle excludes heavy Equipment and Cyberware runtime", () => {
  const modules = readProjectFile("js/modules.js");
  const blockStart = modules.indexOf('"admin-control": {');
  const citizensStart = modules.indexOf('"admin-workspace-citizens": {', blockStart);
  assert.ok(blockStart >= 0 && citizensStart > blockStart);
  const baseBlock = modules.slice(blockStart, citizensStart);
  assert.match(baseBlock, /js\/admin\/admin-shell\.js/);
  assert.match(baseBlock, /js\/admin\/admin-workspace-registry\.js/);
  assert.match(baseBlock, /js\/admin\/admin-workspace-loader\.js/);
  assert.match(baseBlock, /admin-workspace-dashboard\.js/);
  assert.doesNotMatch(baseBlock, /CYBERWARE_RUNTIME_SCRIPTS/);
  assert.doesNotMatch(baseBlock, /equipment-store\.js/);
  assert.doesNotMatch(baseBlock, /service-offer-generator\.js/);

  assert.match(modules, /"admin-workspace-citizens"/);
  assert.match(modules, /"admin-workspace-service"/);
  assert.match(modules, /"admin-workspace-billing"/);
  assert.match(modules, /"admin-workspace-audit"/);
});

test("Admin control updates the persistent shell instead of replacing the module grid", () => {
  const source = readProjectFile("js/admin-control.js");
  const renderSource = extractFunctionSource(source, "renderAdminControlCenter");
  assert.match(renderSource, /renderAdminShell\(/);
  assert.doesNotMatch(renderSource, /container\.innerHTML\s*=/);
  assert.match(source, /adminRecordDelegationBound/);
  assert.match(source, /data-admin-workspace-retry/);
});

test("Deferred admin workspace script sets load without browser DOM dependencies", () => {
  const citizensRuntime = createBrowserRuntime();
  citizensRuntime.loadMany([
    "data/equipment-catalog.js",
    "js/equipment-catalog-store.js",
    "js/equipment-render-utils.js",
    "js/equipment-store.js",
    "js/equipment-inventory.js",
    "js/equipment-housing-grid.js"
  ]);
  assert.equal(typeof citizensRuntime.window.WS_APP.getEquipmentState, "function");
  assert.equal(typeof citizensRuntime.window.WS_APP.getEquipmentCatalogItems, "function");

  const serviceRuntime = createBrowserRuntime();
  serviceRuntime.loadMany([
    "data/service-database.js",
    "js/service-requirements.js",
    "js/service-offer-generator.js"
  ]);
  assert.equal(typeof serviceRuntime.window.ServiceOfferGenerator?.generateWeeklyOffers, "function");
});
