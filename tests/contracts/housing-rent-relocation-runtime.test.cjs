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

function createRuntime(options = {}) {
  const contract = {
    subscriptionContractId: "rent-relocation-test",
    subscriptionCatalogId: "sub-housing-standard-g",
    citizenId: "citizen-relocation-test",
    tierId: "housing-g-t3",
    contractStatus: "ACTIVE",
    billingStatus: "PAID",
    entitlementStatus: "ACTIVE",
    revision: 2,
    displaySnapshot: { provider: "Habitat Ledger" }
  };
  const currentRecord = {
    id: "housing-old",
    title: "Housing Standard G / T1",
    status: "ACTIVE",
    occupancyStatus: "RELOCATION_REQUIRED",
    isPrimary: true,
    provider: "Habitat Ledger",
    linkedSubscriptionId: contract.subscriptionContractId,
    standardCode: "G",
    standardTierId: "housing-g-t1",
    areaM2: 15,
    visibleAddress: "OLD ADDRESS",
    traceAddress: "OLD TRACE",
    storageUnits: [{ id: "old-main", type: "GENERAL", width: 4, height: 3, slotCapacity: 12 }],
    rentBridge: {
      subscriptionContractId: contract.subscriptionContractId,
      subscriptionCatalogId: contract.subscriptionCatalogId,
      appliedContractRevision: 2,
      transitionState: "RELOCATION_REQUIRED"
    },
    rentTransition: {
      transitionId: "relocation-test-2",
      type: "RELOCATION_REQUIRED",
      status: "PREPARED",
      contractRevision: 2,
      from: {
        housingRecordId: "housing-old",
        standardCode: "G",
        standardTierId: "housing-g-t1",
        areaM2: 15
      },
      targetUnit: {
        housingRecordId: "housing-new",
        title: "Housing Standard G / T3",
        standardCode: "G",
        standardTierId: "housing-g-t3",
        areaM2: 18,
        visibleAddress: "NEW ADDRESS",
        traceAddress: "NEW TRACE",
        storageUnits: options.smallStorage
          ? [{ id: "new-main", type: "GENERAL", width: 1, height: 1, slotCapacity: 1 }]
          : [{ id: "new-main", type: "GENERAL", width: 4, height: 4, slotCapacity: 16 }],
        fixedFixtures: ["PRIVATE_WET_SECTION"],
        rentalFurnishings: ["FOLDING_BED"],
        capabilities: ["PRIVATE_SLEEP"],
        furnishingPolicy: "LIMITED",
        parcelMaxFootprint: "2x2",
        disposalAccess: "COMMUNAL_FLOOR_POINT",
        defaultFurnishingGrade: "UTILITY",
        maintenanceCoverage: "PAID_SERVICE",
        layoutPolicy: "RANDOM_POOL",
        layoutTemplateId: "housing-g-t3-layout-linear-01",
        layoutSeed: "LAYOUT-NEW",
        layoutVariantFamily: "LINEAR",
        household: { residentIds: ["citizen-relocation-test"], layoutTemplateId: "housing-g-t3-layout-linear-01" }
      },
      transferManifest: {
        housingRecordId: "housing-old",
        storageUnitIds: ["old-main"],
        storedInstanceIds: ["stored-item"],
        furnishingInstanceIds: ["placed-item"],
        otherInstanceIds: [],
        instanceIds: ["stored-item", "placed-item"]
      }
    }
  };
  let citizen = {
    id: contract.citizenId,
    recordType: "citizen",
    address: "OLD ADDRESS",
    visibleAddress: "OLD ADDRESS",
    trace: "OLD TRACE",
    traceAddress: "OLD TRACE",
    housing: [clone(currentRecord)]
  };
  const instances = new Map([
    ["stored-item", {
      instanceId: "stored-item",
      ownerId: contract.citizenId,
      lifecycleState: "UNPACKAGED",
      location: { type: "HOUSING_STORAGE", storageUnitId: "old-main", gridX: 1, gridY: 1, rotation: 0 },
      instanceData: { footprint: options.largeItem ? "2x2" : "2x1" }
    }],
    ["placed-item", {
      instanceId: "placed-item",
      ownerId: contract.citizenId,
      lifecycleState: "UNPACKAGED",
      location: { type: "HOUSING_ROOM", housingRecordId: "housing-old", roomId: "main", gridX: 2, gridY: 2, rotation: 0 },
      instanceData: { footprint: "1x2" }
    }]
  ]);
  let transactionSequence = 0;
  let changedTier = "";
  let failHousingPersistence = options.failHousingPersistenceOnce === true;
  const transactionRecords = Array.isArray(options.recoveryTransactions) ? clone(options.recoveryTransactions) : [];

  const runtime = createBrowserRuntime({
    wsApp: {
      getCitizenById: (citizenId) => citizenId === citizen.id ? clone(citizen) : null,
      updateCitizen: (citizenId, patch) => {
        if (citizenId !== citizen.id) return null;
        if (failHousingPersistence) {
          failHousingPersistence = false;
          return null;
        }
        citizen = { ...citizen, ...clone(patch) };
        return clone(citizen);
      },
      getItemInstanceById: (instanceId) => instances.has(instanceId) ? clone(instances.get(instanceId)) : null,
      getItemInstanceView: (instanceId) => {
        const instance = instances.get(instanceId);
        if (!instance) return null;
        const [width, height] = String(instance.instanceData?.footprint || "1x1").split("x").map(Number);
        return { instanceId, width, height, footprint: `${width}x${height}` };
      },
      getItemInstanceStoreRevision: () => 7 + transactionSequence,
      commitItemInstanceTransaction: (input) => {
        transactionSequence += 1;
        const beforeInstances = input.operations.map((operation) => ({ instanceId: operation.instanceId, instance: clone(instances.get(operation.instanceId)) }));
        input.operations.forEach((operation) => {
          const instance = instances.get(operation.instanceId);
          instances.set(operation.instanceId, { ...instance, location: clone(operation.toLocation), lifecycleState: operation.lifecycleState });
        });
        const transaction = {
          transactionId: `tx-${transactionSequence}`,
          idempotencyKey: input.idempotencyKey,
          sourceDomain: input.sourceDomain,
          status: "COMMITTED",
          metadata: clone(input.metadata || {}),
          beforeInstances,
          afterInstances: input.operations.map((operation) => ({ instanceId: operation.instanceId, instance: clone(instances.get(operation.instanceId)) }))
        };
        transactionRecords.push(transaction);
        return { ok: true, committed: true, operation: "COMMITTED", transaction: clone(transaction) };
      },
      compensateItemInstanceTransaction: (transactionId) => {
        const transaction = transactionRecords.find((entry) => entry.transactionId === transactionId);
        if (!transaction) return { ok: false, reason: "TRANSACTION_NOT_FOUND" };
        transaction.beforeInstances.forEach((entry) => instances.set(entry.instanceId, clone(entry.instance)));
        transaction.status = "COMPENSATED";
        return { ok: true, compensated: true, transaction: clone(transaction) };
      },
      getItemInstanceTransactions: () => clone(transactionRecords),
      reconcileHousingRentContract: () => ({ ok: true }),
      SubscriptionAPI: {
        getSubscriptionContract: (contractId) => contractId === contract.subscriptionContractId ? clone(contract) : null,
        changeSubscriptionTier: (_contractId, tierId) => {
          changedTier = tierId;
          return { ok: true, resultCode: "SUBSCRIPTION_TIER_CHANGED" };
        }
      }
    }
  });
  runtime.load("js/housing-rent-relocation-runtime.js");

  return {
    runtime,
    getCitizen: () => clone(citizen),
    getInstance: (instanceId) => clone(instances.get(instanceId)),
    getChangedTier: () => changedTier,
    getTransactionSequence: () => transactionSequence,
    getTransactions: () => clone(transactionRecords)
  };
}

