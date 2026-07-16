"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

function indexOfAsset(index, asset) {
  const position = index.indexOf(asset);
  assert.ok(position >= 0, `Missing asset: ${asset}`);
  return position;
}

test("Registry UI is eager and available before routing and Knowledge renderers", () => {
  const index = read("index.html");
  const terminalEffects = indexOfAsset(index, "js/terminal-effects.js?v=48");
  const registryUI = indexOfAsset(index, "js/registry-ui.js?v=1");
  const modules = indexOfAsset(index, "js/modules.js?v=318");
  const system = indexOfAsset(index, "js/system-registry.js?v=19");
  const encyclopedia = indexOfAsset(index, "js/encyclopedia-module.js?v=16");

  assert.ok(registryUI > terminalEffects);
  assert.ok(registryUI < modules);
  assert.ok(registryUI < system);
  assert.ok(registryUI < encyclopedia);
});

test("Registry UI works on a cold entry without Citizen Records", async () => {
  let received = null;
  const runtime = createBrowserRuntime({
    wsApp: {
      confirmAction(options) {
        received = options;
        return Promise.resolve(true);
      }
    }
  });

  runtime.load("js/registry-ui.js");
  const api = runtime.window.WS_APP.registryUI;

  assert.equal(api.version, 1);
  assert.equal(await api.confirmAction("ARCHIVE RECORD", "Archive it?", "Archive"), true);
  assert.equal(JSON.stringify(received), JSON.stringify({
    title: "ARCHIVE RECORD",
    message: "Archive it?",
    confirmLabel: "Archive",
    cancelLabel: "Cancel",
    tone: "danger"
  }));
  assert.deepEqual(Array.from(api.parseList("Alpha, Beta\nGamma")), ["Alpha", "Beta", "Gamma"]);
  assert.equal(api.normalizeQuery("ŻÓŁĆ"), "zołc");
  assert.match(api.renderInput("title", "Title", "<unsafe>"), /&lt;unsafe&gt;/);
  assert.match(api.renderTextarea("body", "Body", "A&B"), /A&amp;B/);
});

test("Knowledge, Citizen Records and Subscriptions use the explicit Registry UI API", () => {
  const modules = read("js/modules.js");
  const sources = [
    "js/system-registry.js",
    "js/encyclopedia-module.js",
    "js/citizen-card-shell.js",
    "js/subscriptions.js"
  ].map(read);

  for (const source of sources) {
    assert.doesNotMatch(source, /(?<![.\w])confirmRegistryAction\s*\(/);
  }

  assert.match(sources[0], /window\.WS_APP\.registryUI\.confirmAction/);
  assert.match(sources[1], /window\.WS_APP\.registryUI\.renderInput/);
  assert.match(sources[2], /window\.WS_APP\.registryUI\.confirmAction/);
  assert.match(sources[3], /window\.WS_APP\.registryUI\.confirmAction/);

  assert.doesNotMatch(modules, /function renderEntryInput\s*\(/);
  assert.doesNotMatch(modules, /function renderEntryTextarea\s*\(/);
  assert.doesNotMatch(modules, /function renderEntrySelect\s*\(/);
  assert.doesNotMatch(modules, /function parseRegistryList\s*\(/);
  assert.doesNotMatch(modules, /function normalizeRegistryQuery\s*\(/);
  assert.doesNotMatch(sources[2], /function confirmRegistryAction\s*\(/);
});
