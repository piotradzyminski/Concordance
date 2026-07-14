window.WS_APP = window.WS_APP || {};

(function initEquipmentLayerRules() {
  const LOADOUT_RULE_VERSION = "5.2x";

  function makeResult(ok = false, code = "UNKNOWN", message = "", details = {}) {
    return { ok: Boolean(ok), code: String(code || "UNKNOWN"), message: String(message || ""), details: details && typeof details === "object" && !Array.isArray(details) ? details : {} };
  }

  function normalizeAnchor(value = "") {
    return typeof window.WS_APP.normalizeEquipmentBodyRegionKey === "function"
      ? window.WS_APP.normalizeEquipmentBodyRegionKey(value)
      : String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function normalizeLayer(value = "") {
    return typeof window.WS_APP.normalizeEquipmentBodyLayerKey === "function"
      ? window.WS_APP.normalizeEquipmentBodyLayerKey(value)
      : String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function normalizeToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
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

  function itemTokens(item = {}) {
    return new Set([item.category, item.subtype, ...(Array.isArray(item.tags) ? item.tags : [])].map(normalizeToken).filter(Boolean));
  }

  function hasTokenOverlap(tokens = new Set(), values = []) {
    return (Array.isArray(values) ? values : []).some((entry) => tokens.has(normalizeToken(entry)));
  }

  function validatePhysicalSource(item = {}, details = {}) {
    if (item.archived === true) return makeResult(false, "ITEM_ARCHIVED", "Archived items cannot be equipped.", details);
    if (item.installOnlyCandidate === true || item.notWearable === true) return makeResult(false, "INSTALL_ONLY_ITEM", "Packaged cyberware must use the Cyberware install flow.", details);
    if (item.isStored) return makeResult(false, "ITEM_STORED", "Housing items require a grid transfer before they can be equipped.", details);
    if (item.isOrphan) return makeResult(false, "ITEM_ORPHAN", "Item has no valid physical location.", details);
    if (Number(item.condition ?? 100) <= 14) return makeResult(false, "ITEM_BROKEN", "Broken items cannot be equipped.", details);
    if (!item.isInGrid && !item.isEquipped) return makeResult(false, "ITEM_NOT_AVAILABLE", "Item must be in a physical grid or already equipped.", details);
    return null;
  }

  function getEquipmentItemEquipProfile(item = {}) {
    const profile = item?.equipProfile && typeof item.equipProfile === "object" && !Array.isArray(item.equipProfile)
      ? item.equipProfile
      : typeof window.WS_APP.normalizeEquipmentEquipProfile === "function"
        ? window.WS_APP.normalizeEquipmentEquipProfile(item)
        : {};
    return {
      version: LOADOUT_RULE_VERSION,
      itemId: String(item?.id || item?.itemId || "").trim(),
      allowedAnchors: Array.isArray(profile.allowedAnchors) ? profile.allowedAnchors.map(normalizeAnchor).filter(Boolean) : [],
      layer: normalizeLayer(profile.layer),
      coverage: Array.isArray(profile.coverage) ? profile.coverage.map(normalizeAnchor).filter(Boolean) : [],
      bodyMountSets: Array.isArray(profile.bodyMountSets) ? profile.bodyMountSets.map((set, index) => ({
        id: normalizeToken(set?.id || `MOUNT_SET_${index + 1}`),
        label: String(set?.label || set?.id || `Mount set ${index + 1}`).trim(),
        mountIds: [...new Set((Array.isArray(set?.mountIds) ? set.mountIds : []).map(normalizeToken).filter(Boolean))]
      })).filter((set) => set.mountIds.length) : [],
      itemMountTypes: Array.isArray(profile.itemMountTypes) ? [...new Set(profile.itemMountTypes.map(normalizeToken).filter(Boolean))] : [],
      handsRequired: Math.max(1, Math.min(2, Math.round(Number(profile.handsRequired || 1)) || 1)),
      countsAsBulkyCarrier: profile.countsAsBulkyCarrier === true,
      requires: Array.isArray(profile.requires) ? profile.requires.map((entry) => ({ anchor: normalizeAnchor(entry.anchor), layer: normalizeLayer(entry.layer) })).filter((entry) => entry.anchor && entry.layer) : [],
      blocks: Array.isArray(profile.blocks) ? profile.blocks.map((entry) => ({ anchor: normalizeAnchor(entry.anchor), layer: normalizeLayer(entry.layer) })).filter((entry) => entry.anchor && entry.layer) : []
    };
  }

  function getEquipmentRegionLayerProfile(region = {}) {
    return {
      version: LOADOUT_RULE_VERSION,
      anchor: normalizeAnchor(region.key || region.anchor),
      allowedLayers: Array.isArray(region.allowedLayers) ? region.allowedLayers.map(normalizeLayer).filter(Boolean) : [],
      mountIds: Array.isArray(region.mountIds) ? region.mountIds.map(normalizeToken).filter(Boolean) : []
    };
  }

  function getCoverageTargets(item = {}, anchor = "", layer = "") {
    const profile = getEquipmentItemEquipProfile(item);
    const primary = normalizeAnchor(anchor);
    const targetLayer = normalizeLayer(layer || profile.layer);
    const coverage = [...profile.coverage];
    if (targetLayer === "HELD" && profile.handsRequired === 2) {
      coverage.push(primary === "LEFT_HAND" ? "RIGHT_HAND" : "LEFT_HAND");
    }
    return [...new Set([primary, ...coverage].filter(Boolean))].map((regionKey) => ({ anchor: regionKey, layer: targetLayer, role: regionKey === primary ? "PRIMARY" : "RESERVED" }));
  }

  function evaluateEquipmentLayerRules(citizen = {}, itemId = "", anchor = "", layer = "", options = {}) {
    const state = options.state || getState(citizen);
    if (!state) return makeResult(false, "STATE_UNAVAILABLE", "Equipment state is unavailable.");
    const item = options.item || getItemFromState(state, itemId);
    if (!item) return makeResult(false, "ITEM_NOT_FOUND", "Item is not present in Equipment state.", { itemId: String(itemId || "") });
    const region = options.region || getRegionFromState(state, anchor);
    if (!region) return makeResult(false, "REGION_NOT_FOUND", "Body region is not present in Equipment state.", { anchor: String(anchor || "") });

    const profile = getEquipmentItemEquipProfile(item);
    const targetAnchor = normalizeAnchor(region.key || anchor);
    const targetLayer = normalizeLayer(layer || profile.layer);
    const targets = getCoverageTargets(item, targetAnchor, targetLayer);
    const baseDetails = { kind: "LAYER", itemId: item.id, anchor: targetAnchor, layer: targetLayer, profile, targets };
    const physicalFailure = validatePhysicalSource(item, baseDetails);
    if (physicalFailure) return physicalFailure;

    if (!profile.allowedAnchors.includes(targetAnchor)) return makeResult(false, "ANCHOR_NOT_ALLOWED", "Item cannot use the selected body region.", baseDetails);
    if (!profile.layer || profile.layer !== targetLayer) return makeResult(false, "LAYER_NOT_ALLOWED", "Item cannot use the selected body layer.", baseDetails);
    if (!Array.isArray(region.allowedLayers) || !region.allowedLayers.includes(targetLayer)) return makeResult(false, "REGION_LAYER_UNAVAILABLE", "Selected region does not expose this layer.", baseDetails);

    const missingCoverage = targets.filter((target) => {
      const targetRegion = getRegionFromState(state, target.anchor);
      return !targetRegion || !targetRegion.allowedLayers.includes(target.layer);
    });
    if (missingCoverage.length) return makeResult(false, "COVERAGE_REGION_UNAVAILABLE", "One or more coverage regions do not support the item layer.", { ...baseDetails, missingCoverage });

    const conflicts = targets.map((target) => state?.bodyOccupancy?.[`${target.anchor}:${target.layer}`] || null)
      .filter((entry) => entry && String(entry.itemId || "") !== String(item.id || ""));
    if (conflicts.length) return makeResult(false, "BODY_LAYER_OCCUPIED", "One or more required region layers are occupied.", { ...baseDetails, conflicts });

    if (targetLayer === "ARMOR" && ["LEFT_SHOULDER", "RIGHT_SHOULDER"].includes(targetAnchor)) {
      const pairedAnchor = targetAnchor === "LEFT_SHOULDER" ? "RIGHT_SHOULDER" : "LEFT_SHOULDER";
      const pairedOccupancy = state?.bodyOccupancy?.[`${pairedAnchor}:ARMOR`] || null;
      if (pairedOccupancy && String(pairedOccupancy.itemId || "") !== String(item.id || "")) {
        return makeResult(false, "SHOULDER_ARMOR_SLOT_OCCUPIED", "Shoulder armor uses the paired Shoulders armor slot.", {
          ...baseDetails,
          pairedAnchor,
          pairedOccupancy
        });
      }
    }

    const missingRequirements = profile.requires.filter((requirement) => !state?.bodyOccupancy?.[`${requirement.anchor}:${requirement.layer}`]);
    if (missingRequirements.length) return makeResult(false, "EQUIP_REQUIREMENT_MISSING", "Required body-layer dependency is missing.", { ...baseDetails, missingRequirements });

    const blockingOccupancy = profile.blocks.map((block) => state?.bodyOccupancy?.[`${block.anchor}:${block.layer}`] || null).filter(Boolean);
    if (blockingOccupancy.length) return makeResult(false, "EQUIP_BLOCK_CONFLICT", "Blocked body-layer dependency is occupied.", { ...baseDetails, blockingOccupancy });

    if (item.isEquipped && item.equippedLocation?.kind === "LAYER" && item.equippedLocation?.anchor === targetAnchor && item.equippedLocation?.layer === targetLayer) {
      return makeResult(true, "ALREADY_EQUIPPED", "Item is already equipped at this body layer.", baseDetails);
    }
    return makeResult(true, "EQUIPPABLE", "Item can be equipped at the selected body layer.", baseDetails);
  }

  function evaluateEquipmentBodyMountRules(citizen = {}, itemId = "", mountSetId = "", options = {}) {
    const state = options.state || getState(citizen);
    if (!state) return makeResult(false, "STATE_UNAVAILABLE", "Equipment state is unavailable.");
    const item = options.item || getItemFromState(state, itemId);
    if (!item) return makeResult(false, "ITEM_NOT_FOUND", "Item is not present in Equipment state.");
    const profile = getEquipmentItemEquipProfile(item);
    const requested = normalizeToken(mountSetId);
    const set = options.mountSet || profile.bodyMountSets.find((entry) => entry.id === requested) || profile.bodyMountSets.find((entry) => entry.mountIds.join("+") === requested) || null;
    const baseDetails = { kind: "BODY_MOUNT", itemId: item.id, mountSet: set };
    const physicalFailure = validatePhysicalSource(item, baseDetails);
    if (physicalFailure) return physicalFailure;
    if (!set?.mountIds?.length) return makeResult(false, "MOUNT_SET_NOT_FOUND", "Item has no matching body-mount configuration.", baseDetails);

    const definitions = Array.isArray(state.bodyMountDefinitions) ? state.bodyMountDefinitions : [];
    const missing = set.mountIds.filter((mountId) => !definitions.some((definition) => definition.key === mountId));
    if (missing.length) return makeResult(false, "BODY_MOUNT_UNAVAILABLE", "One or more body mounts do not exist.", { ...baseDetails, missing });
    const tokens = itemTokens(item);
    const incompatible = set.mountIds.map((mountId) => definitions.find((definition) => definition.key === mountId) || null)
      .filter((definition) => definition?.acceptedTags?.length && !hasTokenOverlap(tokens, definition.acceptedTags));
    if (incompatible.length) return makeResult(false, "BODY_MOUNT_TAG_NOT_ACCEPTED", "One or more body mounts do not accept this item type.", { ...baseDetails, incompatible });
    const conflicts = set.mountIds.map((mountId) => state?.bodyMountOccupancy?.[mountId] || null).filter((entry) => entry && entry.itemId !== item.id);
    if (conflicts.length) return makeResult(false, "BODY_MOUNT_OCCUPIED", "One or more required body mounts are occupied.", { ...baseDetails, conflicts });

    const armorBlockedMounts = set.mountIds.filter((mountId) => {
      if (mountId === "LEFT_FOREARM_ACCESSORY_2") return Boolean(state?.bodyOccupancy?.["LEFT_FOREARM:ARMOR"]);
      if (mountId === "RIGHT_FOREARM_ACCESSORY_2") return Boolean(state?.bodyOccupancy?.["RIGHT_FOREARM:ARMOR"]);
      return false;
    });
    if (armorBlockedMounts.length) {
      return makeResult(false, "FOREARM_MOUNT_BLOCKED_BY_ARMOR", "Forearm armor blocks the corresponding forearm mount.", {
        ...baseDetails,
        armorBlockedMounts
      });
    }
    if (item.isEquipped && item.equippedLocation?.kind === "BODY_MOUNT") {
      const current = [...(item.equippedLocation.mountIds || [])].sort().join("+");
      const requestedKey = [...set.mountIds].sort().join("+");
      if (current === requestedKey) return makeResult(true, "ALREADY_EQUIPPED", "Item already occupies this body-mount set.", baseDetails);
    }
    return makeResult(true, "EQUIPPABLE_BODY_MOUNT", "Item can use the selected body mounts.", baseDetails);
  }

  function evaluateEquipmentItemMountRules(citizen = {}, itemId = "", ownerItemId = "", mountId = "", options = {}) {
    const state = options.state || getState(citizen);
    if (!state) return makeResult(false, "STATE_UNAVAILABLE", "Equipment state is unavailable.");
    const item = options.item || getItemFromState(state, itemId);
    const owner = options.owner || getItemFromState(state, ownerItemId);
    const normalizedMountId = normalizeToken(mountId);
    if (!item || !owner) return makeResult(false, "ITEM_MOUNT_TARGET_NOT_FOUND", "Item or mount owner is missing.", { itemId, ownerItemId, mountId: normalizedMountId });
    if (item.id === owner.id) return makeResult(false, "ITEM_MOUNT_SELF", "Item cannot be mounted on itself.", { itemId: item.id, ownerItemId: owner.id, mountId: normalizedMountId });
    const profile = getEquipmentItemEquipProfile(item);
    const slot = owner.mountProfile?.slots?.find((entry) => entry.id === normalizedMountId) || null;
    const baseDetails = { kind: "ITEM_MOUNT", itemId: item.id, ownerItemId: owner.id, mountId: normalizedMountId, slot };
    const physicalFailure = validatePhysicalSource(item, baseDetails);
    if (physicalFailure) return physicalFailure;
    if (!owner.isEquipped) return makeResult(false, "MOUNT_OWNER_NOT_EQUIPPED", "Mount owner must be equipped.", baseDetails);
    if (!slot) return makeResult(false, "ITEM_MOUNT_NOT_FOUND", "Selected item-owned mount does not exist.", baseDetails);
    if (!profile.itemMountTypes.includes(normalizeToken(slot.type))) return makeResult(false, "ITEM_MOUNT_TYPE_NOT_ALLOWED", "Item does not support this mount type.", baseDetails);
    const occupied = state?.itemMountOccupancy?.[`${owner.id}:${slot.id}`] || null;
    if (occupied && occupied.itemId !== item.id) return makeResult(false, "ITEM_MOUNT_OCCUPIED", "Selected item-owned mount is occupied.", { ...baseDetails, occupied });
    const tokens = itemTokens(item);
    if (hasTokenOverlap(tokens, slot.blockedTags || [])) return makeResult(false, "ITEM_MOUNT_BLOCKED_TAG", "Mount blocks this item type.", baseDetails);
    if (Array.isArray(slot.acceptedTags) && slot.acceptedTags.length && !hasTokenOverlap(tokens, slot.acceptedTags)) return makeResult(false, "ITEM_MOUNT_TAG_NOT_ACCEPTED", "Mount does not accept this item type.", baseDetails);
    if (item.isEquipped && item.equippedLocation?.kind === "ITEM_MOUNT" && item.equippedLocation.ownerItemId === owner.id && item.equippedLocation.mountId === slot.id) return makeResult(true, "ALREADY_EQUIPPED", "Item is already mounted here.", baseDetails);
    return makeResult(true, "EQUIPPABLE_ITEM_MOUNT", "Item can be mounted on the selected equipped item.", baseDetails);
  }

  function getEquipmentEquipTargets(citizen = {}, itemId = "", options = {}) {
    const state = options.state || getState(citizen);
    const item = options.item || getItemFromState(state || {}, itemId);
    if (!state || !item) return [];
    const profile = getEquipmentItemEquipProfile(item);
    const targets = [];
    (Array.isArray(state.bodyRegions) ? state.bodyRegions : []).forEach((region) => {
      if (!profile.allowedAnchors.includes(region.key) || !profile.layer) return;
      const validation = evaluateEquipmentLayerRules(citizen, item.id, region.key, profile.layer, { state, item, region });
      targets.push({ kind: "LAYER", id: `LAYER|${region.key}|${profile.layer}`, label: `${region.label} / ${profile.layer}`, anchor: region.key, layer: profile.layer, validation });
    });
    profile.bodyMountSets.forEach((mountSet) => {
      const validation = evaluateEquipmentBodyMountRules(citizen, item.id, mountSet.id, { state, item, mountSet });
      targets.push({ kind: "BODY_MOUNT", id: `BODY_MOUNT|${mountSet.id}`, label: mountSet.label, mountSet, validation });
    });
    (Array.isArray(state.items) ? state.items : []).filter((owner) => owner?.isEquipped && owner.mountProfile?.slots?.length).forEach((owner) => {
      owner.mountProfile.slots.forEach((slot) => {
        if (!profile.itemMountTypes.includes(normalizeToken(slot.type))) return;
        const validation = evaluateEquipmentItemMountRules(citizen, item.id, owner.id, slot.id, { state, item, owner });
        targets.push({ kind: "ITEM_MOUNT", id: `ITEM_MOUNT|${owner.id}|${slot.id}`, label: `${owner.name} / ${slot.label}`, ownerItemId: owner.id, mountId: slot.id, validation });
      });
    });
    return targets;
  }

  window.WS_APP.equipmentLoadoutRules = {
    version: LOADOUT_RULE_VERSION,
    getEquipmentItemEquipProfile,
    getEquipmentRegionLayerProfile,
    getCoverageTargets,
    evaluateEquipmentLayerRules,
    evaluateEquipmentBodyMountRules,
    evaluateEquipmentItemMountRules,
    getEquipmentEquipTargets
  };

  Object.assign(window.WS_APP, {
    getEquipmentItemEquipProfile,
    getEquipmentRegionLayerProfile,
    getEquipmentCoverageTargets: getCoverageTargets,
    evaluateEquipmentLayerRules,
    evaluateEquipmentBodyMountRules,
    evaluateEquipmentItemMountRules,
    getEquipmentEquipTargets,
    evaluateEquipmentLoadoutRules: evaluateEquipmentLayerRules
  });
})();
