"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

test("Subscriptions Catalog Presentation 4.4 provides structured presentation for every seed product and tier", () => {
  const runtime = createBrowserRuntime();
  runtime.loadMany(["data/subscription-catalog.js", "js/subscription-catalog-store.js"]);
  const app = runtime.window.WS_APP;
  const definitions = app.initSubscriptionCatalogStore();

  assert.equal(definitions.subscriptions.length, 20);
  definitions.subscriptions.forEach((product) => {
    assert.ok(product.presentation.overview, `${product.subscriptionCatalogId} overview`);
    assert.ok(product.presentation.benefits.length >= 1, `${product.subscriptionCatalogId} benefits`);
    assert.ok(product.presentation.limitations.length >= 2, `${product.subscriptionCatalogId} limitations`);
    assert.ok(product.presentation.usageNotes.length >= 2, `${product.subscriptionCatalogId} usage notes`);
    assert.equal(product.presentation.comparisonAxes.length, 5, `${product.subscriptionCatalogId} axes`);
    assert.ok(product.tiers.length >= 1, `${product.subscriptionCatalogId} tiers`);
    product.tiers.forEach((tier) => {
      assert.ok(tier.presentation.features.length >= 1, `${tier.tierId} features`);
      assert.ok(tier.presentation.priorityLabel, `${tier.tierId} priority`);
      assert.ok(tier.presentation.comparisonValues.scope, `${tier.tierId} comparison scope`);
      assert.ok(tier.presentation.comparisonValues.limit, `${tier.tierId} comparison limit`);
    });
  });
});

test("Catalog normalization and serialization preserve presentation without turning prose into tokens", () => {
  const runtime = createBrowserRuntime();
  runtime.loadMany(["data/subscription-catalog.js", "js/subscription-catalog-store.js"]);
  const app = runtime.window.WS_APP;
  const normalized = app.normalizeSubscriptionDefinition({
    subscriptionCatalogId: "sub-test-presentation",
    title: "Test Presentation",
    providerId: "provider-test",
    description: "Readable mixed-case description.",
    presentation: {
      overview: "Readable overview.",
      benefits: ["First benefit", "Second benefit"],
      limitations: ["One exact limit"],
      usageNotes: ["Keep Mixed Case"],
      comparisonAxes: ["Included Scope", "Limits", "Priority", "Target", "Price / Action"]
    },
    tiers: [{
      tierId: "test-tier",
      label: "Test Tier",
      description: "Tier-readable description.",
      presentation: {
        features: ["Readable feature"],
        limits: ["Readable limit"],
        priorityLabel: "STANDARD",
        comparisonValues: { scope: "Scope", access: "Access", limit: "Limit", priority: "STANDARD" }
      }
    }]
  });
  const serialized = app.serializeSubscriptionDefinition(normalized);

  assert.deepEqual(Array.from(serialized.presentation.benefits), ["First benefit", "Second benefit"]);
  assert.deepEqual(Array.from(serialized.presentation.usageNotes), ["Keep Mixed Case"]);
  assert.deepEqual(Array.from(serialized.tiers[0].presentation.features), ["Readable feature"]);
  assert.equal(serialized.tiers[0].presentation.comparisonValues.priority, "STANDARD");
});

test("Player profiles render benefit, limitation, usage and presentation-first tier comparison", () => {
  const source = read("js/subscriptions.js");
  const css = read("css/subscriptions.css");
  const modules = read("js/modules.js");
  const index = read("index.html");

  assert.match(source, /version:\s*"subscriptions_catalog_presentation_4_4"/);
  assert.match(source, /function getSubscriptionProductPresentation/);
  assert.match(source, /function getSubscriptionTierPresentation/);
  assert.match(source, /SERVICE PRESENTATION/);
  assert.match(source, /Benefits, Limits & Use/);
  assert.match(source, /INCLUDED SCOPE/);
  assert.match(source, /Technical access/);
  assert.match(source, /renderSubscriptionTierPresentationSummary/);

  assert.match(css, /Subscriptions Catalog Presentation 4\.4/);
  assert.match(css, /\.subscription-product-presentation-grid-v44/);
  assert.match(css, /\.subscription-tier-priority-v44/);
  assert.match(css, /\.subscription-tier-technical-v44/);

  assert.match(modules, /data\/subscription-catalog\.js\?v=12/);
  assert.match(modules, /js\/subscription-catalog-store\.js\?v=7/);
  assert.match(modules, /css\/subscriptions\.css\?v=21/);
  assert.match(modules, /js\/subscriptions\.js\?v=34/);
  assert.match(index, /js\/modules\.js\?v=295/);
});
