window.WS_APP = window.WS_APP || {};

(function initCyberwareWorldBridge() {
  const app = window.WS_APP;
  if (app.cyberwareWorldBridge?.version === "16.1x") return;

  const clone = app.storeUtils?.clone || ((value) => {
    if (value === undefined) return undefined;
    try { return structuredClone(value); } catch (error) { return JSON.parse(JSON.stringify(value)); }
  });

  const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED", "RECOVERY_REQUIRED", "PAYMENT_RECOVERY_REQUIRED", "COMPENSATION_REQUIRED"]);
  const SERVICE_OPERATION_TYPES = new Set([
    "INSTALL", "DEINSTALL", "REPLACE", "MAINTENANCE", "DIAGNOSTIC", "REPAIR", "CALIBRATION", "CLEAN", "FIRMWARE_UPDATE", "LICENSE_REVIEW",
    "INSTALL_MODULE", "REMOVE_MODULE", "REPLACE_MODULE", "APPLY_PERMANENT_MOD"
  ]);
  const PURCHASE_OPERATION_TYPES = new Set(["PURCHASE_TO_HOUSING", "PURCHASE_AND_INSTALL"]);
  const RECOVERY_STATUSES = new Set(["RECOVERY_REQUIRED", "PAYMENT_RECOVERY_REQUIRED", "COMPENSATION_REQUIRED"]);
  const AUTO_RESUME_OPERATION_STATUSES = new Set([
    "SCHEDULED", "IN_PROGRESS", "COMMITTING", "CAPTURING", "RECOVERY_REQUIRED", "PAYMENT_RECOVERY_REQUIRED"
  ]);
  const PHYSICAL_REFRESH_DOMAINS = new Set(["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE"]);
  const COMPENSATABLE_OPERATION_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED", "RECOVERY_REQUIRED", "PAYMENT_RECOVERY_REQUIRED", "COMPENSATION_REQUIRED"]);
  const COMPENSATION_RETRY_STATUSES = new Set(["IN_PROGRESS", "RECOVERY_REQUIRED", "REQUIRED"]);
  const DIRECT_EXECUTION_MODES = new Set(["ADMIN_DIRECT_OPERATION", "DEVELOPER_DIRECT_OPERATION"]);
  const SERVICE_DEFINITION_BY_OPERATION = Object.freeze({
    INSTALL: "svc-cyberware-install-standard",
    DEINSTALL: "svc-cyberware-deinstall-standard",
    REPLACE: "svc-cyberware-replace-standard",
    MAINTENANCE: "svc-cyberware-diagnostic-standard",
    DIAGNOSTIC: "svc-cyberware-diagnostic-standard",
    REPAIR: "svc-cyberware-repair-standard",
    CALIBRATION: "svc-cyberware-calibrate-standard",
    CALIBRATE: "svc-cyberware-calibrate-standard",
    CLEAN: "svc-cyberware-clean-standard",
    FIRMWARE_UPDATE: "svc-firmware-update-standard",
    LICENSE_REVIEW: "svc-license-review-standard",
    INSTALL_MODULE: "svc-cyberware-module-install-standard",
    REMOVE_MODULE: "svc-cyberware-module-remove-standard",
    REPLACE_MODULE: "svc-cyberware-module-replace-standard",
    APPLY_PERMANENT_MOD: "svc-cyberware-permanent-modification-standard"
  });
  const CAPABILITY_BY_OPERATION = Object.freeze({
    INSTALL: "CYBERWARE_INSTALL",
    DEINSTALL: "CYBERWARE_DEINSTALL",
    REPLACE: "CYBERWARE_REPLACE",
    MAINTENANCE: "CYBERWARE_DIAGNOSTIC",
    DIAGNOSTIC: "CYBERWARE_DIAGNOSTIC",
    REPAIR: "CYBERWARE_REPAIR",
    CALIBRATION: "CYBERWARE_CALIBRATE",
    CALIBRATE: "CYBERWARE_CALIBRATE",
    CLEAN: "CYBERWARE_CLEAN",
    FIRMWARE_UPDATE: "FIRMWARE_UPDATE",
    LICENSE_REVIEW: "LICENSE_REVIEW",
    INSTALL_MODULE: "CYBERWARE_MODULE_INSTALL",
    REMOVE_MODULE: "CYBERWARE_MODULE_REMOVE",
    REPLACE_MODULE: "CYBERWARE_MODULE_REPLACE",
    APPLY_PERMANENT_MOD: "CYBERWARE_PERMANENT_MODIFICATION"
  });

  const emittedRevisionByOperationId = new Map();
  const refreshTimerByCitizenId = new Map();
  const pendingRefreshDomainsByCitizenId = new Map();
  const activeResumeOperationIds = new Set();
  const resumeSignatureByOperationId = new Map();
  const activeCompensationByOperationId = new Map();
  const diagnostics = {
    quotes: 0,
    starts: 0,
    completions: 0,
    failures: 0,
    dependencyBlocks: 0,
    physicalCommits: 0,
    finalEvents: 0,
    physicalTerminalEvents: 0,
    statusOnlyTerminalEvents: 0,
    statusOnlyRefreshSkips: 0,
    workspaceRefreshes: 0,
    refreshCoalesces: 0,
    idempotentStartReplays: 0,
    replayShortCircuits: 0,
    revisionConflicts: 0,
    revisionRetries: 0,
    operationMutationFailures: 0,
    resumeAttempts: 0,
    resumeSuppressed: 0,
    startupResumeCandidates: 0,
    compensationRetryBlocks: 0,
    compensationQuotes: 0,
    compensationAttempts: 0,
    compensationReplays: 0,
    compensationSuccesses: 0,
    compensationFailures: 0,
    compensationRetries: 0,
    compensationResumes: 0,
    compensationResumeSuppressions: 0,
    itemTransactionCompensations: 0,
    serviceBillingVoids: 0,
    serviceBillingRefunds: 0,
    marketRefunds: 0,
    marketCancellationCompensations: 0,
    marketRefundStagingTransactions: 0
  };

  function id(value = "") { return String(value || "").trim(); }
  function token(value = "", fallback = "") {
    const normalized = String(value || fallback).trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return normalized || fallback;
  }
  function finite(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
  function unique(values = []) { return [...new Set((Array.isArray(values) ? values : []).map(id).filter(Boolean))]; }
  function now() { return id(app.getCampaignDateIso?.() || app.CAMPAIGN_DATE_ISO || new Date().toISOString()); }
  function makeKey(prefix = "cw", input = {}) {
    const source = id(input.idempotencyKey);
    if (source) return source;
    const parts = [prefix, input.citizenId, input.operationType || input.operation, input.instanceId, input.sourceItemId, input.targetItemId, input.marketOfferId, Date.now().toString(36)];
    return parts.map((part) => id(part).replace(/[^A-Za-z0-9:_-]+/g, "_")).filter(Boolean).join(":");
  }
  function resultOf(response = {}) { return response?.operation || response?.record || response?.worldBridgeOperation || response || null; }
  function isDirectMode(options = {}) { return DIRECT_EXECUTION_MODES.has(token(options.executionMode || options.mode)); }
  function normalizeOperation(value = "") {
    const normalized = token(value || "INSTALL", "INSTALL");
    if (normalized === "CALIBRATE") return "CALIBRATION";
    if (normalized === "FIRMWARE") return "FIRMWARE_UPDATE";
    return normalized;
  }
  function normalizeDomains(values = []) {
    return [...new Set((Array.isArray(values) ? values : [values]).map((value) => token(value)).filter(Boolean))];
  }
  function hasPhysicalRefreshDomain(values = []) {
    return normalizeDomains(values).some((domain) => PHYSICAL_REFRESH_DOMAINS.has(domain));
  }
  function operationFailureCode(operation = {}) {
    return token(operation?.retry?.lastErrorCode || operation?.errors?.[operation?.errors?.length - 1]?.code || "");
  }
  function mutateWorldOperation(methodName = "", operationId = "", payload = {}, options = {}) {
    const method = app[methodName];
    const normalizedOperationId = id(operationId);
    if (typeof method !== "function") {
      diagnostics.operationMutationFailures += 1;
      return { ok: false, reason: `WORLD_BRIDGE_OPERATION_API_MISSING:${token(methodName)}`, operation: getGenericOperation(normalizedOperationId) };
    }
    let current = getGenericOperation(normalizedOperationId);
    if (!current) {
      diagnostics.operationMutationFailures += 1;
      return { ok: false, reason: "WORLD_BRIDGE_OPERATION_NOT_FOUND", operation: null };
    }
    const invoke = (revision) => method(normalizedOperationId, payload, {
      ...options,
      expectedRevision: revision
    });
    let response = invoke(current.revision);
    if (response?.ok === false && response.reason === "WORLD_BRIDGE_OPERATION_STALE_REVISION" && options.retryStale !== false) {
      diagnostics.revisionConflicts += 1;
      current = getGenericOperation(normalizedOperationId) || response.operation || current;
      response = invoke(current.revision);
      if (response?.ok !== false) diagnostics.revisionRetries += 1;
    }
    if (response?.ok === false) diagnostics.operationMutationFailures += 1;
    return response || { ok: false, reason: "WORLD_BRIDGE_OPERATION_MUTATION_FAILED", operation: current };
  }
  function buildResumeSignature(operation = {}, serviceOrder = {}) {
    return [
      id(operation.operationId),
      Math.max(0, Number(operation.revision || 0) || 0),
      token(operation.status),
      id(serviceOrder.serviceOrderId),
      Math.max(0, Number(serviceOrder.revision || 0) || 0),
      token(serviceOrder.status),
      id(operation.refs?.itemTransactionId)
    ].join(":");
  }
  function findRequestedIdempotentReplay(input = {}) {
    const idempotencyKey = id(input.idempotencyKey);
    if (!idempotencyKey || typeof app.getWorldBridgeOperationByIdempotencyKey !== "function") return null;
    const operation = app.getWorldBridgeOperationByIdempotencyKey(idempotencyKey);
    return operation ? { ok: true, replayed: true, idempotencyKey, operation } : null;
  }
  function buildIdempotentStartReplay(created = {}, quote = null) {
    if (created?.replayed !== true || !created.operation) return null;
    diagnostics.idempotentStartReplays += 1;
    diagnostics.replayShortCircuits += 1;
    const operation = getGenericOperation(created.operation.operationId) || created.operation;
    const projected = projectOperation(operation);
    const status = token(operation.status);
    const successful = ["COMPLETED", "SCHEDULED", "IN_PROGRESS", "COMMITTING", "CAPTURING", "AUTHORIZED", "RESERVING", "VALIDATING", "DRAFT"].includes(status);
    return {
      ok: successful,
      replayed: true,
      recoveryRequired: RECOVERY_STATUSES.has(status),
      status,
      reason: status === "COMPLETED"
        ? "IDEMPOTENT_REPLAY"
        : operationFailureCode(operation) || `CYBERWARE_WORLD_OPERATION_${status || "REPLAYED"}`,
      operation: projected,
      quote
    };
  }
  function getOperationStoreApiState() {
    const required = [
      "createWorldBridgeOperation",
      "getWorldBridgeOperation",
      "getWorldBridgeOperationByIdempotencyKey",
      "getWorldBridgeOperations",
      "getWorldBridgeOperationsByReference",
      "transitionWorldBridgeOperation",
      "attachWorldBridgeOperationReferences",
      "updateWorldBridgeOperation",
      "registerWorldBridgeOperationRecoveryHandler",
      "retryWorldBridgeOperation"
    ];
    const missing = required.filter((name) => typeof app[name] !== "function");
    return { ready: missing.length === 0, missing };
  }
  function getDependencyState(operationType = "") {
    const operation = normalizeOperation(operationType);
    const generic = getOperationStoreApiState();
    const serviceApis = ["quoteService", "createServiceOffer", "createServiceOrderFromOffer", "authorizeServiceOrder", "startServiceOrder", "completeServiceOrder"];
    const marketApis = ["createMarketCart", "updateMarketCart", "quoteMarketCart", "checkoutMarketCart"];
    const missingServiceApis = SERVICE_OPERATION_TYPES.has(operation) ? serviceApis.filter((name) => typeof app[name] !== "function") : [];
    const missingMarketApis = PURCHASE_OPERATION_TYPES.has(operation) ? marketApis.filter((name) => typeof app[name] !== "function") : [];
    const missingTransactionApis = ["commitItemInstanceTransaction", "getItemInstanceTransaction"].filter((name) => typeof app[name] !== "function");
    const marketServiceReady = operation !== "PURCHASE_AND_INSTALL"
      || (Boolean(app.MARKET_SERVICE_FULFILLMENT_SCHEMA_VERSION)
        && typeof app.finalizeMarketServiceFulfillment === "function"
        && typeof app.failMarketServiceFulfillment === "function");
    const missing = [
      ...generic.missing,
      ...missingServiceApis,
      ...missingMarketApis,
      ...missingTransactionApis,
      ...(marketServiceReady ? [] : ["MARKET_SERVICE_FULFILLMENT_4_3X"])
    ];
    return {
      ready: missing.length === 0,
      operationType: operation,
      missing: [...new Set(missing)],
      operationStoreReady: generic.ready,
      marketServiceReady
    };
  }
  function dependencyFailure(operationType = "") {
    const dependency = getDependencyState(operationType);
    diagnostics.dependencyBlocks += 1;
    return {
      ok: false,
      status: "BLOCKED",
      reason: "WORLD_BRIDGE_DEPENDENCY_MISSING",
      operationType: normalizeOperation(operationType),
      blockers: dependency.missing.map((name) => `DEPENDENCY_MISSING:${name}`),
      missingDependencies: dependency.missing,
      dependency
    };
  }
  function selectProvider(operationType = "", preferredProviderId = "") {
    const preferred = id(preferredProviderId);
    const capability = CAPABILITY_BY_OPERATION[normalizeOperation(operationType)] || "";
    if (preferred) {
      const provider = app.getProvider?.(preferred);
      if (!provider) return { ok: false, reason: "PROVIDER_NOT_FOUND", provider: null, capability };
      if (capability && app.providerSupports?.(preferred, capability) !== true) return { ok: false, reason: `PROVIDER_CAPABILITY_REQUIRED:${capability}`, provider, capability };
      return { ok: true, provider, providerId: preferred, capability };
    }
    const providers = typeof app.searchProviders === "function"
      ? app.searchProviders({ capability, active: true })
      : [];
    const provider = (Array.isArray(providers) ? providers : []).find((entry) => !capability || app.providerSupports?.(entry.providerId, capability) === true) || null;
    return provider
      ? { ok: true, provider, providerId: id(provider.providerId), capability }
      : { ok: false, reason: `PROVIDER_CAPABILITY_REQUIRED:${capability || "CYBERWARE_SERVICE"}`, provider: null, capability };
  }
  function getSubjectInstanceIds(input = {}) {
    return unique([
      ...(Array.isArray(input.instanceIds) ? input.instanceIds : []),
      input.instanceId,
      input.itemId,
      input.sourceItemId,
      input.targetItemId,
      input.oldInstanceId,
      input.newInstanceId,
      input.hostInstanceId,
      input.moduleInstanceId,
      input.oldModuleInstanceId,
      input.newModuleInstanceId
    ]);
  }
  function buildRecoveryInput(input = {}, quote = {}) {
    const operationType = normalizeOperation(input.operationType || input.operation || quote.operationType);
    return {
      operationType,
      citizenId: id(input.citizenId || quote.citizenId),
      providerId: id(input.providerId || quote.providerId || quote.servicePreview?.providerId),
      serviceDefinitionId: id(input.serviceDefinitionId || quote.serviceDefinitionId || quote.servicePreview?.serviceDefinitionId),
      marketOfferId: id(input.marketOfferId || quote.marketOfferId),
      catalogItemId: id(input.catalogItemId || quote.catalogItemId),
      instanceIds: getSubjectInstanceIds(input),
      instanceId: id(input.instanceId || input.itemId),
      sourceItemId: id(input.sourceItemId || input.newInstanceId),
      targetItemId: id(input.targetItemId || input.oldInstanceId),
      primarySlot: id(input.primarySlot || quote.plan?.primarySlot),
      targetBodySlots: unique(input.targetBodySlots || quote.plan?.occupiedSlots),
      returnDestinationId: id(input.returnDestinationId),
      returnDestination: input.returnDestination && typeof input.returnDestination === "object" ? clone(input.returnDestination) : null,
      surgeryPreset: id(input.surgeryPreset || "LOCAL_CLINIC"),
      maintenanceOperation: token(input.maintenanceOperation || ""),
      firmwareReleaseId: id(input.firmwareReleaseId || input.releaseId),
      hostInstanceId: id(input.hostInstanceId || input.instanceId),
      moduleInstanceId: id(input.moduleInstanceId || input.newModuleInstanceId),
      oldModuleInstanceId: id(input.oldModuleInstanceId),
      slotId: id(input.slotId || input.moduleSlotId),
      modificationId: id(input.modificationId),
      scheduledStartAt: id(input.scheduledStartAt),
      estimatedEndAt: id(input.estimatedEndAt),
      paymentSource: id(input.paymentSource || "CREDITS"),
      coverageAuthorizations: Array.isArray(input.coverageAuthorizations) ? clone(input.coverageAuthorizations) : [],
      housingStorageId: id(input.housingStorageId || input.destinationHousingStorageId),
      quantity: Math.max(1, Math.round(finite(input.quantity, 1))),
      grossPrice: Math.max(0, Math.round(finite(input.grossPrice ?? quote.quote?.grossPrice ?? quote.marketQuote?.totals?.finalTotal, 0))),
      estimatedDurationMinutes: Math.max(0, Math.round(finite(input.estimatedDurationMinutes ?? quote.quote?.estimatedDurationMinutes, 0))),
      plan: (input.plan && typeof input.plan === "object") || (quote.plan && typeof quote.plan === "object")
        ? clone(input.plan || quote.plan)
        : null
    };
  }
  function serviceDefinitionFor(operationType = "", override = "") {
    return id(override) || SERVICE_DEFINITION_BY_OPERATION[normalizeOperation(operationType)] || "";
  }
  function buildPlannerPlan(input = {}) {
    const operation = normalizeOperation(input.operationType || input.operation);
    if (!["INSTALL", "DEINSTALL", "REPLACE"].includes(operation)) return null;
    if (input.plan && typeof input.plan === "object") return clone(input.plan);
    if (typeof app.buildCyberwareOperationPlan !== "function") return null;
    return app.buildCyberwareOperationPlan(id(input.citizenId), {
      operation,
      sourceItemId: id(input.sourceItemId || input.instanceId),
      targetItemId: id(input.targetItemId),
      returnDestinationId: id(input.returnDestinationId),
      primarySlot: id(input.primarySlot),
      surgeryPreset: id(input.surgeryPreset || "LOCAL_CLINIC")
    });
  }
  function quoteCyberwareService(input = {}) {
    diagnostics.quotes += 1;
    const operationType = normalizeOperation(input.operationType || input.operation || "MAINTENANCE");
    const citizenId = id(input.citizenId);
    const blockers = [];
    const warnings = [];
    if (!citizenId) blockers.push("CITIZEN_ID_REQUIRED");
    const providerResult = selectProvider(operationType, input.providerId);
    if (!providerResult.ok) blockers.push(providerResult.reason);
    const plan = buildPlannerPlan({ ...input, operationType });
    if (["INSTALL", "DEINSTALL", "REPLACE"].includes(operationType)) {
      if (!plan) blockers.push("CYBERWARE_PLAN_UNAVAILABLE");
      else if (plan.valid !== true) blockers.push(...(plan.blockers?.length ? plan.blockers : [plan.reason || "CYBERWARE_PLAN_BLOCKED"]));
      warnings.push(...(plan?.warnings || []));
    }
    let upgradeQuote = null;
    if (["INSTALL_MODULE", "REMOVE_MODULE", "REPLACE_MODULE", "APPLY_PERMANENT_MOD"].includes(operationType)) {
      upgradeQuote = app.buildCyberwareUpgradeQuote?.({ ...input, operationType, citizenId }) || null;
      if (!upgradeQuote) blockers.push("CYBERWARE_UPGRADE_QUOTE_API_REQUIRED");
      else if (upgradeQuote.ok !== true) blockers.push(...(upgradeQuote.blockers?.length ? upgradeQuote.blockers : [upgradeQuote.reason || "CYBERWARE_UPGRADE_BLOCKED"]));
      warnings.push(...(upgradeQuote?.warnings || []));
    }
    let maintenanceQuote = null;
    if (["MAINTENANCE", "DIAGNOSTIC", "REPAIR", "CALIBRATION", "CLEAN", "FIRMWARE_UPDATE"].includes(operationType)) {
      const itemId = id(input.instanceId || input.itemId);
      const item = itemId ? app.getItemInstanceView?.(itemId) : null;
      if (!item) blockers.push("ITEM_INSTANCE_NOT_FOUND");
      if (item && typeof app.buildCyberwareMaintenanceQuote === "function") {
        const maintenanceOperation = operationType === "CALIBRATION" ? "CALIBRATE" : operationType === "FIRMWARE_UPDATE" ? "FIRMWARE" : operationType === "MAINTENANCE" ? token(input.maintenanceOperation || "DIAGNOSTIC") : operationType;
        maintenanceQuote = app.buildCyberwareMaintenanceQuote(app.getCitizenById?.(citizenId), item, maintenanceOperation);
        if (maintenanceQuote?.valid === false) blockers.push(...(maintenanceQuote.blockers || [maintenanceQuote.reason || "MAINTENANCE_BLOCKED"]));
        warnings.push(...(maintenanceQuote?.warnings || []));
      }
    }
    if (operationType === "FIRMWARE_UPDATE") {
      const firmware = app.resolveFirmwareEligibility?.({ citizenId, instanceId: id(input.instanceId || input.itemId), firmwareReleaseId: input.firmwareReleaseId });
      if (firmware && firmware.allowed !== true) blockers.push(...(firmware.blockers || [firmware.reason || "FIRMWARE_BLOCKED"]));
      warnings.push(...(firmware?.warnings || []));
    }
    const grossPrice = Math.max(0, Math.round(finite(input.grossPrice ?? plan?.procedureCost ?? maintenanceQuote?.cost ?? upgradeQuote?.cost, 0)));
    const estimatedDurationMinutes = Math.max(0, Math.round(finite(input.estimatedDurationMinutes ?? plan?.durationMinutes ?? maintenanceQuote?.durationMinutes ?? upgradeQuote?.durationMinutes, 0)));
    const serviceDefinitionId = serviceDefinitionFor(operationType, input.serviceDefinitionId);
    const subjectRefs = {
      instanceIds: getSubjectInstanceIds(input),
      targetCharacterId: citizenId,
      targetBodySlots: unique(input.targetBodySlots || plan?.occupiedSlots || [plan?.primarySlot || input.primarySlot]),
      returnLocation: plan?.returnDestination || upgradeQuote?.returnDestination || input.returnDestination || null,
      parentItemInstanceId: id(input.hostInstanceId || upgradeQuote?.hostInstanceId),
      moduleSlotId: id(input.slotId || upgradeQuote?.slotId)
    };
    let domainQuote = null;
    if (!blockers.length && typeof app.quoteService === "function") {
      domainQuote = app.quoteService({
        citizenId,
        providerId: providerResult.providerId,
        serviceDefinitionId,
        subjectRefs,
        grossPrice,
        estimatedDurationMinutes,
        currency: input.currency || "CREDIT",
        coverageAuthorizations: input.coverageAuthorizations,
        metadata: { operationType, source: "CYBERWARE_WORLD_BRIDGE_16_1X" }
      });
      if (domainQuote?.ok !== true) blockers.push(...(domainQuote?.blockers || [domainQuote?.reason || "SERVICE_QUOTE_BLOCKED"]));
      warnings.push(...(domainQuote?.warnings || []));
    }
    return {
      ok: blockers.length === 0,
      status: blockers.length ? "BLOCKED" : warnings.length ? "ADVISORY" : "QUOTED",
      reason: blockers[0] || warnings[0] || "CYBERWARE_SERVICE_QUOTED",
      operationType,
      citizenId,
      providerId: providerResult.providerId || "",
      provider: providerResult.provider || null,
      serviceDefinitionId,
      instanceIds: subjectRefs.instanceIds,
      subjectRefs,
      plan,
      maintenanceQuote,
      upgradeQuote,
      serviceQuote: domainQuote,
      quote: domainQuote?.quote || {
        grossPrice,
        coveredAmount: 0,
        payableAmount: grossPrice,
        estimatedDurationMinutes,
        currency: input.currency || "CREDIT"
      },
      blockers: [...new Set(blockers.filter(Boolean))],
      warnings: [...new Set(warnings.filter(Boolean))],
      evaluatedAt: now()
    };
  }
  function buildVirtualMarketCart(input = {}, offer = null) {
    const operationType = normalizeOperation(input.operationType || (input.install === true ? "PURCHASE_AND_INSTALL" : "PURCHASE_TO_HOUSING"));
    const fulfillmentMode = operationType === "PURCHASE_AND_INSTALL" ? "PURCHASE_WITH_SERVICE" : "DELIVER_TO_HOUSING";
    return {
      cartId: id(input.cartId) || `cw_quote_${Date.now().toString(36)}`,
      citizenId: id(input.citizenId),
      status: "DRAFT",
      revision: 1,
      lines: [{
        cartLineId: "cw_quote_line_1",
        marketOfferId: id(input.marketOfferId || offer?.marketOfferId),
        quantity: Math.max(1, Math.round(finite(input.quantity, 1))),
        fulfillmentMode,
        destinationRef: {
          housingStorageId: id(input.housingStorageId)
        },
        linkedServiceSelection: fulfillmentMode === "PURCHASE_WITH_SERVICE" ? {
          serviceDefinitionId: serviceDefinitionFor("INSTALL", input.serviceDefinitionId),
          providerId: id(input.providerId),
          targetCharacterId: id(input.citizenId),
          targetBodySlots: unique(input.targetBodySlots || input.bodySlots || [input.primarySlot]),
          scheduledStartAt: id(input.scheduledStartAt),
          estimatedEndAt: id(input.estimatedEndAt),
          coverageAuthorizations: unique(input.coverageAuthorizations)
        } : null
      }]
    };
  }
  function quoteCyberwarePurchase(input = {}) {
    diagnostics.quotes += 1;
    const operationType = normalizeOperation(input.operationType || (input.install === true ? "PURCHASE_AND_INSTALL" : "PURCHASE_TO_HOUSING"));
    const citizenId = id(input.citizenId);
    const blockers = [];
    const warnings = [];
    if (!citizenId) blockers.push("CITIZEN_ID_REQUIRED");
    const offer = app.getMarketOffer?.(id(input.marketOfferId)) || app.getMarketOfferByCatalogItemId?.(id(input.catalogItemId)) || null;
    if (!offer) blockers.push("MARKET_OFFER_NOT_FOUND");
    if (operationType === "PURCHASE_TO_HOUSING" && !id(input.housingStorageId)) blockers.push("HOUSING_DESTINATION_REQUIRED");
    let servicePreview = null;
    let effectiveInput = { ...input, operationType };
    if (operationType === "PURCHASE_AND_INSTALL") {
      const provider = selectProvider("INSTALL", input.providerId);
      if (!provider.ok) blockers.push(provider.reason);
      servicePreview = { providerId: provider.providerId || "", serviceDefinitionId: serviceDefinitionFor("INSTALL", input.serviceDefinitionId), capability: provider.capability };
      effectiveInput = {
        ...effectiveInput,
        providerId: id(input.providerId || servicePreview.providerId),
        serviceDefinitionId: id(input.serviceDefinitionId || servicePreview.serviceDefinitionId)
      };
    }
    const cart = buildVirtualMarketCart(effectiveInput, offer);
    const marketQuote = offer && typeof app.quoteMarketCart === "function" ? app.quoteMarketCart(cart) : null;
    if (marketQuote?.ok !== true) blockers.push(...(marketQuote?.blockers || [marketQuote?.reason || "MARKET_QUOTE_BLOCKED"]));
    return {
      ok: blockers.length === 0,
      status: blockers.length ? "BLOCKED" : "QUOTED",
      reason: blockers[0] || "CYBERWARE_PURCHASE_QUOTED",
      operationType,
      citizenId,
      marketOfferId: id(offer?.marketOfferId),
      catalogItemId: id(offer?.catalogItemId),
      vendorProviderId: id(offer?.vendorProviderId),
      servicePreview,
      marketQuote,
      quote: marketQuote?.totals || null,
      blockers: [...new Set(blockers.filter(Boolean))],
      warnings: [...new Set(warnings.filter(Boolean))],
      evaluatedAt: now()
    };
  }

  function createGenericOperation(input = {}, quote = {}) {
    const idempotencyKey = makeKey("cyberware-world", input);
    const replay = app.getWorldBridgeOperationByIdempotencyKey?.(idempotencyKey);
    if (replay) return { ok: true, operation: replay, replayed: true, idempotencyKey };
    const instanceIds = getSubjectInstanceIds(input);
    const response = app.createWorldBridgeOperation?.({
      operationType: `CYBERWARE_${normalizeOperation(input.operationType || input.operation)}`,
      citizenId: id(input.citizenId),
      providerId: id(input.providerId || quote.providerId || quote.servicePreview?.providerId),
      status: "DRAFT",
      currentStep: "DRAFT",
      idempotencyKey,
      refs: { instanceIds },
      claims: instanceIds.map((instanceId) => ({ resourceType: "ITEM_INSTANCE", resourceId: instanceId })),
      recoveryHandlerId: `CYBERWARE_${normalizeOperation(input.operationType || input.operation)}`,
      metadata: {
        source: "CYBERWARE_WORLD_BRIDGE_16_1X",
        cyberwareOperationType: normalizeOperation(input.operationType || input.operation),
        serviceDefinitionId: id(input.serviceDefinitionId || quote.serviceDefinitionId),
        marketOfferId: id(input.marketOfferId),
        planId: id(input.plan?.planId || quote.plan?.planId),
        recoveryInput: buildRecoveryInput(input, quote)
      }
    });
    const operation = resultOf(response);
    return operation ? { ok: response?.ok !== false, operation, replayed: response?.replayed === true || response?.replay === true, idempotencyKey } : { ok: false, reason: response?.reason || "WORLD_BRIDGE_OPERATION_CREATE_FAILED" };
  }
  function getGenericOperation(operationId = "") { return app.getWorldBridgeOperation?.(id(operationId)) || null; }
  function normalizeWorldStep(step = "") {
    const value = token(step);
    if (["VALIDATE", "VALIDATING"].includes(value)) return "VALIDATE";
    if (["RESERVE", "RESERVING", "MARKET_CHECKOUT"].includes(value)) return "RESERVE";
    if (["AUTHORIZE", "AUTHORIZED"].includes(value)) return "AUTHORIZE";
    if (["SCHEDULE", "SCHEDULED", "WAITING_FOR_SERVICE_TIME"].includes(value)) return "SCHEDULE";
    if (["EXECUTE", "IN_PROGRESS", "SERVICE_EXECUTION"].includes(value)) return "EXECUTE";
    if (["COMMIT", "COMMITTING", "ITEM_COMMIT", "PURCHASE_INSTALL"].includes(value)) return "COMMIT";
    if (["CAPTURE", "CAPTURING"].includes(value)) return "CAPTURE";
    if (["COMPENSATE", "COMPENSATION"].includes(value)) return "COMPENSATE";
    if (["COMPLETE", "COMPLETED", "FAILED", "CANCELLED"].includes(value)) return "COMPLETE";
    return "DRAFT";
  }
  function normalizeWorldRefs(refs = {}) {
    return {
      marketOrderId: id(refs.marketOrderId),
      serviceOrderId: id(refs.serviceOrderId),
      billingIntentId: id(refs.billingIntentId),
      billingTransactionId: id(refs.billingTransactionId),
      itemTransactionId: id(refs.itemTransactionId || (Array.isArray(refs.itemTransactionIds) ? refs.itemTransactionIds[0] : "")),
      instanceIds: unique(refs.instanceIds),
      housingReservationIds: unique(refs.housingReservationIds || refs.reservationIds),
      marketStockReservationIds: unique(refs.marketStockReservationIds || refs.stockReservationIds)
    };
  }
  function recordRefs(operationId = "", refs = {}, options = {}) {
    const response = mutateWorldOperation(
      "attachWorldBridgeOperationReferences",
      operationId,
      normalizeWorldRefs(refs),
      {
        flush: options.flush === true,
        retryStale: options.retryStale !== false,
        source: options.source || "CYBERWARE_WORLD_BRIDGE_REFERENCES_ATTACHED"
      }
    );
    return response?.ok === false ? null : resultOf(response);
  }
  function advance(operationId = "", status = "", step = "", options = {}) {
    const response = mutateWorldOperation(
      "transitionWorldBridgeOperation",
      operationId,
      {
        status: token(status),
        currentStep: normalizeWorldStep(step || status),
        metadata: { changedDomains: normalizeDomains(options.changedDomains) },
        checkpointCode: token(options.checkpointCode || step || status)
      },
      {
        forceTransition: options.forceTransition === true,
        flush: options.flush === true || TERMINAL_STATUSES.has(token(status)),
        retryStale: options.retryStale !== false,
        source: options.source || "CYBERWARE_WORLD_BRIDGE_ADVANCED"
      }
    );
    return response?.ok === false ? null : resultOf(response);
  }
  function failGeneric(operationId = "", reason = "", refs = {}) {
    diagnostics.failures += 1;
    let current = getGenericOperation(operationId);
    if (!current) return null;
    if (Object.keys(normalizeWorldRefs(refs)).some((key) => {
      const value = normalizeWorldRefs(refs)[key];
      return Array.isArray(value) ? value.length : Boolean(value);
    })) current = recordRefs(operationId, refs, { expectedRevision: current.revision, flush: true }) || current;
    const response = mutateWorldOperation("updateWorldBridgeOperation", operationId, {
      status: token(refs.status || "FAILED"),
      currentStep: "COMPLETE",
      errorCode: token(reason || "CYBERWARE_WORLD_OPERATION_FAILED"),
      retry: { lastErrorCode: token(reason || "CYBERWARE_WORLD_OPERATION_FAILED") },
      recovery: {
        required: ["RECOVERY_REQUIRED", "PAYMENT_RECOVERY_REQUIRED", "COMPENSATION_REQUIRED"].includes(token(refs.status)),
        reasonCodes: [token(reason || "CYBERWARE_WORLD_OPERATION_FAILED")]
      },
      metadata: { changedDomains: normalizeDomains(refs.changedDomains) },
      checkpointCode: "FAILED"
    }, {
      forceTransition: true,
      flush: true,
      source: "CYBERWARE_WORLD_BRIDGE_FAILED"
    });
    const operation = resultOf(response) || getGenericOperation(operationId) || current;
    emitCyberwareOperation(operation, { changedDomains: refs.changedDomains || [] });
    return operation;
  }
  function completeGeneric(operationId = "", result = {}) {
    let current = getGenericOperation(operationId);
    if (!current) return null;
    current = recordRefs(operationId, result, { expectedRevision: current.revision, flush: true }) || current;
    const response = mutateWorldOperation("updateWorldBridgeOperation", operationId, {
      status: "COMPLETED",
      currentStep: "COMPLETE",
      metadata: {
        resultCode: token(result.resultCode || "CYBERWARE_WORLD_OPERATION_COMPLETED"),
        changedDomains: normalizeDomains(result.changedDomains)
      },
      recovery: { required: false, reasonCodes: [] },
      checkpointCode: token(result.resultCode || "COMPLETED")
    }, {
      forceTransition: true,
      flush: true,
      source: "CYBERWARE_WORLD_BRIDGE_COMPLETED"
    });
    const operation = resultOf(response) || getGenericOperation(operationId) || current;
    diagnostics.completions += 1;
    emitCyberwareOperation(operation, { changedDomains: result.changedDomains || [] });
    return operation;
  }
  function projectOperation(operation = {}) {
    if (!operation) return null;
    const refs = operation.refs || {};
    const metadata = operation.metadata || {};
    return {
      operationId: id(operation.operationId),
      operationType: normalizeOperation(metadata.cyberwareOperationType || String(operation.operationType || "").replace(/^CYBERWARE_/, "")),
      status: token(operation.status || "DRAFT"),
      currentStep: token(operation.currentStep || operation.status || "DRAFT"),
      citizenId: id(operation.citizenId),
      providerId: id(operation.providerId),
      marketOrderId: id(refs.marketOrderId),
      serviceOrderId: id(refs.serviceOrderId),
      billingIntentId: id(refs.billingIntentId),
      billingTransactionId: id(refs.billingTransactionId),
      itemTransactionIds: unique([refs.itemTransactionId]),
      instanceIds: unique(refs.instanceIds),
      housingReservationIds: unique(refs.housingReservationIds),
      stockReservationIds: unique(refs.marketStockReservationIds),
      compensationState: clone(operation.compensation || null),
      lastErrorCode: token(operation.retry?.lastErrorCode || operation.errors?.[operation.errors.length - 1]?.code || ""),
      retryCount: Math.max(0, Number(operation.retry?.count || 0) || 0),
      resultCode: token(metadata.resultCode || operation.checkpoints?.[operation.checkpoints.length - 1]?.code || ""),
      blockers: unique(metadata.blockers),
      warnings: unique(metadata.warnings),
      revision: Math.max(1, Number(operation.revision || 1) || 1),
      createdAt: id(operation.createdAt),
      updatedAt: id(operation.updatedAt),
      completedAt: id(operation.completedAt),
      raw: clone(operation)
    };
  }
  function emitCyberwareOperation(operation = {}, options = {}) {
    const projected = projectOperation(operation);
    if (!projected?.operationId) return false;
    const previousRevision = emittedRevisionByOperationId.get(projected.operationId) || 0;
    const shouldEmit = options.force === true || projected.revision > previousRevision;
    if (!shouldEmit) return false;
    emittedRevisionByOperationId.set(projected.operationId, projected.revision);
    const changedDomains = normalizeDomains([
      ...(operation?.metadata?.changedDomains || []),
      ...(options.changedDomains || []),
      ...(operation.changedDomains || [])
    ]);
    const physicalChange = hasPhysicalRefreshDomain(changedDomains);
    window.dispatchEvent?.(new CustomEvent("ws:cyberware-world-operation-updated", {
      detail: {
        operationId: projected.operationId,
        operationType: projected.operationType,
        status: projected.status,
        currentStep: projected.currentStep,
        citizenId: projected.citizenId,
        providerId: projected.providerId,
        instanceIds: projected.instanceIds,
        marketOrderId: projected.marketOrderId,
        serviceOrderId: projected.serviceOrderId,
        billingTransactionId: projected.billingTransactionId,
        changedDomains,
        physicalChange,
        resultCode: projected.resultCode,
        revision: projected.revision
      }
    }));
    diagnostics.finalEvents += 1;
    if (TERMINAL_STATUSES.has(projected.status)) {
      if (physicalChange) diagnostics.physicalTerminalEvents += 1;
      else diagnostics.statusOnlyTerminalEvents += 1;
    }
    if (TERMINAL_STATUSES.has(projected.status) && projected.citizenId) {
      if (!physicalChange) {
        diagnostics.statusOnlyRefreshSkips += 1;
        return true;
      }
      const citizenId = projected.citizenId;
      const existingDomains = pendingRefreshDomainsByCitizenId.get(citizenId) || [];
      pendingRefreshDomainsByCitizenId.set(citizenId, normalizeDomains([...existingDomains, ...changedDomains]));
      const previousTimer = refreshTimerByCitizenId.get(citizenId);
      if (previousTimer) {
        diagnostics.refreshCoalesces += 1;
        window.clearTimeout?.(previousTimer);
      }
      const timer = window.setTimeout?.(() => {
        refreshTimerByCitizenId.delete(citizenId);
        const refreshDomains = pendingRefreshDomainsByCitizenId.get(citizenId) || [];
        pendingRefreshDomainsByCitizenId.delete(citizenId);
        diagnostics.workspaceRefreshes += 1;
        app.invalidateCyberwareWorkspaceRuntime?.(citizenId, { planner: true, diagnostics: true, maintenance: true });
        app.refreshEquipmentCyberwareWorkspace?.(citizenId, {
          forceRuntime: hasPhysicalRefreshDomain(refreshDomains),
          refreshPlanner: true,
          refreshDiagnostics: true,
          refreshMaintenance: true,
          mountPlanner: false,
          mountDiagnostics: false,
          mountMaintenance: false
        });
      }, 0) || 0;
      if (timer) refreshTimerByCitizenId.set(citizenId, timer);
    }
    return true;
  }

  function serviceHistoryEntry(input = {}, serviceOrder = {}, type = "SERVICE") {
    return {
      id: `service-${id(serviceOrder.serviceOrderId)}-${token(type).toLowerCase()}`,
      type: token(type),
      status: "COMPLETED",
      createdAt: now(),
      providerId: id(serviceOrder.providerId),
      serviceOrderId: id(serviceOrder.serviceOrderId),
      cost: Math.max(0, Math.round(finite(serviceOrder.quote?.grossPrice, 0))),
      durationMinutes: Math.max(0, Math.round(finite(serviceOrder.quote?.estimatedDurationMinutes, 0))),
      note: `${token(type).replace(/_/g, " ")} completed through World Bridge.`
    };
  }
  function appendHistoryPatch(item = {}, entry = {}) {
    return [...(Array.isArray(item.serviceHistory) ? clone(item.serviceHistory) : []), entry].slice(-48);
  }
  function clearInstalledState(item = {}) {
    return {
      ...(item.cyberwareState || {}),
      installedCharacterId: "",
      installedBodySlots: []
    };
  }
  function installedState(item = {}, citizenId = "", bodySlots = []) {
    return {
      ...(item.cyberwareState || {}),
      installedCharacterId: citizenId,
      installedBodySlots: unique(bodySlots)
    };
  }
  function buildMaintenancePatch(input = {}, item = {}, serviceOrder = {}) {
    const operation = normalizeOperation(input.operationType || input.operation);
    const entry = serviceHistoryEntry(input, serviceOrder, operation);
    const patch = { serviceHistory: appendHistoryPatch(item, entry) };
    if (operation === "REPAIR") {
      patch.durability = { ...(item.durability || {}), current: finite(item.durability?.maximumOverride, 100) || 100 };
    } else if (operation === "CALIBRATION") {
      patch.cyberwareState = {
        ...(item.cyberwareState || {}),
        calibration: { ...(item.cyberwareState?.calibration || {}), profile: "CERTIFIED_SERVICE", quality: 100, lastCalibratedAt: now() },
        maintenance: { ...(item.cyberwareState?.maintenance || {}), lastCalibratedAt: now() }
      };
    } else if (operation === "CLEAN") {
      patch.cyberwareState = {
        ...(item.cyberwareState || {}),
        maintenance: { ...(item.cyberwareState?.maintenance || {}), cleanliness: 100, lastCleanedAt: now() }
      };
    } else if (["DIAGNOSTIC", "MAINTENANCE"].includes(operation)) {
      const runtime = app.getCyberwareRuntimeState?.(app.getCitizenById?.(input.citizenId)) || null;
      const diagnosticsState = app.getCyberwareDiagnosticsState?.(input.citizenId, runtime) || null;
      patch.cyberwareState = {
        ...(item.cyberwareState || {}),
        maintenance: {
          ...(item.cyberwareState?.maintenance || {}),
          lastDiagnostic: {
            at: now(),
            status: diagnosticsState?.status || diagnosticsState?.summary?.status || "COMPLETED",
            blockers: unique(diagnosticsState?.blockers),
            warnings: unique(diagnosticsState?.warnings)
          }
        }
      };
    } else if (operation === "FIRMWARE_UPDATE") {
      const eligibility = app.resolveFirmwareEligibility?.({ citizenId: input.citizenId, item, instanceId: item.instanceId, firmwareReleaseId: input.firmwareReleaseId }) || {};
      const release = eligibility.release || app.getLatestCompatibleFirmware?.({ item }) || null;
      if (!release) return { ok: false, reason: "FIRMWARE_RELEASE_NOT_FOUND" };
      const installed = Array.isArray(item.cyberwareState?.installedFirmware) ? clone(item.cyberwareState.installedFirmware) : [];
      const index = installed.findIndex((record) => token(record.channel || record.firmwareChannel || "DEFAULT") === token(release.channel || "DEFAULT"));
      const record = {
        id: id(release.firmwareReleaseId),
        releaseId: id(release.firmwareReleaseId),
        productId: id(release.firmwareProductId),
        channel: token(release.channel || "DEFAULT"),
        version: id(release.version),
        status: "CURRENT",
        installedAt: now(),
        source: "WORLD_BRIDGE_SERVICE"
      };
      if (index >= 0) installed[index] = record; else installed.push(record);
      patch.cyberwareState = { ...(item.cyberwareState || {}), installedFirmware: installed };
      patch.authorizationRefs = { ...(item.authorizationRefs || {}), firmwareReleaseId: record.releaseId };
    }
    return { ok: true, patch, entry };
  }
  function commitPhysicalServiceResult(input = {}, quote = {}, serviceOrder = {}) {
    const operation = normalizeOperation(input.operationType || input.operation);
    const citizenId = id(input.citizenId);
    const idempotencyKey = `${id(input.idempotencyKey)}:item-commit`;
    let transactionResult = null;
    let instanceIds = getSubjectInstanceIds(input);
    if (["INSTALL_MODULE", "REMOVE_MODULE", "REPLACE_MODULE", "APPLY_PERMANENT_MOD"].includes(operation)) {
      const result = app.commitCyberwareUpgradeServiceResult?.({ ...input, operationType: operation, idempotencyKey }, serviceOrder);
      if (result?.ok !== true) return { ok: false, reason: result?.reason || "CYBERWARE_UPGRADE_COMMIT_FAILED", transactionResult: result };
      transactionResult = result;
      instanceIds = unique(result.instanceIds || getSubjectInstanceIds(input));
    } else if (["INSTALL", "DEINSTALL", "REPLACE"].includes(operation)) {
      const plan = input.plan || quote.plan || buildPlannerPlan(input);
      if (!plan?.valid) return { ok: false, reason: plan?.reason || "CYBERWARE_PLAN_BLOCKED", plan };
      if (operation === "INSTALL") {
        const instanceId = id(plan.sourceItemId || input.sourceItemId || input.instanceId);
        const item = app.getItemInstanceById?.(instanceId);
        const entry = serviceHistoryEntry(input, serviceOrder, "INSTALL");
        transactionResult = app.commitItemInstanceTransaction({
          idempotencyKey,
          sourceDomain: "SERVICE",
          sourceRefId: id(serviceOrder.serviceOrderId),
          citizenId,
          changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE", "SERVICE"],
          metadata: { operationType: operation, serviceOrderId: id(serviceOrder.serviceOrderId) },
          operations: [{
            type: "MOVE",
            instanceId,
            expected: { ownerId: citizenId, locationTypes: ["SERVICE", "HOUSING_STORAGE", "CONTAINER_GRID", "UNPLACED"] },
            toLocation: { type: "BODY", characterId: citizenId, bodySlots: unique(plan.occupiedSlots || [plan.primarySlot]) },
            lifecycleState: "INSTALLED",
            patch: {
              cyberwareState: installedState(item, citizenId, plan.occupiedSlots || [plan.primarySlot]),
              serviceHistory: appendHistoryPatch(item, entry),
              lastImplantCheck: { at: now(), result: "CERTIFIED_SERVICE_INSTALL", accepted: true, serviceOrderId: id(serviceOrder.serviceOrderId) }
            }
          }]
        });
        instanceIds = [instanceId];
      } else if (operation === "DEINSTALL") {
        const instanceId = id(plan.targetItemId || input.targetItemId || input.instanceId);
        const item = app.getItemInstanceById?.(instanceId);
        const destination = plan.returnDestination || input.returnDestination;
        if (!destination?.type) return { ok: false, reason: "RETURN_LOCATION_REQUIRED" };
        const entry = serviceHistoryEntry(input, serviceOrder, "DEINSTALL");
        transactionResult = app.commitItemInstanceTransaction({
          idempotencyKey,
          sourceDomain: "SERVICE",
          sourceRefId: id(serviceOrder.serviceOrderId),
          citizenId,
          changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE", "SERVICE"],
          metadata: { operationType: operation, serviceOrderId: id(serviceOrder.serviceOrderId) },
          operations: [{
            type: "MOVE",
            instanceId,
            expected: { ownerId: citizenId, locationType: "BODY", lifecycleState: "INSTALLED" },
            toLocation: clone(destination),
            lifecycleState: "STORED",
            patch: { cyberwareState: clearInstalledState(item), serviceHistory: appendHistoryPatch(item, entry) }
          }]
        });
        instanceIds = [instanceId];
      } else {
        const oldInstanceId = id(plan.targetItemId || input.targetItemId || input.oldInstanceId);
        const newInstanceId = id(plan.sourceItemId || input.sourceItemId || input.newInstanceId);
        const oldItem = app.getItemInstanceById?.(oldInstanceId);
        const newItem = app.getItemInstanceById?.(newInstanceId);
        const destination = plan.returnDestination || input.returnDestination;
        if (!destination?.type) return { ok: false, reason: "RETURN_LOCATION_REQUIRED" };
        const oldEntry = serviceHistoryEntry(input, serviceOrder, "REPLACE_OUT");
        const newEntry = serviceHistoryEntry(input, serviceOrder, "REPLACE_IN");
        transactionResult = app.commitItemInstanceTransaction({
          idempotencyKey,
          sourceDomain: "SERVICE",
          sourceRefId: id(serviceOrder.serviceOrderId),
          citizenId,
          changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE", "SERVICE"],
          metadata: { operationType: operation, serviceOrderId: id(serviceOrder.serviceOrderId) },
          operations: [
            {
              type: "MOVE",
              instanceId: oldInstanceId,
              expected: { ownerId: citizenId, locationType: "BODY", lifecycleState: "INSTALLED" },
              toLocation: clone(destination),
              lifecycleState: "STORED",
              patch: { cyberwareState: clearInstalledState(oldItem), serviceHistory: appendHistoryPatch(oldItem, oldEntry), replacedByItemInstanceId: newInstanceId }
            },
            {
              type: "MOVE",
              instanceId: newInstanceId,
              expected: { ownerId: citizenId, locationTypes: ["SERVICE", "HOUSING_STORAGE", "CONTAINER_GRID", "UNPLACED"] },
              toLocation: { type: "BODY", characterId: citizenId, bodySlots: unique(plan.occupiedSlots || [plan.primarySlot]) },
              lifecycleState: "INSTALLED",
              patch: { cyberwareState: installedState(newItem, citizenId, plan.occupiedSlots || [plan.primarySlot]), serviceHistory: appendHistoryPatch(newItem, newEntry), replacedItemInstanceId: oldInstanceId }
            }
          ]
        });
        instanceIds = [oldInstanceId, newInstanceId];
      }
    } else {
      const instanceId = id(input.instanceId || input.itemId || instanceIds[0]);
      const item = app.getItemInstanceById?.(instanceId);
      if (!item) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND" };
      const patchResult = buildMaintenancePatch(input, item, serviceOrder);
      if (!patchResult.ok) return patchResult;
      transactionResult = app.commitItemInstanceTransaction({
        idempotencyKey,
        sourceDomain: "SERVICE",
        sourceRefId: id(serviceOrder.serviceOrderId),
        citizenId,
        changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE", "SERVICE"],
        metadata: { operationType: operation, serviceOrderId: id(serviceOrder.serviceOrderId) },
        operations: [{ type: "PATCH", instanceId, expected: { ownerId: citizenId }, patch: patchResult.patch }]
      });
      instanceIds = [instanceId];
    }
    if (transactionResult?.ok !== true) return { ok: false, reason: transactionResult?.reason || "ITEM_INSTANCE_TRANSACTION_FAILED", transactionResult };
    diagnostics.physicalCommits += 1;
    const transaction = transactionResult.transaction || transactionResult;
    const itemTransactionId = id(transactionResult.itemTransactionId || transaction.transactionId);
    return {
      ok: true,
      reason: "CYBERWARE_PHYSICAL_RESULT_COMMITTED",
      instanceIds,
      itemTransactionId,
      itemCommit: transactionResult.itemCommit || { committed: true, status: "COMMITTED", transactionId: itemTransactionId },
      transaction
    };
  }

  function authorizeAndStartOrder(serviceOrder = {}, input = {}) {
    let current = serviceOrder;
    if (current.status === "PENDING_CONFIRMATION") {
      const authorization = app.authorizeServiceOrder?.(current.serviceOrderId, {
        idempotencyKey: `${id(input.idempotencyKey)}:service-authorize`,
        expectedRevision: current.revision,
        paymentSource: input.paymentSource || "CREDITS",
        acceptCoverageChange: input.acceptCoverageChange === true,
        coverageAuthorizations: input.coverageAuthorizations || []
      });
      if (authorization?.ok !== true) return { ok: false, reason: authorization?.reason || "SERVICE_AUTHORIZATION_FAILED", order: authorization?.order || current };
      current = authorization.order;
    }
    if (current.status === "AUTHORIZED" && id(input.scheduledStartAt)) {
      const scheduled = app.scheduleServiceOrder?.(current.serviceOrderId, { scheduledStartAt: input.scheduledStartAt, estimatedEndAt: input.estimatedEndAt }, {
        idempotencyKey: `${id(input.idempotencyKey)}:service-schedule`,
        expectedRevision: current.revision
      });
      return scheduled?.ok ? { ok: true, scheduled: true, order: scheduled.order } : { ok: false, reason: scheduled?.reason || "SERVICE_SCHEDULE_FAILED", order: scheduled?.order || current };
    }
    if (current.status === "SCHEDULED" && id(input.scheduledStartAt)) {
      return { ok: true, scheduled: true, order: current };
    }
    if (current.status === "IN_PROGRESS") return { ok: true, scheduled: false, order: current };
    const started = app.startServiceOrder?.(current.serviceOrderId, {
      idempotencyKey: `${id(input.idempotencyKey)}:service-start`,
      expectedRevision: current.revision,
      source: "CYBERWARE_WORLD_BRIDGE"
    });
    return started?.ok ? { ok: true, scheduled: false, order: started.order } : { ok: false, reason: started?.reason || "SERVICE_START_FAILED", order: started?.order || current };
  }
  function finalizeServiceOrder(serviceOrder = {}, physical = {}, input = {}) {
    let current = app.getServiceOrder?.(serviceOrder.serviceOrderId) || serviceOrder;
    if (finite(current.quote?.payableAmount, 0) > 0 && !["CAPTURED", "COVERED", "WAIVED", "NOT_REQUIRED"].includes(token(current.paymentStatus))) {
      const capture = app.captureServiceOrderBilling?.(current.serviceOrderId, {
        idempotencyKey: `${id(input.idempotencyKey)}:service-capture`,
        expectedRevision: current.revision,
        itemTransactionId: physical.itemTransactionId,
        itemCommit: physical.itemCommit
      });
      if (capture?.ok !== true) return { ok: false, reason: capture?.reason || "SERVICE_PAYMENT_CAPTURE_FAILED", order: capture?.order || current };
      current = capture.order;
    }
    const completed = app.completeServiceOrder?.(current.serviceOrderId, {
      outcome: "SUCCESS",
      resultCode: `${normalizeOperation(input.operationType)}_COMPLETED`,
      itemCommit: physical.itemCommit,
      metadata: { source: "CYBERWARE_WORLD_BRIDGE_16_1X", operationId: id(input.operationId) }
    }, {
      idempotencyKey: `${id(input.idempotencyKey)}:service-complete`,
      expectedRevision: current.revision,
      itemTransactionId: physical.itemTransactionId,
      itemCommit: physical.itemCommit
    });
    return completed?.ok ? { ok: true, order: completed.order } : { ok: false, reason: completed?.reason || "SERVICE_COMPLETION_FAILED", order: completed?.order || current };
  }
  function createServiceOrderFromQuote(input = {}, quote = {}) {
    const offerResult = app.createServiceOffer?.({
      citizenId: quote.citizenId,
      providerId: quote.providerId,
      serviceDefinitionId: quote.serviceDefinitionId,
      subjectRefs: clone(quote.subjectRefs || { instanceIds: quote.instanceIds }),
      grossPrice: quote.quote?.grossPrice,
      estimatedDurationMinutes: quote.quote?.estimatedDurationMinutes,
      currency: quote.quote?.currency,
      coverageAuthorizations: input.coverageAuthorizations,
      idempotencyKey: `${id(input.idempotencyKey)}:service-offer`,
      metadata: { source: "CYBERWARE_WORLD_BRIDGE_16_1X", operationType: quote.operationType, operationId: id(input.operationId) }
    });
    if (offerResult?.ok !== true) return { ok: false, reason: offerResult?.reason || "SERVICE_OFFER_CREATE_FAILED" };
    const orderResult = app.createServiceOrderFromOffer?.(offerResult.offer.serviceOfferId, {
      subjectRefs: clone(quote.subjectRefs || { instanceIds: quote.instanceIds }),
      idempotencyKey: `${id(input.idempotencyKey)}:service-order`,
      metadata: { source: "CYBERWARE_WORLD_BRIDGE_16_1X", operationType: quote.operationType, operationId: id(input.operationId) }
    });
    return orderResult?.ok ? { ok: true, offer: offerResult.offer, order: orderResult.order } : { ok: false, reason: orderResult?.reason || "SERVICE_ORDER_CREATE_FAILED", offer: offerResult.offer };
  }
  function executeServiceOrder(input = {}, quote = {}, serviceOrder = null) {
    const created = serviceOrder ? { ok: true, order: serviceOrder, offer: null } : createServiceOrderFromQuote(input, quote);
    if (!created.ok) return created;
    const started = authorizeAndStartOrder(created.order, input);
    if (!started.ok || started.scheduled) return { ...started, offer: created.offer };
    const physical = commitPhysicalServiceResult(input, quote, started.order);
    if (!physical.ok) return { ok: false, reason: physical.reason, order: started.order, physical };
    const completed = finalizeServiceOrder(started.order, physical, input);
    return completed.ok
      ? { ok: true, offer: created.offer, order: completed.order, physical }
      : { ok: false, reason: completed.reason, order: completed.order, physical };
  }

  function isCyberwareWorldOperation(operation = {}) {
    const operationType = normalizeOperation(operation?.metadata?.cyberwareOperationType || String(operation?.operationType || "").replace(/^CYBERWARE_/, ""));
    return SERVICE_OPERATION_TYPES.has(operationType) || PURCHASE_OPERATION_TYPES.has(operationType);
  }
  function getStoredRecoveryInput(operation = {}, overrides = {}) {
    const metadataInput = operation?.metadata?.recoveryInput && typeof operation.metadata.recoveryInput === "object"
      ? clone(operation.metadata.recoveryInput)
      : {};
    const refs = operation?.refs || {};
    const operationType = normalizeOperation(metadataInput.operationType || operation?.metadata?.cyberwareOperationType || String(operation?.operationType || "").replace(/^CYBERWARE_/, ""));
    return {
      ...metadataInput,
      ...clone(overrides || {}),
      operationType,
      citizenId: id(overrides.citizenId || metadataInput.citizenId || operation.citizenId),
      providerId: id(overrides.providerId || metadataInput.providerId || operation.providerId),
      instanceIds: unique(overrides.instanceIds || metadataInput.instanceIds || refs.instanceIds),
      instanceId: id(overrides.instanceId || metadataInput.instanceId || refs.instanceIds?.[0]),
      sourceItemId: id(overrides.sourceItemId || metadataInput.sourceItemId || (operationType === "PURCHASE_AND_INSTALL" ? refs.instanceIds?.[0] : "")),
      targetItemId: id(overrides.targetItemId || metadataInput.targetItemId),
      hostInstanceId: id(overrides.hostInstanceId || metadataInput.hostInstanceId || metadataInput.instanceId || refs.instanceIds?.[0]),
      moduleInstanceId: id(overrides.moduleInstanceId || metadataInput.moduleInstanceId),
      oldModuleInstanceId: id(overrides.oldModuleInstanceId || metadataInput.oldModuleInstanceId),
      slotId: id(overrides.slotId || overrides.moduleSlotId || metadataInput.slotId),
      modificationId: id(overrides.modificationId || metadataInput.modificationId),
      returnDestination: overrides.returnDestination && typeof overrides.returnDestination === "object"
        ? clone(overrides.returnDestination)
        : metadataInput.returnDestination && typeof metadataInput.returnDestination === "object"
          ? clone(metadataInput.returnDestination)
          : null,
      idempotencyKey: id(operation.idempotencyKey),
      operationId: id(operation.operationId),
      scheduledStartAt: "",
      executionMode: "PLAYER_WORLD_OPERATION",
      recovery: true
    };
  }
  function completeResumedOperation(operation = {}, serviceOrder = {}, execution = {}, input = {}) {
    const operationId = id(operation.operationId);
    const operationType = normalizeOperation(operation.metadata?.cyberwareOperationType || String(operation.operationType || "").replace(/^CYBERWARE_/, ""));
    const refs = operation.refs || {};
    let current = recordRefs(operationId, {
      serviceOrderId: id(execution.order?.serviceOrderId || serviceOrder.serviceOrderId),
      billingIntentId: id(execution.order?.billingRefs?.billingIntentId || serviceOrder.billingRefs?.billingIntentId),
      billingTransactionId: id(execution.order?.billingRefs?.billingTransactionId || serviceOrder.billingRefs?.billingTransactionId),
      itemTransactionId: id(execution.physical?.itemTransactionId || refs.itemTransactionId),
      instanceIds: unique(execution.physical?.instanceIds || refs.instanceIds)
    }, { flush: true }) || operation;
    if (operationType === "PURCHASE_AND_INSTALL") {
      const marketResult = app.finalizeMarketServiceFulfillment?.(id(refs.marketOrderId), {
        idempotencyKey: `${id(operation.idempotencyKey)}:market-finalize`
      });
      if (marketResult?.ok !== true) {
        const reason = marketResult?.reason || "MARKET_SERVICE_FINALIZATION_FAILED";
        const status = /PAYMENT|RECOVERY|STOCK/.test(token(reason)) ? "PAYMENT_RECOVERY_REQUIRED" : "RECOVERY_REQUIRED";
        return {
          ok: false,
          reason,
          operation: failGeneric(operationId, reason, {
            status,
            marketOrderId: id(refs.marketOrderId),
            serviceOrderId: id(serviceOrder.serviceOrderId),
            billingTransactionId: id(execution.order?.billingRefs?.billingTransactionId),
            itemTransactionId: id(execution.physical?.itemTransactionId || refs.itemTransactionId),
            instanceIds: unique(execution.physical?.instanceIds || refs.instanceIds),
            changedDomains: ["MARKET", "SERVICE", "BILLING", "ITEM_INSTANCE", "CYBERWARE"]
          })
        };
      }
      current = recordRefs(operationId, {
        marketOrderId: id(refs.marketOrderId),
        billingTransactionId: id(marketResult.billingTransactionId || marketResult.order?.billingRefs?.billingTransactionId || execution.order?.billingRefs?.billingTransactionId)
      }, { flush: true }) || current;
    }
    const resultCode = operationType === "PURCHASE_AND_INSTALL" ? "PURCHASE_AND_INSTALL_COMPLETED" : `${operationType}_COMPLETED`;
    const completed = completeGeneric(operationId, {
      resultCode,
      marketOrderId: id(current.refs?.marketOrderId),
      serviceOrderId: id(serviceOrder.serviceOrderId),
      billingIntentId: id(execution.order?.billingRefs?.billingIntentId),
      billingTransactionId: id(execution.order?.billingRefs?.billingTransactionId || current.refs?.billingTransactionId),
      itemTransactionId: id(execution.physical?.itemTransactionId || current.refs?.itemTransactionId),
      instanceIds: unique(execution.physical?.instanceIds || current.refs?.instanceIds),
      changedDomains: operationType === "PURCHASE_AND_INSTALL"
        ? ["MARKET", "SERVICE", "BILLING", "ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE"]
        : ["SERVICE", "BILLING", "ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE"]
    });
    return { ok: true, reason: resultCode, operation: completed, serviceOrder: execution.order, physical: execution.physical };
  }
  function resumeExistingCyberwareServiceOperation(operation = {}, serviceOrder = null, overrides = {}) {
    const operationId = id(operation.operationId);
    if (!operationId) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_NOT_FOUND" };
    diagnostics.resumeAttempts += 1;
    if (activeResumeOperationIds.has(operationId)) {
      diagnostics.resumeSuppressed += 1;
      return { ok: true, reason: "CYBERWARE_WORLD_OPERATION_RESUME_IN_PROGRESS", operation };
    }
    const order = serviceOrder || app.getServiceOrder?.(operation.refs?.serviceOrderId);
    if (!order) return { ok: false, reason: "LINKED_SERVICE_ORDER_NOT_FOUND", operation };
    const requestedSignature = buildResumeSignature(operation, order);
    if (resumeSignatureByOperationId.get(operationId) === requestedSignature) {
      diagnostics.resumeSuppressed += 1;
      return { ok: true, reason: "CYBERWARE_WORLD_OPERATION_RESUME_ALREADY_PROCESSED", operation, serviceOrder: order };
    }
    const orderStatus = token(order.status);
    if (orderStatus === "SCHEDULED") return { ok: true, status: "SCHEDULED", reason: "SERVICE_ORDER_NOT_DUE", operation, serviceOrder: order };
    if (!["PENDING_CONFIRMATION", "AUTHORIZED", "IN_PROGRESS", "COMPLETED"].includes(orderStatus)) {
      return { ok: false, reason: `SERVICE_ORDER_NOT_RESUMABLE:${orderStatus}`, operation, serviceOrder: order };
    }
    activeResumeOperationIds.add(operationId);
    try {
      const storedInput = getStoredRecoveryInput(operation, overrides);
      const worldOperationType = normalizeOperation(storedInput.operationType);
      const serviceOperationType = worldOperationType === "PURCHASE_AND_INSTALL" ? "INSTALL" : worldOperationType;
      const input = {
        ...storedInput,
        operationType: serviceOperationType,
        serviceDefinitionId: id(order.serviceDefinitionId || storedInput.serviceDefinitionId),
        providerId: id(order.providerId || storedInput.providerId),
        instanceIds: unique(order.subjectRefs?.instanceIds || storedInput.instanceIds),
        instanceId: id(storedInput.instanceId || order.subjectRefs?.instanceIds?.[0]),
        sourceItemId: id(storedInput.sourceItemId || (serviceOperationType === "INSTALL" ? order.subjectRefs?.instanceIds?.[0] : "")),
        operationId,
        idempotencyKey: id(operation.idempotencyKey),
        plan: storedInput.plan || null
      };
      if (orderStatus === "COMPLETED") {
        return completeResumedOperation(operation, order, { order, physical: null }, input);
      }
      advance(operationId, "IN_PROGRESS", "EXECUTE", {
        forceTransition: true,
        changedDomains: worldOperationType === "PURCHASE_AND_INSTALL" ? ["MARKET", "SERVICE"] : ["SERVICE"]
      });
      const quote = quoteCyberwareService(input);
      if (!quote.ok) {
        return { ok: false, reason: quote.reason, operation: failGeneric(operationId, quote.reason, { status: "RECOVERY_REQUIRED", serviceOrderId: order.serviceOrderId, instanceIds: input.instanceIds, changedDomains: ["SERVICE", "CYBERWARE"] }) };
      }
      const execution = executeServiceOrder({ ...input, plan: input.plan || quote.plan }, quote, order);
      if (!execution.ok) {
        const recoveryStatus = execution.physical?.itemTransactionId && /PAYMENT|CAPTURE|BILLING/.test(token(execution.reason))
          ? "PAYMENT_RECOVERY_REQUIRED"
          : "RECOVERY_REQUIRED";
        return {
          ok: false,
          reason: execution.reason,
          operation: failGeneric(operationId, execution.reason, {
            status: recoveryStatus,
            marketOrderId: id(operation.refs?.marketOrderId),
            serviceOrderId: id(order.serviceOrderId),
            billingIntentId: id(execution.order?.billingRefs?.billingIntentId),
            billingTransactionId: id(execution.order?.billingRefs?.billingTransactionId),
            itemTransactionId: id(execution.physical?.itemTransactionId),
            instanceIds: unique(execution.physical?.instanceIds || input.instanceIds),
            changedDomains: ["SERVICE", "BILLING", ...(execution.physical?.itemTransactionId ? ["ITEM_INSTANCE", "CYBERWARE"] : [])]
          })
        };
      }
      if (execution.scheduled) return { ok: true, status: "SCHEDULED", reason: "SERVICE_ORDER_SCHEDULED", operation: getGenericOperation(operationId), serviceOrder: execution.order };
      return completeResumedOperation(getGenericOperation(operationId) || operation, execution.order, execution, input);
    } finally {
      activeResumeOperationIds.delete(operationId);
      const latestOperation = getGenericOperation(operationId) || operation;
      const latestOrder = app.getServiceOrder?.(order.serviceOrderId) || order;
      resumeSignatureByOperationId.set(operationId, buildResumeSignature(latestOperation, latestOrder));
    }
  }

  function startCyberwareService(input = {}) {
    diagnostics.starts += 1;
    const operationType = normalizeOperation(input.operationType || input.operation || "MAINTENANCE");
    if (isDirectMode(input)) return { ok: false, reason: "DIRECT_MODE_REQUIRES_DIRECT_API", operationType };
    const requestedReplay = buildIdempotentStartReplay(findRequestedIdempotentReplay(input));
    if (requestedReplay) return requestedReplay;
    const dependency = getDependencyState(operationType);
    if (!dependency.ready) return dependencyFailure(operationType);
    const quote = quoteCyberwareService({ ...input, operationType });
    if (!quote.ok) return quote;
    const idempotencyKey = makeKey("cyberware-service", { ...input, operationType });
    const created = createGenericOperation({ ...input, operationType, providerId: quote.providerId, idempotencyKey, plan: quote.plan }, quote);
    if (!created.ok) return { ok: false, reason: created.reason || "WORLD_BRIDGE_OPERATION_CREATE_FAILED", quote };
    const replayResult = buildIdempotentStartReplay(created, quote);
    if (replayResult) return replayResult;
    let operation = created.operation;
    const operationId = id(operation.operationId);
    const commonInput = { ...input, operationType, providerId: quote.providerId, idempotencyKey, operationId, plan: quote.plan };
    operation = advance(operationId, "VALIDATING", "VALIDATING", { changedDomains: ["CYBERWARE", "SERVICE"] }) || operation;
    const execution = executeServiceOrder(commonInput, quote);
    if (!execution.ok) {
      const recoveryStatus = execution.physical?.itemTransactionId && /PAYMENT|CAPTURE|BILLING/.test(token(execution.reason))
        ? "PAYMENT_RECOVERY_REQUIRED"
        : "FAILED";
      const failed = failGeneric(operationId, execution.reason, {
        status: recoveryStatus,
        serviceOrderId: id(execution.order?.serviceOrderId),
        billingIntentId: id(execution.order?.billingRefs?.billingIntentId),
        billingTransactionId: id(execution.order?.billingRefs?.billingTransactionId),
        itemTransactionIds: unique([execution.physical?.itemTransactionId]),
        instanceIds: unique(execution.physical?.instanceIds || quote.instanceIds),
        changedDomains: ["SERVICE", "BILLING", ...(execution.physical?.itemTransactionId ? ["ITEM_INSTANCE", "CYBERWARE"] : [])]
      });
      return { ok: false, reason: execution.reason, operation: projectOperation(failed), quote, serviceOrder: execution.order || null };
    }
    operation = recordRefs(operationId, {
      providerId: quote.providerId,
      serviceOrderId: id(execution.order?.serviceOrderId),
      billingIntentId: id(execution.order?.billingRefs?.billingIntentId),
      billingTransactionId: id(execution.order?.billingRefs?.billingTransactionId),
      itemTransactionIds: unique([execution.physical?.itemTransactionId]),
      instanceIds: unique(execution.physical?.instanceIds || quote.instanceIds)
    }, { step: "service-result" }) || operation;
    if (execution.scheduled) {
      operation = advance(operationId, "SCHEDULED", "WAITING_FOR_SERVICE_TIME", { changedDomains: ["SERVICE"] }) || operation;
      return { ok: true, status: "SCHEDULED", operation: projectOperation(operation), quote, serviceOrder: execution.order };
    }
    const completed = completeGeneric(operationId, {
      resultCode: `${operationType}_COMPLETED`,
      providerId: quote.providerId,
      serviceOrderId: id(execution.order?.serviceOrderId),
      billingIntentId: id(execution.order?.billingRefs?.billingIntentId),
      billingTransactionId: id(execution.order?.billingRefs?.billingTransactionId),
      itemTransactionIds: unique([execution.physical?.itemTransactionId]),
      instanceIds: unique(execution.physical?.instanceIds || quote.instanceIds),
      changedDomains: ["SERVICE", "BILLING", "ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE"]
    });
    return { ok: true, reason: `${operationType}_COMPLETED`, operation: projectOperation(completed), quote, serviceOrder: execution.order, physical: execution.physical };
  }

  function makeCheckoutCart(input = {}, operationType = "PURCHASE_TO_HOUSING") {
    const created = app.createMarketCart?.(id(input.citizenId));
    if (created?.ok !== true) return { ok: false, reason: created?.reason || "MARKET_CART_CREATE_FAILED" };
    const updated = app.updateMarketCart?.(created.cart.cartId, {
      addLine: buildVirtualMarketCart({ ...input, operationType }).lines[0]
    });
    return updated?.ok ? { ok: true, cart: updated.cart } : { ok: false, reason: updated?.reason || "MARKET_CART_UPDATE_FAILED" };
  }
  function startCyberwarePurchase(input = {}) {
    diagnostics.starts += 1;
    const operationType = normalizeOperation(input.operationType || (input.install === true ? "PURCHASE_AND_INSTALL" : "PURCHASE_TO_HOUSING"));
    const requestedReplay = buildIdempotentStartReplay(findRequestedIdempotentReplay(input));
    if (requestedReplay) return requestedReplay;
    const dependency = getDependencyState(operationType);
    if (!dependency.ready) return dependencyFailure(operationType);
    const quote = quoteCyberwarePurchase({ ...input, operationType });
    if (!quote.ok) return quote;
    const idempotencyKey = makeKey("cyberware-purchase", { ...input, operationType });
    const created = createGenericOperation({ ...input, operationType, idempotencyKey, providerId: input.providerId || quote.servicePreview?.providerId }, quote);
    if (!created.ok) return { ok: false, reason: created.reason || "WORLD_BRIDGE_OPERATION_CREATE_FAILED", quote };
    const replayResult = buildIdempotentStartReplay(created, quote);
    if (replayResult) return replayResult;
    const operationId = id(created.operation.operationId);
    let operation = advance(operationId, "VALIDATING", "VALIDATE", { changedDomains: ["MARKET", "CYBERWARE"] }) || created.operation;
    operation = advance(operationId, "RESERVING", "RESERVE", { changedDomains: ["MARKET"] }) || operation;
    const cartResult = makeCheckoutCart({
      ...input,
      operationType,
      providerId: id(input.providerId || quote.servicePreview?.providerId),
      serviceDefinitionId: id(input.serviceDefinitionId || quote.servicePreview?.serviceDefinitionId)
    }, operationType);
    if (!cartResult.ok) {
      const failed = failGeneric(operationId, cartResult.reason, { changedDomains: ["MARKET"] });
      return { ok: false, reason: cartResult.reason, operation: projectOperation(failed), quote };
    }
    const checkout = app.checkoutMarketCart?.(cartResult.cart.cartId, {
      idempotencyKey: `${idempotencyKey}:market-checkout`,
      paymentSource: input.paymentSource || "CREDITS",
      operationCorrelationId: operationId,
      providerId: id(input.providerId || quote.servicePreview?.providerId),
      serviceDefinitionId: id(input.serviceDefinitionId || quote.servicePreview?.serviceDefinitionId),
      primarySlot: id(input.primarySlot),
      scheduledStartAt: id(input.scheduledStartAt)
    });
    if (checkout?.ok !== true) {
      const failed = failGeneric(operationId, checkout?.reason || "MARKET_CHECKOUT_FAILED", { marketOrderId: id(checkout?.marketOrderId), changedDomains: ["MARKET", "BILLING"] });
      return { ok: false, reason: checkout?.reason || "MARKET_CHECKOUT_FAILED", operation: projectOperation(failed), quote, checkout };
    }
    const marketOrder = checkout.order || app.getMarketOrder?.(checkout.marketOrderId) || null;
    const instanceIds = unique(checkout.createdItemInstanceIds || marketOrder?.createdItemInstanceIds);
    const linkedServiceOrderIds = unique(marketOrder?.linkedServiceOrderIds || checkout.linkedServiceOrderIds);
    operation = recordRefs(operationId, {
      marketOrderId: id(checkout.marketOrderId || marketOrder?.marketOrderId),
      billingIntentId: id(marketOrder?.billingRefs?.billingIntentId),
      billingTransactionId: id(checkout.billingTransactionId || marketOrder?.billingRefs?.billingTransactionId),
      serviceOrderId: linkedServiceOrderIds[0] || "",
      instanceIds,
      housingReservationIds: unique(marketOrder?.housingReservationIds),
      stockReservationIds: unique(marketOrder?.stockReservationIds)
    }, { step: "market-checkout" }) || operation;
    if (operationType === "PURCHASE_TO_HOUSING") {
      const completed = completeGeneric(operationId, {
        resultCode: "PURCHASE_TO_HOUSING_COMPLETED",
        marketOrderId: id(checkout.marketOrderId || marketOrder?.marketOrderId),
        billingTransactionId: id(checkout.billingTransactionId || marketOrder?.billingRefs?.billingTransactionId),
        instanceIds,
        changedDomains: ["MARKET", "BILLING", "ITEM_INSTANCE", "EQUIPMENT", "HOUSING"]
      });
      return { ok: true, reason: "PURCHASE_TO_HOUSING_COMPLETED", operation: projectOperation(completed), quote, checkout };
    }
    if (!instanceIds.length || !linkedServiceOrderIds.length) {
      const failed = failGeneric(operationId, "MARKET_SERVICE_LINK_REQUIRED", {
        marketOrderId: id(checkout.marketOrderId || marketOrder?.marketOrderId),
        instanceIds,
        changedDomains: ["MARKET", "SERVICE", "ITEM_INSTANCE"]
      });
      return { ok: false, reason: "MARKET_SERVICE_LINK_REQUIRED", operation: projectOperation(failed), quote, checkout };
    }
    const serviceOrder = app.getServiceOrder?.(linkedServiceOrderIds[0]);
    if (!serviceOrder) {
      const failed = failGeneric(operationId, "LINKED_SERVICE_ORDER_NOT_FOUND", { serviceOrderId: linkedServiceOrderIds[0], changedDomains: ["MARKET", "SERVICE"] });
      return { ok: false, reason: "LINKED_SERVICE_ORDER_NOT_FOUND", operation: projectOperation(failed), quote, checkout };
    }
    const serviceInput = {
      ...input,
      operationType: "INSTALL",
      citizenId: id(input.citizenId),
      sourceItemId: instanceIds[0],
      instanceId: instanceIds[0],
      providerId: id(serviceOrder.providerId),
      serviceDefinitionId: id(serviceOrder.serviceDefinitionId),
      idempotencyKey,
      operationId,
      primarySlot: id(input.primarySlot),
      returnDestinationId: id(input.returnDestinationId)
    };
    const serviceQuote = quoteCyberwareService(serviceInput);
    if (!serviceQuote.ok) {
      const failed = failGeneric(operationId, serviceQuote.reason, { serviceOrderId: serviceOrder.serviceOrderId, instanceIds, changedDomains: ["SERVICE", "CYBERWARE"] });
      return { ok: false, reason: serviceQuote.reason, operation: projectOperation(failed), quote, serviceQuote, checkout };
    }
    const execution = executeServiceOrder({ ...serviceInput, plan: serviceQuote.plan }, serviceQuote, serviceOrder);
    if (!execution.ok) {
      const recoveryStatus = execution.physical?.itemTransactionId && /PAYMENT|CAPTURE|BILLING/.test(token(execution.reason))
        ? "PAYMENT_RECOVERY_REQUIRED"
        : "FAILED";
      const failed = failGeneric(operationId, execution.reason, {
        status: recoveryStatus,
        serviceOrderId: serviceOrder.serviceOrderId,
        billingIntentId: id(execution.order?.billingRefs?.billingIntentId),
        billingTransactionId: id(execution.order?.billingRefs?.billingTransactionId || checkout.billingTransactionId),
        itemTransactionIds: unique([execution.physical?.itemTransactionId]),
        instanceIds: unique(execution.physical?.instanceIds || instanceIds),
        changedDomains: ["MARKET", "SERVICE", "BILLING", ...(execution.physical?.itemTransactionId ? ["ITEM_INSTANCE", "CYBERWARE"] : [])]
      });
      return { ok: false, reason: execution.reason, operation: projectOperation(failed), quote, serviceQuote, checkout };
    }
    operation = recordRefs(operationId, {
      serviceOrderId: id(execution.order?.serviceOrderId),
      billingTransactionId: id(execution.order?.billingRefs?.billingTransactionId || checkout.billingTransactionId),
      itemTransactionIds: unique([execution.physical?.itemTransactionId]),
      instanceIds
    }, { step: "purchase-install" }) || operation;
    if (execution.scheduled) {
      operation = advance(operationId, "SCHEDULED", "WAITING_FOR_SERVICE_TIME", { changedDomains: ["MARKET", "SERVICE"] }) || operation;
      return { ok: true, status: "SCHEDULED", operation: projectOperation(operation), quote, serviceQuote, checkout, serviceOrder: execution.order };
    }
    const marketFinalization = app.finalizeMarketServiceFulfillment?.(id(checkout.marketOrderId || marketOrder?.marketOrderId), {
      idempotencyKey: `${idempotencyKey}:market-finalize`
    });
    if (marketFinalization?.ok === false && marketFinalization.reason !== "LINKED_SERVICE_ORDERS_NOT_COMPLETED") {
      const failed = failGeneric(operationId, marketFinalization.reason || "MARKET_SERVICE_FINALIZATION_FAILED", {
        status: /PAYMENT|RECOVERY/.test(token(marketFinalization.reason)) ? "PAYMENT_RECOVERY_REQUIRED" : "RECOVERY_REQUIRED",
        marketOrderId: id(checkout.marketOrderId || marketOrder?.marketOrderId),
        serviceOrderId: id(execution.order?.serviceOrderId),
        billingTransactionId: id(execution.order?.billingRefs?.billingTransactionId || checkout.billingTransactionId),
        itemTransactionIds: unique([execution.physical?.itemTransactionId]),
        instanceIds,
        changedDomains: ["MARKET", "SERVICE", "BILLING", "ITEM_INSTANCE", "CYBERWARE"]
      });
      return { ok: false, reason: marketFinalization.reason || "MARKET_SERVICE_FINALIZATION_FAILED", operation: projectOperation(failed), quote, serviceQuote, checkout, serviceOrder: execution.order, physical: execution.physical };
    }
    const completed = completeGeneric(operationId, {
      resultCode: "PURCHASE_AND_INSTALL_COMPLETED",
      marketOrderId: id(checkout.marketOrderId || marketOrder?.marketOrderId),
      serviceOrderId: id(execution.order?.serviceOrderId),
      billingTransactionId: id(execution.order?.billingRefs?.billingTransactionId || checkout.billingTransactionId),
      itemTransactionIds: unique([execution.physical?.itemTransactionId]),
      instanceIds,
      changedDomains: ["MARKET", "SERVICE", "BILLING", "ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE"]
    });
    return { ok: true, reason: "PURCHASE_AND_INSTALL_COMPLETED", operation: projectOperation(completed), quote, serviceQuote, checkout, serviceOrder: execution.order, physical: execution.physical };
  }

  function getCyberwareWorldOperation(operationId = "") { return projectOperation(getGenericOperation(operationId)); }
  function cancelCyberwareWorldOperation(operationId = "", options = {}) {
    let current = getGenericOperation(operationId);
    if (!current) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_NOT_FOUND" };
    if (TERMINAL_STATUSES.has(token(current.status))) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_TERMINAL", operation: projectOperation(current) };

    const refs = current.refs || {};
    const currentStatus = token(current.status);
    const currentStep = token(current.currentStep);
    const physicalCommitRecorded = Boolean(id(refs.itemTransactionId))
      || ["COMMITTING", "CAPTURING"].includes(currentStatus)
      || ["COMMIT", "CAPTURE", "COMPLETE"].includes(currentStep);
    if (physicalCommitRecorded) {
      return {
        ok: false,
        reason: "CYBERWARE_WORLD_OPERATION_NOT_CANCELLABLE_AFTER_PHYSICAL_COMMIT",
        compensationRequired: true,
        operation: projectOperation(current)
      };
    }

    const cancellationReason = token(options.reason || "CYBERWARE_WORLD_OPERATION_CANCELLED");
    const changedDomains = [];
    const cancellationErrors = [];
    let recoveryStatus = "RECOVERY_REQUIRED";

    // Market owns cancellation of its linked Service order, stock, custody and Billing.
    if (refs.marketOrderId) {
      changedDomains.push("MARKET", "SERVICE", "BILLING", "HOUSING", "ITEM_INSTANCE");
      if (typeof app.cancelMarketOrder !== "function") {
        cancellationErrors.push("MARKET_CANCEL_API_UNAVAILABLE");
      } else {
        const marketOrder = app.getMarketOrder?.(refs.marketOrderId) || null;
        const cancelled = app.cancelMarketOrder(refs.marketOrderId, {
          idempotencyKey: `${id(current.idempotencyKey)}:market-cancel`,
          expectedRevision: marketOrder?.revision,
          reasonCode: cancellationReason
        });
        if (!cancelled?.ok) {
          const marketStatus = token(cancelled?.order?.status || marketOrder?.status);
          if (marketStatus === "PAYMENT_RECOVERY_REQUIRED") recoveryStatus = "PAYMENT_RECOVERY_REQUIRED";
          else if (marketStatus === "COMPENSATION_REQUIRED") recoveryStatus = "COMPENSATION_REQUIRED";
          cancellationErrors.push(token(cancelled?.reason || "MARKET_ORDER_CANCELLATION_FAILED"));
        }
      }
    } else if (refs.serviceOrderId) {
      changedDomains.push("SERVICE", "BILLING");
      let serviceOrder = app.getServiceOrder?.(refs.serviceOrderId) || null;
      if (!serviceOrder) {
        cancellationErrors.push("SERVICE_ORDER_NOT_FOUND");
      } else {
        const paymentStatus = token(serviceOrder.paymentStatus || "PENDING");
        const billingIntentId = id(serviceOrder.billingRefs?.billingIntentId || refs.billingIntentId);
        const billingTransactionId = id(serviceOrder.billingRefs?.billingTransactionId || refs.billingTransactionId);
        if (billingTransactionId || ["CAPTURED", "PARTIALLY_CAPTURED", "PARTIALLY_REFUNDED", "PAYMENT_RECOVERY_REQUIRED"].includes(paymentStatus)) {
          recoveryStatus = "COMPENSATION_REQUIRED";
          cancellationErrors.push("SERVICE_BILLING_COMPENSATION_REQUIRED");
        } else if (billingIntentId || ["PENDING", "AUTHORIZED"].includes(paymentStatus)) {
          if (typeof app.voidServiceOrderBilling !== "function") {
            cancellationErrors.push("SERVICE_BILLING_VOID_API_UNAVAILABLE");
          } else {
            const voided = app.voidServiceOrderBilling(refs.serviceOrderId, {
              idempotencyKey: `${id(current.idempotencyKey)}:service-billing-void`,
              expectedRevision: serviceOrder.revision,
              reason: cancellationReason,
              reasonCode: cancellationReason
            });
            if (!voided?.ok) {
              recoveryStatus = token(voided?.reason).includes("REFUND") ? "COMPENSATION_REQUIRED" : "RECOVERY_REQUIRED";
              cancellationErrors.push(token(voided?.reason || "SERVICE_BILLING_VOID_FAILED"));
            } else {
              serviceOrder = voided.order || app.getServiceOrder?.(refs.serviceOrderId) || serviceOrder;
            }
          }
        }

        if (!cancellationErrors.length) {
          if (typeof app.cancelServiceOrder !== "function") {
            cancellationErrors.push("SERVICE_CANCEL_API_UNAVAILABLE");
          } else if (!["COMPLETED", "FAILED", "CANCELLED"].includes(token(serviceOrder.status))) {
            const cancelled = app.cancelServiceOrder(refs.serviceOrderId, cancellationReason, {
              idempotencyKey: `${id(current.idempotencyKey)}:service-cancel`,
              expectedRevision: serviceOrder.revision,
              metadata: { worldBridgeOperationId: current.operationId }
            });
            if (!cancelled?.ok) {
              const reason = token(cancelled?.reason || "SERVICE_ORDER_CANCELLATION_FAILED");
              if (reason.includes("COMPENSATION") || reason.includes("REFUND")) recoveryStatus = "COMPENSATION_REQUIRED";
              cancellationErrors.push(reason);
            }
          }
        }
      }
    }

    current = getGenericOperation(operationId) || current;
    if (cancellationErrors.length) {
      const response = mutateWorldOperation("updateWorldBridgeOperation", operationId, {
        status: recoveryStatus,
        currentStep: "COMPENSATE",
        errorCode: cancellationErrors[0],
        retry: { lastErrorCode: cancellationErrors[0] },
        recovery: { required: true, reasonCodes: cancellationErrors },
        compensation: {
          status: recoveryStatus === "COMPENSATION_REQUIRED" ? "REQUIRED" : "PENDING",
          attempts: Math.max(0, Number(current.compensation?.attempts || 0) || 0),
          lastErrorCode: cancellationErrors[0]
        },
        metadata: {
          resultCode: "CYBERWARE_WORLD_OPERATION_CANCELLATION_RECOVERY_REQUIRED",
          changedDomains: normalizeDomains(changedDomains),
          cancellationReason,
          cancellationErrors
        },
        checkpointCode: "CANCELLATION_RECOVERY_REQUIRED"
      }, {
        forceTransition: true,
        flush: true,
        source: "CYBERWARE_WORLD_BRIDGE_CANCELLATION_RECOVERY_REQUIRED"
      });
      const operation = resultOf(response) || getGenericOperation(operationId) || current;
      emitCyberwareOperation(operation, { changedDomains });
      return {
        ok: false,
        reason: cancellationErrors[0] || "CYBERWARE_WORLD_OPERATION_CANCELLATION_RECOVERY_REQUIRED",
        recoveryRequired: true,
        errors: cancellationErrors,
        operation: projectOperation(operation)
      };
    }

    const response = mutateWorldOperation("transitionWorldBridgeOperation", operationId, {
      status: "CANCELLED",
      currentStep: "COMPLETE",
      recovery: { required: false, reasonCodes: [] },
      compensation: { status: "NOT_REQUIRED", lastErrorCode: "" },
      metadata: {
        resultCode: "CYBERWARE_WORLD_OPERATION_CANCELLED",
        changedDomains: normalizeDomains(changedDomains),
        cancellationReason
      },
      checkpointCode: "CANCELLED"
    }, {
      forceTransition: true,
      flush: true,
      source: "CYBERWARE_WORLD_BRIDGE_CANCELLED"
    });
    const operation = resultOf(response) || getGenericOperation(operationId);
    emitCyberwareOperation(operation, { changedDomains });
    return { ok: response?.ok !== false, reason: response?.reason || "CYBERWARE_WORLD_OPERATION_CANCELLED", operation: projectOperation(operation) };
  }
  function getCompensationIdempotencyKey(operation = {}, options = {}) {
    return id(options.idempotencyKey || operation.metadata?.compensationIdempotencyKey || `${id(operation.idempotencyKey)}:compensation`);
  }
  function getCompensationReason(operation = {}, options = {}) {
    return token(options.reasonCode || options.reason || operation.metadata?.compensationReason || "CYBERWARE_WORLD_OPERATION_COMPENSATION");
  }
  function getCompensationOperationType(operation = {}) {
    return normalizeOperation(operation.metadata?.cyberwareOperationType || String(operation.operationType || "").replace(/^CYBERWARE_/, ""));
  }
  function quoteCyberwareWorldCompensation(operationId = "", options = {}) {
    diagnostics.compensationQuotes += 1;
    const operation = getGenericOperation(operationId);
    if (!operation) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_NOT_FOUND", blockers: ["WORLD_BRIDGE_OPERATION_NOT_FOUND"] };
    if (!isCyberwareWorldOperation(operation)) return { ok: false, reason: "CYBERWARE_WORLD_OPERATION_REQUIRED", blockers: ["CYBERWARE_WORLD_OPERATION_REQUIRED"] };
    const operationType = getCompensationOperationType(operation);
    const status = token(operation.status);
    const refs = operation.refs || {};
    const blockers = [];
    if (!COMPENSATABLE_OPERATION_STATUSES.has(status)) blockers.push(`CYBERWARE_WORLD_OPERATION_NOT_COMPENSATABLE:${status}`);
    if (operation.compensation?.status === "COMPLETED") {
      return {
        ok: true,
        replayed: true,
        operationType,
        operation: projectOperation(operation),
        steps: [],
        blockers: [],
        reason: "CYBERWARE_WORLD_OPERATION_COMPENSATION_ALREADY_COMPLETED"
      };
    }
    if (operationType !== "PURCHASE_TO_HOUSING" && !id(refs.itemTransactionId)) blockers.push("ITEM_INSTANCE_TRANSACTION_REQUIRED");
    if (PURCHASE_OPERATION_TYPES.has(operationType) && !id(refs.marketOrderId)) blockers.push("MARKET_ORDER_REQUIRED");
    if (SERVICE_OPERATION_TYPES.has(operationType) && !id(refs.serviceOrderId)) blockers.push("SERVICE_ORDER_REQUIRED");
    const requiredApis = ["updateWorldBridgeOperation", "getWorldBridgeOperation"];
    if (operationType !== "PURCHASE_TO_HOUSING") requiredApis.push("compensateItemInstanceTransaction", "getItemInstanceTransaction");
    if (id(refs.serviceOrderId)) requiredApis.push("getServiceOrder", "voidServiceOrderBilling", "refundServiceOrderBilling");
    if (id(refs.marketOrderId)) requiredApis.push("getMarketOrder", "requestMarketOrderRefund", "executeMarketOrderRefund", "retryMarketOrderRefund");
    requiredApis.filter((name) => typeof app[name] !== "function").forEach((name) => blockers.push(`DEPENDENCY_MISSING:${name}`));
    const steps = [];
    if (id(refs.itemTransactionId)) steps.push("COMPENSATE_ITEM_TRANSACTION");
    if (id(refs.serviceOrderId)) steps.push("SETTLE_SERVICE_BILLING");
    if (id(refs.marketOrderId)) steps.push(PURCHASE_OPERATION_TYPES.has(operationType) ? "SETTLE_MARKET_ORDER" : "SETTLE_MARKET_REFERENCE");
    steps.push("FINALIZE_WORLD_OPERATION");
    return {
      ok: blockers.length === 0,
      reason: blockers[0] || "CYBERWARE_WORLD_OPERATION_COMPENSATION_READY",
      operationType,
      status,
      operation: projectOperation(operation),
      refs: clone(refs),
      steps,
      blockers: [...new Set(blockers)],
      idempotencyKey: getCompensationIdempotencyKey(operation, options)
    };
  }
  function updateCompensationOperation(operationId = "", patch = {}, options = {}) {
    const current = getGenericOperation(operationId);
    if (!current) return null;
    const response = mutateWorldOperation("updateWorldBridgeOperation", operationId, patch, {
      forceTransition: true,
      flush: options.flush !== false,
      retryStale: options.retryStale !== false,
      source: options.source || "CYBERWARE_WORLD_BRIDGE_COMPENSATION_UPDATED"
    });
    return resultOf(response) || getGenericOperation(operationId) || current;
  }
  function failCompensation(operationId = "", reason = "", context = {}) {
    diagnostics.compensationFailures += 1;
    const current = getGenericOperation(operationId);
    if (!current) return { ok: false, reason: token(reason || "CYBERWARE_WORLD_COMPENSATION_FAILED"), operation: null };
    const errorCode = token(reason || "CYBERWARE_WORLD_COMPENSATION_FAILED");
    const changedDomains = normalizeDomains(context.changedDomains || []);
    const operation = updateCompensationOperation(operationId, {
      status: context.paymentRecoveryRequired === true ? "PAYMENT_RECOVERY_REQUIRED" : "COMPENSATION_REQUIRED",
      currentStep: "COMPENSATE",
      errorCode,
      retry: { lastErrorCode: errorCode },
      recovery: { required: true, reasonCodes: unique([...(current.recovery?.reasonCodes || []), errorCode, ...(context.errors || [])]) },
      compensation: {
        status: "RECOVERY_REQUIRED",
        attempts: Math.max(1, Number(current.compensation?.attempts || 0) || 0),
        lastErrorCode: errorCode
      },
      metadata: {
        changedDomains,
        resultCode: "CYBERWARE_WORLD_OPERATION_COMPENSATION_RECOVERY_REQUIRED",
        compensationIdempotencyKey: id(context.idempotencyKey || current.metadata?.compensationIdempotencyKey),
        compensationReason: token(context.reasonCode || current.metadata?.compensationReason || errorCode),
        compensationErrors: unique([errorCode, ...(context.errors || [])]),
        compensationResult: clone(context.result || null)
      },
      checkpointCode: "COMPENSATION_RECOVERY_REQUIRED"
    }, { source: "CYBERWARE_WORLD_BRIDGE_COMPENSATION_RECOVERY_REQUIRED" });
    emitCyberwareOperation(operation, { changedDomains });
    return {
      ok: false,
      reason: errorCode,
      recoveryRequired: true,
      errors: unique([errorCode, ...(context.errors || [])]),
      result: clone(context.result || null),
      operation: projectOperation(operation)
    };
  }
  function completeCompensation(operationId = "", context = {}) {
    diagnostics.compensationSuccesses += 1;
    const current = getGenericOperation(operationId);
    if (!current) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_NOT_FOUND", operation: null };
    const changedDomains = normalizeDomains(context.changedDomains || []);
    const operation = updateCompensationOperation(operationId, {
      status: "CANCELLED",
      currentStep: "COMPLETE",
      recovery: { required: false, reasonCodes: [] },
      retry: { lastErrorCode: "" },
      compensation: {
        status: "COMPLETED",
        attempts: Math.max(1, Number(current.compensation?.attempts || 0) || 0),
        lastErrorCode: "",
        completedAt: now()
      },
      metadata: {
        changedDomains,
        resultCode: "CYBERWARE_WORLD_OPERATION_COMPENSATED",
        compensationIdempotencyKey: id(context.idempotencyKey || current.metadata?.compensationIdempotencyKey),
        compensationReason: token(context.reasonCode || current.metadata?.compensationReason || "CYBERWARE_WORLD_OPERATION_COMPENSATION"),
        compensationErrors: [],
        compensationResult: clone(context.result || null),
        compensatedFromStatus: token(context.compensatedFromStatus || current.status)
      },
      checkpointCode: "COMPENSATED"
    }, { source: "CYBERWARE_WORLD_BRIDGE_COMPENSATED" });
    emitCyberwareOperation(operation, { changedDomains });
    return {
      ok: true,
      reason: "CYBERWARE_WORLD_OPERATION_COMPENSATED",
      compensated: true,
      result: clone(context.result || null),
      operation: projectOperation(operation)
    };
  }
  function compensatePhysicalItemTransaction(operation = {}, compensationKey = "") {
    const transactionId = id(operation.refs?.itemTransactionId);
    if (!transactionId) return { ok: true, operation: "NOT_REQUIRED", transaction: null, changedDomains: [] };
    const transaction = app.getItemInstanceTransaction?.(transactionId) || null;
    if (!transaction) return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_NOT_FOUND", transactionId };
    if (token(transaction.status) === "COMPENSATED") {
      diagnostics.compensationReplays += 1;
      return { ok: true, operation: "IDEMPOTENT_REPLAY", transaction, changedDomains: [] };
    }
    const result = app.compensateItemInstanceTransaction?.(transactionId, {
      idempotencyKey: `${compensationKey}:item-transaction`,
      source: "CYBERWARE_WORLD_BRIDGE_COMPENSATION",
      changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE", "SERVICE"]
    }) || { ok: false, reason: "ITEM_INSTANCE_COMPENSATION_API_UNAVAILABLE" };
    if (!result?.ok) return { ok: false, reason: result?.reason || "ITEM_INSTANCE_COMPENSATION_FAILED", transactionId, result };
    diagnostics.itemTransactionCompensations += result.operation === "IDEMPOTENT_REPLAY" ? 0 : 1;
    return {
      ok: true,
      operation: result.operation || "COMPENSATED",
      transaction: result.transaction || app.getItemInstanceTransaction?.(transactionId) || transaction,
      changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE", "SERVICE"]
    };
  }
  function invokeServiceCommandWithRevision(commandName = "", serviceOrderId = "", args = [], options = {}) {
    const command = app[commandName];
    if (typeof command !== "function") return { ok: false, reason: `SERVICE_API_MISSING:${token(commandName)}` };
    let order = app.getServiceOrder?.(serviceOrderId) || null;
    if (!order) return { ok: false, reason: "SERVICE_ORDER_NOT_FOUND" };
    const invoke = () => command(serviceOrderId, ...args, { ...options, expectedRevision: order.revision });
    let result = invoke();
    if (result?.ok === false && result.reason === "SERVICE_ORDER_REVISION_CONFLICT") {
      order = app.getServiceOrder?.(serviceOrderId) || order;
      result = invoke();
    }
    return result;
  }
  function settleServiceForCompensation(operation = {}, compensationKey = "", reasonCode = "") {
    const serviceOrderId = id(operation.refs?.serviceOrderId);
    if (!serviceOrderId) return { ok: true, operation: "NOT_REQUIRED", changedDomains: [] };
    let order = app.getServiceOrder?.(serviceOrderId) || null;
    if (!order) return { ok: false, reason: "SERVICE_ORDER_NOT_FOUND", serviceOrderId };
    const itemTransactionId = id(operation.refs?.itemTransactionId || order.billingRefs?.itemTransactionId);
    const paymentStatus = token(order.paymentStatus || "PENDING");
    let billingResult = null;
    if (["CAPTURED", "PARTIALLY_CAPTURED", "PARTIALLY_REFUNDED", "PAYMENT_RECOVERY_REQUIRED"].includes(paymentStatus) || id(order.billingRefs?.billingTransactionId)) {
      billingResult = invokeServiceCommandWithRevision("refundServiceOrderBilling", serviceOrderId, [null], {
        idempotencyKey: `${compensationKey}:service-refund-command`,
        billingRefundIdempotencyKey: `${compensationKey}:service-refund`,
        itemTransactionId,
        executionCompensated: !itemTransactionId,
        reason: reasonCode,
        reasonCode,
        createdBy: "CYBERWARE_WORLD_BRIDGE",
        billingMetadata: { worldBridgeOperationId: id(operation.operationId) }
      });
      if (!billingResult?.ok) return { ok: false, reason: billingResult?.reason || "SERVICE_BILLING_REFUND_FAILED", serviceOrderId, billingResult };
      diagnostics.serviceBillingRefunds += billingResult.replayed === true ? 0 : 1;
    } else if (["PENDING", "AUTHORIZED"].includes(paymentStatus) || id(order.billingRefs?.billingIntentId)) {
      billingResult = invokeServiceCommandWithRevision("voidServiceOrderBilling", serviceOrderId, [], {
        idempotencyKey: `${compensationKey}:service-void-command`,
        billingVoidIdempotencyKey: `${compensationKey}:service-void`,
        reason: reasonCode,
        reasonCode,
        billingMetadata: { worldBridgeOperationId: id(operation.operationId) }
      });
      if (!billingResult?.ok) return { ok: false, reason: billingResult?.reason || "SERVICE_BILLING_VOID_FAILED", serviceOrderId, billingResult };
      diagnostics.serviceBillingVoids += billingResult.replayed === true ? 0 : 1;
    }
    order = billingResult?.order || app.getServiceOrder?.(serviceOrderId) || order;
    if (!["COMPLETED", "FAILED", "CANCELLED", "REJECTED", "EXPIRED"].includes(token(order.status))) {
      const cancelled = invokeServiceCommandWithRevision("cancelServiceOrder", serviceOrderId, [reasonCode], {
        idempotencyKey: `${compensationKey}:service-cancel`,
        resultCode: "CYBERWARE_WORLD_OPERATION_COMPENSATED",
        metadata: { worldBridgeOperationId: id(operation.operationId), compensated: true }
      });
      if (!cancelled?.ok) return { ok: false, reason: cancelled?.reason || "SERVICE_ORDER_CANCELLATION_FAILED", serviceOrderId, billingResult, cancellation: cancelled };
      order = cancelled.order || order;
    }
    return {
      ok: true,
      operation: "SERVICE_COMPENSATED",
      serviceOrder: order,
      billingResult,
      changedDomains: ["SERVICE", "BILLING"]
    };
  }
  function getCompensationHousingUnits(citizenId = "", preferredHousingStorageId = "") {
    const records = app.getCitizenHousingRecords?.(citizenId) || [];
    const units = (Array.isArray(records) ? records : []).flatMap((record) => Array.isArray(record.storageUnits) ? record.storageUnits : []);
    const preferred = id(preferredHousingStorageId);
    return preferred
      ? [...units.filter((unit) => id(unit.id) === preferred), ...units.filter((unit) => id(unit.id) !== preferred)]
      : units;
  }
  function stagePurchaseInstancesForMarketRefund(operation = {}, compensationKey = "", options = {}) {
    const marketOrder = app.getMarketOrder?.(operation.refs?.marketOrderId) || null;
    if (!marketOrder) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    const instanceIds = unique(operation.refs?.instanceIds || marketOrder.createdItemInstanceIds || []);
    const instances = instanceIds.map((instanceId) => app.getItemInstanceById?.(instanceId)).filter(Boolean);
    if (instances.length !== instanceIds.length) return { ok: false, reason: "MARKET_ORDER_ITEM_INSTANCES_REQUIRED", instanceIds };
    if (instances.every((instance) => token(instance.location?.type) === "HOUSING_STORAGE")) {
      return { ok: true, operation: "IDEMPOTENT_REPLAY", transaction: null, reservations: [], changedDomains: [] };
    }
    if (instances.some((instance) => token(instance.location?.type) === "VENDOR")) {
      return { ok: true, operation: "MARKET_RETURN_ALREADY_COMMITTED", transaction: null, reservations: [], changedDomains: [] };
    }
    if (instances.some((instance) => token(instance.location?.type) !== "SERVICE")) {
      return {
        ok: false,
        reason: "CYBERWARE_COMPENSATION_SERVICE_CUSTODY_REQUIRED",
        locations: instances.map((instance) => ({ instanceId: id(instance.instanceId), locationType: token(instance.location?.type) }))
      };
    }
    const storedInput = getStoredRecoveryInput(operation, options);
    const units = getCompensationHousingUnits(operation.citizenId, options.housingStorageId || storedInput.housingStorageId);
    if (!units.length) return { ok: false, reason: "HOUSING_DESTINATION_REQUIRED" };
    const reservations = [];
    for (const instance of instances) {
      let reservationResult = null;
      for (const unit of units) {
        reservationResult = app.reserveHousingPlacement?.({
          idempotencyKey: `${compensationKey}:housing:${id(instance.instanceId)}`,
          citizenId: id(operation.citizenId),
          housingStorageId: id(unit.id),
          definitionId: id(instance.definitionId),
          marketOrderId: id(marketOrder.marketOrderId),
          item: clone(instance)
        }) || { ok: false, reason: "HOUSING_RESERVATION_API_UNAVAILABLE" };
        if (reservationResult?.ok) break;
        if (reservationResult?.reason !== "HOUSING_STORAGE_FULL") break;
      }
      if (!reservationResult?.ok) {
        reservations.forEach((reservation) => app.releaseHousingPlacementReservation?.(reservation.reservationId, "CYBERWARE_COMPENSATION_STAGING_FAILED"));
        return { ok: false, reason: reservationResult?.reason || "HOUSING_RESERVATION_FAILED", reservations };
      }
      reservations.push(reservationResult.reservation);
    }
    const operations = reservations.map((reservation, index) => ({
      type: "MOVE",
      instanceId: id(instances[index].instanceId),
      expected: { ownerId: id(operation.citizenId), locationType: "SERVICE" },
      toLocation: {
        type: "HOUSING_STORAGE",
        storageUnitId: id(reservation.housingStorageId),
        gridX: Number(reservation.placement?.gridX || 1),
        gridY: Number(reservation.placement?.gridY || 1),
        rotation: Number(reservation.placement?.rotation || 0)
      },
      lifecycleState: "UNPACKAGED"
    }));
    const transaction = app.commitItemInstanceTransaction?.({
      idempotencyKey: `${compensationKey}:market-refund-staging`,
      sourceDomain: "WORLD_BRIDGE",
      sourceRefId: id(operation.operationId),
      citizenId: id(operation.citizenId),
      changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE", "HOUSING"],
      metadata: { operationType: "CYBERWARE_COMPENSATION_MARKET_REFUND_STAGING", marketOrderId: id(marketOrder.marketOrderId) },
      operations
    }) || { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_API_UNAVAILABLE" };
    if (!transaction?.ok) {
      reservations.forEach((reservation) => app.releaseHousingPlacementReservation?.(reservation.reservationId, "CYBERWARE_COMPENSATION_STAGING_FAILED"));
      return { ok: false, reason: transaction?.reason || "MARKET_REFUND_STAGING_FAILED", transaction, reservations };
    }
    const commitErrors = [];
    reservations.forEach((reservation, index) => {
      const committed = app.commitHousingPlacement?.({
        reservationId: reservation.reservationId,
        instanceId: id(instances[index].instanceId),
        marketOrderId: id(marketOrder.marketOrderId),
        expectedRevision: reservation.revision
      });
      if (!committed?.ok) commitErrors.push(committed?.reason || "HOUSING_PLACEMENT_COMMIT_FAILED");
    });
    app.flushHousingPlacementPersistence?.();
    if (commitErrors.length) {
      const txId = id(transaction.transaction?.transactionId);
      if (txId) app.compensateItemInstanceTransaction?.(txId, {
        idempotencyKey: `${compensationKey}:market-refund-staging-rollback`,
        source: "CYBERWARE_COMPENSATION_HOUSING_COMMIT_FAILURE",
        changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE", "HOUSING"]
      });
      reservations.forEach((reservation) => app.releaseHousingPlacementReservation?.(reservation.reservationId, "CYBERWARE_COMPENSATION_HOUSING_COMMIT_FAILURE"));
      return { ok: false, reason: commitErrors[0], errors: commitErrors, transaction, reservations };
    }
    diagnostics.marketRefundStagingTransactions += transaction.operation === "IDEMPOTENT_REPLAY" ? 0 : 1;
    return {
      ok: true,
      operation: transaction.operation || "COMMITTED",
      transaction: transaction.transaction || null,
      reservations,
      changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE", "HOUSING"]
    };
  }
  function executeMarketCompensation(operation = {}, compensationKey = "", reasonCode = "", options = {}) {
    const marketOrderId = id(operation.refs?.marketOrderId);
    if (!marketOrderId) return { ok: true, operation: "NOT_REQUIRED", changedDomains: [] };
    let order = app.getMarketOrder?.(marketOrderId) || null;
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND", marketOrderId };
    const operationType = getCompensationOperationType(operation);
    const refundStatus = token(order.refundRequest?.status || "NONE");
    if (token(order.status) === "REFUNDED" || refundStatus === "COMPLETED") {
      diagnostics.compensationReplays += 1;
      return { ok: true, operation: "IDEMPOTENT_REPLAY", order, changedDomains: ["MARKET", "BILLING"] };
    }
    if (["PROCESSING", "RECOVERY_REQUIRED"].includes(refundStatus)) {
      const previousReturnTransaction = id(order.refundRequest?.itemTransactionId)
        ? app.getItemInstanceTransaction?.(order.refundRequest.itemTransactionId)
        : null;
      const retried = app.retryMarketOrderRefund?.(marketOrderId, {
        idempotencyKey: id(order.refundRequest?.executionIdempotencyKey) || `${compensationKey}:market-refund-execute`,
        expectedRevision: order.revision,
        reasonCode
      }) || { ok: false, reason: "MARKET_REFUND_RETRY_API_UNAVAILABLE" };
      if (!retried?.ok) return { ok: false, reason: retried?.reason || "MARKET_REFUND_RETRY_FAILED", order: retried?.order || order, paymentRecoveryRequired: true };
      diagnostics.marketRefunds += retried.operation === "IDEMPOTENT_REPLAY" ? 0 : 1;
      return {
        ok: true,
        operation: retried.operation || "REFUNDED",
        order: retried.order || app.getMarketOrder?.(marketOrderId) || order,
        changedDomains: previousReturnTransaction && ["COMMITTED", "RECOVERY_REQUIRED"].includes(token(previousReturnTransaction.status))
          ? ["MARKET", "BILLING"]
          : ["MARKET", "BILLING", "ITEM_INSTANCE", "EQUIPMENT"]
      };
    }
    if (token(order.status) !== "COMPLETED" || token(order.paymentStatus) !== "CAPTURED") {
      if (operationType === "PURCHASE_AND_INSTALL" && typeof app.failMarketServiceFulfillment === "function") {
        const failed = app.failMarketServiceFulfillment(marketOrderId, id(operation.refs?.serviceOrderId), "CANCELLED", reasonCode);
        const nextOrder = failed?.order || app.getMarketOrder?.(marketOrderId) || order;
        if (["FAILED", "CANCELLED"].includes(token(nextOrder.status)) && !["PARTIAL", "PENDING"].includes(token(nextOrder.compensationStatus))) {
          diagnostics.marketCancellationCompensations += 1;
          return { ok: true, operation: "MARKET_SERVICE_COMPENSATED", order: nextOrder, changedDomains: ["MARKET", "BILLING", "SERVICE", "ITEM_INSTANCE", "EQUIPMENT"] };
        }
        return { ok: false, reason: failed?.reason || "MARKET_SERVICE_COMPENSATION_FAILED", order: nextOrder, paymentRecoveryRequired: token(nextOrder.status) === "PAYMENT_RECOVERY_REQUIRED" };
      }
      const cancelled = app.cancelMarketOrder?.(marketOrderId, {
        idempotencyKey: `${compensationKey}:market-cancel`,
        expectedRevision: order.revision,
        reasonCode,
        note: `World Bridge compensation ${id(operation.operationId)}`
      }) || { ok: false, reason: "MARKET_CANCEL_API_UNAVAILABLE" };
      if (!cancelled?.ok) return { ok: false, reason: cancelled?.reason || "MARKET_ORDER_CANCELLATION_FAILED", order: cancelled?.order || order };
      diagnostics.marketCancellationCompensations += cancelled.operation === "IDEMPOTENT_REPLAY" ? 0 : 1;
      return { ok: true, operation: cancelled.operation || "CANCELLED", order: cancelled.order || app.getMarketOrder?.(marketOrderId) || order, changedDomains: ["MARKET", "BILLING", "SERVICE"] };
    }
    let staging = { ok: true, operation: "NOT_REQUIRED", reservations: [], changedDomains: [] };
    if (operationType === "PURCHASE_AND_INSTALL") {
      staging = stagePurchaseInstancesForMarketRefund(operation, compensationKey, options);
      if (!staging.ok) return { ...staging, order };
      order = app.getMarketOrder?.(marketOrderId) || order;
    }
    if (token(order.refundRequest?.status || "NONE") !== "REQUESTED") {
      const requested = app.requestMarketOrderRefund?.(marketOrderId, {
        idempotencyKey: `${compensationKey}:market-refund-request`,
        expectedRevision: order.revision,
        reasonCode,
        note: `World Bridge compensation ${id(operation.operationId)}`
      }) || { ok: false, reason: "MARKET_REFUND_REQUEST_API_UNAVAILABLE" };
      if (!requested?.ok && requested?.reason !== "MARKET_ORDER_REFUND_ALREADY_REQUESTED") return { ok: false, reason: requested?.reason || "MARKET_REFUND_REQUEST_FAILED", order: requested?.order || order, staging };
      order = requested?.order || app.getMarketOrder?.(marketOrderId) || order;
    }
    const executionKey = id(order.refundRequest?.executionIdempotencyKey) || `${compensationKey}:market-refund-execute`;
    const refunded = app.executeMarketOrderRefund?.(marketOrderId, {
      idempotencyKey: executionKey,
      expectedRevision: order.revision,
      reasonCode
    }) || { ok: false, reason: "MARKET_REFUND_EXECUTION_API_UNAVAILABLE" };
    if (!refunded?.ok) return { ok: false, reason: refunded?.reason || "MARKET_REFUND_EXECUTION_FAILED", order: refunded?.order || order, staging, paymentRecoveryRequired: refunded?.recoveryRequired === true };
    diagnostics.marketRefunds += refunded.operation === "IDEMPOTENT_REPLAY" ? 0 : 1;
    (staging.reservations || []).forEach((reservation) => {
      const latest = app.getHousingPlacementReservation?.(reservation.reservationId) || reservation;
      app.releaseHousingPlacementReservation?.(reservation.reservationId, "CYBERWARE_WORLD_OPERATION_COMPENSATED", { expectedRevision: latest.revision });
    });
    app.flushHousingPlacementPersistence?.();
    return {
      ok: true,
      operation: refunded.operation || "REFUNDED",
      order: refunded.order || app.getMarketOrder?.(marketOrderId) || order,
      staging,
      itemTransactionId: id(refunded.itemTransactionId),
      billingRefundTransactionId: id(refunded.billingRefundTransactionId),
      changedDomains: normalizeDomains(["MARKET", "BILLING", "ITEM_INSTANCE", "EQUIPMENT", ...staging.changedDomains])
    };
  }
  async function compensateCyberwareWorldOperation(operationId = "", options = {}) {
    const normalizedOperationId = id(operationId);
    const existingPromise = activeCompensationByOperationId.get(normalizedOperationId);
    if (existingPromise) {
      diagnostics.compensationResumeSuppressions += 1;
      return existingPromise;
    }
    const run = (async () => {
      const initial = getGenericOperation(normalizedOperationId);
      const quote = quoteCyberwareWorldCompensation(normalizedOperationId, options);
      if (!quote.ok) return { ok: false, reason: quote.reason, blockers: quote.blockers || [], operation: quote.operation || null };
      const compensationKey = getCompensationIdempotencyKey(initial, options);
      const existingKey = id(initial.metadata?.compensationIdempotencyKey);
      if (initial.compensation?.status === "COMPLETED") {
        if (existingKey && existingKey !== compensationKey) return { ok: false, reason: "CYBERWARE_WORLD_COMPENSATION_IDEMPOTENCY_CONFLICT", operation: projectOperation(initial) };
        diagnostics.compensationReplays += 1;
        return { ok: true, replayed: true, reason: "IDEMPOTENT_REPLAY", operation: projectOperation(initial) };
      }
      if (existingKey && existingKey !== compensationKey && COMPENSATION_RETRY_STATUSES.has(token(initial.compensation?.status))) {
        return { ok: false, reason: "CYBERWARE_WORLD_COMPENSATION_IDEMPOTENCY_CONFLICT", operation: projectOperation(initial) };
      }
      diagnostics.compensationAttempts += 1;
      const reasonCode = getCompensationReason(initial, options);
      const compensatedFromStatus = token(initial.status);
      let current = updateCompensationOperation(normalizedOperationId, {
        status: "COMPENSATION_REQUIRED",
        currentStep: "COMPENSATE",
        recovery: { required: true, reasonCodes: unique([...(initial.recovery?.reasonCodes || []), reasonCode]) },
        compensation: {
          status: "IN_PROGRESS",
          attempts: Math.max(0, Number(initial.compensation?.attempts || 0) || 0) + 1,
          lastErrorCode: ""
        },
        metadata: {
          changedDomains: [],
          resultCode: "CYBERWARE_WORLD_OPERATION_COMPENSATION_STARTED",
          compensationIdempotencyKey: compensationKey,
          compensationReason: reasonCode,
          compensationErrors: [],
          compensatedFromStatus
        },
        checkpointCode: "COMPENSATION_STARTED"
      }, { source: "CYBERWARE_WORLD_BRIDGE_COMPENSATION_STARTED" });
      if (!current) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_MUTATION_FAILED" };
      const changedDomains = [];
      const result = { item: null, service: null, market: null };
      const itemResult = compensatePhysicalItemTransaction(current, compensationKey);
      result.item = clone(itemResult);
      if (!itemResult.ok) return failCompensation(normalizedOperationId, itemResult.reason, { idempotencyKey: compensationKey, reasonCode, changedDomains, result });
      changedDomains.push(...(itemResult.changedDomains || []));
      current = getGenericOperation(normalizedOperationId) || current;
      const serviceResult = settleServiceForCompensation(current, compensationKey, reasonCode);
      result.service = clone(serviceResult);
      if (!serviceResult.ok) return failCompensation(normalizedOperationId, serviceResult.reason, { idempotencyKey: compensationKey, reasonCode, changedDomains, result, paymentRecoveryRequired: token(serviceResult.reason).includes("BILLING") });
      changedDomains.push(...(serviceResult.changedDomains || []));
      current = getGenericOperation(normalizedOperationId) || current;
      const marketResult = executeMarketCompensation(current, compensationKey, reasonCode, options);
      result.market = clone(marketResult);
      if (!marketResult.ok) return failCompensation(normalizedOperationId, marketResult.reason, {
        idempotencyKey: compensationKey,
        reasonCode,
        changedDomains: normalizeDomains([...changedDomains, ...(marketResult.changedDomains || [])]),
        result,
        paymentRecoveryRequired: marketResult.paymentRecoveryRequired === true || token(marketResult.reason).includes("BILLING")
      });
      changedDomains.push(...(marketResult.changedDomains || []));
      return completeCompensation(normalizedOperationId, {
        idempotencyKey: compensationKey,
        reasonCode,
        compensatedFromStatus,
        changedDomains: normalizeDomains(changedDomains),
        result
      });
    })();
    activeCompensationByOperationId.set(normalizedOperationId, run);
    try {
      return await run;
    } finally {
      activeCompensationByOperationId.delete(normalizedOperationId);
    }
  }
  async function retryCyberwareWorldCompensation(operationId = "", options = {}) {
    diagnostics.compensationRetries += 1;
    const operation = getGenericOperation(operationId);
    if (!operation) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_NOT_FOUND" };
    return compensateCyberwareWorldOperation(operationId, {
      ...options,
      retry: true,
      idempotencyKey: id(options.idempotencyKey || operation.metadata?.compensationIdempotencyKey || `${id(operation.idempotencyKey)}:compensation`),
      reasonCode: options.reasonCode || operation.metadata?.compensationReason || "CYBERWARE_WORLD_OPERATION_COMPENSATION_RETRY"
    });
  }
  function auditCyberwareWorldBridgeCompensation() {
    const operations = typeof app.getWorldBridgeOperations === "function"
      ? app.getWorldBridgeOperations().filter((operation) => isCyberwareWorldOperation(operation))
      : [];
    const issues = [];
    operations.forEach((operation) => {
      const status = token(operation.status);
      const compensationStatus = token(operation.compensation?.status || "NOT_REQUIRED");
      const itemTransactionId = id(operation.refs?.itemTransactionId);
      if (compensationStatus === "COMPLETED" && status !== "CANCELLED") {
        issues.push({ code: "CYBERWARE_COMPENSATION_COMPLETED_STATUS_MISMATCH", operationId: id(operation.operationId), status });
      }
      if (compensationStatus === "COMPLETED" && itemTransactionId) {
        const transaction = app.getItemInstanceTransaction?.(itemTransactionId) || null;
        if (transaction && token(transaction.status) !== "COMPENSATED") {
          issues.push({ code: "CYBERWARE_COMPENSATION_ITEM_TRANSACTION_NOT_COMPENSATED", operationId: id(operation.operationId), itemTransactionId, transactionStatus: token(transaction.status) });
        }
      }
      if (status === "COMPENSATION_REQUIRED" && !id(operation.metadata?.compensationIdempotencyKey)) {
        issues.push({ code: "CYBERWARE_COMPENSATION_IDEMPOTENCY_KEY_REQUIRED", operationId: id(operation.operationId) });
      }
      if (compensationStatus === "IN_PROGRESS" && !operation.recovery?.required) {
        issues.push({ code: "CYBERWARE_COMPENSATION_RECOVERY_FLAG_REQUIRED", operationId: id(operation.operationId) });
      }
    });
    return {
      valid: issues.length === 0,
      version: "16.1x",
      operationCount: operations.length,
      completedCompensationCount: operations.filter((operation) => token(operation.compensation?.status) === "COMPLETED").length,
      pendingCompensationCount: operations.filter((operation) => ["IN_PROGRESS", "RECOVERY_REQUIRED", "REQUIRED"].includes(token(operation.compensation?.status))).length,
      issues,
      checkedAt: now()
    };
  }
  function resumePendingCyberwareCompensations() {
    if (typeof app.getWorldBridgeOperations !== "function") return [];
    const candidates = app.getWorldBridgeOperations()
      .filter((operation) => isCyberwareWorldOperation(operation))
      .filter((operation) => token(operation.status) === "COMPENSATION_REQUIRED")
      .filter((operation) => token(operation.compensation?.status) === "IN_PROGRESS");
    diagnostics.compensationResumes += candidates.length;
    return candidates.map((operation) => retryCyberwareWorldCompensation(operation.operationId, { source: "CYBERWARE_WORLD_BRIDGE_COMPENSATION_STARTUP" }));
  }
  async function retryCyberwareWorldOperation(operationId = "", options = {}) {
    const current = getGenericOperation(operationId);
    if (!current) return { ok: false, reason: "WORLD_BRIDGE_OPERATION_NOT_FOUND" };
    if (token(current.status) === "COMPENSATION_REQUIRED" || COMPENSATION_RETRY_STATUSES.has(token(current.compensation?.status))) {
      return retryCyberwareWorldCompensation(operationId, options);
    }
    const response = await app.retryWorldBridgeOperation?.(operationId, {
      ...options,
      handlerId: options.handlerId || current.operationType,
      force: options.force === true
    });
    const operation = resultOf(response) || getGenericOperation(operationId);
    return { ok: response?.ok !== false, reason: response?.reason || "CYBERWARE_WORLD_OPERATION_RETRY_REQUESTED", operation: projectOperation(operation) };
  }
  function validateCyberwareWorldBridgeReadiness() {
    const service = getDependencyState("INSTALL");
    const purchase = getDependencyState("PURCHASE_AND_INSTALL");
    const firmwareValidation = app.validateFirmwareRegistry?.() || { valid: false, errors: ["FIRMWARE_REGISTRY_API_MISSING"] };
    const firmware = { ...firmwareValidation, ready: firmwareValidation.valid === true || firmwareValidation.ready === true };
    return {
      ready: service.ready && purchase.ready && firmware.ready,
      version: "14.2x",
      service,
      purchase,
      firmware,
      directModeTokens: [...DIRECT_EXECUTION_MODES]
    };
  }
  function auditCyberwareWorldBridgeStability() {
    const operations = typeof app.getWorldBridgeOperations === "function"
      ? app.getWorldBridgeOperations().filter((operation) => isCyberwareWorldOperation(operation))
      : [];
    const issues = [];
    operations.forEach((operation) => {
      const operationType = normalizeOperation(operation.metadata?.cyberwareOperationType || String(operation.operationType || "").replace(/^CYBERWARE_/, ""));
      const status = token(operation.status);
      const itemTransactionId = id(operation.refs?.itemTransactionId);
      if (status === "COMPLETED" && operationType !== "PURCHASE_TO_HOUSING" && !itemTransactionId) {
        issues.push({
          code: "CYBERWARE_WORLD_COMPLETED_ITEM_TRANSACTION_MISSING",
          operationId: id(operation.operationId),
          operationType
        });
      }
      if (RECOVERY_STATUSES.has(status) && operation.recovery?.required !== true) {
        issues.push({
          code: "CYBERWARE_WORLD_RECOVERY_FLAG_MISSING",
          operationId: id(operation.operationId),
          status
        });
      }
      if (status === "COMPENSATION_REQUIRED" && operation.compensation?.status === "COMPLETED") {
        issues.push({
          code: "CYBERWARE_WORLD_COMPENSATION_STATUS_CONFLICT",
          operationId: id(operation.operationId)
        });
      }
    });
    const operationStore = app.getWorldBridgeOperationDiagnostics?.() || null;
    const itemTransactions = app.getItemInstanceTransactionDiagnostics?.() || null;
    return {
      valid: issues.length === 0,
      version: "14.2x",
      operationCount: operations.length,
      unresolvedRecoveryCount: operations.filter((operation) => RECOVERY_STATUSES.has(token(operation.status))).length,
      issues,
      operationStore,
      itemTransactions,
      checkedAt: now()
    };
  }
  function getCyberwareWorldBridgeDiagnostics() {
    return {
      ...clone(diagnostics),
      readiness: validateCyberwareWorldBridgeReadiness(),
      stability: auditCyberwareWorldBridgeStability(),
      compensation: auditCyberwareWorldBridgeCompensation(),
      runtime: {
        emittedOperationCount: emittedRevisionByOperationId.size,
        pendingCitizenRefreshCount: refreshTimerByCitizenId.size,
        pendingRefreshCitizenIds: [...refreshTimerByCitizenId.keys()],
        activeResumeOperationIds: [...activeResumeOperationIds],
        rememberedResumeOperationCount: resumeSignatureByOperationId.size,
        activeCompensationOperationIds: [...activeCompensationByOperationId.keys()]
      }
    };
  }

  function resumeOperationsForServiceOrder(serviceOrderId = "", options = {}) {
    const orderId = id(serviceOrderId);
    if (!orderId || typeof app.getWorldBridgeOperationsByReference !== "function") return [];
    const serviceOrder = app.getServiceOrder?.(orderId) || null;
    if (!serviceOrder) return [];
    return app.getWorldBridgeOperationsByReference("serviceOrderId", orderId)
      .filter((operation) => isCyberwareWorldOperation(operation))
      .filter((operation) => AUTO_RESUME_OPERATION_STATUSES.has(token(operation.status)))
      .map((operation) => resumeExistingCyberwareServiceOperation(operation, serviceOrder, options));
  }
  function handleCyberwareServiceStarted(event) {
    const detail = event?.detail || {};
    if (token(detail.status) !== "IN_PROGRESS") return;
    window.setTimeout?.(() => resumeOperationsForServiceOrder(detail.serviceOrderId, { source: "SERVICE_ORDER_STARTED" }), 0);
  }
  function resumePendingCyberwareOperations() {
    if (typeof app.getWorldBridgeOperations !== "function") return [];
    const candidates = app.getWorldBridgeOperations({ includeTerminal: false })
      .filter((operation) => isCyberwareWorldOperation(operation))
      .filter((operation) => AUTO_RESUME_OPERATION_STATUSES.has(token(operation.status)));
    diagnostics.startupResumeCandidates += candidates.length;
    return candidates
      .map((operation) => {
        const serviceOrderId = id(operation.refs?.serviceOrderId);
        const serviceOrder = serviceOrderId ? app.getServiceOrder?.(serviceOrderId) : null;
        if (!serviceOrder || !["IN_PROGRESS", "COMPLETED"].includes(token(serviceOrder.status))) return null;
        return resumeExistingCyberwareServiceOperation(operation, serviceOrder, { source: "CYBERWARE_WORLD_BRIDGE_STARTUP" });
      })
      .filter(Boolean);
  }

  window.addEventListener?.("ws:service-order-started", handleCyberwareServiceStarted);
  window.addEventListener?.("ws:world-bridge-operation-updated", (event) => {
    const operationId = id(event?.detail?.operationId);
    if (!operationId) return;
    const operation = getGenericOperation(operationId);
    if (!operation || (
      !String(operation.operationType || "").toUpperCase().includes("CYBERWARE")
      && !SERVICE_OPERATION_TYPES.has(normalizeOperation(operation.metadata?.cyberwareOperationType || operation.operationType))
      && !PURCHASE_OPERATION_TYPES.has(normalizeOperation(operation.metadata?.cyberwareOperationType || operation.operationType))
    )) return;
    const terminalStatusChanged = token(event?.detail?.previousStatus) !== token(event?.detail?.status);
    if (TERMINAL_STATUSES.has(token(operation.status)) && terminalStatusChanged) {
      emitCyberwareOperation(operation, { changedDomains: event?.detail?.changedDomains || [] });
    }
  });

  const recoverableTypes = [...SERVICE_OPERATION_TYPES, ...PURCHASE_OPERATION_TYPES].map((operationType) => `CYBERWARE_${operationType}`);
  recoverableTypes.forEach((handlerId) => {
    app.registerWorldBridgeOperationRecoveryHandler?.(handlerId, async (operation, retryInput = {}) => {
      let current = app.getWorldBridgeOperation?.(operation.operationId) || operation;
      if (token(current.status) === "COMPENSATION_REQUIRED" || COMPENSATION_RETRY_STATUSES.has(token(current.compensation?.status))) {
        const compensated = await retryCyberwareWorldCompensation(current.operationId, retryInput.input || retryInput);
        return compensated?.ok === true
          ? { ok: true }
          : { ok: false, status: "COMPENSATION_REQUIRED", reason: compensated?.reason || "CYBERWARE_WORLD_OPERATION_COMPENSATION_REQUIRED" };
      }
      if (["FAILED", "CANCELLED"].includes(token(current.status)) && retryInput.force === true) {
        const reopened = mutateWorldOperation("updateWorldBridgeOperation", current.operationId, {
          status: "RECOVERY_REQUIRED",
          currentStep: "VALIDATE",
          recovery: { required: true, reasonCodes: unique(current.recovery?.reasonCodes) },
          checkpointCode: "RETRY_REOPENED"
        }, {
          forceTransition: true,
          flush: true,
          source: "CYBERWARE_WORLD_BRIDGE_RETRY_REOPENED"
        });
        current = resultOf(reopened) || current;
      }
      const serviceOrderId = id(current.refs?.serviceOrderId);
      const serviceOrder = serviceOrderId ? app.getServiceOrder?.(serviceOrderId) : null;
      if (serviceOrder && ["PENDING_CONFIRMATION", "AUTHORIZED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"].includes(token(serviceOrder.status))) {
        const resumed = resumeExistingCyberwareServiceOperation(current, serviceOrder, retryInput.input || retryInput);
        const resolved = resumed && typeof resumed.then === "function" ? await resumed : resumed;
        return resolved?.ok === true
          ? { ok: true }
          : { ok: false, reason: resolved?.reason || "CYBERWARE_WORLD_OPERATION_RETRY_FAILED" };
      }
      const storedInput = getStoredRecoveryInput(current, retryInput.input || retryInput);
      const operationType = normalizeOperation(storedInput.operationType);
      const result = PURCHASE_OPERATION_TYPES.has(operationType)
        ? startCyberwarePurchase(storedInput)
        : startCyberwareService(storedInput);
      const resolved = result && typeof result.then === "function" ? await result : result;
      return resolved?.ok === true
        ? { ok: true }
        : { ok: false, reason: resolved?.reason || "CYBERWARE_WORLD_OPERATION_RETRY_FAILED" };
    });
  });

  window.setTimeout?.(resumePendingCyberwareOperations, 0);
  window.setTimeout?.(resumePendingCyberwareCompensations, 0);

  const api = {
    version: "16.1x",
    quoteCyberwarePurchase,
    startCyberwarePurchase,
    quoteCyberwareService,
    startCyberwareService,
    getCyberwareWorldOperation,
    cancelCyberwareWorldOperation,
    retryCyberwareWorldOperation,
    quoteCyberwareWorldCompensation,
    compensateCyberwareWorldOperation,
    retryCyberwareWorldCompensation,
    validateCyberwareWorldBridgeReadiness,
    auditCyberwareWorldBridgeStability,
    auditCyberwareWorldBridgeCompensation,
    getCyberwareWorldBridgeDiagnostics,
    getCyberwareWorldBridgeDependencyState: getDependencyState,
    isCyberwareDirectExecutionMode: isDirectMode,
    emitCyberwareWorldOperation: emitCyberwareOperation,
    resumePendingCyberwareOperations,
    resumePendingCyberwareCompensations
  };
  app.cyberwareWorldBridge = api;
  Object.assign(app, api, { CYBERWARE_WORLD_BRIDGE_VERSION: "16.1x" });
})();
