"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createRuntime(currentTimeIso = "2109-02-13T13:00:00.000Z", options = {}) {
  let campaignTimeIso = currentTimeIso;
  const runtime = createBrowserRuntime({
    storageSeed: options.storageSeed,
    wsApp: {
      getCampaignTimeIso: () => campaignTimeIso,
      CAMPAIGN_TIME_ISO: campaignTimeIso
    }
  });
  runtime.loadMany([
    "js/world-time-event-windows.js",
    "js/world-time-scheduled-events.js"
  ]);
  return {
    runtime,
    setCampaignTime(value) {
      campaignTimeIso = value;
      runtime.window.WS_APP.CAMPAIGN_TIME_ISO = value;
    }
  };
}

function schedule(app, overrides = {}) {
  return app.scheduleWorldTimeEvent({
    eventId: overrides.eventId || "event-a",
    idempotencyKey: overrides.idempotencyKey || overrides.eventId || "event-a",
    eventType: overrides.eventType || "TEST",
    handlerId: overrides.handlerId || "test-handler",
    scheduledAt: overrides.scheduledAt || "2109-02-13T11:00:00.000Z",
    payload: overrides.payload || {},
    metadata: overrides.metadata || {},
    maxAttempts: overrides.maxAttempts
  });
}

test("scheduled event executes once inside the committed Campaign Time interval", async () => {
  const { runtime } = createRuntime();
  const app = runtime.window.WS_APP;
  const calls = [];
  app.registerWorldTimeScheduledEventHandler("test-handler", async (event, context) => {
    calls.push({ event, context });
    return { ok: true, delivered: true };
  });

  assert.equal(schedule(app).ok, true);
  const first = await app.processScheduledWorldTimeEvents({
    previousTimeIso: "2109-02-13T10:00:00.000Z",
    currentTimeIso: "2109-02-13T13:00:00.000Z",
    campaignTimeRevision: 4
  });
  const replay = await app.processScheduledWorldTimeEvents({
    previousTimeIso: "2109-02-13T10:00:00.000Z",
    currentTimeIso: "2109-02-13T13:00:00.000Z",
    campaignTimeRevision: 4
  });

  assert.equal(first.completed, 1);
  assert.equal(replay.completed, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].context.executionKey, "event-a::test-handler::2109-02-13T11:00:00.000Z");
  const event = app.getWorldTimeScheduledEvent("event-a");
  assert.equal(event.status, "COMPLETED");
  assert.equal(event.executedAt, "2109-02-13T11:00:00.000Z");
  assert.equal(event.processedAtCampaignTime, "2109-02-13T13:00:00.000Z");
  assert.equal(app.getWorldTimeScheduledEventsDiagnostics().receiptCount, 1);
});

test("due events execute in chronological order", async () => {
  const { runtime } = createRuntime();
  const app = runtime.window.WS_APP;
  const order = [];
  app.registerWorldTimeScheduledEventHandler("test-handler", (event) => {
    order.push(event.eventId);
    return { ok: true };
  });

  schedule(app, { eventId: "event-late", scheduledAt: "2109-02-13T12:20:00.000Z" });
  schedule(app, { eventId: "event-early", scheduledAt: "2109-02-13T10:20:00.000Z" });
  schedule(app, { eventId: "event-middle", scheduledAt: "2109-02-13T11:20:00.000Z" });

  const result = await app.processScheduledWorldTimeEvents({
    previousTimeIso: "2109-02-13T10:00:00.000Z",
    currentTimeIso: "2109-02-13T13:00:00.000Z"
  });

  assert.equal(result.completed, 3);
  assert.deepEqual(order, ["event-early", "event-middle", "event-late"]);
});

