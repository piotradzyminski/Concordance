window.WS_APP = window.WS_APP || {};

(function initItemTypeOperationsUi() {
  const UI_VERSION = "1.3.1";
  const feedbackByKey = new Map();

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function escapeHtml(value = "") {
    if (typeof window.WS_APP.escapeEquipmentHtml === "function") return window.WS_APP.escapeEquipmentHtml(value);
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function normalizeToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function getItemId(item = {}) {
    return normalizeId(item.instanceId || item.id || item.itemId);
  }

  function getItemType(item = {}) {
    return typeof window.WS_APP.resolveItemTypeId === "function"
      ? window.WS_APP.resolveItemTypeId(item)
      : normalizeToken(item.itemType || item.itemTypeId || "GENERIC_ITEM");
  }

  function getItemProfile(item = {}) {
    const typeId = getItemType(item);
    return typeof window.WS_APP.normalizeItemTypeProfile === "function"
      ? window.WS_APP.normalizeItemTypeProfile(typeId, item.itemTypeProfile || {})
      : clone(item.itemTypeProfile || {});
  }

  function getItemStateData(item = {}) {
    const typeId = getItemType(item);
    const profile = getItemProfile(item);
    const normalized = typeof window.WS_APP.normalizeItemTypeState === "function"
      ? window.WS_APP.normalizeItemTypeState(typeId, item.itemState || {}, profile)
      : clone(item.itemState || { data: {} });
    return clone(normalized?.data || {});
  }

  function getItemDisplayName(item = {}) {
    if (typeof window.WS_APP.getItemInstanceDisplayName === "function") {
      return window.WS_APP.getItemInstanceDisplayName(item);
    }
    return String(item.playerLabel || item.displayName || item.catalogName || item.name || item.model || getItemId(item) || "Item").trim() || "Item";
  }

  function getItemInstanceView(instanceId = "") {
    const id = normalizeId(instanceId);
    if (!id) return null;
    return window.WS_APP.getItemInstanceView?.(id)
      || window.WS_APP.getItemInstanceById?.(id)
      || null;
  }

  function getOwnedItems(state = {}, citizenId = "") {
    const ownerId = normalizeId(citizenId || state?.citizenId);
    return (Array.isArray(state?.items) ? state.items : [])
      .filter((item) => item && getItemId(item))
      .filter((item) => !ownerId || !item.ownerId || normalizeId(item.ownerId) === ownerId)
      .filter((item) => item.location !== "DESTROYED" && item.lifecycleState !== "DISPOSED");
  }

  function isInstalledInItem(item = {}) {
    return item.isInstalledInItem === true || normalizeToken(item.location) === "INSTALLED_IN_ITEM" || normalizeToken(item.locationData?.type) === "INSTALLED_IN_ITEM";
  }

  function makeFeedbackKey(citizenId = "", instanceId = "") {
    return `${normalizeId(citizenId) || "default"}::${normalizeId(instanceId)}`;
  }

  function setItemTypeOperationsUiFeedback(citizenId = "", instanceId = "", result = {}, operationType = "") {
    const key = makeFeedbackKey(citizenId, instanceId);
    if (!normalizeId(instanceId)) return null;
    const feedback = {
      ok: result?.ok === true,
      operationType: normalizeToken(operationType),
      reason: normalizeToken(result?.reason || result?.result?.reason || (result?.ok ? "OPERATION_COMMITTED" : "OPERATION_FAILED")),
      result: clone(result?.result || null),
      updatedAt: Date.now()
    };
    feedbackByKey.set(key, feedback);
    return clone(feedback);
  }

  function getItemTypeOperationsUiFeedback(citizenId = "", instanceId = "") {
    const feedback = feedbackByKey.get(makeFeedbackKey(citizenId, instanceId)) || null;
    return feedback ? clone(feedback) : null;
  }

  function clearItemTypeOperationsUiFeedback(citizenId = "", instanceId = "") {
    feedbackByKey.delete(makeFeedbackKey(citizenId, instanceId));
  }

  const REASON_LABELS = Object.freeze({
    OPERATION_COMMITTED: "OPERATION COMMITTED",
    ITEM_INSTANCE_NOT_FOUND: "ITEM INSTANCE NOT FOUND",
    ITEM_INSTANCE_OWNER_MISMATCH: "ITEM OWNER MISMATCH",
    ITEM_TYPE_OPERATION_TYPE_MISMATCH: "ITEM TYPE MISMATCH",
    MAGAZINE_TYPE_INCOMPATIBLE: "MAGAZINE TYPE INCOMPATIBLE",
    MAGAZINE_AMMUNITION_TYPE_INCOMPATIBLE: "AMMUNITION TYPE INCOMPATIBLE",
    AMMUNITION_TYPE_INCOMPATIBLE: "AMMUNITION TYPE INCOMPATIBLE",
    MAGAZINE_CAPACITY_EXCEEDED: "MAGAZINE CAPACITY EXCEEDED",
    AMMUNITION_QUANTITY_INSUFFICIENT: "NOT ENOUGH AMMUNITION",
    MAGAZINE_EMPTY: "MAGAZINE EMPTY",
    MAGAZINE_ROUNDS_INSUFFICIENT: "NOT ENOUGH ROUNDS",
    FIREARM_MAGAZINE_WELL_OCCUPIED: "MAGAZINE WELL OCCUPIED",
    FIREARM_MAGAZINE_NOT_INSTALLED: "NO MAGAZINE INSTALLED",
    FIREARM_CHAMBER_FULL: "CHAMBER FULL",
    FIREARM_CHAMBER_EMPTY: "CHAMBER EMPTY",
    CHAMBER_CLEAR_RETURN_TARGET_REQUIRED: "SELECT DISCARD OR INSTALL A MAGAZINE",
    MAGAZINE_RETURN_LOCATION_INVALID: "MAGAZINE RETURN LOCATION INVALID",
    GRENADE_SPENT: "GRENADE SPENT",
    GRENADE_TRIGGER_MODE_UNSUPPORTED: "TRIGGER MODE UNSUPPORTED",
    CONSUMABLE_QUANTITY_INSUFFICIENT: "NOT ENOUGH UNITS",
    ITEM_TYPE_OPERATION_IDEMPOTENCY_CONFLICT: "OPERATION KEY CONFLICT",
    ITEM_INSTANCE_TRANSACTION_IDEMPOTENCY_CONFLICT: "TRANSACTION KEY CONFLICT"
  });

  function formatFeedbackMessage(feedback = null) {
    if (!feedback) return "";
    if (feedback.ok) {
      if (feedback.operationType === "MAGAZINE_LOAD") return `LOADED ${Number(feedback.result?.roundsLoaded || 0)} ROUND(S)`;
      if (feedback.operationType === "MAGAZINE_UNLOAD") return `UNLOADED ${Number(feedback.result?.roundsUnloaded || 0)} ROUND(S)`;
      if (feedback.operationType === "FIREARM_INSERT_MAGAZINE") return "MAGAZINE INSERTED";
      if (feedback.operationType === "FIREARM_REMOVE_MAGAZINE") return "MAGAZINE REMOVED";
      if (feedback.operationType === "FIREARM_CHAMBER") return "ROUND CHAMBERED";
      if (feedback.operationType === "FIREARM_CLEAR_CHAMBER") return feedback.result?.discarded ? "CHAMBER CLEARED · ROUND DISCARDED" : "CHAMBER CLEARED";
      if (feedback.operationType === "FIREARM_SET_SAFETY") return `SAFETY · ${normalizeToken(feedback.result?.safety)}`;
      if (feedback.operationType === "FIREARM_SET_FIRE_MODE") return `FIRE MODE · ${normalizeToken(feedback.result?.fireMode)}`;
      if (feedback.operationType === "GRENADE_ARM") return "GRENADE ARMED · TIMER NOT STARTED";
      if (feedback.operationType === "GRENADE_DISARM") return "GRENADE DISARMED";
      if (feedback.operationType === "CONSUMABLE_USE") {
        const units = Number(feedback.result?.quantityUsed || feedback.result?.unitsConsumed || 0);
        const campaignDay = normalizeId(feedback.result?.campaignDay || "CURRENT DAY");
        return `USED ${units} UNIT(S) · LOGGED FOR ${campaignDay}`;
      }
      return "OPERATION COMMITTED";
    }
    return REASON_LABELS[feedback.reason] || feedback.reason.replaceAll("_", " ") || "OPERATION FAILED";
  }

  function renderFeedback(citizenId = "", instanceId = "") {
    const feedback = getItemTypeOperationsUiFeedback(citizenId, instanceId);
    if (!feedback) return "";
    return `<p class="item-type-operation-feedback ${feedback.ok ? "is-success" : "is-error"}" data-item-type-operation-feedback>${escapeHtml(formatFeedbackMessage(feedback))}</p>`;
  }

  function renderStatus(label = "", value = "", options = {}) {
    return `<span class="item-type-operation-status ${options.wide ? "is-wide" : ""}"><small>${escapeHtml(label)}</small><b>${escapeHtml(value || "—")}</b></span>`;
  }

  function renderSelectOptions(items = [], selectedId = "", emptyLabel = "NO COMPATIBLE ITEM") {
    if (!items.length) return `<option value="">${escapeHtml(emptyLabel)}</option>`;
    return items.map((item) => `<option value="${escapeHtml(getItemId(item))}" ${getItemId(item) === selectedId ? "selected" : ""}>${escapeHtml(getItemDisplayName(item))}</option>`).join("");
  }

  function getCompatibleMagazines(state = {}, firearm = {}) {
    const profile = getItemProfile(firearm);
    return getOwnedItems(state, state?.citizenId)
      .filter((item) => getItemType(item) === "MAGAZINE")
      .filter((item) => !isInstalledInItem(item))
      .filter((item) => {
        const candidate = getItemProfile(item);
        const magazineTypeMatches = normalizeToken(candidate.magazineType) === normalizeToken(profile.magazineType);
        const firearmAmmo = normalizeToken(profile.ammunitionType);
        const magazineAmmo = normalizeToken(candidate.ammunitionType);
        return magazineTypeMatches && (!firearmAmmo || !magazineAmmo || firearmAmmo === magazineAmmo);
      });
  }

  function getCompatibleAmmunition(state = {}, magazine = {}) {
    const profile = getItemProfile(magazine);
    return getOwnedItems(state, state?.citizenId)
      .filter((item) => getItemType(item) === "AMMUNITION")
      .filter((item) => Number(item.quantity || 0) > 0)
      .filter((item) => normalizeToken(getItemProfile(item).ammunitionType) === normalizeToken(profile.ammunitionType));
  }

  function getUnloadTargets(state = {}, magazine = {}) {
    const stateData = getItemStateData(magazine);
    const ammunitionDefinitionId = normalizeId(stateData.ammunitionDefinitionId);
    if (!ammunitionDefinitionId) return [];
    return getOwnedItems(state, state?.citizenId)
      .filter((item) => getItemType(item) === "AMMUNITION")
      .filter((item) => normalizeId(item.definitionId || item.catalogId) === ammunitionDefinitionId)
      .filter((item) => Number(item.quantity || 0) < Number(getItemProfile(item).stackLimit || 1));
  }

  function getInstalledMagazineView(firearm = {}) {
    const firearmId = getItemId(firearm);
    const instance = window.WS_APP.getInstalledMagazine?.(firearmId) || null;
    if (!instance) return null;
    return getItemInstanceView(instance.instanceId || instance.id) || instance;
  }

  function renderFirearmOperations(item = {}, state = {}) {
    const itemId = getItemId(item);
    const profile = getItemProfile(item);
    const stateData = getItemStateData(item);
    const installedMagazine = getInstalledMagazineView(item);
    const installedMagazineState = installedMagazine ? getItemStateData(installedMagazine) : {};
    const compatibleMagazines = installedMagazine ? [] : getCompatibleMagazines(state, item);
    const chamberCapacity = Math.max(0, Number(profile.chamberCapacity || 0));
    const chamberedRounds = Math.max(0, Number(stateData.chamberedRounds || 0));
    const magazineCapacity = installedMagazine ? Math.max(1, Number(getItemProfile(installedMagazine).capacity || 1)) : 0;
    const magazineRounds = installedMagazine ? Math.max(0, Number(installedMagazineState.roundsCurrent || 0)) : 0;
    const fireModes = Array.isArray(profile.fireModes) ? profile.fireModes.map(normalizeToken).filter(Boolean) : [];
    const canRecoverChamber = Boolean(installedMagazine) && magazineRounds + chamberedRounds <= magazineCapacity;

    return `<div class="item-type-operation-status-grid">
        ${renderStatus("Magazine", installedMagazine ? getItemDisplayName(installedMagazine) : "EMPTY")}
        ${renderStatus("Magazine Rounds", installedMagazine ? `${magazineRounds} / ${magazineCapacity}` : "—")}
        ${renderStatus("Chamber", `${chamberedRounds} / ${chamberCapacity}`)}
        ${renderStatus("Safety / Mode", `${normalizeToken(stateData.safety || "SAFE")} · ${normalizeToken(stateData.fireMode || fireModes[0] || "SINGLE")}`)}
      </div>
      ${installedMagazine ? `<div class="item-type-operation-row">
        <button class="secondary-action is-compact" type="button" data-item-type-operation-button="FIREARM_REMOVE_MAGAZINE" data-item-type-operation-instance="${escapeHtml(itemId)}">REMOVE MAGAZINE</button>
        <button class="secondary-action is-compact" type="button" data-equipment-select-item="${escapeHtml(getItemId(installedMagazine))}">INSPECT MAGAZINE</button>
      </div>` : `<form class="item-type-operation-form" data-item-type-operation-form="FIREARM_INSERT_MAGAZINE" data-item-type-operation-instance="${escapeHtml(itemId)}">
        <label><span>Compatible Magazine</span><select name="magazineInstanceId" ${compatibleMagazines.length ? "" : "disabled"}>${renderSelectOptions(compatibleMagazines)}</select></label>
        <button class="secondary-action is-compact" type="submit" ${compatibleMagazines.length ? "" : "disabled"}>INSERT MAGAZINE</button>
      </form>`}
      <div class="item-type-operation-row">
        <button class="secondary-action is-compact" type="button" data-item-type-operation-button="FIREARM_CHAMBER" data-item-type-operation-instance="${escapeHtml(itemId)}" ${installedMagazine && magazineRounds > 0 && chamberedRounds < chamberCapacity ? "" : "disabled"}>CHAMBER ROUND</button>
        <button class="secondary-action is-compact" type="button" data-item-type-operation-button="FIREARM_CLEAR_CHAMBER" data-item-type-operation-instance="${escapeHtml(itemId)}" data-item-type-operation-discard="false" ${chamberedRounds > 0 && canRecoverChamber ? "" : "disabled"}>CLEAR TO MAGAZINE</button>
        <button class="secondary-action is-compact is-danger" type="button" data-item-type-operation-button="FIREARM_CLEAR_CHAMBER" data-item-type-operation-instance="${escapeHtml(itemId)}" data-item-type-operation-discard="true" ${chamberedRounds > 0 ? "" : "disabled"}>DISCARD CHAMBER</button>
      </div>
      <div class="item-type-operation-control-group">
        <div><span>Safety</span><div class="item-type-operation-row">
          ${["SAFE", "FIRE"].map((value) => `<button class="secondary-action is-compact ${normalizeToken(stateData.safety) === value ? "is-active" : ""}" type="button" data-item-type-operation-button="FIREARM_SET_SAFETY" data-item-type-operation-instance="${escapeHtml(itemId)}" data-item-type-operation-value="${value}" ${normalizeToken(stateData.safety) === value ? "disabled" : ""}>${value}</button>`).join("")}
        </div></div>
        <div><span>Fire Mode</span><div class="item-type-operation-row">
          ${fireModes.length ? fireModes.map((value) => `<button class="secondary-action is-compact ${normalizeToken(stateData.fireMode) === value ? "is-active" : ""}" type="button" data-item-type-operation-button="FIREARM_SET_FIRE_MODE" data-item-type-operation-instance="${escapeHtml(itemId)}" data-item-type-operation-value="${escapeHtml(value)}" ${normalizeToken(stateData.fireMode) === value ? "disabled" : ""}>${escapeHtml(value)}</button>`).join("") : `<span class="item-type-operation-empty">NO FIRE MODES</span>`}
        </div></div>
      </div>`;
  }

  function renderMagazineOperations(item = {}, state = {}) {
    const itemId = getItemId(item);
    const profile = getItemProfile(item);
    const stateData = getItemStateData(item);
    const capacity = Math.max(1, Number(profile.capacity || 1));
    const roundsCurrent = Math.max(0, Number(stateData.roundsCurrent || 0));
    const remainingCapacity = Math.max(0, capacity - roundsCurrent);
    const ammunition = getCompatibleAmmunition(state, item);
    const unloadTargets = getUnloadTargets(state, item);
    const loadedDefinitionId = normalizeId(stateData.ammunitionDefinitionId);

    return `<div class="item-type-operation-status-grid">
        ${renderStatus("Rounds", `${roundsCurrent} / ${capacity}`)}
        ${renderStatus("Ammunition", loadedDefinitionId || normalizeToken(profile.ammunitionType) || "UNASSIGNED", { wide: true })}
      </div>
      <form class="item-type-operation-form" data-item-type-operation-form="MAGAZINE_LOAD" data-item-type-operation-instance="${escapeHtml(itemId)}">
        <label><span>Ammunition Stack</span><select name="ammunitionInstanceId" ${ammunition.length && remainingCapacity ? "" : "disabled"}>${renderSelectOptions(ammunition, "", remainingCapacity ? "NO COMPATIBLE AMMUNITION" : "MAGAZINE FULL")}</select></label>
        <label><span>Rounds</span><input name="rounds" type="number" min="1" max="${Math.max(1, remainingCapacity)}" value="${Math.max(1, Math.min(remainingCapacity || 1, 10))}" ${remainingCapacity ? "" : "disabled"}></label>
        <button class="secondary-action is-compact" type="submit" ${ammunition.length && remainingCapacity ? "" : "disabled"}>LOAD MAGAZINE</button>
      </form>
      <form class="item-type-operation-form" data-item-type-operation-form="MAGAZINE_UNLOAD" data-item-type-operation-instance="${escapeHtml(itemId)}">
        <label><span>Return Stack</span><select name="targetAmmunitionInstanceId" ${roundsCurrent ? "" : "disabled"}>
          ${unloadTargets.map((target) => `<option value="${escapeHtml(getItemId(target))}">${escapeHtml(`${getItemDisplayName(target)} · ${Number(target.quantity || 0)}`)}</option>`).join("")}
          <option value="__NEW__">CREATE NEW AMMUNITION STACK</option>
        </select></label>
        <label><span>Rounds</span><input name="rounds" type="number" min="1" max="${Math.max(1, roundsCurrent)}" value="${Math.max(1, roundsCurrent)}" ${roundsCurrent ? "" : "disabled"}></label>
        <button class="secondary-action is-compact" type="submit" ${roundsCurrent ? "" : "disabled"}>UNLOAD MAGAZINE</button>
      </form>`;
  }

  function renderGrenadeOperations(item = {}) {
    const itemId = getItemId(item);
    const profile = getItemProfile(item);
    const stateData = getItemStateData(item);
    const triggerModes = Array.isArray(profile.triggerModes) && profile.triggerModes.length
      ? profile.triggerModes.map(normalizeToken).filter(Boolean)
      : ["MANUAL"];
    const armed = stateData.armed === true;
    const spent = stateData.spent === true;
    return `<div class="item-type-operation-status-grid">
        ${renderStatus("Status", spent ? "SPENT" : armed ? "ARMED" : "SAFE")}
        ${renderStatus("Trigger / Fuse", `${normalizeToken(stateData.triggerMode || triggerModes[0])} · ${Math.max(0, Number(stateData.fuseSeconds || 0))}S`)}
      </div>
      ${armed ? `<button class="secondary-action is-compact" type="button" data-item-type-operation-button="GRENADE_DISARM" data-item-type-operation-instance="${escapeHtml(itemId)}" ${spent ? "disabled" : ""}>DISARM GRENADE</button>` : `<form class="item-type-operation-form" data-item-type-operation-form="GRENADE_ARM" data-item-type-operation-instance="${escapeHtml(itemId)}">
        <label><span>Trigger Mode</span><select name="triggerMode" ${spent ? "disabled" : ""}>${triggerModes.map((mode) => `<option value="${escapeHtml(mode)}" ${normalizeToken(stateData.triggerMode) === mode ? "selected" : ""}>${escapeHtml(mode)}</option>`).join("")}</select></label>
        <label><span>Fuse Seconds</span><input name="fuseSeconds" type="number" min="0" max="3600" value="${Math.max(0, Number(stateData.fuseSeconds || profile.defaultFuseSeconds || 0))}" ${spent ? "disabled" : ""}></label>
        <button class="secondary-action is-compact" type="submit" ${spent ? "disabled" : ""}>ARM GRENADE</button>
      </form>`}
      <p class="item-type-operation-note">ARMING STORES THE CONFIGURATION ONLY. NO TIMER OR DETONATION IS STARTED.</p>`;
  }

  function renderConsumableUsageLog(citizenId = "", itemId = "") {
    const groups = typeof window.WS_APP.getConsumableUsageByDay === "function"
      ? window.WS_APP.getConsumableUsageByDay({ citizenId, instanceId: itemId })
      : [];
    if (!groups.length) return '<p class="item-type-operation-note">NO RECORDED USE.</p>';
    return `<details class="item-type-consumable-log"><summary>USAGE LOG</summary><div class="item-type-consumable-log__days">
      ${groups.slice(0, 12).map((group) => `<div class="item-type-consumable-log__day"><b>${escapeHtml(group.campaignDay)}</b><span>${escapeHtml(`${group.totalQuantityUsed} UNIT(S)`)}</span></div>`).join("")}
    </div></details>`;
  }

  function renderConsumableOperations(item = {}, state = {}) {
    const itemId = getItemId(item);
    const profile = getItemProfile(item);
    const quantity = Math.max(1, Number(item.quantity || 1));
    const citizenId = normalizeId(state?.citizenId || item.ownerId);
    const campaignDay = normalizeId(window.WS_APP.getCampaignDateIso?.() || window.WS_APP.CAMPAIGN_DATE_ISO || "2109-02-13");
    const todayEntries = typeof window.WS_APP.getConsumableUsageLog === "function"
      ? window.WS_APP.getConsumableUsageLog({ citizenId, instanceId: itemId, campaignDay })
      : [];
    const usedToday = todayEntries.reduce((sum, entry) => sum + Math.max(0, Number(entry.quantityUsed || 0)), 0);
    return `<div class="item-type-operation-status-grid">
        ${renderStatus("Units", String(quantity))}
        ${renderStatus("Kind", normalizeToken(profile.consumableKind || "GENERAL"))}
        ${renderStatus("Used Today", String(usedToday))}
        ${renderStatus("Campaign Day", campaignDay)}
      </div>
      <form class="item-type-operation-form" data-item-type-operation-form="CONSUMABLE_USE" data-item-type-operation-instance="${escapeHtml(itemId)}">
        <label><span>Units</span><input name="units" type="number" min="1" max="${quantity}" value="1"></label>
        <button class="secondary-action is-compact" type="submit">USE CONSUMABLE</button>
      </form>
      <p class="item-type-operation-note">USE CHANGES QUANTITY AND ADDS ONE ENTRY TO THE DAILY CAMPAIGN LOG. NO EFFECT OR CITIZEN STATUS IS CREATED.</p>
      ${renderConsumableUsageLog(citizenId, itemId)}`;
  }

  function renderItemTypeOperationsPanel(item = {}, state = {}) {
    const typeId = getItemType(item);
    if (!['FIREARM', 'MAGAZINE', 'GRENADE', 'CONSUMABLE'].includes(typeId)) return "";
    const citizenId = normalizeId(state?.citizenId || item.ownerId);
    const itemId = getItemId(item);
    const body = typeId === "FIREARM"
      ? renderFirearmOperations(item, state)
      : typeId === "MAGAZINE"
        ? renderMagazineOperations(item, state)
        : typeId === "GRENADE"
          ? renderGrenadeOperations(item, state)
          : renderConsumableOperations(item, state);
    return `<section class="equipment-item-inspector-section item-type-operations-panel" data-item-type-operations-panel data-item-type="${escapeHtml(typeId)}" data-item-type-operation-instance="${escapeHtml(itemId)}">
      <div class="equipment-item-inspector-section__head"><h6>Item Operations</h6><span>${escapeHtml(typeId.replaceAll("_", " "))}</span></div>
      ${body}
      ${renderFeedback(citizenId, itemId)}
    </section>`;
  }

  Object.assign(window.WS_APP, {
    ITEM_TYPE_OPERATIONS_UI_VERSION: UI_VERSION,
    renderItemTypeOperationsPanel,
    setItemTypeOperationsUiFeedback,
    getItemTypeOperationsUiFeedback,
    clearItemTypeOperationsUiFeedback
  });
})();
