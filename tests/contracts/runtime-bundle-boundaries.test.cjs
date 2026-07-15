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

test("Subscriptions player UI is lazy-only and remains registered in the module bundle", () => {
  const index = read("index.html");
  const modules = read("js/modules.js");
  const subscriptions = extractBlock(modules, "  subscriptions: {", "  service: {");

  assert.doesNotMatch(index, /<script[^>]+js\/subscriptions\.js/);
  assert.doesNotMatch(index, /<script[^>]+js\/subscriptions-workspace\.js/);
  assert.match(subscriptions, /js\/subscriptions\.js\?v=35/);
  assert.match(subscriptions, /js\/subscriptions-workspace\.js\?v=7/);
});

test("Global Market uses Cyberware market projection without full Cyberware UI runtime", () => {
  const modules = read("js/modules.js");
  const catalogData = extractBlock(
    modules,
    "const CYBERWARE_CATALOG_DATA_SCRIPTS = [",
    "const CYBERWARE_MARKET_PROJECTION_SCRIPTS = ["
  );
  const marketProjection = extractBlock(
    modules,
    "const CYBERWARE_MARKET_PROJECTION_SCRIPTS = [",
    "const CYBERWARE_UI_RUNTIME_SCRIPTS = ["
  );
  const market = extractBlock(modules, "  market: {", "  housing: {");
  const housing = extractBlock(modules, "  housing: {", "  database: {");
  const equipment = extractBlock(modules, "  equipment: {", "  cyberware: {");
  const cyberware = extractBlock(modules, "  cyberware: {", "  market: {");

  assert.match(market, /CYBERWARE_MARKET_PROJECTION_SCRIPTS/);
  assert.match(market, /js\/market-workspace-runtime\.js\?v=3/);
  assert.match(market, /js\/market\.js\?v=4/);
  assert.doesNotMatch(market, /CYBERWARE_UI_RUNTIME_SCRIPTS/);
  assert.doesNotMatch(housing, /CYBERWARE_MARKET_PROJECTION_SCRIPTS/);
  assert.doesNotMatch(housing, /market-workspace-runtime\.js/);
  assert.doesNotMatch(housing, /js\/market\.js/);
  assert.doesNotMatch(equipment, /CYBERWARE_UI_RUNTIME_SCRIPTS/);
  assert.doesNotMatch(equipment, /js\/cyberware-index\.js/);
  assert.doesNotMatch(equipment, /js\/cyberware-planner\.js/);
  assert.doesNotMatch(equipment, /js\/cyberware-workspace\.js/);
  assert.match(equipment, /js\/equipment-cyberware-link\.js\?v=20/);
  assert.match(cyberware, /CYBERWARE_UI_RUNTIME_SCRIPTS/);
  assert.match(cyberware, /js\/cyberware-index\.js\?v=2/);
  assert.match(cyberware, /js\/cyberware-planner\.js\?v=8/);
  assert.match(cyberware, /js\/cyberware-workspace\.js\?v=3/);
  assert.match(cyberware, /js\/cyberware-module\.js\?v=3/);

  assert.match(catalogData, /data\/neurochip-catalog\.js/);
  assert.match(catalogData, /data\/interface-catalog\.js/);
  assert.match(catalogData, /data\/service-port-catalog\.js/);
  assert.match(catalogData, /data\/body-cyberware-catalog\.js/);
  assert.match(marketProjection, /CYBERWARE_CATALOG_DATA_SCRIPTS/);
  assert.match(marketProjection, /js\/cyberware-market-projection\.js/);

  assert.doesNotMatch(marketProjection, /cyberware-diagnostics\.js/);
  assert.doesNotMatch(marketProjection, /cyberware-maintenance\.js/);
  assert.doesNotMatch(marketProjection, /cyberware-core-stack\.js/);
  assert.doesNotMatch(marketProjection, /cyberware-actions\.js/);
  assert.doesNotMatch(marketProjection, /js\/cyberware\.js/);
});

test("Cyberware market projection supplies complete catalog items without UI controller", () => {
  const runtime = createBrowserRuntime();
  runtime.loadMany([
    "data/neurochip-catalog.js",
    "data/interface-catalog.js",
    "data/service-port-catalog.js",
    "data/body-cyberware-catalog.js",
    "js/cyberware-store.js",
    "js/cyberware-rules.js",
    "js/subscription-entitlement.js",
    "js/cyberware-bodymap-panel.js",
    "js/cyberware-items-panel.js",
    "js/cyberware-market-projection.js",
    "data/item-type-catalog.js",
    "data/equipment-catalog.js",
    "data/market-offers.js",
    "js/item-type-registry.js",
    "js/equipment-catalog-store.js",
    "js/market-store.js"
  ]);

  const app = runtime.window.WS_APP;
  const cyberwareItems = app.getCyberwareEquipmentCatalogItems();
  const servicePorts = app.getServicePortEquipmentCatalogItems();
  const marketCyberware = app.getMarketCatalogItems({ category: "CYBERWARE" });

  assert.ok(cyberwareItems.length > 100);
  assert.ok(servicePorts.length > 20);
  assert.ok(marketCyberware.length > 100);
  assert.ok(marketCyberware.some((item) => item.subtype === "NEUROCHIP"));
  assert.ok(marketCyberware.some((item) => item.subtype === "INTERFACE"));
  assert.ok(marketCyberware.some((item) => item.subtype === "SERVICE_PORT"));
  assert.equal(typeof app.renderCyberwareModule, "undefined");
});

