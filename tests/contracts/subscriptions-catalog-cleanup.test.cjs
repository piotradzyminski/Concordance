"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

test("Subscriptions Catalog Cleanup remains intact under Authoring 4.8x", () => {
  const runtime = createBrowserRuntime();
  runtime.loadMany(["data/subscription-catalog.js", "js/subscription-catalog-store.js"]);

  const catalog = runtime.window.APP_DATA.subscriptionCatalog;
  const definitions = runtime.window.WS_APP.initSubscriptionCatalogStore();
  const summary = runtime.window.WS_APP.getSubscriptionCatalogStatusSummary();

  assert.equal(catalog.schemaVersion, "subscription_catalog_authoring_4_8x");
  assert.equal(catalog.providers.length, 18);
  assert.equal(definitions.subscriptions.length, 26);
  assert.deepEqual({ ...summary }, {
    CANONICAL: 13,
    PROVISIONAL: 13,
    TEST_ONLY: 0,
    DEPRECATED: 0
  });

  const serialized = JSON.stringify(catalog);
  assert.doesNotMatch(serialized, /LearnMin|learnmin|sub-skill-channel|LEARNMIN_EDUCATION_ACCESS/);
  definitions.subscriptions.forEach((definition) => {
    assert.ok(["CANONICAL", "PROVISIONAL"].includes(definition.catalogStatus));
  });
});

test("Catalog schema bump discards the old v4 runtime overlay instead of merging retired records back", () => {
  const runtime = createBrowserRuntime({
    storageSeed: {
      ws_app_subscription_catalog_definitions_schema_v4: "subscription_catalog_housing_rent_4_0x",
      ws_app_subscription_catalog_definitions_v4: JSON.stringify({
        schemaVersion: "subscription_catalog_housing_rent_4_0x",
        subscriptions: [{
          subscriptionCatalogId: "sub-skill-channel",
          providerId: "provider-learnmin-access",
          title: "Skill Channel",
          tiers: [{ tierId: "learnmin-public-feed", label: "T1", amount: 1 }]
        }]
      })
    }
  });

  runtime.loadMany(["data/subscription-catalog.js", "js/subscription-catalog-store.js"]);

  const app = runtime.window.WS_APP;
  assert.equal(app.SUBSCRIPTION_CATALOG_SCHEMA_VERSION, "subscription_catalog_authoring_4_8x");
  assert.equal(app.getSubscriptionCatalogEntry("sub-skill-channel"), null);
  assert.equal(runtime.storage.getItem("ws_app_subscription_catalog_definitions_v4"), null);
  assert.equal(runtime.storage.getItem("ws_app_subscription_catalog_definitions_schema_v4"), null);
  assert.equal(
    runtime.storage.getItem("ws_app_subscription_catalog_definitions_schema_v6"),
    "subscription_catalog_authoring_4_8x"
  );
});



test("Catalog merge preserves an existing canonical status when a legacy editor overlay omits it", () => {
  const runtime = createBrowserRuntime();
  runtime.loadMany(["data/subscription-catalog.js", "js/subscription-catalog-store.js"]);
  const app = runtime.window.WS_APP;
  const current = app.getSubscriptionCatalogEntry("sub-live-prevail");

  const merged = app.mergeSubscriptionCatalogDefinitions(
    { subscriptions: [current] },
    {
      subscriptions: [{
        subscriptionCatalogId: "sub-live-prevail",
        providerId: current.providerId,
        title: "Live & Prevail",
        summary: "Edited summary without authoring status.",
        tiers: current.tiers
      }]
    }
  );

  assert.equal(merged.subscriptions[0].catalogStatus, "CANONICAL");
  assert.equal(merged.subscriptions[0].summary, "Edited summary without authoring status.");
});

test("Retired seed contracts and their direct references are removed from normal campaign data", () => {
  const runtime = createBrowserRuntime();
  runtime.loadMany([
    "js/subscription-data-cleanup.js",
    "data/citizens.js",
    "data/item-instances.js"
  ]);

  const app = runtime.window.WS_APP;
  const retiredIds = Array.from(app.RETIRED_SUBSCRIPTION_SEED_CONTRACT_IDS);
  const allContracts = runtime.window.APP_DATA.citizens.flatMap((citizen) => citizen.subscriptions || []);
  const serializedItems = JSON.stringify(runtime.window.APP_DATA.itemInstances || []);
  const serializedCitizens = JSON.stringify(runtime.window.APP_DATA.citizens || []);

  assert.equal(app.SUBSCRIPTION_DATA_CLEANUP_VERSION, "subscriptions_catalog_cleanup_4_7x");
  assert.deepEqual(Array.from(app.cleanSubscriptionSeedContractList([
    { subscriptionContractId: retiredIds[0] },
    { subscriptionContractId: "real-contract" }
  ]), (item) => item.subscriptionContractId), ["real-contract"]);
  assert.equal(app.cleanRetiredSubscriptionReference(retiredIds[1], null), null);

  retiredIds.forEach((id) => {
    assert.equal(allContracts.some((contract) => contract.subscriptionContractId === id), false);
    assert.doesNotMatch(serializedItems, new RegExp(id));
    assert.doesNotMatch(serializedCitizens, new RegExp(id));
  });

  assert.equal(
    allContracts.some((contract) => contract.subscriptionContractId === "sub-mara-chen-live-prevail"),
    true,
    "Non-test world contracts remain in the campaign seed."
  );
});

test("Cleanup helper is applied by Citizen and ItemInstance normalization and retired provider manifests are absent", () => {
  const store = read("js/store.js");
  const itemStore = read("js/item-instance-store.js");
  const organizations = read("data/organizations.js");
  const notificationProviders = read("data/notification-provider-capabilities.js");
  const index = read("index.html");
  const modules = read("js/modules.js");

  assert.match(store, /cleanSubscriptionSeedContractList/);
  assert.match(store, /cleanRetiredSubscriptionReference/);
  assert.match(itemStore, /normalizeAuthorizationRefs/);
  assert.match(itemStore, /cleanRetiredSubscriptionReference/);

  assert.doesNotMatch(organizations, /learnmin-access|LearnMin Access/);
  assert.doesNotMatch(notificationProviders, /provider-learnmin-access|learnmin-access/);

  assert.match(index, /data\/citizens\.js\?v=80/);
  assert.match(index, /data\/item-instances\.js\?v=10/);
  assert.match(index, /data\/organizations\.js\?v=2/);
  assert.match(index, /data\/notification-provider-capabilities\.js\?v=5/);
  assert.match(index, /data\/subscription-catalog\.js\?v=15/);
  assert.match(index, /js\/subscription-data-cleanup\.js\?v=1/);
  assert.match(index, /js\/item-instance-store\.js\?v=17/);
  assert.match(index, /js\/store\.js\?v=147/);
  assert.match(index, /js\/subscription-catalog-store\.js\?v=10/);
  assert.match(index, /js\/modules\.js\?v=318/);

  assert.match(modules, /data\/subscription-catalog\.js\?v=15/);
  assert.match(modules, /js\/subscription-catalog-store\.js\?v=10/);
});
