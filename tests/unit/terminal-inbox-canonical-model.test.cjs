"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createRuntime() {
  const runtime = createBrowserRuntime({
    appData: { citizens: [] },
    wsApp: {
      getCampaignTimeIso: () => "2109-02-13T10:00:00.000Z",
      getCampaignDateIso: () => "2109-02-13",
      currentUser: { login: "admin", role: "admin" }
    }
  });
  runtime.loadMany([
    "js/store-utils.js",
    "js/service-log-lifecycle.js",
    "data/inbox-notification-types.js",
    "data/notification-event-catalog.js",
    "js/terminal-entry-store.js",
    "js/terminal-reminder-store.js",
    "js/citizen-subscription-adapter.js",
    "js/store.js"
  ]);
  return runtime;
}

test("legacy Inbox records migrate once into the canonical v4 identity and action model", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;

  app.importTerminalEntries([{
    schemaVersion: 1,
    id: "entry-legacy-debt",
    citizenId: "citizen-a",
    type: "BILLING",
    subtype: "DEBT_INCREASED",
    title: "Debt increased",
    links: [{
      label: "OPEN BILLING",
      module: "terminal-hub",
      panel: "billing",
      entityRef: { type: "DEBT_ACCOUNT", id: "debt-a" }
    }],
    date: "2109-02-12"
  }]);

  const [entry] = app.TerminalEntryStore.readEntries();
  assert.equal(entry.schemaVersion, 4);
  assert.equal(entry.domain, "BILLING");
  assert.equal(entry.category, "DEBT");
  assert.equal(entry.eventCode, "BILLING.DEBT_INCREASED");
  assert.equal(entry.actions.length, 1);
  assert.equal(entry.actions[0].module, "terminal-hub");
  assert.equal(entry.actions[0].panel, "billing");
  assert.equal(entry.actions[0].entityRef.type, "DEBT_ACCOUNT");
  assert.equal(entry.actions[0].entityRef.id, "debt-a");

  const persistedAfterFirstRead = runtime.storage.getItem("ws_app_terminal_entries_v1");
  const secondRead = app.TerminalEntryStore.readEntries();
  assert.equal(secondRead.length, 1);
  assert.equal(runtime.storage.getItem("ws_app_terminal_entries_v1"), persistedAfterFirstRead);
});

test("catalog identity overrides stale legacy aliases during canonical migration", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;

  app.importTerminalEntries([{
    schemaVersion: 3,
    id: "entry-market-order",
    citizenId: "citizen-a",
    eventCode: "MARKET.ORDER.COMPLETED",
    domain: "SYSTEM",
    category: "NOTICE",
    type: "SYSTEM",
    subtype: "SYSTEM_NOTICE",
    title: "Order completed"
  }]);

  const [entry] = app.TerminalEntryStore.readEntries();
  assert.equal(entry.schemaVersion, 4);
  assert.equal(entry.domain, "MARKET");
  assert.equal(entry.category, "ORDER");
  assert.equal(entry.eventCode, "MARKET.ORDER.COMPLETED");
});
