window.WS_APP = window.WS_APP || {};
window.TerminalNotifications = window.TerminalNotifications || {};

(function initNotificationRegistry() {
  const eventMap = new Map();
  const providerMap = new Map();
  const diagnostics = [];

  const clone = window.WS_APP.storeUtils?.clone || ((value) => JSON.parse(JSON.stringify(value)));

  function normalizeKey(value = "") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeToken(value = "", fallback = "") {
    const normalized = String(value || fallback)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return normalized || fallback;
  }

  function normalizeEventCode(value = "") {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9.]+/g, "_")
      .replace(/^[_\.]+|[_\.]+$/g, "")
      .replace(/\.{2,}/g, ".");
  }

  function pushDiagnostic(level, code, detail = {}) {
    const record = {
      level: normalizeToken(level, "WARNING"),
      code: normalizeToken(code, "NOTIFICATION_REGISTRY_WARNING"),
      detail: clone(detail),
      at: new Date().toISOString()
    };
    diagnostics.push(record);
    if (diagnostics.length > 500) diagnostics.splice(0, diagnostics.length - 500);
    return record;
  }

  function normalizeAggregationPolicy(policy = {}) {
    const source = policy && typeof policy === "object" && !Array.isArray(policy) ? policy : {};
    const mode = normalizeToken(source.mode, "CREATE_ALWAYS");
    const allowedModes = [
      "CREATE_ALWAYS",
      "REPLACE_EXISTING",
      "APPEND_TO_EXISTING",
      "AGGREGATE_WINDOW",
      "SILENT_LOG_ONLY",
      "IGNORE_DUPLICATE"
    ];
    return {
      mode: allowedModes.includes(mode) ? mode : "CREATE_ALWAYS",
      keyFields: Array.isArray(source.keyFields)
        ? source.keyFields.map((field) => String(field || "").trim()).filter(Boolean)
        : [],
      windowMs: Math.max(0, Number(source.windowMs || 0) || 0)
    };
  }

  function normalizeRetentionPolicy(policy = {}) {
    const source = policy && typeof policy === "object" && !Array.isArray(policy) ? policy : {};
    const mode = normalizeToken(source.mode, "FIXED_AGE");
    const allowedModes = [
      "TRANSIENT",
      "FIXED_AGE",
      "UNTIL_READ",
      "UNTIL_ACKNOWLEDGED",
      "UNTIL_RESOLVED",
      "PERMANENT_AUDIT"
    ];
    return {
      mode: allowedModes.includes(mode) ? mode : "FIXED_AGE",
      maxAgeDays: Math.max(0, Number(source.maxAgeDays || 0) || 0)
    };
  }

  function normalizeAudience(value) {
    const raw = Array.isArray(value) ? value : [value || "PLAYER"];
    const allowed = new Set(["PLAYER", "ADMIN", "BOTH", "SYSTEM_ONLY"]);
    const normalized = raw
      .map((item) => normalizeToken(item, "PLAYER"))
      .map((item) => item === "INTERNAL" ? "SYSTEM_ONLY" : item)
      .filter((item) => allowed.has(item));
    return [...new Set(normalized.length ? normalized : ["PLAYER"])];
  }

  function normalizeEventDefinition(definition = {}, source = "RUNTIME") {
    const eventCode = normalizeEventCode(definition.eventCode || definition.id);
    const domain = normalizeToken(definition.domain || definition.legacyType || eventCode.split(".")[0], "SYSTEM");
    const defaultSeverity = normalizeToken(definition.defaultSeverity || definition.severity, "INFO");
    const defaultAttention = normalizeToken(definition.defaultAttention, defaultSeverity === "CRITICAL" ? "BLOCKING" : "INBOX");
    const legacyType = normalizeToken(definition.legacyType || domain, "SYSTEM");
    const legacySubtype = normalizeToken(definition.legacySubtype || (eventCode.includes(".") ? "SYSTEM_NOTICE" : eventCode), "SYSTEM_NOTICE");

    return {
      ...clone(definition),
      eventCode,
      schemaVersion: Math.max(1, Number(definition.schemaVersion || 1) || 1),
      domain,
      category: normalizeToken(definition.category || domain, domain),
      label: String(definition.label || eventCode || "Notification event").trim(),
      defaultSeverity: ["INFO", "NOTICE", "WARNING", "CRITICAL"].includes(defaultSeverity) ? defaultSeverity : "INFO",
      defaultAttention: ["SILENT", "BADGE", "INBOX", "BANNER", "BLOCKING"].includes(defaultAttention) ? defaultAttention : "INBOX",
      defaultAudience: normalizeAudience(definition.defaultAudience),
      providerRequired: definition.providerRequired === true,
      playerVisible: definition.playerVisible !== false,
      subjectTypes: Array.isArray(definition.subjectTypes)
        ? definition.subjectTypes.map((item) => normalizeToken(item, "")).filter(Boolean)
        : [],
      requiredData: Array.isArray(definition.requiredData)
        ? definition.requiredData.map((item) => String(item || "").trim()).filter(Boolean)
        : [],
      legacyType,
      legacySubtype,
      aggregationPolicy: normalizeAggregationPolicy(definition.aggregationPolicy),
      retentionPolicy: normalizeRetentionPolicy(definition.retentionPolicy),
      source: String(source || "RUNTIME").trim().toUpperCase()
    };
  }

  function registerEvents(definitions = [], options = {}) {
    const records = Array.isArray(definitions) ? definitions : [definitions];
    const results = [];

    records.forEach((definition) => {
      const normalized = normalizeEventDefinition(definition, options.source || "RUNTIME");
      if (!normalized.eventCode) {
        results.push({ ok: false, code: "EVENT_CODE_REQUIRED" });
        pushDiagnostic("ERROR", "EVENT_CODE_REQUIRED", { definition });
        return;
      }

      const existing = eventMap.get(normalized.eventCode);
      if (existing && options.replace !== true) {
        results.push({ ok: false, code: "EVENT_CODE_DUPLICATE", eventCode: normalized.eventCode });
        pushDiagnostic("ERROR", "EVENT_CODE_DUPLICATE", { eventCode: normalized.eventCode });
        return;
      }

      eventMap.set(normalized.eventCode, normalized);
      results.push({ ok: true, eventCode: normalized.eventCode });
    });

    return results;
  }

  function normalizeProviderManifest(manifest = {}) {
    const providerId = normalizeKey(manifest.providerId || manifest.id);
    return {
      ...clone(manifest),
      providerId,
      organizationId: String(manifest.organizationId || "").trim(),
      sourceKind: normalizeToken(manifest.sourceKind, manifest.organizationId ? "ORGANIZATION" : "SYSTEM_PROCESS"),
      schemaVersion: Math.max(1, Number(manifest.schemaVersion || 1) || 1),
      revision: Math.max(1, Number(manifest.revision || 1) || 1),
      supportedEvents: Array.isArray(manifest.supportedEvents)
        ? manifest.supportedEvents.map(normalizeEventCode).filter(Boolean)
        : [],
      supportedDomains: Array.isArray(manifest.supportedDomains)
        ? manifest.supportedDomains.map((item) => normalizeToken(item, "")).filter(Boolean)
        : [],
      supportedEventPrefixes: Array.isArray(manifest.supportedEventPrefixes)
        ? manifest.supportedEventPrefixes.map(normalizeEventCode).filter(Boolean)
        : [],
      eventOverrides: manifest.eventOverrides && typeof manifest.eventOverrides === "object" && !Array.isArray(manifest.eventOverrides)
        ? clone(manifest.eventOverrides)
        : {},
      active: manifest.active !== false
    };
  }

  function registerProvider(manifest = {}, options = {}) {
    const normalized = normalizeProviderManifest(manifest);
    if (!normalized.providerId) {
      pushDiagnostic("ERROR", "PROVIDER_ID_REQUIRED", { manifest });
      return { ok: false, code: "PROVIDER_ID_REQUIRED" };
    }

    const existing = providerMap.get(normalized.providerId);
    if (existing && options.replace !== true) {
      pushDiagnostic("ERROR", "PROVIDER_ID_DUPLICATE", { providerId: normalized.providerId });
      return { ok: false, code: "PROVIDER_ID_DUPLICATE", providerId: normalized.providerId };
    }

    providerMap.set(normalized.providerId, normalized);
    return { ok: true, providerId: normalized.providerId };
  }

  function findManifestForOrganization(organizationId = "") {
    const id = String(organizationId || "").trim();
    if (!id) return null;
    return [...providerMap.values()].find((manifest) => manifest.organizationId === id && manifest.active) || null;
  }

  function resolveProvider(providerIdOrAlias = "") {
    const key = normalizeKey(providerIdOrAlias);
    if (!key) return null;

    const direct = providerMap.get(key);
    if (direct?.active) {
      const organization = direct.organizationId
        ? window.WS_APP.getOrganizationById?.(direct.organizationId)
        : null;
      return {
        manifest: clone(direct),
        providerId: direct.providerId,
        organization: organization ? clone(organization) : null
      };
    }

    const organization = window.WS_APP.getOrganizationByProviderId?.(key)
      || window.WS_APP.findOrganization?.(key)
      || null;
    if (!organization) return null;

    const manifest = findManifestForOrganization(organization.id);
    if (!manifest) return null;

    return {
      manifest: clone(manifest),
      providerId: manifest.providerId,
      requestedProviderId: key,
      organization: clone(organization)
    };
  }

  function providerSupportsEvent(providerResolution, eventDefinition) {
    const manifest = providerResolution?.manifest;
    if (!manifest || !eventDefinition || manifest.active === false) return false;
    if (manifest.supportedEvents.includes(eventDefinition.eventCode)) return true;
    if (manifest.supportedDomains.includes(eventDefinition.domain)) return true;
    return manifest.supportedEventPrefixes.some((prefix) => eventDefinition.eventCode.startsWith(prefix));
  }

  function getEvent(eventCode = "") {
    const record = eventMap.get(normalizeEventCode(eventCode));
    return record ? clone(record) : null;
  }

  function getProvider(providerId = "") {
    const record = providerMap.get(normalizeKey(providerId));
    return record ? clone(record) : null;
  }

  function getEvents() {
    return [...eventMap.values()].map(clone);
  }

  function getProviders() {
    return [...providerMap.values()].map(clone);
  }

  function validateRegistry() {
    const errors = [];
    const warnings = [];

    eventMap.forEach((event) => {
      if (!event.eventCode) errors.push({ code: "EVENT_CODE_REQUIRED" });
      if (!event.domain) errors.push({ code: "EVENT_DOMAIN_REQUIRED", eventCode: event.eventCode });
      if (event.providerRequired && !getProviders().some((provider) => providerSupportsEvent({ manifest: provider }, event))) {
        warnings.push({ code: "EVENT_HAS_NO_PROVIDER", eventCode: event.eventCode });
      }
    });

    providerMap.forEach((provider) => {
      if (provider.organizationId && !window.WS_APP.getOrganizationById?.(provider.organizationId)) {
        errors.push({
          code: "PROVIDER_ORGANIZATION_UNKNOWN",
          providerId: provider.providerId,
          organizationId: provider.organizationId
        });
      }
      provider.supportedEvents.forEach((eventCode) => {
        if (!eventMap.has(eventCode)) {
          errors.push({ code: "PROVIDER_EVENT_UNKNOWN", providerId: provider.providerId, eventCode });
        }
      });
    });

    return {
      ok: errors.length === 0,
      counts: {
        events: eventMap.size,
        providers: providerMap.size,
        errors: errors.length,
        warnings: warnings.length
      },
      errors,
      warnings
    };
  }

  function registerLegacyCatalog() {
    const definitions = Array.isArray(window.APP_DATA?.inboxNotificationTypes)
      ? window.APP_DATA.inboxNotificationTypes
      : [];

    const legacyEvents = [];
    definitions.forEach((typeDefinition) => {
      const legacyType = normalizeToken(typeDefinition?.id, "SYSTEM");
      (Array.isArray(typeDefinition?.subtypes) ? typeDefinition.subtypes : []).forEach((subtypeDefinition) => {
        const legacySubtype = normalizeToken(subtypeDefinition?.id, "");
        if (!legacySubtype) return;
        legacyEvents.push({
          eventCode: legacySubtype,
          domain: legacyType,
          category: legacyType,
          label: subtypeDefinition?.label || legacySubtype,
          defaultSeverity: subtypeDefinition?.severity || typeDefinition?.defaultSeverity || "INFO",
          defaultAttention: subtypeDefinition?.severity === "CRITICAL" ? "BLOCKING" : "INBOX",
          defaultAudience: subtypeDefinition?.playerVisible === false ? ["SYSTEM_ONLY"] : ["PLAYER"],
          providerRequired: false,
          playerVisible: subtypeDefinition?.playerVisible !== false,
          legacyType,
          legacySubtype,
          aggregationPolicy: { mode: "CREATE_ALWAYS" },
          retentionPolicy: { mode: subtypeDefinition?.playerVisible === false ? "TRANSIENT" : "FIXED_AGE", maxAgeDays: 180 }
        });
      });
    });

    registerEvents(legacyEvents, { source: "LEGACY_CATALOG" });
  }

  registerLegacyCatalog();
  registerEvents(window.APP_DATA?.notificationEventCatalog || [], { source: "BRIDGE_CATALOG" });
  (window.APP_DATA?.notificationProviderCapabilities || []).forEach((manifest) => registerProvider(manifest));

  const registry = {
    normalizeEventCode,
    normalizeAudience,
    registerEvents,
    registerProvider,
    getEvent,
    getEvents,
    getProvider,
    getProviders,
    resolveProvider,
    providerSupportsEvent,
    validateRegistry,
    getDiagnostics: () => clone(diagnostics),
    pushDiagnostic
  };

  window.WS_APP.notificationRegistry = registry;
  window.WS_APP.reportNotificationDiagnostic = pushDiagnostic;

  window.TerminalNotifications.registerEvents = registerEvents;
  window.TerminalNotifications.registerProvider = registerProvider;
  window.TerminalNotifications.validateRegistry = validateRegistry;
  window.TerminalNotifications.getDiagnostics = registry.getDiagnostics;
})();
