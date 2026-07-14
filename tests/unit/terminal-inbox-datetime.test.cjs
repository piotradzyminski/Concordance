"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createStoreRuntime(initialTime = "2109-02-13T10:00:00.000Z") {
  let campaignTimeIso = initialTime;
  const runtime = createBrowserRuntime({
    appData: { citizens: [] },
    wsApp: {
      getCampaignTimeIso: () => campaignTimeIso,
      getCampaignDateIso: () => campaignTimeIso.slice(0, 10),
      currentUser: { login: "admin", role: "admin" }
    }
  });
  runtime.loadMany([
    "js/store-utils.js",
    "js/service-log-lifecycle.js",
    "js/terminal-entry-store.js",
    "js/terminal-reminder-store.js",
    "js/store.js"
  ]);
  return {
    runtime,
    setCampaignTime(value) { campaignTimeIso = value; }
  };
}

function makeRegistry() {
  const event = {
    eventCode: "SYSTEM.NOTICE",
    label: "System notice",
    domain: "SYSTEM",
    category: "NOTICE",
    legacyType: "SYSTEM",
    legacySubtype: "SYSTEM_NOTICE",
    defaultSeverity: "INFO",
    defaultAttention: "INBOX",
    defaultAudience: ["PLAYER"],
    subjectTypes: [],
    requiredData: [],
    providerRequired: false,
    templateId: "",
    actions: [],
    retentionPolicy: { mode: "BOUNDED" },
    aggregationPolicy: { mode: "REPLACE_EXISTING", keyFields: ["citizenId", "eventCode", "eventId"] }
  };
  return {
    normalizeEventCode: (value) => String(value || "").trim().toUpperCase(),
    getEvent: (eventCode) => eventCode === event.eventCode ? structuredClone(event) : null,
    normalizeAudience: (audience) => Array.isArray(audience) ? [...audience] : [String(audience || "PLAYER")],
    resolveProvider: () => null,
    providerSupportsEvent: () => true,
    pushDiagnostic() {},
    getProviders: () => []
  };
}

test("new Terminal Inbox entries use Campaign Time for created, sent and received timestamps", () => {
  const { runtime } = createStoreRuntime("2109-02-13T10:42:00.000Z");
  const entry = runtime.window.WS_APP.addTerminalEntry("citizen-a", {
    id: "entry-datetime-a",
    type: "SYSTEM",
    subtype: "SYSTEM_NOTICE",
    title: "Campaign timestamp"
  });

  assert.equal(entry.schemaVersion, 3);
  assert.equal(entry.createdAt, "2109-02-13T10:42:00.000Z");
  assert.equal(entry.sentAt, "2109-02-13T10:42:00.000Z");
  assert.equal(entry.receivedAt, "2109-02-13T10:42:00.000Z");
  assert.equal(entry.date, "2109-02-13");
  assert.equal(entry.readAt, "");
});

test("legacy date-only Inbox records migrate to midnight without losing the day", () => {
  const { runtime } = createStoreRuntime();
  runtime.window.WS_APP.importTerminalEntries([{
    id: "entry-legacy-date",
    citizenId: "citizen-a",
    type: "SYSTEM",
    subtype: "SYSTEM_NOTICE",
    date: "2109-02-12",
    read: false
  }]);

  const [entry] = runtime.window.WS_APP.TerminalEntryStore.readEntries();
  assert.equal(entry.occurredAt, "2109-02-12T00:00:00.000Z");
  assert.equal(entry.createdAt, "2109-02-12T00:00:00.000Z");
  assert.equal(entry.sentAt, "2109-02-12T00:00:00.000Z");
  assert.equal(entry.receivedAt, "2109-02-12T00:00:00.000Z");
  assert.equal(entry.date, "2109-02-12");
});

test("reading a Terminal Inbox entry records readAt using current Campaign Time", () => {
  const context = createStoreRuntime("2109-02-13T10:42:00.000Z");
  const app = context.runtime.window.WS_APP;
  app.addTerminalEntry("citizen-a", { id: "entry-read-time", title: "Read time" });

  context.setCampaignTime("2109-02-13T12:15:00.000Z");
  assert.equal(app.markTerminalEntryRead("citizen-a", "entry-read-time", true), true);
  const [entry] = app.TerminalEntryStore.readEntries();

  assert.equal(entry.read, true);
  assert.equal(entry.readAt, "2109-02-13T12:15:00.000Z");
  assert.equal(entry.lifecycle.status, "READ");
  assert.equal(entry.lifecycle.readAt, "2109-02-13T12:15:00.000Z");
});

test("notification emitted during a Campaign Time skip receives one stable interior timestamp", () => {
  const context = createStoreRuntime("2109-02-13T13:00:00.000Z");
  const runtime = context.runtime;
  runtime.window.WS_APP.notificationRegistry = makeRegistry();
  runtime.loadMany(["js/world-time-event-windows.js", "js/notification-api.js"]);

  const campaignEvent = {
    detail: {
      previousTimeIso: "2109-02-13T10:00:00.000Z",
      currentTimeIso: "2109-02-13T13:00:00.000Z"
    }
  };
  const input = {
    citizenId: "citizen-a",
    eventCode: "SYSTEM.NOTICE",
    eventId: "message-during-skip-1",
    revision: 1,
    title: "Skip message",
    summary: "Generated while time advanced.",
    timePolicy: { type: "ANYTIME" }
  };

  const first = runtime.window.TerminalNotifications.emitDuringCampaignAdvance(campaignEvent, input);
  const replay = runtime.window.TerminalNotifications.emitDuringCampaignAdvance(campaignEvent, input);

  assert.equal(first.ok, true);
  assert.equal(first.operation, "CREATED");
  assert.equal(replay.ok, true);
  assert.equal(replay.operation, "IGNORED_DUPLICATE");
  assert.equal(first.entry.receivedAt, replay.entry.receivedAt);
  assert.ok(first.entry.receivedAt >= "2109-02-13T10:01:00.000Z");
  assert.ok(first.entry.receivedAt <= "2109-02-13T12:59:00.000Z");
  assert.equal(first.entry.createdAt, first.entry.receivedAt);
  assert.equal(first.entry.sentAt, first.entry.receivedAt);
  assert.equal(first.entry.occurredAt, first.entry.receivedAt);
});
