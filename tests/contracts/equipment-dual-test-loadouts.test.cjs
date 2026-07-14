"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const SET_A = "EQ_TEST_SET_A_MOBILE_MOUNTS_1_4_0X";
const SET_B = "EQ_TEST_SET_B_HEAVY_NESTED_1_4_0X";

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
    "js/item-instance-store.js",
    "js/equipment-render-utils.js",
    "js/equipment-inventory.js",
    "js/equipment-store.js",
    "js/equipment-loadout-rules.js"
  ]);
  return runtime;
}

function getCitizen(runtime, citizenId) {
  return runtime.window.APP_DATA.citizens.find((citizen) => citizen.id === citizenId);
}

function getSeedItems(runtime, setId) {
  return runtime.window.APP_DATA.itemInstances.filter((item) => item.flags?.equipmentTestLoadout === setId);
}

function getState(runtime, citizenId) {
  return runtime.window.WS_APP.getEquipmentState(getCitizen(runtime, citizenId));
}

function getItem(state, itemId) {
  const item = state.itemById[itemId];
  assert.ok(item, `missing item ${itemId}`);
  return item;
}

test("dual EQ seed sets are distinct, catalog-backed and reset through the current ItemInstance seed version", () => {
  const runtime = createRuntime();
  const setA = getSeedItems(runtime, SET_A);
  const setB = getSeedItems(runtime, SET_B);
  const all = runtime.window.APP_DATA.itemInstances;
  const ids = all.map((item) => item.instanceId);
  const catalogIds = new Set(runtime.window.APP_DATA.equipmentCatalog.map((entry) => entry.id));

  assert.equal(runtime.window.WS_APP.ITEM_INSTANCE_SEED_VERSION, "equipment-dual-test-loadouts-1.4.0x");
  assert.equal(setA.length, 33);
  assert.equal(setB.length, 52);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(setA.some((item) => setB.some((other) => other.instanceId === item.instanceId)), false);
  assert.ok(setA.every((item) => item.ownerId === "citizen-a"));
  assert.ok(setB.every((item) => item.ownerId === "citizen-b"));
  assert.ok([...setA, ...setB].every((item) => catalogIds.has(item.definitionId)));

  const validation = runtime.window.WS_APP.validateItemInstances(all);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));

  const citizenA = getCitizen(runtime, "citizen-a");
  const citizenB = getCitizen(runtime, "citizen-b");
  assert.equal(citizenA.equipment.seedResetKey, "equipment-dual-test-loadouts-1.4.0x-a");
  assert.equal(citizenB.equipment.seedResetKey, "equipment-dual-test-loadouts-1.4.0x-b");

  const preservedCyberware = all.filter((item) => !String(item.definitionId || "").startsWith("eqcat-"));
  assert.equal(preservedCyberware.length, 9);
  assert.ok(preservedCyberware.some((item) => item.instanceId === "cw-citizen-a-yata-mirrorcore"));
  assert.ok(preservedCyberware.some((item) => item.instanceId === "cw-citizen-b-mc-n3-multibus-core"));
});

