"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function makeOperation(overrides = {}) {
  return {
    operationId: "operation-1",
    citizenId: "citizen-a",
    operationType: "INSTALL",
    status: "AUTHORIZED",
    currentStep: "AUTHORIZE",
    revision: 4,
    updatedAt: "2109-02-13T12:00:04.000Z",
    refs: {
      serviceOrderId: "service-order-1",
      billingIntentId: "billing-intent-1",
      billingTransactionId: "billing-transaction-1",
      marketOrderId: "",
      itemTransactionId: "",
      instanceIds: ["item-1"]
    },
    ...overrides
  };
}

function makeRuntime() {
  const operations = new Map([["operation-1", makeOperation()]]);
  const entries = [];
  const eventDefinitions = {
    "WORLD_OPERATION.STATUS_CHANGED": {
      eventCode: "WORLD_OPERATION.STATUS_CHANGED",
      label: "World operation status changed",
      domain: "WORLD_BRIDGE",
      category: "OPERATION",
      legacyType: "SYSTEM",
      legacySubtype: "SYSTEM_NOTICE",
      defaultSeverity: "NOTICE",
      defaultAttention: "INBOX",
      defaultAudience: ["PLAYER"],
      subjectTypes: ["WORLD_OPERATION", "ITEM_INSTANCE"],
      requiredData: [],
      providerRequired: false,
      templateId: "world-bridge-operation-status",
      actions: [],
      retentionPolicy: {},
      aggregationPolicy: { mode: "REPLACE_EXISTING", keyFields: ["citizenId", "eventCode", "correlationId"] }
    },
    "SERVICE.ORDER.SCHEDULED": {
      eventCode: "SERVICE.ORDER.SCHEDULED",
      label: "Service scheduled",
      domain: "SERVICE",
      category: "ORDER",
      legacyType: "SERVICE",
      legacySubtype: "SERVICE_SCHEDULED",
      defaultSeverity: "NOTICE",
      defaultAttention: "INBOX",
      defaultAudience: ["PLAYER"],
      subjectTypes: ["SERVICE_ORDER"],
      requiredData: [],
      providerRequired: true,
      templateId: "service-order-status",
      actions: [],
      retentionPolicy: {},
      aggregationPolicy: { mode: "REPLACE_EXISTING", keyFields: ["citizenId", "eventCode", "subjectRef.id"] }
    },
    "BILLING.PAYMENT.CAPTURED": {
      eventCode: "BILLING.PAYMENT.CAPTURED",
      label: "Payment captured",
      domain: "BILLING",
      category: "PAYMENT",
      legacyType: "BILLING",
      legacySubtype: "PAYMENT_CAPTURED",
      defaultSeverity: "INFO",
      defaultAttention: "INBOX",
      defaultAudience: ["PLAYER"],
      subjectTypes: ["BILLING_TRANSACTION"],
      requiredData: [],
      providerRequired: false,
      templateId: "billing-payment-status",
      actions: [],
      retentionPolicy: {},
      aggregationPolicy: { mode: "REPLACE_EXISTING", keyFields: ["citizenId", "eventCode", "subjectRef.id"] }
    }
  };

  const runtime = createBrowserRuntime({
    wsApp: {
      notificationRegistry: {
        normalizeEventCode: (value) => String(value || "").trim().toUpperCase(),
        getEvent: (eventCode) => structuredClone(eventDefinitions[eventCode] || null),
        normalizeAudience: (value) => Array.isArray(value) ? value : [value || "PLAYER"],
        resolveProvider: (providerId) => providerId === "clinic-provider" ? {
          providerId,
          requestedProviderId: providerId,
          manifest: { providerId, sourceKind: "ORGANIZATION", eventOverrides: {} },
          organization: { id: "organization-clinic", name: "Clinic" }
        } : null,
        providerSupportsEvent: () => true,
        pushDiagnostic() {}
      },
      getWorldBridgeOperation: (operationId) => structuredClone(operations.get(operationId) || null),
      getWorldBridgeOperationsByReference: (field, referenceId) => [...operations.values()]
        .filter((operation) => {
          if (field === "instanceId") return operation.refs.instanceIds.includes(referenceId);
          return operation.refs[field] === referenceId;
        })
        .map((operation) => structuredClone(operation)),
      getServiceOrder: (serviceOrderId) => serviceOrderId === "service-order-1" ? {
        serviceOrderId,
        citizenId: "citizen-a",
        providerId: "clinic-provider",
        metadata: { operationId: "operation-1" }
      } : serviceOrderId === "standalone-service" ? {
        serviceOrderId,
        citizenId: "citizen-a",
        providerId: "clinic-provider",
        metadata: {}
      } : null,
      getBillingIntent: (billingIntentId) => billingIntentId === "billing-intent-1" ? {
        billingIntentId,
        citizenId: "citizen-a",
        correlationId: "operation-1",
        sourceDomain: "SERVICE",
        sourceRefId: "service-order-1"
      } : null,
      getBillingTransaction: (billingTransactionId) => billingTransactionId === "billing-transaction-1" ? {
        billingTransactionId,
        billingIntentId: "billing-intent-1",
        citizenId: "citizen-a",
        correlationId: "operation-1",
        sourceDomain: "SERVICE",
        sourceRefId: "service-order-1"
      } : null,
      addTerminalEntry: (citizenId, entry) => {
        const created = { ...structuredClone(entry), id: `entry-${entries.length + 1}`, citizenId, read: entry.read === true };
        entries.push(created);
        return structuredClone(created);
      },
      upsertTerminalEntry: (citizenId, entry, options = {}) => {
        const index = entries.findIndex((record) => record.citizenId === citizenId && (
          (entry.eventId && record.eventId === entry.eventId)
          || (entry.dedupeKey && record.dedupeKey === entry.dedupeKey)
        ));
        if (index < 0) {
          const created = { ...structuredClone(entry), id: `entry-${entries.length + 1}`, citizenId, read: entry.read === true };
          entries.push(created);
          return { ok: true, operation: "CREATED", notificationId: created.id, entry: structuredClone(created) };
        }
        const existing = entries[index];
        if (Number(entry.revision || 1) <= Number(existing.revision || 1)) {
          return { ok: true, operation: "IGNORED_DUPLICATE", notificationId: existing.id, entry: structuredClone(existing) };
        }
        const updated = {
          ...existing,
          ...structuredClone(entry),
          id: existing.id,
          citizenId,
          read: options.markUnreadOnUpdate === false ? existing.read : false
        };
        entries[index] = updated;
        return { ok: true, operation: "UPDATED_EXISTING", notificationId: updated.id, entry: structuredClone(updated) };
      }
    }
  });

  runtime.load("js/notification-projection-policy.js");
  runtime.load("js/notification-api.js");
  return { runtime, entries, operations };
}

