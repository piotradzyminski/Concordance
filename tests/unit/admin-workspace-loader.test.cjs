"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

function registerStubRenderer(runtime, workspaceId) {
  runtime.window.WS_APP.AdminWorkspaceRegistry.registerRenderer(workspaceId, () => `<section>${workspaceId}</section>`);
}

test("Admin Workspace Loader keeps registered dashboard ready and loads citizens bundle once", async () => {
  const calls = [];
  const runtime = createBrowserRuntime();
  runtime.loadMany([
    "js/admin/admin-workspace-registry.js",
    "js/admin/workspaces/admin-workspace-dashboard.js",
    "js/admin/admin-workspace-loader.js"
  ]);
  runtime.window.WS_APP.loadModuleBundle = (moduleId) => {
    calls.push(moduleId);
    registerStubRenderer(runtime, "citizens");
    return Promise.resolve();
  };
  const loader = runtime.window.WS_APP.AdminWorkspaceLoader;

  assert.equal(loader.isReady("dashboard"), true);
  assert.equal(loader.isReady("citizens"), false);
  await loader.ensure("citizens");
  await loader.ensure("citizens");
  await flush();

  assert.deepEqual(calls, ["admin-workspace-citizens"]);
  assert.equal(loader.describe("citizens").status, "READY");
  assert.equal(loader.describe("citizens").rendererReady, true);
});

test("Admin Workspace Loader exposes failure and retries only after renderer registration", async () => {
  let attempt = 0;
  const runtime = createBrowserRuntime();
  runtime.loadMany(["js/admin/admin-workspace-registry.js", "js/admin/admin-workspace-loader.js"]);
  runtime.window.WS_APP.loadModuleBundle = (moduleId) => {
    attempt += 1;
    if (attempt === 1) return Promise.reject(new Error(`${moduleId} failed`));
    registerStubRenderer(runtime, "service");
    return Promise.resolve();
  };
  const loader = runtime.window.WS_APP.AdminWorkspaceLoader;

  await assert.rejects(loader.ensure("service"), /failed/);
  assert.equal(loader.describe("service").status, "FAILED");
  await loader.retry("service");
  assert.equal(loader.describe("service").status, "READY");
  assert.equal(attempt, 2);
});

test("Admin Workspace Loader rejects a bundle that resolves without its renderer", async () => {
  const runtime = createBrowserRuntime({
    wsApp: {
      loadModuleBundle() {
        return Promise.resolve();
      }
    }
  });
  runtime.loadMany(["js/admin/admin-workspace-registry.js", "js/admin/admin-workspace-loader.js"]);

  await assert.rejects(
    runtime.window.WS_APP.AdminWorkspaceLoader.ensure("audit"),
    /ADMIN_WORKSPACE_RENDERER_NOT_REGISTERED:audit/
  );
  assert.equal(runtime.window.WS_APP.AdminWorkspaceLoader.describe("audit").status, "FAILED");
});
