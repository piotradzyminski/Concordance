"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

const ACTIVE_EVENT_CODES = [
  "WORLD_OPERATION.STATUS_CHANGED",
  "SERVICE.ORDER.SCHEDULED",
  "SERVICE.ORDER.COMPLETED",
  "SERVICE.ORDER.FAILED",
  "SERVICE.ORDER.CANCELLED",
  "SUBSCRIPTION.CONTRACT.CREATED",
  "SUBSCRIPTION.ENTITLEMENT.CHANGED",
  "SUBSCRIPTION.CONTRACT.CANCELLED",
  "SUBSCRIPTION.BILLING.FAILED",
  "SUBSCRIPTION.CONTRACT.SUSPENDED",
  "SUBSCRIPTION.CONTRACT.RESTORED",
  "BILLING.PAYMENT.AUTHORIZED",
  "BILLING.PAYMENT.CAPTURED",
  "BILLING.PAYMENT.FAILED",
  "BILLING.PAYMENT.REFUNDED",
  "BILLING.PAYMENT_RECOVERY_REQUIRED"
];

function makeRuntime(overrides = {}) {
  const forbidden = () => { throw new Error("FORBIDDEN_HEAVY_PROJECTION_CALLED"); };
  const runtime = createBrowserRuntime({
    wsApp: {
      formatCredits: (value) => `${Number(value).toLocaleString("en-US")} ₡`,
      formatDateDisplay: (value) => `DATE:${String(value).slice(0, 10)}`,
      getCitizenById: () => ({ id: "citizen-a", legalName: "Alex Mercer" }),
      getCitizenDisplayName: (citizen) => citizen.legalName,
      getItemInstanceById: (id) => id === "item-1"
        ? { instanceId: id, definitionId: "cyber-eye", playerLabel: "Night Glass" }
        : null,
      getEquipmentCatalogItemById: (id) => id === "cyber-eye" ? { id, name: "Kagami WatchEye K3" } : null,
      getOrganizationByProviderId: (id) => ({ id: `org-${id}`, providerId: id, name: id === "clinic-provider" ? "CoreMed Clinical Services" : "Habitat Market" }),
      getOrganizationById: (id) => ({ id, name: "CoreMed Clinical Services" }),
      getServiceOrder: (id) => id === "service-order-1" ? {
        serviceOrderId: id,
        serviceDefinitionId: "service-install",
        providerId: "clinic-provider",
        citizenId: "citizen-a",
        status: "COMPLETED",
        paymentStatus: "CAPTURED",
        scheduledStartAt: "2109-02-14T10:00:00.000Z",
        completedAt: "2109-02-14T11:00:00.000Z",
        result: { resultCode: "SUCCESS" },
        subjectRefs: { instanceIds: ["item-1"] }
      } : null,
      getServiceDefinition: (id) => id === "service-install" ? { serviceDefinitionId: id, displayName: "Cyberware Installation", serviceType: "CYBERWARE_INSTALL" } : null,
      getMarketOrder: (id) => id === "market-order-1" ? {
        marketOrderId: id,
        vendorProviderId: "market-provider",
        status: "COMPLETED",
        paymentStatus: "CAPTURED",
        totals: { finalTotal: 4800 },
        createdItemInstanceIds: ["item-1"],
        lines: [{ createdItemInstanceIds: ["item-1"] }]
      } : null,
      getBillingIntent: (id) => id === "billing-intent-1" ? {
        billingIntentId: id,
        amount: 4800,
        status: "CAPTURED",
        paymentSource: "CREDITS",
        sourceDomain: "SERVICE",
        sourceRefId: "service-order-1",
        providerId: "clinic-provider"
      } : null,
      getBillingTransaction: (id) => id === "billing-tx-1" ? {
        billingTransactionId: id,
        billingIntentId: "billing-intent-1",
        amount: 4800,
        status: "CAPTURED",
        paymentSource: "CREDITS",
        sourceDomain: "SERVICE",
        sourceRefId: "service-order-1",
        providerId: "clinic-provider"
      } : null,
      getSubscriptionContract: (id) => id === "subscription-contract-1" ? {
        subscriptionContractId: id,
        subscriptionCatalogId: "trauma",
        tierId: "T3",
        providerId: "clinic-provider",
        organizationId: "org-clinic-provider",
        contractStatus: "SUSPENDED",
        billingStatus: "FAILED",
        entitlementStatus: "SUSPENDED",
        coverageTarget: { type: "ITEM_INSTANCE", id: "item-1" },
        displaySnapshot: { title: "TRAUMA Team" }
      } : null,
      getSubscriptionCatalogEntry: (id) => id === "trauma" ? { subscriptionCatalogId: id, title: "TRAUMA Team" } : null,
      getSubscriptionCatalogItemById: (id) => id === "trauma" ? { subscriptionCatalogId: id, title: "TRAUMA Team" } : null,
      getSubscriptionTierById: (catalogId, tierId) => catalogId === "trauma" && tierId === "T3" ? { tierId, title: "Prevail" } : null,
      getWorldBridgeOperation: (id) => id === "world-operation-1" ? {
        operationId: id,
        operationType: "PURCHASE_AND_INSTALL",
        status: "COMPLETED",
        currentStep: "COMPLETE",
        refs: {
          marketOrderId: "market-order-1",
          serviceOrderId: "service-order-1",
          billingIntentId: "billing-intent-1",
          billingTransactionId: "billing-tx-1",
          itemTransactionId: "item-transaction-1",
          instanceIds: ["item-1"]
        },
        recovery: { required: false },
        compensation: { status: "NOT_REQUIRED" }
      } : null,
      getEquipmentState: forbidden,
      buildEquipmentState: forbidden,
      getCyberGridState: forbidden,
      buildCyberGridState: forbidden,
      buildCyberwareRuntime: forbidden,
      buildCyberwarePlan: forbidden,
      ...overrides
    }
  });
  runtime.load("data/notification-content-templates.js");
  runtime.load("js/notification-content-resolver.js");
  return runtime;
}

