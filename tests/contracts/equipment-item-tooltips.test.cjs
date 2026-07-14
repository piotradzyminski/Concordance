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
        const width = Math.max(1, Number(item.width || 1));
        const height = Math.max(1, Number(item.height || 1));
        return Number(rotation) === 90
          ? { width: height, height: width, baseWidth: width, baseHeight: height, rotation: 90 }
          : { width, height, baseWidth: width, baseHeight: height, rotation: 0 };
      },
      getEquipmentContainerCapacityStatus(state = {}, containerId = "", options = {}) {
        const container = options.container || state.itemById?.[containerId] || {};
        if (!container.isContainer) return null;
        return {
          containerProfile: container.containerProfile || { gridColumns: 2, gridRows: 3, slotCapacity: 6 },
          slotCapacity: 6,
          usedSlots: 5,
          gridItemCount: 4
        };
      },
      getEquipmentUnequipTargets() { return []; },
      getEquipmentEquipTargets() { return []; },
      getEquipmentStowTargets() { return []; },
      getEquipmentDrawTargets() { return []; }
    }
  });
  runtime.load("js/equipment-items-panel.js");
  runtime.load("js/equipment-body-regions-panel.js");
  runtime.load("js/equipment-containers-panel.js");
  return runtime;
}

test("item tooltip model uses shared item, condition and location formatters", () => {
  const runtime = createRuntime();
  const backpack = {
    id: "backpack",
    name: "Medium Utility Backpack",
    category: "CONTAINER",
    subtype: "BACKPACK",
    condition: 84,
    width: 2,
    height: 3,
    isContainer: true,
    isEquipped: true,
    equippedLocation: { kind: "BODY_MOUNT", primaryMountId: "LEFT_SHOULDER_CARRY", mountIds: ["LEFT_SHOULDER_CARRY"] },
    containerProfile: { gridColumns: 2, gridRows: 3, slotCapacity: 6 }
  };
  const pistol = {
    id: "pistol",
    name: "Compact Pistol",
    category: "WEAPON",
    subtype: "PISTOL",
    condition: 84,
    width: 2,
    height: 1,
    isInGrid: true,
    containerHostId: "backpack",
    containerPlacement: { column: 2, row: 1, rotation: 0 }
  };
  const state = {
    items: [backpack, pistol],
    itemById: { backpack, pistol },
    bodyMountDefinitions: [{ key: "LEFT_SHOULDER_CARRY", label: "Left Shoulder Carry", regionKey: "LEFT_SHOULDER" }]
  };

  const pistolModel = runtime.window.WS_APP.getEquipmentItemTooltipModel(pistol, state);
  assert.equal(pistolModel.title, "Compact Pistol");
  assert.deepEqual(Array.from(pistolModel.lines), [
    "WEAPON / PISTOL · 2×1",
    "GOOD · 84%",
    "Medium Utility Backpack · Grid"
  ]);

  const backpackModel = runtime.window.WS_APP.getEquipmentItemTooltipModel(backpack, state);
  assert.deepEqual(Array.from(backpackModel.lines), [
    "CONTAINER / BACKPACK · 2×3",
    "GOOD · 84%",
    "4 ITEMS · 5/6 CELLS USED"
  ]);
  assert.equal(backpackModel.kind, "container");
});

test("invalid items expose warning tooltip tone and item index uses canonical tooltip attributes", () => {
  const runtime = createRuntime();
  const invalid = {
    id: "orphan",
    name: "Unknown Equipment Item",
    category: "MISC",
    subtype: "ITEM",
    condition: 32,
    width: 1,
    height: 1,
    isOrphan: true
  };
  const state = {
    selections: { selectedItemId: "", itemIndexOpen: true },
    items: [invalid],
    itemById: { orphan: invalid }
  };

  const model = runtime.window.WS_APP.getEquipmentItemTooltipModel(invalid, state);
  assert.equal(model.tone, "warning");
  assert.equal(model.lines[2], "INVALID · ORPHAN");

  const markup = runtime.window.WS_APP.renderEquipmentItemIndex(state);
  assert.match(markup, /data-equipment-tooltip="true"/);
  assert.match(markup, /data-equipment-tooltip-tone="warning"/);
  assert.match(markup, /data-equipment-tooltip-title="Unknown Equipment Item"/);
});

