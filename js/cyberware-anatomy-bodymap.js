window.WS_APP = window.WS_APP || {};

(function initCyberwareAnatomyBodymap() {
  const app = window.WS_APP;
  const data = window.WS_APP_DATA?.CYBERWARE_BODYMAP_LAYOUTS || { regions: [], views: [], preferredRegionBySlot: {} };
  const runtime = app.cyberwareRuntime || {};
  const regionById = new Map((data.regions || []).map((entry) => [entry.id, entry]));
  const viewById = new Map((data.views || []).map((entry) => [entry.id, entry]));
  const viewsByRegion = new Map();
  (data.views || []).forEach((entry) => {
    const list = viewsByRegion.get(entry.regionId) || [];
    list.push(entry);
    viewsByRegion.set(entry.regionId, list);
  });

  const normalizeRegionId = (value = "BODY") => regionById.has(String(value || "").trim().toUpperCase())
    ? String(value || "").trim().toUpperCase()
    : "BODY";
  const normalizeOrientation = (value = "FRONT") => String(value || "FRONT").trim().toUpperCase();
  const unique = (values = []) => [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
  const escapeHtml = (value = "") => (app.escapeEquipmentHtml || ((item) => String(item ?? "")))(value);
  const formatToken = (value = "") => String(value || "").trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").toUpperCase();
  const getItemId = (item = {}) => String(item.instanceId || item.id || "").trim();

  function ensureState(state = {}) {
    state.bodymapRegion = normalizeRegionId(state.bodymapRegion || "BODY");
    state.bodymapOrientationByRegion = state.bodymapOrientationByRegion && typeof state.bodymapOrientationByRegion === "object"
      ? state.bodymapOrientationByRegion
      : {};
    (data.regions || []).forEach((region) => {
      const allowed = Array.isArray(region.orientations) && region.orientations.length ? region.orientations : [region.defaultOrientation || "FRONT"];
      const current = normalizeOrientation(state.bodymapOrientationByRegion[region.id] || region.defaultOrientation || allowed[0]);
      state.bodymapOrientationByRegion[region.id] = allowed.includes(current) ? current : allowed[0];
    });
    state.selectedAnchorId = String(state.selectedAnchorId || "").trim();
    return state;
  }

  function getRegion(regionId = "BODY") {
    return regionById.get(normalizeRegionId(regionId)) || regionById.get("BODY") || null;
  }

  function getView(regionId = "BODY", orientation = "") {
    const region = getRegion(regionId);
    if (!region) return null;
    const wanted = normalizeOrientation(orientation || region.defaultOrientation);
    const views = viewsByRegion.get(region.id) || [];
    return views.find((entry) => entry.orientation === wanted) || views[0] || null;
  }

  function getActiveView(state = {}) {
    ensureState(state);
    return getView(state.bodymapRegion, state.bodymapOrientationByRegion[state.bodymapRegion]);
  }

  function getBreadcrumb(regionId = "BODY") {
    const result = [];
    let cursor = getRegion(regionId);
    const guard = new Set();
    while (cursor && !guard.has(cursor.id)) {
      guard.add(cursor.id);
      result.unshift(cursor);
      cursor = cursor.parentId ? getRegion(cursor.parentId) : null;
    }
    return result;
  }

  function normalizeItemSlots(item = {}) {
    const raw = Array.isArray(item.slots) && item.slots.length
      ? item.slots
      : [item.primarySlot || item.slot].filter(Boolean);
    const normalizer = runtime.normalizeCyberwareSlotList;
    return typeof normalizer === "function" ? normalizer(raw) : unique(raw);
  }

  function expandItemSlots(item = {}) {
    const slots = normalizeItemSlots(item);
    return typeof runtime.expandCyberwareSlotFootprint === "function"
      ? runtime.expandCyberwareSlotFootprint(slots)
      : slots;
  }

  function getAnchorItems(anchor = {}, installed = []) {
    const slotSet = new Set(anchor.slotIds || []);
    if (!slotSet.size) return [];
    return installed.filter((item) => expandItemSlots(item).some((slotId) => slotSet.has(slotId)));
  }

  function getAnchorTone(items = []) {
    if (!items.length) return "empty";
    const states = items.map((item) => String(item.operationalState || item.runtimeStatus || item.status || "ENABLED").toUpperCase());
    if (states.some((state) => ["FAULT", "BROKEN", "LOCKED", "INCOMPATIBLE"].includes(state))) return "blocked";
    if (states.some((state) => ["DISABLED", "OFFLINE", "MAINTENANCE", "SERVICE_MODE"].includes(state))) return "warning";
    return "occupied";
  }

  function getRegionSlotIds(regionId = "BODY") {
    const ids = [];
    (viewsByRegion.get(normalizeRegionId(regionId)) || []).forEach((view) => {
      (view.anchors || []).forEach((anchor) => ids.push(...(anchor.slotIds || [])));
    });
    return unique(ids);
  }

  function getRegionItems(regionId = "BODY", installed = []) {
    const slotSet = new Set(getRegionSlotIds(regionId));
    return installed.filter((item) => expandItemSlots(item).some((slotId) => slotSet.has(slotId)));
  }

  function getPreferredRegionForItem(item = {}) {
    const slots = normalizeItemSlots(item);
    for (const slot of slots) {
      const preferred = data.preferredRegionBySlot?.[slot];
      if (preferred && regionById.has(preferred)) return preferred;
    }
    const expanded = expandItemSlots(item);
    for (const slot of expanded) {
      const preferred = data.preferredRegionBySlot?.[slot];
      if (preferred && regionById.has(preferred)) return preferred;
    }
    return "";
  }

  function locateItem(item = {}) {
    const regionId = getPreferredRegionForItem(item);
    if (!regionId) return null;
    const region = getRegion(regionId);
    const expanded = new Set(expandItemSlots(item));
    const candidateViews = viewsByRegion.get(regionId) || [];
    let match = null;
    candidateViews.some((view) => {
      const anchor = (view.anchors || []).find((entry) => (entry.slotIds || []).some((slotId) => expanded.has(slotId)));
      if (!anchor) return false;
      match = { regionId, viewId: view.id, orientation: view.orientation, anchorId: anchor.id, slot: anchor.slotIds.find((slotId) => expanded.has(slotId)) || "", x: anchor.x, y: anchor.y };
      return true;
    });
    if (!match) {
      const view = candidateViews[0] || null;
      match = { regionId, viewId: view?.id || "", orientation: view?.orientation || region?.defaultOrientation || "DETAIL", anchorId: "", slot: normalizeItemSlots(item)[0] || "" };
    }
    const path = getBreadcrumb(regionId);
    return {
      ...match,
      path: path.map((entry) => entry.id),
      pathLabel: path.map((entry) => entry.label).join(" / ") || "UNMAPPED",
      view: match.viewId || regionId.toLowerCase()
    };
  }

  function findAnchor(view = {}, anchorId = "") {
    const id = String(anchorId || "").trim();
    return (view?.anchors || []).find((entry) => entry.id === id) || null;
  }

  function validateLayouts(options = {}) {
    const errors = [];
    const warnings = [];
    const slotKeys = new Set((runtime.CYBERWARE_SLOT_DEFINITIONS || []).map((entry) => entry.key));
    const seenViews = new Set();
    (data.views || []).forEach((view) => {
      if (!view.id || seenViews.has(view.id)) errors.push(`DUPLICATE_VIEW:${view.id || "EMPTY"}`);
      seenViews.add(view.id);
      if (!regionById.has(view.regionId)) errors.push(`UNKNOWN_REGION:${view.id}:${view.regionId}`);
      if (!view.assetPath) errors.push(`MISSING_ASSET_PATH:${view.id}`);
      if (/_anchor\./i.test(view.assetPath)) errors.push(`REFERENCE_ASSET_USED_AT_RUNTIME:${view.id}`);
      const anchorIds = new Set();
      (view.anchors || []).forEach((anchor) => {
        if (!anchor.id || anchorIds.has(anchor.id)) errors.push(`DUPLICATE_ANCHOR:${view.id}:${anchor.id || "EMPTY"}`);
        anchorIds.add(anchor.id);
        if (![anchor.x, anchor.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) errors.push(`ANCHOR_OUT_OF_RANGE:${view.id}:${anchor.id}`);
        if (anchor.kind === "NAVIGATION" && !regionById.has(anchor.targetRegionId)) errors.push(`UNKNOWN_TARGET_REGION:${view.id}:${anchor.id}:${anchor.targetRegionId}`);
        (anchor.slotIds || []).forEach((slotId) => {
          if (slotKeys.size && !slotKeys.has(slotId)) errors.push(`UNKNOWN_SLOT:${view.id}:${anchor.id}:${slotId}`);
        });
      });
    });
    const groups = new Map();
    (data.views || []).flatMap((view) => view.anchors || []).forEach((anchor) => {
      if (!anchor.continuityGroup) return;
      groups.set(anchor.continuityGroup, (groups.get(anchor.continuityGroup) || 0) + 1);
    });
    groups.forEach((count, group) => { if (count < 2) warnings.push(`INCOMPLETE_CONTINUITY_GROUP:${group}`); });
    if (options.throwOnError && errors.length) throw new Error(errors.join("\n"));
    return { ok: errors.length === 0, errors, warnings, viewCount: (data.views || []).length, regionCount: (data.regions || []).length };
  }

  function renderLeader(anchor = {}) {
    const x = Number(anchor.x || 0);
    const y = Number(anchor.y || 0);
    const labelX = Number.isFinite(anchor.labelX) ? anchor.labelX : (x < 50 ? Math.max(2, x - 24) : Math.min(80, x + 5));
    const labelY = Number.isFinite(anchor.labelY) ? anchor.labelY : y;
    const junctionX = x < labelX ? labelX : labelX + 18;
    return `<svg class="cyberware-anatomy-anchor__leader" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M ${escapeHtml(x)} ${escapeHtml(y)} L ${escapeHtml(junctionX)} ${escapeHtml(labelY)}"></path></svg>`;
  }

  function renderAnchor(entry = {}, selectedInstanceId = "") {
    const anchor = entry.anchor || {};
    const items = entry.items || [];
    const itemIds = items.map(getItemId).filter(Boolean);
    const selected = Boolean(selectedInstanceId && itemIds.includes(selectedInstanceId));
    const tone = getAnchorTone(items);
    const count = items.length;
    const labelX = Number.isFinite(anchor.labelX) ? anchor.labelX : (anchor.x < 50 ? Math.max(2, anchor.x - 24) : Math.min(80, anchor.x + 5));
    const labelY = Number.isFinite(anchor.labelY) ? anchor.labelY : anchor.y;
    const classes = ["cyberware-anatomy-anchor", `is-${tone}`, selected ? "is-selected" : "", count > 1 ? "is-stacked" : "", anchor.kind === "NAVIGATION" ? "is-navigation" : ""].filter(Boolean).join(" ");
    const title = `${anchor.label}${count ? ` · ${count} SYSTEM${count === 1 ? "" : "S"}` : " · EMPTY"}`;
    return `<div class="${classes}" data-cyberware-anatomy-anchor-shell="${escapeHtml(anchor.id)}">
      ${renderLeader(anchor)}
      <button type="button" class="cyberware-anatomy-anchor__point equipment-bodymap-region__point" data-cyberware-anatomy-anchor="${escapeHtml(anchor.id)}" aria-label="${escapeHtml(title)}" aria-pressed="${selected ? "true" : "false"}" style="--bodymap-point-x:${escapeHtml(anchor.x)}%;--bodymap-point-y:${escapeHtml(anchor.y)}%;"><span aria-hidden="true"></span>${count > 1 ? `<b>${count}</b>` : ""}</button>
      <button type="button" class="cyberware-anatomy-anchor__card" data-cyberware-anatomy-anchor="${escapeHtml(anchor.id)}" style="--cw-label-x:${escapeHtml(labelX)}%;--cw-label-y:${escapeHtml(labelY)}%;" aria-label="${escapeHtml(title)}"><small>${anchor.kind === "NAVIGATION" ? "OPEN REGION" : count ? `${count} INSTALLED` : "AVAILABLE SLOT"}</small><b>${escapeHtml(anchor.label)}</b></button>
    </div>`;
  }

  function renderRegionNav(state = {}, installed = []) {
    const active = normalizeRegionId(state.bodymapRegion);
    const rows = [...(data.regions || [])].filter((entry) => entry.direct !== false).sort((a, b) => a.order - b.order);
    return `<div class="cyberware-anatomy-region-list">${rows.map((region) => {
      const items = getRegionItems(region.id, installed);
      const selected = region.id === active;
      const warning = getAnchorTone(items);
      return `<button type="button" class="cyberware-anatomy-region-row is-${warning} ${selected ? "is-selected" : ""}" data-cyberware-anatomy-region="${escapeHtml(region.id)}" aria-pressed="${selected ? "true" : "false"}"><span>${escapeHtml(region.parentId ? getRegion(region.parentId)?.label || "BODY" : "ROOT")}</span><b>${escapeHtml(region.label)}</b><small>${items.length} SYSTEM${items.length === 1 ? "" : "S"}</small></button>`;
    }).join("")}</div>`;
  }

  function renderBreadcrumb(state = {}) {
    const trail = getBreadcrumb(state.bodymapRegion);
    return `<nav class="cyberware-anatomy-breadcrumb" aria-label="Cyberware Bodymap path">${trail.map((entry, index) => `<button type="button" data-cyberware-anatomy-region="${escapeHtml(entry.id)}" ${index === trail.length - 1 ? 'aria-current="page"' : ""}>${escapeHtml(entry.label)}</button>`).join('<span aria-hidden="true">/</span>')}</nav>`;
  }

  function renderOrientationSwitch(state = {}) {
    const region = getRegion(state.bodymapRegion);
    const orientations = Array.isArray(region?.orientations) ? region.orientations : [];
    if (orientations.length < 2) return "";
    const current = state.bodymapOrientationByRegion[region.id];
    return `<div class="cyberware-anatomy-orientation" role="group" aria-label="${escapeHtml(region.label)} orientation">${orientations.map((orientation) => `<button type="button" data-cyberware-anatomy-orientation="${escapeHtml(orientation)}" class="${current === orientation ? "is-active" : ""}" aria-pressed="${current === orientation ? "true" : "false"}">${escapeHtml(orientation)}</button>`).join("")}</div>`;
  }

  function renderAnchorStack(view = {}, state = {}, installed = []) {
    if (!state.selectedAnchorId) return "";
    const anchor = findAnchor(view, state.selectedAnchorId);
    if (!anchor) return "";
    const items = getAnchorItems(anchor, installed);
    return `<section class="cyberware-anatomy-stack"><div><span>ANCHOR STACK</span><b>${escapeHtml(anchor.label)}</b><small>${items.length} SYSTEM${items.length === 1 ? "" : "S"}</small></div>${items.length ? items.map((item) => `<button type="button" data-cyberware-select-item="${escapeHtml(getItemId(item))}"><b>${escapeHtml(item.name || getItemId(item) || "CYBERWARE")}</b><small>${escapeHtml(formatToken(item.operationalState || item.runtimeStatus || item.status || "UNKNOWN"))}</small></button>`).join("") : '<p class="file-empty">No installed systems at this anchor.</p>'}</section>`;
  }

  function getUnmappedItems(installed = []) {
    return installed.filter((item) => !locateItem(item));
  }

  function renderPanel({ runtimeState = {}, citizen = {}, state = {}, renderInspector = null } = {}) {
    ensureState(state);
    const installed = Array.isArray(runtimeState?.installed) ? runtimeState.installed : [];
    const selected = installed.find((item) => getItemId(item) === String(state.selectedInstanceId || "")) || null;
    const view = getActiveView(state);
    const anchors = (view?.anchors || []).map((anchor) => ({ anchor, items: getAnchorItems(anchor, installed) }));
    const mappedItemIds = new Set((data.views || []).flatMap((candidateView) => (candidateView.anchors || []).flatMap((anchor) => getAnchorItems(anchor, installed).map(getItemId))));
    const unmapped = installed.filter((item) => !mappedItemIds.has(getItemId(item)));
    const selectedId = getItemId(selected);
    const selectedAnchorIds = new Set(anchors.filter((entry) => entry.items.some((item) => getItemId(item) === selectedId)).map((entry) => entry.anchor.id));
    const inspectorMarkup = typeof renderInspector === "function" ? renderInspector(selected, citizen, { contextLabel: "CYBERWARE / BODYMAP" }) : "";
    return `<section class="equipment-shell-panel cyberware-bodymap-panel cyberware-anatomy-panel" data-cyberware-bodymap-host data-cyberware-anatomy-view="${escapeHtml(view?.id || "")}">
      <div class="equipment-shell-panel__head cyberware-ui-section-head"><div><p class="kicker">CYBERWARE / BODYMAP</p><h5>Anatomy Navigation</h5><small>Navigate from full body to regional and slot-level views.</small></div><span class="equipment-panel-badge">${installed.length} SYSTEMS</span></div>
      <div class="cyberware-anatomy-workspace">
        <aside class="cyberware-anatomy-sidebar">
          <div class="cyberware-bodymap-local-head"><div><span>ANATOMY INDEX</span><b>Direct Regions</b></div><small>${(data.regions || []).length} VIEWS</small></div>
          ${renderRegionNav(state, installed)}
          ${unmapped.length ? `<section class="cyberware-anatomy-unmapped"><span>UNMAPPED SYSTEMS</span><b>${unmapped.length}</b>${unmapped.map((item) => `<button type="button" data-cyberware-select-item="${escapeHtml(getItemId(item))}">${escapeHtml(item.name || getItemId(item))}</button>`).join("")}</section>` : ""}
          ${renderAnchorStack(view, state, installed)}
        </aside>
        <section class="cyberware-anatomy-stage">
          <div class="cyberware-anatomy-stage__toolbar">${renderBreadcrumb(state)}${renderOrientationSwitch(state)}</div>
          ${view ? `<figure class="cyberware-anatomy-figure"><figcaption><span>${escapeHtml(getRegion(view.regionId)?.label || view.regionId)}</span><b>${escapeHtml(view.orientation)}</b></figcaption><div class="cyberware-anatomy-canvas"><img src="${escapeHtml(view.assetPath)}" alt="${escapeHtml((getRegion(view.regionId)?.label || view.regionId) + " " + view.orientation + " cyberware anatomy view")}" loading="eager" decoding="async">${anchors.map((entry) => renderAnchor(entry, selectedId)).join("")}</div></figure>` : '<p class="file-empty">Bodymap layout unavailable.</p>'}
        </section>
        <div class="cyberware-inspector-host" data-cyberware-inspector-host>${inspectorMarkup}</div>
      </div>
    </section>`;
  }

  function navigateState(state = {}, regionId = "BODY", options = {}) {
    ensureState(state);
    const region = getRegion(regionId);
    if (!region) return false;
    state.bodymapRegion = region.id;
    if (options.orientation) {
      const orientation = normalizeOrientation(options.orientation);
      if ((region.orientations || []).includes(orientation)) state.bodymapOrientationByRegion[region.id] = orientation;
    }
    state.selectedAnchorId = String(options.anchorId || "").trim();
    return true;
  }

  function orientState(state = {}, orientation = "FRONT") {
    ensureState(state);
    const region = getRegion(state.bodymapRegion);
    const normalized = normalizeOrientation(orientation);
    if (!region || !(region.orientations || []).includes(normalized)) return false;
    state.bodymapOrientationByRegion[region.id] = normalized;
    state.selectedAnchorId = "";
    return true;
  }

  function locateStateForItem(state = {}, item = {}) {
    ensureState(state);
    const location = locateItem(item);
    if (!location) return null;
    state.bodymapRegion = location.regionId;
    state.bodymapOrientationByRegion[location.regionId] = location.orientation;
    state.selectedAnchorId = location.anchorId || "";
    return location;
  }

  function selectAnchorState(state = {}, anchorId = "", installed = []) {
    ensureState(state);
    const view = getActiveView(state);
    const anchor = findAnchor(view, anchorId);
    if (!anchor) return { ok: false, reason: "ANCHOR_NOT_FOUND" };
    state.selectedAnchorId = anchor.id;
    const items = getAnchorItems(anchor, installed);
    if (anchor.kind === "NAVIGATION" && anchor.targetRegionId) {
      navigateState(state, anchor.targetRegionId);
      if (items.length === 1) state.selectedInstanceId = getItemId(items[0]);
      return { ok: true, action: "NAVIGATE", targetRegionId: anchor.targetRegionId, items };
    }
    if (items.length === 1) state.selectedInstanceId = getItemId(items[0]);
    return { ok: true, action: items.length > 1 ? "STACK" : items.length === 1 ? "SELECT" : "EMPTY", items, anchor };
  }

  const api = {
    ensureState,
    getRegion,
    getView,
    getActiveView,
    getBreadcrumb,
    locateItem,
    getAnchorItems,
    getRegionItems,
    getUnmappedItems,
    renderPanel,
    navigateState,
    orientState,
    locateStateForItem,
    selectAnchorState,
    validateLayouts,
    get layoutData() { return data; }
  };

  app.cyberwareAnatomyBodymap = api;
  app.validateCyberwareBodymapLayouts = validateLayouts;
})();
