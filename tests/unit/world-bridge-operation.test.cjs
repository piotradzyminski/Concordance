"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");
const { makeWorldOperation } = require("../helpers/fixtures.cjs");

function operationInput(overrides = {}) {
  const operation = makeWorldOperation(overrides);
  return {
    operationId: operation.operationId,
    idempotencyKey: operation.idempotencyKey,
    operationType: operation.operationType,
    citizenId: operation.citizenId,
    providerId: operation.providerId,
    status: operation.status,
    currentStep: operation.currentStep,
    refs: operation.refs,
    flush: true
  };
}

test("World Bridge operation creation replays by idempotency key and detects signature conflicts", () => {
  const runtime = createBrowserRuntime({ wsApp: { getCampaignDateIso: () => "2109-02-13T12:00:00.000Z" } });
  runtime.load("js/world-bridge-operation-store.js");

  const first = runtime.window.WS_APP.createWorldBridgeOperation(operationInput());
  const replay = runtime.window.WS_APP.createWorldBridgeOperation(operationInput());
  const conflict = runtime.window.WS_APP.createWorldBridgeOperation(operationInput({ operationType: "REPAIR" }));

  assert.equal(first.ok, true);
  assert.equal(first.operation.revision, 1);
  assert.equal(replay.ok, true);
  assert.equal(replay.reason, "IDEMPOTENT_REPLAY");
  assert.equal(replay.operation.operationId, first.operation.operationId);
  assert.equal(conflict.ok, false);
  assert.equal(conflict.reason, "WORLD_BRIDGE_OPERATION_IDEMPOTENCY_CONFLICT");
});

test("World Bridge operation rejects a stale revision update", () => {
  const runtime = createBrowserRuntime({ wsApp: { getCampaignDateIso: () => "2109-02-13T12:00:00.000Z" } });
  runtime.load("js/world-bridge-operation-store.js");
  const created = runtime.window.WS_APP.createWorldBridgeOperation(operationInput());

  const updated = runtime.window.WS_APP.updateWorldBridgeOperation(created.operation.operationId, {
    status: "VALIDATING",
    currentStep: "VALIDATE"
  }, { expectedRevision: 1, flush: true });
  assert.equal(updated.ok, true);
  assert.equal(updated.operation.revision, 2);

  const stale = runtime.window.WS_APP.updateWorldBridgeOperation(created.operation.operationId, {
    status: "AUTHORIZED",
    currentStep: "AUTHORIZE"
  }, { expectedRevision: 1, flush: true });
  assert.equal(stale.ok, false);
  assert.equal(stale.reason, "WORLD_BRIDGE_OPERATION_STALE_REVISION");
  assert.equal(stale.operation.revision, 2);
});
