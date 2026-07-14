window.WS_APP = window.WS_APP || {};

(function initWorldBridgeNotificationProducer() {
  const app = window.WS_APP;
  const EVENT_CODE = "WORLD_OPERATION.STATUS_CHANGED";
  const GENERIC_EVENT = "ws:world-bridge-operation-updated";
  const CYBERWARE_EVENT = "ws:cyberware-world-operation-updated";
  const diagnostics = [];

  const SUPPORTED_OPERATION_TYPES = new Set([
    "PURCHASE_TO_HOUSING",
    "PURCHASE_AND_INSTALL",
    "INSTALL",
    "DEINSTALL",
    "REPLACE",
    "MAINTENANCE",
    "REPAIR",
    "CALIBRATION",
    "FIRMWARE_UPDATE",
    "LICENSE_REVIEW"
  ]);

  const OPERATION_LABELS = {
    PURCHASE_TO_HOUSING: "Cyberware purchase",
    PURCHASE_AND_INSTALL: "Cyberware purchase and installation",
    INSTALL: "Cyberware installation",
    DEINSTALL: "Cyberware removal",
    REPLACE: "Cyberware replacement",
    MAINTENANCE: "Cyberware maintenance",
    REPAIR: "Cyberware repair",
    CALIBRATION: "Cyberware calibration",
    FIRMWARE_UPDATE: "Firmware update",
    LICENSE_REVIEW: "Cyberware license review"
  };

  const FINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
  const RECOVERY_STATUSES = new Set([
    "RECOVERY_REQUIRED",
    "PAYMENT_RECOVERY_REQUIRED",
    "COMPENSATION_REQUIRED"
  ]);

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
    const token = String(value || fallback)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return token || fallback;
  }

  function normalizeStringArray(values = []) {
    return [...new Set((Array.isArray(values) ? values : []).map(normalizeId).filter(Boolean))];
  }

  function pushDiagnostic(level, code, detail = {}) {
    const record = {
      level: normalizeToken(level, "WARNING"),
      code: normalizeToken(code, "WORLD_BRIDGE_NOTIFICATION_WARNING"),
      detail: clone(detail),
      at: new Date().toISOString()
    };
    diagnostics.push(record);
    if (diagnostics.length > 300) diagnostics.splice(0, diagnostics.length - 300);
    return record;
  }

  function getOperationSnapshot(detail = {}) {
    const operationId = normalizeId(detail.operationId);
    const stored = operationId && typeof app.getWorldBridgeOperation === "function"
      ? app.getWorldBridgeOperation(operationId)
      : null;
    const storedRefs = stored?.refs || {};
    const detailRefs = detail.refs && typeof detail.refs === "object" && !Array.isArray(detail.refs)
      ? detail.refs
      : {};
    return {
      ...(stored || {}),
      ...clone(detail),
      operationId,
      operationType: normalizeToken(detail.operationType || stored?.operationType, "WORLD_OPERATION"),
      citizenId: normalizeId(detail.citizenId || stored?.citizenId),
      providerId: normalizeId(detail.providerId || stored?.providerId),
      status: normalizeToken(detail.status || stored?.status, "DRAFT"),
      previousStatus: normalizeToken(detail.previousStatus || ""),
      currentStep: normalizeToken(detail.currentStep || stored?.currentStep, "DRAFT"),
      previousStep: normalizeToken(detail.previousStep || ""),
      revision: Math.max(1, Number(detail.revision || stored?.revision || 1) || 1),
      storeRevision: Math.max(0, Number(detail.storeRevision || 0) || 0),
      recoveryRequired: detail.recoveryRequired === true || stored?.recovery?.required === true,
      compensationStatus: normalizeToken(detail.compensationStatus || stored?.compensation?.status || "NOT_REQUIRED"),
      refs: {
        marketOrderId: normalizeId(detail.marketOrderId || detailRefs.marketOrderId || storedRefs.marketOrderId),
        serviceOrderId: normalizeId(detail.serviceOrderId || detailRefs.serviceOrderId || storedRefs.serviceOrderId),
        billingIntentId: normalizeId(detail.billingIntentId || detailRefs.billingIntentId || storedRefs.billingIntentId),
        billingTransactionId: normalizeId(detail.billingTransactionId || detailRefs.billingTransactionId || storedRefs.billingTransactionId),
        itemTransactionId: normalizeId(detail.itemTransactionId || detailRefs.itemTransactionId || storedRefs.itemTransactionId),
        instanceIds: normalizeStringArray([
          ...(detail.instanceIds || []),
          ...(detailRefs.instanceIds || []),
          ...(storedRefs.instanceIds || [])
        ]),
        housingReservationIds: normalizeStringArray([
          ...(detail.reservationIds || detail.housingReservationIds || []),
          ...(detailRefs.housingReservationIds || []),
          ...(storedRefs.housingReservationIds || [])
        ])
      },
      changedDomains: normalizeStringArray(detail.changedDomains || []),
      sourceEventId: normalizeId(detail.eventId)
    };
  }

  function isSupportedOperation(operation = {}, eventName = "") {
    if (eventName === CYBERWARE_EVENT) return true;
    const cyberwareBridgePresent = typeof app.quoteCyberwarePurchase === "function"
      || typeof app.startCyberwarePurchase === "function"
      || typeof app.quoteCyberwareService === "function"
      || typeof app.startCyberwareService === "function";
    if (cyberwareBridgePresent) return false;
    return SUPPORTED_OPERATION_TYPES.has(normalizeToken(operation.operationType));
  }

  function getRequiredServiceCapability(operationType = "") {
    const normalized = normalizeToken(operationType);
    if (normalized === "INSTALL" || normalized === "PURCHASE_AND_INSTALL") return "CYBERWARE_INSTALL";
    if (normalized === "DEINSTALL") return "CYBERWARE_DEINSTALL";
    if (normalized === "REPLACE") return "CYBERWARE_REPLACE";
    if (normalized === "REPAIR" || normalized === "MAINTENANCE") return "CYBERWARE_REPAIR";
    if (normalized === "CALIBRATION") return "CYBERWARE_CALIBRATE";
    if (normalized === "FIRMWARE_UPDATE") return "FIRMWARE_UPDATE";
    if (normalized === "LICENSE_REVIEW") return "LICENSE_REVIEW";
    return "";
  }

  function validateLinkedProvider(operation = {}) {
    const result = {
      valid: true,
      providerId: normalizeId(operation.providerId),
      notificationProviderId: "system-runtime",
      serviceProviderId: "",
      vendorProviderId: "",
      requiredCapability: "",
      issues: []
    };

    const serviceOrder = operation.refs.serviceOrderId && typeof app.getServiceOrder === "function"
      ? app.getServiceOrder(operation.refs.serviceOrderId)
      : null;
    const marketOrder = operation.refs.marketOrderId && typeof app.getMarketOrder === "function"
      ? app.getMarketOrder(operation.refs.marketOrderId)
      : null;

    result.serviceProviderId = normalizeId(serviceOrder?.providerId);
    result.vendorProviderId = normalizeId(marketOrder?.vendorProviderId);
    result.providerId = result.providerId || result.serviceProviderId || result.vendorProviderId;
    result.requiredCapability = getRequiredServiceCapability(operation.operationType);

    if (operation.refs.serviceOrderId && !serviceOrder) {
      result.issues.push("SERVICE_ORDER_NOT_FOUND");
    }
    if (serviceOrder) {
      const serviceDefinition = typeof app.getServiceDefinition === "function"
        ? app.getServiceDefinition(serviceOrder.serviceDefinitionId)
        : null;
      const requiredCapabilities = normalizeStringArray(
        serviceDefinition?.requiredCapabilities?.length
          ? serviceDefinition.requiredCapabilities
          : (result.requiredCapability ? [result.requiredCapability] : [])
      ).map(normalizeToken);
      result.requiredCapability = requiredCapabilities.join(",");
      if (requiredCapabilities.some((capability) => typeof app.providerSupports !== "function" || app.providerSupports(serviceOrder.providerId, capability) !== true)) {
        result.issues.push("SERVICE_PROVIDER_CAPABILITY_MISSING");
      }
    }
    if (operation.refs.marketOrderId && !marketOrder) {
      result.issues.push("MARKET_ORDER_NOT_FOUND");
    }
    if (result.vendorProviderId && !app.notificationRegistry?.resolveProvider?.(result.vendorProviderId)) {
      result.issues.push("MARKET_VENDOR_NOTIFICATION_PROVIDER_UNKNOWN");
    }

    const eventDefinition = app.notificationRegistry?.getEvent?.(EVENT_CODE) || null;
    const notificationResolution = result.providerId
      ? app.notificationRegistry?.resolveProvider?.(result.providerId)
      : null;
    if (notificationResolution && app.notificationRegistry?.providerSupportsEvent?.(notificationResolution, eventDefinition)) {
      result.notificationProviderId = result.providerId;
    } else if (result.providerId) {
      result.issues.push("NOTIFICATION_PROVIDER_CAPABILITY_MISSING");
    }

    result.valid = result.issues.length === 0;
    if (!result.valid) {
      pushDiagnostic("WARNING", "WORLD_BRIDGE_NOTIFICATION_PROVIDER_VALIDATION_FAILED", {
        operationId: operation.operationId,
        operationType: operation.operationType,
        providerId: result.providerId,
        serviceProviderId: result.serviceProviderId,
        vendorProviderId: result.vendorProviderId,
        requiredCapability: result.requiredCapability,
        issues: [...result.issues]
      });
    }
    return result;
  }

  function getPresentation(operation = {}) {
    const status = normalizeToken(operation.status, "DRAFT");
    const recoveryRequired = operation.recoveryRequired === true || RECOVERY_STATUSES.has(status);
    if (status === "COMPLETED") return { severity: "INFO", attention: "INBOX", statusLabel: "Completed" };
    if (status === "FAILED") return { severity: "WARNING", attention: "BANNER", statusLabel: "Failed" };
    if (status === "CANCELLED") return { severity: "NOTICE", attention: "INBOX", statusLabel: "Cancelled" };
    if (status === "PAYMENT_RECOVERY_REQUIRED") return { severity: "CRITICAL", attention: "BLOCKING", statusLabel: "Payment recovery required" };
    if (status === "COMPENSATION_REQUIRED") return { severity: "CRITICAL", attention: "BLOCKING", statusLabel: "Compensation required" };
    if (recoveryRequired || status === "RECOVERY_REQUIRED") return { severity: "WARNING", attention: "BANNER", statusLabel: "Recovery required" };
    if (status === "SCHEDULED") return { severity: "NOTICE", attention: "INBOX", statusLabel: "Scheduled" };
    if (["IN_PROGRESS", "COMMITTING", "CAPTURING"].includes(status)) return { severity: "NOTICE", attention: "BADGE", statusLabel: "In progress" };
    if (status === "AUTHORIZED") return { severity: "NOTICE", attention: "BADGE", statusLabel: "Authorized" };
    return { severity: "INFO", attention: "BADGE", statusLabel: status.replace(/_/g, " ").toLowerCase() };
  }

  function getOperationTitle(operation = {}, presentation = {}) {
    const label = OPERATION_LABELS[operation.operationType]
      || operation.operationType.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    return `${label}: ${presentation.statusLabel}`;
  }

  function getOperationSummary(operation = {}, presentation = {}) {
    const fragments = [presentation.statusLabel];
    if (operation.currentStep) fragments.push(`step ${operation.currentStep}`);
    if (operation.refs.serviceOrderId) fragments.push(`service ${operation.refs.serviceOrderId}`);
    if (operation.refs.marketOrderId) fragments.push(`order ${operation.refs.marketOrderId}`);
    if (operation.refs.instanceIds.length) fragments.push(`${operation.refs.instanceIds.length} item${operation.refs.instanceIds.length === 1 ? "" : "s"}`);
    return `${OPERATION_LABELS[operation.operationType] || "World operation"}: ${fragments.join(" · ")}.`;
  }

  function getCyberwareView(operationType = "") {
    const type = normalizeToken(operationType);
    if (["MAINTENANCE", "REPAIR", "CALIBRATION", "FIRMWARE_UPDATE", "LICENSE_REVIEW"].includes(type)) return "MAINTENANCE";
    if (["INSTALL", "DEINSTALL", "REPLACE", "PURCHASE_AND_INSTALL"].includes(type)) return "HISTORY";
    return "OVERVIEW";
  }

  function buildActions(operation = {}) {
    const primaryInstanceId = operation.refs.instanceIds[0] || "";
    const actions = [{
      actionId: "OPEN_CYBERWARE_OPERATION",
      label: "OPEN CYBERWARE",
      routeId: "CYBERWARE_WORLD_OPERATION",
      module: "equipment",
      panel: "cyberware-workspace",
      section: getCyberwareView(operation.operationType),
      citizenId: operation.citizenId,
      entityRef: primaryInstanceId
        ? { type: "ITEM_INSTANCE", id: primaryInstanceId }
        : { type: "WORLD_OPERATION", id: operation.operationId },
      params: {
        operationId: operation.operationId,
        operationType: operation.operationType,
        serviceOrderId: operation.refs.serviceOrderId,
        marketOrderId: operation.refs.marketOrderId,
        billingTransactionId: operation.refs.billingTransactionId,
        instanceIds: [...operation.refs.instanceIds],
        cyberwareView: getCyberwareView(operation.operationType)
      }
    }];

    if (operation.refs.serviceOrderId) {
      actions.push({
        actionId: "OPEN_SERVICE_ORDER",
        label: "OPEN SERVICE",
        routeId: "SERVICE_ORDER",
        module: "service",
        citizenId: operation.citizenId,
        entityRef: { type: "SERVICE_ORDER", id: operation.refs.serviceOrderId },
        params: { operationId: operation.operationId }
      });
    }
    return actions;
  }

  function buildRelatedRefs(operation = {}, subjectRef = null) {
    const refs = [];
    const add = (type, id) => {
      const normalizedId = normalizeId(id);
      if (!normalizedId) return;
      if (subjectRef?.type === type && subjectRef?.id === normalizedId) return;
      if (refs.some((entry) => entry.type === type && entry.id === normalizedId)) return;
      refs.push({ type, id: normalizedId });
    };

    add("WORLD_OPERATION", operation.operationId);
    add("MARKET_ORDER", operation.refs.marketOrderId);
    add("SERVICE_ORDER", operation.refs.serviceOrderId);
    add("BILLING_INTENT", operation.refs.billingIntentId);
    add("BILLING_TRANSACTION", operation.refs.billingTransactionId);
    add("ITEM_TRANSACTION", operation.refs.itemTransactionId);
    operation.refs.instanceIds.forEach((instanceId) => add("ITEM_INSTANCE", instanceId));
    return refs;
  }

  function emitWorldBridgeOperationNotification(detail = {}, eventName = GENERIC_EVENT) {
    if (app.__worldBridgeSuppressNotifications === true) {
      return { ok: true, skipped: true, reason: "WORLD_BRIDGE_NOTIFICATION_SUPPRESSED" };
    }
    if (typeof window.TerminalNotifications?.emit !== "function") {
      pushDiagnostic("ERROR", "WORLD_BRIDGE_NOTIFICATION_API_UNAVAILABLE", { eventName, detail });
      return { ok: false, reason: "WORLD_BRIDGE_NOTIFICATION_API_UNAVAILABLE" };
    }

    const operation = getOperationSnapshot(detail);
    if (!operation.operationId || !operation.citizenId) {
      pushDiagnostic("ERROR", "WORLD_BRIDGE_NOTIFICATION_IDENTITY_INCOMPLETE", {
        eventName,
        operationId: operation.operationId,
        citizenId: operation.citizenId
      });
      return { ok: false, reason: "WORLD_BRIDGE_NOTIFICATION_IDENTITY_INCOMPLETE" };
    }
    if (!isSupportedOperation(operation, eventName)) {
      return { ok: true, skipped: true, reason: "WORLD_BRIDGE_NOTIFICATION_OPERATION_NOT_MAPPED" };
    }

    const providerValidation = validateLinkedProvider(operation);
    const presentation = getPresentation(operation);
    const primaryInstanceId = operation.refs.instanceIds[0] || "";
    const subjectRef = primaryInstanceId
      ? { type: "ITEM_INSTANCE", id: primaryInstanceId }
      : { type: "WORLD_OPERATION", id: operation.operationId };
    const actions = buildActions(operation);
    const result = window.TerminalNotifications.emit({
      eventCode: EVENT_CODE,
      eventId: `world-operation:${operation.operationId}`,
      dedupeKey: `world-operation:${operation.operationId}`,
      citizenId: operation.citizenId,
      providerId: providerValidation.notificationProviderId,
      subjectRef,
      relatedRefs: buildRelatedRefs(operation, subjectRef),
      correlationId: operation.operationId,
      revision: operation.revision,
      severity: presentation.severity,
      attention: presentation.attention,
      title: getOperationTitle(operation, presentation),
      summary: getOperationSummary(operation, presentation),
      templateId: "world-bridge-operation-status",
      data: {
        operationId: operation.operationId,
        operationType: operation.operationType,
        status: operation.status,
        previousStatus: operation.previousStatus,
        currentStep: operation.currentStep,
        previousStep: operation.previousStep,
        providerId: providerValidation.providerId,
        notificationProviderId: providerValidation.notificationProviderId,
        providerValidation: clone(providerValidation),
        marketOrderId: operation.refs.marketOrderId,
        serviceOrderId: operation.refs.serviceOrderId,
        billingIntentId: operation.refs.billingIntentId,
        billingTransactionId: operation.refs.billingTransactionId,
        itemTransactionId: operation.refs.itemTransactionId,
        instanceIds: [...operation.refs.instanceIds],
        housingReservationIds: [...operation.refs.housingReservationIds],
        changedDomains: [...operation.changedDomains],
        recoveryRequired: operation.recoveryRequired,
        compensationStatus: operation.compensationStatus,
        sourceEventId: operation.sourceEventId,
        operationRevision: operation.revision,
        storeRevision: operation.storeRevision
      },
      actions,
      links: actions,
      tags: ["WORLD BRIDGE", operation.operationType, operation.status, presentation.severity],
      createdBy: "WORLD BRIDGE",
      audience: ["PLAYER"],
      markUnreadOnUpdate: FINAL_STATUSES.has(operation.status) || RECOVERY_STATUSES.has(operation.status)
    });

    if (!result?.ok) {
      pushDiagnostic("ERROR", "WORLD_BRIDGE_NOTIFICATION_EMIT_FAILED", {
        eventName,
        operationId: operation.operationId,
        operationType: operation.operationType,
        status: operation.status,
        revision: operation.revision,
        error: result?.error || result?.reason || null
      });
    }
    return result || { ok: false, reason: "WORLD_BRIDGE_NOTIFICATION_EMIT_FAILED" };
  }

  function handleDomainEvent(event) {
    emitWorldBridgeOperationNotification(event?.detail || {}, event?.type || GENERIC_EVENT);
  }


  function validateWorldBridgeNotificationReadiness() {
    const registry = app.notificationRegistry;
    const eventDefinition = registry?.getEvent?.(EVENT_CODE) || null;
    const providerCount = registry?.getProviders?.().filter((provider) => {
      return registry.providerSupportsEvent?.({ manifest: provider }, eventDefinition) === true;
    }).length || 0;
    const errors = [];
    if (!eventDefinition) errors.push({ code: "WORLD_BRIDGE_NOTIFICATION_EVENT_MISSING" });
    if (eventDefinition && !eventDefinition.subjectTypes.includes("WORLD_OPERATION")) errors.push({ code: "WORLD_OPERATION_SUBJECT_TYPE_MISSING" });
    if (eventDefinition && !eventDefinition.subjectTypes.includes("ITEM_INSTANCE")) errors.push({ code: "ITEM_INSTANCE_SUBJECT_TYPE_MISSING" });
    if (typeof window.TerminalNotifications?.emit !== "function") errors.push({ code: "TERMINAL_NOTIFICATIONS_API_MISSING" });
    if (typeof app.getWorldBridgeOperation !== "function") errors.push({ code: "WORLD_BRIDGE_OPERATION_STORE_MISSING" });
    if (app.__worldBridgeNotificationProducerInstalled !== true) errors.push({ code: "WORLD_BRIDGE_NOTIFICATION_LISTENERS_MISSING" });
    if (!providerCount) errors.push({ code: "WORLD_BRIDGE_NOTIFICATION_PROVIDER_CAPABILITY_MISSING" });
    return {
      ready: errors.length === 0,
      eventCode: EVENT_CODE,
      genericEvent: GENERIC_EVENT,
      cyberwareEvent: CYBERWARE_EVENT,
      providerCount,
      supportedOperationTypes: [...SUPPORTED_OPERATION_TYPES],
      cyberwareWorldBridgePresent: typeof app.quoteCyberwarePurchase === "function" || typeof app.startCyberwareService === "function",
      errors
    };
  }

  function installListeners() {
    if (app.__worldBridgeNotificationProducerInstalled === true) return false;
    window.addEventListener?.(GENERIC_EVENT, handleDomainEvent);
    window.addEventListener?.(CYBERWARE_EVENT, handleDomainEvent);
    app.__worldBridgeNotificationProducerInstalled = true;
    return true;
  }

  app.emitWorldBridgeOperationNotification = emitWorldBridgeOperationNotification;
  app.getWorldBridgeNotificationProducerDiagnostics = () => clone(diagnostics);
  app.getWorldBridgeNotificationSupportedOperationTypes = () => [...SUPPORTED_OPERATION_TYPES];
  app.validateWorldBridgeNotificationReadiness = validateWorldBridgeNotificationReadiness;
  installListeners();
})();
