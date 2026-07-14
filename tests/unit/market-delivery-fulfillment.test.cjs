"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createDeliveryHarness() {
  const items = new Map();
  const itemTransactions = new Map();
  const housingReservations = new Map();
  const audits = [];
  const state = {
    campaignDateIso: "2109-02-13",
    storageFull: false,
    billingIntent: null
  };
  const product = {
    id: "delivery-runtime-ration",
    catalogId: "delivery-runtime-ration",
    definitionId: "delivery-runtime-ration",
    name: "Delivery Runtime Ration",
    category: "FOOD",
    price: 120,
    manufacturer: "Habitat Market",
    width: 1,
    height: 1
  };

  const wsApp = {
    getCampaignDateIso: () => state.campaignDateIso,
    getEquipmentCatalogItems: () => [product],
    getEquipmentCatalogItemById: (id) => id === product.id ? product : null,
    getCitizenById: (id) => id === "citizen-a" ? {
      id: "citizen-a",
      credits: 1000,
      visibleAddress: "03.51N00E.060.HAB2.209::B12.001.001"
    } : null,
    createItemInstance: () => ({ ok: true }),
    removeItemInstance(id) {
      items.delete(id);
      return { ok: true };
    },
    validateHousingPlacement: () => ({ ok: true }),
    getHousingStorage(storageId, citizenId) {
      if (storageId !== "housing-storage-a" || citizenId !== "citizen-a") return null;
      return {
        record: {
          id: "housing-unit-a",
          visibleAddress: "03.51N00E.060.HAB2.209::B12.001.001"
        },
        storage: { id: storageId }
      };
    },
    reserveHousingPlacement(input) {
      if (state.storageFull) return { ok: false, reason: "HOUSING_STORAGE_FULL" };
      const existing = [...housingReservations.values()].find((entry) => entry.idempotencyKey === input.idempotencyKey);
      if (existing) {
        if (existing.status === "RELEASED") return { ok: false, reason: "HOUSING_RESERVATION_NOT_COMMITTABLE", reservation: structuredClone(existing) };
        return { ok: true, operation: "IDEMPOTENT_REPLAY", reservation: structuredClone(existing) };
      }
      const reservation = {
        reservationId: input.reservationId,
        housingStorageId: input.housingStorageId,
        status: "RESERVED",
        idempotencyKey: input.idempotencyKey,
        placement: { gridX: housingReservations.size, gridY: 0, rotation: 0 },
        revision: 1
      };
      housingReservations.set(reservation.reservationId, reservation);
      return { ok: true, reservation: structuredClone(reservation) };
    },
    getHousingPlacementReservation: (reservationId) => {
      const reservation = housingReservations.get(reservationId);
      return reservation ? structuredClone(reservation) : null;
    },
    commitHousingPlacement(input) {
      const reservation = housingReservations.get(input.reservationId);
      if (!reservation) return { ok: false, reason: "HOUSING_RESERVATION_NOT_FOUND" };
      if (reservation.status === "COMMITTED") return { ok: true, operation: "IDEMPOTENT_REPLAY", reservation: structuredClone(reservation) };
      if (reservation.status !== "RESERVED") return { ok: false, reason: "HOUSING_RESERVATION_NOT_COMMITTABLE" };
      const item = items.get(input.instanceId);
      assert.ok(item, `Missing delivered ItemInstance ${input.instanceId}.`);
      assert.equal(item.location.type, "HOUSING_STORAGE");
      reservation.status = "COMMITTED";
      reservation.revision += 1;
      housingReservations.set(reservation.reservationId, reservation);
      return { ok: true, reservation: structuredClone(reservation) };
    },
    releaseHousingPlacementReservation(reservationId) {
      const reservation = housingReservations.get(reservationId);
      if (!reservation) return { ok: false, reason: "HOUSING_RESERVATION_NOT_FOUND" };
      if (reservation.status === "RELEASED") return { ok: true, operation: "IDEMPOTENT_REPLAY", reservation: structuredClone(reservation) };
      if (reservation.status === "COMMITTED") return { ok: false, reason: "HOUSING_RESERVATION_NOT_COMMITTABLE" };
      reservation.status = "RELEASED";
      reservation.revision += 1;
      housingReservations.set(reservationId, reservation);
      return { ok: true, reservation: structuredClone(reservation) };
    },
    flushHousingPlacementPersistence: () => true,
    createBillingIntent(input) {
      state.billingIntent = { billingIntentId: "billing-intent-delivery", status: "DRAFT", ...input };
      return { ok: true, billingIntent: structuredClone(state.billingIntent) };
    },
    authorizeBillingIntent() {
      state.billingIntent.status = "AUTHORIZED";
      return { ok: true, billingIntent: structuredClone(state.billingIntent) };
    },
    captureBillingIntent() {
      state.billingIntent.status = "CAPTURED";
      return { ok: true, billingTransaction: { billingTransactionId: "billing-transaction-delivery", amount: 120, status: "CAPTURED" } };
    },
    voidBillingIntent: () => ({ ok: true }),
    refundBillingTransaction: () => ({ ok: true, billingTransaction: { billingTransactionId: "billing-refund-delivery" } }),
    getBillingIntent: () => state.billingIntent,
    getBillingTransaction: () => null,
    getItemInstanceById: (id) => items.get(id) || null,
    getItemInstanceTransactionByIdempotencyKey: (key) => itemTransactions.get(key) || null,
    commitItemInstanceTransaction(input) {
      const replay = itemTransactions.get(input.idempotencyKey);
      if (replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", transaction: structuredClone(replay) };
      for (const operation of input.operations) {
        if (operation.type === "CREATE") {
          assert.equal(items.has(operation.instanceId), false);
          items.set(operation.instanceId, structuredClone(operation.instance));
        } else if (operation.type === "MOVE") {
          const current = items.get(operation.instanceId);
          assert.ok(current, `Missing ItemInstance ${operation.instanceId}.`);
          assert.equal(current.ownerId, operation.expected.ownerId);
          assert.equal(current.location.type, operation.expected.locationType);
          assert.equal(current.lifecycleState, operation.expected.lifecycleState);
          current.location = structuredClone(operation.toLocation);
          current.lifecycleState = operation.lifecycleState;
          current.acquisition = { ...(current.acquisition || {}), ...(operation.patch?.acquisition || {}) };
          current.flags = { ...(current.flags || {}), ...(operation.patch?.flags || {}) };
          items.set(operation.instanceId, current);
        }
      }
      const transaction = {
        transactionId: `item-transaction-${itemTransactions.size + 1}`,
        status: "COMMITTED",
        idempotencyKey: input.idempotencyKey
      };
      itemTransactions.set(input.idempotencyKey, transaction);
      return { ok: true, committed: true, transaction: structuredClone(transaction) };
    },
    compensateItemInstanceTransaction: () => ({ ok: true }),
    flushScheduledItemStorePersistence: () => true,
    getItemInstanceStoreRevision: () => itemTransactions.size,
    resolveOrganizationLocationSource: (organizationLocationId) => ({
      organizationName: "Habitat Market",
      organizationId: "org-habitat-market",
      sourceInstitutionId: organizationLocationId,
      sourceAddress: "03.51N00E.060.HAB2.209::B12.100.001"
    }),
    appendAdminAuditResult(entry) {
      audits.push(structuredClone(entry));
      return { ok: true, auditId: `audit-${audits.length}`, entry: structuredClone(entry) };
    }
  };

  const runtime = createBrowserRuntime({ wsApp, nowIso: "2109-02-13T12:00:00.000Z" });
  runtime.load("data/market-offers.js");
  runtime.load("js/market-store.js");
  return { runtime, items, itemTransactions, housingReservations, audits, state, product };
}

