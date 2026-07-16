"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readProjectFile, extractFunctionSource } = require("../helpers/source-contract.cjs");

test("secondary fulfillment extends canonical Market schemas and preserves one concrete ItemInstance", () => {
  const source = readProjectFile("js/market-store.js");
  assert.match(source, /MARKET_OFFER_SCHEMA_VERSION = 4/);
  assert.match(source, /MARKET_CART_SCHEMA_VERSION = 3/);
  assert.match(source, /MARKET_ORDER_SCHEMA_VERSION = 8/);
  assert.match(source, /MARKET_OFFER_SOURCES = new Set\(\["CATALOG", "SECONDARY"\]\)/);
  assert.match(source, /sourceInstanceId/);
  assert.match(source, /transferredItemInstanceIds/);
  assert.match(source, /secondaryListingIds/);
});

test("secondary checkout reserves the listing and moves the same source instance through canonical delivery", () => {
  const source = readProjectFile("js/market-store.js");
  const custody = extractFunctionSource(source, "buildSecondaryCustodyOperation");
  const reserve = extractFunctionSource(source, "reserveMarketStock");
  const commit = extractFunctionSource(source, "commitMarketStockReservation");
  const release = extractFunctionSource(source, "releaseMarketStockReservation");
  const checkout = extractFunctionSource(source, "checkoutMarketCartHousing");

  assert.match(custody, /type:\s*"MOVE"/);
  assert.match(custody, /instanceId/);
  assert.match(custody, /expected:\s*\{\s*ownerId:\s*"",\s*locationType:\s*"VENDOR"/);
  assert.match(custody, /locationType:\s*"VENDOR"/);
  assert.doesNotMatch(custody, /type:\s*"CREATE"/);
  assert.match(reserve, /reserveMarketSecondaryListing/);
  assert.match(commit, /commitMarketSecondaryListingSale/);
  assert.match(release, /releaseMarketSecondaryListingReservation/);
  assert.match(checkout, /buildSecondaryCustodyOperation/);
  assert.match(checkout, /DELIVER_TO_HOUSING/);
});

test("secondary quantities are singular and returns reopen the concrete listing source", () => {
  const source = readProjectFile("js/market-store.js");
  const partial = extractFunctionSource(source, "commitMarketOrderPartialStockReturn");
  const full = extractFunctionSource(source, "commitMarketOrderStockReturn");
  assert.match(source, /offerSource === "SECONDARY" \? 1/);
  assert.match(source, /MARKET_SECONDARY_QUANTITY_MUST_EQUAL_ONE/);
  assert.match(source, /MARKET_SECONDARY_DELIVERY_ONLY/);
  assert.match(partial, /returnMarketSecondaryListingSale/);
  assert.match(full, /returnMarketSecondaryListingSale/);
});

test("Market workspace adds concrete secondary listings to the existing cart without a parallel order store", () => {
  const runtime = readProjectFile("js/market-workspace-runtime.js");
  const listingStore = readProjectFile("js/market-secondary-listing-store.js");
  assert.match(runtime, /ADD USED ITEM/);
  assert.match(runtime, /addMarketWorkspaceSecondaryListingToCart/);
  assert.match(runtime, /offerSource:\s*"SECONDARY"/);
  assert.match(runtime, /fulfillmentMode:\s*"DELIVER_TO_HOUSING"/);
  assert.doesNotMatch(listingStore, /createMarketCart/);
  assert.doesNotMatch(listingStore, /createMarketOrder/);
  assert.doesNotMatch(listingStore, /checkoutMarketCart/);
});

test("secondary fulfillment bundle versions are cache-busted consistently", () => {
  const index = readProjectFile("index.html");
  const modules = readProjectFile("js/modules.js");
  assert.match(index, /js\/market-store\.js\?v=14/);
  assert.match(index, /js\/market-secondary-listing-store\.js\?v=2/);
  assert.match(index, /js\/modules\.js\?v=318/);
  assert.match(modules, /js\/market-store\.js\?v=14/);
  assert.match(modules, /js\/market-workspace-runtime\.js\?v=6/);
});
