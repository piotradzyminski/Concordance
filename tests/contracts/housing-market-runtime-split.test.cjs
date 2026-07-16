"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test("Market runtime remains a factory-owned workspace with deterministic local UI state", () => {
  const source = read("js/market-workspace-runtime.js");
  const context = {
    window: { WS_APP: {} },
    document: { querySelector: () => null },
    console,
    Set,
    Map,
    Date,
    Math,
    Number,
    String,
    Array,
    Object,
    Promise
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "js/market-workspace-runtime.js" });

  const noop = () => {};
  const runtime = context.window.WS_APP.createMarketWorkspaceRuntime({
    DEFAULT_STORAGE_UNIT_ID: "housing-storage-main",
    MARKET_DEFAULT_SHIPPING_DAYS: 1,
    MARKET_DEPARTMENTS: ["ALL", "HOUSEHOLD", "CYBERWARE", "GENERAL"],
    MARKET_MODES: ["CATALOG", "SECONDARY", "ORDERS"],
    MARKET_ORDER_CLOSED_STATUSES: new Set(["COMPLETED", "REFUNDED", "FAILED", "CANCELLED"]),
    MARKET_ORDER_VIEWS: ["ORDERED", "DELIVERED"],
    MARKET_PAGE_SIZE: 6,
    MARKET_SORTS: ["CATEGORY", "NAME"],
    MARKET_STATUSES: ["ALL", "BUYABLE"],
    MARKET_VENDOR_DEFAULTS: { DEFAULT: { vendorId: "vendor-test", organizationLocationId: "orgloc-test" } },
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Math.round(Number(value) || min))),
    escapeHtml: (value) => String(value ?? ""),
    formatCredits: (value) => `${Number(value) || 0} ₡`,
    formatIsoLabel: (value) => String(value || ""),
    getCitizenHousingRecords: () => [],
    getEquipmentFootprintSize: () => ({ width: 1, height: 1 }),
    getHousingActiveStorageTarget: () => ({ activeRecord: null, unit: null }),
    isIsoDate: () => true,
    parseCredits: (value) => Number(value) || 0,
    renderMarketFeedback: () => "",
    renderMarketMetric: () => "",
    renderMarketModule: noop,
    setMarketWorkspaceTab: noop,
    setMarketFeedback: noop,
    rootSelector: "[data-market-module]"
  });

  const filters = runtime.normalizeMarketWorkspaceFilters({ type: "ALL", category: "MEDICAL", sort: "INVALID", page: 9 });
  assert.equal(filters.type, "ALL");
  assert.equal(filters.category, "ALL");
  assert.equal(filters.sort, "CATEGORY");
  assert.equal(filters.page, 9);

  const pagination = runtime.getMarketWorkspacePagination(14, 3);
  assert.equal(pagination.page, 3);
  assert.equal(pagination.totalPages, 3);
  assert.equal(pagination.startIndex, 12);
  assert.equal(pagination.endIndex, 14);
  assert.equal(typeof runtime.renderMarketWorkspaceTab, "function");
  assert.equal(typeof runtime.handleMarketWorkspaceClick, "function");
  assert.equal(runtime.renderHousingStorageTab, undefined);
  assert.match(source, /rootSelector = "\[data-market-module\]"/);
  assert.match(source, /document\.querySelector\(rootSelector\)/);
});

test("Global Market shell owns storefront rendering and Housing owns only delivery projection", () => {
  const market = read("js/market.js");
  const housing = read("js/housing.js");

  assert.match(market, /function renderMarketModule\(/);
  assert.match(market, /createMarketWorkspaceRuntime/);
  assert.match(market, /runtime\.renderMarketWorkspaceTab\(citizen\)/);
  assert.match(market, /marketRuntime\.handleMarketWorkspaceClick\?\./);
  assert.match(market, /data-market-module/);

  assert.match(housing, /function renderHousingDeliveriesTab\(/);
  assert.match(housing, /data-housing-open-market/);
  assert.match(housing, /HOUSING_PRIMARY_TABS = \["OVERVIEW", "HOUSEHOLD", "STORAGE", "DELIVERIES"\]/);
  assert.doesNotMatch(housing, /housing-market-workspace/);
  assert.doesNotMatch(housing, /renderMarketWorkspaceWorkspace/);
  assert.doesNotMatch(housing, /delegateMarketWorkspaceEvent/);
  assert.doesNotMatch(housing, /function renderMarketWorkspaceTab\(/);
  assert.doesNotMatch(housing, /function addMarketWorkspaceOfferToCart\(/);
});
