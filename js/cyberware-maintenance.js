(function initCyberwareMaintenance() {
  window.WS_APP = window.WS_APP || {};
  const app = window.WS_APP;
  const MAX_SERVICE_HISTORY = 48;
  const DEFAULT_OPERATION = "DIAGNOSTIC";
  const OPERATION_ORDER = Object.freeze(["DIAGNOSTIC", "CLEAN", "CALIBRATE", "REPAIR", "FIRMWARE"]);
  const panelStateByCitizen = app.cyberwareMaintenancePanelStateByCitizen = app.cyberwareMaintenancePanelStateByCitizen || Object.create(null);
  const projectionCacheByCitizen = app.cyberwareMaintenanceProjectionCache = app.cyberwareMaintenanceProjectionCache || Object.create(null);

  if (typeof app.getItemInstanceById !== "function" || typeof app.updateItemInstance !== "function") {
    throw new Error("ItemInstance Store must load before cyberware-maintenance.js.");
  }

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function normalizeToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function clamp(value, min = 0, max = 100, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }

  function itemId(item = {}) {
    return String(item?.instanceId || item?.id || item?.itemId || "").trim();
  }

  function getCampaignDateIso() {
    return String(app.getCampaignDateIso?.() || app.CAMPAIGN_DATE_ISO || "2109-02-13").trim();
  }

  function getCitizen(citizenOrId = {}) {
    if (typeof citizenOrId === "string") return app.getCitizenById?.(citizenOrId) || null;
    if (citizenOrId?.id) return citizenOrId;
    return null;
  }

  function getPanelState(citizenId = "") {
    const id = String(citizenId || "").trim();
    if (!id) return { open: false, selectedItemId: "", operation: DEFAULT_OPERATION, feedback: null };
    if (!panelStateByCitizen[id]) panelStateByCitizen[id] = {};
    const state = panelStateByCitizen[id];
    if (state.open !== true) state.open = false;
    if (typeof state.selectedItemId !== "string") state.selectedItemId = "";
    if (!OPERATION_ORDER.includes(normalizeToken(state.operation || ""))) state.operation = DEFAULT_OPERATION;
    if (state.feedback === undefined) state.feedback = null;
    return state;
  }

  function normalizeServiceHistory(history = []) {
    return (Array.isArray(history) ? history : [])
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => ({
        id: String(entry.id || "").trim(),
        type: normalizeToken(entry.type || entry.operation || "SERVICE"),
        status: normalizeToken(entry.status || "COMPLETED"),
        createdAt: String(entry.createdAt || entry.date || "").trim(),
        provider: String(entry.provider || "CERTIFIED_SERVICE_NODE").trim(),
        cost: Math.max(0, Math.round(Number(entry.cost || 0))),
        durationMinutes: Math.max(0, Math.round(Number(entry.durationMinutes || 0))),
        conditionBefore: entry.conditionBefore === null || entry.conditionBefore === undefined ? null : clamp(entry.conditionBefore, 0, 100, 0),
        conditionAfter: entry.conditionAfter === null || entry.conditionAfter === undefined ? null : clamp(entry.conditionAfter, 0, 100, 0),
        calibrationBefore: entry.calibrationBefore === null || entry.calibrationBefore === undefined ? null : clamp(entry.calibrationBefore, 0, 100, 0),
        calibrationAfter: entry.calibrationAfter === null || entry.calibrationAfter === undefined ? null : clamp(entry.calibrationAfter, 0, 100, 0),
        cleanlinessBefore: entry.cleanlinessBefore === null || entry.cleanlinessBefore === undefined ? null : clamp(entry.cleanlinessBefore, 0, 100, 0),
        cleanlinessAfter: entry.cleanlinessAfter === null || entry.cleanlinessAfter === undefined ? null : clamp(entry.cleanlinessAfter, 0, 100, 0),
        firmwareBefore: String(entry.firmwareBefore || "").trim(),
        firmwareAfter: String(entry.firmwareAfter || "").trim(),
        diagnosticStatus: normalizeToken(entry.diagnosticStatus || ""),
        codes: Array.isArray(entry.codes) ? entry.codes.map(normalizeToken).filter(Boolean).slice(0, 12) : [],
        note: String(entry.note || entry.notes || "").trim()
      }))
      .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
      .slice(0, MAX_SERVICE_HISTORY);
  }

  function getMaintenanceProjectionKey() {
    return `${Number(app.getItemInstanceStoreRevision?.() || 0)}:${Number(app.getEquipmentCatalogRevision?.() || 0)}`;
  }

  function invalidateCyberwareMaintenanceContext(citizenId = "") {
    const id = String(citizenId || "").trim();
    if (id) delete projectionCacheByCitizen[id];
    else Object.keys(projectionCacheByCitizen).forEach((key) => delete projectionCacheByCitizen[key]);
    return true;
  }

  function getCyberwareItemViews(citizenId = "") {
    const id = String(citizenId || "").trim();
    if (!id || typeof app.getCitizenItemInstances !== "function") return [];
    const revisionKey = getMaintenanceProjectionKey();
    const cached = projectionCacheByCitizen[id];
    if (cached?.revisionKey === revisionKey && Array.isArray(cached.items)) return clone(cached.items);

    const items = app.getCitizenItemInstances(id, { includeDisposed: false, includeBody: true })
      .map((instance) => app.getItemInstanceView?.(instance.instanceId))
      .filter(Boolean)
      .filter((item) => typeof app.isCyberwareView === "function" ? app.isCyberwareView(item) : Boolean(item?.cyberwareState))
      .filter((item) => !["DESTROYED", "VENDOR"].includes(normalizeToken(item?.locationData?.type || item?.location || "")))
      .sort((left, right) => {
        const rank = (item) => {
          const location = normalizeToken(item?.locationData?.type || item?.location || "");
          if (location === "BODY") return 0;
          if (location === "SERVICE") return 1;
          if (location === "HOUSING_STORAGE") return 2;
          if (location === "CONTAINER_GRID") return 3;
          return 4;
        };
        return rank(left) - rank(right) || String(left.name || itemId(left)).localeCompare(String(right.name || itemId(right)));
      });
    projectionCacheByCitizen[id] = { revisionKey, items: clone(items) };
    return items;
  }

  function getCondition(item = {}) {
    return clamp(item?.condition ?? item?.durability?.current, 0, 100, 100);
  }

  function getCalibration(item = {}) {
    const source = item?.cyberwareState?.calibration || {};
    return {
      profile: normalizeToken(source.profile || "FACTORY"),
      quality: clamp(source.quality, 0, 100, 100),
      lastCalibratedAt: String(source.lastCalibratedAt || "").trim()
    };
  }

  function getMaintenanceState(item = {}) {
    const source = item?.cyberwareState?.maintenance || {};
    return {
      cleanliness: clamp(source.cleanliness, 0, 100, 100),
      lastCleanedAt: String(source.lastCleanedAt || "").trim(),
      lastDiagnostic: source.lastDiagnostic && typeof source.lastDiagnostic === "object" ? clone(source.lastDiagnostic) : null
    };
  }

  function getFirmwareState(item = {}) {
    return typeof app.getCyberwareFirmwareState === "function"
      ? app.getCyberwareFirmwareState(item)
      : { required: false, status: "NOT_REQUIRED", version: "", latestVersion: "", valid: true, warning: false };
  }

  function parseTier(value = 0) {
    const match = String(value ?? "").match(/\d+/);
    const numeric = Number(match ? match[0] : value);
    return Number.isFinite(numeric) ? Math.max(0, Math.min(6, numeric)) : 0;
  }

  function finiteNumber(value = 0, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function getTierFactor(item = {}) {
    const tier = parseTier(item?.productTier ?? item?.tierLevel ?? item?.hardwareTier ?? item?.modelTier ?? item?.tier ?? item?.neurochipTier ?? item?.interfaceTier ?? item?.servicePortTier ?? 0);
    return 1 + tier * 0.2;
  }

  function getScaleFactor(item = {}) {
    const scale = normalizeToken(item?.scale || "SMALL");
    return ({ SMALL: 1, MEDIUM: 1.35, LARGE: 1.8, FULL_SET: 2.5 }[scale] || 1.15);
  }

  function buildDiagnosticSnapshot(citizen = {}, item = {}, runtimeState = null) {
    const runtime = runtimeState || (typeof app.getCyberwareWorkspaceRuntime === "function"
      ? app.getCyberwareWorkspaceRuntime(citizen)
      : typeof app.getCyberwareRuntimeState === "function"
        ? app.getCyberwareRuntimeState(citizen)
        : null);
    const runtimeItem = (runtime?.items || runtime?.installed || []).find((entry) => itemId(entry) === itemId(item)) || null;
    const blockers = Array.isArray(runtimeItem?.blockers) ? runtimeItem.blockers.map(normalizeToken).filter(Boolean) : [];
    const warnings = Array.isArray(runtimeItem?.warnings) ? runtimeItem.warnings.map(normalizeToken).filter(Boolean) : [];
    const state = normalizeToken(runtimeItem?.operationalState || runtimeItem?.runtimeStatus || item?.operationalState || "UNKNOWN");
    return {
      status: state,
      codes: [...blockers, ...warnings].filter((value, index, list) => list.indexOf(value) === index).slice(0, 12),
      stability: clamp(runtime?.neuralCore?.stability, 0, 100, 0),
      security: clamp(runtime?.neuralCore?.security, 0, 100, 0)
    };
  }

  function buildMaintenanceQuote(citizen = {}, item = {}, operation = DEFAULT_OPERATION, options = {}) {
    const op = normalizeToken(operation || DEFAULT_OPERATION);
    const condition = getCondition(item);
    const calibration = getCalibration(item);
    const maintenance = getMaintenanceState(item);
    const firmware = getFirmwareState(item);
    const tierFactor = getTierFactor(item);
    const scaleFactor = getScaleFactor(item);
    const location = normalizeToken(item?.locationData?.type || item?.location || "");
    const blocked = [];
    const warnings = [];
    let cost = 0;
    let durationMinutes = 0;
    let summary = "";
    const before = {};
    const after = {};
    let diagnosticSnapshot = null;

    if (!itemId(item)) blocked.push("ITEM_INSTANCE_NOT_FOUND");
    if (String(item?.ownerId || "").trim() !== String(citizen?.id || "").trim()) blocked.push("ITEM_INSTANCE_OWNER_MISMATCH");
    if (["DESTROYED", "VENDOR"].includes(location)) blocked.push("ITEM_NOT_SERVICEABLE");

    if (op === "REPAIR") {
      const missing = Math.max(0, 100 - condition);
      before.condition = condition;
      after.condition = 100;
      cost = Math.round((120 + missing * 18) * tierFactor * scaleFactor);
      durationMinutes = Math.max(20, Math.round(15 + missing * 1.8 * scaleFactor));
      summary = missing > 0 ? `Restore physical condition from ${condition}% to 100%.` : "Physical condition is already at 100%.";
      if (missing <= 0) blocked.push("NO_REPAIR_REQUIRED");
    } else if (op === "CALIBRATE") {
      before.calibration = calibration.quality;
      after.calibration = 100;
      cost = Math.round(180 * tierFactor * scaleFactor);
      durationMinutes = Math.round(25 + 10 * scaleFactor);
      summary = `Apply certified service calibration and set quality to 100%.`;
      if (calibration.quality >= 100 && calibration.profile === "CERTIFIED_SERVICE") warnings.push("CALIBRATION_ALREADY_CURRENT");
    } else if (op === "CLEAN") {
      before.cleanliness = maintenance.cleanliness;
      after.cleanliness = 100;
      cost = Math.round(70 * tierFactor * scaleFactor);
      durationMinutes = Math.round(12 + 8 * scaleFactor);
      summary = "Clean contacts, seals and accessible service surfaces.";
      if (maintenance.cleanliness >= 100) warnings.push("CLEANLINESS_ALREADY_MAXIMUM");
    } else if (op === "FIRMWARE") {
      before.firmware = firmware.version || "NONE";
      after.firmware = firmware.latestVersion || firmware.version || "CURRENT";
      cost = Math.round(95 * tierFactor);
      durationMinutes = 18;
      summary = firmware.required ? `Install ${firmware.channel || "DEFAULT"} firmware ${after.firmware}.` : "This implant does not require managed firmware.";
      if (!firmware.required) blocked.push("FIRMWARE_NOT_REQUIRED");
      else if (!["UPDATE_AVAILABLE", "MISSING", "INVALID", "OUTDATED", "BLOCKED"].includes(normalizeToken(firmware.status))) blocked.push("FIRMWARE_ALREADY_CURRENT");
    } else {
      diagnosticSnapshot = buildDiagnosticSnapshot(citizen, item, options.runtime || null);
      cost = Math.round(55 * tierFactor);
      durationMinutes = 10;
      summary = "Run a focused service diagnostic and record current operational findings.";
      before.diagnosticStatus = diagnosticSnapshot.status;
      after.diagnosticStatus = diagnosticSnapshot.status;
      if (diagnosticSnapshot.codes.length) warnings.push(...diagnosticSnapshot.codes);
    }

    const quoteNumbersValid = Number.isFinite(Number(cost)) && Number.isFinite(Number(durationMinutes));
    if (!quoteNumbersValid) blocked.push("MAINTENANCE_QUOTE_INVALID");
    cost = Math.max(0, Math.round(finiteNumber(cost, 0)));
    durationMinutes = Math.max(0, Math.round(finiteNumber(durationMinutes, 0)));

    return {
      operation: OPERATION_ORDER.includes(op) ? op : DEFAULT_OPERATION,
      valid: blocked.length === 0,
      status: blocked.length ? "BLOCKED" : warnings.length ? "ADVISORY" : "READY",
      reason: blocked[0] || warnings[0] || "READY",
      blockers: [...new Set(blocked)],
      warnings: [...new Set(warnings)],
      cost,
      durationMinutes,
      summary,
      before,
      after,
      firmware,
      location,
      diagnostic: diagnosticSnapshot
    };
  }

  function makeServiceEntry(operation = DEFAULT_OPERATION, item = {}, quote = {}, details = {}) {
    const createdAt = String(details.createdAt || getCampaignDateIso()).trim();
    const op = normalizeToken(operation || DEFAULT_OPERATION);
    return {
      id: String(details.id || `service-${op.toLowerCase()}-${itemId(item)}-${createdAt}-${Date.now().toString(36)}`).trim(),
      type: op,
      status: normalizeToken(details.status || "COMPLETED"),
      createdAt,
      provider: String(details.provider || "CERTIFIED_SERVICE_NODE").trim(),
      cost: Math.max(0, Math.round(finiteNumber(details.cost ?? quote.cost, 0))),
      durationMinutes: Math.max(0, Math.round(finiteNumber(details.durationMinutes ?? quote.durationMinutes, 0))),
      conditionBefore: details.conditionBefore ?? quote.before?.condition ?? null,
      conditionAfter: details.conditionAfter ?? quote.after?.condition ?? null,
      calibrationBefore: details.calibrationBefore ?? quote.before?.calibration ?? null,
      calibrationAfter: details.calibrationAfter ?? quote.after?.calibration ?? null,
      cleanlinessBefore: details.cleanlinessBefore ?? quote.before?.cleanliness ?? null,
      cleanlinessAfter: details.cleanlinessAfter ?? quote.after?.cleanliness ?? null,
      firmwareBefore: String(details.firmwareBefore ?? quote.before?.firmware ?? "").trim(),
      firmwareAfter: String(details.firmwareAfter ?? quote.after?.firmware ?? "").trim(),
      diagnosticStatus: normalizeToken(details.diagnosticStatus || quote.after?.diagnosticStatus || ""),
      codes: Array.isArray(details.codes) ? details.codes.map(normalizeToken).filter(Boolean).slice(0, 12) : [],
      note: String(details.note || quote.summary || "").trim()
    };
  }

  function appendServiceHistory(current = {}, entry = {}) {
    const history = Array.isArray(current?.serviceHistory) ? clone(current.serviceHistory) : [];
    history.push(entry);
    return history.slice(-MAX_SERVICE_HISTORY);
  }


  function emitMaintenanceUpdate(citizenId = "", itemInstanceId = "", operation = "") {
    if (typeof window.dispatchEvent !== "function" || typeof window.CustomEvent !== "function") return;
    window.dispatchEvent(new window.CustomEvent("ws:cyberware-maintenance-updated", {
      detail: { citizenId: String(citizenId || "").trim(), itemId: String(itemInstanceId || "").trim(), operation: normalizeToken(operation) }
    }));
  }

  function runCyberwareMaintenance(citizenOrId = {}, options = {}) {
    const citizen = getCitizen(citizenOrId);
    const itemInstanceId = String(options.itemId || options.instanceId || "").trim();
    const requestedOperation = normalizeToken(options.operation || DEFAULT_OPERATION);
    const operation = OPERATION_ORDER.includes(requestedOperation) ? requestedOperation : DEFAULT_OPERATION;
    if (!citizen) return { ok: false, reason: "CITIZEN_NOT_FOUND" };
    const current = app.getItemInstanceById?.(itemInstanceId);
    const item = app.getItemInstanceView?.(itemInstanceId);
    if (!current || !item) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND" };
    if (String(current.ownerId || "").trim() !== String(citizen.id || "").trim()) return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH" };

    const executionMode = String(options.executionMode || options.mode || "PLAYER_WORLD_OPERATION").trim().toUpperCase();
    const directExecution = executionMode === "ADMIN_DIRECT_OPERATION" || executionMode === "DEVELOPER_DIRECT_OPERATION";
    if (!directExecution) {
      if (typeof app.startCyberwareService !== "function") return { ok: false, reason: "CYBERWARE_WORLD_BRIDGE_UNAVAILABLE", item };
      const operationType = operation === "FIRMWARE" ? "FIRMWARE_UPDATE" : operation === "CALIBRATE" ? "CALIBRATION" : operation;
      return app.startCyberwareService({
        citizenId: String(citizen.id || "").trim(),
        operationType,
        maintenanceOperation: operation,
        instanceId: itemInstanceId,
        itemId: itemInstanceId,
        providerId: options.providerId || options.provider,
        scheduledStartAt: options.scheduledStartAt,
        paymentSource: options.paymentSource,
        coverageAuthorizations: options.coverageAuthorizations,
        firmwareReleaseId: options.firmwareReleaseId || options.releaseId,
        idempotencyKey: options.idempotencyKey || `cyberware-maintenance:${citizen.id}:${itemInstanceId}:${operation}`,
        executionMode: "PLAYER_WORLD_OPERATION"
      });
    }

    const runtime = operation === "DIAGNOSTIC"
      ? options.runtime || (typeof app.getCyberwareWorkspaceRuntime === "function" ? app.getCyberwareWorkspaceRuntime(citizen) : null)
      : null;
    const quote = buildMaintenanceQuote(citizen, item, operation, { runtime });
    if (!quote.valid) return { ok: false, reason: quote.reason || "MAINTENANCE_BLOCKED", quote, item };
    const createdAt = String(options.createdAt || getCampaignDateIso()).trim();

    if (operation === "FIRMWARE") {
      if (typeof app.installCyberwareFirmware !== "function") return { ok: false, reason: "FIRMWARE_API_UNAVAILABLE", quote, item };
      const entry = makeServiceEntry(operation, item, quote, { createdAt, provider: options.provider });
      const result = app.installCyberwareFirmware(citizen.id, itemInstanceId, {
        source: options.source || "CYBERWARE_MAINTENANCE",
        date: createdAt,
        serviceHistoryEntry: entry,
        deferPersistence: options.deferPersistence === true,
        executionMode: executionMode
      });
      if (result?.ok) emitMaintenanceUpdate(citizen.id, itemInstanceId, operation);
      return { ...result, quote, serviceEntry: result?.ok ? entry : null };
    }

    const nextCyberwareState = {
      ...(current.cyberwareState || {}),
      installedModules: Array.isArray(current.cyberwareState?.installedModules) ? clone(current.cyberwareState.installedModules) : [],
      installedFirmware: Array.isArray(current.cyberwareState?.installedFirmware) ? clone(current.cyberwareState.installedFirmware) : [],
      calibration: current.cyberwareState?.calibration && typeof current.cyberwareState.calibration === "object"
        ? clone(current.cyberwareState.calibration)
        : { profile: "FACTORY", quality: 100 },
      maintenance: current.cyberwareState?.maintenance && typeof current.cyberwareState.maintenance === "object"
        ? clone(current.cyberwareState.maintenance)
        : { cleanliness: 100 }
    };
    const patch = {};
    const detail = { createdAt, provider: options.provider };

    if (operation === "REPAIR") {
      patch.durability = {
        ...(current.durability || {}),
        current: current.durability?.maximumOverride || 100
      };
    } else if (operation === "CALIBRATE") {
      nextCyberwareState.calibration = {
        ...(nextCyberwareState.calibration || {}),
        profile: "CERTIFIED_SERVICE",
        quality: 100,
        lastCalibratedAt: createdAt
      };
    } else if (operation === "CLEAN") {
      nextCyberwareState.maintenance = {
        ...(nextCyberwareState.maintenance || {}),
        cleanliness: 100,
        lastCleanedAt: createdAt
      };
    } else {
      const diagnostic = quote.diagnostic || buildDiagnosticSnapshot(citizen, item, runtime);
      nextCyberwareState.maintenance = {
        ...(nextCyberwareState.maintenance || {}),
        lastDiagnostic: {
          createdAt,
          status: diagnostic.status,
          codes: diagnostic.codes,
          stability: diagnostic.stability,
          security: diagnostic.security
        }
      };
      detail.diagnosticStatus = diagnostic.status;
      detail.codes = diagnostic.codes;
    }

    const entry = makeServiceEntry(operation, item, quote, detail);
    patch.cyberwareState = nextCyberwareState;
    patch.serviceHistory = appendServiceHistory(current, entry);
    const result = app.updateItemInstance?.(itemInstanceId, patch, {
      source: options.source || `CYBERWARE_MAINTENANCE_${operation}`,
      deferPersistence: options.deferPersistence === true
    });
    if (result?.ok) emitMaintenanceUpdate(citizen.id, itemInstanceId, operation);
    return {
      ok: result?.ok === true,
      reason: result?.ok ? "MAINTENANCE_COMPLETED" : result?.reason || "ITEM_INSTANCE_UPDATE_FAILED",
      quote,
      serviceEntry: result?.ok ? entry : null,
      item: result?.ok ? app.getItemInstanceView?.(itemInstanceId) : item
    };
  }

  function setCyberwareMaintenanceSelection(citizenId = "", patch = {}) {
    const state = getPanelState(citizenId);
    if (patch.selectedItemId !== undefined) state.selectedItemId = String(patch.selectedItemId || "").trim();
    if (patch.operation !== undefined) {
      const operation = normalizeToken(patch.operation || DEFAULT_OPERATION);
      state.operation = OPERATION_ORDER.includes(operation) ? operation : DEFAULT_OPERATION;
    }
    if (patch.feedback !== undefined) state.feedback = patch.feedback ? clone(patch.feedback) : null;
    return clone(state);
  }

  function getCyberwareMaintenanceViewModel(citizenOrId = {}) {
    const citizen = getCitizen(citizenOrId);
    if (!citizen) return null;
    const state = getPanelState(citizen.id);
    const items = getCyberwareItemViews(citizen.id);
    if (!items.some((item) => itemId(item) === state.selectedItemId)) state.selectedItemId = itemId(items[0] || {});
    const selectedItem = items.find((item) => itemId(item) === state.selectedItemId) || null;
    const runtime = selectedItem && normalizeToken(state.operation) === "DIAGNOSTIC" && typeof app.getCyberwareWorkspaceRuntime === "function"
      ? app.getCyberwareWorkspaceRuntime(citizen)
      : null;
    const quote = selectedItem ? buildMaintenanceQuote(citizen, selectedItem, state.operation, { runtime }) : null;
    return {
      citizenId: citizen.id,
      state: clone(state),
      operations: OPERATION_ORDER.map((operation) => ({ key: operation, label: operation.replace(/_/g, " ") })),
      items,
      selectedItem,
      quote,
      calibration: selectedItem ? getCalibration(selectedItem) : null,
      maintenance: selectedItem ? getMaintenanceState(selectedItem) : null,
      firmware: selectedItem ? getFirmwareState(selectedItem) : null,
      history: selectedItem ? normalizeServiceHistory(selectedItem.serviceHistory) : [],
      serviceHistoryLimit: MAX_SERVICE_HISTORY
    };
  }

  function clearCyberwareMaintenanceFeedback(citizenId = "") {
    return setCyberwareMaintenanceSelection(citizenId, { feedback: null });
  }

  const api = app.cyberwareMaintenance = app.cyberwareMaintenance || {};
  Object.assign(api, {
    getPanelState,
    invalidateCyberwareMaintenanceContext,
    getCyberwareItemViews,
    getCyberwareMaintenanceViewModel,
    buildMaintenanceQuote,
    runCyberwareMaintenance,
    setCyberwareMaintenanceSelection,
    clearCyberwareMaintenanceFeedback,
    normalizeServiceHistory,
    makeServiceEntry,
    appendServiceHistory,
    operations: OPERATION_ORDER
  });

  Object.assign(app, {
    getCyberwareMaintenancePanelState: getPanelState,
    invalidateCyberwareMaintenanceContext,
    getCyberwareMaintenanceViewModel,
    buildCyberwareMaintenanceQuote: buildMaintenanceQuote,
    runCyberwareMaintenance,
    setCyberwareMaintenanceSelection,
    clearCyberwareMaintenanceFeedback,
    normalizeCyberwareServiceHistory: normalizeServiceHistory,
    makeCyberwareServiceEntry: makeServiceEntry,
    appendCyberwareServiceHistory: appendServiceHistory
  });
})();
