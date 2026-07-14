"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

function extractBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `Missing block start: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, `Missing block end: ${endMarker}`);
  return source.slice(start, end);
}

test("Cyberware is registered as a standalone player module", () => {
  const data = read("data/modules.js");
  const modules = read("js/modules.js");
  const cyberwareBundle = extractBlock(modules, "  cyberware: {", "  market: {");

  assert.match(data, /id: "cyberware"/);
  assert.match(data, /title: "Cyberware"/);
  assert.match(modules, /\["terminal-hub", "service", "equipment", "cyberware", "market", "housing"\]/);
  assert.match(cyberwareBundle, /CYBERWARE_UI_RUNTIME_SCRIPTS/);
  assert.match(cyberwareBundle, /js\/equipment-render-utils\.js\?v=1/);
  assert.match(cyberwareBundle, /js\/equipment-items-panel\.js\?v=30/);
  assert.match(cyberwareBundle, /js\/cyberware-index\.js\?v=2/);
  assert.match(cyberwareBundle, /js\/cyberware-planner\.js\?v=8/);
  assert.match(cyberwareBundle, /js\/cyberware-workspace\.js\?v=1/);
  assert.match(cyberwareBundle, /js\/cyberware-module\.js\?v=1/);
  assert.match(modules, /moduleId === "cyberware"/);
  assert.match(modules, /renderCyberwareModule/);
});

test("Equipment is Cybergrid-only and loads only the Cyberware navigation bridge", () => {
  const modules = read("js/modules.js");
  const equipmentBundle = extractBlock(modules, "  equipment: {", "  cyberware: {");
  const equipment = read("js/equipment.js");
  const actions = read("js/equipment-actions.js");
  const store = read("js/equipment-store.js");
  const bridge = read("js/equipment-cyberware-link.js");

  assert.doesNotMatch(equipmentBundle, /CYBERWARE_UI_RUNTIME_SCRIPTS/);
  assert.doesNotMatch(equipmentBundle, /js\/cyberware-index\.js/);
  assert.doesNotMatch(equipmentBundle, /js\/cyberware-planner\.js/);
  assert.doesNotMatch(equipmentBundle, /js\/cyberware-workspace\.js/);
  assert.match(equipmentBundle, /js\/equipment-cyberware-link\.js\?v=20/);
  assert.match(equipment, /WORKSPACE_VIEWS = \["CYBERGRID"\]/);
  assert.doesNotMatch(equipment, /renderCyberwareScreen/);
  assert.match(store, /return "CYBERGRID"/);
  assert.doesNotMatch(actions, /data-cyberware-ui-view|data-cyberware-maintenance-action|data-cyberware-index-toggle/);
  assert.match(bridge, /openModule\("cyberware"/);
  assert.match(bridge, /openCyberwareFromEquipment/);
});

test("Cyberware owns its shell, workspace state and delegated UI actions", () => {
  const module = read("js/cyberware-module.js");
  const workspace = read("js/cyberware-workspace.js");
  const planner = read("js/cyberware-planner.js");
  const index = read("js/cyberware-index.js");

  assert.match(module, /data-cyberware-module-shell/);
  assert.match(module, /data-cyberware-citizen-id/);
  assert.match(module, /renderCyberwareWorkspace/);
  assert.match(module, /openCyberwareInstance/);
  assert.match(module, /openCyberwarePlanner/);
  assert.match(module, /openCyberwareMaintenance/);
  assert.match(module, /openCyberwareIndex/);
  assert.match(workspace, /data-cyberware-workspace/);
  assert.match(workspace, /\[data-cyberware-module-shell\]/);
  assert.match(planner, /\[data-cyberware-module-shell\], \[data-equipment-module-shell\]/);
  assert.match(index, /\[data-cyberware-module-shell\]/);
});

test("Module extraction does not create a second physical or Cyberware state store", () => {
  const module = read("js/cyberware-module.js");
  const workspace = read("js/cyberware-workspace.js");
  const bridge = read("js/equipment-cyberware-link.js");
  const combined = `${module}\n${workspace}\n${bridge}`;

  assert.doesNotMatch(combined, /citizen\.cyberwareList\s*=/);
  assert.doesNotMatch(combined, /itemInstances\s*=\s*\[/);
  assert.doesNotMatch(combined, /createItemInstanceStore/);
  assert.doesNotMatch(combined, /directCommitCyberware/);
  assert.match(workspace, /getInstalledCyberwareInstanceViews|getCyberwareWorkspaceRuntime/);
});
