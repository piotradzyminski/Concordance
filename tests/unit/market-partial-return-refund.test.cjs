"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

function createHarness() {
  const items = new Map();
  const itemTransactions = new Map();
  const billingTransactions = [];
  const originalBilling = {
    billingTransactionId: "billing-capture-partial",
    transactionType: "CAPTURE",
    status: "CAPTURED",
    amount: 300,
    refundedAmount: 0,
    citizenId: "citizen-a",
    paymentSource: "CREDITS"
  };
  billingTransactions.push(originalBilling);

  for (const instanceId of ["item-return-a", "item-return-b", "item-return-c"]) {
    items.set(instanceId, {
      instanceId,
      ownerId: "citizen-a",
      lifecycleState: "STORED",
      location: { type: "HOUSING_STORAGE", housingStorageId: "housing-a" },
      durability: { current: 100, maximumOverride: 100 },
      serviceHistory: [],
      acquisition: { marketOrderId: "market-order-partial" }
    });
  }

  const order = {
    schemaVersion: 4,
    marketOrderId: "market-order-partial",
    cartId: "cart-partial",
    citizenId: "citizen-a",
    vendorProviderId: "vendor-a",
    status: "COMPLETED",
    paymentStatus: "CAPTURED",
    lines: [{
      marketOrderLineId: "market-line-partial",
      marketOfferId: "market-offer-partial",
      catalogItemId: "catalog-partial",
      definitionId: "catalog-partial",
      vendorProviderId: "vendor-a",
      quantity: 3,
      fulfillmentMode: "DELIVER_TO_HOUSING",
      destinationRef: { housingStorageId: "housing-a" },
      unitPrice: 100,
      lineTotal: 300,
      stockReservationId: "stock-reservation-partial",
      createdItemInstanceIds: ["item-return-a", "item-return-b", "item-return-c"]
    }],
    totals: { subtotal: 300, finalTotal: 300, currency: "CREDIT" },
    billingRefs: { billingTransactionId: originalBilling.billingTransactionId },
    createdItemInstanceIds: ["item-return-a", "item-return-b", "item-return-c"],
    idempotencyKey: "market-order-partial-key",
    refundRequest: { status: "NONE" },
    createdAt: "2109-02-13",
    completedAt: "2109-02-13",
    updatedAt: "2109-02-13",
    revision: 1
  };

  const storageSeed = {
    ws_market_orders_v1: JSON.stringify({ schemaVersion: 4, orders: [order] }),
    ws_market_stock_v1: JSON.stringify({
      schemaVersion: 4,
      offers: {
        "market-offer-partial": {
          soldQuantity: 3,
          reservations: {
            "stock-reservation-partial": {
              reservationId: "stock-reservation-partial",
              marketOfferId: "market-offer-partial",
              marketOrderId: "market-order-partial",
              quantity: 3,
              status: "COMMITTED",
              idempotencyKey: "stock-reserve-partial",
              committedAt: "2109-02-13"
            }
          }
        }
      }
    })
  };

  const wsApp = {
    getCampaignDateIso: () => "2109-02-13",
    getEquipmentCatalogItems: () => [],
    getEquipmentCatalogItemById: () => null,
    getItemInstanceById: (instanceId) => items.get(instanceId) || null,
    getItemInstanceTransaction: (transactionId) => [...itemTransactions.values()].find((entry) => entry.transactionId === transactionId) || null,
    getItemInstanceTransactionByIdempotencyKey: (key) => itemTransactions.get(key) || null,
    commitItemInstanceMarketReturn(input) {
      const replay = itemTransactions.get(input.idempotencyKey);
      if (replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", transaction: replay };
      input.instanceIds.forEach((instanceId) => {
        const item = items.get(instanceId);
        assert.ok(item);
        assert.equal(item.location.type, "HOUSING_STORAGE");
        item.location = { type: "VENDOR", vendorProviderId: input.vendorProviderId, marketOrderId: input.marketOrderId };
        item.lifecycleState = "PACKAGED";
        items.set(instanceId, item);
      });
      const transaction = {
        transactionId: `item-return-tx-${itemTransactions.size + 1}`,
        idempotencyKey: input.idempotencyKey,
        status: "COMMITTED"
      };
      itemTransactions.set(input.idempotencyKey, transaction);
      return { ok: true, transaction };
    },
    compensateItemInstanceTransaction: () => ({ ok: true }),
    getBillingTransaction(transactionId) {
      return billingTransactions.find((entry) => entry.billingTransactionId === transactionId) || null;
    },
    getBillingTransactions: () => billingTransactions.map((entry) => structuredClone(entry)),
    refundBillingTransaction(transactionId, amount, options = {}) {
      const replay = billingTransactions.find((entry) => entry.idempotencyKey === options.idempotencyKey);
      if (replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", billingTransaction: replay, originalTransaction: originalBilling };
      assert.equal(transactionId, originalBilling.billingTransactionId);
      const refundable = originalBilling.amount - originalBilling.refundedAmount;
      assert.ok(amount > 0 && amount <= refundable);
      originalBilling.refundedAmount += amount;
      originalBilling.status = originalBilling.refundedAmount >= originalBilling.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";
      const refund = {
        billingTransactionId: `billing-refund-${billingTransactions.length}`,
        parentTransactionId: transactionId,
        transactionType: "REFUND",
        status: "CAPTURED",
        amount,
        idempotencyKey: options.idempotencyKey
      };
      billingTransactions.push(refund);
      return { ok: true, billingTransaction: refund, originalTransaction: structuredClone(originalBilling) };
    }
  };

  const runtime = createBrowserRuntime({ wsApp, storageSeed });
  runtime.load("data/market-offers.js");
  runtime.load("js/market-store.js");
  return { runtime, items, billingTransactions, originalBilling };
}

function readStock(runtime) {
  return JSON.parse(runtime.storage.getItem("ws_market_stock_v1"));
}

test("partial returns preserve kept instances, restore proportional stock and refund only selected units", () => {
  const { runtime, items, originalBilling } = createHarness();
  const api = runtime.window.WS_APP;

  const request = api.requestMarketOrderPartialReturn("market-order-partial", {
    instanceIds: ["item-return-a", "item-return-b"],
    reasonCode: "CHANGED_MIND",
    expectedRevision: 1,
    idempotencyKey: "partial-request-1"
  });
  assert.equal(request.ok, true, request.reason);
  assert.equal(request.partialReturn.requestedAmount, 200);
  assert.equal(request.partialReturn.lineReceipts[0].quantity, 2);

  const execution = api.executeMarketOrderPartialReturn("market-order-partial", request.partialReturn.partialReturnId, {
    expectedRevision: request.order.revision,
    idempotencyKey: "partial-execute-1"
  });
  assert.equal(execution.ok, true, execution.reason);
  assert.equal(execution.operation, "PARTIALLY_REFUNDED");
  assert.equal(execution.order.status, "COMPLETED");
  assert.equal(execution.order.paymentStatus, "PARTIALLY_REFUNDED");
  assert.equal(items.get("item-return-a").location.type, "VENDOR");
  assert.equal(items.get("item-return-b").location.type, "VENDOR");
  assert.equal(items.get("item-return-c").location.type, "HOUSING_STORAGE");
  assert.equal(originalBilling.refundedAmount, 200);
  assert.equal(originalBilling.status, "PARTIALLY_REFUNDED");

  const stockAfterPartial = readStock(runtime).offers["market-offer-partial"];
  assert.equal(stockAfterPartial.soldQuantity, 1);
  assert.equal(stockAfterPartial.reservations["stock-reservation-partial"].status, "PARTIALLY_RETURNED");
  assert.equal(stockAfterPartial.reservations["stock-reservation-partial"].returnedQuantity, 2);
  assert.equal(stockAfterPartial.reservations["stock-reservation-partial"].returnReceipts.length, 1);

  const state = api.getMarketOrderActionState(execution.order.marketOrderId);
  assert.deepEqual(Array.from(state.partialReturnEligibleInstanceIds), ["item-return-c"]);

  const secondRequest = api.requestMarketOrderPartialReturn("market-order-partial", {
    instanceIds: ["item-return-c"],
    reasonCode: "CHANGED_MIND",
    expectedRevision: execution.order.revision,
    idempotencyKey: "partial-request-2"
  });
  assert.equal(secondRequest.ok, true, secondRequest.reason);
  assert.equal(secondRequest.partialReturn.requestedAmount, 100);

  const secondExecution = api.executeMarketOrderPartialReturn("market-order-partial", secondRequest.partialReturn.partialReturnId, {
    expectedRevision: secondRequest.order.revision,
    idempotencyKey: "partial-execute-2"
  });
  assert.equal(secondExecution.ok, true, secondExecution.reason);
  assert.equal(secondExecution.order.status, "REFUNDED");
  assert.equal(secondExecution.order.paymentStatus, "REFUNDED");
  assert.equal(originalBilling.refundedAmount, 300);
  assert.equal(readStock(runtime).offers["market-offer-partial"].soldQuantity, 0);
});
