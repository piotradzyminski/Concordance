"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createPickupHarness() {
  const items = new Map();
  const transactions = new Map();
  let billingIntent = null;
  const state = { campaignDateIso: "2109-02-13" };
  const product = {
    id: "ration-runtime-1",
    catalogId: "ration-runtime-1",
    definitionId: "ration-runtime-1",
    name: "Runtime Ration",
    category: "FOOD",
    price: 100,
    manufacturer: "Habitat Market"
  };
  const wsApp = {
    getCampaignDateIso: () => state.campaignDateIso,
    getEquipmentCatalogItems: () => [product],
    getEquipmentCatalogItemById: (id) => id === product.id ? product : null,
    getCitizenById: (id) => id === "citizen-a" ? { id: "citizen-a", credits: 1000 } : null,
    createBillingIntent(input) {
      billingIntent = { billingIntentId: "billing-intent-pickup", status: "DRAFT", ...input };
      return { ok: true, billingIntent };
    },
    authorizeBillingIntent() {
      billingIntent.status = "AUTHORIZED";
      return { ok: true, billingIntent };
    },
    captureBillingIntent() {
      billingIntent.status = "CAPTURED";
      return { ok: true, billingTransaction: { billingTransactionId: "billing-transaction-pickup", amount: 100, status: "CAPTURED" } };
    },
    voidBillingIntent: () => ({ ok: true }),
    refundBillingTransaction: () => ({ ok: true, billingTransaction: { billingTransactionId: "billing-refund-pickup" } }),
    getBillingIntent: () => billingIntent,
    getBillingTransaction: () => null,
    getItemInstanceById: (id) => items.get(id) || null,
    commitItemInstanceTransaction(input) {
      const replay = transactions.get(input.idempotencyKey);
      if (replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", transaction: replay };
      for (const operation of input.operations) {
        if (operation.type === "CREATE") items.set(operation.instanceId, structuredClone(operation.instance));
        if (operation.type === "MOVE") {
          const current = items.get(operation.instanceId);
          assert.ok(current, `Missing ItemInstance ${operation.instanceId}.`);
          current.location = structuredClone(operation.toLocation);
          current.lifecycleState = operation.lifecycleState;
          current.acquisition = { ...(current.acquisition || {}), ...(operation.patch?.acquisition || {}) };
          current.flags = { ...(current.flags || {}), ...(operation.patch?.flags || {}) };
          items.set(operation.instanceId, current);
        }
      }
      const transaction = {
        transactionId: `item-transaction-${transactions.size + 1}`,
        status: "COMMITTED",
        idempotencyKey: input.idempotencyKey
      };
      transactions.set(input.idempotencyKey, transaction);
      return { ok: true, committed: true, transaction };
    },
    getItemInstanceTransactionByIdempotencyKey: (key) => transactions.get(key) || null,
    compensateItemInstanceTransaction: () => ({ ok: true }),
    removeItemInstance(id) {
      items.delete(id);
      return { ok: true };
    },
    flushScheduledItemStorePersistence: () => true,
    getItemInstanceStoreRevision: () => 1,
    resolveOrganizationLocationSource: (organizationLocationId) => ({
      organizationName: "Habitat Market",
      organizationId: "org-habitat-market",
      sourceInstitutionId: organizationLocationId,
      sourceAddress: "03.51N00E.060.HAB2.209::B12.001.001"
    })
  };
  const runtime = createBrowserRuntime({ wsApp, nowIso: "2109-02-13T12:00:00.000Z" });
  runtime.load("data/market-offers.js");
  runtime.load("js/market-store.js");
  return { runtime, items, transactions, state, product };
}

test("Market pickup creates vendor custody and confirms the same ItemInstance into Citizen custody", () => {
  const { runtime, items, product } = createPickupHarness();
  const api = runtime.window.WS_APP;
  const offer = api.getMarketOfferByCatalogItemId(product.id);
  assert.ok(offer.fulfillmentOptions.includes("PICKUP"));
  assert.ok(offer.organizationLocationId);

  const cart = api.createMarketCart("citizen-a").cart;
  const update = api.updateMarketCart(cart.cartId, {
    addLine: { marketOfferId: offer.marketOfferId, quantity: 1, fulfillmentMode: "PICKUP" }
  });
  assert.equal(update.ok, true);

  const checkout = api.checkoutMarketCart(cart.cartId, {
    idempotencyKey: "market-pickup-runtime-test",
    paymentSource: "CREDITS"
  });
  assert.equal(checkout.ok, true, checkout.reason);
  assert.equal(checkout.operation, "PICKUP_READY");
  assert.equal(checkout.order.status, "FULFILLING");
  assert.equal(checkout.order.pickupFulfillment.status, "READY");

  const instanceId = checkout.createdItemInstanceIds[0];
  assert.equal(items.get(instanceId).location.type, "VENDOR");
  assert.equal(items.get(instanceId).lifecycleState, "PACKAGED");

  const confirmation = api.confirmMarketPickup(checkout.marketOrderId, {
    expectedRevision: checkout.order.revision,
    idempotencyKey: checkout.order.pickupFulfillment.completionIdempotencyKey
  });
  assert.equal(confirmation.ok, true, confirmation.reason);
  assert.equal(confirmation.order.status, "COMPLETED");
  assert.equal(confirmation.order.pickupFulfillment.status, "COMPLETED");
  assert.equal(items.get(instanceId).location.type, "UNPLACED");
  assert.equal(items.get(instanceId).lifecycleState, "UNPACKAGED");

  const replay = api.confirmMarketPickup(checkout.marketOrderId, {
    idempotencyKey: checkout.order.pickupFulfillment.completionIdempotencyKey
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.operation, "IDEMPOTENT_REPLAY");
  assert.equal(items.size, 1);
});
