"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT, createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

test("empty region slots render one centered ghost label without a duplicate corner label", () => {
  const runtime = createBrowserRuntime({ wsApp: {} });
  runtime.load("js/equipment-items-panel.js");
  runtime.load("js/equipment-body-regions-panel.js");

  const region = {
    key: "IMPLANT_PORT",
    label: "IMPLANT PORT",
    visibleLayers: [],
    mounts: [{ key: "IMPLANT_PORT", label: "IMPLANT PORT", occupant: null, blocked: false }],
    itemMounts: []
  };
  const state = {
    citizenId: "citizen-a",
    selections: { selectedRegion: "IMPLANT_PORT" },
    bodyRegions: [region],
    bodyMountDefinitions: [{ key: "IMPLANT_PORT", label: "IMPLANT PORT", regionKey: "IMPLANT_PORT" }],
    inventory: { gridItems: [] },
    itemById: {}
  };

  const html = runtime.window.WS_APP.renderEquipmentSelectedRegionDetail(state);

  assert.match(html, /equipment-loadout-slot-tile__ghost[^>]*>PORT<\/span>/);
  assert.match(html, /equipment-slot-status-badge is-empty">EMPTY<\/span>/);
  assert.doesNotMatch(html, /<small>PORT<\/small>/);
});

test("Equipment is a single Cybergrid screen without workspace compatibility state", () => {
  const source = read("js/equipment.js");
  const store = read("js/equipment-store.js");
  const actions = read("js/equipment-actions.js");

  assert.match(source, /data-equipment-screen="CYBERGRID"/);
  assert.doesNotMatch(source, /WORKSPACE_VIEWS|normalizeWorkspaceView|getActiveWorkspaceView/);
  assert.doesNotMatch(source, /renderEquipmentWorkspaceTabs|syncEquipmentWorkspaceTabs|renderEquipmentScreenPlaceholder|setEquipmentScreenVisibility/);
  assert.doesNotMatch(source, /activeWorkspaceView/);
  assert.doesNotMatch(store, /equipmentWorkspaceViewByCitizen|getEquipmentWorkspaceView|setEquipmentWorkspaceView|activeWorkspaceView/);
  assert.doesNotMatch(actions, /data-equipment-workspace-view|setEquipmentWorkspaceView/);
  assert.doesNotMatch(source, /system-segment-tile system-segment-tile--card equipment-workspace-tab/);
  assert.doesNotMatch(source, /role="tab" aria-selected=/);
});


test("equipment shell header is static, Citizen-neutral and Cybergrid-specific", () => {
  const source = read("js/equipment.js");

  assert.match(source, /data-equipment-shell-kicker>EQUIPMENT \/ CYBERGRID/);
  assert.match(source, /data-equipment-shell-title>Equipment Workspace/);
  assert.match(source, /Manage carried items, visible grids and mount storage/);
  assert.doesNotMatch(source, /EQUIPMENT_DESIGN_VERSION/);
  assert.doesNotMatch(source, /state\?\.citizenName \|\| "Equipment"/);
  assert.doesNotMatch(source, /Installed systems and service/);
});
