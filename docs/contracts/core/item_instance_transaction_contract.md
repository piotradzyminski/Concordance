# ItemInstance Transaction and Compensation Contract — 6.2x

## Status

```text
IMPLEMENTED: patch_item_instance_transaction_compensation_6.2x.zip
CANONICAL PHYSICAL MUTATION BOUNDARY
```

## Ownership

`js/item-instance-store.js` remains the only owner of canonical physical item records.

`js/item-instance-transaction-store.js` owns:

```text
transaction identity
idempotency receipts
before/after snapshots
commit confirmation
compensation confirmation
interrupted-operation reconciliation
specialized Service / Cyberware / Market physical commands
```

The transaction store never creates a parallel item collection. Transaction records contain references and snapshots needed for rollback/recovery only.

## Persistence

Canonical keys:

```text
ws_app_item_instances_v1
ws_app_item_instance_transactions_v1
```

Critical transaction sequence:

```text
validate + preview complete mutation set
→ persist PREPARED transaction record
→ commit all ItemInstance mutations in memory
→ synchronously persist canonical ItemInstance snapshot
→ emit one consolidated physical event
→ persist COMMITTED transaction state
```

If canonical ItemInstance persistence fails:

```text
restore previous in-memory map
restore previous snapshot and store revision
emit no physical mutation event
mark transaction FAILED
```

If final transaction-record persistence fails after the physical commit, the durable PREPARED record and before/after snapshots allow reconciliation after reload.

## Generic public API

```js
getItemInstanceTransaction(transactionId)
getItemInstanceTransactionByIdempotencyKey(idempotencyKey)
getItemInstanceTransactions(filters)
commitItemInstanceTransaction(input)
compensateItemInstanceTransaction(transactionId, input)
reconcileInterruptedItemInstanceTransactions()
validateItemInstanceTransactionReadiness()
getItemInstanceTransactionDiagnostics()
resetItemInstanceTransactionDiagnostics()
```

Low-level canonical store boundary:

```js
previewItemInstanceMutationPlan(plan)
commitItemInstanceMutationPlan(plan, options)
restoreItemInstanceSnapshots(beforeInstances, afterInstances, options)
itemSnapshotsEqual(left, right)
```

World Bridge and domain modules should use the transaction commands, not the low-level plan API.

## Transaction input

```js
{
  idempotencyKey: "...",
  sourceDomain: "SERVICE | MARKET | CYBERWARE | WORLD_BRIDGE",
  sourceRefId: "...",
  citizenId: "citizen-a",
  expectedStoreRevision: 42,
  changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE"],
  operations: [],
  metadata: {}
}
```

Supported generic operations:

```text
CREATE
PATCH
MOVE
REMOVE
```

All operations are resolved against one initial store revision and committed as one mutation plan. A transaction cannot expose a partial set of item changes.

## Idempotency

One `idempotencyKey` maps to one request signature and one transaction record.

Same key + same request:

```text
IDEMPOTENT_REPLAY
```

Same key + different request:

```text
ITEM_INSTANCE_TRANSACTION_IDEMPOTENCY_CONFLICT
```

Replay does not emit another physical event or increment the canonical ItemInstance store revision.

## Compensation

Compensation restores the recorded `beforeInstances` only when every current touched instance still matches the recorded `afterInstances` snapshot.

Conflict result:

```text
ITEM_INSTANCE_SNAPSHOT_CONFLICT
RECOVERY_REQUIRED
```

This prevents a late compensation from overwriting a later install, transfer, repair, condition change, firmware update or ownership change.

Compensation is itself idempotent and emits one physical event only after a successful durable restore.

## Specialized commands

```js
commitItemInstanceServiceCustody(input)
commitItemInstanceBodyPlacement(input)
commitItemInstanceReplacement(input)
commitItemInstanceMarketReturn(input)
commitItemInstanceServiceResult(input)
```

### Service custody

```text
existing citizen ItemInstance
→ SERVICE
→ same instanceId
→ explicit serviceOrderId, providerId and returnLocation
```

Anonymous `SERVICE`, `PENDING`, `SURGERY` and orphan custody states are not created.

### Body placement

```text
SERVICE / HOUSING_STORAGE / CONTAINER_GRID / UNPLACED
→ BODY
→ same instanceId
→ lifecycle INSTALLED
```

### Replace

```text
old BODY → explicit return location
new stored/service item → BODY
one transaction
```

Both items commit or both remain unchanged.

### Market return

```text
same unused ItemInstance
HOUSING_STORAGE → VENDOR
citizen ownership released
marketOrderId and vendorProviderId retained in custody metadata
```

Market return is blocked when the item:

```text
is missing
belongs to another citizen or order
is outside HOUSING_STORAGE
has service history
has changed condition
has incompatible lifecycle
```

Billing refund remains a Market/Billing command performed after the physical return transaction.

### Service result

`commitItemInstanceServiceResult()` applies one Service result object as one transaction:

```text
itemMutations
conditionChanges
firmwareChanges
authorizationChanges
serviceHistoryEntries
```

The returned `itemCommit` object is compatible with `completeServiceOrder()` commit confirmation:

```js
{
  committed: true,
  status: "COMMITTED",
  transactionId: "...",
  instanceIds: [],
  revision: 42
}
```

## Events

Successful physical commit or compensation emits one:

```text
ws:item-instances-updated
```

Payload includes:

```text
eventId
transactionId
instanceIds
previousLocations
nextLocations
citizenIds
changedDomains
revision
```

Transaction lifecycle emits:

```text
ws:item-instance-transaction-updated
```

Transaction status events do not build EquipmentState or CyberGrid.

## Performance invariants

```text
one mutation plan = one canonical store rebuild
one durable physical commit = one physical event
quote/status/recovery reads = zero EquipmentState builds
no compatibility-view projection required for transaction validation
same-grid fast path remains outside this transaction layer
```

## Recovery

`reconcileInterruptedItemInstanceTransactions()` compares current canonical records with durable before/after snapshots:

```text
matches after → COMMITTED
matches before → FAILED / rolled back
mixed or divergent → RECOVERY_REQUIRED
compensation matches before → COMPENSATED
```

Reconciliation does not guess or automatically overwrite divergent physical state.
