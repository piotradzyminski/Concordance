"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");
const { readProjectFile } = require("../helpers/source-contract.cjs");

function createUpgradeRuntime() {
  const host = {
    instanceId: "host-arm-1",
    definitionId: "host-arm-definition",
    ownerId: "citizen-a",
    lifecycleState: "INSTALLED",
    location: { type: "BODY", characterId: "citizen-a", bodySlots: ["leftArm"] },
    cyberwareState: { installedModules: [], installedFirmware: [], permanentModifications: [], calibration: { profile: "FACTORY", quality: 100 } },
    serviceHistory: [],
    scale: "LARGE",
    catalogDomain: "ARM",
    neuroLoad: 4,
    stability: 60,
    security: 40
  };
  const module = {
    instanceId: "module-motor-1",
    definitionId: "cwmod-neuromotor-response-controller",
    ownerId: "citizen-a",
    lifecycleState: "UNPACKAGED",
    location: { type: "HOUSING_STORAGE", storageUnitId: "storage-a", gridX: 0, gridY: 0 },
    durability: { current: 100 }
  };
  let instances = [host, module];
  let committed = null;
  const runtime = createBrowserRuntime({
    wsApp: {
      getCyberwareCatalogItem(definitionId) {
        if (definitionId === "host-arm-definition") return { id: definitionId, scale: "LARGE", catalogDomain: "ARM", protocolSupport: ["NEUROMOTOR"] };
        return null;
      },
      getItemInstanceById(instanceId) { return instances.find((entry) => entry.instanceId === instanceId) || null; },
      getItemInstanceView(instanceId) { return instances.find((entry) => entry.instanceId === instanceId) || null; },
      getItemInstances() { return instances; },
      getCitizenItemInstances(citizenId) { return instances.filter((entry) => entry.ownerId === citizenId); },
      getCitizenById(citizenId) { return citizenId === "citizen-a" ? { id: citizenId } : null; },
      getCampaignTimeIso() { return "2109-02-13T12:00:00.000Z"; },
      getCyberwarePlannerReturnDestinationOptions() { return [{ storageUnitId: "storage-a", placement: { column: 1, row: 1, rotation: 0 } }]; },
      commitItemInstanceTransaction(input) {
        committed = input;
        return { ok: true, transaction: { transactionId: "tx-upgrade-1" }, itemCommit: { ok: true } };
      }
    }
  });
  runtime.load("data/cyberware-upgrade-catalog.js");
  runtime.load("js/cyberware-upgrade-system.js");
  return {
    runtime,
    host,
    module,
    setInstances(next) { instances = next; },
    getCommitted() { return committed; }
  };
}

test("Scale policy limits potential modularity while host definition owns typed slots", () => {
  const { runtime } = createUpgradeRuntime();
  const api = runtime.window.WS_APP.CyberwareUpgradeSystem;
  assert.deepEqual(api.getScalePolicy("SMALL"), { upgradeCapacity: 0, moduleSlotCount: 0, firmwareCapacity: 0, permanentModificationCapacity: 0 });
  assert.equal(api.getScalePolicy("LARGE").moduleSlotCount, 2);

  const profile = api.getCyberwareUpgradeProfile("host-arm-1");
  assert.equal(profile.scale, "LARGE");
  assert.equal(profile.upgradeCapacity, 2);
  assert.equal(Array.from(profile.moduleSlots, (slot) => slot.slotType).join(","), "MOTOR,UTILITY");
});

test("Physical module install is quoted and committed as one atomic ItemInstance transaction", () => {
  const { runtime, getCommitted } = createUpgradeRuntime();
  const api = runtime.window.WS_APP.CyberwareUpgradeSystem;
  const quote = api.buildCyberwareUpgradeQuote({
    citizenId: "citizen-a",
    operationType: "INSTALL_MODULE",
    hostInstanceId: "host-arm-1",
    moduleInstanceId: "module-motor-1",
    slotId: "motor-1"
  });
  assert.equal(quote.ok, true, quote.blockers?.join(", "));
  assert.equal(quote.profile.freeUpgradeCapacity, 2);

  const result = api.commitCyberwareUpgradeServiceResult({
    citizenId: "citizen-a",
    operationType: "INSTALL_MODULE",
    hostInstanceId: "host-arm-1",
    moduleInstanceId: "module-motor-1",
    slotId: "motor-1",
    idempotencyKey: "upgrade-install-1"
  }, { serviceOrderId: "service-order-1" });
  assert.equal(result.ok, true);
  const committed = getCommitted();
  assert.equal(committed.operations.length, 2);
  assert.equal(Array.from(committed.operations, (entry) => entry.type).join(","), "MOVE,PATCH");
  assert.equal(committed.operations[0].toLocation.type, "INSTALLED_IN_ITEM");
  assert.equal(committed.operations[0].toLocation.parentItemInstanceId, "host-arm-1");
  assert.equal(committed.operations[0].toLocation.moduleSlotId, "motor-1");
  assert.equal(committed.operations[1].patch.cyberwareState.installedModules[0].instanceId, "module-motor-1");
});

test("Installed module and permanent modification effects feed the runtime projection without a second store", () => {
  const setup = createUpgradeRuntime();
  const api = setup.runtime.window.WS_APP.CyberwareUpgradeSystem;
  const installedModule = {
    ...setup.module,
    lifecycleState: "INSTALLED",
    location: { type: "INSTALLED_IN_ITEM", parentItemInstanceId: "host-arm-1", moduleSlotId: "motor-1" }
  };
  const host = {
    ...setup.host,
    cyberwareState: {
      ...setup.host.cyberwareState,
      installedModules: [{ instanceId: "module-motor-1", moduleSlotId: "motor-1" }],
      permanentModifications: [{ modificationId: "cwmod-permanent-bus-hardening", capacityCost: 1 }]
    }
  };
  setup.setInstances([host, installedModule]);

  const resolved = api.applyCyberwareUpgradeEffects(host);
  assert.equal(resolved.neuroLoad, 5);
  assert.equal(resolved.stability, 62);
  assert.equal(resolved.security, 48);
  assert.equal(resolved.neurolatencyRank, 2);
  assert.equal(resolved.upgradeProfile.installedModules.length, 1);
});

test("Cyberware upgrade bundle, inspector UI and World Bridge service operations are wired canonically", () => {
  const modules = readProjectFile("js/modules.js");
  const workspace = readProjectFile("js/cyberware-workspace.js");
  const controller = readProjectFile("js/cyberware-module.js");
  const bridge = readProjectFile("js/cyberware-world-bridge.js");
  const services = readProjectFile("data/service-definitions.js");

  assert.match(modules, /data\/cyberware-upgrade-catalog\.js\?v=1/);
  assert.match(modules, /js\/cyberware-upgrade-system\.js\?v=1/);
  assert.ok(modules.indexOf("js/cyberware-upgrade-system.js?v=1") < modules.indexOf("js/cyberware-runtime.js?v=3"));
  assert.match(workspace, /renderCyberwareUpgradePanel/);
  assert.match(controller, /INSTALL_MODULE/);
  assert.match(controller, /REPLACE_MODULE/);
  assert.match(controller, /APPLY_PERMANENT_MOD/);
  assert.match(bridge, /svc-cyberware-module-install-standard/);
  assert.match(bridge, /commitCyberwareUpgradeServiceResult/);
  assert.match(services, /CYBERWARE_MODULE_REPLACE/);
  assert.doesNotMatch(`${workspace}\n${controller}`, /citizen\.cyberwareList\s*=/);
});
