"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function makeOperation(overrides = {}) {
  return {
    operationId: "world_op_1",
    operationType: "PURCHASE_AND_INSTALL",
    citizenId: "citizen-a",
    providerId: "provider-a",
    status: "RECOVERY_REQUIRED",
    currentStep: "COMMIT",
    refs: {
      marketOrderId: "market-1",
      serviceOrderId: "service-1",
      billingIntentId: "intent-1",
      billingTransactionId: "",
      itemTransactionId: "item-tx-1",
      instanceIds: ["item-1"],
      housingReservationIds: [],
      marketStockReservationIds: []
    },
    claims: [{ resourceType: "ITEM_INSTANCE", resourceId: "item-1" }],
    retry: { count: 0, maxAttempts: 5, handlerId: "PURCHASE_AND_INSTALL" },
    recovery: { required: true, reasonCodes: ["ITEM_TRANSACTION_RECOVERY_REQUIRED"] },
    compensation: { status: "NOT_REQUIRED" },
    revision: 3,
    createdAt: "2109-02-13T10:00:00.000Z",
    updatedAt: "2109-02-13T11:00:00.000Z",
    ...overrides
  };
}

function createRuntime(overrides = {}) {
  let operation = makeOperation();
  const audits = [];
  const calls = { retry: 0, reconcile: 0, claim: 0, release: 0 };
  const runtime = createBrowserRuntime({
    wsApp: {
      currentUser: { id: "admin-1", role: "admin", displayName: "Admin" },
      getWorldBridgeOperation: (id) => id === operation.operationId ? structuredClone(operation) : null,
      getWorldBridgeOperationClaimOwner: () => null,
      getAdminAuditEvents: () => structuredClone(audits),
      appendAdminAuditResult: (input) => {
        const event = {
          auditEventId: `audit-${audits.length + 1}`,
          sourceCommand: input.sourceCommand,
          category: input.category,
          targetRefs: input.targetRefs,
          request: input.request,
          result: input.result,
          domainRefs: input.domainRefs
        };
        audits.push(event);
        return { ok: true, event };
      },
      retryWorldBridgeOperation: async () => {
        calls.retry += 1;
        operation = { ...operation, status: "IN_PROGRESS", currentStep: "EXECUTE", recovery: { required: false, reasonCodes: [] }, retry: { ...operation.retry, count: operation.retry.count + 1 }, revision: operation.revision + 2 };
        return { ok: true, reason: "WORLD_BRIDGE_OPERATION_UPDATED", operation: structuredClone(operation) };
      },
      reconcileWorldBridgeOperation: () => {
        calls.reconcile += 1;
        operation = { ...operation, recovery: { ...operation.recovery, lastReconciledAt: "2109-02-13T12:00:00.000Z" }, revision: operation.revision + 1 };
        return { ok: true, reason: "WORLD_BRIDGE_OPERATION_UPDATED", operation: structuredClone(operation) };
      },
      claimWorldBridgeOperationResources: (_id, claims) => {
        calls.claim += 1;
        operation = { ...operation, claims: [...operation.claims, ...claims], revision: operation.revision + 1 };
        return { ok: true, reason: "WORLD_BRIDGE_OPERATION_UPDATED", operation: structuredClone(operation) };
      },
      releaseWorldBridgeOperationClaims: () => {
        calls.release += 1;
        operation = { ...operation, claims: [], revision: operation.revision + 1 };
        return { ok: true, reason: "WORLD_BRIDGE_OPERATION_UPDATED", operation: structuredClone(operation) };
      },
      ...overrides
    }
  });
  runtime.load("js/admin-operations-command.js");
  return { runtime, audits, calls, getOperation: () => structuredClone(operation), setOperation: (next) => { operation = next; } };
}

test("Admin Operations command retries through the public World Bridge API and audits once", async () => {
  const { runtime, audits, calls } = createRuntime();
  const input = {
    actor: { actorId: "admin-1", actorRole: "ADMIN", displayName: "Admin" },
    action: "RETRY",
    operationId: "world_op_1",
    operatorNote: "Retry after ItemInstance recovery.",
    expectedRevision: 3,
    idempotencyKey: "admin-op-retry-1"
  };

  const result = await runtime.window.WS_APP.executeAdminWorldBridgeOperationAction(input);
  assert.equal(result.ok, true);
  assert.equal(result.resultCode, "ADMIN_WORLD_BRIDGE_RETRY_SUCCEEDED");
  assert.equal(calls.retry, 1);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].category, "WORLD_BRIDGE");
  assert.equal(audits[0].domainRefs.operationId, "world_op_1");

  const replay = await runtime.window.WS_APP.executeAdminWorldBridgeOperationAction(input);
  assert.equal(replay.replay, true);
  assert.equal(calls.retry, 1);
  assert.equal(audits.length, 1);
});

test("Admin Operations command rejects stale revisions before reconciliation", async () => {
  const { runtime, audits, calls } = createRuntime();
  const result = await runtime.window.WS_APP.executeAdminWorldBridgeOperationAction({
    actor: { actorId: "admin-1", actorRole: "ADMIN" },
    action: "RECONCILE",
    operationId: "world_op_1",
    operatorNote: "Reconcile linked domains.",
    expectedRevision: 2,
    idempotencyKey: "admin-op-reconcile-stale"
  });

  assert.equal(result.ok, false);
  assert.equal(result.resultCode, "WORLD_BRIDGE_OPERATION_STALE_REVISION");
  assert.equal(calls.reconcile, 0);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].result.status, "FAILED");
});

test("Admin Operations command claims and releases resources through canonical APIs", async () => {
  const { runtime, calls, getOperation } = createRuntime();
  let operation = getOperation();
  const claim = await runtime.window.WS_APP.executeAdminWorldBridgeOperationAction({
    actor: { actorId: "admin-1", actorRole: "ADMIN" },
    action: "CLAIM",
    operationId: operation.operationId,
    claims: [{ resourceType: "SERVICE_ORDER", resourceId: "service-1" }],
    operatorNote: "Protect Service order during recovery.",
    expectedRevision: operation.revision,
    idempotencyKey: "admin-op-claim-1"
  });
  assert.equal(claim.ok, true);
  assert.equal(calls.claim, 1);

  operation = getOperation();
  const release = await runtime.window.WS_APP.executeAdminWorldBridgeOperationAction({
    actor: { actorId: "admin-1", actorRole: "ADMIN" },
    action: "RELEASE_CLAIM",
    operationId: operation.operationId,
    claims: operation.claims,
    operatorNote: "Release recovery claims.",
    expectedRevision: operation.revision,
    idempotencyKey: "admin-op-release-1"
  });
  assert.equal(release.ok, true);
  assert.equal(calls.release, 1);
});
