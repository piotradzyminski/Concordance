"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT, createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

function furniture(instanceId, location, definitionId = "eqcat-household-rest-cot") {
  return {
    instanceId,
    definitionId,
    ownerId: "citizen-b",
    lifecycleState: "UNPACKAGED",
    location,
    durability: { current: 100 },
    instanceData: {
      name: instanceId,
      itemType: "HOUSEHOLD_FURNISHING",
      footprint: "2x3",
      tags: ["FURNITURE", "HOUSEHOLD_PLACEABLE"],
      householdProfile: { placeable: true, footprint: "2x3", capabilities: ["REST", "SLEEP"] }
    }
  };
}

function makeDomainRuntime(items) {
  const record = {
    id: "housing-citizen-b-secured-test",
    title: "Secured Unit",
    type: "SECURED_UNIT",
    status: "ACTIVE",
    rentStatus: "PAID",
    utilityStatus: "ACTIVE",
    maintenanceStatus: "NOMINAL",
    securityLevel: 9,
    privacyLevel: 8,
    comfortLevel: 8,
    storageUnits: [
      { id: "housing-storage-citizen-b-secured", label: "Secured", width: 4, height: 4, slotCapacity: 16 },
      { id: "housing-storage-citizen-b-furnishing", label: "Furnishing", width: 6, height: 4, slotCapacity: 24 }
    ]
  };
  const byId = new Map(items.map((item) => [item.instanceId, item]));
  const runtime = createBrowserRuntime({
    wsApp: {
      getCitizenHousingRecords: () => [record],
      getCitizenEquipmentItemInstances: () => [...byId.values()],
      getItemInstanceById: (id) => byId.get(id) || null,
      getEquipmentCatalogItemById: () => ({
        itemType: "HOUSEHOLD_FURNISHING",
        footprint: "2x3",
        tags: ["FURNITURE", "HOUSEHOLD_PLACEABLE"],
        householdProfile: { placeable: true, footprint: "2x3", capabilities: ["REST", "SLEEP"] }
      })
    }
  });
  runtime.load("js/household-store.js");
  return { ...runtime, record };
}

test("Household furnishing query returns only placeable instances assigned to the active Housing record", () => {
  const stored = furniture("stored-cot", {
    type: "HOUSING_STORAGE",
    storageUnitId: "housing-storage-citizen-b-furnishing",
    gridX: 1,
    gridY: 1,
    rotation: 0
  });
  const placed = furniture("placed-cot", {
    type: "HOUSING_ROOM",
    housingRecordId: "housing-citizen-b-secured-test",
    roomId: "housing-citizen-b-secured-test-living",
    gridX: 2,
    gridY: 2,
    rotation: 0
  });
  const foreign = furniture("foreign-cot", {
    type: "HOUSING_STORAGE",
    storageUnitId: "different-storage",
    gridX: 1,
    gridY: 1,
    rotation: 0
  });
  const { window } = makeDomainRuntime([stored, placed, foreign]);
  const rows = window.WS_APP.getHouseholdFurnishingItems("citizen-b", "housing-citizen-b-secured-test");
  assert.deepEqual(JSON.parse(JSON.stringify(rows.map((row) => [row.instance.instanceId, row.scope]))), [
    ["stored-cot", "STORAGE"],
    ["placed-cot", "PLACED"]
  ]);
});

test("Furnishing workspace renders canonical storage selection, placement grid, rotation and return controls", () => {
  const runtimeSource = read("js/housing-household-runtime.js");
  const housingSource = read("js/housing.js");
  const moduleMap = read("js/modules.js");

  assert.match(runtimeSource, /data-household-select-item/);
  assert.match(runtimeSource, /data-household-cell/);
  assert.match(runtimeSource, /data-household-rotate/);
  assert.match(runtimeSource, /data-household-return-item/);
  assert.match(runtimeSource, /validateHouseholdPlacement/);
  assert.match(runtimeSource, /placeHouseholdItem/);
  assert.match(runtimeSource, /returnHouseholdItemToStorage/);
  assert.doesNotMatch(runtimeSource, /localStorage|sessionStorage/);
  assert.match(housingSource, /handleHousingHouseholdPointerMove/);
  assert.match(housingSource, /handleHousingHouseholdClick/);
  assert.match(moduleMap, /js\/housing-household-runtime\.js\?v=1/);
});

test("Furnishing fixture data provides catalog definitions, a staging storage and immediately testable ItemInstances", () => {
  const catalog = read("data/equipment-catalog.js");
  const types = read("data/item-type-catalog.js");
  const instances = read("data/item-instances.js");
  const citizens = read("data/citizens.js");

  assert.match(types, /HOUSEHOLD_FURNISHING/);
  assert.match(catalog, /eqcat-household-rest-cot/);
  assert.match(catalog, /eqcat-household-med-locker/);
  assert.match(instances, /household-b-rest-cot/);
  assert.match(instances, /household-b-fold-table/);
  assert.match(instances, /"type": "HOUSING_ROOM"/);
  assert.match(citizens, /housing-storage-citizen-b-furnishing/);
});
