"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readProjectFile, extractFunctionSource } = require("../helpers/source-contract.cjs");

test("Market Store uses full Campaign Time timestamps and exact boundary comparisons", () => {
  const source = readProjectFile("js/market-store.js");
  const getWorldTime = extractFunctionSource(source, "getWorldTime");
  const addWorldDays = extractFunctionSource(source, "addWorldDays");
  const filterOffers = extractFunctionSource(source, "filterOffers");
  assert.match(source, /market_datetime_scheduler_6_5x/);
  assert.match(getWorldTime, /getCampaignTimeIso/);
  assert.match(source, /normalizeMarketWorldTimeIso:\s*normalizeWorldTimeIso/);
  assert.match(addWorldDays, /toISOString\(\)/);
  assert.match(filterOffers, /compareWorldTimes\(activeWorldTime, offer\.activeFrom\) < 0/);
  assert.match(filterOffers, /compareWorldTimes\(activeWorldTime, offer\.expiresAt\) >= 0/);
  assert.doesNotMatch(source, /ws:campaign-date-updated/);
});

test("Market scheduler delegates exact domain events through the shared World Time queue", () => {
  const source = readProjectFile("js/market-time-scheduler.js");
  assert.match(source, /registerWorldTimeScheduledEventHandler/);
  assert.match(source, /MARKET_OFFER_ACTIVATES/);
  assert.match(source, /MARKET_OFFER_EXPIRES/);
  assert.match(source, /MARKET_PICKUP_EXPIRES/);
  assert.match(source, /MARKET_SHIPMENT_DUE/);
  assert.match(source, /cancelMarketOrder/);
  assert.match(source, /reconcileMarketShipment/);
  assert.match(source, /registerMarketTimeEventHandler/);
  assert.doesNotMatch(source, /setInterval/);
});

test("Market datetime scheduler loads after the shared queue and before Service scheduling", () => {
  const index = readProjectFile("index.html");
  const queueIndex = index.indexOf("js/world-time-scheduled-events.js?v=1");
  const marketIndex = index.indexOf("js/market-time-scheduler.js?v=1");
  const serviceIndex = index.indexOf("js/world-time-service-scheduler.js?v=3");
  assert.ok(queueIndex >= 0);
  assert.ok(marketIndex > queueIndex);
  assert.ok(serviceIndex > marketIndex);
  assert.match(index, /js\/market-store\.js\?v=14/);
  assert.match(index, /js\/modules\.js\?v=318/);
});

test("Active documentation defines the Market datetime ownership boundary", () => {
  const contract = readProjectFile("docs/contracts/commerce/market_datetime_scheduler_contract.md");
  assert.match(contract, /market_datetime_scheduler_6_5x/);
  assert.match(contract, /\(previousTimeIso, currentTimeIso\]/);
  assert.match(contract, /World Time Scheduled Events/);
  assert.match(contract, /MARKET_SECONDARY_DEMAND_CHECK/);
  assert.match(contract, /does not create MarketListing records/);
});
