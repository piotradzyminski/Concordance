window.WS_APP = window.WS_APP || {};

(function initCyberwareModule() {
  const app = window.WS_APP;
  const escapeHtml = app.escapeEquipmentHtml || ((value = "") => String(value ?? ""));
  const CYBERWARE_MODULE_VERSION = "1.0x";

  function getCyberwareCitizenIdFromRoot(root = null) {
    return String(root?.dataset?.cyberwareCitizenId || "").trim();
  }

  function getCyberwareTargetCitizen(user = app.currentUser) {
    const preferredId = String(app.cyberwareTargetCitizenId || app.equipmentTargetCitizenId || user?.citizenId || "").trim();
    if (preferredId && typeof app.getCitizenById === "function") {
      const preferred = app.getCitizenById(preferredId);
      if (preferred && preferred.recordType !== "admin") return preferred;
    }
    const citizens = (app.getCitizens?.() || []).filter((citizen) => citizen && citizen.recordType !== "admin" && citizen.recordState !== "ARCHIVED");
    if (user?.role === "citizen") return citizens.find((citizen) => citizen.id === user.citizenId || citizen.ownerUserId === user.id) || null;
    return citizens[0] || null;
  }

  function renderCyberwareTargetSwitcher(user = app.currentUser, selectedId = "") {
    if (user?.role !== "admin") return "";
    const citizens = (app.getCitizens?.() || []).filter((citizen) => citizen && citizen.recordType !== "admin" && citizen.recordState !== "ARCHIVED");
    return `
      <label class="cyberware-module-target">TARGET CITIZEN
        <select data-cyberware-target-select>
          ${citizens.map((citizen) => `<option value="${escapeHtml(citizen.id)}" ${citizen.id === selectedId ? "selected" : ""}>${escapeHtml(citizen.name || citizen.legalName || citizen.id)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function refreshAfterCyberwareMutation(citizenId = "", options = {}) {
    app.invalidateCyberwareWorkspaceRuntime?.(citizenId, {
      planner: options.planner !== false,
      diagnostics: options.diagnostics !== false,
      maintenance: options.maintenance !== false
    });
    app.refreshCyberwareWorkspace?.(citizenId, {
      forceRuntime: true,
      refreshPlanner: options.refreshPlanner === true,
      refreshDiagnostics: options.refreshDiagnostics === true,
      refreshMaintenance: options.refreshMaintenance === true,
      mountPlanner: options.mountPlanner === true,
      mountDiagnostics: options.mountDiagnostics === true,
      mountMaintenance: options.mountMaintenance === true
    });
  }

  function setCyberwareUpgradeFeedback(control = null, result = {}) {
    const panel = control?.closest?.("[data-cyberware-upgrade-panel]");
    const feedback = panel?.querySelector?.("[data-cyberware-upgrade-feedback]");
    if (!feedback) return;
    const ok = result?.ok === true;
    feedback.textContent = ok
      ? `REQUEST ACCEPTED · ${String(result?.operation?.status || result?.status || result?.reason || "QUEUED")}`
      : `REQUEST BLOCKED · ${String(result?.reason || "CYBERWARE_UPGRADE_FAILED")}`;
    feedback.dataset.tone = ok ? "success" : "error";
  }

  function bindCyberwareModuleActions(user = app.currentUser) {
    const root = document.querySelector?.("[data-cyberware-module-shell]") || null;
    if (!root || root.dataset.cyberwareActionsBound === "true") return false;
    root.dataset.cyberwareActionsBound = "true";

    root.querySelector("[data-cyberware-target-select]")?.addEventListener("change", (event) => {
      app.cyberwareTargetCitizenId = String(event.target.value || "").trim();
      app.renderCyberwareModule?.(user);
    });

    root.addEventListener("change", (event) => {
      const citizenId = getCyberwareCitizenIdFromRoot(root);
      const maintenanceField = event.target.closest?.("[data-cyberware-maintenance-field]");
      if (maintenanceField && citizenId) {
        const field = String(maintenanceField.dataset.cyberwareMaintenanceField || "").trim().toLowerCase();
        const patch = field === "item"
          ? { selectedItemId: maintenanceField.value || "", feedback: null }
          : field === "operation"
            ? { operation: maintenanceField.value || "DIAGNOSTIC", feedback: null }
            : null;
        if (patch) {
          app.setCyberwareMaintenanceSelection?.(citizenId, patch);
          if (field === "item" && patch.selectedItemId) app.setCyberwareSelectedInstance?.(citizenId, patch.selectedItemId, { root, syncView: false });
          app.refreshCyberwareMaintenancePanel?.(citizenId, { mount: true });
        }
        return;
      }

      const category = event.target.closest?.("[data-cyberware-index-category]");
      const manufacturer = event.target.closest?.("[data-cyberware-index-manufacturer]");
      const grade = event.target.closest?.("[data-cyberware-index-grade]");
      if (category || manufacturer || grade) {
        app.setCyberwareIndexFilter?.(citizenId, {
          ...(category ? { category: category.value || "ALL" } : {}),
          ...(manufacturer ? { manufacturer: manufacturer.value || "ALL" } : {}),
          ...(grade ? { grade: grade.value || "ALL" } : {})
        });
        app.applyCyberwareIndexFilters?.(root);
      }
    });

    root.addEventListener("input", (event) => {
      const input = event.target.closest?.("[data-cyberware-index-search]");
      if (!input) return;
      const citizenId = getCyberwareCitizenIdFromRoot(root);
      app.setCyberwareIndexFilter?.(citizenId, { query: input.value || "" });
      app.applyCyberwareIndexFilters?.(root);
    });

    root.addEventListener("submit", (event) => {
      const form = event.target.closest?.("[data-item-instance-rename-form]");
      if (!form || !root.contains(form)) return;
      event.preventDefault();
      const citizenId = getCyberwareCitizenIdFromRoot(root);
      const instanceId = String(form.dataset.itemInstanceRenameForm || "").trim();
      const input = form.querySelector("[data-item-instance-player-label]");
      const feedback = form.querySelector("[data-item-instance-rename-feedback]");
      const result = app.renameItemInstance?.(citizenId, instanceId, input?.value || "", {
        source: "CYBERWARE_ITEM_RENAME",
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
      app.setCyberwareSelectedInstance?.(citizenId, instanceId, { root, syncView: false });
      refreshAfterCyberwareMutation(citizenId, { planner: false, diagnostics: false, maintenance: false });
    });

    root.addEventListener("click", (event) => {
      const citizenId = getCyberwareCitizenIdFromRoot(root);

      const renameToggle = event.target.closest?.("[data-item-instance-rename-toggle]");
      if (renameToggle && !renameToggle.disabled) {
        event.preventDefault();
        const disclosure = renameToggle.closest("[data-item-instance-rename-disclosure]");
        const form = disclosure?.querySelector?.("[data-item-instance-rename-form]") || null;
        if (form) {
          renameToggle.hidden = true;
          renameToggle.setAttribute("aria-expanded", "true");
          form.hidden = false;
          const input = form.querySelector("[data-item-instance-player-label]");
          window.requestAnimationFrame?.(() => { input?.focus?.(); input?.select?.(); });
        }
        return;
      }

      const renameClear = event.target.closest?.("[data-item-instance-rename-clear]");
      if (renameClear && !renameClear.disabled) {
        event.preventDefault();
        const result = app.renameItemInstance?.(citizenId, renameClear.dataset.itemInstanceRenameClear || "", "", {
          source: "CYBERWARE_ITEM_RENAME_CLEAR",
          skipCitizenEvent: true,
          skipModuleRefresh: true,
          skipProfileRefresh: true
        });
        if (result?.ok) refreshAfterCyberwareMutation(citizenId, { planner: false, diagnostics: false, maintenance: false });
        return;
      }

      const indexToggle = event.target.closest?.("[data-cyberware-index-toggle]");
      if (indexToggle && !indexToggle.disabled) {
        event.preventDefault();
        app.toggleCyberwareIndex?.(citizenId);
        app.syncCyberwareIndexOverlay?.(citizenId, { root });
        return;
      }
      const indexClose = event.target.closest?.("[data-cyberware-index-close]");
      if (indexClose) {
        event.preventDefault();
        app.setCyberwareIndexOpen?.(citizenId, false);
        app.syncCyberwareIndexOverlay?.(citizenId, { root });
        return;
      }
      const indexSelect = event.target.closest?.("[data-cyberware-index-select]");
      if (indexSelect && !indexSelect.disabled) {
        event.preventDefault();
        app.selectCyberwareIndexDefinition?.(citizenId, indexSelect.dataset.cyberwareIndexSelect || "");
        app.syncCyberwareIndexOverlay?.(citizenId, { root });
        return;
      }

      const anatomyRegion = event.target.closest?.("[data-cyberware-anatomy-region]");
      if (anatomyRegion && !anatomyRegion.disabled) {
        event.preventDefault();
        app.openCyberwareBodymapView?.(citizenId, anatomyRegion.dataset.cyberwareAnatomyRegion || "BODY", { root });
        return;
      }
      const anatomyOrientation = event.target.closest?.("[data-cyberware-anatomy-orientation]");
      if (anatomyOrientation && !anatomyOrientation.disabled) {
        event.preventDefault();
        app.setCyberwareBodymapOrientation?.(citizenId, anatomyOrientation.dataset.cyberwareAnatomyOrientation || "FRONT", { root });
        return;
      }
      const anatomyAnchor = event.target.closest?.("[data-cyberware-anatomy-anchor]");
      if (anatomyAnchor && !anatomyAnchor.disabled) {
        event.preventDefault();
        app.selectCyberwareBodymapAnchor?.(citizenId, anatomyAnchor.dataset.cyberwareAnatomyAnchor || "", { root });
        return;
      }
      const locateInstance = event.target.closest?.("[data-cyberware-locate-instance]");
      if (locateInstance && !locateInstance.disabled) {
        event.preventDefault();
        app.setCyberwareUiView?.(citizenId, "BODYMAP", { mount: false });
        app.setCyberwareSelectedInstance?.(citizenId, locateInstance.dataset.cyberwareLocateInstance || "", { root, syncView: true });
        return;
      }

      const bodymapView = event.target.closest?.("[data-cyberware-bodymap-view]");
      if (bodymapView && !bodymapView.disabled) {
        event.preventDefault();
        app.setCyberwareBodymapView?.(citizenId, bodymapView.dataset.cyberwareBodymapView || "front", { root });
        return;
      }
      const selectedItem = event.target.closest?.("[data-cyberware-select-item]");
      if (selectedItem && !selectedItem.disabled) {
        event.preventDefault();
        app.setCyberwareSelectedInstance?.(citizenId, selectedItem.dataset.cyberwareSelectItem || "", { root });
        return;
      }
      const role = event.target.closest?.("[data-cyberware-operations-inspector-role]");
      if (role && !role.disabled) {
        event.preventDefault();
        app.setCyberwareOperationsInspectorRole?.(citizenId, role.dataset.cyberwareOperationsInspectorRole || "AUTO", { root });
        return;
      }
      const historyFilter = event.target.closest?.("[data-cyberware-history-filter]");
      if (historyFilter && !historyFilter.disabled) {
        event.preventDefault();
        app.setCyberwareHistoryFilter?.(citizenId, historyFilter.dataset.cyberwareHistoryFilter || "ALL", { root });
        return;
      }
      const historySelect = event.target.closest?.("[data-cyberware-history-select]");
      if (historySelect && !historySelect.disabled) {
        event.preventDefault();
        const instanceId = String(historySelect.dataset.cyberwareHistorySelect || "").trim();
        app.setCyberwareSelectedInstance?.(citizenId, instanceId, { root, syncView: false });
        app.setCyberwareHistoryFilter?.(citizenId, "SELECTED", { root });
        return;
      }
      const section = event.target.closest?.("[data-cyberware-ui-section]");
      if (section && !section.disabled) {
        event.preventDefault();
        app.setCyberwareUiSection?.(citizenId, section.dataset.cyberwareUiSection || "SYSTEMS");
        return;
      }
      const view = event.target.closest?.("[data-cyberware-ui-view]");
      if (view && !view.disabled) {
        event.preventDefault();
        app.setCyberwareUiView?.(citizenId, view.dataset.cyberwareUiView || "OVERVIEW");
        return;
      }

      const upgradeInstall = event.target.closest?.("[data-cyberware-upgrade-install]");
      const upgradeRemove = event.target.closest?.("[data-cyberware-upgrade-remove]");
      const upgradeReplace = event.target.closest?.("[data-cyberware-upgrade-replace]");
      const permanentUpgrade = event.target.closest?.("[data-cyberware-upgrade-permanent]");
      if ((upgradeInstall || upgradeRemove || upgradeReplace || permanentUpgrade) && citizenId) {
        event.preventDefault();
        const control = upgradeInstall || upgradeRemove || upgradeReplace || permanentUpgrade;
        const slotCard = control.closest?.(".cyberware-upgrade-slot");
        const hostInstanceId = String(control.dataset.hostInstanceId || "").trim();
        const slotId = String(control.dataset.slotId || "").trim();
        let operationType = "";
        let moduleInstanceId = "";
        let modificationId = "";
        if (upgradeInstall) {
          operationType = "INSTALL_MODULE";
          moduleInstanceId = String(slotCard?.querySelector?.("[data-cyberware-upgrade-candidate]")?.value || "").trim();
        } else if (upgradeRemove) {
          operationType = "REMOVE_MODULE";
        } else if (upgradeReplace) {
          operationType = "REPLACE_MODULE";
          moduleInstanceId = String(slotCard?.querySelector?.("[data-cyberware-upgrade-replacement]")?.value || "").trim();
        } else {
          operationType = "APPLY_PERMANENT_MOD";
          modificationId = String(permanentUpgrade.dataset.modificationId || "").trim();
        }
        const result = app.startCyberwareUpgrade?.({
          citizenId,
          operationType,
          hostInstanceId,
          moduleInstanceId,
          slotId,
          modificationId,
          source: "CYBERWARE_UPGRADES_UI"
        }) || { ok: false, reason: "CYBERWARE_UPGRADE_API_REQUIRED" };
        setCyberwareUpgradeFeedback(control, result);
        const worldOperation = result?.operation?.operationId || result?.operationId;
        if (!worldOperation && result?.ok === true) {
          refreshAfterCyberwareMutation(citizenId, { planner: true, diagnostics: true, maintenance: true });
        }
        return;
      }

      const maintenanceAction = event.target.closest?.("[data-cyberware-maintenance-action]");
      if (maintenanceAction && !maintenanceAction.disabled) {
        event.preventDefault();
        const action = String(maintenanceAction.dataset.cyberwareMaintenanceAction || "").trim().toLowerCase();
        if (action === "open") {
          const itemId = String(maintenanceAction.dataset.itemId || "").trim();
          if (itemId) {
            app.setCyberwareMaintenanceSelection?.(citizenId, { selectedItemId: itemId, feedback: null });
            app.setCyberwareSelectedInstance?.(citizenId, itemId, { root, syncView: false });
          }
          app.setCyberwareUiView?.(citizenId, "MAINTENANCE", { mount: false });
          app.mountCyberwareMaintenancePanel?.(citizenId, { force: Boolean(itemId) });
          return;
        }
        if (action === "execute") {
          const state = app.getCyberwareMaintenancePanelState?.(citizenId) || {};
          const citizen = app.getCitizenById?.(citizenId) || null;
          const runtime = citizen ? app.getCyberwareWorkspaceRuntime?.(citizen) : null;
          const result = app.runCyberwareMaintenance?.(citizenId, {
            itemId: state.selectedItemId || "",
            operation: state.operation || "DIAGNOSTIC",
            source: "CYBERWARE_MAINTENANCE_UI",
            runtime,
            deferPersistence: true
          });
          app.setCyberwareMaintenanceSelection?.(citizenId, { feedback: { ok: result?.ok === true, reason: result?.reason || "MAINTENANCE_FAILED" } });
          const worldOperation = result?.operation?.operationId || result?.operationId;
          if (!worldOperation) {
            if (result?.ok !== true) app.refreshCyberwareMaintenancePanel?.(citizenId, { mount: true });
            else refreshAfterCyberwareMutation(citizenId, { refreshMaintenance: true, mountMaintenance: true });
          }
          return;
        }
      }

      const diagnosticsAction = event.target.closest?.("[data-cyberware-diagnostics-action]");
      if (diagnosticsAction && !diagnosticsAction.disabled) {
        event.preventDefault();
        const action = String(diagnosticsAction.dataset.cyberwareDiagnosticsAction || "").trim().toLowerCase();
        if (action === "open") app.mountCyberwareDiagnosticsPanel?.(citizenId);
        else if (action === "scan") {
          const citizen = app.getCitizenById?.(citizenId) || null;
          const runtime = citizen ? app.getCyberwareWorkspaceRuntime?.(citizen) : null;
          const result = app.runCyberwareDiagnosticScan?.(citizenId, { runtime });
          if (!result?.ok) diagnosticsAction.dataset.diagnosticsError = String(result?.reason || "DIAGNOSTIC_SCAN_FAILED");
        } else if (action === "clear-history") {
          const result = app.clearCyberwareDiagnosticHistory?.(citizenId);
          if (!result?.ok) diagnosticsAction.dataset.diagnosticsError = String(result?.reason || "DIAGNOSTIC_HISTORY_CLEAR_FAILED");
        }
        return;
      }

      const authorizationAction = event.target.closest?.("[data-cyberware-authorization-action]");
      if (authorizationAction && !authorizationAction.disabled) {
        event.preventDefault();
        const action = String(authorizationAction.dataset.cyberwareAuthorizationAction || "").trim().toLowerCase();
        const itemId = String(authorizationAction.dataset.itemId || "").trim();
        if (action === "update-firmware" && itemId) {
          const result = app.installCyberwareFirmware?.(citizenId, itemId, { source: "CYBERWARE_WORKSPACE", deferPersistence: true });
          const worldOperation = result?.operation?.operationId || result?.operationId;
          if (!worldOperation && result?.ok === true) refreshAfterCyberwareMutation(citizenId, { planner: true, diagnostics: false, maintenance: false });
          if (!result?.ok) authorizationAction.dataset.authorizationError = String(result?.reason || "FIRMWARE_UPDATE_FAILED");
        }
        return;
      }

      const plannerToggle = event.target.closest?.("[data-cyberware-planner-toggle]");
      if (plannerToggle && !plannerToggle.disabled) {
        event.preventDefault();
        app.mountCyberwarePlannerPanel?.(citizenId);
      }
    });
    return true;
  }

  function renderCyberwareModule(user = app.currentUser, prepared = {}) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    if (!container) return null;
    const citizen = prepared.citizen || getCyberwareTargetCitizen(user);
    if (citizen?.id) app.cyberwareTargetCitizenId = citizen.id;
    const view = citizen?.id ? app.getCyberwareUiState?.(citizen.id)?.activeView || "OVERVIEW" : "OVERVIEW";
    if (status) status.textContent = `CYBERWARE / ${String(view).toUpperCase()}`;

    container.innerHTML = `
      <section class="module-detail cyberware-module-view" data-cyberware-module-shell data-cyberware-citizen-id="${escapeHtml(citizen?.id || "")}">
        <div class="module-detail-head">
          <div>
            <p class="kicker">TERMINAL / CYBERWARE</p>
            <h4>Cyberware</h4>
          </div>
          <button class="module-back-button" type="button">Back</button>
        </div>
        ${citizen ? renderCyberwareTargetSwitcher(user, citizen.id) : ""}
        <div class="cyberware-module-workspace-host">
          ${citizen && typeof app.renderCyberwareWorkspace === "function"
            ? app.renderCyberwareWorkspace(citizen, { activeView: prepared.activeView || view })
            : '<p class="file-empty">No citizen profile is linked to this Cyberware session.</p>'}
        </div>
      </section>
    `;

    app.bindModuleBackButton?.(user, () => app.renderModules?.(user));
    bindCyberwareModuleActions(user);
    return citizen;
  }

  function openCyberwareModule(user = app.currentUser, options = {}) {
    const citizenId = String(options.citizenId || "").trim();
    if (citizenId) app.cyberwareTargetCitizenId = citizenId;
    if (typeof app.openModule === "function" && app.currentModuleId !== "cyberware") {
      app.openModule("cyberware", user, options);
      return true;
    }
    renderCyberwareModule(user, { activeView: options.section || options.cyberwareView || "OVERVIEW" });
    return true;
  }

  function openCyberwareInstance(citizenId = "", instanceId = "", options = {}) {
    const id = String(citizenId || "").trim();
    const itemId = String(instanceId || "").trim();
    if (id) app.cyberwareTargetCitizenId = id;
    if (id && itemId) app.setCyberwareSelectedInstance?.(id, itemId, { syncView: false });
    return openCyberwareModule(options.user || app.currentUser, {
      citizenId: id,
      routeId: options.routeId || "CYBERWARE_INSTANCE",
      section: options.section || "SYSTEMS",
      entityRef: itemId ? { type: "ITEM_INSTANCE", id: itemId } : null,
      params: { instanceId: itemId, cyberwareView: options.cyberwareView || options.section || "SYSTEMS" }
    });
  }

  app.cyberwareModule = {
    version: CYBERWARE_MODULE_VERSION,
    getCyberwareTargetCitizen,
    renderCyberwareTargetSwitcher,
    bindCyberwareModuleActions,
    renderCyberwareModule,
    openCyberwareModule,
    openCyberwareInstance
  };

  app.getCyberwareTargetCitizen = getCyberwareTargetCitizen;
  app.renderCyberwareModule = renderCyberwareModule;
  app.openCyberwareModule = openCyberwareModule;
  app.openCyberwareForCitizen = (citizenId = "", options = {}) => openCyberwareModule(options.user || app.currentUser, { ...options, citizenId });
  app.openCyberwareInstance = openCyberwareInstance;
  app.openCyberwarePlanner = (citizenId = "", instanceId = "", options = {}) => openCyberwareInstance(citizenId, instanceId, { ...options, section: "PLANNER", cyberwareView: "PLANNER" });
  app.openCyberwareMaintenance = (citizenId = "", instanceId = "", options = {}) => openCyberwareInstance(citizenId, instanceId, { ...options, section: "MAINTENANCE", cyberwareView: "MAINTENANCE" });
  app.openCyberwareIndex = (citizenId = "", options = {}) => {
    const result = openCyberwareModule(options.user || app.currentUser, { ...options, citizenId, section: options.section || "OVERVIEW" });
    if (citizenId) app.setCyberwareIndexOpen?.(citizenId, true);
    return result;
  };
})();
