"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createServiceRuntime(overrides = {}) {
  const citizen = {
    id: "citizen-service-test",
    recordType: "citizen",
    recordState: "ACTIVE",
    identity: { firstName: "Service", surname: "Tester" },
    income: [],
    serviceLog: [{
      id: "service-log-test",
      title: "Lifecycle Test",
      provider: "Test Provider",
      employerId: "provider-test",
      status: "ACTIVE",
      form: "COMMISSION",
      amount: 800,
      payoutStatus: "PENDING_COMPLETION",
      revision: 1
    }],
    ...structuredClone(overrides)
  };
  const runtime = createBrowserRuntime({
    appData: { citizens: [citizen] },
    wsApp: { currentUser: { login: "admin", role: "admin" } }
  });
  runtime.loadMany(["js/store-utils.js", "js/service-log-lifecycle.js", "js/terminal-entry-store.js", "js/terminal-reminder-store.js", "js/citizen-subscription-adapter.js", "js/store.js"]);
  return runtime;
}

test("Citizen Service Log lifecycle exposes strict allowed transitions", () => {
  const runtime = createServiceRuntime();
  const app = runtime.window.WS_APP;

  assert.deepEqual(Array.from(app.getCitizenServiceAllowedTransitions("citizen-service-test", "service-log-test")), [
    "SUSPENDED", "COMPLETED", "FAILED", "TERMINATED"
  ]);

  const invalid = app.previewCitizenServiceTransition("citizen-service-test", "service-log-test", "ARCHIVED", { expectedRevision: 1 });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.resultCode, "SERVICE_LOG_TRANSITION_INVALID");
  assert.deepEqual(Array.from(invalid.allowedTransitions), ["SUSPENDED", "COMPLETED", "FAILED", "TERMINATED"]);
});

test("Citizen Service Log transition is revisioned, idempotent and terminal-safe", () => {
  const runtime = createServiceRuntime();
  const app = runtime.window.WS_APP;

  const completed = app.transitionCitizenServiceRecord("citizen-service-test", "service-log-test", "COMPLETED", {
    expectedRevision: 1,
    createdBy: "admin",
    reason: "Work verified",
    source: "ADMIN_CONTROL",
    idempotencyKey: "service-complete-1"
  });

  assert.equal(completed.ok, true);
  assert.equal(completed.resultCode, "SERVICE_LOG_TRANSITION_COMPLETED");
  assert.equal(completed.revisionBefore, 1);
  assert.equal(completed.revisionAfter, 2);
  assert.equal(completed.record.status, "COMPLETED");
  assert.equal(completed.record.result, "COMPLETED");
  assert.equal(completed.record.payoutStatus, "READY_FOR_SETTLEMENT");
  assert.equal(completed.record.lifecycleHistory.length, 1);

  const replay = app.transitionCitizenServiceRecord("citizen-service-test", "service-log-test", "COMPLETED", {
    expectedRevision: 1,
    createdBy: "admin",
    reason: "Repeated request",
    source: "ADMIN_CONTROL",
    idempotencyKey: "service-complete-1"
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.replayed, true);
  assert.equal(replay.revisionBefore, 1);
  assert.equal(replay.revisionAfter, 2);
  assert.equal(app.getCitizenServiceRecord("citizen-service-test", "service-log-test").revision, 2);

  const conflictingReplay = app.transitionCitizenServiceRecord("citizen-service-test", "service-log-test", "FAILED", {
    expectedRevision: 2,
    idempotencyKey: "service-complete-1"
  });
  assert.equal(conflictingReplay.ok, false);
  assert.equal(conflictingReplay.resultCode, "SERVICE_LOG_IDEMPOTENCY_CONFLICT");

  const reopen = app.transitionCitizenServiceRecord("citizen-service-test", "service-log-test", "ACTIVE", {
    expectedRevision: 2,
    idempotencyKey: "service-reopen-invalid"
  });
  assert.equal(reopen.ok, false);
  assert.equal(reopen.resultCode, "SERVICE_LOG_TRANSITION_INVALID");

  const archived = app.transitionCitizenServiceRecord("citizen-service-test", "service-log-test", "ARCHIVED", {
    expectedRevision: 2,
    createdBy: "admin",
    reason: "Historical archive",
    source: "ADMIN_CONTROL",
    idempotencyKey: "service-archive-1"
  });
  assert.equal(archived.ok, true);
  assert.equal(archived.record.status, "ARCHIVED");
  assert.equal(archived.record.result, "COMPLETED");
  assert.equal(archived.record.payoutStatus, "READY_FOR_SETTLEMENT");
  assert.deepEqual(Array.from(archived.allowedTransitions), []);
});

test("Citizen Service Log transition rejects stale revision", () => {
  const runtime = createServiceRuntime();
  const result = runtime.window.WS_APP.transitionCitizenServiceRecord("citizen-service-test", "service-log-test", "SUSPENDED", {
    expectedRevision: 7,
    idempotencyKey: "stale-service-transition"
  });

  assert.equal(result.ok, false);
  assert.equal(result.resultCode, "SERVICE_LOG_REVISION_CONFLICT");
  assert.equal(result.actualRevision, 1);
});
