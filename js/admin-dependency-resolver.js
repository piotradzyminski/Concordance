window.WS_APP = window.WS_APP || {};

(function initAdminDependencyResolver() {
  const app = window.WS_APP;

  const TERMINAL_WORLD_OPERATION_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
  const BLOCKING_WORLD_OPERATION_STATUSES = new Set(["DRAFT", "PENDING", "AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "RECOVERY_REQUIRED", "PAYMENT_RECOVERY_REQUIRED", "COMPENSATION_REQUIRED"]);
  const BLOCKING_SERVICE_STATUSES = new Set(["DRAFT", "QUOTED", "OFFERED", "PENDING_CONFIRMATION", "AUTHORIZED", "SCHEDULED", "IN_PROGRESS"]);
  const BLOCKING_MARKET_STATUSES = new Set(["DRAFT", "RESERVING", "AUTHORIZED", "FULFILLING", "RETURNING", "PAYMENT_RECOVERY_REQUIRED"]);
  const BLOCKING_BILLING_INTENT_STATUSES = new Set(["DRAFT", "PENDING", "AUTHORIZED", "PARTIALLY_CAPTURED", "PAYMENT_RECOVERY_REQUIRED"]);
  const BLOCKING_BILLING_TRANSACTION_STATUSES = new Set(["PAYMENT_RECOVERY_REQUIRED"]);
  const BLOCKING_ITEM_TRANSACTION_STATUSES = new Set(["PREPARED", "COMPENSATING", "RECOVERY_REQUIRED"]);
  const BLOCKING_HOUSING_RESERVATION_STATUSES = new Set(["RESERVED", "COMMITTING"]);
  const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["ACTIVE", "PAID", "PENDING", "OVERDUE", "SUSPENDED"]);

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function token(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function id(value = "") {
    return String(value || "").trim();
  }

  function unique(values = []) {
    return [...new Set((Array.isArray(values) ? values : []).map(id).filter(Boolean))];
  }

  function recordId(record = {}, candidates = []) {
    for (const key of candidates) {
      const value = id(record?.[key]);
      if (value) return value;
    }
    return "UNKNOWN";
  }

  function containsReference(value, targetId, seen = new Set(), depth = 0) {
    const target = id(targetId);
    if (!target || value === null || value === undefined || depth > 8) return false;
    if (typeof value === "string" || typeof value === "number") return id(value) === target;
    if (typeof value !== "object") return false;
    if (seen.has(value)) return false;
    seen.add(value);
    if (Array.isArray(value)) return value.some((entry) => containsReference(entry, target, seen, depth + 1));
    return Object.values(value).some((entry) => containsReference(entry, target, seen, depth + 1));
  }

  function makeDependency(severity, domain, code, source = {}, options = {}) {
    const status = token(options.status || source.status || source.lifecycleState || source.recordState || "");
    const dependencyId = id(options.recordId || options.id || "UNKNOWN");
    return {
      severity,
      domain,
      code: token(code),
      recordType: id(options.recordType || domain),
      recordId: dependencyId,
      status,
      summary: id(options.summary || `${domain} ${dependencyId}${status ? ` is ${status}` : ""}.`),
      referenceType: id(options.referenceType || ""),
      referenceId: id(options.referenceId || ""),
      revision: Number(source.revision || 0) || 0
    };
  }

  function sortDependencies(records = []) {
    const rank = { BLOCKER: 0, WARNING: 1, INFORMATION: 2 };
    return records.slice().sort((left, right) => {
      return (rank[left.severity] ?? 9) - (rank[right.severity] ?? 9)
        || String(left.domain).localeCompare(String(right.domain))
        || String(left.recordId).localeCompare(String(right.recordId));
    });
  }

  function finalizePreview(subjectType, subjectId, dependencies = [], meta = {}) {
    const deduplicated = new Map();
    (Array.isArray(dependencies) ? dependencies : []).forEach((dependency) => {
      const key = [dependency.severity, dependency.domain, dependency.code, dependency.recordType, dependency.recordId, dependency.referenceType, dependency.referenceId].join("|");
      if (!deduplicated.has(key)) deduplicated.set(key, dependency);
    });
    const records = sortDependencies([...deduplicated.values()]);
    const blockers = records.filter((entry) => entry.severity === "BLOCKER");
    const warnings = records.filter((entry) => entry.severity === "WARNING");
    const information = records.filter((entry) => entry.severity === "INFORMATION");
    return {
      ok: true,
      subjectType,
      subjectId: id(subjectId),
      blocked: blockers.length > 0,
      blockers,
      warnings,
      information,
      dependencies: records,
      counts: {
        blockers: blockers.length,
        warnings: warnings.length,
        information: information.length,
        total: records.length
      },
      storeRevisions: {
        itemInstances: Number(app.getItemInstanceStoreRevision?.() || 0),
        worldOperations: Number(app.getWorldBridgeOperationStoreRevision?.() || 0)
      },
      generatedAt: new Date().toISOString(),
      ...clone(meta)
    };
  }

  function getWorldOperationsForCitizen(citizenId) {
    return typeof app.getWorldBridgeOperations === "function" ? app.getWorldBridgeOperations({ citizenId }) : [];
  }

  function getWorldOperationsForItem(instanceId) {
    const direct = typeof app.getWorldBridgeOperationsByReference === "function"
      ? app.getWorldBridgeOperationsByReference("ITEM_INSTANCE", instanceId)
      : [];
    const all = typeof app.getWorldBridgeOperations === "function" ? app.getWorldBridgeOperations() : [];
    const combined = [...direct, ...all.filter((operation) => containsReference(operation, instanceId))];
    const map = new Map();
    combined.forEach((operation) => {
      const operationId = id(operation?.operationId);
      if (operationId) map.set(operationId, operation);
    });
    return [...map.values()];
  }

  function collectWorldOperationDependencies(operations, referenceType, referenceId) {
    return (Array.isArray(operations) ? operations : []).map((operation) => {
      const status = token(operation.status);
      const operationId = recordId(operation, ["operationId"]);
      const severity = BLOCKING_WORLD_OPERATION_STATUSES.has(status) || !TERMINAL_WORLD_OPERATION_STATUSES.has(status) ? "BLOCKER" : "WARNING";
      return makeDependency(severity, "WORLD_BRIDGE", `WORLD_OPERATION_${status || "UNKNOWN"}`, operation, {
        recordType: "WORLD_OPERATION",
        recordId: operationId,
        status,
        summary: `World operation ${operationId} (${operation.operationType || "WORLD_OPERATION"}) is ${status || "UNKNOWN"}.`,
        referenceType,
        referenceId
      });
    });
  }

  function collectServiceDependencies(citizenId, instanceId = "") {
    const orders = typeof app.getServiceOrders === "function"
      ? app.getServiceOrders({ citizenId: citizenId || undefined, includeTerminal: true })
      : typeof app.getCitizenServiceOrders === "function" && citizenId
        ? app.getCitizenServiceOrders(citizenId, { includeTerminal: true })
        : [];
    return (Array.isArray(orders) ? orders : [])
      .filter((order) => !instanceId || containsReference(order.subjectRefs || order, instanceId))
      .map((order) => {
        const status = token(order.status);
        const serviceOrderId = recordId(order, ["serviceOrderId", "id"]);
        const severity = BLOCKING_SERVICE_STATUSES.has(status) ? "BLOCKER" : "WARNING";
        return makeDependency(severity, "SERVICES", `SERVICE_ORDER_${status || "UNKNOWN"}`, order, {
          recordType: "SERVICE_ORDER",
          recordId: serviceOrderId,
          status,
          summary: `Service order ${serviceOrderId} is ${status || "UNKNOWN"}.`,
          referenceType: instanceId ? "ITEM_INSTANCE" : "CITIZEN",
          referenceId: instanceId || citizenId
        });
      });
  }

  function collectMarketDependencies(citizenId, instanceId = "") {
    const orders = typeof app.getMarketOrders === "function" ? app.getMarketOrders(citizenId ? { citizenId } : {}) : [];
    return (Array.isArray(orders) ? orders : [])
      .filter((order) => !instanceId || containsReference(order, instanceId))
      .map((order) => {
        const status = token(order.status);
        const marketOrderId = recordId(order, ["marketOrderId", "id"]);
        const severity = BLOCKING_MARKET_STATUSES.has(status) ? "BLOCKER" : "WARNING";
        return makeDependency(severity, "MARKET", `MARKET_ORDER_${status || "UNKNOWN"}`, order, {
          recordType: "MARKET_ORDER",
          recordId: marketOrderId,
          status,
          summary: `Market order ${marketOrderId} is ${status || "UNKNOWN"}.`,
          referenceType: instanceId ? "ITEM_INSTANCE" : "CITIZEN",
          referenceId: instanceId || citizenId
        });
      });
  }

  function collectBillingDependencies(citizenId) {
    const dependencies = [];
    const intents = typeof app.getBillingIntents === "function" ? app.getBillingIntents({ citizenId }) : [];
    (Array.isArray(intents) ? intents : []).forEach((intent) => {
      const status = token(intent.status);
      const intentId = recordId(intent, ["billingIntentId", "id"]);
      const severity = BLOCKING_BILLING_INTENT_STATUSES.has(status) ? "BLOCKER" : "WARNING";
      dependencies.push(makeDependency(severity, "BILLING", `BILLING_INTENT_${status || "UNKNOWN"}`, intent, {
        recordType: "BILLING_INTENT",
        recordId: intentId,
        status,
        summary: `Billing intent ${intentId} is ${status || "UNKNOWN"}.`,
        referenceType: "CITIZEN",
        referenceId: citizenId
      }));
    });
    const transactions = typeof app.getBillingTransactions === "function" ? app.getBillingTransactions({ citizenId }) : [];
    (Array.isArray(transactions) ? transactions : []).forEach((transaction) => {
      const status = token(transaction.status);
      const transactionId = recordId(transaction, ["billingTransactionId", "id"]);
      const recovery = BLOCKING_BILLING_TRANSACTION_STATUSES.has(status) || status === "RECOVERY_REQUIRED";
      dependencies.push(makeDependency(recovery ? "BLOCKER" : "WARNING", "BILLING", recovery ? "BILLING_RECOVERY_REQUIRED" : `BILLING_TRANSACTION_${status || "UNKNOWN"}`, transaction, {
        recordType: "BILLING_TRANSACTION",
        recordId: transactionId,
        status,
        summary: `Billing transaction ${transactionId} is ${status || "UNKNOWN"}.`,
        referenceType: "CITIZEN",
        referenceId: citizenId
      }));
    });
    return dependencies;
  }

  function collectItemTransactionDependencies(citizenId, instanceId = "") {
    const transactions = typeof app.getItemInstanceTransactions === "function"
      ? app.getItemInstanceTransactions(citizenId ? { citizenId } : {})
      : [];
    return (Array.isArray(transactions) ? transactions : [])
      .filter((transaction) => !instanceId || containsReference(transaction, instanceId))
      .map((transaction) => {
        const status = token(transaction.status);
        const transactionId = recordId(transaction, ["transactionId", "id"]);
        const severity = BLOCKING_ITEM_TRANSACTION_STATUSES.has(status) ? "BLOCKER" : "WARNING";
        return makeDependency(severity, "ITEM_INSTANCE", `ITEM_TRANSACTION_${status || "UNKNOWN"}`, transaction, {
          recordType: "ITEM_TRANSACTION",
          recordId: transactionId,
          status,
          summary: `Item transaction ${transactionId} is ${status || "UNKNOWN"}.`,
          referenceType: instanceId ? "ITEM_INSTANCE" : "CITIZEN",
          referenceId: instanceId || citizenId
        });
      });
  }

  function collectHousingDependencies(citizenId, instanceId = "") {
    const reservations = typeof app.getHousingPlacementReservations === "function"
      ? app.getHousingPlacementReservations(citizenId ? { citizenId } : {})
      : [];
    return (Array.isArray(reservations) ? reservations : [])
      .filter((reservation) => !instanceId || id(reservation.instanceId) === id(instanceId) || containsReference(reservation, instanceId))
      .map((reservation) => {
        const status = token(reservation.status);
        const reservationId = recordId(reservation, ["reservationId", "id"]);
        const severity = BLOCKING_HOUSING_RESERVATION_STATUSES.has(status) ? "BLOCKER" : "WARNING";
        return makeDependency(severity, "HOUSING", `HOUSING_RESERVATION_${status || "UNKNOWN"}`, reservation, {
          recordType: "HOUSING_RESERVATION",
          recordId: reservationId,
          status,
          summary: `Housing reservation ${reservationId} is ${status || "UNKNOWN"}.`,
          referenceType: instanceId ? "ITEM_INSTANCE" : "CITIZEN",
          referenceId: instanceId || citizenId
        });
      });
  }

  function collectSubscriptionDependencies(citizenId, instanceId = "") {
    let contracts = [];
    if (instanceId && typeof app.getItemInstanceSubscriptionContracts === "function") {
      contracts = app.getItemInstanceSubscriptionContracts(instanceId, { includeInactive: true }) || [];
    } else if (citizenId && typeof app.getCitizenSubscriptionContracts === "function") {
      contracts = app.getCitizenSubscriptionContracts(citizenId, { includeInactive: true }) || [];
    }
    return (Array.isArray(contracts) ? contracts : []).map((contract) => {
      const status = token(contract.status || contract.billingStatus || (contract.active === false ? "INACTIVE" : "ACTIVE"));
      const contractId = recordId(contract, ["subscriptionContractId", "contractId", "id"]);
      const active = contract.active !== false && ACTIVE_SUBSCRIPTION_STATUSES.has(status);
      return makeDependency(active ? "BLOCKER" : "WARNING", "SUBSCRIPTIONS", active ? "ACTIVE_SUBSCRIPTION_TARGET" : `SUBSCRIPTION_${status || "UNKNOWN"}`, contract, {
        recordType: "SUBSCRIPTION_CONTRACT",
        recordId: contractId,
        status,
        summary: `Subscription contract ${contractId} is ${status || "UNKNOWN"}.`,
        referenceType: instanceId ? "ITEM_INSTANCE" : "CITIZEN",
        referenceId: instanceId || citizenId
      });
    });
  }

  function collectItemStructureDependencies(instance = {}) {
    const instanceId = id(instance.instanceId || instance.id);
    const dependencies = [];
    const locationType = token(instance.location?.type);
    if (locationType === "BODY") {
      dependencies.push(makeDependency("BLOCKER", "ITEM_INSTANCE", "ITEM_INSTALLED_IN_BODY", instance, {
        recordType: "ITEM_INSTANCE",
        recordId: instanceId,
        status: instance.lifecycleState,
        summary: `Item ${instanceId} is installed in BODY and must be deinstalled through Services.`,
        referenceType: "ITEM_INSTANCE",
        referenceId: instanceId
      }));
    }
    if (locationType === "SERVICE" || token(instance.lifecycleState) === "IN_SERVICE") {
      dependencies.push(makeDependency("BLOCKER", "ITEM_INSTANCE", "ITEM_IN_SERVICE_CUSTODY", instance, {
        recordType: "ITEM_INSTANCE",
        recordId: instanceId,
        status: instance.lifecycleState,
        summary: `Item ${instanceId} is in service custody.`,
        referenceType: "ITEM_INSTANCE",
        referenceId: instanceId
      }));
    }
    const allItems = typeof app.getItemInstances === "function" ? app.getItemInstances({ includeDisposed: true }) : [];
    (Array.isArray(allItems) ? allItems : []).forEach((candidate) => {
      const candidateId = id(candidate.instanceId || candidate.id);
      if (!candidateId || candidateId === instanceId) return;
      const location = candidate.location || {};
      const linked = id(location.containerInstanceId) === instanceId || id(location.parentItemInstanceId) === instanceId;
      if (!linked) return;
      dependencies.push(makeDependency("BLOCKER", "ITEM_INSTANCE", "ITEM_HAS_DEPENDENT_CHILD", candidate, {
        recordType: "ITEM_INSTANCE",
        recordId: candidateId,
        status: candidate.lifecycleState,
        summary: `Item ${candidateId} is stored in or installed on ${instanceId}.`,
        referenceType: "ITEM_INSTANCE",
        referenceId: instanceId
      }));
    });
    return dependencies;
  }

  function previewItemInstanceAdminDependencies(instanceId, options = {}) {
    const targetId = id(instanceId);
    const instance = app.getItemInstanceById?.(targetId);
    if (!targetId || !instance) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND", subjectType: "ITEM_INSTANCE", subjectId: targetId, blocked: true, blockers: [], warnings: [], information: [], dependencies: [] };
    const dependencies = [
      ...collectItemStructureDependencies(instance),
      ...collectWorldOperationDependencies(getWorldOperationsForItem(targetId), "ITEM_INSTANCE", targetId),
      ...collectServiceDependencies(instance.ownerId, targetId),
      ...collectMarketDependencies(instance.ownerId, targetId),
      ...collectItemTransactionDependencies(instance.ownerId, targetId),
      ...collectHousingDependencies(instance.ownerId, targetId),
      ...collectSubscriptionDependencies(instance.ownerId, targetId)
    ];
    if (token(instance.lifecycleState) === "DISPOSED" || token(instance.location?.type) === "DESTROYED") {
      dependencies.push(makeDependency("INFORMATION", "ITEM_INSTANCE", "ITEM_ALREADY_ARCHIVED", instance, {
        recordType: "ITEM_INSTANCE",
        recordId: targetId,
        status: instance.lifecycleState,
        summary: `Item ${targetId} is already archived/disposed.`,
        referenceType: "ITEM_INSTANCE",
        referenceId: targetId
      }));
    }
    return finalizePreview("ITEM_INSTANCE", targetId, dependencies, {
      citizenId: id(instance.ownerId),
      requestedAction: token(options.action || "PREVIEW")
    });
  }

  function previewCitizenAdminDependencies(citizenId, options = {}) {
    const targetId = id(citizenId);
    const citizen = app.getCitizenById?.(targetId);
    if (!targetId || !citizen || citizen.recordType === "admin") return { ok: false, reason: "CITIZEN_NOT_FOUND", subjectType: "CITIZEN", subjectId: targetId, blocked: true, blockers: [], warnings: [], information: [], dependencies: [] };
    const dependencies = [
      ...collectWorldOperationDependencies(getWorldOperationsForCitizen(targetId), "CITIZEN", targetId),
      ...collectServiceDependencies(targetId),
      ...collectMarketDependencies(targetId),
      ...collectBillingDependencies(targetId),
      ...collectItemTransactionDependencies(targetId),
      ...collectHousingDependencies(targetId),
      ...collectSubscriptionDependencies(targetId)
    ];
    const items = typeof app.getCitizenItemInstances === "function"
      ? app.getCitizenItemInstances(targetId, { includeBody: true, includeDisposed: true })
      : [];
    (Array.isArray(items) ? items : []).forEach((instance) => {
      const instanceId = id(instance.instanceId || instance.id);
      const disposed = token(instance.lifecycleState) === "DISPOSED" || token(instance.location?.type) === "DESTROYED";
      dependencies.push(makeDependency(disposed ? "INFORMATION" : "BLOCKER", "ITEM_INSTANCE", disposed ? "CITIZEN_ARCHIVED_ITEM" : "CITIZEN_OWNS_ITEM_INSTANCE", instance, {
        recordType: "ITEM_INSTANCE",
        recordId: instanceId,
        status: instance.lifecycleState,
        summary: `Citizen ${targetId} ${disposed ? "retains archived" : "owns active"} item ${instanceId}.`,
        referenceType: "CITIZEN",
        referenceId: targetId
      }));
    });
    const linkedUserId = id(citizen.ownerUserId || citizen.linkedUserId || citizen.userId);
    if (linkedUserId) {
      dependencies.push(makeDependency("BLOCKER", "ACCESS", "CITIZEN_LINKED_USER", citizen, {
        recordType: "USER",
        recordId: linkedUserId,
        status: "LINKED",
        summary: `Citizen ${targetId} is linked to user ${linkedUserId}.`,
        referenceType: "CITIZEN",
        referenceId: targetId
      }));
    }
    return finalizePreview("CITIZEN", targetId, dependencies, {
      requestedAction: token(options.action || "PREVIEW")
    });
  }

  function previewCitizenCleanup(citizenId, sections = [], options = {}) {
    const targetId = id(citizenId);
    const selectedSections = unique(sections).map((section) => section.toLowerCase());
    const base = previewCitizenAdminDependencies(targetId, { action: "CLEANUP" });
    if (!base.ok) return base;
    const relevant = base.dependencies.filter((dependency) => {
      if (["CITIZEN_OWNS_ITEM_INSTANCE", "CITIZEN_ARCHIVED_ITEM"].includes(dependency.code)) return false;
      if (dependency.domain === "WORLD_BRIDGE") return selectedSections.some((section) => ["equipment", "cyberware", "service", "work", "income", "subscriptions", "economy"].includes(section));
      if (dependency.domain === "SERVICES") return selectedSections.some((section) => ["service", "work", "income", "equipment", "cyberware"].includes(section));
      if (dependency.domain === "MARKET") return selectedSections.some((section) => ["equipment", "cyberware", "economy"].includes(section));
      if (dependency.domain === "BILLING") return selectedSections.includes("economy");
      if (dependency.domain === "HOUSING") return selectedSections.some((section) => ["equipment", "cyberware"].includes(section));
      if (dependency.domain === "SUBSCRIPTIONS") return selectedSections.includes("subscriptions");
      if (dependency.domain === "ACCESS") return false;
      if (dependency.domain === "ITEM_INSTANCE") return selectedSections.some((section) => ["equipment", "cyberware"].includes(section));
      return true;
    });

    if (selectedSections.includes("equipment") || selectedSections.includes("cyberware")) {
      const allItems = typeof app.getCitizenItemInstances === "function"
        ? app.getCitizenItemInstances(targetId, { includeBody: true, includeDisposed: false })
        : [];
      const selectedItems = (Array.isArray(allItems) ? allItems : []).filter((instance) => {
        const locationType = token(instance.location?.type);
        if (selectedSections.includes("equipment") && locationType !== "BODY") return true;
        if (selectedSections.includes("cyberware") && locationType === "BODY") return true;
        return false;
      });
      const selectedIds = new Set(selectedItems.map((instance) => id(instance.instanceId || instance.id)).filter(Boolean));
      selectedItems.forEach((instance) => {
        const instanceId = id(instance.instanceId || instance.id);
        const itemPreview = previewItemInstanceAdminDependencies(instanceId, { action: "CLEANUP" });
        (itemPreview.dependencies || []).forEach((dependency) => {
          if (["ITEM_ALREADY_ARCHIVED", "ITEM_INSTALLED_IN_BODY"].includes(dependency.code)) return;
          if (dependency.code === "ITEM_HAS_DEPENDENT_CHILD" && selectedIds.has(id(dependency.recordId))) return;
          relevant.push(dependency);
        });
      });
    }

    return finalizePreview("CITIZEN_CLEANUP", targetId, relevant, {
      citizenId: targetId,
      sections: selectedSections,
      mode: token(options.mode || "CLEAR_SELECTED_SECTIONS")
    });
  }


  function containsStructuredRecordReference(record = {}, targetId = "") {
    const target = id(targetId);
    if (!target || !record || typeof record !== "object") return false;
    const seen = new Set();
    const keyPattern = /(^|_)(id|ids|ref|refs)$|related|relation|link|subject|target|source|case|address|file/i;

    function scan(value, force = false, key = "", depth = 0) {
      if (value === null || value === undefined || depth > 8) return false;
      if (typeof value === "string" || typeof value === "number") return force && id(value) === target;
      if (typeof value !== "object") return false;
      if (seen.has(value)) return false;
      seen.add(value);
      if (Array.isArray(value)) return value.some((entry) => scan(entry, force, key, depth + 1));
      return Object.entries(value).some(([childKey, childValue]) => {
        if (["body", "publicText", "restrictedText", "gmText", "summary", "description", "note", "gmNote"].includes(childKey)) return false;
        const nextForce = force || keyPattern.test(childKey);
        return scan(childValue, nextForce, childKey, depth + 1);
      });
    }

    return scan(record, false, "", 0);
  }

  function collectGenericRecordSources() {
    return [
      { domain: "ENCYCLOPEDIA", recordType: "ENCYCLOPEDIA_ENTRY", records: app.getEntries?.({ includeArchived: true }) || [], idKeys: ["id"] },
      { domain: "SYSTEM", recordType: "SYSTEM_RECORD", records: app.getSystemRecords?.({ includeArchived: true }) || [], idKeys: ["id"] },
      { domain: "ADDRESS", recordType: "ADDRESS", records: app.getAddresses?.({ includeArchived: true }) || [], idKeys: ["id"] },
      { domain: "CASE_FILES", recordType: "CASE_FILE", records: app.getCaseFiles?.({ includeArchived: true }) || [], idKeys: ["id"] },
      { domain: "CITIZEN_FILES", recordType: "CITIZEN_FILE", records: app.getCitizenFiles?.({ includeArchived: true, enforceAccess: false }) || [], idKeys: ["fileId", "id"] }
    ];
  }

  function previewAdminRecordDependencies(recordType, recordId, options = {}) {
    const subjectType = token(recordType);
    const subjectId = id(recordId);
    if (!subjectType || !subjectId) {
      return { ok: false, reason: "RECORD_REFERENCE_REQUIRED", subjectType, subjectId, blocked: true, blockers: [], warnings: [], information: [], dependencies: [] };
    }
    const dependencies = [];
    collectGenericRecordSources().forEach((source) => {
      (Array.isArray(source.records) ? source.records : []).forEach((record) => {
        const sourceId = recordIdFromKeys(record, source.idKeys);
        if (!sourceId || (source.recordType === subjectType && sourceId === subjectId)) return;
        if (!containsStructuredRecordReference(record, subjectId)) return;
        const archived = record.archived === true || token(record.recordState) === "ARCHIVED" || token(record.status) === "ARCHIVED";
        dependencies.push(makeDependency(archived ? "WARNING" : "BLOCKER", source.domain, archived ? "HISTORICAL_RECORD_REFERENCE" : "ACTIVE_RECORD_REFERENCE", record, {
          recordType: source.recordType,
          recordId: sourceId,
          status: archived ? "ARCHIVED" : token(record.status || record.recordState || "ACTIVE"),
          summary: `${source.recordType} ${sourceId} references ${subjectType} ${subjectId}.`,
          referenceType: subjectType,
          referenceId: subjectId
        }));
      });
    });
    return finalizePreview(subjectType, subjectId, dependencies, {
      requestedAction: token(options.action || "PREVIEW")
    });
  }

  function recordIdFromKeys(record = {}, keys = []) {
    return recordId(record, keys);
  }

  function canArchiveRecord(recordType, recordId) {
    const preview = previewAdminRecordDependencies(recordType, recordId, { action: "ARCHIVE" });
    return { ...preview, allowed: preview.ok === true };
  }

  function canHardDeleteRecord(recordType, recordId) {
    const preview = previewAdminRecordDependencies(recordType, recordId, { action: "HARD_DELETE" });
    return { ...preview, allowed: preview.ok === true && preview.blocked !== true && (preview.warnings?.length || 0) === 0 };
  }

  function canArchiveItemInstance(instanceId) {
    const preview = previewItemInstanceAdminDependencies(instanceId, { action: "ARCHIVE" });
    return { ...preview, allowed: preview.ok === true && preview.blocked !== true };
  }

  function canHardDeleteItemInstance(instanceId) {
    const preview = previewItemInstanceAdminDependencies(instanceId, { action: "HARD_DELETE" });
    const historicalReferences = preview.warnings?.length || 0;
    return { ...preview, allowed: preview.ok === true && preview.blocked !== true && historicalReferences === 0 };
  }

  function canHardDeleteCitizen(citizenId) {
    const preview = previewCitizenAdminDependencies(citizenId, { action: "HARD_DELETE" });
    return { ...preview, allowed: preview.ok === true && preview.blocked !== true && (preview.warnings?.length || 0) === 0 };
  }

  Object.assign(app, {
    previewCitizenAdminDependencies,
    previewItemInstanceAdminDependencies,
    previewCitizenCleanup,
    previewAdminRecordDependencies,
    canArchiveRecord,
    canHardDeleteRecord,
    canArchiveItemInstance,
    canHardDeleteItemInstance,
    canHardDeleteCitizen
  });
})();
