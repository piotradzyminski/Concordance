window.WS_APP = window.WS_APP || {};

(function initSubscriptionEntitlementModule() {
  const app = window.WS_APP;
  const CONTRACT_SCHEMA_VERSION = "subscription_contracts_bridge_schema_2_0x";
  const ENTITLEMENT_API_VERSION = "subscriptions_entitlement_3_0x";
  const ENTITLEMENT_CACHE_LIMIT = 500;
  const CONTRACT_STATUSES = new Set(["ACTIVE", "CANCELLED"]);
  const BILLING_STATUSES = new Set(["PAID", "PENDING", "OVERDUE", "SUSPENDED", "CANCELLED"]);
  const ENTITLEMENT_STATUSES = new Set(["ACTIVE", "GRACE_PERIOD", "PENDING", "SUSPENDED", "CANCELLED"]);
  const TARGET_TYPES = new Set(["CITIZEN", "ITEM_INSTANCE"]);
  const QUERY_ENTITLEMENT_STATUSES = new Set([
    "ACTIVE", "GRACE_PERIOD", "PENDING", "SUSPENDED", "CANCELLED", "EXPIRED", "REVOKED", "NOT_FOUND"
  ]);
  const ENTITLEMENT_STATUS_RANK = {
    ACTIVE: 80,
    GRACE_PERIOD: 70,
    PENDING: 50,
    SUSPENDED: 40,
    EXPIRED: 30,
    REVOKED: 20,
    CANCELLED: 10,
    NOT_FOUND: 0
  };
  let entitlementCache = new Map();
  let entitlementCacheHits = 0;
  let entitlementCacheMisses = 0;
  let contractSnapshotCache = new Map();
  let contractSnapshotCacheHits = 0;
  let contractSnapshotCacheMisses = 0;
  const BILLING_STATUS_ALIASES = {
    ACTIVE: "PAID",
    ENABLED: "PAID",
    VALID: "PAID",
    CONFIRMED: "PAID",
    SYNCED: "PAID",
    GRACE: "OVERDUE",
    GRACE_PERIOD: "OVERDUE",
    LATE: "OVERDUE",
    LOCKED: "SUSPENDED",
    DISABLED: "SUSPENDED",
    INACTIVE: "SUSPENDED",
    CANCELED: "CANCELLED",
    TERMINATED: "CANCELLED",
    CLOSED: "CANCELLED"
  };

  function clone(value) {
    if (value === undefined) return undefined;
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function normalizeKey(value = "") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function token(value = "") {
    return String(value || "")
      .trim()
      .replace(/[\s-]+/g, "_")
      .replace(/[^A-Za-z0-9_:.]/g, "")
      .toUpperCase();
  }

  function clampInteger(value, min, max, fallback = min) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function parseCreditNumber(value) {
    const parser = app.parseCreditNumber || app.parseCredits || app.storeUtils?.parseCreditNumber;
    if (typeof parser === "function") return Math.max(0, parser(value));
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
    const number = Number(String(value || "").replace(/[^0-9,.-]/g, "").replace(/,/g, "."));
    return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
  }

  function normalizeNullableString(value) {
    const normalized = String(value || "").trim();
    return normalized || null;
  }

  function normalizeStringList(value = []) {
    const source = Array.isArray(value) ? value : String(value || "").split(/[\n,]/g);
    return Array.from(new Set(source.map((item) => token(item)).filter(Boolean)));
  }

  function normalizeIdList(value = []) {
    const source = Array.isArray(value) ? value : String(value || "").split(/[\n,]/g);
    return Array.from(new Set(source.map((item) => String(item || "").trim()).filter(Boolean)));
  }

  function normalizeItemEligibilityPolicy(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      requireOwnedByCitizen: source.requireOwnedByCitizen !== false,
      blockedLifecycleStates: normalizeStringList(source.blockedLifecycleStates?.length ? source.blockedLifecycleStates : ["DISPOSED"]),
      allowedDefinitionIds: normalizeIdList(source.allowedDefinitionIds),
      allowedCategories: normalizeStringList(source.allowedCategories),
      allowedSubtypes: normalizeStringList(source.allowedSubtypes),
      requiredTagsAny: normalizeStringList(source.requiredTagsAny),
      requiredTagsAll: normalizeStringList(source.requiredTagsAll),
      allowedManufacturerIds: normalizeIdList(source.allowedManufacturerIds),
      allowedProviderIds: normalizeIdList(source.allowedProviderIds)
    };
  }

  function getSubscriptionTargetPolicy(catalog = {}) {
    const source = catalog?.targetPolicy && typeof catalog.targetPolicy === "object" ? catalog.targetPolicy : {};
    const allowedTargetTypes = normalizeStringList(source.allowedTargetTypes || ["CITIZEN"])
      .filter((targetType) => TARGET_TYPES.has(targetType));
    const allowed = allowedTargetTypes.length ? allowedTargetTypes : ["CITIZEN"];
    const defaultTargetType = allowed.includes(token(source.defaultTargetType))
      ? token(source.defaultTargetType)
      : allowed[0];
    return {
      allowedTargetTypes: allowed,
      defaultTargetType,
      maximumTargets: clampInteger(source.maximumTargets ?? 1, 1, 100, 1),
      itemEligibility: normalizeItemEligibilityPolicy(source.itemEligibility)
    };
  }

  function getItemInstanceTargetSnapshot(instance = null) {
    if (!instance || typeof instance !== "object") return null;
    const data = instance.instanceData && typeof instance.instanceData === "object" ? instance.instanceData : {};
    return {
      type: "ITEM_INSTANCE",
      id: String(instance.instanceId || "").trim(),
      instanceId: String(instance.instanceId || "").trim(),
      definitionId: String(instance.definitionId || "").trim(),
      ownerId: String(instance.ownerId || "").trim(),
      lifecycleState: token(instance.lifecycleState || ""),
      locationType: token(instance.location?.type || ""),
      category: token(data.category || ""),
      subtype: token(data.subtype || data.itemType || ""),
      manufacturerId: String(data.manufacturerId || "").trim(),
      providerId: String(data.providerId || "").trim(),
      tags: normalizeStringList(data.tags),
      name: String(data.name || data.title || instance.definitionId || instance.instanceId || "ItemInstance").trim()
    };
  }

  function evaluateItemEligibility(itemSnapshot = {}, policy = {}) {
    const eligibility = normalizeItemEligibilityPolicy(policy);
    const errors = [];
    const details = {};
    const tags = new Set(normalizeStringList(itemSnapshot.tags));

    if (eligibility.blockedLifecycleStates.includes(token(itemSnapshot.lifecycleState))) {
      errors.push("SUBSCRIPTION_ITEM_TARGET_LIFECYCLE_BLOCKED");
      details.blockedLifecycleState = token(itemSnapshot.lifecycleState);
    }
    if (token(itemSnapshot.locationType) === "DESTROYED") {
      errors.push("SUBSCRIPTION_ITEM_TARGET_DESTROYED");
    }
    if (eligibility.allowedDefinitionIds.length && !eligibility.allowedDefinitionIds.includes(String(itemSnapshot.definitionId || ""))) {
      errors.push("SUBSCRIPTION_ITEM_TARGET_DEFINITION_INELIGIBLE");
      details.allowedDefinitionIds = clone(eligibility.allowedDefinitionIds);
    }
    if (eligibility.allowedCategories.length && !eligibility.allowedCategories.includes(token(itemSnapshot.category))) {
      errors.push("SUBSCRIPTION_ITEM_TARGET_CATEGORY_INELIGIBLE");
      details.allowedCategories = clone(eligibility.allowedCategories);
    }
    if (eligibility.allowedSubtypes.length && !eligibility.allowedSubtypes.includes(token(itemSnapshot.subtype))) {
      errors.push("SUBSCRIPTION_ITEM_TARGET_SUBTYPE_INELIGIBLE");
      details.allowedSubtypes = clone(eligibility.allowedSubtypes);
    }
    if (eligibility.requiredTagsAny.length && !eligibility.requiredTagsAny.some((tag) => tags.has(tag))) {
      errors.push("SUBSCRIPTION_ITEM_TARGET_TAG_INELIGIBLE");
      details.requiredTagsAny = clone(eligibility.requiredTagsAny);
    }
    if (eligibility.requiredTagsAll.length && !eligibility.requiredTagsAll.every((tag) => tags.has(tag))) {
      errors.push("SUBSCRIPTION_ITEM_TARGET_TAGS_REQUIRED");
      details.requiredTagsAll = clone(eligibility.requiredTagsAll);
    }
    if (eligibility.allowedManufacturerIds.length && !eligibility.allowedManufacturerIds.includes(String(itemSnapshot.manufacturerId || ""))) {
      errors.push("SUBSCRIPTION_ITEM_TARGET_MANUFACTURER_INELIGIBLE");
      details.allowedManufacturerIds = clone(eligibility.allowedManufacturerIds);
    }
    if (eligibility.allowedProviderIds.length && !eligibility.allowedProviderIds.includes(String(itemSnapshot.providerId || ""))) {
      errors.push("SUBSCRIPTION_ITEM_TARGET_PROVIDER_INELIGIBLE");
      details.allowedProviderIds = clone(eligibility.allowedProviderIds);
    }

    return {
      valid: errors.length === 0,
      errors: Array.from(new Set(errors)),
      details
    };
  }

  function validateSubscriptionCoverageTarget(input = {}) {
    const citizenId = String(input.citizenId || "").trim();
    const subscriptionCatalogId = String(input.subscriptionCatalogId || input.catalogId || "").trim();
    const tierId = String(input.tierId || "").trim();
    const catalog = input.catalog || getCatalogEntryForEntitlement(subscriptionCatalogId);
    const coverageTarget = normalizeCoverageTarget(
      input.coverageTarget || { type: input.targetType, id: input.targetId },
      citizenId
    );
    const policy = getSubscriptionTargetPolicy(catalog || {});
    const errors = [];
    const reasons = [];
    let itemInstance = null;

    if (!citizenId) errors.push("SUBSCRIPTION_CITIZEN_ID_REQUIRED");
    if (!subscriptionCatalogId) errors.push("SUBSCRIPTION_CATALOG_REQUIRED");
    else if (!catalog) errors.push("SUBSCRIPTION_CATALOG_NOT_FOUND");
    if (!coverageTarget.id) errors.push("SUBSCRIPTION_TARGET_ID_REQUIRED");
    if (catalog && !policy.allowedTargetTypes.includes(coverageTarget.type)) {
      errors.push("SUBSCRIPTION_TARGET_NOT_ALLOWED");
    }

    if (coverageTarget.type === "CITIZEN") {
      if (citizenId && coverageTarget.id && coverageTarget.id !== citizenId) {
        errors.push("SUBSCRIPTION_CITIZEN_TARGET_MISMATCH");
      }
    } else if (coverageTarget.type === "ITEM_INSTANCE" && coverageTarget.id) {
      if (typeof app.getItemInstanceById !== "function") {
        errors.push("SUBSCRIPTION_ITEM_STORE_UNAVAILABLE");
      } else {
        const item = app.getItemInstanceById(coverageTarget.id);
        if (!item) {
          errors.push("SUBSCRIPTION_ITEM_TARGET_NOT_FOUND");
        } else {
          itemInstance = getItemInstanceTargetSnapshot(item);
          if (policy.itemEligibility.requireOwnedByCitizen && citizenId && itemInstance.ownerId !== citizenId) {
            errors.push("SUBSCRIPTION_ITEM_TARGET_OWNER_MISMATCH");
          }
          const eligibility = evaluateItemEligibility(itemInstance, policy.itemEligibility);
          errors.push(...eligibility.errors);
          if (Object.keys(eligibility.details).length) {
            reasons.push(makeReason("SUBSCRIPTION_ITEM_TARGET_POLICY_MISMATCH", "BLOCKER", eligibility.details));
          }
        }
      }
    }

    Array.from(new Set(errors)).forEach((code) => {
      if (!reasons.some((reason) => reason.code === code)) {
        reasons.push(makeReason(code, "BLOCKER", {
          citizenId: citizenId || null,
          subscriptionCatalogId: subscriptionCatalogId || null,
          tierId: tierId || null,
          targetType: coverageTarget.type,
          targetId: coverageTarget.id || null,
          ...(itemInstance ? { ownerId: itemInstance.ownerId, definitionId: itemInstance.definitionId } : {})
        }));
      }
    });

    const uniqueErrors = Array.from(new Set(errors));
    return {
      valid: uniqueErrors.length === 0,
      errors: uniqueErrors,
      reasons,
      citizenId,
      subscriptionCatalogId,
      tierId,
      coverageTarget,
      targetPolicy: clone(policy),
      itemInstance: clone(itemInstance)
    };
  }

  function getRawCatalogDefinitions() {
    if (typeof app.getSubscriptionCatalog === "function") {
      const records = app.getSubscriptionCatalog({ includeArchived: true });
      if (Array.isArray(records) && records.length) return records;
    }
    return Array.isArray(window.APP_DATA?.subscriptionCatalogDefinitions?.subscriptions)
      ? window.APP_DATA.subscriptionCatalogDefinitions.subscriptions
      : Array.isArray(window.APP_DATA?.subscriptionCatalog?.subscriptions)
        ? window.APP_DATA.subscriptionCatalog.subscriptions
        : [];
  }

  function getCatalogId(definition = {}) {
    return String(definition.subscriptionCatalogId || definition.id || "").trim();
  }

  function getTierId(tier = {}) {
    return String(tier.tierId || tier.id || "").trim();
  }

  function getRawProviderDefinitions() {
    return Array.isArray(window.APP_DATA?.subscriptionCatalog?.providers)
      ? window.APP_DATA.subscriptionCatalog.providers
      : [];
  }

  function getRawOrganizations() {
    if (typeof app.getOrganizations === "function") {
      const organizations = app.getOrganizations({ includeArchived: true });
      if (Array.isArray(organizations) && organizations.length) return organizations;
    }
    return Array.isArray(window.APP_DATA?.organizations) ? window.APP_DATA.organizations : [];
  }

  function organizationMatches(organization = {}, query = "") {
    const key = normalizeKey(query);
    if (!key) return false;
    return [
      organization.id,
      organization.name,
      organization.shortName,
      ...(Array.isArray(organization.providerIds) ? organization.providerIds : [])
    ].map(normalizeKey).filter(Boolean).includes(key);
  }

  function resolveOrganization(providerId = "", providerName = "", explicitOrganizationId = "") {
    if (explicitOrganizationId) {
      const direct = getRawOrganizations().find((organization) => String(organization.id || "") === String(explicitOrganizationId));
      if (direct) return direct;
    }
    if (typeof app.getOrganizationByProviderId === "function") {
      const byProvider = app.getOrganizationByProviderId(providerId || providerName);
      if (byProvider) return byProvider;
    }
    if (typeof app.findOrganization === "function") {
      const found = app.findOrganization(providerId || providerName);
      if (found) return found;
    }
    return getRawOrganizations().find((organization) => (
      organizationMatches(organization, providerId) || organizationMatches(organization, providerName)
    )) || null;
  }

  function resolveSubscriptionProvider(source = {}) {
    const explicitProviderId = String(source.providerId || "").trim();
    const explicitProviderName = String(source.provider || source.displaySnapshot?.provider || "").trim();
    const providerKey = normalizeKey(explicitProviderId || explicitProviderName);
    const providerDefinition = getRawProviderDefinitions().find((provider) => (
      [provider.id, provider.name, provider.label].map(normalizeKey).filter(Boolean).includes(providerKey)
    )) || null;
    const providerId = explicitProviderId || String(providerDefinition?.id || "").trim();
    const providerName = explicitProviderName || String(providerDefinition?.name || providerDefinition?.label || "LOCAL LEDGER").trim();
    const organization = resolveOrganization(
      providerId,
      providerName,
      source.organizationId || providerDefinition?.organizationId || ""
    );
    const market = token(source.market || source.displaySnapshot?.market || providerDefinition?.market || "SYSTEM");
    return {
      providerId,
      provider: providerName || "LOCAL LEDGER",
      organizationId: String(source.organizationId || providerDefinition?.organizationId || organization?.id || "").trim(),
      market: ["SYSTEM", "PRIVATE"].includes(market) ? market : "SYSTEM"
    };
  }

  function getTierLevelFromText(value = "") {
    const text = String(value || "").toUpperCase();
    const match = text.match(/\bT\s*([0-9]+)\b/) || text.match(/\b(?:TIER|LEVEL)\s*([0-9]+)\b/);
    if (match) return Math.max(0, Math.round(Number(match[1]) || 0));
    if (text.includes("PREVAIL")) return 3;
    if (text.includes("SUSTAIN")) return 2;
    if (text.includes("LIVE")) return 1;
    return 0;
  }

  function getTierLevel(tier = {}, index = 0) {
    const direct = Number(tier.tierLevel ?? tier.level);
    if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
    return getTierLevelFromText([getTierId(tier), tier.label, tier.name].filter(Boolean).join(" ")) || index + 1;
  }

  function normalizeBillingStatus(value = "PENDING") {
    const normalized = token(value || "PENDING");
    const resolved = BILLING_STATUS_ALIASES[normalized] || normalized;
    return BILLING_STATUSES.has(resolved) ? resolved : "PENDING";
  }

  function normalizeContractStatus(value = "ACTIVE", billingStatus = "PENDING", cancelledAt = null) {
    const normalized = token(value || "ACTIVE");
    if (normalized === "CANCELLED" || billingStatus === "CANCELLED" || cancelledAt) return "CANCELLED";
    return CONTRACT_STATUSES.has(normalized) ? normalized : "ACTIVE";
  }

  function deriveEntitlementStatus(contractStatus = "ACTIVE", billingStatus = "PENDING") {
    if (contractStatus === "CANCELLED" || billingStatus === "CANCELLED") return "CANCELLED";
    if (billingStatus === "PAID") return "ACTIVE";
    if (billingStatus === "OVERDUE") return "GRACE_PERIOD";
    if (billingStatus === "SUSPENDED") return "SUSPENDED";
    return "PENDING";
  }

  function normalizeCoverageTarget(value = {}, citizenId = "") {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const type = TARGET_TYPES.has(token(source.type)) ? token(source.type) : "CITIZEN";
    const id = String(source.id || (type === "CITIZEN" ? citizenId : "")).trim();
    return { type, id };
  }

  function resolveSubscriptionContractState(subscription = {}) {
    const billingStatus = normalizeBillingStatus(subscription.billingStatus || subscription.status || "PENDING");
    const contractStatus = normalizeContractStatus(subscription.contractStatus, billingStatus, subscription.cancelledAt);
    const entitlementStatus = deriveEntitlementStatus(contractStatus, billingStatus);
    const entitled = ["ACTIVE", "GRACE_PERIOD"].includes(entitlementStatus);
    return {
      contractStatus,
      billingStatus,
      entitlementStatus,
      entitled,
      active: entitled,
      billable: contractStatus === "ACTIVE" && parseCreditNumber(subscription.amount) > 0,
      payable: contractStatus === "ACTIVE" && ["PENDING", "OVERDUE", "SUSPENDED"].includes(billingStatus),
      reason: entitled ? `ENTITLEMENT_${entitlementStatus}` : `ENTITLEMENT_${entitlementStatus}_BLOCKED`
    };
  }

  function findCatalogAndTier(subscription = {}) {
    const subscriptionCatalogId = String(subscription.subscriptionCatalogId || subscription.catalogId || "").trim();
    const tierId = String(subscription.tierId || "").trim();
    const definition = getRawCatalogDefinitions().find((item) => getCatalogId(item) === subscriptionCatalogId) || null;
    const tier = definition
      ? (Array.isArray(definition.tiers) ? definition.tiers : []).find((item) => getTierId(item) === tierId && item.active !== false && item.archived !== true) || null
      : null;
    return { subscriptionCatalogId, tierId, definition, tier };
  }


  function normalizeEvaluationTime(value) {
    const fallback = String(app.getCampaignDateIso?.() || app.CAMPAIGN_DATE_ISO || "2109-02-13").trim();
    const source = String(value || fallback).trim();
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(source);
    const parsed = new Date(dateOnly ? `${source}T12:00:00.000Z` : source);
    const safe = Number.isNaN(parsed.getTime())
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(fallback) ? `${fallback}T12:00:00.000Z` : "2109-02-13T12:00:00.000Z")
      : parsed;
    return {
      iso: safe.toISOString(),
      date: safe.toISOString().slice(0, 10),
      epoch: safe.getTime()
    };
  }

  function boundaryEpoch(value, endOfDay = false) {
    const source = String(value || "").trim();
    if (!source) return null;
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(source);
    const parsed = new Date(dateOnly
      ? `${source}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
      : source);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  function makeReason(code, severity = "BLOCKER", details = {}) {
    return {
      code: token(code),
      severity: token(severity || "BLOCKER") || "BLOCKER",
      ...(details && typeof details === "object" && Object.keys(details).length ? { details: clone(details) } : {})
    };
  }

  function getCitizenContractsForEntitlement(citizenId) {
    if (typeof app.getCitizenSubscriptionContracts === "function") {
      const records = app.getCitizenSubscriptionContracts(citizenId, { includeCancelled: true });
      if (Array.isArray(records)) return records;
    }
    const citizen = app.getCitizenById?.(citizenId);
    return (Array.isArray(citizen?.subscriptions) ? citizen.subscriptions : [])
      .map((contract, index) => normalizeSubscriptionContract(contract, index, { citizenId }))
      .map((contract, index) => serializeSubscriptionContract(contract, index, { citizenId }));
  }

  function getCatalogEntryForEntitlement(subscriptionCatalogId) {
    if (typeof app.getSubscriptionCatalogEntry === "function") {
      const record = app.getSubscriptionCatalogEntry(subscriptionCatalogId);
      if (record) return record;
    }
    return getRawCatalogDefinitions().find((item) => getCatalogId(item) === String(subscriptionCatalogId || "").trim()) || null;
  }

  function getCatalogTierForEntitlement(catalog = {}, tierId = "") {
    return (Array.isArray(catalog?.tiers) ? catalog.tiers : [])
      .find((tier) => getTierId(tier) === String(tierId || "").trim()) || null;
  }

  function getEffectiveEntitlementCodes(catalog = {}, tier = {}) {
    return Array.from(new Set([
      ...normalizeStringList(catalog.entitlementCodes),
      ...normalizeStringList(tier.entitlementCodes)
    ]));
  }

  function getCoverageRuleIds(catalog = {}, tier = {}) {
    const catalogRuleIds = (Array.isArray(catalog.coverageRules) ? catalog.coverageRules : [])
      .map((rule) => token(rule?.coverageRuleId || rule?.id || rule?.code || rule))
      .filter(Boolean);
    return Array.from(new Set([
      ...catalogRuleIds,
      ...normalizeStringList(tier.coverageRuleIds)
    ]));
  }

  function getContractRevisionSignature(contracts = []) {
    return (Array.isArray(contracts) ? contracts : [])
      .map((contract) => [
        contract.subscriptionContractId,
        Number(contract.revision || 0),
        contract.contractStatus,
        contract.billingStatus,
        contract.entitlementStatus,
        contract.currentPeriodEnd || "",
        contract.gracePeriodEndsAt || "",
        contract.providerId || "",
        contract.coverageTarget?.type || "",
        contract.coverageTarget?.id || ""
      ].join(":"))
      .sort()
      .join("|");
  }

  function getCatalogRevisionSignature(contracts = []) {
    return (Array.isArray(contracts) ? contracts : [])
      .map((contract) => {
        const catalog = getCatalogEntryForEntitlement(contract.subscriptionCatalogId);
        const tier = getCatalogTierForEntitlement(catalog, contract.tierId);
        return [
          contract.subscriptionCatalogId,
          Number(catalog?.revision || 0),
          contract.tierId,
          Number(tier?.revision || 0),
          catalog?.active === false || catalog?.archived === true ? 0 : 1,
          tier?.active === false || tier?.archived === true ? 0 : 1
        ].join(":");
      })
      .sort()
      .join("|");
  }

  function getItemTargetRevisionSignature(target = {}) {
    if (token(target.type) !== "ITEM_INSTANCE") return "0";
    return String(typeof app.getItemInstanceStoreRevision === "function" ? app.getItemInstanceStoreRevision() : 0);
  }

  function entitlementCacheKey(query = {}, target = {}, atTime = {}, contracts = []) {
    return [
      String(query.citizenId || "").trim(),
      String(query.providerId || "").trim(),
      token(query.entitlementCode),
      target.type,
      target.id,
      atTime.iso,
      getContractRevisionSignature(contracts),
      getCatalogRevisionSignature(contracts),
      getItemTargetRevisionSignature(target)
    ].join("::");
  }

  function rememberEntitlementResult(key, result) {
    if (!key) return;
    if (entitlementCache.has(key)) entitlementCache.delete(key);
    entitlementCache.set(key, clone(result));
    while (entitlementCache.size > ENTITLEMENT_CACHE_LIMIT) {
      const oldest = entitlementCache.keys().next().value;
      entitlementCache.delete(oldest);
    }
  }

  function getContractSnapshotCacheKey(subscription = {}, atTimeValue = "") {
    const citizenId = String(subscription.citizenId || "").trim();
    const subscriptionCatalogId = String(subscription.subscriptionCatalogId || subscription.catalogId || "").trim();
    const tierId = String(subscription.tierId || "").trim();
    const target = normalizeCoverageTarget(subscription.coverageTarget, citizenId);
    const atTime = normalizeEvaluationTime(atTimeValue);
    const catalog = getCatalogEntryForEntitlement(subscriptionCatalogId);
    const tier = getCatalogTierForEntitlement(catalog, tierId);
    return [
      String(subscription.subscriptionContractId || subscription.id || "").trim(),
      subscriptionCatalogId,
      citizenId,
      String(subscription.providerId || subscription.provider || "").trim(),
      tierId,
      token(subscription.contractStatus || ""),
      token(subscription.billingStatus || subscription.status || ""),
      token(subscription.entitlementStatus || ""),
      subscription.active === false ? "0" : "1",
      String(subscription.startedAt || ""),
      String(subscription.currentPeriodStart || ""),
      String(subscription.currentPeriodEnd || ""),
      String(subscription.gracePeriodEndsAt || ""),
      String(subscription.cancelledAt || ""),
      String(subscription.suspendedAt || ""),
      Number(subscription.revision || 0),
      target.type,
      target.id,
      atTime.iso,
      Number(catalog?.revision || 0),
      Number(tier?.revision || 0),
      catalog?.active === false || catalog?.archived === true ? "0" : "1",
      tier?.active === false || tier?.archived === true ? "0" : "1",
      getItemTargetRevisionSignature(target)
    ].join("::");
  }

  function rememberContractSnapshot(key, snapshot) {
    if (!key) return snapshot;
    if (contractSnapshotCache.has(key)) contractSnapshotCache.delete(key);
    contractSnapshotCache.set(key, snapshot);
    while (contractSnapshotCache.size > ENTITLEMENT_CACHE_LIMIT) {
      const oldest = contractSnapshotCache.keys().next().value;
      contractSnapshotCache.delete(oldest);
    }
    return snapshot;
  }

  function getCachedSubscriptionContractEntitlementSnapshot(subscription = {}, atTimeValue = "") {
    const key = getContractSnapshotCacheKey(subscription, atTimeValue);
    if (contractSnapshotCache.has(key)) {
      contractSnapshotCacheHits += 1;
      return contractSnapshotCache.get(key);
    }
    contractSnapshotCacheMisses += 1;
    return rememberContractSnapshot(key, getSubscriptionContractEntitlementSnapshot(subscription, atTimeValue));
  }

  function invalidateSubscriptionEntitlement(citizenId = "") {
    const id = String(citizenId || "").trim();
    if (!id) {
      entitlementCache.clear();
      contractSnapshotCache.clear();
      return true;
    }
    Array.from(entitlementCache.entries()).forEach(([key, result]) => {
      if (String(result?.citizenId || "") === id) entitlementCache.delete(key);
    });
    Array.from(contractSnapshotCache.entries()).forEach(([key, snapshot]) => {
      if (String(snapshot?.citizenId || "") === id) contractSnapshotCache.delete(key);
    });
    return true;
  }

  function getSubscriptionEntitlementCacheStats() {
    return {
      version: ENTITLEMENT_API_VERSION,
      size: entitlementCache.size,
      limit: ENTITLEMENT_CACHE_LIMIT,
      hits: entitlementCacheHits,
      misses: entitlementCacheMisses,
      contractSnapshotSize: contractSnapshotCache.size,
      contractSnapshotHits: contractSnapshotCacheHits,
      contractSnapshotMisses: contractSnapshotCacheMisses
    };
  }

  function deriveQueryEntitlementStatus(contract = {}, catalog = {}, tier = {}, atTime = {}) {
    const state = resolveSubscriptionContractState(contract);
    if (catalog?.active === false || catalog?.archived === true || tier?.active === false || tier?.archived === true) {
      return { status: "REVOKED", reasons: [makeReason("ENTITLEMENT_REVOKED", "BLOCKER")] };
    }
    if (state.contractStatus === "CANCELLED" || state.billingStatus === "CANCELLED") {
      return { status: "CANCELLED", reasons: [makeReason("CONTRACT_CANCELLED", "BLOCKER")] };
    }
    if (state.billingStatus === "SUSPENDED") {
      return { status: "SUSPENDED", reasons: [makeReason("CONTRACT_SUSPENDED", "BLOCKER")] };
    }
    if (state.billingStatus === "PENDING") {
      return { status: "PENDING", reasons: [makeReason("CONTRACT_PENDING", "BLOCKER")] };
    }

    const periodEndEpoch = boundaryEpoch(contract.currentPeriodEnd, true);
    const graceEndEpoch = boundaryEpoch(contract.gracePeriodEndsAt, true);
    if (periodEndEpoch !== null && atTime.epoch > periodEndEpoch) {
      if (state.billingStatus === "OVERDUE" && (graceEndEpoch === null || atTime.epoch <= graceEndEpoch)) {
        return {
          status: "GRACE_PERIOD",
          reasons: [
            makeReason("CONTRACT_IN_GRACE_PERIOD", "INFO"),
            ...(graceEndEpoch === null ? [makeReason("GRACE_PERIOD_END_UNSPECIFIED", "WARNING")] : [])
          ]
        };
      }
      return { status: "EXPIRED", reasons: [makeReason("CONTRACT_EXPIRED", "BLOCKER")] };
    }

    if (state.billingStatus === "OVERDUE") {
      if (graceEndEpoch !== null && atTime.epoch > graceEndEpoch) {
        return { status: "EXPIRED", reasons: [makeReason("GRACE_PERIOD_EXPIRED", "BLOCKER")] };
      }
      return {
        status: "GRACE_PERIOD",
        reasons: [
          makeReason("CONTRACT_IN_GRACE_PERIOD", "INFO"),
          ...(graceEndEpoch === null ? [makeReason("GRACE_PERIOD_END_UNSPECIFIED", "WARNING")] : [])
        ]
      };
    }

    return { status: "ACTIVE", reasons: [makeReason("ENTITLEMENT_ACTIVE", "INFO")] };
  }

  function getSubscriptionContractEntitlementSnapshot(subscription = {}, atTimeValue = "") {
    const citizenId = String(subscription.citizenId || "").trim();
    const runtimeContract = normalizeSubscriptionContract(subscription, 0, { citizenId });
    const atTime = normalizeEvaluationTime(atTimeValue);
    const validation = validateSubscriptionContract(runtimeContract);
    const catalog = getCatalogEntryForEntitlement(runtimeContract.subscriptionCatalogId);
    const tier = getCatalogTierForEntitlement(catalog, runtimeContract.tierId);
    const target = normalizeCoverageTarget(runtimeContract.coverageTarget, citizenId);
    const targetValidation = validateSubscriptionCoverageTarget({
      citizenId,
      subscriptionCatalogId: runtimeContract.subscriptionCatalogId,
      tierId: runtimeContract.tierId,
      coverageTarget: target,
      catalog
    });
    const reasons = [];

    let status = "NOT_FOUND";
    if (validation.valid !== true) {
      reasons.push(makeReason("CONTRACT_INVALID", "BLOCKER", { errors: validation.errors || [] }));
    } else if (!catalog) {
      reasons.push(makeReason("SUBSCRIPTION_CATALOG_NOT_FOUND", "BLOCKER"));
    } else if (!tier) {
      reasons.push(makeReason("SUBSCRIPTION_TIER_NOT_FOUND", "BLOCKER"));
    } else if (targetValidation.valid !== true) {
      status = "REVOKED";
      reasons.push(...targetValidation.reasons);
    } else {
      const statusResult = deriveQueryEntitlementStatus(runtimeContract, catalog, tier, atTime);
      status = statusResult.status;
      reasons.push(...statusResult.reasons);
    }

    const entitlementCodes = catalog && tier
      ? getEffectiveEntitlementCodes(catalog, tier).slice().sort()
      : [];
    const coverageRuleIds = catalog && tier
      ? getCoverageRuleIds(catalog, tier).slice().sort()
      : [];
    const allowed = ["ACTIVE", "GRACE_PERIOD"].includes(status);
    const snapshot = {
      allowed,
      status,
      citizenId,
      subscriptionContractId: runtimeContract.subscriptionContractId || null,
      subscriptionCatalogId: runtimeContract.subscriptionCatalogId || null,
      providerId: runtimeContract.providerId || null,
      tierId: runtimeContract.tierId || null,
      coverageTarget: clone(target),
      targetSnapshot: clone(targetValidation.itemInstance),
      entitlementCodes,
      coverageRuleIds,
      reasons: clone(reasons),
      evaluatedAt: atTime.iso,
      contractRevision: Number(runtimeContract.revision || 0),
      catalogRevision: Number(catalog?.revision || 0),
      tierRevision: Number(tier?.revision || 0),
      itemStoreRevision: Number(getItemTargetRevisionSignature(target) || 0)
    };
    snapshot.signature = [
      snapshot.allowed ? "1" : "0",
      snapshot.status,
      snapshot.subscriptionCatalogId || "",
      snapshot.providerId || "",
      snapshot.tierId || "",
      target.type,
      target.id,
      targetValidation.valid ? "TARGET_VALID" : targetValidation.errors.join(","),
      targetValidation.itemInstance?.ownerId || "",
      targetValidation.itemInstance?.definitionId || "",
      targetValidation.itemInstance?.lifecycleState || "",
      targetValidation.itemInstance?.locationType || "",
      entitlementCodes.join(","),
      coverageRuleIds.join(","),
      catalog?.active === false || catalog?.archived === true ? "0" : "1",
      tier?.active === false || tier?.archived === true ? "0" : "1"
    ].join("|");
    return snapshot;
  }

  function rankEntitlementCandidate(candidate = {}) {
    return [
      ENTITLEMENT_STATUS_RANK[candidate.status] || 0,
      Number(candidate.tierLevel || 0),
      Number(candidate.contractRevision || 0),
      String(candidate.subscriptionContractId || "")
    ];
  }

  function compareEntitlementCandidates(left = {}, right = {}) {
    const a = rankEntitlementCandidate(left);
    const b = rankEntitlementCandidate(right);
    for (let index = 0; index < 3; index += 1) {
      if (a[index] !== b[index]) return b[index] - a[index];
    }
    return String(a[3]).localeCompare(String(b[3]));
  }

  function emptyEntitlementResult(query = {}, target = {}, atTime = {}, status = "NOT_FOUND", reasons = []) {
    const normalizedStatus = QUERY_ENTITLEMENT_STATUSES.has(token(status)) ? token(status) : "NOT_FOUND";
    return {
      allowed: false,
      status: normalizedStatus,
      citizenId: String(query.citizenId || "").trim(),
      subscriptionContractId: null,
      subscriptionCatalogId: null,
      providerId: String(query.providerId || "").trim() || null,
      entitlementCode: token(query.entitlementCode),
      coverageTarget: clone(target),
      targetSnapshot: null,
      coverageRuleIds: [],
      reasons: clone(reasons),
      evaluatedAt: atTime.iso,
      contractRevision: 0,
      catalogRevision: 0,
      tierRevision: 0,
      itemStoreRevision: Number(getItemTargetRevisionSignature(target) || 0)
    };
  }

  function resolveSubscriptionEntitlement(query = {}) {
    const citizenId = String(query.citizenId || "").trim();
    const entitlementCode = token(query.entitlementCode);
    const providerId = String(query.providerId || "").trim();
    const target = normalizeCoverageTarget({
      type: query.targetType || query.coverageTarget?.type || "CITIZEN",
      id: query.targetId || query.coverageTarget?.id || citizenId
    }, citizenId);
    const atTime = normalizeEvaluationTime(query.atTime);

    if (!citizenId) {
      return emptyEntitlementResult(query, target, atTime, "NOT_FOUND", [makeReason("CITIZEN_ID_REQUIRED", "ERROR")]);
    }
    if (!entitlementCode) {
      return emptyEntitlementResult(query, target, atTime, "NOT_FOUND", [makeReason("ENTITLEMENT_CODE_REQUIRED", "ERROR")]);
    }
    if (!target.id) {
      return emptyEntitlementResult(query, target, atTime, "NOT_FOUND", [makeReason("ENTITLEMENT_TARGET_ID_REQUIRED", "ERROR")]);
    }

    const contracts = getCitizenContractsForEntitlement(citizenId);
    const cacheKey = entitlementCacheKey({ ...query, citizenId, providerId, entitlementCode }, target, atTime, contracts);
    if (entitlementCache.has(cacheKey)) {
      entitlementCacheHits += 1;
      return clone(entitlementCache.get(cacheKey));
    }
    entitlementCacheMisses += 1;

    if (!contracts.length) {
      const result = emptyEntitlementResult(query, target, atTime, "NOT_FOUND", [makeReason("ENTITLEMENT_NOT_FOUND", "BLOCKER")]);
      rememberEntitlementResult(cacheKey, result);
      return clone(result);
    }

    const providerMatches = providerId
      ? contracts.filter((contract) => String(contract.providerId || "") === providerId)
      : contracts.slice();
    if (providerId && !providerMatches.length) {
      const result = emptyEntitlementResult(query, target, atTime, "NOT_FOUND", [makeReason("PROVIDER_MISMATCH", "BLOCKER", { providerId })]);
      rememberEntitlementResult(cacheKey, result);
      return clone(result);
    }

    const targetMatches = providerMatches.filter((contract) => {
      const contractTarget = normalizeCoverageTarget(contract.coverageTarget, contract.citizenId || citizenId);
      return contractTarget.type === target.type && contractTarget.id === target.id;
    });
    if (!targetMatches.length) {
      const result = emptyEntitlementResult(query, target, atTime, "NOT_FOUND", [makeReason("TARGET_MISMATCH", "BLOCKER", target)]);
      rememberEntitlementResult(cacheKey, result);
      return clone(result);
    }

    const candidates = [];
    let missingCatalog = false;
    let missingTier = false;
    let invalidContract = false;
    targetMatches.forEach((contract, index) => {
      const runtimeContract = normalizeSubscriptionContract(contract, index, { citizenId });
      const identityValid = Boolean(
        runtimeContract.subscriptionContractId
        && runtimeContract.subscriptionCatalogId
        && runtimeContract.citizenId
        && runtimeContract.providerId
        && runtimeContract.tierId
        && runtimeContract.coverageTarget?.id
      );
      if (!identityValid) {
        invalidContract = true;
        return;
      }
      const catalog = getCatalogEntryForEntitlement(runtimeContract.subscriptionCatalogId);
      if (!catalog) {
        missingCatalog = true;
        return;
      }
      const tier = getCatalogTierForEntitlement(catalog, runtimeContract.tierId);
      if (!tier) {
        missingTier = true;
        return;
      }
      const codes = getEffectiveEntitlementCodes(catalog, tier);
      if (!codes.includes(entitlementCode)) return;
      const targetValidation = validateSubscriptionCoverageTarget({
        citizenId,
        subscriptionCatalogId: runtimeContract.subscriptionCatalogId,
        tierId: runtimeContract.tierId,
        coverageTarget: runtimeContract.coverageTarget,
        catalog
      });
      const statusResult = targetValidation.valid
        ? deriveQueryEntitlementStatus(runtimeContract, catalog, tier, atTime)
        : { status: "REVOKED", reasons: targetValidation.reasons };
      candidates.push({
        allowed: ["ACTIVE", "GRACE_PERIOD"].includes(statusResult.status),
        status: statusResult.status,
        citizenId,
        subscriptionContractId: runtimeContract.subscriptionContractId,
        subscriptionCatalogId: runtimeContract.subscriptionCatalogId,
        providerId: runtimeContract.providerId,
        entitlementCode,
        coverageTarget: clone(runtimeContract.coverageTarget),
        targetSnapshot: clone(targetValidation.itemInstance),
        coverageRuleIds: getCoverageRuleIds(catalog, tier),
        reasons: clone(statusResult.reasons),
        evaluatedAt: atTime.iso,
        contractRevision: Number(runtimeContract.revision || 0),
        catalogRevision: Number(catalog.revision || 0),
        tierRevision: Number(tier.revision || 0),
        itemStoreRevision: Number(getItemTargetRevisionSignature(runtimeContract.coverageTarget) || 0),
        tierLevel: getTierLevel(tier, 0)
      });
    });

    if (!candidates.length) {
      const reasons = [];
      if (invalidContract) reasons.push(makeReason("CONTRACT_INVALID", "BLOCKER"));
      if (missingCatalog) reasons.push(makeReason("SUBSCRIPTION_CATALOG_NOT_FOUND", "BLOCKER"));
      if (missingTier) reasons.push(makeReason("SUBSCRIPTION_TIER_NOT_FOUND", "BLOCKER"));
      if (!reasons.length) reasons.push(makeReason("ENTITLEMENT_CODE_NOT_GRANTED", "BLOCKER", { entitlementCode }));
      const result = emptyEntitlementResult(query, target, atTime, "NOT_FOUND", reasons);
      rememberEntitlementResult(cacheKey, result);
      return clone(result);
    }

    candidates.sort(compareEntitlementCandidates);
    const selected = clone(candidates[0]);
    delete selected.tierLevel;
    rememberEntitlementResult(cacheKey, selected);
    return clone(selected);
  }

  function validateSubscriptionContract(subscription = {}) {
    const errors = [];
    const warnings = [];
    const { subscriptionCatalogId, tierId, definition, tier } = findCatalogAndTier(subscription);
    const subscriptionContractId = String(subscription.subscriptionContractId || "").trim();
    const citizenId = String(subscription.citizenId || "").trim();
    const providerId = String(subscription.providerId || "").trim();
    const target = normalizeCoverageTarget(subscription.coverageTarget, citizenId);

    if (!subscriptionContractId) errors.push("SUBSCRIPTION_CONTRACT_ID_REQUIRED");
    if (!subscriptionCatalogId) errors.push("SUBSCRIPTION_CATALOG_REQUIRED");
    else if (!definition) errors.push("SUBSCRIPTION_CATALOG_NOT_FOUND");
    if (!tierId) errors.push("SUBSCRIPTION_TIER_REQUIRED");
    else if (definition && !tier) errors.push("SUBSCRIPTION_TIER_NOT_FOUND");
    if (!citizenId) errors.push("SUBSCRIPTION_CITIZEN_ID_REQUIRED");
    if (!providerId) errors.push("SUBSCRIPTION_PROVIDER_ID_REQUIRED");
    if (!target.id) errors.push("SUBSCRIPTION_TARGET_ID_REQUIRED");
    if (target.type === "CITIZEN" && citizenId && target.id !== citizenId) errors.push("SUBSCRIPTION_CITIZEN_TARGET_MISMATCH");
    if (definition) {
      const targetPolicy = getSubscriptionTargetPolicy(definition);
      if (!targetPolicy.allowedTargetTypes.includes(target.type)) errors.push("SUBSCRIPTION_TARGET_NOT_ALLOWED");
    }
    if (!subscription.organizationId) warnings.push("SUBSCRIPTION_ORGANIZATION_ID_MISSING");

    const targetValidation = validateSubscriptionCoverageTarget({
      citizenId,
      subscriptionCatalogId,
      tierId,
      coverageTarget: target,
      catalog: definition
    });
    const runtimeTargetErrors = targetValidation.errors.filter((code) => ![
      "SUBSCRIPTION_CITIZEN_ID_REQUIRED",
      "SUBSCRIPTION_CATALOG_REQUIRED",
      "SUBSCRIPTION_CATALOG_NOT_FOUND",
      "SUBSCRIPTION_TARGET_ID_REQUIRED",
      "SUBSCRIPTION_TARGET_NOT_ALLOWED",
      "SUBSCRIPTION_CITIZEN_TARGET_MISMATCH"
    ].includes(code));
    warnings.push(...runtimeTargetErrors);

    return {
      valid: errors.length === 0,
      errors: Array.from(new Set(errors)),
      warnings: Array.from(new Set(warnings)),
      subscriptionContractId,
      subscriptionCatalogId,
      tierId,
      citizenId,
      providerId,
      coverageTarget: target,
      coverageTargetValidation: clone(targetValidation)
    };
  }

  function normalizeSubscriptionContract(subscription = {}, index = 0, options = {}) {
    const source = subscription && typeof subscription === "object" && !Array.isArray(subscription) ? clone(subscription) : {};
    const citizenId = String(source.citizenId || options.citizenId || "").trim();
    const { subscriptionCatalogId, tierId, definition, tier } = findCatalogAndTier(source);
    const displaySource = source.displaySnapshot && typeof source.displaySnapshot === "object" ? source.displaySnapshot : {};
    const provider = resolveSubscriptionProvider({
      ...definition,
      ...displaySource,
      ...source,
      providerId: source.providerId || definition?.providerId || "",
      organizationId: source.organizationId || definition?.organizationId || ""
    });
    const category = token(definition?.category || displaySource.category || source.category || "OTHER") || "OTHER";
    const baseTitle = String(definition?.title || displaySource.title || source.title || source.name || "New Subscription").trim();
    const tierLabel = String(tier?.label || displaySource.tierLabel || source.tierLabel || source.tier || "").trim();
    const title = String(displaySource.title || source.title || baseTitle).trim();
    const billingCycle = token(tier?.billingCycle || definition?.billingCycle || source.billingCycle || source.cycle || "WEEKLY") || "WEEKLY";
    const currency = token(definition?.currency || source.currency || "CREDIT") || "CREDIT";
    const cancelledAt = normalizeNullableString(source.cancelledAt);
    const billingStatus = normalizeBillingStatus(source.billingStatus || source.status || "PENDING");
    const contractStatus = normalizeContractStatus(source.contractStatus, billingStatus, cancelledAt);
    const entitlementStatus = deriveEntitlementStatus(contractStatus, billingStatus);
    const entitlement = resolveSubscriptionContractState({ ...source, amount: source.amount ?? tier?.amount, billingStatus, contractStatus, cancelledAt });
    const startedAt = normalizeNullableString(source.startedAt || source.startDate || source.purchasedAt);
    const currentPeriodStart = normalizeNullableString(source.currentPeriodStart || startedAt);
    const currentPeriodEnd = normalizeNullableString(source.currentPeriodEnd || source.paidUntil || source.renewalDate || source.endDate || source.expiresAt);
    const contractIdSeed = [citizenId || "citizen", subscriptionCatalogId || category.toLowerCase(), tierId || index + 1].join("-");
    const subscriptionContractId = String(source.subscriptionContractId || source.id || `subscription-contract-${normalizeKey(contractIdSeed)}`).trim();
    const coverageTarget = normalizeCoverageTarget(source.coverageTarget, citizenId);
    const tierLevel = tier ? getTierLevel(tier, Math.max(0, (definition?.tiers || []).indexOf(tier))) : getTierLevelFromText([tierId, tierLabel, title].join(" "));
    const displaySnapshot = {
      title,
      tierLabel,
      category,
      provider: provider.provider,
      market: provider.market,
      logo: String(definition?.logo || displaySource.logo || source.logo || source.logoUrl || "").trim(),
      description: String(source.description || tier?.description || displaySource.description || definition?.description || "").trim()
    };
    const normalized = {
      subscriptionContractId,
      subscriptionCatalogId,
      citizenId,
      providerId: provider.providerId,
      organizationId: provider.organizationId,
      tierId: String(tier?.tierId || tier?.id || tierId || "").trim(),
      contractStatus,
      billingStatus,
      entitlementStatus,
      coverageTarget,
      startedAt,
      currentPeriodStart,
      currentPeriodEnd,
      gracePeriodEndsAt: normalizeNullableString(source.gracePeriodEndsAt),
      cancelledAt: contractStatus === "CANCELLED" ? cancelledAt : null,
      suspendedAt: entitlementStatus === "SUSPENDED" ? normalizeNullableString(source.suspendedAt) : null,
      billingAccountId: normalizeNullableString(source.billingAccountId),
      lastBillingTransactionId: normalizeNullableString(source.lastBillingTransactionId),
      amount: tier ? parseCreditNumber(tier.amount) : parseCreditNumber(source.amount),
      currency,
      billingCycle,
      lastPaidAt: normalizeNullableString(source.lastPaidAt),
      lastSettlementAt: normalizeNullableString(source.lastSettlementAt || source.lastBilledAt),
      lastBilledAt: normalizeNullableString(source.lastBilledAt || source.lastSettlementAt),
      lastBilledAmount: parseCreditNumber(source.lastBilledAmount),
      lastDebtIncrease: parseCreditNumber(source.lastDebtIncrease),
      cancellationCharge: parseCreditNumber(source.cancellationCharge),
      billingHistory: Array.isArray(source.billingHistory) ? clone(source.billingHistory) : [],
      displaySnapshot,
      revision: clampInteger(source.revision ?? 1, 1, Number.MAX_SAFE_INTEGER, 1),
      metadata: source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata) ? clone(source.metadata) : {}
    };
    const runtime = {
      ...normalized,
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      tierLevel,
      id: normalized.subscriptionContractId,
      catalogId: normalized.subscriptionCatalogId,
      tierLabel: displaySnapshot.tierLabel,
      category: displaySnapshot.category,
      title: displaySnapshot.title,
      provider: displaySnapshot.provider,
      market: displaySnapshot.market,
      logo: displaySnapshot.logo,
      description: displaySnapshot.description,
      status: normalized.billingStatus,
      active: entitlement.entitled,
      entitled: entitlement.entitled,
      cycle: normalized.billingCycle,
      startDate: normalized.startedAt || "",
      endDate: normalized.currentPeriodEnd || "",
      renewalDate: normalized.currentPeriodEnd || "",
      paidUntil: normalized.currentPeriodEnd || ""
    };
    runtime.contractValidation = validateSubscriptionContract(runtime);
    return runtime;
  }

  function serializeSubscriptionContract(subscription = {}, index = 0, options = {}) {
    const normalized = normalizeSubscriptionContract(subscription, index, options);
    return {
      subscriptionContractId: normalized.subscriptionContractId,
      subscriptionCatalogId: normalized.subscriptionCatalogId,
      citizenId: normalized.citizenId,
      providerId: normalized.providerId,
      organizationId: normalized.organizationId,
      tierId: normalized.tierId,
      contractStatus: normalized.contractStatus,
      billingStatus: normalized.billingStatus,
      entitlementStatus: normalized.entitlementStatus,
      coverageTarget: clone(normalized.coverageTarget),
      startedAt: normalized.startedAt,
      currentPeriodStart: normalized.currentPeriodStart,
      currentPeriodEnd: normalized.currentPeriodEnd,
      gracePeriodEndsAt: normalized.gracePeriodEndsAt,
      cancelledAt: normalized.cancelledAt,
      suspendedAt: normalized.suspendedAt,
      billingAccountId: normalized.billingAccountId,
      lastBillingTransactionId: normalized.lastBillingTransactionId,
      amount: normalized.amount,
      currency: normalized.currency,
      billingCycle: normalized.billingCycle,
      lastPaidAt: normalized.lastPaidAt,
      lastSettlementAt: normalized.lastSettlementAt,
      lastBilledAt: normalized.lastBilledAt,
      lastBilledAmount: normalized.lastBilledAmount,
      lastDebtIncrease: normalized.lastDebtIncrease,
      cancellationCharge: normalized.cancellationCharge,
      billingHistory: clone(normalized.billingHistory),
      displaySnapshot: clone(normalized.displaySnapshot),
      revision: normalized.revision,
      metadata: clone(normalized.metadata)
    };
  }

  function isCanonicalSubscriptionContractSource(subscription = {}) {
    return Boolean(
      subscription
      && typeof subscription === "object"
      && !Array.isArray(subscription)
      && String(subscription.subscriptionContractId || "").trim()
      && String(subscription.subscriptionCatalogId || "").trim()
      && String(subscription.citizenId || "").trim()
      && String(subscription.providerId || "").trim()
      && String(subscription.tierId || "").trim()
    );
  }

  function sanitizeCitizenSubscriptionContracts(citizen = {}) {
    const source = citizen && typeof citizen === "object" && !Array.isArray(citizen) ? clone(citizen) : {};
    const citizenId = String(source.id || source.citizenId || "").trim();
    const subscriptions = (Array.isArray(source.subscriptions) ? source.subscriptions : [])
      .filter(isCanonicalSubscriptionContractSource)
      .map((subscription, index) => normalizeSubscriptionContract(subscription, index, { citizenId }))
      .filter((subscription) => subscription.contractValidation?.valid === true);
    delete source.subscription;
    delete source.trauma;
    return {
      ...source,
      subscriptionContractSchemaVersion: CONTRACT_SCHEMA_VERSION,
      subscriptions
    };
  }

  app.SUBSCRIPTION_CONTRACT_SCHEMA_VERSION = CONTRACT_SCHEMA_VERSION;
  app.normalizeSubscriptionBillingStatus = normalizeBillingStatus;
  app.resolveSubscriptionProvider = resolveSubscriptionProvider;
  app.SUBSCRIPTION_ENTITLEMENT_API_VERSION = ENTITLEMENT_API_VERSION;
  app.resolveSubscriptionContractState = resolveSubscriptionContractState;
  app.resolveSubscriptionEntitlement = resolveSubscriptionEntitlement;
  app.getSubscriptionContractEntitlementSnapshot = getSubscriptionContractEntitlementSnapshot;
  app.invalidateSubscriptionEntitlement = invalidateSubscriptionEntitlement;
  app.getSubscriptionEntitlementCacheStats = getSubscriptionEntitlementCacheStats;
  app.getSubscriptionTargetPolicy = getSubscriptionTargetPolicy;
  app.getItemInstanceSubscriptionTargetSnapshot = getItemInstanceTargetSnapshot;
  app.validateSubscriptionCoverageTarget = validateSubscriptionCoverageTarget;
  app.normalizeSubscriptionCoverageTarget = normalizeCoverageTarget;
  app.normalizeSubscriptionContract = normalizeSubscriptionContract;
  app.serializeSubscriptionContract = serializeSubscriptionContract;
  app.isCanonicalSubscriptionContractSource = isCanonicalSubscriptionContractSource;
  app.validateSubscriptionContract = validateSubscriptionContract;
  app.sanitizeCitizenSubscriptionContracts = sanitizeCitizenSubscriptionContracts;
  app.getSubscriptionTierLevel = function getSubscriptionTierLevel(subscription = {}) {
    const direct = Number(subscription.tierLevel);
    if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
    return getTierLevelFromText([subscription.tierId, subscription.tierLabel, subscription.title].filter(Boolean).join(" "));
  };
  app.isSubscriptionEntitled = function isSubscriptionEntitled(subscription = {}, atTimeValue = "") {
    return getCachedSubscriptionContractEntitlementSnapshot(subscription, atTimeValue).allowed === true;
  };
  app.getCitizenEntitledSubscriptions = function getCitizenEntitledSubscriptions(citizenOrId = {}) {
    const citizen = typeof citizenOrId === "string" ? app.getCitizenById?.(citizenOrId) : citizenOrId;
    const citizenId = String(citizen?.id || "").trim();
    return (Array.isArray(citizen?.subscriptions) ? citizen.subscriptions : [])
      .map((subscription, index) => normalizeSubscriptionContract(subscription, index, { citizenId }))
      .filter((subscription) => getCachedSubscriptionContractEntitlementSnapshot(subscription).allowed === true);
  };

  window.addEventListener?.("ws:citizens-updated", (event) => {
    invalidateSubscriptionEntitlement(event?.detail?.citizenId || event?.detail?.id || "");
  });
  window.addEventListener?.("ws:item-instances-updated", (event) => {
    invalidateSubscriptionEntitlement(event?.detail?.citizenId || "");
  });
  window.addEventListener?.("ws:subscription-catalog-updated", () => {
    invalidateSubscriptionEntitlement();
  });
})();
