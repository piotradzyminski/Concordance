window.WS_APP = window.WS_APP || {};

(function initWorldBridgeOperationStore() {
  const app = window.WS_APP;
  const STORAGE_KEY = "ws_world_bridge_operations_v1";
  const SCHEMA_VERSION = 1;
  const PERSISTENCE_DELAY_MS = 120;

  const OPERATION_STATUSES = new Set([
    "DRAFT",
    "VALIDATING",
    "RESERVING",
    "AUTHORIZED",
    "SCHEDULED",
    "IN_PROGRESS",
    "COMMITTING",
    "CAPTURING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "RECOVERY_REQUIRED",
    "PAYMENT_RECOVERY_REQUIRED",
    "COMPENSATION_REQUIRED"
  ]);
  const OPERATION_STEPS = new Set([
    "DRAFT",
    "VALIDATE",
    "RESERVE",
    "AUTHORIZE",
    "SCHEDULE",
    "EXECUTE",
    "COMMIT",
    "CAPTURE",
    "COMPENSATE",
    "COMPLETE"
  ]);
  const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
  const RECOVERY_STATUSES = new Set(["RECOVERY_REQUIRED", "PAYMENT_RECOVERY_REQUIRED", "COMPENSATION_REQUIRED"]);
  const ALLOWED_TRANSITIONS = {
    DRAFT: new Set(["VALIDATING", "CANCELLED", "FAILED", "RECOVERY_REQUIRED"]),
    VALIDATING: new Set(["RESERVING", "AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "FAILED", "CANCELLED", "RECOVERY_REQUIRED"]),
    RESERVING: new Set(["AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "FAILED", "CANCELLED", "RECOVERY_REQUIRED", "COMPENSATION_REQUIRED"]),
    AUTHORIZED: new Set(["SCHEDULED", "IN_PROGRESS", "COMMITTING", "CAPTURING", "FAILED", "CANCELLED", "RECOVERY_REQUIRED", "COMPENSATION_REQUIRED"]),
    SCHEDULED: new Set(["IN_PROGRESS", "FAILED", "CANCELLED", "RECOVERY_REQUIRED", "COMPENSATION_REQUIRED"]),
    IN_PROGRESS: new Set(["COMMITTING", "CAPTURING", "COMPLETED", "FAILED", "CANCELLED", "RECOVERY_REQUIRED", "COMPENSATION_REQUIRED"]),
    COMMITTING: new Set(["CAPTURING", "COMPLETED", "FAILED", "RECOVERY_REQUIRED", "PAYMENT_RECOVERY_REQUIRED", "COMPENSATION_REQUIRED"]),
    CAPTURING: new Set(["COMPLETED", "FAILED", "RECOVERY_REQUIRED", "PAYMENT_RECOVERY_REQUIRED", "COMPENSATION_REQUIRED"]),
    RECOVERY_REQUIRED: new Set(["VALIDATING", "RESERVING", "AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "COMMITTING", "CAPTURING", "FAILED", "CANCELLED", "COMPENSATION_REQUIRED", "PAYMENT_RECOVERY_REQUIRED"]),
    PAYMENT_RECOVERY_REQUIRED: new Set(["CAPTURING", "COMPLETED", "FAILED", "COMPENSATION_REQUIRED", "RECOVERY_REQUIRED"]),
    COMPENSATION_REQUIRED: new Set(["VALIDATING", "IN_PROGRESS", "FAILED", "CANCELLED", "RECOVERY_REQUIRED"]),
    COMPLETED: new Set(),
    FAILED: new Set(),
    CANCELLED: new Set()
  };

  const clone = app.storeUtils?.clone || function cloneFallback(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  };

  let operationsById = new Map();
  let operationIdByIdempotencyKey = new Map();
  let operationIdsByCitizenId = new Map();
  let operationIdsByStatus = new Map();
  let operationIdByClaimKey = new Map();
  let operationIdsByReference = new Map();
  let persistedSnapshot = [];
  let storeRevision = 0;
  let persistenceDirty = false;
  let persistenceTimer = 0;
  let emittedEventIds = new Set();
  let recoveryHandlers = new Map();
  let diagnostics = createDiagnostics();

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function normalizeToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function normalizeInteger(value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER, fallback = minimum) {
    const parsed = Math.round(Number(value));
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(maximum, Math.max(minimum, parsed));
  }

  function getWorldTime() {
    return normalizeId(app.getCampaignDateIso?.() || app.CAMPAIGN_DATE_ISO || new Date().toISOString());
  }

  function stableSerialize(value) {
    if (value === null || value === undefined) return JSON.stringify(value ?? null);
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
    if (typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function stableToken(value = "") {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function createDiagnostics() {
    return {
      creates: 0,
      createReplays: 0,
      idempotencyConflicts: 0,
      updates: 0,
      staleRevisionRejects: 0,
      invalidTransitionRejects: 0,
      claimAttempts: 0,
      claimConflicts: 0,
      claimsReleased: 0,
      reconciliationRuns: 0,
      reconciledOperations: 0,
      retryAttempts: 0,
      retrySuccesses: 0,
      retryFailures: 0,
      persistenceSchedules: 0,
      persistenceFlushes: 0,
      persistenceFailures: 0,
      persistenceRollbacks: 0,
      importedRecords: 0,
      emittedEvents: 0,
      suppressedDuplicateEvents: 0
    };
  }

  function normalizeStringArray(values = []) {
    return [...new Set((Array.isArray(values) ? values : []).map(normalizeId).filter(Boolean))];
  }

  function normalizeReferenceMap(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      marketOrderId: normalizeId(source.marketOrderId),
      serviceOrderId: normalizeId(source.serviceOrderId),
      billingIntentId: normalizeId(source.billingIntentId),
      billingTransactionId: normalizeId(source.billingTransactionId),
      itemTransactionId: normalizeId(source.itemTransactionId),
      instanceIds: normalizeStringArray(source.instanceIds),
      housingReservationIds: normalizeStringArray(source.housingReservationIds || source.reservationIds),
      marketStockReservationIds: normalizeStringArray(source.marketStockReservationIds || source.stockReservationIds)
    };
  }

  function normalizeClaims(values = []) {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
      .map((claim) => {
        if (typeof claim === "string") {
          const [resourceType, ...rest] = claim.split(":");
          return { resourceType: normalizeToken(resourceType), resourceId: normalizeId(rest.join(":")) };
        }
        const source = claim && typeof claim === "object" && !Array.isArray(claim) ? claim : {};
        return {
          resourceType: normalizeToken(source.resourceType || source.type),
          resourceId: normalizeId(source.resourceId || source.id)
        };
      })
      .filter((claim) => claim.resourceType && claim.resourceId)
      .filter((claim) => {
        const key = `${claim.resourceType}:${claim.resourceId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function claimKey(claim = {}) {
    return `${normalizeToken(claim.resourceType)}:${normalizeId(claim.resourceId)}`;
  }

  function normalizeCheckpoint(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const status = normalizeToken(source.status);
    const step = normalizeToken(source.step || source.currentStep);
    return {
      step: OPERATION_STEPS.has(step) ? step : "DRAFT",
      status: OPERATION_STATUSES.has(status) ? status : "DRAFT",
      at: normalizeId(source.at) || getWorldTime(),
      revision: normalizeInteger(source.revision, 1, Number.MAX_SAFE_INTEGER, 1),
      code: normalizeToken(source.code || source.resultCode || "")
    };
  }

  function normalizeOperation(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const status = normalizeToken(source.status || "DRAFT");
    const step = normalizeToken(source.currentStep || source.step || "DRAFT");
    const createdAt = normalizeId(source.createdAt) || getWorldTime();
    const refs = normalizeReferenceMap(source.refs || source.references || source);
    const retrySource = source.retry && typeof source.retry === "object" && !Array.isArray(source.retry) ? source.retry : {};
    const recoverySource = source.recovery && typeof source.recovery === "object" && !Array.isArray(source.recovery) ? source.recovery : {};
    const compensationSource = source.compensation && typeof source.compensation === "object" && !Array.isArray(source.compensation) ? source.compensation : {};
    return {
      schemaVersion: SCHEMA_VERSION,
      operationId: normalizeId(source.operationId),
      idempotencyKey: normalizeId(source.idempotencyKey),
      requestSignature: normalizeId(source.requestSignature),
      operationType: normalizeToken(source.operationType || "WORLD_OPERATION"),
      citizenId: normalizeId(source.citizenId),
      providerId: normalizeId(source.providerId),
      status: OPERATION_STATUSES.has(status) ? status : "RECOVERY_REQUIRED",
      currentStep: OPERATION_STEPS.has(step) ? step : "DRAFT",
      refs,
      claims: normalizeClaims(source.claims),
      domainStates: source.domainStates && typeof source.domainStates === "object" && !Array.isArray(source.domainStates) ? clone(source.domainStates) : {},
      retry: {
        count: normalizeInteger(retrySource.count, 0, 999999, 0),
        maxAttempts: normalizeInteger(retrySource.maxAttempts, 1, 999999, 5),
        handlerId: normalizeToken(retrySource.handlerId || source.recoveryHandlerId || source.operationType || "WORLD_OPERATION"),
        lastAttemptAt: normalizeId(retrySource.lastAttemptAt) || null,
        nextRetryAt: normalizeId(retrySource.nextRetryAt) || null,
        lastErrorCode: normalizeToken(retrySource.lastErrorCode || "")
      },
      recovery: {
        required: recoverySource.required === true || RECOVERY_STATUSES.has(OPERATION_STATUSES.has(status) ? status : "RECOVERY_REQUIRED"),
        reasonCodes: normalizeStringArray(recoverySource.reasonCodes).map(normalizeToken),
        lastReconciledAt: normalizeId(recoverySource.lastReconciledAt) || null,
        reconciliationRevision: normalizeInteger(recoverySource.reconciliationRevision, 0, Number.MAX_SAFE_INTEGER, 0)
      },
      compensation: {
        status: normalizeToken(compensationSource.status || "NOT_REQUIRED"),
        attempts: normalizeInteger(compensationSource.attempts, 0, 999999, 0),
        lastErrorCode: normalizeToken(compensationSource.lastErrorCode || ""),
        completedAt: normalizeId(compensationSource.completedAt) || null
      },
      checkpoints: (Array.isArray(source.checkpoints) ? source.checkpoints : []).slice(-32).map(normalizeCheckpoint),
      errors: (Array.isArray(source.errors) ? source.errors : []).slice(-32).map((entry) => {
        if (typeof entry === "string") return { code: normalizeToken(entry), at: getWorldTime() };
        const error = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
        return { code: normalizeToken(error.code || error.reason), at: normalizeId(error.at) || getWorldTime(), detail: normalizeId(error.detail || error.message) };
      }).filter((entry) => entry.code),
      metadata: source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata) ? clone(source.metadata) : {},
      createdAt,
      updatedAt: normalizeId(source.updatedAt) || createdAt,
      completedAt: normalizeId(source.completedAt) || null,
      revision: normalizeInteger(source.revision, 1, Number.MAX_SAFE_INTEGER, 1)
    };
  }

  function serializeOperations() {
    return Array.from(operationsById.values()).map(clone);
  }

  function readStoredOperations() {
    try {
      const payload = JSON.parse(window.localStorage?.getItem(STORAGE_KEY) || "null");
      if (!payload || Number(payload.schemaVersion) !== SCHEMA_VERSION || !Array.isArray(payload.operations)) return [];
      storeRevision = normalizeInteger(payload.storeRevision, 0, Number.MAX_SAFE_INTEGER, 0);
      return payload.operations;
    } catch (error) {
      console.warn("W&S World Bridge operation store could not read localStorage.", error);
      return [];
    }
  }

  function addMultiIndex(index, key, value) {
    if (!key || !value) return;
    const current = index.get(key) || new Set();
    current.add(value);
    index.set(key, current);
  }

  function referenceEntries(refs = {}) {
    const entries = [];
    ["marketOrderId", "serviceOrderId", "billingIntentId", "billingTransactionId", "itemTransactionId"].forEach((field) => {
      const value = normalizeId(refs[field]);
      if (value) entries.push([`${field}:${value}`, value]);
    });
    normalizeStringArray(refs.instanceIds).forEach((value) => entries.push([`instanceId:${value}`, value]));
    normalizeStringArray(refs.housingReservationIds).forEach((value) => entries.push([`housingReservationId:${value}`, value]));
    normalizeStringArray(refs.marketStockReservationIds).forEach((value) => entries.push([`marketStockReservationId:${value}`, value]));
    return entries;
  }

  function rebuildIndexes() {
    operationIdByIdempotencyKey = new Map();
    operationIdsByCitizenId = new Map();
    operationIdsByStatus = new Map();
    operationIdByClaimKey = new Map();
    operationIdsByReference = new Map();

    operationsById.forEach((operation, operationId) => {
      if (operation.idempotencyKey && !operationIdByIdempotencyKey.has(operation.idempotencyKey)) operationIdByIdempotencyKey.set(operation.idempotencyKey, operationId);
      addMultiIndex(operationIdsByCitizenId, operation.citizenId, operationId);
      addMultiIndex(operationIdsByStatus, operation.status, operationId);
      referenceEntries(operation.refs).forEach(([key]) => addMultiIndex(operationIdsByReference, key, operationId));
      if (!TERMINAL_STATUSES.has(operation.status)) {
        operation.claims.forEach((claim) => {
          const key = claimKey(claim);
          if (key && !operationIdByClaimKey.has(key)) operationIdByClaimKey.set(key, operationId);
        });
      }
    });
  }

  function replaceOperations(records = [], options = {}) {
    const next = new Map();
    const idempotencyOwners = new Map();
    const claimOwners = new Map();
    const errors = [];

    (Array.isArray(records) ? records : []).map(normalizeOperation).forEach((operation, index) => {
      if (!operation.operationId) errors.push({ code: "WORLD_BRIDGE_OPERATION_ID_REQUIRED", index });
      if (!operation.idempotencyKey) errors.push({ code: "WORLD_BRIDGE_OPERATION_IDEMPOTENCY_REQUIRED", index });
      if (!operation.citizenId) errors.push({ code: "WORLD_BRIDGE_OPERATION_CITIZEN_REQUIRED", index });
      const idempotencyOwner = idempotencyOwners.get(operation.idempotencyKey);
      if (idempotencyOwner && idempotencyOwner !== operation.operationId) errors.push({ code: "WORLD_BRIDGE_OPERATION_IDEMPOTENCY_CONFLICT", idempotencyKey: operation.idempotencyKey });
      idempotencyOwners.set(operation.idempotencyKey, operation.operationId);
      if (!TERMINAL_STATUSES.has(operation.status)) {
        operation.claims.forEach((claim) => {
          const key = claimKey(claim);
          const owner = claimOwners.get(key);
          if (owner && owner !== operation.operationId) errors.push({ code: "WORLD_BRIDGE_OPERATION_CLAIM_CONFLICT", claimKey: key, operationIds: [owner, operation.operationId] });
          claimOwners.set(key, operation.operationId);
        });
      }
      const existing = next.get(operation.operationId);
      if (!existing || operation.revision > existing.revision) next.set(operation.operationId, operation);
    });

    if (errors.length && options.allowConflicts !== true) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_IMPORT_INVALID", errors };
    operationsById = next;
    rebuildIndexes();
    return { ok: true, reason: "WORLD_BRIDGE_OPERATIONS_REPLACED", errors, count: operationsById.size };
  }

  function flushWorldBridgeOperationPersistence() {
    if (persistenceTimer) window.clearTimeout?.(persistenceTimer);
    persistenceTimer = 0;
    if (!persistenceDirty) return true;
    diagnostics.persistenceFlushes += 1;
    try {
      const operations = serializeOperations();
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, storeRevision, operations }));
      persistedSnapshot = clone(operations);
      persistenceDirty = false;
      return true;
    } catch (error) {
      diagnostics.persistenceFailures += 1;
      diagnostics.persistenceRollbacks += 1;
      console.warn("W&S World Bridge operation store could not persist localStorage; memory state was restored.", error);
      replaceOperations(persistedSnapshot, { allowConflicts: true });
      persistenceDirty = false;
      window.dispatchEvent?.(new CustomEvent("ws:world-bridge-operation-persistence-recovered", {
        detail: { reason: "WORLD_BRIDGE_OPERATION_PERSISTENCE_FAILED", changedDomains: ["WORLD_BRIDGE_OPERATION"] }
      }));
      return false;
    }
  }

  function schedulePersistence() {
    if (persistenceTimer) window.clearTimeout?.(persistenceTimer);
    diagnostics.persistenceSchedules += 1;
    persistenceDirty = true;
    persistenceTimer = window.setTimeout?.(flushWorldBridgeOperationPersistence, PERSISTENCE_DELAY_MS) || 0;
  }

  function getChangedFields(previous = null, next = {}) {
    if (!previous) return Object.keys(next).filter((key) => key !== "schemaVersion");
    return Object.keys(next).filter((key) => key !== "schemaVersion" && stableSerialize(previous[key]) !== stableSerialize(next[key]));
  }

  function emitOperationUpdate(operation = {}, previous = null, source = "WORLD_BRIDGE_OPERATION_UPDATED") {
    const eventId = `world-bridge-operation:${operation.operationId}:${operation.revision}`;
    if (emittedEventIds.has(eventId)) {
      diagnostics.suppressedDuplicateEvents += 1;
      return;
    }
    emittedEventIds.add(eventId);
    diagnostics.emittedEvents += 1;
    window.dispatchEvent?.(new CustomEvent("ws:world-bridge-operation-updated", {
      detail: {
        eventId,
        source,
        operationId: operation.operationId,
        operationType: operation.operationType,
        citizenId: operation.citizenId,
        providerId: operation.providerId,
        status: operation.status,
        previousStatus: previous?.status || "",
        currentStep: operation.currentStep,
        previousStep: previous?.currentStep || "",
        marketOrderId: operation.refs.marketOrderId,
        serviceOrderId: operation.refs.serviceOrderId,
        billingIntentId: operation.refs.billingIntentId,
        billingTransactionId: operation.refs.billingTransactionId,
        itemTransactionId: operation.refs.itemTransactionId,
        instanceIds: [...operation.refs.instanceIds],
        reservationIds: [...operation.refs.housingReservationIds],
        changedFields: getChangedFields(previous, operation),
        changedDomains: ["WORLD_BRIDGE_OPERATION"],
        recoveryRequired: operation.recovery.required,
        revision: operation.revision,
        storeRevision
      }
    }));
  }

  function persistMutation(previousMap, previousRevision, operation, previous, options = {}) {
    if (options.flush === true || options.critical === true || TERMINAL_STATUSES.has(operation.status)) {
      persistenceDirty = true;
      if (!flushWorldBridgeOperationPersistence()) {
        operationsById = previousMap;
        storeRevision = previousRevision;
        rebuildIndexes();
        return { ok: false, reason: "WORLD_BRIDGE_OPERATION_PERSISTENCE_FAILED", operation: previous ? clone(previous) : null };
      }
    } else {
      schedulePersistence();
    }
    if (options.emit !== false) emitOperationUpdate(operation, previous, options.source);
    return { ok: true, reason: previous ? "WORLD_BRIDGE_OPERATION_UPDATED" : "WORLD_BRIDGE_OPERATION_CREATED", operation: clone(operation) };
  }

  function commitOperation(operation = {}, previous = null, options = {}) {
    const normalized = normalizeOperation(operation);
    if (!normalized.operationId || !normalized.idempotencyKey || !normalized.citizenId) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_REQUIRED_FIELDS_MISSING", operation: null };
    const existingId = operationIdByIdempotencyKey.get(normalized.idempotencyKey);
    if (existingId && existingId !== normalized.operationId) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_IDEMPOTENCY_CONFLICT", operation: null };

    const previousMap = operationsById;
    const previousRevision = storeRevision;
    operationsById = new Map(operationsById);
    operationsById.set(normalized.operationId, normalized);
    storeRevision += 1;
    rebuildIndexes();
    return persistMutation(previousMap, previousRevision, normalized, previous, options);
  }

  function buildRequestSignature(input = {}) {
    if (normalizeId(input.requestSignature)) return normalizeId(input.requestSignature);
    return stableToken(stableSerialize({
      operationType: normalizeToken(input.operationType || "WORLD_OPERATION"),
      citizenId: normalizeId(input.citizenId),
      providerId: normalizeId(input.providerId),
      refs: normalizeReferenceMap(input.refs || input.references || input),
      claims: normalizeClaims(input.claims),
      request: input.request && typeof input.request === "object" ? input.request : {}
    }));
  }

  function makeOperationId(idempotencyKey = "") {
    return `world_op_${stableToken(idempotencyKey)}`;
  }

  function getWorldBridgeOperation(operationId = "") {
    const operation = operationsById.get(normalizeId(operationId)) || null;
    return operation ? clone(operation) : null;
  }
  function getWorldBridgeOperationStoreRevision() {
    return storeRevision;
  }

  function getWorldBridgeOperationClaimOwner(resourceType = "", resourceId = "") {
    const operationId = operationIdByClaimKey.get(`${normalizeToken(resourceType)}:${normalizeId(resourceId)}`) || "";
    return operationId ? getWorldBridgeOperation(operationId) : null;
  }


  function getWorldBridgeOperationByIdempotencyKey(idempotencyKey = "") {
    const operationId = operationIdByIdempotencyKey.get(normalizeId(idempotencyKey));
    return operationId ? getWorldBridgeOperation(operationId) : null;
  }

  function getWorldBridgeOperations(filters = {}) {
    const citizenId = normalizeId(filters.citizenId);
    const status = normalizeToken(filters.status);
    const operationType = normalizeToken(filters.operationType);
    const recoveryOnly = filters.recoveryOnly === true;
    let ids = null;
    if (citizenId) ids = operationIdsByCitizenId.get(citizenId) || new Set();
    if (status) {
      const statusIds = operationIdsByStatus.get(status) || new Set();
      ids = ids ? new Set([...ids].filter((id) => statusIds.has(id))) : statusIds;
    }
    const source = ids ? [...ids].map((id) => operationsById.get(id)).filter(Boolean) : [...operationsById.values()];
    return source
      .filter((operation) => !operationType || operation.operationType === operationType)
      .filter((operation) => !recoveryOnly || operation.recovery.required || RECOVERY_STATUSES.has(operation.status))
      .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
      .map(clone);
  }

  function getWorldBridgeOperationsByReference(referenceType = "", referenceId = "") {
    const key = `${normalizeId(referenceType)}:${normalizeId(referenceId)}`;
    return [...(operationIdsByReference.get(key) || new Set())].map(getWorldBridgeOperation).filter(Boolean);
  }

  function validateClaims(operationId = "", claims = []) {
    const conflicts = [];
    normalizeClaims(claims).forEach((claim) => {
      const key = claimKey(claim);
      const owner = operationIdByClaimKey.get(key);
      if (owner && owner !== normalizeId(operationId)) conflicts.push({ claim: clone(claim), claimKey: key, ownerOperationId: owner });
    });
    return conflicts;
  }

  function createWorldBridgeOperation(input = {}) {
    diagnostics.creates += 1;
    const idempotencyKey = normalizeId(input.idempotencyKey);
    const citizenId = normalizeId(input.citizenId);
    const operationType = normalizeToken(input.operationType || "WORLD_OPERATION");
    if (!idempotencyKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED", operation: null };
    if (!citizenId) return { ok: false, reason: "CITIZEN_ID_REQUIRED", operation: null };
    const requestSignature = buildRequestSignature(input);
    const replay = getWorldBridgeOperationByIdempotencyKey(idempotencyKey);
    if (replay) {
      if (replay.requestSignature !== requestSignature) {
        diagnostics.idempotencyConflicts += 1;
        return { ok: false, reason: "WORLD_BRIDGE_OPERATION_IDEMPOTENCY_CONFLICT", operation: replay };
      }
      diagnostics.createReplays += 1;
      return { ok: true, reason: "IDEMPOTENT_REPLAY", replay: true, operation: replay };
    }

    const operationId = normalizeId(input.operationId) || makeOperationId(idempotencyKey);
    const claims = normalizeClaims(input.claims);
    const claimConflicts = validateClaims(operationId, claims);
    if (claimConflicts.length) {
      diagnostics.claimConflicts += claimConflicts.length;
      return { ok: false, reason: "WORLD_BRIDGE_OPERATION_CLAIM_CONFLICT", conflicts: claimConflicts, operation: null };
    }

    const now = getWorldTime();
    const operation = normalizeOperation({
      operationId,
      idempotencyKey,
      requestSignature,
      operationType,
      citizenId,
      providerId: input.providerId,
      status: input.status || "DRAFT",
      currentStep: input.currentStep || "DRAFT",
      refs: input.refs || input.references || input,
      claims: TERMINAL_STATUSES.has(normalizeToken(input.status || "DRAFT")) ? [] : claims,
      retry: { maxAttempts: input.maxRetryAttempts, handlerId: input.recoveryHandlerId || operationType },
      metadata: input.metadata,
      checkpoints: [{ step: input.currentStep || "DRAFT", status: input.status || "DRAFT", at: now, revision: 1, code: "CREATED" }],
      createdAt: now,
      updatedAt: now,
      revision: 1
    });
    return commitOperation(operation, null, { flush: input.flush !== false, emit: input.emit, source: "WORLD_BRIDGE_OPERATION_CREATED" });
  }

  function mergeReferences(current = {}, patch = {}) {
    const next = normalizeReferenceMap({ ...current, ...patch });
    next.instanceIds = normalizeStringArray([...(current.instanceIds || []), ...(patch.instanceIds || [])]);
    next.housingReservationIds = normalizeStringArray([...(current.housingReservationIds || []), ...(patch.housingReservationIds || patch.reservationIds || [])]);
    next.marketStockReservationIds = normalizeStringArray([...(current.marketStockReservationIds || []), ...(patch.marketStockReservationIds || patch.stockReservationIds || [])]);
    return next;
  }

  function updateWorldBridgeOperation(operationId = "", patch = {}, options = {}) {
    const current = getWorldBridgeOperation(operationId);
    if (!current) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_NOT_FOUND", operation: null };
    if (options.expectedRevision != null && normalizeInteger(options.expectedRevision, 1, Number.MAX_SAFE_INTEGER, 1) !== current.revision) {
      diagnostics.staleRevisionRejects += 1;
      return { ok: false, reason: "WORLD_BRIDGE_OPERATION_STALE_REVISION", operation: current };
    }

    const source = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {};
    const nextStatus = source.status ? normalizeToken(source.status) : current.status;
    if (!OPERATION_STATUSES.has(nextStatus)) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_STATUS_INVALID", operation: current };
    if (nextStatus !== current.status && options.forceTransition !== true && !ALLOWED_TRANSITIONS[current.status]?.has(nextStatus)) {
      diagnostics.invalidTransitionRejects += 1;
      return { ok: false, reason: "WORLD_BRIDGE_OPERATION_TRANSITION_INVALID", operation: current, from: current.status, to: nextStatus };
    }
    const nextStep = source.currentStep || source.step ? normalizeToken(source.currentStep || source.step) : current.currentStep;
    if (!OPERATION_STEPS.has(nextStep)) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_STEP_INVALID", operation: current };

    const refs = source.refs || source.references ? mergeReferences(current.refs, source.refs || source.references) : current.refs;
    const claims = source.claims ? normalizeClaims(source.claims) : current.claims;
    const claimConflicts = validateClaims(current.operationId, claims);
    if (claimConflicts.length) {
      diagnostics.claimConflicts += claimConflicts.length;
      return { ok: false, reason: "WORLD_BRIDGE_OPERATION_CLAIM_CONFLICT", conflicts: claimConflicts, operation: current };
    }

    const now = getWorldTime();
    const recoveryPatch = source.recovery && typeof source.recovery === "object" ? source.recovery : {};
    const retryPatch = source.retry && typeof source.retry === "object" ? source.retry : {};
    const compensationPatch = source.compensation && typeof source.compensation === "object" ? source.compensation : {};
    const errors = [...current.errors];
    if (source.errorCode || source.failureCode) errors.push({ code: normalizeToken(source.errorCode || source.failureCode), at: now, detail: normalizeId(source.errorDetail || source.message) });
    const checkpoints = [...current.checkpoints];
    if (source.checkpoint !== false && (nextStatus !== current.status || nextStep !== current.currentStep || source.checkpointCode)) {
      checkpoints.push(normalizeCheckpoint({ step: nextStep, status: nextStatus, at: now, revision: current.revision + 1, code: source.checkpointCode || source.resultCode || "UPDATED" }));
    }

    const next = normalizeOperation({
      ...current,
      ...source,
      status: nextStatus,
      currentStep: nextStep,
      refs,
      claims: TERMINAL_STATUSES.has(nextStatus) ? [] : claims,
      domainStates: source.domainStates ? { ...current.domainStates, ...clone(source.domainStates) } : current.domainStates,
      retry: { ...current.retry, ...retryPatch },
      recovery: {
        ...current.recovery,
        ...recoveryPatch,
        required: recoveryPatch.required != null ? recoveryPatch.required === true : RECOVERY_STATUSES.has(nextStatus) || current.recovery.required
      },
      compensation: { ...current.compensation, ...compensationPatch },
      errors: errors.slice(-32),
      metadata: source.metadata ? { ...current.metadata, ...clone(source.metadata) } : current.metadata,
      checkpoints: checkpoints.slice(-32),
      updatedAt: now,
      completedAt: TERMINAL_STATUSES.has(nextStatus) ? current.completedAt || now : null,
      revision: current.revision + 1
    });
    diagnostics.updates += 1;
    return commitOperation(next, current, { ...options, source: options.source || "WORLD_BRIDGE_OPERATION_UPDATED" });
  }

  function transitionWorldBridgeOperation(operationId = "", transition = {}, options = {}) {
    return updateWorldBridgeOperation(operationId, transition, options);
  }

  function attachWorldBridgeOperationReferences(operationId = "", refs = {}, options = {}) {
    return updateWorldBridgeOperation(operationId, { refs, checkpoint: false }, { ...options, source: "WORLD_BRIDGE_OPERATION_REFERENCES_ATTACHED" });
  }

  function claimWorldBridgeOperationResources(operationId = "", claims = [], options = {}) {
    diagnostics.claimAttempts += 1;
    const operation = getWorldBridgeOperation(operationId);
    if (!operation) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_NOT_FOUND", operation: null };
    if (TERMINAL_STATUSES.has(operation.status)) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_TERMINAL", operation };
    const nextClaims = normalizeClaims([...operation.claims, ...normalizeClaims(claims)]);
    const conflicts = validateClaims(operation.operationId, nextClaims);
    if (conflicts.length) {
      diagnostics.claimConflicts += conflicts.length;
      return { ok: false, reason: "WORLD_BRIDGE_OPERATION_CLAIM_CONFLICT", conflicts, operation };
    }
    return updateWorldBridgeOperation(operation.operationId, { claims: nextClaims, checkpoint: false }, { ...options, source: "WORLD_BRIDGE_OPERATION_CLAIMS_ACQUIRED" });
  }

  function releaseWorldBridgeOperationClaims(operationId = "", claims = [], options = {}) {
    const operation = getWorldBridgeOperation(operationId);
    if (!operation) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_NOT_FOUND", operation: null };
    const releaseKeys = new Set(normalizeClaims(claims).map(claimKey));
    const nextClaims = releaseKeys.size ? operation.claims.filter((claim) => !releaseKeys.has(claimKey(claim))) : [];
    diagnostics.claimsReleased += operation.claims.length - nextClaims.length;
    return updateWorldBridgeOperation(operation.operationId, { claims: nextClaims, checkpoint: false }, { ...options, source: "WORLD_BRIDGE_OPERATION_CLAIMS_RELEASED" });
  }

  function inspectLinkedDomainStates(operation = {}) {
    const refs = operation.refs || {};
    const states = {};
    const missing = [];

    if (refs.marketOrderId) {
      const record = app.getMarketOrder?.(refs.marketOrderId) || null;
      states.market = record ? { id: refs.marketOrderId, status: normalizeToken(record.status), revision: normalizeInteger(record.revision, 0) } : { id: refs.marketOrderId, missing: true };
      if (!record) missing.push("MARKET_ORDER_MISSING");
    }
    if (refs.serviceOrderId) {
      const record = app.getServiceOrder?.(refs.serviceOrderId) || null;
      states.service = record ? { id: refs.serviceOrderId, status: normalizeToken(record.status), paymentStatus: normalizeToken(record.paymentStatus), revision: normalizeInteger(record.revision, 0) } : { id: refs.serviceOrderId, missing: true };
      if (!record) missing.push("SERVICE_ORDER_MISSING");
    }
    if (refs.billingIntentId) {
      const record = app.getBillingIntent?.(refs.billingIntentId) || null;
      states.billingIntent = record ? { id: refs.billingIntentId, status: normalizeToken(record.status), revision: normalizeInteger(record.revision, 0) } : { id: refs.billingIntentId, missing: true };
      if (!record) missing.push("BILLING_INTENT_MISSING");
    }
    if (refs.billingTransactionId) {
      const record = app.getBillingTransaction?.(refs.billingTransactionId) || null;
      states.billingTransaction = record ? { id: refs.billingTransactionId, status: normalizeToken(record.status), revision: normalizeInteger(record.revision, 0) } : { id: refs.billingTransactionId, missing: true };
      if (!record) missing.push("BILLING_TRANSACTION_MISSING");
    }
    if (refs.itemTransactionId) {
      const record = app.getItemInstanceTransaction?.(refs.itemTransactionId) || null;
      states.itemTransaction = record ? { id: refs.itemTransactionId, status: normalizeToken(record.status), revision: normalizeInteger(record.revision, 0), instanceIds: normalizeStringArray(record.instanceIds) } : { id: refs.itemTransactionId, missing: true };
      if (!record) missing.push("ITEM_TRANSACTION_MISSING");
    }
    if (refs.housingReservationIds?.length) {
      states.housingReservations = refs.housingReservationIds.map((reservationId) => {
        const record = app.getHousingPlacementReservation?.(reservationId) || null;
        if (!record) missing.push("HOUSING_RESERVATION_MISSING");
        return record ? { id: reservationId, status: normalizeToken(record.status), revision: normalizeInteger(record.revision, 0) } : { id: reservationId, missing: true };
      });
    }

    return { states, missing: [...new Set(missing)] };
  }

  function reconcileWorldBridgeOperation(operationId = "", options = {}) {
    diagnostics.reconciliationRuns += 1;
    const operation = getWorldBridgeOperation(operationId);
    if (!operation) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_NOT_FOUND", operation: null };

    const inspection = inspectLinkedDomainStates(operation);
    const reasonCodes = [...inspection.missing];
    const itemStatus = normalizeToken(inspection.states.itemTransaction?.status || "");
    if (["PREPARED", "COMPENSATING", "RECOVERY_REQUIRED", "FAILED"].includes(itemStatus)) reasonCodes.push(`ITEM_TRANSACTION_${itemStatus}`);

    let nextStatus = operation.status;
    if (!TERMINAL_STATUSES.has(operation.status)) {
      if (reasonCodes.length) nextStatus = "RECOVERY_REQUIRED";
      const intentStatus = normalizeToken(inspection.states.billingIntent?.status || "");
      const hasCapturedTransaction = Boolean(inspection.states.billingTransaction && !inspection.states.billingTransaction.missing);
      if (!reasonCodes.length && operation.currentStep === "CAPTURE" && itemStatus === "COMMITTED" && intentStatus === "AUTHORIZED" && !hasCapturedTransaction) {
        nextStatus = "PAYMENT_RECOVERY_REQUIRED";
        reasonCodes.push("BILLING_CAPTURE_REQUIRED");
      }
    }

    const result = updateWorldBridgeOperation(operation.operationId, {
      status: nextStatus,
      domainStates: inspection.states,
      recovery: {
        required: reasonCodes.length > 0 || RECOVERY_STATUSES.has(nextStatus),
        reasonCodes: [...new Set(reasonCodes)],
        lastReconciledAt: getWorldTime(),
        reconciliationRevision: operation.recovery.reconciliationRevision + 1
      },
      checkpoint: nextStatus !== operation.status,
      checkpointCode: "RECONCILED"
    }, {
      expectedRevision: operation.revision,
      forceTransition: true,
      flush: options.flush === true,
      emit: options.emit,
      source: "WORLD_BRIDGE_OPERATION_RECONCILED"
    });
    if (result.ok) diagnostics.reconciledOperations += 1;
    return result;
  }

  function reconcileInterruptedWorldBridgeOperations(options = {}) {
    const results = getWorldBridgeOperations()
      .filter((operation) => !TERMINAL_STATUSES.has(operation.status))
      .map((operation) => reconcileWorldBridgeOperation(operation.operationId, { ...options, flush: false }));
    if (options.flush !== false && results.some((result) => result?.ok)) flushWorldBridgeOperationPersistence();
    return results;
  }

  function registerWorldBridgeOperationRecoveryHandler(operationType = "", handler = null) {
    const handlerId = normalizeToken(operationType);
    if (!handlerId || typeof handler !== "function") return false;
    recoveryHandlers.set(handlerId, handler);
    return true;
  }

  function unregisterWorldBridgeOperationRecoveryHandler(operationType = "") {
    return recoveryHandlers.delete(normalizeToken(operationType));
  }

  async function retryWorldBridgeOperation(operationId = "", input = {}) {
    diagnostics.retryAttempts += 1;
    const operation = getWorldBridgeOperation(operationId);
    if (!operation) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_NOT_FOUND", operation: null };
    if (!operation.recovery.required && !RECOVERY_STATUSES.has(operation.status) && input.force !== true) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_RETRY_NOT_REQUIRED", operation };
    if (operation.retry.count >= operation.retry.maxAttempts && input.force !== true) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_RETRY_LIMIT_REACHED", operation };
    const handlerId = normalizeToken(input.handlerId || operation.retry.handlerId || operation.operationType);
    const handler = recoveryHandlers.get(handlerId) || recoveryHandlers.get(operation.operationType);
    if (typeof handler !== "function") return { ok: false, reason: "WORLD_BRIDGE_OPERATION_RECOVERY_HANDLER_REQUIRED", handlerId, operation };

    const attempt = updateWorldBridgeOperation(operation.operationId, {
      retry: { count: operation.retry.count + 1, lastAttemptAt: getWorldTime(), lastErrorCode: "" },
      checkpoint: false
    }, { expectedRevision: operation.revision, flush: true, source: "WORLD_BRIDGE_OPERATION_RETRY_STARTED" });
    if (!attempt.ok) return attempt;

    try {
      const handlerResult = await handler(clone(attempt.operation), clone(input));
      if (!handlerResult || handlerResult.ok !== true) {
        const errorCode = normalizeToken(handlerResult?.reason || handlerResult?.errorCode || "WORLD_BRIDGE_OPERATION_RETRY_FAILED");
        diagnostics.retryFailures += 1;
        return updateWorldBridgeOperation(operation.operationId, {
          status: handlerResult?.status || attempt.operation.status,
          retry: { lastErrorCode: errorCode },
          recovery: { required: true, reasonCodes: [...new Set([...(attempt.operation.recovery.reasonCodes || []), errorCode])] },
          errorCode,
          checkpointCode: "RETRY_FAILED"
        }, { expectedRevision: attempt.operation.revision, forceTransition: true, flush: true, source: "WORLD_BRIDGE_OPERATION_RETRY_FAILED" });
      }
      diagnostics.retrySuccesses += 1;
      const attached = handlerResult.refs ? attachWorldBridgeOperationReferences(operation.operationId, handlerResult.refs, { expectedRevision: attempt.operation.revision, flush: true }) : { ok: true, operation: attempt.operation };
      if (!attached.ok) return attached;
      return reconcileWorldBridgeOperation(operation.operationId, { flush: true });
    } catch (error) {
      diagnostics.retryFailures += 1;
      const current = getWorldBridgeOperation(operation.operationId) || attempt.operation;
      return updateWorldBridgeOperation(operation.operationId, {
        retry: { lastErrorCode: "WORLD_BRIDGE_OPERATION_RETRY_EXCEPTION" },
        recovery: { required: true, reasonCodes: [...new Set([...(current.recovery.reasonCodes || []), "WORLD_BRIDGE_OPERATION_RETRY_EXCEPTION"])] },
        errorCode: "WORLD_BRIDGE_OPERATION_RETRY_EXCEPTION",
        errorDetail: error?.message || String(error),
        checkpointCode: "RETRY_EXCEPTION"
      }, { expectedRevision: current.revision, forceTransition: true, flush: true, source: "WORLD_BRIDGE_OPERATION_RETRY_FAILED" });
    }
  }

  function exportWorldBridgeOperations() {
    return serializeOperations();
  }

  function exportWorldBridgeOperationRuntimeData() {
    return { schemaVersion: SCHEMA_VERSION, storeRevision, operations: exportWorldBridgeOperations() };
  }

  function importWorldBridgeOperations(records = [], options = {}) {
    const previousOperations = operationsById;
    const previousRevision = storeRevision;
    const result = replaceOperations(records);
    if (!result.ok) return result;
    storeRevision = normalizeInteger(options.storeRevision, 0, Number.MAX_SAFE_INTEGER, storeRevision + 1);
    persistenceDirty = true;
    if (!flushWorldBridgeOperationPersistence()) {
      operationsById = previousOperations;
      storeRevision = previousRevision;
      rebuildIndexes();
      return { ok: false, reason: "WORLD_BRIDGE_OPERATION_IMPORT_PERSISTENCE_FAILED", errors: [] };
    }
    diagnostics.importedRecords += operationsById.size;
    window.dispatchEvent?.(new CustomEvent("ws:world-bridge-operations-imported", {
      detail: { count: operationsById.size, storeRevision, changedDomains: ["WORLD_BRIDGE_OPERATION"] }
    }));
    reconcileInterruptedWorldBridgeOperations({ flush: true, emit: false });
    return { ok: true, reason: "WORLD_BRIDGE_OPERATIONS_IMPORTED", count: operationsById.size, storeRevision };
  }

  function resetWorldBridgeOperationStore(options = {}) {
    const previousOperations = operationsById;
    const previousRevision = storeRevision;
    operationsById = new Map();
    storeRevision += 1;
    rebuildIndexes();
    persistenceDirty = true;
    const persisted = options.persist === false ? true : flushWorldBridgeOperationPersistence();
    if (!persisted) {
      operationsById = previousOperations;
      storeRevision = previousRevision;
      rebuildIndexes();
      return { ok: false, reason: "WORLD_BRIDGE_OPERATION_PERSISTENCE_FAILED", storeRevision };
    }
    if (options.persist === false) persistedSnapshot = [];
    if (options.emit !== false) {
      window.dispatchEvent?.(new CustomEvent("ws:world-bridge-operations-reset", {
        detail: { storeRevision, changedDomains: ["WORLD_BRIDGE_OPERATION"] }
      }));
    }
    return { ok: true, reason: "WORLD_BRIDGE_OPERATION_STORE_RESET", storeRevision };
  }

  function validateWorldBridgeOperationReadiness() {
    const errors = [];
    const seenKeys = new Map();
    const activeClaims = new Map();
    operationsById.forEach((operation) => {
      if (!operation.operationId) errors.push({ code: "WORLD_BRIDGE_OPERATION_ID_REQUIRED" });
      if (!operation.citizenId) errors.push({ code: "WORLD_BRIDGE_OPERATION_CITIZEN_REQUIRED", operationId: operation.operationId });
      const owner = seenKeys.get(operation.idempotencyKey);
      if (owner && owner !== operation.operationId) errors.push({ code: "WORLD_BRIDGE_OPERATION_IDEMPOTENCY_CONFLICT", operationIds: [owner, operation.operationId] });
      seenKeys.set(operation.idempotencyKey, operation.operationId);
      if (!TERMINAL_STATUSES.has(operation.status)) operation.claims.forEach((claim) => {
        const key = claimKey(claim);
        const claimOwner = activeClaims.get(key);
        if (claimOwner && claimOwner !== operation.operationId) errors.push({ code: "WORLD_BRIDGE_OPERATION_CLAIM_CONFLICT", claimKey: key, operationIds: [claimOwner, operation.operationId] });
        activeClaims.set(key, operation.operationId);
      });
    });
    return {
      ready: errors.length === 0,
      schemaVersion: SCHEMA_VERSION,
      storeRevision,
      operationCount: operationsById.size,
      activeClaimCount: activeClaims.size,
      recoveryCount: getWorldBridgeOperations({ recoveryOnly: true }).length,
      errors
    };
  }

  function getWorldBridgeOperationDiagnostics() {
    return {
      ...clone(diagnostics),
      schemaVersion: SCHEMA_VERSION,
      storeRevision,
      operationCount: operationsById.size,
      activeClaimCount: operationIdByClaimKey.size,
      persistenceDirty
    };
  }

  function resetWorldBridgeOperationDiagnostics() {
    diagnostics = createDiagnostics();
    return getWorldBridgeOperationDiagnostics();
  }

  const initialRecords = readStoredOperations();
  replaceOperations(initialRecords, { allowConflicts: true });
  persistedSnapshot = serializeOperations();

  Object.assign(app, {
    WORLD_BRIDGE_OPERATION_SCHEMA_VERSION: SCHEMA_VERSION,
    createWorldBridgeOperation,
    getWorldBridgeOperation,
    getWorldBridgeOperationByIdempotencyKey,
    getWorldBridgeOperationStoreRevision,
    getWorldBridgeOperationClaimOwner,
    getWorldBridgeOperations,
    getWorldBridgeOperationsByReference,
    updateWorldBridgeOperation,
    transitionWorldBridgeOperation,
    attachWorldBridgeOperationReferences,
    claimWorldBridgeOperationResources,
    releaseWorldBridgeOperationClaims,
    reconcileWorldBridgeOperation,
    reconcileInterruptedWorldBridgeOperations,
    registerWorldBridgeOperationRecoveryHandler,
    unregisterWorldBridgeOperationRecoveryHandler,
    retryWorldBridgeOperation,
    exportWorldBridgeOperations,
    exportWorldBridgeOperationRuntimeData,
    importWorldBridgeOperations,
    resetWorldBridgeOperationStore,
    flushWorldBridgeOperationPersistence,
    validateWorldBridgeOperationReadiness,
    getWorldBridgeOperationDiagnostics,
    resetWorldBridgeOperationDiagnostics
  });

  window.addEventListener?.("pagehide", flushWorldBridgeOperationPersistence);
  document.addEventListener?.("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushWorldBridgeOperationPersistence();
  });

  reconcileInterruptedWorldBridgeOperations({ flush: true, emit: false });
})();