function checkoutDelivery(harness, idempotencyKey = "market-delivery-runtime-test") {
  const api = harness.runtime.window.WS_APP;
  const offer = api.getMarketOfferByCatalogItemId(harness.product.id);
  assert.ok(offer.fulfillmentOptions.includes("DELIVER_TO_HOUSING"));
  const cart = api.createMarketCart("citizen-a").cart;
  const update = api.updateMarketCart(cart.cartId, {
    addLine: {
      marketOfferId: offer.marketOfferId,
      quantity: 1,
      fulfillmentMode: "DELIVER_TO_HOUSING",
      destinationRef: { housingStorageId: "housing-storage-a" }
    }
  });
  assert.equal(update.ok, true);
  return api.checkoutMarketCart(cart.cartId, { idempotencyKey, paymentSource: "CREDITS" });
}

test("Market delivery keeps one ItemInstance in vendor custody until Campaign Time reaches ETA", () => {
  const harness = createDeliveryHarness();
  const api = harness.runtime.window.WS_APP;
  const checkout = checkoutDelivery(harness);
  assert.equal(checkout.ok, true, checkout.reason);
  assert.equal(checkout.operation, "DELIVERY_IN_TRANSIT");
  assert.equal(checkout.order.status, "FULFILLING");
  assert.equal(checkout.shipment.status, "IN_TRANSIT");
  assert.equal(checkout.order.deliveryFulfillment.status, "IN_TRANSIT");
  assert.equal(harness.housingReservations.size, 0, "Housing is reserved only when the shipment is processed.");

  const instanceId = checkout.createdItemInstanceIds[0];
  assert.equal(harness.items.size, 1);
  assert.equal(harness.items.get(instanceId).location.type, "VENDOR");
  assert.equal(harness.items.get(instanceId).lifecycleState, "PACKAGED");

  const early = api.processMarketShipment(checkout.shipment.shipmentId, { expectedRevision: checkout.shipment.revision });
  assert.equal(early.ok, false);
  assert.equal(early.reason, "MARKET_SHIPMENT_NOT_DUE");
  const untrustedForce = api.processMarketShipment(checkout.shipment.shipmentId, { force: true, expectedRevision: checkout.shipment.revision });
  assert.equal(untrustedForce.ok, false);
  assert.equal(untrustedForce.reason, "MARKET_SHIPMENT_NOT_DUE");
  assert.equal(harness.items.get(instanceId).location.type, "VENDOR");

  harness.state.campaignDateIso = checkout.shipment.etaAt;
  const reconciliation = api.reconcileMarketShipments({ nowIso: harness.state.campaignDateIso });
  assert.equal(reconciliation.ok, true);
  assert.equal(reconciliation.delivered, 1);

  const deliveredShipment = api.getMarketShipment(checkout.shipment.shipmentId);
  const deliveredOrder = api.getMarketOrder(checkout.order.marketOrderId);
  assert.equal(deliveredShipment.status, "DELIVERED");
  assert.equal(deliveredOrder.status, "COMPLETED");
  assert.equal(harness.items.size, 1);
  assert.equal(harness.items.get(instanceId).location.type, "HOUSING_STORAGE");
  assert.equal(harness.items.get(instanceId).location.storageUnitId, "housing-storage-a");
  assert.equal(harness.items.get(instanceId).lifecycleState, "UNPACKAGED");

  const replay = api.processMarketShipment(deliveredShipment.shipmentId, { force: true });
  assert.equal(replay.ok, true);
  assert.equal(replay.operation, "IDEMPOTENT_REPLAY");
  assert.equal(harness.items.size, 1);
});

