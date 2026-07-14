"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function installActualTerminalUpsert(runtime) {
  runtime.loadMany(["js/store-utils.js", "js/terminal-entry-store.js"]);
  const utils = runtime.window.WS_APP.storeUtils;
  let sequence = 0;
  const normalizeEntry = (entry = {}) => ({
    ...utils.clone(entry),
    id: entry.id || `terminal-test-${++sequence}`,
    citizenId: String(entry.citizenId || ""),
    audience: Array.isArray(entry.audience) ? entry.audience : [entry.audience || "PLAYER"],
    folder: String(entry.folder || "INBOX").toUpperCase() === "TRASH" ? "TRASH" : "INBOX",
    createdAt: entry.createdAt || "2109-02-13T12:00:00.000Z",
    sortIndex: entry.sortIndex || sequence,
    revision: Math.max(1, Number(entry.revision || 1)),
    lifecycle: entry.lifecycle || { status: entry.read ? "READ" : "NEW" },
    userFlags: entry.userFlags || { important: entry.important === true },
    read: entry.read === true,
    important: entry.important === true
  });
  const store = runtime.window.WS_APP.createTerminalEntryStore({
    ...utils,
    normalizeEntry,
    normalizeToken: (value, fallback = "SYSTEM") => String(value || fallback).trim().toUpperCase() || fallback
  });
  return { getEntries: () => store.readEntries().map(utils.clone) };
}

function makeRegistry() {
  const event = {
    eventCode: "WORLD_OPERATION.STATUS_CHANGED",
    label: "World operation updated",
    domain: "WORLD_BRIDGE",
    category: "OPERATION",
    legacyType: "SYSTEM",
    legacySubtype: "SYSTEM_NOTICE",
    defaultSeverity: "NOTICE",
    defaultAttention: "INBOX",
    defaultAudience: ["PLAYER"],
    subjectTypes: ["WORLD_OPERATION", "ITEM_INSTANCE"],
    requiredData: [],
    providerRequired: true,
    templateId: "world-operation",
    actions: [],
    retentionPolicy: { mode: "BOUNDED" },
    aggregationPolicy: { mode: "REPLACE_EXISTING", keyFields: ["citizenId", "eventCode", "correlationId"] }
  };
  const providerManifest = { providerId: "system-runtime", organizationId: "", sourceKind: "SYSTEM_PROCESS", supportedEvents: [event.eventCode], eventOverrides: {} };
  return {
    normalizeEventCode: (value) => String(value || "").trim().toUpperCase(),
    getEvent: (eventCode) => eventCode === event.eventCode ? structuredClone(event) : null,
    normalizeAudience: (audience) => Array.isArray(audience) ? [...audience] : [String(audience || "PLAYER")],
    resolveProvider: (providerId) => providerId === "system-runtime" ? { requestedProviderId: providerId, providerId, manifest: providerManifest, organization: null } : null,
    providerSupportsEvent: (resolution, definition) => resolution?.manifest?.supportedEvents?.includes(definition?.eventCode) === true,
    pushDiagnostic() {},
    getProviders: () => [providerManifest]
  };
}

test("World Bridge notification projection keeps one card per operation and ignores repeated revisions", () => {
  const registry = makeRegistry();
  const runtime = createBrowserRuntime({
    wsApp: {
      notificationRegistry: registry,
      getWorldBridgeOperation: () => null
    }
  });
  const terminalStore = installActualTerminalUpsert(runtime);
  runtime.load("js/notification-api.js");
  runtime.load("js/world-bridge-notification-producer.js");

  const base = {
    operationId: "world-operation-notification-test",
    operationType: "INSTALL",
    citizenId: "citizen-test",
    currentStep: "EXECUTE",
    instanceIds: ["item-test"]
  };
  const first = runtime.window.WS_APP.emitWorldBridgeOperationNotification({ ...base, status: "IN_PROGRESS", revision: 1 });
  const second = runtime.window.WS_APP.emitWorldBridgeOperationNotification({ ...base, status: "COMPLETED", currentStep: "COMPLETE", revision: 2 });
  const duplicate = runtime.window.WS_APP.emitWorldBridgeOperationNotification({ ...base, status: "COMPLETED", currentStep: "COMPLETE", revision: 2 });

  assert.equal(first.ok, true);
  assert.equal(first.operation, "CREATED");
  assert.equal(second.ok, true);
  assert.equal(second.operation, "UPDATED_EXISTING");
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.operation, "IGNORED_DUPLICATE");

  const entries = terminalStore.getEntries();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].correlationId, base.operationId);
  assert.equal(entries[0].revision, 2);
  assert.equal(entries[0].templateData.status, "COMPLETED");
  assert.equal(entries[0].subjectRef.id, "item-test");
});
