"use strict";

const {
  test,
  expect,
  USERS,
  HEAVY_RUNTIME_APIS,
  login,
  ensureLoggedIn,
  waitForRuntime,
  resolveFixtureCitizenId,
  installRuntimeCounter,
  getRuntimeCounters,
  dispatchCyberwareWorldOperationEvent,
  getOperationNotifications,
  settleRuntime
} = require("./fixtures.cjs");

const REQUIRED_APIS = Object.freeze([
  "getTerminalEntries",
  "getCyberwareWorldBridgeDiagnostics"
]);

test("one operation keeps one Terminal card across revisions without Equipment or CyberGrid work", async ({ page, consoleErrors }) => {
  await login(page, USERS.player);
  await waitForRuntime(page, REQUIRED_APIS);
  const citizenId = await resolveFixtureCitizenId(page);
  expect(citizenId).not.toBe("");

  const operationId = `e2e_notification_${Date.now()}`;
  const instanceId = `${operationId}:instance`;
  await installRuntimeCounter(page, HEAVY_RUNTIME_APIS);

  const base = {
    operationId,
    operationType: "MAINTENANCE",
    citizenId,
    providerId: "system-runtime",
    instanceIds: [instanceId],
    changedDomains: ["WORLD_BRIDGE_OPERATION"],
    physicalChange: false
  };

  await dispatchCyberwareWorldOperationEvent(page, {
    ...base,
    status: "SCHEDULED",
    currentStep: "SCHEDULE",
    revision: 1
  });
  await dispatchCyberwareWorldOperationEvent(page, {
    ...base,
    status: "IN_PROGRESS",
    currentStep: "EXECUTE",
    revision: 2
  });
  await dispatchCyberwareWorldOperationEvent(page, {
    ...base,
    status: "IN_PROGRESS",
    currentStep: "EXECUTE",
    revision: 2
  });
  await dispatchCyberwareWorldOperationEvent(page, {
    ...base,
    status: "PAYMENT_RECOVERY_REQUIRED",
    currentStep: "CAPTURE",
    revision: 3
  });
  await settleRuntime(page);

  const entries = await getOperationNotifications(page, citizenId, operationId);
  expect(entries).toHaveLength(1);
  expect(entries[0].revision).toBe(3);
  expect(entries[0].severity).toBe("CRITICAL");
  expect(entries[0].attention).toBe("BLOCKING");
  expect(entries[0].subjectRef).toEqual({ type: "ITEM_INSTANCE", id: instanceId });
  expect(entries[0].relatedRefs).toContainEqual({ type: "WORLD_OPERATION", id: operationId });
  expect(entries[0].templateData.operationId).toBe(operationId);
  expect(entries[0].templateData.operationRevision).toBe(3);

  const counters = await getRuntimeCounters(page);
  for (const apiName of HEAVY_RUNTIME_APIS) {
    expect(counters[apiName] || 0, `${apiName} must remain unused for a status-only notification`).toBe(0);
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureLoggedIn(page, USERS.player);
  await waitForRuntime(page, REQUIRED_APIS);
  const afterReload = await getOperationNotifications(page, citizenId, operationId);
  expect(afterReload).toHaveLength(1);
  expect(afterReload[0].revision).toBe(3);
  expect(consoleErrors).toEqual([]);
});
