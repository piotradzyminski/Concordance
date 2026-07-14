window.WS_APP = window.WS_APP || {};

(function initEquipmentInventoryCore() {
  const INVENTORY_CORE_VERSION = "5.1.8x";

  function getState(citizen = {}) {
    return typeof window.WS_APP.getEquipmentState === "function"
      ? window.WS_APP.getEquipmentState(citizen)
      : null;
  }

  function getCitizen(citizenOrId = {}) {
    if (citizenOrId && typeof citizenOrId === "object") return citizenOrId;
    const id = String(citizenOrId || "").trim();
    return id && typeof window.WS_APP.getCitizenById === "function" ? window.WS_APP.getCitizenById(id) : null;
  }

  function clone(value) {
    const cloner = window.WS_APP.cloneEquipmentValue;
    if (typeof cloner === "function") return cloner(value);
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function makeResult(ok = false, code = "UNKNOWN", message = "", details = {}) {
    return {
      ok: Boolean(ok),
      code: String(code || "UNKNOWN"),
      message: String(message || ""),
      details: details && typeof details === "object" && !Array.isArray(details) ? details : {}
    };
  }

  function clampInteger(value, min = 0, max = 9999) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function normalizeRotation(value = 0) {
    const normalized = ((Math.round(Number(value) || 0) % 180) + 180) % 180;
    return normalized === 90 ? 90 : 0;
  }

  function getItemFromState(state = {}, itemId = "") {
    const id = String(itemId || "").trim();
    if (!id) return null;
    if (state?.itemById && state.itemById[id]) return state.itemById[id];
    const items = Array.isArray(state?.items) ? state.items : [];
    return items.find((item) => String(item.id || "") === id || String(item.itemId || "") === id) || null;
  }

  function isCapacityProvider(item = {}) {
    if (typeof window.WS_APP.isEquipmentCapacityProvider === "function") {
      return window.WS_APP.isEquipmentCapacityProvider(item);
    }
    const subtype = String(item?.subtype || "").trim().toUpperCase();
    const tags = Array.isArray(item?.tags) ? item.tags.map((tag) => String(tag || "").trim().toUpperCase()) : [];
    return subtype === "MASS_COMPRESSION_CUBE"
      || subtype === "CAPACITY_MODULE"
      || tags.includes("MASS_COMPRESSION_CUBE")
      || tags.includes("MCC")
      || tags.includes("CAPACITY_MODULE");
  }

  function getDirectGridItems(state = {}, containerId = "") {
    const id = String(containerId || "").trim();
    if (!id) return [];
    const items = Array.isArray(state?.items) ? state.items : [];
    return items.filter((item) => item.isInGrid && String(item.containerHostId || "") === id);
  }

  function resolveEffectiveContainerContext(state = {}, containerId = "", options = {}) {
    if (options.context?.container) return options.context;
    const requestedId = String(containerId || options.container?.id || "").trim();
    const requestedContainer = options.container || getItemFromState(state, requestedId);
    if (!requestedContainer?.isContainer) {
      return {
        requestedContainer: requestedContainer || null,
        container: null,
        capacityProvider: null,
        baseProfile: null,
        effectiveProfile: null,
        effectiveContainerId: ""
      };
    }

    const container = requestedContainer;
    const baseProfile = container.containerProfile || null;

    return {
      requestedContainer,
      container,
      capacityProvider: null,
      baseProfile,
      effectiveProfile: baseProfile,
      effectiveContainerId: String(container.id || "")
    };
  }

  function getGridItemsForContainer(state = {}, containerId = "", options = {}) {
    const context = options.context || resolveEffectiveContainerContext(state, containerId, options);
    if (!context.container) return [];
    return getDirectGridItems(state, context.container.id);
  }

  function getItemSlotCost(item = {}) {
    const explicit = Number(item.slotCost ?? item.slotsUsed ?? 0);
    if (Number.isFinite(explicit) && explicit > 0) return Math.max(1, Math.round(explicit));
    const slots = Number(item.slots ?? 0);
    if (Number.isFinite(slots) && slots > 0) return Math.max(1, Math.round(slots));
    const width = Number(item.width || 1);
    const height = Number(item.height || 1);
    const footprintSlots = (Number.isFinite(width) && width > 0 ? Math.round(width) : 1) * (Number.isFinite(height) && height > 0 ? Math.round(height) : 1);
    if (footprintSlots > 0) return Math.max(1, footprintSlots);
    const legacyCapacityCost = Number(item.capacitySlots || 0);
    return Number.isFinite(legacyCapacityCost) && legacyCapacityCost > 0 ? Math.max(1, Math.round(legacyCapacityCost)) : 1;
  }

  function getContainerUsedSlots(state = {}, containerId = "", excludeItemId = "") {
    const excludeId = String(excludeItemId || "").trim();
    const context = resolveEffectiveContainerContext(state, containerId);
    const container = context.container;
    const capacity = { containerProfile: context.effectiveProfile || container?.containerProfile || {} };
    return getGridItemsForContainer(state, containerId)
      .filter((item) => !excludeId || String(item.id || "") !== excludeId)
      .reduce((total, item) => {
        const placement = normalizeStoredPlacement(item, container?.id || containerId);
        const footprint = getContainerPlacementFootprint(item, container || {}, capacity, placement || {}, placement?.rotation || 0);
        return total + Number(footprint.slots || getItemSlotCost(item));
      }, 0);
  }

  function itemTokens(item = {}) {
    const tokens = new Set([
      item.category,
      item.subtype,
      ...(Array.isArray(item.tags) ? item.tags : []),
      ...(Array.isArray(item.equipProfile?.allowedAnchors) ? item.equipProfile.allowedAnchors : [])
    ].map((entry) => String(entry || "").trim().toUpperCase()).filter(Boolean));
    const aliases = {
      CLOTHING: ["PERSONAL", "MISC"],
      FOOTWEAR: ["PERSONAL", "MISC"],
      HEADGEAR: ["PERSONAL", "MISC"],
      GLOVES: ["PERSONAL", "MISC"],
      ACCESSORY: ["PERSONAL", "UTILITY"],
      ARMOR: ["UTILITY"],
      CONTAINER: ["UTILITY"]
    };
    [...tokens].forEach((token) => (aliases[token] || []).forEach((alias) => tokens.add(alias)));
    return tokens;
  }

  function hasTokenOverlap(tokens = new Set(), values = []) {
    return (Array.isArray(values) ? values : [])
      .map((entry) => String(entry || "").trim().toUpperCase())
      .filter(Boolean)
      .some((entry) => tokens.has(entry));
  }

  function getContainerCellRules(profile = {}) {
    return Array.isArray(profile?.cellRules) ? profile.cellRules : [];
  }

  function getContainerCellRule(profile = {}, column = 0, row = 0) {
    const targetColumn = Number(column || 0);
    const targetRow = Number(row || 0);
    return getContainerCellRules(profile).find((rule) => Number(rule?.column || 0) === targetColumn && Number(rule?.row || 0) === targetRow) || null;
  }

  function cellRuleAcceptsItem(rule = {}, item = {}) {
    const tokens = itemTokens(item);
    if (hasTokenOverlap(tokens, rule.blockedTags || [])) return false;
    return !Array.isArray(rule.acceptedTags) || !rule.acceptedTags.length || hasTokenOverlap(tokens, rule.acceptedTags);
  }

  function getContainerPlacementFootprint(item = {}, container = {}, capacity = {}, placement = {}, rotation = 0) {
    const natural = getItemGridFootprint(item, rotation);
    const profile = capacity.containerProfile || container.containerProfile || {};
    const rule = getContainerCellRule(profile, placement?.column, placement?.row);
    const mounted = Boolean(rule && String(rule.footprintMode || "").toUpperCase() === "SLOT" && cellRuleAcceptsItem(rule, item));
    return mounted
      ? { ...natural, width: 1, height: 1, slots: 1, mounted: true, cellRule: rule }
      : { ...natural, mounted: false, cellRule: rule || null };
  }

  function validateContainerCellPlacement(item = {}, container = {}, capacity = {}, placement = {}, footprint = {}) {
    const profile = capacity.containerProfile || container.containerProfile || {};
    if (profile.isolatedCells === true && !footprint.mounted && Number(footprint.width || 1) * Number(footprint.height || 1) > 1) {
      return makeResult(false, "ISOLATED_CELL_FOOTPRINT", "This container exposes isolated 1x1 utility cells.", { placement, footprint });
    }
    for (let row = Number(placement.row || 0); row < Number(placement.row || 0) + Number(footprint.height || 0); row += 1) {
      for (let column = Number(placement.column || 0); column < Number(placement.column || 0) + Number(footprint.width || 0); column += 1) {
        const rule = getContainerCellRule(profile, column, row);
        if (!rule) continue;
        if (!footprint.mounted || column !== Number(placement.column || 0) || row !== Number(placement.row || 0)) {
          return makeResult(false, "DEDICATED_CELL_RESERVED", "A dedicated container slot cannot be occupied by a standard grid footprint.", { placement, footprint, rule });
        }
        if (!cellRuleAcceptsItem(rule, item)) {
          return makeResult(false, "DEDICATED_CELL_MISMATCH", "Item is incompatible with the dedicated container slot.", { placement, footprint, rule });
        }
      }
    }
    return makeResult(true, "CELL_RULES_OK", "Container cell rules accept this placement.", { placement, footprint });
  }

  function isDescendantContainer(state = {}, possibleAncestorId = "", possibleChildId = "") {
    const ancestor = String(possibleAncestorId || "").trim();
    let current = String(possibleChildId || "").trim();
    if (!ancestor || !current) return false;
    const visited = new Set();
    while (current && !visited.has(current)) {
      if (current === ancestor) return true;
      visited.add(current);
      const currentItem = getItemFromState(state, current);
      current = String(currentItem?.containerHostId || "").trim();
    }
    return false;
  }

  function getContainerCapacityStatus(state = {}, containerId = "", options = {}) {
    const context = options.context || resolveEffectiveContainerContext(state, containerId, options);
    const container = context.container;
    if (!container?.isContainer) {
      return { slotCapacity: 0, usedSlots: 0, freeSlots: 0, gridItemCount: 0, overCapacity: false, containerProfile: null, capacityProvider: null };
    }
    const profile = context.effectiveProfile || {};
    const slotCapacity = Math.max(0, Math.round(Number(profile.slotCapacity || 0)) || 0);
    const usedSlots = getContainerUsedSlots(state, container.id, options.excludeItemId || "");
    return {
      slotCapacity,
      usedSlots,
      freeSlots: Math.max(0, slotCapacity - usedSlots),
      gridItemCount: getGridItemsForContainer(state, container.id, { context }).length,
      overCapacity: usedSlots > slotCapacity,
      containerProfile: profile,
      capacityProvider: context.capacityProvider,
      effectiveContainerId: container.id
    };
  }

  function parseGridDimensionsFromText(value = "") {
    const match = String(value || "").match(/(?:^|[^0-9])(\d{1,2})\s*x\s*(\d{1,2})(?:[^0-9]|$)/i);
    if (!match) return null;
    return {
      columns: clampInteger(match[1], 1, 12),
      rows: clampInteger(match[2], 1, 24),
      source: "label"
    };
  }

  function getContainerGridDimensions(container = {}, capacity = {}) {
    const profile = capacity.containerProfile || container.containerProfile || {};
    const slotCapacity = Math.max(0, Math.round(Number(capacity.slotCapacity ?? profile.slotCapacity ?? container.capacitySlots ?? 0)) || 0);
    if (slotCapacity <= 0) {
      return { columns: 0, rows: 0, slotCapacity: 0, visualCells: 0, source: "none", hasGrid: false };
    }

    const explicitColumns = Number(profile.gridColumns || profile.columns || container.gridColumns || container.containerGridColumns);
    const explicitRows = Number(profile.gridRows || profile.rows || container.gridRows || container.containerGridRows);
    if (Number.isFinite(explicitColumns) && explicitColumns > 0 && Number.isFinite(explicitRows) && explicitRows > 0) {
      const columns = clampInteger(explicitColumns, 1, 12);
      const rows = Math.max(clampInteger(explicitRows, 1, 24), Math.ceil(slotCapacity / columns));
      return { columns, rows, slotCapacity, visualCells: columns * rows, source: "profile", hasGrid: true };
    }

    const parsed = parseGridDimensionsFromText(profile.label || container.containerLabel || "");
    if (parsed) {
      const rows = Math.max(parsed.rows, Math.ceil(slotCapacity / parsed.columns));
      return { ...parsed, rows, slotCapacity, visualCells: parsed.columns * rows, hasGrid: true };
    }

    const columns = slotCapacity <= 6 ? slotCapacity : Math.min(6, Math.ceil(Math.sqrt(slotCapacity)));
    const rows = Math.max(1, Math.ceil(slotCapacity / columns));
    return { columns, rows, slotCapacity, visualCells: columns * rows, source: "capacity", hasGrid: true };
  }

  function getItemGridFootprint(item = {}, rotation = 0) {
    const baseWidth = clampInteger(item.gridWidth || item.width || 1, 1, 24);
    const baseHeight = clampInteger(item.gridHeight || item.height || Math.ceil(Number(item.slots || 1) / baseWidth) || 1, 1, 24);
    const normalizedRotation = normalizeRotation(rotation);
    const width = normalizedRotation === 90 ? baseHeight : baseWidth;
    const height = normalizedRotation === 90 ? baseWidth : baseHeight;
    return {
      baseWidth,
      baseHeight,
      width,
      height,
      rotation: normalizedRotation,
      slots: Math.max(1, width * height)
    };
  }

  function normalizeStoredPlacement(item = {}, containerId = "") {
    const hostId = String(containerId || item.containerHostId || "").trim();
    const source = item.containerPlacement && typeof item.containerPlacement === "object" && !Array.isArray(item.containerPlacement)
      ? item.containerPlacement
      : null;
    if (!source || !hostId) return null;
    const placementContainerId = String(source.containerId || source.containerHostId || hostId).trim();
    const column = clampInteger(source.column ?? source.col ?? source.x ?? 0, 0, 99);
    const row = clampInteger(source.row ?? source.y ?? 0, 0, 99);
    if (!column || !row || placementContainerId !== hostId) return null;
    return {
      containerId: hostId,
      column,
      row,
      rotation: normalizeRotation(source.rotation)
    };
  }

  function makeOccupancy(grid = {}) {
    return Array.from({ length: grid.rows || 0 }, () => Array(grid.columns || 0).fill(""));
  }

  function getGridCellIndex(grid = {}, column = 1, row = 1) {
    return ((row - 1) * Number(grid.columns || 0)) + (column - 1);
  }

  function isPlacementInsideGrid(grid = {}, placement = {}, footprint = {}) {
    if (!grid.hasGrid) return false;
    const column = Number(placement.column || 0);
    const row = Number(placement.row || 0);
    const width = Number(footprint.width || 0);
    const height = Number(footprint.height || 0);
    if (column < 1 || row < 1 || width < 1 || height < 1) return false;
    if (column + width - 1 > grid.columns || row + height - 1 > grid.rows) return false;
    for (let y = row; y < row + height; y += 1) {
      for (let x = column; x < column + width; x += 1) {
        if (getGridCellIndex(grid, x, y) >= grid.slotCapacity) return false;
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

  function findFirstGridPlacement(occupancy = [], grid = {}, footprint = {}) {
    for (let row = 1; row <= grid.rows - footprint.height + 1; row += 1) {
      for (let column = 1; column <= grid.columns - footprint.width + 1; column += 1) {
        const placement = { column, row };
        if (!isPlacementInsideGrid(grid, placement, footprint)) continue;
        if (!getPlacementCollisions(occupancy, placement, footprint).length) return placement;
      }
    }
    return null;
  }

  function findFirstContainerGridPlacement(item = {}, container = {}, capacity = {}, occupancy = [], grid = {}, rotation = 0) {
    for (let row = 1; row <= Number(grid.rows || 0); row += 1) {
      for (let column = 1; column <= Number(grid.columns || 0); column += 1) {
        const placement = { column, row };
        const footprint = getContainerPlacementFootprint(item, container, capacity, placement, rotation);
        if (!isPlacementInsideGrid(grid, placement, footprint)) continue;
        if (!validateContainerCellPlacement(item, container, capacity, placement, footprint).ok) continue;
        if (!getPlacementCollisions(occupancy, placement, footprint).length) return { ...placement, footprint };
      }
    }
    return null;
  }

  function buildContainerGridModel(state = {}, containerId = "", options = {}) {
    const context = options.context || resolveEffectiveContainerContext(state, containerId, options);
    const container = context.container;
    const capacity = options.capacity || getContainerCapacityStatus(state, containerId, { ...options, context });
    const grid = getContainerGridDimensions(container || {}, capacity);
    const excludedItemId = String(options.excludeItemId || "").trim();
    const items = (Array.isArray(options.items) ? options.items : getGridItemsForContainer(state, containerId, { context }))
      .filter((item) => !excludedItemId || String(item.id || "") !== excludedItemId);
    const occupancy = makeOccupancy(grid);
    const entries = [];

    items.forEach((item) => {
      const storedPlacement = normalizeStoredPlacement(item, container?.id || containerId);
      const storedFootprint = getContainerPlacementFootprint(item, container || {}, capacity, storedPlacement || {}, storedPlacement?.rotation || 0);
      let placement = null;
      let footprint = storedFootprint;
      let source = "unplaced";

      if (storedPlacement
        && isPlacementInsideGrid(grid, storedPlacement, storedFootprint)
        && validateContainerCellPlacement(item, container || {}, capacity, storedPlacement, storedFootprint).ok
        && !getPlacementCollisions(occupancy, storedPlacement, storedFootprint).length) {
        placement = { column: storedPlacement.column, row: storedPlacement.row };
        source = "persistent";
      } else if (grid.hasGrid) {
        const fallback = findFirstContainerGridPlacement(item, container || {}, capacity, occupancy, grid, 0);
        if (fallback) {
          placement = { column: fallback.column, row: fallback.row };
          footprint = fallback.footprint;
          source = "derived";
        }
      }

      if (placement) occupyPlacement(occupancy, String(item.id || ""), placement, footprint);
      entries.push({
        item,
        placement,
        footprint,
        source,
        persistent: source === "persistent"
      });
    });

    return {
      version: INVENTORY_CORE_VERSION,
      container,
      capacityProvider: context.capacityProvider,
      capacity,
      grid,
      occupancy,
      entries,
      hasUnplacedItems: entries.some((entry) => !entry.placement)
    };
  }

  function createContainerPlacementContext(state = {}, itemId = "", containerId = "", rotation = 0) {
    const item = getItemFromState(state, itemId);
    const context = resolveEffectiveContainerContext(state, containerId);
    const container = context.container;
    if (!item || !container?.isContainer) return { item: item || null, container: container || null, context, model: null, footprint: null };
    const model = buildContainerGridModel(state, container.id, { context, excludeItemId: item.id });
    return { item, container, context, model, footprint: getItemGridFootprint(item, rotation), rotation: normalizeRotation(rotation) };
  }

  function evaluateContainerPlacementTarget(placementContext = {}, column = 1, row = 1) {
    const { item, container, model } = placementContext || {};
    if (!item) return makeResult(false, "ITEM_NOT_FOUND", "Item is not present in Equipment state.");
    if (!container?.isContainer || !model) return makeResult(false, "CONTAINER_NOT_FOUND", "Container is not present in Equipment state.");
    if (!item.isInGrid || String(item.containerHostId || "") !== String(container.id || "")) {
      return makeResult(false, "ITEM_NOT_IN_CONTAINER", "Item must be located in the selected container grid before placement.", { itemId: item.id, containerId: container.id });
    }
    const placement = {
      containerId: container.id,
      column: clampInteger(column, 1, 99),
      row: clampInteger(row, 1, 99),
      rotation: normalizeRotation(placementContext?.rotation || placementContext?.footprint?.rotation || 0)
    };
    const footprint = getContainerPlacementFootprint(item, container, model.capacity || {}, placement, placement.rotation);
    if (!model.grid.hasGrid) return makeResult(false, "GRID_UNAVAILABLE", "Selected container has no active grid.", { placement, footprint, grid: model.grid });
    if (!isPlacementInsideGrid(model.grid, placement, footprint)) {
      return makeResult(false, "OUT_OF_BOUNDS", "Item footprint exceeds the active container grid.", { placement, footprint, grid: model.grid });
    }
    const cellValidation = validateContainerCellPlacement(item, container, model.capacity || {}, placement, footprint);
    if (!cellValidation.ok) return { ...cellValidation, details: { ...(cellValidation.details || {}), placement, footprint, grid: model.grid } };
    const collisions = getPlacementCollisions(model.occupancy, placement, footprint);
    if (collisions.length) {
      return makeResult(false, "COLLISION", "Target cells are occupied by another item.", { placement, footprint, collisions, grid: model.grid });
    }
    return makeResult(true, "PLACEABLE", "Item can be placed at the selected grid cell.", { placement, footprint, grid: model.grid });
  }

  function evaluateContainerItemPlacement(state = {}, itemId = "", containerId = "", column = 1, row = 1, rotation = 0) {
    const placementContext = createContainerPlacementContext(state, itemId, containerId, rotation);
    return evaluateContainerPlacementTarget(placementContext, column, row);
  }

  function findFirstAvailableContainerPlacement(state = {}, itemId = "", containerId = "", rotation = 0) {
    const item = getItemFromState(state, itemId);
    const context = resolveEffectiveContainerContext(state, containerId);
    const container = context.container;
    if (!item || !container?.isContainer) return null;
    const model = buildContainerGridModel(state, container.id, { context, excludeItemId: item.id });
    const placement = findFirstContainerGridPlacement(item, container, model.capacity || {}, model.occupancy, model.grid, rotation);
    return placement ? { containerId: container.id, column: placement.column, row: placement.row, rotation: normalizeRotation(rotation), footprint: placement.footprint, grid: model.grid } : null;
  }

  function getContainerAutoPlacementRotations(item = {}, preferredRotation = 0) {
    const preferred = normalizeRotation(preferredRotation);
    const footprint = getItemGridFootprint(item, 0);
    if (Number(footprint.baseWidth || 1) === Number(footprint.baseHeight || 1)) return [preferred];
    return [...new Set([preferred, preferred === 90 ? 0 : 90])];
  }

  function findFirstAvailableContainerPlacementAnyRotation(state = {}, itemId = "", containerId = "", preferredRotation = 0) {
    const item = getItemFromState(state, itemId);
    if (!item) return null;
    for (const rotation of getContainerAutoPlacementRotations(item, preferredRotation)) {
      const placement = findFirstAvailableContainerPlacement(state, item.id, containerId, rotation);
      if (placement) return placement;
    }
    return null;
  }


  function evaluateCrossContainerItemPlacement(state = {}, itemId = "", targetContainerId = "", column = 1, row = 1, rotation = 0) {
    const item = getItemFromState(state, itemId);
    if (!item) return makeResult(false, "ITEM_NOT_FOUND", "Item is not present in Equipment state.", { itemId: String(itemId || "") });
    const sourceContainerId = String(item.containerHostId || "").trim();
    const targetContext = resolveEffectiveContainerContext(state, targetContainerId);
    const targetContainer = targetContext.container;
    if (!targetContainer?.isContainer) return makeResult(false, "CONTAINER_NOT_FOUND", "Target container is not present in Equipment state.", { containerId: String(targetContainerId || "") });
    if (!item.isInGrid || !sourceContainerId) return makeResult(false, "ITEM_NOT_IN_GRID", "Only items located in a container grid can be transferred between grids.", { itemId: item.id });
    if (sourceContainerId === String(targetContainer.id || "")) {
      return evaluateContainerItemPlacement(state, item.id, targetContainer.id, column, row, rotation);
    }

    const moveValidation = canMoveEquipmentItemToContainer(state, item.id, targetContainer.id, { state, item, context: targetContext });
    if (!moveValidation.ok) return { ...moveValidation, details: { ...(moveValidation.details || {}), sourceContainerId, targetContainerId: targetContainer.id } };

    const model = buildContainerGridModel(state, targetContainer.id, { context: targetContext, excludeItemId: item.id });
    const placement = {
      containerId: targetContainer.id,
      column: clampInteger(column, 1, 99),
      row: clampInteger(row, 1, 99),
      rotation: normalizeRotation(rotation)
    };
    const footprint = getContainerPlacementFootprint(item, targetContainer, model.capacity || {}, placement, placement.rotation);
    if (!model.grid.hasGrid) return makeResult(false, "GRID_UNAVAILABLE", "Target container has no active grid.", { sourceContainerId, targetContainerId: targetContainer.id, placement, footprint, grid: model.grid });
    if (!isPlacementInsideGrid(model.grid, placement, footprint)) {
      return makeResult(false, "OUT_OF_BOUNDS", "Item footprint exceeds the target container grid.", { sourceContainerId, targetContainerId: targetContainer.id, placement, footprint, grid: model.grid });
    }
    const cellValidation = validateContainerCellPlacement(item, targetContainer, model.capacity || {}, placement, footprint);
    if (!cellValidation.ok) return { ...cellValidation, details: { ...(cellValidation.details || {}), sourceContainerId, targetContainerId: targetContainer.id, placement, footprint, grid: model.grid } };
    const collisions = getPlacementCollisions(model.occupancy, placement, footprint);
    if (collisions.length) {
      return makeResult(false, "COLLISION", "Target cells are occupied by another item.", { sourceContainerId, targetContainerId: targetContainer.id, placement, footprint, collisions, grid: model.grid });
    }
    return makeResult(true, "TRANSFER_PLACEABLE", "Item can be transferred to the target container grid.", {
      sourceContainerId,
      targetContainerId: targetContainer.id,
      placement,
      footprint,
      grid: model.grid
    });
  }

  function transferEquipmentItemBetweenContainers(citizenOrId = {}, itemId = "", targetContainerId = "", column = 1, row = 1, rotation = 0) {
    const citizen = getCitizen(citizenOrId);
    if (!citizen) return makeResult(false, "CITIZEN_NOT_FOUND", "Citizen was not found.");
    const state = getState(citizen);
    const validation = evaluateCrossContainerItemPlacement(state, itemId, targetContainerId, column, row, rotation);
    if (!validation.ok) return { ...validation, citizen: null };
    const placement = validation.details?.placement || {};
    const updated = updateEquipmentItems(citizen, (items) => items.map((raw) => {
      const rawId = String(raw?.id || raw?.itemId || "").trim();
      if (rawId !== String(itemId || "")) return raw;
      const next = {
        ...raw,
        location: "CONTAINER",
        containerHostId: String(placement.containerId || targetContainerId || "").trim(),
        storageUnitId: "",
        equippedLocation: null,
        housingPlacement: null,
        containerPlacement: {
          containerId: String(placement.containerId || targetContainerId || "").trim(),
          column: clampInteger(placement.column, 1, 99),
          row: clampInteger(placement.row, 1, 99),
          rotation: normalizeRotation(placement.rotation)
        }
      };
      ["containerItemId", "unitId", "equippedSlot", "equippedLayer", "bodySlot", "bodyLayer", "parentItemId", "hostItemId", "gridPlacement", "gridColumn", "gridRow", "gridRotation", "storagePlacement"].forEach((key) => delete next[key]);
      return next;
    }));
    return { ...validation, citizen: updated, itemId: String(itemId || ""), containerId: String(placement.containerId || targetContainerId || "") };
  }

  function canMoveEquipmentItemToContainer(citizenOrState = {}, itemId = "", containerId = "", options = {}) {
    const state = options.state || (citizenOrState?.items && citizenOrState?.itemById ? citizenOrState : getState(getCitizen(citizenOrState) || {}));
    if (!state) return makeResult(false, "STATE_UNAVAILABLE", "Equipment state is unavailable.");

    const item = options.item || getItemFromState(state, itemId);
    if (!item) return makeResult(false, "ITEM_NOT_FOUND", "Item is not present in Equipment state.", { itemId: String(itemId || "") });

    const context = resolveEffectiveContainerContext(state, containerId, options);
    const container = context.container;
    if (!container) return makeResult(false, "CONTAINER_NOT_FOUND", "Container is not present in Equipment state.", { containerId: String(containerId || "") });
    if (!container.isContainer) return makeResult(false, "TARGET_NOT_CONTAINER", "Target item has no container profile.", { containerId: container.id });
    if (String(item.id || "") === String(container.id || "")) return makeResult(false, "SELF_CONTAINER", "Item cannot be moved into itself.", { itemId: item.id });
    if (item.isStored && options.allowStoredSource !== true) return makeResult(false, "ITEM_STORED", "Stored items require a Housing-grid transfer.", { itemId: item.id });
    if (item.isOrphan && options.allowOrphanSource !== true) return makeResult(false, "ITEM_ORPHAN", "Item has no valid physical location.", { itemId: item.id });
    if (container.isStored && options.allowStoredContainerTarget !== true) return makeResult(false, "CONTAINER_STORED", "Stored containers require a Housing transfer context.", { containerId: container.id });
    if (item.isEquipped && options.allowEquippedSource !== true) return makeResult(false, "ITEM_EQUIPPED", "Equipped items must use an unequip-to-grid action.", { itemId: item.id });
    if (isDescendantContainer(state, item.id, container.id)) {
      return makeResult(false, "CONTAINER_CYCLE", "Container nesting cycle would be created.", { itemId: item.id, containerId: container.id });
    }
    if (item.isInGrid && String(item.containerHostId || "") === String(container.id || "")) {
      return makeResult(true, "ALREADY_IN_GRID", "Item is already located in this container grid.", { itemId: item.id, containerId: container.id });
    }

    const profile = context.effectiveProfile || container.containerProfile || {};
    const tokens = itemTokens(item);
    if (hasTokenOverlap(tokens, profile.blockedTags || [])) {
      return makeResult(false, "BLOCKED_TAG", "Container blocks this item tag.", { itemId: item.id, containerId: container.id, blockedTags: profile.blockedTags || [] });
    }
    if (Array.isArray(profile.acceptedTags) && profile.acceptedTags.length && !hasTokenOverlap(tokens, profile.acceptedTags)) {
      return makeResult(false, "TAG_NOT_ACCEPTED", "Container does not accept this item category/tag.", { itemId: item.id, containerId: container.id, acceptedTags: profile.acceptedTags });
    }

    if (options.skipPlacementSearch === true) {
      return makeResult(true, "MOVABLE_PRECHECK", "Container accepts this item for exact placement validation.", {
        itemId: item.id,
        containerId: container.id
      });
    }

    const capacity = getContainerCapacityStatus(state, container.id, { context, excludeItemId: item.id });
    const placement = findFirstAvailableContainerPlacementAnyRotation(state, item.id, container.id, options.rotation ?? item.containerPlacement?.rotation ?? item.housingPlacement?.rotation ?? 0);
    const itemCost = Number(placement?.footprint?.slots || getItemSlotCost(item));
    if (capacity.slotCapacity <= 0) return makeResult(false, "NO_CAPACITY", "Container has no slot capacity.", { containerId: container.id });
    if (capacity.usedSlots + itemCost > capacity.slotCapacity) {
      return makeResult(false, "CAPACITY_EXCEEDED", "Item exceeds container slot capacity.", {
        itemId: item.id,
        containerId: container.id,
        usedSlots: capacity.usedSlots,
        itemCost,
        slotCapacity: capacity.slotCapacity
      });
    }

    const grid = getContainerGridDimensions(container, capacity);
    if (grid.hasGrid && !placement) {
      return makeResult(false, "GRID_NO_SPACE", "Container has enough capacity but no contiguous cells for this footprint.", {
        itemId: item.id,
        containerId: container.id,
        itemCost,
        grid
      });
    }

    return makeResult(true, "MOVABLE", "Item can be moved into this container grid.", {
      itemId: item.id,
      containerId: container.id,
      usedSlots: capacity.usedSlots,
      itemCost,
      slotCapacity: capacity.slotCapacity,
      placement,
      autoRotated: Boolean(placement && normalizeRotation(placement.rotation) !== normalizeRotation(options.rotation ?? item.containerPlacement?.rotation ?? item.housingPlacement?.rotation ?? 0))
    });
  }

  function createGridDragPlacementContext(state = {}, itemId = "", targetContainerId = "", rotation = 0) {
    const item = getItemFromState(state, itemId);
    const targetContext = resolveEffectiveContainerContext(state, targetContainerId);
    const targetContainer = targetContext.container;
    const normalizedRotation = normalizeRotation(rotation);
    if (!item) {
      const validation = makeResult(false, "ITEM_NOT_FOUND", "Item is not present in Equipment state.", { itemId: String(itemId || "") });
      return { ok: false, validation, item: null, targetContainer: null, model: null, rotation: normalizedRotation };
    }
    if (!targetContainer?.isContainer) {
      const validation = makeResult(false, "CONTAINER_NOT_FOUND", "Target container is not present in Equipment state.", { containerId: String(targetContainerId || "") });
      return { ok: false, validation, item, targetContainer: null, model: null, rotation: normalizedRotation };
    }

    const sourceContainerId = String(item.containerHostId || "").trim();
    if (!item.isInGrid || !sourceContainerId) {
      const validation = makeResult(false, "ITEM_NOT_IN_GRID", "Only items located in a container grid can be dragged.", { itemId: item.id });
      return { ok: false, validation, item, targetContainer, model: null, rotation: normalizedRotation };
    }

    if (sourceContainerId !== String(targetContainer.id || "")) {
      const eligibility = canMoveEquipmentItemToContainer(state, item.id, targetContainer.id, {
        state,
        item,
        context: targetContext,
        rotation: normalizedRotation,
        skipPlacementSearch: true
      });
      if (!eligibility.ok) {
        return { ok: false, validation: eligibility, item, targetContainer, model: null, rotation: normalizedRotation, sourceContainerId };
      }
    }

    const model = buildContainerGridModel(state, targetContainer.id, {
      context: targetContext,
      excludeItemId: item.id
    });
    return {
      ok: true,
      validation: null,
      item,
      targetContainer,
      targetContext,
      model,
      rotation: normalizedRotation,
      sourceContainerId,
      crossContainer: sourceContainerId !== String(targetContainer.id || "")
    };
  }

  function evaluateGridDragPlacementContext(placementContext = {}, column = 1, row = 1) {
    if (!placementContext?.ok) return placementContext?.validation || makeResult(false, "DRAG_CONTEXT_UNAVAILABLE", "Grid drag context is unavailable.");
    const { item, targetContainer, model, sourceContainerId, crossContainer } = placementContext;
    const placement = {
      containerId: targetContainer.id,
      column: clampInteger(column, 1, 99),
      row: clampInteger(row, 1, 99),
      rotation: normalizeRotation(placementContext.rotation)
    };
    const footprint = getContainerPlacementFootprint(item, targetContainer, model.capacity || {}, placement, placement.rotation);
    if (!model.grid.hasGrid) {
      return makeResult(false, "GRID_UNAVAILABLE", "Target container has no active grid.", { sourceContainerId, targetContainerId: targetContainer.id, placement, footprint, grid: model.grid });
    }
    if (!isPlacementInsideGrid(model.grid, placement, footprint)) {
      return makeResult(false, "OUT_OF_BOUNDS", "Item footprint exceeds the target container grid.", { sourceContainerId, targetContainerId: targetContainer.id, placement, footprint, grid: model.grid });
    }
    const cellValidation = validateContainerCellPlacement(item, targetContainer, model.capacity || {}, placement, footprint);
    if (!cellValidation.ok) {
      return { ...cellValidation, details: { ...(cellValidation.details || {}), sourceContainerId, targetContainerId: targetContainer.id, placement, footprint, grid: model.grid } };
    }
    const collisions = getPlacementCollisions(model.occupancy, placement, footprint);
    if (collisions.length) {
      return makeResult(false, "COLLISION", "Target cells are occupied by another item.", { sourceContainerId, targetContainerId: targetContainer.id, placement, footprint, collisions, grid: model.grid });
    }
    return makeResult(true, crossContainer ? "TRANSFER_PLACEABLE" : "PLACEABLE", "Item can be placed at the selected grid cell.", {
      sourceContainerId,
      targetContainerId: targetContainer.id,
      placement,
      footprint,
      grid: model.grid
    });
  }

  function getContainerWorkspaceState(citizenOrState = {}, containerId = "", options = {}) {
    const citizen = getCitizen(citizenOrState);
    const state = options.state || (citizenOrState?.items && citizenOrState?.itemById ? citizenOrState : getState(citizen || {}));
    const context = state ? resolveEffectiveContainerContext(state, containerId, options) : null;
    const container = context?.container || null;
    const capacity = getContainerCapacityStatus(state || {}, containerId, { ...options, context });
    return {
      version: INVENTORY_CORE_VERSION,
      container,
      capacityProvider: context?.capacityProvider || null,
      gridItems: container ? getGridItemsForContainer(state, container.id, { context }) : [],
      capacity,
      gridModel: container ? buildContainerGridModel(state, container.id, { context, capacity }) : null
    };
  }

  function updateEquipmentItems(citizen = {}, transform, options = {}) {
    if (!citizen?.id || typeof window.WS_APP.replaceCitizenItemInstances !== "function" || typeof transform !== "function") return null;
    const currentItems = typeof window.WS_APP.getCitizenEquipmentItemInstanceViews === "function"
      ? window.WS_APP.getCitizenEquipmentItemInstanceViews(citizen.id)
      : [];
    const nextItems = transform(clone(currentItems));
    if (!Array.isArray(nextItems)) return null;
    const result = window.WS_APP.replaceCitizenItemInstances(citizen.id, nextItems, {
      scope: "EQUIPMENT",
      source: String(options.source || "EQUIPMENT_INVENTORY").trim().toUpperCase(),
      skipCitizenEvent: options.skipCitizenEvent === true,
      skipModuleRefresh: options.skipModuleRefresh !== false,
      skipProfileRefresh: options.skipProfileRefresh !== false,
      deferPersistence: options.deferPersistence === true
    });
    return result?.ok ? window.WS_APP.getCitizenById?.(citizen.id) || citizen : null;
  }

  function persistContainerPlacement(citizen = {}, itemId = "", placement = {}, options = {}) {
    return updateEquipmentItems(citizen, (items) => items.map((raw) => {
      const rawId = String(raw?.id || raw?.itemId || "").trim();
      if (rawId !== String(itemId || "")) return raw;
      const next = { ...raw };
      next.containerPlacement = {
        containerId: String(placement.containerId || next.containerHostId || "").trim(),
        column: clampInteger(placement.column, 1, 99),
        row: clampInteger(placement.row, 1, 99),
        rotation: normalizeRotation(placement.rotation)
      };
      return next;
    }), options);
  }

  function moveEquipmentItemToContainer(citizenOrId = {}, itemId = "", containerId = "", options = {}) {
    const citizen = getCitizen(citizenOrId);
    if (!citizen) return makeResult(false, "CITIZEN_NOT_FOUND", "Citizen was not found.");
    const state = getState(citizen);
    const validation = canMoveEquipmentItemToContainer(state, itemId, containerId, { ...options, state });
    if (!validation.ok || validation.code === "ALREADY_IN_GRID") return { ...validation, citizen: null };
    const item = getItemFromState(state, itemId);
    const context = resolveEffectiveContainerContext(state, containerId);
    const container = context.container;
    const placement = options.placement || validation.details?.placement || findFirstAvailableContainerPlacementAnyRotation(state, item.id, container.id, options.rotation ?? item.containerPlacement?.rotation ?? item.housingPlacement?.rotation ?? 0);
    if (!placement) return makeResult(false, "GRID_NO_SPACE", "No valid grid placement is available.", { itemId: item.id, containerId: container.id });
    const updated = updateEquipmentItems(citizen, (items) => items.map((raw) => {
      const rawId = String(raw?.id || raw?.itemId || "").trim();
      if (rawId !== item.id) return raw;
      const next = {
        ...raw,
        location: "CONTAINER",
        containerHostId: container.id,
        storageUnitId: "",
        equippedLocation: null,
        housingPlacement: null,
        containerPlacement: {
          containerId: container.id,
          column: clampInteger(placement.column, 1, 99),
          row: clampInteger(placement.row, 1, 99),
          rotation: normalizeRotation(placement.rotation)
        }
      };
      ["containerItemId", "unitId", "equippedSlot", "equippedLayer", "bodySlot", "bodyLayer", "parentItemId", "hostItemId", "gridPlacement", "gridColumn", "gridRow", "gridRotation", "storagePlacement"].forEach((key) => delete next[key]);
      return next;
    }));
    return { ...validation, citizen: updated, itemId: item.id, containerId: container.id, placement };
  }

  function commitEquipmentGridDragPlacement(citizenOrId = {}, itemId = "", validatedPlacement = {}) {
    const citizen = getCitizen(citizenOrId);
    if (!citizen) return makeResult(false, "CITIZEN_NOT_FOUND", "Citizen was not found.");

    const id = String(itemId || "").trim();
    const containerId = String(validatedPlacement?.containerId || "").trim();
    const placement = {
      containerId,
      column: clampInteger(validatedPlacement.column, 1, 99),
      row: clampInteger(validatedPlacement.row, 1, 99),
      rotation: normalizeRotation(validatedPlacement.rotation)
    };

    const commitGridPlacement = window.WS_APP.commitCitizenEquipmentGridPlacement;
    if (typeof commitGridPlacement !== "function") {
      return makeResult(
        false,
        "ITEM_INSTANCE_GRID_COMMIT_UNAVAILABLE",
        "Canonical ItemInstance grid placement commit is unavailable.",
        { itemId: id, containerId, placement }
      );
    }

    const directCommit = commitGridPlacement(citizen.id, id, placement);
    if (!directCommit?.ok) {
      return makeResult(
        false,
        String(directCommit?.code || directCommit?.reason || "ITEM_INSTANCE_GRID_COMMIT_FAILED"),
        String(directCommit?.message || "Canonical ItemInstance grid placement commit rejected the placement."),
        {
          itemId: id,
          containerId,
          placement,
          canonicalCommit: directCommit || null
        }
      );
    }

    return {
      ...makeResult(true, "GRID_PLACEMENT_COMMITTED", "Validated grid placement was committed through the canonical ItemInstance fast path.", { placement }),
      citizen: null,
      itemId: id,
      containerId,
      placement,
      deferredPersistence: directCommit.deferredPersistence !== false,
      noChange: directCommit.noChange === true
    };
  }

  function placeEquipmentItemInContainer(citizenOrId = {}, itemId = "", containerId = "", column = 1, row = 1, rotation = 0) {
    const citizen = getCitizen(citizenOrId);
    if (!citizen) return makeResult(false, "CITIZEN_NOT_FOUND", "Citizen was not found.");
    const state = getState(citizen);
    const validation = evaluateContainerItemPlacement(state, itemId, containerId, column, row, rotation);
    if (!validation.ok) return { ...validation, citizen: null };
    const updated = persistContainerPlacement(citizen, itemId, validation.details.placement);
    return { ...validation, citizen: updated, itemId: String(itemId || ""), containerId: String(validation.details?.placement?.containerId || containerId || "") };
  }


  function sortEquipmentContainerItems(citizenOrId = {}, containerId = "") {
    const citizen = getCitizen(citizenOrId);
    if (!citizen) return makeResult(false, "CITIZEN_NOT_FOUND", "Citizen was not found.");
    const state = getState(citizen);
    const context = resolveEffectiveContainerContext(state, containerId);
    const container = context.container;
    if (!container?.isContainer) return makeResult(false, "CONTAINER_NOT_FOUND", "Container is not present in Equipment state.", { containerId });

    const capacity = getContainerCapacityStatus(state, container.id, { context });
    const grid = getContainerGridDimensions(container, capacity);
    if (!grid.hasGrid) return makeResult(false, "GRID_UNAVAILABLE", "Container has no usable grid.", { containerId: container.id });

    const items = getGridItemsForContainer(state, container.id, { context });
    if (!items.length) return makeResult(false, "CONTAINER_EMPTY", "Container has no items to sort.", { containerId: container.id });
    if (items.length < 2) return makeResult(false, "SORT_NOT_REQUIRED", "At least two items are required to sort a container.", { containerId: container.id, itemCount: items.length });

    const records = items.map((item) => {
      const storedPlacement = normalizeStoredPlacement(item, container.id);
      const rotation = normalizeRotation(storedPlacement?.rotation || 0);
      const footprint = getContainerPlacementFootprint(item, container, capacity, storedPlacement || {}, rotation);
      const naturalFootprint = getItemGridFootprint(item, rotation);
      return {
        item,
        rotation,
        footprint,
        area: naturalFootprint.width * naturalFootprint.height,
        longestSide: Math.max(naturalFootprint.width, naturalFootprint.height),
        name: String(item.name || item.id || "").toUpperCase()
      };
    }).sort((left, right) => (
      right.area - left.area
      || right.longestSide - left.longestSide
      || right.footprint.height - left.footprint.height
      || left.name.localeCompare(right.name)
      || String(left.item.id || "").localeCompare(String(right.item.id || ""))
    ));

    const occupancy = makeOccupancy(grid);
    const placements = new Map();
    for (const record of records) {
      const target = findFirstContainerGridPlacement(record.item, container, capacity, occupancy, grid, record.rotation);
      if (!target) {
        return makeResult(false, "SORT_NO_SPACE", "Current item orientations cannot be sorted into this grid.", {
          containerId: container.id,
          itemId: record.item.id,
          footprint: record.footprint
        });
      }
      occupyPlacement(occupancy, String(record.item.id || ""), target, target.footprint);
      placements.set(String(record.item.id || ""), {
        containerId: container.id,
        column: target.column,
        row: target.row,
        rotation: record.rotation
      });
    }

    const updated = updateEquipmentItems(citizen, (rawItems) => rawItems.map((raw) => {
      const rawId = String(raw?.id || raw?.itemId || "").trim();
      const placement = placements.get(rawId);
      if (!placement) return raw;
      const next = { ...raw, containerPlacement: placement };
      return next;
    }));

    return {
      ...makeResult(true, "CONTAINER_SORTED", "Container contents were sorted.", {
        containerId: container.id,
        itemCount: placements.size
      }),
      citizen: updated,
      containerId: container.id,
      itemCount: placements.size
    };
  }

  function rotateEquipmentContainerItem(citizenOrId = {}, itemId = "", containerId = "") {
    const citizen = getCitizen(citizenOrId);
    if (!citizen) return makeResult(false, "CITIZEN_NOT_FOUND", "Citizen was not found.");
    const state = getState(citizen);
    const context = resolveEffectiveContainerContext(state, containerId);
    const model = buildContainerGridModel(state, context.effectiveContainerId || containerId, { context });
    const entry = model.entries.find((candidate) => String(candidate.item?.id || "") === String(itemId || ""));
    if (!entry?.placement) return makeResult(false, "ITEM_UNPLACED", "Item has no current grid placement.", { itemId, containerId });
    if (entry.footprint?.mounted) return makeResult(false, "ROTATION_SLOT_MOUNT", "Dedicated slot mounts do not rotate.", { itemId, containerId });
    const baseFootprint = getItemGridFootprint(entry.item || {}, 0);
    if (baseFootprint.baseWidth === baseFootprint.baseHeight) {
      return makeResult(false, "ROTATION_SYMMETRIC", "A symmetric footprint is unchanged by a 90 degree rotation.", { itemId, containerId });
    }
    const nextRotation = entry.footprint.rotation === 90 ? 0 : 90;
    const sameCell = evaluateContainerItemPlacement(state, itemId, containerId, entry.placement.column, entry.placement.row, nextRotation);
    if (sameCell.ok) {
      const updated = persistContainerPlacement(citizen, itemId, sameCell.details.placement);
      return { ...sameCell, citizen: updated, itemId, containerId: context.effectiveContainerId || containerId, moved: false };
    }
    const fallback = findFirstAvailableContainerPlacement(state, itemId, containerId, nextRotation);
    if (!fallback) return makeResult(false, "ROTATION_BLOCKED", "Rotated footprint does not fit anywhere in the selected container.", { itemId, containerId, rotation: nextRotation });
    const updated = persistContainerPlacement(citizen, itemId, fallback);
    return {
      ...makeResult(true, "ROTATED_AND_MOVED", "Item rotated and moved to the first valid grid position.", { placement: fallback }),
      citizen: updated,
      itemId,
      containerId: context.effectiveContainerId || containerId,
      moved: true
    };
  }

  window.WS_APP.equipmentInventoryCore = {
    version: INVENTORY_CORE_VERSION,
    resolveEffectiveContainerContext,
    getGridItemsForContainer,
    getItemSlotCost,
    getContainerUsedSlots,
    getContainerCapacityStatus,
    getContainerGridDimensions,
    getContainerCellRule,
    getContainerPlacementFootprint,
    getItemGridFootprint,
    buildContainerGridModel,
    createContainerPlacementContext,
    evaluateContainerPlacementTarget,
    evaluateContainerItemPlacement,
    findFirstAvailableContainerPlacement,
    canMoveEquipmentItemToContainer,
    getContainerWorkspaceState,
    moveEquipmentItemToContainer,
    placeEquipmentItemInContainer,
    commitEquipmentGridDragPlacement,
    rotateEquipmentContainerItem,
    sortEquipmentContainerItems,
    evaluateCrossContainerItemPlacement,
    createGridDragPlacementContext,
    evaluateGridDragPlacementContext,
    transferEquipmentItemBetweenContainers
  };

  window.WS_APP.resolveEffectiveEquipmentContainer = resolveEffectiveContainerContext;
  window.WS_APP.getEquipmentGridItemsForContainer = getGridItemsForContainer;
  window.WS_APP.getEquipmentItemSlotCost = getItemSlotCost;
  window.WS_APP.getEquipmentContainerCapacityStatus = getContainerCapacityStatus;
  window.WS_APP.getEquipmentContainerGridDimensions = getContainerGridDimensions;
  window.WS_APP.getEquipmentContainerCellRule = getContainerCellRule;
  window.WS_APP.getEquipmentContainerPlacementFootprint = getContainerPlacementFootprint;
  window.WS_APP.getEquipmentItemGridFootprint = getItemGridFootprint;
  window.WS_APP.getEquipmentContainerGridModel = buildContainerGridModel;
  window.WS_APP.createEquipmentContainerPlacementContext = createContainerPlacementContext;
  window.WS_APP.evaluateEquipmentContainerPlacementTarget = evaluateContainerPlacementTarget;
  window.WS_APP.evaluateEquipmentContainerItemPlacement = evaluateContainerItemPlacement;
  window.WS_APP.evaluateEquipmentCrossContainerPlacement = evaluateCrossContainerItemPlacement;
  window.WS_APP.createEquipmentGridDragPlacementContext = createGridDragPlacementContext;
  window.WS_APP.evaluateEquipmentGridDragPlacementContext = evaluateGridDragPlacementContext;
  window.WS_APP.findFirstEquipmentContainerPlacement = findFirstAvailableContainerPlacement;
  window.WS_APP.canMoveEquipmentItemToContainer = canMoveEquipmentItemToContainer;
  window.WS_APP.getEquipmentContainerWorkspaceState = getContainerWorkspaceState;
  window.WS_APP.moveEquipmentItemToContainer = moveEquipmentItemToContainer;
  window.WS_APP.placeEquipmentItemInContainer = placeEquipmentItemInContainer;
  window.WS_APP.commitEquipmentGridDragPlacement = commitEquipmentGridDragPlacement;
  window.WS_APP.rotateEquipmentContainerItem = rotateEquipmentContainerItem;
  window.WS_APP.sortEquipmentContainerItems = sortEquipmentContainerItems;
  window.WS_APP.transferEquipmentItemBetweenContainers = transferEquipmentItemBetweenContainers;
})();
