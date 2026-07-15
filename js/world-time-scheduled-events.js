window.WS_APP = window.WS_APP || {};

(function initWorldTimeScheduledEvents(app) {
  "use strict";

  const SCHEMA_VERSION = "world_time_scheduled_events_2_3x";
  const STORE_SCHEMA_VERSION = 1;
  const STORAGE_KEY = "ws_world_time_scheduled_events_v1";
  const STORAGE_SCHEMA_KEY = "ws_world_time_scheduled_events_schema";
  const RECEIPT_LIMIT = 2000;
  const EVENT_LIMIT = 2000;
  const PROCESS_LIMIT = 500;
  const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
  const MUTABLE_STATUSES = new Set(["SCHEDULED", "FAILED"]);

  let eventsById = new Map();
  let eventIdByIdempotencyKey = new Map();
  let receiptsByExecutionKey = new Map();
  let handlersById = new Map();
  let storeRevision = 0;
  let lastProcessedTimeIso = "";
  let processingChain = Promise.resolve();

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

  function normalizeToken(value = "", fallback = "") {
    const token = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
    return token || fallback;
  }

  function normalizeIso(value = "") {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const source = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00.000Z` : raw;
    const parsed = Date.parse(source);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
  }

  function currentCampaignTimeIso(fallback = "") {
    return normalizeIso(app.getCampaignTimeIso?.() || app.CAMPAIGN_TIME_ISO || fallback || new Date().toISOString());
  }

  function stableNormalize(value) {
    if (Array.isArray(value)) return value.map(stableNormalize);
    if (!value || typeof value !== "object") return value;
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableNormalize(value[key]);
      return result;
    }, {});
  }

  function stableSerialize(value) {
    return JSON.stringify(stableNormalize(value));
  }

  function hashText(value = "") {
    const text = String(value || "");
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }

  function createEventId(idempotencyKey = "") {
    const random = normalizeId(window.crypto?.randomUUID?.()).replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
    return `wte_${hashText(idempotencyKey)}_${random || Date.now().toString(36)}`;
  }

  function makeExecutionKey(event = {}) {
    return [event.eventId, event.handlerId, event.scheduledAt].map(normalizeId).join("::");
  }

  function makeScheduleSignature(event = {}) {
    return stableSerialize({
      handlerId: normalizeId(event.handlerId),
      eventType: normalizeToken(event.eventType, "GENERIC"),
      scheduledAt: normalizeIso(event.scheduledAt),
      payload: event.payload && typeof event.payload === "object" ? event.payload : {},
      metadata: event.metadata && typeof event.metadata === "object" ? event.metadata : {}
    });
  }

  function normalizeStoredEvent(source = {}) {
    const scheduledAt = normalizeIso(source.scheduledAt || source.eventTimeIso || source.dueAt);
    const eventId = normalizeId(source.eventId || source.id);
    const idempotencyKey = normalizeId(source.idempotencyKey || source.scheduleKey || eventId);
    const handlerId = normalizeId(source.handlerId);
    const status = ["SCHEDULED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"].includes(normalizeToken(source.status))
      ? normalizeToken(source.status)
      : "SCHEDULED";
    if (!eventId || !idempotencyKey || !handlerId || !scheduledAt) return null;

    return {
      schemaVersion: STORE_SCHEMA_VERSION,
      eventId,
      idempotencyKey,
      eventType: normalizeToken(source.eventType, "GENERIC"),
      handlerId,
      scheduledAt,
      status,
      revision: Math.max(1, Number(source.revision || 1)),
      attemptCount: Math.max(0, Number(source.attemptCount || 0)),
      retryCount: Math.max(0, Number(source.retryCount || 0)),
      maxAttempts: Math.max(1, Number(source.maxAttempts || 3)),
      createdAt: normalizeIso(source.createdAt) || scheduledAt,
      updatedAt: normalizeIso(source.updatedAt || source.createdAt) || scheduledAt,
      processingStartedAt: normalizeIso(source.processingStartedAt),
      executedAt: normalizeIso(source.executedAt),
      completedAt: normalizeIso(source.completedAt),
      failedAt: normalizeIso(source.failedAt),
      cancelledAt: normalizeIso(source.cancelledAt),
      processedAtCampaignTime: normalizeIso(source.processedAtCampaignTime),
      payload: source.payload && typeof source.payload === "object" ? clone(source.payload) : {},
      metadata: source.metadata && typeof source.metadata === "object" ? clone(source.metadata) : {},
      lastError: source.lastError && typeof source.lastError === "object" ? clone(source.lastError) : null,
      result: source.result && typeof source.result === "object" ? clone(source.result) : null,
      executionKey: normalizeId(source.executionKey) || makeExecutionKey({ eventId, handlerId, scheduledAt }),
      scheduleSignature: normalizeId(source.scheduleSignature) || makeScheduleSignature({
        handlerId,
        eventType: source.eventType || "GENERIC",
        scheduledAt,
        payload: source.payload,
        metadata: source.metadata
      })
    };
  }

  function normalizeReceipt(source = {}) {
    const executionKey = normalizeId(source.executionKey || source.receiptId);
    const eventId = normalizeId(source.eventId);
    if (!executionKey || !eventId) return null;
    return {
      schemaVersion: 1,
      receiptId: executionKey,
      executionKey,
      eventId,
      handlerId: normalizeId(source.handlerId),
      eventType: normalizeToken(source.eventType, "GENERIC"),
      scheduledAt: normalizeIso(source.scheduledAt),
      executedAt: normalizeIso(source.executedAt || source.scheduledAt),
      processedAtCampaignTime: normalizeIso(source.processedAtCampaignTime),
      completedAt: normalizeIso(source.completedAt || source.executedAt || source.scheduledAt),
      attemptCount: Math.max(1, Number(source.attemptCount || 1)),
      result: source.result && typeof source.result === "object" ? clone(source.result) : {}
    };
  }

  function serializeState() {
    return {
      schemaVersion: STORE_SCHEMA_VERSION,
      schedulerSchemaVersion: SCHEMA_VERSION,
      revision: storeRevision,
      lastProcessedTimeIso,
      events: Array.from(eventsById.values()).map(clone),
      receipts: Array.from(receiptsByExecutionKey.values()).map(clone)
    };
  }

  function persistState() {
    try {
      window.localStorage?.setItem(STORAGE_SCHEMA_KEY, SCHEMA_VERSION);
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(serializeState()));
      return true;
    } catch (error) {
      console.warn("W&S scheduled events could not persist localStorage.", error);
      return false;
    }
  }

  function readStoredState() {
    try {
      const schema = normalizeId(window.localStorage?.getItem(STORAGE_SCHEMA_KEY));
      if (schema && schema !== SCHEMA_VERSION) return null;
      const raw = window.localStorage?.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Number(parsed.schemaVersion || 0) !== STORE_SCHEMA_VERSION) return null;
      return parsed;
    } catch (error) {
      console.warn("W&S scheduled events could not read localStorage.", error);
      return null;
    }
  }

  function rebuildIndexes() {
    eventIdByIdempotencyKey = new Map();
    eventsById.forEach((event) => {
      if (event.idempotencyKey) eventIdByIdempotencyKey.set(event.idempotencyKey, event.eventId);
    });
  }

  function pruneState() {
    if (eventsById.size > EVENT_LIMIT) {
      const removable = Array.from(eventsById.values())
        .filter((event) => TERMINAL_STATUSES.has(event.status))
        .sort((left, right) => String(left.updatedAt).localeCompare(String(right.updatedAt)) || left.eventId.localeCompare(right.eventId));
      while (eventsById.size > EVENT_LIMIT && removable.length) {
        const event = removable.shift();
        eventsById.delete(event.eventId);
      }
      rebuildIndexes();
    }
    while (receiptsByExecutionKey.size > RECEIPT_LIMIT) {
      const oldest = receiptsByExecutionKey.keys().next().value;
      if (!oldest) break;
      receiptsByExecutionKey.delete(oldest);
    }
  }

  function replaceState(source = {}, options = {}) {
    eventsById = new Map();
    receiptsByExecutionKey = new Map();
    let recovered = 0;

    (Array.isArray(source.events) ? source.events : [])
      .map(normalizeStoredEvent)
      .filter(Boolean)
      .forEach((event) => {
        if (event.status === "PROCESSING") {
          event.status = "SCHEDULED";
          event.processingStartedAt = "";
          event.lastError = {
            code: "SCHEDULED_EVENT_INTERRUPTED_RECOVERED",
            message: "Interrupted processing was returned to the scheduled queue."
          };
          event.revision += 1;
          recovered += 1;
        }
        eventsById.set(event.eventId, event);
      });

    (Array.isArray(source.receipts) ? source.receipts : [])
      .map(normalizeReceipt)
      .filter(Boolean)
      .forEach((receipt) => receiptsByExecutionKey.set(receipt.executionKey, receipt));

    storeRevision = Math.max(0, Number(source.revision || 0)) + recovered;
    lastProcessedTimeIso = normalizeIso(source.lastProcessedTimeIso);
    rebuildIndexes();
    pruneState();
    if (options.persist !== false || recovered > 0) persistState();
    return getWorldTimeScheduledEventsDiagnostics();
  }

  function emitUpdate(event, reason = "SCHEDULED_EVENT_UPDATED", extra = {}) {
    window.dispatchEvent?.(new CustomEvent("ws:world-time-scheduled-event-updated", {
      detail: {
        reason,
        event: clone(event),
        eventId: event?.eventId || "",
        status: event?.status || "",
        storeRevision,
        ...clone(extra)
      }
    }));
  }

  function mutateEvent(event, patch = {}, reason = "SCHEDULED_EVENT_UPDATED", options = {}) {
    Object.assign(event, patch);
    event.revision = Math.max(1, Number(event.revision || 0) + 1);
    event.updatedAt = normalizeIso(options.updatedAt) || currentCampaignTimeIso(event.scheduledAt);
    eventsById.set(event.eventId, event);
    storeRevision += 1;
    pruneState();
    if (options.persist !== false) persistState();
    emitUpdate(event, reason, options.eventDetail || {});
    return clone(event);
  }

  function validateExpectedRevision(event, expectedRevision) {
    if (expectedRevision === undefined || expectedRevision === null || expectedRevision === "") return null;
    if (Number(expectedRevision) === Number(event.revision)) return null;
    return {
      ok: false,
      reason: "SCHEDULED_EVENT_REVISION_CONFLICT",
      eventId: event.eventId,
      expectedRevision: Number(expectedRevision),
      currentRevision: Number(event.revision)
    };
  }

  function scheduleWorldTimeEvent(input = {}) {
    const handlerId = normalizeId(input.handlerId);
    const scheduledAt = normalizeIso(input.scheduledAt || input.eventTimeIso || input.dueAt);
    const suppliedEventId = normalizeId(input.eventId || input.id);
    const idempotencyKey = normalizeId(input.idempotencyKey || input.scheduleKey || suppliedEventId);
    if (!handlerId) return { ok: false, reason: "SCHEDULED_EVENT_HANDLER_REQUIRED" };
    if (!scheduledAt) return { ok: false, reason: "SCHEDULED_EVENT_TIME_INVALID" };
    if (!idempotencyKey) return { ok: false, reason: "SCHEDULED_EVENT_IDEMPOTENCY_KEY_REQUIRED" };

    const existingId = eventIdByIdempotencyKey.get(idempotencyKey) || (suppliedEventId && eventsById.has(suppliedEventId) ? suppliedEventId : "");
    if (existingId) {
      const existing = eventsById.get(existingId);
      const incomingSignature = makeScheduleSignature({ ...input, handlerId, scheduledAt });
      if ((existing.scheduleSignature || makeScheduleSignature(existing)) !== incomingSignature) {
        return {
          ok: false,
          reason: "SCHEDULED_EVENT_IDEMPOTENCY_CONFLICT",
          event: clone(existing)
        };
      }
      return { ok: true, reason: "SCHEDULED_EVENT_REPLAY", replayed: true, event: clone(existing) };
    }

    if (input.expectedStoreRevision !== undefined && Number(input.expectedStoreRevision) !== storeRevision) {
      return {
        ok: false,
        reason: "SCHEDULED_EVENT_STORE_REVISION_CONFLICT",
        expectedRevision: Number(input.expectedStoreRevision),
        currentRevision: storeRevision
      };
    }

    const createdAt = normalizeIso(input.createdAt) || currentCampaignTimeIso(scheduledAt);
    const eventId = suppliedEventId || createEventId(idempotencyKey);
    if (eventsById.has(eventId)) return { ok: false, reason: "SCHEDULED_EVENT_ID_CONFLICT", eventId };

    const event = normalizeStoredEvent({
      schemaVersion: STORE_SCHEMA_VERSION,
      eventId,
      idempotencyKey,
      eventType: input.eventType || input.type || "GENERIC",
      handlerId,
      scheduledAt,
      status: "SCHEDULED",
      revision: 1,
      attemptCount: 0,
      retryCount: 0,
      maxAttempts: input.maxAttempts,
      createdAt,
      updatedAt: createdAt,
      payload: input.payload,
      metadata: input.metadata,
      scheduleSignature: makeScheduleSignature({ ...input, handlerId, scheduledAt })
    });

    eventsById.set(event.eventId, event);
    eventIdByIdempotencyKey.set(event.idempotencyKey, event.eventId);
    storeRevision += 1;
    pruneState();
    persistState();
    emitUpdate(event, "SCHEDULED_EVENT_CREATED");
    return { ok: true, reason: "SCHEDULED_EVENT_CREATED", event: clone(event), storeRevision };
  }

  function scheduleWorldTimeEventDuringAdvance(eventOrDetail = {}, input = {}) {
    if (typeof app.resolveEventTimeFromCampaignEvent !== "function") {
      return { ok: false, reason: "WORLD_TIME_EVENT_WINDOWS_UNAVAILABLE" };
    }
    const resolution = app.resolveEventTimeFromCampaignEvent(eventOrDetail, {
      eventId: input.eventId,
      idempotencyKey: input.idempotencyKey,
      policy: input.timePolicy || input.policy || { type: "ANYTIME" }
    });
    if (!resolution?.ok) return { ok: false, reason: resolution?.reason || "SCHEDULED_EVENT_TIME_RESOLUTION_FAILED", resolution };
    const result = scheduleWorldTimeEvent({
      ...input,
      scheduledAt: resolution.eventTimeIso,
      metadata: {
        ...(input.metadata && typeof input.metadata === "object" ? input.metadata : {}),
        timeResolution: clone(resolution)
      }
    });
    return { ...result, resolution };
  }

  function getWorldTimeScheduledEvent(eventId = "") {
    return clone(eventsById.get(normalizeId(eventId)) || null);
  }

  function getWorldTimeScheduledEvents(filters = {}) {
    const statuses = new Set((Array.isArray(filters.statuses) ? filters.statuses : filters.status ? [filters.status] : []).map(normalizeToken));
    const handlerId = normalizeId(filters.handlerId);
    const eventType = normalizeToken(filters.eventType);
    const dueBefore = normalizeIso(filters.dueBefore || filters.scheduledBefore);
    const dueAfter = normalizeIso(filters.dueAfter || filters.scheduledAfter);
    return Array.from(eventsById.values())
      .filter((event) => !statuses.size || statuses.has(event.status))
      .filter((event) => !handlerId || event.handlerId === handlerId)
      .filter((event) => !eventType || event.eventType === eventType)
      .filter((event) => !dueBefore || event.scheduledAt <= dueBefore)
      .filter((event) => !dueAfter || event.scheduledAt >= dueAfter)
      .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt) || left.eventId.localeCompare(right.eventId))
      .map(clone);
  }

  function cancelWorldTimeScheduledEvent(eventId = "", options = {}) {
    const event = eventsById.get(normalizeId(eventId));
    if (!event) return { ok: false, reason: "SCHEDULED_EVENT_NOT_FOUND" };
    const revisionError = validateExpectedRevision(event, options.expectedRevision);
    if (revisionError) return revisionError;
    if (!MUTABLE_STATUSES.has(event.status)) return { ok: false, reason: "SCHEDULED_EVENT_NOT_CANCELLABLE", event: clone(event) };
    const cancelledAt = currentCampaignTimeIso(event.scheduledAt);
    const updated = mutateEvent(event, {
      status: "CANCELLED",
      cancelledAt,
      processingStartedAt: "",
      lastError: null
    }, "SCHEDULED_EVENT_CANCELLED", { updatedAt: cancelledAt });
    return { ok: true, reason: "SCHEDULED_EVENT_CANCELLED", event: updated };
  }

  function rescheduleWorldTimeScheduledEvent(eventId = "", scheduledAt = "", options = {}) {
    const event = eventsById.get(normalizeId(eventId));
    if (!event) return { ok: false, reason: "SCHEDULED_EVENT_NOT_FOUND" };
    const revisionError = validateExpectedRevision(event, options.expectedRevision);
    if (revisionError) return revisionError;
    if (!MUTABLE_STATUSES.has(event.status)) return { ok: false, reason: "SCHEDULED_EVENT_NOT_RESCHEDULABLE", event: clone(event) };
    const nextTime = normalizeIso(scheduledAt);
    if (!nextTime) return { ok: false, reason: "SCHEDULED_EVENT_TIME_INVALID" };
    event.scheduledAt = nextTime;
    event.executionKey = makeExecutionKey(event);
    const updated = mutateEvent(event, {
      status: "SCHEDULED",
      failedAt: "",
      processingStartedAt: "",
      lastError: null
    }, "SCHEDULED_EVENT_RESCHEDULED");
    return { ok: true, reason: "SCHEDULED_EVENT_RESCHEDULED", event: updated };
  }

  function retryWorldTimeScheduledEvent(eventId = "", options = {}) {
    const event = eventsById.get(normalizeId(eventId));
    if (!event) return { ok: false, reason: "SCHEDULED_EVENT_NOT_FOUND" };
    const revisionError = validateExpectedRevision(event, options.expectedRevision);
    if (revisionError) return revisionError;
    if (event.status !== "FAILED") return { ok: false, reason: "SCHEDULED_EVENT_NOT_FAILED", event: clone(event) };
    if (event.attemptCount >= event.maxAttempts && options.force !== true) {
      return { ok: false, reason: "SCHEDULED_EVENT_MAX_ATTEMPTS_REACHED", event: clone(event) };
    }
    const updated = mutateEvent(event, {
      status: "SCHEDULED",
      retryCount: Number(event.retryCount || 0) + 1,
      failedAt: "",
      processingStartedAt: "",
      lastError: null
    }, "SCHEDULED_EVENT_RETRY_SCHEDULED");
    return { ok: true, reason: "SCHEDULED_EVENT_RETRY_SCHEDULED", event: updated };
  }

  function registerWorldTimeScheduledEventHandler(handlerId = "", handler, options = {}) {
    const id = normalizeId(handlerId);
    if (!id) return { ok: false, reason: "SCHEDULED_EVENT_HANDLER_ID_REQUIRED" };
    if (typeof handler !== "function") return { ok: false, reason: "SCHEDULED_EVENT_HANDLER_FUNCTION_REQUIRED" };
    if (handlersById.has(id) && options.replace !== true) return { ok: false, reason: "SCHEDULED_EVENT_HANDLER_DUPLICATE", handlerId: id };
    handlersById.set(id, { handler, metadata: clone(options.metadata || {}) });
    window.dispatchEvent?.(new CustomEvent("ws:world-time-scheduled-event-handler-registered", { detail: { handlerId: id } }));
    if (options.reconcileDue !== false) {
      queueMicrotask(() => reconcileWorldTimeScheduledEvents({ source: `HANDLER_REGISTERED:${id}` }).catch((error) => {
        console.warn("W&S scheduled event reconciliation failed after handler registration.", error);
      }));
    }
    return { ok: true, reason: "SCHEDULED_EVENT_HANDLER_REGISTERED", handlerId: id };
  }

  function unregisterWorldTimeScheduledEventHandler(handlerId = "") {
    const id = normalizeId(handlerId);
    const removed = handlersById.delete(id);
    return { ok: removed, reason: removed ? "SCHEDULED_EVENT_HANDLER_UNREGISTERED" : "SCHEDULED_EVENT_HANDLER_NOT_FOUND", handlerId: id };
  }

  function dueEventsForRequest(request, blockedIds) {
    return Array.from(eventsById.values())
      .filter((event) => event.status === "SCHEDULED")
      .filter((event) => !blockedIds.has(event.eventId))
      .filter((event) => event.scheduledAt <= request.currentTimeIso)
      .filter((event) => request.includeOverdue || event.scheduledAt > request.previousTimeIso)
      .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt) || left.eventId.localeCompare(right.eventId));
  }

  function restoreCompletedFromReceipt(event, receipt, request) {
    return mutateEvent(event, {
      status: "COMPLETED",
      executedAt: receipt.executedAt || event.scheduledAt,
      completedAt: receipt.completedAt || event.scheduledAt,
      processedAtCampaignTime: receipt.processedAtCampaignTime || request.currentTimeIso,
      processingStartedAt: "",
      lastError: null,
      result: clone(receipt.result || {})
    }, "SCHEDULED_EVENT_RECEIPT_REPLAY", { updatedAt: request.currentTimeIso });
  }

  async function executeScheduledEvent(event, request, summary) {
    const executionKey = event.executionKey || makeExecutionKey(event);
    const receipt = receiptsByExecutionKey.get(executionKey);
    if (receipt) {
      const updated = restoreCompletedFromReceipt(event, receipt, request);
      summary.replayed += 1;
      summary.results.push({ eventId: event.eventId, status: "REPLAYED", reason: "SCHEDULED_EVENT_RECEIPT_REPLAY", event: updated });
      return;
    }

    const registration = handlersById.get(event.handlerId);
    if (!registration) {
      summary.blocked += 1;
      summary.blockedEventIds.push(event.eventId);
      summary.results.push({ eventId: event.eventId, status: "BLOCKED", reason: "SCHEDULED_EVENT_HANDLER_NOT_REGISTERED" });
      return "BLOCKED";
    }

    const processingStartedAt = request.currentTimeIso;
    mutateEvent(event, {
      status: "PROCESSING",
      attemptCount: Number(event.attemptCount || 0) + 1,
      processingStartedAt,
      executionKey,
      lastError: null
    }, "SCHEDULED_EVENT_PROCESSING", { updatedAt: processingStartedAt });

    let handlerResult;
    let handlerError = null;
    try {
      handlerResult = await registration.handler(clone(event), {
        executionKey,
        idempotencyKey: executionKey,
        previousTimeIso: request.previousTimeIso,
        currentTimeIso: request.currentTimeIso,
        scheduledAt: event.scheduledAt,
        campaignTimeRevision: request.campaignTimeRevision,
        source: request.source,
        scheduleWorldTimeEvent,
        scheduleWorldTimeEventDuringAdvance,
        getWorldTimeScheduledEvent
      });
      if (handlerResult?.ok === false) {
        handlerError = {
          code: normalizeToken(handlerResult.reason, "SCHEDULED_EVENT_HANDLER_REJECTED"),
          message: normalizeId(handlerResult.message || handlerResult.reason || "Handler rejected the event."),
          detail: clone(handlerResult)
        };
      }
    } catch (error) {
      handlerError = {
        code: normalizeToken(error?.code || error?.name, "SCHEDULED_EVENT_HANDLER_ERROR"),
        message: normalizeId(error?.message || String(error || "Handler failed."))
      };
    }

    if (handlerError) {
      const failed = mutateEvent(event, {
        status: "FAILED",
        failedAt: event.scheduledAt,
        processedAtCampaignTime: request.currentTimeIso,
        processingStartedAt: "",
        lastError: handlerError,
        result: null
      }, "SCHEDULED_EVENT_FAILED", { updatedAt: request.currentTimeIso });
      summary.failed += 1;
      summary.results.push({ eventId: event.eventId, status: "FAILED", reason: handlerError.code, event: failed });
      window.dispatchEvent?.(new CustomEvent("ws:world-time-scheduled-event-failed", {
        detail: { event: clone(failed), executionKey, error: clone(handlerError), storeRevision }
      }));
      return;
    }

    const normalizedResult = handlerResult && typeof handlerResult === "object" ? clone(handlerResult) : { ok: true, value: handlerResult };
    const completedAt = event.scheduledAt;
    const completed = mutateEvent(event, {
      status: "COMPLETED",
      executedAt: event.scheduledAt,
      completedAt,
      processedAtCampaignTime: request.currentTimeIso,
      processingStartedAt: "",
      lastError: null,
      result: normalizedResult
    }, "SCHEDULED_EVENT_COMPLETED", { updatedAt: request.currentTimeIso });

    const completedReceipt = normalizeReceipt({
      executionKey,
      eventId: event.eventId,
      handlerId: event.handlerId,
      eventType: event.eventType,
      scheduledAt: event.scheduledAt,
      executedAt: event.scheduledAt,
      processedAtCampaignTime: request.currentTimeIso,
      completedAt,
      attemptCount: completed.attemptCount,
      result: normalizedResult
    });
    receiptsByExecutionKey.set(executionKey, completedReceipt);
    storeRevision += 1;
    pruneState();
    persistState();

    summary.completed += 1;
    summary.results.push({ eventId: event.eventId, status: "COMPLETED", reason: "SCHEDULED_EVENT_COMPLETED", event: completed });
    window.dispatchEvent?.(new CustomEvent("ws:world-time-scheduled-event-completed", {
      detail: { event: clone(completed), receipt: clone(completedReceipt), executionKey, storeRevision }
    }));
  }

  async function processRequest(options = {}) {
    const currentTimeIso = normalizeIso(options.currentTimeIso || options.campaignTimeIso || app.getCampaignTimeIso?.() || app.CAMPAIGN_TIME_ISO);
    const suppliedPrevious = normalizeIso(options.previousTimeIso || options.fromTimeIso);
    const includeOverdue = options.includeOverdue === true || !suppliedPrevious;
    const previousTimeIso = suppliedPrevious || lastProcessedTimeIso || "0000-01-01T00:00:00.000Z";
    if (!currentTimeIso) return { ok: false, reason: "SCHEDULED_EVENT_CURRENT_TIME_INVALID" };
    if (!includeOverdue && Date.parse(currentTimeIso) < Date.parse(previousTimeIso)) {
      return { ok: false, reason: "SCHEDULED_EVENT_BACKWARD_INTERVAL_UNSUPPORTED", previousTimeIso, currentTimeIso };
    }

    const request = {
      previousTimeIso,
      currentTimeIso,
      includeOverdue,
      campaignTimeRevision: Number(options.campaignTimeRevision || options.revision || 0),
      source: normalizeId(options.source || options.reason || "WORLD_TIME_PROCESS")
    };
    const summary = {
      ok: true,
      reason: "SCHEDULED_EVENTS_PROCESSED",
      previousTimeIso,
      currentTimeIso,
      includeOverdue,
      completed: 0,
      failed: 0,
      blocked: 0,
      replayed: 0,
      processed: 0,
      blockedEventIds: [],
      results: []
    };
    const blockedIds = new Set();

    for (let iteration = 0; iteration < PROCESS_LIMIT; iteration += 1) {
      const [event] = dueEventsForRequest(request, blockedIds);
      if (!event) break;
      const outcome = await executeScheduledEvent(event, request, summary);
      if (outcome === "BLOCKED") blockedIds.add(event.eventId);
      summary.processed += 1;
      if (iteration === PROCESS_LIMIT - 1 && dueEventsForRequest(request, blockedIds).length) {
        summary.ok = false;
        summary.reason = "SCHEDULED_EVENT_PROCESS_LIMIT_REACHED";
      }
    }

    if (!lastProcessedTimeIso || currentTimeIso > lastProcessedTimeIso) lastProcessedTimeIso = currentTimeIso;
    storeRevision += 1;
    persistState();
    window.dispatchEvent?.(new CustomEvent("ws:world-time-scheduled-events-processed", {
      detail: { ...clone(summary), storeRevision }
    }));
    return { ...summary, storeRevision };
  }

  function processScheduledWorldTimeEvents(options = {}) {
    const task = () => processRequest(options);
    processingChain = processingChain.then(task, task);
    return processingChain;
  }

  function reconcileWorldTimeScheduledEvents(options = {}) {
    return processScheduledWorldTimeEvents({
      ...options,
      includeOverdue: true,
      currentTimeIso: options.currentTimeIso || app.getCampaignTimeIso?.() || app.CAMPAIGN_TIME_ISO
    });
  }

  function getWorldTimeScheduledEventsDiagnostics() {
    const events = Array.from(eventsById.values());
    return {
      schemaVersion: SCHEMA_VERSION,
      storeRevision,
      lastProcessedTimeIso,
      eventCount: events.length,
      receiptCount: receiptsByExecutionKey.size,
      handlerIds: Array.from(handlersById.keys()).sort(),
      statusCounts: events.reduce((counts, event) => {
        counts[event.status] = Number(counts[event.status] || 0) + 1;
        return counts;
      }, {})
    };
  }

  function exportWorldTimeScheduledEventsState() {
    return clone(serializeState());
  }

  function importWorldTimeScheduledEventsState(state = {}, options = {}) {
    return replaceState(state, { persist: options.persist !== false });
  }

  function resetWorldTimeScheduledEvents() {
    eventsById = new Map();
    eventIdByIdempotencyKey = new Map();
    receiptsByExecutionKey = new Map();
    storeRevision = 0;
    lastProcessedTimeIso = "";
    window.localStorage?.removeItem(STORAGE_KEY);
    window.localStorage?.removeItem(STORAGE_SCHEMA_KEY);
    return getWorldTimeScheduledEventsDiagnostics();
  }

  replaceState(readStoredState() || {}, { persist: false });

  app.WORLD_TIME_SCHEDULED_EVENTS_SCHEMA_VERSION = SCHEMA_VERSION;
  app.scheduleWorldTimeEvent = scheduleWorldTimeEvent;
  app.scheduleWorldTimeEventDuringAdvance = scheduleWorldTimeEventDuringAdvance;
  app.getWorldTimeScheduledEvent = getWorldTimeScheduledEvent;
  app.getWorldTimeScheduledEvents = getWorldTimeScheduledEvents;
  app.cancelWorldTimeScheduledEvent = cancelWorldTimeScheduledEvent;
  app.rescheduleWorldTimeScheduledEvent = rescheduleWorldTimeScheduledEvent;
  app.retryWorldTimeScheduledEvent = retryWorldTimeScheduledEvent;
  app.registerWorldTimeScheduledEventHandler = registerWorldTimeScheduledEventHandler;
  app.unregisterWorldTimeScheduledEventHandler = unregisterWorldTimeScheduledEventHandler;
  app.processScheduledWorldTimeEvents = processScheduledWorldTimeEvents;
  app.reconcileWorldTimeScheduledEvents = reconcileWorldTimeScheduledEvents;
  app.getWorldTimeScheduledEventsDiagnostics = getWorldTimeScheduledEventsDiagnostics;
  app.exportWorldTimeScheduledEventsState = exportWorldTimeScheduledEventsState;
  app.importWorldTimeScheduledEventsState = importWorldTimeScheduledEventsState;
  app.resetWorldTimeScheduledEvents = resetWorldTimeScheduledEvents;

  window.addEventListener?.("ws:campaign-time-updated", (event) => {
    const detail = event?.detail || {};
    queueMicrotask(() => {
      processScheduledWorldTimeEvents({
        previousTimeIso: detail.previousTimeIso,
        currentTimeIso: detail.currentTimeIso || detail.campaignTimeIso,
        campaignTimeRevision: detail.revision,
        source: detail.reason || "CAMPAIGN_TIME_UPDATED"
      }).catch((error) => console.warn("W&S scheduled event processing failed.", error));
    });
  });

  window.dispatchEvent?.(new CustomEvent("ws:world-time-scheduled-events-ready", {
    detail: { schemaVersion: SCHEMA_VERSION, storageKey: STORAGE_KEY }
  }));
})(window.WS_APP);