test("a handler may schedule another due event that executes during the same skip", async () => {
  const { runtime } = createRuntime();
  const app = runtime.window.WS_APP;
  const order = [];
  app.registerWorldTimeScheduledEventHandler("test-handler", (event, context) => {
    order.push(event.eventId);
    if (event.eventId === "event-parent") {
      const nested = context.scheduleWorldTimeEvent({
        eventId: "event-child",
        idempotencyKey: "event-child",
        eventType: "TEST",
        handlerId: "test-handler",
        scheduledAt: "2109-02-13T11:30:00.000Z"
      });
      assert.equal(nested.ok, true);
    }
    return { ok: true };
  });

  schedule(app, { eventId: "event-parent", scheduledAt: "2109-02-13T11:00:00.000Z" });
  const result = await app.processScheduledWorldTimeEvents({
    previousTimeIso: "2109-02-13T10:00:00.000Z",
    currentTimeIso: "2109-02-13T13:00:00.000Z"
  });

  assert.equal(result.completed, 2);
  assert.deepEqual(order, ["event-parent", "event-child"]);
  assert.equal(app.getWorldTimeScheduledEvent("event-child").status, "COMPLETED");
});

test("missing handlers block without deleting or failing the queued event", async () => {
  const { runtime } = createRuntime();
  const app = runtime.window.WS_APP;
  schedule(app, { eventId: "event-blocked", handlerId: "lazy-handler" });

  const blocked = await app.processScheduledWorldTimeEvents({
    previousTimeIso: "2109-02-13T10:00:00.000Z",
    currentTimeIso: "2109-02-13T13:00:00.000Z"
  });
  assert.equal(blocked.blocked, 1);
  assert.equal(app.getWorldTimeScheduledEvent("event-blocked").status, "SCHEDULED");

  let calls = 0;
  app.registerWorldTimeScheduledEventHandler("lazy-handler", () => {
    calls += 1;
    return { ok: true };
  }, { reconcileDue: false });
  const reconciled = await app.reconcileWorldTimeScheduledEvents({ currentTimeIso: "2109-02-13T13:00:00.000Z" });
  assert.equal(reconciled.completed, 1);
  assert.equal(calls, 1);
});

test("failed events retry with the same stable execution key", async () => {
  const { runtime } = createRuntime();
  const app = runtime.window.WS_APP;
  const executionKeys = [];
  let shouldFail = true;
  app.registerWorldTimeScheduledEventHandler("test-handler", (event, context) => {
    executionKeys.push(context.executionKey);
    if (shouldFail) return { ok: false, reason: "TRANSIENT_FAILURE" };
    return { ok: true, recovered: true };
  });
  schedule(app, { eventId: "event-retry", maxAttempts: 3 });

  const failed = await app.processScheduledWorldTimeEvents({
    previousTimeIso: "2109-02-13T10:00:00.000Z",
    currentTimeIso: "2109-02-13T13:00:00.000Z"
  });
  assert.equal(failed.failed, 1);
  assert.equal(app.getWorldTimeScheduledEvent("event-retry").status, "FAILED");

  shouldFail = false;
  const retry = app.retryWorldTimeScheduledEvent("event-retry");
  assert.equal(retry.ok, true);
  const completed = await app.reconcileWorldTimeScheduledEvents({ currentTimeIso: "2109-02-13T13:00:00.000Z" });
  assert.equal(completed.completed, 1);
  assert.equal(app.getWorldTimeScheduledEvent("event-retry").status, "COMPLETED");
  assert.deepEqual(executionKeys, [
    "event-retry::test-handler::2109-02-13T11:00:00.000Z",
    "event-retry::test-handler::2109-02-13T11:00:00.000Z"
  ]);
});

test("schedule commands are idempotent and reject changed signatures", () => {
  const { runtime } = createRuntime();
  const app = runtime.window.WS_APP;
  const first = schedule(app, { eventId: "event-idempotent" });
  const replay = schedule(app, { eventId: "event-idempotent" });
  const conflict = schedule(app, {
    eventId: "event-idempotent",
    scheduledAt: "2109-02-13T12:00:00.000Z"
  });

  assert.equal(first.reason, "SCHEDULED_EVENT_CREATED");
  assert.equal(replay.reason, "SCHEDULED_EVENT_REPLAY");
  assert.equal(replay.replayed, true);
  assert.equal(conflict.ok, false);
  assert.equal(conflict.reason, "SCHEDULED_EVENT_IDEMPOTENCY_CONFLICT");
  assert.equal(app.getWorldTimeScheduledEvents().length, 1);

  const rescheduled = app.rescheduleWorldTimeScheduledEvent("event-idempotent", "2109-02-13T12:30:00.000Z");
  assert.equal(rescheduled.ok, true);
  const originalCommandReplay = schedule(app, { eventId: "event-idempotent" });
  assert.equal(originalCommandReplay.reason, "SCHEDULED_EVENT_REPLAY");
  assert.equal(originalCommandReplay.event.scheduledAt, "2109-02-13T12:30:00.000Z");
});

