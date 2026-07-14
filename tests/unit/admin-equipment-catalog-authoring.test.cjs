"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createRuntime() {
  const runtime = createBrowserRuntime({
    wsApp: {
      currentUser: { id: "admin-1", login: "admin", displayName: "Admin", role: "ADMIN" }
    }
  });
  runtime.loadMany([
    "data/item-type-catalog.js",
    "js/item-type-registry.js",
    "data/equipment-catalog.js",
    "js/equipment-catalog-store.js",
    "data/item-instances.js",
    "js/item-instance-store.js",
    "js/admin-equipment-catalog-authoring.js",
    "js/admin-catalog-management.js"
  ]);
  return runtime;
}

function command(app, overrides = {}) {
  return {
    actor: { actorId: "admin-1", actorRole: "ADMIN", displayName: "Admin" },
    operatorNote: "Authoring test",
    idempotencyKey: `idem-${Math.random()}`,
    expectedRevision: 0,
    ...overrides
  };
}

function newDefinition(id = "eqcat-authoring-test") {
  return {
    id,
    name: "Authoring Test Item",
    category: "UTILITY",
    subtype: "TEST_ITEM",
    itemType: "GENERIC_ITEM",
    footprint: "1x1",
    legality: "REGISTERED",
    condition: 100,
    value: 125,
    tags: ["UTILITY", "TEST"],
    itemTypeProfile: {},
    equipProfile: {}
  };
}

test("saved draft does not enter the canonical Equipment Catalog until publish", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const definition = newDefinition();
  const saved = app.saveAdminEquipmentDefinitionDraft(command(app, { definition, definitionId: definition.id }));
  assert.equal(saved.ok, true);
  assert.equal(saved.resultCode, "EQUIPMENT_DEFINITION_DRAFT_SAVED");
  assert.equal(app.getEquipmentCatalogItemById(definition.id), null);
  const published = app.publishAdminEquipmentDefinition(command(app, {
    definition,
    definitionId: definition.id,
    sourceDefinitionId: definition.id,
    expectedRevision: saved.revisionAfter
  }));
  assert.equal(published.ok, true);
  assert.equal(published.resultCode, "EQUIPMENT_DEFINITION_PUBLISHED");
  assert.equal(app.getEquipmentCatalogItemById(definition.id).name, "Authoring Test Item");
});

test("editing a seed definition preserves the seed until the authored override is published", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const original = app.getEquipmentCatalogItemById("eqcat-access-card");
  const changed = { ...original, name: "Access Card Revised" };
  const saved = app.saveAdminEquipmentDefinitionDraft(command(app, {
    definition: changed,
    definitionId: original.id,
    sourceDefinitionId: original.id
  }));
  assert.equal(saved.ok, true);
  assert.equal(app.getEquipmentCatalogItemById(original.id).name, original.name);
  const published = app.publishAdminEquipmentDefinition(command(app, {
    definition: changed,
    definitionId: original.id,
    sourceDefinitionId: original.id,
    expectedRevision: saved.revisionAfter
  }));
  assert.equal(published.ok, true);
  assert.equal(app.getEquipmentCatalogItemById(original.id).name, "Access Card Revised");
});

test("archive and restore affect canonical visibility without deleting the definition", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const definition = newDefinition("eqcat-archive-test");
  const published = app.publishAdminEquipmentDefinition(command(app, { definition, definitionId: definition.id }));
  assert.equal(published.ok, true);
  const archived = app.archiveAdminEquipmentDefinition(command(app, {
    definitionId: definition.id,
    expectedRevision: published.revisionAfter
  }));
  assert.equal(archived.ok, true);
  assert.equal(app.getEquipmentCatalogItemById(definition.id).archived, true);
  assert.equal(app.getEquipmentCatalogItems().some((entry) => entry.id === definition.id), false);
  assert.equal(app.getEquipmentCatalogItems({ includeArchived: true }).some((entry) => entry.id === definition.id), true);
  const restored = app.restoreAdminEquipmentDefinition(command(app, {
    definitionId: definition.id,
    expectedRevision: archived.revisionAfter
  }));
  assert.equal(restored.ok, true);
  assert.equal(app.getEquipmentCatalogItemById(definition.id).archived, false);
});

test("instance preview never persists an ItemInstance", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const before = app.getItemInstances({ includeDisposed: true }).length;
  const preview = app.previewAdminEquipmentDefinitionInstance({ definition: newDefinition("eqcat-preview-test") });
  const after = app.getItemInstances({ includeDisposed: true }).length;
  assert.equal(preview.ok, true);
  assert.equal(preview.resultCode, "EQUIPMENT_DEFINITION_INSTANCE_PREVIEW_READY");
  assert.equal(preview.instancePreview.definitionId, "eqcat-preview-test");
  assert.equal(preview.persistedItemInstanceCreated, false);
  assert.equal(after, before);
});

test("authoring commands enforce revision and idempotency", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const definition = newDefinition("eqcat-idempotency-test");
  const input = command(app, { definition, definitionId: definition.id, idempotencyKey: "stable-key" });
  const first = app.saveAdminEquipmentDefinitionDraft(input);
  const replay = app.saveAdminEquipmentDefinitionDraft(input);
  assert.equal(JSON.stringify(replay), JSON.stringify(first));
  const stale = app.publishAdminEquipmentDefinition(command(app, {
    definition,
    definitionId: definition.id,
    expectedRevision: 0
  }));
  assert.equal(stale.ok, false);
  assert.equal(stale.resultCode, "EQUIPMENT_CATALOG_AUTHORING_STALE_REVISION");
  const conflict = app.publishAdminEquipmentDefinition({ ...input, expectedRevision: first.revisionAfter });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.resultCode, "EQUIPMENT_CATALOG_AUTHORING_IDEMPOTENCY_CONFLICT");
});

test("Equipment authoring pack contains canonical published definitions and optional drafts", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const draft = newDefinition("eqcat-pack-draft");
  app.saveAdminEquipmentDefinitionDraft(command(app, { definition: draft, definitionId: draft.id }));
  const pack = app.buildAdminEquipmentCatalogDataPack({ includeDrafts: true });
  assert.equal(pack.schemaVersion, "equipment_catalog_authoring_pack_1");
  assert.ok(pack.definitions.some((definition) => definition.id === "eqcat-access-card"));
  assert.ok(pack.authoringRecords.some((record) => record.definitionId === draft.id && record.draftDefinition));
  assert.doesNotMatch(app.serializeAdminEquipmentCatalogDataPack(pack), /instanceId/);
});

test("create mode cannot shadow an existing seed definition without an explicit edit source", () => {
  const runtime = createRuntime();
  const app = runtime.window.WS_APP;
  const existing = app.getEquipmentCatalogItemById("eqcat-access-card");
  const attempted = { ...existing, name: "Unauthorized Shadow" };

  const preview = app.previewAdminEquipmentDefinitionInstance({
    definition: attempted,
    sourceDefinitionId: ""
  });
  assert.equal(preview.ok, false);
  assert.ok(preview.issues.some((issue) => issue.code === "EQUIPMENT_DEFINITION_ID_DUPLICATE"));

  const saved = app.saveAdminEquipmentDefinitionDraft(command(app, {
    definition: attempted,
    definitionId: attempted.id,
    sourceDefinitionId: ""
  }));
  assert.equal(saved.ok, false);
  assert.equal(saved.resultCode, "EQUIPMENT_DEFINITION_VALIDATION_FAILED");
  assert.equal(app.getEquipmentCatalogItemById(existing.id).name, existing.name);
});
