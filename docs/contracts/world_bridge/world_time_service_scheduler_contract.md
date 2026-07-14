# World Time Service Completion Scheduler Contract 1.1x

## Canonical owner

```text
js/world-time-service-scheduler.js
```

The scheduler connects day-precision Campaign Time to the canonical `ServiceOrder` lifecycle.

Owned automatic transitions and requests:

```text
SCHEDULED due
→ startServiceOrder()
→ IN_PROGRESS

IN_PROGRESS estimatedEndAt due
→ registered completion handler request
→ canonical domain execution
→ optional completeServiceOrder() through public API
→ terminal ServiceOrder or explicit pending/blocked receipt
```

The scheduler is not a Service store, Billing owner, ItemInstance owner, World Bridge orchestrator or renderer.

## Time precision

Current Campaign Time is compared at UTC calendar-date precision:

```text
YYYY-MM-DD
```

Sources:

```text
WS_APP.getCampaignDateIso()
WS_APP.CAMPAIGN_DATE_ISO
ws:campaign-date-updated
```

`scheduledStartAt` and `estimatedEndAt` may contain full ISO timestamps. Scheduler due checks normalize them to the first valid UTC date.

## Indexed reads

The scheduler uses only:

```js
getServiceOrders({ statuses: ["SCHEDULED"] })
getServiceOrders({ statuses: ["IN_PROGRESS"] })
getServiceOrder(serviceOrderId)
getServiceDefinition(serviceDefinitionId)
```

`getServiceOrders()` is backed by the Service status index. The scheduler does not inspect Service localStorage or private maps.

## Start phase

Due condition:

```text
order.status === SCHEDULED
scheduledStartAt is valid
scheduledStartAt <= campaignDateIso
```

Command:

```js
startServiceOrder(serviceOrderId, {
  idempotencyKey: `world-time-service-start:${serviceOrderId}:${scheduledStartAt}`,
  expectedRevision: order.revision,
  startedAt: campaignDateIso,
  source: "WORLD_TIME_SERVICE_SCHEDULER",
  metadata: {
    schedulerSchemaVersion,
    schedulerCampaignDateIso,
    schedulerReceiptKey
  }
})
```

Services remains responsible for payment-authorization validation and lifecycle transitions.

## Completion due phase

Due condition:

```text
order.status === IN_PROGRESS
estimatedEndAt is valid
estimatedEndAt <= campaignDateIso
```

An invalid or missing `estimatedEndAt` does not complete the order. It creates:

```text
SERVICE_ESTIMATED_END_REQUIRED
```

A due order without a registered execution handler remains `IN_PROGRESS` and creates:

```text
SERVICE_COMPLETION_HANDLER_REQUIRED
```

There is no automatic success fallback.

## Completion handler registry

Public registration:

```js
registerWorldTimeServiceCompletionHandler(handlerId, handler, {
  serviceDefinitionIds: [],
  serviceTypes: [],
  domains: [],
  providerIds: [],
  priority: 0,
  defaultHandler: false
})
```

Removal:

```js
unregisterWorldTimeServiceCompletionHandler(handlerId)
```

Selection order:

```text
priority descending
→ match specificity descending
→ handlerId lexical order
```

Supported matching dimensions:

```text
serviceDefinitionId
serviceType
domain
providerId
```

The Cyberware World Bridge should register the handler for Cyberware and relevant medical Service definitions. The handler registry is runtime-only and is never persisted.

## Completion request

Handler input:

```js
{
  requestId,
  idempotencyKey,
  source: "WORLD_TIME_SERVICE_SCHEDULER",
  handlerId,
  schedulerSchemaVersion,
  schedulerCampaignDateIso,
  schedulerReceiptKey,
  expectedRevision,
  serviceOrderId,
  serviceDefinitionId,
  serviceType,
  domain,
  citizenId,
  providerId,
  subjectInstanceIds,
  estimatedEndAt,
  order,
  serviceDefinition
}
```

The scheduler emits before handler invocation:

```text
ws:world-time-service-completion-requested
```

The payload contains references and the current ServiceOrder snapshot. It does not contain EquipmentState or CyberGrid projections.

## Handler result contracts

### Handler already committed the ServiceOrder

The handler may execute the World Bridge operation and return after the canonical Service order is already terminal:

```js
{
  ok: true,
  order: completedOrder,
  reason: "CYBERWARE_WORLD_OPERATION_COMPLETED"
}
```

The scheduler re-reads the order and records the terminal result.

### Handler returns canonical Service result

The handler may return:

```js
{
  ok: true,
  serviceResult: {
    outcome: "SUCCESS",
    resultCode: "...",
    itemMutations: [],
    conditionChanges: [],
    firmwareChanges: [],
    authorizationChanges: [],
    serviceHistoryEntries: [],
    itemCommit: {}
  },
  completionOptions: {
    itemTransactionId,
    executionConfirmed,
    allowPaymentRecovery,
    metadata: {}
  }
}
```

Only after this explicit handler result may the scheduler call:

```text
completeServiceOrder()
```

Services still validates:

```text
expectedRevision
physical execution proof
ItemInstance transaction ownership
Billing capture/payment state
result outcome
transition legality
```

The scheduler never bypasses those guards.

### Pending handler result

Long-running execution may return:

```js
{
  ok: true,
  pending: true,
  status: "PENDING",
  reason: "WORLD_OPERATION_PENDING"
}
```

The Service order stays `IN_PROGRESS`. A bounded `PENDING` receipt is stored.

### Invalid success

A handler returning `ok: true` without a terminal Service order, explicit pending state or canonical Service result produces:

