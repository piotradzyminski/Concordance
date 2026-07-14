window.WS_APP = window.WS_APP || {};

(function initAdminAuditStore(app) {
  "use strict";

  const STORE_KEY = "ws_admin_audit_store_v2";
  const RECOVERY_KEY = "ws_admin_audit_recovery_v1";
  const LEGACY_KEY = "futureNoir.adminAuditLog.v1";
  const SCHEMA_VERSION = "admin_audit_store_3_0x";
  const EVENT_SCHEMA_VERSION = 1;
  const RESULT_STATUSES = new Set(["SUCCEEDED", "FAILED", "RECOVERY_REQUIRED"]);

  function clone(value) {
    if (value == null) return value;
    if (typeof structuredClone === "function") {
      try { return structuredClone(value); } catch (error) {}
    }
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeString(value = "", fallback = "") {
    return String(value ?? fallback).trim();
  }

  function normalizeToken(value = "", fallback = "") {
    return normalizeString(value, fallback).toUpperCase().replace(/[\s-]+/g, "_") || fallback;
  }

  function stableNormalize(value) {
    if (Array.isArray(value)) return value.map(stableNormalize);
    if (!value || typeof value !== "object") return value;
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableNormalize(value[key]);
      return result;
    }, {});
  }

  function hashPayload(value) {
    const text = JSON.stringify(stableNormalize(value ?? null));
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
  }

  function sanitizeValue(value, depth = 0) {
    if (depth > 4) return "[DEPTH_LIMIT]";
    if (value == null || typeof value === "boolean" || typeof value === "number") return value;
    if (typeof value === "string") return value.length > 1000 ? `${value.slice(0, 997)}...` : value;
    if (Array.isArray(value)) return value.slice(0, 25).map((entry) => sanitizeValue(entry, depth + 1));
    if (typeof value === "object") {
      const output = {};
      Object.keys(value).slice(0, 30).forEach((key) => {
        if (["password", "rawPayload", "fullRecord", "snapshot"].includes(key)) return;
        output[key] = sanitizeValue(value[key], depth + 1);
      });
      return output;
    }
    return normalizeString(value);
  }

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return clone(fallback);
      return JSON.parse(raw);
    } catch (error) {
      return clone(fallback);
    }
  }

  function writeJson(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  }

  function emptyStore() {
    return {
      schemaVersion: SCHEMA_VERSION,
      nextSequence: 1,
      events: []
    };
  }

  function normalizeActor(actor = {}) {
    const current = app.currentUser || {};
    const actorId = normalizeString(actor.actorId || actor.id || actor.login || current.id || current.login);
    const actorRole = normalizeToken(actor.actorRole || actor.role || current.role, "ADMIN");
    const displayName = normalizeString(actor.displayName || actor.name || actor.login || current.displayName || current.login || actorId || "ADMIN");
    return { actorId, actorRole, displayName };
  }

  function inferResultStatus(action = "", explicit = "") {
    const normalizedExplicit = normalizeToken(explicit);
    if (RESULT_STATUSES.has(normalizedExplicit)) return normalizedExplicit;
    const normalizedAction = normalizeToken(action, "ADMIN_EVENT");
    if (normalizedAction.includes("RECOVERY")) return "RECOVERY_REQUIRED";
    if (/(FAILED|BLOCKED|ERROR|INVALID|UNAVAILABLE)$/.test(normalizedAction)) return "FAILED";
    return "SUCCEEDED";
  }

  function normalizeTargetRefs(input = {}) {
    const refs = [];
    const seen = new Set();
    function push(type, id) {
      const normalizedId = normalizeString(id);
      if (!normalizedId) return;
      const normalizedType = normalizeToken(type, "RECORD");
      const key = `${normalizedType}:${normalizedId}`;
      if (seen.has(key)) return;
      seen.add(key);
      refs.push({ type: normalizedType, id: normalizedId });
    }
    (Array.isArray(input.targetRefs) ? input.targetRefs : []).forEach((ref) => push(ref?.type, ref?.id));
    push("CITIZEN", input.citizenId);
    push(input.category || "RECORD", input.recordId);
    if (!refs.length) push(input.category || "SYSTEM", input.target || "SYSTEM");
    return refs;
  }

  function normalizeDomainRefs(input = {}) {
    const source = { ...(input.domainRefs || {}) };
    const metadata = input.metadata || input.meta || {};
    [
      "billingTransactionId",
      "billingIntentId",
      "serviceOrderId",
      "marketOrderId",
      "operationId",
      "itemTransactionId",
      "subscriptionContractId",
      "citizenCommandReceiptId"
    ].forEach((key) => {
      const value = source[key] || metadata?.[key] || input?.[key];
      if (normalizeString(value)) source[key] = normalizeString(value);
    });
    return Object.keys(source).reduce((result, key) => {
      const value = source[key];
      if (value == null || value === "") return result;
      result[key] = sanitizeValue(value);
      return result;
    }, {});
  }

  function normalizeEvent(input = {}, sequence = 0) {
    const sourceCommand = normalizeToken(input.sourceCommand || input.action, "ADMIN_EVENT");
    const category = normalizeToken(input.category, "ADMIN");
    const actor = normalizeActor(input.actor || input.user || {});
    const resultStatus = inferResultStatus(sourceCommand, input.result?.status || input.status);
    const resultCode = normalizeToken(input.result?.resultCode || input.resultCode || sourceCommand, sourceCommand);
    const createdAt = normalizeString(input.createdAt || input.timestamp, new Date().toISOString());
    const idempotencyKey = normalizeString(input.request?.idempotencyKey || input.idempotencyKey);
    const correlationId = normalizeString(input.request?.correlationId || input.correlationId);
    const metadata = sanitizeValue(input.metadata || input.meta || {});
    const auditEventId = normalizeString(input.auditEventId || input.id) || `AAE-${String(sequence).padStart(8, "0")}`;
    const summary = normalizeString(input.summary || input.result?.message || input.message, "Admin event registered.");
    const payloadHash = normalizeString(input.request?.payloadHash) || hashPayload({ sourceCommand, category, summary, metadata });

    return {
      schemaVersion: EVENT_SCHEMA_VERSION,
      auditEventId,
      sequence: Number(sequence) || 0,
      actor,
      workspace: normalizeToken(input.workspace || app.adminActiveWorkspace, "ADMIN"),
      sourceCommand,
      category,
      citizenId: normalizeString(input.citizenId),
      targetRefs: normalizeTargetRefs(input),
      request: {
        idempotencyKey,
        correlationId,
        payloadHash
      },
      result: {
        status: resultStatus,
        resultCode,
        message: normalizeString(input.result?.message || input.message || summary, summary)
      },
      domainRefs: normalizeDomainRefs(input),
      previousRevision: Number.isFinite(Number(input.previousRevision)) ? Number(input.previousRevision) : null,
      nextRevision: Number.isFinite(Number(input.nextRevision)) ? Number(input.nextRevision) : null,
      summary,
      metadata,
      createdAt
    };
  }

  function normalizeStore(raw = {}) {
    const sourceEvents = Array.isArray(raw?.events) ? raw.events : [];
    const byId = new Map();
    sourceEvents.forEach((event, index) => {
      const sequence = Number(event?.sequence) || index + 1;
      const normalized = normalizeEvent(event, sequence);
      if (!byId.has(normalized.auditEventId)) byId.set(normalized.auditEventId, normalized);
    });
    const events = Array.from(byId.values()).sort((a, b) => a.sequence - b.sequence || String(a.createdAt).localeCompare(String(b.createdAt)));
    const maxSequence = events.reduce((max, event) => Math.max(max, Number(event.sequence) || 0), 0);
    return {
      schemaVersion: SCHEMA_VERSION,
      nextSequence: Math.max(Number(raw?.nextSequence) || 1, maxSequence + 1),
      events
    };
  }

  function readStore() {
    return normalizeStore(readJson(STORE_KEY, emptyStore()));
  }

  function readRecoveryQueue() {
    const raw = readJson(RECOVERY_KEY, { schemaVersion: SCHEMA_VERSION, entries: [] });
    return {
      schemaVersion: SCHEMA_VERSION,
      entries: Array.isArray(raw?.entries) ? raw.entries.map((entry) => sanitizeValue(entry)) : []
    };
  }

  function persistRecoveryQueue(queue) {
    if (!queue?.entries?.length) {
      try { window.localStorage.removeItem(RECOVERY_KEY); } catch (error) {}
      return true;
    }
    writeJson(RECOVERY_KEY, queue);
    return true;
  }

  function dispatchRecoveryRequired(detail = {}) {
    try {
      window.dispatchEvent(new CustomEvent("ws:admin-audit-recovery-required", { detail: clone(detail) }));
    } catch (error) {}
  }

  function queueRecovery(event, errorCode = "AUDIT_PERSISTENCE_FAILED") {
    const queue = readRecoveryQueue();
    if (!queue.entries.some((entry) => entry?.event?.auditEventId === event.auditEventId)) {
      queue.entries.push({
        recoveryId: `AAR-${event.auditEventId}`,
        event: clone(event),
        queuedAt: new Date().toISOString(),
        lastErrorCode: normalizeToken(errorCode, "AUDIT_PERSISTENCE_FAILED"),
        retryCount: 0
      });
    }
    let recoveryQueued = false;
    try {
      persistRecoveryQueue(queue);
      recoveryQueued = true;
    } catch (error) {}
    dispatchRecoveryRequired({ event, errorCode, recoveryQueued });
    return recoveryQueued;
  }

  function migrateLegacyStore() {
    const canonicalRaw = window.localStorage.getItem(STORE_KEY);
    if (canonicalRaw != null) return { ok: true, migrated: false, store: readStore() };
    const legacy = readJson(LEGACY_KEY, []);
    if (!Array.isArray(legacy) || !legacy.length) return { ok: true, migrated: false, store: emptyStore() };

    const store = emptyStore();
    legacy.slice().reverse().forEach((record) => {
      const event = normalizeEvent({
        id: record?.id,
        timestamp: record?.timestamp,
        actor: {
          actorId: record?.actor || "LEGACY_ADMIN",
          actorRole: "ADMIN",
          displayName: record?.actor || "ADMIN"
        },
        workspace: record?.workspace,
        category: record?.category,
        action: record?.action,
        target: record?.target,
        summary: record?.summary,
        citizenId: record?.citizenId,
        recordId: record?.recordId,
        metadata: { ...(record?.meta || {}), migratedFrom: LEGACY_KEY }
      }, store.nextSequence);
      store.events.push(event);
      store.nextSequence += 1;
    });

    try {
      writeJson(STORE_KEY, store);
      window.localStorage.removeItem(LEGACY_KEY);
      return { ok: true, migrated: true, count: store.events.length, store: clone(store) };
    } catch (error) {
      return { ok: false, migrated: false, resultCode: "AUDIT_LEGACY_MIGRATION_FAILED", store: emptyStore() };
    }
  }

  function retryAdminAuditRecovery() {
    const queue = readRecoveryQueue();
    if (!queue.entries.length) return { ok: true, recovered: 0, pending: 0 };
    const store = readStore();
    const existingIds = new Set(store.events.map((event) => event.auditEventId));
    let recovered = 0;
    const pending = [];

    queue.entries.forEach((entry) => {
      const event = normalizeEvent(entry.event || {}, Number(entry?.event?.sequence) || store.nextSequence);
      if (existingIds.has(event.auditEventId)) {
        recovered += 1;
        return;
      }
      store.events.push(event);
      existingIds.add(event.auditEventId);
      store.nextSequence = Math.max(store.nextSequence, event.sequence + 1);
      recovered += 1;
    });
    store.events.sort((a, b) => a.sequence - b.sequence);

    try {
      writeJson(STORE_KEY, store);
      persistRecoveryQueue({ schemaVersion: SCHEMA_VERSION, entries: pending });
      return { ok: true, recovered, pending: 0 };
    } catch (error) {
      const nextQueue = {
        schemaVersion: SCHEMA_VERSION,
        entries: queue.entries.map((entry) => ({ ...entry, retryCount: Number(entry.retryCount || 0) + 1 }))
      };
      try { persistRecoveryQueue(nextQueue); } catch (queueError) {}
      return { ok: false, resultCode: "AUDIT_RECOVERY_RETRY_FAILED", recovered: 0, pending: nextQueue.entries.length };
    }
  }

  function appendAdminAuditResult(input = {}, options = {}) {
    const actor = normalizeActor(input.actor || options.actor || options.user || {});
    if (!actor.actorId) return { ok: false, resultCode: "ACTOR_REQUIRED", persistenceConfirmed: false };
    if (actor.actorRole !== "ADMIN") return { ok: false, resultCode: "ADMIN_ROLE_REQUIRED", persistenceConfirmed: false };

    retryAdminAuditRecovery();
    const store = readStore();
    const sourceCommand = normalizeToken(input.sourceCommand || input.action, "ADMIN_EVENT");
    const idempotencyKey = normalizeString(input.request?.idempotencyKey || input.idempotencyKey);
    if (idempotencyKey) {
      const replay = store.events.find((event) => event.sourceCommand === sourceCommand && event.request?.idempotencyKey === idempotencyKey);
      if (replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", event: clone(replay), persistenceConfirmed: true };
    }

    const event = normalizeEvent({ ...input, actor }, store.nextSequence);
    store.events.push(event);
    store.nextSequence += 1;

    try {
      writeJson(STORE_KEY, store);
      try {
        window.dispatchEvent(new CustomEvent("ws:admin-audit-event-appended", { detail: { event: clone(event) } }));
      } catch (error) {}
      return { ok: true, operation: "APPENDED", event: clone(event), persistenceConfirmed: true };
    } catch (error) {
      const recoveryQueued = queueRecovery(event, error?.code || "AUDIT_PERSISTENCE_FAILED");
      return {
        ok: false,
        resultCode: "AUDIT_RECOVERY_REQUIRED",
        event: clone(event),
        persistenceConfirmed: false,
        recoveryQueued
      };
    }
  }

  function getAdminAuditEvents(options = {}) {
    const status = normalizeToken(options.status);
    const category = normalizeToken(options.category);
    const citizenId = normalizeString(options.citizenId);
    const search = normalizeString(options.search).toLowerCase();
    let events = readStore().events.slice().sort((a, b) => b.sequence - a.sequence);
    if (status) events = events.filter((event) => event.result?.status === status);
    if (category) events = events.filter((event) => event.category === category);
    if (citizenId) events = events.filter((event) => event.citizenId === citizenId || event.targetRefs?.some((ref) => ref.type === "CITIZEN" && ref.id === citizenId));
    if (search) {
      events = events.filter((event) => JSON.stringify({
        id: event.auditEventId,
        actor: event.actor,
        command: event.sourceCommand,
        category: event.category,
        result: event.result,
        targetRefs: event.targetRefs,
        domainRefs: event.domainRefs,
        summary: event.summary
      }).toLowerCase().includes(search));
    }
    const limit = Number(options.limit);
    if (Number.isFinite(limit) && limit >= 0) events = events.slice(0, limit);
    return clone(events);
  }

  function getAdminAuditEvent(auditEventId = "") {
    const id = normalizeString(auditEventId);
    const event = readStore().events.find((entry) => entry.auditEventId === id);
    return event ? clone(event) : null;
  }

  function validateAdminAuditState(raw = {}) {
    const errors = [];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) errors.push({ code: "ADMIN_AUDIT_STORE_INVALID" });
    if (raw?.schemaVersion && raw.schemaVersion !== SCHEMA_VERSION) errors.push({ code: "ADMIN_AUDIT_SCHEMA_UNSUPPORTED", received: raw.schemaVersion });
    if (raw?.events != null && !Array.isArray(raw.events)) errors.push({ code: "ADMIN_AUDIT_EVENTS_INVALID" });
    const normalized = normalizeStore(raw || {});
    const sequenceSet = new Set();
    normalized.events.forEach((event) => {
      if (!event.auditEventId) errors.push({ code: "ADMIN_AUDIT_EVENT_ID_REQUIRED" });
      if (sequenceSet.has(event.sequence)) errors.push({ code: "ADMIN_AUDIT_SEQUENCE_DUPLICATE", sequence: event.sequence });
      sequenceSet.add(event.sequence);
      if (!RESULT_STATUSES.has(event.result?.status)) errors.push({ code: "ADMIN_AUDIT_RESULT_STATUS_INVALID", auditEventId: event.auditEventId });
    });
    return { ok: errors.length === 0, errors, state: normalized };
  }

  function importAdminAuditState(raw = {}) {
    const validation = validateAdminAuditState(raw);
    if (!validation.ok) return { ok: false, resultCode: "ADMIN_AUDIT_IMPORT_INVALID", errors: validation.errors };
    try {
      writeJson(STORE_KEY, validation.state);
      return { ok: true, state: clone(validation.state), reloadRequired: false };
    } catch (error) {
      return { ok: false, resultCode: "ADMIN_AUDIT_IMPORT_PERSISTENCE_FAILED" };
    }
  }

  migrateLegacyStore();
  retryAdminAuditRecovery();

  app.ADMIN_AUDIT_STORE_KEYS = Object.freeze({ STORE_KEY, RECOVERY_KEY, LEGACY_KEY });
  app.ADMIN_AUDIT_SCHEMA_VERSION = SCHEMA_VERSION;
  app.appendAdminAuditResult = appendAdminAuditResult;
  app.appendAdminAuditEvent = function appendAdminAuditEvent(event = {}, options = {}) {
    const current = options.user || app.currentUser || {};
    return appendAdminAuditResult({
      actor: event.actor || {
        actorId: current.id || current.login || "",
        actorRole: current.role || "",
        displayName: current.displayName || current.login || "ADMIN"
      },
      workspace: event.workspace || app.adminActiveWorkspace || "ADMIN",
      category: event.category || "ADMIN",
      sourceCommand: event.sourceCommand || event.action || "ADMIN_EVENT",
      citizenId: event.citizenId || "",
      recordId: event.recordId || "",
      target: event.target || event.recordId || event.citizenId || "SYSTEM",
      targetRefs: event.targetRefs,
      request: event.request || {
        idempotencyKey: event.idempotencyKey || event.meta?.idempotencyKey || "",
        correlationId: event.correlationId || event.meta?.correlationId || ""
      },
      result: event.result || {
        status: event.status || event.resultStatus || "",
        resultCode: event.resultCode || event.meta?.resultCode || event.action || "ADMIN_EVENT",
        message: event.message || event.summary || "Admin event registered."
      },
      domainRefs: event.domainRefs || {},
      previousRevision: event.previousRevision,
      nextRevision: event.nextRevision,
      summary: event.summary || event.message || "Admin event registered.",
      metadata: event.metadata || event.meta || {}
    }, { user: current });
  };
  app.getAdminAuditEvents = getAdminAuditEvents;
  app.getAdminAuditEvent = getAdminAuditEvent;
  app.getAdminAuditRecoveryQueue = function getAdminAuditRecoveryQueue() { return clone(readRecoveryQueue().entries); };
  app.retryAdminAuditRecovery = retryAdminAuditRecovery;
  app.exportAdminAuditState = function exportAdminAuditState() { return clone(readStore()); };
  app.validateAdminAuditState = validateAdminAuditState;
  app.importAdminAuditState = importAdminAuditState;
  app.resetAdminAuditState = function resetAdminAuditState() {
    try {
      window.localStorage.removeItem(STORE_KEY);
      window.localStorage.removeItem(RECOVERY_KEY);
      window.localStorage.removeItem(LEGACY_KEY);
      return { ok: true };
    } catch (error) {
      return { ok: false, resultCode: "ADMIN_AUDIT_RESET_FAILED" };
    }
  };
})(window.WS_APP);
