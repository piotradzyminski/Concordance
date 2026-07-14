"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT, createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

function createRegionState() {
  const left = {
    key: "LEFT_FOREARM",
    label: "Left Forearm",
    occupiedCount: 0,
    visibleLayers: [{ key: "ARMOR", label: "ARMOR", role: "EMPTY", occupied: false, occupant: null }],
    mounts: [
      { key: "LEFT_FOREARM_ACCESSORY_1", label: "Left Wrist", occupied: false, occupant: null },
      { key: "LEFT_FOREARM_ACCESSORY_2", label: "Left Forearm", occupied: false, occupant: null }
    ],
    itemMounts: []
  };
  const right = {
    key: "RIGHT_FOREARM",
    label: "Right Forearm",
    occupiedCount: 0,
    visibleLayers: [{ key: "ARMOR", label: "ARMOR", role: "EMPTY", occupied: false, occupant: null }],
    mounts: [
      { key: "RIGHT_FOREARM_ACCESSORY_1", label: "Right Wrist", occupied: false, occupant: null },
      { key: "RIGHT_FOREARM_ACCESSORY_2", label: "Right Forearm", occupied: false, occupant: null }
    ],
    itemMounts: []
  };
  const composite = {
    key: "FOREARMS",
    label: "Forearms",
    isComposite: true,
    slotMode: "FOREARMS",
    childRegionKeys: [left.key, right.key],
    childRegions: [left, right]
  };
  return {
    citizenId: "citizen-a",
    selections: { selectedRegion: "FOREARMS" },
    bodyRegions: [composite, left, right],
    bodyMountDefinitions: [
      { key: "LEFT_FOREARM_ACCESSORY_1", regionKey: "LEFT_FOREARM" },
      { key: "LEFT_FOREARM_ACCESSORY_2", regionKey: "LEFT_FOREARM" },
      { key: "RIGHT_FOREARM_ACCESSORY_1", regionKey: "RIGHT_FOREARM" },
      { key: "RIGHT_FOREARM_ACCESSORY_2", regionKey: "RIGHT_FOREARM" }
    ],
    inventory: {
      gridItems: [
        { id: "guard-1", name: "Forearm Guard" },
        { id: "watch-1", name: "Service Watch" }
      ]
    }
  };
}

test("Region Inspector uses local slot labels and grouped Quick Equip buttons", () => {
  const runtime = createBrowserRuntime();
  runtime.window.WS_APP.getEquipmentEquipTargets = (_citizen, itemId) => {
    if (itemId === "guard-1") {
      return [
        { kind: "LAYER", id: "LAYER|LEFT_FOREARM|ARMOR", anchor: "LEFT_FOREARM", layer: "ARMOR", validation: { ok: true } },
        { kind: "LAYER", id: "LAYER|RIGHT_FOREARM|ARMOR", anchor: "RIGHT_FOREARM", layer: "ARMOR", validation: { ok: true } }
      ];
    }
    return [
      { kind: "BODY_MOUNT", id: "BODY_MOUNT|LEFT_WRIST", mountSet: { mountIds: ["LEFT_FOREARM_ACCESSORY_1"] }, validation: { ok: true } },
      { kind: "BODY_MOUNT", id: "BODY_MOUNT|RIGHT_WRIST", mountSet: { mountIds: ["RIGHT_FOREARM_ACCESSORY_1"] }, validation: { ok: true } },
      { kind: "BODY_MOUNT", id: "BODY_MOUNT|LEFT_FOREARM", mountSet: { mountIds: ["LEFT_FOREARM_ACCESSORY_2"] }, validation: { ok: true } },
      { kind: "BODY_MOUNT", id: "BODY_MOUNT|RIGHT_FOREARM", mountSet: { mountIds: ["RIGHT_FOREARM_ACCESSORY_2"] }, validation: { ok: true } }
    ];
  };
  runtime.load("js/equipment-body-regions-panel.js");

  const html = runtime.window.WS_APP.renderEquipmentSelectedRegionDetail(createRegionState());

  assert.match(html, /equipment-loadout-slot-tile__ghost"[^>]*>WRIST</);
  assert.match(html, /equipment-loadout-slot-tile__ghost"[^>]*>FOREARM</);
  assert.doesNotMatch(html, /equipment-loadout-slot-tile__ghost"[^>]*>LEFT WRIST</);
  assert.doesNotMatch(html, /equipment-loadout-slot-tile__ghost"[^>]*>RIGHT FOREARM</);
  assert.match(html, /<h6>Quick Equip<\/h6>/);
  assert.match(html, /equipment-quick-equip__group-head"><b>ARMOR<\/b>/);
  assert.match(html, /equipment-quick-equip__group-head"><b>WRIST<\/b>/);
  assert.match(html, /equipment-quick-equip__group-head"><b>FOREARM<\/b>/);
  assert.match(html, />Forearm Guard<\/b>/);
  assert.match(html, />Service Watch<\/b>/);
  assert.doesNotMatch(html, /<strong>Equip<\/strong>/i);
  assert.doesNotMatch(html, />Equip<\/button>/i);

  const source = read("js/equipment-body-regions-panel.js");
  assert.match(source, /LEFT_THIGH_HOLSTER:\s*"MOUNT"/);
  assert.match(source, /RIGHT_THIGH_HOLSTER:\s*"MOUNT"/);
});

test("Item Inspector owns a terminal-styled scrollbar and centered wrapping ghost labels", () => {
  const css = read("css/equipment.css");
  assert.match(css, /\.equipment-cybergrid-inspector\s*\{[\s\S]*?scrollbar-color:/);
  assert.match(css, /\.equipment-cybergrid-inspector::\-webkit\-scrollbar-thumb/);
  assert.match(css, /\.equipment-loadout-slot-tile__ghost\s*\{[\s\S]*?place-items:\s*center;/);
  assert.match(css, /\.equipment-loadout-slot-tile__ghost\s*\{[\s\S]*?white-space:\s*normal;/);
});
