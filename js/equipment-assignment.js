window.WS_APP = window.WS_APP || {};

(function initEquipmentAssignment() {
  const ASSIGNMENT_CONTRACT_VERSION = "5.1x";
  const cloneValue = window.WS_APP.cloneEquipmentValue || ((value) => JSON.parse(JSON.stringify(value ?? null)));

  function makeResult(ok = false, code = "UNKNOWN", message = "", details = {}) {
    return { ok: Boolean(ok), code: String(code || "UNKNOWN"), message: String(message || ""), details: details && typeof details === "object" && !Array.isArray(details) ? details : {} };
  }

  function normalizeToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function normalizeAnchor(value = "") {
    return typeof window.WS_APP.normalizeEquipmentBodyRegionKey === "function" ? window.WS_APP.normalizeEquipmentBodyRegionKey(value) : normalizeToken(value);
  }

  function normalizeLayer(value = "") {
    return typeof window.WS_APP.normalizeEquipmentBodyLayerKey === "function" ? window.WS_APP.normalizeEquipmentBodyLayerKey(value) : normalizeToken(value);
  }

  function getCitizenFromInput(citizenOrId = {}) {
    if (citizenOrId && typeof citizenOrId === "object" && !Array.isArray(citizenOrId) && citizenOrId.id) return citizenOrId;
    const citizenId = String(citizenOrId?.id || citizenOrId || "").trim();
    return citizenId && typeof window.WS_APP.getCitizenById === "function" ? window.WS_APP.getCitizenById(citizenId) : null;
  }

  function getRawEquipmentItems(citizen = {}) {
    return typeof window.WS_APP.getCitizenEquipmentItemInstanceViews === "function"
      ? window.WS_APP.getCitizenEquipmentItemInstanceViews(citizen?.id || "")
      : [];
  }

  function findRawItemIndex(rawItems = [], itemId = "") {
    const id = String(itemId || "").trim();
    return id ? rawItems.findIndex((item) => String(item.id || item.itemId || "").trim() === id) : -1;
  }

  function getState(citizen = {}) {
    return typeof window.WS_APP.getEquipmentState === "function" ? window.WS_APP.getEquipmentState(citizen) : null;
  }

  function getItemFromState(state = {}, itemId = "") {
    const id = String(itemId || "").trim();
    return id ? state?.itemById?.[id] || null : null;
  }

  function getRegionFromState(state = {}, anchor = "") {
    const key = normalizeAnchor(anchor);
    return key ? (Array.isArray(state?.bodyRegions) ? state.bodyRegions.find((region) => region.key === key) : null) || null : null;
  }

  function clearPhysicalLocationFields(next = {}) {
    [
      "equippedSlot", "equippedLayer", "bodySlot", "bodyLayer", "equippedAnchor",
      "containerItemId", "unitId", "parentItemId", "hostItemId",
      "containerPlacement", "gridPlacement", "gridColumn", "gridRow", "gridRotation", "housingPlacement", "storagePlacement"
    ].forEach((key) => delete next[key]);
    next.storageUnitId = "";
    next.containerHostId = "";
    return next;
  }

  function persistEquippedLocation(citizen = {}, itemId = "", equippedLocation = {}) {
    if (!citizen?.id || typeof window.WS_APP.updateItemInstanceFromView !== "function") return null;
    const rawItems = getRawEquipmentItems(citizen);
    const targetIndex = findRawItemIndex(rawItems, itemId);
    if (targetIndex < 0) return null;
    const next = clearPhysicalLocationFields({
      ...cloneValue(rawItems[targetIndex]),
      location: "EQUIPPED",
      equippedLocation: cloneValue(equippedLocation)
    });
    const result = window.WS_APP.updateItemInstanceFromView(citizen.id, next, { source: "EQUIPMENT_ASSIGNMENT" });
    return result?.ok ? window.WS_APP.getCitizenById?.(citizen.id) || citizen : null;
  }

  function canEquipItemToBodyLayer(citizen = {}, itemId = "", anchor = "", layer = "", options = {}) {
    const state = options.state || getState(citizen);
    if (!state) return makeResult(false, "STATE_UNAVAILABLE", "Equipment state is unavailable.");
    const item = options.item || getItemFromState(state, itemId);
    if (!item) return makeResult(false, "ITEM_NOT_FOUND", "Item is not present in Equipment state.", { itemId: String(itemId || "") });
    const region = options.region || getRegionFromState(state, anchor);
    if (!region) return makeResult(false, "REGION_NOT_FOUND", "Body region is not present in Equipment state.", { anchor: String(anchor || "") });
    if (typeof window.WS_APP.evaluateEquipmentLayerRules !== "function") return makeResult(false, "LAYER_RULES_UNAVAILABLE", "Layer rule evaluator is unavailable.");
    return window.WS_APP.evaluateEquipmentLayerRules(citizen, item.id, region.key, layer || item.equipProfile?.layer || "", { state, item, region });
  }

  function canEquipItemToBodyMount(citizen = {}, itemId = "", mountSetId = "", options = {}) {
    const state = options.state || getState(citizen);
    const item = options.item || getItemFromState(state || {}, itemId);
    if (!state) return makeResult(false, "STATE_UNAVAILABLE", "Equipment state is unavailable.");
    if (!item) return makeResult(false, "ITEM_NOT_FOUND", "Item is not present in Equipment state.");
    if (typeof window.WS_APP.evaluateEquipmentBodyMountRules !== "function") return makeResult(false, "BODY_MOUNT_RULES_UNAVAILABLE", "Body-mount rule evaluator is unavailable.");
    return window.WS_APP.evaluateEquipmentBodyMountRules(citizen, item.id, mountSetId, { ...options, state, item });
  }

  function canEquipItemToItemMount(citizen = {}, itemId = "", ownerItemId = "", mountId = "", options = {}) {
    const state = options.state || getState(citizen);
    const item = options.item || getItemFromState(state || {}, itemId);
    if (!state) return makeResult(false, "STATE_UNAVAILABLE", "Equipment state is unavailable.");
    if (!item) return makeResult(false, "ITEM_NOT_FOUND", "Item is not present in Equipment state.");
    if (typeof window.WS_APP.evaluateEquipmentItemMountRules !== "function") return makeResult(false, "ITEM_MOUNT_RULES_UNAVAILABLE", "Item-mount rule evaluator is unavailable.");
    return window.WS_APP.evaluateEquipmentItemMountRules(citizen, item.id, ownerItemId, mountId, { ...options, state, item });
  }

  function parseEquipmentEquipTarget(target = {}) {
    if (target && typeof target === "object" && !Array.isArray(target)) {
      const kind = normalizeToken(target.kind || String(target.id || "").split("|")[0]);
      return { ...target, kind };
    }
    const parts = String(target || "").split("|").map((entry) => String(entry || "").trim());
    const kind = normalizeToken(parts[0]);
    if (kind === "LAYER") return { kind, id: parts.join("|"), anchor: normalizeAnchor(parts[1]), layer: normalizeLayer(parts[2]) };
    if (kind === "BODY_MOUNT") return { kind, id: parts.join("|"), mountSetId: normalizeToken(parts[1]) };
    if (kind === "ITEM_MOUNT") return { kind, id: parts.join("|"), ownerItemId: parts[1], mountId: normalizeToken(parts[2]) };
    return { kind: "", id: String(target || "") };
  }

  function assignEquipmentItemToBodyLayer(citizenOrId = {}, itemId = "", anchor = "", layer = "") {
    const citizen = getCitizenFromInput(citizenOrId);
    if (!citizen?.id) return makeResult(false, "CITIZEN_NOT_FOUND", "Citizen record is not available.");
    const state = getState(citizen);
    const item = getItemFromState(state || {}, itemId);
    const region = getRegionFromState(state || {}, anchor);
    const targetLayer = normalizeLayer(layer || item?.equipProfile?.layer || "");
    const validation = canEquipItemToBodyLayer(citizen, itemId, anchor, targetLayer, { state, item, region });
    if (!validation.ok) return validation;
    if (validation.code === "ALREADY_EQUIPPED") return { ...validation, details: { ...validation.details, citizen } };
    const targets = Array.isArray(validation.details?.targets) ? validation.details.targets : [];
    const primary = normalizeAnchor(region?.key || anchor);
    const coverage = targets.map((target) => normalizeAnchor(target.anchor)).filter((regionKey) => regionKey && regionKey !== primary);
    const updatedCitizen = persistEquippedLocation(citizen, item.id, { kind: "LAYER", anchor: primary, layer: targetLayer, coverage: [...new Set(coverage)] });
    if (!updatedCitizen) return makeResult(false, "UPDATE_FAILED", "Citizen equipment assignment update failed.", { itemId: item.id, anchor: primary, layer: targetLayer });
    return makeResult(true, "ASSIGNED_LAYER", "Equipment item assigned to a body layer.", { itemId: item.id, kind: "LAYER", anchor: primary, layer: targetLayer, coverageTargets: targets, citizen: updatedCitizen });
  }

  function assignEquipmentItemToBodyMount(citizenOrId = {}, itemId = "", mountSetId = "") {
    const citizen = getCitizenFromInput(citizenOrId);
    if (!citizen?.id) return makeResult(false, "CITIZEN_NOT_FOUND", "Citizen record is not available.");
    const state = getState(citizen);
    const item = getItemFromState(state || {}, itemId);
    const validation = canEquipItemToBodyMount(citizen, itemId, mountSetId, { state, item });
    if (!validation.ok) return validation;
    if (validation.code === "ALREADY_EQUIPPED") return { ...validation, details: { ...validation.details, citizen } };
    const mountSet = validation.details?.mountSet || validation.details?.set || item?.equipProfile?.bodyMountSets?.find((entry) => entry.id === normalizeToken(mountSetId));
    const mountIds = Array.isArray(mountSet?.mountIds) ? mountSet.mountIds.map(normalizeToken).filter(Boolean) : [];
    if (!mountIds.length) return makeResult(false, "MOUNT_SET_EMPTY", "Body-mount set has no mounts.", { itemId: item?.id || itemId, mountSetId });
    const updatedCitizen = persistEquippedLocation(citizen, item.id, { kind: "BODY_MOUNT", primaryMountId: mountIds[0], mountIds });
    if (!updatedCitizen) return makeResult(false, "UPDATE_FAILED", "Body-mount assignment update failed.", { itemId: item.id, mountSetId });
    return makeResult(true, "ASSIGNED_BODY_MOUNT", "Equipment item assigned to body mounts.", { itemId: item.id, kind: "BODY_MOUNT", mountSetId: normalizeToken(mountSetId), mountIds, citizen: updatedCitizen });
  }

  function assignEquipmentItemToItemMount(citizenOrId = {}, itemId = "", ownerItemId = "", mountId = "") {
    const citizen = getCitizenFromInput(citizenOrId);
    if (!citizen?.id) return makeResult(false, "CITIZEN_NOT_FOUND", "Citizen record is not available.");
    const state = getState(citizen);
    const item = getItemFromState(state || {}, itemId);
    const validation = canEquipItemToItemMount(citizen, itemId, ownerItemId, mountId, { state, item });
    if (!validation.ok) return validation;
    if (validation.code === "ALREADY_EQUIPPED") return { ...validation, details: { ...validation.details, citizen } };
    const ownerId = String(validation.details?.ownerItemId || ownerItemId || "").trim();
    const normalizedMountId = normalizeToken(validation.details?.mountId || mountId);
    const updatedCitizen = persistEquippedLocation(citizen, item.id, { kind: "ITEM_MOUNT", ownerItemId: ownerId, mountId: normalizedMountId });
    if (!updatedCitizen) return makeResult(false, "UPDATE_FAILED", "Item-mount assignment update failed.", { itemId: item.id, ownerItemId: ownerId, mountId: normalizedMountId });
    return makeResult(true, "ASSIGNED_ITEM_MOUNT", "Equipment item mounted on another equipped item.", { itemId: item.id, kind: "ITEM_MOUNT", ownerItemId: ownerId, mountId: normalizedMountId, citizen: updatedCitizen });
  }

  function assignEquipmentItemToEquipTarget(citizenOrId = {}, itemId = "", target = {}) {
    const parsed = parseEquipmentEquipTarget(target);
    if (parsed.kind === "LAYER") return assignEquipmentItemToBodyLayer(citizenOrId, itemId, parsed.anchor, parsed.layer);
    if (parsed.kind === "BODY_MOUNT") return assignEquipmentItemToBodyMount(citizenOrId, itemId, parsed.mountSetId || parsed.mountSet?.id || "");
    if (parsed.kind === "ITEM_MOUNT") return assignEquipmentItemToItemMount(citizenOrId, itemId, parsed.ownerItemId, parsed.mountId);
    return makeResult(false, "EQUIP_TARGET_INVALID", "Equipment target is invalid.", { itemId, target: parsed });
  }

  function resolveUnequipTargetContainer(state = {}, item = {}, requestedTargetContainerId = "") {
    if (typeof window.WS_APP.canMoveEquipmentItemToContainer !== "function") return makeResult(false, "GRID_MOVE_API_UNAVAILABLE", "Container-grid move API is unavailable.");
    const itemId = String(item?.id || "").trim();
    const requestedId = String(requestedTargetContainerId || "").trim();
    const activeContainers = Array.isArray(state?.containers?.active) ? state.containers.active : [];
    const candidates = [];
    const addCandidate = (value = "") => {
      const candidate = String(value || "").trim();
      if (!candidate || candidate === itemId || candidates.includes(candidate)) return;
      candidates.push(candidate);
    };
    addCandidate(requestedId);
    activeContainers.forEach((container) => addCandidate(container?.id));
    let requestedFailure = null;
    for (const targetContainerId of candidates) {
      const validation = window.WS_APP.canMoveEquipmentItemToContainer(state, itemId, targetContainerId, { state, item, allowEquippedSource: true });
      if (validation?.ok) return makeResult(true, "UNEQUIP_TARGET_RESOLVED", "A destination container can receive the equipped item.", { itemId, targetContainerId, placement: validation.details?.placement || null, usedFallback: Boolean(requestedId && requestedId !== targetContainerId), ignoredSelfTarget: requestedId === itemId });
      if (targetContainerId === requestedId) requestedFailure = validation || null;
    }
    if (requestedFailure && requestedId !== itemId) return makeResult(false, requestedFailure.code || "TARGET_GRID_BLOCKED", requestedFailure.message || "Selected container cannot receive this item.", { ...(requestedFailure.details || {}), itemId, targetContainerId: requestedId });
    return makeResult(false, "TARGET_GRID_REQUIRED", "No other active container can receive this equipped item.", { itemId, requestedTargetContainerId: requestedId, ignoredSelfTarget: requestedId === itemId });
  }

  function getEquipmentUnequipTargets(citizen = {}, itemId = "", options = {}) {
    const state = options.state || getState(citizen);
    const item = options.item || getItemFromState(state || {}, itemId);
    if (!state || !item?.isEquipped || !item.equippedLocation || typeof window.WS_APP.canMoveEquipmentItemToContainer !== "function") return [];
    const selectedId = String(options.targetContainerId || state?.selections?.selectedContainerId || "").trim();
    const candidates = Array.isArray(state?.containers?.active) ? state.containers.active : [];
    return candidates
      .filter((container) => container?.id && String(container.id) !== String(item.id))
      .map((container) => {
        const validation = window.WS_APP.canMoveEquipmentItemToContainer(state, item.id, container.id, { state, item, allowEquippedSource: true });
        return {
          id: String(container.id || ""),
          label: String(container.name || container.containerProfile?.label || container.id || "Container"),
          container,
          placement: validation?.details?.placement || null,
          validation
        };
      })
      .filter((entry) => entry.validation?.ok)
      .sort((left, right) => {
        const leftSelected = left.id === selectedId ? 1 : 0;
        const rightSelected = right.id === selectedId ? 1 : 0;
        return rightSelected - leftSelected || left.label.localeCompare(right.label);
      });
  }

  function canUnequipEquipmentItem(citizen = {}, itemId = "", options = {}) {
    const state = options.state || getState(citizen);
    if (!state) return makeResult(false, "STATE_UNAVAILABLE", "Equipment state is unavailable.");
    const item = options.item || getItemFromState(state, itemId);
    if (!item) return makeResult(false, "ITEM_NOT_FOUND", "Item is not present in Equipment state.");
    if (!item.isEquipped || !item.equippedLocation) return makeResult(false, "ITEM_NOT_EQUIPPED", "Item is not equipped.", { itemId: item.id });
    const requestedTargetContainerId = String(options.targetContainerId || state?.selections?.selectedContainerId || "").trim();
    const targetResolution = resolveUnequipTargetContainer(state, item, requestedTargetContainerId);
    if (!targetResolution.ok) return targetResolution;
    return makeResult(true, "UNEQUIPPABLE_TO_GRID", "Equipped item can be moved to a physical container grid.", { itemId: item.id, equippedLocation: cloneValue(item.equippedLocation), targetContainerId: targetResolution.details.targetContainerId, placement: targetResolution.details.placement || null, usedFallback: targetResolution.details.usedFallback === true, ignoredSelfTarget: targetResolution.details.ignoredSelfTarget === true });
  }

  function unequipEquipmentItem(citizenOrId = {}, itemId = "", targetContainerId = "") {
    const citizen = getCitizenFromInput(citizenOrId);
    if (!citizen?.id) return makeResult(false, "CITIZEN_NOT_FOUND", "Citizen record is not available.");
    const state = getState(citizen);
    const item = getItemFromState(state || {}, itemId);
    const requestedTargetId = String(targetContainerId || state?.selections?.selectedContainerId || "").trim();
    const validation = canUnequipEquipmentItem(citizen, itemId, { state, item, targetContainerId: requestedTargetId });
    if (!validation.ok) return validation;
    const targetId = String(validation.details?.targetContainerId || "").trim();
    const result = window.WS_APP.moveEquipmentItemToContainer?.(citizen, item.id, targetId, { allowEquippedSource: true, placement: validation.details?.placement || undefined });
    if (!result?.ok) return result || makeResult(false, "UNEQUIP_MOVE_FAILED", "Item could not be moved to the selected container grid.");
    return makeResult(true, "UNEQUIPPED_TO_GRID", "Equipment item moved to a container grid.", { ...result.details, itemId: item.id, equippedLocation: cloneValue(item.equippedLocation), containerId: result.containerId || targetId, placement: result.placement || result.details?.placement || null, citizen: result.citizen || null });
  }

  function getBodyLayerAssignmentOptions(citizen = {}, anchor = "", options = {}) {
    const state = options.state || getState(citizen);
    const region = state ? getRegionFromState(state, anchor) : null;
    if (!state || !region) return { version: ASSIGNMENT_CONTRACT_VERSION, region: region || null, targets: [], blockedItems: [] };
    const gridItems = Array.isArray(state?.inventory?.gridItems) ? state.inventory.gridItems : [];
    const targets = [];
    const blockedItems = [];
    gridItems.forEach((item) => {
      const itemTargets = typeof window.WS_APP.getEquipmentEquipTargets === "function" ? window.WS_APP.getEquipmentEquipTargets(citizen, item.id, { state, item }) : [];
      itemTargets.filter((target) => target.kind === "LAYER" && target.anchor === region.key).forEach((target) => {
        const entry = { ...target, item };
        if (target.validation?.ok) targets.push(entry); else blockedItems.push(entry);
      });
    });
    return { version: ASSIGNMENT_CONTRACT_VERSION, region, targets, blockedItems };
  }

  function isDedicatedStowRule(rule = {}) {
    const token = normalizeToken(rule.key || rule.type || rule.label);
    return ["HOLSTER", "HOLSTER_OR_TOOL", "TOOL", "SHEATH", "SCABBARD"].some((entry) => token.includes(entry));
  }

  function getEquipmentStowTargets(citizen = {}, itemId = "", options = {}) {
    const state = options.state || getState(citizen);
    const item = options.item || getItemFromState(state || {}, itemId);
    if (!state || !item?.isEquipped || item.equippedLocation?.kind !== "LAYER" || item.equippedLocation?.layer !== "HELD") return [];
    const targets = [];
    const equipTargets = typeof window.WS_APP.getEquipmentEquipTargets === "function" ? window.WS_APP.getEquipmentEquipTargets(citizen, item.id, { state, item }) : [];
    equipTargets.filter((target) => target.kind === "ITEM_MOUNT" && target.validation?.ok).forEach((target) => targets.push({ ...target, action: "STOW", mode: "ITEM_MOUNT" }));
    (Array.isArray(state?.containers?.active) ? state.containers.active : []).forEach((container) => {
      const rules = Array.isArray(container?.containerProfile?.cellRules) ? container.containerProfile.cellRules : [];
      if (!rules.some(isDedicatedStowRule)) return;
      const validation = window.WS_APP.canMoveEquipmentItemToContainer?.(state, item.id, container.id, { state, item, allowEquippedSource: true });
      const placement = validation?.details?.placement || null;
      const matchingRule = placement ? rules.find((rule) => Number(rule.column) === Number(placement.column) && Number(rule.row) === Number(placement.row) && isDedicatedStowRule(rule)) : null;
      if (validation?.ok && matchingRule) targets.push({ kind: "CONTAINER_MOUNT", id: `CONTAINER_MOUNT|${container.id}|${placement.column}|${placement.row}`, label: `${container.name} / ${matchingRule.label || "HOLSTER / TOOL"}`, containerId: container.id, placement, validation, action: "STOW", mode: "CONTAINER_MOUNT" });
    });
    return targets;
  }

  function getEquipmentDrawTargets(citizen = {}, itemId = "", options = {}) {
    const state = options.state || getState(citizen);
    const item = options.item || getItemFromState(state || {}, itemId);
    if (!state || !item) return [];
    const isMounted = item.isEquipped && item.equippedLocation?.kind === "ITEM_MOUNT";
    const container = item.isInGrid ? state?.itemById?.[item.containerHostId] || null : null;
    const rule = item.isInGrid && container?.containerProfile?.cellRules?.length
      ? container.containerProfile.cellRules.find((entry) => Number(entry.column) === Number(item.containerPlacement?.column) && Number(entry.row) === Number(item.containerPlacement?.row) && isDedicatedStowRule(entry))
      : null;
    if (!isMounted && !rule) return [];
    return (typeof window.WS_APP.getEquipmentEquipTargets === "function" ? window.WS_APP.getEquipmentEquipTargets(citizen, item.id, { state, item }) : [])
      .filter((target) => target.kind === "LAYER" && target.layer === "HELD" && target.validation?.ok)
      .map((target) => ({ ...target, action: "DRAW", mode: "HELD" }));
  }

  function stowEquipmentItem(citizenOrId = {}, itemId = "", targetId = "") {
    const citizen = getCitizenFromInput(citizenOrId);
    if (!citizen?.id) return makeResult(false, "CITIZEN_NOT_FOUND", "Citizen record is not available.");
    const state = getState(citizen);
    const item = getItemFromState(state || {}, itemId);
    const targets = getEquipmentStowTargets(citizen, itemId, { state, item });
    const target = targets.find((entry) => entry.id === String(targetId || "")) || targets[0] || null;
    if (!target) return makeResult(false, "STOW_TARGET_UNAVAILABLE", "No compatible free stow target is available.", { itemId });
    if (target.kind === "ITEM_MOUNT") return assignEquipmentItemToItemMount(citizen, itemId, target.ownerItemId, target.mountId);
    const result = window.WS_APP.moveEquipmentItemToContainer?.(citizen, itemId, target.containerId, { allowEquippedSource: true, placement: target.placement });
    return result?.ok ? makeResult(true, "STOWED", "Held item stowed in a dedicated container mount.", { itemId, target, containerId: target.containerId, citizen: result.citizen || null }) : result || makeResult(false, "STOW_FAILED", "Held item could not be stowed.");
  }

  function drawEquipmentItem(citizenOrId = {}, itemId = "", targetId = "") {
    const citizen = getCitizenFromInput(citizenOrId);
    if (!citizen?.id) return makeResult(false, "CITIZEN_NOT_FOUND", "Citizen record is not available.");
    const state = getState(citizen);
    const item = getItemFromState(state || {}, itemId);
    const targets = getEquipmentDrawTargets(citizen, itemId, { state, item });
    const target = targets.find((entry) => entry.id === String(targetId || "")) || targets[0] || null;
    if (!target) return makeResult(false, "DRAW_TARGET_UNAVAILABLE", "No compatible free hand is available.", { itemId });
    return assignEquipmentItemToBodyLayer(citizen, itemId, target.anchor, target.layer);
  }

  const exports = {
    version: ASSIGNMENT_CONTRACT_VERSION,
    parseEquipmentEquipTarget,
    canEquipItemToBodyLayer,
    canEquipItemToBodyMount,
    canEquipItemToItemMount,
    canUnequipEquipmentItem,
    getEquipmentUnequipTargets,
    getBodyLayerAssignmentOptions,
    resolveUnequipTargetContainer,
    assignEquipmentItemToBodyLayer,
    assignEquipmentItemToBodyMount,
    assignEquipmentItemToItemMount,
    assignEquipmentItemToEquipTarget,
    unequipEquipmentItem,
    getEquipmentStowTargets,
    getEquipmentDrawTargets,
    stowEquipmentItem,
    drawEquipmentItem
  };

  window.WS_APP.equipmentAssignment = exports;
  const { version: assignmentVersion, ...assignmentApi } = exports;
  Object.assign(window.WS_APP, assignmentApi);
})();
