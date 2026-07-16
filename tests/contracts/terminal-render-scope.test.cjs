"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const TERMINAL_SOURCE = fs.readFileSync(path.join(ROOT, "js/terminal-module.js"), "utf8");
const BILLING_SOURCE = fs.readFileSync(path.join(ROOT, "js/billing.js"), "utf8");
const MODULES_SOURCE = fs.readFileSync(path.join(ROOT, "js/modules.js"), "utf8");
const INDEX_SOURCE = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

function getFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const next = source.indexOf("\n  function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test("Terminal exposes explicit navigation, panel and domain refresh boundaries", () => {
  for (const name of [
    "refreshTerminalPanelNavigationProjection",
    "refreshTerminalPanelContentProjection",
    "refreshTerminalInboxProjection",
    "refreshTerminalBillingProjection",
    "refreshTerminalRequestsProjection",
    "refreshTerminalCommandProjection",
    "refreshTerminalCalendarProjection"
  ]) {
    assert.match(TERMINAL_SOURCE, new RegExp(`WS_APP\\.${name} = ${name}`));
  }
});

test("Compatibility partial render updates navigation and active content without touching Calendar", () => {
  const partial = getFunctionSource(TERMINAL_SOURCE, "renderTerminalPanelPartial");

  assert.match(partial, /refreshTerminalPanelNavigationProjection/);
  assert.match(partial, /refreshTerminalPanelContentProjection/);
  assert.doesNotMatch(partial, /calendarHost/);
  assert.doesNotMatch(partial, /renderTerminalCalendar/);
  assert.doesNotMatch(partial, /refreshTerminalCalendarProjection/);
});

test("Panel content refresh binds only the active content boundary", () => {
  const content = getFunctionSource(TERMINAL_SOURCE, "refreshTerminalPanelContentProjection");

  assert.match(content, /renderTerminalPanelContent/);
  assert.match(content, /bindNavigation:\s*false/);
  assert.match(content, /bindCalendar:\s*false/);
  assert.doesNotMatch(content, /renderTerminalPanelCards/);
  assert.doesNotMatch(content, /renderTerminalCalendar/);
});

test("Inbox and Requests actions use their own domain projections", () => {
  const bindings = getFunctionSource(TERMINAL_SOURCE, "bindTerminalHubActions");

  assert.match(bindings, /const refreshInbox = \(\) => refreshTerminalInboxProjection/);
  assert.match(bindings, /const refreshRequests = \(\) => refreshTerminalRequestsProjection/);
  assert.doesNotMatch(bindings, /renderPanel\("inbox"\)/);
  assert.doesNotMatch(bindings, /renderPanel\("requests"\)/);
});

test("Billing refresh prefers the dedicated Billing projection", () => {
  const refresh = getFunctionSource(BILLING_SOURCE, "refreshTerminalBillingPanel");

  assert.match(refresh, /refreshTerminalBillingProjection/);
  assert.match(refresh, /includeNavigation:\s*true/);
  assert.match(refresh, /preserveUiState:\s*true/);
  assert.ok(refresh.indexOf("refreshTerminalBillingProjection") < refresh.indexOf("renderTerminalPanelPartial"));
});

test("Terminal render-scope assets use the expected cache versions", () => {
  assert.match(MODULES_SOURCE, /js\/billing\.js\?v=16/);
  assert.match(MODULES_SOURCE, /js\/terminal-module\.js\?v=15/);
  assert.match(INDEX_SOURCE, /js\/modules\.js\?v=318/);
});
