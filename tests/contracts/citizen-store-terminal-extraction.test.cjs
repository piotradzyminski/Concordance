"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const INDEX = read("index.html");
const STORE = read("js/store.js");
const ENTRY_STORE = read("js/terminal-entry-store.js");
const REMINDER_STORE = read("js/terminal-reminder-store.js");
const MODULE = read("js/terminal-module.js");
const CSS = read("css/terminal-module.css");

function scriptPosition(source, name) {
  const position = source.indexOf(name);
  assert.notEqual(position, -1, `${name} must be present`);
  return position;
}

test("Terminal stores load before Citizen Store and Citizen Store delegates ownership", () => {
  const entryPosition = scriptPosition(INDEX, "js/terminal-entry-store.js?v=2");
  const reminderPosition = scriptPosition(INDEX, "js/terminal-reminder-store.js?v=1");
  const citizenStorePosition = scriptPosition(INDEX, "js/store.js?v=147");
  assert.ok(entryPosition < citizenStorePosition);
  assert.ok(reminderPosition < citizenStorePosition);
  assert.match(STORE, /createTerminalEntryStore\(\{/);
  assert.match(STORE, /createTerminalReminderStore\(\{/);
  assert.doesNotMatch(STORE, /const TERMINAL_ENTRIES_STORAGE_KEY/);
  assert.doesNotMatch(STORE, /const CALENDAR_REMINDERS_STORAGE_KEY/);
  assert.doesNotMatch(STORE, /window\.WS_APP\.markTerminalEntryRead\s*=/);
  assert.doesNotMatch(STORE, /window\.WS_APP\.createTerminalCalendarReminder\s*=/);
});

test("Terminal Entry and Reminder stores are the single persistence owners", () => {
  assert.match(ENTRY_STORE, /ws_app_terminal_entries_v1/);
  assert.match(ENTRY_STORE, /window\.WS_APP\.TerminalEntryStore = api/);
  assert.match(ENTRY_STORE, /window\.WS_APP\.updateTerminalEntriesBulk = updateBulk/);
  assert.match(REMINDER_STORE, /ws_app_calendar_reminders_v1/);
  assert.match(REMINDER_STORE, /window\.WS_APP\.TerminalReminderStore = api/);
  assert.match(REMINDER_STORE, /window\.WS_APP\.processTerminalCalendarReminders = processReminders/);
});

test("Inbox folders are a dedicated horizontal navigation row and inactive bulk controls do not reserve space", () => {
  assert.match(MODULE, /<\/header>\s*<nav class="terminal-inbox-filter-tabs system-inline-tabs"/);
  assert.match(MODULE, /aria-label="Terminal entry folders"/);
  assert.match(CSS, /\.terminal-inbox-panel \.terminal-inbox-filter-tabs\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/s);
  assert.match(CSS, /\.terminal-inbox-bulk-actions\.is-disabled\s*\{\s*display:\s*none;/s);
  assert.match(CSS, /@media \(max-width: 1100px\)[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
});
