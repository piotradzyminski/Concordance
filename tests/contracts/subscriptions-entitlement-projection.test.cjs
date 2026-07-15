"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

function createProjectionRuntime() {
  const catalog = [
    {
      subscriptionCatalogId: "sub-civic",
      providerId: "provider-civic",
      organizationId: "org-civic",
      provider: "Civic Provider",
      title: "Civic Access",
      category: "OTHER",
      active: true,
      revision: 1,
      entitlementCodes: ["CIVIC_ACCESS"],
      targetPolicy: { allowedTargetTypes: ["CITIZEN"], defaultTargetType: "CITIZEN" },
      tiers: [{ tierId: "t1", label: "T1", amount: 100, active: true, revision: 1 }]
    },
    {
      subscriptionCatalogId: "sub-asset",
      providerId: "provider-asset",
      organizationId: "org-asset",
      provider: "Asset Provider",
      title: "Asset Access",
      category: "CYBERWARE",
      active: true,
      revision: 1,
      entitlementCodes: ["ASSET_ACCESS"],
      targetPolicy: {
        allowedTargetTypes: ["ITEM_INSTANCE"],
        defaultTargetType: "ITEM_INSTANCE",
        itemEligibility: { requireOwnedByCitizen: true, blockedLifecycleStates: ["DISPOSED"] }
      },
      tiers: [{ tierId: "t1", label: "T1", amount: 200, active: true, revision: 1 }]
    }
  ];

  const appState = {
    campaignTimeIso: "2109-02-13T12:00:00.000Z",
    itemStoreRevision: 1
  };
  const runtime = createBrowserRuntime({
    wsApp: {
      renderSubscriptionsModule() {},
      getCampaignTimeIso: () => appState.campaignTimeIso,
      getSubscriptionCatalog: () => catalog,
      getItemInstanceStoreRevision: () => appState.itemStoreRevision,
      getItemInstanceById: () => null
    }
  });
  runtime.loadMany([
    "js/subscription-entitlement.js",
    "js/subscriptions-workspace.js"
  ]);
  return { runtime, catalog, appState };
}

function baseContract(overrides = {}) {
  return {
    subscriptionContractId: "contract-civic",
    subscriptionCatalogId: "sub-civic",
    citizenId: "citizen-a",
    providerId: "provider-civic",
    tierId: "t1",
    contractStatus: "ACTIVE",
    billingStatus: "PAID",
    entitlementStatus: "ACTIVE",
    coverageTarget: { type: "CITIZEN", id: "citizen-a" },
    currentPeriodStart: "2109-02-13T10:00:00.000Z",
    currentPeriodEnd: "2109-02-13T13:00:00.000Z",
    amount: 100,
    revision: 1,
    ...overrides
  };
}

test("contract snapshot projects exact Campaign Time expiry instead of persisted entitlementStatus", () => {
  const { runtime, appState } = createProjectionRuntime();
  const app = runtime.window.WS_APP;
  const contract = baseContract();

  const active = app.getSubscriptionContractEntitlementSnapshot(contract);
  assert.equal(active.status, "ACTIVE");
  assert.equal(active.allowed, true);
  assert.equal(active.evaluatedAt, "2109-02-13T12:00:00.000Z");
  assert.equal(active.currentPeriodEnd, "2109-02-13T13:00:00.000Z");
  assert.equal(active.gracePeriodEndsAt, null);

  appState.campaignTimeIso = "2109-02-13T14:00:00.000Z";
  const expired = app.getSubscriptionContractEntitlementSnapshot(contract);
  assert.equal(expired.status, "EXPIRED");
  assert.equal(expired.allowed, false);
  assert.deepEqual(Array.from(expired.reasons, (reason) => reason.code), ["CONTRACT_EXPIRED"]);

  expired.status = "ACTIVE";
  assert.equal(app.getSubscriptionContractEntitlementSnapshot(contract).status, "EXPIRED", "public snapshots must be defensive cache projections");
});

