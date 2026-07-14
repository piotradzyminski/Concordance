"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT, createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

function createCatalogRuntime() {
  const runtime = createBrowserRuntime();
  runtime.loadMany([
    "data/housing-rent-standards.js",
    "data/housing-layout-pools.js",
    "js/housing-rent-standards-store.js",
    "js/housing-layout-store.js"
  ]);
  return runtime;
}

test("Housing layout pools cover every private Rent tier with exact irregular cell areas", () => {
  const { window } = createCatalogRuntime();
  const validation = window.WS_APP.validateHousingLayoutPoolsCatalog();
  assert.equal(validation.valid, true);
  assert.equal(validation.counts.pools, 24);
  assert.equal(validation.counts.templates, 79);

  const catalog = window.WS_APP.getHousingLayoutCatalog();
  const poolsByTier = new Map(catalog.pools.map((pool) => [pool.tierId, pool]));
  window.WS_APP.getHousingRentStandards().forEach((standard) => {
    standard.tiers.forEach((tier) => {
      const pool = poolsByTier.get(tier.tierId);
      assert(pool, `Missing layout pool for ${tier.tierId}`);
      const expectedCount = standard.code === "H" ? 0 : ["G", "F", "E", "D", "C", "B"].includes(standard.code) ? 4 : 1;
      assert.equal(pool.templateIds.length, expectedCount, `${tier.tierId} template count`);
      pool.templateIds.forEach((templateId) => {
        const template = window.WS_APP.getHousingLayoutTemplate(templateId);
        assert(template, `Missing ${templateId}`);
        assert.equal(template.activeCellCount, Math.round(tier.areaM2 / catalog.cellAreaM2));
        assert.equal(template.floorPlan.activeCells.length, template.activeCellCount);
        assert(template.floorPlan.inactiveCells.length > 0 || template.variantFamily === "OPEN" || template.variantFamily === "LINEAR");
      });
    });
  });
});

test("Random pools resolve deterministically while choice pools respect an explicit layout", () => {
  const { window } = createCatalogRuntime();
  const input = {
    standardCode: "G",
    standardTierId: "housing-g-t3",
    housingRecordId: "housing-deterministic-test"
  };
  const first = window.WS_APP.resolveHousingLayoutAssignment(input);
  const second = window.WS_APP.resolveHousingLayoutAssignment(input);
  assert.equal(first.layoutSeed, second.layoutSeed);
  assert.equal(first.layoutTemplateId, second.layoutTemplateId);
  assert.equal(first.selectionMode, "DETERMINISTIC_RANDOM_POOL");

  const choice = window.WS_APP.resolveHousingLayoutAssignment({
    standardCode: "C",
    standardTierId: "housing-c-t2",
    housingRecordId: "housing-choice-test",
    layoutSeed: "LAYOUT-CHOICE-TEST",
    layoutTemplateId: "housing-c-t2-layout-alcove-02"
  });
  assert.equal(choice.layoutTemplateId, "housing-c-t2-layout-alcove-02");
  assert.equal(choice.template.variantFamily, "ALCOVE");
  assert.equal(choice.selectionMode, "EXPLICIT_SELECTION");
});

