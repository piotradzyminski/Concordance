window.WS_APP = window.WS_APP || {};

(function initSubscriptionBridgeReadinessModule() {
  const app = window.WS_APP;
  const READINESS_VERSION = "subscriptions_bridge_readiness_3_1x";
  const REQUIRED_PUBLIC_APIS = [
    "getSubscriptionContract",
    "getCitizenSubscriptionContracts",
    "getSubscriptionCatalogEntry",
    "getSubscriptionContractsForTarget",
    "getItemInstanceSubscriptionContracts",
    "getEligibleSubscriptionTargets",
    "validateSubscriptionTarget",
    "resolveSubscriptionEntitlement",
    "createSubscriptionContract",
    "changeSubscriptionTier",
    "changeSubscriptionCoverageTarget",
    "setSubscriptionBillingStatus",
    "suspendSubscriptionContract",
    "resumeSubscriptionContract",
    "cancelSubscriptionContract",
    "processSubscriptionBilling",
    "processCitizenSubscriptionBilling",
    "processWeeklySubscriptionSettlement",
    "removeSubscriptionContractRecord",
    "clearCancelledSubscriptionContracts"
  ];
  const REQUIRED_EVENT_NAMES = [
    "ws:subscription-created",
    "ws:subscription-updated",
    "ws:subscription-entitlement-changed",
    "ws:subscription-billing-failed",
    "ws:subscription-cancelled"
  ];
  const FORBIDDEN_DIRECT_MUTATORS = [
    "addCitizenSubscription",
    "updateCitizenSubscription",
    "cancelCitizenSubscription",
    "deleteCitizenSubscription",
    "clearCancelledCitizenSubscriptions",
    "payCitizenSubscriptions",
    "processWeeklySubscriptionSettlement"
  ];
  const TARGET_RUNTIME_ERROR_CODES = new Set([
    "SUBSCRIPTION_ITEM_TARGET_NOT_FOUND",
    "SUBSCRIPTION_ITEM_TARGET_OWNER_MISMATCH",
    "SUBSCRIPTION_ITEM_TARGET_LIFECYCLE_BLOCKED",
    "SUBSCRIPTION_ITEM_TARGET_DESTROYED",
    "SUBSCRIPTION_ITEM_TARGET_DEFINITION_INELIGIBLE",
    "SUBSCRIPTION_ITEM_TARGET_CATEGORY_INELIGIBLE",
    "SUBSCRIPTION_ITEM_TARGET_SUBTYPE_INELIGIBLE",
    "SUBSCRIPTION_ITEM_TARGET_TAG_INELIGIBLE",
    "SUBSCRIPTION_ITEM_TARGET_TAGS_REQUIRED",
    "SUBSCRIPTION_ITEM_TARGET_MANUFACTURER_INELIGIBLE",
    "SUBSCRIPTION_ITEM_TARGET_PROVIDER_INELIGIBLE"
  ]);

  function clone(value) {
    if (value === undefined) return undefined;
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function token(value = "", fallback = "") {
    const normalized = String(value || fallback)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return normalized || fallback;
  }

  function text(value = "") {
    return String(value || "").trim();
  }

  function makeCheck(id, ok, severity, detail = {}) {
    return {
      id: token(id, "SUBSCRIPTION_READINESS_CHECK"),
      ok: ok === true,
      severity: token(severity, ok ? "INFO" : "ERROR"),
      detail: clone(detail)
    };
  }

  function getCatalogDefinitions() {
    const fromStore = app.getSubscriptionCatalog?.({ includeArchived: true });
    if (Array.isArray(fromStore)) return fromStore;
    if (Array.isArray(window.APP_DATA?.subscriptionCatalog?.subscriptions)) return window.APP_DATA.subscriptionCatalog.subscriptions;
    if (Array.isArray(window.APP_DATA?.subscriptionCatalogDefinitions?.subscriptions)) return window.APP_DATA.subscriptionCatalogDefinitions.subscriptions;
    return [];
  }

  function getFixtures() {
    return Array.isArray(window.APP_DATA?.subscriptionBridgeFixtureFlows)
      ? window.APP_DATA.subscriptionBridgeFixtureFlows
      : [];
  }

  function getTierId(tier = {}) {
    return text(tier.tierId || tier.id);
  }

  function getCatalogId(definition = {}) {
    return text(definition.subscriptionCatalogId || definition.id);
  }

  function collectEntitlementCodes(definition = {}) {
    const codes = new Set((Array.isArray(definition.entitlementCodes) ? definition.entitlementCodes : []).map(token).filter(Boolean));
    (Array.isArray(definition.tiers) ? definition.tiers : []).forEach((tier) => {
      (Array.isArray(tier.entitlementCodes) ? tier.entitlementCodes : []).map(token).filter(Boolean).forEach((code) => codes.add(code));
    });
    return codes;
  }

  function validateSubscriptionBridgeCatalog() {
    const definitions = getCatalogDefinitions();
    const errors = [];
    const warnings = [];
    const catalogIds = new Set();
    const providerIds = new Set();
    let tierCount = 0;
    let assetCatalogCount = 0;
    let entitlementCodeCount = 0;

    definitions.forEach((definition, index) => {
      const subscriptionCatalogId = getCatalogId(definition);
      const providerId = text(definition.providerId);
      if (!subscriptionCatalogId) errors.push({ code: "SUBSCRIPTION_CATALOG_ID_REQUIRED", index });
      else if (catalogIds.has(subscriptionCatalogId)) errors.push({ code: "SUBSCRIPTION_CATALOG_ID_DUPLICATE", subscriptionCatalogId });
      else catalogIds.add(subscriptionCatalogId);
      if (!providerId) errors.push({ code: "SUBSCRIPTION_PROVIDER_ID_REQUIRED", subscriptionCatalogId });
      else providerIds.add(providerId);
      if (!text(definition.productCode)) errors.push({ code: "SUBSCRIPTION_PRODUCT_CODE_REQUIRED", subscriptionCatalogId });
      if (!token(definition.domain)) errors.push({ code: "SUBSCRIPTION_DOMAIN_REQUIRED", subscriptionCatalogId });
      if (!token(definition.billingCycle)) errors.push({ code: "SUBSCRIPTION_BILLING_CYCLE_REQUIRED", subscriptionCatalogId });
      if (!token(definition.currency)) errors.push({ code: "SUBSCRIPTION_CURRENCY_REQUIRED", subscriptionCatalogId });
      if (!Number.isInteger(Number(definition.revision || 0)) || Number(definition.revision || 0) < 1) {
        errors.push({ code: "SUBSCRIPTION_CATALOG_REVISION_INVALID", subscriptionCatalogId });
      }

      const policy = app.getSubscriptionTargetPolicy?.(definition) || definition.targetPolicy || {};
      const targetTypes = Array.isArray(policy.allowedTargetTypes) ? policy.allowedTargetTypes.map(token).filter(Boolean) : [];
      if (!targetTypes.length) errors.push({ code: "SUBSCRIPTION_TARGET_TYPES_REQUIRED", subscriptionCatalogId });
      if (!targetTypes.includes(token(policy.defaultTargetType || targetTypes[0]))) {
        errors.push({ code: "SUBSCRIPTION_DEFAULT_TARGET_INVALID", subscriptionCatalogId, defaultTargetType: policy.defaultTargetType });
      }
      if (targetTypes.includes("ITEM_INSTANCE")) {
        assetCatalogCount += 1;
        if (policy.itemEligibility?.requireOwnedByCitizen !== true) {
          errors.push({ code: "SUBSCRIPTION_ITEM_OWNER_VALIDATION_REQUIRED", subscriptionCatalogId });
        }
        if (!Array.isArray(policy.itemEligibility?.blockedLifecycleStates)) {
          errors.push({ code: "SUBSCRIPTION_ITEM_LIFECYCLE_POLICY_REQUIRED", subscriptionCatalogId });
        }
      }

      const tierIds = new Set();
      const tiers = Array.isArray(definition.tiers) ? definition.tiers : [];
      if (!tiers.length) errors.push({ code: "SUBSCRIPTION_TIERS_REQUIRED", subscriptionCatalogId });
      tiers.forEach((tier, tierIndex) => {
        tierCount += 1;
        const tierId = getTierId(tier);
        if (!tierId) errors.push({ code: "SUBSCRIPTION_TIER_ID_REQUIRED", subscriptionCatalogId, tierIndex });
        else if (tierIds.has(tierId)) errors.push({ code: "SUBSCRIPTION_TIER_ID_DUPLICATE", subscriptionCatalogId, tierId });
        else tierIds.add(tierId);
        if (!Number.isFinite(Number(tier.amount)) || Number(tier.amount) < 0) {
          errors.push({ code: "SUBSCRIPTION_TIER_AMOUNT_INVALID", subscriptionCatalogId, tierId });
        }
        if (!token(tier.billingCycle || definition.billingCycle)) {
          errors.push({ code: "SUBSCRIPTION_TIER_BILLING_CYCLE_REQUIRED", subscriptionCatalogId, tierId });
        }
      });
      const entitlementCodes = collectEntitlementCodes(definition);
      entitlementCodeCount += entitlementCodes.size;
      if (!entitlementCodes.size) warnings.push({ code: "SUBSCRIPTION_ENTITLEMENT_CODES_MISSING", subscriptionCatalogId });
    });

    return {
      ok: errors.length === 0,
      counts: {
        catalogs: definitions.length,
        tiers: tierCount,
        providers: providerIds.size,
        assetCatalogs: assetCatalogCount,
        entitlementCodes: entitlementCodeCount
      },
      errors,
      warnings
    };
  }

  function validateSubscriptionBridgeContracts() {
    const citizens = typeof app.getCitizens === "function" ? app.getCitizens() : [];
    const errors = [];
    const warnings = [];
    const contractIds = new Set();
    const openContractKeys = new Set();
    let contractCount = 0;
    let citizenTargetCount = 0;
    let itemTargetCount = 0;

    (Array.isArray(citizens) ? citizens : []).forEach((citizen) => {
      const citizenId = text(citizen?.id);
      if (Object.prototype.hasOwnProperty.call(citizen || {}, "subscription") || Object.prototype.hasOwnProperty.call(citizen || {}, "trauma")) {
        errors.push({ code: "SUBSCRIPTION_LEGACY_CITIZEN_FIELD_PRESENT", citizenId });
      }
      (Array.isArray(citizen?.subscriptions) ? citizen.subscriptions : []).forEach((source, index) => {
        contractCount += 1;
        const contract = typeof app.serializeSubscriptionContract === "function"
          ? app.serializeSubscriptionContract(source, index, { citizenId })
          : clone(source);
        const contractId = text(contract?.subscriptionContractId);
        const catalogId = text(contract?.subscriptionCatalogId);
        const targetType = token(contract?.coverageTarget?.type || "CITIZEN", "CITIZEN");
        const targetId = text(contract?.coverageTarget?.id);
        if (!contractId) errors.push({ code: "SUBSCRIPTION_CONTRACT_ID_REQUIRED", citizenId, index });
        else if (contractIds.has(contractId)) errors.push({ code: "SUBSCRIPTION_CONTRACT_ID_DUPLICATE", subscriptionContractId: contractId });
        else contractIds.add(contractId);
        if (!catalogId) errors.push({ code: "SUBSCRIPTION_CONTRACT_CATALOG_ID_REQUIRED", subscriptionContractId: contractId });
        if (!text(contract?.providerId)) errors.push({ code: "SUBSCRIPTION_CONTRACT_PROVIDER_ID_REQUIRED", subscriptionContractId: contractId });
        if (!text(contract?.tierId)) errors.push({ code: "SUBSCRIPTION_CONTRACT_TIER_ID_REQUIRED", subscriptionContractId: contractId });
        if (!citizenId || text(contract?.citizenId) !== citizenId) errors.push({ code: "SUBSCRIPTION_CONTRACT_CITIZEN_MISMATCH", subscriptionContractId: contractId, citizenId });
        if (!targetId) errors.push({ code: "SUBSCRIPTION_CONTRACT_TARGET_ID_REQUIRED", subscriptionContractId: contractId });
        if (!Number.isInteger(Number(contract?.revision || 0)) || Number(contract?.revision || 0) < 1) {
          errors.push({ code: "SUBSCRIPTION_CONTRACT_REVISION_INVALID", subscriptionContractId: contractId });
        }
        if (targetType === "ITEM_INSTANCE") itemTargetCount += 1;
        else citizenTargetCount += 1;

        const validation = app.validateSubscriptionContract?.(contract) || { valid: true, errors: [], warnings: [] };
        (validation.errors || []).forEach((code) => {
          if (TARGET_RUNTIME_ERROR_CODES.has(code)) warnings.push({ code, subscriptionContractId: contractId, runtimeTargetState: true });
          else errors.push({ code, subscriptionContractId: contractId });
        });
        (validation.warnings || []).forEach((code) => warnings.push({ code, subscriptionContractId: contractId }));

        if (token(contract?.contractStatus || "ACTIVE") !== "CANCELLED") {
          const key = [catalogId, citizenId, targetType, targetId].join("::");
          if (openContractKeys.has(key)) errors.push({ code: "SUBSCRIPTION_OPEN_TARGET_DUPLICATE", subscriptionContractId: contractId, key });
          else openContractKeys.add(key);
        }
      });
    });

    return {
      ok: errors.length === 0,
      counts: { citizens: citizens.length, contracts: contractCount, citizenTargets: citizenTargetCount, itemTargets: itemTargetCount },
      errors,
      warnings
    };
  }

  function validateSubscriptionBridgeFixtures() {
    const fixtures = getFixtures();
    const errors = [];
    const warnings = [];
    const fixtureIds = new Set();
    const operations = new Set();
    const coveredTargetTypes = new Set();

    fixtures.forEach((fixture, index) => {
      const fixtureId = text(fixture.fixtureId);
      const operation = token(fixture.operation);
      const catalogId = text(fixture.subscriptionCatalogId);
      const tierId = text(fixture.tierId);
      const catalog = app.getSubscriptionCatalogEntry?.(catalogId) || null;
      const tier = catalog ? (catalog.tiers || []).find((item) => getTierId(item) === tierId) : null;
      if (!fixtureId) errors.push({ code: "SUBSCRIPTION_FIXTURE_ID_REQUIRED", index });
      else if (fixtureIds.has(fixtureId)) errors.push({ code: "SUBSCRIPTION_FIXTURE_ID_DUPLICATE", fixtureId });
      else fixtureIds.add(fixtureId);
      if (!operation) errors.push({ code: "SUBSCRIPTION_FIXTURE_OPERATION_REQUIRED", fixtureId });
      else operations.add(operation);
      if (!catalog) errors.push({ code: "SUBSCRIPTION_FIXTURE_CATALOG_NOT_FOUND", fixtureId, subscriptionCatalogId: catalogId });
      if (!tier) errors.push({ code: "SUBSCRIPTION_FIXTURE_TIER_NOT_FOUND", fixtureId, subscriptionCatalogId: catalogId, tierId });

      const targets = Array.isArray(fixture.coverageTargets)
        ? fixture.coverageTargets
        : fixture.coverageTarget
          ? [fixture.coverageTarget]
          : [];
      if (!targets.length) warnings.push({ code: "SUBSCRIPTION_FIXTURE_TARGET_MISSING", fixtureId });
      const policy = catalog ? (app.getSubscriptionTargetPolicy?.(catalog) || catalog.targetPolicy || {}) : {};
      const allowedTargetTypes = Array.isArray(policy.allowedTargetTypes) ? policy.allowedTargetTypes.map(token) : [];
      targets.forEach((target) => {
        const targetType = token(target?.type || "CITIZEN", "CITIZEN");
        coveredTargetTypes.add(targetType);
        if (catalog && !allowedTargetTypes.includes(targetType)) {
          errors.push({ code: "SUBSCRIPTION_FIXTURE_TARGET_NOT_ALLOWED", fixtureId, targetType });
        }
        if (!text(target?.id)) errors.push({ code: "SUBSCRIPTION_FIXTURE_TARGET_ID_REQUIRED", fixtureId, targetType });
      });

      const entitlementCode = token(fixture.entitlementCode);
      if (entitlementCode && catalog && !collectEntitlementCodes(catalog).has(entitlementCode)) {
        errors.push({ code: "SUBSCRIPTION_FIXTURE_ENTITLEMENT_CODE_NOT_FOUND", fixtureId, entitlementCode });
      }
      if (!fixture.expected || typeof fixture.expected !== "object") {
        errors.push({ code: "SUBSCRIPTION_FIXTURE_EXPECTED_REQUIRED", fixtureId });
      }
    });

    ["CITIZEN", "ITEM_INSTANCE"].forEach((targetType) => {
      if (!coveredTargetTypes.has(targetType)) warnings.push({ code: "SUBSCRIPTION_FIXTURE_TARGET_TYPE_UNCOVERED", targetType });
    });

    return {
      ok: errors.length === 0,
      counts: { fixtures: fixtures.length, operations: operations.size, targetTypes: coveredTargetTypes.size },
      errors,
      warnings
    };
  }

  function validateSubscriptionConsumerBoundary() {
    const errors = [];
    const warnings = [];
    const exposed = FORBIDDEN_DIRECT_MUTATORS.filter((name) => typeof app[name] === "function");
    exposed.forEach((name) => errors.push({ code: "SUBSCRIPTION_DIRECT_MUTATOR_EXPOSED", api: name }));
    const descriptor = Object.getOwnPropertyDescriptor(app, "__subscriptionStoreCommands");
    if (!descriptor?.value || typeof descriptor.value !== "object") errors.push({ code: "SUBSCRIPTION_INTERNAL_STORE_BOUNDARY_MISSING" });
    if (descriptor?.enumerable === true) errors.push({ code: "SUBSCRIPTION_INTERNAL_STORE_BOUNDARY_ENUMERABLE" });
    if (descriptor?.writable === true || descriptor?.configurable === true) errors.push({ code: "SUBSCRIPTION_INTERNAL_STORE_BOUNDARY_MUTABLE" });
    if (descriptor?.value && !Object.isFrozen(descriptor.value)) errors.push({ code: "SUBSCRIPTION_INTERNAL_STORE_COMMANDS_NOT_FROZEN" });
    if (text(app.SUBSCRIPTION_MUTATION_BOUNDARY_VERSION) !== "subscriptions_command_boundary_3_1x") {
      errors.push({ code: "SUBSCRIPTION_MUTATION_BOUNDARY_VERSION_MISMATCH", version: app.SUBSCRIPTION_MUTATION_BOUNDARY_VERSION || "" });
    }
    if (typeof app.updateCitizen !== "function") errors.push({ code: "CITIZEN_UPDATE_API_MISSING" });
    if (app.lastSubscriptionMutationBoundaryError?.code && app.lastSubscriptionMutationBoundaryError.code !== "SUBSCRIPTION_COMMAND_API_REQUIRED") {
      warnings.push({ code: "SUBSCRIPTION_MUTATION_BOUNDARY_LAST_ERROR_UNKNOWN", lastError: clone(app.lastSubscriptionMutationBoundaryError) });
    }
    return {
      ok: errors.length === 0,
      counts: { forbiddenMutators: FORBIDDEN_DIRECT_MUTATORS.length, exposedMutators: exposed.length },
      errors,
      warnings
    };
  }

  function validateApiList(names = []) {
    const api = app.SubscriptionAPI || {};
    const missing = names.filter((name) => typeof api[name] !== "function");
    return { ok: missing.length === 0, missing };
  }

  function validateEventContract() {
    const errors = [];
    const warnings = [];
    const api = app.SubscriptionAPI || {};
    if (text(api.eventContractVersion) !== "subscriptions_events_2_3x") {
      errors.push({ code: "SUBSCRIPTION_EVENT_CONTRACT_VERSION_MISMATCH", version: api.eventContractVersion || "" });
    }
    if (typeof app.emitSubscriptionNotification !== "function") errors.push({ code: "SUBSCRIPTION_NOTIFICATION_PRODUCER_MISSING" });
    if (app.__subscriptionNotificationProducerInstalled !== true) warnings.push({ code: "SUBSCRIPTION_NOTIFICATION_LISTENERS_NOT_CONFIRMED" });
    return { ok: errors.length === 0, counts: { events: REQUIRED_EVENT_NAMES.length }, errors, warnings };
  }

  function runSubscriptionBridgeReadinessAudit() {
    const catalog = validateSubscriptionBridgeCatalog();
    const contracts = validateSubscriptionBridgeContracts();
    const fixtures = validateSubscriptionBridgeFixtures();
    const boundary = validateSubscriptionConsumerBoundary();
    const events = validateEventContract();
    const apiValidation = validateApiList(REQUIRED_PUBLIC_APIS);
    const blockers = [];
    const warnings = [];
    [catalog, contracts, fixtures, boundary, events].forEach((validation) => {
      blockers.push(...validation.errors);
      warnings.push(...validation.warnings);
    });
    apiValidation.missing.forEach((apiName) => blockers.push({ code: "SUBSCRIPTION_PUBLIC_API_MISSING", api: apiName }));

    const itemLookup = typeof app.getItemInstanceById === "function";
    const itemRevision = typeof app.getItemInstanceStoreRevision === "function" || Number.isFinite(Number(app.ITEM_INSTANCE_STORE_REVISION));
    const notificationApi = typeof window.TerminalNotifications?.emit === "function";
    if (!itemLookup) blockers.push({ code: "ITEM_INSTANCE_LOOKUP_API_MISSING" });
    if (!itemRevision) warnings.push({ code: "ITEM_INSTANCE_REVISION_API_PENDING" });
    if (!notificationApi) blockers.push({ code: "NOTIFICATION_EMIT_API_MISSING" });

    const externalBlockers = [];
    const sharedCoverageAvailable = typeof app.resolveCoverage === "function"
      && String(app.COVERAGE_FOUNDATION_VERSION || "").trim() === "world_bridge_coverage_foundation_1_0x"
      && String(app.COVERAGE_RESOLVER_API_VERSION || "").trim() === "shared_coverage_resolver_1_0x";
    if (!sharedCoverageAvailable) externalBlockers.push({ code: "SHARED_COVERAGE_RESOLVER_PENDING" });
    if (typeof app.createBillingIntent !== "function" || typeof app.getBillingIntent !== "function") {
      externalBlockers.push({ code: "BILLING_INTENT_API_PENDING" });
    }

    const subscriptionReady = blockers.length === 0;
    const worldBridgeReady = subscriptionReady && externalBlockers.length === 0;
    const report = {
      schemaVersion: READINESS_VERSION,
      subscriptionReady,
      worldBridgeReady,
      checks: [
        makeCheck("SUBSCRIPTION_CATALOG_VALID", catalog.ok, "ERROR", catalog.counts),
        makeCheck("SUBSCRIPTION_CONTRACTS_VALID", contracts.ok, "ERROR", contracts.counts),
        makeCheck("SUBSCRIPTION_FIXTURES_VALID", fixtures.ok, "ERROR", fixtures.counts),
        makeCheck("SUBSCRIPTION_COMMAND_BOUNDARY_VALID", boundary.ok, "ERROR", boundary.counts),
        makeCheck("SUBSCRIPTION_PUBLIC_API_COMPLETE", apiValidation.ok, "ERROR", { missing: apiValidation.missing }),
        makeCheck("SUBSCRIPTION_EVENTS_VALID", events.ok, "ERROR", events.counts),
        makeCheck("ITEM_INSTANCE_LOOKUP_AVAILABLE", itemLookup, "ERROR"),
        makeCheck("ITEM_INSTANCE_REVISION_AVAILABLE", itemRevision, "WARNING"),
        makeCheck("NOTIFICATION_API_AVAILABLE", notificationApi, "ERROR"),
        makeCheck("SHARED_COVERAGE_AVAILABLE", sharedCoverageAvailable, "WARNING", {
          foundationVersion: app.COVERAGE_FOUNDATION_VERSION || "",
          version: app.COVERAGE_RESOLVER_API_VERSION || ""
        }),
        makeCheck("BILLING_INTENT_API_AVAILABLE", typeof app.createBillingIntent === "function" && typeof app.getBillingIntent === "function", "WARNING")
      ],
      blockers,
      warnings,
      externalBlockers,
      counts: {
        ...catalog.counts,
        contracts: contracts.counts.contracts,
        citizenTargets: contracts.counts.citizenTargets,
        itemTargets: contracts.counts.itemTargets,
        fixtures: fixtures.counts.fixtures,
        requiredApis: REQUIRED_PUBLIC_APIS.length
      },
      generatedAt: new Date().toISOString()
    };
    app.SUBSCRIPTION_BRIDGE_READINESS = clone(report);
    return clone(report);
  }

  app.SUBSCRIPTION_BRIDGE_READINESS_SCHEMA_VERSION = READINESS_VERSION;
  app.getSubscriptionBridgeFixtureFlows = () => clone(getFixtures());
  app.validateSubscriptionBridgeCatalog = validateSubscriptionBridgeCatalog;
  app.validateSubscriptionBridgeContracts = validateSubscriptionBridgeContracts;
  app.validateSubscriptionBridgeFixtures = validateSubscriptionBridgeFixtures;
  app.validateSubscriptionConsumerBoundary = validateSubscriptionConsumerBoundary;
  app.runSubscriptionBridgeReadinessAudit = runSubscriptionBridgeReadinessAudit;
  app.SUBSCRIPTION_BRIDGE_READINESS = runSubscriptionBridgeReadinessAudit();
})();
