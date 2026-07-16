"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

function createRuntime() {
  const source = read("js/market-workspace-runtime.js");
  const context = {
    window: { WS_APP: {} },
    document: { querySelector: () => null, activeElement: null, body: null },
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
    setMarketFeedback: noop
  });
  return { context, runtime };
}

test("legacy Delivered mode migrates into Orders / Delivered", () => {
  const { context, runtime } = createRuntime();
  context.window.WS_APP.marketModeByCitizen = { citizen: "DELIVERED" };
  assert.equal(runtime.getMarketWorkspaceMode("citizen"), "ORDERS");
  assert.equal(runtime.getMarketWorkspaceOrderView("citizen"), "DELIVERED");
});

test("catalog projection groups furnishings separately from cyberware and general goods", () => {
  const { runtime } = createRuntime();
  assert.equal(runtime.getMarketWorkspaceDepartment({ category: "HOUSEHOLD", tags: ["FURNITURE", "MEDICAL"] }), "HOUSEHOLD");
  assert.equal(runtime.getMarketWorkspaceSubcategory({ category: "HOUSEHOLD", tags: ["FURNITURE", "HOUSEHOLD_PLACEABLE"] }), "FURNITURE");
  assert.equal(runtime.getMarketWorkspaceDepartment({ category: "CYBERWARE", subtype: "IMPLANT" }), "CYBERWARE");
  assert.equal(runtime.getMarketWorkspaceDepartment({ marketDepartment: "MEDICAL", category: "MEDICAL" }), "GENERAL");
  assert.equal(runtime.getMarketWorkspaceDepartment({ marketDepartment: "FOOD", category: "FOOD" }), "GENERAL");
  assert.equal(runtime.normalizeMarketWorkspaceFilters({ type: "MEDICAL" }).type, "GENERAL");
});

test("delivered view is based on successful fulfillment rather than generic closed status", () => {
  const { runtime } = createRuntime();
  assert.equal(runtime.isCanonicalMarketWorkspaceOrderDelivered({ status: "FULFILLING", deliveryFulfillment: { status: "IN_TRANSIT" } }), false);
  assert.equal(runtime.isCanonicalMarketWorkspaceOrderDelivered({ status: "FAILED", completedAt: "2109-02-13T12:00:00.000Z" }), false);
  assert.equal(runtime.isCanonicalMarketWorkspaceOrderDelivered({ status: "COMPLETED", completedAt: "2109-02-13T12:00:00.000Z", deliveryFulfillment: { status: "DELIVERED" } }), true);
  assert.equal(runtime.isCanonicalMarketWorkspaceOrderDelivered({ status: "COMPLETED", completedAt: "2109-02-13T12:00:00.000Z", pickupFulfillment: { status: "COMPLETED" } }), true);
  assert.equal(runtime.isCanonicalMarketWorkspaceOrderDelivered({ status: "REFUNDED", completedAt: "2109-02-13T12:00:00.000Z", deliveryFulfillment: { status: "DELIVERED" } }), true);
});

test("order countdown uses exact Campaign Time without a parallel timer", () => {
  const { context, runtime } = createRuntime();
  context.window.WS_APP.getCampaignTimeIso = () => "2109-02-13T10:35:00.000Z";
  assert.equal(runtime.formatMarketWorkspaceTimeRemaining("2109-02-13T15:00:00.000Z"), "04H 25M");
  assert.equal(runtime.formatMarketWorkspaceTimeRemaining("2109-02-14T15:00:00.000Z"), "1D 04H 25M");
  assert.equal(runtime.formatMarketWorkspaceTimeRemaining("2109-02-13T10:00:00.000Z"), "DUE NOW");
  const shell = read("js/market.js");
  assert.match(shell, /ws:campaign-time-updated/);
  assert.doesNotMatch(read("js/market-workspace-runtime.js"), /setInterval/);
});

test("collapsed order cards expose status, ETA, remaining time, fulfillment and destination", () => {
  const source = read("js/market-workspace-runtime.js");
  const css = read("css/housing.css");
  assert.match(source, /housing-market-order-progress/);
  assert.match(source, /<small>STATUS<\/small>/);
  assert.match(source, /"DELIVERED AT" : "ETA"/);
  assert.match(source, /<small>TIME REMAINING<\/small>/);
  assert.match(source, /<small>FULFILLMENT<\/small>/);
  assert.match(source, /<small>DESTINATION<\/small>/);
  assert.match(css, /\.housing-market-order-progress\s*\{/);
});
