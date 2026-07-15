"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

function createWorkspaceRuntime() {
  const catalog = [
    {
      id: "sub-kagami",
      subscriptionCatalogId: "sub-kagami",
      title: "Kagami Ochrona Sieci",
      provider: "Kagami Kaisha",
      category: "CYBERSECURITY",
      market: "PRIVATE",
      domain: "NETWORK",
      summary: "Szyfrowana ochrona sesji.",
      targetPolicy: { allowedTargetTypes: ["CITIZEN"] },
      tiers: [{ id: "t1", label: "T1", amount: 500, active: true }]
    },
    {
      id: "sub-live",
      subscriptionCatalogId: "sub-live",
      title: "Live & Prevail",
      provider: "Live & Prevail",
      category: "INSURANCE",
      market: "SYSTEM",
      domain: "MEDICAL",
      summary: "Opieka medyczna.",
      targetPolicy: { allowedTargetTypes: ["CITIZEN"] },
      tiers: [{ id: "t1", label: "T1", amount: 1200, active: true }]
    },
    {
      id: "sub-grid",
      subscriptionCatalogId: "sub-grid",
      title: "Grid Service",
      provider: "Mass Compression Service",
      category: "MASS_COMPRESSION",
      market: "PRIVATE",
      domain: "CYBERWARE",
      targetPolicy: { allowedTargetTypes: ["ITEM_INSTANCE"] },
      tiers: [{ id: "t1", label: "T1", amount: 900, active: true }]
    }
  ];

  const runtime = createBrowserRuntime({
    wsApp: {
      renderSubscriptionsModule() {},
      getSubscriptionCatalog: () => catalog,
      SUBSCRIPTION_CATEGORIES: [
        { id: "CYBERSECURITY", title: "Cybersecurity" },
        { id: "INSURANCE", title: "Insurance" },
        { id: "MASS_COMPRESSION", title: "Mass Compression" }
      ]
    }
  });
  runtime.load("js/subscriptions-workspace.js");
  return { runtime, catalog };
}

