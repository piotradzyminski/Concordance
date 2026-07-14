"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");
const { recordEvents } = require("../helpers/event-recorder.cjs");

function loadCampaignDataIo(runtime) {
  runtime.loadMany([
    "js/admin-audit-store.js",
    "js/campaign-data-io-registry.js",
    "js/campaign-data-io-adapters.js",
    "js/campaign-data-io-v6.js"
  ]);
}

test("Campaign Snapshot v6 round-trips active operations, notifications and stable IDs", () => {
  const runtime = createBrowserRuntime({
    storageSeed: {
      ws_app_citizens_v1: JSON.stringify([{ id: "citizen-test", revision: 7 }]),
      ws_app_citizen_files_v1: JSON.stringify([{ fileId: "citizen-file-test", id: "citizen-file-test", citizenId: "citizen-test", title: "Test file", status: "ACTIVE", relatedCaseFileIds: ["case-test"], revision: 1 }]),
      ws_app_citizen_files_schema: "citizen_files_record_relations_1_0x",
      ws_app_case_files_v1: JSON.stringify([{ id: "case-test", caseNumber: "CF-2109-0001", title: "Test case", relatedCitizens: ["citizen-test"], relatedCitizenFileIds: ["citizen-file-test"] }]),
      ws_world_bridge_operations_v1: JSON.stringify({ schemaVersion: 1, storeRevision: 3, operations: [{ operationId: "operation-active", citizenId: "citizen-test", status: "IN_PROGRESS", revision: 4 }] }),
      ws_app_terminal_entries_v1: JSON.stringify([{ id: "notification-test", citizenId: "citizen-test", correlationId: "operation-active", revision: 4, dedupeKey: "world-operation:operation-active" }]),
      ws_service_bridge_store_v1: JSON.stringify({ schemaVersion: 1, revision: 2, offers: [], orders: [{ serviceOrderId: "service-test" }], idempotency: [] }),
      ws_service_bridge_schema: "service_bridge_foundation_2_0x",
      ws_admin_audit_store_v2: JSON.stringify({
        schemaVersion: "admin_audit_store_3_0x",
        nextSequence: 2,
        events: [{
          schemaVersion: 1,
          auditEventId: "AAE-00000001",
          sequence: 1,
          actor: { actorId: "admin", actorRole: "ADMIN", displayName: "Admin" },
          workspace: "DATA_SETTINGS",
          sourceCommand: "TEST_AUDIT",
          category: "DATA_IO",
          citizenId: "",
          targetRefs: [{ type: "SYSTEM", id: "CAMPAIGN" }],
          request: { idempotencyKey: "audit-test", correlationId: "", payloadHash: "fnv1a32:00000000" },
          result: { status: "SUCCEEDED", resultCode: "TEST_AUDIT", message: "Audit test" },
          domainRefs: {},
          previousRevision: null,
          nextRevision: null,
          summary: "Audit test",
          metadata: {},
          createdAt: "2109-02-13T12:00:00.000Z"
        }]
      })
    }
  });
  loadCampaignDataIo(runtime);
  const businessEvents = recordEvents(runtime.window, [
    "ws:billing-transaction-updated",
    "ws:item-instances-updated",
    "ws:world-bridge-operation-updated",
    "ws:service-order-updated"
  ]);

  const snapshot = runtime.window.WS_APP.exportCampaignSnapshotV6({ flush: false, campaignId: "test-campaign" });
  const validation = runtime.window.WS_APP.validateCampaignSnapshotV6(snapshot);
  assert.equal(validation.ok, true, JSON.stringify(validation.error));
  assert.equal(snapshot.activeOperations.count, 1);
  assert.deepEqual(Array.from(snapshot.activeOperations.operationIds), ["operation-active"]);

  const reset = runtime.window.WS_APP.resetCampaignStateV6();
  assert.equal(reset.ok, true, JSON.stringify(reset));
  assert.equal(runtime.storage.getItem("ws_app_citizens_v1"), null);

  const imported = runtime.window.WS_APP.importCampaignSnapshotV6(snapshot);
  assert.equal(imported.ok, true, JSON.stringify(imported));
  assert.equal(imported.activeOperationCount, 1);
  assert.deepEqual(JSON.parse(runtime.storage.getItem("ws_app_citizens_v1")), [{ id: "citizen-test", revision: 7 }]);
  assert.equal(JSON.parse(runtime.storage.getItem("ws_app_citizen_files_v1"))[0].fileId, "citizen-file-test");
  assert.equal(runtime.storage.getItem("ws_app_citizen_files_schema"), "citizen_files_record_relations_1_0x");
  assert.equal(JSON.parse(runtime.storage.getItem("ws_app_case_files_v1"))[0].relatedCitizenFileIds[0], "citizen-file-test");
  assert.equal(JSON.parse(runtime.storage.getItem("ws_world_bridge_operations_v1")).operations[0].operationId, "operation-active");
  assert.equal(JSON.parse(runtime.storage.getItem("ws_app_terminal_entries_v1"))[0].dedupeKey, "world-operation:operation-active");
  assert.equal(JSON.parse(runtime.storage.getItem("ws_admin_audit_store_v2")).events[0].auditEventId, "AAE-00000001");
  assert.equal(businessEvents.records.length, 0, "Import must not emit new business events.");
  businessEvents.stop();
});
