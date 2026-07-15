"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

test("Equipment Catalog Authoring extends the existing Catalog Management lazy bundle", () => {
  const modules = read("js/modules.js");
  const store = read("js/equipment-catalog-store.js");
  const authoring = read("js/admin-equipment-catalog-authoring.js");
  const renderer = read("js/admin/workspaces/admin-workspace-catalog-management.js");
  const catalog = read("js/admin-catalog-management.js");

  assert.match(modules, /"admin-workspace-catalog-management":\s*\{[\s\S]*admin-equipment-catalog-authoring\.js\?v=1[\s\S]*admin-catalog-management\.js\?v=2[\s\S]*admin-workspace-catalog-management\.js\?v=2/);
  assert.match(store, /getPublishedEquipmentCatalogDefinitions/);
  assert.match(authoring, /equipment_catalog_authoring_pack_1/);
  assert.match(authoring, /saveAdminEquipmentDefinitionDraft/);
  assert.match(authoring, /publishAdminEquipmentDefinition/);
  assert.match(authoring, /archiveAdminEquipmentDefinition/);
  assert.match(authoring, /previewAdminEquipmentDefinitionInstance/);
  assert.match(renderer, /CANONICAL EQUIPMENT AUTHORING/);
  assert.match(renderer, /Preview Instance/);
  assert.match(renderer, /Save Draft/);
  assert.match(renderer, /Publish/);
  assert.match(renderer, /definitionIdLocked/);
  assert.match(renderer, /Required for Save Draft and Publish; preview is read-only/);
  assert.match(catalog, /authoringStatus: "AVAILABLE_IN_ADMIN"/);
  assert.doesNotMatch(authoring, /createItemInstance\s*\(/);
  assert.doesNotMatch(authoring, /updateItemInstance\s*\(/);
});

test("index changes are cache-only and the authoring store remains lazy", () => {
  const index = read("index.html");
  assert.match(index, /js\/equipment-catalog-store\.js\?v=15/);
  assert.match(index, /js\/modules\.js\?v=309/);

  assert.doesNotMatch(index, /admin-equipment-catalog-authoring\.js/);
});
