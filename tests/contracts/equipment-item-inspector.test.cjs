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
      getEquipmentItemGridFootprint(item = {}, rotation = 0) {
        const baseWidth = Math.max(1, Number(item.width || 1));
        const baseHeight = Math.max(1, Number(item.height || 1));
        return Number(rotation) === 90
          ? { width: baseHeight, height: baseWidth, baseWidth, baseHeight, rotation: 90 }
          : { width: baseWidth, height: baseHeight, baseWidth, baseHeight, rotation: 0 };
      },
      getEquipmentEquipTargets() { return []; },
      getEquipmentUnequipTargets() { return [{ id: "backpack", label: "Medium Utility Backpack" }]; },
      getEquipmentStowTargets() { return []; },
      getEquipmentDrawTargets() { return []; },
      getEquipmentContainerCapacityStatus() {
        return {
          containerProfile: { gridColumns: 2, gridRows: 4, slotCapacity: 8 },
          slotCapacity: 8,
          usedSlots: 5,
          gridItemCount: 4
        };
      }
    }
  });
  runtime.load("js/equipment-items-panel.js");
  runtime.load("js/equipment-body-regions-panel.js");
  return runtime;
}

test("Item Inspector exposes hierarchy, condition, location, container state and attached mounts", () => {
  const runtime = createRuntime();
  const backpack = {
    id: "backpack",
    instanceId: "backpack",
    definitionId: "medium-utility-backpack",
    name: "Medium Utility Backpack",
    category: "CONTAINER",
    subtype: "BACKPACK",
    manufacturer: "Mass Compression",
    description: "Daily service loadout container.",
    gmNote: "must stay hidden",
    condition: 84,
    width: 2,
    height: 3,
    isContainer: true,
    isEquipped: true,
    equippedLocation: { kind: "BODY_MOUNT", primaryMountId: "LEFT_SHOULDER_CARRY", mountIds: ["LEFT_SHOULDER_CARRY"] },
    containerProfile: { gridColumns: 2, gridRows: 4, slotCapacity: 8 },
    mountProfile: { slots: [{ id: "holster", label: "HOLSTER" }, { id: "tool", label: "TOOL MOUNT" }] },
    equipProfile: { allowedAnchors: ["TORSO"], layer: "CARRIER", coverage: ["TORSO", "BACK"] },
    tags: ["UTILITY"]
  };
  const pistol = {
    id: "pistol",
    name: "Compact Pistol",
    category: "WEAPON",
    subtype: "PISTOL",
    condition: 76,
    isEquipped: true,
    equippedLocation: { kind: "ITEM_MOUNT", ownerItemId: "backpack", mountId: "holster" }
  };
  const state = {
    citizenId: "citizen-a",
    selectedItem: backpack,
    selections: {},
    items: [backpack, pistol],
    itemById: { backpack, pistol },
    bodyMountDefinitions: [{ key: "LEFT_SHOULDER_CARRY", label: "LEFT SHOULDER" }]
  };

  const markup = runtime.window.WS_APP.renderEquipmentItemDetail(state, { compact: true });
  assert.match(markup, /Medium Utility Backpack/);
  assert.match(markup, /CONTAINER \/ BACKPACK/);
  assert.match(markup, /Mass Compression/);
  assert.match(markup, /GOOD · 84%/);
  assert.match(markup, /2×3 · MOUNTED/);
  assert.match(markup, /BODY MOUNT · LEFT SHOULDER/);
  assert.match(markup, /Daily service loadout container\./);
  assert.doesNotMatch(markup, /must stay hidden/);
  assert.match(markup, /2×4 · 5\/8 CELLS USED · 4 ITEMS/);
  assert.match(markup, /Attached Items/);
  assert.match(markup, /Compact Pistol/);
  assert.match(markup, /TOOL MOUNT[\s\S]*EMPTY/);
  assert.match(markup, /Coverage/);
  assert.match(markup, /TORSO · BACK/);
  assert.match(markup, /<details class="equipment-technical-details">/);
  assert.match(markup, /data-equipment-unequip-toggle/);
  assert.match(markup, /data-equipment-unequip-panel hidden/);
});

