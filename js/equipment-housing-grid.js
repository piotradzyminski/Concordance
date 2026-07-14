window.WS_APP = window.WS_APP || {};

(function initEquipmentHousingGrid() {
  const HOUSING_GRID_VERSION = "5.1x";
  const DEFAULT_COLUMNS = 4;
  const clone = window.WS_APP.cloneEquipmentValue || ((value) => JSON.parse(JSON.stringify(value ?? null)));

  function makeResult(ok = false, code = "UNKNOWN", message = "", details = {}) {
    return {
      ok: Boolean(ok),
      code: String(code || "UNKNOWN"),
      message: String(message || ""),
      details: details && typeof details === "object" && !Array.isArray(details) ? details : {}
    };
  }

  function clampInteger(value, min = 0, max = 999) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, number));
  }

  function normalizeRotation(value = 0) {
    const normalized = ((Math.round(Number(value) || 0) % 180) + 180) % 180;
    return normalized === 90 ? 90 : 0;
  }

  function getCitizen(citizenOrId = {}) {
    if (citizenOrId && typeof citizenOrId === "object" && !Array.isArray(citizenOrId) && citizenOrId.id) return citizenOrId;
    const citizenId = String(citizenOrId?.id || citizenOrId || "").trim();
    return citizenId && typeof window.WS_APP.getCitizenById === "function" ? window.WS_APP.getCitizenById(citizenId) : null;
  }

  function getState(citizenOrState = {}) {
    if (citizenOrState?.items && citizenOrState?.itemById) return citizenOrState;
    const citizen = getCitizen(citizenOrState);
    return citizen && typeof window.WS_APP.getEquipmentState === "function" ? window.WS_APP.getEquipmentState(citizen) : null;
  }

  function normalizeHousingStorageUnit(unit = {}, index = 0) {
    const source = unit && typeof unit === "object" && !Array.isArray(unit) ? unit : {};
    const columns = clampInteger(source.width ?? source.columns ?? source.cols ?? source.w ?? DEFAULT_COLUMNS, 1, 24);
    const requestedRows = clampInteger(source.height ?? source.rows ?? source.h ?? 0, 0, 999);
    const requestedCapacity = clampInteger(source.slotCapacity ?? source.capacitySlots ?? source.slots ?? source.capacity ?? 0, 0, 9999);
    const rows = requestedRows || Math.max(1, Math.ceil(Math.max(1, requestedCapacity) / columns));
    const slotCapacity = requestedCapacity || columns * rows;
    return {
      id: String(source.id || source.storageUnitId || source.storageId || (index === 0 ? "housing-storage-main" : `housing-storage-${index + 1}`)).trim(),
      label: String(source.label || source.name || source.title || (index === 0 ? "Unit Storage" : `Housing Storage ${index + 1}`)).trim(),
      width: columns,
      height: rows,
      slotCapacity,
      type: String(source.type || "HOUSING_STORAGE").trim().toUpperCase()
    };
  }

  function getHousingStorageUnits(citizen = {}) {
    if (typeof window.WS_APP.getCitizenHousingRecords === "function") {
      const records = window.WS_APP.getCitizenHousingRecords(citizen) || [];
      return records.flatMap((record) => (Array.isArray(record.storageUnits) ? record.storageUnits : []).map((unit, index) => ({
        ...normalizeHousingStorageUnit(unit, index),
        housingRecordId: String(record.id || "").trim(),
        housingRecordTitle: String(record.title || "").trim()
      })));
    }
    const records = Array.isArray(citizen?.housing) ? citizen.housing : [];
    const explicitUnits = records.flatMap((record) => (Array.isArray(record?.storageUnits) ? record.storageUnits : []).map((unit, index) => ({
      ...normalizeHousingStorageUnit(unit, index),
      housingRecordId: String(record?.id || "").trim(),
      housingRecordTitle: String(record?.title || record?.name || "").trim()
    })));
    if (explicitUnits.length) return explicitUnits;
    const rentSubscriptions = (Array.isArray(citizen?.subscriptions) ? citizen.subscriptions : [])
      .filter((subscription) => String(subscription?.category || "").trim().toUpperCase() === "RENT" && subscription?.archived !== true);
    return rentSubscriptions.map((subscription, index) => {
      const profile = String(subscription.tierId || subscription.tierLabel || subscription.title || "RENT_ACCESS").trim().toUpperCase();
      const rows = profile.includes("WAREHOUSE") ? 8
        : profile.includes("CORPORATE") || profile.includes("EXECUTIVE") || profile.includes("ALPHA") ? 6
          : profile.includes("TECHNICAL") || profile.includes("SECURED") || profile.includes("SAFE") ? 4
            : profile.includes("STANDARD") ? 3
              : profile.includes("MICRO") ? 2
                : 1;
      return {
        ...normalizeHousingStorageUnit({ id: index === 0 ? "housing-storage-main" : `housing-storage-${index + 1}`, label: `${subscription.title || subscription.tierLabel || "Housing"} Storage`, width: DEFAULT_COLUMNS, height: rows, slotCapacity: DEFAULT_COLUMNS * rows }, index),
        housingRecordId: String(subscription.id || `housing-rent-${index + 1}`).trim(),
        housingRecordTitle: String(subscription.title || subscription.tierLabel || "Habitat Ledger Access").trim()
      };
    });
  }

  function getHousingStorageUnit(citizen = {}, storageUnitId = "", unitOverride = null) {
    if (unitOverride && typeof unitOverride === "object" && !Array.isArray(unitOverride)) return normalizeHousingStorageUnit(unitOverride);
    const id = String(storageUnitId || "").trim();
    return getHousingStorageUnits(citizen).find((unit) => unit.id === id) || null;
  }

  function getItemFootprint(item = {}, rotation = 0) {
    if (typeof window.WS_APP.getEquipmentItemGridFootprint === "function") {
      const footprint = window.WS_APP.getEquipmentItemGridFootprint(item, rotation);
      return {
        width: clampInteger(footprint?.width, 1, 99),
        height: clampInteger(footprint?.height, 1, 99),
        slots: clampInteger(footprint?.slots ?? Number(footprint?.width || 1) * Number(footprint?.height || 1), 1, 9999),
        rotation: normalizeRotation(rotation)
      };
    }
    const width = clampInteger(item.width ?? 1, 1, 99);
    const height = clampInteger(item.height ?? 1, 1, 99);
    return normalizeRotation(rotation) === 90
      ? { width: height, height: width, slots: width * height, rotation: 90 }
      : { width, height, slots: width * height, rotation: 0 };
  }

  function normalizeHousingPlacement(source = {}, storageUnitId = "") {
    const unitId = String(storageUnitId || source.storageUnitId || "").trim();
    const raw = source?.housingPlacement && typeof source.housingPlacement === "object" && !Array.isArray(source.housingPlacement)
      ? source.housingPlacement
      : source;
    const column = clampInteger(raw?.column ?? raw?.col ?? raw?.x ?? 0, 0, 999);
    const row = clampInteger(raw?.row ?? raw?.y ?? 0, 0, 999);
    const placementUnitId = String(raw?.storageUnitId || unitId).trim();
    if (!unitId || !column || !row || placementUnitId !== unitId) return null;
    return { storageUnitId: unitId, column, row, rotation: normalizeRotation(raw?.rotation) };
  }

  function makeOccupancy(unit = {}) {
    return Array.from({ length: unit.height }, () => Array.from({ length: unit.width }, () => ""));
  }

  function getCellIndex(unit = {}, column = 1, row = 1) {
    return (row - 1) * unit.width + column;
  }

  function isPlacementInsideUnit(unit = {}, placement = {}, footprint = {}) {
    const column = clampInteger(placement.column, 0, 999);
    const row = clampInteger(placement.row, 0, 999);
    if (!column || !row) return false;
    if (column + footprint.width - 1 > unit.width || row + footprint.height - 1 > unit.height) return false;
    for (let y = row; y < row + footprint.height; y += 1) {
      for (let x = column; x < column + footprint.width; x += 1) {
        if (getCellIndex(unit, x, y) > unit.slotCapacity) return false;
      }
    }
    return true;
  }

  function getPlacementCollisions(occupancy = [], placement = {}, footprint = {}) {
    const collisions = new Set();
    for (let y = placement.row - 1; y < placement.row - 1 + footprint.height; y += 1) {
      for (let x = placement.column - 1; x < placement.column - 1 + footprint.width; x += 1) {
        const occupant = occupancy[y]?.[x];
        if (occupant) collisions.add(occupant);
      }
    }
    return [...collisions];
  }

  function occupyPlacement(occupancy = [], itemId = "", placement = {}, footprint = {}) {
    for (let y = placement.row - 1; y < placement.row - 1 + footprint.height; y += 1) {
      for (let x = placement.column - 1; x < placement.column - 1 + footprint.width; x += 1) {
        if (occupancy[y]) occupancy[y][x] = itemId;
      }
    }
  }

  function findFirstPlacement(occupancy = [], unit = {}, footprint = {}) {
    for (let row = 1; row <= unit.height - footprint.height + 1; row += 1) {
      for (let column = 1; column <= unit.width - footprint.width + 1; column += 1) {
        const placement = { column, row };
        if (!isPlacementInsideUnit(unit, placement, footprint)) continue;
        if (!getPlacementCollisions(occupancy, placement, footprint).length) return placement;
      }
    }
    return null;
  }

  function buildEquipmentHousingGridModel(citizenOrState = {}, storageUnitId = "", options = {}) {
    const citizen = options.citizen || getCitizen(citizenOrState) || {};
    const state = options.state || getState(citizenOrState);
    const unit = getHousingStorageUnit(citizen, storageUnitId, options.unit);
    if (!state || !unit) return { version: HOUSING_GRID_VERSION, unit: unit || null, occupancy: [], entries: [], usedSlots: 0, freeSlots: 0, hasUnplacedItems: false };
    const excludedItemId = String(options.excludeItemId || "").trim();
    const items = state.items.filter((item) => item.isStored && item.storageUnitId === unit.id && (!excludedItemId || item.id !== excludedItemId));
    const occupancy = makeOccupancy(unit);
    const entries = [];

    items.forEach((item) => {
      const storedPlacement = normalizeHousingPlacement(item, unit.id);
      const storedFootprint = getItemFootprint(item, storedPlacement?.rotation || 0);
      let placement = null;
      let footprint = storedFootprint;
      let source = "unplaced";
      if (storedPlacement && isPlacementInsideUnit(unit, storedPlacement, storedFootprint) && !getPlacementCollisions(occupancy, storedPlacement, storedFootprint).length) {
        placement = storedPlacement;
        source = "persistent";
      } else if (options.derivePlacements !== false) {
        const fallbackFootprint = getItemFootprint(item, 0);
        const fallback = findFirstPlacement(occupancy, unit, fallbackFootprint);
        if (fallback) {
          placement = { storageUnitId: unit.id, ...fallback, rotation: 0 };
          footprint = fallbackFootprint;
          source = "derived";
        }
      }
      if (placement) occupyPlacement(occupancy, item.id, placement, footprint);
      entries.push({ item, placement, footprint, source, persistent: source === "persistent" });
    });

    const usedSlots = entries.filter((entry) => entry.placement).reduce((sum, entry) => sum + entry.footprint.slots, 0);
    return {
      version: HOUSING_GRID_VERSION,
      unit,
      occupancy,
      entries,
      usedSlots,
      freeSlots: Math.max(0, unit.slotCapacity - usedSlots),
      hasUnplacedItems: entries.some((entry) => !entry.placement)
    };
  }

  function evaluateEquipmentHousingPlacement(citizenOrState = {}, itemId = "", storageUnitId = "", placement = {}, options = {}) {
    const citizen = options.citizen || getCitizen(citizenOrState) || {};
    const state = options.state || getState(citizenOrState);
    if (!state) return makeResult(false, "STATE_UNAVAILABLE", "Equipment state is unavailable.");
    const item = options.item || state.itemById?.[String(itemId || "").trim()] || null;
    if (!item) return makeResult(false, "ITEM_NOT_FOUND", "Item is not present in Equipment state.", { itemId });
    const unit = getHousingStorageUnit(citizen, storageUnitId, options.unit);
    if (!unit) return makeResult(false, "HOUSING_UNIT_NOT_FOUND", "Housing storage unit is unavailable.", { storageUnitId });
    if (item.isOrphan && options.allowOrphanSource !== true) return makeResult(false, "ITEM_ORPHAN", "Item has no valid physical location.", { itemId: item.id });
    if (item.isEquipped && item.equippedLocation?.kind === "ITEM_MOUNT" && options.allowMountedSource !== true) {
      return makeResult(false, "ITEM_MOUNTED", "Mounted child items must be detached before housing transfer.", { itemId: item.id });
    }
    if (item.isEquipped && options.allowEquippedSource !== true) return makeResult(false, "ITEM_EQUIPPED", "Equipped items must be unequipped before housing transfer.", { itemId: item.id });
    const targetPlacement = normalizeHousingPlacement({ housingPlacement: { ...placement, storageUnitId: unit.id } }, unit.id);
    if (!targetPlacement) return makeResult(false, "PLACEMENT_REQUIRED", "Housing placement is required.", { itemId: item.id, storageUnitId: unit.id });
    const footprint = getItemFootprint(item, targetPlacement.rotation);
    const model = buildEquipmentHousingGridModel(state, unit.id, { citizen, state, unit, excludeItemId: item.id, derivePlacements: true });
    if (!isPlacementInsideUnit(unit, targetPlacement, footprint)) {
      return makeResult(false, "OUT_OF_BOUNDS", "Item footprint exceeds the housing storage grid.", { placement: targetPlacement, footprint, unit });
    }
    const collisions = getPlacementCollisions(model.occupancy, targetPlacement, footprint);
    if (collisions.length) return makeResult(false, "COLLISION", "Housing target cells are occupied.", { placement: targetPlacement, footprint, unit, collisions });
    return makeResult(true, "HOUSING_PLACEABLE", "Item can be placed in housing storage.", { itemId: item.id, storageUnitId: unit.id, placement: targetPlacement, footprint, unit });
  }

  function findFirstEquipmentHousingPlacementForItem(citizenOrState = {}, item = {}, storageUnitId = "", options = {}) {
    const citizen = options.citizen || getCitizen(citizenOrState) || {};
    const state = options.state || getState(citizenOrState);
    const unit = getHousingStorageUnit(citizen, storageUnitId, options.unit);
    if (!state || !item || !unit) return null;
    const itemId = String(item.id || item.instanceId || item.itemId || "").trim();
    const excludedItemId = String(options.excludeItemId || itemId).trim();
    const model = buildEquipmentHousingGridModel(state, unit.id, { citizen, state, unit, excludeItemId: excludedItemId, derivePlacements: true });
    const rotations = options.rotation === undefined ? [normalizeRotation(item.housingPlacement?.rotation || 0), 0, 90] : [normalizeRotation(options.rotation)];
    for (const rotation of [...new Set(rotations)]) {
      const footprint = getItemFootprint(item, rotation);
      const placement = findFirstPlacement(model.occupancy, unit, footprint);
      if (placement) return { storageUnitId: unit.id, ...placement, rotation, footprint, unit };
    }
    return null;
  }

  function findFirstEquipmentHousingPlacement(citizenOrState = {}, itemId = "", storageUnitId = "", options = {}) {
    const state = options.state || getState(citizenOrState);
    const item = state?.itemById?.[String(itemId || "").trim()] || null;
    return item ? findFirstEquipmentHousingPlacementForItem(citizenOrState, item, storageUnitId, { ...options, state }) : null;
  }

  function sanitizePhysicalLocation(next = {}) {
    [
      "equippedSlot", "equippedLayer", "bodySlot", "bodyLayer", "equippedAnchor",
      "containerItemId", "unitId", "parentItemId", "hostItemId",
      "gridPlacement", "gridColumn", "gridRow", "gridRotation", "storagePlacement"
    ].forEach((key) => delete next[key]);
    return next;
  }

  function updateEquipmentItems(citizen = {}, transform, options = {}) {
    if (!citizen?.id || typeof window.WS_APP.replaceCitizenItemInstances !== "function" || typeof transform !== "function") return null;
    const rawItems = typeof window.WS_APP.getCitizenEquipmentItemInstanceViews === "function"
      ? window.WS_APP.getCitizenEquipmentItemInstanceViews(citizen.id)
      : [];
    const nextItems = transform(clone(rawItems));
    if (!Array.isArray(nextItems)) return null;
    const result = window.WS_APP.replaceCitizenItemInstances(citizen.id, nextItems, {
      scope: "EQUIPMENT",
      source: String(options.source || "EQUIPMENT_HOUSING").trim().toUpperCase(),
      skipCitizenEvent: options.skipCitizenEvent === true,
      skipItemEvent: options.skipItemEvent === true,
      skipModuleRefresh: options.skipModuleRefresh === true,
      skipProfileRefresh: options.skipProfileRefresh === true,
      deferPersistence: options.deferPersistence === true
    });
    return result?.ok ? window.WS_APP.getCitizenById?.(citizen.id) || citizen : null;
  }

  function moveEquipmentItemToHousing(citizenOrId = {}, itemId = "", storageUnitId = "", options = {}) {
    const citizen = getCitizen(citizenOrId);
    if (!citizen) return makeResult(false, "CITIZEN_NOT_FOUND", "Citizen was not found.");
    const state = getState(citizen);
    const item = state?.itemById?.[String(itemId || "").trim()] || null;
    if (!item) return makeResult(false, "ITEM_NOT_FOUND", "Item is not present in Equipment state.", { itemId });
    const placement = options.placement || findFirstEquipmentHousingPlacement(state, item.id, storageUnitId, { ...options, citizen, state });
    if (!placement) return makeResult(false, "HOUSING_GRID_NO_SPACE", "No contiguous housing-grid placement is available.", { itemId: item.id, storageUnitId });
    const validation = evaluateEquipmentHousingPlacement(state, item.id, storageUnitId, placement, { ...options, citizen, state });
    if (!validation.ok) return validation;
    const resolved = validation.details.placement;
    const sameHousingStorage = item.isStored === true
      && String(item.storageUnitId || "").trim() === String(resolved.storageUnitId || "").trim();
    if (sameHousingStorage && typeof window.WS_APP.commitCitizenHousingGridPlacement === "function") {
      const directCommit = window.WS_APP.commitCitizenHousingGridPlacement(citizen.id, item.id, resolved, {
        deferPersistence: options.deferPersistence !== false
      });
      if (!directCommit?.ok) {
        return makeResult(false, String(directCommit?.code || directCommit?.reason || "HOUSING_GRID_FAST_COMMIT_FAILED"), String(directCommit?.message || "Housing fast-path placement commit failed."), { itemId: item.id, storageUnitId: resolved.storageUnitId, placement: resolved, canonicalCommit: directCommit || null });
      }
      return makeResult(true, directCommit.noChange ? "HOUSING_PLACEMENT_UNCHANGED" : "MOVED_TO_HOUSING", directCommit.noChange ? "Housing placement unchanged." : "Item moved to housing storage.", {
        itemId: item.id,
        storageUnitId: resolved.storageUnitId,
        placement: directCommit.placement || resolved,
        noChange: directCommit.noChange === true,
        deferredPersistence: directCommit.deferredPersistence !== false,
        citizen: null
      });
    }
    const updated = updateEquipmentItems(citizen, (items) => items.map((raw) => {
      const rawId = String(raw?.id || raw?.itemId || "").trim();
      if (rawId !== item.id) return raw;
      const next = sanitizePhysicalLocation({
        ...raw,
        location: "STORED",
        equippedLocation: null,
        containerHostId: "",
        containerPlacement: null,
        storageUnitId: resolved.storageUnitId,
        housingPlacement: {
          storageUnitId: resolved.storageUnitId,
          column: resolved.column,
          row: resolved.row,
          rotation: resolved.rotation
        }
      });
      return next;
    }), {
      source: options.source || "EQUIPMENT_HOUSING",
      skipCitizenEvent: options.skipCitizenEvent === true,
      skipItemEvent: options.skipItemEvent === true,
      skipModuleRefresh: options.skipModuleRefresh === true,
      skipProfileRefresh: options.skipProfileRefresh === true,
      deferPersistence: options.deferPersistence === true
    });
    return makeResult(Boolean(updated), updated ? "MOVED_TO_HOUSING" : "UPDATE_FAILED", updated ? "Item moved to housing storage." : "Housing transfer update failed.", { itemId: item.id, storageUnitId: resolved.storageUnitId, placement: resolved, citizen: updated });
  }

  function moveEquipmentItemFromHousingToContainer(citizenOrId = {}, itemId = "", containerId = "", options = {}) {
    const citizen = getCitizen(citizenOrId);
    if (!citizen) return makeResult(false, "CITIZEN_NOT_FOUND", "Citizen was not found.");
    const state = getState(citizen);
    const item = state?.itemById?.[String(itemId || "").trim()] || null;
    if (!item?.isStored) return makeResult(false, "ITEM_NOT_STORED", "Item is not located in housing storage.", { itemId });
    if (typeof window.WS_APP.moveEquipmentItemToContainer !== "function") return makeResult(false, "CONTAINER_MOVE_API_UNAVAILABLE", "Container-grid transfer API is unavailable.");
    return window.WS_APP.moveEquipmentItemToContainer(citizen, item.id, containerId, { ...options, allowStoredSource: true });
  }

  function sortEquipmentHousingStorage(citizenOrId = {}, storageUnitId = "", options = {}) {
    const citizen = getCitizen(citizenOrId);
    if (!citizen) return makeResult(false, "CITIZEN_NOT_FOUND", "Citizen was not found.");
    const state = getState(citizen);
    const unit = getHousingStorageUnit(citizen, storageUnitId, options.unit);
    if (!state || !unit) return makeResult(false, "HOUSING_UNIT_NOT_FOUND", "Housing storage unit is unavailable.", { storageUnitId });
    const items = state.items.filter((item) => item.isStored && item.storageUnitId === unit.id);
    if (!items.length) return makeResult(false, "HOUSING_UNIT_EMPTY", "Housing storage unit has no items.", { storageUnitId: unit.id });
    const ordered = [...items].sort((a, b) => {
      const af = getItemFootprint(a, 0);
      const bf = getItemFootprint(b, 0);
      return (bf.slots - af.slots) || (Math.max(bf.width, bf.height) - Math.max(af.width, af.height)) || String(a.name || a.id).localeCompare(String(b.name || b.id));
    });
    const occupancy = makeOccupancy(unit);
    const placements = new Map();
    for (const item of ordered) {
      let placed = null;
      for (const rotation of [0, 90]) {
        const footprint = getItemFootprint(item, rotation);
        const target = findFirstPlacement(occupancy, unit, footprint);
        if (!target) continue;
        placed = { storageUnitId: unit.id, ...target, rotation, footprint };
        occupyPlacement(occupancy, item.id, placed, footprint);
        break;
      }
      if (!placed) return makeResult(false, "HOUSING_GRID_NO_SPACE", "Housing storage cannot be normalized without overflow.", { storageUnitId: unit.id, itemId: item.id });
      placements.set(item.id, placed);
    }
    const updated = updateEquipmentItems(citizen, (rawItems) => rawItems.map((raw) => {
      const id = String(raw?.id || raw?.itemId || "").trim();
      const placement = placements.get(id);
      if (!placement) return raw;
      const next = sanitizePhysicalLocation({
        ...raw,
        location: "STORED",
        equippedLocation: null,
        containerHostId: "",
        containerPlacement: null,
        storageUnitId: unit.id,
        housingPlacement: {
          storageUnitId: unit.id,
          column: placement.column,
          row: placement.row,
          rotation: placement.rotation
        }
      });
      return next;
    }));
    return makeResult(Boolean(updated), updated ? "HOUSING_STORAGE_SORTED" : "UPDATE_FAILED", updated ? "Housing storage placements normalized." : "Housing storage normalization failed.", { storageUnitId: unit.id, itemCount: placements.size, citizen: updated });
  }

  window.WS_APP.equipmentHousingGrid = {
    version: HOUSING_GRID_VERSION,
    normalizeHousingStorageUnit,
    getHousingStorageUnits,
    getHousingStorageUnit,
    buildEquipmentHousingGridModel,
    evaluateEquipmentHousingPlacement,
    findFirstEquipmentHousingPlacement,
    findFirstEquipmentHousingPlacementForItem,
    moveEquipmentItemToHousing,
    moveEquipmentItemFromHousingToContainer,
    sortEquipmentHousingStorage
  };

  Object.assign(window.WS_APP, {
    normalizeEquipmentHousingStorageUnit: normalizeHousingStorageUnit,
    getEquipmentHousingStorageUnits: getHousingStorageUnits,
    getEquipmentHousingStorageUnit: getHousingStorageUnit,
    buildEquipmentHousingGridModel,
    evaluateEquipmentHousingPlacement,
    findFirstEquipmentHousingPlacement,
    findFirstEquipmentHousingPlacementForItem,
    moveEquipmentItemToHousing,
    moveEquipmentItemFromHousingToContainer,
    sortEquipmentHousingStorage
  });
})();
