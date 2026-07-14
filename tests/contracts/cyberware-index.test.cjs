"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

function createRuntime() {
  const runtime = createBrowserRuntime({
    wsApp: {
      getCyberwareCatalog() {
        return [
          {
            id: "nc-coremed-t2",
            catalogId: "nc-coremed-t2",
            name: "CoreMed Workline Core",
            model: "CN-2 Workline Core",
            manufacturer: "CoreMed NeuroSystems",
            catalogDomain: "NEUROCHIP",
            processorRole: "NEUROCHIP",
            tier: 2,
            grade: "CIVILIAN",
            scale: "SMALL",
            neuroLoad: 12,
            neurochannels: 4,
            latency: 4,
            protocolSupport: ["CIVIC", "MEDICAL"],
            legality: "REGISTERED",
            availability: "COMMON",
            basePrice: 3000,
            summary: "Stable civilian cyberware processor."
          },
          {
            id: "if-kagami-t3",
            catalogId: "if-kagami-t3",
            name: "Kagami Yata Socket",
            manufacturer: "Kagami Kaisha",
            catalogDomain: "INTERFACE",
            processorRole: "INTERFACE_BACKPLANE",
            tier: 3,
            grade: "CORPORATE",
            scale: "SMALL",
            interfaceLoad: 0,
            securityIsolation: 74,
            protocolSupport: ["SECURE"],
            legality: "LICENSED",
            availability: "CONTROLLED",
            basePrice: 9000
          }
        ];
      }
    }
  });
  runtime.load("js/cyberware-index.js");
  return runtime;
}

test("Cyberware Index projects canonical catalog definitions without ItemInstance state", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const definitions = app.getCyberwareIndexDefinitions();

  assert.equal(definitions.length, 2);
  assert.equal(definitions[0].category, "INTERFACE");
  assert.equal(definitions[1].category, "NEUROCHIP");
  assert.equal(definitions[1].definitionId, "nc-coremed-t2");
  assert.equal(definitions[1].neuroLoad, 12);
  assert.deepEqual(Array.from(definitions[1].protocols), ["CIVIC", "MEDICAL"]);
  assert.equal(Object.hasOwn(definitions[1], "instanceId"), false);
});

test("Cyberware Index keeps per-Citizen filters, selection and read-only definition inspector", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;

  app.setCyberwareIndexOpen("citizen-a", true);
  app.setCyberwareIndexFilter("citizen-a", { query: "kagami", category: "INTERFACE", manufacturer: "Kagami Kaisha", grade: "CORPORATE" });
  app.selectCyberwareIndexDefinition("citizen-a", "if-kagami-t3");

  const projection = app.buildCyberwareIndexProjection("citizen-a");
  const markup = app.renderCyberwareIndex("citizen-a");

  assert.equal(projection.state.open, true);
  assert.equal(projection.selected.definitionId, "if-kagami-t3");
  assert.match(markup, /CYBERWARE \/ INDEX/);
  assert.match(markup, /data-cyberware-index-select="if-kagami-t3"/);
  assert.match(markup, /data-cyberware-index-definition="if-kagami-t3"/);
  assert.match(markup, /Kagami Yata Socket/);
  assert.match(markup, /SECURE/);
  assert.doesNotMatch(markup, /data-cyberware-planner-action|data-cyberware-maintenance-action|data-item-instance/);
});

test("Equipment bundle and Cyberware workspace expose the Index through the shared drawer contract", () => {
  const modules = fs.readFileSync(path.join(PROJECT_ROOT, "js/modules.js"), "utf8");
  const link = fs.readFileSync(path.join(PROJECT_ROOT, "js/equipment-cyberware-link.js"), "utf8");
  const actions = fs.readFileSync(path.join(PROJECT_ROOT, "js/equipment-actions.js"), "utf8");
  const css = fs.readFileSync(path.join(PROJECT_ROOT, "css/equipment.css"), "utf8");

  assert.match(modules, /js\/cyberware-index\.js\?v=1/);
  assert.match(link, /data-cyberware-index-toggle/);
  assert.match(link, /renderCyberwareIndex\?\.\(citizenId\)/);
  assert.match(actions, /data-cyberware-index-select/);
  assert.match(actions, /syncCyberwareIndexOverlay/);
  assert.match(css, /Cyberware Index 13\.6x/);
  assert.match(css, /\.cyberware-index-drawer/);
  assert.match(css, /\.cyberware-index-content/);
});

test("Cyberware shell uses shared card and compact tab families and hides the duplicate hero", () => {
  const link = fs.readFileSync(path.join(PROJECT_ROOT, "js/equipment-cyberware-link.js"), "utf8");
  const equipment = fs.readFileSync(path.join(PROJECT_ROOT, "js/equipment.js"), "utf8");
  const css = fs.readFileSync(path.join(PROJECT_ROOT, "css/equipment.css"), "utf8");

  assert.match(link, /cyberware-ui-section system-segment-tile system-segment-tile--card/);
  assert.match(link, /cyberware-ui-tabs system-inline-tabs/);
  assert.match(link, /cyberware-ui-tab system-inline-tab/);
  assert.match(equipment, /data-equipment-shell-hero/);
  assert.match(equipment, /heroVisible = activeView === "CYBERGRID"/);
  assert.match(css, /\.equipment-shell-hero\[hidden\]/);
  assert.doesNotMatch(link, /\$\{section\.views\.length\} VIEWS/);
});
