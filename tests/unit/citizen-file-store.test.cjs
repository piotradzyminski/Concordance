"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function makeRuntime(options = {}) {
  const citizens = options.citizens || [
    {
      id: "citizen-a",
      recordType: "citizen",
      legalName: "Citizen A",
      playerVisible: true,
      files: []
    },
    {
      id: "citizen-b",
      recordType: "citizen",
      legalName: "Citizen B",
      playerVisible: false,
      files: []
    }
  ];
  const runtime = createBrowserRuntime({
    storageSeed: options.storageSeed,
    appData: { citizens, caseFiles: [{ id: "case-a", caseNumber: "CF-2109-0001", title: "Case A" }] },
    wsApp: {
      currentUser: { id: "admin", role: "admin" },
      storeUtils: { clone: (value) => structuredClone(value) },
      getCitizens: () => structuredClone(citizens),
      getCitizenById: (id) => structuredClone(citizens.find((citizen) => citizen.id === id) || null),
      getCaseFiles: () => [{ id: "case-a", caseNumber: "CF-2109-0001", title: "Case A" }],
      normalizeAccessTagList: (value, fallback = ["PUBLIC"]) => {
        const source = Array.isArray(value) && value.length ? value : fallback;
        return source.map((tag) => String(tag).trim().toUpperCase()).filter(Boolean);
      },
      canAccessRecord: () => true
    }
  });
  runtime.load("js/citizen-file-store.js");
  return runtime;
}

test("Citizen File Store migrates embedded citizen.files once into stable records", () => {
  const citizens = [{
    id: "citizen-a",
    recordType: "citizen",
    legalName: "Citizen A",
    playerVisible: true,
    files: [{ title: "Medical intake", type: "medical", status: "active", details: "Legacy body" }]
  }];
  const runtime = makeRuntime({ citizens });
  const first = runtime.window.WS_APP.getCitizenFiles({ includeArchived: true, enforceAccess: false });
  assert.equal(first.length, 1);
  assert.equal(first[0].citizenId, "citizen-a");
  assert.equal(first[0].type, "MEDICAL");
  assert.equal(first[0].body, "Legacy body");
  assert.match(first[0].fileId, /^citizen-file-/);
  assert.equal(runtime.storage.getItem("ws_app_citizen_files_schema"), "citizen_files_record_relations_1_0x");

  runtime.load("js/citizen-file-store.js");
  const second = runtime.window.WS_APP.getCitizenFiles({ includeArchived: true, enforceAccess: false });
  assert.equal(second.length, 1, "Reload must not remigrate or duplicate embedded records.");
  assert.equal(second[0].fileId, first[0].fileId);
});

test("Citizen File Store enforces admin mutations, revision guards and archive lifecycle", () => {
  const runtime = makeRuntime();
  const app = runtime.window.WS_APP;
  const admin = { id: "admin", role: "admin" };
  const citizen = { id: "user-a", role: "citizen", citizenId: "citizen-a" };

  const denied = app.createCitizenFile({ citizenId: "citizen-a", title: "Denied" }, { actor: citizen });
  assert.equal(denied, null);
  assert.equal(app.lastCitizenFileMutationError.code, "CITIZEN_FILE_ADMIN_REQUIRED");

  const created = app.createCitizenFile({
    citizenId: "citizen-a",
    title: "Clinical record",
    type: "medical",
    accessTags: ["RESTRICTED"],
    relatedCaseFileIds: ["case-a"],
    summary: "Initial"
  }, { actor: admin });
  assert.ok(created);
  assert.equal(created.revision, 1);
  assert.equal(created.type, "MEDICAL");
  assert.deepEqual(Array.from(created.relatedCaseFileIds), ["case-a"]);

  const conflict = app.updateCitizenFile(created.fileId, { summary: "Stale" }, { actor: admin, expectedRevision: 9 });
  assert.equal(conflict, null);
  assert.equal(app.lastCitizenFileMutationError.code, "CITIZEN_FILE_REVISION_CONFLICT");

  const updated = app.updateCitizenFile(created.fileId, { summary: "Updated" }, { actor: admin, expectedRevision: 1 });
  assert.equal(updated.summary, "Updated");
  assert.equal(updated.revision, 2);

  const archived = app.archiveCitizenFile(created.fileId, { actor: admin, expectedRevision: 2 });
  assert.equal(archived.archived, true);
  assert.equal(archived.status, "ARCHIVED");
  assert.equal(app.getCitizenFiles({ user: citizen }).length, 0);

  const restored = app.restoreCitizenFile(created.fileId, { actor: admin, expectedRevision: 3 });
  assert.equal(restored.archived, false);
  assert.equal(restored.status, "ACTIVE");
  assert.equal(restored.revision, 4);
});

test("Citizen File Store filters by citizen, type, status and query", () => {
  const runtime = makeRuntime();
  const app = runtime.window.WS_APP;
  const admin = { id: "admin", role: "admin" };
  app.createCitizenFile({ citizenId: "citizen-a", title: "Medical intake", type: "MEDICAL", status: "ACTIVE", tags: ["CLINIC"] }, { actor: admin });
  app.createCitizenFile({ citizenId: "citizen-a", title: "Service review", type: "SERVICE", status: "PENDING" }, { actor: admin });
  app.createCitizenFile({ citizenId: "citizen-b", title: "Security note", type: "SECURITY", status: "ACTIVE" }, { actor: admin });

  assert.equal(app.getCitizenFiles({ user: admin, citizenId: "citizen-a" }).length, 2);
  assert.equal(app.getCitizenFiles({ user: admin, type: "medical" }).length, 1);
  assert.equal(app.getCitizenFiles({ user: admin, status: "pending" }).length, 1);
  assert.equal(app.getCitizenFiles({ user: admin, query: "clinic" }).length, 1);
  assert.equal(app.getCitizenFileDiagnostics().ready, true);
});
