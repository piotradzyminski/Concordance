"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function makeRuntime(storageSeed = {}) {
  return createBrowserRuntime({
    storageSeed,
    wsApp: {
      currentUser: {
        id: "admin-user",
        login: "admin",
        displayName: "Admin Operator",
        role: "admin"
      }
    }
  });
}

test("Admin Audit Store migrates the legacy newest-first array into ordered canonical events", () => {
  const runtime = makeRuntime({
    "futureNoir.adminAuditLog.v1": JSON.stringify([
      { id: "AUD-2", timestamp: "2109-02-13T12:02:00.000Z", actor: "Admin", workspace: "billing", category: "BILLING", action: "SECOND", target: "citizen-a", summary: "Second" },
      { id: "AUD-1", timestamp: "2109-02-13T12:01:00.000Z", actor: "Admin", workspace: "citizens", category: "CITIZEN", action: "FIRST", target: "citizen-a", summary: "First" }
    ])
  });

  runtime.load("js/admin-audit-store.js");

  const events = runtime.window.WS_APP.getAdminAuditEvents();
  assert.equal(events.length, 2);
  assert.equal(events[0].sourceCommand, "SECOND");
  assert.equal(events[0].sequence, 2);
  assert.equal(events[1].sourceCommand, "FIRST");
  assert.equal(events[1].sequence, 1);
  assert.equal(runtime.storage.getItem("futureNoir.adminAuditLog.v1"), null);
  assert.ok(runtime.storage.getItem("ws_admin_audit_store_v2"));
});

test("Admin Audit Store keeps all events, assigns monotonic sequences and deduplicates idempotent writes", () => {
  const runtime = makeRuntime();
  runtime.load("js/admin-audit-store.js");

  for (let index = 0; index < 150; index += 1) {
    const result = runtime.window.WS_APP.appendAdminAuditResult({
      actor: { actorId: "admin-user", actorRole: "ADMIN", displayName: "Admin Operator" },
      sourceCommand: "TEST_EVENT",
      category: "ADMIN",
      target: `record-${index}`,
      summary: `Event ${index}`,
      request: { idempotencyKey: `audit-test-${index}` },
      result: { status: "SUCCEEDED", resultCode: "TEST_OK", message: "Stored" }
    });
    assert.equal(result.ok, true);
  }

  const events = runtime.window.WS_APP.getAdminAuditEvents();
  assert.equal(events.length, 150, "Canonical audit must not silently trim older events.");
  assert.equal(events[0].sequence, 150);
  assert.equal(events.at(-1).sequence, 1);

  const replay = runtime.window.WS_APP.appendAdminAuditResult({
    actor: { actorId: "admin-user", actorRole: "ADMIN", displayName: "Admin Operator" },
    sourceCommand: "TEST_EVENT",
    category: "ADMIN",
    target: "record-149",
    summary: "Replay",
    request: { idempotencyKey: "audit-test-149" },
    result: { status: "SUCCEEDED", resultCode: "TEST_OK", message: "Stored" }
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.operation, "IDEMPOTENT_REPLAY");
  assert.equal(runtime.window.WS_APP.getAdminAuditEvents().length, 150);
});

test("Admin Audit Store rejects non-admin actors and queues persistence failures for recovery", () => {
  const runtime = makeRuntime();
  runtime.load("js/admin-audit-store.js");

  const denied = runtime.window.WS_APP.appendAdminAuditResult({
    actor: { actorId: "citizen-user", actorRole: "CITIZEN", displayName: "Citizen" },
    sourceCommand: "ILLEGAL_EVENT",
    result: { status: "SUCCEEDED", resultCode: "SHOULD_NOT_WRITE" }
  });
  assert.equal(denied.ok, false);
  assert.equal(denied.resultCode, "ADMIN_ROLE_REQUIRED");

  const originalSetItem = runtime.storage.setItem.bind(runtime.storage);
  runtime.storage.setItem = (key, value) => {
    if (String(key) === "ws_admin_audit_store_v2") throw new Error("SIMULATED_AUDIT_WRITE_FAILURE");
    return originalSetItem(key, value);
  };

  const failed = runtime.window.WS_APP.appendAdminAuditResult({
    actor: { actorId: "admin-user", actorRole: "ADMIN", displayName: "Admin Operator" },
    sourceCommand: "PERSISTENCE_TEST",
    category: "ADMIN",
    target: "SYSTEM",
    summary: "Persistence test",
    result: { status: "SUCCEEDED", resultCode: "BUSINESS_COMMITTED" }
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.resultCode, "AUDIT_RECOVERY_REQUIRED");
  assert.equal(failed.persistenceConfirmed, false);
  assert.equal(runtime.window.WS_APP.getAdminAuditRecoveryQueue().length, 1);

  runtime.storage.setItem = originalSetItem;
  const retry = runtime.window.WS_APP.retryAdminAuditRecovery();
  assert.equal(retry.ok, true);
  assert.equal(retry.recovered, 1);
  assert.equal(runtime.window.WS_APP.getAdminAuditRecoveryQueue().length, 0);
  assert.equal(runtime.window.WS_APP.getAdminAuditEvents().length, 1);
});