test("Relocation preview packs stored items and placed furnishings into target Housing storage", () => {
  const state = createRuntime();
  const preview = state.runtime.window.WS_APP.previewHousingRentRelocation("rent-relocation-test");
  assert.equal(preview.ok, true);
  assert.deepEqual(Array.from(preview.instanceIds).sort(), ["placed-item", "stored-item"]);
  preview.placements.forEach((placement) => {
    assert.equal(placement.targetLocation.type, "HOUSING_STORAGE");
    assert.equal(placement.targetLocation.housingRecordId, "housing-new");
    assert.equal(placement.targetLocation.storageUnitId, "new-main");
  });
});

test("Approval atomically keeps ItemInstance identity, activates the target unit and archives the old unit", () => {
  const state = createRuntime();
  const result = state.runtime.window.WS_APP.approveHousingRentRelocation("rent-relocation-test");
  assert.equal(result.ok, true);
  assert.equal(result.resultCode, "HOUSING_RELOCATION_COMPLETED");
  const citizen = state.getCitizen();
  assert.equal(citizen.housing.length, 2);
  assert.equal(citizen.housing[0].id, "housing-new");
  assert.equal(citizen.housing[0].linkedSubscriptionId, "rent-relocation-test");
  assert.equal(citizen.housing[0].occupancyStatus, "OCCUPIED");
  assert.equal(citizen.housing[0].rentTransition, null);
  assert.equal(citizen.housing[1].id, "housing-old");
  assert.equal(citizen.housing[1].archived, true);
  assert.equal(citizen.housing[1].linkedSubscriptionId, "");
  assert.equal(citizen.address, "NEW ADDRESS");
  assert.equal(state.runtime.window.WS_APP.housingActiveRecordByCitizen[citizen.id], "housing-new");
  assert.equal(state.getInstance("stored-item").instanceId, "stored-item");
  assert.equal(state.getInstance("placed-item").instanceId, "placed-item");
  assert.equal(state.getInstance("stored-item").location.housingRecordId, "housing-new");
  assert.equal(state.getInstance("placed-item").location.type, "HOUSING_STORAGE");
});

