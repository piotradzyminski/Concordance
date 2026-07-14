"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createRuntime(summaryFactory) {
  const runtime = createBrowserRuntime();
  runtime.load("js/equipment-cyberware-link.js");
  runtime.window.WS_APP.cyberwareAuthorization = {
    getCyberwareAuthorizationSummary: summaryFactory
  };
  return runtime;
}

function makeRuntime(overrides = {}) {
  const installed = overrides.installed || [
    { instanceId: "core-1", isCoreProcessor: true, operationalState: "ENABLED", condition: 96 },
    { instanceId: "implant-1", operationalState: "ENABLED", condition: 88 }
  ];
  return {
    installed,
    counts: {
      enabled: 2,
      offline: 0,
      maintenance: 0,
      fault: 0,
      locked: 0,
      ...(overrides.counts || {})
    },
    neuralCore: {
      neurochip: installed[0],
      interface: { instanceId: "interface-1" },
      systemState: "ENABLED",
      neuroLoad: 6,
      neuroCapacity: 30,
      channelLoad: 2,
      controlChannels: 9,
      interfaceLoad: 4,
      interfaceCapacity: 20,
      stability: 82,
      security: 73,
      latencyClass: "RESPONSIVE",
      warnings: [],
      ...(overrides.neuralCore || {})
    }
  };
}

test("Cyberware Overview is a status dashboard without Citizen field or shortcut-only actions", () => {
  const runtime = createRuntime(() => ({ total: 2, valid: 2, blocked: 0, states: [] }));
  const markup = runtime.window.WS_APP.renderCyberwareOverviewPanel(makeRuntime(), {
    id: "citizen-1",
    legalName: "Kamigaeri Nagato"
  });

  assert.match(markup, /System Readiness Overview/);
  assert.match(markup, /Subscription Billing/);
  assert.match(markup, /Firmware/);
  assert.match(markup, /Physical Condition/);
  assert.doesNotMatch(markup, />Citizen</);
  assert.doesNotMatch(markup, /Kamigaeri Nagato/);
  assert.doesNotMatch(markup, /data-cyberware-ui-view=/);
  assert.doesNotMatch(markup, /cyberware-ui-quick-actions/);
});

test("Cyberware Overview reports paid subscriptions, valid access and current firmware", () => {
  const summary = {
    total: 2,
    valid: 2,
    blocked: 0,
    states: [
      {
        item: { instanceId: "core-1" },
        state: {
          valid: true,
          blockers: [],
          warnings: [],
          license: { required: true, status: "ACTIVE" },
          subscription: { required: true, status: "ACTIVE", subscription: { billingStatus: "PAID" } },
          firmware: { required: true, status: "CURRENT" }
        }
      },
      {
        item: { instanceId: "implant-1" },
        state: {
          valid: true,
          blockers: [],
          warnings: [],
          license: { required: false, status: "NOT_REQUIRED" },
          subscription: { required: false, status: "NOT_REQUIRED" },
          firmware: { required: false, status: "NOT_REQUIRED" }
        }
      }
    ]
  };
  const runtime = createRuntime(() => summary);
  const projection = runtime.window.WS_APP.buildCyberwareOverviewProjection(makeRuntime(), { id: "citizen-1" });
  const byKey = Object.fromEntries(projection.readiness.map((entry) => [entry.key, entry]));

  assert.equal(byKey.payments.status, "PAID");
  assert.equal(byKey.payments.tone, "ready");
  assert.equal(byKey.authorization.status, "VALID");
  assert.equal(byKey.firmware.status, "CURRENT");
  assert.equal(byKey.condition.status, "GOOD");
});

test("Cyberware Overview surfaces overdue billing, firmware updates and runtime findings", () => {
  const summary = {
    total: 2,
    valid: 2,
    blocked: 0,
    states: [
      {
        item: { instanceId: "core-1" },
        state: {
          valid: true,
          blockers: [],
          warnings: ["FIRMWARE_UPDATE_AVAILABLE"],
          license: { required: true, status: "ACTIVE" },
          subscription: { required: true, status: "GRACE_PERIOD", subscription: { billingStatus: "OVERDUE" } },
          firmware: { required: true, status: "UPDATE_AVAILABLE" }
        }
      }
    ]
  };
  const runtime = createRuntime(() => summary);
  const projection = runtime.window.WS_APP.buildCyberwareOverviewProjection(makeRuntime({
    neuralCore: { warnings: ["NO_SERVICE_PORT"] }
  }), { id: "citizen-1" });
  const byKey = Object.fromEntries(projection.readiness.map((entry) => [entry.key, entry]));

  assert.equal(byKey.payments.status, "OVERDUE");
  assert.equal(byKey.payments.tone, "warning");
  assert.equal(byKey.firmware.status, "UPDATE AVAILABLE");
  assert.equal(byKey.firmware.tone, "warning");
  assert.ok(projection.issues.includes("NO_SERVICE_PORT"));
  assert.ok(projection.issues.includes("FIRMWARE_UPDATE_AVAILABLE"));
});
