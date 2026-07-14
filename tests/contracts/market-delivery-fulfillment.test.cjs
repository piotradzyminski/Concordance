"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readProjectFile, extractFunctionSource } = require("../helpers/source-contract.cjs");

test("Market catalog defines bounded Campaign Time delivery defaults", () => {
  const offers = readProjectFile("data/market-offers.js");
  assert.match(offers, /deliveryFulfillment:\s*\{/);
  assert.match(offers, /defaultShippingDays:\s*2/);
  assert.match(offers, /minShippingDays:\s*1/);
  assert.match(offers, /maxShippingDays:\s*30/);
});

test("Delivery checkout creates one shipment and keeps purchased ItemInstances in vendor custody", () => {
  const source = readProjectFile("js/market-store.js");
  const checkout = extractFunctionSource(source, "checkoutMarketCartHousing");
  const itemSource = extractFunctionSource(source, "buildMarketItemInstanceSource");
  assert.match(checkout, /buildMarketShipmentForOrder/);
  assert.match(checkout, /commitItemInstanceTransaction/);
  assert.match(checkout, /delivery-custody/);
  assert.match(checkout, /status:\s*"IN_TRANSIT"/);
  assert.match(checkout, /operation:\s*"DELIVERY_IN_TRANSIT"/);
  assert.doesNotMatch(checkout, /commitHousingPlacement/);
  assert.match(itemSource, /type:\s*"VENDOR"/);
  assert.match(itemSource, /deliveryStatus:\s*"IN_TRANSIT"/);
  assert.match(itemSource, /lifecycleState:\s*serviceFulfillment\s*\?\s*"IN_SERVICE"\s*:\s*\(\(pickupFulfillment\s*\|\|\s*deliveryFulfillment\)\s*\?\s*"PACKAGED"/);
});

test("Canonical shipment processor reserves Housing at delivery time and moves the same ItemInstances", () => {
  const source = readProjectFile("js/market-store.js");
  const process = extractFunctionSource(source, "processMarketShipment");
  const reserve = extractFunctionSource(source, "reserveMarketShipmentPlacements");
  assert.match(reserve, /reserveHousingPlacement/);
  assert.match(reserve, /flushHousingPlacementPersistence/);
  assert.match(process, /MARKET_SHIPMENT_FORCE_TOKEN/);
  assert.match(process, /MARKET_SHIPMENT_NOT_DUE/);
  assert.match(process, /type:\s*"MOVE"/);
  assert.match(process, /locationType:\s*"VENDOR"/);
  assert.match(process, /type:\s*"HOUSING_STORAGE"/);
  assert.match(process, /lifecycleState:\s*"UNPACKAGED"/);
  assert.match(process, /commitHousingPlacement/);
  assert.match(process, /status:\s*"HELD"/);
  assert.match(process, /status:\s*"RECOVERY_REQUIRED"/);
  assert.match(process, /status:\s*"DELIVERED"/);
});

test("Campaign Time and startup reconciliation process due shipments", () => {
  const source = readProjectFile("js/market-store.js");
  const reconcile = extractFunctionSource(source, "reconcileMarketShipments");
  assert.match(reconcile, /compareWorldTimes/);
  assert.match(reconcile, /processMarketShipment/);
  assert.match(source, /ws:campaign-date-updated/);
  assert.match(source, /reconcileMarketShipments\(\);/);
});

test("Admin delivery override uses the canonical resolver and writes an audit record", () => {
  const source = readProjectFile("js/market-store.js");
  const force = extractFunctionSource(source, "forceProcessMarketShipment");
  assert.match(force, /ADMIN_ROLE_REQUIRED/);
  assert.match(force, /processMarketShipment/);
  assert.match(force, /appendAdminAuditResult/);
  assert.match(force, /FORCE_PROCESS_MARKET_SHIPMENT/);
  assert.match(force, /lastAdminAction/);

  const ui = readProjectFile("js/housing-market-runtime.js");
  assert.match(ui, /DELIVER NOW/);
  assert.match(ui, /RETRY DELIVERY/);
  assert.match(ui, /RECONCILE SHIPMENT/);
  assert.match(ui, /forceProcessMarketShipment/);
  assert.match(ui, /retryMarketShipmentDelivery/);
  assert.match(ui, /reconcileMarketShipment/);
});

test("Delivery fulfillment bundle versions are cache-busted consistently", () => {
  const index = readProjectFile("index.html");
  const modules = readProjectFile("js/modules.js");
  assert.match(index, /data\/market-offers\.js\?v=4/);
  assert.match(index, /js\/market-store\.js\?v=12/);
  assert.match(index, /js\/modules\.js\?v=297/);
  assert.match(modules, /css\/housing\.css\?v=32/);
  assert.match(modules, /data\/market-offers\.js\?v=4/);
  assert.match(modules, /js\/market-store\.js\?v=12/);
  assert.match(modules, /js\/housing-market-runtime\.js\?v=4/);
});
