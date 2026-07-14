window.WS_APP = window.WS_APP || {};

(function initEquipmentContainersPanel() {
  const EQUIPMENT_CONTAINERS_PANEL_VERSION = "5.3.3x";
  const escapeHtml = window.WS_APP.escapeEquipmentHtml || ((value = "") => String(value ?? ""));

  function formatRegionLabel(value = "") {
    if (typeof window.WS_APP.formatEquipmentRegionLabel === "function") return window.WS_APP.formatEquipmentRegionLabel(value);
    return String(value || "").trim().replace(/[_-]+/g, " ").toUpperCase();
  }

  function formatContainerTypeLabel(value = "") {
    if (typeof window.WS_APP.formatEquipmentContainerTypeLabel === "function") return window.WS_APP.formatEquipmentContainerTypeLabel(value);
    const token = String(value || "").trim().replace(/[_-]+/g, " ").toUpperCase();
    return token === "MASS COMPRESSION CUBE" ? "C-CUBE" : token || "CONTAINER";
  }

  function getItemTypeLabel(item = {}) {
    if (typeof window.WS_APP.getEquipmentItemTypeLabel === "function") return window.WS_APP.getEquipmentItemTypeLabel(item);
    return [item.category, item.subtype].map((entry) => String(entry || "").trim().replace(/[_-]+/g, " ").toUpperCase()).filter(Boolean).join(" / ") || "ITEM";
  }

  function getGridItemDisplayName(item = {}) {
    if (typeof window.WS_APP.getItemInstanceDisplayName === "function") {
      return window.WS_APP.getItemInstanceDisplayName(item);
    }
    return String(item.playerLabel || item.displayName || item.name || item.catalogName || item.id || "Grid item").trim() || "Grid item";
  }

  function formatGridItemSize(footprint = {}) {
    return `${Math.max(1, Number(footprint.width || 1))}×${Math.max(1, Number(footprint.height || 1))}`;
  }

  function getGridItemsForContainer(state = {}, containerId = "") {
    if (typeof window.WS_APP.getEquipmentGridItemsForContainer === "function") {
      return window.WS_APP.getEquipmentGridItemsForContainer(state, containerId);
    }
    const gridItems = Array.isArray(state?.inventory?.gridItems) ? state.inventory.gridItems : [];
    return gridItems.filter((item) => String(item.containerHostId || "") === String(containerId || ""));
  }

  function getCapacity(state = {}, container = {}) {
    if (typeof window.WS_APP.getEquipmentContainerCapacityStatus === "function") {
      return window.WS_APP.getEquipmentContainerCapacityStatus(state, container.id, { state, container });
    }
    const gridItems = getGridItemsForContainer(state, container.id);
    const slotCapacity = Number(container?.containerProfile?.slotCapacity || 0);
    return {
      slotCapacity,
      usedSlots: gridItems.reduce((sum, item) => sum + Number(item.slots || 1), 0),
      freeSlots: Math.max(0, slotCapacity - gridItems.length),
      gridItemCount: gridItems.length,
      overCapacity: false
    };
  }

  function getSelectedContainerId(state = {}) {
    return String(state?.selections?.selectedContainerId || "").trim();
  }

  function getInspectedContainerId(state = {}) {
    return String(state?.selections?.inspectedContainerId || "").trim();
  }

  function getSelectedContainer(state = {}) {
    const id = getInspectedContainerId(state);
    const containers = Array.isArray(state?.containers?.all) ? state.containers.all : [];
    return id ? containers.find((container) => String(container.id || "") === id) || null : null;
  }

  function getSelectedContainerItem(state = {}, container = {}) {
    const selectedItemId = String(state?.selections?.selectedItemId || "").trim();
    const item = selectedItemId ? state?.itemById?.[selectedItemId] || null : null;
    return item?.isInGrid && String(item.containerHostId || "") === String(container?.id || "") ? item : null;
  }

  function getContainerStatusLabel(container = {}) {
    if (container.isStored) return "HOUSING";
    if (container.isEquipped) return "WORN";
    if (container.isInGrid) return "NESTED";
    return "INVALID";
  }

  function getGridModel(state = {}, container = {}, options = {}) {
    if (options.gridModel) return options.gridModel;
    if (typeof window.WS_APP.getEquipmentContainerGridModel === "function") {
      return window.WS_APP.getEquipmentContainerGridModel(state, container.id, { container, capacity: options.capacity });
    }
    const capacity = options.capacity || getCapacity(state, container);
    return {
      container,
      capacity,
      grid: { columns: 0, rows: 0, slotCapacity: capacity.slotCapacity || 0, visualCells: 0, hasGrid: false },
      entries: [],
      occupancy: [],
      hasUnplacedItems: false
    };
  }

  function getGridSizeClass(grid = {}) {
    const slots = Number(grid.slotCapacity || 0);
    if (slots <= 0) return "equipment-container-grid--none";
    if (slots <= 6) return "equipment-container-grid--compact";
    if (slots <= 12) return "equipment-container-grid--medium";
    return "equipment-container-grid--large";
  }

  function getGridCellSize(grid = {}) {
    const columns = Math.max(1, Number(grid.columns || 1));
    if (columns <= 3) return 54;
    if (columns <= 4) return 48;
    if (columns <= 6) return 38;
    if (columns <= 8) return 38;
    return 32;
  }

  function isStandardBeltGrid(container = {}, model = {}) {
    const profile = model?.capacity?.containerProfile || container?.containerProfile || {};
    const grid = model?.grid || {};
    const firstRule = typeof window.WS_APP.getEquipmentContainerCellRule === "function"
      ? window.WS_APP.getEquipmentContainerCellRule(profile, 1, 1)
      : Array.isArray(profile.cellRules)
        ? profile.cellRules.find((rule) => Number(rule?.column || 0) === 1 && Number(rule?.row || 0) === 1) || null
        : null;
    return String(container?.subtype || "").trim().toUpperCase() === "BELT"
      && profile.isolatedCells === true
      && Number(grid.columns || profile.gridColumns || 0) === 3
      && Number(grid.rows || profile.gridRows || 0) === 1
      && String(firstRule?.key || "").trim().toUpperCase() === "HOLSTER_OR_TOOL";
  }

  function getBeltCellPresentation(column = 0) {
    if (Number(column || 0) === 1) return { role: "mount", label: "HOLSTER" };
    return { role: "utility", label: "" };
  }

  function getContainedItemPlacementLabel(item = {}, container = {}) {
    const placement = item?.containerPlacement && typeof item.containerPlacement === "object" ? item.containerPlacement : {};
    const column = Number(placement.column || 0);
    const row = Number(placement.row || 0);
    const profile = container?.containerProfile || {};
    const rule = typeof window.WS_APP.getEquipmentContainerCellRule === "function"
      ? window.WS_APP.getEquipmentContainerCellRule(profile, column, row)
      : null;
    const label = String(rule?.label || "").trim();
    const key = String(rule?.key || "").trim().toUpperCase();
    if (label) return formatRegionLabel(label);
    if (key === "HOLSTER_OR_TOOL") return "HOLSTER";
    if (String(container?.subtype || "").trim().toUpperCase() === "BELT"
      && profile.isolatedCells === true
      && Number(profile.gridColumns || 0) === 3
      && Number(profile.gridRows || 0) === 1
      && column === 1
      && row === 1) {
      return "HOLSTER";
    }
    return "GRID";
  }

  function renderContainerGridItem(entry = {}, selectedItemId = "", containerId = "", state = {}) {
    const item = entry.item || {};
    const footprint = entry.footprint || { width: 1, height: 1, rotation: 0 };
    const placement = entry.placement;
    if (!placement) return "";
    const selected = String(item.id || "") === String(selectedItemId || "");
    const tooltip = typeof window.WS_APP.renderEquipmentItemTooltipAttributes === "function"
      ? window.WS_APP.renderEquipmentItemTooltipAttributes(item, state)
      : "";
    const itemClass = [
      selected ? "is-selected" : "",
      entry.persistent ? "is-persistent" : "is-derived",
      Number(footprint.height || 1) === 1 ? "is-single-row" : "",
      Number(footprint.width || 1) >= 2 ? "is-wide" : ""
    ].filter(Boolean).join(" ");
    return `
      <button class="equipment-container-grid__item ${itemClass}" type="button"
        data-equipment-select-container-item="${escapeHtml(item.id || "")}"
        data-equipment-grid-drag-item="${escapeHtml(item.id || "")}"
        data-equipment-container-id="${escapeHtml(containerId || "")}"
        data-equipment-grid-rotation="${escapeHtml(footprint.rotation)}"
        data-equipment-grid-column="${escapeHtml(placement.column)}"
        data-equipment-grid-row="${escapeHtml(placement.row)}"
        data-equipment-grid-width="${escapeHtml(footprint.width)}"
        data-equipment-grid-height="${escapeHtml(footprint.height)}"
        style="grid-column:${escapeHtml(placement.column)} / span ${escapeHtml(footprint.width)};grid-row:${escapeHtml(placement.row)} / span ${escapeHtml(footprint.height)};"
        aria-label="Select or drag ${escapeHtml(getGridItemDisplayName(item))}" aria-grabbed="false"
        ${tooltip}>
        <b>${escapeHtml(getGridItemDisplayName(item))}</b>
        <small>${escapeHtml(formatGridItemSize(footprint))}</small>
      </button>
    `;
  }

  function renderContainerGridCells(container = {}, model = {}) {
    const grid = model.grid || {};
    const columns = Math.max(1, Number(grid.columns || 1));
    const totalCells = Math.max(0, Math.min(Number(grid.visualCells || 0), Number(grid.slotCapacity || 0)));
    const beltLayout = isStandardBeltGrid(container, model);
    const cells = [];
    for (let index = 0; index < totalCells; index += 1) {
      const column = (index % columns) + 1;
      const row = Math.floor(index / columns) + 1;
      const occupiedBy = String(model.occupancy?.[row - 1]?.[column - 1] || "");
      const rule = typeof window.WS_APP.getEquipmentContainerCellRule === "function"
        ? window.WS_APP.getEquipmentContainerCellRule(model.capacity?.containerProfile || container.containerProfile || {}, column, row)
        : null;
      const beltCell = beltLayout ? getBeltCellPresentation(column) : null;
      const ruleClass = beltCell
        ? beltCell.role === "mount" ? "is-dedicated is-belt-mount" : "is-utility"
        : rule ? "is-dedicated" : "is-utility";
      const ruleLabel = beltCell?.label || (rule ? String(rule.label || rule.key || "DEDICATED") : "");
      const ariaLabel = ruleLabel || `Storage cell ${column}, ${row}`;
      cells.push(`<span class="equipment-container-grid__cell ${ruleClass} ${occupiedBy ? "is-used" : ""}" data-equipment-grid-cell data-equipment-grid-container="${escapeHtml(container.id || "")}" data-equipment-grid-column="${column}" data-equipment-grid-row="${row}" style="grid-column:${column};grid-row:${row};" aria-label="${escapeHtml(ariaLabel)}">${ruleLabel ? `<small>${escapeHtml(ruleLabel)}</small>` : ""}</span>`);
    }
    return cells.join("");
  }

  function renderGridActionBar(state = {}, container = {}, model = {}, selectedItem = null) {
    const entry = selectedItem ? model.entries.find((candidate) => String(candidate.item?.id || "") === String(selectedItem.id || "")) : null;
    const currentRotation = entry?.footprint?.rotation || selectedItem?.containerPlacement?.rotation || 0;
    const baseFootprint = selectedItem && typeof window.WS_APP.getEquipmentItemGridFootprint === "function"
      ? window.WS_APP.getEquipmentItemGridFootprint(selectedItem, 0)
      : selectedItem ? { baseWidth: selectedItem.width || 1, baseHeight: selectedItem.height || 1 } : null;
    const mounted = Boolean(entry?.footprint?.mounted);
    const symmetric = mounted || (Boolean(baseFootprint) && Number(baseFootprint.baseWidth || 1) === Number(baseFootprint.baseHeight || 1));
    const nextRotation = currentRotation === 90 ? 0 : 90;
    const rotateTarget = selectedItem && !symmetric && typeof window.WS_APP.findFirstEquipmentContainerPlacement === "function"
      ? window.WS_APP.findFirstEquipmentContainerPlacement(state, selectedItem.id, container.id, nextRotation)
      : null;
    const canRotate = Boolean(selectedItem && rotateTarget);
    const canSort = Boolean(model.grid?.hasGrid && model.entries.length >= 2);
    return `
      <div class="equipment-container-grid-actions" data-equipment-grid-actions="${escapeHtml(container.id || "")}">
        <button class="secondary-action is-compact" type="button" data-equipment-grid-rotate-item="${escapeHtml(selectedItem?.id || "")}" data-equipment-grid-container="${escapeHtml(container.id || "")}" ${canRotate ? "" : "disabled"}
          title="${escapeHtml(!selectedItem ? "Select an item in this grid." : mounted ? "Dedicated mounts do not rotate." : symmetric ? "Symmetric footprint." : canRotate ? "Rotate selected item." : "Rotated footprint does not fit.")}">Rotate</button>
        <button class="secondary-action is-compact" type="button" data-equipment-grid-sort-container="${escapeHtml(container.id || "")}" ${canSort ? "" : "disabled"}
          title="${escapeHtml(canSort ? "Sort this grid from the upper-left corner." : model.entries.length < 2 ? "At least two items are required." : "Container grid is unavailable.")}">Sort</button>
      </div>
    `;
  }

  function renderSelectedContainerGrid(state = {}, container = {}, options = {}) {
    if (!container) return "";
    const capacity = options.capacity || getCapacity(state, container);
    const model = getGridModel(state, container, { ...options, capacity });
    const grid = model.grid || {};
    const gridItems = getGridItemsForContainer(state, container.id);
    const selectedItem = getSelectedContainerItem(state, container);
    if (!grid.hasGrid) return "";
    const cellSize = getGridCellSize(grid);
    const beltLayout = isStandardBeltGrid(container, model);
    return `
      <div class="equipment-container-grid-panel ${beltLayout ? "is-belt-layout" : ""}" data-equipment-container-grid="${escapeHtml(container.id || "")}">
        <div class="equipment-container-grid ${getGridSizeClass(grid)} ${beltLayout ? "equipment-container-grid--belt" : ""} ${model.hasUnplacedItems ? "has-overflow" : ""}"
          style="--equipment-container-grid-cols:${escapeHtml(grid.columns)};--equipment-container-grid-rows:${escapeHtml(grid.rows)};--equipment-container-grid-cell-size:${escapeHtml(cellSize)}px;"
          data-equipment-container-grid-cells="${escapeHtml(grid.slotCapacity)}"
          data-equipment-grid-columns="${escapeHtml(grid.columns)}"
          data-equipment-grid-rows="${escapeHtml(grid.rows)}">
          ${renderContainerGridCells(container, model)}
          ${model.entries.map((entry) => renderContainerGridItem(entry, selectedItem?.id || "", container.id, state)).join("")}
          ${!gridItems.length && !beltLayout ? `<div class="equipment-container-grid__empty" aria-hidden="true"><b>EMPTY</b></div>` : ""}
        </div>
        ${model.hasUnplacedItems ? `<p class="equipment-container-grid-warning">Invalid placement metadata detected.</p>` : ""}
        ${renderGridActionBar(state, container, model, selectedItem)}
      </div>
    `;
  }

  function renderContainerRow(state = {}, container = {}) {
    const selected = getSelectedContainerId(state) === String(container.id || "");
    const capacity = getCapacity(state, container);
    const tooltip = typeof window.WS_APP.renderEquipmentItemTooltipAttributes === "function"
      ? window.WS_APP.renderEquipmentItemTooltipAttributes(container, state)
      : "";
    return `
      <button class="equipment-shell-row equipment-shell-row--button ${selected ? "is-selected" : ""}" type="button" data-equipment-select-container="${escapeHtml(container.id || "")}" ${tooltip}>
        <span><b>${escapeHtml(container.name || container.containerProfile?.label || container.id)}</b><small>${escapeHtml(getContainerStatusLabel(container))}</small></span>
        <span class="equipment-shell-row__meta"><b>${escapeHtml(capacity.usedSlots)} / ${escapeHtml(capacity.slotCapacity)}</b><small>${escapeHtml(capacity.gridItemCount || 0)} ITEM${Number(capacity.gridItemCount || 0) === 1 ? "" : "S"}</small></span>
      </button>
    `;
  }

  function renderContainedItemRow(item = {}, container = {}, selectedItemId = "", state = {}) {
    const selected = String(item.id || "") === String(selectedItemId || "");
    const placement = item.containerPlacement || {};
    const tooltip = typeof window.WS_APP.renderEquipmentItemTooltipAttributes === "function"
      ? window.WS_APP.renderEquipmentItemTooltipAttributes(item, state)
      : "";
    return `
      <button class="equipment-shell-row equipment-shell-row--button ${selected ? "is-selected" : ""}" type="button"
        data-equipment-select-container-item="${escapeHtml(item.id || "")}" data-equipment-container-id="${escapeHtml(container.id || "")}" ${tooltip}>
        <span><b>${escapeHtml(getGridItemDisplayName(item))}</b><small>${escapeHtml(getItemTypeLabel(item))}</small></span>
        <span class="equipment-shell-row__meta"><b>${escapeHtml(`${item.width || 1}×${item.height || 1}`)}</b><small>${escapeHtml(placement.column && placement.row ? getContainedItemPlacementLabel(item, container) : "UNPLACED")}</small></span>
      </button>
    `;
  }

  function renderSelectedContainerDetail(state = {}, renderOptions = {}) {
    const container = getSelectedContainer(state);
    if (!container) return `<div class="equipment-command-empty"><p class="kicker">SELECTED CONTAINER</p><h6>No container selected</h6><p class="equipment-shell-note">Select a visible storage region.</p></div>`;
    const workspace = typeof window.WS_APP.getEquipmentContainerWorkspaceState === "function"
      ? window.WS_APP.getEquipmentContainerWorkspaceState(state, container.id, { state })
      : null;
    const capacity = workspace?.capacity || getCapacity(state, container);
    const gridItems = workspace?.gridItems || getGridItemsForContainer(state, container.id);
    const selectedItem = getSelectedContainerItem(state, container);
    return `
      <div class="equipment-container-detail ${renderOptions.compact ? "is-compact" : ""}" data-equipment-selected-container-id="${escapeHtml(container.id || "")}">
        <div class="equipment-container-detail__head"><h6>${escapeHtml(container.name || container.containerProfile?.label || container.id)}</h6></div>
        <p class="equipment-container-detail__summary">${escapeHtml(`${capacity.usedSlots} / ${capacity.slotCapacity} USED · ${capacity.freeSlots} FREE`)}</p>
        ${renderOptions.includeGrid ? renderSelectedContainerGrid(state, container, workspace || {}) : ""}
        ${!renderOptions.compact ? `
          <div class="equipment-container-section"><div class="equipment-container-section__head"><div><p class="kicker">GRID CONTENTS</p><h6>Items inside selected container</h6></div><span>${escapeHtml(gridItems.length)}</span></div>
            <div class="equipment-shell-list equipment-shell-list--compact">${gridItems.length ? gridItems.map((item) => renderContainedItemRow(item, container, selectedItem?.id || "", state)).join("") : `<p class="file-empty">Empty grid.</p>`}</div>
          </div>
        ` : ""}
      </div>
    `;
  }

  function renderContainerGroup(label = "", containers = [], state = {}) {
    return `<div class="equipment-container-group"><p class="kicker">${escapeHtml(label)}</p><div class="equipment-shell-list equipment-shell-list--compact">${containers.length ? containers.map((container) => renderContainerRow(state, container)).join("") : `<p class="file-empty">No ${escapeHtml(label.toLowerCase())} containers.</p>`}</div></div>`;
  }

  function renderEquipmentContainersPanel(state = {}, options = {}) {
    const all = Array.isArray(state?.containers?.all) ? state.containers.all.filter((item) => !item.isStored) : [];
    const worn = all.filter((item) => item.isEquipped);
    const nested = all.filter((item) => item.isInGrid);
    const tag = options.embedded === true ? "div" : "section";
    return `
      <${tag} class="equipment-shell-panel equipment-shell-panel--containers equipment-shell-panel--container-tray ${options.embedded ? "is-embedded" : ""}" data-equipment-panel="containers">
        <div class="equipment-shell-panel__head"><div><p class="kicker">EQUIPMENT / CONTAINERS</p><h5>Physical Container Index</h5></div><span class="equipment-panel-badge">${escapeHtml(all.length)} ACTIVE</span></div>
        <div class="equipment-container-groups equipment-container-groups--tray">${renderContainerGroup("Worn", worn, state)}${renderContainerGroup("Nested", nested, state)}</div>
      </${tag}>
    `;
  }

  function getStorageRegions(state = {}) {
    if (Array.isArray(state?.storageRegions)) {
      return state.storageRegions.filter((region) => {
        const container = getRegionContainer(state, region);
        return Number(container?.containerProfile?.slotCapacity || 0) > 0;
      });
    }
    const active = Array.isArray(state?.containers?.all)
      ? state.containers.all.filter((container) => !container.isStored && !container.isOrphan && Number(container?.containerProfile?.slotCapacity || 0) > 0)
      : [];
    return active.map((container) => ({
      id: `storage-region:${container.id}`,
      containerId: String(container.id || ""),
      containerName: String(container.name || container.containerProfile?.label || container.id || "Container"),
      parentContainerId: container.isInGrid ? String(container.containerHostId || "") : "",
      parentContainerName: "",
      bodyAnchor: container.isEquipped ? (() => {
        const location = container.equippedLocation || {};
        if (location.kind === "LAYER") return String(location.anchor || "");
        const mountId = String(location.primaryMountId || location.mountIds?.[0] || "");
        const definition = (state?.bodyMountDefinitions || []).find((entry) => String(entry.key || "") === mountId) || null;
        return String(definition?.regionKey || mountId.replace(/_(CARRY|MOUNT|HOLSTER|SLING)$/i, "") || "");
      })() : "",
      bodyLayer: container.isEquipped ? (container.equippedLocation?.kind === "LAYER" ? String(container.equippedLocation?.layer || "") : "MOUNT") : "",
      bodyMountIds: container.isEquipped && container.equippedLocation?.kind === "BODY_MOUNT" ? [...(container.equippedLocation.mountIds || [])] : [],
      depth: 0,
      locationType: container.isEquipped ? "BODY" : container.isInGrid ? "CONTAINER" : "ACTIVE",
      lineage: [String(container.name || container.containerProfile?.label || container.id || "Container")]
    }));
  }

  function getRegionContainer(state = {}, region = {}) {
    const containerId = String(region?.containerId || "").trim();
    if (!containerId) return null;
    return state?.itemById?.[containerId]
      || (Array.isArray(state?.containers?.all)
        ? state.containers.all.find((container) => String(container.id || "") === containerId) || null
        : null);
  }

  function getContainerTypeLabel(container = {}) {
    const profile = container?.containerProfile || {};
    return formatContainerTypeLabel(container.subtype || profile.type || profile.containerType || profile.label || "CONTAINER");
  }

  function getRegionBodyAnchorLabel(state = {}, region = {}) {
    const raw = String(region.bodyAnchor || "").trim();
    if (!raw) return "BODY";
    const definition = (state?.bodyMountDefinitions || []).find((entry) => String(entry.key || "") === raw) || null;
    const resolved = definition?.regionKey || raw.replace(/_(CARRY|MOUNT|HOLSTER|SLING)$/i, "");
    return formatRegionLabel(resolved || "BODY");
  }

  function getRegionLocationLabel(state = {}, region = {}, container = {}) {
    if (region.locationType === "BODY") {
      return `${getRegionBodyAnchorLabel(state, region)} / ${getContainerTypeLabel(container)}`;
    }
    if (region.locationType === "CONTAINER") {
      const parentId = String(region.parentContainerId || container.containerHostId || "").trim();
      const parent = parentId ? getRegionContainer(state, { containerId: parentId }) : null;
      return `${getContainerTypeLabel(parent || { subtype: region.parentContainerType || "CONTAINER" })} / ${getContainerTypeLabel(container)}`;
    }
    return `ACTIVE / ${getContainerTypeLabel(container)}`;
  }

  function renderStorageRegion(state = {}, region = {}) {
    const container = getRegionContainer(state, region);
    if (!container) return "";
    const active = String(state?.selections?.selectedContainerId || "") === String(container.id || "");
    const capacity = getCapacity(state, container);
    const model = getGridModel(state, container, { capacity });
    const grid = model.grid || {};
    if (!grid.hasGrid) return "";
    const itemLabel = `${capacity.gridItemCount || 0} ITEM${Number(capacity.gridItemCount || 0) === 1 ? "" : "S"}`;
    const beltLayout = isStandardBeltGrid(container, model);
    const regionSummary = beltLayout
      ? `1 HOLSTER · 2 CELLS · ${capacity.usedSlots} / ${capacity.slotCapacity} USED`
      : `${grid.columns || 0}×${grid.rows || 0} · ${capacity.usedSlots} / ${capacity.slotCapacity} · ${itemLabel}`;
    return `
      <section class="equipment-storage-region ${Number(region.depth || 0) > 0 ? "is-nested" : "is-root"} ${active ? "is-active" : ""}"
        data-equipment-storage-region="${escapeHtml(region.id || container.id || "")}" data-equipment-container-id="${escapeHtml(container.id || "")}">
        <div class="equipment-storage-region__head">
          <div class="equipment-storage-region__identity">
            <p class="kicker">${escapeHtml(getRegionLocationLabel(state, region, container))}</p>
            <h6>${escapeHtml(container.name || container.containerProfile?.label || container.id)}</h6>
            <small>${escapeHtml(regionSummary)}</small>
          </div>
          <button class="secondary-action is-compact" type="button" data-equipment-activate-storage-region="${escapeHtml(container.id || "")}" ${active ? "disabled" : ""}>${active ? "Active" : "Focus"}</button>
        </div>
        ${renderSelectedContainerGrid(state, container, { capacity, gridModel: model })}
      </section>
    `;
  }

  function createEquipmentContainerMarkupNode(markup = "") {
    const template = document.createElement("template");
    template.innerHTML = String(markup || "").trim();
    return template.content.firstElementChild || null;
  }

  function syncEquipmentCybergridSelection(root = document, state = {}) {
    const panel = root?.matches?.('[data-equipment-panel="cybergrid"]')
      ? root
      : root?.querySelector?.('[data-equipment-panel="cybergrid"]');
    if (!panel) return { ok: false, changed: 0, reason: "CYBERGRID_PANEL_NOT_MOUNTED" };
    const selectedItemId = String(state?.selections?.selectedItemId || "").trim();
    let changed = 0;
    panel.querySelectorAll("[data-equipment-select-container-item]").forEach((node) => {
      const selected = String(node.dataset.equipmentSelectContainerItem || "").trim() === selectedItemId;
      if (node.classList.contains("is-selected") !== selected) changed += 1;
      node.classList.toggle("is-selected", selected);
    });

    panel.querySelectorAll("[data-equipment-grid-actions]").forEach((current) => {
      const containerId = String(current.dataset.equipmentGridActions || "").trim();
      const currentItemId = String(current.querySelector("[data-equipment-grid-rotate-item]")?.dataset?.equipmentGridRotateItem || "").trim();
      const selectedItem = selectedItemId ? state?.itemById?.[selectedItemId] || null : null;
      const selectedContainerId = selectedItem?.isInGrid ? String(selectedItem.containerHostId || "").trim() : "";
      if (!currentItemId && selectedContainerId !== containerId) return;
      const container = getRegionContainer(state, { containerId });
      if (!container) return;
      const capacity = getCapacity(state, container);
      const model = getGridModel(state, container, { capacity });
      const selectedContainerItem = getSelectedContainerItem(state, container);
      const next = createEquipmentContainerMarkupNode(renderGridActionBar(state, container, model, selectedContainerItem));
      if (next) current.replaceWith(next);
    });
    return { ok: true, changed, selectedItemId };
  }

  function renderEquipmentCybergridPanel(state = {}) {
    const regions = getStorageRegions(state);
    return `
      <section class="equipment-shell-panel equipment-cybergrid-panel" data-equipment-panel="cybergrid">
        <div class="equipment-shell-panel__head"><div><p class="kicker">EQUIPMENT / CYBERGRID</p><h5>Storage Workspace</h5></div></div>
        <p class="equipment-container-tray-note">Drag items between visible grids. Nested containers retain their host relationship.</p>
        <div class="equipment-storage-regions" data-equipment-storage-regions>
          ${regions.length ? regions.map((region) => renderStorageRegion(state, region)).join("") : `
            <div class="equipment-container-grid-empty-state equipment-storage-regions__empty">
              <b>NO ACTIVE STORAGE REGION</b>
              <small>Equip a container or move one from Housing before carrying physical items.</small>
            </div>
          `}
        </div>
      </section>
    `;
  }

  window.WS_APP.equipmentContainersPanel = {
    version: EQUIPMENT_CONTAINERS_PANEL_VERSION,
    renderEquipmentContainersPanel,
    renderContainerRow,
    renderSelectedContainerDetail,
    renderSelectedContainerGrid,
    renderEquipmentCybergridPanel,
    syncEquipmentCybergridSelection,
    renderEquipmentStorageRegion: renderStorageRegion,
    getEquipmentStorageRegions: getStorageRegions,
    getGridItemsForContainer
  };
  window.WS_APP.renderEquipmentContainersPanel = renderEquipmentContainersPanel;
  window.WS_APP.renderEquipmentCybergridPanel = renderEquipmentCybergridPanel;
  window.WS_APP.syncEquipmentCybergridSelection = syncEquipmentCybergridSelection;
  window.WS_APP.renderEquipmentStorageRegion = renderStorageRegion;
  window.WS_APP.getEquipmentStorageRegions = getStorageRegions;
  window.WS_APP.renderSelectedEquipmentContainerDetail = renderSelectedContainerDetail;
})();
