"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const SOURCE = fs.readFileSync(path.join(ROOT, "js/terminal-module.js"), "utf8");

function getFunctionSource(name) {
  const start = SOURCE.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const next = SOURCE.indexOf("\n  function ", start + 1);
  return SOURCE.slice(start, next === -1 ? SOURCE.length : next);
}

test("Terminal Inbox renders a bounded 50-entry window", () => {
  assert.match(SOURCE, /const TERMINAL_INBOX_PAGE_SIZE = 50/);
  const model = getFunctionSource("getTerminalInboxProjectionModel");
  assert.match(model, /filteredEntries\.slice\(0, pagination\.limit\)/);
  assert.match(SOURCE, /data-terminal-inbox-load-more/);
});

test("Load more appends the next page instead of replacing the Inbox list", () => {
  const loadMore = getFunctionSource("loadMoreTerminalInboxEntries");
  assert.match(loadMore, /expandTerminalInboxPagination/);
  assert.match(loadMore, /insertAdjacentHTML\("beforeend"/);
  assert.doesNotMatch(loadMore, /list\.innerHTML\s*=/);
});

test("Inbox card controls use one delegated click handler", () => {
  const delegated = getFunctionSource("bindTerminalInboxDelegatedActions");
  const hub = getFunctionSource("bindTerminalHubActions");

  assert.match(delegated, /panel\.addEventListener\("click"/);
  assert.match(delegated, /panel\.addEventListener\("change"/);
  assert.match(hub, /bindTerminalInboxDelegatedActions/);
  assert.doesNotMatch(hub, /querySelectorAll\("\[data-terminal-entry-read\]"/);
  assert.doesNotMatch(hub, /querySelectorAll\("\[data-terminal-entry-important\]"/);
  assert.doesNotMatch(hub, /querySelectorAll\("\[data-terminal-entry-link\]"/);
});

test("Single-entry state changes replace one card when ordering remains stable", () => {
  const refresh = getFunctionSource("refreshTerminalInboxEntryProjection");
  assert.match(refresh, /card\.outerHTML = renderTerminalEntryCard/);
  assert.match(refresh, /expectedIndex !== currentIndex/);
  assert.match(refresh, /refreshTerminalInboxListProjection/);
});

test("Selection toggles update rendered cards without rebuilding the Inbox", () => {
  const delegated = getFunctionSource("bindTerminalInboxDelegatedActions");
  const sync = getFunctionSource("syncTerminalInboxSelectionUi");
  assert.match(delegated, /syncTerminalInboxSelectionUi\(panel, citizen\)/);
  assert.match(sync, /classList\.toggle\("is-selected"/);
});
