"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createRuntime() {
  const runtime = createBrowserRuntime();
  runtime.load("js/store-utils.js");
  runtime.load("data/item-type-catalog.js");
  runtime.load("js/item-type-registry.js");
  runtime.load("data/equipment-catalog.js");
  runtime.load("js/equipment-catalog-store.js");
  runtime.load("js/item-instance-store.js");
  return runtime;
}

test("item type registry resolves functional types independently from catalog category and subtype", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;

  assert.equal(app.resolveItemTypeId({ category: "WEAPON", subtype: "SIDEARM" }), "FIREARM");
  assert.equal(app.resolveItemTypeId({ category: "WEAPON", subtype: "SWORD" }), "MELEE_WEAPON");
  assert.equal(app.resolveItemTypeId({ category: "PERSONAL", subtype: "WALLET" }), "WALLET");
  assert.equal(app.resolveItemTypeId({ category: "WEAPON", subtype: "FRAGMENTATION_GRENADE" }), "GRENADE");
  assert.equal(app.resolveItemTypeId({ category: "AMMUNITION", subtype: "PISTOL_MAGAZINE" }), "MAGAZINE");
  assert.equal(app.resolveItemTypeId({ category: "AMMUNITION", subtype: "ROUNDS" }), "AMMUNITION");

  assert.equal(app.itemHasCapability("FIREARM", "ACCEPTS_MAGAZINE"), true);
  assert.equal(app.itemHasCapability("GRENADE", "ARMABLE"), true);
  assert.equal(app.itemHasCapability("WALLET", "CREDENTIAL_STORAGE"), true);
});

test("catalog definitions expose type profiles for firearm, melee weapon, grenade, magazine, ammunition and wallet", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;

  const pistol = app.getEquipmentCatalogItemById("eqcat-compact-pistol");
  const sword = app.getEquipmentCatalogItemById("eqcat-cyberkatana");
  const grenade = app.getEquipmentCatalogItemById("eqcat-fragmentation-grenade");
  const magazine = app.getEquipmentCatalogItemById("eqcat-compact-pistol-magazine");
  const ammunition = app.getEquipmentCatalogItemById("eqcat-standard-pistol-rounds");
  const wallet = app.getEquipmentCatalogItemById("eqcat-personal-wallet");

  assert.equal(pistol.itemType, "FIREARM");
  assert.equal(pistol.itemTypeProfile.magazineType, "COMPACT_PISTOL");
  assert.deepEqual(Array.from(pistol.itemTypeProfile.fireModes), ["SINGLE"]);
  assert.equal(sword.itemType, "MELEE_WEAPON");
  assert.equal(sword.itemTypeProfile.weaponClass, "SWORD");
  assert.equal(grenade.itemType, "GRENADE");
  assert.equal(grenade.itemTypeProfile.defaultFuseSeconds, 4);
  assert.equal(magazine.itemType, "MAGAZINE");
  assert.equal(magazine.itemTypeProfile.capacity, 12);
  assert.equal(ammunition.itemType, "AMMUNITION");
  assert.equal(ammunition.itemTypeProfile.ammunitionType, "PISTOL_STANDARD");
  assert.equal(wallet.itemType, "WALLET");
  assert.equal(wallet.containerProfile.slotCapacity, 6);
});

test("ItemInstance owns normalized per-instance itemState and exposes one owner-checked mutation command", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;

  const created = app.createItemInstance({
    instanceId: "magazine-instance",
    definitionId: "eqcat-compact-pistol-magazine",
    ownerId: "citizen-a",
    location: { type: "UNPLACED", characterId: "citizen-a" },
    itemState: { data: { ammunitionDefinitionId: "eqcat-standard-pistol-rounds", roundsCurrent: 99 } }
  }, { deferPersistence: true, skipCitizenEvent: true, skipItemEvent: true, skipModuleRefresh: true, skipProfileRefresh: true });

  assert.equal(created.ok, true);
  assert.equal(created.item.itemType, "MAGAZINE");
  assert.equal(created.item.itemState.data.roundsCurrent, 12);

  const updated = app.updateItemTypeState("citizen-a", "magazine-instance", { roundsCurrent: 7 }, {
    deferPersistence: true,
    skipCitizenEvent: true,
    skipItemEvent: true,
    skipModuleRefresh: true,
    skipProfileRefresh: true
  });
  assert.equal(updated.ok, true);
  assert.equal(updated.item.itemState.data.roundsCurrent, 7);

  const denied = app.updateItemTypeState("citizen-b", "magazine-instance", { roundsCurrent: 1 });
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, "ITEM_INSTANCE_OWNER_MISMATCH");
});