test("region and slot tooltip projections are compact and keyboard reachable", () => {
  const runtime = createRuntime();
  const pistol = { id: "pistol", name: "Compact Pistol", category: "WEAPON", subtype: "PISTOL", condition: 84, width: 2, height: 1, isEquipped: true };
  const region = {
    key: "THIGHS",
    label: "Thighs",
    isComposite: true,
    slotMode: "THIGHS",
    childRegions: [
      { key: "LEFT_THIGH", label: "Left Thigh", visibleLayers: [], mounts: [{ key: "LEFT_THIGH_HOLSTER", label: "Left Thigh Mount", occupied: false }], itemMounts: [] },
      { key: "RIGHT_THIGH", label: "Right Thigh", visibleLayers: [], mounts: [{ key: "RIGHT_THIGH_HOLSTER", label: "Right Thigh Mount", occupied: true, occupant: pistol }], itemMounts: [] }
    ]
  };
  const state = {
    citizenId: "citizen-a",
    selections: { selectedRegion: "THIGHS" },
    bodyRegions: [region],
    inventory: { gridItems: [] },
    itemById: { pistol },
    bodyMountDefinitions: [
      { key: "LEFT_THIGH_HOLSTER", label: "Left Thigh Mount", acceptedTags: ["HOLSTER"] },
      { key: "RIGHT_THIGH_HOLSTER", label: "Right Thigh Mount", acceptedTags: ["HOLSTER"] }
    ]
  };

  const regionModel = runtime.window.WS_APP.getEquipmentRegionTooltipModel(region);
  assert.deepEqual(Array.from(regionModel.lines), ["1 OCCUPIED · 1 EMPTY", "2 BODY MOUNTS", "CLICK TO OPEN REGION"]);

  const markup = runtime.window.WS_APP.renderEquipmentSelectedRegionDetail(state);
  assert.match(markup, /data-equipment-tooltip-title="LEFT THIGH MOUNT"/);
  assert.match(markup, /data-equipment-tooltip-line1="EMPTY"/);
  assert.match(markup, /data-equipment-tooltip-line2="ACCEPTS THIGH HOLSTER \/ CARRIER"/);
  assert.match(markup, /tabindex="0" aria-label="LEFT THIGH MOUNT \/ EMPTY"/);
  assert.match(markup, /data-equipment-tooltip-title="Compact Pistol"/);
});

test("container grid, bodymap and tooltip controller use the shared tooltip contract", () => {
  const runtime = createRuntime();
  const container = {
    id: "backpack",
    name: "Medium Utility Backpack",
    category: "CONTAINER",
    subtype: "BACKPACK",
    condition: 84,
    width: 2,
    height: 3,
    isContainer: true,
    containerProfile: { gridColumns: 2, gridRows: 3, slotCapacity: 6 }
  };
  const item = {
    id: "pistol",
    name: "Compact Pistol",
    category: "WEAPON",
    subtype: "PISTOL",
    condition: 84,
    width: 2,
    height: 1,
    isInGrid: true,
    containerHostId: "backpack",
    containerPlacement: { column: 1, row: 1, rotation: 0 }
  };
  const state = {
    selections: { selectedItemId: "pistol" },
    items: [container, item],
    itemById: { backpack: container, pistol: item },
    inventory: { gridItems: [item] }
  };
  runtime.window.WS_APP.getEquipmentContainerGridModel = () => ({
    container,
    capacity: { containerProfile: container.containerProfile, slotCapacity: 6, usedSlots: 2, gridItemCount: 1 },
    grid: { columns: 2, rows: 3, slotCapacity: 6, visualCells: 6, hasGrid: true },
    entries: [{ item, placement: { column: 1, row: 1 }, footprint: { width: 2, height: 1, rotation: 0 }, persistent: true }],
    occupancy: [["pistol", "pistol"], ["", ""], ["", ""]],
    hasUnplacedItems: false
  });

  const markup = runtime.window.WS_APP.equipmentContainersPanel.renderSelectedContainerGrid(state, container);
  assert.match(markup, /data-equipment-tooltip-title="Compact Pistol"/);
  assert.match(markup, /data-equipment-tooltip-line3="Medium Utility Backpack · Grid"/);

  const actionSource = fs.readFileSync(path.join(PROJECT_ROOT, "js/equipment-actions.js"), "utf8");
  const bodymapSource = fs.readFileSync(path.join(PROJECT_ROOT, "js/equipment-bodymap-panel.js"), "utf8");
  const cssSource = fs.readFileSync(path.join(PROJECT_ROOT, "css/equipment.css"), "utf8");
  assert.match(actionSource, /root\.addEventListener\("focusin"/);
  assert.match(actionSource, /root\.addEventListener\("focusout"/);
  assert.match(actionSource, /event\.key === "Escape"/);
  assert.match(actionSource, /activeGridDrag\?\.started/);
  assert.match(bodymapSource, /renderEquipmentRegionTooltipAttributes/);
  assert.match(cssSource, /data-equipment-tooltip-tone="warning"/);
});
