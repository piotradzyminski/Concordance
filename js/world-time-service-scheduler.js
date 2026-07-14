window.WS_APP = window.WS_APP || {};

(function initWorldTimeServiceScheduler() {
  const app = window.WS_APP;
  const STORAGE_KEY = "ws_world_time_service_scheduler_v1";
  const STORAGE_SCHEMA_KEY = "ws_world_time_service_scheduler_schema";
  const STORAGE_SCHEMA_VERSION = "world_time_service_completion_scheduler_1_1x";
  const LEGACY_STORAGE_SCHEMA_VERSIONS = new Set(["world_time_service_scheduler_1_0x"]);
  const STORE_SCHEMA_VERSION = 2;
  const RECEIPT_LIMIT = 512;
  const SOURCE = "WORLD_TIME_SERVICE_SCHEDULER";
  const START_BLOCKED_REASONS = new Set([
    "SERVICE_PAYMENT_AUTHORIZATION_REQUIRED",
    "SERVICE_ORDER_REVISION_CONFLICT",
    "SERVICE_ORDER_TRANSITION_INVALID",
    "SERVICE_ORDER_STATUS_INVALID"
  ]);
  const COMPLETION_BLOCKED_REASONS = new Set([
    "SERVICE_COMPLETION_HANDLER_REQUIRED",
    "SERVICE_COMPLETION_HANDLER_RESULT_REQUIRED",
    "SERVICE_COMPLETION_NOT_COMMITTED",
    "SERVICE_COMPLETION_RESULT_INVALID",
    "SERVICE_PAYMENT_CAPTURE_REQUIRED",
    "SERVICE_EXECUTION_CONFIRMATION_REQUIRED",
    "SERVICE_ITEM_TRANSACTION_COMMIT_REQUIRED",
    "SERVICE_ITEM_TRANSACTION_READ_API_UNAVAILABLE",
    "SERVICE_ORDER_REVISION_CONFLICT",
    "SERVICE_ORDER_TRANSITION_INVALID",
    "SERVICE_ORDER_STATUS_INVALID"
  ]);
  const TERMINAL_SERVICE_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

  let receiptsByKey = new Map();
  let completionHandlers = new Map();
  let schedulerRevision = 0;
  let lastProcessedCampaignDateIso = "";
  let lastSummary = null;
  let persistenceTimer = 0;
  let startProcessing = false;
  let completionProcessing = false;
  let lifecycleProcessing = false;

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

  function uniqueStrings(values = [], normalizer = normalizeId) {
    return [...new Set((Array.isArray(values) ? values : [values]).map(normalizer).filter(Boolean))];
  }

  function isIsoDate(value = "") {
    const iso = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const parsed = new Date(`${iso}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso;
  }

  function toWorldDateIso(value = "") {
    const raw = normalizeId(value);
    if (isIsoDate(raw)) return raw;
    const prefix = raw.slice(0, 10);
    if (isIsoDate(prefix)) return prefix;
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : "";
  }

  function getCampaignDateIso() {
    const value = app.getCampaignDateIso?.() || app.CAMPAIGN_DATE_ISO || "";
    return toWorldDateIso(value);
  }

  function makeReceiptKey(order = {}, campaignDateIso = "", phase = "START") {
    const normalizedPhase = normalizeToken(phase, "START");
    const dueAt = normalizedPhase === "COMPLETE"
      ? toWorldDateIso(order.estimatedEndAt)
      : toWorldDateIso(order.scheduledStartAt);
    return [
      normalizedPhase,
      normalizeId(order.serviceOrderId),
      Number(order.revision || 0),
      dueAt,
      toWorldDateIso(campaignDateIso)
    ].join("|");
  }

  function normalizeReceipt(source = {}) {
    const phase = normalizeToken(source.phase || (source.estimatedEndAt ? "COMPLETE" : "START"), "START");
    const normalized = {
      key: normalizeId(source.key),
      phase,
      serviceOrderId: normalizeId(source.serviceOrderId),
      serviceOrderRevision: Number(source.serviceOrderRevision || 0),
      citizenId: normalizeId(source.citizenId),
      providerId: normalizeId(source.providerId),
      serviceDefinitionId: normalizeId(source.serviceDefinitionId),
      serviceType: normalizeToken(source.serviceType),
      domain: normalizeToken(source.domain),
      subjectInstanceIds: uniqueStrings(source.subjectInstanceIds),
      scheduledStartAt: toWorldDateIso(source.scheduledStartAt),
      estimatedEndAt: toWorldDateIso(source.estimatedEndAt),
      campaignDateIso: toWorldDateIso(source.campaignDateIso),
      status: normalizeToken(source.status, "SKIPPED"),
      reason: normalizeToken(source.reason, "SCHEDULER_RESULT_RECORDED"),
      handlerId: normalizeToken(source.handlerId),
      requestId: normalizeId(source.requestId),
      resultingOrderRevision: Number(source.resultingOrderRevision || 0),
      attemptedAt: normalizeId(source.attemptedAt) || new Date().toISOString()
    };
    if (!normalized.key && normalized.serviceOrderId) {
      const pseudoOrder = {
        serviceOrderId: normalized.serviceOrderId,
        revision: normalized.serviceOrderRevision,
        scheduledStartAt: normalized.scheduledStartAt,
        estimatedEndAt: normalized.estimatedEndAt
      };
      normalized.key = makeReceiptKey(pseudoOrder, normalized.campaignDateIso, normalized.phase);
    }
    return normalized;
  }

  function trimReceipts() {
    while (receiptsByKey.size > RECEIPT_LIMIT) {
      const oldest = receiptsByKey.keys().next().value;
      if (!oldest) break;
      receiptsByKey.delete(oldest);
    }
  }

  function recordReceipt(order = {}, campaignDateIso = "", phase = "START", status = "SKIPPED", reason = "", detail = {}) {
    const definition = detail.serviceDefinition || app.getServiceDefinition?.(order.serviceDefinitionId) || null;
    const key = makeReceiptKey(order, campaignDateIso, phase);
    const receipt = normalizeReceipt({
      key,
      phase,
      serviceOrderId: order.serviceOrderId,
      serviceOrderRevision: order.revision,
      citizenId: order.citizenId,
      providerId: order.providerId,
      serviceDefinitionId: order.serviceDefinitionId,
      serviceType: definition?.serviceType,
      domain: definition?.domain,
      subjectInstanceIds: Array.isArray(order.subjectRefs?.instanceIds) ? order.subjectRefs.instanceIds : [],
      scheduledStartAt: order.scheduledStartAt,
      estimatedEndAt: order.estimatedEndAt,
      campaignDateIso,
      status,
      reason,
      handlerId: detail.handlerId,
      requestId: detail.requestId,
      resultingOrderRevision: detail.resultingOrderRevision,
      attemptedAt: new Date().toISOString()
    });
    receiptsByKey.set(key, receipt);
    trimReceipts();
    schedulerRevision += 1;
    schedulePersistence();
    return clone(receipt);
  }

  function serializeState() {
    return {
      schemaVersion: STORE_SCHEMA_VERSION,
      schedulerSchemaVersion: STORAGE_SCHEMA_VERSION,
      revision: schedulerRevision,
      lastProcessedCampaignDateIso,
      lastSummary: clone(lastSummary),
      receipts: Array.from(receiptsByKey.values()).slice(-RECEIPT_LIMIT).map(clone)
    };
  }

  function readStoredState() {
    try {
      const schema = normalizeId(window.localStorage?.getItem(STORAGE_SCHEMA_KEY));
      if (schema !== STORAGE_SCHEMA_VERSION && !LEGACY_STORAGE_SCHEMA_VERSIONS.has(schema)) return null;
      const raw = window.localStorage?.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      if (![1, STORE_SCHEMA_VERSION].includes(Number(parsed.schemaVersion))) return null;
      return parsed;
    } catch (error) {
      console.warn("W&S world-time service scheduler could not read localStorage.", error);
      return null;
    }
  }

  function replaceState(source = {}, options = {}) {
    const receipts = Array.isArray(source?.receipts) ? source.receipts : [];
    receiptsByKey = new Map();
    receipts
      .map(normalizeReceipt)
      .filter((receipt) => receipt.key && receipt.serviceOrderId)
      .slice(-RECEIPT_LIMIT)
      .forEach((receipt) => receiptsByKey.set(receipt.key, receipt));
    schedulerRevision = Math.max(0, Number(source?.revision || 0));
    lastProcessedCampaignDateIso = toWorldDateIso(source?.lastProcessedCampaignDateIso);
    lastSummary = source?.lastSummary && typeof source.lastSummary === "object" ? clone(source.lastSummary) : null;
    trimReceipts();
    if (options.persist !== false) flushWorldTimeServiceSchedulerPersistence();
    return getWorldTimeServiceSchedulerDiagnostics();
  }

  function initializeState() {
    replaceState(readStoredState() || {}, { persist: false });
  }

  function flushWorldTimeServiceSchedulerPersistence() {
    if (persistenceTimer) {
      window.clearTimeout?.(persistenceTimer);
      persistenceTimer = 0;
    }
    try {
      window.localStorage?.setItem(STORAGE_SCHEMA_KEY, STORAGE_SCHEMA_VERSION);
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(serializeState()));
      return true;
    } catch (error) {
      console.warn("W&S world-time service scheduler could not persist localStorage.", error);
      return false;
    }
  }

  function schedulePersistence() {
    if (persistenceTimer) window.clearTimeout?.(persistenceTimer);
    persistenceTimer = window.setTimeout?.(flushWorldTimeServiceSchedulerPersistence, 80) || 0;
  }

  function listServiceOrdersByStatus(status = "", filters = {}) {
    if (typeof app.getServiceOrders !== "function") return [];
    const normalizedStatus = normalizeToken(status);
    const selectedIds = new Set(uniqueStrings(filters.serviceOrderIds));
    const dateField = normalizedStatus === "IN_PROGRESS" ? "estimatedEndAt" : "scheduledStartAt";
    return app.getServiceOrders({
      statuses: [normalizedStatus],
      includeTerminal: false,
      citizenId: filters.citizenId,
      providerId: filters.providerId,
      serviceDefinitionId: filters.serviceDefinitionId
    })
      .filter((order) => !selectedIds.size || selectedIds.has(normalizeId(order.serviceOrderId)))
      .sort((left, right) => String(toWorldDateIso(left?.[dateField])).localeCompare(String(toWorldDateIso(right?.[dateField])))
        || String(left.serviceOrderId).localeCompare(String(right.serviceOrderId)));
  }

  function listScheduledOrders(filters = {}) {
    return listServiceOrdersByStatus("SCHEDULED", filters);
  }

  function listInProgressOrders(filters = {}) {
    return listServiceOrdersByStatus("IN_PROGRESS", filters);
  }

  function classifyStartFailure(reason = "") {
    const normalized = normalizeToken(reason, "SERVICE_SCHEDULER_START_FAILED");
    return START_BLOCKED_REASONS.has(normalized) ? "BLOCKED" : "FAILED";
  }

  function classifyCompletionFailure(reason = "", requestedStatus = "") {
    const normalizedReason = normalizeToken(reason, "SERVICE_COMPLETION_HANDLER_FAILED");
    const normalizedStatus = normalizeToken(requestedStatus);
    if (normalizedStatus === "BLOCKED" || COMPLETION_BLOCKED_REASONS.has(normalizedReason)) return "BLOCKED";
    if (["PENDING", "REQUESTED", "IN_PROGRESS"].includes(normalizedStatus)) return "PENDING";
    return "FAILED";
  }

  function startDueOrder(order = {}, campaignDateIso = "", options = {}) {
    const scheduledStartAt = toWorldDateIso(order.scheduledStartAt);
    const receiptKey = makeReceiptKey(order, campaignDateIso, "START");
    const existing = receiptsByKey.get(receiptKey) || null;
    if (existing && options.force !== true) {
      return { ok: true, status: "SKIPPED", reason: "SCHEDULER_RECEIPT_REPLAY", order, receipt: clone(existing) };
    }
    if (!scheduledStartAt) {
      const receipt = recordReceipt(order, campaignDateIso, "START", "BLOCKED", "SCHEDULED_START_INVALID");
      return { ok: false, status: "BLOCKED", reason: "SCHEDULED_START_INVALID", order, receipt };
    }
    if (scheduledStartAt > campaignDateIso) {
      return { ok: true, status: "NOT_DUE", reason: "SERVICE_ORDER_NOT_DUE", order, receipt: null };
    }
    if (typeof app.startServiceOrder !== "function") {
      const receipt = recordReceipt(order, campaignDateIso, "START", "FAILED", "SERVICE_START_API_UNAVAILABLE");
      return { ok: false, status: "FAILED", reason: "SERVICE_START_API_UNAVAILABLE", order, receipt };
    }

    const idempotencyKey = `world-time-service-start:${normalizeId(order.serviceOrderId)}:${scheduledStartAt}`;
    const result = app.startServiceOrder(order.serviceOrderId, {
      idempotencyKey,
      expectedRevision: Number(order.revision || 0),
      startedAt: campaignDateIso,
      source: SOURCE,
      metadata: {
        schedulerSchemaVersion: STORAGE_SCHEMA_VERSION,
        schedulerCampaignDateIso: campaignDateIso,
        schedulerReceiptKey: receiptKey
      }
    }) || { ok: false, reason: "SERVICE_START_RESULT_MISSING", order };

    const status = result.ok ? "STARTED" : classifyStartFailure(result.reason);
    const resolvedOrder = result.order || order;
    const receipt = recordReceipt(order, campaignDateIso, "START", status, result.reason || `SERVICE_ORDER_${status}`, {
      resultingOrderRevision: resolvedOrder.revision
    });
    return {
      ok: Boolean(result.ok),
      status,
      reason: normalizeToken(result.reason, result.ok ? "SERVICE_ORDER_IN_PROGRESS" : "SERVICE_SCHEDULER_START_FAILED"),
      replayed: result.replayed === true,
      order: clone(resolvedOrder),
      receipt
    };
  }

  function normalizeCompletionHandlerOptions(options = {}) {
    return {
      serviceDefinitionIds: uniqueStrings(options.serviceDefinitionIds),
      serviceTypes: uniqueStrings(options.serviceTypes, normalizeToken),
      domains: uniqueStrings(options.domains, normalizeToken),
      providerIds: uniqueStrings(options.providerIds),
      priority: Number.isFinite(Number(options.priority)) ? Number(options.priority) : 0,
      defaultHandler: options.defaultHandler === true
    };
  }

  function registerWorldTimeServiceCompletionHandler(handlerId = "", handler = null, options = {}) {
    const normalizedId = normalizeToken(handlerId);
    if (!normalizedId || typeof handler !== "function") return false;
    completionHandlers.set(normalizedId, {
      handlerId: normalizedId,
      handler,
      options: normalizeCompletionHandlerOptions(options)
    });
    deferCompletionRun({
      campaignDateIso: getCampaignDateIso(),
      source: "COMPLETION_HANDLER_REGISTERED",
      forceBlocked: true,
      handlerIds: [normalizedId]
    });
    return true;
  }

  function unregisterWorldTimeServiceCompletionHandler(handlerId = "") {
    return completionHandlers.delete(normalizeToken(handlerId));
  }

  function completionHandlerMatches(entry = {}, order = {}, definition = {}) {
    const options = entry.options || {};
    if (options.serviceDefinitionIds.length && !options.serviceDefinitionIds.includes(normalizeId(order.serviceDefinitionId))) return false;
    if (options.serviceTypes.length && !options.serviceTypes.includes(normalizeToken(definition.serviceType))) return false;
    if (options.domains.length && !options.domains.includes(normalizeToken(definition.domain))) return false;
    if (options.providerIds.length && !options.providerIds.includes(normalizeId(order.providerId))) return false;
    return true;
  }

  function completionHandlerSpecificity(entry = {}) {
    const options = entry.options || {};
    return Number(options.serviceDefinitionIds?.length > 0) * 8
      + Number(options.serviceTypes?.length > 0) * 4
      + Number(options.domains?.length > 0) * 2
      + Number(options.providerIds?.length > 0)
      + Number(options.defaultHandler === true) * -1;
  }

  function resolveCompletionHandler(order = {}, definition = {}, options = {}) {
    const requestedHandlerIds = new Set(uniqueStrings(options.handlerIds, normalizeToken));
    const candidates = Array.from(completionHandlers.values())
      .filter((entry) => !requestedHandlerIds.size || requestedHandlerIds.has(entry.handlerId))
      .filter((entry) => completionHandlerMatches(entry, order, definition))
      .sort((left, right) => Number(right.options.priority || 0) - Number(left.options.priority || 0)
        || completionHandlerSpecificity(right) - completionHandlerSpecificity(left)
        || left.handlerId.localeCompare(right.handlerId));
    return candidates[0] || null;
  }

  function emitCompletionRequested(detail = {}) {
    window.dispatchEvent?.(new CustomEvent("ws:world-time-service-completion-requested", {
      detail: clone(detail)
    }));
  }

  async function requestDueCompletion(order = {}, campaignDateIso = "", options = {}) {
    const estimatedEndAt = toWorldDateIso(order.estimatedEndAt);
    const receiptKey = makeReceiptKey(order, campaignDateIso, "COMPLETE");
    const existing = receiptsByKey.get(receiptKey) || null;
    const replayableBlocked = options.forceBlocked === true && existing && ["BLOCKED", "FAILED", "PENDING"].includes(existing.status);
    if (existing && options.force !== true && !replayableBlocked) {
      return { ok: true, status: "SKIPPED", reason: "SCHEDULER_RECEIPT_REPLAY", order, receipt: clone(existing) };
    }
    if (!estimatedEndAt) {
      const receipt = recordReceipt(order, campaignDateIso, "COMPLETE", "BLOCKED", "SERVICE_ESTIMATED_END_REQUIRED");
      return { ok: false, status: "BLOCKED", reason: "SERVICE_ESTIMATED_END_REQUIRED", order, receipt };
    }
    if (estimatedEndAt > campaignDateIso) {
      return { ok: true, status: "NOT_DUE", reason: "SERVICE_COMPLETION_NOT_DUE", order, receipt: null };
    }

    const definition = app.getServiceDefinition?.(order.serviceDefinitionId) || {};
    const handlerEntry = resolveCompletionHandler(order, definition, options);
    if (!handlerEntry) {
      const receipt = recordReceipt(order, campaignDateIso, "COMPLETE", "BLOCKED", "SERVICE_COMPLETION_HANDLER_REQUIRED", {
        serviceDefinition: definition
      });
      return { ok: false, status: "BLOCKED", reason: "SERVICE_COMPLETION_HANDLER_REQUIRED", order, receipt };
    }

    const requestId = `world-time-service-completion:${normalizeId(order.serviceOrderId)}:${Number(order.revision || 0)}:${estimatedEndAt}`;
    const request = {
      requestId,
      idempotencyKey: requestId,
      source: SOURCE,
      handlerId: handlerEntry.handlerId,
      schedulerSchemaVersion: STORAGE_SCHEMA_VERSION,
      schedulerCampaignDateIso: campaignDateIso,
      schedulerReceiptKey: receiptKey,
      expectedRevision: Number(order.revision || 0),
      serviceOrderId: normalizeId(order.serviceOrderId),
      serviceDefinitionId: normalizeId(order.serviceDefinitionId),
      serviceType: normalizeToken(definition.serviceType),
      domain: normalizeToken(definition.domain),
      citizenId: normalizeId(order.citizenId),
      providerId: normalizeId(order.providerId),
      subjectInstanceIds: uniqueStrings(order.subjectRefs?.instanceIds),
      estimatedEndAt,
      order: clone(order),
      serviceDefinition: clone(definition)
    };
    emitCompletionRequested(request);

    let handlerResult;
    try {
      handlerResult = await handlerEntry.handler(clone(request));
    } catch (error) {
      const receipt = recordReceipt(order, campaignDateIso, "COMPLETE", "FAILED", "SERVICE_COMPLETION_HANDLER_EXCEPTION", {
        serviceDefinition: definition,
        handlerId: handlerEntry.handlerId,
        requestId
      });
      return {
        ok: false,
        status: "FAILED",
        reason: "SERVICE_COMPLETION_HANDLER_EXCEPTION",
        error: error?.message || String(error),
        order,
        receipt
      };
    }

    if (!handlerResult || typeof handlerResult !== "object") {
      const receipt = recordReceipt(order, campaignDateIso, "COMPLETE", "BLOCKED", "SERVICE_COMPLETION_HANDLER_RESULT_REQUIRED", {
        serviceDefinition: definition,
        handlerId: handlerEntry.handlerId,
        requestId
      });
      return { ok: false, status: "BLOCKED", reason: "SERVICE_COMPLETION_HANDLER_RESULT_REQUIRED", order, receipt };
    }

    let resolvedOrder = app.getServiceOrder?.(order.serviceOrderId) || handlerResult.order || order;
    if (
      handlerResult.ok === true
      && normalizeToken(resolvedOrder.status) === "IN_PROGRESS"
      && handlerResult.pending !== true
      && (handlerResult.serviceResult || handlerResult.result)
    ) {
      if (typeof app.completeServiceOrder !== "function") {
        const receipt = recordReceipt(order, campaignDateIso, "COMPLETE", "FAILED", "SERVICE_COMPLETE_API_UNAVAILABLE", {
          serviceDefinition: definition,
          handlerId: handlerEntry.handlerId,
          requestId
        });
        return { ok: false, status: "FAILED", reason: "SERVICE_COMPLETE_API_UNAVAILABLE", order: resolvedOrder, receipt };
      }
      const completeResult = app.completeServiceOrder(order.serviceOrderId, handlerResult.serviceResult || handlerResult.result, {
        ...(handlerResult.completionOptions || {}),
        idempotencyKey: `world-time-service-complete:${normalizeId(order.serviceOrderId)}:${estimatedEndAt}`,
        expectedRevision: Number(resolvedOrder.revision || order.revision || 0),
        completedAt: normalizeId(handlerResult.completedAt) || campaignDateIso,
        source: SOURCE,
        metadata: {
          ...(handlerResult.completionOptions?.metadata || {}),
          schedulerSchemaVersion: STORAGE_SCHEMA_VERSION,
          schedulerCampaignDateIso: campaignDateIso,
          schedulerReceiptKey: receiptKey,
          schedulerCompletionHandlerId: handlerEntry.handlerId,
          schedulerCompletionRequestId: requestId
        }
      }) || { ok: false, reason: "SERVICE_COMPLETE_RESULT_MISSING", order: resolvedOrder };
      if (!completeResult.ok) {
        const status = classifyCompletionFailure(completeResult.reason, completeResult.status);
        const receipt = recordReceipt(order, campaignDateIso, "COMPLETE", status, completeResult.reason, {
          serviceDefinition: definition,
          handlerId: handlerEntry.handlerId,
          requestId,
          resultingOrderRevision: completeResult.order?.revision || resolvedOrder.revision
        });
        return {
          ok: false,
          status,
          reason: normalizeToken(completeResult.reason, "SERVICE_COMPLETION_COMMIT_FAILED"),
          handlerResult: clone(handlerResult),
          order: clone(completeResult.order || resolvedOrder),
          receipt
        };
      }
      resolvedOrder = completeResult.order || app.getServiceOrder?.(order.serviceOrderId) || resolvedOrder;
    }

    const resolvedStatus = normalizeToken(resolvedOrder.status);
    let status = "FAILED";
    let reason = normalizeToken(handlerResult.reason, "SERVICE_COMPLETION_HANDLER_FAILED");
    let ok = false;
    if (resolvedStatus === "COMPLETED") {
      status = "COMPLETED";
      reason = normalizeToken(handlerResult.reason, "SERVICE_ORDER_COMPLETED");
      ok = true;
    } else if (resolvedStatus === "FAILED") {
      status = "TERMINAL_FAILED";
      reason = normalizeToken(handlerResult.reason, "SERVICE_ORDER_FAILED");
      ok = handlerResult.ok === true;
    } else if (resolvedStatus === "CANCELLED") {
      status = "TERMINAL_CANCELLED";
      reason = normalizeToken(handlerResult.reason, "SERVICE_ORDER_CANCELLED");
      ok = handlerResult.ok === true;
    } else if (handlerResult.pending === true || ["PENDING", "REQUESTED", "IN_PROGRESS"].includes(normalizeToken(handlerResult.status))) {
      status = "PENDING";
      reason = normalizeToken(handlerResult.reason, "SERVICE_COMPLETION_PENDING");
      ok = true;
    } else if (handlerResult.ok === true) {
      status = "BLOCKED";
      reason = "SERVICE_COMPLETION_NOT_COMMITTED";
    } else {
      status = classifyCompletionFailure(handlerResult.reason, handlerResult.status);
    }

    const receipt = recordReceipt(order, campaignDateIso, "COMPLETE", status, reason, {
      serviceDefinition: definition,
      handlerId: handlerEntry.handlerId,
      requestId,
      resultingOrderRevision: resolvedOrder.revision
    });
    return {
      ok,
      status,
      reason,
      handlerId: handlerEntry.handlerId,
      handlerResult: clone(handlerResult),
      order: clone(resolvedOrder),
      receipt
    };
  }

  function makeStartSummary(campaignDateIso = "", source = "MANUAL") {
    return {
      ok: true,
      phase: "START",
      schedulerVersion: STORAGE_SCHEMA_VERSION,
      campaignDateIso,
      source: normalizeToken(source, "MANUAL"),
      due: 0,
      started: 0,
      blocked: 0,
      failed: 0,
      skipped: 0,
      notDue: 0,
      results: [],
      processedAt: new Date().toISOString(),
      schedulerRevision
    };
  }

  function makeCompletionSummary(campaignDateIso = "", source = "MANUAL") {
    return {
      ok: true,
      phase: "COMPLETE",
      schedulerVersion: STORAGE_SCHEMA_VERSION,
      campaignDateIso,
      source: normalizeToken(source, "MANUAL"),
      due: 0,
      completed: 0,
      terminalFailed: 0,
      terminalCancelled: 0,
      pending: 0,
      blocked: 0,
      failed: 0,
      skipped: 0,
      notDue: 0,
      results: [],
      processedAt: new Date().toISOString(),
      schedulerRevision
    };
  }

  function emitSchedulerSummary(summary = {}) {
    window.dispatchEvent?.(new CustomEvent("ws:world-time-service-scheduler-processed", {
      detail: clone(summary)
    }));
  }

  function emitCompletionSummary(summary = {}) {
    window.dispatchEvent?.(new CustomEvent("ws:world-time-service-completions-processed", {
      detail: clone(summary)
    }));
  }

  function processDueServiceOrders(options = {}) {
    if (startProcessing) {
      return {
        ok: false,
        reason: "WORLD_TIME_SERVICE_START_SCHEDULER_BUSY",
        campaignDateIso: toWorldDateIso(options.campaignDateIso) || getCampaignDateIso()
      };
    }
    const campaignDateIso = toWorldDateIso(options.campaignDateIso) || getCampaignDateIso();
    if (!campaignDateIso) return { ok: false, reason: "CAMPAIGN_DATE_INVALID", campaignDateIso: "" };
    if (typeof app.getServiceOrders !== "function") {
      return { ok: false, reason: "SERVICE_ORDER_READ_API_UNAVAILABLE", campaignDateIso };
    }

    startProcessing = true;
    try {
      const summary = makeStartSummary(campaignDateIso, options.source || "MANUAL");
      const scheduledOrders = listScheduledOrders(options);
      for (const order of scheduledOrders) {
        const scheduledStartAt = toWorldDateIso(order.scheduledStartAt);
        if (scheduledStartAt && scheduledStartAt <= campaignDateIso) summary.due += 1;
        const result = startDueOrder(order, campaignDateIso, options);
        if (result.status === "STARTED") summary.started += 1;
        else if (result.status === "BLOCKED") summary.blocked += 1;
        else if (result.status === "FAILED") summary.failed += 1;
        else if (result.status === "SKIPPED") summary.skipped += 1;
        else if (result.status === "NOT_DUE") summary.notDue += 1;
        summary.results.push({
          serviceOrderId: normalizeId(order.serviceOrderId),
          citizenId: normalizeId(order.citizenId),
          providerId: normalizeId(order.providerId),
          subjectInstanceIds: uniqueStrings(order.subjectRefs?.instanceIds),
          scheduledStartAt,
          previousRevision: Number(order.revision || 0),
          resultingRevision: Number(result.order?.revision || order.revision || 0),
          status: result.status,
          reason: result.reason
        });
      }
      lastProcessedCampaignDateIso = campaignDateIso;
      schedulerRevision += 1;
      summary.schedulerRevision = schedulerRevision;
      lastSummary = clone(summary);
      flushWorldTimeServiceSchedulerPersistence();
      emitSchedulerSummary(summary);
      return clone(summary);
    } finally {
      startProcessing = false;
    }
  }

  async function processDueServiceCompletions(options = {}) {
    if (completionProcessing) {
      return {
        ok: false,
        reason: "WORLD_TIME_SERVICE_COMPLETION_SCHEDULER_BUSY",
        campaignDateIso: toWorldDateIso(options.campaignDateIso) || getCampaignDateIso()
      };
    }
    const campaignDateIso = toWorldDateIso(options.campaignDateIso) || getCampaignDateIso();
    if (!campaignDateIso) return { ok: false, reason: "CAMPAIGN_DATE_INVALID", campaignDateIso: "" };
    if (typeof app.getServiceOrders !== "function") {
      return { ok: false, reason: "SERVICE_ORDER_READ_API_UNAVAILABLE", campaignDateIso };
    }

    completionProcessing = true;
    try {
      const summary = makeCompletionSummary(campaignDateIso, options.source || "MANUAL");
      const inProgressOrders = listInProgressOrders(options);
      for (const order of inProgressOrders) {
        const estimatedEndAt = toWorldDateIso(order.estimatedEndAt);
        if (estimatedEndAt && estimatedEndAt <= campaignDateIso) summary.due += 1;
        const result = await requestDueCompletion(order, campaignDateIso, options);
        if (result.status === "COMPLETED") summary.completed += 1;
        else if (result.status === "TERMINAL_FAILED") summary.terminalFailed += 1;
        else if (result.status === "TERMINAL_CANCELLED") summary.terminalCancelled += 1;
        else if (result.status === "PENDING") summary.pending += 1;
        else if (result.status === "BLOCKED") summary.blocked += 1;
        else if (result.status === "FAILED") summary.failed += 1;
        else if (result.status === "SKIPPED") summary.skipped += 1;
        else if (result.status === "NOT_DUE") summary.notDue += 1;
        summary.results.push({
          serviceOrderId: normalizeId(order.serviceOrderId),
          citizenId: normalizeId(order.citizenId),
          providerId: normalizeId(order.providerId),
          subjectInstanceIds: uniqueStrings(order.subjectRefs?.instanceIds),
          estimatedEndAt,
          previousRevision: Number(order.revision || 0),
          resultingRevision: Number(result.order?.revision || order.revision || 0),
          handlerId: normalizeToken(result.handlerId),
          status: result.status,
          reason: result.reason
        });
      }
      lastProcessedCampaignDateIso = campaignDateIso;
      schedulerRevision += 1;
      summary.schedulerRevision = schedulerRevision;
      lastSummary = clone(summary);
      flushWorldTimeServiceSchedulerPersistence();
      emitCompletionSummary(summary);
      return clone(summary);
    } finally {
      completionProcessing = false;
    }
  }

  async function processWorldTimeServiceLifecycle(options = {}) {
    if (lifecycleProcessing) {
      return {
        ok: false,
        reason: "WORLD_TIME_SERVICE_LIFECYCLE_BUSY",
        campaignDateIso: toWorldDateIso(options.campaignDateIso) || getCampaignDateIso()
      };
    }
    lifecycleProcessing = true;
    try {
      const starts = processDueServiceOrders(options);
      const completions = await processDueServiceCompletions(options);
      const summary = {
        ok: starts?.ok !== false && completions?.ok !== false,
        schedulerVersion: STORAGE_SCHEMA_VERSION,
        campaignDateIso: completions?.campaignDateIso || starts?.campaignDateIso || toWorldDateIso(options.campaignDateIso) || getCampaignDateIso(),
        source: normalizeToken(options.source, "MANUAL"),
        starts: clone(starts),
        completions: clone(completions),
        processedAt: new Date().toISOString(),
        schedulerRevision
      };
      window.dispatchEvent?.(new CustomEvent("ws:world-time-service-lifecycle-processed", { detail: clone(summary) }));
      return summary;
    } finally {
      lifecycleProcessing = false;
    }
  }

  function retryScheduledServiceOrder(serviceOrderId = "", options = {}) {
    const orderId = normalizeId(serviceOrderId);
    if (!orderId) return { ok: false, reason: "SERVICE_ORDER_ID_REQUIRED" };
    return processDueServiceOrders({
      ...options,
      serviceOrderIds: [orderId],
      force: true,
      source: options.source || "MANUAL_START_RETRY"
    });
  }

  async function retryInProgressServiceOrderCompletion(serviceOrderId = "", options = {}) {
    const orderId = normalizeId(serviceOrderId);
    if (!orderId) return { ok: false, reason: "SERVICE_ORDER_ID_REQUIRED" };
    return processDueServiceCompletions({
      ...options,
      serviceOrderIds: [orderId],
      force: true,
      source: options.source || "MANUAL_COMPLETION_RETRY"
    });
  }

  function getWorldTimeServiceSchedulerState() {
    return clone(serializeState());
  }

  function exportWorldTimeServiceSchedulerState() {
    return getWorldTimeServiceSchedulerState();
  }

  function importWorldTimeServiceSchedulerState(payload = {}, options = {}) {
    const source = payload?.worldTimeServiceScheduler || payload?.data?.worldTimeServiceScheduler || payload;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      return { ok: false, reason: "WORLD_TIME_SERVICE_SCHEDULER_IMPORT_INVALID" };
    }
    const result = replaceState(source, { persist: options.persist !== false });
    if (options.reconcile === true) {
      deferSchedulerRun({
        campaignDateIso: toWorldDateIso(options.campaignDateIso) || getCampaignDateIso(),
        source: "SCHEDULER_IMPORT_RECONCILIATION"
      });
    }
    return {
      ok: true,
      reason: "WORLD_TIME_SERVICE_SCHEDULER_IMPORTED",
      diagnostics: result,
      reconciliationScheduled: options.reconcile === true
    };
  }

  function getWorldTimeServiceCompletionHandlers() {
    return Array.from(completionHandlers.values())
      .map((entry) => ({ handlerId: entry.handlerId, ...clone(entry.options) }))
      .sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0) || left.handlerId.localeCompare(right.handlerId));
  }

  function getWorldTimeServiceSchedulerDiagnostics() {
    const receipts = Array.from(receiptsByKey.values());
    const counts = receipts.reduce((result, receipt) => {
      const phase = normalizeToken(receipt.phase, "START");
      const status = normalizeToken(receipt.status, "UNKNOWN");
      result.byStatus[status] = Number(result.byStatus[status] || 0) + 1;
      result.byPhase[phase] = Number(result.byPhase[phase] || 0) + 1;
      return result;
    }, { byStatus: {}, byPhase: {} });
    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      storeSchemaVersion: STORE_SCHEMA_VERSION,
      startReady: typeof app.getServiceOrders === "function" && typeof app.startServiceOrder === "function",
      completionBoundaryReady: typeof app.getServiceOrders === "function" && typeof app.getServiceOrder === "function" && typeof app.getServiceDefinition === "function",
      completionExecutionReady: completionHandlers.size > 0,
      ready: typeof app.getServiceOrders === "function" && typeof app.startServiceOrder === "function",
      serviceOrderReadApi: typeof app.getServiceOrders === "function",
      serviceOrderStartApi: typeof app.startServiceOrder === "function",
      serviceOrderCompleteApi: typeof app.completeServiceOrder === "function",
      campaignDateApi: typeof app.getCampaignDateIso === "function" || Boolean(app.CAMPAIGN_DATE_ISO),
      startProcessing,
      completionProcessing,
      lifecycleProcessing,
      schedulerRevision,
      lastProcessedCampaignDateIso,
      receiptCount: receipts.length,
      receiptCountsByStatus: counts.byStatus,
      receiptCountsByPhase: counts.byPhase,
      completionHandlerCount: completionHandlers.size,
      completionHandlers: getWorldTimeServiceCompletionHandlers(),
      lastSummary: clone(lastSummary)
    };
  }

  function resetWorldTimeServiceSchedulerRuntime(options = {}) {
    receiptsByKey = new Map();
    schedulerRevision += 1;
    lastProcessedCampaignDateIso = "";
    lastSummary = null;
    if (options.persist !== false) flushWorldTimeServiceSchedulerPersistence();
    return getWorldTimeServiceSchedulerDiagnostics();
  }

  function deferSchedulerRun(options = {}) {
    window.setTimeout?.(() => {
      processWorldTimeServiceLifecycle(options).catch((error) => {
        console.warn("W&S world-time service lifecycle processing failed.", error);
      });
    }, 0);
  }

  function deferCompletionRun(options = {}) {
    window.setTimeout?.(() => {
      processDueServiceCompletions(options).catch((error) => {
        console.warn("W&S world-time service completion processing failed.", error);
      });
    }, 0);
  }

  function handleCampaignDateUpdated(event) {
    deferSchedulerRun({
      campaignDateIso: event?.detail?.iso || event?.detail?.campaignDateIso,
      source: "CAMPAIGN_DATE_UPDATED"
    });
  }

  function handleServiceOrderEvent(event) {
    const detail = event?.detail || {};
    const status = normalizeToken(detail.status);
    if (status === "SCHEDULED") {
      deferSchedulerRun({
        campaignDateIso: getCampaignDateIso(),
        serviceOrderIds: [detail.serviceOrderId],
        source: "SERVICE_ORDER_SCHEDULED"
      });
      return;
    }
    if (status === "IN_PROGRESS") {
      deferCompletionRun({
        campaignDateIso: getCampaignDateIso(),
        serviceOrderIds: [detail.serviceOrderId],
        source: "SERVICE_ORDER_IN_PROGRESS"
      });
    }
  }

  function installListeners() {
    if (app.__worldTimeServiceSchedulerInstalled === true) return false;
    window.addEventListener?.("ws:campaign-date-updated", handleCampaignDateUpdated);
    window.addEventListener?.("ws:service-order-updated", handleServiceOrderEvent);
    window.addEventListener?.("ws:service-order-created", handleServiceOrderEvent);
    window.addEventListener?.("ws:service-order-started", handleServiceOrderEvent);
    app.__worldTimeServiceSchedulerInstalled = true;
    return true;
  }

  function processStartup() {
    processWorldTimeServiceLifecycle({ source: "STARTUP_RECONCILIATION" }).catch((error) => {
      console.warn("W&S world-time service startup reconciliation failed.", error);
    });
  }

  initializeState();
  Object.assign(app, {
    WORLD_TIME_SERVICE_SCHEDULER_SCHEMA_VERSION: STORAGE_SCHEMA_VERSION,
    processDueServiceOrders,
    processDueServiceCompletions,
    processWorldTimeServiceLifecycle,
    retryScheduledServiceOrder,
    retryInProgressServiceOrderCompletion,
    registerWorldTimeServiceCompletionHandler,
    unregisterWorldTimeServiceCompletionHandler,
    getWorldTimeServiceCompletionHandlers,
    getWorldTimeServiceSchedulerState,
    exportWorldTimeServiceSchedulerState,
    importWorldTimeServiceSchedulerState,
    getWorldTimeServiceSchedulerDiagnostics,
    flushWorldTimeServiceSchedulerPersistence,
    resetWorldTimeServiceSchedulerRuntime
  });
  installListeners();
  window.dispatchEvent?.(new CustomEvent("ws:world-time-service-scheduler-ready", {
    detail: {
      schedulerSchemaVersion: STORAGE_SCHEMA_VERSION,
      completionRegistrationApi: "registerWorldTimeServiceCompletionHandler",
      changedDomains: ["WORLD_TIME", "SERVICE"]
    }
  }));

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", processStartup, { once: true });
  } else {
    window.setTimeout?.(processStartup, 0);
  }
})();
