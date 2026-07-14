"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

test("Catalog Management is a lazy Admin workspace with a dedicated canonical adapter", () => {
  const registry = read("js/admin/admin-workspace-registry.js");
  const modules = read("js/modules.js");
  const control = read("js/admin-control.js");
  const renderer = read("js/admin/workspaces/admin-workspace-catalog-management.js");
  const adapter = read("js/admin-catalog-management.js");

  assert.match(registry, /id: "catalog-management"[\s\S]*bundleId: "admin-workspace-catalog-management"/);
  assert.match(modules, /"admin-workspace-catalog-management":\s*\{[\s\S]*CYBERWARE_CATALOG_DATA_SCRIPTS[\s\S]*admin-equipment-catalog-authoring\.js\?v=1[\s\S]*admin-catalog-management\.js\?v=2[\s\S]*admin-workspace-catalog-management\.js\?v=2/);
  assert.match(renderer, /registerRenderer\("catalog-management"/);
  assert.match(renderer, /RUNTIME INSTANCES/);
  assert.match(renderer, /REUSABLE DEFINITIONS/);
  assert.match(renderer, /Preview Data Pack/);
  assert.match(control, /AdminCatalogManagementControl\?\.bind/);
  assert.match(control, /AdminCatalogManagementControl\.renderInspector/);
  assert.match(adapter, /future_noir_catalog_pack_1/);
  assert.match(adapter, /ADMIN_CATALOG_PACK_APPLY_REQUIRES_DOMAIN_AUTHORING/);
  assert.doesNotMatch(adapter, /localStorage\.setItem/);
  assert.doesNotMatch(adapter, /updateEquipmentCatalog/);
  assert.doesNotMatch(adapter, /setServiceDefinitions/);
});
