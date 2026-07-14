(function initCyberwareActions() {
  window.WS_APP = window.WS_APP || {};
  const runtime = window.WS_APP.cyberwareRuntime = window.WS_APP.cyberwareRuntime || {};
  const buildCyberwareInstallCandidateFromEquipmentItem = (...args) => runtime.buildCyberwareInstallCandidateFromEquipmentItem(...args);
  const buildCyberwareInstallPreview = (...args) => runtime.buildCyberwareInstallPreview(...args);
  const compressCyberwareSlotFootprint = (...args) => runtime.compressCyberwareSlotFootprint(...args);
  const findCyberwareEquipmentItemIndex = (...args) => runtime.findCyberwareEquipmentItemIndex(...args);
  const getCyberwareSlotChildren = (...args) => runtime.getCyberwareSlotChildren(...args);
  const getCyberwareSlotDescendants = (...args) => runtime.getCyberwareSlotDescendants(...args);
  const getCyberwareSlotDisplayGroupKey = (...args) => runtime.getCyberwareSlotDisplayGroupKey(...args);
  const getCyberwareSlotDisplayGroupLabel = (...args) => runtime.getCyberwareSlotDisplayGroupLabel(...args);
  const getCyberwareSlotLevel = (...args) => runtime.getCyberwareSlotLevel(...args);
  const getCyberwareSlotParent = (...args) => runtime.getCyberwareSlotParent(...args);
  const getCyberwareSlotPurposeKey = (...args) => runtime.getCyberwareSlotPurposeKey(...args);
  const getCyberwareSlotPurposeLabel = (...args) => runtime.getCyberwareSlotPurposeLabel(...args);
  const isEquipmentItemCyberwareInstallCandidate = (...args) => runtime.isEquipmentItemCyberwareInstallCandidate(...args);
  const normalizeCyberwareEntry = (...args) => runtime.normalizeCyberwareEntry(...args);
  const normalizeCyberwareFirmwareStatus = (...args) => runtime.normalizeCyberwareFirmwareStatus(...args);
  const normalizeCyberwareLicenseStatus = (...args) => runtime.normalizeCyberwareLicenseStatus(...args);
  const normalizeCyberwareVersion = (...args) => runtime.normalizeCyberwareVersion(...args);
  const resolveCyberwareCandidateSlotsForDrop = (...args) => runtime.resolveCyberwareCandidateSlotsForDrop(...args);
  const summarizeCyberwareSlotLabels = (...args) => runtime.summarizeCyberwareSlotLabels(...args);
  const validateCyberwareAccessForItem = (...args) => runtime.validateCyberwareAccessForItem(...args);
  const validateCyberwareSlotsForItem = (...args) => runtime.validateCyberwareSlotsForItem(...args);
  const CYBERWARE_COMPLIANCE_ACTION_SOURCE = runtime.CYBERWARE_COMPLIANCE_ACTION_SOURCE;
  const CYBERWARE_SLOT_DEFINITIONS = runtime.CYBERWARE_SLOT_DEFINITIONS;

  function getCyberwareActionDateIso() {
    return String(window.WS_APP.getCampaignDateIso?.() || window.WS_APP.CAMPAIGN_DATE_ISO || "2109-02-13").trim();
  }

  function trimCyberwareActionLog(value = [], entry = {}) {
    const source = Array.isArray(value) ? value.filter(Boolean) : [];
    return [...source, entry].slice(-12);
  }

  function buildCyberwareComplianceActionLogEntry(action = "COMPLIANCE_ACTION", statusBefore = "UNKNOWN", statusAfter = "UNKNOWN", extra = {}) {
    return {
      action,
      date: String(extra.date || getCyberwareActionDateIso()).trim(),
      statusBefore,
      statusAfter,
      source: CYBERWARE_COMPLIANCE_ACTION_SOURCE,
      ...extra
    };
  }

  function enrichCyberwareComplianceActionResult(result = {}, action = "COMPLIANCE_ACTION") {
    if (!result || typeof result !== "object") return { ok: false, reason: "NO_ACTION_RESULT", action };
    const item = result.item || result.equipmentItem || null;
    const access = item ? validateCyberwareAccessForItem(result.citizen || {}, item) : null;
    return {
      ...result,
      action,
      access,
      accessValid: access ? access.valid === true : false,
      accessReason: access?.reason || result.reason || "UNKNOWN",
      blockers: Array.isArray(access?.blockers) ? access.blockers : [],
      warnings: Array.isArray(access?.warnings) ? access.warnings : [],
      licenseStatus: item ? normalizeCyberwareLicenseStatus(item.licenseStatus, item.licenseRequired) : result.licenseStatus || "UNKNOWN",
      firmwareStatus: item ? normalizeCyberwareFirmwareStatus(item.firmwareStatus, item.firmwareRequired) : result.firmwareStatus || "UNKNOWN"
    };
  }

  function patchCyberwareEquipmentComplianceFields(item = {}, patch = {}) {
    const nextNested = item.cyberware && typeof item.cyberware === "object" && !Array.isArray(item.cyberware)
      ? { ...item.cyberware, ...patch }
      : null;
    return nextNested ? { ...item, ...patch, cyberware: nextNested } : { ...item, ...patch };
  }

  function updateCyberwareEquipmentCompliance(citizenId = "", equipmentItemId = "", patch = {}, action = "COMPLIANCE_UPDATE") {
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || !equipmentItemId || !patch || typeof patch !== "object" || Array.isArray(patch)) {
      return { ok: false, reason: "INVALID_COMPLIANCE_UPDATE_REQUEST" };
    }
    const rawItems = typeof window.WS_APP.getCitizenEquipmentItemInstanceViews === "function"
      ? window.WS_APP.getCitizenEquipmentItemInstanceViews(citizenId)
      : [];
    const equipmentIndex = findCyberwareEquipmentItemIndex(rawItems, equipmentItemId);
    if (equipmentIndex < 0) return { ok: false, reason: "EQUIPMENT_ITEM_NOT_FOUND" };
    const equipmentItem = rawItems[equipmentIndex];
    if (!isEquipmentItemCyberwareInstallCandidate(equipmentItem)) return { ok: false, reason: "EQUIPMENT_ITEM_NOT_CYBERWARE" };
    const updatedItem = patchCyberwareEquipmentComplianceFields(equipmentItem, patch);
    const commit = window.WS_APP.updateItemInstanceFromView?.(citizenId, updatedItem, {
      source: action
    });
    const resultView = commit?.ok
      ? window.WS_APP.getItemInstanceView?.(updatedItem.instanceId || updatedItem.id) || updatedItem
      : updatedItem;
    const resultItem = buildCyberwareInstallCandidateFromEquipmentItem(resultView, { index: equipmentIndex }) || resultView;
    return enrichCyberwareComplianceActionResult({
      ok: commit?.ok === true,
      reason: commit?.ok ? action : commit?.reason || "ITEM_INSTANCE_UPDATE_FAILED",
      item: resultItem,
      equipmentItem: resultView,
      citizen
    }, action);
  }

  function activateCyberwareEquipmentLicense(citizenId = "", equipmentItemId = "", options = {}) {
    const linker = window.WS_APP.linkCyberwareLicense;
    if (typeof linker !== "function") return { ok: false, reason: "CYBERWARE_AUTHORIZATION_UNAVAILABLE" };
    const result = linker(citizenId, equipmentItemId, options.licenseId || "");
    const item = result?.item || window.WS_APP.getItemInstanceView?.(equipmentItemId) || null;
    return enrichCyberwareComplianceActionResult({
      ...result,
      item,
      equipmentItem: item,
      citizen: window.WS_APP.getCitizenById?.(citizenId) || null
    }, result?.ok ? "LICENSE_LINKED" : "LICENSE_LINK_FAILED");
  }

  function updateCyberwareEquipmentFirmware(citizenId = "", equipmentItemId = "", options = {}) {
    const updater = window.WS_APP.installCyberwareFirmware;
    if (typeof updater !== "function") return { ok: false, reason: "CYBERWARE_AUTHORIZATION_UNAVAILABLE" };
    const result = updater(citizenId, equipmentItemId, {
      channel: options.firmwareChannel || options.channel,
      version: options.firmwareVersion || options.version,
      releaseId: options.releaseId,
      source: options.source || "EQUIPMENT_FIRMWARE_ACTION",
      deferPersistence: options.deferPersistence !== false
    });
    const item = result?.item || window.WS_APP.getItemInstanceView?.(equipmentItemId) || null;
    return enrichCyberwareComplianceActionResult({
      ...result,
      item,
      equipmentItem: item,
      citizen: window.WS_APP.getCitizenById?.(citizenId) || null
    }, result?.ok ? "FIRMWARE_UPDATED" : "FIRMWARE_UPDATE_FAILED");
  }

  function getRawCyberwareArray(citizen = {}) {
    const citizenId = String(citizen?.id || citizen?.citizenId || "").trim();
    return citizenId && typeof window.WS_APP.getInstalledCyberwareInstanceViews === "function"
      ? window.WS_APP.getInstalledCyberwareInstanceViews(citizenId)
      : [];
  }

  function findCyberwareArrayItemIndex(items = [], cyberwareItemId = "") {
    const target = String(cyberwareItemId || "").trim();
    if (!target) return -1;
    return items.findIndex((entry) => {
      if (!entry || typeof entry !== "object") return false;
      return [entry.instanceId, entry.id, entry.itemId].some((value) => String(value || "").trim() === target);
    });
  }

  function updateInstalledCyberwareCompliance(citizenId = "", cyberwareItemId = "", patch = {}, action = "COMPLIANCE_UPDATE") {
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || !cyberwareItemId || !patch || typeof patch !== "object" || Array.isArray(patch)) {
      return { ok: false, reason: "INVALID_COMPLIANCE_UPDATE_REQUEST" };
    }
    const rawItems = getRawCyberwareArray(citizen);
    const itemIndex = findCyberwareArrayItemIndex(rawItems, cyberwareItemId);
    if (itemIndex < 0) return { ok: false, reason: "CYBERWARE_ITEM_NOT_FOUND" };
    const currentItem = rawItems[itemIndex];
    const normalized = normalizeCyberwareEntry({ ...currentItem, ...patch }, itemIndex);
    if (!normalized) return { ok: false, reason: "CYBERWARE_ITEM_NORMALIZE_FAILED" };
    const nextItem = { ...currentItem, ...normalized, ...patch };
    const commit = window.WS_APP.updateItemInstanceFromView?.(citizenId, nextItem, {
      source: action
    });
    const resultView = commit?.ok
      ? window.WS_APP.getItemInstanceView?.(nextItem.instanceId || nextItem.id) || nextItem
      : nextItem;
    const resultItem = normalizeCyberwareEntry(resultView, itemIndex) || resultView;
    return enrichCyberwareComplianceActionResult({
      ok: commit?.ok === true,
      reason: commit?.ok ? action : commit?.reason || "ITEM_INSTANCE_UPDATE_FAILED",
      item: resultItem,
      citizen
    }, action);
  }

  function activateInstalledCyberwareLicense(citizenId = "", cyberwareItemId = "", options = {}) {
    return activateCyberwareEquipmentLicense(citizenId, cyberwareItemId, options);
  }

  function updateInstalledCyberwareFirmware(citizenId = "", cyberwareItemId = "", options = {}) {
    return updateCyberwareEquipmentFirmware(citizenId, cyberwareItemId, options);
  }

  function buildCyberwareDragPayload(item = {}) {
    const normalized = normalizeCyberwareEntry(item, 0);
    if (!normalized) return null;
    return {
      type: "CYBERWARE",
      id: normalized.id,
      name: normalized.name,
      scale: normalized.scale,
      primarySlot: normalized.primarySlot,
      targetSlot: normalized.targetSlot || normalized.primarySlot,
      slotLevel: normalized.slotLevel,
      descendantPolicy: normalized.descendantPolicy,
      exposedSlots: [...(normalized.exposedSlots || [])],
      lockedDescendants: [...(normalized.lockedDescendants || [])],
      acceptedChildGroups: [...(normalized.acceptedChildGroups || [])],
      acceptedManufacturers: [...(normalized.acceptedManufacturers || [])],
      acceptedStandards: [...(normalized.acceptedStandards || [])],
      slots: [...normalized.slots],
      compressedSlots: compressCyberwareSlotFootprint(normalized.slots),
      slotsGroupedLabel: normalized.slotsGroupedLabel || summarizeCyberwareSlotLabels(normalized.slots),
      slotCost: normalized.slotCost,
      customizationSlots: normalized.customizationSlots,
      neuroLoad: normalized.neuroLoad,
      interfaceLoad: normalized.interfaceLoad,
      requiresNeurochipTier: normalized.requiresNeurochipTier,
      requiresInterfaceTier: normalized.requiresInterfaceTier,
      requiredBuses: [...normalized.requiredBuses],
      grade: normalized.grade,
      compatibilityGroup: normalized.compatibilityGroup,
      compatibleWith: [...normalized.compatibleWith],
      vendorLocked: normalized.vendorLocked,
      sourceType: normalized.sourceType || item.sourceType || "",
      instanceId: normalized.instanceId || normalized.id || item.instanceId || item.id || ""
    };
  }


  function getRelevantCyberwareDropSlotDefinitions(normalized = {}, options = {}) {
    if (!normalized || !Array.isArray(normalized.slots) || !normalized.slots.length) return [];
    const occupied = new Set(normalized.slots);
    const compressed = compressCyberwareSlotFootprint(normalized.slots);
    if (options.strictPlacement === true) {
      const declaredCompatible = Array.isArray(normalized.compatibleSlots) ? normalized.compatibleSlots : [];
      const strictRoots = new Set(declaredCompatible.length ? declaredCompatible : (compressed.length ? compressed : normalized.slots));
      return CYBERWARE_SLOT_DEFINITIONS.filter((slot) => strictRoots.has(slot.key));
    }
    const purposes = new Set(compressed.map(getCyberwareSlotPurposeKey));
    const levels = new Set(compressed.map(getCyberwareSlotLevel));
    const mirrored = new Set();
    const sourceSides = [...new Set(normalized.slots.map((slotKey) => String(runtime.getCyberwareSlotSide?.(slotKey) || "").trim()).filter(Boolean))];
    if (sourceSides.length === 1) {
      const targetSide = sourceSides[0] === "LEFT" ? "right" : "left";
      const mirror = typeof runtime.mirrorCyberwareSlotsToSide === "function"
        ? runtime.expandCyberwareSlotFootprint(runtime.mirrorCyberwareSlotsToSide(compressed, targetSide))
        : [];
      mirror.forEach((slotKey) => mirrored.add(slotKey));
    }
    return CYBERWARE_SLOT_DEFINITIONS.filter((slot) => {
      const descendants = getCyberwareSlotDescendants(slot.key, true);
      if (occupied.has(slot.key) || descendants.some((key) => occupied.has(key))) return true;
      if (mirrored.has(slot.key) || descendants.some((key) => mirrored.has(key))) return true;
      if (compressed.length !== 1) return false;
      const purpose = getCyberwareSlotPurposeKey(slot.key);
      const level = getCyberwareSlotLevel(slot.key);
      if (!purposes.has(purpose)) return false;
      if (normalized.scale === "SMALL" && level === "SMALL") return true;
      return levels.has(level);
    });
  }
  function getCyberwareDropTargets(citizenOrList = {}, item = {}, options = {}) {
    const normalized = normalizeCyberwareEntry(item, 0);
    const definitions = normalized && options.relevantOnly === true
      ? getRelevantCyberwareDropSlotDefinitions(normalized, options)
      : CYBERWARE_SLOT_DEFINITIONS;
    const installedList = Array.isArray(options.installedList) ? options.installedList : null;
    const baseCore = options.baseCore || (installedList && typeof runtime.getCyberwareNeuralCoreState === "function" ? runtime.getCyberwareNeuralCoreState(installedList) : null);
    return definitions.map((slot) => {
      const candidateSlots = normalized ? resolveCyberwareCandidateSlotsForDrop(normalized, slot.key) : [];
      const slotIsUsedByImplant = normalized ? candidateSlots.includes(slot.key) : false;
      const validation = normalized && slotIsUsedByImplant
        ? validateCyberwareSlotsForItem(citizenOrList, { ...normalized, primarySlot: slot.key }, candidateSlots, { installedList, baseCore })
        : { valid: false, reason: normalized ? "SLOT_NOT_IN_IMPLANT_OCCUPIED_SET" : "INVALID_ITEM", conflictSlots: [] };
      const preview = normalized && slotIsUsedByImplant && options.includePreview !== false
        ? buildCyberwareInstallPreview(citizenOrList, { ...normalized, primarySlot: slot.key }, { ...options, primarySlot: slot.key, candidateSlots, installedList, baseCore })
        : null;
      return {
        key: slot.key,
        label: slot.label,
        group: slot.group || "",
        level: getCyberwareSlotLevel(slot.key),
        slotLevel: getCyberwareSlotLevel(slot.key),
        parent: getCyberwareSlotParent(slot.key),
        children: getCyberwareSlotChildren(slot.key),
        descendantKeys: getCyberwareSlotDescendants(slot.key, false),
        displayGroup: getCyberwareSlotDisplayGroupKey(slot.key),
        displayGroupLabel: getCyberwareSlotDisplayGroupLabel(slot.key),
        purpose: getCyberwareSlotPurposeKey(slot.key),
        purposeLabel: getCyberwareSlotPurposeLabel(slot.key),
        side: slot.side || "",
        accepts: [...slot.accepts],
        candidateSlots,
        usedByImplant: Boolean(slotIsUsedByImplant),
        valid: validation.valid,
        status: preview?.status || (validation.valid ? "VALID" : "BLOCKED"),
        reason: validation.reason,
        conflictSlots: validation.conflictSlots || [],
        acceptanceChance: preview?.acceptanceChance ?? null,
        rejectionChance: preview?.rejectionChance ?? null
      };
    });
  }


  Object.assign(runtime, {
    getCyberwareActionDateIso,
    trimCyberwareActionLog,
    buildCyberwareComplianceActionLogEntry,
    enrichCyberwareComplianceActionResult,
    patchCyberwareEquipmentComplianceFields,
    updateCyberwareEquipmentCompliance,
    activateCyberwareEquipmentLicense,
    updateCyberwareEquipmentFirmware,
    getRawCyberwareArray,
    findCyberwareArrayItemIndex,
    updateInstalledCyberwareCompliance,
    activateInstalledCyberwareLicense,
    updateInstalledCyberwareFirmware,
    buildCyberwareDragPayload,
    getRelevantCyberwareDropSlotDefinitions,
    getCyberwareDropTargets,
  });
})();
