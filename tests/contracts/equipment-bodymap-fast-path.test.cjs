"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(PROJECT_ROOT, file), "utf8");

test("Bodymap Front/Back action uses the local fast path without workspace refresh", () => {
  const source = read("js/equipment-actions.js");
  const branch = source.match(/const bodymapViewButton[\s\S]*?\n\s*}\n\n\s*const gridRotateButton/);
  assert.ok(branch, "bodymap action branch must exist");
  assert.match(branch[0], /switchEquipmentBodymapView/);
  assert.doesNotMatch(branch[0], /rerenderEquipmentShell|refreshEquipmentWorkspace|getEquipmentState|syncEquipmentWorkspaceShell/);
});

test("Bodymap mounts Front and Back once and switches hidden/inert state", () => {
  const source = read("js/equipment-bodymap-panel.js");
  assert.match(source, /\["front", "back"\]\.map\(\(view\) => renderBodymapViewPanel/);
  assert.match(source, /data-equipment-bodymap-view-panel/);
  assert.match(source, /frame\.hidden = !selected/);
  assert.match(source, /frame\.setAttribute\("inert", ""\)/);
  assert.match(source, /data-equipment-bodymap-image/);
  assert.match(source, /image\.decode\(\)/);
  assert.match(source, /loading="eager" decoding="async"/);
});

test("Equipment bodymap fast path updates cached selection and never reconstructs EquipmentState", () => {
  const source = read("js/equipment.js");
  const fastPath = source.match(/function switchEquipmentBodymapView[\s\S]*?\n\s*function getEquipmentModuleRoot/);
  assert.ok(fastPath, "switchEquipmentBodymapView must exist");
  assert.match(fastPath[0], /getEquipmentRuntimeState/);
  assert.match(fastPath[0], /selectedBodymapView: normalizedView/);
  assert.match(fastPath[0], /syncEquipmentBodymapPanelView/);
  assert.doesNotMatch(fastPath[0], /getEquipmentState\(|refreshEquipmentWorkspace\(|renderEquipmentBodymapPanel\(|syncEquipmentWorkspaceShell\(/);
});
