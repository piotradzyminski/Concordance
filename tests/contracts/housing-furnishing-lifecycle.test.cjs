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

function createLifecycleRuntime() {
  let citizen = {
    id: "citizen-life",
    recordType: "citizen",
    credits: 10,
    housing: [{
      id: "housing-life",
      title: "Test Unit",
      status: "ACTIVE",
      provider: "Habitat Ledger",
      defaultFurnishingGrade: "UTILITY",
      layoutPolicy: "RANDOM_POOL",
      fixedFixtures: [],
      rentalFurnishings: [],
      storageUnits: [{ id: "storage-life", width: 6, height: 4 }],
      household: { rooms: [{ id: "room-life" }], fixedFixtureAnchors: [] }
    }]
  };
  const items = new Map([
    ["cot-life", {
      instanceId: "cot-life",
      definitionId: "eqcat-household-rest-cot",
      ownerId: citizen.id,
      lifecycleState: "UNPACKAGED",
      location: { type: "HOUSING_ROOM", housingRecordId: "housing-life", roomId: "room-life", gridX: 1, gridY: 1, rotation: 0 },
      durability: { current: 100 },
      instanceData: { householdLifecycle: { ownershipType: "CITIZEN_FURNISHING", grade: "UTILITY", housingRecordId: "housing-life", lastWearAt: "2109-02-13T00:00:00.000Z" } },
      serviceHistory: []
    }],
    ["stored-chair", {
      instanceId: "stored-chair",
      definitionId: "eqcat-household-utility-chair",
      ownerId: citizen.id,
      lifecycleState: "UNPACKAGED",
      location: { type: "HOUSING_STORAGE", storageUnitId: "storage-life", gridX: 1, gridY: 1, rotation: 0 },
      durability: { current: 100 },
      instanceData: { householdLifecycle: { ownershipType: "CITIZEN_FURNISHING", grade: "ECONOMY", housingRecordId: "housing-life", lastWearAt: "2109-02-13T00:00:00.000Z" } },
      serviceHistory: []
    }],
    ["replacement-cot", {
      instanceId: "replacement-cot",
      definitionId: "eqcat-household-rest-cot",
      ownerId: citizen.id,
      lifecycleState: "UNPACKAGED",
      location: { type: "HOUSING_STORAGE", storageUnitId: "storage-life", gridX: 2, gridY: 1, rotation: 0 },
      durability: { current: 100 },
      instanceData: { householdLifecycle: { ownershipType: "CITIZEN_FURNISHING", grade: "STANDARD", housingRecordId: "housing-life", lastWearAt: "2109-02-27T00:00:00.000Z" } },
      serviceHistory: []
    }],
    ["storage-module", {
      instanceId: "storage-module",
      definitionId: "eqcat-household-underbed-storage-module",
      ownerId: citizen.id,
      lifecycleState: "INSTALLED",
      location: { type: "INSTALLED_IN_ITEM", parentItemInstanceId: "cot-life", moduleSlotId: "storage-1" },
      durability: { current: 100 },
      instanceData: {}
    }]
  ]);
  let revision = 1;
  const runtime = createBrowserRuntime({
    appData: {},
    wsApp: {
      getCampaignTimeIso: () => "2109-02-27T00:00:00.000Z",
      getHousingFurnishingWeeklyWearPercent: (grade) => ({ ECONOMY: 4, UTILITY: 3, STANDARD: 1.5, QUALITY: 1, PREMIUM: 0.5 }[grade] || 0),
      getCitizenById: (id) => id === citizen.id ? clone(citizen) : null,
      getCitizens: () => [clone(citizen)],
      updateCitizen: (id, patch) => {
        if (id !== citizen.id) return null;
        citizen = { ...citizen, ...clone(patch) };
        return clone(citizen);
      },
      addBillingHistoryEntry: () => ({ ok: true }),
      recordCommittedBillingTransaction: () => ({ ok: true }),
      validateHouseholdPlacement: () => ({ ok: true }),
      getItemInstanceStoreRevision: () => revision,
      getItemInstanceById: (id) => items.has(id) ? clone(items.get(id)) : null,
      getItemInstances: ({ includeDisposed = false } = {}) => [...items.values()].filter((item) => includeDisposed || item.lifecycleState !== "DISPOSED").map(clone),
      getCitizenItemInstances: (id, options = {}) => id === citizen.id ? [...items.values()].filter((item) => options.includeDisposed || item.lifecycleState !== "DISPOSED").map(clone) : [],
      getCitizenEquipmentItemInstances: (id) => id === citizen.id ? [...items.values()].filter((item) => ["HOUSING_ROOM", "HOUSING_STORAGE", "UNPLACED"].includes(item.location?.type)).map(clone) : [],
      commitItemInstanceTransaction: (input) => {
        input.operations.forEach((operation) => {
          const current = items.get(operation.instanceId);
          if (operation.type === "CREATE") items.set(operation.instanceId, clone(operation.instance));
          else if (operation.type === "PATCH") items.set(operation.instanceId, {
            ...current,
            ...clone(operation.patch || {}),
            durability: { ...(current?.durability || {}), ...(clone(operation.patch?.durability || {})) },
            instanceData: { ...(current?.instanceData || {}), ...(clone(operation.patch?.instanceData || {})) }
          });
          else if (operation.type === "MOVE") items.set(operation.instanceId, {
            ...current,
            ...clone(operation.patch || {}),
            location: clone(operation.toLocation),
            lifecycleState: operation.lifecycleState || current.lifecycleState,
            instanceData: { ...(current?.instanceData || {}), ...(clone(operation.patch?.instanceData || {})) }
          });
        });
        revision += 1;
        return { ok: true, operation: "COMMITTED", transaction: { transactionId: `tx-${revision}`, idempotencyKey: input.idempotencyKey } };
      },
      compensateItemInstanceTransaction: () => ({ ok: true })
    }
  });
  runtime.load("data/housing-furnishing-lifecycle.js");
  runtime.load("js/housing-furnishing-lifecycle.js");
  return {
    runtime,
    getItem: (id) => clone(items.get(id)),
    getCitizen: () => clone(citizen),
    patchItem: (instanceId, patch) => {
      const current = items.get(instanceId);
      items.set(instanceId, {
        ...current,
        ...clone(patch),
        durability: { ...(current?.durability || {}), ...(clone(patch?.durability || {})) },
        instanceData: { ...(current?.instanceData || {}), ...(clone(patch?.instanceData || {})) }
      });
    },
    moveItem: (instanceId, location, source = "TEST_MOVE") => {
      const current = items.get(instanceId);
      const previousLocation = clone(current.location);
      items.set(instanceId, { ...current, location: clone(location) });
      runtime.window.dispatchEvent(new runtime.window.CustomEvent("ws:item-instances-updated", {
        detail: {
          eventId: `test-move:${instanceId}`,
          source,
          citizenId: citizen.id,
          instanceIds: [instanceId],
          previousLocations: { [instanceId]: previousLocation },
          nextLocations: { [instanceId]: clone(location) }
        }
      }));
    }
  };
}

