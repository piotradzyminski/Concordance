window.WS_APP = window.WS_APP || {};

(function initEquipmentDesignShell() {
  const EQUIPMENT_SHELL_VERSION = "1.0";
    const WORKSPACE_VIEWS = ["CYBERGRID", "CYBERWARE"];
  const escapeHtml = window.WS_APP.escapeEquipmentHtml || ((value = "") => String(value ?? ""));

  function normalizeWorkspaceView(value = "CYBERGRID") {
    const normalized = String(value || "CYBERGRID").trim().toUpperCase();
    return WORKSPACE_VIEWS.includes(normalized) ? normalized : "CYBERGRID";
  }

  function getActiveWorkspaceView(state = {}) {
    return normalizeWorkspaceView(state?.selections?.activeWorkspaceView || "CYBERGRID");
  }

  function cacheEquipmentRuntimeState(citizen = {}, state = null) {
    const citizenId = String(citizen?.id || "").trim();
    if (!citizenId || !state) return state;
    window.WS_APP.equipmentRuntimeStateCache = { citizenId, state };
    return state;
  }

  function getEquipmentRuntimeState(citizenOrId = "") {
    const citizenId = String(typeof citizenOrId === "object" ? citizenOrId?.id || "" : citizenOrId || "").trim();
    const cache = window.WS_APP.equipmentRuntimeStateCache || null;
    return citizenId && String(cache?.citizenId || "") === citizenId ? cache.state || null : null;
  }


  function normalizeEquipmentBodymapView(value = "front") {
    return String(value || "front").trim().toLowerCase() === "back" ? "back" : "front";
  }

  function switchEquipmentBodymapView(view = "front", options = {}) {
    const normalizedView = normalizeEquipmentBodymapView(view);
    const root = options.root || getEquipmentModuleRoot(options.citizenId || "");
    const panel = root?.querySelector?.('[data-equipment-panel="bodymap"]') || null;
    if (!root || !panel) return { ok: false, changed: false, view: normalizedView, reason: "BODYMAP_PANEL_NOT_MOUNTED" };

    const activeView = normalizeEquipmentBodymapView(panel.dataset.equipmentBodymapActiveView || "front");
    if (activeView === normalizedView) return { ok: true, changed: false, view: normalizedView, reason: "ALREADY_ACTIVE" };

    const citizenId = String(root.dataset.equipmentCitizenId || options.citizenId || "").trim();
    const state = getEquipmentRuntimeState(citizenId);
    window.WS_APP.setEquipmentBodymapView?.(normalizedView);
    if (state) {
      state.selections = {
        ...(state.selections && typeof state.selections === "object" ? state.selections : {}),
        selectedBodymapView: normalizedView
      };
      const citizen = citizenId && typeof window.WS_APP.getCitizenById === "function"
        ? window.WS_APP.getCitizenById(citizenId)
        : null;
      if (citizen) cacheEquipmentRuntimeState(citizen, state);
    }

    const result = typeof window.WS_APP.syncEquipmentBodymapPanelView === "function"
      ? window.WS_APP.syncEquipmentBodymapPanelView(panel, normalizedView)
      : { ok: false, changed: false, view: normalizedView, reason: "BODYMAP_FAST_PATH_UNAVAILABLE" };
    if (result?.ok === true) window.WS_APP.preloadEquipmentBodymapAssets?.(panel);
    return result;
  }

  function normalizeEquipmentSelectionSnapshot(selection = {}, state = {}) {
    const current = state?.selections && typeof state.selections === "object" ? state.selections : {};
    return {
      ...current,
      ...(selection && typeof selection === "object" ? selection : {})
    };
  }

  function applyEquipmentSelectionToRuntimeState(state = {}, selection = {}) {
    if (!state || typeof state !== "object") return null;
    state.selections = normalizeEquipmentSelectionSnapshot(selection, state);
    const selectedItemId = String(state.selections.selectedItemId || "").trim();
    state.selectedItem = selectedItemId ? state?.itemById?.[selectedItemId] || null : null;
    if (!state.selectedItem) state.selections.selectedItemId = "";
    return state;
  }

  function syncEquipmentCommandRailSelection(root = null, state = {}) {
    const panel = root?.querySelector?.('[data-equipment-panel="command-rail"]') || null;
    if (!panel) return { ok: false, reason: "COMMAND_RAIL_NOT_MOUNTED" };
    const context = getEquipmentCommandContext(state);
    const title = panel.querySelector(".equipment-command-rail__head h5");
    const badge = panel.querySelector(".equipment-command-rail__head .equipment-panel-badge");
    const body = panel.querySelector(".equipment-command-rail__body");
    panel.dataset.equipmentCommandMode = context.mode;
    if (title) title.textContent = context.inspectorTitle || "Item Inspector";
    if (badge) badge.textContent = context.badge || "READY";
    if (body) body.innerHTML = renderEquipmentCommandRailBody(state, context, { variant: "compact" });
    return { ok: Boolean(body), mode: context.mode };
  }

  function syncEquipmentGenericItemSelection(root = null, state = {}) {
    if (!root) return 0;
    const selectedItemId = String(state?.selections?.selectedItemId || "").trim();
    let changed = 0;
    root.querySelectorAll("[data-equipment-select-item]").forEach((node) => {
      const selected = String(node.dataset.equipmentSelectItem || "").trim() === selectedItemId;
      if (node.classList.contains("is-selected") !== selected) changed += 1;
      node.classList.toggle("is-selected", selected);
    });
    root.querySelectorAll("[data-equipment-item-index-row]").forEach((row) => {
      const itemId = String(row.querySelector("[data-equipment-item-index-select]")?.dataset?.equipmentItemIndexSelect || "").trim();
      row.classList.toggle("is-selected", Boolean(selectedItemId) && itemId === selectedItemId);
    });
    return changed;
  }

  function commitEquipmentSelectionFastPath(root = null, citizen = null, state = null, selection = {}) {
    if (!root || !citizen || !state) return { ok: false, changed: false, reason: "SELECTION_FAST_PATH_UNAVAILABLE" };
    const previousItemId = String(state?.selections?.selectedItemId || "").trim();
    const previousRegion = String(state?.selections?.selectedRegion || "").trim();
    const previousContainer = String(state?.selections?.inspectedContainerId || "").trim();
    const previousSelectedContainer = String(state?.selections?.selectedContainerId || "").trim();
    const previousReturnRegion = String(state?.selections?.inspectorReturnRegion || "").trim();
    applyEquipmentSelectionToRuntimeState(state, selection);
    const nextItemId = String(state?.selections?.selectedItemId || "").trim();
    const nextRegion = String(state?.selections?.selectedRegion || "").trim();
    const nextContainer = String(state?.selections?.inspectedContainerId || "").trim();
    const nextSelectedContainer = String(state?.selections?.selectedContainerId || "").trim();
    const nextReturnRegion = String(state?.selections?.inspectorReturnRegion || "").trim();
    const changed = previousItemId !== nextItemId
      || previousRegion !== nextRegion
      || previousContainer !== nextContainer
      || previousSelectedContainer !== nextSelectedContainer
      || previousReturnRegion !== nextReturnRegion;
    if (!changed) return { ok: true, changed: false, itemId: nextItemId, reason: "ALREADY_SELECTED" };

    cacheEquipmentRuntimeState(citizen, state);
    const cybergridResult = window.WS_APP.syncEquipmentCybergridSelection?.(root, state) || { ok: true, changed: 0 };
    const bodymapResult = window.WS_APP.syncEquipmentBodymapSelection?.(root, state) || { ok: true, changed: 0 };
    const genericChanged = syncEquipmentGenericItemSelection(root, state);
    const inspectorResult = syncEquipmentCommandRailSelection(root, state);
    return {
      ok: inspectorResult.ok !== false,
      changed: true,
      itemId: nextItemId,
      cybergridResult,
      bodymapResult,
      genericChanged,
      inspectorResult
    };
  }

  function selectEquipmentItemFastPath(itemId = "", options = {}) {
    const normalizedItemId = String(itemId || "").trim();
    const root = options.root || getEquipmentModuleRoot(options.citizenId || "");
    const citizenId = String(root?.dataset?.equipmentCitizenId || options.citizenId || "").trim();
    const citizen = options.citizen || (citizenId && typeof window.WS_APP.getCitizenById === "function"
      ? window.WS_APP.getCitizenById(citizenId)
      : null);
    const state = getEquipmentRuntimeState(citizenId);
    if (!root || !citizen || !state) return { ok: false, changed: false, itemId: normalizedItemId, reason: "EQUIPMENT_STATE_NOT_CACHED" };
    if (normalizedItemId && !state?.itemById?.[normalizedItemId]) {
      return { ok: false, changed: false, itemId: normalizedItemId, reason: "ITEM_NOT_IN_CACHED_STATE" };
    }

    const currentItemId = String(state?.selections?.selectedItemId || "").trim();
    const currentReturnRegion = String(state?.selections?.inspectorReturnRegion || "").trim();
    const returnRegion = String(options.returnRegion || "").trim();
    const currentSelectedContainerId = String(state?.selections?.selectedContainerId || "").trim();
    const containerId = String(options.containerId || "").trim();
    if (currentItemId === normalizedItemId
      && currentReturnRegion === returnRegion
      && (!containerId || currentSelectedContainerId === containerId)) {
      return { ok: true, changed: false, itemId: normalizedItemId, reason: "ALREADY_SELECTED" };
    }

    let selection = null;
    if (containerId && typeof window.WS_APP.setEquipmentSelectedContainerItem === "function") {
      selection = window.WS_APP.setEquipmentSelectedContainerItem(normalizedItemId, containerId);
    } else if (returnRegion && typeof window.WS_APP.setEquipmentSelectedItemFromRegion === "function") {
      selection = window.WS_APP.setEquipmentSelectedItemFromRegion(normalizedItemId, returnRegion);
    } else if (typeof window.WS_APP.setEquipmentSelectedItem === "function") {
      selection = window.WS_APP.setEquipmentSelectedItem(normalizedItemId);
    }
    if (!selection) return { ok: false, changed: false, itemId: normalizedItemId, reason: "SELECTION_SETTER_UNAVAILABLE" };
    return commitEquipmentSelectionFastPath(root, citizen, state, selection);
  }

  function clearEquipmentActiveSelectionFastPath(options = {}) {
    const root = options.root || getEquipmentModuleRoot(options.citizenId || "");
    const citizenId = String(root?.dataset?.equipmentCitizenId || options.citizenId || "").trim();
    const citizen = options.citizen || (citizenId && typeof window.WS_APP.getCitizenById === "function"
      ? window.WS_APP.getCitizenById(citizenId)
      : null);
    const state = getEquipmentRuntimeState(citizenId);
    if (!root || !citizen || !state) return { ok: false, changed: false, reason: "EQUIPMENT_STATE_NOT_CACHED" };
    const hasSelection = Boolean(state?.selections?.selectedItemId || state?.selections?.selectedRegion || state?.selections?.inspectedContainerId);
    if (!hasSelection) return { ok: true, changed: false, reason: "ALREADY_CLEAR" };
    const selection = window.WS_APP.clearEquipmentActiveSelection?.();
    if (!selection) return { ok: false, changed: false, reason: "SELECTION_SETTER_UNAVAILABLE" };
    return commitEquipmentSelectionFastPath(root, citizen, state, selection);
  }

  function getEquipmentModuleRoot(citizenId = "") {
    const root = document.querySelector?.("[data-equipment-module-shell]") || null;
    if (!root) return null;
    const expectedId = String(citizenId || "").trim();
    return !expectedId || String(root.dataset.equipmentCitizenId || "").trim() === expectedId ? root : null;
  }

  function markEquipmentWorkspaceDirty(citizenId = "", view = "CYBERGRID", dirty = true) {
    const root = getEquipmentModuleRoot(citizenId);
    const normalizedView = normalizeWorkspaceView(view);
    const screen = root?.querySelector?.(`[data-equipment-screen="${normalizedView}"]`) || null;
    if (screen) screen.dataset.equipmentScreenDirty = dirty ? "true" : "false";
    return Boolean(screen);
  }

  function invalidateEquipmentRuntimeState(citizenId = "", options = {}) {
    const normalizedId = String(citizenId || "").trim();
    const cache = window.WS_APP.equipmentRuntimeStateCache || null;
    if (!normalizedId || String(cache?.citizenId || "") === normalizedId) {
      window.WS_APP.equipmentRuntimeStateCache = null;
    }
    if (options.markCybergrid !== false) markEquipmentWorkspaceDirty(normalizedId, "CYBERGRID", true);
    return true;
  }

  function applyEquipmentWorkspaceViewToState(state = {}, view = "CYBERGRID") {
    if (!state || typeof state !== "object") return state;
    state.selections = {
      ...(state.selections && typeof state.selections === "object" ? state.selections : {}),
      activeWorkspaceView: normalizeWorkspaceView(view)
    };
    return state;
  }

  function renderEquipmentTargetSwitcher(user = window.WS_APP.currentUser, selectedId = "") {
    if (user?.role !== "admin") return "";
    const citizens = typeof window.WS_APP.equipmentStore?.getEquipmentCitizens === "function"
      ? window.WS_APP.equipmentStore.getEquipmentCitizens(user)
      : [];
    return `
      <label class="equipment-shell-target">TARGET CITIZEN
        <select data-equipment-target-select>
          ${citizens.map((citizen) => `<option value="${escapeHtml(citizen.id)}" ${citizen.id === selectedId ? "selected" : ""}>${escapeHtml(citizen.name || citizen.id)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function renderEquipmentWorkspaceTabs(state = {}) {
    const activeView = getActiveWorkspaceView(state);
    const definitions = [
      { key: "CYBERGRID", label: "Cybergrid", meta: "Body, grids and containers" },
      { key: "CYBERWARE", label: "Cyberware", meta: "Installed systems and service" }
    ];
    return `
      <nav class="system-segment-tabs equipment-workspace-tabs" role="tablist" aria-label="Equipment workspace screens">
        ${definitions.map((entry) => `
          <button class="system-segment-tile system-segment-tile--card equipment-workspace-tab ${activeView === entry.key ? "is-active" : ""}" type="button" role="tab" aria-selected="${activeView === entry.key ? "true" : "false"}"
            data-equipment-workspace-view="${escapeHtml(entry.key)}">
            <span class="system-segment-tile__body">
              <b class="system-segment-tile__title">${escapeHtml(entry.label)}</b>
              <small class="system-segment-tile__description">${escapeHtml(entry.meta)}</small>
            </span>
          </button>
        `).join("")}
      </nav>
    `;
  }

  function renderEquipmentShellHeader(state = {}) {
    const activeView = getActiveWorkspaceView(state);
    const headings = {
      CYBERGRID: "Equipment Workspace",
      CYBERWARE: "Cyberware Workspace"
    };
    const descriptions = {
      CYBERGRID: "Manage carried items, visible grids and mount storage.",
      CYBERWARE: "Review installed systems, core stack and service context."
    };
    const heroVisible = activeView === "CYBERGRID";
    const itemIndexAction = heroVisible
      ? `<button class="secondary-action equipment-shell-item-index-action" type="button" data-equipment-item-index-toggle aria-expanded="${state?.selections?.itemIndexOpen === true ? "true" : "false"}">Item Index</button>`
      : "";
    return `
      <section class="equipment-shell-hero equipment-shell-hero--compact" data-equipment-shell-hero ${heroVisible ? 'aria-hidden="false"' : 'hidden aria-hidden="true" inert'}>
        <div class="equipment-shell-hero__copy">
          <p class="kicker" data-equipment-shell-kicker>EQUIPMENT / ${escapeHtml(activeView)}</p>
          <h5 data-equipment-shell-title>${escapeHtml(headings[activeView] || "Equipment Workspace")}</h5>
          <p data-equipment-shell-description>${escapeHtml(descriptions[activeView])}</p>
        </div>
        <div class="equipment-shell-hero__side" data-equipment-shell-actions>${itemIndexAction}</div>
      </section>
    `;
  }

  function getSelectedEquipmentContainer(state = {}) {
    const inspectedContainerId = String(state?.selections?.inspectedContainerId || "").trim();
    if (!inspectedContainerId) return null;
    const containers = Array.isArray(state?.containers?.all) ? state.containers.all : [];
    return containers.find((container) => String(container?.id || "") === inspectedContainerId) || null;
  }

  function getEquipmentCommandContext(state = {}) {
    if (state?.selectedItem) {
      const item = state.selectedItem;
      return {
        mode: "item",
        inspectorTitle: "Item Inspector",
        label: "Selected Item",
        title: item.name || item.id || "Item",
        badge: typeof window.WS_APP.getEquipmentItemInspectorBadge === "function"
          ? window.WS_APP.getEquipmentItemInspectorBadge(item)
          : item.isEquipped ? "EQUIPPED" : item.isInGrid ? "IN GRID" : item.isStored ? "HOUSING" : item.isOrphan ? "INVALID" : "ITEM"
      };
    }
    const selectedRegionKey = String(state?.selections?.selectedRegion || "").trim();
    if (selectedRegionKey) {
      const region = Array.isArray(state?.bodyRegions) ? state.bodyRegions.find((entry) => entry.key === selectedRegionKey) : null;
      return {
        mode: "region",
        inspectorTitle: "Region Inspector",
        label: "Region",
        title: region?.label || selectedRegionKey,
        badge: `${Number(region?.occupiedCount || 0)} OCCUPIED`
      };
    }
    const selectedContainer = getSelectedEquipmentContainer(state);
    if (selectedContainer) {
      return {
        mode: "container",
        inspectorTitle: "Container Inspector",
        label: "Selected Container",
        title: selectedContainer.name || selectedContainer.containerProfile?.label || selectedContainer.id || "Container",
        badge: selectedContainer.isEquipped ? "WORN" : selectedContainer.isStored ? "HOUSING" : selectedContainer.isInGrid ? "NESTED" : "INVALID"
      };
    }
    return {
      mode: "ready",
      inspectorTitle: "Item / Region Inspector",
      label: "Command Rail",
      title: "Select Target",
      badge: "READY"
    };
  }

  function renderEquipmentCommandEmptyState(variant = "full") {
    const compact = variant === "compact";
    return `
      <div class="equipment-command-empty ${compact ? "is-compact" : ""}">
        <h6>No target selected</h6>
        <p class="equipment-shell-note">Select an item in a grid or select a body region.</p>
        ${compact ? "" : `
          <div class="equipment-command-flow">
            <span><b>Body region</b><small>Grid → anchor/layer / body → selected grid</small></span>
            <span><b>Grid item</b><small>Inspect / equip / drag between grids</small></span>
            <span><b>Container</b><small>Grid contents / rotate / sort</small></span>
          </div>
        `}
      </div>
    `;
  }

  function renderEquipmentCommandRailBody(state = {}, context = {}, options = {}) {
    const variant = options.variant === "compact" ? "compact" : "full";
    if (context.mode === "item") {
      return typeof window.WS_APP.renderEquipmentItemDetail === "function"
        ? window.WS_APP.renderEquipmentItemDetail(state, { compact: variant === "compact" })
        : renderEquipmentCommandEmptyState(variant);
    }
    if (context.mode === "region") {
      return typeof window.WS_APP.renderEquipmentSelectedRegionDetail === "function"
        ? window.WS_APP.renderEquipmentSelectedRegionDetail(state)
        : renderEquipmentCommandEmptyState(variant);
    }
    if (context.mode === "container") {
      const renderer = window.WS_APP.renderSelectedEquipmentContainerDetail || window.WS_APP.equipmentContainersPanel?.renderSelectedContainerDetail;
      return typeof renderer === "function"
        ? renderer(state, { includeGrid: variant !== "compact", compact: variant === "compact" })
        : renderEquipmentCommandEmptyState(variant);
    }
    return renderEquipmentCommandEmptyState(variant);
  }

  function renderEquipmentCommandRail(state = {}, options = {}) {
    const context = getEquipmentCommandContext(state);
    const variant = options.variant === "compact" ? "compact" : "full";

    return `
      <section class="equipment-shell-panel equipment-command-rail equipment-command-rail--${escapeHtml(variant)}" data-equipment-panel="command-rail" data-equipment-command-mode="${escapeHtml(context.mode)}">
        <div class="equipment-shell-panel__head equipment-command-rail__head">
          <div><h5>${escapeHtml(context.inspectorTitle || "Item Inspector")}</h5></div>
          <div class="equipment-command-rail__head-actions">
            <span class="equipment-panel-badge">${escapeHtml(context.badge)}</span>
          </div>
        </div>
        <div class="equipment-command-rail__body">
          ${renderEquipmentCommandRailBody(state, context, { variant })}
        </div>
      </section>
    `;
  }

  function getEquipmentScreenStateAttributes(active = false, mounted = true) {
    return [
      `data-equipment-screen-mounted="${mounted ? "true" : "false"}"`,
      `data-equipment-screen-dirty="false"`,
      active ? `aria-hidden="false"` : `hidden aria-hidden="true" inert`
    ].join(" ");
  }

  function renderEquipmentScreenPlaceholder(view = "CYBERGRID") {
    const normalizedView = normalizeWorkspaceView(view);
    const modifier = normalizedView.toLowerCase();
    return `
      <section class="equipment-screen equipment-screen--${escapeHtml(modifier)} is-unmounted" data-equipment-screen="${escapeHtml(normalizedView)}" ${getEquipmentScreenStateAttributes(false, false)}></section>
    `;
  }

  function renderCybergridScreen(state = {}, options = {}) {
    const gridWorkspace = typeof window.WS_APP.renderEquipmentCybergridPanel === "function"
      ? window.WS_APP.renderEquipmentCybergridPanel(state)
      : "";
    const bodymap = typeof window.WS_APP.renderEquipmentBodymapPanel === "function"
      ? window.WS_APP.renderEquipmentBodymapPanel(state)
      : "";
    const itemIndex = typeof window.WS_APP.renderEquipmentItemIndex === "function"
      ? window.WS_APP.renderEquipmentItemIndex(state)
      : "";
    return `
      <section class="equipment-screen equipment-screen--cybergrid" data-equipment-screen="CYBERGRID" ${getEquipmentScreenStateAttributes(options.active === true, true)}>
        <div class="equipment-cybergrid-workspace">
          <div class="equipment-cybergrid-main">
            ${bodymap}
            ${gridWorkspace}
          </div>
          <aside class="equipment-cybergrid-inspector">
            ${renderEquipmentCommandRail(state, { variant: "compact" })}
          </aside>
        </div>
        ${itemIndex}
      </section>
    `;
  }

  function renderCyberwareScreen(state = {}, citizen = {}, options = {}) {
    const workspace = typeof window.WS_APP.renderEquipmentCyberwareWorkspace === "function"
      ? window.WS_APP.renderEquipmentCyberwareWorkspace(state, citizen, { lazyPlanner: true })
      : typeof window.WS_APP.renderEquipmentCyberwareLinkPanel === "function"
        ? window.WS_APP.renderEquipmentCyberwareLinkPanel(state)
        : `<p class="file-empty">Cyberware workspace unavailable.</p>`;
    return `
      <section class="equipment-screen equipment-screen--cyberware" data-equipment-screen="CYBERWARE" ${getEquipmentScreenStateAttributes(options.active === true, true)}>
        ${workspace}
      </section>
    `;
  }

  function renderEquipmentDesignShell(citizen = {}, preparedState = null) {
    const state = preparedState || (typeof window.WS_APP.getEquipmentState === "function"
      ? window.WS_APP.getEquipmentState(citizen)
      : null);
    if (!state) return `<p class="file-empty">Equipment state model unavailable.</p>`;
    cacheEquipmentRuntimeState(citizen, state);

    const activeView = getActiveWorkspaceView(state);
    const cybergridScreen = activeView === "CYBERGRID"
      ? renderCybergridScreen(state, { active: true })
      : renderEquipmentScreenPlaceholder("CYBERGRID");
    const cyberwareScreen = activeView === "CYBERWARE"
      ? renderCyberwareScreen(state, citizen, { active: true })
      : renderEquipmentScreenPlaceholder("CYBERWARE");

    return `
      ${renderEquipmentWorkspaceTabs(state)}
      ${renderEquipmentShellHeader(state)}
      <div class="equipment-shell-layout equipment-shell-layout--screen-split" data-equipment-workspace-host>
        ${cybergridScreen}
        ${cyberwareScreen}
      </div>
      <div class="equipment-hover-tooltip" data-equipment-hover-tooltip role="tooltip" hidden></div>
    `;
  }

  function createEquipmentMarkupNode(markup = "") {
    const template = document.createElement("template");
    template.innerHTML = String(markup || "").trim();
    return template.content.firstElementChild || null;
  }

  function replaceEquipmentPanel(root = null, selector = "", markup = "") {
    const current = root?.querySelector?.(selector) || null;
    const next = createEquipmentMarkupNode(markup);
    if (!current || !next) return false;
    current.replaceWith(next);
    return true;
  }


  function setEquipmentScreenVisibility(screen = null, active = false) {
    if (!screen) return;
    screen.hidden = !active;
    screen.setAttribute("aria-hidden", active ? "false" : "true");
    if (active) screen.removeAttribute("inert");
    else screen.setAttribute("inert", "");
    screen.classList.toggle("is-active", active);
  }

  function syncEquipmentWorkspaceTabs(root = null, activeView = "CYBERGRID") {
    const normalizedView = normalizeWorkspaceView(activeView);
    root?.querySelectorAll?.("[data-equipment-workspace-view]").forEach((button) => {
      const selected = normalizeWorkspaceView(button.dataset.equipmentWorkspaceView || "CYBERGRID") === normalizedView;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function syncEquipmentShellHeader(root = null, state = {}) {
    if (!root) return;
    const activeView = getActiveWorkspaceView(state);
    const heroVisible = true;
    const headings = {
      CYBERGRID: "Equipment Workspace",
      CYBERWARE: "Cyberware Workspace"
    };
    const descriptions = {
      CYBERGRID: "Manage carried items, visible grids and mount storage.",
      CYBERWARE: "Review installed systems, core stack and service context."
    };
    const hero = root.querySelector("[data-equipment-shell-hero]");
    const kicker = root.querySelector("[data-equipment-shell-kicker]");
    const title = root.querySelector("[data-equipment-shell-title]");
    const description = root.querySelector("[data-equipment-shell-description]");
    const actions = root.querySelector("[data-equipment-shell-actions]");
    if (hero) {
      hero.hidden = false;
      hero.setAttribute("aria-hidden", "false");
      hero.removeAttribute("inert");
    }
    if (kicker) kicker.textContent = `EQUIPMENT / ${activeView}`;
    if (title) title.textContent = headings[activeView] || "Equipment Workspace";
    if (description) description.textContent = descriptions[activeView] || "";
    if (actions) {
      actions.innerHTML = heroVisible
        ? `<button class="secondary-action equipment-shell-item-index-action" type="button" data-equipment-item-index-toggle aria-expanded="${state?.selections?.itemIndexOpen === true ? "true" : "false"}">Item Index</button>`
        : "";
    }
  }

  function ensureEquipmentWorkspaceScreen(root = null, view = "CYBERGRID", citizen = {}, state = {}, options = {}) {
    if (!root || !state) return null;
    const normalizedView = normalizeWorkspaceView(view);
    let screen = root.querySelector(`[data-equipment-screen="${normalizedView}"]`);
    const mounted = screen?.dataset?.equipmentScreenMounted === "true";
    const dirty = screen?.dataset?.equipmentScreenDirty === "true";
    if (mounted && !dirty && options.force !== true) return screen;

    const markup = normalizedView === "CYBERWARE"
      ? renderCyberwareScreen(state, citizen, { active: false })
      : renderCybergridScreen(state, { active: false });
    const next = createEquipmentMarkupNode(markup);
    if (!next) return screen;
    if (screen) screen.replaceWith(next);
    else root.querySelector("[data-equipment-workspace-host]")?.appendChild(next);
    screen = next;
    screen.dataset.equipmentScreenMounted = "true";
    screen.dataset.equipmentScreenDirty = "false";
    return screen;
  }

  function syncEquipmentWorkspaceShell(nextView = "CYBERGRID", options = {}) {
    const normalizedView = normalizeWorkspaceView(nextView);
    const root = options.root || getEquipmentModuleRoot(options.citizen?.id || options.citizenId || "");
    if (!root) return null;
    const citizenId = String(root.dataset.equipmentCitizenId || "").trim();
    const citizen = options.citizen || (citizenId && typeof window.WS_APP.getCitizenById === "function"
      ? window.WS_APP.getCitizenById(citizenId)
      : null);
    let state = options.state || getEquipmentRuntimeState(citizenId);
    if (!state && citizen && typeof window.WS_APP.getEquipmentState === "function") {
      state = window.WS_APP.getEquipmentState(citizen);
      cacheEquipmentRuntimeState(citizen, state);
    }
    if (!state || !citizen) return null;

    applyEquipmentWorkspaceViewToState(state, normalizedView);
    cacheEquipmentRuntimeState(citizen, state);
    const targetScreen = ensureEquipmentWorkspaceScreen(root, normalizedView, citizen, state, { force: options.forceMount === true });
    if (!targetScreen) return null;
    if (normalizedView === "CYBERGRID") window.WS_APP.preloadEquipmentBodymapAssets?.(targetScreen);
    root.querySelectorAll("[data-equipment-screen]").forEach((screen) => {
      setEquipmentScreenVisibility(screen, screen === targetScreen);
    });
    syncEquipmentWorkspaceTabs(root, normalizedView);
    syncEquipmentShellHeader(root, state);
    const status = document.querySelector("#module-status");
    if (status) status.textContent = `EQUIPMENT / ${normalizedView}`;
    return state;
  }

  function syncEquipmentItemIndex(root = null, state = {}) {
    if (!root) return;
    root.querySelector("[data-equipment-item-index-overlay]")?.remove();
    const markup = typeof window.WS_APP.renderEquipmentItemIndex === "function"
      ? window.WS_APP.renderEquipmentItemIndex(state)
      : "";
    if (markup) root.querySelector('[data-equipment-screen="CYBERGRID"]')?.insertAdjacentHTML("beforeend", markup);
    window.WS_APP.equipmentActions?.applyEquipmentItemIndexFilters?.(root);
    const trigger = root.querySelector("[data-equipment-item-index-toggle]");
    if (trigger) trigger.setAttribute("aria-expanded", state?.selections?.itemIndexOpen === true ? "true" : "false");
  }

  function refreshEquipmentStorageRegions(root = null, state = {}, containerIds = []) {
    const ids = [...new Set((Array.isArray(containerIds) ? containerIds : []).map((value) => String(value || "").trim()).filter(Boolean))];
    if (!root || !ids.length || typeof window.WS_APP.renderEquipmentStorageRegion !== "function") return false;
    const regions = typeof window.WS_APP.getEquipmentStorageRegions === "function"
      ? window.WS_APP.getEquipmentStorageRegions(state)
      : Array.isArray(state?.storageRegions) ? state.storageRegions : [];
    let replaced = 0;
    ids.forEach((containerId) => {
      const region = regions.find((entry) => String(entry?.containerId || "") === containerId) || null;
      const safeId = window.CSS?.escape ? window.CSS.escape(containerId) : containerId.replace(/["\\]/g, "\\$&");
      const current = root.querySelector(`[data-equipment-storage-region][data-equipment-container-id="${safeId}"]`);
      if (!region || !current) return;
      const next = createEquipmentMarkupNode(window.WS_APP.renderEquipmentStorageRegion(state, region));
      if (!next) return;
      current.replaceWith(next);
      replaced += 1;
    });
    return replaced === ids.length;
  }

  function refreshEquipmentWorkspace(user = window.WS_APP.currentUser, options = {}) {
    const root = getEquipmentModuleRoot(options?.citizen?.id || "");
    if (!root) return null;
    const citizenId = String(root.dataset.equipmentCitizenId || "").trim();
    const suppliedCitizen = options?.citizen && String(options.citizen.id || "") === citizenId ? options.citizen : null;
    const citizen = suppliedCitizen || (citizenId && typeof window.WS_APP.getCitizenById === "function"
      ? window.WS_APP.getCitizenById(citizenId)
      : typeof window.WS_APP.getEquipmentTargetCitizen === "function"
        ? window.WS_APP.getEquipmentTargetCitizen(user)
        : null);
    const state = options?.state || (citizen && typeof window.WS_APP.getEquipmentState === "function"
      ? window.WS_APP.getEquipmentState(citizen)
      : null);
    if (!citizen || !state) return null;
    cacheEquipmentRuntimeState(citizen, state);

    const activeView = getActiveWorkspaceView(state);
    if (options.full === true) {
      renderEquipmentModule(user, { citizen, state });
      return state;
    }

    let activeScreen = root.querySelector(`[data-equipment-screen="${activeView}"]`);
    const wasMounted = activeScreen?.dataset?.equipmentScreenMounted === "true";
    if (!wasMounted) activeScreen = ensureEquipmentWorkspaceScreen(root, activeView, citizen, state);

    if (activeView === "CYBERGRID" && wasMounted) {
      if (options.bodymap !== false && typeof window.WS_APP.renderEquipmentBodymapPanel === "function") {
        replaceEquipmentPanel(root, '[data-equipment-panel="bodymap"]', window.WS_APP.renderEquipmentBodymapPanel(state));
        window.WS_APP.preloadEquipmentBodymapAssets?.(root);
      }
      if (options.storage !== false && typeof window.WS_APP.renderEquipmentCybergridPanel === "function") {
        const scopedIds = Array.isArray(options.storageContainerIds) ? options.storageContainerIds : [];
        const scoped = scopedIds.length && options.storageFull !== true
          ? refreshEquipmentStorageRegions(root, state, scopedIds)
          : false;
        if (!scoped) replaceEquipmentPanel(root, '[data-equipment-panel="cybergrid"]', window.WS_APP.renderEquipmentCybergridPanel(state));
      }
      if (options.inspector !== false) {
        replaceEquipmentPanel(root, '[data-equipment-panel="command-rail"]', renderEquipmentCommandRail(state, { variant: "compact" }));
      }
      if (options.index !== false) syncEquipmentItemIndex(root, state);
      if (activeScreen) activeScreen.dataset.equipmentScreenDirty = "false";
    } else if (wasMounted && typeof window.WS_APP.refreshEquipmentCyberwareWorkspace === "function") {
      window.WS_APP.refreshEquipmentCyberwareWorkspace(citizen.id, {
        forceRuntime: options.forceCyberwareRuntime !== false,
        refreshPlanner: options.refreshPlanner === true
      });
      if (activeScreen) activeScreen.dataset.equipmentScreenDirty = "false";
    }

    syncEquipmentWorkspaceShell(activeView, { root, citizen, state });
    return state;
  }

  function renderEquipmentModule(user = window.WS_APP.currentUser, prepared = {}) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    if (!container) return;
    const preparedCitizen = prepared?.citizen && typeof prepared.citizen === "object" ? prepared.citizen : null;
    const citizen = preparedCitizen || (typeof window.WS_APP.getEquipmentTargetCitizen === "function"
      ? window.WS_APP.getEquipmentTargetCitizen(user)
      : null);
    const preparedState = prepared?.state || (prepared?.citizenId && prepared?.items ? prepared : null);
    const state = preparedState || (citizen && typeof window.WS_APP.getEquipmentState === "function" ? window.WS_APP.getEquipmentState(citizen) : null);
    const activeView = getActiveWorkspaceView(state || {});
    if (status) status.textContent = `EQUIPMENT / ${activeView}`;

    container.innerHTML = `
      <section class="module-detail equipment-module-view equipment-module-view--design" data-equipment-module-shell data-equipment-citizen-id="${escapeHtml(citizen?.id || "")}">
        <div class="module-detail-head">
          <div>
            <p class="kicker">TERMINAL / EQUIPMENT</p>
            <h4>Equipment</h4>
          </div>
          <button class="module-back-button" type="button">Back</button>
        </div>
        ${citizen ? renderEquipmentTargetSwitcher(user, citizen.id) : ""}
        ${citizen ? renderEquipmentDesignShell(citizen, state) : `<p class="file-empty">No citizen profile is linked to this Equipment session.</p>`}
      </section>
    `;

    window.WS_APP.bindModuleBackButton?.(user, () => window.WS_APP.renderModules?.(user));
    window.WS_APP.bindEquipmentShellActions?.(user);
    window.WS_APP.preloadEquipmentBodymapAssets?.(container);
  }

  window.WS_APP.getEquipmentRuntimeState = getEquipmentRuntimeState;
  window.WS_APP.switchEquipmentBodymapView = switchEquipmentBodymapView;
  window.WS_APP.selectEquipmentItemFastPath = selectEquipmentItemFastPath;
  window.WS_APP.clearEquipmentActiveSelectionFastPath = clearEquipmentActiveSelectionFastPath;
  window.WS_APP.invalidateEquipmentRuntimeState = invalidateEquipmentRuntimeState;
  window.WS_APP.markEquipmentWorkspaceDirty = markEquipmentWorkspaceDirty;
  window.WS_APP.syncEquipmentWorkspaceShell = syncEquipmentWorkspaceShell;

  if (typeof window.addEventListener === "function" && !window.WS_APP.equipmentRuntimeInvalidationBound) {
    window.addEventListener("ws:item-instances-updated", (event) => {
      const citizenId = String(event?.detail?.citizenId || "").trim();
      invalidateEquipmentRuntimeState(citizenId, { markCybergrid: true });
    });
    window.addEventListener("ws:citizens-updated", (event) => {
      const detail = event?.detail || {};
      if (detail.itemInstancesChanged === true) return;
      if (String(detail.source || "").trim().toUpperCase() === "CYBERWARE_DIAGNOSTICS") return;
      const citizenId = String(detail.id || detail.citizen?.id || "").trim();
      if (citizenId) invalidateEquipmentRuntimeState(citizenId, { markCybergrid: true });
    });
    window.WS_APP.equipmentRuntimeInvalidationBound = true;
  }

  window.WS_APP.equipmentModule = {
    version: EQUIPMENT_SHELL_VERSION,
    renderEquipmentModule,
    renderEquipmentTargetSwitcher,
    renderEquipmentDesignShell,
    renderEquipmentWorkspaceTabs,
    renderEquipmentCommandRail,
    refreshEquipmentWorkspace,
    syncEquipmentWorkspaceShell,
    selectEquipmentItemFastPath,
    clearEquipmentActiveSelectionFastPath,
    invalidateEquipmentRuntimeState
  };

  window.WS_APP.renderEquipmentModule = renderEquipmentModule;
  window.WS_APP.renderEquipmentWorkspaceTabs = renderEquipmentWorkspaceTabs;
  window.WS_APP.renderEquipmentCommandRail = renderEquipmentCommandRail;
  window.WS_APP.refreshEquipmentWorkspace = refreshEquipmentWorkspace;
  window.WS_APP.syncEquipmentWorkspaceShell = syncEquipmentWorkspaceShell;
})();