function emitWorld(runtime, status, revision) {
  return runtime.window.TerminalNotifications.emit({
    eventCode: "WORLD_OPERATION.STATUS_CHANGED",
    citizenId: "citizen-a",
    subjectRef: { type: "ITEM_INSTANCE", id: "item-1" },
    relatedRefs: [
      { type: "WORLD_OPERATION", id: "operation-1" },
      { type: "SERVICE_ORDER", id: "service-order-1" },
      { type: "BILLING_INTENT", id: "billing-intent-1" }
    ],
    correlationId: "operation-1",
    revision,
    title: "World operation",
    summary: status,
    data: { operationId: "operation-1", status }
  });
}

test("linked Service and Billing events project to the World Operation card", () => {
  const { runtime, entries } = makeRuntime();

  const serviceResult = runtime.window.TerminalNotifications.emit({
    eventCode: "SERVICE.ORDER.SCHEDULED",
    citizenId: "citizen-a",
    providerId: "clinic-provider",
    subjectRef: { type: "SERVICE_ORDER", id: "service-order-1" },
    correlationId: "service-order-1",
    revision: 2,
    data: { serviceOrderId: "service-order-1", status: "SCHEDULED" }
  });
  assert.equal(serviceResult.ok, true);
  assert.equal(serviceResult.operation, "PROJECTED_TO_PARENT");
  assert.equal(serviceResult.parentOperationId, "operation-1");

  const billingResult = runtime.window.TerminalNotifications.emit({
    eventCode: "BILLING.PAYMENT.CAPTURED",
    citizenId: "citizen-a",
    subjectRef: { type: "BILLING_TRANSACTION", id: "billing-transaction-1" },
    correlationId: "operation-1",
    revision: 1,
    data: { billingTransactionId: "billing-transaction-1", sourceDomain: "SERVICE", sourceRefId: "service-order-1" }
  });
  assert.equal(billingResult.ok, true);
  assert.equal(billingResult.operation, "PROJECTED_TO_PARENT");
  assert.equal(entries.length, 0);
});

