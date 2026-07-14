"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

function loadEquipmentCatalog() {
  const context = { window: { APP_DATA: {} } };
  vm.createContext(context);
  vm.runInContext(read("data/equipment-catalog.js"), context, { filename: "data/equipment-catalog.js" });
  return context.window.APP_DATA.equipmentCatalog;
}

function getFunctionBlock(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = nextName ? source.indexOf(`function ${nextName}`, start) : source.length;
  assert.notEqual(start, -1, `${name} must exist.`);
  assert.notEqual(end, -1, `${nextName} must exist after ${name}.`);
  return source.slice(start, end);
}

test("starter consumables own canonical product visual profiles backed by local assets", () => {
  const catalog = loadEquipmentCatalog();
  const consumables = catalog.filter((item) => item.consumable === true && ["MEDICAL", "FOOD", "HOUSEHOLD"].includes(item.marketDepartment));

  assert.equal(consumables.length, 19);
  consumables.forEach((item) => {
    assert.ok(item.visualProfile && typeof item.visualProfile === "object", `${item.id} must define visualProfile.`);
    assert.match(item.visualProfile.thumbnail, /^assets\/market\/products\/[a-z0-9-]+\.svg$/);
    assert.equal(item.visualProfile.detail, item.visualProfile.thumbnail);
    assert.equal(item.visualProfile.fit, "CONTAIN");
    assert.ok(item.visualProfile.alt);
    assert.ok(fs.existsSync(path.join(ROOT, item.visualProfile.thumbnail)), `${item.visualProfile.thumbnail} must exist.`);
  });
});

test("Equipment Catalog normalization preserves one canonical visualProfile", () => {
  const source = read("js/equipment-catalog-store.js");
  const normalize = getFunctionBlock(source, "normalizeEquipmentVisualProfile", "normalizeEquipmentCatalogItem");
  const catalogNormalize = getFunctionBlock(source, "normalizeEquipmentCatalogItem", "getSeedEquipmentCatalogItems");

  assert.match(normalize, /profile\.thumbnail/);
  assert.match(normalize, /profile\.detail \|\| thumbnail/);
  assert.match(normalize, /fitToken === "COVER" \? "COVER" : "CONTAIN"/);
  assert.match(catalogNormalize, /const visualProfile = normalizeEquipmentVisualProfile\(source\)/);
  assert.match(catalogNormalize, /visualProfile,/);
  assert.match(source, /window\.WS_APP\.normalizeEquipmentVisualProfile = normalizeEquipmentVisualProfile/);
});

test("Market cards and Product Inspector resolve local visuals with department fallbacks", () => {
  const source = `${read("js/market.js")}\n${read("js/housing-market-runtime.js")}`;
  const resolver = getFunctionBlock(source, "getHousingMarketProductVisual", "renderHousingMarketInspectorRows");
  const inspector = getFunctionBlock(source, "renderHousingMarketProductInspectorContent", "renderHousingMarketProductInspectorLayer");
  const card = getFunctionBlock(source, "renderHousingMarketProductCard", "getHousingMarketPagination");

  assert.match(source, /const MARKET_PRODUCT_VISUAL_FALLBACKS = Object\.freeze/);
  ["equipment", "cyberware", "medical", "food", "household", "product"].forEach((asset) => {
    assert.match(source, new RegExp(`assets/market/fallback/${asset}\\.svg`));
    assert.ok(fs.existsSync(path.join(ROOT, `assets/market/fallback/${asset}.svg`)));
  });
  assert.match(resolver, /item\.visualProfile/);
  assert.match(resolver, /requestedView === "detail"/);
  assert.match(resolver, /fallback: !preferred/);
  assert.doesNotMatch(resolver, /marketImage|productImage|imageUrl|assetPath/);
  assert.match(inspector, /getHousingMarketProductVisual\(item, "detail"\)/);
  assert.match(inspector, /<img src="\$\{escapeHtml\(visual\.src\)\}" alt="\$\{escapeHtml\(visual\.alt\)\}"/);
  assert.match(card, /getHousingMarketProductVisual\(item, "thumbnail"\)/);
  assert.match(card, /housing-market-product-mark has-image/);
  assert.match(card, /loading="lazy" decoding="async"/);
});

test("Market SVG assets are self-contained terminal visuals", () => {
  const assetRoot = path.join(ROOT, "assets/market");
  const files = [];
  for (const folder of ["fallback", "products"]) {
    for (const name of fs.readdirSync(path.join(assetRoot, folder))) {
      if (name.endsWith(".svg")) files.push(path.join(assetRoot, folder, name));
    }
  }

  assert.equal(files.length, 25);
  files.forEach((file) => {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /<svg[^>]+viewBox="0 0 640 400"/);
    assert.doesNotMatch(source, /<script|(?:href|xlink:href)=["\']https?:\/\/|<foreignObject/i);
  });
});

test("Market visual CSS keeps thumbnails bounded and preserves inspector fit modes", () => {
  const css = read("css/housing.css");

  assert.match(css, /\.housing-market-product-mark img\s*\{[\s\S]*?height:\s*112px[\s\S]*?object-fit:\s*contain/);
  assert.match(css, /\.housing-market-product-mark\.is-fit-cover img/);
  assert.match(css, /\.housing-market-product-inspector-visual\.is-fit-cover img/);
  assert.match(css, /\.housing-market-product-inspector-visual\.is-fallback img/);
});
