window.WS_APP = window.WS_APP || {};

(function initEquipmentBodyRegionsPanel() {
  const BODY_REGIONS_PANEL_VERSION = "6.2.3x";
  const escapeHtml = window.WS_APP.escapeEquipmentHtml || ((value = "") => String(value ?? ""));

  function formatRegionLabel(value = "") {
    if (typeof window.WS_APP.formatEquipmentRegionLabel === "function") return window.WS_APP.formatEquipmentRegionLabel(value);
    return String(value || "").trim().replace(/[_-]+/g, " ").toUpperCase();
  }

  function formatSlotLabel(value = "", regionKey = "") {
    if (typeof window.WS_APP.formatEquipmentSlotLabel === "function") return window.WS_APP.formatEquipmentSlotLabel(value, { regionKey });
    return String(value || "").trim().replace(/[_-]+/g, " ").toUpperCase();
  }

  function formatMountLabel(value = "") {
    if (typeof window.WS_APP.formatEquipmentMountLabel === "function") return window.WS_APP.formatEquipmentMountLabel(value);
    return String(value || "").trim().replace(/[_-]+/g, " ").toUpperCase();
  }

  function getSelectedRegionKey(state = {}) {
    return String(state?.selections?.selectedRegion || "").trim().toUpperCase();
  }

  function getSelectedContainer(state = {}) {
    const id = String(state?.selections?.selectedContainerId || "").trim();
    return id ? state?.itemById?.[id] || null : null;
  }

  function getVisibleRegions(state = {}) {
    const regions = (Array.isArray(state?.bodyRegions) ? state.bodyRegions : []).filter((region) => region?.bodymapHidden !== true);
    const filter = String(state?.selections?.selectedBodyRegionFilter || "all").trim().toLowerCase();
    if (filter === "occupied") return regions.filter((region) => Number(region.occupiedCount || 0) > 0);
    if (filter === "available") return regions.filter((region) => (region.visibleLayers || []).some((entry) => !entry.occupied) || (region.mounts || []).some((entry) => !entry.occupied && entry.blocked !== true) || (region.itemMounts || []).some((entry) => !entry.occupied));
    if (filter === "front") return regions.filter((region) => region.visibility !== "back");
    if (filter === "back") return regions.filter((region) => region.visibility !== "front");
    return regions;
  }

  function renderRegionFilters(state = {}) {
    const current = String(state?.selections?.selectedBodyRegionFilter || "all").trim().toLowerCase();
    return `<div class="equipment-region-filters" role="group" aria-label="Body region filter">
      ${["all", "occupied", "available", "front", "back"].map((filter) => `<button class="equipment-region-filter ${current === filter ? "is-active" : ""}" type="button" data-equipment-region-filter="${filter}" aria-pressed="${current === filter ? "true" : "false"}">${escapeHtml(filter)}</button>`).join("")}
    </div>`;
  }

  function getRegionStatus(region = {}) {
    const stack = Array.isArray(region.stack) ? region.stack : [];
    if (region.hasConflict === true) return "conflict";
    if (stack.some((entry) => entry.role === "PRIMARY")) return "occupied";
    if (stack.some((entry) => entry.role === "RESERVED")) return "reserved";
    if (Number(region.occupiedMountCount || 0) > 0) return "mounted";
    return "empty";
  }

  function getRegionSummary(region = {}) {
    const names = [
      ...(region.stack || []).map((entry) => entry.occupant?.name),
      ...(region.mounts || []).filter((entry) => entry.occupied).map((entry) => entry.occupant?.name),
      ...(region.itemMounts || []).filter((entry) => entry.occupied).map((entry) => entry.occupant?.name)
    ].filter(Boolean);
    const unique = [...new Set(names)];
    return unique.length ? unique.slice(0, 2).join(" · ") + (unique.length > 2 ? ` +${unique.length - 2}` : "") : "No occupied layers or mounts";
  }

  function getRegionSlotCollection(region = {}) {
    const sources = region?.isComposite === true && Array.isArray(region.childRegions) ? region.childRegions : [region];
    return sources.reduce((result, source) => {
      result.layers.push(...(Array.isArray(source?.visibleLayers) ? source.visibleLayers : []));
      result.mounts.push(...(Array.isArray(source?.mounts) ? source.mounts : []));
      result.itemMounts.push(...(Array.isArray(source?.itemMounts) ? source.itemMounts : []));
      return result;
    }, { layers: [], mounts: [], itemMounts: [] });
  }

  function getEquipmentRegionTooltipModel(region = {}, options = {}) {
    const slots = getRegionSlotCollection(region);
    const allSlots = [...slots.layers, ...slots.mounts, ...slots.itemMounts];
    const occupiedFromSlots = allSlots.filter((entry) => Boolean(entry?.occupied || entry?.occupant || ["PRIMARY", "RESERVED"].includes(String(entry?.role || "").toUpperCase()))).length;
    const occupied = allSlots.length ? occupiedFromSlots : Math.max(0, Number(region.occupiedCount || 0));
    const empty = Math.max(0, allSlots.length - occupiedFromSlots);
    const slotSummary = slots.mounts.length
      ? `${slots.mounts.length} BODY MOUNT${slots.mounts.length === 1 ? "" : "S"}`
      : slots.layers.length
        ? `${slots.layers.length} BODY LAYER${slots.layers.length === 1 ? "" : "S"}`
        : slots.itemMounts.length
          ? `${slots.itemMounts.length} ITEM MOUNT${slots.itemMounts.length === 1 ? "" : "S"}`
          : "NO EQUIPMENT SLOTS";
    return {
      title: formatRegionLabel(region.label || region.key || "BODY REGION"),
      lines: [
        `${occupied} OCCUPIED · ${empty} EMPTY`,
        slotSummary,
        String(options.viewHint || "CLICK TO OPEN REGION").trim()
      ],
      tone: region.hasConflict === true ? "warning" : "default",
      kind: "region"
    };
  }

  function renderEquipmentRegionTooltipAttributes(region = {}, options = {}) {
    const model = getEquipmentRegionTooltipModel(region, options);
    return typeof window.WS_APP.renderEquipmentTooltipAttributes === "function"
      ? window.WS_APP.renderEquipmentTooltipAttributes(model.title, model.lines, model)
      : "";
  }

  function renderItemTooltipAttributes(item = null, state = {}) {
    return item && typeof window.WS_APP.renderEquipmentItemTooltipAttributes === "function"
      ? window.WS_APP.renderEquipmentItemTooltipAttributes(item, state)
      : "";
  }

  function getBodyMountAcceptanceLabel(mount = {}, state = {}) {
    const key = String(mount.key || "").trim().toUpperCase();
    if (key.includes("THIGH")) return "ACCEPTS THIGH HOLSTER / CARRIER";
    if (key.includes("SHIN")) return "ACCEPTS SHIN MOUNT";
    if (key.includes("WRIST") || key.includes("ACCESSORY_1")) return "ACCEPTS WRIST ACCESSORY";
    if (key.includes("FOREARM") || key.includes("ACCESSORY_2")) return "ACCEPTS FOREARM ACCESSORY";
    if (key.includes("SHOULDER")) return "ACCEPTS CARRY CONTAINER";
    if (key.includes("IMPLANT_PORT")) return "ACCEPTS PORT DEVICE";
    const definition = state?.bodyMountDefinitions?.find((entry) => entry.key === mount.key) || null;
    const accepted = Array.isArray(definition?.acceptedTags) ? definition.acceptedTags.slice(0, 3) : [];
    return accepted.length ? `ACCEPTS ${accepted.join(" / ")}` : "BODY MOUNT";
  }

  function renderSlotTooltipAttributes(title = "", lines = [], options = {}) {
    return typeof window.WS_APP.renderEquipmentTooltipAttributes === "function"
      ? window.WS_APP.renderEquipmentTooltipAttributes(title, lines, { kind: "slot", ...options })
      : "";
  }

  function renderRegionRow(region = {}, state = {}) {
    const selected = getSelectedRegionKey(state) === String(region.key || "");
    const status = getRegionStatus(region);
    const available = [
      ...(region.visibleLayers || []).map((entry) => entry.key),
      ...(region.mounts || []).map((entry) => entry.label),
      ...(region.itemMounts || []).map((entry) => entry.slot?.label || entry.label)
    ];
    const tooltip = renderEquipmentRegionTooltipAttributes(region);
    return `<button class="equipment-shell-row equipment-shell-row--button equipment-body-region-row is-${escapeHtml(status)} ${selected ? "is-selected" : ""}" type="button"
      data-equipment-region-key="${escapeHtml(region.key || "")}" data-equipment-select-region="${escapeHtml(region.key || "")}" aria-pressed="${selected ? "true" : "false"}" ${tooltip}>
      <span><b>${escapeHtml(formatRegionLabel(region.label || region.key))}</b><small>${escapeHtml(getRegionSummary(region))}</small></span>
      <span class="equipment-shell-row__meta"><small>${escapeHtml(available.join(" / ") || "NO SLOTS")}</small><b>${escapeHtml(region.occupiedCount || 0)}</b></span>
    </button>`;
  }

  function getUnequipAction(occupant = null, state = {}, returnRegionKey = "", disclosureKey = "") {
    if (!occupant) return "";
    const unequip = typeof window.WS_APP.renderEquipmentUnequipControl === "function"
      ? window.WS_APP.renderEquipmentUnequipControl(occupant, state, { compact: true, disclosureKey: disclosureKey || `${returnRegionKey}-${occupant.id || "item"}` })
      : "";
    return `<div class="equipment-body-layer-row__actions">
      <button class="secondary-action is-compact" type="button" data-equipment-select-item="${escapeHtml(occupant.id)}" data-equipment-return-region="${escapeHtml(returnRegionKey)}">Inspect</button>
      ${unequip}
    </div>`;
  }

  function getSlotStatusLabel(role = "EMPTY", occupied = false) {
    const normalized = String(role || "EMPTY").trim().toUpperCase();
    if (!occupied) return "EMPTY";
    return normalized === "RESERVED" ? "RESERVED" : "EQUIPPED";
  }

  function getMountDisplayLabel(value = "") {
    const token = String(value || "").trim().toUpperCase();
    const exact = {
      LEFT_FOREARM_ACCESSORY_1: "WRIST",
      LEFT_FOREARM_ACCESSORY_2: "FOREARM",
      RIGHT_FOREARM_ACCESSORY_1: "WRIST",
      RIGHT_FOREARM_ACCESSORY_2: "FOREARM",
      LEFT_SHOULDER_CARRY: "CONTAINER",
      RIGHT_SHOULDER_CARRY: "CONTAINER",
      LEFT_THIGH_HOLSTER: "MOUNT",
      RIGHT_THIGH_HOLSTER: "MOUNT",
      IMPLANT_PORT: "PORT",
      BACK_CARRY: "CARRY",
      WAIST_CARRY: "CARRY"
    };
    if (exact[token]) return exact[token];
    if (token.includes("HOLSTER")) return "HOLSTER";
    if (token.includes("WRIST")) return "WRIST";
    if (token.includes("FOREARM")) return "FOREARM";
    if (token.includes("ACCESSORY")) return "ACCESSORY";
    if (token.includes("CARRY") || token.includes("SLING")) return "CARRY";
    if (token.includes("PORT")) return "PORT";
    if (token.includes("SHEATH") || token.includes("SCABBARD")) return "SHEATH";
    if (token.includes("CHEST_RIG")) return "CHEST RIG";
    if (token.includes("TOOL")) return "TOOL";
    return formatMountLabel(token) || "MOUNT";
  }

  function getTargetRegion(target = {}, state = {}) {
    const bodyRegions = Array.isArray(state?.bodyRegions) ? state.bodyRegions : [];
    if (target.kind === "LAYER") return bodyRegions.find((entry) => entry.key === target.anchor) || null;
    if (target.kind === "BODY_MOUNT") {
      const mountId = target.mountSet?.mountIds?.[0] || "";
      const definitions = Array.isArray(state?.bodyMountDefinitions) ? state.bodyMountDefinitions : [];
      const definition = definitions.find((entry) => entry.key === mountId) || null;
      return bodyRegions.find((entry) => entry.key === definition?.regionKey) || null;
    }
    return null;
  }

  function getQuickEquipSlotLabel(target = {}) {
    if (target.kind === "LAYER") return formatSlotLabel(target.layer || "LAYER", target.anchor || "");
    if (target.kind === "BODY_MOUNT") return getMountDisplayLabel(target.mountSet?.mountIds?.[0] || target.label || target.id);
    if (target.kind === "ITEM_MOUNT") return getMountDisplayLabel(target.mountId || target.label || target.id);
    return "MOUNT";
  }

  function getQuickEquipTargetLabel(target = {}, state = {}, region = {}) {
    const targetRegion = getTargetRegion(target, state);
    if (targetRegion?.label) return formatRegionLabel(targetRegion.label);
    if (target.kind === "ITEM_MOUNT") return String(target.owner?.name || target.label || "ITEM MOUNT").trim().toUpperCase();
    return formatRegionLabel(region.label || region.key || "TARGET");
  }

  function getFriendlyTargetLabel(target = {}, region = {}, state = {}) {
    return `${getQuickEquipTargetLabel(target, state, region)} / ${getQuickEquipSlotLabel(target)}`;
  }

  function getConditionClass(item = {}) {
    if (!item) return "";
    const presentation = typeof window.WS_APP.getEquipmentConditionPresentation === "function"
      ? window.WS_APP.getEquipmentConditionPresentation(item.condition)
      : null;
    if (presentation?.className) return presentation.className;
    const value = Math.max(0, Math.min(100, Math.round(Number(item.condition ?? 100)) || 0));
    if (value < 15) return "is-broken";
    if (value < 45) return "is-damaged";
    if (value < 71) return "is-worn";
    return "";
  }

  function getItemTypeLabel(item = {}) {
    if (typeof window.WS_APP.getEquipmentItemTypeLabel === "function") return window.WS_APP.getEquipmentItemTypeLabel(item);
    return [item.category, item.subtype].map((entry) => String(entry || "").trim().replace(/[_-]+/g, " ").toUpperCase()).filter(Boolean).join(" / ") || "ITEM";
  }

  function renderSlotIdentity(slotLabel = "", occupant = null, options = {}) {
    const status = String(options.status || (occupant ? "EQUIPPED" : "EMPTY")).trim().toUpperCase();
    const secondary = String(options.secondary || "").trim();
    const displaySlotLabel = formatSlotLabel(slotLabel || "SLOT", options.regionKey || "");
    if (!occupant) {
      return `<div class="equipment-body-layer-row__identity equipment-slot-identity-copy is-empty">${secondary ? `<span>${escapeHtml(secondary)}</span>` : ""}<span class="equipment-slot-status-badge is-${escapeHtml(status.toLowerCase())}">${escapeHtml(status)}</span></div>`;
    }
    return `<div class="equipment-body-layer-row__identity equipment-slot-identity-copy"><small>${escapeHtml(displaySlotLabel || "SLOT")}</small><b>${escapeHtml(occupant.name || occupant.id || "ITEM")}</b>${options.showItemMeta === false ? "" : `<span>${escapeHtml(getItemTypeLabel(occupant))}</span>`}<span class="equipment-slot-status-badge is-${escapeHtml(status.toLowerCase())}">${escapeHtml(status)}</span></div>`;
  }

  function getBlockedMountMessage(mount = {}) {
    const code = String(mount.blockedReason || mount.validation?.code || "").trim().toUpperCase();
    if (code.includes("FOREARM_ARMOR")) return "Blocked by forearm armor.";
    if (code.includes("ARMOR")) return "Blocked by equipped armor.";
    return String(mount.validation?.message || mount.blockedMessage || "This mount is currently unavailable.").trim();
  }

  function renderLayerRow(layer = {}, region = {}, state = {}) {
    const occupant = layer.occupant || null;
    const role = String(layer.role || "EMPTY").trim().toUpperCase();
    const status = getSlotStatusLabel(role, Boolean(occupant));
    const reserved = role === "RESERVED" && Boolean(occupant);
    const slotLabel = formatSlotLabel(layer.label || layer.key || "LAYER", region.key || "");
    const regionLabel = formatRegionLabel(region.label || region.key || "BODY");
    const conditionClass = occupant && !reserved ? getConditionClass(occupant) : "";
    const classes = [`is-${role.toLowerCase()}`, occupant ? "is-occupied" : "is-empty", reserved ? "is-reserved" : "", conditionClass].filter(Boolean).join(" ");
    const title = `${regionLabel} / ${slotLabel}`;
    const tooltip = occupant && !reserved
      ? renderItemTooltipAttributes(occupant, state)
      : renderSlotTooltipAttributes(title, [status, reserved ? `RESERVED BY ${occupant.name || occupant.id}` : `ACCEPTS ${slotLabel} LAYER`]);
    const interaction = occupant && !reserved
      ? `data-equipment-select-item="${escapeHtml(occupant.id)}" data-equipment-return-region="${escapeHtml(region.key || "")}" role="button" tabindex="0"`
      : `tabindex="0" aria-label="${escapeHtml(title)} / ${escapeHtml(status)}"`;
    return `<div class="equipment-loadout-slot-tile equipment-body-layer-row ${classes}" data-equipment-region-layer="${escapeHtml(`${region.key}:${layer.key}`)}" data-equipment-slot-label="${escapeHtml(slotLabel)}" ${interaction} ${tooltip}>
      ${occupant || reserved ? "" : `<span class="equipment-loadout-slot-tile__ghost" aria-hidden="true">${escapeHtml(slotLabel)}</span>`}
      ${reserved ? renderSlotIdentity(slotLabel, null, { status: "RESERVED", secondary: `Reserved by ${occupant.name || occupant.id}`, regionKey: region.key }) : renderSlotIdentity(slotLabel, occupant, { status, regionKey: region.key })}
      ${reserved ? "" : getUnequipAction(occupant, state, region.key, `${region.key}-${layer.key}`)}
    </div>`;
  }

  function renderBodyMountRow(mount = {}, region = {}, state = {}) {
    const occupant = mount.occupant || null;
    const blocked = mount.blocked === true && !occupant;
    const slotLabel = getMountDisplayLabel(mount.key || mount.label || "MOUNT");
    const status = occupant ? "EQUIPPED" : blocked ? "BLOCKED" : "EMPTY";
    const fullLabel = formatMountLabel(mount.label || state?.bodyMountDefinitions?.find((entry) => entry.key === mount.key)?.label || slotLabel);
    const tooltip = occupant
      ? renderItemTooltipAttributes(occupant, state)
      : renderSlotTooltipAttributes(fullLabel, [status, blocked ? getBlockedMountMessage(mount).toUpperCase() : getBodyMountAcceptanceLabel(mount, state)], { tone: blocked ? "warning" : "default" });
    const interaction = occupant
      ? `data-equipment-select-item="${escapeHtml(occupant.id)}" data-equipment-return-region="${escapeHtml(region.key || "")}" role="button" tabindex="0"`
      : `tabindex="0" aria-label="${escapeHtml(fullLabel)} / ${escapeHtml(status)}"`;
    const conditionClass = occupant ? getConditionClass(occupant) : "";
    return `<div class="equipment-loadout-slot-tile equipment-body-mount-row ${occupant ? "is-occupied" : blocked ? "is-blocked" : "is-empty"} ${conditionClass}" data-equipment-body-mount="${escapeHtml(mount.key || "")}" data-equipment-slot-label="${escapeHtml(slotLabel)}" ${interaction} ${tooltip}>
      ${occupant || blocked ? "" : `<span class="equipment-loadout-slot-tile__ghost" aria-hidden="true">${escapeHtml(slotLabel)}</span>`}
      ${renderSlotIdentity(slotLabel, occupant, { status, secondary: blocked ? getBlockedMountMessage(mount) : "" })}
      ${getUnequipAction(occupant, state, region.key, `${region.key}-${mount.key || "mount"}`)}
    </div>`;
  }

  function renderItemMountRow(mount = {}, region = {}, state = {}) {
    const occupant = mount.occupant || null;
    const owner = mount.owner || null;
    const slotLabel = getMountDisplayLabel(mount.slot?.label || mount.label || mount.key || "MOUNT");
    const fullLabel = `${owner?.name || formatRegionLabel(region.label || region.key || "ITEM")} / ${formatMountLabel(mount.slot?.label || mount.label || slotLabel)}`;
    const acceptedType = formatMountLabel(mount.slot?.type || mount.slot?.mountType || slotLabel || "ITEM");
    const tooltip = occupant
      ? renderItemTooltipAttributes(occupant, state)
      : renderSlotTooltipAttributes(fullLabel, ["EMPTY", `ACCEPTS ${acceptedType}`]);
    const interaction = occupant
      ? `data-equipment-select-item="${escapeHtml(occupant.id)}" data-equipment-return-region="${escapeHtml(region.key || "")}" role="button" tabindex="0"`
      : `tabindex="0" aria-label="${escapeHtml(fullLabel)} / EMPTY"`;
    const conditionClass = occupant ? getConditionClass(occupant) : "";
    return `<div class="equipment-loadout-slot-tile equipment-item-mount-row ${occupant ? "is-occupied" : "is-empty"} ${conditionClass}" data-equipment-item-mount="${escapeHtml(mount.key || "")}" data-equipment-slot-label="${escapeHtml(slotLabel)}" ${interaction} ${tooltip}>
      ${occupant ? "" : `<span class="equipment-loadout-slot-tile__ghost" aria-hidden="true">${escapeHtml(slotLabel)}</span>`}
      ${renderSlotIdentity(slotLabel, occupant, { status: occupant ? "EQUIPPED" : "EMPTY", secondary: occupant && owner ? `Mounted on ${owner.name || owner.id}` : "" })}
      ${getUnequipAction(occupant, state, region.key, `${region.key}-${mount.key || mount.slot?.id || "item-mount"}`)}
    </div>`;
  }

  function targetBelongsToRegion(target = {}, region = {}, state = {}) {
    const regionKeys = new Set([region.key, ...(Array.isArray(region.childRegionKeys) ? region.childRegionKeys : [])].filter(Boolean));
    if (target.kind === "LAYER") return regionKeys.has(target.anchor);
    if (target.kind === "BODY_MOUNT") {
      const ids = target.mountSet?.mountIds || [];
      return ids.some((id) => regionKeys.has(state?.bodyMountDefinitions?.find((entry) => entry.key === id)?.regionKey || ""));
    }
    if (target.kind === "ITEM_MOUNT") return (region.itemMounts || []).some((entry) => entry.ownerItemId === target.ownerItemId && entry.slot?.id === target.mountId);
    return false;
  }

  function getRegionAssignmentOptions(state = {}, region = {}) {
    const gridItems = Array.isArray(state?.inventory?.gridItems) ? state.inventory.gridItems : [];
    const targets = [];
    const blockedItems = [];
    gridItems.forEach((item) => {
      const itemTargets = typeof window.WS_APP.getEquipmentEquipTargets === "function"
        ? window.WS_APP.getEquipmentEquipTargets({ id: state.citizenId }, item.id, { state, item })
        : [];
      itemTargets.filter((target) => targetBelongsToRegion(target, region, state)).forEach((target) => {
        const entry = { ...target, item, region, playerLabel: getFriendlyTargetLabel(target, region, state), quickSlotLabel: getQuickEquipSlotLabel(target), quickTargetLabel: getQuickEquipTargetLabel(target, state, region) };
        if (target.validation?.ok) targets.push(entry); else blockedItems.push(entry);
      });
    });
    return { targets, blockedItems };
  }

  function renderAssignmentCandidate(target = {}) {
    const item = target.item || {};
    return `<button class="equipment-slot-candidate-action" type="button" data-equipment-equip-target-id="${escapeHtml(target.id || "")}" data-equipment-equip-item="${escapeHtml(item.id || "")}" aria-label="Equip ${escapeHtml(item.name || "Item")} to ${escapeHtml(target.playerLabel || "compatible slot")}">
      <b>${escapeHtml(item.name || "Item")}</b><small>${escapeHtml(target.quickTargetLabel || target.playerLabel || "Compatible slot")}</small>
    </button>`;
  }

  function renderQuickEquip(targets = []) {
    if (!Array.isArray(targets) || !targets.length) return "";
    const groups = new Map();
    targets.slice(0, 24).forEach((target) => {
      const key = String(target.quickSlotLabel || "MOUNT").trim().toUpperCase() || "MOUNT";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(target);
    });
    return `<section class="equipment-slot-detail__compat equipment-quick-equip"><h6>Quick Equip</h6><div class="equipment-quick-equip__groups">
      ${[...groups.entries()].map(([label, entries]) => `<section class="equipment-quick-equip__group"><div class="equipment-quick-equip__group-head"><b>${escapeHtml(label)}</b><span>${escapeHtml(entries.length)}</span></div><div class="equipment-slot-candidates equipment-slot-candidates--actions">${entries.map(renderAssignmentCandidate).join("")}</div></section>`).join("")}
    </div></section>`;
  }

  function renderBlockedCandidates(blocked = []) {
    if (!Array.isArray(blocked) || !blocked.length) return "";
    return `<details class="equipment-rule-blocked"><summary>Blocked targets (${escapeHtml(blocked.length)})</summary><div class="equipment-shell-list equipment-shell-list--compact">
      ${blocked.slice(0, 10).map((entry) => `<div class="equipment-shell-row equipment-rule-blocked-row"><span><b>${escapeHtml(entry.item?.name || entry.item?.id || "Item")}</b><small>${escapeHtml(entry.playerLabel || entry.label || entry.id || "TARGET")}</small></span><span class="equipment-shell-row__meta"><small>${escapeHtml(entry.validation?.message || "Target is not available.")}</small></span></div>`).join("")}
    </div></details>`;
  }

  function renderShoulderArmorSlot(region = {}, state = {}) {
    const armorLayers = (region.childRegions || []).flatMap((child) => (child.visibleLayers || [])
      .filter((layer) => layer.key === "ARMOR")
      .map((layer) => ({ ...layer, sourceRegionKey: child.key, sourceRegionLabel: child.label })));
    const occupied = armorLayers.filter((layer) => layer.occupied && layer.occupant);
    const uniqueByItem = new Map();
    occupied.forEach((layer) => {
      const id = String(layer.occupant?.id || "");
      if (!uniqueByItem.has(id)) uniqueByItem.set(id, { occupant: layer.occupant, sources: [] });
      uniqueByItem.get(id).sources.push(formatRegionLabel(layer.sourceRegionLabel || layer.sourceRegionKey));
    });
    const unique = [...uniqueByItem.values()];
    if (!unique.length) {
      const tooltip = renderSlotTooltipAttributes("PAIRED SHOULDER ARMOR", ["EMPTY", "ACCEPTS SHOULDER ARMOR"]);
      return `<div class="equipment-loadout-slot-tile equipment-body-layer-row is-empty" data-equipment-slot-label="SHOULDER ARMOR" tabindex="0" aria-label="Paired shoulder armor / empty" ${tooltip}>${renderSlotIdentity("PAIRED SHOULDER ARMOR", null, { status: "EMPTY" })}</div>`;
    }
    return `<div class="equipment-composite-armor-slot ${unique.length > 1 ? "is-conflict" : ""}">
      <div class="equipment-composite-armor-slot__head"><b>PAIRED SHOULDER ARMOR</b><span class="equipment-slot-status-badge ${unique.length > 1 ? "is-blocked" : "is-equipped"}">${unique.length > 1 ? "CONFLICT" : "EQUIPPED"}</span></div>
      <div class="equipment-composite-armor-slot__items">${unique.map(({ occupant, sources }, index) => `<div class="equipment-loadout-slot-tile equipment-body-layer-row is-occupied" data-equipment-select-item="${escapeHtml(occupant.id)}" data-equipment-return-region="${escapeHtml(region.key)}" role="button" tabindex="0" ${renderItemTooltipAttributes(occupant, state)}>
        ${renderSlotIdentity("SHOULDER ARMOR", occupant, { status: "EQUIPPED" })}
        <p class="equipment-slot-coverage-note">Covers ${escapeHtml(sources.join(" + ").toUpperCase())}</p>
        ${getUnequipAction(occupant, state, region.key, `${region.key}-paired-armor-${index}`)}
      </div>`).join("")}</div>
    </div>`;
  }

  function getRegionInspectorSubtitle(region = {}) {
    const slotMode = String(region.slotMode || "").toUpperCase();
    const exact = { SHOULDERS: "SHOULDER MOUNTS", FOREARMS: "FOREARM SLOTS", THIGHS: "THIGH MOUNTS", SHINS: "SHIN MOUNTS" };
    if (exact[slotMode]) return exact[slotMode];
    if ((region.mounts || []).length && (region.visibleLayers || []).length) return "LAYERS & MOUNTS";
    if ((region.mounts || []).length) return "BODY MOUNTS";
    if ((region.itemMounts || []).length) return "ITEM MOUNTS";
    return "BODY LAYERS";
  }

  function renderRegionInspectorIntro(region = {}) {
    return `<header class="equipment-region-inspector-intro"><p class="kicker">${escapeHtml(getRegionInspectorSubtitle(region))}</p><h6>${escapeHtml(formatRegionLabel(region.label || region.key || "BODY REGION"))}</h6></header>`;
  }

  function renderCompositeChildSection(child = {}, parent = {}, state = {}) {
    const visibleLayers = Array.isArray(child.visibleLayers) ? child.visibleLayers : [];
    const bodyMounts = Array.isArray(child.mounts) ? child.mounts : [];
    const itemMounts = Array.isArray(child.itemMounts) ? child.itemMounts : [];
    const proxyRegion = { ...child, key: parent.key };
    return `<section class="equipment-composite-region-child" data-equipment-composite-child="${escapeHtml(child.key || "")}">
      <div class="equipment-composite-region-child__head"><h6>${escapeHtml(formatRegionLabel(child.label || child.key))}</h6><small>${escapeHtml(child.occupiedCount || 0)} occupied</small></div>
      ${visibleLayers.length ? `<div class="equipment-body-layer-stack">${visibleLayers.map((layer) => renderLayerRow(layer, proxyRegion, state)).join("")}</div>` : ""}
      ${bodyMounts.length ? `<div class="equipment-body-mount-stack">${bodyMounts.map((mount) => renderBodyMountRow(mount, proxyRegion, state)).join("")}</div>` : ""}
      ${itemMounts.length ? `<div class="equipment-item-mount-stack">${itemMounts.map((mount) => renderItemMountRow(mount, proxyRegion, state)).join("")}</div>` : ""}
    </section>`;
  }

  function renderCompositeRegionDetails(region = {}, state = {}) {
    const assignment = getRegionAssignmentOptions(state, region);
    const children = Array.isArray(region.childRegions) ? region.childRegions : [];
    let slotMarkup = "";
    if (region.slotMode === "SHOULDERS") {
      const mountChildren = children.map((child) => ({ ...child, visibleLayers: [] }));
      slotMarkup = `<div class="equipment-region-stack-section"><h6>Paired Armor</h6>${renderShoulderArmorSlot(region, state)}</div>
        <div class="equipment-region-stack-section"><h6>Container Mounts</h6><div class="equipment-composite-region-grid">${mountChildren.map((child) => renderCompositeChildSection(child, region, state)).join("")}</div></div>`;
    } else if (region.slotMode === "FOREARMS") {
      slotMarkup = `<div class="equipment-region-stack-section"><h6>Forearm Slots</h6><div class="equipment-composite-region-grid">${children.map((child) => renderCompositeChildSection(child, region, state)).join("")}</div></div>`;
    } else if (region.slotMode === "THIGHS") {
      slotMarkup = `<div class="equipment-region-stack-section"><h6>Thigh Mounts</h6><div class="equipment-composite-region-grid">${children.map((child) => renderCompositeChildSection({ ...child, visibleLayers: [] }, region, state)).join("")}</div></div>`;
    } else if (region.slotMode === "SHINS") {
      slotMarkup = `<div class="equipment-region-stack-section"><h6>Shin Mounts</h6><div class="equipment-composite-region-grid">${children.map((child) => renderCompositeChildSection({ ...child, visibleLayers: [] }, region, state)).join("")}</div></div>`;
    }
    return `<div class="equipment-slot-detail equipment-body-region-detail equipment-body-region-detail--composite" data-equipment-region-detail="${escapeHtml(region.key)}">
      ${renderRegionInspectorIntro(region)}
      ${slotMarkup}
      ${renderQuickEquip(assignment.targets)}
      ${renderBlockedCandidates(assignment.blockedItems)}
    </div>`;
  }

  function renderSelectedRegionDetails(state = {}) {
    const key = getSelectedRegionKey(state);
    const region = (Array.isArray(state?.bodyRegions) ? state.bodyRegions : []).find((entry) => entry.key === key) || null;
    if (!region) return `<div class="equipment-slot-detail equipment-slot-detail--empty"><p class="equipment-shell-note">Select a bodymap region to manage its layers and mounts.</p></div>`;
    if (region.isComposite === true) return renderCompositeRegionDetails(region, state);
    const assignment = getRegionAssignmentOptions(state, region);
    const visibleLayers = Array.isArray(region.visibleLayers) ? region.visibleLayers : [];
    const bodyMounts = Array.isArray(region.mounts) ? region.mounts : [];
    const itemMounts = Array.isArray(region.itemMounts) ? region.itemMounts : [];
    return `<div class="equipment-slot-detail equipment-body-region-detail" data-equipment-region-detail="${escapeHtml(region.key)}">
      ${renderRegionInspectorIntro(region)}
      ${visibleLayers.length ? `<div class="equipment-region-stack-section"><h6>Layers</h6><div class="equipment-body-layer-stack">${visibleLayers.map((layer) => renderLayerRow(layer, region, state)).join("")}</div></div>` : ""}
      ${bodyMounts.length ? `<div class="equipment-region-stack-section"><h6>Body Mounts</h6><div class="equipment-body-mount-stack">${bodyMounts.map((mount) => renderBodyMountRow(mount, region, state)).join("")}</div></div>` : ""}
      ${itemMounts.length ? `<div class="equipment-region-stack-section"><h6>Item Mounts</h6><div class="equipment-item-mount-stack">${itemMounts.map((mount) => renderItemMountRow(mount, region, state)).join("")}</div></div>` : ""}
      ${renderQuickEquip(assignment.targets)}
      ${renderBlockedCandidates(assignment.blockedItems)}
    </div>`;
  }

  function renderEquipmentSelectedRegionPanel(state = {}) {
    const selected = getSelectedRegionKey(state);
    return `<section class="equipment-shell-panel equipment-shell-panel--selected-region" data-equipment-panel="selected-region"><div class="equipment-shell-panel__head"><div><p class="kicker">EQUIPMENT / SELECTED REGION</p><h5>Layers & Mounts</h5></div>${selected ? `<span class="equipment-panel-badge">${escapeHtml(selected)}</span>` : ""}</div>${renderSelectedRegionDetails(state)}</section>`;
  }

  function renderEquipmentBodyRegionIndexPanel(state = {}, options = {}) {
    const regions = Array.isArray(state?.bodyRegions) ? state.bodyRegions : [];
    const visible = getVisibleRegions(state);
    const occupied = regions.filter((region) => Number(region.occupiedCount || 0) > 0);
    return `<section class="equipment-shell-panel equipment-shell-panel--loadout-index equipment-shell-panel--compact-index" data-equipment-panel="body-region-index">
      <details class="equipment-loadout-index-details" ${options.expanded === true ? "open" : ""}>
        <summary><span><p class="kicker">EQUIPMENT / BODY INDEX</p><h5>Regions, Layers & Mounts</h5></span><span class="equipment-loadout-index-summary"><b>${escapeHtml(visible.length)}</b><small>visible</small><b>${escapeHtml(occupied.length)}</b><small>occupied</small><b>${escapeHtml(regions.length)}</b><small>regions</small></span></summary>
        ${renderRegionFilters(state)}
        <div class="equipment-shell-list equipment-shell-list--body-regions equipment-shell-list--body-regions-compact">${visible.length ? visible.map((region) => renderRegionRow(region, state)).join("") : `<p class="file-empty">No body regions match this filter.</p>`}</div>
      </details>
    </section>`;
  }

  function renderEquipmentBodyRegionsPanel(state = {}) {
    return `${renderEquipmentSelectedRegionPanel(state)}${renderEquipmentBodyRegionIndexPanel(state)}`;
  }

  function renderCitizenEquipmentSummary(citizen = {}, options = {}) {
    const state = typeof window.WS_APP.getEquipmentState === "function" ? window.WS_APP.getEquipmentState(citizen) : null;
    const summary = state?.summary || {};
    const occupied = (state?.bodyRegions || []).filter((region) => region?.isComposite !== true).reduce((sum, region) => sum + Number(region.occupiedCount || 0), 0);
    return `<section class="equipment-shell-card ${options.compact === true ? "is-compact" : ""}"><p class="kicker">EQUIPMENT</p><h6>Equipment summary</h6><div class="equipment-shell-card__meta"><span>${escapeHtml(summary.itemCount || 0)} items</span><span>${escapeHtml(summary.equippedCount || 0)} equipped</span><span>${escapeHtml(occupied)} occupied layers/mounts</span><span>${escapeHtml(summary.gridStoredCount || 0)} in grids</span><span>${escapeHtml(summary.reflexDexterityPenaltyPercent || 0)}% carry penalty</span><span>${escapeHtml(state?.status || "READY")}</span></div></section>`;
  }

  const exports = { version: BODY_REGIONS_PANEL_VERSION, renderEquipmentSelectedRegionDetail: renderSelectedRegionDetails, renderEquipmentSelectedRegionPanel, renderEquipmentBodyRegionIndexPanel, renderEquipmentBodyRegionsPanel, renderCitizenEquipmentSummary, getEquipmentRegionTooltipModel, renderEquipmentRegionTooltipAttributes };
  window.WS_APP.equipmentBodyRegionsPanel = exports;
  const { version: bodyRegionsPanelVersion, ...bodyRegionsPanelApi } = exports;
  Object.assign(window.WS_APP, bodyRegionsPanelApi);
})();
