"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createRuntime() {
  const runtime = createBrowserRuntime();
  runtime.loadMany([
    "data/item-type-catalog.js",
    "data/equipment-catalog.js",
    "data/item-instances.js",
    "data/citizens.js",
    "js/store-utils.js",
    "js/item-type-registry.js",
    "js/equipment-catalog-store.js",
    "js/item-instance-store.js"
  ]);
  return runtime;
}

function countCatalogLookups(runtime) {
  const app = runtime.window.WS_APP;
  const original = app.getEquipmentCatalogItemById;
  let count = 0;
  app.getEquipmentCatalogItemById = function countedCatalogLookup(...args) {
    count += 1;
    return original.apply(this, args);
  };
  return {
    get count() { return count; },
    reset() { count = 0; }
  };
}

test("Equipment view lists populate and reuse ItemInstance view cache through canonical records", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const lookups = countCatalogLookups(runtime);

  const first = app.getCitizenEquipmentItemInstanceViews("citizen-b");
  assert.equal(first.length, 74);
  assert.equal(lookups.count, first.length);

  const firstLookupCount = lookups.count;
  const second = app.getCitizenEquipmentItemInstanceViews("citizen-b");
  assert.equal(second.length, first.length);
  assert.equal(lookups.count, firstLookupCount, "warm list read must not rebuild catalog-backed views");
  assert.notEqual(second[0], first[0], "cached views remain defensive clones");

  first[0].displayName = "MUTATED TEST VIEW";
  const third = app.getCitizenEquipmentItemInstanceViews("citizen-b");
  assert.notEqual(third[0].displayName, "MUTATED TEST VIEW");
  assert.equal(lookups.count, firstLookupCount);
});

test("installed Cyberware view lists use the same canonical cache path", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const lookups = countCatalogLookups(runtime);

  const first = app.getInstalledCyberwareInstanceViews("citizen-b");
  assert.equal(first.length, 2);
  assert.equal(lookups.count, first.length);

  const second = app.getInstalledCyberwareInstanceViews("citizen-b");
  assert.equal(second.length, first.length);
  assert.equal(lookups.count, first.length, "warm Cyberware read must reuse cached views");
});

test("idle warmup fills ItemInstance view cache before the first Equipment read", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const lookups = countCatalogLookups(runtime);
  const totalInstances = app.getItemInstances({ includeDisposed: true }).length;

  const slices = runtime.runPendingTimers(200);
  assert.equal(slices, totalInstances, "fallback warmup processes one ItemInstance per task");
  assert.equal(lookups.count, totalInstances);

  const beforeReads = lookups.count;
  assert.equal(app.getCitizenEquipmentItemInstanceViews("citizen-a").length, 33);
  assert.equal(app.getCitizenEquipmentItemInstanceViews("citizen-b").length, 74);
  assert.equal(app.getInstalledCyberwareInstanceViews("citizen-b").length, 2);
  assert.equal(lookups.count, beforeReads, "first module reads after warmup must be cache hits");
});

test("public ItemInstance getters stay defensive and catalog revision invalidates cached views", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const lookups = countCatalogLookups(runtime);

  const instances = app.getCitizenEquipmentItemInstances("citizen-a");
  assert.ok(instances.length > 0);
  const instanceId = instances[0].instanceId;
  instances[0].ownerId = "mutated-owner";
  assert.equal(app.getItemInstanceById(instanceId).ownerId, "citizen-a");

  const firstViews = app.getCitizenEquipmentItemInstanceViews("citizen-a");
  assert.equal(lookups.count, firstViews.length);
  app.getCitizenEquipmentItemInstanceViews("citizen-a");
  assert.equal(lookups.count, firstViews.length);

  app.invalidateEquipmentCatalogIndex();
  const beforeRebuild = lookups.count;
  app.getCitizenEquipmentItemInstanceViews("citizen-a");
  assert.equal(lookups.count - beforeRebuild, firstViews.length);
});