test("Citizen A covers coverage reservations, direct-worn containers, held equipment, bilateral mounts, item mounts and condition edge cases", () => {
  const runtime = createRuntime();
  const citizen = getCitizen(runtime, "citizen-a");
  const state = getState(runtime, "citizen-a");

  assert.equal(state.summary.orphanCount, 0);
  assert.equal(state.summary.containerCount, 5);
  assert.equal(state.summary.nestedContainerCount, 1);

  const undersuit = getItem(state, "eq-a-netrunner-undersuit");
  assert.deepEqual([...undersuit.equippedLocation.coverage].sort(), ["HEAD", "LEGS"]);
  assert.equal(state.bodyOccupancy["HEAD:INNER"].role, "RESERVED");
  assert.equal(state.bodyOccupancy["LEGS:INNER"].role, "RESERVED");

  const chestRig = getItem(state, "eq-a-service-chest-rig");
  assert.equal(chestRig.isContainer, true);
  assert.equal(chestRig.equippedLocation.kind, "LAYER");
  assert.equal(chestRig.equippedLocation.anchor, "TORSO");
  assert.equal(chestRig.equippedLocation.layer, "OUTER");

  assert.equal(getItem(state, "eq-a-compact-medkit-held").equippedLocation.layer, "HELD");
  assert.equal(getItem(state, "eq-a-sling-utility-bag").equippedLocation.primaryMountId, "LEFT_SHOULDER_CARRY");
  assert.equal(getItem(state, "eq-a-sword-scabbard").equippedLocation.primaryMountId, "RIGHT_SHOULDER_CARRY");
  assert.equal(getItem(state, "eq-a-port-diagnostic-key").equippedLocation.primaryMountId, "IMPLANT_PORT");
  assert.equal(getItem(state, "eq-a-service-watch-right").equippedLocation.primaryMountId, "RIGHT_FOREARM_ACCESSORY_1");
  assert.equal(getItem(state, "eq-a-wrist-terminal-right").equippedLocation.primaryMountId, "RIGHT_FOREARM_ACCESSORY_2");

  assert.equal(getItem(state, "eq-a-cyberkatana").equippedLocation.mountId, "SHEATH");
  assert.equal(getItem(state, "eq-a-compact-pistol").equippedLocation.mountId, "HOLSTER");
  assert.equal(getItem(state, "eq-a-cyberkatana").displayName, "Kuro-01");
  assert.equal(getItem(state, "eq-a-cracked-service-baton").displayName, "Cracked Baton");

  assert.ok(getItem(state, "eq-a-service-anorak-broken").condition <= 14);
  assert.ok(getItem(state, "eq-a-compact-pistol").condition >= 15 && getItem(state, "eq-a-compact-pistol").condition <= 44);
  assert.ok(getItem(state, "eq-a-field-tool-case-damaged").condition >= 15 && getItem(state, "eq-a-field-tool-case-damaged").condition <= 44);

  const brokenTargets = runtime.window.WS_APP.getEquipmentEquipTargets(citizen, "eq-a-cracked-service-baton", { state });
  assert.ok(brokenTargets.length >= 2);
  assert.ok(brokenTargets.every((target) => target.validation.code === "ITEM_BROKEN"));

  const damagedToolTargets = runtime.window.WS_APP.getEquipmentEquipTargets(citizen, "eq-a-field-tool-case-damaged", { state });
  assert.ok(damagedToolTargets.some((target) => target.validation.ok && target.id === "LAYER|RIGHT_HAND|HELD"));

  for (const container of state.containers.all.filter((item) => !item.isStored)) {
    const model = runtime.window.WS_APP.getEquipmentContainerGridModel(state, container.id, { container });
    assert.equal(model.hasUnplacedItems, false, container.id);
    assert.ok(model.capacity.usedSlots <= model.capacity.slotCapacity, container.id);
  }
});

