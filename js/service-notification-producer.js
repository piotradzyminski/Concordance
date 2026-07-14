window.WS_APP = window.WS_APP || {};

(function initServiceNotificationProducer() {
  const app = window.WS_APP;
  const diagnostics = [];
  const EVENT_MAP = {
    SCHEDULED: "SERVICE.ORDER.SCHEDULED",
    COMPLETED: "SERVICE.ORDER.COMPLETED",
    FAILED: "SERVICE.ORDER.FAILED",
    CANCELLED: "SERVICE.ORDER.CANCELLED"
  };

  function clone(value) {
    if (value === undefined) return undefined;
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function normalizeToken(value = "", fallback = "") {
    const token = String(value || fallback)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return token || fallback;
  }

  function pushDiagnostic(level, code, detail = {}) {
    const record = {
      level: normalizeToken(level, "WARNING"),
      code: normalizeToken(code, "SERVICE_NOTIFICATION_WARNING"),
      detail: clone(detail),
      at: new Date().toISOString()
    };
    diagnostics.push(record);
    if (diagnostics.length > 200) diagnostics.splice(0, diagnostics.length - 200);
    return record;
  }

  function formatServiceType(value = "") {
    return normalizeToken(value, "SERVICE")
      .toLowerCase()
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getStatusSummary(order = {}, definition = {}) {
    const label = String(definition.displayName || formatServiceType(definition.serviceType || order.serviceDefinitionId)).trim();
    if (order.status === "SCHEDULED") return `${label} scheduled${order.scheduledStartAt ? ` for ${order.scheduledStartAt}` : ""}.`;
    if (order.status === "COMPLETED") return `${label} completed${order.result?.resultCode ? `: ${order.result.resultCode}` : ""}.`;
    if (order.status === "FAILED") return `${label} failed${order.result?.resultCode ? `: ${order.result.resultCode}` : ""}.`;
    if (order.status === "CANCELLED") return `${label} cancelled.`;
    return `${label}: ${order.status || "UPDATED"}.`;
  }

  function emitServiceOrderNotification(input = {}) {
    if (app.__serviceBridgeSuppressNotifications === true) {
      return { ok: true, skipped: true, reason: "SERVICE_NOTIFICATION_SUPPRESSED" };
    }
    const serviceOrderId = String(input.serviceOrderId || "").trim();
    const order = app.getServiceOrder?.(serviceOrderId);
    if (!order) {
      pushDiagnostic("WARNING", "SERVICE_NOTIFICATION_ORDER_NOT_FOUND", { serviceOrderId });
      return { ok: false, reason: "SERVICE_NOTIFICATION_ORDER_NOT_FOUND" };
    }
    const status = normalizeToken(input.status || order.status);
    const eventCode = String(input.eventCode || EVENT_MAP[status] || "").trim();
    if (!eventCode) return { ok: true, skipped: true, reason: "SERVICE_NOTIFICATION_STATUS_NOT_MAPPED" };
    if (typeof window.TerminalNotifications?.emit !== "function") {
      pushDiagnostic("WARNING", "SERVICE_NOTIFICATION_API_UNAVAILABLE", { serviceOrderId, eventCode });
      return { ok: false, reason: "SERVICE_NOTIFICATION_API_UNAVAILABLE" };
    }

    const definition = app.getServiceDefinition?.(order.serviceDefinitionId) || {};
    const result = window.TerminalNotifications.emit({
      eventCode,
      citizenId: order.citizenId,
      providerId: order.providerId,
      subjectRef: { type: "SERVICE_ORDER", id: order.serviceOrderId },
      relatedRefs: order.subjectRefs.instanceIds.map((instanceId) => ({ type: "ITEM_INSTANCE", id: instanceId })),
      correlationId: order.serviceOrderId,
      revision: order.revision,
      title: definition.displayName || formatServiceType(definition.serviceType || order.serviceDefinitionId),
      summary: getStatusSummary(order, definition),
      data: {
        serviceOrderId: order.serviceOrderId,
        serviceOfferId: order.serviceOfferId,
        serviceDefinitionId: order.serviceDefinitionId,
        serviceType: definition.serviceType || "",
        providerId: order.providerId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        scheduledStartAt: order.scheduledStartAt,
        completedAt: order.completedAt,
        resultCode: order.result?.resultCode || "",
        subjectInstanceIds: [...order.subjectRefs.instanceIds]
      },
      createdBy: "SERVICE",
      audience: ["PLAYER"]
    });

    if (!result?.ok) {
      pushDiagnostic("ERROR", "SERVICE_NOTIFICATION_EMIT_FAILED", {
        serviceOrderId,
        eventCode,
        error: result?.error || null
      });
    }
    return result || { ok: false, reason: "SERVICE_NOTIFICATION_EMIT_FAILED" };
  }

  function handleOrderEvent(event) {
    const detail = event?.detail || {};
    const status = normalizeToken(detail.status);
    if (!EVENT_MAP[status]) return;
    emitServiceOrderNotification({
      serviceOrderId: detail.serviceOrderId,
      status,
      eventCode: EVENT_MAP[status]
    });
  }

  function installListeners() {
    if (app.__serviceNotificationProducerInstalled === true) return false;
    window.addEventListener?.("ws:service-order-updated", handleOrderEvent);
    window.addEventListener?.("ws:service-order-completed", handleOrderEvent);
    window.addEventListener?.("ws:service-order-failed", handleOrderEvent);
    window.addEventListener?.("ws:service-order-cancelled", handleOrderEvent);
    app.__serviceNotificationProducerInstalled = true;
    return true;
  }

  app.emitServiceOrderNotification = emitServiceOrderNotification;
  app.getServiceNotificationProducerDiagnostics = () => clone(diagnostics);
  app.getServiceNotificationEventMap = () => clone(EVENT_MAP);
  installListeners();
})();
