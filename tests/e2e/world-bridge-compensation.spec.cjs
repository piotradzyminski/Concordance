"use strict";

const {
  test,
  expect,
  USERS,
  HEAVY_RUNTIME_APIS,
  login,
  waitForRuntime,
  resolveFixtureCitizenId,
  installApiOverrides,
  installRuntimeCounter,
  restoreRuntimeHooks,
  getRuntimeCounters,
  getOperationNotifications,
  settleRuntime
} = require("./fixtures.cjs");

const REQUIRED_APIS = Object.freeze([
  "createWorldBridgeOperation",
  "updateWorldBridgeOperation",
  "getWorldBridgeOperation",
  "compensateCyberwareWorldOperation",
  "retryCyberwareWorldCompensation",
  "getTerminalEntries"
]);

test("Cyberware compensation records failure, retries idempotently and updates one Terminal card", async ({ page, consoleErrors }) => {
  await login(page, USERS.admin);
  await waitForRuntime(page, REQUIRED_APIS);
  const citizenId = await resolveFixtureCitizenId(page);
  expect(citizenId).not.toBe("");

  const token = `e2e_compensation_${Date.now()}`;
  const marketOrderId = `${token}:market`;
  const prepared = await page.evaluate(({ citizenId, token, marketOrderId }) => {
    const app = window.WS_APP;
    const created = app.createWorldBridgeOperation({
      idempotencyKey: token,
      operationType: "CYBERWARE_PURCHASE_TO_HOUSING",
      citizenId,
      providerId: "system-runtime",
      status: "DRAFT",
      currentStep: "DRAFT",
      refs: { marketOrderId },
      metadata: {
        cyberwareOperationType: "PURCHASE_TO_HOUSING",
        compensationIdempotencyKey: `${token}:compensation`,
        compensationReason: "E2E_MARKET_COMPENSATION"
      },
      flush: true
    });
    if (!created.ok) return created;
    return app.updateWorldBridgeOperation(created.operation.operationId, {
      status: "COMPENSATION_REQUIRED",
      currentStep: "COMPENSATE",
      recovery: { required: true, reasonCodes: ["E2E_MARKET_COMPENSATION"] },
      compensation: {
        status: "REQUIRED",
        attempts: 0,
        lastErrorCode: ""
      },
      metadata: {
        cyberwareOperationType: "PURCHASE_TO_HOUSING",
        compensationIdempotencyKey: `${token}:compensation`,
        compensationReason: "E2E_MARKET_COMPENSATION"
      },
      checkpointCode: "E2E_COMPENSATION_REQUIRED"
    }, {
      expectedRevision: created.operation.revision,
      forceTransition: true,
      flush: true,
      source: "E2E_COMPENSATION_REQUIRED"
    });
  }, { citizenId, token, marketOrderId });

  expect(prepared.ok).toBe(true);
  const operationId = prepared.operation.operationId;
  await installRuntimeCounter(page, HEAVY_RUNTIME_APIS);

  const firstAttempt = await page.evaluate(async ({ operationId, token }) => {
    return window.WS_APP.compensateCyberwareWorldOperation(operationId, {
      idempotencyKey: `${token}:compensation`,
      reasonCode: "E2E_MARKET_COMPENSATION"
    });
  }, { operationId, token });

  expect(firstAttempt.ok).toBe(false);
  expect(firstAttempt.reason).toBe("MARKET_ORDER_NOT_FOUND");
  let operation = await page.evaluate((id) => window.WS_APP.getWorldBridgeOperation(id), operationId);
  expect(operation.status).toBe("COMPENSATION_REQUIRED");
  expect(operation.compensation.status).toBe("RECOVERY_REQUIRED");
  expect(operation.recovery.required).toBe(true);

  const syntheticOrder = {
    marketOrderId,
    citizenId,
    vendorProviderId: "system-runtime",
    status: "AUTHORIZED",
    paymentStatus: "AUTHORIZED",
    compensationStatus: "NOT_REQUIRED",
    revision: 1,
    refundRequest: { status: "NONE" },
    createdItemInstanceIds: []
  };
  const cancelledOrder = {
    ...syntheticOrder,
    status: "CANCELLED",
    paymentStatus: "VOIDED",
    compensationStatus: "COMPLETED",
    revision: 2
  };

  await installApiOverrides(page, [
    { apiName: "getMarketOrder", result: syntheticOrder },
    { apiName: "cancelMarketOrder", result: { ok: true, operation: "CANCELLED", order: cancelledOrder } }
  ]);

  const retried = await page.evaluate(async ({ operationId, token }) => {
    return window.WS_APP.retryCyberwareWorldCompensation(operationId, {
      idempotencyKey: `${token}:compensation`,
      reasonCode: "E2E_MARKET_COMPENSATION"
    });
  }, { operationId, token });

  expect(retried.ok).toBe(true);
  expect(retried.operation.status).toBe("CANCELLED");
  expect(retried.operation.compensationState.status).toBe("COMPLETED");
  await settleRuntime(page);

  operation = await page.evaluate((id) => window.WS_APP.getWorldBridgeOperation(id), operationId);
  expect(operation.status).toBe("CANCELLED");
  expect(operation.compensation.status).toBe("COMPLETED");
  expect(operation.recovery.required).toBe(false);
  expect(operation.metadata.compensationIdempotencyKey).toBe(`${token}:compensation`);

  const entries = await getOperationNotifications(page, citizenId, operationId);
  expect(entries).toHaveLength(1);
  expect(entries[0].revision).toBe(operation.revision);
  expect(entries[0].templateData.compensationStatus).toBe("COMPLETED");

  const counters = await getRuntimeCounters(page);
  for (const apiName of HEAVY_RUNTIME_APIS) {
    expect(counters[apiName] || 0, `${apiName} must remain unused for non-physical compensation`).toBe(0);
  }

  await restoreRuntimeHooks(page);
  expect(consoleErrors).toEqual([]);
});
