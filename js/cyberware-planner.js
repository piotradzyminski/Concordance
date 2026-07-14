window.WS_APP = window.WS_APP || {};

(function initCyberwarePlanner() {
  const app = window.WS_APP;
  const plannerStates = app.cyberwarePlannerStates = app.cyberwarePlannerStates || Object.create(null);
  const plannerProjectionCache = app.cyberwarePlannerProjectionCache = app.cyberwarePlannerProjectionCache || Object.create(null);
  const OPERATIONS = new Set(["INSTALL", "DEINSTALL", "REPLACE"]);
  const SCALE_MINUTES = {
    SMALL: { INSTALL: 90, DEINSTALL: 60 },
    MEDIUM: { INSTALL: 180, DEINSTALL: 120 },
    LARGE: { INSTALL: 360, DEINSTALL: 240 },
    FULL_SET: { INSTALL: 720, DEINSTALL: 480 }
  };

  function token(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function idOf(item = {}) {
    return String(item.instanceId || item.id || item.itemId || "").trim();
  }

  function unique(values = []) {
    return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))];
  }

  function clamp(value, min = 0, max = 1, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function normalizeOperation(value = "INSTALL") {
    const normalized = token(value);
    return OPERATIONS.has(normalized) ? normalized : "INSTALL";
  }

  function getPlannerState(citizenId = "") {
    const id = String(citizenId || "").trim();
    if (!id) return null;
    if (!plannerStates[id]) {
      plannerStates[id] = {
        operation: "INSTALL",
        sourceItemId: "",
        targetItemId: "",
        returnDestinationId: "",
        primarySlot: "",
        surgeryPreset: "LOCAL_CLINIC",
        plan: null,
        result: null
      };
    }
    return plannerStates[id];
  }

  function patchPlannerState(citizenId = "", patch = {}, options = {}) {
    const state = getPlannerState(citizenId);
    if (!state) return null;
    Object.assign(state, patch && typeof patch === "object" ? patch : {});
    state.operation = normalizeOperation(state.operation);
    if (options.keepPlan !== true) state.plan = null;
    if (options.keepResult !== true) state.result = null;
    return state;
  }

  function getCitizen(citizenId = "") {
    return typeof app.getCitizenById === "function" ? app.getCitizenById(citizenId) : null;
  }

  function getProjectionRevision() {
    const itemRevision = typeof app.getItemInstanceStoreRevision === "function" ? Number(app.getItemInstanceStoreRevision() || 0) : 0;
    const catalogRevision = typeof app.getEquipmentCatalogRevision === "function" ? Number(app.getEquipmentCatalogRevision() || 0) : 0;
    return `${itemRevision}:${catalogRevision}`;
  }

  function invalidateCyberwarePlannerContext(citizenId = "") {
    const id = String(citizenId || "").trim();
    if (id) delete plannerProjectionCache[id];
    else Object.keys(plannerProjectionCache).forEach((key) => delete plannerProjectionCache[key]);
    return true;
  }

  function buildPlannerProjection(citizenId = "") {
    const citizen = getCitizen(citizenId);
    if (!citizen) return { citizen: null, sources: [], installed: [], baseCore: null, validationCitizen: null, candidatesById: Object.create(null), slotsBySourceId: Object.create(null), revision: getProjectionRevision() };
    const equipmentViews = typeof app.getCitizenEquipmentItemInstanceViews === "function"
      ? app.getCitizenEquipmentItemInstanceViews(citizenId)
      : [];
    const sources = equipmentViews
      .filter((item) => typeof app.isEquipmentItemCyberwareInstallCandidate === "function" && app.isEquipmentItemCyberwareInstallCandidate(item))
      .filter((item) => !["INSTALLED", "REMOVED", "ARCHIVED", "CONSUMED", "DISPOSED", "IN_SERVICE"].includes(token(item.status || item.lifecycleState)))
      .sort((left, right) => String(left.name || left.id || "").localeCompare(String(right.name || right.id || "")));
    const installedViews = typeof app.getInstalledCyberwareInstanceViews === "function"
      ? app.getInstalledCyberwareInstanceViews(citizenId)
      : [];
    const installed = typeof app.normalizeCyberwareList === "function"
      ? app.normalizeCyberwareList(installedViews)
      : installedViews;
    installed.sort((left, right) => String(left.name || left.id || "").localeCompare(String(right.name || right.id || "")));
    const baseCore = typeof app.getCyberwareNeuralCoreState === "function" ? app.getCyberwareNeuralCoreState(installed) : null;
    return {
      citizen,
      sources,
      installed,
      baseCore,
      validationCitizen: { ...citizen, cyberwarePreviewList: installed },
      candidatesById: Object.create(null),
      slotsBySourceId: Object.create(null),
      revision: getProjectionRevision()
    };
  }

  function getPlannerProjection(citizenId = "", options = {}) {
    const id = String(citizenId || "").trim();
    if (!id) return buildPlannerProjection("");
    const revision = getProjectionRevision();
    const cached = plannerProjectionCache[id];
    if (options.force !== true && cached && cached.revision === revision) return cached;
    const next = buildPlannerProjection(id);
    plannerProjectionCache[id] = next;
    return next;
  }

  function getInstallSources(citizenId = "") {
    return getPlannerProjection(citizenId).sources.slice();
  }

  function getInstalledTargets(citizenId = "") {
    return getPlannerProjection(citizenId).installed.slice();
  }

  function findById(items = [], itemId = "") {
    const target = String(itemId || "").trim();
    return items.find((item) => idOf(item) === target) || null;
  }

  function getReturnDestinationOptions(citizen = {}, target = {}, source = null) {
    if (!target || typeof app.getEquipmentHousingStorageUnits !== "function" || typeof app.findFirstEquipmentHousingPlacementForItem !== "function") return [];
    const sourceId = idOf(source || {});
    return app.getEquipmentHousingStorageUnits(citizen).map((unit) => {
      const placement = app.findFirstEquipmentHousingPlacementForItem(citizen, target, unit.id, { excludeItemId: sourceId });
      if (!placement) return null;
      return { id: `HOUSING:${unit.id}`, label: `${unit.label || unit.id} / ${placement.column}.${placement.row}`, type: "HOUSING_STORAGE", storageUnitId: unit.id, placement };
    }).filter(Boolean);
  }

  function buildCandidate(sourceItem = {}, options = {}) {
    return typeof app.buildCyberwareInstallCandidateFromEquipmentItem === "function"
      ? app.buildCyberwareInstallCandidateFromEquipmentItem(sourceItem, options)
      : null;
  }

  function getSlotOptions(citizen = {}, candidate = {}, options = {}) {
    const targets = typeof app.getCyberwareDropTargets === "function"
      ? app.getCyberwareDropTargets(citizen, candidate, { ...options, relevantOnly: true, includePreview: false })
      : [];
    const usedTargets = targets.filter((entry) => entry?.usedByImplant === true);
    if (usedTargets.length) {
      return usedTargets.map((entry) => ({
        key: String(entry.key || "").trim(),
        label: String(entry.label || entry.key || "BODY SLOT").trim(),
        valid: entry.valid === true,
        status: String(entry.status || "").trim(),
        reason: String(entry.reason || "").trim(),
        candidateSlots: unique(entry.candidateSlots)
      })).filter((entry) => entry.key);
    }
    return unique(candidate.slots || candidate.bodySlots || (candidate.slot ? [candidate.slot] : [])).map((key) => ({
      key,
      label: typeof app.getCyberwareSlotLabel === "function" ? app.getCyberwareSlotLabel(key) : key,
      valid: true,
      status: "VALID",
      reason: "",
      candidateSlots: unique(candidate.slots || [key])
    }));
  }

  function normalizeSelections(citizenId = "", options = {}) {
    const state = getPlannerState(citizenId);
    const projection = getPlannerProjection(citizenId, { force: options.forceProjection === true });
    const citizen = projection.citizen;
    if (!state || !citizen) return { state, citizen, sources: [], targets: [], source: null, target: null, candidate: null, slots: [], projection };
    const sources = projection.sources;
    const targets = projection.installed;

    if ((state.operation === "INSTALL" || state.operation === "REPLACE") && !findById(sources, state.sourceItemId)) {
      state.sourceItemId = idOf(sources[0] || {});
      state.plan = null;
    }
    if ((state.operation === "DEINSTALL" || state.operation === "REPLACE") && !findById(targets, state.targetItemId)) {
      state.targetItemId = idOf(targets[0] || {});
      state.plan = null;
    }

    const source = findById(sources, state.sourceItemId);
    const target = findById(targets, state.targetItemId);
    const sourceId = idOf(source || {});
    if (source && !projection.candidatesById[sourceId]) {
      projection.candidatesById[sourceId] = buildCandidate(source, { instanceId: sourceId });
    }
    const candidate = source ? projection.candidatesById[sourceId] || null : null;
    if (candidate && !projection.slotsBySourceId[sourceId]) {
      projection.slotsBySourceId[sourceId] = getSlotOptions(projection.validationCitizen, candidate, { installedList: projection.installed, baseCore: projection.baseCore, strictPlacement: true });
    }
    const slots = candidate ? projection.slotsBySourceId[sourceId] || [] : [];
    const returnDestinations = (state.operation === "DEINSTALL" || state.operation === "REPLACE")
      ? getReturnDestinationOptions(citizen, target, state.operation === "REPLACE" ? source : null)
      : [];
    if ((state.operation === "DEINSTALL" || state.operation === "REPLACE") && !returnDestinations.some((entry) => entry.id === state.returnDestinationId)) {
      state.returnDestinationId = returnDestinations[0]?.id || "";
      state.plan = null;
    }
    const returnDestination = returnDestinations.find((entry) => entry.id === state.returnDestinationId) || null;
    if (candidate && !slots.some((entry) => entry.key === state.primarySlot)) {
      const preferred = slots.find((entry) => entry.valid) || slots[0] || null;
      state.primarySlot = preferred?.key || candidate.primarySlot || candidate.slot || candidate.slots?.[0] || "";
      state.plan = null;
    }
    return { state, citizen, sources, targets, source, target, candidate, slots, returnDestinations, returnDestination, projection };
  }

  function getSurgeryPresetOptions() {
    const presets = typeof app.getCyberwareSurgeryPresets === "function" ? app.getCyberwareSurgeryPresets() : [];
    return presets.length ? presets : [{ key: "LOCAL_CLINIC", label: "Local Clinic", provider: "LOCAL_CLINIC", procedureMode: "STANDARD", costFactor: 1 }];
  }

  function calculateProcedureDuration(item = {}, operation = "INSTALL", preview = {}) {
    const scale = token(item.scale || "SMALL");
    const normalizedOperation = normalizeOperation(operation) === "DEINSTALL" ? "DEINSTALL" : "INSTALL";
    const base = Number(SCALE_MINUTES[scale]?.[normalizedOperation] || SCALE_MINUTES.SMALL[normalizedOperation]);
    const slotCount = Math.max(1, unique(item.slots || item.bodySlots || preview.occupiedSlots || preview.freedSlots).length);
    const context = preview.surgeryContext || {};
    const care = token(context.medicalCare || "CLINIC");
    const mode = token(context.procedureMode || "STANDARD");
    const careFactor = care === "TRAUMA" || care === "ADVANCED" ? 0.7 : care === "FIELD" || care === "UNSUPPORTED" ? 1.45 : 1;
    const modeFactor = mode === "EMERGENCY" ? 0.65 : mode === "CONTROLLED" ? 1.1 : 1;
    return Math.max(30, Math.round((base + Math.max(0, slotCount - 1) * 20) * careFactor * modeFactor / 5) * 5);
  }

  function getRiskBand(acceptanceChance = null, valid = true) {
    if (!valid) return "BLOCKED";
    if (acceptanceChance === null || acceptanceChance === undefined) return "CONTROLLED";
    const chance = clamp(acceptanceChance, 0, 1, 0);
    if (chance < 0.25) return "CRITICAL";
    if (chance < 0.5) return "HIGH";
    if (chance < 0.75) return "ELEVATED";
    return "STANDARD";
  }

  function buildRequirementSummary(item = {}, preview = {}) {
    const access = preview.access || preview.slotValidation?.access || {};
    return {
      neurochipTier: Number(item.requiresNeurochipTier || item.requiredNeurochipTier || 0),
      interfaceTier: Number(item.requiresInterfaceTier || item.requiredInterfaceTier || 0),
      protocols: unique(item.requiredProtocols || item.protocolRequirements || []),
      buses: unique(item.requiredBuses || []),
      licenseRequired: item.licenseRequired === true,
      subscriptionRequired: item.subscriptionRequired === true,
      firmwareRequired: item.firmwareRequired === true,
      accessBlockers: unique(access.blockers),
      accessWarnings: unique(access.warnings)
    };
  }

  function itemFingerprint(item = {}) {
    const location = item.locationData && typeof item.locationData === "object" ? item.locationData : {};
    return [
      idOf(item),
      token(item.lifecycleState),
      token(location.type || item.location),
      String(item.condition ?? item.durability?.current ?? ""),
      token(item.status),
      token(item.operatingStatus),
      unique(item.slots || item.bodySlots).sort().join(","),
      token(item.licenseStatus),
      token(item.subscriptionStatus),
      token(item.firmwareStatus),
      String(item.firmwareVersion || "")
    ].join("|");
  }

  function hashText(value = "") {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36).toUpperCase();
  }

  function buildPlanIdentity(plan = {}, installed = []) {
    const material = [
      plan.operation,
      plan.citizenId,
      plan.sourceItemId,
      plan.targetItemId,
      plan.primarySlot,
      plan.returnDestinationId,
      plan.surgeryPreset,
      itemFingerprint(plan.sourceItem || {}),
      itemFingerprint(plan.targetItem || {}),
      ...installed.map(itemFingerprint).sort()
    ].join("::");
    return `CWP-${hashText(material)}`;
  }

  function createBasePlan(context = {}) {
    const operation = normalizeOperation(context.state.operation);
    const usesSource = operation !== "DEINSTALL";
    const usesTarget = operation !== "INSTALL";
    return {
      schemaVersion: 1,
      operation,
      citizenId: String(context.citizen?.id || "").trim(),
      sourceItemId: usesSource ? idOf(context.source || {}) : "",
      targetItemId: usesTarget ? idOf(context.target || {}) : "",
      returnDestinationId: usesTarget ? String(context.state.returnDestinationId || "").trim() : "",
      returnDestination: usesTarget && context.returnDestination ? clone(context.returnDestination) : null,
      primarySlot: usesSource ? String(context.state.primarySlot || "").trim() : "",
      surgeryPreset: String(context.state.surgeryPreset || "LOCAL_CLINIC").trim(),
      valid: false,
      status: "BLOCKED",
      reason: "PLAN_INCOMPLETE",
      blockers: [],
      warnings: [],
      sourceItem: usesSource && context.source ? clone(context.source) : null,
      targetItem: usesTarget && context.target ? clone(context.target) : null,
      candidate: usesSource && context.candidate ? clone(context.candidate) : null,
      installPreview: null,
      deinstallPreview: null,
      procedureCost: 0,
      currency: "ENCODED_CREDITS",
      durationMinutes: 0,
      acceptanceChance: null,
      rejectionChance: null,
      riskBand: "BLOCKED",
      occupiedSlots: [],
      freedSlots: [],
      requirements: {},
      generatedAt: new Date().toISOString(),
      planId: ""
    };
  }

  function buildInstallPlan(context = {}) {
    const plan = createBasePlan(context);
    if (!context.source || !context.candidate) {
      plan.reason = "INSTALL_SOURCE_REQUIRED";
      plan.blockers = [plan.reason];
      return plan;
    }
    const slotOption = context.slots.find((entry) => entry.key === context.state.primarySlot) || context.slots[0] || null;
    const primarySlot = slotOption?.key || context.state.primarySlot || context.candidate.primarySlot || context.candidate.slot || "";
    const candidateSlots = unique(slotOption?.candidateSlots?.length ? slotOption.candidateSlots : (typeof app.resolveCyberwareCandidateSlotsForDrop === "function" ? app.resolveCyberwareCandidateSlotsForDrop(context.candidate, primarySlot) : context.candidate.slots));
    const preview = typeof app.buildCyberwareInstallPreview === "function"
      ? app.buildCyberwareInstallPreview(context.citizen, context.candidate, {
          surgeryPreset: context.state.surgeryPreset,
          primarySlot,
          candidateSlots,
          intentStatus: "INSTALLED",
          installedList: context.projection?.installed || context.targets || [],
          baseCore: context.projection?.baseCore || null
        })
      : null;
    if (!preview) {
      plan.reason = "INSTALL_PREVIEW_UNAVAILABLE";
      plan.blockers = [plan.reason];
      return plan;
    }
    plan.primarySlot = primarySlot;
    plan.installPreview = clone(preview);
    plan.valid = preview.valid === true;
    plan.status = String(preview.status || (plan.valid ? "VALID" : "BLOCKED"));
    plan.reason = String(preview.reason || plan.status);
    plan.blockers = unique(preview.blockers);
    plan.warnings = unique(preview.warnings);
    plan.procedureCost = Number(preview.procedureCost?.finalCost || 0);
    plan.currency = String(preview.procedureCost?.currency || "ENCODED_CREDITS");
    plan.durationMinutes = calculateProcedureDuration(context.candidate, "INSTALL", preview);
    plan.acceptanceChance = clamp(preview.acceptanceChance, 0, 1, 0);
    plan.rejectionChance = clamp(preview.rejectionChance, 0, 1, 1);
    plan.riskBand = getRiskBand(plan.acceptanceChance, plan.valid);
    plan.occupiedSlots = unique(preview.occupiedSlots);
    plan.requirements = buildRequirementSummary(context.candidate, preview);
    return plan;
  }

  function buildDeinstallPlan(context = {}) {
    const plan = createBasePlan(context);
    if (!context.target) {
      plan.reason = "DEINSTALL_TARGET_REQUIRED";
      plan.blockers = [plan.reason];
      return plan;
    }
    const preview = typeof app.buildCyberwareDeinstallPreview === "function"
      ? app.buildCyberwareDeinstallPreview(context.citizen, context.target, { surgeryPreset: context.state.surgeryPreset })
      : null;
    if (!preview) {
      plan.reason = "DEINSTALL_PREVIEW_UNAVAILABLE";
      plan.blockers = [plan.reason];
      return plan;
    }
    plan.deinstallPreview = clone(preview);
    plan.blockers = unique([...(preview.blockers || []), ...(context.returnDestination ? [] : ["RETURN_LOCATION_REQUIRED"])]);
    plan.valid = preview.valid === true && Boolean(context.returnDestination);
    plan.status = String(plan.valid ? (preview.status || "DEINSTALL_READY") : "BLOCKED");
    plan.reason = plan.blockers[0] || String(preview.reason || plan.status);
    plan.warnings = unique(preview.warnings);
    plan.procedureCost = Number(preview.procedureCost?.finalCost || 0);
    plan.currency = String(preview.procedureCost?.currency || "ENCODED_CREDITS");
    plan.durationMinutes = calculateProcedureDuration(context.target, "DEINSTALL", preview);
    plan.riskBand = getRiskBand(null, plan.valid);
    plan.freedSlots = unique(preview.freedSlots);
    plan.requirements = buildRequirementSummary(context.target, preview);
    return plan;
  }

  function buildReplacePlan(context = {}) {
    const plan = createBasePlan(context);
    if (!context.source || !context.candidate) {
      plan.reason = "REPLACEMENT_SOURCE_REQUIRED";
      plan.blockers = [plan.reason];
      return plan;
    }
    if (!context.target) {
      plan.reason = "REPLACEMENT_TARGET_REQUIRED";
      plan.blockers = [plan.reason];
      return plan;
    }
    if (idOf(context.source) === idOf(context.target)) {
      plan.reason = "REPLACEMENT_SOURCE_EQUALS_TARGET";
      plan.blockers = [plan.reason];
      return plan;
    }

    const deinstallPreview = typeof app.buildCyberwareDeinstallPreview === "function"
      ? app.buildCyberwareDeinstallPreview(context.citizen, context.target, { surgeryPreset: context.state.surgeryPreset, operation: "REPLACE" })
      : null;
    if (!deinstallPreview) {
      plan.reason = "REPLACEMENT_DEINSTALL_PREVIEW_UNAVAILABLE";
      plan.blockers = [plan.reason];
      return plan;
    }

    const installed = context.projection?.installed || context.targets || [];
    const listAfterRemoval = installed.filter((item) => idOf(item) !== idOf(context.target));
    const previewCitizen = { ...context.citizen, cyberwarePreviewList: listAfterRemoval };
    const slotOption = context.slots.find((entry) => entry.key === context.state.primarySlot) || context.slots[0] || null;
    const primarySlot = slotOption?.key || context.state.primarySlot || context.candidate.primarySlot || context.candidate.slot || "";
    const candidateSlots = unique(slotOption?.candidateSlots?.length ? slotOption.candidateSlots : (typeof app.resolveCyberwareCandidateSlotsForDrop === "function" ? app.resolveCyberwareCandidateSlotsForDrop(context.candidate, primarySlot) : context.candidate.slots));
    const installPreview = typeof app.buildCyberwareInstallPreview === "function"
      ? app.buildCyberwareInstallPreview(previewCitizen, context.candidate, {
          surgeryPreset: context.state.surgeryPreset,
          primarySlot,
          candidateSlots,
          intentStatus: "INSTALLED",
          installedList: listAfterRemoval,
          baseCore: typeof app.getCyberwareNeuralCoreState === "function" ? app.getCyberwareNeuralCoreState(listAfterRemoval) : null
        })
      : null;
    if (!installPreview) {
      plan.reason = "REPLACEMENT_INSTALL_PREVIEW_UNAVAILABLE";
      plan.blockers = [plan.reason];
      return plan;
    }

    plan.primarySlot = primarySlot;
    plan.deinstallPreview = clone(deinstallPreview);
    plan.installPreview = clone(installPreview);
    plan.blockers = unique([...(deinstallPreview.blockers || []), ...(installPreview.blockers || []), ...(context.returnDestination ? [] : ["RETURN_LOCATION_REQUIRED"])]);
    plan.valid = deinstallPreview.valid === true && installPreview.valid === true && Boolean(context.returnDestination);
    plan.status = plan.valid ? String(installPreview.status || "VALID") : "BLOCKED";
    plan.warnings = unique([...(deinstallPreview.warnings || []), ...(installPreview.warnings || [])]);
    plan.reason = plan.blockers[0] || String(installPreview.reason || deinstallPreview.reason || plan.status);
    plan.procedureCost = Number(deinstallPreview.procedureCost?.finalCost || 0) + Number(installPreview.procedureCost?.finalCost || 0);
    plan.currency = String(installPreview.procedureCost?.currency || deinstallPreview.procedureCost?.currency || "ENCODED_CREDITS");
    plan.durationMinutes = calculateProcedureDuration(context.target, "DEINSTALL", deinstallPreview) + calculateProcedureDuration(context.candidate, "INSTALL", installPreview);
    plan.acceptanceChance = clamp(installPreview.acceptanceChance, 0, 1, 0);
    plan.rejectionChance = clamp(installPreview.rejectionChance, 0, 1, 1);
    plan.riskBand = getRiskBand(plan.acceptanceChance, plan.valid);
    plan.occupiedSlots = unique(installPreview.occupiedSlots);
    plan.freedSlots = unique(deinstallPreview.freedSlots);
    plan.requirements = buildRequirementSummary(context.candidate, installPreview);
    return plan;
  }

  function buildCyberwareOperationPlan(citizenId = "", options = {}) {
    const state = getPlannerState(citizenId);
    if (!state || !getCitizen(citizenId)) {
      return { valid: false, status: "BLOCKED", reason: "CITIZEN_NOT_FOUND", blockers: ["CITIZEN_NOT_FOUND"], planId: "" };
    }
    if (options.operation) state.operation = normalizeOperation(options.operation);
    if (options.sourceItemId !== undefined) state.sourceItemId = String(options.sourceItemId || "").trim();
    if (options.targetItemId !== undefined) state.targetItemId = String(options.targetItemId || "").trim();
    if (options.returnDestinationId !== undefined) state.returnDestinationId = String(options.returnDestinationId || "").trim();
    if (options.primarySlot !== undefined) state.primarySlot = String(options.primarySlot || "").trim();
    if (options.surgeryPreset !== undefined) state.surgeryPreset = String(options.surgeryPreset || "LOCAL_CLINIC").trim();
    const context = normalizeSelections(citizenId, { forceProjection: options.forceProjection === true });
    let plan = context.state.operation === "DEINSTALL"
      ? buildDeinstallPlan(context)
      : context.state.operation === "REPLACE"
        ? buildReplacePlan(context)
        : buildInstallPlan(context);
    plan.planId = buildPlanIdentity(plan, context.targets);
    return plan;
  }

  function analyzeCyberwarePlanner(citizenId = "", options = {}) {
    const state = getPlannerState(citizenId);
    if (!state) return { ok: false, reason: "CITIZEN_ID_REQUIRED" };
    const plan = buildCyberwareOperationPlan(citizenId, options);
    state.plan = clone(plan);
    state.result = null;
    return { ok: true, plan: clone(plan) };
  }

  function commitCyberwareOperationPlan(citizenId = "", expectedPlanId = "", options = {}) {
    const state = getPlannerState(citizenId);
    if (!state) return { ok: false, reason: "CITIZEN_ID_REQUIRED" };
    const currentPlan = buildCyberwareOperationPlan(citizenId);
    if (!currentPlan.planId || String(expectedPlanId || state.plan?.planId || "") !== currentPlan.planId) {
      const result = { ok: false, reason: "CYBERWARE_PLAN_STALE", plan: currentPlan };
      state.plan = clone(currentPlan);
      state.result = clone(result);
      return result;
    }
    if (!currentPlan.valid) {
      const result = { ok: false, reason: currentPlan.reason || "CYBERWARE_PLAN_BLOCKED", plan: currentPlan };
      state.plan = clone(currentPlan);
      state.result = clone(result);
      return result;
    }

    const executionMode = String(options.executionMode || options.mode || "PLAYER_WORLD_OPERATION").trim().toUpperCase();
    const directExecution = executionMode === "ADMIN_DIRECT_OPERATION" || executionMode === "DEVELOPER_DIRECT_OPERATION";
    if (!directExecution) {
      if (typeof app.startCyberwareService !== "function") {
        const result = { ok: false, reason: "CYBERWARE_WORLD_BRIDGE_UNAVAILABLE", plan: currentPlan };
        state.result = clone(result);
        state.plan = clone(currentPlan);
        return result;
      }
      const bridgeResult = app.startCyberwareService({
        citizenId,
        operationType: currentPlan.operation,
        sourceItemId: currentPlan.sourceItemId,
        targetItemId: currentPlan.targetItemId,
        instanceIds: [currentPlan.sourceItemId, currentPlan.targetItemId].filter(Boolean),
        returnDestinationId: state.returnDestinationId,
        returnDestination: currentPlan.returnDestination,
        primarySlot: currentPlan.primarySlot,
        targetBodySlots: currentPlan.occupiedSlots,
        surgeryPreset: state.surgeryPreset,
        providerId: options.providerId,
        scheduledStartAt: options.scheduledStartAt,
        paymentSource: options.paymentSource,
        coverageAuthorizations: options.coverageAuthorizations,
        idempotencyKey: options.idempotencyKey || `cyberware-planner:${citizenId}:${currentPlan.planId}`,
        plan: currentPlan,
        executionMode: "PLAYER_WORLD_OPERATION"
      });
      const normalizedBridgeResult = {
        ...bridgeResult,
        operation: currentPlan.operation,
        operationType: currentPlan.operation,
        worldOperation: bridgeResult?.operation || null,
        planId: currentPlan.planId,
        committedAt: bridgeResult?.ok && bridgeResult?.status !== "SCHEDULED" ? new Date().toISOString() : ""
      };
      state.result = clone(normalizedBridgeResult);
      state.plan = bridgeResult?.ok ? null : clone(currentPlan);
      if (bridgeResult?.ok === true && bridgeResult?.status !== "SCHEDULED") invalidateCyberwarePlannerContext(citizenId);
      return normalizedBridgeResult;
    }

    const commitOptions = {
      surgeryPreset: state.surgeryPreset,
      primarySlot: currentPlan.primarySlot,
      candidateSlots: currentPlan.occupiedSlots,
      returnDestination: currentPlan.returnDestination,
      ...options,
      deferPersistence: options.deferPersistence !== false
    };
    let result;
    if (currentPlan.operation === "DEINSTALL") {
      result = typeof app.commitCyberwareDeinstallPlan === "function"
        ? app.commitCyberwareDeinstallPlan(citizenId, currentPlan.targetItemId, commitOptions)
        : { ok: false, reason: "CYBERWARE_DEINSTALL_COMMIT_UNAVAILABLE" };
    } else if (currentPlan.operation === "REPLACE") {
      result = typeof app.commitCyberwareReplaceFromEquipment === "function"
        ? app.commitCyberwareReplaceFromEquipment(citizenId, currentPlan.sourceItemId, currentPlan.targetItemId, commitOptions)
        : { ok: false, reason: "CYBERWARE_REPLACE_COMMIT_UNAVAILABLE" };
    } else {
      result = typeof app.commitCyberwareInstallFromEquipment === "function"
        ? app.commitCyberwareInstallFromEquipment(citizenId, currentPlan.sourceItemId, commitOptions)
        : { ok: false, reason: "CYBERWARE_INSTALL_COMMIT_UNAVAILABLE" };
    }

    const normalizedResult = {
      ...result,
      operation: currentPlan.operation,
      planId: currentPlan.planId,
      committedAt: new Date().toISOString()
    };
    state.result = clone(normalizedResult);
    state.plan = null;
    if (normalizedResult.ok === true) invalidateCyberwarePlannerContext(citizenId);
    return normalizedResult;
  }

  function formatToken(value = "") {
    return String(value || "").replace(/[:_]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function formatCredits(value = 0) {
    return `${Math.max(0, Math.round(Number(value || 0))).toLocaleString("en-US")} ₡`;
  }

  function formatDuration(minutes = 0) {
    const total = Math.max(0, Math.round(Number(minutes || 0)));
    const hours = Math.floor(total / 60);
    const remainder = total % 60;
    if (!hours) return `${remainder} MIN`;
    return remainder ? `${hours} H ${remainder} MIN` : `${hours} H`;
  }

  function formatPercent(value = 0) {
    return `${Math.round(clamp(value, 0, 1, 0) * 100)}%`;
  }

  function getPlannerViewModel(citizenId = "") {
    const context = normalizeSelections(citizenId);
    return {
      ...context,
      presets: getSurgeryPresetOptions(),
      plan: context.state?.plan ? clone(context.state.plan) : null,
      result: context.state?.result ? clone(context.state.result) : null
    };
  }

  function rerenderPlannerWorkspace(citizenId = "", options = {}) {
    const id = String(citizenId || "").trim();
    if (options.refreshCyberware === true && typeof (app.refreshCyberwareWorkspace || app.refreshEquipmentCyberwareWorkspace) === "function") {
      (app.refreshCyberwareWorkspace || app.refreshEquipmentCyberwareWorkspace)(id, {
        forceRuntime: options.forceRuntime === true,
        refreshPlanner: true,
        mountPlanner: true
      });
      return;
    }
    if (typeof app.refreshCyberwarePlannerPanel === "function") {
      app.refreshCyberwarePlannerPanel(id, { mount: true });
      return;
    }
    if (typeof app.refreshEquipmentWorkspace === "function") {
      app.refreshEquipmentWorkspace(app.currentUser, { bodymap: false, storage: false, inspector: false, index: false, refreshPlanner: true });
    } else if (typeof app.renderEquipmentModule === "function") {
      app.renderEquipmentModule(app.currentUser);
    }
  }

  function getPlannerCitizenId(target = null) {
    const shell = target?.closest?.("[data-cyberware-module-shell], [data-equipment-module-shell]")
      || document.querySelector?.("[data-cyberware-module-shell], [data-equipment-module-shell]");
    return String(shell?.dataset?.cyberwareCitizenId || shell?.dataset?.equipmentCitizenId || "").trim();
  }

  function handlePlannerClick(event) {
    const target = event.target?.closest?.("[data-cyberware-planner-action]");
    if (!target) return;
    const citizenId = getPlannerCitizenId(target);
    if (!citizenId) return;
    const action = String(target.dataset.cyberwarePlannerAction || "").trim();
    if (action === "operation") {
      patchPlannerState(citizenId, { operation: normalizeOperation(target.dataset.operation) });
      rerenderPlannerWorkspace(citizenId);
      return;
    }
    if (action === "select-target") {
      patchPlannerState(citizenId, { operation: "DEINSTALL", targetItemId: String(target.dataset.itemId || "").trim() });
      app.setCyberwareUiView?.(citizenId, "PLANNER", { mount: false });
      rerenderPlannerWorkspace(citizenId);
      return;
    }
    if (action === "replace-target") {
      patchPlannerState(citizenId, { operation: "REPLACE", targetItemId: String(target.dataset.itemId || "").trim() });
      app.setCyberwareUiView?.(citizenId, "PLANNER", { mount: false });
      rerenderPlannerWorkspace(citizenId);
      return;
    }
    if (action === "analyze") {
      analyzeCyberwarePlanner(citizenId);
      rerenderPlannerWorkspace(citizenId);
      return;
    }
    if (action === "confirm") {
      commitCyberwareOperationPlan(citizenId, String(target.dataset.planId || "").trim());
      rerenderPlannerWorkspace(citizenId, { refreshCyberware: true, forceRuntime: true });
      return;
    }
    if (action === "clear") {
      patchPlannerState(citizenId, { plan: null, result: null }, { keepPlan: true, keepResult: true });
      const state = getPlannerState(citizenId);
      state.plan = null;
      state.result = null;
      rerenderPlannerWorkspace(citizenId);
    }
  }

  function handlePlannerChange(event) {
    const control = event.target?.closest?.("[data-cyberware-planner-field]");
    if (!control) return;
    const citizenId = getPlannerCitizenId(control);
    if (!citizenId) return;
    const field = String(control.dataset.cyberwarePlannerField || "").trim();
    const allowed = new Set(["sourceItemId", "targetItemId", "returnDestinationId", "primarySlot", "surgeryPreset"]);
    if (!allowed.has(field)) return;
    patchPlannerState(citizenId, { [field]: String(control.value || "").trim() });
    rerenderPlannerWorkspace(citizenId);
  }

  if (typeof document !== "undefined" && !app.cyberwarePlannerDelegatesBound) {
    document.addEventListener("click", handlePlannerClick);
    document.addEventListener("change", handlePlannerChange);
    app.cyberwarePlannerDelegatesBound = true;
  }

  app.cyberwarePlanner = {
    getPlannerState,
    patchPlannerState,
    getPlannerProjection,
    invalidateCyberwarePlannerContext,
    getInstallSources,
    getInstalledTargets,
    getReturnDestinationOptions,
    getSlotOptions,
    getSurgeryPresetOptions,
    calculateProcedureDuration,
    buildCyberwareOperationPlan,
    analyzeCyberwarePlanner,
    commitCyberwareOperationPlan,
    getPlannerViewModel,
    formatToken,
    formatCredits,
    formatDuration,
    formatPercent
  };

  app.getCyberwarePlannerState = getPlannerState;
  app.getCyberwarePlannerProjection = getPlannerProjection;
  app.invalidateCyberwarePlannerContext = invalidateCyberwarePlannerContext;
  app.patchCyberwarePlannerState = patchPlannerState;
  app.getCyberwarePlannerInstallSources = getInstallSources;
  app.getCyberwarePlannerInstalledTargets = getInstalledTargets;
  app.getCyberwarePlannerReturnDestinationOptions = getReturnDestinationOptions;
  app.buildCyberwareOperationPlan = buildCyberwareOperationPlan;
  app.analyzeCyberwarePlanner = analyzeCyberwarePlanner;
  app.commitCyberwareOperationPlan = commitCyberwareOperationPlan;
  app.getCyberwarePlannerViewModel = getPlannerViewModel;
})();
