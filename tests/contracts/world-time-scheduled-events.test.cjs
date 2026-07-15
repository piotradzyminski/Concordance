"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

const ROOT = path.resolve(__dirname, "../..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const MODULE = fs.readFileSync(path.join(ROOT, "js/world-time-scheduled-events.js"), "utf8");

function scriptPosition(name) {
  return INDEX.indexOf(name);
}

test("Scheduled Events loads eagerly after Event Windows and before domain schedulers", () => {
  const eventWindows = scriptPosition("js/world-time-event-windows.js?v=1");
  const scheduledEvents = scriptPosition("js/world-time-scheduled-events.js?v=1");
  const marketScheduler = scriptPosition("js/market-time-scheduler.js?v=1");
  const serviceScheduler = scriptPosition("js/world-time-service-scheduler.js?v=3");
  assert.ok(eventWindows >= 0);
  assert.ok(scheduledEvents > eventWindows);
  assert.ok(marketScheduler > scheduledEvents);
  assert.ok(serviceScheduler > marketScheduler);
  assert.match(INDEX, /js\/campaign-data-io-adapters\.js\?v=11/);
});

test("Scheduled Events exposes one persistent queue and domain handler boundary", () => {
  assert.match(MODULE, /ws_world_time_scheduled_events_v1/);
  assert.match(MODULE, /scheduleWorldTimeEvent = scheduleWorldTimeEvent/);
  assert.match(MODULE, /registerWorldTimeScheduledEventHandler = registerWorldTimeScheduledEventHandler/);
  assert.match(MODULE, /processScheduledWorldTimeEvents = processScheduledWorldTimeEvents/);
  assert.match(MODULE, /reconcileWorldTimeScheduledEvents = reconcileWorldTimeScheduledEvents/);
  assert.match(MODULE, /SCHEDULED_EVENT_RECEIPT_REPLAY/);
  assert.doesNotMatch(MODULE, /organizationId|locationId|operatingHours/);
});

test("Campaign Data I/O registers Scheduled Events as campaign-persistent state", () => {
  const runtime = createBrowserRuntime();
  runtime.loadMany([
    "js/campaign-data-io-registry.js",
    "js/campaign-data-io-adapters.js"
  ]);
  const adapter = runtime.window.WS_APP.getCampaignDataDomainAdapter("world-time-scheduled-events");
  assert.ok(adapter);
  assert.equal(adapter.schemaVersion, "world_time_scheduled_events_2_3x");
  assert.equal(adapter.classification, "CAMPAIGN_PERSISTENT");
  assert.deepEqual(Array.from(adapter.storageKeys), [
    "ws_world_time_scheduled_events_v1",
    "ws_world_time_scheduled_events_schema"
  ]);
});
