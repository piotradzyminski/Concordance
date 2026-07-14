"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createCampaignRuntime(options = {}) {
  const runtime = createBrowserRuntime(options);
  runtime.document.documentElement.style.setProperty = () => {};
  runtime.load("js/main.js");
  return runtime;
}

test("Campaign Time defaults to midnight and exposes date as a compatibility projection", () => {
  const runtime = createCampaignRuntime();
  const app = runtime.window.WS_APP;

  assert.equal(app.getCampaignTimeIso(), "2109-02-13T00:00:00.000Z");
  assert.equal(app.getCampaignDateIso(), "2109-02-13");
  assert.equal(app.getCampaignTimeLabel(), "13.02.2109 / 00:00");
  assert.equal(app.getCampaignDayPhase(), "NIGHT");
  assert.equal(runtime.storage.getItem("ws_app_campaign_time_iso_v1"), "2109-02-13T00:00:00.000Z");
  assert.equal(runtime.storage.getItem("ws_app_campaign_date_iso_v1"), "2109-02-13");
});

test("Campaign Time migrates the legacy date key to midnight", () => {
  const runtime = createCampaignRuntime({
    storageSeed: {
      ws_app_campaign_date_iso_v1: "2110-04-09"
    }
  });

  assert.equal(runtime.window.WS_APP.getCampaignTimeIso(), "2110-04-09T00:00:00.000Z");
  assert.equal(runtime.storage.getItem("ws_app_campaign_time_iso_v1"), "2110-04-09T00:00:00.000Z");
});

test("Setting a campaign date resets its clock to 00:00", () => {
  const runtime = createCampaignRuntime({
    storageSeed: {
      ws_app_campaign_time_iso_v1: "2109-02-13T18:45:00.000Z"
    }
  });
  const app = runtime.window.WS_APP;

  assert.equal(app.setCampaignDateIso("2109-02-14"), true);
  assert.equal(app.getCampaignTimeIso(), "2109-02-14T00:00:00.000Z");
  assert.equal(app.getCampaignDateIso(), "2109-02-14");
});

test("Advancing hours emits time updates while date updates remain day-boundary events", () => {
  const runtime = createCampaignRuntime();
  const app = runtime.window.WS_APP;
  const timeEvents = [];
  const dateEvents = [];
  runtime.window.addEventListener("ws:campaign-time-updated", (event) => timeEvents.push(event.detail));
  runtime.window.addEventListener("ws:campaign-date-updated", (event) => dateEvents.push(event.detail));

  const sameDay = app.advanceCampaignTime({ hours: 6, reason: "TEST_ADVANCE", idempotencyKey: "time:test:1" });
  assert.equal(sameDay.ok, true);
  assert.equal(app.getCampaignTimeIso(), "2109-02-13T06:00:00.000Z");
  assert.equal(app.getCampaignDayPhase(), "MORNING");
  assert.equal(timeEvents.length, 1);
  assert.equal(dateEvents.length, 0);
  assert.equal(timeEvents[0].advancedMinutes, 360);

  const nextDay = app.advanceCampaignTime({ hours: 20, reason: "TEST_ADVANCE", idempotencyKey: "time:test:2" });
  assert.equal(nextDay.ok, true);
  assert.equal(app.getCampaignTimeIso(), "2109-02-14T02:00:00.000Z");
  assert.equal(timeEvents.length, 2);
  assert.equal(dateEvents.length, 1);
  assert.equal(dateEvents[0].campaignTimeEventDispatched, true);
  assert.equal(dateEvents[0].campaignDateIso, "2109-02-14");
});

test("Campaign Time uses revision guards, forward-only advance and idempotent replay", () => {
  const runtime = createCampaignRuntime();
  const app = runtime.window.WS_APP;

  const conflict = app.advanceCampaignTime({ hours: 1, expectedRevision: 7 });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.reason, "CAMPAIGN_TIME_REVISION_CONFLICT");

  const first = app.advanceCampaignTime({ hours: 1, expectedRevision: 0, idempotencyKey: "time:guard:1" });
  assert.equal(first.ok, true);
  assert.equal(first.revision, 1);

  const replay = app.advanceCampaignTime({ hours: 9, idempotencyKey: "time:guard:1" });
  assert.equal(replay.ok, true);
  assert.equal(replay.replayed, true);
  assert.equal(app.getCampaignTimeIso(), "2109-02-13T01:00:00.000Z");

  const backward = app.advanceCampaignTime({ targetTimeIso: "2109-02-13T00:30:00.000Z" });
  assert.equal(backward.ok, false);
  assert.equal(backward.reason, "CAMPAIGN_TIME_BACKWARD_NOT_ALLOWED");
});
