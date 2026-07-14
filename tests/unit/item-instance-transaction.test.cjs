"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

test("ItemInstance transaction commit is idempotent and does not repeat the physical mutation", () => {
  const items = new Map([
    ["item-test", {
      instanceId: "item-test",
      id: "item-test",
      ownerId: "citizen-test",
      lifecycleState: "UNPACKAGED",
      location: { type: "HOUSING_STORAGE", housingStorageId: "housing-test" },
      durability: { current: 100 }
    }]
  ]);
  let commitCount = 0;
  let storeRevision = 1;
  const runtime = createBrowserRuntime({
    wsApp: {
      getCampaignDateIso: () => "2109-02-13T12:00:00.000Z",
      getItemInstanceById: (instanceId) => items.has(instanceId) ? structuredClone(items.get(instanceId)) : null,
      normalizeItemInstance: (item) => structuredClone(item),
      previewItemInstanceMutationPlan: ({ expectedStoreRevision, operations }) => {
        const beforeInstances = operations.map((operation) => structuredClone(items.get(operation.instanceId) || null));
        const afterInstances = operations.map((operation) => operation.type === "REMOVE" ? null : structuredClone(operation.instance));
        return {
          ok: true,
          expectedStoreRevision: expectedStoreRevision ?? storeRevision,
          operations: structuredClone(operations),
          instanceIds: operations.map((operation) => operation.instanceId),
          beforeInstances,
          afterInstances
        };
      },
      commitItemInstanceMutationPlan: ({ operations }) => {
        commitCount += 1;
        for (const operation of operations) {
          if (operation.type === "REMOVE") items.delete(operation.instanceId);
          else items.set(operation.instanceId, structuredClone(operation.instance));
        }
        storeRevision += 1;
        return { ok: true, storeRevision, instanceIds: operations.map((operation) => operation.instanceId) };
      },
      restoreItemInstanceSnapshots: () => ({ ok: true }),
      itemSnapshotsEqual: (left, right) => JSON.stringify(left) === JSON.stringify(right)
    }
  });
  runtime.load("js/item-instance-transaction-store.js");

  const input = {
    idempotencyKey: "item-transaction-test",
    sourceDomain: "TEST",
    sourceRefId: "test-ref",
    citizenId: "citizen-test",
    operations: [{
      type: "MOVE",
      instanceId: "item-test",
      expected: { ownerId: "citizen-test" },
      toLocation: { type: "BODY", characterId: "citizen-test", bodySlots: ["NEURAL"] },
      lifecycleState: "INSTALLED"
    }]
  };

  const first = runtime.window.WS_APP.commitItemInstanceTransaction(input);
  const replay = runtime.window.WS_APP.commitItemInstanceTransaction(input);

  assert.equal(first.ok, true);
  assert.equal(first.committed, true);
  assert.equal(replay.ok, true);
  assert.equal(replay.operation, "IDEMPOTENT_REPLAY");
  assert.equal(commitCount, 1);
  assert.equal(items.get("item-test").location.type, "BODY");
});
