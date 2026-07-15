window.WS_APP = window.WS_APP || {};

(function initMarketTimeScheduler(app) {
  "use strict";

  const SCHEMA_VERSION = "market_datetime_scheduler_6_5x";
  const WORLD_HANDLER_ID = "market-time-scheduler";
  const TERMINAL_SHIPMENT_STATUSES = new Set(["DELIVERED", "CANCELLED"]);
  const TERMINAL_ORDER_STATUSES = new Set(["COMPLETED", "REFUNDED", "FAILED", "CANCELLED"]);
  const BUILT_IN_EVENT_TYPES = new Set([
    "MARKET_OFFER_ACTIVATES",
    "MARKET_OFFER_EXPIRES",
    "MARKET_PICKUP_EXPIRES",
    "MARKET_SHIPMENT_DUE"
  ]);

  const domainHandlers = new Map();
  let reconciliationQueued = false;
  let lastRebuildSummary = null;

  function clone(value) {
    if (value == null) return value;
    try { return structuredClone(value); }
    catch (error) {
      try { return JSON.parse(JSON.stringify(value)); }
      catch (fallbackError) { return null; }
    }
  }

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function normalizeToken(value = "") {
    return String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  }

  function normalizeIso(value = "") {
    if (typeof app.normalizeMarketWorldTimeIso === "function") {
      return app.normalizeMarketWorldTimeIso(value);
    }
    const raw = normalizeId(value);
    if (!raw) return "";
    const source = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00.000Z` : raw;
    const parsed = Date.parse(source);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
  }

  function currentCampaignTimeIso() {
    return normalizeIso(app.getCampaignTimeIso?.() || app.CAMPAIGN_TIME_ISO || app.getCampaignDateIso?.() || app.CAMPAIGN_DATE_ISO);
  }

  function compareTimes(left = "", right = "") {
    if (typeof app.compareMarketWorldTimes === "function") return app.compareMarketWorldTimes(left, right);
    const leftTime = Date.parse(normalizeIso(left));
    const rightTime = Date.parse(normalizeIso(right));
    if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return String(left || "").localeCompare(String(right || ""));
    return leftTime - rightTime;
  }

  function buildScheduleKey(eventType = "", entityId = "", scheduledAt = "") {
    return ["market-time", normalizeToken(eventType), normalizeId(entityId), normalizeIso(scheduledAt)].join(":");
  }

  function scheduleMarketTimeEvent(input = {}) {
    if (typeof app.scheduleWorldTimeEvent !== "function") {
      return { ok: false, reason: "WORLD_TIME_SCHEDULED_EVENTS_UNAVAILABLE" };
    }
    const eventType = normalizeToken(input.eventType || input.type);
    const scheduledAt = normalizeIso(input.scheduledAt || input.dueAt || input.eventTimeIso);
    const entityType = normalizeToken(input.entityType || input.payload?.entityType || "MARKET_RECORD");
    const entityId = normalizeId(input.entityId || input.payload?.entityId || input.marketOfferId || input.marketOrderId || input.shipmentId);
    if (!eventType) return { ok: false, reason: "MARKET_TIME_EVENT_TYPE_REQUIRED" };
    if (!scheduledAt) return { ok: false, reason: "MARKET_TIME_EVENT_TIMESTAMP_INVALID" };
    if (!entityId) return { ok: false, reason: "MARKET_TIME_EVENT_ENTITY_ID_REQUIRED" };

    const idempotencyKey = normalizeId(input.idempotencyKey) || buildScheduleKey(eventType, entityId, scheduledAt);
    const result = app.scheduleWorldTimeEvent({
      eventId: normalizeId(input.eventId),
      idempotencyKey,
      eventType,
      handlerId: WORLD_HANDLER_ID,
      scheduledAt,
      maxAttempts: Number(input.maxAttempts || 3),
      payload: {
        ...(input.payload && typeof input.payload === "object" ? clone(input.payload) : {}),
        entityType,
        entityId
      },
      metadata: {
        sourceDomain: "MARKET",
        schedulerSchemaVersion: SCHEMA_VERSION,
        ...(input.metadata && typeof input.metadata === "object" ? clone(input.metadata) : {})
      }
    });
    if (result?.ok) requestDueReconciliation();
    return result;
  }

  function scheduleMarketOfferTimeEvents(offerOrId = {}) {
    const offer = typeof offerOrId === "string" ? app.getMarketOffer?.(offerOrId) : offerOrId;
    if (!offer?.marketOfferId) return { ok: false, reason: "MARKET_OFFER_NOT_FOUND", scheduled: [] };
    const scheduled = [];
    if (offer.activeFrom) {
      scheduled.push(scheduleMarketTimeEvent({
        eventType: "MARKET_OFFER_ACTIVATES",
        entityType: "MARKET_OFFER",
        entityId: offer.marketOfferId,
        scheduledAt: offer.activeFrom,
        payload: { marketOfferId: offer.marketOfferId, vendorProviderId: offer.vendorProviderId },
        metadata: { lifecycleBoundary: "ACTIVE_FROM" }
      }));
    }
    if (offer.expiresAt) {
      scheduled.push(scheduleMarketTimeEvent({
        eventType: "MARKET_OFFER_EXPIRES",
        entityType: "MARKET_OFFER",
        entityId: offer.marketOfferId,
        scheduledAt: offer.expiresAt,
        payload: { marketOfferId: offer.marketOfferId, vendorProviderId: offer.vendorProviderId },
        metadata: { lifecycleBoundary: "EXPIRES_AT" }
      }));
    }
    return { ok: scheduled.every((entry) => entry?.ok), reason: "MARKET_OFFER_TIME_EVENTS_SCHEDULED", scheduled };
  }

  function scheduleMarketPickupExpiryEvent(orderOrId = {}) {
    const order = typeof orderOrId === "string" ? app.getMarketOrder?.(orderOrId) : orderOrId;
    const expiresAt = normalizeIso(order?.pickupFulfillment?.expiresAt);
    if (!order?.marketOrderId) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    if (!expiresAt) return { ok: true, reason: "MARKET_PICKUP_EXPIRY_NOT_REQUIRED", skipped: true };
    if (TERMINAL_ORDER_STATUSES.has(normalizeToken(order.status))) return { ok: true, reason: "MARKET_ORDER_ALREADY_TERMINAL", skipped: true };
    return scheduleMarketTimeEvent({
      eventType: "MARKET_PICKUP_EXPIRES",
      entityType: "MARKET_ORDER",
      entityId: order.marketOrderId,
      scheduledAt: expiresAt,
      payload: { marketOrderId: order.marketOrderId, citizenId: order.citizenId },
      metadata: { lifecycleBoundary: "PICKUP_EXPIRES_AT" }
    });
  }

  function scheduleMarketShipmentDueEvent(shipmentOrId = {}) {
    const shipment = typeof shipmentOrId === "string" ? app.getMarketShipment?.(shipmentOrId) : shipmentOrId;
    const etaAt = normalizeIso(shipment?.etaAt);
    if (!shipment?.shipmentId) return { ok: false, reason: "MARKET_SHIPMENT_NOT_FOUND" };
    if (!etaAt) return { ok: true, reason: "MARKET_SHIPMENT_ETA_NOT_REQUIRED", skipped: true };
    if (TERMINAL_SHIPMENT_STATUSES.has(normalizeToken(shipment.status))) return { ok: true, reason: "MARKET_SHIPMENT_ALREADY_TERMINAL", skipped: true };
    return scheduleMarketTimeEvent({
      eventType: "MARKET_SHIPMENT_DUE",
      entityType: "MARKET_SHIPMENT",
      entityId: shipment.shipmentId,
      scheduledAt: etaAt,
      payload: { shipmentId: shipment.shipmentId, marketOrderId: shipment.marketOrderId, citizenId: shipment.citizenId },
      metadata: { lifecycleBoundary: "DELIVERY_ETA" }
    });
  }

  function registerMarketTimeEventHandler(eventType = "", handler, options = {}) {
    const type = normalizeToken(eventType);
    if (!type) return { ok: false, reason: "MARKET_TIME_EVENT_TYPE_REQUIRED" };
    if (typeof handler !== "function") return { ok: false, reason: "MARKET_TIME_EVENT_HANDLER_REQUIRED" };
    if (domainHandlers.has(type) && options.replace !== true) return { ok: false, reason: "MARKET_TIME_EVENT_HANDLER_DUPLICATE", eventType: type };
    domainHandlers.set(type, handler);
    requestDueReconciliation();
    return { ok: true, reason: "MARKET_TIME_EVENT_HANDLER_REGISTERED", eventType: type };
  }

  function unregisterMarketTimeEventHandler(eventType = "") {
    const type = normalizeToken(eventType);
    return { ok: domainHandlers.delete(type), reason: "MARKET_TIME_EVENT_HANDLER_UNREGISTERED", eventType: type };
  }

  function emitResolution(event = {}, result = {}) {
    window.dispatchEvent?.(new CustomEvent("ws:market-time-event-resolved", {
      detail: {
        eventId: event.eventId,
        eventType: event.eventType,
        scheduledAt: event.scheduledAt,
        entityType: event.payload?.entityType || "",
        entityId: event.payload?.entityId || "",
        result: clone(result),
        schemaVersion: SCHEMA_VERSION
      }
    }));
  }

  function resolveOfferBoundary(event = {}) {
    const marketOfferId = normalizeId(event.payload?.marketOfferId || event.payload?.entityId);
    const revision = app.invalidateMarketOffers?.(event.payload?.vendorProviderId || "") || 0;
    const result = { ok: true, reason: event.eventType, marketOfferId, offerRevision: revision };
    emitResolution(event, result);
    return result;
  }

  function resolvePickupExpiry(event = {}, context = {}) {
    const marketOrderId = normalizeId(event.payload?.marketOrderId || event.payload?.entityId);
    const order = app.getMarketOrder?.(marketOrderId) || null;
    if (!order) {
      const result = { ok: true, reason: "MARKET_PICKUP_ORDER_NO_LONGER_EXISTS", marketOrderId };
      emitResolution(event, result);
      return result;
    }
    const status = normalizeToken(order.status);
    const pickupStatus = normalizeToken(order.pickupFulfillment?.status || "NOT_REQUIRED");
    if (TERMINAL_ORDER_STATUSES.has(status) || pickupStatus !== "READY") {
      const result = { ok: true, reason: "MARKET_PICKUP_EXPIRY_NO_ACTION", marketOrderId, status, pickupStatus };
      emitResolution(event, result);
      return result;
    }
    const expiresAt = normalizeIso(order.pickupFulfillment?.expiresAt);
    const effectiveTime = normalizeIso(context.currentTimeIso || context.scheduledAt || currentCampaignTimeIso());
    if (!expiresAt || compareTimes(effectiveTime, expiresAt) < 0) {
      const result = { ok: true, reason: "MARKET_PICKUP_NOT_DUE", marketOrderId, expiresAt, effectiveTime };
      emitResolution(event, result);
      return result;
    }
    if (typeof app.cancelMarketOrder !== "function") return { ok: false, reason: "MARKET_ORDER_CANCELLATION_API_UNAVAILABLE" };
    const cancellation = app.cancelMarketOrder(marketOrderId, {
      expectedRevision: order.revision,
      idempotencyKey: `${order.idempotencyKey}:pickup-expiry`,
      reasonCode: "PICKUP_RESERVATION_EXPIRED",
      note: `Pickup reservation expired at ${expiresAt}.`
    });
    const result = cancellation?.ok
      ? { ok: true, reason: "MARKET_PICKUP_EXPIRED", marketOrderId, order: cancellation.order || app.getMarketOrder?.(marketOrderId) || null }
      : { ok: false, reason: cancellation?.reason || "MARKET_PICKUP_EXPIRY_FAILED", marketOrderId, detail: cancellation };
    emitResolution(event, result);
    return result;
  }

  function resolveShipmentDue(event = {}) {
    const shipmentId = normalizeId(event.payload?.shipmentId || event.payload?.entityId);
    const shipment = app.getMarketShipment?.(shipmentId) || null;
    if (!shipment) {
      const result = { ok: true, reason: "MARKET_SHIPMENT_NO_LONGER_EXISTS", shipmentId };
      emitResolution(event, result);
      return result;
    }
    if (TERMINAL_SHIPMENT_STATUSES.has(normalizeToken(shipment.status))) {
      const result = { ok: true, reason: "MARKET_SHIPMENT_ALREADY_TERMINAL", shipmentId, status: shipment.status };
      emitResolution(event, result);
      return result;
    }
    if (typeof app.reconcileMarketShipment !== "function") return { ok: false, reason: "MARKET_SHIPMENT_RECONCILE_API_UNAVAILABLE" };
    const domainResult = app.reconcileMarketShipment(shipmentId, { expectedRevision: shipment.revision });
    const result = {
      ok: true,
      reason: domainResult?.ok ? "MARKET_SHIPMENT_DUE_PROCESSED" : (domainResult?.reason || "MARKET_SHIPMENT_DUE_RECORDED"),
      shipmentId,
      domainResult: clone(domainResult)
    };
    emitResolution(event, result);
    return result;
  }

  async function handleScheduledMarketEvent(event = {}, context = {}) {
    const eventType = normalizeToken(event.eventType);
    if (eventType === "MARKET_OFFER_ACTIVATES" || eventType === "MARKET_OFFER_EXPIRES") return resolveOfferBoundary(event, context);
    if (eventType === "MARKET_PICKUP_EXPIRES") return resolvePickupExpiry(event, context);
    if (eventType === "MARKET_SHIPMENT_DUE") return resolveShipmentDue(event, context);
    const handler = domainHandlers.get(eventType);
    if (!handler) return { ok: false, reason: "MARKET_TIME_EVENT_HANDLER_NOT_REGISTERED", eventType };
    const result = await handler(clone(event), { ...context, schedulerSchemaVersion: SCHEMA_VERSION });
    emitResolution(event, result && typeof result === "object" ? result : { ok: true, value: result });
    return result;
  }

  function requestDueReconciliation() {
    if (reconciliationQueued || typeof app.reconcileWorldTimeScheduledEvents !== "function") return false;
    reconciliationQueued = true;
    queueMicrotask(() => {
      reconciliationQueued = false;
      app.reconcileWorldTimeScheduledEvents({
        currentTimeIso: currentCampaignTimeIso(),
        source: "MARKET_TIME_SCHEDULE_RECONCILE"
      }).catch((error) => console.warn("W&S Market time reconciliation failed.", error));
    });
    return true;
  }

  function rebuildMarketTimeSchedule() {
    if (typeof app.scheduleWorldTimeEvent !== "function") return { ok: false, reason: "WORLD_TIME_SCHEDULED_EVENTS_UNAVAILABLE" };
    const offers = typeof app.searchMarketOffers === "function" ? app.searchMarketOffers({ includeInactive: true }) : [];
    const shipments = typeof app.getMarketShipments === "function" ? app.getMarketShipments() : [];
    const orders = typeof app.getMarketOrders === "function" ? app.getMarketOrders() : [];
    const results = [];
    offers.forEach((offer) => {
      const scheduled = scheduleMarketOfferTimeEvents(offer);
      results.push(...(scheduled.scheduled || []));
    });
    shipments.forEach((shipment) => results.push(scheduleMarketShipmentDueEvent(shipment)));
    orders.forEach((order) => results.push(scheduleMarketPickupExpiryEvent(order)));
    const failures = results.filter((result) => result && result.ok === false);
    lastRebuildSummary = {
      ok: failures.length === 0,
      reason: failures.length ? "MARKET_TIME_SCHEDULE_REBUILD_PARTIAL" : "MARKET_TIME_SCHEDULE_REBUILT",
      schemaVersion: SCHEMA_VERSION,
      counts: {
        offers: offers.length,
        shipments: shipments.length,
        orders: orders.length,
        scheduledCommands: results.length,
        failures: failures.length
      },
      failures: failures.map(clone)
    };
    requestDueReconciliation();
    window.dispatchEvent?.(new CustomEvent("ws:market-time-schedule-rebuilt", { detail: clone(lastRebuildSummary) }));
    return clone(lastRebuildSummary);
  }

  function getMarketTimeSchedulerDiagnostics() {
    const queueEvents = typeof app.getWorldTimeScheduledEvents === "function"
      ? app.getWorldTimeScheduledEvents({ handlerId: WORLD_HANDLER_ID })
      : [];
    return {
      schemaVersion: SCHEMA_VERSION,
      worldHandlerId: WORLD_HANDLER_ID,
      builtInEventTypes: Array.from(BUILT_IN_EVENT_TYPES),
      customEventTypes: Array.from(domainHandlers.keys()).sort(),
      queueEventCount: queueEvents.length,
      statusCounts: queueEvents.reduce((counts, event) => {
        counts[event.status] = Number(counts[event.status] || 0) + 1;
        return counts;
      }, {}),
      lastRebuildSummary: clone(lastRebuildSummary)
    };
  }

  app.MARKET_DATETIME_SCHEDULER_SCHEMA_VERSION = SCHEMA_VERSION;
  app.MARKET_TIME_WORLD_HANDLER_ID = WORLD_HANDLER_ID;
  app.scheduleMarketTimeEvent = scheduleMarketTimeEvent;
  app.scheduleMarketOfferTimeEvents = scheduleMarketOfferTimeEvents;
  app.scheduleMarketPickupExpiryEvent = scheduleMarketPickupExpiryEvent;
  app.scheduleMarketShipmentDueEvent = scheduleMarketShipmentDueEvent;
  app.registerMarketTimeEventHandler = registerMarketTimeEventHandler;
  app.unregisterMarketTimeEventHandler = unregisterMarketTimeEventHandler;
  app.rebuildMarketTimeSchedule = rebuildMarketTimeSchedule;
  app.getMarketTimeSchedulerDiagnostics = getMarketTimeSchedulerDiagnostics;

  const registration = app.registerWorldTimeScheduledEventHandler?.(WORLD_HANDLER_ID, handleScheduledMarketEvent, {
    metadata: { sourceDomain: "MARKET", schemaVersion: SCHEMA_VERSION },
    reconcileDue: false
  });

  if (!registration?.ok && registration?.reason !== "SCHEDULED_EVENT_HANDLER_DUPLICATE") {
    console.warn("W&S Market time handler could not register.", registration);
  }

  window.addEventListener?.("ws:market-shipment-updated", (event) => {
    const shipmentId = normalizeId(event?.detail?.shipmentId);
    if (shipmentId) scheduleMarketShipmentDueEvent(shipmentId);
  });
  window.addEventListener?.("ws:market-order-updated", (event) => {
    const marketOrderId = normalizeId(event?.detail?.marketOrderId);
    if (marketOrderId) scheduleMarketPickupExpiryEvent(marketOrderId);
  });
  window.addEventListener?.("ws:market-offers-invalidated", () => {
    queueMicrotask(rebuildMarketTimeSchedule);
  });

  queueMicrotask(rebuildMarketTimeSchedule);
  window.dispatchEvent?.(new CustomEvent("ws:market-time-scheduler-ready", {
    detail: { schemaVersion: SCHEMA_VERSION, worldHandlerId: WORLD_HANDLER_ID }
  }));
})(window.WS_APP);
