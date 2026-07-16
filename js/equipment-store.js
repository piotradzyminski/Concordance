window.WS_APP = window.WS_APP || {};

(function initEquipmentStateModel() {
  const EQUIPMENT_STATE_VERSION = "6.4.1x";
  const EQUIPMENT_MODULE_STATUS = "STATE_CLEAN";
  const DEFAULT_INVENTORY_UNIT_ID = "inventory-main";

  const BODY_LAYERS = ["INNER", "OUTER", "OUTERWEAR", "ARMOR", "FACE", "FOOTWEAR", "HELD"];
  const CYBERGRID_LAYERS = [...BODY_LAYERS];
  const CYBERWARE_LAYERS = [];

  const BODY_REGION_GROUPS = [
    { key: "head", label: "Head / Neck" },
    { key: "core", label: "Core" },
    { key: "arms", label: "Shoulders / Forearms / Hands" },
    { key: "legs", label: "Legs / Feet" }
  ];

  const BODY_MOUNT_DEFINITIONS = [
    { key: "IMPLANT_PORT", label: "Implant Port", regionKey: "IMPLANT_PORT", acceptedTags: ["IMPLANT_PORT_DEVICE", "PORT_DEVICE"] },
    { key: "LEFT_SHOULDER_CARRY", label: "Left Shoulder Carry", regionKey: "LEFT_SHOULDER", acceptedTags: ["BACKPACK", "BAG", "SLING", "SCABBARD", "SHEATH", "CARRY"] },
    { key: "RIGHT_SHOULDER_CARRY", label: "Right Shoulder Carry", regionKey: "RIGHT_SHOULDER", acceptedTags: ["BACKPACK", "BAG", "SLING", "SCABBARD", "SHEATH", "CARRY"] },
    { key: "LEFT_FOREARM_ACCESSORY_1", label: "Left Wrist", regionKey: "LEFT_FOREARM", acceptedTags: ["ACCESSORY", "WATCH", "DEVICE", "BRACELET", "WRIST", "FOREARM_ACCESSORY"] },
    { key: "LEFT_FOREARM_ACCESSORY_2", label: "Left Forearm", regionKey: "LEFT_FOREARM", acceptedTags: ["ACCESSORY", "DEVICE", "FOREARM", "FOREARM_ACCESSORY"] },
    { key: "RIGHT_FOREARM_ACCESSORY_1", label: "Right Wrist", regionKey: "RIGHT_FOREARM", acceptedTags: ["ACCESSORY", "WATCH", "DEVICE", "BRACELET", "WRIST", "FOREARM_ACCESSORY"] },
    { key: "RIGHT_FOREARM_ACCESSORY_2", label: "Right Forearm", regionKey: "RIGHT_FOREARM", acceptedTags: ["ACCESSORY", "DEVICE", "FOREARM", "FOREARM_ACCESSORY"] },
    { key: "WAIST_CARRY", label: "Waist", regionKey: "WAIST", acceptedTags: ["BELT", "WAIST_BAG", "FANNY_PACK"] },
    { key: "BACK_CARRY", label: "Back", regionKey: "BACK", acceptedTags: ["BACKPACK", "BAG", "PACK"] },
    { key: "LEFT_THIGH_HOLSTER", label: "Left Thigh Mount", regionKey: "LEFT_THIGH", acceptedTags: ["HOLSTER", "BAG", "POUCH", "CONTAINER", "THIGH_MOUNT", "CARRY"] },
    { key: "RIGHT_THIGH_HOLSTER", label: "Right Thigh Mount", regionKey: "RIGHT_THIGH", acceptedTags: ["HOLSTER", "BAG", "POUCH", "CONTAINER", "THIGH_MOUNT", "CARRY"] },
    { key: "LEFT_SHIN_MOUNT", label: "Left Shin Mount", regionKey: "LEFT_SHIN", acceptedTags: ["SHIN_PAD", "SHIN_GUARD", "SHIN_ARMOR", "SMALL_HOLSTER", "SHIN_HOLSTER", "SHIN_MOUNT"] },
    { key: "RIGHT_SHIN_MOUNT", label: "Right Shin Mount", regionKey: "RIGHT_SHIN", acceptedTags: ["SHIN_PAD", "SHIN_GUARD", "SHIN_ARMOR", "SMALL_HOLSTER", "SHIN_HOLSTER", "SHIN_MOUNT"] }
  ];

  const MOUNT_BY_KEY = BODY_MOUNT_DEFINITIONS.reduce((next, mount) => {
    next[mount.key] = mount;
    return next;
  }, {});

  const BODY_REGION_DEFINITIONS = [
    { key: "HEAD", label: "Head", group: "head", visibility: "common", allowedLayers: ["INNER", "OUTER"], mountIds: [] },
    { key: "FACE", label: "Face", group: "head", visibility: "front", allowedLayers: ["FACE"], mountIds: [] },
    { key: "NECK", label: "Neck", group: "head", visibility: "common", allowedLayers: ["INNER", "ARMOR"], mountIds: [] },
    { key: "IMPLANT_PORT", label: "Implant Port", group: "head", visibility: "back", allowedLayers: [], mountIds: ["IMPLANT_PORT"] },
    { key: "LEFT_SHOULDER", label: "Left Shoulder", group: "arms", visibility: "common", allowedLayers: ["ARMOR"], mountIds: ["LEFT_SHOULDER_CARRY"] },
    { key: "RIGHT_SHOULDER", label: "Right Shoulder", group: "arms", visibility: "common", allowedLayers: ["ARMOR"], mountIds: ["RIGHT_SHOULDER_CARRY"] },
    { key: "TORSO", label: "Torso", group: "core", visibility: "front", allowedLayers: ["INNER", "OUTER", "OUTERWEAR", "ARMOR"], mountIds: [] },
    { key: "BACK", label: "Back", group: "core", visibility: "back", allowedLayers: [], mountIds: ["BACK_CARRY"] },
    { key: "LEFT_FOREARM", label: "Left Forearm", group: "arms", visibility: "common", allowedLayers: ["ARMOR"], mountIds: ["LEFT_FOREARM_ACCESSORY_1", "LEFT_FOREARM_ACCESSORY_2"] },
    { key: "RIGHT_FOREARM", label: "Right Forearm", group: "arms", visibility: "common", allowedLayers: ["ARMOR"], mountIds: ["RIGHT_FOREARM_ACCESSORY_1", "RIGHT_FOREARM_ACCESSORY_2"] },
    { key: "HANDS", label: "Hands", group: "arms", visibility: "common", allowedLayers: ["INNER", "ARMOR"], mountIds: [] },
    { key: "LEFT_HAND", label: "Left Hand", group: "arms", visibility: "common", allowedLayers: ["HELD"], mountIds: [] },
    { key: "RIGHT_HAND", label: "Right Hand", group: "arms", visibility: "common", allowedLayers: ["HELD"], mountIds: [] },
    { key: "WAIST", label: "Waist", group: "core", visibility: "common", allowedLayers: [], mountIds: ["WAIST_CARRY"] },
    { key: "LEFT_THIGH", label: "Left Thigh", group: "legs", visibility: "common", allowedLayers: [], mountIds: ["LEFT_THIGH_HOLSTER"] },
    { key: "RIGHT_THIGH", label: "Right Thigh", group: "legs", visibility: "common", allowedLayers: [], mountIds: ["RIGHT_THIGH_HOLSTER"] },
    { key: "LEFT_SHIN", label: "Left Shin", group: "legs", visibility: "common", allowedLayers: [], mountIds: ["LEFT_SHIN_MOUNT"] },
    { key: "RIGHT_SHIN", label: "Right Shin", group: "legs", visibility: "common", allowedLayers: [], mountIds: ["RIGHT_SHIN_MOUNT"] },
    { key: "LEGS", label: "Legs", group: "legs", visibility: "common", allowedLayers: ["INNER", "OUTER", "ARMOR"], mountIds: [] },
    { key: "FEET", label: "Feet", group: "legs", visibility: "common", allowedLayers: ["INNER", "FOOTWEAR"], mountIds: [] }
  ];

  const BODY_REGION_COMPOSITES = [
    { key: "SHOULDERS", label: "Shoulders", group: "arms", visibility: "common", childRegionKeys: ["LEFT_SHOULDER", "RIGHT_SHOULDER"], slotMode: "SHOULDERS" },
    { key: "FOREARMS", label: "Forearms", group: "arms", visibility: "common", childRegionKeys: ["LEFT_FOREARM", "RIGHT_FOREARM"], slotMode: "FOREARMS" },
    { key: "THIGHS", label: "Thighs", group: "legs", visibility: "common", childRegionKeys: ["LEFT_THIGH", "RIGHT_THIGH"], slotMode: "THIGHS" },
    { key: "SHINS", label: "Shins", group: "legs", visibility: "common", childRegionKeys: ["LEFT_SHIN", "RIGHT_SHIN"], slotMode: "SHINS" }
  ];

  const BODYMAP_HIDDEN_REGION_KEYS = new Set(BODY_REGION_COMPOSITES.flatMap((region) => region.childRegionKeys));

  const REGION_BY_KEY = [...BODY_REGION_DEFINITIONS, ...BODY_REGION_COMPOSITES].reduce((next, region) => {
    next[region.key] = region;
    return next;
  }, {});

  const utils = window.WS_APP.equipmentRenderUtils || {};
  const clone = utils.clone || window.WS_APP.cloneEquipmentValue || function cloneFallback(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  };

  function clampInteger(value, min = 0, max = 999) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function normalizeList(value = []) {
    if (!Array.isArray(value)) return [];
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }

  function normalizeUpperList(value = []) {
    return normalizeList(value).map((entry) => entry.replace(/[\s-]+/g, "_").toUpperCase());
  }

  function unique(values = []) {
    return [...new Set(values.filter(Boolean))];
  }

  function normalizeBodyRegionKey(value = "") {
    const canonical = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    return REGION_BY_KEY[canonical]?.key || "";
  }

  function normalizeBodyAnchorForLayer(value = "") {
    return normalizeBodyRegionKey(value);
  }

  function normalizeBodyLayerKey(value = "", fallback = "") {
    const canonical = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    if (BODY_LAYERS.includes(canonical)) return canonical;
    const fallbackKey = String(fallback || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    return BODY_LAYERS.includes(fallbackKey) ? fallbackKey : "";
  }

  function normalizeFootprint(value = "1x1") {
    const footprint = String(value || "1x1").trim().toLowerCase() || "1x1";
    const [rawWidth, rawHeight] = footprint.split("x").map(Number);
    const width = Number.isFinite(rawWidth) && rawWidth > 0 ? Math.round(rawWidth) : 1;
    const height = Number.isFinite(rawHeight) && rawHeight > 0 ? Math.round(rawHeight) : 1;
    return { footprint: `${width}x${height}`, width, height, slots: width * height };
  }

  function getItemTokens(source = {}) {
    return unique([source.category, source.subtype, ...(Array.isArray(source.tags) ? source.tags : [])]
      .map((entry) => String(entry || "").trim().replace(/[\s-]+/g, "_").toUpperCase())
      .filter(Boolean));
  }

  function inferEquipLayer(source = {}) {
    const tokens = new Set(getItemTokens(source));
    const isShinMountItem = tokens.has("SHIN_PAD") || tokens.has("SHIN_GUARD") || tokens.has("SHIN_ARMOR")
      || tokens.has("SMALL_HOLSTER") || tokens.has("SHIN_HOLSTER");
    if (isShinMountItem) return "";
    if (tokens.has("WEAPON") || tokens.has("TOOLS") || tokens.has("TOOL") || tokens.has("MEDICAL")) return "HELD";
    if (tokens.has("RESPIRATOR") || tokens.has("MASK") || tokens.has("FACE")) return "FACE";
    if (tokens.has("BOOTS") || tokens.has("FOOTWEAR") || tokens.has("SHOES")) return "FOOTWEAR";
    if (tokens.has("ARMOR") || tokens.has("VEST") || tokens.has("GUARD")) return "ARMOR";
    if (tokens.has("OUTERWEAR") || tokens.has("ANORAK") || tokens.has("COAT")) return "OUTERWEAR";
    if (tokens.has("SWEATSHIRT") || tokens.has("JACKET") || tokens.has("TROUSERS") || tokens.has("OUTER")) return "OUTER";
    if (tokens.has("HEADGEAR") || tokens.has("HELMET") || tokens.has("HAT") || tokens.has("CAP")) return "OUTER";
    if (tokens.has("CLOTHING") || tokens.has("GLOVES") || tokens.has("SOCKS") || tokens.has("UNDERSUIT")) return "INNER";
    return "";
  }

  function normalizeConstraintList(value = []) {
    if (!Array.isArray(value)) return [];
    return value.map((entry) => {
      if (typeof entry === "string") {
        const [rawAnchor, rawLayer] = entry.split(":");
        const layer = normalizeBodyLayerKey(rawLayer);
        const anchor = normalizeBodyAnchorForLayer(rawAnchor, layer);
        return anchor && layer ? { anchor, layer } : null;
      }
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const layer = normalizeBodyLayerKey(entry.layer);
      const anchor = normalizeBodyAnchorForLayer(entry.anchor || entry.region || entry.slot, layer);
      return anchor && layer ? { anchor, layer } : null;
    }).filter(Boolean);
  }

  function normalizeBodyMountSet(value = {}, index = 0) {
    const source = Array.isArray(value) ? { mountIds: value } : value && typeof value === "object" ? value : { mountIds: [value] };
    const mountIds = unique((Array.isArray(source.mountIds) ? source.mountIds : []).map((entry) => String(entry || "").trim().replace(/[\s-]+/g, "_").toUpperCase()).filter((entry) => MOUNT_BY_KEY[entry]));
    if (!mountIds.length) return null;
    return {
      id: String(source.id || source.key || mountIds.join("+") || `mount-set-${index + 1}`).trim().replace(/[\s-]+/g, "_").toUpperCase(),
      label: String(source.label || mountIds.map((mountId) => MOUNT_BY_KEY[mountId]?.label || mountId).join(" + ")).trim(),
      mountIds
    };
  }

  function inferBodyMountSets(source = {}, allowedAnchors = []) {
    const tokens = new Set(getItemTokens(source));
    if (tokens.has("BACKPACK")) return [normalizeBodyMountSet({ id: "BACKPACK", mountIds: ["BACK_CARRY", "LEFT_SHOULDER_CARRY", "RIGHT_SHOULDER_CARRY"] })];
    if (tokens.has("BELT") || tokens.has("WAIST_BAG") || tokens.has("FANNY_PACK")) return [normalizeBodyMountSet({ id: "WAIST", mountIds: ["WAIST_CARRY"] })];
    const supportsShinMount = tokens.has("SHIN_PAD") || tokens.has("SHIN_GUARD") || tokens.has("SHIN_ARMOR")
      || tokens.has("SMALL_HOLSTER") || tokens.has("SHIN_HOLSTER");
    if (supportsShinMount) {
      if (tokens.has("LEFT") || allowedAnchors.includes("LEFT_SHIN")) return [normalizeBodyMountSet({ id: "LEFT_SHIN", mountIds: ["LEFT_SHIN_MOUNT"] })];
      if (tokens.has("RIGHT") || allowedAnchors.includes("RIGHT_SHIN")) return [normalizeBodyMountSet({ id: "RIGHT_SHIN", mountIds: ["RIGHT_SHIN_MOUNT"] })];
      return [
        normalizeBodyMountSet({ id: "LEFT_SHIN", label: "Left Shin Mount", mountIds: ["LEFT_SHIN_MOUNT"] }),
        normalizeBodyMountSet({ id: "RIGHT_SHIN", label: "Right Shin Mount", mountIds: ["RIGHT_SHIN_MOUNT"] })
      ];
    }
    if (tokens.has("HOLSTER")) {
      if (tokens.has("LEFT") || allowedAnchors.includes("LEFT_THIGH")) return [normalizeBodyMountSet({ id: "LEFT_THIGH", mountIds: ["LEFT_THIGH_HOLSTER"] })];
      if (tokens.has("RIGHT") || allowedAnchors.includes("RIGHT_THIGH")) return [normalizeBodyMountSet({ id: "RIGHT_THIGH", mountIds: ["RIGHT_THIGH_HOLSTER"] })];
    }
    if (tokens.has("IMPLANT_PORT_DEVICE") || tokens.has("PORT_DEVICE")) return [normalizeBodyMountSet({ id: "IMPLANT_PORT", mountIds: ["IMPLANT_PORT"] })];
    if (tokens.has("FOREARM_ACCESSORY") || tokens.has("WATCH") || tokens.has("BRACELET")) {
      return ["LEFT_FOREARM_ACCESSORY_1", "LEFT_FOREARM_ACCESSORY_2", "RIGHT_FOREARM_ACCESSORY_1", "RIGHT_FOREARM_ACCESSORY_2"]
        .map((mountId) => normalizeBodyMountSet({ id: mountId, mountIds: [mountId] }));
    }
    if (tokens.has("BAG") || tokens.has("SLING") || tokens.has("SCABBARD") || tokens.has("SHEATH") || tokens.has("CARRY")) {
      return [
        normalizeBodyMountSet({ id: "LEFT_SHOULDER", mountIds: ["LEFT_SHOULDER_CARRY"] }),
        normalizeBodyMountSet({ id: "RIGHT_SHOULDER", mountIds: ["RIGHT_SHOULDER_CARRY"] })
      ];
    }
    return [];
  }

  function normalizeMountProfile(source = {}) {
    const raw = source.mountProfile && typeof source.mountProfile === "object" && !Array.isArray(source.mountProfile) ? source.mountProfile : {};
    const slots = (Array.isArray(raw.slots) ? raw.slots : []).map((entry, index) => {
      const slot = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
      const id = String(slot.id || slot.key || `MOUNT_${index + 1}`).trim().replace(/[\s-]+/g, "_").toUpperCase();
      const type = String(slot.type || slot.mountType || id).trim().replace(/[\s-]+/g, "_").toUpperCase();
      return id && type ? {
        id,
        type,
        label: String(slot.label || id).trim(),
        acceptedTags: normalizeUpperList(slot.acceptedTags),
        blockedTags: normalizeUpperList(slot.blockedTags)
      } : null;
    }).filter(Boolean);
    return slots.length ? { slots } : null;
  }

  function normalizeEquipProfile(source = {}) {
    const raw = source.equipProfile && typeof source.equipProfile === "object" && !Array.isArray(source.equipProfile)
      ? source.equipProfile
      : {};
    const layer = normalizeBodyLayerKey(raw.layer, inferEquipLayer(source));
    const allowedAnchors = unique((Array.isArray(raw.allowedAnchors) ? raw.allowedAnchors : [])
      .map((anchor) => normalizeBodyAnchorForLayer(anchor, layer)).filter(Boolean));
    const coverage = unique((Array.isArray(raw.coverage) ? raw.coverage : [])
      .map((anchor) => normalizeBodyAnchorForLayer(anchor, layer)).filter(Boolean));
    let bodyMountSets = (Array.isArray(raw.bodyMountSets) ? raw.bodyMountSets : []).map(normalizeBodyMountSet).filter(Boolean);
    if (!bodyMountSets.length && !layer) bodyMountSets = inferBodyMountSets(source, allowedAnchors);
    return {
      allowedAnchors,
      layer,
      coverage,
      bodyMountSets,
      itemMountTypes: unique((Array.isArray(raw.itemMountTypes) ? raw.itemMountTypes : []).map((entry) => String(entry || "").trim().replace(/[\s-]+/g, "_").toUpperCase())),
      handsRequired: Math.max(1, Math.min(2, Math.round(Number(raw.handsRequired || 1)) || 1)),
      countsAsBulkyCarrier: raw.countsAsBulkyCarrier === true,
      requires: normalizeConstraintList(raw.requires || []),
      blocks: normalizeConstraintList(raw.blocks || [])
    };
  }

  function normalizeEquippedLocation(source = {}, equipProfile = normalizeEquipProfile(source)) {
    const raw = source.equippedLocation && typeof source.equippedLocation === "object" && !Array.isArray(source.equippedLocation)
      ? source.equippedLocation
      : null;
    if (!raw) return null;
    const kind = String(raw.kind || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    if (kind === "ITEM_MOUNT") {
      const ownerItemId = String(raw.ownerItemId || "").trim();
      const mountId = String(raw.mountId || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
      return ownerItemId && mountId ? { kind: "ITEM_MOUNT", ownerItemId, mountId } : null;
    }
    if (kind === "BODY_MOUNT") {
      const mountIds = unique((Array.isArray(raw.mountIds) ? raw.mountIds : [])
        .map((entry) => String(entry || "").trim().replace(/[\s-]+/g, "_").toUpperCase())
        .filter((entry) => MOUNT_BY_KEY[entry]));
      if (!mountIds.length) return null;
      const primaryMountId = String(raw.primaryMountId || mountIds[0]).trim().replace(/[\s-]+/g, "_").toUpperCase();
      return mountIds.includes(primaryMountId) ? { kind: "BODY_MOUNT", primaryMountId, mountIds } : null;
    }
    if (kind !== "LAYER") return null;
    const layer = normalizeBodyLayerKey(raw.layer, equipProfile.layer || inferEquipLayer(source));
    const anchor = normalizeBodyAnchorForLayer(raw.anchor || raw.region, layer);
    const coverage = unique((Array.isArray(raw.coverage) ? raw.coverage : [])
      .map((entry) => normalizeBodyAnchorForLayer(entry, layer)).filter(Boolean));
    return anchor && layer ? { kind: "LAYER", anchor, layer, coverage } : null;
  }

  function getContainerHostId(source = {}) {
    return String(source.containerHostId || "").trim();
  }

  function hasContainerProfile(source = {}) {
    if (!source || typeof source !== "object" || Array.isArray(source)) return false;
    const explicitProfile = source.containerProfile && typeof source.containerProfile === "object" && !Array.isArray(source.containerProfile)
      ? source.containerProfile
      : null;
    const explicitCapacity = Number(explicitProfile?.slotCapacity ?? explicitProfile?.capacity ?? explicitProfile?.capacitySlots ?? source.capacitySlots ?? source.storageSlots ?? 0);
    if (explicitProfile && explicitCapacity > 0) return true;
    if (Array.isArray(source.supportSlots) && source.supportSlots.length) return true;
    if (Array.isArray(source.containerSlots) && source.containerSlots.length) return true;
    if (explicitCapacity > 0) return true;
    const subtype = String(source.subtype || source.modelType || "").trim().toUpperCase();
    const tags = normalizeUpperList(source.tags);
    const gridContainerKinds = new Set([
      "BACKPACK", "BAG", "WEAPON_BAG", "BELT", "POUCH", "CASE", "PACK",
      "CHEST_RIG", "SWORD_SCABBARD", "SOFT_CONTAINER", "MASS_COMPRESSION_CUBE", "CAPACITY_MODULE"
    ]);
    return [subtype, ...tags].some((entry) => gridContainerKinds.has(entry));
  }

  function normalizeContainerCellRules(value = []) {
    if (!Array.isArray(value)) return [];
    return value.map((entry) => {
      const source = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
      const column = clampInteger(source.column ?? source.col ?? source.x ?? 0, 0, 12);
      const row = clampInteger(source.row ?? source.y ?? 0, 0, 24);
      if (!column || !row) return null;
      return {
        column,
        row,
        key: String(source.key || source.type || source.label || "DEDICATED").trim().replace(/[\s-]+/g, "_").toUpperCase(),
        label: String(source.label || source.key || "DEDICATED").trim().toUpperCase(),
        acceptedTags: normalizeUpperList(source.acceptedTags),
        blockedTags: normalizeUpperList(source.blockedTags),
        footprintMode: String(source.footprintMode || "NATURAL").trim().toUpperCase() === "SLOT" ? "SLOT" : "NATURAL"
      };
    }).filter(Boolean);
  }

  function normalizeContainerProfile(source = {}) {
    if (!hasContainerProfile(source)) return null;
    const raw = source.containerProfile && typeof source.containerProfile === "object" && !Array.isArray(source.containerProfile)
      ? source.containerProfile
      : {};
    const slotCapacity = clampInteger(raw.slotCapacity ?? raw.capacity ?? raw.capacitySlots ?? source.capacitySlots ?? source.storageSlots ?? 0, 0, 9999);
    if (slotCapacity <= 0) return null;
    return {
      label: String(raw.label || source.containerLabel || source.name || "Container").trim(),
      slotCapacity,
      gridColumns: clampInteger(raw.gridColumns ?? raw.columns ?? source.gridColumns ?? source.containerGridColumns ?? 0, 0, 12),
      gridRows: clampInteger(raw.gridRows ?? raw.rows ?? source.gridRows ?? source.containerGridRows ?? 0, 0, 24),
      isolatedCells: raw.isolatedCells === true,
      cellRules: normalizeContainerCellRules(raw.cellRules),
      acceptedTags: normalizeUpperList(raw.acceptedTags || source.acceptedTags),
      blockedTags: normalizeUpperList(raw.blockedTags || source.blockedTags),
      source: raw === source.containerProfile ? "containerProfile" : "derived"
    };
  }

  function normalizeContainerPlacement(source = {}, containerHostId = "") {
    const hostId = String(containerHostId || "").trim();
    if (!hostId) return null;
    const raw = source.containerPlacement && typeof source.containerPlacement === "object" && !Array.isArray(source.containerPlacement)
      ? source.containerPlacement
      : null;
    if (!raw) return null;
    const placementContainerId = String(raw.containerId || raw.containerHostId || hostId).trim();
    const column = clampInteger(raw.column ?? raw.col ?? raw.x ?? 0, 0, 99);
    const row = clampInteger(raw.row ?? raw.y ?? 0, 0, 99);
    const rotationValue = ((Math.round(Number(raw.rotation) || 0) % 180) + 180) % 180;
    if (!column || !row || placementContainerId !== hostId) return null;
    return { containerId: hostId, column, row, rotation: rotationValue === 90 ? 90 : 0 };
  }

  function normalizeHousingPlacement(source = {}, storageUnitId = "") {
    const unitId = String(storageUnitId || "").trim();
    if (!unitId) return null;
    const raw = source.housingPlacement && typeof source.housingPlacement === "object" && !Array.isArray(source.housingPlacement)
      ? source.housingPlacement
      : null;
    if (!raw) return null;
    const placementUnitId = String(raw.storageUnitId || unitId).trim();
    const column = clampInteger(raw.column ?? raw.col ?? raw.x ?? 0, 0, 999);
    const row = clampInteger(raw.row ?? raw.y ?? 0, 0, 999);
    const rotationValue = ((Math.round(Number(raw.rotation) || 0) % 180) + 180) % 180;
    if (!column || !row || placementUnitId !== unitId) return null;
    return { storageUnitId: unitId, column, row, rotation: rotationValue === 90 ? 90 : 0 };
  }

  function normalizeEquipmentItem(item = {}, index = 0) {
    const source = item && typeof item === "object" && !Array.isArray(item) ? item : {};
    const footprint = normalizeFootprint(source.footprint || source.size || "1x1");
    const storageUnitId = String(source.storageUnitId || "").trim();
    const equipProfile = normalizeEquipProfile(source);
    const equippedLocation = normalizeEquippedLocation(source, equipProfile);
    const containerHostId = getContainerHostId(source);
    const containerPlacement = normalizeContainerPlacement(source, containerHostId);
    const housingPlacement = normalizeHousingPlacement(source, storageUnitId);
    const rawLocation = String(source.location || "").trim().toUpperCase();
    const parentItemInstanceId = String(source.parentItemInstanceId || source.locationData?.parentItemInstanceId || "").trim();
    const moduleSlotId = String(source.moduleSlotId || source.locationData?.moduleSlotId || "").trim();
    const householdPlacementSource = source.householdPlacement && typeof source.householdPlacement === "object" && !Array.isArray(source.householdPlacement)
      ? source.householdPlacement
      : source.locationData && typeof source.locationData === "object" && !Array.isArray(source.locationData)
        ? source.locationData
        : null;
    const householdPlacement = householdPlacementSource
      ? {
          housingRecordId: String(householdPlacementSource.housingRecordId || source.housingRecordId || "").trim(),
          roomId: String(householdPlacementSource.roomId || source.roomId || "").trim(),
          column: clampInteger(householdPlacementSource.column ?? householdPlacementSource.gridX ?? householdPlacementSource.x ?? 1, 1, 999),
          row: clampInteger(householdPlacementSource.row ?? householdPlacementSource.gridY ?? householdPlacementSource.y ?? 1, 1, 999),
          rotation: Number(householdPlacementSource.rotation) === 90 ? 90 : 0
        }
      : null;
    const householdLocated = ["HOUSEHOLD", "HOUSING_ROOM"].includes(rawLocation)
      && Boolean(householdPlacement?.housingRecordId && householdPlacement?.roomId);
    const installedInItem = rawLocation === "INSTALLED_IN_ITEM" && parentItemInstanceId && moduleSlotId;
    const location = equippedLocation
      ? "EQUIPPED"
      : containerHostId && containerPlacement
        ? "CONTAINER"
        : ["STORAGE", "HOUSING_STORAGE", "STORED", "SECURED_UNIT"].includes(rawLocation) && storageUnitId && housingPlacement
          ? "STORED"
          : householdLocated
            ? "HOUSEHOLD"
            : installedInItem
              ? "INSTALLED_IN_ITEM"
              : "ORPHAN";
    const isStored = location === "STORED";
    const isEquipped = location === "EQUIPPED";
    const isInGrid = location === "CONTAINER";
    const isInstalledInItem = location === "INSTALLED_IN_ITEM";
    const isHousehold = location === "HOUSEHOLD";
    const isOrphan = location === "ORPHAN";
    const containerProfile = normalizeContainerProfile(source);
    const mountProfile = normalizeMountProfile(source);
    const massCompressionIdentity = typeof window.WS_APP.normalizeMassCompressionEquipmentIdentity === "function"
      ? window.WS_APP.normalizeMassCompressionEquipmentIdentity(source)
      : {
          name: String(source.name || source.title || "Equipment Item").trim(),
          subtype: String(source.subtype || source.modelType || "").trim().toUpperCase(),
          tags: normalizeUpperList(source.tags)
        };
    const itemType = typeof window.WS_APP.resolveItemTypeId === "function"
      ? window.WS_APP.resolveItemTypeId(source)
      : String(source.itemType || source.itemTypeId || "GENERIC_ITEM").trim().replace(/[\s-]+/g, "_").toUpperCase();
    const itemTypeProfile = typeof window.WS_APP.normalizeItemTypeProfile === "function"
      ? window.WS_APP.normalizeItemTypeProfile(itemType, source.itemTypeProfile || source.typeProfile || {})
      : clone(source.itemTypeProfile || source.typeProfile || {});
    const itemState = typeof window.WS_APP.normalizeItemTypeState === "function"
      ? window.WS_APP.normalizeItemTypeState(itemType, source.itemState || {}, itemTypeProfile)
      : clone(source.itemState || { schemaVersion: 1, typeId: itemType, data: {} });
    const capabilities = typeof window.WS_APP.getItemTypeCapabilities === "function"
      ? window.WS_APP.getItemTypeCapabilities(itemType)
      : normalizeUpperList(source.capabilities);
    const itemTypeDefinition = typeof window.WS_APP.getItemTypeDefinition === "function"
      ? window.WS_APP.getItemTypeDefinition(itemType)
      : null;
    const itemId = String(source.itemId || source.id || `eq-item-${index + 1}`).trim();
    const playerLabel = String(source.playerLabel || "").trim();
    const catalogName = String(source.catalogName || massCompressionIdentity.name || source.name || source.title || itemId || "Equipment Item").trim() || "Equipment Item";
    const displayName = playerLabel || String(source.displayName || "").trim() || catalogName;
    const deprecatedKeys = new Set(["equippedSlot", "equippedLayer", "bodySlot", "bodyLayer", "equippedAnchor", "allowedSlots", "loadoutProfile", "requiredSlots", "containerItemId", "unitId", "parentItemId", "hostItemId", "gridPlacement", "storagePlacement"]);
    const preserved = Object.fromEntries(Object.entries(clone(source) || {}).filter(([key]) => !deprecatedKeys.has(key)));
    return {
      ...preserved,
      id: String(source.id || itemId || `eq-item-${index + 1}`).trim(),
      itemId,
      catalogId: String(source.catalogId || source.sourceCatalogId || source.itemId || "").trim(),
      playerLabel,
      catalogName,
      displayName,
      name: displayName,
      category: String(source.category || "MISC").trim().toUpperCase(),
      subtype: massCompressionIdentity.subtype,
      itemType,
      itemTypeLabel: String(itemTypeDefinition?.label || source.itemTypeLabel || itemType).trim(),
      itemTypeProfile,
      itemState,
      capabilities,
      tags: massCompressionIdentity.tags,
      compressionTier: Math.max(0, Math.round(Number(massCompressionIdentity.tier ?? source.compressionTier ?? source.capacityTier ?? 0)) || 0),
      footprint: footprint.footprint,
      width: footprint.width,
      height: footprint.height,
      slots: footprint.slots,
      equipProfile,
      equippedLocation: isEquipped ? equippedLocation : null,
      location,
      rawLocation,
      storageUnitId: isStored ? storageUnitId : "",
      housingPlacement: isStored ? housingPlacement : null,
      householdPlacement: isHousehold ? householdPlacement : null,
      supportSlots: Array.isArray(source.supportSlots || source.containerSlots) ? clone(source.supportSlots || source.containerSlots) : [],
      containerHostId: isInGrid ? containerHostId : "",
      containerPlacement: isInGrid ? containerPlacement : null,
      parentItemInstanceId: isInstalledInItem ? parentItemInstanceId : "",
      moduleSlotId: isInstalledInItem ? moduleSlotId : "",
      isContainer: Boolean(containerProfile),
      containerProfile,
      mountProfile,
      isStored,
      isEquipped,
      isInGrid,
      isInstalledInItem,
      isHousehold,
      isOrphan,
      isLocated: isStored || isEquipped || isInGrid || isInstalledInItem || isHousehold,
      isCarried: isEquipped || isInGrid || isInstalledInItem,
      isPacked: isInGrid,
      quantity: Math.max(1, Math.round(Number(source.quantity || 1)) || 1),
      status: String(source.status || "OWNED").trim().toUpperCase(),
      operatingStatus: String(source.operatingStatus || source.operationStatus || "ACTIVE").trim().toUpperCase(),
      legality: String(source.legality || "UNREGISTERED").trim().toUpperCase(),
      condition: Math.max(0, Math.min(100, Math.round(Number(source.condition ?? 100)) || 0)),
      archived: source.archived === true
    };
  }

  function getCitizenEquipmentItems(citizen = {}) {
    const citizenId = String(citizen?.id || citizen || "").trim();
    const items = citizenId && typeof window.WS_APP.getCitizenEquipmentItemInstanceViews === "function"
      ? window.WS_APP.getCitizenEquipmentItemInstanceViews(citizenId)
      : [];
    return items
      .filter((item) => item && typeof item === "object" && !Array.isArray(item) && item.archived !== true)
      .map((item, index) => normalizeEquipmentItem(item, index));
  }

  function isEquipmentCapacityProvider(item = {}) {
    const subtype = String(item?.subtype || "").trim().toUpperCase();
    const tags = normalizeUpperList(item?.tags);
    return subtype === "MASS_COMPRESSION_CUBE"
      || subtype === "CAPACITY_MODULE"
      || tags.includes("MASS_COMPRESSION_CUBE")
      || tags.includes("MCC")
      || tags.includes("CAPACITY_MODULE");
  }

  function indexById(items = []) {
    return items.reduce((next, item) => {
      if (item?.id) next[item.id] = item;
      return next;
    }, {});
  }

  function sortEquipmentContainers(items = []) {
    return (Array.isArray(items) ? items : [])
      .map((item, index) => ({ item, index }))
      .sort((left, right) => {
        const rank = (entry) => entry.item.isEquipped ? 0 : entry.item.isInGrid ? 1 : entry.item.isStored ? 3 : 2;
        return rank(left) - rank(right) || left.index - right.index;
      })
      .map((entry) => entry.item);
  }

  function getEquipmentTargetCitizen(user = window.WS_APP.currentUser) {
    const getter = window.WS_APP.getCitizenById;
    if (typeof getter !== "function") return null;
    if (user?.role !== "admin") return getter(user?.citizenId || "") || null;
    const requestedId = String(window.WS_APP.equipmentTargetCitizenId || window.WS_APP.currentCitizenCardsSelectedId || window.WS_APP.terminalTargetCitizenId || "").trim();
    const requested = requestedId ? getter(requestedId) : null;
    if (requested && requested.recordType !== "admin") {
      window.WS_APP.equipmentTargetCitizenId = requested.id;
      return requested;
    }
    const citizens = typeof window.WS_APP.getCitizens === "function" ? window.WS_APP.getCitizens() : [];
    const fallback = citizens.find((citizen) => citizen && citizen.recordType !== "admin") || null;
    if (fallback?.id) window.WS_APP.equipmentTargetCitizenId = fallback.id;
    return fallback;
  }

  function getEquipmentCitizens(user = window.WS_APP.currentUser) {
    if (user?.role === "admin") {
      const citizens = typeof window.WS_APP.getCitizens === "function" ? window.WS_APP.getCitizens() : [];
      return citizens.filter((citizen) => citizen && citizen.recordType !== "admin");
    }
    const citizen = getEquipmentTargetCitizen(user);
    return citizen ? [citizen] : [];
  }

  function makeEquipmentItemId(citizen = {}, name = "equipment-item") {
    const slug = String(name || "equipment-item").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "equipment-item";
    const existing = new Set(getCitizenEquipmentItems(citizen).map((item) => item.id));
    let candidate = `eq-${String(citizen?.id || "citizen").replace(/[^a-zA-Z0-9_-]+/g, "-")}-${slug}`;
    let counter = 2;
    while (existing.has(candidate)) candidate = `eq-${String(citizen?.id || "citizen").replace(/[^a-zA-Z0-9_-]+/g, "-")}-${slug}-${counter++}`;
    return candidate;
  }

  function buildEquipmentItemFromCatalog(catalogId = "", citizen = {}, overrides = {}) {
    const catalogItem = typeof window.WS_APP.getEquipmentCatalogItemById === "function" ? window.WS_APP.getEquipmentCatalogItemById(catalogId) : null;
    if (!catalogItem) return null;
    const source = { ...catalogItem, ...(overrides && typeof overrides === "object" ? overrides : {}) };
    return normalizeEquipmentItem({
      ...source,
      id: source.id && source.id !== source.catalogId ? source.id : makeEquipmentItemId(citizen, source.name || source.title || source.catalogId || catalogId),
      itemId: source.itemId || source.catalogId || source.id || catalogId,
      catalogId: source.catalogId || source.id || catalogId,
      location: source.location || "ORPHAN",
      storageUnitId: String(source.storageUnitId || "").trim(),
      containerHostId: String(source.containerHostId || "").trim(),
      equippedLocation: null,
      status: source.status || "OWNED",
      operatingStatus: source.operatingStatus || "ACTIVE",
      archived: false
    }, getCitizenEquipmentItems(citizen).length);
  }

  function getEquipmentCoverageRegions(item = {}, anchorOverride = "") {
    const anchor = normalizeBodyRegionKey(anchorOverride || item?.equippedLocation?.anchor || "");
    const profileCoverage = Array.isArray(item?.equipProfile?.coverage) ? item.equipProfile.coverage : [];
    const locationCoverage = Array.isArray(item?.equippedLocation?.coverage) ? item.equippedLocation.coverage : [];
    const coverage = [...profileCoverage, ...locationCoverage].map(normalizeBodyRegionKey).filter(Boolean);
    return unique([anchor, ...coverage]);
  }

  function buildEquipmentBodyOccupancy(items = []) {
    const map = {};
    const conflicts = [];
    (Array.isArray(items) ? items : []).filter((item) => item?.isEquipped && item.equippedLocation?.kind === "LAYER").forEach((item) => {
      const anchor = normalizeBodyRegionKey(item.equippedLocation.anchor);
      const layer = normalizeBodyLayerKey(item.equippedLocation.layer, item.equipProfile?.layer);
      getEquipmentCoverageRegions(item, anchor).forEach((regionKey) => {
        const key = `${regionKey}:${layer}`;
        const entry = { key, regionKey, layer, item, itemId: item.id, anchor, role: regionKey === anchor ? "PRIMARY" : "RESERVED" };
        if (map[key] && map[key].itemId !== item.id) conflicts.push({ kind: "BODY_LAYER", key, existing: map[key], incoming: entry });
        else map[key] = entry;
      });
    });
    return { map, conflicts };
  }

  function buildEquipmentBodyMountOccupancy(items = []) {
    const map = {};
    const conflicts = [];
    (Array.isArray(items) ? items : []).filter((item) => item?.isEquipped && item.equippedLocation?.kind === "BODY_MOUNT").forEach((item) => {
      const mountIds = unique((Array.isArray(item.equippedLocation.mountIds) ? item.equippedLocation.mountIds : []).map((entry) => String(entry || "").trim().replace(/[\s-]+/g, "_").toUpperCase()).filter((entry) => MOUNT_BY_KEY[entry]));
      mountIds.forEach((mountId, index) => {
        const definition = MOUNT_BY_KEY[mountId];
        const entry = { key: mountId, mountId, definition, regionKey: definition.regionKey, item, itemId: item.id, role: index === 0 ? "PRIMARY" : "RESERVED" };
        if (map[mountId] && map[mountId].itemId !== item.id) conflicts.push({ kind: "BODY_MOUNT", key: mountId, existing: map[mountId], incoming: entry });
        else map[mountId] = entry;
      });
    });
    return { map, conflicts };
  }

  function buildEquipmentItemMountOccupancy(items = [], itemById = indexById(items)) {
    const map = {};
    const conflicts = [];
    (Array.isArray(items) ? items : []).filter((item) => item?.isEquipped && item.equippedLocation?.kind === "ITEM_MOUNT").forEach((item) => {
      const ownerItemId = String(item.equippedLocation.ownerItemId || "").trim();
      const mountId = String(item.equippedLocation.mountId || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
      const owner = itemById[ownerItemId] || null;
      const slot = owner?.mountProfile?.slots?.find((entry) => entry.id === mountId) || null;
      const key = `${ownerItemId}:${mountId}`;
      const entry = { key, ownerItemId, mountId, owner, slot, item, itemId: item.id, role: "MOUNTED" };
      if (!owner?.isLocated || !slot) conflicts.push({ kind: "ITEM_MOUNT_INVALID", key, incoming: entry });
      else if (map[key] && map[key].itemId !== item.id) conflicts.push({ kind: "ITEM_MOUNT", key, existing: map[key], incoming: entry });
      else map[key] = entry;
    });
    return { map, conflicts };
  }

  function getEquippedItemRegionKey(item = {}, itemById = {}) {
    const location = item?.equippedLocation || {};
    if (location.kind === "LAYER") return normalizeBodyRegionKey(location.anchor);
    if (location.kind === "BODY_MOUNT") return MOUNT_BY_KEY[location.primaryMountId || location.mountIds?.[0]]?.regionKey || "";
    if (location.kind === "ITEM_MOUNT") return getEquippedItemRegionKey(itemById[location.ownerItemId] || {}, itemById);
    return "";
  }

  function isItemCompatibleWithBodyRegion(item = {}, region = {}, layer = "") {
    if (!item || !region || item.isStored || item.isEquipped || item.isOrphan || item.installOnlyCandidate === true || item.notWearable === true) return false;
    const profile = item.equipProfile || normalizeEquipProfile(item);
    const targetLayer = normalizeBodyLayerKey(layer || profile.layer);
    if (profile.allowedAnchors.includes(region.key) && profile.layer === targetLayer && region.allowedLayers.includes(targetLayer)) return true;
    return profile.bodyMountSets.some((set) => set.mountIds.some((mountId) => MOUNT_BY_KEY[mountId]?.regionKey === region.key));
  }

  function getEquipmentBodyRegionState(citizen = {}, items = getCitizenEquipmentItems(citizen)) {
    const itemById = indexById(items);
    const layerOccupancy = buildEquipmentBodyOccupancy(items);
    const bodyMountOccupancy = buildEquipmentBodyMountOccupancy(items);
    const itemMountOccupancy = buildEquipmentItemMountOccupancy(items, itemById);
    const baseRegions = BODY_REGION_DEFINITIONS.map((definition) => {
      const layers = definition.allowedLayers.map((layer) => {
        const entry = layerOccupancy.map[`${definition.key}:${layer}`] || null;
        return { key: layer, label: layer, occupant: entry?.item || null, occupancy: entry, role: entry?.role || "EMPTY", occupied: Boolean(entry) };
      });
      const mounts = (definition.mountIds || []).map((mountId) => {
        const definitionEntry = MOUNT_BY_KEY[mountId];
        const occupancy = bodyMountOccupancy.map[mountId] || null;
        const armorBlocksMount = (
          (mountId === "LEFT_FOREARM_ACCESSORY_2" && Boolean(layerOccupancy.map["LEFT_FOREARM:ARMOR"]))
          || (mountId === "RIGHT_FOREARM_ACCESSORY_2" && Boolean(layerOccupancy.map["RIGHT_FOREARM:ARMOR"]))
        );
        return {
          key: mountId,
          label: definitionEntry?.label || mountId,
          definition: definitionEntry,
          occupant: occupancy?.item || null,
          occupancy,
          role: occupancy?.role || "EMPTY",
          occupied: Boolean(occupancy),
          blocked: armorBlocksMount && !occupancy,
          blockedReason: armorBlocksMount ? "FOREARM_ARMOR" : ""
        };
      });
      const itemMounts = items.filter((owner) => owner?.isEquipped && owner.mountProfile?.slots?.length && getEquippedItemRegionKey(owner, itemById) === definition.key)
        .flatMap((owner) => owner.mountProfile.slots.map((slot) => {
          const occupancy = itemMountOccupancy.map[`${owner.id}:${slot.id}`] || null;
          return { key: `${owner.id}:${slot.id}`, owner, ownerItemId: owner.id, slot, label: `${owner.name} / ${slot.label}`, occupant: occupancy?.item || null, occupancy, role: occupancy ? "MOUNTED" : "EMPTY", occupied: Boolean(occupancy) };
        }));
      const visibleLayers = layers.filter((entry) => CYBERGRID_LAYERS.includes(entry.key));
      const compatibleItems = items.filter((item) => isItemCompatibleWithBodyRegion(item, definition, item.equipProfile?.layer));
      return {
        ...definition,
        bodymapHidden: BODYMAP_HIDDEN_REGION_KEYS.has(definition.key),
        allowedLayers: [...definition.allowedLayers],
        mountIds: [...(definition.mountIds || [])],
        layers,
        visibleLayers,
        mounts,
        itemMounts,
        stack: visibleLayers.filter((entry) => entry.occupied),
        compatibleItems,
        compatibleCount: compatibleItems.length,
        occupiedLayerCount: layers.filter((entry) => entry.occupied).length,
        occupiedMountCount: mounts.filter((entry) => entry.occupied).length + itemMounts.filter((entry) => entry.occupied).length,
        occupiedCount: layers.filter((entry) => entry.occupied).length + mounts.filter((entry) => entry.occupied).length + itemMounts.filter((entry) => entry.occupied).length
      };
    });

    const baseByKey = baseRegions.reduce((next, region) => {
      next[region.key] = region;
      return next;
    }, {});

    const compositeRegions = BODY_REGION_COMPOSITES.map((definition) => {
      const childRegions = definition.childRegionKeys.map((key) => baseByKey[key]).filter(Boolean);
      const layers = childRegions.flatMap((region) => region.layers || []);
      const visibleLayers = childRegions.flatMap((region) => (region.visibleLayers || []).map((layer) => ({ ...layer, sourceRegionKey: region.key, sourceRegionLabel: region.label })));
      const mounts = childRegions.flatMap((region) => (region.mounts || []).map((mount) => ({ ...mount, sourceRegionKey: region.key, sourceRegionLabel: region.label })));
      const itemMounts = childRegions.flatMap((region) => (region.itemMounts || []).map((mount) => ({ ...mount, sourceRegionKey: region.key, sourceRegionLabel: region.label })));
      const compatibleItems = [...new Map(childRegions.flatMap((region) => region.compatibleItems || []).map((item) => [item.id, item])).values()];
      const shoulderArmorOccupants = definition.key === "SHOULDERS"
        ? childRegions.flatMap((region) => (region.visibleLayers || []).filter((layer) => layer.key === "ARMOR" && layer.occupied).map((layer) => layer.occupant)).filter(Boolean)
        : [];
      const forearmArmorMountConflicts = definition.key === "FOREARMS"
        ? childRegions.filter((region) => {
          const armorOccupied = (region.visibleLayers || []).some((layer) => layer.key === "ARMOR" && layer.occupied);
          const sideMountId = region.key === "LEFT_FOREARM" ? "LEFT_FOREARM_ACCESSORY_2" : region.key === "RIGHT_FOREARM" ? "RIGHT_FOREARM_ACCESSORY_2" : "";
          return armorOccupied && sideMountId && (region.mounts || []).some((mount) => mount.key === sideMountId && mount.occupied);
        })
        : [];
      const hasConflict = (definition.key === "SHOULDERS" && shoulderArmorOccupants.length > 1)
        || (definition.key === "FOREARMS" && forearmArmorMountConflicts.length > 0);
      return {
        ...definition,
        isComposite: true,
        bodymapHidden: false,
        childRegions,
        allowedLayers: [...new Set(childRegions.flatMap((region) => region.allowedLayers || []))],
        mountIds: childRegions.flatMap((region) => region.mountIds || []),
        layers,
        visibleLayers,
        mounts,
        itemMounts,
        stack: visibleLayers.filter((entry) => entry.occupied),
        compatibleItems,
        compatibleCount: compatibleItems.length,
        occupiedLayerCount: visibleLayers.filter((entry) => entry.occupied).length,
        occupiedMountCount: mounts.filter((entry) => entry.occupied).length + itemMounts.filter((entry) => entry.occupied).length,
        occupiedCount: visibleLayers.filter((entry) => entry.occupied).length + mounts.filter((entry) => entry.occupied).length + itemMounts.filter((entry) => entry.occupied).length,
        hasConflict,
        conflictCode: definition.key === "SHOULDERS" && shoulderArmorOccupants.length > 1
          ? "MULTIPLE_SHOULDER_ARMOR"
          : definition.key === "FOREARMS" && forearmArmorMountConflicts.length
            ? "FOREARM_ARMOR_MOUNT_CONFLICT"
            : ""
      };
    });

    return [...baseRegions, ...compositeRegions];
  }

  function buildEquipmentCarryPenalty(items = []) {
    const carriers = (Array.isArray(items) ? items : []).filter((item) => item?.isEquipped && item.equipProfile?.countsAsBulkyCarrier === true);
    const count = carriers.length;
    const penaltyPercent = count <= 1 ? 0 : count === 2 ? 40 : 75;
    return {
      carrierCount: count,
      penaltyPercent,
      reflexMultiplier: (100 - penaltyPercent) / 100,
      dexterityMultiplier: (100 - penaltyPercent) / 100,
      affectedStats: penaltyPercent ? ["REFLEX", "DEXTERITY"] : [],
      carrierItemIds: carriers.map((item) => item.id)
    };
  }

  function getEquipmentBodyRegionGroups(regions = []) {
    const source = Array.isArray(regions) && regions.length ? regions : BODY_REGION_DEFINITIONS;
    return BODY_REGION_GROUPS.map((group) => {
      const groupRegions = source.filter((region) => region.group === group.key && region.bodymapHidden !== true);
      return {
        ...group,
        regions: groupRegions,
        regionCount: groupRegions.length,
        occupiedCount: groupRegions.reduce((sum, region) => sum + Number(region.occupiedCount || 0), 0)
      };
    }).filter((group) => group.regionCount > 0);
  }

  function getEquipmentItemIndexRecord(citizenId = "") {
    window.WS_APP.equipmentItemIndexStateByCitizen = window.WS_APP.equipmentItemIndexStateByCitizen || {};
    const key = String(citizenId || "default");
    if (!window.WS_APP.equipmentItemIndexStateByCitizen[key] || typeof window.WS_APP.equipmentItemIndexStateByCitizen[key] !== "object") {
      window.WS_APP.equipmentItemIndexStateByCitizen[key] = { open: false, query: "", category: "ALL" };
    }
    return window.WS_APP.equipmentItemIndexStateByCitizen[key];
  }

  function normalizeEquipmentBodymapView(view = "front") {
    return String(view || "front").trim().toLowerCase() === "back" ? "back" : "front";
  }

  function getEquipmentSelectionState(citizenId = "") {
    const itemIndex = getEquipmentItemIndexRecord(citizenId);
    const selectedRegion = normalizeBodyRegionKey(window.WS_APP.equipmentSelectedRegion || "");
    window.WS_APP.equipmentSelectedRegion = selectedRegion;
    return {
      selectedItemId: String(window.WS_APP.equipmentSelectedItemId || "").trim(),
      selectedRegion,
      inspectorReturnRegion: normalizeBodyRegionKey(window.WS_APP.equipmentInspectorReturnRegion || ""),
      selectedBodyRegionFilter: String(window.WS_APP.equipmentBodyRegionFilter || "all").trim().toLowerCase() || "all",
      selectedBodymapView: normalizeEquipmentBodymapView(window.WS_APP.equipmentBodymapView || "front"),
      selectedContainerId: String(window.WS_APP.equipmentSelectedContainerId || "").trim(),
      inspectedContainerId: String(window.WS_APP.equipmentInspectedContainerId || "").trim(),
      selectedStorageUnitId: String(window.WS_APP.equipmentSelectedStorageUnitId || "").trim(),
      itemIndexOpen: itemIndex.open === true,
      itemIndexQuery: String(itemIndex.query || ""),
      itemIndexCategory: String(itemIndex.category || "ALL").trim().toUpperCase() || "ALL"
    };
  }

  function buildEquipmentStorageRegions(containers = [], itemById = {}) {
    const activeContainers = (Array.isArray(containers) ? containers : []).filter((container) => container?.id && !container.isStored && !container.isOrphan);
    const activeById = activeContainers.reduce((next, container) => { next[container.id] = container; return next; }, {});
    const childrenByParent = activeContainers.reduce((next, container) => {
      const parentId = String(container.containerHostId || "").trim();
      if (!container.isInGrid || !activeById[parentId]) return next;
      next[parentId] = next[parentId] || [];
      next[parentId].push(container);
      return next;
    }, {});
    const roots = activeContainers.filter((container) => !container.isInGrid || !activeById[String(container.containerHostId || "").trim()]);
    const regions = [];
    const visited = new Set();
    const visit = (container, depth = 0, lineage = []) => {
      const containerId = String(container?.id || "").trim();
      if (!containerId || visited.has(containerId)) return;
      visited.add(containerId);
      const parentId = container.isInGrid ? String(container.containerHostId || "").trim() : "";
      const parent = parentId ? activeById[parentId] || itemById[parentId] || null : null;
      const containerName = String(container.name || container.containerProfile?.label || containerId).trim();
      const nextLineage = [...lineage, containerName];
      regions.push({
        id: `storage-region:${containerId}`,
        containerId,
        containerName,
        parentContainerId: parentId,
        parentContainerName: String(parent?.name || parent?.containerProfile?.label || parentId || "").trim(),
        bodyAnchor: container.isEquipped ? getEquippedItemRegionKey(container, itemById) : "",
        bodyLayer: container.isEquipped ? (container.equippedLocation?.kind === "LAYER" ? String(container.equippedLocation?.layer || "").trim() : "MOUNT") : "",
        bodyMountIds: container.isEquipped && container.equippedLocation?.kind === "BODY_MOUNT" ? [...(container.equippedLocation.mountIds || [])] : [],
        depth,
        locationType: container.isEquipped ? "BODY" : container.isInGrid ? "CONTAINER" : "ACTIVE",
        lineage: nextLineage,
        pathLabel: nextLineage.join(" / ")
      });
      (childrenByParent[containerId] || []).forEach((child) => visit(child, depth + 1, nextLineage));
    };
    roots.forEach((container) => visit(container));
    activeContainers.forEach((container) => visit(container));
    return regions;
  }

  function resolveVisibleContainerId(items = [], containerId = "") {
    const id = String(containerId || "").trim();
    if (!id) return "";
    return items.find((item) => item?.id === id && item.isContainer) ? id : "";
  }

  function activateEquipmentStorageRegion(containerId = "") {
    const id = String(containerId || "").trim();
    window.WS_APP.equipmentSelectedContainerId = id;
    window.WS_APP.equipmentInspectedContainerId = id;
    window.WS_APP.equipmentSelectedItemId = "";
    window.WS_APP.equipmentSelectedRegion = "";
    window.WS_APP.equipmentInspectorReturnRegion = "";
    return getEquipmentSelectionState();
  }

  function setEquipmentSelectedItem(itemId = "") {
    window.WS_APP.equipmentSelectedItemId = String(itemId || "").trim();
    window.WS_APP.equipmentInspectedContainerId = "";
    window.WS_APP.equipmentInspectorReturnRegion = "";
    if (window.WS_APP.equipmentSelectedItemId) window.WS_APP.equipmentSelectedRegion = "";
    return getEquipmentSelectionState();
  }

  function setEquipmentSelectedItemFromRegion(itemId = "", regionKey = "") {
    window.WS_APP.equipmentSelectedItemId = String(itemId || "").trim();
    window.WS_APP.equipmentInspectedContainerId = "";
    window.WS_APP.equipmentInspectorReturnRegion = normalizeBodyRegionKey(regionKey);
    if (window.WS_APP.equipmentSelectedItemId) window.WS_APP.equipmentSelectedRegion = "";
    return getEquipmentSelectionState();
  }

  function returnEquipmentInspectorToRegion(regionKey = "") {
    const target = normalizeBodyRegionKey(regionKey || window.WS_APP.equipmentInspectorReturnRegion || "");
    window.WS_APP.equipmentSelectedItemId = "";
    window.WS_APP.equipmentInspectedContainerId = "";
    window.WS_APP.equipmentInspectorReturnRegion = "";
    window.WS_APP.equipmentSelectedRegion = target;
    return getEquipmentSelectionState();
  }

  function setEquipmentSelectedRegion(regionKey = "") {
    window.WS_APP.equipmentSelectedRegion = normalizeBodyRegionKey(regionKey);
    window.WS_APP.equipmentInspectedContainerId = "";
    window.WS_APP.equipmentInspectorReturnRegion = "";
    if (window.WS_APP.equipmentSelectedRegion) window.WS_APP.equipmentSelectedItemId = "";
    return getEquipmentSelectionState();
  }

  function setEquipmentSelectedContainer(containerId = "") {
    const id = String(containerId || "").trim();
    window.WS_APP.equipmentSelectedContainerId = id;
    window.WS_APP.equipmentInspectedContainerId = id;
    if (id) {
      window.WS_APP.equipmentSelectedItemId = "";
      window.WS_APP.equipmentSelectedRegion = "";
    }
    return getEquipmentSelectionState();
  }

  function setEquipmentSelectedContainerItem(itemId = "", containerId = "") {
    window.WS_APP.equipmentSelectedItemId = String(itemId || "").trim();
    window.WS_APP.equipmentSelectedContainerId = String(containerId || "").trim();
    window.WS_APP.equipmentInspectedContainerId = "";
    if (window.WS_APP.equipmentSelectedItemId || window.WS_APP.equipmentSelectedContainerId) window.WS_APP.equipmentSelectedRegion = "";
    return getEquipmentSelectionState();
  }

  function clearEquipmentSelectedItem() {
    window.WS_APP.equipmentSelectedItemId = "";
    window.WS_APP.equipmentInspectedContainerId = "";
    window.WS_APP.equipmentInspectorReturnRegion = "";
    return getEquipmentSelectionState();
  }

  function clearEquipmentActiveSelection() {
    window.WS_APP.equipmentSelectedItemId = "";
    window.WS_APP.equipmentSelectedRegion = "";
    window.WS_APP.equipmentInspectedContainerId = "";
    window.WS_APP.equipmentInspectorReturnRegion = "";
    return getEquipmentSelectionState();
  }

  function clearEquipmentSelection() {
    clearEquipmentActiveSelection();
    window.WS_APP.equipmentSelectedContainerId = "";
    return getEquipmentSelectionState();
  }

  function setEquipmentSelectedStorageUnit(unitId = "") {
    window.WS_APP.equipmentSelectedStorageUnitId = String(unitId || "").trim();
    return getEquipmentSelectionState();
  }

  function setEquipmentBodyRegionFilter(filter = "all") {
    window.WS_APP.equipmentBodyRegionFilter = String(filter || "all").trim().toLowerCase() || "all";
    return getEquipmentSelectionState();
  }

  function setEquipmentBodymapView(view = "front") {
    window.WS_APP.equipmentBodymapView = normalizeEquipmentBodymapView(view);
    return getEquipmentSelectionState();
  }

  function setEquipmentItemIndexOpen(citizenId = "", open = false) {
    getEquipmentItemIndexRecord(citizenId).open = open === true;
    return getEquipmentSelectionState(citizenId);
  }

  function toggleEquipmentItemIndex(citizenId = "") {
    const record = getEquipmentItemIndexRecord(citizenId);
    record.open = record.open !== true;
    return getEquipmentSelectionState(citizenId);
  }

  function setEquipmentItemIndexQuery(citizenId = "", query = "") {
    getEquipmentItemIndexRecord(citizenId).query = String(query || "").slice(0, 120);
    return getEquipmentSelectionState(citizenId);
  }

  function setEquipmentItemIndexCategory(citizenId = "", category = "ALL") {
    getEquipmentItemIndexRecord(citizenId).category = String(category || "ALL").trim().toUpperCase() || "ALL";
    return getEquipmentSelectionState(citizenId);
  }

  function getEquipmentStateSummaryFromItems(items = []) {
    const equippedItems = items.filter((item) => item.isEquipped);
    const gridItems = items.filter((item) => item.isInGrid);
    const storedItems = items.filter((item) => item.isStored);
    const orphanItems = items.filter((item) => item.isOrphan);
    const containers = sortEquipmentContainers(items.filter((item) => item.isContainer));
    return {
      itemCount: items.length,
      equippedCount: equippedItems.length,
      gridStoredCount: gridItems.length,
      carriedCount: equippedItems.length + gridItems.length,
      storedCount: storedItems.length,
      orphanCount: orphanItems.length,
      containerCount: containers.length,
      wornContainerCount: containers.filter((item) => item.isEquipped).length,
      nestedContainerCount: containers.filter((item) => item.isInGrid).length
    };
  }

  function getEquipmentState(citizen = {}, options = {}) {
    const items = Array.isArray(options.items)
      ? options.items.filter(Boolean).map((item, index) => normalizeEquipmentItem(item, index))
      : getCitizenEquipmentItems(citizen);
    const itemById = indexById(items);
    const bodyOccupancy = buildEquipmentBodyOccupancy(items);
    const bodyMountOccupancy = buildEquipmentBodyMountOccupancy(items);
    const itemMountOccupancy = buildEquipmentItemMountOccupancy(items, itemById);
    const bodyRegions = getEquipmentBodyRegionState(citizen, items);
    const bodyRegionGroups = getEquipmentBodyRegionGroups(bodyRegions);
    const equippedItems = items.filter((item) => item.isEquipped);
    const gridItems = items.filter((item) => item.isInGrid);
    const storedItems = items.filter((item) => item.isStored);
    const orphanItems = items.filter((item) => item.isOrphan);
    const containers = sortEquipmentContainers(items.filter((item) => item.isContainer && !item.isOrphan));
    const wornContainers = containers.filter((item) => item.isEquipped);
    const nestedContainers = containers.filter((item) => item.isInGrid);
    const storedContainers = containers.filter((item) => item.isStored);
    const activeContainers = containers.filter((item) => !item.isStored && !item.isOrphan);
    const storageRegions = buildEquipmentStorageRegions(activeContainers, itemById);
    let selectedContainerId = resolveVisibleContainerId(activeContainers, window.WS_APP.equipmentSelectedContainerId || "");
    if (!selectedContainerId) selectedContainerId = storageRegions[0]?.containerId || "";
    window.WS_APP.equipmentSelectedContainerId = selectedContainerId;
    const inspectedContainerId = resolveVisibleContainerId(activeContainers, window.WS_APP.equipmentInspectedContainerId || "");
    window.WS_APP.equipmentInspectedContainerId = inspectedContainerId;
    const selectedItemId = String(window.WS_APP.equipmentSelectedItemId || "").trim();
    const selectedItem = selectedItemId ? itemById[selectedItemId] || null : null;
    const carryPenalty = buildEquipmentCarryPenalty(items);
    const summary = { ...getEquipmentStateSummaryFromItems(items), bulkyCarrierCount: carryPenalty.carrierCount, reflexDexterityPenaltyPercent: carryPenalty.penaltyPercent };
    const equipmentConflicts = [...bodyOccupancy.conflicts, ...bodyMountOccupancy.conflicts, ...itemMountOccupancy.conflicts];
    return {
      version: EQUIPMENT_STATE_VERSION,
      status: orphanItems.length ? "INVALID_ORPHAN_ITEMS" : equipmentConflicts.length ? "INVALID_EQUIPMENT_OCCUPANCY" : EQUIPMENT_MODULE_STATUS,
      citizenId: String(citizen?.id || "").trim(),
      citizenName: String(citizen?.name || citizen?.legalName || "").trim(),
      items,
      itemById,
      selectedItem,
      bodyLayers: [...BODY_LAYERS],
      cybergridLayers: [...CYBERGRID_LAYERS],
      cyberwareLayers: [...CYBERWARE_LAYERS],
      bodyRegions,
      bodyRegionGroups,
      bodyOccupancy: bodyOccupancy.map,
      bodyMountDefinitions: BODY_MOUNT_DEFINITIONS.map((mount) => ({ ...mount, acceptedTags: [...mount.acceptedTags] })),
      bodyMountOccupancy: bodyMountOccupancy.map,
      itemMountOccupancy: itemMountOccupancy.map,
      bodyConflicts: equipmentConflicts,
      carryPenalty,
      loadout: {
        equippedItems,
        bodyRegions,
        bodyRegionGroups,
        wornContainers,
        handheldItems: equippedItems.filter((item) => item.equippedLocation?.kind === "LAYER" && item.equippedLocation?.layer === "HELD"),
        mountedItems: equippedItems.filter((item) => item.equippedLocation?.kind === "BODY_MOUNT" || item.equippedLocation?.kind === "ITEM_MOUNT")
      },
      inventory: { allItems: items, equippedItems, gridItems, storedItems, orphanItems, containers },
      storageTransfer: { storedItems, storedContainers, storableItems: [] },
      containers: { all: containers, active: activeContainers, worn: wornContainers, nested: nestedContainers, carried: nestedContainers, stored: storedContainers },
      storageRegions,
      locationAudit: { valid: orphanItems.length === 0 && equipmentConflicts.length === 0, orphanItems, orphanCount: orphanItems.length, bodyConflicts: equipmentConflicts },
      summary,
      selections: {
        ...getEquipmentSelectionState(citizen?.id || ""),
        selectedItemId: selectedItem ? selectedItem.id : "",
        selectedContainerId,
        inspectedContainerId
      }
    };
  }

  function getEquipmentStateSummary(citizen = {}, options = {}) {
    return getEquipmentState(citizen, options).summary;
  }

  function getEquipmentItemById(citizen = {}, itemId = "") {
    const id = String(itemId || "").trim();
    return id ? getCitizenEquipmentItems(citizen).find((item) => item.id === id || item.itemId === id) || null : null;
  }

  function getEquipmentModuleMetric(user = window.WS_APP.currentUser) {
    const citizenIds = getEquipmentCitizens(user)
      .map((citizen) => String(citizen?.id || "").trim())
      .filter(Boolean);
    const summary = typeof window.WS_APP.getEquipmentInstanceSummary === "function"
      ? window.WS_APP.getEquipmentInstanceSummary(citizenIds)
      : { itemCount: 0, equippedCount: 0, storedCount: 0, gridStoredCount: 0, unplacedCount: 0, carriedCount: 0 };
    const totals = {
      itemCount: Math.max(0, Number(summary?.itemCount) || 0),
      equippedCount: Math.max(0, Number(summary?.equippedCount) || 0),
      storedCount: Math.max(0, Number(summary?.storedCount) || 0),
      gridStoredCount: Math.max(0, Number(summary?.gridStoredCount) || 0),
      unplacedCount: Math.max(0, Number(summary?.unplacedCount) || 0),
      carriedCount: Math.max(0, Number(summary?.carriedCount) || 0)
    };
    return {
      label: totals.itemCount ? `${totals.itemCount} ITEM${totals.itemCount === 1 ? "" : "S"} / ${totals.equippedCount} EQUIPPED` : "EMPTY MODULE",
      empty: totals.itemCount === 0,
      statusLabel: "MODEL",
      statusClass: "info",
      ...totals,
      status: EQUIPMENT_MODULE_STATUS
    };
  }

  function locateEquipmentItem(citizen = {}, itemId = "") {
    const id = String(itemId || "").trim();
    if (!id) return { ok: false, code: "ITEM_REQUIRED" };
    const state = getEquipmentState(citizen);
    const item = state.itemById[id] || null;
    if (!item) return { ok: false, code: "ITEM_NOT_FOUND" };
    if (item.isInGrid && item.containerHostId) setEquipmentSelectedContainerItem(item.id, item.containerHostId);
    else setEquipmentSelectedItem(item.id);
    setEquipmentItemIndexOpen(citizen?.id || "", false);
    return {
      ok: true,
      code: "ITEM_LOCATED",
      itemId: item.id,
      location: item.location,
      containerId: item.containerHostId || "",
      anchor: item.equippedLocation?.anchor || "",
      layer: item.equippedLocation?.layer || ""
    };
  }

  const equipmentStore = {
    version: EQUIPMENT_STATE_VERSION,
    status: EQUIPMENT_MODULE_STATUS,
    locations: { EQUIPPED: "EQUIPPED", CONTAINER: "CONTAINER", STORED: "STORED", HOUSEHOLD: "HOUSEHOLD", ORPHAN: "ORPHAN" },
    layers: [...BODY_LAYERS],
    getCitizenEquipmentItems,
    normalizeEquipmentItem,
    normalizeEquipmentBodyRegionKey: normalizeBodyRegionKey,
    normalizeEquipmentBodyLayerKey: normalizeBodyLayerKey,
    normalizeEquipmentEquipProfile: normalizeEquipProfile,
    normalizeEquipmentMountProfile: normalizeMountProfile,
    getEquipmentBodyMountDefinitions: () => BODY_MOUNT_DEFINITIONS.map((mount) => ({ ...mount, acceptedTags: [...mount.acceptedTags] })),
    getEquipmentBodyRegionDefinitions: () => [...BODY_REGION_DEFINITIONS, ...BODY_REGION_COMPOSITES].map((region) => ({ ...region, allowedLayers: [...(region.allowedLayers || [])], childRegionKeys: [...(region.childRegionKeys || [])] })),
    getEquipmentBodyRegionState,
    getEquipmentBodyRegionGroups,
    buildEquipmentBodyOccupancy,
    buildEquipmentBodyMountOccupancy,
    buildEquipmentItemMountOccupancy,
    buildEquipmentCarryPenalty,
    getEquipmentCoverageRegions,
    isEquipmentItemCompatibleWithBodyRegion: isItemCompatibleWithBodyRegion,
    isEquipmentCapacityProvider,
    buildEquipmentItemFromCatalog,
    getEquipmentState,
    getEquipmentStateSummary,
    getEquipmentItemById,
    getEquipmentModuleMetric,
    getEquipmentSelectionState,
    setEquipmentSelectedItem,
    setEquipmentSelectedItemFromRegion,
    returnEquipmentInspectorToRegion,
    setEquipmentSelectedRegion,
    setEquipmentSelectedContainer,
    setEquipmentSelectedContainerItem,
    buildEquipmentStorageRegions,
    activateEquipmentStorageRegion,
    clearEquipmentSelectedItem,
    clearEquipmentActiveSelection,
    setEquipmentSelectedStorageUnit,
    setEquipmentBodyRegionFilter,
    setEquipmentBodymapView,
    setEquipmentItemIndexOpen,
    toggleEquipmentItemIndex,
    setEquipmentItemIndexQuery,
    setEquipmentItemIndexCategory,
    locateEquipmentItem,
    clearEquipmentSelection,
    getEquipmentTargetCitizen,
    getEquipmentCitizens
  };

  window.WS_APP.equipmentStore = equipmentStore;
  Object.assign(window.WS_APP, {
    getCitizenEquipmentItems,
    normalizeEquipmentItem,
    normalizeEquipmentBodyRegionKey: normalizeBodyRegionKey,
    normalizeEquipmentBodyLayerKey: normalizeBodyLayerKey,
    normalizeEquipmentEquipProfile: normalizeEquipProfile,
    normalizeEquipmentMountProfile: normalizeMountProfile,
    getEquipmentBodyMountDefinitions: equipmentStore.getEquipmentBodyMountDefinitions,
    getEquipmentBodyRegionDefinitions: equipmentStore.getEquipmentBodyRegionDefinitions,
    getEquipmentBodyRegionState,
    getEquipmentBodyRegionGroups,
    buildEquipmentBodyOccupancy,
    buildEquipmentBodyMountOccupancy,
    buildEquipmentItemMountOccupancy,
    buildEquipmentCarryPenalty,
    getEquipmentCoverageRegions,
    isEquipmentItemCompatibleWithBodyRegion: isItemCompatibleWithBodyRegion,
    isEquipmentCapacityProvider,
    buildEquipmentItemFromCatalog,
    getEquipmentState,
    getEquipmentStateSummary,
    getEquipmentItemById,
    getEquipmentModuleMetric,
    getEquipmentSelectionState,
    setEquipmentSelectedItem,
    setEquipmentSelectedItemFromRegion,
    returnEquipmentInspectorToRegion,
    setEquipmentSelectedRegion,
    setEquipmentSelectedContainer,
    setEquipmentSelectedContainerItem,
    buildEquipmentStorageRegions,
    activateEquipmentStorageRegion,
    clearEquipmentSelectedItem,
    clearEquipmentActiveSelection,
    setEquipmentSelectedStorageUnit,
    setEquipmentBodyRegionFilter,
    setEquipmentBodymapView,
    setEquipmentItemIndexOpen,
    toggleEquipmentItemIndex,
    setEquipmentItemIndexQuery,
    setEquipmentItemIndexCategory,
    locateEquipmentItem,
    clearEquipmentSelection,
    getEquipmentTargetCitizen
  });

})();
