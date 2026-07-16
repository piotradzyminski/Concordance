"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readProjectFile } = require("../helpers/source-contract.cjs");

test("secondary listing store owns listing lifecycle and concrete source custody while delegating checkout", () => {
  const source = readProjectFile("js/market-secondary-listing-store.js");
  assert.match(source, /market_secondary_fulfillment_7_1x/);
  assert.match(source, /MARKET_SECONDARY_DEMAND_CHECK/);
  assert.match(source, /MARKET_SECONDARY_PRICE_REVIEW/);
  assert.match(source, /MARKET_SECONDARY_LISTING_EXPIRES/);
  assert.match(source, /MARKET_SECONDARY_RESERVATION_EXPIRES/);
  assert.match(source, /MARKET_SECONDARY_REPLENISH/);
  assert.match(source, /scheduleMarketTimeEvent/);
  assert.match(source, /saleResolution:\s*"WORLD_BUYER"/);
  assert.match(source, /playerPurchaseAvailable/);
  assert.match(source, /commitItemInstanceTransaction/);
  assert.match(source, /reserveMarketSecondaryListing/);
  assert.doesNotMatch(source, /setInterval/);
  assert.doesNotMatch(source, /createMarketOrder/);
  assert.doesNotMatch(source, /checkoutMarketCart/);
});

test("Market UI exposes purchasable concrete SECONDARY listings through canonical delivery cart", () => {
  const market = readProjectFile("js/market.js");
  const runtime = readProjectFile("js/market-workspace-runtime.js");
  assert.match(market, /\["CATALOG", "SECONDARY", "ORDERS"\]/);
  assert.match(runtime, /renderMarketSecondaryWorkspace/);
  assert.match(runtime, /data-housing-market-add-secondary-listing/);
  assert.match(runtime, /addMarketWorkspaceSecondaryListingToCart/);
  assert.match(runtime, /offerSource:\s*"SECONDARY"/);
  assert.match(runtime, /fulfillmentMode:\s*"DELIVER_TO_HOUSING"/);
  assert.doesNotMatch(runtime, /PURCHASE LOCKED/);
});

test("secondary listing store loads after Market scheduler and persists through Campaign Data I\/O", () => {
  const index = readProjectFile("index.html");
  const queueIndex = index.indexOf("js/world-time-scheduled-events.js?v=1");
  const schedulerIndex = index.indexOf("js/market-time-scheduler.js?v=1");
  const listingIndex = index.indexOf("js/market-secondary-listing-store.js?v=2");
  const serviceIndex = index.indexOf("js/world-time-service-scheduler.js?v=3");
  assert.ok(queueIndex >= 0);
  assert.ok(schedulerIndex > queueIndex);
  assert.ok(listingIndex > schedulerIndex);
  assert.ok(serviceIndex > listingIndex);
  const adapters = readProjectFile("js/campaign-data-io-adapters.js");
  assert.match(adapters, /ws_market_secondary_listings_v1/);
  assert.match(adapters, /ws_market_secondary_listings_schema/);
});
