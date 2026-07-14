(function initCyberwareRules() {
  window.WS_APP = window.WS_APP || {};
  const runtime = window.WS_APP.cyberwareRuntime = window.WS_APP.cyberwareRuntime || {};
  const buildCyberwareDragPayload = (...args) => runtime.buildCyberwareDragPayload(...args);
  const buildCyberwareSlotGroups = (...args) => runtime.buildCyberwareSlotGroups(...args);
  const clampNumber = (...args) => runtime.clampNumber(...args);
  const expandCyberwareSlotFootprint = (...args) => runtime.expandCyberwareSlotFootprint(...args);
  const getCyberwareGradeDefinition = (...args) => runtime.getCyberwareGradeDefinition(...args);
  const getCyberwareGradeRank = (...args) => runtime.getCyberwareGradeRank(...args);
  const getCyberwareSlotChildren = (...args) => runtime.getCyberwareSlotChildren(...args);
  const getCyberwareSlotDisplayGroupKey = (...args) => runtime.getCyberwareSlotDisplayGroupKey(...args);
  const getCyberwareSlotDisplayGroupLabel = (...args) => runtime.getCyberwareSlotDisplayGroupLabel(...args);
  const getCyberwareSlotDisplayLabel = (...args) => runtime.getCyberwareSlotDisplayLabel(...args);
  const getCyberwareSlotLabel = (...args) => runtime.getCyberwareSlotLabel(...args);
  const getCyberwareSlotLevel = (...args) => runtime.getCyberwareSlotLevel(...args);
  const getCyberwareSlotParent = (...args) => runtime.getCyberwareSlotParent(...args);
  const getCyberwareSlotPurposeKey = (...args) => runtime.getCyberwareSlotPurposeKey(...args);
  const getCyberwareSlotPurposeLabel = (...args) => runtime.getCyberwareSlotPurposeLabel(...args);
  const getCyberwareSlotsLabel = (...args) => runtime.getCyberwareSlotsLabel(...args);
  const getInterfaceTierDefinition = (...args) => runtime.getInterfaceTierDefinition(...args);
  const getNeurochipTierDefinition = (...args) => runtime.getNeurochipTierDefinition(...args);
  const getProfileAcceptanceBase = (...args) => runtime.getProfileAcceptanceBase(...args);
  const isCyberwareSlotAncestor = (...args) => runtime.isCyberwareSlotAncestor(...args);
  const normalizeCyberwareBusList = (...args) => runtime.normalizeCyberwareBusList(...args);
  const normalizeCyberwareCompatibilityList = (...args) => runtime.normalizeCyberwareCompatibilityList(...args);
  const normalizeCyberwareDescendantPolicy = (...args) => runtime.normalizeCyberwareDescendantPolicy(...args);
  const normalizeCyberwareEntry = (...args) => runtime.normalizeCyberwareEntry(...args);
  const normalizeCyberwareGradeKey = (...args) => runtime.normalizeCyberwareGradeKey(...args);
  const normalizeCyberwareList = (...args) => runtime.normalizeCyberwareList(...args);
  const normalizeCyberwareScaleKey = (...args) => runtime.normalizeCyberwareScaleKey(...args);
  const normalizeCyberwareSlotKey = (...args) => runtime.normalizeCyberwareSlotKey(...args);
  const normalizeCyberwareTier = (...args) => runtime.normalizeCyberwareTier(...args);
  const normalizeToken = (...args) => runtime.normalizeToken(...args);
  const resolveCyberwareCandidateSlotsForDrop = (...args) => runtime.resolveCyberwareCandidateSlotsForDrop(...args);
  const summarizeCyberwareSlotLabels = (...args) => runtime.summarizeCyberwareSlotLabels(...args);
  const uniqueValues = (...args) => runtime.uniqueValues(...args);
  const CYBERWARE_ACCEPTANCE_MAX = runtime.CYBERWARE_ACCEPTANCE_MAX;
  const CYBERWARE_ACCEPTANCE_MIN = runtime.CYBERWARE_ACCEPTANCE_MIN;
  const CYBERWARE_ACTIVE_LICENSE_STATUSES = runtime.CYBERWARE_ACTIVE_LICENSE_STATUSES;
  const CYBERWARE_ACTIVE_STATUSES = runtime.CYBERWARE_ACTIVE_STATUSES;
  const CYBERWARE_ACTIVE_SUBSCRIPTION_STATUSES = runtime.CYBERWARE_ACTIVE_SUBSCRIPTION_STATUSES;
  const CYBERWARE_BAD_STATUSES = runtime.CYBERWARE_BAD_STATUSES;
  const CYBERWARE_BLOCKING_FIRMWARE_STATUSES = runtime.CYBERWARE_BLOCKING_FIRMWARE_STATUSES;
  const CYBERWARE_BLOCKING_LICENSE_STATUSES = runtime.CYBERWARE_BLOCKING_LICENSE_STATUSES;
  const CYBERWARE_COMPATIBILITY_FACTOR = runtime.CYBERWARE_COMPATIBILITY_FACTOR;
  const CYBERWARE_DEINSTALLABLE_STATUSES = runtime.CYBERWARE_DEINSTALLABLE_STATUSES;
  const CYBERWARE_FIRMWARE_STATUSES = runtime.CYBERWARE_FIRMWARE_STATUSES;
  const CYBERWARE_INSTALLED_STATUSES = runtime.CYBERWARE_INSTALLED_STATUSES;
  const CYBERWARE_INVENTORY_STATUSES = runtime.CYBERWARE_INVENTORY_STATUSES;
  const CYBERWARE_LICENSE_STATUSES = runtime.CYBERWARE_LICENSE_STATUSES;
  const CYBERWARE_MEDICAL_CARE_FACTOR = runtime.CYBERWARE_MEDICAL_CARE_FACTOR;
  const CYBERWARE_PROCEDURE_BASE_COST = runtime.CYBERWARE_PROCEDURE_BASE_COST;
  const CYBERWARE_PROCEDURE_GRADE_FACTOR = runtime.CYBERWARE_PROCEDURE_GRADE_FACTOR;
  const CYBERWARE_REMOVED_STATUSES = runtime.CYBERWARE_REMOVED_STATUSES;
  const CYBERWARE_SCALE_ACCEPTANCE_FACTOR = runtime.CYBERWARE_SCALE_ACCEPTANCE_FACTOR;
  const CYBERWARE_SCALE_RANK = runtime.CYBERWARE_SCALE_RANK;
  const CYBERWARE_SLOT_DEFINITIONS = runtime.CYBERWARE_SLOT_DEFINITIONS;
  const CYBERWARE_SURGERY_PRESETS = runtime.CYBERWARE_SURGERY_PRESETS;
  const CYBERWARE_SURGERY_PRESET_BY_KEY = runtime.CYBERWARE_SURGERY_PRESET_BY_KEY;

  function normalizeCyberwareInstallStatus(value = "", fallback = "INSTALLED") {
    const token = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    if (!token) return fallback;
    const alias = {
      INSTALL: "INSTALLED",
      INSTALLED_RECORD: "INSTALLED",
      ENABLED: "ACTIVE",
      ONLINE: "ACTIVE",
      REGISTERED_ACTIVE: "REGISTERED",
      PACKAGE: "PACKAGED",
      IN_PACKAGE: "PACKAGED",
      IN_STORAGE: "PACKAGED",
      STORAGE: "PACKAGED",
      DELIVERED_PACKAGE: "PACKAGED",
      AVAILABLE: "OWNED",
      PENDING: "PENDING_INSTALL",
      PENDINGINSTALL: "PENDING_INSTALL",
      PLANNED: "PLANNED_INSTALL",
      READY: "INSTALL_READY",
      READY_TO_INSTALL: "INSTALL_READY",
      FIRMWARE_UPDATE_REQUIRED: "FIRMWARE_OUTDATED",
      UNINSTALLED: "REMOVED",
      DEINSTALLED: "REMOVED",
      TAKEN_OUT: "REMOVED",
      EXPLANTED: "REMOVED",
      BROKEN_OFF: "DAMAGED"
    }[token] || token;
    return alias;
  }

  function isCyberwareInventoryStatus(value = "") {
    return CYBERWARE_INVENTORY_STATUSES.has(normalizeCyberwareInstallStatus(value, "PACKAGED"));
  }

  function isCyberwareRemovedStatus(value = "") {
    return CYBERWARE_REMOVED_STATUSES.has(normalizeCyberwareInstallStatus(value, "REMOVED"));
  }

  function isCyberwareBadStatus(value = "") {
    return CYBERWARE_BAD_STATUSES.has(normalizeCyberwareInstallStatus(value, "OFFLINE"));
  }

  function isCyberwareInstalledStatus(value = "") {
    const status = normalizeCyberwareInstallStatus(value, "INSTALLED");
    return CYBERWARE_INSTALLED_STATUSES.has(status) || CYBERWARE_BAD_STATUSES.has(status);
  }

  function isCyberwareActiveStatus(value = "") {
    return CYBERWARE_ACTIVE_STATUSES.has(normalizeCyberwareInstallStatus(value, "INSTALLED"));
  }

  function isCyberwareOccupyingStatus(value = "") {
    const status = normalizeCyberwareInstallStatus(value, "INSTALLED");
    return (CYBERWARE_INSTALLED_STATUSES.has(status) || CYBERWARE_BAD_STATUSES.has(status))
      && !CYBERWARE_REMOVED_STATUSES.has(status)
      && !CYBERWARE_INVENTORY_STATUSES.has(status);
  }

  function normalizeCyberwareLicenseStatus(value = "", licenseRequired = false) {
    const token = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    if (!token) return licenseRequired ? "UNACTIVATED" : "NOT_REQUIRED";
    const alias = {
      ACTIVATED: "ACTIVE",
      ENABLED: "ACTIVE",
      OK: "ACTIVE",
      PAID: "ACTIVE",
      REQUIRED: "UNACTIVATED",
      LOCKED: "SUSPENDED",
      DISABLED: "SUSPENDED",
      CANCELLED: "REVOKED",
      CANCELED: "REVOKED"
    }[token] || token;
    return CYBERWARE_LICENSE_STATUSES.has(alias) ? alias : licenseRequired ? "UNACTIVATED" : "NOT_REQUIRED";
  }

  function normalizeCyberwareFirmwareStatus(value = "", firmwareRequired = false) {
    const token = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    if (!token) return firmwareRequired ? "CURRENT" : "NOT_REQUIRED";
    const alias = {
      OK: "CURRENT",
      ACTIVE: "CURRENT",
      VALID: "CURRENT",
      LATEST: "CURRENT",
      STALE: "OUTDATED",
      UPDATE_REQUIRED: "OUTDATED",
      REQUIRED: "OUTDATED",
      INVALID: "CORRUPTED"
    }[token] || token;
    return CYBERWARE_FIRMWARE_STATUSES.has(alias) ? alias : firmwareRequired ? "UNKNOWN" : "NOT_REQUIRED";
  }

  function isCyberwareLicenseActiveStatus(value = "", licenseRequired = false) {
    const status = normalizeCyberwareLicenseStatus(value, licenseRequired);
    return status === "NOT_REQUIRED" || CYBERWARE_ACTIVE_LICENSE_STATUSES.has(status);
  }

  function isCyberwareFirmwareCurrentStatus(value = "", firmwareRequired = false) {
    const status = normalizeCyberwareFirmwareStatus(value, firmwareRequired);
    return status === "NOT_REQUIRED" || status === "CURRENT";
  }

  function normalizeCyberwareVersion(value = "") {
    return String(value || "").trim();
  }

  function normalizeCyberwareSubscriptionCategory(value = "") {
    return String(value || "").trim().toUpperCase();
  }

  function normalizeCyberwareSubscriptionTier(value = 0) {
    return clampNumber(value, 0, 99, 0);
  }

  function getCyberwareSubscriptionTierLevel(subscription = {}) {
    if (typeof window.WS_APP.getSubscriptionTierLevel === "function") {
      return window.WS_APP.getSubscriptionTierLevel(subscription);
    }
    const direct = Number(subscription.supportsCyberwareTier ?? subscription.cyberwareTier ?? subscription.tierLevel ?? subscription.tier ?? subscription.level);
    if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
    const match = String(subscription.tierId || subscription.tierLabel || subscription.title || subscription.name || "").match(/(?:TIER|T)\s*([0-9]+)/i);
    return match ? clampNumber(match[1], 0, 99, 0) : 0;
  }

  function getCyberwareActiveSubscriptions(citizenOrList = {}) {
    if (!citizenOrList || Array.isArray(citizenOrList)) return [];
    if (typeof window.WS_APP.getCitizenEntitledSubscriptions === "function") {
      return window.WS_APP.getCitizenEntitledSubscriptions(citizenOrList);
    }
    const source = Array.isArray(citizenOrList.subscriptions) ? citizenOrList.subscriptions : [];
    return source.filter((subscription) => {
      if (!subscription || typeof subscription !== "object" || subscription.archived === true) return false;
      const status = String(subscription.status || "PENDING").trim().toUpperCase();
      return subscription.active !== false && CYBERWARE_ACTIVE_SUBSCRIPTION_STATUSES.has(status);
    });
  }

  function hasCyberwareRequiredSubscription(citizenOrList = {}, item = {}) {
    const requiredCategory = normalizeCyberwareSubscriptionCategory(item.subscriptionCategory || item.requiresSubscriptionCategory);
    const requiredTier = normalizeCyberwareSubscriptionTier(item.subscriptionTierRequired ?? item.requiresSubscriptionTier ?? 0);
    if (!item.subscriptionRequired && !requiredCategory) return { ok: true, label: "", subscription: null };
    if (!requiredCategory) return { ok: false, label: "CYBERWARE", subscription: null };

    const match = getCyberwareActiveSubscriptions(citizenOrList).find((subscription) => {
      const category = normalizeCyberwareSubscriptionCategory(subscription.category || subscription.catalogCategory);
      return category === requiredCategory && getCyberwareSubscriptionTierLevel(subscription) >= requiredTier;
    }) || null;

    return {
      ok: Boolean(match),
      label: `${requiredCategory}${requiredTier ? ` T${requiredTier}` : ""}`,
      subscription: match
    };
  }

  function validateCyberwareAccessForItem(citizenOrList = {}, item = {}) {
    const normalizedItem = item && item.slots ? item : normalizeCyberwareEntry(item, 0);
    if (!normalizedItem) return { valid: false, reason: "INVALID_ITEM", blockers: ["INVALID_ITEM"], warnings: [] };

    const authorizationResolver = window.WS_APP.getCyberwareAuthorizationState;
    if (typeof authorizationResolver === "function") {
      const authorization = authorizationResolver(citizenOrList, normalizedItem);
      return {
        valid: authorization.valid === true,
        reason: authorization.reason || "AUTHORIZATION_VALID",
        blockers: Array.isArray(authorization.blockers) ? authorization.blockers : [],
        warnings: Array.isArray(authorization.warnings) ? authorization.warnings : [],
        item: normalizedItem,
        licenseStatus: authorization.license?.status || "NOT_REQUIRED",
        firmwareStatus: authorization.firmware?.status || "NOT_REQUIRED",
        subscription: authorization.subscription || null,
        authorization
      };
    }

    if (normalizedItem.isCoreProcessor || normalizedItem.isCoreInterface || normalizedItem.isServicePort) {
      return { valid: true, reason: "CORE_COMPONENT", blockers: [], warnings: [], item: normalizedItem };
    }

    const blockers = [];
    const warnings = [];

    if (normalizedItem.licenseRequired && !CYBERWARE_ACTIVE_LICENSE_STATUSES.has(normalizedItem.licenseStatus)) {
      const reason = CYBERWARE_BLOCKING_LICENSE_STATUSES.has(normalizedItem.licenseStatus)
        ? `LICENSE_${normalizedItem.licenseStatus}`
        : "LICENSE_INACTIVE";
      blockers.push(reason);
    }

    const subscriptionCheck = hasCyberwareRequiredSubscription(citizenOrList, normalizedItem);
    if (!subscriptionCheck.ok) blockers.push(`SUBSCRIPTION_REQUIRED:${subscriptionCheck.label || "CYBERWARE"}`);

    if (normalizedItem.firmwareRequired && CYBERWARE_BLOCKING_FIRMWARE_STATUSES.has(normalizedItem.firmwareStatus)) {
      blockers.push(`FIRMWARE_${normalizedItem.firmwareStatus}`);
    } else if (normalizedItem.firmwareRequired && normalizedItem.firmwareStatus === "UPDATE_AVAILABLE") {
      warnings.push("FIRMWARE_UPDATE_AVAILABLE");
    } else if (normalizedItem.firmwareRequired && normalizedItem.firmwareStatus === "UNKNOWN") {
      warnings.push("FIRMWARE_STATUS_UNKNOWN");
    }

    return {
      valid: blockers.length === 0,
      reason: blockers[0] || "ACCESS_VALID",
      blockers,
      warnings,
      item: normalizedItem,
      licenseStatus: normalizedItem.licenseStatus,
      firmwareStatus: normalizedItem.firmwareStatus,
      subscription: subscriptionCheck
    };
  }

  function getCyberwareCompliancePresentation(item = {}, citizenOrList = {}) {
    const normalizedItem = item && item.slots ? item : normalizeCyberwareEntry(item, 0);
    if (!normalizedItem) {
      return { valid: false, reason: "INVALID_ITEM", blockers: ["INVALID_ITEM"], warnings: [] };
    }
    const access = validateCyberwareAccessForItem(citizenOrList, normalizedItem);
    const authorization = access.authorization || (typeof window.WS_APP.getCyberwareAuthorizationState === "function"
      ? window.WS_APP.getCyberwareAuthorizationState(citizenOrList, normalizedItem)
      : null);

    if (authorization) {
      const license = authorization.license || {};
      const subscription = authorization.subscription || {};
      const firmware = authorization.firmware || {};
      return {
        valid: authorization.valid === true,
        reason: authorization.reason || "AUTHORIZATION_VALID",
        blockers: Array.isArray(authorization.blockers) ? authorization.blockers : [],
        warnings: Array.isArray(authorization.warnings) ? authorization.warnings : [],
        licenseLabel: license.required ? `${license.category || "CYBERWARE"} / ${license.status || "MISSING"}` : "NOT_REQUIRED",
        licenseStatus: license.status || "NOT_REQUIRED",
        licenseActive: license.valid === true,
        licensePermanent: license.permanent !== false,
        licenseId: license.license?.id || "",
        licenseCodeRequired: false,
        licenseActionLabel: license.valid ? "LICENSE_ACTIVE" : "LICENSE_REQUIRED",
        licenseActionDisabled: true,
        subscriptionLabel: subscription.required
          ? `${subscription.category || "CYBERWARE"}${subscription.requiredTier ? ` T${subscription.requiredTier}` : ""}`
          : "NOT_REQUIRED",
        subscriptionState: subscription.status || "NOT_REQUIRED",
        subscriptionId: subscription.subscription?.id || "",
        firmwareLabel: firmware.required ? firmware.status || "UNKNOWN" : "NOT_REQUIRED",
        firmwareStatus: firmware.status || "NOT_REQUIRED",
        firmwareMeta: firmware.required
          ? `${firmware.channel || "DEFAULT"}${firmware.version || firmware.latestVersion ? ` / ${firmware.version || "?"}->${firmware.latestVersion || "?"}` : ""}`
          : "NO_FIRMWARE_GATE",
        firmwareCurrent: firmware.valid === true && firmware.status !== "UPDATE_AVAILABLE",
        firmwareActionLabel: firmware.status === "UPDATE_AVAILABLE" || firmware.status === "OUTDATED" || firmware.status === "MISSING"
          ? "INSTALL_FIRMWARE"
          : "FIRMWARE_CURRENT",
        firmwareActionDisabled: !firmware.required || !["UPDATE_AVAILABLE", "OUTDATED", "MISSING", "CORRUPTED"].includes(firmware.status),
        lastLicenseLog: license.license?.log?.at?.(-1) || null,
        lastFirmwareLog: firmware.record || null,
        licenseLogCount: Array.isArray(license.license?.log) ? license.license.log.length : 0,
        firmwareLogCount: Array.isArray(normalizedItem.cyberwareState?.installedFirmware) ? normalizedItem.cyberwareState.installedFirmware.length : 0,
        authorization,
        access
      };
    }

    const licenseStatus = normalizeCyberwareLicenseStatus(normalizedItem.licenseStatus, normalizedItem.licenseRequired);
    const firmwareStatus = normalizeCyberwareFirmwareStatus(normalizedItem.firmwareStatus, normalizedItem.firmwareRequired);
    const subscriptionCheck = access.subscription || hasCyberwareRequiredSubscription(citizenOrList, normalizedItem);
    const subscriptionLabel = normalizedItem.subscriptionRequired
      ? `${subscriptionCheck.label || normalizedItem.subscriptionCategory || normalizedItem.requiresSubscriptionCategory || "CYBERWARE"}`
      : "NOT_REQUIRED";
    const firmwareVersion = normalizedItem.firmwareVersion || "";
    const firmwareLatestVersion = normalizedItem.firmwareLatestVersion || firmwareVersion || "";
    const firmwareMeta = normalizedItem.firmwareRequired
      ? `${normalizedItem.firmwareChannel || "NO_CHANNEL"}${firmwareVersion || firmwareLatestVersion ? ` / ${firmwareVersion || "?"}->${firmwareLatestVersion || "?"}` : ""}`
      : "NO_FIRMWARE_GATE";
    const licenseLog = Array.isArray(normalizedItem.licenseLog) ? normalizedItem.licenseLog.filter(Boolean) : [];
    const firmwareLog = Array.isArray(normalizedItem.firmwareLog) ? normalizedItem.firmwareLog.filter(Boolean) : [];
    return {
      valid: access.valid === true,
      reason: access.reason || "ACCESS_VALID",
      blockers: Array.isArray(access.blockers) ? access.blockers : [],
      warnings: Array.isArray(access.warnings) ? access.warnings : [],
      licenseLabel: normalizedItem.licenseRequired ? licenseStatus : "NOT_REQUIRED",
      licenseStatus,
      licenseActive: isCyberwareLicenseActiveStatus(licenseStatus, normalizedItem.licenseRequired),
      licenseCodeRequired: normalizedItem.licenseCodeRequired === true,
      licenseActionLabel: isCyberwareLicenseActiveStatus(licenseStatus, normalizedItem.licenseRequired) ? "LICENSE_ACTIVE" : "ACTIVATE_LICENSE",
      licenseActionDisabled: !normalizedItem.licenseRequired || isCyberwareLicenseActiveStatus(licenseStatus, normalizedItem.licenseRequired),
      subscriptionLabel,
      subscriptionState: normalizedItem.subscriptionRequired ? subscriptionCheck.ok ? "ACTIVE" : "MISSING" : "NOT_REQUIRED",
      firmwareLabel: normalizedItem.firmwareRequired ? firmwareStatus : "NOT_REQUIRED",
      firmwareStatus,
      firmwareMeta,
      firmwareCurrent: isCyberwareFirmwareCurrentStatus(firmwareStatus, normalizedItem.firmwareRequired),
      firmwareActionLabel: isCyberwareFirmwareCurrentStatus(firmwareStatus, normalizedItem.firmwareRequired) ? "FIRMWARE_CURRENT" : "DOWNLOAD_UPDATE_FIRMWARE",
      firmwareActionDisabled: !normalizedItem.firmwareRequired || isCyberwareFirmwareCurrentStatus(firmwareStatus, normalizedItem.firmwareRequired),
      lastLicenseLog: licenseLog[licenseLog.length - 1] || null,
      lastFirmwareLog: firmwareLog[firmwareLog.length - 1] || null,
      licenseLogCount: licenseLog.length,
      firmwareLogCount: firmwareLog.length,
      access
    };
  }

  function findCyberwareEquipmentItemIndex(items = [], equipmentItemId = "") {
    const targetId = String(equipmentItemId || "").trim();
    if (!targetId) return -1;
    return items.findIndex((entry) => entry?.instanceId === targetId || entry?.id === targetId || entry?.itemId === targetId);
  }

  function normalizeCyberwareMatchTokens(values = []) {
    return new Set(normalizeCyberwareCompatibilityList(values).map((value) => normalizeToken(value)).filter(Boolean));
  }

  function getCyberwareIdentityTokens(item = {}) {
    return uniqueValues([
      item.id,
      item.implantId,
      item.name,
      item.compatibilityGroup,
      item.provider,
      item.manufacturer,
      item.series,
      item.standard,
      item.bodyBus,
      ...(Array.isArray(item.requiredBuses) ? item.requiredBuses : []),
      ...(Array.isArray(item.supportedBuses) ? item.supportedBuses : []),
      ...(Array.isArray(item.acceptedStandards) ? item.acceptedStandards : []),
      ...(Array.isArray(item.tags) ? item.tags : [])
    ].map((value) => String(value || "").trim()).filter(Boolean));
  }

  function areCyberwareItemsCompatible(left = {}, right = {}) {
    if (!left || !right) return false;
    const leftAllows = new Set(normalizeCyberwareCompatibilityList(left.compatibleWith));
    const rightAllows = new Set(normalizeCyberwareCompatibilityList(right.compatibleWith));
    const leftTokens = getCyberwareIdentityTokens(left);
    const rightTokens = getCyberwareIdentityTokens(right);
    return rightTokens.some((token) => leftAllows.has(token)) || leftTokens.some((token) => rightAllows.has(token));
  }

  function getCyberwareItemExposedFootprint(item = {}) {
    return expandCyberwareSlotFootprint(item.exposedSlots || []);
  }

  function getCyberwareItemLockedFootprint(item = {}) {
    return expandCyberwareSlotFootprint(item.lockedDescendants || []);
  }

  function cyberwareItemMatchesAllowList(item = {}, values = []) {
    const allow = normalizeCyberwareMatchTokens(values);
    if (!allow.size) return false;
    return getCyberwareIdentityTokens(item).some((token) => allow.has(normalizeToken(token)));
  }

  function cyberwareManufacturerMatches(left = {}, right = {}) {
    const leftManufacturer = normalizeToken(left.manufacturer || left.provider || "");
    const rightManufacturer = normalizeToken(right.manufacturer || right.provider || "");
    return Boolean(leftManufacturer && rightManufacturer && leftManufacturer === rightManufacturer);
  }

  function cyberwareStandardsMatch(controller = {}, child = {}) {
    const allowed = normalizeCyberwareMatchTokens(controller.acceptedStandards || []);
    if (!allowed.size) return false;
    return getCyberwareIdentityTokens(child).some((token) => allowed.has(normalizeToken(token)));
  }

  function isCyberwareSlotExposedByController(controller = {}, slotKey = "") {
    const normalizedSlot = normalizeCyberwareSlotKey(slotKey);
    if (!normalizedSlot) return false;
    const exposed = getCyberwareItemExposedFootprint(controller);
    if (!exposed.length) return false;
    const locked = getCyberwareItemLockedFootprint(controller);
    if (locked.includes(normalizedSlot)) return false;
    return exposed.includes(normalizedSlot) || exposed.some((exposedSlot) => isCyberwareSlotAncestor(exposedSlot, normalizedSlot));
  }

  function doesCyberwareControllerAllowChild(controller = {}, child = {}, slotKey = "") {
    if (!controller || !child || controller.id === child.id) return true;
    const policy = normalizeCyberwareDescendantPolicy(controller.descendantPolicy, "LOCK_ALL");
    if (policy === "LOCK_ALL") return false;
    if (policy !== "PASS_THROUGH" && !isCyberwareSlotExposedByController(controller, slotKey)) return false;
    if (cyberwareItemMatchesAllowList(child, controller.acceptedChildGroups)) return true;
    if (cyberwareItemMatchesAllowList(child, controller.acceptedManufacturers)) return true;
    if (cyberwareStandardsMatch(controller, child)) return true;
    if (areCyberwareItemsCompatible(controller, child)) return true;
    if (controller.vendorLocked && cyberwareManufacturerMatches(controller, child)) return true;
    return policy === "PASS_THROUGH" && !controller.vendorLocked;
  }

  function canCyberwareItemsShareSlot(left = {}, right = {}, slotKey = "") {
    if (!left || !right || left.id === right.id) return true;
    if (areCyberwareItemsCompatible(left, right)) return true;
    const normalizedSlot = normalizeCyberwareSlotKey(slotKey);
    const leftPrimary = normalizeCyberwareSlotKey(left.primarySlot || left.slot);
    const rightPrimary = normalizeCyberwareSlotKey(right.primarySlot || right.slot);
    const leftControls = leftPrimary && (leftPrimary === normalizedSlot || isCyberwareSlotAncestor(leftPrimary, normalizedSlot));
    const rightControls = rightPrimary && (rightPrimary === normalizedSlot || isCyberwareSlotAncestor(rightPrimary, normalizedSlot));

    if (leftControls && doesCyberwareControllerAllowChild(left, right, normalizedSlot)) return true;
    if (rightControls && doesCyberwareControllerAllowChild(right, left, normalizedSlot)) return true;
    return false;
  }

  function getCyberwarePlacementStatus(item = {}, conflictSlots = []) {
    if (!item || item.archived === true) return "OFFLINE";
    const status = normalizeCyberwareInstallStatus(item.status || "", "INSTALLED");
    if (CYBERWARE_REMOVED_STATUSES.has(status)) return "REMOVED";
    if (CYBERWARE_INVENTORY_STATUSES.has(status)) return "UNASSIGNED";
    if (Array.isArray(conflictSlots) && conflictSlots.length) return "CONFLICT";
    if (CYBERWARE_BAD_STATUSES.has(status)) return "OFFLINE";
    if (!Array.isArray(item.slots) || !item.slots.length) return "UNASSIGNED";
    return CYBERWARE_INSTALLED_STATUSES.has(status) ? "INSTALLED" : "UNASSIGNED";
  }

  function shouldCyberwareOccupySlots(item = {}) {
    return item.archived !== true && isCyberwareOccupyingStatus(item.status || "") && Array.isArray(item.slots) && item.slots.length > 0;
  }

  function isCyberwareOnline(item = {}) {
    return item.archived !== true && isCyberwareActiveStatus(item.status || "");
  }

  function resolveCyberwareRecordSource(citizenOrList = {}) {
    if (Array.isArray(citizenOrList)) return normalizeCyberwareList(citizenOrList);
    if (Array.isArray(citizenOrList?.cyberwarePreviewList)) return normalizeCyberwareList(citizenOrList.cyberwarePreviewList);
    const citizenId = String(citizenOrList?.id || citizenOrList?.citizenId || "").trim();
    if (!citizenId || typeof window.WS_APP.getInstalledCyberwareInstanceViews !== "function") return [];
    return normalizeCyberwareList(window.WS_APP.getInstalledCyberwareInstanceViews(citizenId));
  }

  function getCyberwareCoreList(citizenOrList = {}) {
    return resolveCyberwareRecordSource(citizenOrList);
  }

  function selectBestNeurochip(list = []) {
    const candidates = list.filter((item) => item.isCoreProcessor && isCyberwareOnline(item));
    return candidates.sort((a, b) => (b.neurochipTier - a.neurochipTier) || (b.neuroCapacity - a.neuroCapacity))[0] || null;
  }

  function selectBestInterface(list = []) {
    const candidates = list.filter((item) => item.isCoreInterface && isCyberwareOnline(item));
    return candidates.sort((a, b) => (b.interfaceTier - a.interfaceTier) || (b.interfaceCapacity - a.interfaceCapacity))[0] || null;
  }

  function selectBestServicePort(list = []) {
    const candidates = list.filter((item) => item.isServicePort && isCyberwareOnline(item));
    return candidates.sort((a, b) =>
      (b.servicePortTier - a.servicePortTier)
      || (b.serviceAccess - a.serviceAccess)
      || (b.diagnosticDepth - a.diagnosticDepth)
      || (b.securityLock - a.securityLock)
    )[0] || null;
  }

  function getCyberwareNeuralCoreState(citizenOrList = {}) {
    const list = getCyberwareCoreList(citizenOrList);
    const neurochip = selectBestNeurochip(list);
    const bodyInterface = selectBestInterface(list);
    const neuroDefinition = neurochip ? getNeurochipTierDefinition(neurochip.neurochipTier) : getNeurochipTierDefinition(0);
    const interfaceDefinition = bodyInterface ? getInterfaceTierDefinition(bodyInterface.interfaceTier) : getInterfaceTierDefinition(0);
    const servicePort = selectBestServicePort(list);
    const activeImplants = list.filter((item) => isCyberwareOnline(item) && shouldCyberwareOccupySlots(item) && !item.isCoreProcessor && !item.isCoreInterface && !item.isServicePort);
    const neuroLoad = activeImplants.reduce((sum, item) => sum + (Number(item.neuroLoad) || 0), 0);
    const interfaceLoad = activeImplants.reduce((sum, item) => sum + (Number(item.interfaceLoad) || 0), 0);
    const supportedBuses = bodyInterface ? normalizeCyberwareBusList(bodyInterface.supportedBuses) : [...interfaceDefinition.supportedBuses];

    return {
      neurochip,
      interface: bodyInterface,
      servicePort,
      neurochipTier: neurochip ? neurochip.neurochipTier : 0,
      neurochipLabel: neurochip ? `${neurochip.name} / T${neurochip.neurochipTier}` : "NO NEUROCHIP",
      neuroCapacity: neurochip ? neurochip.neuroCapacity : neuroDefinition.neuroCapacity,
      neuroLoad,
      neuroRemaining: Math.max(0, (neurochip ? neurochip.neuroCapacity : neuroDefinition.neuroCapacity) - neuroLoad),
      maxCyberwareGrade: neurochip ? neurochip.maxCyberwareGrade : neuroDefinition.maxCyberwareGrade,
      maxScale: neurochip ? neurochip.maxScale : neuroDefinition.maxScale,
      controlChannels: neurochip ? neurochip.controlChannels : neuroDefinition.controlChannels,
      firmwareSlots: neurochip ? neurochip.firmwareSlots : neuroDefinition.firmwareSlots,
      latencyClass: neurochip ? neurochip.latencyClass : neuroDefinition.latencyClass,
      interfaceTier: bodyInterface ? bodyInterface.interfaceTier : 0,
      interfaceLabel: bodyInterface ? `${bodyInterface.name} / T${bodyInterface.interfaceTier}` : "NO INTERFACE",
      interfaceCapacity: bodyInterface ? bodyInterface.interfaceCapacity : interfaceDefinition.interfaceCapacity,
      interfaceLoad,
      interfaceRemaining: Math.max(0, (bodyInterface ? bodyInterface.interfaceCapacity : interfaceDefinition.interfaceCapacity) - interfaceLoad),
      servicePortTier: servicePort ? servicePort.servicePortTier : 0,
      servicePortLabel: servicePort ? `${servicePort.name} / T${servicePort.servicePortTier}` : "NO SERVICE PORT",
      serviceAccess: servicePort ? servicePort.serviceAccess : 0,
      diagnosticDepth: servicePort ? servicePort.diagnosticDepth : 0,
      firmwareAccess: servicePort ? servicePort.firmwareAccess : 0,
      calibrationQuality: servicePort ? servicePort.calibrationQuality : 0,
      securityLock: servicePort ? servicePort.securityLock : 0,
      emergencyAccess: servicePort ? servicePort.emergencyAccess : 0,
      traceability: servicePort ? servicePort.traceability : 0,
      supportedBuses,
      activeImplantCount: activeImplants.length
    };
  }

  function validateCyberwareNeuralCoreForItem(citizenOrList = {}, item = {}, options = {}) {
    const normalizedItem = normalizeCyberwareEntry(item, 0);
    const baseList = Array.isArray(options.installedList) ? options.installedList : getCyberwareCoreList(citizenOrList);
    const baseCore = options.baseCore || getCyberwareNeuralCoreState(baseList);
    if (!normalizedItem) return { valid: false, reason: "INVALID_ITEM", blockers: ["INVALID_ITEM"], warnings: [], core: baseCore, item: null };
    if (normalizedItem.isCoreProcessor || normalizedItem.isCoreInterface || normalizedItem.isServicePort) {
      return { valid: true, reason: "CORE_COMPONENT", blockers: [], warnings: [], core: baseCore, item: normalizedItem };
    }

    const list = baseList.filter((entry) => entry.id !== normalizedItem.id);
    const candidateList = [...list, normalizedItem];
    const core = getCyberwareNeuralCoreState(candidateList);
    const blockers = [];
    const warnings = [];
    const gradeRank = getCyberwareGradeRank(normalizedItem.grade);
    const maxGradeRank = getCyberwareGradeRank(core.maxCyberwareGrade);
    const scaleRank = CYBERWARE_SCALE_RANK[normalizedItem.scale] || 1;
    const maxScaleRank = CYBERWARE_SCALE_RANK[core.maxScale] || 1;

    if (!core.neurochip) blockers.push("NO_NEUROCHIP");
    if (core.neurochip && core.neurochipTier < normalizedItem.requiresNeurochipTier) blockers.push("NEUROCHIP_TIER_TOO_LOW");
    if (core.neurochip && core.neuroLoad > core.neuroCapacity) blockers.push("NEUROCHIP_CAPACITY_TOO_LOW");
    if (core.neurochip && gradeRank > maxGradeRank) blockers.push("NEUROCHIP_GRADE_LIMIT");
    if (core.neurochip && scaleRank > maxScaleRank) blockers.push("NEUROCHIP_SCALE_LIMIT");
    if (!core.interface) blockers.push("NO_INTERFACE");
    if (core.interface && core.interfaceTier < normalizedItem.requiresInterfaceTier) blockers.push("INTERFACE_TIER_TOO_LOW");
    if (core.interface && core.interfaceLoad > core.interfaceCapacity) blockers.push("INTERFACE_CAPACITY_TOO_LOW");

    const protocolSupport = typeof runtime.getCyberwareEffectiveProtocolSupport === "function"
      ? runtime.getCyberwareEffectiveProtocolSupport(core.neurochip, core.interface)
      : [];
    const supportedProtocols = new Set(normalizeCyberwareBusList(protocolSupport));
    (normalizedItem.requiredProtocols || []).forEach((protocol) => {
      if (!supportedProtocols.has(protocol)) blockers.push(`PROTOCOL_UNSUPPORTED:${protocol}`);
    });

    const supportedBuses = new Set(core.supportedBuses || []);
    (normalizedItem.requiredBuses || []).forEach((bus) => {
      if (!supportedBuses.has(bus)) blockers.push(`INTERFACE_BUS_INCOMPATIBLE:${bus}`);
    });

    const identityTokens = new Set();
    candidateList.forEach((entry) => {
      if (typeof runtime.getCyberwareIdentityTokens === "function") {
        runtime.getCyberwareIdentityTokens(entry).forEach((token) => identityTokens.add(token));
      }
    });
    (normalizedItem.requiredComponentStandards || []).forEach((standard) => {
      if (!identityTokens.has(standard)) blockers.push(`COMPONENT_STANDARD_MISSING:${standard}`);
    });

    const uniqueBlockers = uniqueValues(blockers);
    return {
      valid: uniqueBlockers.length === 0,
      reason: uniqueBlockers[0] || "VALID",
      blockers: uniqueBlockers,
      warnings: uniqueValues(warnings),
      core,
      item: normalizedItem,
      requiredProtocols: [...(normalizedItem.requiredProtocols || [])],
      requiredBuses: [...(normalizedItem.requiredBuses || [])],
      requiredComponentStandards: [...(normalizedItem.requiredComponentStandards || [])]
    };
  }

  function normalizeCyberwareCompatibilityMode(value = "MATCHED") {
    const token = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    return CYBERWARE_COMPATIBILITY_FACTOR[token] !== undefined ? token : "UNKNOWN";
  }

  function normalizeCyberwareMedicalCare(value = "CLINIC") {
    const token = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    return CYBERWARE_MEDICAL_CARE_FACTOR[token] !== undefined ? token : "CLINIC";
  }

  function normalizeCyberwareSurgeryPresetKey(value = "LOCAL_CLINIC") {
    const token = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    if (CYBERWARE_SURGERY_PRESET_BY_KEY.has(token)) return token;
    const byProvider = CYBERWARE_SURGERY_PRESETS.find((preset) => normalizeToken(preset.provider) === normalizeToken(value) || normalizeToken(preset.label) === normalizeToken(value));
    return byProvider?.key || "LOCAL_CLINIC";
  }

  function getCyberwareSurgeryPreset(value = "LOCAL_CLINIC") {
    return { ...(CYBERWARE_SURGERY_PRESET_BY_KEY.get(normalizeCyberwareSurgeryPresetKey(value)) || CYBERWARE_SURGERY_PRESET_BY_KEY.get("LOCAL_CLINIC")) };
  }

  function normalizeCyberwareProcedureMode(value = "STANDARD") {
    const token = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    return token || "STANDARD";
  }

  function normalizeCyberwareSurgeryContext(options = {}, item = {}) {
    const incoming = options?.surgeryContext && typeof options.surgeryContext === "object"
      ? { ...options.surgeryContext, ...options }
      : { ...options };
    const preset = getCyberwareSurgeryPreset(incoming.surgeryPreset || incoming.preset || incoming.careProvider || incoming.provider || "LOCAL_CLINIC");
    const surgeonSkill = clampNumber(incoming.surgeonSkill ?? incoming.surgeon ?? preset.surgeonSkill, 0, 10, preset.surgeonSkill);
    const medicalCare = normalizeCyberwareMedicalCare(incoming.medicalCare || preset.medicalCare);
    const compatibility = normalizeCyberwareCompatibilityMode(incoming.compatibility || preset.compatibility);
    const provider = String(incoming.provider || incoming.careProvider || preset.provider || preset.key).trim().replace(/[\s-]+/g, "_").toUpperCase();
    const procedureMode = normalizeCyberwareProcedureMode(incoming.procedureMode || preset.procedureMode || "STANDARD");
    const costFactor = Number.isFinite(Number(incoming.costFactor)) ? Number(incoming.costFactor) : Number(preset.costFactor || 1);
    return {
      surgeryPreset: preset.key,
      label: preset.label,
      provider,
      procedureMode,
      surgeonSkill,
      medicalCare,
      compatibility,
      costFactor: Math.max(0.1, Math.min(5, costFactor)),
      itemId: item?.id || item?.implantId || ""
    };
  }

  function calculateCyberwareProcedureCost(item = {}, options = {}) {
    const normalized = normalizeCyberwareEntry(item, 0) || {};
    const context = options?.surgeryContext?.surgeryPreset ? options.surgeryContext : normalizeCyberwareSurgeryContext(options, normalized);
    const scale = normalizeCyberwareScaleKey(options.implantScale || normalized.scale) || "SMALL";
    const grade = normalizeCyberwareGradeKey(options.implantGrade || normalized.grade) || "LICENSED";
    const baseCost = Number(CYBERWARE_PROCEDURE_BASE_COST[scale] || CYBERWARE_PROCEDURE_BASE_COST.SMALL);
    const gradeFactor = Number(CYBERWARE_PROCEDURE_GRADE_FACTOR[grade] || 1);
    const loadCost = Math.max(0, Number(normalized.neuroLoad || 0) + Number(normalized.interfaceLoad || 0)) * 320;
    const slotCost = Math.max(1, Number(normalized.slotCost || 1)) * 180;
    const raw = (baseCost * gradeFactor + loadCost + slotCost) * Number(context.costFactor || 1);
    const finalCost = Math.max(0, Math.round(raw / 50) * 50);
    return {
      finalCost,
      baseCost,
      gradeFactor,
      loadCost,
      slotCost,
      costFactor: Number(context.costFactor || 1),
      currency: "ENCODED_CREDITS",
      context
    };
  }

  function calculateCyberwareAcceptanceChance(citizenOrProfile = {}, item = {}, options = {}) {
    const citizen = Array.isArray(citizenOrProfile) ? {} : citizenOrProfile || {};
    const normalizedItem = normalizeCyberwareEntry(item, 0) || normalizeCyberwareEntry({ name: "Cyberware", scale: options.implantScale || "SMALL", grade: options.implantGrade || "LICENSED" }, 0);
    const profileBase = getProfileAcceptanceBase(citizen, options);
    const grade = normalizeCyberwareGradeKey(options.implantGrade || normalizedItem.grade);
    const scale = normalizeCyberwareScaleKey(options.implantScale || normalizedItem.scale) || "SMALL";
    const core = options.coreState || (Array.isArray(citizenOrProfile) ? getCyberwareNeuralCoreState(citizenOrProfile) : getCyberwareNeuralCoreState(citizen));
    const neurochipTier = normalizeCyberwareTier(options.neurochipTier ?? core.neurochipTier);
    const neurochipFactor = getNeurochipTierDefinition(neurochipTier).acceptanceFactor;
    const surgeryContext = normalizeCyberwareSurgeryContext(options, normalizedItem);
    const surgeonSkill = surgeryContext.surgeonSkill;
    const surgeonFactor = 0.45 + surgeonSkill * 0.08;
    const compatibility = surgeryContext.compatibility;
    const medicalCare = surgeryContext.medicalCare;
    const raw = profileBase
      * (getCyberwareGradeDefinition(grade).acceptanceFactor || 1)
      * (CYBERWARE_SCALE_ACCEPTANCE_FACTOR[scale] || 1)
      * neurochipFactor
      * surgeonFactor
      * (CYBERWARE_COMPATIBILITY_FACTOR[compatibility] || 0.5)
      * (CYBERWARE_MEDICAL_CARE_FACTOR[medicalCare] || 1);
    const acceptanceChance = Math.max(CYBERWARE_ACCEPTANCE_MIN, Math.min(CYBERWARE_ACCEPTANCE_MAX, raw));
    const rejectionChance = 1 - acceptanceChance;

    return {
      acceptanceChance,
      rejectionChance,
      profileBase,
      implantGrade: grade,
      implantScale: scale,
      neurochipTier,
      surgeonSkill,
      surgeonFactor,
      compatibility,
      medicalCare,
      surgeryContext,
      minAcceptance: CYBERWARE_ACCEPTANCE_MIN,
      maxAcceptance: CYBERWARE_ACCEPTANCE_MAX
    };
  }

  function classifyCyberwareRejectionFailure(acceptanceChance = 0, roll = 1) {
    const margin = Number(roll) - Number(acceptanceChance);
    if (!Number.isFinite(margin) || margin <= 0) return "ACCEPTED";
    if (margin <= 0.10) return "MINOR_COMPLICATION";
    if (margin <= 0.25) return "PARTIAL_REJECTION";
    if (margin <= 0.45) return "SEVERE_REJECTION";
    return "CRITICAL_REJECTION";
  }

  function getCyberwarePlacementState(citizenOrList = {}) {
    const list = resolveCyberwareRecordSource(citizenOrList);
    const slots = CYBERWARE_SLOT_DEFINITIONS.map((definition) => ({ ...definition, item: null, items: [], conflicts: [] }));
    const slotByKey = new Map(slots.map((slot) => [slot.key, slot]));
    const occupied = new Map();
    const installed = [];
    const conflicts = [];
    const unassigned = [];

    list.forEach((item) => {
      if (!item.slots.length) {
        const runtime = { ...item, occupiedSlots: [], conflictSlots: [], conflictWith: [], runtimeStatus: "UNASSIGNED", runtimeReason: "NO_SLOT" };
        unassigned.push(runtime);
        return;
      }

      const knownSlots = item.slots.filter((slotKey) => slotByKey.has(slotKey));
      if (!knownSlots.length) {
        const runtime = { ...item, occupiedSlots: [], conflictSlots: [], conflictWith: [], runtimeStatus: "UNASSIGNED", runtimeReason: "UNKNOWN_SLOT" };
        unassigned.push(runtime);
        return;
      }

      const conflictItems = [];
      const conflictSlots = [];
      knownSlots.forEach((slotKey) => {
        const slot = slotByKey.get(slotKey);
        const occupants = Array.isArray(slot?.items) && slot.items.length ? slot.items : [occupied.get(slotKey)].filter(Boolean);
        occupants.forEach((occupant) => {
          if (!occupant) return;
          if (canCyberwareItemsShareSlot(item, occupant, slotKey)) return;
          conflictSlots.push(slotKey);
          conflictItems.push(occupant);
        });
      });

      const runtimeStatus = getCyberwarePlacementStatus(item, conflictSlots);
      const runtimeReason = conflictSlots.length
        ? `SLOT_CONFLICT:${conflictSlots.map(getCyberwareSlotLabel).join("+")}`
        : CYBERWARE_BAD_STATUSES.has(String(item.status || "").toUpperCase())
          ? `STATUS:${item.status}`
          : "SLOTS_ASSIGNED";
      const runtime = {
        ...item,
        slots: knownSlots,
        occupiedSlots: knownSlots,
        slotLabel: item.primarySlot ? getCyberwareSlotLabel(item.primarySlot) : getCyberwareSlotLabel(knownSlots[0]),
        slotDisplayLabel: item.primarySlot ? getCyberwareSlotDisplayLabel(item.primarySlot) : getCyberwareSlotDisplayLabel(knownSlots[0]),
        slotPurposeLabel: item.primarySlot ? getCyberwareSlotPurposeLabel(item.primarySlot) : getCyberwareSlotPurposeLabel(knownSlots[0]),
        slotDisplayGroupLabel: item.primarySlot ? getCyberwareSlotDisplayGroupLabel(item.primarySlot) : getCyberwareSlotDisplayGroupLabel(knownSlots[0]),
        slotsLabel: getCyberwareSlotsLabel(knownSlots),
        slotsGroupedLabel: summarizeCyberwareSlotLabels(knownSlots),
        conflictSlots: uniqueValues(conflictSlots),
        conflictWith: uniqueValues(conflictItems.map((entry) => entry.id)),
        runtimeStatus,
        runtimeReason
      };

      if (conflictSlots.length) {
        conflictSlots.forEach((slotKey) => slotByKey.get(slotKey)?.conflicts.push(runtime));
        conflicts.push(runtime);
        return;
      }

      if (!shouldCyberwareOccupySlots(runtime)) {
        unassigned.push({
          ...runtime,
          occupiedSlots: [],
          conflictSlots: [],
          conflictWith: [],
          runtimeReason: runtime.runtimeStatus === "REMOVED" ? "STATUS:REMOVED" : `STATUS:${runtime.status || "UNASSIGNED"}`
        });
        return;
      }

      knownSlots.forEach((slotKey) => {
        const slot = slotByKey.get(slotKey);
        if (!slot) return;
        if (!slot.item) slot.item = runtime;
        slot.items.push(runtime);
        if (!occupied.has(slotKey)) occupied.set(slotKey, runtime);
      });
      installed.push(runtime);
    });

    const occupiedSlots = slots.filter((slot) => slot.item);
    const slotGroups = buildCyberwareSlotGroups(slots);
    const neuralCore = getCyberwareNeuralCoreState(list);
    return {
      slots,
      slotGroups,
      installed,
      conflicts,
      unassigned,
      emptySlots: slots.filter((slot) => !slot.item),
      occupiedSlots,
      neuralCore,
      dragDrop: {
        type: "CYBERWARE_SLOT_MAP",
        occupiedSlotKeys: occupiedSlots.map((slot) => slot.key),
        conflictSlotKeys: uniqueValues(conflicts.flatMap((item) => item.conflictSlots || [])),
        slotDefinitions: CYBERWARE_SLOT_DEFINITIONS.map((slot) => ({
          key: slot.key,
          label: slot.label,
          group: slot.group || "",
          level: getCyberwareSlotLevel(slot.key),
          slotLevel: getCyberwareSlotLevel(slot.key),
          parent: getCyberwareSlotParent(slot.key),
          children: getCyberwareSlotChildren(slot.key),
          displayGroup: getCyberwareSlotDisplayGroupKey(slot.key),
          displayGroupLabel: getCyberwareSlotDisplayGroupLabel(slot.key),
          purpose: getCyberwareSlotPurposeKey(slot.key),
          purposeLabel: getCyberwareSlotPurposeLabel(slot.key),
          side: slot.side || ""
        })),
        slotGroups: slotGroups.map((group) => ({ key: group.key, label: group.label, description: group.description, slotKeys: group.slots.map((slot) => slot.key) }))
      },
      counts: {
        total: list.length,
        installed: installed.length,
        conflicts: conflicts.length,
        unassigned: unassigned.length,
        empty: slots.filter((slot) => !slot.item).length,
        occupiedSlots: occupiedSlots.length,
        slotCost: installed.reduce((sum, item) => sum + (Number(item.slotCost) || 0), 0),
        customizationSlots: installed.reduce((sum, item) => sum + (Number(item.customizationSlots) || 0), 0),
        neuroLoad: neuralCore.neuroLoad,
        neuroCapacity: neuralCore.neuroCapacity,
        interfaceLoad: neuralCore.interfaceLoad,
        interfaceCapacity: neuralCore.interfaceCapacity,
        offline: [...installed, ...conflicts, ...unassigned].filter((item) => item.runtimeStatus === "OFFLINE").length
      }
    };
  }

  function getCyberwareSlotState(citizenOrList = {}) {
    return getCyberwarePlacementState(citizenOrList).slots;
  }

  function validateCyberwareSlotsForItem(citizenOrList = {}, item = {}, candidateSlots = null, options = {}) {
    const current = Array.isArray(options.installedList) ? options.installedList : resolveCyberwareRecordSource(citizenOrList);
    const normalizedItem = normalizeCyberwareEntry({ ...item, slots: candidateSlots || item.slots || item.slot, primarySlot: Array.isArray(candidateSlots) ? candidateSlots[0] : item.primarySlot || item.slot }, 0);
    if (!normalizedItem) return { valid: false, reason: "INVALID_ITEM", blockers: ["INVALID_ITEM"], warnings: [], item: null, conflictSlots: [], conflictWith: [] };

    const blockers = [];
    const warnings = [];
    if (!normalizedItem.slots.length) blockers.push("NO_SLOT");
    const others = current.filter((entry) => entry.id !== normalizedItem.id);
    let conflictSlots = [];
    let conflictWith = [];
    let runtimeState = null;
    if (normalizedItem.slots.length) {
      runtimeState = getCyberwarePlacementState([...others, normalizedItem]);
      const conflict = runtimeState.conflicts.find((entry) => entry.id === normalizedItem.id);
      if (conflict) {
        blockers.push(conflict.runtimeReason || "SLOT_CONFLICT");
        conflictSlots = conflict.conflictSlots || [];
        conflictWith = conflict.conflictWith || [];
      }
    }

    const baseCore = options.baseCore || getCyberwareNeuralCoreState(others);
    const coreValidation = validateCyberwareNeuralCoreForItem(others, normalizedItem, { installedList: others, baseCore });
    blockers.push(...(coreValidation.blockers || (coreValidation.valid ? [] : [coreValidation.reason || "CORE_VALIDATION_FAILED"])));
    warnings.push(...(coreValidation.warnings || []));

    const accessValidation = validateCyberwareAccessForItem(citizenOrList, normalizedItem);
    blockers.push(...(accessValidation.blockers || (accessValidation.valid ? [] : [accessValidation.reason || "CYBERWARE_ACCESS_BLOCKED"])));
    warnings.push(...(accessValidation.warnings || []));

    const uniqueBlockers = uniqueValues(blockers);
    return {
      valid: uniqueBlockers.length === 0,
      reason: uniqueBlockers[0] || "VALID",
      blockers: uniqueBlockers,
      warnings: uniqueValues(warnings),
      item: normalizedItem,
      conflictSlots,
      conflictWith,
      core: coreValidation.core || runtimeState?.neuralCore || baseCore,
      access: accessValidation,
      coreValidation
    };
  }

  function getCyberwareRecordList(citizenOrList = {}) {
    return resolveCyberwareRecordSource(citizenOrList);
  }

  function findCyberwareRecordIndex(list = [], itemId = "") {
    const targetId = String(itemId || "").trim();
    if (!targetId) return -1;
    return list.findIndex((entry) => entry.instanceId === targetId || entry.id === targetId || entry.itemId === targetId);
  }

  function getCyberwareEquipmentSource(citizen = {}) {
    const citizenId = String(citizen?.id || "").trim();
    const items = citizenId && typeof window.WS_APP.getCitizenEquipmentItemInstanceViews === "function"
      ? window.WS_APP.getCitizenEquipmentItemInstanceViews(citizenId)
      : [];
    return { ...(citizen?.equipment || {}), items };
  }

  function getCyberwareCoreDependencyBlockers(list = [], item = {}) {
    if (!item?.isCoreProcessor && !item?.isCoreInterface && !item?.isServicePort) return [];
    const activeDependents = list.filter((entry) => {
      if (!entry || entry.id === item.id) return false;
      if (entry.isCoreProcessor || entry.isCoreInterface || entry.isServicePort) return false;
      return isCyberwareOnline(entry) && shouldCyberwareOccupySlots(entry);
    });
    if (!activeDependents.length) return [];
    const coreType = item.isCoreProcessor ? "NEUROCHIP" : item.isCoreInterface ? "INTERFACE" : "SERVICE_PORT";
    return [`CORE_STACK_DEPENDENCY:${coreType}:${activeDependents.length}`];
  }

  function validateCyberwareDeinstallForItem(citizenOrList = {}, itemOrId = {}, options = {}) {
    const list = getCyberwareRecordList(citizenOrList);
    const itemId = typeof itemOrId === "string" ? itemOrId : itemOrId?.id || itemOrId?.implantId || itemOrId?.name || "";
    const index = findCyberwareRecordIndex(list, itemId);
    const item = index >= 0 ? list[index] : normalizeCyberwareEntry(itemOrId, 0);
    if (!item) return { valid: false, reason: "CYBERWARE_ITEM_NOT_FOUND", blockers: ["CYBERWARE_ITEM_NOT_FOUND"], warnings: [], item: null, index: -1, freedSlots: [] };

    const blockers = [];
    const warnings = [];
    const status = normalizeCyberwareInstallStatus(item.status || "", "INSTALLED");
    if (item.archived === true) blockers.push("CYBERWARE_ARCHIVED");
    if (CYBERWARE_REMOVED_STATUSES.has(status)) blockers.push(`STATUS:${status}`);
    if (CYBERWARE_INVENTORY_STATUSES.has(status)) blockers.push(`NOT_INSTALLED:${status}`);
    if (!CYBERWARE_DEINSTALLABLE_STATUSES.has(status) && !CYBERWARE_INSTALLED_STATUSES.has(status) && !CYBERWARE_BAD_STATUSES.has(status)) blockers.push(`STATUS_NOT_DEINSTALLABLE:${status}`);
    if (!Array.isArray(item.slots) || !item.slots.length) warnings.push("NO_OCCUPIED_SLOTS");
    if (CYBERWARE_BAD_STATUSES.has(status)) warnings.push(`DEINSTALL_DAMAGED_IMPLANT:${status}`);
    if ((item.isCoreProcessor || item.isCoreInterface || item.isServicePort) && options.forceCoreRemoval !== true) {
      blockers.push(...getCyberwareCoreDependencyBlockers(list, item));
    }

    return {
      valid: blockers.length === 0,
      reason: blockers[0] || "DEINSTALL_READY",
      blockers,
      warnings,
      item,
      index,
      freedSlots: Array.isArray(item.slots) ? [...item.slots] : [],
      slotsLabel: summarizeCyberwareSlotLabels(item.slots || []),
      core: getCyberwareNeuralCoreState(list)
    };
  }

  function buildCyberwareDeinstallPreview(citizenOrList = {}, itemOrId = {}, options = {}) {
    const validation = validateCyberwareDeinstallForItem(citizenOrList, itemOrId, options);
    const item = validation.item;
    const surgeryContext = item ? normalizeCyberwareSurgeryContext({ procedureMode: "CONTROLLED", ...options }, item) : normalizeCyberwareSurgeryContext({ procedureMode: "CONTROLLED", ...options }, {});
    const procedureCost = item ? calculateCyberwareProcedureCost(item, { ...options, surgeryContext }) : { baseCost: 0, finalCost: 0, currency: "ENCODED_CREDITS" };
    return {
      operation: "DEINSTALL",
      valid: validation.valid,
      status: validation.valid ? "DEINSTALL_READY" : "BLOCKED",
      reason: validation.reason,
      blockers: validation.blockers || [],
      warnings: validation.warnings || [],
      item,
      validation,
      surgeryContext,
      procedureCost,
      freedSlots: validation.freedSlots || [],
      freedSlotLabels: (validation.freedSlots || []).map(getCyberwareSlotLabel),
      freedSlotGroupedLabel: validation.slotsLabel || summarizeCyberwareSlotLabels(validation.freedSlots || []),
      core: validation.core || getCyberwareNeuralCoreState(citizenOrList)
    };
  }

  function buildCyberwareDeinstallCheckRecord(item = {}, preview = {}, options = {}) {
    const now = new Date().toISOString();
    const context = preview.surgeryContext || normalizeCyberwareSurgeryContext({ procedureMode: "CONTROLLED", ...options }, item);
    const cost = preview.procedureCost || calculateCyberwareProcedureCost(item, { ...options, surgeryContext: context });
    return {
      id: `cyberware-deinstall-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      source: "CYBERWARE_DEINSTALL_REPLACE_1.0x",
      operation: options.operation || "DEINSTALL",
      result: preview.valid ? options.result || "DEINSTALLED" : "DEINSTALL_BLOCKED",
      accepted: preview.valid === true,
      timestamp: now,
      itemId: item.id || item.implantId || "",
      itemName: item.name || "Cyberware",
      statusBefore: item.status || "INSTALLED",
      statusAfter: options.statusAfter || "REMOVED",
      provider: context.provider || options.provider || "LOCAL_CLINIC",
      procedureMode: context.procedureMode || options.procedureMode || "CONTROLLED",
      surgeryPreset: context.surgeryPreset || options.surgeryPreset || "LOCAL_CLINIC",
      surgeonSkill: context.surgeonSkill ?? options.surgeonSkill ?? 5,
      medicalCare: context.medicalCare || options.medicalCare || "CLINIC",
      compatibility: context.compatibility || options.compatibility || "PARTIAL",
      procedureCost: Number(cost.finalCost || 0),
      currency: cost.currency || "ENCODED_CREDITS",
      freedSlots: Array.isArray(preview.freedSlots) ? [...preview.freedSlots] : [],
      blockers: Array.isArray(preview.blockers) ? [...preview.blockers] : [],
      warnings: Array.isArray(preview.warnings) ? [...preview.warnings] : [],
      replacementItemInstanceId: String(options.replacementItemInstanceId || "").trim()
    };
  }

  function buildCyberwareInstallPreview(citizenOrList = {}, item = {}, options = {}) {
    const requestedSlot = options.primarySlot || options.slotKey || item.primarySlot || item.slot || "";
    const candidateSlots = options.candidateSlots || options.slots || (requestedSlot ? resolveCyberwareCandidateSlotsForDrop(item, requestedSlot) : null);
    const installIntentStatus = options.intentStatus || options.installIntentStatus || "INSTALLED";
    const normalized = normalizeCyberwareEntry({
      ...item,
      status: installIntentStatus,
      slots: candidateSlots || item.slots || item.slot,
      primarySlot: requestedSlot || item.primarySlot || item.slot
    }, 0);
    if (!normalized) {
      return {
        valid: false,
        status: "BLOCKED",
        reason: "INVALID_ITEM",
        blockers: ["INVALID_ITEM"],
        item: null,
        dragPayload: null,
        slotValidation: { valid: false, reason: "INVALID_ITEM" },
        acceptance: null,
        acceptanceChance: 0,
        rejectionChance: 1,
        core: getCyberwareNeuralCoreState(citizenOrList)
      };
    }

    const surgeryContext = normalizeCyberwareSurgeryContext(options, normalized);
    const procedureCost = calculateCyberwareProcedureCost(normalized, { ...options, surgeryContext });
    const installedList = Array.isArray(options.installedList) ? options.installedList : resolveCyberwareRecordSource(citizenOrList);
    const baseCore = options.baseCore || getCyberwareNeuralCoreState(installedList);
    const slotValidation = validateCyberwareSlotsForItem(citizenOrList, normalized, candidateSlots, { installedList, baseCore });
    const acceptance = calculateCyberwareAcceptanceChance(citizenOrList, normalized, { ...options, surgeryContext, coreState: baseCore });
    const blockers = [];
    const warnings = [];

    if ((slotValidation.blockers || []).length) blockers.push(...slotValidation.blockers);
    else if (!slotValidation.valid) blockers.push(slotValidation.reason || "CYBERWARE_VALIDATION_FAILED");
    if ((slotValidation.warnings || []).length) warnings.push(...slotValidation.warnings);
    if ((slotValidation.conflictSlots || []).length) warnings.push(`CONFLICT_SLOTS:${slotValidation.conflictSlots.join("+")}`);
    if (acceptance.acceptanceChance < 0.25) warnings.push("BIO_ACCEPTANCE_CRITICAL");
    else if (acceptance.acceptanceChance < 0.50) warnings.push("BIO_ACCEPTANCE_HIGH_RISK");

    const status = blockers.length
      ? "BLOCKED"
      : acceptance.acceptanceChance < 0.25
        ? "CRITICAL_RISK"
        : acceptance.acceptanceChance < 0.50
          ? "HIGH_RISK"
          : "VALID";

    return {
      valid: blockers.length === 0,
      status,
      reason: blockers[0] || status,
      blockers: uniqueValues(blockers),
      warnings: uniqueValues(warnings),
      item: normalized,
      dragPayload: buildCyberwareDragPayload(normalized),
      slotValidation,
      access: slotValidation.access || validateCyberwareAccessForItem(citizenOrList, normalized),
      acceptance,
      surgeryContext,
      procedureCost,
      acceptanceChance: acceptance.acceptanceChance,
      rejectionChance: acceptance.rejectionChance,
      core: slotValidation.core || baseCore,
      occupiedSlots: [...normalized.slots],
      occupiedSlotLabels: normalized.slots.map(getCyberwareSlotLabel),
      occupiedSlotGroupedLabel: summarizeCyberwareSlotLabels(normalized.slots),
      conflictSlots: slotValidation.conflictSlots || [],
      conflictWith: slotValidation.conflictWith || []
    };
  }


  function clampCyberwareRoll(value = Math.random()) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return Math.random();
    return Math.max(0, Math.min(0.999999, numeric));
  }

  function resolveCyberwareInstallOutcome(preview = {}, forcedRoll = null) {
    const acceptanceChance = Number(preview.acceptanceChance || 0);
    const roll = forcedRoll === null || forcedRoll === undefined
      ? clampCyberwareRoll(Math.random())
      : clampCyberwareRoll(forcedRoll);
    const result = classifyCyberwareRejectionFailure(acceptanceChance, roll);
    const accepted = result === "ACCEPTED" || result === "MINOR_COMPLICATION";
    const failureMargin = Math.max(0, roll - acceptanceChance);
    const conditionPenalty = result === "ACCEPTED"
      ? 0
      : result === "MINOR_COMPLICATION"
        ? 10
        : result === "PARTIAL_REJECTION"
          ? 35
          : result === "SEVERE_REJECTION"
            ? 65
            : 100;
    return {
      roll,
      result,
      accepted,
      failureMargin,
      conditionPenalty,
      installStatus: accepted ? "INSTALLED" : "REJECTED"
    };
  }

  Object.assign(runtime, {
    normalizeCyberwareInstallStatus,
    isCyberwareInventoryStatus,
    isCyberwareRemovedStatus,
    isCyberwareBadStatus,
    isCyberwareInstalledStatus,
    isCyberwareActiveStatus,
    isCyberwareOccupyingStatus,
    normalizeCyberwareLicenseStatus,
    normalizeCyberwareFirmwareStatus,
    isCyberwareLicenseActiveStatus,
    isCyberwareFirmwareCurrentStatus,
    normalizeCyberwareVersion,
    normalizeCyberwareSubscriptionCategory,
    normalizeCyberwareSubscriptionTier,
    getCyberwareSubscriptionTierLevel,
    getCyberwareActiveSubscriptions,
    hasCyberwareRequiredSubscription,
    validateCyberwareAccessForItem,
    getCyberwareCompliancePresentation,
    findCyberwareEquipmentItemIndex,
    normalizeCyberwareMatchTokens,
    getCyberwareIdentityTokens,
    areCyberwareItemsCompatible,
    getCyberwareItemExposedFootprint,
    getCyberwareItemLockedFootprint,
    cyberwareItemMatchesAllowList,
    cyberwareManufacturerMatches,
    cyberwareStandardsMatch,
    isCyberwareSlotExposedByController,
    doesCyberwareControllerAllowChild,
    canCyberwareItemsShareSlot,
    getCyberwarePlacementStatus,
    shouldCyberwareOccupySlots,
    isCyberwareOnline,
    resolveCyberwareRecordSource,
    getCyberwareCoreList,
    selectBestNeurochip,
    selectBestInterface,
    selectBestServicePort,
    getCyberwareNeuralCoreState,
    validateCyberwareNeuralCoreForItem,
    normalizeCyberwareCompatibilityMode,
    normalizeCyberwareMedicalCare,
    normalizeCyberwareSurgeryPresetKey,
    getCyberwareSurgeryPreset,
    normalizeCyberwareProcedureMode,
    normalizeCyberwareSurgeryContext,
    calculateCyberwareProcedureCost,
    calculateCyberwareAcceptanceChance,
    classifyCyberwareRejectionFailure,
    getCyberwarePlacementState,
    getCyberwareSlotState,
    validateCyberwareSlotsForItem,
    getCyberwareRecordList,
    findCyberwareRecordIndex,
    getCyberwareEquipmentSource,
    getCyberwareCoreDependencyBlockers,
    validateCyberwareDeinstallForItem,
    buildCyberwareDeinstallPreview,
    buildCyberwareDeinstallCheckRecord,
    buildCyberwareInstallPreview,
    clampCyberwareRoll,
    resolveCyberwareInstallOutcome,
  });
})();
