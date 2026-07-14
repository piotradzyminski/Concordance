# Cyberware World Bridge 14.0x — Runtime Contract

## Current baseline

```text
Cyberware World Bridge 14.0x installed
Stability 14.1x installed cumulatively
Compensation 14.2x installed
Market-Service Fulfillment 4.4x installed
World Bridge Operation Recovery 1.0x installed
Firmware Registry 1.0x installed
World Time Service Completion Scheduler 1.2x installed
Campaign Data I/O v6 installed
Project Test Harness 1.0x installed
```

## Ownership

```text
Cyberware orchestration adapter: js/cyberware-world-bridge.js
Durable operation/recovery state: js/world-bridge-operation-store.js
Market order, stock and PURCHASE_WITH_SERVICE: js/market-store.js
Service offer/order and Service Billing references: js/service-bridge-store.js
Firmware products/releases: data/firmware-registry.js + js/firmware-registry.js
Physical mutation: js/item-instance-transaction-store.js
Physical records: js/item-instance-store.js
Scheduled Service start and registered completion coordination: js/world-time-service-scheduler.js
```

`js/cyberware-world-bridge.js` stores no independent Market, Service, Billing, Housing, Subscription, firmware, ItemInstance or operation records.

## Public API

```text
quoteCyberwarePurchase(input)
startCyberwarePurchase(input)
quoteCyberwareService(input)
startCyberwareService(input)
getCyberwareWorldOperation(operationId)
cancelCyberwareWorldOperation(operationId, options)
retryCyberwareWorldOperation(operationId, options)
validateCyberwareWorldBridgeReadiness()
getCyberwareWorldBridgeDiagnostics()
resumePendingCyberwareOperations()
```

## Operation types

```text
PURCHASE_TO_HOUSING
PURCHASE_AND_INSTALL
INSTALL
DEINSTALL
REPLACE
MAINTENANCE
DIAGNOSTIC
REPAIR
CALIBRATION
CLEAN
FIRMWARE_UPDATE
LICENSE_REVIEW
```

The durable generic operation type is prefixed with `CYBERWARE_`. The projected Cyberware API exposes the unprefixed operation token.

## Player and direct execution modes

Default player commands use:

```text
PLAYER_WORLD_OPERATION
```

Low-level direct mutation remains available only with:

```text
ADMIN_DIRECT_OPERATION
DEVELOPER_DIRECT_OPERATION
```

Planner, Maintenance and firmware actions must not silently fall back to a direct ItemInstance mutation when World Bridge readiness fails.

## Readiness gate

Mutating player operations require the installed public APIs for:

```text
World Bridge Operation Store
Service Bridge
Market Store for purchase operations
Market-Service Fulfillment for PURCHASE_AND_INSTALL
ItemInstance Transaction Store
Firmware Registry
```

Failure result:

```js
{
  ok: false,
  status: "BLOCKED",
  reason: "WORLD_BRIDGE_DEPENDENCY_MISSING",
  missingDependencies: [],
  blockers: []
}
```

## Service operation flow

```text
Cyberware plan or Maintenance request
→ provider capability resolution
→ quoteService()
→ createWorldBridgeOperation()
→ create ServiceOffer and ServiceOrder
→ authorize ServiceOrder and BillingIntent
→ start immediately or schedule
→ commitItemInstanceTransaction(sourceDomain = SERVICE)
→ captureServiceOrderBilling() against the committed transaction
→ completeServiceOrder()
→ complete World Bridge operation
→ one ws:cyberware-world-operation-updated terminal event
```

### Physical invariants

```text
INSTALL
same instanceId: SERVICE / HOUSING_STORAGE / CONTAINER_GRID / UNPLACED → BODY

DEINSTALL
same instanceId: BODY → explicit return destination

REPLACE
outgoing and incoming instance committed in one ItemInstance transaction

MAINTENANCE / REPAIR / CALIBRATION / CLEAN / DIAGNOSTIC / FIRMWARE_UPDATE
one PATCH transaction on the same instanceId
```

No runtime write to `citizen.cyberwareList` is allowed.

## Purchase flows

### PURCHASE_TO_HOUSING

```text
Market quote
→ Market checkout DELIVER_TO_HOUSING
→ canonical ItemInstance creation and Housing placement by Market/Housing
→ complete World Bridge operation
```

### PURCHASE_AND_INSTALL

```text
Market quote PURCHASE_WITH_SERVICE
→ MarketOrder + reciprocal ServiceOrder linkage
→ one ItemInstance created directly in SERVICE custody
→ linked ServiceOrder execution
→ one SERVICE ItemInstance transaction to BODY
→ Service Billing completion
→ finalizeMarketServiceFulfillment()
→ Market Billing capture and stock commit
→ complete World Bridge operation
```

The purchased instance must not pass through Housing or CyberGrid before installation.

## Scheduled execution

The World Time Scheduler owns time-driven Service lifecycle coordination:

```text
SCHEDULED ServiceOrder → IN_PROGRESS
IN_PROGRESS due → registered completion handler request when applicable
```

It does not perform Cyberware physical commits or Billing settlement. Cyberware operations resume through the Service start event and remain owned by this adapter.

The Cyberware adapter listens for `ws:service-order-started`, resolves the linked World Bridge operation by `serviceOrderId`, and resumes the physical/capture/completion boundary.

The operation persists a bounded `metadata.recoveryInput` containing stable IDs and the validated Planner plan required to continue after reload without rebuilding the full Equipment workspace.

