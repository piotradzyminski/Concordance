"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = relativePath => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const ACTIVE_SHARED_SELECTORS = [
  ".registry-toolbar",
  ".registry-search",
  ".registry-action",
  ".entry-record-action",
  ".entry-record-actions",
  ".entry-empty-state",
  ".entry-layer",
  ".entry-form-grid",
  ".entry-form-field",
  ".entry-form-actions",
  ".entry-form-save",
  ".entry-form-cancel",
  ".entry-form-message"
];

const RETIRED_SELECTORS = [
  ".entry-record-list",
  ".entry-record-row",
  ".entry-record-title",
  ".entry-record-headline",
  ".entry-tag-row"
];

test("neutral registry controls stylesheet replaces the Encyclopedia-named global owner", () => {
  const index = read("index.html");
  const registryControlsIndex = index.indexOf('css/registry-controls.css?v=1');
  const addressIndex = index.indexOf('css/address-core.css?v=43');
  const modulesIndex = index.indexOf('css/modules.css?v=149');

  assert.ok(registryControlsIndex >= 0, "registry-controls.css must load eagerly");
  assert.ok(registryControlsIndex < addressIndex, "shared controls must load before registry-specific overrides");
  assert.ok(registryControlsIndex < modulesIndex, "shared controls must preserve the former cascade position");
  assert.doesNotMatch(index, /css\/encyclopedia\.css/);
});

test("registry-controls.css owns every active shared registry selector", () => {
  const css = read("css/registry-controls.css");
  for (const selector of ACTIVE_SHARED_SELECTORS) {
    assert.ok(css.includes(selector), `Missing active shared selector: ${selector}`);
  }
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.entry-form-grid/);
});

test("retired Encyclopedia view selectors are not carried into the neutral owner", () => {
  const css = read("css/registry-controls.css");
  for (const selector of RETIRED_SELECTORS) {
    assert.ok(!css.includes(selector), `Retired selector must stay removed: ${selector}`);
  }
});

test("modules.css no longer owns registry action interaction chrome", () => {
  const modulesCss = read("css/modules.css");
  assert.doesNotMatch(modulesCss, /(^|\n)\s*\.registry-action(?:\s|,|\{)/);
});

test("retired stylesheet is declared in the canonical delete manifest", () => {
  const manifest = read("DELETE_FILES.txt");
  assert.match(manifest, /^css\/encyclopedia\.css$/m);
});
