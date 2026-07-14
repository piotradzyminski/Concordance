"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

test("Housing same-unit placement uses the canonical ItemInstance fast path", () => {
  const itemStore = read("js/item-instance-store.js");
  const equipmentHousing = read("js/equipment-housing-grid.js");
  const adapter = read("js/housing-grid-engine-adapter.js");

  assert.match(itemStore, /function commitCitizenHousingGridPlacement\(/);
  assert.match(itemStore, /scheduleItemStorePersistence\(\)/);
  assert.match(equipmentHousing, /sameHousingStorage/);
  assert.match(equipmentHousing, /commitCitizenHousingGridPlacement/);
  assert.match(adapter, /HOUSING_PLACEMENT_UNCHANGED/);
  assert.match(adapter, /skipModuleRefresh:\s*true/);
});

test("Housing pointer session performs targeted hit-testing and no full rerender on drop completion", () => {
  const pointer = read("js/grid-pointer-session.js");
  const housingStorage = read("js/housing-storage-runtime.js");

  assert.match(pointer, /document\.elementFromPoint\(/);
  assert.match(pointer, /requestAnimationFrame\(/);
  assert.match(pointer, /supportsElementFromPointHitTesting/);

  const completion = housingStorage.match(/onComplete:\s*\(result, session\)\s*=>\s*\{([\s\S]*?)\n\s*\},\n\s*onAbort:/);
  assert.ok(completion, "Housing pointer completion block should exist");
  assert.doesNotMatch(completion[1], /renderHousingModule\(/);
  assert.match(completion[1], /applyHousingGridPlacementToDom/);
});
