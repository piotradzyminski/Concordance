"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");
const { MemoryStorage } = require("../helpers/local-storage.cjs");

function createRuntime(options = {}) {
  const citizens = {
    buyer: { id: "buyer", legalName: "Buyer", credits: 1000, debt: "0 ₡", debtLimit: 20000, revision: 1, recordType: "citizen" },
    seller: { id: "seller", legalName: "Seller", credits: 100, debt: "0 ₡", debtLimit: 20000, revision: 1, recordType: "citizen" }
  };
  const organizations = [{ id: "habitat-market", name: "Habitat Market", archived: false }];
  const history = [];
  const runtime = createBrowserRuntime({
    storage: options.storage,
    wsApp: {
      getCitizenById: (id) => citizens[id] ? structuredClone(citizens[id]) : null,
      getCitizens: () => Object.values(citizens).map((record) => structuredClone(record)),
      updateCitizen: (id, patch) => {
        if (!citizens[id] || options.failCitizenId === id) return null;
        Object.assign(citizens[id], structuredClone(patch));
        return structuredClone(citizens[id]);
      },
      getCitizenDisplayName: (citizen) => citizen?.legalName || citizen?.id || "UNKNOWN",
      getOrganizationById: (id) => structuredClone(organizations.find((record) => record.id === id) || null),
      getOrganizations: () => structuredClone(organizations),
      getBillingHistory: () => [],
      addBillingHistoryEntry: (citizenId, entry) => {
        history.push({ citizenId, ...structuredClone(entry) });
        return structuredClone(entry);
      },
      formatCredits: (amount) => `${amount} ₡`
    }
  });
  runtime.load("js/billing-store.js");
  return { runtime, citizens, history };
}

function settlementInput(overrides = {}) {
  return {
    listingId: "listing-player-1",
    marketOrderId: "market-order-1",
    buyerRef: { partyType: "CITIZEN", partyId: "buyer" },
    sellerRef: { partyType: "CITIZEN", partyId: "seller" },
    platformRef: { partyType: "ORGANIZATION", partyId: "habitat-market" },
    grossAmount: 500,
    platformFeeRate: 0.05,
    idempotencyKey: "marketplace-settlement-1",
    correlationId: "market-order-1",
    ...overrides
  };
}

test("Marketplace settlement atomically debits buyer, credits seller and records platform fee", () => {
  const { runtime, citizens, history } = createRuntime();
  const quote = runtime.window.WS_APP.quoteMarketplaceSettlement(settlementInput());
  assert.equal(quote.ok, true);
  assert.equal(quote.platformFeeAmount, 25);
  assert.equal(quote.sellerNetAmount, 475);

  const result = runtime.window.WS_APP.commitMarketplaceSettlement(settlementInput());
  assert.equal(result.ok, true);
  assert.equal(result.resultCode, "MARKETPLACE_SETTLEMENT_COMPLETED");
  assert.equal(result.settlement.status, "CAPTURED");
  assert.equal(citizens.buyer.credits, 500);
  assert.equal(citizens.seller.credits, 575);
  assert.equal(runtime.window.WS_APP.getBillingTransferAccount("ORGANIZATION", "habitat-market").credits, 25);
  assert.equal(runtime.window.WS_APP.getBillingTransactions({ sourceDomain: "MARKETPLACE" }).length, 3);
  assert.equal(history.length, 2, "Only Citizen buyer and seller receive Billing History entries.");
  assert.equal(runtime.window.WS_APP.validateBillingStore().ok, true);
});

test("Marketplace settlement replay does not mutate accounts twice", () => {
  const { runtime, citizens } = createRuntime();
  const first = runtime.window.WS_APP.commitMarketplaceSettlement(settlementInput());
  const replay = runtime.window.WS_APP.commitMarketplaceSettlement(settlementInput());

  assert.equal(first.ok, true);
  assert.equal(replay.ok, true);
  assert.equal(replay.operation, "IDEMPOTENT_REPLAY");
  assert.equal(citizens.buyer.credits, 500);
  assert.equal(citizens.seller.credits, 575);
  assert.equal(runtime.window.WS_APP.getMarketplaceSettlements().length, 1);
  assert.equal(runtime.window.WS_APP.getBillingTransactions({ sourceDomain: "MARKETPLACE" }).length, 3);
});

test("Marketplace refund reverses seller net and platform fee proportionally", () => {
  const { runtime, citizens } = createRuntime();
  const committed = runtime.window.WS_APP.commitMarketplaceSettlement(settlementInput());
  assert.equal(committed.ok, true);

  const partial = runtime.window.WS_APP.refundMarketplaceSettlement(committed.settlement.settlementId, 200, {
    idempotencyKey: "marketplace-refund-partial"
  });
  assert.equal(partial.ok, true);
  assert.equal(partial.settlement.status, "PARTIALLY_REFUNDED");
  assert.equal(partial.refund.sellerDebitAmount, 190);
  assert.equal(partial.refund.platformDebitAmount, 10);
  assert.equal(citizens.buyer.credits, 700);
  assert.equal(citizens.seller.credits, 385);
  assert.equal(runtime.window.WS_APP.getBillingTransferAccount("ORGANIZATION", "habitat-market").credits, 15);

  const final = runtime.window.WS_APP.refundMarketplaceSettlement(committed.settlement.settlementId, null, {
    idempotencyKey: "marketplace-refund-final"
  });
  assert.equal(final.ok, true);
  assert.equal(final.settlement.status, "REFUNDED");
  assert.equal(final.settlement.refundedAmount, 500);
  assert.equal(citizens.buyer.credits, 1000);
  assert.equal(citizens.seller.credits, 100);
  assert.equal(runtime.window.WS_APP.getBillingTransferAccount("ORGANIZATION", "habitat-market").credits, 0);
  assert.equal(runtime.window.WS_APP.getBillingTransactions({ sourceDomain: "MARKETPLACE" }).length, 9);

  const replay = runtime.window.WS_APP.refundMarketplaceSettlement(committed.settlement.settlementId, null, {
    idempotencyKey: "marketplace-refund-final"
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.operation, "IDEMPOTENT_REPLAY");
});

test("Insufficient buyer credits reject settlement without account mutation", () => {
  const { runtime, citizens } = createRuntime();
  const result = runtime.window.WS_APP.commitMarketplaceSettlement(settlementInput({ grossAmount: 5000, idempotencyKey: "marketplace-insufficient" }));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "INSUFFICIENT_CREDITS");
  assert.equal(citizens.buyer.credits, 1000);
  assert.equal(citizens.seller.credits, 100);
  assert.equal(runtime.window.WS_APP.getMarketplaceSettlements().length, 0);
});

