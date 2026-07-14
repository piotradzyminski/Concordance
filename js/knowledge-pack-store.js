window.WS_APP = window.WS_APP || {};

(function initKnowledgePackStoreModule() {
  const PACK_SCHEMA = "future-noir.knowledge-pack";
  const CONTENT_SCHEMA_VERSION = 2;
  const META_STORAGE_KEY = "ws_app_knowledge_pack_meta_v1";
  const BACKUP_STORAGE_KEY = "ws_app_knowledge_pack_backup_v1";
  const DEFAULT_PACK_ID = "future-noir-main";
  const DEFAULT_PACK_VERSION = "1.0.0-local";
  const WORKSPACE_DB_NAME = "ws_app_knowledge_workspace_v1";
  const WORKSPACE_STORE_NAME = "handles";
  const WORKSPACE_HANDLE_KEY = "active";
  let suppressDirtyTracking = false;
  let workspaceHandle = null;
  let workspaceState = {
    supported: typeof window.showOpenFilePicker === "function" || typeof window.showSaveFilePicker === "function",
    connected: false,
    fileName: "",
    permission: "unavailable",
    restored: false,
    lastError: ""
  };

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function normalizePackMeta(value = {}) {
    return {
      packId: normalizeText(value.packId, DEFAULT_PACK_ID),
      packVersion: normalizeText(value.packVersion, DEFAULT_PACK_VERSION),
      updatedAt: normalizeText(value.updatedAt, nowIso()),
      importedAt: normalizeText(value.importedAt, ""),
      lastSavedAt: normalizeText(value.lastSavedAt, ""),
      lastExportedAt: normalizeText(value.lastExportedAt, ""),
      dirty: value.dirty === true
    };
  }

  function readPackMeta() {
    try {
      const raw = window.localStorage.getItem(META_STORAGE_KEY);
      return raw ? normalizePackMeta(JSON.parse(raw)) : normalizePackMeta();
    } catch (error) {
      console.warn("W&S knowledge pack metadata could not be read.", error);
      return normalizePackMeta();
    }
  }

  function writePackMeta(value = {}) {
    const meta = normalizePackMeta(value);
    try {
      window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
    } catch (error) {
      console.warn("W&S knowledge pack metadata could not be written.", error);
    }
    syncKnowledgePackIndicators();
    return meta;
  }

  function normalizeRecordArray(value, registry) {
    const records = Array.isArray(value) ? value : [];
    return records
      .filter((record) => record && typeof record === "object" && !Array.isArray(record))
      .map((record) => {
        const normalized = clone(record);
        if (registry === "system") normalized.registry = "system";
        if (registry === "systemIndex") normalized.registry = "system-index";
        return normalized;
      });
  }

  function splitSystemRecords(records) {
    const list = Array.isArray(records) ? records : [];
    return {
      system: list.filter((record) => String(record?.registry || "system").toLowerCase() !== "system-index"),
      systemIndex: list.filter((record) => String(record?.registry || "").toLowerCase() === "system-index")
    };
  }

  function canonicalizePackRelations(pack = {}) {
    if (typeof window.WS_APP.migrateKnowledgeRegistries !== "function") {
      return {
        pack: {
          ...pack,
          relationSchema: "stable-id-v1"
        },
        relationReport: null
      };
    }

    const migration = window.WS_APP.migrateKnowledgeRegistries({
      encyclopedia: pack.encyclopedia,
      system: pack.system,
      systemIndex: pack.systemIndex
    });

    return {
      pack: {
        ...pack,
        relationSchema: "stable-id-v1",
        encyclopedia: migration.registries.encyclopedia,
        system: migration.registries.system,
        systemIndex: migration.registries.systemIndex
      },
      relationReport: migration.report
    };
  }

  function appendRelationWarnings(warnings, report) {
    if (!report) return;
    if (report.converted > 0) warnings.push(`PACK_RELATIONS_MIGRATED_${report.converted}`);
    if (report.unresolved > 0) warnings.push(`PACK_RELATIONS_UNRESOLVED_${report.unresolved}`);
    if (report.ambiguous > 0) warnings.push(`PACK_RELATIONS_AMBIGUOUS_${report.ambiguous}`);
  }

  function migratePackPayload(payload = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { pack: null, warnings: [], errors: ["PACK_PAYLOAD_OBJECT_REQUIRED"], relationReport: null };
    }

    const warnings = [];
    const schema = normalizeText(payload.schema);
    const rawVersion = Number(payload.schemaVersion ?? 0);

    if (schema && schema !== PACK_SCHEMA) {
      return { pack: null, warnings, errors: ["PACK_SCHEMA_UNSUPPORTED"], relationReport: null };
    }

    if (rawVersion > CONTENT_SCHEMA_VERSION) {
      return { pack: null, warnings, errors: ["PACK_SCHEMA_VERSION_NEWER_THAN_RUNTIME"], relationReport: null };
    }

    if (schema === PACK_SCHEMA && rawVersion === CONTENT_SCHEMA_VERSION) {
      const normalized = canonicalizePackRelations({
        schema: PACK_SCHEMA,
        schemaVersion: CONTENT_SCHEMA_VERSION,
        relationSchema: normalizeText(payload.relationSchema, "stable-id-v1"),
        packId: normalizeText(payload.packId, DEFAULT_PACK_ID),
        packVersion: normalizeText(payload.packVersion, DEFAULT_PACK_VERSION),
        updatedAt: normalizeText(payload.updatedAt, nowIso()),
        encyclopedia: normalizeRecordArray(payload.encyclopedia, "encyclopedia"),
        system: normalizeRecordArray(payload.system, "system"),
        systemIndex: normalizeRecordArray(payload.systemIndex, "systemIndex")
      });
      appendRelationWarnings(warnings, normalized.relationReport);
      return {
        pack: normalized.pack,
        warnings,
        errors: [],
        relationReport: normalized.relationReport
      };
    }

    const legacyEntries = payload.encyclopedia || payload.entries || payload.data?.entries;
    const legacySystemRecords = payload.systemRecords || payload.data?.systemRecords;
    const legacySplit = splitSystemRecords(legacySystemRecords);
    const legacySystem = payload.system || legacySplit.system;
    const legacySystemIndex = payload.systemIndex || legacySplit.systemIndex;
    const looksMigratable = Array.isArray(legacyEntries)
      || Array.isArray(legacySystem)
      || Array.isArray(legacySystemIndex)
      || schema === PACK_SCHEMA;

    if (!looksMigratable) {
      return { pack: null, warnings, errors: ["PACK_SCHEMA_NOT_RECOGNIZED"], relationReport: null };
    }

    warnings.push("PACK_SCHEMA_MIGRATED_TO_V2");
    const normalized = canonicalizePackRelations({
      schema: PACK_SCHEMA,
      schemaVersion: CONTENT_SCHEMA_VERSION,
      relationSchema: "stable-id-v1",
      packId: normalizeText(payload.packId, DEFAULT_PACK_ID),
      packVersion: normalizeText(payload.packVersion, DEFAULT_PACK_VERSION),
      updatedAt: normalizeText(payload.updatedAt || payload.exportedAt, nowIso()),
      encyclopedia: normalizeRecordArray(legacyEntries, "encyclopedia"),
      system: normalizeRecordArray(legacySystem, "system"),
      systemIndex: normalizeRecordArray(legacySystemIndex, "systemIndex")
    });
    appendRelationWarnings(warnings, normalized.relationReport);

    return {
      pack: normalized.pack,
      warnings,
      errors: [],
      relationReport: normalized.relationReport
    };
  }

  function validateRegistry(records, label) {
    const errors = [];
    const ids = new Set();

    if (!Array.isArray(records)) return [`${label}_ARRAY_REQUIRED`];

    records.forEach((record, index) => {
      if (!record || typeof record !== "object" || Array.isArray(record)) {
        errors.push(`${label}_RECORD_${index + 1}_OBJECT_REQUIRED`);
        return;
      }

      const id = normalizeText(record.id);
      if (!id) {
        errors.push(`${label}_RECORD_${index + 1}_ID_REQUIRED`);
        return;
      }

      if (ids.has(id)) errors.push(`${label}_DUPLICATE_ID_${id}`);
      ids.add(id);
    });

    return errors;
  }

  function validatePackPayload(payload) {
    const migrated = migratePackPayload(payload);
    if (!migrated.pack) {
      return {
        ok: false,
        pack: null,
        warnings: migrated.warnings,
        errors: migrated.errors,
        relationReport: migrated.relationReport || null
      };
    }

    const pack = migrated.pack;
    const errors = [
      ...validateRegistry(pack.encyclopedia, "ENCYCLOPEDIA"),
      ...validateRegistry(pack.system, "SYSTEM"),
      ...validateRegistry(pack.systemIndex, "SYSTEM_INDEX")
    ];

    return {
      ok: errors.length === 0,
      pack,
      warnings: migrated.warnings,
      errors,
      relationReport: migrated.relationReport || null
    };
  }

  function isTombstone(record) {
    return record?.tombstone === true || record?._delete === true || record?.deleted === true;
  }

  function stableRecordSignature(record) {
    try {
      const keys = Object.keys(record || {}).sort();
      const ordered = {};
      keys.forEach((key) => {
        ordered[key] = record[key];
      });
      return JSON.stringify(ordered);
    } catch (error) {
      return String(record?.id || "");
    }
  }

  function getRecordLabel(record = {}) {
    return normalizeText(
      record.term
      || record.title
      || record.localTitle
      || record.localTerm
      || record.id,
      normalizeText(record.id, "UNNAMED RECORD")
    );
  }

  function getChangedFields(currentRecord = {}, incomingRecord = {}) {
    const ignored = new Set(["updatedAt", "createdAt"]);
    const keys = new Set([
      ...Object.keys(currentRecord || {}),
      ...Object.keys(incomingRecord || {})
    ]);
    return Array.from(keys)
      .filter((key) => !ignored.has(key))
      .filter((key) => stableRecordSignature({ value: currentRecord?.[key] }) !== stableRecordSignature({ value: incomingRecord?.[key] }))
      .sort();
  }

  function analyzeRegistry(currentRecords, incomingRecords) {
    const currentById = new Map((Array.isArray(currentRecords) ? currentRecords : []).map((record) => [String(record.id), record]));
    const incoming = Array.isArray(incomingRecords) ? incomingRecords : [];
    const changes = {
      added: [],
      updated: [],
      removed: [],
      unchanged: [],
      ignoredTombstones: []
    };
    const result = {
      current: currentById.size,
      incoming: incoming.length,
      added: 0,
      updated: 0,
      unchanged: 0,
      tombstones: 0,
      conflicts: 0,
      changes
    };

    incoming.forEach((record) => {
      const id = String(record.id || "");
      const current = currentById.get(id);

      if (isTombstone(record)) {
        if (current) {
          result.tombstones += 1;
          changes.removed.push({
            id,
            label: getRecordLabel(current)
          });
        } else {
          changes.ignoredTombstones.push({
            id,
            label: getRecordLabel(record)
          });
        }
        return;
      }

      if (!current) {
        result.added += 1;
        changes.added.push({
          id,
          label: getRecordLabel(record)
        });
        return;
      }

      if (stableRecordSignature(current) === stableRecordSignature(record)) {
        result.unchanged += 1;
        changes.unchanged.push({
          id,
          label: getRecordLabel(record)
        });
        return;
      }

      result.updated += 1;
      result.conflicts += 1;
      changes.updated.push({
        id,
        label: getRecordLabel(record),
        currentLabel: getRecordLabel(current),
        changedFields: getChangedFields(current, record)
      });
    });

    return result;
  }

  function mergeRegistry(currentRecords, incomingRecords, mode = "merge") {
    const incoming = Array.isArray(incomingRecords) ? incomingRecords : [];
    const byId = new Map();

    if (mode !== "replace") {
      (Array.isArray(currentRecords) ? currentRecords : []).forEach((record) => {
        const id = normalizeText(record?.id);
        if (id) byId.set(id, clone(record));
      });
    }

    incoming.forEach((record) => {
      const id = normalizeText(record?.id);
      if (!id) return;
      if (isTombstone(record)) {
        byId.delete(id);
        return;
      }
      byId.set(id, clone(record));
    });

    return Array.from(byId.values());
  }

  function getCurrentRegistries() {
    return {
      encyclopedia: window.WS_APP.getEntries?.({ includeArchived: true }) || [],
      system: window.WS_APP.getSystemRecords?.({ includeArchived: true, registry: "system" }) || [],
      systemIndex: window.WS_APP.getSystemRecords?.({ includeArchived: true, registry: "system-index" }) || []
    };
  }

  function exportKnowledgePack(options = {}) {
    const meta = normalizePackMeta({ ...readPackMeta(), ...options });
    const current = canonicalizePackRelations({
      schema: PACK_SCHEMA,
      schemaVersion: CONTENT_SCHEMA_VERSION,
      relationSchema: "stable-id-v1",
      packId: meta.packId,
      packVersion: meta.packVersion,
      updatedAt: nowIso(),
      ...getCurrentRegistries()
    });
    return clone(current.pack);
  }

  function previewKnowledgePackImport(payload, options = {}) {
    const validation = validatePackPayload(payload);
    if (!validation.ok) {
      return {
        ok: false,
        mode: options.mode === "replace" ? "replace" : "merge",
        pack: validation.pack,
        warnings: validation.warnings,
        errors: validation.errors,
        relationReport: validation.relationReport,
        registries: null
      };
    }

    const current = getCurrentRegistries();
    return {
      ok: true,
      mode: options.mode === "replace" ? "replace" : "merge",
      pack: clone(validation.pack),
      warnings: validation.warnings,
      errors: [],
      relationReport: validation.relationReport,
      registries: {
        encyclopedia: analyzeRegistry(current.encyclopedia, validation.pack.encyclopedia),
        system: analyzeRegistry(current.system, validation.pack.system),
        systemIndex: analyzeRegistry(current.systemIndex, validation.pack.systemIndex)
      }
    };
  }

  function createKnowledgePackBackup(reason = "PRE_IMPORT_BACKUP") {
    const backup = {
      schema: `${PACK_SCHEMA}.backup`,
      schemaVersion: CONTENT_SCHEMA_VERSION,
      createdAt: nowIso(),
      reason,
      payload: exportKnowledgePack()
    };

    try {
      window.localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backup));
      return clone(backup);
    } catch (error) {
      console.warn("W&S knowledge pack backup could not be written.", error);
      return null;
    }
  }

  function readKnowledgePackBackup() {
    try {
      const raw = window.localStorage.getItem(BACKUP_STORAGE_KEY);
      return raw ? clone(JSON.parse(raw)) : null;
    } catch (error) {
      console.warn("W&S knowledge pack backup could not be read.", error);
      return null;
    }
  }

  function importKnowledgePack(payload, options = {}) {
    const mode = options.mode === "replace" ? "replace" : "merge";
    const preview = previewKnowledgePackImport(payload, { mode });
    if (!preview.ok) return preview;

    const backup = options.skipBackup === true ? null : createKnowledgePackBackup();
    if (options.skipBackup !== true && !backup) {
      return {
        ...preview,
        ok: false,
        errors: ["PACK_BACKUP_WRITE_FAILED"]
      };
    }

    if (typeof window.WS_APP.importEntries !== "function" || typeof window.WS_APP.importSystemRecords !== "function") {
      return {
        ...preview,
        ok: false,
        errors: ["PACK_REGISTRY_IMPORTER_UNAVAILABLE"]
      };
    }

    const current = getCurrentRegistries();
    const merged = {
      encyclopedia: mergeRegistry(current.encyclopedia, preview.pack.encyclopedia, mode),
      system: mergeRegistry(current.system, preview.pack.system, mode),
      systemIndex: mergeRegistry(current.systemIndex, preview.pack.systemIndex, mode)
    };
    const canonical = canonicalizePackRelations({
      ...preview.pack,
      ...merged
    });
    const next = {
      encyclopedia: canonical.pack.encyclopedia,
      system: canonical.pack.system,
      systemIndex: canonical.pack.systemIndex
    };

    suppressDirtyTracking = true;
    try {
      const entriesResult = window.WS_APP.importEntries(next.encyclopedia, { mode: "replace", source: "knowledge-pack" });
      const systemResult = window.WS_APP.importSystemRecords([...next.system, ...next.systemIndex], { mode: "replace", source: "knowledge-pack" });
      if (!entriesResult || !systemResult) throw new Error("Knowledge registry importer returned no result.");
    } catch (error) {
      console.warn("W&S knowledge pack import commit failed. Restoring previous registries.", error);
      try {
        window.WS_APP.importEntries(current.encyclopedia, { mode: "replace", source: "knowledge-pack-rollback" });
        window.WS_APP.importSystemRecords([...current.system, ...current.systemIndex], { mode: "replace", source: "knowledge-pack-rollback" });
      } catch (rollbackError) {
        console.warn("W&S knowledge pack rollback failed.", rollbackError);
      }
      return {
        ...preview,
        ok: false,
        errors: ["PACK_IMPORT_COMMIT_FAILED"],
        backupCreated: Boolean(backup)
      };
    } finally {
      suppressDirtyTracking = false;
    }

    const meta = writePackMeta({
      packId: preview.pack.packId,
      packVersion: preview.pack.packVersion,
      updatedAt: preview.pack.updatedAt,
      importedAt: nowIso(),
      dirty: false
    });

    const result = {
      ...preview,
      ok: true,
      backupCreated: Boolean(backup),
      meta,
      relationReport: canonical.relationReport || preview.relationReport,
      activeCounts: {
        encyclopedia: next.encyclopedia.length,
        system: next.system.length,
        systemIndex: next.systemIndex.length
      }
    };

    window.dispatchEvent(new CustomEvent("ws:knowledge-pack-updated", { detail: clone(result) }));
    return result;
  }

  function emitWorkspaceUpdate() {
    window.dispatchEvent(new CustomEvent("ws:knowledge-pack-workspace-updated", {
      detail: clone(getWorkspaceState())
    }));
  }

  function getWorkspaceState() {
    const meta = readPackMeta();
    return {
      ...workspaceState,
      dirty: meta.dirty === true,
      packId: meta.packId,
      packVersion: meta.packVersion,
      lastSavedAt: meta.lastSavedAt || "",
      lastExportedAt: meta.lastExportedAt || ""
    };
  }

  function openWorkspaceDatabase() {
    if (typeof indexedDB === "undefined") return Promise.resolve(null);

    return new Promise((resolve) => {
      let request;
      try {
        request = indexedDB.open(WORKSPACE_DB_NAME, 1);
      } catch (error) {
        console.warn("W&S knowledge workspace database could not be opened.", error);
        resolve(null);
        return;
      }

      request.addEventListener("upgradeneeded", () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(WORKSPACE_STORE_NAME)) {
          db.createObjectStore(WORKSPACE_STORE_NAME);
        }
      });

      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => {
        console.warn("W&S knowledge workspace database open failed.", request.error);
        resolve(null);
      });
    });
  }

  async function writeWorkspaceHandle(handle) {
    const db = await openWorkspaceDatabase();
    if (!db) return false;

    return new Promise((resolve) => {
      const transaction = db.transaction(WORKSPACE_STORE_NAME, "readwrite");
      transaction.objectStore(WORKSPACE_STORE_NAME).put(handle, WORKSPACE_HANDLE_KEY);
      transaction.addEventListener("complete", () => {
        db.close();
        resolve(true);
      });
      transaction.addEventListener("error", () => {
        console.warn("W&S knowledge workspace handle could not be persisted.", transaction.error);
        db.close();
        resolve(false);
      });
    });
  }

  async function readWorkspaceHandle() {
    const db = await openWorkspaceDatabase();
    if (!db) return null;

    return new Promise((resolve) => {
      const transaction = db.transaction(WORKSPACE_STORE_NAME, "readonly");
      const request = transaction.objectStore(WORKSPACE_STORE_NAME).get(WORKSPACE_HANDLE_KEY);
      request.addEventListener("success", () => {
        db.close();
        resolve(request.result || null);
      });
      request.addEventListener("error", () => {
        console.warn("W&S knowledge workspace handle could not be restored.", request.error);
        db.close();
        resolve(null);
      });
    });
  }

  async function deleteWorkspaceHandle() {
    const db = await openWorkspaceDatabase();
    if (!db) return false;

    return new Promise((resolve) => {
      const transaction = db.transaction(WORKSPACE_STORE_NAME, "readwrite");
      transaction.objectStore(WORKSPACE_STORE_NAME).delete(WORKSPACE_HANDLE_KEY);
      transaction.addEventListener("complete", () => {
        db.close();
        resolve(true);
      });
      transaction.addEventListener("error", () => {
        console.warn("W&S knowledge workspace handle could not be removed.", transaction.error);
        db.close();
        resolve(false);
      });
    });
  }

  async function getHandlePermission(handle, request = false) {
    if (!handle) return "unavailable";
    const descriptor = { mode: "readwrite" };

    try {
      if (typeof handle.queryPermission === "function") {
        const current = await handle.queryPermission(descriptor);
        if (current === "granted" || !request) return current;
      }
      if (request && typeof handle.requestPermission === "function") {
        return await handle.requestPermission(descriptor);
      }
    } catch (error) {
      console.warn("W&S knowledge workspace permission check failed.", error);
      return "denied";
    }

    return "granted";
  }

  async function activateKnowledgePackWorkspace(handle, options = {}) {
    if (!handle) {
      return {
        ok: false,
        error: "WORKSPACE_HANDLE_REQUIRED"
      };
    }

    workspaceHandle = handle;
    const permission = await getHandlePermission(handle, false);
    workspaceState = {
      ...workspaceState,
      connected: true,
      fileName: normalizeText(options.fileName || handle.name, "knowledge.pack.json"),
      permission,
      restored: options.restored === true,
      lastError: ""
    };

    await writeWorkspaceHandle(handle);
    emitWorkspaceUpdate();
    return {
      ok: true,
      workspace: clone(getWorkspaceState())
    };
  }

  async function restoreKnowledgePackWorkspace() {
    if (!workspaceState.supported) {
      workspaceState = {
        ...workspaceState,
        restored: true,
        permission: "unavailable"
      };
      emitWorkspaceUpdate();
      return clone(getWorkspaceState());
    }

    const handle = await readWorkspaceHandle();
    if (!handle) {
      workspaceState = {
        ...workspaceState,
        connected: false,
        fileName: "",
        permission: "unavailable",
        restored: true,
        lastError: ""
      };
      emitWorkspaceUpdate();
      return clone(getWorkspaceState());
    }

    await activateKnowledgePackWorkspace(handle, {
      fileName: handle.name,
      restored: true
    });
    return clone(getWorkspaceState());
  }

  async function disconnectKnowledgePackWorkspace() {
    workspaceHandle = null;
    await deleteWorkspaceHandle();
    workspaceState = {
      ...workspaceState,
      connected: false,
      fileName: "",
      permission: "unavailable",
      restored: true,
      lastError: ""
    };
    emitWorkspaceUpdate();
    return {
      ok: true,
      workspace: clone(getWorkspaceState())
    };
  }

  async function readKnowledgePackFileHandle(handle) {
    if (!handle || typeof handle.getFile !== "function") {
      return {
        ok: false,
        error: "WORKSPACE_FILE_HANDLE_INVALID"
      };
    }

    try {
      const file = await handle.getFile();
      const raw = await file.text();
      const payload = JSON.parse(raw);
      const validation = validatePackPayload(payload);
      return {
        ok: validation.ok,
        fileName: file.name || handle.name || "knowledge.pack.json",
        payload,
        validation,
        preview: validation.ok ? previewKnowledgePackImport(validation.pack, { mode: "merge" }) : null
      };
    } catch (error) {
      console.warn("W&S knowledge workspace file could not be read.", error);
      return {
        ok: false,
        error: error?.name === "AbortError" ? "WORKSPACE_PICK_CANCELLED" : "WORKSPACE_FILE_READ_FAILED"
      };
    }
  }

  async function pickKnowledgePackWorkspaceFile() {
    if (typeof window.showOpenFilePicker !== "function") {
      return {
        ok: false,
        error: "FILE_SYSTEM_ACCESS_UNAVAILABLE"
      };
    }

    try {
      const handles = await window.showOpenFilePicker({
        multiple: false,
        types: [{
          description: "Future Noir Knowledge Pack",
          accept: {
            "application/json": [".json"]
          }
        }]
      });
      const handle = handles?.[0];
      if (!handle) return { ok: false, error: "WORKSPACE_FILE_HANDLE_REQUIRED" };
      const readResult = await readKnowledgePackFileHandle(handle);
      return {
        ...readResult,
        handle
      };
    } catch (error) {
      return {
        ok: false,
        error: error?.name === "AbortError" ? "WORKSPACE_PICK_CANCELLED" : "WORKSPACE_PICK_FAILED"
      };
    }
  }

  async function writeKnowledgePackHandle(handle, options = {}) {
    if (!handle || typeof handle.createWritable !== "function") {
      return {
        ok: false,
        error: "WORKSPACE_FILE_HANDLE_INVALID"
      };
    }

    const permission = await getHandlePermission(handle, true);
    if (permission !== "granted") {
      workspaceState = {
        ...workspaceState,
        permission,
        lastError: "WORKSPACE_WRITE_PERMISSION_DENIED"
      };
      emitWorkspaceUpdate();
      return {
        ok: false,
        error: "WORKSPACE_WRITE_PERMISSION_DENIED"
      };
    }

    const pack = exportKnowledgePack(options.packMeta || {});
    try {
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(pack, null, 2));
      await writable.close();

      const savedAt = nowIso();
      const meta = writePackMeta({
        ...readPackMeta(),
        updatedAt: pack.updatedAt,
        lastSavedAt: savedAt,
        dirty: false
      });

      workspaceState = {
        ...workspaceState,
        connected: workspaceHandle === handle || options.activate === true,
        fileName: normalizeText(handle.name, workspaceState.fileName || "knowledge.pack.json"),
        permission: "granted",
        restored: true,
        lastError: ""
      };

      if (options.activate === true) {
        workspaceHandle = handle;
        await writeWorkspaceHandle(handle);
      }

      const result = {
        ok: true,
        pack,
        meta,
        workspace: clone(getWorkspaceState())
      };
      emitWorkspaceUpdate();
      window.dispatchEvent(new CustomEvent("ws:knowledge-pack-saved", { detail: clone(result) }));
      return result;
    } catch (error) {
      console.warn("W&S knowledge workspace write failed.", error);
      workspaceState = {
        ...workspaceState,
        lastError: "WORKSPACE_WRITE_FAILED"
      };
      emitWorkspaceUpdate();
      return {
        ok: false,
        error: "WORKSPACE_WRITE_FAILED"
      };
    }
  }

  async function saveKnowledgePackWorkspace() {
    if (!workspaceHandle) {
      return {
        ok: false,
        error: "WORKSPACE_NOT_CONNECTED"
      };
    }
    return writeKnowledgePackHandle(workspaceHandle, { activate: true });
  }

  async function saveKnowledgePackCopy() {
    const pack = exportKnowledgePack();
    const safePackId = normalizeText(pack.packId, DEFAULT_PACK_ID).replace(/[^a-z0-9_-]+/gi, "-");
    const suggestedName = `${safePackId}.pack.json`;

    if (typeof window.showSaveFilePicker !== "function") {
      return {
        ok: false,
        error: "FILE_SYSTEM_ACCESS_UNAVAILABLE",
        pack,
        suggestedName
      };
    }

    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{
          description: "Future Noir Knowledge Pack",
          accept: {
            "application/json": [".json"]
          }
        }]
      });
      return writeKnowledgePackHandle(handle, { activate: true });
    } catch (error) {
      return {
        ok: false,
        error: error?.name === "AbortError" ? "WORKSPACE_SAVE_CANCELLED" : "WORKSPACE_SAVE_PICK_FAILED",
        pack,
        suggestedName
      };
    }
  }

  function getKnowledgePackIndicatorLabel(compact = false) {
    const meta = readPackMeta();
    const workspace = getWorkspaceState();
    const connectedLabel = workspace.connected
      ? workspace.fileName
      : "LOCAL PACK";
    const stateLabel = meta.dirty ? "MODIFIED" : "SYNCED";
    return compact
      ? `${stateLabel} / ${connectedLabel}`
      : `KNOWLEDGE PACK / ${stateLabel} / ${connectedLabel}`;
  }

  function escapeIndicatorText(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character]));
  }

  function syncKnowledgePackIndicators() {
    if (typeof document === "undefined") return;
    const meta = readPackMeta();
    document.querySelectorAll("[data-open-knowledge-workspace]").forEach((node) => {
      const compact = node.getAttribute("data-knowledge-pack-compact") === "true";
      node.textContent = getKnowledgePackIndicatorLabel(compact);
      node.classList.toggle("is-dirty", meta.dirty === true);
      node.classList.toggle("is-synced", meta.dirty !== true);
    });
  }

  function renderKnowledgePackIndicator(options = {}) {
    const meta = readPackMeta();
    const compact = options.compact === true;
    return `
      <button
        class="knowledge-pack-indicator ${meta.dirty ? "is-dirty" : "is-synced"}"
        type="button"
        data-open-knowledge-workspace
        data-knowledge-pack-compact="${compact ? "true" : "false"}"
        title="Open Knowledge Pack workspace"
      >
        ${escapeIndicatorText(getKnowledgePackIndicatorLabel(compact))}
      </button>
    `;
  }

  function markKnowledgePackDirty() {
    if (suppressDirtyTracking) return;
    const meta = readPackMeta();
    writePackMeta({
      ...meta,
      updatedAt: nowIso(),
      dirty: true
    });
  }

  window.WS_APP.KNOWLEDGE_PACK_SCHEMA = PACK_SCHEMA;
  window.WS_APP.KNOWLEDGE_PACK_SCHEMA_VERSION = CONTENT_SCHEMA_VERSION;
  window.WS_APP.isKnowledgePackPayload = function isKnowledgePackPayload(payload) {
    return Boolean(payload && typeof payload === "object" && !Array.isArray(payload) && (
      payload.schema === PACK_SCHEMA
      || (Array.isArray(payload.encyclopedia) && Array.isArray(payload.system) && Array.isArray(payload.systemIndex))
    ));
  };
  window.WS_APP.validateKnowledgePack = validatePackPayload;
  window.WS_APP.previewKnowledgePackImport = previewKnowledgePackImport;
  window.WS_APP.importKnowledgePack = importKnowledgePack;
  window.WS_APP.exportKnowledgePack = exportKnowledgePack;
  window.WS_APP.getKnowledgePackMeta = function getKnowledgePackMeta() {
    return clone(readPackMeta());
  };
  window.WS_APP.setKnowledgePackMeta = function setKnowledgePackMeta(patch = {}) {
    return clone(writePackMeta({ ...readPackMeta(), ...patch }));
  };
  window.WS_APP.createKnowledgePackBackup = createKnowledgePackBackup;
  window.WS_APP.getKnowledgePackBackup = readKnowledgePackBackup;
  window.WS_APP.mergeKnowledgeRegistry = mergeRegistry;
  window.WS_APP.getKnowledgePackWorkspace = function getKnowledgePackWorkspace() {
    return clone(getWorkspaceState());
  };
  window.WS_APP.restoreKnowledgePackWorkspace = restoreKnowledgePackWorkspace;
  window.WS_APP.pickKnowledgePackWorkspaceFile = pickKnowledgePackWorkspaceFile;
  window.WS_APP.activateKnowledgePackWorkspace = activateKnowledgePackWorkspace;
  window.WS_APP.disconnectKnowledgePackWorkspace = disconnectKnowledgePackWorkspace;
  window.WS_APP.saveKnowledgePackWorkspace = saveKnowledgePackWorkspace;
  window.WS_APP.saveKnowledgePackCopy = saveKnowledgePackCopy;
  window.WS_APP.renderKnowledgePackIndicator = renderKnowledgePackIndicator;
  window.WS_APP.syncKnowledgePackIndicators = syncKnowledgePackIndicators;

  window.addEventListener("ws:entries-updated", markKnowledgePackDirty);
  window.addEventListener("ws:system-records-updated", markKnowledgePackDirty);

  restoreKnowledgePackWorkspace();
})();
