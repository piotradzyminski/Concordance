"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

function createRuntime() {
  const runtime = createBrowserRuntime({
    wsApp: {
      escapeEquipmentHtml(value = "") {
        return String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;");
      },
      getItemInstanceDisplayName(item = {}) {
        return item.playerLabel || item.displayName || item.catalogName || item.name || item.instanceId || item.id || "Item";
      },
      getEquipmentItemGridFootprint(item = {}, rotation = 0) {
        return { width: Number(item.width || 1), height: Number(item.height || 1), rotation };
      },
      getEquipmentEquipTargets() { return []; },
      getEquipmentUnequipTargets() { return []; },
      getEquipmentStowTargets() { return []; },
      getEquipmentDrawTargets() { return []; }
    }
  });
  runtime.loadMany([
    "data/item-type-catalog.js",
    "js/item-type-registry.js",
    "js/item-type-operations-ui.js",
    "js/equipment-store.js",
    "js/equipment-items-panel.js"
  ]);
  return runtime;
}

function makeFirearm() {
  return {
    id: "firearm-1",
    instanceId: "firearm-1",
    ownerId: "citizen-a",
    name: "Compact Pistol",
    catalogName: "Compact Pistol",
    category: "WEAPON",
    subtype: "SIDEARM",
    itemType: "FIREARM",
    itemTypeProfile: {
      weaponClass: "SIDEARM",
      magazineType: "COMPACT_PISTOL",
      ammunitionType: "PISTOL_STANDARD",
      fireModes: ["SINGLE"],
      chamberCapacity: 1,
      handsRequired: 1
    },
    itemState: { schemaVersion: 1, typeId: "FIREARM", data: { safety: "SAFE", fireMode: "SINGLE", chamberedRounds: 0, jammed: false } },
    width: 2,
    height: 1,
    condition: 88,
    location: "EQUIPPED",
    isEquipped: true,
    equippedLocation: { kind: "LAYER", anchor: "LEFT_HAND", layer: "HELD" },
    equipProfile: { allowedAnchors: ["LEFT_HAND", "RIGHT_HAND"], layer: "HELD" },
    capabilities: ["WEAPON", "ACCEPTS_MAGAZINE"]
  };
}

function makeMagazine() {
  return {
    id: "magazine-1",
    instanceId: "magazine-1",
    ownerId: "citizen-a",
    name: "Compact Pistol Magazine",
    catalogName: "Compact Pistol Magazine",
    category: "AMMUNITION",
    subtype: "PISTOL_MAGAZINE",
    itemType: "MAGAZINE",
    itemTypeProfile: { magazineType: "COMPACT_PISTOL", ammunitionType: "PISTOL_STANDARD", capacity: 12 },
    itemState: { schemaVersion: 1, typeId: "MAGAZINE", data: { ammunitionDefinitionId: "eqcat-standard-pistol-rounds", roundsCurrent: 8 } },
    quantity: 1,
    location: "CONTAINER",
    isInGrid: true,
    containerHostId: "pack-1",
    containerPlacement: { containerId: "pack-1", column: 1, row: 1, rotation: 0 },
    width: 1,
    height: 2
  };
}

function makeAmmo() {
  return {
    id: "ammo-1",
    instanceId: "ammo-1",
    definitionId: "eqcat-standard-pistol-rounds",
    ownerId: "citizen-a",
    name: "Standard Pistol Rounds",
    catalogName: "Standard Pistol Rounds",
    category: "AMMUNITION",
    subtype: "ROUNDS",
    itemType: "AMMUNITION",
    itemTypeProfile: { ammunitionType: "PISTOL_STANDARD", unit: "ROUND", stackLimit: 100 },
    itemState: { schemaVersion: 1, typeId: "AMMUNITION", data: {} },
    quantity: 20,
    location: "CONTAINER",
    isInGrid: true,
    containerHostId: "pack-1",
    containerPlacement: { containerId: "pack-1", column: 2, row: 1, rotation: 0 },
    width: 1,
    height: 1
  };
}

