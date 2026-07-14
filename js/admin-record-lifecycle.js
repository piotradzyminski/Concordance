window.WS_APP = window.WS_APP || {};

(function initAdminRecordLifecycleContract() {
  const app = window.WS_APP;
  const STORAGE_KEY = "ws_admin_record_lifecycle_receipts_v1";
  const ACTIONS = Object.freeze(["ARCHIVE", "RESTORE", "DISPOSE", "HARD_DELETE"]);
  const ACTION_SET = new Set(ACTIONS);
  const receipts = new Map();

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function token(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function text(value = "") {
    return String(value || "").trim();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeRecordType(value = "") {
    const normalized = token(value);
    const aliases = {
      ITEM: "ITEM_INSTANCE",
      EQUIPMENT: "ITEM_INSTANCE",
      ENCYCLOPEDIA: "ENCYCLOPEDIA_ENTRY",
      ENTRY: "ENCYCLOPEDIA_ENTRY",
      ADDRESS_RECORD: "ADDRESS",
      CASE: "CASE_FILE",
      SYSTEM: "SYSTEM_RECORD",
      CITIZEN_FILE_RECORD: "CITIZEN_FILE"
    };
    return aliases[normalized] || normalized;
  }

  function actorFrom(input = {}) {
    const source = input.actor && typeof input.actor === "object" ? input.actor : app.currentUser || {};
    return {
      actorId: text(source.actorId || source.id || source.login),
      actorRole: token(source.actorRole || source.role),
      displayName: text(source.displayName || source.login || source.actorId || source.id || "ADMIN")
    };
  }

  function isAdmin(actor = {}) {
    return token(actor.actorRole) === "ADMIN";
  }

  function readReceipts() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      (Array.isArray(parsed) ? parsed : []).forEach((receipt) => {
        const key = text(receipt?.idempotencyKey);
        if (key) receipts.set(key, receipt);
      });
    } catch (error) {
      console.warn("W&S record lifecycle receipts could not be read.", error);
    }
  }

  function writeReceipts() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...receipts.values()].slice(-1000)));
      return true;
    } catch (error) {
      console.warn("W&S record lifecycle receipts could not be written.", error);
      return false;
    }
  }

  function getRecordRevision(record = {}) {
    return Number(record?.recordLifecycle?.revision ?? record?.lifecycleRevision ?? 0) || 0;
  }

  function getRecordState(recordType, record = {}) {
    const type = normalizeRecordType(recordType);
    if (type === "ITEM_INSTANCE") {
      if (token(record.lifecycleState) === "DISPOSED" || token(record.location?.type) === "DESTROYED") return "DISPOSED";
      return token(record.recordState || (record.archived === true ? "ARCHIVED" : "ACTIVE")) === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
    }
    if (type === "CITIZEN") return token(record.recordState || "ACTIVE");
    return record.archived === true || token(record.status) === "ARCHIVED" || token(record.recordState) === "ARCHIVED"
      ? "ARCHIVED"
      : "ACTIVE";
  }

  function makeLifecycle(record = {}, action, actor, note, resultCode) {
    const current = record.recordLifecycle && typeof record.recordLifecycle === "object" ? record.recordLifecycle : {};
    const history = Array.isArray(current.history) ? current.history : [];
    const revision = getRecordRevision(record) + 1;
    const event = {
      action,
      resultCode,
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      note,
      revision,
      at: nowIso()
    };
    return {
      ...clone(current),
      revision,
      updatedAt: event.at,
      history: [...history, event].slice(-250)
    };
  }

  function getAdapter(recordType) {
    const type = normalizeRecordType(recordType);
    const adapters = {
      ITEM_INSTANCE: {
        get: (id) => app.getItemInstanceById?.(id),
        update: (id, patch, options) => app.updateItemInstance?.(id, patch, options),
        remove: (id, options) => app.removeItemInstance?.(id, options)
      },
      ENCYCLOPEDIA_ENTRY: {
        get: (id) => app.getEntryById?.(id),
        update: (id, patch) => app.updateEntry?.(id, patch),
        remove: (id) => app.deleteEntry?.(id)
      },
      ADDRESS: {
        get: (id) => app.getAddressById?.(id),
        update: (id, patch) => app.updateAddress?.(id, patch),
        remove: (id) => app.deleteAddress?.(id)
      },
      CASE_FILE: {
        get: (id) => app.getCaseFileById?.(id),
        update: (id, patch) => app.updateCaseFile?.(id, patch),
        remove: (id) => app.deleteCaseFile?.(id)
      },
      SYSTEM_RECORD: {
        get: (id) => app.getSystemRecordById?.(id),
        update: (id, patch) => app.updateSystemRecord?.(id, patch),
        remove: (id) => app.deleteSystemRecord?.(id)
      },
      CITIZEN_FILE: {
        get: (id) => app.getCitizenFileById?.(id, { enforceAccess: false }),
        update: (id, patch, options) => app.updateCitizenFile?.(id, patch, options),
        remove: (id, options) => app.deleteCitizenFile?.(id, options)
      }
    };
    return adapters[type] || null;
  }

  function makeResult(input = {}, values = {}) {
    const actor = actorFrom(input);
    const recordType = normalizeRecordType(input.recordType);
    const action = token(input.action);
    const recordId = text(input.recordId);
    return {
      ok: values.ok === true,
      status: values.status || (values.ok ? "SUCCEEDED" : "FAILED"),
      resultCode: values.resultCode || "ADMIN_RECORD_LIFECYCLE_FAILED",
      message: values.message || "",
      recordType,
      recordId,
      action,
      actor,
      correlationId: text(input.correlationId || `record-lifecycle:${recordType}:${recordId}:${Date.now()}`),
      idempotencyKey: text(input.idempotencyKey),
      revisionBefore: Number(values.revisionBefore || 0),
      revisionAfter: Number(values.revisionAfter || values.revisionBefore || 0),
      stateBefore: values.stateBefore || "",
      stateAfter: values.stateAfter || values.stateBefore || "",
      preview: values.preview ? clone(values.preview) : null,
      record: values.record ? clone(values.record) : null,
      replayed: values.replayed === true,
      generatedAt: nowIso()
    };
  }

  function audit(result, note = "") {
    if (typeof app.appendAdminAuditResult !== "function") return null;
    return app.appendAdminAuditResult({
      actor: result.actor,
      workspace: app.adminActiveWorkspace || "RECORDS",
      category: "RECORD_LIFECYCLE",
      sourceCommand: `RECORD_${result.action}`,
      recordId: result.recordId,
      target: result.recordId,
      targetRefs: [{ type: result.recordType, id: result.recordId }],
      request: {
        idempotencyKey: result.idempotencyKey,
        correlationId: result.correlationId
      },
      result: {
        status: result.status,
        resultCode: result.resultCode,
        message: result.message || `${result.action} ${result.recordType} ${result.recordId}.`
      },
      domainRefs: {
        recordType: result.recordType,
        recordId: result.recordId
      },
      previousRevision: result.revisionBefore,
      nextRevision: result.revisionAfter,
      summary: result.message || `${result.action} ${result.recordType} ${result.recordId}.`,
      metadata: {
        operatorNote: note,
        stateBefore: result.stateBefore,
        stateAfter: result.stateAfter,
        dependencyCounts: result.preview?.counts || null
      }
    }, { user: app.currentUser });
  }

  function previewAdminRecordLifecycle(input = {}) {
    const actor = actorFrom(input);
    const recordType = normalizeRecordType(input.recordType);
    const recordId = text(input.recordId);
    const action = token(input.action);
    const adapter = getAdapter(recordType);
    if (!isAdmin(actor)) return makeResult(input, { ok: false, resultCode: "ADMIN_ROLE_REQUIRED", message: "Admin role is required." });
    if (!recordId) return makeResult(input, { ok: false, resultCode: "RECORD_ID_REQUIRED", message: "Record ID is required." });
    if (!ACTION_SET.has(action)) return makeResult(input, { ok: false, resultCode: "RECORD_LIFECYCLE_ACTION_INVALID", message: "Unsupported lifecycle action." });
    if (!adapter?.get) return makeResult(input, { ok: false, resultCode: "RECORD_LIFECYCLE_ADAPTER_MISSING", message: `No lifecycle adapter for ${recordType}.` });
    const record = adapter.get(recordId);
    if (!record) return makeResult(input, { ok: false, resultCode: "RECORD_NOT_FOUND", message: `${recordType} ${recordId} was not found.` });
    const stateBefore = getRecordState(recordType, record);
    const revisionBefore = getRecordRevision(record);
    const expectedRevision = input.expectedRevision;
    if (expectedRevision !== undefined && expectedRevision !== null && Number(expectedRevision) !== revisionBefore) {
      return makeResult(input, {
        ok: false,
        resultCode: "RECORD_LIFECYCLE_REVISION_CONFLICT",
        message: `Expected lifecycle revision ${Number(expectedRevision)}, actual ${revisionBefore}.`,
        revisionBefore,
        stateBefore
      });
    }

    const validState = (action === "ARCHIVE" && stateBefore === "ACTIVE")
      || (action === "RESTORE" && stateBefore === "ARCHIVED")
      || (action === "DISPOSE" && recordType === "ITEM_INSTANCE" && stateBefore === "ACTIVE")
      || (action === "HARD_DELETE" && ["ARCHIVED", "DISPOSED"].includes(stateBefore));
    if (!validState) {
      return makeResult(input, {
        ok: false,
        resultCode: "RECORD_LIFECYCLE_TRANSITION_INVALID",
        message: `${action} is not allowed from ${stateBefore}.`,
        revisionBefore,
        stateBefore
      });
    }

    let dependencyPreview = null;
    if (recordType === "ITEM_INSTANCE") {
      dependencyPreview = app.previewItemInstanceAdminDependencies?.(recordId, { action }) || null;
    } else {
      dependencyPreview = app.previewAdminRecordDependencies?.(recordType, recordId, { action }) || null;
    }
    if (!dependencyPreview) {
      dependencyPreview = {
        ok: true,
        blocked: false,
        blockers: [],
        warnings: [],
        information: [],
        dependencies: [],
        counts: { blockers: 0, warnings: 0, information: 0, total: 0 }
      };
    }
    if (dependencyPreview.ok === false) {
      return makeResult(input, {
        ok: false,
        resultCode: "RECORD_DEPENDENCY_PREVIEW_FAILED",
        message: dependencyPreview.reason || "Dependency preview failed.",
        revisionBefore,
        stateBefore,
        preview: dependencyPreview
      });
    }
    const actionRequiresClearActiveDependencies = action === "DISPOSE"
      || action === "HARD_DELETE"
      || (action === "ARCHIVE" && recordType === "ITEM_INSTANCE");
    const blockedByActive = actionRequiresClearActiveDependencies && dependencyPreview.blocked === true;
    const blockedByHistorical = action === "HARD_DELETE" && Number(dependencyPreview.counts?.warnings || 0) > 0;
    const allowed = !blockedByActive && !blockedByHistorical;
    return makeResult(input, {
      ok: allowed,
      resultCode: allowed ? "RECORD_LIFECYCLE_PREVIEW_CLEAR" : "RECORD_LIFECYCLE_DEPENDENCY_BLOCKED",
      message: allowed ? `${action} preview is clear.` : `${action} is blocked by dependencies.`,
      revisionBefore,
      stateBefore,
      stateAfter: action === "ARCHIVE" ? "ARCHIVED" : action === "RESTORE" ? "ACTIVE" : action === "DISPOSE" ? "DISPOSED" : "DELETED",
      preview: dependencyPreview
    });
  }

  function executeAdminRecordLifecycle(input = {}) {
    const idempotencyKey = text(input.idempotencyKey);
    const action = token(input.action);
    const signature = `${normalizeRecordType(input.recordType)}|${text(input.recordId)}|${action}`;
    if (!idempotencyKey) return makeResult(input, { ok: false, resultCode: "IDEMPOTENCY_KEY_REQUIRED", message: "Idempotency key is required." });
    const existing = receipts.get(idempotencyKey);
    if (existing) {
      if (existing.signature !== signature) return makeResult(input, { ok: false, resultCode: "RECORD_LIFECYCLE_IDEMPOTENCY_CONFLICT", message: "Idempotency key was used for another lifecycle command." });
      return { ...clone(existing.result), replayed: true };
    }

    const actor = actorFrom(input);
    if (!isAdmin(actor)) {
      const result = makeResult(input, { ok: false, resultCode: "ADMIN_ROLE_REQUIRED", message: "Admin role is required." });
      audit(result, "");
      return result;
    }
    const operatorNote = text(input.operatorNote || input.reason);
    if (!operatorNote) {
      const result = makeResult(input, { ok: false, resultCode: "OPERATOR_NOTE_REQUIRED", message: "Operator note is required." });
      audit(result, operatorNote);
      return result;
    }
    if (["DISPOSE", "HARD_DELETE"].includes(action) && text(input.typedConfirmation) !== text(input.recordId)) {
      const result = makeResult(input, { ok: false, resultCode: "RECORD_LIFECYCLE_CONFIRMATION_MISMATCH", message: "Typed record ID does not match." });
      audit(result, operatorNote);
      return result;
    }

    const preview = previewAdminRecordLifecycle(input);
    if (!preview.ok) {
      audit(preview, operatorNote);
      return preview;
    }
    const adapter = getAdapter(preview.recordType);
    const current = adapter.get(preview.recordId);
    if (!current) {
      const result = makeResult(input, { ok: false, resultCode: "RECORD_NOT_FOUND", message: "Record disappeared before commit.", preview: preview.preview });
      audit(result, operatorNote);
      return result;
    }
    const resultCode = `RECORD_${action}_COMPLETED`;
    const recordLifecycle = makeLifecycle(current, action, actor, operatorNote, resultCode);
    let commit = null;
    if (action === "ARCHIVE") {
      if (preview.recordType === "ITEM_INSTANCE") {
        commit = adapter.update(preview.recordId, {
          ...clone(current),
          recordState: "ARCHIVED",
          archivedAt: nowIso(),
          archivedBy: actor.actorId,
          archiveReason: operatorNote,
          recordLifecycle
        }, { source: "ADMIN_RECORD_ARCHIVE" });
      } else {
        commit = adapter.update(preview.recordId, {
          archived: true,
          recordState: "ARCHIVED",
          previousStatus: token(current.status) === "ARCHIVED" ? (text(current.previousStatus) || "ACTIVE") : current.status,
          archivedAt: nowIso(),
          archivedBy: actor.actorId,
          archiveReason: operatorNote,
          recordLifecycle
        }, { actor: app.currentUser, expectedRevision: current.revision });
      }
    } else if (action === "RESTORE") {
      if (preview.recordType === "ITEM_INSTANCE") {
        commit = adapter.update(preview.recordId, {
          ...clone(current),
          recordState: "ACTIVE",
          archivedAt: "",
          archivedBy: "",
          archiveReason: "",
          recordLifecycle
        }, { source: "ADMIN_RECORD_RESTORE" });
      } else {
        commit = adapter.update(preview.recordId, {
          archived: false,
          recordState: "ACTIVE",
          archivedAt: "",
          archivedBy: "",
          archiveReason: "",
          status: token(current.status) === "ARCHIVED" ? (text(current.previousStatus) || "ACTIVE") : current.status,
          recordLifecycle
        }, { actor: app.currentUser, expectedRevision: current.revision });
      }
    } else if (action === "DISPOSE") {
      commit = adapter.update(preview.recordId, {
        ...clone(current),
        recordState: "ACTIVE",
        lifecycleState: "DISPOSED",
        location: { type: "DESTROYED" },
        disposedAt: nowIso(),
        disposedBy: actor.actorId,
        disposeReason: operatorNote,
        recordLifecycle
      }, { source: "ADMIN_RECORD_DISPOSE" });
    } else if (action === "HARD_DELETE") {
      commit = adapter.remove(preview.recordId, { actor: app.currentUser, source: "ADMIN_RECORD_HARD_DELETE" });
    }

    const commitOk = action === "HARD_DELETE"
      ? commit === true || commit?.ok === true
      : Boolean(commit && (commit.ok === true || (typeof commit === "object" && commit.ok === undefined)));
    if (!commitOk) {
      const result = makeResult(input, {
        ok: false,
        status: "RECOVERY_REQUIRED",
        resultCode: "RECORD_LIFECYCLE_COMMIT_FAILED",
        message: `${action} failed during commit.`,
        revisionBefore: preview.revisionBefore,
        stateBefore: preview.stateBefore,
        preview: preview.preview
      });
      audit(result, operatorNote);
      return result;
    }

    const updated = action === "HARD_DELETE" ? null : adapter.get(preview.recordId);
    const result = makeResult(input, {
      ok: true,
      resultCode,
      message: `${action} completed for ${preview.recordType} ${preview.recordId}.`,
      revisionBefore: preview.revisionBefore,
      revisionAfter: action === "HARD_DELETE" ? preview.revisionBefore + 1 : getRecordRevision(updated || current),
      stateBefore: preview.stateBefore,
      stateAfter: action === "ARCHIVE" ? "ARCHIVED" : action === "RESTORE" ? "ACTIVE" : action === "DISPOSE" ? "DISPOSED" : "DELETED",
      preview: preview.preview,
      record: updated
    });
    receipts.set(idempotencyKey, { idempotencyKey, signature, result: clone(result), createdAt: nowIso() });
    writeReceipts();
    audit(result, operatorNote);
    window.dispatchEvent(new CustomEvent("ws:admin-record-lifecycle-updated", { detail: clone(result) }));
    return result;
  }


  function requestAdminRecordLifecycleAction(options = {}) {
    const action = token(options.action);
    const recordId = text(options.recordId);
    const label = text(options.label || `${options.recordType || "RECORD"} ${recordId}`);
    const operatorNote = text(window.prompt?.(`Operator note for ${action.toLowerCase()} ${label}:`, options.defaultNote || "") || "");
    if (!operatorNote) return makeResult(options, { ok: false, resultCode: "OPERATOR_NOTE_REQUIRED", message: "Operator note is required." });
    let typedConfirmation = "";
    if (["DISPOSE", "HARD_DELETE"].includes(action)) {
      typedConfirmation = text(window.prompt?.(`Type the exact record ID to ${action.toLowerCase()}:\n${recordId}`, "") || "");
    }
    return executeAdminRecordLifecycle({
      ...options,
      action,
      recordId,
      actor: options.actor || app.currentUser,
      operatorNote,
      typedConfirmation,
      expectedRevision: options.expectedRevision,
      idempotencyKey: options.idempotencyKey || `record-${action.toLowerCase()}:${normalizeRecordType(options.recordType)}:${recordId}:${Date.now()}`
    });
  }

  function summarizeRecordLifecyclePreview(preview = {}) {
    if (!preview || preview.ok === false) return preview?.message || preview?.resultCode || "Lifecycle preview failed.";
    const counts = preview.preview?.counts || preview.counts || {};
    const lines = [
      `${preview.action || "ACTION"} ${preview.recordType || "RECORD"} ${preview.recordId || ""}`.trim(),
      `State: ${preview.stateBefore || "UNKNOWN"} → ${preview.stateAfter || "UNKNOWN"}`,
      `Blockers: ${Number(counts.blockers || 0)}`,
      `Warnings: ${Number(counts.warnings || 0)}`,
      `Information: ${Number(counts.information || counts.info || 0)}`
    ];
    const dependencies = preview.preview?.dependencies || preview.dependencies || [];
    dependencies.slice(0, 12).forEach((entry) => lines.push(`${entry.severity}: ${entry.domain} / ${entry.recordId} / ${entry.code}`));
    if (dependencies.length > 12) lines.push(`... ${dependencies.length - 12} more`);
    return lines.join("\n");
  }

  readReceipts();

  Object.assign(app, {
    ADMIN_RECORD_LIFECYCLE_ACTIONS: ACTIONS,
    normalizeAdminRecordType: normalizeRecordType,
    getAdminRecordLifecycleState: getRecordState,
    getAdminRecordLifecycleRevision: getRecordRevision,
    previewAdminRecordLifecycle,
    executeAdminRecordLifecycle,
    requestAdminRecordLifecycleAction,
    summarizeAdminRecordLifecyclePreview: summarizeRecordLifecyclePreview
  });
})();
