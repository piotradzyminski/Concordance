"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const WORKSPACES = [
  "dashboard",
  "operations",
  "citizens",
  "tags-access",
  "subscriptions",
  "service",
  "billing",
  "system-requests",
  "records",
  "audit",
  "data-settings"
];

const RENDERER_FILES = WORKSPACES.map((workspaceId) => `js/admin/workspaces/admin-workspace-${workspaceId}.js`);

test("Admin workspace registry owns renderer registration instead of a central renderer switch", () => {
  const registry = read("js/admin/admin-workspace-registry.js");
  const core = read("js/admin-control.js");

  assert.match(registry, /registerRenderer/);
  assert.match(registry, /getRenderer/);
  assert.match(registry, /hasRenderer/);
  assert.match(core, /AdminWorkspaceRegistry/);
  assert.match(core, /getRenderer\?\.\(workspace\.id\)/);
  assert.match(core, /AdminControlRendererContext/);
  assert.doesNotMatch(core, /workspace\.id === "dashboard"/);
  assert.doesNotMatch(core, /function renderAdminDashboard\(/);
  assert.doesNotMatch(core, /function renderCitizensWorkspace\(/);
  assert.doesNotMatch(core, /function renderServiceWorkspace\(/);
  assert.doesNotMatch(core, /function renderBillingWorkspace\(/);
});

test("Every Admin workspace has one dedicated renderer file and registers its canonical id", () => {
  for (const [index, relativePath] of RENDERER_FILES.entries()) {
    const workspaceId = WORKSPACES[index];
    const source = read(relativePath);
    assert.match(source, new RegExp(`registerRenderer\\("${workspaceId}"`));
    assert.match(source, /AdminControlRendererContext/);
  }

  const runtime = createBrowserRuntime();
  runtime.load("js/admin/admin-workspace-registry.js");
  runtime.loadMany(RENDERER_FILES);
  assert.deepEqual(
    Array.from(runtime.window.WS_APP.AdminWorkspaceRegistry.listRendererIds()).sort(),
    [...WORKSPACES].sort()
  );
});

test("Admin bundle map loads dashboard with the shell and every other renderer through its workspace bundle", () => {
  const modules = read("js/modules.js");
  const index = read("index.html");

  assert.match(modules, /"admin-control":\s*\{[\s\S]*admin-workspace-dashboard\.js\?v=1/);
  for (const workspaceId of WORKSPACES.filter((id) => id !== "dashboard")) {
    const version = workspaceId === "operations" ? 2 : 1;
    assert.match(modules, new RegExp(`"admin-workspace-${workspaceId}":\\s*\\{[\\s\\S]*admin-workspace-${workspaceId}\\.js\\?v=${version}`));
  }
  assert.match(modules, /admin-workspace-registry\.js\?v=6/);
  assert.match(modules, /admin-workspace-loader\.js\?v=2/);
  assert.match(modules, /admin-control\.js\?v=68/);

  assert.match(index, /js\/modules\.js\?v=318/);

});
