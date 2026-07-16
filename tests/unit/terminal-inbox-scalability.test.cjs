"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function makeEntries(count) {
  return Array.from({ length: count }, (_, index) => ({
    schemaVersion: 4,
    id: `entry-${String(index + 1).padStart(4, "0")}`,
    citizenId: "citizen-a",
    domain: "SYSTEM",
    category: "NOTICE",
    eventCode: "SYSTEM.NOTICE",
    severity: "INFO",
    lifecycle: { status: "UNREAD" },
    tags: ["SYSTEM"],
    read: false,
    important: false,
    folder: "INBOX",
    date: "2109-02-13",
    sortIndex: count - index
  }));
}

function createRuntime(entries) {
  const runtime = createBrowserRuntime({
    wsApp: {
      currentUser: { login: "player", role: "player", citizenId: "citizen-a" },
      currentModuleId: "terminal-hub",
      terminalInboxView: "ALL",
      terminalInboxTypeFilter: "ALL",
      terminalInboxSort: "NEWEST",
      getTerminalEntries: (_citizenId, options = {}) => options.folder === "TRASH" ? [] : entries,
      notificationRegistry: { getEvents: () => [] }
    }
  });
  runtime.load("js/terminal-module.js");
  return runtime.window.WS_APP;
}

for (const size of [50, 250, 1000]) {
  test(`initial Inbox window remains bounded for ${size} fixture entries`, () => {
    const app = createRuntime(makeEntries(size));
    const model = app.getTerminalInboxProjectionModel({ id: "citizen-a" });
    assert.equal(model.filteredEntries.length, size);
    assert.equal(model.visibleEntries.length, Math.min(50, size));
    assert.equal(model.hasMore, size > 50);
  });
}

test("pagination expands in deterministic 50-entry increments", () => {
  const app = createRuntime(makeEntries(250));
  const first = app.getTerminalInboxProjectionModel({ id: "citizen-a" });
  app.expandTerminalInboxPagination("citizen-a", first.signature);
  const second = app.getTerminalInboxProjectionModel({ id: "citizen-a" });
  app.expandTerminalInboxPagination("citizen-a", second.signature);
  const third = app.getTerminalInboxProjectionModel({ id: "citizen-a" });

  assert.equal(first.visibleEntries.length, 50);
  assert.equal(second.visibleEntries.length, 100);
  assert.equal(third.visibleEntries.length, 150);
});

test("changing the filter signature resets the render window", () => {
  const entries = makeEntries(250);
  entries.slice(0, 125).forEach((entry) => { entry.important = true; });
  const app = createRuntime(entries);
  const first = app.getTerminalInboxProjectionModel({ id: "citizen-a" });
  app.expandTerminalInboxPagination("citizen-a", first.signature);
  assert.equal(app.getTerminalInboxProjectionModel({ id: "citizen-a" }).visibleEntries.length, 100);

  app.terminalInboxView = "IMPORTANT";
  const filtered = app.getTerminalInboxProjectionModel({ id: "citizen-a" });
  assert.equal(filtered.filteredEntries.length, 125);
  assert.equal(filtered.visibleEntries.length, 50);
});
