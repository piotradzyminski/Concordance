"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

function extractBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `Missing block start: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, `Missing block end: ${endMarker}`);
  return source.slice(start, end);
}

test("Citizen Card bundles separate detail renderers from the GM registry renderer", () => {
  const modules = read("js/modules.js");
  const rendererBundle = extractBlock(
    modules,
    "const CITIZEN_CARD_RENDERER_SCRIPTS = [",
    "const CYBERWARE_UI_RUNTIME_SCRIPTS = ["
  );
  const citizenCard = extractBlock(modules, '  "citizen-card": {', '  "citizen-cards": {');
  const citizenCards = extractBlock(modules, '  "citizen-cards": {', '  "citizen-files": {');
  const citizenFiles = extractBlock(modules, '  "citizen-files": {', '  "citizen-database": {');
  const citizenDatabase = extractBlock(modules, '  "citizen-database": {', '  "admin-control": {');

  assert.match(rendererBundle, /CITIZEN_CARD_PROJECTION_SCRIPTS/);
  assert.match(rendererBundle, /citizen-card-renderers\.js\?v=1/);
  assert.match(rendererBundle, /citizen-card-shell\.js\?v=3/);
  assert.doesNotMatch(rendererBundle, /citizen-cards-registry|citizen-records/);

  assert.match(citizenCard, /CITIZEN_CARD_RENDERER_SCRIPTS/);
  assert.match(citizenCard, /citizen-records\.js\?v=39/);
  assert.doesNotMatch(citizenCard, /citizen-cards-registry/);

  assert.match(citizenCards, /CITIZEN_CARD_RENDERER_SCRIPTS/);
  assert.match(citizenCards, /citizen-cards-registry\.js\?v=1/);
  assert.match(citizenCards, /citizen-records\.js\?v=39/);
  assert.ok(citizenCards.indexOf("citizen-cards-registry.js") < citizenCards.indexOf("citizen-records.js"));

  for (const block of [citizenFiles, citizenDatabase]) {
    assert.match(block, /CITIZEN_CARD_RENDERER_SCRIPTS/);
    assert.match(block, /citizen-records\.js\?v=39/);
    assert.doesNotMatch(block, /citizen-cards-registry/);
  }
});

test("Citizen Card split files keep renderer, controller and registry ownership separate", () => {
  const renderers = read("js/citizen-card-renderers.js");
  const shell = read("js/citizen-card-shell.js");
  const registry = read("js/citizen-cards-registry.js");
  const facade = read("js/citizen-records.js");

  assert.match(renderers, /function renderCitizenCyberwareCards/);
  assert.match(renderers, /function renderCitizenCardFinancialSummary/);
  assert.match(renderers, /function renderSkills/);
  assert.doesNotMatch(renderers, /addEventListener|confirmAction|currentModuleId/);
  assert.doesNotMatch(renderers, /function renderCitizenCardModule|function renderCitizenCardsModule/);

  assert.match(shell, /function renderCitizenCardModule/);
  assert.match(shell, /function bindCitizenCardPolishActions/);
  assert.match(shell, /registryUI\.confirmAction/);
  assert.doesNotMatch(shell, /function renderCitizenCardsListCard|function bindCitizenCardFilters/);

  assert.match(registry, /function renderCitizenCardsModule/);
  assert.match(registry, /function renderCitizenCardsListCard/);
  assert.match(registry, /function bindCitizenCardFilters/);
  assert.match(registry, /id="citizen-quick-npc-button"/);
  assert.doesNotMatch(registry, /function renderCitizenCyberwareCards|function renderCitizenCardFinancialSummary/);

  assert.ok(Buffer.byteLength(facade, "utf8") < 2048);
  assert.match(facade, /registerCitizenRecordEntrypoints/);
  assert.match(facade, /rendererSplit:\s*true/);
  assert.doesNotMatch(facade, /innerHTML|addEventListener|confirmAction|renderDataRow/);
});

test("Citizen Records compatibility entrypoints work with and without the registry bundle", () => {
  const detailRuntime = createBrowserRuntime();
  detailRuntime.loadMany([
    "js/citizen-card-renderers.js",
    "js/citizen-card-shell.js",
    "js/citizen-records.js"
  ]);

  assert.equal(typeof detailRuntime.window.WS_APP.renderCitizenCardModule, "function");
  assert.equal(typeof detailRuntime.window.WS_APP.renderCitizenCardsModule, "undefined");
  assert.equal(typeof detailRuntime.window.WS_APP.openCitizenCard, "undefined");
  assert.equal(detailRuntime.window.WS_APP.citizenRecords.rendererSplit, true);

  const registryRuntime = createBrowserRuntime();
  registryRuntime.loadMany([
    "js/citizen-card-renderers.js",
    "js/citizen-card-shell.js",
    "js/citizen-cards-registry.js",
    "js/citizen-records.js"
  ]);

  assert.equal(typeof registryRuntime.window.WS_APP.renderCitizenCardModule, "function");
  assert.equal(typeof registryRuntime.window.WS_APP.renderCitizenCardsModule, "function");
  assert.equal(typeof registryRuntime.window.WS_APP.openCitizenCard, "function");
});
