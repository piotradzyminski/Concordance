"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { readProjectFile, extractFunctionSource } = require("../helpers/source-contract.cjs");

const ROOT = path.resolve(__dirname, "../..");

function listFilesRecursive(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? listFilesRecursive(target) : [target];
  });
}

function loadEquipmentCatalog() {
  const context = { window: { APP_DATA: {} } };
  vm.createContext(context);
  vm.runInContext(readProjectFile("data/equipment-catalog.js"), context, { filename: "data/equipment-catalog.js" });
  return context.window.APP_DATA.equipmentCatalog;
}

test("Market artwork and catalog visualProfile metadata are fully retired", () => {
  assert.equal(listFilesRecursive(path.join(ROOT, "assets/market")).length, 0);
  assert.equal(fs.existsSync(path.join(ROOT, "docs/contracts/commerce/market_product_visual_assets_contract.md")), false);
  assert.equal(fs.existsSync(path.join(ROOT, "tests/contracts/market-product-visual-assets.test.cjs")), false);

  const catalog = loadEquipmentCatalog();
  assert.ok(catalog.length > 0);
  catalog.forEach((item) => assert.equal(Object.prototype.hasOwnProperty.call(item, "visualProfile"), false));

  const files = [
    "js/market.js",
    "js/market-workspace-runtime.js",
    "js/equipment-catalog-store.js",
    "js/admin-equipment-catalog-authoring.js",
    "js/admin/workspaces/admin-workspace-catalog-management.js"
  ].map(readProjectFile).join("\n");
  assert.doesNotMatch(files, /assets\/market|visualProfile|normalizeEquipmentVisualProfile|getMarketWorkspaceProductVisual/);
});

test("Product cards use neutral terminal chrome and expose exactly three compact actions", () => {
  const source = readProjectFile("js/market-workspace-runtime.js");
  const card = extractFunctionSource(source, "renderMarketWorkspaceProductCard");

  assert.match(card, />DETAILS<\/button>/);
  assert.match(card, />WISHLIST<\/button>/);
  assert.match(card, />ADD TO CART<\/button>/);
  assert.equal((card.match(/<button /g) || []).length, 3);
  assert.doesNotMatch(card, /VIEW DETAILS|ADD FOR PICKUP|BUY \+ INSTALL|SERVICE UNAVAILABLE|PICKUP UNAVAILABLE|<img|product-mark/);
  assert.match(card, /data-housing-market-wishlist-offer=/);
  assert.doesNotMatch(card, /wishlist-ui|aria-disabled="true"|Wishlist UI placeholder/);
  assert.match(card, /data-market-department=/);
});

test("Only DETAILS opens the Product Inspector; the card surface is not an implicit action", () => {
  const source = readProjectFile("js/market-workspace-runtime.js");
  const handler = extractFunctionSource(source, "handleMarketWorkspaceClick");
  assert.match(handler, /const inspectorButton = event\.target\.closest\?\.\("\[data-housing-market-inspect\]"\)/);
  assert.doesNotMatch(handler, /cardClick|inspectorButton \|\| cardClick/);
});

test("Market card CSS uses shared terminal variables and no department color variants", () => {
  const css = readProjectFile("css/housing.css");
  const cardStart = css.indexOf(".housing-market-product-card {");
  const pagerStart = css.indexOf(".housing-market-pagination {", cardStart);
  assert.ok(cardStart >= 0 && pagerStart > cardStart);
  const cardCss = css.slice(cardStart, pagerStart);

  assert.match(cardCss, /var\(--system-tab-border/);
  assert.match(cardCss, /var\(--muted\)/);
  assert.match(cardCss, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(cardCss, /is-cyberware|is-medical|is-food|is-household|127, 148, 184|product-mark/);
});
