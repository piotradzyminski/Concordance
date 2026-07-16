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

test("Equipment contract cleanup removes retired workspace and bridge APIs", () => {
  const equipment = read("js/equipment.js");
  const store = read("js/equipment-store.js");
  const actions = read("js/equipment-actions.js");
  const cyberwareWorkspace = read("js/cyberware-workspace.js");
  const modules = read("js/modules.js");
  const equipmentBundle = extractBlock(modules, "  equipment: {", "  cyberware: {");

  const retired = [
    "renderEquipmentWorkspaceTabs",
    "syncEquipmentWorkspaceTabs",
    "renderEquipmentScreenPlaceholder",
    "setEquipmentScreenVisibility",
    "activeWorkspaceView",
    "equipmentWorkspaceViewByCitizen",
    "getEquipmentWorkspaceView",
    "setEquipmentWorkspaceView",
    "data-equipment-workspace-view",
    "data-equipment-cyberware-link",
    "openCyberwareFromEquipment",
    "openEquipmentWorkspace"
  ];
  const combined = [equipment, store, actions, cyberwareWorkspace, equipmentBundle].join("\n");
  retired.forEach((token) => assert.doesNotMatch(combined, new RegExp(token)));

  assert.equal(fs.existsSync(path.join(PROJECT_ROOT, "js/equipment-cyberware-link.js")), false);
  assert.match(read("DELETE_FILES.txt"), /^js\/equipment-cyberware-link\.js$/m);
  assert.equal((cyberwareWorkspace.match(/app\.openCyberwareWorkspace\s*=/g) || []).length, 1);
});

test("all lazy consumers use one Equipment Store cache-bust version", () => {
  const modules = read("js/modules.js");
  const versions = [...modules.matchAll(/js\/equipment-store\.js\?v=(\d+)/g)].map((match) => match[1]);
  assert.ok(versions.length >= 3);
  assert.deepEqual([...new Set(versions)], ["36"]);
});