test("Relocation is blocked before mutation when target storage cannot fit the manifest", () => {
  const state = createRuntime({ smallStorage: true, largeItem: true });
  const result = state.runtime.window.WS_APP.approveHousingRentRelocation("rent-relocation-test");
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "HOUSING_RELOCATION_TARGET_CAPACITY_EXCEEDED");
  assert.equal(state.getCitizen().housing[0].id, "housing-old");
  assert.equal(state.getInstance("stored-item").location.storageUnitId, "old-main");
});

test("Cancelling a prepared move restores the previous tier through SubscriptionAPI", () => {
  const state = createRuntime();
  const result = state.runtime.window.WS_APP.cancelHousingRentRelocation("rent-relocation-test");
  assert.equal(result.ok, true);
  assert.equal(result.resultCode, "HOUSING_RELOCATION_CANCELLED");
  assert.equal(state.getChangedTier(), "housing-g-t1");
});



test("Housing persistence failure compensates the canonical ItemInstance move", () => {
  const state = createRuntime({ failHousingPersistenceOnce: true });
  const result = state.runtime.window.WS_APP.approveHousingRentRelocation("rent-relocation-test");
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "HOUSING_RELOCATION_PERSISTENCE_FAILED");
  assert.equal(result.compensation.ok, true);
  assert.equal(state.getCitizen().housing[0].id, "housing-old");
  assert.equal(state.getInstance("stored-item").location.storageUnitId, "old-main");
  assert.equal(state.getInstance("placed-item").location.type, "HOUSING_ROOM");
  assert.equal(state.getTransactions()[0].status, "COMPENSATED");
});

test("Startup recovery finalizes a committed relocation without a second physical commit", () => {
  const targetStored = {
    instanceId: "stored-item",
    instance: {
      instanceId: "stored-item",
      ownerId: "citizen-relocation-test",
      lifecycleState: "UNPACKAGED",
      location: { type: "HOUSING_STORAGE", housingRecordId: "housing-new", storageUnitId: "new-main", gridX: 1, gridY: 1, rotation: 0 },
      instanceData: { footprint: "2x1" }
    }
  };
  const targetPlaced = {
    instanceId: "placed-item",
    instance: {
      instanceId: "placed-item",
      ownerId: "citizen-relocation-test",
      lifecycleState: "UNPACKAGED",
      location: { type: "HOUSING_STORAGE", housingRecordId: "housing-new", storageUnitId: "new-main", gridX: 3, gridY: 1, rotation: 0 },
      instanceData: { footprint: "1x2" }
    }
  };
  const state = createRuntime({
    recoveryTransactions: [{
      transactionId: "tx-recovery",
      idempotencyKey: "housing-relocation:relocation-test-2:2:attempt-0",
      sourceDomain: "HOUSING",
      status: "COMMITTED",
      metadata: {
        operationType: "HOUSING_RELOCATION",
        transitionId: "relocation-test-2",
        contractId: "rent-relocation-test",
        targetHousingRecordId: "housing-new"
      },
      afterInstances: [targetStored, targetPlaced]
    }]
  });
  const citizen = state.getCitizen();
  assert.equal(citizen.housing[0].id, "housing-new");
  assert.equal(citizen.housing[1].id, "housing-old");
  assert.equal(citizen.housing[1].archived, true);
  assert.equal(state.getTransactionSequence(), 0);
});

test("Relocation runtime loads after the Rent bridge and Housing UI exposes approve/cancel actions", () => {
  const index = read("index.html");
  const housing = read("js/housing.js");
  const modules = read("js/modules.js");
  assert.match(index, /js\/housing-rent-subscription-bridge\.js\?v=3/);
  assert.match(index, /js\/housing-rent-relocation-runtime\.js\?v=1/);
  assert.ok(index.indexOf("js/housing-rent-subscription-bridge.js?v=3") < index.indexOf("js/housing-rent-relocation-runtime.js?v=1"));
  assert.match(housing, /data-housing-approve-relocation/);
  assert.match(housing, /data-housing-cancel-relocation/);
  assert.match(modules, /css\/housing\.css\?v=38/);
  assert.match(modules, /js\/housing\.js\?v=53/);
});

