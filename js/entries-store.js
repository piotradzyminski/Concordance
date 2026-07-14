window.WS_APP = window.WS_APP || {};

(function initEntriesStoreModule() {
  const STORAGE_KEY = "ws_app_entries_v1";
  const STORAGE_SCHEMA_KEY = "ws_app_entries_schema";
  const STORAGE_SCHEMA_VERSION = "future-noir.knowledge.encyclopedia.v2";
  let entryStore = [];
  let storageNeedsMigration = false;

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function slugify(value) {
    const base = String(value || "entry")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);

    return base || "entry";
  }

  function uniqueId(seed) {
    const base = slugify(seed);
    const existing = new Set(entryStore.map((entry) => entry.id));

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

  function parseList(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item || "").trim()).filter(Boolean);
    }

    return String(value || "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeEntry(entry = {}) {
    const normalized = clone(entry);
    const term = String(normalized.term || normalized.title || "Untitled Term").trim();
    const localTerm = String(normalized.localTerm || "").trim();
    const title = String(normalized.title || (localTerm ? `${term} / ${localTerm}` : term)).trim();
    const now = new Date().toISOString();

    normalized.registry = "encyclopedia";
    normalized.type = String(normalized.type || "TERM").trim().toUpperCase();
    normalized.id = String(normalized.id || uniqueId(term || title || "entry")).trim();
    normalized.term = term;
    normalized.localTerm = localTerm;
    normalized.title = title;
    normalized.category = String(normalized.category || "UNCLASSIFIED").trim().toUpperCase();
    normalized.aliases = parseList(normalized.aliases);
    normalized.tags = parseList(normalized.tags).map((tag) => tag.toUpperCase());
    const relatedTerms = parseList(normalized.relatedTerms || normalized.related);
    normalized.relatedTerms = typeof window.WS_APP.normalizeKnowledgeRelationRefs === "function"
      ? window.WS_APP.normalizeKnowledgeRelationRefs(relatedTerms, "encyclopedia")
      : relatedTerms;
    normalized.related = normalized.relatedTerms;
    normalized.shortDefinition = String(normalized.shortDefinition || normalized.summary || "").trim();
    normalized.body = String(normalized.body || normalized.publicText || "").trim();
    normalized.summary = normalized.shortDefinition;

    // Backward-compatible fields for older import/export and global helpers.
    normalized.clearance = "PUBLIC";
    normalized.accessTags = ["PUBLIC"];
    normalized.publicText = normalized.body;
    normalized.restrictedText = "";
    normalized.gmText = "";

    normalized.archived = normalized.archived === true;
    normalized.updatedAt = normalized.updatedAt || now;
    normalized.createdAt = normalized.createdAt || normalized.updatedAt;
    return normalized;
  }

  function normalizeEntries(entries) {
    return (Array.isArray(entries) ? entries : [])
      .filter(Boolean)
      .map((entry) => normalizeEntry(entry));
  }

  function readBaseEntries() {
    return normalizeEntries(window.APP_DATA?.entries || []);
  }

  function readStoredEntries() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;

      storageNeedsMigration = window.localStorage.getItem(STORAGE_SCHEMA_KEY) !== STORAGE_SCHEMA_VERSION;
      return normalizeEntries(parsed);
    } catch (error) {
      console.warn("W&S entries store could not read localStorage.", error);
      return null;
    }
  }

  function writeStoredEntries(entries) {
    try {
      window.localStorage.setItem(STORAGE_SCHEMA_KEY, STORAGE_SCHEMA_VERSION);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.warn("W&S entries store could not write localStorage.", error);
    }
  }

  function emitEntriesUpdate(detail = {}) {
    window.dispatchEvent(new CustomEvent("ws:entries-updated", { detail }));
  }

  function save() {
    writeStoredEntries(entryStore);
    emitEntriesUpdate({ entries: clone(entryStore) });
  }

  window.WS_APP.initEntryStore = function initEntryStore() {
    const storedEntries = readStoredEntries();
    entryStore = storedEntries || readBaseEntries();
    if (storedEntries && storageNeedsMigration) {
      writeStoredEntries(entryStore);
      storageNeedsMigration = false;
    }
    return window.WS_APP.getEntries({ includeArchived: true });
  };

  window.WS_APP.getEntries = function getEntries(options = {}) {
    const includeArchived = options.includeArchived === true;
    const entries = includeArchived ? entryStore : entryStore.filter((entry) => !entry.archived);
    return clone(entries);
  };

  window.WS_APP.getEntryById = function getEntryById(id) {
    const entry = entryStore.find((item) => item.id === id);
    return entry ? clone(entry) : null;
  };

  window.WS_APP.resolveEntryRef = function resolveEntryRef(reference, options = {}) {
    const raw = String(reference || "").trim();
    if (!raw) return null;

    const includeArchived = options.includeArchived === true;
    const key = normalizeKnowledgeReferenceKey(raw);
    const candidates = entryStore.filter((entry) => includeArchived || !entry.archived);

    const byId = candidates.find((entry) => String(entry.id || "") === raw);
    if (byId) return clone(byId);

    const match = candidates.find((entry) => {
      const values = [entry.term, entry.localTerm, entry.title, entry.id];
      const aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
      return [...values, ...aliases].some((value) => normalizeKnowledgeReferenceKey(value) === key);
    });

    return match ? clone(match) : null;
  };

  window.WS_APP.resolveEntryRefs = function resolveEntryRefs(references, options = {}) {
    return parseList(references).map((reference) => ({
      reference,
      entry: window.WS_APP.resolveEntryRef(reference, options)
    }));
  };

  window.WS_APP.createEntry = function createEntry(data = {}) {
    const now = new Date().toISOString();
    const entry = normalizeEntry({
      ...data,
      id: data.id || uniqueId(data.term || data.title || "entry"),
      createdAt: now,
      updatedAt: now
    });

    entryStore.push(entry);
    save();
    return clone(entry);
  };

  window.WS_APP.updateEntry = function updateEntry(id, patch = {}) {
    const index = entryStore.findIndex((entry) => entry.id === id);
    if (index < 0) return null;

    const updated = normalizeEntry({
      ...entryStore[index],
      ...clone(patch),
      id: entryStore[index].id,
      createdAt: entryStore[index].createdAt,
      updatedAt: new Date().toISOString()
    });

    entryStore.splice(index, 1, updated);
    save();
    return clone(updated);
  };

  window.WS_APP.archiveEntry = function archiveEntry(id) {
    return window.WS_APP.updateEntry(id, { archived: true });
  };

  window.WS_APP.restoreEntry = function restoreEntry(id) {
    return window.WS_APP.updateEntry(id, { archived: false });
  };

  window.WS_APP.deleteEntry = function deleteEntry(id) {
    const index = entryStore.findIndex((entry) => entry.id === id);
    if (index < 0) return false;
    const [deleted] = entryStore.splice(index, 1);
    save();
    emitEntriesUpdate({ deleted: true, id, entry: clone(deleted) });
    return true;
  };

  window.WS_APP.createDefaultEntry = function createDefaultEntry() {
    return window.WS_APP.createEntry({
      type: "TERM",
      category: "UNCLASSIFIED",
      term: "New Term",
      localTerm: "",
      aliases: [],
      shortDefinition: "Pending player-facing definition.",
      body: "",
      relatedTerms: [],
      tags: ["DRAFT"],
      archived: false
    });
  };

  window.WS_APP.duplicateEntry = function duplicateEntry(id) {
    const entry = window.WS_APP.getEntryById(id);
    if (!entry) return null;
    return window.WS_APP.createEntry({
      ...entry,
      id: undefined,
      term: `${entry.term || entry.title || "TERM"} Copy`,
      title: undefined,
      archived: false,
      createdAt: undefined,
      updatedAt: undefined
    });
  };

  function mergeEntriesById(currentEntries, importedEntries) {
    const byId = new Map(normalizeEntries(currentEntries).map((entry) => [entry.id, entry]));

    (Array.isArray(importedEntries) ? importedEntries : []).forEach((entry) => {
      const id = String(entry?.id || "").trim();
      if (!id) return;
      if (entry?.tombstone === true || entry?._delete === true || entry?.deleted === true) {
        byId.delete(id);
        return;
      }
      byId.set(id, normalizeEntry(entry));
    });

    return Array.from(byId.values());
  }

  window.WS_APP.importEntries = function importEntries(entries, options = {}) {
    if (!Array.isArray(entries)) return null;
    const mode = options.mode === "merge" ? "merge" : "replace";
    entryStore = mode === "merge"
      ? mergeEntriesById(entryStore, entries)
      : normalizeEntries(entries.filter((entry) => !(entry?.tombstone === true || entry?._delete === true || entry?.deleted === true)));
    save();
    return window.WS_APP.getEntries({ includeArchived: true });
  };

  window.WS_APP.resetEntryStore = function resetEntryStore() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(STORAGE_SCHEMA_KEY);
    } catch (error) {
      console.warn("W&S entries store could not clear localStorage.", error);
    }

    entryStore = readBaseEntries();
    emitEntriesUpdate({ reset: true });
    return window.WS_APP.getEntries({ includeArchived: true });
  };

  window.WS_APP.initEntryStore();
})();
