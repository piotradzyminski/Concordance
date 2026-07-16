"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Admin Billing workspace separates corrections from canonical paired transfers", () => {
  const admin = read("js/admin-control.js");
  assert.match(admin, /Manual Economy Adjustment/);
  assert.match(admin, /Atomic Account Transfer/);
  assert.match(admin, /data-admin-transfer-form/);
  assert.match(admin, /previewAdminBillingTransfer/);
  assert.match(admin, /executeAdminBillingTransfer/);
  assert.match(admin, /ADMIN_BILLING_TRANSFER/);
  assert.match(admin, /billingTransferIds/);
  assert.doesNotMatch(admin, /sourceParty\.credits\s*[-+]?=/);
  assert.doesNotMatch(admin, /targetParty\.credits\s*[-+]?=/);
});

test("Billing Store owns transfer records, paired transactions and rollback", () => {
  const billing = read("js/billing-store.js");
  assert.match(billing, /ws_app_billing_transfer_accounts_v1/);
  assert.match(billing, /ws_app_billing_transfers_v1/);
  assert.match(billing, /ADMIN_TRANSFER_DEBIT/);
  assert.match(billing, /ADMIN_TRANSFER_CREDIT/);
  assert.match(billing, /ADMIN_TRANSFER_RECOVERY_REQUIRED/);
  assert.match(billing, /reverseAdminBillingTransfer/);
  assert.match(billing, /ws:billing-transfer-updated/);
});

test("Campaign Snapshot v6 includes transfer accounts and transfer records", () => {
  const adapters = read("js/campaign-data-io-adapters.js");
  assert.match(adapters, /ws_app_billing_transfer_accounts_v1/);
  assert.match(adapters, /ws_app_billing_transfers_v1/);
  assert.match(adapters, /billing_bridge_schema_2_2x/);
});
