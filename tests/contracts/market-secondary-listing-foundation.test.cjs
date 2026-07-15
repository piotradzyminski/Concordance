"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readProjectFile } = require("../helpers/source-contract.cjs");

test("secondary listing store owns only listing lifecycle and delegates time to the shared Market scheduler", () => {
  const source = readProjectFile("js/market-secondary-listing-store.js");
  assert.match(source, /market_secondary_listing_foundation_7_0x/);
  assert.match(source, /MARKET_SECONDARY_DEMAND_CHECK/);
  assert.match(source, /MARKET_SECONDARY_PRICE_REVIEW/);
  assert.match(source, /MARKET_SECONDARY_LISTING_EXPIRES/);
  assert.match(source, /MARKET_SECONDARY_REPLENISH/);
  assert.match(source, /scheduleMarketTimeEvent/);
  assert.match(source, /saleResolution:\s*"WORLD_BUYER"/);
  assert.match(source, /playerPurchaseAvailable:\s*false/);
  assert.doesNotMatch(source, /setInterval/);
  assert.doesNotMatch(source, /createMarketOrder/);
  assert.doesNotMatch(source, /checkoutMarketCart/);
  assert.doesNotMatch(source, /createItemInstance/);
});

test("Market UI exposes a read-only SECONDARY workspace", () => {
  const market = readProjectFile("js/market.js");
  const runtime = readProjectFile("js/market-workspace-runtime.js");
  assert.match(market, /\["CATALOG", "SECONDARY", "ORDERS", "DELIVERED"\]/);
  assert.match(runtime, /renderMarketSecondaryWorkspace/);
  assert.match(runtime, /PURCHASE LOCKED/);
  assert.match(runtime, /SECONDARY_FULFILLMENT_NOT_IMPLEMENTED|secondary fulfillment patch/i);
});

test("secondary listing store loads after Market scheduler and persists through Campaign Data I\/O", () => {
  const index = readProjectFile("index.html");
  const queueIndex = index.indexOf("js/world-time-scheduled-events.js?v=1");
  const schedulerIndex = index.indexOf("js/market-time-scheduler.js?v=1");
  const listingIndex = index.indexOf("js/market-secondary-listing-store.js?v=1");
  const serviceIndex = index.indexOf("js/world-time-service-scheduler.js?v=3");
  assert.ok(queueIndex >= 0);
  assert.ok(schedulerIndex > queueIndex);
  assert.ok(listingIndex > schedulerIndex);
  assert.ok(serviceIndex > listingIndex);
  const adapters = readProjectFile("js/campaign-data-io-adapters.js");
  assert.match(adapters, /ws_market_secondary_listings_v1/);
  assert.match(adapters, /ws_market_secondary_listings_schema/);
});
