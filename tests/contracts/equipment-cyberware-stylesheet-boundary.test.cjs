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

test("Equipment and Cyberware load independent domain stylesheets", () => {
  const modules = read("js/modules.js");
  const equipment = extractBlock(modules, "  equipment: {", "  cyberware: {");
  const cyberware = extractBlock(modules, "  cyberware: {", "  market: {");

  assert.match(equipment, /css\/equipment\.css\?v=132/);
  assert.doesNotMatch(equipment, /css\/cyberware\.css/);
  assert.match(cyberware, /css\/cyberware\.css\?v=3/);
  assert.match(cyberware, /css\/cyberware-anatomy-bodymap\.css\?v=2/);
  assert.doesNotMatch(cyberware, /css\/equipment\.css/);
});

test("Equipment stylesheet contains no Cyberware domain selectors", () => {
  const equipmentCss = read("css/equipment.css");

  assert.doesNotMatch(equipmentCss, /cyberware/i);
  assert.doesNotMatch(equipmentCss, /@import\s+[^;]*equipment/i);
});

test("Cyberware stylesheet owns domain selectors and reused neutral primitives", () => {
  const cyberwareCss = read("css/cyberware.css");

  [
    ".cyberware-ui-workspace",
    ".cyberware-core-stack",
    ".cyberware-diagnostics",
    ".cyberware-maintenance",
    ".cyberware-index-drawer",
    ".cyberware-planner",
    ".equipment-cyberware-workspace"
  ].forEach((selector) => assert.match(cyberwareCss, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));

  [
    ".equipment-shell-panel",
    ".equipment-shell-panel__head",
    ".equipment-panel-badge",
    ".equipment-shell-copy",
    ".equipment-item-index-overlay",
    ".equipment-item-index-row",
    ".equipment-select-control",
    ".equipment-bodymap-region__point"
  ].forEach((selector) => assert.match(cyberwareCss, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));

  assert.doesNotMatch(cyberwareCss, /@import\s+[^;]*equipment\.css/i);
});