test("Furnishing lifecycle resolves ownership, grade, condition and module-derived capabilities", () => {
  const state = createLifecycleRuntime();
  const projection = state.runtime.window.WS_APP.getHousingFurnishingLifecycleProjection("cot-life");
  assert.equal(projection.ownershipType, "CITIZEN_FURNISHING");
  assert.equal(projection.grade, "UTILITY");
  assert.equal(projection.conditionState, "OPERATIONAL");
  assert.equal(projection.weeklyWearPercent, 3);
  assert.ok(projection.capabilities.includes("SLEEP"));
  assert.ok(projection.capabilities.includes("STORAGE"));
  assert.equal(projection.slots.find((slot) => slot.slotId === "storage-1").installedModule.instanceId, "storage-module");
});

test("Weekly Campaign Time wear affects placed furnishings but not stored furniture", () => {
  const state = createLifecycleRuntime();
  const result = state.runtime.window.WS_APP.processHousingFurnishingWear({ currentTimeIso: "2109-02-27T00:00:00.000Z", idempotencyKey: "wear-test" });
  assert.equal(result.ok, true);
  assert.equal(state.getItem("cot-life").durability.current, 94);
  assert.equal(state.getItem("stored-chair").durability.current, 100);
  assert.equal(state.getItem("cot-life").instanceData.householdLifecycle.lastWearAt, "2109-02-27T00:00:00.000Z");
});

test("Moving stored furniture into a room resets the wear anchor instead of charging storage time", () => {
  const state = createLifecycleRuntime();
  state.moveItem("stored-chair", { type: "HOUSING_ROOM", housingRecordId: "housing-life", roomId: "room-life", gridX: 4, gridY: 1, rotation: 0 });
  assert.equal(state.getItem("stored-chair").instanceData.householdLifecycle.lastWearAt, "2109-02-27T00:00:00.000Z");
  state.runtime.window.WS_APP.processHousingFurnishingWear({ currentTimeIso: "2109-03-06T00:00:00.000Z", idempotencyKey: "wear-after-placement" });
  assert.equal(state.getItem("stored-chair").durability.current, 96);
});

