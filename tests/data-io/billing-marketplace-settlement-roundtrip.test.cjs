"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function loadCampaignDataIo(runtime) {
  runtime.loadMany([
    "js/admin-audit-store.js",
    "js/campaign-data-io-registry.js",
    "js/campaign-data-io-adapters.js",
    "js/campaign-data-io-v6.js"
  ]);
}

test("Campaign Snapshot v6 round-trips Billing marketplace settlements", () => {
  const settlementState = [{
    schemaVersion: 1,
    settlementId: "marketplace-settlement-test",
    settlementType: "MARKETPLACE_SALE",
    listingId: "listing-test",
    marketOrderId: "market-order-test",
    buyerRef: { partyType: "CITIZEN", partyId: "buyer", accountId: "CITIZEN:buyer" },
    sellerRef: { partyType: "CITIZEN", partyId: "seller", accountId: "CITIZEN:seller" },
    platformRef: { partyType: "ORGANIZATION", partyId: "habitat-market", accountId: "ORGANIZATION:habitat-market" },
    grossAmount: 500,
    platformFeeRate: 0.05,
    platformFeeAmount: 25,
    sellerNetAmount: 475,
    refundedAmount: 0,
    sellerRefundedAmount: 0,
    platformFeeRefundedAmount: 0,
    refunds: [],
    status: "CAPTURED",
    idempotencyKey: "marketplace-settlement-test",
    correlationId: "market-order-test",
    revision: 2
  }];
  const runtime = createBrowserRuntime({
    storageSeed: {
      ws_app_billing_marketplace_settlements_v1: JSON.stringify(settlementState),
      ws_app_billing_bridge_schema: "billing_bridge_schema_2_2x"
    }
  });
  loadCampaignDataIo(runtime);

  const snapshot = runtime.window.WS_APP.exportCampaignSnapshotV6({ flush: false, campaignId: "marketplace-settlement-test" });
  const validation = runtime.window.WS_APP.validateCampaignSnapshotV6(snapshot);
  assert.equal(validation.ok, true, JSON.stringify(validation.error));

  const reset = runtime.window.WS_APP.resetCampaignStateV6();
  assert.equal(reset.ok, true, JSON.stringify(reset));
  assert.equal(runtime.storage.getItem("ws_app_billing_marketplace_settlements_v1"), null);

  const imported = runtime.window.WS_APP.importCampaignSnapshotV6(snapshot);
  assert.equal(imported.ok, true, JSON.stringify(imported));
  assert.deepEqual(JSON.parse(runtime.storage.getItem("ws_app_billing_marketplace_settlements_v1")), settlementState);
  assert.equal(runtime.storage.getItem("ws_app_billing_bridge_schema"), "billing_bridge_schema_2_2x");
});
