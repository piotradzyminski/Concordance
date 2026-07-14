"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function loadCampaignDataIo(runtime) {
  runtime.loadMany([
    "js/admin-audit-store.js",
    "js/campaign-data-io-registry.js",
    "js/campaign-data-io-adapters.js",
    "js/campaign-data-io-v6.js"
  ]);
}

test("Campaign Snapshot v6 restores the exact pre-import state after a late commit failure", () => {
  const runtime = createBrowserRuntime({
    storageSeed: {
      ws_app_citizens_v1: JSON.stringify([{ id: "target-citizen", revision: 1 }]),
      ws_app_terminal_entries_v1: JSON.stringify([{ id: "target-notification", revision: 1 }])
    }
  });
  loadCampaignDataIo(runtime);
  const targetSnapshot = runtime.window.WS_APP.exportCampaignSnapshotV6({ flush: false });

  runtime.storage.setItem("ws_app_citizens_v1", JSON.stringify([{ id: "current-citizen", revision: 9 }]));
  runtime.storage.setItem("ws_app_terminal_entries_v1", JSON.stringify([{ id: "current-notification", revision: 8 }]));
  runtime.storage.setItem("ws_admin_audit_store_v2", JSON.stringify({
    schemaVersion: "admin_audit_store_3_0x",
    nextSequence: 2,
    events: [{ auditEventId: "current-audit", sequence: 1, actor: { actorId: "admin", actorRole: "ADMIN", displayName: "Admin" }, workspace: "ADMIN", sourceCommand: "CURRENT", category: "ADMIN", citizenId: "", targetRefs: [{ type: "SYSTEM", id: "SYSTEM" }], request: { idempotencyKey: "", correlationId: "", payloadHash: "fnv1a32:0" }, result: { status: "SUCCEEDED", resultCode: "CURRENT", message: "Current" }, domainRefs: {}, previousRevision: null, nextRevision: null, summary: "Current", metadata: {}, createdAt: "2109-02-13T12:00:00.000Z" }]
  }));
  const preImportState = runtime.storage.snapshot();

  const result = runtime.window.WS_APP.importCampaignSnapshotV6(targetSnapshot, { failCommitDomainId: "terminal-runtime" });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "SNAPSHOT_COMMIT_FAILED");
  assert.equal(result.error.rolledBack, true);

  const postRollbackState = runtime.storage.snapshot();
  for (const [key, value] of Object.entries(preImportState)) {
    if (key === "ws_app_last_import_backup_v6") continue;
    assert.equal(postRollbackState[key], value, `Rollback mismatch for ${key}`);
  }
  assert.equal(JSON.parse(runtime.storage.getItem("ws_app_citizens_v1"))[0].id, "current-citizen");
  assert.equal(JSON.parse(runtime.storage.getItem("ws_app_terminal_entries_v1"))[0].id, "current-notification");
});
