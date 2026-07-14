"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createRuntime() {
  const runtime = createBrowserRuntime();
  runtime.load("js/world-time-event-windows.js");
  return runtime;
}

const DAILY_06_20 = {
  daily: [{ start: "06:00", end: "20:00" }]
};

test("event time resolver creates a stable interior minute during a 10:00 to 13:00 skip", () => {
  const runtime = createRuntime();
  const input = {
    previousTimeIso: "2109-02-13T10:00:00.000Z",
    currentTimeIso: "2109-02-13T13:00:00.000Z",
    eventId: "terminal-message:test-1",
    policy: { type: "ANYTIME" }
  };

  const first = runtime.window.WS_APP.resolveEventTimeWithinAdvance(input);
  const replay = runtime.window.WS_APP.resolveEventTimeWithinAdvance(input);

  assert.equal(first.ok, true);
  assert.equal(first.status, "RESOLVED");
  assert.equal(first.withinAdvance, true);
  assert.match(first.eventTimeIso, /^2109-02-13T\d{2}:\d{2}:00\.000Z$/);
  assert.ok(first.eventTimeIso >= "2109-02-13T10:01:00.000Z");
  assert.ok(first.eventTimeIso <= "2109-02-13T12:59:00.000Z");
  assert.equal(first.candidateMinutes, 179);
  assert.equal(first.eventTimeIso, replay.eventTimeIso);
  assert.equal(first.resolutionKey, replay.resolutionKey);
});

test("business hours intersect a larger Campaign Time advance", () => {
  const runtime = createRuntime();
  const result = runtime.window.WS_APP.resolveEventTimeWithinAdvance({
    previousTimeIso: "2109-02-13T05:00:00.000Z",
    currentTimeIso: "2109-02-13T22:00:00.000Z",
    eventId: "delivery:test-1",
    policy: {
      type: "BUSINESS_HOURS",
      operatingHours: DAILY_06_20
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "RESOLVED");
  assert.ok(result.eventTimeIso >= "2109-02-13T06:00:00.000Z");
  assert.ok(result.eventTimeIso <= "2109-02-13T19:59:00.000Z");
  assert.equal(runtime.window.WS_APP.isWithinOperatingHours(result.eventTimeIso, DAILY_06_20), true);
});

test("NEXT_AVAILABLE defers an event outside business hours to the next open window", () => {
  const runtime = createRuntime();
  const result = runtime.window.WS_APP.resolveEventTimeWithinAdvance({
    previousTimeIso: "2109-02-13T21:00:00.000Z",
    currentTimeIso: "2109-02-13T23:00:00.000Z",
    eventId: "delivery:test-2",
    policy: {
      type: "NEXT_AVAILABLE",
      operatingHours: DAILY_06_20
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "DEFERRED");
  assert.equal(result.deferred, true);
  assert.equal(result.withinAdvance, false);
  assert.ok(result.eventTimeIso >= "2109-02-14T06:00:00.000Z");
  assert.ok(result.eventTimeIso <= "2109-02-14T19:59:00.000Z");
});

test("weekly operating hours skip a closed day", () => {
  const runtime = createRuntime();
  const result = runtime.window.WS_APP.resolveEventTimeWithinAdvance({
    previousTimeIso: "2109-02-15T16:00:00.000Z",
    currentTimeIso: "2109-02-15T18:00:00.000Z",
    eventId: "office:test-1",
    policy: {
      type: "NEXT_AVAILABLE",
      operatingHours: {
        monday: [{ start: "07:00", end: "15:00" }],
        tuesday: [{ start: "07:00", end: "15:00" }],
        wednesday: [{ start: "07:00", end: "15:00" }],
        thursday: [{ start: "07:00", end: "15:00" }],
        friday: [{ start: "07:00", end: "15:00" }]
      }
    }
  });

  assert.equal(new Date("2109-02-15T12:00:00.000Z").getUTCDay(), 5);
  assert.equal(result.status, "DEFERRED");
  assert.ok(result.eventTimeIso >= "2109-02-18T07:00:00.000Z");
  assert.ok(result.eventTimeIso <= "2109-02-18T14:59:00.000Z");
});

test("overnight windows remain open across midnight", () => {
  const runtime = createRuntime();
  const hours = { daily: [{ start: "16:00", end: "02:00" }] };
  const windows = runtime.window.WS_APP.getOperatingWindowsWithinAdvance({
    previousTimeIso: "2109-02-13T23:00:00.000Z",
    currentTimeIso: "2109-02-14T01:00:00.000Z",
    operatingHours: hours
  });

  assert.equal(windows.length, 1);
  assert.equal(windows[0].startTimeIso, "2109-02-13T23:01:00.000Z");
  assert.equal(windows[0].endTimeIso, "2109-02-14T01:00:00.000Z");
  assert.equal(runtime.window.WS_APP.isWithinOperatingHours("2109-02-14T01:30:00.000Z", hours), true);
  assert.equal(runtime.window.WS_APP.isWithinOperatingHours("2109-02-14T03:00:00.000Z", hours), false);
});

test("EXACT policy resolves a due clock occurrence without a random seed", () => {
  const runtime = createRuntime();
  const result = runtime.window.WS_APP.resolveEventTimeWithinAdvance({
    previousTimeIso: "2109-02-13T10:00:00.000Z",
    currentTimeIso: "2109-02-13T13:00:00.000Z",
    policy: { type: "EXACT", at: "12:30" }
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason, "EVENT_TIME_EXACT_RESOLVED");
  assert.equal(result.eventTimeIso, "2109-02-13T12:30:00.000Z");
});

test("randomized policies reject unstable calls without an event identity", () => {
  const runtime = createRuntime();
  const result = runtime.window.WS_APP.resolveEventTimeWithinAdvance({
    previousTimeIso: "2109-02-13T10:00:00.000Z",
    currentTimeIso: "2109-02-13T13:00:00.000Z",
    policy: { type: "ANYTIME" }
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "EVENT_TIME_STABLE_KEY_REQUIRED");
});

test("campaign event adapter reads the canonical time-update payload", () => {
  const runtime = createRuntime();
  const result = runtime.window.WS_APP.resolveEventTimeFromCampaignEvent({
    detail: {
      previousTimeIso: "2109-02-13T10:00:00.000Z",
      currentTimeIso: "2109-02-13T13:00:00.000Z"
    }
  }, {
    eventId: "terminal-message:test-2",
    policy: { type: "ANYTIME" }
  });

  assert.equal(result.ok, true);
  assert.ok(result.eventTimeIso > "2109-02-13T10:00:00.000Z");
  assert.ok(result.eventTimeIso < "2109-02-13T13:00:00.000Z");
});
