"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

async function flushMicrotasks() {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  await Promise.resolve();
}

function createHarness() {
  const state = { currentTimeIso: "2109-02-13T12:00:00.000Z" };
  const items = new Map();
  const transactions = new Map();
  const offers = Array.from({ length: 16 }, (_, index) => ({
    marketOfferId: `offer-${index + 1}`,
    offerType: "PHYSICAL_ITEM",
    definitionId: `definition-${index + 1}`,
    catalogItemId: `catalog-${index + 1}`,
    vendorDisplayName: "CATALOG VENDOR",
    pricing: { finalPrice: 1000 + (index * 125), currency: "CREDIT" },
    catalogItem: {
      catalogId: `catalog-${index + 1}`,
      name: `Catalog Item ${index + 1}`,
      category: index % 2 ? "EQUIPMENT" : "HOUSEHOLD",
      subtype: "TEST_ITEM",
      manufacturer: "TEST MANUFACTURER"
    }
  }));
  const wsApp = {
    getCampaignTimeIso: () => state.currentTimeIso,
    searchMarketOffers: () => structuredClone(offers),
    getMarketOffer: (id) => structuredClone(offers.find((offer) => offer.marketOfferId === id) || null),
    getMarketOfferByCatalogItemId: (id) => structuredClone(offers.find((offer) => offer.catalogItemId === id) || null),
    getEquipmentCatalogItem: (id) => structuredClone(offers.find((offer) => offer.catalogItemId === id)?.catalogItem || null),
    getItemInstanceById: (id) => structuredClone(items.get(id) || null),
    commitItemInstanceTransaction(input) {
      const replay = transactions.get(input.idempotencyKey);
      if (replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", transaction: structuredClone(replay) };
      for (const operation of input.operations || []) {
        if (operation.type === "CREATE") items.set(operation.instanceId, structuredClone(operation.instance));
        else if (operation.type === "REMOVE") items.delete(operation.instanceId);
      }
      const transaction = { transactionId: `secondary-listing-tx-${transactions.size + 1}`, idempotencyKey: input.idempotencyKey, status: "COMMITTED" };
      transactions.set(input.idempotencyKey, transaction);
      return { ok: true, transaction: structuredClone(transaction), committed: true };
    },
    compensateItemInstanceTransaction: () => ({ ok: true, compensated: true })
  };
  const runtime = createBrowserRuntime({ wsApp, nowIso: state.currentTimeIso });
  runtime.load("js/world-time-scheduled-events.js");
  runtime.load("js/market-time-scheduler.js");
  runtime.load("js/market-secondary-listing-store.js");
  return { runtime, state, items };
}

test("secondary listing foundation generates persistent system listings with exact scheduled lifecycle", async () => {
  const { runtime } = createHarness();
  const api = runtime.window.WS_APP;
  await flushMicrotasks();

  const listings = api.getMarketSecondaryListings({ status: "ACTIVE" });
  assert.equal(listings.length, 12);
  assert.equal(new Set(listings.map((listing) => listing.definitionId)).size, 12);
  listings.forEach((listing) => {
    assert.equal(listing.listingType, "SYSTEM_GENERATED");
    assert.equal(listing.marketChannel, "SECONDARY");
    assert.match(listing.listedAt, /^2109-02-13T12:00:00\.000Z$/);
    assert.match(listing.expiresAt, /^2109-02-/);
    assert.ok(listing.conditionSnapshot >= 45 && listing.conditionSnapshot <= 98);
    assert.ok(listing.listedPrice > 0);
    assert.ok(listing.expectedUsedValue > 0);
    assert.ok(listing.nextDemandCheckAt);
    assert.ok(listing.sourceInstanceId);
    const instance = runtime.window.WS_APP.getItemInstanceById(listing.sourceInstanceId);
    assert.ok(instance);
    assert.equal(instance.location.type, "VENDOR");
    assert.equal(instance.ownerId, "");
    assert.equal(instance.durability.current, listing.conditionSnapshot);
  });

  const events = api.getWorldTimeScheduledEvents({ handlerId: "market-time-scheduler" });
  assert.ok(events.some((event) => event.eventType === "MARKET_SECONDARY_DEMAND_CHECK"));
  assert.ok(events.some((event) => event.eventType === "MARKET_SECONDARY_LISTING_EXPIRES"));
  assert.ok(events.some((event) => event.eventType === "MARKET_SECONDARY_REPLENISH"));
  assert.equal(api.getMarketSecondaryListingDiagnostics().ready, true);

  assert.equal(api.flushMarketSecondaryListingPersistence(), true);
  const stored = JSON.parse(runtime.window.localStorage.getItem("ws_market_secondary_listings_v1"));
  assert.equal(stored.schemaVersion, "market_secondary_fulfillment_7_1x");
  assert.equal(stored.listings.length, 12);
});

test("secondary demand processing is receipt-idempotent across Campaign Time replay", async () => {
  const { runtime, state } = createHarness();
  const api = runtime.window.WS_APP;
  await flushMicrotasks();

  const firstDemandEvent = api.getWorldTimeScheduledEvents({ handlerId: "market-time-scheduler" })
    .filter((event) => event.eventType === "MARKET_SECONDARY_DEMAND_CHECK")
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))[0];
  assert.ok(firstDemandEvent);

  state.currentTimeIso = firstDemandEvent.scheduledAt;
  const first = await api.processScheduledWorldTimeEvents({
    previousTimeIso: "2109-02-13T12:00:00.000Z",
    currentTimeIso: state.currentTimeIso,
    source: "TEST_SECONDARY_DEMAND"
  });
  assert.equal(first.ok, true);
  const revisionAfterFirst = api.getMarketSecondaryListingRevision();
  const diagnosticsAfterFirst = api.getMarketSecondaryListingDiagnostics();
  assert.ok(diagnosticsAfterFirst.diagnostics.demandChecks >= 1);

  const replay = await api.processScheduledWorldTimeEvents({
    previousTimeIso: "2109-02-13T12:00:00.000Z",
    currentTimeIso: state.currentTimeIso,
    source: "TEST_SECONDARY_DEMAND_REPLAY"
  });
  assert.equal(replay.ok, true);
  assert.equal(api.getMarketSecondaryListingRevision(), revisionAfterFirst);
  assert.equal(api.getMarketSecondaryListingDiagnostics().diagnostics.demandChecks, diagnosticsAfterFirst.diagnostics.demandChecks);
});

test("price review updates one listing and expiry closes it without creating an order", async () => {
  const { runtime } = createHarness();
  const api = runtime.window.WS_APP;
  await flushMicrotasks();

  const listing = api.getMarketSecondaryListings({ status: "ACTIVE" }).find((entry) => entry.nextPriceReviewAt);
  assert.ok(listing);
  const reviewed = api.resolveMarketSecondaryPriceReview(listing.listingId, { scheduledAt: listing.nextPriceReviewAt });
  assert.equal(reviewed.ok, true);
  assert.ok(reviewed.listing.listedPrice <= listing.listedPrice);
  assert.equal(reviewed.listing.revision, listing.revision + 1);
  assert.equal(typeof api.getMarketOrder, "undefined");

  const expired = api.expireMarketSecondaryListing(reviewed.listing.listingId, { scheduledAt: reviewed.listing.expiresAt });
  assert.equal(expired.ok, true);
  assert.equal(expired.listing.status, "EXPIRED");
  assert.equal(expired.listing.nextDemandCheckAt, null);
  assert.equal(expired.listing.nextPriceReviewAt, null);
});
