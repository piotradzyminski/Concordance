window.WS_APP = window.WS_APP || {};

(function initItemInstanceTransactionStore() {
  const STORAGE_KEY = "ws_app_item_instance_transactions_v1";
  const SCHEMA_VERSION = 1;
  const TRANSACTION_STATUSES = new Set([
    "PREPARED",
    "COMMITTED",
    "COMPENSATING",
    "COMPENSATED",
    "FAILED",
    "RECOVERY_REQUIRED"
  ]);

  const clone = window.WS_APP.storeUtils?.clone || function cloneFallback(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  };

  let transactionsById = readStoredTransactions();
  let transactionIdByIdempotencyKey = new Map();
  let transactionStoreRevision = 0;
  let diagnostics = createDiagnostics();

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function normalizeToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function getWorldTime() {
    return String(window.WS_APP.getCampaignDateIso?.() || window.WS_APP.CAMPAIGN_DATE_ISO || "2109-02-13").trim();
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

  function makeTransactionId(idempotencyKey = "") {
    return `item_tx_${stableToken(idempotencyKey)}`;
  }

  function createDiagnostics() {
    return {
      commitAttempts: 0,
      commits: 0,
      commitReplays: 0,
      idempotencyConflicts: 0,
      persistenceRollbacks: 0,
      compensationAttempts: 0,
      compensations: 0,
      compensationReplays: 0,
      compensationConflicts: 0,
      interruptedTransactionsReconciled: 0,
      physicalCommitEvents: 0
    };
  }

  function normalizeSnapshotEntries(entries = []) {
    return (Array.isArray(entries) ? entries : [])
      .map((entry) => ({
        instanceId: normalizeId(entry?.instanceId),
        instance: entry?.instance ? clone(entry.instance) : null
      }))
      .filter((entry) => entry.instanceId);
  }

  function normalizeTransaction(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const status = normalizeToken(source.status || "PREPARED");
    return {
      schemaVersion: SCHEMA_VERSION,
      transactionId: normalizeId(source.transactionId),
      idempotencyKey: normalizeId(source.idempotencyKey),
      requestSignature: normalizeId(source.requestSignature),
      sourceDomain: normalizeToken(source.sourceDomain || "ITEM_INSTANCE"),
      sourceRefId: normalizeId(source.sourceRefId),
      citizenId: normalizeId(source.citizenId),
      status: TRANSACTION_STATUSES.has(status) ? status : "RECOVERY_REQUIRED",
      instanceIds: Array.isArray(source.instanceIds) ? [...new Set(source.instanceIds.map(normalizeId).filter(Boolean))] : [],
      beforeInstances: normalizeSnapshotEntries(source.beforeInstances),
      afterInstances: normalizeSnapshotEntries(source.afterInstances),
      expectedStoreRevision: Number.isFinite(Number(source.expectedStoreRevision)) ? Number(source.expectedStoreRevision) : null,
      committedStoreRevision: Number.isFinite(Number(source.committedStoreRevision)) ? Number(source.committedStoreRevision) : null,
      compensationStoreRevision: Number.isFinite(Number(source.compensationStoreRevision)) ? Number(source.compensationStoreRevision) : null,
      compensationIdempotencyKey: normalizeId(source.compensationIdempotencyKey),
      resultCode: normalizeToken(source.resultCode || ""),
      failureCode: normalizeToken(source.failureCode || ""),
      errors: Array.isArray(source.errors) ? source.errors.map(normalizeId).filter(Boolean) : [],
      metadata: source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata) ? clone(source.metadata) : {},
      preparedAt: normalizeId(source.preparedAt) || getWorldTime(),
      committedAt: normalizeId(source.committedAt) || null,
      compensatedAt: normalizeId(source.compensatedAt) || null,
      updatedAt: normalizeId(source.updatedAt) || getWorldTime(),
      revision: Math.max(1, Math.round(Number(source.revision || 1)) || 1)
    };
  }

  function readStoredTransactions() {
    try {
      const payload = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (!payload || payload.schemaVersion !== SCHEMA_VERSION || !Array.isArray(payload.transactions)) return Object.create(null);
      const next = Object.create(null);
      payload.transactions.map(normalizeTransaction).forEach((record) => {
        if (record.transactionId && record.idempotencyKey) next[record.transactionId] = record;
      });
      return next;
    } catch (error) {
      console.warn("W&S ItemInstance transaction store could not read localStorage.", error);
      return Object.create(null);
    }
  }

  function persistTransactions(nextTransactions = transactionsById) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        transactions: Object.values(nextTransactions)
      }));
      return true;
    } catch (error) {
      console.warn("W&S ItemInstance transaction store could not persist localStorage.", error);
      return false;
    }
  }

  function rebuildIndexes() {
    const next = new Map();
    Object.values(transactionsById).forEach((record) => {
      if (record.idempotencyKey && !next.has(record.idempotencyKey)) next.set(record.idempotencyKey, record.transactionId);
    });
    transactionIdByIdempotencyKey = next;
    transactionStoreRevision += 1;
  }

  function emitTransactionUpdate(record = {}, previousStatus = "") {
    window.dispatchEvent?.(new CustomEvent("ws:item-instance-transaction-updated", {
      detail: {
        eventId: `item-instance-transaction:${record.transactionId}:${record.revision}`,
        transactionId: record.transactionId,
        idempotencyKey: record.idempotencyKey,
        sourceDomain: record.sourceDomain,
        sourceRefId: record.sourceRefId,
        citizenId: record.citizenId,
        instanceIds: [...record.instanceIds],
        status: record.status,
        previousStatus,
        changedDomains: ["ITEM_INSTANCE_TRANSACTION"],
        revision: record.revision
      }
    }));
  }

  function saveTransaction(record = {}, options = {}) {
    const normalized = normalizeTransaction(record);
    if (!normalized.transactionId || !normalized.idempotencyKey) return null;
    const existing = transactionsById[normalized.transactionId] || null;
    const indexedId = transactionIdByIdempotencyKey.get(normalized.idempotencyKey);
    if (indexedId && indexedId !== normalized.transactionId) return null;
    if (existing && normalized.revision <= existing.revision) return null;

    const previousMap = transactionsById;
    const nextMap = { ...transactionsById, [normalized.transactionId]: normalized };
    transactionsById = nextMap;
    rebuildIndexes();
    if (!persistTransactions()) {
      transactionsById = previousMap;
      rebuildIndexes();
      return null;
    }
    if (options.emit !== false) emitTransactionUpdate(normalized, existing?.status || "");
    return clone(normalized);
  }

  function getItemInstanceTransaction(transactionId = "") {
    const record = transactionsById[normalizeId(transactionId)] || null;
    return record ? clone(record) : null;
  }

  function getItemInstanceTransactionByIdempotencyKey(idempotencyKey = "") {
    const transactionId = transactionIdByIdempotencyKey.get(normalizeId(idempotencyKey));
    return transactionId ? getItemInstanceTransaction(transactionId) : null;
  }

  function getItemInstanceTransactions(filters = {}) {
    const citizenId = normalizeId(filters.citizenId);
    const sourceDomain = normalizeToken(filters.sourceDomain);
    const status = normalizeToken(filters.status);
    return Object.values(transactionsById)
      .filter((record) => !citizenId || record.citizenId === citizenId)
      .filter((record) => !sourceDomain || record.sourceDomain === sourceDomain)
      .filter((record) => !status || record.status === status)
      .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
      .map(clone);
  }

  function assertExpectedInstanceState(instance = null, expected = {}, instanceId = "") {
    const source = expected && typeof expected === "object" && !Array.isArray(expected) ? expected : {};
    if (source.exists === true && !instance) return { ok: false, reason: "ITEM_INSTANCE_EXPECTED_TO_EXIST", instanceId };
    if (source.exists === false && instance) return { ok: false, reason: "ITEM_INSTANCE_EXPECTED_TO_BE_MISSING", instanceId };
    if (!instance) return { ok: true };
    if (source.ownerId !== undefined && normalizeId(instance.ownerId) !== normalizeId(source.ownerId)) {
      return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH", instanceId };
    }
    const allowedLocations = Array.isArray(source.locationTypes)
      ? source.locationTypes.map(normalizeToken).filter(Boolean)
      : source.locationType !== undefined
        ? [normalizeToken(source.locationType)]
        : [];
    if (allowedLocations.length && !allowedLocations.includes(normalizeToken(instance.location?.type))) {
      return { ok: false, reason: "ITEM_INSTANCE_LOCATION_CONFLICT", instanceId, allowedLocations, actualLocation: normalizeToken(instance.location?.type) };
    }
    const allowedLifecycle = Array.isArray(source.lifecycleStates)
      ? source.lifecycleStates.map(normalizeToken).filter(Boolean)
      : source.lifecycleState !== undefined
        ? [normalizeToken(source.lifecycleState)]
        : [];
    if (allowedLifecycle.length && !allowedLifecycle.includes(normalizeToken(instance.lifecycleState))) {
      return { ok: false, reason: "ITEM_INSTANCE_LIFECYCLE_CONFLICT", instanceId, allowedLifecycle, actualLifecycle: normalizeToken(instance.lifecycleState) };
    }
    return { ok: true };
  }

  function inferLifecycleForLocation(location = {}, fallback = "STORED") {
    const type = normalizeToken(location?.type);
    if (["BODY", "INSTALLED_IN_ITEM"].includes(type)) return "INSTALLED";
    if (type === "SERVICE") return "IN_SERVICE";
    if (type === "DESTROYED") return "DISPOSED";
    if (type === "VENDOR") return "PACKAGED";
    if (["EQUIPPED", "CONTAINER_GRID", "HOUSING_STORAGE", "HOUSING_ROOM"].includes(type)) return "UNPACKAGED";
    return normalizeToken(fallback || "STORED");
  }

  function mergeItemPatch(current = {}, patch = {}) {
    const source = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {};
    const next = { ...clone(current), ...clone(source) };
    ["location", "durability", "cyberwareState", "authorizationRefs", "flags", "acquisition", "instanceData"].forEach((field) => {
      if (source[field] && typeof source[field] === "object" && !Array.isArray(source[field])) {
        next[field] = { ...(clone(current[field]) || {}), ...clone(source[field]) };
      }
    });
    if (Object.prototype.hasOwnProperty.call(source, "ownerId")) next.ownerId = normalizeId(source.ownerId);
    return next;
  }

  function resolveHighLevelOperations(input = {}) {
    const operations = Array.isArray(input.operations) ? input.operations : [];
    if (!operations.length) return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_OPERATIONS_REQUIRED" };
    const originalById = new Map();
    const workingById = new Map();
    const touchedIds = [];

    function getWorking(instanceId) {
      if (workingById.has(instanceId)) return workingById.get(instanceId);
      const current = window.WS_APP.getItemInstanceById?.(instanceId) || null;
      originalById.set(instanceId, current ? clone(current) : null);
      workingById.set(instanceId, current ? clone(current) : null);
      touchedIds.push(instanceId);
      return workingById.get(instanceId);
    }

    for (const rawOperation of operations) {
      const operation = rawOperation && typeof rawOperation === "object" && !Array.isArray(rawOperation) ? rawOperation : {};
      const type = normalizeToken(operation.type || "PATCH");
      const instanceId = normalizeId(operation.instanceId || operation.instance?.instanceId || operation.instance?.id);
      if (!instanceId) return { ok: false, reason: "ITEM_INSTANCE_ID_REQUIRED" };
      const current = getWorking(instanceId);
      const expectation = assertExpectedInstanceState(current, operation.expected || {}, instanceId);
      if (!expectation.ok) return expectation;

      if (type === "CREATE") {
        if (current) return { ok: false, reason: "DUPLICATE_INSTANCE_ID", instanceId };
        const source = operation.instance && typeof operation.instance === "object" ? { ...clone(operation.instance), instanceId } : null;
        if (!source) return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_INSTANCE_REQUIRED", instanceId };
        const normalized = window.WS_APP.normalizeItemInstance?.(source, 0, { ownerId: source.ownerId });
        if (!normalized) return { ok: false, reason: "INVALID_ITEM_INSTANCE", instanceId };
        normalized.instanceId = instanceId;
        workingById.set(instanceId, normalized);
        continue;
      }

      if (!current) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND", instanceId };

      if (type === "REMOVE") {
        workingById.set(instanceId, null);
        continue;
      }

      if (type === "MOVE") {
        const toLocation = operation.toLocation && typeof operation.toLocation === "object" ? clone(operation.toLocation) : null;
        if (!toLocation?.type) return { ok: false, reason: "ITEM_INSTANCE_TARGET_LOCATION_REQUIRED", instanceId };
        const next = mergeItemPatch(current, operation.patch || {});
        next.location = toLocation;
        if (Object.prototype.hasOwnProperty.call(operation, "ownerId")) next.ownerId = normalizeId(operation.ownerId);
        next.lifecycleState = normalizeToken(operation.lifecycleState || inferLifecycleForLocation(toLocation, current.lifecycleState));
        workingById.set(instanceId, next);
        continue;
      }

      if (type === "PATCH") {
        const next = mergeItemPatch(current, operation.patch || {});
        if (operation.patch?.location) next.lifecycleState = normalizeToken(operation.patch.lifecycleState || inferLifecycleForLocation(next.location, current.lifecycleState));
        workingById.set(instanceId, next);
        continue;
      }

      return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_OPERATION_UNSUPPORTED", operationType: type, instanceId };
    }

    const uniqueIds = [...new Set(touchedIds)];
    const lowLevelOperations = uniqueIds.map((instanceId) => {
      const before = originalById.get(instanceId) || null;
      const after = workingById.get(instanceId) || null;
      return after
        ? { type: "UPSERT", instanceId, instance: after, expected: { snapshot: before, exists: Boolean(before) } }
        : { type: "REMOVE", instanceId, expected: { snapshot: before, exists: Boolean(before) }, allowMissing: !before };
    });
    const preview = window.WS_APP.previewItemInstanceMutationPlan?.({
      expectedStoreRevision: input.expectedStoreRevision,
      operations: lowLevelOperations
    });
    if (!preview?.ok) return preview || { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_PREVIEW_API_UNAVAILABLE" };
    return { ...preview, lowLevelOperations };
  }

  function buildRequestSignature(input = {}) {
    return stableToken(stableSerialize({
      sourceDomain: normalizeToken(input.sourceDomain || "ITEM_INSTANCE"),
      sourceRefId: normalizeId(input.sourceRefId),
      citizenId: normalizeId(input.citizenId),
      operations: input.operations || [],
      metadata: input.metadata || {}
    }));
  }

  function commitItemInstanceTransaction(input = {}) {
    diagnostics.commitAttempts += 1;
    const idempotencyKey = normalizeId(input.idempotencyKey);
    if (!idempotencyKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
    if (typeof window.WS_APP.commitItemInstanceMutationPlan !== "function") return { ok: false, reason: "ITEM_INSTANCE_MUTATION_PLAN_API_REQUIRED" };

    const requestSignature = buildRequestSignature(input);
    const replay = getItemInstanceTransactionByIdempotencyKey(idempotencyKey);
    if (replay) {
      if (replay.requestSignature !== requestSignature) {
        diagnostics.idempotencyConflicts += 1;
        return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_IDEMPOTENCY_CONFLICT", transaction: replay };
      }
      diagnostics.commitReplays += 1;
      return {
        ok: ["COMMITTED", "COMPENSATED", "RECOVERY_REQUIRED"].includes(replay.status),
        operation: "IDEMPOTENT_REPLAY",
        committed: replay.status === "COMMITTED",
        compensated: replay.status === "COMPENSATED",
        recoveryRequired: replay.status === "RECOVERY_REQUIRED",
        transaction: replay
      };
    }

    const resolved = resolveHighLevelOperations(input);
    if (!resolved.ok) return resolved;
    const transactionId = normalizeId(input.transactionId) || makeTransactionId(idempotencyKey);
    const prepared = normalizeTransaction({
      transactionId,
      idempotencyKey,
      requestSignature,
      sourceDomain: input.sourceDomain || "ITEM_INSTANCE",
      sourceRefId: input.sourceRefId,
      citizenId: input.citizenId,
      status: "PREPARED",
      instanceIds: resolved.instanceIds,
      beforeInstances: resolved.beforeInstances,
      afterInstances: resolved.afterInstances,
      expectedStoreRevision: resolved.expectedStoreRevision,
      metadata: input.metadata,
      preparedAt: getWorldTime(),
      updatedAt: getWorldTime(),
      revision: 1
    });
    if (!saveTransaction(prepared)) return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_PREPARE_PERSISTENCE_FAILED" };

    const commit = window.WS_APP.commitItemInstanceMutationPlan({
      expectedStoreRevision: resolved.expectedStoreRevision,
      operations: resolved.operations,
      transactionId,
      eventId: `item-instance-commit:${transactionId}:1`,
      changedDomains: input.changedDomains || ["ITEM_INSTANCE"]
    }, {
      transactionId,
      source: normalizeToken(input.source || `${prepared.sourceDomain}_ITEM_COMMIT`),
      eventId: `item-instance-commit:${transactionId}:1`,
      changedDomains: input.changedDomains || ["ITEM_INSTANCE"],
      skipCitizenEvent: true
    });

    if (!commit?.ok) {
      if (commit?.reason === "ITEM_INSTANCE_PERSISTENCE_FAILED") {
        diagnostics.persistenceRollbacks += 1;
      }
      const failed = saveTransaction({
        ...prepared,
        status: "FAILED",
        failureCode: commit?.reason || "ITEM_INSTANCE_TRANSACTION_COMMIT_FAILED",
        errors: [commit?.reason || "ITEM_INSTANCE_TRANSACTION_COMMIT_FAILED"],
        resultCode: "ITEM_INSTANCE_TRANSACTION_ROLLED_BACK",
        updatedAt: getWorldTime(),
        revision: prepared.revision + 1
      });
      return { ok: false, reason: commit?.reason || "ITEM_INSTANCE_TRANSACTION_COMMIT_FAILED", rolledBack: commit?.rolledBack === true, transaction: failed || prepared };
    }

    diagnostics.physicalCommitEvents += 1;
    const committed = saveTransaction({
      ...prepared,
      status: "COMMITTED",
      committedStoreRevision: commit.storeRevision,
      resultCode: "ITEM_INSTANCE_TRANSACTION_COMMITTED",
      committedAt: getWorldTime(),
      updatedAt: getWorldTime(),
      revision: prepared.revision + 1
    });
    diagnostics.commits += 1;

    if (!committed) {
      return {
        ok: true,
        committed: true,
        recoveryRequired: true,
        reason: "ITEM_INSTANCE_TRANSACTION_FINALIZATION_PERSISTENCE_FAILED",
        transaction: { ...prepared, status: "RECOVERY_REQUIRED", committedStoreRevision: commit.storeRevision },
        instanceIds: [...resolved.instanceIds],
        storeRevision: commit.storeRevision
      };
    }

    return {
      ok: true,
      operation: "COMMITTED",
      committed: true,
      recoveryRequired: false,
      transaction: committed,
      instanceIds: [...resolved.instanceIds],
      storeRevision: commit.storeRevision,
      itemCommit: {
        committed: true,
        status: "COMMITTED",
        transactionId,
        instanceIds: [...resolved.instanceIds],
        revision: commit.storeRevision
      }
    };
  }

  function compensateItemInstanceTransaction(transactionId = "", input = {}) {
    diagnostics.compensationAttempts += 1;
    const transaction = getItemInstanceTransaction(transactionId);
    if (!transaction) return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_NOT_FOUND" };
    const idempotencyKey = normalizeId(input.idempotencyKey || `${transaction.idempotencyKey}:compensate`);
    if (transaction.status === "COMPENSATED") {
      if (transaction.compensationIdempotencyKey && transaction.compensationIdempotencyKey !== idempotencyKey) {
        diagnostics.compensationConflicts += 1;
        return { ok: false, reason: "ITEM_INSTANCE_COMPENSATION_IDEMPOTENCY_CONFLICT", transaction };
      }
      diagnostics.compensationReplays += 1;
      return { ok: true, operation: "IDEMPOTENT_REPLAY", compensated: true, transaction };
    }
    if (!['COMMITTED', 'RECOVERY_REQUIRED'].includes(transaction.status)) {
      return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_NOT_COMPENSATABLE", transaction };
    }
    if (transaction.compensationIdempotencyKey && transaction.compensationIdempotencyKey !== idempotencyKey) {
      diagnostics.compensationConflicts += 1;
      return { ok: false, reason: "ITEM_INSTANCE_COMPENSATION_IDEMPOTENCY_CONFLICT", transaction };
    }

    const compensating = saveTransaction({
      ...transaction,
      status: "COMPENSATING",
      compensationIdempotencyKey: idempotencyKey,
      updatedAt: getWorldTime(),
      revision: transaction.revision + 1
    });
    if (!compensating) return { ok: false, reason: "ITEM_INSTANCE_COMPENSATION_PREPARE_PERSISTENCE_FAILED", transaction };

    const result = window.WS_APP.restoreItemInstanceSnapshots?.(
      transaction.beforeInstances,
      transaction.afterInstances,
      {
        transactionId: transaction.transactionId,
        source: normalizeToken(input.source || "ITEM_INSTANCE_TRANSACTION_COMPENSATION"),
        eventId: `item-instance-compensation:${transaction.transactionId}:${compensating.revision}`,
        changedDomains: input.changedDomains || ["ITEM_INSTANCE"],
        skipCitizenEvent: true
      }
    );

    if (!result?.ok) {
      const recovery = saveTransaction({
        ...compensating,
        status: "RECOVERY_REQUIRED",
        failureCode: result?.reason || "ITEM_INSTANCE_COMPENSATION_FAILED",
        errors: [...new Set([...(compensating.errors || []), result?.reason || "ITEM_INSTANCE_COMPENSATION_FAILED"])],
        updatedAt: getWorldTime(),
        revision: compensating.revision + 1
      });
      if (result?.reason === "ITEM_INSTANCE_SNAPSHOT_CONFLICT") diagnostics.compensationConflicts += 1;
      return { ok: false, reason: result?.reason || "ITEM_INSTANCE_COMPENSATION_FAILED", recoveryRequired: true, transaction: recovery || compensating };
    }

    diagnostics.physicalCommitEvents += 1;
    const compensated = saveTransaction({
      ...compensating,
      status: "COMPENSATED",
      compensationStoreRevision: result.storeRevision,
      resultCode: "ITEM_INSTANCE_TRANSACTION_COMPENSATED",
      compensatedAt: getWorldTime(),
      updatedAt: getWorldTime(),
      revision: compensating.revision + 1
    });
    diagnostics.compensations += 1;
    return {
      ok: true,
      operation: "COMPENSATED",
      compensated: true,
      transaction: compensated || { ...compensating, status: "RECOVERY_REQUIRED" },
      storeRevision: result.storeRevision
    };
  }

  function compareCurrentToSnapshots(entries = []) {
    return (Array.isArray(entries) ? entries : []).every((entry) => {
      const current = window.WS_APP.getItemInstanceById?.(entry.instanceId) || null;
      return window.WS_APP.itemSnapshotsEqual?.(current, entry.instance || null) === true;
    });
  }

  function reconcileInterruptedItemInstanceTransactions() {
    let reconciled = 0;
    Object.values(transactionsById).map(normalizeTransaction).forEach((transaction) => {
      if (!["PREPARED", "COMPENSATING", "RECOVERY_REQUIRED"].includes(transaction.status)) return;
      const matchesAfter = compareCurrentToSnapshots(transaction.afterInstances);
      const matchesBefore = compareCurrentToSnapshots(transaction.beforeInstances);
      let nextStatus = transaction.status;
      let resultCode = transaction.resultCode;
      if (transaction.status === "COMPENSATING") {
        if (matchesBefore) {
          nextStatus = "COMPENSATED";
          resultCode = "ITEM_INSTANCE_COMPENSATION_RECONCILED";
        } else if (!matchesAfter) {
          nextStatus = "RECOVERY_REQUIRED";
          resultCode = "ITEM_INSTANCE_COMPENSATION_STATE_DIVERGED";
        }
      } else if (matchesAfter) {
        nextStatus = "COMMITTED";
        resultCode = "ITEM_INSTANCE_TRANSACTION_COMMIT_RECONCILED";
      } else if (matchesBefore) {
        nextStatus = "FAILED";
        resultCode = "ITEM_INSTANCE_TRANSACTION_ROLLBACK_RECONCILED";
      } else {
        nextStatus = "RECOVERY_REQUIRED";
        resultCode = "ITEM_INSTANCE_TRANSACTION_STATE_DIVERGED";
      }
      if (nextStatus === transaction.status && resultCode === transaction.resultCode) return;
      const saved = saveTransaction({
        ...transaction,
        status: nextStatus,
        resultCode,
        committedAt: nextStatus === "COMMITTED" ? (transaction.committedAt || getWorldTime()) : transaction.committedAt,
        compensatedAt: nextStatus === "COMPENSATED" ? (transaction.compensatedAt || getWorldTime()) : transaction.compensatedAt,
        updatedAt: getWorldTime(),
        revision: transaction.revision + 1
      });
      if (saved) reconciled += 1;
    });
    diagnostics.interruptedTransactionsReconciled += reconciled;
    return { ok: true, reconciled };
  }

  function commitItemInstanceServiceCustody(input = {}) {
    const citizenId = normalizeId(input.citizenId);
    const serviceOrderId = normalizeId(input.serviceOrderId || input.serviceId);
    const providerId = normalizeId(input.providerId);
    const instanceIds = Array.isArray(input.instanceIds) ? [...new Set(input.instanceIds.map(normalizeId).filter(Boolean))] : [];
    if (!citizenId) return { ok: false, reason: "CITIZEN_ID_REQUIRED" };
    if (!serviceOrderId) return { ok: false, reason: "SERVICE_ORDER_ID_REQUIRED" };
    if (!providerId) return { ok: false, reason: "PROVIDER_ID_REQUIRED" };
    if (!instanceIds.length) return { ok: false, reason: "ITEM_INSTANCE_IDS_REQUIRED" };
    if (!input.returnLocation || typeof input.returnLocation !== "object") return { ok: false, reason: "RETURN_LOCATION_REQUIRED" };
    return commitItemInstanceTransaction({
      idempotencyKey: input.idempotencyKey,
      sourceDomain: "SERVICE",
      sourceRefId: serviceOrderId,
      citizenId,
      expectedStoreRevision: input.expectedStoreRevision,
      changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE"],
      metadata: { providerId, returnLocation: clone(input.returnLocation), operationType: normalizeToken(input.operationType || "SERVICE_CUSTODY") },
      operations: instanceIds.map((instanceId) => ({
        type: "MOVE",
        instanceId,
        expected: {
          ownerId: citizenId,
          locationTypes: input.allowedSourceLocationTypes || ["BODY", "HOUSING_STORAGE", "CONTAINER_GRID", "EQUIPPED", "UNPLACED"]
        },
        toLocation: {
          type: "SERVICE",
          characterId: citizenId,
          serviceId: serviceOrderId,
          serviceOrderId,
          providerId,
          returnLocation: clone(input.returnLocation)
        },
        lifecycleState: "IN_SERVICE"
      }))
    });
  }

  function commitItemInstanceBodyPlacement(input = {}) {
    const citizenId = normalizeId(input.citizenId);
    const placements = Array.isArray(input.placements) ? input.placements : [];
    if (!citizenId) return { ok: false, reason: "CITIZEN_ID_REQUIRED" };
    if (!placements.length) return { ok: false, reason: "BODY_PLACEMENTS_REQUIRED" };
    return commitItemInstanceTransaction({
      idempotencyKey: input.idempotencyKey,
      sourceDomain: normalizeToken(input.sourceDomain || "CYBERWARE"),
      sourceRefId: input.sourceRefId,
      citizenId,
      expectedStoreRevision: input.expectedStoreRevision,
      changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE"],
      metadata: input.metadata,
      operations: placements.map((placement) => ({
        type: "MOVE",
        instanceId: normalizeId(placement.instanceId),
        expected: {
          ownerId: citizenId,
          locationTypes: placement.allowedSourceLocationTypes || ["SERVICE", "HOUSING_STORAGE", "CONTAINER_GRID", "UNPLACED"]
        },
        toLocation: {
          type: "BODY",
          characterId: citizenId,
          bodySlots: Array.isArray(placement.bodySlots) ? placement.bodySlots.map(normalizeId).filter(Boolean) : []
        },
        lifecycleState: "INSTALLED",
        patch: placement.patch || {}
      }))
    });
  }

  function commitItemInstanceReplacement(input = {}) {
    const citizenId = normalizeId(input.citizenId);
    const oldInstanceId = normalizeId(input.oldInstanceId);
    const newInstanceId = normalizeId(input.newInstanceId);
    const oldReturnLocation = input.oldReturnLocation && typeof input.oldReturnLocation === "object" ? clone(input.oldReturnLocation) : null;
    const newBodySlots = Array.isArray(input.newBodySlots) ? input.newBodySlots.map(normalizeId).filter(Boolean) : [];
    if (!citizenId) return { ok: false, reason: "CITIZEN_ID_REQUIRED" };
    if (!oldInstanceId || !newInstanceId || oldInstanceId === newInstanceId) return { ok: false, reason: "REPLACE_INSTANCE_IDS_INVALID" };
    if (!oldReturnLocation?.type || normalizeToken(oldReturnLocation.type) === "BODY") return { ok: false, reason: "RETURN_LOCATION_REQUIRED" };
    if (!newBodySlots.length) return { ok: false, reason: "BODY_SLOTS_REQUIRED" };
    return commitItemInstanceTransaction({
      idempotencyKey: input.idempotencyKey,
      sourceDomain: normalizeToken(input.sourceDomain || "CYBERWARE"),
      sourceRefId: input.sourceRefId,
      citizenId,
      expectedStoreRevision: input.expectedStoreRevision,
      changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE"],
      metadata: { operationType: "REPLACE", ...(input.metadata || {}) },
      operations: [
        {
          type: "MOVE",
          instanceId: oldInstanceId,
          expected: { ownerId: citizenId, locationType: "BODY", lifecycleState: "INSTALLED" },
          toLocation: oldReturnLocation,
          lifecycleState: inferLifecycleForLocation(oldReturnLocation, "REMOVED")
        },
        {
          type: "MOVE",
          instanceId: newInstanceId,
          expected: { ownerId: citizenId, locationTypes: input.newAllowedSourceLocationTypes || ["SERVICE", "HOUSING_STORAGE", "CONTAINER_GRID", "UNPLACED"] },
          toLocation: { type: "BODY", characterId: citizenId, bodySlots: newBodySlots },
          lifecycleState: "INSTALLED"
        }
      ]
    });
  }

  function commitItemInstanceMarketReturn(input = {}) {
    const citizenId = normalizeId(input.citizenId);
    const marketOrderId = normalizeId(input.marketOrderId);
    const vendorProviderId = normalizeId(input.vendorProviderId || input.vendorId);
    const instanceIds = Array.isArray(input.instanceIds) ? [...new Set(input.instanceIds.map(normalizeId).filter(Boolean))] : [];
    if (!citizenId) return { ok: false, reason: "CITIZEN_ID_REQUIRED" };
    if (!marketOrderId) return { ok: false, reason: "MARKET_ORDER_ID_REQUIRED" };
    if (!vendorProviderId) return { ok: false, reason: "VENDOR_PROVIDER_ID_REQUIRED" };
    if (!instanceIds.length) return { ok: false, reason: "ITEM_INSTANCE_IDS_REQUIRED" };

    const operations = [];
    for (const instanceId of instanceIds) {
      const instance = window.WS_APP.getItemInstanceById?.(instanceId);
      if (!instance) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND", instanceId };
      if (normalizeId(instance.ownerId) !== citizenId) return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH", instanceId };
      if (normalizeId(instance.acquisition?.marketOrderId || instance.instanceData?.marketOrderId) !== marketOrderId) {
        return { ok: false, reason: "ITEM_INSTANCE_MARKET_ORDER_MISMATCH", instanceId };
      }
      if (normalizeToken(instance.location?.type) !== "HOUSING_STORAGE") return { ok: false, reason: "ITEM_INSTANCE_RETURN_LOCATION_REQUIRED", instanceId };
      if (!['UNPACKAGED', 'STORED'].includes(normalizeToken(instance.lifecycleState))) return { ok: false, reason: "ITEM_INSTANCE_RETURN_LIFECYCLE_BLOCKED", instanceId };
      if (Array.isArray(instance.serviceHistory) && instance.serviceHistory.length) return { ok: false, reason: "ITEM_INSTANCE_SERVICE_HISTORY_PRESENT", instanceId };
      const condition = Number(instance.durability?.current ?? 100);
      const maximum = Number(instance.durability?.maximumOverride || 100);
      if (Number.isFinite(condition) && Number.isFinite(maximum) && condition < maximum) return { ok: false, reason: "ITEM_INSTANCE_CONDITION_CHANGED", instanceId };
      operations.push({
        type: "MOVE",
        instanceId,
        ownerId: "",
        expected: { ownerId: citizenId, locationType: "HOUSING_STORAGE" },
        toLocation: {
          type: "VENDOR",
          vendorId: vendorProviderId,
          vendorProviderId,
          marketOrderId,
          returnReferenceId: normalizeId(input.returnReferenceId || input.idempotencyKey)
        },
        lifecycleState: "PACKAGED",
        patch: {
          acquisition: {
            ...(instance.acquisition || {}),
            returnedAt: getWorldTime(),
            returnedByCitizenId: citizenId,
            returnMarketOrderId: marketOrderId
          },
          flags: {
            ...(instance.flags || {}),
            returnedToVendor: true
          }
        }
      });
    }

    return commitItemInstanceTransaction({
      idempotencyKey: input.idempotencyKey,
      sourceDomain: "MARKET",
      sourceRefId: marketOrderId,
      citizenId,
      expectedStoreRevision: input.expectedStoreRevision,
      changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "MARKET"],
      metadata: { operationType: "MARKET_RETURN", vendorProviderId, returnReferenceId: normalizeId(input.returnReferenceId || input.idempotencyKey) },
      operations
    });
  }

  function normalizeServiceMutationTarget(mutation = {}, input = {}) {
    const to = mutation.toLocation || mutation.location || mutation.to;
    if (to && typeof to === "object") return clone(to);
    const type = normalizeToken(to);
    if (type === "BODY") {
      return {
        type: "BODY",
        characterId: normalizeId(mutation.characterId || input.citizenId),
        bodySlots: Array.isArray(mutation.bodySlots || mutation.targetBodySlots) ? (mutation.bodySlots || mutation.targetBodySlots).map(normalizeId).filter(Boolean) : []
      };
    }
    if (type === "SERVICE") {
      return {
        type: "SERVICE",
        characterId: normalizeId(input.citizenId),
        serviceId: normalizeId(input.serviceOrderId),
        serviceOrderId: normalizeId(input.serviceOrderId),
        providerId: normalizeId(input.providerId),
        returnLocation: input.returnLocation ? clone(input.returnLocation) : null
      };
    }
    if (type === "VENDOR") return { type: "VENDOR", vendorId: normalizeId(input.providerId) };
    return null;
  }

  function commitItemInstanceServiceResult(input = {}) {
    const citizenId = normalizeId(input.citizenId);
    const serviceOrderId = normalizeId(input.serviceOrderId);
    const result = input.result && typeof input.result === "object" ? input.result : {};
    if (!citizenId) return { ok: false, reason: "CITIZEN_ID_REQUIRED" };
    if (!serviceOrderId) return { ok: false, reason: "SERVICE_ORDER_ID_REQUIRED" };

    const patchesById = new Map();
    function ensurePatch(instanceId) {
      const id = normalizeId(instanceId);
      if (!id) return null;
      if (!patchesById.has(id)) patchesById.set(id, { instanceId: id, patch: {} });
      return patchesById.get(id);
    }

    (Array.isArray(result.itemMutations) ? result.itemMutations : []).forEach((mutation) => {
      const entry = ensurePatch(mutation.instanceId);
      if (!entry) return;
      const targetLocation = normalizeServiceMutationTarget(mutation, input);
      if (targetLocation) entry.move = { toLocation: targetLocation, lifecycleState: inferLifecycleForLocation(targetLocation, "STORED") };
    });
    (Array.isArray(result.conditionChanges) ? result.conditionChanges : []).forEach((change) => {
      const entry = ensurePatch(change.instanceId);
      if (!entry) return;
      entry.patch.durability = { ...(entry.patch.durability || {}), current: Number(change.current ?? change.condition ?? change.value) };
    });
    (Array.isArray(result.firmwareChanges) ? result.firmwareChanges : []).forEach((change) => {
      const entry = ensurePatch(change.instanceId);
      if (!entry) return;
      const current = window.WS_APP.getItemInstanceById?.(change.instanceId) || {};
      const firmware = Array.isArray(change.installedFirmware)
        ? clone(change.installedFirmware)
        : Array.isArray(current.cyberwareState?.installedFirmware)
          ? clone(current.cyberwareState.installedFirmware)
          : [];
      if (change.firmwareReleaseId && normalizeToken(change.action || "ADD") === "ADD" && !firmware.includes(change.firmwareReleaseId)) firmware.push(change.firmwareReleaseId);
      if (change.firmwareReleaseId && normalizeToken(change.action) === "REMOVE") {
        entry.patch.cyberwareState = { ...(entry.patch.cyberwareState || {}), installedFirmware: firmware.filter((id) => id !== change.firmwareReleaseId) };
      } else {
        entry.patch.cyberwareState = { ...(entry.patch.cyberwareState || {}), installedFirmware: firmware };
      }
    });
    (Array.isArray(result.authorizationChanges) ? result.authorizationChanges : []).forEach((change) => {
      const entry = ensurePatch(change.instanceId);
      if (!entry) return;
      entry.patch.authorizationRefs = { ...(entry.patch.authorizationRefs || {}), ...(change.authorizationRefs || change.patch || {}) };
    });
    (Array.isArray(result.serviceHistoryEntries) ? result.serviceHistoryEntries : []).forEach((historyEntry) => {
      const entry = ensurePatch(historyEntry.instanceId);
      if (!entry) return;
      const current = window.WS_APP.getItemInstanceById?.(historyEntry.instanceId) || {};
      entry.patch.serviceHistory = [
        ...(Array.isArray(current.serviceHistory) ? clone(current.serviceHistory) : []),
        { ...clone(historyEntry), serviceOrderId, providerId: normalizeId(historyEntry.providerId || input.providerId), createdAt: normalizeId(historyEntry.createdAt) || getWorldTime() }
      ];
    });

    if (!patchesById.size) return { ok: false, reason: "SERVICE_RESULT_ITEM_MUTATIONS_REQUIRED" };
    const operations = [...patchesById.values()].map((entry) => entry.move
      ? {
          type: "MOVE",
          instanceId: entry.instanceId,
          expected: { ownerId: citizenId },
          toLocation: entry.move.toLocation,
          lifecycleState: entry.move.lifecycleState,
          patch: entry.patch
        }
      : {
          type: "PATCH",
          instanceId: entry.instanceId,
          expected: { ownerId: citizenId },
          patch: entry.patch
        });

    return commitItemInstanceTransaction({
      idempotencyKey: input.idempotencyKey,
      sourceDomain: "SERVICE",
      sourceRefId: serviceOrderId,
      citizenId,
      expectedStoreRevision: input.expectedStoreRevision,
      changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE", "SERVICE"],
      metadata: { operationType: "SERVICE_RESULT", providerId: normalizeId(input.providerId), resultCode: normalizeToken(result.resultCode || "") },
      operations
    });
  }

  function validateItemInstanceTransactionReadiness() {
    const requiredApis = [
      "getItemInstanceById",
      "normalizeItemInstance",
      "previewItemInstanceMutationPlan",
      "commitItemInstanceMutationPlan",
      "restoreItemInstanceSnapshots",
      "itemSnapshotsEqual"
    ];
    const missingApis = requiredApis.filter((name) => typeof window.WS_APP[name] !== "function");
    const duplicateIdempotencyKeys = [];
    const seen = new Set();
    Object.values(transactionsById).forEach((record) => {
      if (seen.has(record.idempotencyKey)) duplicateIdempotencyKeys.push(record.idempotencyKey);
      seen.add(record.idempotencyKey);
    });
    return {
      ready: missingApis.length === 0 && duplicateIdempotencyKeys.length === 0,
      schemaVersion: SCHEMA_VERSION,
      transactionCount: Object.keys(transactionsById).length,
      missingApis,
      duplicateIdempotencyKeys: [...new Set(duplicateIdempotencyKeys)],
      storeRevision: transactionStoreRevision
    };
  }

  function getItemInstanceTransactionDiagnostics() {
    return { ...clone(diagnostics), transactionStoreRevision, transactionCount: Object.keys(transactionsById).length };
  }

  function resetItemInstanceTransactionDiagnostics() {
    diagnostics = createDiagnostics();
    return getItemInstanceTransactionDiagnostics();
  }

  rebuildIndexes();
  Object.assign(window.WS_APP, {
    ITEM_INSTANCE_TRANSACTION_SCHEMA_VERSION: SCHEMA_VERSION,
    getItemInstanceTransaction,
    getItemInstanceTransactionByIdempotencyKey,
    getItemInstanceTransactions,
    commitItemInstanceTransaction,
    compensateItemInstanceTransaction,
    reconcileInterruptedItemInstanceTransactions,
    commitItemInstanceServiceCustody,
    commitItemInstanceBodyPlacement,
    commitItemInstanceReplacement,
    commitItemInstanceMarketReturn,
    commitItemInstanceServiceResult,
    validateItemInstanceTransactionReadiness,
    getItemInstanceTransactionDiagnostics,
    resetItemInstanceTransactionDiagnostics
  });

  reconcileInterruptedItemInstanceTransactions();
})();
