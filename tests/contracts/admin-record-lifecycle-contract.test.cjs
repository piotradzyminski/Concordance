"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

test("Record lifecycle contract is eager and loaded after dependency-aware stores", () => {
  const index = read("index.html");
  const lifecycle = index.indexOf("js/admin-record-lifecycle.js?v=1");
  assert.ok(lifecycle > index.indexOf("js/admin-dependency-resolver.js?v=2"));
  assert.ok(lifecycle > index.indexOf("js/citizen-file-store.js?v=1"));
  assert.ok(lifecycle < index.indexOf("js/address-core.js?v=45"));
});

test("Equipment UI separates Archive from Dispose and uses the canonical lifecycle command", () => {
  const source = read("js/admin-control.js");
  assert.match(source, /Archive Item/);
  assert.match(source, /Dispose Item/);
  assert.match(source, /Restore Item/);
  assert.match(source, /executeAdminRecordLifecycle/);
  assert.doesNotMatch(source, /function archiveAdminEquipmentItem[\s\S]*lifecycleState:\s*"DISPOSED"/);
});

test("Knowledge, Address, Case and Citizen File UIs use the shared record lifecycle boundary", () => {
  for (const file of ["js/encyclopedia-module.js", "js/system-registry.js", "js/address-core.js", "js/case-files.js", "js/citizen-database.js"]) {
    const source = read(file);
    assert.match(source, /requestAdminRecordLifecycleAction/);
    assert.match(source, /Preview Dependencies/);
  }
});
