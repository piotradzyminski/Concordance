"use strict";

const assert = require("node:assert/strict");

function assertReplay(result, expectedOperation = "IDEMPOTENT_REPLAY") {
  assert.equal(result?.ok, true, JSON.stringify(result));
  const operation = result.operation || result.reason;
  assert.equal(operation, expectedOperation, JSON.stringify(result));
}

function assertRevisionIncreased(before, after) {
  assert.ok(Number(after?.revision) > Number(before?.revision), `Expected revision increase: ${before?.revision} -> ${after?.revision}`);
}

module.exports = { assertReplay, assertRevisionIncreased };
