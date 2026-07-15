"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

async function flushMicrotasks() {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  await Promise.resolve();
}

function createSchedulerHarness() {
  const state = {
    currentTimeIso: "2109-02-13T12:00:00.000Z",
    shipments: new Map([["shipment-a", {
      shipmentId: "shipment-a",
      marketOrderId: "order-delivery",
      citizenId: "citizen-a",
      status: "IN_TRANSIT",
      etaAt: "2109-02-13T15:00:00.000Z",
      revision: 3
    }]]),
    orders: new Map([["order-pickup", {
      marketOrderId: "order-pickup",
      citizenId: "citizen-a",
      idempotencyKey: "pickup-order-key",
      status: "FULFILLING",
      revision: 4,
      pickupFulfillment: {
        status: "READY",
        expiresAt: "2109-02-13T14:00:00.000Z"
      }
    }]]),
    invalidations: 0,
    shipmentRuns: 0,
    pickupRuns: 0
  };

  const offers = [{
    marketOfferId: "offer-a",
    vendorProviderId: "provider-a",
    activeFrom: "2109-02-13T13:00:00.000Z",
    expiresAt: "2109-02-13T16:00:00.000Z"
  }];

  const wsApp = {
    getCampaignTimeIso: () => state.currentTimeIso,
    searchMarketOffers: () => structuredClone(offers),
    getMarketShipments: () => Array.from(state.shipments.values()).map((entry) => structuredClone(entry)),
    getMarketOrders: () => Array.from(state.orders.values()).map((entry) => structuredClone(entry)),
    getMarketShipment: (id) => state.shipments.has(id) ? structuredClone(state.shipments.get(id)) : null,
    getMarketOrder: (id) => state.orders.has(id) ? structuredClone(state.orders.get(id)) : null,
    invalidateMarketOffers() {
      state.invalidations += 1;
      return state.invalidations;
    },
    reconcileMarketShipment(id) {
      state.shipmentRuns += 1;
      const shipment = state.shipments.get(id);
      shipment.status = "DELIVERED";
      shipment.revision += 1;
      state.shipments.set(id, shipment);
      return { ok: true, operation: "DELIVERED", shipment: structuredClone(shipment) };
    },
    cancelMarketOrder(id, input) {
      state.pickupRuns += 1;
      const order = state.orders.get(id);
      assert.equal(input.reasonCode, "PICKUP_RESERVATION_EXPIRED");
      assert.equal(input.expectedRevision, order.revision);
      order.status = "CANCELLED";
      order.revision += 1;
      order.pickupFulfillment.status = "EXPIRED";
      state.orders.set(id, order);
      return { ok: true, order: structuredClone(order) };
    }
  };

  const runtime = createBrowserRuntime({ wsApp, nowIso: state.currentTimeIso });
  runtime.load("js/world-time-scheduled-events.js");
  runtime.load("js/market-time-scheduler.js");
  return { runtime, state };
}

test("Market schedules activation, pickup expiry, delivery ETA and offer expiry on exact Campaign Time", async () => {
  const { runtime, state } = createSchedulerHarness();
  const api = runtime.window.WS_APP;
  const resolved = [];
  runtime.window.addEventListener("ws:market-time-event-resolved", (event) => {
    resolved.push({ eventType: event.detail.eventType, scheduledAt: event.detail.scheduledAt });
  });

  await flushMicrotasks();
  const events = api.getWorldTimeScheduledEvents({ handlerId: "market-time-scheduler" });
  assert.deepEqual(Array.from(events, (event) => [event.eventType, event.scheduledAt]), [
    ["MARKET_OFFER_ACTIVATES", "2109-02-13T13:00:00.000Z"],
    ["MARKET_PICKUP_EXPIRES", "2109-02-13T14:00:00.000Z"],
    ["MARKET_SHIPMENT_DUE", "2109-02-13T15:00:00.000Z"],
    ["MARKET_OFFER_EXPIRES", "2109-02-13T16:00:00.000Z"]
  ]);

  state.currentTimeIso = "2109-02-13T16:00:00.000Z";
  const processed = await api.processScheduledWorldTimeEvents({
    previousTimeIso: "2109-02-13T12:00:00.000Z",
    currentTimeIso: state.currentTimeIso,
    campaignTimeRevision: 2,
    source: "TEST_MARKET_SKIP"
  });
  assert.equal(processed.ok, true);
  assert.equal(processed.completed, 4);
  assert.deepEqual(resolved, [
    { eventType: "MARKET_OFFER_ACTIVATES", scheduledAt: "2109-02-13T13:00:00.000Z" },
    { eventType: "MARKET_PICKUP_EXPIRES", scheduledAt: "2109-02-13T14:00:00.000Z" },
    { eventType: "MARKET_SHIPMENT_DUE", scheduledAt: "2109-02-13T15:00:00.000Z" },
    { eventType: "MARKET_OFFER_EXPIRES", scheduledAt: "2109-02-13T16:00:00.000Z" }
  ]);
  assert.equal(state.invalidations, 2);
  assert.equal(state.pickupRuns, 1);
  assert.equal(state.shipmentRuns, 1);

  await flushMicrotasks();
  const replay = await api.processScheduledWorldTimeEvents({
    previousTimeIso: "2109-02-13T12:00:00.000Z",
    currentTimeIso: state.currentTimeIso,
    campaignTimeRevision: 2,
    source: "TEST_MARKET_REPLAY"
  });
  assert.equal(replay.ok, true);
  assert.equal(state.invalidations, 2);
  assert.equal(state.pickupRuns, 1);
  assert.equal(state.shipmentRuns, 1);
});

test("Market scheduler exposes a registered handler boundary for future secondary-listing events", async () => {
  const { runtime, state } = createSchedulerHarness();
  const api = runtime.window.WS_APP;
  await flushMicrotasks();
  let executions = 0;
  const registration = api.registerMarketTimeEventHandler("MARKET_SECONDARY_LISTING_EXPIRES", (event, context) => {
    executions += 1;
    assert.equal(event.payload.listingId, "listing-a");
    assert.equal(context.executionKey.includes(event.eventId), true);
    return { ok: true, reason: "SECONDARY_LISTING_EXPIRED" };
  });
  assert.equal(registration.ok, true);

  const scheduled = api.scheduleMarketTimeEvent({
    eventType: "MARKET_SECONDARY_LISTING_EXPIRES",
    entityType: "MARKET_LISTING",
    entityId: "listing-a",
    scheduledAt: "2109-02-13T17:00:00.000Z",
    payload: { listingId: "listing-a" }
  });
  assert.equal(scheduled.ok, true);

  state.currentTimeIso = "2109-02-13T17:00:00.000Z";
  await api.processScheduledWorldTimeEvents({
    previousTimeIso: "2109-02-13T16:00:00.000Z",
    currentTimeIso: state.currentTimeIso,
    source: "TEST_SECONDARY_FUTURE_BOUNDARY"
  });
  assert.equal(executions, 1);

  await api.processScheduledWorldTimeEvents({
    previousTimeIso: "2109-02-13T16:00:00.000Z",
    currentTimeIso: state.currentTimeIso,
    source: "TEST_SECONDARY_FUTURE_REPLAY"
  });
  assert.equal(executions, 1);
});
