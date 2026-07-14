window.WS_APP = window.WS_APP || {};

(function initSharedCoverageResolver() {
  const app = window.WS_APP;
  const FOUNDATION_VERSION = "world_bridge_coverage_foundation_1_0x";
  const API_VERSION = "shared_coverage_resolver_1_0x";
  const SOURCE_TYPE_ALIASES = new Map([
    ["LIVE_PREVAIL", "LIVE_AND_PREVAIL"],
    ["LIVE_AND_PREVAIL", "LIVE_AND_PREVAIL"],
    ["EXTERNAL", "MANUAL_OVERRIDE"],
    ["MANUAL_OVERRIDE", "MANUAL_OVERRIDE"]
  ]);
  const VALID_SOURCE_TYPES = new Set([
    "SUBSCRIPTION",
    "TRAUMA",
    "LIVE_AND_PREVAIL",
    "INSURANCE",
    "SYSTEM",
    "MANUAL_OVERRIDE"
  ]);
  const VALID_CALCULATIONS = new Set(["PERCENT", "PERCENT_CAP", "FIXED", "FULL"]);
  const VALID_STACK_MODES = new Set(["STACK", "EXCLUSIVE_HIGHEST"]);
  const RESULT_CACHE_LIMIT = 500;

  let ruleIndexDirty = true;
  let rulesById = new Map();
  let ruleIdsByCatalogId = new Map();
  let ruleRevisionSignature = "";
  let lastValidation = null;
  let resultCache = new Map();
  let cacheHits = 0;
  let cacheMisses = 0;
  let cacheInvalidations = 0;

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

  function normalizeSourceType(value = "", fallback = "SUBSCRIPTION") {
    const token = normalizeToken(value, fallback);
    if (!token) return fallback;
    const canonical = SOURCE_TYPE_ALIASES.get(token) || token;
    return VALID_SOURCE_TYPES.has(canonical) ? canonical : fallback;
  }

  function normalizeAmount(value, fallback = 0) {
    const parser = app.parseCreditNumber || app.parseCredits || app.storeUtils?.parseCreditNumber;
    const parsed = typeof parser === "function"
      ? Number(parser(value))
      : Number(String(value ?? fallback).replace(/[^0-9,.-]/g, "").replace(",", "."));
    if (!Number.isFinite(parsed)) return Math.max(0, Number(fallback) || 0);
    return Math.max(0, Math.round(parsed * 100) / 100);
  }

  function normalizeInteger(value, min = 0, max = Number.MAX_SAFE_INTEGER, fallback = min) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function normalizeStringList(value = [], normalizer = normalizeId) {
    const source = Array.isArray(value) ? value : String(value || "").split(/[\n,]/g);
    return Array.from(new Set(source.map((item) => normalizer(item)).filter(Boolean)));
  }

  function normalizeEvaluationTime(value = "") {
    const source = normalizeId(value || app.getCampaignDateIso?.() || app.CAMPAIGN_DATE_ISO || new Date().toISOString());
    const parsed = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(source) ? `${source}T00:00:00.000Z` : source);
    return {
      iso: Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString(),
      epoch: Number.isFinite(parsed) ? parsed : Date.now()
    };
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

  function clearResultCache(filters = {}) {
    const citizenId = normalizeId(filters.citizenId);
    const providerId = normalizeId(filters.providerId);
    if (!citizenId && !providerId) {
      const removed = resultCache.size;
      resultCache.clear();
      if (removed) cacheInvalidations += 1;
      return removed;
    }
    let removed = 0;
    resultCache.forEach((entry, key) => {
      if (citizenId && entry.citizenId !== citizenId) return;
      if (providerId && entry.providerId !== providerId) return;
      resultCache.delete(key);
      removed += 1;
    });
    if (removed) cacheInvalidations += 1;
    return removed;
  }

  function getCachedResult(cacheKey = "") {
    const entry = resultCache.get(cacheKey);
    if (!entry) {
      cacheMisses += 1;
      return null;
    }
    resultCache.delete(cacheKey);
    resultCache.set(cacheKey, entry);
    cacheHits += 1;
    return clone(entry.result);
  }

  function setCachedResult(cacheKey = "", result = {}, metadata = {}) {
    if (!cacheKey) return;
    resultCache.delete(cacheKey);
    resultCache.set(cacheKey, {
      citizenId: normalizeId(metadata.citizenId),
      providerId: normalizeId(metadata.providerId),
      result: clone(result)
    });
    while (resultCache.size > RESULT_CACHE_LIMIT) {
      const oldestKey = resultCache.keys().next().value;
      if (!oldestKey) break;
      resultCache.delete(oldestKey);
    }
  }

  function getSeedCatalogDefinitions() {
    const source = window.APP_DATA?.subscriptionCatalogDefinitions?.subscriptions
      || window.APP_DATA?.subscriptionCatalog?.subscriptions
      || [];
    return Array.isArray(source) ? source : [];
  }

  function getRuntimeCatalogDefinitions() {
    if (typeof app.getSubscriptionCatalog === "function") {
      const records = app.getSubscriptionCatalog({ includeArchived: true });
      if (Array.isArray(records)) return records;
    }
    return getSeedCatalogDefinitions();
  }

  function getCoverageRuleId(rule = {}) {
    return normalizeToken(rule.coverageRuleId || rule.id || rule.code);
  }

  function normalizeBenefit(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const calculation = normalizeToken(source.calculation || source.type || "PERCENT_CAP", "PERCENT_CAP");
    return {
      calculation: VALID_CALCULATIONS.has(calculation) ? calculation : "PERCENT_CAP",
      percent: Math.max(0, Math.min(100, Number(source.percent || 0) || 0)),
      fixedAmount: normalizeAmount(source.fixedAmount ?? source.amount, 0),
      maxAmount: normalizeAmount(source.maxAmount, 0),
      minimumGrossPrice: normalizeAmount(source.minimumGrossPrice, 0),
      authorizationCode: normalizeToken(source.authorizationCode),
      metadata: source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
        ? clone(source.metadata)
        : {}
    };
  }

  function normalizeCoverageRule(rule = {}, subscriptionCatalogId = "") {
    const coverageRuleId = getCoverageRuleId(rule);
    if (!coverageRuleId) return null;
    const sourceType = normalizeSourceType(rule.sourceType || "SUBSCRIPTION", "SUBSCRIPTION");
    const stackMode = normalizeToken(rule.stackMode || "EXCLUSIVE_HIGHEST", "EXCLUSIVE_HIGHEST");
    const appliesTo = rule.appliesTo && typeof rule.appliesTo === "object" && !Array.isArray(rule.appliesTo)
      ? rule.appliesTo
      : {};
    const benefitsSource = rule.benefitsByTierId && typeof rule.benefitsByTierId === "object" && !Array.isArray(rule.benefitsByTierId)
      ? rule.benefitsByTierId
      : {};
    const benefitsByTierId = {};
    Object.entries(benefitsSource).forEach(([tierId, benefit]) => {
      const id = normalizeId(tierId);
      if (id) benefitsByTierId[id] = normalizeBenefit(benefit);
    });
    return {
      coverageRuleId,
      subscriptionCatalogId: normalizeId(rule.subscriptionCatalogId || subscriptionCatalogId),
      sourceType,
      coverageCode: normalizeToken(rule.coverageCode || coverageRuleId, coverageRuleId),
      stackGroup: normalizeToken(rule.stackGroup || "SERVICE_PRIMARY_COVERAGE", "SERVICE_PRIMARY_COVERAGE"),
      stackMode: VALID_STACK_MODES.has(stackMode) ? stackMode : "EXCLUSIVE_HIGHEST",
      priority: normalizeInteger(rule.priority, 0, 100000, 100),
      appliesTo: {
        sourceDomains: normalizeStringList(appliesTo.sourceDomains || ["SERVICE"], normalizeToken),
        providerIds: normalizeStringList(appliesTo.providerIds),
        serviceDefinitionIds: normalizeStringList(appliesTo.serviceDefinitionIds),
        catalogItemIds: normalizeStringList(appliesTo.catalogItemIds)
      },
      benefitsByTierId,
      active: rule.active !== false,
      revision: normalizeInteger(rule.revision, 1, Number.MAX_SAFE_INTEGER, 1),
      metadata: rule.metadata && typeof rule.metadata === "object" && !Array.isArray(rule.metadata)
        ? clone(rule.metadata)
        : {}
    };
  }

  function rebuildRuleIndex() {
    rulesById = new Map();
    ruleIdsByCatalogId = new Map();

    const catalogs = new Map();
    getSeedCatalogDefinitions().forEach((definition) => {
      const id = normalizeId(definition?.subscriptionCatalogId || definition?.id);
      if (id) catalogs.set(id, { seed: definition, runtime: null });
    });
    getRuntimeCatalogDefinitions().forEach((definition) => {
      const id = normalizeId(definition?.subscriptionCatalogId || definition?.id);
      if (!id) return;
      const current = catalogs.get(id) || { seed: null, runtime: null };
      current.runtime = definition;
      catalogs.set(id, current);
    });

    catalogs.forEach(({ seed, runtime }, subscriptionCatalogId) => {
      const mergedRules = new Map();
      [seed, runtime].forEach((definition) => {
        (Array.isArray(definition?.coverageRules) ? definition.coverageRules : []).forEach((rule) => {
          const normalized = normalizeCoverageRule(rule, subscriptionCatalogId);
          if (normalized) mergedRules.set(normalized.coverageRuleId, normalized);
        });
      });
      const ids = [];
      mergedRules.forEach((rule, ruleId) => {
        rulesById.set(ruleId, rule);
        ids.push(ruleId);
      });
      ruleIdsByCatalogId.set(subscriptionCatalogId, ids.sort());
    });

    ruleRevisionSignature = hashText(JSON.stringify(
      Array.from(rulesById.values())
        .sort((left, right) => left.coverageRuleId.localeCompare(right.coverageRuleId))
        .map((rule) => ({
          coverageRuleId: rule.coverageRuleId,
          subscriptionCatalogId: rule.subscriptionCatalogId,
          sourceType: rule.sourceType,
          revision: rule.revision,
          active: rule.active,
          benefitsByTierId: rule.benefitsByTierId
        }))
    ));
    ruleIndexDirty = false;
    lastValidation = null;
    clearResultCache();
  }

  function ensureRuleIndex() {
    if (ruleIndexDirty) rebuildRuleIndex();
  }

  function getCoverageRule(coverageRuleId = "") {
    ensureRuleIndex();
    const record = rulesById.get(normalizeToken(coverageRuleId));
    return record ? clone(record) : null;
  }

  function getCoverageRules(filters = {}) {
    ensureRuleIndex();
    const catalogId = normalizeId(filters.subscriptionCatalogId);
    const sourceType = normalizeSourceType(filters.sourceType, "");
    return Array.from(rulesById.values())
      .filter((rule) => !catalogId || rule.subscriptionCatalogId === catalogId)
      .filter((rule) => !sourceType || rule.sourceType === sourceType)
      .filter((rule) => filters.includeInactive === true || rule.active)
      .sort((left, right) => right.priority - left.priority || left.coverageRuleId.localeCompare(right.coverageRuleId))
      .map(clone);
  }

  function validateCoverageRules() {
    ensureRuleIndex();
    if (lastValidation) return clone(lastValidation);
    const errors = [];
    const warnings = [];
    rulesById.forEach((rule) => {
      if (!rule.subscriptionCatalogId) errors.push({ code: "COVERAGE_RULE_CATALOG_REQUIRED", coverageRuleId: rule.coverageRuleId });
      if (!Object.keys(rule.benefitsByTierId).length) warnings.push({ code: "COVERAGE_RULE_HAS_NO_TIER_BENEFITS", coverageRuleId: rule.coverageRuleId });
      Object.entries(rule.benefitsByTierId).forEach(([tierId, benefit]) => {
        if (!VALID_CALCULATIONS.has(benefit.calculation)) {
          errors.push({ code: "COVERAGE_RULE_CALCULATION_INVALID", coverageRuleId: rule.coverageRuleId, tierId, calculation: benefit.calculation });
        }
        if (["PERCENT", "PERCENT_CAP"].includes(benefit.calculation) && benefit.percent <= 0) {
          warnings.push({ code: "COVERAGE_RULE_PERCENT_ZERO", coverageRuleId: rule.coverageRuleId, tierId });
        }
        if (benefit.calculation === "FIXED" && benefit.fixedAmount <= 0) {
          warnings.push({ code: "COVERAGE_RULE_FIXED_ZERO", coverageRuleId: rule.coverageRuleId, tierId });
        }
      });
    });
    lastValidation = {
      ok: errors.length === 0,
      foundationVersion: FOUNDATION_VERSION,
      version: API_VERSION,
      counts: { rules: rulesById.size, errors: errors.length, warnings: warnings.length },
      errors,
      warnings
    };
    return clone(lastValidation);
  }

  function getContractCandidates(input = {}) {
    const citizenId = normalizeId(input.citizenId);
    const requestedIds = normalizeStringList(
      (Array.isArray(input.subscriptionRefs) ? input.subscriptionRefs : [])
        .map((ref) => ref?.sourceId || ref?.subscriptionContractId || ref?.id)
    );
    let contracts = [];
    if (requestedIds.length && typeof app.getSubscriptionContract === "function") {
      contracts = requestedIds.map((id) => app.getSubscriptionContract(id)).filter(Boolean);
    } else if (typeof app.getCitizenSubscriptionContracts === "function") {
      contracts = app.getCitizenSubscriptionContracts(citizenId, { includeCancelled: true }) || [];
    }
    const byId = new Map();
    (Array.isArray(contracts) ? contracts : []).forEach((contract) => {
      const id = normalizeId(contract?.subscriptionContractId || contract?.id);
      if (!id || normalizeId(contract?.citizenId) !== citizenId) return;
      byId.set(id, clone(contract));
    });
    return Array.from(byId.values());
  }

  function getContractSnapshot(contract = {}, atTime = "") {
    if (typeof app.getSubscriptionContractEntitlementSnapshot === "function") {
      try {
        return clone(app.getSubscriptionContractEntitlementSnapshot(contract, atTime));
      } catch (error) {
        return null;
      }
    }
    const status = normalizeToken(contract.entitlementStatus || contract.contractStatus || "ACTIVE", "ACTIVE");
    return {
      allowed: ["ACTIVE", "GRACE_PERIOD"].includes(status),
      status,
      citizenId: normalizeId(contract.citizenId),
      subscriptionContractId: normalizeId(contract.subscriptionContractId || contract.id),
      subscriptionCatalogId: normalizeId(contract.subscriptionCatalogId),
      providerId: normalizeId(contract.providerId),
      tierId: normalizeId(contract.tierId),
      coverageTarget: clone(contract.coverageTarget || { type: "CITIZEN", id: contract.citizenId }),
      coverageRuleIds: [],
      contractRevision: normalizeInteger(contract.revision, 0, Number.MAX_SAFE_INTEGER, 0),
      catalogRevision: 0,
      tierRevision: 0
    };
  }

  function contractTargetMatches(snapshot = {}, input = {}) {
    const target = snapshot.coverageTarget && typeof snapshot.coverageTarget === "object"
      ? snapshot.coverageTarget
      : { type: "CITIZEN", id: input.citizenId };
    const type = normalizeToken(target.type || "CITIZEN", "CITIZEN");
    const id = normalizeId(target.id);
    if (type === "CITIZEN") return id === normalizeId(input.citizenId);
    if (type !== "ITEM_INSTANCE") return false;
    const subjectInstanceIds = normalizeStringList(input.subjectRefs?.instanceIds || input.instanceIds || []);
    const explicitTargetId = normalizeId(input.targetId || input.coverageTarget?.id);
    return subjectInstanceIds.includes(id) || explicitTargetId === id;
  }

  function ruleApplies(rule = {}, input = {}) {
    const sourceDomain = normalizeToken(input.sourceDomain || (input.serviceDefinitionId ? "SERVICE" : input.catalogItemId ? "MARKET" : "GENERAL"), "GENERAL");
    const applies = rule.appliesTo || {};
    if (applies.sourceDomains.length && !applies.sourceDomains.includes(sourceDomain)) return false;
    if (applies.providerIds.length && !applies.providerIds.includes(normalizeId(input.providerId))) return false;
    if (applies.serviceDefinitionIds.length && !applies.serviceDefinitionIds.includes(normalizeId(input.serviceDefinitionId))) return false;
    if (applies.catalogItemIds.length && !applies.catalogItemIds.includes(normalizeId(input.catalogItemId))) return false;
    return true;
  }

  function getCoverageAuthorizationSet(input = {}) {
    return new Set(normalizeStringList(input.coverageAuthorizations || input.authorizationCodes || [], normalizeToken));
  }

  function calculateRequestedAmount(rule = {}, benefit = {}, grossPrice = 0) {
    if (grossPrice < benefit.minimumGrossPrice) return 0;
    if (benefit.calculation === "FULL") return grossPrice;
    if (benefit.calculation === "FIXED") return Math.min(grossPrice, benefit.fixedAmount);
    const percentAmount = Math.round(grossPrice * benefit.percent) / 100;
    if (benefit.calculation === "PERCENT") return Math.min(grossPrice, percentAmount);
    const cap = benefit.maxAmount > 0 ? benefit.maxAmount : grossPrice;
    return Math.min(grossPrice, percentAmount, cap);
  }

  function normalizeCoverageSource(value = {}) {
    return {
      sourceType: normalizeSourceType(value.sourceType, "SUBSCRIPTION"),
      sourceId: normalizeId(value.sourceId),
      subscriptionContractId: normalizeId(value.subscriptionContractId || value.sourceId),
      subscriptionCatalogId: normalizeId(value.subscriptionCatalogId),
      tierId: normalizeId(value.tierId),
      providerId: normalizeId(value.providerId),
      coverageRuleId: normalizeToken(value.coverageRuleId),
      coverageCode: normalizeToken(value.coverageCode),
      amount: normalizeAmount(value.amount, 0),
      requestedAmount: normalizeAmount(value.requestedAmount, 0),
      coverageTarget: value.coverageTarget && typeof value.coverageTarget === "object" && !Array.isArray(value.coverageTarget)
        ? { type: normalizeToken(value.coverageTarget.type || "CITIZEN", "CITIZEN"), id: normalizeId(value.coverageTarget.id) }
        : null,
      status: normalizeToken(value.status || "ACTIVE", "ACTIVE"),
      revision: normalizeInteger(value.revision, 1, Number.MAX_SAFE_INTEGER, 1),
      metadata: value.metadata && typeof value.metadata === "object" && !Array.isArray(value.metadata)
        ? clone(value.metadata)
        : {}
    };
  }

  function buildCoverageCacheKey(input = {}, context = {}) {
    const subscriptionRefs = (Array.isArray(input.subscriptionRefs) ? input.subscriptionRefs : [])
      .map((ref) => ({
        sourceId: normalizeId(ref?.sourceId || ref?.subscriptionContractId || ref?.id),
        coverageRuleIds: normalizeStringList(ref?.coverageRuleIds || [], normalizeToken).sort()
      }))
      .sort((left, right) => left.sourceId.localeCompare(right.sourceId));
    const contractSignature = (Array.isArray(context.contractEntries) ? context.contractEntries : [])
      .map(({ contract, snapshot }) => ({
        subscriptionContractId: normalizeId(snapshot?.subscriptionContractId || contract?.subscriptionContractId || contract?.id),
        subscriptionCatalogId: normalizeId(snapshot?.subscriptionCatalogId || contract?.subscriptionCatalogId),
        providerId: normalizeId(snapshot?.providerId || contract?.providerId),
        tierId: normalizeId(snapshot?.tierId || contract?.tierId),
        allowed: snapshot?.allowed === true,
        status: normalizeToken(snapshot?.status),
        coverageTarget: snapshot?.coverageTarget || contract?.coverageTarget || null,
        coverageRuleIds: normalizeStringList(snapshot?.coverageRuleIds || [], normalizeToken).sort(),
        contractRevision: Number(snapshot?.contractRevision || contract?.revision || 0),
        catalogRevision: Number(snapshot?.catalogRevision || 0),
        tierRevision: Number(snapshot?.tierRevision || 0)
      }))
      .sort((left, right) => left.subscriptionContractId.localeCompare(right.subscriptionContractId));
    const payload = {
      foundationVersion: FOUNDATION_VERSION,
      apiVersion: API_VERSION,
      ruleRevisionSignature,
      sourceDomain: normalizeToken(input.sourceDomain || (input.serviceDefinitionId ? "SERVICE" : input.catalogItemId ? "MARKET" : "GENERAL"), "GENERAL"),
      citizenId: normalizeId(context.citizenId),
      providerId: normalizeId(input.providerId),
      serviceDefinitionId: normalizeId(input.serviceDefinitionId),
      catalogItemId: normalizeId(input.catalogItemId),
      grossPrice: context.grossPrice,
      currency: normalizeToken(input.currency || "CREDIT", "CREDIT"),
      subjectInstanceIds: normalizeStringList(input.subjectRefs?.instanceIds || input.instanceIds || []).sort(),
      explicitTargetId: normalizeId(input.targetId || input.coverageTarget?.id),
      coverageRuleIds: normalizeStringList(input.coverageRuleIds || [], normalizeToken).sort(),
      coverageAuthorizations: normalizeStringList(input.coverageAuthorizations || input.authorizationCodes || [], normalizeToken).sort(),
      subscriptionRefs,
      contractSignature,
      evaluatedAt: context.atTime?.iso || ""
    };
    return hashText(JSON.stringify(payload));
  }

  function selectStackedCandidates(candidates = []) {
    const groups = new Map();
    candidates.forEach((candidate) => {
      const group = normalizeToken(candidate.rule.stackGroup || candidate.rule.coverageRuleId, candidate.rule.coverageRuleId);
      const current = groups.get(group) || [];
      current.push(candidate);
      groups.set(group, current);
    });

    const selected = [];
    groups.forEach((entries) => {
      const mode = entries.some((entry) => entry.rule.stackMode === "EXCLUSIVE_HIGHEST") ? "EXCLUSIVE_HIGHEST" : "STACK";
      const ordered = entries.sort((left, right) =>
        right.requestedAmount - left.requestedAmount
        || right.rule.priority - left.rule.priority
        || left.rule.coverageRuleId.localeCompare(right.rule.coverageRuleId)
        || left.snapshot.subscriptionContractId.localeCompare(right.snapshot.subscriptionContractId)
      );
      if (mode === "EXCLUSIVE_HIGHEST") selected.push(ordered[0]);
      else selected.push(...ordered);
    });

    return selected.sort((left, right) =>
      right.rule.priority - left.rule.priority
      || right.requestedAmount - left.requestedAmount
      || left.rule.coverageRuleId.localeCompare(right.rule.coverageRuleId)
      || left.snapshot.subscriptionContractId.localeCompare(right.snapshot.subscriptionContractId)
    );
  }

  function resolveCoverage(input = {}) {
    ensureRuleIndex();
    const citizenId = normalizeId(input.citizenId);
    const grossPrice = normalizeAmount(input.grossPrice, 0);
    const atTime = normalizeEvaluationTime(input.atTime);
    const blockers = [];
    const warnings = [];
    const requestedRuleIds = new Set(normalizeStringList(input.coverageRuleIds || [], normalizeToken));
    const authorizations = getCoverageAuthorizationSet(input);

    if (!citizenId) blockers.push("CITIZEN_ID_REQUIRED");
    if (grossPrice <= 0) warnings.push("COVERAGE_GROSS_PRICE_ZERO");

    const contracts = blockers.length ? [] : getContractCandidates({ ...input, citizenId });
    const contractEntries = contracts.map((contract) => ({
      contract,
      snapshot: getContractSnapshot(contract, atTime.iso)
    }));
    const cacheKey = buildCoverageCacheKey(input, { citizenId, grossPrice, atTime, contractEntries });
    if (input.cache !== false && input.forceRefresh !== true) {
      const cached = getCachedResult(cacheKey);
      if (cached) return cached;
    }

    const candidates = [];
    contractEntries.forEach(({ contract, snapshot }) => {
      if (!snapshot || snapshot.allowed !== true) return;
      if (!contractTargetMatches(snapshot, { ...input, citizenId })) return;
      if (normalizeToken(snapshot.status) === "GRACE_PERIOD") warnings.push("COVERAGE_SOURCE_IN_GRACE_PERIOD");

      const catalogId = normalizeId(snapshot.subscriptionCatalogId || contract.subscriptionCatalogId);
      const catalogRuleIds = ruleIdsByCatalogId.get(catalogId) || [];
      const snapshotRuleIds = new Set(normalizeStringList(snapshot.coverageRuleIds || catalogRuleIds, normalizeToken));
      const sourceRef = (Array.isArray(input.subscriptionRefs) ? input.subscriptionRefs : [])
        .find((ref) => normalizeId(ref?.sourceId || ref?.subscriptionContractId || ref?.id) === normalizeId(snapshot.subscriptionContractId));
      const sourceRefRuleIds = new Set(normalizeStringList(sourceRef?.coverageRuleIds || [], normalizeToken));

      catalogRuleIds.forEach((ruleId) => {
        if (requestedRuleIds.size && !requestedRuleIds.has(ruleId)) return;
        if (snapshotRuleIds.size && !snapshotRuleIds.has(ruleId)) return;
        if (sourceRefRuleIds.size && !sourceRefRuleIds.has(ruleId)) return;
        const rule = rulesById.get(ruleId);
        if (!rule || !rule.active || !ruleApplies(rule, input)) return;
        const tierId = normalizeId(snapshot.tierId || contract.tierId);
        const benefit = rule.benefitsByTierId[tierId];
        if (!benefit) return;
        if (benefit.authorizationCode && !authorizations.has(benefit.authorizationCode)) {
          warnings.push(`COVERAGE_AUTHORIZATION_REQUIRED:${benefit.authorizationCode}`);
          return;
        }
        const requestedAmount = calculateRequestedAmount(rule, benefit, grossPrice);
        if (requestedAmount <= 0) return;
        candidates.push({ rule, benefit, contract, snapshot, requestedAmount });
      });
    });

    requestedRuleIds.forEach((ruleId) => {
      if (!rulesById.has(ruleId)) warnings.push(`COVERAGE_RULE_NOT_FOUND:${ruleId}`);
    });

    const selected = selectStackedCandidates(candidates);
    let remaining = grossPrice;
    const sources = [];
    const appliedRuleIds = [];
    let revision = 1;

    selected.forEach((candidate) => {
      if (remaining <= 0) return;
      const amount = Math.min(remaining, candidate.requestedAmount);
      if (amount <= 0) return;
      remaining = Math.max(0, Math.round((remaining - amount) * 100) / 100);
      appliedRuleIds.push(candidate.rule.coverageRuleId);
      revision = Math.max(
        revision,
        candidate.rule.revision,
        Number(candidate.snapshot.contractRevision || 0),
        Number(candidate.snapshot.catalogRevision || 0),
        Number(candidate.snapshot.tierRevision || 0)
      );
      sources.push(normalizeCoverageSource({
        sourceType: candidate.rule.sourceType,
        sourceId: candidate.snapshot.subscriptionContractId,
        subscriptionContractId: candidate.snapshot.subscriptionContractId,
        subscriptionCatalogId: candidate.snapshot.subscriptionCatalogId,
        tierId: candidate.snapshot.tierId,
        providerId: candidate.snapshot.providerId,
        coverageRuleId: candidate.rule.coverageRuleId,
        coverageCode: candidate.rule.coverageCode,
        amount,
        requestedAmount: candidate.requestedAmount,
        coverageTarget: candidate.snapshot.coverageTarget,
        status: candidate.snapshot.status,
        revision,
        metadata: {
          calculation: candidate.benefit.calculation,
          percent: candidate.benefit.percent,
          maxAmount: candidate.benefit.maxAmount,
          stackGroup: candidate.rule.stackGroup,
          stackMode: candidate.rule.stackMode
        }
      }));
    });

    const coveredAmount = Math.min(grossPrice, Math.round(sources.reduce((total, source) => total + source.amount, 0) * 100) / 100);
    const payableAmount = Math.max(0, Math.round((grossPrice - coveredAmount) * 100) / 100);
    if (!sources.length && grossPrice > 0) warnings.push("COVERAGE_NOT_AVAILABLE");

    const signaturePayload = {
      citizenId,
      providerId: normalizeId(input.providerId),
      serviceDefinitionId: normalizeId(input.serviceDefinitionId),
      catalogItemId: normalizeId(input.catalogItemId),
      grossPrice,
      coveredAmount,
      payableAmount,
      sourceIds: sources.map((source) => `${source.sourceId}:${source.coverageRuleId}:${source.amount}`),
      revision,
      evaluatedAt: atTime.iso
    };

    const result = {
      ok: blockers.length === 0,
      foundationVersion: FOUNDATION_VERSION,
      version: API_VERSION,
      grossPrice,
      coveredAmount,
      payableAmount,
      currency: normalizeToken(input.currency || "CREDIT", "CREDIT"),
      sources,
      coverageRuleIds: Array.from(new Set(appliedRuleIds)).sort(),
      evaluatedRuleIds: Array.from(new Set(candidates.map((candidate) => candidate.rule.coverageRuleId))).sort(),
      blockers: Array.from(new Set(blockers)),
      warnings: Array.from(new Set(warnings)),
      evaluatedAt: atTime.iso,
      revision,
      signature: hashText(JSON.stringify(signaturePayload))
    };
    if (input.cache !== false) {
      setCachedResult(cacheKey, result, { citizenId, providerId: input.providerId });
    }
    return clone(result);
  }

  function previewCoverage(input = {}) {
    return resolveCoverage(input);
  }

  function getCoverageResolverDiagnostics() {
    const validation = validateCoverageRules();
    return {
      foundationVersion: FOUNDATION_VERSION,
      version: API_VERSION,
      owner: "WORLD_BRIDGE_SHARED",
      readOnly: true,
      connected: true,
      rules: rulesById.size,
      catalogsWithRules: Array.from(ruleIdsByCatalogId.values()).filter((ids) => ids.length).length,
      ruleRevisionSignature,
      supportedSourceTypes: Array.from(VALID_SOURCE_TYPES).sort(),
      supportedCalculations: Array.from(VALID_CALCULATIONS).sort(),
      supportedStackModes: Array.from(VALID_STACK_MODES).sort(),
      cache: {
        limit: RESULT_CACHE_LIMIT,
        size: resultCache.size,
        hits: cacheHits,
        misses: cacheMisses,
        invalidations: cacheInvalidations
      },
      validation
    };
  }

  function invalidateCoverageResolver(options = {}) {
    const source = options && typeof options === "object" && !Array.isArray(options) ? options : {};
    const hasTarget = Boolean(normalizeId(source.citizenId) || normalizeId(source.providerId));
    const invalidateRules = source.rules === true
      || source.catalog === true
      || normalizeToken(source.scope) === "ALL"
      || (!hasTarget && Object.keys(source).length === 0);
    if (invalidateRules) {
      ruleIndexDirty = true;
      lastValidation = null;
    }
    clearResultCache(hasTarget ? source : {});
    return true;
  }

  function invalidateCoverageForEvent(event = {}) {
    const detail = event?.detail && typeof event.detail === "object" ? event.detail : {};
    const citizenId = normalizeId(detail.citizenId || detail.ownerId || detail.characterId || detail.id);
    const providerId = normalizeId(detail.providerId);
    invalidateCoverageResolver({ citizenId, providerId });
  }

  app.COVERAGE_FOUNDATION_VERSION = FOUNDATION_VERSION;
  app.COVERAGE_RESOLVER_API_VERSION = API_VERSION;
  app.resolveCoverage = resolveCoverage;
  app.previewCoverage = previewCoverage;
  app.getCoverageRule = getCoverageRule;
  app.getCoverageRules = getCoverageRules;
  app.validateCoverageRules = validateCoverageRules;
  app.getCoverageResolverDiagnostics = getCoverageResolverDiagnostics;
  app.invalidateCoverageResolver = invalidateCoverageResolver;
  if (app.billingStore && typeof app.billingStore === "object") app.billingStore.previewCoverage = previewCoverage;

  window.addEventListener?.("ws:subscription-catalog-updated", () => invalidateCoverageResolver({ rules: true }));
  [
    "ws:subscription-created",
    "ws:subscription-updated",
    "ws:subscription-entitlement-changed",
    "ws:subscription-cancelled",
    "ws:item-instances-updated",
    "ws:citizens-updated"
  ].forEach((eventName) => window.addEventListener?.(eventName, invalidateCoverageForEvent));
  window.addEventListener?.("ws:campaign-date-updated", () => invalidateCoverageResolver({ scope: "ALL" }));

})();
