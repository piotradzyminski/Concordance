"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function clone(value) {
  return structuredClone(value);
}

function parseCreditNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? "").replace(/[^0-9,.-]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createAdapterRuntime() {
  const billingHistory = [];
  const subscriptionNotifications = [];
  const billingNotifications = [];
  const terminalNotifications = [];
  const citizenUpdates = [];
  let saveCount = 0;
  let citizens = [{
    id: "citizen-subscription-test",
    recordType: "citizen",
    credits: 1000,
    debt: "0 ₡",
    subscriptions: [],
    income: [],
    serviceLog: []
  }];

  const runtime = createBrowserRuntime({
    wsApp: {
      currentUser: { login: "admin", role: "admin" },
      CAMPAIGN_DATE_ISO: "2109-02-13",
      SETTLEMENT_PERIOD_END_ISO: "2109-02-17",
      validateSubscriptionContract: () => ({ valid: true }),
      getSubscriptionCatalogItemById: (id) => ({ id, title: id === "sub-civic" ? "Civic Access" : "Subscription", market: "PRIVATE" }),
      getCampaignDateIso: () => "2109-02-13",
      getSettlementPeriodEndIso: () => "2109-02-17",
      getUsers: () => [{ role: "citizen", citizenId: "citizen-subscription-test" }],
      isSubscriptionEntitled: (subscription) => ["PAID", "OVERDUE"].includes(String(subscription?.status || "").toUpperCase())
    }
  });
  runtime.load("js/citizen-subscription-adapter.js");

  const app = runtime.window.WS_APP;
  app.getCitizenById = (citizenId) => clone(citizens.find((citizen) => citizen.id === citizenId) || null);
  app.updateCitizen = (citizenId, patch) => {
    const index = citizens.findIndex((citizen) => citizen.id === citizenId);
    if (index < 0) return null;
    citizens[index] = { ...citizens[index], ...clone(patch) };
    return clone(citizens[index]);
  };

  const normalizeSubscriptionEntry = (source = {}, index = 0, citizenId = "") => {
    const id = String(source.subscriptionContractId || source.id || `subscription-${index + 1}`);
    const status = String(source.status || source.billingStatus || "PENDING").toUpperCase();
    const contractStatus = String(source.contractStatus || (status === "CANCELLED" ? "CANCELLED" : "ACTIVE")).toUpperCase();
    return {
      ...clone(source),
      id,
      subscriptionContractId: id,
      subscriptionCatalogId: String(source.subscriptionCatalogId || source.catalogId || "sub-civic"),
      catalogId: String(source.subscriptionCatalogId || source.catalogId || "sub-civic"),
      citizenId: String(source.citizenId || citizenId),
      coverageTarget: clone(source.coverageTarget || { type: "CITIZEN", id: citizenId }),
      title: String(source.title || "Civic Access"),
      tierId: String(source.tierId || "tier-1"),
      tierLabel: String(source.tierLabel || "T1"),
      amount: parseCreditNumber(source.amount),
      status,
      billingStatus: status,
      contractStatus,
      active: contractStatus === "ACTIVE" && status !== "CANCELLED"
    };
  };
  const normalizeSubscriptions = (items = [], citizenId = "citizen-subscription-test") => (Array.isArray(items) ? items : [])
    .map((entry, index) => normalizeSubscriptionEntry(entry, index, citizenId));

  const dependencies = {
    clone,
    normalizeSubscriptions,
    normalizeSubscriptionEntry,
    getSubscriptionContractKey: (subscription) => `${subscription.subscriptionCatalogId || subscription.catalogId}:${subscription.coverageTarget?.type || "CITIZEN"}:${subscription.coverageTarget?.id || subscription.citizenId}`,
    isSubscriptionContractOpen: (subscription) => String(subscription.contractStatus || "ACTIVE").toUpperCase() === "ACTIVE",
    parseCreditNumber,
    formatCreditLabel: (value) => `${parseCreditNumber(value)} ₡`,
    formatChangeCreditLabel: (value) => `${parseCreditNumber(value) >= 0 ? "+" : ""}${parseCreditNumber(value)} ₡`,
    normalizeBillingPaymentSource: (value) => String(value || "CREDITS").toUpperCase() === "DEBT_ACCOUNT" ? "DEBT_ACCOUNT" : "CREDITS",
    getDebtAccountStatus: (citizen) => {
      const debt = parseCreditNumber(citizen?.debt);
      return { debt, limit: 20000, capacity: 20000 - debt, canCharge: debt < 20000 };
    },
    addBillingHistoryEntry: (citizenId, entry) => billingHistory.push({ citizenId, ...clone(entry) }),
    emitSubscriptionTerminalEntry: (citizenId, subscription, event) => subscriptionNotifications.push({ citizenId, subscription: clone(subscription), event: clone(event) }),
    emitBillingNotification: (citizenId, event) => billingNotifications.push({ citizenId, event: clone(event) }),
    emitTerminalNotification: (citizenId, event) => terminalNotifications.push({ citizenId, event: clone(event) }),
    createPanelList: (...panels) => panels.filter(Boolean),
    buildNotificationPanel: (title, rows) => ({ title, rows }),
    buildFinanceAccountRows: (before, after) => [{ label: "Before", value: String(before) }, { label: "After", value: String(after) }],
    getSubscriptionSubtypeForStatus: (status) => `SUBSCRIPTION_${String(status || "UPDATED").toUpperCase()}`,
    getSubscriptionStatusLabel: (status) => String(status || "UNKNOWN").toUpperCase(),
    getAlignedSubscriptionPeriodEndIso: () => "2109-02-17",
    getTerminalDateIso: () => "2109-02-13",
    addDaysIsoLocal: (iso, days) => {
      const date = new Date(`${iso}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    },
    isAutoBillableSubscription: (subscription, settlementDateIso) => String(subscription.status || "").toUpperCase() !== "CANCELLED" && subscription.lastSettlementAt !== settlementDateIso && parseCreditNumber(subscription.amount) > 0,
    hasSettlementBillingHistory: () => false,
    getWeeklyIncomeSources: () => [],
    calculateSubscriptionSettlementPaymentPlan: () => ({
      subscriptionPayments: [],
      creditsAfterSubscriptions: 1000,
      debtAfterSubscriptions: 0,
      totalDue: 0,
      paidFromCredits: 0,
      debtIncrease: 0,
      chargedSubscriptions: 0,
      overdueSubscriptions: 0
    }),
    getWeeklyAdditionalCreditTotal: () => 0,
    normalizeIncome: (items = []) => clone(items),
    normalizeIncomeEntry: (entry) => clone(entry),
    normalizeServiceLog: (items = []) => clone(items),
    normalizeServiceForm: (value) => String(value || "").toUpperCase(),
    normalizeServiceRecord: (entry) => clone(entry),
    normalizeCitizen: (citizen) => clone(citizen),
    getCitizenStore: () => clone(citizens),
    replaceCitizenStore: (nextCitizens) => { citizens = clone(nextCitizens); return clone(citizens); },
    saveCitizenStore: () => { saveCount += 1; },
    emitCitizenUpdate: (detail) => citizenUpdates.push(clone(detail)),
    billingDebtAccountLimit: 20000
  };

  return {
    runtime,
    app,
    adapter: app.createCitizenSubscriptionAdapter(dependencies),
    getCitizen: () => clone(citizens[0]),
    billingHistory,
    subscriptionNotifications,
    billingNotifications,
    terminalNotifications,
    citizenUpdates,
    getSaveCount: () => saveCount
  };
}

test("Citizen Subscription Adapter exposes one frozen low-level command set", () => {
  const { app, adapter } = createAdapterRuntime();
  assert.equal(adapter.version, "citizen_subscription_adapter_1_2x");
  assert.equal(Object.isFrozen(adapter), true);
  assert.equal(typeof adapter.addCitizenSubscription, "function");
  assert.equal(typeof adapter.processWeeklySubscriptionSettlement, "function");
  assert.equal(app.addCitizenSubscription, undefined);
  assert.equal(app.SubscriptionAPI, undefined);
});

test("activation, tier update and cancellation mutate the canonical Citizen record", () => {
  const context = createAdapterRuntime();
  const { adapter } = context;

  const activated = adapter.addCitizenSubscription("citizen-subscription-test", {
    subscriptionContractId: "contract-civic",
    subscriptionCatalogId: "sub-civic",
    tierId: "tier-1",
    tierLabel: "T1",
    amount: 120,
    startedAt: "2109-02-13",
    startDate: "2109-02-13"
  });
  assert.equal(activated.subscriptions.length, 1);
  assert.equal(context.getCitizen().subscriptions[0].id, "contract-civic");
  assert.equal(context.billingHistory.at(-1).type, "SUBSCRIPTION_ACTIVATION");
  assert.equal(context.subscriptionNotifications.at(-1).event.subtype, "SUBSCRIPTION_ACTIVATED");

  const changed = adapter.updateCitizenSubscription("citizen-subscription-test", "contract-civic", {
    tierId: "tier-2",
    tierLabel: "T2",
    amount: 180
  });
  assert.equal(changed.subscriptions[0].tierId, "tier-2");
  assert.equal(context.subscriptionNotifications.at(-1).event.subtype, "SUBSCRIPTION_TIER_CHANGED");

  const cancelled = adapter.cancelCitizenSubscription("citizen-subscription-test", "contract-civic", { createdBy: "citizen" });
  assert.equal(cancelled.subscriptions[0].status, "CANCELLED");
  assert.equal(cancelled.credits, 1000, "same-day pending cancellation remains free");
  assert.equal(context.subscriptionNotifications.at(-1).event.subtype, "SUBSCRIPTION_CANCELLED");

  const cleared = adapter.clearCancelledCitizenSubscriptions("citizen-subscription-test");
  assert.equal(cleared.subscriptions.length, 0);
  assert.equal(context.terminalNotifications.at(-1).event.subtype, "SUBSCRIPTION_RECORDS_CLEARED");
});

test("payment delegates Citizen persistence and preserves billing feedback", () => {
  const context = createAdapterRuntime();
  context.adapter.addCitizenSubscription("citizen-subscription-test", {
    subscriptionContractId: "contract-pay",
    subscriptionCatalogId: "sub-civic",
    amount: 250,
    status: "PENDING"
  });

  const result = context.adapter.payCitizenSubscriptions("citizen-subscription-test", {
    subscriptionId: "contract-pay",
    paymentSource: "CREDITS"
  });

  assert.equal(result.ok, true);
  assert.equal(result.total, 250);
  assert.equal(result.credits, 750);
  assert.equal(context.getCitizen().subscriptions[0].status, "PAID");
  assert.equal(context.billingNotifications.length, 1);
  assert.equal(context.billingHistory.at(-1).type, "SUBSCRIPTION_PAYMENT");
});

test("weekly settlement validates date before touching the Citizen Store", () => {
  const context = createAdapterRuntime();
  const result = context.adapter.processWeeklySubscriptionSettlement({ settlementDateIso: "invalid" });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "INVALID_SETTLEMENT_DATE");
  assert.equal(result.settlementDateIso, "invalid");
  assert.equal(context.getSaveCount(), 0);
  assert.equal(context.citizenUpdates.length, 0);
});

test("Citizen Store registers the adapter behind SubscriptionAPI without exposing direct mutators", () => {
  const runtime = createBrowserRuntime({
    appData: {
      citizens: [{
        id: "citizen-integration",
        recordType: "citizen",
        recordState: "ACTIVE",
        identity: { firstName: "Integration", surname: "Tester" },
        subscriptions: [],
        income: [],
        serviceLog: []
      }]
    }
  });

  runtime.loadMany([
    "js/store-utils.js",
    "js/service-log-lifecycle.js",
    "js/terminal-entry-store.js",
    "js/terminal-reminder-store.js",
    "js/citizen-subscription-adapter.js",
    "js/store.js",
    "js/subscription-api.js"
  ]);

  const app = runtime.window.WS_APP;
  const descriptor = Object.getOwnPropertyDescriptor(app, "__subscriptionStoreCommands");
  const boundary = app.SubscriptionAPI.getSubscriptionMutationBoundaryState();

  assert.equal(app.SubscriptionAPI.version, "subscriptions_public_api_3_1x");
  assert.equal(descriptor.enumerable, false);
  assert.equal(descriptor.writable, false);
  assert.equal(descriptor.configurable, false);
  assert.equal(Object.isFrozen(descriptor.value), true);
  assert.deepEqual(Array.from(boundary.directMutationAdaptersExposed), []);
  assert.deepEqual(Array.from(boundary.storeCommandsAvailable), [
    "add", "update", "cancel", "remove", "clearCancelled", "pay", "weeklySettlement", "updateCitizen"
  ]);
});
