"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

function loadAuthoringRuntime(options = {}) {
  const runtime = createBrowserRuntime(options);
  runtime.loadMany([
    "data/organizations.js",
    "js/organization-store.js",
    "data/subscription-catalog.js",
    "js/subscription-catalog-store.js",
    "js/admin-subscription-catalog-authoring.js"
  ]);
  return runtime;
}

test("Subscription Catalog Authoring 4.8x is a lazy Admin Catalog Management capability", () => {
  const modules = read("js/modules.js");
  const renderer = read("js/admin/workspaces/admin-workspace-catalog-management.js");
  const adapter = read("js/admin-catalog-management.js");
  const authoring = read("js/admin-subscription-catalog-authoring.js");
  const css = read("css/admin-subscription-catalog-authoring.css");
  const index = read("index.html");
  const legacyEditor = read("js/subscription-catalog-editor.js");

  assert.match(modules, /"admin-workspace-catalog-management":\s*\{[\s\S]*admin-subscription-catalog-authoring\.css\?v=1[\s\S]*admin-subscription-catalog-authoring\.js\?v=1[\s\S]*admin-catalog-management\.js\?v=3[\s\S]*admin-workspace-catalog-management\.js\?v=3/);
  assert.match(renderer, /AdminSubscriptionCatalogAuthoring\?\.renderAuthoringPanel/);
  assert.match(renderer, /AdminSubscriptionCatalogAuthoring\?\.bindAuthoring/);
  assert.match(adapter, /authoringStatus: "AVAILABLE_IN_ADMIN"/);
  assert.match(authoring, /createSubscriptionDefinition/);
  assert.match(authoring, /updateSubscriptionDefinition/);
  assert.match(authoring, /duplicateSubscriptionDefinition/);
  assert.match(authoring, /archiveSubscriptionDefinition/);
  assert.match(authoring, /restoreSubscriptionDefinition/);
  assert.match(authoring, /deleteSubscriptionDefinition/);
  assert.match(authoring, /applySubscriptionCatalogPack/);
  assert.match(authoring, /Stable tier ID/);
  assert.match(authoring, /Coverage rules JSON/);
  assert.match(css, /subscription-authoring-tier/);
  assert.match(legacyEditor, /Catalog authoring moved to Admin/);
  assert.match(legacyEditor, /legacy System form is read-only/);
  assert.doesNotMatch(index, /admin-subscription-catalog-authoring\.js/);
});

test("CRUD uses stable IDs, provider identity, revision guards and one catalog persistence owner", () => {
  const runtime = loadAuthoringRuntime();
  const app = runtime.window.WS_APP;
  const template = app.AdminSubscriptionCatalogAuthoring.createDefinitionTemplate();
  const definition = {
    ...template,
    subscriptionCatalogId: "sub-authoring-test",
    productCode: "AUTHORING_TEST",
    title: "Authoring Test",
    providerId: "provider-trauma-team",
    tiers: [{
      tierId: "authoring-test-t1",
      tierLevel: 1,
      label: "T1 Test",
      amount: 100,
      billingCycle: "WEEKLY",
      durationDays: 7,
      description: "Test tier.",
      entitlementCodes: ["AUTHORING_TEST_T1"],
      coverageRuleIds: [],
      active: true,
      revision: 1
    }]
  };

  const created = app.createSubscriptionDefinition({ definition, idempotencyKey: "create-authoring-test" });
  assert.equal(created.ok, true);
  assert.equal(created.resultCode, "SUBSCRIPTION_DEFINITION_CREATED");
  assert.equal(created.definition.providerId, "provider-trauma-team");
  assert.equal(created.definition.organizationId, "trauma-team");
  assert.equal(created.definition.market, "PRIVATE");
  assert.equal(created.revisionAfter, 1);

  const replay = app.createSubscriptionDefinition({ definition, idempotencyKey: "create-authoring-test" });
  assert.deepEqual({ ...replay }, { ...created });

  const conflict = app.updateSubscriptionDefinition("sub-authoring-test", { ...created.definition, summary: "Conflict" }, {
    expectedRevision: 99,
    idempotencyKey: "update-conflict"
  });
  assert.equal(conflict.resultCode, "SUBSCRIPTION_DEFINITION_REVISION_CONFLICT");

  const updated = app.updateSubscriptionDefinition("sub-authoring-test", {
    ...created.definition,
    summary: "Updated summary",
    tiers: [{ ...created.definition.tiers[0], amount: 150 }]
  }, {
    expectedRevision: 1,
    idempotencyKey: "update-authoring-test"
  });
  assert.equal(updated.ok, true);
  assert.equal(updated.revisionAfter, 2);
  assert.equal(updated.definition.tiers[0].revision, 2);

  const immutable = app.updateSubscriptionDefinition("sub-authoring-test", {
    ...updated.definition,
    subscriptionCatalogId: "sub-renamed"
  }, { expectedRevision: 2, idempotencyKey: "rename-authoring-test" });
  assert.equal(immutable.resultCode, "SUBSCRIPTION_DEFINITION_ID_IMMUTABLE");

  const deleted = app.deleteSubscriptionDefinition("sub-authoring-test", {
    expectedRevision: 2,
    operatorNote: "Test cleanup",
    idempotencyKey: "delete-authoring-test"
  });
  assert.equal(deleted.ok, true);
  assert.equal(app.getSubscriptionCatalogEntry("sub-authoring-test"), null);
  assert.equal(runtime.storage.getItem("ws_app_subscription_catalog_definitions_schema_v6"), "subscription_catalog_authoring_4_8x");
});

test("v5 cleanup snapshot migrates to v6 and full-snapshot persistence does not resurrect deleted seed definitions", () => {
  const seedRuntime = createBrowserRuntime();
  seedRuntime.loadMany(["data/subscription-catalog.js"]);
  const v5 = JSON.stringify({
    schemaVersion: "subscription_catalog_cleanup_4_7x",
    subscriptions: seedRuntime.window.APP_DATA.subscriptionCatalogDefinitions.subscriptions.filter((definition) => definition.subscriptionCatalogId !== "sub-afterlife-ledger")
  });

  const runtime = loadAuthoringRuntime({
    storageSeed: {
      ws_app_subscription_catalog_definitions_schema_v5: "subscription_catalog_cleanup_4_7x",
      ws_app_subscription_catalog_definitions_v5: v5
    }
  });
  const app = runtime.window.WS_APP;

  assert.equal(app.getSubscriptionCatalogEntry("sub-afterlife-ledger"), null);
  assert.equal(runtime.storage.getItem("ws_app_subscription_catalog_definitions_schema_v5"), null);
  assert.equal(runtime.storage.getItem("ws_app_subscription_catalog_definitions_v5"), null);
  assert.equal(runtime.storage.getItem("ws_app_subscription_catalog_definitions_schema_v6"), "subscription_catalog_authoring_4_8x");

  const persisted = runtime.storage.getItem("ws_app_subscription_catalog_definitions_v6");
  const reload = loadAuthoringRuntime({
    storageSeed: {
      ws_app_subscription_catalog_definitions_schema_v6: "subscription_catalog_authoring_4_8x",
      ws_app_subscription_catalog_definitions_v6: persisted
    }
  });
  assert.equal(reload.window.WS_APP.getSubscriptionCatalogEntry("sub-afterlife-ledger"), null);
});

test("Subscription packs support preview, merge apply and replacement apply", () => {
  const runtime = loadAuthoringRuntime();
  const app = runtime.window.WS_APP;
  const pack = app.exportSubscriptionCatalogPack();
  const incoming = structuredClone(pack.definitions[0]);
  incoming.summary = "Imported summary";
  const added = structuredClone(pack.definitions[1]);
  added.subscriptionCatalogId = "sub-imported-authoring";
  added.id = "sub-imported-authoring";
  added.productCode = "IMPORTED_AUTHORING";
  added.title = "Imported Authoring";
  added.catalogStatus = "PROVISIONAL";
  added.revision = 1;
  added.tiers = added.tiers.map((tier, index) => ({ ...tier, tierId: `imported-tier-${index + 1}`, revision: 1 }));

  const importPack = { ...pack, definitions: [incoming, added] };
  const preview = app.previewSubscriptionCatalogPack(importPack);
  assert.equal(preview.ok, true);
  assert.equal(preview.added, 1);
  assert.equal(preview.changed, 1);
  assert.equal(preview.canApply, true);

  const merged = app.importSubscriptionCatalogPack(importPack, { mode: "MERGE" });
  assert.equal(merged.ok, true);
  assert.equal(app.getSubscriptionCatalogEntry("sub-imported-authoring").title, "Imported Authoring");
  assert.ok(app.getSubscriptionCatalog({ includeArchived: true, includeTestOnly: true, includeDeprecated: true }).length > 2);

  const replaced = app.importSubscriptionCatalogPack(importPack, { mode: "REPLACE" });
  assert.equal(replaced.ok, true);
  assert.equal(app.getSubscriptionCatalog({ includeArchived: true, includeTestOnly: true, includeDeprecated: true }).length, 2);
});

test("hard delete is blocked while campaign contracts reference the product", () => {
  const runtime = loadAuthoringRuntime({
    appData: {
      citizens: [{
        id: "citizen-ref",
        subscriptions: [{
          subscriptionContractId: "contract-ref",
          subscriptionCatalogId: "sub-live-prevail",
          contractStatus: "ACTIVE"
        }]
      }]
    }
  });
  const output = runtime.window.WS_APP.deleteSubscriptionDefinition("sub-live-prevail", {
    operatorNote: "Attempt delete",
    idempotencyKey: "delete-referenced"
  });
  assert.equal(output.ok, false);
  assert.equal(output.resultCode, "SUBSCRIPTION_DEFINITION_REFERENCED");
  assert.equal(output.references.length, 1);
});
