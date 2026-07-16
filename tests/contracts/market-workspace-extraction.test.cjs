"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test("Market lazy bundle loads the extracted workspace runtime and no retired runtime", () => {
  const modules = read("js/modules.js");
  assert.match(modules, /js\/market-workspace-runtime\.js\?v=6/);
  assert.match(modules, /js\/market\.js\?v=5/);
  assert.doesNotMatch(modules, /housing-market-runtime\.js/);
});

test("Market shell exposes only the Market workspace factory boundary", () => {
  const shell = read("js/market.js");
  const workspace = read("js/market-workspace-runtime.js");
  assert.match(shell, /createMarketWorkspaceRuntime/);
  assert.match(workspace, /createMarketWorkspaceRuntime/);
  assert.doesNotMatch(shell + workspace, /createHousingMarketRuntime|housingMarketRuntime|ensureHousingMarketRuntime/);
});

test("Market workspace has no legacy Citizen order, shipment or physical commit path", () => {
  const shell = read("js/market.js");
  const workspace = read("js/market-workspace-runtime.js");
  const source = `${shell}\n${workspace}`;
  assert.doesNotMatch(source, /citizen\.marketOrders|citizen\.shipments/);
  assert.doesNotMatch(source, /purchaseHousingMarketItem|createMarketOrderAndShipment/);
  assert.doesNotMatch(source, /processDueHousingMarketShipments|processDueMarketWorkspaceShipments/);
  assert.doesNotMatch(source, /replaceCitizenItemInstances|updateCitizen\?\.\([^)]*marketOrders/);
  assert.match(workspace, /window\.WS_APP\.getCitizenMarketOrders/);
});

test("Market transient navigation state is Market-owned", () => {
  const modules = read("js/modules.js");
  const workspace = read("js/market-workspace-runtime.js");
  const source = `${modules}\n${workspace}`;
  assert.match(source, /marketModeByCitizen/);
  assert.match(source, /marketOrderViewByCitizen/);
  assert.match(source, /marketSelectedOrderByCitizen/);
  assert.match(source, /marketSelectedProductByCitizen/);
  assert.match(source, /marketFiltersByCitizen/);
  assert.doesNotMatch(source, /housingMarketModeByCitizen|housingSelectedMarketOrderByCitizen|housingMarketFiltersByCitizen/);
});

test("Retired workspace path is declared for replacement-patch deletion", () => {
  const manifest = read("DELETE_FILES.txt");
  assert.match(manifest, /^js\/housing-market-runtime\.js$/m);
});
