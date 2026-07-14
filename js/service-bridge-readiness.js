window.WS_APP = window.WS_APP || {};

(function initServiceBridgeReadinessModule() {
  const app = window.WS_APP;
  const READINESS_SCHEMA_VERSION = "services_bridge_readiness_final_2_5x";
  const OPERATIONAL_CONTRACT_VERSION = "services_bridge_operational_contract_2_5x";
  const REQUIRED_SERVICE_APIS = [
    "getServiceDefinition",
    "getServiceDefinitions",
    "getProvider",
    "searchProviders",
    "getProviderServiceCapabilities",
    "providerSupports",
    "getServiceOffer",
    "getServiceOrder",
    "getCitizenServiceOrders",
    "getProviderServiceOrders",
    "quoteService",
    "resolveServiceEntitlements",
    "validateServiceEligibility",
    "createServiceOffer",
    "createServiceOrderFromOffer",
    "authorizeServiceOrder",
    "captureServiceOrderBilling",
    "voidServiceOrderBilling",
    "refundServiceOrderBilling",
    "getServiceOrderBillingState",
    "scheduleServiceOrder",
    "startServiceOrder",
    "completeServiceOrder",
    "failServiceOrder",
    "cancelServiceOrder",
    "getServiceBridgeStoreRevision",
    "getServiceBridgeOperationalContract",
    "getServiceBridgeDiagnostics"
  ];
  const REQUIRED_BILLING_APIS = [
    "createBillingIntent",
    "authorizeBillingIntent",
    "captureBillingIntent",
    "voidBillingIntent",
    "refundBillingTransaction",
    "getBillingIntent",
    "getBillingTransaction"
  ];
  const REQUIRED_HOUSING_APIS = [
    "validateHousingPlacement",
    "reserveHousingPlacement",
    "commitHousingPlacement",
    "releaseHousingPlacementReservation"
  ];
  const REQUIRED_ITEM_TRANSACTION_APIS = [
    "getItemInstanceTransaction",
    "getItemInstanceTransactionByIdempotencyKey",
    "commitItemInstanceTransaction",
    "compensateItemInstanceTransaction",
    "reconcileInterruptedItemInstanceTransactions",
    "commitItemInstanceServiceCustody",
    "commitItemInstanceServiceResult",
    "validateItemInstanceTransactionReadiness"
  ];
  const SERVICE_EVENT_CODES = [
    "SERVICE.ORDER.SCHEDULED",
    "SERVICE.ORDER.COMPLETED",
    "SERVICE.ORDER.FAILED",
    "SERVICE.ORDER.CANCELLED"
  ];
  const REQUIRED_SCENARIO_CATEGORIES = new Set([
    "FULL_PAID_SUCCESS",
    "FULL_COVERED_SUCCESS",
    "NO_PAYMENT_SUCCESS",
    "PRE_EXECUTION_VOID",
    "POST_ITEM_COMMIT_PRE_CAPTURE_COMPENSATION",
    "POST_CAPTURE_REFUND_COMPENSATION",
    "FAILURE_WITHOUT_ITEM_MUTATION",
    "IDEMPOTENT_REPLAY",
    "REVISION_CONFLICT",
    "NOTIFICATION_DEDUPLICATION"
  ]);
  const VALID_SCENARIO_STEPS = new Set([
    "QUOTE",
    "OFFER_CREATE",
    "ORDER_CREATE",
    "ORDER_CREATE_REPLAY",
    "ORDER_READ",
    "ORDER_UPDATE",
    "STALE_ORDER_UPDATE_REJECT",
    "ENTITLEMENT_REVALIDATE",
    "COVERAGE_REVALIDATE",
    "AUTHORIZE_WITHOUT_BILLING_INTENT",
    "BILLING_AUTHORIZE",
    "BILLING_AUTHORIZE_REPLAY",
    "BILLING_CAPTURE",
    "BILLING_CAPTURE_REPLAY",
    "BILLING_VOID",
    "BILLING_REFUND",
    "SCHEDULE",
    "SCHEDULE_REPLAY",
    "START",
    "ITEM_TRANSACTION_COMMIT",
    "ITEM_TRANSACTION_COMMIT_REPLAY",
    "STALE_ITEM_TRANSACTION_REJECT",
    "ITEM_TRANSACTION_COMPENSATE",
    "COMPLETE",
    "COMPLETE_REPLAY",
    "FAIL",
    "CANCEL"
  ]);
  const ENTITLEMENT_REQUIREMENTS = new Set(["REQUIRED", "OPTIONAL", "COVERAGE_ONLY"]);
  const ENTITLEMENT_TARGET_STRATEGIES = new Set(["CITIZEN_ONLY", "ITEM_INSTANCE_ONLY", "SUBJECT_OR_CITIZEN"]);

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

  function makeCheck(id, ok, severity, detail = {}) {
    return {
      id: normalizeToken(id, "SERVICE_BRIDGE_CHECK"),
      ok: ok === true,
      severity: normalizeToken(severity, ok ? "INFO" : "ERROR"),
      detail: clone(detail)
    };
  }

  function makeIssue(code, detail = {}) {
    return { code: normalizeToken(code, "SERVICE_BRIDGE_ISSUE"), ...clone(detail) };
  }

  function getDefinitions() {
    return Array.isArray(window.APP_DATA?.serviceDefinitions) ? window.APP_DATA.serviceDefinitions : [];
  }

  function getProviders() {
    return Array.isArray(window.APP_DATA?.serviceProviderCapabilityManifests)
      ? window.APP_DATA.serviceProviderCapabilityManifests
      : [];
  }

  function getFixtures() {
    return Array.isArray(window.APP_DATA?.serviceBridgeFixtureFlows)
      ? window.APP_DATA.serviceBridgeFixtureFlows
      : [];
  }

  function getFinalScenarios() {
    return Array.isArray(window.APP_DATA?.serviceBridgeFinalReadinessScenarios)
      ? window.APP_DATA.serviceBridgeFinalReadinessScenarios
      : [];
  }

  function getSubscriptionEntitlementCodes() {
    const subscriptions = Array.isArray(window.APP_DATA?.subscriptionCatalog?.subscriptions)
      ? window.APP_DATA.subscriptionCatalog.subscriptions
      : Array.isArray(window.APP_DATA?.subscriptionCatalogDefinitions?.subscriptions)
        ? window.APP_DATA.subscriptionCatalogDefinitions.subscriptions
        : [];
    const codes = new Set();
    subscriptions.forEach((definition) => {
      (Array.isArray(definition.entitlementCodes) ? definition.entitlementCodes : [])
        .forEach((code) => codes.add(normalizeToken(code)));
      (Array.isArray(definition.tiers) ? definition.tiers : []).forEach((tier) => {
        (Array.isArray(tier.entitlementCodes) ? tier.entitlementCodes : [])
          .forEach((code) => codes.add(normalizeToken(code)));
      });
    });
    return codes;
  }

  function getOrganization(organizationId = "") {
    return app.getOrganizationById?.(organizationId)
      || (Array.isArray(window.APP_DATA?.organizations)
        ? window.APP_DATA.organizations.find((organization) => organization.id === organizationId)
        : null)
      || null;
  }

  function validateDefinitions() {
    const definitions = getDefinitions();
    const providers = getProviders();
    const errors = [];
    const warnings = [];
    const ids = new Set();
    const types = new Set();
    const entitlementCodes = getSubscriptionEntitlementCodes();
    let entitlementRuleCount = 0;

    definitions.forEach((definition, index) => {
      const id = normalizeId(definition.serviceDefinitionId);
      const type = normalizeToken(definition.serviceType);
      if (!id) errors.push(makeIssue("SERVICE_DEFINITION_ID_REQUIRED", { index }));
      else if (ids.has(id)) errors.push(makeIssue("SERVICE_DEFINITION_ID_DUPLICATE", { serviceDefinitionId: id }));
      else ids.add(id);
      if (!type) errors.push(makeIssue("SERVICE_TYPE_REQUIRED", { serviceDefinitionId: id }));
      else types.add(type);
      if (!normalizeId(definition.displayName)) warnings.push(makeIssue("SERVICE_DISPLAY_NAME_MISSING", { serviceDefinitionId: id }));
      if (!normalizeId(definition.domain)) errors.push(makeIssue("SERVICE_DOMAIN_REQUIRED", { serviceDefinitionId: id }));

      const capabilities = Array.isArray(definition.requiredCapabilities)
        ? definition.requiredCapabilities.map(normalizeToken).filter(Boolean)
        : [];
      if (!capabilities.length) errors.push(makeIssue("SERVICE_REQUIRED_CAPABILITY_MISSING", { serviceDefinitionId: id }));
      capabilities.forEach((capability) => {
        if (!providers.some((provider) => provider.active !== false && (provider.capabilities || []).map(normalizeToken).includes(capability))) {
          errors.push(makeIssue("SERVICE_CAPABILITY_HAS_NO_PROVIDER", { serviceDefinitionId: id, capability }));
        }
      });

      const policy = definition.subjectPolicy || {};
      const min = Number(policy.minInstanceCount);
      const max = Number(policy.maxInstanceCount);
      if (!Number.isInteger(min) || min < 0) errors.push(makeIssue("SERVICE_SUBJECT_MIN_INVALID", { serviceDefinitionId: id }));
      if (!Number.isInteger(max) || max < min) errors.push(makeIssue("SERVICE_SUBJECT_MAX_INVALID", { serviceDefinitionId: id }));
      if (!normalizeId(definition.pricingModel?.formulaId)) errors.push(makeIssue("SERVICE_PRICING_FORMULA_ID_REQUIRED", { serviceDefinitionId: id }));
      if (!normalizeId(definition.durationModel?.formulaId)) errors.push(makeIssue("SERVICE_DURATION_FORMULA_ID_REQUIRED", { serviceDefinitionId: id }));
      if (!normalizeId(definition.riskModel?.formulaId)) errors.push(makeIssue("SERVICE_RISK_FORMULA_ID_REQUIRED", { serviceDefinitionId: id }));

      const entitlementPolicy = definition.entitlementPolicy && typeof definition.entitlementPolicy === "object"
        ? definition.entitlementPolicy
        : {};
      const defaultStrategy = normalizeToken(entitlementPolicy.targetStrategy || "SUBJECT_OR_CITIZEN", "SUBJECT_OR_CITIZEN");
      if (!ENTITLEMENT_TARGET_STRATEGIES.has(defaultStrategy)) {
        errors.push(makeIssue("SERVICE_ENTITLEMENT_TARGET_STRATEGY_INVALID", { serviceDefinitionId: id, targetStrategy: defaultStrategy }));
      }
      const seenRules = new Set();
      (Array.isArray(entitlementPolicy.providerRules) ? entitlementPolicy.providerRules : []).forEach((rule, ruleIndex) => {
        entitlementRuleCount += 1;
        const providerId = normalizeId(rule.providerId);
        const entitlementCode = normalizeToken(rule.entitlementCode);
        const requirement = normalizeToken(rule.requirement || "OPTIONAL", "OPTIONAL");
        const targetStrategy = normalizeToken(rule.targetStrategy || defaultStrategy, defaultStrategy);
        const ruleKey = `${providerId}::${entitlementCode}`;
        if (!providerId) errors.push(makeIssue("SERVICE_ENTITLEMENT_PROVIDER_ID_REQUIRED", { serviceDefinitionId: id, ruleIndex }));
        else if (!providers.some((provider) => normalizeId(provider.providerId) === providerId)) {
          errors.push(makeIssue("SERVICE_ENTITLEMENT_PROVIDER_NOT_FOUND", { serviceDefinitionId: id, providerId, ruleIndex }));
        }
        if (!entitlementCode) errors.push(makeIssue("SERVICE_ENTITLEMENT_CODE_REQUIRED", { serviceDefinitionId: id, providerId, ruleIndex }));
        else if (entitlementCodes.size && !entitlementCodes.has(entitlementCode)) {
          errors.push(makeIssue("SERVICE_ENTITLEMENT_CODE_NOT_FOUND", { serviceDefinitionId: id, providerId, entitlementCode }));
        }
        if (!ENTITLEMENT_REQUIREMENTS.has(requirement)) {
          errors.push(makeIssue("SERVICE_ENTITLEMENT_REQUIREMENT_INVALID", { serviceDefinitionId: id, providerId, requirement }));
        }
        if (!ENTITLEMENT_TARGET_STRATEGIES.has(targetStrategy)) {
          errors.push(makeIssue("SERVICE_ENTITLEMENT_TARGET_STRATEGY_INVALID", { serviceDefinitionId: id, providerId, targetStrategy }));
        }
        if (seenRules.has(ruleKey)) warnings.push(makeIssue("SERVICE_ENTITLEMENT_RULE_DUPLICATE", { serviceDefinitionId: id, providerId, entitlementCode }));
        else seenRules.add(ruleKey);
      });
    });

    return {
      ok: errors.length === 0,
      counts: { definitions: definitions.length, serviceTypes: types.size, entitlementRules: entitlementRuleCount },
      errors,
      warnings
    };
  }

  function validateProviders() {
    const providers = getProviders();
    const errors = [];
    const warnings = [];
    const ids = new Set();

    providers.forEach((provider, index) => {
      const providerId = normalizeId(provider.providerId);
      if (!providerId) errors.push(makeIssue("SERVICE_PROVIDER_ID_REQUIRED", { index }));
      else if (ids.has(providerId)) errors.push(makeIssue("SERVICE_PROVIDER_ID_DUPLICATE", { providerId }));
      else ids.add(providerId);
      if (!normalizeId(provider.organizationId)) errors.push(makeIssue("SERVICE_PROVIDER_ORGANIZATION_ID_REQUIRED", { providerId }));
      else if (!getOrganization(provider.organizationId)) errors.push(makeIssue("SERVICE_PROVIDER_ORGANIZATION_NOT_FOUND", { providerId, organizationId: provider.organizationId }));
      if (!Array.isArray(provider.capabilities) || !provider.capabilities.length) errors.push(makeIssue("SERVICE_PROVIDER_CAPABILITIES_REQUIRED", { providerId }));
      if (provider.active === false) warnings.push(makeIssue("SERVICE_PROVIDER_INACTIVE", { providerId }));
    });

    return { ok: errors.length === 0, counts: { providers: providers.length }, errors, warnings };
  }

  function validateNotificationContract() {
    const registry = app.notificationRegistry;
    const errors = [];
    const warnings = [];
    if (!registry) return { ok: false, errors: [makeIssue("NOTIFICATION_REGISTRY_UNAVAILABLE")], warnings };

    SERVICE_EVENT_CODES.forEach((eventCode) => {
      const event = registry.getEvent?.(eventCode);
      if (!event) errors.push(makeIssue("SERVICE_NOTIFICATION_EVENT_NOT_FOUND", { eventCode }));
      else if (!Array.isArray(event.subjectTypes) || !event.subjectTypes.includes("SERVICE_ORDER")) {
        errors.push(makeIssue("SERVICE_NOTIFICATION_SUBJECT_INVALID", { eventCode }));
      }
    });

    getProviders().forEach((provider) => {
      const resolution = registry.resolveProvider?.(provider.providerId);
      if (!resolution) {
        errors.push(makeIssue("SERVICE_NOTIFICATION_PROVIDER_NOT_FOUND", { providerId: provider.providerId }));
        return;
      }
      SERVICE_EVENT_CODES.forEach((eventCode) => {
        const event = registry.getEvent?.(eventCode);
        if (event && !registry.providerSupportsEvent?.(resolution, event)) {
          errors.push(makeIssue("SERVICE_NOTIFICATION_PROVIDER_EVENT_UNSUPPORTED", { providerId: provider.providerId, eventCode }));
        }
      });
    });

    if (typeof app.emitServiceOrderNotification !== "function") errors.push(makeIssue("SERVICE_NOTIFICATION_PRODUCER_API_MISSING"));
    const diagnostics = typeof app.getServiceNotificationProducerDiagnostics === "function"
      ? app.getServiceNotificationProducerDiagnostics()
      : null;
    if (!diagnostics) warnings.push(makeIssue("SERVICE_NOTIFICATION_PRODUCER_DIAGNOSTICS_MISSING"));
    return { ok: errors.length === 0, errors, warnings, diagnostics: clone(diagnostics) };
  }

  function validateFixtures() {
    const fixtures = getFixtures();
    const errors = [];
    const warnings = [];
    const ids = new Set();
    const coveredDefinitions = new Set();

    fixtures.forEach((fixture, index) => {
      const fixtureId = normalizeId(fixture.fixtureId);
      if (!fixtureId) errors.push(makeIssue("SERVICE_FIXTURE_ID_REQUIRED", { index }));
      else if (ids.has(fixtureId)) errors.push(makeIssue("SERVICE_FIXTURE_ID_DUPLICATE", { fixtureId }));
      else ids.add(fixtureId);
      const definition = app.getServiceDefinition?.(fixture.serviceDefinitionId);
      if (!definition) errors.push(makeIssue("SERVICE_FIXTURE_DEFINITION_NOT_FOUND", { fixtureId, serviceDefinitionId: fixture.serviceDefinitionId }));
      else coveredDefinitions.add(definition.serviceDefinitionId);
      const provider = app.getProvider?.(fixture.providerId);
      if (!provider) errors.push(makeIssue("SERVICE_FIXTURE_PROVIDER_NOT_FOUND", { fixtureId, providerId: fixture.providerId }));
      else if (definition) {
        definition.requiredCapabilities.forEach((capability) => {
          if (!provider.capabilities.includes(capability)) errors.push(makeIssue("SERVICE_FIXTURE_PROVIDER_CAPABILITY_MISSING", { fixtureId, capability }));
        });
      }
      const count = Array.isArray(fixture.subjectRefs?.instanceIds) ? fixture.subjectRefs.instanceIds.length : 0;
      if (definition && (count < definition.subjectPolicy.minInstanceCount || count > definition.subjectPolicy.maxInstanceCount)) {
        errors.push(makeIssue("SERVICE_FIXTURE_SUBJECT_COUNT_INVALID", { fixtureId, count }));
      }
      if (definition?.subjectPolicy.returnLocationRequired && !fixture.subjectRefs?.returnLocation) {
        errors.push(makeIssue("SERVICE_FIXTURE_RETURN_LOCATION_REQUIRED", { fixtureId }));
      }
      const lifecycle = Array.isArray(fixture.expected?.lifecycle) ? fixture.expected.lifecycle : [];
      if (!lifecycle.length) warnings.push(makeIssue("SERVICE_FIXTURE_LIFECYCLE_MISSING", { fixtureId }));
      if (!SERVICE_EVENT_CODES.includes(fixture.expected?.terminalEventCode)) warnings.push(makeIssue("SERVICE_FIXTURE_TERMINAL_EVENT_UNMAPPED", { fixtureId }));
    });

    getDefinitions().forEach((definition) => {
      if (!coveredDefinitions.has(definition.serviceDefinitionId)) {
        errors.push(makeIssue("SERVICE_DEFINITION_HAS_NO_FIXTURE", { serviceDefinitionId: definition.serviceDefinitionId }));
      }
    });

    return {
      ok: errors.length === 0,
      counts: { fixtures: fixtures.length, coveredDefinitions: coveredDefinitions.size },
      errors,
      warnings
    };
  }

  function validateFinalScenarios() {
    const scenarios = getFinalScenarios();
    const fixtureIds = new Set(getFixtures().map((fixture) => normalizeId(fixture.fixtureId)).filter(Boolean));
    const errors = [];
    const warnings = [];
    const ids = new Set();
    const categories = new Set();

    scenarios.forEach((scenario, index) => {
      const scenarioId = normalizeId(scenario.scenarioId);
      const category = normalizeToken(scenario.category);
      const fixtureId = normalizeId(scenario.fixtureId);
      const steps = Array.isArray(scenario.steps) ? scenario.steps.map(normalizeToken).filter(Boolean) : [];
      if (!scenarioId) errors.push(makeIssue("SERVICE_FINAL_SCENARIO_ID_REQUIRED", { index }));
      else if (ids.has(scenarioId)) errors.push(makeIssue("SERVICE_FINAL_SCENARIO_ID_DUPLICATE", { scenarioId }));
      else ids.add(scenarioId);
      if (!REQUIRED_SCENARIO_CATEGORIES.has(category)) errors.push(makeIssue("SERVICE_FINAL_SCENARIO_CATEGORY_INVALID", { scenarioId, category }));
      else categories.add(category);
      if (!fixtureId || !fixtureIds.has(fixtureId)) errors.push(makeIssue("SERVICE_FINAL_SCENARIO_FIXTURE_NOT_FOUND", { scenarioId, fixtureId }));
      if (!steps.length) errors.push(makeIssue("SERVICE_FINAL_SCENARIO_STEPS_REQUIRED", { scenarioId }));
      steps.forEach((step) => {
        if (!VALID_SCENARIO_STEPS.has(step)) errors.push(makeIssue("SERVICE_FINAL_SCENARIO_STEP_INVALID", { scenarioId, step }));
      });
      if (!scenario.expected || typeof scenario.expected !== "object") errors.push(makeIssue("SERVICE_FINAL_SCENARIO_EXPECTED_REQUIRED", { scenarioId }));
      if (category === "FULL_PAID_SUCCESS") {
        ["BILLING_AUTHORIZE", "ITEM_TRANSACTION_COMMIT", "BILLING_CAPTURE", "COMPLETE"].forEach((step) => {
          if (!steps.includes(step)) errors.push(makeIssue("SERVICE_FINAL_PAID_FLOW_STEP_MISSING", { scenarioId, step }));
        });
      }
      if (category === "POST_ITEM_COMMIT_PRE_CAPTURE_COMPENSATION") {
        ["ITEM_TRANSACTION_COMMIT", "ITEM_TRANSACTION_COMPENSATE", "BILLING_VOID", "FAIL"].forEach((step) => {
          if (!steps.includes(step)) errors.push(makeIssue("SERVICE_FINAL_COMPENSATION_STEP_MISSING", { scenarioId, step }));
        });
        if (steps.includes("BILLING_CAPTURE")) errors.push(makeIssue("SERVICE_FINAL_PRE_CAPTURE_SCENARIO_CAPTURE_INVALID", { scenarioId }));
      }
      if (category === "POST_CAPTURE_REFUND_COMPENSATION") {
        ["ITEM_TRANSACTION_COMMIT", "BILLING_CAPTURE", "ITEM_TRANSACTION_COMPENSATE", "BILLING_REFUND", "FAIL"].forEach((step) => {
          if (!steps.includes(step)) errors.push(makeIssue("SERVICE_FINAL_REFUND_STEP_MISSING", { scenarioId, step }));
        });
      }
      if (category === "IDEMPOTENT_REPLAY" && !steps.some((step) => step.endsWith("_REPLAY"))) {
        errors.push(makeIssue("SERVICE_FINAL_IDEMPOTENT_REPLAY_STEP_MISSING", { scenarioId }));
      }
    });

    REQUIRED_SCENARIO_CATEGORIES.forEach((category) => {
      if (!categories.has(category)) errors.push(makeIssue("SERVICE_FINAL_SCENARIO_CATEGORY_MISSING", { category }));
    });

    if (scenarios.length < REQUIRED_SCENARIO_CATEGORIES.size) {
      warnings.push(makeIssue("SERVICE_FINAL_SCENARIO_MATRIX_SMALL", { scenarios: scenarios.length, requiredCategories: REQUIRED_SCENARIO_CATEGORIES.size }));
    }

    return {
      ok: errors.length === 0,
      counts: { scenarios: scenarios.length, categories: categories.size },
      errors,
      warnings
    };
  }

  function validateApiList(names = []) {
    const missing = names.filter((name) => typeof app[name] !== "function");
    return { ok: missing.length === 0, missing };
  }

  function validateOperationalContract() {
    const errors = [];
    const warnings = [];
    const contract = typeof app.getServiceBridgeOperationalContract === "function"
      ? app.getServiceBridgeOperationalContract()
      : null;
    if (!contract) return { ok: false, errors: [makeIssue("SERVICE_OPERATIONAL_CONTRACT_UNAVAILABLE")], warnings, contract: null };
    if (normalizeId(contract.schemaVersion) !== OPERATIONAL_CONTRACT_VERSION) {
      errors.push(makeIssue("SERVICE_OPERATIONAL_CONTRACT_VERSION_INVALID", { expected: OPERATIONAL_CONTRACT_VERSION, actual: contract.schemaVersion || "" }));
    }
    const requiredTruths = [
      ["commandContract.idempotencyKeyRequired", contract.commandContract?.idempotencyKeyRequired],
      ["commandContract.idempotentReplayReturnsStoredResult", contract.commandContract?.idempotentReplayReturnsStoredResult],
      ["commandContract.expectedRevisionSupported", contract.commandContract?.expectedRevisionSupported],
      ["commandContract.staleRevisionRejected", contract.commandContract?.staleRevisionRejected],
      ["entitlementContract.revalidatedAtAuthorization", contract.entitlementContract?.revalidatedAtAuthorization],
      ["coverageContract.recalculatedAtOrderCreation", contract.coverageContract?.recalculatedAtOrderCreation],
      ["coverageContract.recalculatedAtAuthorization", contract.coverageContract?.recalculatedAtAuthorization],
      ["coverageContract.explicitRequoteAcceptanceRequired", contract.coverageContract?.explicitRequoteAcceptanceRequired],
      ["billingContract.authorizeBeforeExecution", contract.billingContract?.authorizeBeforeExecution],
      ["billingContract.captureBeforeCompletion", contract.billingContract?.captureBeforeCompletion],
      ["itemTransactionContract.externalCommitRequiredForMutations", contract.itemTransactionContract?.externalCommitRequiredForMutations],
      ["itemTransactionContract.commitConfirmationRequiredForCompletion", contract.itemTransactionContract?.commitConfirmationRequiredForCompletion],
      ["notificationContract.revisionedEvents", contract.notificationContract?.revisionedEvents],
      ["notificationContract.aggregationOwnsDeduplication", contract.notificationContract?.aggregationOwnsDeduplication],
      ["runtimeVerification.staticAuditMutatesState === false", contract.runtimeVerification?.staticAuditMutatesState === false]
    ];
    requiredTruths.forEach(([field, value]) => {
      if (value !== true) errors.push(makeIssue("SERVICE_OPERATIONAL_CONTRACT_INVARIANT_MISSING", { field }));
    });
    const requiredFalsehoods = [
      ["entitlementContract.manualSubscriptionRefsAuthoritative", contract.entitlementContract?.manualSubscriptionRefsAuthoritative],
      ["coverageContract.callerCoveredAmountAuthoritative", contract.coverageContract?.callerCoveredAmountAuthoritative],
      ["billingContract.directBalanceMutationAllowed", contract.billingContract?.directBalanceMutationAllowed],
      ["itemTransactionContract.directItemMutationAllowed", contract.itemTransactionContract?.directItemMutationAllowed],
      ["notificationContract.directTerminalEntryMutationAllowed", contract.notificationContract?.directTerminalEntryMutationAllowed]
    ];
    requiredFalsehoods.forEach(([field, value]) => {
      if (value !== false) errors.push(makeIssue("SERVICE_OPERATIONAL_CONTRACT_OWNERSHIP_INVALID", { field }));
    });
    return { ok: errors.length === 0, errors, warnings, contract: clone(contract) };
  }

  function validateServiceRuntimeDiagnostics() {
    const errors = [];
    const warnings = [];
    const diagnostics = typeof app.getServiceBridgeDiagnostics === "function"
      ? app.getServiceBridgeDiagnostics()
      : null;
    if (!diagnostics) return { ok: false, errors: [makeIssue("SERVICE_BRIDGE_DIAGNOSTICS_UNAVAILABLE")], warnings, diagnostics: null };
    if (Number(diagnostics.invalidDefinitions || 0) !== 0) errors.push(makeIssue("SERVICE_INVALID_DEFINITIONS_PRESENT", { count: diagnostics.invalidDefinitions }));
    if (Number(diagnostics.invalidProviders || 0) !== 0) errors.push(makeIssue("SERVICE_INVALID_PROVIDERS_PRESENT", { count: diagnostics.invalidProviders }));
    if (normalizeId(diagnostics.subscriptionEntitlementBridgeVersion) !== "services_subscription_entitlement_bridge_2_2x") {
      errors.push(makeIssue("SERVICE_ENTITLEMENT_BRIDGE_VERSION_INVALID", { actual: diagnostics.subscriptionEntitlementBridgeVersion || "" }));
    }
    if (normalizeId(diagnostics.coverageBridgeVersion) !== "services_coverage_bridge_2_3x") {
      errors.push(makeIssue("SERVICE_COVERAGE_BRIDGE_VERSION_INVALID", { actual: diagnostics.coverageBridgeVersion || "" }));
    }
    if (normalizeId(diagnostics.billingIntentBridgeVersion) !== "services_billing_intent_bridge_2_4x") {
      errors.push(makeIssue("SERVICE_BILLING_BRIDGE_VERSION_INVALID", { actual: diagnostics.billingIntentBridgeVersion || "" }));
    }
    if (normalizeId(diagnostics.operationalContractVersion) !== OPERATIONAL_CONTRACT_VERSION) {
      errors.push(makeIssue("SERVICE_OPERATIONAL_CONTRACT_DIAGNOSTIC_VERSION_INVALID", { actual: diagnostics.operationalContractVersion || "" }));
    }
    if (diagnostics.transactionBoundBilling !== true) {
      errors.push(makeIssue("SERVICE_TRANSACTION_BOUND_BILLING_FIX_MISSING"));
    }
    if (diagnostics.itemTransactionBoundaryConnected !== true) {
      errors.push(makeIssue("SERVICE_ITEM_TRANSACTION_BOUNDARY_NOT_CONNECTED"));
    }
    return { ok: errors.length === 0, errors, warnings, diagnostics: clone(diagnostics) };
  }

  function validateItemTransactionBoundary() {
    const api = validateApiList(REQUIRED_ITEM_TRANSACTION_APIS);
    const errors = api.missing.map((name) => makeIssue("ITEM_INSTANCE_TRANSACTION_API_MISSING", { api: name }));
    const warnings = [];
    let readiness = null;
    if (api.ok) {
      try {
        readiness = app.validateItemInstanceTransactionReadiness();
      } catch (error) {
        errors.push(makeIssue("ITEM_INSTANCE_TRANSACTION_READINESS_FAILED", { message: error?.message || String(error) }));
      }
      if (readiness && readiness.ready !== true) {
        errors.push(makeIssue("ITEM_INSTANCE_TRANSACTION_NOT_READY", {
          missingApis: clone(readiness.missingApis || []),
          duplicateIdempotencyKeys: clone(readiness.duplicateIdempotencyKeys || [])
        }));
      }
    }
    if (normalizeId(app.ITEM_INSTANCE_TRANSACTION_SCHEMA_VERSION) === "") {
      errors.push(makeIssue("ITEM_INSTANCE_TRANSACTION_SCHEMA_VERSION_MISSING"));
    }
    return { ok: errors.length === 0, errors, warnings, readiness: clone(readiness), missing: api.missing };
  }

  function runServiceBridgeReadinessAudit() {
    const checks = [];
    const internalBlockers = [];
    const externalBlockers = [];
    const warnings = [];

    const definitionValidation = validateDefinitions();
    const providerValidation = validateProviders();
    const fixtureValidation = validateFixtures();
    const scenarioValidation = validateFinalScenarios();
    const notificationValidation = validateNotificationContract();
    const operationalValidation = validateOperationalContract();
    const runtimeValidation = validateServiceRuntimeDiagnostics();
    const serviceApi = validateApiList(REQUIRED_SERVICE_APIS);

    [
      definitionValidation,
      providerValidation,
      fixtureValidation,
      scenarioValidation,
      notificationValidation,
      operationalValidation,
      runtimeValidation
    ].forEach((validation) => {
      internalBlockers.push(...(validation.errors || []));
      warnings.push(...(validation.warnings || []));
    });
    serviceApi.missing.forEach((api) => internalBlockers.push(makeIssue("SERVICE_PUBLIC_API_MISSING", { api })));

    const billingApi = validateApiList(REQUIRED_BILLING_APIS);
    const housingApi = validateApiList(REQUIRED_HOUSING_APIS);
    const itemTransactionValidation = validateItemTransactionBoundary();
    const itemLookup = typeof app.getItemInstanceById === "function";
    const notificationApi = typeof window.TerminalNotifications?.emit === "function";
    const subscriptionReadApi = typeof app.getSubscriptionContract === "function"
      && typeof app.getCitizenSubscriptionContracts === "function";
    const finalEntitlementApi = typeof app.resolveSubscriptionEntitlement === "function"
      && normalizeId(app.SUBSCRIPTION_ENTITLEMENT_QUERY_SCHEMA_VERSION) !== "";
    const serviceEntitlementBridge = typeof app.resolveServiceEntitlements === "function"
      && normalizeId(app.SERVICE_SUBSCRIPTION_ENTITLEMENT_BRIDGE_SCHEMA_VERSION) === "services_subscription_entitlement_bridge_2_2x";
    const coverageApi = typeof app.resolveCoverage === "function"
      && normalizeId(app.COVERAGE_FOUNDATION_VERSION) === "world_bridge_coverage_foundation_1_0x"
      && normalizeId(app.COVERAGE_RESOLVER_API_VERSION) === "shared_coverage_resolver_1_0x";
    const serviceCoverageBridge = normalizeId(app.SERVICE_COVERAGE_BRIDGE_SCHEMA_VERSION) === "services_coverage_bridge_2_3x";
    const serviceBillingIntentBridge = normalizeId(app.SERVICE_BILLING_INTENT_BRIDGE_SCHEMA_VERSION) === "services_billing_intent_bridge_2_4x"
      && ["captureServiceOrderBilling", "voidServiceOrderBilling", "refundServiceOrderBilling", "getServiceOrderBillingState"]
        .every((name) => typeof app[name] === "function");
    const coverageValidation = typeof app.validateCoverageRules === "function"
      ? app.validateCoverageRules()
      : { ok: false, errors: [makeIssue("COVERAGE_RULE_VALIDATOR_UNAVAILABLE")], warnings: [] };

    billingApi.missing.forEach((api) => externalBlockers.push(makeIssue("BILLING_PUBLIC_API_MISSING", { api })));
    housingApi.missing.forEach((api) => externalBlockers.push(makeIssue("HOUSING_PLACEMENT_API_MISSING", { api })));
    externalBlockers.push(...itemTransactionValidation.errors);
    warnings.push(...itemTransactionValidation.warnings);
    if (!itemLookup) externalBlockers.push(makeIssue("ITEM_INSTANCE_LOOKUP_API_MISSING"));
    if (!notificationApi) externalBlockers.push(makeIssue("NOTIFICATION_EMIT_API_MISSING"));
    if (!subscriptionReadApi) externalBlockers.push(makeIssue("SUBSCRIPTION_READ_API_MISSING"));
    if (!finalEntitlementApi) externalBlockers.push(makeIssue("SUBSCRIPTION_ENTITLEMENT_QUERY_API_MISSING"));
    if (!serviceEntitlementBridge) externalBlockers.push(makeIssue("SERVICE_SUBSCRIPTION_ENTITLEMENT_BRIDGE_MISSING"));
    if (!coverageApi) externalBlockers.push(makeIssue("SHARED_COVERAGE_RESOLVER_MISSING"));
    if (!serviceCoverageBridge) externalBlockers.push(makeIssue("SERVICE_COVERAGE_BRIDGE_MISSING"));
    if (!serviceBillingIntentBridge) externalBlockers.push(makeIssue("SERVICE_BILLING_INTENT_BRIDGE_MISSING"));
    if (coverageApi && serviceCoverageBridge) {
      externalBlockers.push(...(Array.isArray(coverageValidation.errors) ? coverageValidation.errors : []));
      warnings.push(...(Array.isArray(coverageValidation.warnings) ? coverageValidation.warnings : []));
    }

    checks.push(makeCheck("SERVICE_DEFINITIONS_VALID", definitionValidation.ok, "ERROR", definitionValidation.counts));
    checks.push(makeCheck("SERVICE_PROVIDERS_VALID", providerValidation.ok, "ERROR", providerValidation.counts));
    checks.push(makeCheck("SERVICE_FIXTURES_VALID", fixtureValidation.ok, "ERROR", fixtureValidation.counts));
    checks.push(makeCheck("SERVICE_FINAL_SCENARIOS_VALID", scenarioValidation.ok, "ERROR", scenarioValidation.counts));
    checks.push(makeCheck("SERVICE_NOTIFICATION_CONTRACT_VALID", notificationValidation.ok, "ERROR", { events: SERVICE_EVENT_CODES.length }));
    checks.push(makeCheck("SERVICE_OPERATIONAL_CONTRACT_VALID", operationalValidation.ok, "ERROR", { version: operationalValidation.contract?.schemaVersion || "" }));
    checks.push(makeCheck("SERVICE_RUNTIME_DIAGNOSTICS_VALID", runtimeValidation.ok, "ERROR", runtimeValidation.diagnostics || {}));
    checks.push(makeCheck("SERVICE_PUBLIC_API_COMPLETE", serviceApi.ok, "ERROR", { missing: serviceApi.missing }));
    checks.push(makeCheck("BILLING_PUBLIC_API_AVAILABLE", billingApi.ok, "ERROR", { missing: billingApi.missing }));
    checks.push(makeCheck("HOUSING_PLACEMENT_API_AVAILABLE", housingApi.ok, "ERROR", { missing: housingApi.missing }));
    checks.push(makeCheck("ITEM_INSTANCE_LOOKUP_AVAILABLE", itemLookup, "ERROR"));
    checks.push(makeCheck("ITEM_INSTANCE_TRANSACTION_BOUNDARY_READY", itemTransactionValidation.ok, "ERROR", itemTransactionValidation.readiness || { missing: itemTransactionValidation.missing }));
    checks.push(makeCheck("NOTIFICATION_API_AVAILABLE", notificationApi, "ERROR"));
    checks.push(makeCheck("SUBSCRIPTION_READ_API_AVAILABLE", subscriptionReadApi, "ERROR"));
    checks.push(makeCheck("SUBSCRIPTION_ENTITLEMENT_QUERY_API_AVAILABLE", finalEntitlementApi, "ERROR"));
    checks.push(makeCheck("SERVICE_SUBSCRIPTION_ENTITLEMENT_BRIDGE_AVAILABLE", serviceEntitlementBridge, "ERROR"));
    checks.push(makeCheck("SHARED_COVERAGE_RESOLVER_AVAILABLE", coverageApi, "ERROR", {
      foundationVersion: app.COVERAGE_FOUNDATION_VERSION || "",
      version: app.COVERAGE_RESOLVER_API_VERSION || ""
    }));
    checks.push(makeCheck("SERVICE_COVERAGE_BRIDGE_AVAILABLE", serviceCoverageBridge, "ERROR", { version: app.SERVICE_COVERAGE_BRIDGE_SCHEMA_VERSION || "" }));
    checks.push(makeCheck("SERVICE_BILLING_INTENT_BRIDGE_AVAILABLE", serviceBillingIntentBridge, "ERROR", { version: app.SERVICE_BILLING_INTENT_BRIDGE_SCHEMA_VERSION || "" }));
    checks.push(makeCheck("COVERAGE_RULES_VALID", coverageValidation.ok === true, "ERROR", coverageValidation.counts || {}));

    const servicesInternalReady = internalBlockers.length === 0;
    const externalDependenciesReady = externalBlockers.length === 0;
    const worldBridgeReady = servicesInternalReady && externalDependenciesReady;
    const readinessState = !servicesInternalReady
      ? "SERVICES_INTERNAL_BLOCKED"
      : !externalDependenciesReady
        ? "EXTERNAL_DEPENDENCY_PENDING"
        : "WORLD_BRIDGE_READY";
    const runtimeVerificationRequired = operationalValidation.contract?.runtimeVerification?.browserScenarioExecutionRequired !== false;
    const blockers = [...internalBlockers, ...externalBlockers];

    return {
      schemaVersion: READINESS_SCHEMA_VERSION,
      readinessState,
      servicesInternalReady,
      externalDependenciesReady,
      foundationReady: servicesInternalReady,
      worldBridgeReady,
      servicesFrozen: servicesInternalReady,
      runtimeVerificationRequired,
      runtimeVerificationState: runtimeVerificationRequired ? "BROWSER_RUNTIME_REQUIRED" : "NOT_REQUIRED",
      checks,
      blockers,
      internalBlockers,
      externalBlockers,
      warnings,
      counts: {
        definitions: getDefinitions().length,
        providers: getProviders().length,
        fixtures: getFixtures().length,
        finalScenarios: getFinalScenarios().length,
        checks: checks.length,
        internalBlockers: internalBlockers.length,
        externalBlockers: externalBlockers.length,
        warnings: warnings.length
      },
      pendingDependencies: externalBlockers.map((issue) => clone(issue)),
      generatedAt: new Date().toISOString()
    };
  }

  app.SERVICE_BRIDGE_READINESS_SCHEMA_VERSION = READINESS_SCHEMA_VERSION;
  app.getServiceBridgeFixtureFlows = () => clone(getFixtures());
  app.getServiceBridgeFinalReadinessScenarios = () => clone(getFinalScenarios());
  app.validateServiceBridgeDefinitions = validateDefinitions;
  app.validateServiceBridgeProviders = validateProviders;
  app.validateServiceBridgeFixtures = validateFixtures;
  app.validateServiceBridgeFinalScenarios = validateFinalScenarios;
  app.validateServiceNotificationContract = validateNotificationContract;
  app.validateServiceBridgeOperationalContract = validateOperationalContract;
  app.runServiceBridgeReadinessAudit = runServiceBridgeReadinessAudit;
  app.SERVICE_BRIDGE_READINESS = runServiceBridgeReadinessAudit();
})();
