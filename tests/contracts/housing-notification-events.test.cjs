"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function makeShipment(overrides = {}) {
  return {
    shipmentId: "shipment-1",
    marketOrderId: "market-order-1",
    citizenId: "citizen-a",
    providerId: "provider-vendor-1",
    organizationLocationId: "location-vendor-1",
    destinationHousingId: "housing-1",
    destinationStorageId: "storage-main",
    destinationAddress: "03.51N00E.060.HAB2.109::A4.001.001",
    status: "DELIVERED",
    routeClass: "STANDARD_LOCAL",
    instanceIds: ["item-instance-1"],
    etaAt: "2109-02-14T10:00:00.000Z",
    deliveredAt: "2109-02-14T10:03:00.000Z",
    heldAt: null,
    holdReason: "",
    lastErrorCode: "",
    updatedAt: "2109-02-14T10:03:00.000Z",
    revision: 2,
    ...overrides
  };
}

function makeRuntime() {
  const shipments = new Map([["shipment-1", makeShipment()]]);
  const orders = new Map([["market-order-1", {
    marketOrderId: "market-order-1",
    citizenId: "citizen-a",
    vendorProviderId: "provider-vendor-1",
    status: "COMPLETED",
    lines: [],
    totals: { finalTotal: 1850 },
    revision: 8
  }]]);
  const entries = [];
  const runtime = createBrowserRuntime({
    wsApp: {
      getMarketShipment: (id) => structuredClone(shipments.get(id) || null),
      getMarketOrder: (id) => structuredClone(orders.get(id) || null),
      getHousingStorage: (id, citizenId) => id === "storage-main" && citizenId === "citizen-a" ? {
        record: { id: "housing-1", title: "Habitat Unit 4" },
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
      getOrganizationByProviderId: (providerId) => {
        if (providerId === "provider-habitat-ledger") return { id: "habitat-market", name: "Habitat Ledger" };
        if (providerId === "provider-vendor-1") return { id: "vendor-1", name: "Habitat Market" };
        return null;
      },
      getOrganizationById: (organizationId) => organizationId === "habitat-market"
        ? { id: organizationId, name: "Habitat Ledger" }
        : null,
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
    "js/housing-shipment-event-bridge.js",
    "js/housing-notification-producer.js"
  ]);

  return { runtime, shipments, entries };
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

function dispatchMarketShipment(runtime, shipment, previousStatus = "IN_TRANSIT") {
  runtime.window.dispatchEvent(new runtime.window.CustomEvent("ws:market-shipment-updated", {
    detail: {
      eventId: `market-shipment:${shipment.shipmentId}:${shipment.revision}`,
      shipmentId: shipment.shipmentId,
      marketOrderId: shipment.marketOrderId,
      citizenId: shipment.citizenId,
      status: shipment.status,
      previousStatus,
      revision: shipment.revision
    }
  }));
}

test("persisted Market shipment delivery becomes one semantic Housing Inbox card", () => {
  const { runtime, shipments, entries } = makeRuntime();
  const shipment = shipments.get("shipment-1");
  dispatchMarketShipment(runtime, shipment);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].eventCode, "HOUSING.SHIPMENT.DELIVERED");
  assert.equal(entries[0].dedupeKey, "housing-shipment:shipment-1");
  assert.equal(entries[0].links[0].module, "housing");
  assert.equal(entries[0].links[0].section, "deliveries");
  assert.equal(entries[0].links[0].params.shipmentId, "shipment-1");

  const visible = visibleText(entries[0]);
  assert.match(visible, /Emergency Medkit/);
  assert.match(visible, /Habitat Market/);
  assert.match(visible, /Main Storage/);
  assert.match(visible, /Habitat Unit 4/);
  assert.match(visible, /delivered/i);
  assert.doesNotMatch(visible, /shipment-1|market-order-1|item-instance-1/);
});

test("capacity hold creates an actionable warning and delivery updates the same card", () => {
  const { runtime, shipments, entries } = makeRuntime();
  const held = makeShipment({
    status: "HELD",
    deliveredAt: null,
    heldAt: "2109-02-14T10:03:00.000Z",
    holdReason: "HOUSING_STORAGE_FULL",
    lastErrorCode: "HOUSING_STORAGE_FULL",
    revision: 2
  });
  shipments.set("shipment-1", held);
  dispatchMarketShipment(runtime, held, "PROCESSING");

  assert.equal(entries.length, 1);
  assert.equal(entries[0].eventCode, "HOUSING.STORAGE.CAPACITY_WARNING");
  assert.equal(entries[0].attention, "BANNER");
  assert.equal(entries[0].links[0].section, "storage");
  assert.equal(entries[0].subjectRef.type, "HOUSING_STORAGE");
  assert.match(visibleText(entries[0]), /free grid space|free storage space/i);
  assert.doesNotMatch(visibleText(entries[0]), /HOUSING_STORAGE_FULL/);
  entries[0].read = true;

  const delivered = makeShipment({ revision: 3 });
  shipments.set("shipment-1", delivered);
  dispatchMarketShipment(runtime, delivered, "HELD");

  assert.equal(entries.length, 1);
  assert.equal(entries[0].eventCode, "HOUSING.SHIPMENT.DELIVERED");
  assert.equal(entries[0].revision, 3);
  assert.equal(entries[0].read, false);
  assert.equal(entries[0].attention, "INBOX");
  assert.equal(entries[0].subjectRef.type, "SHIPMENT");
});

test("non-semantic shipment states and technical placement events do not create player cards", () => {
  const { runtime, shipments, entries } = makeRuntime();
  const transit = makeShipment({ status: "IN_TRANSIT", deliveredAt: null, revision: 2 });
  shipments.set("shipment-1", transit);
  dispatchMarketShipment(runtime, transit, "PACKED");
  runtime.window.dispatchEvent(new runtime.window.CustomEvent("ws:housing-placement-reservation-updated", {
    detail: { reservationId: "housing-reservation-1", citizenId: "citizen-a", status: "COMMITTED", revision: 2 }
  }));
  runtime.window.dispatchEvent(new runtime.window.CustomEvent("ws:housing-placement-persistence-recovered", {
    detail: { reason: "HOUSING_RESERVATION_PERSISTENCE_FAILED" }
  }));

  assert.equal(entries.length, 0);
});

test("Housing-specific delivery recovery is projected as one held shipment card", () => {
  const { runtime, shipments, entries } = makeRuntime();
  const recovery = makeShipment({
    status: "RECOVERY_REQUIRED",
    deliveredAt: null,
    heldAt: "2109-02-14T10:04:00.000Z",
    lastErrorCode: "HOUSING_DELIVERY_COMMIT_RECOVERY_REQUIRED",
    revision: 4
  });
  shipments.set("shipment-1", recovery);
  dispatchMarketShipment(runtime, recovery, "PROCESSING");

  assert.equal(entries.length, 1);
  assert.equal(entries[0].eventCode, "HOUSING.SHIPMENT.HELD");
  assert.equal(entries[0].attention, "BANNER");
  assert.match(visibleText(entries[0]), /requires recovery|review the blocked shipment/i);
  assert.doesNotMatch(visibleText(entries[0]), /HOUSING_DELIVERY_COMMIT_RECOVERY_REQUIRED/);
});

test("event bridge and producer readiness expose canonical source boundaries", () => {
  const { runtime } = makeRuntime();
  const bridge = runtime.window.WS_APP.validateHousingShipmentEventBridge();
  const producer = runtime.window.WS_APP.validateHousingNotificationProducer();
  const projection = runtime.window.WS_APP.validateNotificationContentProjection({
    eventCodes: [
      "HOUSING.SHIPMENT.DELIVERED",
      "HOUSING.SHIPMENT.HELD",
      "HOUSING.STORAGE.CAPACITY_WARNING"
    ]
  });

  assert.equal(bridge.ready, true);
  assert.equal(bridge.sourceEvent, "ws:market-shipment-updated");
  assert.equal(bridge.semanticEvent, "ws:housing-shipment-updated");
  assert.equal(producer.ready, true);
  assert.equal(producer.providerId, "provider-habitat-ledger");
  assert.equal(projection.ok, true);
});
