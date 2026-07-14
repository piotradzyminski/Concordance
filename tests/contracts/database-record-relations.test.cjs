"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test("Database record relations load after Case and Citizen File stores", () => {
  const index = read("index.html");
  const caseStoreIndex = index.indexOf("js/case-store.js?v=43");
  const citizenFileStoreIndex = index.indexOf("js/citizen-file-store.js?v=1");
  const relationStoreIndex = index.indexOf("js/database-relations.js?v=1");
  const caseUiIndex = index.indexOf("js/case-files.js?v=50");

  assert.ok(caseStoreIndex >= 0);
  assert.ok(caseStoreIndex < citizenFileStoreIndex);
  assert.ok(citizenFileStoreIndex < relationStoreIndex);
  assert.ok(relationStoreIndex < caseUiIndex);
});

test("Case and Citizen File records use stable reciprocal identifiers and projected navigation", () => {
  const relationStore = read("js/database-relations.js");
  const caseStore = read("js/case-store.js");
  const caseUi = read("js/case-files.js");
  const citizenUi = read("js/citizen-database.js");
  const adapters = read("js/campaign-data-io-adapters.js");

  assert.match(relationStore, /function resolveCitizenRelations/);
  assert.match(relationStore, /function resolveCitizenFileRelations/);
  assert.match(relationStore, /function resolveCaseFileRelations/);
  assert.match(relationStore, /function getDatabaseRecordRelationDiagnostics/);
  assert.match(caseStore, /relatedCitizenFileIds/);
  assert.match(caseUi, /getCaseFileRelations/);
  assert.match(caseUi, /renderCitizenFileDocument/);
  assert.match(citizenUi, /getCitizenRecordRelations/);
  assert.match(citizenUi, /getCitizenFileRelations/);
  assert.match(citizenUi, /database-relation-link/);
  assert.match(adapters, /domainId:\s*"citizen-files"/);
  assert.doesNotMatch(caseStore, /relatedCitizenSnapshots/);
  assert.doesNotMatch(caseStore, /embeddedCitizenFiles/);
});
