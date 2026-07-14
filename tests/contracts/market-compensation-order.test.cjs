"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { readProjectFile, extractFunctionSource } = require("../helpers/source-contract.cjs");

test("Market compensation settles Service Billing before cancelling the ServiceOrder", () => {
  const source = readProjectFile("js/market-store.js");
  const functionSource = extractFunctionSource(source, "settleThenCancelLinkedServiceOrder");
  const settleIndex = functionSource.indexOf("settleLinkedServiceBilling");
  const rereadIndex = functionSource.indexOf("getServiceOrder?.(id)", settleIndex + 1);
  const cancelIndex = functionSource.indexOf("cancelServiceOrder");

  assert.ok(settleIndex >= 0, "Billing settlement call is missing.");
  assert.ok(rereadIndex > settleIndex, "ServiceOrder must be re-read after Billing settlement.");
  assert.ok(cancelIndex > rereadIndex, "ServiceOrder cancellation must use the fresh post-settlement revision.");
  assert.match(functionSource, /expectedRevision:\s*fresh\.revision/);
});