test("Citizen B covers complete independent wear layers, blocked mounts, item-mounted containers, deep nesting, rotation and Housing storage", () => {
  const runtime = createRuntime();
  const citizen = getCitizen(runtime, "citizen-b");
  const state = getState(runtime, "citizen-b");

  assert.equal(state.summary.orphanCount, 0);
  assert.equal(state.summary.nestedContainerCount, 3);
  assert.ok(state.summary.storedCount >= 6);

  const requiredLayers = [
    "HEAD:INNER", "HEAD:OUTER", "FACE:FACE", "NECK:INNER", "NECK:ARMOR",
    "TORSO:INNER", "TORSO:OUTER", "TORSO:OUTERWEAR", "TORSO:ARMOR",
    "HANDS:INNER", "HANDS:ARMOR", "LEGS:INNER", "LEGS:OUTER", "LEGS:ARMOR",
    "FEET:INNER", "FEET:FOOTWEAR", "LEFT_SHOULDER:ARMOR", "RIGHT_SHOULDER:ARMOR",
    "LEFT_FOREARM:ARMOR", "RIGHT_FOREARM:ARMOR"
  ];
  requiredLayers.forEach((key) => assert.ok(state.bodyOccupancy[key], key));

  assert.equal(state.bodyMountOccupancy.LEFT_FOREARM_ACCESSORY_1.itemId, "eq-b-service-watch-left");
  assert.equal(state.bodyMountOccupancy.RIGHT_FOREARM_ACCESSORY_1.itemId, "eq-b-wrist-terminal-right");
  assert.equal(Boolean(state.bodyOccupancy["LEFT_FOREARM:ARMOR"]), true);
  assert.equal(Boolean(state.bodyOccupancy["RIGHT_FOREARM:ARMOR"]), true);

  const chestRig = getItem(state, "eq-b-service-chest-rig");
  assert.equal(chestRig.equippedLocation.kind, "ITEM_MOUNT");
  assert.equal(chestRig.equippedLocation.ownerItemId, "eq-b-light-chest-plate");
  assert.equal(chestRig.equippedLocation.mountId, "CHEST_RIG");
  assert.equal(state.itemMountOccupancy["eq-b-right-thigh-holster:HOLSTER"].itemId, "eq-b-compact-pistol");

  const backpack = getItem(state, "eq-b-medium-backpack");
  const cube = getItem(state, "eq-b-capacity-module-iv");
  const sling = getItem(state, "eq-b-sling-bag-nested");
  assert.equal(backpack.displayName, "Secured Field Pack");
  assert.equal(cube.containerHostId, backpack.id);
  assert.equal(sling.containerHostId, cube.id);
  assert.equal(getItem(state, "eq-b-antibiotic-sling").containerHostId, sling.id);

  const rotated = getItem(state, "eq-b-cyberkatana-rotated");
  assert.equal(rotated.containerPlacement.rotation, 90);
  assert.equal(rotated.displayName, "Transit Blade");

  const cubeModel = runtime.window.WS_APP.getEquipmentContainerGridModel(state, cube.id, { container: cube });
  assert.equal(cubeModel.grid.columns, 4);
  assert.equal(cubeModel.grid.rows, 6);
  assert.equal(cubeModel.capacity.usedSlots, 24);
  assert.equal(cubeModel.capacity.slotCapacity, 24);
  assert.equal(cubeModel.hasUnplacedItems, false);

  const blockedSlingTargets = runtime.window.WS_APP.getEquipmentEquipTargets(citizen, sling.id, { state });
  assert.equal(blockedSlingTargets.length, 2);
  assert.ok(blockedSlingTargets.every((target) => target.validation.code === "BODY_MOUNT_OCCUPIED"));

  const thighTargets = runtime.window.WS_APP.getEquipmentEquipTargets(citizen, "eq-b-left-thigh-holster-spare", { state });
  assert.ok(thighTargets.some((target) => target.id.includes("LEFT_THIGH_HOLSTER") && target.validation.ok));
  assert.ok(thighTargets.some((target) => target.id.includes("RIGHT_THIGH_HOLSTER") && target.validation.code === "BODY_MOUNT_OCCUPIED"));

  const brokenMedkitTargets = runtime.window.WS_APP.getEquipmentEquipTargets(citizen, "eq-b-compact-medkit-broken", { state });
  assert.ok(brokenMedkitTargets.length >= 2);
  assert.ok(brokenMedkitTargets.every((target) => target.validation.code === "ITEM_BROKEN"));

  const storedBag = getItem(state, "eq-b-slim-weapon-bag-housing");
  assert.equal(storedBag.isStored, true);
  assert.equal(storedBag.housingPlacement.rotation, 90);
  assert.equal(storedBag.storageUnitId, "housing-storage-citizen-b-secured");

  for (const container of state.containers.all.filter((item) => !item.isStored)) {
    const model = runtime.window.WS_APP.getEquipmentContainerGridModel(state, container.id, { container });
    assert.equal(model.hasUnplacedItems, false, container.id);
    assert.ok(model.capacity.usedSlots <= model.capacity.slotCapacity, container.id);
  }
});

test("entrypoint cache versions load the dual test loadout seed", () => {
  const index = fs.readFileSync(path.join(PROJECT_ROOT, "index.html"), "utf8");
  assert.match(index, /data\/citizens\.js\?v=77/);
  assert.match(index, /data\/item-instances\.js\?v=6/);
  assert.match(index, /js\/item-instance-store\.js\?v=15/);
});