function flattenContent(content) {
  return JSON.stringify({
    title: content.title,
    lead: content.lead,
    panels: content.panels,
    finalRows: content.finalRows
  });
}

test("all active producer events have canonical content templates", () => {
  const runtime = makeRuntime();
  const validation = runtime.window.WS_APP.validateNotificationContentProjection({ eventCodes: ACTIVE_EVENT_CODES });
  assert.equal(validation.ok, true);
  assert.equal(validation.missingTemplates.length, 0);
  assert.equal(validation.invalidTemplates.length, 0);
});

test("World Bridge content resolves player labels and hides technical identifiers", () => {
  const runtime = makeRuntime();
  const content = runtime.window.WS_APP.resolveNotificationContent({
    eventCode: "WORLD_OPERATION.STATUS_CHANGED",
    citizenId: "citizen-a",
    correlationId: "world-operation-1",
    subjectRef: { type: "ITEM_INSTANCE", id: "item-1" },
    relatedRefs: [
      { type: "WORLD_OPERATION", id: "world-operation-1" },
      { type: "SERVICE_ORDER", id: "service-order-1" },
      { type: "MARKET_ORDER", id: "market-order-1" },
      { type: "BILLING_TRANSACTION", id: "billing-tx-1" }
    ],
    source: { providerId: "clinic-provider", label: "clinic-provider" },
    templateData: {
      operationId: "world-operation-1",
      operationType: "PURCHASE_AND_INSTALL",
      status: "COMPLETED",
      serviceOrderId: "service-order-1",
      marketOrderId: "market-order-1",
      billingIntentId: "billing-intent-1",
      billingTransactionId: "billing-tx-1",
      instanceIds: ["item-1"]
    }
  });

  assert.equal(content.ok, true);
  assert.equal(content.resolved, true);
  const visible = flattenContent(content);
  assert.match(visible, /Night Glass/);
  assert.match(visible, /CoreMed Clinical Services/);
  assert.match(visible, /4,800 ₡/);
  assert.doesNotMatch(visible, /world-operation-1|service-order-1|market-order-1|billing-tx-1|item-transaction-1/);
  assert.doesNotMatch(visible, /PURCHASE_AND_INSTALL|COMMITTING|CAPTURING/);
});

test("Subscription content converts raw states and reasons into player-facing content", () => {
  const runtime = makeRuntime();
  const content = runtime.window.WS_APP.resolveNotificationContent({
    eventCode: "SUBSCRIPTION.BILLING.FAILED",
    citizenId: "citizen-a",
    providerId: "clinic-provider",
    subjectRef: { type: "SUBSCRIPTION_CONTRACT", id: "subscription-contract-1" },
    source: { providerId: "clinic-provider", label: "clinic-provider" },
    templateData: {
      subscriptionContractId: "subscription-contract-1",
      providerId: "clinic-provider",
      contractStatus: "SUSPENDED",
      billingStatus: "FAILED",
      entitlementStatus: "SUSPENDED",
      reasonCode: "SUBSCRIPTION_BILLING_FAILED",
      coverageTarget: { type: "ITEM_INSTANCE", id: "item-1" }
    }
  });

  const visible = flattenContent(content);
  assert.match(visible, /TRAUMA Team/);
  assert.match(visible, /Prevail/);
  assert.match(visible, /Night Glass/);
  assert.match(visible, /could not be completed|could not be charged/i);
  assert.doesNotMatch(visible, /SUBSCRIPTION_BILLING_FAILED|subscription-contract-1/);
});

