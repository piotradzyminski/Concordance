"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createGenericRuntime() {
  let entry = { id: "entry-a", title: "Entry A", archived: false };
  const audits = [];
  const runtime = createBrowserRuntime({
    wsApp: {
      currentUser: { login: "admin", role: "admin" },
      getEntryById(id) { return id === entry?.id ? structuredClone(entry) : null; },
      updateEntry(id, patch) {
        if (!entry || id !== entry.id) return null;
        entry = { ...entry, ...structuredClone(patch), id: entry.id };
        return structuredClone(entry);
      },
      deleteEntry(id) {
        if (!entry || id !== entry.id) return false;
        entry = null;
        return true;
      },
      previewAdminRecordDependencies(recordType, recordId) {
        return {
          ok: true,
          subjectType: recordType,
          subjectId: recordId,
          blocked: false,
          blockers: [],
          warnings: [],
          information: [],
          dependencies: [],
          counts: { blockers: 0, warnings: 0, information: 0, total: 0 }
        };
      },
      appendAdminAuditResult(payload) { audits.push(payload); return { ok: true, event: payload }; }
    }
  });
  runtime.load("js/admin-record-lifecycle.js");
  return { runtime, audits, getEntry: () => entry };
}

test("Record lifecycle archives, restores and hard deletes through one command boundary", () => {
  const { runtime, audits, getEntry } = createGenericRuntime();
  const app = runtime.window.WS_APP;

  const archived = app.executeAdminRecordLifecycle({
    recordType: "ENCYCLOPEDIA_ENTRY",
    recordId: "entry-a",
    action: "ARCHIVE",
    actor: app.currentUser,
    operatorNote: "Archive obsolete term",
    expectedRevision: 0,
    idempotencyKey: "archive-entry-a"
  });
  assert.equal(archived.ok, true);
  assert.equal(archived.stateAfter, "ARCHIVED");
  assert.equal(getEntry().archived, true);
  assert.equal(getEntry().recordLifecycle.revision, 1);

  const replay = app.executeAdminRecordLifecycle({
    recordType: "ENCYCLOPEDIA_ENTRY",
    recordId: "entry-a",
    action: "ARCHIVE",
    actor: app.currentUser,
    operatorNote: "Repeated",
    expectedRevision: 0,
    idempotencyKey: "archive-entry-a"
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.replayed, true);
  assert.equal(getEntry().recordLifecycle.revision, 1);

  const restored = app.executeAdminRecordLifecycle({
    recordType: "ENCYCLOPEDIA_ENTRY",
    recordId: "entry-a",
    action: "RESTORE",
    actor: app.currentUser,
    operatorNote: "Restore term",
    expectedRevision: 1,
    idempotencyKey: "restore-entry-a"
  });
  assert.equal(restored.ok, true);
  assert.equal(getEntry().archived, false);
  assert.equal(getEntry().recordLifecycle.revision, 2);

  const activeDelete = app.executeAdminRecordLifecycle({
    recordType: "ENCYCLOPEDIA_ENTRY",
    recordId: "entry-a",
    action: "HARD_DELETE",
    actor: app.currentUser,
    operatorNote: "Delete active term",
    typedConfirmation: "entry-a",
    expectedRevision: 2,
    idempotencyKey: "delete-active-entry-a"
  });
  assert.equal(activeDelete.ok, false);
  assert.equal(activeDelete.resultCode, "RECORD_LIFECYCLE_TRANSITION_INVALID");

  app.executeAdminRecordLifecycle({
    recordType: "ENCYCLOPEDIA_ENTRY",
    recordId: "entry-a",
    action: "ARCHIVE",
    actor: app.currentUser,
    operatorNote: "Archive before delete",
    expectedRevision: 2,
    idempotencyKey: "archive-entry-a-2"
  });
  const deleted = app.executeAdminRecordLifecycle({
    recordType: "ENCYCLOPEDIA_ENTRY",
    recordId: "entry-a",
    action: "HARD_DELETE",
    actor: app.currentUser,
    operatorNote: "Permanent removal",
    typedConfirmation: "entry-a",
    expectedRevision: 3,
    idempotencyKey: "delete-entry-a"
  });
  assert.equal(deleted.ok, true);
  assert.equal(deleted.stateAfter, "DELETED");
  assert.equal(getEntry(), null);
  assert.ok(audits.length >= 5);
});

test("Hard delete is blocked by historical warnings", () => {
  const { runtime } = createGenericRuntime();
  const app = runtime.window.WS_APP;
  app.previewAdminRecordDependencies = () => ({
    ok: true,
    blocked: false,
    blockers: [],
    warnings: [{ severity: "WARNING", domain: "SYSTEM", recordId: "system-a", code: "HISTORICAL_RECORD_REFERENCE" }],
    information: [],
    dependencies: [{ severity: "WARNING", domain: "SYSTEM", recordId: "system-a", code: "HISTORICAL_RECORD_REFERENCE" }],
    counts: { blockers: 0, warnings: 1, information: 0, total: 1 }
  });
  app.executeAdminRecordLifecycle({
    recordType: "ENCYCLOPEDIA_ENTRY",
    recordId: "entry-a",
    action: "ARCHIVE",
    actor: app.currentUser,
    operatorNote: "Archive",
    expectedRevision: 0,
    idempotencyKey: "warning-archive"
  });
  const result = app.executeAdminRecordLifecycle({
    recordType: "ENCYCLOPEDIA_ENTRY",
    recordId: "entry-a",
    action: "HARD_DELETE",
    actor: app.currentUser,
    operatorNote: "Delete",
    typedConfirmation: "entry-a",
    expectedRevision: 1,
    idempotencyKey: "warning-delete"
  });
  assert.equal(result.ok, false);
  assert.equal(result.resultCode, "RECORD_LIFECYCLE_DEPENDENCY_BLOCKED");
});

test("ItemInstance archive preserves physical state while dispose destroys the item", () => {
  const runtime = createBrowserRuntime({
    wsApp: {
      currentUser: { login: "admin", role: "admin" },
      previewItemInstanceAdminDependencies() {
        return { ok: true, blocked: false, blockers: [], warnings: [], information: [], dependencies: [], counts: { blockers: 0, warnings: 0, information: 0, total: 0 } };
      },
      appendAdminAuditResult() { return { ok: true }; }
    },
    appData: { equipmentCatalog: [] }
  });
  runtime.loadMany(["js/store-utils.js", "js/item-instance-store.js", "js/admin-record-lifecycle.js"]);
  const app = runtime.window.WS_APP;
  const created = app.createItemInstance({
    instanceId: "item-life-1",
    definitionId: "custom:item-life-1",
    ownerId: "citizen-a",
    lifecycleState: "STORED",
    location: { type: "UNPLACED", characterId: "citizen-a" }
  }, { source: "TEST" });
  assert.equal(created.ok, true);

  const archived = app.executeAdminRecordLifecycle({
    recordType: "ITEM_INSTANCE",
    recordId: "item-life-1",
    action: "ARCHIVE",
    actor: app.currentUser,
    operatorNote: "Hide from active registry",
    expectedRevision: 0,
    idempotencyKey: "item-archive"
  });
  assert.equal(archived.ok, true);
  const archivedItem = app.getItemInstanceById("item-life-1");
  assert.equal(archivedItem.recordState, "ARCHIVED");
  assert.equal(archivedItem.lifecycleState, "STORED");
  assert.equal(archivedItem.location.type, "UNPLACED");

  app.executeAdminRecordLifecycle({
    recordType: "ITEM_INSTANCE",
    recordId: "item-life-1",
    action: "RESTORE",
    actor: app.currentUser,
    operatorNote: "Return to active registry",
    expectedRevision: 1,
    idempotencyKey: "item-restore"
  });
  const disposed = app.executeAdminRecordLifecycle({
    recordType: "ITEM_INSTANCE",
    recordId: "item-life-1",
    action: "DISPOSE",
    actor: app.currentUser,
    operatorNote: "Physical disposal",
    typedConfirmation: "item-life-1",
    expectedRevision: 2,
    idempotencyKey: "item-dispose"
  });
  assert.equal(disposed.ok, true);
  const disposedItem = app.getItemInstanceById("item-life-1");
  assert.equal(disposedItem.lifecycleState, "DISPOSED");
  assert.equal(disposedItem.location.type, "DESTROYED");
});

test("Generic dependency preview classifies active references as blockers and archived references as warnings", () => {
  const runtime = createBrowserRuntime({
    wsApp: {
      getEntries() {
        return [
          { id: "entry-target", archived: false },
          { id: "entry-active-ref", relatedTerms: ["entry-target"], archived: false },
          { id: "entry-archived-ref", relatedTerms: ["entry-target"], archived: true }
        ];
      },
      getSystemRecords() { return []; },
      getAddresses() { return []; },
      getCaseFiles() { return []; },
      getCitizenFiles() { return []; }
    }
  });
  runtime.load("js/admin-dependency-resolver.js");
  const preview = runtime.window.WS_APP.previewAdminRecordDependencies("ENCYCLOPEDIA_ENTRY", "entry-target", { action: "HARD_DELETE" });
  assert.equal(preview.ok, true);
  assert.equal(preview.counts.blockers, 1);
  assert.equal(preview.counts.warnings, 1);
  assert.equal(preview.blocked, true);
});

test("Generic archive remains reversible and does not break active structured references", () => {
  const { runtime, getEntry } = createGenericRuntime();
  const app = runtime.window.WS_APP;
  app.previewAdminRecordDependencies = () => ({
    ok: true,
    blocked: true,
    blockers: [{ severity: "BLOCKER", domain: "SYSTEM", recordId: "system-active", code: "ACTIVE_RECORD_REFERENCE" }],
    warnings: [],
    information: [],
    dependencies: [{ severity: "BLOCKER", domain: "SYSTEM", recordId: "system-active", code: "ACTIVE_RECORD_REFERENCE" }],
    counts: { blockers: 1, warnings: 0, information: 0, total: 1 }
  });
  const result = app.executeAdminRecordLifecycle({
    recordType: "ENCYCLOPEDIA_ENTRY",
    recordId: "entry-a",
    action: "ARCHIVE",
    actor: app.currentUser,
    operatorNote: "Archive while retaining stable references",
    expectedRevision: 0,
    idempotencyKey: "archive-with-active-reference"
  });
  assert.equal(result.ok, true);
  assert.equal(getEntry().archived, true);
});

test("Lifecycle boundary rejects non-admin actors before mutation", () => {
  const { runtime, getEntry } = createGenericRuntime();
  const result = runtime.window.WS_APP.executeAdminRecordLifecycle({
    recordType: "ENCYCLOPEDIA_ENTRY",
    recordId: "entry-a",
    action: "ARCHIVE",
    actor: { actorId: "citizen-user", actorRole: "CITIZEN" },
    operatorNote: "Unauthorized archive",
    expectedRevision: 0,
    idempotencyKey: "unauthorized-archive"
  });
  assert.equal(result.ok, false);
  assert.equal(result.resultCode, "ADMIN_ROLE_REQUIRED");
  assert.equal(getEntry().archived, false);
});

test("Failed adapter result is not treated as a successful lifecycle commit", () => {
  let entry = { id: "entry-fail", title: "Entry Fail", archived: false };
  const runtime = createBrowserRuntime({
    wsApp: {
      currentUser: { login: "admin", role: "admin" },
      getEntryById(id) { return id === entry.id ? structuredClone(entry) : null; },
      updateEntry() { return { ok: false, resultCode: "STORE_WRITE_FAILED" }; },
      previewAdminRecordDependencies() {
        return { ok: true, blocked: false, blockers: [], warnings: [], information: [], dependencies: [], counts: { blockers: 0, warnings: 0, information: 0, total: 0 } };
      },
      appendAdminAuditResult() { return { ok: true }; }
    }
  });
  runtime.load("js/admin-record-lifecycle.js");
  const result = runtime.window.WS_APP.executeAdminRecordLifecycle({
    recordType: "ENCYCLOPEDIA_ENTRY",
    recordId: "entry-fail",
    action: "ARCHIVE",
    actor: runtime.window.WS_APP.currentUser,
    operatorNote: "Force adapter failure",
    expectedRevision: 0,
    idempotencyKey: "adapter-failure"
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "RECOVERY_REQUIRED");
  assert.equal(result.resultCode, "RECORD_LIFECYCLE_COMMIT_FAILED");
  assert.equal(entry.archived, false);
});
