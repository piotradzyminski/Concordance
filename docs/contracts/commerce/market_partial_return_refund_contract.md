# Market Partial Return / Refund Contract 6.1x

## Status

```text
IMPLEMENTED: patch_market_partial_return_refund_6.1x
OWNER: Market Store
UI CONSUMER: Housing Market order history
PHYSICAL OWNER: ItemInstance Transaction Store
FINANCIAL OWNER: Billing Store
STOCK OWNER: Market Store
```

## Purpose

This contract defines selected-instance returns for completed Market orders. A partial return is a recoverable Market operation that coordinates existing public ItemInstance, stock and Billing boundaries without creating replacement items or a parallel return store.

## Ownership

- `js/market-store.js` owns request state, selected order units, line receipts, order revision and operation recovery.
- ItemInstance Transaction Store owns the physical transfer of selected instances from Citizen custody to vendor custody.
- Billing Store owns the proportional refund and original transaction totals.
- Market stock runtime owns restored quantities and stock return receipts.
- `js/housing.js` renders commands and read models only. It does not mutate Market orders, ItemInstances, stock or Billing directly.

## MarketOrder schema

`MARKET_ORDER_SCHEMA_VERSION = 5`.

```js
partialReturns: [
  {
    partialReturnId,
    status,
    reasonCode,
    note,
    requestIdempotencyKey,
    withdrawIdempotencyKey,
    executionIdempotencyKey,
    returnInstanceIds: [],
    lineReceipts: [],
    requestedAmount,
    itemTransactionId,
    billingRefundTransactionId,
    errors: [],
    requestedAt,
    withdrawnAt,
    processingAt,
    completedAt,
    updatedAt
  }
]
```

Allowed operation statuses:

```text
REQUESTED
WITHDRAWN
PROCESSING
RECOVERY_REQUIRED
COMPLETED
```

One order may contain multiple completed partial returns. At most one operation may be active in `REQUESTED`, `PROCESSING` or `RECOVERY_REQUIRED`.

## Line receipt

Every selected unit is assigned to its original order line before execution.

```js
{
  marketOrderLineId,
  marketOfferId,
  stockReservationId,
  quantity,
  instanceIds: [],
  refundAmount,
  stockReturnIdempotencyKey,
  stockReturnReceiptId
}
```

Invariants:

```text
lineReceipt.quantity === lineReceipt.instanceIds.length
all instanceIds belong to the referenced MarketOrder line
one instanceId may be completed by at most one return operation
sum of completed line refundAmount values never exceeds the original lineTotal
last returned units of a line consume its exact remaining refundable amount
```

## Public API

```js
quoteMarketOrderPartialReturn(marketOrderId, input)
requestMarketOrderPartialReturn(marketOrderId, input)
withdrawMarketOrderPartialReturn(marketOrderId, partialReturnId, input)
executeMarketOrderPartialReturn(marketOrderId, partialReturnId, input)
retryMarketOrderPartialReturn(marketOrderId, partialReturnId, input)
reconcileInterruptedMarketPartialReturns()
```

`getMarketOrderActionState()` additionally exposes:

```text
canRequestPartialReturn
canExecutePartialReturn
canWithdrawPartialReturn
canRetryPartialReturn
activePartialReturn
partialReturnEligibleInstanceIds
returnedInstanceIds
partialReturnBlockers
partialReturnExecutionBlockers
partialReturnRetryBlockers
```

Every mutating command requires an idempotency key. UI commands also submit `expectedRevision`.

## Eligibility

A selected instance is returnable only when it:

```text
belongs to the MarketOrder
has not already been returned
still exists
remains in HOUSING_STORAGE
has lifecycle UNPACKAGED or STORED
has no service history
has unchanged condition
maps to a persisted MarketOrder line and stock reservation
```

The order must be `COMPLETED`, have a captured Billing transaction and have no active full-order refund. Its payment status may be `CAPTURED` or `PARTIALLY_REFUNDED`.

## Execution sequence

```text
validate expected revision and idempotency
persist operation PROCESSING and order RETURNING
commit one ItemInstance market-return transaction for selected instanceIds
commit per-line stock return receipts for selected quantities
refund exactly partialReturn.requestedAmount through Billing
persist operation COMPLETED
persist order COMPLETED / PARTIALLY_REFUNDED while units remain
persist order REFUNDED only when all units and the full captured amount are returned
```

The physical transaction preserves the original `instanceId`. Selected instances move:

```text
HOUSING_STORAGE / Citizen custody
→ VENDOR / vendor custody
```

Unselected instances are not touched.

## Stock settlement

Stock reservations support:

```text
returnedQuantity
returnReceipts[]
status = PARTIALLY_RETURNED | RETURNED
```

Each receipt uses an execution-scoped key:

```text
[executionIdempotencyKey]:[marketOrderLineId]
```

A replay with the same key and quantity returns the existing receipt. A replay with a different quantity is rejected. `soldQuantity` is reduced only by the selected quantity.

## Billing settlement

Billing is called with an explicit amount:

```js
refundBillingTransaction(
  originalBillingTransactionId,
  partialReturn.requestedAmount,
  { idempotencyKey: `${executionIdempotencyKey}:billing-refund` }
)
```

The Market operation stores `billingRefundTransactionId`. Recovery may resolve the refund through that persisted ID or through Billing's idempotency index. Market never changes Citizen credits or Billing transaction fields directly.

## Failure and recovery

### ItemInstance failure

```text
no stock receipt
no Billing refund
operation RECOVERY_REQUIRED
order returns to COMPLETED
```

### Stock persistence failure

```text
compensate committed ItemInstance transaction
no Billing refund
operation RECOVERY_REQUIRED
order COMPLETED when compensation succeeds
```

### Billing failure

```text
selected ItemInstances remain in VENDOR custody
selected stock remains restored
operation RECOVERY_REQUIRED
order PAYMENT_RECOVERY_REQUIRED
retry reuses physical and stock receipts and executes Billing/finalization only
```

### Interrupted process

Startup reconciliation inspects:

```text
persisted executionIdempotencyKey
ItemInstance transaction status
stock return receipts
Billing refund transaction
```

When all three domain receipts exist, the operation is finalized without replaying domain mutations. An interrupted incomplete operation becomes `RECOVERY_REQUIRED`.

## UI boundary

Housing Market order details may:

- show eligible concrete units grouped by order line;
- request a selected return;
- execute, retry or withdraw the active operation;
- show per-line returned counts and completed return history.

UI state is local presentation state only. Rendering an order card performs no reconciliation and no domain mutation.

## Out of scope

```text
admin approval or rejection policy
return windows and vendor-specific fees
returning used, damaged or serviced items
restocking fees
exchange operations
consumable use-state validation
physical return from Pickup vendor custody before Citizen collection
```
