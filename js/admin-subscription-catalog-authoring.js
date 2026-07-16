window.WS_APP = window.WS_APP || {};

(function initAdminSubscriptionCatalogAuthoring(app) {
  "use strict";

  if (app.AdminSubscriptionCatalogAuthoring) return;

  const PACK_SCHEMA_VERSION = "subscription_catalog_authoring_pack_1";
  const VALID_CATALOG_STATUSES = new Set(["CANONICAL", "PROVISIONAL", "TEST_ONLY", "DEPRECATED"]);
  const VALID_TARGET_TYPES = new Set(["CITIZEN", "ITEM_INSTANCE"]);
  const RECEIPT_LIMIT = 300;
  const commandReceipts = new Map();

  function clone(value) {
    if (value === undefined) return undefined;
    try {
      return structuredClone(value);
    } catch (_error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function text(value) {
    return String(value ?? "").trim();
  }

  function token(value) {
    return text(value)
      .replace(/[\s-]+/g, "_")
      .replace(/[^A-Za-z0-9_:.]/g, "")
      .toUpperCase();
  }

  function slug(value) {
    return text(value || "subscription")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "subscription";
  }

  function stableStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }

  function hashText(value) {
    let hash = 2166136261;
    const source = String(value || "");
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function result(ok, resultCode, extra = {}) {
    return Object.freeze({ ok, status: ok ? "SUCCEEDED" : "FAILED", resultCode, ...clone(extra) });
  }

  function receiptKey(input = {}) {
    return text(input.idempotencyKey);
  }

  function getReceipt(input = {}) {
    const key = receiptKey(input);
    return key && commandReceipts.has(key) ? clone(commandReceipts.get(key)) : null;
  }

  function rememberReceipt(input = {}, output) {
    const key = receiptKey(input);
    if (!key) return output;
    commandReceipts.set(key, clone(output));
    while (commandReceipts.size > RECEIPT_LIMIT) commandReceipts.delete(commandReceipts.keys().next().value);
    return output;
  }

  function getCatalogSnapshot() {
    return app.getSubscriptionCatalogDefinitions?.() || { schemaVersion: app.SUBSCRIPTION_CATALOG_SCHEMA_VERSION || "", subscriptions: [] };
  }

  function getDefinitions() {
    return clone(getCatalogSnapshot().subscriptions || []);
  }

  function getDefinitionById(definitionId = "") {
    const id = text(definitionId);
    const definition = getDefinitions().find((item) => text(item.subscriptionCatalogId || item.id) === id) || null;
    return definition ? clone(definition) : null;
  }

  function getProviderRegistry() {
    const catalogProviders = Array.isArray(window.APP_DATA?.subscriptionCatalog?.providers)
      ? window.APP_DATA.subscriptionCatalog.providers
      : [];
    const organizations = typeof app.getOrganizations === "function"
      ? app.getOrganizations({ includeArchived: false })
      : (Array.isArray(window.APP_DATA?.organizations) ? window.APP_DATA.organizations : []);
    const organizationsById = new Map(organizations.map((organization) => [text(organization.id), organization]));
    const providers = new Map();

    catalogProviders.forEach((provider) => {
      const providerId = text(provider.id);
      if (!providerId) return;
      const organization = organizationsById.get(text(provider.organizationId))
        || app.getOrganizationByProviderId?.(providerId)
        || null;
      providers.set(providerId, {
        providerId,
        provider: text(provider.name || provider.label || organization?.name || providerId),
        organizationId: text(provider.organizationId || organization?.id),
        market: token(provider.market || ((organization?.tags || []).map(token).includes("PRIVATE") ? "PRIVATE" : "SYSTEM")) === "PRIVATE" ? "PRIVATE" : "SYSTEM",
        source: "SUBSCRIPTION_PROVIDER_REGISTRY"
      });
    });

    organizations.forEach((organization) => {
      const providerIds = Array.isArray(organization.providerIds) ? organization.providerIds : [];
      providerIds.forEach((rawProviderId) => {
        const normalized = text(rawProviderId);
        if (!normalized || !normalized.startsWith("provider-")) return;
        if (providers.has(normalized)) return;
        const privateProvider = String(organization.status || organization.type || "").toUpperCase().includes("PRIVATE")
          || (organization.tags || []).map(token).includes("PRIVATE");
        providers.set(normalized, {
          providerId: normalized,
          provider: text(organization.name || normalized),
          organizationId: text(organization.id),
          market: privateProvider ? "PRIVATE" : "SYSTEM",
          source: "ORGANIZATION_STORE"
        });
      });
    });

    return Array.from(providers.values()).sort((a, b) => a.provider.localeCompare(b.provider));
  }

  function resolveProvider(providerId = "") {
    const id = text(providerId);
    return getProviderRegistry().find((provider) => provider.providerId === id) || null;
  }

  function getContractReferences(definitionId = "") {
    const id = text(definitionId);
    const citizens = typeof app.getCitizens === "function"
      ? app.getCitizens({ includeArchived: true })
      : (Array.isArray(window.APP_DATA?.citizens) ? window.APP_DATA.citizens : []);
    const references = [];
    citizens.forEach((citizen) => {
      (Array.isArray(citizen.subscriptions) ? citizen.subscriptions : []).forEach((contract) => {
        if (text(contract.subscriptionCatalogId) !== id) return;
        references.push({
          citizenId: text(citizen.id || contract.citizenId),
          subscriptionContractId: text(contract.subscriptionContractId || contract.id),
          contractStatus: token(contract.contractStatus || contract.status || "ACTIVE")
        });
      });
    });
    return references;
  }

  function validateTier(tier = {}, index = 0) {
    const normalized = app.normalizeSubscriptionTierDefinition?.(tier, index) || tier;
    const issues = [];
    const tierId = text(normalized.tierId || normalized.id);
    if (!tierId) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_TIER_ID_REQUIRED", tierIndex: index });
    else if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(tierId)) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_TIER_ID_INVALID", tierId, tierIndex: index });
    if (!text(normalized.label)) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_TIER_LABEL_REQUIRED", tierId, tierIndex: index });
    if (!Number.isFinite(Number(normalized.amount)) || Number(normalized.amount) < 0) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_TIER_AMOUNT_INVALID", tierId, tierIndex: index });
    if (!text(normalized.billingCycle || normalized.cycle)) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_TIER_BILLING_CYCLE_REQUIRED", tierId, tierIndex: index });
    if (!Array.isArray(normalized.entitlementCodes)) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_TIER_ENTITLEMENTS_INVALID", tierId, tierIndex: index });
    return issues;
  }

  function validateSubscriptionDefinition(definition = {}, options = {}) {
    const normalized = app.normalizeSubscriptionDefinition?.(definition) || clone(definition);
    const issues = [];
    const definitionId = text(normalized.subscriptionCatalogId || normalized.id);
    if (!definitionId) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_CATALOG_ID_REQUIRED" });
    else if (!/^sub-[a-z0-9][a-z0-9-]{1,91}$/.test(definitionId)) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_CATALOG_ID_INVALID", definitionId });
    if (!text(normalized.title)) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_TITLE_REQUIRED", definitionId });
    if (!text(normalized.productCode)) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_PRODUCT_CODE_REQUIRED", definitionId });

    const provider = resolveProvider(normalized.providerId);
    if (!text(normalized.providerId)) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_PROVIDER_ID_REQUIRED", definitionId });
    else if (!provider) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_PROVIDER_NOT_FOUND", definitionId, providerId: normalized.providerId });
    if (provider && normalized.organizationId && provider.organizationId && normalized.organizationId !== provider.organizationId) {
      issues.push({ severity: "ERROR", code: "SUBSCRIPTION_PROVIDER_ORGANIZATION_MISMATCH", definitionId, providerId: normalized.providerId, organizationId: normalized.organizationId, expectedOrganizationId: provider.organizationId });
    }
    if (!VALID_CATALOG_STATUSES.has(token(normalized.catalogStatus))) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_CATALOG_STATUS_INVALID", definitionId });

    const allowedTargetTypes = normalized.targetPolicy?.allowedTargetTypes || [];
    if (!allowedTargetTypes.length) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_TARGET_TYPES_REQUIRED", definitionId });
    allowedTargetTypes.forEach((targetType) => {
      if (!VALID_TARGET_TYPES.has(token(targetType))) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_TARGET_TYPE_INVALID", definitionId, targetType });
    });
    if (!allowedTargetTypes.map(token).includes(token(normalized.targetPolicy?.defaultTargetType))) {
      issues.push({ severity: "ERROR", code: "SUBSCRIPTION_DEFAULT_TARGET_NOT_ALLOWED", definitionId });
    }

    const tierIds = new Set();
    const tiers = Array.isArray(normalized.tiers) ? normalized.tiers : [];
    if (!tiers.length) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_TIERS_REQUIRED", definitionId });
    tiers.forEach((tier, index) => {
      const tierId = text(tier.tierId || tier.id);
      validateTier(tier, index).forEach((issue) => issues.push({ ...issue, definitionId }));
      if (tierId && tierIds.has(tierId)) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_TIER_ID_DUPLICATE", definitionId, tierId });
      tierIds.add(tierId);
    });

    const existing = getDefinitionById(definitionId);
    if (options.mode === "CREATE" && existing) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_DEFINITION_ALREADY_EXISTS", definitionId });
    if (options.mode === "UPDATE" && !existing) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_DEFINITION_NOT_FOUND", definitionId });

    return {
      ok: !issues.some((issue) => issue.severity === "ERROR"),
      definition: clone(normalized),
      issues
    };
  }

  function persistDefinitions(definitions = [], source = "subscription-catalog-authoring") {
    const normalized = app.normalizeSubscriptionCatalogDefinitions?.({ subscriptions: definitions }) || { subscriptions: definitions };
    const stored = app.setSubscriptionCatalogDefinitions?.(normalized, {
      replace: true,
      mergeSeed: false,
      persist: true,
      source
    });
    return stored || normalized;
  }

  function expectedRevisionMatches(existing, input = {}) {
    if (input.expectedRevision === undefined || input.expectedRevision === null || input.expectedRevision === "") return true;
    return Number(existing?.revision || 0) === Number(input.expectedRevision);
  }

  function prepareDefinition(inputDefinition = {}, existing = null) {
    const provider = resolveProvider(inputDefinition.providerId || existing?.providerId);
    const normalized = app.normalizeSubscriptionDefinition?.({
      ...(existing || {}),
      ...clone(inputDefinition),
      providerId: provider?.providerId || inputDefinition.providerId || existing?.providerId || "",
      provider: provider?.provider || inputDefinition.provider || existing?.provider || "LOCAL LEDGER",
      organizationId: provider?.organizationId || inputDefinition.organizationId || existing?.organizationId || "",
      market: provider?.market || inputDefinition.market || existing?.market || "SYSTEM",
      revision: Number(existing?.revision || 0) + 1
    }) || inputDefinition;

    const existingTiers = new Map((existing?.tiers || []).map((tier) => [text(tier.tierId || tier.id), tier]));
    const tiers = (normalized.tiers || []).map((tier, index) => {
      const tierId = text(tier.tierId || tier.id);
      const previous = existingTiers.get(tierId);
      if (!previous) return { ...tier, revision: 1 };
      const before = app.serializeSubscriptionTierDefinition?.({ ...previous, revision: 1 }, index) || { ...previous, revision: 1 };
      const after = app.serializeSubscriptionTierDefinition?.({ ...tier, revision: 1 }, index) || { ...tier, revision: 1 };
      const changed = stableStringify(before) !== stableStringify(after);
      return { ...tier, revision: changed ? Number(previous.revision || 1) + 1 : Number(previous.revision || 1) };
    });

    return app.normalizeSubscriptionDefinition?.({ ...normalized, tiers }) || { ...normalized, tiers };
  }

  function createSubscriptionDefinition(input = {}) {
    const replay = getReceipt(input);
    if (replay) return replay;
    const raw = clone(input.definition || input);
    if (!text(raw.subscriptionCatalogId || raw.id)) raw.subscriptionCatalogId = `sub-${slug(raw.title || "new-subscription")}`;
    const prepared = prepareDefinition(raw, null);
    const validation = validateSubscriptionDefinition(prepared, { mode: "CREATE" });
    if (!validation.ok) return rememberReceipt(input, result(false, "SUBSCRIPTION_DEFINITION_VALIDATION_FAILED", validation));
    const definitions = getDefinitions();
    definitions.push(validation.definition);
    persistDefinitions(definitions, "subscription-authoring-create");
    return rememberReceipt(input, result(true, "SUBSCRIPTION_DEFINITION_CREATED", {
      definitionId: validation.definition.subscriptionCatalogId,
      revisionAfter: validation.definition.revision,
      definition: validation.definition
    }));
  }

  function updateSubscriptionDefinition(definitionId, patch = {}, input = {}) {
    const command = { ...input, definitionId, patch };
    const replay = getReceipt(command);
    if (replay) return replay;
    const id = text(definitionId || patch.subscriptionCatalogId || patch.id);
    const definitions = getDefinitions();
    const index = definitions.findIndex((item) => text(item.subscriptionCatalogId || item.id) === id);
    if (index < 0) return rememberReceipt(command, result(false, "SUBSCRIPTION_DEFINITION_NOT_FOUND", { definitionId: id }));
    const existing = definitions[index];
    if (!expectedRevisionMatches(existing, input)) {
      return rememberReceipt(command, result(false, "SUBSCRIPTION_DEFINITION_REVISION_CONFLICT", { definitionId: id, expectedRevision: Number(input.expectedRevision), actualRevision: Number(existing.revision || 0) }));
    }
    const attemptedId = text(patch.subscriptionCatalogId || patch.id || id);
    if (attemptedId !== id) return rememberReceipt(command, result(false, "SUBSCRIPTION_DEFINITION_ID_IMMUTABLE", { definitionId: id, attemptedId }));
    const prepared = prepareDefinition({ ...patch, subscriptionCatalogId: id }, existing);
    const validation = validateSubscriptionDefinition(prepared, { mode: "UPDATE" });
    if (!validation.ok) return rememberReceipt(command, result(false, "SUBSCRIPTION_DEFINITION_VALIDATION_FAILED", validation));
    definitions[index] = validation.definition;
    persistDefinitions(definitions, "subscription-authoring-update");
    return rememberReceipt(command, result(true, "SUBSCRIPTION_DEFINITION_UPDATED", {
      definitionId: id,
      revisionBefore: Number(existing.revision || 0),
      revisionAfter: validation.definition.revision,
      definition: validation.definition
    }));
  }

  function duplicateSubscriptionDefinition(definitionId, overrides = {}, input = {}) {
    const source = getDefinitionById(definitionId);
    if (!source) return result(false, "SUBSCRIPTION_DEFINITION_NOT_FOUND", { definitionId: text(definitionId) });
    const nextId = text(overrides.subscriptionCatalogId || overrides.id) || `${source.subscriptionCatalogId}-copy-${Date.now().toString(36).slice(-5)}`;
    const tierPrefix = nextId.replace(/^sub-/, "");
    const definition = {
      ...source,
      ...clone(overrides),
      subscriptionCatalogId: nextId,
      id: nextId,
      productCode: text(overrides.productCode) || `${source.productCode || tierPrefix.toUpperCase()}_COPY`,
      title: text(overrides.title) || `${source.title} Copy`,
      catalogStatus: token(overrides.catalogStatus || "PROVISIONAL"),
      active: overrides.active !== false,
      revision: 1,
      tiers: (source.tiers || []).map((tier, index) => ({
        ...tier,
        tierId: `${tierPrefix}-${slug(tier.label || `tier-${index + 1}`)}`.slice(0, 80),
        revision: 1
      }))
    };
    return createSubscriptionDefinition({ ...input, definition });
  }

  function setDefinitionLifecycle(definitionId, active, input = {}) {
    const existing = getDefinitionById(definitionId);
    if (!existing) return result(false, "SUBSCRIPTION_DEFINITION_NOT_FOUND", { definitionId: text(definitionId) });
    return updateSubscriptionDefinition(definitionId, {
      ...existing,
      active,
      catalogStatus: active && existing.catalogStatus === "DEPRECATED" ? "PROVISIONAL" : existing.catalogStatus
    }, input);
  }

  function archiveSubscriptionDefinition(definitionId, input = {}) {
    return setDefinitionLifecycle(definitionId, false, input);
  }

  function restoreSubscriptionDefinition(definitionId, input = {}) {
    return setDefinitionLifecycle(definitionId, true, input);
  }

  function deleteSubscriptionDefinition(definitionId, input = {}) {
    const command = { ...input, definitionId };
    const replay = getReceipt(command);
    if (replay) return replay;
    const id = text(definitionId);
    const existing = getDefinitionById(id);
    if (!existing) return rememberReceipt(command, result(false, "SUBSCRIPTION_DEFINITION_NOT_FOUND", { definitionId: id }));
    if (!text(input.operatorNote)) return rememberReceipt(command, result(false, "SUBSCRIPTION_OPERATOR_NOTE_REQUIRED", { definitionId: id }));
    const references = getContractReferences(id);
    if (references.length && input.force !== true) {
      return rememberReceipt(command, result(false, "SUBSCRIPTION_DEFINITION_REFERENCED", { definitionId: id, references }));
    }
    const definitions = getDefinitions().filter((definition) => text(definition.subscriptionCatalogId || definition.id) !== id);
    persistDefinitions(definitions, "subscription-authoring-delete");
    return rememberReceipt(command, result(true, "SUBSCRIPTION_DEFINITION_DELETED", { definitionId: id, referencesRemoved: references.length }));
  }

  function replaceSubscriptionCatalog(definitions = [], input = {}) {
    const normalized = app.normalizeSubscriptionCatalogDefinitions?.({ subscriptions: definitions }) || { subscriptions: definitions };
    const issues = [];
    const seen = new Set();
    normalized.subscriptions.forEach((definition) => {
      const validation = validateSubscriptionDefinition(definition);
      issues.push(...validation.issues);
      const id = text(definition.subscriptionCatalogId || definition.id);
      if (seen.has(id)) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_DEFINITION_ID_DUPLICATE", definitionId: id });
      seen.add(id);
    });
    if (issues.some((issue) => issue.severity === "ERROR")) return result(false, "SUBSCRIPTION_CATALOG_VALIDATION_FAILED", { issues });
    const stored = persistDefinitions(normalized.subscriptions, input.source || "subscription-authoring-replace");
    return result(true, "SUBSCRIPTION_CATALOG_REPLACED", { definitionCount: stored.subscriptions.length, definitions: stored.subscriptions });
  }

  function buildSubscriptionCatalogPack(options = {}) {
    const definitions = getDefinitions().filter((definition) => options.includeArchived !== false || definition.active !== false);
    return {
      schemaVersion: PACK_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "ADMIN_SUBSCRIPTION_CATALOG_AUTHORING",
      catalogSchemaVersion: app.SUBSCRIPTION_CATALOG_SCHEMA_VERSION || "",
      revision: hashText(stableStringify(definitions)),
      categories: clone(window.APP_DATA?.subscriptionCatalog?.categories || []),
      providers: clone(getProviderRegistry()),
      definitions: clone(definitions)
    };
  }

  function serializeSubscriptionCatalogPack(pack = buildSubscriptionCatalogPack()) {
    return `${JSON.stringify(pack, null, 2)}\n`;
  }

  function parsePack(input) {
    if (typeof input === "string") return JSON.parse(input);
    if (input && typeof input === "object") return clone(input);
    throw new TypeError("SUBSCRIPTION_CATALOG_PACK_INVALID");
  }

  function previewSubscriptionCatalogPack(input, options = {}) {
    let pack;
    try {
      pack = parsePack(input);
    } catch (error) {
      return result(false, "SUBSCRIPTION_CATALOG_PACK_PARSE_FAILED", { message: error?.message || "Invalid JSON." });
    }
    if (text(pack.schemaVersion) !== PACK_SCHEMA_VERSION) {
      return result(false, "SUBSCRIPTION_CATALOG_PACK_SCHEMA_UNSUPPORTED", { expectedSchemaVersion: PACK_SCHEMA_VERSION, actualSchemaVersion: text(pack.schemaVersion) });
    }
    const incoming = app.normalizeSubscriptionCatalogDefinitions?.({ subscriptions: pack.definitions || [] })?.subscriptions || [];
    const current = getDefinitions();
    const currentById = new Map(current.map((definition) => [definition.subscriptionCatalogId, definition]));
    const incomingById = new Map(incoming.map((definition) => [definition.subscriptionCatalogId, definition]));
    const issues = [];
    incoming.forEach((definition) => issues.push(...validateSubscriptionDefinition(definition).issues));
    let added = 0;
    let changed = 0;
    let unchanged = 0;
    incomingById.forEach((definition, definitionId) => {
      if (!currentById.has(definitionId)) added += 1;
      else if (stableStringify(currentById.get(definitionId)) === stableStringify(definition)) unchanged += 1;
      else changed += 1;
    });
    const missing = Array.from(currentById.keys()).filter((definitionId) => !incomingById.has(definitionId));
    const hasErrors = issues.some((issue) => issue.severity === "ERROR");
    return result(!hasErrors, hasErrors ? "SUBSCRIPTION_CATALOG_PACK_VALIDATION_FAILED" : "SUBSCRIPTION_CATALOG_PACK_PREVIEW_READY", {
      mode: String(options.mode || "MERGE").toUpperCase(),
      incomingCount: incoming.length,
      currentCount: current.length,
      added,
      changed,
      unchanged,
      missingCount: missing.length,
      missingDefinitionIds: missing,
      issues,
      canApply: !hasErrors,
      pack: { ...clone(pack), definitions: incoming }
    });
  }

  function applySubscriptionCatalogPack(input, options = {}) {
    const preview = previewSubscriptionCatalogPack(input, options);
    if (!preview.ok || !preview.canApply) return preview;
    const mode = String(options.mode || "MERGE").toUpperCase();
    const incoming = preview.pack.definitions || [];
    let definitions;
    if (mode === "REPLACE") definitions = incoming;
    else {
      const byId = new Map(getDefinitions().map((definition) => [definition.subscriptionCatalogId, definition]));
      incoming.forEach((definition) => byId.set(definition.subscriptionCatalogId, definition));
      definitions = Array.from(byId.values());
    }
    const applied = replaceSubscriptionCatalog(definitions, { source: `subscription-pack-${mode.toLowerCase()}` });
    if (!applied.ok) return applied;
    return result(true, "SUBSCRIPTION_CATALOG_PACK_APPLIED", {
      mode,
      definitionCount: definitions.length,
      added: preview.added,
      changed: preview.changed,
      missingPreserved: mode === "MERGE" ? preview.missingCount : 0,
      removed: mode === "REPLACE" ? preview.missingCount : 0
    });
  }


  function escapeHtml(value) {
    if (typeof app.escapeHtml === "function") return app.escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function listText(value = []) {
    return (Array.isArray(value) ? value : []).map(text).filter(Boolean).join(", ");
  }

  function jsonText(value, fallback) {
    return JSON.stringify(value == null ? fallback : value, null, 2);
  }

  function readList(value = "") {
    return String(value || "").split(/[\n,]+/g).map(text).filter(Boolean);
  }

  function readJson(value = "", fallback) {
    const raw = text(value);
    return raw ? JSON.parse(raw) : clone(fallback);
  }

  function createDefinitionTemplate() {
    const provider = getProviderRegistry()[0] || { providerId: "", provider: "LOCAL LEDGER", organizationId: "", market: "SYSTEM" };
    return app.normalizeSubscriptionDefinition?.({
      subscriptionCatalogId: `sub-new-${Date.now().toString(36)}`,
      providerId: provider.providerId,
      organizationId: provider.organizationId,
      provider: provider.provider,
      productCode: "NEW_SUBSCRIPTION",
      title: "New Subscription",
      category: "OTHER",
      market: provider.market,
      domain: "GENERAL",
      billingCycle: "WEEKLY",
      currency: "CREDIT",
      entitlementCodes: [],
      targetPolicy: {
        allowedTargetTypes: ["CITIZEN"],
        defaultTargetType: "CITIZEN",
        maximumTargets: 1,
        itemEligibility: { requireOwnedByCitizen: true, blockedLifecycleStates: ["DISPOSED"] }
      },
      coverageRules: [],
      tags: [provider.market],
      summary: "",
      description: "",
      presentation: { overview: "", benefits: [], limitations: [], usageNotes: [], comparisonAxes: [] },
      catalogStatus: "PROVISIONAL",
      tiers: [{
        tierId: "tier-1",
        tierLevel: 1,
        label: "T1",
        amount: 0,
        billingCycle: "WEEKLY",
        durationDays: 7,
        description: "",
        presentation: { features: [], limits: [], priorityLabel: "", comparisonValues: { scope: "", access: "", limit: "", priority: "" } },
        entitlementCodes: [],
        coverageRuleIds: [],
        active: true,
        revision: 1
      }],
      active: true,
      revision: 1
    }) || {};
  }

  function renderResultBanner(output) {
    if (!output) return "";
    const issues = Array.isArray(output.issues) ? output.issues : [];
    return `
      <div class="admin-result-banner ${output.ok ? "is-success" : "is-error"}">
        <b>${escapeHtml(output.resultCode || (output.ok ? "SUCCEEDED" : "FAILED"))}</b>
        <span>${escapeHtml(output.definitionId || output.message || `${issues.length} issue(s)`)}</span>
      </div>
      ${issues.length ? `<ul class="admin-inspector-notes">${issues.slice(0, 30).map((issue) => `<li><b>${escapeHtml(issue.severity)}</b> ${escapeHtml(issue.code)} ${escapeHtml(issue.tierId || issue.providerId || "")}</li>`).join("")}</ul>` : ""}
    `;
  }

  function renderTierEditor(tier = {}, index = 0) {
    const normalized = app.normalizeSubscriptionTierDefinition?.(tier, index) || tier;
    const presentation = normalized.presentation || {};
    const comparison = presentation.comparisonValues || {};
    return `
      <article class="subscription-authoring-tier" data-subscription-authoring-tier>
        <header>
          <div><p class="kicker">TIER ${escapeHtml(index + 1)}</p><h6>${escapeHtml(normalized.label || `Tier ${index + 1}`)}</h6></div>
          <div class="admin-form-actions">
            <button class="admin-inline-button" type="button" data-subscription-tier-move="UP" aria-label="Move tier up">↑</button>
            <button class="admin-inline-button" type="button" data-subscription-tier-move="DOWN" aria-label="Move tier down">↓</button>
            <button class="admin-inline-button" type="button" data-subscription-tier-duplicate>Duplicate</button>
            <button class="admin-inline-button" type="button" data-subscription-tier-delete>Delete</button>
          </div>
        </header>
        <div class="admin-form-grid subscription-authoring-tier-grid">
          <label>Stable tier ID
            <input data-tier-field="tierId" required pattern="[a-z0-9][a-z0-9-]{1,79}" value="${escapeHtml(normalized.tierId || normalized.id || "")}" />
          </label>
          <label>Level
            <input data-tier-field="tierLevel" type="number" min="1" max="99" value="${escapeHtml(normalized.tierLevel || index + 1)}" />
          </label>
          <label>Label
            <input data-tier-field="label" required value="${escapeHtml(normalized.label || "")}" />
          </label>
          <label>Price
            <input data-tier-field="amount" type="number" min="0" step="1" value="${escapeHtml(normalized.amount || 0)}" />
          </label>
          <label>Billing cycle
            <input data-tier-field="billingCycle" value="${escapeHtml(normalized.billingCycle || normalized.cycle || "WEEKLY")}" />
          </label>
          <label>Duration days
            <input data-tier-field="durationDays" type="number" min="0" max="3650" value="${escapeHtml(normalized.durationDays ?? 7)}" />
          </label>
          <label class="admin-form-field--wide">Description
            <textarea data-tier-field="description" rows="3">${escapeHtml(normalized.description || "")}</textarea>
          </label>
          <label class="admin-form-field--wide">Entitlement codes
            <textarea data-tier-field="entitlementCodes" rows="2">${escapeHtml(listText(normalized.entitlementCodes))}</textarea>
          </label>
          <label class="admin-form-field--wide">Coverage rule IDs
            <input data-tier-field="coverageRuleIds" value="${escapeHtml(listText(normalized.coverageRuleIds))}" />
          </label>
          <label class="admin-form-field--wide">Features
            <textarea data-tier-field="features" rows="3">${escapeHtml((presentation.features || []).join("\n"))}</textarea>
          </label>
          <label class="admin-form-field--wide">Limits
            <textarea data-tier-field="limits" rows="3">${escapeHtml((presentation.limits || []).join("\n"))}</textarea>
          </label>
          <label>Priority label
            <input data-tier-field="priorityLabel" value="${escapeHtml(presentation.priorityLabel || "")}" />
          </label>
          <label>Comparison: scope
            <input data-tier-field="comparisonScope" value="${escapeHtml(comparison.scope || "")}" />
          </label>
          <label>Comparison: access
            <input data-tier-field="comparisonAccess" value="${escapeHtml(comparison.access || "")}" />
          </label>
          <label>Comparison: limit
            <input data-tier-field="comparisonLimit" value="${escapeHtml(comparison.limit || "")}" />
          </label>
          <label>Comparison: priority
            <input data-tier-field="comparisonPriority" value="${escapeHtml(comparison.priority || "")}" />
          </label>
          <label class="definition-archive-check"><input class="ui-select-control" data-tier-field="active" type="checkbox" ${normalized.active !== false ? "checked" : ""} /> Active tier</label>
        </div>
      </article>
    `;
  }

  function renderDefinitionEditor(editor = {}) {
    if (!editor?.definition) return "";
    const definition = app.normalizeSubscriptionDefinition?.(editor.definition) || editor.definition;
    const providers = getProviderRegistry();
    const categories = app.getSubscriptionCatalogCategories?.() || [];
    const targetTypes = definition.targetPolicy?.allowedTargetTypes || ["CITIZEN"];
    const itemEligibility = definition.targetPolicy?.itemEligibility || {};
    const presentation = definition.presentation || {};
    const idLocked = !["CREATE", "DUPLICATE"].includes(String(editor.mode || "").toUpperCase());
    return `
      <section class="admin-workspace-panel subscription-authoring-editor-panel">
        <p class="kicker">SUBSCRIPTION DEFINITION AUTHORING / ${escapeHtml(String(editor.mode || "EDIT").toUpperCase())}</p>
        <form data-admin-subscription-authoring-form>
          <input type="hidden" name="sourceDefinitionId" value="${escapeHtml(editor.sourceDefinitionId || "")}" />
          <input type="hidden" name="expectedRevision" value="${escapeHtml(editor.expectedRevision ?? definition.revision ?? 0)}" />
          <div class="admin-form-grid subscription-authoring-product-grid">
            <label>Stable catalog ID
              <input name="subscriptionCatalogId" required pattern="sub-[a-z0-9][a-z0-9-]{1,91}" value="${escapeHtml(definition.subscriptionCatalogId || definition.id || "")}" ${idLocked ? 'readonly aria-readonly="true"' : ""} />
            </label>
            <label>Product code
              <input name="productCode" required value="${escapeHtml(definition.productCode || "")}" />
            </label>
            <label>Title
              <input name="title" required value="${escapeHtml(definition.title || "")}" />
            </label>
            <label>Provider
              <select name="providerId" required>
                ${providers.map((provider) => `<option value="${escapeHtml(provider.providerId)}" ${provider.providerId === definition.providerId ? "selected" : ""}>${escapeHtml(provider.provider)} / ${escapeHtml(provider.market)}</option>`).join("")}
              </select>
            </label>
            <label>Category
              <select name="category">${categories.map((category) => `<option value="${escapeHtml(category.id)}" ${category.id === definition.category ? "selected" : ""}>${escapeHtml(category.label || category.title || category.id)}</option>`).join("")}</select>
            </label>
            <label>Domain
              <input name="domain" value="${escapeHtml(definition.domain || "GENERAL")}" />
            </label>
            <label>Billing cycle
              <input name="billingCycle" value="${escapeHtml(definition.billingCycle || "WEEKLY")}" />
            </label>
            <label>Currency
              <input name="currency" value="${escapeHtml(definition.currency || "CREDIT")}" />
            </label>
            <label>Authoring status
              <select name="catalogStatus">${["CANONICAL", "PROVISIONAL", "TEST_ONLY", "DEPRECATED"].map((status) => `<option value="${status}" ${status === definition.catalogStatus ? "selected" : ""}>${status}</option>`).join("")}</select>
            </label>
            <label>Logo path
              <input name="logo" value="${escapeHtml(definition.logo || "")}" />
            </label>
            <label class="admin-form-field--wide">Summary
              <input name="summary" value="${escapeHtml(definition.summary || "")}" />
            </label>
            <label class="admin-form-field--wide">Description
              <textarea name="description" rows="4">${escapeHtml(definition.description || "")}</textarea>
            </label>
            <label class="admin-form-field--wide">Product entitlement codes
              <textarea name="entitlementCodes" rows="2">${escapeHtml(listText(definition.entitlementCodes))}</textarea>
            </label>
            <label class="admin-form-field--wide">Tags
              <input name="tags" value="${escapeHtml(listText(definition.tags))}" />
            </label>
            <label class="definition-archive-check"><input class="ui-select-control" name="active" type="checkbox" ${definition.active !== false ? "checked" : ""} /> Published / active</label>
          </div>

          <fieldset class="subscription-authoring-fieldset">
            <legend>Target policy</legend>
            <div class="admin-form-grid">
              <label class="definition-archive-check"><input class="ui-select-control" name="allowCitizen" type="checkbox" ${targetTypes.includes("CITIZEN") ? "checked" : ""} /> Citizen</label>
              <label class="definition-archive-check"><input class="ui-select-control" name="allowItemInstance" type="checkbox" ${targetTypes.includes("ITEM_INSTANCE") ? "checked" : ""} /> ItemInstance</label>
              <label>Default target
                <select name="defaultTargetType">${["CITIZEN", "ITEM_INSTANCE"].map((targetType) => `<option value="${targetType}" ${definition.targetPolicy?.defaultTargetType === targetType ? "selected" : ""}>${targetType}</option>`).join("")}</select>
              </label>
              <label>Maximum targets
                <input name="maximumTargets" type="number" min="1" max="100" value="${escapeHtml(definition.targetPolicy?.maximumTargets ?? 1)}" />
              </label>
              <label class="definition-archive-check"><input class="ui-select-control" name="requireOwnedByCitizen" type="checkbox" ${itemEligibility.requireOwnedByCitizen !== false ? "checked" : ""} /> Require owned ItemInstance</label>
              <label class="admin-form-field--wide">Allowed definition IDs
                <textarea name="allowedDefinitionIds" rows="2">${escapeHtml(listText(itemEligibility.allowedDefinitionIds))}</textarea>
              </label>
              <label class="admin-form-field--wide">Allowed categories
                <input name="allowedCategories" value="${escapeHtml(listText(itemEligibility.allowedCategories))}" />
              </label>
              <label class="admin-form-field--wide">Allowed subtypes
                <input name="allowedSubtypes" value="${escapeHtml(listText(itemEligibility.allowedSubtypes))}" />
              </label>
              <label class="admin-form-field--wide">Required tags — any
                <input name="requiredTagsAny" value="${escapeHtml(listText(itemEligibility.requiredTagsAny))}" />
              </label>
              <label class="admin-form-field--wide">Required tags — all
                <input name="requiredTagsAll" value="${escapeHtml(listText(itemEligibility.requiredTagsAll))}" />
              </label>
              <label class="admin-form-field--wide">Allowed manufacturer IDs
                <input name="allowedManufacturerIds" value="${escapeHtml(listText(itemEligibility.allowedManufacturerIds))}" />
              </label>
              <label class="admin-form-field--wide">Allowed provider IDs
                <input name="allowedProviderIds" value="${escapeHtml(listText(itemEligibility.allowedProviderIds))}" />
              </label>
              <label class="admin-form-field--wide">Blocked lifecycle states
                <input name="blockedLifecycleStates" value="${escapeHtml(listText(itemEligibility.blockedLifecycleStates || ["DISPOSED"]))}" />
              </label>
            </div>
          </fieldset>

          <fieldset class="subscription-authoring-fieldset">
            <legend>Presentation</legend>
            <div class="admin-form-grid">
              <label class="admin-form-field--wide">Overview
                <textarea name="presentationOverview" rows="3">${escapeHtml(presentation.overview || "")}</textarea>
              </label>
              <label class="admin-form-field--wide">Benefits — one per line
                <textarea name="presentationBenefits" rows="4">${escapeHtml((presentation.benefits || []).join("\n"))}</textarea>
              </label>
              <label class="admin-form-field--wide">Limitations — one per line
                <textarea name="presentationLimitations" rows="4">${escapeHtml((presentation.limitations || []).join("\n"))}</textarea>
              </label>
              <label class="admin-form-field--wide">Usage notes — one per line
                <textarea name="presentationUsageNotes" rows="4">${escapeHtml((presentation.usageNotes || []).join("\n"))}</textarea>
              </label>
              <label class="admin-form-field--wide">Comparison axes
                <input name="presentationComparisonAxes" value="${escapeHtml(listText(presentation.comparisonAxes))}" />
              </label>
              <label class="admin-form-field--wide">Coverage rules JSON
                <textarea name="coverageRules" rows="6">${escapeHtml(jsonText(definition.coverageRules || [], []))}</textarea>
              </label>
            </div>
          </fieldset>

          <section class="subscription-authoring-tiers" data-subscription-tier-list>
            <header><div><p class="kicker">PACKAGE TIERS</p><h5>Stable tier definitions</h5></div><button class="admin-inline-button" type="button" data-subscription-tier-add>Add Tier</button></header>
            ${(definition.tiers || []).map(renderTierEditor).join("")}
          </section>

          <label class="admin-form-field--wide subscription-authoring-note">Operator note
            <input name="operatorNote" placeholder="Required when saving; validation preview is read-only" />
          </label>
          <div class="admin-form-actions">
            <button class="admin-inline-button" type="submit" value="PREVIEW">Validate / Preview</button>
            <button class="admin-inline-button" type="submit" value="SAVE">Save Definition</button>
            <button class="admin-inline-button" type="button" data-subscription-authoring-cancel>Cancel</button>
          </div>
        </form>
      </section>
    `;
  }

  function renderImportPreview(preview) {
    if (!preview) return `<p class="file-empty">No Subscription catalog pack selected.</p>`;
    return `
      ${renderResultBanner(preview)}
      ${preview.ok ? `<p>${escapeHtml(preview.incomingCount)} incoming / +${escapeHtml(preview.added)} / Δ${escapeHtml(preview.changed)} / =${escapeHtml(preview.unchanged)} / ${escapeHtml(preview.missingCount)} missing</p>
        <div class="admin-form-actions">
          <button class="admin-inline-button" type="button" data-subscription-pack-apply="MERGE">Apply Merge</button>
          <button class="admin-inline-button" type="button" data-subscription-pack-apply="REPLACE">Apply Replace</button>
        </div>` : ""}
    `;
  }

  function renderAuthoringPanel(options = {}) {
    const current = options.state || {};
    const selected = options.selectedDefinition || null;
    const references = selected ? getContractReferences(selected.subscriptionCatalogId || selected.id) : [];
    return `
      <section class="admin-workspace-panel subscription-authoring-toolbar">
        <p class="kicker">CANONICAL SUBSCRIPTION AUTHORING</p>
        <h5>Products, target policy, presentation and stable tiers</h5>
        <p>All mutations write through Subscription Catalog Store v6. Runtime contracts remain owned by Citizen records and SubscriptionAPI.</p>
        ${renderResultBanner(current.subscriptionResult)}
        <div class="admin-form-actions">
          <button class="admin-inline-button" type="button" data-subscription-authoring-create>Create Product</button>
          <button class="admin-inline-button" type="button" data-subscription-authoring-duplicate ${selected ? "" : "disabled"}>Duplicate Selected</button>
          <button class="admin-inline-button" type="button" data-subscription-authoring-edit ${selected ? "" : "disabled"}>Edit Selected</button>
          <button class="admin-inline-button" type="button" data-subscription-authoring-export>Export Subscription Pack</button>
          <label class="admin-inline-button" for="admin-subscription-pack-input">Import Subscription Pack</label>
          <input id="admin-subscription-pack-input" type="file" accept="application/json,.json" data-subscription-pack-input hidden />
        </div>
        ${selected ? `
          <form class="admin-form-grid" data-subscription-authoring-lifecycle>
            <input type="hidden" name="definitionId" value="${escapeHtml(selected.subscriptionCatalogId || selected.id || "")}" />
            <input type="hidden" name="expectedRevision" value="${escapeHtml(selected.revision || 0)}" />
            <label class="admin-form-field--wide">Lifecycle operator note
              <input name="operatorNote" required placeholder="Reason for archive, restore or delete" />
            </label>
            <div class="admin-form-actions admin-form-field--wide">
              ${selected.active === false ? `<button class="admin-inline-button" type="submit" value="RESTORE">Restore</button>` : `<button class="admin-inline-button" type="submit" value="ARCHIVE">Archive</button>`}
              <button class="admin-inline-button" type="submit" value="DELETE" ${references.length ? "disabled" : ""}>Hard Delete</button>
              ${references.length ? `<span>${escapeHtml(references.length)} contract reference(s) block hard delete.</span>` : ""}
            </div>
          </form>
        ` : ""}
      </section>
      ${renderDefinitionEditor(current.subscriptionEditor)}
      <section class="admin-workspace-panel">
        <p class="kicker">SUBSCRIPTION PACK IMPORT</p>
        ${renderImportPreview(current.subscriptionImportPreview)}
      </section>
    `;
  }

  function readTierRow(row, index) {
    const field = (name) => row.querySelector(`[data-tier-field="${name}"]`);
    const value = (name) => text(field(name)?.value);
    return {
      tierId: value("tierId"),
      tierLevel: Number(value("tierLevel") || index + 1),
      label: value("label"),
      amount: Number(value("amount") || 0),
      billingCycle: value("billingCycle") || "WEEKLY",
      durationDays: Number(value("durationDays") || 7),
      description: value("description"),
      entitlementCodes: readList(value("entitlementCodes")),
      coverageRuleIds: readList(value("coverageRuleIds")),
      presentation: {
        features: readList(value("features")),
        limits: readList(value("limits")),
        priorityLabel: value("priorityLabel"),
        comparisonValues: {
          scope: value("comparisonScope"),
          access: value("comparisonAccess"),
          limit: value("comparisonLimit"),
          priority: value("comparisonPriority")
        }
      },
      active: field("active")?.checked === true,
      revision: 1
    };
  }

  function readDefinitionForm(form) {
    const data = new FormData(form);
    const provider = resolveProvider(data.get("providerId"));
    const allowedTargetTypes = [];
    if (data.get("allowCitizen")) allowedTargetTypes.push("CITIZEN");
    if (data.get("allowItemInstance")) allowedTargetTypes.push("ITEM_INSTANCE");
    const defaultTargetType = allowedTargetTypes.includes(text(data.get("defaultTargetType")).toUpperCase())
      ? text(data.get("defaultTargetType")).toUpperCase()
      : allowedTargetTypes[0] || "CITIZEN";
    return {
      definition: {
        subscriptionCatalogId: text(data.get("subscriptionCatalogId")),
        productCode: text(data.get("productCode")),
        title: text(data.get("title")),
        providerId: provider?.providerId || text(data.get("providerId")),
        provider: provider?.provider || "LOCAL LEDGER",
        organizationId: provider?.organizationId || "",
        market: provider?.market || "SYSTEM",
        category: text(data.get("category")) || "OTHER",
        domain: text(data.get("domain")) || "GENERAL",
        billingCycle: text(data.get("billingCycle")) || "WEEKLY",
        currency: text(data.get("currency")) || "CREDIT",
        catalogStatus: text(data.get("catalogStatus")) || "PROVISIONAL",
        logo: text(data.get("logo")),
        summary: text(data.get("summary")),
        description: text(data.get("description")),
        entitlementCodes: readList(data.get("entitlementCodes")),
        tags: readList(data.get("tags")),
        active: data.get("active") === "on",
        targetPolicy: {
          allowedTargetTypes,
          defaultTargetType,
          maximumTargets: Number(data.get("maximumTargets") || 1),
          itemEligibility: {
            requireOwnedByCitizen: data.get("requireOwnedByCitizen") === "on",
            blockedLifecycleStates: readList(data.get("blockedLifecycleStates")),
            allowedDefinitionIds: readList(data.get("allowedDefinitionIds")),
            allowedCategories: readList(data.get("allowedCategories")),
            allowedSubtypes: readList(data.get("allowedSubtypes")),
            requiredTagsAny: readList(data.get("requiredTagsAny")),
            requiredTagsAll: readList(data.get("requiredTagsAll")),
            allowedManufacturerIds: readList(data.get("allowedManufacturerIds")),
            allowedProviderIds: readList(data.get("allowedProviderIds"))
          }
        },
        presentation: {
          overview: text(data.get("presentationOverview")),
          benefits: readList(data.get("presentationBenefits")),
          limitations: readList(data.get("presentationLimitations")),
          usageNotes: readList(data.get("presentationUsageNotes")),
          comparisonAxes: readList(data.get("presentationComparisonAxes"))
        },
        coverageRules: readJson(data.get("coverageRules"), []),
        tiers: Array.from(form.querySelectorAll("[data-subscription-authoring-tier]")).map(readTierRow)
      },
      sourceDefinitionId: text(data.get("sourceDefinitionId")),
      expectedRevision: Number(data.get("expectedRevision") || 0),
      operatorNote: text(data.get("operatorNote"))
    };
  }

  function downloadPack() {
    const serialized = serializeSubscriptionCatalogPack();
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `future-noir-subscription-catalog-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function bindAuthoring(container, user, controls = {}) {
    if (!container) return;
    const getState = controls.getState || (() => ({}));
    const patchState = controls.patchState || (() => ({}));
    const rerender = controls.rerender || (() => {});
    const selected = () => controls.getSelectedDefinition?.() || null;
    const command = (payload = {}) => ({
      ...payload,
      actor: { actorId: user?.id || user?.login || "", actorRole: user?.role || "", displayName: user?.displayName || user?.login || "ADMIN" },
      idempotencyKey: `subscription-authoring:${payload.command || "command"}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`
    });

    container.querySelector("[data-subscription-authoring-create]")?.addEventListener("click", () => {
      const definition = createDefinitionTemplate();
      patchState({ subscriptionEditor: { mode: "CREATE", definition, sourceDefinitionId: "", expectedRevision: 0 }, subscriptionPreview: null, subscriptionResult: null });
      rerender();
    });

    container.querySelector("[data-subscription-authoring-edit]")?.addEventListener("click", () => {
      const definition = selected();
      if (!definition) return;
      patchState({ subscriptionEditor: { mode: "EDIT", definition: clone(definition), sourceDefinitionId: definition.subscriptionCatalogId, expectedRevision: definition.revision || 0 }, subscriptionPreview: null, subscriptionResult: null });
      rerender();
    });

    container.querySelector("[data-subscription-authoring-duplicate]")?.addEventListener("click", () => {
      const definition = selected();
      if (!definition) return;
      const nextId = `${definition.subscriptionCatalogId}-copy-${Date.now().toString(36).slice(-5)}`;
      const copy = clone(definition);
      copy.subscriptionCatalogId = nextId;
      copy.id = nextId;
      copy.title = `${definition.title} Copy`;
      copy.productCode = `${definition.productCode || slug(definition.title).toUpperCase()}_COPY`;
      copy.catalogStatus = "PROVISIONAL";
      copy.revision = 1;
      copy.tiers = (copy.tiers || []).map((tier, index) => ({ ...tier, tierId: `${nextId.replace(/^sub-/, "")}-${slug(tier.label || `tier-${index + 1}`)}`.slice(0, 80), revision: 1 }));
      patchState({ subscriptionEditor: { mode: "DUPLICATE", definition: copy, sourceDefinitionId: definition.subscriptionCatalogId, expectedRevision: 0 }, subscriptionPreview: null, subscriptionResult: null });
      rerender();
    });

    container.querySelector("[data-subscription-authoring-cancel]")?.addEventListener("click", () => {
      patchState({ subscriptionEditor: null, subscriptionPreview: null, subscriptionResult: null });
      rerender();
    });

    container.querySelector("[data-subscription-authoring-export]")?.addEventListener("click", () => {
      try {
        downloadPack();
        patchState({ subscriptionResult: result(true, "SUBSCRIPTION_CATALOG_PACK_EXPORTED") });
      } catch (error) {
        patchState({ subscriptionResult: result(false, "SUBSCRIPTION_CATALOG_PACK_EXPORT_FAILED", { message: error?.message || "Export failed." }) });
      }
      rerender();
    });

    container.querySelector("[data-subscription-pack-input]")?.addEventListener("change", async (event) => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      try {
        patchState({ subscriptionImportPreview: previewSubscriptionCatalogPack(await file.text()) });
      } catch (error) {
        patchState({ subscriptionImportPreview: result(false, "SUBSCRIPTION_CATALOG_PACK_READ_FAILED", { message: error?.message || "Unable to read pack." }) });
      }
      rerender();
    });

    container.querySelectorAll("[data-subscription-pack-apply]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = String(button.dataset.subscriptionPackApply || "MERGE").toUpperCase();
        const preview = getState().subscriptionImportPreview;
        if (!preview?.pack) return;
        if (!window.confirm(`Apply Subscription catalog pack in ${mode} mode?`)) return;
        const output = applySubscriptionCatalogPack(preview.pack, { mode });
        patchState({ subscriptionImportPreview: output.ok ? null : preview, subscriptionResult: output, subscriptionEditor: null });
        rerender();
      });
    });

    if (container.dataset.subscriptionTierActionsBound !== "true") {
      container.dataset.subscriptionTierActionsBound = "true";
      container.addEventListener("click", (event) => {
        const add = event.target?.closest?.("[data-subscription-tier-add]");
        const remove = event.target?.closest?.("[data-subscription-tier-delete]");
        const duplicate = event.target?.closest?.("[data-subscription-tier-duplicate]");
        const move = event.target?.closest?.("[data-subscription-tier-move]");

        if (add) {
          const list = add.closest("form")?.querySelector("[data-subscription-tier-list]");
          if (!list) return;
          const index = list.querySelectorAll("[data-subscription-authoring-tier]").length;
          list.insertAdjacentHTML("beforeend", renderTierEditor({ tierId: `tier-${index + 1}`, tierLevel: index + 1, label: `T${index + 1}`, amount: 0, billingCycle: "WEEKLY", durationDays: 7, active: true }, index));
          return;
        }
        if (remove) {
          remove.closest("[data-subscription-authoring-tier]")?.remove();
          return;
        }
        if (duplicate) {
          const row = duplicate.closest("[data-subscription-authoring-tier]");
          if (row) row.insertAdjacentHTML("afterend", row.outerHTML);
          return;
        }
        if (move) {
          const row = move.closest("[data-subscription-authoring-tier]");
          if (!row) return;
          if (move.dataset.subscriptionTierMove === "UP" && row.previousElementSibling?.matches?.("[data-subscription-authoring-tier]")) row.parentElement.insertBefore(row, row.previousElementSibling);
          if (move.dataset.subscriptionTierMove === "DOWN" && row.nextElementSibling?.matches?.("[data-subscription-authoring-tier]")) row.parentElement.insertBefore(row.nextElementSibling, row);
        }
      });
    }

    container.querySelector("[data-admin-subscription-authoring-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      let payload;
      try {
        payload = readDefinitionForm(event.currentTarget);
      } catch (error) {
        patchState({ subscriptionResult: result(false, "SUBSCRIPTION_DEFINITION_FORM_INVALID", { message: error?.message || "Invalid form data." }) });
        rerender();
        return;
      }
      const action = String(event.submitter?.value || "PREVIEW").toUpperCase();
      if (action === "PREVIEW") {
        const validation = validateSubscriptionDefinition(payload.definition, { mode: getState().subscriptionEditor?.mode === "EDIT" ? "UPDATE" : "CREATE" });
        patchState({ subscriptionPreview: validation, subscriptionResult: result(validation.ok, validation.ok ? "SUBSCRIPTION_DEFINITION_PREVIEW_READY" : "SUBSCRIPTION_DEFINITION_VALIDATION_FAILED", validation) });
        rerender();
        return;
      }
      if (!payload.operatorNote) {
        patchState({ subscriptionResult: result(false, "SUBSCRIPTION_OPERATOR_NOTE_REQUIRED") });
        rerender();
        return;
      }
      const mode = String(getState().subscriptionEditor?.mode || "CREATE").toUpperCase();
      const output = mode === "EDIT"
        ? updateSubscriptionDefinition(payload.sourceDefinitionId || payload.definition.subscriptionCatalogId, payload.definition, command({ ...payload, command: "UPDATE" }))
        : createSubscriptionDefinition(command({ ...payload, command: "CREATE" }));
      patchState({ selectedDefinitionId: output.ok ? output.definitionId : getState().selectedDefinitionId, subscriptionEditor: output.ok ? null : getState().subscriptionEditor, subscriptionPreview: null, subscriptionResult: output });
      rerender();
    });

    container.querySelector("[data-subscription-authoring-lifecycle]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const action = String(event.submitter?.value || "").toUpperCase();
      const definitionId = text(data.get("definitionId"));
      const input = command({ command: action, expectedRevision: Number(data.get("expectedRevision") || 0), operatorNote: text(data.get("operatorNote")) });
      let output = null;
      if (action === "ARCHIVE") output = archiveSubscriptionDefinition(definitionId, input);
      if (action === "RESTORE") output = restoreSubscriptionDefinition(definitionId, input);
      if (action === "DELETE") {
        if (!window.confirm(`Hard delete ${definitionId}? This cannot be undone.`)) return;
        output = deleteSubscriptionDefinition(definitionId, input);
      }
      patchState({ subscriptionResult: output, subscriptionEditor: null, selectedDefinitionId: action === "DELETE" && output?.ok ? "" : definitionId });
      rerender();
    });
  }

  const api = Object.freeze({
    PACK_SCHEMA_VERSION,
    getProviderRegistry,
    getDefinitionById,
    getContractReferences,
    validateSubscriptionDefinition,
    createSubscriptionDefinition,
    updateSubscriptionDefinition,
    duplicateSubscriptionDefinition,
    archiveSubscriptionDefinition,
    restoreSubscriptionDefinition,
    deleteSubscriptionDefinition,
    replaceSubscriptionCatalog,
    buildSubscriptionCatalogPack,
    serializeSubscriptionCatalogPack,
    previewSubscriptionCatalogPack,
    applySubscriptionCatalogPack,
    renderAuthoringPanel,
    bindAuthoring,
    createDefinitionTemplate
  });

  app.AdminSubscriptionCatalogAuthoring = api;
  app.getAdminSubscriptionProviderRegistry = getProviderRegistry;
  app.validateSubscriptionDefinition = validateSubscriptionDefinition;
  app.createSubscriptionDefinition = createSubscriptionDefinition;
  app.updateSubscriptionDefinition = updateSubscriptionDefinition;
  app.duplicateSubscriptionDefinition = duplicateSubscriptionDefinition;
  app.archiveSubscriptionDefinition = archiveSubscriptionDefinition;
  app.restoreSubscriptionDefinition = restoreSubscriptionDefinition;
  app.deleteSubscriptionDefinition = deleteSubscriptionDefinition;
  app.replaceSubscriptionCatalog = replaceSubscriptionCatalog;
  app.exportSubscriptionCatalogPack = buildSubscriptionCatalogPack;
  app.serializeSubscriptionCatalogPack = serializeSubscriptionCatalogPack;
  app.previewSubscriptionCatalogPack = previewSubscriptionCatalogPack;
  app.importSubscriptionCatalogPack = applySubscriptionCatalogPack;
})(window.WS_APP);
