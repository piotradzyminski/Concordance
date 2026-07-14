"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

function getFunctionBlock(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = nextName ? source.indexOf(`function ${nextName}`, start) : source.length;
  assert.notEqual(start, -1, `${name} must exist.`);
  assert.notEqual(end, -1, `${nextName} must exist after ${name}.`);
  return source.slice(start, end);
}

function marketSource() {
  return `${read("js/market.js")}\n${read("js/housing-market-runtime.js")}`;
}

test("Global Market renders a six-product paginated storefront", () => {
  const source = marketSource();
  assert.match(source, /const MARKET_PAGE_SIZE = 6/);
  assert.match(source, /visibleItems\.slice\(pagination\.startIndex, pagination\.endIndex\)/);
  assert.match(source, /data-housing-market-page=/);
  assert.match(source, /pagination\.totalItems = visibleItems\.length/);
});

test("Global Market navigation separates catalog, active orders and delivered history", () => {
  const source = marketSource();
  const tabs = getFunctionBlock(source, "renderHousingMarketModeTabs", "renderHousingMarketDepartmentNavigation");
  assert.match(source, /const MARKET_MODES = \["CATALOG", "ORDERS", "DELIVERED"\]/);
  assert.match(tabs, /id: "CATALOG"/);
  assert.match(tabs, /id: "ORDERS"/);
  assert.match(tabs, /id: "DELIVERED"/);
  assert.match(source, /activeMode === "DELIVERED" \? "HISTORY" : "ACTIVE"/);
});

test("Global Market departments support equipment, cyberware, medical, food and household products", () => {
  const source = marketSource();
  const classifier = getFunctionBlock(source, "getHousingMarketDepartment", "getHousingMarketSubcategory");
  assert.match(source, /const MARKET_DEPARTMENTS = \["ALL", "EQUIPMENT", "CYBERWARE", "MEDICAL", "FOOD", "HOUSEHOLD"\]/);
  assert.match(classifier, /return "CYBERWARE"/);
  assert.match(classifier, /return "MEDICAL"/);
  assert.match(classifier, /return "FOOD"/);
  assert.match(classifier, /return "HOUSEHOLD"/);
  assert.match(source, /subcategoriesByDepartment/);
  assert.match(source, /data-housing-market-department=/);
  assert.match(source, /data-housing-market-category=/);
});

test("Product cards prioritize shopping data and hide routine technical tags", () => {
  const source = marketSource();
  const card = getFunctionBlock(source, "renderHousingMarketProductCard", "getHousingMarketPagination");
  const commandBar = getFunctionBlock(source, "renderHousingMarketCommandBar", "renderHousingMarketTab");
  assert.match(card, /housing-market-product-price/);
  assert.match(card, /ADD TO CART/);
  assert.match(card, /getHousingMarketProductFacts/);
  assert.match(card, /getHousingMarketProductRestrictions/);
  assert.doesNotMatch(card, /getHousingMarketRequirementLabel/);
  assert.doesNotMatch(card, /getHousingMarketFulfillmentLabel/);
  assert.doesNotMatch(commandBar, /INDEXED OFFERS/);
  assert.doesNotMatch(commandBar, /VISIBLE OFFERS/);
});

test("Storefront layout is a department rail plus a two-column product grid", () => {
  const css = read("css/housing.css");
  assert.match(css, /\.housing-market-storefront\s*\{[\s\S]*?grid-template-columns:\s*190px minmax\(0, 1fr\)/);
  assert.match(css, /\.housing-market-card-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.housing-market-pagination/);
  assert.match(css, /\.housing-market-product-buy-row/);
});

test("Order actions stay synchronized with the primary Orders and Delivered sections", () => {
  const source = marketSource();
  assert.match(source, /function syncHousingMarketModeToOrder/);
  assert.match(source, /view === "ACTIVE" \? "ORDERS" : "DELIVERED"/);
  assert.match(source, /currentMode === "DELIVERED" \? "DELIVERED" : "ORDERS"/);
  assert.doesNotMatch(source, /data-housing-market-order-view/);
});

test("The All department cannot retain a hidden legacy subcategory filter", () => {
  const source = marketSource();
  const normalize = getFunctionBlock(source, "normalizeHousingMarketFilters", "getHousingMarketFilters");
  assert.match(normalize, /normalized\.type === "ALL"\) normalized\.category = "ALL"/);
});
