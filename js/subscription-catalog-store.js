window.WS_APP = window.WS_APP || {};

(function initSubscriptionCatalogStoreModule() {
  const app = window.WS_APP;
  const STORAGE_KEY = "ws_app_subscription_catalog_definitions_v4";
  const STORAGE_SCHEMA_KEY = "ws_app_subscription_catalog_definitions_schema_v4";
  const STORAGE_SCHEMA_VERSION = "subscription_catalog_housing_rent_4_0x";
  const LEGACY_STORAGE_KEYS = [
    "ws_app_subscription_catalog_definitions_v1",
    "ws_app_subscription_catalog_definitions_schema",
    "ws_app_subscription_catalog_definitions_v2",
    "ws_app_subscription_catalog_definitions_schema_v2",
    "ws_app_subscription_catalog_definitions_v3",
    "ws_app_subscription_catalog_definitions_schema_v3"
  ];
  const VALID_TARGET_TYPES = new Set(["CITIZEN", "ITEM_INSTANCE"]);
  const VALID_DOMAINS = new Set([
    "GENERAL", "MEDICAL", "CYBERWARE", "EQUIPMENT", "HOUSING", "NETWORK",
    "SECURITY", "FOOD", "TRANSPORT", "REST", "EDUCATION"
  ]);

  let subscriptionCatalogDefinitions = { schemaVersion: STORAGE_SCHEMA_VERSION, subscriptions: [] };

  function clone(value) {
    if (value === undefined) return undefined;
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function slugify(value) {
    const base = String(value || "definition")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64);
    return base || "definition";
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
    const cleaned = String(value || "").replace(/[^0-9,.-]/g, "").replace(/,/g, ".");
    const number = Number(cleaned);
    return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
  }

  function formatCreditLabel(value) {
    const formatter = app.formatCredits || app.storeUtils?.formatCredits;
    if (typeof formatter === "function") return formatter(parseCreditNumber(value));
    return `${parseCreditNumber(value)} ₡`;
  }

  function normalizeStringList(value = []) {
    const source = Array.isArray(value) ? value : String(value || "").split(/[\n,]/g);
    return Array.from(new Set(source.map((item) => token(item)).filter(Boolean)));
  }


  function normalizePresentationTextList(value = []) {
    const source = Array.isArray(value) ? value : [value];
    return Array.from(new Set(source
      .map((item) => String(item || "").trim())
      .filter(Boolean)));
  }

  function normalizeSubscriptionPresentation(value = {}, fallback = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      overview: String(source.overview || fallback.description || fallback.summary || "").trim(),
      benefits: normalizePresentationTextList(source.benefits),
      limitations: normalizePresentationTextList(source.limitations),
      usageNotes: normalizePresentationTextList(source.usageNotes),
      comparisonAxes: normalizePresentationTextList(source.comparisonAxes)
    };
  }

  function normalizeSubscriptionTierPresentation(value = {}, fallback = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const comparisonSource = source.comparisonValues && typeof source.comparisonValues === "object" && !Array.isArray(source.comparisonValues)
      ? source.comparisonValues
      : {};
    return {
      features: normalizePresentationTextList(source.features?.length ? source.features : [fallback.description]),
      limits: normalizePresentationTextList(source.limits),
      priorityLabel: String(source.priorityLabel || "").trim(),
      comparisonValues: {
        scope: String(comparisonSource.scope || fallback.description || fallback.label || "").trim(),
        access: String(comparisonSource.access || "").trim(),
        limit: String(comparisonSource.limit || "").trim(),
        priority: String(comparisonSource.priority || source.priorityLabel || "").trim()
      }
    };
  }

  function mergeSubscriptionPresentation(baseValue = {}, overlayValue = {}) {
    const base = normalizeSubscriptionPresentation(baseValue);
    const overlay = normalizeSubscriptionPresentation(overlayValue);
    return {
      overview: overlay.overview || base.overview,
      benefits: normalizePresentationTextList([...base.benefits, ...overlay.benefits]),
      limitations: normalizePresentationTextList([...base.limitations, ...overlay.limitations]),
      usageNotes: normalizePresentationTextList([...base.usageNotes, ...overlay.usageNotes]),
      comparisonAxes: normalizePresentationTextList([...base.comparisonAxes, ...overlay.comparisonAxes])
    };
  }

  function mergeSubscriptionTierPresentation(baseValue = {}, overlayValue = {}, fallback = {}) {
    const base = normalizeSubscriptionTierPresentation(baseValue, fallback);
    const overlay = normalizeSubscriptionTierPresentation(overlayValue, fallback);
    return {
      features: normalizePresentationTextList([...base.features, ...overlay.features]),
      limits: normalizePresentationTextList([...base.limits, ...overlay.limits]),
      priorityLabel: overlay.priorityLabel || base.priorityLabel,
      comparisonValues: {
        scope: overlay.comparisonValues.scope || base.comparisonValues.scope,
        access: overlay.comparisonValues.access || base.comparisonValues.access,
        limit: overlay.comparisonValues.limit || base.comparisonValues.limit,
        priority: overlay.comparisonValues.priority || base.comparisonValues.priority
      }
    };
  }

  function normalizeSubscriptionCategory(category = {}) {
    const id = token(category.id || category.category || "OTHER") || "OTHER";
    return {
      id,
      title: String(category.title || category.label || id).trim() || id,
      label: String(category.label || category.title || id).trim() || id,
      description: String(category.description || "").trim(),
      tags: normalizeStringList(category.tags),
      alphaOnly: category.alphaOnly === true
    };
  }

  function getSubscriptionCatalogCategories() {
    const seedCategories = window.APP_DATA?.subscriptionCatalog?.categories;
    const runtimeCategories = app.SUBSCRIPTION_CATEGORIES;
    const source = Array.isArray(seedCategories) && seedCategories.length
      ? seedCategories
      : Array.isArray(runtimeCategories) && runtimeCategories.length
        ? runtimeCategories
        : [{ id: "OTHER", title: "Other", label: "Other" }];
    const byId = new Map();
    source.forEach((category) => {
      const normalized = normalizeSubscriptionCategory(category);
      if (!byId.has(normalized.id)) byId.set(normalized.id, normalized);
    });
    if (!byId.has("OTHER")) byId.set("OTHER", normalizeSubscriptionCategory({ id: "OTHER" }));
    return Array.from(byId.values());
  }

  function normalizeSubscriptionLogoPath(value) {
    const normalized = String(value || "")
      .trim()
      .replace(/^[']|[']$/g, "")
      .replace(/^[\"]|[\"]$/g, "")
      .replace(/\\+/g, "/")
      .replace(/\/+/g, "/");
    if (!normalized) return "";
    const looksLikeAssetLogo = /^(assets\/logos\/|\.\/assets\/logos\/|\/assets\/logos\/)/i.test(normalized);
    const hasExtension = /\.[a-z0-9]{2,5}(?:[?#].*)?$/i.test(normalized);
    return looksLikeAssetLogo && !hasExtension && !normalized.endsWith("/") ? `${normalized}.png` : normalized;
  }

  function inferSubscriptionMarket(definition = {}) {
    const explicit = token(definition.market || definition.marketType || definition.sourceType || "");
    if (["SYSTEM", "PRIVATE"].includes(explicit)) return explicit;
    const providerId = String(definition.providerId || "").trim();
    const provider = (window.APP_DATA?.subscriptionCatalog?.providers || []).find((item) => String(item.id || "") === providerId);
    const resolved = token(provider?.market || "SYSTEM");
    return ["SYSTEM", "PRIVATE"].includes(resolved) ? resolved : "SYSTEM";
  }

  function normalizeSubscriptionMarketInput(value) {
    return inferSubscriptionMarket({ market: value });
  }

  function normalizeIdList(value = []) {
    const source = Array.isArray(value) ? value : String(value || "").split(/[\n,]/g);
    return Array.from(new Set(source.map((item) => String(item || "").trim()).filter(Boolean)));
  }

  function normalizeItemEligibility(value = {}) {
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

  function normalizeTargetPolicy(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const allowed = normalizeStringList(source.allowedTargetTypes || ["CITIZEN"])
      .filter((item) => VALID_TARGET_TYPES.has(item));
    const allowedTargetTypes = allowed.length ? allowed : ["CITIZEN"];
    const defaultTargetType = VALID_TARGET_TYPES.has(token(source.defaultTargetType))
      && allowedTargetTypes.includes(token(source.defaultTargetType))
      ? token(source.defaultTargetType)
      : allowedTargetTypes[0];
    return {
      allowedTargetTypes,
      defaultTargetType,
      maximumTargets: clampInteger(source.maximumTargets ?? 1, 1, 100, 1),
      itemEligibility: normalizeItemEligibility(source.itemEligibility)
    };
  }

  function normalizeSubscriptionTier(tier = {}, index = 0) {
    const label = String(tier.label || tier.name || `Tier ${index + 1}`).trim();
    const tierId = String(tier.tierId || tier.id || `tier-${slugify(label)}`).trim();
    const billingCycle = token(tier.billingCycle || tier.cycle || "WEEKLY") || "WEEKLY";
    const active = tier.active !== false && tier.archived !== true;
    const normalized = {
      tierId,
      tierLevel: clampInteger(tier.tierLevel ?? tier.level ?? index + 1, 1, 99, index + 1),
      label,
      amount: parseCreditNumber(tier.amount),
      billingCycle,
      durationDays: clampInteger(tier.durationDays ?? 7, 0, 3650, 7),
      description: String(tier.description || "").trim(),
      presentation: normalizeSubscriptionTierPresentation(tier.presentation, {
        description: String(tier.description || "").trim(),
        label
      }),
      entitlementCodes: normalizeStringList(tier.entitlementCodes),
      coverageRuleIds: normalizeStringList(tier.coverageRuleIds),
      active,
      revision: clampInteger(tier.revision ?? 1, 1, Number.MAX_SAFE_INTEGER, 1)
    };
    return {
      ...normalized,
      id: normalized.tierId,
      cycle: normalized.billingCycle,
      archived: !normalized.active
    };
  }

  function serializeSubscriptionTier(tier = {}, index = 0) {
    const normalized = normalizeSubscriptionTier(tier, index);
    return {
      tierId: normalized.tierId,
      tierLevel: normalized.tierLevel,
      label: normalized.label,
      amount: normalized.amount,
      billingCycle: normalized.billingCycle,
      durationDays: normalized.durationDays,
      description: normalized.description,
      presentation: clone(normalized.presentation),
      entitlementCodes: clone(normalized.entitlementCodes),
      coverageRuleIds: clone(normalized.coverageRuleIds),
      active: normalized.active,
      revision: normalized.revision
    };
  }

  function dedupeSubscriptionTiers(tiers = []) {
    const byId = new Map();
    (Array.isArray(tiers) ? tiers : []).filter(Boolean).forEach((tier, index) => {
      const normalized = normalizeSubscriptionTier(tier, index);
      byId.set(normalized.tierId, normalized);
    });
    return Array.from(byId.values()).sort((a, b) => a.tierLevel - b.tierLevel || a.label.localeCompare(b.label));
  }

  function normalizeSubscriptionDefinition(definition = {}) {
    const title = String(definition.title || definition.label || definition.name || "New Subscription").trim();
    const subscriptionCatalogId = String(definition.subscriptionCatalogId || definition.id || `sub-${slugify(title)}`).trim();
    const providerId = String(definition.providerId || "").trim();
    const providerDefinition = (window.APP_DATA?.subscriptionCatalog?.providers || []).find((item) => String(item.id || "") === providerId) || null;
    const providerIdentity = typeof app.resolveSubscriptionProvider === "function"
      ? app.resolveSubscriptionProvider({
        ...definition,
        providerId,
        provider: definition.provider || providerDefinition?.name || "LOCAL LEDGER",
        organizationId: definition.organizationId || providerDefinition?.organizationId || ""
      })
      : {
        providerId,
        provider: String(definition.provider || providerDefinition?.name || "LOCAL LEDGER").trim(),
        organizationId: String(definition.organizationId || providerDefinition?.organizationId || "").trim(),
        market: inferSubscriptionMarket(definition)
      };
    const active = definition.active !== false && definition.archived !== true;
    const domainToken = token(definition.domain || "GENERAL");
    const billingCycle = token(definition.billingCycle || definition.cycle || "WEEKLY") || "WEEKLY";
    const tiers = dedupeSubscriptionTiers(definition.tiers);
    const normalized = {
      subscriptionCatalogId,
      providerId: providerIdentity.providerId || providerId,
      organizationId: providerIdentity.organizationId || String(definition.organizationId || "").trim(),
      productCode: String(definition.productCode || subscriptionCatalogId.replace(/^sub-/, "").replace(/-/g, "_").toUpperCase()).trim(),
      title,
      provider: providerIdentity.provider || String(definition.provider || "LOCAL LEDGER").trim(),
      category: token(definition.category || "OTHER") || "OTHER",
      market: providerIdentity.market || inferSubscriptionMarket(definition),
      domain: VALID_DOMAINS.has(domainToken) ? domainToken : "GENERAL",
      billingCycle,
      currency: token(definition.currency || "CREDIT") || "CREDIT",
      entitlementCodes: normalizeStringList(definition.entitlementCodes),
      targetPolicy: normalizeTargetPolicy(definition.targetPolicy),
      coverageRules: Array.isArray(definition.coverageRules) ? clone(definition.coverageRules) : [],
      tags: normalizeStringList(definition.tags?.length ? definition.tags : [providerIdentity.market || inferSubscriptionMarket(definition)]),
      logo: normalizeSubscriptionLogoPath(definition.logo || definition.logoImage || definition.logoUrl || ""),
      summary: String(definition.summary || definition.shortSummary || "").trim(),
      description: String(definition.description || "").trim(),
      presentation: normalizeSubscriptionPresentation(definition.presentation, {
        summary: String(definition.summary || definition.shortSummary || "").trim(),
        description: String(definition.description || "").trim()
      }),
      tiers: tiers.length ? tiers : [normalizeSubscriptionTier({ tierId: "tier-default", label: "T1", amount: 0, billingCycle }, 0)],
      active,
      revision: clampInteger(definition.revision ?? 1, 1, Number.MAX_SAFE_INTEGER, 1)
    };
    return {
      ...normalized,
      id: normalized.subscriptionCatalogId,
      cycle: normalized.billingCycle,
      archived: !normalized.active
    };
  }

  function serializeSubscriptionDefinition(definition = {}) {
    const normalized = normalizeSubscriptionDefinition(definition);
    return {
      subscriptionCatalogId: normalized.subscriptionCatalogId,
      providerId: normalized.providerId,
      organizationId: normalized.organizationId,
      productCode: normalized.productCode,
      title: normalized.title,
      provider: normalized.provider,
      category: normalized.category,
      market: normalized.market,
      domain: normalized.domain,
      billingCycle: normalized.billingCycle,
      currency: normalized.currency,
      entitlementCodes: clone(normalized.entitlementCodes),
      targetPolicy: clone(normalized.targetPolicy),
      coverageRules: clone(normalized.coverageRules),
      tags: clone(normalized.tags),
      logo: normalized.logo,
      summary: normalized.summary,
      description: normalized.description,
      presentation: clone(normalized.presentation),
      tiers: normalized.tiers.map(serializeSubscriptionTier),
      active: normalized.active,
      revision: normalized.revision
    };
  }

  function normalizeSubscriptionCatalogDefinitions(value = {}) {
    const source = value && typeof value === "object" ? value : {};
    const byId = new Map();
    (Array.isArray(source.subscriptions) ? source.subscriptions : []).filter(Boolean).forEach((definition) => {
      const normalized = normalizeSubscriptionDefinition(definition);
      byId.set(normalized.subscriptionCatalogId, normalized);
    });
    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      subscriptions: Array.from(byId.values())
    };
  }

  function serializeSubscriptionCatalogDefinitions(value = {}) {
    const normalized = normalizeSubscriptionCatalogDefinitions(value);
    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      subscriptions: normalized.subscriptions.map(serializeSubscriptionDefinition)
    };
  }

  function mergeSubscriptionDefinitionList(baseList = [], storedList = []) {
    const byId = new Map();
    (Array.isArray(baseList) ? baseList : []).forEach((item) => {
      const normalized = normalizeSubscriptionDefinition(item);
      byId.set(normalized.subscriptionCatalogId, normalized);
    });
    (Array.isArray(storedList) ? storedList : []).forEach((item) => {
      const normalized = normalizeSubscriptionDefinition(item);
      const base = byId.get(normalized.subscriptionCatalogId);
      if (!base) {
        byId.set(normalized.subscriptionCatalogId, normalized);
        return;
      }
      const tiersById = new Map(base.tiers.map((tier) => [tier.tierId, tier]));
      normalized.tiers.forEach((tier) => {
        const existing = tiersById.get(tier.tierId);
        tiersById.set(tier.tierId, normalizeSubscriptionTier({
          ...(existing || {}),
          ...tier,
          presentation: mergeSubscriptionTierPresentation(existing?.presentation, tier.presentation, {
            description: tier.description || existing?.description || "",
            label: tier.label || existing?.label || ""
          })
        }, tier.tierLevel - 1));
      });
      const coverageRulesById = new Map();
      (Array.isArray(base.coverageRules) ? base.coverageRules : []).forEach((rule) => {
        const id = token(rule?.coverageRuleId || rule?.id || rule?.code);
        if (id) coverageRulesById.set(id, clone(rule));
      });
      (Array.isArray(normalized.coverageRules) ? normalized.coverageRules : []).forEach((rule) => {
        const id = token(rule?.coverageRuleId || rule?.id || rule?.code);
        if (id) coverageRulesById.set(id, clone(rule));
      });
      byId.set(normalized.subscriptionCatalogId, normalizeSubscriptionDefinition({
        ...base,
        ...normalized,
        presentation: mergeSubscriptionPresentation(base.presentation, normalized.presentation),
        coverageRules: Array.from(coverageRulesById.values()),
        tiers: Array.from(tiersById.values())
      }));
    });
    return Array.from(byId.values());
  }

  function mergeSubscriptionCatalogDefinitions(baseDefinitions = {}, storedDefinitions = {}) {
    const base = normalizeSubscriptionCatalogDefinitions(baseDefinitions);
    const stored = normalizeSubscriptionCatalogDefinitions(storedDefinitions);
    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      subscriptions: mergeSubscriptionDefinitionList(base.subscriptions, stored.subscriptions)
    };
  }

  function readSeedDefinitions() {
    return normalizeSubscriptionCatalogDefinitions(window.APP_DATA?.subscriptionCatalogDefinitions || { subscriptions: [] });
  }

  function readStoredDefinitions() {
    try {
      if (window.localStorage.getItem(STORAGE_SCHEMA_KEY) !== STORAGE_SCHEMA_VERSION) return null;
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return normalizeSubscriptionCatalogDefinitions(JSON.parse(raw));
    } catch (error) {
      console.warn("W&S subscription catalog store could not read localStorage.", error);
      return null;
    }
  }

  function cleanupLegacyCatalogStorage() {
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } catch (error) {
      console.warn("W&S subscription catalog store could not clear legacy storage.", error);
    }
  }

  function writeStoredDefinitions(definitions) {
    try {
      window.localStorage.setItem(STORAGE_SCHEMA_KEY, STORAGE_SCHEMA_VERSION);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeSubscriptionCatalogDefinitions(definitions)));
      return true;
    } catch (error) {
      console.warn("W&S subscription catalog store could not write localStorage.", error);
      return false;
    }
  }

  function emitSubscriptionCatalogUpdate(detail = {}) {
    window.dispatchEvent(new CustomEvent("ws:subscription-catalog-updated", { detail }));
  }

  function setSubscriptionCatalogDefinitions(definitions = {}, options = {}) {
    const seed = options.mergeSeed === false ? { subscriptions: [] } : readSeedDefinitions();
    const normalized = options.replace === true
      ? normalizeSubscriptionCatalogDefinitions(definitions)
      : mergeSubscriptionCatalogDefinitions(seed, definitions);
    subscriptionCatalogDefinitions = normalized;
    if (options.persist !== false) writeStoredDefinitions(normalized);
    emitSubscriptionCatalogUpdate({ definitions: clone(normalized), source: options.source || "runtime" });
    return clone(normalized);
  }

  function updateSubscriptionCatalogDefinitions(definitions = {}) {
    return setSubscriptionCatalogDefinitions(
      mergeSubscriptionCatalogDefinitions(subscriptionCatalogDefinitions, definitions),
      { persist: true, replace: true, source: "system-catalog-editor" }
    );
  }

  app.initSubscriptionCatalogStore = function initSubscriptionCatalogStore() {
    const seed = readSeedDefinitions();
    const stored = readStoredDefinitions();
    subscriptionCatalogDefinitions = stored ? mergeSubscriptionCatalogDefinitions(seed, stored) : seed;
    cleanupLegacyCatalogStorage();
    if (!stored) writeStoredDefinitions(subscriptionCatalogDefinitions);
    return clone(subscriptionCatalogDefinitions);
  };

  app.ensureSubscriptionCatalogLoaded = function ensureSubscriptionCatalogLoaded() {
    if (window.APP_DATA?.subscriptionCatalogDefinitions) return Promise.resolve(clone(subscriptionCatalogDefinitions));
    if (app.loadLazyScript) {
      return app.loadLazyScript("data/subscription-catalog.js?v=13").then(() => {
        subscriptionCatalogDefinitions = mergeSubscriptionCatalogDefinitions(readSeedDefinitions(), subscriptionCatalogDefinitions);
        return clone(subscriptionCatalogDefinitions);
      });
    }
    return Promise.resolve(clone(subscriptionCatalogDefinitions));
  };

  app.SUBSCRIPTION_CATALOG_SCHEMA_VERSION = STORAGE_SCHEMA_VERSION;
  app.normalizeSubscriptionCatalogDefinitions = normalizeSubscriptionCatalogDefinitions;
  app.serializeSubscriptionCatalogDefinitions = serializeSubscriptionCatalogDefinitions;
  app.normalizeSubscriptionDefinition = normalizeSubscriptionDefinition;
  app.serializeSubscriptionDefinition = serializeSubscriptionDefinition;
  app.normalizeSubscriptionTierDefinition = normalizeSubscriptionTier;
  app.serializeSubscriptionTierDefinition = serializeSubscriptionTier;
  app.normalizeSubscriptionPresentation = normalizeSubscriptionPresentation;
  app.normalizeSubscriptionTierPresentation = normalizeSubscriptionTierPresentation;
  app.normalizeSubscriptionLogoPath = normalizeSubscriptionLogoPath;
  app.normalizeSubscriptionMarketInput = normalizeSubscriptionMarketInput;
  app.inferSubscriptionMarket = inferSubscriptionMarket;
  app.getSubscriptionCatalogCategories = getSubscriptionCatalogCategories;
  app.getSubscriptionCatalogTierPrices = function getSubscriptionCatalogTierPrices(definition = {}) {
    return normalizeSubscriptionDefinition(definition).tiers.filter((tier) => tier.active).map((tier) => tier.amount).filter((value) => value > 0);
  };
  app.getSubscriptionCatalogLowestTierAmount = function getSubscriptionCatalogLowestTierAmount(definition = {}) {
    const prices = app.getSubscriptionCatalogTierPrices(definition);
    return prices.length ? Math.min(...prices) : 0;
  };
  app.getSubscriptionCatalogWeeklyRangeLabel = function getSubscriptionCatalogWeeklyRangeLabel(definition = {}) {
    const prices = app.getSubscriptionCatalogTierPrices(definition);
    if (!prices.length) return "NO PRICE";
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `WEEKLY COST: ${formatCreditLabel(min)}` : `WEEKLY RANGE: ${formatCreditLabel(min)} - ${formatCreditLabel(max)}`;
  };
  app.mergeSubscriptionDefinitionList = mergeSubscriptionDefinitionList;
  app.mergeSubscriptionCatalogDefinitions = mergeSubscriptionCatalogDefinitions;
  app.getSubscriptionCatalogDefinitions = () => clone(subscriptionCatalogDefinitions);
  app.setSubscriptionCatalogDefinitions = setSubscriptionCatalogDefinitions;
  app.updateSubscriptionCatalogDefinitions = updateSubscriptionCatalogDefinitions;
  app.getSubscriptionCatalog = function getSubscriptionCatalog(options = {}) {
    const includeArchived = options.includeArchived === true;
    const category = options.category ? token(options.category) : null;
    let definitions = normalizeSubscriptionCatalogDefinitions(subscriptionCatalogDefinitions).subscriptions;
    if (!includeArchived) definitions = definitions.filter((definition) => definition.active);
    if (category) definitions = definitions.filter((definition) => definition.category === category);
    return clone(definitions);
  };
  app.getSubscriptionCatalogEntry = function getSubscriptionCatalogEntry(subscriptionCatalogId) {
    const id = String(subscriptionCatalogId || "").trim();
    const definition = app.getSubscriptionCatalog({ includeArchived: true })
      .find((item) => item.subscriptionCatalogId === id);
    return definition ? clone(definition) : null;
  };
  app.getSubscriptionCatalogItemById = app.getSubscriptionCatalogEntry;
  app.getSubscriptionTierById = function getSubscriptionTierById(subscriptionCatalogId, tierId) {
    const definition = app.getSubscriptionCatalogEntry(subscriptionCatalogId);
    const tier = (definition?.tiers || []).find((item) => item.tierId === String(tierId || ""));
    return tier ? clone(tier) : null;
  };

  app.initSubscriptionCatalogStore();
})();
