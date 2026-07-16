"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

function extractBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `Missing block start: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, `Missing block end: ${endMarker}`);
  return source.slice(start, end);
}

test("Housing and Market are separate lazy module bundles", () => {
  const modules = read("js/modules.js");
  const market = extractBlock(modules, "  market: {", "  housing: {");
  const housing = extractBlock(modules, "  housing: {", "  database: {");

  const storageIndex = housing.indexOf('"js/housing-storage-runtime.js?v=4"');
  const householdIndex = housing.indexOf('"js/housing-household-runtime.js?v=4"');
  const housingIndex = housing.indexOf('"js/housing.js?v=54"');
  assert.ok(storageIndex >= 0);
  assert.ok(householdIndex > storageIndex);
  assert.ok(housingIndex > householdIndex);
  assert.doesNotMatch(housing, /CYBERWARE_MARKET_PROJECTION_SCRIPTS/);
  assert.doesNotMatch(housing, /market-workspace-runtime\.js/);
  assert.doesNotMatch(housing, /market\.js/);

  assert.match(market, /CYBERWARE_MARKET_PROJECTION_SCRIPTS/);
  assert.match(market, /js\/market-workspace-runtime\.js\?v=6/);
  assert.match(market, /js\/market\.js\?v=5/);
});

test("Housing Storage, Housing shell and global Market own separate boundaries", () => {
  const storage = read("js/housing-storage-runtime.js");
  const runtime = read("js/market-workspace-runtime.js");
  const market = read("js/market.js");
  const housing = read("js/housing.js");

  assert.match(storage, /createHousingStorageRuntime/);
  assert.match(storage, /function renderHousingStorageTab\(/);
  assert.doesNotMatch(storage, /function renderMarketWorkspaceTab\(/);

  assert.match(runtime, /createMarketWorkspaceRuntime/);
  assert.match(runtime, /function renderMarketWorkspaceTab\(/);
  assert.doesNotMatch(runtime, /function processDueMarketWorkspaceShipmentsForCitizen\(/);
  assert.doesNotMatch(runtime, /citizen\.marketOrders|citizen\.shipments/);
  assert.match(runtime, /function addMarketWorkspaceOfferToCart\(/);
  assert.doesNotMatch(runtime, /function renderHousingStorageTab\(/);

  assert.match(market, /function renderMarketModule\(/);
  assert.match(market, /createMarketWorkspaceRuntime/);
  assert.match(market, /data-market-module/);
  assert.match(market, /handleMarketWorkspaceClick/);

  assert.match(housing, /createHousingStorageRuntime\?\.\(/);
  assert.match(housing, /function renderHousingDeliveriesTab\(/);
  assert.doesNotMatch(housing, /ensureMarketWorkspaceRuntime/);
  assert.doesNotMatch(housing, /housing-market-workspace/);
  assert.doesNotMatch(housing, /function renderMarketWorkspaceTab\(/);
  assert.doesNotMatch(housing, /function renderHousingStorageTab\(/);
});

test("Housing Storage runtime exposes deterministic storage helpers without creating a store", () => {
  const source = read("js/housing-storage-runtime.js");
  const context = {
    window: { WS_APP: {} },
    console,
    Set,
    Map,
    Date,
    Math,
    Number,
    String,
    Array,
    Object
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "js/housing-storage-runtime.js" });

  const runtime = context.window.WS_APP.createHousingStorageRuntime({
    HOUSING_STORAGE_WIDTH: 4,
    HOUSING_STORAGE_LOCATION: "HOUSING_STORAGE",
    DEFAULT_STORAGE_UNIT_ID: "housing-storage-main",
    HOUSING_STORAGE_KINDS: ["ALL", "MISC"],
    HOUSING_STORAGE_STATUSES: ["ALL", "AVAILABLE"],
    HOUSING_STORAGE_SORTS: ["CATEGORY", "NAME"],
    escapeHtml: (value) => String(value ?? ""),
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Math.round(Number(value) || min))),
    renderHousingModule: () => {},
    getHousingFeedback: () => null,
    setHousingFeedback: () => {},
    getCitizenHousingRecords: () => [],
    getCitizenMarketOrders: () => [],
    getHousingActiveRecord: () => null,
    getHousingActiveRecordId: () => "",
    getHousingRecordShipmentStats: () => ({}),
    getHousingRecordSubscription: () => null,
    getHousingShipmentState: () => "IN_TRANSIT",
    getHousingShipmentUnitContext: () => ({}),
    formatHousingShipmentState: (value) => value,
    formatIsoLabel: (value) => value,
    formatCredits: (value) => String(value),
    parseCredits: (value) => Number(value) || 0,
    renderHousingRecord: () => "",
    renderHousingStorageShipmentPanel: () => ""
  });

  assert.equal(runtime.getHousingItemStorageCost({ width: 2, height: 3 }), 6);
  assert.equal(runtime.getDefaultHousingStorageFilters().kind, "ALL");
  assert.equal(runtime.renderMarketWorkspaceTab, undefined);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});
