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

const citizen = { id: "citizen-bodymap-inspector" };
const frontItem = {
  instanceId: "implant-front-1",
  definitionId: "vd-hand-assist-t2",
  catalogName: "Hand Neuromotor Assist T2",
  name: "Precision Hand",
  manufacturer: "Vector Dynamics",
  slots: ["rightHandCore"],
  primarySlot: "rightHandCore",
  slotDisplayLabel: "Right Hand",
  scale: "SMALL",
  scaleLabel: "Small",
  grade: "INDUSTRIAL",
  gradeLabel: "Industrial",
  productTier: 2,
  condition: 86,
  operationalState: "ENABLED",
  operationalReason: "DEPENDENCIES_READY",
  resourceAllocation: { neuroLoad: 2, neuroChannels: 1, interfaceLoad: 1 },
  requiredProtocols: ["NEUROMOTOR"],
  lifecycleState: "INSTALLED",
  cyberwareState: {
    calibration: { quality: 92 },
    installedFirmware: [{ releaseId: "fw-vd-2.3", version: "2.3", status: "CURRENT" }]
  },
  hardwareIdentity: { serialNumber: "VD-2209-A" },
  serviceHistory: [{ operation: "CALIBRATION", occurredAt: "2109-02-12T10:00:00.000Z" }]
};
const backItem = {
  instanceId: "implant-back-1",
  definitionId: "kagami-interface-t3",
  catalogName: "Torii Secure Interface",
  name: "Torii Interface",
  manufacturer: "Kagami Kaisha",
  slots: ["interface"],
  primarySlot: "interface",
  slotDisplayLabel: "Interface",
  isCoreInterface: true,
  scale: "SMALL",
  grade: "PROFESSIONAL",
  productTier: 3,
  condition: 98,
  operationalState: "ENABLED",
  operationalReason: "INTERFACE_READY",
  resourceAllocation: { neuroLoad: 0, neuroChannels: 0, interfaceLoad: 0 },
  lifecycleState: "INSTALLED"
};
const runtimeState = { installed: [frontItem, backItem], neuralCore: {}, counts: {} };

function installAuthorization(app) {
  app.cyberwareAuthorization = {
    getCyberwareAuthorizationState(_citizen, item) {
      return {
        valid: true,
        license: { required: true, category: "NEUROMOTOR", status: "ACTIVE", valid: true },
        subscription: { required: false, status: "NOT_REQUIRED", valid: true },
        firmware: item.instanceId === frontItem.instanceId
          ? { required: true, status: "CURRENT", version: "2.3", latestVersion: "2.3", valid: true, warning: false }
          : { required: false, status: "NOT_REQUIRED", valid: true, warning: false }
      };
    },
    getCyberwareAuthorizationSummary() {
      return { valid: 2, blocked: 0, updateAvailable: 0, licenses: [], states: [] };
    }
  };
}

test("Cyberware Bodymap uses canonical assets and consistent FRONT/BACK views", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  installAuthorization(app);

  const markup = app.renderCyberwareBodymapPanel(runtimeState, citizen);

  assert.match(markup, /src="assets\/bodymap_front\.jpg"/);
  assert.match(markup, /src="assets\/bodymap_back\.jpg"/);
  assert.doesNotMatch(markup, /bodymap_front_x2\.webp/);
  assert.match(markup, /data-cyberware-bodymap-view="front"[^>]*>FRONT</);
  assert.match(markup, /data-cyberware-bodymap-view="back"[^>]*>BACK</);
  assert.doesNotMatch(markup, /ANTERIOR|POSTERIOR/);
  assert.match(markup, /data-cyberware-bodymap-frame="front"/);
  assert.match(markup, /data-cyberware-bodymap-frame="back"[^>]*hidden/);
});

test("Cyberware selection is shared by list, marker and Inspector and switches to the mapped view", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  installAuthorization(app);

  const result = app.setCyberwareSelectedInstance(citizen.id, backItem.instanceId, {
    citizen,
    runtime: runtimeState
  });
  const state = app.getCyberwareUiState(citizen.id);
  const markup = app.renderCyberwareBodymapPanel(runtimeState, citizen);

  assert.equal(result.selectedInstanceId, backItem.instanceId);
  assert.equal(result.bodymapView, "back");
  assert.equal(state.selectedInstanceId, backItem.instanceId);
  assert.equal(state.bodymapView, "back");
  assert.match(markup, /data-cyberware-select-item="implant-back-1"[^>]*aria-pressed="true"/);
  assert.match(markup, /data-cyberware-bodymap-frame="front"[^>]*hidden/);
  assert.match(markup, /data-cyberware-bodymap-frame="back"(?![^>]*hidden)/);
  assert.match(markup, /data-cyberware-inspector-item="implant-back-1"/);
  assert.match(markup, /Torii Interface/);
});

test("Cyberware Inspector exposes ItemInstance, runtime, authorization, firmware and operation controls", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  installAuthorization(app);

  const markup = app.renderCyberwareInspector(frontItem, citizen);

  assert.match(markup, /CYBERWARE \/ INSPECTOR/);
  assert.match(markup, /Precision Hand/);
  assert.match(markup, /Hand Neuromotor Assist T2/);
  assert.match(markup, /Condition/);
  assert.match(markup, /86%/);
  assert.match(markup, /Neuroload/);
  assert.match(markup, /License/);
  assert.match(markup, /Firmware/);
  assert.match(markup, /CURRENT \/ 2\.3 → 2\.3/);
  assert.match(markup, /Instance ID/);
  assert.match(markup, /implant-front-1/);
  assert.match(markup, /Serial number/);
  assert.match(markup, /VD-2209-A/);
  assert.match(markup, /data-cyberware-planner-action="select-target"/);
  assert.match(markup, /data-cyberware-planner-action="replace-target"/);
  assert.match(markup, /data-cyberware-maintenance-action="open" data-item-id="implant-front-1"/);
});

test("Installed Systems cards use the same local selection and Inspector contract", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  installAuthorization(app);
  app.getCyberwareRuntimeState = () => runtimeState;
  app.setCyberwareSelectedInstance(citizen.id, frontItem.instanceId, { citizen, runtime: runtimeState });

  const bodymap = app.renderCyberwareBodymapPanel(runtimeState, citizen);
  const fullWorkspace = app.renderCyberwareWorkspace(citizen, { activeView: "SYSTEMS" });

  assert.match(bodymap, /Bodymap Index/);
  assert.match(fullWorkspace, /data-cyberware-system-card="implant-front-1"/);
  assert.match(fullWorkspace, /equipment-cyberware-card is-selected/);
  assert.match(fullWorkspace, /data-cyberware-inspector-item="implant-front-1"/);
});

test("standalone Cyberware actions expose local Bodymap view and selection fast paths", () => {
  const source = readProjectFile("js/cyberware-module.js");

  assert.match(source, /data-cyberware-bodymap-view/);
  assert.match(source, /setCyberwareBodymapView/);
  assert.match(source, /data-cyberware-select-item/);
  assert.match(source, /setCyberwareSelectedInstance/);
  assert.match(source, /setCyberwareMaintenanceSelection/);
  assert.match(source, /setCyberwareUiView\?\.\(citizenId, "MAINTENANCE"/);
});
