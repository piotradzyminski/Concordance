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

test("Equipment workspace tabs use Terminal panel-card proportions", () => {
  const css = read("css/equipment.css");
  const sharedTabs = read("css/system-tabs.css");
  const source = read("js/equipment.js");

  assert.match(source, /system-segment-tile system-segment-tile--card equipment-workspace-tab/);
  assert.match(sharedTabs, /--system-tab-card-height:\s*106px/);
  assert.match(sharedTabs, /\.system-segment-tile--card\s*\{[\s\S]*?min-height:\s*var\(--system-tab-card-height\);[\s\S]*?align-items:\s*stretch;/);
  assert.doesNotMatch(css, /(?:^|\n)\.equipment-workspace-tab\s*\{/);
  assert.doesNotMatch(css, /\.equipment-workspace-tab \.system-segment-tile__title/);
  assert.match(source, /class="system-segment-tabs equipment-workspace-tabs"/);
  assert.match(source, /role="tab" aria-selected=/);
});


test("equipment shell header omits citizen name and patch version in favor of static workspace copy", () => {
  const source = read("js/equipment.js");

  assert.match(source, /data-equipment-shell-kicker>EQUIPMENT \/ \$\{escapeHtml\(activeView\)\}/);
  assert.doesNotMatch(source, /EQUIPMENT_DESIGN_VERSION/);
  assert.doesNotMatch(source, /state\?\.citizenName \|\| "Equipment"/);
  assert.match(source, /data-equipment-shell-title>\$\{escapeHtml\(headings\[activeView\] \|\| "Equipment Workspace"\)\}/);
  assert.match(source, /Body, grids and containers/);
  assert.match(source, /Installed systems and service/);
});
