window.WS_APP = window.WS_APP || {};

(function initAdminEquipmentCatalogAuthoring(app) {
  "use strict";

  if (app.AdminEquipmentCatalogAuthoring) return;

  const STORE_KEY = "ws_admin_equipment_catalog_authoring_v1";
  const SCHEMA_VERSION = "admin_equipment_catalog_authoring_1";
  const PACK_SCHEMA_VERSION = "equipment_catalog_authoring_pack_1";
  const VALID_STATES = new Set(["DRAFT", "PUBLISHED", "PUBLISHED_WITH_DRAFT", "ARCHIVED"]);
  const DEFINITION_ID_PATTERN = /^eqcat-[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

  function clone(value) {
    if (value == null) return value;
    try {
      return structuredClone(value);
    } catch (_error) {
      return JSON.parse(JSON.stringify(value));
    }
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function token(value) {
    return text(value).toUpperCase().replace(/[^A-Z0-9_:-]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function createEmptyStore() {
    return {
      schemaVersion: SCHEMA_VERSION,
      revision: 0,
      records: [],
      commandResults: []
    };
  }

  function normalizeActor(actor = {}) {
    return {
      actorId: text(actor.actorId || actor.id || actor.login),
      actorRole: token(actor.actorRole || actor.role),
      displayName: text(actor.displayName || actor.login || actor.actorId || actor.id || "ADMIN")
    };
  }

  function normalizeDefinitionId(value = "") {
    return text(value).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function getRecordState(record = {}) {
    if (record.archived === true) return "ARCHIVED";
    if (record.publishedDefinition && record.draftDefinition) return "PUBLISHED_WITH_DRAFT";
    if (record.publishedDefinition) return "PUBLISHED";
    return "DRAFT";
  }

  function normalizeRecord(record = {}) {
    const definitionId = normalizeDefinitionId(record.definitionId || record.id);
    const normalized = {
      definitionId,
      sourceDefinitionId: normalizeDefinitionId(record.sourceDefinitionId || definitionId),
      revision: Math.max(1, Math.round(Number(record.revision || 1)) || 1),
      archived: record.archived === true,
      draftDefinition: record.draftDefinition && typeof record.draftDefinition === "object" && !Array.isArray(record.draftDefinition)
        ? clone(record.draftDefinition)
        : null,
      publishedDefinition: record.publishedDefinition && typeof record.publishedDefinition === "object" && !Array.isArray(record.publishedDefinition)
        ? clone(record.publishedDefinition)
        : null,
      createdAt: text(record.createdAt) || nowIso(),
      updatedAt: text(record.updatedAt) || text(record.createdAt) || nowIso(),
      publishedAt: text(record.publishedAt) || null,
      archivedAt: text(record.archivedAt) || null,
      restoredAt: text(record.restoredAt) || null,
      lastActor: normalizeActor(record.lastActor || {})
    };
    normalized.state = getRecordState(normalized);
    return normalized;
  }

  function normalizeCommandResult(entry = {}) {
    return {
      idempotencyKey: text(entry.idempotencyKey),
      signature: text(entry.signature),
      result: clone(entry.result || {}),
      recordedAt: text(entry.recordedAt) || nowIso()
    };
  }

  function normalizeStore(raw = {}) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const byId = new Map();
    (Array.isArray(source.records) ? source.records : []).forEach((record) => {
      const normalized = normalizeRecord(record);
      if (normalized.definitionId) byId.set(normalized.definitionId, normalized);
    });
    return {
      schemaVersion: SCHEMA_VERSION,
      revision: Math.max(0, Math.round(Number(source.revision || 0)) || 0),
      records: [...byId.values()],
      commandResults: (Array.isArray(source.commandResults) ? source.commandResults : [])
        .map(normalizeCommandResult)
        .filter((entry) => entry.idempotencyKey)
        .slice(-500)
    };
  }

  function readStore() {
    try {
      const raw = window.localStorage?.getItem(STORE_KEY);
      if (!raw) return createEmptyStore();
      const parsed = JSON.parse(raw);
      if (parsed?.schemaVersion && parsed.schemaVersion !== SCHEMA_VERSION) return createEmptyStore();
      return normalizeStore(parsed);
    } catch (_error) {
      return createEmptyStore();
    }
  }

  function writeStore(next) {
    const normalized = normalizeStore(next);
    window.localStorage?.setItem(STORE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function getRecord(definitionId = "", store = readStore()) {
    const id = normalizeDefinitionId(definitionId);
    const record = store.records.find((entry) => entry.definitionId === id) || null;
    return record ? clone(record) : null;
  }

  function getSeedDefinition(definitionId = "") {
    const id = normalizeDefinitionId(definitionId);
    const source = Array.isArray(window.APP_DATA?.equipmentCatalog) ? window.APP_DATA.equipmentCatalog : [];
    const definition = source.find((entry) => normalizeDefinitionId(entry?.id || entry?.catalogId) === id) || null;
    return definition ? clone(definition) : null;
  }

  function getCanonicalDefinition(definitionId = "") {
    const id = normalizeDefinitionId(definitionId);
    if (!id) return null;
    const definition = typeof app.getEquipmentCatalogItemById === "function"
      ? app.getEquipmentCatalogItemById(id)
      : getSeedDefinition(id);
    return definition ? clone(definition) : null;
  }

  function normalizeDefinition(definition = {}) {
    const source = definition && typeof definition === "object" && !Array.isArray(definition) ? clone(definition) : {};
    source.id = normalizeDefinitionId(source.id || source.catalogId);
    source.catalogId = source.id;
    source.name = text(source.name || source.title || "Equipment Catalog Item");
    source.category = token(source.category || "MISC");
    source.subtype = token(source.subtype || "");
    source.itemType = token(source.itemType || source.itemTypeId || "GENERIC_ITEM");
    source.footprint = text(source.footprint || "1x1").toLowerCase();
    source.status = token(source.status || "OWNED");
    source.operatingStatus = token(source.operatingStatus || "ACTIVE");
    source.legality = token(source.legality || "UNREGISTERED");
    source.condition = Math.max(0, Math.min(100, Math.round(Number(source.condition ?? 100)) || 0));
    source.value = Math.max(0, Math.round(Number(source.value || 0)) || 0);
    source.capacityTier = Math.max(0, Math.round(Number(source.capacityTier || 0)) || 0);
    source.capacitySlots = Math.max(0, Math.round(Number(source.capacitySlots || 0)) || 0);
    source.requiresSubscriptionCategory = token(source.requiresSubscriptionCategory || "");
    source.requiresSubscriptionTier = Math.max(0, Math.round(Number(source.requiresSubscriptionTier || 0)) || 0);
    source.marketDepartment = token(source.marketDepartment || "");
    source.marketSubcategory = token(source.marketSubcategory || "");
    source.tags = Array.isArray(source.tags)
      ? [...new Set(source.tags.map(token).filter(Boolean))]
      : text(source.tags).split(",").map(token).filter(Boolean);
    source.notes = text(source.notes);
    source.gmNote = text(source.gmNote);
    source.archived = source.archived === true;
    source.itemTypeProfile = source.itemTypeProfile && typeof source.itemTypeProfile === "object" && !Array.isArray(source.itemTypeProfile) ? clone(source.itemTypeProfile) : {};
    source.equipProfile = source.equipProfile && typeof source.equipProfile === "object" && !Array.isArray(source.equipProfile) ? clone(source.equipProfile) : {};
    source.containerProfile = source.containerProfile && typeof source.containerProfile === "object" && !Array.isArray(source.containerProfile) ? clone(source.containerProfile) : null;
    source.mountProfile = source.mountProfile && typeof source.mountProfile === "object" && !Array.isArray(source.mountProfile) ? clone(source.mountProfile) : null;
    source.visualProfile = source.visualProfile && typeof source.visualProfile === "object" && !Array.isArray(source.visualProfile) ? clone(source.visualProfile) : {};
    return typeof app.normalizeEquipmentCatalogItem === "function"
      ? app.normalizeEquipmentCatalogItem(source)
      : source;
  }

  function validateDefinition(definition = {}, options = {}) {
    const normalized = normalizeDefinition(definition);
    const issues = [];
    if (!normalized.id) issues.push({ severity: "ERROR", code: "EQUIPMENT_DEFINITION_ID_REQUIRED" });
    else if (!DEFINITION_ID_PATTERN.test(normalized.id)) issues.push({ severity: "ERROR", code: "EQUIPMENT_DEFINITION_ID_INVALID", definitionId: normalized.id });
    if (!text(normalized.name)) issues.push({ severity: "ERROR", code: "EQUIPMENT_DEFINITION_NAME_REQUIRED", definitionId: normalized.id });
    if (!token(normalized.category)) issues.push({ severity: "ERROR", code: "EQUIPMENT_DEFINITION_CATEGORY_REQUIRED", definitionId: normalized.id });
    if (!token(normalized.itemType)) issues.push({ severity: "ERROR", code: "EQUIPMENT_DEFINITION_ITEM_TYPE_REQUIRED", definitionId: normalized.id });
    if (!Object.prototype.hasOwnProperty.call(app.EQUIPMENT_FOOTPRINTS || {}, normalized.footprint)) {
      issues.push({ severity: "ERROR", code: "EQUIPMENT_DEFINITION_FOOTPRINT_INVALID", definitionId: normalized.id, footprint: normalized.footprint });
    }
    if (normalized.condition < 0 || normalized.condition > 100) issues.push({ severity: "ERROR", code: "EQUIPMENT_DEFINITION_CONDITION_INVALID", definitionId: normalized.id });
    if (normalized.value < 0) issues.push({ severity: "ERROR", code: "EQUIPMENT_DEFINITION_VALUE_INVALID", definitionId: normalized.id });
    if (normalized.containerProfile) {
      if (normalized.containerProfile.gridColumns < 0 || normalized.containerProfile.gridRows < 0) {
        issues.push({ severity: "ERROR", code: "EQUIPMENT_DEFINITION_CONTAINER_GRID_INVALID", definitionId: normalized.id });
      }
      if ((normalized.containerProfile.gridColumns > 0) !== (normalized.containerProfile.gridRows > 0)) {
        issues.push({ severity: "WARNING", code: "EQUIPMENT_DEFINITION_CONTAINER_GRID_PARTIAL", definitionId: normalized.id });
      }
    }
    const hasSourceDefinitionId = Object.prototype.hasOwnProperty.call(options, "sourceDefinitionId");
    const sourceDefinitionId = normalizeDefinitionId(hasSourceDefinitionId ? options.sourceDefinitionId : normalized.id);
    const existing = getCanonicalDefinition(normalized.id);
    if (existing && sourceDefinitionId !== normalized.id && options.allowExisting !== true) {
      issues.push({ severity: "ERROR", code: "EQUIPMENT_DEFINITION_ID_DUPLICATE", definitionId: normalized.id });
    }
    return {
      ok: !issues.some((issue) => issue.severity === "ERROR"),
      status: issues.some((issue) => issue.severity === "ERROR") ? "FAILED" : "SUCCEEDED",
      resultCode: issues.some((issue) => issue.severity === "ERROR") ? "EQUIPMENT_DEFINITION_VALIDATION_FAILED" : "EQUIPMENT_DEFINITION_VALID",
      definition: normalized,
      issues
    };
  }

  function commandSignature(command, definitionId, definition = null) {
    return JSON.stringify({ command: token(command), definitionId: normalizeDefinitionId(definitionId), definition: definition ? normalizeDefinition(definition) : null });
  }

  function getReplay(store, idempotencyKey, signature) {
    const key = text(idempotencyKey);
    if (!key) return null;
    const existing = store.commandResults.find((entry) => entry.idempotencyKey === key) || null;
    if (!existing) return null;
    if (existing.signature !== signature) {
      return {
        ok: false,
        status: "FAILED",
        resultCode: "EQUIPMENT_CATALOG_AUTHORING_IDEMPOTENCY_CONFLICT",
        idempotencyKey: key
      };
    }
    return clone(existing.result);
  }

  function appendCommandResult(store, idempotencyKey, signature, result) {
    const key = text(idempotencyKey);
    if (!key) return store;
    const next = clone(store);
    next.commandResults = next.commandResults.filter((entry) => entry.idempotencyKey !== key);
    next.commandResults.push({ idempotencyKey: key, signature, result: clone(result), recordedAt: nowIso() });
    next.commandResults = next.commandResults.slice(-500);
    return next;
  }

  function requireCommand(input = {}) {
    const actor = normalizeActor(input.actor || app.currentUser || {});
    if (actor.actorRole !== "ADMIN") return { ok: false, status: "FAILED", resultCode: "ADMIN_ROLE_REQUIRED", actor };
    if (!text(input.operatorNote)) return { ok: false, status: "FAILED", resultCode: "ADMIN_OPERATOR_NOTE_REQUIRED", actor };
    if (!text(input.idempotencyKey)) return { ok: false, status: "FAILED", resultCode: "IDEMPOTENCY_KEY_REQUIRED", actor };
    return { ok: true, actor };
  }

  function appendAudit(input, result) {
    try {
      app.appendAdminAuditResult?.({
        actor: input.actor,
        workspace: "CATALOG_MANAGEMENT",
        category: "EQUIPMENT_CATALOG",
        sourceCommand: result.command || input.command || "EQUIPMENT_CATALOG_AUTHORING",
        recordId: result.definitionId || input.definitionId || input.definition?.id || "",
        target: result.definitionId || input.definitionId || input.definition?.id || "EQUIPMENT_CATALOG",
        targetRefs: result.definitionId ? [{ type: "EQUIPMENT_DEFINITION", id: result.definitionId }] : [],
        request: {
          idempotencyKey: input.idempotencyKey,
          correlationId: result.correlationId || input.correlationId || "",
          operatorNote: input.operatorNote
        },
        result: {
          status: result.status || (result.ok ? "SUCCEEDED" : "FAILED"),
          resultCode: result.resultCode,
          message: result.message || result.resultCode
        },
        previousRevision: result.revisionBefore,
        nextRevision: result.revisionAfter,
        domainRefs: { equipmentDefinitionId: result.definitionId || "" },
        summary: `${result.command || input.command || "EQUIPMENT_CATALOG_AUTHORING"} ${result.definitionId || ""}`.trim(),
        metadata: { operatorNote: input.operatorNote, issues: result.issues || [] }
      }, { user: input.actor });
    } catch (_error) {
      // Canonical Audit Store owns its own recovery queue.
    }
  }

  function persistMutation(input, command, mutate) {
    const guard = requireCommand(input);
    if (!guard.ok) return guard;
    const definitionId = normalizeDefinitionId(input.definitionId || input.definition?.id || input.definition?.catalogId);
    const signature = commandSignature(command, definitionId, input.definition || null);
    const currentStore = readStore();
    const replay = getReplay(currentStore, input.idempotencyKey, signature);
    if (replay) return replay;
    const currentRecord = getRecord(definitionId, currentStore);
    const expectedRevision = Math.max(0, Math.round(Number(input.expectedRevision || 0)) || 0);
    const currentRevision = currentRecord?.revision || 0;
    if (expectedRevision !== currentRevision) {
      const failure = {
        ok: false,
        status: "FAILED",
        resultCode: "EQUIPMENT_CATALOG_AUTHORING_STALE_REVISION",
        command,
        definitionId,
        expectedRevision,
        actualRevision: currentRevision,
        idempotencyKey: text(input.idempotencyKey)
      };
      appendAudit({ ...input, actor: guard.actor, command }, failure);
      return failure;
    }
    let mutation;
    try {
      mutation = mutate({ store: currentStore, record: currentRecord, definitionId, actor: guard.actor });
    } catch (error) {
      const failure = {
        ok: false,
        status: "FAILED",
        resultCode: error?.code || error?.message || "EQUIPMENT_CATALOG_AUTHORING_FAILED",
        command,
        definitionId,
        idempotencyKey: text(input.idempotencyKey)
      };
      appendAudit({ ...input, actor: guard.actor, command }, failure);
      return failure;
    }
    if (!mutation?.ok) {
      const failure = {
        ok: false,
        status: "FAILED",
        command,
        definitionId,
        idempotencyKey: text(input.idempotencyKey),
        ...(mutation || { resultCode: "EQUIPMENT_CATALOG_AUTHORING_FAILED" })
      };
      appendAudit({ ...input, actor: guard.actor, command }, failure);
      return failure;
    }
    const timestamp = nowIso();
    const nextStore = clone(currentStore);
    nextStore.revision += 1;
    if (mutation.removeRecord === true) {
      nextStore.records = nextStore.records.filter((entry) => entry.definitionId !== definitionId);
    } else {
      const nextRecord = normalizeRecord({
        ...(currentRecord || {}),
        ...(mutation.record || {}),
        definitionId,
        sourceDefinitionId: mutation.record?.sourceDefinitionId || currentRecord?.sourceDefinitionId || input.sourceDefinitionId || definitionId,
        revision: currentRevision + 1,
        createdAt: currentRecord?.createdAt || timestamp,
        updatedAt: timestamp,
        lastActor: guard.actor
      });
      nextStore.records = nextStore.records.filter((entry) => entry.definitionId !== definitionId);
      nextStore.records.push(nextRecord);
    }
    const result = {
      ok: true,
      status: "SUCCEEDED",
      command,
      resultCode: mutation.resultCode,
      definitionId,
      revisionBefore: currentRevision,
      revisionAfter: currentRevision + 1,
      storeRevision: nextStore.revision,
      idempotencyKey: text(input.idempotencyKey),
      correlationId: text(input.correlationId || `equipment-catalog:${definitionId}:${Date.now()}`),
      issues: mutation.issues || [],
      state: mutation.removeRecord === true ? "REMOVED" : getRecordState(mutation.record || {})
    };
    const stored = appendCommandResult(nextStore, input.idempotencyKey, signature, result);
    try {
      writeStore(stored);
    } catch (_error) {
      const failure = {
        ...result,
        ok: false,
        status: "RECOVERY_REQUIRED",
        resultCode: "EQUIPMENT_CATALOG_AUTHORING_PERSISTENCE_FAILED"
      };
      appendAudit({ ...input, actor: guard.actor, command }, failure);
      return failure;
    }
    app.invalidateEquipmentCatalogIndex?.();
    window.dispatchEvent?.(new CustomEvent("ws:equipment-catalog-authoring-updated", { detail: { command, definitionId, resultCode: result.resultCode } }));
    appendAudit({ ...input, actor: guard.actor, command }, result);
    return result;
  }

  function saveDraft(input = {}) {
    return persistMutation(input, "SAVE_EQUIPMENT_DEFINITION_DRAFT", ({ record, definitionId }) => {
      const sourceDefinitionId = normalizeDefinitionId(input.sourceDefinitionId || record?.sourceDefinitionId || "");
      const validation = validateDefinition(input.definition, {
        sourceDefinitionId,
        allowExisting: Boolean(sourceDefinitionId && sourceDefinitionId === definitionId)
      });
      if (!validation.ok) return { ok: false, resultCode: validation.resultCode, issues: validation.issues };
      return {
        ok: true,
        resultCode: "EQUIPMENT_DEFINITION_DRAFT_SAVED",
        issues: validation.issues,
        record: {
          ...(record || {}),
          definitionId,
          sourceDefinitionId: normalizeDefinitionId(input.sourceDefinitionId || record?.sourceDefinitionId || definitionId),
          draftDefinition: validation.definition,
          publishedDefinition: record?.publishedDefinition || null,
          archived: record?.archived === true,
          publishedAt: record?.publishedAt || null,
          archivedAt: record?.archivedAt || null
        }
      };
    });
  }

  function publishDefinition(input = {}) {
    return persistMutation(input, "PUBLISH_EQUIPMENT_DEFINITION", ({ record, definitionId }) => {
      const source = input.definition || record?.draftDefinition || record?.publishedDefinition || getCanonicalDefinition(definitionId);
      const sourceDefinitionId = normalizeDefinitionId(input.sourceDefinitionId || record?.sourceDefinitionId || "");
      const validation = validateDefinition(source, {
        sourceDefinitionId,
        allowExisting: Boolean(sourceDefinitionId && sourceDefinitionId === definitionId)
      });
      if (!validation.ok) return { ok: false, resultCode: validation.resultCode, issues: validation.issues };
      return {
        ok: true,
        resultCode: "EQUIPMENT_DEFINITION_PUBLISHED",
        issues: validation.issues,
        record: {
          ...(record || {}),
          definitionId,
          sourceDefinitionId: normalizeDefinitionId(input.sourceDefinitionId || record?.sourceDefinitionId || definitionId),
          draftDefinition: null,
          publishedDefinition: { ...validation.definition, archived: false },
          archived: false,
          publishedAt: nowIso(),
          archivedAt: null,
          restoredAt: record?.archived === true ? nowIso() : record?.restoredAt || null
        }
      };
    });
  }

  function archiveDefinition(input = {}) {
    return persistMutation(input, "ARCHIVE_EQUIPMENT_DEFINITION", ({ record, definitionId }) => {
      const source = record?.publishedDefinition || getCanonicalDefinition(definitionId);
      if (!source) return { ok: false, resultCode: "EQUIPMENT_DEFINITION_NOT_FOUND" };
      return {
        ok: true,
        resultCode: "EQUIPMENT_DEFINITION_ARCHIVED",
        record: {
          ...(record || {}),
          definitionId,
          sourceDefinitionId: record?.sourceDefinitionId || definitionId,
          publishedDefinition: { ...normalizeDefinition(source), archived: true },
          draftDefinition: record?.draftDefinition || null,
          archived: true,
          archivedAt: nowIso()
        }
      };
    });
  }

  function restoreDefinition(input = {}) {
    return persistMutation(input, "RESTORE_EQUIPMENT_DEFINITION", ({ record, definitionId }) => {
      if (!record?.publishedDefinition || record.archived !== true) return { ok: false, resultCode: "EQUIPMENT_DEFINITION_NOT_ARCHIVED" };
      return {
        ok: true,
        resultCode: "EQUIPMENT_DEFINITION_RESTORED",
        record: {
          ...record,
          definitionId,
          publishedDefinition: { ...normalizeDefinition(record.publishedDefinition), archived: false },
          archived: false,
          archivedAt: null,
          restoredAt: nowIso()
        }
      };
    });
  }

  function discardDraft(input = {}) {
    return persistMutation(input, "DISCARD_EQUIPMENT_DEFINITION_DRAFT", ({ record }) => {
      if (!record?.draftDefinition) return { ok: false, resultCode: "EQUIPMENT_DEFINITION_DRAFT_NOT_FOUND" };
      if (!record.publishedDefinition) {
        return { ok: true, resultCode: "EQUIPMENT_DEFINITION_DRAFT_DISCARDED", removeRecord: true };
      }
      return {
        ok: true,
        resultCode: "EQUIPMENT_DEFINITION_DRAFT_DISCARDED",
        record: { ...record, draftDefinition: null }
      };
    });
  }

  function previewDefinition(input = {}) {
    const definitionId = normalizeDefinitionId(input.definitionId || input.definition?.id);
    const record = getRecord(definitionId);
    const source = input.definition || record?.draftDefinition || record?.publishedDefinition || getCanonicalDefinition(definitionId);
    if (!source) return { ok: false, status: "FAILED", resultCode: "EQUIPMENT_DEFINITION_NOT_FOUND", definitionId };
    const sourceDefinitionId = normalizeDefinitionId(input.sourceDefinitionId || record?.sourceDefinitionId || "");
    const validation = validateDefinition(source, {
      sourceDefinitionId,
      allowExisting: Boolean(sourceDefinitionId && sourceDefinitionId === definitionId)
    });
    const beforeCount = typeof app.getItemInstances === "function" ? app.getItemInstances({ includeDisposed: true }).length : null;
    const normalized = validation.definition;
    const instancePreview = {
      instanceId: `preview:${normalized.id}`,
      definitionId: normalized.id,
      ownerId: null,
      quantity: 1,
      lifecycleState: "PACKAGED",
      recordState: "ACTIVE",
      location: { type: "VENDOR", vendorId: "ADMIN_CATALOG_PREVIEW" },
      durability: { current: normalized.condition },
      displayName: normalized.name,
      category: normalized.category,
      subtype: normalized.subtype,
      itemType: normalized.itemType,
      footprint: normalized.footprint,
      value: normalized.value,
      legality: normalized.legality,
      tags: clone(normalized.tags || []),
      containerProfile: clone(normalized.containerProfile),
      equipProfile: clone(normalized.equipProfile),
      mountProfile: clone(normalized.mountProfile),
      requirements: {
        subscriptionCategory: normalized.requiresSubscriptionCategory,
        subscriptionTier: normalized.requiresSubscriptionTier
      }
    };
    const afterCount = typeof app.getItemInstances === "function" ? app.getItemInstances({ includeDisposed: true }).length : null;
    return {
      ok: validation.ok,
      status: validation.ok ? "SUCCEEDED" : "FAILED",
      resultCode: validation.ok ? "EQUIPMENT_DEFINITION_INSTANCE_PREVIEW_READY" : validation.resultCode,
      definitionId,
      definition: normalized,
      instancePreview,
      issues: validation.issues,
      persistedItemInstanceCreated: beforeCount != null && afterCount != null ? afterCount !== beforeCount : false
    };
  }

  function getRecords(options = {}) {
    const includeDrafts = options.includeDrafts !== false;
    const includePublished = options.includePublished !== false;
    const includeArchived = options.includeArchived !== false;
    return readStore().records
      .map((record) => ({ ...clone(record), state: getRecordState(record) }))
      .filter((record) => {
        if (record.archived && !includeArchived) return false;
        if (record.draftDefinition && !record.publishedDefinition && !includeDrafts) return false;
        if (record.publishedDefinition && !includePublished) return false;
        return true;
      })
      .sort((a, b) => a.definitionId.localeCompare(b.definitionId));
  }

  function getPublishedDefinitions(options = {}) {
    const includeArchived = options.includeArchived === true;
    return readStore().records
      .filter((record) => record.publishedDefinition && (includeArchived || record.archived !== true))
      .map((record) => ({
        ...clone(record.publishedDefinition),
        id: record.definitionId,
        catalogId: record.definitionId,
        archived: record.archived === true,
        authoringRevision: record.revision,
        authoringSource: "ADMIN_EQUIPMENT_CATALOG_AUTHORING"
      }));
  }

  function buildDataPack(options = {}) {
    const includeDrafts = options.includeDrafts === true;
    const canonicalDefinitions = typeof app.getEquipmentCatalogItems === "function"
      ? app.getEquipmentCatalogItems({ includeArchived: true })
      : [];
    return {
      schemaVersion: PACK_SCHEMA_VERSION,
      generatedAt: nowIso(),
      source: "ADMIN_EQUIPMENT_CATALOG_AUTHORING",
      storeRevision: readStore().revision,
      definitions: clone(canonicalDefinitions),
      aliases: clone(window.APP_DATA?.equipmentDefinitionAliases || {}),
      authoringRecords: includeDrafts ? getRecords({ includeDrafts: true, includePublished: true, includeArchived: true }) : undefined
    };
  }

  function serializeDataPack(pack = buildDataPack()) {
    return `${JSON.stringify(pack, null, 2)}\n`;
  }

  function exportState() {
    return clone(readStore());
  }

  function importState(raw = {}) {
    const normalized = normalizeStore(raw);
    if (raw?.schemaVersion && raw.schemaVersion !== SCHEMA_VERSION) return { ok: false, resultCode: "EQUIPMENT_CATALOG_AUTHORING_SCHEMA_UNSUPPORTED" };
    try {
      writeStore(normalized);
      app.invalidateEquipmentCatalogIndex?.();
      return { ok: true, state: clone(normalized) };
    } catch (_error) {
      return { ok: false, resultCode: "EQUIPMENT_CATALOG_AUTHORING_IMPORT_FAILED" };
    }
  }

  function resetState() {
    try {
      window.localStorage?.removeItem(STORE_KEY);
      app.invalidateEquipmentCatalogIndex?.();
      return { ok: true };
    } catch (_error) {
      return { ok: false, resultCode: "EQUIPMENT_CATALOG_AUTHORING_RESET_FAILED" };
    }
  }

  app.AdminEquipmentCatalogAuthoring = Object.freeze({
    STORE_KEY,
    SCHEMA_VERSION,
    PACK_SCHEMA_VERSION,
    VALID_STATES: [...VALID_STATES],
    normalizeDefinition,
    validateDefinition,
    getRecords,
    getRecord,
    getPublishedDefinitions,
    previewDefinition,
    saveDraft,
    publishDefinition,
    archiveDefinition,
    restoreDefinition,
    discardDraft,
    buildDataPack,
    serializeDataPack,
    exportState,
    importState,
    resetState
  });

  app.getAdminEquipmentDefinitionAuthoringRecords = getRecords;
  app.getAdminEquipmentDefinitionAuthoringRecord = getRecord;
  app.getPublishedEquipmentCatalogDefinitions = getPublishedDefinitions;
  app.validateAdminEquipmentDefinition = validateDefinition;
  app.previewAdminEquipmentDefinitionInstance = previewDefinition;
  app.saveAdminEquipmentDefinitionDraft = saveDraft;
  app.publishAdminEquipmentDefinition = publishDefinition;
  app.archiveAdminEquipmentDefinition = archiveDefinition;
  app.restoreAdminEquipmentDefinition = restoreDefinition;
  app.discardAdminEquipmentDefinitionDraft = discardDraft;
  app.buildAdminEquipmentCatalogDataPack = buildDataPack;
  app.serializeAdminEquipmentCatalogDataPack = serializeDataPack;
  app.exportAdminEquipmentCatalogAuthoringState = exportState;
  app.importAdminEquipmentCatalogAuthoringState = importState;
  app.resetAdminEquipmentCatalogAuthoringState = resetState;

  app.invalidateEquipmentCatalogIndex?.();
})(window.WS_APP);
