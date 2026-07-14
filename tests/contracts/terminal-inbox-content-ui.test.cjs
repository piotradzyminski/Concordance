"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const MODULE_SOURCE = fs.readFileSync(path.join(ROOT, "js/terminal-module.js"), "utf8");
const CSS_SOURCE = fs.readFileSync(path.join(ROOT, "css/terminal-module.css"), "utf8");
const MODULE_BUNDLES = fs.readFileSync(path.join(ROOT, "js/modules.js"), "utf8");

test("Inbox cards render v2 content metadata and admin-only technical details", () => {
  assert.match(MODULE_SOURCE, /renderTerminalEntrySummary\(entry\)/);
  assert.match(MODULE_SOURCE, /renderTerminalEntryStateRail\(entry\)/);
  assert.match(MODULE_SOURCE, /renderTerminalEntryContext\(entry\)/);
  assert.match(MODULE_SOURCE, /renderTerminalEntryTechnicalDetails\(entry, user\)/);
  assert.match(MODULE_SOURCE, /user\?\.role !== "admin"/);
  assert.match(MODULE_SOURCE, /data-terminal-entry-domain=/);
  assert.match(MODULE_SOURCE, /data-terminal-entry-attention=/);
  assert.match(MODULE_SOURCE, /data-terminal-entry-lifecycle=/);
});

test("Inbox filtering is generated from Notification Event Catalog fields", () => {
  assert.match(MODULE_SOURCE, /notificationRegistry\?\.getEvents\?\.\(\)/);
  assert.match(MODULE_SOURCE, /DOMAIN:/);
  assert.match(MODULE_SOURCE, /EVENT_CATEGORY:/);
  assert.match(MODULE_SOURCE, /EVENT:/);
  assert.match(MODULE_SOURCE, /EVENT DOMAINS/);
  assert.match(MODULE_SOURCE, /EVENT CATEGORIES/);
});

test("Attention and lifecycle states have dedicated visual contracts", () => {
  for (const selector of [
    ".terminal-entry-card.is-attention-badge",
    ".terminal-entry-card.is-attention-banner",
    ".terminal-entry-card.is-attention-blocking",
    ".terminal-entry-card.is-lifecycle-resolved",
    ".terminal-entry-technical-details"
  ]) {
    assert.match(CSS_SOURCE, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("existing notification lifecycle API is exposed through Inbox actions", () => {
  assert.match(MODULE_SOURCE, /data-terminal-entry-acknowledge/);
  assert.match(MODULE_SOURCE, /TerminalNotifications\?\.acknowledge/);
  assert.match(MODULE_SOURCE, /data-terminal-entry-resolve/);
  assert.match(MODULE_SOURCE, /TerminalNotifications\?\.resolve/);
});

test("Terminal lazy bundle versions include Inbox Content UI assets", () => {
  assert.match(MODULE_BUNDLES, /css\/terminal-module\.css\?v=4/);
  assert.match(MODULE_BUNDLES, /js\/terminal-module\.js\?v=11/);
});
