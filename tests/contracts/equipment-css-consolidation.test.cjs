"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function rootRuleCount(source, selector) {
  let depth = 0;
  let start = 0;
  let count = 0;
  let quote = null;
  let inComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inComment) {
      if (char === "*" && next === "/") {
        inComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (char === "\\") {
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "/" && next === "*") {
      inComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "{") {
      const prelude = source.slice(start, index).trim();
      if (depth === 0 && prelude === selector) count += 1;
      depth += 1;
      start = index + 1;
      continue;
    }

    if (char === "}") {
      depth = Math.max(0, depth - 1);
      start = index + 1;
      continue;
    }

    if (depth === 0 && char === ";") start = index + 1;
  }

  return count;
}

test("Equipment stylesheet removes confirmed retired workspace and transfer presentation", () => {
  const css = read("css/equipment.css");

  [
    ".equipment-shell-layout--workspace",
    ".equipment-workspace-tabs",
    ".equipment-storage-transfer-columns",
    ".equipment-storage-transfer-column",
    ".equipment-transfer-row",
    ".equipment-transfer-feedback",
    ".equipment-transfer-blocked",
    ".equipment-body-workspace",
    ".equipment-secondary-workspace",
    ".equipment-utility-workspace"
  ].forEach((selector) => assert.doesNotMatch(css, new RegExp(escapeRegex(selector))));

  assert.doesNotMatch(css, /Equipment UI hotfix 5\.1\.1x/);
});

test("Equipment stylesheet retains the active single-screen CyberGrid shell", () => {
  const css = read("css/equipment.css");

  assert.match(css, /\.equipment-shell-layout--screen-split/);
  assert.match(css, /\.equipment-screen/);
  assert.match(css, /\.equipment-cybergrid-workspace/);
});

test("canonical Equipment selectors have one root declaration block", () => {
  const css = read("css/equipment.css");

  [
    ".equipment-body-region-row.is-reserved",
    ".equipment-container-groups",
    ".equipment-shell-panel__head--bodymap",
    ".equipment-bodymap-penalty",
    ".equipment-storage-region",
    ".equipment-storage-region__identity h6",
    ".equipment-shell-inspector-grid--player"
  ].forEach((selector) => assert.equal(rootRuleCount(css, selector), 1, selector));
});

test("consolidated declarations preserve their previously effective values", () => {
  const css = read("css/equipment.css");

  assert.match(css, /\.equipment-body-region-row\.is-reserved\s*\{[^}]*border-style:\s*dashed;[^}]*background:\s*rgba\(143, 189, 180, 0\.035\);/s);
  assert.match(css, /\.equipment-container-groups\s*\{[^}]*flex-direction:\s*column;/s);
  assert.match(css, /\.equipment-storage-region\s*\{[^}]*box-sizing:\s*border-box;[^}]*overflow:\s*hidden;/s);
  assert.match(css, /\.equipment-bodymap-penalty\s*\{[^}]*margin:\s*0;/s);
  assert.match(css, /\.equipment-shell-panel__head--bodymap\s*\{[^}]*align-items:\s*center;/s);
  assert.match(css, /\.equipment-shell-inspector-grid--player\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s);
});

test("Equipment lazy bundle advances the stylesheet cache version", () => {
  const modules = read("js/modules.js");
  assert.match(modules, /css\/equipment\.css\?v=132/);
});
