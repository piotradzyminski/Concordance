"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");
const { MemoryStorage } = require("../helpers/local-storage.cjs");

function createTransferRuntime(options = {}) {
  const citizens = {
    "citizen-a": { id: "citizen-a", legalName: "Citizen A", credits: 1000, debt: "500 ₡", debtLimit: 20000, revision: 1, recordType: "citizen" },
    "citizen-b": { id: "citizen-b", legalName: "Citizen B", credits: 100, debt: "100 ₡", debtLimit: 20000, revision: 1, recordType: "citizen" }
  };
  const organizations = [
    { id: "trauma-team", name: "TRAUMA Team", archived: false },
    { id: "system-authority", name: "System Authority", archived: false }
  ];
  const history = [];
  const runtime = createBrowserRuntime({
    storage: options.storage,
    wsApp: {
      getCitizenById: (id) => citizens[id] ? structuredClone(citizens[id]) : null,
      getCitizens: () => Object.values(citizens).map(structuredClone),
      updateCitizen: (id, patch) => {
        if (!citizens[id]) return null;
        if (options.failCitizenId === id) return null;
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
  return { runtime, citizens, organizations, history };
}

function command(overrides = {}) {
  return {
    sourceParty: { partyType: "CITIZEN", partyId: "citizen-a" },
    targetParty: { partyType: "CITIZEN", partyId: "citizen-b" },
    asset: "CREDITS",
    amount: 250,
    reason: "Administrative transfer fixture.",
    actor: { actorId: "admin", actorRole: "ADMIN", source: "ADMIN_CONTROL" },
    idempotencyKey: "admin-transfer-fixture",
    ...overrides
  };
}

test("Admin credits transfer creates one transfer and paired Billing transactions", () => {
  const { runtime, citizens, history } = createTransferRuntime();
  const result = runtime.window.WS_APP.executeAdminBillingTransfer(command());

  assert.equal(result.ok, true);
  assert.equal(result.resultCode, "ADMIN_TRANSFER_COMPLETED");
  assert.equal(citizens["citizen-a"].credits, 750);
  assert.equal(citizens["citizen-b"].credits, 350);
  assert.equal(result.billingTransfer.sourceTransactionId, result.sourceTransaction.billingTransactionId);
  assert.equal(result.billingTransfer.targetTransactionId, result.targetTransaction.billingTransactionId);
  assert.equal(result.sourceTransaction.accountEffect.creditsDelta, -250);
  assert.equal(result.targetTransaction.accountEffect.creditsDelta, 250);
  assert.equal(runtime.window.WS_APP.getAdminBillingTransfers().length, 1);
  assert.equal(runtime.window.WS_APP.getBillingTransactions({ sourceDomain: "ADMIN" }).length, 2);
  assert.equal(history.length, 2);

  const replay = runtime.window.WS_APP.executeAdminBillingTransfer(command());
  assert.equal(replay.ok, true);
  assert.equal(replay.operation, "IDEMPOTENT_REPLAY");
  assert.equal(citizens["citizen-a"].credits, 750);
  assert.equal(citizens["citizen-b"].credits, 350);
  assert.equal(runtime.window.WS_APP.getAdminBillingTransfers().length, 1);
  assert.equal(runtime.window.WS_APP.getBillingTransactions({ sourceDomain: "ADMIN" }).length, 2);
});

test("Organization-to-Citizen transfer debits a persistent organization ledger account", () => {
  const { runtime, citizens } = createTransferRuntime();
  const result = runtime.window.WS_APP.executeAdminBillingTransfer(command({
    sourceParty: { partyType: "ORGANIZATION", partyId: "trauma-team" },
    targetParty: { partyType: "CITIZEN", partyId: "citizen-b" },
    amount: 500,
    idempotencyKey: "org-to-citizen-transfer"
  }));

  assert.equal(result.ok, true);
  assert.equal(citizens["citizen-b"].credits, 600);
  const organizationAccount = runtime.window.WS_APP.getBillingTransferAccount("ORGANIZATION", "trauma-team");
  assert.equal(organizationAccount.credits, -500);
  assert.equal(organizationAccount.creditOverdraftAllowed, true);
  assert.equal(result.sourceTransaction.organizationId, "trauma-team");
  assert.equal(result.sourceTransaction.citizenId, "");
});

test("Debt transfer moves liability from source to target without changing credits", () => {
  const { runtime, citizens } = createTransferRuntime();
  const result = runtime.window.WS_APP.executeAdminBillingTransfer(command({
    asset: "DEBT",
    amount: 200,
    idempotencyKey: "debt-transfer"
  }));

  assert.equal(result.ok, true);
  assert.equal(citizens["citizen-a"].debt, "300 ₡");
  assert.equal(citizens["citizen-b"].debt, "300 ₡");
  assert.equal(citizens["citizen-a"].credits, 1000);
  assert.equal(citizens["citizen-b"].credits, 100);
  assert.equal(result.sourceTransaction.accountEffect.debtDelta, -200);
  assert.equal(result.targetTransaction.accountEffect.debtDelta, 200);
});

test("Transfer validation blocks insufficient Citizen credits and source debt", () => {
  const { runtime } = createTransferRuntime();
  const credits = runtime.window.WS_APP.previewAdminBillingTransfer(command({ amount: 5000, idempotencyKey: "insufficient-credits" }));
  assert.equal(credits.ok, false);
  assert.equal(credits.error.code, "INSUFFICIENT_CREDITS");

  const debt = runtime.window.WS_APP.previewAdminBillingTransfer(command({ asset: "DEBT", amount: 900, idempotencyKey: "insufficient-debt" }));
  assert.equal(debt.ok, false);
  assert.equal(debt.error.code, "INSUFFICIENT_DEBT_BALANCE");
});

test("Transfer persistence failure rolls both account projections back", () => {
  class FailOnceStorage extends MemoryStorage {
    constructor() {
      super();
      this.failed = false;
    }
    setItem(key, value) {
      if (String(key) === "ws_app_billing_transfers_v1" && !this.failed) {
        this.failed = true;
        throw new Error("forced transfer persistence failure");
      }
      super.setItem(key, value);
    }
  }

  const storage = new FailOnceStorage();
  const { runtime, citizens } = createTransferRuntime({ storage });
  const result = runtime.window.WS_APP.executeAdminBillingTransfer(command({ idempotencyKey: "rollback-transfer" }));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "TRANSFER_PERSISTENCE_FAILED");
  assert.equal(result.recoveryRequired, false);
  assert.equal(citizens["citizen-a"].credits, 1000);
  assert.equal(citizens["citizen-b"].credits, 100);
  assert.equal(runtime.window.WS_APP.getAdminBillingTransfers().length, 0);
  assert.equal(runtime.window.WS_APP.getBillingTransactions({ sourceDomain: "ADMIN" }).length, 0);
});

test("Completed Admin transfer can be reversed through a second paired transfer", () => {
  const { runtime, citizens } = createTransferRuntime();
  const completed = runtime.window.WS_APP.executeAdminBillingTransfer(command({ idempotencyKey: "transfer-to-reverse" }));
  assert.equal(completed.ok, true);

  const reversed = runtime.window.WS_APP.reverseAdminBillingTransfer(completed.billingTransfer.transferId, {
    reason: "Reverse fixture transfer.",
    actor: { actorId: "admin", actorRole: "ADMIN", source: "ADMIN_CONTROL" },
    idempotencyKey: "reverse-transfer-fixture"
  });

  assert.equal(reversed.ok, true);
  assert.equal(reversed.resultCode, "ADMIN_TRANSFER_REVERSED");
  assert.equal(citizens["citizen-a"].credits, 1000);
  assert.equal(citizens["citizen-b"].credits, 100);
  assert.equal(reversed.reversedTransfer.status, "REVERSED");
  assert.equal(runtime.window.WS_APP.getAdminBillingTransfers().length, 2);
});
