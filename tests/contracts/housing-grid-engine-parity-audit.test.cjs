"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

function extractBlock(source, startPattern, endPattern) {
  const start = source.search(startPattern);
  assert.notEqual(start, -1, `Missing block start: ${startPattern}`);
  const tail = source.slice(start);
  const end = tail.search(endPattern);
  assert.notEqual(end, -1, `Missing block end: ${endPattern}`);
  return tail.slice(0, end);
}

test("Housing grid uses shared pointer-session parity primitives", () => {
  const pointer = read("js/grid-pointer-session.js");
  const housingStorage = read("js/housing-storage-runtime.js");
  const adapter = read("js/housing-grid-engine-adapter.js");

  assert.match(pointer, /startGridPointerSession/);
  assert.match(pointer, /requestAnimationFrame\(/);
  assert.match(pointer, /document\.elementFromPoint\(/);
  assert.match(pointer, /target\?\.closest\?\.\(selector\)/);
  assert.match(pointer, /supportsDragPreview:\s*true/);
  assert.match(pointer, /supportsGrabOffsetContexts:\s*true/);
  assert.match(pointer, /supportsValidationCache:\s*true/);
  assert.match(pointer, /supportsTargetedCellClassUpdates:\s*true/);

  assert.match(housingStorage, /startGridPointerSession\(event,\s*\{/);
  assert.match(housingStorage, /previewClass:\s*"housing-grid-drag-preview"/);
  assert.match(housingStorage, /createHousingGridDragContext\(/);
  assert.match(housingStorage, /evaluateHousingGridDrop\(/);
  assert.match(housingStorage, /commitHousingGridDrop\(/);

  assert.match(adapter, /sessionOccupancyModelReady/);
  assert.match(adapter, /fastHousingCommitReady/);
  assert.match(adapter, /noOpCommitReady/);
});

test("Housing grid completion avoids full rerender and patches local DOM", () => {
  const housingStorage = read("js/housing-storage-runtime.js");
  const completion = housingStorage.match(/onComplete:\s*\(result, session\)\s*=>\s*\{([\s\S]*?)\n\s*\},\n\s*onAbort:/);
  assert.ok(completion, "Housing pointer completion block should exist");

  assert.doesNotMatch(completion[1], /renderHousingModule\(/);
  assert.match(completion[1], /applyHousingGridPlacementToDom\(session, result\)/);
  assert.match(completion[1], /syncHousingFeedbackDom\(/);
  assert.match(completion[1], /HOUSING_PLACEMENT_UNCHANGED/);

  const dragBlock = extractBlock(
    housingStorage,
    /function beginHousingGridDrag\(/,
    /\n\s*return \{\n\s*resolveHousingStorageProfile/
  );
  assert.doesNotMatch(dragBlock, /document\.addEventListener\("pointermove"/);
  assert.doesNotMatch(dragBlock, /document\.addEventListener\("pointerup"/);
  assert.doesNotMatch(dragBlock, /document\.addEventListener\("pointercancel"/);
});

test("Housing same-unit commit uses ItemInstance fast path and no-op drop", () => {
  const itemStore = read("js/item-instance-store.js");
  const equipmentHousing = read("js/equipment-housing-grid.js");
  const adapter = read("js/housing-grid-engine-adapter.js");

  assert.match(itemStore, /function commitCitizenHousingGridPlacement\(/);
  assert.match(itemStore, /scheduleItemStorePersistence\(\)/);
  assert.match(itemStore, /deferredPersistence:\s*options\.deferPersistence !== false/);
  assert.match(itemStore, /noChange:\s*true/);

  assert.match(equipmentHousing, /sameHousingStorage/);
  assert.match(equipmentHousing, /commitCitizenHousingGridPlacement\(/);
  assert.match(equipmentHousing, /HOUSING_PLACEMENT_UNCHANGED/);
  assert.match(equipmentHousing, /MOVED_TO_HOUSING/);

  assert.match(adapter, /HOUSING_PLACEMENT_UNCHANGED/);
  assert.match(adapter, /skipModuleRefresh:\s*true/);
  assert.match(adapter, /skipProfileRefresh:\s*true/);
  assert.match(adapter, /deferPersistence:\s*true/);
});

test("Housing storage UI exposes sort wording instead of legacy normalize wording", () => {
  const housingStorage = read("js/housing-storage-runtime.js");
  const housingCss = read("css/housing.css");

  assert.doesNotMatch(housingStorage, /NORMALIZE STORAGE/);
  assert.match(housingStorage, />SORT</);
  assert.match(housingStorage, /Housing storage sorted\./);
  assert.match(housingStorage, /Storage sort failed\./);
  assert.match(housingCss, /housing-grid-drag-preview/);
});
