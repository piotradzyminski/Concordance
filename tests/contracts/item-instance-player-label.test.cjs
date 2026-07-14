"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

function createRuntime() {
  const definition = {
    id: "eqcat-service-pistol",
    catalogId: "eqcat-service-pistol",
    name: "Service Pistol M4",
    category: "WEAPON",
    subtype: "PISTOL",
    footprint: "2x1",
    width: 2,
    height: 1,
    description: "Standard registered sidearm."
  };
  const runtime = createBrowserRuntime({
    appData: {
      itemInstances: [{
        instanceId: "item-pistol-1",
        definitionId: definition.id,
        ownerId: "citizen-a",
        lifecycleState: "UNPACKAGED",
        location: { type: "HOUSING_STORAGE", storageUnitId: "storage-a", gridX: 1, gridY: 1, rotation: 0 },
        durability: { current: 84 },
        instanceData: {}
      }]
    },
    wsApp: {
      getEquipmentCatalogItemById(id) { return id === definition.id ? definition : null; },
      getEquipmentCatalogRevision() { return 1; },
      escapeEquipmentHtml(value = "") { return String(value ?? ""); },
      getEquipmentItemGridFootprint(item = {}, rotation = 0) {
        return { width: Number(item.width || 1), height: Number(item.height || 1), baseWidth: Number(item.width || 1), baseHeight: Number(item.height || 1), rotation };
      },
      getEquipmentUnequipTargets() { return []; },
      getEquipmentEquipTargets() { return []; },
      getEquipmentStowTargets() { return []; },
      getEquipmentDrawTargets() { return []; }
    }
  });
  runtime.loadMany(["js/item-instance-store.js", "js/equipment-store.js", "js/equipment-items-panel.js"]);
  return runtime;
}

test("player label persists on ItemInstance without mutating catalog identity", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;

  const result = app.renameItemInstance("citizen-a", "item-pistol-1", "  Old   Faithful  ", { skipCitizenEvent: true });
  assert.equal(result.ok, true);
  assert.equal(result.playerLabel, "Old Faithful");

  const instance = app.getItemInstanceById("item-pistol-1");
  assert.equal(instance.playerLabel, "Old Faithful");
  assert.equal(instance.definitionId, "eqcat-service-pistol");

  const view = app.getItemInstanceView("item-pistol-1");
  assert.equal(view.name, "Service Pistol M4");
  assert.equal(view.catalogName, "Service Pistol M4");
  assert.equal(view.displayName, "Old Faithful");
  assert.equal(view.playerLabel, "Old Faithful");
});

test("clearing player label restores catalog-name presentation", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  assert.equal(app.renameItemInstance("citizen-a", "item-pistol-1", "Old Faithful", { skipCitizenEvent: true }).ok, true);
  assert.equal(app.renameItemInstance("citizen-a", "item-pistol-1", "", { skipCitizenEvent: true }).ok, true);

  const view = app.getItemInstanceView("item-pistol-1");
  assert.equal(view.playerLabel, "");
  assert.equal(view.displayName, "Service Pistol M4");
  assert.equal(view.catalogName, "Service Pistol M4");
});

test("rename command enforces ownership and normalizes unsafe input", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const mismatch = app.renameItemInstance("citizen-b", "item-pistol-1", "Stolen Name", { skipCitizenEvent: true });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.reason, "ITEM_INSTANCE_OWNER_MISMATCH");

  const long = `A\u0000B ${"x".repeat(100)}`;
  const result = app.renameItemInstance("citizen-a", "item-pistol-1", long, { skipCitizenEvent: true });
  assert.equal(result.ok, true);
  assert.equal(result.playerLabel.includes("\u0000"), false);
  assert.equal(result.playerLabel.length, 64);
});

test("Equipment state and Item Inspector use player label while retaining model name", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  app.renameItemInstance("citizen-a", "item-pistol-1", "Old Faithful", { skipCitizenEvent: true });

  const state = app.getEquipmentState({ id: "citizen-a", name: "Citizen A" });
  const item = state.itemById["item-pistol-1"];
  assert.equal(item.name, "Old Faithful");
  assert.equal(item.catalogName, "Service Pistol M4");

  app.setEquipmentSelectedItem?.("item-pistol-1");
  const markup = app.renderEquipmentItemDetail({
    ...state,
    selectedItem: item,
    selections: { selectedItemId: item.id }
  });
  assert.match(markup, /Old Faithful/);
  assert.match(markup, /MODEL · Service Pistol M4/);
  assert.match(markup, /data-item-instance-rename-toggle="item-pistol-1">RENAME<\/button>/);
  assert.match(markup, /data-item-instance-rename-form="item-pistol-1" hidden/);
  assert.match(markup, /value="Old Faithful"/);
  assert.match(markup, /Use Model Name/);
  assert.ok(markup.indexOf("Item Description") < markup.indexOf("data-item-instance-rename-toggle"));
});

test("delegated Equipment actions own rename submit and clear commands", () => {
  const source = fs.readFileSync(path.join(PROJECT_ROOT, "js/equipment-actions.js"), "utf8");
  assert.match(source, /data-item-instance-rename-form/);
  assert.match(source, /data-item-instance-rename-toggle/);
  assert.match(source, /renameToggle\.hidden = true/);
  assert.match(source, /form\.hidden = false/);
  assert.match(source, /renameItemInstance\?\./);
  assert.match(source, /PLAYER_ITEM_RENAME/);
  assert.match(source, /data-item-instance-rename-clear/);
});

test("Cyberware Installed Systems and Core Stack expose the shared rename control", () => {
  const linkSource = fs.readFileSync(path.join(PROJECT_ROOT, "js/equipment-cyberware-link.js"), "utf8");
  const coreSource = fs.readFileSync(path.join(PROJECT_ROOT, "js/cyberware-core-stack.js"), "utf8");
  assert.match(linkSource, /renderItemInstanceRenameControl/);
  assert.match(linkSource, /renderItemInstanceRenameControl\(item/);
  assert.match(linkSource, /renderItemInstanceRenameControl\(component/);
  assert.match(coreSource, /playerLabel/);
  assert.match(coreSource, /catalogName/);
});
