window.WS_APP = window.WS_APP || {};

(function initCyberwareWorkspace() {
  const app = window.WS_APP;
  const escapeHtml = app.escapeEquipmentHtml || ((value = "") => String(value ?? ""));
  const runtimeCache = app.cyberwareWorkspaceRuntimeCache = app.cyberwareWorkspaceRuntimeCache || Object.create(null);
  const plannerPanelState = app.cyberwarePlannerPanelStateByCitizen = app.cyberwarePlannerPanelStateByCitizen || Object.create(null);
  const diagnosticsPanelState = app.cyberwareDiagnosticsPanelStateByCitizen = app.cyberwareDiagnosticsPanelStateByCitizen || Object.create(null);
  const maintenancePanelState = app.cyberwareMaintenancePanelStateByCitizen = app.cyberwareMaintenancePanelStateByCitizen || Object.create(null);
  const uiStateByCitizen = app.cyberwareUiStateByCitizen = app.cyberwareUiStateByCitizen || Object.create(null);
  const CYBERWARE_UI_VIEWS = ["OVERVIEW", "BODYMAP", "SYSTEMS", "CORE_STACK", "PLANNER", "DIAGNOSTICS", "MAINTENANCE", "HISTORY"];
  const CYBERWARE_UI_LABELS = { OVERVIEW: "Overview", BODYMAP: "Bodymap", SYSTEMS: "Installed Systems", CORE_STACK: "Core Stack", PLANNER: "Planner", DIAGNOSTICS: "Diagnostics", MAINTENANCE: "Maintenance", HISTORY: "History" };
  const CYBERWARE_UI_SECTIONS = [
    { key: "SYSTEMS", label: "Systems", description: "Overview / Bodymap / Installed Systems", defaultView: "OVERVIEW", views: ["OVERVIEW", "BODYMAP", "SYSTEMS"] },
    { key: "NEURAL_CORE", label: "Neural Core", description: "Core Stack / Diagnostics", defaultView: "CORE_STACK", views: ["CORE_STACK", "DIAGNOSTICS"] },
    { key: "OPERATIONS", label: "Operations", description: "Planner / Maintenance / History", defaultView: "PLANNER", views: ["PLANNER", "MAINTENANCE", "HISTORY"] }
  ];
  const CYBERWARE_UI_SECTION_MAP = Object.fromEntries(CYBERWARE_UI_SECTIONS.map((section) => [section.key, section]));
  const CYBERWARE_UI_VIEW_SECTION = Object.fromEntries(CYBERWARE_UI_SECTIONS.flatMap((section) => section.views.map((view) => [view, section.key])));
  const CYBERWARE_BODYMAP_ASSETS = Object.freeze({
    front: "assets/bodymap_front.jpg",
    back: "assets/bodymap_back.jpg"
  });
  const CYBERWARE_BODYMAP_POINTS = {
    neural: [50, 7, "back"], interface: [50, 11, "back"], neckService: [50, 15, "back"],
    leftEye: [46, 9, "front"], rightEye: [54, 9, "front"], leftEar: [41, 11, "front"], rightEar: [59, 11, "front"], face: [50, 13, "front"],
    cardiac: [48, 31, "front"], leftLung: [44, 29, "front"], rightLung: [56, 29, "front"], liver: [45, 39, "front"], leftKidney: [44, 43, "back"], rightKidney: [56, 43, "back"],
    spineCore: [50, 34, "back"], torsoCore: [50, 34, "front"], pelvisCore: [50, 51, "front"],
    leftShoulder: [35, 23, "front"], rightShoulder: [65, 23, "front"], leftUpperArm: [29, 31, "front"], rightUpperArm: [71, 31, "front"],
    leftForearm: [24, 42, "front"], rightForearm: [76, 42, "front"], leftHandCore: [19, 53, "front"], rightHandCore: [81, 53, "front"],
    leftLegCore: [43, 66, "front"], rightLegCore: [57, 66, "front"], leftKnee: [43, 74, "front"], rightKnee: [57, 74, "front"], leftFootCore: [43, 92, "front"], rightFootCore: [57, 92, "front"]
  };

  function getCitizen(citizenId = "") {
    const id = String(citizenId || "").trim();
    return id && typeof app.getCitizenById === "function" ? app.getCitizenById(id) : null;
  }

  function getCyberwareWorkspaceRuntime(citizen = {}, options = {}) {
    const citizenId = String(citizen?.id || "").trim();
    if (!citizenId) return { installed: [], counts: {}, neuralCore: {} };
    if (options.force !== true && runtimeCache[citizenId]?.runtime) return runtimeCache[citizenId].runtime;
    const runtime = typeof app.getCyberwareRuntimeState === "function"
      ? app.getCyberwareRuntimeState(citizen)
      : { installed: [], counts: {}, neuralCore: {} };
    runtimeCache[citizenId] = { citizenId, runtime };
    return runtime;
  }

  function getCyberwareWorkspaceRoot(citizenId = "") {
    const root = document.querySelector?.("[data-cyberware-module-shell]")
      || document.querySelector?.("[data-equipment-module-shell]")
      || null;
    if (!root) return null;
    const id = String(citizenId || "").trim();
    const rootCitizenId = String(root.dataset.cyberwareCitizenId || root.dataset.equipmentCitizenId || "").trim();
    return !id || rootCitizenId === id ? root : null;
  }

  function getCyberwareWorkspaceElement(root = null) {
    return root?.querySelector?.("[data-cyberware-workspace]")
      || root?.querySelector?.('[data-equipment-panel="cyberware-workspace"]')
      || null;
  }

  function invalidateCyberwareWorkspaceRuntime(citizenId = "", options = {}) {
    const id = String(citizenId || "").trim();
    if (id) delete runtimeCache[id];
    else Object.keys(runtimeCache).forEach((key) => delete runtimeCache[key]);
    if (options.planner !== false && typeof app.invalidateCyberwarePlannerContext === "function") {
      app.invalidateCyberwarePlannerContext(id);
    }
    const root = getCyberwareWorkspaceRoot(id);
    const workspace = getCyberwareWorkspaceElement(root);
    const legacyScreen = root?.querySelector?.('[data-equipment-screen="CYBERWARE"]') || null;
    if (workspace) workspace.dataset.cyberwareWorkspaceDirty = "true";
    if (legacyScreen) legacyScreen.dataset.equipmentScreenDirty = "true";
    const plannerHost = workspace?.querySelector?.("[data-cyberware-planner-host]") || null;
    if (plannerHost && options.planner !== false) plannerHost.dataset.cyberwarePlannerDirty = "true";
    const diagnosticsHost = workspace?.querySelector?.("[data-cyberware-diagnostics-host]") || null;
    if (diagnosticsHost && options.diagnostics !== false) diagnosticsHost.dataset.cyberwareDiagnosticsDirty = "true";
    const maintenanceHost = workspace?.querySelector?.("[data-cyberware-maintenance-host]") || null;
    if (maintenanceHost && options.maintenance !== false) maintenanceHost.dataset.cyberwareMaintenanceDirty = "true";
    return true;
  }

  function getPlannerPanelState(citizenId = "") {
    const id = String(citizenId || "").trim();
    if (!id) return { open: false };
    if (!plannerPanelState[id]) plannerPanelState[id] = { open: false };
    return plannerPanelState[id];
  }

  function getDiagnosticsPanelState(citizenId = "") {
    const id = String(citizenId || "").trim();
    if (!id) return { open: false };
    if (!diagnosticsPanelState[id]) diagnosticsPanelState[id] = { open: false };
    return diagnosticsPanelState[id];
  }

  function getMaintenancePanelState(citizenId = "") {
    const id = String(citizenId || "").trim();
    if (!id) return { open: false };
    if (!maintenancePanelState[id]) maintenancePanelState[id] = { open: false };
    return maintenancePanelState[id];
  }

  function normalizeCyberwareUiView(value = "OVERVIEW") {
    const view = String(value || "OVERVIEW").trim().toUpperCase();
    return CYBERWARE_UI_VIEWS.includes(view) ? view : "OVERVIEW";
  }

  function normalizeCyberwareUiSection(value = "SYSTEMS") {
    const section = String(value || "SYSTEMS").trim().toUpperCase();
    return CYBERWARE_UI_SECTION_MAP[section] ? section : "SYSTEMS";
  }

  function normalizeCyberwareBodymapView(value = "front") {
    return String(value || "front").trim().toLowerCase() === "back" ? "back" : "front";
  }

  function normalizeCyberwareOperationsInspectorRole(value = "AUTO") {
    const role = String(value || "AUTO").trim().toUpperCase();
    return ["AUTO", "SOURCE", "TARGET"].includes(role) ? role : "AUTO";
  }

  function normalizeCyberwareHistoryFilter(value = "ALL") {
    return String(value || "ALL").trim().toUpperCase() === "SELECTED" ? "SELECTED" : "ALL";
  }

  function getCyberwareUiSectionForView(value = "OVERVIEW") {
    return CYBERWARE_UI_VIEW_SECTION[normalizeCyberwareUiView(value)] || "SYSTEMS";
  }

  function getCyberwareUiSectionDefaultView(value = "SYSTEMS") {
    const section = normalizeCyberwareUiSection(value);
    return CYBERWARE_UI_SECTION_MAP[section]?.defaultView || "OVERVIEW";
  }

  function normalizeCyberwareSectionView(section = "SYSTEMS", view = "") {
    const normalizedSection = normalizeCyberwareUiSection(section);
    const normalizedView = normalizeCyberwareUiView(view || getCyberwareUiSectionDefaultView(normalizedSection));
    return getCyberwareUiSectionForView(normalizedView) === normalizedSection
      ? normalizedView
      : getCyberwareUiSectionDefaultView(normalizedSection);
  }

  function getCyberwareUiState(citizenId = "") {
    const id = String(citizenId || "").trim();
    const createState = () => ({
      activeSection: "SYSTEMS",
      activeView: "OVERVIEW",
      selectedInstanceId: "",
      bodymapView: "front",
      bodymapRegion: "BODY",
      bodymapOrientationByRegion: {},
      selectedAnchorId: "",
      operationsInspectorRole: "AUTO",
      historyFilter: "ALL",
      sectionViews: Object.fromEntries(CYBERWARE_UI_SECTIONS.map((section) => [section.key, section.defaultView]))
    });
    if (!id) return createState();
    if (!uiStateByCitizen[id]) uiStateByCitizen[id] = createState();
    const state = uiStateByCitizen[id];
    state.activeView = normalizeCyberwareUiView(state.activeView);
    state.activeSection = getCyberwareUiSectionForView(state.activeView);
    state.selectedInstanceId = String(state.selectedInstanceId || "").trim();
    state.bodymapView = normalizeCyberwareBodymapView(state.bodymapView);
    app.cyberwareAnatomyBodymap?.ensureState?.(state);
    state.operationsInspectorRole = normalizeCyberwareOperationsInspectorRole(state.operationsInspectorRole);
    state.historyFilter = normalizeCyberwareHistoryFilter(state.historyFilter);
    if (!state.sectionViews || typeof state.sectionViews !== "object") state.sectionViews = {};
    CYBERWARE_UI_SECTIONS.forEach((section) => {
      state.sectionViews[section.key] = normalizeCyberwareSectionView(section.key, state.sectionViews[section.key]);
    });
    state.sectionViews[state.activeSection] = state.activeView;
    return state;
  }

  function renderCyberwareUiNavigation(activeView = "OVERVIEW", citizenId = "") {
    const active = normalizeCyberwareUiView(activeView);
    const activeSection = getCyberwareUiSectionForView(active);
    const indexOpen = app.getCyberwareIndexState?.(citizenId)?.open === true;
    const sectionTabs = CYBERWARE_UI_SECTIONS.map((section) => {
      const selected = activeSection === section.key;
      return `<button class="cyberware-ui-section system-segment-tile system-segment-tile--card ${selected ? "is-active" : ""}" type="button" data-cyberware-ui-section="${section.key}" aria-pressed="${selected ? "true" : "false"}"><span class="system-segment-tile__body"><b class="system-segment-tile__title">${escapeHtml(section.label)}</b><small class="system-segment-tile__description">${escapeHtml(section.description)}</small></span></button>`;
    }).join("");
    const viewTabs = CYBERWARE_UI_SECTIONS.map((section) => {
      const selectedSection = activeSection === section.key;
      return `<nav class="cyberware-ui-tabs system-inline-tabs has-${section.views.length}" aria-label="${escapeHtml(section.label)} views" data-cyberware-ui-tabs-section="${section.key}" ${selectedSection ? "" : 'hidden aria-hidden="true" inert'}>${section.views.map((view) => `<button class="cyberware-ui-tab system-inline-tab ${active === view ? "is-active" : ""}" type="button" data-cyberware-ui-view="${view}" aria-pressed="${active === view ? "true" : "false"}"><span>${escapeHtml(CYBERWARE_UI_LABELS[view])}</span></button>`).join("")}</nav>`;
    }).join("");
    return `<div class="cyberware-ui-navigation"><div class="cyberware-ui-tools"><button class="secondary-action is-compact" type="button" data-cyberware-index-toggle aria-expanded="${indexOpen ? "true" : "false"}">Cyberware Index</button></div><nav class="cyberware-ui-sections system-segment-tabs" aria-label="Cyberware workspace sections">${sectionTabs}</nav><div class="cyberware-ui-subnav-stack">${viewTabs}</div></div>`;
  }

  function syncCyberwareUiView(citizenId = "", options = {}) {
    const id = String(citizenId || "").trim();
    const root = options.root || getCyberwareWorkspaceRoot(id);
    const workspace = getCyberwareWorkspaceElement(root);
    if (!workspace) return false;
    const state = getCyberwareUiState(id);
    const active = normalizeCyberwareUiView(options.view || state.activeView);
    const activeSection = getCyberwareUiSectionForView(active);
    state.activeView = active;
    state.activeSection = activeSection;
    state.sectionViews[activeSection] = active;
    workspace.dataset.cyberwareActiveView = active;
    workspace.dataset.cyberwareActiveSection = activeSection;
    workspace.querySelectorAll("[data-cyberware-ui-panel]").forEach((panel) => {
      const selected = normalizeCyberwareUiView(panel.dataset.cyberwareUiPanel || "") === active;
      panel.hidden = !selected;
      panel.setAttribute("aria-hidden", selected ? "false" : "true");
      if (selected) panel.removeAttribute("inert"); else panel.setAttribute("inert", "");
      panel.classList.toggle("is-active", selected);
    });
    workspace.querySelectorAll("[data-cyberware-ui-view]").forEach((button) => {
      const selected = normalizeCyberwareUiView(button.dataset.cyberwareUiView || "") === active;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    workspace.querySelectorAll("[data-cyberware-ui-section]").forEach((button) => {
      const selected = normalizeCyberwareUiSection(button.dataset.cyberwareUiSection || "") === activeSection;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    workspace.querySelectorAll("[data-cyberware-ui-tabs-section]").forEach((tabs) => {
      const selected = normalizeCyberwareUiSection(tabs.dataset.cyberwareUiTabsSection || "") === activeSection;
      tabs.hidden = !selected;
      tabs.setAttribute("aria-hidden", selected ? "false" : "true");
      if (selected) tabs.removeAttribute("inert"); else tabs.setAttribute("inert", "");
    });
    if (options.mount !== false) {
      if (active === "PLANNER") mountCyberwarePlannerPanel(id);
      if (active === "DIAGNOSTICS") mountCyberwareDiagnosticsPanel(id);
      if (active === "MAINTENANCE") mountCyberwareMaintenancePanel(id);
    }
    return true;
  }

  function setCyberwareUiView(citizenId = "", view = "OVERVIEW", options = {}) {
    const id = String(citizenId || "").trim();
    if (!id) return "OVERVIEW";
    const state = getCyberwareUiState(id);
    state.activeView = normalizeCyberwareUiView(view);
    syncCyberwareUiView(id, { ...options, view: state.activeView });
    return state.activeView;
  }

  function setCyberwareUiSection(citizenId = "", section = "SYSTEMS", options = {}) {
    const id = String(citizenId || "").trim();
    if (!id) return "SYSTEMS";
    const state = getCyberwareUiState(id);
    const activeSection = normalizeCyberwareUiSection(section);
    const activeView = normalizeCyberwareSectionView(
      activeSection,
      options.view || state.sectionViews[activeSection] || getCyberwareUiSectionDefaultView(activeSection)
    );
    state.activeSection = activeSection;
    state.activeView = activeView;
    state.sectionViews[activeSection] = activeView;
    syncCyberwareUiView(id, { ...options, view: activeView });
    return activeSection;
  }

  function openCyberwareWorkspace(citizenId = "", user = window.WS_APP.currentUser, options = {}) {
    const normalizedCitizenId = String(citizenId || "").trim();
    if (normalizedCitizenId) window.WS_APP.cyberwareTargetCitizenId = normalizedCitizenId;
    if (typeof options.returnView === "function") window.WS_APP.pushModuleView?.(options.returnView);
    if (typeof window.WS_APP.openModule === "function" && window.WS_APP.currentModuleId !== "cyberware") {
      window.WS_APP.openModule("cyberware", user, {
        citizenId: normalizedCitizenId,
        section: options.section,
        routeId: options.routeId,
        entityRef: options.entityRef,
        params: options.params,
        skipLoader: options.skipLoader === true
      });
      return;
    }
    window.WS_APP.renderCyberwareModule?.(user);
  }

  function getPlannerApi() {
    return window.WS_APP.cyberwarePlanner || {};
  }

  function getAuthorizationApi() {
    return window.WS_APP.cyberwareAuthorization || {};
  }

  function getDiagnosticsApi() {
    return window.WS_APP.cyberwareDiagnostics || {};
  }

  function getMaintenanceApi() {
    return window.WS_APP.cyberwareMaintenance || {};
  }

  function getItemId(item = {}) {
    return String(item.instanceId || item.id || item.itemId || "").trim();
  }

  function formatToken(value = "") {
    const formatter = getPlannerApi().formatToken;
    return typeof formatter === "function" ? formatter(value) : String(value || "").replace(/[:_]+/g, " ");
  }

  function formatCredits(value = 0) {
    const formatter = getPlannerApi().formatCredits;
    return typeof formatter === "function" ? formatter(value) : `${Math.max(0, Math.round(Number(value || 0)))} ₡`;
  }

  function formatDuration(value = 0) {
    const formatter = getPlannerApi().formatDuration;
    return typeof formatter === "function" ? formatter(value) : `${Math.max(0, Math.round(Number(value || 0)))} MIN`;
  }

  function formatPercent(value = 0) {
    const formatter = getPlannerApi().formatPercent;
    return typeof formatter === "function" ? formatter(value) : `${Math.round(Number(value || 0) * 100)}%`;
  }

  function renderOptions(items = [], selectedId = "", emptyLabel = "NO AVAILABLE RECORDS") {
    if (!items.length) return `<option value="">${escapeHtml(emptyLabel)}</option>`;
    return items.map((item) => {
      const id = getItemId(item);
      const label = [item.name || id, item.manufacturer || item.provider, item.condition !== undefined ? `COND ${Math.round(Number(item.condition || 0))}%` : ""].filter(Boolean).join(" / ");
      return `<option value="${escapeHtml(id)}" ${id === selectedId ? "selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("");
  }

  function renderSlotOptions(slots = [], selectedKey = "") {
    if (!slots.length) return `<option value="">NO COMPATIBLE SLOT</option>`;
    return slots.map((entry) => {
      const suffix = entry.valid ? "READY" : formatToken(entry.reason || entry.status || "BLOCKED");
      return `<option value="${escapeHtml(entry.key)}" ${entry.key === selectedKey ? "selected" : ""}>${escapeHtml(entry.label)} / ${escapeHtml(suffix)}</option>`;
    }).join("");
  }

  function renderPresetOptions(presets = [], selectedKey = "LOCAL_CLINIC") {
    return presets.map((preset) => {
      const key = String(preset.key || preset.provider || "LOCAL_CLINIC").trim();
      const label = [preset.label || key, preset.procedureMode, preset.medicalCare].filter(Boolean).join(" / ");
      return `<option value="${escapeHtml(key)}" ${key === selectedKey ? "selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("");
  }

  function renderReasonList(title = "", values = [], modifier = "") {
    if (!Array.isArray(values) || !values.length) return "";
    return `
      <div class="cyberware-planner-reasons cyberware-planner-reasons--${escapeHtml(modifier)}">
        <small>${escapeHtml(title)}</small>
        <ul>${values.map((value) => `<li>${escapeHtml(formatToken(value))}</li>`).join("")}</ul>
      </div>
    `;
  }

  function renderRequirements(requirements = {}) {
    const rows = [];
    if (Number(requirements.neurochipTier || 0) > 0) rows.push(`NEUROCHIP T${Number(requirements.neurochipTier)}`);
    if (Number(requirements.interfaceTier || 0) > 0) rows.push(`INTERFACE T${Number(requirements.interfaceTier)}`);
    if (Array.isArray(requirements.protocols) && requirements.protocols.length) rows.push(`PROTOCOL ${requirements.protocols.join(" + ")}`);
    if (Array.isArray(requirements.buses) && requirements.buses.length) rows.push(`BUS ${requirements.buses.join(" + ")}`);
    if (requirements.licenseRequired) rows.push("LICENSE REQUIRED");
    if (requirements.subscriptionRequired) rows.push("SUBSCRIPTION REQUIRED");
    if (requirements.firmwareRequired) rows.push("FIRMWARE REQUIRED");
    return rows.length ? `<p class="cyberware-planner-requirements">${rows.map((row) => `<span>${escapeHtml(row)}</span>`).join("")}</p>` : "";
  }

  function renderPlannerPlan(plan = null) {
    if (!plan) {
      return `
        <div class="cyberware-planner-empty">
          <b>NO ACTIVE ANALYSIS</b>
          <span>Select operation parameters and run analysis before confirmation.</span>
        </div>
      `;
    }
    const statusToken = String(plan.status || (plan.valid ? "VALID" : "BLOCKED")).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const acceptance = plan.acceptanceChance === null || plan.acceptanceChance === undefined ? "N/A" : formatPercent(plan.acceptanceChance);
    const rejection = plan.rejectionChance === null || plan.rejectionChance === undefined ? "N/A" : formatPercent(plan.rejectionChance);
    const occupied = Array.isArray(plan.occupiedSlots) ? plan.occupiedSlots : [];
    const freed = Array.isArray(plan.freedSlots) ? plan.freedSlots : [];
    return `
      <article class="cyberware-planner-analysis is-${escapeHtml(statusToken)}">
        <div class="cyberware-planner-analysis__head">
          <div>
            <small>ANALYSIS ${escapeHtml(plan.planId || "UNIDENTIFIED")}</small>
            <b>${escapeHtml(formatToken(plan.operation))} / ${escapeHtml(formatToken(plan.status))}</b>
          </div>
          <span class="cyberware-planner-state ${plan.valid ? "is-ready" : "is-blocked"}">${plan.valid ? "READY" : "BLOCKED"}</span>
        </div>
        <div class="cyberware-planner-metrics">
          <span><small>Quote</small><b>${escapeHtml(formatCredits(plan.procedureCost))}</b></span>
          <span><small>Duration</small><b>${escapeHtml(formatDuration(plan.durationMinutes))}</b></span>
          <span><small>Risk</small><b>${escapeHtml(formatToken(plan.riskBand))}</b></span>
          <span><small>Acceptance</small><b>${escapeHtml(acceptance)}</b></span>
          <span><small>Rejection</small><b>${escapeHtml(rejection)}</b></span>
        </div>
        ${occupied.length ? `<p class="cyberware-planner-slot-line"><small>OCCUPIES</small><b>${escapeHtml(occupied.map(formatToken).join(" / "))}</b></p>` : ""}
        ${freed.length ? `<p class="cyberware-planner-slot-line"><small>FREES</small><b>${escapeHtml(freed.map(formatToken).join(" / "))}</b></p>` : ""}
        ${renderRequirements(plan.requirements || {})}
        ${renderReasonList("BLOCKERS", plan.blockers || [], "blockers")}
        ${renderReasonList("WARNINGS", plan.warnings || [], "warnings")}
        <p class="cyberware-planner-quote-note">Confirmation starts the current Cyberware operation flow. Billing, Service and physical commit remain owned by their canonical domains.</p>
        <div class="cyberware-planner-actions">
          <button class="secondary-action" type="button" data-cyberware-planner-action="analyze">Re-run Analysis</button>
          <button class="primary-action" type="button" data-cyberware-planner-action="confirm" data-plan-id="${escapeHtml(plan.planId || "")}" ${plan.valid ? "" : "disabled"}>Confirm Operation</button>
        </div>
      </article>
    `;
  }

  function renderPlannerResult(result = null) {
    if (!result) return "";
    const accepted = result.accepted !== false;
    const success = result.ok === true && accepted;
    const status = success ? "COMMITTED" : result.ok === true ? "PROCEDURE FAILED" : "COMMIT REJECTED";
    const detail = result.reason || result.outcome?.result || "UNKNOWN";
    return `
      <article class="cyberware-planner-result ${success ? "is-success" : "is-failure"}">
        <div>
          <small>LAST OPERATION</small>
          <b>${escapeHtml(status)}</b>
        </div>
        <span>${escapeHtml(formatToken(result.operation || "OPERATION"))} / ${escapeHtml(formatToken(detail))}</span>
        ${result.outcome?.conditionPenalty ? `<small>CONDITION PENALTY: ${escapeHtml(result.outcome.conditionPenalty)}%</small>` : ""}
        <button class="secondary-action is-compact" type="button" data-cyberware-planner-action="clear">Clear Result</button>
      </article>
    `;
  }

  function diagnosticsTone(value = "") {
    return String(value || "UNKNOWN").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  function renderDiagnosticResource(resource = {}) {
    const capacity = Math.max(0, Number(resource.capacity || 0));
    const demanded = Math.max(0, Number(resource.demanded ?? resource.value ?? 0));
    const percentage = capacity > 0 ? Math.max(0, Math.min(100, Math.round((demanded / capacity) * 100))) : demanded > 0 ? 100 : 0;
    const tone = demanded > capacity && capacity >= 0 ? "critical" : percentage >= 90 ? "warning" : "nominal";
    return `
      <span class="cyberware-diagnostics-resource is-${tone}">
        <small>${escapeHtml(resource.label || resource.key || "RESOURCE")}</small>
        <b>${escapeHtml(`${Math.round(Number(resource.value || 0))} / ${Math.round(capacity)}`)}</b>
        <i aria-hidden="true"><em style="width:${percentage}%"></em></i>
        <small>${escapeHtml(demanded !== Number(resource.value || 0) ? `${Math.round(demanded)} DEMAND` : `${Math.max(0, Math.round(capacity - Number(resource.value || 0)))} FREE`)}</small>
      </span>
    `;
  }

  function renderDiagnosticFactorGroup(title = "", factors = []) {
    const rows = (Array.isArray(factors) ? factors : []).filter((factor) => factor.value !== null && factor.value !== undefined);
    return `
      <section class="cyberware-diagnostics-factor-group">
        <div class="cyberware-diagnostics-subhead"><span>${escapeHtml(title)}</span><small>${escapeHtml(`${rows.length} INPUTS`)}</small></div>
        <div class="cyberware-diagnostics-factor-list">
          ${rows.length ? rows.map((factor) => `
            <span>
              <small>${escapeHtml(factor.label || factor.key || "FACTOR")}</small>
              <b>${escapeHtml(String(Math.round(Number(factor.value || 0))))}</b>
            </span>
          `).join("") : `<p class="file-empty">No factor data.</p>`}
        </div>
      </section>
    `;
  }

  function renderDiagnosticIssues(issues = []) {
    const rows = Array.isArray(issues) ? issues : [];
    return `
      <section class="cyberware-diagnostics-log">
        <div class="cyberware-diagnostics-subhead"><span>CURRENT FINDINGS</span><small>${escapeHtml(`${rows.length} RECORDS`)}</small></div>
        <div class="cyberware-diagnostics-log__rows">
          ${rows.length ? rows.map((issue) => `
            <article class="cyberware-diagnostics-log-row is-${escapeHtml(diagnosticsTone(issue.severity))}">
              <div><span>${escapeHtml(issue.severity || "INFO")} / ${escapeHtml(formatToken(issue.category || "SYSTEM"))}</span><b>${escapeHtml(issue.title || formatToken(issue.code || "DIAGNOSTIC"))}</b></div>
              <small>${escapeHtml(issue.detail || formatToken(issue.code || "DIAGNOSTIC"))}</small>
              ${issue.itemName ? `<em>${escapeHtml(issue.itemName)}${issue.itemId ? ` / ${escapeHtml(issue.itemId)}` : ""}</em>` : ""}
            </article>
          `).join("") : `<p class="file-empty">No diagnostic findings.</p>`}
        </div>
      </section>
    `;
  }

  function renderDiagnosticHistory(history = []) {
    const rows = Array.isArray(history) ? history : [];
    return `
      <section class="cyberware-diagnostics-history">
        <div class="cyberware-diagnostics-subhead"><span>SCAN HISTORY</span><small>${escapeHtml(`${rows.length} SAVED`)}</small></div>
        <div class="cyberware-diagnostics-history__rows">
          ${rows.length ? rows.map((entry) => `
            <article class="cyberware-diagnostics-history-row is-${escapeHtml(diagnosticsTone(entry.status))}">
              <div><span>${escapeHtml(entry.status || "UNKNOWN")}</span><b>${escapeHtml(entry.createdAt || "UNKNOWN TIME")}</b></div>
              <small>${escapeHtml(`RISK ${entry.neurocrashRisk || 0}% / STB ${entry.stability || 0} / SEC ${entry.security || 0} / ISSUES ${entry.issueCount || 0}`)}</small>
            </article>
          `).join("") : `<p class="file-empty">No saved diagnostic scans.</p>`}
        </div>
      </section>
    `;
  }

  function renderCyberwareDiagnosticsPlaceholder(runtime = {}, options = {}) {
    const core = runtime?.neuralCore || {};
    const state = String(core.systemState || "UNKNOWN").toUpperCase();
    const embedded = options.embedded === true;
    const head = embedded
      ? `<div class="cyberware-neural-core-subhead"><div><span>DIAGNOSTIC ANALYSIS</span><b>Current Resolver State</b></div><small>${escapeHtml(state)}</small></div>`
      : `<div class="equipment-shell-panel__head"><div><p class="kicker">CYBERWARE / DIAGNOSTICS</p><h5>System Diagnostics</h5></div><span class="equipment-panel-badge">${escapeHtml(state)}</span></div>`;
    return `
      <section class="${embedded ? "cyberware-diagnostics-launcher is-embedded" : "equipment-shell-panel cyberware-diagnostics-launcher"}" data-cyberware-diagnostics-placeholder>
        ${head}
        <p class="equipment-shell-copy">Detailed fault analysis, Stability factors, Security exposure and Neurocrash risk are resolved when Diagnostics is opened.</p>
        <button class="secondary-action" type="button" data-cyberware-diagnostics-action="open">Load Diagnostics</button>
      </section>
    `;
  }

  function renderCyberwareDiagnosticsPanel(citizenId = "", runtimeState = null, diagnosticsState = null, options = {}) {
    const citizen = getCitizen(citizenId);
    const runtime = runtimeState || (citizen ? getCyberwareWorkspaceRuntime(citizen) : null);
    const builder = getDiagnosticsApi().buildCyberwareDiagnostics;
    const vm = diagnosticsState || (typeof builder === "function" && citizen ? builder(citizen, runtime) : null);
    const embedded = options.embedded === true;
    if (!vm) return `<section class="${embedded ? "cyberware-diagnostics is-embedded" : "equipment-shell-panel cyberware-diagnostics"}"><p class="file-empty">Cyberware Diagnostics unavailable.</p></section>`;
    const head = embedded
      ? `<div class="cyberware-neural-core-subhead"><div><span>DIAGNOSTIC ANALYSIS</span><b>Current Resolver State</b></div><small>${escapeHtml(vm.status || "UNKNOWN")}</small></div>`
      : `<div class="equipment-shell-panel__head"><div><p class="kicker">CYBERWARE / DIAGNOSTICS</p><h5>System Diagnostics</h5></div><span class="equipment-panel-badge">${escapeHtml(vm.status || "UNKNOWN")}</span></div>`;
    return `
      <section class="${embedded ? "cyberware-diagnostics is-embedded" : "equipment-shell-panel cyberware-diagnostics"} is-${escapeHtml(diagnosticsTone(vm.status))}" data-cyberware-diagnostics>
        ${head}
        <div class="cyberware-diagnostics-summary">
          <span class="is-${escapeHtml(diagnosticsTone(vm.status))}"><small>SYSTEM STATE</small><b>${escapeHtml(vm.status || "UNKNOWN")}</b></span>
          <span class="is-${escapeHtml(diagnosticsTone(vm.neurocrashRisk?.level))}"><small>NEUROCRASH RISK</small><b>${escapeHtml(`${vm.neurocrashRisk?.score || 0}% / ${vm.neurocrashRisk?.level || "LOW"}`)}</b></span>
          <span><small>STABILITY</small><b>${escapeHtml(String(vm.core?.stability ?? 0))}</b></span>
          <span><small>SECURITY</small><b>${escapeHtml(String(vm.core?.security ?? 0))}</b></span>
          <span><small>NEURAL STRAIN</small><b>${escapeHtml(String(vm.core?.neuralStrain ?? 0))}</b></span>
          <span><small>ISSUES</small><b>${escapeHtml(`${vm.counts?.CRITICAL || 0}C / ${vm.counts?.ERROR || 0}E / ${vm.counts?.WARNING || 0}W`)}</b></span>
        </div>
        <div class="cyberware-diagnostics-resources">
          ${(vm.resources || []).map(renderDiagnosticResource).join("")}
        </div>
        <div class="cyberware-diagnostics-factors">
          ${renderDiagnosticFactorGroup("STABILITY INPUTS", vm.factors?.stability || [])}
          ${renderDiagnosticFactorGroup("SECURITY INPUTS", vm.factors?.security || [])}
        </div>
        ${renderDiagnosticIssues(vm.issues || [])}
        ${renderDiagnosticHistory(vm.history || [])}
        <div class="cyberware-diagnostics-actions">
          <button class="primary-action" type="button" data-cyberware-diagnostics-action="scan">Run Diagnostic Scan</button>
          ${(vm.history || []).length ? `<button class="secondary-action" type="button" data-cyberware-diagnostics-action="clear-history">Clear Scan History</button>` : ""}
          ${embedded ? "" : `<button class="secondary-action" type="button" data-cyberware-diagnostics-action="close">Close Diagnostics</button>`}
        </div>
        <p class="cyberware-diagnostics-note">Neurocrash Risk is a diagnostic indicator. Diagnostics do not apply health damage or advance Campaign Time.</p>
      </section>
    `;
  }

  function maintenanceTone(value = "") {
    const token = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (["blocked", "failed", "error"].includes(token)) return "blocked";
    if (["advisory", "warning"].includes(token)) return "warning";
    if (["completed", "ready", "ok"].includes(token)) return "ready";
    return "neutral";
  }

  function renderMaintenanceHistory(history = []) {
    const rows = Array.isArray(history) ? history : [];
    return `
      <section class="cyberware-maintenance-history">
        <div class="cyberware-maintenance-subhead"><span>SERVICE HISTORY</span><small>${escapeHtml(`${rows.length} / 48`)}</small></div>
        <div class="cyberware-maintenance-history__rows">
          ${rows.length ? rows.map((entry) => `
            <article class="cyberware-maintenance-history-row is-${escapeHtml(maintenanceTone(entry.status))}">
              <div><span>${escapeHtml(entry.type || "SERVICE")}</span><b>${escapeHtml(entry.createdAt || "UNKNOWN DATE")}</b></div>
              <small>${escapeHtml(`${entry.provider || "CERTIFIED SERVICE NODE"} / ${formatCredits(entry.cost || 0)} / ${formatDuration(entry.durationMinutes || 0)}`)}</small>
              <em>${escapeHtml(entry.note || entry.diagnosticStatus || entry.status || "COMPLETED")}</em>
            </article>
          `).join("") : `<p class="file-empty">No service records for this ItemInstance.</p>`}
        </div>
      </section>
    `;
  }

  function renderCyberwareMaintenancePlaceholder() {
    return `
      <section class="equipment-shell-panel cyberware-maintenance-launcher" data-cyberware-maintenance-placeholder>
        <div class="equipment-shell-panel__head">
          <div><p class="kicker">CYBERWARE / MAINTENANCE</p><h5>Service Operations</h5></div>
          <span class="equipment-panel-badge">LAZY</span>
        </div>
        <p class="equipment-shell-copy">Repair, calibration, cleaning, focused diagnostics, firmware service and ItemInstance service history are loaded only when Maintenance is opened.</p>
        <button class="secondary-action" type="button" data-cyberware-maintenance-action="open">Open Maintenance</button>
      </section>
    `;
  }

  function renderCyberwareMaintenancePanel(citizenId = "") {
    const maintenance = getMaintenanceApi();
    const vm = typeof maintenance.getCyberwareMaintenanceViewModel === "function"
      ? maintenance.getCyberwareMaintenanceViewModel(citizenId)
      : null;
    if (!vm) return `<section class="equipment-shell-panel cyberware-maintenance"><p class="file-empty">Cyberware Maintenance unavailable.</p></section>`;
    const item = vm.selectedItem || null;
    const quote = vm.quote || null;
    const feedback = vm.state?.feedback || null;
    return `
      <section class="equipment-shell-panel cyberware-maintenance" data-cyberware-maintenance>
        <div class="equipment-shell-panel__head">
          <div><p class="kicker">CYBERWARE / MAINTENANCE</p><h5>Service Operations</h5></div>
          <span class="equipment-panel-badge">${escapeHtml(quote?.status || "IDLE")}</span>
        </div>
        <div class="cyberware-maintenance-controls">
          <label>
            <span>ITEMINSTANCE</span>
            <select data-cyberware-maintenance-field="item">
              ${renderOptions(vm.items || [], vm.state?.selectedItemId || "", "NO SERVICEABLE CYBERWARE")}
            </select>
          </label>
          <label>
            <span>OPERATION</span>
            <select data-cyberware-maintenance-field="operation">
              ${(vm.operations || []).map((entry) => `<option value="${escapeHtml(entry.key)}" ${entry.key === vm.state?.operation ? "selected" : ""}>${escapeHtml(entry.label)}</option>`).join("")}
            </select>
          </label>
        </div>
        ${item ? `
          <div class="cyberware-maintenance-item-summary">
            <span><small>ITEM</small><b>${escapeHtml(item.name || getItemId(item))}</b></span>
            <span><small>LOCATION</small><b>${escapeHtml(formatToken(item.locationData?.type || item.location || "UNKNOWN"))}</b></span>
            <span><small>CONDITION</small><b>${escapeHtml(`${Math.round(Number(item.condition ?? 100))}%`)}</b></span>
            <span><small>CALIBRATION</small><b>${escapeHtml(`${vm.calibration?.quality ?? 100}% / ${formatToken(vm.calibration?.profile || "FACTORY")}`)}</b></span>
            <span><small>CLEANLINESS</small><b>${escapeHtml(`${vm.maintenance?.cleanliness ?? 100}%`)}</b></span>
            <span><small>FIRMWARE</small><b>${escapeHtml(`${vm.firmware?.status || "NOT REQUIRED"}${vm.firmware?.version ? ` / ${vm.firmware.version}` : ""}`)}</b></span>
          </div>
          <article class="cyberware-maintenance-quote is-${escapeHtml(maintenanceTone(quote?.status))}">
            <div class="cyberware-maintenance-quote__head">
              <div><span>${escapeHtml(quote?.operation || "SERVICE")}</span><b>${escapeHtml(quote?.summary || "Select a service operation.")}</b></div>
              <strong>${escapeHtml(quote?.status || "IDLE")}</strong>
            </div>
            <div class="cyberware-maintenance-quote__metrics">
              <span><small>QUOTE</small><b>${escapeHtml(formatCredits(quote?.cost || 0))}</b></span>
              <span><small>DURATION</small><b>${escapeHtml(formatDuration(quote?.durationMinutes || 0))}</b></span>
              <span><small>REASON</small><b>${escapeHtml(formatToken(quote?.reason || "READY"))}</b></span>
            </div>
            ${renderReasonList("BLOCKERS", quote?.blockers || [], "blockers")}
            ${renderReasonList("ADVISORIES", quote?.warnings || [], "warnings")}
          </article>
          ${feedback ? `<div class="cyberware-maintenance-feedback is-${escapeHtml(maintenanceTone(feedback.ok ? "ready" : "blocked"))}"><b>${escapeHtml(feedback.ok ? "SERVICE COMPLETED" : "SERVICE FAILED")}</b><span>${escapeHtml(formatToken(feedback.reason || "UNKNOWN"))}</span></div>` : ""}
          <div class="cyberware-maintenance-actions">
            <button class="primary-action" type="button" data-cyberware-maintenance-action="execute" ${quote?.valid ? "" : "disabled"}>Execute Service</button>
          </div>
          <p class="cyberware-maintenance-note">Execution uses the current Cyberware service flow. Billing, scheduling, campaign time and physical mutation remain owned by their canonical domains.</p>
          ${renderMaintenanceHistory(vm.history || [])}
        ` : `
          <p class="file-empty">No serviceable Cyberware ItemInstances owned by this citizen.</p>
        `}
      </section>
    `;
  }

  function renderCyberwarePlannerPlaceholder() {
    return `
      <section class="equipment-shell-panel cyberware-planner-launcher" data-cyberware-planner-placeholder>
        <div class="equipment-shell-panel__head">
          <div><p class="kicker">CYBERWARE / PROCEDURE</p><h5>Operation Planner</h5></div>
          <span class="equipment-panel-badge">LAZY</span>
        </div>
        <p class="equipment-shell-copy">Procedure candidates and body-slot analysis are loaded only when the planner is opened.</p>
        <button class="secondary-action" type="button" data-cyberware-planner-toggle>Open Procedure Planner</button>
      </section>
    `;
  }

  function renderCyberwarePlannerPanel(citizenId = "") {
    const planner = getPlannerApi();
    const vm = typeof planner.getPlannerViewModel === "function" ? planner.getPlannerViewModel(citizenId) : null;
    if (!vm?.state) return `<section class="equipment-shell-panel cyberware-planner"><p class="file-empty">Cyberware Planner unavailable.</p></section>`;
    const operation = vm.state.operation || "INSTALL";
    const needsSource = operation === "INSTALL" || operation === "REPLACE";
    const needsTarget = operation === "DEINSTALL" || operation === "REPLACE";
    const needsSlot = needsSource;
    const needsReturnDestination = needsTarget;
    const canAnalyze = (!needsSource || Boolean(vm.source))
      && (!needsTarget || Boolean(vm.target))
      && (!needsSlot || Boolean(vm.state.primarySlot))
      && (!needsReturnDestination || Boolean(vm.returnDestination));

    return `
      <section class="equipment-shell-panel cyberware-planner" data-cyberware-planner>
        <div class="equipment-shell-panel__head">
          <div><p class="kicker">CYBERWARE / PROCEDURE</p><h5>Operation Planner</h5></div>
          <span class="equipment-panel-badge">${escapeHtml(operation)}</span>
        </div>
        <div class="cyberware-planner-operation-tabs" role="tablist" aria-label="Cyberware operation">
          ${["INSTALL", "DEINSTALL", "REPLACE"].map((entry) => `<button class="equipment-workspace-tab ${operation === entry ? "is-active" : ""}" type="button" data-cyberware-planner-action="operation" data-operation="${entry}">${entry}</button>`).join("")}
        </div>
        <div class="cyberware-planner-controls">
          ${needsSource ? `
            <label><span>Source ItemInstance</span><select class="equipment-select-control" data-cyberware-planner-field="sourceItemId">${renderOptions(vm.sources, vm.state.sourceItemId, "NO PACKAGED CYBERWARE")}</select></label>
          ` : ""}
          ${needsTarget ? `
            <label><span>Installed Target</span><select class="equipment-select-control" data-cyberware-planner-field="targetItemId">${renderOptions(vm.targets, vm.state.targetItemId, "NO INSTALLED CYBERWARE")}</select></label>
          ` : ""}
          ${needsSlot ? `
            <label><span>Primary Body Slot</span><select class="equipment-select-control" data-cyberware-planner-field="primarySlot">${renderSlotOptions(vm.slots, vm.state.primarySlot)}</select></label>
          ` : ""}
          ${needsReturnDestination ? `
            <label><span>Return Destination</span><select class="equipment-select-control" data-cyberware-planner-field="returnDestinationId">${renderOptions(vm.returnDestinations, vm.state.returnDestinationId, "NO HOUSING SPACE")}</select></label>
          ` : ""}
          <label><span>Care Provider</span><select class="equipment-select-control" data-cyberware-planner-field="surgeryPreset">${renderPresetOptions(vm.presets, vm.state.surgeryPreset)}</select></label>
        </div>
        <div class="cyberware-planner-selection-summary">
          <span><small>SOURCE</small><b>${escapeHtml(vm.source?.name || "N/A")}</b></span>
          <span><small>TARGET</small><b>${escapeHtml(vm.target?.name || "N/A")}</b></span>
          <span><small>SLOT</small><b>${escapeHtml(formatToken(vm.state.primarySlot || "N/A"))}</b></span>
          <span><small>RETURN</small><b>${escapeHtml(vm.returnDestination?.label || "N/A")}</b></span>
        </div>
        <div class="cyberware-planner-actions cyberware-planner-actions--analyze">
          <button class="primary-action" type="button" data-cyberware-planner-action="analyze" ${canAnalyze ? "" : "disabled"}>Analyze Procedure</button>
        </div>
        ${renderPlannerResult(vm.result)}
        ${renderPlannerPlan(vm.plan)}
      </section>
    `;
  }

  function getCoreStackApi() {
    return window.WS_APP.cyberwareCoreStack || {};
  }

  function formatCoreValue(value, suffix = "") {
    const normalized = value === null || value === undefined || value === "" ? "0" : String(value);
    return `${normalized}${suffix || ""}`;
  }

  function getCoreStackViewModel(runtime = {}) {
    const api = getCoreStackApi();
    return typeof api.getCyberwareCoreStackViewModel === "function"
      ? api.getCyberwareCoreStackViewModel(runtime)
      : null;
  }

  function normalizeNeuralCoreScanHistory(citizen = {}) {
    return (Array.isArray(citizen?.cyberwareDiagnostics) ? citizen.cyberwareDiagnostics : [])
      .filter((entry) => entry && typeof entry === "object")
      .slice()
      .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
  }

  function uniqueNeuralCoreIssues(values = []) {
    return [...new Set((Array.isArray(values) ? values : [values]).map((value) => String(value || "").trim().toUpperCase()).filter(Boolean))];
  }

  function buildNeuralCoreWorkspaceProjection(runtime = {}, citizen = {}) {
    const vm = getCoreStackViewModel(runtime);
    if (!vm) return null;
    const resourceByKey = Object.fromEntries((vm.resources || []).map((metric) => [String(metric.key || "").toUpperCase(), metric]));
    const qualityByKey = Object.fromEntries((vm.quality || []).map((metric) => [String(metric.key || "").toUpperCase(), metric]));
    const blockers = uniqueNeuralCoreIssues([
      ...(String(vm.coreLink?.state || "").toUpperCase() === "BLOCKED" ? [vm.coreLink?.reason] : []),
      ...(vm.components || []).flatMap((component) => component.blockers || []),
      ...(vm.compatibility || []).flatMap((entry) => entry.blockers || [])
    ]);
    const warnings = uniqueNeuralCoreIssues([
      ...(vm.warnings || []),
      ...(vm.components || []).flatMap((component) => component.warnings || []),
      ...(vm.compatibility || []).flatMap((entry) => entry.warnings || [])
    ]);
    const scan = normalizeNeuralCoreScanHistory(citizen)[0] || null;
    return {
      vm,
      systemState: String(vm.systemState || "UNKNOWN").toUpperCase(),
      metrics: [
        { key: "NEUROLOAD", label: "Neuroload", ...resourceByKey.NEUROLOAD, kind: "resource" },
        { key: "NEUROCHANNELS", label: "Neurochannels", ...resourceByKey.NEUROCHANNELS, kind: "resource" },
        { key: "INTERFACE_LOAD", label: "Interface Load", ...resourceByKey.INTERFACE_LOAD, kind: "resource" },
        { key: "STABILITY", label: "Stability", value: qualityByKey.STABILITY?.value ?? 0, kind: "quality" },
        { key: "SECURITY", label: "Security", value: qualityByKey.SECURITY?.value ?? 0, kind: "quality" },
        { key: "NEUROLATENCY", label: "Neurolatency", value: qualityByKey.NEUROLATENCY?.value || "NONE", kind: "quality" }
      ],
      components: vm.components || [],
      findings: { blockers, warnings, total: blockers.length + warnings.length },
      lastScan: scan ? {
        status: String(scan.status || "UNKNOWN").toUpperCase(),
        createdAt: String(scan.createdAt || "").trim(),
        neurocrashRisk: Math.max(0, Math.round(Number(scan.neurocrashRisk || 0))),
        issueCount: Math.max(0, Math.round(Number(scan.issueCount || 0)))
      } : null
    };
  }

  function renderNeuralCoreMetric(metric = {}) {
    const hasCapacity = metric.capacity !== null && metric.capacity !== undefined;
    const numericCapacity = Number(metric.capacity || 0);
    const ratio = hasCapacity && numericCapacity > 0 ? Number(metric.value || 0) / numericCapacity : null;
    const tone = ratio !== null && ratio > 1 ? "blocked" : ratio !== null && ratio >= 0.9 ? "warning" : "neutral";
    const value = hasCapacity
      ? `${formatCoreValue(metric.value)} / ${formatCoreValue(metric.capacity)}`
      : formatCoreValue(metric.value);
    return `<span class="cyberware-neural-core-metric is-${tone}"><small>${escapeHtml(metric.label || metric.key || "METRIC")}</small><b>${escapeHtml(value)}</b></span>`;
  }

  function renderNeuralCoreComponentSummary(component = {}) {
    const state = String(component.state || "UNKNOWN").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const tier = component.tier ? `T${component.tier}` : formatToken(component.reason || "MISSING");
    return `
      <article class="cyberware-neural-core-component is-${escapeHtml(state)}">
        <small>${escapeHtml(formatToken(component.kind || "CORE COMPONENT"))}</small>
        <b>${escapeHtml(component.name || "UNAVAILABLE")}</b>
        <span>${escapeHtml(`${formatToken(component.state || "UNKNOWN")} / ${tier}`)}</span>
      </article>
    `;
  }

  function formatNeuralCoreScanTime(value = "") {
    const token = String(value || "").trim();
    if (!token) return "NO SAVED SCAN";
    return token.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
  }

  function renderCyberwareNeuralCoreSummary(runtime = {}, citizen = {}, activeView = "CORE_STACK") {
    const projection = buildNeuralCoreWorkspaceProjection(runtime, citizen);
    if (!projection) return `<section class="equipment-shell-panel cyberware-neural-core-summary" data-cyberware-neural-core-summary-host><p class="file-empty">Neural Core view model unavailable.</p></section>`;
    const scan = projection.lastScan;
    const scanTone = scan ? diagnosticsTone(scan.status) : "neutral";
    const route = String(activeView || "CORE_STACK").toUpperCase() === "DIAGNOSTICS" ? "CORE_STACK" : "DIAGNOSTICS";
    const routeLabel = route === "DIAGNOSTICS" ? "Open Diagnostics" : "Back to Core Stack";
    return `
      <section class="equipment-shell-panel cyberware-neural-core-summary is-${escapeHtml(projection.systemState.toLowerCase())}" data-cyberware-neural-core-summary-host data-neural-core-view="${escapeHtml(String(activeView || "CORE_STACK").toUpperCase())}">
        <div class="equipment-shell-panel__head cyberware-ui-section-head">
          <div><p class="kicker">CYBERWARE / NEURAL CORE</p><h5>Neural Core Workspace</h5><small>Core architecture, operating capacity and diagnostic context.</small></div>
          <span class="equipment-panel-badge">${escapeHtml(formatToken(projection.systemState))}</span>
        </div>
        <div class="cyberware-neural-core-metrics">
          ${projection.metrics.map(renderNeuralCoreMetric).join("")}
        </div>
        <div class="cyberware-neural-core-context">
          <div class="cyberware-neural-core-components">
            ${projection.components.map(renderNeuralCoreComponentSummary).join("")}
          </div>
          <article class="cyberware-neural-core-diagnostic is-${escapeHtml(scanTone)}">
            <div><small>LAST DIAGNOSTIC</small><b>${escapeHtml(scan?.status || "NOT RUN")}</b></div>
            <span>${escapeHtml(scan ? `${formatNeuralCoreScanTime(scan.createdAt)} / RISK ${scan.neurocrashRisk}% / ${scan.issueCount} SAVED ISSUES` : "NO SAVED DIAGNOSTIC SCAN")}</span>
            <em>${escapeHtml(`${projection.findings.blockers.length} CORE BLOCKERS / ${projection.findings.warnings.length} CORE WARNINGS`)}</em>
            <button class="secondary-action is-compact" type="button" data-cyberware-ui-view="${route}">${routeLabel}</button>
          </article>
        </div>
      </section>
    `;
  }

  function renderCoreTokens(title = "", values = [], emptyLabel = "NONE") {
    const tokens = Array.isArray(values) ? values.filter(Boolean) : [];
    return `
      <div class="cyberware-core-token-group">
        <small>${escapeHtml(title)}</small>
        <div class="cyberware-core-token-list">
          ${tokens.length
            ? tokens.map((value) => `<span>${escapeHtml(formatToken(value))}</span>`).join("")
            : `<span class="is-empty">${escapeHtml(emptyLabel)}</span>`}
        </div>
      </div>
    `;
  }

  function renderCoreIssues(blockers = [], warnings = []) {
    const blockerList = Array.isArray(blockers) ? blockers : [];
    const warningList = Array.isArray(warnings) ? warnings : [];
    if (!blockerList.length && !warningList.length) return "";
    return `
      <div class="cyberware-core-issues">
        ${blockerList.map((value) => `<span class="is-blocker">${escapeHtml(formatToken(value))}</span>`).join("")}
        ${warningList.map((value) => `<span class="is-warning">${escapeHtml(formatToken(value))}</span>`).join("")}
      </div>
    `;
  }

  function renderCoreResource(metric = {}) {
    const hasCapacity = metric.capacity !== null && metric.capacity !== undefined;
    const percentage = hasCapacity && Number(metric.capacity) > 0 ? Math.round(Math.max(0, Math.min(1, Number(metric.ratio || 0))) * 100) : 0;
    const value = hasCapacity ? `${formatCoreValue(metric.value)} / ${formatCoreValue(metric.capacity)}` : formatCoreValue(metric.value, metric.suffix || "");
    return `
      <span class="cyberware-core-resource">
        <small>${escapeHtml(metric.label || metric.key || "RESOURCE")}</small>
        <b>${escapeHtml(value)}</b>
        ${hasCapacity ? `<i aria-hidden="true"><em style="width:${percentage}%"></em></i><small>${escapeHtml(`${formatCoreValue(metric.remaining)} REMAINING`)}</small>` : ""}
      </span>
    `;
  }

  function renderCoreQuality(metric = {}) {
    return `
      <span class="cyberware-core-quality">
        <small>${escapeHtml(metric.label || metric.key || "METRIC")}</small>
        <b>${escapeHtml(formatCoreValue(metric.value))}</b>
      </span>
    `;
  }

  function renderCoreComponent(component = {}) {
    const state = String(component.state || "UNKNOWN").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const renameControl = typeof app.renderItemInstanceRenameControl === "function"
      ? app.renderItemInstanceRenameControl(component, { compact: true })
      : "";
    const metrics = Array.isArray(component.metrics) ? component.metrics : [];
    const id = String(component.id || "").trim();
    return `
      <article class="cyberware-core-component is-${escapeHtml(state)}">
        <div class="cyberware-core-component__head">
          <div>
            <span>${escapeHtml(formatToken(component.kind || "CORE COMPONENT"))} / ${escapeHtml(formatToken(component.state || "UNKNOWN"))}</span>
            <b>${escapeHtml(component.name || "UNAVAILABLE")}</b>
          </div>
          <small>${component.tier ? `T${escapeHtml(component.tier)}` : escapeHtml(formatToken(component.reason || "MISSING"))}</small>
        </div>
        ${component.installed ? `
          <p class="cyberware-core-component__meta">${escapeHtml([component.manufacturer, component.grade, `COND ${Math.round(Number(component.condition || 0))}%`].filter(Boolean).join(" / "))}</p>
          <div class="cyberware-core-component__metrics">
            ${metrics.map((metric) => `<span><small>${escapeHtml(metric.label || metric.key)}</small><b>${escapeHtml(formatCoreValue(metric.value))}</b></span>`).join("")}
          </div>
          ${renderCoreTokens("SUPPORTED BUSES", component.buses || [], "NO DECLARED BUS")}
          ${renderCoreIssues(component.blockers, component.warnings)}
          ${renameControl}
          <div class="equipment-cyberware-card__actions">
            <button class="secondary-action is-compact" type="button" data-cyberware-planner-action="select-target" data-item-id="${escapeHtml(id)}">Plan Removal</button>
            <button class="secondary-action is-compact" type="button" data-cyberware-planner-action="replace-target" data-item-id="${escapeHtml(id)}">Plan Replace</button>
          </div>
        ` : `${renderCoreIssues(component.blockers, component.warnings)}`}
      </article>
    `;
  }

  function renderCoreCompatibility(entries = []) {
    if (!entries.length) {
      return `
        <div class="cyberware-core-compatibility-empty">
          <b>NO DEPENDENT IMPLANTS</b>
          <span>Core Stack is online, but no additional cyberware currently consumes its resources.</span>
        </div>
      `;
    }
    return entries.map((entry) => {
      const state = String(entry.state || "UNKNOWN").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const allocation = entry.allocation || {};
      const protocols = Array.isArray(entry.requiredProtocols) ? entry.requiredProtocols : [];
      const missing = Array.isArray(entry.missingProtocols) ? entry.missingProtocols : [];
      return `
        <article class="cyberware-core-compatibility-row is-${escapeHtml(state)}">
          <div>
            <span>${escapeHtml(formatToken(entry.slot || "UNASSIGNED"))}</span>
            <b>${escapeHtml(entry.name || entry.id || "CYBERWARE")}</b>
            <small>${escapeHtml(`${formatToken(entry.state)} / ${formatToken(entry.reason)}`)}</small>
          </div>
          <div class="cyberware-core-compatibility-row__allocation">
            <span><small>NL</small><b>${escapeHtml(formatCoreValue(allocation.neuroLoad))}</b></span>
            <span><small>NC</small><b>${escapeHtml(formatCoreValue(allocation.neuroChannels))}</b></span>
            <span><small>IL</small><b>${escapeHtml(formatCoreValue(allocation.interfaceLoad))}</b></span>
          </div>
          <div class="cyberware-core-compatibility-row__protocols">
            ${protocols.length ? protocols.map((token) => `<span class="${missing.includes(token) ? "is-missing" : ""}">${escapeHtml(formatToken(token))}</span>`).join("") : `<span class="is-empty">NO PROTOCOL REQUIREMENT</span>`}
          </div>
          ${renderCoreIssues(entry.blockers, entry.warnings)}
        </article>
      `;
    }).join("");
  }

  function renderCoreStackPanel(runtime = {}, options = {}) {
    const vm = options.vm || getCoreStackViewModel(runtime);
    if (!vm) return `<section class="cyberware-core-stack"><p class="file-empty">Core Stack view model unavailable.</p></section>`;
    const link = vm.coreLink || {};
    const embedded = options.embedded === true;
    const systemState = String(vm.systemState || "UNKNOWN").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const head = embedded
      ? `<div class="cyberware-neural-core-subhead"><div><span>CORE ARCHITECTURE</span><b>Component and Compatibility Detail</b></div><small>${escapeHtml(`${vm.components?.length || 0} CORE NODES`)}</small></div>`
      : `<div class="cyberware-core-stack__head"><div><p class="kicker">CYBERWARE / CORE STACK</p><h5>Neural Integration</h5></div><span class="equipment-panel-badge">${escapeHtml(formatToken(vm.systemState))}</span></div>`;
    return `
      <section class="cyberware-core-stack is-${escapeHtml(systemState)} ${embedded ? "is-embedded" : ""}" data-cyberware-core-stack>
        ${head}
        ${embedded ? "" : `
          <div class="cyberware-core-resource-grid">${(vm.resources || []).map(renderCoreResource).join("")}</div>
          <div class="cyberware-core-quality-grid">
            ${(vm.quality || []).map(renderCoreQuality).join("")}
            <span class="cyberware-core-quality"><small>Max grade</small><b>${escapeHtml(formatToken(vm.limits?.maxCyberwareGrade || "CIVILIAN"))}</b></span>
            <span class="cyberware-core-quality"><small>Max scale</small><b>${escapeHtml(formatToken(vm.limits?.maxScale || "SMALL"))}</b></span>
          </div>
        `}
        <div class="cyberware-core-component-grid">
          ${(vm.components || []).map(renderCoreComponent).join("")}
        </div>
        <div class="cyberware-core-support-grid">
          <div class="cyberware-core-support-panel">
            <div class="cyberware-core-support-panel__head">
              <span>NEUROCHIP ↔ INTERFACE</span>
              <b>${escapeHtml(formatToken(link.state || "UNKNOWN"))}</b>
            </div>
            <small>${escapeHtml(`SOCKET T${link.socketRating || 0} / CHIP T${link.neurochipTier || 0} / ${link.effectiveChannels || 0} EFFECTIVE CHANNELS`)}</small>
            ${renderCoreIssues(link.state === "BLOCKED" ? [link.reason] : [], vm.warnings || [])}
          </div>
          <div class="cyberware-core-support-panel">
            ${renderCoreTokens("EFFECTIVE PROTOCOLS", vm.protocols || [], "NO SHARED PROTOCOL")}
            ${renderCoreTokens("BODY BUSES", vm.buses || [], "NO BODY BUS")}
          </div>
        </div>
        <div class="cyberware-core-compatibility">
          <div class="cyberware-core-compatibility__head">
            <div><span>DEPENDENT SYSTEMS</span><b>Compatibility Matrix</b></div>
            <small>${escapeHtml(`${vm.compatibility?.length || 0} IMPLANTS`)}</small>
          </div>
          <div class="cyberware-core-compatibility-list">
            ${renderCoreCompatibility(vm.compatibility || [])}
          </div>
        </div>
      </section>
    `;
  }

  function renderAuthorizationToken(label = "", value = "", state = "") {
    const className = String(state || value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return `<span class="cyberware-authorization-token is-${escapeHtml(className || "unknown")}"><small>${escapeHtml(label)}</small><b>${escapeHtml(formatToken(value || "UNKNOWN"))}</b></span>`;
  }

  function renderInstalledAuthorization(item = {}, citizen = {}, authorizationState = null) {
    const resolver = getAuthorizationApi().getCyberwareAuthorizationState;
    const authorization = authorizationState || (typeof resolver === "function" ? resolver(citizen, item) : null);
    if (!authorization) return "";
    const license = authorization.license || {};
    const subscription = authorization.subscription || {};
    const firmware = authorization.firmware || {};
    const canUpdateFirmware = firmware.required === true && ["UPDATE_AVAILABLE", "OUTDATED", "MISSING", "CORRUPTED"].includes(firmware.status);
    return `
      <div class="cyberware-authorization-row ${authorization.valid ? "is-valid" : "is-blocked"}">
        ${renderAuthorizationToken("License", license.required ? `${license.category || "CYBERWARE"} / ${license.status || "MISSING"}` : "NOT REQUIRED", license.status)}
        ${renderAuthorizationToken("Subscription", subscription.required ? `${subscription.category || "CYBERWARE"}${subscription.requiredTier ? ` T${subscription.requiredTier}` : ""} / ${subscription.status || "MISSING"}` : "NOT REQUIRED", subscription.status)}
        ${renderAuthorizationToken("Firmware", firmware.required ? `${firmware.status || "UNKNOWN"}${firmware.version || firmware.latestVersion ? ` / ${firmware.version || "?"}->${firmware.latestVersion || "?"}` : ""}` : "NOT REQUIRED", firmware.status)}
      </div>
      ${canUpdateFirmware ? `<button class="secondary-action is-compact cyberware-authorization-update" type="button" data-cyberware-authorization-action="update-firmware" data-item-id="${escapeHtml(getItemId(item))}">Install Firmware ${escapeHtml(firmware.latestVersion || "Current")}</button>` : ""}
    `;
  }

  function renderAuthorizationOverview(citizen = {}, installed = [], authorizationSummary = null) {
    const api = getAuthorizationApi();
    const summary = authorizationSummary || (typeof api.getCyberwareAuthorizationSummary === "function"
      ? api.getCyberwareAuthorizationSummary(citizen, installed)
      : null);
    if (!summary) return "";
    return `
      <section class="cyberware-authorization-overview">
        <div class="cyberware-authorization-overview__head">
          <div><span>AUTHORIZATION</span><b>Citizen Cyberware Access</b></div>
          <small>${escapeHtml(`${summary.valid} READY / ${summary.blocked} BLOCKED`)}</small>
        </div>
        <div class="cyberware-authorization-overview__metrics">
          ${renderAuthorizationToken("Lifetime licenses", String(summary.licenses?.filter((entry) => entry.status === "ACTIVE").length || 0), "ACTIVE")}
          ${renderAuthorizationToken("Authorized systems", String(summary.valid || 0), summary.blocked ? "WARNING" : "ACTIVE")}
          ${renderAuthorizationToken("Blocked systems", String(summary.blocked || 0), summary.blocked ? "BLOCKED" : "ACTIVE")}
          ${renderAuthorizationToken("Updates", String(summary.updateAvailable || 0), summary.updateAvailable ? "UPDATE_AVAILABLE" : "CURRENT")}
        </div>
        <div class="cyberware-authorization-license-list">
          ${(summary.licenses || []).length
            ? summary.licenses.map((license) => `<span class="is-${escapeHtml(String(license.status || "UNKNOWN").toLowerCase())}">${escapeHtml(`${license.label || license.category} / ${license.status} / LIFETIME`)}</span>`).join("")
            : `<span class="is-empty">NO CYBERWARE LICENSES</span>`}
        </div>
      </section>
    `;
  }

  function renderInstalledCyberware(installed = [], citizen = {}, authorizationByItemId = new Map(), selectedItemId = "") {
    if (!installed.length) return `<p class="file-empty">No installed cyberware records.</p>`;
    const selectedId = String(selectedItemId || "").trim();
    return installed.map((item) => {
      const itemId = getItemId(item);
      const selected = Boolean(itemId) && itemId === selectedId;
      const renameControl = typeof app.renderItemInstanceRenameControl === "function"
        ? app.renderItemInstanceRenameControl(item, { compact: true })
        : "";
      return `
        <article class="equipment-cyberware-card ${selected ? "is-selected" : ""}" data-cyberware-system-card="${escapeHtml(itemId)}">
          <button class="equipment-cyberware-card__select" type="button" data-cyberware-select-item="${escapeHtml(itemId)}" aria-pressed="${selected ? "true" : "false"}">
            <span>${escapeHtml(item.slotDisplayLabel || item.slotLabel || item.slot || "UNASSIGNED")}</span>
            <b>${escapeHtml(item.name || itemId || "Cyberware")}</b>
            <small>${escapeHtml([item.scaleLabel || item.scale, item.gradeLabel || item.grade, item.operationalState || item.runtimeStatus || item.status].filter(Boolean).join(" / ") || "INSTALLED")}</small>
          </button>
          ${renderInstalledAuthorization(item, citizen, authorizationByItemId.get(itemId) || null)}
          ${renameControl}
          <div class="equipment-cyberware-card__actions">
            <button class="secondary-action is-compact" type="button" data-cyberware-planner-action="select-target" data-item-id="${escapeHtml(itemId)}">Plan Removal</button>
            <button class="secondary-action is-compact" type="button" data-cyberware-planner-action="replace-target" data-item-id="${escapeHtml(itemId)}">Plan Replace</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderOverviewMetric(label = "", value = "", tone = "") {
    return `<span class="cyberware-overview-metric ${tone ? `is-${escapeHtml(tone.toLowerCase())}` : ""}"><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b></span>`;
  }

  function overviewToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function getOverviewCondition(item = {}) {
    const value = Number(item?.condition ?? item?.durability?.current ?? item?.operational?.condition);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : null;
  }

  function getOverviewConditionState(installed = []) {
    const values = installed.map(getOverviewCondition).filter((value) => value !== null);
    if (!values.length) return { status: "UNKNOWN", tone: "neutral", detail: "NO CONDITION DATA", attention: 0 };
    const lowest = Math.min(...values);
    const attention = values.filter((value) => value < 71).length;
    if (lowest <= 14) return { status: "BROKEN", tone: "blocked", detail: `${attention} SYSTEMS BELOW GOOD / LOWEST ${lowest}%`, attention };
    if (lowest <= 44) return { status: "DAMAGED", tone: "blocked", detail: `${attention} SYSTEMS BELOW GOOD / LOWEST ${lowest}%`, attention };
    if (lowest <= 70) return { status: "WORN", tone: "warning", detail: `${attention} SYSTEMS BELOW GOOD / LOWEST ${lowest}%`, attention };
    if (lowest <= 89) return { status: "GOOD", tone: "ready", detail: `LOWEST CONDITION ${lowest}%`, attention: 0 };
    return { status: "PERFECT", tone: "ready", detail: `LOWEST CONDITION ${lowest}%`, attention: 0 };
  }

  function buildCyberwareOverviewProjection(runtime = {}, citizen = {}) {
    const installed = Array.isArray(runtime?.installed) ? runtime.installed : [];
    const core = runtime?.neuralCore || {};
    const counts = runtime?.counts || {};
    const bodySystems = installed.filter((item) => !item.isCoreProcessor && !item.isCoreInterface && !item.isServicePort);
    const authorizationApi = getAuthorizationApi();
    const authorization = typeof authorizationApi.getCyberwareAuthorizationSummary === "function"
      ? authorizationApi.getCyberwareAuthorizationSummary(citizen, installed)
      : { total: installed.length, valid: installed.length, blocked: 0, updateAvailable: 0, states: [] };
    const states = Array.isArray(authorization?.states) ? authorization.states : [];

    const enabled = Number.isFinite(Number(counts.enabled))
      ? Number(counts.enabled)
      : installed.filter((item) => overviewToken(item.operationalState || item.runtimeStatus || item.status) === "ENABLED").length;
    const fault = Number(counts.fault || 0);
    const locked = Number(counts.locked || 0);
    const maintenance = Number(counts.maintenance || 0);
    const offline = Math.max(0, Number.isFinite(Number(counts.offline)) ? Number(counts.offline) : installed.length - enabled);
    const operationalTone = fault + locked > 0 ? "blocked" : offline > 0 ? "warning" : installed.length ? "ready" : "neutral";
    const operationalStatus = !installed.length ? "NO SYSTEMS" : fault + locked > 0 ? "BLOCKED" : offline > 0 ? "DEGRADED" : "ALL ONLINE";

    const subscriptionStates = states.filter((entry) => entry?.state?.subscription?.required === true);
    let paidSubscriptions = 0;
    let overdueSubscriptions = 0;
    let unpaidSubscriptions = 0;
    subscriptionStates.forEach((entry) => {
      const subscription = entry.state.subscription || {};
      const contract = subscription.subscription || {};
      const billingStatus = overviewToken(contract.billingStatus || contract.status || subscription.status);
      const entitlementStatus = overviewToken(subscription.status);
      if (["PAID", "ACTIVE"].includes(billingStatus) || (entitlementStatus === "ACTIVE" && !["PENDING", "SUSPENDED", "CANCELLED", "OVERDUE"].includes(billingStatus))) paidSubscriptions += 1;
      else if (billingStatus === "OVERDUE" || entitlementStatus === "GRACE_PERIOD") overdueSubscriptions += 1;
      else unpaidSubscriptions += 1;
    });
    const subscriptionRequired = subscriptionStates.length;
    const paymentStatus = !subscriptionRequired
      ? "NOT REQUIRED"
      : unpaidSubscriptions > 0
        ? "ACTION REQUIRED"
        : overdueSubscriptions > 0
          ? "OVERDUE"
          : "PAID";
    const paymentTone = !subscriptionRequired ? "neutral" : unpaidSubscriptions > 0 ? "blocked" : overdueSubscriptions > 0 ? "warning" : "ready";
    const paymentDetail = !subscriptionRequired
      ? "NO CYBERWARE SUBSCRIPTIONS"
      : `${paidSubscriptions}/${subscriptionRequired} PAID${overdueSubscriptions ? ` / ${overdueSubscriptions} OVERDUE` : ""}${unpaidSubscriptions ? ` / ${unpaidSubscriptions} UNPAID` : ""}`;

    const firmwareStates = states.filter((entry) => entry?.state?.firmware?.required === true);
    const firmwareBlocked = firmwareStates.filter((entry) => ["OUTDATED", "CORRUPTED", "BLOCKED", "MISSING"].includes(overviewToken(entry.state.firmware.status))).length;
    const firmwareUpdates = firmwareStates.filter((entry) => overviewToken(entry.state.firmware.status) === "UPDATE_AVAILABLE").length;
    const firmwareCurrent = firmwareStates.filter((entry) => overviewToken(entry.state.firmware.status) === "CURRENT").length;
    const firmwareStatus = !firmwareStates.length ? "NOT REQUIRED" : firmwareBlocked ? "BLOCKED" : firmwareUpdates ? "UPDATE AVAILABLE" : "CURRENT";
    const firmwareTone = !firmwareStates.length ? "neutral" : firmwareBlocked ? "blocked" : firmwareUpdates ? "warning" : "ready";
    const firmwareDetail = !firmwareStates.length
      ? "NO MANAGED FIRMWARE"
      : `${firmwareCurrent}/${firmwareStates.length} CURRENT${firmwareUpdates ? ` / ${firmwareUpdates} UPDATE` : ""}${firmwareBlocked ? ` / ${firmwareBlocked} BLOCKED` : ""}`;

    const licenseStates = states.filter((entry) => entry?.state?.license?.required === true);
    const activeLicenses = licenseStates.filter((entry) => overviewToken(entry.state.license.status) === "ACTIVE").length;
    const blockedAuthorization = Number(authorization?.blocked || 0);
    const authorizationStatus = blockedAuthorization ? "BLOCKED" : installed.length ? "VALID" : "NO SYSTEMS";
    const authorizationTone = blockedAuthorization ? "blocked" : installed.length ? "ready" : "neutral";
    const authorizationDetail = `${Number(authorization?.valid || 0)}/${Number(authorization?.total || installed.length)} SYSTEMS AUTHORIZED${licenseStates.length ? ` / ${activeLicenses}/${licenseStates.length} LICENSES ACTIVE` : ""}`;

    const condition = getOverviewConditionState(installed);
    const issues = [];
    (Array.isArray(core.warnings) ? core.warnings : []).forEach((entry) => issues.push(entry));
    states.forEach((entry) => {
      (Array.isArray(entry?.state?.blockers) ? entry.state.blockers : []).forEach((issue) => issues.push(issue));
      (Array.isArray(entry?.state?.warnings) ? entry.state.warnings : []).forEach((issue) => issues.push(issue));
    });
    installed.forEach((item) => {
      (Array.isArray(item.blockers) ? item.blockers : []).forEach((issue) => issues.push(issue));
      (Array.isArray(item.warnings) ? item.warnings : []).forEach((issue) => issues.push(issue));
    });
    const uniqueIssues = [...new Set(issues.map(overviewToken).filter(Boolean))].slice(0, 12);
    const findingsStatus = fault + locked > 0 || blockedAuthorization > 0 ? "ACTION REQUIRED" : uniqueIssues.length ? "ADVISORY" : "CLEAR";
    const findingsTone = fault + locked > 0 || blockedAuthorization > 0 ? "blocked" : uniqueIssues.length ? "warning" : "ready";

    const systemState = overviewToken(core.systemState || (core.neurochip && core.interface ? "ENABLED" : "LOCKED"));
    return {
      systemState,
      installed,
      core,
      metrics: {
        installed: installed.length,
        bodySystems: bodySystems.length,
        neuroLoad: `${Number(core.neuroLoad || 0)} / ${Number(core.neuroCapacity || 0)}`,
        neuroChannels: `${Number(core.channelLoad || 0)} / ${Number(core.controlChannels || 0)}`,
        interfaceLoad: `${Number(core.interfaceLoad || 0)} / ${Number(core.interfaceCapacity || 0)}`,
        stability: Number(core.stability || 0),
        security: Number(core.security || 0),
        latency: formatToken(core.latencyClass || "NONE")
      },
      readiness: [
        { key: "operations", label: "Operational State", status: operationalStatus, detail: `${enabled}/${installed.length} ENABLED / ${offline} OFFLINE / ${maintenance} MAINTENANCE`, tone: operationalTone },
        { key: "payments", label: "Subscription Billing", status: paymentStatus, detail: paymentDetail, tone: paymentTone },
        { key: "authorization", label: "Licenses & Access", status: authorizationStatus, detail: authorizationDetail, tone: authorizationTone },
        { key: "firmware", label: "Firmware", status: firmwareStatus, detail: firmwareDetail, tone: firmwareTone },
        { key: "condition", label: "Physical Condition", status: condition.status, detail: condition.detail, tone: condition.tone },
        { key: "findings", label: "Current Findings", status: findingsStatus, detail: uniqueIssues.length ? `${uniqueIssues.length} ACTIVE FINDINGS` : "NO ACTIVE FINDINGS", tone: findingsTone }
      ],
      issues: uniqueIssues
    };
  }

  function renderOverviewReadinessCard(card = {}) {
    const tone = String(card.tone || "neutral").toLowerCase();
    return `<article class="cyberware-overview-readiness-card is-${escapeHtml(tone)}" data-cyberware-overview-status="${escapeHtml(card.key || "status")}"><small>${escapeHtml(card.label || "STATUS")}</small><b>${escapeHtml(card.status || "UNKNOWN")}</b><span>${escapeHtml(card.detail || "")}</span></article>`;
  }

  function renderCyberwareOverviewPanel(runtime = {}, citizen = {}) {
    const projection = buildCyberwareOverviewProjection(runtime, citizen);
    const core = projection.core;
    return `<section class="equipment-shell-panel cyberware-overview-dashboard is-${escapeHtml(projection.systemState.toLowerCase())}" data-cyberware-overview-summary-host>
      <div class="equipment-shell-panel__head cyberware-ui-section-head"><div><p class="kicker">CYBERWARE / OVERVIEW</p><h5>System Readiness Overview</h5><small>Operational, authorization, billing, firmware and condition summary.</small></div><span class="equipment-panel-badge is-${escapeHtml(projection.systemState.toLowerCase())}">${escapeHtml(formatToken(projection.systemState))}</span></div>
      <section class="cyberware-overview-block">
        <div class="cyberware-overview-block__head"><span>CAPACITY</span><b>Neural System Load</b></div>
        <div class="cyberware-overview-metrics">
          ${renderOverviewMetric("Installed", String(projection.metrics.installed))}
          ${renderOverviewMetric("Body systems", String(projection.metrics.bodySystems))}
          ${renderOverviewMetric("Neuroload", projection.metrics.neuroLoad, Number(core.neuralStrain || 0) > 0 ? "warning" : "ready")}
          ${renderOverviewMetric("Neurochannels", projection.metrics.neuroChannels)}
          ${renderOverviewMetric("Interface load", projection.metrics.interfaceLoad)}
          ${renderOverviewMetric("Stability", String(projection.metrics.stability), projection.metrics.stability < 40 ? "warning" : "ready")}
          ${renderOverviewMetric("Security", String(projection.metrics.security), projection.metrics.security < 40 ? "warning" : "ready")}
          ${renderOverviewMetric("Latency", projection.metrics.latency)}
        </div>
      </section>
      <section class="cyberware-overview-block">
        <div class="cyberware-overview-block__head"><span>READINESS</span><b>Current Cyberware Status</b></div>
        <div class="cyberware-overview-readiness-grid">${projection.readiness.map(renderOverviewReadinessCard).join("")}</div>
      </section>
      <section class="cyberware-overview-block cyberware-overview-findings ${projection.issues.length ? "has-findings" : "is-clear"}">
        <div class="cyberware-overview-block__head"><span>ATTENTION</span><b>${projection.issues.length ? "Review Required" : "No Immediate Action"}</b></div>
        ${projection.issues.length
          ? `<div class="cyberware-overview-findings__list">${projection.issues.map((issue) => `<span class="cyberware-overview-finding">${escapeHtml(formatToken(issue))}</span>`).join("")}</div>`
          : '<p class="cyberware-overview-clear">All installed systems report valid authorization, current managed state and no active runtime findings.</p>'}
      </section>
    </section>`;
  }

  function renderCyberwareCoreSection(runtime = {}) {
    return `<div data-cyberware-core-stack-host>${renderCoreStackPanel(runtime, { embedded: true })}</div>`;
  }

  function renderCyberwareNeuralCoreWorkspace(runtime = {}, citizen = {}, view = "CORE_STACK", options = {}) {
    const activeView = String(view || "CORE_STACK").trim().toUpperCase() === "DIAGNOSTICS" ? "DIAGNOSTICS" : "CORE_STACK";
    const citizenId = String(citizen?.id || "").trim();
    const diagnosticsOpen = options.mountDiagnostics === true;
    const detail = activeView === "DIAGNOSTICS"
      ? `<div class="cyberware-diagnostics-host" data-cyberware-diagnostics-host data-cyberware-diagnostics-mounted="${diagnosticsOpen ? "true" : "false"}" data-cyberware-diagnostics-dirty="false">${diagnosticsOpen ? renderCyberwareDiagnosticsPanel(citizenId, runtime, options.diagnostics || null, { embedded: true }) : renderCyberwareDiagnosticsPlaceholder(runtime, { embedded: true })}</div>`
      : renderCyberwareCoreSection(runtime);
    return `
      <div class="cyberware-neural-core-workspace is-${activeView.toLowerCase().replace(/_/g, "-")}" data-cyberware-neural-core-workspace data-neural-core-view="${activeView}">
        ${renderCyberwareNeuralCoreSummary(runtime, citizen, activeView)}
        <div class="cyberware-neural-core-detail">${detail}</div>
      </div>
    `;
  }

  function getBodymapPoint(slotKey = "") {
    const slot = String(slotKey || "").trim();
    if (CYBERWARE_BODYMAP_POINTS[slot]) return CYBERWARE_BODYMAP_POINTS[slot];
    if (/^left(?:Thumb|Index|Middle|Ring|Little)/.test(slot)) return [18, 55, "front"];
    if (/^right(?:Thumb|Index|Middle|Ring|Little)/.test(slot)) return [82, 55, "front"];
    if (/^left.*Arm/.test(slot)) return [28, 35, "front"];
    if (/^right.*Arm/.test(slot)) return [72, 35, "front"];
    if (/^left.*Leg/.test(slot)) return [43, 72, "front"];
    if (/^right.*Leg/.test(slot)) return [57, 72, "front"];
    return null;
  }

  function getCyberwareBodymapEntry(item = {}) {
    const anatomyEntry = app.cyberwareAnatomyBodymap?.locateItem?.(item);
    if (anatomyEntry) return anatomyEntry;
    const rawSlots = Array.isArray(item.slots) && item.slots.length
      ? item.slots
      : [item.primarySlot || item.slot].filter(Boolean);
    const slots = typeof app.cyberwareRuntime?.compressCyberwareSlotFootprint === "function"
      ? app.cyberwareRuntime.compressCyberwareSlotFootprint(rawSlots)
      : rawSlots;
    const slot = slots.find((entry) => getBodymapPoint(entry)) || slots[0] || "";
    const point = getBodymapPoint(slot);
    return point ? { item, slot, x: point[0], y: point[1], view: normalizeCyberwareBodymapView(point[2]), pathLabel: normalizeCyberwareBodymapView(point[2]).toUpperCase() } : null;
  }

  function getCyberwareBodymapMarkers(runtime = {}) {
    const installed = Array.isArray(runtime?.installed) ? runtime.installed : [];
    return installed.map(getCyberwareBodymapEntry).filter(Boolean);
  }

  function resolveCyberwareUiSelection(citizenId = "", runtime = {}) {
    const id = String(citizenId || "").trim();
    const state = getCyberwareUiState(id);
    const installed = Array.isArray(runtime?.installed) ? runtime.installed : [];
    const selectedIsValid = installed.some((item) => getItemId(item) === state.selectedInstanceId);
    if (!selectedIsValid) {
      state.selectedInstanceId = getItemId(installed[0] || {});
      const initialEntry = state.selectedInstanceId
        ? getCyberwareBodymapEntry(installed.find((item) => getItemId(item) === state.selectedInstanceId) || {})
        : null;
      if (initialEntry) {
        state.bodymapView = initialEntry.view;
        app.cyberwareAnatomyBodymap?.locateStateForItem?.(state, installed.find((item) => getItemId(item) === state.selectedInstanceId) || {});
      }
    }
    const selected = installed.find((item) => getItemId(item) === state.selectedInstanceId) || null;
    return { state, installed, selected, marker: selected ? getCyberwareBodymapEntry(selected) : null };
  }

  function getCyberwareInspectorAuthorization(citizen = {}, item = {}) {
    const resolver = getAuthorizationApi().getCyberwareAuthorizationState;
    return typeof resolver === "function" ? resolver(citizen, item) : null;
  }

  function renderCyberwareInspectorMeta(label = "", value = "", options = {}) {
    const display = value === null || value === undefined || value === "" ? "N/A" : String(value);
    return `<span class="cyberware-inspector-meta ${options.wide ? "is-wide" : ""} ${options.tone ? `is-${escapeHtml(options.tone)}` : ""}"><small>${escapeHtml(label)}</small><b>${escapeHtml(display)}</b></span>`;
  }

  function renderCyberwareInspectorIssues(title = "", values = [], tone = "warning") {
    const rows = Array.isArray(values) ? [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))] : [];
    if (!rows.length) return "";
    return `<section class="cyberware-inspector-issues is-${escapeHtml(tone)}"><small>${escapeHtml(title)}</small><div>${rows.map((value) => `<span>${escapeHtml(formatToken(value))}</span>`).join("")}</div></section>`;
  }

  function renderCyberwareInspector(item = null, citizen = {}, options = {}) {
    if (!item) {
      const emptyMessage = options.emptyMessage || "Select an installed system or Bodymap node to inspect its ItemInstance.";
      return `<section class="cyberware-inspector is-empty" data-cyberware-inspector><div class="cyberware-inspector__empty"><b>NO SYSTEM SELECTED</b><span>${escapeHtml(emptyMessage)}</span></div></section>`;
    }
    const itemId = getItemId(item);
    const authorization = options.authorization || getCyberwareInspectorAuthorization(citizen, item) || {};
    const license = authorization.license || {};
    const subscription = authorization.subscription || {};
    const firmware = authorization.firmware || {};
    const allocation = item.resourceAllocation || item.operational?.allocation || {};
    const condition = getOverviewCondition(item);
    const bodymapEntry = getCyberwareBodymapEntry(item);
    const slots = Array.isArray(item.slots) && item.slots.length ? item.slots : [item.primarySlot || item.slot].filter(Boolean);
    const protocols = Array.isArray(item.requiredProtocols) && item.requiredProtocols.length
      ? item.requiredProtocols
      : Array.isArray(item.protocolSupport) ? item.protocolSupport : [];
    const blockers = item.operationalBlockers || item.operational?.blockers || [];
    const warnings = item.operationalWarnings || item.operational?.warnings || [];
    const calibration = item.cyberwareState?.calibration && typeof item.cyberwareState.calibration === "object"
      ? item.cyberwareState.calibration
      : {};
    const installedFirmware = Array.isArray(item.cyberwareState?.installedFirmware) ? item.cyberwareState.installedFirmware : [];
    const serviceHistory = Array.isArray(item.serviceHistory) ? item.serviceHistory : [];
    const lastService = serviceHistory[serviceHistory.length - 1] || null;
    const serialNumber = item.hardwareIdentity?.serialNumber || item.serialNumber || "";
    const modelName = item.catalogName || item.modelName || item.definitionName || item.definitionId || item.sourceCatalogId || "";
    const typeLabel = item.processorRole || item.implantType || item.subtype || item.category || "CYBERWARE";
    const state = String(item.operationalState || item.runtimeStatus || item.status || "UNKNOWN").trim().toUpperCase();
    const reason = item.operationalReason || item.runtimeReason || item.operational?.reason || "";
    const conditionTone = condition !== null && condition < 45 ? "blocked" : condition !== null && condition < 71 ? "warning" : "ready";
    const renameControl = typeof app.renderItemInstanceRenameControl === "function"
      ? app.renderItemInstanceRenameControl(item, { compact: true })
      : "";
    return `<section class="cyberware-inspector is-${escapeHtml(state.toLowerCase())}" data-cyberware-inspector data-cyberware-inspector-item="${escapeHtml(itemId)}">
      <div class="cyberware-inspector__head"><div><p class="kicker">${escapeHtml(options.contextLabel || "CYBERWARE / INSPECTOR")}</p><h5>${escapeHtml(item.name || itemId || "Cyberware")}</h5><small>${escapeHtml([modelName, item.manufacturer || item.provider].filter(Boolean).join(" / ") || "ITEMINSTANCE")}</small></div><span class="equipment-panel-badge is-${escapeHtml(state.toLowerCase())}">${escapeHtml(formatToken(state))}</span></div>
      <div class="cyberware-inspector__meta">
        ${renderCyberwareInspectorMeta("Location", slots.length ? slots.map(formatToken).join(" + ") : formatToken(item.locationType || "BODY"), { wide: true })}
        ${renderCyberwareInspectorMeta("Bodymap", bodymapEntry ? (bodymapEntry.pathLabel || bodymapEntry.view || "MAPPED") : "UNMAPPED", { wide: true })}
        ${renderCyberwareInspectorMeta("Condition", condition === null ? "UNKNOWN" : `${condition}%`, { tone: conditionTone })}
        ${renderCyberwareInspectorMeta("Grade / Scale", [item.gradeLabel || item.grade, item.scaleLabel || item.scale].filter(Boolean).map(formatToken).join(" / ") || "N/A")}
        ${renderCyberwareInspectorMeta("Type", formatToken(typeLabel))}
        ${renderCyberwareInspectorMeta("Tier", item.productTier || item.tier ? `T${item.productTier || item.tier}` : "N/A")}
      </div>
      <section class="cyberware-inspector__resources">
        ${renderCyberwareInspectorMeta("Neuroload", allocation.neuroLoad ?? item.neuroLoad ?? 0)}
        ${renderCyberwareInspectorMeta("Neurochannels", allocation.neuroChannels ?? item.neuroChannels ?? 0)}
        ${renderCyberwareInspectorMeta("Interface load", allocation.interfaceLoad ?? item.interfaceLoad ?? 0)}
        ${renderCyberwareInspectorMeta("State reason", reason ? formatToken(reason) : "READY", { wide: true })}
      </section>
      <section class="cyberware-inspector__authorization">
        ${renderCyberwareInspectorMeta("License", license.required ? `${formatToken(license.category || "CYBERWARE")} / ${formatToken(license.status || "MISSING")}` : "NOT REQUIRED", { wide: true, tone: license.valid === false ? "blocked" : "ready" })}
        ${renderCyberwareInspectorMeta("Subscription", subscription.required ? `${formatToken(subscription.category || "CYBERWARE")}${subscription.requiredTier ? ` T${subscription.requiredTier}` : ""} / ${formatToken(subscription.status || "MISSING")}` : "NOT REQUIRED", { wide: true, tone: subscription.valid === false ? "blocked" : "ready" })}
        ${renderCyberwareInspectorMeta("Firmware", firmware.required ? `${formatToken(firmware.status || "UNKNOWN")} / ${firmware.version || "?"}${firmware.latestVersion ? ` → ${firmware.latestVersion}` : ""}` : "NOT REQUIRED", { wide: true, tone: firmware.valid === false ? "blocked" : firmware.warning ? "warning" : "ready" })}
      </section>
      ${renderCyberwareInspectorIssues("BLOCKERS", blockers, "blocked")}
      ${renderCyberwareInspectorIssues("WARNINGS", warnings, "warning")}
      <section class="cyberware-inspector__service">
        ${renderCyberwareInspectorMeta("Calibration", calibration.quality ?? item.calibrationQuality ?? "UNKNOWN")}
        ${renderCyberwareInspectorMeta("Firmware records", String(installedFirmware.length))}
        ${renderCyberwareInspectorMeta("Last service", lastService?.occurredAt || lastService?.completedAt || lastService?.createdAt || lastService?.date || "NO RECORD", { wide: true })}
      </section>
      ${typeof app.renderCyberwareUpgradePanel === "function" ? app.renderCyberwareUpgradePanel(item, citizen) : ""}
      ${renameControl}
      <details class="cyberware-inspector__technical"><summary>Technical identity</summary><div>
        ${renderCyberwareInspectorMeta("Instance ID", itemId, { wide: true })}
        ${renderCyberwareInspectorMeta("Definition ID", item.definitionId || item.sourceCatalogId || item.catalogId || "N/A", { wide: true })}
        ${renderCyberwareInspectorMeta("Serial number", serialNumber || "N/A", { wide: true })}
        ${renderCyberwareInspectorMeta("Lifecycle", formatToken(item.lifecycleState || "INSTALLED"))}
        ${renderCyberwareInspectorMeta("Protocols", protocols.length ? protocols.map(formatToken).join(" / ") : "NONE", { wide: true })}
      </div></details>
      ${options.showActions === false ? "" : `<div class="cyberware-inspector__actions">
        ${bodymapEntry ? `<button class="secondary-action is-compact" type="button" data-cyberware-locate-instance="${escapeHtml(itemId)}">Locate on Bodymap</button>` : ""}
        <button class="secondary-action is-compact" type="button" data-cyberware-planner-action="select-target" data-item-id="${escapeHtml(itemId)}">Plan Removal</button>
        <button class="secondary-action is-compact" type="button" data-cyberware-planner-action="replace-target" data-item-id="${escapeHtml(itemId)}">Plan Replace</button>
        <button class="secondary-action is-compact" type="button" data-cyberware-maintenance-action="open" data-item-id="${escapeHtml(itemId)}">Open Maintenance</button>
        ${firmware.required && ["UPDATE_AVAILABLE", "OUTDATED", "MISSING", "CORRUPTED"].includes(String(firmware.status || "").toUpperCase()) ? `<button class="secondary-action is-compact" type="button" data-cyberware-authorization-action="update-firmware" data-item-id="${escapeHtml(itemId)}">Update Firmware</button>` : ""}
      </div>`}
    </section>`;
  }

  function renderCyberwareSelectionList(installed = [], selectedItemId = "") {
    const selectedId = String(selectedItemId || "").trim();
    if (!installed.length) return `<p class="file-empty">No installed cyberware records.</p>`;
    return installed.map((item) => {
      const itemId = getItemId(item);
      const selected = itemId === selectedId;
      const entry = getCyberwareBodymapEntry(item);
      return `<button class="cyberware-bodymap-index-row ${selected ? "is-selected" : ""}" type="button" data-cyberware-select-item="${escapeHtml(itemId)}" aria-pressed="${selected ? "true" : "false"}"><span>${escapeHtml(entry ? `${entry.pathLabel || formatToken(entry.view)} / ${formatToken(entry.slot)}` : "UNMAPPED")}</span><b>${escapeHtml(item.name || itemId || "Cyberware")}</b><small>${escapeHtml(formatToken(item.operationalState || item.runtimeStatus || item.status || "UNKNOWN"))}</small></button>`;
    }).join("");
  }

  function renderCyberwareSystemsPanel(runtime = {}, citizen = {}) {
    const selection = resolveCyberwareUiSelection(citizen?.id, runtime);
    const installed = selection.installed;
    const implants = installed.filter((item) => !item.isCoreProcessor && !item.isCoreInterface && !item.isServicePort);
    const authorizationApi = getAuthorizationApi();
    const authorizationSummary = typeof authorizationApi.getCyberwareAuthorizationSummary === "function" ? authorizationApi.getCyberwareAuthorizationSummary(citizen, installed) : null;
    const authorizationByItemId = new Map((authorizationSummary?.states || []).map((entry) => [getItemId(entry.item), entry.state]));
    return `<section class="equipment-shell-panel cyberware-systems-panel" data-cyberware-systems-host>
      <div class="equipment-shell-panel__head cyberware-ui-section-head"><div><p class="kicker">CYBERWARE / SYSTEMS</p><h5>Installed Systems</h5></div><span class="equipment-panel-badge">${escapeHtml(`${implants.length} IMPLANTS`)}</span></div>
      ${renderAuthorizationOverview(citizen, installed, authorizationSummary)}
      <div class="cyberware-systems-browser">
        <section class="equipment-cyberware-installed-section"><div class="equipment-cyberware-installed-section__head"><div><span>BODY SYSTEMS</span><b>Installed Implants</b></div><small>${escapeHtml(`${implants.length} RECORDS`)}</small></div><div class="equipment-cyberware-list">${renderInstalledCyberware(implants, citizen, authorizationByItemId, selection.state.selectedInstanceId)}</div></section>
        <div class="cyberware-inspector-host" data-cyberware-inspector-host>${renderCyberwareInspector(selection.selected, citizen)}</div>
      </div>
    </section>`;
  }

  function renderCyberwareBodymapPanel(runtime = {}, citizen = {}) {
    const selection = resolveCyberwareUiSelection(citizen?.id, runtime);
    const renderer = app.cyberwareAnatomyBodymap?.renderPanel;
    if (typeof renderer === "function") {
      return renderer({
        runtimeState: runtime,
        citizen,
        state: selection.state,
        renderInspector: renderCyberwareInspector
      });
    }
    return `<section class="equipment-shell-panel cyberware-bodymap-panel" data-cyberware-bodymap-host><p class="file-empty">Cyberware anatomy Bodymap runtime unavailable.</p></section>`;
  }

  function syncCyberwareBodymapWorkspace(citizenId = "", options = {}) {
    const id = String(citizenId || "").trim();
    const root = options.root || getCyberwareWorkspaceRoot(id);
    const workspace = getCyberwareWorkspaceElement(root);
    const citizen = options.citizen || getCitizen(id);
    if (!workspace || !citizen) return false;
    const runtime = options.runtime || getCyberwareWorkspaceRuntime(citizen);
    const selection = resolveCyberwareUiSelection(id, runtime);
    const currentBodymap = workspace.querySelector("[data-cyberware-bodymap-host]");
    const nextBodymap = currentBodymap ? createMarkupNode(renderCyberwareBodymapPanel(runtime, citizen)) : null;
    if (currentBodymap && nextBodymap) currentBodymap.replaceWith(nextBodymap);
    workspace.querySelectorAll("[data-cyberware-select-item]").forEach((control) => {
      const selected = String(control.dataset.cyberwareSelectItem || "").trim() === selection.state.selectedInstanceId;
      control.classList.toggle("is-selected", selected);
      control.setAttribute("aria-pressed", selected ? "true" : "false");
      control.closest?.("[data-cyberware-system-card]")?.classList.toggle("is-selected", selected);
    });
    workspace.querySelectorAll("[data-cyberware-inspector-host]").forEach((host) => {
      if (host.closest?.("[data-cyberware-bodymap-host]")) return;
      host.innerHTML = renderCyberwareInspector(selection.selected, citizen);
    });
    return true;
  }

  function setCyberwareBodymapView(citizenId = "", view = "front", options = {}) {
    const id = String(citizenId || "").trim();
    const state = getCyberwareUiState(id);
    const orientation = String(view || "front").trim().toUpperCase();
    app.cyberwareAnatomyBodymap?.orientState?.(state, orientation);
    state.bodymapView = normalizeCyberwareBodymapView(view);
    syncCyberwareBodymapWorkspace(id, options);
    return state.bodymapOrientationByRegion?.[state.bodymapRegion] || orientation;
  }

  function openCyberwareBodymapView(citizenId = "", regionId = "BODY", options = {}) {
    const id = String(citizenId || "").trim();
    const state = getCyberwareUiState(id);
    const changed = app.cyberwareAnatomyBodymap?.navigateState?.(state, regionId, options);
    if (!changed) return false;
    syncCyberwareBodymapWorkspace(id, options);
    return true;
  }

  function setCyberwareBodymapOrientation(citizenId = "", orientation = "FRONT", options = {}) {
    const id = String(citizenId || "").trim();
    const state = getCyberwareUiState(id);
    const changed = app.cyberwareAnatomyBodymap?.orientState?.(state, orientation);
    if (!changed) return false;
    syncCyberwareBodymapWorkspace(id, options);
    return true;
  }

  function selectCyberwareBodymapAnchor(citizenId = "", anchorId = "", options = {}) {
    const id = String(citizenId || "").trim();
    const citizen = options.citizen || getCitizen(id);
    const runtime = options.runtime || (citizen ? getCyberwareWorkspaceRuntime(citizen) : { installed: [] });
    const state = getCyberwareUiState(id);
    const result = app.cyberwareAnatomyBodymap?.selectAnchorState?.(state, anchorId, runtime.installed || []);
    if (!result?.ok) return result || { ok: false, reason: "ANCHOR_NOT_FOUND" };
    syncCyberwareBodymapWorkspace(id, { ...options, citizen, runtime });
    if (Array.isArray(result.items) && result.items.length === 1) {
      const root = options.root || getCyberwareWorkspaceRoot(id);
      const currentHistory = root?.querySelector?.('[data-cyberware-ui-panel="HISTORY"] [data-cyberware-history-host]') || null;
      const nextHistory = currentHistory ? createMarkupNode(renderCyberwareHistoryPanel(runtime, citizen, { embedded: true })) : null;
      if (currentHistory && nextHistory) currentHistory.replaceWith(nextHistory);
      refreshCyberwareOperationsContext(id, { ...options, root, citizen, runtime });
    }
    return result;
  }

  function setCyberwareSelectedInstance(citizenId = "", instanceId = "", options = {}) {
    const id = String(citizenId || "").trim();
    const citizen = options.citizen || getCitizen(id);
    const runtime = options.runtime || (citizen ? getCyberwareWorkspaceRuntime(citizen) : { installed: [] });
    const installed = Array.isArray(runtime?.installed) ? runtime.installed : [];
    const normalizedId = String(instanceId || "").trim();
    const selected = installed.find((item) => getItemId(item) === normalizedId) || null;
    const state = getCyberwareUiState(id);
    state.selectedInstanceId = selected ? getItemId(selected) : "";
    const marker = selected ? getCyberwareBodymapEntry(selected) : null;
    if (marker && options.syncView !== false) {
      state.bodymapView = marker.view;
      app.cyberwareAnatomyBodymap?.locateStateForItem?.(state, selected);
    }
    syncCyberwareBodymapWorkspace(id, { ...options, citizen, runtime });
    const root = options.root || getCyberwareWorkspaceRoot(id);
    const currentHistory = root?.querySelector?.('[data-cyberware-ui-panel="HISTORY"] [data-cyberware-history-host]') || null;
    const nextHistory = currentHistory ? createMarkupNode(renderCyberwareHistoryPanel(runtime, citizen, { embedded: true })) : null;
    if (currentHistory && nextHistory) currentHistory.replaceWith(nextHistory);
    refreshCyberwareOperationsContext(id, { ...options, root, citizen, runtime });
    return { selectedInstanceId: state.selectedInstanceId, bodymapView: state.bodymapView, bodymapRegion: state.bodymapRegion, item: selected };
  }

  function getCyberwareOperationReferenceIds(operation = {}) {
    const refs = operation?.refs && typeof operation.refs === "object" ? operation.refs : {};
    const subjectRefs = operation?.subjectRefs && typeof operation.subjectRefs === "object" ? operation.subjectRefs : {};
    return [...new Set([
      ...(Array.isArray(operation.instanceIds) ? operation.instanceIds : []),
      ...(Array.isArray(refs.instanceIds) ? refs.instanceIds : []),
      ...(Array.isArray(subjectRefs.instanceIds) ? subjectRefs.instanceIds : []),
      operation.instanceId,
      refs.instanceId,
      refs.sourceItemId,
      refs.targetItemId,
      subjectRefs.instanceId
    ].map((value) => String(value || "").trim()).filter(Boolean))];
  }

  function getLatestCyberwareWorldOperation(citizenId = "", instanceId = "") {
    if (typeof app.getWorldBridgeOperations !== "function") return null;
    const id = String(citizenId || "").trim();
    const itemId = String(instanceId || "").trim();
    const rows = app.getWorldBridgeOperations({ citizenId: id }) || [];
    const cyberwareRows = rows.filter((operation) => {
      const type = String(operation?.operationType || "").toUpperCase();
      return ["PURCHASE_AND_INSTALL", "INSTALL", "DEINSTALL", "REPLACE", "MAINTENANCE", "DIAGNOSTIC", "REPAIR", "CALIBRATION", "CLEAN", "FIRMWARE_UPDATE", "LICENSE_REVIEW"].includes(type);
    });
    return cyberwareRows.find((operation) => !itemId || getCyberwareOperationReferenceIds(operation).includes(itemId)) || null;
  }

  function resolveCyberwareOperationsInspectorItem(citizenId = "", runtime = {}, citizen = {}, activeView = "PLANNER") {
    const id = String(citizenId || citizen?.id || "").trim();
    const view = normalizeCyberwareUiView(activeView);
    const state = getCyberwareUiState(id);
    const installed = Array.isArray(runtime?.installed) ? runtime.installed : [];
    if (view === "PLANNER") {
      const vm = typeof getPlannerApi().getPlannerViewModel === "function" ? getPlannerApi().getPlannerViewModel(id) : null;
      const operation = String(vm?.state?.operation || "INSTALL").toUpperCase();
      let role = operation === "INSTALL" ? "SOURCE" : operation === "DEINSTALL" ? "TARGET" : normalizeCyberwareOperationsInspectorRole(state.operationsInspectorRole);
      if (role === "AUTO") role = vm?.target ? "TARGET" : "SOURCE";
      const item = role === "SOURCE" ? vm?.source || null : vm?.target || null;
      return { item, role, plannerVm: vm, maintenanceVm: null };
    }
    if (view === "MAINTENANCE") {
      const maintenanceApi = getMaintenanceApi();
      let vm = typeof maintenanceApi.getCyberwareMaintenanceViewModel === "function" ? maintenanceApi.getCyberwareMaintenanceViewModel(id) : null;
      const selectedId = String(state.selectedInstanceId || "").trim();
      if (selectedId && vm?.state?.selectedItemId !== selectedId && Array.isArray(vm?.items) && vm.items.some((item) => getItemId(item) === selectedId) && typeof maintenanceApi.setCyberwareMaintenanceSelection === "function") {
        maintenanceApi.setCyberwareMaintenanceSelection(id, { selectedItemId: selectedId, feedback: null });
        vm = maintenanceApi.getCyberwareMaintenanceViewModel(id);
      }
      return { item: vm?.selectedItem || null, role: "TARGET", plannerVm: null, maintenanceVm: vm };
    }
    const item = installed.find((entry) => getItemId(entry) === state.selectedInstanceId) || installed[0] || null;
    return { item, role: "TARGET", plannerVm: null, maintenanceVm: null };
  }

  function buildCyberwareOperationsProjection(citizenId = "", runtime = {}, citizen = {}, activeView = "PLANNER") {
    const id = String(citizenId || citizen?.id || "").trim();
    const view = normalizeCyberwareUiView(activeView);
    const selection = resolveCyberwareOperationsInspectorItem(id, runtime, citizen, view);
    const itemId = getItemId(selection.item || {});
    const worldOperation = getLatestCyberwareWorldOperation(id, itemId);
    let operation = view;
    let status = "IDLE";
    let quote = null;
    let duration = null;
    let blockers = [];
    let warnings = [];
    if (view === "PLANNER") {
      const vm = selection.plannerVm || {};
      operation = String(vm?.state?.operation || "INSTALL").toUpperCase();
      status = String(vm?.plan?.status || vm?.result?.reason || (vm?.plan ? "ANALYZED" : "AWAITING_ANALYSIS")).toUpperCase();
      quote = vm?.plan?.procedureCost ?? null;
      duration = vm?.plan?.durationMinutes ?? null;
      blockers = Array.isArray(vm?.plan?.blockers) ? vm.plan.blockers : [];
      warnings = Array.isArray(vm?.plan?.warnings) ? vm.plan.warnings : [];
    } else if (view === "MAINTENANCE") {
      const vm = selection.maintenanceVm || {};
      operation = String(vm?.state?.operation || "MAINTENANCE").toUpperCase();
      status = String(vm?.quote?.status || "IDLE").toUpperCase();
      quote = vm?.quote?.cost ?? null;
      duration = vm?.quote?.durationMinutes ?? null;
      blockers = Array.isArray(vm?.quote?.blockers) ? vm.quote.blockers : [];
      warnings = Array.isArray(vm?.quote?.warnings) ? vm.quote.warnings : [];
    } else {
      operation = "HISTORY";
      const rows = getCyberwareHistory(runtime, citizen);
      status = rows.length ? "RECORDED" : "EMPTY";
    }
    return {
      citizenId: id,
      activeView: view,
      operation,
      status,
      quote,
      duration,
      blockers,
      warnings,
      item: selection.item,
      itemId,
      inspectorRole: selection.role,
      plannerVm: selection.plannerVm,
      maintenanceVm: selection.maintenanceVm,
      worldOperation,
      worldStatus: String(worldOperation?.status || "NO ACTIVE OPERATION").toUpperCase(),
      worldStep: String(worldOperation?.currentStep || "").toUpperCase()
    };
  }

  function operationsTone(value = "") {
    const token = String(value || "").toUpperCase();
    if (["BLOCKED", "FAILED", "ERROR", "RECOVERY_REQUIRED", "COMPENSATION_REQUIRED", "PAYMENT_RECOVERY_REQUIRED"].some((entry) => token.includes(entry))) return "blocked";
    if (["WARNING", "ADVISORY", "SCHEDULED", "IN_PROGRESS", "COMMITTING", "CAPTURING"].some((entry) => token.includes(entry))) return "warning";
    if (["READY", "VALID", "COMPLETED", "RECORDED", "ENABLED"].some((entry) => token.includes(entry))) return "ready";
    return "neutral";
  }

  function renderCyberwareOperationsSummary(projection = {}) {
    const itemLabel = projection.item?.name || projection.itemId || "NO SYSTEM SELECTED";
    const quoteLabel = projection.quote === null || projection.quote === undefined ? "NOT QUOTED" : formatCredits(projection.quote);
    const durationLabel = projection.duration === null || projection.duration === undefined ? "NOT SCHEDULED" : formatDuration(projection.duration);
    const findingCount = (projection.blockers?.length || 0) + (projection.warnings?.length || 0);
    return `<section class="equipment-shell-panel cyberware-operations-summary is-${escapeHtml(operationsTone(projection.status))}" data-cyberware-operations-summary-host>
      <div class="equipment-shell-panel__head cyberware-ui-section-head"><div><p class="kicker">CYBERWARE / OPERATIONS</p><h5>Operations Workspace</h5><small>Planner, maintenance and history share one ItemInstance context.</small></div><span class="equipment-panel-badge">${escapeHtml(formatToken(projection.status || "IDLE"))}</span></div>
      <div class="cyberware-operations-context-grid">
        ${renderCyberwareInspectorMeta("Selected system", itemLabel, { wide: true })}
        ${renderCyberwareInspectorMeta("Operation", formatToken(projection.operation || projection.activeView || "IDLE"))}
        ${renderCyberwareInspectorMeta("World Bridge", formatToken(projection.worldStatus || "NO ACTIVE OPERATION"), { tone: operationsTone(projection.worldStatus) })}
        ${renderCyberwareInspectorMeta("Quote", quoteLabel)}
        ${renderCyberwareInspectorMeta("Duration", durationLabel)}
        ${renderCyberwareInspectorMeta("Findings", `${findingCount} TOTAL`, { tone: projection.blockers?.length ? "blocked" : projection.warnings?.length ? "warning" : "ready" })}
      </div>
      ${projection.worldStep ? `<p class="cyberware-operations-step">CURRENT STEP · ${escapeHtml(formatToken(projection.worldStep))}</p>` : ""}
      ${renderCyberwareInspectorIssues("BLOCKERS", projection.blockers || [], "blocked")}
      ${renderCyberwareInspectorIssues("WARNINGS", projection.warnings || [], "warning")}
    </section>`;
  }

  function renderCyberwareOperationsRoleSwitch(projection = {}) {
    if (projection.activeView !== "PLANNER" || String(projection.operation || "").toUpperCase() !== "REPLACE") return "";
    return `<div class="cyberware-operations-role-switch" role="group" aria-label="Replacement inspector subject"><span>INSPECT</span>${["SOURCE", "TARGET"].map((role) => `<button type="button" data-cyberware-operations-inspector-role="${role}" class="${projection.inspectorRole === role ? "is-active" : ""}" aria-pressed="${projection.inspectorRole === role ? "true" : "false"}">${role}</button>`).join("")}</div>`;
  }

  function renderCyberwareOperationsWorkspace(runtime = {}, citizen = {}, activeView = "PLANNER", options = {}) {
    const citizenId = String(citizen?.id || "").trim();
    const view = normalizeCyberwareUiView(activeView);
    const projection = buildCyberwareOperationsProjection(citizenId, runtime, citizen, view);
    let detail = "";
    if (view === "PLANNER") {
      detail = `<div class="cyberware-planner-host" data-cyberware-planner-host data-cyberware-planner-mounted="${options.mountPlanner ? "true" : "false"}" data-cyberware-planner-dirty="false">${options.mountPlanner ? renderCyberwarePlannerPanel(citizenId) : renderCyberwarePlannerPlaceholder()}</div>`;
    } else if (view === "MAINTENANCE") {
      detail = `<div class="cyberware-maintenance-host" data-cyberware-maintenance-host data-cyberware-maintenance-mounted="${options.mountMaintenance ? "true" : "false"}" data-cyberware-maintenance-dirty="false">${options.mountMaintenance ? renderCyberwareMaintenancePanel(citizenId) : renderCyberwareMaintenancePlaceholder()}</div>`;
    } else {
      detail = renderCyberwareHistoryPanel(runtime, citizen, { embedded: true });
    }
    return `<div class="cyberware-operations-workspace is-${view.toLowerCase()}" data-cyberware-operations-workspace data-operations-view="${view}">
      ${renderCyberwareOperationsSummary(projection)}
      <div class="cyberware-operations-layout">
        <div class="cyberware-operations-detail">${detail}</div>
        <aside class="cyberware-operations-inspector" data-cyberware-operations-inspector-host>
          ${renderCyberwareOperationsRoleSwitch(projection)}
          ${renderCyberwareInspector(projection.item, citizen, { contextLabel: `CYBERWARE / ${view} INSPECTOR`, showActions: false, emptyMessage: "Select a source or target ItemInstance in the active operation panel." })}
        </aside>
      </div>
    </div>`;
  }

  function refreshCyberwareOperationsContext(citizenId = "", options = {}) {
    const id = String(citizenId || "").trim();
    const root = options.root || getCyberwareWorkspaceRoot(id);
    const workspace = getCyberwareWorkspaceElement(root);
    const citizen = options.citizen || getCitizen(id);
    if (!workspace || !citizen) return false;
    const runtime = options.runtime || getCyberwareWorkspaceRuntime(citizen);
    let refreshed = 0;
    workspace.querySelectorAll("[data-cyberware-operations-workspace]").forEach((operationsWorkspace) => {
      const view = normalizeCyberwareUiView(operationsWorkspace.dataset.operationsView || "PLANNER");
      const projection = buildCyberwareOperationsProjection(id, runtime, citizen, view);
      const summary = operationsWorkspace.querySelector("[data-cyberware-operations-summary-host]");
      const nextSummary = createMarkupNode(renderCyberwareOperationsSummary(projection));
      if (summary && nextSummary) summary.replaceWith(nextSummary);
      const inspector = operationsWorkspace.querySelector("[data-cyberware-operations-inspector-host]");
      if (inspector) {
        inspector.innerHTML = `${renderCyberwareOperationsRoleSwitch(projection)}${renderCyberwareInspector(projection.item, citizen, { contextLabel: `CYBERWARE / ${view} INSPECTOR`, showActions: false, emptyMessage: "Select a source or target ItemInstance in the active operation panel." })}`;
      }
      refreshed += 1;
    });
    return refreshed > 0;
  }

  function setCyberwareOperationsInspectorRole(citizenId = "", role = "AUTO", options = {}) {
    const id = String(citizenId || "").trim();
    const state = getCyberwareUiState(id);
    state.operationsInspectorRole = normalizeCyberwareOperationsInspectorRole(role);
    refreshCyberwareOperationsContext(id, options);
    return state.operationsInspectorRole;
  }

  function setCyberwareHistoryFilter(citizenId = "", filter = "ALL", options = {}) {
    const id = String(citizenId || "").trim();
    const state = getCyberwareUiState(id);
    state.historyFilter = normalizeCyberwareHistoryFilter(filter);
    const root = options.root || getCyberwareWorkspaceRoot(id);
    const citizen = options.citizen || getCitizen(id);
    const runtime = options.runtime || (citizen ? getCyberwareWorkspaceRuntime(citizen) : null);
    const current = root?.querySelector?.('[data-cyberware-ui-panel="HISTORY"] [data-cyberware-history-host]') || null;
    const next = current && citizen && runtime ? createMarkupNode(renderCyberwareHistoryPanel(runtime, citizen, { embedded: true })) : null;
    if (current && next) current.replaceWith(next);
    refreshCyberwareOperationsContext(id, { ...options, root, citizen, runtime });
    return state.historyFilter;
  }

  function getCyberwareHistory(runtime = {}, citizen = {}) {
    const serviceRows = (Array.isArray(runtime?.installed) ? runtime.installed : []).flatMap((item) => (Array.isArray(item.serviceHistory) ? item.serviceHistory : []).map((entry) => ({
      date: entry.occurredAt || entry.completedAt || entry.createdAt || entry.date || "",
      type: entry.operation || entry.type || "SERVICE",
      subject: item.name || getItemId(item),
      detail: entry.result || entry.reason || entry.provider || "COMPLETED",
      tone: entry.ok === false ? "blocked" : "ready",
      instanceId: getItemId(item)
    })));
    const diagnosticRows = (Array.isArray(citizen?.cyberwareDiagnostics) ? citizen.cyberwareDiagnostics : []).map((entry) => ({
      date: entry.createdAt || entry.recordedAt || entry.date || "",
      type: "DIAGNOSTIC",
      subject: entry.status || "SYSTEM SCAN",
      detail: entry.neurocrashRisk || entry.reason || "RECORDED",
      tone: String(entry.status || "").toLowerCase() === "critical" ? "blocked" : "advisory",
      instanceId: String(entry.instanceId || entry.itemInstanceId || entry.subjectRefs?.instanceId || "").trim()
    }));
    return [...serviceRows, ...diagnosticRows].sort((a,b) => String(b.date).localeCompare(String(a.date))).slice(0,40);
  }

  function renderCyberwareHistoryPanel(runtime = {}, citizen = {}, options = {}) {
    const state = getCyberwareUiState(citizen?.id);
    const selectedInstanceId = String(state.selectedInstanceId || "").trim();
    const filter = normalizeCyberwareHistoryFilter(state.historyFilter);
    const allRows = getCyberwareHistory(runtime, citizen);
    const rows = filter === "SELECTED" ? allRows.filter((row) => row.instanceId && row.instanceId === selectedInstanceId) : allRows;
    const head = options.embedded ? "" : `<div class="equipment-shell-panel__head cyberware-ui-section-head"><div><p class="kicker">CYBERWARE / HISTORY</p><h5>Service and Diagnostic History</h5></div><span class="equipment-panel-badge">${rows.length} EVENTS</span></div>`;
    return `<section class="equipment-shell-panel cyberware-history-panel" data-cyberware-history-host>${head}<div class="cyberware-history-toolbar"><div role="group" aria-label="Cyberware history filter"><button type="button" data-cyberware-history-filter="ALL" class="${filter === "ALL" ? "is-active" : ""}" aria-pressed="${filter === "ALL" ? "true" : "false"}">ALL SYSTEMS</button><button type="button" data-cyberware-history-filter="SELECTED" class="${filter === "SELECTED" ? "is-active" : ""}" aria-pressed="${filter === "SELECTED" ? "true" : "false"}" ${selectedInstanceId ? "" : "disabled"}>SELECTED SYSTEM</button></div><small>${escapeHtml(`${rows.length} / ${allRows.length} EVENTS`)}</small></div><div class="cyberware-history-list">${rows.length ? rows.map((row) => row.instanceId ? `<button type="button" class="cyberware-history-row is-${escapeHtml(row.tone)} ${row.instanceId === selectedInstanceId ? "is-selected" : ""}" data-cyberware-history-select="${escapeHtml(row.instanceId)}"><time>${escapeHtml(row.date || "UNRECORDED")}</time><div><small>${escapeHtml(formatToken(row.type))}</small><b>${escapeHtml(row.subject)}</b><span>${escapeHtml(formatToken(row.detail))}</span></div></button>` : `<article class="cyberware-history-row is-${escapeHtml(row.tone)}"><time>${escapeHtml(row.date || "UNRECORDED")}</time><div><small>${escapeHtml(formatToken(row.type))}</small><b>${escapeHtml(row.subject)}</b><span>${escapeHtml(formatToken(row.detail))}</span></div></article>`).join("") : '<p class="file-empty">No service or diagnostic history for this filter.</p>'}</div></section>`;
  }

  function createMarkupNode(markup = "") {
    const template = document.createElement("template");
    template.innerHTML = String(markup || "").trim();
    return template.content.firstElementChild || null;
  }

  function renderCyberwareWorkspace(citizen = {}, options = {}) {
    const citizenId = String(citizen?.id || options?.citizenId || "").trim();
    const runtime = getCyberwareWorkspaceRuntime(citizen, { force: options.forceRuntime === true });
    const plannerState = getPlannerPanelState(citizenId);
    const diagnosticsState = getDiagnosticsPanelState(citizenId);
    const maintenanceState = getMaintenancePanelState(citizenId);
    const uiState = getCyberwareUiState(citizenId);
    const activeView = normalizeCyberwareUiView(options.activeView || uiState.activeView);
    uiState.activeView = activeView;
    const plannerOpen = options.mountPlanner === true || plannerState.open === true || activeView === "PLANNER";
    const diagnosticsOpen = options.mountDiagnostics === true || diagnosticsState.open === true || activeView === "DIAGNOSTICS";
    const maintenanceOpen = options.mountMaintenance === true || maintenanceState.open === true || activeView === "MAINTENANCE";
    const panel = (view, markup) => `<div class="cyberware-ui-panel ${activeView === view ? "is-active" : ""}" data-cyberware-ui-panel="${view}" ${activeView === view ? '' : 'hidden aria-hidden="true" inert'}>${markup}</div>`;
    const activeSection = getCyberwareUiSectionForView(activeView);
    return `<section class="equipment-cyberware-workspace cyberware-ui-workspace" data-cyberware-workspace data-cyberware-workspace-dirty="false" data-cyberware-active-section="${activeSection}" data-cyberware-active-view="${activeView}">
      ${renderCyberwareUiNavigation(activeView, citizenId)}
      <div class="cyberware-ui-panel-stack">
        ${panel("OVERVIEW", renderCyberwareOverviewPanel(runtime, citizen))}
        ${panel("BODYMAP", renderCyberwareBodymapPanel(runtime, citizen))}
        ${panel("SYSTEMS", renderCyberwareSystemsPanel(runtime, citizen))}
        ${panel("CORE_STACK", renderCyberwareNeuralCoreWorkspace(runtime, citizen, "CORE_STACK"))}
        ${panel("PLANNER", renderCyberwareOperationsWorkspace(runtime, citizen, "PLANNER", { mountPlanner: plannerOpen }))}
        ${panel("DIAGNOSTICS", renderCyberwareNeuralCoreWorkspace(runtime, citizen, "DIAGNOSTICS", { mountDiagnostics: diagnosticsOpen }))}
        ${panel("MAINTENANCE", renderCyberwareOperationsWorkspace(runtime, citizen, "MAINTENANCE", { mountMaintenance: maintenanceOpen }))}
        ${panel("HISTORY", renderCyberwareOperationsWorkspace(runtime, citizen, "HISTORY"))}
      </div>
      ${app.renderCyberwareIndex?.(citizenId) || ""}
    </section>`;
  }

  function refreshCyberwareNeuralCoreSummaries(citizenId = "", runtimeState = null) {
    const id = String(citizenId || "").trim();
    const root = getCyberwareWorkspaceRoot(id);
    const workspace = getCyberwareWorkspaceElement(root);
    const citizen = getCitizen(id);
    if (!workspace || !citizen) return false;
    const runtime = runtimeState || getCyberwareWorkspaceRuntime(citizen);
    let refreshed = 0;
    workspace.querySelectorAll("[data-cyberware-neural-core-summary-host]").forEach((current) => {
      const view = current.closest?.("[data-cyberware-neural-core-workspace]")?.dataset?.neuralCoreView || current.dataset.neuralCoreView || "CORE_STACK";
      const next = createMarkupNode(renderCyberwareNeuralCoreSummary(runtime, citizen, view));
      if (next) {
        current.replaceWith(next);
        refreshed += 1;
      }
    });
    return refreshed > 0;
  }

  function mountCyberwareDiagnosticsPanel(citizenId = "", options = {}) {
    const id = String(citizenId || "").trim();
    const root = getCyberwareWorkspaceRoot(id);
    const host = root?.querySelector?.("[data-cyberware-diagnostics-host]") || null;
    if (!id || !host) return false;
    const state = getDiagnosticsPanelState(id);
    state.open = true;
    if (host.dataset.cyberwareDiagnosticsMounted === "true" && host.dataset.cyberwareDiagnosticsDirty !== "true" && options.force !== true) return true;
    const citizen = getCitizen(id);
    const runtime = citizen ? getCyberwareWorkspaceRuntime(citizen) : null;
    const embedded = Boolean(host.closest?.("[data-cyberware-neural-core-workspace]"));
    host.innerHTML = renderCyberwareDiagnosticsPanel(id, runtime, options.diagnostics || null, { embedded });
    host.dataset.cyberwareDiagnosticsMounted = "true";
    host.dataset.cyberwareDiagnosticsDirty = "false";
    return true;
  }

  function refreshCyberwareDiagnosticsPanel(citizenId = "", options = {}) {
    const id = String(citizenId || "").trim();
    const root = getCyberwareWorkspaceRoot(id);
    const host = root?.querySelector?.("[data-cyberware-diagnostics-host]") || null;
    if (!id || !host) return false;
    if (host.dataset.cyberwareDiagnosticsMounted !== "true" && options.mount !== true) {
      host.dataset.cyberwareDiagnosticsDirty = "true";
      return false;
    }
    const refreshed = mountCyberwareDiagnosticsPanel(id, { force: true, diagnostics: options.diagnostics || null });
    if (refreshed) {
      const citizen = getCitizen(id);
      const runtime = citizen ? getCyberwareWorkspaceRuntime(citizen) : null;
      refreshCyberwareNeuralCoreSummaries(id, runtime);
    }
    return refreshed;
  }

  function closeCyberwareDiagnosticsPanel(citizenId = "") {
    const id = String(citizenId || "").trim();
    const root = getCyberwareWorkspaceRoot(id);
    const host = root?.querySelector?.("[data-cyberware-diagnostics-host]") || null;
    if (!id || !host) return false;
    const state = getDiagnosticsPanelState(id);
    state.open = false;
    const citizen = getCitizen(id);
    const runtime = citizen ? getCyberwareWorkspaceRuntime(citizen) : null;
    const embedded = Boolean(host.closest?.("[data-cyberware-neural-core-workspace]"));
    host.innerHTML = renderCyberwareDiagnosticsPlaceholder(runtime || {}, { embedded });
    host.dataset.cyberwareDiagnosticsMounted = "false";
    host.dataset.cyberwareDiagnosticsDirty = "false";
    return true;
  }

  function mountCyberwareMaintenancePanel(citizenId = "", options = {}) {
    const id = String(citizenId || "").trim();
    const root = getCyberwareWorkspaceRoot(id);
    const host = root?.querySelector?.("[data-cyberware-maintenance-host]") || null;
    if (!id || !host) return false;
    const state = getMaintenancePanelState(id);
    state.open = true;
    if (host.dataset.cyberwareMaintenanceMounted === "true" && host.dataset.cyberwareMaintenanceDirty !== "true" && options.force !== true) return true;
    host.innerHTML = renderCyberwareMaintenancePanel(id);
    host.dataset.cyberwareMaintenanceMounted = "true";
    host.dataset.cyberwareMaintenanceDirty = "false";
    refreshCyberwareOperationsContext(id, { root });
    return true;
  }

  function refreshCyberwareMaintenancePanel(citizenId = "", options = {}) {
    const id = String(citizenId || "").trim();
    const root = getCyberwareWorkspaceRoot(id);
    const host = root?.querySelector?.("[data-cyberware-maintenance-host]") || null;
    if (!id || !host) return false;
    if (host.dataset.cyberwareMaintenanceMounted !== "true" && options.mount !== true) {
      host.dataset.cyberwareMaintenanceDirty = "true";
      return false;
    }
    return mountCyberwareMaintenancePanel(id, { force: true });
  }

  function closeCyberwareMaintenancePanel(citizenId = "") {
    const id = String(citizenId || "").trim();
    const root = getCyberwareWorkspaceRoot(id);
    const host = root?.querySelector?.("[data-cyberware-maintenance-host]") || null;
    if (!id || !host) return false;
    const state = getMaintenancePanelState(id);
    state.open = false;
    host.innerHTML = renderCyberwareMaintenancePlaceholder();
    host.dataset.cyberwareMaintenanceMounted = "false";
    host.dataset.cyberwareMaintenanceDirty = "false";
    return true;
  }

  function mountCyberwarePlannerPanel(citizenId = "", options = {}) {
    const id = String(citizenId || "").trim();
    const root = getCyberwareWorkspaceRoot(id);
    const host = root?.querySelector?.("[data-cyberware-planner-host]") || null;
    if (!id || !host) return false;
    const state = getPlannerPanelState(id);
    state.open = true;
    if (host.dataset.cyberwarePlannerMounted === "true" && host.dataset.cyberwarePlannerDirty !== "true" && options.force !== true) return true;
    host.innerHTML = renderCyberwarePlannerPanel(id);
    host.dataset.cyberwarePlannerMounted = "true";
    host.dataset.cyberwarePlannerDirty = "false";
    refreshCyberwareOperationsContext(id, { root });
    return true;
  }

  function refreshCyberwarePlannerPanel(citizenId = "", options = {}) {
    const id = String(citizenId || "").trim();
    const root = getCyberwareWorkspaceRoot(id);
    const host = root?.querySelector?.("[data-cyberware-planner-host]") || null;
    if (!id || !host) return false;
    if (host.dataset.cyberwarePlannerMounted !== "true" && options.mount !== true) {
      host.dataset.cyberwarePlannerDirty = "true";
      return false;
    }
    return mountCyberwarePlannerPanel(id, { force: true });
  }


  function markCyberwareMaintenancePanelDirty(citizenId = "") {
    const id = String(citizenId || "").trim();
    const root = getCyberwareWorkspaceRoot(id);
    const host = root?.querySelector?.("[data-cyberware-maintenance-host]") || null;
    if (host) host.dataset.cyberwareMaintenanceDirty = "true";
    return Boolean(host);
  }

  function refreshCyberwareWorkspace(citizenId = "", options = {}) {
    const id = String(citizenId || "").trim();
    const root = getCyberwareWorkspaceRoot(id);
    const workspace = getCyberwareWorkspaceElement(root);
    const legacyScreen = root?.querySelector?.('[data-equipment-screen="CYBERWARE"]') || null;
    const citizen = getCitizen(id);
    if (!root || !workspace || !citizen) return false;

    const runtime = getCyberwareWorkspaceRuntime(citizen, { force: options.forceRuntime === true });
    [
      ["[data-cyberware-overview-summary-host]", renderCyberwareOverviewPanel(runtime, citizen)],
      ["[data-cyberware-bodymap-host]", renderCyberwareBodymapPanel(runtime, citizen)],
      ["[data-cyberware-systems-host]", renderCyberwareSystemsPanel(runtime, citizen)],
      ["[data-cyberware-core-stack-host]", renderCyberwareCoreSection(runtime)],
      ["[data-cyberware-history-host]", renderCyberwareHistoryPanel(runtime, citizen, { embedded: true })]
    ].forEach(([selector, markup]) => {
      const current = workspace.querySelector(selector);
      const next = createMarkupNode(markup);
      if (current && next) current.replaceWith(next);
    });
    refreshCyberwareNeuralCoreSummaries(id, runtime);

    const diagnosticsHost = workspace.querySelector("[data-cyberware-diagnostics-host]");
    const refreshMountedDiagnostics = diagnosticsHost
      && diagnosticsHost.dataset.cyberwareDiagnosticsMounted === "true"
      && diagnosticsHost.dataset.cyberwareDiagnosticsDirty === "true"
      && options.forceRuntime === true;
    if (diagnosticsHost && (options.refreshDiagnostics === true || refreshMountedDiagnostics)) {
      refreshCyberwareDiagnosticsPanel(id, { mount: options.mountDiagnostics === true });
    }
    if (diagnosticsHost && options.refreshDiagnostics !== true && !refreshMountedDiagnostics) diagnosticsHost.dataset.cyberwareDiagnosticsDirty = diagnosticsHost.dataset.cyberwareDiagnosticsDirty || "false";

    const maintenanceHost = workspace.querySelector("[data-cyberware-maintenance-host]");
    const refreshMountedMaintenance = maintenanceHost
      && maintenanceHost.dataset.cyberwareMaintenanceMounted === "true"
      && maintenanceHost.dataset.cyberwareMaintenanceDirty === "true";
    if (maintenanceHost && (options.refreshMaintenance === true || refreshMountedMaintenance)) {
      refreshCyberwareMaintenancePanel(id, { mount: options.mountMaintenance === true });
    }
    if (maintenanceHost && options.refreshMaintenance !== true && !refreshMountedMaintenance) maintenanceHost.dataset.cyberwareMaintenanceDirty = maintenanceHost.dataset.cyberwareMaintenanceDirty || "false";

    const plannerHost = workspace.querySelector("[data-cyberware-planner-host]");
    if (plannerHost && options.refreshPlanner === true) {
      refreshCyberwarePlannerPanel(id, { mount: options.mountPlanner === true });
    }
    if (plannerHost && options.refreshPlanner !== true) plannerHost.dataset.cyberwarePlannerDirty = plannerHost.dataset.cyberwarePlannerDirty || "false";
    syncCyberwareUiView(id, { root, mount: false });
    refreshCyberwareOperationsContext(id, { root, citizen, runtime });
    workspace.dataset.cyberwareWorkspaceDirty = "false";
    if (legacyScreen) legacyScreen.dataset.equipmentScreenDirty = "false";
    return true;
  }

  app.cyberwareWorkspace = {
    openCyberwareWorkspace,
    renderCyberwareWorkspace,
    renderCyberwarePlannerPanel,
    renderCyberwareDiagnosticsPanel,
    renderCyberwareMaintenancePanel,
    renderCoreStackPanel,
    buildNeuralCoreWorkspaceProjection,
    renderCyberwareNeuralCoreSummary,
    renderCyberwareNeuralCoreWorkspace,
    getCyberwareWorkspaceRuntime,
    invalidateCyberwareWorkspaceRuntime,
    mountCyberwareDiagnosticsPanel,
    refreshCyberwareDiagnosticsPanel,
    closeCyberwareDiagnosticsPanel,
    mountCyberwareMaintenancePanel,
    refreshCyberwareMaintenancePanel,
    closeCyberwareMaintenancePanel,
    mountCyberwarePlannerPanel,
    refreshCyberwarePlannerPanel,
    getCyberwareUiState,
    getCyberwareUiSectionForView,
    renderCyberwareUiNavigation,
    buildCyberwareOverviewProjection,
    renderCyberwareOverviewPanel,
    renderCyberwareBodymapPanel,
    renderCyberwareInspector,
    getCyberwareBodymapMarkers,
    setCyberwareBodymapView,
    openCyberwareBodymapView,
    setCyberwareBodymapOrientation,
    selectCyberwareBodymapAnchor,
    setCyberwareSelectedInstance,
    syncCyberwareBodymapWorkspace,
    buildCyberwareOperationsProjection,
    renderCyberwareOperationsSummary,
    renderCyberwareOperationsWorkspace,
    refreshCyberwareOperationsContext,
    setCyberwareOperationsInspectorRole,
    setCyberwareHistoryFilter,
    setCyberwareUiSection,
    setCyberwareUiView,
    syncCyberwareUiView,
    refreshCyberwareWorkspace
  };

  app.openCyberwareWorkspace = openCyberwareWorkspace;
  app.openEquipmentWorkspace = openCyberwareWorkspace;
  app.renderCyberwareWorkspace = renderCyberwareWorkspace;
  app.renderEquipmentCyberwareWorkspace = (state = {}, citizen = {}, options = {}) => renderCyberwareWorkspace(citizen, { ...options, citizenId: state?.citizenId || citizen?.id || "" });
  app.renderCyberwarePlannerPanel = renderCyberwarePlannerPanel;
  app.renderCyberwareDiagnosticsPanel = renderCyberwareDiagnosticsPanel;
  app.renderCyberwareMaintenancePanel = renderCyberwareMaintenancePanel;
  app.renderCyberwareCoreStackPanel = renderCoreStackPanel;
  app.buildNeuralCoreWorkspaceProjection = buildNeuralCoreWorkspaceProjection;
  app.renderCyberwareNeuralCoreSummary = renderCyberwareNeuralCoreSummary;
  app.renderCyberwareNeuralCoreWorkspace = renderCyberwareNeuralCoreWorkspace;
  app.getCyberwareWorkspaceRuntime = getCyberwareWorkspaceRuntime;
  app.invalidateCyberwareWorkspaceRuntime = invalidateCyberwareWorkspaceRuntime;
  app.mountCyberwareDiagnosticsPanel = mountCyberwareDiagnosticsPanel;
  app.refreshCyberwareDiagnosticsPanel = refreshCyberwareDiagnosticsPanel;
  app.closeCyberwareDiagnosticsPanel = closeCyberwareDiagnosticsPanel;
  app.mountCyberwareMaintenancePanel = mountCyberwareMaintenancePanel;
  app.refreshCyberwareMaintenancePanel = refreshCyberwareMaintenancePanel;
  app.closeCyberwareMaintenancePanel = closeCyberwareMaintenancePanel;
  app.mountCyberwarePlannerPanel = mountCyberwarePlannerPanel;
  app.refreshCyberwarePlannerPanel = refreshCyberwarePlannerPanel;
  app.getCyberwareUiState = getCyberwareUiState;
  app.getCyberwareUiSectionForView = getCyberwareUiSectionForView;
  app.renderCyberwareUiNavigation = renderCyberwareUiNavigation;
  app.buildCyberwareOverviewProjection = buildCyberwareOverviewProjection;
  app.renderCyberwareOverviewPanel = renderCyberwareOverviewPanel;
  app.renderCyberwareBodymapPanel = renderCyberwareBodymapPanel;
  app.renderCyberwareInspector = renderCyberwareInspector;
  app.getCyberwareBodymapMarkers = getCyberwareBodymapMarkers;
  app.setCyberwareBodymapView = setCyberwareBodymapView;
  app.openCyberwareBodymapView = openCyberwareBodymapView;
  app.setCyberwareBodymapOrientation = setCyberwareBodymapOrientation;
  app.selectCyberwareBodymapAnchor = selectCyberwareBodymapAnchor;
  app.openCyberwareBodymapForInstance = (citizenId = "", instanceId = "", options = {}) => {
    setCyberwareUiView(citizenId, "BODYMAP", { mount: false });
    return setCyberwareSelectedInstance(citizenId, instanceId, { ...options, syncView: true });
  };
  app.getCyberwareBodymapState = (citizenId = "") => getCyberwareUiState(citizenId);
  app.setCyberwareSelectedInstance = setCyberwareSelectedInstance;
  app.syncCyberwareBodymapWorkspace = syncCyberwareBodymapWorkspace;
  app.buildCyberwareOperationsProjection = buildCyberwareOperationsProjection;
  app.renderCyberwareOperationsSummary = renderCyberwareOperationsSummary;
  app.renderCyberwareOperationsWorkspace = renderCyberwareOperationsWorkspace;
  app.refreshCyberwareOperationsContext = refreshCyberwareOperationsContext;
  app.setCyberwareOperationsInspectorRole = setCyberwareOperationsInspectorRole;
  app.setCyberwareHistoryFilter = setCyberwareHistoryFilter;
  app.setCyberwareUiSection = setCyberwareUiSection;
  app.setCyberwareUiView = setCyberwareUiView;
  app.syncCyberwareUiView = syncCyberwareUiView;
  app.refreshCyberwareWorkspace = refreshCyberwareWorkspace;
  app.refreshEquipmentCyberwareWorkspace = refreshCyberwareWorkspace;

  if (typeof window.addEventListener === "function" && !app.cyberwareWorkspaceInvalidationBound) {
    window.addEventListener("ws:item-instances-updated", (event) => {
      const citizenId = String(event?.detail?.citizenId || "").trim();
      invalidateCyberwareWorkspaceRuntime(citizenId, { planner: true });
    });
    window.addEventListener("ws:citizens-updated", (event) => {
      const detail = event?.detail || {};
      if (detail.itemInstancesChanged === true) return;
      if (String(detail.source || "").trim().toUpperCase() === "CYBERWARE_DIAGNOSTICS") return;
      const citizenId = String(detail.id || detail.citizen?.id || "").trim();
      if (citizenId) invalidateCyberwareWorkspaceRuntime(citizenId, { planner: true, diagnostics: true });
    });
    window.addEventListener("ws:cyberware-diagnostics-updated", (event) => {
      const citizenId = String(event?.detail?.citizenId || "").trim();
      if (citizenId) refreshCyberwareDiagnosticsPanel(citizenId, {
        mount: false,
        diagnostics: event?.detail?.diagnostics || null
      });
    });
    window.addEventListener("ws:cyberware-maintenance-updated", (event) => {
      const citizenId = String(event?.detail?.citizenId || "").trim();
      if (citizenId) markCyberwareMaintenancePanelDirty(citizenId);
    });
    app.cyberwareWorkspaceInvalidationBound = true;
  }
})();
