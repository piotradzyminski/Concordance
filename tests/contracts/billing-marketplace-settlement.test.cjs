"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Billing Store owns marketplace settlement, refund and recovery contracts", () => {
  const billing = read("js/billing-store.js");
  assert.match(billing, /ws_app_billing_marketplace_settlements_v1/);
  assert.match(billing, /quoteMarketplaceSettlement/);
  assert.match(billing, /commitMarketplaceSettlement/);
  assert.match(billing, /refundMarketplaceSettlement/);
  assert.match(billing, /retryMarketplaceSettlement/);
  assert.match(billing, /reconcileMarketplaceSettlements/);
  assert.match(billing, /MARKETPLACE_BUYER_DEBIT/);
  assert.match(billing, /MARKETPLACE_SELLER_CREDIT/);
  assert.match(billing, /MARKETPLACE_PLATFORM_FEE/);
  assert.match(billing, /ws:billing-marketplace-settlement-updated/);
  assert.doesNotMatch(billing, /commitMarketplaceSettlement[\s\S]{0,3000}executeAdminBillingTransfer\(/);
});

test("Campaign Data I/O includes marketplace settlement persistence", () => {
  const adapters = read("js/campaign-data-io-adapters.js");
  assert.match(adapters, /ws_app_billing_marketplace_settlements_v1/);
  assert.match(adapters, /billing_bridge_schema_2_2x/);
});

test("Billing contract documents marketplace settlement as a Billing-owned boundary", () => {
  const contract = read("docs/contracts/core/billing_marketplace_settlement_contract.md");
  assert.match(contract, /buyer debit/i);
  assert.match(contract, /seller credit/i);
  assert.match(contract, /platform fee/i);
  assert.match(contract, /idempot/i);
  assert.match(contract, /RECOVERY_REQUIRED/);
  assert.match(contract, /must not call `ADMIN_TRANSFER`/i);
});
