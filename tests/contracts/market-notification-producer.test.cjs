"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function makeOrder(overrides = {}) {
  return {
    marketOrderId: "market-order-1",
    citizenId: "citizen-a",
    vendorProviderId: "provider-habitat-ledger",
    status: "COMPLETED",
    paymentStatus: "CAPTURED",
    lines: [{
      marketOrderLineId: "line-1",
      catalogItemId: "item-catalog-1",
      definitionId: "item-catalog-1",
      quantity: 1,
      fulfillmentMode: "DELIVER_TO_HOUSING",
      destinationRef: { housingStorageId: "storage-main" },
      createdItemInstanceIds: ["item-instance-1"],
      vendorDisplayName: "Habitat Market"
    }],
    totals: { finalTotal: 1850, currency: "CREDIT" },
    billingRefs: { billingIntentId: "billing-intent-1", billingTransactionId: "billing-tx-1" },
    createdItemInstanceIds: ["item-instance-1"],
    linkedServiceOrderIds: [],
    shipmentId: "shipment-1",
    deliveryFulfillment: { status: "DELIVERED", shipmentId: "shipment-1", recoveryRequired: false },
    pickupFulfillment: { status: "NOT_REQUIRED" },
    serviceFulfillment: { status: "NOT_REQUIRED", recoveryRequired: false, errors: [] },
    cancellation: { status: "NONE", reasonCode: "" },
    refundRequest: { status: "NONE", reasonCode: "", requestedAt: null },
    compensationStatus: "NOT_REQUIRED",
    compensationErrors: [],
    failureCode: "",
    completedAt: "2109-02-13T12:00:00.000Z",
    updatedAt: "2109-02-13T12:00:00.000Z",
    revision: 1,
    ...overrides
  };
}

function makeRuntime() {
  const orders = new Map([["market-order-1", makeOrder()]]);
  const operations = new Map();
  const entries = [];
  const runtime = createBrowserRuntime({
    wsApp: {
      getMarketOrder: (id) => structuredClone(orders.get(id) || null),
      getMarketShipment: (id) => id === "shipment-1" ? {
        shipmentId: id,
        marketOrderId: "market-order-1",
        status: "DELIVERED",
        destinationStorageId: "storage-main",
        destinationAddress: "Habitat Unit 4",
        revision: 2
      } : null,
      getHousingStorage: (id, citizenId) => id === "storage-main" && citizenId === "citizen-a" ? {
        record: { title: "Habitat Unit 4" },
        unit: { id, name: "Main Storage" }
      } : null,
      getItemInstanceById: (id) => id === "item-instance-1" ? {
        instanceId: id,
        definitionId: "item-catalog-1",
        playerLabel: "Emergency Medkit"
      } : null,
      getEquipmentCatalogItemById: (id) => id === "item-catalog-1" ? {
        id,
        displayName: "Clinical Emergency Medkit"
      } : null,
      getOrganizationByProviderId: (providerId) => providerId === "provider-habitat-ledger" ? {
        id: "habitat-market",
        name: "Habitat Market"
      } : null,
      getOrganizationById: (organizationId) => organizationId === "habitat-market" ? {
        id: organizationId,
        name: "Habitat Market"
      } : null,
      getWorldBridgeOperation: (id) => structuredClone(operations.get(id) || null),
      getWorldBridgeOperationsByReference: (field, referenceId) => [...operations.values()]
        .filter((operation) => {
          if (field === "instanceId") return operation.refs.instanceIds.includes(referenceId);
          return operation.refs[field] === referenceId;
        })
        .map((operation) => structuredClone(operation)),
      formatCredits: (value) => `${Number(value).toLocaleString("en-US")} ₡`,
      addTerminalEntry: (citizenId, entry) => {
        const created = { ...structuredClone(entry), id: `entry-${entries.length + 1}`, citizenId, read: entry.read === true };
        entries.push(created);
        return structuredClone(created);
      },
      upsertTerminalEntry: (citizenId, entry, options = {}) => {
        const index = entries.findIndex((record) => record.citizenId === citizenId && (
          (entry.eventId && record.eventId === entry.eventId)
          || (entry.dedupeKey && record.dedupeKey === entry.dedupeKey)
        ));
        if (index < 0) {
          const created = { ...structuredClone(entry), id: `entry-${entries.length + 1}`, citizenId, read: entry.read === true };
          entries.push(created);
          return { ok: true, operation: "CREATED", notificationId: created.id, entry: structuredClone(created) };
        }
        const existing = entries[index];
        if (Number(entry.revision || 1) <= Number(existing.revision || 1)) {
          return { ok: true, operation: "IGNORED_DUPLICATE", notificationId: existing.id, entry: structuredClone(existing) };
        }
        const updated = {
          ...existing,
          ...structuredClone(entry),
          id: existing.id,
          citizenId,
          read: options.markUnreadOnUpdate === false ? existing.read : false
        };
        entries[index] = updated;
        return { ok: true, operation: "UPDATED_EXISTING", notificationId: updated.id, entry: structuredClone(updated) };
      },
      getEquipmentState() { throw new Error("forbidden EquipmentState build"); },
      getCyberGridState() { throw new Error("forbidden CyberGrid build"); },
      buildCyberwareRuntime() { throw new Error("forbidden Cyberware Runtime build"); }
    }
  });

  runtime.loadMany([
    "data/notification-event-catalog.js",
    "data/notification-content-templates.js",
    "data/notification-provider-capabilities.js",
    "js/notification-registry.js",
    "js/notification-content-resolver.js",
    "js/notification-projection-policy.js",
    "js/notification-api.js",
    "js/market-notification-producer.js"
  ]);
  return { runtime, orders, operations, entries };
}

