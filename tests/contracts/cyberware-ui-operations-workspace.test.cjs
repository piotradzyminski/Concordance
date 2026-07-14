"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");
const { readProjectFile } = require("../helpers/source-contract.cjs");

function createRuntime() {
  const runtime = createBrowserRuntime();
  runtime.load("js/cyberware-workspace.js");
  return runtime;
}

const citizen = { id: "citizen-operations" };
const sourceItem = {
  instanceId: "source-implant",
  name: "Replacement Hand",
  definitionId: "hand-replacement-t3",
  lifecycleState: "STORED",
  locationType: "STORED",
  condition: 100,
  operationalState: "UNINSTALLED"
};
const targetItem = {
  instanceId: "target-implant",
  name: "Installed Hand",
  definitionId: "hand-installed-t2",
  lifecycleState: "INSTALLED",
  slots: ["rightHandCore"],
  primarySlot: "rightHandCore",
  condition: 74,
  operationalState: "ENABLED",
  serviceHistory: [{ operation: "CALIBRATION", occurredAt: "2109-03-01T10:00:00.000Z", status: "COMPLETED" }]
};
const runtimeState = { installed: [targetItem], neuralCore: {}, counts: {} };

function installSharedApis(app) {
  app.cyberwareAuthorization = {
    getCyberwareAuthorizationState() {
      return {
        license: { required: false, valid: true },
        subscription: { required: false, valid: true },
        firmware: { required: false, valid: true }
      };
    }
  };
  app.cyberwarePlanner = {
    formatToken(value = "") { return String(value).replace(/_/g, " "); },
    formatCredits(value = 0) { return `${Number(value)} ₡`; },
    formatDuration(value = 0) { return `${Number(value)} MIN`; },
    getPlannerViewModel() {
      return {
        state: { operation: "REPLACE", sourceItemId: sourceItem.instanceId, targetItemId: targetItem.instanceId },
        source: sourceItem,
        target: targetItem,
        plan: {
          status: "VALID",
          valid: true,
          procedureCost: 4200,
          durationMinutes: 180,
          blockers: [],
          warnings: ["RECOVERY_REQUIRED"]
        }
      };
    }
  };
  app.getWorldBridgeOperations = () => [{
    operationId: "world-op-1",
    operationType: "REPLACE",
    citizenId: citizen.id,
    status: "SCHEDULED",
    currentStep: "SERVICE",
    instanceIds: [targetItem.instanceId]
  }];
}

test("Operations workspace shares context, quote, World Bridge state and ItemInstance inspector", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  installSharedApis(app);

  const markup = app.renderCyberwareOperationsWorkspace(runtimeState, citizen, "PLANNER", { mountPlanner: false });

  assert.match(markup, /Operations Workspace/);
  assert.match(markup, /Selected system/);
  assert.match(markup, /Installed Hand/);
  assert.match(markup, /REPLACE/);
  assert.match(markup, /SCHEDULED/);
  assert.match(markup, /4200 ₡/);
  assert.match(markup, /180 MIN/);
  assert.match(markup, /data-cyberware-operations-inspector-role="SOURCE"/);
  assert.match(markup, /data-cyberware-operations-inspector-role="TARGET"[^>]*is-active/);
  assert.match(markup, /data-cyberware-inspector-item="target-implant"/);
  assert.doesNotMatch(markup, /data-cyberware-planner-action="select-target"/);
});

test("Replacement inspector can switch between source and target without changing planner state", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  installSharedApis(app);

  app.setCyberwareOperationsInspectorRole(citizen.id, "SOURCE");
  const projection = app.buildCyberwareOperationsProjection(citizen.id, runtimeState, citizen, "PLANNER");
  const markup = app.renderCyberwareOperationsWorkspace(runtimeState, citizen, "PLANNER", { mountPlanner: false });

  assert.equal(projection.inspectorRole, "SOURCE");
  assert.equal(projection.itemId, sourceItem.instanceId);
  assert.match(markup, /data-cyberware-inspector-item="source-implant"/);
  assert.match(markup, /data-cyberware-operations-inspector-role="SOURCE"[^>]*is-active/);
});

test("Maintenance is embedded in Operations without legacy close control or obsolete settlement copy", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  installSharedApis(app);
  app.cyberwareMaintenance = {
    getCyberwareMaintenanceViewModel() {
      return {
        state: { selectedItemId: targetItem.instanceId, operation: "REPAIR", feedback: null },
        operations: [{ key: "REPAIR", label: "REPAIR" }],
        items: [targetItem],
        selectedItem: targetItem,
        quote: { status: "READY", valid: true, operation: "REPAIR", summary: "Repair ready", cost: 900, durationMinutes: 45, reason: "READY", blockers: [], warnings: [] },
        calibration: { quality: 90, profile: "FACTORY" },
        maintenance: { cleanliness: 88 },
        firmware: { status: "CURRENT", version: "2.0" },
        history: []
      };
    }
  };

  const panel = app.renderCyberwareMaintenancePanel(citizen.id);
  const workspace = app.renderCyberwareOperationsWorkspace(runtimeState, citizen, "MAINTENANCE", { mountMaintenance: true });

  assert.match(panel, /Execute Service/);
  assert.doesNotMatch(panel, /Close Maintenance/);
  assert.doesNotMatch(panel, /not charged to Billing|do not advance campaign time|12\.1x/);
  assert.match(panel, /canonical domains/);
  assert.match(workspace, /data-operations-view="MAINTENANCE"/);
  assert.match(workspace, /data-cyberware-inspector-item="target-implant"/);
});

test("History exposes ALL and SELECTED filters and keeps ItemInstance references inspectable", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  installSharedApis(app);
  app.setCyberwareSelectedInstance(citizen.id, targetItem.instanceId, { citizen, runtime: runtimeState, syncView: false });
  app.setCyberwareHistoryFilter(citizen.id, "SELECTED", { citizen, runtime: runtimeState });

  const markup = app.renderCyberwareOperationsWorkspace(runtimeState, citizen, "HISTORY");

  assert.match(markup, /ALL SYSTEMS/);
  assert.match(markup, /SELECTED SYSTEM/);
  assert.match(markup, /data-cyberware-history-filter="SELECTED"[^>]*is-active/);
  assert.match(markup, /data-cyberware-history-select="target-implant"/);
  assert.match(markup, /CALIBRATION/);
  assert.match(markup, /data-cyberware-inspector-item="target-implant"/);
});

test("Cyberware module delegation wires Bodymap prerequisite and Operations selection controls", () => {
  const source = readProjectFile("js/cyberware-module.js");

  assert.match(source, /data-cyberware-bodymap-view/);
  assert.match(source, /data-cyberware-select-item/);
  assert.match(source, /data-cyberware-operations-inspector-role/);
  assert.match(source, /setCyberwareOperationsInspectorRole/);
  assert.match(source, /data-cyberware-history-filter/);
  assert.match(source, /setCyberwareHistoryFilter/);
  assert.match(source, /data-cyberware-history-select/);
});
