window.WS_APP = window.WS_APP || {};

(function initAdminCatalogManagement(app) {
  "use strict";

  if (app.AdminCatalogManagement) return;

  const PACK_SCHEMA_VERSION = "future_noir_catalog_pack_1";
  const CATALOG_IDS = Object.freeze(["equipment", "cyberware", "service", "subscriptions"]);

  function clone(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function token(value) {
    return text(value).toUpperCase().replace(/[^A-Z0-9_:-]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function hashText(value = "") {
    const source = String(value || "");
    let hash = 2166136261;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function getEquipmentDefinitions() {
    const definitions = typeof app.getEquipmentCatalogItems === "function"
      ? app.getEquipmentCatalogItems({ includeArchived: true })
      : (window.APP_DATA?.equipmentCatalog || []);
    return clone(Array.isArray(definitions) ? definitions : []);
  }

  function getCyberwareDefinitions() {
    const groups = [
      ["NEUROCHIP", window.APP_DATA?.neurochips || window.APP_DATA?.neurochipCatalog?.neurochips || []],
      ["INTERFACE", window.APP_DATA?.interfaces || window.APP_DATA?.interfaceCatalog?.interfaces || []],
      ["SERVICE_PORT", window.APP_DATA?.servicePorts || window.APP_DATA?.servicePortCatalog?.servicePorts || []],
      ["BODY_CYBERWARE", window.APP_DATA?.bodyCyberware || window.APP_DATA?.bodyCyberwareCatalog?.bodyCyberware || []]
    ];
    return groups.flatMap(([catalogType, definitions]) => (Array.isArray(definitions) ? definitions : []).map((definition) => ({
      ...clone(definition),
      catalogType
    })));
  }

  function getServiceDefinitions() {
    return clone(Array.isArray(window.APP_DATA?.serviceDefinitions) ? window.APP_DATA.serviceDefinitions : []);
  }

  function getSubscriptionDefinitions() {
    if (typeof app.getSubscriptionCatalog === "function") return clone(app.getSubscriptionCatalog({ includeArchived: true, includeTestOnly: true, includeDeprecated: true }) || []);
    return clone(window.APP_DATA?.subscriptionCatalogDefinitions?.subscriptions || window.APP_DATA?.subscriptionCatalog?.subscriptions || []);
  }

  function getDefinitionId(catalogId, definition = {}) {
    if (catalogId === "service") return text(definition.serviceDefinitionId || definition.id);
    if (catalogId === "subscriptions") return text(definition.subscriptionCatalogId || definition.id);
    return text(definition.id || definition.definitionId || definition.catalogId);
  }

  function getDefinitionTitle(catalogId, definition = {}) {
    if (catalogId === "service") return text(definition.displayName || definition.title || getDefinitionId(catalogId, definition));
    if (catalogId === "subscriptions") return text(definition.title || definition.name || getDefinitionId(catalogId, definition));
    return text(definition.name || definition.displayName || definition.title || getDefinitionId(catalogId, definition));
  }

  function getDefinitions(catalogId) {
    const id = text(catalogId).toLowerCase();
    if (id === "equipment") return getEquipmentDefinitions();
    if (id === "cyberware") return getCyberwareDefinitions();
    if (id === "service") return getServiceDefinitions();
    if (id === "subscriptions") return getSubscriptionDefinitions();
    return [];
  }

  function getCatalogDescriptor(catalogId) {
    const definitions = getDefinitions(catalogId);
    const sourceMap = {
      equipment: {
        title: "Equipment Definitions",
        owner: "Equipment Catalog Store + Admin Equipment Authoring Store",
        sourceFiles: ["data/equipment-catalog.js", "js/admin-equipment-catalog-authoring.js"],
        runtimeLabel: "Equipment Runtime Instances",
        runtimeModuleId: "equipment",
        authoringStatus: "AVAILABLE_IN_ADMIN",
        authoringWorkspaceId: "catalog-management",
        authoringPatch: "patch_admin_equipment_catalog_authoring_1.0x.zip"
      },
      cyberware: {
        title: "Cyberware Definitions",
        owner: "Cyberware Catalog Data",
        sourceFiles: ["data/neurochip-catalog.js", "data/interface-catalog.js", "data/service-port-catalog.js", "data/body-cyberware-catalog.js"],
        runtimeLabel: "Cyberware Runtime / Planner",
        runtimeModuleId: "equipment",
        authoringStatus: "PLANNED",
        authoringPatch: "patch_admin_cyberware_catalog_authoring_1.0x.zip"
      },
      service: {
        title: "Service Definitions",
        owner: "Service Bridge Definitions",
        sourceFiles: ["data/service-definitions.js"],
        runtimeLabel: "Service Runtime",
        runtimeWorkspaceId: "service",
        authoringStatus: "PLANNED",
        authoringPatch: "patch_admin_service_definition_authoring_1.0x.zip"
      },
      subscriptions: {
        title: "Subscription Definitions",
        owner: "Subscription Catalog Store + Admin Subscription Authoring",
        sourceFiles: ["data/subscription-catalog.js", "js/subscription-catalog-store.js", "js/admin-subscription-catalog-authoring.js"],
        runtimeLabel: "Subscription Contracts",
        runtimeWorkspaceId: "subscriptions",
        authoringStatus: "AVAILABLE_IN_ADMIN",
        authoringWorkspaceId: "catalog-management",
        authoringPatch: "patch_subscriptions_catalog_authoring_4.8x.zip"
      }
    };
    const source = sourceMap[catalogId] || { title: catalogId, owner: "UNKNOWN", sourceFiles: [] };
    const issues = validateDefinitions(catalogId, definitions);
    const authoringRecords = catalogId === "equipment" && typeof app.getAdminEquipmentDefinitionAuthoringRecords === "function"
      ? app.getAdminEquipmentDefinitionAuthoringRecords({ includeDrafts: true, includePublished: true, includeArchived: true })
      : [];
    return {
      catalogId,
      ...source,
      definitionCount: definitions.length,
      activeCount: definitions.filter((definition) => definition.active !== false && definition.archived !== true).length,
      archivedCount: definitions.filter((definition) => definition.archived === true || definition.active === false).length,
      draftCount: authoringRecords.filter((record) => record.draftDefinition).length,
      authoredCount: authoringRecords.filter((record) => record.publishedDefinition).length,
      validationStatus: issues.some((issue) => issue.severity === "ERROR") ? "ERROR" : issues.length ? "WARNING" : "VALID",
      issueCount: issues.length,
      revision: hashText(stableStringify(definitions))
    };
  }

  function getCatalogRegistry() {
    return CATALOG_IDS.map(getCatalogDescriptor);
  }

  function validateDefinitions(catalogId, definitions = getDefinitions(catalogId)) {
    const issues = [];
    const seen = new Map();
    (Array.isArray(definitions) ? definitions : []).forEach((definition, index) => {
      if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
        issues.push({ severity: "ERROR", code: "CATALOG_DEFINITION_INVALID", catalogId, index });
        return;
      }
      const definitionId = getDefinitionId(catalogId, definition);
      if (!definitionId) {
        issues.push({ severity: "ERROR", code: "CATALOG_DEFINITION_ID_REQUIRED", catalogId, index });
        return;
      }
      if (seen.has(definitionId)) {
        issues.push({ severity: "ERROR", code: "CATALOG_DEFINITION_ID_DUPLICATE", catalogId, definitionId, firstIndex: seen.get(definitionId), index });
      } else {
        seen.set(definitionId, index);
      }
      if (!getDefinitionTitle(catalogId, definition)) {
        issues.push({ severity: "WARNING", code: "CATALOG_DEFINITION_TITLE_MISSING", catalogId, definitionId, index });
      }
      if (catalogId === "subscriptions") {
        const tierIds = new Set();
        (Array.isArray(definition.tiers) ? definition.tiers : []).forEach((tier, tierIndex) => {
          const tierId = text(tier?.tierId || tier?.id);
          if (!tierId) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_TIER_ID_REQUIRED", catalogId, definitionId, tierIndex });
          else if (tierIds.has(tierId)) issues.push({ severity: "ERROR", code: "SUBSCRIPTION_TIER_ID_DUPLICATE", catalogId, definitionId, tierId });
          else tierIds.add(tierId);
        });
      }
    });

    if (catalogId === "service") {
      const providers = Array.isArray(window.APP_DATA?.serviceProviderCapabilityManifests) ? window.APP_DATA.serviceProviderCapabilityManifests : [];
      const availableCapabilities = new Set(providers.filter((provider) => provider.active !== false).flatMap((provider) => provider.capabilities || []).map(token));
      (Array.isArray(definitions) ? definitions : []).forEach((definition) => {
        const definitionId = getDefinitionId(catalogId, definition);
        (definition.requiredCapabilities || []).map(token).filter(Boolean).forEach((capability) => {
          if (!availableCapabilities.has(capability)) issues.push({ severity: "WARNING", code: "SERVICE_CAPABILITY_PROVIDER_MISSING", catalogId, definitionId, capability });
        });
      });
    }

    return clone(issues);
  }

  function getCatalogDefinition(catalogId, definitionId) {
    const wanted = text(definitionId);
    const definition = getDefinitions(catalogId).find((item) => getDefinitionId(catalogId, item) === wanted) || null;
    return definition ? clone(definition) : null;
  }

  function searchCatalogDefinitions(catalogId, query = "") {
    const needle = text(query).toLowerCase();
    return getDefinitions(catalogId)
      .filter((definition) => {
        if (!needle) return true;
        return stableStringify({
          id: getDefinitionId(catalogId, definition),
          title: getDefinitionTitle(catalogId, definition),
          category: definition.category || definition.catalogType || definition.serviceType || definition.domain || "",
          provider: definition.provider || definition.manufacturer || definition.providerId || "",
          tags: definition.tags || []
        }).toLowerCase().includes(needle);
      })
      .map((definition) => ({
        ...clone(definition),
        _catalogId: catalogId,
        _definitionId: getDefinitionId(catalogId, definition),
        _title: getDefinitionTitle(catalogId, definition)
      }));
  }

  function buildCatalogPayload(catalogId) {
    if (catalogId === "equipment") {
      return {
        schemaVersion: "equipment_catalog_pack_1",
        definitions: getEquipmentDefinitions(),
        aliases: clone(window.APP_DATA?.equipmentDefinitionAliases || {})
      };
    }
    if (catalogId === "cyberware") {
      return {
        schemaVersion: "cyberware_catalog_pack_1",
        neurochips: clone(window.APP_DATA?.neurochips || []),
        interfaces: clone(window.APP_DATA?.interfaces || []),
        servicePorts: clone(window.APP_DATA?.servicePorts || []),
        bodyCyberware: clone(window.APP_DATA?.bodyCyberware || []),
        aliases: {
          bodyCyberware: clone(window.APP_DATA?.bodyCyberwareDefinitionAliases || {})
        }
      };
    }
    if (catalogId === "service") {
      return {
        schemaVersion: "service_definition_pack_1",
        config: clone(window.APP_DATA?.serviceBridgeConfig || {}),
        providers: clone(window.APP_DATA?.serviceProviderCapabilityManifests || []),
        definitions: getServiceDefinitions()
      };
    }
    if (catalogId === "subscriptions") {
      const stored = typeof app.getSubscriptionCatalogDefinitions === "function"
        ? app.getSubscriptionCatalogDefinitions()
        : window.APP_DATA?.subscriptionCatalogDefinitions;
      return {
        schemaVersion: text(stored?.schemaVersion || window.APP_DATA?.subscriptionCatalog?.schemaVersion || "subscription_catalog_pack_1"),
        categories: clone(window.APP_DATA?.subscriptionCatalog?.categories || []),
        providers: clone(window.APP_DATA?.subscriptionCatalog?.providers || []),
        definitions: getSubscriptionDefinitions()
      };
    }
    return { schemaVersion: "unknown", definitions: [] };
  }

  function buildDataPack(options = {}) {
    const requested = Array.isArray(options.catalogIds) && options.catalogIds.length
      ? options.catalogIds.map((id) => text(id).toLowerCase()).filter((id) => CATALOG_IDS.includes(id))
      : [...CATALOG_IDS];
    const catalogs = {};
    const revisions = {};
    requested.forEach((catalogId) => {
      const payload = buildCatalogPayload(catalogId);
      catalogs[catalogId] = payload;
      revisions[catalogId] = hashText(stableStringify(payload));
    });
    return {
      schemaVersion: PACK_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "ADMIN_CATALOG_MANAGEMENT",
      mode: "CANONICAL_EXPORT",
      catalogIds: requested,
      revisions,
      catalogs
    };
  }

  function serializeDataPack(pack = buildDataPack()) {
    return `${JSON.stringify(pack, null, 2)}\n`;
  }

  function extractPackDefinitions(catalogId, payload = {}) {
    if (catalogId === "cyberware") {
      return [
        ...(payload.neurochips || []).map((item) => ({ ...item, catalogType: "NEUROCHIP" })),
        ...(payload.interfaces || []).map((item) => ({ ...item, catalogType: "INTERFACE" })),
        ...(payload.servicePorts || []).map((item) => ({ ...item, catalogType: "SERVICE_PORT" })),
        ...(payload.bodyCyberware || []).map((item) => ({ ...item, catalogType: "BODY_CYBERWARE" }))
      ];
    }
    return Array.isArray(payload.definitions) ? payload.definitions : [];
  }

  function parseDataPack(input) {
    if (typeof input === "string") return JSON.parse(input);
    if (input && typeof input === "object") return clone(input);
    throw new TypeError("ADMIN_CATALOG_PACK_INVALID");
  }

  function previewDataPack(input) {
    let pack;
    try {
      pack = parseDataPack(input);
    } catch (error) {
      return { ok: false, status: "FAILED", resultCode: "ADMIN_CATALOG_PACK_PARSE_FAILED", message: error?.message || "Invalid JSON." };
    }
    if (text(pack.schemaVersion) !== PACK_SCHEMA_VERSION) {
      return { ok: false, status: "FAILED", resultCode: "ADMIN_CATALOG_PACK_SCHEMA_UNSUPPORTED", expectedSchemaVersion: PACK_SCHEMA_VERSION, actualSchemaVersion: text(pack.schemaVersion) };
    }
    const summaries = [];
    const issues = [];
    const catalogIds = Array.isArray(pack.catalogIds) ? pack.catalogIds : Object.keys(pack.catalogs || {});
    catalogIds.forEach((rawCatalogId) => {
      const catalogId = text(rawCatalogId).toLowerCase();
      if (!CATALOG_IDS.includes(catalogId)) {
        issues.push({ severity: "ERROR", code: "ADMIN_CATALOG_PACK_CATALOG_UNSUPPORTED", catalogId });
        return;
      }
      const incoming = extractPackDefinitions(catalogId, pack.catalogs?.[catalogId] || {});
      const validationIssues = validateDefinitions(catalogId, incoming);
      issues.push(...validationIssues);
      const current = getDefinitions(catalogId);
      const currentById = new Map(current.map((definition) => [getDefinitionId(catalogId, definition), definition]));
      const incomingById = new Map(incoming.map((definition) => [getDefinitionId(catalogId, definition), definition]));
      let added = 0;
      let changed = 0;
      let unchanged = 0;
      incomingById.forEach((definition, definitionId) => {
        if (!currentById.has(definitionId)) added += 1;
        else if (stableStringify(currentById.get(definitionId)) === stableStringify(definition)) unchanged += 1;
        else changed += 1;
      });
      let missing = 0;
      currentById.forEach((_definition, definitionId) => {
        if (!incomingById.has(definitionId)) missing += 1;
      });
      summaries.push({ catalogId, incomingCount: incoming.length, currentCount: current.length, added, changed, unchanged, missing, issueCount: validationIssues.length });
    });
    const hasErrors = issues.some((issue) => issue.severity === "ERROR");
    return {
      ok: !hasErrors,
      status: hasErrors ? "FAILED" : "SUCCEEDED",
      resultCode: hasErrors ? "ADMIN_CATALOG_PACK_VALIDATION_FAILED" : "ADMIN_CATALOG_PACK_PREVIEW_READY",
      schemaVersion: pack.schemaVersion,
      generatedAt: pack.generatedAt || null,
      summaries,
      issues,
      canApply: false,
      applyResultCode: "ADMIN_CATALOG_PACK_APPLY_REQUIRES_DOMAIN_AUTHORING",
      pack: clone(pack)
    };
  }

  app.AdminCatalogManagement = Object.freeze({
    PACK_SCHEMA_VERSION,
    CATALOG_IDS: [...CATALOG_IDS],
    getCatalogRegistry,
    getCatalogDescriptor,
    getDefinitions,
    getCatalogDefinition,
    searchCatalogDefinitions,
    validateDefinitions,
    getDefinitionId,
    getDefinitionTitle,
    buildDataPack,
    serializeDataPack,
    previewDataPack
  });

  app.getAdminCatalogRegistry = getCatalogRegistry;
  app.getAdminCatalogDefinitions = getDefinitions;
  app.getAdminCatalogDefinition = getCatalogDefinition;
  app.searchAdminCatalogDefinitions = searchCatalogDefinitions;
  app.validateAdminCatalogDefinitions = validateDefinitions;
  app.buildAdminCatalogDataPack = buildDataPack;
  app.serializeAdminCatalogDataPack = serializeDataPack;
  app.previewAdminCatalogDataPack = previewDataPack;
})(window.WS_APP);
