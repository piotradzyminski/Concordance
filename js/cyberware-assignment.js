(function initCyberwareAssignment() {
  window.WS_APP = window.WS_APP || {};
  const runtime = window.WS_APP.cyberwareRuntime = window.WS_APP.cyberwareRuntime || {};
  const buildCyberwareDeinstallCheckRecord = (...args) => runtime.buildCyberwareDeinstallCheckRecord(...args);
  const buildCyberwareDeinstallPreview = (...args) => runtime.buildCyberwareDeinstallPreview(...args);
  const buildCyberwareInstallCandidateFromEquipmentItem = (...args) => runtime.buildCyberwareInstallCandidateFromEquipmentItem(...args);
  const buildCyberwareInstallPreview = (...args) => runtime.buildCyberwareInstallPreview(...args);
  const findCyberwareEquipmentItemIndex = (...args) => runtime.findCyberwareEquipmentItemIndex(...args);
  const findCyberwareRecordIndex = (...args) => runtime.findCyberwareRecordIndex(...args);
  const getCyberwareRecordList = (...args) => runtime.getCyberwareRecordList(...args);
  const isEquipmentItemCyberwareInstallCandidate = (...args) => runtime.isEquipmentItemCyberwareInstallCandidate(...args);
  const normalizeCyberwareCompatibilityMode = (...args) => runtime.normalizeCyberwareCompatibilityMode(...args);
  const normalizeCyberwareEntry = (...args) => runtime.normalizeCyberwareEntry(...args);
  const normalizeCyberwareEquipmentStatus = (...args) => runtime.normalizeCyberwareEquipmentStatus(...args);
  const normalizeCyberwareMedicalCare = (...args) => runtime.normalizeCyberwareMedicalCare(...args);
  const normalizeCyberwareSlotKey = (...args) => runtime.normalizeCyberwareSlotKey(...args);
  const normalizeCyberwareSlotList = (...args) => runtime.normalizeCyberwareSlotList(...args);
  const resolveCyberwareCandidateSlotsForDrop = (...args) => runtime.resolveCyberwareCandidateSlotsForDrop(...args);
  const resolveCyberwareInstallOutcome = (...args) => runtime.resolveCyberwareInstallOutcome(...args);

  function getEquipmentViews(citizenId = "") {
    return typeof window.WS_APP.getCitizenEquipmentItemInstanceViews === "function"
      ? window.WS_APP.getCitizenEquipmentItemInstanceViews(citizenId)
      : [];
  }

  function getStableInstanceId(item = {}, fallback = "") {
    return String(item.instanceId || item.id || item.itemId || fallback || "").trim();
  }

  function sanitizeCanonicalItemView(source = {}) {
    const next = { ...source };
    [
      "locationData", "locationType", "locationState", "rawLocation", "placementSource", "effectiveFootprint",
      "isStored", "isInGrid", "isEquipped", "isOrphan", "isLocated", "isCarried", "isPacked",
      "gridX", "gridY", "column", "row"
    ].forEach((key) => delete next[key]);
    return next;
  }

  function resolveReturnDestination(citizen = {}, item = {}, options = {}) {
    const requested = options.returnDestination && typeof options.returnDestination === "object" ? options.returnDestination : null;
    if (!requested || String(requested.type || "").trim().toUpperCase() !== "HOUSING_STORAGE") return null;
    const storageUnitId = String(requested.storageUnitId || "").trim();
    if (!storageUnitId || typeof window.WS_APP.findFirstEquipmentHousingPlacementForItem !== "function") return null;
    const placement = window.WS_APP.findFirstEquipmentHousingPlacementForItem(citizen, item, storageUnitId, {
      excludeItemId: String(options.excludeHousingItemId || requested.excludeItemId || "").trim(),
      rotation: requested.rotation
    });
    if (!placement) return null;
    return { type: "HOUSING_STORAGE", storageUnitId, gridX: placement.column, gridY: placement.row, rotation: placement.rotation };
  }

  function buildStoredInstanceView(item = {}, destination = {}, check = {}, extra = {}) {
    const instanceId = getStableInstanceId(item);
    const next = sanitizeCanonicalItemView({ ...item, ...extra });
    return {
      ...next,
      instanceId,
      id: instanceId,
      itemId: instanceId,
      lifecycleState: "STORED",
      status: "OWNED",
      operatingStatus: "PACKAGED",
      location: { ...destination },
      cyberwareState: {
        ...(next.cyberwareState && typeof next.cyberwareState === "object" ? next.cyberwareState : {}),
        installedCharacterId: "",
        installedBodySlots: []
      },
      equippedLocation: null,
      containerHostId: "",
      containerPlacement: null,
      storageUnitId: destination.storageUnitId,
      housingPlacement: { storageUnitId: destination.storageUnitId, column: destination.gridX, row: destination.gridY, rotation: destination.rotation || 0 },
      bodySlots: [],
      slots: [],
      slot: "",
      primarySlot: "",
      removedAt: check.timestamp || check.at || new Date().toISOString()
    };
  }

  function buildCyberwareInstallCheckRecordFromEquipment(preview = {}, outcome = {}, options = {}) {
    return {
      ...buildCyberwareInstallCheckRecord(preview, outcome, options),
      source: "ITEM_INSTANCE_FOUNDATION_6.1x",
      sourceType: "ITEM_INSTANCE",
      itemInstanceId: String(options.itemInstanceId || options.instanceId || "").trim()
    };
  }

  function buildInstalledInstanceView(equipmentItem = {}, candidate = {}, preview = {}, outcome = {}, check = {}, options = {}) {
    const instanceId = getStableInstanceId(equipmentItem);
    const primarySlot = normalizeCyberwareSlotKey(options.primarySlot || options.slotKey || candidate.primarySlot || candidate.slot || candidate.slots?.[0]) || candidate.primarySlot || candidate.slots?.[0] || "";
    const candidateSlots = normalizeCyberwareSlotList(preview.occupiedSlots?.length ? preview.occupiedSlots : options.candidateSlots || options.slots || candidate.slots || candidate.slot, primarySlot ? [primarySlot] : candidate.slots || []);
    const baseCondition = Number.isFinite(Number(equipmentItem.condition)) ? Number(equipmentItem.condition) : 100;
    const nextCondition = Math.max(0, Math.min(100, baseCondition - Number(outcome.conditionPenalty || 0)));
    const merged = sanitizeCanonicalItemView({ ...equipmentItem, ...candidate });
    const accepted = outcome.accepted === true;
    const ownerId = String(options.characterId || equipmentItem.ownerId || "").trim();
    const serviceId = accepted ? "" : `cyberware-install-${instanceId}-${Date.now().toString(36)}`;
    const productTier = Number(candidate.productTier ?? candidate.tier ?? 0) || 0;
    return {
      ...merged,
      instanceId,
      id: instanceId,
      itemId: instanceId,
      definitionId: equipmentItem.definitionId || equipmentItem.catalogId || candidate.definitionId || candidate.catalogId || "",
      catalogId: equipmentItem.definitionId || equipmentItem.catalogId || candidate.definitionId || candidate.catalogId || "",
      primarySlot,
      slot: primarySlot,
      slots: candidateSlots,
      bodySlots: candidateSlots,
      lifecycleState: accepted ? "INSTALLED" : "IN_SERVICE",
      status: accepted ? "INSTALLED" : "REJECTED",
      operatingStatus: accepted ? "INSTALLED" : "DAMAGED",
      location: accepted ? { type: "BODY", characterId: ownerId, bodySlots: candidateSlots } : { type: "SERVICE", characterId: ownerId, serviceId },
      tier: productTier,
      productTier,
      x: null,
      y: null,
      equippedLocation: null,
      containerHostId: "",
      containerPlacement: null,
      storageUnitId: "",
      housingPlacement: null,
      lastImplantCheck: check,
      installLog: [...(Array.isArray(equipmentItem.installLog) ? equipmentItem.installLog : []), check].slice(-12),
      condition: nextCondition
    };
  }

  function commitCyberwareInstallFromEquipment(citizenId = "", equipmentItemId = "", options = {}) {
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || !equipmentItemId) return { ok: false, reason: "CITIZEN_OR_EQUIPMENT_ITEM_MISSING" };
    const rawItems = getEquipmentViews(citizenId);
    const equipmentIndex = findCyberwareEquipmentItemIndex(rawItems, equipmentItemId);
    if (equipmentIndex < 0) return { ok: false, reason: "EQUIPMENT_ITEM_NOT_FOUND" };
    const equipmentItem = rawItems[equipmentIndex];
    if (!isEquipmentItemCyberwareInstallCandidate(equipmentItem)) return { ok: false, reason: "EQUIPMENT_ITEM_NOT_CYBERWARE" };
    const sourceStatus = normalizeCyberwareEquipmentStatus(equipmentItem.status || "OWNED");
    if (["INSTALLED", "REMOVED", "CONSUMED", "ARCHIVED"].includes(sourceStatus)) return { ok: false, reason: `EQUIPMENT_ITEM_${sourceStatus}` };

    const candidate = buildCyberwareInstallCandidateFromEquipmentItem(equipmentItem, options);
    if (!candidate) return { ok: false, reason: "CYBERWARE_CANDIDATE_BUILD_FAILED" };
    const primarySlot = normalizeCyberwareSlotKey(options.primarySlot || options.slotKey || candidate.primarySlot || candidate.slot || candidate.slots?.[0]) || candidate.primarySlot || candidate.slots?.[0] || "";
    const candidateSlots = normalizeCyberwareSlotList(options.candidateSlots || options.slots || candidate.slots || candidate.slot, primarySlot ? [primarySlot] : candidate.slots || []);
    const preview = buildCyberwareInstallPreview(citizen, candidate, { ...options, primarySlot, candidateSlots, intentStatus: "INSTALLED" });
    if (!preview.valid) return { ok: false, reason: preview.reason || "CYBERWARE_INSTALL_BLOCKED", preview, item: candidate, equipmentItem };

    const outcome = resolveCyberwareInstallOutcome(preview, options.roll);
    const check = buildCyberwareInstallCheckRecordFromEquipment(preview, outcome, { ...options, itemInstanceId: getStableInstanceId(equipmentItem, equipmentItemId) });
    const nextView = buildInstalledInstanceView(equipmentItem, candidate, preview, outcome, check, { ...options, primarySlot, candidateSlots });
    const commit = window.WS_APP.updateItemInstanceFromView?.(citizenId, nextView, { source: "CYBERWARE_INSTALL", deferPersistence: options.deferPersistence === true });
    const resultView = commit?.ok ? window.WS_APP.getItemInstanceView?.(nextView.instanceId) || nextView : nextView;
    const resultItem = normalizeCyberwareEntry(resultView, 0) || resultView;
    return {
      ok: commit?.ok === true,
      reason: commit?.ok ? outcome.result : commit?.reason || "ITEM_INSTANCE_UPDATE_FAILED",
      accepted: outcome.accepted,
      outcome,
      check,
      preview,
      item: resultItem,
      equipmentItem: resultView,
      citizen: commit?.ok ? citizen : null
    };
  }

  function commitCyberwareDeinstallPlan(citizenId = "", itemId = "", options = {}) {
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || !itemId) return { ok: false, reason: "CITIZEN_OR_ITEM_MISSING" };
    const list = getCyberwareRecordList(citizen);
    const index = findCyberwareRecordIndex(list, itemId);
    if (index < 0) return { ok: false, reason: "CYBERWARE_ITEM_NOT_FOUND" };
    const item = list[index];
    const preview = buildCyberwareDeinstallPreview(citizen, item, options);
    if (!preview.valid) return { ok: false, reason: preview.reason || "CYBERWARE_DEINSTALL_BLOCKED", preview, item };
    const destination = resolveReturnDestination(citizen, item, options);
    if (!destination) return { ok: false, reason: "RETURN_LOCATION_REQUIRED", preview, item };
    const check = buildCyberwareDeinstallCheckRecord(item, preview, { ...options, operation: "DEINSTALL", result: "DEINSTALLED" });
    const nextView = buildStoredInstanceView(item, destination, check, { lastDeinstallCheck: check, deinstallLog: [...(Array.isArray(item.deinstallLog) ? item.deinstallLog : []), check].slice(-12) });
    const instanceId = getStableInstanceId(item, itemId);
    const commit = window.WS_APP.updateItemInstanceFromView?.(citizenId, nextView, { source: "CYBERWARE_DEINSTALL", deferPersistence: options.deferPersistence === true });
    const resultView = commit?.ok ? window.WS_APP.getItemInstanceView?.(instanceId) || nextView : nextView;
    return { ok: commit?.ok === true, reason: commit?.ok ? "DEINSTALLED" : commit?.reason || "ITEM_INSTANCE_UPDATE_FAILED", operation: "DEINSTALL", accepted: commit?.ok === true, preview, check, returnDestination: destination, item: normalizeCyberwareEntry(resultView, index) || resultView, citizen: commit?.ok ? citizen : null };
  }

  function commitCyberwareReplaceFromEquipment(citizenId = "", equipmentItemId = "", targetItemId = "", options = {}) {
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || !equipmentItemId || !targetItemId) return { ok: false, reason: "CITIZEN_EQUIPMENT_OR_TARGET_MISSING" };
    const rawItems = getEquipmentViews(citizenId);
    const equipmentIndex = findCyberwareEquipmentItemIndex(rawItems, equipmentItemId);
    if (equipmentIndex < 0) return { ok: false, reason: "EQUIPMENT_ITEM_NOT_FOUND" };
    const equipmentItem = rawItems[equipmentIndex];
    if (!isEquipmentItemCyberwareInstallCandidate(equipmentItem)) return { ok: false, reason: "EQUIPMENT_ITEM_NOT_CYBERWARE" };

    const list = getCyberwareRecordList(citizen);
    const targetIndex = findCyberwareRecordIndex(list, targetItemId);
    if (targetIndex < 0) return { ok: false, reason: "REPLACE_TARGET_NOT_FOUND" };
    const targetItem = list[targetIndex];
    const deinstallPreview = buildCyberwareDeinstallPreview(citizen, targetItem, options);
    if (!deinstallPreview.valid) return { ok: false, reason: deinstallPreview.reason || "REPLACE_TARGET_DEINSTALL_BLOCKED", deinstallPreview, targetItem };

    const deinstallCheckSeed = buildCyberwareDeinstallCheckRecord(targetItem, deinstallPreview, {
      ...options,
      operation: "REPLACE",
      result: "REPLACED_OUT",
      replacementItemInstanceId: getStableInstanceId(equipmentItem, equipmentItemId)
    });
    const targetInstanceId = getStableInstanceId(targetItem, targetItemId);
    const destination = resolveReturnDestination(citizen, targetItem, { ...options, excludeHousingItemId: getStableInstanceId(equipmentItem, equipmentItemId) });
    if (!destination) return { ok: false, reason: "RETURN_LOCATION_REQUIRED", deinstallPreview, targetItem };
    const removedTarget = buildStoredInstanceView(targetItem, destination, deinstallCheckSeed, {
      replacedByItemInstanceId: getStableInstanceId(equipmentItem, equipmentItemId),
      lastDeinstallCheck: deinstallCheckSeed,
      deinstallLog: [...(Array.isArray(targetItem.deinstallLog) ? targetItem.deinstallLog : []), deinstallCheckSeed].slice(-12)
    });
    const listAfterRemoval = list.filter((entry, entryIndex) => entryIndex !== targetIndex);
    const candidate = buildCyberwareInstallCandidateFromEquipmentItem(equipmentItem, options);
    if (!candidate) return { ok: false, reason: "CYBERWARE_CANDIDATE_BUILD_FAILED", deinstallPreview, targetItem };
    const primarySlot = normalizeCyberwareSlotKey(options.primarySlot || options.slotKey || candidate.primarySlot || candidate.slot || candidate.slots?.[0]) || candidate.primarySlot || candidate.slots?.[0] || "";
    const candidateSlots = normalizeCyberwareSlotList(options.candidateSlots || options.slots || candidate.slots || candidate.slot, primarySlot ? [primarySlot] : candidate.slots || []);
    const previewCitizen = { ...citizen, cyberwarePreviewList: listAfterRemoval };
    const installPreview = buildCyberwareInstallPreview(previewCitizen, candidate, { ...options, primarySlot, candidateSlots, intentStatus: "INSTALLED" });
    if (!installPreview.valid) return { ok: false, reason: installPreview.reason || "REPLACEMENT_INSTALL_BLOCKED", deinstallPreview, preview: installPreview, item: candidate, targetItem };

    const outcome = resolveCyberwareInstallOutcome(installPreview, options.roll);
    const installCheck = buildCyberwareInstallCheckRecordFromEquipment(installPreview, outcome, {
      ...options,
      operation: "REPLACE",
      itemInstanceId: getStableInstanceId(equipmentItem, equipmentItemId)
    });
    const targetReplacementCheck = { ...deinstallCheckSeed, replacementItemInstanceId: outcome.accepted ? getStableInstanceId(equipmentItem, equipmentItemId) : "" };
    removedTarget.lastDeinstallCheck = targetReplacementCheck;
    removedTarget.deinstallLog = [...(Array.isArray(targetItem.deinstallLog) ? targetItem.deinstallLog : []), targetReplacementCheck].slice(-12);
    const nextEquipmentView = buildInstalledInstanceView(equipmentItem, candidate, installPreview, outcome, installCheck, { ...options, primarySlot, candidateSlots });
    nextEquipmentView.replacedItemInstanceId = targetInstanceId;

    const commit = window.WS_APP.updateItemInstancesFromViews?.(citizenId, [removedTarget, nextEquipmentView], { source: "CYBERWARE_REPLACE", deferPersistence: options.deferPersistence === true });
    const resultTarget = commit?.ok ? window.WS_APP.getItemInstanceView?.(targetInstanceId) || removedTarget : removedTarget;
    const resultInstalled = commit?.ok ? window.WS_APP.getItemInstanceView?.(nextEquipmentView.instanceId) || nextEquipmentView : nextEquipmentView;
    return {
      ok: commit?.ok === true,
      reason: commit?.ok ? (outcome.accepted ? "REPLACED" : outcome.result) : commit?.reason || "ITEM_INSTANCE_BATCH_UPDATE_FAILED",
      operation: "REPLACE",
      accepted: outcome.accepted,
      outcome,
      check: installCheck,
      deinstallCheck: targetReplacementCheck,
      preview: installPreview,
      deinstallPreview,
      returnDestination: destination,
      item: outcome.accepted ? normalizeCyberwareEntry(resultInstalled, 0) || resultInstalled : null,
      targetItem: normalizeCyberwareEntry(resultTarget, targetIndex) || resultTarget,
      equipmentItem: resultInstalled,
      citizen: commit?.ok ? citizen : null
    };
  }

  function buildCyberwareInstallCheckRecord(preview = {}, outcome = {}, options = {}) {
    const acceptance = preview.acceptance || {};
    const now = options.timestamp || new Date().toISOString();
    return {
      at: now,
      source: "ITEM_INSTANCE_FOUNDATION_6.1x",
      result: outcome.result || "UNKNOWN",
      accepted: outcome.accepted === true,
      roll: Number(outcome.roll || 0),
      acceptanceChance: Number(preview.acceptanceChance || 0),
      rejectionChance: Number(preview.rejectionChance || 1),
      failureMargin: Number(outcome.failureMargin || 0),
      conditionPenalty: Number(outcome.conditionPenalty || 0),
      surgeonSkill: acceptance.surgeonSkill ?? options.surgeonSkill ?? 5,
      medicalCare: acceptance.medicalCare || normalizeCyberwareMedicalCare(options.medicalCare || "CLINIC"),
      compatibility: acceptance.compatibility || normalizeCyberwareCompatibilityMode(options.compatibility || "MATCHED"),
      provider: preview.surgeryContext?.provider || options.provider || "LOCAL_CLINIC",
      procedureMode: preview.surgeryContext?.procedureMode || options.procedureMode || "STANDARD",
      surgeryPreset: preview.surgeryContext?.surgeryPreset || options.surgeryPreset || "LOCAL_CLINIC",
      procedureCost: Number(preview.procedureCost?.finalCost || options.procedureCost || 0),
      currency: preview.procedureCost?.currency || "ENCODED_CREDITS",
      occupiedSlots: Array.isArray(preview.occupiedSlots) ? [...preview.occupiedSlots] : [],
      blockers: Array.isArray(preview.blockers) ? [...preview.blockers] : [],
      warnings: Array.isArray(preview.warnings) ? [...preview.warnings] : []
    };
  }

  function commitCyberwareInstallPlan(citizenId = "", itemId = "", options = {}) {
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || !itemId) return { ok: false, reason: "CITIZEN_OR_ITEM_MISSING" };
    const list = getCyberwareRecordList(citizen);
    const index = findCyberwareRecordIndex(list, itemId);
    if (index < 0) return { ok: false, reason: "CYBERWARE_ITEM_NOT_FOUND" };
    const item = list[index];
    const primarySlot = normalizeCyberwareSlotKey(options.primarySlot || options.slotKey || item.primarySlot || item.slot || item.slots?.[0]) || item.primarySlot || item.slots?.[0] || "";
    const candidateSlots = options.candidateSlots || options.slots
      ? normalizeCyberwareSlotList(options.candidateSlots || options.slots, primarySlot ? [primarySlot] : item.slots || [])
      : resolveCyberwareCandidateSlotsForDrop(item, primarySlot);
    const preview = buildCyberwareInstallPreview(citizen, item, { ...options, primarySlot, candidateSlots, intentStatus: "INSTALLED" });
    if (!preview.valid) return { ok: false, reason: preview.reason || "CYBERWARE_INSTALL_BLOCKED", preview, item };

    const outcome = resolveCyberwareInstallOutcome(preview, options.roll);
    const check = buildCyberwareInstallCheckRecord(preview, outcome, options);
    const instanceId = getStableInstanceId(item, itemId);
    const nextView = buildInstalledInstanceView(item, item, preview, outcome, check, { ...options, primarySlot, candidateSlots });
    nextView.instanceId = instanceId;
    nextView.id = instanceId;
    nextView.itemId = instanceId;
    const commit = window.WS_APP.updateItemInstanceFromView?.(citizenId, nextView, { source: "CYBERWARE_INSTALL_PLAN", deferPersistence: options.deferPersistence === true });
    const resultView = commit?.ok ? window.WS_APP.getItemInstanceView?.(instanceId) || nextView : nextView;
    return {
      ok: commit?.ok === true,
      reason: commit?.ok ? outcome.result : commit?.reason || "ITEM_INSTANCE_UPDATE_FAILED",
      accepted: outcome.accepted,
      outcome,
      check,
      preview,
      item: normalizeCyberwareEntry(resultView, index) || resultView,
      citizen: commit?.ok ? citizen : null
    };
  }

  Object.assign(runtime, {
    buildCyberwareInstallCheckRecordFromEquipment,
    commitCyberwareInstallFromEquipment,
    commitCyberwareDeinstallPlan,
    commitCyberwareReplaceFromEquipment,
    buildCyberwareInstallCheckRecord,
    commitCyberwareInstallPlan
  });
})();
