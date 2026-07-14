"use strict";

const {
  test,
  expect,
  USERS,
  login,
  waitForRuntime,
  resolveFixtureCitizenId
} = require("./fixtures.cjs");

const REQUIRED_APIS = Object.freeze([
  "createWorldBridgeOperation",
  "updateWorldBridgeOperation",
  "retryWorldBridgeOperation",
  "getWorldBridgeOperation",
  "validateWorldBridgeOperationReadiness",
  "validateCyberwareWorldBridgeReadiness",
  "auditCyberwareWorldBridgeStability",
  "auditCyberwareWorldBridgeCompensation"
]);

test("World Bridge readiness contracts are available and internally valid", async ({ page, consoleErrors }) => {
  await login(page, USERS.admin);
  await waitForRuntime(page, REQUIRED_APIS);

  const result = await page.evaluate(() => ({
    operation: window.WS_APP.validateWorldBridgeOperationReadiness(),
    cyberware: window.WS_APP.validateCyberwareWorldBridgeReadiness(),
    stability: window.WS_APP.auditCyberwareWorldBridgeStability(),
    compensation: window.WS_APP.auditCyberwareWorldBridgeCompensation(),
    version: window.WS_APP.CYBERWARE_WORLD_BRIDGE_VERSION
  }));

  expect(result.operation.ready).toBe(true);
  expect(result.cyberware.ready).toBe(true);
  expect(result.stability.valid).toBe(true);
  expect(result.compensation.valid).toBe(true);
  expect(result.version).toBe("14.2x");
  expect(consoleErrors).toEqual([]);
});

test("World Bridge idempotency and resource claims survive the real browser runtime", async ({ page, consoleErrors }) => {
  await login(page, USERS.admin);
  await waitForRuntime(page, REQUIRED_APIS);
  const citizenId = await resolveFixtureCitizenId(page);
  expect(citizenId).not.toBe("");

  const token = `e2e_claim_${Date.now()}`;
  const result = await page.evaluate(({ citizenId, token }) => {
    const app = window.WS_APP;
    const input = {
      idempotencyKey: `${token}:primary`,
      operationType: "E2E_WORLD_BRIDGE_CLAIM",
      citizenId,
      status: "DRAFT",
      currentStep: "DRAFT",
      claims: [{ resourceType: "ITEM_INSTANCE", resourceId: `${token}:item` }],
      flush: true
    };
    const created = app.createWorldBridgeOperation(input);
    const replay = app.createWorldBridgeOperation(input);
    const conflict = app.createWorldBridgeOperation({
      ...input,
      idempotencyKey: `${token}:secondary`,
      operationId: `${token}:secondary-operation`
    });
    return { created, replay, conflict };
  }, { citizenId, token });

  expect(result.created.ok).toBe(true);
  expect(result.replay.ok).toBe(true);
  expect(result.replay.replay).toBe(true);
  expect(result.replay.operation.operationId).toBe(result.created.operation.operationId);
  expect(result.conflict.ok).toBe(false);
  expect(result.conflict.reason).toBe("WORLD_BRIDGE_OPERATION_CLAIM_CONFLICT");
  expect(result.conflict.conflicts).toHaveLength(1);
  expect(consoleErrors).toEqual([]);
});
