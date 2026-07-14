# World Bridge Operation Recovery Contract 1.0x

## Scope

```text
PRIMARY SCOPE:
shared World Bridge operation/recovery state

CROSS-SCOPE DEPENDENCY:
Campaign Data I/O imports and exports operation records

UNCHANGED DOMAIN OWNERS:
Market owns MarketOrder and stock
Services owns ServiceOffer and ServiceOrder
Billing owns BillingIntent, BillingTransaction and balance
Housing owns placement reservations
ItemInstance Transaction owns physical commit and compensation
```

This contract defines the durable coordination record consumed by future cross-domain orchestrators. It does not implement Cyberware World Bridge commands, Market `PURCHASE_WITH_SERVICE`, Service execution, Billing capture policy or physical ItemInstance mutation.

## Runtime module

```text
js/world-bridge-operation-store.js
storage key: ws_world_bridge_operations_v1
schema: 1
```

The store is eager and loads after the existing Billing, Housing, Market and Services stores. It can therefore observe linked records during startup reconciliation without owning or modifying them.

## Canonical operation record

```js
{
  operationId,
  idempotencyKey,
  requestSignature,
  operationType,
  citizenId,
  providerId,
  status,
  currentStep,

  refs: {
    marketOrderId,
    serviceOrderId,
    billingIntentId,
    billingTransactionId,
    itemTransactionId,
    instanceIds: [],
    housingReservationIds: [],
    marketStockReservationIds: []
  },

  claims: [
    { resourceType, resourceId }
  ],

  domainStates: {},
  retry: {},
  recovery: {},
  compensation: {},
  checkpoints: [],
  errors: [],
  metadata: {},
  createdAt,
  updatedAt,
  completedAt,
  revision
}
```

The record stores stable references and small recovery metadata. It must not copy complete Market offers, Service orders, Billing records, ItemInstance snapshots, EquipmentState or Cyberware Runtime.

## Statuses

```text
DRAFT
VALIDATING
RESERVING
AUTHORIZED
SCHEDULED
IN_PROGRESS
COMMITTING
CAPTURING
COMPLETED
FAILED
CANCELLED
RECOVERY_REQUIRED
PAYMENT_RECOVERY_REQUIRED
COMPENSATION_REQUIRED
```

## Steps

```text
DRAFT
VALIDATE
RESERVE
AUTHORIZE
SCHEDULE
EXECUTE
COMMIT
CAPTURE
COMPENSATE
COMPLETE
```

The operation store validates lifecycle transitions but does not execute domain commands. Future orchestrators remain responsible for changing Market, Service, Billing, Housing and ItemInstance state before recording the corresponding checkpoint.

## Public API

```text
createWorldBridgeOperation
getWorldBridgeOperation
getWorldBridgeOperationByIdempotencyKey
getWorldBridgeOperationStoreRevision
getWorldBridgeOperationClaimOwner
getWorldBridgeOperations
getWorldBridgeOperationsByReference
updateWorldBridgeOperation
transitionWorldBridgeOperation
attachWorldBridgeOperationReferences
claimWorldBridgeOperationResources
releaseWorldBridgeOperationClaims
reconcileWorldBridgeOperation
reconcileInterruptedWorldBridgeOperations
registerWorldBridgeOperationRecoveryHandler
unregisterWorldBridgeOperationRecoveryHandler
retryWorldBridgeOperation
exportWorldBridgeOperations
exportWorldBridgeOperationRuntimeData
importWorldBridgeOperations
resetWorldBridgeOperationStore
flushWorldBridgeOperationPersistence
validateWorldBridgeOperationReadiness
getWorldBridgeOperationDiagnostics
resetWorldBridgeOperationDiagnostics
```

## Idempotency

`createWorldBridgeOperation()` requires an `idempotencyKey` and derives a deterministic request signature from operation type, citizen, provider, initial references, claims and caller request metadata.

```text
same key + same signature
→ existing operation replay

same key + different signature
→ WORLD_BRIDGE_OPERATION_IDEMPOTENCY_CONFLICT
```

