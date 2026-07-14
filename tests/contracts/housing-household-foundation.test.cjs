"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT, createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

function makeFurniture(instanceId, location) {
  return {
    instanceId,
    definitionId: "eqcat-test-bed",
    ownerId: "citizen-test",
    lifecycleState: "UNPACKAGED",
    location,
    durability: { current: 100 },
    instanceData: {
      name: "Test Bed",
      itemType: "FURNITURE",
      footprint: "2x2",
      tags: ["FURNITURE", "HOUSEHOLD_PLACEABLE"],
      householdProfile: { placeable: true, capabilities: ["SLEEP", "REST"] }
    }
  };
}

function createHouseholdRuntime(items = []) {
  const transactions = [];
  const housingRecord = {
    id: "housing-test-secured",
    title: "Secured Test Unit",
    type: "SECURED_UNIT",
    status: "ACTIVE",
    rentStatus: "PAID",
    utilityStatus: "UNKNOWN",
    maintenanceStatus: "NOMINAL",
    securityLevel: 8,
    privacyLevel: 8,
    comfortLevel: 7,
    storageUnits: [{ id: "storage-test", width: 4, height: 4, slotCapacity: 16 }]
  };
  const itemById = new Map(items.map((item) => [item.instanceId, item]));
  const runtime = createBrowserRuntime({
    wsApp: {
      getCitizenHousingRecords: () => [housingRecord],
      getCitizenEquipmentItemInstances: () => [...itemById.values()],
      getItemInstanceById: (instanceId) => itemById.get(instanceId) || null,
      getEquipmentCatalogItemById: () => ({
        id: "eqcat-test-bed",
        name: "Test Bed",
        itemType: "FURNITURE",
        footprint: "2x2",
        tags: ["FURNITURE", "HOUSEHOLD_PLACEABLE"],
        householdProfile: { placeable: true, capabilities: ["SLEEP", "REST"] }
      }),
      commitItemInstanceTransaction: (input) => {
        transactions.push(input);
        return { ok: true, committed: true, transaction: { transactionId: `tx-${transactions.length}` } };
      },
      validateHousingPlacement: () => ({ ok: true, placement: { column: 1, row: 1, rotation: 0 } })
    }
  });
  runtime.load("js/household-store.js");
  return { ...runtime, transactions, housingRecord };
}

test("Household derives canonical rooms and safe-space readiness from Housing", () => {
  const { window } = createHouseholdRuntime();
  const household = window.WS_APP.getHousingHousehold("citizen-test", "housing-test-secured");
  assert.equal(household.schemaVersion, "household_foundation_2_0x");
  assert.equal(household.floorPlan.width, 12);
  assert.ok(household.rooms.some((room) => room.type === "SAFE_ROOM"));

  const safeSpace = window.WS_APP.getHouseholdSafeSpaceProfile("citizen-test", "housing-test-secured");
  assert.equal(safeSpace.ready, true);
  assert.equal(safeSpace.recoveryReady, true);
  assert.equal(safeSpace.consumableUseReady, true);

  const sleep = window.WS_APP.resolveHouseholdOperationReadiness({
    citizenId: "citizen-test",
    housingRecordId: "housing-test-secured",
    operationType: "SLEEP"
  });
  assert.equal(sleep.ok, true);
  assert.equal(sleep.commitSupported, false);
  assert.equal(sleep.executionOwner, "HOUSEHOLD_RECOVERY_RUNTIME_PENDING");
});

