window.WS_APP = window.WS_APP || {};

(function initSubscriptionPublicApi() {
  const app = window.WS_APP;
  const API_VERSION = "subscriptions_public_api_3_1x";
  const RECEIPT_STORAGE_KEY = "ws_subscription_command_receipts_v1";
  const RECEIPT_LIMIT = 200;
  const ENABLED_CREATE_TARGET_TYPES = new Set(["CITIZEN", "ITEM_INSTANCE"]);
  const BILLING_STATUSES = new Set(["PAID", "PENDING", "OVERDUE", "SUSPENDED", "CANCELLED"]);
  const EVENT_COMPARE_FIELDS = [
    "subscriptionCatalogId",
    "providerId",
    "organizationId",
    "tierId",
    "contractStatus",
    "billingStatus",
    "entitlementStatus",
    "coverageTarget",
    "startedAt",
    "currentPeriodStart",
    "currentPeriodEnd",
    "gracePeriodEndsAt",
    "cancelledAt",
    "suspendedAt",
    "billingAccountId",
    "lastBillingTransactionId",
    "amount",
    "currency",
    "billingCycle",
    "lastPaidAt",
    "lastSettlementAt",
    "lastBilledAt",
    "lastBilledAmount",
    "lastDebtIncrease",
    "cancellationCharge",
    "billingHistory",
    "displaySnapshot"
  ];
  const entitlementResolver = typeof app.resolveSubscriptionEntitlement === "function"
    ? app.resolveSubscriptionEntitlement.bind(app)
    : null;

  if (app.SubscriptionAPI?.version === API_VERSION) return;

  const storeCommands = app.__subscriptionStoreCommands && typeof app.__subscriptionStoreCommands === "object"
    ? app.__subscriptionStoreCommands
    : {};
  const lowLevel = {
    add: typeof storeCommands.addCitizenSubscription === "function" ? storeCommands.addCitizenSubscription : null,
    update: typeof storeCommands.updateCitizenSubscription === "function" ? storeCommands.updateCitizenSubscription : null,
    cancel: typeof storeCommands.cancelCitizenSubscription === "function" ? storeCommands.cancelCitizenSubscription : null,
    remove: typeof storeCommands.removeCitizenSubscription === "function" ? storeCommands.removeCitizenSubscription : null,
    clearCancelled: typeof storeCommands.clearCancelledCitizenSubscriptions === "function" ? storeCommands.clearCancelledCitizenSubscriptions : null,
    pay: typeof storeCommands.payCitizenSubscriptions === "function" ? storeCommands.payCitizenSubscriptions : null,
    weeklySettlement: typeof storeCommands.processWeeklySubscriptionSettlement === "function" ? storeCommands.processWeeklySubscriptionSettlement : null,
    updateCitizen: typeof storeCommands.updateCitizen === "function" ? storeCommands.updateCitizen : null,
    getCatalogEntry: typeof app.getSubscriptionCatalogEntry === "function"
      ? app.getSubscriptionCatalogEntry.bind(app)
      : (typeof app.getSubscriptionCatalogItemById === "function" ? app.getSubscriptionCatalogItemById.bind(app) : null)
  };

  let indexDirty = true;
  let contractsById = new Map();
  let contractRefsById = new Map();
  let contractIdsByCitizen = new Map();
  let contractIdsByTarget = new Map();
  let observedContractsById = new Map();
  let subscriptionMutationDepth = 0;

  function clone(value) {
    if (value === undefined) return undefined;
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function token(value = "") {
    return String(value || "")
      .trim()
      .replace(/[\s-]+/g, "_")
      .replace(/[^A-Za-z0-9_:.]/g, "")
      .toUpperCase();
  }

  function slug(value = "") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "record";
  }

  function hashText(value = "") {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function worldDateIso() {
    const value = String(app.getCampaignDateIso?.() || app.CAMPAIGN_DATE_ISO || "2109-02-13").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "2109-02-13";
  }

  function addDaysIso(dateIso, days) {
    const date = new Date(`${String(dateIso || worldDateIso()).slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return worldDateIso();
    date.setUTCDate(date.getUTCDate() + Math.max(0, Number(days) || 0));
    return date.toISOString().slice(0, 10);
  }

  function getPeriodEnd(catalog = {}, tier = {}, startDate = worldDateIso()) {
    const aligned = String(app.getSettlementPeriodEndIso?.() || app.SETTLEMENT_PERIOD_END_ISO || "").trim();
    if (String(tier.billingCycle || catalog.billingCycle || "WEEKLY").toUpperCase() === "WEEKLY" && /^\d{4}-\d{2}-\d{2}$/.test(aligned)) {
      return aligned;
    }
    return addDaysIso(startDate, Number(tier.durationDays || 7));
  }

  function normalizeTarget(target = {}, citizenId = "") {
    if (typeof app.normalizeSubscriptionCoverageTarget === "function") {
      return app.normalizeSubscriptionCoverageTarget(target, citizenId);
    }
    const type = token(target?.type || "CITIZEN") || "CITIZEN";
    return {
      type,
      id: String(target?.id || (type === "CITIZEN" ? citizenId : "")).trim()
    };
  }

  function normalizeContract(contract = {}, index = 0, citizenId = "") {
    if (typeof app.normalizeSubscriptionContract === "function") {
      return app.normalizeSubscriptionContract(contract, index, { citizenId: citizenId || contract.citizenId || "" });
    }
    return clone(contract);
  }

  function serializeContract(contract = {}, index = 0, citizenId = "") {
    if (typeof app.serializeSubscriptionContract === "function") {
      return app.serializeSubscriptionContract(contract, index, { citizenId: citizenId || contract.citizenId || "" });
    }
    return clone(contract);
  }

  function targetIndexKey(citizenId, target = {}) {
    return `${String(citizenId || "").trim()}::${token(target.type || "CITIZEN")}::${String(target.id || "").trim()}`;
  }

  function invalidateIndexes() {
    indexDirty = true;
    app.invalidateSubscriptionEntitlement?.();
  }

  function rebuildIndexes() {
    if (!indexDirty) return;

    contractsById = new Map();
    contractRefsById = new Map();
    contractIdsByCitizen = new Map();
    contractIdsByTarget = new Map();

    const citizens = typeof app.getCitizens === "function" ? app.getCitizens() : [];
    (Array.isArray(citizens) ? citizens : []).forEach((citizen) => {
      const citizenId = String(citizen?.id || "").trim();
      const subscriptions = Array.isArray(citizen?.subscriptions) ? citizen.subscriptions : [];
      subscriptions.forEach((source, index) => {
        const runtimeContract = normalizeContract(source, index, citizenId);
        const contractId = String(runtimeContract?.subscriptionContractId || runtimeContract?.id || "").trim();
        if (!contractId || runtimeContract.contractValidation?.valid === false) return;
        const contract = serializeContract(runtimeContract, index, citizenId);

        contractsById.set(contractId, contract);
        contractRefsById.set(contractId, { citizenId, index });

        const citizenIds = contractIdsByCitizen.get(citizenId) || [];
        citizenIds.push(contractId);
        contractIdsByCitizen.set(citizenId, citizenIds);

        const targetKey = targetIndexKey(citizenId, contract.coverageTarget || { type: "CITIZEN", id: citizenId });
        const targetIds = contractIdsByTarget.get(targetKey) || [];
        targetIds.push(contractId);
        contractIdsByTarget.set(targetKey, targetIds);
      });
    });

    indexDirty = false;
  }

  function getContractRef(contractId) {
    rebuildIndexes();
    return contractRefsById.get(String(contractId || "").trim()) || null;
  }

  function getSubscriptionContract(contractId) {
    rebuildIndexes();
    const contract = contractsById.get(String(contractId || "").trim());
    return contract ? clone(contract) : null;
  }

  function matchesFilter(contract = {}, filters = {}) {
    if (filters.includeCancelled === false && String(contract.contractStatus || "ACTIVE").toUpperCase() === "CANCELLED") return false;
    if (filters.subscriptionCatalogId && contract.subscriptionCatalogId !== String(filters.subscriptionCatalogId)) return false;
    if (filters.providerId && contract.providerId !== String(filters.providerId)) return false;
    if (filters.organizationId && contract.organizationId !== String(filters.organizationId)) return false;
    if (filters.tierId && contract.tierId !== String(filters.tierId)) return false;
    if (filters.contractStatus && contract.contractStatus !== token(filters.contractStatus)) return false;
    if (filters.billingStatus && contract.billingStatus !== token(filters.billingStatus)) return false;
    if (filters.entitlementStatus && contract.entitlementStatus !== token(filters.entitlementStatus)) return false;
    if (filters.targetType && contract.coverageTarget?.type !== token(filters.targetType)) return false;
    if (filters.targetId && contract.coverageTarget?.id !== String(filters.targetId)) return false;
    return true;
  }

  function getCitizenSubscriptionContracts(citizenId, filters = {}) {
    rebuildIndexes();
    const ids = contractIdsByCitizen.get(String(citizenId || "").trim()) || [];
    return ids
      .map((id) => contractsById.get(id))
      .filter(Boolean)
      .filter((contract) => matchesFilter(contract, filters))
      .map(clone);
  }

  function resolveTargetCitizenId(query = {}, target = {}) {
    const explicitCitizenId = String(query.citizenId || "").trim();
    if (explicitCitizenId) return explicitCitizenId;
    if (token(target.type) !== "ITEM_INSTANCE" || !target.id || typeof app.getItemInstanceById !== "function") return "";
    return String(app.getItemInstanceById(target.id)?.ownerId || "").trim();
  }

  function getSubscriptionContractsForTarget(query = {}) {
    const requestedType = token(query.targetType || query.coverageTarget?.type || "CITIZEN") || "CITIZEN";
    const requestedId = String(query.targetId || query.coverageTarget?.id || query.citizenId || "").trim();
    const provisionalTarget = normalizeTarget({ type: requestedType, id: requestedId }, String(query.citizenId || "").trim());
    const citizenId = resolveTargetCitizenId(query, provisionalTarget);
    const target = normalizeTarget(provisionalTarget, citizenId);
    if (!citizenId || !target.id) return [];
    rebuildIndexes();
    const ids = contractIdsByTarget.get(targetIndexKey(citizenId, target)) || [];
    return ids
      .map((id) => contractsById.get(id))
      .filter(Boolean)
      .filter((contract) => matchesFilter(contract, query))
      .map(clone);
  }

  function getItemInstanceSubscriptionContracts(instanceId = "", filters = {}) {
    const targetId = String(instanceId || "").trim();
    if (!targetId) return [];
    return getSubscriptionContractsForTarget({
      ...clone(filters),
      targetType: "ITEM_INSTANCE",
      targetId
    });
  }

  function validateSubscriptionTarget(input = {}) {
    if (typeof app.validateSubscriptionCoverageTarget !== "function") {
      return {
        valid: false,
        errors: ["SUBSCRIPTION_TARGET_VALIDATOR_UNAVAILABLE"],
        reasons: [],
        coverageTarget: normalizeTarget(input.coverageTarget || { type: input.targetType, id: input.targetId }, input.citizenId || "")
      };
    }
    return app.validateSubscriptionCoverageTarget(input);
  }

  function getEligibleSubscriptionTargets(query = {}) {
    const citizenId = String(query.citizenId || "").trim();
    const subscriptionCatalogId = String(query.subscriptionCatalogId || query.catalogId || "").trim();
    const tierId = String(query.tierId || "").trim();
    const catalog = getSubscriptionCatalogEntry(subscriptionCatalogId);
    if (!citizenId || !catalog) return [];
    const targetPolicy = typeof app.getSubscriptionTargetPolicy === "function"
      ? app.getSubscriptionTargetPolicy(catalog)
      : { allowedTargetTypes: ["CITIZEN"], defaultTargetType: "CITIZEN" };
    const targetType = token(query.targetType || targetPolicy.defaultTargetType || "CITIZEN") || "CITIZEN";
    if (!targetPolicy.allowedTargetTypes.includes(targetType)) return [];

    const candidates = targetType === "ITEM_INSTANCE"
      ? (typeof app.getCitizenItemInstances === "function"
        ? app.getCitizenItemInstances(citizenId, { includeDisposed: true })
          .map((item) => ({ type: "ITEM_INSTANCE", id: String(item.instanceId || "").trim() }))
        : [])
      : [{ type: "CITIZEN", id: citizenId }];

    const includeIneligible = query.includeIneligible === true;
    return candidates.map((coverageTarget) => {
      const validation = validateSubscriptionTarget({
        citizenId,
        subscriptionCatalogId,
        tierId,
        coverageTarget,
        catalog
      });
      const contracts = getSubscriptionContractsForTarget({
        citizenId,
        subscriptionCatalogId,
        targetType: coverageTarget.type,
        targetId: coverageTarget.id,
        includeCancelled: query.includeCancelled !== false
      });
      const openContracts = contracts.filter((contract) => token(contract.contractStatus) !== "CANCELLED");
      return {
        coverageTarget: clone(validation.coverageTarget || coverageTarget),
        targetSnapshot: clone(validation.itemInstance || (coverageTarget.type === "CITIZEN" ? { type: "CITIZEN", id: citizenId } : null)),
        valid: validation.valid === true,
        errors: clone(validation.errors || []),
        reasons: clone(validation.reasons || []),
        available: validation.valid === true && openContracts.length === 0,
        existingSubscriptionContractIds: contracts.map((contract) => contract.subscriptionContractId),
        openSubscriptionContractIds: openContracts.map((contract) => contract.subscriptionContractId)
      };
    }).filter((candidate) => includeIneligible || candidate.valid);
  }

  function getSubscriptionCatalogEntry(subscriptionCatalogId) {
    const id = String(subscriptionCatalogId || "").trim();
    const definition = lowLevel.getCatalogEntry?.(id) || null;
    return definition ? clone(definition) : null;
  }


  function resolveSubscriptionEntitlement(query = {}) {
    if (typeof entitlementResolver !== "function") {
      return {
        allowed: false,
        status: "NOT_FOUND",
        citizenId: String(query.citizenId || "").trim(),
        subscriptionContractId: null,
        subscriptionCatalogId: null,
        providerId: String(query.providerId || "").trim() || null,
        entitlementCode: token(query.entitlementCode),
        coverageTarget: normalizeTarget({
          type: query.targetType || query.coverageTarget?.type || "CITIZEN",
          id: query.targetId || query.coverageTarget?.id || query.citizenId || ""
        }, query.citizenId || ""),
        coverageRuleIds: [],
        reasons: [{ code: "SUBSCRIPTION_ENTITLEMENT_RESOLVER_UNAVAILABLE", severity: "ERROR" }],
        evaluatedAt: new Date().toISOString(),
        contractRevision: 0,
        catalogRevision: 0,
        tierRevision: 0
      };
    }
    return clone(entitlementResolver(query));
  }

  function getCatalogTier(subscriptionCatalogId, tierId) {
    const catalog = getSubscriptionCatalogEntry(subscriptionCatalogId);
    const tier = (catalog?.tiers || []).find((item) => String(item.tierId || item.id || "") === String(tierId || "") && item.active !== false && item.archived !== true) || null;
    return { catalog, tier: tier ? clone(tier) : null };
  }

  function comparableValue(value) {
    if (value === undefined) return "__UNDEFINED__";
    if (value === null) return null;
    if (Array.isArray(value)) return value.map(comparableValue);
    if (typeof value === "object") {
      return Object.keys(value)
        .sort()
        .reduce((result, key) => {
          result[key] = comparableValue(value[key]);
          return result;
        }, {});
    }
    return value;
  }

  function valuesEqual(left, right) {
    return JSON.stringify(comparableValue(left)) === JSON.stringify(comparableValue(right));
  }

  function getChangedFields(previousContract = null, nextContract = null) {
    if (!previousContract && nextContract) return EVENT_COMPARE_FIELDS.slice();
    if (previousContract && !nextContract) return ["recordRemoved"];
    if (!previousContract || !nextContract) return [];
    return EVENT_COMPARE_FIELDS.filter((field) => !valuesEqual(previousContract[field], nextContract[field]));
  }

  function emptyEntitlementSnapshot(contract = null) {
    const citizenId = String(contract?.citizenId || "").trim();
    return {
      allowed: false,
      status: "NOT_FOUND",
      citizenId,
      subscriptionContractId: contract?.subscriptionContractId || null,
      subscriptionCatalogId: contract?.subscriptionCatalogId || null,
      providerId: contract?.providerId || null,
      tierId: contract?.tierId || null,
      coverageTarget: clone(contract?.coverageTarget || normalizeTarget({ type: "CITIZEN", id: citizenId }, citizenId)),
      entitlementCodes: [],
      coverageRuleIds: [],
      reasons: [{ code: "ENTITLEMENT_NOT_FOUND", severity: "BLOCKER" }],
      evaluatedAt: nowIso(),
      contractRevision: Number(contract?.revision || 0),
      catalogRevision: 0,
      tierRevision: 0,
      signature: "0|NOT_FOUND"
    };
  }

  function getContractEntitlementSnapshot(contract = null, atTime = "") {
    if (!contract) return emptyEntitlementSnapshot();
    if (typeof app.getSubscriptionContractEntitlementSnapshot === "function") {
      return clone(app.getSubscriptionContractEntitlementSnapshot(contract, atTime));
    }
    const state = app.resolveSubscriptionContractState?.(contract) || {};
    return {
      ...emptyEntitlementSnapshot(contract),
      allowed: state.entitled === true,
      status: token(state.entitlementStatus || contract.entitlementStatus || "NOT_FOUND"),
      evaluatedAt: nowIso(),
      contractRevision: Number(contract.revision || 0),
      signature: [
        state.entitled === true ? "1" : "0",
        token(state.entitlementStatus || contract.entitlementStatus || "NOT_FOUND"),
        contract.subscriptionCatalogId || "",
        contract.providerId || "",
        contract.tierId || "",
        contract.coverageTarget?.type || "",
        contract.coverageTarget?.id || ""
      ].join("|")
    };
  }

  function normalizeReasonCode(value = "", fallback = "SUBSCRIPTION_UPDATED") {
    return token(value || fallback) || fallback;
  }

  function makeSubscriptionEventDetail(eventName, previousContract = null, nextContract = null, context = {}) {
    const contract = nextContract || previousContract || {};
    const previousSnapshot = context.previousEntitlementSnapshot || getContractEntitlementSnapshot(previousContract, context.atTime);
    const nextSnapshot = context.nextEntitlementSnapshot || getContractEntitlementSnapshot(nextContract, context.atTime);
    const changedFields = Array.isArray(context.changedFields)
      ? Array.from(new Set(context.changedFields.map(String))).sort()
      : getChangedFields(previousContract, nextContract).sort();
    const revision = Number(nextContract?.revision || previousContract?.revision || 0);
    const reasonCode = normalizeReasonCode(context.reasonCode || context.resultCode || context.command, "SUBSCRIPTION_UPDATED");
    const occurredAt = String(context.occurredAt || nowIso());
    const eventId = String(context.eventId || [
      "subscription",
      eventName.replace(/^ws:/, ""),
      contract.subscriptionContractId || "unknown",
      revision,
      hashText([
        reasonCode,
        changedFields.join(","),
        previousSnapshot.signature || "",
        nextSnapshot.signature || ""
      ].join("|"))
    ].join(":"));

    return {
      eventId,
      citizenId: String(contract.citizenId || context.citizenId || "").trim(),
      subscriptionContractId: String(contract.subscriptionContractId || context.subscriptionContractId || "").trim(),
      subscriptionCatalogId: String(contract.subscriptionCatalogId || "").trim(),
      providerId: String(contract.providerId || "").trim(),
      organizationId: String(contract.organizationId || "").trim(),
      coverageTarget: clone(contract.coverageTarget || null),
      contractStatus: token(nextContract?.contractStatus || previousContract?.contractStatus || ""),
      previousContractStatus: token(previousContract?.contractStatus || ""),
      billingStatus: token(nextContract?.billingStatus || previousContract?.billingStatus || ""),
      previousBillingStatus: token(previousContract?.billingStatus || ""),
      entitlementStatus: token(nextSnapshot.status || "NOT_FOUND"),
      previousEntitlementStatus: token(previousSnapshot.status || "NOT_FOUND"),
      allowed: nextSnapshot.allowed === true,
      previousAllowed: previousSnapshot.allowed === true,
      entitlementCodes: clone(nextSnapshot.entitlementCodes || []),
      previousEntitlementCodes: clone(previousSnapshot.entitlementCodes || []),
      coverageRuleIds: clone(nextSnapshot.coverageRuleIds || []),
      previousCoverageRuleIds: clone(previousSnapshot.coverageRuleIds || []),
      changedFields,
      reasonCode,
      command: normalizeReasonCode(context.command || "", ""),
      revision,
      catalogRevision: Number(nextSnapshot.catalogRevision || 0),
      tierRevision: Number(nextSnapshot.tierRevision || 0),
      occurredAt,
      external: context.external === true
    };
  }

  function dispatchSubscriptionEvent(eventName, previousContract = null, nextContract = null, context = {}) {
    if (typeof window.dispatchEvent !== "function" || typeof window.CustomEvent !== "function") return null;
    const detail = makeSubscriptionEventDetail(eventName, previousContract, nextContract, context);
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    return detail;
  }

  function emitContractMutationEvents(previousContract = null, nextContract = null, context = {}) {
    const previousSnapshot = context.previousEntitlementSnapshot || getContractEntitlementSnapshot(previousContract, context.atTime);
    const nextSnapshot = context.nextEntitlementSnapshot || getContractEntitlementSnapshot(nextContract, context.atTime);
    const changedFields = getChangedFields(previousContract, nextContract);
    const shared = { ...context, previousEntitlementSnapshot: previousSnapshot, nextEntitlementSnapshot: nextSnapshot, changedFields };
    const emitted = [];

    if (!previousContract && nextContract) {
      emitted.push(dispatchSubscriptionEvent("ws:subscription-created", null, nextContract, shared));
    } else if (previousContract && nextContract && changedFields.length && context.suppressUpdated !== true) {
      emitted.push(dispatchSubscriptionEvent("ws:subscription-updated", previousContract, nextContract, shared));
    }

    if (previousSnapshot.signature !== nextSnapshot.signature) {
      emitted.push(dispatchSubscriptionEvent("ws:subscription-entitlement-changed", previousContract, nextContract, shared));
    }

    if (
      previousContract
      && nextContract
      && token(previousContract.contractStatus) !== "CANCELLED"
      && token(nextContract.contractStatus) === "CANCELLED"
    ) {
      emitted.push(dispatchSubscriptionEvent("ws:subscription-cancelled", previousContract, nextContract, shared));
    }

    return emitted.filter(Boolean);
  }

  function dispatchSubscriptionBillingFailed(contract = null, context = {}) {
    if (!contract) return null;
    return dispatchSubscriptionEvent("ws:subscription-billing-failed", contract, contract, {
      ...context,
      changedFields: [],
      previousEntitlementSnapshot: getContractEntitlementSnapshot(contract, context.atTime),
      nextEntitlementSnapshot: getContractEntitlementSnapshot(contract, context.atTime),
      reasonCode: context.reasonCode || "SUBSCRIPTION_BILLING_FAILED"
    });
  }

  function withSubscriptionMutation(callback) {
    subscriptionMutationDepth += 1;
    try {
      return callback();
    } finally {
      subscriptionMutationDepth = Math.max(0, subscriptionMutationDepth - 1);
    }
  }

  function readCurrentContractsById() {
    rebuildIndexes();
    return new Map(Array.from(contractsById.entries()).map(([id, contract]) => [id, clone(contract)]));
  }

  function observeContract(contract = null) {
    if (!contract?.subscriptionContractId) return false;
    observedContractsById.set(contract.subscriptionContractId, {
      contract: clone(contract),
      entitlement: getContractEntitlementSnapshot(contract)
    });
    return true;
  }

  function forgetObservedContract(contractId = "") {
    return observedContractsById.delete(String(contractId || "").trim());
  }

  function resetObservedContracts() {
    const current = readCurrentContractsById();
    observedContractsById = new Map();
    current.forEach((contract) => observeContract(contract));
    return observedContractsById.size;
  }

  function reconcileObservedContracts(context = {}) {
    if (subscriptionMutationDepth > 0) return { skipped: true, reason: "SUBSCRIPTION_COMMAND_MUTATION" };
    const current = readCurrentContractsById();
    const previous = observedContractsById;
    const ids = new Set([...previous.keys(), ...current.keys()]);
    let emitted = 0;

    ids.forEach((contractId) => {
      const previousRecord = previous.get(contractId) || null;
      const nextContract = current.get(contractId) || null;
      if (!nextContract) return;
      const nextSnapshot = getContractEntitlementSnapshot(nextContract, context.atTime);
      const eventRecords = emitContractMutationEvents(previousRecord?.contract || null, nextContract, {
        ...context,
        previousEntitlementSnapshot: previousRecord?.entitlement || emptyEntitlementSnapshot(nextContract),
        nextEntitlementSnapshot: nextSnapshot,
        external: true
      });
      emitted += eventRecords.length;
    });

    observedContractsById = new Map();
    current.forEach((contract) => observeContract(contract));
    return { skipped: false, emitted, observed: observedContractsById.size };
  }

  function reconcileObservedEntitlements(context = {}) {
    if (subscriptionMutationDepth > 0) return { skipped: true, reason: "SUBSCRIPTION_COMMAND_MUTATION" };
    const current = readCurrentContractsById();
    let emitted = 0;
    current.forEach((contract, contractId) => {
      const previousRecord = observedContractsById.get(contractId);
      const previousSnapshot = previousRecord?.entitlement || getContractEntitlementSnapshot(contract, context.atTime);
      const nextSnapshot = getContractEntitlementSnapshot(contract, context.atTime);
      if (previousSnapshot.signature !== nextSnapshot.signature) {
        const eventRecords = emitContractMutationEvents(previousRecord?.contract || contract, contract, {
          ...context,
          previousEntitlementSnapshot: previousSnapshot,
          nextEntitlementSnapshot: nextSnapshot,
          suppressUpdated: true,
          external: true
        });
        emitted += eventRecords.length;
      }
      observedContractsById.set(contractId, { contract: clone(contract), entitlement: clone(nextSnapshot) });
    });
    return { skipped: false, emitted, observed: observedContractsById.size };
  }

  function getBillingSelectionContracts(citizenId, options = {}) {
    const category = token(options.category || "");
    const explicitId = String(options.subscriptionId || "").trim();
    const explicitIds = new Set((Array.isArray(options.subscriptionIds) ? options.subscriptionIds : [])
      .map((id) => String(id || "").trim())
      .filter(Boolean));
    return getCitizenSubscriptionContracts(citizenId, { includeCancelled: false })
      .filter((contract) => ["PENDING", "OVERDUE", "SUSPENDED"].includes(token(contract.billingStatus)))
      .filter((contract) => !category || token(contract.displaySnapshot?.category || "") === category)
      .filter((contract) => !explicitId || contract.subscriptionContractId === explicitId)
      .filter((contract) => !explicitIds.size || explicitIds.has(contract.subscriptionContractId));
  }

  function emitBillingFailureEvents(contracts = [], context = {}) {
    return (Array.isArray(contracts) ? contracts : [])
      .map((contract) => dispatchSubscriptionBillingFailed(contract, context))
      .filter(Boolean);
  }

  function readReceipts() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(RECEIPT_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.filter((item) => item && item.key && item.command) : [];
    } catch (error) {
      console.warn("W&S Subscription API could not read command receipts.", error);
      return [];
    }
  }

  function writeReceipts(receipts = []) {
    try {
      const normalized = (Array.isArray(receipts) ? receipts : [])
        .filter((item) => item && item.key && item.command)
        .slice(-RECEIPT_LIMIT);
      window.localStorage.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(normalized));
      return true;
    } catch (error) {
      console.warn("W&S Subscription API could not persist command receipts.", error);
      return false;
    }
  }

  function receiptKey(command, idempotencyKey) {
    const key = String(idempotencyKey || "").trim();
    return key ? `${command}::${key}` : "";
  }

  function findReceipt(command, idempotencyKey) {
    const key = receiptKey(command, idempotencyKey);
    if (!key) return null;
    return readReceipts().find((item) => `${item.command}::${item.key}` === key) || null;
  }

  function persistReceipt(command, idempotencyKey, result = {}) {
    const key = String(idempotencyKey || "").trim();
    if (!key || result.ok !== true) return;
    const receipts = readReceipts().filter((item) => !(item.command === command && item.key === key));
    receipts.push({
      command,
      key,
      citizenId: String(result.citizenId || result.contract?.citizenId || "").trim(),
      subscriptionContractId: String(result.subscriptionContractId || result.contract?.subscriptionContractId || "").trim(),
      revision: Number(result.contract?.revision || result.revision || 0),
      resultCode: String(result.resultCode || "OK"),
      billingResult: result.billingResult ? clone({
        ok: result.billingResult.ok,
        reason: result.billingResult.reason,
        total: result.billingResult.total,
        requestedTotal: result.billingResult.requestedTotal,
        paymentSource: result.billingResult.paymentSource,
        paidCount: result.billingResult.paidCount,
        unpaidCount: result.billingResult.unpaidCount,
        paidIds: result.billingResult.paidIds,
        unpaidIds: result.billingResult.unpaidIds
      }) : null,
      createdAt: nowIso()
    });
    writeReceipts(receipts);
  }

  function replayReceipt(command, idempotencyKey) {
    const receipt = findReceipt(command, idempotencyKey);
    if (!receipt) return null;
    const contract = receipt.subscriptionContractId ? getSubscriptionContract(receipt.subscriptionContractId) : null;
    const citizen = receipt.citizenId ? app.getCitizenById?.(receipt.citizenId) || null : null;
    return {
      ok: true,
      command,
      resultCode: receipt.resultCode || "IDEMPOTENT_REPLAY",
      idempotentReplay: true,
      citizenId: receipt.citizenId || contract?.citizenId || "",
      subscriptionContractId: receipt.subscriptionContractId || contract?.subscriptionContractId || "",
      contract,
      citizen,
      billingResult: clone(receipt.billingResult)
    };
  }

  function fail(command, errorCode, details = {}) {
    const result = {
      ok: false,
      command,
      errorCode,
      resultCode: errorCode,
      ...clone(details)
    };
    app.lastSubscriptionCommandError = clone(result);
    return result;
  }

  function success(command, contract, citizen, extra = {}) {
    const result = {
      ok: true,
      command,
      resultCode: extra.resultCode || "OK",
      citizenId: String(contract?.citizenId || citizen?.id || extra.citizenId || "").trim(),
      subscriptionContractId: String(contract?.subscriptionContractId || extra.subscriptionContractId || "").trim(),
      contract: contract ? clone(contract) : null,
      citizen: citizen ? clone(citizen) : null,
      ...clone(extra)
    };
    delete result.idempotencyKey;
    app.lastSubscriptionCommandError = null;
    return result;
  }

  function commandOptions(input = {}, options = {}) {
    const source = options && typeof options === "object" ? options : {};
    return {
      ...source,
      idempotencyKey: String(source.idempotencyKey || input?.idempotencyKey || "").trim(),
      createdBy: String(source.createdBy || input?.createdBy || app.currentUser?.login || "SYSTEM").trim(),
      reason: String(source.reason || input?.reason || "").trim()
    };
  }

  function buildContractId(input = {}, idempotencyKey = "") {
    const explicit = String(input.subscriptionContractId || "").trim();
    if (explicit) return explicit;
    const seed = idempotencyKey || `${Date.now()}-${Math.random()}-${input.citizenId}-${input.subscriptionCatalogId}`;
    return `subscription-contract-${slug(input.citizenId)}-${slug(input.subscriptionCatalogId)}-${hashText(seed)}`;
  }

  function getOpenDuplicate(citizenId, subscriptionCatalogId, target, excludeContractId = "") {
    return getCitizenSubscriptionContracts(citizenId, {
      includeCancelled: false,
      subscriptionCatalogId,
      targetType: target.type,
      targetId: target.id
    }).find((contract) => contract.subscriptionContractId !== String(excludeContractId || "").trim()) || null;
  }

  function createSubscriptionContract(input = {}, options = {}) {
    const command = "CREATE_SUBSCRIPTION_CONTRACT";
    const commandConfig = commandOptions(input, options);
    const replay = replayReceipt(command, commandConfig.idempotencyKey);
    if (replay) return replay;
    if (!lowLevel.add) return fail(command, "SUBSCRIPTION_STORE_UNAVAILABLE");

    const citizenId = String(input.citizenId || "").trim();
    const citizen = app.getCitizenById?.(citizenId);
    if (!citizen || citizen.recordType === "admin") return fail(command, "SUBSCRIPTION_CITIZEN_NOT_FOUND", { citizenId });

    const subscriptionCatalogId = String(input.subscriptionCatalogId || input.catalogId || "").trim();
    const tierId = String(input.tierId || "").trim();
    const { catalog, tier } = getCatalogTier(subscriptionCatalogId, tierId);
    if (!catalog) return fail(command, "SUBSCRIPTION_CATALOG_NOT_FOUND", { citizenId, subscriptionCatalogId });
    if (!tier) return fail(command, "SUBSCRIPTION_TIER_NOT_FOUND", { citizenId, subscriptionCatalogId, tierId });
    if (catalog.active === false || catalog.archived === true) return fail(command, "SUBSCRIPTION_CATALOG_INACTIVE", { subscriptionCatalogId });

    const targetValidation = validateSubscriptionTarget({
      citizenId,
      subscriptionCatalogId,
      tierId,
      coverageTarget: input.coverageTarget || { type: "CITIZEN", id: citizenId },
      catalog
    });
    const target = targetValidation.coverageTarget || normalizeTarget(input.coverageTarget || { type: "CITIZEN", id: citizenId }, citizenId);
    if (!ENABLED_CREATE_TARGET_TYPES.has(target.type)) {
      return fail(command, "SUBSCRIPTION_TARGET_TYPE_NOT_ENABLED", { coverageTarget: target });
    }
    if (targetValidation.valid !== true) {
      return fail(command, targetValidation.errors?.[0] || "SUBSCRIPTION_TARGET_INVALID", {
        coverageTarget: target,
        targetValidation: clone(targetValidation)
      });
    }

    const proposedContractId = buildContractId({ ...input, citizenId, subscriptionCatalogId }, commandConfig.idempotencyKey);
    if (getSubscriptionContract(proposedContractId)) {
      return fail(command, "SUBSCRIPTION_CONTRACT_ID_EXISTS", { subscriptionContractId: proposedContractId });
    }

    const duplicate = getOpenDuplicate(citizenId, subscriptionCatalogId, target);
    if (duplicate) {
      return fail(command, "SUBSCRIPTION_CONTRACT_ALREADY_EXISTS", {
        citizenId,
        subscriptionContractId: duplicate.subscriptionContractId,
        contract: duplicate
      });
    }

    const startDate = String(input.startedAt || input.startDate || worldDateIso()).slice(0, 10);
    const periodEnd = String(input.currentPeriodEnd || input.endDate || input.renewalDate || getPeriodEnd(catalog, tier, startDate)).slice(0, 10);
    const billingStatus = BILLING_STATUSES.has(token(input.billingStatus || input.status || "PENDING"))
      ? token(input.billingStatus || input.status || "PENDING")
      : "PENDING";
    const contractStatus = billingStatus === "CANCELLED" ? "CANCELLED" : "ACTIVE";
    const displaySnapshot = {
      title: String(catalog.title || "Subscription").trim(),
      tierLabel: String(tier.label || tier.tierId || "Tier").trim(),
      category: token(catalog.category || "OTHER") || "OTHER",
      provider: String(catalog.provider || "LOCAL LEDGER").trim(),
      market: token(catalog.market || "PRIVATE") || "PRIVATE",
      logo: String(catalog.logo || "").trim(),
      description: String(tier.description || catalog.description || "").trim()
    };

    const contract = normalizeContract({
      subscriptionContractId: proposedContractId,
      subscriptionCatalogId,
      citizenId,
      providerId: String(catalog.providerId || input.providerId || "").trim(),
      organizationId: String(catalog.organizationId || input.organizationId || "").trim(),
      tierId: String(tier.tierId || tier.id || tierId).trim(),
      contractStatus,
      billingStatus,
      coverageTarget: target,
      startedAt: startDate,
      currentPeriodStart: String(input.currentPeriodStart || startDate).slice(0, 10),
      currentPeriodEnd: periodEnd,
      gracePeriodEndsAt: input.gracePeriodEndsAt || null,
      cancelledAt: contractStatus === "CANCELLED" ? String(input.cancelledAt || startDate).slice(0, 10) : null,
      suspendedAt: billingStatus === "SUSPENDED" ? String(input.suspendedAt || startDate).slice(0, 10) : null,
      billingAccountId: input.billingAccountId || `billing-account-${citizenId}`,
      lastBillingTransactionId: input.lastBillingTransactionId || null,
      amount: Number(tier.amount || 0),
      currency: String(catalog.currency || "CREDIT").toUpperCase(),
      billingCycle: String(tier.billingCycle || catalog.billingCycle || "WEEKLY").toUpperCase(),
      displaySnapshot,
      revision: 1,
      metadata: {
        ...(input.metadata && typeof input.metadata === "object" ? clone(input.metadata) : {}),
        createdBy: commandConfig.createdBy,
        createdAt: nowIso(),
        lastCommand: command
      }
    }, 0, citizenId);

    const validation = app.validateSubscriptionContract?.(contract);
    if (validation && validation.valid === false) return fail(command, "SUBSCRIPTION_CONTRACT_INVALID", { validation });

    const updatedCitizen = withSubscriptionMutation(() => lowLevel.add(citizenId, serializeContract(contract, 0, citizenId)));
    if (!updatedCitizen) return fail(command, "SUBSCRIPTION_CREATE_FAILED", { citizenId, subscriptionCatalogId, tierId });

    invalidateIndexes();
    const created = getSubscriptionContract(contract.subscriptionContractId);
    emitContractMutationEvents(null, created, {
      command,
      reasonCode: "SUBSCRIPTION_CONTRACT_CREATED"
    });
    observeContract(created);
    const result = success(command, created, updatedCitizen, { resultCode: "SUBSCRIPTION_CONTRACT_CREATED" });
    persistReceipt(command, commandConfig.idempotencyKey, result);
    return result;
  }

  function updateContractById(command, contractId, patch = {}, options = {}) {
    const commandConfig = commandOptions({}, options);
    const replay = replayReceipt(command, commandConfig.idempotencyKey);
    if (replay) return replay;
    if (!lowLevel.update) return fail(command, "SUBSCRIPTION_STORE_UNAVAILABLE");

    const current = getSubscriptionContract(contractId);
    if (!current) return fail(command, "SUBSCRIPTION_CONTRACT_NOT_FOUND", { subscriptionContractId: String(contractId || "") });
    if (current.contractStatus === "CANCELLED" && command !== "REMOVE_SUBSCRIPTION_CONTRACT_RECORD") {
      return fail(command, "SUBSCRIPTION_CONTRACT_CANCELLED", { subscriptionContractId: current.subscriptionContractId, contract: current });
    }

    const metadata = {
      ...(current.metadata && typeof current.metadata === "object" ? clone(current.metadata) : {}),
      ...(patch.metadata && typeof patch.metadata === "object" ? clone(patch.metadata) : {}),
      lastCommand: command,
      lastCommandAt: nowIso(),
      lastCommandBy: commandConfig.createdBy,
      ...(commandConfig.reason ? { lastReason: commandConfig.reason } : {})
    };
    const nextPatch = {
      ...clone(patch),
      subscriptionContractId: current.subscriptionContractId,
      citizenId: current.citizenId,
      revision: Number(current.revision || 1) + 1,
      metadata
    };
    if (nextPatch.billingStatus && !nextPatch.status) nextPatch.status = nextPatch.billingStatus;
    const proposed = serializeContract(normalizeContract({
      ...current,
      ...nextPatch
    }, 0, current.citizenId), 0, current.citizenId);
    const proposedChangedFields = getChangedFields(current, proposed);
    if (!proposedChangedFields.length) {
      const unchangedResult = success(command, current, app.getCitizenById?.(current.citizenId), {
        resultCode: `${options.resultCode || "SUBSCRIPTION_CONTRACT_UPDATED"}_UNCHANGED`
      });
      persistReceipt(command, commandConfig.idempotencyKey, unchangedResult);
      return unchangedResult;
    }

    const updatedCitizen = withSubscriptionMutation(() => lowLevel.update(current.citizenId, current.subscriptionContractId, nextPatch, {
      notify: options.notify,
      createdBy: commandConfig.createdBy
    }));
    if (!updatedCitizen) return fail(command, "SUBSCRIPTION_UPDATE_FAILED", { subscriptionContractId: current.subscriptionContractId });

    invalidateIndexes();
    const updated = getSubscriptionContract(current.subscriptionContractId);
    emitContractMutationEvents(current, updated, {
      command,
      reasonCode: commandConfig.reason || options.resultCode || "SUBSCRIPTION_CONTRACT_UPDATED"
    });
    observeContract(updated);
    const result = success(command, updated, updatedCitizen, { resultCode: options.resultCode || "SUBSCRIPTION_CONTRACT_UPDATED" });
    persistReceipt(command, commandConfig.idempotencyKey, result);
    return result;
  }

  function changeSubscriptionTier(contractId, tierId, options = {}) {
    const command = "CHANGE_SUBSCRIPTION_TIER";
    const commandConfig = commandOptions({}, options);
    const replay = replayReceipt(command, commandConfig.idempotencyKey);
    if (replay) return replay;
    const current = getSubscriptionContract(contractId);
    if (!current) return fail(command, "SUBSCRIPTION_CONTRACT_NOT_FOUND", { subscriptionContractId: String(contractId || "") });
    const { catalog, tier } = getCatalogTier(current.subscriptionCatalogId, tierId);
    if (!catalog) return fail(command, "SUBSCRIPTION_CATALOG_NOT_FOUND", { subscriptionCatalogId: current.subscriptionCatalogId });
    if (!tier) return fail(command, "SUBSCRIPTION_TIER_NOT_FOUND", { subscriptionCatalogId: current.subscriptionCatalogId, tierId });
    if (String(current.tierId) === String(tier.tierId || tier.id)) {
      return success(command, current, app.getCitizenById?.(current.citizenId), { resultCode: "SUBSCRIPTION_TIER_UNCHANGED" });
    }

    const displaySnapshot = {
      ...(current.displaySnapshot || {}),
      title: String(catalog.title || current.displaySnapshot?.title || current.title || "Subscription").trim(),
      tierLabel: String(tier.label || tier.tierId || tier.id || "Tier").trim(),
      category: token(catalog.category || current.displaySnapshot?.category || current.category || "OTHER") || "OTHER",
      provider: String(catalog.provider || current.displaySnapshot?.provider || current.provider || "LOCAL LEDGER").trim(),
      market: token(catalog.market || current.displaySnapshot?.market || current.market || "PRIVATE") || "PRIVATE",
      logo: String(catalog.logo || current.displaySnapshot?.logo || current.logo || "").trim(),
      description: String(tier.description || catalog.description || current.displaySnapshot?.description || current.description || "").trim()
    };

    return updateContractById(command, contractId, {
      tierId: String(tier.tierId || tier.id || tierId),
      providerId: String(catalog.providerId || current.providerId || ""),
      organizationId: String(catalog.organizationId || current.organizationId || ""),
      amount: Number(tier.amount || 0),
      currency: String(catalog.currency || current.currency || "CREDIT").toUpperCase(),
      billingCycle: String(tier.billingCycle || catalog.billingCycle || current.billingCycle || "WEEKLY").toUpperCase(),
      billingStatus: token(options.billingStatus || "PENDING") || "PENDING",
      suspendedAt: null,
      cancelledAt: null,
      displaySnapshot
    }, {
      ...options,
      resultCode: "SUBSCRIPTION_TIER_CHANGED"
    });
  }

  function changeSubscriptionCoverageTarget(contractId, coverageTarget = {}, options = {}) {
    const command = "CHANGE_SUBSCRIPTION_COVERAGE_TARGET";
    const commandConfig = commandOptions({}, options);
    const replay = replayReceipt(command, commandConfig.idempotencyKey);
    if (replay) return replay;

    const current = getSubscriptionContract(contractId);
    if (!current) return fail(command, "SUBSCRIPTION_CONTRACT_NOT_FOUND", { subscriptionContractId: String(contractId || "") });
    const catalog = getSubscriptionCatalogEntry(current.subscriptionCatalogId);
    const targetValidation = validateSubscriptionTarget({
      citizenId: current.citizenId,
      subscriptionCatalogId: current.subscriptionCatalogId,
      tierId: current.tierId,
      coverageTarget,
      catalog
    });
    const target = targetValidation.coverageTarget || normalizeTarget(coverageTarget, current.citizenId);
    if (targetValidation.valid !== true) {
      return fail(command, targetValidation.errors?.[0] || "SUBSCRIPTION_TARGET_INVALID", {
        subscriptionContractId: current.subscriptionContractId,
        coverageTarget: target,
        targetValidation: clone(targetValidation)
      });
    }
    if (current.coverageTarget?.type === target.type && current.coverageTarget?.id === target.id) {
      return success(command, current, app.getCitizenById?.(current.citizenId), {
        resultCode: "SUBSCRIPTION_TARGET_UNCHANGED"
      });
    }

    const duplicate = getOpenDuplicate(current.citizenId, current.subscriptionCatalogId, target, current.subscriptionContractId);
    if (duplicate) {
      return fail(command, "SUBSCRIPTION_CONTRACT_ALREADY_EXISTS", {
        citizenId: current.citizenId,
        subscriptionContractId: duplicate.subscriptionContractId,
        coverageTarget: target,
        contract: duplicate
      });
    }

    return updateContractById(command, contractId, {
      coverageTarget: target
    }, {
      ...options,
      reason: options.reason || "SUBSCRIPTION_TARGET_CHANGED",
      resultCode: "SUBSCRIPTION_TARGET_CHANGED"
    });
  }

  function setSubscriptionBillingStatus(contractId, billingStatus, options = {}) {
    const normalizedStatus = token(billingStatus || "PENDING");
    if (!BILLING_STATUSES.has(normalizedStatus)) {
      return fail("SET_SUBSCRIPTION_BILLING_STATUS", "SUBSCRIPTION_BILLING_STATUS_INVALID", { billingStatus: normalizedStatus });
    }
    if (normalizedStatus === "CANCELLED") {
      return cancelSubscriptionContract(contractId, options.reason || "STATUS_OVERRIDE", {
        ...options,
        waiveCharge: options.waiveCharge === true || app.currentUser?.role === "admin"
      });
    }

    const date = worldDateIso();
    return updateContractById("SET_SUBSCRIPTION_BILLING_STATUS", contractId, {
      billingStatus: normalizedStatus,
      contractStatus: "ACTIVE",
      suspendedAt: normalizedStatus === "SUSPENDED" ? date : null,
      cancelledAt: null,
      ...(options.metadata && typeof options.metadata === "object" ? { metadata: clone(options.metadata) } : {})
    }, {
      ...options,
      resultCode: `SUBSCRIPTION_BILLING_${normalizedStatus}`
    });
  }

  function suspendSubscriptionContract(contractId, reason = "", options = {}) {
    return updateContractById("SUSPEND_SUBSCRIPTION_CONTRACT", contractId, {
      billingStatus: "SUSPENDED",
      contractStatus: "ACTIVE",
      suspendedAt: worldDateIso(),
      cancelledAt: null,
      ...(options.metadata && typeof options.metadata === "object" ? { metadata: clone(options.metadata) } : {})
    }, {
      ...options,
      reason: reason || options.reason || "SUSPENDED",
      resultCode: "SUBSCRIPTION_CONTRACT_SUSPENDED"
    });
  }

  function resumeSubscriptionContract(contractId, options = {}) {
    const billingStatus = token(options.billingStatus || "PENDING");
    if (!["PENDING", "PAID"].includes(billingStatus)) {
      return fail("RESUME_SUBSCRIPTION_CONTRACT", "SUBSCRIPTION_RESUME_STATUS_INVALID", { billingStatus });
    }
    return updateContractById("RESUME_SUBSCRIPTION_CONTRACT", contractId, {
      billingStatus,
      contractStatus: "ACTIVE",
      suspendedAt: null,
      cancelledAt: null,
      ...(options.metadata && typeof options.metadata === "object" ? { metadata: clone(options.metadata) } : {})
    }, {
      ...options,
      resultCode: "SUBSCRIPTION_CONTRACT_RESUMED"
    });
  }

  function cancelSubscriptionContract(contractId, reason = "", options = {}) {
    const command = "CANCEL_SUBSCRIPTION_CONTRACT";
    const commandConfig = commandOptions({ reason }, options);
    const replay = replayReceipt(command, commandConfig.idempotencyKey);
    if (replay) return replay;
    if (!lowLevel.cancel || !lowLevel.update) return fail(command, "SUBSCRIPTION_STORE_UNAVAILABLE");

    const current = getSubscriptionContract(contractId);
    if (!current) return fail(command, "SUBSCRIPTION_CONTRACT_NOT_FOUND", { subscriptionContractId: String(contractId || "") });
    if (current.contractStatus === "CANCELLED") {
      return success(command, current, app.getCitizenById?.(current.citizenId), { resultCode: "SUBSCRIPTION_ALREADY_CANCELLED" });
    }

    const cancelledCitizen = withSubscriptionMutation(() => lowLevel.cancel(current.citizenId, current.subscriptionContractId, {
      waiveCharge: options.waiveCharge === true,
      source: options.source,
      createdBy: commandConfig.createdBy
    }));
    if (!cancelledCitizen) return fail(command, "SUBSCRIPTION_CANCEL_FAILED", { subscriptionContractId: current.subscriptionContractId });

    const metadata = {
      ...(current.metadata || {}),
      ...(options.metadata && typeof options.metadata === "object" ? clone(options.metadata) : {}),
      lastCommand: command,
      lastCommandAt: nowIso(),
      lastCommandBy: commandConfig.createdBy,
      cancellationReason: commandConfig.reason || "CANCELLED"
    };
    const revisedCitizen = withSubscriptionMutation(() => lowLevel.update(current.citizenId, current.subscriptionContractId, {
      revision: Number(current.revision || 1) + 1,
      metadata
    }, { notify: false, createdBy: commandConfig.createdBy })) || cancelledCitizen;

    invalidateIndexes();
    const cancelled = getSubscriptionContract(current.subscriptionContractId);
    emitContractMutationEvents(current, cancelled, {
      command,
      reasonCode: commandConfig.reason || "SUBSCRIPTION_CONTRACT_CANCELLED"
    });
    observeContract(cancelled);
    const result = success(command, cancelled, revisedCitizen, { resultCode: "SUBSCRIPTION_CONTRACT_CANCELLED" });
    persistReceipt(command, commandConfig.idempotencyKey, result);
    return result;
  }

  function incrementBillingRevisions(citizenId, result = {}, command = "PROCESS_SUBSCRIPTION_BILLING", options = {}) {
    if (!result?.ok || !lowLevel.updateCitizen) return result?.citizen || app.getCitizenById?.(citizenId) || null;
    const affected = new Set([...(result.paidIds || []), ...(result.unpaidIds || [])].map(String));
    if (!affected.size) return result.citizen || app.getCitizenById?.(citizenId) || null;
    const citizen = app.getCitizenById?.(citizenId);
    if (!citizen) return null;
    const subscriptions = (Array.isArray(citizen.subscriptions) ? citizen.subscriptions : []).map((source, index) => {
      const contract = normalizeContract(source, index, citizenId);
      if (!affected.has(String(contract.subscriptionContractId))) return serializeContract(contract, index, citizenId);
      return serializeContract({
        ...contract,
        revision: Number(contract.revision || 1) + 1,
        metadata: {
          ...(contract.metadata || {}),
          lastCommand: command,
          lastCommandAt: nowIso(),
          lastCommandBy: options.createdBy || app.currentUser?.login || "SYSTEM"
        }
      }, index, citizenId);
    });
    return lowLevel.updateCitizen(citizenId, { subscriptions }, { source: "SUBSCRIPTIONS_API" });
  }

  function processSubscriptionBilling(contractId, options = {}) {
    const command = "PROCESS_SUBSCRIPTION_BILLING";
    const commandConfig = commandOptions({}, options);
    const replay = replayReceipt(command, commandConfig.idempotencyKey);
    if (replay) return replay;
    if (!lowLevel.pay) return fail(command, "SUBSCRIPTION_BILLING_UNAVAILABLE");

    const current = getSubscriptionContract(contractId);
    if (!current) return fail(command, "SUBSCRIPTION_CONTRACT_NOT_FOUND", { subscriptionContractId: String(contractId || "") });

    let billingResult = null;
    let citizen = null;
    withSubscriptionMutation(() => {
      billingResult = lowLevel.pay(current.citizenId, {
        subscriptionId: current.subscriptionContractId,
        paymentSource: options.paymentSource,
        note: options.note,
        notify: options.notify,
        createdBy: commandConfig.createdBy
      });
      if (billingResult?.ok) {
        citizen = incrementBillingRevisions(current.citizenId, billingResult, command, commandConfig) || billingResult.citizen;
      }
    });

    if (!billingResult?.ok) {
      emitBillingFailureEvents([current], {
        command,
        reasonCode: billingResult?.reason || "SUBSCRIPTION_BILLING_FAILED"
      });
      return fail(command, billingResult?.reason || "SUBSCRIPTION_BILLING_FAILED", { billingResult: clone(billingResult) });
    }

    invalidateIndexes();
    const updated = getSubscriptionContract(current.subscriptionContractId);
    emitContractMutationEvents(current, updated, {
      command,
      reasonCode: billingResult.partial ? "SUBSCRIPTION_BILLING_PARTIAL" : "SUBSCRIPTION_BILLING_PROCESSED"
    });
    observeContract(updated);
    if ((billingResult.unpaidIds || []).map(String).includes(current.subscriptionContractId)) {
      dispatchSubscriptionBillingFailed(updated || current, {
        command,
        reasonCode: "SUBSCRIPTION_BILLING_PARTIAL"
      });
    }

    const result = success(command, updated, citizen, {
      resultCode: "SUBSCRIPTION_BILLING_PROCESSED",
      billingResult: clone({ ...billingResult, citizen: undefined })
    });
    persistReceipt(command, commandConfig.idempotencyKey, result);
    return result;
  }

  function processCitizenSubscriptionBilling(citizenId, options = {}) {
    const command = "PROCESS_CITIZEN_SUBSCRIPTION_BILLING";
    const commandConfig = commandOptions({}, options);
    const replay = replayReceipt(command, commandConfig.idempotencyKey);
    if (replay) return replay;
    if (!lowLevel.pay) return fail(command, "SUBSCRIPTION_BILLING_UNAVAILABLE");

    const selectedContracts = getBillingSelectionContracts(citizenId, options);
    const previousById = new Map(selectedContracts.map((contract) => [contract.subscriptionContractId, contract]));
    let billingResult = null;
    let citizen = null;
    withSubscriptionMutation(() => {
      billingResult = lowLevel.pay(citizenId, {
        category: options.category,
        subscriptionId: options.subscriptionId,
        subscriptionIds: options.subscriptionIds,
        paymentSource: options.paymentSource,
        note: options.note,
        notify: options.notify,
        createdBy: commandConfig.createdBy
      });
      if (billingResult?.ok) {
        citizen = incrementBillingRevisions(citizenId, billingResult, command, commandConfig) || billingResult.citizen;
      }
    });

    if (!billingResult?.ok) {
      emitBillingFailureEvents(selectedContracts, {
        command,
        reasonCode: billingResult?.reason || "SUBSCRIPTION_BILLING_FAILED"
      });
      return fail(command, billingResult?.reason || "SUBSCRIPTION_BILLING_FAILED", { billingResult: clone(billingResult) });
    }

    invalidateIndexes();
    const affectedIds = new Set([
      ...(billingResult.paidIds || []),
      ...(billingResult.unpaidIds || [])
    ].map(String));
    affectedIds.forEach((subscriptionContractId) => {
      const previous = previousById.get(subscriptionContractId) || null;
      const updated = getSubscriptionContract(subscriptionContractId);
      if (!updated) return;
      emitContractMutationEvents(previous, updated, {
        command,
        reasonCode: (billingResult.unpaidIds || []).map(String).includes(subscriptionContractId)
          ? "SUBSCRIPTION_BILLING_PARTIAL"
          : "SUBSCRIPTION_BILLING_PROCESSED"
      });
      observeContract(updated);
    });

    (billingResult.unpaidIds || []).map(String).forEach((subscriptionContractId) => {
      const updated = getSubscriptionContract(subscriptionContractId) || previousById.get(subscriptionContractId);
      dispatchSubscriptionBillingFailed(updated, {
        command,
        reasonCode: "SUBSCRIPTION_BILLING_PARTIAL"
      });
    });

    const result = success(command, null, citizen, {
      citizenId,
      resultCode: "CITIZEN_SUBSCRIPTION_BILLING_PROCESSED",
      billingResult: clone({ ...billingResult, citizen: undefined })
    });
    persistReceipt(command, commandConfig.idempotencyKey, result);
    return result;
  }

  function processWeeklySubscriptionSettlement(options = {}) {
    const command = "PROCESS_WEEKLY_SUBSCRIPTION_SETTLEMENT";
    if (!lowLevel.weeklySettlement) return fail(command, "SUBSCRIPTION_SETTLEMENT_UNAVAILABLE");
    const settlementDateIso = String(options.settlementDateIso || app.getSettlementPeriodEndIso?.() || "").trim();
    const result = lowLevel.weeklySettlement({
      ...clone(options),
      settlementDateIso
    });
    if (!result?.ok) {
      return fail(command, result?.reason || "SUBSCRIPTION_SETTLEMENT_FAILED", {
        settlementDateIso,
        settlementResult: clone(result)
      });
    }
    invalidateIndexes();
    return {
      ...clone(result),
      command,
      resultCode: "WEEKLY_SUBSCRIPTION_SETTLEMENT_PROCESSED"
    };
  }

  function removeSubscriptionContractRecord(contractId, options = {}) {
    const command = "REMOVE_SUBSCRIPTION_CONTRACT_RECORD";
    const current = getSubscriptionContract(contractId);
    if (!current) return fail(command, "SUBSCRIPTION_CONTRACT_NOT_FOUND", { subscriptionContractId: String(contractId || "") });
    if (current.contractStatus !== "CANCELLED" && options.force !== true) {
      return fail(command, "SUBSCRIPTION_RECORD_NOT_CANCELLED", { contract: current });
    }
    const citizen = withSubscriptionMutation(() => lowLevel.remove?.(current.citizenId, current.subscriptionContractId, options));
    if (!citizen) return fail(command, "SUBSCRIPTION_RECORD_REMOVE_FAILED", { subscriptionContractId: current.subscriptionContractId });
    invalidateIndexes();
    forgetObservedContract(current.subscriptionContractId);
    return success(command, null, citizen, {
      citizenId: current.citizenId,
      subscriptionContractId: current.subscriptionContractId,
      resultCode: "SUBSCRIPTION_RECORD_REMOVED"
    });
  }

  function clearCancelledSubscriptionContracts(citizenId, options = {}) {
    const command = "CLEAR_CANCELLED_SUBSCRIPTION_CONTRACTS";
    const citizen = withSubscriptionMutation(() => lowLevel.clearCancelled?.(citizenId, options));
    if (!citizen) return fail(command, "SUBSCRIPTION_CANCELLED_CLEAR_FAILED", { citizenId });
    invalidateIndexes();
    resetObservedContracts();
    return success(command, null, citizen, { citizenId, resultCode: "SUBSCRIPTION_CANCELLED_RECORDS_CLEARED" });
  }

  function getExternalMutationReason(detail = {}) {
    if (detail.settlement === true) return "SUBSCRIPTION_SETTLEMENT";
    if (detail.create === true) return "CITIZEN_CREATED";
    if (detail.deleted === true) return "CITIZEN_DELETED";
    if (detail.source) return `EXTERNAL_${token(detail.source)}`;
    return "EXTERNAL_SUBSCRIPTION_MUTATION";
  }

  function handleCitizenStoreUpdate(event) {
    invalidateIndexes();
    const detail = event?.detail || {};
    if (detail.reset === true || detail.import === true) {
      resetObservedContracts();
      return;
    }
    reconcileObservedContracts({
      reasonCode: getExternalMutationReason(detail),
      command: detail.settlement === true ? "PROCESS_WEEKLY_SUBSCRIPTION_SETTLEMENT" : "EXTERNAL_SUBSCRIPTION_MUTATION",
      atTime: detail.settlementDateIso || ""
    });
  }

  function reconcileTargetContractEntitlements(contracts = [], context = {}) {
    if (subscriptionMutationDepth > 0) return { skipped: true, reason: "SUBSCRIPTION_COMMAND_MUTATION" };
    let emitted = 0;
    (Array.isArray(contracts) ? contracts : []).forEach((contract) => {
      const contractId = String(contract?.subscriptionContractId || "").trim();
      if (!contractId) return;
      const previousRecord = observedContractsById.get(contractId);
      const previousSnapshot = previousRecord?.entitlement || getContractEntitlementSnapshot(contract, context.atTime);
      const nextSnapshot = getContractEntitlementSnapshot(contract, context.atTime);
      if (previousSnapshot.signature !== nextSnapshot.signature) {
        emitted += emitContractMutationEvents(previousRecord?.contract || contract, contract, {
          ...context,
          previousEntitlementSnapshot: previousSnapshot,
          nextEntitlementSnapshot: nextSnapshot,
          suppressUpdated: true,
          external: true
        }).length;
      }
      observedContractsById.set(contractId, { contract: clone(contract), entitlement: clone(nextSnapshot) });
    });
    return { skipped: false, emitted, observed: observedContractsById.size };
  }

  function handleItemInstancesUpdate(event) {
    const detail = event?.detail || {};
    const citizenId = String(detail.citizenId || "").trim();
    const instanceId = String(detail.instanceId || detail.itemId || "").trim();
    app.invalidateSubscriptionEntitlement?.(citizenId);

    const contracts = instanceId
      ? getItemInstanceSubscriptionContracts(instanceId, { citizenId, includeCancelled: true })
      : citizenId
        ? getCitizenSubscriptionContracts(citizenId, { includeCancelled: true, targetType: "ITEM_INSTANCE" })
        : [];
    if (!contracts.length) return;
    reconcileTargetContractEntitlements(contracts, {
      reasonCode: "SUBSCRIPTION_TARGET_ITEM_UPDATED",
      command: "ITEM_INSTANCE_UPDATED"
    });
  }

  function handleSubscriptionCatalogUpdate() {
    invalidateIndexes();
    reconcileObservedEntitlements({
      reasonCode: "SUBSCRIPTION_CATALOG_UPDATED",
      command: "SUBSCRIPTION_CATALOG_UPDATED"
    });
  }

  function handleCampaignTimeUpdate(event) {
    reconcileObservedEntitlements({
      reasonCode: "WORLD_TIME_ADVANCED",
      command: "WORLD_TIME_ADVANCED",
      atTime: event?.detail?.campaignTimeIso
        || event?.detail?.timeIso
        || event?.detail?.currentTimeIso
        || event?.detail?.dateIso
        || event?.detail?.campaignDateIso
        || ""
    });
  }

  const api = {
    version: API_VERSION,
    eventContractVersion: "subscriptions_events_2_3x",
    getSubscriptionContract,
    getCitizenSubscriptionContracts,
    getSubscriptionCatalogEntry,
    getSubscriptionContractsForTarget,
    getItemInstanceSubscriptionContracts,
    getEligibleSubscriptionTargets,
    validateSubscriptionTarget,
    resolveSubscriptionEntitlement,
    createSubscriptionContract,
    changeSubscriptionTier,
    changeSubscriptionCoverageTarget,
    setSubscriptionBillingStatus,
    suspendSubscriptionContract,
    resumeSubscriptionContract,
    cancelSubscriptionContract,
    processSubscriptionBilling,
    processCitizenSubscriptionBilling,
    processWeeklySubscriptionSettlement,
    removeSubscriptionContractRecord,
    clearCancelledSubscriptionContracts,
    getSubscriptionMutationBoundaryState: () => ({
      version: "subscriptions_bridge_readiness_3_1x",
      storeCommandsAvailable: Object.keys(lowLevel).filter((key) => typeof lowLevel[key] === "function"),
      directMutationAdaptersExposed: [
        "addCitizenSubscription",
        "updateCitizenSubscription",
        "cancelCitizenSubscription",
        "deleteCitizenSubscription",
        "clearCancelledCitizenSubscriptions",
        "payCitizenSubscriptions",
        "processWeeklySubscriptionSettlement"
      ].filter((name) => typeof app[name] === "function")
    }),
    invalidateIndexes,
    reconcileSubscriptionDomainEvents: (context = {}) => reconcileObservedContracts(context),
    reconcileSubscriptionEntitlementEvents: (context = {}) => reconcileObservedEntitlements(context),
    getObservedSubscriptionEventState: () => ({
      version: "subscriptions_events_2_3x",
      observedContracts: observedContractsById.size,
      mutationDepth: subscriptionMutationDepth
    }),
    invalidateSubscriptionEntitlement: (citizenId = "") => app.invalidateSubscriptionEntitlement?.(citizenId) !== false,
    getSubscriptionEntitlementCacheStats: () => clone(app.getSubscriptionEntitlementCacheStats?.() || null)
  };

  app.SUBSCRIPTION_PUBLIC_API_VERSION = API_VERSION;
  app.SUBSCRIPTION_BRIDGE_READINESS_SCHEMA_VERSION = "subscriptions_bridge_readiness_3_1x";
  app.SUBSCRIPTION_ASSET_CONTRACTS_API_VERSION = "subscription_asset_contracts_3_0x";
  app.SUBSCRIPTION_EVENTS_API_VERSION = "subscriptions_events_2_3x";
  app.SubscriptionAPI = api;
  Object.assign(app, {
    getSubscriptionContract,
    getCitizenSubscriptionContracts,
    getSubscriptionCatalogEntry,
    getSubscriptionContractsForTarget,
    getItemInstanceSubscriptionContracts,
    getEligibleSubscriptionTargets,
    validateSubscriptionTarget,
    createSubscriptionContract,
    changeSubscriptionTier,
    changeSubscriptionCoverageTarget,
    setSubscriptionBillingStatus,
    suspendSubscriptionContract,
    resumeSubscriptionContract,
    cancelSubscriptionContract,
    processSubscriptionBilling
  });

  window.addEventListener?.("ws:citizens-updated", handleCitizenStoreUpdate);
  window.addEventListener?.("ws:item-instances-updated", handleItemInstancesUpdate);
  window.addEventListener?.("ws:subscription-catalog-updated", handleSubscriptionCatalogUpdate);
  window.addEventListener?.("ws:campaign-time-updated", handleCampaignTimeUpdate);
  invalidateIndexes();
  resetObservedContracts();
})();
