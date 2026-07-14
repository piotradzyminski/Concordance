window.WS_APP = window.WS_APP || {};

(function initEquipmentItemsPanel() {
  const EQUIPMENT_ITEMS_PANEL_VERSION = "5.4.4x";
  const escapeHtml = window.WS_APP.escapeEquipmentHtml || ((value = "") => String(value ?? ""));

  function renderMetric(label = "", value = 0) {
    return `<span><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b></span>`;
  }

  function renderEquipmentSummaryMetrics(state = {}) {
    const summary = state?.summary || {};
    return `<div class="equipment-shell-metrics">
      ${renderMetric("Items", summary.itemCount || 0)}
      ${renderMetric("Equipped", summary.equippedCount || 0)}
      ${renderMetric("In Grids", summary.gridStoredCount || 0)}
      ${renderMetric("Housing", summary.storedCount || 0)}
      ${renderMetric("Containers", summary.containerCount || 0)}
      ${renderMetric("Carry Penalty", `${summary.reflexDexterityPenaltyPercent || 0}%`)}
      ${renderMetric("Invalid", summary.orphanCount || 0)}
    </div>`;
  }

  function getSelectedItemId(state = {}) {
    return String(state?.selections?.selectedItemId || "").trim();
  }

  function getItemCatalogName(item = {}) {
    if (typeof window.WS_APP.getItemInstanceCatalogName === "function") return window.WS_APP.getItemInstanceCatalogName(item);
    return String(item.catalogName || item.name || item.model || item.title || item.id || "Item").trim() || "Item";
  }

  function getItemDisplayName(item = {}) {
    if (typeof window.WS_APP.getItemInstanceDisplayName === "function") return window.WS_APP.getItemInstanceDisplayName(item);
    return String(item.playerLabel || item.displayName || item.name || item.model || item.title || item.id || "Item").trim() || "Item";
  }

  function renderItemInstanceRenameControl(item = {}, options = {}) {
    const instanceId = String(item.instanceId || item.id || item.itemId || "").trim();
    if (!instanceId) return "";
    const playerLabel = String(item.playerLabel || "").trim();
    const catalogName = getItemCatalogName(item);
    const compact = options.compact === true;
    return `<div class="item-instance-rename-disclosure ${compact ? "is-compact" : ""}" data-item-instance-rename-disclosure="${escapeHtml(instanceId)}">
      <button class="secondary-action is-compact item-instance-rename-toggle" type="button" aria-expanded="false" data-item-instance-rename-toggle="${escapeHtml(instanceId)}">RENAME</button>
      <form class="item-instance-rename-control ${compact ? "is-compact" : ""}" data-item-instance-rename-form="${escapeHtml(instanceId)}" hidden>
        <div class="item-instance-rename-control__head"><span>Custom item name</span><small>Per-instance label</small></div>
        <label><span>Name</span><input type="text" maxlength="64" value="${escapeHtml(playerLabel)}" placeholder="${escapeHtml(catalogName)}" autocomplete="off" data-item-instance-player-label></label>
        <div class="item-instance-rename-control__actions">
          <button class="secondary-action is-compact" type="submit">Save Name</button>
          ${playerLabel ? `<button class="secondary-action is-compact" type="button" data-item-instance-rename-clear="${escapeHtml(instanceId)}">Use Model Name</button>` : ""}
        </div>
        <p data-item-instance-rename-feedback>${escapeHtml(`MODEL · ${catalogName}`)}</p>
      </form>
    </div>`;
  }

  function getItemFootprint(item = {}) {
    if (typeof window.WS_APP.getEquipmentItemGridFootprint === "function") {
      return window.WS_APP.getEquipmentItemGridFootprint(item, item?.containerPlacement?.rotation || 0);
    }
    return {
      width: Math.max(1, Number(item.width || 1)),
      height: Math.max(1, Number(item.height || 1)),
      rotation: Number(item?.containerPlacement?.rotation || 0) === 90 ? 90 : 0
    };
  }

  function formatGridRange(item = {}) {
    const placement = item.containerPlacement || {};
    const column = Math.max(0, Number(placement.column || 0));
    const row = Math.max(0, Number(placement.row || 0));
    if (!column || !row) return "UNPLACED";
    const footprint = getItemFootprint(item);
    const columnEnd = column + Math.max(1, Number(footprint.width || 1)) - 1;
    const rowEnd = row + Math.max(1, Number(footprint.height || 1)) - 1;
    const columnLabel = columnEnd > column ? `C${column}–C${columnEnd}` : `C${column}`;
    const rowLabel = rowEnd > row ? `R${row}–R${rowEnd}` : `R${row}`;
    return `${columnLabel} · ${rowLabel}`;
  }

  function getEquipmentItemLocationDescriptor(item = {}, state = {}) {
    if (item.isEquipped && item.equippedLocation) {
      const location = item.equippedLocation || {};
      if (location.kind === "BODY_MOUNT") {
        const ids = Array.isArray(location.mountIds) ? location.mountIds : [location.primaryMountId].filter(Boolean);
        const labels = ids.map((id) => {
          const definition = state?.bodyMountDefinitions?.find((entry) => entry.key === id) || null;
          const regionLabel = formatEquipmentRegionLabel(definition?.regionKey || "");
          const mountLabel = formatEquipmentSlotLabel(definition?.label || id, { regionKey: definition?.regionKey || "" });
          return [regionLabel, mountLabel].filter(Boolean).join(" / ") || "MOUNT";
        });
        return { kind: "BODY MOUNT", label: `BODY MOUNT · ${labels.join(" + ") || "UNKNOWN"}`, shortLabel: labels.join(" + ") || "BODY MOUNT", mountIds: ids, anchor: "", layer: "", containerId: "" };
      }
      if (location.kind === "ITEM_MOUNT") {
        const owner = state?.itemById?.[location.ownerItemId] || null;
        const slot = owner?.mountProfile?.slots?.find((entry) => entry.id === location.mountId) || null;
        const slotLabel = formatEquipmentMountLabel(slot?.label || location.mountId || "MOUNT");
        const label = `${getItemDisplayName(owner || {}) || location.ownerItemId || "ITEM"} / ${slotLabel}`;
        return { kind: "ITEM MOUNT", label: `ITEM MOUNT · ${label}`, shortLabel: label, ownerItemId: location.ownerItemId || "", mountId: location.mountId || "", anchor: "", layer: "", containerId: "" };
      }
      const anchor = formatEquipmentRegionLabel(location.anchor || "UNKNOWN") || "UNKNOWN";
      const layer = formatEquipmentSlotLabel(location.layer || "", { regionKey: location.anchor });
      const bodyLocation = [anchor, layer].filter(Boolean).join(" / ");
      return { kind: "BODY LAYER", label: `BODY · ${bodyLocation || "UNKNOWN"}`, shortLabel: bodyLocation || "BODY", anchor, layer, containerId: "" };
    }
    if (item.isInstalledInItem) {
      const hostId = String(item.parentItemInstanceId || item.locationData?.parentItemInstanceId || "").trim();
      const host = state?.itemById?.[hostId] || getItemInstanceViewForLocation(hostId);
      const hostName = String(getItemDisplayName(host || {}) || hostId || "ITEM").trim();
      const slotLabel = formatEquipmentMountLabel(item.moduleSlotId || item.locationData?.moduleSlotId || "MODULE");
      return { kind: "ITEM MODULE", label: `ITEM MODULE · ${hostName} / ${slotLabel}`, shortLabel: `${hostName} / ${slotLabel}`, ownerItemId: hostId, mountId: item.moduleSlotId || "", anchor: "", layer: "", containerId: "" };
    }
    if (item.isInGrid) {
      const hostId = String(item.containerHostId || "").trim();
      const host = state?.itemById?.[hostId] || null;
      const hostName = String(getItemDisplayName(host || {}) || host?.containerProfile?.label || hostId || "UNKNOWN").trim();
      const placementType = getGridPlacementTypeLabel(item, host || {});
      return { kind: "GRID", label: `${hostName} · ${placementType}`, shortLabel: `${hostName} · ${placementType}`, containerId: hostId, range: placementType, anchor: "", layer: "" };
    }
    if (item.isStored) {
      const unitId = formatEquipmentLabel(item.storageUnitId || item.housingStorageUnitId || "STORAGE");
      return { kind: "HOUSING", label: `HOUSING · ${unitId}`, shortLabel: `HOUSING · ${unitId}`, containerId: "", anchor: "", layer: "" };
    }
    return { kind: "INVALID", label: "INVALID · ORPHAN", shortLabel: "INVALID", containerId: "", anchor: "", layer: "" };
  }

  function getItemInstanceViewForLocation(instanceId = "") {
    const id = String(instanceId || "").trim();
    if (!id) return null;
    return window.WS_APP.getItemInstanceView?.(id) || window.WS_APP.getItemInstanceById?.(id) || null;
  }

  function getItemLocationLabel(item = {}, state = {}) {
    return getEquipmentItemLocationDescriptor(item, state).label;
  }

  function getGridPlacementTypeLabel(item = {}, host = {}) {
    const placement = item?.containerPlacement && typeof item.containerPlacement === "object" ? item.containerPlacement : {};
    const column = Number(placement.column || 0);
    const row = Number(placement.row || 0);
    const profile = host?.containerProfile || {};
    const customRule = typeof window.WS_APP.getEquipmentContainerCellRule === "function"
      ? window.WS_APP.getEquipmentContainerCellRule(profile, column, row)
      : null;
    const ruleKey = String(customRule?.key || "").trim().toUpperCase();
    const ruleLabel = String(customRule?.label || "").trim();
    if (ruleLabel) return formatEquipmentLabel(ruleLabel);
    if (ruleKey === "HOLSTER_OR_TOOL") return "Holster";
    if (String(host?.subtype || "").trim().toUpperCase() === "BELT"
      && profile.isolatedCells === true
      && Number(profile.gridColumns || 0) === 3
      && Number(profile.gridRows || 0) === 1
      && column === 1
      && row === 1) {
      return "Holster";
    }
    return "Grid";
  }


  function renderTooltipAttributes(title = "", lines = [], options = {}) {
    const normalizedLines = Array.isArray(lines) ? lines.map((line) => String(line || "").trim()).filter(Boolean).slice(0, 3) : [];
    const tone = String(options.tone || "default").trim().toLowerCase() || "default";
    const kind = String(options.kind || "equipment").trim().toLowerCase() || "equipment";
    return [
      `data-equipment-tooltip="true"`,
      `data-equipment-tooltip-title="${escapeHtml(title)}"`,
      `data-equipment-tooltip-tone="${escapeHtml(tone)}"`,
      `data-equipment-tooltip-kind="${escapeHtml(kind)}"`,
      ...normalizedLines.map((line, index) => `data-equipment-tooltip-line${index + 1}="${escapeHtml(line)}"`)
    ].join(" ");
  }

  function renderInspectorMeta(label = "", value = "", options = {}) {
    const normalized = String(value ?? "").trim();
    const classes = ["equipment-inspector-metric"];
    if (options.wide === true) classes.push("is-wide");
    if (options.warning === true) classes.push("is-warning");
    return `<span class="${classes.join(" ")}"><small>${escapeHtml(label)}</small><b>${escapeHtml(normalized || "—")}</b></span>`;
  }

  const EQUIPMENT_LABEL_ALIASES = Object.freeze({
    MASS_COMPRESSION_CUBE: "C-CUBE",
    MCC_CUBE: "C-CUBE",
    C_CUBE: "C-CUBE",
    CHEST_RIG: "CHEST RIG",
    FOREARM_GUARD: "FOREARM GUARD",
    LEG_ARMOR: "LEG ARMOR",
    OFFICIAL_SHIRT: "OFFICIAL SHIRT",
    THERMAL_LEGGINGS: "THERMAL LEGGINGS",
    RIGHT_FOREARM: "RIGHT FOREARM",
    LEFT_FOREARM: "LEFT FOREARM",
    RIGHT_WRIST: "RIGHT WRIST",
    LEFT_WRIST: "LEFT WRIST",
    RIGHT_THIGH: "RIGHT THIGH",
    LEFT_THIGH: "LEFT THIGH",
    RIGHT_SHIN: "RIGHT SHIN",
    LEFT_SHIN: "LEFT SHIN",
    CONTAINER_GRID: "CONTAINER",
    BODY_MOUNT: "BODY MOUNT",
    ITEM_MOUNT: "ITEM MOUNT"
  });

  const EQUIPMENT_SLOT_LABEL_ALIASES = Object.freeze({
    FOREARM_GUARD: "ARMOR",
    ARM_GUARD: "ARMOR",
    LEG_ARMOR: "ARMOR",
    CHEST_PLATE: "ARMOR",
    TORSO_ARMOR: "ARMOR",
    LEFT_FOREARM_ACCESSORY_1: "WRIST",
    RIGHT_FOREARM_ACCESSORY_1: "WRIST",
    LEFT_FOREARM_ACCESSORY_2: "FOREARM",
    RIGHT_FOREARM_ACCESSORY_2: "FOREARM",
    LEFT_THIGH_HOLSTER: "MOUNT",
    RIGHT_THIGH_HOLSTER: "MOUNT",
    LEFT_SHOULDER_CARRY: "CONTAINER",
    RIGHT_SHOULDER_CARRY: "CONTAINER",
    IMPLANT_PORT: "PORT"
  });

  function normalizeEquipmentToken(value = "") {
    return String(value || "")
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase();
  }

  function humanizeEquipmentToken(value = "") {
    return normalizeEquipmentToken(value)
      .replace(/_+/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatEquipmentLabel(value = "", options = {}) {
    const token = normalizeEquipmentToken(value);
    if (!token) return "";
    const kind = String(options.kind || "generic").trim().toLowerCase();
    if (kind === "slot" && EQUIPMENT_SLOT_LABEL_ALIASES[token]) return EQUIPMENT_SLOT_LABEL_ALIASES[token];
    if (EQUIPMENT_LABEL_ALIASES[token]) return EQUIPMENT_LABEL_ALIASES[token];
    return token.replace(/_+/g, " ");
  }

  function formatEquipmentCategoryLabel(value = "") {
    return formatEquipmentLabel(value, { kind: "category" });
  }

  function formatEquipmentSubtypeLabel(value = "") {
    return formatEquipmentLabel(value, { kind: "subtype" });
  }

  function formatEquipmentRegionLabel(value = "") {
    return formatEquipmentLabel(value, { kind: "region" });
  }

  function formatEquipmentSlotLabel(value = "", options = {}) {
    const token = normalizeEquipmentToken(value);
    const regionToken = normalizeEquipmentToken(options.regionKey || options.region || "");
    if (!token) return "";
    if (EQUIPMENT_SLOT_LABEL_ALIASES[token]) return EQUIPMENT_SLOT_LABEL_ALIASES[token];
    if (regionToken && token.startsWith(`${regionToken}_`)) {
      const localToken = token.slice(regionToken.length + 1);
      if (EQUIPMENT_SLOT_LABEL_ALIASES[localToken]) return EQUIPMENT_SLOT_LABEL_ALIASES[localToken];
      return formatEquipmentLabel(localToken, { kind: "slot" });
    }
    return formatEquipmentLabel(token, { kind: "slot" });
  }

  function formatEquipmentContainerTypeLabel(value = "") {
    return formatEquipmentLabel(value, { kind: "container" }) || "CONTAINER";
  }

  function formatEquipmentMountLabel(value = "") {
    return formatEquipmentLabel(value, { kind: "slot" }) || "MOUNT";
  }

  function formatEquipmentUiToken(value = "") {
    return formatEquipmentLabel(value);
  }

  function getEquipmentConditionPresentation(value = 0) {
    const condition = Math.max(0, Math.min(100, Math.round(Number(value ?? 0)) || 0));
    if (condition >= 90) return { value: condition, label: "PERFECT", className: "is-perfect" };
    if (condition >= 71) return { value: condition, label: "GOOD", className: "is-good" };
    if (condition >= 45) return { value: condition, label: "WORN", className: "is-worn" };
    if (condition >= 15) return { value: condition, label: "DAMAGED", className: "is-damaged" };
    return { value: condition, label: "BROKEN", className: "is-broken" };
  }

  function getEquipmentItemTypeLabel(item = {}) {
    return [formatEquipmentCategoryLabel(item.category), formatEquipmentSubtypeLabel(item.subtype)].filter(Boolean).join(" / ") || "ITEM";
  }

  function getEquipmentItemInspectorBadge(item = {}) {
    if (item.isEquipped) return "EQUIPPED";
    if (item.isInstalledInItem) return "INSTALLED";
    if (item.isInGrid) return "IN GRID";
    if (item.isStored) return "HOUSING";
    if (item.isOrphan) return "INVALID";
    return String(item.lifecycleState || item.status || "ITEM").trim().toUpperCase() || "ITEM";
  }

  function getEquipmentManufacturerLabel(item = {}) {
    return String(item.manufacturer || item.provider || item.brand || item.hardwareIdentity?.manufacturer || "").trim();
  }

  function getEquipmentItemDescription(item = {}) {
    return String(item.description || item.publicDescription || item.summary || item.notes || item.note || "").trim();
  }

  function getBaseItemFootprint(item = {}) {
    if (typeof window.WS_APP.getEquipmentItemGridFootprint === "function") {
      return window.WS_APP.getEquipmentItemGridFootprint(item, 0);
    }
    return {
      width: Math.max(1, Number(item.width || 1)),
      height: Math.max(1, Number(item.height || 1)),
      rotation: 0
    };
  }

  function formatEquipmentFootprintLabel(item = {}) {
    const footprint = getItemFootprint(item);
    const suffixes = [];
    if (Number(footprint.rotation || 0) === 90) suffixes.push("ROTATED");
    if (item.isEquipped && ["BODY_MOUNT", "ITEM_MOUNT"].includes(String(item.equippedLocation?.kind || "").toUpperCase())) suffixes.push("MOUNTED");
    return `${footprint.width || 1}×${footprint.height || 1}${suffixes.length ? ` · ${suffixes.join(" · ")}` : ""}`;
  }

  function renderConditionMetric(item = {}) {
    const condition = getEquipmentConditionPresentation(item.condition);
    return `<span class="equipment-inspector-metric equipment-condition-metric ${escapeHtml(condition.className)}">
      <small>Condition</small>
      <b>${escapeHtml(`${condition.label} · ${condition.value}%`)}</b>
      <i class="equipment-condition-bar" aria-hidden="true"><em style="--equipment-condition:${condition.value}%"></em></i>
    </span>`;
  }

  function getPlayerLocationLabel(item = {}, state = {}, descriptor = getEquipmentItemLocationDescriptor(item, state)) {
    if (item.isEquipped && item.equippedLocation) {
      const location = item.equippedLocation || {};
      if (location.kind === "LAYER") {
        const region = (state?.bodyRegions || []).find((entry) => entry.key === location.anchor);
        return formatEquipmentRegionLabel(region?.label || location.anchor || "BODY") || "BODY";
      }
      if (location.kind === "BODY_MOUNT") {
        const mountId = location.primaryMountId || location.mountIds?.[0] || "";
        const mount = state?.bodyMountDefinitions?.find((entry) => entry.key === mountId) || null;
        const region = (state?.bodyRegions || []).find((entry) => entry.key === mount?.regionKey) || null;
        return formatEquipmentRegionLabel(region?.label || mount?.regionKey || mountId || "BODY") || "BODY";
      }
      if (location.kind === "ITEM_MOUNT") {
        const owner = state?.itemById?.[location.ownerItemId] || null;
        return String(getItemDisplayName(owner || {}) || "Mounted item").toUpperCase();
      }
    }
    if (item.isInGrid) {
      const host = state?.itemById?.[item.containerHostId] || null;
      return String(getItemDisplayName(host || {}) || host?.containerProfile?.label || "Container").toUpperCase();
    }
    if (item.isStored) return "HOUSING";
    return String(descriptor.shortLabel || descriptor.label || "UNKNOWN").toUpperCase();
  }

  function getEquipmentItemEquipTargets(item = {}, state = {}) {
    if ((!item.isInGrid && !item.isEquipped) || typeof window.WS_APP.getEquipmentEquipTargets !== "function") return [];
    return window.WS_APP.getEquipmentEquipTargets({ id: state.citizenId }, item.id, { state, item })
      .filter((entry) => entry?.validation?.ok);
  }

  function getEquipTargetLabel(entry = {}) {
    const region = formatEquipmentRegionLabel(entry.region?.label || entry.anchor || "");
    const slot = formatEquipmentSlotLabel(entry.layer || entry.mountId || "", { regionKey: entry.anchor });
    if (region || slot) return [region, slot].filter(Boolean).join(" / ");
    return formatEquipmentLabel(entry.label || entry.id || "EQUIP TARGET");
  }

  function renderQuickDrawStow(item = {}, state = {}) {
    const stowTargets = typeof window.WS_APP.getEquipmentStowTargets === "function"
      ? window.WS_APP.getEquipmentStowTargets({ id: state.citizenId }, item.id, { state, item })
      : [];
    const drawTargets = typeof window.WS_APP.getEquipmentDrawTargets === "function"
      ? window.WS_APP.getEquipmentDrawTargets({ id: state.citizenId }, item.id, { state, item })
      : [];
    const targets = stowTargets.length ? stowTargets : drawTargets;
    const action = stowTargets.length ? "STOW" : drawTargets.length ? "DRAW" : "";
    if (!action || !targets.length) return "";
    if (targets.length === 1) {
      const target = targets[0];
      const attribute = action === "STOW" ? "data-equipment-stow-item" : "data-equipment-draw-item";
      const targetAttribute = action === "STOW" ? "data-equipment-stow-target" : "data-equipment-draw-target";
      return `<button class="equipment-held-switch" type="button" ${attribute}="${escapeHtml(item.id)}" ${targetAttribute}="${escapeHtml(target.id)}"><span>${escapeHtml(action)}</span><small>${escapeHtml(getEquipTargetLabel(target))}</small></button>`;
    }
    return `<label class="equipment-held-switch equipment-held-switch--select"><span>${escapeHtml(action)}</span>
      <select class="equipment-select-control" data-equipment-${action.toLowerCase()}-target-select data-equipment-switch-item="${escapeHtml(item.id)}">${targets.map((target) => `<option value="${escapeHtml(target.id)}">${escapeHtml(getEquipTargetLabel(target))}</option>`).join("")}</select>
      <button type="button" data-equipment-${action.toLowerCase()}-selected="${escapeHtml(item.id)}">↔</button>
    </label>`;
  }

  function getUnequipTargets(item = {}, state = {}) {
    if (!item?.isEquipped || typeof window.WS_APP.getEquipmentUnequipTargets !== "function") return [];
    return window.WS_APP.getEquipmentUnequipTargets({ id: state.citizenId }, item.id, {
      state,
      item,
      targetContainerId: state?.selections?.selectedContainerId || ""
    });
  }

  function getUnequipDisclosureId(item = {}, options = {}) {
    const token = `${item.id || "item"}-${options.disclosureKey || "inspector"}`.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
    return `equipment-unequip-${token || "item"}`;
  }

  function renderEquipmentUnequipControl(item = {}, state = {}, options = {}) {
    const targets = getUnequipTargets(item, state);
    const compact = options.compact !== false;
    if (!targets.length) {
      return `<div class="equipment-unequip-control ${compact ? "is-compact" : ""}"><p class="equipment-action-unavailable">NO VALID DESTINATION GRID</p></div>`;
    }
    const panelId = getUnequipDisclosureId(item, options);
    const destination = targets.length === 1
      ? `<span class="equipment-unequip-destination"><small>Destination</small><b>${escapeHtml(targets[0].label || targets[0].id)}</b></span>`
      : `<label class="equipment-inspector-target-select"><span>Destination</span><select class="equipment-select-control" data-equipment-unequip-target-select data-equipment-unequip-item="${escapeHtml(item.id)}">
          ${targets.map((target) => `<option value="${escapeHtml(target.id)}">${escapeHtml(target.label)}</option>`).join("")}
        </select></label>`;
    const singleTarget = targets.length === 1 ? ` data-equipment-unequip-container="${escapeHtml(targets[0].id)}"` : "";
    return `<div class="equipment-unequip-control ${compact ? "is-compact" : ""}">
      <button class="secondary-action is-compact equipment-unequip-toggle" type="button" data-equipment-unequip-toggle aria-expanded="false" aria-controls="${escapeHtml(panelId)}">Unequip</button>
      <div class="equipment-unequip-panel" id="${escapeHtml(panelId)}" data-equipment-unequip-panel hidden>
        ${destination}
        <button class="secondary-action is-compact" type="button" data-equipment-unequip-item="${escapeHtml(item.id)}"${singleTarget}>Confirm Unequip</button>
      </div>
    </div>`;
  }

  function renderEquipmentItemEquipActions(item = {}, state = {}, options = {}) {
    const compact = options.compact !== false;
    const quickSwitch = renderQuickDrawStow(item, state);
    if (item.isEquipped && item.equippedLocation) {
      return `<div class="equipment-shell-inspector-section equipment-loadout-action-section ${compact ? "is-compact" : ""}">
        ${quickSwitch}
        ${renderEquipmentUnequipControl(item, state, { compact, disclosureKey: options.disclosureKey || "item" })}
      </div>`;
    }

    if (!item.isInGrid) return "";
    const condition = getEquipmentConditionPresentation(item.condition ?? 100);
    if (condition.className === "is-broken") {
      return `<div class="equipment-shell-inspector-section equipment-loadout-action-section ${compact ? "is-compact" : ""}">
        <button class="secondary-action is-compact equipment-action-broken" type="button" disabled>Broken</button>
      </div>`;
    }
    if (quickSwitch) return `<div class="equipment-shell-inspector-section equipment-loadout-action-section ${compact ? "is-compact" : ""}"><p class="kicker">AVAILABLE ACTION</p>${quickSwitch}</div>`;
    const assignable = getEquipmentItemEquipTargets(item, state);
    if (!assignable.length) return `<div class="equipment-shell-inspector-section equipment-loadout-action-section ${compact ? "is-compact" : ""}"><p class="equipment-action-unavailable">NO COMPATIBLE EMPTY TARGET</p></div>`;
    if (assignable.length === 1) {
      const entry = assignable[0];
      return `<div class="equipment-shell-inspector-section equipment-loadout-action-section ${compact ? "is-compact" : ""}">
        <span class="equipment-action-target"><small>Equip target</small><b>${escapeHtml(getEquipTargetLabel(entry))}</b></span>
        <button class="secondary-action is-compact" type="button" data-equipment-equip-target-id="${escapeHtml(entry.id)}" data-equipment-equip-item="${escapeHtml(item.id)}">Equip</button>
      </div>`;
    }
    return `<div class="equipment-shell-inspector-section equipment-loadout-action-section ${compact ? "is-compact" : ""}">
      <label class="equipment-inspector-target-select"><span>Equip target</span><select class="equipment-select-control" data-equipment-equip-target data-equipment-equip-item="${escapeHtml(item.id)}">
        ${assignable.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(getEquipTargetLabel(entry))}</option>`).join("")}
      </select></label>
      <button class="secondary-action is-compact" type="button" data-equipment-equip-selected="${escapeHtml(item.id)}">Equip</button>
    </div>`;
  }

  function getRotateAction(item = {}, state = {}) {
    if (!item.isInGrid || !item.containerHostId) return null;
    const footprint = getItemFootprint(item);
    const baseFootprint = getBaseItemFootprint(item);
    const symmetric = Number(baseFootprint.baseWidth || baseFootprint.width || 1) === Number(baseFootprint.baseHeight || baseFootprint.height || 1);
    if (symmetric) return null;
    const nextRotation = Number(footprint.rotation || 0) === 90 ? 0 : 90;
    const target = typeof window.WS_APP.findFirstEquipmentContainerPlacement === "function"
      ? window.WS_APP.findFirstEquipmentContainerPlacement(state, item.id, item.containerHostId, nextRotation)
      : null;
    return { enabled: Boolean(target), containerId: item.containerHostId, nextRotation };
  }

  function getCompatibleLocationSummary(item = {}, state = {}) {
    if (item.isEquipped) return getEquipmentItemLocationDescriptor(item, state).shortLabel;
    const targets = getEquipmentItemEquipTargets(item, state);
    if (!targets.length) return "No compatible layer or mount";
    const labels = targets.slice(0, 3).map(getEquipTargetLabel);
    return `${labels.join(" · ")}${targets.length > 3 ? ` +${targets.length - 3}` : ""}`;
  }

  function getEquipmentContainerSummary(item = {}, state = {}) {
    if (!item.isContainer) return null;
    const capacity = typeof window.WS_APP.getEquipmentContainerCapacityStatus === "function"
      ? window.WS_APP.getEquipmentContainerCapacityStatus(state, item.id, { state, container: item })
      : null;
    const profile = capacity?.containerProfile || item.containerProfile || {};
    const columns = Number(profile.gridColumns || 0);
    const rows = Number(profile.gridRows || 0);
    const slotCapacity = Math.max(0, Number(capacity?.slotCapacity ?? profile.slotCapacity ?? 0));
    const usedSlots = Math.max(0, Number(capacity?.usedSlots || 0));
    const itemCount = Math.max(0, Number(capacity?.gridItemCount || 0));
    return {
      grid: columns && rows ? `${columns}×${rows}` : `${slotCapacity} CELLS`,
      usedSlots,
      slotCapacity,
      itemCount,
      label: `${columns && rows ? `${columns}×${rows}` : `${slotCapacity} CELLS`} · ${usedSlots}/${slotCapacity} CELLS USED · ${itemCount} ITEM${itemCount === 1 ? "" : "S"}`
    };
  }

  function getEquipmentItemTooltipModel(item = {}, state = {}) {
    const footprint = getItemFootprint(item);
    const condition = getEquipmentConditionPresentation(item.condition);
    const descriptor = getEquipmentItemLocationDescriptor(item, state);
    const containerSummary = getEquipmentContainerSummary(item, state);
    const footprintLabel = `${footprint.width || 1}×${footprint.height || 1}`;
    const locationLabel = ["BODY MOUNT", "ITEM MOUNT", "BODY LAYER"].includes(descriptor.kind)
      ? descriptor.shortLabel
      : descriptor.label;
    const containerLine = containerSummary && containerSummary.slotCapacity > 0
      ? `${containerSummary.itemCount} ITEM${containerSummary.itemCount === 1 ? "" : "S"} · ${containerSummary.usedSlots}/${containerSummary.slotCapacity} CELLS USED`
      : "";
    return {
      title: String(getItemDisplayName(item) || item.id || "Unknown Equipment Item").trim(),
      lines: [
        `${getEquipmentItemTypeLabel(item)} · ${footprintLabel}`,
        `${condition.label} · ${condition.value}%`,
        containerLine || locationLabel || "UNKNOWN LOCATION"
      ],
      tone: item.isOrphan || descriptor.kind === "INVALID" ? "warning" : "default",
      kind: item.isContainer ? "container" : "item"
    };
  }

  function renderEquipmentItemTooltipAttributes(item = {}, state = {}, options = {}) {
    const model = getEquipmentItemTooltipModel(item, state);
    return renderTooltipAttributes(model.title, model.lines, { ...model, ...options });
  }

  function getAttachedItemMounts(item = {}, state = {}) {
    const slots = Array.isArray(item?.mountProfile?.slots) ? item.mountProfile.slots : [];
    const items = Array.isArray(state?.items) ? state.items : Object.values(state?.itemById || {});
    return slots.map((slot) => ({
      slot,
      occupant: items.find((candidate) => candidate?.isEquipped
        && candidate?.equippedLocation?.kind === "ITEM_MOUNT"
        && String(candidate.equippedLocation.ownerItemId || "") === String(item.id || "")
        && String(candidate.equippedLocation.mountId || "") === String(slot.id || "")) || null
    }));
  }

  function renderAttachedItemsSection(item = {}, state = {}) {
    const mounts = getAttachedItemMounts(item, state);
    if (!mounts.length) return "";
    const occupiedCount = mounts.filter((entry) => entry.occupant).length;
    return `<section class="equipment-item-inspector-section equipment-attached-items">
      <div class="equipment-item-inspector-section__head"><h6>Attached Items</h6><span>${escapeHtml(`${occupiedCount} / ${mounts.length}`)}</span></div>
      <div class="equipment-attached-items__list">
        ${mounts.map(({ slot, occupant }, index) => {
          const slotLabel = formatEquipmentMountLabel(slot.label || slot.id || "MOUNT");
          if (!occupant) return `<article class="equipment-attached-item is-empty"><div><small>${escapeHtml(slotLabel)}</small><b>EMPTY</b></div></article>`;
          const tooltip = renderEquipmentItemTooltipAttributes(occupant, state);
          return `<article class="equipment-attached-item is-occupied" ${tooltip}>
            <div class="equipment-attached-item__identity"><small>${escapeHtml(slotLabel)}</small><b>${escapeHtml(getItemDisplayName(occupant) || occupant.id)}</b><span>${escapeHtml(getEquipmentItemTypeLabel(occupant))}</span></div>
            <div class="equipment-attached-item__actions">
              <button class="secondary-action is-compact" type="button" data-equipment-select-item="${escapeHtml(occupant.id)}">Inspect</button>
              ${renderEquipmentUnequipControl(occupant, state, { compact: true, disclosureKey: `${item.id || "host"}-${slot.id || index}` })}
            </div>
          </article>`;
        }).join("")}
      </div>
    </section>`;
  }

  function renderCoverageSection(item = {}) {
    const coverage = Array.isArray(item?.equipProfile?.coverage) ? [...new Set(item.equipProfile.coverage.filter(Boolean))] : [];
    if (coverage.length < 2) return "";
    return `<section class="equipment-item-inspector-section equipment-item-coverage"><div class="equipment-item-inspector-section__head"><h6>Coverage</h6></div><p>${coverage.map((entry) => formatEquipmentRegionLabel(entry)).join(" · ")}</p></section>`;
  }

  function renderTechnicalDetails(item = {}) {
    const profile = item.equipProfile || null;
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const baseFootprint = getBaseItemFootprint(item);
    const serialNumber = String(item.serialNumber || item.hardwareIdentity?.serialNumber || "").trim();
    const lifecycle = String(item.lifecycleState || item.status || "").trim();
    const operatingStatus = String(item.operatingStatus || item.operationStatus || "").trim();
    const functionalType = String(item.itemTypeLabel || item.itemType || "GENERIC ITEM").trim();
    const typeStateSummary = typeof window.WS_APP.getItemTypeStateSummary === "function"
      ? window.WS_APP.getItemTypeStateSummary(item, item.itemState, item.itemTypeProfile)
      : [];
    const capabilities = Array.isArray(item.capabilities) ? item.capabilities : [];
    return `<details class="equipment-technical-details"><summary>Technical Details</summary>
      <div class="equipment-shell-inspector-grid equipment-shell-inspector-grid--technical">
        ${renderInspectorMeta("Instance ID", item.instanceId || item.id || item.itemId)}
        ${renderInspectorMeta("Definition / Catalog ID", item.definitionId || item.catalogId || item.itemId)}
        ${renderInspectorMeta("Category / Subtype", getEquipmentItemTypeLabel(item))}
        ${renderInspectorMeta("Functional type", functionalType)}
        ${typeStateSummary.length ? renderInspectorMeta("Type state", typeStateSummary.join(" · "), { wide: true }) : ""}
        ${capabilities.length ? renderInspectorMeta("Capabilities", capabilities.join(" · "), { wide: true }) : ""}
        ${item.legality ? renderInspectorMeta("Legality", item.legality) : ""}
        ${lifecycle ? renderInspectorMeta("Lifecycle", lifecycle) : ""}
        ${operatingStatus ? renderInspectorMeta("Operating status", operatingStatus) : ""}
        ${renderInspectorMeta("Base footprint", `${baseFootprint.width || 1}×${baseFootprint.height || 1}`)}
        ${item.isInGrid ? renderInspectorMeta("Rotation", `${getItemFootprint(item).rotation || 0}°`) : ""}
        ${profile?.allowedAnchors?.length ? renderInspectorMeta("Allowed anchors", profile.allowedAnchors.map((entry) => formatEquipmentRegionLabel(entry)).join(" / ")) : ""}
        ${profile?.layer ? renderInspectorMeta("Body layer", formatEquipmentSlotLabel(profile.layer)) : ""}
        ${profile?.coverage?.length ? renderInspectorMeta("Coverage", profile.coverage.map((entry) => formatEquipmentRegionLabel(entry)).join(" + ")) : ""}
        ${profile?.bodyMountSets?.length ? renderInspectorMeta("Body mounts", profile.bodyMountSets.map((set) => formatEquipmentMountLabel(set.label || set.id)).join(" · ")) : ""}
        ${profile?.itemMountTypes?.length ? renderInspectorMeta("Item mount types", profile.itemMountTypes.map((entry) => formatEquipmentMountLabel(entry)).join(" / ")) : ""}
        ${serialNumber ? renderInspectorMeta("Serial number", serialNumber, { wide: true }) : ""}
      </div>
      ${tags.length ? `<div class="equipment-shell-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
    </details>`;
  }

  function renderEquipmentItemEmptyState() {
    return `<div class="equipment-inspector-empty equipment-inspector-empty--command">
      <h6>No target selected</h6>
      <p class="file-empty">Select an item in a grid or select a body region.</p>
    </div>`;
  }

  function renderEquipmentItemDetail(state = {}, options = {}) {
    const item = state?.selectedItem || null;
    if (!item) return renderEquipmentItemEmptyState();
    const descriptor = getEquipmentItemLocationDescriptor(item, state);
    const rotateAction = getRotateAction(item, state);
    const returnRegionKey = String(state?.selections?.inspectorReturnRegion || "").trim().toUpperCase();
    const description = getEquipmentItemDescription(item);
    const manufacturer = getEquipmentManufacturerLabel(item);
    const displayName = getItemDisplayName(item);
    const catalogName = getItemCatalogName(item);
    const containerSummary = getEquipmentContainerSummary(item, state);
    const itemTypeOperations = typeof window.WS_APP.renderItemTypeOperationsPanel === "function"
      ? window.WS_APP.renderItemTypeOperationsPanel(item, state)
      : "";
    const backControl = returnRegionKey ? `<button class="secondary-action is-compact equipment-inspector-back" type="button" data-equipment-inspector-back-region="${escapeHtml(returnRegionKey)}">Return to region</button>` : "";
    return `<div class="equipment-item-detail ${options.compact === false ? "is-expanded" : "is-compact"}" data-equipment-selected-item-id="${escapeHtml(item.id || "")}">
      ${backControl}
      <header class="equipment-item-detail__identity">
        <p class="kicker">${escapeHtml(getEquipmentItemTypeLabel(item))}</p>
        <h6>${escapeHtml(displayName || item.id || "Equipment Item")}</h6>
        ${item.playerLabel ? `<small>${escapeHtml(`MODEL · ${catalogName}`)}</small>` : ""}
        ${manufacturer ? `<small>${escapeHtml(manufacturer)}</small>` : ""}
      </header>
      <div class="equipment-shell-inspector-grid equipment-shell-inspector-grid--command equipment-shell-inspector-grid--player">
        ${renderConditionMetric(item)}
        ${renderInspectorMeta("Size", formatEquipmentFootprintLabel(item))}
        ${renderInspectorMeta("Location", descriptor.label, { wide: true, warning: item.isOrphan })}
      </div>
      ${description ? `<section class="equipment-item-inspector-section equipment-item-description"><div class="equipment-item-inspector-section__head"><h6>Item Description</h6></div><p>${escapeHtml(description)}</p></section>` : ""}
      ${renderItemInstanceRenameControl(item)}
      ${itemTypeOperations}
      ${containerSummary ? `<section class="equipment-item-inspector-section equipment-container-inspector-summary"><div class="equipment-item-inspector-section__head"><h6>Grid</h6></div><p>${escapeHtml(containerSummary.label)}</p><button class="secondary-action is-compact" type="button" data-equipment-activate-grid-container="${escapeHtml(item.id || "")}">Open Container Grid</button></section>` : ""}
      <div class="equipment-inspector-actions">
        ${rotateAction?.enabled ? `<button class="secondary-action is-compact" type="button" data-equipment-grid-rotate-item="${escapeHtml(item.id || "")}" data-equipment-grid-container="${escapeHtml(rotateAction.containerId)}">Rotate</button>` : ""}
        ${rotateAction && !rotateAction.enabled ? `<p class="equipment-action-unavailable">NO SPACE FOR ROTATED FOOTPRINT</p>` : ""}
      </div>
      ${renderEquipmentItemEquipActions(item, state, { compact: true, disclosureKey: "inspector" })}
      ${renderAttachedItemsSection(item, state)}
      ${renderCoverageSection(item)}
      ${renderTechnicalDetails(item)}
      ${item.isOrphan ? `<p class="equipment-shell-note equipment-shell-note--error">Invalid orphan item. Assign it to a body layer, container grid or Housing.</p>` : ""}
    </div>`;
  }

  function getItemIndexCategories(state = {}) {
    const items = Array.isArray(state?.items) ? state.items : [];
    return [...new Set(items.map((item) => String(item.category || "UNCATEGORIZED").trim().toUpperCase() || "UNCATEGORIZED"))].sort((a, b) => a.localeCompare(b));
  }

  function getItemIndexSearchText(item = {}, state = {}) {
    const descriptor = getEquipmentItemLocationDescriptor(item, state);
    return [getItemDisplayName(item), getItemCatalogName(item), item.id, item.category, item.subtype, descriptor.label, ...(Array.isArray(item.tags) ? item.tags : [])].filter(Boolean).join(" ").toLowerCase();
  }

  function getItemIndexSection(item = {}, state = {}) {
    if (item?.isEquipped || item?.isInstalledInItem) return "EQUIPPED";
    if (item?.isStored) return "STORED";
    if (item?.isInGrid) {
      const visited = new Set();
      let hostId = String(item.containerHostId || "").trim();
      while (hostId && !visited.has(hostId)) {
        visited.add(hostId);
        const host = state?.itemById?.[hostId] || null;
        if (!host) break;
        if (host.isStored) return "STORED";
        hostId = host.isInGrid ? String(host.containerHostId || "").trim() : "";
      }
      return "CONTAINERS";
    }
    return "CONTAINERS";
  }

  function renderItemIndexSection(section = "", items = [], state = {}) {
    const label = section === "EQUIPPED" ? "Equipped" : section === "STORED" ? "Stored" : "Containers";
    return `<section class="equipment-item-index-section" data-equipment-item-index-section="${escapeHtml(section)}">
      <div class="equipment-item-index-section__head"><h6>${escapeHtml(label)}</h6><span>${escapeHtml(items.length)}</span></div>
      <div class="equipment-item-index-section__rows">${items.length ? items.map((item) => renderItemIndexRow(item, state)).join("") : `<p class="file-empty">No items in this section.</p>`}</div>
    </section>`;
  }

  function renderItemIndexRow(item = {}, state = {}) {
    const descriptor = getEquipmentItemLocationDescriptor(item, state);
    const selected = getSelectedItemId(state) === String(item.id || "");
    const category = String(item.category || "UNCATEGORIZED").trim().toUpperCase() || "UNCATEGORIZED";
    const tooltip = renderEquipmentItemTooltipAttributes(item, state);
    return `<article class="equipment-item-index-row ${selected ? "is-selected" : ""} ${item.isOrphan ? "is-invalid" : ""}"
      data-equipment-item-index-row data-equipment-item-index-category="${escapeHtml(category)}" data-equipment-item-index-keywords="${escapeHtml(getItemIndexSearchText(item, state))}">
      <button class="equipment-item-index-row__main" type="button" data-equipment-item-index-select="${escapeHtml(item.id || "")}" ${tooltip}>
        <b>${escapeHtml(getItemDisplayName(item) || item.id || "Equipment Item")}</b><small>${escapeHtml(item.playerLabel ? `${getItemCatalogName(item)} · ${descriptor.label}` : descriptor.label)}</small>
      </button>
      <button class="secondary-action is-compact" type="button" data-equipment-item-index-locate="${escapeHtml(item.id || "")}">Locate</button>
    </article>`;
  }

  function renderEquipmentItemIndex(state = {}) {
    const selections = state?.selections || {};
    if (selections.itemIndexOpen !== true) return "";
    const items = Array.isArray(state?.items) ? state.items : [];
    const categories = getItemIndexCategories(state);
    const query = String(selections.itemIndexQuery || "");
    const category = String(selections.itemIndexCategory || "ALL").trim().toUpperCase() || "ALL";
    return `<div class="equipment-item-index-overlay" data-equipment-item-index-overlay>
      <div class="equipment-item-index-backdrop" data-equipment-item-index-close aria-hidden="true"></div>
      <aside class="equipment-item-index-drawer" data-equipment-item-index-drawer aria-label="Item Index">
        <div class="equipment-item-index-head"><div><p class="kicker">CYBERGRID / ITEM INDEX</p><h5>Locate Physical Item</h5></div>
          <button class="secondary-action is-compact" type="button" data-equipment-item-index-close>Close</button></div>
        <div class="equipment-item-index-controls">
          <label><span>Search</span><input type="search" value="${escapeHtml(query)}" placeholder="Item name" data-equipment-item-index-search></label>
          <label><span>Category</span><select data-equipment-item-index-category><option value="ALL" ${category === "ALL" ? "selected" : ""}>All categories</option>
            ${categories.map((entry) => `<option value="${escapeHtml(entry)}" ${category === entry ? "selected" : ""}>${escapeHtml(entry)}</option>`).join("")}</select></label>
        </div>
        <div class="equipment-item-index-list" data-equipment-item-index-list>
          ${items.length ? ["EQUIPPED", "CONTAINERS", "STORED"].map((section) => renderItemIndexSection(section, items.filter((item) => getItemIndexSection(item, state) === section), state)).join("") : `<p class="file-empty">No physical items registered.</p>`}
          <p class="file-empty equipment-item-index-empty" data-equipment-item-index-empty hidden>No items match the current filters.</p>
        </div>
      </aside>
    </div>`;
  }

  window.WS_APP.equipmentItemsPanel = {
    version: EQUIPMENT_ITEMS_PANEL_VERSION,
    renderEquipmentSummaryMetrics,
    renderEquipmentItemDetail,
    renderEquipmentItemEquipActions,
    renderEquipmentUnequipControl,
    renderEquipmentItemIndex,
    renderItemInstanceRenameControl,
    getItemDisplayName,
    getItemCatalogName,
    getEquipmentItemEquipTargets,
    getEquipmentItemLocationDescriptor,
    getItemLocationLabel,
    getEquipmentConditionPresentation,
    getEquipmentItemTypeLabel,
    formatEquipmentLabel,
    formatEquipmentCategoryLabel,
    formatEquipmentSubtypeLabel,
    formatEquipmentRegionLabel,
    formatEquipmentSlotLabel,
    formatEquipmentContainerTypeLabel,
    formatEquipmentMountLabel,
    formatEquipmentUiToken,
    getEquipmentItemInspectorBadge,
    formatEquipmentFootprintLabel,
    getEquipmentItemTooltipModel,
    renderEquipmentItemTooltipAttributes,
    renderTooltipAttributes
  };
  Object.assign(window.WS_APP, {
    renderEquipmentSummaryMetrics,
    renderEquipmentItemDetail,
    renderEquipmentItemEquipActions,
    renderEquipmentUnequipControl,
    renderEquipmentItemIndex,
    renderItemInstanceRenameControl,
    getItemDisplayName,
    getItemCatalogName,
    getEquipmentItemEquipTargets,
    getEquipmentItemLocationDescriptor,
    getEquipmentItemLocationLabel: getItemLocationLabel,
    getEquipmentConditionPresentation,
    getEquipmentItemTypeLabel,
    formatEquipmentLabel,
    formatEquipmentCategoryLabel,
    formatEquipmentSubtypeLabel,
    formatEquipmentRegionLabel,
    formatEquipmentSlotLabel,
    formatEquipmentContainerTypeLabel,
    formatEquipmentMountLabel,
    formatEquipmentUiToken,
    getEquipmentItemInspectorBadge,
    formatEquipmentFootprintLabel,
    getEquipmentItemTooltipModel,
    renderEquipmentItemTooltipAttributes,
    renderEquipmentTooltipAttributes: renderTooltipAttributes
  });
})();
