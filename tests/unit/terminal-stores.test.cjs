"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function normalizeToken(value, fallback = "SYSTEM") {
  const normalized = String(value || fallback).trim().toUpperCase();
  return normalized || fallback;
}

function createEntryNormalizer(utils) {
  return (entry = {}) => ({
    id: String(entry.id || utils.makeStoreId("entry")),
    citizenId: String(entry.citizenId || ""),
    audience: Array.isArray(entry.audience) ? entry.audience : [entry.audience || "PLAYER"],
    folder: String(entry.folder || "INBOX").toUpperCase() === "TRASH" ? "TRASH" : "INBOX",
    read: entry.read === true,
    important: entry.important === true,
    revision: Math.max(1, Number(entry.revision || 1) || 1),
    eventId: String(entry.eventId || ""),
    dedupeKey: String(entry.dedupeKey || ""),
    createdAt: String(entry.createdAt || utils.getLocalCreatedAt()),
    sortIndex: Number(entry.sortIndex || utils.getNextSortIndex())
  });
}

test("Terminal Entry Store owns persistence and lifecycle mutations behind the legacy API", () => {
  const runtime = createBrowserRuntime();
  runtime.loadMany(["js/store-utils.js", "js/terminal-entry-store.js"]);
  const utils = runtime.window.WS_APP.storeUtils;
  const store = runtime.window.WS_APP.createTerminalEntryStore({
    ...utils,
    normalizeEntry: createEntryNormalizer(utils),
    normalizeToken
  });

  const first = runtime.window.WS_APP.addTerminalEntry("citizen-a", {
    id: "entry-a",
    eventId: "event-a",
    revision: 1
  });
  assert.equal(first.id, "entry-a");
  assert.equal(runtime.window.WS_APP.countUnreadTerminalEntries("citizen-a"), 1);

  const duplicate = runtime.window.WS_APP.upsertTerminalEntry("citizen-a", {
    eventId: "event-a",
    revision: 1
  });
  assert.equal(duplicate.operation, "IGNORED_DUPLICATE");

  const updated = runtime.window.WS_APP.upsertTerminalEntry("citizen-a", {
    eventId: "event-a",
    revision: 2,
    important: true
  });
  assert.equal(updated.operation, "UPDATED_EXISTING");
  assert.equal(updated.entry.important, true);

  assert.equal(runtime.window.WS_APP.markTerminalEntryRead("citizen-a", "entry-a", true), true);
  assert.equal(runtime.window.WS_APP.countUnreadTerminalEntries("citizen-a"), 0);
  assert.equal(runtime.window.WS_APP.moveTerminalEntryToTrash("citizen-a", "entry-a"), true);
  assert.equal(runtime.window.WS_APP.getTerminalEntries("citizen-a", { folder: "TRASH" }).length, 1);
  assert.equal(runtime.window.WS_APP.restoreTerminalEntryFromTrash("citizen-a", "entry-a"), true);

  const exported = store.readEntries();
  assert.equal(exported.length, 1);
  assert.equal(JSON.parse(runtime.storage.getItem("ws_app_terminal_entries_v1")).length, 1);
});

test("Terminal Reminder Store owns reminder persistence and emits registration plus due notifications once", () => {
  const emitted = [];
  const runtime = createBrowserRuntime({ wsApp: { currentUser: { login: "LOCAL USER" } } });
  runtime.loadMany(["js/store-utils.js", "js/terminal-reminder-store.js"]);
  const utils = runtime.window.WS_APP.storeUtils;
  const store = runtime.window.WS_APP.createTerminalReminderStore({
    clone: utils.clone,
    readStoredArray: utils.readStoredArray,
    writeStoredArray: utils.writeStoredArray,
    makeStoreId: utils.makeStoreId,
    parseCreditNumber: utils.parseCreditNumber,
    getTerminalDateIso: () => "2109-02-13",
    isIsoDate: (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")),
    addDaysIso: (iso, days) => {
      const date = new Date(`${iso}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + Number(days || 0));
      return date.toISOString().slice(0, 10);
    },
    compareIsoDates: (left, right) => String(left).localeCompare(String(right)),
    getCitizenById: (id) => id === "citizen-a" ? { id, recordType: "citizen" } : null,
    emitCalendarNotification: (citizenId, reminder, event) => {
      emitted.push({ citizenId, reminderId: reminder.id, subtype: event.subtype });
      return true;
    }
  });

  const reminder = runtime.window.WS_APP.createTerminalCalendarReminder("citizen-a", {
    id: "reminder-a",
    title: "Medical check",
    date: "2109-02-14",
    notifyDaysBefore: 1
  });
  assert.equal(reminder.id, "reminder-a");
  assert.deepEqual(emitted.map((entry) => entry.subtype), [
    "CALENDAR_REMINDER_REGISTERED",
    "CALENDAR_REMINDER_TRIGGERED"
  ]);

  const secondPass = runtime.window.WS_APP.processTerminalCalendarReminders("2109-02-13");
  assert.equal(secondPass.created, 0);
  assert.equal(runtime.window.WS_APP.closeTerminalCalendarReminder("citizen-a", "reminder-a"), true);
  assert.equal(store.getReminders("citizen-a").length, 0);
  assert.equal(store.getReminders("citizen-a", { includeClosed: true })[0].status, "CLOSED");
});
