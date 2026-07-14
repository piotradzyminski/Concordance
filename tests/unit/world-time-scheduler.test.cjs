"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");
const { makeServiceOrder } = require("../helpers/fixtures.cjs");

test("World Time scheduler replays START receipts without a second start command", () => {
  const order = makeServiceOrder({
    status: "SCHEDULED",
    scheduledStartAt: "2109-02-13T10:00:00.000Z",
    estimatedEndAt: "2109-02-13T14:00:00.000Z",
    revision: 2
  });
  let starts = 0;
  const runtime = createBrowserRuntime({
    wsApp: {
      getCampaignDateIso: () => "2109-02-13T12:00:00.000Z",
      getServiceOrders: (filters) => Array.isArray(filters?.statuses) && filters.statuses.includes("SCHEDULED") ? [structuredClone(order)] : [],
      startServiceOrder: () => {
        starts += 1;
        return { ok: true, reason: "SERVICE_ORDER_IN_PROGRESS", order: { ...structuredClone(order), status: "IN_PROGRESS", revision: 3 } };
      }
    }
  });
  runtime.load("js/world-time-service-scheduler.js");

  const first = runtime.window.WS_APP.processDueServiceOrders({ campaignDateIso: "2109-02-13T12:00:00.000Z" });
  const second = runtime.window.WS_APP.processDueServiceOrders({ campaignDateIso: "2109-02-13T12:00:00.000Z" });

  assert.equal(first.started, 1);
  assert.equal(second.skipped, 1);
  assert.equal(second.results[0].reason, "SCHEDULER_RECEIPT_REPLAY");
  assert.equal(starts, 1);
});

test("World Time scheduler replays COMPLETE receipts without a second completion handler call", async () => {
  const order = makeServiceOrder({
    status: "IN_PROGRESS",
    estimatedEndAt: "2109-02-13T11:00:00.000Z",
    revision: 3
  });
  let handlerCalls = 0;
  const runtime = createBrowserRuntime({
    wsApp: {
      getCampaignDateIso: () => "2109-02-13T12:00:00.000Z",
      getServiceOrders: (filters) => Array.isArray(filters?.statuses) && filters.statuses.includes("IN_PROGRESS") ? [structuredClone(order)] : [],
      getServiceOrder: () => structuredClone(order),
      getServiceDefinition: () => ({ serviceDefinitionId: order.serviceDefinitionId, serviceType: "REPAIR", domain: "CYBERWARE" })
    }
  });
  runtime.load("js/world-time-service-scheduler.js");
  runtime.window.WS_APP.registerWorldTimeServiceCompletionHandler("test-completion", async () => {
    handlerCalls += 1;
    return { ok: true, pending: true, status: "PENDING", reason: "ASYNC_OPERATION_PENDING" };
  }, { defaultHandler: true });

  const first = await runtime.window.WS_APP.processDueServiceCompletions({ campaignDateIso: "2109-02-13T12:00:00.000Z" });
  const second = await runtime.window.WS_APP.processDueServiceCompletions({ campaignDateIso: "2109-02-13T12:00:00.000Z" });

  assert.equal(first.pending, 1);
  assert.equal(second.skipped, 1);
  assert.equal(second.results[0].reason, "SCHEDULER_RECEIPT_REPLAY");
  assert.equal(handlerCalls, 1);
});
