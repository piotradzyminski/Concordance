window.WS_APP = window.WS_APP || {};

(function initCitizenStatusStore(app) {
  "use strict";

  const API_VERSION = "1.0.0";
  const STORAGE_KEY = "ws_citizen_status_effects_v1";
  const STORAGE_SCHEMA_KEY = "ws_citizen_status_effects_schema";
  const STORAGE_SCHEMA_VERSION = "citizen_status_effects_1_0x";
  const ACTIVE_STATE = "ACTIVE";
  let state = readState();

  function clone(value) {
    if (value == null) return value;
    try { return structuredClone(value); }
    catch (error) { return JSON.parse(JSON.stringify(value)); }
  }

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function normalizeToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function normalizeList(value = []) {
    return [...new Set((Array.isArray(value) ? value : []).map(normalizeToken).filter(Boolean))];
  }

  function normalizeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function campaignTimeIso(value = "") {
    const explicit = normalizeId(value);
    if (explicit) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(explicit)) return `${explicit}T00:00:00.000Z`;
      const parsed = Date.parse(explicit);
      if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
    }
    const campaignDate = normalizeId(app.getCampaignDateIso?.() || app.CAMPAIGN_DATE_ISO);
    if (/^\d{4}-\d{2}-\d{2}$/.test(campaignDate)) return `${campaignDate}T00:00:00.000Z`;
    return new Date().toISOString();
  }

  function addSeconds(iso = "", seconds = 0) {
    const timestamp = Date.parse(campaignTimeIso(iso));
    const duration = Math.max(0, Math.round(normalizeNumber(seconds, 0)));
    return duration > 0 ? new Date(timestamp + duration * 1000).toISOString() : "";
  }

  function makeStatusInstanceId(citizenId = "", statusId = "", resolutionId = "") {
    const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return `status:${normalizeId(citizenId)}:${normalizeToken(statusId)}:${normalizeId(resolutionId) || random}`;
  }

  function normalizeStatus(value = {}, index = 0) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const citizenId = normalizeId(source.citizenId);
    const statusId = normalizeToken(source.statusId || source.id || `STATUS_${index + 1}`);
    const startedAt = campaignTimeIso(source.startedAt || source.createdAt);
    const durationSeconds = Math.max(0, Math.round(normalizeNumber(source.durationSeconds, 0)));
    const expiresAt = normalizeId(source.expiresAt) || addSeconds(startedAt, durationSeconds);
    return {
      statusInstanceId: normalizeId(source.statusInstanceId) || makeStatusInstanceId(citizenId, statusId, source.source?.resolutionId),
      citizenId,
      statusId,
      label: normalizeId(source.label) || statusId.replaceAll("_", " "),
      category: normalizeToken(source.category || "GENERAL") || "GENERAL",
      state: normalizeToken(source.state || ACTIVE_STATE) || ACTIVE_STATE,
      magnitude: normalizeNumber(source.magnitude, 1),
      stacks: Math.max(1, Math.round(normalizeNumber(source.stacks, 1))),
      maxStacks: Math.max(1, Math.round(normalizeNumber(source.maxStacks, 1))),
      stackMode: normalizeToken(source.stackMode || "REFRESH") || "REFRESH",
      tags: normalizeList(source.tags),
      modifiers: clone(source.modifiers && typeof source.modifiers === "object" && !Array.isArray(source.modifiers) ? source.modifiers : {}),
      source: {
        domain: normalizeToken(source.source?.domain || "ITEM_EFFECT") || "ITEM_EFFECT",
        resolutionId: normalizeId(source.source?.resolutionId),
        operationId: normalizeId(source.source?.operationId),
        definitionId: normalizeId(source.source?.definitionId),
        instanceId: normalizeId(source.source?.instanceId),
        profileId: normalizeToken(source.source?.profileId),
        units: Math.max(1, Math.round(normalizeNumber(source.source?.units, 1)))
      },
      startedAt,
      refreshedAt: campaignTimeIso(source.refreshedAt || startedAt),
      expiresAt,
      durationSeconds,
      createdAt: campaignTimeIso(source.createdAt || startedAt),
      updatedAt: campaignTimeIso(source.updatedAt || source.refreshedAt || startedAt),
      revision: Math.max(1, Math.round(normalizeNumber(source.revision, 1)))
    };
  }

  function normalizeState(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      revision: Math.max(0, Math.round(normalizeNumber(source.revision, 0))),
      statuses: (Array.isArray(source.statuses) ? source.statuses : []).map(normalizeStatus).filter((status) => status.citizenId && status.statusId)
    };
  }

  function readState() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      return normalizeState(parsed || {});
    } catch (error) {
      console.warn("W&S Citizen Status Store could not read localStorage.", error);
      return normalizeState({});
    }
  }

  function persistState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.localStorage.setItem(STORAGE_SCHEMA_KEY, STORAGE_SCHEMA_VERSION);
      return true;
    } catch (error) {
      console.warn("W&S Citizen Status Store could not persist localStorage.", error);
      return false;
    }
  }

  function isStatusExpired(status = {}, atTime = "") {
    if (normalizeToken(status.state) !== ACTIVE_STATE) return true;
    if (!status.expiresAt) return false;
    return Date.parse(status.expiresAt) <= Date.parse(campaignTimeIso(atTime));
  }

  function emitUpdated(detail = {}) {
    window.dispatchEvent?.(new CustomEvent("ws:citizen-status-effects-updated", {
      detail: {
        storeRevision: state.revision,
        ...clone(detail)
      }
    }));
  }

  function expireCitizenStatusEffects(input = {}) {
    const atTime = campaignTimeIso(input.atTime || input.campaignDateIso);
    const citizenId = normalizeId(input.citizenId);
    const expired = [];
    state.statuses = state.statuses.map((status) => {
      if (citizenId && status.citizenId !== citizenId) return status;
      if (!isStatusExpired(status, atTime)) return status;
      if (normalizeToken(status.state) !== ACTIVE_STATE) return status;
      const next = { ...status, state: "EXPIRED", updatedAt: atTime, revision: status.revision + 1 };
      expired.push(next.statusInstanceId);
      return next;
    });
    if (expired.length) {
      state.revision += 1;
      persistState();
      emitUpdated({ operation: "EXPIRE", citizenId, statusInstanceIds: expired, atTime });
    }
    return { ok: true, expiredCount: expired.length, statusInstanceIds: expired, atTime };
  }

  function getCitizenStatusEffects(citizenId = "", options = {}) {
    const id = normalizeId(citizenId);
    const atTime = campaignTimeIso(options.atTime);
    if (options.expire !== false) expireCitizenStatusEffects({ citizenId: id, atTime });
    return state.statuses
      .filter((status) => !id || status.citizenId === id)
      .filter((status) => options.includeInactive === true || (status.state === ACTIVE_STATE && !isStatusExpired(status, atTime)))
      .map(clone);
  }

  function getCitizenStatusEffect(statusInstanceId = "") {
    const id = normalizeId(statusInstanceId);
    const status = state.statuses.find((entry) => entry.statusInstanceId === id) || null;
    return status ? clone(status) : null;
  }

  function applyCitizenStatusEffects(citizenId = "", effects = [], context = {}) {
    const id = normalizeId(citizenId);
    if (!id) return { ok: false, reason: "CITIZEN_ID_REQUIRED" };
    if (typeof app.getCitizenById === "function" && !app.getCitizenById(id)) return { ok: false, reason: "CITIZEN_NOT_FOUND", citizenId: id };
    const resolutionId = normalizeId(context.resolutionId);
    const existingByResolution = resolutionId
      ? state.statuses.filter((status) => status.citizenId === id && status.source?.resolutionId === resolutionId)
      : [];
    if (existingByResolution.length) {
      return { ok: true, replay: true, citizenId: id, statusEffects: existingByResolution.map(clone), storeRevision: state.revision };
    }
    const atTime = campaignTimeIso(context.atTime);
    expireCitizenStatusEffects({ citizenId: id, atTime });
    const applied = [];
    for (const raw of Array.isArray(effects) ? effects : []) {
      const effect = normalizeStatus({
        ...clone(raw),
        citizenId: id,
        source: {
          ...(clone(raw?.source) || {}),
          domain: "ITEM_EFFECT",
          resolutionId,
          operationId: normalizeId(context.operationId),
          definitionId: normalizeId(context.definitionId),
          instanceId: normalizeId(context.instanceId),
          profileId: normalizeToken(context.profileId),
          units: Math.max(1, Math.round(normalizeNumber(context.units, 1)))
        },
        startedAt: atTime,
        refreshedAt: atTime,
        createdAt: atTime,
        updatedAt: atTime
      });
      const activeIndex = state.statuses.findIndex((status) => status.citizenId === id && status.statusId === effect.statusId && status.state === ACTIVE_STATE && !isStatusExpired(status, atTime));
      if (activeIndex >= 0 && effect.stackMode !== "INDEPENDENT") {
        const current = state.statuses[activeIndex];
        const stackMode = effect.stackMode;
        const stacks = stackMode === "STACK"
          ? Math.min(effect.maxStacks, current.stacks + effect.stacks)
          : Math.min(effect.maxStacks, Math.max(current.stacks, effect.stacks));
        const magnitude = stackMode === "STACK"
          ? current.magnitude + effect.magnitude
          : Math.max(current.magnitude, effect.magnitude);
        const next = normalizeStatus({
          ...current,
          ...effect,
          statusInstanceId: current.statusInstanceId,
          stacks,
          magnitude,
          startedAt: current.startedAt,
          refreshedAt: atTime,
          createdAt: current.createdAt,
          updatedAt: atTime,
          revision: current.revision + 1
        });
        state.statuses.splice(activeIndex, 1, next);
        applied.push(next);
      } else {
        state.statuses.push(effect);
        applied.push(effect);
      }
    }
    if (!applied.length) return { ok: true, citizenId: id, statusEffects: [], storeRevision: state.revision };
    state.revision += 1;
    persistState();
    emitUpdated({ operation: "APPLY", citizenId: id, resolutionId, statusInstanceIds: applied.map((status) => status.statusInstanceId), atTime });
    return { ok: true, citizenId: id, statusEffects: applied.map(clone), storeRevision: state.revision };
  }

  function removeCitizenStatusEffect(statusInstanceId = "", options = {}) {
    const id = normalizeId(statusInstanceId);
    const index = state.statuses.findIndex((status) => status.statusInstanceId === id);
    if (index < 0) return { ok: false, reason: "CITIZEN_STATUS_NOT_FOUND", statusInstanceId: id };
    const current = state.statuses[index];
    const atTime = campaignTimeIso(options.atTime);
    const next = { ...current, state: "REMOVED", updatedAt: atTime, revision: current.revision + 1 };
    state.statuses.splice(index, 1, next);
    state.revision += 1;
    persistState();
    emitUpdated({ operation: "REMOVE", citizenId: current.citizenId, statusInstanceIds: [id], atTime });
    return { ok: true, statusEffect: clone(next), storeRevision: state.revision };
  }

  function resetCitizenStatusStore(options = {}) {
    state = normalizeState({});
    if (options.persist !== false) persistState();
    emitUpdated({ operation: "RESET" });
    return { ok: true, storeRevision: state.revision };
  }

  window.addEventListener?.("ws:campaign-date-updated", (event) => {
    expireCitizenStatusEffects({ campaignDateIso: event?.detail?.iso });
  });

  Object.assign(app, {
    CITIZEN_STATUS_STORE_VERSION: API_VERSION,
    CITIZEN_STATUS_STORE_SCHEMA_VERSION: STORAGE_SCHEMA_VERSION,
    getCitizenStatusEffects,
    getCitizenStatusEffect,
    applyCitizenStatusEffects,
    removeCitizenStatusEffect,
    expireCitizenStatusEffects,
    resetCitizenStatusStore
  });
})(window.WS_APP);