test("event-window resolution can persist a deterministic event inside a skip", () => {
  const { runtime } = createRuntime();
  const app = runtime.window.WS_APP;
  const campaignEvent = {
    detail: {
      previousTimeIso: "2109-02-13T10:00:00.000Z",
      currentTimeIso: "2109-02-13T13:00:00.000Z"
    }
  };
  const first = app.scheduleWorldTimeEventDuringAdvance(campaignEvent, {
    eventId: "event-windowed",
    idempotencyKey: "event-windowed",
    handlerId: "test-handler",
    eventType: "MESSAGE",
    timePolicy: { type: "ANYTIME" }
  });
  const replay = app.scheduleWorldTimeEventDuringAdvance(campaignEvent, {
    eventId: "event-windowed",
    idempotencyKey: "event-windowed",
    handlerId: "test-handler",
    eventType: "MESSAGE",
    timePolicy: { type: "ANYTIME" }
  });

  assert.equal(first.ok, true);
  assert.ok(first.event.scheduledAt >= "2109-02-13T10:01:00.000Z");
  assert.ok(first.event.scheduledAt <= "2109-02-13T12:59:00.000Z");
  assert.equal(replay.reason, "SCHEDULED_EVENT_REPLAY");
  assert.equal(first.event.scheduledAt, replay.event.scheduledAt);
});

test("PROCESSING records recover to the scheduled queue after reload", () => {
  const stored = {
    schemaVersion: 1,
    schedulerSchemaVersion: "world_time_scheduled_events_2_3x",
    revision: 7,
    events: [{
      eventId: "event-interrupted",
      idempotencyKey: "event-interrupted",
      eventType: "TEST",
      handlerId: "test-handler",
      scheduledAt: "2109-02-13T11:00:00.000Z",
      status: "PROCESSING",
      revision: 2,
      attemptCount: 1,
      createdAt: "2109-02-13T10:00:00.000Z",
      updatedAt: "2109-02-13T11:00:00.000Z"
    }],
    receipts: []
  };
  const { runtime } = createRuntime("2109-02-13T13:00:00.000Z", {
    storageSeed: {
      ws_world_time_scheduled_events_schema: "world_time_scheduled_events_2_3x",
      ws_world_time_scheduled_events_v1: JSON.stringify(stored)
    }
  });
  const event = runtime.window.WS_APP.getWorldTimeScheduledEvent("event-interrupted");
  assert.equal(event.status, "SCHEDULED");
  assert.equal(event.lastError.code, "SCHEDULED_EVENT_INTERRUPTED_RECOVERED");
  assert.equal(event.revision, 3);
});

test("Campaign Time listener waits one microtask so synchronous producers can enqueue inside the same skip", async () => {
  const { runtime } = createRuntime();
  const app = runtime.window.WS_APP;
  let calls = 0;
  app.registerWorldTimeScheduledEventHandler("campaign-handler", () => {
    calls += 1;
    return { ok: true };
  }, { reconcileDue: false });

  runtime.window.addEventListener("ws:campaign-time-updated", (event) => {
    const result = app.scheduleWorldTimeEventDuringAdvance(event, {
      eventId: "event-from-campaign-listener",
      idempotencyKey: "event-from-campaign-listener",
      eventType: "TEST",
      handlerId: "campaign-handler",
      timePolicy: { type: "ANYTIME" }
    });
    assert.equal(result.ok, true);
  });

  runtime.window.dispatchEvent(new runtime.window.CustomEvent("ws:campaign-time-updated", {
    detail: {
      previousTimeIso: "2109-02-13T10:00:00.000Z",
      currentTimeIso: "2109-02-13T13:00:00.000Z",
      revision: 8,
      reason: "TEST_SKIP"
    }
  }));

  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  assert.equal(app.getWorldTimeScheduledEvent("event-from-campaign-listener").status, "COMPLETED");
});
