"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

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

function seedFirearmSet(app) {
  createInstance(app, {
    instanceId: "firearm-1",
    definitionId: "eqcat-compact-pistol",
    ownerId: "citizen-a",
    location: { type: "UNPLACED", characterId: "citizen-a" }
  });
  createInstance(app, {
    instanceId: "magazine-1",
    definitionId: "eqcat-compact-pistol-magazine",
    ownerId: "citizen-a",
    location: { type: "UNPLACED", characterId: "citizen-a" }
  });
  createInstance(app, {
    instanceId: "ammo-1",
    definitionId: "eqcat-standard-pistol-rounds",
    ownerId: "citizen-a",
    quantity: 20,
    location: { type: "UNPLACED", characterId: "citizen-a" }
  });
}

test("magazine loading, insertion and chambering are atomic ItemInstance operations", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  seedFirearmSet(app);

  const loaded = app.loadMagazine({
    citizenId: "citizen-a",
    magazineInstanceId: "magazine-1",
    ammunitionInstanceId: "ammo-1",
    rounds: 8,
    idempotencyKey: "item-type:test:load:1"
  });
  assert.equal(loaded.ok, true, loaded.reason);
  assert.equal(app.getItemInstanceById("magazine-1").itemState.data.roundsCurrent, 8);
  assert.equal(app.getItemInstanceById("ammo-1").quantity, 12);

  const inserted = app.insertFirearmMagazine({
    citizenId: "citizen-a",
    firearmInstanceId: "firearm-1",
    magazineInstanceId: "magazine-1",
    idempotencyKey: "item-type:test:insert:1"
  });
  assert.equal(inserted.ok, true, inserted.reason);
  const installedMagazine = app.getItemInstanceById("magazine-1");
  assert.equal(installedMagazine.location.type, "INSTALLED_IN_ITEM");
  assert.equal(installedMagazine.location.parentItemInstanceId, "firearm-1");
  assert.equal(installedMagazine.location.moduleSlotId, "MAGAZINE_WELL");
  assert.equal(installedMagazine.lifecycleState, "INSTALLED");
  assert.equal(app.getItemInstanceById("firearm-1").itemState.data.magazineInstanceId, undefined);

  let chamberEvents = 0;
  runtime.window.addEventListener("ws:item-type-operation-committed", (event) => {
    if (event.detail?.operationType === "FIREARM_CHAMBER") chamberEvents += 1;
  });
  const chambered = app.chamberFirearmRound({
    citizenId: "citizen-a",
    firearmInstanceId: "firearm-1",
    idempotencyKey: "item-type:test:chamber:1"
  });
  assert.equal(chambered.ok, true, chambered.reason);
  assert.equal(app.getItemInstanceById("firearm-1").itemState.data.chamberedRounds, 1);
  assert.equal(app.getItemInstanceById("magazine-1").itemState.data.roundsCurrent, 7);

  const replay = app.chamberFirearmRound({
    citizenId: "citizen-a",
    firearmInstanceId: "firearm-1",
    idempotencyKey: "item-type:test:chamber:1"
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.operation, "IDEMPOTENT_REPLAY");
  assert.equal(chamberEvents, 1);
  assert.equal(app.getItemInstanceById("magazine-1").itemState.data.roundsCurrent, 7);

  const conflict = app.chamberFirearmRound({
    citizenId: "citizen-a",
    firearmInstanceId: "firearm-1",
    rounds: 2,
    idempotencyKey: "item-type:test:chamber:1"
  });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.reason, "ITEM_TYPE_OPERATION_IDEMPOTENCY_CONFLICT");
});

test("firearm controls validate supported state and clear chamber without duplicating rounds", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  seedFirearmSet(app);
  app.loadMagazine({ citizenId: "citizen-a", magazineInstanceId: "magazine-1", ammunitionInstanceId: "ammo-1", rounds: 4, idempotencyKey: "item-type:test:load:2" });
  app.insertFirearmMagazine({ citizenId: "citizen-a", firearmInstanceId: "firearm-1", magazineInstanceId: "magazine-1", idempotencyKey: "item-type:test:insert:2" });
  app.chamberFirearmRound({ citizenId: "citizen-a", firearmInstanceId: "firearm-1", idempotencyKey: "item-type:test:chamber:2" });

  const safety = app.setFirearmSafety({ citizenId: "citizen-a", firearmInstanceId: "firearm-1", safety: "FIRE", idempotencyKey: "item-type:test:safety:1" });
  assert.equal(safety.ok, true);
  assert.equal(app.getItemInstanceById("firearm-1").itemState.data.safety, "FIRE");

  const unsupported = app.setFirearmFireMode({ citizenId: "citizen-a", firearmInstanceId: "firearm-1", fireMode: "BURST", idempotencyKey: "item-type:test:mode:bad" });
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.reason, "FIREARM_FIRE_MODE_UNSUPPORTED");

  const cleared = app.clearFirearmChamber({ citizenId: "citizen-a", firearmInstanceId: "firearm-1", idempotencyKey: "item-type:test:clear:1" });
  assert.equal(cleared.ok, true, cleared.reason);
  assert.equal(app.getItemInstanceById("firearm-1").itemState.data.chamberedRounds, 0);
  assert.equal(app.getItemInstanceById("magazine-1").itemState.data.roundsCurrent, 4);
});

