"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");
const { makeCitizen } = require("../helpers/fixtures.cjs");
const { assertRevisionIncreased } = require("../helpers/assertions.cjs");

test("Billing intent revisions remain monotonic and repeated authorization is idempotent", () => {
  const citizen = makeCitizen({ credits: 1200 });
  let accountMutations = 0;
  const runtime = createBrowserRuntime({
    wsApp: {
      getCitizenById: (citizenId) => citizenId === citizen.id ? structuredClone(citizen) : null,
      updateCitizen: (citizenId, patch) => {
        assert.equal(citizenId, citizen.id);
        accountMutations += 1;
        Object.assign(citizen, structuredClone(patch));
        return structuredClone(citizen);
      },
      getBillingHistory: () => [],
      addBillingHistoryEntry: () => ({ ok: true }),
      formatCredits: (amount) => `${amount} ₡`
    },
    terminalNotifications: { emit: () => ({ ok: true }) }
  });
  runtime.load("js/billing-store.js");

  const created = runtime.window.WS_APP.createBillingIntent({
    citizenId: citizen.id,
    sourceDomain: "TEST",
    sourceRefId: "billing-test",
    amount: 250,
    idempotencyKey: "billing-intent-test",
    paymentSource: "CREDITS"
  });
  assert.equal(created.ok, true);
  assert.equal(created.billingIntent.revision, 1);

  const authorized = runtime.window.WS_APP.authorizeBillingIntent(created.billingIntent.billingIntentId);
  assert.equal(authorized.ok, true);
  assert.equal(authorized.operation, "AUTHORIZED");
  assertRevisionIncreased(created.billingIntent, authorized.billingIntent);

  const replay = runtime.window.WS_APP.authorizeBillingIntent(created.billingIntent.billingIntentId);
  assert.equal(replay.ok, true);
  assert.equal(replay.operation, "IDEMPOTENT_REPLAY");
  assert.equal(replay.billingIntent.revision, authorized.billingIntent.revision);
  assert.equal(accountMutations, 0, "Authorization must reserve funds without changing the account.");

  const captured = runtime.window.WS_APP.captureBillingIntent(created.billingIntent.billingIntentId, {
    idempotencyKey: "billing-capture-test",
    recordHistory: false
  });
  assert.equal(captured.ok, true);
  assertRevisionIncreased(authorized.billingIntent, captured.billingIntent);
  assert.equal(citizen.credits, 950);
  assert.equal(accountMutations, 1);

  const captureReplay = runtime.window.WS_APP.captureBillingIntent(created.billingIntent.billingIntentId, {
    idempotencyKey: "billing-capture-test",
    recordHistory: false
  });
  assert.equal(captureReplay.ok, true);
  assert.equal(captureReplay.operation, "IDEMPOTENT_REPLAY");
  assert.equal(citizen.credits, 950);
  assert.equal(accountMutations, 1);
});
