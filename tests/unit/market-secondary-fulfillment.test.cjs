"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

async function flushMicrotasks() {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  await Promise.resolve();
}

function createHarness(options = {}) {
  const items = new Map();
  const itemTransactions = new Map();
  const housingReservations = new Map();
  const state = {
    campaignTimeIso: "2109-02-13T12:00:00.000Z",
    captureFails: options.captureFails === true,
    billingIntent: null
  };
  const product = {
    id: "secondary-runtime-chair",
    catalogId: "secondary-runtime-chair",
    definitionId: "secondary-runtime-chair",
    name: "Secondary Runtime Chair",
    category: "HOUSEHOLD",
    subtype: "CHAIR",
    price: 1200,
    manufacturer: "Habitat Market",
    width: 1,
    height: 1
  };

  function clone(value) {
    return value == null ? value : structuredClone(value);
  }

  const wsApp = {
    getCampaignTimeIso: () => state.campaignTimeIso,
    getEquipmentCatalogItems: () => [clone(product)],
    getEquipmentCatalogItemById: (id) => id === product.id ? clone(product) : null,
    getEquipmentCatalogItem: (id) => id === product.id ? clone(product) : null,
    getCitizenById: (id) => id === "citizen-a" ? { id: "citizen-a", credits: 5000, visibleAddress: "03.51N00E.060.HAB2.209::B12.001.001" } : null,
    getHousingStorage(storageId, citizenId) {
      if (storageId !== "housing-storage-a" || citizenId !== "citizen-a") return null;
      return { record: { id: "housing-unit-a", visibleAddress: "03.51N00E.060.HAB2.209::B12.001.001" }, storage: { id: storageId } };
    },
    reserveHousingPlacement(input) {
      const existing = [...housingReservations.values()].find((entry) => entry.idempotencyKey === input.idempotencyKey);
      if (existing) return { ok: true, operation: "IDEMPOTENT_REPLAY", reservation: clone(existing) };
      const reservation = {
        reservationId: input.reservationId,
        housingStorageId: input.housingStorageId,
        status: "RESERVED",
        idempotencyKey: input.idempotencyKey,
        placement: { gridX: housingReservations.size, gridY: 0, rotation: 0 },
        revision: 1
      };
      housingReservations.set(reservation.reservationId, reservation);
      return { ok: true, reservation: clone(reservation) };
    },
    getHousingPlacementReservation(id) {
      return clone(housingReservations.get(id) || null);
    },
    commitHousingPlacement(input) {
      const reservation = housingReservations.get(input.reservationId);
      if (!reservation) return { ok: false, reason: "HOUSING_RESERVATION_NOT_FOUND" };
      const item = items.get(input.instanceId);
      assert.ok(item);
      assert.equal(item.location.type, "HOUSING_STORAGE");
      reservation.status = "COMMITTED";
      reservation.revision += 1;
      return { ok: true, reservation: clone(reservation) };
    },
    releaseHousingPlacementReservation(id) {
      const reservation = housingReservations.get(id);
      if (!reservation) return { ok: false, reason: "HOUSING_RESERVATION_NOT_FOUND" };
      reservation.status = "RELEASED";
      reservation.revision += 1;
      return { ok: true, reservation: clone(reservation) };
    },
    flushHousingPlacementPersistence: () => true,
    createBillingIntent(input) {
      state.billingIntent = { billingIntentId: "billing-secondary-intent", status: "DRAFT", ...clone(input) };
      return { ok: true, billingIntent: clone(state.billingIntent) };
    },
    authorizeBillingIntent() {
      state.billingIntent.status = "AUTHORIZED";
      return { ok: true, billingIntent: clone(state.billingIntent) };
    },
    captureBillingIntent() {
      if (state.captureFails) return { ok: false, error: { code: "TEST_CAPTURE_FAILED" } };
      state.billingIntent.status = "CAPTURED";
      return { ok: true, billingTransaction: { billingTransactionId: "billing-secondary-capture", amount: state.billingIntent.amount, status: "CAPTURED" } };
    },
    voidBillingIntent() {
      if (state.billingIntent) state.billingIntent.status = "VOIDED";
      return { ok: true };
    },
    refundBillingTransaction: () => ({ ok: true, billingTransaction: { billingTransactionId: "billing-secondary-refund" } }),
    getBillingIntent: () => clone(state.billingIntent),
    getBillingTransaction: () => null,
    createItemInstance: () => ({ ok: true }),
    removeItemInstance(id) {
      items.delete(id);
      return { ok: true };
    },
    getItemInstanceById: (id) => clone(items.get(id) || null),
    getItemInstanceTransactionByIdempotencyKey: (key) => clone(itemTransactions.get(key) || null),
    commitItemInstanceTransaction(input) {
      const replay = itemTransactions.get(input.idempotencyKey);
      if (replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", transaction: clone(replay), committed: true };
      const before = new Map();
      for (const operation of input.operations) {
        before.set(operation.instanceId, clone(items.get(operation.instanceId) || null));
        if (operation.type === "CREATE") {
          assert.equal(items.has(operation.instanceId), false);
          items.set(operation.instanceId, clone(operation.instance));
        } else if (operation.type === "MOVE") {
          const current = items.get(operation.instanceId);
          assert.ok(current, `Missing ItemInstance ${operation.instanceId}`);
          if (Object.prototype.hasOwnProperty.call(operation.expected || {}, "ownerId")) assert.equal(current.ownerId || "", operation.expected.ownerId || "");
          if (operation.expected?.locationType) assert.equal(current.location.type, operation.expected.locationType);
          if (operation.expected?.lifecycleState) assert.equal(current.lifecycleState, operation.expected.lifecycleState);
          current.location = clone(operation.toLocation);
          if (Object.prototype.hasOwnProperty.call(operation, "ownerId")) current.ownerId = operation.ownerId;
          current.lifecycleState = operation.lifecycleState;
          current.acquisition = { ...(current.acquisition || {}), ...(clone(operation.patch?.acquisition) || {}) };
          current.flags = { ...(current.flags || {}), ...(clone(operation.patch?.flags) || {}) };
          current.marketOrderId = operation.patch?.marketOrderId || current.marketOrderId;
          current.marketOrderLineId = operation.patch?.marketOrderLineId || current.marketOrderLineId;
          current.marketOfferId = operation.patch?.marketOfferId || current.marketOfferId;
          items.set(operation.instanceId, current);
        } else if (operation.type === "REMOVE") {
          items.delete(operation.instanceId);
        }
      }
      const transaction = {
        transactionId: `item-secondary-transaction-${itemTransactions.size + 1}`,
        idempotencyKey: input.idempotencyKey,
        status: "COMMITTED",
        before: [...before.entries()]
      };
      itemTransactions.set(input.idempotencyKey, transaction);
      return { ok: true, committed: true, transaction: clone(transaction) };
    },
    compensateItemInstanceTransaction(transactionId) {
      const transaction = [...itemTransactions.values()].find((entry) => entry.transactionId === transactionId);
      if (!transaction) return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_NOT_FOUND" };
      transaction.before.forEach(([id, snapshot]) => {
        if (snapshot) items.set(id, clone(snapshot));
        else items.delete(id);
      });
      transaction.status = "COMPENSATED";
      return { ok: true, compensated: true, transaction: clone(transaction) };
    },
    flushScheduledItemStorePersistence: () => true,
    getItemInstanceStoreRevision: () => itemTransactions.size,
    resolveOrganizationLocationSource: (organizationLocationId) => ({
      organizationName: "Habitat Market",
      organizationId: "org-habitat-market",
      sourceInstitutionId: organizationLocationId,
      sourceAddress: "03.51N00E.060.HAB2.209::B12.100.001"
    })
  };

  const runtime = createBrowserRuntime({ wsApp, nowIso: state.campaignTimeIso });
  runtime.load("data/market-offers.js");
  runtime.load("js/market-store.js");
  runtime.load("js/world-time-scheduled-events.js");
  runtime.load("js/market-time-scheduler.js");
  runtime.load("js/market-secondary-listing-store.js");
  return { runtime, state, items, itemTransactions, housingReservations, product };
}

async function getActiveListing(harness) {
  await flushMicrotasks();
  const listings = harness.runtime.window.WS_APP.getMarketSecondaryListings({ status: "ACTIVE" });
  assert.ok(listings.length > 0, "Expected an active secondary listing.");
  return listings[0];
}

test("secondary checkout transfers the same concrete ItemInstance through canonical delivery", async () => {
  const harness = createHarness();
  const api = harness.runtime.window.WS_APP;
  const listing = await getActiveListing(harness);
  const sourceId = listing.sourceInstanceId;
  assert.ok(sourceId);
  const initialItemCount = harness.items.size;
  assert.ok(initialItemCount >= 1);
  const source = harness.items.get(sourceId);
  assert.equal(source.ownerId, "");
  assert.equal(source.location.type, "VENDOR");
  assert.equal(source.location.secondaryListingId, listing.listingId);
  assert.equal(source.durability.current, listing.conditionSnapshot);

  const cart = api.createMarketCart("citizen-a").cart;
  const added = api.updateMarketCart(cart.cartId, {
    addLine: {
      marketOfferId: listing.marketOfferId,
      offerSource: "SECONDARY",
      listingId: listing.listingId,
      listingRevision: listing.revision,
      sourceInstanceId: listing.sourceInstanceId,
      sourceMarketOfferId: listing.sourceMarketOfferId,
      quantity: 1,
      fulfillmentMode: "DELIVER_TO_HOUSING",
      destinationRef: { housingStorageId: "housing-storage-a" }
    }
  });
  assert.equal(added.ok, true, added.reason);
  const quote = api.quoteMarketCart(cart.cartId);
  assert.equal(quote.ok, true, quote.blockers?.join(","));
  assert.equal(quote.lines[0].offerSource, "SECONDARY");
  assert.equal(quote.lines[0].sourceInstanceId, sourceId);
  assert.equal(quote.lines[0].quantity, 1);

  const checkout = api.checkoutMarketCart(cart.cartId, { idempotencyKey: "secondary-checkout-e2e", paymentSource: "CREDITS" });
  assert.equal(checkout.ok, true, checkout.reason);
  assert.equal(checkout.operation, "DELIVERY_IN_TRANSIT");
  assert.deepEqual(Array.from(checkout.transferredItemInstanceIds), [sourceId]);
  assert.equal(harness.items.size, initialItemCount, "Checkout must not create a duplicate ItemInstance.");
  const inTransit = harness.items.get(sourceId);
  assert.equal(inTransit.ownerId, "citizen-a");
  assert.equal(inTransit.location.type, "VENDOR");
  assert.equal(inTransit.location.shipmentId, checkout.shipment.shipmentId);
  assert.equal(inTransit.durability.current, listing.conditionSnapshot);

  const sold = api.getMarketSecondaryListing(listing.listingId);
  assert.equal(sold.status, "SOLD");
  assert.equal(sold.saleResolution, "PLAYER_BUYER");
  assert.equal(sold.saleMarketOrderId, checkout.marketOrderId);
  assert.equal(checkout.order.lines[0].sourceInstanceId, sourceId);
  assert.deepEqual(Array.from(checkout.order.transferredItemInstanceIds), [sourceId]);

  const replay = api.checkoutMarketCart(cart.cartId, { idempotencyKey: "secondary-checkout-e2e", paymentSource: "CREDITS" });
  assert.equal(replay.ok, true);
  assert.match(replay.operation, /REPLAY/);
  assert.equal(harness.items.size, initialItemCount);

  harness.state.campaignTimeIso = checkout.shipment.etaAt;
  const delivered = api.reconcileMarketShipments({ nowIso: harness.state.campaignTimeIso });
  assert.equal(delivered.delivered, 1);
  assert.equal(harness.items.size, initialItemCount);
  const finalItem = harness.items.get(sourceId);
  assert.equal(finalItem.ownerId, "citizen-a");
  assert.equal(finalItem.location.type, "HOUSING_STORAGE");
  assert.equal(finalItem.location.storageUnitId, "housing-storage-a");
  assert.equal(finalItem.durability.current, listing.conditionSnapshot);
});

test("failed payment releases the secondary reservation without deleting the source instance", async () => {
  const harness = createHarness({ captureFails: true });
  const api = harness.runtime.window.WS_APP;
  const listing = await getActiveListing(harness);
  const sourceId = listing.sourceInstanceId;
  const initialItemCount = harness.items.size;
  const cart = api.createMarketCart("citizen-a").cart;
  const added = api.updateMarketCart(cart.cartId, {
    addLine: {
      marketOfferId: listing.marketOfferId,
      offerSource: "SECONDARY",
      listingId: listing.listingId,
      listingRevision: listing.revision,
      sourceInstanceId: sourceId,
      quantity: 1,
      fulfillmentMode: "DELIVER_TO_HOUSING",
      destinationRef: { housingStorageId: "housing-storage-a" }
    }
  });
  assert.equal(added.ok, true);

  const failed = api.checkoutMarketCart(cart.cartId, { idempotencyKey: "secondary-checkout-failed", paymentSource: "CREDITS" });
  assert.equal(failed.ok, false);
  assert.equal(failed.reason, "TEST_CAPTURE_FAILED");
  assert.equal(harness.items.size, initialItemCount);
  const source = harness.items.get(sourceId);
  assert.equal(source.ownerId, "");
  assert.equal(source.location.type, "VENDOR");
  const reopened = api.getMarketSecondaryListing(listing.listingId);
  assert.equal(reopened.status, "ACTIVE");
  assert.equal(reopened.reservation.status, "RELEASED");
});

test("returned secondary item restores listing custody metadata and reopens the same listing", async () => {
  const harness = createHarness();
  const api = harness.runtime.window.WS_APP;
  await flushMicrotasks();
  const listing = api.getMarketSecondaryListings({ status: "ACTIVE" }).sort((left, right) => String(right.expiresAt).localeCompare(String(left.expiresAt)))[0];
  assert.ok(listing);
  const sourceId = listing.sourceInstanceId;
  const initialItemCount = harness.items.size;
  const cart = api.createMarketCart("citizen-a").cart;
  api.updateMarketCart(cart.cartId, {
    addLine: {
      marketOfferId: listing.marketOfferId,
      offerSource: "SECONDARY",
      listingId: listing.listingId,
      listingRevision: listing.revision,
      sourceInstanceId: sourceId,
      quantity: 1,
      fulfillmentMode: "DELIVER_TO_HOUSING",
      destinationRef: { housingStorageId: "housing-storage-a" }
    }
  });
  const checkout = api.checkoutMarketCart(cart.cartId, { idempotencyKey: "secondary-return-e2e", paymentSource: "CREDITS" });
  assert.equal(checkout.ok, true, checkout.reason);
  harness.state.campaignTimeIso = checkout.shipment.etaAt;
  assert.equal(api.reconcileMarketShipments({ nowIso: harness.state.campaignTimeIso }).delivered, 1);

  const genericReturn = api.commitItemInstanceTransaction({
    idempotencyKey: "secondary-return-e2e:item-return",
    sourceDomain: "MARKET",
    sourceRefId: checkout.marketOrderId,
    citizenId: "citizen-a",
    operations: [{
      type: "MOVE",
      instanceId: sourceId,
      ownerId: "",
      expected: { ownerId: "citizen-a", locationType: "HOUSING_STORAGE", lifecycleState: "UNPACKAGED" },
      toLocation: { type: "VENDOR", vendorId: checkout.order.vendorProviderId, vendorProviderId: checkout.order.vendorProviderId, marketOrderId: checkout.marketOrderId },
      lifecycleState: "PACKAGED",
      patch: { acquisition: { returnedAt: harness.state.campaignTimeIso }, flags: { returnedToVendor: true } }
    }]
  });
  assert.equal(genericReturn.ok, true);
  assert.equal(harness.items.get(sourceId).location.secondaryListingId, undefined);

  const reopened = api.returnMarketSecondaryListingSale({ listingId: listing.listingId, marketOrderId: checkout.marketOrderId, returnedAt: harness.state.campaignTimeIso });
  assert.equal(reopened.ok, true, reopened.reason);
  assert.equal(reopened.listing.status, "ACTIVE");
  assert.equal(reopened.listing.returnCount, 1);
  assert.equal(harness.items.size, initialItemCount);
  const restored = harness.items.get(sourceId);
  assert.equal(restored.ownerId, "");
  assert.equal(restored.location.type, "VENDOR");
  assert.equal(restored.location.secondaryListingId, listing.listingId);
  assert.equal(restored.location.marketOfferId, listing.marketOfferId);
  assert.equal(restored.durability.current, listing.conditionSnapshot);
  assert.equal(restored.durability.maximumOverride, listing.conditionSnapshot);
  assert.equal(api.projectMarketSecondaryListing(reopened.listing).playerPurchaseAvailable, true);
});
