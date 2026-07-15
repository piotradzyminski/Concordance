"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

function getFunctionBlock(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = nextName ? source.indexOf(`function ${nextName}`, start) : source.length;
  assert.notEqual(start, -1, `${name} must exist.`);
  assert.notEqual(end, -1, `${nextName} must exist after ${name}.`);
  return source.slice(start, end);
}

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
    MARKET_DELIVERABLE_SHIPMENT_STATUSES: new Set(["PENDING", "IN_TRANSIT"]),
    MARKET_DEPARTMENTS: ["ALL", "EQUIPMENT", "CYBERWARE", "MEDICAL", "FOOD", "HOUSEHOLD"],
    MARKET_MODES: ["CATALOG", "ORDERS", "DELIVERED"],
    MARKET_ORDER_CLOSED_STATUSES: new Set(["COMPLETED", "REFUNDED", "FAILED", "CANCELLED"]),
    MARKET_ORDER_VIEWS: ["ACTIVE", "HISTORY"],
    MARKET_PAGE_SIZE: 6,
    MARKET_SORTS: ["CATEGORY", "NAME"],
    MARKET_STATUSES: ["ALL", "BUYABLE"],
    MARKET_VENDOR_DEFAULTS: { DEFAULT: { vendorId: "vendor-test", organizationLocationId: "orgloc-test" } },
    MARKET_SHIPMENT_ACTIVE_STATUSES: new Set(["PENDING", "IN_TRANSIT", "HELD"]),
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
    renderMarketFeedback: () => "",
    renderMarketMetric: () => "",
    renderMarketModule: noop,
    renderHousingShipmentRow: () => "",
    setMarketWorkspaceTab: noop,
    setMarketFeedback: noop
  });
  return { context, runtime };
}

test("Market cart context distinguishes line count from total purchased item quantity", () => {
  const { context, runtime } = createRuntime();
  context.window.WS_APP.getCitizenMarketCarts = () => [{
    cartId: "cart-1",
    status: "DRAFT",
    lines: [
      { cartLineId: "line-a", quantity: 3 },
      { cartLineId: "line-b", quantity: 3 }
    ]
  }];
  context.window.WS_APP.quoteMarketCart = () => ({ ok: true, totals: { finalTotal: 600, currency: "CREDIT" }, lines: [] });

  const cart = runtime.getMarketWorkspaceCartContext("citizen-a");
  assert.equal(cart.lineCount, 2);
  assert.equal(cart.itemCount, 6);
  assert.equal(cart.total, 600);
});

test("Cart presentation labels line and item totals independently", () => {
  const source = read("js/market-workspace-runtime.js");
  const drawer = getFunctionBlock(source, "renderMarketWorkspaceCartDrawer", "getCanonicalMarketWorkspaceOrders");
  const commandBar = getFunctionBlock(source, "renderMarketWorkspaceCommandBar", "renderMarketWorkspaceTab");

  assert.match(drawer, /<small>LINES<\/small><b>\$\{escapeHtml\(context\.lineCount\)\}<\/b>/);
  assert.match(drawer, /<small>ITEMS<\/small><b>\$\{escapeHtml\(context\.itemCount\)\}<\/b>/);
  assert.match(commandBar, /cartItemLabel/);
  assert.match(commandBar, /Open Market cart: \$\{escapeHtml\(lineCount\)\} lines, \$\{escapeHtml\(itemCount\)\} items/);
});

test("Market Back hierarchy closes inspector, closes cart, then returns order views to Catalog", () => {
  const source = read("js/market-workspace-runtime.js");
  const back = getFunctionBlock(source, "handleMarketWorkspaceBackNavigation", "handleMarketWorkspaceClick");

  const inspectorIndex = back.indexOf("closeMarketWorkspaceProductInspector");
  const cartIndex = back.indexOf("closeMarketWorkspaceCart");
  const catalogIndex = back.indexOf('setMarketWorkspaceMode(citizenId, "CATALOG")');
  assert.ok(inspectorIndex >= 0);
  assert.ok(cartIndex > inspectorIndex);
  assert.ok(catalogIndex > cartIndex);
});

test("Cart and Product Inspector are modal dialogs with Escape handling and focus containment", () => {
  const source = read("js/market-workspace-runtime.js");
  const css = read("css/housing.css");
  const keydown = getFunctionBlock(source, "handleMarketWorkspaceKeydown", "handleMarketWorkspaceBackNavigation");

  assert.match(source, /data-housing-market-cart-layer/);
  assert.match(source, /housing-market-cart-drawer" role="dialog" aria-modal="true"/);
  assert.match(source, /housing-market-product-inspector-drawer" role="dialog" aria-modal="true"/);
  assert.match(keydown, /closeMarketWorkspaceProductInspector/);
  assert.match(keydown, /closeMarketWorkspaceCart/);
  assert.match(keydown, /trapMarketWorkspaceDialogFocus/);
  assert.match(source, /data-housing-market-modal-inert/);
  assert.match(css, /body\.housing-market-modal-open\s*\{[\s\S]*?overflow:\s*hidden/);
});

test("Global Market Back delegates local navigation before exiting to module access", () => {
  const shell = read("js/market.js");

  assert.match(shell, /runtime\.handleMarketWorkspaceBackNavigation/);
  assert.match(shell, /if \(runtime\.handleMarketWorkspaceBackNavigation\?\.\([^;]+\)\) return/);
  assert.match(shell, /runtime\.resetMarketWorkspaceTransientUi/);
  assert.match(shell, /window\.WS_APP\.renderModules\?\.\(user\)/);
  assert.match(shell, /bindModuleBackButton\?\.\(user, \(\) =>/);
});
