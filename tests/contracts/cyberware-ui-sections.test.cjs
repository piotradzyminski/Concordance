"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createRuntime() {
  const runtime = createBrowserRuntime();
  runtime.load("js/cyberware-workspace.js");
  return runtime;
}

test("Cyberware exposes exactly three internal workspace sections", () => {
  const runtime = createRuntime();
  const markup = runtime.window.WS_APP.renderCyberwareUiNavigation("DIAGNOSTICS");
  const sections = [...markup.matchAll(/data-cyberware-ui-section="([^"]+)"/g)].map((match) => match[1]);
  const subnavs = [...markup.matchAll(/data-cyberware-ui-tabs-section="([^"]+)"/g)].map((match) => match[1]);

  assert.deepEqual(sections, ["SYSTEMS", "NEURAL_CORE", "OPERATIONS"]);
  assert.deepEqual(subnavs, ["SYSTEMS", "NEURAL_CORE", "OPERATIONS"]);
  assert.match(markup, /cyberware-ui-section[^>]*is-active[^>]+data-cyberware-ui-section="NEURAL_CORE"/);
});

test("Cyberware section state maps leaf views and remembers the last view per section", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const citizenId = "citizen-ui-sections";

  app.setCyberwareUiView(citizenId, "DIAGNOSTICS", { mount: false });
  let state = app.getCyberwareUiState(citizenId);
  assert.equal(state.activeSection, "NEURAL_CORE");
  assert.equal(state.activeView, "DIAGNOSTICS");

  app.setCyberwareUiSection(citizenId, "OPERATIONS", { mount: false });
  state = app.getCyberwareUiState(citizenId);
  assert.equal(state.activeView, "PLANNER");

  app.setCyberwareUiView(citizenId, "HISTORY", { mount: false });
  app.setCyberwareUiSection(citizenId, "SYSTEMS", { mount: false });
  app.setCyberwareUiSection(citizenId, "OPERATIONS", { mount: false });
  state = app.getCyberwareUiState(citizenId);
  assert.equal(state.activeSection, "OPERATIONS");
  assert.equal(state.activeView, "HISTORY");
});