A replay does not create another operation, revision, claim or event.

## Revision boundary

Every mutation increments the operation revision. Commands may pass `expectedRevision`.

```text
expectedRevision != current revision
→ WORLD_BRIDGE_OPERATION_STALE_REVISION
```

This is an optimistic coordination lock. Domain revisions remain owned and validated by their respective stores.

## Resource claims

Claims protect named resources across a long-running operation:

```text
INSTANCE:item_...
MARKET_OFFER:market_offer_...
HOUSING_STORAGE:housing_storage_...
SERVICE_ORDER:service_order_...
```

Only one non-terminal operation can own a claim key. Claims are released explicitly or automatically when an operation reaches `COMPLETED`, `FAILED` or `CANCELLED`.

A claim does not replace:

- ItemInstance transaction snapshot/revision validation;
- Market stock reservation;
- Housing placement reservation;
- Service order revision validation;
- Billing intent state validation.

## Reconciliation

Startup reconciliation observes linked records through existing read APIs:

```text
getMarketOrder
getServiceOrder
getBillingIntent
getBillingTransaction
getItemInstanceTransaction
getHousingPlacementReservation
```

It writes only `domainStates` and recovery metadata to the operation record.

It does not:

- create, update or cancel Market orders;
- start, complete or fail Service orders;
- capture, void or refund Billing;
- commit or compensate ItemInstance transactions;
- reserve, commit or release Housing placement;
- invalidate Equipment or CyberGrid.

Detected conditions include:

```text
missing linked domain record
interrupted ItemInstance transaction
ItemInstance COMMITTED at CAPTURE step with authorized BillingIntent and no captured transaction
```

The latter becomes `PAYMENT_RECOVERY_REQUIRED`.

## Retry handlers

The store exposes a handler registry. A domain orchestrator registers one handler for its `operationType`.

```js
registerWorldBridgeOperationRecoveryHandler(operationType, handler)
```

`retryWorldBridgeOperation()` records the attempt and invokes the handler. The store does not contain hidden fallback orchestration. Missing handlers return:

```text
WORLD_BRIDGE_OPERATION_RECOVERY_HANDLER_REQUIRED
```

## Persistence

Normal updates use deferred persistence:

```text
in-memory mutation
→ dirty flag
→ delayed flush
```

Creation, terminal transitions and caller-marked critical updates may request immediate flush. A failed flush restores the last durable operation snapshot and emits:

```text
ws:world-bridge-operation-persistence-recovered
```

The store flushes on `pagehide` and hidden `visibilitychange`.

## Events

Every committed operation revision emits at most one:

```text
ws:world-bridge-operation-updated
```

Payload includes stable references, status, step, changed fields, recovery flag, operation revision and store revision.

```text
changedDomains: ["WORLD_BRIDGE_OPERATION"]
```

The event does not include `EQUIPMENT`, `CYBERWARE` or `ITEM_INSTANCE`, and must not trigger a physical refresh by itself.

## Campaign Data I/O

Campaign schema v4 includes:

```text
data.worldBridgeOperations
```

Import validates:

- `operationId`;
- `citizenId`;
- `idempotencyKey`;
- duplicate idempotency ownership;
- active claim conflicts.

After import, non-terminal operations are reconciled against currently available linked domain records.

This patch exports operation records only. Full campaign portability of Service Bridge, Market runtime, Housing reservations and ItemInstance transaction receipts remains a separate integration requirement.

## Readiness criteria

```text
[ ] one operation per idempotency signature
[ ] monotonic operation revisions
[ ] stale writes rejected
[ ] active claim conflicts rejected
[ ] terminal claims released
[ ] startup reconciliation is read-only toward linked domains
[ ] retry requires a registered orchestrator handler
[ ] failed persistence restores the durable snapshot
[ ] one targeted event per committed revision
[ ] campaign export/import/reset supports operation records
[ ] no EquipmentState, CyberGrid or Cyberware Runtime dependency
```
