"use strict";

const {
  test,
  expect,
  USERS,
  login,
  ensureLoggedIn,
  waitForRuntime,
  resolveFixtureCitizenId
} = require("./fixtures.cjs");

const REQUIRED_APIS = Object.freeze([
  "createWorldBridgeOperation",
  "updateWorldBridgeOperation",
  "registerWorldBridgeOperationRecoveryHandler",
  "retryWorldBridgeOperation",
  "getWorldBridgeOperation"
]);

test("interrupted operation persists across reload and completes through the registered retry handler", async ({ page, consoleErrors }) => {
  await login(page, USERS.admin);
  await waitForRuntime(page, REQUIRED_APIS);
  const citizenId = await resolveFixtureCitizenId(page);
  expect(citizenId).not.toBe("");

  const token = `e2e_retry_${Date.now()}`;
  const created = await page.evaluate(({ citizenId, token }) => {
    const app = window.WS_APP;
    const createResult = app.createWorldBridgeOperation({
      idempotencyKey: token,
      operationType: "E2E_WORLD_BRIDGE_RETRY",
      recoveryHandlerId: "E2E_WORLD_BRIDGE_RETRY",
      citizenId,
      status: "DRAFT",
      currentStep: "DRAFT",
      flush: true
    });
    if (!createResult.ok) return createResult;
    return app.updateWorldBridgeOperation(createResult.operation.operationId, {
      status: "RECOVERY_REQUIRED",
      currentStep: "CAPTURE",
      recovery: { required: true, reasonCodes: ["E2E_CAPTURE_INTERRUPTED"] },
      errorCode: "E2E_CAPTURE_INTERRUPTED",
      checkpointCode: "E2E_CAPTURE_INTERRUPTED"
    }, {
      expectedRevision: createResult.operation.revision,
      forceTransition: true,
      flush: true,
      source: "E2E_CAPTURE_INTERRUPTED"
    });
  }, { citizenId, token });

  expect(created.ok).toBe(true);
  const operationId = created.operation.operationId;
  const persistedRevision = created.operation.revision;

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureLoggedIn(page, USERS.admin);
  await waitForRuntime(page, REQUIRED_APIS);

  const restored = await page.evaluate((operationId) => window.WS_APP.getWorldBridgeOperation(operationId), operationId);
  expect(restored).not.toBeNull();
  expect(restored.status).toBe("RECOVERY_REQUIRED");
  expect(restored.currentStep).toBe("CAPTURE");
  expect(restored.revision).toBe(persistedRevision);

  const retry = await page.evaluate(async (operationId) => {
    const app = window.WS_APP;
    app.registerWorldBridgeOperationRecoveryHandler("E2E_WORLD_BRIDGE_RETRY", async (operation) => {
      const latest = app.getWorldBridgeOperation(operation.operationId);
      const completed = app.updateWorldBridgeOperation(operation.operationId, {
        status: "COMPLETED",
        currentStep: "COMPLETE",
        recovery: { required: false, reasonCodes: [] },
        retry: { lastErrorCode: "" },
        metadata: { resultCode: "E2E_RECOVERED_AFTER_RELOAD" },
        checkpointCode: "E2E_RECOVERED_AFTER_RELOAD"
      }, {
        expectedRevision: latest.revision,
        forceTransition: true,
        flush: true,
        source: "E2E_RECOVERED_AFTER_RELOAD"
      });
      return { ok: completed.ok === true };
    });
    return app.retryWorldBridgeOperation(operationId, {
      handlerId: "E2E_WORLD_BRIDGE_RETRY",
      force: true
    });
  }, operationId);

  expect(retry.ok).toBe(true);
  const completed = await page.evaluate((id) => window.WS_APP.getWorldBridgeOperation(id), operationId);
  expect(completed.status).toBe("COMPLETED");
  expect(completed.currentStep).toBe("COMPLETE");
  expect(completed.retry.count).toBe(1);
  expect(completed.recovery.required).toBe(false);
  expect(completed.metadata.resultCode).toBe("E2E_RECOVERED_AFTER_RELOAD");
  expect(consoleErrors).toEqual([]);
});
