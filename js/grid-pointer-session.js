window.WS_APP = window.WS_APP || {};

(function initGridPointerSessionCore() {
  const CORE_VERSION = "1.2x";
  const DEFAULT_THRESHOLD = 5;
  let activeSession = null;
  const diagnostics = {
    sessionsStarted: 0,
    dragsStarted: 0,
    dropsEvaluated: 0,
    commitsRequested: 0,
    cancelled: 0,
    previewsCreated: 0,
    lastDomain: "",
    lastResultCode: "",
    lastErrorCode: ""
  };

  function makeResult(ok = false, code = "UNKNOWN", message = "", details = {}) {
    return {
      ok: Boolean(ok),
      code: String(code || "UNKNOWN"),
      message: String(message || ""),
      details: details && typeof details === "object" && !Array.isArray(details) ? details : {}
    };
  }

  function toNumber(value = 0, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function getCellAtPoint(session = {}, clientX = 0, clientY = 0) {
    const selector = String(session.config?.cellSelector || "").trim();
    const grid = session.grid || null;
    if (selector && grid && typeof document.elementFromPoint === "function") {
      const target = document.elementFromPoint(clientX, clientY);
      const cellElement = target?.closest?.(selector) || null;
      if (cellElement && grid.contains(cellElement)) {
        const coordinates = resolveCellCoordinates(cellElement, session.config || {});
        return {
          element: cellElement,
          column: coordinates.column,
          row: coordinates.row,
          rect: null
        };
      }
    }
    return (session.cells || []).find((entry) => {
      if (!entry.rect && entry.element?.getBoundingClientRect) entry.rect = entry.element.getBoundingClientRect();
      const rect = entry.rect;
      return rect
        && clientX >= rect.left
        && clientX <= rect.right
        && clientY >= rect.top
        && clientY <= rect.bottom;
    }) || null;
  }

  function resolveCellCoordinates(cell = null, config = {}) {
    if (!cell) return { column: 0, row: 0 };
    if (typeof config.getCellCoordinates === "function") {
      const resolved = config.getCellCoordinates(cell.element || cell) || {};
      return {
        column: Math.max(0, Math.round(toNumber(resolved.column ?? cell.column, 0))),
        row: Math.max(0, Math.round(toNumber(resolved.row ?? cell.row, 0)))
      };
    }
    const element = cell.element || cell;
    return {
      column: Math.max(0, Math.round(toNumber(element?.dataset?.gridColumn ?? element?.dataset?.housingGridColumn ?? element?.dataset?.equipmentGridColumn ?? cell.column, 0))),
      row: Math.max(0, Math.round(toNumber(element?.dataset?.gridRow ?? element?.dataset?.housingGridRow ?? element?.dataset?.equipmentGridRow ?? cell.row, 0)))
    };
  }

  function getSessionCells(grid = null, config = {}) {
    const selector = String(config.cellSelector || "").trim();
    if (!grid || !selector) return [];
    return [...grid.querySelectorAll(selector)].map((element) => {
      const coordinates = resolveCellCoordinates(element, config);
      return {
        element,
        column: coordinates.column,
        row: coordinates.row,
        rect: null
      };
    });
  }

  function clampNumber(value = 0, min = 0, max = 9999) {
    const number = toNumber(value, min);
    return Math.max(min, Math.min(max, number));
  }

  function createDefaultPreview(session = activeSession) {
    if (!session || session.preview || session.config.preview === false) return null;
    const sourceRect = session.sourceRect || session.source?.getBoundingClientRect?.() || { width: 72, height: 42 };
    const preview = document.createElement("div");
    preview.className = String(session.config.previewClass || "grid-pointer-drag-preview").trim();
    preview.innerHTML = typeof session.config.getPreviewHtml === "function"
      ? String(session.config.getPreviewHtml(session) || "")
      : session.source?.innerHTML || "";
    preview.style.width = `${clampNumber(sourceRect.width, 42, 260)}px`;
    preview.style.height = `${clampNumber(sourceRect.height, 32, 180)}px`;
    preview.setAttribute("aria-hidden", "true");
    document.body.appendChild(preview);
    session.preview = preview;
    diagnostics.previewsCreated += 1;
    return preview;
  }

  function updatePreviewPosition(session = activeSession) {
    if (!session?.preview) return;
    const previewX = toNumber(session.latestX, 0) - toNumber(session.previewOffsetX, 0);
    const previewY = toNumber(session.latestY, 0) - toNumber(session.previewOffsetY, 0);
    session.preview.style.transform = `translate3d(${previewX}px, ${previewY}px, 0)`;
  }

  function applyDragPresentation(session = activeSession) {
    if (!session) return;
    const draggingClass = session.config.draggingClass || "is-dragging";
    const dragSourceClass = session.config.dragSourceClass || "is-drag-source";
    const dragActiveGridClass = session.config.dragActiveGridClass || "is-drag-active";
    session.source?.classList?.add(draggingClass, dragSourceClass);
    session.source?.setAttribute?.("aria-grabbed", "true");
    session.grid?.classList?.add(dragActiveGridClass);
    if (session.config.preview !== false) createDefaultPreview(session);
    session.config.onPresentationApplied?.(session);
  }

  function clearCellPresentation(session = activeSession, cell = null) {
    if (!session || !cell?.element) return;
    const validClass = session.config.validCellClass || "is-drop-target";
    const invalidClass = session.config.invalidCellClass || "is-drop-invalid";
    const hoveredClass = session.config.hoveredCellClass || "is-drag-hovered-cell";
    cell.element.classList.remove(validClass, invalidClass, hoveredClass);
  }

  function paintCellPresentation(session = activeSession, cell = null, validation = null) {
    if (!session || !cell?.element) return;
    const validClass = session.config.validCellClass || "is-drop-target";
    const invalidClass = session.config.invalidCellClass || "is-drop-invalid";
    const hoveredClass = session.config.hoveredCellClass || "is-drag-hovered-cell";
    clearCellPresentation(session, cell);
    cell.element.classList.add(hoveredClass, validation?.ok ? validClass : invalidClass);
    session.paintedCells?.add(cell.element);
  }

  function clearPresentation(session = activeSession) {
    if (!session) return;
    const validClass = session.config.validCellClass || "is-drop-target";
    const invalidClass = session.config.invalidCellClass || "is-drop-invalid";
    const hoveredClass = session.config.hoveredCellClass || "is-drag-hovered-cell";
    const draggingClass = session.config.draggingClass || "is-dragging";
    const dragSourceClass = session.config.dragSourceClass || "is-drag-source";
    const dragActiveGridClass = session.config.dragActiveGridClass || "is-drag-active";
    session.source?.classList?.remove(draggingClass, dragSourceClass);
    session.source?.setAttribute?.("aria-grabbed", "false");
    session.grid?.classList?.remove(dragActiveGridClass);
    session.preview?.remove?.();
    session.preview = null;
    (session.paintedCells || new Set()).forEach((element) => element?.classList?.remove(validClass, invalidClass, hoveredClass));
    session.paintedCells?.clear?.();
    session.hoveredCell = null;
    session.config.onPresentationCleared?.(session);
  }

  function detachListeners(session = activeSession) {
    if (!session) return;
    document.removeEventListener("pointermove", session.onMove);
    document.removeEventListener("pointerup", session.onUp);
    document.removeEventListener("pointercancel", session.onCancel);
    window.removeEventListener("blur", session.onBlur);
    try {
      session.source?.releasePointerCapture?.(session.pointerId);
    } catch (error) {
      // Pointer capture release is best effort; document listeners are canonical.
    }
  }

  function resetGridPointerSession() {
    const session = activeSession;
    clearPresentation(session);
    detachListeners(session);
    activeSession = null;
    return true;
  }

  function evaluateSessionAtPoint(session = activeSession, clientX = 0, clientY = 0) {
    if (!session) return null;
    const cell = getCellAtPoint(session, clientX, clientY);
    if (!cell) {
      if (session.hoveredCell) clearCellPresentation(session, session.hoveredCell);
      session.hoveredCell = null;
      session.validation = null;
      session.lastValidationKey = "";
      return null;
    }
    const target = resolveCellCoordinates(cell, session.config);
    const key = typeof session.config.getValidationKey === "function"
      ? String(session.config.getValidationKey({ session, cell, target }) || "")
      : `${target.column}:${target.row}`;
    if (key !== session.lastValidationKey) {
      session.lastValidationKey = key;
      if (!session.validationCache.has(key)) {
        diagnostics.dropsEvaluated += 1;
        const validation = typeof session.config.evaluateDrop === "function"
          ? session.config.evaluateDrop({
            session,
            context: session.context,
            source: session.source,
            grid: session.grid,
            cell,
            targetColumn: target.column,
            targetRow: target.row
          })
          : makeResult(false, "GRID_POINTER_EVALUATOR_UNAVAILABLE", "Grid pointer-session evaluator is unavailable.");
        session.validationCache.set(key, validation);
      }
      session.validation = session.validationCache.get(key);
    }
    if (session.hoveredCell?.element !== cell.element) {
      clearCellPresentation(session, session.hoveredCell);
    }
    session.hoveredCell = cell;
    paintCellPresentation(session, cell, session.validation);
    return session.validation;
  }

  function updateDragFrame(session = activeSession) {
    if (!session || activeSession !== session || !session.dragging) return;
    session.framePending = false;
    updatePreviewPosition(session);
    evaluateSessionAtPoint(session, session.latestX, session.latestY);
  }

  function beginDragging(session = activeSession, event = null) {
    if (!session || session.dragging) return;
    diagnostics.dragsStarted += 1;
    session.dragging = true;
    session.cells = getSessionCells(session.grid, session.config);
    applyDragPresentation(session);
    if (event) {
      session.latestX = event.clientX;
      session.latestY = event.clientY;
    }
    session.config.onDragStart?.(session);
    updateDragFrame(session);
  }

  function handlePointerMove(event) {
    const session = activeSession;
    if (!session || event.pointerId !== session.pointerId) return;
    const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
    if (!session.dragging && distance < session.threshold) return;
    if (!session.dragging) beginDragging(session, event);
    if (activeSession !== session || !session.dragging) return;
    event.preventDefault();
    session.latestX = event.clientX;
    session.latestY = event.clientY;
    if (!session.framePending) {
      session.framePending = true;
      window.requestAnimationFrame(() => updateDragFrame(session));
    }
  }

  function completeGridPointerSession(event = null, cancelled = false) {
    const session = activeSession;
    if (!session || (event?.pointerId != null && event.pointerId !== session.pointerId)) return null;
    const wasDragging = Boolean(session.dragging);
    const validation = session.validation;
    if (wasDragging) {
      event?.preventDefault?.();
      session.config.onSuppressClick?.(session);
    }
    clearPresentation(session);
    detachListeners(session);
    activeSession = null;
    if (!wasDragging) return null;
    if (cancelled) {
      diagnostics.cancelled += 1;
      session.config.onCancel?.(session);
      return makeResult(false, "GRID_POINTER_SESSION_CANCELLED", "Grid pointer-session was cancelled.");
    }
    diagnostics.commitsRequested += 1;
    const result = validation?.ok && typeof session.config.commitDrop === "function"
      ? session.config.commitDrop({ session, context: session.context, validation })
      : validation || makeResult(false, "GRID_POINTER_TARGET_UNAVAILABLE", "Grid pointer target is unavailable.");
    diagnostics.lastDomain = session.domain;
    diagnostics.lastResultCode = String(result?.code || "");
    diagnostics.lastErrorCode = result?.ok ? "" : String(result?.code || "UNKNOWN");
    session.config.onComplete?.(result, session);
    return result;
  }

  function startGridPointerSession(event = null, config = {}) {
    if (!event || event.isPrimary === false || event.button !== 0 || activeSession) return null;
    const sourceSelector = String(config.sourceSelector || "").trim();
    const gridSelector = String(config.gridSelector || "").trim();
    const cellSelector = String(config.cellSelector || "").trim();
    if (!sourceSelector || !gridSelector || !cellSelector) {
      return makeResult(false, "GRID_POINTER_CONFIG_INCOMPLETE", "Grid pointer-session selectors are incomplete.");
    }
    const source = event.target.closest?.(sourceSelector) || null;
    if (!source || source.disabled) return null;
    const grid = source.closest?.(gridSelector) || null;
    if (!grid) return null;
    const initialCell = getCellAtPoint({ grid, config, cells: [] }, event.clientX, event.clientY);
    const cells = [];
    const contextResult = typeof config.createContext === "function"
      ? config.createContext({ event, source, grid, cells, initialCell })
      : makeResult(false, "GRID_POINTER_CONTEXT_UNAVAILABLE", "Grid pointer-session context factory is unavailable.");
    if (!contextResult?.ok) {
      config.onAbort?.(contextResult, { event, source, grid });
      return contextResult;
    }
    diagnostics.sessionsStarted += 1;
    const sourceRect = source.getBoundingClientRect?.() || { left: 0, top: 0, width: 1, height: 1 };
    const session = {
      version: CORE_VERSION,
      domain: String(config.domain || "GRID_POINTER").trim(),
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      latestX: event.clientX,
      latestY: event.clientY,
      threshold: Math.max(0, Math.round(toNumber(config.threshold, DEFAULT_THRESHOLD))),
      source,
      sourceRect,
      previewOffsetX: clampNumber(event.clientX - sourceRect.left, 0, Math.max(0, sourceRect.width - 0.01)),
      previewOffsetY: clampNumber(event.clientY - sourceRect.top, 0, Math.max(0, sourceRect.height - 0.01)),
      preview: null,
      grid,
      cells,
      initialCell,
      config,
      context: contextResult,
      dragging: false,
      framePending: false,
      validation: null,
      validationCache: new Map(),
      hoveredCell: null,
      paintedCells: new Set(),
      lastValidationKey: ""
    };
    session.onMove = handlePointerMove;
    session.onUp = (upEvent) => completeGridPointerSession(upEvent, false);
    session.onCancel = (cancelEvent) => completeGridPointerSession(cancelEvent, true);
    session.onBlur = () => completeGridPointerSession(null, true);
    activeSession = session;
    diagnostics.lastDomain = session.domain;
    try {
      source.setPointerCapture?.(event.pointerId);
    } catch (error) {
      // Pointer capture is optional; document listeners remain canonical.
    }
    document.addEventListener("pointermove", session.onMove, { passive: false });
    document.addEventListener("pointerup", session.onUp);
    document.addEventListener("pointercancel", session.onCancel);
    window.addEventListener("blur", session.onBlur);
    config.onSessionStart?.(session);
    return session;
  }

  function getGridPointerSessionReadiness() {
    return {
      version: CORE_VERSION,
      ready: typeof document !== "undefined" && typeof window.requestAnimationFrame === "function",
      active: Boolean(activeSession),
      activeDomain: String(activeSession?.domain || ""),
      supportsDelegatedPointerDown: true,
      supportsGrabOffsetContexts: true,
      supportsValidationCache: true,
      supportsDragPreview: true,
      supportsElementFromPointHitTesting: typeof document.elementFromPoint === "function",
      supportsTargetedCellClassUpdates: true,
      supportsDragSourcePresentation: true,
      pointermoveRebuildPolicy: "NO_RERENDER_ON_POINTERMOVE"
    };
  }

  function getGridPointerSessionDiagnostics() {
    return {
      version: CORE_VERSION,
      active: Boolean(activeSession),
      activeDomain: String(activeSession?.domain || ""),
      ...diagnostics
    };
  }

  Object.assign(window.WS_APP, {
    startGridPointerSession,
    completeGridPointerSession,
    resetGridPointerSession,
    getGridPointerSessionReadiness,
    getGridPointerSessionDiagnostics
  });
})();
