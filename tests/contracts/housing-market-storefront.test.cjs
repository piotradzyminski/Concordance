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
  return `${read("js/market.js")}\n${read("js/market-workspace-runtime.js")}`;
}

test("Global Market renders a six-product paginated storefront", () => {
  const source = marketSource();
  assert.match(source, /const MARKET_PAGE_SIZE = 6/);
  assert.match(source, /visibleItems\.slice\(pagination\.startIndex, pagination\.endIndex\)/);
  assert.match(source, /data-housing-market-page=/);
  assert.match(source, /pagination\.totalItems = visibleItems\.length/);
});

test("Global Market navigation keeps delivery history inside the Orders workspace", () => {
  const source = marketSource();
  const tabs = getFunctionBlock(source, "renderMarketWorkspaceModeTabs", "renderMarketWorkspaceDepartmentNavigation");
  assert.match(source, /const MARKET_MODES = \["CATALOG", "SECONDARY", "ORDERS"\]/);
  assert.match(tabs, /id: "CATALOG"/);
  assert.match(tabs, /id: "SECONDARY"/);
  assert.match(tabs, /id: "ORDERS"/);
  assert.doesNotMatch(tabs, /id: "DELIVERED"/);
  assert.match(source, /data-housing-market-order-view="ORDERED"/);
  assert.match(source, /data-housing-market-order-view="DELIVERED"/);
});

test("Global Market catalog projects products into household, cyberware and general sections", () => {
  const source = marketSource();
  const classifier = getFunctionBlock(source, "getMarketWorkspaceDepartment", "getMarketWorkspaceSubcategory");
  const domain = getFunctionBlock(source, "getMarketWorkspaceCatalogDomain", "getMarketWorkspaceDepartment");
  assert.match(source, /const MARKET_DEPARTMENTS = \["ALL", "HOUSEHOLD", "CYBERWARE", "GENERAL"\]/);
  assert.match(classifier, /return "CYBERWARE"/);
  assert.match(classifier, /return "HOUSEHOLD"/);
  assert.match(classifier, /return "GENERAL"/);
  assert.match(domain, /"FURNITURE"/);
  assert.match(domain, /"MEDICAL"/);
  assert.match(domain, /"FOOD"/);
  assert.match(source, /subcategoriesByDepartment/);
  assert.match(source, /data-housing-market-department=/);
  assert.match(source, /data-housing-market-category=/);
});

test("Product cards prioritize shopping data and hide routine technical tags", () => {
  const source = marketSource();
  const card = getFunctionBlock(source, "renderMarketWorkspaceProductCard", "getMarketWorkspacePagination");
  const commandBar = getFunctionBlock(source, "renderMarketWorkspaceCommandBar", "renderMarketWorkspaceTab");
  assert.match(card, /housing-market-product-price/);
  assert.match(card, /ADD TO CART/);
  assert.match(card, /getMarketWorkspaceProductFacts/);
  assert.match(card, /getMarketWorkspaceProductRestrictions/);
  assert.doesNotMatch(card, /getMarketWorkspaceRequirementLabel/);
  assert.doesNotMatch(card, /getMarketWorkspaceFulfillmentLabel/);
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

test("Order actions stay synchronized with the internal Ordered and Delivered views", () => {
  const source = marketSource();
  assert.match(source, /function syncMarketWorkspaceModeToOrder/);
  assert.match(source, /setMarketWorkspaceMode\(citizenId, "ORDERS"\)/);
  assert.match(source, /isCanonicalMarketWorkspaceOrderDelivered/);
  assert.match(source, /data-housing-market-order-view/);
  assert.match(source, /stored === "DELIVERED"/);
});

test("The All department cannot retain a hidden legacy subcategory filter", () => {
  const source = marketSource();
  const normalize = getFunctionBlock(source, "normalizeMarketWorkspaceFilters", "getMarketWorkspaceFilters");
  assert.match(normalize, /normalized\.type === "ALL"\) normalized\.category = "ALL"/);
});