test("Household placement validates room bounds and collisions", () => {
  const placed = makeFurniture("furniture-placed", {
    type: "HOUSING_ROOM",
    housingRecordId: "housing-test-secured",
    roomId: "housing-test-secured-safe",
    gridX: 9,
    gridY: 1,
    rotation: 0
  });
  const candidate = makeFurniture("furniture-candidate", {
    type: "HOUSING_STORAGE",
    storageUnitId: "storage-test",
    gridX: 1,
    gridY: 1,
    rotation: 0
  });
  const { window } = createHouseholdRuntime([placed, candidate]);

  const collision = window.WS_APP.validateHouseholdPlacement({
    citizenId: "citizen-test",
    housingRecordId: "housing-test-secured",
    roomId: "housing-test-secured-safe",
    instanceId: "furniture-candidate",
    gridX: 9,
    gridY: 1,
    rotation: 0
  });
  assert.equal(collision.ok, false);
  assert.equal(collision.reason, "HOUSEHOLD_PLACEMENT_COLLISION");

  const valid = window.WS_APP.validateHouseholdPlacement({
    citizenId: "citizen-test",
    housingRecordId: "housing-test-secured",
    roomId: "housing-test-secured-safe",
    instanceId: "furniture-candidate",
    gridX: 11,
    gridY: 1,
    rotation: 0
  });
  assert.equal(valid.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(valid.placement)), { column: 11, row: 1, rotation: 0 });
});

test("Household furniture commands move the same ItemInstance through the transaction boundary", () => {
  const candidate = makeFurniture("furniture-candidate", {
    type: "HOUSING_STORAGE",
    storageUnitId: "storage-test",
    gridX: 1,
    gridY: 1,
    rotation: 0
  });
  const { window, transactions } = createHouseholdRuntime([candidate]);

  const placed = window.WS_APP.placeHouseholdItem({
    citizenId: "citizen-test",
    housingRecordId: "housing-test-secured",
    roomId: "housing-test-secured-safe",
    instanceId: "furniture-candidate",
    gridX: 9,
    gridY: 1,
    idempotencyKey: "household-place:test"
  });
  assert.equal(placed.ok, true);
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].sourceDomain, "HOUSEHOLD");
  assert.equal(transactions[0].operations[0].type, "MOVE");
  assert.equal(transactions[0].operations[0].toLocation.type, "HOUSING_ROOM");
  assert.equal(transactions[0].operations[0].toLocation.roomId, "housing-test-secured-safe");
});

test("ItemInstance accepts HOUSING_ROOM as canonical physical location", () => {
  const runtime = createBrowserRuntime({
    appData: {
      equipmentCatalog: [{
        id: "eqcat-test-bed",
        name: "Test Bed",
        itemType: "FURNITURE",
        footprint: "2x2",
        tags: ["FURNITURE", "HOUSEHOLD_PLACEABLE"]
      }],
      itemInstances: [makeFurniture("furniture-room", {
        type: "HOUSING_ROOM",
        housingRecordId: "housing-test-secured",
        roomId: "housing-test-secured-safe",
        gridX: 9,
        gridY: 1,
        rotation: 0
      })]
    }
  });
  runtime.loadMany(["js/store-utils.js", "js/equipment-catalog-store.js", "js/item-instance-store.js"]);
  const validation = runtime.window.WS_APP.validateItemInstances();
  assert.equal(validation.valid, true);
  const view = runtime.window.WS_APP.getItemInstanceView("furniture-room");
  assert.equal(view.location, "HOUSEHOLD");
  assert.equal(view.householdPlacement.roomId, "housing-test-secured-safe");
  assert.equal(runtime.window.WS_APP.getEquipmentInstanceSummary(["citizen-test"]).householdPlacedCount, 1);
});

test("Housing UI exposes Household as a distinct section without owning another persistence store", () => {
  const housing = read("js/housing.js");
  const household = read("js/household-store.js");
  const householdRuntime = read("js/housing-household-runtime.js");
  const index = read("index.html");

  assert.match(housing, /data-housing-tab="HOUSEHOLD"/);
  assert.match(housing, /renderHousingHouseholdTab/);
  assert.match(householdRuntime, /function renderHousingHouseholdTab\(/);
  assert.match(household, /commitItemInstanceTransaction/);
  assert.doesNotMatch(household, /localStorage|sessionStorage/);
  assert.doesNotMatch(householdRuntime, /localStorage|sessionStorage/);
  assert.match(index, /js\/household-store\.js\?v=2/);
});