```text
SERVICE_COMPLETION_NOT_COMMITTED
```

## Non-ownership rules

The scheduler must not directly call or mutate:

```text
Billing authorize/capture/void/refund
ItemInstance create/move/patch/remove
ItemInstance transaction commit/compensation
Market stock or MarketOrder lifecycle
Housing reservation or placement
EquipmentState
CyberGrid
Cyberware Runtime
campaign time advancement
```

A completion handler may own these operations only through its domain's existing public APIs.

The scheduler may call `completeServiceOrder()` after a registered handler returns an explicit canonical Service result. This is a Service lifecycle commit, not physical execution ownership.

## Idempotency

Start receipt identity:

```text
START
+ serviceOrderId
+ ServiceOrder revision
+ scheduledStartAt date
+ campaignDateIso
```

Completion receipt identity:

```text
COMPLETE
+ serviceOrderId
+ ServiceOrder revision
+ estimatedEndAt date
+ campaignDateIso
```

Completion request identity:

```text
world-time-service-completion:{serviceOrderId}:{revision}:{estimatedEndAt}
```

Service completion idempotency key:

```text
world-time-service-complete:{serviceOrderId}:{estimatedEndAt}
```

Repeated processing of the same receipt identity returns:

```text
SCHEDULER_RECEIPT_REPLAY
```

Manual retry APIs deliberately force a new handler attempt while preserving downstream idempotency keys.

## Receipts and persistence

Storage remains one canonical scheduler state:

```text
ws_world_time_service_scheduler_v1
ws_world_time_service_scheduler_schema
```

Schema marker:

```text
world_time_service_completion_scheduler_1_1x
```

Store schema:

```js
{
  schemaVersion: 2,
  schedulerSchemaVersion,
  revision,
  lastProcessedCampaignDateIso,
  lastSummary,
  receipts: []
}
```

Receipt phases:

```text
START
COMPLETE
```

Receipt retention is bounded to 512 records. Legacy 1.0x receipts are migrated in memory to `phase: START`; the existing storage key is reused.

Individual writes are deferred. A scheduler batch flushes once at its boundary.

## Campaign Data I/O adapter

Scheduler-owned adapter API:

```text
exportWorldTimeServiceSchedulerState()
importWorldTimeServiceSchedulerState(payload, options)
resetWorldTimeServiceSchedulerRuntime(options)
```

Import behavior:

```text
replace scheduler receipts/state only
preserve handler registry
no Service command
no Billing command
no ItemInstance command
no business event replay
no automatic reconciliation unless requested by caller
```

The shared Campaign Data I/O patch may consume these adapters. This patch does not create a second cross-domain import pipeline.

## Automatic triggers

```text
DOMContentLoaded / startup reconciliation
ws:campaign-date-updated
ws:service-order-created
ws:service-order-updated
ws:service-order-started
completion-handler registration
```

Event-triggered processing is deferred through `setTimeout(..., 0)` to avoid nested mutation inside the originating Service command.

## Public API

```text
processDueServiceOrders(options)
processDueServiceCompletions(options)
processWorldTimeServiceLifecycle(options)
retryScheduledServiceOrder(serviceOrderId, options)
retryInProgressServiceOrderCompletion(serviceOrderId, options)
registerWorldTimeServiceCompletionHandler(handlerId, handler, options)
unregisterWorldTimeServiceCompletionHandler(handlerId)
getWorldTimeServiceCompletionHandlers()
getWorldTimeServiceSchedulerState()
exportWorldTimeServiceSchedulerState()
importWorldTimeServiceSchedulerState(payload, options)
getWorldTimeServiceSchedulerDiagnostics()
flushWorldTimeServiceSchedulerPersistence()
resetWorldTimeServiceSchedulerRuntime(options)
```

## Summary and readiness events

```text
ws:world-time-service-scheduler-ready
ws:world-time-service-scheduler-processed
ws:world-time-service-completions-processed
ws:world-time-service-lifecycle-processed
```

`ws:world-time-service-scheduler-ready` is emitted after the public registration API is installed. An orchestrator loaded earlier may use this event to register its completion handler.

Events are reference-only and do not request Equipment/CyberGrid refresh.

## Diagnostics

The diagnostic record separates:

```text
startReady
completionBoundaryReady
completionExecutionReady
```

`completionExecutionReady` requires at least one registered handler. A project can therefore have the scheduler installed while correctly reporting that no orchestrator currently owns execution.

## Result categories

Start:

```text
STARTED
BLOCKED
FAILED
SKIPPED
NOT_DUE
```

Completion:

```text
COMPLETED
TERMINAL_FAILED
TERMINAL_CANCELLED
PENDING
BLOCKED
FAILED
SKIPPED
NOT_DUE
```

Important completion reasons:

```text
SERVICE_ESTIMATED_END_REQUIRED
SERVICE_COMPLETION_HANDLER_REQUIRED
SERVICE_COMPLETION_HANDLER_RESULT_REQUIRED
SERVICE_COMPLETION_HANDLER_EXCEPTION
SERVICE_COMPLETION_NOT_COMMITTED
SERVICE_COMPLETE_API_UNAVAILABLE
SERVICE_PAYMENT_CAPTURE_REQUIRED
SERVICE_EXECUTION_CONFIRMATION_REQUIRED
SERVICE_ITEM_TRANSACTION_COMMIT_REQUIRED
```

## Performance invariants

```text
status lookup uses Service indexes
no full Service store scan outside indexed candidate IDs
no EquipmentState build
no ItemInstance full projection
no CyberGrid rebuild
no interval polling
no global item event
one lightweight request event per attempted completion
one lightweight summary event per phase batch
```
