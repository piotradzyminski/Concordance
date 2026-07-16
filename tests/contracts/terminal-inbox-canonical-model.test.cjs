"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const MODULE = fs.readFileSync(path.join(ROOT, "js/terminal-module.js"), "utf8");
const STORE = fs.readFileSync(path.join(ROOT, "js/store.js"), "utf8");
const API = fs.readFileSync(path.join(ROOT, "js/notification-api.js"), "utf8");

function functionBody(source, name, nextName) {
  const start = source.indexOf(`  function ${name}`);
  const end = source.indexOf(`\n\n  function ${nextName}`, start);
  assert.ok(start >= 0 && end > start, `${name} body must exist`);
  return source.slice(start, end);
}

test("Terminal Entry Store owns the single canonical v4 compatibility adapter", () => {
  assert.match(STORE, /const TERMINAL_ENTRY_SCHEMA_VERSION = 4/);
  assert.match(STORE, /function resolveTerminalEntryIdentity/);
  assert.match(STORE, /function deriveLegacyTerminalCategory/);
  assert.match(STORE, /schemaVersion: TERMINAL_ENTRY_SCHEMA_VERSION/);
  assert.match(API, /schemaVersion: 4/);
});

test("Inbox filter UI consumes only canonical notification fields", () => {
  const filterContext = functionBody(MODULE, "getTerminalInboxEntryFilterContext", "getTerminalInboxCatalogFilterGroups");
  assert.match(filterContext, /entry\.eventCode/);
  assert.match(filterContext, /entry\.domain/);
  assert.match(filterContext, /entry\.category/);
  assert.match(filterContext, /entry\.severity/);
  assert.doesNotMatch(filterContext, /entry\.type/);
  assert.doesNotMatch(filterContext, /entry\.subtype/);

  assert.doesNotMatch(MODULE, /function getTerminalInboxLegacyCategoryDefinitions/);
  assert.doesNotMatch(MODULE, /function getTerminalInboxTagFilterCategory/);
  assert.doesNotMatch(MODULE, /LEGACY CATEGORIES/);
  assert.match(MODULE, /"DOMAIN", "CATEGORY", "EVENT", "TAG", "STATUS", "SEVERITY"/);
  assert.match(MODULE, /LIFECYCLE STATUS/);
  assert.match(MODULE, /data-terminal-entry-event=/);
});

test("Inbox card actions render from canonical actions rather than legacy links", () => {
  const body = functionBody(MODULE, "renderTerminalEntryCard", "formatLedgerSignedCredits");
  assert.match(body, /const actions = Array\.isArray\(entry\.actions\)/);
  assert.match(body, /actions\.forEach/);
  assert.doesNotMatch(body, /entry\.links/);
  assert.doesNotMatch(body, /entry\.type/);
  assert.doesNotMatch(body, /entry\.subtype/);
});


test("structured Inbox layout selection uses canonical domain identity", () => {
  const profile = functionBody(MODULE, "getTerminalDomainContentProfile", "getTerminalEntryVisualContract");
  assert.match(profile, /entry\.domain/);
  assert.match(profile, /entry\.eventCode/);
  assert.doesNotMatch(profile, /entry\.type/);
  assert.doesNotMatch(profile, /entry\.subtype/);
});
