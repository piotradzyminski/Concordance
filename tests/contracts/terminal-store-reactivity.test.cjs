"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

const ROOT = path.resolve(__dirname, "../..");
const MODULE_SOURCE = fs.readFileSync(path.join(ROOT, "js/terminal-module.js"), "utf8");

function getFunctionSource(name) {
  const start = MODULE_SOURCE.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const next = MODULE_SOURCE.indexOf("\n  function ", start + 1);
  return MODULE_SOURCE.slice(start, next === -1 ? MODULE_SOURCE.length : next);
}

test("Terminal store reactivity observes both canonical store events", () => {
  assert.match(MODULE_SOURCE, /entries:\s*"ws:terminal-entries-updated"/);
  assert.match(MODULE_SOURCE, /reminders:\s*"ws:calendar-reminders-updated"/);
  assert.match(MODULE_SOURCE, /initTerminalStoreReactivity\(\);/);
  assert.match(MODULE_SOURCE, /destroyTerminalStoreReactivity/);
});

test("Terminal entry and reminder events have isolated render boundaries", () => {
  const entriesRefresh = getFunctionSource("refreshTerminalEntriesProjection");
  const calendarRefresh = getFunctionSource("refreshTerminalCalendarProjection");

  assert.match(entriesRefresh, /refreshTerminalPanelNavigationProjection/);
  assert.match(entriesRefresh, /refreshTerminalPanelContentProjection/);
  assert.match(entriesRefresh, /context\.activePanel === "inbox"/);
  assert.doesNotMatch(entriesRefresh, /renderTerminalCalendar\(/);
  assert.doesNotMatch(entriesRefresh, /refreshTerminalCalendarProjection/);

  assert.match(calendarRefresh, /renderTerminalCalendar\(citizen\)/);
  assert.doesNotMatch(calendarRefresh, /renderTerminalPanelContent\(/);
  assert.doesNotMatch(calendarRefresh, /renderTerminalInboxPanel\(/);
});

test("Store refreshes are coalesced and stale queued work is skipped after a direct render", () => {
  const schedule = getFunctionSource("scheduleTerminalStoreRefresh");
  const flush = getFunctionSource("flushTerminalStoreRefresh");

  assert.match(schedule, /state\.refreshScheduled/);
  assert.match(schedule, /state\.expectedRevision = state\.renderRevision/);
  assert.match(schedule, /queueMicrotask|Promise\.resolve/);
  assert.match(flush, /state\.expectedRevision !== state\.renderRevision/);
});

test("Terminal store listeners remain singleton across repeated lazy module evaluation", () => {
  const runtime = createBrowserRuntime();
  runtime.load("js/terminal-module.js");

  assert.equal(runtime.window._listeners.get("ws:terminal-entries-updated")?.length, 1);
  assert.equal(runtime.window._listeners.get("ws:calendar-reminders-updated")?.length, 1);

  runtime.load("js/terminal-module.js");
  assert.equal(runtime.window._listeners.get("ws:terminal-entries-updated")?.length, 1);
  assert.equal(runtime.window._listeners.get("ws:calendar-reminders-updated")?.length, 1);

  assert.equal(runtime.window.WS_APP.destroyTerminalStoreReactivity(), true);
  assert.equal(runtime.window._listeners.get("ws:terminal-entries-updated")?.length, 0);
  assert.equal(runtime.window._listeners.get("ws:calendar-reminders-updated")?.length, 0);

  runtime.window.WS_APP.initTerminalStoreReactivity();
  assert.equal(runtime.window._listeners.get("ws:terminal-entries-updated")?.length, 1);
  assert.equal(runtime.window._listeners.get("ws:calendar-reminders-updated")?.length, 1);
});
