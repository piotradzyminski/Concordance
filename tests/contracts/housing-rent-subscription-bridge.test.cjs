"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT, createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createRuntime() {
  let contract = {
    subscriptionContractId: "rent-contract-test",
    subscriptionCatalogId: "sub-housing-standard-g",
    citizenId: "citizen-rent-test",
    tierId: "housing-g-t1",
    contractStatus: "ACTIVE",
    billingStatus: "PAID",
    entitlementStatus: "ACTIVE",
    revision: 1,
    displaySnapshot: { provider: "Habitat Ledger" },
    metadata: {}
  };
  let citizen = {
    id: "citizen-rent-test",
    recordType: "citizen",
    address: "TEST ADDRESS",
    subscriptions: [clone(contract)],
    housing: []
  };
  let instances = [];

  const runtime = createBrowserRuntime({
    wsApp: {
      getCitizens: () => [clone(citizen)],
      getCitizenById: (citizenId) => citizenId === citizen.id ? clone(citizen) : null,
      updateCitizen: (citizenId, patch) => {
        if (citizenId !== citizen.id) return null;
        citizen = { ...citizen, ...clone(patch) };
        return clone(citizen);
      },
      getCitizenEquipmentItemInstances: () => clone(instances),
      SubscriptionAPI: {
        getSubscriptionContract: (contractId) => contractId === contract.subscriptionContractId ? clone(contract) : null,
        getCitizenSubscriptionContracts: (citizenId) => citizenId === citizen.id ? [clone(contract)] : []
      }
    }
  });

  runtime.loadMany([
    "data/housing-rent-standards.js",
    "data/housing-layout-pools.js",
    "js/housing-rent-standards-store.js",
    "js/housing-layout-store.js",
    "js/housing-rent-subscription-bridge.js"
  ]);

  return {
    runtime,
    getCitizen: () => clone(citizen),
    getContract: () => clone(contract),
    setContract(next) {
      contract = { ...contract, ...clone(next) };
      citizen.subscriptions = [clone(contract)];
    },
    setInstances(next) { instances = clone(next); }
  };
}

test("Rent bridge allocates one persistent Housing Unit with a deterministic layout", () => {
  const state = createRuntime();
  const citizen = state.getCitizen();
  assert.equal(citizen.housing.length, 1);
  const unit = citizen.housing[0];
  assert.equal(unit.linkedSubscriptionId, "rent-contract-test");
  assert.equal(unit.standardCode, "G");
  assert.equal(unit.standardTierId, "housing-g-t1");
  assert.equal(unit.areaM2, 15);
  assert.match(unit.layoutTemplateId, /^housing-g-t1-layout-/);
  assert.ok(unit.layoutSeed);
  assert.equal(unit.rentBridge.appliedContractRevision, 1);
  assert.equal(unit.occupancyStatus, "OCCUPIED");
});

test("A same-area tier change modernizes the same unit without replacing its floor plan", () => {
  const state = createRuntime();
  const before = state.getCitizen().housing[0];
  state.setContract({ tierId: "housing-g-t2", revision: 2 });
  const result = state.runtime.window.WS_APP.reconcileHousingRentContract("rent-contract-test");
  const after = state.getCitizen().housing[0];
  assert.equal(result.resultCode, "HOUSING_UNIT_MODERNIZED");
  assert.equal(after.id, before.id);
  assert.equal(after.layoutTemplateId, before.layoutTemplateId);
  assert.equal(after.layoutSeed, before.layoutSeed);
  assert.equal(after.standardTierId, "housing-g-t2");
  assert.ok(after.fixedFixtures.includes("SERVICE_WALL_REHEAT"));
  assert.equal(after.rentTransition, null);
});

test("An area-changing tier update prepares relocation and an ItemInstance transfer manifest", () => {
  const state = createRuntime();
  const current = state.getCitizen().housing[0];
  const storageId = current.storageUnits[0].id;
  state.setInstances([
    {
      instanceId: "stored-item",
      ownerId: "citizen-rent-test",
      location: { type: "HOUSING_STORAGE", storageUnitId: storageId }
    },
    {
      instanceId: "placed-chair",
      ownerId: "citizen-rent-test",
      location: { type: "HOUSING_ROOM", housingRecordId: current.id, roomId: "main" }
    }
  ]);
  state.setContract({ tierId: "housing-g-t3", revision: 2 });
  const result = state.runtime.window.WS_APP.reconcileHousingRentContract("rent-contract-test");
  const after = state.getCitizen().housing[0];
  assert.equal(result.resultCode, "HOUSING_RELOCATION_PREPARED");
  assert.equal(after.standardTierId, "housing-g-t1", "current physical unit remains unchanged until transfer");
  assert.equal(after.occupancyStatus, "RELOCATION_REQUIRED");
  assert.equal(after.rentTransition.targetUnit.standardTierId, "housing-g-t3");
  assert.equal(after.rentTransition.targetUnit.areaM2, 18);
  assert.deepEqual(after.rentTransition.transferManifest.instanceIds.sort(), ["placed-chair", "stored-item"]);
});

test("Cancellation keeps a non-empty unit in release-pending and finalizes after items are removed", () => {
  const state = createRuntime();
  const current = state.getCitizen().housing[0];
  state.setInstances([{
    instanceId: "kept-item",
    ownerId: "citizen-rent-test",
    location: { type: "HOUSING_ROOM", housingRecordId: current.id, roomId: "main" }
  }]);
  state.setContract({ contractStatus: "CANCELLED", billingStatus: "CANCELLED", entitlementStatus: "INACTIVE", revision: 2 });
  const pending = state.runtime.window.WS_APP.reconcileHousingRentContract("rent-contract-test");
  assert.equal(pending.resultCode, "HOUSING_RELEASE_PREPARED");
  assert.equal(state.getCitizen().housing[0].status, "RELEASE_PENDING");

  state.setInstances([]);
  const finalized = state.runtime.window.WS_APP.finalizeHousingUnitRelease("rent-contract-test");
  assert.equal(finalized.resultCode, "HOUSING_UNIT_RELEASED");
  assert.equal(state.getCitizen().housing[0].archived, true);
});

test("Market is included in visible module sections for Admin and Citizen", () => {
  const modules = read("js/modules.js");
  const matches = modules.match(/\["terminal-hub", "service", "equipment", "cyberware", "market", "housing"\]/g) || [];
  assert.equal(matches.length, 2);
});

test("Rent bridge loads after SubscriptionAPI and before the module shell", () => {
  const index = read("index.html");
  assert.match(index, /js\/housing-rent-subscription-bridge\.js\?v=1/);
  assert.ok(index.indexOf("js/subscription-api.js?v=5") < index.indexOf("js/housing-rent-subscription-bridge.js?v=1"));
  assert.ok(index.indexOf("js/housing-rent-subscription-bridge.js?v=1") < index.indexOf("js/modules.js?v=302"));
});