test("Functional modules, repair and same-class replacement keep canonical ItemInstance identity", () => {
  const state = createLifecycleRuntime();
  const app = state.runtime.window.WS_APP;

  const removed = app.removeHousingFurnishingModule({ citizenId: "citizen-life", housingRecordId: "housing-life", parentInstanceId: "cot-life", slotId: "storage-1", idempotencyKey: "remove-module" });
  assert.equal(removed.ok, true);
  assert.equal(state.getItem("storage-module").location.type, "HOUSING_STORAGE");

  const installed = app.installHousingFurnishingModule({ citizenId: "citizen-life", parentInstanceId: "cot-life", moduleInstanceId: "storage-module", slotId: "storage-1", idempotencyKey: "install-module" });
  assert.equal(installed.ok, true);
  assert.equal(state.getItem("storage-module").location.parentItemInstanceId, "cot-life");

  state.patchItem("cot-life", { durability: { current: 40 } });
  const repaired = app.repairHousingFurnishing({ citizenId: "citizen-life", instanceId: "cot-life", idempotencyKey: "repair-cot" });
  assert.equal(repaired.ok, true);
  assert.equal(state.getItem("cot-life").durability.current, 100);

  const replaced = app.replaceHousingFurnishing({ citizenId: "citizen-life", currentInstanceId: "cot-life", replacementInstanceId: "replacement-cot", idempotencyKey: "replace-cot" });
  assert.equal(replaced.ok, true);
  assert.equal(state.getItem("replacement-cot").location.type, "HOUSING_ROOM");
  assert.equal(state.getItem("cot-life").location.type, "HOUSING_STORAGE");
  assert.equal(state.getItem("storage-module").location.parentItemInstanceId, "cot-life");
});

test("Operator furnishings expose service requirements instead of free Citizen repair", () => {
  const state = createLifecycleRuntime();
  state.patchItem("cot-life", {
    durability: { current: 40 },
    instanceData: { householdLifecycle: { ownershipType: "RENTAL_FURNISHING", grade: "UTILITY", housingRecordId: "housing-life", lastWearAt: "2109-02-27T00:00:00.000Z" } }
  });
  const projection = state.runtime.window.WS_APP.getHousingFurnishingLifecycleProjection("cot-life");
  assert.equal(projection.repairable, false);
  assert.equal(projection.serviceRequired, true);
  const result = state.runtime.window.WS_APP.repairHousingFurnishing({ citizenId: "citizen-life", instanceId: "cot-life", idempotencyKey: "operator-repair" });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "HOUSEHOLD_OPERATOR_FURNISHING_REPAIR_REQUIRES_SERVICE");
});

test("Citizen furnishings can be incinerated for the fixed disposal credit", () => {
  const state = createLifecycleRuntime();
  const result = state.runtime.window.WS_APP.disposeHousingFurnishing({ citizenId: "citizen-life", instanceId: "stored-chair", idempotencyKey: "dispose-test" });
  assert.equal(result.ok, true);
  assert.equal(result.creditValue, 5);
  assert.equal(state.getItem("stored-chair").lifecycleState, "DISPOSED");
  assert.equal(state.getItem("stored-chair").location.type, "DESTROYED");
  assert.equal(state.getCitizen().credits, 15);
});

test("Housing UI exposes lifecycle, slots, repair, replacement and disposal actions", () => {
  const runtimeSource = read("js/housing-household-runtime.js");
  const domainSource = read("js/housing-furnishing-lifecycle.js");
  const moduleMap = read("js/modules.js");
  const bridgeSource = read("js/housing-rent-subscription-bridge.js");
  const index = read("index.html");

  assert.match(runtimeSource, /data-household-install-module/);
  assert.match(runtimeSource, /data-household-remove-module/);
  assert.match(runtimeSource, /data-household-repair-item/);
  assert.match(runtimeSource, /data-household-replace-item/);
  assert.match(runtimeSource, /data-household-dispose-item/);
  assert.match(domainSource, /ws:campaign-time-updated/);
  assert.match(domainSource, /INSTALLED_IN_ITEM/);
  assert.match(domainSource, /ws:item-instances-updated/);
  assert.match(bridgeSource, /detachedOperatorModuleInstanceIds/);
  assert.match(bridgeSource, /INSTALLED_IN_ITEM/);
  assert.doesNotMatch(read("data/housing-furnishing-lifecycle.js"), /CONSUMABLE_USE|SECURE_CONSUMABLE_STORAGE|MEDICAL_CONSUMABLE_USE/);
  assert.match(moduleMap, /js\/housing-household-runtime\.js\?v=3/);
  assert.match(index, /data\/housing-furnishing-lifecycle\.js\?v=1/);
  assert.match(index, /js\/housing-furnishing-lifecycle\.js\?v=1/);
});
