"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

function createRuntime() {
  const citizens = [
    {
      id: "citizen-a",
      legalName: "Łucja Vale",
      shortId: "A-01",
      subscriptions: [
        {
          subscriptionContractId: "contract-kagami-a",
          subscriptionCatalogId: "sub-kagami",
          citizenId: "citizen-a",
          providerId: "provider-kagami",
          tierId: "k2",
          contractStatus: "ACTIVE",
          billingStatus: "OVERDUE",
          entitlementStatus: "BLOCKED",
          coverageTarget: { type: "CITIZEN", id: "citizen-a" },
          amount: 900,
          billingCycle: "WEEKLY",
          displaySnapshot: { title: "Kagami Secure", provider: "Kagami Kaisha", tierLabel: "K2", category: "CYBERSECURITY", market: "PRIVATE" }
        }
      ]
    },
    {
      id: "citizen-b",
      legalName: "Iris Vale",
      shortId: "B-01",
      subscriptions: [
        {
          subscriptionContractId: "contract-live-b",
          subscriptionCatalogId: "sub-live",
          citizenId: "citizen-b",
          providerId: "provider-live",
          tierId: "lp2",
          contractStatus: "ACTIVE",
          billingStatus: "PAID",
          entitlementStatus: "ACTIVE",
          coverageTarget: { type: "CITIZEN", id: "citizen-b" },
          amount: 1200,
          billingCycle: "WEEKLY",
          displaySnapshot: { title: "Live & Prevail", provider: "Live & Prevail", tierLabel: "Sustain", category: "INSURANCE", market: "SYSTEM" }
        }
      ]
    }
  ];
  const catalog = [
    { subscriptionCatalogId: "sub-kagami", providerId: "provider-kagami", provider: "Kagami Kaisha", title: "Kagami Secure", category: "CYBERSECURITY", market: "PRIVATE", entitlementCodes: ["SECURE_ACCESS"], targetPolicy: { allowedTargetTypes: ["CITIZEN"] }, tiers: [{ tierId: "k2", label: "K2", amount: 900, active: true }] },
    { subscriptionCatalogId: "sub-live", providerId: "provider-live", provider: "Live & Prevail", title: "Live & Prevail", category: "INSURANCE", market: "SYSTEM", entitlementCodes: ["MEDICAL_ACCESS"], targetPolicy: { allowedTargetTypes: ["CITIZEN"] }, tiers: [{ tierId: "lp2", label: "Sustain", amount: 1200, active: true }] }
  ];

  const runtime = createBrowserRuntime({
    wsApp: {
      currentUser: { login: "admin", role: "admin" },
      getCitizens: () => citizens,
      getSubscriptionCatalog: () => catalog,
      getCitizenDisplayName: (citizen) => citizen.legalName,
      getCitizenShortId: (citizen) => citizen.shortId,
      SubscriptionAPI: {
        getCitizenSubscriptionContracts: (citizenId) => citizens.find((citizen) => citizen.id === citizenId)?.subscriptions || [],
        getSubscriptionCatalogEntry: (catalogId) => catalog.find((entry) => entry.subscriptionCatalogId === catalogId) || null,
        validateSubscriptionTarget: ({ coverageTarget }) => ({ valid: true, coverageTarget, errors: [], reasons: [] }),
        getEligibleSubscriptionTargets: ({ citizenId }) => [{ coverageTarget: { type: "CITIZEN", id: citizenId }, valid: true, available: true }],
        resolveSubscriptionEntitlement: ({ entitlementCode }) => ({ allowed: entitlementCode === "MEDICAL_ACCESS", status: entitlementCode === "MEDICAL_ACCESS" ? "ACTIVE" : "BLOCKED", reasons: entitlementCode === "MEDICAL_ACCESS" ? [] : [{ code: "BILLING_OVERDUE" }] })
      }
    }
  });
  runtime.load("js/admin-subscriptions-control.js");
  return runtime;
}

