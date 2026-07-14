window.WS_APP = window.WS_APP || {};

(function initNotificationProjectionPolicy() {
  const app = window.WS_APP;
  const diagnostics = [];
  const WORLD_EVENT_CODE = "WORLD_OPERATION.STATUS_CHANGED";
  const CHILD_EVENT_PREFIXES = ["SERVICE.ORDER.", "BILLING.PAYMENT", "MARKET.ORDER."];
  const HIDDEN_WORLD_STATUSES = new Set(["DRAFT", "VALIDATING", "RESERVING"]);
  const UNREAD_WORLD_STATUSES = new Set([
    "AUTHORIZED",
    "SCHEDULED",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "RECOVERY_REQUIRED",
    "PAYMENT_RECOVERY_REQUIRED",
    "COMPENSATION_REQUIRED"
  ]);
  const QUIET_WORLD_STATUSES = new Set(["IN_PROGRESS", "COMMITTING", "CAPTURING"]);
  const REFERENCE_FIELD_BY_TYPE = {
    MARKET_ORDER: "marketOrderId",
    SERVICE_ORDER: "serviceOrderId",
    BILLING_INTENT: "billingIntentId",
    BILLING_TRANSACTION: "billingTransactionId",
    ITEM_TRANSACTION: "itemTransactionId",
    ITEM_INSTANCE: "instanceId",
    HOUSING_RESERVATION: "housingReservationId",
    MARKET_STOCK_RESERVATION: "marketStockReservationId"
  };

  function clone(value) {
    if (value === undefined) return undefined;
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function normalizeToken(value = "", fallback = "") {
    const normalized = String(value || fallback)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return normalized || fallback;
  }

  function pushDiagnostic(level, code, detail = {}) {
    const record = {
      level: normalizeToken(level, "WARNING"),
      code: normalizeToken(code, "NOTIFICATION_PROJECTION_POLICY_WARNING"),
      detail: clone(detail),
      at: new Date().toISOString()
    };
    diagnostics.push(record);
    if (diagnostics.length > 250) diagnostics.splice(0, diagnostics.length - 250);
    return record;
  }

  function normalizeReference(reference = {}) {
    if (!reference || typeof reference !== "object" || Array.isArray(reference)) return null;
    const type = normalizeToken(reference.type, "");
    const id = normalizeId(reference.id || reference.entityId);
    return type && id ? { type, id } : null;
  }

  function chooseOperation(records = [], citizenId = "") {
    const normalizedCitizenId = normalizeId(citizenId);
    return (Array.isArray(records) ? records : [])
      .filter(Boolean)
      .filter((record) => !normalizedCitizenId || normalizeId(record.citizenId) === normalizedCitizenId)
      .sort((left, right) => {
        const revisionDelta = Number(right?.revision || 0) - Number(left?.revision || 0);
        if (revisionDelta) return revisionDelta;
        return String(right?.updatedAt || right?.createdAt || "").localeCompare(String(left?.updatedAt || left?.createdAt || ""));
      })[0] || null;
  }

  function getOperationById(operationId = "", citizenId = "") {
    const id = normalizeId(operationId);
    if (!id || typeof app.getWorldBridgeOperation !== "function") return null;
    const operation = app.getWorldBridgeOperation(id);
    if (!operation) return null;
    const normalizedCitizenId = normalizeId(citizenId);
    if (normalizedCitizenId && normalizeId(operation.citizenId) !== normalizedCitizenId) return null;
    return operation;
  }

  function getOperationByReference(referenceType = "", referenceId = "", citizenId = "") {
    const field = REFERENCE_FIELD_BY_TYPE[normalizeToken(referenceType)];
    const id = normalizeId(referenceId);
    if (!field || !id || typeof app.getWorldBridgeOperationsByReference !== "function") return null;
    return chooseOperation(app.getWorldBridgeOperationsByReference(field, id), citizenId);
  }

  function getOperationFromServiceOrder(serviceOrderId = "", citizenId = "") {
    const id = normalizeId(serviceOrderId);
    if (!id) return null;
    const byReference = getOperationByReference("SERVICE_ORDER", id, citizenId);
    if (byReference) return byReference;
    const order = typeof app.getServiceOrder === "function" ? app.getServiceOrder(id) : null;
    const metadataOperationId = normalizeId(order?.metadata?.operationId || order?.metadata?.worldOperationId);
    return getOperationById(metadataOperationId, citizenId || order?.citizenId);
  }

  function getOperationFromBillingRecord(reference = {}, citizenId = "") {
    const normalized = normalizeReference(reference);
    if (!normalized || !["BILLING_INTENT", "BILLING_TRANSACTION"].includes(normalized.type)) return null;
    const getter = normalized.type === "BILLING_INTENT" ? app.getBillingIntent : app.getBillingTransaction;
    const record = typeof getter === "function" ? getter(normalized.id) : null;
    if (!record) return getOperationByReference(normalized.type, normalized.id, citizenId);

    const direct = getOperationById(record.correlationId, citizenId || record.citizenId)
      || getOperationByReference(normalized.type, normalized.id, citizenId || record.citizenId);
    if (direct) return direct;

    const sourceDomain = normalizeToken(record.sourceDomain);
    const sourceRefId = normalizeId(record.sourceRefId);
    if (sourceDomain === "SERVICE") return getOperationFromServiceOrder(sourceRefId, citizenId || record.citizenId);
    if (sourceDomain === "MARKET") return getOperationByReference("MARKET_ORDER", sourceRefId, citizenId || record.citizenId);
    if (sourceDomain === "WORLD_BRIDGE") return getOperationById(sourceRefId, citizenId || record.citizenId);
    return null;
  }

  function collectReferences(input = {}) {
    const references = [];
    const add = (reference) => {
      const normalized = normalizeReference(reference);
      if (!normalized) return;
      if (!references.some((entry) => entry.type === normalized.type && entry.id === normalized.id)) references.push(normalized);
    };
    add(input.subjectRef);
    (Array.isArray(input.relatedRefs) ? input.relatedRefs : []).forEach(add);

    const data = input.templateData && typeof input.templateData === "object"
      ? input.templateData
      : (input.data && typeof input.data === "object" ? input.data : {});
    [
      ["WORLD_OPERATION", data.operationId || data.worldOperationId],
      ["MARKET_ORDER", data.marketOrderId],
      ["SERVICE_ORDER", data.serviceOrderId],
      ["BILLING_INTENT", data.billingIntentId],
      ["BILLING_TRANSACTION", data.billingTransactionId],
      ["ITEM_TRANSACTION", data.itemTransactionId]
    ].forEach(([type, id]) => add({ type, id }));
    (Array.isArray(data.instanceIds) ? data.instanceIds : []).forEach((id) => add({ type: "ITEM_INSTANCE", id }));
    (Array.isArray(data.subjectInstanceIds) ? data.subjectInstanceIds : []).forEach((id) => add({ type: "ITEM_INSTANCE", id }));
    return references;
  }

  function resolveParentOperation(input = {}) {
    const citizenId = normalizeId(input.citizenId);
    const data = input.templateData && typeof input.templateData === "object"
      ? input.templateData
      : (input.data && typeof input.data === "object" ? input.data : {});

    const directIds = [
      data.operationId,
      data.worldOperationId,
      input.operationId,
      input.parentOperationId,
      input.correlationId
    ];
    for (const candidate of directIds) {
      const operation = getOperationById(candidate, citizenId);
      if (operation) return operation;
    }

    const references = collectReferences(input);
    for (const reference of references) {
      if (reference.type === "WORLD_OPERATION") {
        const operation = getOperationById(reference.id, citizenId);
        if (operation) return operation;
      }
      if (reference.type === "SERVICE_ORDER") {
        const operation = getOperationFromServiceOrder(reference.id, citizenId);
        if (operation) return operation;
      }
      if (["BILLING_INTENT", "BILLING_TRANSACTION"].includes(reference.type)) {
        const operation = getOperationFromBillingRecord(reference, citizenId);
        if (operation) return operation;
      }
      const operation = getOperationByReference(reference.type, reference.id, citizenId);
      if (operation) return operation;
    }

    if (normalizeToken(data.sourceDomain) === "SERVICE" && data.sourceRefId) {
      return getOperationFromServiceOrder(data.sourceRefId, citizenId);
    }
    return null;
  }

  function isChildEvent(eventCode = "") {
    const code = String(eventCode || "").trim().toUpperCase();
    return CHILD_EVENT_PREFIXES.some((prefix) => code.startsWith(prefix));
  }

  function resolveWorldOperationPolicy(input = {}) {
    const data = input.templateData && typeof input.templateData === "object"
      ? input.templateData
      : (input.data && typeof input.data === "object" ? input.data : {});
    const operation = resolveParentOperation(input);
    const operationId = normalizeId(operation?.operationId || data.operationId || input.correlationId);
    const status = normalizeToken(data.status || operation?.status, "DRAFT");

    if (!operationId) {
      return {
        ok: true,
        decision: "EMIT",
        reason: "WORLD_OPERATION_ID_UNRESOLVED",
        markUnreadOnUpdate: input.markUnreadOnUpdate !== false
      };
    }
    if (HIDDEN_WORLD_STATUSES.has(status)) {
      return {
        ok: true,
        decision: "SUPPRESS",
        reason: "WORLD_OPERATION_PRE_INBOX_STATUS",
        parentOperationId: operationId,
        status
      };
    }

    return {
      ok: true,
      decision: "EMIT",
      reason: "WORLD_OPERATION_PRIMARY_CARD",
      parentOperationId: operationId,
      correlationId: operationId,
      dedupeKey: `world-operation:${operationId}`,
      markUnreadOnUpdate: UNREAD_WORLD_STATUSES.has(status),
      quietUpdate: QUIET_WORLD_STATUSES.has(status),
      status
    };
  }

  function resolveNotificationProjectionPolicy(input = {}) {
    const eventCode = String(input.eventCode || "").trim().toUpperCase();
    if (!eventCode || input.__legacy === true || input.__skipProjectionPolicy === true) {
      return { ok: true, decision: "EMIT", reason: "POLICY_NOT_APPLICABLE" };
    }

    if (eventCode === WORLD_EVENT_CODE) return resolveWorldOperationPolicy(input);

    if (isChildEvent(eventCode)) {
      const operation = resolveParentOperation(input);
      if (operation?.operationId) {
        return {
          ok: true,
          decision: "PROJECT_TO_PARENT",
          reason: "CHILD_EVENT_OWNED_BY_WORLD_OPERATION",
          parentOperationId: normalizeId(operation.operationId),
          parentStatus: normalizeToken(operation.status),
          childEventCode: eventCode
        };
      }
    }

    return { ok: true, decision: "EMIT", reason: "STANDALONE_NOTIFICATION" };
  }

  function validateNotificationProjectionPolicy() {
    const errors = [];
    if (typeof app.getWorldBridgeOperation !== "function") errors.push({ code: "WORLD_BRIDGE_OPERATION_GETTER_MISSING" });
    if (typeof app.getWorldBridgeOperationsByReference !== "function") errors.push({ code: "WORLD_BRIDGE_REFERENCE_LOOKUP_MISSING" });
    return {
      ready: errors.length === 0,
      version: "2.3x",
      worldEventCode: WORLD_EVENT_CODE,
      hiddenWorldStatuses: [...HIDDEN_WORLD_STATUSES],
      unreadWorldStatuses: [...UNREAD_WORLD_STATUSES],
      quietWorldStatuses: [...QUIET_WORLD_STATUSES],
      errors
    };
  }

  app.resolveNotificationProjectionPolicy = resolveNotificationProjectionPolicy;
  app.resolveNotificationParentOperation = resolveParentOperation;
  app.validateNotificationProjectionPolicy = validateNotificationProjectionPolicy;
  app.getNotificationProjectionPolicyDiagnostics = () => clone(diagnostics);
  app.pushNotificationProjectionPolicyDiagnostic = pushDiagnostic;
})();
