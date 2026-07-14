"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

function extractBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `Missing block start: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, `Missing block end: ${endMarker}`);
  return source.slice(start, end);
}

test("Market and Housing are separately registered modules", () => {
  const catalog = read("data/modules.js");
  const modules = read("js/modules.js");
  assert.match(catalog, /id:\s*"market"/);
  assert.match(catalog, /id:\s*"housing"/);
  assert.match(modules, /market:\s*\{/);
  assert.match(modules, /housing:\s*\{/);
  assert.match(modules, /moduleId === "market"/);
  assert.match(modules, /moduleId === "housing"/);
});

test("Housing exposes Deliveries but owns no storefront or Market order actions", () => {
  const housing = read("js/housing.js");
  assert.match(housing, /\["UNIT", "HOUSEHOLD", "STORAGE", "DELIVERIES"\]\.includes/);
  assert.match(housing, /function renderHousingDeliveriesTab\(/);
  assert.match(housing, /Read-only logistics projection/);
  assert.match(housing, /openModule\?\.\("market"/);
  assert.doesNotMatch(housing, /renderHousingMarketTab/);
  assert.doesNotMatch(housing, /addHousingMarketOfferToCart/);
  assert.doesNotMatch(housing, /checkoutHousingMarketCart/);
  assert.doesNotMatch(housing, /processDueHousingMarketShipmentsForCitizen/);
});

test("Global Market owns storefront, cart, orders, shipment scheduling and delivery targeting", () => {
  const market = read("js/market.js");
  assert.match(market, /function renderMarketModule\(/);
  assert.match(market, /createHousingMarketRuntime/);
  assert.match(market, /runtime\.renderHousingMarketTab\(citizen\)/);
  assert.match(market, /marketDeliveryHousingByCitizen/);
  assert.match(market, /processDueHousingMarketShipments/);
  assert.match(market, /data-market-module/);
});

test("Housing bundle excludes Market runtime while Market bundle loads it", () => {
  const modules = read("js/modules.js");
  const market = extractBlock(modules, "  market: {", "  housing: {");
  const housing = extractBlock(modules, "  housing: {", "  database: {");
  assert.match(market, /js\/housing-market-runtime\.js\?v=4/);
  assert.match(market, /js\/market\.js\?v=1/);
  assert.match(market, /CYBERWARE_MARKET_PROJECTION_SCRIPTS/);
  assert.doesNotMatch(housing, /housing-market-runtime\.js/);
  assert.doesNotMatch(housing, /CYBERWARE_MARKET_PROJECTION_SCRIPTS/);
});

test("Market notifications route directly to the global Market order workspace", () => {
  const resolver = read("js/notification-content-resolver.js");
  const modules = read("js/modules.js");
  assert.match(resolver, /module:\s*"market"/);
  assert.match(modules, /routeId === "MARKET_ORDER"/);
  assert.match(modules, /housingMarketModeByCitizen\[targetCitizenId\] = "ORDERS"/);
  assert.match(modules, /housingSelectedMarketOrderByCitizen\[targetCitizenId\] = marketOrderId/);
});
