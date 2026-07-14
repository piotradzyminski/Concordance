window.WS_APP = window.WS_APP || {};

(function initEquipmentBodymapPanel() {
  const EQUIPMENT_BODYMAP_PANEL_VERSION = "6.4.0x";
  const escapeHtml = window.WS_APP.escapeEquipmentHtml || ((value = "") => String(value ?? ""));

  const BODYMAP_ASSETS = {
    front: "assets/bodymap_front.jpg",
    back: "assets/bodymap_back.jpg"
  };

  const REGION_PARENT = {
    LEFT_SHOULDER: "SHOULDERS",
    RIGHT_SHOULDER: "SHOULDERS",
    LEFT_FOREARM: "FOREARMS",
    RIGHT_FOREARM: "FOREARMS",
    LEFT_THIGH: "THIGHS",
    RIGHT_THIGH: "THIGHS",
    LEFT_SHIN: "SHINS",
    RIGHT_SHIN: "SHINS"
  };

  const BODYMAP_ASSET_GEOMETRY = Object.freeze({
    width: 949,
    height: 1658
  });

  const STAGE_GEOMETRY = Object.freeze({
    scanStartX: 18,
    scanWidth: 64,
    scanStartY: 1.4,
    scanHeight: 97.2,
    leftCardX: 1,
    rightCardX: 82.2,
    cardWidth: 16.8,
    leftCardEdgeX: 17.8,
    rightCardEdgeX: 82.2,
    leftJunctionX: 23.8,
    rightJunctionX: 76.2
  });

  function railCard(side = "left", y = 0, options = {}) {
    const isRight = side === "right";
    return {
      side: isRight ? "right" : "left",
      x: isRight ? STAGE_GEOMETRY.rightCardX : STAGE_GEOMETRY.leftCardX,
      y,
      width: STAGE_GEOMETRY.cardWidth,
      edgeX: isRight ? STAGE_GEOMETRY.rightCardEdgeX : STAGE_GEOMETRY.leftCardEdgeX,
      junctionX: Number(options.junctionX ?? (isRight ? STAGE_GEOMETRY.rightJunctionX : STAGE_GEOMETRY.leftJunctionX)),
      pointIndexes: Array.isArray(options.pointIndexes) ? options.pointIndexes : null
    };
  }

  function assetPoint(x = 0, y = 0) {
    return { assetX: Number(x || 0), assetY: Number(y || 0) };
  }

  function sharedPoints(points = []) {
    return { front: points, back: points };
  }

  const BODYMAP_REGION_LAYOUTS = [
    {
      regionKey: "HEAD",
      visibility: "common",
      card: railCard("left", 8.8),
      points: sharedPoints([assetPoint(474.548, 151.025)])
    },
    {
      regionKey: "FACE",
      visibility: "front",
      card: railCard("right", 13.8),
      points: {
        front: [assetPoint(472.548, 232.025)]
      }
    },
    {
      regionKey: "NECK",
      visibility: "common",
      card: railCard("left", 17.4),
      points: sharedPoints([assetPoint(473.582, 289.18)])
    },
    {
      regionKey: "IMPLANT_PORT",
      visibility: "back",
      card: railCard("right", 18.2),
      points: {
        back: [assetPoint(474.579, 238.156)]
      }
    },
    {
      regionKey: "SHOULDERS",
      visibility: "common",
      card: railCard("left", 22.2, { pointIndexes: [0, 1], junctionX: 26.3 }),
      points: sharedPoints([
        assetPoint(343.548, 336.025),
        assetPoint(606.567, 335.041)
      ])
    },
    {
      regionKey: "TORSO",
      visibility: "front",
      card: railCard("right", 27.2),
      points: {
        front: [assetPoint(471.545, 435.01)]
      }
    },
    {
      regionKey: "BACK",
      visibility: "back",
      card: railCard("right", 32.1),
      points: {
        back: [assetPoint(475.582, 384.18)]
      }
    },
    {
      regionKey: "FOREARMS",
      visibility: "common",
      card: railCard("left", 39.2, { pointIndexes: [0, 1], junctionX: 26.8 }),
      points: sharedPoints([
        assetPoint(270.567, 650.038),
        assetPoint(676.548, 651.025)
      ])
    },
    {
      regionKey: "WAIST",
      visibility: "common",
      card: railCard("left", 45),
      points: sharedPoints([assetPoint(472.548, 686.025)])
    },
    {
      regionKey: "LEGS",
      visibility: "common",
      card: railCard("right", 45),
      points: sharedPoints([assetPoint(473.548, 728.025)])
    },
    {
      regionKey: "HANDS",
      visibility: "common",
      card: railCard("right", 51, { pointIndexes: [0, 1], junctionX: 73.2 }),
      points: sharedPoints([
        assetPoint(229.548, 833.025),
        assetPoint(713.567, 829.01)
      ])
    },
    {
      regionKey: "RIGHT_HAND",
      visibility: "common",
      cards: {
        front: railCard("left", 57.2),
        back: railCard("right", 57.2)
      },
      points: {
        front: [assetPoint(176.548, 963.025)],
        back: [assetPoint(769.548, 964.025)]
      }
    },
    {
      regionKey: "LEFT_HAND",
      visibility: "common",
      cards: {
        front: railCard("right", 57.2),
        back: railCard("left", 57.2)
      },
      points: {
        front: [assetPoint(769.548, 964.025)],
        back: [assetPoint(176.548, 963.025)]
      }
    },
    {
      regionKey: "THIGHS",
      visibility: "common",
      card: railCard("right", 63.2, { pointIndexes: [0, 1], junctionX: 72.9 }),
      points: sharedPoints([
        assetPoint(361.571, 894.013),
        assetPoint(589.569, 896)
      ])
    },
    {
      regionKey: "SHINS",
      visibility: "common",
      card: railCard("left", 76.2, { pointIndexes: [0, 1], junctionX: 27.1 }),
      points: sharedPoints([
        assetPoint(381.594, 1251.013),
        assetPoint(562.621, 1249.079)
      ])
    },
    {
      regionKey: "FEET",
      visibility: "common",
      card: railCard("left", 89.2, { pointIndexes: [0, 1], junctionX: 27.5 }),
      points: sharedPoints([
        assetPoint(379.573, 1472.018),
        assetPoint(562.542, 1471.051)
      ])
    }
  ];

  function normalizeView(value = "front") {
    return String(value || "front").trim().toLowerCase() === "back" ? "back" : "front";
  }

  function mapPointToStage(point = {}) {
    const assetX = Number(point.assetX ?? point.x ?? 0);
    const assetY = Number(point.assetY ?? point.y ?? 0);
    return {
      x: STAGE_GEOMETRY.scanStartX + (assetX / BODYMAP_ASSET_GEOMETRY.width) * STAGE_GEOMETRY.scanWidth,
      y: STAGE_GEOMETRY.scanStartY + (assetY / BODYMAP_ASSET_GEOMETRY.height) * STAGE_GEOMETRY.scanHeight
    };
  }

  function buildViewLayout(view = "front") {
    const normalizedView = normalizeView(view);
    return BODYMAP_REGION_LAYOUTS.map((entry) => ({
      regionKey: entry.regionKey,
      visibility: entry.visibility || "common",
      points: (Array.isArray(entry.points?.[normalizedView]) ? entry.points[normalizedView] : []).map(mapPointToStage),
      card: entry.cards?.[normalizedView] || entry.card || null
    }));
  }

  const BODYMAP_ANCHOR_LAYOUT = {
    front: buildViewLayout("front"),
    back: buildViewLayout("back")
  };

  function normalizeRegionKey(value = "") {
    const key = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    return REGION_PARENT[key] || key;
  }

  function getSelectedRegionKey(state = {}) {
    return normalizeRegionKey(state?.selections?.selectedRegion || "");
  }

  function getRegionIndex(state = {}) {
    return (Array.isArray(state?.bodyRegions) ? state.bodyRegions : []).reduce((next, region) => {
      if (region?.key) next[normalizeRegionKey(region.key)] = region;
      return next;
    }, {});
  }

  function getItemPrimaryRegion(item = {}, state = {}, visited = new Set()) {
    if (!item?.id || visited.has(item.id)) return "";
    visited.add(item.id);
    const location = item.equippedLocation || {};
    if (location.kind === "LAYER") return normalizeRegionKey(location.anchor);
    if (location.kind === "BODY_MOUNT") {
      const mountId = location.primaryMountId || location.mountIds?.[0] || "";
      return normalizeRegionKey(state?.bodyMountDefinitions?.find((entry) => entry.key === mountId)?.regionKey || "");
    }
    if (location.kind === "ITEM_MOUNT") return getItemPrimaryRegion(state?.itemById?.[location.ownerItemId] || {}, state, visited);
    return "";
  }

  function getSelectedItemRelation(state = {}) {
    const item = state?.selectedItem || null;
    if (!item?.isEquipped || !item.equippedLocation) return { item: null, primaryRegion: "", reservedRegions: new Set() };
    const primaryRegion = getItemPrimaryRegion(item, state);
    const coverage = item.equippedLocation?.kind === "LAYER"
      ? (Array.isArray(item.equippedLocation.coverage) && item.equippedLocation.coverage.length ? item.equippedLocation.coverage : item.equipProfile?.coverage || [])
      : [];
    const reservedRegions = new Set(coverage.map(normalizeRegionKey).filter((entry) => entry && entry !== primaryRegion));
    if (item.equippedLocation?.kind === "BODY_MOUNT") {
      (item.equippedLocation.mountIds || []).forEach((mountId) => {
        const regionKey = normalizeRegionKey(state?.bodyMountDefinitions?.find((entry) => entry.key === mountId)?.regionKey || "");
        if (regionKey && regionKey !== primaryRegion) reservedRegions.add(regionKey);
      });
    }
    return { item, primaryRegion, reservedRegions };
  }

  function getActiveView(state = {}) {
    return normalizeView(state?.selections?.selectedBodymapView || "front");
  }

  function getRegionStatus(region = null) {
    const stack = Array.isArray(region?.stack) ? region.stack : [];
    if (!region) return "missing";
    if (region.hasConflict === true) return "conflict";
    if (stack.some((entry) => entry.role === "PRIMARY")) return "occupied";
    if (stack.some((entry) => entry.role === "RESERVED")) return "reserved";
    if (Number(region.occupiedMountCount || 0) > 0) return "mounted";
    return "empty";
  }

  function getStatusLabel(region = null) {
    const status = getRegionStatus(region);
    if (status === "conflict") return "CONFLICT";
    if (status === "occupied") return "LAYER OCCUPIED";
    if (status === "reserved") return "LAYER RESERVED";
    if (status === "mounted") return "MOUNT OCCUPIED";
    if (status === "missing") return "MISSING";
    return "EMPTY";
  }

  function getRegionMeta(region = null) {
    if (!region) return "";
    const occupied = Number(region.occupiedCount || 0);
    const capacity = Number(region.visibleLayers?.length || 0)
      + Number(region.mounts?.length || 0)
      + Number(region.itemMounts?.length || 0);
    if (!capacity) return occupied ? `${occupied} OCCUPIED` : "";
    return `${occupied} / ${capacity}`;
  }

  function getRegionViewState(layout = {}, region = null, activeView = "front") {
    const visibility = String(region?.visibility || layout.visibility || "common").trim().toLowerCase();
    const normalizedView = normalizeView(activeView);
    const targetView = visibility === "back" ? "back" : visibility === "front" ? "front" : normalizedView;
    return {
      visibility,
      targetView,
      activeOnView: visibility === "common" || visibility === normalizedView
    };
  }

  function renderViewSwitch(activeView = "front") {
    return `<div class="equipment-bodymap-view-switch" role="group" aria-label="Bodymap view">
      ${["front", "back"].map((view) => `<button class="equipment-bodymap-view ${activeView === view ? "is-active" : ""}" type="button" data-equipment-bodymap-view="${view}" aria-pressed="${activeView === view ? "true" : "false"}">${view === "front" ? "Front" : "Back"}</button>`).join("")}
    </div>`;
  }

  function getInteractionAttributes(regionKey = "", viewState = {}, selected = false, label = "", statusLabel = "", tooltip = "") {
    const ariaView = viewState.activeOnView ? "" : ` / opens ${viewState.targetView} view`;
    return `data-equipment-bodymap-region="${escapeHtml(regionKey)}" data-equipment-select-region="${escapeHtml(regionKey)}"
      data-equipment-bodymap-view-state="${viewState.activeOnView ? "active" : "opposite"}"
      data-equipment-bodymap-target-view="${escapeHtml(viewState.targetView)}" aria-label="${escapeHtml(label)} / ${escapeHtml(statusLabel)}${escapeHtml(ariaView)}"
      aria-pressed="${selected ? "true" : "false"}" ${selected ? 'aria-current="true"' : ""} ${tooltip}`;
  }

  function renderLeaderLines(layout = {}) {
    const points = Array.isArray(layout.points) ? layout.points : [];
    const card = layout.card || null;
    if (!card || !points.length) return "";

    const indexes = Array.isArray(card.pointIndexes) && card.pointIndexes.length
      ? card.pointIndexes
      : points.map((_, index) => index);
    const resolvedPoints = indexes.map((index) => points[index]).filter(Boolean);
    if (!resolvedPoints.length) return "";

    const edgeX = Number(card.edgeX || 0);
    const junctionX = Number(card.junctionX || edgeX);
    const cardY = Number(card.y || 0);
    const trunk = `<path class="equipment-bodymap-region__leader-trunk" d="M ${escapeHtml(edgeX)} ${escapeHtml(cardY)} H ${escapeHtml(junctionX)}"></path>`;
    const branches = resolvedPoints.map((point) => `<path class="equipment-bodymap-region__leader-branch" d="M ${escapeHtml(junctionX)} ${escapeHtml(cardY)} L ${escapeHtml(point.x)} ${escapeHtml(point.y)}"></path>`).join("");
    const junction = resolvedPoints.length > 1
      ? `<circle class="equipment-bodymap-region__leader-junction" cx="${escapeHtml(junctionX)}" cy="${escapeHtml(cardY)}" r="0.34"></circle>`
      : "";

    return `<svg class="equipment-bodymap-region__leaders" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${trunk}${branches}${junction}</svg>`;
  }

  function renderRegion(layout = {}, region = null, state = {}, relation = getSelectedItemRelation(state), activeView = getActiveView(state)) {
    const regionKey = normalizeRegionKey(layout.regionKey || "");
    const selected = getSelectedRegionKey(state) === regionKey;
    const relatedPrimary = relation.primaryRegion === regionKey;
    const relatedReservation = relation.reservedRegions.has(regionKey);
    const status = getRegionStatus(region);
    const label = region?.label || regionKey;
    const meta = getRegionMeta(region);
    const occupied = Number(region?.occupiedCount || 0);
    const viewState = getRegionViewState(layout, region, activeView);
    const viewHint = viewState.activeOnView ? "" : `OPPOSITE VIEW · CLICK TO OPEN ${viewState.targetView.toUpperCase()}`;
    const tooltip = typeof window.WS_APP.renderEquipmentRegionTooltipAttributes === "function"
      ? window.WS_APP.renderEquipmentRegionTooltipAttributes(region || { key: regionKey, label, occupiedCount: occupied }, { viewHint: viewHint || "CLICK TO OPEN REGION" })
      : "";
    const interactionAttributes = getInteractionAttributes(regionKey, viewState, selected, label, getStatusLabel(region), tooltip);
    const classes = [
      "equipment-bodymap-region",
      `equipment-bodymap-region--${status}`,
      relatedPrimary ? "is-related-item" : "",
      relatedReservation ? "is-related-reservation" : "",
      viewState.activeOnView ? "is-current-view" : "is-opposite-view",
      selected ? "is-selected" : ""
    ].filter(Boolean).join(" ");

    const points = viewState.activeOnView
      ? (layout.points || []).map((point) => `<button class="equipment-bodymap-region__point" type="button"
          style="--bodymap-point-x:${escapeHtml(point.x)}%;--bodymap-point-y:${escapeHtml(point.y)}%;" ${interactionAttributes}><span aria-hidden="true"></span></button>`).join("")
      : "";
    const card = layout.card || {};
    const cardHtml = `<button class="equipment-bodymap-region__card equipment-bodymap-region__card--${escapeHtml(card.side || "left")}" type="button"
      style="--bodymap-card-x:${escapeHtml(card.x || 0)}%;--bodymap-card-y:${escapeHtml(card.y || 0)}%;--bodymap-card-width:${escapeHtml(card.width || STAGE_GEOMETRY.cardWidth)}%;" ${interactionAttributes}>
      <b>${escapeHtml(label)}</b>${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
    </button>`;

    return `<div class="${classes}" data-equipment-bodymap-region-group="${escapeHtml(regionKey)}" data-equipment-bodymap-status="${escapeHtml(status)}">
      ${viewState.activeOnView ? renderLeaderLines(layout) : ""}${points}${cardHtml}
    </div>`;
  }

  function renderSelectedSummary(state = {}, regionIndex = {}, relation = getSelectedItemRelation(state)) {
    const selected = regionIndex[getSelectedRegionKey(state)] || null;
    if (selected) {
      return `<div class="equipment-bodymap-selected" data-equipment-bodymap-selection-summary>
        <span><small>Selected region</small><b>${escapeHtml(selected.label || selected.key)}</b></span>
        <span><small>Status</small><b>${escapeHtml(getStatusLabel(selected))}</b></span>
        <span><small>Occupied</small><b>${escapeHtml(selected.occupiedCount || 0)}</b></span>
      </div>`;
    }
    if (relation.item && relation.primaryRegion) {
      return `<div class="equipment-bodymap-selected equipment-bodymap-selected--item-link" data-equipment-bodymap-selection-summary>
        <span><small>Selected item</small><b>${escapeHtml(relation.item.name || relation.item.id)}</b></span>
        <span><small>Primary region</small><b>${escapeHtml(relation.primaryRegion)}</b></span>
        <span><small>Related regions</small><b>${escapeHtml(relation.reservedRegions.size)}</b></span>
      </div>`;
    }
    return `<p class="equipment-shell-note" data-equipment-bodymap-selection-summary>Select an anchor to inspect the region's layers and mounts.</p>`;
  }

  function renderBodymapViewPanel(state = {}, regionIndex = {}, relation = getSelectedItemRelation(state), view = "front", activeView = "front") {
    const normalizedView = normalizeView(view);
    const active = normalizedView === normalizeView(activeView);
    const layout = BODYMAP_ANCHOR_LAYOUT[normalizedView] || BODYMAP_ANCHOR_LAYOUT.front;
    return `<div class="equipment-bodymap-frame equipment-bodymap-frame--${escapeHtml(normalizedView)} ${active ? "is-active" : ""}"
      data-equipment-bodymap-view-panel="${escapeHtml(normalizedView)}" ${active ? 'aria-hidden="false"' : 'hidden aria-hidden="true" inert'}
      style="--bodymap-scan-start-x:${escapeHtml(STAGE_GEOMETRY.scanStartX)}%;--bodymap-scan-width:${escapeHtml(STAGE_GEOMETRY.scanWidth)}%;--bodymap-scan-start-y:${escapeHtml(STAGE_GEOMETRY.scanStartY)}%;--bodymap-scan-height:${escapeHtml(STAGE_GEOMETRY.scanHeight)}%;"
      aria-label="Equipment body region map / ${escapeHtml(normalizedView)}">
      <div class="equipment-bodymap-scan" aria-hidden="true"><img src="${escapeHtml(BODYMAP_ASSETS[normalizedView] || BODYMAP_ASSETS.front)}" alt="" loading="eager" decoding="async" data-equipment-bodymap-image="${escapeHtml(normalizedView)}"></div>
      <div class="equipment-bodymap-regions">${layout.map((entry) => renderRegion(entry, regionIndex[entry.regionKey] || null, state, relation, normalizedView)).join("")}</div>
    </div>`;
  }

  function syncEquipmentBodymapSelection(root = document, state = {}) {
    const panel = root?.matches?.('[data-equipment-panel="bodymap"]')
      ? root
      : root?.querySelector?.('[data-equipment-panel="bodymap"]');
    if (!panel) return { ok: false, changed: 0, reason: "BODYMAP_PANEL_NOT_MOUNTED" };
    const selectedRegionKey = getSelectedRegionKey(state);
    const relation = getSelectedItemRelation(state);
    let changed = 0;
    panel.querySelectorAll("[data-equipment-bodymap-region-group]").forEach((group) => {
      const regionKey = normalizeRegionKey(group.dataset.equipmentBodymapRegionGroup || "");
      const selected = Boolean(selectedRegionKey) && regionKey === selectedRegionKey;
      const relatedPrimary = Boolean(relation.item) && relation.primaryRegion === regionKey;
      const relatedReservation = Boolean(relation.item) && relation.reservedRegions.has(regionKey);
      for (const [className, enabled] of [["is-selected", selected], ["is-related-item", relatedPrimary], ["is-related-reservation", relatedReservation]]) {
        if (group.classList.contains(className) !== enabled) changed += 1;
        group.classList.toggle(className, enabled);
      }
      group.querySelectorAll("[data-equipment-select-region]").forEach((button) => {
        button.setAttribute("aria-pressed", selected ? "true" : "false");
        if (selected) button.setAttribute("aria-current", "true");
        else button.removeAttribute("aria-current");
      });
    });
    const summary = panel.querySelector("[data-equipment-bodymap-selection-summary]");
    if (summary) {
      const template = document.createElement("template");
      template.innerHTML = renderSelectedSummary(state, getRegionIndex(state), relation).trim();
      const nextSummary = template.content.firstElementChild || null;
      if (nextSummary) summary.replaceWith(nextSummary);
    }
    return { ok: true, changed, selectedItemId: String(state?.selections?.selectedItemId || "").trim() };
  }

  function syncEquipmentBodymapPanelView(root = document, view = "front") {
    const panel = root?.matches?.('[data-equipment-panel="bodymap"]')
      ? root
      : root?.querySelector?.('[data-equipment-panel="bodymap"]');
    if (!panel) return { ok: false, changed: false, reason: "BODYMAP_PANEL_NOT_MOUNTED" };
    const normalizedView = normalizeView(view);
    const currentView = normalizeView(panel.dataset.equipmentBodymapActiveView || "front");
    if (currentView === normalizedView) return { ok: true, changed: false, view: normalizedView, reason: "ALREADY_ACTIVE" };

    const target = panel.querySelector(`[data-equipment-bodymap-view-panel="${normalizedView}"]`);
    if (!target) return { ok: false, changed: false, view: normalizedView, reason: "BODYMAP_VIEW_NOT_MOUNTED" };

    panel.dataset.equipmentBodymapActiveView = normalizedView;
    panel.querySelectorAll("[data-equipment-bodymap-view]").forEach((button) => {
      const selected = normalizeView(button.dataset.equipmentBodymapView || "front") === normalizedView;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    panel.querySelectorAll("[data-equipment-bodymap-view-panel]").forEach((frame) => {
      const selected = normalizeView(frame.dataset.equipmentBodymapViewPanel || "front") === normalizedView;
      frame.hidden = !selected;
      frame.setAttribute("aria-hidden", selected ? "false" : "true");
      frame.classList.toggle("is-active", selected);
      if (selected) frame.removeAttribute("inert");
      else frame.setAttribute("inert", "");
    });
    return { ok: true, changed: true, view: normalizedView };
  }

  function preloadEquipmentBodymapAssets(root = document) {
    const panel = root?.matches?.('[data-equipment-panel="bodymap"]')
      ? root
      : root?.querySelector?.('[data-equipment-panel="bodymap"]');
    if (!panel) return Promise.resolve({ ok: false, count: 0, reason: "BODYMAP_PANEL_NOT_MOUNTED" });
    if (panel.__equipmentBodymapDecodePromise) return panel.__equipmentBodymapDecodePromise;

    const images = [...panel.querySelectorAll("[data-equipment-bodymap-image]")];
    panel.dataset.equipmentBodymapAssets = images.length ? "decoding" : "missing";
    panel.__equipmentBodymapDecodePromise = Promise.allSettled(images.map((image) => {
      if (typeof image.decode === "function") return image.decode();
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    })).then((results) => {
      panel.dataset.equipmentBodymapAssets = "ready";
      return { ok: true, count: images.length, results };
    });
    return panel.__equipmentBodymapDecodePromise;
  }

  function renderEquipmentBodymapPanel(state = {}, options = {}) {
    const regionIndex = getRegionIndex(state);
    const relation = getSelectedItemRelation(state);
    const activeView = getActiveView(state);
    const containerTrayHtml = String(options?.containerTrayHtml || "").trim();
    const penalty = state?.carryPenalty || {};

    return `<section class="equipment-shell-panel equipment-shell-panel--bodymap" data-equipment-panel="bodymap" data-equipment-bodymap-active-view="${escapeHtml(activeView)}">
      <div class="equipment-shell-panel__head equipment-shell-panel__head--bodymap">
        <div><h5>Bodymap</h5></div>
        <div class="equipment-bodymap-penalty ${penalty.penaltyPercent ? "is-warning" : ""}"><small>Carry Penalty</small><b>${escapeHtml(penalty.penaltyPercent || 0)}%</b></div>
      </div>
      ${containerTrayHtml ? `<div class="equipment-bodymap-container-tray">${containerTrayHtml}</div>` : ""}
      <div class="equipment-bodymap-view-row">${renderViewSwitch(activeView)}</div>
      <div class="equipment-bodymap-view-stack">
        ${["front", "back"].map((view) => renderBodymapViewPanel(state, regionIndex, relation, view, activeView)).join("")}
      </div>
      ${renderSelectedSummary(state, regionIndex, relation)}
    </section>`;
  }

  window.WS_APP.equipmentBodymapPanel = {
    version: EQUIPMENT_BODYMAP_PANEL_VERSION,
    layout: BODYMAP_ANCHOR_LAYOUT,
    stageGeometry: STAGE_GEOMETRY,
    renderEquipmentBodymapPanel,
    syncEquipmentBodymapPanelView,
    syncEquipmentBodymapSelection,
    preloadEquipmentBodymapAssets
  };
  window.WS_APP.renderEquipmentBodymapPanel = renderEquipmentBodymapPanel;
  window.WS_APP.syncEquipmentBodymapPanelView = syncEquipmentBodymapPanelView;
  window.WS_APP.syncEquipmentBodymapSelection = syncEquipmentBodymapSelection;
  window.WS_APP.preloadEquipmentBodymapAssets = preloadEquipmentBodymapAssets;
})();
