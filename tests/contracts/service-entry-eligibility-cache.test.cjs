"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

function createOfferTemplates(count = 65, requirements = {}) {
  return Array.from({ length: count }, (_, index) => ({
    id: `offer-${index + 1}`,
    title: `Offer ${index + 1}`,
    employerId: "employer-test",
    category: "REGULAR",
    marketCategory: "REGULAR",
    form: "AGREEMENT",
    spawn: { baseChance: 1 },
    payment: { amountRange: [1000, 1000] },
    requirements
  }));
}

function createServiceDatabase(templates) {
  return {
    serviceOfferTemplates: templates,
    serviceEmployers: [{ id: "employer-test", label: "Test Employer", employerType: "PRIVATE" }],
    serviceCategories: [],
    serviceWorkCharacters: [],
    serviceWeeklyDemandModifiers: []
  };
}

test("weekly Service eligibility resolves insurance once for the entire offer batch", () => {
  let entitlementChecks = 0;
  let installedCyberwareScans = 0;
  const runtime = createBrowserRuntime({
    wsApp: {
      isSubscriptionEntitled() {
        entitlementChecks += 1;
        return true;
      },
      getSubscriptionTierLevel(subscription) {
        return Number(subscription.tierLevel || 1);
      },
      getInstalledCyberwareInstanceViews() {
        installedCyberwareScans += 1;
        return [];
      },
      getSettlementPeriodEndIso() {
        return "2109-02-16";
      },
      formatCredits(value) {
        return `${value} ₡`;
      }
    }
  });

  runtime.loadMany(["js/service-requirements.js", "js/service-offer-generator.js"]);

  const character = {
    id: "citizen-performance",
    biologicalProfile: "BETA",
    subscriptions: [
      { subscriptionCatalogId: "sub-trauma-team", providerId: "provider-trauma-team", tierId: "trauma-t2", tierLevel: 2 },
      { subscriptionCatalogId: "sub-live-prevail", providerId: "provider-live-prevail", tierId: "lp-sustain", tierLevel: 2 },
      { subscriptionCatalogId: "sub-other", providerId: "provider-other", tierId: "other-t1", tierLevel: 1 }
    ]
  };
  const requirements = {
    insurance: {
      mode: "REQUIRED",
      acceptedProviders: ["TRAUMA"],
      minTierByProvider: { TRAUMA: 2 }
    }
  };
  const database = createServiceDatabase(createOfferTemplates(65, requirements));

  const offers = runtime.window.ServiceOfferGenerator.generateWeeklyOffers({
    character,
    database,
    settlementWeek: "2109-02-16"
  });

  assert.equal(offers.length, 65);
  assert.equal(entitlementChecks, character.subscriptions.length, "Each subscription should be resolved once, not once per offer.");
  assert.equal(installedCyberwareScans, 1, "Biochip projection should be scanned once for the batch.");
  assert.ok(offers.every((offer) => offer.eligibility?.eligible === true));

  const diagnostics = runtime.window.ServiceRequirements.getDiagnostics();
  assert.equal(diagnostics.eligibilityContextsCreated, 1);
  assert.equal(diagnostics.insuranceCoverageComputations, 1);
  assert.equal(diagnostics.subscriptionEntitlementChecks, character.subscriptions.length);
  assert.equal(diagnostics.installedCyberwareScans, 1);
});

test("weekly Service generation does not resolve insurance when no offer requires it", () => {
  let entitlementChecks = 0;
  const runtime = createBrowserRuntime({
    wsApp: {
      isSubscriptionEntitled() {
        entitlementChecks += 1;
        return true;
      },
      getInstalledCyberwareInstanceViews() {
        throw new Error("Cyberware should not be scanned without an insurance requirement.");
      },
      getSettlementPeriodEndIso() {
        return "2109-02-16";
      },
      formatCredits(value) {
        return `${value} ₡`;
      }
    }
  });

  runtime.loadMany(["js/service-requirements.js", "js/service-offer-generator.js"]);
  const database = createServiceDatabase(createOfferTemplates(65, {}));
  const offers = runtime.window.ServiceOfferGenerator.generateWeeklyOffers({
    character: { id: "citizen-no-insurance", subscriptions: [{ id: "unused" }] },
    database,
    settlementWeek: "2109-02-16"
  });

  assert.equal(offers.length, 65);
  assert.equal(entitlementChecks, 0);
  assert.equal(runtime.window.ServiceRequirements.getDiagnostics().insuranceCoverageComputations, 0);
});

test("isSubscriptionEntitled reuses a revision-aware contract snapshot and invalidates by Citizen", () => {
  const runtime = createBrowserRuntime();
  runtime.loadMany(["data/subscription-catalog.js", "js/subscription-entitlement.js"]);

  const contract = {
    subscriptionContractId: "contract-performance-trauma",
    subscriptionCatalogId: "sub-trauma-team",
    citizenId: "citizen-performance",
    providerId: "provider-trauma-team",
    tierId: "trauma-t2",
    contractStatus: "ACTIVE",
    billingStatus: "PAID",
    entitlementStatus: "ACTIVE",
    coverageTarget: { type: "CITIZEN", id: "citizen-performance" },
    startedAt: "2109-02-01",
    currentPeriodStart: "2109-02-10",
    currentPeriodEnd: "2109-02-20",
    revision: 1
  };

  for (let index = 0; index < 50; index += 1) {
    assert.equal(runtime.window.WS_APP.isSubscriptionEntitled({ ...contract }), true);
  }

  const warm = runtime.window.WS_APP.getSubscriptionEntitlementCacheStats();
  assert.equal(warm.contractSnapshotMisses, 1);
  assert.equal(warm.contractSnapshotHits, 49);
  assert.equal(warm.contractSnapshotSize, 1);

  runtime.window.dispatchEvent(new runtime.window.CustomEvent("ws:citizens-updated", {
    detail: { citizenId: contract.citizenId }
  }));
  assert.equal(runtime.window.WS_APP.isSubscriptionEntitled(contract), true);

  const invalidated = runtime.window.WS_APP.getSubscriptionEntitlementCacheStats();
  assert.equal(invalidated.contractSnapshotMisses, 2);
  assert.equal(invalidated.contractSnapshotSize, 1);
});

test("Service performance contract exposes shared eligibility and contract snapshot caches", () => {
  const requirements = read("js/service-requirements.js");
  const generator = read("js/service-offer-generator.js");
  const entitlement = read("js/subscription-entitlement.js");

  assert.match(requirements, /function createEligibilityContext/);
  assert.match(requirements, /context\.insuranceCoverage/);
  assert.match(generator, /const eligibilityContext = window\.ServiceRequirements\?\.createEligibilityContext/);
  assert.match(generator, /context\.eligibilityContext/);
  assert.match(entitlement, /const key = getContractSnapshotCacheKey/);
  assert.match(entitlement, /getCachedSubscriptionContractEntitlementSnapshot/);
  assert.match(entitlement, /app\.isSubscriptionEntitled[\s\S]*?getCachedSubscriptionContractEntitlementSnapshot/);
});