test("Admin DELIVER NOW uses the canonical resolver, records audit and preserves HELD recovery", () => {
  const harness = createDeliveryHarness();
  const api = harness.runtime.window.WS_APP;
  const checkout = checkoutDelivery(harness, "market-delivery-admin-test");
  const instanceId = checkout.createdItemInstanceIds[0];

  harness.state.storageFull = true;
  const held = api.forceProcessMarketShipment(checkout.shipment.shipmentId, {
    actor: { id: "admin-a", role: "ADMIN", displayName: "Debug Admin" },
    reason: "Verify storage overflow handling",
    expectedRevision: checkout.shipment.revision,
    idempotencyKey: "admin-delivery-held"
  });
  assert.equal(held.ok, false);
  assert.equal(held.held, true);
  assert.equal(held.shipment.status, "HELD");
  assert.equal(harness.items.get(instanceId).location.type, "VENDOR");
  assert.equal(harness.audits.length, 1);
  assert.equal(harness.audits[0].sourceCommand, "FORCE_PROCESS_MARKET_SHIPMENT");

  harness.state.storageFull = false;
  const delivered = api.forceProcessMarketShipment(held.shipment.shipmentId, {
    actor: { id: "admin-a", role: "ADMIN", displayName: "Debug Admin" },
    reason: "Complete debug delivery",
    expectedRevision: held.shipment.revision,
    idempotencyKey: "admin-delivery-complete"
  });
  assert.equal(delivered.ok, true, delivered.reason);
  assert.equal(delivered.shipment.status, "DELIVERED");
  assert.equal(delivered.shipment.lastAdminAction.actorId, "admin-a");
  assert.equal(delivered.shipment.lastAdminAction.resultCode, "MARKET_SHIPMENT_DELIVERED");
  assert.equal(harness.items.get(instanceId).location.type, "HOUSING_STORAGE");
  assert.equal(harness.audits.length, 2);
  assert.equal(harness.items.size, 1);
});
