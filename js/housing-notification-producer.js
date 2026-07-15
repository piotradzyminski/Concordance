window.WS_APP = window.WS_APP || {};

(function initHousingNotificationProducer() {
  const app = window.WS_APP;
  const diagnostics = [];
  const NOTIFICATION_PROVIDER_ID = "provider-habitat-ledger";

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
      code: token(code, "HOUSING_NOTIFICATION_WARNING"),
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

  function getSubjectRef(eventCode = "", shipment = {}) {
    if (eventCode === "HOUSING.STORAGE.CAPACITY_WARNING") {
      return { type: "HOUSING_STORAGE", id: text(shipment.destinationStorageId) };
    }
    return { type: "SHIPMENT", id: text(shipment.shipmentId) };
  }

  function emitHousingShipmentNotification(input = {}) {
    if (app.__housingSuppressNotifications === true) {
      return { ok: true, skipped: true, reason: "HOUSING_NOTIFICATION_SUPPRESSED" };
    }

    const shipmentId = text(input.shipmentId);
    const shipment = shipmentId ? app.getMarketShipment?.(shipmentId) || null : null;
    if (!shipment) {
      pushDiagnostic("ERROR", "HOUSING_NOTIFICATION_SHIPMENT_NOT_FOUND", { shipmentId });
      return { ok: false, reason: "HOUSING_NOTIFICATION_SHIPMENT_NOT_FOUND" };
    }

    const eventCode = text(input.eventCode || app.deriveHousingShipmentEventCode?.(shipment));
    if (!eventCode) return { ok: true, skipped: true, reason: "HOUSING_SHIPMENT_STATE_NOT_PLAYER_VISIBLE" };
    if (typeof window.TerminalNotifications?.emit !== "function") {
      pushDiagnostic("WARNING", "HOUSING_NOTIFICATION_API_UNAVAILABLE", { shipmentId, eventCode });
      return { ok: false, reason: "HOUSING_NOTIFICATION_API_UNAVAILABLE" };
    }

    const citizenId = text(shipment.citizenId || input.citizenId);
    const subjectRef = getSubjectRef(eventCode, shipment);
    if (!citizenId || !subjectRef.id) {
      pushDiagnostic("ERROR", "HOUSING_NOTIFICATION_IDENTITY_INCOMPLETE", { shipmentId, citizenId, eventCode, subjectRef });
      return { ok: false, reason: "HOUSING_NOTIFICATION_IDENTITY_INCOMPLETE" };
    }

    const relatedRefs = uniqueReferences([
      { type: "MARKET_SHIPMENT", id: shipment.shipmentId },
      shipment.marketOrderId ? { type: "MARKET_ORDER", id: shipment.marketOrderId } : null,
      shipment.destinationHousingId ? { type: "HOUSING_RECORD", id: shipment.destinationHousingId } : null,
      shipment.destinationStorageId ? { type: "HOUSING_STORAGE", id: shipment.destinationStorageId } : null,
      ...(Array.isArray(shipment.instanceIds) ? shipment.instanceIds.map((id) => ({ type: "ITEM_INSTANCE", id })) : [])
    ].filter(Boolean));

    const occurredAt = text(shipment.deliveredAt || shipment.heldAt || shipment.updatedAt || input.occurredAt);
    const revision = Math.max(1, Number(shipment.revision || input.revision || 1) || 1);
    const result = window.TerminalNotifications.emit({
      eventCode,
      eventId: text(input.eventId || `housing-shipment:${shipment.shipmentId}:${revision}`),
      citizenId,
      providerId: NOTIFICATION_PROVIDER_ID,
      organizationLocationId: text(shipment.organizationLocationId),
      subjectRef,
      relatedRefs,
      correlationId: shipment.shipmentId,
      dedupeKey: `housing-shipment:${shipment.shipmentId}`,
      revision,
      occurredAt,
      markUnreadOnUpdate: true,
      data: {
        shipmentId: text(shipment.shipmentId),
        marketOrderId: text(shipment.marketOrderId),
        providerId: text(shipment.providerId),
        notificationProviderId: NOTIFICATION_PROVIDER_ID,
        status: token(shipment.status, "UPDATED"),
        previousStatus: token(input.previousStatus, ""),
        instanceIds: Array.isArray(shipment.instanceIds) ? [...shipment.instanceIds] : [],
        destinationHousingId: text(shipment.destinationHousingId),
        destinationStorageId: text(shipment.destinationStorageId),
        destinationAddress: text(shipment.destinationAddress),
        routeClass: token(shipment.routeClass, ""),
        etaAt: text(shipment.etaAt),
        deliveredAt: text(shipment.deliveredAt),
        heldAt: text(shipment.heldAt),
        holdReason: token(shipment.holdReason, ""),
        lastErrorCode: token(shipment.lastErrorCode, "")
      },
      createdBy: "HOUSING",
      audience: ["PLAYER"]
    });

    if (!result?.ok) {
      pushDiagnostic("ERROR", "HOUSING_NOTIFICATION_EMIT_FAILED", {
        shipmentId,
        eventCode,
        error: clone(result?.error || result?.reason || null)
      });
    }
    return result || { ok: false, reason: "HOUSING_NOTIFICATION_EMIT_FAILED" };
  }

  function handleHousingShipmentUpdated(event) {
    emitHousingShipmentNotification(event?.detail || {});
  }

  function validateHousingNotificationProducer() {
    const errors = [];
    if (typeof app.getMarketShipment !== "function") errors.push({ code: "MARKET_SHIPMENT_GETTER_MISSING" });
    if (typeof window.TerminalNotifications?.emit !== "function") errors.push({ code: "NOTIFICATION_API_MISSING" });
    if (typeof app.deriveHousingShipmentEventCode !== "function") errors.push({ code: "HOUSING_SHIPMENT_EVENT_BRIDGE_MISSING" });
    return {
      ready: errors.length === 0,
      version: "2.6x",
      eventSource: "ws:housing-shipment-updated",
      providerId: NOTIFICATION_PROVIDER_ID,
      mappedEvents: [
        "HOUSING.SHIPMENT.DELIVERED",
        "HOUSING.SHIPMENT.HELD",
        "HOUSING.STORAGE.CAPACITY_WARNING"
      ],
      errors,
      diagnostics: clone(diagnostics)
    };
  }

  function installListeners() {
    if (app.__housingNotificationProducerInstalled === true) return false;
    window.addEventListener?.("ws:housing-shipment-updated", handleHousingShipmentUpdated);
    app.__housingNotificationProducerInstalled = true;
    return true;
  }

  app.emitHousingShipmentNotification = emitHousingShipmentNotification;
  app.validateHousingNotificationProducer = validateHousingNotificationProducer;
  app.getHousingNotificationProducerDiagnostics = () => clone(diagnostics);
  installListeners();
})();
