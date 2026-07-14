"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

test("Subscriptions Catalog Presentation 4.4 preserves product, contract and provider profile layouts", () => {
  const source = read("js/subscriptions.js");

  assert.match(source, /version:\s*"subscriptions_catalog_presentation_4_4"/);
  assert.match(source, /function renderPlayerCatalogServiceProfile/);
  assert.match(source, /function renderPlayerSubscriptionProfile/);
  assert.match(source, /function renderSubscriptionProviderProfile/);
  assert.match(source, /subscription-profile-layout-v41/);
  assert.match(source, /PACKAGE COMPARISON/);
  assert.match(source, /CONTRACT STATUS/);
  assert.match(source, /ACTIVE ENTITLEMENTS/);
  assert.match(source, /TARGET MANAGEMENT/);
  assert.match(source, /button\.closest\("\.subscription-target-control"\)/);
  assert.match(source, /PROVIDER SERVICES/);
  assert.match(source, /ORGANIZATION REGISTERED/);
  assert.match(source, /function getSubscriptionTierIdForUi/);
  assert.match(source, /prepareSubscriptionProfileRender/);
  assert.match(source, /getSubscriptionTierIdForUi\(item\) === String\(tierId/);
});

test("Profile projections combine catalog and tier entitlements and expose quantified coverage", () => {
  const runtime = createBrowserRuntime();
  runtime.context.parseCreditValue = (value) => Number(value || 0);
  runtime.context.formatCreditNumber = (value) => `${Number(value || 0)} ₡`;
  runtime.load("js/subscriptions.js");

  const profiles = runtime.window.WS_APP.subscriptionProfiles;
  assert.equal(profiles.version, "subscriptions_catalog_presentation_4_4");

  const service = {
    entitlementCodes: ["BASE_ACCESS", "SHARED"],
    coverageRules: [
      {
        coverageRuleId: "medical",
        coverageCode: "MEDICAL_COVERAGE",
        benefitsByTierId: {
          t2: { calculation: "PERCENT_CAP", percent: 80, maxAmount: 12000 }
        }
      },
      {
        coverageRuleId: "replacement",
        benefitsByTierId: {
          t2: { calculation: "FULL" }
        }
      }
    ]
  };
  const tier = { tierId: "t2", entitlementCodes: ["TIER_ACCESS", "SHARED"] };

  assert.equal(profiles.getTierId(tier), "t2");
  assert.equal(profiles.getTierId({ id: "legacy-t1" }), "legacy-t1");
  assert.deepEqual(Array.from(profiles.getTierEntitlements(service, tier)), ["BASE_ACCESS", "SHARED", "TIER_ACCESS"]);
  assert.deepEqual(
    Array.from(profiles.getTierCoverage(service, tier), (entry) => ({ code: entry.code, value: entry.value })),
    [
      { code: "MEDICAL_COVERAGE", value: "80% / CAP 12000 ₡" },
      { code: "replacement", value: "FULL COVERAGE" }
    ]
  );
});

test("Provider profiles use Organization Store facts without generated address or network fallbacks", () => {
  const source = read("js/subscriptions.js");
  const resolverStart = source.indexOf("function resolveSubscriptionProviderOrganizationProfile");
  const resolverEnd = source.indexOf("function getSubscriptionProviderDefinition", resolverStart);
  const resolver = source.slice(resolverStart, resolverEnd);
  const definitionStart = resolverEnd;
  const definitionEnd = source.indexOf("function buildProviderLogoFallback", definitionStart);
  const definition = source.slice(definitionStart, definitionEnd);

  assert.match(resolver, /getOrganizationById/);
  assert.match(resolver, /getOrganizationByProviderId/);
  assert.match(resolver, /getPrimaryOrganizationLocation/);
  assert.match(resolver, /organizationResolved:\s*false[\s\S]*headquarters:\s*""[\s\S]*networkCode:\s*""/);
  assert.doesNotMatch(resolver, /buildProviderHeadquarters|buildProviderNetworkCode/);
  assert.doesNotMatch(source, /function buildProviderHeadquarters|function buildProviderNetworkCode/);
  assert.match(definition, /organizationProfile\.headquarters/);
  assert.match(definition, /organizationProfile\.networkCode/);
});

test("Profiles CSS and entrypoint versions are registered canonically", () => {
  const css = read("css/subscriptions.css");
  const modules = read("js/modules.js");
  const index = read("index.html");

  assert.match(css, /Subscriptions Profiles UI 4\.1/);
  assert.match(css, /\.subscription-profile-hero-v41/);
  assert.match(css, /\.subscription-profile-layout-v41/);
  assert.match(css, /\.subscription-tier-comparison-row/);
  assert.match(css, /\.subscription-contract-dashboard-v41/);
  assert.match(css, /@media \(max-width: 980px\)/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media \(max-width: 520px\)/);

  assert.match(modules, /css\/subscription-action-feedback\.css\?v=1/);
  assert.match(modules, /css\/subscriptions\.css\?v=21/);
  assert.match(modules, /js\/subscriptions\.js\?v=34/);

  assert.match(index, /js\/modules\.js\?v=297/);
  assert.doesNotMatch(index, /<script[^>]+js\/subscriptions\.js/);
});