test("magazine unload returns physical rounds to an existing or newly created ammunition stack", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  seedFirearmSet(app);
  app.loadMagazine({ citizenId: "citizen-a", magazineInstanceId: "magazine-1", ammunitionInstanceId: "ammo-1", rounds: 6, idempotencyKey: "item-type:test:load:3" });

  const toExisting = app.unloadMagazine({
    citizenId: "citizen-a",
    magazineInstanceId: "magazine-1",
    targetAmmunitionInstanceId: "ammo-1",
    rounds: 2,
    idempotencyKey: "item-type:test:unload:existing"
  });
  assert.equal(toExisting.ok, true, toExisting.reason);
  assert.equal(app.getItemInstanceById("magazine-1").itemState.data.roundsCurrent, 4);
  assert.equal(app.getItemInstanceById("ammo-1").quantity, 16);

  const toNew = app.unloadMagazine({
    citizenId: "citizen-a",
    magazineInstanceId: "magazine-1",
    newAmmunitionInstanceId: "ammo-returned",
    rounds: 4,
    idempotencyKey: "item-type:test:unload:new"
  });
  assert.equal(toNew.ok, true, toNew.reason);
  assert.equal(app.getItemInstanceById("magazine-1").itemState.data.roundsCurrent, 0);
  assert.equal(app.getItemInstanceById("magazine-1").itemState.data.ammunitionDefinitionId, "");
  assert.equal(app.getItemInstanceById("ammo-returned").quantity, 4);
});

test("grenade arming changes state but does not start a timer or resolve an effect", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  createInstance(app, {
    instanceId: "grenade-1",
    definitionId: "eqcat-fragmentation-grenade",
    ownerId: "citizen-a",
    location: { type: "UNPLACED", characterId: "citizen-a" }
  });

  const armed = app.armGrenade({ citizenId: "citizen-a", grenadeInstanceId: "grenade-1", fuseSeconds: 7, idempotencyKey: "item-type:test:grenade:arm" });
  assert.equal(armed.ok, true, armed.reason);
  assert.equal(armed.result.timerStarted, false);
  assert.equal(app.getItemInstanceById("grenade-1").itemState.data.armed, true);
  assert.equal(app.getItemInstanceById("grenade-1").itemState.data.fuseSeconds, 7);

  const disarmed = app.disarmGrenade({ citizenId: "citizen-a", grenadeInstanceId: "grenade-1", idempotencyKey: "item-type:test:grenade:disarm" });
  assert.equal(disarmed.ok, true, disarmed.reason);
  assert.equal(app.getItemInstanceById("grenade-1").itemState.data.armed, false);
  assert.equal(app.getItemInstanceById("grenade-1").itemState.data.fuseSeconds, 0);
});

test("consumable use changes quantity and creates a daily transaction-backed usage log", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  app.CAMPAIGN_DATE_ISO = "2109-04-17";
  createInstance(app, {
    instanceId: "ration-1",
    definitionId: "custom:ration",
    ownerId: "citizen-a",
    quantity: 3,
    itemType: "CONSUMABLE",
    itemTypeProfile: { consumableKind: "FOOD", stackLimit: 20 },
    tags: ["FOOD", "RATION"],
    location: { type: "UNPLACED", characterId: "citizen-a" }
  });

  const first = app.useConsumable({ citizenId: "citizen-a", instanceId: "ration-1", units: 2, usageSource: "EQUIPMENT", idempotencyKey: "item-type:test:consume:1" });
  assert.equal(first.ok, true, first.reason);
  assert.equal(first.result.quantityUsed, 2);
  assert.equal(first.result.campaignDay, "2109-04-17");
  assert.equal(first.result.effectResolution, undefined);
  assert.equal(app.getItemInstanceById("ration-1").quantity, 1);

  const replay = app.useConsumable({ citizenId: "citizen-a", instanceId: "ration-1", units: 2, usageSource: "EQUIPMENT", idempotencyKey: "item-type:test:consume:1" });
  assert.equal(replay.operation, "IDEMPOTENT_REPLAY");
  assert.equal(app.getConsumableUsageLog({ citizenId: "citizen-a", instanceId: "ration-1" }).length, 1);

  const final = app.useConsumable({ citizenId: "citizen-a", instanceId: "ration-1", units: 1, usageSource: "HOUSEHOLD", idempotencyKey: "item-type:test:consume:2" });
  assert.equal(final.ok, true, final.reason);
  assert.equal(final.result.itemRemoved, true);
  assert.equal(app.getItemInstanceById("ration-1"), null);

  const daily = app.getConsumableUsageByDay({ citizenId: "citizen-a", instanceId: "ration-1" });
  assert.equal(daily.length, 1);
  assert.equal(daily[0].campaignDay, "2109-04-17");
  assert.equal(daily[0].totalQuantityUsed, 3);
  assert.deepEqual(daily[0].entries.map((entry) => entry.source).sort(), ["EQUIPMENT", "HOUSEHOLD"]);
});

test("operation availability exposes only type-specific command skeletons", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  seedFirearmSet(app);

  const firearm = app.getItemTypeOperationAvailability("citizen-a", "firearm-1");
  assert.equal(firearm.ok, true);
  assert.equal(firearm.itemType, "FIREARM");
  assert.equal(firearm.operations.some((operation) => operation.id === "FIREARM_INSERT_MAGAZINE" && operation.enabled), true);

  const magazine = app.getItemTypeOperationAvailability("citizen-a", "magazine-1");
  assert.equal(magazine.itemType, "MAGAZINE");
  assert.equal(magazine.operations.some((operation) => operation.id === "MAGAZINE_LOAD"), true);
});
