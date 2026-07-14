"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

test("Citizen Files Foundation owns one canonical store and eager entrypoint", () => {
  const index = read("index.html");
  const store = read("js/citizen-file-store.js");
  const adapters = read("js/campaign-data-io-adapters.js");

  assert.match(index, /js\/citizen-file-store\.js\?v=1/);
  assert.ok(index.indexOf("js/citizen-file-store.js?v=1") < index.indexOf("js/database-relations.js?v=1"));
  assert.match(store, /ws_app_citizen_files_v1/);
  assert.match(store, /citizen_files_record_relations_1_0x/);
  assert.match(store, /function createCitizenFile/);
  assert.match(store, /function updateCitizenFile/);
  assert.match(store, /function archiveCitizenFile/);
  assert.match(store, /function restoreCitizenFile/);
  assert.match(adapters, /domainId:\s*"citizen-files"/);
  assert.match(adapters, /classification:\s*C\.CAMPAIGN_PERSISTENT/);
});

test("Citizen Files workspace projects canonical records instead of embedded citizen.files", () => {
  const source = read("js/citizen-database.js");
  const css = read("css/database.css");

  assert.match(source, /getCitizenFiles/);
  assert.match(source, /getCitizenFileById/);
  assert.match(source, /createCitizenFile/);
  assert.match(source, /updateCitizenFile/);
  assert.match(source, /requestAdminRecordLifecycleAction/);
  assert.match(source, /recordType:\s*"CITIZEN_FILE"/);
  assert.doesNotMatch(source, /citizen\.files/);
  assert.match(css, /\.citizen-file-toolbar/);
  assert.match(css, /\.citizen-file-document__identity/);
  assert.match(css, /\.citizen-file-form/);
});
