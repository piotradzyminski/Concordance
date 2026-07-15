"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function loadCampaignDataIo(runtime) {
  runtime.loadMany([
    "js/admin-audit-store.js",
    "js/campaign-data-io-registry.js",
    "js/campaign-data-io-adapters.js",
    "js/campaign-data-io-v6.js"
  ]);
}

test("Campaign Snapshot v6 round-trips scheduled events and execution receipts", () => {
  const scheduledState = {
    schemaVersion: 1,
    schedulerSchemaVersion: "world_time_scheduled_events_2_3x",
    revision: 4,
    lastProcessedTimeIso: "2109-02-13T10:00:00.000Z",
    events: [{
      schemaVersion: 1,
      eventId: "scheduled-event-test",
      idempotencyKey: "scheduled-event-test",
      eventType: "TEST",
      handlerId: "test-handler",
      scheduledAt: "2109-02-13T11:00:00.000Z",
      status: "SCHEDULED",
      revision: 1,
      attemptCount: 0,
      retryCount: 0,
      maxAttempts: 3,
      createdAt: "2109-02-13T09:00:00.000Z",
      updatedAt: "2109-02-13T09:00:00.000Z",
      payload: { citizenId: "citizen-test" },
      metadata: {},
      executionKey: "scheduled-event-test::test-handler::2109-02-13T11:00:00.000Z"
    }],
    receipts: [{
      schemaVersion: 1,
      receiptId: "completed-event::test-handler::2109-02-13T08:00:00.000Z",
      executionKey: "completed-event::test-handler::2109-02-13T08:00:00.000Z",
      eventId: "completed-event",
      handlerId: "test-handler",
      eventType: "TEST",
      scheduledAt: "2109-02-13T08:00:00.000Z",
      executedAt: "2109-02-13T08:00:00.000Z",
      completedAt: "2109-02-13T08:00:00.000Z",
      processedAtCampaignTime: "2109-02-13T10:00:00.000Z",
      attemptCount: 1,
      result: { ok: true }
    }]
  };

  const runtime = createBrowserRuntime({
    storageSeed: {
      ws_world_time_scheduled_events_schema: "world_time_scheduled_events_2_3x",
      ws_world_time_scheduled_events_v1: JSON.stringify(scheduledState)
    }
  });
  loadCampaignDataIo(runtime);

  const snapshot = runtime.window.WS_APP.exportCampaignSnapshotV6({ flush: false, campaignId: "scheduled-events-test" });
  const validation = runtime.window.WS_APP.validateCampaignSnapshotV6(snapshot);
  assert.equal(validation.ok, true, JSON.stringify(validation.error));
  const manifest = snapshot.domains.find((entry) => entry.domainId === "world-time-scheduled-events");
  assert.ok(manifest);
  assert.equal(manifest.recordCount, 2);

  const reset = runtime.window.WS_APP.resetCampaignStateV6();
  assert.equal(reset.ok, true, JSON.stringify(reset));
  assert.equal(runtime.storage.getItem("ws_world_time_scheduled_events_v1"), null);

  const imported = runtime.window.WS_APP.importCampaignSnapshotV6(snapshot);
  assert.equal(imported.ok, true, JSON.stringify(imported));
  const restored = JSON.parse(runtime.storage.getItem("ws_world_time_scheduled_events_v1"));
  assert.equal(restored.events[0].eventId, "scheduled-event-test");
  assert.equal(restored.events[0].scheduledAt, "2109-02-13T11:00:00.000Z");
  assert.equal(restored.receipts[0].eventId, "completed-event");
  assert.equal(runtime.storage.getItem("ws_world_time_scheduled_events_schema"), "world_time_scheduled_events_2_3x");
});
