window.WS_APP = window.WS_APP || {};

(function initItemTypeRegistry() {
  const REGISTRY_VERSION = "1.1.0";
  const FALLBACK_TYPE_ID = "GENERIC_ITEM";

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function normalizeToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function normalizeList(value = []) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(normalizeToken).filter(Boolean))];
  }

  function clampInteger(value, min = 0, max = 9999, fallback = min) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function normalizeFieldDescriptor(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const key = String(source.key || "").trim();
    if (!key) return null;
    return {
      key,
      type: normalizeToken(source.type || "STRING") || "STRING",
      default: clone(source.default),
      min: Number.isFinite(Number(source.min)) ? Number(source.min) : null,
      max: Number.isFinite(Number(source.max)) ? Number(source.max) : null,
      values: normalizeList(source.values),
      required: source.required === true
    };
  }

  function normalizeTypeDefinition(value = {}, index = 0) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const id = normalizeToken(source.id || source.typeId || `ITEM_TYPE_${index + 1}`);
    return {
      id,
      label: String(source.label || id || "Item Type").trim(),
      family: normalizeToken(source.family || "GENERAL") || "GENERAL",
      capabilities: normalizeList(source.capabilities),
      matches: {
        categories: normalizeList(source.matches?.categories),
        subtypes: normalizeList(source.matches?.subtypes),
        tags: normalizeList(source.matches?.tags)
      },
      profileFields: (Array.isArray(source.profileFields) ? source.profileFields : []).map(normalizeFieldDescriptor).filter(Boolean),
      stateFields: (Array.isArray(source.stateFields) ? source.stateFields : []).map(normalizeFieldDescriptor).filter(Boolean)
    };
  }

  const definitions = (Array.isArray(window.APP_DATA?.itemTypeCatalog) ? window.APP_DATA.itemTypeCatalog : [])
    .map(normalizeTypeDefinition)
    .filter((definition) => definition.id);
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  if (!definitionById.has(FALLBACK_TYPE_ID)) {
    const fallback = normalizeTypeDefinition({ id: FALLBACK_TYPE_ID, label: "Generic Item" });
    definitions.unshift(fallback);
    definitionById.set(fallback.id, fallback);
  }

  const subtypeIndex = new Map();
  const categoryIndex = new Map();
  const tagIndex = new Map();
  definitions.forEach((definition) => {
    definition.matches.subtypes.forEach((token) => { if (!subtypeIndex.has(token)) subtypeIndex.set(token, definition.id); });
    definition.matches.categories.forEach((token) => { if (!categoryIndex.has(token)) categoryIndex.set(token, definition.id); });
    definition.matches.tags.forEach((token) => { if (!tagIndex.has(token)) tagIndex.set(token, definition.id); });
  });

  function getItemTypeDefinition(typeId = "") {
    return clone(definitionById.get(normalizeToken(typeId)) || definitionById.get(FALLBACK_TYPE_ID));
  }

  function getItemTypeDefinitions() {
    return definitions.map(clone);
  }

  function resolveItemTypeId(source = {}) {
    if (typeof source === "string") {
      const explicit = normalizeToken(source);
      return definitionById.has(explicit) ? explicit : FALLBACK_TYPE_ID;
    }
    const item = source && typeof source === "object" && !Array.isArray(source) ? source : {};
    const explicit = normalizeToken(item.itemType || item.itemTypeId || item.typeDefinitionId);
    if (definitionById.has(explicit)) return explicit;
    const subtype = normalizeToken(item.subtype || item.modelType);
    if (subtypeIndex.has(subtype)) return subtypeIndex.get(subtype);
    const tags = normalizeList(item.tags);
    const matchedTag = tags.find((tag) => tagIndex.has(tag));
    if (matchedTag) return tagIndex.get(matchedTag);
    const category = normalizeToken(item.category);
    if (categoryIndex.has(category)) return categoryIndex.get(category);
    return FALLBACK_TYPE_ID;
  }

  function normalizeFieldValue(descriptor = {}, value) {
    const fallback = clone(descriptor.default);
    if (value === undefined || value === null || value === "") return fallback;
    if (descriptor.type === "BOOLEAN") return value === true || value === 1 || String(value).trim().toLowerCase() === "true";
    if (descriptor.type === "INTEGER") {
      const min = descriptor.min ?? -999999;
      const max = descriptor.max ?? 999999;
      return clampInteger(value, min, max, Number.isFinite(Number(fallback)) ? Number(fallback) : min);
    }
    if (descriptor.type === "ENUM") {
      const token = normalizeToken(value);
      return descriptor.values.includes(token) ? token : normalizeToken(fallback || descriptor.values[0] || "");
    }
    if (descriptor.type === "TOKEN") return normalizeToken(value);
    if (descriptor.type === "LIST") return normalizeList(value);
    return String(value ?? fallback ?? "").trim();
  }

  function normalizeFields(fields = [], source = {}) {
    const raw = source && typeof source === "object" && !Array.isArray(source) ? source : {};
    return fields.reduce((next, descriptor) => {
      next[descriptor.key] = normalizeFieldValue(descriptor, raw[descriptor.key]);
      return next;
    }, {});
  }

  function normalizeItemTypeProfile(typeOrSource = {}, profile = null) {
    const typeId = resolveItemTypeId(typeOrSource);
    const definition = definitionById.get(typeId) || definitionById.get(FALLBACK_TYPE_ID);
    const raw = profile && typeof profile === "object" && !Array.isArray(profile)
      ? profile
      : typeOrSource && typeof typeOrSource === "object" && !Array.isArray(typeOrSource)
        ? typeOrSource.itemTypeProfile || typeOrSource.typeProfile || {}
        : {};
    return normalizeFields(definition.profileFields, raw);
  }

  function normalizeItemTypeState(typeOrSource = {}, state = null, profile = null) {
    const typeId = resolveItemTypeId(typeOrSource);
    const definition = definitionById.get(typeId) || definitionById.get(FALLBACK_TYPE_ID);
    const raw = state && typeof state === "object" && !Array.isArray(state)
      ? state.data && typeof state.data === "object" && !Array.isArray(state.data) ? state.data : state
      : typeOrSource && typeof typeOrSource === "object" && !Array.isArray(typeOrSource)
        ? typeOrSource.itemState?.data || typeOrSource.itemState || {}
        : {};
    const normalizedProfile = normalizeItemTypeProfile(typeId, profile || typeOrSource?.itemTypeProfile || {});
    const data = normalizeFields(definition.stateFields, raw);
    if (typeId === "MAGAZINE") data.roundsCurrent = clampInteger(data.roundsCurrent, 0, Math.max(1, normalizedProfile.capacity || 1), 0);
    if (typeId === "FIREARM") {
      data.chamberedRounds = clampInteger(data.chamberedRounds, 0, Math.max(0, normalizedProfile.chamberCapacity || 0), 0);
      const supportedModes = normalizeList(normalizedProfile.fireModes);
      if (supportedModes.length && !supportedModes.includes(data.fireMode)) data.fireMode = supportedModes[0];
    }
    if (typeId === "GRENADE" && data.spent) data.armed = false;
    return { schemaVersion: 1, typeId, data };
  }

  function validateItemTypeState(typeOrSource = {}, state = null, profile = null) {
    const typeId = resolveItemTypeId(typeOrSource);
    const definition = definitionById.get(typeId) || definitionById.get(FALLBACK_TYPE_ID);
    const normalizedProfile = normalizeItemTypeProfile(typeId, profile || typeOrSource?.itemTypeProfile || {});
    const normalizedState = normalizeItemTypeState(typeId, state, normalizedProfile);
    const errors = [];
    definition.stateFields.forEach((descriptor) => {
      const value = normalizedState.data[descriptor.key];
      if (descriptor.required && (value === "" || value === null || value === undefined)) {
        errors.push({ code: "ITEM_TYPE_STATE_REQUIRED", typeId, field: descriptor.key });
      }
    });
    if (typeId === "MAGAZINE" && normalizedState.data.roundsCurrent > normalizedProfile.capacity) {
      errors.push({ code: "MAGAZINE_OVER_CAPACITY", typeId, roundsCurrent: normalizedState.data.roundsCurrent, capacity: normalizedProfile.capacity });
    }
    if (typeId === "GRENADE" && normalizedState.data.spent && normalizedState.data.armed) {
      errors.push({ code: "SPENT_GRENADE_ARMED", typeId });
    }
    return { ok: errors.length === 0, typeId, profile: normalizedProfile, state: normalizedState, errors };
  }

  function getItemTypeCapabilities(typeOrSource = {}) {
    const definition = getItemTypeDefinition(resolveItemTypeId(typeOrSource));
    return [...definition.capabilities];
  }

  function itemHasCapability(typeOrSource = {}, capability = "") {
    return getItemTypeCapabilities(typeOrSource).includes(normalizeToken(capability));
  }

  function getItemTypeStateSummary(typeOrSource = {}, state = null, profile = null) {
    const typeId = resolveItemTypeId(typeOrSource);
    const normalizedProfile = normalizeItemTypeProfile(typeId, profile || typeOrSource?.itemTypeProfile || {});
    const normalizedState = normalizeItemTypeState(typeId, state || typeOrSource?.itemState || {}, normalizedProfile).data;
    if (typeId === "FIREARM") return [`${normalizedState.safety}`, `${normalizedState.fireMode}`, `CHAMBER ${normalizedState.chamberedRounds}/${normalizedProfile.chamberCapacity}`];
    if (typeId === "MAGAZINE") return [`ROUNDS ${normalizedState.roundsCurrent}/${normalizedProfile.capacity}`, normalizedProfile.ammunitionType || "UNASSIGNED AMMO"];
    if (typeId === "GRENADE") return [normalizedState.spent ? "SPENT" : normalizedState.armed ? "ARMED" : "SAFE", normalizedState.triggerMode];
    if (typeId === "WALLET" || typeId === "CONTAINER") return [normalizedState.locked ? "LOCKED" : "UNLOCKED"];
    return [];
  }

  Object.assign(window.WS_APP, {
    ITEM_TYPE_REGISTRY_VERSION: REGISTRY_VERSION,
    getItemTypeDefinition,
    getItemTypeDefinitions,
    resolveItemTypeId,
    normalizeItemTypeProfile,
    normalizeItemTypeState,
    validateItemTypeState,
    getItemTypeCapabilities,
    itemHasCapability,
    getItemTypeStateSummary
  });
})();