test("Region Inspector stacks composite mounts and renders compact empty, occupied and blocked states", () => {
  const runtime = createRuntime();
  const pistol = { id: "pistol", name: "Compact Pistol", category: "WEAPON", subtype: "PISTOL", condition: 84, isEquipped: true };
  const compatible = { id: "service-holster", name: "Service Holster", condition: 92 };
  const region = {
    key: "THIGHS",
    label: "THIGHS",
    slotMode: "THIGHS",
    isComposite: true,
    occupiedCount: 1,
    childRegionKeys: ["LEFT_THIGH", "RIGHT_THIGH"],
    childRegions: [
      { key: "LEFT_THIGH", label: "LEFT THIGH", occupiedCount: 0, visibleLayers: [], mounts: [{ key: "LEFT_THIGH_HOLSTER", label: "LEFT THIGH HOLSTER", occupied: false, blocked: false }], itemMounts: [] },
      { key: "RIGHT_THIGH", label: "RIGHT THIGH", occupiedCount: 1, visibleLayers: [], mounts: [{ key: "RIGHT_THIGH_HOLSTER", label: "RIGHT THIGH HOLSTER", occupied: true, occupant: pistol }], itemMounts: [] }
    ],
    itemMounts: []
  };
  const state = {
    citizenId: "citizen-a",
    selections: { selectedRegion: "THIGHS" },
    bodyRegions: [region],
    bodyMountDefinitions: [
      { key: "LEFT_THIGH_HOLSTER", regionKey: "LEFT_THIGH" },
      { key: "RIGHT_THIGH_HOLSTER", regionKey: "RIGHT_THIGH" }
    ],
    inventory: { gridItems: [compatible] },
    itemById: { pistol, "service-holster": compatible }
  };
  runtime.window.WS_APP.getEquipmentEquipTargets = () => [
    { id: "target-left", kind: "BODY_MOUNT", label: "LEFT_THIGH_HOLSTER", mountSet: { mountIds: ["LEFT_THIGH_HOLSTER"] }, validation: { ok: true } },
    { id: "target-right", kind: "BODY_MOUNT", label: "RIGHT_THIGH_HOLSTER", mountSet: { mountIds: ["RIGHT_THIGH_HOLSTER"] }, validation: { ok: false, message: "Mount is occupied." } }
  ];

  const markup = runtime.window.WS_APP.renderEquipmentSelectedRegionDetail(state);
  assert.match(markup, /THIGH MOUNTS/);
  assert.ok(markup.indexOf("LEFT THIGH") < markup.indexOf("RIGHT THIGH"));
  assert.match(markup, /LEFT THIGH[\s\S]*data-equipment-slot-label="MOUNT"[\s\S]*EMPTY/);
  assert.match(markup, /RIGHT THIGH[\s\S]*data-equipment-slot-label="MOUNT"[\s\S]*Compact Pistol/);
  assert.match(markup, /<span>WEAPON \/ PISTOL<\/span>/);
  assert.doesNotMatch(markup, /<span>WEAPON \/ PISTOL · GOOD<\/span>/);
  assert.doesNotMatch(markup, /GOOD 84%/);
  assert.match(markup, /equipment-loadout-slot-tile__ghost[^>]*>MOUNT</);
  assert.match(markup, /<h6>Quick Equip<\/h6>/);
  assert.match(markup, /Blocked targets \(1\)/);
  assert.match(markup, /Mount is occupied\./);
});

test("Inspector shell has dynamic mode titles and local unequip disclosure handling", () => {
  const equipmentSource = fs.readFileSync(path.join(PROJECT_ROOT, "js/equipment.js"), "utf8");
  const actionsSource = fs.readFileSync(path.join(PROJECT_ROOT, "js/equipment-actions.js"), "utf8");
  assert.match(equipmentSource, /inspectorTitle: "Item Inspector"/);
  assert.match(equipmentSource, /inspectorTitle: "Region Inspector"/);
  assert.match(equipmentSource, /inspectorTitle: "Container Inspector"/);
  assert.match(equipmentSource, /context\.inspectorTitle/);
  assert.match(actionsSource, /data-equipment-unequip-toggle/);
  assert.match(actionsSource, /panel\.hidden = expanded/);
});