test("Subscriptions workspace is the canonical four-view player shell", () => {
  const source = read("js/subscriptions-workspace.js");
  const modules = read("js/modules.js");
  const index = read("index.html");

  assert.match(source, /\["OVERVIEW", "CONTRACTS", "CATALOG", "PROVIDERS"\]/);
  assert.match(source, /function renderPlayerSubscriptionsWorkspace/);
  assert.match(source, /app\.renderSubscriptionsModule = function renderSubscriptionsModuleWithWorkspace/);
  assert.match(source, /function selectVisibleContracts/);
  assert.match(source, /function selectVisibleCatalogEntries/);
  assert.match(source, /function selectVisibleProviders/);
  assert.doesNotMatch(source, /\.hidden\s*=/, "Workspace filtering must happen before rendering, not by hiding rendered cards.");

  assert.match(index, /css\/system-tabs\.css\?v=8/);
  assert.match(modules, /subscriptions:\s*\{[\s\S]*css\/subscription-action-feedback\.css\?v=1[\s\S]*css\/subscriptions\.css\?v=21/);
  assert.match(modules, /js\/subscriptions-workspace\.js\?v=7/);

  assert.match(index, /js\/modules\.js\?v=309/);

  assert.doesNotMatch(index, /<script[^>]+js\/subscriptions\.js/);
  assert.doesNotMatch(index, /<script[^>]+js\/subscriptions-workspace\.js/);
});

test("Catalog selectors normalize Polish text and apply group, source, target and price filters before render", () => {
  const { runtime, catalog } = createWorkspaceRuntime();
  const workspace = runtime.window.WS_APP.subscriptionWorkspace;

  assert.equal(workspace.normalizeSearchText("Ochrona ŁĄCZNOŚCI"), "ochrona lacznosci");

  const privateNetwork = workspace.selectVisibleCatalogEntries(catalog, {
    query: "ochrona sieci",
    group: "ACCESS_INFRASTRUCTURE",
    category: "ALL",
    providerId: "ALL",
    market: "PRIVATE",
    status: "OPEN",
    targetType: "CITIZEN",
    maxPrice: "600",
    sort: "RELEVANCE"
  });
  assert.deepEqual(Array.from(privateNetwork, (item) => item.id), ["sub-kagami"]);

  const assetContracts = workspace.selectVisibleCatalogEntries(catalog, {
    query: "",
    group: "PROTECTION_ASSETS",
    category: "ALL",
    providerId: "ALL",
    market: "ALL",
    status: "OPEN",
    targetType: "ITEM_INSTANCE",
    maxPrice: "",
    sort: "RELEVANCE"
  });
  assert.deepEqual(Array.from(assetContracts, (item) => item.id), ["sub-grid"]);
  assert.equal(workspace.catalogSectionLimit, 6);
  assert.equal(workspace.getCatalogStateLabel({ citizenId: "citizen-a" }, catalog[2], []), "ASSIGNABLE");
  assert.equal(workspace.getCatalogStateLabel({ citizenId: "citizen-a" }, catalog[2], [{
    subscriptionCatalogId: "sub-grid",
    contractStatus: "ACTIVE",
    billingStatus: "PAID",
    entitlementStatus: "ACTIVE",
    coverageTarget: { type: "ITEM_INSTANCE", id: "item-1" }
  }]), "ASSIGN MORE");
});

test("Contract and provider selectors use one persistent UI state", () => {
  const { runtime, catalog } = createWorkspaceRuntime();
  const workspace = runtime.window.WS_APP.subscriptionWorkspace;
  const contracts = [
    { id: "c1", catalogId: "sub-kagami", title: "Kagami Ochrona Sieci", provider: "Kagami Kaisha", category: "CYBERSECURITY", status: "OVERDUE", amount: 500, coverageTarget: { type: "CITIZEN", id: "citizen-a" } },
    { id: "c2", catalogId: "sub-live", title: "Live & Prevail", provider: "Live & Prevail", category: "INSURANCE", status: "PAID", amount: 1200, coverageTarget: { type: "CITIZEN", id: "citizen-a" } },
    { id: "c3", catalogId: "sub-grid", title: "Grid Service", provider: "Mass Compression Service", category: "MASS_COMPRESSION", status: "CANCELLED", amount: 900, coverageTarget: { type: "ITEM_INSTANCE", id: "item-1" } }
  ];

  const attention = workspace.selectVisibleContracts(contracts, {
    query: "kagami",
    group: "ALL",
    category: "ALL",
    providerId: "ALL",
    market: "ALL",
    status: "ATTENTION",
    targetType: "CITIZEN",
    maxPrice: "",
    sort: "STATUS"
  }, catalog);
  assert.deepEqual(Array.from(attention, (item) => item.id), ["c1"]);

  const providers = workspace.buildProviderGroups(catalog);
  const privateProviders = workspace.selectVisibleProviders(providers, {
    query: "cyber",
    group: "ALL",
    category: "ALL",
    providerId: "ALL",
    market: "PRIVATE",
    status: "OPEN",
    targetType: "ALL",
    maxPrice: "",
    sort: "NAME"
  });
  assert.deepEqual(Array.from(privateProviders, (item) => item.name), ["Kagami Kaisha", "Mass Compression Service"]);

  const state = workspace.getState({ view: "CATALOG", query: "kagami", market: "PRIVATE" });
  assert.equal(runtime.window.WS_APP.subscriptionUiState, state);
  assert.equal(state.query, "kagami");
  assert.equal(state.market, "PRIVATE");
});


test("Canonical contract axes drive attention, cancellation and display state without the compatibility status alias", () => {
  const { runtime, catalog } = createWorkspaceRuntime();
  const workspace = runtime.window.WS_APP.subscriptionWorkspace;
  const contracts = [
    {
      subscriptionContractId: "blocked-entitlement",
      subscriptionCatalogId: "sub-kagami",
      contractStatus: "ACTIVE",
      billingStatus: "PAID",
      entitlementStatus: "BLOCKED",
      coverageTarget: { type: "CITIZEN", id: "citizen-a" }
    },
    {
      subscriptionContractId: "cancelled-contract",
      subscriptionCatalogId: "sub-live",
      contractStatus: "CANCELLED",
      billingStatus: "PAID",
      entitlementStatus: "ACTIVE",
      coverageTarget: { type: "CITIZEN", id: "citizen-a" }
    }
  ];

  const axes = workspace.getContractStatusAxes(contracts[0]);
  assert.equal(axes.contractStatus, "ACTIVE");
  assert.equal(axes.billingStatus, "PAID");
  assert.equal(axes.entitlementStatus, "BLOCKED");
  assert.equal(workspace.isContractAttentionRequired(contracts[0]), true);
  assert.equal(workspace.getContractDisplayStatus(contracts[0]), "BLOCKED");
  assert.equal(workspace.isContractCancelled(contracts[1]), true);

  const visible = workspace.selectVisibleContracts(contracts, {
    query: "",
    group: "ALL",
    category: "ALL",
    providerId: "ALL",
    market: "ALL",
    status: "ATTENTION",
    targetType: "ALL",
    maxPrice: "",
    sort: "STATUS"
  }, catalog);
  assert.deepEqual(Array.from(visible, (item) => item.subscriptionContractId), ["blocked-entitlement"]);
});

test("Workspace CSS owns grouped layouts, filter chips and responsive breakpoints", () => {
  const css = read("css/subscriptions.css");
  const workspaceSource = read("js/subscriptions-workspace.js");

  assert.match(css, /Subscription Workspace UI 4\.0 \+ Terminal Cards 4\.0x/);
  assert.match(css, /\.subscription-workspace-nav/);
  assert.doesNotMatch(css, /\.subscription-workspace-nav__item\.system-segment-tile\s*\{/);
  assert.match(read("css/system-tabs.css"), /--system-tab-card-height: 106px/);
  assert.match(css, /\.subscription-filterbar--catalog/);
  assert.match(css, /\.subscription-contract-grid/);
  assert.match(css, /\.subscription-catalog-grid-v4/);
  assert.match(css, /\.subscription-provider-grid-v4/);
  assert.match(css, /@media \(max-width: 1180px\)/);
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(workspaceSource, /subscription-workspace-nav system-segment-tabs/);
  assert.match(workspaceSource, /subscription-workspace-nav__item system-segment-tile system-segment-tile--card/);
  assert.match(workspaceSource, /system-segment-tile__title/);
  assert.match(workspaceSource, /Current cycle, coverage and payment status\./);
  assert.match(workspaceSource, /<b>₡<\/b>/);
  assert.match(workspaceSource, /cancelScheduledWorkspaceRender/);
  assert.match(workspaceSource, /subscriptions_entitlement_projection_4_6/);
  assert.match(workspaceSource, /data-subscription-action-feedback-scope="PLAYER"/);
  assert.match(workspaceSource, /currentRoot !== workspaceRoot/);
  assert.match(workspaceSource, /captureWorkspaceScroll/);
  assert.match(workspaceSource, /restoreWorkspaceScroll/);
  assert.match(css, /Subscriptions UI Stability 4\.2\.1/);
  assert.doesNotMatch(workspaceSource, /\?\?\?/);
});
