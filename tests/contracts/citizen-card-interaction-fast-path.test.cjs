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

test("Citizen Card mode switching has no artificial timer or full-card rerender", () => {
  const shell = read("js/citizen-card-shell.js");
  const modeActions = extractBlock(
    shell,
    "function bindCitizenCardModeActions",
    "function bindCitizenCardQuickLinkActions"
  );

  assert.doesNotMatch(shell, /citizenCardModeEntering|is-card-mode-transitioning|\b180\b|\b260\b/);
  assert.match(shell, /function updateCitizenCardMountedMode/);
  assert.match(shell, /layout\.innerHTML\s*=\s*renderCitizenCardLayoutContent/);
  assert.match(modeActions, /updateCitizenCardMountedMode/);
  assert.doesNotMatch(modeActions, /renderCitizenCardModule/);
});

test("Citizen Card Equipment selection refreshes only the mounted Equipment section", () => {
  const shell = read("js/citizen-card-shell.js");
  const equipmentActions = extractBlock(
    shell,
    "function bindCitizenCardEquipmentActions",
    "function bindCitizenCardLayoutActions"
  );

  assert.match(shell, /function updateCitizenCardEquipmentSection/);
  assert.match(shell, /body\.innerHTML\s*=\s*renderCitizenEquipmentSummaryBlock/);
  assert.match(equipmentActions, /updateCitizenCardEquipmentSection/g);
  assert.doesNotMatch(equipmentActions, /renderCitizenCardModule/);
});

test("Citizen Card local refresh captures and restores interaction state", () => {
  const shell = read("js/citizen-card-shell.js");
  const capture = extractBlock(
    shell,
    "function captureCitizenCardUiState",
    "function restoreCitizenCardUiState"
  );
  const restore = extractBlock(
    shell,
    "function restoreCitizenCardUiState",
    "function updateCitizenCardMountedMode"
  );

  for (const field of ["detailOpenState", "financialTabId", "focusSelector", "moduleScrollTop", "cardScrollTop", "windowScrollY"]) {
    assert.match(capture, new RegExp(field));
  }
  assert.match(capture, /citizenCardSectionStateByCitizen/);
  assert.match(restore, /window\.scrollTo/);
  assert.match(restore, /preventScroll/);
  assert.match(restore, /requestAnimationFrame/);
});

test("Citizen Card interaction fast path is loaded through the versioned shell bundle", () => {
  const modules = read("js/modules.js");
  const index = read("index.html");

  assert.match(modules, /citizen-card-shell\.js\?v=3/);
  assert.match(index, /js\/modules\.js\?v=318/);
});
