"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createRuntime() {
  const runtime = createBrowserRuntime({
    appData: { itemInstances: [] },
    wsApp: {
      CAMPAIGN_DATE_ISO: "2109-02-13",
      getCampaignDateIso() { return this.CAMPAIGN_DATE_ISO; }
    }
  });
  runtime.loadMany([
    "js/store-utils.js",
    "data/item-type-catalog.js",
    "data/item-effect-catalog.js",
    "js/item-type-registry.js",
    "data/equipment-catalog.js",
    "js/equipment-catalog-store.js",
    "js/item-instance-store.js",
    "js/item-instance-transaction-store.js",
    "js/citizen-status-store.js",
    "js/item-effect-resolver.js",
    "js/item-type-operations.js"
  ]);
  runtime.window.WS_APP.resetItemInstanceStore();
  runtime.window.WS_APP.resetCitizenStatusStore();
  runtime.window.WS_APP.resetItemEffectResolutionStore();
  return runtime;
}

function createInstance(app, source) {
  const result = app.createItemInstance(source, {
    deferPersistence: true,
    skipCitizenEvent: true,
    skipItemEvent: true,
    skipModuleRefresh: true,
    skipProfileRefresh: true
  });
  assert.equal(result.ok, true, result.reason);
  return result.item;
}

test("registered medical consumable resolves into a persistent Citizen status", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  createInstance(app, {
    instanceId: "analgesic-1",
    definitionId: "eqcat-coremed-analgesic-tablets",
    ownerId: "citizen-a",
    quantity: 3,
    location: { type: "UNPLACED", characterId: "citizen-a" }
  });

  let events = 0;
  runtime.window.addEventListener("ws:item-effect-resolution-completed", () => { events += 1; });
  const result = app.useConsumable({
    citizenId: "citizen-a",
    instanceId: "analgesic-1",
    units: 1,
    idempotencyKey: "effect:test:analgesic:1"
  });

  assert.equal(result.ok, true, result.reason);
  assert.equal(result.result.effectResolutionRequired, false);
  assert.equal(result.result.effectResolutionStatus, "COMPLETED");
  assert.equal(result.result.appliedStatusEffects.length, 1);
  assert.equal(result.result.appliedStatusEffects[0].statusId, "PAIN_RELIEF");
  assert.equal(app.getCitizenStatusEffects("citizen-a").length, 1);
  assert.equal(app.getItemEffectResolution(result.result.effectResolutionId).status, "COMPLETED");
  assert.equal(app.getItemInstanceById("analgesic-1").quantity, 2);

  const replay = app.useConsumable({
    citizenId: "citizen-a",
    instanceId: "analgesic-1",
    units: 1,
    idempotencyKey: "effect:test:analgesic:1"
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.operation, "IDEMPOTENT_REPLAY");
  assert.equal(app.getItemInstanceById("analgesic-1").quantity, 2);
  assert.equal(app.getCitizenStatusEffects("citizen-a").length, 1);
  assert.equal(events, 2);
});

test("refresh stacking updates one status record instead of duplicating it", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  createInstance(app, {
    instanceId: "water-1",
    definitionId: "eqcat-habitat-hydration-pouches",
    ownerId: "citizen-a",
    quantity: 3,
    location: { type: "UNPLACED", characterId: "citizen-a" }
  });

  const first = app.useConsumable({ citizenId: "citizen-a", instanceId: "water-1", units: 1, idempotencyKey: "effect:test:water:1" });
  const firstStatus = first.result.appliedStatusEffects[0];
  const second = app.useConsumable({ citizenId: "citizen-a", instanceId: "water-1", units: 1, idempotencyKey: "effect:test:water:2" });
  const secondStatus = second.result.appliedStatusEffects[0];

  assert.equal(firstStatus.statusId, "HYDRATED");
  assert.equal(secondStatus.statusId, "HYDRATED");
  assert.equal(secondStatus.statusInstanceId, firstStatus.statusInstanceId);
  assert.equal(secondStatus.revision, firstStatus.revision + 1);
  assert.equal(app.getCitizenStatusEffects("citizen-a").length, 1);
});

test("household consumable records an external result without adding a Citizen status", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  createInstance(app, {
    instanceId: "cleaner-1",
    definitionId: "eqcat-habitat-surface-cleaning-concentrate",
    ownerId: "citizen-a",
    quantity: 2,
    location: { type: "UNPLACED", characterId: "citizen-a" }
  });

  const result = app.useConsumable({
    citizenId: "citizen-a",
    instanceId: "cleaner-1",
    units: 1,
    idempotencyKey: "effect:test:cleaner:1"
  });

  assert.equal(result.ok, true, result.reason);
  assert.equal(result.result.effectResolutionStatus, "COMPLETED");
  assert.equal(result.result.effectResolution.targetScope, "EXTERNAL");
  assert.equal(result.result.appliedStatusEffects.length, 0);
  assert.equal(app.getCitizenStatusEffects("citizen-a").length, 0);
});

test("campaign-time expiration removes an elapsed effect from active status projection", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const applied = app.applyCitizenStatusEffects("citizen-a", [{
    statusId: "SHORT_TEST",
    label: "Short Test",
    durationSeconds: 3600,
    stackMode: "REFRESH"
  }], {
    resolutionId: "effect:test:short",
    atTime: "2109-02-13T00:00:00.000Z"
  });
  assert.equal(applied.ok, true);
  assert.equal(app.getCitizenStatusEffects("citizen-a", { atTime: "2109-02-13T00:30:00.000Z" }).length, 1);
  assert.equal(app.getCitizenStatusEffects("citizen-a", { atTime: "2109-02-13T02:00:00.000Z" }).length, 0);
  assert.equal(app.getCitizenStatusEffects("citizen-a", { includeInactive: true, atTime: "2109-02-13T02:00:00.000Z" })[0].state, "EXPIRED");
});


test("Campaign Data I/O registers Citizen status and item-effect persistence keys", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../js/campaign-data-io-adapters.js"), "utf8");
  assert.match(source, /domainId:\s*"citizen-status-effects"/);
  assert.match(source, /ws_citizen_status_effects_v1/);
  assert.match(source, /ws_item_effect_resolutions_v1/);
});
