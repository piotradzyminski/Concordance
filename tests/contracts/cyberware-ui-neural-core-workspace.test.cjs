"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createRuntime() {
  const runtime = createBrowserRuntime();
  runtime.load("js/cyberware-workspace.js");
  return runtime;
}

function makeCoreVm() {
  return {
    systemState: "ENABLED",
    warnings: ["NO_SERVICE_PORT"],
    resources: [
      { key: "NEUROLOAD", label: "Neuroload", value: 6, capacity: 30, remaining: 24, ratio: 0.2 },
      { key: "NEUROCHANNELS", label: "Neurochannels", value: 2, capacity: 9, remaining: 7, ratio: 2 / 9 },
      { key: "INTERFACE_LOAD", label: "Interface load", value: 4, capacity: 20, remaining: 16, ratio: 0.2 }
    ],
    quality: [
      { key: "SECURITY", label: "Security", value: 73 },
      { key: "STABILITY", label: "Stability", value: 82 },
      { key: "NEUROLATENCY", label: "Neurolatency", value: "RESPONSIVE" },
      { key: "NEURAL_STRAIN", label: "Neural strain", value: 0 }
    ],
    limits: { maxCyberwareGrade: "INDUSTRIAL", maxScale: "LARGE" },
    components: [
      { kind: "NEUROCHIP", installed: true, id: "chip-1", name: "Yata Mirrorcore", tier: 3, state: "ENABLED", reason: "READY", metrics: [], buses: ["NEURAL_BUS"], blockers: [], warnings: [] },
      { kind: "INTERFACE", installed: true, id: "interface-1", name: "Torii Socket", tier: 3, state: "ENABLED", reason: "READY", metrics: [], buses: ["NEURAL_BUS"], blockers: [], warnings: [] },
      { kind: "SERVICE_PORT", installed: false, id: "", name: "NO SERVICE PORT", tier: 0, state: "OPTIONAL", reason: "SERVICE_PORT_OPTIONAL", metrics: [], buses: [], blockers: [], warnings: ["NO_SERVICE_PORT"] }
    ],
    coreLink: { state: "READY", reason: "SOCKET_COMPATIBLE", socketRating: 3, neurochipTier: 3, effectiveChannels: 9 },
    protocols: ["CIVIC", "SECURE"],
    buses: ["NEURAL_BUS"],
    compatibility: [
      { id: "implant-1", name: "Neuromotor Assist", slot: "RIGHT HAND", state: "ENABLED", reason: "READY", allocation: { neuroLoad: 2, neuroChannels: 1, interfaceLoad: 1 }, requiredProtocols: ["CIVIC"], missingProtocols: [], blockers: [], warnings: [] }
    ]
  };
}

function makeDiagnostics() {
  return {
    status: "ADVISORY",
    neurocrashRisk: { score: 12, level: "LOW" },
    core: { stability: 82, security: 73, neuralStrain: 0 },
    counts: { CRITICAL: 0, ERROR: 0, WARNING: 1 },
    resources: [
      { key: "NEUROLOAD", label: "Neuroload", value: 6, demanded: 6, capacity: 30 },
      { key: "NEUROCHANNELS", label: "Neurochannels", value: 2, demanded: 2, capacity: 9 },
      { key: "INTERFACE_LOAD", label: "Interface load", value: 4, demanded: 4, capacity: 20 }
    ],
    factors: { stability: [], security: [] },
    issues: [{ severity: "WARNING", category: "CORE", title: "Service Port unavailable", detail: "External diagnostics are limited.", code: "NO_SERVICE_PORT" }],
    history: [{ status: "ADVISORY", createdAt: "2026-07-13T18:00:00.000Z", neurocrashRisk: 12, stability: 82, security: 73, issueCount: 1 }]
  };
}

const citizen = {
  id: "citizen-neural-core",
  cyberwareDiagnostics: [
    { status: "ADVISORY", createdAt: "2026-07-13T18:00:00.000Z", neurocrashRisk: 12, issueCount: 1 }
  ]
};

const runtimeState = { neuralCore: { systemState: "ENABLED" }, installed: [] };

test("Neural Core Core Stack view shares one status surface and preserves lazy diagnostics", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  let diagnosticsCalls = 0;

  app.cyberwareCoreStack = { getCyberwareCoreStackViewModel: () => makeCoreVm() };
  app.cyberwareDiagnostics = { buildCyberwareDiagnostics: () => { diagnosticsCalls += 1; return makeDiagnostics(); } };
  app.getCitizenById = () => citizen;

  const markup = app.renderCyberwareNeuralCoreWorkspace(runtimeState, citizen, "CORE_STACK");

  assert.match(markup, /Neural Core Workspace/);
  assert.match(markup, /Neuroload/);
  assert.match(markup, /Yata Mirrorcore/);
  assert.match(markup, /Torii Socket/);
  assert.match(markup, /LAST DIAGNOSTIC/);
  assert.match(markup, /ADVISORY/);
  assert.match(markup, /data-cyberware-ui-view="DIAGNOSTICS"/);
  assert.match(markup, /CORE ARCHITECTURE/);
  assert.doesNotMatch(markup, /CURRENT RESOLVER STATE/);
  assert.equal(diagnosticsCalls, 0);
});

test("Neural Core Diagnostics view keeps the same context and mounts embedded diagnostics", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  let diagnosticsCalls = 0;

  app.cyberwareCoreStack = { getCyberwareCoreStackViewModel: () => makeCoreVm() };
  app.cyberwareDiagnostics = { buildCyberwareDiagnostics: () => { diagnosticsCalls += 1; return makeDiagnostics(); } };
  app.getCitizenById = () => citizen;

  const markup = app.renderCyberwareNeuralCoreWorkspace(runtimeState, citizen, "DIAGNOSTICS", { mountDiagnostics: true });

  assert.match(markup, /Neural Core Workspace/);
  assert.match(markup, /data-cyberware-ui-view="CORE_STACK"/);
  assert.match(markup, /DIAGNOSTIC ANALYSIS/);
  assert.match(markup, /Current Resolver State/);
  assert.match(markup, /NEUROCRASH RISK/);
  assert.match(markup, /Run Diagnostic Scan/);
  assert.doesNotMatch(markup, /Close Diagnostics/);
  assert.equal(diagnosticsCalls, 1);
});

test("Neural Core projection aggregates current core findings without creating another diagnostics store", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;

  app.cyberwareCoreStack = { getCyberwareCoreStackViewModel: () => makeCoreVm() };
  const projection = app.buildNeuralCoreWorkspaceProjection(runtimeState, citizen);

  assert.equal(projection.systemState, "ENABLED");
  assert.equal(projection.lastScan.status, "ADVISORY");
  assert.equal(projection.lastScan.neurocrashRisk, 12);
  assert.deepEqual(Array.from(projection.findings.blockers), []);
  assert.deepEqual(Array.from(projection.findings.warnings), ["NO_SERVICE_PORT"]);
  assert.equal(projection.metrics.length, 6);
});
