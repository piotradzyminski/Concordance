window.WS_APP = window.WS_APP || {};

(function initHousingShipmentEventBridge() {
  const app = window.WS_APP;
  const diagnostics = [];
  const emittedEventIds = new Set();
  const CAPACITY_REASONS = new Set([
    "HOUSING_STORAGE_FULL",
    "HOUSING_STORAGE_CAPACITY_EXCEEDED",
    "HOUSING_GRID_NO_SPACE"
  ]);
  const HOUSING_RECOVERY_REASONS = new Set([
    "HOUSING_DELIVERY_COMMIT_RECOVERY_REQUIRED",
    "HOUSING_COMMIT_PERSISTENCE_FAILED",
    "HOUSING_RESERVATION_PERSISTENCE_FAILED",
    "HOUSING_RESERVATION_FAILED",
    "HOUSING_PLACEMENT_UNAVAILABLE"
  ]);

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
      code: token(code, "HOUSING_SHIPMENT_EVENT_WARNING"),
      detail: clone(detail),
      at: new Date().toISOString()
    };
    diagnostics.push(record);
    if (diagnostics.length > 250) diagnostics.splice(0, diagnostics.length - 250);
    return record;
  }

  function deriveHousingShipmentEventCode(shipment = {}) {
    const status = token(shipment.status, "");
    const reason = token(shipment.holdReason || shipment.lastErrorCode, "");
    if (status === "DELIVERED") return "HOUSING.SHIPMENT.DELIVERED";
    if (status === "HELD" && CAPACITY_REASONS.has(reason) && text(shipment.destinationStorageId)) return "HOUSING.STORAGE.CAPACITY_WARNING";
    if (status === "HELD") return "HOUSING.SHIPMENT.HELD";
    if (status === "RECOVERY_REQUIRED" && HOUSING_RECOVERY_REASONS.has(reason)) return "HOUSING.SHIPMENT.HELD";
    return "";
  }

  function emitHousingShipmentSemanticEvent(input = {}) {
    const shipmentId = text(input.shipmentId);
    const shipment = shipmentId ? app.getMarketShipment?.(shipmentId) || null : null;
    if (!shipment) {
      pushDiagnostic("ERROR", "HOUSING_SHIPMENT_RECORD_NOT_FOUND", { shipmentId });
      return { ok: false, reason: "HOUSING_SHIPMENT_RECORD_NOT_FOUND" };
    }

    const eventCode = deriveHousingShipmentEventCode(shipment);
    if (!eventCode) {
      return { ok: true, skipped: true, reason: "HOUSING_SHIPMENT_STATE_NOT_SEMANTIC", shipmentId, status: token(shipment.status, "") };
    }

    const revision = Math.max(1, Number(shipment.revision || input.revision || 1) || 1);
    const eventId = `housing-shipment:${shipment.shipmentId}:${revision}`;
    if (emittedEventIds.has(eventId)) {
      return { ok: true, skipped: true, reason: "HOUSING_SHIPMENT_EVENT_DUPLICATE", eventId, eventCode };
    }
    emittedEventIds.add(eventId);

    const detail = {
      eventId,
      eventCode,
      shipmentId: text(shipment.shipmentId),
      marketOrderId: text(shipment.marketOrderId),
      citizenId: text(shipment.citizenId),
      providerId: text(shipment.providerId),
      organizationLocationId: text(shipment.organizationLocationId),
      status: token(shipment.status, "UPDATED"),
      previousStatus: token(input.previousStatus, ""),
      itemInstanceId: text(shipment.instanceIds?.[0]),
      instanceIds: Array.isArray(shipment.instanceIds) ? [...shipment.instanceIds] : [],
      destinationHousingId: text(shipment.destinationHousingId),
      destinationStorageId: text(shipment.destinationStorageId),
      destinationAddress: text(shipment.destinationAddress),
      routeClass: token(shipment.routeClass, ""),
      etaAt: text(shipment.etaAt),
      deliveredAt: text(shipment.deliveredAt),
      heldAt: text(shipment.heldAt),
      holdReason: token(shipment.holdReason, ""),
      lastErrorCode: token(shipment.lastErrorCode, ""),
      revision,
      changedDomains: ["HOUSING", "MARKET_SHIPMENT"]
    };

    window.dispatchEvent?.(new CustomEvent("ws:housing-shipment-updated", { detail }));
    return { ok: true, operation: "EMITTED", eventId, eventCode, detail: clone(detail) };
  }

  function handleMarketShipmentUpdated(event) {
    emitHousingShipmentSemanticEvent(event?.detail || {});
  }

  function validateHousingShipmentEventBridge() {
    const errors = [];
    if (typeof app.getMarketShipment !== "function") errors.push({ code: "MARKET_SHIPMENT_GETTER_MISSING" });
    [
      "HOUSING.SHIPMENT.DELIVERED",
      "HOUSING.SHIPMENT.HELD",
      "HOUSING.STORAGE.CAPACITY_WARNING"
    ].forEach((eventCode) => {
      if (!window.APP_DATA?.notificationEventCatalog?.some?.((entry) => entry?.eventCode === eventCode)) {
        errors.push({ code: "HOUSING_NOTIFICATION_EVENT_MISSING", eventCode });
      }
    });
    return {
      ready: errors.length === 0,
      version: "2.6x",
      sourceEvent: "ws:market-shipment-updated",
      semanticEvent: "ws:housing-shipment-updated",
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
    if (app.__housingShipmentEventBridgeInstalled === true) return false;
    window.addEventListener?.("ws:market-shipment-updated", handleMarketShipmentUpdated);
    app.__housingShipmentEventBridgeInstalled = true;
    return true;
  }

  app.deriveHousingShipmentEventCode = deriveHousingShipmentEventCode;
  app.emitHousingShipmentSemanticEvent = emitHousingShipmentSemanticEvent;
  app.validateHousingShipmentEventBridge = validateHousingShipmentEventBridge;
  app.getHousingShipmentEventBridgeDiagnostics = () => clone(diagnostics);
  installListeners();
})();
