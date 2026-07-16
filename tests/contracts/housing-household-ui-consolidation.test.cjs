"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test("Housing navigation is consolidated into four primary sections", () => {
  const housing = read("js/housing.js");
  assert.match(housing, /HOUSING_PRIMARY_TABS = \["OVERVIEW", "HOUSEHOLD", "STORAGE", "DELIVERIES"\]/);
  assert.match(housing, /if \(\["UNIT", "HISTORY"\]\.includes\(token\)\) return "OVERVIEW"/);
  assert.match(housing, /if \(token === "COLLECTION"\) return "STORAGE"/);
  assert.doesNotMatch(housing, /tab\("UNIT"/);
  assert.doesNotMatch(housing, /tab\("COLLECTION"/);
  assert.doesNotMatch(housing, /tab\("HISTORY"/);
  assert.match(housing, /renderHousingOverviewTab\(citizen\).*renderHousingUnitTab\(citizen\).*renderHousingHistoryTab\(citizen\)/s);
  assert.match(housing, /renderHousingHouseholdTab\(citizen\).*renderHousingDisplaySurfacesPanel\(citizen\)/s);
  assert.match(housing, /renderHousingStorageTab\(citizen\).*renderHousingCollectionStoragePanel\(citizen\)/s);
});

test("Household workspace context cannot trigger the Storage navigation handler", () => {
  const housing = read("js/housing.js");
  const household = read("js/housing-household-runtime.js");
  assert.match(household, /data-household-workspace data-household-record-id=/);
  assert.match(household, /getAttribute\?\.\("data-household-record-id"\)/);
  assert.doesNotMatch(household, /data-household-workspace data-housing-record-id=/);
  assert.match(housing, /closest\?\.\("\[data-housing-open-storage-record\]"\)/);
  assert.doesNotMatch(housing, /closest\?\.\("\[data-housing-record-id\]"\)/);
});

test("Storage Item Index replaces the embedded organizer and can locate physical items", () => {
  const storage = read("js/housing-storage-runtime.js");
  const housing = read("js/housing.js");
  assert.match(storage, /function renderHousingItemIndexDrawer\(/);
  assert.match(storage, /function locateHousingItemIndexEntry\(/);
  assert.match(storage, /data-housing-item-index-toggle/);
  assert.match(storage, /data-housing-item-index-locate/);
  assert.match(storage, /HOUSEHOLD.*STORAGE.*CONTAINER.*TRANSFER/s);
  assert.doesNotMatch(storage, /STORAGE ORGANIZATION/);
  assert.match(housing, /setHousingItemIndexOpen\(citizenId, true\)/);
  assert.match(housing, /locateHousingItemIndexEntry/);
});

test("Housing uses the shared project scrollbar and compact action rows", () => {
  const uiControlsCss = read("css/ui-controls.css");
  const housingCss = read("css/housing.css");
  const household = read("js/housing-household-runtime.js");
  assert.match(uiControlsCss, /\*::-webkit-scrollbar/);
  assert.match(uiControlsCss, /input\[type="checkbox"\]\.ui-select-control/);
  assert.match(housingCss, /\.housing-item-index-drawer/);
  assert.match(housingCss, /\.housing-household-action-row/);
  assert.match(household, /data-system-scroll/);
  assert.doesNotMatch(household, />INSTALL \$\{escapeHtml\(getItemName\(candidate\)\)\}<\/button>/);
  assert.doesNotMatch(household, />REPLACE WITH \$\{escapeHtml\(getItemName\(candidate\)\)\}<\/button>/);
});


test("Housing Item Index locator selects the correct unit and Household workspace", () => {
  const citizen = { id: "citizen-index" };
  const records = [{ id: "housing-a", title: "Unit A", storageUnits: [{ id: "storage-a", label: "Main", width: 4, height: 4, slotCapacity: 16 }] }];
  const items = [
    { id: "stored-1", name: "Stored Item", category: "MISC", isStored: true, storageUnitId: "storage-a", location: { type: "HOUSING_STORAGE", storageUnitId: "storage-a" }, housingPlacement: { column: 1, row: 1, rotation: 0 } },
    { id: "placed-1", name: "Placed Item", category: "MISC", location: { type: "HOUSING_ROOM", housingRecordId: "housing-a", roomId: "main" } }
  ];
  const runtime = createBrowserRuntime({
    wsApp: {
      getCitizenById: (id) => id === citizen.id ? citizen : null,
      getCitizenEquipmentItemInstanceViews: () => items,
      normalizeEquipmentItem: (item) => item,
      getEquipmentState: () => ({ items, itemById: Object.fromEntries(items.map((item) => [item.id, item])), containers: { active: [] } })
    }
  });
  runtime.load("js/housing-storage-runtime.js");
  const storage = runtime.window.WS_APP.createHousingStorageRuntime({
    HOUSING_STORAGE_WIDTH: 4,
    HOUSING_STORAGE_LOCATION: "HOUSING_STORAGE",
    DEFAULT_STORAGE_UNIT_ID: "storage-a",
    HOUSING_STORAGE_KINDS: ["ALL", "MISC"],
    HOUSING_STORAGE_STATUSES: ["ALL", "AVAILABLE", "STORED", "OVERFLOW"],
    HOUSING_STORAGE_SORTS: ["CATEGORY", "NAME"],
    escapeHtml: String,
    clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || min)),
    formatCredits: String,
    formatHousingShipmentState: String,
    formatIsoLabel: String,
    getCitizenHousingRecords: () => records,
    getCitizenMarketOrders: () => [],
    getHousingActiveRecord: () => records[0],
    getHousingActiveRecordId: () => records[0].id,
    getHousingFeedback: () => null,
    getHousingRecordShipmentStats: () => ({ shipments: [], active: [], held: [], delivered: [], overflow: [] }),
    getHousingRecordSubscription: () => null,
    getHousingShipmentState: () => "IN_TRANSIT",
    getHousingShipmentUnitContext: () => ({}),
    parseCredits: Number,
    renderHousingModule: () => {},
    renderHousingRecord: () => "",
    renderHousingStorageShipmentPanel: () => "",
    setHousingFeedback: () => {}
  });
  const calls = [];
  const adapters = {
    setHousingActiveRecordId: (...args) => calls.push(["record", ...args]),
    setHousingActiveTab: (...args) => calls.push(["tab", ...args]),
    setWorkspaceState: (...args) => calls.push(["workspace", ...args])
  };
  const stored = storage.locateHousingItemIndexEntry(citizen.id, "stored-1", adapters);
  assert.equal(stored.ok, true);
  assert.equal(stored.section, "STORAGE");
  assert.equal(storage.getHousingSelectedStorageUnitId(citizen.id, records[0].storageUnits), "storage-a");
  assert.ok(calls.some((entry) => entry[0] === "tab" && entry[2] === "STORAGE"));

  calls.length = 0;
  const placed = storage.locateHousingItemIndexEntry(citizen.id, "placed-1", adapters);
  assert.equal(placed.ok, true);
  assert.equal(placed.section, "HOUSEHOLD");
  assert.ok(calls.some((entry) => entry[0] === "workspace" && entry[2].selectedInstanceId === "placed-1"));
  assert.ok(calls.some((entry) => entry[0] === "tab" && entry[2] === "HOUSEHOLD"));
});