function visibleText(entry) {
  return JSON.stringify({
    title: entry.title,
    summary: entry.summary,
    panels: entry.panels,
    finalRows: entry.finalRows,
    tags: entry.tags
  });
}

test("standalone Market order creates one player-facing card with resolved content", () => {
  const { runtime, entries } = makeRuntime();
  const result = runtime.window.WS_APP.emitMarketOrderNotification({
    eventId: "market-order:market-order-1:1",
    marketOrderId: "market-order-1",
    revision: 1,
    status: "COMPLETED",
    previousStatus: "FULFILLING",
    changedFields: ["status", "completedAt"]
  });

  assert.equal(result.ok, true);
  assert.equal(result.operation, "CREATED");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].eventCode, "MARKET.ORDER.COMPLETED");
  assert.equal(entries[0].dedupeKey, "market-order:market-order-1");
  assert.equal(entries[0].links[0].routeId, "MARKET_ORDER");
  assert.equal(entries[0].links[0].module, "market");
  assert.equal(entries[0].links[0].entityRef.type, "MARKET_ORDER");

  const visible = visibleText(entries[0]);
  assert.match(visible, /Emergency Medkit/);
  assert.match(visible, /Habitat Market/);
  assert.match(visible, /1,850 ₡/);
  assert.match(visible, /Main Storage/);
  assert.doesNotMatch(visible, /market-order-1|item-instance-1|billing-tx-1|DELIVER_TO_HOUSING/);
});

