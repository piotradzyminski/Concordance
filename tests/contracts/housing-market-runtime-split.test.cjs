"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test("Housing Market runtime is a factory-owned workspace with deterministic local UI state", () => {
  const source = read("js/housing-market-runtime.js");
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
  vm.runInContext(source, context, { filename: "js/housing-market-runtime.js" });

  const noop = () => {};
  const runtime = context.window.WS_APP.createHousingMarketRuntime({
    DEFAULT_STORAGE_UNIT_ID: "housing-storage-main",
    HOUSING_MARKET_DEFAULT_SHIPPING_DAYS: 1,
    HOUSING_MARKET_DELIVERABLE_SHIPMENT_STATUSES: new Set(["PENDING", "IN_TRANSIT"]),
    HOUSING_MARKET_DEPARTMENTS: ["ALL", "EQUIPMENT", "CYBERWARE", "MEDICAL", "FOOD", "HOUSEHOLD"],
    HOUSING_MARKET_MODES: ["CATALOG", "ORDERS", "DELIVERED"],
    HOUSING_MARKET_ORDER_CLOSED_STATUSES: new Set(["COMPLETED", "REFUNDED", "FAILED", "CANCELLED"]),
    HOUSING_MARKET_ORDER_VIEWS: ["ACTIVE", "HISTORY"],
    HOUSING_MARKET_PAGE_SIZE: 6,
    HOUSING_MARKET_PRODUCT_VISUAL_FALLBACKS: { DEFAULT: "assets/market/fallback/product.svg" },
    HOUSING_MARKET_SORTS: ["CATEGORY", "NAME"],
    HOUSING_MARKET_STATUSES: ["ALL", "BUYABLE"],
    HOUSING_MARKET_VENDOR_DEFAULTS: { DEFAULT: { vendorId: "vendor-test", organizationLocationId: "orgloc-test" } },
    HOUSING_SHIPMENT_ACTIVE_STATUSES: new Set(["PENDING", "IN_TRANSIT", "HELD"]),
    addDaysIso: (iso) => iso,
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Math.round(Number(value) || min))),
    compareIsoDates: (a, b) => String(a).localeCompare(String(b)),
    escapeHtml: (value) => String(value ?? ""),
    formatCredits: (value) => `${Number(value) || 0} ₡`,
    formatIsoLabel: (value) => String(value || ""),
    getCampaignDateIso: () => "2109-02-13",
    getCitizenEquipmentItems: () => [],
    getCitizenHousingRecords: () => [],
    getCitizenMarketOrders: () => [],
    getCitizenShipments: () => [],
    getEquipmentFootprintSize: () => ({ width: 1, height: 1 }),
    getHousingActiveStorageTarget: () => ({ activeRecord: null, unit: null }),
    getHousingShipmentState: () => "IN_TRANSIT",
    getHousingShipmentUnitContext: () => ({}),
    isIsoDate: () => true,
    normalizeMarketOrder: (value) => value,
    normalizeShipment: (value) => value,
    parseCredits: (value) => Number(value) || 0,
    renderHousingFeedback: () => "",
    renderHousingMetric: () => "",
    renderHousingModule: noop,
    renderHousingShipmentRow: () => "",
    setHousingActiveTab: noop,
    setHousingFeedback: noop
  });

  const filters = runtime.normalizeHousingMarketFilters({ type: "ALL", category: "MEDICAL", sort: "INVALID", page: 9 });
  assert.equal(filters.type, "ALL");
  assert.equal(filters.category, "ALL");
  assert.equal(filters.sort, "CATEGORY");
  assert.equal(filters.page, 9);

  const pagination = runtime.getHousingMarketPagination(14, 3);
  assert.equal(pagination.page, 3);
  assert.equal(pagination.totalPages, 3);
  assert.equal(pagination.startIndex, 12);
  assert.equal(pagination.endIndex, 14);
  assert.equal(typeof runtime.renderHousingMarketTab, "function");
  assert.equal(typeof runtime.handleHousingMarketClick, "function");
  assert.equal(runtime.renderHousingStorageTab, undefined);
});

test("Housing shell delegates Market rendering and actions without owning Market implementation", () => {
  const shell = read("js/housing.js");
  assert.match(shell, /loadModuleBundle\?\.\("housing-market-workspace"/);
  assert.match(shell, /renderHousingMarketWorkspace/);
  assert.match(shell, /delegateHousingMarketEvent/);
  assert.doesNotMatch(shell, /function renderHousingMarketTab\(/);
  assert.doesNotMatch(shell, /function addHousingMarketOfferToCart\(/);
  assert.doesNotMatch(shell, /function renderCanonicalMarketOrderDetails\(/);
});
