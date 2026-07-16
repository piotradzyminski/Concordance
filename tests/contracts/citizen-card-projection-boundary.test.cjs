"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

function extractBlock(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `Missing block start: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, `Missing block end: ${endMarker}`);
  return source.slice(start, end);
}

test("Citizen Card bundle uses dedicated projections instead of full Cyberware UI runtime", () => {
  const modules = read("js/modules.js");
  const projectionBundle = extractBlock(
    modules,
    "const CITIZEN_CARD_PROJECTION_SCRIPTS = [",
    "const CYBERWARE_UI_RUNTIME_SCRIPTS = ["
  );
  const citizenCard = extractBlock(modules, '  "citizen-card": {', '  "citizen-cards": {');
  const citizenCards = extractBlock(modules, '  "citizen-cards": {', '  "citizen-files": {');
  const citizenFiles = extractBlock(modules, '  "citizen-files": {', '  "citizen-database": {');
  const citizenDatabase = extractBlock(modules, '  "citizen-database": {', '  "admin-control": {');

  for (const block of [citizenCard, citizenCards, citizenFiles, citizenDatabase]) {
    assert.match(block, /CITIZEN_CARD_RENDERER_SCRIPTS/);
    assert.doesNotMatch(block, /CYBERWARE_UI_RUNTIME_SCRIPTS/);
    assert.match(block, /js\/citizen-records\.js\?v=39/);
  }

  assert.match(projectionBundle, /citizen-card-equipment-projection\.js\?v=1/);
  assert.match(projectionBundle, /citizen-card-subscription-projection\.js\?v=1/);
  assert.match(projectionBundle, /citizen-card-cyberware-projection\.js\?v=1/);
  assert.doesNotMatch(projectionBundle, /cyberware-diagnostics|cyberware-maintenance|cyberware-actions|cyberware\.js/);
});

test("Citizen Card projections do not overwrite full domain globals", () => {
  const sentinel = () => ({ source: "FULL_RUNTIME" });
  const runtime = createBrowserRuntime({
    wsApp: {
      getCyberwareRuntimeState: sentinel,
      renderCitizenEquipmentSummary: sentinel,
      renderCitizenSubscriptionSummaryTiles: sentinel
    }
  });

  runtime.loadMany([
    "js/citizen-card-equipment-projection.js",
    "js/citizen-card-subscription-projection.js",
    "js/citizen-card-cyberware-projection.js"
  ]);

  assert.equal(runtime.window.WS_APP.getCyberwareRuntimeState, sentinel);
  assert.equal(runtime.window.WS_APP.renderCitizenEquipmentSummary, sentinel);
  assert.equal(runtime.window.WS_APP.renderCitizenSubscriptionSummaryTiles, sentinel);
  assert.equal(typeof runtime.window.WS_APP.citizenCardProjection.getCyberwareRuntimeState, "function");
  assert.equal(typeof runtime.window.WS_APP.citizenCardProjection.renderEquipmentSummary, "function");
  assert.equal(typeof runtime.window.WS_APP.citizenCardProjection.renderSubscriptionSummaryTiles, "function");
});

test("Citizen Card cold-entry projections expose real Equipment, Subscriptions and Cyberware data", () => {
  const runtime = createBrowserRuntime({
    wsApp: {
      formatCredits: (value) => `${Number(value)} ₡`,
      getEquipmentInstanceSummary: () => ({ itemCount: 4, equippedCount: 2, gridStoredCount: 1 }),
      getCitizenEquipmentItemInstanceViews: () => [
        { instanceId: "coat", locationData: { type: "EQUIPPED" }, equippedLocation: { kind: "LAYER", anchor: "TORSO", layer: "OUTER" }, equipProfile: {} },
        { instanceId: "bag", locationData: { type: "EQUIPPED" }, equippedLocation: { kind: "BODY_MOUNT", mountIds: ["BACK"] }, equipProfile: { countsAsBulkyCarrier: true } }
      ],
      getInstalledCyberwareInstanceViews: () => [
        { instanceId: "nc", name: "Yata Mirrorcore", subtype: "NEUROCHIP", isCoreProcessor: true, slots: ["neural"], neuroCapacity: 26, controlChannels: 6, firmwareSlots: 4, maxCyberwareGrade: "CORPORATE", maxScale: "MEDIUM", latencyClass: "LOW", supportedBuses: ["SECURITY_BODY_BUS"] },
        { instanceId: "if", name: "K-I3 Yata Socket", subtype: "INTERFACE", isCoreInterface: true, slots: ["interface"], interfaceCapacity: 14, interfaceLanes: 6, supportedBuses: ["SECURITY_BODY_BUS"] },
        { instanceId: "eye", name: "BasicSight v2", subtype: "IMPLANT", slots: ["leftEye"], neuroLoad: 1, interfaceLoad: 1, slotCost: 1, status: "INSTALLED", scale: "SMALL" }
      ],
      getCitizenEntitledSubscriptions: () => []
    }
  });

  runtime.loadMany([
    "js/citizen-card-equipment-projection.js",
    "js/citizen-card-subscription-projection.js",
    "js/citizen-card-cyberware-projection.js"
  ]);

  const projection = runtime.window.WS_APP.citizenCardProjection;
  const equipment = projection.renderEquipmentSummary({ id: "citizen-a" });
  const subscriptions = projection.renderSubscriptionSummaryTiles([
    { subscriptionContractId: "sub-a", displaySnapshot: { title: "Mass Compression Service", tierLabel: "T2 Licensed" }, amount: 800, billingCycle: "WEEKLY" }
  ]);
  const cyberware = projection.getCyberwareRuntimeState({ id: "citizen-a", subscriptions: [] });

  assert.match(equipment, /4 items/);
  assert.match(equipment, /2 equipped/);
  assert.match(equipment, /2 occupied layers\/mounts/);
  assert.doesNotMatch(equipment, /unavailable/i);

  assert.match(subscriptions, /Mass Compression Service/);
  assert.match(subscriptions, /T2 Licensed/);
  assert.match(subscriptions, /800 ₡/);
  assert.doesNotMatch(subscriptions, /No active subscriptions/);

  assert.equal(cyberware.counts.total, 3);
  assert.equal(cyberware.counts.occupiedSlots, 1);
  assert.equal(cyberware.neuralCore.neurochipLabel, "Yata Mirrorcore");
  assert.equal(cyberware.neuralCore.interfaceLabel, "K-I3 Yata Socket");
  assert.equal(cyberware.neuralCore.neuroLoad, 1);
});

test("Citizen Card renderer prefers the dedicated projection namespace", () => {
  const citizenRecords = read("js/citizen-card-renderers.js");
  assert.match(citizenRecords, /function getCitizenCardProjectionApi\(\)/);
  assert.match(citizenRecords, /projection\.getCyberwareRuntimeState/);
  assert.match(citizenRecords, /projection\.renderEquipmentSummary/);
  assert.match(citizenRecords, /renderSubscriptionSummaryTiles/);
});
