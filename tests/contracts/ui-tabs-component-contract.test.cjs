"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

test("shared tab CSS is eager and not duplicated by lazy bundles", () => {
  const index = read("index.html");
  const modules = read("js/modules.js");
  const modulesCss = index.indexOf('css/modules.css?v=149');
  const tabsCss = index.indexOf('css/system-tabs.css?v=8');

  assert.ok(modulesCss >= 0);
  assert.ok(tabsCss > modulesCss, "Shared tabs must load globally after general module chrome.");
  assert.doesNotMatch(modules, /css\/system-tabs\.css/, "Lazy bundles must not load a second copy of the shared contract.");
});

test("shared CSS defines three explicit tab families and complete interaction states", () => {
  const css = read("css/system-tabs.css");

  assert.match(css, /\.system-segment-tabs/);
  assert.match(css, /\.system-segment-tile--card/);
  assert.match(css, /\.system-segment-tile--alert/);
  assert.match(css, /\.system-inline-tabs/);
  assert.match(css, /\.system-inline-tab__count/);
  assert.match(css, /\.system-mode-switch/);
  assert.match(css, /\.system-mode-switch__option/);
  assert.match(css, /\[aria-selected="true"\]/);
  assert.match(css, /\[aria-pressed="true"\]/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /:disabled/);
});

test("large module navigation uses the Command Line card contract", () => {
  const sources = [
    "js/terminal-module.js",
    "js/service.js",
    "js/cyberware-workspace.js",
    "js/housing.js",
    "js/market.js",
    "js/subscriptions-workspace.js",
    "js/subscriptions.js"
  ].map(read).join("\n");

  assert.match(sources, /system-segment-tile system-segment-tile--card/);
  assert.match(read("js/terminal-module.js"), /title: "Command Line"/);
  assert.match(read("js/terminal-module.js"), /role="tab" aria-selected=/);
  assert.match(read("js/service.js"), /service-tab system-segment-tile system-segment-tile--card/);
  assert.match(read("js/cyberware-workspace.js"), /cyberware-ui-section system-segment-tile system-segment-tile--card/);
  assert.match(read("js/housing.js"), /housing-module-tab system-segment-tile system-segment-tile--card/);
  assert.match(read("js/market-workspace-runtime.js"), /system-segment-tile system-segment-tile--card/);
  assert.match(read("js/subscriptions-workspace.js"), /subscription-workspace-nav__item system-segment-tile system-segment-tile--card/);
});

test("compact tabs and form modes use distinct shared families", () => {
  const terminal = read("js/terminal-module.js");
  const billing = read("js/billing.js");
  const subscriptions = read("js/subscriptions.js");
  const citizenProfile = read("js/citizen-profile.js");

  assert.match(terminal, /terminal-inbox-filter-tabs system-inline-tabs/);
  assert.match(terminal, /system-inline-tab__count/);
  assert.match(billing, /terminal-billing-tabs system-inline-tabs/);
  assert.match(billing, /terminal-transaction-mode-tabs system-mode-switch/);
  assert.match(billing, /terminal-payment-scope-tabs system-mode-switch/);
  assert.match(subscriptions, /subscription-purchase-tabs system-inline-tabs/);
  assert.match(citizenProfile, /admin-command-tabs system-inline-tabs/);
});

test("migrated module CSS no longer owns shared tab chrome", () => {
  const terminalCss = read("css/terminal-module.css");
  const serviceCss = read("css/service.css");
  const equipmentCss = read("css/equipment.css");
  const subscriptionsCss = read("css/subscriptions.css");
  const billingCss = read("css/billing.css");
  const citizenProfileCss = read("css/citizen-profile.css");

  assert.doesNotMatch(terminalCss, /\.terminal-panel-card:hover/);
  assert.doesNotMatch(serviceCss, /\.service-tab\.system-segment-tile\s*\{/);
  assert.doesNotMatch(equipmentCss, /\.equipment-workspace-tab \.system-segment-tile__title/);
  assert.doesNotMatch(subscriptionsCss, /\.subscription-workspace-nav__item\.system-segment-tile\s*\{/);
  assert.doesNotMatch(billingCss, /\.terminal-billing-tab\.is-active/);
  assert.doesNotMatch(citizenProfileCss, /\.admin-command-tabs button\.is-active/);
});

test("visual polish preserves readable labels, focus and disabled states", () => {
  const css = read("css/system-tabs.css");

  assert.match(css, /--system-tab-focus:/);
  assert.match(css, /\.system-segment-tile--card \.system-segment-tile__title[\s\S]*?-webkit-line-clamp:\s*2/);
  assert.match(css, /\.system-segment-tile--card \.system-segment-tile__description[\s\S]*?-webkit-line-clamp:\s*3/);
  assert.match(css, /\.system-segment-tile:focus-visible[\s\S]*?outline:\s*2px solid var\(--system-tab-focus\)/);
  assert.match(css, /hover:not\(:disabled\):not\(\[aria-disabled="true"\]\)/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("module tab grids use progressive responsive collapse", () => {
  const terminalCss = read("css/terminal-module.css");
  const serviceCss = read("css/service.css");
  const housingCss = read("css/housing.css");

  assert.match(terminalCss, /@media \(max-width: 1100px\)[\s\S]*?\.terminal-panel-card-grid[\s\S]*?repeat\(2/);
  assert.match(terminalCss, /@media \(max-width: 760px\)[\s\S]*?\.terminal-panel-card-grid[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(serviceCss, /@media \(max-width: 1180px\)[\s\S]*?\.service-tabs[\s\S]*?repeat\(2/);
  assert.match(serviceCss, /@media \(max-width: 760px\)[\s\S]*?\.service-tabs[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(housingCss, /\.housing-module-tabs[\s\S]*?repeat\(4/);
  assert.match(housingCss, /@media \(max-width: 1100px\)[\s\S]*?\.housing-module-tabs[\s\S]*?repeat\(2/);
  assert.match(housingCss, /@media \(max-width: 640px\)[\s\S]*?\.housing-module-tabs[\s\S]*?grid-template-columns:\s*1fr/);
});

