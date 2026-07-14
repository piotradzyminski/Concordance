window.WS_APP = window.WS_APP || {};

(function initHousingGridEngineAdapter() {
  const ADAPTER_VERSION = "4.6.2x";
  const UI_MODE = "SHARED_POINTER_SESSION";
  const clone = window.WS_APP.cloneEquipmentValue || ((value) => JSON.parse(JSON.stringify(value ?? null)));
  const diagnostics = {
    contextsCreated: 0,
    dropsEvaluated: 0,
    commitsRequested: 0,
    readinessChecks: 0,
    parityChecks: 0,
    lastErrorCode: "",
    lastContext: null,
    lastEvaluation: null,
    lastCommit: null
  };

  function makeResult(ok = false, code = "UNKNOWN", message = "", details = {}) {
    return {
      ok: Boolean(ok),
      code: String(code || "UNKNOWN"),
      message: String(message || ""),
      details: details && typeof details === "object" && !Array.isArray(details) ? details : {}
    };
  }

  function normalizeRotation(value = 0) {
    const normalized = ((Math.round(Number(value) || 0) % 180) + 180) % 180;
    return normalized === 90 ? 90 : 0;
  }

  function clampInteger(value, min = 0, max = 999) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, number));
  }

  function normalizeGrabOffset(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      column: clampInteger(source.column ?? source.columnOffset ?? source.x ?? 0, 0, 99),
      row: clampInteger(source.row ?? source.rowOffset ?? source.y ?? 0, 0, 99)
    };
  }

  function getCellIndex(unit = {}, column = 1, row = 1) {
    return (row - 1) * Math.max(1, Number(unit.width || 1)) + column;
  }

  function isPlacementInsideUnit(unit = {}, placement = {}, footprint = {}) {
    const column = clampInteger(placement.column, 0, 999);
    const row = clampInteger(placement.row, 0, 999);
    const width = clampInteger(footprint.width, 1, 99);
    const height = clampInteger(footprint.height, 1, 99);
    const unitWidth = clampInteger(unit.width, 1, 99);
    const unitHeight = clampInteger(unit.height, 1, 999);
    const slotCapacity = clampInteger(unit.slotCapacity ?? unitWidth * unitHeight, 0, 9999);
    if (!column || !row) return false;
    if (column + width - 1 > unitWidth || row + height - 1 > unitHeight) return false;
    for (let y = row; y < row + height; y += 1) {
      for (let x = column; x < column + width; x += 1) {
        if (getCellIndex(unit, x, y) > slotCapacity) return false;
      }
    }
    return true;
  }

  function getPlacementCollisions(occupancy = [], placement = {}, footprint = {}) {
    const collisions = new Set();
    const width = clampInteger(footprint.width, 1, 99);
    const height = clampInteger(footprint.height, 1, 99);
    for (let y = placement.row - 1; y < placement.row - 1 + height; y += 1) {
      for (let x = placement.column - 1; x < placement.column - 1 + width; x += 1) {
        const occupant = String(occupancy?.[y]?.[x] || "").trim();
        if (occupant) collisions.add(occupant);
      }
    }
    return [...collisions];
  }

  function isSamePlacement(left = {}, right = {}) {
    return String(left?.storageUnitId || "").trim() === String(right?.storageUnitId || "").trim()
      && Number(left?.column || 0) === Number(right?.column || 0)
      && Number(left?.row || 0) === Number(right?.row || 0)
      && normalizeRotation(left?.rotation || 0) === normalizeRotation(right?.rotation || 0);
  }

  function resolveCitizen(citizenOrState = {}, options = {}) {
    if (options.citizen?.id) return options.citizen;
    if (citizenOrState?.id && !citizenOrState?.itemById) return citizenOrState;
    const citizenId = String(options.citizenId || citizenOrState?.citizenId || citizenOrState?.ownerId || "").trim();
    return citizenId && typeof window.WS_APP.getCitizenById === "function"
      ? window.WS_APP.getCitizenById(citizenId)
      : null;
  }

  function resolveState(citizenOrState = {}, options = {}) {
    if (options.state?.itemById && Array.isArray(options.state?.items)) return options.state;
    if (citizenOrState?.itemById && Array.isArray(citizenOrState?.items)) return citizenOrState;
    const citizen = resolveCitizen(citizenOrState, options);
    return citizen && typeof window.WS_APP.getEquipmentState === "function"
      ? window.WS_APP.getEquipmentState(citizen)
      : null;
  }

  function resolveUnit(citizen = null, storageUnitId = "", options = {}) {
    if (options.unit && typeof options.unit === "object" && !Array.isArray(options.unit)) {
      return typeof window.WS_APP.normalizeEquipmentHousingStorageUnit === "function"
        ? window.WS_APP.normalizeEquipmentHousingStorageUnit(options.unit)
        : clone(options.unit);
    }
    return citizen && typeof window.WS_APP.getEquipmentHousingStorageUnit === "function"
      ? window.WS_APP.getEquipmentHousingStorageUnit(citizen, storageUnitId)
      : null;
  }

  function getHousingGridFootprint(item = {}, rotation = 0) {
    const normalizedRotation = normalizeRotation(rotation);
    if (typeof window.WS_APP.getEquipmentItemGridFootprint === "function") {
      const footprint = window.WS_APP.getEquipmentItemGridFootprint(item, normalizedRotation) || {};
      const width = clampInteger(footprint.width ?? footprint.baseWidth ?? 1, 1, 99);
      const height = clampInteger(footprint.height ?? footprint.baseHeight ?? 1, 1, 99);
      return {
        width,
        height,
        slots: clampInteger(footprint.slots ?? width * height, 1, 9999),
        rotation: normalizedRotation,
        source: "EQUIPMENT_GRID_CORE"
      };
    }
    const baseWidth = clampInteger(item.width ?? item.gridWidth ?? 1, 1, 99);
    const baseHeight = clampInteger(item.height ?? item.gridHeight ?? 1, 1, 99);
    const width = normalizedRotation === 90 ? baseHeight : baseWidth;
    const height = normalizedRotation === 90 ? baseWidth : baseHeight;
    return { width, height, slots: width * height, rotation: normalizedRotation, source: "ADAPTER_FALLBACK" };
  }

  function getHousingGridCellModel(citizenOrState = {}, storageUnitId = "", options = {}) {
    const citizen = resolveCitizen(citizenOrState, options);
    const state = resolveState(citizenOrState, { ...options, citizen });
    const unit = resolveUnit(citizen, storageUnitId, options);
    if (!state) return makeResult(false, "STATE_UNAVAILABLE", "Equipment state is unavailable.");
    if (!unit) return makeResult(false, "HOUSING_UNIT_NOT_FOUND", "Housing storage unit is unavailable.", { storageUnitId });
    if (typeof window.WS_APP.buildEquipmentHousingGridModel !== "function") {
      return makeResult(false, "HOUSING_GRID_MODEL_API_UNAVAILABLE", "Housing grid model API is unavailable.");
    }
    const model = window.WS_APP.buildEquipmentHousingGridModel(state, unit.id, {
      citizen,
      state,
      unit,
      excludeItemId: options.excludeItemId || "",
      derivePlacements: options.derivePlacements !== false
    });
    const cells = [];
    const width = clampInteger(unit.width, 1, 99);
    const height = clampInteger(unit.height, 1, 999);
    const slotCapacity = clampInteger(unit.slotCapacity ?? width * height, 0, 9999);
    for (let row = 1; row <= height; row += 1) {
      for (let column = 1; column <= width; column += 1) {
        const index = (row - 1) * width + column;
        const occupantId = String(model?.occupancy?.[row - 1]?.[column - 1] || "").trim();
        cells.push({
          key: `${column}:${row}`,
          column,
          row,
          index,
          disabled: index > slotCapacity,
          occupied: Boolean(occupantId),
          occupantId
        });
      }
    }
    return makeResult(true, "HOUSING_GRID_CELL_MODEL_READY", "Housing grid cell model is ready.", {
      version: ADAPTER_VERSION,
      unit: clone(unit),
      model,
      cells,
      usedSlots: Number(model?.usedSlots || 0),
      freeSlots: Number(model?.freeSlots || 0),
      hasUnplacedItems: Boolean(model?.hasUnplacedItems)
    });
  }

  function createHousingGridDragContext(citizenOrState = {}, itemId = "", storageUnitId = "", options = {}) {
    diagnostics.contextsCreated += 1;
    const citizen = resolveCitizen(citizenOrState, options);
    const state = resolveState(citizenOrState, { ...options, citizen });
    if (!state) return makeResult(false, "STATE_UNAVAILABLE", "Equipment state is unavailable.");
    const itemKey = String(itemId || "").trim();
    const item = options.item || state.itemById?.[itemKey] || null;
    if (!item) return makeResult(false, "ITEM_NOT_FOUND", "Item is not present in Equipment state.", { itemId: itemKey });
    const unit = resolveUnit(citizen, storageUnitId, options);
    if (!unit) return makeResult(false, "HOUSING_UNIT_NOT_FOUND", "Housing storage unit is unavailable.", { storageUnitId });
    const rotation = normalizeRotation(options.rotation ?? item.housingPlacement?.rotation ?? 0);
    const grabOffset = normalizeGrabOffset(options.grabOffset || {});
    const footprint = getHousingGridFootprint(item, rotation);
    const cellModel = getHousingGridCellModel(state, unit.id, {
      ...options,
      citizen,
      state,
      unit,
      excludeItemId: item.id
    });
    if (!cellModel.ok) return cellModel;
    const context = {
      ok: true,
      code: "HOUSING_GRID_DRAG_CONTEXT_READY",
      version: ADAPTER_VERSION,
      citizenId: String(citizen?.id || item.ownerId || item.characterId || "").trim(),
      itemId: String(item.id || item.instanceId || itemKey).trim(),
      storageUnitId: String(unit.id || storageUnitId).trim(),
      rotation,
      grabOffset,
      footprint,
      citizen,
      state,
      item,
      unit,
      cellModel: cellModel.details,
      currentPlacement: item.housingPlacement ? clone(item.housingPlacement) : null,
      persistenceField: "housingPlacement",
      commitApi: "moveEquipmentItemToHousing",
      uiMode: UI_MODE
    };
    diagnostics.lastContext = {
      citizenId: context.citizenId,
      itemId: context.itemId,
      storageUnitId: context.storageUnitId,
      rotation,
      grabOffset,
      footprint
    };
    return context;
  }

  function evaluateHousingGridDrop(contextOrInput = {}, targetColumn = 1, targetRow = 1, options = {}) {
    diagnostics.dropsEvaluated += 1;
    const context = contextOrInput?.code === "HOUSING_GRID_DRAG_CONTEXT_READY"
      ? contextOrInput
      : createHousingGridDragContext(
        contextOrInput.citizen || contextOrInput.state || contextOrInput.citizenId || {},
        contextOrInput.itemId || "",
        contextOrInput.storageUnitId || "",
        { ...contextOrInput.options, ...options, grabOffset: contextOrInput.grabOffset, rotation: contextOrInput.rotation, unit: contextOrInput.unit }
      );
    if (!context?.ok) return context;
    const grabOffset = normalizeGrabOffset(options.grabOffset || context.grabOffset || {});
    const column = clampInteger(targetColumn, 0, 999) - grabOffset.column;
    const row = clampInteger(targetRow, 0, 999) - grabOffset.row;
    const rotation = normalizeRotation(options.rotation ?? context.rotation);
    const footprint = getHousingGridFootprint(context.item, rotation);
    const targetCell = { column: clampInteger(targetColumn, 0, 999), row: clampInteger(targetRow, 0, 999) };
    const placement = { storageUnitId: context.storageUnitId, column, row, rotation };
    const unit = context.cellModel?.unit || context.unit;
    const occupancy = context.cellModel?.model?.occupancy || context.cellModel?.occupancy || [];

    if (column < 1 || row < 1 || !isPlacementInsideUnit(unit, placement, footprint)) {
      const result = makeResult(false, "OUT_OF_BOUNDS", "Item footprint exceeds the housing storage grid.", {
        targetCell,
        topLeft: { column, row },
        placement,
        footprint,
        unit,
        grabOffset,
        rotation,
        adapterVersion: ADAPTER_VERSION,
        uiMode: UI_MODE,
        evaluatedFromSessionModel: true
      });
      diagnostics.lastErrorCode = result.code;
      diagnostics.lastEvaluation = clone(result);
      return result;
    }

    const collisions = getPlacementCollisions(occupancy, placement, footprint);
    if (collisions.length) {
      const result = makeResult(false, "COLLISION", "Housing target cells are occupied.", {
        targetCell,
        topLeft: { column, row },
        placement,
        footprint,
        unit,
        collisions,
        grabOffset,
        rotation,
        adapterVersion: ADAPTER_VERSION,
        uiMode: UI_MODE,
        evaluatedFromSessionModel: true
      });
      diagnostics.lastErrorCode = result.code;
      diagnostics.lastEvaluation = clone(result);
      return result;
    }

    const result = makeResult(true, "HOUSING_PLACEABLE", "Item can be placed in housing storage.", {
      itemId: context.itemId,
      storageUnitId: context.storageUnitId,
      targetCell,
      topLeft: { column, row },
      placement,
      footprint,
      unit,
      grabOffset,
      adapterVersion: ADAPTER_VERSION,
      uiMode: UI_MODE,
      evaluatedFromSessionModel: true
    });
    diagnostics.lastErrorCode = "";
    diagnostics.lastEvaluation = clone(result);
    return result;
  }

  function commitHousingGridDrop(contextOrInput = {}, options = {}) {
    diagnostics.commitsRequested += 1;
    const context = contextOrInput?.code === "HOUSING_GRID_DRAG_CONTEXT_READY"
      ? contextOrInput
      : createHousingGridDragContext(
        contextOrInput.citizen || contextOrInput.state || contextOrInput.citizenId || {},
        contextOrInput.itemId || "",
        contextOrInput.storageUnitId || "",
        { ...contextOrInput.options, ...options, unit: contextOrInput.unit, rotation: contextOrInput.rotation, grabOffset: contextOrInput.grabOffset }
      );
    if (!context?.ok) return context;
    const explicitPlacement = options.placement || contextOrInput.placement || null;
    const validation = explicitPlacement
      ? evaluateHousingGridDrop(
        context,
        Number(explicitPlacement.column || 0) + Number(context.grabOffset?.column || 0),
        Number(explicitPlacement.row || 0) + Number(context.grabOffset?.row || 0),
        { ...options, rotation: explicitPlacement.rotation ?? context.rotation }
      )
      : evaluateHousingGridDrop(
        context,
        options.targetColumn ?? contextOrInput.targetColumn ?? 0,
        options.targetRow ?? contextOrInput.targetRow ?? 0,
        options
      );
    if (!validation?.ok) {
      diagnostics.lastErrorCode = String(validation?.code || "UNKNOWN");
      diagnostics.lastCommit = clone(validation);
      return validation;
    }

    const placement = validation.details?.placement || explicitPlacement;
    if (isSamePlacement(context.currentPlacement || {}, placement || {})) {
      const result = makeResult(true, "HOUSING_PLACEMENT_UNCHANGED", "Housing placement unchanged.", {
        itemId: context.itemId,
        storageUnitId: context.storageUnitId,
        placement,
        footprint: validation.details?.footprint || context.footprint,
        noChange: true,
        adapterVersion: ADAPTER_VERSION,
        uiMode: UI_MODE
      });
      result.noChange = true;
      diagnostics.lastErrorCode = "";
      diagnostics.lastCommit = clone(result);
      return result;
    }

    if (typeof window.WS_APP.moveEquipmentItemToHousing !== "function") {
      const result = makeResult(false, "HOUSING_GRID_COMMIT_API_UNAVAILABLE", "Housing placement commit API is unavailable.");
      diagnostics.lastErrorCode = result.code;
      diagnostics.lastCommit = clone(result);
      return result;
    }
    const latestCitizen = context.citizenId && typeof window.WS_APP.getCitizenById === "function"
      ? window.WS_APP.getCitizenById(context.citizenId) || context.citizen
      : context.citizen;
    const result = window.WS_APP.moveEquipmentItemToHousing(
      latestCitizen,
      context.itemId,
      context.storageUnitId,
      {
        unit: context.unit,
        placement,
        source: String(options.source || "HOUSING_GRID_ENGINE_ADAPTER").trim(),
        skipModuleRefresh: true,
        skipProfileRefresh: true,
        deferPersistence: true
      }
    );
    const mergedResult = {
      ...(result || {}),
      details: {
        ...(result?.details || {}),
        placement: result?.details?.placement || placement,
        footprint: validation.details?.footprint || context.footprint,
        adapterVersion: ADAPTER_VERSION,
        uiMode: UI_MODE
      }
    };
    diagnostics.lastErrorCode = mergedResult?.ok ? "" : String(mergedResult?.code || "UNKNOWN");
    diagnostics.lastCommit = clone(mergedResult);
    return mergedResult;
  }

  function getHousingGridEngineReadiness() {
    diagnostics.readinessChecks += 1;
    const checks = {
      housingModelReady: typeof window.WS_APP.buildEquipmentHousingGridModel === "function",
      housingValidatorReady: typeof window.WS_APP.evaluateEquipmentHousingPlacement === "function",
      housingCommitReady: typeof window.WS_APP.moveEquipmentItemToHousing === "function",
      equipmentFootprintReady: typeof window.WS_APP.getEquipmentItemGridFootprint === "function",
      sharedPlacementContextReady: typeof window.WS_APP.createEquipmentGridDragPlacementContext === "function"
        && typeof window.WS_APP.evaluateEquipmentGridDragPlacementContext === "function",
      sharedPointerSessionReady: typeof window.WS_APP.startGridPointerSession === "function"
        && typeof window.WS_APP.getGridPointerSessionReadiness === "function",
      sharedPointerPreviewReady: Boolean(window.WS_APP.getGridPointerSessionReadiness?.().supportsDragPreview),
      sharedAdapterReady: true,
      uiStillUsesLegacyHousingDrag: false,
      housingPlacementPersistenceReady: true,
      sessionOccupancyModelReady: true,
      noOpCommitReady: true,
      fastHousingCommitReady: typeof window.WS_APP.commitCitizenHousingGridPlacement === "function"
    };
    const runtimeBlockers = [];
    if (!checks.housingModelReady) runtimeBlockers.push("HOUSING_GRID_MODEL_API_UNAVAILABLE");
    if (!checks.housingValidatorReady) runtimeBlockers.push("HOUSING_GRID_VALIDATOR_API_UNAVAILABLE");
    if (!checks.housingCommitReady) runtimeBlockers.push("HOUSING_GRID_COMMIT_API_UNAVAILABLE");
    if (!checks.equipmentFootprintReady) runtimeBlockers.push("EQUIPMENT_FOOTPRINT_API_UNAVAILABLE");
    if (!checks.fastHousingCommitReady) runtimeBlockers.push("HOUSING_GRID_FAST_COMMIT_API_UNAVAILABLE");
    const migrationBlockers = [];
    if (!checks.sharedPlacementContextReady) migrationBlockers.push("SHARED_PLACEMENT_CONTEXT_API_UNAVAILABLE");
    if (!checks.sharedPointerSessionReady) migrationBlockers.push("SHARED_POINTER_SESSION_NOT_PUBLIC");
    if (!checks.sharedPointerPreviewReady) migrationBlockers.push("SHARED_POINTER_DRAG_PREVIEW_UNAVAILABLE");
    return {
      version: ADAPTER_VERSION,
      ready: runtimeBlockers.length === 0,
      migrationReady: runtimeBlockers.length === 0 && migrationBlockers.length === 0,
      uiMode: UI_MODE,
      canonicalPersistence: "housingPlacement",
      canonicalCommitApi: "moveEquipmentItemToHousing",
      checks,
      runtimeBlockers,
      migrationBlockers,
      nextMigrationScope: "none; runtime migration installed in patch_housing_grid_engine_unification_4.6x.zip"
    };
  }

  function validateHousingGridEngineParity(item = {}, options = {}) {
    diagnostics.parityChecks += 1;
    const rotation0 = getHousingGridFootprint(item, 0);
    const rotation90 = getHousingGridFootprint(item, 90);
    const baseWidth = clampInteger(item.width ?? item.gridWidth ?? rotation0.width, 1, 99);
    const baseHeight = clampInteger(item.height ?? item.gridHeight ?? rotation0.height, 1, 99);
    const expected0 = { width: baseWidth, height: baseHeight };
    const expected90 = { width: baseHeight, height: baseWidth };
    const checks = {
      rotation0Matches: rotation0.width === expected0.width && rotation0.height === expected0.height,
      rotation90Matches: rotation90.width === expected90.width && rotation90.height === expected90.height,
      slotAreaStable: rotation0.slots === rotation90.slots,
      housingPlacementFieldStable: options.persistenceField ? options.persistenceField === "housingPlacement" : true,
      adapterUsesCanonicalFootprintApi: rotation0.source === "EQUIPMENT_GRID_CORE"
    };
    const blockers = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key);
    return {
      ok: blockers.length === 0,
      code: blockers.length ? "HOUSING_GRID_PARITY_FAILED" : "HOUSING_GRID_PARITY_READY",
      version: ADAPTER_VERSION,
      checks,
      blockers,
      rotation0,
      rotation90
    };
  }

  function getHousingGridEngineDiagnostics() {
    return {
      version: ADAPTER_VERSION,
      uiMode: UI_MODE,
      ...clone(diagnostics),
      readiness: getHousingGridEngineReadiness()
    };
  }

  function resetHousingGridEngineDiagnostics() {
    diagnostics.contextsCreated = 0;
    diagnostics.dropsEvaluated = 0;
    diagnostics.commitsRequested = 0;
    diagnostics.readinessChecks = 0;
    diagnostics.parityChecks = 0;
    diagnostics.lastErrorCode = "";
    diagnostics.lastContext = null;
    diagnostics.lastEvaluation = null;
    diagnostics.lastCommit = null;
    return getHousingGridEngineDiagnostics();
  }

  window.WS_APP.housingGridEngineAdapter = {
    version: ADAPTER_VERSION,
    uiMode: UI_MODE,
    getHousingGridFootprint,
    getHousingGridCellModel,
    createHousingGridDragContext,
    evaluateHousingGridDrop,
    commitHousingGridDrop,
    getHousingGridEngineReadiness,
    validateHousingGridEngineParity,
    getHousingGridEngineDiagnostics,
    resetHousingGridEngineDiagnostics
  };

  Object.assign(window.WS_APP, {
    getHousingGridFootprint,
    getHousingGridCellModel,
    createHousingGridDragContext,
    evaluateHousingGridDrop,
    commitHousingGridDrop,
    getHousingGridEngineReadiness,
    validateHousingGridEngineParity,
    getHousingGridEngineDiagnostics,
    resetHousingGridEngineDiagnostics
  });
})();
