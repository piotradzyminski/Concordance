"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

test("player workspace exposes keyboard-operable tabs, labelled panels and live result counts", () => {
  const source = read("js/subscriptions-workspace.js");
  assert.match(source, /aria-controls="\$\{getWorkspacePanelId\(view\.id\)\}"/);
  assert.match(source, /tabindex="\$\{state\.view === view\.id \? "0" : "-1"\}"/);
  assert.match(source, /role="tabpanel" aria-labelledby=/);
  assert.match(source, /\["ArrowLeft", "ArrowRight", "Home", "End"\]/);
  assert.match(source, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(source, /aria-expanded="\$\{isExpanded \? "true" : "false"\}"/);
  assert.match(source, /subscriptions_responsive_accessibility_4_5/);
});

test("subscription profiles expose labelled regions and a semantic tier comparison", () => {
  const source = read("js/subscriptions.js");
  assert.match(source, /data-subscription-profile-heading tabindex="-1"/);
  assert.match(source, /focusSubscriptionProfileHeading/);
  assert.match(source, /role="table" aria-label="Subscription tier comparison"/);
  assert.match(source, /role="columnheader"/);
  assert.match(source, /role="rowgroup"/);
  assert.match(source, /role="row" aria-label=/);
  assert.match(source, /aria-label="Subscription contract management"/);
});

test("admin subscription contract index uses a keyboard listbox and restores interaction focus", () => {
  const source = read("js/admin-subscriptions-control.js");
  assert.match(source, /role="listbox" aria-label="Subscription contracts"/);
  assert.match(source, /role="option"/);
  assert.match(source, /aria-selected=/);
  assert.match(source, /\["ArrowUp", "ArrowDown", "Home", "End"\]/);
  assert.match(source, /restoreInteractionFocus/);
  assert.match(source, /subscriptions_responsive_accessibility_4_5/);
});

test("responsive CSS owns 980, 720 and 520 layouts, visible focus and reduced motion", () => {
  const css = read("css/subscriptions.css");
  const adminCss = read("css/admin-subscriptions.css");
  const modules = read("js/modules.js");
  const index = read("index.html");
  assert.match(css, /@media \(max-width: 980px\)/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /summary:focus-visible/);
  assert.match(adminCss, /@media \(max-width: 980px\)/);
  assert.match(adminCss, /@media \(max-width: 720px\)/);
  assert.match(adminCss, /role="option"\]:focus-visible/);
  assert.match(modules, /css\/subscriptions\.css\?v=21/);
  assert.match(modules, /js\/subscriptions\.js\?v=34/);
  assert.match(modules, /js\/subscriptions-workspace\.js\?v=6/);
  assert.match(modules, /css\/admin-subscriptions\.css\?v=3/);
  assert.match(modules, /js\/admin-subscriptions-control\.js\?v=4/);
  assert.match(index, /js\/modules\.js\?v=297/);
});
