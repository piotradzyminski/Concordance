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

test("Market seed catalog includes medical, food and household consumables", () => {
  const catalog = loadEquipmentCatalog();
  const consumables = catalog.filter((item) => item.consumable === true);
  const departments = new Set(consumables.map((item) => item.marketDepartment));

  assert.ok(consumables.length >= 19, "Expected at least nineteen starter consumable products.");
  assert.deepEqual([...departments].sort(), ["FOOD", "HOUSEHOLD", "MEDICAL"]);
  assert.ok(consumables.every((item) => item.id && item.name && item.value > 0));
  assert.ok(consumables.every((item) => item.consumableProfile && typeof item.consumableProfile === "object"));
});

test("Equipment catalog normalization preserves Market consumable metadata", () => {
  const source = read("js/equipment-catalog-store.js");

  assert.match(source, /function normalizeEquipmentConsumableProfile/);
  assert.match(source, /marketDepartment:/);
  assert.match(source, /marketSubcategory:/);
  assert.match(source, /consumableProfile,/);
  assert.match(source, /packageQuantity: consumableProfile\.packageQuantity/);
  assert.match(source, /dose: consumableProfile\.dose/);
  assert.match(source, /shelfLife: consumableProfile\.shelfLife/);
});

test("Housing and Market section tabs use the shared Terminal tile contract", () => {
  const housing = `${read("js/housing.js")}\n${read("js/market.js")}\n${read("js/housing-market-runtime.js")}`;
  const css = read("css/housing.css");
  const modules = read("js/modules.js");
  const index = read("index.html");

  assert.match(housing, /housing-module-tabs system-segment-tabs/);
  assert.match(housing, /housing-module-tab system-segment-tile system-segment-tile--card/);
  assert.match(housing, /housing-market-section-tabs system-segment-tabs/);
  assert.match(housing, /housing-market-section-tab system-segment-tile system-segment-tile--card/);
  assert.match(housing, /system-segment-tile__title/);
  assert.match(housing, /system-segment-tile__description/);
  assert.doesNotMatch(css, /housing-module-tab\.terminal-panel-card\.system-segment-tile/);
  assert.doesNotMatch(css, /housing-market-subtab\.terminal-panel-card\.system-segment-tile/);
  assert.match(index, /css\/system-tabs\.css\?v=8/);
  assert.match(modules, /styles: \["css\/housing\.css\?v=34"\]/);
});
