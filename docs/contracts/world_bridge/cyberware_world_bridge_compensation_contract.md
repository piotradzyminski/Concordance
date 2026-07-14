# Cyberware World Bridge Compensation Contract 14.2x

## Scope

This contract defines post-physical-commit reversal for Cyberware World Bridge operations.

Runtime owner:

```text
js/cyberware-world-bridge.js
```

The adapter coordinates existing domain commands. It does not create parallel Market, Service, Billing, Housing, ItemInstance or World Bridge stores.

## Public API

```text
quoteCyberwareWorldCompensation(operationId, options)
compensateCyberwareWorldOperation(operationId, options)
retryCyberwareWorldCompensation(operationId, options)
resumePendingCyberwareCompensations()
auditCyberwareWorldBridgeCompensation()
```

`retryCyberwareWorldOperation()` delegates to the compensation API when the operation or its compensation record is in compensation recovery.

## Eligibility

Compensation is accepted only for a persisted Cyberware World Bridge operation in one of these states:

```text
COMPLETED
FAILED
CANCELLED
RECOVERY_REQUIRED
PAYMENT_RECOVERY_REQUIRED
COMPENSATION_REQUIRED
```

Physical Service operations require `refs.itemTransactionId`. Purchase operations require `refs.marketOrderId`. Service-backed operations require `refs.serviceOrderId`.

## Idempotency

The compensation key is stable for the entire reversal:

```text
options.idempotencyKey
or operation.metadata.compensationIdempotencyKey
or `${operation.idempotencyKey}:compensation`
```

The same key is reused for:

```text
ItemInstance transaction compensation
Service Billing void/refund
Service cancellation
Housing staging reservation
Housing staging ItemInstance transaction
Market refund request/execution/retry
World Bridge compensation completion
```

A completed compensation replays without issuing new domain commands. A different key against an active or completed compensation returns `CYBERWARE_WORLD_COMPENSATION_IDEMPOTENCY_CONFLICT`.

## Standalone Service compensation

Canonical sequence:

```text
World Bridge operation
→ compensateItemInstanceTransaction(original itemTransactionId)
→ refundServiceOrderBilling() or voidServiceOrderBilling()
→ cancel non-terminal ServiceOrder when allowed
→ mark World Bridge operation CANCELLED + compensation COMPLETED
```

`refundServiceOrderBilling()` receives the original compensated ItemInstance transaction as proof. A completed ServiceOrder may remain `COMPLETED`; its payment status and ItemInstance transaction provide the compensation proof.

## PURCHASE_TO_HOUSING compensation

Canonical sequence:

```text
requestMarketOrderRefund()
→ executeMarketOrderRefund()
→ Market commits item return, stock return and Billing refund
→ World Bridge operation compensation COMPLETED
```

The Cyberware adapter does not reproduce Market refund logic.

## PURCHASE_AND_INSTALL compensation

Canonical sequence for a completed purchase-and-install operation:

```text
compensate original Service ItemInstance transaction
BODY → SERVICE

reserve canonical Housing placement
SERVICE → HOUSING_STORAGE through one ItemInstance transaction
commit Housing reservation

requestMarketOrderRefund()
executeMarketOrderRefund()
HOUSING_STORAGE → VENDOR
stock return
Market Billing refund

release temporary committed Housing reservation as rolled back
World Bridge operation compensation COMPLETED
```

The temporary Housing staging transaction exists only to satisfy the canonical Market return contract. It is stored in the ItemInstance Transaction Store and does not replace Market ownership of the return.

For a purchase-and-install order that has not reached captured `COMPLETED`, the adapter delegates rollback to `failMarketServiceFulfillment()` after restoring Service custody.

## Recovery states

A failed compensation persists:

```text
status: COMPENSATION_REQUIRED
or PAYMENT_RECOVERY_REQUIRED
currentStep: COMPENSATE
compensation.status: RECOVERY_REQUIRED
compensation.lastErrorCode
metadata.compensationIdempotencyKey
metadata.compensationReason
metadata.compensationErrors
metadata.compensationResult
```

Interrupted `compensation.status: IN_PROGRESS` records are resumed on startup with the same key. Records that are merely `REQUIRED` or `RECOVERY_REQUIRED` wait for explicit retry.

## Completion state

Successful reversal persists:

```text
status: CANCELLED
currentStep: COMPLETE
compensation.status: COMPLETED
compensation.completedAt
recovery.required: false
metadata.resultCode: CYBERWARE_WORLD_OPERATION_COMPENSATED
metadata.compensatedFromStatus
```

The original `refs.itemTransactionId` remains attached as the canonical transaction that was compensated.

## Event and refresh contract

Compensation emits the existing event:

```text
ws:cyberware-world-operation-updated
```

Rules:

```text
status-only compensation changes do not rebuild EquipmentState or CyberGrid
one physical compensation emits targeted physical domains
idempotent ItemInstance compensation replay emits no physical domain
Billing-only retry emits no physical domain when the return transaction already committed
one terminal compensation revision produces one controlled Cyberware workspace refresh
```

## Diagnostics

`auditCyberwareWorldBridgeCompensation()` verifies:

```text
COMPLETED compensation implies World Bridge status CANCELLED
original ItemInstance transaction is COMPENSATED when present
COMPENSATION_REQUIRED has a stable compensation idempotency key
IN_PROGRESS compensation keeps recovery.required === true
```

`getCyberwareWorldBridgeDiagnostics()` includes compensation counters and active compensation operation IDs.

## Ownership invariants

```text
ItemInstance Transaction Store owns physical commit and snapshot restoration
Services owns ServiceOrder and Service Billing reconciliation
Billing owns void and refund ledger mutations
Market owns MarketOrder, stock return and Market Billing refund
Housing owns placement reservations
World Bridge Operation Store owns durable compensation state
Cyberware World Bridge owns orchestration only
```
