(function initCyberwareAuthorization() {
  window.WS_APP = window.WS_APP || {};
  const app = window.WS_APP;

  const LICENSE_STATUSES = new Set(["ACTIVE", "PENDING", "SUSPENDED", "REVOKED"]);
  const BLOCKING_FIRMWARE_STATUSES = new Set(["OUTDATED", "CORRUPTED", "BLOCKED", "MISSING"]);

  function clone(value) {
    if (value === undefined) return undefined;
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value));
    }
  }

  function token(value = "") {
    return String(value || "")
      .trim()
      .replace(/[\s-]+/g, "_")
      .replace(/[^A-Za-z0-9_:.]/g, "")
      .toUpperCase();
  }

  function stringList(value = []) {
    const source = Array.isArray(value) ? value : String(value || "").split(/[\n,]/);
    return [...new Set(source.map(token).filter(Boolean))];
  }

  function normalizeLicenseStatus(value = "ACTIVE") {
    const normalized = token(value || "ACTIVE");
    const aliases = {
      ENABLED: "ACTIVE",
      VALID: "ACTIVE",
      GRANTED: "ACTIVE",
      LOCKED: "SUSPENDED",
      DISABLED: "SUSPENDED",
      CANCELLED: "REVOKED",
      CANCELED: "REVOKED",
      INVALID: "REVOKED",
      UNACTIVATED: "PENDING"
    };
    const resolved = aliases[normalized] || normalized;
    return LICENSE_STATUSES.has(resolved) ? resolved : "PENDING";
  }

  function normalizeCitizenLicense(record = {}, index = 0) {
    const category = token(record.category || record.licenseCategory || record.type || "CYBERWARE");
    const status = normalizeLicenseStatus(record.status || record.state || "ACTIVE");
    return {
      id: String(record.id || `cyberware-license-${category.toLowerCase()}-${index + 1}`).trim(),
      category: category || "CYBERWARE",
      label: String(record.label || record.title || `${category || "CYBERWARE"} LICENSE`).trim(),
      status,
      permanent: true,
      grantedAt: String(record.grantedAt || record.issuedAt || "").trim(),
      grantedBy: String(record.grantedBy || record.issuer || "SYSTEM").trim(),
      suspendedAt: status === "SUSPENDED" ? String(record.suspendedAt || record.changedAt || "").trim() : "",
      revokedAt: status === "REVOKED" ? String(record.revokedAt || record.changedAt || "").trim() : "",
      reason: String(record.reason || record.note || "").trim(),
      manufacturers: stringList(record.manufacturers || record.manufacturerScope),
      protocols: stringList(record.protocols || record.protocolScope),
      grades: stringList(record.grades || record.gradeScope),
      tags: stringList(record.tags),
      log: Array.isArray(record.log) ? clone(record.log).slice(-24) : []
    };
  }

  function getCitizenCyberwareLicenses(citizenOrId = {}) {
    const citizen = typeof citizenOrId === "string" ? app.getCitizenById?.(citizenOrId) : citizenOrId;
    const source = Array.isArray(citizen?.cyberwareLicenses) ? citizen.cyberwareLicenses : [];
    return source.filter(Boolean).map(normalizeCitizenLicense);
  }

  function resolveLicenseCategory(item = {}) {
    return token(
      item.licenseCategory
      || item.requiredLicenseCategory
      || item.authorization?.licenseCategory
      || item.restrictions?.licenseCategory
      || (item.licenseRequired ? "CYBERWARE" : "")
    );
  }

  function getAuthorizationRefs(item = {}) {
    return item.authorizationRefs && typeof item.authorizationRefs === "object" && !Array.isArray(item.authorizationRefs)
      ? item.authorizationRefs
      : {};
  }

  function licenseMatchesItem(license = {}, item = {}, requiredCategory = "") {
    if (!license?.id) return false;
    if (license.category !== "CYBERWARE" && requiredCategory && license.category !== requiredCategory) return false;
    const manufacturer = token(item.manufacturer || item.provider || "");
    if (license.manufacturers.length && !license.manufacturers.includes(manufacturer)) return false;
    const grade = token(item.grade || item.quality || "");
    if (license.grades.length && !license.grades.includes(grade)) return false;
    const requiredProtocols = stringList(item.requiredProtocols || item.protocolRequirements);
    if (license.protocols.length && requiredProtocols.some((entry) => !license.protocols.includes(entry))) return false;
    return true;
  }

  function getCyberwareLicenseState(citizenOrId = {}, item = {}) {
    const required = item.licenseRequired === true || Boolean(resolveLicenseCategory(item));
    const requiredCategory = resolveLicenseCategory(item) || (required ? "CYBERWARE" : "");
    if (!required) {
      return { required: false, category: "", status: "NOT_REQUIRED", valid: true, permanent: true, license: null, reason: "LICENSE_NOT_REQUIRED" };
    }

    const licenses = getCitizenCyberwareLicenses(citizenOrId);
    const refs = getAuthorizationRefs(item);
    const linkedId = String(refs.licenseId || "").trim();
    const linked = linkedId ? licenses.find((entry) => entry.id === linkedId) || null : null;
    const matched = linked && licenseMatchesItem(linked, item, requiredCategory)
      ? linked
      : licenses.find((entry) => licenseMatchesItem(entry, item, requiredCategory)) || null;

    if (!matched) {
      return { required: true, category: requiredCategory, status: "MISSING", valid: false, permanent: true, license: null, reason: `LICENSE_MISSING:${requiredCategory}` };
    }

    const status = normalizeLicenseStatus(matched.status);
    return {
      required: true,
      category: requiredCategory,
      status,
      valid: status === "ACTIVE",
      permanent: true,
      license: matched,
      reason: status === "ACTIVE" ? "LICENSE_ACTIVE" : `LICENSE_${status}`
    };
  }

  function getSubscriptionTierLevel(subscription = {}) {
    if (typeof app.getSubscriptionTierLevel === "function") return app.getSubscriptionTierLevel(subscription);
    const direct = Number(subscription.supportsCyberwareTier ?? subscription.cyberwareTier ?? subscription.tierLevel ?? subscription.tier ?? subscription.level);
    if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
    const descriptor = [subscription.tierId, subscription.tierLabel, subscription.title].filter(Boolean).join(" ");
    const match = descriptor.match(/(?:TIER|T)\s*([0-9]+)/i);
    if (match) return Math.max(0, Math.round(Number(match[1]) || 0));
    const idMatch = String(subscription.tierId || "").match(/(?:^|[-_])([0-9]+)(?:$|[-_])/);
    return idMatch ? Math.max(0, Math.round(Number(idMatch[1]) || 0)) : 0;
  }

  function getActiveSubscriptions(citizenOrId = {}) {
    if (typeof app.getCitizenEntitledSubscriptions === "function") {
      return app.getCitizenEntitledSubscriptions(citizenOrId);
    }
    const citizen = typeof citizenOrId === "string" ? app.getCitizenById?.(citizenOrId) : citizenOrId;
    return (Array.isArray(citizen?.subscriptions) ? citizen.subscriptions : []).filter((subscription) => {
      if (!subscription || subscription.archived === true || subscription.active === false) return false;
      return ["PAID", "OVERDUE"].includes(token(subscription.status || "PENDING"));
    });
  }

  function getCyberwareSubscriptionState(citizenOrId = {}, item = {}) {
    const requiredCategory = token(item.subscriptionCategory || item.requiresSubscriptionCategory || "");
    const requiredTier = Math.max(0, Math.round(Number(item.subscriptionTierRequired ?? item.requiresSubscriptionTier ?? 0) || 0));
    const required = item.subscriptionRequired === true || Boolean(requiredCategory);
    if (!required) {
      return { required: false, category: "", requiredTier: 0, status: "NOT_REQUIRED", valid: true, subscription: null, reason: "SUBSCRIPTION_NOT_REQUIRED" };
    }

    const refs = getAuthorizationRefs(item);
    const subscriptions = getActiveSubscriptions(citizenOrId);
    const linkedId = String(refs.subscriptionId || "").trim();
    const linked = linkedId ? subscriptions.find((entry) => String(entry.id || "") === linkedId) || null : null;
    const matches = (subscription) => {
      const category = token(subscription.category || subscription.catalogCategory || "");
      return (!requiredCategory || category === requiredCategory) && getSubscriptionTierLevel(subscription) >= requiredTier;
    };
    const match = linked && matches(linked) ? linked : subscriptions.find(matches) || null;
    if (!match) {
      return {
        required: true,
        category: requiredCategory || "CYBERWARE",
        requiredTier,
        status: "MISSING",
        valid: false,
        subscription: null,
        reason: `SUBSCRIPTION_REQUIRED:${requiredCategory || "CYBERWARE"}${requiredTier ? `:T${requiredTier}` : ""}`
      };
    }
    const entitlement = typeof app.resolveSubscriptionContractState === "function"
      ? app.resolveSubscriptionContractState(match)
      : { entitlementStatus: "ACTIVE" };
    return {
      required: true,
      category: requiredCategory || token(match.category || "CYBERWARE"),
      requiredTier,
      status: entitlement.entitlementStatus || "ACTIVE",
      valid: true,
      subscription: clone(match),
      reason: entitlement.entitlementStatus === "GRACE_PERIOD" ? "SUBSCRIPTION_GRACE_PERIOD" : "SUBSCRIPTION_ACTIVE"
    };
  }

  function parseVersion(value = "") {
    const parts = String(value || "").trim().match(/\d+/g) || [];
    return parts.slice(0, 4).map((part) => Number(part) || 0);
  }

  function compareVersions(left = "", right = "") {
    const a = parseVersion(left);
    const b = parseVersion(right);
    const length = Math.max(a.length, b.length, 1);
    for (let index = 0; index < length; index += 1) {
      const delta = (a[index] || 0) - (b[index] || 0);
      if (delta) return delta > 0 ? 1 : -1;
    }
    return 0;
  }

  function getInstalledFirmwareRecords(item = {}) {
    const source = item.cyberwareState?.installedFirmware;
    return (Array.isArray(source) ? source : []).filter(Boolean).map((entry, index) => ({
      id: String(entry.id || entry.releaseId || `firmware-${index + 1}`).trim(),
      releaseId: String(entry.releaseId || entry.id || "").trim(),
      channel: token(entry.channel || entry.firmwareChannel || "DEFAULT"),
      version: String(entry.version || entry.firmwareVersion || "").trim(),
      status: token(entry.status || "CURRENT"),
      installedAt: String(entry.installedAt || entry.updatedAt || "").trim(),
      source: String(entry.source || "").trim()
    }));
  }

  function getCyberwareFirmwareState(item = {}) {
    if (typeof app.getFirmwareStateForItem === "function") {
      const registryState = app.getFirmwareStateForItem(item);
      if (registryState?.registryResolved === true) {
        const { registryResolved, ...resolved } = registryState;
        return resolved;
      }
    }

    const required = item.firmwareRequired === true;
    const channel = token(item.firmwareChannel || "DEFAULT");
    const latestVersion = String(item.firmwareLatestVersion || item.latestFirmwareVersion || item.firmwareVersion || "").trim();
    const mandatory = item.firmwareUpdateRequired === true || item.mandatoryFirmware === true;
    if (!required) {
      return { required: false, channel, status: "NOT_REQUIRED", valid: true, warning: false, version: "", latestVersion, mandatory: false, record: null, reason: "FIRMWARE_NOT_REQUIRED" };
    }

    const records = getInstalledFirmwareRecords(item);
    const record = records.find((entry) => entry.channel === channel) || records[0] || null;
    const legacyVersion = String(item.firmwareVersion || item.currentFirmwareVersion || "").trim();
    const version = String(record?.version || legacyVersion || "").trim();
    const explicitStatus = token(record?.status || item.firmwareStatus || "");

    let status = explicitStatus || (version ? "CURRENT" : "MISSING");
    if (["CORRUPTED", "BLOCKED"].includes(status)) {
      return { required: true, channel, status, valid: false, warning: false, version, latestVersion, mandatory, record, reason: `FIRMWARE_${status}` };
    }
    if (!version) status = "MISSING";
    else if (latestVersion && compareVersions(version, latestVersion) < 0) status = mandatory ? "OUTDATED" : "UPDATE_AVAILABLE";
    else if (!["CURRENT", "UPDATE_AVAILABLE", "OUTDATED"].includes(status)) status = "CURRENT";

    const blocked = BLOCKING_FIRMWARE_STATUSES.has(status);
    return {
      required: true,
      channel,
      status,
      valid: !blocked,
      warning: status === "UPDATE_AVAILABLE",
      version,
      latestVersion: latestVersion || version,
      mandatory,
      record,
      reason: blocked ? `FIRMWARE_${status}` : status === "UPDATE_AVAILABLE" ? "FIRMWARE_UPDATE_AVAILABLE" : "FIRMWARE_CURRENT"
    };
  }

  function getCyberwareAuthorizationState(citizenOrId = {}, item = {}) {
    const license = getCyberwareLicenseState(citizenOrId, item);
    const subscription = getCyberwareSubscriptionState(citizenOrId, item);
    const firmware = getCyberwareFirmwareState(item);
    const blockers = [];
    const warnings = [];
    if (!license.valid) blockers.push(license.reason);
    if (!subscription.valid) blockers.push(subscription.reason);
    if (!firmware.valid) blockers.push(firmware.reason);
    else if (firmware.warning) warnings.push(firmware.reason);
    return {
      valid: blockers.length === 0,
      reason: blockers[0] || "AUTHORIZATION_VALID",
      blockers,
      warnings,
      license,
      subscription,
      firmware
    };
  }

  function getCampaignDateIso() {
    return String(app.getCampaignDateIso?.() || app.CAMPAIGN_DATE_ISO || "2109-02-13").trim();
  }

  function setCitizenLicenseStatus(citizenId = "", licenseIdOrCategory = "", status = "ACTIVE", options = {}) {
    const citizen = app.getCitizenById?.(citizenId);
    if (!citizen) return { ok: false, reason: "CITIZEN_NOT_FOUND" };
    const selector = String(licenseIdOrCategory || "").trim();
    const normalizedStatus = normalizeLicenseStatus(status);
    const source = getCitizenCyberwareLicenses(citizen);
    const index = source.findIndex((entry) => entry.id === selector || entry.category === token(selector));
    if (index < 0) return { ok: false, reason: "LICENSE_NOT_FOUND" };
    const date = String(options.date || getCampaignDateIso()).trim();
    const current = source[index];
    const next = {
      ...current,
      status: normalizedStatus,
      suspendedAt: normalizedStatus === "SUSPENDED" ? date : "",
      revokedAt: normalizedStatus === "REVOKED" ? date : "",
      reason: String(options.reason || current.reason || "").trim(),
      log: [...(current.log || []), {
        action: `LICENSE_${normalizedStatus}`,
        date,
        previousStatus: current.status,
        status: normalizedStatus,
        source: String(options.source || "AUTHORIZATION").trim()
      }].slice(-24)
    };
    source[index] = next;
    const updated = app.updateCitizen?.(citizenId, { cyberwareLicenses: source }, {
      source: options.source || "CYBERWARE_AUTHORIZATION",
      skipModuleRefresh: true
    });
    return { ok: Boolean(updated), reason: updated ? `LICENSE_${normalizedStatus}` : "CITIZEN_UPDATE_FAILED", license: next, citizen: updated || null };
  }

  function grantCyberwareLicense(citizenId = "", record = {}, options = {}) {
    const citizen = app.getCitizenById?.(citizenId);
    if (!citizen) return { ok: false, reason: "CITIZEN_NOT_FOUND" };
    const licenses = getCitizenCyberwareLicenses(citizen);
    const normalized = normalizeCitizenLicense({
      ...record,
      id: record.id || `license-${citizenId}-${token(record.category || "CYBERWARE").toLowerCase()}`,
      status: record.status || "ACTIVE",
      permanent: true,
      grantedAt: record.grantedAt || getCampaignDateIso()
    }, licenses.length);
    const index = licenses.findIndex((entry) => entry.id === normalized.id || entry.category === normalized.category);
    if (index >= 0) licenses[index] = normalized;
    else licenses.push(normalized);
    const updated = app.updateCitizen?.(citizenId, { cyberwareLicenses: licenses }, {
      source: options.source || "CYBERWARE_LICENSE_GRANT",
      skipModuleRefresh: true
    });
    return { ok: Boolean(updated), reason: updated ? "LICENSE_GRANTED" : "CITIZEN_UPDATE_FAILED", license: normalized, citizen: updated || null };
  }

  function linkCyberwareLicense(citizenId = "", itemId = "", licenseId = "") {
    const citizen = app.getCitizenById?.(citizenId);
    const item = app.getItemInstanceView?.(itemId);
    if (!citizen || !item) return { ok: false, reason: !citizen ? "CITIZEN_NOT_FOUND" : "ITEM_INSTANCE_NOT_FOUND" };
    const license = getCitizenCyberwareLicenses(citizen).find((entry) => entry.id === licenseId)
      || getCyberwareLicenseState(citizen, item).license;
    if (!license || license.status !== "ACTIVE") return { ok: false, reason: "ACTIVE_LICENSE_NOT_FOUND" };
    const current = app.getItemInstanceById?.(itemId);
    const commit = app.updateItemInstance?.(itemId, {
      authorizationRefs: { ...(current?.authorizationRefs || {}), licenseId: license.id }
    }, { source: "CYBERWARE_LICENSE_LINK", deferPersistence: false });
    return { ok: commit?.ok === true, reason: commit?.ok ? "LICENSE_LINKED" : commit?.reason || "ITEM_INSTANCE_UPDATE_FAILED", license, item: commit?.item || null };
  }

  function installCyberwareFirmware(citizenId = "", itemId = "", options = {}) {
    const citizen = app.getCitizenById?.(citizenId);
    const current = app.getItemInstanceById?.(itemId);
    const view = app.getItemInstanceView?.(itemId);
    if (!citizen || !current || !view) return { ok: false, reason: !citizen ? "CITIZEN_NOT_FOUND" : "ITEM_INSTANCE_NOT_FOUND" };
    if (current.ownerId !== citizenId) return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH" };
    const executionMode = String(options.executionMode || options.mode || "PLAYER_WORLD_OPERATION").trim().toUpperCase();
    const directExecution = executionMode === "ADMIN_DIRECT_OPERATION" || executionMode === "DEVELOPER_DIRECT_OPERATION";
    if (!directExecution) {
      if (typeof app.startCyberwareService !== "function") return { ok: false, reason: "CYBERWARE_WORLD_BRIDGE_UNAVAILABLE" };
      return app.startCyberwareService({
        citizenId,
        operationType: "FIRMWARE_UPDATE",
        instanceId: itemId,
        itemId,
        providerId: options.providerId || options.provider,
        firmwareReleaseId: options.firmwareReleaseId || options.releaseId,
        scheduledStartAt: options.scheduledStartAt,
        paymentSource: options.paymentSource,
        coverageAuthorizations: options.coverageAuthorizations,
        idempotencyKey: options.idempotencyKey || `cyberware-firmware:${citizenId}:${itemId}`,
        executionMode: "PLAYER_WORLD_OPERATION"
      });
    }
    const state = getCyberwareFirmwareState(view);
    if (!state.required) return { ok: true, reason: "FIRMWARE_NOT_REQUIRED", firmware: state, item: view };

    const registryProduct = typeof app.getFirmwareProductForDefinition === "function"
      ? app.getFirmwareProductForDefinition(current.definitionId || view.definitionId || view.id)
      : null;
    const registryEligibility = registryProduct && typeof app.resolveFirmwareEligibility === "function"
      ? app.resolveFirmwareEligibility({
          citizenId,
          instanceId: itemId,
          firmwareReleaseId: options.firmwareReleaseId || options.releaseId || "",
          providerId: options.providerId || options.provider || "",
          channel: options.channel || state.channel || registryProduct.defaultChannel,
          atTime: options.date || getCampaignDateIso(),
          allowDowngrade: options.allowDowngrade === true
        })
      : null;
    if (registryEligibility && registryEligibility.allowed !== true) {
      return {
        ok: false,
        reason: registryEligibility.blockers?.[0] || "FIRMWARE_UPDATE_NOT_ELIGIBLE",
        eligibility: registryEligibility,
        firmware: state,
        item: view
      };
    }
    if (registryEligibility?.status === "CURRENT") {
      return {
        ok: true,
        reason: "FIRMWARE_ALREADY_CURRENT",
        replayed: true,
        eligibility: registryEligibility,
        firmware: state,
        item: view
      };
    }

    const canonicalRelease = registryEligibility?.release || null;
    const channel = token(canonicalRelease?.channel || options.channel || state.channel || "DEFAULT");
    const version = String(canonicalRelease?.version || options.version || state.latestVersion || state.version || "CURRENT").trim();
    const releaseId = String(canonicalRelease?.firmwareReleaseId || options.firmwareReleaseId || options.releaseId || "").trim();
    const date = String(options.date || getCampaignDateIso()).trim();
    const existing = Array.isArray(current.cyberwareState?.installedFirmware) ? clone(current.cyberwareState.installedFirmware) : [];
    const nextRecord = {
      id: String(releaseId || `firmware-${channel.toLowerCase()}-${version.replace(/[^A-Za-z0-9]+/g, "-")}`).trim(),
      releaseId,
      channel,
      version,
      status: "CURRENT",
      installedAt: date,
      source: String(options.source || "AUTHORIZED_UPDATE").trim()
    };
    const index = existing.findIndex((entry) => token(entry.channel || entry.firmwareChannel || "DEFAULT") === channel);
    if (index >= 0) existing[index] = nextRecord;
    else existing.push(nextRecord);
    const nextCyberwareState = {
      ...(current.cyberwareState || {}),
      installedModules: Array.isArray(current.cyberwareState?.installedModules) ? clone(current.cyberwareState.installedModules) : [],
      installedFirmware: existing,
      calibration: current.cyberwareState?.calibration && typeof current.cyberwareState.calibration === "object"
        ? clone(current.cyberwareState.calibration)
        : { profile: "FACTORY", quality: 100 }
    };
    const serviceHistory = Array.isArray(current.serviceHistory) ? clone(current.serviceHistory) : [];
    const serviceHistoryEntry = options.serviceHistoryEntry && typeof options.serviceHistoryEntry === "object"
      ? clone(options.serviceHistoryEntry)
      : {
          id: `service-firmware-${itemId}-${date}-${Date.now().toString(36)}`,
          type: "FIRMWARE",
          status: "COMPLETED",
          createdAt: date,
          provider: String(options.provider || "AUTHORIZED_UPDATE").trim(),
          cost: Math.max(0, Math.round(Number(options.cost || 0))),
          durationMinutes: Math.max(0, Math.round(Number(options.durationMinutes || 0))),
          firmwareBefore: state.version || "",
          firmwareAfter: version,
          note: `Installed ${channel} firmware ${version}.`
        };
    serviceHistory.push(serviceHistoryEntry);
    const commit = app.updateItemInstance?.(itemId, {
      cyberwareState: nextCyberwareState,
      authorizationRefs: {
        ...(current.authorizationRefs || {}),
        firmwareProductId: registryProduct?.firmwareProductId || current.authorizationRefs?.firmwareProductId || "",
        firmwareReleaseId: nextRecord.releaseId || nextRecord.id
      },
      serviceHistory: serviceHistory.slice(-48)
    }, {
      source: options.source || "CYBERWARE_FIRMWARE_UPDATE",
      deferPersistence: options.deferPersistence === true
    });
    const nextView = commit?.ok ? app.getItemInstanceView?.(itemId) : view;
    return {
      ok: commit?.ok === true,
      reason: commit?.ok ? "FIRMWARE_UPDATED" : commit?.reason || "ITEM_INSTANCE_UPDATE_FAILED",
      firmware: nextView ? getCyberwareFirmwareState(nextView) : state,
      eligibility: registryEligibility ? clone(registryEligibility) : null,
      item: nextView || null
    };
  }

  function getCyberwareAuthorizationSummary(citizenOrId = {}, items = []) {
    const source = Array.isArray(items) ? items : [];
    const states = source.map((item) => ({ item, state: getCyberwareAuthorizationState(citizenOrId, item) }));
    return {
      licenses: getCitizenCyberwareLicenses(citizenOrId),
      total: states.length,
      valid: states.filter((entry) => entry.state.valid).length,
      blocked: states.filter((entry) => !entry.state.valid).length,
      updateAvailable: states.filter((entry) => entry.state.firmware.status === "UPDATE_AVAILABLE").length,
      states
    };
  }

  const api = app.cyberwareAuthorization = app.cyberwareAuthorization || {};
  Object.assign(api, {
    normalizeCitizenLicense,
    getCitizenCyberwareLicenses,
    getCyberwareLicenseState,
    getCyberwareSubscriptionState,
    getCyberwareFirmwareState,
    getCyberwareAuthorizationState,
    getCyberwareAuthorizationSummary,
    grantCyberwareLicense,
    setCitizenLicenseStatus,
    linkCyberwareLicense,
    installCyberwareFirmware,
    compareVersions
  });

  Object.assign(app, {
    normalizeCitizenCyberwareLicense: normalizeCitizenLicense,
    getCitizenCyberwareLicenses,
    getCyberwareLicenseState,
    getCyberwareSubscriptionState,
    getCyberwareFirmwareState,
    getCyberwareAuthorizationState,
    getCyberwareAuthorizationSummary,
    grantCyberwareLicense,
    suspendCyberwareLicense: (citizenId, licenseId, options = {}) => setCitizenLicenseStatus(citizenId, licenseId, "SUSPENDED", options),
    revokeCyberwareLicense: (citizenId, licenseId, options = {}) => setCitizenLicenseStatus(citizenId, licenseId, "REVOKED", options),
    restoreCyberwareLicense: (citizenId, licenseId, options = {}) => setCitizenLicenseStatus(citizenId, licenseId, "ACTIVE", options),
    linkCyberwareLicense,
    installCyberwareFirmware
  });
})();
