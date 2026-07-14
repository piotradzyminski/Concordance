"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createRuntime() {
  const runtime = createBrowserRuntime();
  runtime.loadMany([
    "data/body-cyberware-catalog.js",
    "data/equipment-catalog.js",
    "js/equipment-catalog-store.js"
  ]);
  return runtime;
}

test("Cyberware product definitions are neutral while placement slots remain lateral", () => {
  const runtime = createRuntime();
  const definitions = runtime.window.APP_DATA.bodyCyberware || [];
  assert.ok(definitions.length > 0);
  definitions.forEach((definition) => {
    assert.doesNotMatch(String(definition.id || ""), /(?:^|[-_])(left|right)(?:$|[-_])/i);
    assert.doesNotMatch(String(definition.name || ""), /\b(left|right)\b/i);
  });

  const aliases = runtime.window.APP_DATA.bodyCyberwareDefinitionAliases || {};
  assert.equal(aliases["factory-labor-arm-left-f2"], "factory-labor-arm-f2");
  assert.equal(aliases["factory-labor-arm-right-f2"], "factory-labor-arm-f2");

  const neutralArm = definitions.find((definition) => definition.id === "factory-labor-arm-f2");
  assert.ok(neutralArm);
  assert.ok(neutralArm.compatibleSlots.includes("leftArmCore"));
  assert.ok(neutralArm.compatibleSlots.includes("rightArmCore"));
});

test("Equipment catalog resolves legacy side-specific IDs to one neutral definition", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const left = app.getEquipmentCatalogItemById("eqcat-thigh-holster-left");
  const right = app.getEquipmentCatalogItemById("eqcat-thigh-holster-right");
  assert.ok(left);
  assert.ok(right);
  assert.equal(left.id, "eqcat-thigh-holster");
  assert.equal(right.id, "eqcat-thigh-holster");
  assert.equal(left.name, right.name);
});

test("ItemInstance view keeps canonical neutral identity over legacy lateral snapshots", () => {
  const canonicalDefinition = {
    id: "coremed-basicsight-l2",
    catalogId: "coremed-basicsight-l2",
    name: "CoreMed BasicSight L2 Eye",
    summary: "Civilian-grade ocular replacement with basic low-light correction.",
    primarySlot: "leftEye",
    slots: ["leftEye"],
    compatibleSlots: ["leftEye", "rightEye"],
    compatibilityGroup: "COREMED_BASICSIGHT_L2"
  };
  const runtime = createBrowserRuntime({
    appData: {
      itemInstances: [{
        instanceId: "legacy-left-eye-instance",
        definitionId: "coremed-basicsight-l2",
        ownerId: "citizen-a",
        lifecycleState: "UNPACKAGED",
        location: { type: "HOUSING_STORAGE", storageUnitId: "storage-a", gridX: 1, gridY: 1, rotation: 0 },
        durability: { current: 100 },
        instanceData: {
          name: "CoreMed BasicSight L2 Left Eye",
          summary: "Civilian-grade left ocular replacement.",
          primarySlot: "leftEye",
          slots: ["leftEye"],
          compatibleSlots: ["leftEye"],
          compatibilityGroup: "COREMED_BASICSIGHT_L2_LEFT"
        }
      }]
    },
    wsApp: {
      getEquipmentCatalogItemById(id) {
        return id === canonicalDefinition.id ? canonicalDefinition : null;
      },
      getEquipmentCatalogRevision() { return 1; }
    }
  });
  runtime.load("js/item-instance-store.js");

  const view = runtime.window.WS_APP.getItemInstanceView("legacy-left-eye-instance");
  assert.equal(view.definitionId, "coremed-basicsight-l2");
  assert.equal(view.name, "CoreMed BasicSight L2 Eye");
  assert.equal(view.summary, "Civilian-grade ocular replacement with basic low-light correction.");
  assert.deepEqual(Array.from(view.compatibleSlots), ["leftEye", "rightEye"]);
  assert.equal(view.compatibilityGroup, "COREMED_BASICSIGHT_L2");
});

test("Cyberware planner target projection offers both lateral slots for one neutral product", () => {
  const runtime = createBrowserRuntime();
  runtime.loadMany([
    "js/cyberware-store.js",
    "js/cyberware-bodymap-panel.js",
    "js/cyberware-rules.js",
    "js/cyberware-actions.js"
  ]);
  const api = runtime.window.WS_APP.cyberwareRuntime;
  const candidate = api.normalizeCyberwareEntry({
    id: "coremed-basicsight-l2",
    name: "CoreMed BasicSight L2 Eye",
    scale: "SMALL",
    primarySlot: "leftEye",
    slots: ["leftEye"],
    compatibleSlots: ["leftEye", "rightEye"],
    neuroLoad: 1,
    interfaceLoad: 1,
    requiredBuses: ["STANDARD_BODY_BUS"]
  }, 0);

  const targets = api.getCyberwareDropTargets([], candidate, {
    relevantOnly: true,
    strictPlacement: true,
    includePreview: false,
    installedList: []
  });
  assert.deepEqual(Array.from(targets, (target) => target.key), ["leftEye", "rightEye"]);
  assert.deepEqual(Array.from(targets, (target) => Array.from(target.candidateSlots)), [["leftEye"], ["rightEye"]]);
  assert.ok(targets.every((target) => target.usedByImplant === true));
});

