window.WS_APP = window.WS_APP || {};

(function initEquipmentActions() {
  function getEquipmentShellRoot() {
    return document.querySelector("[data-equipment-module-shell]");
  }

  function getActiveEquipmentCitizen(root = getEquipmentShellRoot(), user = window.WS_APP.currentUser) {
    const citizenId = String(root?.dataset?.equipmentCitizenId || "").trim();
    if (citizenId && typeof window.WS_APP.getCitizenById === "function") {
      return window.WS_APP.getCitizenById(citizenId) || null;
    }
    return typeof window.WS_APP.getEquipmentTargetCitizen === "function"
      ? window.WS_APP.getEquipmentTargetCitizen(user)
      : null;
  }

  function rerenderEquipmentShell(user = window.WS_APP.currentUser, options = {}) {
    if (options.full === true || typeof window.WS_APP.refreshEquipmentWorkspace !== "function") {
      window.WS_APP.renderEquipmentModule?.(user);
      return;
    }
    window.WS_APP.refreshEquipmentWorkspace(user, options);
  }

  function getManagedRegionContext() {
    const selections = window.WS_APP.getEquipmentSelectionState?.() || {};
    return String(selections.selectedRegion || selections.inspectorReturnRegion || "").trim().toUpperCase();
  }

  function restoreManagedRegion(regionKey = "") {
    const key = String(regionKey || "").trim().toUpperCase();
    if (!key) return false;
    window.WS_APP.setEquipmentSelectedRegion?.(key);
    return true;
  }

  const EQUIPMENT_ACTIONS_VERSION = "5.4.3x";
  const GRID_DRAG_THRESHOLD = 6;
  const TOOLTIP_DELAY_MS = 300;
  let activeGridDrag = null;
  let suppressGridItemClickUntil = 0;
  let tooltipShowTimer = 0;
  let tooltipTarget = null;
  let tooltipPointerX = 0;
  let tooltipPointerY = 0;

  function getAnimationFrame(callback) {
    const scheduler = window.requestAnimationFrame || ((handler) => window.setTimeout(handler, 16));
    return scheduler(callback);
  }


  function getEquipmentTooltip(root = getEquipmentShellRoot()) {
    return document.querySelector("body > [data-equipment-hover-tooltip]")
      || root?.querySelector?.("[data-equipment-hover-tooltip]")
      || null;
  }

  function mountEquipmentTooltipPortal(root = getEquipmentShellRoot()) {
    if (!root) return null;
    const localTooltip = root.querySelector("[data-equipment-hover-tooltip]");
    const existingPortal = document.querySelector("body > [data-equipment-hover-tooltip]");
    if (existingPortal && existingPortal !== localTooltip) existingPortal.remove();
    if (localTooltip && localTooltip.parentElement !== document.body) document.body.appendChild(localTooltip);
    return localTooltip || existingPortal || null;
  }

  function clearEquipmentTooltipTimer() {
    if (!tooltipShowTimer) return;
    window.clearTimeout(tooltipShowTimer);
    tooltipShowTimer = 0;
  }

  function hideEquipmentTooltip(root = getEquipmentShellRoot()) {
    clearEquipmentTooltipTimer();
    const previousTarget = tooltipTarget;
    tooltipTarget = null;
    previousTarget?.removeAttribute?.("aria-describedby");
    const tooltip = getEquipmentTooltip(root);
    if (!tooltip) return;
    tooltip.hidden = true;
    tooltip.replaceChildren();
    delete tooltip.dataset.equipmentTooltipTone;
    delete tooltip.dataset.equipmentTooltipKind;
  }

  function setEquipmentTooltipAnchor(target = null, event = null) {
    const clientX = Number(event?.clientX);
    const clientY = Number(event?.clientY);
    if (Number.isFinite(clientX) && Number.isFinite(clientY) && (clientX !== 0 || clientY !== 0)) {
      tooltipPointerX = clientX;
      tooltipPointerY = clientY;
      return;
    }
    const rect = target?.getBoundingClientRect?.();
    if (!rect) return;
    tooltipPointerX = Math.min(window.innerWidth - 12, rect.left + Math.min(rect.width, 28));
    tooltipPointerY = Math.min(window.innerHeight - 12, rect.bottom);
  }

  function positionEquipmentTooltip(root = getEquipmentShellRoot()) {
    const tooltip = getEquipmentTooltip(root);
    if (!tooltip || tooltip.hidden) return;
    const offset = 14;
    const viewportPadding = 10;
    const rect = tooltip.getBoundingClientRect();
    const maxLeft = Math.max(viewportPadding, window.innerWidth - rect.width - viewportPadding);
    const maxTop = Math.max(viewportPadding, window.innerHeight - rect.height - viewportPadding);
    const left = Math.min(maxLeft, Math.max(viewportPadding, tooltipPointerX + offset));
    const top = Math.min(maxTop, Math.max(viewportPadding, tooltipPointerY + offset));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function showEquipmentTooltip(root = getEquipmentShellRoot(), target = null) {
    if (!root || !target || activeGridDrag?.started) return;
    const tooltip = getEquipmentTooltip(root);
    if (!tooltip) return;
    const title = String(target.dataset.equipmentTooltipTitle || "").trim();
    const lines = [1, 2, 3]
      .map((index) => String(target.dataset[`equipmentTooltipLine${index}`] || "").trim())
      .filter(Boolean);
    if (!title && !lines.length) return;
    tooltip.replaceChildren();
    tooltip.id = tooltip.id || "equipment-hover-tooltip";
    tooltip.dataset.equipmentTooltipTone = String(target.dataset.equipmentTooltipTone || "default").trim().toLowerCase() || "default";
    tooltip.dataset.equipmentTooltipKind = String(target.dataset.equipmentTooltipKind || "equipment").trim().toLowerCase() || "equipment";
    target.setAttribute("aria-describedby", tooltip.id);
    if (title) {
      const heading = document.createElement("b");
      heading.textContent = title;
      tooltip.appendChild(heading);
    }
    lines.forEach((line) => {
      const row = document.createElement("span");
      row.textContent = line;
      tooltip.appendChild(row);
    });
    tooltip.hidden = false;
    positionEquipmentTooltip(root);
  }

  function scheduleEquipmentTooltip(root = getEquipmentShellRoot(), target = null, event = null) {
    if (!root || !target || activeGridDrag) return;
    if (tooltipTarget && tooltipTarget !== target) hideEquipmentTooltip(root);
    clearEquipmentTooltipTimer();
    tooltipTarget = target;
    setEquipmentTooltipAnchor(target, event);
    tooltipShowTimer = window.setTimeout(() => {
      tooltipShowTimer = 0;
      if (tooltipTarget === target && root.contains(target) && !activeGridDrag) showEquipmentTooltip(root, target);
    }, TOOLTIP_DELAY_MS);
  }

  function makeItemTypeOperationIdempotencyKey(citizenId = "", operationType = "", instanceId = "") {
    const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return `item-type-ui:${String(citizenId || "").trim()}:${String(operationType || "").trim().toLowerCase()}:${String(instanceId || "").trim()}:${random}`;
  }

  function makeItemTypeUiInstanceId(prefix = "item") {
    const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return `${String(prefix || "item").trim().toLowerCase()}-${random}`;
  }

  function readItemTypeOperationField(source = null, name = "") {
    return source?.querySelector?.(`[name="${name}"]`)?.value ?? "";
  }

  function executeItemTypeOperationUi(root = getEquipmentShellRoot(), user = window.WS_APP.currentUser, source = null, operationType = "") {
    const citizenId = String(root?.dataset?.equipmentCitizenId || "").trim();
    const instanceId = String(source?.dataset?.itemTypeOperationInstance || source?.closest?.("[data-item-type-operation-instance]")?.dataset?.itemTypeOperationInstance || "").trim();
    const operation = String(operationType || source?.dataset?.itemTypeOperationForm || source?.dataset?.itemTypeOperationButton || "").trim().toUpperCase();
    if (!citizenId || !instanceId || !operation) return { ok: false, reason: "ITEM_TYPE_OPERATION_UI_CONTEXT_REQUIRED" };
    const common = { citizenId, idempotencyKey: makeItemTypeOperationIdempotencyKey(citizenId, operation, instanceId) };
    let result = { ok: false, reason: "ITEM_TYPE_OPERATION_UI_UNSUPPORTED" };

    if (operation === "MAGAZINE_LOAD") {
      result = window.WS_APP.loadMagazine?.({
        ...common,
        magazineInstanceId: instanceId,
        ammunitionInstanceId: String(readItemTypeOperationField(source, "ammunitionInstanceId") || "").trim(),
        rounds: Number(readItemTypeOperationField(source, "rounds") || 1)
      }) || result;
    } else if (operation === "MAGAZINE_UNLOAD") {
      const target = String(readItemTypeOperationField(source, "targetAmmunitionInstanceId") || "").trim();
      result = window.WS_APP.unloadMagazine?.({
        ...common,
        magazineInstanceId: instanceId,
        rounds: Number(readItemTypeOperationField(source, "rounds") || 1),
        targetAmmunitionInstanceId: target && target !== "__NEW__" ? target : "",
        newAmmunitionInstanceId: target === "__NEW__" ? makeItemTypeUiInstanceId("ammo") : "",
        returnLocation: { type: "UNPLACED", characterId: citizenId }
      }) || result;
    } else if (operation === "FIREARM_INSERT_MAGAZINE") {
      result = window.WS_APP.insertFirearmMagazine?.({ ...common, firearmInstanceId: instanceId, magazineInstanceId: String(readItemTypeOperationField(source, "magazineInstanceId") || "").trim() }) || result;
    } else if (operation === "FIREARM_REMOVE_MAGAZINE") {
      result = window.WS_APP.removeFirearmMagazine?.({ ...common, firearmInstanceId: instanceId, returnLocation: { type: "UNPLACED", characterId: citizenId } }) || result;
    } else if (operation === "FIREARM_CHAMBER") {
      result = window.WS_APP.chamberFirearmRound?.({ ...common, firearmInstanceId: instanceId, rounds: 1 }) || result;
    } else if (operation === "FIREARM_CLEAR_CHAMBER") {
      result = window.WS_APP.clearFirearmChamber?.({ ...common, firearmInstanceId: instanceId, discardEjectedRounds: source?.dataset?.itemTypeOperationDiscard === "true" }) || result;
    } else if (operation === "FIREARM_SET_SAFETY") {
      result = window.WS_APP.setFirearmSafety?.({ ...common, firearmInstanceId: instanceId, safety: source?.dataset?.itemTypeOperationValue || "" }) || result;
    } else if (operation === "FIREARM_SET_FIRE_MODE") {
      result = window.WS_APP.setFirearmFireMode?.({ ...common, firearmInstanceId: instanceId, fireMode: source?.dataset?.itemTypeOperationValue || "" }) || result;
    } else if (operation === "GRENADE_ARM") {
      result = window.WS_APP.armGrenade?.({
        ...common,
        grenadeInstanceId: instanceId,
        triggerMode: readItemTypeOperationField(source, "triggerMode"),
        fuseSeconds: Number(readItemTypeOperationField(source, "fuseSeconds") || 0)
      }) || result;
    } else if (operation === "GRENADE_DISARM") {
      result = window.WS_APP.disarmGrenade?.({ ...common, grenadeInstanceId: instanceId }) || result;
    } else if (operation === "CONSUMABLE_USE") {
      result = window.WS_APP.useConsumable?.({ ...common, instanceId, units: Number(readItemTypeOperationField(source, "units") || 1), usageSource: "EQUIPMENT" }) || result;
    }

    window.WS_APP.setItemTypeOperationsUiFeedback?.(citizenId, instanceId, result, operation);
    if (result?.ok && result?.result?.itemRemoved) window.WS_APP.clearEquipmentSelectedItem?.();
    else window.WS_APP.setEquipmentSelectedItem?.(instanceId);
    rerenderEquipmentShell(user, { bodymap: false, storage: true, inspector: true, index: true });
    return result;
  }

  function applyEquipmentItemIndexFilters(root = getEquipmentShellRoot()) {
    const drawer = root?.querySelector?.("[data-equipment-item-index-drawer]");
    if (!drawer) return;
    const queryInput = drawer.querySelector("[data-equipment-item-index-search]");
    const categorySelect = drawer.querySelector("[data-equipment-item-index-category]");
    const query = String(queryInput?.value || "").trim().toLowerCase();
    const category = String(categorySelect?.value || "ALL").trim().toUpperCase() || "ALL";
    let visibleCount = 0;
    drawer.querySelectorAll("[data-equipment-item-index-row]").forEach((row) => {
      const matchesQuery = !query || String(row.dataset.equipmentItemIndexKeywords || "").includes(query);
      const matchesCategory = category === "ALL" || String(row.dataset.equipmentItemIndexCategory || "") === category;
      row.hidden = !(matchesQuery && matchesCategory);
      if (!row.hidden) visibleCount += 1;
    });
    drawer.querySelectorAll("[data-equipment-item-index-section]").forEach((section) => {
      const hasVisibleRows = [...section.querySelectorAll("[data-equipment-item-index-row]")].some((row) => !row.hidden);
      section.hidden = !hasVisibleRows;
    });
    const empty = drawer.querySelector("[data-equipment-item-index-empty]");
    if (empty) empty.hidden = visibleCount !== 0;
  }

  function getGridDragGrids(session = activeGridDrag) {
    if (!session) return [];
    const root = session.root || getEquipmentShellRoot();
    return root ? [...root.querySelectorAll("[data-equipment-container-grid]")] : (session.grid ? [session.grid] : []);
  }

  function parseResolvedGridTracks(value = "", count = 1, fallbackSize = 1) {
    const resolved = String(value || "").match(/-?\d*\.?\d+px/g) || [];
    const sizes = resolved.map((entry) => Math.max(1, Number.parseFloat(entry) || 0));
    if (sizes.length === count) return sizes;
    return Array.from({ length: Math.max(1, count) }, () => Math.max(1, Number(fallbackSize || 1)));
  }

  function buildGridAxisRanges(origin = 0, sizes = [], gap = 0) {
    let cursor = Number(origin || 0);
    return sizes.map((size, index) => {
      const start = cursor;
      const end = start + Number(size || 0);
      cursor = end + (index < sizes.length - 1 ? Number(gap || 0) : 0);
      return { start, end, center: start + (Number(size || 0) / 2) };
    });
  }

  function findGridTrackAtPoint(ranges = [], coordinate = 0) {
    if (!ranges.length) return 0;
    for (let index = 0; index < ranges.length; index += 1) {
      const range = ranges[index];
      if (coordinate >= range.start && coordinate <= range.end) return index + 1;
    }
    return 0;
  }

  function getRetainedGridCellHit(session = activeGridDrag, model = null) {
    const cell = session?.hoveredCell || null;
    if (!cell || !model?.grid || cell.closest?.('[data-equipment-container-grid]') !== model.grid) return null;
    const column = Number(cell.dataset.equipmentGridColumn || 0);
    const row = Number(cell.dataset.equipmentGridRow || 0);
    if (column < 1 || row < 1) return null;
    return { cell, model, column, row, retainOnly: true };
  }

  function createGridDragModel(session = activeGridDrag, grid = null) {
    if (!session || !grid) return null;
    const rect = grid.getBoundingClientRect();
    const style = window.getComputedStyle?.(grid) || {};
    const columns = Math.max(1, Number(grid.dataset.equipmentGridColumns || 1));
    const rows = Math.max(1, Number(grid.dataset.equipmentGridRows || 1));
    const columnGap = Number.parseFloat(style.columnGap || style.gap || 0) || 0;
    const rowGap = Number.parseFloat(style.rowGap || style.gap || 0) || 0;
    const borderLeft = Number.parseFloat(style.borderLeftWidth || 0) || 0;
    const borderRight = Number.parseFloat(style.borderRightWidth || 0) || 0;
    const borderTop = Number.parseFloat(style.borderTopWidth || 0) || 0;
    const borderBottom = Number.parseFloat(style.borderBottomWidth || 0) || 0;
    const paddingLeft = Number.parseFloat(style.paddingLeft || 0) || 0;
    const paddingRight = Number.parseFloat(style.paddingRight || 0) || 0;
    const paddingTop = Number.parseFloat(style.paddingTop || 0) || 0;
    const paddingBottom = Number.parseFloat(style.paddingBottom || 0) || 0;
    const availableWidth = Math.max(1, rect.width - borderLeft - borderRight - paddingLeft - paddingRight - (columnGap * Math.max(0, columns - 1)));
    const availableHeight = Math.max(1, rect.height - borderTop - borderBottom - paddingTop - paddingBottom - (rowGap * Math.max(0, rows - 1)));
    const columnSizes = parseResolvedGridTracks(style.gridTemplateColumns, columns, availableWidth / columns);
    const rowSizes = parseResolvedGridTracks(style.gridTemplateRows, rows, availableHeight / rows);
    const contentLeft = rect.left + borderLeft + paddingLeft;
    const contentTop = rect.top + borderTop + paddingTop;
    const cellMap = new Map();
    grid.querySelectorAll("[data-equipment-grid-cell]").forEach((cell) => {
      if (cell.classList.contains("is-inactive")) return;
      const column = Number(cell.dataset.equipmentGridColumn || 0);
      const row = Number(cell.dataset.equipmentGridRow || 0);
      if (column > 0 && row > 0) cellMap.set(`${column}:${row}`, cell);
    });
    return {
      grid,
      rect,
      columns,
      rows,
      columnRanges: buildGridAxisRanges(contentLeft, columnSizes, columnGap),
      rowRanges: buildGridAxisRanges(contentTop, rowSizes, rowGap),
      cellMap,
      containerId: String(grid.dataset.equipmentContainerGrid || "").trim(),
      placementContext: null,
      placementContextResolved: false
    };
  }

  function getOrCreateGridDragModel(session = activeGridDrag, grid = null) {
    if (!session || !grid) return null;
    session.gridDragModels = Array.isArray(session.gridDragModels) ? session.gridDragModels : [];
    session.gridModelByElement = session.gridModelByElement instanceof Map ? session.gridModelByElement : new Map();
    const existing = session.gridModelByElement.get(grid);
    if (existing) return existing;
    const model = createGridDragModel(session, grid);
    if (!model) return null;
    session.gridDragModels.push(model);
    session.gridModelByElement.set(grid, model);
    return model;
  }

  function getGridPlacementContext(session = activeGridDrag, model = null) {
    if (!session || !model) return null;
    if (model.placementContextResolved) return model.placementContext;
    model.placementContextResolved = true;
    model.placementContext = typeof window.WS_APP.createEquipmentGridDragPlacementContext === "function"
      ? window.WS_APP.createEquipmentGridDragPlacementContext(session.state, session.itemId, model.containerId, session.rotation)
      : null;
    return model.placementContext;
  }

  function removeGridDragVisuals(session = activeGridDrag) {
    if (!session) return;
    session.root?.classList?.remove("is-grid-dragging");
    getGridDragGrids(session).forEach((grid) => grid.classList.remove("is-drag-active"));
    session.source?.classList.remove("is-drag-source");
    session.source?.setAttribute?.("aria-grabbed", "false");
    session.hoveredCell?.classList?.remove("is-drag-hovered-cell");
    session.hoveredCell = null;
    session.preview?.remove();
    session.preview = null;
    session.gridDragModels = null;
    session.gridModelByElement = null;
  }

  function detachGridDragListeners() {
    document.removeEventListener("pointermove", handleEquipmentGridPointerMove);
    document.removeEventListener("pointerup", handleEquipmentGridPointerUp);
    document.removeEventListener("pointercancel", handleEquipmentGridPointerCancel);
    window.removeEventListener("blur", handleEquipmentGridWindowBlur);
  }

  function resetActiveGridDrag() {
    const session = activeGridDrag;
    if (!session) return;
    removeGridDragVisuals(session);
    try {
      if (session.source?.hasPointerCapture?.(session.pointerId)) session.source.releasePointerCapture(session.pointerId);
    } catch (error) {
      // Pointer capture may already be released by the browser.
    }
    detachGridDragListeners();
    activeGridDrag = null;
  }

  function createGridDragVisuals(session = activeGridDrag) {
    if (!session || session.preview) return;
    const sourceRect = session.sourceRect || session.source.getBoundingClientRect();
    const preview = document.createElement("div");
    preview.className = "equipment-grid-drag-preview";
    preview.innerHTML = session.source.innerHTML;
    preview.style.width = `${Math.max(72, Math.min(sourceRect.width, 220))}px`;
    preview.style.height = `${Math.max(42, Math.min(sourceRect.height, 140))}px`;
    preview.setAttribute("aria-hidden", "true");
    document.body.appendChild(preview);

    session.preview = preview;
    session.source.classList.add("is-drag-source");
    session.source.setAttribute("aria-grabbed", "true");
    session.root?.classList?.add("is-grid-dragging");
    getGridDragGrids(session).forEach((grid) => grid.classList.add("is-drag-active"));
  }

  function getGridCellAtPoint(session = activeGridDrag, clientX = 0, clientY = 0) {
    const directTarget = typeof document.elementFromPoint === "function"
      ? document.elementFromPoint(clientX, clientY)
      : null;
    const directCell = directTarget?.closest?.("[data-equipment-grid-cell]") || null;
    const directGrid = directCell?.closest?.("[data-equipment-container-grid]")
      || directTarget?.closest?.("[data-equipment-container-grid]")
      || null;
    if (!directGrid || !session?.root?.contains?.(directGrid)) return null;
    const model = getOrCreateGridDragModel(session, directGrid);
    if (!model) return null;

    if (directCell && !directCell.classList.contains("is-inactive")) {
      const column = Number(directCell.dataset.equipmentGridColumn || 0);
      const row = Number(directCell.dataset.equipmentGridRow || 0);
      if (column > 0 && row > 0) return { cell: directCell, model, column, row, dropEligible: true };
    }

    const retained = getRetainedGridCellHit(session, model);
    return retained ? { ...retained, dropEligible: false } : null;
  }

  function setGridDragHoveredCell(session = activeGridDrag, cell = null) {
    if (!session) return;
    if (session.hoveredCell && session.hoveredCell !== cell) {
      session.hoveredCell.classList.remove("is-drag-hovered-cell");
    }
    session.hoveredCell = cell || null;
    session.hoveredCell?.classList?.add("is-drag-hovered-cell");
  }


  function getEquipmentGridGrabOffset(session = activeGridDrag, sourceRect = null) {
    const footprint = session?.footprint || { width: 1, height: 1 };
    const width = Math.max(1, Number(footprint.width || 1));
    const height = Math.max(1, Number(footprint.height || 1));
    const rect = sourceRect || session?.source?.getBoundingClientRect?.() || { left: 0, top: 0, width: 1, height: 1 };
    const relativeX = Math.max(0, Math.min(Math.max(0, rect.width - 0.01), Number(session?.originX || 0) - rect.left));
    const relativeY = Math.max(0, Math.min(Math.max(0, rect.height - 0.01), Number(session?.originY || 0) - rect.top));
    return {
      column: Math.max(0, Math.min(width - 1, Math.floor(relativeX / Math.max(1, rect.width / width)))),
      row: Math.max(0, Math.min(height - 1, Math.floor(relativeY / Math.max(1, rect.height / height))))
    };
  }

  function prepareGridDragSession(session = activeGridDrag) {
    if (!session || session.prepared) return Boolean(session?.prepared);
    const cachedState = typeof window.WS_APP.getEquipmentRuntimeState === "function"
      ? window.WS_APP.getEquipmentRuntimeState(session.citizen)
      : null;
    const state = cachedState || (session.citizen && typeof window.WS_APP.getEquipmentState === "function"
      ? window.WS_APP.getEquipmentState(session.citizen)
      : null);
    const item = state?.itemById?.[session.itemId] || null;
    if (!state || !item) return false;
    session.state = state;
    session.item = item;
    session.rotation = Number(session.source?.dataset?.equipmentGridRotation || 0) === 90 ? 90 : 0;
    session.footprint = typeof window.WS_APP.getEquipmentItemGridFootprint === "function"
      ? window.WS_APP.getEquipmentItemGridFootprint(item, session.rotation)
      : {
        width: Math.max(1, Number(session.source?.dataset?.equipmentGridWidth || item.width || 1)),
        height: Math.max(1, Number(session.source?.dataset?.equipmentGridHeight || item.height || 1)),
        rotation: session.rotation
      };
    const sourceRect = session.source.getBoundingClientRect();
    session.sourceRect = sourceRect;
    session.previewOffsetX = Math.max(0, Math.min(sourceRect.width - 0.01, session.originX - sourceRect.left));
    session.previewOffsetY = Math.max(0, Math.min(sourceRect.height - 0.01, session.originY - sourceRect.top));
    const grabOffset = getEquipmentGridGrabOffset(session, sourceRect);
    session.grabOffsetColumn = grabOffset.column;
    session.grabOffsetRow = grabOffset.row;
    session.prepared = true;
    return true;
  }

  function updateGridDragFrame(session = activeGridDrag) {
    if (!session || session !== activeGridDrag || !session.started) return;
    session.framePending = false;
    const clientX = Number(session.latestX || 0);
    const clientY = Number(session.latestY || 0);
    if (session.preview) {
      const previewX = clientX - Number(session.previewOffsetX || 0);
      const previewY = clientY - Number(session.previewOffsetY || 0);
      session.preview.style.transform = `translate3d(${previewX}px, ${previewY}px, 0)`;
    }

    const hit = getGridCellAtPoint(session, clientX, clientY);
    const cell = hit?.cell || null;
    if (!cell || cell.classList.contains("is-inactive")) {
      setGridDragHoveredCell(session, null);
      session.validation = null;
      session.targetGrid = null;
      session.targetContainerId = "";
      session.lastValidationKey = "";
      session.dropEligible = false;
      return;
    }

    setGridDragHoveredCell(session, cell);
    if (hit.retainOnly) {
      session.dropEligible = false;
      return;
    }
    session.dropEligible = hit.dropEligible !== false;
    const targetGrid = hit.model.grid;
    const targetContainerId = String(hit.model.containerId || "").trim();
    session.targetGrid = targetGrid;
    session.targetContainerId = targetContainerId;
    const hoveredColumn = Number(hit.column || 0);
    const hoveredRow = Number(hit.row || 0);
    const column = hoveredColumn - Number(session.grabOffsetColumn || 0);
    const row = hoveredRow - Number(session.grabOffsetRow || 0);
    const footprint = session.footprint || { width: 1, height: 1, rotation: session.rotation || 0 };
    const validationKey = `${targetContainerId}|${column}|${row}|${session.rotation}`;
    if (session.lastValidationKey === validationKey) return;
    session.lastValidationKey = validationKey;
    const cachedValidation = session.validationCache?.get(validationKey);
    const validation = cachedValidation || (column < 1 || row < 1
      ? { ok: false, code: "OUT_OF_BOUNDS", details: { footprint } }
      : typeof window.WS_APP.evaluateEquipmentGridDragPlacementContext === "function"
        ? window.WS_APP.evaluateEquipmentGridDragPlacementContext(getGridPlacementContext(session, hit.model), column, row)
        : { ok: false, code: "VALIDATOR_UNAVAILABLE", details: { footprint } });
    session.validationCache?.set(validationKey, validation);
    session.validation = validation;
    session.targetColumn = column;
    session.targetRow = row;
  }

  function beginGridDrag(session = activeGridDrag, event = null) {
    if (!session || session.started) return;
    hideEquipmentTooltip(session.root);
    if (!prepareGridDragSession(session)) {
      resetActiveGridDrag();
      return;
    }
    session.started = true;
    createGridDragVisuals(session);
    if (event) {
      session.latestX = event.clientX;
      session.latestY = event.clientY;
    }
    updateGridDragFrame(session);
  }

  function handleEquipmentGridPointerMove(event) {
    const session = activeGridDrag;
    if (!session || event.pointerId !== session.pointerId) return;
    const distance = Math.hypot(event.clientX - session.originX, event.clientY - session.originY);
    if (!session.started && distance < GRID_DRAG_THRESHOLD) return;
    if (!session.started) {
      beginGridDrag(session, event);
      if (activeGridDrag !== session || !session.started) return;
    }
    event.preventDefault();
    session.latestX = event.clientX;
    session.latestY = event.clientY;
    if (!session.framePending) {
      session.framePending = true;
      getAnimationFrame(() => updateGridDragFrame(session));
    }
  }

  function patchEquipmentRuntimePlacement(session = activeGridDrag, placement = {}) {
    const state = session?.state || null;
    const item = state?.itemById?.[session?.itemId] || null;
    if (!item) return false;
    const nextPlacement = {
      containerId: String(placement.containerId || session.containerId || "").trim(),
      column: Math.max(1, Number(placement.column || 1)),
      row: Math.max(1, Number(placement.row || 1)),
      rotation: Number(placement.rotation || 0) === 90 ? 90 : 0
    };
    item.containerHostId = nextPlacement.containerId;
    item.containerPlacement = nextPlacement;
    item.location = "CONTAINER";
    return true;
  }

  function syncEquipmentGridCellUsage(grid = null) {
    if (!grid) return;
    const occupied = new Set();
    grid.querySelectorAll("[data-equipment-grid-drag-item]").forEach((itemNode) => {
      const column = Math.max(1, Number(itemNode.dataset.equipmentGridColumn || 1));
      const row = Math.max(1, Number(itemNode.dataset.equipmentGridRow || 1));
      const width = Math.max(1, Number(itemNode.dataset.equipmentGridWidth || 1));
      const height = Math.max(1, Number(itemNode.dataset.equipmentGridHeight || 1));
      for (let y = row; y < row + height; y += 1) {
        for (let x = column; x < column + width; x += 1) occupied.add(`${x}:${y}`);
      }
    });
    grid.querySelectorAll("[data-equipment-grid-cell]").forEach((cell) => {
      const key = `${Number(cell.dataset.equipmentGridColumn || 0)}:${Number(cell.dataset.equipmentGridRow || 0)}`;
      cell.classList.toggle("is-used", occupied.has(key));
    });
  }

  function applySameGridPlacementToDom(session = activeGridDrag, placement = {}, footprint = {}) {
    const source = session?.source || null;
    const grid = session?.grid || null;
    if (!source || !grid) return false;
    const column = Math.max(1, Number(placement.column || 1));
    const row = Math.max(1, Number(placement.row || 1));
    const width = Math.max(1, Number(footprint.width || session?.footprint?.width || 1));
    const height = Math.max(1, Number(footprint.height || session?.footprint?.height || 1));
    const rotation = Number(placement.rotation ?? session?.rotation ?? 0) === 90 ? 90 : 0;
    source.dataset.equipmentGridColumn = String(column);
    source.dataset.equipmentGridRow = String(row);
    source.dataset.equipmentGridWidth = String(width);
    source.dataset.equipmentGridHeight = String(height);
    source.dataset.equipmentGridRotation = String(rotation);
    source.style.gridColumn = `${column} / span ${width}`;
    source.style.gridRow = `${row} / span ${height}`;
    syncEquipmentGridCellUsage(grid);
    return true;
  }

  function completeEquipmentGridDrag(event, cancelled = false) {
    const session = activeGridDrag;
    if (!session || (event?.pointerId != null && event.pointerId !== session.pointerId)) return;
    const wasStarted = session.started;
    const validation = session.validation;
    if (wasStarted) {
      event?.preventDefault?.();
      suppressGridItemClickUntil = Date.now() + 450;
    }

    const placement = validation?.details?.placement || {};
    const targetContainerId = String(placement.containerId || session.targetContainerId || session.containerId || "").trim();
    const sameGridPlacement = !cancelled
      && wasStarted
      && session.dropEligible !== false
      && validation?.ok
      && targetContainerId === session.containerId;
    const sameGridNoop = sameGridPlacement
      && Number(session.source?.dataset?.equipmentGridColumn || 0) === Number(placement.column || session.targetColumn || 0)
      && Number(session.source?.dataset?.equipmentGridRow || 0) === Number(placement.row || session.targetRow || 0)
      && Number(session.source?.dataset?.equipmentGridRotation || 0) === Number(placement.rotation ?? session.rotation ?? 0);

    if (sameGridNoop) {
      resetActiveGridDrag();
      return;
    }

    let result = null;
    if (sameGridPlacement) {
      result = window.WS_APP.commitEquipmentGridDragPlacement?.(session.citizen, session.itemId, {
        containerId: targetContainerId,
        column: placement.column || session.targetColumn || 1,
        row: placement.row || session.targetRow || 1,
        rotation: placement.rotation ?? session.rotation
      });
      if (result?.ok) {
        const committedPlacement = result.placement || result.details?.placement || placement;
        patchEquipmentRuntimePlacement(session, committedPlacement);
        applySameGridPlacementToDom(session, committedPlacement, validation.details?.footprint || session.footprint || {});
      }
    } else if (!cancelled && wasStarted && session.dropEligible !== false && validation?.ok) {
      result = window.WS_APP.transferEquipmentItemBetweenContainers?.(
        session.citizen,
        session.itemId,
        targetContainerId,
        placement.column || session.targetColumn || 1,
        placement.row || session.targetRow || 1,
        placement.rotation ?? session.rotation
      );
    }

    const user = session.user;
    const itemId = session.itemId;
    const containerId = session.containerId;
    const movedItem = session.state?.itemById?.[itemId] || null;
    resetActiveGridDrag();

    if (result?.ok && !sameGridPlacement) {
      const targetId = String(result.containerId || result.details?.targetContainerId || containerId || "").trim();
      window.WS_APP.setEquipmentSelectedContainerItem?.(result.itemId || itemId, targetId);
      rerenderEquipmentShell(user, {
        citizen: result?.citizen || null,
        bodymap: false,
        storage: true,
        storageFull: movedItem?.isContainer === true,
        storageContainerIds: movedItem?.isContainer ? [] : [containerId, targetId],
        inspector: true,
        index: true
      });
    }
  }

  function handleEquipmentGridPointerUp(event) {
    completeEquipmentGridDrag(event, false);
  }

  function handleEquipmentGridPointerCancel(event) {
    completeEquipmentGridDrag(event, true);
  }

  function handleEquipmentGridWindowBlur() {
    completeEquipmentGridDrag(null, true);
  }

  function handleEquipmentGridPointerDown(event, user = window.WS_APP.currentUser) {
    if (event.isPrimary === false || event.button !== 0 || activeGridDrag) return;
    const source = event.target.closest?.("[data-equipment-grid-drag-item][data-equipment-container-id]");
    if (!source || source.disabled) return;
    const grid = source.closest("[data-equipment-container-grid]");
    if (!grid) return;
    const root = getEquipmentShellRoot();
    const citizen = getActiveEquipmentCitizen(root, user);
    const itemId = String(source.dataset.equipmentGridDragItem || "").trim();
    const containerId = String(source.dataset.equipmentContainerId || "").trim();
    if (!citizen || !itemId || !containerId) return;

    activeGridDrag = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      latestX: event.clientX,
      latestY: event.clientY,
      itemId,
      containerId,
      source,
      grid,
      root,
      targetGrid: grid,
      targetContainerId: containerId,
      citizen,
      state: null,
      item: null,
      user,
      started: false,
      prepared: false,
      framePending: false,
      validation: null,
      dropEligible: false,
      preview: null,
      hoveredCell: null,
      gridDragModels: null,
      gridModelByElement: null,
      validationCache: new Map(),
      lastValidationKey: ""
    };

    try {
      source.setPointerCapture?.(event.pointerId);
    } catch (error) {
      // Pointer capture is optional; document listeners remain canonical.
    }
    document.addEventListener("pointermove", handleEquipmentGridPointerMove, { passive: false });
    document.addEventListener("pointerup", handleEquipmentGridPointerUp);
    document.addEventListener("pointercancel", handleEquipmentGridPointerCancel);
    window.addEventListener("blur", handleEquipmentGridWindowBlur);
  }

  function bindEquipmentShellActions(user = window.WS_APP.currentUser) {
    resetActiveGridDrag();
    const root = getEquipmentShellRoot();
    if (!root) return;

    mountEquipmentTooltipPortal(root);
    hideEquipmentTooltip(root);

    const targetSelect = root.querySelector("[data-equipment-target-select]");
    if (targetSelect) {
      targetSelect.addEventListener("change", (event) => {
        window.WS_APP.equipmentTargetCitizenId = String(event.target.value || "").trim();
        window.WS_APP.clearEquipmentSelection?.();
        rerenderEquipmentShell(user, { full: true });
      });
    }

    root.addEventListener("change", (event) => {
      hideEquipmentTooltip(root);
      const actionSelect = event.target.closest?.("[data-equipment-unequip-target-select], [data-equipment-equip-target], [data-equipment-stow-target-select], [data-equipment-draw-target-select]");
      if (actionSelect) {
        event.stopPropagation();
        return;
      }
      const citizenId = String(root.dataset.equipmentCitizenId || "").trim();
      const itemIndexCategory = event.target.closest?.("[data-equipment-item-index-category]");
      if (!itemIndexCategory) return;
      window.WS_APP.setEquipmentItemIndexCategory?.(citizenId, itemIndexCategory.value || "ALL");
      applyEquipmentItemIndexFilters(root);
    });

    root.addEventListener("input", (event) => {
      const citizenId = String(root.dataset.equipmentCitizenId || "").trim();
      const searchInput = event.target.closest?.("[data-equipment-item-index-search]");
      if (!searchInput) return;
      window.WS_APP.setEquipmentItemIndexQuery?.(citizenId, searchInput.value || "");
      applyEquipmentItemIndexFilters(root);
    });

    root.addEventListener("submit", (event) => {
      const itemTypeForm = event.target.closest?.("[data-item-type-operation-form]");
      if (itemTypeForm && root.contains(itemTypeForm)) {
        event.preventDefault();
        event.stopPropagation();
        executeItemTypeOperationUi(root, user, itemTypeForm, itemTypeForm.dataset.itemTypeOperationForm || "");
        return;
      }
      const form = event.target.closest?.("[data-item-instance-rename-form]");
      if (!form || !root.contains(form)) return;
      event.preventDefault();
      event.stopPropagation();
      const citizenId = String(root.dataset.equipmentCitizenId || "").trim();
      const instanceId = String(form.dataset.itemInstanceRenameForm || "").trim();
      const input = form.querySelector("[data-item-instance-player-label]");
      const feedback = form.querySelector("[data-item-instance-rename-feedback]");
      const result = window.WS_APP.renameItemInstance?.(citizenId, instanceId, input?.value || "", {
        source: "PLAYER_ITEM_RENAME",
        skipCitizenEvent: true,
        skipModuleRefresh: true,
        skipProfileRefresh: true
      });
      if (!result?.ok) {
        if (feedback) {
          feedback.textContent = `RENAME FAILED · ${String(result?.reason || "UNKNOWN")}`;
          feedback.dataset.tone = "error";
        }
        return;
      }
      window.WS_APP.setEquipmentSelectedItem?.(instanceId);
      rerenderEquipmentShell(user);
    });

    root.addEventListener("pointerover", (event) => {
      const target = event.target.closest?.("[data-equipment-tooltip]");
      if (!target || !root.contains(target) || target === tooltipTarget) return;
      scheduleEquipmentTooltip(root, target, event);
    });

    root.addEventListener("pointermove", (event) => {
      tooltipPointerX = event.clientX;
      tooltipPointerY = event.clientY;
      if (activeGridDrag) return;
      if (tooltipTarget) positionEquipmentTooltip(root);
    });

    root.addEventListener("pointerout", (event) => {
      const target = event.target.closest?.("[data-equipment-tooltip]");
      if (!target || target !== tooltipTarget) return;
      if (event.relatedTarget && target.contains(event.relatedTarget)) return;
      hideEquipmentTooltip(root);
    });

    root.addEventListener("focusin", (event) => {
      const target = event.target.closest?.("[data-equipment-tooltip]");
      if (!target || !root.contains(target) || target === tooltipTarget) return;
      scheduleEquipmentTooltip(root, target, event);
    });

    root.addEventListener("focusout", (event) => {
      const target = event.target.closest?.("[data-equipment-tooltip]");
      if (!target || target !== tooltipTarget) return;
      if (event.relatedTarget && target.contains(event.relatedTarget)) return;
      hideEquipmentTooltip(root);
    });

    root.addEventListener("scroll", () => hideEquipmentTooltip(root), true);

    root.addEventListener("pointerdown", (event) => {
      hideEquipmentTooltip(root);
      handleEquipmentGridPointerDown(event, user);
    });
    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hideEquipmentTooltip(root);
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target.closest?.("button, input, select, textarea, a")) return;
      const selectableItem = event.target.closest?.('[data-equipment-select-item][role="button"]');
      if (!selectableItem || !root.contains(selectableItem)) return;
      event.preventDefault();
      selectableItem.click();
    });
    applyEquipmentItemIndexFilters(root);

    root.addEventListener("click", (event) => {
      hideEquipmentTooltip(root);
      if (Date.now() < suppressGridItemClickUntil && event.target.closest("[data-equipment-grid-drag-item]")) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const citizenId = String(root.dataset.equipmentCitizenId || "").trim();

      const nestedInteractiveControl = event.target.closest("select, option, input, textarea, label");
      if (nestedInteractiveControl && nestedInteractiveControl.closest("[data-equipment-select-item], [data-equipment-region-layer], [data-equipment-body-mount], [data-equipment-item-mount]")) {
        event.stopPropagation();
        return;
      }

      const itemTypeOperationButton = event.target.closest("[data-item-type-operation-button]");
      if (itemTypeOperationButton && !itemTypeOperationButton.disabled) {
        event.preventDefault();
        executeItemTypeOperationUi(root, user, itemTypeOperationButton, itemTypeOperationButton.dataset.itemTypeOperationButton || "");
        return;
      }

      const renameToggle = event.target.closest("[data-item-instance-rename-toggle]");
      if (renameToggle && !renameToggle.disabled) {
        event.preventDefault();
        const disclosure = renameToggle.closest("[data-item-instance-rename-disclosure]");
        const form = disclosure?.querySelector?.("[data-item-instance-rename-form]") || null;
        if (form) {
          renameToggle.hidden = true;
          renameToggle.setAttribute("aria-expanded", "true");
          form.hidden = false;
          const input = form.querySelector("[data-item-instance-player-label]");
          window.requestAnimationFrame?.(() => {
            input?.focus?.();
            input?.select?.();
          });
        }
        return;
      }

      const renameClear = event.target.closest("[data-item-instance-rename-clear]");
      if (renameClear && !renameClear.disabled) {
        event.preventDefault();
        const result = window.WS_APP.renameItemInstance?.(citizenId, renameClear.dataset.itemInstanceRenameClear || "", "", {
          source: "PLAYER_ITEM_RENAME_CLEAR",
          skipCitizenEvent: true,
          skipModuleRefresh: true,
          skipProfileRefresh: true
        });
        if (result?.ok) rerenderEquipmentShell(user);
        return;
      }

      const itemIndexToggle = event.target.closest("[data-equipment-item-index-toggle]");
      if (itemIndexToggle && !itemIndexToggle.disabled) {
        event.preventDefault();
        window.WS_APP.toggleEquipmentItemIndex?.(citizenId);
        rerenderEquipmentShell(user, { bodymap: false, storage: false, inspector: false, index: true });
        return;
      }

      const itemIndexClose = event.target.closest("[data-equipment-item-index-close]");
      if (itemIndexClose) {
        event.preventDefault();
        window.WS_APP.setEquipmentItemIndexOpen?.(citizenId, false);
        rerenderEquipmentShell(user, { bodymap: false, storage: false, inspector: false, index: true });
        return;
      }

      const itemIndexLocate = event.target.closest("[data-equipment-item-index-locate]");
      if (itemIndexLocate && !itemIndexLocate.disabled) {
        event.preventDefault();
        const citizen = getActiveEquipmentCitizen(root, user);
        window.WS_APP.locateEquipmentItem?.(citizen, itemIndexLocate.dataset.equipmentItemIndexLocate || "");
        rerenderEquipmentShell(user);
        return;
      }

      const itemIndexSelect = event.target.closest("[data-equipment-item-index-select]");
      if (itemIndexSelect && !itemIndexSelect.disabled) {
        event.preventDefault();
        const itemId = itemIndexSelect.dataset.equipmentItemIndexSelect || "";
        const result = window.WS_APP.selectEquipmentItemFastPath?.(itemId, { root, citizenId });
        window.WS_APP.setEquipmentItemIndexOpen?.(citizenId, false);
        const cachedState = window.WS_APP.getEquipmentRuntimeState?.(citizenId);
        if (cachedState?.selections) cachedState.selections.itemIndexOpen = false;
        root.querySelector("[data-equipment-item-index-overlay]")?.remove();
        if (!result?.ok) {
          window.WS_APP.setEquipmentSelectedItem?.(itemId);
          rerenderEquipmentShell(user);
        }
        return;
      }

      const equipSelectedButton = event.target.closest("[data-equipment-equip-selected]");
      if (equipSelectedButton && !equipSelectedButton.disabled) {
        event.preventDefault();
        const itemId = equipSelectedButton.dataset.equipmentEquipSelected || "";
        const select = [...root.querySelectorAll("[data-equipment-equip-target]")]
          .find((candidate) => String(candidate.dataset.equipmentEquipItem || "") === String(itemId));
        const citizen = getActiveEquipmentCitizen(root, user);
        const regionContext = getManagedRegionContext();
        const result = window.WS_APP.assignEquipmentItemToEquipTarget?.(citizen, itemId, String(select?.value || ""));
        if (result?.ok && !restoreManagedRegion(regionContext)) window.WS_APP.setEquipmentSelectedItem?.(result.itemId || itemId);
        rerenderEquipmentShell(user, { citizen: result?.citizen || null });
        return;
      }


      const activateGridContainerButton = event.target.closest("[data-equipment-activate-grid-container]");
      if (activateGridContainerButton && !activateGridContainerButton.disabled) {
        event.preventDefault();
        window.WS_APP.activateEquipmentStorageRegion?.(activateGridContainerButton.dataset.equipmentActivateGridContainer || "");
        rerenderEquipmentShell(user);
        return;
      }

      const activateStorageRegionButton = event.target.closest("[data-equipment-activate-storage-region]");
      if (activateStorageRegionButton && !activateStorageRegionButton.disabled) {
        event.preventDefault();
        window.WS_APP.activateEquipmentStorageRegion?.(activateStorageRegionButton.dataset.equipmentActivateStorageRegion || "");
        rerenderEquipmentShell(user);
        return;
      }

      const filterButton = event.target.closest("[data-equipment-region-filter]");
      if (filterButton && !filterButton.disabled) {
        event.preventDefault();
        window.WS_APP.setEquipmentBodyRegionFilter?.(filterButton.dataset.equipmentRegionFilter || "all");
        rerenderEquipmentShell(user);
        return;
      }

      const bodymapViewButton = event.target.closest("[data-equipment-bodymap-view]");
      if (bodymapViewButton && !bodymapViewButton.disabled) {
        event.preventDefault();
        window.WS_APP.switchEquipmentBodymapView?.(bodymapViewButton.dataset.equipmentBodymapView || "front", { root });
        return;
      }

      const gridRotateButton = event.target.closest("[data-equipment-grid-rotate-item][data-equipment-grid-container]");
      if (gridRotateButton && !gridRotateButton.disabled) {
        event.preventDefault();
        const citizen = getActiveEquipmentCitizen(root, user);
        const result = window.WS_APP.rotateEquipmentContainerItem?.(
          citizen,
          gridRotateButton.dataset.equipmentGridRotateItem || "",
          gridRotateButton.dataset.equipmentGridContainer || ""
        );
        if (result?.ok) {
          window.WS_APP.setEquipmentSelectedContainerItem?.(result.itemId || "", result.containerId || "");
        }
        rerenderEquipmentShell(user, { citizen: result?.citizen || null, bodymap: false, storage: true, inspector: true, index: true });
        return;
      }

      const gridSortButton = event.target.closest("[data-equipment-grid-sort-container]");
      if (gridSortButton && !gridSortButton.disabled) {
        event.preventDefault();
        const citizen = getActiveEquipmentCitizen(root, user);
        const containerId = gridSortButton.dataset.equipmentGridSortContainer || "";
        const result = window.WS_APP.sortEquipmentContainerItems?.(citizen, containerId);
        rerenderEquipmentShell(user, { citizen: result?.citizen || null, bodymap: false, storage: true, inspector: true, index: true });
        return;
      }

      const genericEquipButton = event.target.closest("[data-equipment-equip-target-id][data-equipment-equip-item]");
      if (genericEquipButton && !genericEquipButton.disabled) {
        event.preventDefault();
        const citizen = getActiveEquipmentCitizen(root, user);
        const itemId = genericEquipButton.dataset.equipmentEquipItem || "";
        const regionContext = getManagedRegionContext();
        const result = window.WS_APP.assignEquipmentItemToEquipTarget?.(citizen, itemId, genericEquipButton.dataset.equipmentEquipTargetId || "");
        if (result?.ok && !restoreManagedRegion(regionContext)) window.WS_APP.setEquipmentSelectedItem?.(result.itemId || itemId);
        rerenderEquipmentShell(user, { citizen: result?.citizen || null });
        return;
      }

      const equipButton = event.target.closest("[data-equipment-equip-anchor][data-equipment-equip-layer][data-equipment-equip-item]");
      if (equipButton && !equipButton.disabled) {
        event.preventDefault();
        const citizen = getActiveEquipmentCitizen(root, user);
        const itemId = equipButton.dataset.equipmentEquipItem || "";
        const regionContext = getManagedRegionContext();
        const targetId = `LAYER|${equipButton.dataset.equipmentEquipAnchor || ""}|${equipButton.dataset.equipmentEquipLayer || ""}`;
        const result = window.WS_APP.assignEquipmentItemToEquipTarget?.(citizen, itemId, targetId);
        if (result?.ok && !restoreManagedRegion(regionContext)) window.WS_APP.setEquipmentSelectedItem?.(result.itemId || itemId);
        rerenderEquipmentShell(user, { citizen: result?.citizen || null });
        return;
      }

      const stowButton = event.target.closest("[data-equipment-stow-item]");
      if (stowButton && !stowButton.disabled) {
        event.preventDefault();
        const citizen = getActiveEquipmentCitizen(root, user);
        const itemId = stowButton.dataset.equipmentStowItem || "";
        const regionContext = getManagedRegionContext();
        const result = window.WS_APP.stowEquipmentItem?.(citizen, itemId, stowButton.dataset.equipmentStowTarget || "");
        if (result?.ok && !restoreManagedRegion(regionContext)) window.WS_APP.setEquipmentSelectedItem?.(result.itemId || itemId);
        rerenderEquipmentShell(user, { citizen: result?.citizen || null });
        return;
      }

      const drawButton = event.target.closest("[data-equipment-draw-item]");
      if (drawButton && !drawButton.disabled) {
        event.preventDefault();
        const citizen = getActiveEquipmentCitizen(root, user);
        const itemId = drawButton.dataset.equipmentDrawItem || "";
        const regionContext = getManagedRegionContext();
        const result = window.WS_APP.drawEquipmentItem?.(citizen, itemId, drawButton.dataset.equipmentDrawTarget || "");
        if (result?.ok && !restoreManagedRegion(regionContext)) window.WS_APP.setEquipmentSelectedItem?.(result.itemId || itemId);
        rerenderEquipmentShell(user, { citizen: result?.citizen || null });
        return;
      }

      const stowSelected = event.target.closest("[data-equipment-stow-selected]");
      if (stowSelected && !stowSelected.disabled) {
        event.preventDefault();
        const citizen = getActiveEquipmentCitizen(root, user);
        const itemId = stowSelected.dataset.equipmentStowSelected || "";
        const regionContext = getManagedRegionContext();
        const select = root.querySelector(`[data-equipment-stow-target-select][data-equipment-switch-item="${CSS.escape(itemId)}"]`);
        const result = window.WS_APP.stowEquipmentItem?.(citizen, itemId, String(select?.value || ""));
        if (result?.ok && !restoreManagedRegion(regionContext)) window.WS_APP.setEquipmentSelectedItem?.(result.itemId || itemId);
        rerenderEquipmentShell(user, { citizen: result?.citizen || null });
        return;
      }

      const drawSelected = event.target.closest("[data-equipment-draw-selected]");
      if (drawSelected && !drawSelected.disabled) {
        event.preventDefault();
        const citizen = getActiveEquipmentCitizen(root, user);
        const itemId = drawSelected.dataset.equipmentDrawSelected || "";
        const regionContext = getManagedRegionContext();
        const select = root.querySelector(`[data-equipment-draw-target-select][data-equipment-switch-item="${CSS.escape(itemId)}"]`);
        const result = window.WS_APP.drawEquipmentItem?.(citizen, itemId, String(select?.value || ""));
        if (result?.ok && !restoreManagedRegion(regionContext)) window.WS_APP.setEquipmentSelectedItem?.(result.itemId || itemId);
        rerenderEquipmentShell(user, { citizen: result?.citizen || null });
        return;
      }

      const unequipToggle = event.target.closest("[data-equipment-unequip-toggle]");
      if (unequipToggle && !unequipToggle.disabled) {
        event.preventDefault();
        event.stopPropagation();
        const panelId = String(unequipToggle.getAttribute("aria-controls") || "").trim();
        const panel = panelId ? root.querySelector(`#${CSS.escape(panelId)}`) : null;
        const expanded = unequipToggle.getAttribute("aria-expanded") === "true";
        unequipToggle.setAttribute("aria-expanded", expanded ? "false" : "true");
        if (panel) panel.hidden = expanded;
        return;
      }

      const unequipButton = event.target.closest("[data-equipment-unequip-item]");
      if (unequipButton && !unequipButton.disabled) {
        event.preventDefault();
        const citizen = getActiveEquipmentCitizen(root, user);
        const itemId = unequipButton.dataset.equipmentUnequipItem || "";
        const regionContext = getManagedRegionContext();
        const targetSelect = root.querySelector(`[data-equipment-unequip-target-select][data-equipment-unequip-item="${CSS.escape(itemId)}"]`);
        const targetContainerId = String(targetSelect?.value || unequipButton.dataset.equipmentUnequipContainer || "").trim();
        const result = window.WS_APP.unequipEquipmentItem?.(citizen, itemId, targetContainerId);
        if (result?.ok && !restoreManagedRegion(regionContext)) {
          window.WS_APP.setEquipmentSelectedContainerItem?.(result.itemId || "", result.containerId || targetContainerId);
        }
        rerenderEquipmentShell(user, { citizen: result?.citizen || null });
        return;
      }

      const containerItemButton = event.target.closest("[data-equipment-select-container-item][data-equipment-container-id]");
      if (containerItemButton && !containerItemButton.disabled) {
        event.preventDefault();
        const itemId = containerItemButton.dataset.equipmentSelectContainerItem || "";
        const containerId = containerItemButton.dataset.equipmentContainerId || "";
        const result = window.WS_APP.selectEquipmentItemFastPath?.(itemId, { root, containerId });
        if (!result?.ok) {
          window.WS_APP.setEquipmentSelectedContainerItem?.(itemId, containerId);
          rerenderEquipmentShell(user);
        }
        return;
      }

      const containerButton = event.target.closest("[data-equipment-select-container]");
      if (containerButton && !containerButton.disabled) {
        event.preventDefault();
        window.WS_APP.setEquipmentSelectedContainer?.(containerButton.dataset.equipmentSelectContainer || "");
        rerenderEquipmentShell(user);
        return;
      }

      const inspectorBackButton = event.target.closest("[data-equipment-inspector-back-region]");
      if (inspectorBackButton && !inspectorBackButton.disabled) {
        event.preventDefault();
        window.WS_APP.returnEquipmentInspectorToRegion?.(inspectorBackButton.dataset.equipmentInspectorBackRegion || "");
        rerenderEquipmentShell(user);
        return;
      }

      const regionButton = event.target.closest("[data-equipment-select-region]");
      if (regionButton && !regionButton.disabled) {
        event.preventDefault();
        const targetView = String(regionButton.dataset.equipmentBodymapTargetView || "").trim().toLowerCase();
        if (targetView === "front" || targetView === "back") {
          window.WS_APP.setEquipmentBodymapView?.(targetView);
        }
        window.WS_APP.setEquipmentSelectedRegion?.(regionButton.dataset.equipmentSelectRegion || "");
        rerenderEquipmentShell(user, { bodymap: true, storage: false, inspector: true, index: false });
        return;
      }

      const itemButton = event.target.closest("[data-equipment-select-item]");
      if (itemButton && !itemButton.disabled) {
        event.preventDefault();
        const itemId = itemButton.dataset.equipmentSelectItem || "";
        const returnRegion = String(itemButton.dataset.equipmentReturnRegion || "").trim();
        const result = window.WS_APP.selectEquipmentItemFastPath?.(itemId, { root, returnRegion });
        if (!result?.ok) {
          if (returnRegion) window.WS_APP.setEquipmentSelectedItemFromRegion?.(itemId, returnRegion);
          else window.WS_APP.setEquipmentSelectedItem?.(itemId);
          rerenderEquipmentShell(user);
        }
        return;
      }


      const protectedSurface = event.target.closest([
        "[data-equipment-container-grid]",
        "[data-equipment-select-item]",
        "[data-equipment-select-container-item]",
        "[data-equipment-select-region]",
        "[data-equipment-select-container]",
        "[data-equipment-panel=\"command-rail\"]",
        "[data-equipment-panel=\"item-inspector\"]",
        "button",
        "select",
        "input",
        "label",
        "summary",
        "details",
        "a"
      ].join(","));
      const selections = window.WS_APP.getEquipmentSelectionState?.() || {};
      if (!protectedSurface && (selections.selectedItemId || selections.selectedRegion || selections.inspectedContainerId)) {
        const result = window.WS_APP.clearEquipmentActiveSelectionFastPath?.({ root });
        if (!result?.ok) {
          window.WS_APP.clearEquipmentActiveSelection?.();
          rerenderEquipmentShell(user);
        }
      }
    });
  }

  window.WS_APP.equipmentActions = {
    version: EQUIPMENT_ACTIONS_VERSION,
    bindEquipmentShellActions,
    cancelEquipmentGridDrag: resetActiveGridDrag,
    applyEquipmentItemIndexFilters,
    hideEquipmentTooltip
  };

  window.WS_APP.bindEquipmentShellActions = bindEquipmentShellActions;
  window.WS_APP.cancelEquipmentGridDrag = resetActiveGridDrag;
})();
