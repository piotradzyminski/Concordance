"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readProjectFile, extractFunctionSource } = require("../helpers/source-contract.cjs");

test("Market catalog exposes pickup as a canonical fulfillment option with a bounded reservation", () => {
  const offers = readProjectFile("data/market-offers.js");
  assert.match(offers, /defaultFulfillmentOptions:\s*\["DELIVER_TO_HOUSING",\s*"PICKUP"\]/);
  assert.match(offers, /pickupFulfillment:\s*\{/);
  assert.match(offers, /defaultReservationDays:\s*3/);
  assert.match(offers, /organizationLocationId:/);
});

test("Pickup checkout captures Billing, commits stock and creates ItemInstance records in vendor custody", () => {
  const source = readProjectFile("js/market-store.js");
  const checkout = extractFunctionSource(source, "checkoutMarketCartPickup");
  const itemSource = extractFunctionSource(source, "buildMarketItemInstanceSource");
  assert.match(checkout, /captureBillingIntent/);
  assert.match(checkout, /commitItemInstanceTransaction/);
  assert.match(checkout, /commitMarketStockReservation/);
  assert.match(checkout, /status:\s*"READY"/);
  assert.match(checkout, /operation:\s*"PICKUP_READY"/);
  assert.match(itemSource, /type:\s*"VENDOR"/);
  assert.match(itemSource, /lifecycleState:\s*serviceFulfillment\s*\?\s*"IN_SERVICE"\s*:\s*\(\(pickupFulfillment\s*\|\|\s*deliveryFulfillment\)\s*\?\s*"PACKAGED"/);
});

test("Pickup completion atomically moves the same ItemInstance records from vendor to Citizen custody", () => {
  const source = readProjectFile("js/market-store.js");
  const confirm = extractFunctionSource(source, "confirmMarketPickup");
  assert.match(confirm, /type:\s*"MOVE"/);
  assert.match(confirm, /locationType:\s*"VENDOR"/);
  assert.match(confirm, /type:\s*"UNPLACED"/);
  assert.match(confirm, /lifecycleState:\s*"UNPACKAGED"/);
  assert.match(confirm, /completionIdempotencyKey/);
  assert.match(confirm, /getItemInstanceTransactionByIdempotencyKey/);
});

test("Pickup recovery expires unclaimed reservations through canonical cancellation and refund", () => {
  const source = readProjectFile("js/market-store.js");
  const reconcile = extractFunctionSource(source, "reconcileMarketPickupFulfillment");
  const cancellation = extractFunctionSource(source, "executeMarketOrderCancellation");
  assert.match(reconcile, /PICKUP_RESERVATION_EXPIRED/);
  assert.match(reconcile, /cancelMarketOrder/);
  assert.match(cancellation, /compensateItemInstanceTransaction/);
  assert.match(cancellation, /releaseMarketStockReservation/);
  assert.match(cancellation, /refundBillingTransaction/);
  assert.match(source, /ws:campaign-date-updated/);
});

test("Housing Market UI offers pickup and exposes confirm and retry actions", () => {
  const source = readProjectFile("js/housing-market-runtime.js");
  assert.match(source, /function addHousingMarketOfferForPickupToCart/);
  assert.match(source, /data-housing-market-add-pickup-offer/);
  assert.match(source, /ADD FOR PICKUP/);
  assert.match(source, /data-housing-market-order-pickup-confirm/);
  assert.match(source, /data-housing-market-order-pickup-retry/);
  assert.match(source, /PICKUP EXPIRES/);
  assert.match(source, /confirmMarketPickup/);
  assert.match(source, /retryMarketPickupCompletion/);
});

test("Pickup bundle versions are cache-busted consistently", () => {
  const index = readProjectFile("index.html");
  const modules = readProjectFile("js/modules.js");
  assert.match(index, /data\/market-offers\.js\?v=4/);
  assert.match(index, /js\/market-store\.js\?v=12/);
  assert.match(index, /js\/modules\.js\?v=295/);
  assert.match(modules, /data\/market-offers\.js\?v=4/);
  assert.match(modules, /js\/market-store\.js\?v=12/);
  assert.match(modules, /js\/housing\.js\?v=48/);
  assert.match(modules, /js\/housing-market-runtime\.js\?v=3/);
});
