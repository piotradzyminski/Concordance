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

test("Housing base bundle loads Storage before the shell and keeps Market runtime in a separate workspace bundle", () => {
  const modules = read("js/modules.js");
  const housingBundle = modules.match(/housing:\s*\{[\s\S]*?scripts:\s*\[([\s\S]*?)\]\s*\}/);
  assert.ok(housingBundle, "Housing bundle should exist");

  const scripts = housingBundle[1];
  const storageIndex = scripts.indexOf('"js/housing-storage-runtime.js?v=3"');
  const householdIndex = scripts.indexOf('"js/housing-household-runtime.js?v=1"');
  const housingIndex = scripts.indexOf('"js/housing.js?v=48"');
  assert.ok(storageIndex >= 0, "Housing storage runtime should be registered");
  assert.ok(householdIndex > storageIndex, "Household furnishing runtime should load after Housing storage runtime");
  assert.ok(housingIndex > householdIndex, "Housing shell should load after both Housing runtimes");
  assert.doesNotMatch(scripts, /CYBERWARE_MARKET_PROJECTION_SCRIPTS/);
  assert.doesNotMatch(scripts, /housing-market-runtime\.js/);

  const marketBundle = modules.match(/"housing-market-workspace":\s*\{[\s\S]*?scripts:\s*\[([\s\S]*?)\]\s*\}/);
  assert.ok(marketBundle, "Housing Market workspace bundle should exist");
  assert.match(marketBundle[1], /CYBERWARE_MARKET_PROJECTION_SCRIPTS/);
  assert.match(marketBundle[1], /js\/housing-market-runtime\.js\?v=3/);
});

test("Housing Storage and Market own separate projection, rendering and action boundaries", () => {
  const storage = read("js/housing-storage-runtime.js");
  const market = read("js/housing-market-runtime.js");
  const housing = read("js/housing.js");

  assert.match(storage, /createHousingStorageRuntime/);
  assert.match(storage, /function getHousingRecordStorageStats\(/);
  assert.match(storage, /function storeEquipmentItemInHousing\(/);
  assert.match(storage, /function renderHousingUnitTab\(/);
  assert.match(storage, /function renderHousingStorageTab\(/);
  assert.match(storage, /function beginHousingGridDrag\(/);

  assert.doesNotMatch(storage, /function renderHousingMarketTab\(/);
  assert.doesNotMatch(storage, /function processDueHousingMarketShipmentsForCitizen\(/);
  assert.doesNotMatch(storage, /function addHousingMarketOfferToCart\(/);

  assert.match(market, /createHousingMarketRuntime/);
  assert.match(market, /function renderHousingMarketTab\(/);
  assert.match(market, /function processDueHousingMarketShipmentsForCitizen\(/);
  assert.match(market, /function addHousingMarketOfferToCart\(/);
  assert.match(market, /function handleHousingMarketClick\(/);
  assert.doesNotMatch(market, /function renderHousingStorageTab\(/);

  assert.match(housing, /createHousingStorageRuntime\?\.\(/);
  assert.match(housing, /ensureHousingMarketRuntime/);
  assert.match(housing, /loadModuleBundle\?\.\("housing-market-workspace"/);
  assert.doesNotMatch(housing, /function renderHousingMarketTab\(/);
  assert.doesNotMatch(housing, /function processDueHousingMarketShipmentsForCitizen\(/);
  assert.doesNotMatch(housing, /function renderHousingStorageTab\(/);
  assert.doesNotMatch(housing, /function storeEquipmentItemInHousing\(/);
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
  assert.equal(runtime.renderHousingMarketTab, undefined);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});
