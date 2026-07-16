"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(PROJECT_ROOT, file), "utf8");

test("Cybergrid and Bodymap item clicks enter the selection fast path before any fallback refresh", () => {
  const source = read("js/equipment-actions.js");
  const containerBranch = source.match(/const containerItemButton[\s\S]*?\n\s*const containerButton/);
  const itemBranch = source.match(/const itemButton[\s\S]*?\n\s*const protectedSurface/);
  assert.ok(containerBranch, "container item selection branch must exist");
  assert.ok(itemBranch, "generic item selection branch must exist");
  for (const branch of [containerBranch[0], itemBranch[0]]) {
    assert.match(branch, /selectEquipmentItemFastPath/);
    assert.match(branch, /if \(!result\?\.ok\)/);
    assert.match(branch, /rerenderEquipmentShell/);
  }
});

test("selection fast path uses cached EquipmentState and patches only local UI projections", () => {
  const source = read("js/equipment.js");
  const fastPath = source.match(/function selectEquipmentItemFastPath[\s\S]*?\n\s*function clearEquipmentActiveSelectionFastPath/);
  const commit = source.match(/function commitEquipmentSelectionFastPath[\s\S]*?\n\s*function selectEquipmentItemFastPath/);
  assert.ok(fastPath, "selectEquipmentItemFastPath must exist");
  assert.ok(commit, "selection commit helper must exist");
  assert.match(fastPath[0], /getEquipmentRuntimeState/);
  assert.match(commit[0], /syncEquipmentCybergridSelection/);
  assert.match(commit[0], /syncEquipmentBodymapSelection/);
  assert.match(commit[0], /syncEquipmentCommandRailSelection/);
  assert.doesNotMatch(fastPath[0] + commit[0], /getEquipmentState\(|refreshEquipmentWorkspace\(|renderEquipmentBodymapPanel\(|renderEquipmentCybergridPanel\(|syncEquipmentWorkspaceShell\(/);
});

test("selection sync preserves Bodymap, Cybergrid and command rail panel identities", () => {
  const equipment = read("js/equipment.js");
  const bodymap = read("js/equipment-bodymap-panel.js");
  const containers = read("js/equipment-containers-panel.js");
  assert.match(equipment, /body\.innerHTML = renderEquipmentCommandRailBody/);
  assert.doesNotMatch(equipment.match(/function syncEquipmentCommandRailSelection[\s\S]*?\n\s*function syncEquipmentGenericItemSelection/)?.[0] || "", /replaceWith|replaceEquipmentPanel/);
  assert.match(bodymap, /function syncEquipmentBodymapSelection/);
  assert.match(bodymap, /\["is-related-item", relatedPrimary\]/);
  assert.match(bodymap, /data-equipment-bodymap-selection-summary/);
  assert.match(containers, /function syncEquipmentCybergridSelection/);
  assert.match(containers, /node\.classList\.toggle\("is-selected"/);
  assert.doesNotMatch(containers.match(/function syncEquipmentCybergridSelection[\s\S]*?\n\s*function renderEquipmentCybergridPanel/)?.[0] || "", /renderEquipmentCybergridPanel\(/);
});

test("reselecting the same item is an explicit no-op", () => {
  const source = read("js/equipment.js");
  const fastPath = source.match(/function selectEquipmentItemFastPath[\s\S]*?\n\s*function clearEquipmentActiveSelectionFastPath/);
  assert.ok(fastPath);
  assert.match(fastPath[0], /reason: "ALREADY_SELECTED"/);
  assert.match(fastPath[0], /currentItemId === normalizedItemId/);
});
