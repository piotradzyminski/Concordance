"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

function createRuntime() {
  const runtime = createBrowserRuntime({ appData: { itemInstances: [] } });
  runtime.loadMany([
    "js/store-utils.js",
    "data/item-type-catalog.js",
    "js/item-type-registry.js",
    "data/equipment-catalog.js",
    "js/equipment-catalog-store.js",
    "js/item-instance-store.js",
    "js/item-instance-transaction-store.js",
    "js/item-type-operations.js"
  ]);
  runtime.window.WS_APP.resetItemInstanceStore();
  return runtime;
}

function createConsumable(app, source = {}) {
  const result = app.createItemInstance({
    instanceId: "med-1",
    definitionId: "custom:med",
    ownerId: "citizen-a",
    quantity: 4,
    itemType: "CONSUMABLE",
    itemTypeProfile: { consumableKind: "MEDICAL", stackLimit: 20 },
    location: { type: "UNPLACED", characterId: "citizen-a" },
    ...source
  }, { deferPersistence: true, skipCitizenEvent: true, skipItemEvent: true, skipModuleRefresh: true, skipProfileRefresh: true });
  assert.equal(result.ok, true, result.reason);
}

test("daily consumable log is derived from committed ItemInstance transactions", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  app.CAMPAIGN_DATE_ISO = "2109-04-17";
  createConsumable(app);

  assert.equal(app.useConsumable({ citizenId: "citizen-a", instanceId: "med-1", units: 1, idempotencyKey: "usage:1" }).ok, true);
  app.CAMPAIGN_DATE_ISO = "2109-04-18";
  assert.equal(app.useConsumable({ citizenId: "citizen-a", instanceId: "med-1", units: 2, idempotencyKey: "usage:2" }).ok, true);

  const rows = app.getConsumableUsageLog({ citizenId: "citizen-a", instanceId: "med-1" });
  assert.equal(rows.length, 2);
  assert.deepEqual(Array.from(rows, (row) => row.campaignDay), ["2109-04-18", "2109-04-17"]);
  assert.equal(rows.some((row) => "effectResolution" in row), false);

  const days = app.getConsumableUsageByDay({ citizenId: "citizen-a", instanceId: "med-1" });
  assert.deepEqual(Array.from(days, (day) => [day.campaignDay, day.totalQuantityUsed]), [["2109-04-18", 2], ["2109-04-17", 1]]);
});

test("effect runtime files and Campaign Data I/O effect domain are removed", () => {
  const index = fs.readFileSync(path.join(PROJECT_ROOT, "index.html"), "utf8");
  const adapters = fs.readFileSync(path.join(PROJECT_ROOT, "js/campaign-data-io-adapters.js"), "utf8");
  const operations = fs.readFileSync(path.join(PROJECT_ROOT, "js/item-type-operations.js"), "utf8");
  assert.doesNotMatch(index, /item-effect-catalog|citizen-status-store|item-effect-resolver/);
  assert.doesNotMatch(adapters, /citizen-status-effects|ws_item_effect_resolutions|ws_citizen_status_effects/);
  assert.doesNotMatch(operations, /resolveConsumableEffect|effectResolutionStatus|appliedStatusEffects/);
  assert.match(operations, /getConsumableUsageLog/);
  assert.match(operations, /getConsumableUsageByDay/);
});