test("refund request and refund update the same Market card by order revision", () => {
  const { runtime, orders, entries } = makeRuntime();
  const emit = (revision) => runtime.window.WS_APP.emitMarketOrderNotification({
    eventId: `market-order:market-order-1:${revision}`,
    marketOrderId: "market-order-1",
    revision
  });

  assert.equal(emit(1).operation, "CREATED");
  entries[0].read = true;

  orders.set("market-order-1", makeOrder({
    revision: 2,
    refundRequest: { status: "REQUESTED", reasonCode: "PLAYER_REQUEST", requestedAt: "2109-02-14T09:00:00.000Z" },
    updatedAt: "2109-02-14T09:00:00.000Z"
  }));
  const requested = emit(2);
  assert.equal(requested.operation, "UPDATED_EXISTING");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].eventCode, "MARKET.ORDER.REFUND_REQUESTED");
  assert.equal(entries[0].read, false);

  orders.set("market-order-1", makeOrder({
    revision: 3,
    status: "REFUNDED",
    paymentStatus: "REFUNDED",
    refundRequest: { status: "COMPLETED", reasonCode: "PLAYER_REQUEST", requestedAt: "2109-02-14T09:00:00.000Z" },
    updatedAt: "2109-02-14T10:00:00.000Z"
  }));
  const refunded = emit(3);
  assert.equal(refunded.operation, "UPDATED_EXISTING");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].eventCode, "MARKET.ORDER.REFUNDED");
  assert.match(visibleText(entries[0]), /refunded/i);

  const replay = emit(3);
  assert.equal(replay.operation, "IGNORED_DUPLICATE");
  assert.equal(entries.length, 1);
});

test("recovery uses BLOCKING attention and a player-facing reason", () => {
  const { runtime, orders, entries } = makeRuntime();
  orders.set("market-order-1", makeOrder({
    revision: 4,
    status: "PAYMENT_RECOVERY_REQUIRED",
    paymentStatus: "RECOVERY_REQUIRED",
    failureCode: "PAYMENT_RECOVERY_REQUIRED",
    updatedAt: "2109-02-14T11:00:00.000Z"
  }));

  const result = runtime.window.WS_APP.emitMarketOrderNotification({ marketOrderId: "market-order-1", revision: 4 });
  assert.equal(result.ok, true);
  assert.equal(entries[0].eventCode, "MARKET.ORDER.RECOVERY_REQUIRED");
  assert.equal(entries[0].attention, "BLOCKING");
  assert.equal(entries[0].severity, "CRITICAL");
  assert.match(visibleText(entries[0]), /requires recovery|manual recovery/i);
  assert.doesNotMatch(visibleText(entries[0]), /PAYMENT_RECOVERY_REQUIRED/);
});

test("Market event linked to World Bridge is projected to the parent operation", () => {
  const { runtime, operations, entries } = makeRuntime();
  operations.set("operation-1", {
    operationId: "operation-1",
    citizenId: "citizen-a",
    operationType: "PURCHASE_TO_HOUSING",
    status: "COMPLETED",
    revision: 7,
    updatedAt: "2109-02-13T12:00:07.000Z",
    refs: {
      marketOrderId: "market-order-1",
      serviceOrderId: "",
      billingIntentId: "billing-intent-1",
      billingTransactionId: "billing-tx-1",
      itemTransactionId: "",
      instanceIds: ["item-instance-1"]
    }
  });

  const result = runtime.window.WS_APP.emitMarketOrderNotification({ marketOrderId: "market-order-1", revision: 1 });
  assert.equal(result.ok, true);
  assert.equal(result.operation, "PROJECTED_TO_PARENT");
  assert.equal(result.parentOperationId, "operation-1");
  assert.equal(entries.length, 0);
});

test("Market producer exposes readiness and global Market route selects the order", () => {
  const { runtime } = makeRuntime();
  const readiness = runtime.window.WS_APP.validateMarketNotificationProducer();
  assert.equal(readiness.ready, true);
  assert.equal(readiness.mappedEvents.length, 6);

  const modulesSource = fs.readFileSync(path.resolve(__dirname, "../../js/modules.js"), "utf8");
  assert.match(modulesSource, /routeId === "MARKET_ORDER"/);
  assert.match(modulesSource, /housingMarketModeByCitizen\[targetCitizenId\] = "ORDERS"/);
  assert.match(modulesSource, /housingSelectedMarketOrderByCitizen\[targetCitizenId\] = marketOrderId/);
});