test("Seller commit failure rolls buyer debit back and persists failed settlement", () => {
  const { runtime, citizens } = createRuntime({ failCitizenId: "seller" });
  const result = runtime.window.WS_APP.commitMarketplaceSettlement(settlementInput({ idempotencyKey: "marketplace-seller-failure" }));
  assert.equal(result.ok, false);
  assert.equal(result.recoveryRequired, false);
  assert.equal(citizens.buyer.credits, 1000);
  assert.equal(citizens.seller.credits, 100);
  const settlement = runtime.window.WS_APP.getMarketplaceSettlement("marketplace-seller-failure");
  assert.equal(settlement.status, "FAILED");
  assert.equal(settlement.compensationState, "ROLLED_BACK");
  assert.equal(runtime.window.WS_APP.getBillingTransactions({ sourceDomain: "MARKETPLACE" }).length, 0);
});

test("Settlement persistence failure before account commit leaves balances unchanged", () => {
  class FailSettlementStorage extends MemoryStorage {
    setItem(key, value) {
      if (String(key) === "ws_app_billing_marketplace_settlements_v1") throw new Error("forced settlement persistence failure");
      super.setItem(key, value);
    }
  }
  const { runtime, citizens } = createRuntime({ storage: new FailSettlementStorage() });
  const result = runtime.window.WS_APP.commitMarketplaceSettlement(settlementInput({ idempotencyKey: "marketplace-persistence-failure" }));
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "MARKETPLACE_SETTLEMENT_PERSISTENCE_FAILED");
  assert.equal(citizens.buyer.credits, 1000);
  assert.equal(citizens.seller.credits, 100);
  assert.equal(runtime.window.WS_APP.getBillingTransactions({ sourceDomain: "MARKETPLACE" }).length, 0);
});

test("Marketplace settlement storage survives reload and exports through Billing runtime data", () => {
  const storage = new MemoryStorage();
  const first = createRuntime({ storage });
  const committed = first.runtime.window.WS_APP.commitMarketplaceSettlement(settlementInput({ idempotencyKey: "marketplace-reload" }));
  assert.equal(committed.ok, true);

  const second = createRuntime({ storage });
  const restored = second.runtime.window.WS_APP.getMarketplaceSettlement(committed.settlement.settlementId);
  assert.equal(restored.status, "CAPTURED");
  assert.equal(second.runtime.window.WS_APP.exportBillingRuntimeData().marketplaceSettlements.length, 1);
});


test("Pending settlement with already-applied account effects is quarantined for manual reconciliation", () => {
  const { runtime, citizens } = createRuntime();
  citizens.buyer.credits = 500;
  citizens.seller.credits = 575;
  runtime.window.WS_APP.importBillingTransferAccounts([{
    accountId: "ORGANIZATION:habitat-market",
    partyType: "ORGANIZATION",
    partyId: "habitat-market",
    credits: 25,
    debt: 0,
    revision: 2
  }]);
  runtime.window.WS_APP.importMarketplaceSettlements([{
    settlementId: "pending-after-effects",
    listingId: "listing-pending",
    marketOrderId: "order-pending",
    buyerRef: { partyType: "CITIZEN", partyId: "buyer" },
    sellerRef: { partyType: "CITIZEN", partyId: "seller" },
    platformRef: { partyType: "ORGANIZATION", partyId: "habitat-market" },
    grossAmount: 500,
    platformFeeRate: 0.05,
    platformFeeAmount: 25,
    sellerNetAmount: 475,
    accountSnapshots: {
      buyer: { creditsBefore: 1000, creditsAfter: 500, debtBefore: 0, debtAfter: 0 },
      seller: { creditsBefore: 100, creditsAfter: 575, debtBefore: 0, debtAfter: 0 },
      platform: { creditsBefore: 0, creditsAfter: 25, debtBefore: 0, debtAfter: 0 }
    },
    status: "PENDING",
    idempotencyKey: "pending-after-effects",
    correlationId: "order-pending",
    revision: 1
  }]);

  const result = runtime.window.WS_APP.retryMarketplaceSettlement("pending-after-effects");
  assert.equal(result.ok, false);
  assert.equal(result.recoveryRequired, true);
  assert.equal(result.accountState, "AFTER");
  assert.equal(result.error.code, "MARKETPLACE_MANUAL_RECONCILIATION_REQUIRED");
  assert.equal(citizens.buyer.credits, 500);
  assert.equal(citizens.seller.credits, 575);
  assert.equal(runtime.window.WS_APP.getMarketplaceSettlement("pending-after-effects").status, "RECOVERY_REQUIRED");
  assert.deepEqual(Array.from(runtime.window.WS_APP.reconcileMarketplaceSettlements().unresolvedRecoveryRequired), ["pending-after-effects"]);
});
