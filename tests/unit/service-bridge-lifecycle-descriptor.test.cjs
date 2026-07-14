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

test("Service Bridge lifecycle descriptor remains separate and read-only", () => {
  const order = makeServiceOrder({ status: "AUTHORIZED", revision: 4 });
  const runtime = createBrowserRuntime({ storageSeed: serviceStorage(order) });
  runtime.load("js/service-bridge-store.js");

  const descriptor = runtime.window.WS_APP.getServiceOrderLifecycleDescriptor(order.serviceOrderId);
  assert.equal(descriptor.recordDomain, "SERVICE_BRIDGE_ORDER");
  assert.equal(descriptor.status, "AUTHORIZED");
  assert.equal(descriptor.revision, 4);
  assert.deepEqual(Array.from(descriptor.allowedTransitions), ["SCHEDULED", "IN_PROGRESS", "CANCELLED", "FAILED"]);
  assert.equal(descriptor.terminal, false);
});
