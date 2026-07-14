window.WS_APP = window.WS_APP || {};

(function initCitizenFileStoreModule(app) {
  "use strict";

  const STORAGE_KEY = "ws_app_citizen_files_v1";
  const SCHEMA_KEY = "ws_app_citizen_files_schema";
  const SCHEMA_VERSION = "citizen_files_record_relations_1_0x";
  const STATUS_VALUES = new Set(["DRAFT", "ACTIVE", "PENDING", "CLOSED", "SEALED", "ARCHIVED"]);
  let citizenFileStore = [];

  const clone = app.storeUtils?.clone || ((value) => {
    if (value === undefined) return undefined;
    try { return structuredClone(value); }
    catch (error) { return JSON.parse(JSON.stringify(value)); }
  });

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeToken(value = "") {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function slugify(value = "citizen-file") {
    const normalized = String(value || "citizen-file")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    return normalized || "citizen-file";
  }

  function parseList(value) {
    const entries = Array.isArray(value)
      ? value
      : String(value || "").split(/[\n,]/g);
    return Array.from(new Set(entries
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)));
  }

  function normalizeAccessTags(value, fallback = ["RESTRICTED"]) {
    if (typeof app.normalizeAccessTagList === "function") {
      return app.normalizeAccessTagList(value, fallback);
    }
    const source = Array.isArray(value) && value.length ? value : fallback;
    return Array.from(new Set(source.map((tag) => normalizeToken(tag)).filter(Boolean)));
  }

  function normalizeStatus(value, archived = false) {
    if (archived === true) return "ARCHIVED";
    const normalized = normalizeToken(value || "ACTIVE");
    return STATUS_VALUES.has(normalized) ? normalized : "ACTIVE";
  }

  function normalizeDate(value, fallback = "") {
    const text = String(value || fallback || "").trim();
    if (!text) return "";
    const match = text.match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : text;
  }

  function getKnownCitizenIds() {
    return new Set((app.getCitizens?.({ includeArchived: true }) || window.APP_DATA?.citizens || [])
      .map((citizen) => String(citizen?.id || "").trim())
      .filter(Boolean));
  }

  function getKnownCaseFileIds() {
    return new Set((app.getCaseFiles?.({ includeArchived: true }) || window.APP_DATA?.caseFiles || [])
      .map((record) => String(record?.id || record?.caseFileId || "").trim())
      .filter(Boolean));
  }

  function makeUniqueCitizenFileId(seed = "citizen-file", preferredId = "") {
    const existing = new Set(citizenFileStore.map((record) => record.fileId));
    const preferred = String(preferredId || "").trim();
    if (preferred && !existing.has(preferred)) return preferred;

    const base = `citizen-file-${slugify(seed)}`;
    if (!existing.has(base)) return base;
    let index = 2;
    while (existing.has(`${base}-${index}`)) index += 1;
    return `${base}-${index}`;
  }

  function normalizeCitizenFile(record = {}, options = {}) {
    const source = clone(record || {});
    const now = nowIso();
    const title = String(source.title || source.name || "NEW CITIZEN FILE").trim() || "NEW CITIZEN FILE";
    const citizenId = String(source.citizenId || options.citizenId || "").trim();
    const preferredId = String(source.fileId || source.id || "").trim();
    const fileId = preferredId || makeUniqueCitizenFileId(`${citizenId}-${title}`);
    const archived = source.archived === true || normalizeToken(source.status) === "ARCHIVED";
    const createdAt = String(source.createdAt || source.dateCreated || source.date || now).trim() || now;
    const updatedAt = String(source.updatedAt || source.dateUpdated || createdAt).trim() || createdAt;

    return {
      schemaVersion: 2,
      fileId,
      id: fileId,
      citizenId,
      type: normalizeToken(source.type || "GENERAL") || "GENERAL",
      title,
      status: normalizeStatus(source.status, archived),
      summary: String(source.summary || "").trim(),
      body: String(source.body || source.details || "").trim(),
      date: normalizeDate(source.date, createdAt.slice(0, 10)),
      accessTags: normalizeAccessTags(source.accessTags, [source.clearance || "RESTRICTED"]),
      tags: parseList(source.tags).map((tag) => normalizeToken(tag)).filter(Boolean),
      relatedCaseFileIds: parseList(source.relatedCaseFileIds || source.caseFileIds),
      archived,
      revision: Math.max(1, Number(source.revision || 1) || 1),
      createdAt,
      updatedAt,
      createdBy: String(source.createdBy || source.author || "").trim(),
      updatedBy: String(source.updatedBy || source.createdBy || source.author || "").trim(),
      legacyRefs: source.legacyRefs && typeof source.legacyRefs === "object" ? clone(source.legacyRefs) : {}
    };
  }

  function validateCitizenFile(record = {}, options = {}) {
    const errors = [];
    const citizenIds = options.citizenIds || getKnownCitizenIds();
    const caseFileIds = options.caseFileIds || getKnownCaseFileIds();

    if (!String(record.fileId || "").trim()) errors.push({ code: "CITIZEN_FILE_ID_REQUIRED" });
    if (!String(record.citizenId || "").trim()) errors.push({ code: "CITIZEN_FILE_CITIZEN_REQUIRED" });
    else if (citizenIds.size && !citizenIds.has(record.citizenId)) errors.push({ code: "CITIZEN_FILE_CITIZEN_NOT_FOUND", citizenId: record.citizenId });
    if (!String(record.title || "").trim()) errors.push({ code: "CITIZEN_FILE_TITLE_REQUIRED" });
    if (!STATUS_VALUES.has(String(record.status || "").toUpperCase())) errors.push({ code: "CITIZEN_FILE_STATUS_INVALID", status: record.status });
    if (!Array.isArray(record.accessTags) || !record.accessTags.length) errors.push({ code: "CITIZEN_FILE_ACCESS_TAGS_REQUIRED" });

    (record.relatedCaseFileIds || []).forEach((caseFileId) => {
      if (caseFileIds.size && !caseFileIds.has(caseFileId)) {
        errors.push({ code: "CITIZEN_FILE_CASE_REFERENCE_MISSING", caseFileId });
      }
    });

    return { ok: errors.length === 0, errors };
  }

  function normalizeCitizenFiles(records = [], options = {}) {
    const normalized = [];
    const seen = new Set();
    const citizenIds = options.citizenIds || getKnownCitizenIds();
    const caseFileIds = options.caseFileIds || getKnownCaseFileIds();
    const errors = [];

    (Array.isArray(records) ? records : []).filter(Boolean).forEach((record) => {
      const item = normalizeCitizenFile(record);
      if (seen.has(item.fileId)) {
        errors.push({ code: "CITIZEN_FILE_ID_DUPLICATE", fileId: item.fileId });
        return;
      }
      seen.add(item.fileId);
      const validation = validateCitizenFile(item, { citizenIds, caseFileIds });
      errors.push(...validation.errors);
      normalized.push(item);
    });

    return { records: normalized, errors };
  }

  function readStoredCitizenFiles() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw == null) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return normalizeCitizenFiles(parsed).records;
    } catch (error) {
      console.warn("W&S Citizen File Store could not read localStorage.", error);
      return null;
    }
  }

  function readLegacyEmbeddedCitizenFiles(citizens = []) {
    const records = [];
    (Array.isArray(citizens) ? citizens : []).forEach((citizen) => {
      const citizenId = String(citizen?.id || "").trim();
      (Array.isArray(citizen?.files) ? citizen.files : []).forEach((file, index) => {
        const legacyId = String(file?.fileId || file?.id || "").trim();
        records.push({
          ...clone(file),
          fileId: legacyId || `citizen-file-${slugify(citizenId)}-${String(index + 1).padStart(3, "0")}`,
          citizenId,
          legacyRefs: {
            ...(file?.legacyRefs && typeof file.legacyRefs === "object" ? clone(file.legacyRefs) : {}),
            embeddedCitizenFiles: true,
            legacyCitizenId: citizenId,
            legacyIndex: index
          }
        });
      });
    });
    return normalizeCitizenFiles(records).records;
  }

  function writeStore() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(citizenFileStore));
      window.localStorage.setItem(SCHEMA_KEY, SCHEMA_VERSION);
      return true;
    } catch (error) {
      console.warn("W&S Citizen File Store could not write localStorage.", error);
      return false;
    }
  }

  function emitUpdate(detail = {}) {
    window.dispatchEvent(new CustomEvent("ws:citizen-files-updated", {
      detail: {
        ...clone(detail),
        revision: Date.now()
      }
    }));
  }

  function save(detail = {}) {
    const persisted = writeStore();
    if (persisted) emitUpdate(detail);
    return persisted;
  }

  function actorId(actor = app.currentUser) {
    return String(actor?.id || actor?.userId || actor?.login || "SYSTEM").trim() || "SYSTEM";
  }

  function setMutationError(error = null) {
    app.lastCitizenFileMutationError = error ? clone(error) : null;
    return null;
  }

  function canManageCitizenFiles(user = app.currentUser) {
    return String(user?.role || "").trim().toLowerCase() === "admin";
  }

  function canAccessCitizenFile(user = app.currentUser, record = {}) {
    if (!record) return false;
    if (String(user?.role || "").toLowerCase() === "admin") return true;
    if (record.archived === true) return false;
    if (typeof app.canAccessRecord === "function" && !app.canAccessRecord(user, record)) return false;
    const citizenId = String(record.citizenId || "").trim();
    const linkedCitizen = citizenId ? app.getCitizenById?.(citizenId) : null;
    return Boolean(citizenId && (
      citizenId === String(user?.citizenId || "").trim()
      || linkedCitizen?.playerVisible === true
    ));
  }

  function ensureCitizenFileMutationAllowed(options = {}) {
    if (options.system === true || canManageCitizenFiles(options.actor || app.currentUser)) return true;
    setMutationError({ code: "CITIZEN_FILE_ADMIN_REQUIRED" });
    return false;
  }

  function getCitizenFiles(options = {}) {
    const includeArchived = options.includeArchived === true;
    const citizenId = String(options.citizenId || "").trim();
    const status = normalizeToken(options.status || "");
    const type = normalizeToken(options.type || "");
    const query = String(options.query || "").trim().toLocaleLowerCase("pl");
    const user = options.user || app.currentUser;
    const enforceAccess = options.enforceAccess !== false;

    return clone(citizenFileStore
      .filter((record) => includeArchived || !record.archived)
      .filter((record) => !citizenId || record.citizenId === citizenId)
      .filter((record) => !status || record.status === status)
      .filter((record) => !type || record.type === type)
      .filter((record) => !enforceAccess || canAccessCitizenFile(user, record))
      .filter((record) => {
        if (!query) return true;
        const haystack = [record.title, record.type, record.status, record.summary, record.body, ...(record.tags || [])]
          .join(" ")
          .toLocaleLowerCase("pl");
        return haystack.includes(query);
      })
      .sort((left, right) => {
        const dateCompare = String(right.date || right.updatedAt || "").localeCompare(String(left.date || left.updatedAt || ""));
        if (dateCompare) return dateCompare;
        return String(left.title || "").localeCompare(String(right.title || ""), "pl");
      }));
  }

  function getCitizenFileById(fileId, options = {}) {
    const record = citizenFileStore.find((entry) => entry.fileId === String(fileId || "").trim());
    if (!record) return null;
    if (options.enforceAccess !== false && !canAccessCitizenFile(options.user || app.currentUser, record)) return null;
    return clone(record);
  }

  function createCitizenFile(data = {}, options = {}) {
    setMutationError(null);
    if (!ensureCitizenFileMutationAllowed(options)) return null;
    const now = nowIso();
    const creator = actorId(options.actor || app.currentUser);
    const record = normalizeCitizenFile({
      ...clone(data),
      fileId: makeUniqueCitizenFileId(`${data.citizenId || "citizen"}-${data.title || "file"}`, data.fileId || data.id),
      revision: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: creator,
      updatedBy: creator
    });
    const validation = validateCitizenFile(record);
    if (!validation.ok) return setMutationError({ code: "CITIZEN_FILE_VALIDATION_FAILED", errors: validation.errors });
    citizenFileStore.push(record);
    if (!save({ operation: "CREATE", fileId: record.fileId, citizenId: record.citizenId })) {
      citizenFileStore.pop();
      return setMutationError({ code: "CITIZEN_FILE_PERSISTENCE_FAILED" });
    }
    return clone(record);
  }

  function updateCitizenFile(fileId, patch = {}, options = {}) {
    setMutationError(null);
    if (!ensureCitizenFileMutationAllowed(options)) return null;
    const index = citizenFileStore.findIndex((record) => record.fileId === String(fileId || "").trim());
    if (index < 0) return setMutationError({ code: "CITIZEN_FILE_NOT_FOUND", fileId });
    const current = citizenFileStore[index];
    if (options.expectedRevision != null && Number(options.expectedRevision) !== Number(current.revision)) {
      return setMutationError({ code: "CITIZEN_FILE_REVISION_CONFLICT", expectedRevision: Number(options.expectedRevision), actualRevision: current.revision });
    }

    const updated = normalizeCitizenFile({
      ...current,
      ...clone(patch),
      fileId: current.fileId,
      id: current.fileId,
      createdAt: current.createdAt,
      createdBy: current.createdBy,
      revision: current.revision + 1,
      updatedAt: nowIso(),
      updatedBy: actorId(options.actor || app.currentUser)
    });
    const validation = validateCitizenFile(updated);
    if (!validation.ok) return setMutationError({ code: "CITIZEN_FILE_VALIDATION_FAILED", errors: validation.errors });
    citizenFileStore.splice(index, 1, updated);
    if (!save({ operation: "UPDATE", fileId: updated.fileId, citizenId: updated.citizenId })) {
      citizenFileStore.splice(index, 1, current);
      return setMutationError({ code: "CITIZEN_FILE_PERSISTENCE_FAILED" });
    }
    return clone(updated);
  }

  function archiveCitizenFile(fileId, options = {}) {
    return updateCitizenFile(fileId, { archived: true, status: "ARCHIVED" }, options);
  }

  function restoreCitizenFile(fileId, options = {}) {
    return updateCitizenFile(fileId, { archived: false, status: "ACTIVE" }, options);
  }

  function deleteCitizenFile(fileId, options = {}) {
    setMutationError(null);
    if (!ensureCitizenFileMutationAllowed(options)) return false;
    const index = citizenFileStore.findIndex((record) => record.fileId === String(fileId || "").trim());
    if (index < 0) {
      setMutationError({ code: "CITIZEN_FILE_NOT_FOUND", fileId });
      return false;
    }
    const [deleted] = citizenFileStore.splice(index, 1);
    if (!save({ operation: "DELETE", fileId: deleted.fileId, citizenId: deleted.citizenId })) {
      citizenFileStore.splice(index, 0, deleted);
      setMutationError({ code: "CITIZEN_FILE_PERSISTENCE_FAILED" });
      return false;
    }
    return true;
  }

  function importCitizenFiles(records, options = {}) {
    setMutationError(null);
    if (!Array.isArray(records)) return setMutationError({ code: "CITIZEN_FILE_IMPORT_ARRAY_REQUIRED" });
    if (!ensureCitizenFileMutationAllowed({ ...options, system: options.system === true })) return null;
    const normalized = normalizeCitizenFiles(records);
    const blocking = normalized.errors.filter((error) => !["CITIZEN_FILE_CASE_REFERENCE_MISSING"].includes(error.code));
    if (blocking.length) return setMutationError({ code: "CITIZEN_FILE_IMPORT_INVALID", errors: normalized.errors });
    const previous = citizenFileStore;
    citizenFileStore = normalized.records;
    if (!save({ operation: "IMPORT", recordCount: citizenFileStore.length, warnings: normalized.errors })) {
      citizenFileStore = previous;
      return setMutationError({ code: "CITIZEN_FILE_PERSISTENCE_FAILED" });
    }
    return getCitizenFiles({ includeArchived: true, enforceAccess: false });
  }

  function resetCitizenFileStore(options = {}) {
    if (!ensureCitizenFileMutationAllowed({ ...options, system: options.system === true })) return null;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(SCHEMA_KEY);
    } catch (error) {
      return setMutationError({ code: "CITIZEN_FILE_RESET_FAILED", message: String(error?.message || error) });
    }
    citizenFileStore = readLegacyEmbeddedCitizenFiles(window.APP_DATA?.citizens || []);
    writeStore();
    emitUpdate({ operation: "RESET", recordCount: citizenFileStore.length });
    return getCitizenFiles({ includeArchived: true, enforceAccess: false });
  }

  function getCitizenFileDiagnostics() {
    const normalized = normalizeCitizenFiles(citizenFileStore);
    const duplicateIds = citizenFileStore
      .map((record) => record.fileId)
      .filter((fileId, index, list) => list.indexOf(fileId) !== index);
    const relationDiagnostics = app.getDatabaseRecordRelationDiagnostics?.() || null;
    return {
      ready: normalized.errors.length === 0 && duplicateIds.length === 0 && relationDiagnostics?.ready !== false,
      schemaVersion: SCHEMA_VERSION,
      recordCount: citizenFileStore.length,
      archivedCount: citizenFileStore.filter((record) => record.archived).length,
      duplicateIds: Array.from(new Set(duplicateIds)),
      errors: normalized.errors,
      relationDiagnostics
    };
  }

  function initCitizenFileStore() {
    const stored = readStoredCitizenFiles();
    if (stored) {
      citizenFileStore = stored;
      try { window.localStorage.setItem(SCHEMA_KEY, SCHEMA_VERSION); } catch (error) {}
      return getCitizenFiles({ includeArchived: true, enforceAccess: false });
    }

    const runtimeCitizens = app.getCitizens?.({ includeArchived: true }) || window.APP_DATA?.citizens || [];
    citizenFileStore = readLegacyEmbeddedCitizenFiles(runtimeCitizens);
    writeStore();
    if (citizenFileStore.length) emitUpdate({ operation: "LEGACY_MIGRATION", recordCount: citizenFileStore.length });
    return getCitizenFiles({ includeArchived: true, enforceAccess: false });
  }

  Object.assign(app, {
    CITIZEN_FILE_STORAGE_KEY: STORAGE_KEY,
    CITIZEN_FILE_SCHEMA_VERSION: SCHEMA_VERSION,
    initCitizenFileStore,
    normalizeCitizenFile,
    validateCitizenFile,
    getCitizenFiles,
    getCitizenFileById,
    createCitizenFile,
    updateCitizenFile,
    archiveCitizenFile,
    restoreCitizenFile,
    deleteCitizenFile,
    importCitizenFiles,
    resetCitizenFileStore,
    canAccessCitizenFile,
    canManageCitizenFiles,
    getCitizenFileDiagnostics
  });

  initCitizenFileStore();
})(window.WS_APP);
