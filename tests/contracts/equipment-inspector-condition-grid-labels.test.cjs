"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT, createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

test("compact Inspector cards use player labels, keep slot badge in the slot row and keep condition visual-only", () => {
  const runtime = createBrowserRuntime({
    wsApp: {
      getEquipmentUnequipTargets() {
        return [{ id: "bag", label: "Utility Bag" }];
      },
      getEquipmentEquipTargets() {
        return [];
      }
    }
  });
  runtime.load("js/equipment-items-panel.js");
  runtime.load("js/equipment-body-regions-panel.js");

  const damaged = {
    id: "armor-damaged",
    name: "Light Leg Armor",
    category: "ARMOR",
    subtype: "LEG_ARMOR",
    condition: 32,
    isEquipped: true,
    equippedLocation: { kind: "LAYER", anchor: "LEGS", layer: "ARMOR" }
  };
  const broken = {
    id: "leggings-broken",
    name: "Broken Thermal Leggings",
    category: "CLOTHING",
    subtype: "THERMAL_LEGGINGS",
    condition: 9,
    isEquipped: true,
    equippedLocation: { kind: "LAYER", anchor: "LEGS", layer: "INNER" }
  };
  const region = {
    key: "LEGS",
    label: "LEGS",
    visibleLayers: [
      { key: "INNER", label: "INNER", role: "PRIMARY", occupied: true, occupant: broken },
      { key: "ARMOR", label: "ARMOR", role: "PRIMARY", occupied: true, occupant: damaged }
    ],
    mounts: [],
    itemMounts: []
  };
  const state = {
    citizenId: "citizen-a",
    selections: { selectedRegion: "LEGS" },
    bodyRegions: [region],
    itemById: { [damaged.id]: damaged, [broken.id]: broken },
    inventory: { gridItems: [] }
  };

  const html = runtime.window.WS_APP.renderEquipmentSelectedRegionDetail(state);

  assert.match(html, /<span>ARMOR \/ LEG ARMOR<\/span>/);
  assert.match(html, /<span>CLOTHING \/ THERMAL LEGGINGS<\/span>/);
  assert.doesNotMatch(html, /LEG_ARMOR/);
  assert.doesNotMatch(html, /THERMAL_LEGGINGS/);
  assert.doesNotMatch(html, /<span>[^<]*(?:PERFECT|GOOD|WORN|DAMAGED|BROKEN)[^<]*<\/span>/);
  assert.match(html, /equipment-body-layer-row[^"]*is-damaged/);
  assert.match(html, /equipment-body-layer-row[^"]*is-broken/);

  const css = read("css/equipment.css");
  assert.match(css, /\.equipment-body-layer-row__identity small\s*\{[\s\S]*?grid-column:\s*1;[\s\S]*?grid-row:\s*1;/);
  assert.match(css, /\.equipment-slot-identity-copy > \.equipment-slot-status-badge\s*\{[\s\S]*?grid-column:\s*2;[\s\S]*?grid-row:\s*1;/);
  assert.match(css, /\.equipment-loadout-slot-tile\.is-damaged/);
  assert.match(css, /\.equipment-loadout-slot-tile\.is-broken/);
});


test("full Item Inspector normalizes item subtype, body region and contextual slot labels", () => {
  const runtime = createBrowserRuntime({
    wsApp: {
      getEquipmentItemGridFootprint() {
        return { width: 1, height: 1, baseWidth: 1, baseHeight: 1, rotation: 0 };
      },
      getEquipmentUnequipTargets() {
        return [{ id: "bag", label: "Utility Bag" }];
      }
    }
  });
  runtime.load("js/equipment-items-panel.js");

  const item = {
    id: "forearm-guard",
    name: "Forearm Guard",
    category: "ARMOR",
    subtype: "FOREARM_GUARD",
    condition: 96,
    isEquipped: true,
    equippedLocation: { kind: "LAYER", anchor: "right_forearm", layer: "FOREARM_GUARD" },
    description: "Independent forearm armor."
  };
  const state = {
    citizenId: "citizen-a",
    selectedItem: item,
    itemById: { [item.id]: item },
    bodyRegions: [{ key: "RIGHT_FOREARM", label: "right_forearm" }],
    selections: {}
  };

  const html = runtime.window.WS_APP.renderEquipmentItemDetail(state);

  assert.match(html, />ARMOR \/ FOREARM GUARD</);
  assert.match(html, />BODY · RIGHT FOREARM \/ ARMOR</);
  assert.doesNotMatch(html, /FOREARM_GUARD/);
  assert.doesNotMatch(html, /RIGHT_FOREARM/);
  assert.equal(runtime.window.WS_APP.formatEquipmentContainerTypeLabel("MASS_COMPRESSION_CUBE"), "C-CUBE");
  assert.equal(runtime.window.WS_APP.formatEquipmentSlotLabel("FOREARM_GUARD", { regionKey: "RIGHT_FOREARM" }), "ARMOR");
});

test("broken grid items expose a disabled BROKEN action and are rejected by canonical equip rules", () => {
  const runtime = createBrowserRuntime({
    wsApp: {
      getEquipmentItemGridFootprint() {
        return { width: 1, height: 1, baseWidth: 1, baseHeight: 1, rotation: 0 };
      },
      getEquipmentEquipTargets() {
        return [{ id: "LAYER|LEGS|INNER", label: "LEGS / INNER", validation: { ok: true } }];
      },
      getEquipmentStowTargets() {
        return [];
      },
      getEquipmentDrawTargets() {
        return [];
      }
    }
  });
  runtime.load("js/equipment-items-panel.js");

  const item = {
    id: "broken-item",
    name: "Broken Thermal Leggings",
    category: "CLOTHING",
    subtype: "THERMAL_LEGGINGS",
    condition: 14,
    isInGrid: true,
    containerHostId: "bag"
  };
  const actions = runtime.window.WS_APP.renderEquipmentItemEquipActions(item, {
    citizenId: "citizen-a",
    itemById: { [item.id]: item }
  });

  assert.match(actions, /equipment-action-broken/);
  assert.match(actions, /disabled/);
  assert.match(actions, />Broken<\/button>/);
  assert.doesNotMatch(actions, /data-equipment-equip-item/);

  const rulesRuntime = createBrowserRuntime();
  rulesRuntime.load("js/equipment-loadout-rules.js");
  const state = {
    itemById: { [item.id]: { ...item, equipProfile: { allowedAnchors: ["LEGS"], layer: "INNER" } } },
    bodyRegions: [{ key: "LEGS", label: "LEGS", visibleLayers: [{ key: "INNER", occupied: false }] }],
    layerOccupancy: {},
    items: [item]
  };
  const result = rulesRuntime.window.WS_APP.evaluateEquipmentLayerRules(
    { id: "citizen-a" },
    item.id,
    "LEGS",
    "INNER",
    { state, item: state.itemById[item.id], region: state.bodyRegions[0] }
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "ITEM_BROKEN");
});

test("CyberGrid storage headers use region and container type hierarchy instead of BODY, MOUNT and NESTED labels", () => {
  const runtime = createBrowserRuntime({
    wsApp: {
      getEquipmentContainerCapacityStatus(_state, containerId) {
        const slots = containerId === "cube" ? 24 : containerId === "backpack" ? 8 : containerId === "chest-rig" ? 4 : 3;
        return {
          containerProfile: { slotCapacity: slots, gridColumns: containerId === "cube" ? 4 : containerId === "backpack" ? 2 : containerId === "chest-rig" ? 2 : 3, gridRows: containerId === "cube" ? 6 : containerId === "backpack" ? 4 : containerId === "chest-rig" ? 2 : 1 },
          slotCapacity: slots,
          usedSlots: 0,
          freeSlots: slots,
          gridItemCount: 0
        };
      },
      getEquipmentContainerGridModel(_state, containerId, options = {}) {
        const profile = options.container?.containerProfile || options.capacity?.containerProfile || {};
        return {
          container: options.container,
          capacity: options.capacity,
          grid: {
            columns: Number(profile.gridColumns || 1),
            rows: Number(profile.gridRows || 1),
            slotCapacity: Number(profile.slotCapacity || 1),
            visualCells: Number(profile.slotCapacity || 1),
            hasGrid: true
          },
          entries: [],
          occupancy: [],
          hasUnplacedItems: false
        };
      }
    }
  });
  runtime.load("js/equipment-items-panel.js");
  runtime.load("js/equipment-containers-panel.js");

  const belt = {
    id: "belt",
    name: "Standard Belt",
    category: "CONTAINER",
    subtype: "BELT",
    isContainer: true,
    isEquipped: true,
    containerProfile: { slotCapacity: 3, gridColumns: 3, gridRows: 1 }
  };
  const backpack = {
    id: "backpack",
    name: "Medium Utility Backpack",
    category: "CONTAINER",
    subtype: "BACKPACK",
    isContainer: true,
    isEquipped: true,
    containerProfile: { slotCapacity: 8, gridColumns: 2, gridRows: 4 }
  };
  const chestRig = {
    id: "chest-rig",
    name: "Service Chest Rig",
    category: "CONTAINER",
    subtype: "CHEST_RIG",
    isContainer: true,
    isEquipped: true,
    containerProfile: { slotCapacity: 4, gridColumns: 2, gridRows: 2 }
  };
  const cube = {
    id: "cube",
    name: "Mass Compression Cube IV",
    category: "CONTAINER",
    subtype: "MASS_COMPRESSION_CUBE",
    tags: ["MCC", "MASS_COMPRESSION_CUBE"],
    isContainer: true,
    isInGrid: true,
    containerHostId: "backpack",
    containerProfile: { slotCapacity: 24, gridColumns: 4, gridRows: 6 }
  };
  const state = {
    selections: {},
    itemById: { belt, backpack, chestRig, cube },
    containers: { all: [belt, backpack, chestRig, cube] },
    inventory: { gridItems: [] },
    storageRegions: [
      { id: "storage-region:belt", containerId: "belt", bodyAnchor: "WAIST", locationType: "BODY", depth: 0 },
      { id: "storage-region:backpack", containerId: "backpack", bodyAnchor: "BACK", locationType: "BODY", depth: 0 },
      { id: "storage-region:chest-rig", containerId: "chest-rig", bodyAnchor: "TORSO", locationType: "BODY", depth: 0 },
      { id: "storage-region:cube", containerId: "cube", parentContainerId: "backpack", parentContainerName: "Medium Utility Backpack", locationType: "CONTAINER", depth: 1 }
    ]
  };

  const html = runtime.window.WS_APP.renderEquipmentCybergridPanel(state);

  assert.match(html, />WAIST \/ BELT</);
  assert.match(html, />BACK \/ BACKPACK</);
  assert.match(html, />TORSO \/ CHEST RIG</);
  assert.match(html, />BACKPACK \/ C-CUBE</);
  assert.match(html, /<h6>Standard Belt<\/h6>/);
  assert.match(html, /<h6>Medium Utility Backpack<\/h6>/);
  assert.match(html, /<h6>Service Chest Rig<\/h6>/);
  assert.match(html, /<h6>Mass Compression Cube IV<\/h6>/);
  assert.doesNotMatch(html, />BODY \//);
  assert.doesNotMatch(html, />NESTED \//);
  assert.doesNotMatch(html, /\/ MOUNT</);
  assert.doesNotMatch(html, /CHEST_RIG/);
});
