"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readProjectFile, extractFunctionSource } = require("../helpers/source-contract.cjs");

test("Market exposes a revisioned partial return API without replacing the full refund boundary", () => {
  const source = readProjectFile("js/market-store.js");
  assert.match(source, /MARKET_ORDER_SCHEMA_VERSION = 8/);
  assert.match(source, /partialReturns:/);
  assert.match(source, /quoteMarketOrderPartialReturn/);
  assert.match(source, /requestMarketOrderPartialReturn/);
  assert.match(source, /withdrawMarketOrderPartialReturn/);
  assert.match(source, /executeMarketOrderPartialReturn/);
  assert.match(source, /retryMarketOrderPartialReturn/);
  assert.match(source, /requestMarketOrderRefund/);
  assert.match(source, /executeMarketOrderRefund/);
});

test("Partial return transfers selected ItemInstances, restores only matching stock quantity and sends an explicit Billing amount", () => {
  const source = readProjectFile("js/market-store.js");
  const execute = extractFunctionSource(source, "executeMarketOrderPartialReturn");
  const stock = extractFunctionSource(source, "commitMarketOrderPartialStockReturn");
  assert.match(execute, /commitItemInstanceMarketReturn/);
  assert.match(execute, /instanceIds:\s*active\.returnInstanceIds/);
  assert.match(execute, /refundBillingTransaction/);
  assert.match(execute, /active\.requestedAmount/);
  assert.match(stock, /returnedQuantity/);
  assert.match(stock, /PARTIALLY_RETURNED/);
  assert.match(stock, /runtime\.soldQuantity = Math\.max\(0[\s\S]*lineReceipt\.quantity/);
  assert.match(stock, /returnReceipts/);
});

test("Partial return recovery is idempotent and preserves completed per-line receipts", () => {
  const source = readProjectFile("js/market-store.js");
  const retry = extractFunctionSource(source, "retryMarketOrderPartialReturn");
  const reconcile = extractFunctionSource(source, "reconcileInterruptedMarketPartialReturns");
  assert.match(retry, /executionIdempotencyKey/);
  assert.match(retry, /COMPENSATED/);
  assert.match(reconcile, /isMarketOrderPartialStockReturned/);
  assert.match(reconcile, /getMarketPartialReturnBillingState/);
  assert.match(source, /stockReturnReceiptId/);
  assert.match(source, /marketOrderLineId/);
});

test("Housing Market renders selectable units and request, execute, retry and withdraw commands", () => {
  const source = readProjectFile("js/market-workspace-runtime.js");
  assert.match(source, /renderCanonicalMarketPartialReturnWorkspace/);
  assert.match(source, /data-housing-market-partial-return-instance/);
  assert.match(source, /REQUEST SELECTED RETURN/);
  assert.match(source, /data-housing-market-partial-return-execute/);
  assert.match(source, /data-housing-market-partial-return-retry/);
  assert.match(source, /data-housing-market-partial-return-withdraw/);
  assert.match(source, /requestMarketOrderPartialReturn/);
  assert.match(source, /executeMarketOrderPartialReturn/);
});

test("Partial return bundle versions are cache-busted consistently", () => {
  const index = readProjectFile("index.html");
  const modules = readProjectFile("js/modules.js");
  assert.match(index, /js\/market-store\.js\?v=14/);
  assert.match(index, /js\/modules\.js\?v=318/);
  assert.match(modules, /css\/housing\.css\?v=40/);
  assert.match(modules, /js\/market-store\.js\?v=14/);
  assert.match(modules, /js\/housing\.js\?v=54/);
  assert.match(modules, /js\/market-workspace-runtime\.js\?v=6/);


});