test("Subscriptions Actions & Feedback 4.3 preserves one filtered contract index and shared state", () => {
  const runtime = createRuntime();
  const control = runtime.window.WS_APP.AdminSubscriptionsControl;

  assert.equal(control.version, "subscriptions_responsive_accessibility_4_5");
  assert.equal(control.normalizeSearchText("ŁUCJA / Ochrona"), "lucja ochrona");

  const rows = control.buildContractRows();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].contractId, "contract-kagami-a");
  assert.equal(rows[1].contractId, "contract-live-b");

  const filtered = control.filterContractRows(rows, {
    query: "lucja kagami",
    citizenId: "ALL",
    providerId: "ALL",
    subscriptionCatalogId: "ALL",
    billingStatus: "OVERDUE",
    entitlementStatus: "BLOCKED",
    targetType: "CITIZEN",
    tierId: "ALL",
    sort: "ATTENTION"
  });
  assert.deepEqual(Array.from(filtered, (row) => row.contractId), ["contract-kagami-a"]);

  const state = control.setState({ query: "kagami", citizenId: "citizen-a" });
  assert.equal(runtime.window.WS_APP.adminSubscriptionUiState, state);
  assert.equal(state.query, "kagami");
  assert.equal(state.citizenId, "citizen-a");
});

test("Admin subscription workspace renders aligned filters, profile sections and command-bound actions", () => {
  const runtime = createRuntime();
  const control = runtime.window.WS_APP.AdminSubscriptionsControl;
  const html = control.renderWorkspace({ user: runtime.window.WS_APP.currentUser });

  assert.match(html, /ADMIN \/ SUBSCRIPTION CONTROL/);
  assert.match(html, /Citizen, provider, product or contract ID/);
  assert.match(html, /CONTRACT STATUS/);
  assert.match(html, /ACTIVE ENTITLEMENTS/);
  assert.match(html, /COVERAGE TARGET/);
  assert.match(html, /ADMINISTRATIVE ACTIONS/);
  assert.match(html, /data-admin-subscriptions-action-form="TIER"/);
  assert.match(html, /data-admin-subscriptions-action-form="BILLING"/);
  assert.match(html, /data-admin-subscriptions-action-form="TARGET"/);
  assert.match(html, /data-admin-subscriptions-command="SUSPEND"/);
  assert.match(html, /data-admin-subscriptions-command="CANCEL"/);
  assert.match(html, /All mutations use SubscriptionAPI/);
  assert.match(html, /admin-subscription-action-hint/);
});

test("Admin workspace registry, lazy bundle and cache versions are canonical", () => {
  const registry = read("js/admin/admin-workspace-registry.js");
  const modules = read("js/modules.js");
  const adminControl = read("js/admin-control.js");
  const subscriptionRenderer = read("js/admin/workspaces/admin-workspace-subscriptions.js");
  const css = read("css/admin-subscriptions.css");
  const index = read("index.html");

  assert.match(registry, /id: "subscriptions"[\s\S]*bundleId: "admin-workspace-subscriptions"/);
  assert.match(modules, /"admin-workspace-subscriptions":\s*\{[\s\S]*css\/subscription-action-feedback\.css\?v=1[\s\S]*css\/admin-subscriptions\.css\?v=3[\s\S]*js\/subscription-action-feedback\.js\?v=1[\s\S]*js\/admin-subscriptions-control\.js\?v=4/);
  assert.match(modules, /js\/admin\/admin-workspace-registry\.js\?v=5/);
  assert.match(modules, /js\/admin-control\.js\?v=66/);
  assert.match(subscriptionRenderer, /controller\?\.renderWorkspace/);
  assert.match(adminControl, /AdminSubscriptionsControl\.renderInspector/);
  assert.match(adminControl, /AdminSubscriptionsControl\?\.bind/);
  assert.match(css, /Subscriptions Admin UI Alignment 4\.2/);
  assert.match(css, /\.admin-subscription-control-layout/);
  assert.match(css, /\.admin-subscription-profile/);
  assert.match(css, /Subscriptions Admin UI Stability 4\.2\.1/);
  assert.match(read("js/admin-subscriptions-control.js"), /captureScrollPosition[\s\S]*restoreScrollPosition/);
  assert.match(read("js/admin-subscriptions-control.js"), /getCommandPreview[\s\S]*confirmAction/);
  assert.match(index, /js\/modules\.js\?v=302/);
});
