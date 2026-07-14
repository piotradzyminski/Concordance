"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createKnowledgeRuntime() {
  return createBrowserRuntime({
    appData: {
      entries: [
        {
          id: "term-service",
          registry: "encyclopedia",
          type: "TERM",
          term: "Service",
          localTerm: "Służba",
          aliases: ["Work"],
          relatedTerms: ["Citizen"]
        },
        {
          id: "term-citizen",
          registry: "encyclopedia",
          type: "TERM",
          term: "Citizen",
          localTerm: "Obywatel",
          aliases: [],
          relatedTerms: ["Service"]
        }
      ],
      systemRecords: [
        {
          id: "system-service-rule",
          registry: "system",
          type: "RULE",
          title: "SERVICE RULE",
          relatedTerms: ["Service"],
          relatedRules: ["ROLL RULE"]
        },
        {
          id: "system-roll-rule",
          registry: "system",
          type: "RULE",
          title: "ROLL RULE",
          relatedTerms: ["Citizen"],
          relatedRules: []
        },
        {
          id: "index-service",
          registry: "system-index",
          type: "INDEX_ENTRY",
          title: "SERVICE",
          relatedTerms: ["Service"],
          relatedEntries: ["CITIZEN"]
        },
        {
          id: "index-citizen",
          registry: "system-index",
          type: "INDEX_ENTRY",
          title: "CITIZEN",
          relatedTerms: ["Citizen"],
          relatedEntries: []
        }
      ]
    }
  });
}

test("Knowledge relation migration persists stable IDs and keeps label adapters", () => {
  const runtime = createKnowledgeRuntime();
  runtime.loadMany([
    "js/entries-store.js",
    "js/system-store.js",
    "js/knowledge-relations.js"
  ]);

  const service = runtime.window.WS_APP.getEntryById("term-service");
  const serviceRule = runtime.window.WS_APP.getSystemRecordById("system-service-rule");
  const indexService = runtime.window.WS_APP.getSystemRecordById("index-service");

  assert.deepEqual(Array.from(service.relatedTerms), ["term-citizen"]);
  assert.deepEqual(Array.from(serviceRule.relatedTerms), ["term-service"]);
  assert.deepEqual(Array.from(serviceRule.relatedRules), ["system-roll-rule"]);
  assert.deepEqual(Array.from(indexService.relatedEntries), ["index-citizen"]);
  assert.deepEqual(Array.from(indexService.relatedTerms), []);

  assert.equal(runtime.storage.getItem("ws_app_entries_schema"), "future-noir.knowledge.encyclopedia.v3");
  assert.equal(runtime.storage.getItem("ws_app_system_records_schema"), "future-noir.knowledge.system-records.v3");

  const byLegacyName = runtime.window.WS_APP.resolveKnowledgeRelation("Służba", "encyclopedia");
  const byStableId = runtime.window.WS_APP.resolveKnowledgeRelation("term-service", "encyclopedia");
  assert.equal(byLegacyName.id, "term-service");
  assert.equal(byStableId.id, "term-service");
  assert.deepEqual(
    Array.from(runtime.window.WS_APP.formatKnowledgeRelationRefsForEditor(["term-service"], "encyclopedia")),
    ["Service"]
  );

  const validation = runtime.window.WS_APP.validateKnowledgeRelations();
  assert.equal(validation.ok, true, JSON.stringify(validation.report));
  assert.equal(validation.report.total, 6);
  assert.equal(validation.report.alreadyCanonical, 6);
  assert.equal(validation.report.removedCrossRegistry, 0);
  assert.equal(validation.report.unresolved, 0);
});

test("Knowledge Pack v1 relation names migrate in memory to schema v3 with isolated registries", () => {
  const runtime = createKnowledgeRuntime();
  runtime.loadMany([
    "js/entries-store.js",
    "js/system-store.js",
    "js/knowledge-relations.js",
    "js/knowledge-pack-store.js"
  ]);

  const validation = runtime.window.WS_APP.validateKnowledgePack({
    schema: "future-noir.knowledge-pack",
    schemaVersion: 1,
    packId: "legacy-pack",
    packVersion: "1.0.0",
    encyclopedia: [
      {
        id: "term-service",
        term: "Service",
        relatedTerms: ["Citizen"]
      },
      {
        id: "term-citizen",
        term: "Citizen",
        relatedTerms: ["Service"]
      }
    ],
    system: [
      {
        id: "system-service-rule",
        registry: "system",
        title: "SERVICE RULE",
        relatedTerms: ["Service"],
        relatedRules: ["ROLL RULE"]
      },
      {
        id: "system-roll-rule",
        registry: "system",
        title: "ROLL RULE",
        relatedTerms: ["Citizen"],
        relatedRules: []
      }
    ],
    systemIndex: [
      {
        id: "index-service",
        registry: "system-index",
        title: "SERVICE",
        relatedTerms: ["Service"],
        relatedEntries: ["CITIZEN"]
      },
      {
        id: "index-citizen",
        registry: "system-index",
        title: "CITIZEN",
        relatedTerms: ["Citizen"],
        relatedEntries: []
      }
    ]
  });

  assert.equal(validation.ok, true, JSON.stringify(validation));
  assert.equal(validation.pack.schemaVersion, 3);
  assert.equal(validation.pack.relationSchema, "stable-id-v2");
  assert.deepEqual(Array.from(validation.pack.encyclopedia[0].relatedTerms), ["term-citizen"]);
  assert.deepEqual(Array.from(validation.pack.system[0].relatedRules), ["system-roll-rule"]);
  assert.deepEqual(Array.from(validation.pack.systemIndex[0].relatedEntries), ["index-citizen"]);
  assert.deepEqual(Array.from(validation.pack.systemIndex[0].relatedTerms), []);
  assert.equal(validation.warnings.includes("PACK_SCHEMA_MIGRATED_TO_V3"), true);
  assert.equal(validation.warnings.includes("PACK_CROSS_REGISTRY_RELATIONS_REMOVED_2"), true);
  assert.equal(validation.relationReport.removedCrossRegistry, 2);
  assert.equal(validation.relationReport.unresolved, 0);
});