test("workspace grouping, filtering and status display use resolver-backed entitlement axes", () => {
  const { runtime, appState, catalog } = createProjectionRuntime();
  const workspace = runtime.window.WS_APP.subscriptionWorkspace;
  const contract = baseContract();

  appState.campaignTimeIso = "2109-02-13T14:00:00.000Z";
  const axes = workspace.getContractStatusAxes(contract);
  assert.equal(axes.billingStatus, "PAID");
  assert.equal(axes.entitlementStatus, "EXPIRED");
  assert.equal(axes.entitlementAllowed, false);
  assert.equal(workspace.isContractAttentionRequired(contract), true);
  assert.equal(workspace.getContractDisplayStatus(contract), "EXPIRED");

  const visible = workspace.selectVisibleContracts([contract], {
    query: "contract expired",
    group: "ALL",
    category: "ALL",
    providerId: "ALL",
    market: "ALL",
    status: "EXPIRED",
    targetType: "ALL",
    maxPrice: "",
    sort: "STATUS"
  }, catalog);
  assert.deepEqual(Array.from(visible, (entry) => entry.subscriptionContractId), ["contract-civic"]);
});

test("grace and target-loss states are projected without mutating the contract", () => {
  const { runtime, appState } = createProjectionRuntime();
  const app = runtime.window.WS_APP;
  const overdue = baseContract({
    subscriptionContractId: "contract-grace",
    billingStatus: "OVERDUE",
    entitlementStatus: "GRACE_PERIOD",
    gracePeriodEndsAt: "2109-02-13T15:00:00.000Z"
  });

  appState.campaignTimeIso = "2109-02-13T14:00:00.000Z";
  const grace = app.getSubscriptionContractEntitlementSnapshot(overdue);
  assert.equal(grace.status, "GRACE_PERIOD");
  assert.equal(grace.allowed, true);

  appState.campaignTimeIso = "2109-02-13T16:00:00.000Z";
  const expired = app.getSubscriptionContractEntitlementSnapshot(overdue);
  assert.equal(expired.status, "EXPIRED");
  assert.equal(expired.allowed, false);
  assert.equal(overdue.entitlementStatus, "GRACE_PERIOD", "read projection must not persist derived expiry");

  const missingAsset = baseContract({
    subscriptionContractId: "contract-asset",
    subscriptionCatalogId: "sub-asset",
    providerId: "provider-asset",
    coverageTarget: { type: "ITEM_INSTANCE", id: "item-missing" },
    currentPeriodEnd: "2109-02-20T00:00:00.000Z"
  });
  const revoked = app.getSubscriptionContractEntitlementSnapshot(missingAsset);
  assert.equal(revoked.status, "REVOKED");
  assert.equal(revoked.allowed, false);
  assert.ok(revoked.reasons.some((reason) => reason.code === "SUBSCRIPTION_ITEM_TARGET_NOT_FOUND"));
});

test("player and Admin projections consume the canonical snapshot and time events use the hourly channel", () => {
  const entitlement = read("js/subscription-entitlement.js");
  const api = read("js/subscription-api.js");
  const profiles = read("js/subscriptions.js");
  const workspace = read("js/subscriptions-workspace.js");
  const admin = read("js/admin-subscriptions-control.js");

  assert.match(entitlement, /getCampaignTimeIso/);
  assert.match(entitlement, /getPublicSubscriptionContractEntitlementSnapshot/);
  assert.match(api, /ws:campaign-time-updated/);
  assert.doesNotMatch(api, /addEventListener\?\.\("ws:campaign-date-updated"/);
  assert.match(profiles, /getSubscriptionEntitlementSnapshotForUi/);
  assert.match(profiles, /ENTITLEMENT RESOLUTION/);
  assert.match(workspace, /getContractEntitlementSnapshot/);
  assert.match(workspace, /subscriptions_entitlement_projection_4_6/);
  assert.match(admin, /getContractEntitlementSnapshot/);
  assert.match(admin, /subscriptions_entitlement_projection_4_6/);
});