test("Relocation commits through the canonical ItemInstance transaction stores", () => {
  const contract = {
    subscriptionContractId: "rent-relocation-real-store",
    subscriptionCatalogId: "sub-housing-standard-g",
    citizenId: "citizen-real-store",
    tierId: "housing-g-t3",
    contractStatus: "ACTIVE",
    billingStatus: "PAID",
    entitlementStatus: "ACTIVE",
    revision: 3,
    displaySnapshot: { provider: "Habitat Ledger" }
  };
  let citizen = {
    id: contract.citizenId,
    recordType: "citizen",
    address: "OLD REAL ADDRESS",
    visibleAddress: "OLD REAL ADDRESS",
    trace: "OLD REAL TRACE",
    traceAddress: "OLD REAL TRACE",
    housing: [{
      id: "housing-real-old",
      title: "Housing Standard G / T1",
      status: "ACTIVE",
      occupancyStatus: "RELOCATION_REQUIRED",
      isPrimary: true,
      linkedSubscriptionId: contract.subscriptionContractId,
      standardCode: "G",
      standardTierId: "housing-g-t1",
      areaM2: 15,
      visibleAddress: "OLD REAL ADDRESS",
      traceAddress: "OLD REAL TRACE",
      storageUnits: [{ id: "real-old-storage", type: "GENERAL", width: 2, height: 2 }],
      rentTransition: {
        transitionId: "relocation-real-store-3",
        type: "RELOCATION_REQUIRED",
        status: "PREPARED",
        contractRevision: 3,
        from: { housingRecordId: "housing-real-old", standardCode: "G", standardTierId: "housing-g-t1", areaM2: 15 },
        targetUnit: {
          housingRecordId: "housing-real-new",
          title: "Housing Standard G / T3",
          standardCode: "G",
          standardTierId: "housing-g-t3",
          areaM2: 18,
          visibleAddress: "NEW REAL ADDRESS",
          traceAddress: "NEW REAL TRACE",
          storageUnits: [{ id: "real-new-storage", type: "GENERAL", width: 3, height: 3 }],
          household: { residentIds: [contract.citizenId] }
        },
        transferManifest: {
          storedInstanceIds: ["real-stored-item"],
          furnishingInstanceIds: ["real-placed-item"],
          otherInstanceIds: [],
          instanceIds: ["real-stored-item", "real-placed-item"]
        }
      }
    }]
  };

  const runtime = createBrowserRuntime({
    appData: {
      itemInstances: [{
        instanceId: "real-stored-item",
        definitionId: "custom:real-stored-item",
        ownerId: contract.citizenId,
        lifecycleState: "UNPACKAGED",
        location: { type: "HOUSING_STORAGE", housingRecordId: "housing-real-old", storageUnitId: "real-old-storage", gridX: 1, gridY: 1, rotation: 0 },
        instanceData: { footprint: "2x1" }
      }, {
        instanceId: "real-placed-item",
        definitionId: "custom:real-placed-item",
        ownerId: contract.citizenId,
        lifecycleState: "UNPACKAGED",
        location: { type: "HOUSING_ROOM", housingRecordId: "housing-real-old", roomId: "main", gridX: 1, gridY: 1, rotation: 0 },
        instanceData: { footprint: "1x1" }
      }]
    },
    wsApp: {
      getCampaignDateIso: () => "2109-02-13T12:00:00.000Z",
      getCitizenById: (citizenId) => citizenId === citizen.id ? clone(citizen) : null,
      updateCitizen: (citizenId, patch) => {
        if (citizenId !== citizen.id) return null;
        citizen = { ...citizen, ...clone(patch) };
        return clone(citizen);
      },
      reconcileHousingRentContract: () => ({ ok: true }),
      SubscriptionAPI: {
        getSubscriptionContract: (contractId) => contractId === contract.subscriptionContractId ? clone(contract) : null,
        changeSubscriptionTier: () => ({ ok: true })
      }
    }
  });
  runtime.loadMany([
    "js/store-utils.js",
    "js/item-instance-store.js",
    "js/item-instance-transaction-store.js",
    "js/housing-rent-relocation-runtime.js"
  ]);

  const result = runtime.window.WS_APP.approveHousingRentRelocation(contract.subscriptionContractId);
  assert.equal(result.ok, true);
  assert.equal(result.itemCommit.transaction.status, "COMMITTED");
  const stored = runtime.window.WS_APP.getItemInstanceById("real-stored-item");
  const placed = runtime.window.WS_APP.getItemInstanceById("real-placed-item");
  assert.equal(stored.location.type, "HOUSING_STORAGE");
  assert.equal(stored.location.housingRecordId, "housing-real-new");
  assert.equal(stored.location.storageUnitId, "real-new-storage");
  assert.equal(placed.location.type, "HOUSING_STORAGE");
  assert.equal(placed.location.housingRecordId, "housing-real-new");
  assert.equal(citizen.housing[0].id, "housing-real-new");
  assert.equal(citizen.housing[0].housingRecordId, undefined);
});
