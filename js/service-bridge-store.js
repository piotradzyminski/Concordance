window.WS_APP = window.WS_APP || {};

(function initServiceBridgeStoreModule() {
  const app = window.WS_APP;
  const STORAGE_KEY = "ws_service_bridge_store_v1";
  const STORAGE_SCHEMA_KEY = "ws_service_bridge_schema";
  const STORAGE_SCHEMA_VERSION = "service_bridge_foundation_2_0x";
  const STORE_SCHEMA_VERSION = 1;
  const IDEMPOTENCY_LIMIT = 192;
  const TERMINAL_ORDER_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED", "EXPIRED", "REJECTED"]);
  const ORDER_STATUSES = new Set([
    "DRAFT",
    "QUOTED",
    "PENDING_CONFIRMATION",
    "AUTHORIZED",
    "SCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "EXPIRED",
    "REJECTED"
  ]);
  const PAYMENT_STATUSES = new Set([
    "NOT_REQUIRED",
    "PENDING",
    "AUTHORIZED",
    "CAPTURED",
    "PARTIALLY_CAPTURED",
    "FAILED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
    "VOIDED",
    "PAYMENT_RECOVERY_REQUIRED",
    "WAIVED",
    "COVERED"
  ]);
  const BILLING_PAYMENT_SOURCES = new Set([
    "CREDITS",
    "DEBT_ACCOUNT",
    "NOT_REQUIRED",
    "COVERED",
    "WAIVED"
  ]);
  const BILLING_SETTLED_PAYMENT_STATUSES = new Set([
    "NOT_REQUIRED",
    "CAPTURED",
    "WAIVED",
    "COVERED"
  ]);
  const BILLING_AUTHORIZED_PAYMENT_STATUSES = new Set([
    "NOT_REQUIRED",
    "AUTHORIZED",
    "CAPTURED",
    "WAIVED",
    "COVERED"
  ]);
  const AVAILABILITY_STATUSES = new Set(["AVAILABLE", "LIMITED", "RESTRICTED", "OUT_OF_STOCK", "UNAVAILABLE", "BLOCKED"]);
  const RESULT_OUTCOMES = new Set(["SUCCESS", "PARTIAL_SUCCESS", "FAILED", "CANCELLED"]);
  const RETURN_LOCATION_TYPES = new Set(["HOUSING_STORAGE", "CONTAINER_GRID", "CONTAINER_SLOT", "VENDOR", "SERVICE"]);
  const ENTITLEMENT_REQUIREMENTS = new Set(["REQUIRED", "OPTIONAL", "COVERAGE_ONLY"]);
  const ENTITLEMENT_TARGET_STRATEGIES = new Set(["CITIZEN_ONLY", "ITEM_INSTANCE_ONLY", "SUBJECT_OR_CITIZEN"]);
  const TRANSITIONS = {
    DRAFT: new Set(["QUOTED", "PENDING_CONFIRMATION", "CANCELLED", "EXPIRED", "REJECTED"]),
    QUOTED: new Set(["PENDING_CONFIRMATION", "AUTHORIZED", "CANCELLED", "EXPIRED", "REJECTED"]),
    PENDING_CONFIRMATION: new Set(["AUTHORIZED", "CANCELLED", "EXPIRED", "REJECTED"]),
    AUTHORIZED: new Set(["SCHEDULED", "IN_PROGRESS", "CANCELLED", "FAILED"]),
    SCHEDULED: new Set(["IN_PROGRESS", "CANCELLED", "FAILED"]),
    IN_PROGRESS: new Set(["COMPLETED", "FAILED", "CANCELLED"]),
    COMPLETED: new Set(),
    FAILED: new Set(),
    CANCELLED: new Set(),
    EXPIRED: new Set(),
    REJECTED: new Set()
  };

  let definitionIndex = new Map();
  let providerIndex = new Map();
  let providerAliasIndex = new Map();
  let offersById = new Map();
  let ordersById = new Map();
  let offerIdsByCitizen = new Map();
  let orderIdsByCitizen = new Map();
  let orderIdsByProvider = new Map();
  let orderIdsByStatus = new Map();
  let idempotencyByKey = new Map();
  let storeRevision = 0;
  let persistenceTimer = 0;

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

  function slug(value = "") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "entry";
  }

  function clampInteger(value, min = 0, max = Number.MAX_SAFE_INTEGER, fallback = min) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function uniqueStrings(value = [], normalizer = normalizeId) {
    const source = Array.isArray(value) ? value : [];
    return [...new Set(source.map((item) => normalizer(item)).filter(Boolean))];
  }

  function getWorldTime() {
    return normalizeId(app.getCampaignDateIso?.() || app.CAMPAIGN_DATE_ISO || new Date().toISOString());
  }

  function isPastWorldTime(value = "") {
    const target = Date.parse(normalizeId(value));
    const current = Date.parse(getWorldTime());
    return Number.isFinite(target) && Number.isFinite(current) && target < current;
  }

  function makeRuntimeId(prefix = "service") {
    return `${slug(prefix)}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function getServiceBridgeConfig() {
    const source = window.APP_DATA?.serviceBridgeConfig;
    return source && typeof source === "object" && !Array.isArray(source) ? source : {};
  }

  function normalizeReturnLocation(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const type = normalizeToken(source.type);
    if (!RETURN_LOCATION_TYPES.has(type)) return null;
    const normalized = { type };
    if (type === "HOUSING_STORAGE") {
      normalized.housingStorageId = normalizeId(source.housingStorageId || source.storageUnitId);
      if (!normalized.housingStorageId) return null;
    }
    if (type === "CONTAINER_GRID") {
      normalized.containerInstanceId = normalizeId(source.containerInstanceId);
      if (!normalized.containerInstanceId) return null;
      if (Number.isFinite(Number(source.gridX))) normalized.gridX = Number(source.gridX);
      if (Number.isFinite(Number(source.gridY))) normalized.gridY = Number(source.gridY);
      normalized.rotation = clampInteger(source.rotation, 0, 270, 0);
    }
    if (type === "CONTAINER_SLOT") {
      normalized.containerInstanceId = normalizeId(source.containerInstanceId);
      normalized.slotId = normalizeId(source.slotId);
      if (!normalized.containerInstanceId || !normalized.slotId) return null;
    }
    if (type === "VENDOR") normalized.providerId = normalizeId(source.providerId);
    if (type === "SERVICE") normalized.serviceOrderId = normalizeId(source.serviceOrderId);
    return normalized;
  }

  function normalizeSubjectRefs(value = {}, citizenId = "") {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      instanceIds: uniqueStrings(source.instanceIds),
      targetCharacterId: normalizeId(source.targetCharacterId || citizenId),
      targetBodySlots: uniqueStrings(source.targetBodySlots, normalizeToken),
      returnLocation: normalizeReturnLocation(source.returnLocation)
    };
  }

  function normalizeCoverageSource(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const sourceId = normalizeId(source.sourceId || source.subscriptionContractId || source.insuranceContractId || source.id);
    if (!sourceId) return null;
    return {
      sourceType: normalizeToken(source.sourceType || "SUBSCRIPTION", "SUBSCRIPTION"),
      sourceId,
      subscriptionContractId: normalizeId(source.subscriptionContractId || sourceId),
      subscriptionCatalogId: normalizeId(source.subscriptionCatalogId),
      tierId: normalizeId(source.tierId),
      providerId: normalizeId(source.providerId),
      coverageRuleId: normalizeToken(source.coverageRuleId),
      coverageCode: normalizeToken(source.coverageCode),
      amount: clampInteger(source.amount, 0, 999999999, 0),
      requestedAmount: clampInteger(source.requestedAmount ?? source.amount, 0, 999999999, 0),
      coverageTarget: source.coverageTarget && typeof source.coverageTarget === "object" && !Array.isArray(source.coverageTarget)
        ? {
            type: normalizeToken(source.coverageTarget.type || "CITIZEN", "CITIZEN"),
            id: normalizeId(source.coverageTarget.id)
          }
        : null,
      status: normalizeToken(source.status || "ACTIVE", "ACTIVE"),
      revision: clampInteger(source.revision || 1, 1, Number.MAX_SAFE_INTEGER, 1),
      metadata: source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
        ? clone(source.metadata)
        : {}
    };
  }

  function normalizeQuote(value = {}, fallback = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const grossPrice = clampInteger(source.grossPrice ?? fallback.grossPrice, 0, 999999999, 0);
    const coveredAmount = Math.min(grossPrice, clampInteger(source.coveredAmount ?? fallback.coveredAmount, 0, 999999999, 0));
    const coverageSources = (Array.isArray(source.coverageSources)
      ? source.coverageSources
      : Array.isArray(fallback.coverageSources)
        ? fallback.coverageSources
        : [])
      .map(normalizeCoverageSource)
      .filter(Boolean);
    return {
      grossPrice,
      coveredAmount,
      payableAmount: clampInteger(source.payableAmount ?? fallback.payableAmount ?? (grossPrice - coveredAmount), 0, 999999999, grossPrice - coveredAmount),
      currency: normalizeToken(source.currency || fallback.currency || getServiceBridgeConfig().currency || "CREDIT", "CREDIT"),
      estimatedDurationMinutes: clampInteger(source.estimatedDurationMinutes ?? fallback.estimatedDurationMinutes, 0, 525600, 0),
      pricingModelId: normalizeId(source.pricingModelId || fallback.pricingModelId),
      durationModelId: normalizeId(source.durationModelId || fallback.durationModelId),
      coverageSources,
      coverageRuleIds: uniqueStrings(source.coverageRuleIds || fallback.coverageRuleIds, normalizeToken),
      coverageBlockers: uniqueStrings(source.coverageBlockers || fallback.coverageBlockers, normalizeToken),
      coverageWarnings: uniqueStrings(source.coverageWarnings || fallback.coverageWarnings, normalizeToken),
      coverageEvaluatedAt: normalizeId(source.coverageEvaluatedAt || fallback.coverageEvaluatedAt),
      coverageSignature: normalizeId(source.coverageSignature || fallback.coverageSignature),
      coverageResolverVersion: normalizeId(source.coverageResolverVersion || fallback.coverageResolverVersion),
      revision: clampInteger(source.revision ?? fallback.revision ?? 1, 1, Number.MAX_SAFE_INTEGER, 1)
    };
  }

  function normalizeBillingRefs(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      billingIntentId: normalizeId(source.billingIntentId),
      billingTransactionId: normalizeId(source.billingTransactionId),
      refundTransactionId: normalizeId(source.refundTransactionId),
      intentIdempotencyKey: normalizeId(source.intentIdempotencyKey),
      captureIdempotencyKey: normalizeId(source.captureIdempotencyKey),
      lastCaptureIdempotencyKey: normalizeId(source.lastCaptureIdempotencyKey),
      voidIdempotencyKey: normalizeId(source.voidIdempotencyKey),
      refundIdempotencyKey: normalizeId(source.refundIdempotencyKey),
      lastRefundIdempotencyKey: normalizeId(source.lastRefundIdempotencyKey),
      correlationId: normalizeId(source.correlationId),
      paymentSource: normalizeToken(source.paymentSource),
      intentStatus: normalizeToken(source.intentStatus),
      transactionStatus: normalizeToken(source.transactionStatus),
      compensationStatus: normalizeToken(source.compensationStatus),
      itemTransactionId: normalizeId(source.itemTransactionId),
      itemTransactionStatus: normalizeToken(source.itemTransactionStatus),
      itemTransactionRevision: clampInteger(source.itemTransactionRevision, 0, Number.MAX_SAFE_INTEGER, 0),
      itemCommitStoreRevision: clampInteger(source.itemCommitStoreRevision, 0, Number.MAX_SAFE_INTEGER, 0),
      executionMode: normalizeToken(source.executionMode),
      executionConfirmedAt: normalizeId(source.executionConfirmedAt),
      intentRevision: clampInteger(source.intentRevision, 0, Number.MAX_SAFE_INTEGER, 0),
      transactionRevision: clampInteger(source.transactionRevision, 0, Number.MAX_SAFE_INTEGER, 0)
    };
  }

  function normalizeReferenceList(value = []) {
    return (Array.isArray(value) ? value : [])
      .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
      .map((entry) => ({
        ...clone(entry),
        sourceId: normalizeId(entry.sourceId || entry.subscriptionContractId || entry.insuranceContractId || entry.id),
        providerId: normalizeId(entry.providerId),
        coverageCode: normalizeId(entry.coverageCode),
        amount: clampInteger(entry.amount, 0, 999999999, 0)
      }))
      .filter((entry) => entry.sourceId);
  }

  function mergeReferenceLists(...lists) {
    const merged = new Map();
    lists.flatMap((list) => normalizeReferenceList(list)).forEach((entry) => {
      const target = entry.coverageTarget && typeof entry.coverageTarget === "object"
        ? `${normalizeToken(entry.coverageTarget.type)}:${normalizeId(entry.coverageTarget.id)}`
        : "";
      const key = [
        entry.sourceId,
        normalizeToken(entry.entitlementCode),
        target
      ].join("::");
      if (!merged.has(key)) merged.set(key, entry);
    });
    return Array.from(merged.values()).map(clone);
  }

  function normalizeEntitlementPolicy(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const defaultStrategy = normalizeToken(source.targetStrategy || "SUBJECT_OR_CITIZEN", "SUBJECT_OR_CITIZEN");
    const targetStrategy = ENTITLEMENT_TARGET_STRATEGIES.has(defaultStrategy) ? defaultStrategy : "SUBJECT_OR_CITIZEN";
    const providerRules = (Array.isArray(source.providerRules) ? source.providerRules : [])
      .filter((rule) => rule && typeof rule === "object" && !Array.isArray(rule))
      .map((rule) => {
        const requirement = normalizeToken(rule.requirement || "OPTIONAL", "OPTIONAL");
        const ruleStrategy = normalizeToken(rule.targetStrategy || targetStrategy, targetStrategy);
        return {
          providerId: normalizeId(rule.providerId),
          entitlementCode: normalizeToken(rule.entitlementCode),
          requirement: ENTITLEMENT_REQUIREMENTS.has(requirement) ? requirement : "OPTIONAL",
          targetStrategy: ENTITLEMENT_TARGET_STRATEGIES.has(ruleStrategy) ? ruleStrategy : targetStrategy,
          active: rule.active !== false
        };
      })
      .filter((rule) => rule.providerId && rule.entitlementCode && rule.active);
    return { targetStrategy, providerRules };
  }

  function normalizeEntitlementEvaluations(value = []) {
    return (Array.isArray(value) ? value : [])
      .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
      .map((entry) => clone(entry));
  }

  function normalizeServiceResult(value = {}, fallbackOutcome = "SUCCESS") {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const outcome = normalizeToken(source.outcome || fallbackOutcome, fallbackOutcome);
    return {
      outcome: RESULT_OUTCOMES.has(outcome) ? outcome : fallbackOutcome,
      resultCode: normalizeToken(source.resultCode || `${fallbackOutcome}_SERVICE_RESULT`, `${fallbackOutcome}_SERVICE_RESULT`),
      itemMutations: Array.isArray(source.itemMutations) ? clone(source.itemMutations) : [],
      conditionChanges: Array.isArray(source.conditionChanges) ? clone(source.conditionChanges) : [],
      firmwareChanges: Array.isArray(source.firmwareChanges) ? clone(source.firmwareChanges) : [],
      authorizationChanges: Array.isArray(source.authorizationChanges) ? clone(source.authorizationChanges) : [],
      serviceHistoryEntries: Array.isArray(source.serviceHistoryEntries) ? clone(source.serviceHistoryEntries) : [],
      complications: Array.isArray(source.complications) ? clone(source.complications) : [],
      generatedDiagnostics: Array.isArray(source.generatedDiagnostics) ? clone(source.generatedDiagnostics) : [],
      refundInstruction: source.refundInstruction && typeof source.refundInstruction === "object" ? clone(source.refundInstruction) : null,
      itemCommit: source.itemCommit && typeof source.itemCommit === "object" ? clone(source.itemCommit) : null,
      failure: source.failure && typeof source.failure === "object" ? clone(source.failure) : null,
      metadata: source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata) ? clone(source.metadata) : {}
    };
  }

  function normalizeServiceDefinition(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const serviceDefinitionId = normalizeId(source.serviceDefinitionId);
    if (!serviceDefinitionId) return null;
    const requiredCapabilities = uniqueStrings(source.requiredCapabilities, normalizeToken);
    const subjectPolicySource = source.subjectPolicy && typeof source.subjectPolicy === "object" ? source.subjectPolicy : {};
    return {
      serviceDefinitionId,
      displayName: normalizeId(source.displayName || source.title || serviceDefinitionId),
      serviceType: normalizeToken(source.serviceType || serviceDefinitionId, "SERVICE"),
      domain: normalizeToken(source.domain || "GENERAL", "GENERAL"),
      requiredCapabilities,
      entitlementPolicy: normalizeEntitlementPolicy(source.entitlementPolicy),
      subjectPolicy: {
        minInstanceCount: clampInteger(subjectPolicySource.minInstanceCount, 0, 999, 0),
        maxInstanceCount: clampInteger(subjectPolicySource.maxInstanceCount, 0, 999, 999),
        returnLocationRequired: subjectPolicySource.returnLocationRequired === true
      },
      durationModel: source.durationModel && typeof source.durationModel === "object" ? clone(source.durationModel) : {},
      pricingModel: source.pricingModel && typeof source.pricingModel === "object" ? clone(source.pricingModel) : {},
      riskModel: source.riskModel && typeof source.riskModel === "object" ? clone(source.riskModel) : {},
      active: source.active !== false,
      revision: clampInteger(source.revision || 1, 1, Number.MAX_SAFE_INTEGER, 1)
    };
  }

  function normalizeProvider(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const providerId = normalizeId(source.providerId);
    if (!providerId) return null;
    const organization = app.getOrganizationByProviderId?.(providerId)
      || app.getOrganizationById?.(source.organizationId)
      || app.findOrganization?.(providerId)
      || null;
    const aliases = uniqueStrings([
      ...(Array.isArray(source.aliases) ? source.aliases : []),
      providerId,
      source.organizationId,
      organization?.id,
      ...(Array.isArray(organization?.providerIds) ? organization.providerIds : [])
    ]);
    return {
      providerId,
      providerType: normalizeToken(source.providerType || "SERVICE_CENTER", "SERVICE_CENTER"),
      legalName: normalizeId(source.legalName || organization?.name || source.displayName || providerId),
      displayName: normalizeId(source.displayName || organization?.shortName || organization?.name || providerId),
      corporationId: normalizeId(source.corporationId),
      organizationId: normalizeId(source.organizationId || organization?.id),
      networkId: normalizeId(source.networkId),
      locationId: normalizeId(source.locationId || organization?.primaryLocationId),
      capabilities: uniqueStrings(source.capabilities, normalizeToken),
      aliases,
      active: source.active !== false && organization?.archived !== true,
      revision: clampInteger(source.revision || 1, 1, Number.MAX_SAFE_INTEGER, 1)
    };
  }

  function normalizeServiceOffer(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const serviceOfferId = normalizeId(source.serviceOfferId);
    const serviceDefinitionId = normalizeId(source.serviceDefinitionId);
    const citizenId = normalizeId(source.citizenId);
    const providerId = normalizeProviderId(source.providerId);
    if (!serviceOfferId || !serviceDefinitionId || !citizenId || !providerId) return null;
    const availability = normalizeToken(source.availability || getServiceBridgeConfig().defaultAvailability || "AVAILABLE", "AVAILABLE");
    return {
      schemaVersion: STORE_SCHEMA_VERSION,
      serviceOfferId,
      serviceDefinitionId,
      providerId,
      organizationId: normalizeId(source.organizationId || getProvider(providerId)?.organizationId),
      citizenId,
      subjectRefs: normalizeSubjectRefs(source.subjectRefs, citizenId),
      quote: normalizeQuote(source.quote),
      subscriptionRefs: normalizeReferenceList(source.subscriptionRefs),
      coverageRuleIds: uniqueStrings(source.coverageRuleIds, normalizeId),
      entitlementResults: normalizeEntitlementEvaluations(source.entitlementResults),
      availability: AVAILABILITY_STATUSES.has(availability) ? availability : "UNAVAILABLE",
      blockers: uniqueStrings(source.blockers, normalizeToken),
      warnings: uniqueStrings(source.warnings, normalizeToken),
      expiresAt: normalizeId(source.expiresAt) || null,
      createdAt: normalizeId(source.createdAt) || getWorldTime(),
      updatedAt: normalizeId(source.updatedAt) || normalizeId(source.createdAt) || getWorldTime(),
      revision: clampInteger(source.revision || 1, 1, Number.MAX_SAFE_INTEGER, 1),
      metadata: source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata) ? clone(source.metadata) : {}
    };
  }

  function normalizeServiceOrder(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const serviceOrderId = normalizeId(source.serviceOrderId);
    const serviceOfferId = normalizeId(source.serviceOfferId);
    const serviceDefinitionId = normalizeId(source.serviceDefinitionId);
    const citizenId = normalizeId(source.citizenId);
    const providerId = normalizeProviderId(source.providerId);
    if (!serviceOrderId || !serviceDefinitionId || !citizenId || !providerId) return null;
    const status = normalizeToken(source.status || "DRAFT", "DRAFT");
    const paymentStatus = normalizeToken(source.paymentStatus || "PENDING", "PENDING");
    return {
      schemaVersion: STORE_SCHEMA_VERSION,
      serviceOrderId,
      serviceOfferId,
      serviceDefinitionId,
      providerId,
      organizationId: normalizeId(source.organizationId || getProvider(providerId)?.organizationId),
      citizenId,
      status: ORDER_STATUSES.has(status) ? status : "DRAFT",
      paymentStatus: PAYMENT_STATUSES.has(paymentStatus) ? paymentStatus : "PENDING",
      subjectRefs: normalizeSubjectRefs(source.subjectRefs, citizenId),
      quote: normalizeQuote(source.quote),
      billingRefs: normalizeBillingRefs(source.billingRefs),
      subscriptionRefs: normalizeReferenceList(source.subscriptionRefs),
      coverageRuleIds: uniqueStrings(source.coverageRuleIds || source.quote?.coverageRuleIds, normalizeId),
      entitlementResults: normalizeEntitlementEvaluations(source.entitlementResults),
      insuranceRefs: normalizeReferenceList(source.insuranceRefs),
      scheduledStartAt: normalizeId(source.scheduledStartAt) || null,
      estimatedEndAt: normalizeId(source.estimatedEndAt) || null,
      startedAt: normalizeId(source.startedAt) || null,
      completedAt: normalizeId(source.completedAt) || null,
      cancelledAt: normalizeId(source.cancelledAt) || null,
      failedAt: normalizeId(source.failedAt) || null,
      result: source.result ? normalizeServiceResult(source.result, status === "FAILED" ? "FAILED" : status === "CANCELLED" ? "CANCELLED" : "SUCCESS") : null,
      createdAt: normalizeId(source.createdAt) || getWorldTime(),
      updatedAt: normalizeId(source.updatedAt) || normalizeId(source.createdAt) || getWorldTime(),
      revision: clampInteger(source.revision || 1, 1, Number.MAX_SAFE_INTEGER, 1),
      metadata: source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata) ? clone(source.metadata) : {}
    };
  }

  function normalizeProviderId(value = "") {
    const key = normalizeId(value).toLowerCase();
    if (!key) return "";
    return providerAliasIndex.get(key) || normalizeId(value);
  }

  function rebuildDefinitionIndex() {
    definitionIndex = new Map();
    (Array.isArray(window.APP_DATA?.serviceDefinitions) ? window.APP_DATA.serviceDefinitions : [])
      .map(normalizeServiceDefinition)
      .filter(Boolean)
      .forEach((definition) => definitionIndex.set(definition.serviceDefinitionId, definition));
  }

  function rebuildProviderIndex() {
    providerIndex = new Map();
    providerAliasIndex = new Map();
    (Array.isArray(window.APP_DATA?.serviceProviderCapabilityManifests) ? window.APP_DATA.serviceProviderCapabilityManifests : [])
      .map(normalizeProvider)
      .filter(Boolean)
      .forEach((provider) => {
        providerIndex.set(provider.providerId, provider);
        provider.aliases.forEach((alias) => providerAliasIndex.set(alias.toLowerCase(), provider.providerId));
        providerAliasIndex.set(provider.providerId.toLowerCase(), provider.providerId);
      });
  }

  function addToMultiIndex(index, key, value) {
    if (!key || !value) return;
    const current = index.get(key) || [];
    if (!current.includes(value)) index.set(key, [...current, value]);
  }

  function rebuildRecordIndexes() {
    offerIdsByCitizen = new Map();
    orderIdsByCitizen = new Map();
    orderIdsByProvider = new Map();
    orderIdsByStatus = new Map();
    offersById.forEach((offer) => addToMultiIndex(offerIdsByCitizen, offer.citizenId, offer.serviceOfferId));
    ordersById.forEach((order) => {
      addToMultiIndex(orderIdsByCitizen, order.citizenId, order.serviceOrderId);
      addToMultiIndex(orderIdsByProvider, order.providerId, order.serviceOrderId);
      addToMultiIndex(orderIdsByStatus, order.status, order.serviceOrderId);
    });
  }

  function readStoredState() {
    try {
      if (window.localStorage?.getItem(STORAGE_SCHEMA_KEY) !== STORAGE_SCHEMA_VERSION) return null;
      const raw = window.localStorage?.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Number(parsed.schemaVersion) !== STORE_SCHEMA_VERSION) return null;
      return parsed;
    } catch (error) {
      console.warn("W&S service bridge store could not read localStorage.", error);
      return null;
    }
  }

  function initializeState() {
    rebuildProviderIndex();
    rebuildDefinitionIndex();
    const stored = readStoredState();
    offersById = new Map();
    ordersById = new Map();
    idempotencyByKey = new Map();
    (Array.isArray(stored?.offers) ? stored.offers : []).map(normalizeServiceOffer).filter(Boolean).forEach((offer) => offersById.set(offer.serviceOfferId, offer));
    (Array.isArray(stored?.orders) ? stored.orders : []).map(normalizeServiceOrder).filter(Boolean).forEach((order) => ordersById.set(order.serviceOrderId, order));
    (Array.isArray(stored?.idempotency) ? stored.idempotency : [])
      .filter((entry) => entry && typeof entry === "object" && normalizeId(entry.key) && normalizeId(entry.command))
      .slice(-IDEMPOTENCY_LIMIT)
      .forEach((entry) => idempotencyByKey.set(`${normalizeId(entry.command)}:${normalizeId(entry.key)}`, clone(entry)));
    storeRevision = clampInteger(stored?.revision || 0, 0, Number.MAX_SAFE_INTEGER, 0);
    rebuildRecordIndexes();
  }

  function serializeState() {
    return {
      schemaVersion: STORE_SCHEMA_VERSION,
      revision: storeRevision,
      offers: Array.from(offersById.values()).map(clone),
      orders: Array.from(ordersById.values()).map(clone),
      idempotency: Array.from(idempotencyByKey.values()).slice(-IDEMPOTENCY_LIMIT).map(clone)
    };
  }

  function flushServiceBridgePersistence() {
    if (persistenceTimer) {
      window.clearTimeout?.(persistenceTimer);
      persistenceTimer = 0;
    }
    try {
      window.localStorage?.setItem(STORAGE_SCHEMA_KEY, STORAGE_SCHEMA_VERSION);
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(serializeState()));
      return true;
    } catch (error) {
      console.warn("W&S service bridge store could not persist localStorage.", error);
      return false;
    }
  }

  function schedulePersistence() {
    if (persistenceTimer) window.clearTimeout?.(persistenceTimer);
    persistenceTimer = window.setTimeout?.(flushServiceBridgePersistence, 120) || 0;
  }

  function makeIdempotencyKey(command = "", key = "") {
    return `${normalizeId(command)}:${normalizeId(key)}`;
  }

  function requireIdempotency(command = "", input = {}) {
    const key = normalizeId(input?.idempotencyKey);
    if (!key) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED", key: "", replay: null };
    const replay = idempotencyByKey.get(makeIdempotencyKey(command, key)) || null;
    return { ok: true, reason: replay ? "IDEMPOTENT_REPLAY" : "NEW_COMMAND", key, replay: replay ? clone(replay) : null };
  }

  function rememberIdempotency(command = "", key = "", entityType = "", entityId = "", revision = 0) {
    const entry = { command, key, entityType, entityId, revision, recordedAt: getWorldTime() };
    idempotencyByKey.set(makeIdempotencyKey(command, key), entry);
    if (idempotencyByKey.size > IDEMPOTENCY_LIMIT) {
      const oldest = idempotencyByKey.keys().next().value;
      if (oldest) idempotencyByKey.delete(oldest);
    }
  }

  function resolveIdempotentReplay(replay = {}) {
    if (replay.entityType === "SERVICE_OFFER") {
      const offer = getServiceOffer(replay.entityId);
      return { ok: Boolean(offer), reason: offer ? "IDEMPOTENT_REPLAY" : "IDEMPOTENT_ENTITY_MISSING", replayed: true, offer };
    }
    const order = getServiceOrder(replay.entityId);
    return { ok: Boolean(order), reason: order ? "IDEMPOTENT_REPLAY" : "IDEMPOTENT_ENTITY_MISSING", replayed: true, order };
  }

  function getServiceDefinition(serviceDefinitionId = "") {
    const record = definitionIndex.get(normalizeId(serviceDefinitionId)) || null;
    return record ? clone(record) : null;
  }

  function getServiceDefinitions(filters = {}) {
    const domain = normalizeToken(filters.domain);
    const serviceType = normalizeToken(filters.serviceType);
    const includeInactive = filters.includeInactive === true;
    return Array.from(definitionIndex.values())
      .filter((definition) => includeInactive || definition.active)
      .filter((definition) => !domain || definition.domain === domain)
      .filter((definition) => !serviceType || definition.serviceType === serviceType)
      .map(clone);
  }

  function getProvider(providerId = "") {
    const canonicalId = normalizeProviderId(providerId);
    const record = providerIndex.get(canonicalId) || null;
    return record ? clone(record) : null;
  }

  function searchProviders(filters = {}) {
    const providerType = normalizeToken(filters.providerType);
    const capability = normalizeToken(filters.capability);
    const organizationId = normalizeId(filters.organizationId);
    const includeInactive = filters.includeInactive === true;
    return Array.from(providerIndex.values())
      .filter((provider) => includeInactive || provider.active)
      .filter((provider) => !providerType || provider.providerType === providerType)
      .filter((provider) => !organizationId || provider.organizationId === organizationId)
      .filter((provider) => !capability || provider.capabilities.includes(capability))
      .map(clone);
  }

  function getProviderServiceCapabilities(providerId = "") {
    return getProvider(providerId)?.capabilities || [];
  }

  function providerSupports(providerId = "", capabilityCode = "") {
    const provider = getProvider(providerId);
    const capability = normalizeToken(capabilityCode);
    return Boolean(provider?.active && capability && provider.capabilities.includes(capability));
  }

  function getServiceOffer(serviceOfferId = "") {
    const record = offersById.get(normalizeId(serviceOfferId)) || null;
    return record ? clone(record) : null;
  }

  function getServiceOrder(serviceOrderId = "") {
    const record = ordersById.get(normalizeId(serviceOrderId)) || null;
    return record ? clone(record) : null;
  }

  function getServiceOrders(filters = {}) {
    const requestedStatuses = uniqueStrings(filters.statuses || (filters.status ? [filters.status] : []), normalizeToken);
    const statuses = requestedStatuses.filter((status) => ORDER_STATUSES.has(status));
    if (requestedStatuses.length && !statuses.length) return [];
    const citizenId = normalizeId(filters.citizenId);
    const providerId = normalizeProviderId(filters.providerId);
    const serviceDefinitionId = normalizeId(filters.serviceDefinitionId);
    const includeTerminal = filters.includeTerminal !== false;
    const candidateIds = statuses.length
      ? [...new Set(statuses.flatMap((status) => orderIdsByStatus.get(status) || []))]
      : Array.from(ordersById.keys());

    return candidateIds
      .map((id) => ordersById.get(id))
      .filter(Boolean)
      .filter((order) => includeTerminal || !TERMINAL_ORDER_STATUSES.has(order.status))
      .filter((order) => !citizenId || order.citizenId === citizenId)
      .filter((order) => !providerId || order.providerId === providerId)
      .filter((order) => !serviceDefinitionId || order.serviceDefinitionId === serviceDefinitionId)
      .sort((a, b) => String(a.scheduledStartAt || a.updatedAt).localeCompare(String(b.scheduledStartAt || b.updatedAt))
        || String(a.serviceOrderId).localeCompare(String(b.serviceOrderId)))
      .map(clone);
  }

  function getCitizenServiceOrders(citizenId = "", filters = {}) {
    const ownerId = normalizeId(citizenId);
    const statuses = uniqueStrings(filters.statuses || (filters.status ? [filters.status] : []), normalizeToken);
    const serviceDefinitionId = normalizeId(filters.serviceDefinitionId);
    const providerId = normalizeProviderId(filters.providerId);
    const includeTerminal = filters.includeTerminal !== false;
    return (orderIdsByCitizen.get(ownerId) || [])
      .map((id) => ordersById.get(id))
      .filter(Boolean)
      .filter((order) => includeTerminal || !TERMINAL_ORDER_STATUSES.has(order.status))
      .filter((order) => !statuses.length || statuses.includes(order.status))
      .filter((order) => !serviceDefinitionId || order.serviceDefinitionId === serviceDefinitionId)
      .filter((order) => !providerId || order.providerId === providerId)
      .sort((a, b) => b.revision - a.revision || String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .map(clone);
  }

  function getProviderServiceOrders(providerId = "", filters = {}) {
    const canonicalId = normalizeProviderId(providerId);
    const statuses = uniqueStrings(filters.statuses || (filters.status ? [filters.status] : []), normalizeToken);
    return (orderIdsByProvider.get(canonicalId) || [])
      .map((id) => ordersById.get(id))
      .filter(Boolean)
      .filter((order) => !statuses.length || statuses.includes(order.status))
      .sort((a, b) => b.revision - a.revision || String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .map(clone);
  }

  function validateInstanceRefs(citizenId = "", instanceIds = []) {
    const blockers = [];
    const warnings = [];
    if (typeof app.getItemInstanceById !== "function") {
      if (instanceIds.length) warnings.push("ITEM_INSTANCE_LOOKUP_UNAVAILABLE");
      return { blockers, warnings };
    }
    instanceIds.forEach((instanceId) => {
      const instance = app.getItemInstanceById(instanceId);
      if (!instance) blockers.push(`ITEM_INSTANCE_NOT_FOUND:${instanceId}`);
      else if (instance.ownerId && instance.ownerId !== citizenId) blockers.push(`ITEM_INSTANCE_OWNER_MISMATCH:${instanceId}`);
    });
    return { blockers, warnings };
  }

  function makeEntitlementReasonToken(prefix = "", code = "") {
    const normalizedCode = normalizeToken(code || "UNAVAILABLE", "UNAVAILABLE");
    return normalizeToken(`${prefix}_${normalizedCode}`, normalizedCode);
  }

  function getServiceEntitlementRules(definition = null, providerId = "") {
    if (!definition?.entitlementPolicy) return [];
    const canonicalProviderId = normalizeProviderId(providerId);
    return (Array.isArray(definition.entitlementPolicy.providerRules) ? definition.entitlementPolicy.providerRules : [])
      .filter((rule) => normalizeProviderId(rule.providerId) === canonicalProviderId)
      .map(clone);
  }

  function makeEntitlementQuery(citizenId = "", providerId = "", entitlementCode = "", target = {}, atTime = "") {
    return {
      citizenId,
      providerId,
      entitlementCode,
      targetType: normalizeToken(target.type || "CITIZEN", "CITIZEN"),
      targetId: normalizeId(target.id || citizenId),
      atTime: normalizeId(atTime) || getWorldTime()
    };
  }

  function resolveEntitlementQuery(query = {}) {
    if (typeof app.resolveSubscriptionEntitlement !== "function") {
      return {
        allowed: false,
        status: "NOT_FOUND",
        citizenId: normalizeId(query.citizenId),
        subscriptionContractId: null,
        subscriptionCatalogId: null,
        providerId: normalizeId(query.providerId) || null,
        entitlementCode: normalizeToken(query.entitlementCode),
        coverageTarget: {
          type: normalizeToken(query.targetType || "CITIZEN", "CITIZEN"),
          id: normalizeId(query.targetId || query.citizenId)
        },
        coverageRuleIds: [],
        reasons: [{ code: "SUBSCRIPTION_ENTITLEMENT_RESOLVER_UNAVAILABLE", severity: "ERROR" }],
        evaluatedAt: normalizeId(query.atTime) || getWorldTime(),
        contractRevision: 0,
        catalogRevision: 0,
        tierRevision: 0
      };
    }
    try {
      return clone(app.resolveSubscriptionEntitlement(query));
    } catch (error) {
      return {
        allowed: false,
        status: "NOT_FOUND",
        citizenId: normalizeId(query.citizenId),
        subscriptionContractId: null,
        subscriptionCatalogId: null,
        providerId: normalizeId(query.providerId) || null,
        entitlementCode: normalizeToken(query.entitlementCode),
        coverageTarget: {
          type: normalizeToken(query.targetType || "CITIZEN", "CITIZEN"),
          id: normalizeId(query.targetId || query.citizenId)
        },
        coverageRuleIds: [],
        reasons: [{ code: "SUBSCRIPTION_ENTITLEMENT_RESOLVER_FAILED", severity: "ERROR" }],
        evaluatedAt: normalizeId(query.atTime) || getWorldTime(),
        contractRevision: 0,
        catalogRevision: 0,
        tierRevision: 0
      };
    }
  }

  function makeSubscriptionReference(result = {}, rule = {}) {
    const sourceId = normalizeId(result.subscriptionContractId);
    if (!sourceId || result.allowed !== true) return null;
    return {
      sourceId,
      subscriptionContractId: sourceId,
      subscriptionCatalogId: normalizeId(result.subscriptionCatalogId),
      providerId: normalizeId(result.providerId),
      entitlementCode: normalizeToken(result.entitlementCode || rule.entitlementCode),
      requirement: normalizeToken(rule.requirement || "OPTIONAL", "OPTIONAL"),
      status: normalizeToken(result.status || "NOT_FOUND", "NOT_FOUND"),
      coverageTarget: result.coverageTarget && typeof result.coverageTarget === "object"
        ? {
            type: normalizeToken(result.coverageTarget.type || "CITIZEN", "CITIZEN"),
            id: normalizeId(result.coverageTarget.id)
          }
        : null,
      coverageRuleIds: uniqueStrings(result.coverageRuleIds, normalizeId),
      contractRevision: clampInteger(result.contractRevision, 0, Number.MAX_SAFE_INTEGER, 0),
      catalogRevision: clampInteger(result.catalogRevision, 0, Number.MAX_SAFE_INTEGER, 0),
      tierRevision: clampInteger(result.tierRevision, 0, Number.MAX_SAFE_INTEGER, 0)
    };
  }

  function resolveRuleTarget(rule = {}, citizenId = "", providerId = "", target = {}, atTime = "", fallbackCitizen = false) {
    const primaryQuery = makeEntitlementQuery(citizenId, providerId, rule.entitlementCode, target, atTime);
    const primary = resolveEntitlementQuery(primaryQuery);
    const attempts = [{ query: primaryQuery, result: clone(primary) }];
    if (primary.allowed === true || !fallbackCitizen || normalizeToken(target.type) === "CITIZEN") {
      return { selected: primary, attempts, fallbackUsed: false };
    }
    const fallbackQuery = makeEntitlementQuery(citizenId, providerId, rule.entitlementCode, { type: "CITIZEN", id: citizenId }, atTime);
    const fallback = resolveEntitlementQuery(fallbackQuery);
    attempts.push({ query: fallbackQuery, result: clone(fallback) });
    return {
      selected: fallback.allowed === true ? fallback : primary,
      attempts,
      fallbackUsed: fallback.allowed === true
    };
  }

  function resolveServiceEntitlements(input = {}) {
    const serviceDefinitionId = normalizeId(input.serviceDefinitionId);
    const citizenId = normalizeId(input.citizenId);
    const providerId = normalizeProviderId(input.providerId);
    const definition = getServiceDefinition(serviceDefinitionId);
    const subjectRefs = normalizeSubjectRefs(input.subjectRefs, citizenId);
    const atTime = normalizeId(input.atTime) || getWorldTime();
    const rules = getServiceEntitlementRules(definition, providerId);
    const blockers = [];
    const warnings = [];
    const entitlementResults = [];
    const subscriptionRefs = [];
    const coverageRuleIds = [];
    const resolverConnected = typeof app.resolveSubscriptionEntitlement === "function";

    if (!definition || !citizenId || !providerId || !rules.length) {
      return {
        ok: true,
        connected: resolverConnected,
        policyApplied: false,
        serviceDefinitionId,
        citizenId,
        providerId,
        subjectRefs,
        subscriptionRefs: [],
        coverageRuleIds: [],
        entitlementResults: [],
        blockers: [],
        warnings: [],
        evaluatedAt: atTime
      };
    }

    rules.forEach((rule) => {
      const strategy = ENTITLEMENT_TARGET_STRATEGIES.has(rule.targetStrategy)
        ? rule.targetStrategy
        : definition.entitlementPolicy.targetStrategy;
      let targets = [];
      let fallbackCitizen = false;
      if (strategy === "CITIZEN_ONLY") {
        targets = [{ type: "CITIZEN", id: citizenId }];
      } else if (strategy === "ITEM_INSTANCE_ONLY") {
        targets = subjectRefs.instanceIds.map((id) => ({ type: "ITEM_INSTANCE", id }));
      } else {
        targets = subjectRefs.instanceIds.length
          ? subjectRefs.instanceIds.map((id) => ({ type: "ITEM_INSTANCE", id }))
          : [{ type: "CITIZEN", id: citizenId }];
        fallbackCitizen = subjectRefs.instanceIds.length > 0;
      }

      if (!targets.length) {
        const missingTargetCode = makeEntitlementReasonToken("SUBSCRIPTION_ENTITLEMENT_TARGET_REQUIRED", rule.entitlementCode);
        if (rule.requirement === "REQUIRED") blockers.push(missingTargetCode);
        else if (rule.requirement === "OPTIONAL") warnings.push(missingTargetCode);
        entitlementResults.push({
          providerId,
          entitlementCode: rule.entitlementCode,
          requirement: rule.requirement,
          targetStrategy: strategy,
          allowed: false,
          status: "NOT_FOUND",
          targetResults: [],
          reasons: [{ code: "SUBSCRIPTION_ENTITLEMENT_TARGET_REQUIRED", severity: "BLOCKER" }]
        });
        return;
      }

      const targetResults = targets.map((target) => resolveRuleTarget(rule, citizenId, providerId, target, atTime, fallbackCitizen));
      const allowed = targetResults.every((entry) => entry.selected?.allowed === true);
      const selectedResults = targetResults.map((entry) => entry.selected).filter(Boolean);
      const reasons = targetResults
        .flatMap((entry) => entry.attempts.flatMap((attempt) => Array.isArray(attempt.result?.reasons) ? attempt.result.reasons : []))
        .map(clone);

      selectedResults.forEach((result) => {
        const ref = makeSubscriptionReference(result, rule);
        if (ref) subscriptionRefs.push(ref);
        coverageRuleIds.push(...uniqueStrings(result.coverageRuleIds, normalizeId));
        if (result.allowed === true && normalizeToken(result.status) === "GRACE_PERIOD") {
          warnings.push(makeEntitlementReasonToken("SUBSCRIPTION_ENTITLEMENT_GRACE_PERIOD", rule.entitlementCode));
        }
      });

      if (!allowed) {
        const missingCode = makeEntitlementReasonToken(
          rule.requirement === "REQUIRED"
            ? "SUBSCRIPTION_ENTITLEMENT_REQUIRED"
            : rule.requirement === "OPTIONAL"
              ? "SUBSCRIPTION_ENTITLEMENT_OPTIONAL_MISSING"
              : "SUBSCRIPTION_ENTITLEMENT_COVERAGE_UNAVAILABLE",
          rule.entitlementCode
        );
        if (rule.requirement === "REQUIRED") blockers.push(missingCode);
        else if (rule.requirement === "OPTIONAL") warnings.push(missingCode);
        else if (!resolverConnected) warnings.push("SUBSCRIPTION_ENTITLEMENT_RESOLVER_UNAVAILABLE");

        const reasonTokens = reasons
          .map((reason) => makeEntitlementReasonToken("SUBSCRIPTION_ENTITLEMENT_REASON", reason.code))
          .filter(Boolean);
        if (rule.requirement === "REQUIRED") blockers.push(...reasonTokens);
        else if (rule.requirement === "OPTIONAL") warnings.push(...reasonTokens);
      }

      entitlementResults.push({
        providerId,
        entitlementCode: rule.entitlementCode,
        requirement: rule.requirement,
        targetStrategy: strategy,
        allowed,
        status: allowed ? normalizeToken(selectedResults[0]?.status || "ACTIVE", "ACTIVE") : "NOT_FOUND",
        targetResults: targetResults.map((entry) => ({
          selected: clone(entry.selected),
          attempts: clone(entry.attempts),
          fallbackUsed: entry.fallbackUsed === true
        })),
        reasons
      });
    });

    return {
      ok: blockers.length === 0,
      connected: resolverConnected,
      policyApplied: true,
      serviceDefinitionId,
      citizenId,
      providerId,
      subjectRefs,
      subscriptionRefs: mergeReferenceLists(subscriptionRefs),
      coverageRuleIds: uniqueStrings(coverageRuleIds, normalizeId),
      entitlementResults,
      blockers: [...new Set(blockers)],
      warnings: [...new Set(warnings)],
      evaluatedAt: atTime
    };
  }

  function validateServiceEligibility(input = {}) {
    const serviceDefinitionId = normalizeId(input.serviceDefinitionId);
    const citizenId = normalizeId(input.citizenId);
    const providerId = normalizeProviderId(input.providerId);
    const definition = getServiceDefinition(serviceDefinitionId);
    const provider = getProvider(providerId);
    const subjectRefs = normalizeSubjectRefs(input.subjectRefs, citizenId);
    const blockers = [];
    const warnings = [];

    if (!serviceDefinitionId) blockers.push("SERVICE_DEFINITION_ID_REQUIRED");
    else if (!definition) blockers.push("SERVICE_DEFINITION_NOT_FOUND");
    else if (!definition.active) blockers.push("SERVICE_DEFINITION_INACTIVE");
    if (!citizenId) blockers.push("CITIZEN_ID_REQUIRED");
    else if (typeof app.getCitizenById === "function" && !app.getCitizenById(citizenId)) blockers.push("CITIZEN_NOT_FOUND");
    if (!providerId) blockers.push("PROVIDER_ID_REQUIRED");
    else if (!provider) blockers.push("PROVIDER_NOT_FOUND");
    else if (!provider.active) blockers.push("PROVIDER_INACTIVE");

    if (definition && provider) {
      definition.requiredCapabilities.forEach((capability) => {
        if (!provider.capabilities.includes(capability)) blockers.push(`PROVIDER_CAPABILITY_REQUIRED:${capability}`);
      });
      const count = subjectRefs.instanceIds.length;
      if (count < definition.subjectPolicy.minInstanceCount) blockers.push("SUBJECT_INSTANCE_COUNT_BELOW_MINIMUM");
      if (count > definition.subjectPolicy.maxInstanceCount) blockers.push("SUBJECT_INSTANCE_COUNT_ABOVE_MAXIMUM");
      if (definition.subjectPolicy.returnLocationRequired && !subjectRefs.returnLocation) blockers.push("RETURN_LOCATION_REQUIRED");
    }

    if (subjectRefs.targetCharacterId && citizenId && subjectRefs.targetCharacterId !== citizenId) warnings.push("TARGET_CHARACTER_DIFFERS_FROM_ORDER_OWNER");
    const instanceValidation = validateInstanceRefs(citizenId, subjectRefs.instanceIds);
    blockers.push(...instanceValidation.blockers);
    warnings.push(...instanceValidation.warnings);

    const entitlementResolution = resolveServiceEntitlements({
      serviceDefinitionId,
      citizenId,
      providerId,
      subjectRefs,
      atTime: normalizeId(input.atTime) || getWorldTime()
    });
    blockers.push(...entitlementResolution.blockers);
    warnings.push(...entitlementResolution.warnings);

    return {
      ok: blockers.length === 0,
      eligible: blockers.length === 0,
      reason: blockers.length ? "SERVICE_ELIGIBILITY_BLOCKED" : "SERVICE_ELIGIBLE",
      citizenId,
      providerId,
      serviceDefinitionId,
      definitionRevision: definition?.revision || 0,
      providerRevision: provider?.revision || 0,
      subjectRefs,
      subscriptionRefs: entitlementResolution.subscriptionRefs,
      coverageRuleIds: entitlementResolution.coverageRuleIds,
      entitlementResults: entitlementResolution.entitlementResults,
      entitlementPolicyApplied: entitlementResolution.policyApplied,
      blockers: [...new Set(blockers)],
      warnings: [...new Set(warnings)],
      evaluatedAt: normalizeId(input.atTime) || getWorldTime()
    };
  }

  function quoteService(input = {}) {
    const eligibility = validateServiceEligibility(input);
    const definition = getServiceDefinition(eligibility.serviceDefinitionId);
    const instanceCount = eligibility.subjectRefs.instanceIds.length;
    const pricingModel = definition?.pricingModel || {};
    const durationModel = definition?.durationModel || {};
    const grossPrice = clampInteger(
      input.grossPrice ?? (clampInteger(pricingModel.basePrice, 0, 999999999, 0) + clampInteger(pricingModel.perInstancePrice, 0, 999999999, 0) * instanceCount),
      0,
      999999999,
      0
    );
    const estimatedDurationMinutes = clampInteger(
      input.estimatedDurationMinutes ?? (clampInteger(durationModel.baseMinutes, 0, 525600, 0) + clampInteger(durationModel.perInstanceMinutes, 0, 525600, 0) * instanceCount),
      0,
      525600,
      0
    );

    let coverage = input.coverage && typeof input.coverage === "object" && !Array.isArray(input.coverage) ? clone(input.coverage) : null;
    const warnings = [...eligibility.warnings];
    if (!coverage && typeof app.resolveCoverage === "function") {
      try {
        coverage = app.resolveCoverage({
          sourceDomain: "SERVICE",
          citizenId: eligibility.citizenId,
          providerId: eligibility.providerId,
          serviceDefinitionId: eligibility.serviceDefinitionId,
          catalogItemId: normalizeId(input.catalogItemId),
          grossPrice,
          currency: input.currency || getServiceBridgeConfig().currency || "CREDIT",
          subjectRefs: clone(eligibility.subjectRefs),
          subscriptionRefs: clone(eligibility.subscriptionRefs),
          entitlementResults: clone(eligibility.entitlementResults),
          coverageRuleIds: clone(eligibility.coverageRuleIds),
          coverageAuthorizations: clone(input.coverageAuthorizations || input.authorizationCodes || []),
          atTime: normalizeId(input.atTime) || getWorldTime()
        });
      } catch (error) {
        warnings.push("COVERAGE_RESOLVER_FAILED");
      }
    }
    if (!coverage) warnings.push("COVERAGE_RESOLVER_NOT_CONNECTED");
    const coverageWarnings = uniqueStrings(coverage?.warnings, normalizeToken);
    const coverageBlockers = uniqueStrings(coverage?.blockers, normalizeToken);
    warnings.push(...coverageWarnings);
    warnings.push(...coverageBlockers.map((code) => `COVERAGE_BLOCKED_${code}`));
    const coveredAmount = Math.min(grossPrice, clampInteger(coverage?.coveredAmount, 0, grossPrice, 0));
    const quote = normalizeQuote({
      grossPrice,
      coveredAmount,
      payableAmount: grossPrice - coveredAmount,
      currency: input.currency || getServiceBridgeConfig().currency || "CREDIT",
      estimatedDurationMinutes,
      pricingModelId: pricingModel.formulaId,
      durationModelId: durationModel.formulaId,
      coverageSources: coverage?.sources || [],
      coverageRuleIds: uniqueStrings([
        ...eligibility.coverageRuleIds,
        ...(Array.isArray(coverage?.coverageRuleIds) ? coverage.coverageRuleIds : [])
      ], normalizeToken),
      coverageBlockers,
      coverageWarnings,
      coverageEvaluatedAt: coverage?.evaluatedAt || eligibility.evaluatedAt,
      coverageSignature: coverage?.signature,
      coverageResolverVersion: coverage?.version || app.COVERAGE_RESOLVER_API_VERSION,
      revision: Math.max(definition?.revision || 1, coverage?.revision || 1)
    });

    return {
      ok: eligibility.ok,
      reason: eligibility.ok ? "SERVICE_QUOTED" : "SERVICE_QUOTE_BLOCKED",
      citizenId: eligibility.citizenId,
      providerId: eligibility.providerId,
      serviceDefinitionId: eligibility.serviceDefinitionId,
      subjectRefs: eligibility.subjectRefs,
      quote,
      subscriptionRefs: eligibility.subscriptionRefs,
      coverageRuleIds: quote.coverageRuleIds,
      entitlementResults: eligibility.entitlementResults,
      availability: eligibility.ok ? "AVAILABLE" : "BLOCKED",
      blockers: eligibility.blockers,
      warnings: [...new Set(warnings)],
      evaluatedAt: eligibility.evaluatedAt
    };
  }

  function emitOfferEvent(offer = {}) {
    window.dispatchEvent?.(new CustomEvent("ws:service-offer-created", {
      detail: {
        serviceOfferId: offer.serviceOfferId,
        serviceDefinitionId: offer.serviceDefinitionId,
        providerId: offer.providerId,
        citizenId: offer.citizenId,
        availability: offer.availability,
        subjectInstanceIds: [...offer.subjectRefs.instanceIds],
        subscriptionContractIds: offer.subscriptionRefs.map((ref) => ref.sourceId),
        coverageRuleIds: [...offer.coverageRuleIds],
        revision: offer.revision
      }
    }));
  }

  function emitOrderEvent(eventName = "ws:service-order-updated", order = {}, previousStatus = "") {
    window.dispatchEvent?.(new CustomEvent(eventName, {
      detail: {
        serviceOrderId: order.serviceOrderId,
        serviceDefinitionId: order.serviceDefinitionId,
        providerId: order.providerId,
        citizenId: order.citizenId,
        status: order.status,
        previousStatus: normalizeToken(previousStatus),
        paymentStatus: order.paymentStatus,
        billingIntentId: order.billingRefs.billingIntentId || "",
        billingTransactionId: order.billingRefs.billingTransactionId || "",
        correlationId: order.billingRefs.correlationId || order.serviceOrderId,
        subjectInstanceIds: [...order.subjectRefs.instanceIds],
        subscriptionContractIds: order.subscriptionRefs.map((ref) => ref.sourceId),
        coverageRuleIds: [...order.coverageRuleIds],
        revision: order.revision
      }
    }));
  }

  function saveOffer(offer = {}) {
    const normalized = normalizeServiceOffer(offer);
    if (!normalized) return null;
    offersById.set(normalized.serviceOfferId, normalized);
    storeRevision += 1;
    rebuildRecordIndexes();
    schedulePersistence();
    return clone(normalized);
  }

  function saveOrder(order = {}) {
    const normalized = normalizeServiceOrder(order);
    if (!normalized) return null;
    ordersById.set(normalized.serviceOrderId, normalized);
    storeRevision += 1;
    rebuildRecordIndexes();
    schedulePersistence();
    return clone(normalized);
  }

  function createServiceOffer(input = {}) {
    const idempotency = requireIdempotency("createServiceOffer", input);
    if (!idempotency.ok) return { ok: false, reason: idempotency.reason, offer: null };
    if (idempotency.replay) return resolveIdempotentReplay(idempotency.replay);
    const quotation = quoteService(input);
    if (!quotation.serviceDefinitionId || !quotation.citizenId || !quotation.providerId) {
      return { ok: false, reason: "SERVICE_OFFER_IDENTITY_INVALID", blockers: quotation.blockers, warnings: quotation.warnings, offer: null };
    }
    const provider = getProvider(quotation.providerId);
    const offer = saveOffer({
      serviceOfferId: normalizeId(input.serviceOfferId) || makeRuntimeId("service_offer"),
      serviceDefinitionId: quotation.serviceDefinitionId,
      providerId: quotation.providerId,
      organizationId: provider?.organizationId || "",
      citizenId: quotation.citizenId,
      subjectRefs: quotation.subjectRefs,
      quote: quotation.quote,
      subscriptionRefs: quotation.subscriptionRefs,
      coverageRuleIds: quotation.coverageRuleIds,
      entitlementResults: quotation.entitlementResults,
      availability: quotation.availability,
      blockers: quotation.blockers,
      warnings: quotation.warnings,
      expiresAt: normalizeId(input.expiresAt) || null,
      createdAt: getWorldTime(),
      updatedAt: getWorldTime(),
      revision: 1,
      metadata: input.metadata
    });
    if (!offer) return { ok: false, reason: "SERVICE_OFFER_SAVE_FAILED", offer: null };
    rememberIdempotency("createServiceOffer", idempotency.key, "SERVICE_OFFER", offer.serviceOfferId, offer.revision);
    schedulePersistence();
    emitOfferEvent(offer);
    return { ok: true, reason: quotation.ok ? "SERVICE_OFFER_CREATED" : "SERVICE_OFFER_CREATED_BLOCKED", replayed: false, offer };
  }

  function createServiceOrderFromOffer(serviceOfferId = "", input = {}) {
    const idempotency = requireIdempotency("createServiceOrderFromOffer", input);
    if (!idempotency.ok) return { ok: false, reason: idempotency.reason, order: null };
    if (idempotency.replay) return resolveIdempotentReplay(idempotency.replay);
    const offer = getServiceOffer(serviceOfferId);
    if (!offer) return { ok: false, reason: "SERVICE_OFFER_NOT_FOUND", order: null };
    if (offer.expiresAt && isPastWorldTime(offer.expiresAt)) {
      return { ok: false, reason: "SERVICE_OFFER_EXPIRED", order: null };
    }
    if (!["AVAILABLE", "LIMITED", "RESTRICTED"].includes(offer.availability) || offer.blockers.length) {
      return { ok: false, reason: "SERVICE_OFFER_BLOCKED", blockers: clone(offer.blockers), order: null };
    }
    const requestedSubjectRefs = input.subjectRefs || offer.subjectRefs;
    const quotation = quoteService({
      serviceDefinitionId: offer.serviceDefinitionId,
      providerId: offer.providerId,
      citizenId: offer.citizenId,
      subjectRefs: requestedSubjectRefs,
      grossPrice: input.grossPrice,
      estimatedDurationMinutes: input.estimatedDurationMinutes,
      currency: input.currency || offer.quote.currency,
      coverageAuthorizations: input.coverageAuthorizations || input.authorizationCodes,
      atTime: normalizeId(input.atTime) || getWorldTime()
    });
    if (!quotation.ok) {
      return { ok: false, reason: "SERVICE_OFFER_REVALIDATION_FAILED", blockers: quotation.blockers, warnings: quotation.warnings, order: null };
    }
    const order = saveOrder({
      serviceOrderId: normalizeId(input.serviceOrderId) || makeRuntimeId("service_order"),
      serviceOfferId: offer.serviceOfferId,
      serviceDefinitionId: offer.serviceDefinitionId,
      providerId: offer.providerId,
      organizationId: offer.organizationId,
      citizenId: offer.citizenId,
      status: "PENDING_CONFIRMATION",
      paymentStatus: normalizeToken(input.paymentStatus || "PENDING", "PENDING"),
      subjectRefs: quotation.subjectRefs,
      quote: quotation.quote,
      billingRefs: input.billingRefs,
      subscriptionRefs: mergeReferenceLists(quotation.subscriptionRefs, input.subscriptionRefs),
      coverageRuleIds: uniqueStrings(quotation.coverageRuleIds, normalizeToken),
      entitlementResults: quotation.entitlementResults,
      insuranceRefs: input.insuranceRefs,
      createdAt: getWorldTime(),
      updatedAt: getWorldTime(),
      revision: 1,
      metadata: {
        ...(input.metadata || {}),
        sourceOfferCoverageSignature: offer.quote.coverageSignature || "",
        orderCoverageSignature: quotation.quote.coverageSignature || ""
      }
    });
    if (!order) return { ok: false, reason: "SERVICE_ORDER_SAVE_FAILED", order: null };
    rememberIdempotency("createServiceOrderFromOffer", idempotency.key, "SERVICE_ORDER", order.serviceOrderId, order.revision);
    schedulePersistence();
    emitOrderEvent("ws:service-order-created", order, "");
    return { ok: true, reason: "SERVICE_ORDER_CREATED", replayed: false, order };
  }

  function assertRevision(order = {}, options = {}) {
    const expectedRevision = Number(options.expectedRevision || 0);
    if (expectedRevision > 0 && expectedRevision !== order.revision) {
      return { ok: false, reason: "SERVICE_ORDER_REVISION_CONFLICT", expectedRevision, actualRevision: order.revision };
    }
    return { ok: true };
  }

  function transitionOrder(serviceOrderId = "", nextStatus = "", patch = {}, options = {}, eventName = "ws:service-order-updated") {
    const idempotency = requireIdempotency(`transition:${normalizeToken(nextStatus)}`, options);
    if (!idempotency.ok) return { ok: false, reason: idempotency.reason, order: null };
    if (idempotency.replay) return resolveIdempotentReplay(idempotency.replay);
    const current = getServiceOrder(serviceOrderId);
    if (!current) return { ok: false, reason: "SERVICE_ORDER_NOT_FOUND", order: null };
    const revisionCheck = assertRevision(current, options);
    if (!revisionCheck.ok) return { ...revisionCheck, order: current };
    const normalizedNextStatus = normalizeToken(nextStatus);
    if (!ORDER_STATUSES.has(normalizedNextStatus)) return { ok: false, reason: "SERVICE_ORDER_STATUS_INVALID", order: current };
    if (!TRANSITIONS[current.status]?.has(normalizedNextStatus)) {
      return { ok: false, reason: "SERVICE_ORDER_TRANSITION_INVALID", previousStatus: current.status, nextStatus: normalizedNextStatus, order: current };
    }
    const next = saveOrder({
      ...current,
      ...clone(patch),
      serviceOrderId: current.serviceOrderId,
      status: normalizedNextStatus,
      updatedAt: getWorldTime(),
      revision: current.revision + 1
    });
    if (!next) return { ok: false, reason: "SERVICE_ORDER_SAVE_FAILED", order: current };
    rememberIdempotency(`transition:${normalizedNextStatus}`, idempotency.key, "SERVICE_ORDER", next.serviceOrderId, next.revision);
    schedulePersistence();
    emitOrderEvent(eventName, next, current.status);
    return { ok: true, reason: `SERVICE_ORDER_${normalizedNextStatus}`, replayed: false, order: next };
  }


  function stableHash(value = "") {
    let hash = 2166136261;
    const source = String(value || "");
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function resolveServicePaymentSource(quote = {}, requestedSource = "") {
    const grossPrice = clampInteger(quote.grossPrice, 0, 999999999, 0);
    const payableAmount = clampInteger(quote.payableAmount, 0, grossPrice, 0);
    if (payableAmount <= 0) {
      return grossPrice > 0 && clampInteger(quote.coveredAmount, 0, grossPrice, 0) >= grossPrice
        ? "COVERED"
        : "NOT_REQUIRED";
    }
    const source = normalizeToken(requestedSource || "CREDITS", "CREDITS");
    return BILLING_PAYMENT_SOURCES.has(source) ? source : "CREDITS";
  }

  function mapBillingIntentStatusToPaymentStatus(status = "", fallback = "PENDING") {
    const normalized = normalizeToken(status);
    if (PAYMENT_STATUSES.has(normalized)) return normalized;
    if (normalized === "EXPIRED") return "VOIDED";
    return normalizeToken(fallback || "PENDING", "PENDING");
  }

  function makeServiceBillingFingerprint(order = {}, quote = {}, paymentSource = "") {
    return stableHash(JSON.stringify({
      serviceOrderId: normalizeId(order.serviceOrderId),
      serviceDefinitionId: normalizeId(order.serviceDefinitionId),
      citizenId: normalizeId(order.citizenId),
      providerId: normalizeId(order.providerId),
      grossPrice: clampInteger(quote.grossPrice, 0, 999999999, 0),
      coveredAmount: clampInteger(quote.coveredAmount, 0, 999999999, 0),
      payableAmount: clampInteger(quote.payableAmount, 0, 999999999, 0),
      currency: normalizeToken(quote.currency || "CREDIT", "CREDIT"),
      coverageSignature: normalizeId(quote.coverageSignature),
      coverageRuleIds: uniqueStrings(quote.coverageRuleIds, normalizeToken).sort(),
      paymentSource: normalizeToken(paymentSource)
    }));
  }

  function makeServiceBillingKeys(order = {}, quote = {}, paymentSource = "", options = {}) {
    const fingerprint = makeServiceBillingFingerprint(order, quote, paymentSource);
    const retryKey = slug(options.billingRetryKey || options.billingAttemptKey || "");
    const revisionToken = `r${clampInteger(order.revision, 1, Number.MAX_SAFE_INTEGER, 1)}`;
    const attemptToken = retryKey && retryKey !== "entry" ? `:${retryKey}` : "";
    const base = `service:${normalizeId(order.serviceOrderId)}:billing`;
    return {
      fingerprint,
      correlationId: normalizeId(options.correlationId || order.billingRefs?.correlationId || order.metadata?.operationId || order.serviceOrderId),
      intentIdempotencyKey: normalizeId(options.billingIntentIdempotencyKey) || `${base}:intent:${revisionToken}:${fingerprint}${attemptToken}`,
      captureIdempotencyKey: normalizeId(options.billingCaptureIdempotencyKey) || `${base}:capture:${fingerprint}`,
      voidIdempotencyKey: normalizeId(options.billingVoidIdempotencyKey) || `${base}:void:${fingerprint}`,
      refundIdempotencyKey: normalizeId(options.billingRefundIdempotencyKey) || `${base}:refund:${fingerprint}`
    };
  }

  function makeBillingCoverageBreakdown(quote = {}) {
    return (Array.isArray(quote.coverageSources) ? quote.coverageSources : [])
      .map((source) => ({
        sourceType: normalizeToken(source.sourceType || "SUBSCRIPTION", "SUBSCRIPTION"),
        sourceId: normalizeId(source.sourceId || source.subscriptionContractId || source.insuranceContractId),
        coverageCode: normalizeToken(source.coverageCode || source.coverageRuleId),
        amount: clampInteger(source.amount, 0, 999999999, 0),
        metadata: {
          subscriptionCatalogId: normalizeId(source.subscriptionCatalogId),
          tierId: normalizeId(source.tierId),
          providerId: normalizeId(source.providerId),
          coverageRuleId: normalizeToken(source.coverageRuleId),
          coverageTarget: source.coverageTarget && typeof source.coverageTarget === "object"
            ? clone(source.coverageTarget)
            : null,
          revision: clampInteger(source.revision, 0, Number.MAX_SAFE_INTEGER, 0)
        }
      }))
      .filter((source) => source.sourceId && source.amount > 0);
  }

  function billingIntentMatchesServiceQuote(intent = null, order = {}, quote = {}, paymentSource = "", fingerprint = "") {
    if (!intent) return false;
    return normalizeToken(intent.sourceDomain) === "SERVICE"
      && normalizeId(intent.sourceRefId) === normalizeId(order.serviceOrderId)
      && normalizeId(intent.citizenId) === normalizeId(order.citizenId)
      && Number(intent.amount || 0) === Number(quote.payableAmount || 0)
      && normalizeToken(intent.currency || "CREDIT", "CREDIT") === normalizeToken(quote.currency || "CREDIT", "CREDIT")
      && normalizeToken(intent.paymentSource || "CREDITS", "CREDITS") === normalizeToken(paymentSource || "CREDITS", "CREDITS")
      && (!normalizeId(intent.metadata?.serviceBillingFingerprint)
        || normalizeId(intent.metadata?.serviceBillingFingerprint) === normalizeId(fingerprint));
  }

  function buildBillingRefs(order = {}, billingIntent = null, billingTransaction = null, keys = {}, patch = {}) {
    const current = normalizeBillingRefs(order.billingRefs);
    return normalizeBillingRefs({
      ...current,
      ...patch,
      billingIntentId: normalizeId(billingIntent?.billingIntentId || patch.billingIntentId || current.billingIntentId),
      billingTransactionId: normalizeId(billingTransaction?.billingTransactionId || patch.billingTransactionId || current.billingTransactionId),
      refundTransactionId: normalizeId(patch.refundTransactionId || current.refundTransactionId),
      intentIdempotencyKey: normalizeId(keys.intentIdempotencyKey || patch.intentIdempotencyKey || current.intentIdempotencyKey),
      captureIdempotencyKey: normalizeId(keys.captureIdempotencyKey || patch.captureIdempotencyKey || current.captureIdempotencyKey),
      lastCaptureIdempotencyKey: normalizeId(patch.lastCaptureIdempotencyKey || current.lastCaptureIdempotencyKey),
      voidIdempotencyKey: normalizeId(keys.voidIdempotencyKey || patch.voidIdempotencyKey || current.voidIdempotencyKey),
      refundIdempotencyKey: normalizeId(keys.refundIdempotencyKey || patch.refundIdempotencyKey || current.refundIdempotencyKey),
      lastRefundIdempotencyKey: normalizeId(patch.lastRefundIdempotencyKey || current.lastRefundIdempotencyKey),
      correlationId: normalizeId(keys.correlationId || patch.correlationId || current.correlationId || order.serviceOrderId),
      paymentSource: normalizeToken(billingIntent?.paymentSource || patch.paymentSource || current.paymentSource),
      intentStatus: normalizeToken(billingIntent?.status || patch.intentStatus || current.intentStatus),
      transactionStatus: normalizeToken(billingTransaction?.status || patch.transactionStatus || current.transactionStatus),
      itemTransactionId: normalizeId(patch.itemTransactionId || current.itemTransactionId),
      itemTransactionStatus: normalizeToken(patch.itemTransactionStatus || current.itemTransactionStatus),
      itemTransactionRevision: clampInteger(patch.itemTransactionRevision ?? current.itemTransactionRevision, 0, Number.MAX_SAFE_INTEGER, 0),
      itemCommitStoreRevision: clampInteger(patch.itemCommitStoreRevision ?? current.itemCommitStoreRevision, 0, Number.MAX_SAFE_INTEGER, 0),
      executionMode: normalizeToken(patch.executionMode || current.executionMode),
      executionConfirmedAt: normalizeId(patch.executionConfirmedAt || current.executionConfirmedAt),
      intentRevision: clampInteger(billingIntent?.revision ?? patch.intentRevision ?? current.intentRevision, 0, Number.MAX_SAFE_INTEGER, 0),
      transactionRevision: clampInteger(billingTransaction?.revision ?? patch.transactionRevision ?? current.transactionRevision, 0, Number.MAX_SAFE_INTEGER, 0)
    });
  }

  function getServiceOrderBillingState(serviceOrderId = "") {
    const order = getServiceOrder(serviceOrderId);
    if (!order) return null;
    const refs = normalizeBillingRefs(order.billingRefs);
    const billingIntent = refs.billingIntentId && typeof app.getBillingIntent === "function"
      ? app.getBillingIntent(refs.billingIntentId)
      : null;
    const billingTransaction = refs.billingTransactionId && typeof app.getBillingTransaction === "function"
      ? app.getBillingTransaction(refs.billingTransactionId)
      : null;
    const payableAmount = clampInteger(order.quote?.payableAmount, 0, 999999999, 0);
    return {
      serviceOrderId: order.serviceOrderId,
      paymentStatus: order.paymentStatus,
      payableAmount,
      billingRefs: refs,
      billingIntent: billingIntent ? clone(billingIntent) : null,
      billingTransaction: billingTransaction ? clone(billingTransaction) : null,
      authorized: payableAmount <= 0 || BILLING_AUTHORIZED_PAYMENT_STATUSES.has(order.paymentStatus),
      settled: payableAmount <= 0 || BILLING_SETTLED_PAYMENT_STATUSES.has(order.paymentStatus),
      recoveryRequired: order.paymentStatus === "PAYMENT_RECOVERY_REQUIRED"
    };
  }

  function getServiceResultMutationInstanceIds(result = {}) {
    const ids = [];
    [
      result.itemMutations,
      result.conditionChanges,
      result.firmwareChanges,
      result.authorizationChanges,
      result.serviceHistoryEntries
    ].forEach((entries) => {
      (Array.isArray(entries) ? entries : []).forEach((entry) => {
        const instanceId = normalizeId(entry?.instanceId);
        if (instanceId) ids.push(instanceId);
      });
    });
    return [...new Set(ids)];
  }

  function validateCommittedServiceItemTransaction(order = {}, result = {}, options = {}) {
    const commit = options.itemCommit && typeof options.itemCommit === "object"
      ? options.itemCommit
      : result.itemCommit && typeof result.itemCommit === "object"
        ? result.itemCommit
        : {};
    const transactionId = normalizeId(
      options.itemTransactionId
      || commit.transactionId
      || order.billingRefs?.itemTransactionId
    );
    if (!transactionId) {
      return { ok: false, reason: "SERVICE_ITEM_TRANSACTION_ID_REQUIRED" };
    }
    if (typeof app.getItemInstanceTransaction !== "function") {
      return { ok: false, reason: "SERVICE_ITEM_TRANSACTION_READ_API_UNAVAILABLE", transactionId };
    }
    const transaction = app.getItemInstanceTransaction(transactionId);
    if (!transaction) {
      return { ok: false, reason: "SERVICE_ITEM_TRANSACTION_NOT_FOUND", transactionId };
    }
    if (normalizeToken(transaction.status) !== "COMMITTED") {
      return {
        ok: false,
        reason: "SERVICE_ITEM_TRANSACTION_NOT_COMMITTED",
        transactionId,
        transactionStatus: normalizeToken(transaction.status)
      };
    }
    if (
      normalizeToken(transaction.sourceDomain) !== "SERVICE"
      || normalizeId(transaction.sourceRefId) !== normalizeId(order.serviceOrderId)
      || normalizeId(transaction.citizenId) !== normalizeId(order.citizenId)
    ) {
      return {
        ok: false,
        reason: "SERVICE_ITEM_TRANSACTION_SOURCE_MISMATCH",
        transactionId,
        transaction: clone(transaction)
      };
    }

    const subjectIds = new Set(uniqueStrings(order.subjectRefs?.instanceIds));
    const transactionIds = uniqueStrings(transaction.instanceIds);
    if (subjectIds.size && transactionIds.some((instanceId) => !subjectIds.has(instanceId))) {
      return {
        ok: false,
        reason: "SERVICE_ITEM_TRANSACTION_SUBJECT_MISMATCH",
        transactionId,
        transactionInstanceIds: transactionIds,
        subjectInstanceIds: [...subjectIds]
      };
    }
    const mutationIds = getServiceResultMutationInstanceIds(result);
    if (mutationIds.some((instanceId) => !transactionIds.includes(instanceId))) {
      return {
        ok: false,
        reason: "SERVICE_ITEM_TRANSACTION_RESULT_MISMATCH",
        transactionId,
        transactionInstanceIds: transactionIds,
        resultInstanceIds: mutationIds
      };
    }
    if (commit.transactionId && normalizeId(commit.transactionId) !== transactionId) {
      return { ok: false, reason: "SERVICE_ITEM_COMMIT_TRANSACTION_MISMATCH", transactionId };
    }

    return {
      ok: true,
      executionMode: "ITEM_TRANSACTION",
      transaction,
      itemCommit: {
        committed: true,
        status: "COMMITTED",
        transactionId,
        instanceIds: transactionIds,
        revision: clampInteger(transaction.revision, 1, Number.MAX_SAFE_INTEGER, 1),
        storeRevision: clampInteger(transaction.committedStoreRevision, 0, Number.MAX_SAFE_INTEGER, 0)
      }
    };
  }

  function resolveServiceExecutionBoundary(order = {}, result = {}, options = {}) {
    const explicitMutationFree = options.mutationFree === true
      || normalizeToken(options.executionMode) === "MUTATION_FREE"
      || normalizeToken(order.billingRefs?.executionMode) === "MUTATION_FREE";
    if (explicitMutationFree) {
      const executionConfirmed = options.executionConfirmed === true
        || result.metadata?.executionConfirmed === true
        || normalizeToken(order.billingRefs?.executionMode) === "MUTATION_FREE";
      if (!executionConfirmed) {
        return { ok: false, reason: "SERVICE_EXECUTION_CONFIRMATION_REQUIRED" };
      }
      return {
        ok: true,
        executionMode: "MUTATION_FREE",
        executionConfirmedAt: normalizeId(options.executionConfirmedAt || result.metadata?.executionConfirmedAt) || getWorldTime(),
        itemCommit: null,
        transaction: null
      };
    }
    return validateCommittedServiceItemTransaction(order, result, options);
  }

  function validateServiceItemCompensation(order = {}, options = {}) {
    const refs = normalizeBillingRefs(order.billingRefs);
    const transactionId = normalizeId(options.itemTransactionId || refs.itemTransactionId);
    if (!transactionId) {
      if (options.executionCompensated === true) {
        return {
          ok: true,
          executionMode: "MUTATION_FREE",
          compensationConfirmedAt: normalizeId(options.compensationConfirmedAt) || getWorldTime(),
          transaction: null
        };
      }
      return { ok: false, reason: "SERVICE_EXECUTION_COMPENSATION_CONFIRMATION_REQUIRED" };
    }
    if (typeof app.getItemInstanceTransaction !== "function") {
      return { ok: false, reason: "SERVICE_ITEM_TRANSACTION_READ_API_UNAVAILABLE", transactionId };
    }
    const transaction = app.getItemInstanceTransaction(transactionId);
    if (!transaction) return { ok: false, reason: "SERVICE_ITEM_TRANSACTION_NOT_FOUND", transactionId };
    if (
      normalizeToken(transaction.sourceDomain) !== "SERVICE"
      || normalizeId(transaction.sourceRefId) !== normalizeId(order.serviceOrderId)
      || normalizeId(transaction.citizenId) !== normalizeId(order.citizenId)
    ) {
      return { ok: false, reason: "SERVICE_ITEM_TRANSACTION_SOURCE_MISMATCH", transactionId, transaction: clone(transaction) };
    }
    if (normalizeToken(transaction.status) !== "COMPENSATED") {
      return {
        ok: false,
        reason: "SERVICE_ITEM_TRANSACTION_COMPENSATION_REQUIRED",
        transactionId,
        transactionStatus: normalizeToken(transaction.status)
      };
    }
    return { ok: true, executionMode: "ITEM_TRANSACTION", transaction };
  }

  function authorizeBillingForServiceOrder(order = {}, quote = {}, options = {}) {
    const paymentSource = resolveServicePaymentSource(quote, options.paymentSource || order.billingRefs?.paymentSource);
    const keys = makeServiceBillingKeys(order, quote, paymentSource, options);
    const payableAmount = clampInteger(quote.payableAmount, 0, 999999999, 0);
    const previousIntentId = normalizeId(order.billingRefs?.billingIntentId);
    let previousIntent = previousIntentId && typeof app.getBillingIntent === "function"
      ? app.getBillingIntent(previousIntentId)
      : null;
    let compensationStatus = "";

    if (previousIntent && (
      normalizeToken(previousIntent.sourceDomain) !== "SERVICE"
      || normalizeId(previousIntent.sourceRefId) !== normalizeId(order.serviceOrderId)
      || normalizeId(previousIntent.citizenId) !== normalizeId(order.citizenId)
    )) {
      return {
        ok: false,
        reason: "SERVICE_BILLING_INTENT_SOURCE_MISMATCH",
        billingIntent: clone(previousIntent),
        keys
      };
    }

    if (payableAmount <= 0) {
      if (previousIntent && ["PENDING", "AUTHORIZED"].includes(normalizeToken(previousIntent.status)) && typeof app.voidBillingIntent === "function") {
        const voided = app.voidBillingIntent(previousIntent.billingIntentId, {
          reason: "SERVICE_QUOTE_NO_PAYMENT_REQUIRED",
          notify: options.notifyBilling === true,
          metadata: { serviceOrderId: order.serviceOrderId, idempotencyKey: keys.voidIdempotencyKey }
        });
        if (!voided?.ok) {
          return {
            ok: false,
            reason: "SERVICE_BILLING_VOID_FAILED",
            billingError: clone(voided?.error || {}),
            billingIntent: clone(voided?.billingIntent || previousIntent),
            keys
          };
        }
        previousIntent = voided.billingIntent || previousIntent;
        compensationStatus = "VOIDED_FOR_ZERO_PAYABLE";
      }
      return {
        ok: true,
        paymentStatus: paymentSource,
        paymentSource,
        billingIntent: previousIntent ? clone(previousIntent) : null,
        billingRefs: buildBillingRefs(order, previousIntent, null, keys, {
          billingIntentId: previousIntent && normalizeToken(previousIntent.status) !== "VOIDED" ? previousIntent.billingIntentId : "",
          intentStatus: previousIntent?.status || "",
          compensationStatus
        }),
        keys
      };
    }

    const requiredApis = ["createBillingIntent", "authorizeBillingIntent", "getBillingIntent"];
    const missingApis = requiredApis.filter((name) => typeof app[name] !== "function");
    if (missingApis.length) {
      return { ok: false, reason: "SERVICE_BILLING_API_UNAVAILABLE", missingApis, keys };
    }

    const fingerprint = keys.fingerprint;
    let billingIntent = previousIntent;
    if (billingIntent && !billingIntentMatchesServiceQuote(billingIntent, order, quote, paymentSource, fingerprint)) {
      const status = normalizeToken(billingIntent.status);
      if (["PARTIALLY_CAPTURED", "CAPTURED"].includes(status)) {
        return {
          ok: false,
          reason: "SERVICE_BILLING_CAPTURED_INTENT_CONFLICT",
          billingIntent: clone(billingIntent),
          keys
        };
      }
      if (["PENDING", "AUTHORIZED"].includes(status)) {
        if (typeof app.voidBillingIntent !== "function") {
          return { ok: false, reason: "SERVICE_BILLING_VOID_API_UNAVAILABLE", billingIntent: clone(billingIntent), keys };
        }
        const voided = app.voidBillingIntent(billingIntent.billingIntentId, {
          reason: "SERVICE_ORDER_REQUOTED",
          notify: options.notifyBilling === true,
          metadata: {
            serviceOrderId: order.serviceOrderId,
            replacementIntentIdempotencyKey: keys.intentIdempotencyKey,
            idempotencyKey: keys.voidIdempotencyKey
          }
        });
        if (!voided?.ok) {
          return {
            ok: false,
            reason: "SERVICE_BILLING_REQUOTE_VOID_FAILED",
            billingError: clone(voided?.error || {}),
            billingIntent: clone(voided?.billingIntent || billingIntent),
            keys
          };
        }
        compensationStatus = "VOIDED_FOR_REQUOTE";
      }
      billingIntent = null;
    }

    if (!billingIntent || !billingIntentMatchesServiceQuote(billingIntent, order, quote, paymentSource, fingerprint)) {
      const definition = getServiceDefinition(order.serviceDefinitionId);
      const created = app.createBillingIntent({
        citizenId: order.citizenId,
        sourceDomain: "SERVICE",
        sourceRefId: order.serviceOrderId,
        amount: payableAmount,
        currency: quote.currency || "CREDIT",
        descriptionCode: definition?.serviceType || "SERVICE_PAYMENT",
        paymentSource,
        coverageBreakdown: makeBillingCoverageBreakdown(quote),
        providerId: order.providerId,
        organizationId: order.organizationId,
        correlationId: keys.correlationId,
        idempotencyKey: keys.intentIdempotencyKey,
        metadata: {
          serviceOrderId: order.serviceOrderId,
          serviceOfferId: order.serviceOfferId,
          serviceDefinitionId: order.serviceDefinitionId,
          serviceBillingFingerprint: fingerprint,
          quoteCoverageSignature: normalizeId(quote.coverageSignature),
          grossPrice: quote.grossPrice,
          coveredAmount: quote.coveredAmount,
          payableAmount: quote.payableAmount,
          serviceOrderRevision: order.revision,
          subjectInstanceIds: clone(order.subjectRefs?.instanceIds || []),
          subscriptionContractIds: clone(order.subscriptionRefs?.map((ref) => ref.sourceId) || []),
          coverageRuleIds: clone(order.coverageRuleIds || [])
        }
      });
      if (!created?.ok) {
        return {
          ok: false,
          reason: "SERVICE_BILLING_INTENT_CREATE_FAILED",
          billingError: clone(created?.error || {}),
          billingIntent: clone(created?.billingIntent || null),
          keys
        };
      }
      billingIntent = created.billingIntent;
    }

    const status = normalizeToken(billingIntent?.status);
    if (status === "PENDING") {
      const authorized = app.authorizeBillingIntent(billingIntent.billingIntentId, {
        notify: options.notifyBilling === true,
        createdBy: options.createdBy || "SERVICE_BRIDGE",
        metadata: {
          serviceOrderId: order.serviceOrderId,
          correlationId: keys.correlationId
        }
      });
      if (!authorized?.ok) {
        return {
          ok: false,
          reason: "SERVICE_BILLING_INTENT_AUTHORIZATION_FAILED",
          billingError: clone(authorized?.error || {}),
          billingIntent: clone(authorized?.billingIntent || billingIntent),
          keys
        };
      }
      billingIntent = authorized.billingIntent;
    } else if (!["AUTHORIZED", "PARTIALLY_CAPTURED", "CAPTURED"].includes(status)) {
      return {
        ok: false,
        reason: "SERVICE_BILLING_INTENT_NOT_AUTHORIZABLE",
        billingIntent: clone(billingIntent),
        keys
      };
    }

    return {
      ok: true,
      paymentStatus: mapBillingIntentStatusToPaymentStatus(billingIntent.status, "AUTHORIZED"),
      paymentSource,
      billingIntent: clone(billingIntent),
      billingRefs: buildBillingRefs(order, billingIntent, null, keys, { compensationStatus }),
      keys
    };
  }

  function authorizeServiceOrder(serviceOrderId = "", options = {}) {
    const idempotency = requireIdempotency("transition:AUTHORIZED", options);
    if (!idempotency.ok) return { ok: false, reason: idempotency.reason, order: null };
    if (idempotency.replay) return resolveIdempotentReplay(idempotency.replay);

    const current = getServiceOrder(serviceOrderId);
    if (!current) return { ok: false, reason: "SERVICE_ORDER_NOT_FOUND", order: null };
    const revisionCheck = assertRevision(current, options);
    if (!revisionCheck.ok) return { ...revisionCheck, order: current };
    if (!TRANSITIONS[current.status]?.has("AUTHORIZED")) {
      return {
        ok: false,
        reason: "SERVICE_ORDER_TRANSITION_INVALID",
        previousStatus: current.status,
        nextStatus: "AUTHORIZED",
        order: current
      };
    }

    const quotation = quoteService({
      serviceDefinitionId: current.serviceDefinitionId,
      providerId: current.providerId,
      citizenId: current.citizenId,
      subjectRefs: current.subjectRefs,
      grossPrice: current.quote.grossPrice,
      estimatedDurationMinutes: current.quote.estimatedDurationMinutes,
      currency: current.quote.currency,
      coverageAuthorizations: options.coverageAuthorizations || options.authorizationCodes,
      atTime: normalizeId(options.atTime) || getWorldTime()
    });
    if (!quotation.ok) {
      return {
        ok: false,
        reason: "SERVICE_ORDER_ELIGIBILITY_REVALIDATION_FAILED",
        blockers: quotation.blockers,
        warnings: quotation.warnings,
        order: current
      };
    }

    const currentSignature = normalizeId(current.quote.coverageSignature);
    const latestSignature = normalizeId(quotation.quote.coverageSignature);
    const coverageChanged = Boolean(
      currentSignature
      && latestSignature
      && currentSignature !== latestSignature
    ) || current.quote.coveredAmount !== quotation.quote.coveredAmount
      || current.quote.payableAmount !== quotation.quote.payableAmount;

    if (coverageChanged && options.acceptCoverageChange !== true) {
      return {
        ok: false,
        reason: "SERVICE_ORDER_REQUOTE_REQUIRED",
        currentQuote: clone(current.quote),
        latestQuote: clone(quotation.quote),
        warnings: quotation.warnings,
        order: current
      };
    }

    const billing = authorizeBillingForServiceOrder(current, quotation.quote, options);
    if (!billing.ok) {
      return {
        ok: false,
        reason: billing.reason,
        billingError: billing.billingError,
        billingIntent: billing.billingIntent,
        missingApis: billing.missingApis,
        order: current
      };
    }

    const next = saveOrder({
      ...current,
      quote: quotation.quote,
      billingRefs: billing.billingRefs,
      paymentStatus: billing.paymentStatus,
      subscriptionRefs: mergeReferenceLists(quotation.subscriptionRefs, options.subscriptionRefs),
      coverageRuleIds: uniqueStrings(quotation.coverageRuleIds, normalizeToken),
      entitlementResults: quotation.entitlementResults,
      insuranceRefs: options.insuranceRefs || current.insuranceRefs,
      status: "AUTHORIZED",
      updatedAt: getWorldTime(),
      revision: current.revision + 1,
      metadata: {
        ...current.metadata,
        ...(options.metadata || {}),
        authorizationReason: normalizeToken(options.reasonCode),
        authorizationCoverageSignature: quotation.quote.coverageSignature || "",
        coverageChangeAccepted: coverageChanged && options.acceptCoverageChange === true,
        billingIntentId: billing.billingRefs.billingIntentId || "",
        billingCorrelationId: billing.billingRefs.correlationId || current.serviceOrderId,
        billingPaymentSource: billing.paymentSource
      }
    });

    if (!next) {
      const intent = billing.billingIntent;
      let compensation = null;
      if (intent && ["PENDING", "AUTHORIZED"].includes(normalizeToken(intent.status)) && typeof app.voidBillingIntent === "function") {
        compensation = app.voidBillingIntent(intent.billingIntentId, {
          reason: "SERVICE_ORDER_AUTHORIZATION_SAVE_FAILED",
          notify: options.notifyBilling === true,
          metadata: {
            serviceOrderId: current.serviceOrderId,
            idempotencyKey: billing.keys?.voidIdempotencyKey || ""
          }
        });
      }
      return {
        ok: false,
        reason: compensation?.ok ? "SERVICE_ORDER_SAVE_FAILED_BILLING_VOIDED" : "SERVICE_ORDER_SAVE_FAILED_BILLING_RECOVERY_REQUIRED",
        billingIntent: clone(compensation?.billingIntent || intent || null),
        compensation: clone(compensation),
        order: current
      };
    }

    rememberIdempotency("transition:AUTHORIZED", idempotency.key, "SERVICE_ORDER", next.serviceOrderId, next.revision);
    schedulePersistence();
    emitOrderEvent("ws:service-order-updated", next, current.status);
    return {
      ok: true,
      reason: "SERVICE_ORDER_AUTHORIZED",
      replayed: false,
      order: next,
      billingIntent: billing.billingIntent
    };
  }


  function persistServiceOrderBillingUpdate(current = {}, patch = {}, command = "", idempotency = {}, eventName = "ws:service-order-payment-updated") {
    const next = saveOrder({
      ...current,
      ...clone(patch),
      serviceOrderId: current.serviceOrderId,
      status: current.status,
      updatedAt: getWorldTime(),
      revision: current.revision + 1
    });
    if (!next) return null;
    rememberIdempotency(command, idempotency.key, "SERVICE_ORDER", next.serviceOrderId, next.revision);
    schedulePersistence();
    emitOrderEvent(eventName, next, current.status);
    return next;
  }

  function captureServiceOrderBilling(serviceOrderId = "", options = {}) {
    const idempotency = requireIdempotency("captureServiceOrderBilling", options);
    if (!idempotency.ok) return { ok: false, reason: idempotency.reason, order: null };
    if (idempotency.replay) return resolveIdempotentReplay(idempotency.replay);

    const current = getServiceOrder(serviceOrderId);
    if (!current) return { ok: false, reason: "SERVICE_ORDER_NOT_FOUND", order: null };
    const revisionCheck = assertRevision(current, options);
    if (!revisionCheck.ok) return { ...revisionCheck, order: current };
    if (!["AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"].includes(current.status)) {
      return { ok: false, reason: "SERVICE_ORDER_NOT_BILLING_CAPTURABLE", order: current };
    }

    const executionResult = normalizeServiceResult(options.result || {
      itemCommit: options.itemCommit,
      metadata: {
        executionConfirmed: options.executionConfirmed === true,
        executionConfirmedAt: options.executionConfirmedAt
      }
    }, "SUCCESS");
    const execution = resolveServiceExecutionBoundary(current, executionResult, options);
    if (!execution.ok) {
      return {
        ok: false,
        reason: execution.reason,
        transactionId: execution.transactionId || "",
        transactionStatus: execution.transactionStatus || "",
        order: current
      };
    }

    const executionBillingPatch = {
      itemTransactionId: normalizeId(execution.itemCommit?.transactionId),
      itemTransactionStatus: normalizeToken(execution.itemCommit?.status),
      itemTransactionRevision: clampInteger(execution.itemCommit?.revision, 0, Number.MAX_SAFE_INTEGER, 0),
      itemCommitStoreRevision: clampInteger(execution.itemCommit?.storeRevision, 0, Number.MAX_SAFE_INTEGER, 0),
      executionMode: execution.executionMode,
      executionConfirmedAt: normalizeId(execution.executionConfirmedAt) || getWorldTime()
    };

    const payableAmount = clampInteger(current.quote?.payableAmount, 0, 999999999, 0);
    if (payableAmount <= 0) {
      const paymentStatus = resolveServicePaymentSource(current.quote, current.billingRefs?.paymentSource);
      const next = persistServiceOrderBillingUpdate(current, {
        paymentStatus,
        billingRefs: buildBillingRefs(current, null, null, {}, {
          paymentSource,
          intentStatus: paymentStatus,
          ...executionBillingPatch
        })
      }, "captureServiceOrderBilling", idempotency);
      return next
        ? { ok: true, reason: "SERVICE_BILLING_NOT_REQUIRED", replayed: false, order: next, billingIntent: null, billingTransaction: null }
        : { ok: false, reason: "SERVICE_ORDER_SAVE_FAILED", order: current };
    }

    if (typeof app.captureBillingIntent !== "function" || typeof app.getBillingIntent !== "function") {
      return { ok: false, reason: "SERVICE_BILLING_CAPTURE_API_UNAVAILABLE", order: current };
    }
    const billingIntentId = normalizeId(current.billingRefs?.billingIntentId);
    if (!billingIntentId) return { ok: false, reason: "SERVICE_BILLING_INTENT_REQUIRED", order: current };
    const intent = app.getBillingIntent(billingIntentId);
    if (!intent) return { ok: false, reason: "SERVICE_BILLING_INTENT_NOT_FOUND", order: current };
    if (normalizeToken(intent.sourceDomain) !== "SERVICE" || normalizeId(intent.sourceRefId) !== current.serviceOrderId) {
      return { ok: false, reason: "SERVICE_BILLING_INTENT_SOURCE_MISMATCH", billingIntent: clone(intent), order: current };
    }

    const refs = normalizeBillingRefs(current.billingRefs);
    const requestedAmount = options.amount == null ? null : Number(options.amount);
    const captureBaseKey = refs.captureIdempotencyKey || `service:${current.serviceOrderId}:billing:capture`;
    const captureTargetAmount = requestedAmount == null
      ? Number(intent.amount || 0)
      : Number(intent.capturedAmount || 0) + requestedAmount;
    const captureKey = normalizeId(options.billingCaptureIdempotencyKey)
      || (requestedAmount == null ? captureBaseKey : `${captureBaseKey}:to:${captureTargetAmount}`);

    const captured = app.captureBillingIntent(billingIntentId, {
      amount: options.amount,
      idempotencyKey: captureKey,
      notify: options.notifyBilling === true,
      recordHistory: options.recordBillingHistory !== false,
      createdBy: options.createdBy || "SERVICE_BRIDGE",
      note: normalizeId(options.note) || `Service payment captured for ${current.serviceDefinitionId}.`,
      metadata: {
        serviceOrderId: current.serviceOrderId,
        serviceDefinitionId: current.serviceDefinitionId,
        correlationId: refs.correlationId || current.serviceOrderId,
        itemTransactionId: executionBillingPatch.itemTransactionId || "",
        executionMode: execution.executionMode,
        ...(options.billingMetadata || {})
      }
    });

    if (!captured?.ok) {
      const failedIntent = captured?.billingIntent || app.getBillingIntent(billingIntentId);
      if (normalizeToken(failedIntent?.status) === "PAYMENT_RECOVERY_REQUIRED") {
        const recoveryOrder = saveOrder({
          ...current,
          paymentStatus: "PAYMENT_RECOVERY_REQUIRED",
          billingRefs: buildBillingRefs(current, failedIntent, null, {}, {
            captureIdempotencyKey: captureKey,
            compensationStatus: "PAYMENT_RECOVERY_REQUIRED",
            ...executionBillingPatch
          }),
          updatedAt: getWorldTime(),
          revision: current.revision + 1,
          metadata: {
            ...current.metadata,
            billingRecoveryRequired: true,
            billingFailureCode: normalizeToken(captured?.error?.code)
          }
        });
        if (recoveryOrder) {
          schedulePersistence();
          emitOrderEvent("ws:service-order-payment-updated", recoveryOrder, current.status);
        }
        return {
          ok: false,
          reason: "SERVICE_BILLING_CAPTURE_RECOVERY_REQUIRED",
          billingError: clone(captured?.error || {}),
          billingIntent: clone(failedIntent || null),
          order: recoveryOrder || current
        };
      }
      return {
        ok: false,
        reason: "SERVICE_BILLING_CAPTURE_FAILED",
        billingError: clone(captured?.error || {}),
        billingIntent: clone(failedIntent || null),
        order: current
      };
    }

    const billingIntent = captured.billingIntent || app.getBillingIntent(billingIntentId);
    const billingTransaction = captured.billingTransaction || null;
    const paymentStatus = mapBillingIntentStatusToPaymentStatus(billingIntent?.status, billingTransaction ? "CAPTURED" : current.paymentStatus);
    const next = persistServiceOrderBillingUpdate(current, {
      paymentStatus,
      billingRefs: buildBillingRefs(current, billingIntent, billingTransaction, {}, {
        lastCaptureIdempotencyKey: captureKey,
        compensationStatus: "",
        ...executionBillingPatch
      }),
      metadata: {
        ...current.metadata,
        billingCapturedAt: normalizeId(billingTransaction?.capturedAt || getWorldTime()),
        billingCaptureOperation: normalizeToken(captured.operation),
        billingRecoveryRequired: false,
        itemTransactionId: executionBillingPatch.itemTransactionId || "",
        serviceExecutionMode: execution.executionMode
      }
    }, "captureServiceOrderBilling", idempotency);

    if (!next) {
      return {
        ok: false,
        reason: "SERVICE_BILLING_CAPTURE_RECONCILIATION_REQUIRED",
        billingIntent: clone(billingIntent),
        billingTransaction: clone(billingTransaction),
        order: current
      };
    }
    return {
      ok: true,
      reason: paymentStatus === "PARTIALLY_CAPTURED" ? "SERVICE_BILLING_PARTIALLY_CAPTURED" : "SERVICE_BILLING_CAPTURED",
      replayed: captured.operation === "IDEMPOTENT_REPLAY",
      order: next,
      billingIntent: clone(billingIntent),
      billingTransaction: clone(billingTransaction)
    };
  }

  function voidServiceOrderBilling(serviceOrderId = "", options = {}) {
    const idempotency = requireIdempotency("voidServiceOrderBilling", options);
    if (!idempotency.ok) return { ok: false, reason: idempotency.reason, order: null };
    if (idempotency.replay) return resolveIdempotentReplay(idempotency.replay);

    const current = getServiceOrder(serviceOrderId);
    if (!current) return { ok: false, reason: "SERVICE_ORDER_NOT_FOUND", order: null };
    const revisionCheck = assertRevision(current, options);
    if (!revisionCheck.ok) return { ...revisionCheck, order: current };
    const billingIntentId = normalizeId(current.billingRefs?.billingIntentId);
    if (!billingIntentId) {
      const next = persistServiceOrderBillingUpdate(current, {
        paymentStatus: current.quote?.payableAmount > 0 ? "VOIDED" : current.paymentStatus,
        billingRefs: buildBillingRefs(current, null, null, {}, { compensationStatus: "NO_INTENT" })
      }, "voidServiceOrderBilling", idempotency);
      return next
        ? { ok: true, reason: "SERVICE_BILLING_INTENT_ABSENT", replayed: false, order: next }
        : { ok: false, reason: "SERVICE_ORDER_SAVE_FAILED", order: current };
    }
    if (typeof app.getBillingIntent !== "function" || typeof app.voidBillingIntent !== "function") {
      return { ok: false, reason: "SERVICE_BILLING_VOID_API_UNAVAILABLE", order: current };
    }
    const intent = app.getBillingIntent(billingIntentId);
    if (!intent) return { ok: false, reason: "SERVICE_BILLING_INTENT_NOT_FOUND", order: current };
    if (
      normalizeToken(intent.sourceDomain) !== "SERVICE"
      || normalizeId(intent.sourceRefId) !== current.serviceOrderId
      || normalizeId(intent.citizenId) !== current.citizenId
    ) {
      return { ok: false, reason: "SERVICE_BILLING_INTENT_SOURCE_MISMATCH", billingIntent: clone(intent), order: current };
    }
    if (["CAPTURED", "PARTIALLY_CAPTURED"].includes(normalizeToken(intent.status))) {
      return { ok: false, reason: "SERVICE_BILLING_REFUND_REQUIRED", billingIntent: clone(intent), order: current };
    }
    const refs = normalizeBillingRefs(current.billingRefs);
    const voided = app.voidBillingIntent(billingIntentId, {
      reason: normalizeId(options.reason) || "SERVICE_ORDER_COMPENSATION",
      notify: options.notifyBilling === true,
      metadata: {
        serviceOrderId: current.serviceOrderId,
        idempotencyKey: normalizeId(options.billingVoidIdempotencyKey || refs.voidIdempotencyKey),
        ...(options.billingMetadata || {})
      }
    });
    if (!voided?.ok) {
      return {
        ok: false,
        reason: "SERVICE_BILLING_VOID_FAILED",
        billingError: clone(voided?.error || {}),
        billingIntent: clone(voided?.billingIntent || intent),
        order: current
      };
    }
    const next = persistServiceOrderBillingUpdate(current, {
      paymentStatus: "VOIDED",
      billingRefs: buildBillingRefs(current, voided.billingIntent, null, {}, {
        voidIdempotencyKey: normalizeId(options.billingVoidIdempotencyKey || refs.voidIdempotencyKey),
        compensationStatus: "VOIDED"
      }),
      metadata: {
        ...current.metadata,
        billingVoidedAt: getWorldTime(),
        billingVoidReason: normalizeToken(options.reasonCode || options.reason || "SERVICE_ORDER_COMPENSATION")
      }
    }, "voidServiceOrderBilling", idempotency);
    return next
      ? { ok: true, reason: "SERVICE_BILLING_VOIDED", replayed: voided.operation === "IDEMPOTENT_REPLAY", order: next, billingIntent: clone(voided.billingIntent) }
      : { ok: false, reason: "SERVICE_ORDER_SAVE_FAILED_BILLING_VOIDED", billingIntent: clone(voided.billingIntent), order: current };
  }

  function refundServiceOrderBilling(serviceOrderId = "", amount = null, options = {}) {
    const idempotency = requireIdempotency("refundServiceOrderBilling", options);
    if (!idempotency.ok) return { ok: false, reason: idempotency.reason, order: null };
    if (idempotency.replay) return resolveIdempotentReplay(idempotency.replay);

    const current = getServiceOrder(serviceOrderId);
    if (!current) return { ok: false, reason: "SERVICE_ORDER_NOT_FOUND", order: null };
    const revisionCheck = assertRevision(current, options);
    if (!revisionCheck.ok) return { ...revisionCheck, order: current };
    if (typeof app.refundBillingTransaction !== "function" || typeof app.getBillingTransaction !== "function") {
      return { ok: false, reason: "SERVICE_BILLING_REFUND_API_UNAVAILABLE", order: current };
    }
    const billingTransactionId = normalizeId(current.billingRefs?.billingTransactionId);
    if (!billingTransactionId) return { ok: false, reason: "SERVICE_BILLING_TRANSACTION_REQUIRED", order: current };
    const sourceTransaction = app.getBillingTransaction(billingTransactionId);
    if (!sourceTransaction) return { ok: false, reason: "SERVICE_BILLING_TRANSACTION_NOT_FOUND", order: current };
    if (
      normalizeToken(sourceTransaction.sourceDomain) !== "SERVICE"
      || normalizeId(sourceTransaction.sourceRefId) !== current.serviceOrderId
      || normalizeId(sourceTransaction.citizenId) !== current.citizenId
    ) {
      return {
        ok: false,
        reason: "SERVICE_BILLING_TRANSACTION_SOURCE_MISMATCH",
        billingTransaction: clone(sourceTransaction),
        order: current
      };
    }
    const refs = normalizeBillingRefs(current.billingRefs);
    const itemCompensation = validateServiceItemCompensation(current, options);
    if (!itemCompensation.ok) {
      return {
        ok: false,
        reason: itemCompensation.reason,
        transactionId: itemCompensation.transactionId || refs.itemTransactionId || "",
        transactionStatus: itemCompensation.transactionStatus || "",
        order: current
      };
    }
    const refundBaseKey = refs.refundIdempotencyKey || `service:${current.serviceOrderId}:billing:refund`;
    const requestedRefund = amount == null
      ? Math.max(0, Number(sourceTransaction.amount || 0) - Number(sourceTransaction.refundedAmount || 0))
      : Number(amount);
    const refundTargetAmount = Number(sourceTransaction.refundedAmount || 0) + requestedRefund;
    const refundKey = normalizeId(options.billingRefundIdempotencyKey)
      || `${refundBaseKey}:to:${refundTargetAmount}`;
    const refunded = app.refundBillingTransaction(billingTransactionId, amount, {
      idempotencyKey: refundKey,
      reason: normalizeId(options.reason) || "SERVICE_ORDER_COMPENSATION",
      notify: options.notifyBilling === true,
      recordHistory: options.recordBillingHistory !== false,
      createdBy: options.createdBy || "SERVICE_BRIDGE",
      metadata: {
        serviceOrderId: current.serviceOrderId,
        serviceDefinitionId: current.serviceDefinitionId,
        correlationId: refs.correlationId || current.serviceOrderId,
        ...(options.billingMetadata || {})
      }
    });
    if (!refunded?.ok) {
      return {
        ok: false,
        reason: "SERVICE_BILLING_REFUND_FAILED",
        billingError: clone(refunded?.error || {}),
        billingTransaction: clone(refunded?.billingTransaction || null),
        order: current
      };
    }
    const originalTransaction = refunded.originalTransaction || null;
    const refundTransaction = refunded.billingTransaction || null;
    const paymentStatus = normalizeToken(originalTransaction?.status) === "PARTIALLY_REFUNDED"
      ? "PARTIALLY_REFUNDED"
      : "REFUNDED";
    const next = persistServiceOrderBillingUpdate(current, {
      paymentStatus,
      billingRefs: buildBillingRefs(current, null, null, {}, {
        refundTransactionId: normalizeId(refundTransaction?.billingTransactionId),
        lastRefundIdempotencyKey: refundKey,
        transactionStatus: normalizeToken(originalTransaction?.status),
        transactionRevision: clampInteger(originalTransaction?.revision, 0, Number.MAX_SAFE_INTEGER, 0),
        compensationStatus: paymentStatus,
        itemTransactionId: normalizeId(itemCompensation.transaction?.transactionId || refs.itemTransactionId),
        itemTransactionStatus: normalizeToken(itemCompensation.transaction?.status || (itemCompensation.executionMode === "MUTATION_FREE" ? "COMPENSATED" : refs.itemTransactionStatus)),
        itemTransactionRevision: clampInteger(itemCompensation.transaction?.revision ?? refs.itemTransactionRevision, 0, Number.MAX_SAFE_INTEGER, 0),
        executionMode: itemCompensation.executionMode || refs.executionMode,
        executionConfirmedAt: refs.executionConfirmedAt || normalizeId(itemCompensation.compensationConfirmedAt)
      }),
      metadata: {
        ...current.metadata,
        billingRefundedAt: normalizeId(refundTransaction?.capturedAt || getWorldTime()),
        billingRefundAmount: Number(refundTransaction?.amount || 0),
        itemCompensationConfirmed: true,
        itemTransactionId: normalizeId(itemCompensation.transaction?.transactionId || refs.itemTransactionId)
      }
    }, "refundServiceOrderBilling", idempotency);
    return next
      ? {
          ok: true,
          reason: paymentStatus === "PARTIALLY_REFUNDED" ? "SERVICE_BILLING_PARTIALLY_REFUNDED" : "SERVICE_BILLING_REFUNDED",
          replayed: refunded.operation === "IDEMPOTENT_REPLAY",
          order: next,
          billingTransaction: clone(refundTransaction),
          originalTransaction: clone(originalTransaction)
        }
      : {
          ok: false,
          reason: "SERVICE_BILLING_REFUND_RECONCILIATION_REQUIRED",
          billingTransaction: clone(refundTransaction),
          originalTransaction: clone(originalTransaction),
          order: current
        };
  }

  function scheduleServiceOrder(serviceOrderId = "", schedule = {}, options = {}) {
    const scheduledStartAt = normalizeId(schedule.scheduledStartAt || schedule.startAt);
    if (!scheduledStartAt) return { ok: false, reason: "SCHEDULED_START_REQUIRED", order: getServiceOrder(serviceOrderId) };
    return transitionOrder(serviceOrderId, "SCHEDULED", {
      scheduledStartAt,
      estimatedEndAt: normalizeId(schedule.estimatedEndAt || schedule.endAt) || null
    }, options);
  }

  function startServiceOrder(serviceOrderId = "", options = {}) {
    const current = getServiceOrder(serviceOrderId);
    if (!current) return { ok: false, reason: "SERVICE_ORDER_NOT_FOUND", order: null };
    const payableAmount = clampInteger(current.quote?.payableAmount, 0, 999999999, 0);
    if (payableAmount > 0 && !BILLING_AUTHORIZED_PAYMENT_STATUSES.has(current.paymentStatus)) {
      return {
        ok: false,
        reason: "SERVICE_PAYMENT_AUTHORIZATION_REQUIRED",
        paymentStatus: current.paymentStatus,
        order: current
      };
    }
    const source = normalizeToken(options.source);
    const metadataPatch = options.metadata && typeof options.metadata === "object" && !Array.isArray(options.metadata)
      ? clone(options.metadata)
      : {};
    return transitionOrder(serviceOrderId, "IN_PROGRESS", {
      startedAt: normalizeId(options.startedAt) || getWorldTime(),
      metadata: {
        ...current.metadata,
        ...metadataPatch,
        ...(source ? { startSource: source } : {})
      }
    }, options, "ws:service-order-started");
  }

  function resultNeedsCommitConfirmation(result = {}) {
    return [
      result.itemMutations,
      result.conditionChanges,
      result.firmwareChanges,
      result.authorizationChanges,
      result.serviceHistoryEntries
    ].some((entries) => Array.isArray(entries) && entries.length > 0);
  }

  function hasCommitConfirmation(result = {}) {
    const status = normalizeToken(result.itemCommit?.status);
    return result.itemCommit?.committed === true || status === "COMMITTED";
  }

  function completeServiceOrder(serviceOrderId = "", result = {}, options = {}) {
    const current = getServiceOrder(serviceOrderId);
    if (!current) return { ok: false, reason: "SERVICE_ORDER_NOT_FOUND", order: null };
    const normalizedResult = normalizeServiceResult(result, "SUCCESS");
    if (!["SUCCESS", "PARTIAL_SUCCESS"].includes(normalizedResult.outcome)) {
      return { ok: false, reason: "SERVICE_RESULT_OUTCOME_INVALID_FOR_COMPLETION", order: current };
    }
    const execution = resolveServiceExecutionBoundary(current, normalizedResult, {
      ...options,
      itemCommit: normalizedResult.itemCommit || options.itemCommit,
      itemTransactionId: normalizeId(normalizedResult.itemCommit?.transactionId || options.itemTransactionId || current.billingRefs?.itemTransactionId)
    });
    if (!execution.ok) {
      return {
        ok: false,
        reason: execution.reason,
        transactionId: execution.transactionId || "",
        transactionStatus: execution.transactionStatus || "",
        order: current
      };
    }
    if (execution.itemCommit) normalizedResult.itemCommit = execution.itemCommit;

    const boundItemTransactionId = normalizeId(current.billingRefs?.itemTransactionId);
    if (
      boundItemTransactionId
      && execution.itemCommit?.transactionId
      && boundItemTransactionId !== normalizeId(execution.itemCommit.transactionId)
    ) {
      return {
        ok: false,
        reason: "SERVICE_BILLING_ITEM_TRANSACTION_MISMATCH",
        billingItemTransactionId: boundItemTransactionId,
        resultItemTransactionId: normalizeId(execution.itemCommit.transactionId),
        order: current
      };
    }

    const payableAmount = clampInteger(current.quote?.payableAmount, 0, 999999999, 0);
    const recoveryCompletion = current.paymentStatus === "PAYMENT_RECOVERY_REQUIRED" && options.allowPaymentRecovery === true;
    if (payableAmount > 0 && !BILLING_SETTLED_PAYMENT_STATUSES.has(current.paymentStatus) && !recoveryCompletion) {
      return {
        ok: false,
        reason: "SERVICE_PAYMENT_CAPTURE_REQUIRED",
        paymentStatus: current.paymentStatus,
        billingRefs: clone(current.billingRefs),
        order: current
      };
    }
    return transitionOrder(serviceOrderId, "COMPLETED", {
      completedAt: normalizeId(options.completedAt) || getWorldTime(),
      paymentStatus: current.paymentStatus,
      billingRefs: current.billingRefs,
      result: normalizedResult,
      metadata: {
        ...current.metadata,
        ...(options.metadata || {}),
        completedWithPaymentRecovery: recoveryCompletion,
        serviceExecutionMode: execution.executionMode,
        itemTransactionId: normalizeId(execution.itemCommit?.transactionId || current.billingRefs?.itemTransactionId)
      }
    }, options, "ws:service-order-completed");
  }

  function validateServiceTerminalBillingState(order = {}) {
    const payableAmount = clampInteger(order.quote?.payableAmount, 0, 999999999, 0);
    if (payableAmount <= 0) return { ok: true };
    const refs = normalizeBillingRefs(order.billingRefs);
    const paymentStatus = normalizeToken(order.paymentStatus || "PENDING", "PENDING");
    if (["VOIDED", "REFUNDED", "FAILED", "NOT_REQUIRED", "COVERED", "WAIVED"].includes(paymentStatus)) {
      return { ok: true };
    }
    if (!refs.billingIntentId && !refs.billingTransactionId && paymentStatus === "PENDING") {
      return { ok: true };
    }
    if (["PENDING", "AUTHORIZED"].includes(paymentStatus)) {
      return {
        ok: false,
        reason: "SERVICE_BILLING_VOID_REQUIRED",
        paymentStatus,
        billingIntentId: refs.billingIntentId
      };
    }
    if (["CAPTURED", "PARTIALLY_CAPTURED", "PARTIALLY_REFUNDED", "PAYMENT_RECOVERY_REQUIRED"].includes(paymentStatus)) {
      return {
        ok: false,
        reason: "SERVICE_BILLING_COMPENSATION_REQUIRED",
        paymentStatus,
        billingTransactionId: refs.billingTransactionId
      };
    }
    return { ok: false, reason: "SERVICE_BILLING_TERMINAL_STATE_UNRESOLVED", paymentStatus };
  }

  function failServiceOrder(serviceOrderId = "", failure = {}, options = {}) {
    const current = getServiceOrder(serviceOrderId);
    if (!current) return { ok: false, reason: "SERVICE_ORDER_NOT_FOUND", order: null };
    const billingState = validateServiceTerminalBillingState(current);
    if (!billingState.ok) return { ...billingState, order: current };
    const result = normalizeServiceResult({
      outcome: "FAILED",
      resultCode: failure.resultCode || failure.code || "SERVICE_OPERATION_FAILED",
      failure,
      refundInstruction: failure.refundInstruction,
      metadata: failure.metadata
    }, "FAILED");
    return transitionOrder(serviceOrderId, "FAILED", {
      failedAt: normalizeId(options.failedAt) || getWorldTime(),
      paymentStatus: normalizeToken(options.paymentStatus || current?.paymentStatus || "PENDING", "PENDING"),
      billingRefs: options.billingRefs || current?.billingRefs,
      result
    }, options, "ws:service-order-failed");
  }

  function cancelServiceOrder(serviceOrderId = "", reason = "", options = {}) {
    const current = getServiceOrder(serviceOrderId);
    if (!current) return { ok: false, reason: "SERVICE_ORDER_NOT_FOUND", order: null };
    const billingState = validateServiceTerminalBillingState(current);
    if (!billingState.ok) return { ...billingState, order: current };
    const result = normalizeServiceResult({
      outcome: "CANCELLED",
      resultCode: normalizeToken(options.resultCode || "SERVICE_ORDER_CANCELLED", "SERVICE_ORDER_CANCELLED"),
      metadata: { reason: normalizeId(reason), ...(options.metadata || {}) },
      refundInstruction: options.refundInstruction
    }, "CANCELLED");
    return transitionOrder(serviceOrderId, "CANCELLED", {
      cancelledAt: normalizeId(options.cancelledAt) || getWorldTime(),
      result
    }, options, "ws:service-order-cancelled");
  }

  function getServiceOrderAllowedTransitions(serviceOrderOrStatus = "") {
    const order = typeof serviceOrderOrStatus === "object" && serviceOrderOrStatus
      ? serviceOrderOrStatus
      : getServiceOrder(serviceOrderOrStatus);
    const status = normalizeToken(order?.status || serviceOrderOrStatus, "DRAFT");
    return Array.from(TRANSITIONS[status] || []);
  }

  function getServiceOrderLifecycleDescriptor(serviceOrderOrStatus = "") {
    const order = typeof serviceOrderOrStatus === "object" && serviceOrderOrStatus
      ? clone(serviceOrderOrStatus)
      : getServiceOrder(serviceOrderOrStatus);
    const status = normalizeToken(order?.status || serviceOrderOrStatus, "DRAFT");
    return {
      recordDomain: "SERVICE_BRIDGE_ORDER",
      status,
      terminal: TERMINAL_ORDER_STATUSES.has(status),
      revision: Number(order?.revision || 0),
      allowedTransitions: getServiceOrderAllowedTransitions(order || status)
    };
  }

  function getServiceBridgeStoreRevision() {
    return storeRevision;
  }

  function getServiceBridgeOperationalContract() {
    return {
      schemaVersion: "services_bridge_operational_contract_2_5x",
      ownership: {
        serviceDefinitions: "SERVICES",
        serviceOffers: "SERVICES",
        serviceOrders: "SERVICES",
        subscriptionContracts: "SUBSCRIPTIONS",
        coverageCalculation: "SHARED_COVERAGE",
        billingIntents: "BILLING",
        itemInstances: "ITEM_INSTANCE",
        notifications: "TERMINAL_NOTIFICATIONS"
      },
      commandContract: {
        idempotencyKeyRequired: true,
        idempotentReplayReturnsStoredResult: true,
        duplicateDomainEventsAllowed: false,
        expectedRevisionSupported: true,
        staleRevisionRejected: true
      },
      entitlementContract: {
        resolver: "resolveSubscriptionEntitlement",
        serviceAdapter: "resolveServiceEntitlements",
        revalidatedAtAuthorization: true,
        manualSubscriptionRefsAuthoritative: false
      },
      coverageContract: {
        resolver: "resolveCoverage",
        recalculatedAtOrderCreation: true,
        recalculatedAtAuthorization: true,
        explicitRequoteAcceptanceRequired: true,
        callerCoveredAmountAuthoritative: false
      },
      billingContract: {
        authorizeBeforeExecution: true,
        captureBeforeCompletion: true,
        captureRequiresCanonicalExecutionProof: true,
        refundRequiresCanonicalCompensationProof: true,
        explicitCaptureCommand: "captureServiceOrderBilling",
        explicitVoidCommand: "voidServiceOrderBilling",
        explicitRefundCommand: "refundServiceOrderBilling",
        directBalanceMutationAllowed: false
      },
      itemTransactionContract: {
        externalCommitRequiredForMutations: true,
        commitConfirmationRequiredForCompletion: true,
        serviceResultCommitApi: "commitItemInstanceServiceResult",
        compensationApi: "compensateItemInstanceTransaction",
        directItemMutationAllowed: false
      },
      notificationContract: {
        producer: "emitServiceOrderNotification",
        revisionedEvents: true,
        aggregationOwnsDeduplication: true,
        directTerminalEntryMutationAllowed: false
      },
      runtimeVerification: {
        staticAuditMutatesState: false,
        browserScenarioExecutionRequired: true
      }
    };
  }

  function getServiceBridgeDiagnostics() {
    const invalidDefinitions = (Array.isArray(window.APP_DATA?.serviceDefinitions) ? window.APP_DATA.serviceDefinitions : []).length - definitionIndex.size;
    const invalidProviders = (Array.isArray(window.APP_DATA?.serviceProviderCapabilityManifests) ? window.APP_DATA.serviceProviderCapabilityManifests : []).length - providerIndex.size;
    const definitions = Array.from(definitionIndex.values());
    const entitlementPolicies = definitions.filter((definition) => definition.entitlementPolicy?.providerRules?.length).length;
    const entitlementRules = definitions.reduce((total, definition) => total + (definition.entitlementPolicy?.providerRules?.length || 0), 0);
    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      subscriptionEntitlementBridgeVersion: "services_subscription_entitlement_bridge_2_2x",
      subscriptionEntitlementResolverConnected: typeof app.resolveSubscriptionEntitlement === "function",
      coverageBridgeVersion: "services_coverage_bridge_2_3x",
      coverageResolverVersion: normalizeId(app.COVERAGE_RESOLVER_API_VERSION),
      coverageResolverConnected: typeof app.resolveCoverage === "function",
      billingIntentBridgeVersion: "services_billing_intent_bridge_2_4x",
      operationalContractVersion: "services_bridge_operational_contract_2_5x",
      billingIntentBridgeConnected: [
        "createBillingIntent",
        "authorizeBillingIntent",
        "captureBillingIntent",
        "voidBillingIntent",
        "refundBillingTransaction",
        "getBillingIntent",
        "getBillingTransaction"
      ].every((name) => typeof app[name] === "function"),
      itemTransactionBoundaryConnected: [
        "getItemInstanceTransaction",
        "commitItemInstanceServiceResult",
        "compensateItemInstanceTransaction"
      ].every((name) => typeof app[name] === "function"),
      transactionBoundBilling: true,
      storeRevision,
      definitions: definitionIndex.size,
      entitlementPolicies,
      entitlementRules,
      providers: providerIndex.size,
      offers: offersById.size,
      orders: ordersById.size,
      orderStatusIndexes: Object.fromEntries(Array.from(orderIdsByStatus.entries()).map(([status, ids]) => [status, ids.length])),
      idempotencyEntries: idempotencyByKey.size,
      invalidDefinitions,
      invalidProviders
    };
  }

  function resetServiceBridgeRuntime(options = {}) {
    offersById = new Map();
    ordersById = new Map();
    idempotencyByKey = new Map();
    storeRevision += 1;
    rebuildRecordIndexes();
    if (options.persist !== false) schedulePersistence();
    return getServiceBridgeDiagnostics();
  }

  initializeState();

  Object.assign(app, {
    SERVICE_BRIDGE_SCHEMA_VERSION: STORAGE_SCHEMA_VERSION,
    SERVICE_SUBSCRIPTION_ENTITLEMENT_BRIDGE_SCHEMA_VERSION: "services_subscription_entitlement_bridge_2_2x",
    SERVICE_COVERAGE_BRIDGE_SCHEMA_VERSION: "services_coverage_bridge_2_3x",
    SERVICE_BILLING_INTENT_BRIDGE_SCHEMA_VERSION: "services_billing_intent_bridge_2_4x",
    SERVICE_BRIDGE_OPERATIONAL_CONTRACT_SCHEMA_VERSION: "services_bridge_operational_contract_2_5x",
    getServiceDefinition,
    getServiceDefinitions,
    getProvider,
    searchProviders,
    getProviderCapabilities: getProviderServiceCapabilities,
    getProviderServiceCapabilities,
    providerSupports,
    getServiceOffer,
    getServiceOrder,
    getServiceOrders,
    getCitizenServiceOrders,
    getProviderServiceOrders,
    quoteService,
    resolveServiceEntitlements,
    validateServiceEligibility,
    createServiceOffer,
    createServiceOrderFromOffer,
    authorizeServiceOrder,
    captureServiceOrderBilling,
    voidServiceOrderBilling,
    refundServiceOrderBilling,
    getServiceOrderBillingState,
    scheduleServiceOrder,
    startServiceOrder,
    completeServiceOrder,
    failServiceOrder,
    cancelServiceOrder,
    getServiceOrderAllowedTransitions,
    getServiceOrderLifecycleDescriptor,
    getServiceBridgeStoreRevision,
    getServiceBridgeOperationalContract,
    getServiceBridgeDiagnostics,
    flushServiceBridgePersistence,
    resetServiceBridgeRuntime
  });
})();