test("Equipment Inspector renders neutral product identity from the canonical ItemInstance view", () => {
  const canonicalDefinition = {
    id: "coremed-basicsight-l2",
    catalogId: "coremed-basicsight-l2",
    name: "CoreMed BasicSight L2 Eye",
    category: "CYBERWARE",
    subtype: "OCULAR",
    summary: "Civilian-grade ocular replacement with basic low-light correction.",
    primarySlot: "leftEye",
    slots: ["leftEye"],
    compatibleSlots: ["leftEye", "rightEye"],
    compatibilityGroup: "COREMED_BASICSIGHT_L2",
    width: 1,
    height: 1
  };
  const runtime = createBrowserRuntime({
    appData: {
      itemInstances: [{
        instanceId: "legacy-left-eye-inspector-instance",
        definitionId: "coremed-basicsight-l2",
        ownerId: "citizen-a",
        lifecycleState: "UNPACKAGED",
        location: { type: "HOUSING_STORAGE", storageUnitId: "storage-a", gridX: 1, gridY: 1, rotation: 0 },
        durability: { current: 100 },
        instanceData: {
          name: "CoreMed BasicSight L2 Left Eye",
          notes: "Civilian-grade left ocular replacement.",
          primarySlot: "leftEye",
          slots: ["leftEye"],
          compatibleSlots: ["leftEye"],
          compatibilityGroup: "COREMED_BASICSIGHT_L2_LEFT"
        }
      }]
    },
    wsApp: {
      getEquipmentCatalogItemById(id) {
        return id === canonicalDefinition.id ? canonicalDefinition : null;
      },
      getEquipmentCatalogRevision() { return 1; },
      escapeEquipmentHtml(value = "") { return String(value ?? ""); }
    }
  });
  runtime.loadMany(["js/item-instance-store.js", "js/equipment-items-panel.js"]);

  const view = runtime.window.WS_APP.getItemInstanceView("legacy-left-eye-inspector-instance");
  const selectedItem = {
    ...view,
    isStored: true,
    storageUnitId: "storage-a",
    isEquipped: false,
    isInGrid: false,
    isOrphan: false
  };
  const markup = runtime.window.WS_APP.renderEquipmentItemDetail({
    citizenId: "citizen-a",
    selectedItem,
    items: [selectedItem],
    itemById: { [selectedItem.id]: selectedItem },
    bodyMountDefinitions: [],
    selections: {}
  });

  assert.match(markup, /CoreMed BasicSight L2 Eye/);
  assert.match(markup, /Civilian-grade ocular replacement with basic low-light correction\./);
  assert.doesNotMatch(markup, /CoreMed BasicSight L2 Left Eye/);
  assert.doesNotMatch(markup, /Civilian-grade left ocular replacement\./);
});

test("Installed neutral product projects the current right-side BODY placement", () => {
  const canonicalDefinition = {
    id: "coremed-basicsight-l2",
    name: "CoreMed BasicSight L2 Eye",
    primarySlot: "leftEye",
    slots: ["leftEye"],
    compatibleSlots: ["leftEye", "rightEye"]
  };
  const runtime = createBrowserRuntime({
    appData: {
      itemInstances: [{
        instanceId: "installed-right-eye-instance",
        definitionId: canonicalDefinition.id,
        ownerId: "citizen-a",
        lifecycleState: "INSTALLED",
        location: { type: "BODY", characterId: "citizen-a", bodySlots: ["rightEye"] },
        durability: { current: 96 },
        instanceData: { name: "CoreMed BasicSight L2 Right Eye", primarySlot: "rightEye", slots: ["rightEye"] },
        cyberwareState: { installedCharacterId: "citizen-a", installedBodySlots: ["rightEye"] }
      }]
    },
    wsApp: {
      getEquipmentCatalogItemById(id) { return id === canonicalDefinition.id ? canonicalDefinition : null; },
      getEquipmentCatalogRevision() { return 1; }
    }
  });
  runtime.load("js/item-instance-store.js");

  const view = runtime.window.WS_APP.getItemInstanceView("installed-right-eye-instance");
  assert.equal(view.name, "CoreMed BasicSight L2 Eye");
  assert.deepEqual(Array.from(view.compatibleSlots), ["leftEye", "rightEye"]);
  assert.deepEqual(Array.from(view.bodySlots), ["rightEye"]);
  assert.deepEqual(Array.from(view.slots), ["rightEye"]);
  assert.equal(view.slot, "rightEye");
  assert.equal(view.primarySlot, "rightEye");
});
