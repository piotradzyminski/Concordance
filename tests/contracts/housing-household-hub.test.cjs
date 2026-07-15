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

function createHubRuntime() {
  const citizen = {
    id: "citizen-hub",
    housing: [{ id: "housing-hub", status: "ACTIVE", isPrimary: true, rentStatus: "PAID", visibleAddress: "HUB ADDRESS", storageUnits: [{ id: "hub-storage", width: 4, height: 4 }] }]
  };
  const definitions = new Map([
    ["display-shelf", { id: "display-shelf", name: "Display Shelf", tags: ["HOUSEHOLD", "DISPLAY"], householdDisplayProfile: { slotCount: 2 } }],
    ["memento", { id: "memento", name: "Memento", tags: ["COLLECTIBLE", "MEMENTO", "DISPLAY_ITEM"], footprint: "1x1" }]
  ]);
  const items = new Map([
    ["shelf-1", { instanceId: "shelf-1", definitionId: "display-shelf", ownerId: citizen.id, lifecycleState: "UNPACKAGED", location: { type: "HOUSING_ROOM", housingRecordId: "housing-hub", roomId: "main", gridX: 1, gridY: 1 }, instanceData: {} }],
    ["memento-1", { instanceId: "memento-1", definitionId: "memento", ownerId: citizen.id, lifecycleState: "UNPACKAGED", location: { type: "HOUSING_STORAGE", storageUnitId: "hub-storage", gridX: 1, gridY: 1 }, instanceData: { householdHub: { collection: true, category: "MEMENTO", note: "Campaign note" } } }]
  ]);
  const runtime = createBrowserRuntime({
    appData: {},
    wsApp: {
      CAMPAIGN_TIME_ISO: "2109-02-13T12:00:00.000Z",
      getCampaignTimeIso: () => "2109-02-13T12:00:00.000Z",
      getCitizenById: (citizenId) => citizenId === citizen.id ? clone(citizen) : null,
      getCitizenHousingRecords: (source) => clone(source?.housing || []),
      getItemInstances: () => [...items.values()].map(clone),
      getItemInstanceById: (instanceId) => items.has(instanceId) ? clone(items.get(instanceId)) : null,
      getEquipmentCatalogItemById: (definitionId) => clone(definitions.get(definitionId) || null),
      getTerminalEntries: () => [{ id: "terminal-1", title: "Priority signal", body: "Unread terminal signal", citizenId: citizen.id, folder: "INBOX", read: false, important: true, receivedAt: "2109-02-13T11:00:00.000Z" }],
      getItemInstanceTransactions: () => [],
      updateItemInstance: (instanceId, patch) => {
        if (!items.has(instanceId)) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND" };
        items.set(instanceId, clone(patch));
        return { ok: true, instance: clone(items.get(instanceId)) };
      },
      commitItemInstanceTransaction: (input) => {
        input.operations.forEach((operation) => {
          const current = items.get(operation.instanceId);
          items.set(operation.instanceId, {
            ...current,
            ...clone(operation.patch || {}),
            location: clone(operation.toLocation),
            lifecycleState: operation.lifecycleState || current.lifecycleState,
            instanceData: { ...(current.instanceData || {}), ...(clone(operation.patch?.instanceData || {})) }
          });
        });
        return { ok: true, transaction: { transactionId: "hub-tx", sourceDomain: input.sourceDomain, metadata: clone(input.metadata || {}) } };
      }
    }
  });
  runtime.load("data/housing-household-hub.js");
  runtime.load("js/housing-household-hub.js");
  return { runtime, getItem: (instanceId) => clone(items.get(instanceId)) };
}

test("Household Hub exposes one global weather projection and read-only world feed", () => {
  const state = createHubRuntime();
  const app = state.runtime.window.WS_APP;
  const first = app.getGlobalHousingWeather("2109-02-13T12:00:00.000Z");
  const second = app.getGlobalHousingWeather("2109-02-13T12:00:00.000Z");
  assert.equal(first.current.code, second.current.code);
  assert.equal(first.current.global, true);
  assert.equal(first.forecast.length, 3);
  const overview = app.getHousingHouseholdHubOverview("citizen-hub", "housing-hub");
  assert.equal(overview.weather.current.code, first.current.code);
  assert.ok(overview.worldFeed.some((entry) => entry.source === "TERMINAL"));
  assert.equal(overview.collectionCount, 1);
});

test("Important-item metadata remains on the canonical ItemInstance", () => {
  const state = createHubRuntime();
  const result = state.runtime.window.WS_APP.setHousingItemImportant({ citizenId: "citizen-hub", instanceId: "memento-1", important: true });
  assert.equal(result.ok, true);
  assert.equal(state.getItem("memento-1").instanceData.householdHub.important, true);
  const collection = state.runtime.window.WS_APP.getHousingCollectionItems("citizen-hub", "housing-hub");
  assert.equal(collection[0].important, true);
  assert.equal(collection[0].category, "MEMENTO");
});

test("Display slots move the same collectible ItemInstance into and out of display furniture", () => {
  const state = createHubRuntime();
  const app = state.runtime.window.WS_APP;
  const hosts = app.getHousingDisplayHosts("citizen-hub", "housing-hub");
  assert.equal(hosts.length, 1);
  assert.equal(hosts[0].slots.length, 2);
  const displayed = app.displayHousingCollectionItem({ citizenId: "citizen-hub", housingRecordId: "housing-hub", instanceId: "memento-1", hostInstanceId: "shelf-1", slotId: "display-item-1", idempotencyKey: "display-once" });
  assert.equal(displayed.ok, true);
  assert.equal(state.getItem("memento-1").location.type, "INSTALLED_IN_ITEM");
  assert.equal(state.getItem("memento-1").location.mountRole, "DISPLAY");
  assert.equal(state.getItem("memento-1").instanceId, "memento-1");
  const removed = app.removeHousingCollectionDisplay({ citizenId: "citizen-hub", housingRecordId: "housing-hub", instanceId: "memento-1", idempotencyKey: "display-remove" });
  assert.equal(removed.ok, true);
  assert.equal(state.getItem("memento-1").location.type, "HOUSING_STORAGE");
  assert.equal(state.getItem("memento-1").instanceId, "memento-1");
});

test("Household Hub is lazy Housing UI and does not create a second persistence store", () => {
  const modules = read("js/modules.js");
  const index = read("index.html");
  const housing = read("js/housing.js");
  const domain = read("js/housing-household-hub.js");
  const catalog = read("data/equipment-catalog.js");
  assert.match(modules, /data\/housing-household-hub\.js\?v=1/);
  assert.match(modules, /js\/housing-household-hub\.js\?v=1/);
  assert.match(modules, /js\/housing\.js\?v=53/);
  assert.doesNotMatch(index, /housing-household-hub\.js/);
  assert.match(housing, /data-housing-tab="OVERVIEW"|tab\("OVERVIEW"/);
  assert.match(housing, /data-housing-tab="COLLECTION"|tab\("COLLECTION"/);
  assert.match(housing, /GLOBAL WEATHER FEED/);
  assert.match(domain, /INSTALLED_IN_ITEM/);
  assert.match(domain, /mountRole: "DISPLAY"/);
  assert.doesNotMatch(domain, /localStorage|sessionStorage/);
  assert.match(catalog, /eqcat-household-secure-archive-cabinet/);
  assert.match(catalog, /Decorative only; it grants no mechanical bonus/);
});
