(function initFirmwareRegistry() {
  window.WS_APP = window.WS_APP || {};
  const app = window.WS_APP;

  const API_VERSION = "firmware_registry_1_0x";
  const CHANNELS = new Set(["STABLE", "SECURITY", "BETA", "LEGACY"]);
  const SECURITY_SEVERITIES = new Set(["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]);
  const BLOCKED_LIFECYCLE_STATES = new Set(["DESTROYED", "DISPOSED"]);

  let registryRevision = 0;
  let productIndex = new Map();
  let releaseIndex = new Map();
  let productIdByDefinitionId = new Map();
  let releaseIdsByProductId = new Map();
  let initializationReport = null;

  function clone(value) {
    if (value === undefined) return undefined;
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value));
    }
  }

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function token(value = "") {
    return String(value || "")
      .trim()
      .replace(/[\s-]+/g, "_")
      .replace(/[^A-Za-z0-9_:.]/g, "")
      .toUpperCase();
  }

  function uniqueIds(value = []) {
    const source = Array.isArray(value) ? value : [value];
    return [...new Set(source.map(normalizeId).filter(Boolean))];
  }

  function uniqueTokens(value = []) {
    const source = Array.isArray(value) ? value : [value];
    return [...new Set(source.map(token).filter(Boolean))];
  }

  function normalizeChannel(value = "STABLE") {
    const resolved = token(value || "STABLE");
    return CHANNELS.has(resolved) ? resolved : "STABLE";
  }

  function parseVersion(value = "") {
    return String(value || "")
      .trim()
      .split(/[^0-9]+/)
      .filter(Boolean)
      .slice(0, 6)
      .map((part) => Number(part) || 0);
  }

  function compareFirmwareVersions(left = "", right = "") {
    const a = parseVersion(left);
    const b = parseVersion(right);
    const length = Math.max(a.length, b.length, 1);
    for (let index = 0; index < length; index += 1) {
      const delta = Number(a[index] || 0) - Number(b[index] || 0);
      if (delta) return delta > 0 ? 1 : -1;
    }
    return 0;
  }

  function normalizeProduct(source = {}, index = 0) {
    const firmwareProductId = normalizeId(source.firmwareProductId || source.id || `fw-product-${index + 1}`);
    const providerId = normalizeId(source.providerId);
    const supportedDefinitionIds = uniqueIds(source.supportedDefinitionIds);
    return {
      firmwareProductId,
      providerId,
      displayName: String(source.displayName || source.name || firmwareProductId || "Firmware Product").trim(),
      defaultChannel: normalizeChannel(source.defaultChannel || "STABLE"),
      supportedDefinitionIds,
      authorizedServiceProviderIds: uniqueIds(source.authorizedServiceProviderIds),
      preferredServiceProviderId: normalizeId(source.preferredServiceProviderId),
      entitlementProviderId: normalizeId(source.entitlementProviderId || providerId),
      requiredEntitlementCodes: uniqueTokens(source.requiredEntitlementCodes),
      enforceInstalledFirmware: source.enforceInstalledFirmware === true,
      active: source.active !== false,
      revision: Math.max(1, Math.round(Number(source.revision || 1))),
      metadata: source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
        ? clone(source.metadata)
        : {}
    };
  }

  function normalizeRelease(source = {}, index = 0) {
    const compatibilitySource = source.compatibility && typeof source.compatibility === "object" && !Array.isArray(source.compatibility)
      ? source.compatibility
      : {};
    return {
      firmwareReleaseId: normalizeId(source.firmwareReleaseId || source.id || `fw-release-${index + 1}`),
      firmwareProductId: normalizeId(source.firmwareProductId),
      version: String(source.version || "0.0.0").trim(),
      channel: normalizeChannel(source.channel || "STABLE"),
      releasedAt: String(source.releasedAt || "").trim(),
      mandatory: source.mandatory === true,
      securitySeverity: SECURITY_SEVERITIES.has(token(source.securitySeverity)) ? token(source.securitySeverity) : "NONE",
      compatibility: {
        supportedDefinitionIds: uniqueIds(compatibilitySource.supportedDefinitionIds),
        minimumItemSchemaVersion: Math.max(0, Math.round(Number(compatibilitySource.minimumItemSchemaVersion || 0))),
        requiredTags: uniqueTokens(compatibilitySource.requiredTags),
        blockedLifecycleStates: uniqueTokens(compatibilitySource.blockedLifecycleStates)
      },
      requiredEntitlementCodes: uniqueTokens(source.requiredEntitlementCodes),
      entitlementProviderId: normalizeId(source.entitlementProviderId),
      supersedesReleaseIds: uniqueIds(source.supersedesReleaseIds),
      active: source.active !== false,
      revision: Math.max(1, Math.round(Number(source.revision || 1))),
      metadata: source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata)
        ? clone(source.metadata)
        : {}
    };
  }

  function addToMultiIndex(index, key, value) {
    if (!key || !value) return;
    const current = index.get(key) || [];
    if (!current.includes(value)) index.set(key, [...current, value]);
  }

  function rebuildFirmwareRegistryIndexes() {
    const source = window.APP_DATA?.firmwareRegistry || {};
    const products = Array.isArray(source.products) ? source.products.map(normalizeProduct).filter((entry) => entry.firmwareProductId) : [];
    const releases = Array.isArray(source.releases) ? source.releases.map(normalizeRelease).filter((entry) => entry.firmwareReleaseId) : [];

    productIndex = new Map();
    releaseIndex = new Map();
    productIdByDefinitionId = new Map();
    releaseIdsByProductId = new Map();

    products.forEach((product) => {
      if (!productIndex.has(product.firmwareProductId)) productIndex.set(product.firmwareProductId, product);
      product.supportedDefinitionIds.forEach((definitionId) => {
        if (!productIdByDefinitionId.has(definitionId)) productIdByDefinitionId.set(definitionId, product.firmwareProductId);
      });
    });

    releases.forEach((release) => {
      if (!releaseIndex.has(release.firmwareReleaseId)) releaseIndex.set(release.firmwareReleaseId, release);
      addToMultiIndex(releaseIdsByProductId, release.firmwareProductId, release.firmwareReleaseId);
    });

    registryRevision = Math.max(1, Math.round(Number(source.registryRevision || 1)));
    initializationReport = validateFirmwareRegistry({ rawSource: source });
    return getFirmwareRegistryDiagnostics();
  }

  function getFirmwareProduct(firmwareProductId = "") {
    const record = productIndex.get(normalizeId(firmwareProductId)) || null;
    return record ? clone(record) : null;
  }

  function getFirmwareRelease(firmwareReleaseId = "") {
    const record = releaseIndex.get(normalizeId(firmwareReleaseId)) || null;
    return record ? clone(record) : null;
  }

  function getFirmwareProducts(filters = {}) {
    const providerId = normalizeId(filters.providerId);
    const includeInactive = filters.includeInactive === true;
    return Array.from(productIndex.values())
      .filter((product) => includeInactive || product.active)
      .filter((product) => !providerId || product.providerId === providerId)
      .map(clone);
  }

  function getFirmwareProductForDefinition(definitionId = "") {
    const productId = productIdByDefinitionId.get(normalizeId(definitionId)) || "";
    return productId ? getFirmwareProduct(productId) : null;
  }

  function getFirmwareReleasesForProduct(firmwareProductId = "", filters = {}) {
    const productId = normalizeId(firmwareProductId);
    const channel = filters.channel ? normalizeChannel(filters.channel) : "";
    const includeInactive = filters.includeInactive === true;
    return (releaseIdsByProductId.get(productId) || [])
      .map((releaseId) => releaseIndex.get(releaseId))
      .filter(Boolean)
      .filter((release) => includeInactive || release.active)
      .filter((release) => !channel || release.channel === channel)
      .sort((left, right) => {
        const versionDelta = compareFirmwareVersions(right.version, left.version);
        if (versionDelta) return versionDelta;
        return String(right.releasedAt || "").localeCompare(String(left.releasedAt || ""));
      })
      .map(clone);
  }

  function getItemContext(instanceOrId = {}) {
    const requestedId = typeof instanceOrId === "string"
      ? normalizeId(instanceOrId)
      : normalizeId(instanceOrId?.instanceId || instanceOrId?.id);
    const raw = requestedId && typeof app.getItemInstanceById === "function"
      ? app.getItemInstanceById(requestedId)
      : instanceOrId && typeof instanceOrId === "object"
        ? clone(instanceOrId)
        : null;
    if (!raw) return null;
    const instanceId = normalizeId(raw.instanceId || raw.id || requestedId);
    const view = instanceId && typeof app.getItemInstanceView === "function" ? app.getItemInstanceView(instanceId) : null;
    const definitionId = normalizeId(raw.definitionId || view?.definitionId || raw.instanceData?.id || view?.id);
    const tags = uniqueTokens([...(raw.instanceData?.tags || []), ...(view?.tags || [])]);
    return {
      instanceId,
      definitionId,
      raw,
      view: view || raw.instanceData || raw,
      ownerId: normalizeId(raw.ownerId || view?.ownerId),
      lifecycleState: token(raw.lifecycleState || view?.lifecycleState),
      schemaVersion: Math.max(0, Math.round(Number(raw.schemaVersion || 0))),
      tags
    };
  }

  function isReleaseCompatibleWithContext(release = {}, product = {}, context = null) {
    if (!context || !release || !product) return false;
    if (!product.supportedDefinitionIds.includes(context.definitionId)) return false;
    const releaseDefinitions = release.compatibility?.supportedDefinitionIds || [];
    if (releaseDefinitions.length && !releaseDefinitions.includes(context.definitionId)) return false;
    const minimumSchema = Number(release.compatibility?.minimumItemSchemaVersion || 0);
    if (minimumSchema > 0 && Number(context.schemaVersion || 0) < minimumSchema) return false;
    const requiredTags = release.compatibility?.requiredTags || [];
    if (requiredTags.some((requiredTag) => !context.tags.includes(requiredTag))) return false;
    const blockedStates = new Set([...(release.compatibility?.blockedLifecycleStates || []), ...BLOCKED_LIFECYCLE_STATES]);
    if (blockedStates.has(context.lifecycleState)) return false;
    return true;
  }

  function getLatestCompatibleFirmware(instanceOrId = {}, options = {}) {
    const context = getItemContext(instanceOrId);
    if (!context) return null;
    const product = getFirmwareProductForDefinition(context.definitionId);
    if (!product || !product.active) return null;
    const channel = normalizeChannel(options.channel || product.defaultChannel || "STABLE");
    const release = getFirmwareReleasesForProduct(product.firmwareProductId, { channel })
      .find((entry) => isReleaseCompatibleWithContext(entry, product, context)) || null;
    return release ? clone(release) : null;
  }

  function getInstalledFirmwareRecords(context = null) {
    if (!context) return [];
    const source = context.raw?.cyberwareState?.installedFirmware || context.view?.cyberwareState?.installedFirmware || [];
    return (Array.isArray(source) ? source : []).filter(Boolean).map((entry, index) => ({
      id: normalizeId(entry.id || entry.releaseId || `installed-firmware-${index + 1}`),
      releaseId: normalizeId(entry.releaseId),
      channel: normalizeChannel(entry.channel || entry.firmwareChannel || "STABLE"),
      version: String(entry.version || entry.firmwareVersion || "").trim(),
      status: token(entry.status || "CURRENT"),
      installedAt: String(entry.installedAt || entry.updatedAt || "").trim(),
      source: String(entry.source || "").trim()
    }));
  }

  function resolveInstalledRelease(context = null, product = null, channel = "STABLE") {
    if (!context || !product) return { record: null, release: null };
    const canonicalRef = normalizeId(context.raw?.authorizationRefs?.firmwareReleaseId || context.view?.authorizationRefs?.firmwareReleaseId);
    const referenced = canonicalRef ? releaseIndex.get(canonicalRef) || null : null;
    if (referenced?.firmwareProductId === product.firmwareProductId) {
      const record = getInstalledFirmwareRecords(context).find((entry) => entry.releaseId === canonicalRef) || null;
      return { record, release: clone(referenced) };
    }

    const records = getInstalledFirmwareRecords(context);
    const record = records.find((entry) => entry.channel === channel) || records[0] || null;
    if (!record) return { record: null, release: null };
    const release = getFirmwareReleasesForProduct(product.firmwareProductId, { channel: record.channel, includeInactive: true })
      .find((entry) => entry.version === record.version) || null;
    return { record: clone(record), release: release ? clone(release) : null };
  }

  function getFirmwareStateForItem(instanceOrView = {}, options = {}) {
    const context = getItemContext(instanceOrView);
    if (!context) return { registryResolved: false, required: false, status: "NOT_FOUND", valid: false, warning: false, reason: "ITEM_INSTANCE_NOT_FOUND" };
    const product = getFirmwareProductForDefinition(context.definitionId);
    if (!product) return { registryResolved: false };

    const channel = normalizeChannel(options.channel || product.defaultChannel || "STABLE");
    const latestRelease = getLatestCompatibleFirmware(context.raw, { channel });
    const installed = resolveInstalledRelease(context, product, channel);
    const legacyVersion = String(context.view?.firmwareVersion || context.view?.currentFirmwareVersion || "").trim();
    const version = String(installed.record?.version || installed.release?.version || legacyVersion || "").trim();
    const explicitStatus = token(installed.record?.status || context.view?.firmwareStatus || "");
    const required = context.view?.firmwareRequired === true || product.enforceInstalledFirmware === true;
    const latestVersion = String(latestRelease?.version || version || "").trim();
    const mandatory = latestRelease?.mandatory === true;

    if (!required) {
      return {
        registryResolved: true,
        required: false,
        channel,
        status: "NOT_REQUIRED",
        valid: true,
        warning: false,
        version,
        latestVersion,
        mandatory: false,
        record: installed.record,
        firmwareProductId: product.firmwareProductId,
        firmwareReleaseId: installed.release?.firmwareReleaseId || "",
        latestFirmwareReleaseId: latestRelease?.firmwareReleaseId || "",
        reason: "FIRMWARE_NOT_REQUIRED"
      };
    }

    let status = explicitStatus || (version ? "CURRENT" : "MISSING");
    if (["CORRUPTED", "BLOCKED"].includes(status)) {
      return {
        registryResolved: true,
        required: true,
        channel,
        status,
        valid: false,
        warning: false,
        version,
        latestVersion,
        mandatory,
        record: installed.record,
        firmwareProductId: product.firmwareProductId,
        firmwareReleaseId: installed.release?.firmwareReleaseId || "",
        latestFirmwareReleaseId: latestRelease?.firmwareReleaseId || "",
        reason: `FIRMWARE_${status}`
      };
    }

    if (!version) status = "MISSING";
    else if (latestVersion && compareFirmwareVersions(version, latestVersion) < 0) status = mandatory ? "OUTDATED" : "UPDATE_AVAILABLE";
    else status = "CURRENT";

    const blocked = ["MISSING", "OUTDATED", "CORRUPTED", "BLOCKED"].includes(status);
    return {
      registryResolved: true,
      required: true,
      channel,
      status,
      valid: !blocked,
      warning: status === "UPDATE_AVAILABLE",
      version,
      latestVersion,
      mandatory,
      record: installed.record,
      firmwareProductId: product.firmwareProductId,
      firmwareReleaseId: installed.release?.firmwareReleaseId || "",
      latestFirmwareReleaseId: latestRelease?.firmwareReleaseId || "",
      latestRelease,
      reason: blocked ? `FIRMWARE_${status}` : status === "UPDATE_AVAILABLE" ? "FIRMWARE_UPDATE_AVAILABLE" : "FIRMWARE_CURRENT"
    };
  }

  function resolveRequiredEntitlements({ citizenId, instanceId, product, release, providerId, atTime }) {
    const codes = release.requiredEntitlementCodes.length ? release.requiredEntitlementCodes : product.requiredEntitlementCodes;
    if (!codes.length) return [];
    const entitlementProviderId = normalizeId(release.entitlementProviderId || product.entitlementProviderId || providerId || product.providerId);
    return codes.map((entitlementCode) => {
      if (typeof app.resolveSubscriptionEntitlement !== "function") {
        return { entitlementCode, allowed: false, status: "NOT_FOUND", reason: "ENTITLEMENT_RESOLVER_UNAVAILABLE", providerId: entitlementProviderId };
      }
      const itemResult = app.resolveSubscriptionEntitlement({
        citizenId,
        providerId: entitlementProviderId,
        entitlementCode,
        targetType: "ITEM_INSTANCE",
        targetId: instanceId,
        atTime
      });
      if (itemResult?.allowed === true) return { entitlementCode, allowed: true, targetType: "ITEM_INSTANCE", result: clone(itemResult) };
      const citizenResult = app.resolveSubscriptionEntitlement({
        citizenId,
        providerId: entitlementProviderId,
        entitlementCode,
        targetType: "CITIZEN",
        targetId: citizenId,
        atTime
      });
      return {
        entitlementCode,
        allowed: citizenResult?.allowed === true,
        targetType: citizenResult?.allowed === true ? "CITIZEN" : "NONE",
        itemResult: clone(itemResult),
        result: clone(citizenResult)
      };
    });
  }

  function resolveFirmwareEligibility(input = {}) {
    const citizenId = normalizeId(input.citizenId);
    const instanceId = normalizeId(input.instanceId || input.itemInstanceId);
    const context = getItemContext(instanceId);
    const blockers = [];
    const warnings = [];

    if (!citizenId) blockers.push("CITIZEN_ID_REQUIRED");
    if (!context) blockers.push("ITEM_INSTANCE_NOT_FOUND");
    if (context && citizenId && context.ownerId !== citizenId) blockers.push("ITEM_INSTANCE_OWNER_MISMATCH");
    if (context && BLOCKED_LIFECYCLE_STATES.has(context.lifecycleState)) blockers.push(`ITEM_INSTANCE_${context.lifecycleState}`);

    const product = context ? getFirmwareProductForDefinition(context.definitionId) : null;
    if (context && !product) blockers.push("FIRMWARE_PRODUCT_NOT_FOUND");
    if (product && !product.active) blockers.push("FIRMWARE_PRODUCT_INACTIVE");

    const requestedReleaseId = normalizeId(input.firmwareReleaseId || input.releaseId);
    const release = requestedReleaseId
      ? getFirmwareRelease(requestedReleaseId)
      : context && product
        ? getLatestCompatibleFirmware(context.raw, { channel: input.channel || product.defaultChannel })
        : null;
    if (!release) blockers.push(requestedReleaseId ? "FIRMWARE_RELEASE_NOT_FOUND" : "COMPATIBLE_FIRMWARE_RELEASE_NOT_FOUND");
    if (release && product && release.firmwareProductId !== product.firmwareProductId) blockers.push("FIRMWARE_PRODUCT_RELEASE_MISMATCH");
    if (release && !release.active) blockers.push("FIRMWARE_RELEASE_INACTIVE");
    if (release && product && context && !isReleaseCompatibleWithContext(release, product, context)) blockers.push("FIRMWARE_RELEASE_INCOMPATIBLE");

    const selectedProviderId = normalizeId(
      input.providerId
      || product?.preferredServiceProviderId
      || product?.authorizedServiceProviderIds?.[0]
      || product?.providerId
    );
    if (product && selectedProviderId) {
      if (product.authorizedServiceProviderIds.length && !product.authorizedServiceProviderIds.includes(selectedProviderId)) {
        blockers.push("FIRMWARE_SERVICE_PROVIDER_NOT_AUTHORIZED");
      }
      if (typeof app.getProvider === "function" && !app.getProvider(selectedProviderId)) blockers.push("FIRMWARE_SERVICE_PROVIDER_NOT_FOUND");
      if (typeof app.providerSupports === "function" && !app.providerSupports(selectedProviderId, "FIRMWARE_UPDATE")) {
        blockers.push("FIRMWARE_UPDATE_CAPABILITY_MISSING");
      }
    }

    const installed = context && product ? resolveInstalledRelease(context, product, release?.channel || product.defaultChannel) : { record: null, release: null };
    const currentVersion = String(installed.record?.version || installed.release?.version || context?.view?.firmwareVersion || "").trim();
    if (release && currentVersion) {
      const versionDelta = compareFirmwareVersions(release.version, currentVersion);
      if (versionDelta < 0 && input.allowDowngrade !== true) blockers.push("FIRMWARE_DOWNGRADE_NOT_ALLOWED");
      if (versionDelta === 0) warnings.push("FIRMWARE_ALREADY_CURRENT");
    }

    const sameVersion = Boolean(release && currentVersion && compareFirmwareVersions(release.version, currentVersion) === 0);
    const entitlements = !sameVersion && product && release && citizenId && context
      ? resolveRequiredEntitlements({ citizenId, instanceId: context.instanceId, product, release, providerId: selectedProviderId, atTime: input.atTime })
      : [];
    entitlements.filter((entry) => entry.allowed !== true).forEach((entry) => blockers.push(`ENTITLEMENT_REQUIRED:${entry.entitlementCode}`));

    const uniqueBlockers = [...new Set(blockers)];
    const uniqueWarnings = [...new Set(warnings)];
    const status = uniqueBlockers.length
      ? "BLOCKED"
      : sameVersion
        ? "CURRENT"
        : currentVersion
          ? "UPDATE_AVAILABLE"
          : "INSTALL_AVAILABLE";

    return {
      allowed: uniqueBlockers.length === 0,
      status,
      citizenId,
      instanceId: context?.instanceId || instanceId,
      definitionId: context?.definitionId || "",
      providerId: selectedProviderId,
      firmwareProductId: product?.firmwareProductId || "",
      firmwareReleaseId: release?.firmwareReleaseId || requestedReleaseId,
      currentFirmwareReleaseId: installed.release?.firmwareReleaseId || "",
      currentVersion,
      targetVersion: release?.version || "",
      updateRequired: Boolean(release && (!currentVersion || compareFirmwareVersions(release.version, currentVersion) > 0)),
      product: product ? clone(product) : null,
      release: release ? clone(release) : null,
      entitlements: clone(entitlements),
      blockers: uniqueBlockers,
      warnings: uniqueWarnings,
      evaluatedAt: String(input.atTime || app.getCampaignDateIso?.() || app.CAMPAIGN_DATE_ISO || "").trim(),
      registryRevision
    };
  }

  function validateFirmwareRegistry(options = {}) {
    const source = options.rawSource || window.APP_DATA?.firmwareRegistry || {};
    const rawProducts = Array.isArray(source.products) ? source.products : [];
    const rawReleases = Array.isArray(source.releases) ? source.releases : [];
    const errors = [];
    const warnings = [];
    const seenProductIds = new Set();
    const seenReleaseIds = new Set();
    const seenDefinitions = new Map();

    rawProducts.map(normalizeProduct).forEach((product) => {
      if (!product.firmwareProductId) errors.push("FIRMWARE_PRODUCT_ID_REQUIRED");
      else if (seenProductIds.has(product.firmwareProductId)) errors.push(`DUPLICATE_FIRMWARE_PRODUCT_ID:${product.firmwareProductId}`);
      else seenProductIds.add(product.firmwareProductId);
      if (!product.providerId) errors.push(`FIRMWARE_PRODUCT_PROVIDER_REQUIRED:${product.firmwareProductId}`);
      if (!product.supportedDefinitionIds.length) errors.push(`FIRMWARE_PRODUCT_DEFINITIONS_REQUIRED:${product.firmwareProductId}`);
      product.supportedDefinitionIds.forEach((definitionId) => {
        if (seenDefinitions.has(definitionId)) errors.push(`DUPLICATE_FIRMWARE_DEFINITION_OWNER:${definitionId}`);
        else seenDefinitions.set(definitionId, product.firmwareProductId);
      });
      product.authorizedServiceProviderIds.forEach((providerId) => {
        if (typeof app.getProvider === "function" && !app.getProvider(providerId)) warnings.push(`FIRMWARE_SERVICE_PROVIDER_NOT_FOUND:${providerId}`);
        else if (typeof app.providerSupports === "function" && !app.providerSupports(providerId, "FIRMWARE_UPDATE")) {
          errors.push(`FIRMWARE_UPDATE_CAPABILITY_MISSING:${providerId}`);
        }
      });
    });

    rawReleases.map(normalizeRelease).forEach((release) => {
      if (!release.firmwareReleaseId) errors.push("FIRMWARE_RELEASE_ID_REQUIRED");
      else if (seenReleaseIds.has(release.firmwareReleaseId)) errors.push(`DUPLICATE_FIRMWARE_RELEASE_ID:${release.firmwareReleaseId}`);
      else seenReleaseIds.add(release.firmwareReleaseId);
      if (!seenProductIds.has(release.firmwareProductId)) errors.push(`FIRMWARE_RELEASE_PRODUCT_NOT_FOUND:${release.firmwareReleaseId}`);
      if (!release.version || !parseVersion(release.version).length) errors.push(`FIRMWARE_RELEASE_VERSION_INVALID:${release.firmwareReleaseId}`);
      release.supersedesReleaseIds.forEach((releaseId) => {
        if (!rawReleases.some((candidate) => normalizeId(candidate.firmwareReleaseId || candidate.id) === releaseId)) {
          errors.push(`FIRMWARE_SUPERSEDES_RELEASE_NOT_FOUND:${release.firmwareReleaseId}:${releaseId}`);
        }
      });
    });

    seenProductIds.forEach((productId) => {
      if (!rawReleases.map(normalizeRelease).some((release) => release.firmwareProductId === productId && release.active)) {
        errors.push(`ACTIVE_FIRMWARE_RELEASE_REQUIRED:${productId}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors: [...new Set(errors)],
      warnings: [...new Set(warnings)],
      productCount: seenProductIds.size,
      releaseCount: seenReleaseIds.size,
      definitionCount: seenDefinitions.size,
      registryRevision: Math.max(1, Math.round(Number(source.registryRevision || 1)))
    };
  }

  function getFirmwareRegistryDiagnostics() {
    const validation = initializationReport || validateFirmwareRegistry();
    const activeProducts = Array.from(productIndex.values()).filter((product) => product.active).length;
    const activeReleases = Array.from(releaseIndex.values()).filter((release) => release.active).length;
    return {
      apiVersion: API_VERSION,
      schemaVersion: Math.max(1, Math.round(Number(window.APP_DATA?.firmwareRegistry?.schemaVersion || 1))),
      registryRevision,
      products: productIndex.size,
      activeProducts,
      releases: releaseIndex.size,
      activeReleases,
      indexedDefinitions: productIdByDefinitionId.size,
      validation: clone(validation),
      mutationOwner: "NONE_READ_ONLY_REGISTRY"
    };
  }

  Object.assign(app, {
    FIRMWARE_REGISTRY_API_VERSION: API_VERSION,
    FIRMWARE_REGISTRY_SCHEMA_VERSION: 1,
    compareFirmwareVersions,
    rebuildFirmwareRegistryIndexes,
    getFirmwareProduct,
    getFirmwareProducts,
    getFirmwareRelease,
    getFirmwareProductForDefinition,
    getFirmwareReleasesForProduct,
    getLatestCompatibleFirmware,
    getFirmwareStateForItem,
    resolveFirmwareEligibility,
    validateFirmwareRegistry,
    getFirmwareRegistryDiagnostics
  });

  rebuildFirmwareRegistryIndexes();
})();