test("missing domain references produce controlled fallbacks without raw ids", () => {
  const runtime = makeRuntime({ getServiceOrder: () => null, getItemInstanceById: () => null });
  const content = runtime.window.WS_APP.resolveNotificationContent({
    eventCode: "SERVICE.ORDER.FAILED",
    citizenId: "citizen-a",
    providerId: "clinic-provider",
    subjectRef: { type: "SERVICE_ORDER", id: "service-order-missing" },
    relatedRefs: [{ type: "ITEM_INSTANCE", id: "item-missing" }],
    source: { providerId: "clinic-provider", label: "clinic-provider" },
    templateData: {
      serviceOrderId: "service-order-missing",
      serviceType: "CYBERWARE_REPAIR",
      status: "FAILED",
      resultCode: "ITEM_INSTANCE_NOT_FOUND",
      subjectInstanceIds: ["item-missing"]
    }
  });

  const visible = flattenContent(content);
  assert.match(visible, /Referenced item unavailable|Service procedure/);
  assert.match(visible, /referenced item is no longer available/i);
  assert.doesNotMatch(visible, /service-order-missing|item-missing|ITEM_INSTANCE_NOT_FOUND|CYBERWARE_REPAIR/);
});

test("Notification API applies projection only when structured panels are not explicit", () => {
  const captured = [];
  const registryEvent = {
    eventCode: "SERVICE.ORDER.COMPLETED",
    label: "Service order completed",
    domain: "SERVICE",
    category: "ORDER",
    legacyType: "SERVICE",
    legacySubtype: "SERVICE_COMPLETED",
    defaultSeverity: "INFO",
    defaultAttention: "INBOX",
    defaultAudience: ["PLAYER"],
    subjectTypes: ["SERVICE_ORDER"],
    requiredData: [],
    providerRequired: true,
    templateId: "service-order-status",
    actions: [],
    retentionPolicy: {},
    aggregationPolicy: { mode: "REPLACE_EXISTING", keyFields: ["citizenId", "eventCode", "subjectRef.id"] }
  };
  const legacyEvent = {
    ...registryEvent,
    eventCode: "SYSTEM_NOTICE",
    domain: "SYSTEM",
    category: "SYSTEM",
    legacyType: "SYSTEM",
    legacySubtype: "SYSTEM_NOTICE",
    subjectTypes: [],
    providerRequired: false,
    aggregationPolicy: { mode: "CREATE_ALWAYS" }
  };
  const runtime = makeRuntime({
    notificationRegistry: {
      normalizeEventCode: (value) => String(value || "").trim().toUpperCase(),
      getEvent: (code) => code === registryEvent.eventCode ? structuredClone(registryEvent) : code === legacyEvent.eventCode ? structuredClone(legacyEvent) : null,
      normalizeAudience: (value) => Array.isArray(value) ? value : [value || "PLAYER"],
      resolveProvider: (providerId) => providerId === "clinic-provider" ? {
        providerId,
        requestedProviderId: providerId,
        manifest: { providerId, sourceKind: "ORGANIZATION", supportedEvents: [registryEvent.eventCode], eventOverrides: {} },
        organization: { id: "org-clinic", name: "CoreMed Clinical Services" }
      } : null,
      providerSupportsEvent: () => true,
      pushDiagnostic() {}
    },
    addTerminalEntry: (citizenId, entry) => {
      const created = { ...structuredClone(entry), id: `entry-${captured.length + 1}`, citizenId };
      captured.push(created);
      return created;
    },
    upsertTerminalEntry: (citizenId, entry) => {
      const created = { ...structuredClone(entry), id: `entry-${captured.length + 1}`, citizenId };
      captured.push(created);
      return { ok: true, operation: "CREATED", notificationId: created.id, entry: created };
    }
  });
  runtime.load("js/notification-api.js");

  const projected = runtime.window.TerminalNotifications.emit({
    eventCode: "SERVICE.ORDER.COMPLETED",
    citizenId: "citizen-a",
    providerId: "clinic-provider",
    subjectRef: { type: "SERVICE_ORDER", id: "service-order-1" },
    title: "RAW TITLE",
    summary: "RAW_ENUM_SUCCESS",
    data: { serviceOrderId: "service-order-1", status: "COMPLETED", subjectInstanceIds: ["item-1"] }
  });
  assert.equal(projected.ok, true);
  assert.notEqual(captured[0].title, "RAW TITLE");
  assert.match(JSON.stringify(captured[0].panels), /Night Glass/);

  const customPanels = [{ title: "CUSTOM", rows: [{ label: "Value", value: "Preserve me" }] }];
  const legacy = runtime.window.TerminalNotifications.emitLegacy({
    citizenId: "citizen-a",
    type: "SYSTEM",
    subtype: "SYSTEM_NOTICE",
    title: "Legacy structured",
    panels: customPanels
  });
  assert.equal(legacy.ok, true);
  assert.deepEqual(captured[1].panels, customPanels);
});
