"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function escapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

test("Equipment grid items show only player-facing name and size", () => {
  const runtime = createBrowserRuntime({
    wsApp: {
      getItemInstanceDisplayName(item = {}) {
        return item.playerLabel || item.displayName || item.name || item.id || "Item";
      }
    }
  });
  runtime.load("js/equipment-containers-panel.js");

  const item = {
    id: "blade-1",
    name: "Catalog Blade",
    playerLabel: "Kuro",
    category: "WEAPON",
    subtype: "SWORD",
    isInGrid: true,
    containerHostId: "bag-1",
    containerPlacement: { column: 2, row: 3, rotation: 90 }
  };
  const container = {
    id: "bag-1",
    name: "Field Bag",
    containerProfile: { slotCapacity: 12, gridColumns: 4, gridRows: 3 }
  };
  const model = {
    grid: { hasGrid: true, columns: 4, rows: 3, slotCapacity: 12, visualCells: 12 },
    entries: [{
      item,
      placement: { column: 2, row: 3 },
      footprint: { width: 2, height: 1, rotation: 90, mounted: false },
      persistent: true
    }],
    occupancy: Array.from({ length: 3 }, () => Array(4).fill("")),
    capacity: { containerProfile: container.containerProfile },
    hasUnplacedItems: false
  };
  const state = {
    selections: { selectedItemId: "" },
    itemById: { "blade-1": item },
    inventory: { gridItems: [item] }
  };

  const html = runtime.window.WS_APP.equipmentContainersPanel.renderSelectedContainerGrid(state, container, { gridModel: model });
  const tile = html.match(/<button class="equipment-container-grid__item[\s\S]*?<\/button>/)?.[0] || "";

  assert.match(tile, /<b>Kuro<\/b>/);
  assert.match(tile, /<small>2×1<\/small>/);
  assert.doesNotMatch(tile, /Catalog Blade/);
  assert.doesNotMatch(tile, /WEAPON|SWORD|90°|C2|R3|MOUNT/);
  assert.equal((tile.match(/<(?:b|small|i)>/g) || []).length, 2);
});

test("Housing grids use the same two-field item presentation", () => {
  const runtime = createBrowserRuntime({
    wsApp: {
      getItemInstanceDisplayName(item = {}) {
        return item.playerLabel || item.displayName || item.name || item.id || "Item";
      }
    }
  });
  runtime.load("js/housing-storage-runtime.js");

  const api = runtime.window.WS_APP.createHousingStorageRuntime({
    HOUSING_STORAGE_WIDTH: 4,
    HOUSING_STORAGE_LOCATION: "HOUSING_STORAGE",
    DEFAULT_STORAGE_UNIT_ID: "unit-1",
    HOUSING_STORAGE_KINDS: [],
    HOUSING_STORAGE_STATUSES: [],
    HOUSING_STORAGE_SORTS: [],
    escapeHtml,
    clampNumber: (value) => Number(value) || 0,
    formatCredits: String,
    formatHousingShipmentState: String,
    formatIsoLabel: String,
    getCitizenHousingRecords: () => [],
    getCitizenMarketOrders: () => [],
    getHousingActiveRecord: () => null,
    getHousingActiveRecordId: () => "",
    getHousingFeedback: () => null,
    getHousingRecordShipmentStats: () => ({}),
    getHousingRecordSubscription: () => null,
    getHousingShipmentState: () => "",
    getHousingShipmentUnitContext: () => null,
    parseCredits: Number,
    renderHousingModule: () => "",
    renderHousingRecord: () => "",
    renderHousingStorageShipmentPanel: () => "",
    setHousingFeedback: () => {}
  });

  const item = { id: "med-1", name: "Catalog Medkit", playerLabel: "Red Box" };
  const model = {
    unit: { id: "unit-1", width: 4, height: 2, slotCapacity: 8 },
    occupancy: Array.from({ length: 2 }, () => Array(4).fill("")),
    entries: [{
      item,
      placement: { column: 3, row: 1, rotation: 90 },
      footprint: { width: 1, height: 2, rotation: 90 },
      source: "persistent"
    }],
    hasUnplacedItems: false
  };

  const html = api.renderHousingPhysicalGrid(model, "");
  const tile = html.match(/<button[\s\S]*?class="housing-physical-grid__item[\s\S]*?<\/button>/)?.[0] || "";

  assert.match(tile, /<b>Red Box<\/b>/);
  assert.match(tile, /<small>1×2<\/small>/);
  assert.doesNotMatch(tile, /Catalog Medkit|90°|C3|R1/);
  assert.equal((tile.match(/<(?:b|small|i)>/g) || []).length, 2);
});