test("Household instantiates a persisted layout mask and rejects placement on an inactive cell", () => {
  const catalogRuntime = createCatalogRuntime();
  const template = catalogRuntime.window.WS_APP.getHousingLayoutTemplate("housing-c-t2-layout-alcove-02");
  const inactive = String(template.floorPlan.inactiveCells[0] || "").split(":").map(Number);
  assert.equal(inactive.length, 2);

  const candidate = {
    instanceId: "layout-test-chair",
    definitionId: "layout-test-chair-definition",
    ownerId: "citizen-layout-test",
    lifecycleState: "UNPACKAGED",
    location: { type: "HOUSING_STORAGE", storageUnitId: "layout-storage", gridX: 1, gridY: 1, rotation: 0 },
    durability: { current: 100 }
  };
  const record = {
    id: "housing-layout-test",
    type: "HOUSING_STANDARD_C",
    status: "ACTIVE",
    rentStatus: "PAID",
    utilityStatus: "ONLINE",
    maintenanceStatus: "NOMINAL",
    securityLevel: 8,
    privacyLevel: 8,
    standardCode: "C",
    standardTierId: "housing-c-t2",
    layoutPolicy: "CHOICE_POOL",
    layoutTemplateId: "housing-c-t2-layout-alcove-02",
    layoutSeed: "LAYOUT-HOUSEHOLD-TEST",
    storageUnits: [{ id: "layout-storage", width: 4, height: 4, slotCapacity: 16 }]
  };
  const runtime = createBrowserRuntime({
    wsApp: {
      getCitizenHousingRecords: () => [record],
      getCitizenEquipmentItemInstances: () => [candidate],
      getItemInstanceById: () => candidate,
      getEquipmentCatalogItemById: () => ({
        id: candidate.definitionId,
        itemType: "FURNITURE",
        footprint: "1x1",
        tags: ["HOUSEHOLD_PLACEABLE"],
        householdProfile: { placeable: true, footprint: "1x1" }
      }),
      commitItemInstanceTransaction: () => ({ ok: true }),
      validateHousingPlacement: () => ({ ok: true, placement: { column: 1, row: 1, rotation: 0 } })
    }
  });
  runtime.loadMany([
    "data/housing-rent-standards.js",
    "data/housing-layout-pools.js",
    "js/housing-rent-standards-store.js",
    "js/housing-layout-store.js",
    "js/household-store.js"
  ]);
  const household = runtime.window.WS_APP.getHousingHousehold("citizen-layout-test", record.id);
  assert.equal(household.layoutTemplateId, record.layoutTemplateId);
  assert.equal(household.layoutSeed, record.layoutSeed);
  assert.equal(household.floorPlan.activeCells.length, 140);
  assert.equal(household.validation.valid, true);

  const mainRoom = household.rooms.find((room) => room.layoutRoomKey === "main");
  const rejected = runtime.window.WS_APP.validateHouseholdPlacement({
    citizenId: "citizen-layout-test",
    housingRecordId: record.id,
    roomId: mainRoom.id,
    instanceId: candidate.instanceId,
    gridX: inactive[0],
    gridY: inactive[1],
    rotation: 0
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "HOUSEHOLD_PLACEMENT_OUTSIDE_ROOM");
});

test("Standard H bedspace has no private floor grid or furnishing room", () => {
  const record = {
    id: "housing-bedspace-test",
    type: "HOUSING_STANDARD_H",
    status: "ACTIVE",
    rentStatus: "PAID",
    utilityStatus: "ONLINE",
    maintenanceStatus: "NOMINAL",
    standardCode: "H",
    standardTierId: "housing-h-t1",
    layoutPolicy: "ASSIGNED_BEDSPACE",
    storageUnits: [{ id: "bedspace-locker", width: 4, height: 3, slotCapacity: 12 }]
  };
  const runtime = createBrowserRuntime({
    wsApp: {
      getCitizenHousingRecords: () => [record],
      getCitizenEquipmentItemInstances: () => []
    }
  });
  runtime.loadMany([
    "data/housing-rent-standards.js",
    "data/housing-layout-pools.js",
    "js/housing-rent-standards-store.js",
    "js/housing-layout-store.js",
    "js/household-store.js"
  ]);
  const assignment = runtime.window.WS_APP.resolveHousingLayoutAssignment(record);
  assert.equal(assignment.layoutPolicy, "ASSIGNED_BEDSPACE");
  assert.equal(assignment.layoutTemplateId, "");
  assert.equal(assignment.template, null);

  const household = runtime.window.WS_APP.getHousingHousehold("citizen-bedspace-test", record.id);
  assert.equal(household.layoutPolicy, "ASSIGNED_BEDSPACE");
  assert.equal(household.floorPlan.activeCells.length, 0);
  assert.equal(household.rooms.length, 0);
  assert.equal(household.validation.valid, true);
});

test("Housing layout data and API load before Housing Bridge and Household", () => {
  const index = read("index.html");
  assert(index.includes("data/housing-layout-pools.js?v=1"));
  assert(index.includes("js/housing-layout-store.js?v=1"));
  assert(index.indexOf("data/housing-rent-standards.js") < index.indexOf("data/housing-layout-pools.js"));
  assert(index.indexOf("data/housing-layout-pools.js") < index.indexOf("data/subscription-catalog.js"));
  assert(index.indexOf("js/housing-rent-standards-store.js") < index.indexOf("js/housing-layout-store.js"));
  assert(index.indexOf("js/housing-layout-store.js") < index.indexOf("js/housing-bridge-store.js"));
  assert(index.indexOf("js/housing-layout-store.js") < index.indexOf("js/household-store.js"));
});
