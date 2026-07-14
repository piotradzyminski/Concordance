window.WS_APP = window.WS_APP || {};

(function initTagStoreModule() {
  const STORAGE_KEY = "ws_app_tags_v1";
  let tagStore = [];

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function slugify(value) {
    const base = String(value || "tag")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);

    return base || "tag";
  }

  function uniqueId(seed) {
    const base = slugify(seed || "tag-record");
    const existing = new Set(tagStore.map((record) => record.id));

    if (!existing.has(base)) return base;

    let index = 2;
    while (existing.has(`${base}-${index}`)) index += 1;
    return `${base}-${index}`;
  }

  function normalizeVisibility(value) {
    const visibility = String(value || "RESTRICTED").trim().toUpperCase();
    const allowed = ["PUBLIC", "CIVIL", "RESTRICTED", "BLACK", "GM"];
    return allowed.includes(visibility) ? visibility : "RESTRICTED";
  }

  function normalizeTag(record = {}) {
    const normalized = clone(record || {});
    const now = new Date().toISOString();

    normalized.name = String(normalized.name || normalized.tag || "NEW TAG").trim().toUpperCase();
    normalized.id = String(normalized.id || uniqueId(normalized.name || "tag-record")).trim();
    normalized.type = String(normalized.type || "SYSTEM").trim().toUpperCase();
    normalized.visibility = normalizeVisibility(normalized.visibility);
    normalized.riskWeight = Number.isFinite(Number(normalized.riskWeight)) ? Number(normalized.riskWeight) : 0;
    normalized.description = String(normalized.description || "").trim();
    normalized.gmNote = String(normalized.gmNote || "").trim();
    normalized.archived = normalized.archived === true;
    normalized.updatedAt = normalized.updatedAt || now;
    normalized.createdAt = normalized.createdAt || normalized.updatedAt;

    if (Object.prototype.hasOwnProperty.call(normalized, "tag")) delete normalized.tag;

    return normalized;
  }

  function normalizeTags(records) {
    return (Array.isArray(records) ? records : [])
      .filter(Boolean)
      .map((record) => normalizeTag(record));
  }

  function readBaseTags() {
    return normalizeTags(window.APP_DATA?.tags || []);
  }

  function readStoredTags() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? normalizeTags(parsed) : null;
    } catch (error) {
      console.warn("W&S tag store could not read localStorage.", error);
      return null;
    }
  }

  function writeStoredTags(records) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.warn("W&S tag store could not write localStorage.", error);
    }
  }

  function emitTagUpdate(detail = {}) {
    window.dispatchEvent(new CustomEvent("ws:tags-updated", { detail }));
  }

  function save() {
    writeStoredTags(tagStore);
    emitTagUpdate({ tags: clone(tagStore) });
  }

  window.WS_APP.initTagStore = function initTagStore() {
    const storedTags = readStoredTags();
    tagStore = storedTags || readBaseTags();
    return window.WS_APP.getTags({ includeArchived: true });
  };

  window.WS_APP.getTags = function getTags(options = {}) {
    const includeArchived = options.includeArchived === true;
    const records = includeArchived ? tagStore : tagStore.filter((record) => !record.archived);
    return clone(records);
  };

  window.WS_APP.getTagById = function getTagById(id) {
    const record = tagStore.find((item) => item.id === id);
    return record ? clone(record) : null;
  };

  window.WS_APP.createTag = function createTag(data = {}) {
    const now = new Date().toISOString();
    const record = normalizeTag({
      ...data,
      id: data.id || uniqueId(data.name || data.tag || "tag-record"),
      createdAt: now,
      updatedAt: now
    });

    tagStore.push(record);
    save();
    return clone(record);
  };

  window.WS_APP.updateTag = function updateTag(id, patch = {}) {
    const index = tagStore.findIndex((record) => record.id === id);
    if (index < 0) return null;

    const updated = normalizeTag({
      ...tagStore[index],
      ...clone(patch),
      id: tagStore[index].id,
      createdAt: tagStore[index].createdAt,
      updatedAt: new Date().toISOString()
    });

    tagStore.splice(index, 1, updated);
    save();
    return clone(updated);
  };

  window.WS_APP.archiveTag = function archiveTag(id) {
    return window.WS_APP.updateTag(id, { archived: true });
  };

  window.WS_APP.restoreTag = function restoreTag(id) {
    return window.WS_APP.updateTag(id, { archived: false });
  };

  window.WS_APP.deleteTag = function deleteTag(id) {
    const index = tagStore.findIndex((record) => record.id === id);
    if (index < 0) return false;
    const [deleted] = tagStore.splice(index, 1);
    save();
    emitTagUpdate({ deleted: true, id, tag: clone(deleted) });
    return true;
  };

  window.WS_APP.createDefaultTag = function createDefaultTag() {
    return window.WS_APP.createTag({
      name: "NEW TAG",
      type: "SYSTEM",
      visibility: "RESTRICTED",
      riskWeight: 0,
      description: "Pending tag classification.",
      gmNote: "Generated by Tag Registry.",
      archived: false
    });
  };

  window.WS_APP.duplicateTag = function duplicateTag(id) {
    const record = window.WS_APP.getTagById(id);
    if (!record) return null;
    return window.WS_APP.createTag({
      ...record,
      id: undefined,
      name: `${record.name || "TAG"} COPY`,
      archived: false,
      createdAt: undefined,
      updatedAt: undefined
    });
  };

  window.WS_APP.importTags = function importTags(records) {
    if (!Array.isArray(records)) return null;
    tagStore = normalizeTags(records);
    save();
    return window.WS_APP.getTags({ includeArchived: true });
  };

  window.WS_APP.resetTagStore = function resetTagStore() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("W&S tag store could not clear localStorage.", error);
    }

    tagStore = readBaseTags();
    emitTagUpdate({ reset: true });
    return window.WS_APP.getTags({ includeArchived: true });
  };

  window.WS_APP.initTagStore();
})();
