window.WS_APP = window.WS_APP || {};

(function initSystemStoreModule() {
  const STORAGE_KEY = "ws_app_system_records_v1";
  const STORAGE_SCHEMA_KEY = "ws_app_system_records_schema";
  const STORAGE_SCHEMA_VERSION = "future-noir.knowledge.system-records.v3";
  const SKILLS_ABILITIES_RECORD_ID = "system-skills-abilities";
  const SUBSCRIPTION_CATALOG_RECORD_ID = "system-subscription-catalog";
  let systemStore = [];
  let storageNeedsMigration = false;

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function slugify(value) {
    const base = String(value || "system-record")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 54);

    return base || "system-record";
  }

  function uniqueId(seed) {
    const base = slugify(seed || "system-record");
    const existing = new Set(systemStore.map((record) => record.id));

    if (!existing.has(base)) return base;

    let index = 2;
    while (existing.has(`${base}-${index}`)) index += 1;
    return `${base}-${index}`;
  }

  function normalizeKnowledgeReferenceKey(value = "") {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function normalizeSections(value) {
    if (Array.isArray(value)) {
      return value.map((section) => ({
        title: String(section?.title || "SECTION").trim(),
        body: String(section?.body || "").trim()
      })).filter((section) => section.title || section.body);
    }

    const text = String(value || "").trim();
    if (!text) return [];

    return text.split(/\n-{3,}\n/g).map((block, index) => {
      const lines = block.split("\n");
      const title = String(lines.shift() || `SECTION ${index + 1}`).trim();
      const body = lines.join("\n").trim();
      return { title, body };
    }).filter((section) => section.title || section.body);
  }

  function normalizeRegistry(value) {
    const registry = String(value || "system").trim().toLowerCase();
    return registry === "system-index" ? "system-index" : "system";
  }

  function normalizeDefinitionId(value, fallback) {
    const explicit = String(value || "").trim();
    if (explicit) return explicit;
    return slugify(fallback || "definition");
  }

  function normalizeAbilityDefinition(definition = {}) {
    const label = String(definition.label || definition.name || "New Ability").trim();

    return {
      id: normalizeDefinitionId(definition.id || definition.abilityId, `ability-${label}`),
      label,
      category: String(definition.category || "GENERAL").trim().toUpperCase(),
      description: String(definition.description || "").trim(),
      maxNatural: clampInteger(definition.maxNatural ?? definition.maxBase ?? 7, 1, 7),
      maxCyberware: clampInteger(definition.maxCyberware ?? 8, 0, 8),
      archived: definition.archived === true
    };
  }

  function normalizeSkillDefinition(definition = {}) {
    const label = String(definition.label || definition.name || "New Skill").trim();

    return {
      id: normalizeDefinitionId(definition.id || definition.skillId, `skill-${label}`),
      label,
      category: String(definition.category || "GENERAL").trim().toUpperCase(),
      description: String(definition.description || "").trim(),
      maxValue: clampInteger(definition.maxValue ?? 10, 1, 10),
      archived: definition.archived === true
    };
  }

  function normalizeDefinitions(value = {}) {
    const definitions = value && typeof value === "object" ? value : {};
    const subscriptionDefinitions = typeof window.WS_APP.normalizeSubscriptionCatalogDefinitions === "function"
      ? window.WS_APP.normalizeSubscriptionCatalogDefinitions(definitions).subscriptions
      : (Array.isArray(definitions.subscriptions) ? definitions.subscriptions : []);

    return {
      abilities: uniqueDefinitions(definitions.abilities, normalizeAbilityDefinition),
      skills: uniqueDefinitions(definitions.skills, normalizeSkillDefinition),
      subscriptions: subscriptionDefinitions
    };
  }

  function uniqueDefinitions(items, normalizer) {
    const used = new Set();

    return (Array.isArray(items) ? items : [])
      .filter(Boolean)
      .map((item) => normalizer(item))
      .map((item) => {
        const base = slugify(item.id || item.label || "definition");
        let id = item.id || base;
        let index = 2;

        while (used.has(id)) {
          id = `${base}-${index}`;
          index += 1;
        }

        used.add(id);
        return { ...item, id };
      });
  }

  function mergeDefinitions(baseDefinitions, storedDefinitions) {
    const base = normalizeDefinitions(baseDefinitions || {});
    const stored = normalizeDefinitions(storedDefinitions || {});
    const mergeSubscriptionDefinitions = window.WS_APP.mergeSubscriptionDefinitionList || mergeDefinitionList;

    return {
      abilities: mergeDefinitionList(base.abilities, stored.abilities),
      skills: mergeDefinitionList(base.skills, stored.skills),
      subscriptions: mergeSubscriptionDefinitions(base.subscriptions, stored.subscriptions)
    };
  }

  function mergeDefinitionList(baseList, storedList) {
    const byId = new Map();

    baseList.forEach((item) => byId.set(item.id, item));
    storedList.forEach((item) => {
      const base = byId.get(item.id) || {};
      const merged = { ...base, ...item };
      if (!item.description && base.description) merged.description = base.description;
      byId.set(item.id, merged);
    });

    return Array.from(byId.values());
  }

  function hasCurrentSkillsAbilitiesSections(sections) {
    const titles = normalizeSections(sections).map((section) => section.title.toUpperCase());
    return titles.includes("ABILITIES / LIMITS") && titles.includes("SKILLS / LIMITS");
  }

  function mergeSkillsAbilitiesSections(baseSections, storedSections) {
    const stored = normalizeSections(storedSections);
    if (!stored.length || !hasCurrentSkillsAbilitiesSections(stored)) {
      return normalizeSections(baseSections);
    }
    return stored;
  }

  function mergeSystemRecords(baseRecords, storedRecords) {
    const baseList = normalizeSystemRecords(baseRecords);
    const storedList = normalizeSystemRecords(storedRecords);
    const baseById = new Map(baseList.map((record) => [record.id, record]));
    const used = new Set();

    const merged = storedList.map((record) => {
      const base = baseById.get(record.id);
      used.add(record.id);

      if (!base) return record;

      return normalizeSystemRecord({
        ...base,
        ...record,
        id: record.id,
        createdAt: record.createdAt || base.createdAt,
        sections: record.id === SKILLS_ABILITIES_RECORD_ID
          ? mergeSkillsAbilitiesSections(base.sections, record.sections)
          : record.sections,
        definitions: mergeDefinitions(base.definitions, record.definitions)
      });
    });

    baseList.forEach((record) => {
      if (!used.has(record.id)) merged.push(record);
    });

    return merged;
  }

  function parseRecordTags(value) {
    if (Array.isArray(value)) return value.map((tag) => String(tag || "").trim().toUpperCase()).filter(Boolean);
    return String(value || "").split(/[\n,]/).map((tag) => tag.trim().toUpperCase()).filter(Boolean);
  }

  function parseReferenceList(value) {
    if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
    return String(value || "").split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  }

  function normalizeAccessTags(value, fallback = ["PUBLIC"]) {
    if (window.WS_APP.normalizeAccessTagList) return window.WS_APP.normalizeAccessTagList(value, fallback);
    const list = Array.isArray(value) ? value : String(value || "").split(/[\n,]/);
    const normalized = list.map((tag) => String(tag || "").trim().toUpperCase()).filter(Boolean);
    return normalized.length ? Array.from(new Set(normalized)) : fallback;
  }

  function normalizeSystemRecord(record = {}) {
    const normalized = clone(record || {});
    const now = new Date().toISOString();

    normalized.registry = normalizeRegistry(normalized.registry);
    normalized.type = String(normalized.type || (normalized.registry === "system-index" ? "INDEX_ENTRY" : "RULE")).trim().toUpperCase();
    normalized.category = String(normalized.category || "UNCATEGORIZED").trim().toUpperCase();
    normalized.localTitle = String(normalized.localTitle || "").trim();
    normalized.officialSummary = String(normalized.officialSummary || "").trim();
    normalized.slogans = parseRecordTags(normalized.slogans || []);
    normalized.title = String(normalized.title || "NEW SYSTEM RECORD").trim();
    normalized.id = String(normalized.id || uniqueId(`${normalized.registry}-${normalized.title}`)).trim();
    normalized.tag = String(normalized.tag || "PUBLIC").trim().toUpperCase();
    normalized.tags = parseRecordTags(normalized.tags || []);
    if (normalized.tags.length === 1 && normalized.tags[0] === normalized.tag && ["PUBLIC", "RESTRICTED", "CONFIDENTIAL", "BLACK", "GAME_MASTER"].includes(normalized.tags[0])) {
      normalized.tags = [];
    }
    normalized.accessTags = normalizeAccessTags(normalized.accessTags, [normalized.tag || "PUBLIC"]);
    normalized.tag = normalized.accessTags[0] || "PUBLIC";
    normalized.summary = String(normalized.summary || "").trim();
    normalized.sections = normalizeSections(normalized.sections);
    const relatedTerms = parseReferenceList(normalized.relatedTerms || normalized.related || []);
    const relatedRules = parseReferenceList(normalized.relatedRules || []);
    const relatedEntries = parseReferenceList(normalized.relatedEntries || []);
    normalized.relatedTerms = typeof window.WS_APP.normalizeKnowledgeRelationRefs === "function"
      ? window.WS_APP.normalizeKnowledgeRelationRefs(relatedTerms, "encyclopedia")
      : relatedTerms;
    normalized.relatedRules = typeof window.WS_APP.normalizeKnowledgeRelationRefs === "function"
      ? window.WS_APP.normalizeKnowledgeRelationRefs(relatedRules, "system")
      : relatedRules;
    normalized.relatedEntries = typeof window.WS_APP.normalizeKnowledgeRelationRefs === "function"
      ? window.WS_APP.normalizeKnowledgeRelationRefs(relatedEntries, "system-index")
      : relatedEntries;

    if (normalized.registry === "system-index") {
      normalized.relatedTerms = [];
      normalized.related = [];
      normalized.relatedRules = [];
    } else {
      normalized.related = normalized.relatedTerms;
      normalized.relatedEntries = [];
    }

    normalized.archived = normalized.archived === true;
    normalized.updatedAt = normalized.updatedAt || now;
    normalized.createdAt = normalized.createdAt || normalized.updatedAt;

    if (normalized.definitions) {
      normalized.definitions = normalizeDefinitions(normalized.definitions);
    }

    return normalized;
  }

  function normalizeSystemRecords(records) {
    return (Array.isArray(records) ? records : [])
      .filter(Boolean)
      .map((record) => normalizeSystemRecord(record));
  }

  function readBaseSystemRecords() {
    return normalizeSystemRecords(window.APP_DATA?.systemRecords || []);
  }

  function readStoredSystemRecords() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;

      storageNeedsMigration = window.localStorage.getItem(STORAGE_SCHEMA_KEY) !== STORAGE_SCHEMA_VERSION;
      return normalizeSystemRecords(parsed);
    } catch (error) {
      console.warn("W&S system store could not read localStorage.", error);
      return null;
    }
  }

  function writeStoredSystemRecords(records) {
    try {
      window.localStorage.setItem(STORAGE_SCHEMA_KEY, STORAGE_SCHEMA_VERSION);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.warn("W&S system store could not write localStorage.", error);
    }
  }

  function emitSystemUpdate(detail = {}) {
    window.dispatchEvent(new CustomEvent("ws:system-records-updated", { detail }));
  }

  function save() {
    writeStoredSystemRecords(systemStore);
    emitSystemUpdate({ systemRecords: clone(systemStore) });
  }

  function clampInteger(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function getSkillsAbilitiesRecord() {
    return systemStore.find((record) => record.id === SKILLS_ABILITIES_RECORD_ID)
      || systemStore.find((record) => String(record.title || "").toUpperCase().includes("SKILLS") && String(record.title || "").toUpperCase().includes("ABIL"))
      || null;
  }


  function getSubscriptionCatalogRecord() {
    return systemStore.find((record) => record.id === SUBSCRIPTION_CATALOG_RECORD_ID)
      || systemStore.find((record) => String(record.title || "").toUpperCase().includes("SUBSCRIPTION") && String(record.title || "").toUpperCase().includes("CATALOG"))
      || null;
  }

  function isSubscriptionCatalogRecord(record = {}) {
    return record.id === SUBSCRIPTION_CATALOG_RECORD_ID
      || (String(record.title || "").toUpperCase().includes("SUBSCRIPTION") && String(record.title || "").toUpperCase().includes("CATALOG"));
  }

  function getSubscriptionCatalogDefinitionsSnapshot(record = null) {
    if (typeof window.WS_APP.getSubscriptionCatalogDefinitions === "function") {
      return window.WS_APP.getSubscriptionCatalogDefinitions({ includeArchived: true });
    }
    return normalizeDefinitions(record?.definitions || {}).subscriptions.length
      ? normalizeDefinitions(record.definitions).subscriptions
      : { subscriptions: [] };
  }

  function applySystemRecordViewAdapters(record = null) {
    if (!record) return null;
    const view = clone(record);
    if (isSubscriptionCatalogRecord(view)) {
      view.definitions = getSubscriptionCatalogDefinitionsSnapshot(view);
    }
    return view;
  }

  window.WS_APP.initSystemStore = function initSystemStore() {
    const base = readBaseSystemRecords();
    const stored = readStoredSystemRecords();
    systemStore = stored ? mergeSystemRecords(base, stored) : base;
    if (stored && storageNeedsMigration) {
      writeStoredSystemRecords(systemStore);
      storageNeedsMigration = false;
    }
    return window.WS_APP.getSystemRecords({ includeArchived: true });
  };

  window.WS_APP.getSystemRecords = function getSystemRecords(options = {}) {
    const includeArchived = options.includeArchived === true;
    const registry = options.registry ? normalizeRegistry(options.registry) : null;
    let records = includeArchived ? systemStore : systemStore.filter((record) => !record.archived);

    if (registry) records = records.filter((record) => record.registry === registry);

    return records.map((record) => applySystemRecordViewAdapters(record));
  };

  window.WS_APP.getSystemRecordById = function getSystemRecordById(id) {
    const record = systemStore.find((item) => item.id === id);
    return applySystemRecordViewAdapters(record);
  };

  window.WS_APP.resolveSystemRecordRef = function resolveSystemRecordRef(reference, options = {}) {
    const raw = String(reference || "").trim();
    if (!raw) return null;

    const includeArchived = options.includeArchived === true;
    const registry = options.registry ? normalizeRegistry(options.registry) : null;
    const key = normalizeKnowledgeReferenceKey(raw);
    let candidates = systemStore.filter((record) => includeArchived || !record.archived);
    if (registry) candidates = candidates.filter((record) => record.registry === registry);

    const byId = candidates.find((record) => String(record.id || "") === raw);
    if (byId) return clone(byId);

    const match = candidates.find((record) => {
      const values = [record.title, record.localTitle, record.id];
      return values.some((value) => normalizeKnowledgeReferenceKey(value) === key);
    });

    return match ? clone(match) : null;
  };

  window.WS_APP.resolveSystemRecordRefs = function resolveSystemRecordRefs(references, options = {}) {
    return parseReferenceList(references).map((reference) => ({
      reference,
      record: window.WS_APP.resolveSystemRecordRef(reference, options)
    }));
  };

  window.WS_APP.getAbilityDefinitions = function getAbilityDefinitions(options = {}) {
    const includeArchived = options.includeArchived === true;
    const definitions = normalizeDefinitions(getSkillsAbilitiesRecord()?.definitions || {}).abilities;
    return clone(includeArchived ? definitions : definitions.filter((definition) => !definition.archived));
  };

  window.WS_APP.getSkillDefinitions = function getSkillDefinitions(options = {}) {
    const includeArchived = options.includeArchived === true;
    const definitions = normalizeDefinitions(getSkillsAbilitiesRecord()?.definitions || {}).skills;
    return clone(includeArchived ? definitions : definitions.filter((definition) => !definition.archived));
  };

  window.WS_APP.getAbilityDefinitionById = function getAbilityDefinitionById(id) {
    const definition = window.WS_APP.getAbilityDefinitions?.({ includeArchived: true }).find((item) => item.id === id);
    return definition ? clone(definition) : null;
  };

  window.WS_APP.getSkillDefinitionById = function getSkillDefinitionById(id) {
    const definition = window.WS_APP.getSkillDefinitions?.({ includeArchived: true }).find((item) => item.id === id);
    return definition ? clone(definition) : null;
  };



  window.WS_APP.createSystemRecord = function createSystemRecord(data = {}) {
    const now = new Date().toISOString();
    const record = normalizeSystemRecord({
      ...data,
      id: data.id || uniqueId(`${data.registry || "system"}-${data.title || "record"}`),
      createdAt: now,
      updatedAt: now
    });

    systemStore.push(record);
    save();
    return applySystemRecordViewAdapters(record);
  };

  window.WS_APP.updateSystemRecord = function updateSystemRecord(id, patch = {}) {
    const index = systemStore.findIndex((record) => record.id === id);
    if (index < 0) return null;

    const current = systemStore[index];
    const patchPayload = clone(patch);
    if (isSubscriptionCatalogRecord(current) && patchPayload.definitions && typeof window.WS_APP.updateSubscriptionCatalogDefinitions === "function") {
      patchPayload.definitions = window.WS_APP.updateSubscriptionCatalogDefinitions(patchPayload.definitions);
    }

    const updated = normalizeSystemRecord({
      ...current,
      ...patchPayload,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString()
    });

    systemStore.splice(index, 1, updated);
    save();
    return applySystemRecordViewAdapters(updated);
  };

  window.WS_APP.archiveSystemRecord = function archiveSystemRecord(id) {
    return window.WS_APP.updateSystemRecord(id, { archived: true });
  };

  window.WS_APP.restoreSystemRecord = function restoreSystemRecord(id) {
    return window.WS_APP.updateSystemRecord(id, { archived: false });
  };

  window.WS_APP.deleteSystemRecord = function deleteSystemRecord(id) {
    const index = systemStore.findIndex((record) => record.id === id);
    if (index < 0) return false;
    const [deleted] = systemStore.splice(index, 1);
    save();
    emitSystemUpdate({ deleted: true, id, record: clone(deleted) });
    return true;
  };

  window.WS_APP.createDefaultSystemRecord = function createDefaultSystemRecord(registry = "system") {
    const normalizedRegistry = normalizeRegistry(registry);
    const label = normalizedRegistry === "system-index" ? "NEW INDEX RECORD" : "NEW SYSTEM RECORD";

    return window.WS_APP.createSystemRecord({
      registry: normalizedRegistry,
      title: label,
      tag: normalizedRegistry === "system-index" ? "RESTRICTED" : "PUBLIC",
      accessTags: [normalizedRegistry === "system-index" ? "RESTRICTED" : "PUBLIC"],
      tags: ["DRAFT"],
      summary: "Pending synchronization.",
      sections: normalizedRegistry === "system-index" ? [
        { title: "AUTHORIZED DESCRIPTION", body: "Approved civic wording pending." },
        { title: "CIVIC FORMULA", body: "System formula pending." }
      ] : [
        { title: "OVERVIEW", body: "Rule record awaiting content." },
        { title: "PROCEDURE", body: "Mechanical procedure pending." }
      ],
      archived: false
    });
  };

  window.WS_APP.duplicateSystemRecord = function duplicateSystemRecord(id) {
    const record = window.WS_APP.getSystemRecordById(id);
    if (!record) return null;

    return window.WS_APP.createSystemRecord({
      ...record,
      id: undefined,
      title: `${record.title || "SYSTEM RECORD"} COPY`,
      archived: false,
      createdAt: undefined,
      updatedAt: undefined
    });
  };

  function mergeImportedSystemRecords(currentRecords, importedRecords) {
    const tombstoneIds = new Set((Array.isArray(importedRecords) ? importedRecords : [])
      .filter((record) => record?.tombstone === true || record?._delete === true || record?.deleted === true)
      .map((record) => String(record.id || "").trim())
      .filter(Boolean));
    const current = normalizeSystemRecords(currentRecords).filter((record) => !tombstoneIds.has(record.id));
    const incoming = (Array.isArray(importedRecords) ? importedRecords : [])
      .filter((record) => !(record?.tombstone === true || record?._delete === true || record?.deleted === true));
    return mergeSystemRecords(current, incoming);
  }

  window.WS_APP.importSystemRecords = function importSystemRecords(records, options = {}) {
    if (!Array.isArray(records)) return null;
    const mode = options.mode === "merge" ? "merge" : "replace";
    systemStore = mode === "merge"
      ? mergeImportedSystemRecords(systemStore, records)
      : normalizeSystemRecords(records.filter((record) => !(record?.tombstone === true || record?._delete === true || record?.deleted === true)));
    save();
    return window.WS_APP.getSystemRecords({ includeArchived: true });
  };

  window.WS_APP.resetSystemStore = function resetSystemStore() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(STORAGE_SCHEMA_KEY);
    } catch (error) {
      console.warn("W&S system store could not clear localStorage.", error);
    }

    systemStore = readBaseSystemRecords();
    emitSystemUpdate({ reset: true });
    return window.WS_APP.getSystemRecords({ includeArchived: true });
  };

  window.WS_APP.initSystemStore();
})();
