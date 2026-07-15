window.WS_APP = window.WS_APP || {};

(function initHousingHouseholdRuntimeFactory() {
  window.WS_APP.createHousingHouseholdRuntime = function createHousingHouseholdRuntime(config = {}) {
    const {
      DEFAULT_STORAGE_UNIT_ID,
      escapeHtml,
      getCitizenHousingRecords,
      getHousingActiveRecord,
      renderHousingFeedback,
      renderHousingMetric,
      renderHousingModule,
      setHousingFeedback
    } = config;

    if (typeof escapeHtml !== "function" || typeof renderHousingModule !== "function") {
      throw new Error("HOUSING_HOUSEHOLD_RUNTIME_DEPENDENCY_MISSING");
    }

    const stateRoot = window.WS_APP.housingHouseholdWorkspaceStateByCitizen
      || (window.WS_APP.housingHouseholdWorkspaceStateByCitizen = {});
    let commandSequence = 0;

    function normalizeId(value = "") {
      return String(value || "").trim();
    }

    function normalizeToken(value = "") {
      return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    }

    function getDefaultState() {
      return {
        selectedInstanceId: "",
        selectedRoomId: "",
        rotation: 0,
        search: "",
        storageUnitId: ""
      };
    }

    function getWorkspaceState(citizenId = "") {
      const id = normalizeId(citizenId) || "default";
      const current = stateRoot[id] && typeof stateRoot[id] === "object" ? stateRoot[id] : {};
      stateRoot[id] = { ...getDefaultState(), ...current, rotation: Number(current.rotation) === 90 ? 90 : 0 };
      return stateRoot[id];
    }

    function setWorkspaceState(citizenId = "", patch = {}) {
      const id = normalizeId(citizenId) || "default";
      const current = getWorkspaceState(id);
      stateRoot[id] = {
        ...current,
        ...(patch && typeof patch === "object" ? patch : {}),
        rotation: Number(patch.rotation ?? current.rotation) === 90 ? 90 : 0
      };
      return stateRoot[id];
    }

    function getActiveContext(citizen = {}) {
      const records = typeof getCitizenHousingRecords === "function" ? getCitizenHousingRecords(citizen) : [];
      const record = typeof getHousingActiveRecord === "function" ? getHousingActiveRecord(citizen, records) : records[0] || null;
      return { records, record };
    }

    function getItemView(instance = {}) {
      return window.WS_APP.getItemInstanceView?.(instance.instanceId) || instance.instanceData || instance;
    }

    function getItemName(instance = {}) {
      const view = getItemView(instance);
      return normalizeId(view.displayName || view.name || instance.playerLabel || instance.definitionId || instance.instanceId || "ITEM");
    }

    function getFurnishingItems(citizenId = "", housingRecordId = "") {
      if (typeof window.WS_APP.getHouseholdFurnishingItems === "function") {
        return window.WS_APP.getHouseholdFurnishingItems(citizenId, housingRecordId);
      }
      const record = (window.WS_APP.getCitizenHousingRecords?.(citizenId) || []).find((entry) => entry.id === housingRecordId) || null;
      const storageIds = new Set((record?.storageUnits || []).map((unit) => normalizeId(unit.id)).filter(Boolean));
      return (window.WS_APP.getCitizenEquipmentItemInstances?.(citizenId) || [])
        .filter((instance) => {
          const profile = window.WS_APP.getHouseholdItemProfile?.(instance) || {};
          const type = normalizeToken(instance.location?.type);
          return profile.placeable === true && (
            (type === "HOUSING_STORAGE" && storageIds.has(normalizeId(instance.location?.storageUnitId)))
            || (type === "HOUSING_ROOM" && normalizeId(instance.location?.housingRecordId) === housingRecordId)
          );
        })
        .map((instance) => ({ instance, profile: window.WS_APP.getHouseholdItemProfile?.(instance) || {}, scope: normalizeToken(instance.location?.type) === "HOUSING_ROOM" ? "PLACED" : "STORAGE" }));
    }

    function getSelectedEntry(citizenId = "", housingRecordId = "") {
      const selectedId = getWorkspaceState(citizenId).selectedInstanceId;
      return getFurnishingItems(citizenId, housingRecordId).find((entry) => entry.instance.instanceId === selectedId) || null;
    }

    function ensureWorkspaceSelection(citizenId = "", housingRecordId = "", record = null) {
      const state = getWorkspaceState(citizenId);
      const entries = getFurnishingItems(citizenId, housingRecordId);
      const selected = entries.find((entry) => entry.instance.instanceId === state.selectedInstanceId) || null;
      const storageUnits = Array.isArray(record?.storageUnits) ? record.storageUnits : [];
      const storageUnitId = storageUnits.some((unit) => unit.id === state.storageUnitId)
        ? state.storageUnitId
        : storageUnits[0]?.id || DEFAULT_STORAGE_UNIT_ID || "";
      if (!selected) {
        setWorkspaceState(citizenId, { selectedInstanceId: "", selectedRoomId: "", rotation: 0, storageUnitId });
        return { state: getWorkspaceState(citizenId), entries, selected: null };
      }
      const location = selected.instance.location || {};
      const selectedRoomId = normalizeToken(location.type) === "HOUSING_ROOM"
        ? normalizeId(location.roomId)
        : state.selectedRoomId;
      const rotation = state.selectedInstanceId === selected.instance.instanceId
        ? state.rotation
        : Number(location.rotation) === 90 ? 90 : 0;
      setWorkspaceState(citizenId, { selectedRoomId, rotation, storageUnitId });
      return { state: getWorkspaceState(citizenId), entries, selected };
    }

    function formatReason(reason = "") {
      const labels = {
        HOUSEHOLD_PLACEMENT_COLLISION: "COLLISION",
        HOUSEHOLD_PLACEMENT_OUTSIDE_ROOM: "OUTSIDE ROOM",
        HOUSEHOLD_ROOM_TYPE_NOT_ALLOWED: "ROOM TYPE BLOCKED",
        HOUSEHOLD_ROOM_TYPE_BLOCKED: "ROOM TYPE BLOCKED",
        ITEM_NOT_HOUSEHOLD_PLACEABLE: "NOT PLACEABLE",
        HOUSEHOLD_ROOM_NOT_FOUND: "ROOM NOT FOUND",
        ITEM_INSTANCE_NOT_FOUND: "ITEM NOT FOUND"
      };
      const token = normalizeToken(reason || "PLACEMENT BLOCKED");
      return labels[token] || token.replace(/_/g, " ");
    }

    function renderReadinessMetric(label = "", ready = false, value = "") {
      return `
        <span class="housing-household-readiness ${ready ? "is-ready" : "is-blocked"}">
          <small>${escapeHtml(label)}</small>
          <b>${escapeHtml(value || (ready ? "READY" : "BLOCKED"))}</b>
        </span>
      `;
    }

    function renderFurnishingEntry(entry = {}, selectedInstanceId = "") {
      const instance = entry.instance || {};
      const profile = entry.profile || {};
      const lifecycle = entry.lifecycle || window.WS_APP.getHousingFurnishingLifecycleProjection?.(instance) || null;
      const location = instance.location || {};
      const active = instance.instanceId === selectedInstanceId;
      const footprint = profile.footprint || { width: 1, height: 1 };
      const locationLabel = entry.scope === "PLACED"
        ? `PLACED / ${normalizeId(location.roomId).replace(/^.*-/, "") || "ROOM"}`
        : `STORAGE / ${normalizeId(location.storageUnitId).replace(/^.*-/, "") || "UNIT"}`;
      const lifecycleLabel = lifecycle
        ? `${lifecycle.ownershipType.replace(/_/g, " ")} / ${lifecycle.grade} / ${Math.round(lifecycle.condition)}%`
        : `${footprint.width}×${footprint.height}`;
      return `
        <button class="housing-household-furnishing-card ${active ? "is-selected" : ""} ${lifecycle ? `is-condition-${escapeHtml(String(lifecycle.conditionState || "operational").toLowerCase())}` : ""}" type="button" data-household-select-item="${escapeHtml(instance.instanceId)}" aria-pressed="${active ? "true" : "false"}">
          <span>
            <b>${escapeHtml(getItemName(instance))}</b>
            <small>${escapeHtml(locationLabel)}</small>
          </span>
          <em>${escapeHtml(lifecycleLabel)}</em>
        </button>
      `;
    }

    function renderFurnishingLibrary(entries = [], state = {}) {
      const search = normalizeId(state.search).toLowerCase();
      const filtered = entries.filter((entry) => {
        if (!search) return true;
        const instance = entry.instance || {};
        const profile = entry.profile || {};
        return [getItemName(instance), instance.definitionId, profile.itemType, profile.category, ...(profile.tags || [])]
          .some((value) => String(value || "").toLowerCase().includes(search));
      });
      const stored = filtered.filter((entry) => entry.scope === "STORAGE");
      const placed = filtered.filter((entry) => entry.scope === "PLACED");
      const renderGroup = (label, rows) => `
        <section class="housing-household-library-group">
          <header><b>${escapeHtml(label)}</b><small>${escapeHtml(rows.length)}</small></header>
          <div>${rows.length ? rows.map((entry) => renderFurnishingEntry(entry, state.selectedInstanceId)).join("") : '<p class="file-empty">No matching items.</p>'}</div>
        </section>
      `;
      return `
        <aside class="housing-household-library">
          <header class="housing-household-library-head">
            <div><p class="kicker">FURNISHING LIBRARY</p><h5>Storage / Placed Items</h5></div>
            <span class="module-status-badge">${escapeHtml(entries.length)} ITEMS</span>
          </header>
          <label class="housing-household-search">
            <span>SEARCH</span>
            <input type="search" value="${escapeHtml(state.search)}" placeholder="NAME / TYPE / TAG" data-household-search>
          </label>
          ${renderGroup("AVAILABLE IN STORAGE", stored)}
          ${renderGroup("PLACED IN UNIT", placed)}
        </aside>
      `;
    }

    function renderSelectionPanel(selected = null, state = {}, record = null) {
      if (!selected) {
        return `
          <section class="housing-household-selection is-empty">
            <p class="kicker">FURNISHING CONTROL</p>
            <h5>Select a furnishing</h5>
            <p>Choose a furniture ItemInstance to inspect placement, ownership, condition, grade, functional slots and lifecycle actions.</p>
          </section>
        `;
      }
      const instance = selected.instance || {};
      const profile = selected.profile || {};
      const lifecycle = selected.lifecycle || window.WS_APP.getHousingFurnishingLifecycleProjection?.(instance, record) || null;
      const footprint = window.WS_APP.getHouseholdItemFootprint?.(instance, state.rotation) || profile.footprint || { width: 1, height: 1, rotation: state.rotation };
      const isPlaced = normalizeToken(instance.location?.type) === "HOUSING_ROOM";
      const storageUnits = Array.isArray(record?.storageUnits) ? record.storageUnits : [];
      const movable = lifecycle ? lifecycle.movable === true : true;
      const moduleSlots = lifecycle?.slots || [];
      const replacementCandidates = lifecycle?.replaceable
        ? (window.WS_APP.getHousingFurnishingReplacementCandidates?.(instance.ownerId, instance.instanceId) || [])
        : [];
      return `
        <section class="housing-household-selection">
          <header>
            <div><p class="kicker">FURNISHING CONTROL</p><h5>${escapeHtml(getItemName(instance))}</h5></div>
            <span class="module-status-badge">${escapeHtml(lifecycle?.conditionState || (isPlaced ? "MOVE MODE" : "PLACE MODE"))}</span>
          </header>
          <div class="housing-household-selection-facts">
            <span><small>FOOTPRINT</small><b>${escapeHtml(`${footprint.width}×${footprint.height}`)}</b></span>
            <span><small>OWNERSHIP</small><b>${escapeHtml((lifecycle?.ownershipType || "CITIZEN_FURNISHING").replace(/_/g, " "))}</b></span>
            <span><small>GRADE</small><b>${escapeHtml(lifecycle?.grade || "—")}</b></span>
            <span><small>CONDITION</small><b>${escapeHtml(lifecycle ? `${Math.round(lifecycle.condition)}% / ${lifecycle.conditionState}` : "—")}</b></span>
            <span><small>WEEKLY WEAR</small><b>${escapeHtml(lifecycle ? `${lifecycle.weeklyWearPercent}%` : "—")}</b></span>
            <span><small>CAPABILITIES</small><b>${escapeHtml((lifecycle?.capabilities || profile.capabilities || []).join(" / ") || "NONE")}</b></span>
          </div>
          <div class="housing-household-selection-actions">
            ${movable ? `<button class="housing-inline-action" type="button" data-household-rotate>ROTATE 90°</button>` : ""}
            <button class="housing-inline-action" type="button" data-household-clear-selection>CLEAR</button>
            ${isPlaced && movable ? `
              <label class="housing-household-return-target">
                <span>RETURN TARGET</span>
                <select data-household-return-storage>
                  ${storageUnits.map((unit) => `<option value="${escapeHtml(unit.id)}" ${unit.id === state.storageUnitId ? "selected" : ""}>${escapeHtml(unit.label || unit.id)}</option>`).join("")}
                </select>
              </label>
              <button class="housing-inline-action" type="button" data-household-return-item="${escapeHtml(instance.instanceId)}">RETURN TO STORAGE</button>
            ` : ""}
            ${lifecycle?.repairable ? `<button class="housing-inline-action" type="button" data-household-repair-item="${escapeHtml(instance.instanceId)}">REPAIR TO 100%</button>` : ""}
            ${lifecycle?.serviceRequired ? `<span class="housing-household-service-required">OPERATOR SERVICE REQUIRED</span>` : ""}
            ${lifecycle?.disposable ? `<button class="housing-inline-action is-danger" type="button" data-household-dispose-item="${escapeHtml(instance.instanceId)}">INCINERATE / +5 ₡</button>` : ""}
          </div>
          ${moduleSlots.length ? `
            <div class="housing-household-lifecycle-section">
              <p class="kicker">FUNCTIONAL SLOTS</p>
              <div class="housing-household-slot-list">
                ${moduleSlots.map((slot) => {
                  if (slot.installedModule) {
                    return `<span class="housing-household-slot"><small>${escapeHtml(slot.slotType)}</small><b>${escapeHtml(getItemName(slot.installedModule))}</b><button type="button" class="housing-inline-action" data-household-remove-module data-parent-instance-id="${escapeHtml(instance.instanceId)}" data-slot-id="${escapeHtml(slot.slotId)}">REMOVE</button></span>`;
                  }
                  const candidates = window.WS_APP.getHousingFurnishingModuleCandidates?.(instance.ownerId, instance.instanceId, slot.slotId) || [];
                  return `<span class="housing-household-slot"><small>${escapeHtml(slot.slotType)}</small><b>EMPTY</b>${candidates.map((candidate) => `<button type="button" class="housing-inline-action" data-household-install-module data-parent-instance-id="${escapeHtml(instance.instanceId)}" data-module-instance-id="${escapeHtml(candidate.instanceId)}" data-slot-id="${escapeHtml(slot.slotId)}">INSTALL ${escapeHtml(getItemName(candidate))}</button>`).join("") || "<em>NO COMPATIBLE MODULE IN STORAGE</em>"}</span>`;
                }).join("")}
              </div>
            </div>
          ` : ""}
          ${replacementCandidates.length ? `
            <div class="housing-household-lifecycle-section">
              <p class="kicker">REPLACE STANDARD</p>
              <div class="housing-household-replacement-list">
                ${replacementCandidates.map((candidate) => `<button type="button" class="housing-inline-action" data-household-replace-item data-current-instance-id="${escapeHtml(instance.instanceId)}" data-replacement-instance-id="${escapeHtml(candidate.instanceId)}">REPLACE WITH ${escapeHtml(getItemName(candidate))}</button>`).join("")}
              </div>
            </div>
          ` : ""}
          <p class="housing-household-placement-hint" data-household-preview-status>${movable ? "Hover a room cell to preview placement. Click a valid cell to commit." : "Operator fixture is lifecycle-managed and cannot be moved by the Citizen."}</p>
        </section>
      `;
    }

    function parseCellKey(value = "") {
      const match = String(value || "").trim().match(/^(\d+):(\d+)$/);
      return match ? { column: Number(match[1]), row: Number(match[2]) } : null;
    }

    function buildRoomCellIndex(household = {}) {
      const index = new Map();
      (household.rooms || []).forEach((room) => {
        const activeCells = Array.isArray(room.activeCells) && room.activeCells.length
          ? room.activeCells
          : (() => {
            const cells = [];
            for (let row = room.bounds.row; row < room.bounds.row + room.bounds.height; row += 1) {
              for (let column = room.bounds.column; column < room.bounds.column + room.bounds.width; column += 1) cells.push(`${column}:${row}`);
            }
            return cells;
          })();
        activeCells.forEach((cell) => index.set(String(cell), room));
      });
      return index;
    }

    function renderFloorItem(entry = {}, selectedInstanceId = "") {
      const instance = entry.instance || entry;
      const location = instance.location || {};
      const footprint = window.WS_APP.getHouseholdItemFootprint?.(instance, location.rotation) || { width: 1, height: 1 };
      return `
        <button class="housing-household-room-item ${instance.instanceId === selectedInstanceId ? "is-selected" : ""}" type="button"
          data-household-select-item="${escapeHtml(instance.instanceId)}"
          style="grid-column:${escapeHtml(location.gridX || 1)} / span ${escapeHtml(footprint.width)};grid-row:${escapeHtml(location.gridY || 1)} / span ${escapeHtml(footprint.height)}">
          <b>${escapeHtml(getItemName(instance))}</b>
          <small>${escapeHtml(`${footprint.width}×${footprint.height} / ${Number(location.rotation) === 90 ? 90 : 0}°`)}</small>
        </button>
      `;
    }

    function renderFloorPlan(household = {}, placedEntries = [], selectedInstanceId = "") {
      const roomByCell = buildRoomCellIndex(household);
      const activeCells = new Set(household.floorPlan?.activeCells || [...roomByCell.keys()]);
      const cells = [];
      for (let row = 1; row <= household.floorPlan.height; row += 1) {
        for (let column = 1; column <= household.floorPlan.width; column += 1) {
          const key = `${column}:${row}`;
          const room = roomByCell.get(key) || null;
          if (!activeCells.has(key) || !room) {
            cells.push(`<span class="housing-household-floor-cell is-inactive" aria-hidden="true" style="grid-column:${column};grid-row:${row}"></span>`);
            continue;
          }
          const roomClass = String(room.type || "room").toLowerCase().replace(/_/g, "-");
          cells.push(`<button class="housing-household-floor-cell is-active is-${escapeHtml(roomClass)}" type="button" aria-label="${escapeHtml(`${room.label}, column ${column}, row ${row}`)}" title="${escapeHtml(room.label)}" data-household-cell data-room-id="${escapeHtml(room.id)}" data-grid-x="${column}" data-grid-y="${row}" style="grid-column:${column};grid-row:${row}"></button>`);
        }
      }
      const legend = (household.rooms || []).map((room) => `<span class="is-${escapeHtml(String(room.type || "room").toLowerCase().replace(/_/g, "-"))}"><b>${escapeHtml(room.label)}</b><small>${escapeHtml(room.type.replace(/_/g, " "))}</small></span>`).join("");
      return `
        <div class="housing-household-room-legend">${legend}</div>
        <div class="housing-household-floor" data-household-floor style="--household-floor-columns:${escapeHtml(household.floorPlan.width)};--household-floor-rows:${escapeHtml(household.floorPlan.height)}">
          ${cells.join("")}
          ${placedEntries.map((entry) => renderFloorItem(entry, selectedInstanceId)).join("")}
          <div class="housing-household-room-preview" data-household-preview hidden><b>PREVIEW</b><small></small></div>
        </div>
      `;
    }

    function renderHousingHouseholdTab(citizen = {}) {
      const { record: activeRecord } = getActiveContext(citizen);
      if (!activeRecord) {
        return '<section class="housing-module-panel housing-household-empty"><p class="file-empty">Household requires an active Housing record.</p></section>';
      }
      const household = window.WS_APP.getHousingHousehold?.(citizen.id, activeRecord.id) || null;
      if (!household) {
        return '<section class="housing-module-panel housing-household-empty"><p class="file-empty">Household projection API is unavailable.</p></section>';
      }
      const safeSpace = window.WS_APP.getHouseholdSafeSpaceProfile?.(citizen.id, activeRecord.id) || { ready: false, capabilities: [] };
      const workspace = ensureWorkspaceSelection(citizen.id, activeRecord.id, activeRecord);
      const state = workspace.state;
      const selected = workspace.selected;
      const placedEntries = workspace.entries.filter((entry) => entry.scope === "PLACED" && entry.lifecycle?.nonBlocking !== true);
      const operations = ["REST", "SLEEP", "USE_CONSUMABLE", "USE_MEDICAL_CONSUMABLE"].map((operationType) => ({
        operationType,
        result: window.WS_APP.resolveHouseholdOperationReadiness?.({ citizenId: citizen.id, housingRecordId: activeRecord.id, operationType }) || { ok: false, reason: "HOUSEHOLD_API_UNAVAILABLE" }
      }));
      return `
        <div class="housing-household-tab" data-household-workspace data-housing-record-id="${escapeHtml(activeRecord.id)}">
          ${typeof renderHousingFeedback === "function" ? renderHousingFeedback(citizen.id) : ""}
          <section class="housing-module-panel housing-household-summary">
            <header class="housing-module-panel-head">
              <div><p class="kicker">HOUSEHOLD / FURNISHING WORKSPACE</p><h5>${escapeHtml(activeRecord.title)}</h5><small>Place, rotate, move and return canonical ItemInstances without creating a second furniture inventory.</small></div>
              <span class="module-status-badge">${escapeHtml(safeSpace.ready ? "SAFE SPACE READY" : "SAFE SPACE BLOCKED")}</span>
            </header>
            <div class="housing-household-readiness-rail">
              ${renderReadinessMetric("ACCESS", safeSpace.accessReady, safeSpace.accessReady ? "READY" : "BLOCKED")}
              ${renderReadinessMetric("UTILITIES", safeSpace.utilitiesReady, safeSpace.utilitiesReady ? "READY" : "BLOCKED")}
              ${renderReadinessMetric("MAINTENANCE", safeSpace.maintenanceReady, safeSpace.maintenanceReady ? "NOMINAL" : "BLOCKED")}
              ${renderReadinessMetric("RECOVERY", safeSpace.recoveryReady, safeSpace.recoveryReady ? "CONTRACT READY" : "BLOCKED")}
              ${renderReadinessMetric("CONSUMABLES", safeSpace.consumableUseReady, safeSpace.consumableUseReady ? "CONTRACT READY" : "BLOCKED")}
            </div>
            <div class="housing-household-stat-grid">
              ${renderHousingMetric("FLOOR PLAN", `${household.floorPlan.width} × ${household.floorPlan.height}`)}
              ${renderHousingMetric("ACTIVE CELLS", household.floorPlan.activeCells?.length || 0)}
              ${renderHousingMetric("AREA", `${household.areaM2 ?? activeRecord.areaM2 ?? "—"} m²`)}
              ${renderHousingMetric("LAYOUT", household.variantFamily || "LEGACY")}
              ${renderHousingMetric("ROOMS", household.rooms.length)}
              ${renderHousingMetric("FURNISHINGS", workspace.entries.length)}
              ${renderHousingMetric("PLACED", placedEntries.length)}
              ${renderHousingMetric("SECURITY", safeSpace.securityLevel ?? activeRecord.securityLevel ?? 0)}
              ${renderHousingMetric("COMFORT", safeSpace.comfortLevel ?? activeRecord.comfortLevel ?? 0)}
            </div>
          </section>

          <div class="housing-household-workspace-layout">
            ${renderFurnishingLibrary(workspace.entries, state)}
            <main class="housing-household-plan-workspace">
              ${renderSelectionPanel(selected, state, activeRecord)}
              <section class="housing-module-panel housing-household-floor-panel">
                <header class="housing-module-panel-head">
                  <div><p class="kicker">UNIT FLOOR PLAN</p><h5>Placement Grid</h5></div>
                  <span class="module-status-badge">${escapeHtml(selected ? "PLACEMENT ACTIVE" : "SELECT ITEM")}</span>
                </header>
                ${renderFloorPlan(household, placedEntries, state.selectedInstanceId)}
              </section>
            </main>
          </div>

          <section class="housing-module-panel housing-household-operation-panel">
            <header class="housing-module-panel-head"><div><p class="kicker">HOUSEHOLD OPERATIONS</p><h5>Recovery and Consumable Contract Readiness</h5></div><span class="module-status-badge">READ ONLY</span></header>
            <div class="housing-household-operation-grid">
              ${operations.map(({ operationType, result }) => `
                <span class="housing-household-operation ${result.ok ? "is-ready" : "is-blocked"}">
                  <small>${escapeHtml(operationType.replace(/_/g, " "))}</small>
                  <b>${escapeHtml(result.ok ? "READY" : formatReason(result.reason || "BLOCKED"))}</b>
                  <em>${escapeHtml(result.executionOwner || "HOUSEHOLD FOUNDATION")}</em>
                </span>
              `).join("")}
            </div>
          </section>
        </div>
      `;
    }

    function findWorkspaceContext(root, citizenId = "") {
      const workspace = root?.querySelector?.("[data-household-workspace]") || null;
      return {
        workspace,
        citizenId: normalizeId(citizenId),
        housingRecordId: normalizeId(workspace?.getAttribute?.("data-housing-record-id"))
      };
    }

    function clearPreview(root) {
      root?.querySelectorAll?.("[data-household-preview]").forEach((preview) => {
        preview.hidden = true;
        preview.classList.remove("is-valid", "is-invalid");
      });
    }

    function updatePreviewStatus(root, message = "", valid = null) {
      const node = root?.querySelector?.("[data-household-preview-status]");
      if (!node) return;
      node.textContent = message || "Hover a room cell to preview placement. Click a valid cell to commit.";
      node.classList.toggle("is-valid", valid === true);
      node.classList.toggle("is-invalid", valid === false);
    }

    function previewCell(cell, context = {}) {
      if (!cell || !context.root) return false;
      const { citizenId, housingRecordId } = findWorkspaceContext(context.root, context.citizenId);
      const state = getWorkspaceState(citizenId);
      if (!state.selectedInstanceId || !housingRecordId) return false;
      const roomId = normalizeId(cell.getAttribute("data-room-id"));
      const gridX = Number(cell.getAttribute("data-grid-x") || 1);
      const gridY = Number(cell.getAttribute("data-grid-y") || 1);
      const previewKey = `${state.selectedInstanceId}:${roomId}:${gridX}:${gridY}:${state.rotation}`;
      const preview = context.root?.querySelector?.("[data-household-preview]") || null;
      if (cell.getAttribute("data-household-preview-key") === previewKey && preview && preview.hidden === false) return true;
      const result = window.WS_APP.validateHouseholdPlacement?.({
        citizenId,
        housingRecordId,
        roomId,
        instanceId: state.selectedInstanceId,
        gridX,
        gridY,
        rotation: state.rotation
      }) || { ok: false, reason: "HOUSEHOLD_PLACEMENT_API_REQUIRED", footprint: { width: 1, height: 1 } };
      clearPreview(context.root);
      cell.setAttribute("data-household-preview-key", previewKey);
      if (!preview) return true;
      const footprint = result.footprint || window.WS_APP.getHouseholdItemFootprint?.(window.WS_APP.getItemInstanceById?.(state.selectedInstanceId) || {}, state.rotation) || { width: 1, height: 1 };
      preview.hidden = false;
      preview.style.gridColumn = `${gridX} / span ${footprint.width}`;
      preview.style.gridRow = `${gridY} / span ${footprint.height}`;
      preview.classList.toggle("is-valid", result.ok === true);
      preview.classList.toggle("is-invalid", result.ok !== true);
      preview.querySelector("b").textContent = result.ok ? "PLACE" : "BLOCKED";
      preview.querySelector("small").textContent = result.ok ? `${gridX}:${gridY} / ${state.rotation}°` : formatReason(result.reason);
      updatePreviewStatus(context.root, result.ok ? `Valid placement at C${gridX} R${gridY}.` : formatReason(result.reason), result.ok === true);
      return true;
    }

    function handleHousingHouseholdPointerMove(event, context = {}) {
      const cell = event?.target?.closest?.("[data-household-cell]");
      if (!cell) return false;
      return previewCell(cell, context);
    }

    function handleHousingHouseholdPointerLeave(event, context = {}) {
      if (!context.root) return false;
      if (event?.relatedTarget && context.root.contains?.(event.relatedTarget)) return false;
      clearPreview(context.root);
      updatePreviewStatus(context.root);
      return true;
    }

    function handleHousingHouseholdInput(event, context = {}) {
      const search = event?.target?.closest?.("[data-household-search]");
      if (!search) return false;
      const citizenId = normalizeId(context.citizenId);
      window.clearTimeout(window.WS_APP.housingHouseholdSearchDebounce);
      window.WS_APP.housingHouseholdSearchDebounce = window.setTimeout(() => {
        setWorkspaceState(citizenId, { search: String(search.value || "") });
        renderHousingModule(context.user || window.WS_APP.currentUser);
      }, 120);
      return true;
    }

    function handleHousingHouseholdChange(event, context = {}) {
      const storage = event?.target?.closest?.("[data-household-return-storage]");
      if (!storage) return false;
      setWorkspaceState(context.citizenId, { storageUnitId: String(storage.value || "") });
      return true;
    }

    function nextIdempotencyKey(prefix = "household") {
      commandSequence += 1;
      return `${prefix}:${Date.now()}:${commandSequence}`;
    }

    function commitCellPlacement(cell, context = {}) {
      const { citizenId, housingRecordId } = findWorkspaceContext(context.root, context.citizenId);
      const state = getWorkspaceState(citizenId);
      if (!state.selectedInstanceId) return false;
      const roomId = normalizeId(cell.getAttribute("data-room-id"));
      const gridX = Number(cell.getAttribute("data-grid-x") || 1);
      const gridY = Number(cell.getAttribute("data-grid-y") || 1);
      const validation = window.WS_APP.validateHouseholdPlacement?.({ citizenId, housingRecordId, roomId, instanceId: state.selectedInstanceId, gridX, gridY, rotation: state.rotation });
      if (!validation?.ok) {
        setHousingFeedback?.(citizenId, `Placement blocked: ${formatReason(validation?.reason)}.`, "ERROR");
        updatePreviewStatus(context.root, formatReason(validation?.reason), false);
        return true;
      }
      const result = window.WS_APP.placeHouseholdItem?.({
        citizenId,
        housingRecordId,
        roomId,
        instanceId: state.selectedInstanceId,
        gridX,
        gridY,
        rotation: state.rotation,
        idempotencyKey: nextIdempotencyKey(`household:place:${state.selectedInstanceId}`)
      });
      if (result?.ok) {
        setWorkspaceState(citizenId, { selectedRoomId: roomId });
        setHousingFeedback?.(citizenId, "Household placement updated.", "OK");
      } else {
        setHousingFeedback?.(citizenId, `Household placement failed: ${formatReason(result?.reason || result?.code)}.`, "ERROR");
      }
      renderHousingModule(context.user || window.WS_APP.currentUser);
      return true;
    }

    function handleHousingHouseholdClick(event, context = {}) {
      const target = event?.target;
      if (!target?.closest?.("[data-household-workspace]")) return false;
      const citizenId = normalizeId(context.citizenId);
      const select = target.closest("[data-household-select-item]");
      if (select) {
        const instanceId = normalizeId(select.getAttribute("data-household-select-item"));
        const instance = window.WS_APP.getItemInstanceById?.(instanceId) || null;
        setWorkspaceState(citizenId, {
          selectedInstanceId: instanceId,
          selectedRoomId: normalizeId(instance?.location?.roomId),
          rotation: Number(instance?.location?.rotation) === 90 ? 90 : 0
        });
        setHousingFeedback?.(citizenId, "Furnishing selected. Choose a room cell.", "INFO");
        renderHousingModule(context.user || window.WS_APP.currentUser);
        return true;
      }
      if (target.closest("[data-household-rotate]")) {
        const state = getWorkspaceState(citizenId);
        if (state.selectedInstanceId) setWorkspaceState(citizenId, { rotation: state.rotation === 90 ? 0 : 90 });
        renderHousingModule(context.user || window.WS_APP.currentUser);
        return true;
      }
      if (target.closest("[data-household-clear-selection]")) {
        setWorkspaceState(citizenId, { selectedInstanceId: "", selectedRoomId: "", rotation: 0 });
        setHousingFeedback?.(citizenId, "", "INFO");
        renderHousingModule(context.user || window.WS_APP.currentUser);
        return true;
      }
      const returnButton = target.closest("[data-household-return-item]");
      if (returnButton) {
        const state = getWorkspaceState(citizenId);
        const instanceId = normalizeId(returnButton.getAttribute("data-household-return-item"));
        const result = window.WS_APP.returnHouseholdItemToStorage?.({
          citizenId,
          instanceId,
          storageUnitId: state.storageUnitId || DEFAULT_STORAGE_UNIT_ID,
          idempotencyKey: nextIdempotencyKey(`household:return:${instanceId}`)
        });
        if (result?.ok) {
          setWorkspaceState(citizenId, { selectedInstanceId: "", selectedRoomId: "", rotation: 0 });
          setHousingFeedback?.(citizenId, "Furnishing returned to Housing Storage.", "OK");
        } else {
          setHousingFeedback?.(citizenId, `Return failed: ${formatReason(result?.reason || result?.code)}.`, "ERROR");
        }
        renderHousingModule(context.user || window.WS_APP.currentUser);
        return true;
      }
      const installModule = target.closest("[data-household-install-module]");
      if (installModule) {
        const result = window.WS_APP.installHousingFurnishingModule?.({
          citizenId,
          parentInstanceId: normalizeId(installModule.getAttribute("data-parent-instance-id")),
          moduleInstanceId: normalizeId(installModule.getAttribute("data-module-instance-id")),
          slotId: normalizeId(installModule.getAttribute("data-slot-id")),
          idempotencyKey: nextIdempotencyKey("household:module-install")
        });
        setHousingFeedback?.(citizenId, result?.ok ? "Furnishing module installed." : `Module install failed: ${formatReason(result?.reason)}.`, result?.ok ? "OK" : "ERROR");
        renderHousingModule(context.user || window.WS_APP.currentUser);
        return true;
      }
      const removeModule = target.closest("[data-household-remove-module]");
      if (removeModule) {
        const result = window.WS_APP.removeHousingFurnishingModule?.({
          citizenId,
          housingRecordId: findWorkspaceContext(context.root, citizenId).housingRecordId,
          parentInstanceId: normalizeId(removeModule.getAttribute("data-parent-instance-id")),
          slotId: normalizeId(removeModule.getAttribute("data-slot-id")),
          idempotencyKey: nextIdempotencyKey("household:module-remove")
        });
        setHousingFeedback?.(citizenId, result?.ok ? "Furnishing module returned to storage." : `Module removal failed: ${formatReason(result?.reason)}.`, result?.ok ? "OK" : "ERROR");
        renderHousingModule(context.user || window.WS_APP.currentUser);
        return true;
      }
      const repairItem = target.closest("[data-household-repair-item]");
      if (repairItem) {
        const result = window.WS_APP.repairHousingFurnishing?.({ citizenId, instanceId: normalizeId(repairItem.getAttribute("data-household-repair-item")), idempotencyKey: nextIdempotencyKey("household:repair") });
        setHousingFeedback?.(citizenId, result?.ok ? "Furnishing restored to full condition." : `Repair failed: ${formatReason(result?.reason)}.`, result?.ok ? "OK" : "ERROR");
        renderHousingModule(context.user || window.WS_APP.currentUser);
        return true;
      }
      const replaceItem = target.closest("[data-household-replace-item]");
      if (replaceItem) {
        const result = window.WS_APP.replaceHousingFurnishing?.({
          citizenId,
          currentInstanceId: normalizeId(replaceItem.getAttribute("data-current-instance-id")),
          replacementInstanceId: normalizeId(replaceItem.getAttribute("data-replacement-instance-id")),
          idempotencyKey: nextIdempotencyKey("household:replace")
        });
        if (result?.ok) setWorkspaceState(citizenId, { selectedInstanceId: normalizeId(replaceItem.getAttribute("data-replacement-instance-id")) });
        setHousingFeedback?.(citizenId, result?.ok ? "Furnishing standard replaced." : `Replacement failed: ${formatReason(result?.reason)}.`, result?.ok ? "OK" : "ERROR");
        renderHousingModule(context.user || window.WS_APP.currentUser);
        return true;
      }
      const disposeItem = target.closest("[data-household-dispose-item]");
      if (disposeItem) {
        const result = window.WS_APP.disposeHousingFurnishing?.({ citizenId, instanceId: normalizeId(disposeItem.getAttribute("data-household-dispose-item")), idempotencyKey: nextIdempotencyKey("household:dispose") });
        if (result?.ok) setWorkspaceState(citizenId, { selectedInstanceId: "", selectedRoomId: "", rotation: 0 });
        setHousingFeedback?.(citizenId, result?.ok ? `Furnishing incinerated. ${result.creditValue || 5} ₡ credited.` : `Disposal failed: ${formatReason(result?.reason)}.`, result?.ok ? "OK" : "ERROR");
        renderHousingModule(context.user || window.WS_APP.currentUser);
        return true;
      }
      const cell = target.closest("[data-household-cell]");
      if (cell) return commitCellPlacement(cell, context);
      return false;
    }

    return {
      getWorkspaceState,
      setWorkspaceState,
      getFurnishingItems,
      renderHousingHouseholdTab,
      handleHousingHouseholdPointerMove,
      handleHousingHouseholdPointerLeave,
      handleHousingHouseholdInput,
      handleHousingHouseholdChange,
      handleHousingHouseholdClick
    };
  };
})();