test("Item Operations renderer exposes firearm, magazine, grenade and consumable controls", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const firearm = makeFirearm();
  const magazine = makeMagazine();
  const ammo = makeAmmo();
  const state = {
    citizenId: "citizen-a",
    selectedItem: firearm,
    selections: { selectedItemId: firearm.id },
    items: [firearm, magazine, ammo],
    itemById: { [firearm.id]: firearm, [magazine.id]: magazine, [ammo.id]: ammo },
    bodyMountDefinitions: []
  };

  app.getInstalledMagazine = () => null;
  let html = app.renderItemTypeOperationsPanel(firearm, state);
  assert.match(html, /ITEM OPERATIONS/i);
  assert.match(html, /data-item-type-operation-form="FIREARM_INSERT_MAGAZINE"/);
  assert.match(html, /Compact Pistol Magazine/);
  assert.match(html, /data-item-type-operation-button="FIREARM_CHAMBER"/);
  assert.match(html, /data-item-type-operation-button="FIREARM_SET_SAFETY"/);
  assert.match(html, /data-item-type-operation-button="FIREARM_SET_FIRE_MODE"/);

  html = app.renderItemTypeOperationsPanel(magazine, { ...state, selectedItem: magazine });
  assert.match(html, /data-item-type-operation-form="MAGAZINE_LOAD"/);
  assert.match(html, /data-item-type-operation-form="MAGAZINE_UNLOAD"/);
  assert.match(html, /Standard Pistol Rounds/);
  assert.match(html, /8 \/ 12/);

  const grenade = {
    id: "grenade-1",
    instanceId: "grenade-1",
    ownerId: "citizen-a",
    name: "Fragmentation Grenade",
    itemType: "GRENADE",
    itemTypeProfile: { grenadeClass: "FRAGMENTATION", triggerModes: ["MANUAL", "TIMED"], defaultFuseSeconds: 4, singleUse: true },
    itemState: { schemaVersion: 1, typeId: "GRENADE", data: { armed: false, triggerMode: "MANUAL", fuseSeconds: 0, spent: false } }
  };
  html = app.renderItemTypeOperationsPanel(grenade, { citizenId: "citizen-a", items: [grenade] });
  assert.match(html, /data-item-type-operation-form="GRENADE_ARM"/);
  assert.match(html, /NO TIMER OR DETONATION IS STARTED/);

  const consumable = {
    id: "ration-1",
    instanceId: "ration-1",
    ownerId: "citizen-a",
    name: "Nutrient Ration",
    itemType: "CONSUMABLE",
    itemTypeProfile: { consumableKind: "FOOD", stackLimit: 20 },
    itemState: { schemaVersion: 1, typeId: "CONSUMABLE", data: {} },
    quantity: 3
  };
  html = app.renderItemTypeOperationsPanel(consumable, { citizenId: "citizen-a", items: [consumable] });
  assert.match(html, /data-item-type-operation-form="CONSUMABLE_USE"/);
  assert.match(html, /Used Today/);
  assert.match(html, /Campaign Day/);
  assert.match(html, /NO EFFECT OR CITIZEN STATUS IS CREATED/);
});

test("installed detachable magazine is a valid Equipment projection and receives an item-module location label", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const installed = app.normalizeEquipmentItem({
    id: "magazine-1",
    instanceId: "magazine-1",
    ownerId: "citizen-a",
    name: "Compact Pistol Magazine",
    itemType: "MAGAZINE",
    location: "INSTALLED_IN_ITEM",
    locationData: { type: "INSTALLED_IN_ITEM", parentItemInstanceId: "firearm-1", moduleSlotId: "MAGAZINE_WELL" },
    parentItemInstanceId: "firearm-1",
    moduleSlotId: "MAGAZINE_WELL",
    lifecycleState: "INSTALLED"
  });
  const firearm = makeFirearm();

  assert.equal(installed.isInstalledInItem, true);
  assert.equal(installed.isOrphan, false);
  assert.equal(installed.isLocated, true);
  assert.equal(installed.parentItemInstanceId, "firearm-1");
  assert.equal(installed.moduleSlotId, "MAGAZINE_WELL");

  const descriptor = app.getEquipmentItemLocationDescriptor(installed, {
    itemById: { "firearm-1": firearm, "magazine-1": installed },
    bodyMountDefinitions: []
  });
  assert.equal(descriptor.kind, "ITEM MODULE");
  assert.match(descriptor.label, /Compact Pistol/);
  assert.match(descriptor.label, /MAGAZINE WELL/);
});

test("Equipment Inspector and delegated actions are wired to the Item Operations UI", () => {
  const panel = fs.readFileSync(path.join(PROJECT_ROOT, "js/equipment-items-panel.js"), "utf8");
  const actions = fs.readFileSync(path.join(PROJECT_ROOT, "js/equipment-actions.js"), "utf8");
  const operationsUi = fs.readFileSync(path.join(PROJECT_ROOT, "js/item-type-operations-ui.js"), "utf8");
  const modules = fs.readFileSync(path.join(PROJECT_ROOT, "js/modules.js"), "utf8");
  const css = fs.readFileSync(path.join(PROJECT_ROOT, "css/equipment.css"), "utf8");
  const index = fs.readFileSync(path.join(PROJECT_ROOT, "index.html"), "utf8");

  assert.match(panel, /renderItemTypeOperationsPanel/);
  assert.match(actions, /data-item-type-operation-form/);
  assert.match(actions, /data-item-type-operation-button/);
  assert.match(actions, /executeItemTypeOperationUi/);
  assert.match(actions, /loadMagazine\?\./);
  assert.match(actions, /insertFirearmMagazine\?\./);
  assert.match(actions, /armGrenade\?\./);
  assert.match(actions, /useConsumable\?\./);
  assert.match(actions, /usageSource: "EQUIPMENT"/);
  assert.match(operationsUi, /NO EFFECT OR CITIZEN STATUS IS CREATED/);
  assert.match(operationsUi, /USAGE LOG/);
  assert.doesNotMatch(operationsUi, /previewConsumableEffect|getCitizenStatusEffects|effectResolutionStatus/);
  assert.match(modules, /js\/item-type-operations-ui\.js\?v=3/);
  assert.match(modules, /css\/equipment\.css\?v=129/);
  assert.match(index, /js\/item-type-operations\.js\?v=3/);
  assert.match(index, /js\/modules\.js\?v=302/);
  assert.match(css, /Item type operation controls 1\.2x/);
  assert.match(css, /\.item-type-operation-status-grid/);
});
