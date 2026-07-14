"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const MODULE = fs.readFileSync(path.join(ROOT, "js/terminal-module.js"), "utf8");

test("Terminal Inbox UI displays the received message date and hour", () => {
  assert.match(MODULE, /function formatDateTimeDisplay/);
  assert.match(MODULE, /entry\.receivedAt \|\| entry\.sentAt \|\| entry\.createdAt/);
  assert.match(MODULE, /<time datetime=/);
  assert.match(MODULE, /formatDateTimeDisplay\(getTerminalEntryTimestamp\(entry\), entry\.date\)/);
});

test("Terminal Inbox admin technical details expose message lifecycle timestamps", () => {
  assert.match(MODULE, /\["Occurred", entry\.occurredAt\]/);
  assert.match(MODULE, /\["Sent", entry\.sentAt\]/);
  assert.match(MODULE, /\["Received", entry\.receivedAt\]/);
  assert.match(MODULE, /\["Read", entry\.readAt \|\| entry\.lifecycle\?\.readAt\]/);
});