On adapter startup, `resumePendingCyberwareOperations()` inspects Cyberware operations in:

```text
SCHEDULED
RECOVERY_REQUIRED
PAYMENT_RECOVERY_REQUIRED
COMPENSATION_REQUIRED
```

Only linked Service orders already in `IN_PROGRESS` or `COMPLETED` are resumed automatically.

## Retry and recovery

The adapter registers one recovery handler per `CYBERWARE_<OPERATION>` token in the shared Operation Store.

Retry behavior:

```text
use persisted operation.idempotencyKey
reuse linked MarketOrder / ServiceOrder / ItemInstance transaction
replay idempotent domain commands
resume capture/finalization from persisted references
never create a second ItemInstance
```

A physical commit followed by payment failure must persist:

```text
status: PAYMENT_RECOVERY_REQUIRED
refs.itemTransactionId
refs.serviceOrderId
refs.marketOrderId when applicable
refs.billingIntentId / refs.billingTransactionId when available
refs.instanceIds
```

## Cancellation boundary

Cancellation is supported only before the canonical physical commit.

```text
pre-commit Service operation
→ void Service Billing intent when required
→ cancel ServiceOrder
→ cancel World Bridge operation
```

```text
pre-commit Market operation
→ delegate cancellation to Market
→ Market owns linked Service, stock, custody, Housing and Billing compensation
→ cancel World Bridge operation only after Market confirms success
```

After `refs.itemTransactionId` is recorded, or while the operation is in `COMMITTING` / `CAPTURING`, cancellation returns:

```text
CYBERWARE_WORLD_OPERATION_NOT_CANCELLABLE_AFTER_PHYSICAL_COMMIT
```

The adapter does not mark such an operation `CANCELLED`. A reversal after physical commit requires the canonical compensation/recovery flow.

Failed domain cancellation transitions the shared operation to `RECOVERY_REQUIRED`, `PAYMENT_RECOVERY_REQUIRED` or `COMPENSATION_REQUIRED`; it never reports a false successful cancellation.

## Event and rendering contract

Cyberware terminal event:

```text
ws:cyberware-world-operation-updated
```

Payload includes:

```text
operationId
operationType
status
currentStep
citizenId
providerId
instanceIds
marketOrderId
serviceOrderId
billingTransactionId
changedDomains
resultCode
revision
```

Rules:

```text
intermediate Market / Service / Billing changes do not rebuild EquipmentState
one physical transaction emits the canonical targeted ItemInstance event
one meaningful terminal status transition emits one Cyberware terminal event
retry metadata updates with unchanged terminal-like status do not emit duplicate Cyberware events
one terminal Cyberware event triggers one controlled Cyberware workspace refresh
CyberGrid same-grid fast path remains outside World Bridge
```

## Firmware

The adapter consumes the existing Firmware Registry API:

```text
validateFirmwareRegistry()
resolveFirmwareEligibility()
getLatestCompatibleFirmware()
```

It does not define or persist a second firmware catalog. A successful firmware Service writes canonical product/release references to the same ItemInstance through one ItemInstance transaction.

## Acceptance conditions

```text
validateCyberwareWorldBridgeReadiness().ready === true
one stable instanceId across install/deinstall/maintenance
one atomic transaction for replace
one MarketOrder + one linked ServiceOrder + one ItemInstance for purchase-and-install
scheduled Service resumes after scheduler start
payment recovery retry reuses the committed ItemInstance transaction
one final Cyberware event and one controlled refresh per terminal revision
zero full EquipmentState builds during quote/status-only phases
```


## Terminal notification projection

`js/world-bridge-notification-producer.js` consumes:

```text
ws:world-bridge-operation-updated
ws:cyberware-world-operation-updated
```

It projects one stable Terminal notification per `operationId`, updates it by revision and preserves Market, Service, Billing, ItemTransaction and ItemInstance references. The notification producer does not own orchestration and must not rebuild EquipmentState or CyberGrid.


## 28. Stability baseline 14.1x

The active runtime includes the 14.1x stability baseline:

```text
early explicit-idempotency replay
one bounded stale-revision retry
startup resume signatures
status-only refresh suppression
Citizen-scoped physical refresh coalescing
normal retry guard for COMPENSATION_REQUIRED
```

Canonical detail: `docs/contracts/world_bridge/cyberware_world_bridge_stability_contract.md`.

## 29. Compensation 14.2x

Public compensation API:

```text
quoteCyberwareWorldCompensation()
compensateCyberwareWorldOperation()
retryCyberwareWorldCompensation()
resumePendingCyberwareCompensations()
auditCyberwareWorldBridgeCompensation()
```

The adapter coordinates existing domain commands. It does not own a second compensation store.

```text
ItemInstance Transaction Store → physical reversal
Services → ServiceOrder and Service Billing settlement
Billing → ledger void/refund
Market → order return, stock return and Market Billing refund
Housing → staging placement reservations
World Bridge Operation Store → durable compensation state
Cyberware World Bridge → orchestration only
```

Successful compensation persists the World Bridge operation as `CANCELLED` with `compensation.status = COMPLETED`. Failed compensation persists `COMPENSATION_REQUIRED` or `PAYMENT_RECOVERY_REQUIRED` and retains one stable compensation idempotency key for retry/reload recovery.

Canonical detail: `docs/contracts/world_bridge/cyberware_world_bridge_compensation_contract.md`.