test("shared citizen finance helpers are eager and independent from Subscriptions UI", () => {
  const index = read("index.html");
  const modules = read("js/modules.js");
  const citizenRecords = read("js/citizen-records.js");
  const service = read("js/service.js");
  const subscriptions = read("js/subscriptions.js");

  const financeIndex = index.indexOf('js/citizen-finance.js?v=1');
  const modulesIndex = index.indexOf('js/modules.js?v=309');

  assert.ok(financeIndex >= 0, "citizen-finance.js must be eager-loaded");
  assert.ok(financeIndex < modulesIndex, "citizen-finance.js must load before module routing");
  assert.doesNotMatch(index, /<script[^>]+js\/subscriptions\.js/);
  assert.match(modules, /js\/subscriptions\.js\?v=35/);

  assert.doesNotMatch(citizenRecords, /(?<![.\w])getCitizenFinancialLedger\s*\(/);
  assert.doesNotMatch(service, /(?<![.\w])getCitizenFinancialLedger\s*\(/);
  assert.doesNotMatch(service, /(?<![.\w])formatDateDisplay\s*\(/);
  assert.doesNotMatch(subscriptions, /function getCitizenFinancialLedger\s*\(/);
  assert.doesNotMatch(subscriptions, /function formatDateDisplay\s*\(/);
});

test("citizen finance ledger works before any lazy module is loaded", () => {
  const runtime = createBrowserRuntime();
  runtime.loadMany([
    "js/store-utils.js",
    "js/subscription-entitlement.js",
    "js/citizen-finance.js"
  ]);

  const app = runtime.window.WS_APP;
  const citizen = {
    id: "citizen-cold-entry",
    legalName: "Cold Entry Citizen",
    credits: "1 200 ₡",
    debt: "300 ₡",
    subscriptions: [
      { id: "sub-active", title: "Rent", category: "RENT", amount: 200, status: "PAID", active: true },
      { id: "sub-cancelled", title: "Net", category: "CYBERSECURITY", amount: 50, status: "CANCELLED", active: false }
    ],
    income: [
      { id: "income-active", serviceRecordId: "service-active", amount: 500, status: "ACTIVE", cycle: "WEEKLY" },
      { id: "income-legacy", amount: 999, status: "ACTIVE", cycle: "WEEKLY" }
    ]
  };

  const ledger = app.getCitizenFinancialLedger(citizen);
  assert.equal(ledger.credits, 1200);
  assert.equal(ledger.debt, 300);
  assert.equal(ledger.incomeTotal, 500);
  assert.equal(ledger.subscriptionTotal, 200);
  assert.equal(ledger.allSubscriptionTotal, 250);
  assert.equal(ledger.netCycle, 300);
  assert.equal(ledger.paymentStatus, "PAID");
  assert.equal(ledger.activityStatus, "PARTIALLY ACTIVE");
  assert.equal(app.formatDateDisplay("2109-02-13T12:00:00.000Z"), "2109-02-13");
});

test("knowledge renderers and module fallback use the canonical back-button API", () => {
  const systemRegistry = read("js/system-registry.js");
  const encyclopedia = read("js/encyclopedia-module.js");
  const modules = read("js/modules.js");

  assert.doesNotMatch(systemRegistry, /(?<![.\w])bindBackButton\s*\(user\)/);
  assert.doesNotMatch(encyclopedia, /(?<![.\w])bindBackButton\s*\(user\)/);
  assert.match(systemRegistry, /window\.WS_APP\.bindModuleBackButton\(user/);
  assert.match(encyclopedia, /window\.WS_APP\.bindModuleBackButton\(user/);

  const placeholder = extractBlock(modules, "function renderModulePlaceholder", "function getRecordAccessGroups");
  assert.doesNotMatch(placeholder, /(?<![.\w])bindBackButton\s*\(/);
  assert.match(placeholder, /window\.WS_APP\.bindModuleBackButton\(user/);
});

test("module render routing always releases transition state", () => {
  const modules = read("js/modules.js");
  const renderDirect = extractBlock(
    modules,
    "async function renderModuleDirect",
    "window.WS_APP.finishModuleTransition ="
  );

  assert.match(renderDirect, /catch \(error\)/);
  assert.match(renderDirect, /finally \{/);
  assert.match(renderDirect, /window\.WS_APP\.finishModuleTransition\?\.\(\)/);
  assert.match(renderDirect, /renderModuleFailure\(user, module, error\)/);
  assert.doesNotMatch(renderDirect, /\bfinishTransition\s*\(/);
});
