"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");
const { makeServiceOrder } = require("../helpers/fixtures.cjs");

function serviceStorage(order) {
  return {
    ws_service_bridge_schema: "service_bridge_foundation_2_0x",
    ws_service_bridge_store_v1: JSON.stringify({ schemaVersion: 1, revision: 1, offers: [], orders: [order], idempotency: [] })
  };
}

test("Service lifecycle rejects an invalid terminal transition", () => {
  const terminalOrder = makeServiceOrder({ status: "COMPLETED", completedAt: "2109-02-13T11:00:00.000Z" });
  const runtime = createBrowserRuntime({ storageSeed: serviceStorage(terminalOrder) });
  runtime.load("js/service-bridge-store.js");

  const result = runtime.window.WS_APP.startServiceOrder(terminalOrder.serviceOrderId, {
    idempotencyKey: "service-start-invalid",
    expectedRevision: 1
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "SERVICE_ORDER_TRANSITION_INVALID");
  assert.equal(result.previousStatus, "COMPLETED");
  assert.equal(result.nextStatus, "IN_PROGRESS");
});

test("Service lifecycle rejects a stale expected revision", () => {
  const order = makeServiceOrder({ status: "AUTHORIZED", revision: 4 });
  const runtime = createBrowserRuntime({ storageSeed: serviceStorage(order) });
  runtime.load("js/service-bridge-store.js");

  const result = runtime.window.WS_APP.scheduleServiceOrder(order.serviceOrderId, {
    scheduledStartAt: "2109-02-14T10:00:00.000Z"
  }, {
    idempotencyKey: "service-schedule-stale",
    expectedRevision: 3
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "SERVICE_ORDER_REVISION_CONFLICT");
  assert.equal(result.actualRevision, 4);
});
