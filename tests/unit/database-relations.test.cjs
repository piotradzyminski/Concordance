"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createRuntime(options = {}) {
  const citizens = options.citizens || [
    { id: "citizen-a", legalName: "Citizen A", recordType: "citizen", playerVisible: true, files: [] },
    { id: "citizen-b", legalName: "Citizen B", recordType: "citizen", playerVisible: true, files: [] }
  ];
  const caseFiles = options.caseFiles || [
    {
      id: "case-a",
      caseNumber: "CF-2109-0001",
      title: "Case A",
      status: "OPEN",
      clearance: "RESTRICTED",
      relatedCitizens: ["citizen-a"],
      relatedCitizenFileIds: []
    }
  ];
  const citizenFiles = options.citizenFiles || [
    {
      fileId: "file-a",
      id: "file-a",
      citizenId: "citizen-a",
      title: "File A",
      type: "SECURITY",
      status: "ACTIVE",
      accessTags: ["RESTRICTED"],
      relatedCaseFileIds: ["case-a"],
      revision: 1
    }
  ];
  const runtime = createBrowserRuntime({
    storageSeed: {
      ws_app_citizen_files_v1: JSON.stringify(citizenFiles),
      ws_app_citizen_files_schema: "citizen_files_record_relations_1_0x"
    },
    appData: { citizens, caseFiles },
    wsApp: {
      currentUser: { id: "admin", role: "admin" },
      storeUtils: { clone: (value) => structuredClone(value) },
      getCitizens: () => structuredClone(citizens),
      getCitizenById: (id) => structuredClone(citizens.find((citizen) => citizen.id === id) || null),
      getCaseFiles: () => structuredClone(caseFiles),
      getCaseFileById: (id) => structuredClone(caseFiles.find((record) => record.id === id) || null),
      normalizeAccessTagList: (value, fallback = ["PUBLIC"]) => {
        const source = Array.isArray(value) && value.length ? value : fallback;
        return source.map((tag) => String(tag).trim().toUpperCase()).filter(Boolean);
      },
      canAccessRecord: () => true
    }
  });
  runtime.loadMany(["js/citizen-file-store.js", "js/database-relations.js"]);
  return runtime;
}

test("Database relation graph resolves Citizen -> Citizen Files -> Case Files without copying records", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;

  const citizenRelations = app.getCitizenRecordRelations("citizen-a", { user: { role: "admin" } });
  assert.equal(citizenRelations.citizen.id, "citizen-a");
  assert.deepEqual(Array.from(citizenRelations.citizenFiles.map((record) => record.fileId)), ["file-a"]);
  assert.deepEqual(Array.from(citizenRelations.caseFiles.map((record) => record.id)), ["case-a"]);

  const fileRelations = app.getCitizenFileRelations("file-a", { user: { role: "admin" } });
  assert.equal(fileRelations.citizen.id, "citizen-a");
  assert.deepEqual(Array.from(fileRelations.caseFiles.map((record) => record.id)), ["case-a"]);

  const caseRelations = app.getCaseFileRelations("case-a", { user: { role: "admin" } });
  assert.deepEqual(Array.from(caseRelations.citizens.map((record) => record.id)), ["citizen-a"]);
  assert.deepEqual(Array.from(caseRelations.citizenFiles.map((record) => record.fileId)), ["file-a"]);
});

test("Database relation diagnostics distinguish broken references from one-sided reciprocal links", () => {
  const runtime = createRuntime();
  const diagnostics = runtime.window.WS_APP.getDatabaseRecordRelationDiagnostics();
  assert.equal(diagnostics.ready, true);
  assert.equal(diagnostics.errorCount, 0);
  assert.equal(diagnostics.warningCount, 1);
  assert.equal(diagnostics.warnings[0].code, "DATABASE_RELATION_RECIPROCAL_CASE_LINK_MISSING");

  const broken = createRuntime({
    citizenFiles: [{
      fileId: "file-broken",
      id: "file-broken",
      citizenId: "citizen-missing",
      title: "Broken",
      status: "ACTIVE",
      accessTags: ["RESTRICTED"],
      relatedCaseFileIds: ["case-missing"]
    }],
    caseFiles: []
  });
  const brokenDiagnostics = broken.window.WS_APP.getDatabaseRecordRelationDiagnostics();
  assert.equal(brokenDiagnostics.ready, false);
  assert.equal(brokenDiagnostics.errorCount, 2);
  assert.deepEqual(
    Array.from(brokenDiagnostics.errors.map((error) => error.code).sort()),
    ["DATABASE_RELATION_CASE_FILE_MISSING", "DATABASE_RELATION_CITIZEN_MISSING"]
  );
});
