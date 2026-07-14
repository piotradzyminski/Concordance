window.WS_APP = window.WS_APP || {};

(function initItemEffectResolver(app) {
  "use strict";

  const API_VERSION = "1.0.0";
  const STORAGE_KEY = "ws_item_effect_resolutions_v1";
  const STORAGE_SCHEMA_KEY = "ws_item_effect_resolutions_schema";
  const STORAGE_SCHEMA_VERSION = "item_effect_resolution_1_0x";
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

  function stableSerialize(value) {
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
    if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
    return JSON.stringify(value ?? null);
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

  function normalizeStatusEffect(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      statusId: normalizeToken(source.statusId),
      label: normalizeId(source.label) || normalizeToken(source.statusId).replaceAll("_", " "),
      category: normalizeToken(source.category || "GENERAL") || "GENERAL",
      durationSeconds: Math.max(0, Math.round(Number(source.durationSeconds) || 0)),
      stackMode: normalizeToken(source.stackMode || "REFRESH") || "REFRESH",
      magnitude: Number.isFinite(Number(source.magnitude)) ? Number(source.magnitude) : 1,
      maxStacks: Math.max(1, Math.round(Number(source.maxStacks) || 1)),
      scaleMagnitudeWithUnits: source.scaleMagnitudeWithUnits === true,
      scaleDurationWithUnits: source.scaleDurationWithUnits === true,
      tags: normalizeList(source.tags),
      modifiers: clone(source.modifiers && typeof source.modifiers === "object" && !Array.isArray(source.modifiers) ? source.modifiers : {})
    };
  }

  function normalizeProfile(value = {}, index = 0) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      id: normalizeToken(source.id || `ITEM_EFFECT_${index + 1}`),
      label: normalizeId(source.label) || normalizeToken(source.id).replaceAll("_", " "),
      targetScope: normalizeToken(source.targetScope || "CITIZEN") || "CITIZEN",
      priority: Number.isFinite(Number(source.priority)) ? Number(source.priority) : 100,
      resultLabel: normalizeId(source.resultLabel),
      matches: {
        definitionIds: (Array.isArray(source.matches?.definitionIds) ? source.matches.definitionIds : []).map(normalizeId).filter(Boolean),
        categories: normalizeList(source.matches?.categories),
        subtypes: normalizeList(source.matches?.subtypes),
        tagsAny: normalizeList(source.matches?.tagsAny),
        tagsAll: normalizeList(source.matches?.tagsAll)
      },
      statusEffects: (Array.isArray(source.statusEffects) ? source.statusEffects : []).map(normalizeStatusEffect).filter((effect) => effect.statusId)
    };
  }

  const profiles = (Array.isArray(window.APP_DATA?.itemEffectCatalog) ? window.APP_DATA.itemEffectCatalog : [])
    .map(normalizeProfile)
    .filter((profile) => profile.id)
    .sort((left, right) => right.priority - left.priority);

  function normalizeResolution(value = {}, index = 0) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      resolutionId: normalizeId(source.resolutionId || `effect-resolution-${index + 1}`),
      signature: normalizeId(source.signature),
      status: normalizeToken(source.status || "COMPLETED") || "COMPLETED",
      reason: normalizeToken(source.reason || "ITEM_EFFECT_RESOLVED") || "ITEM_EFFECT_RESOLVED",
      citizenId: normalizeId(source.citizenId),
      instanceId: normalizeId(source.instanceId),
      definitionId: normalizeId(source.definitionId),
      operationId: normalizeId(source.operationId),
      profileId: normalizeToken(source.profileId),
      targetScope: normalizeToken(source.targetScope || "NONE") || "NONE",
      unitsConsumed: Math.max(1, Math.round(Number(source.unitsConsumed) || 1)),
      resultLabel: normalizeId(source.resultLabel),
      appliedStatusInstanceIds: (Array.isArray(source.appliedStatusInstanceIds) ? source.appliedStatusInstanceIds : []).map(normalizeId).filter(Boolean),
      appliedStatusIds: normalizeList(source.appliedStatusIds),
      inputSnapshot: clone(source.inputSnapshot || {}),
      error: clone(source.error || null),
      createdAt: campaignTimeIso(source.createdAt),
      updatedAt: campaignTimeIso(source.updatedAt || source.createdAt),
      revision: Math.max(1, Math.round(Number(source.revision) || 1))
    };
  }

  function normalizeState(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      revision: Math.max(0, Math.round(Number(source.revision) || 0)),
      resolutions: (Array.isArray(source.resolutions) ? source.resolutions : []).map(normalizeResolution).filter((resolution) => resolution.resolutionId)
    };
  }

  function readState() {
    try { return normalizeState(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") || {}); }
    catch (error) {
      console.warn("W&S Item Effect Resolver could not read localStorage.", error);
      return normalizeState({});
    }
  }

  function persistState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.localStorage.setItem(STORAGE_SCHEMA_KEY, STORAGE_SCHEMA_VERSION);
      return true;
    } catch (error) {
      console.warn("W&S Item Effect Resolver could not persist localStorage.", error);
      return false;
    }
  }

  function getContext(input = {}) {
    const instanceId = normalizeId(input.instanceId);
    const instance = input.item || input.instance || (instanceId ? app.getItemInstanceById?.(instanceId) : null) || {};
    const definitionId = normalizeId(input.definitionId || instance.definitionId);
    const definition = definitionId ? app.getEquipmentCatalogItemById?.(definitionId) || {} : {};
    const view = instanceId ? app.getItemInstanceView?.(instanceId) || {} : {};
    const source = { ...clone(definition), ...clone(view), ...clone(instance), ...(clone(input.effectContext) || {}) };
    const consumableKind = normalizeToken(source.itemTypeProfile?.consumableKind || source.consumableKind);
    const tags = normalizeList([...(Array.isArray(source.tags) ? source.tags : []), consumableKind]);
    return {
      instanceId,
      definitionId,
      category: normalizeToken(source.category || consumableKind),
      subtype: normalizeToken(source.subtype),
      tags,
      name: normalizeId(source.playerLabel || source.displayName || source.catalogName || source.name || definition.name || definitionId)
    };
  }

  function profileMatches(profile = {}, context = {}) {
    const matches = profile.matches || {};
    if (matches.definitionIds.includes(context.definitionId)) return { matched: true, score: 10000 };
    let score = 0;
    if (matches.categories.length) {
      if (!matches.categories.includes(context.category)) return { matched: false, score: 0 };
      score += 200;
    }
    if (matches.subtypes.length) {
      if (!matches.subtypes.includes(context.subtype)) return { matched: false, score: 0 };
      score += 300;
    }
    if (matches.tagsAll.length && !matches.tagsAll.every((tag) => context.tags.includes(tag))) return { matched: false, score: 0 };
    if (matches.tagsAll.length) score += matches.tagsAll.length * 50;
    if (matches.tagsAny.length) {
      const count = matches.tagsAny.filter((tag) => context.tags.includes(tag)).length;
      if (!count && !matches.categories.length && !matches.subtypes.length) return { matched: false, score: 0 };
      score += count * 20;
    }
    return { matched: score > 0, score: score + profile.priority };
  }

  function getConsumableEffectProfile(input = {}) {
    const context = getContext(input);
    let selected = null;
    let selectedScore = -1;
    for (const profile of profiles) {
      const match = profileMatches(profile, context);
      if (!match.matched || match.score <= selectedScore) continue;
      selected = profile;
      selectedScore = match.score;
    }
    return selected ? { ok: true, context, profile: clone(selected), score: selectedScore } : { ok: false, reason: "ITEM_EFFECT_PROFILE_NOT_FOUND", context, profile: null };
  }

  function previewConsumableEffect(input = {}) {
    const resolved = getConsumableEffectProfile(input);
    if (!resolved.ok) return { ...resolved, targetScope: "NONE", statusEffects: [], resultLabel: "No registered effect" };
    const units = Math.max(1, Math.round(Number(input.units) || 1));
    const statusEffects = resolved.profile.statusEffects.map((effect) => ({
      ...clone(effect),
      magnitude: effect.scaleMagnitudeWithUnits ? effect.magnitude * units : effect.magnitude,
      durationSeconds: effect.scaleDurationWithUnits ? effect.durationSeconds * units : effect.durationSeconds
    }));
    return {
      ok: true,
      profileId: resolved.profile.id,
      label: resolved.profile.label,
      targetScope: resolved.profile.targetScope,
      resultLabel: resolved.profile.resultLabel || resolved.profile.label,
      statusEffects,
      context: resolved.context,
      units
    };
  }

  function makeSignature(input = {}, preview = {}) {
    return stableSerialize({
      citizenId: normalizeId(input.citizenId),
      instanceId: normalizeId(input.instanceId),
      definitionId: normalizeId(input.definitionId || preview.context?.definitionId),
      operationId: normalizeId(input.operationId),
      unitsConsumed: Math.max(1, Math.round(Number(input.unitsConsumed || input.units) || 1)),
      profileId: normalizeToken(preview.profileId),
      targetScope: normalizeToken(preview.targetScope)
    });
  }

  function getItemEffectResolution(resolutionId = "") {
    const id = normalizeId(resolutionId);
    const record = state.resolutions.find((entry) => entry.resolutionId === id) || null;
    return record ? clone(record) : null;
  }

  function getItemEffectResolutions(filters = {}) {
    const citizenId = normalizeId(filters.citizenId);
    const status = normalizeToken(filters.status);
    return state.resolutions
      .filter((entry) => !citizenId || entry.citizenId === citizenId)
      .filter((entry) => !status || entry.status === status)
      .map(clone);
  }

  function saveResolution(record = {}) {
    const normalized = normalizeResolution(record);
    const index = state.resolutions.findIndex((entry) => entry.resolutionId === normalized.resolutionId);
    if (index >= 0) state.resolutions.splice(index, 1, normalized);
    else state.resolutions.push(normalized);
    state.revision += 1;
    persistState();
    return clone(normalized);
  }

  function emitResolved(record = {}, replay = false) {
    window.dispatchEvent?.(new CustomEvent("ws:item-effect-resolution-completed", {
      detail: { replay, storeRevision: state.revision, resolution: clone(record) }
    }));
  }

  function resolveConsumableEffect(input = {}) {
    const resolutionId = normalizeId(input.resolutionId || input.transactionId || input.idempotencyKey);
    if (!resolutionId) return { ok: false, reason: "ITEM_EFFECT_RESOLUTION_ID_REQUIRED" };
    const preview = previewConsumableEffect(input);
    const signature = makeSignature(input, preview);
    const existing = getItemEffectResolution(resolutionId);
    if (existing && existing.signature !== signature) return { ok: false, reason: "ITEM_EFFECT_IDEMPOTENCY_CONFLICT", resolution: existing };
    if (existing?.status === "COMPLETED") {
      emitResolved(existing, true);
      return { ok: true, replay: true, reason: existing.reason, resolution: existing, statusEffects: existing.appliedStatusInstanceIds.map((id) => app.getCitizenStatusEffect?.(id)).filter(Boolean) };
    }
    const now = campaignTimeIso(input.atTime);
    const baseRecord = {
      resolutionId,
      signature,
      status: "PENDING",
      reason: "ITEM_EFFECT_PENDING",
      citizenId: normalizeId(input.citizenId),
      instanceId: normalizeId(input.instanceId),
      definitionId: normalizeId(input.definitionId || preview.context?.definitionId),
      operationId: normalizeId(input.operationId || input.transactionId),
      profileId: normalizeToken(preview.profileId),
      targetScope: normalizeToken(preview.targetScope),
      unitsConsumed: Math.max(1, Math.round(Number(input.unitsConsumed || input.units) || 1)),
      resultLabel: normalizeId(preview.resultLabel),
      appliedStatusInstanceIds: [],
      appliedStatusIds: [],
      inputSnapshot: clone({
        citizenId: input.citizenId,
        instanceId: input.instanceId,
        definitionId: input.definitionId || preview.context?.definitionId,
        operationId: input.operationId || input.transactionId,
        unitsConsumed: input.unitsConsumed || input.units,
        effectContext: input.effectContext,
        atTime: input.atTime
      }),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      revision: (existing?.revision || 0) + 1
    };

    if (!preview.ok) {
      const completed = saveResolution({ ...baseRecord, status: "COMPLETED", reason: "ITEM_EFFECT_PROFILE_NOT_FOUND", targetScope: "NONE", resultLabel: "No registered effect" });
      emitResolved(completed, false);
      return { ok: true, reason: completed.reason, resolution: completed, statusEffects: [] };
    }

    if (preview.targetScope !== "CITIZEN") {
      const completed = saveResolution({ ...baseRecord, status: "COMPLETED", reason: "ITEM_EFFECT_EXTERNAL_USE_RECORDED" });
      emitResolved(completed, false);
      return { ok: true, reason: completed.reason, resolution: completed, statusEffects: [] };
    }

    if (typeof app.applyCitizenStatusEffects !== "function") {
      const failed = saveResolution({ ...baseRecord, status: "FAILED", reason: "CITIZEN_STATUS_STORE_REQUIRED", error: { code: "CITIZEN_STATUS_STORE_REQUIRED" } });
      return { ok: false, reason: failed.reason, resolution: failed, statusEffects: [] };
    }

    const applied = app.applyCitizenStatusEffects(normalizeId(input.citizenId), preview.statusEffects, {
      resolutionId,
      operationId: normalizeId(input.operationId || input.transactionId),
      definitionId: normalizeId(input.definitionId || preview.context?.definitionId),
      instanceId: normalizeId(input.instanceId),
      profileId: preview.profileId,
      units: baseRecord.unitsConsumed,
      atTime: input.atTime
    });
    if (!applied?.ok) {
      const failed = saveResolution({ ...baseRecord, status: "FAILED", reason: normalizeToken(applied?.reason || "ITEM_EFFECT_STATUS_APPLY_FAILED"), error: clone(applied) });
      return { ok: false, reason: failed.reason, resolution: failed, statusEffects: [] };
    }
    const statusEffects = Array.isArray(applied.statusEffects) ? applied.statusEffects : [];
    const completed = saveResolution({
      ...baseRecord,
      status: "COMPLETED",
      reason: statusEffects.length ? "ITEM_EFFECT_STATUSES_APPLIED" : "ITEM_EFFECT_RESOLVED",
      appliedStatusInstanceIds: statusEffects.map((status) => normalizeId(status.statusInstanceId)).filter(Boolean),
      appliedStatusIds: statusEffects.map((status) => normalizeToken(status.statusId)).filter(Boolean)
    });
    emitResolved(completed, false);
    return { ok: true, replay: applied.replay === true, reason: completed.reason, resolution: completed, statusEffects: statusEffects.map(clone) };
  }

  function retryConsumableEffectResolution(resolutionId = "") {
    const existing = getItemEffectResolution(resolutionId);
    if (!existing) return { ok: false, reason: "ITEM_EFFECT_RESOLUTION_NOT_FOUND", resolutionId: normalizeId(resolutionId) };
    if (existing.status === "COMPLETED") return resolveConsumableEffect({ ...existing.inputSnapshot, resolutionId: existing.resolutionId });
    state.resolutions = state.resolutions.filter((entry) => entry.resolutionId !== existing.resolutionId);
    persistState();
    return resolveConsumableEffect({ ...existing.inputSnapshot, resolutionId: existing.resolutionId });
  }

  function resetItemEffectResolutionStore(options = {}) {
    state = normalizeState({});
    if (options.persist !== false) persistState();
    return { ok: true, storeRevision: state.revision };
  }

  Object.assign(app, {
    ITEM_EFFECT_RESOLVER_VERSION: API_VERSION,
    ITEM_EFFECT_RESOLVER_SCHEMA_VERSION: STORAGE_SCHEMA_VERSION,
    getConsumableEffectProfile,
    previewConsumableEffect,
    resolveConsumableEffect,
    retryConsumableEffectResolution,
    getItemEffectResolution,
    getItemEffectResolutions,
    resetItemEffectResolutionStore
  });
})(window.WS_APP);
