window.WS_APP = window.WS_APP || {};

(function initMarketNotificationProducer() {
  const app = window.WS_APP;
  const diagnostics = [];

  function clone(value) {
    if (value === undefined) return undefined;
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function text(value = "") {
    return String(value ?? "").trim();
  }

  function token(value = "", fallback = "") {
    const normalized = text(value || fallback)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return normalized || fallback;
  }

  function pushDiagnostic(level, code, detail = {}) {
    const record = {
      level: token(level, "WARNING"),
      code: token(code, "MARKET_NOTIFICATION_WARNING"),
      detail: clone(detail),
      at: new Date().toISOString()
    };
    diagnostics.push(record);
    if (diagnostics.length > 250) diagnostics.splice(0, diagnostics.length - 250);
    return record;
  }

  function uniqueReferences(references = []) {
    const result = [];
    (Array.isArray(references) ? references : []).forEach((reference) => {
      const type = token(reference?.type, "");
      const id = text(reference?.id || reference?.entityId);
      if (!type || !id) return;
      if (!result.some((entry) => entry.type === type && entry.id === id)) result.push({ type, id });
    });
    return result;
  }

  function getRefundStatus(order = {}, detail = {}) {
    return token(detail.refundRequestStatus || order.refundRequest?.status, "NONE");
  }

  function getRecoveryCode(order = {}, detail = {}) {
    const refundStatus = getRefundStatus(order, detail);
    const cancellationStatus = token(detail.cancellationStatus || order.cancellation?.status, "NONE");
    const deliveryStatus = token(detail.deliveryStatus || order.deliveryFulfillment?.status, "NOT_REQUIRED");
    const pickupStatus = token(order.pickupFulfillment?.status, "NOT_REQUIRED");
    const serviceStatus = token(order.serviceFulfillment?.status, "NOT_REQUIRED");
    const compensationStatus = token(order.compensationStatus, "NOT_REQUIRED");
    if (refundStatus === "RECOVERY_REQUIRED") return token(order.refundRequest?.lastErrorCode || order.failureCode, "MARKET_ORDER_REFUND_RECOVERY_REQUIRED");
    if (cancellationStatus === "RECOVERY_REQUIRED") return token(order.cancellation?.lastErrorCode || order.failureCode, "MARKET_ORDER_CANCELLATION_INTERRUPTED");
    if (deliveryStatus === "RECOVERY_REQUIRED") return token(order.deliveryFulfillment?.lastErrorCode || order.failureCode, "MARKET_SHIPMENT_DELIVERY_FAILED");
    if (pickupStatus === "RECOVERY_REQUIRED") return token(order.pickupFulfillment?.errors?.[0] || order.failureCode, "MARKET_ORDER_PICKUP_RECOVERY_REQUIRED");
    if (serviceStatus === "RECOVERY_REQUIRED") return token(order.serviceFulfillment?.errors?.[0] || order.failureCode, "MARKET_ORDER_SERVICE_RECOVERY_REQUIRED");
    if (["RECOVERY_REQUIRED", "FAILED"].includes(compensationStatus)) return token(order.compensationErrors?.[0] || order.failureCode, "MARKET_ORDER_COMPENSATION_REQUIRED");
    return token(order.failureCode || detail.failureCode, "PAYMENT_RECOVERY_REQUIRED");
  }

  function deriveMarketNotificationEvent(order = {}, detail = {}) {
    const status = token(detail.status || order.status, "");
    const refundStatus = getRefundStatus(order, detail);
    const cancellationStatus = token(detail.cancellationStatus || order.cancellation?.status, "NONE");
    const deliveryStatus = token(detail.deliveryStatus || order.deliveryFulfillment?.status, "NOT_REQUIRED");
    const pickupStatus = token(order.pickupFulfillment?.status, "NOT_REQUIRED");
    const serviceStatus = token(order.serviceFulfillment?.status, "NOT_REQUIRED");
    const compensationStatus = token(order.compensationStatus, "NOT_REQUIRED");

    if (status === "PAYMENT_RECOVERY_REQUIRED"
      || refundStatus === "RECOVERY_REQUIRED"
      || cancellationStatus === "RECOVERY_REQUIRED"
      || deliveryStatus === "RECOVERY_REQUIRED"
      || pickupStatus === "RECOVERY_REQUIRED"
      || serviceStatus === "RECOVERY_REQUIRED"
      || ["RECOVERY_REQUIRED", "FAILED"].includes(compensationStatus)) {
      return { eventCode: "MARKET.ORDER.RECOVERY_REQUIRED", reasonCode: getRecoveryCode(order, detail) };
    }
    if (status === "REFUNDED" || refundStatus === "COMPLETED") return { eventCode: "MARKET.ORDER.REFUNDED", reasonCode: "" };
    if (refundStatus === "REQUESTED") return { eventCode: "MARKET.ORDER.REFUND_REQUESTED", reasonCode: token(order.refundRequest?.reasonCode, "") };
    if (status === "COMPLETED") return { eventCode: "MARKET.ORDER.COMPLETED", reasonCode: "" };
    if (status === "CANCELLED") return { eventCode: "MARKET.ORDER.CANCELLED", reasonCode: token(order.cancellation?.reasonCode, "CANCELLED") };
    if (status === "FAILED") return { eventCode: "MARKET.ORDER.FAILED", reasonCode: token(order.failureCode, "MARKET_ORDER_FAILED") };
    return { eventCode: "", reasonCode: "" };
  }

  function buildLineSummaries(order = {}) {
    return (Array.isArray(order.lines) ? order.lines : []).map((line) => ({
      catalogItemId: text(line.catalogItemId),
      definitionId: text(line.definitionId),
      quantity: Math.max(1, Number(line.quantity || 1) || 1),
      fulfillmentMode: token(line.fulfillmentMode, "DELIVER_TO_HOUSING"),
      destinationRef: line.destinationRef && typeof line.destinationRef === "object" ? clone(line.destinationRef) : null,
      createdItemInstanceIds: Array.isArray(line.createdItemInstanceIds) ? [...line.createdItemInstanceIds] : []
    }));
  }

  function buildRelatedRefs(order = {}) {
    return uniqueReferences([
      ...(Array.isArray(order.createdItemInstanceIds) ? order.createdItemInstanceIds.map((id) => ({ type: "ITEM_INSTANCE", id })) : []),
      ...(Array.isArray(order.linkedServiceOrderIds) ? order.linkedServiceOrderIds.map((id) => ({ type: "SERVICE_ORDER", id })) : []),
      order.billingRefs?.billingIntentId ? { type: "BILLING_INTENT", id: order.billingRefs.billingIntentId } : null,
      order.billingRefs?.billingTransactionId ? { type: "BILLING_TRANSACTION", id: order.billingRefs.billingTransactionId } : null,
      order.shipmentId ? { type: "MARKET_SHIPMENT", id: order.shipmentId } : null
    ].filter(Boolean));
  }

  function emitMarketOrderNotification(input = {}) {
    if (app.__marketSuppressNotifications === true) {
      return { ok: true, skipped: true, reason: "MARKET_NOTIFICATION_SUPPRESSED" };
    }
    const marketOrderId = text(input.marketOrderId);
    const order = marketOrderId ? app.getMarketOrder?.(marketOrderId) || null : null;
    if (!order) {
      pushDiagnostic("ERROR", "MARKET_NOTIFICATION_ORDER_NOT_FOUND", { marketOrderId });
      return { ok: false, reason: "MARKET_NOTIFICATION_ORDER_NOT_FOUND" };
    }
    const mapping = deriveMarketNotificationEvent(order, input);
    if (!mapping.eventCode) return { ok: true, skipped: true, reason: "MARKET_ORDER_STATE_NOT_PLAYER_VISIBLE" };
    if (typeof window.TerminalNotifications?.emit !== "function") {
      pushDiagnostic("WARNING", "MARKET_NOTIFICATION_API_UNAVAILABLE", { marketOrderId, eventCode: mapping.eventCode });
      return { ok: false, reason: "MARKET_NOTIFICATION_API_UNAVAILABLE" };
    }

    const citizenId = text(order.citizenId || input.citizenId);
    const providerId = text(order.vendorProviderId || input.vendorProviderId);
    if (!citizenId || !providerId) {
      pushDiagnostic("ERROR", "MARKET_NOTIFICATION_IDENTITY_INCOMPLETE", { marketOrderId, citizenId, providerId });
      return { ok: false, reason: "MARKET_NOTIFICATION_IDENTITY_INCOMPLETE" };
    }

    const result = window.TerminalNotifications.emit({
      eventCode: mapping.eventCode,
      eventId: text(input.eventId || `market-order:${marketOrderId}:${order.revision}`),
      citizenId,
      providerId,
      organizationLocationId: text(order.lines?.[0]?.organizationLocationId),
      subjectRef: { type: "MARKET_ORDER", id: marketOrderId },
      relatedRefs: buildRelatedRefs(order),
      correlationId: marketOrderId,
      dedupeKey: `market-order:${marketOrderId}`,
      revision: Math.max(1, Number(order.revision || input.revision || 1) || 1),
      occurredAt: text(order.updatedAt || input.occurredAt),
      data: {
        marketOrderId,
        vendorProviderId: providerId,
        status: token(order.status, "UPDATED"),
        previousStatus: token(input.previousStatus, ""),
        paymentStatus: token(order.paymentStatus, ""),
        cancellationStatus: token(order.cancellation?.status, "NONE"),
        refundRequestStatus: token(order.refundRequest?.status, "NONE"),
        refundRequestedAt: text(order.refundRequest?.requestedAt),
        deliveryStatus: token(order.deliveryFulfillment?.status, "NOT_REQUIRED"),
        pickupStatus: token(order.pickupFulfillment?.status, "NOT_REQUIRED"),
        serviceStatus: token(order.serviceFulfillment?.status, "NOT_REQUIRED"),
        compensationStatus: token(order.compensationStatus, "NOT_REQUIRED"),
        failureCode: mapping.reasonCode || token(order.failureCode, ""),
        totalAmount: Number(order.totals?.finalTotal || 0) || 0,
        currency: token(order.totals?.currency, "CREDIT"),
        lineCount: Array.isArray(order.lines) ? order.lines.length : 0,
        lineSummaries: buildLineSummaries(order),
        instanceIds: Array.isArray(order.createdItemInstanceIds) ? [...order.createdItemInstanceIds] : [],
        shipmentId: text(order.shipmentId),
        completedAt: text(order.completedAt),
        changedFields: Array.isArray(input.changedFields) ? [...input.changedFields] : []
      },
      createdBy: "MARKET",
      audience: ["PLAYER"]
    });

    if (!result?.ok) {
      pushDiagnostic("ERROR", "MARKET_NOTIFICATION_EMIT_FAILED", {
        marketOrderId,
        eventCode: mapping.eventCode,
        error: clone(result?.error || result?.reason || null)
      });
    }
    return result || { ok: false, reason: "MARKET_NOTIFICATION_EMIT_FAILED" };
  }

  function handleMarketOrderUpdated(event) {
    const detail = event?.detail || {};
    emitMarketOrderNotification(detail);
  }

  function validateMarketNotificationProducer() {
    const errors = [];
    if (typeof app.getMarketOrder !== "function") errors.push({ code: "MARKET_ORDER_GETTER_MISSING" });
    if (typeof window.TerminalNotifications?.emit !== "function") errors.push({ code: "NOTIFICATION_API_MISSING" });
    return {
      ready: errors.length === 0,
      version: "2.5x",
      eventSource: "ws:market-order-updated",
      mappedEvents: [
        "MARKET.ORDER.COMPLETED",
        "MARKET.ORDER.CANCELLED",
        "MARKET.ORDER.FAILED",
        "MARKET.ORDER.REFUND_REQUESTED",
        "MARKET.ORDER.REFUNDED",
        "MARKET.ORDER.RECOVERY_REQUIRED"
      ],
      errors,
      diagnostics: clone(diagnostics)
    };
  }

  function installListeners() {
    if (app.__marketNotificationProducerInstalled === true) return false;
    window.addEventListener?.("ws:market-order-updated", handleMarketOrderUpdated);
    app.__marketNotificationProducerInstalled = true;
    return true;
  }

  app.emitMarketOrderNotification = emitMarketOrderNotification;
  app.deriveMarketNotificationEvent = deriveMarketNotificationEvent;
  app.validateMarketNotificationProducer = validateMarketNotificationProducer;
  app.getMarketNotificationProducerDiagnostics = () => clone(diagnostics);
  installListeners();
})();