test("pre-Inbox World Operation states do not create player cards", () => {
  const { runtime, entries, operations } = makeRuntime();
  for (const [index, status] of ["DRAFT", "VALIDATING", "RESERVING"].entries()) {
    operations.set("operation-1", makeOperation({ status, revision: index + 1 }));
    const result = emitWorld(runtime, status, index + 1);
    assert.equal(result.ok, true);
    assert.equal(result.operation, "SUPPRESSED_BY_POLICY");
  }
  assert.equal(entries.length, 0);
});

test("one World Operation keeps one card and applies quiet versus unread updates", () => {
  const { runtime, entries, operations } = makeRuntime();

  operations.set("operation-1", makeOperation({ status: "AUTHORIZED", revision: 4 }));
  const authorized = emitWorld(runtime, "AUTHORIZED", 4);
  assert.equal(authorized.operation, "CREATED");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].read, false);
  assert.equal(entries[0].dedupeKey, "world-operation:operation-1");

  entries[0].read = true;
  operations.set("operation-1", makeOperation({ status: "IN_PROGRESS", currentStep: "EXECUTE", revision: 5 }));
  const inProgress = emitWorld(runtime, "IN_PROGRESS", 5);
  assert.equal(inProgress.operation, "UPDATED_EXISTING");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].read, true, "status-only progress update must not reopen unread state");

  operations.set("operation-1", makeOperation({ status: "COMPLETED", currentStep: "COMPLETE", revision: 6 }));
  const completed = emitWorld(runtime, "COMPLETED", 6);
  assert.equal(completed.operation, "UPDATED_EXISTING");
  assert.equal(entries.length, 1);
  assert.equal(entries[0].read, false, "terminal result must return the card to unread");
});

test("retry and compensation continue updating the same operation card", () => {
  const { runtime, entries, operations } = makeRuntime();

  operations.set("operation-1", makeOperation({ status: "RECOVERY_REQUIRED", revision: 8 }));
  emitWorld(runtime, "RECOVERY_REQUIRED", 8);
  assert.equal(entries.length, 1);
  entries[0].read = true;

  operations.set("operation-1", makeOperation({ status: "VALIDATING", revision: 9 }));
  const validation = emitWorld(runtime, "VALIDATING", 9);
  assert.equal(validation.operation, "SUPPRESSED_BY_POLICY");
  assert.equal(entries.length, 1);

  operations.set("operation-1", makeOperation({ status: "IN_PROGRESS", revision: 10 }));
  emitWorld(runtime, "IN_PROGRESS", 10);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].read, true);

  operations.set("operation-1", makeOperation({ status: "COMPENSATION_REQUIRED", revision: 11 }));
  emitWorld(runtime, "COMPENSATION_REQUIRED", 11);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].read, false);
});

test("standalone Service notifications remain independent", () => {
  const { runtime, entries } = makeRuntime();
  const result = runtime.window.TerminalNotifications.emit({
    eventCode: "SERVICE.ORDER.SCHEDULED",
    citizenId: "citizen-a",
    providerId: "clinic-provider",
    subjectRef: { type: "SERVICE_ORDER", id: "standalone-service" },
    correlationId: "standalone-service",
    revision: 1,
    data: { serviceOrderId: "standalone-service", status: "SCHEDULED" }
  });
  assert.equal(result.ok, true);
  assert.equal(result.operation, "CREATED");
  assert.equal(entries.length, 1);
});

test("projection policy exceptions fall back to normal emission", () => {
  const { runtime, entries } = makeRuntime();
  runtime.window.WS_APP.resolveNotificationProjectionPolicy = () => {
    throw new Error("forced projection policy failure");
  };
  const result = runtime.window.TerminalNotifications.emit({
    eventCode: "SERVICE.ORDER.SCHEDULED",
    citizenId: "citizen-a",
    providerId: "clinic-provider",
    subjectRef: { type: "SERVICE_ORDER", id: "standalone-service" },
    correlationId: "standalone-service",
    revision: 1,
    data: { serviceOrderId: "standalone-service", status: "SCHEDULED" }
  });
  assert.equal(result.ok, true);
  assert.equal(result.operation, "CREATED");
  assert.equal(entries.length, 1);
});
