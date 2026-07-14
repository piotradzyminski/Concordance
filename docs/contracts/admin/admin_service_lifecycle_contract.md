# Admin Service Lifecycle Contract 1.0x

## Scope

This contract defines the canonical lifecycle boundary for Citizen work-history records stored in:

```text
citizen.serviceLog[]
```

It also defines the read-only boundary between Citizen Service Log records and transactional Service Bridge Orders.

The two record types are separate domains:

```text
CITIZEN_SERVICE_LOG
= employment/work-history projection owned by the Citizen Store

SERVICE_BRIDGE_ORDER
= provider operation with scheduling, fulfillment, Billing and ItemInstance references owned by Service Bridge
```

Admin Control Center may inspect both domains, but it must not represent them as the same record type or mutate Service Bridge Orders through Citizen Service Log commands.

## Canonical Citizen Service Log statuses

```text
ACTIVE
SUSPENDED
COMPLETED
FAILED
TERMINATED
ARCHIVED
```

## Allowed transition matrix

```text
ACTIVE
  → SUSPENDED
  → COMPLETED
  → FAILED
  → TERMINATED

SUSPENDED
  → ACTIVE
  → FAILED
  → TERMINATED

COMPLETED
  → ARCHIVED

FAILED
  → ARCHIVED

TERMINATED
  → ARCHIVED

ARCHIVED
  → no further transition
```

A no-op request to the current status is replay-safe and does not perform a second business mutation.

Examples of invalid transitions:

```text
COMPLETED → ACTIVE
FAILED → COMPLETED
ARCHIVED → SUSPENDED
ACTIVE → ARCHIVED
```

Invalid transitions return a structured failure and do not modify the Citizen record.

## Citizen Service Log record additions

Each normalized Service Log record exposes:

```js
{
  revision: 1,
  lifecycleHistory: [],
  suspendedAt: null,
  failedAt: null,
  terminatedAt: null
}
```

`revision` is monotonic. `lifecycleHistory` is append-only and stores transition metadata required for idempotent replay and audit inspection.

A lifecycle history entry contains at least:

```js
{
  transitionId,
  fromStatus,
  toStatus,
  resultCode,
  actor,
  operatorNote,
  correlationId,
  idempotencyKey,
  revisionBefore,
  revisionAfter,
  timestamp
}
```

## Public Citizen Service Log API

```text
getCitizenServiceRecord(citizenOrId, recordId)
getCitizenServiceAllowedTransitions(citizenOrId, recordId)
previewCitizenServiceTransition(citizenId, recordId, status, options)
transitionCitizenServiceRecord(citizenId, recordId, status, options)
```

Compatibility APIs:

```text
setCitizenServiceStatus(...)
setCitizenServiceStatuses(...)
```

Compatibility methods must route through `transitionCitizenServiceRecord()` and may not bypass lifecycle validation.

## Command requirements

A mutating transition accepts:

```js
{
  actor,
  operatorNote,
  expectedRevision,
  idempotencyKey,
  correlationId
}
```

Admin callers must provide an Admin actor, operator note, expected revision and idempotency key.

Expected result shape:

```js
{
  ok,
  status,
  resultCode,
  citizenId,
  recordId,
  fromStatus,
  toStatus,
  revisionBefore,
  revisionAfter,
  correlationId,
  idempotencyKey,
  replayed
}
```

Required failure classes include:

```text
CITIZEN_SERVICE_RECORD_NOT_FOUND
CITIZEN_SERVICE_TRANSITION_NOT_ALLOWED
CITIZEN_SERVICE_REVISION_CONFLICT
CITIZEN_SERVICE_OPERATOR_NOTE_REQUIRED
CITIZEN_SERVICE_IDEMPOTENCY_CONFLICT
CITIZEN_SERVICE_PERSISTENCE_FAILED
```

Exact result-code spelling remains owned by the implementation, but every failure must be structured and inspectable.

## Revision and idempotency

`expectedRevision` is checked immediately before mutation.

A stale revision must fail without changing:

```text
status
revision
lifecycleHistory
experience
reputation
payout state
```

A repeated `idempotencyKey` with the same transition signature returns the original result. A repeated key with a different signature returns an idempotency conflict.

## Business effects

Experience, reputation, payout projection and completion timestamps are applied exactly once by the canonical transition command.

Archiving a previously completed, failed or terminated record preserves its business outcome. `ARCHIVED` changes record visibility/lifecycle only and must not:

```text
pay again
remove prior payout state
grant experience again
change the original completion/failure/termination result
```

## Service Bridge boundary

Service Bridge keeps its existing order lifecycle and ownership.

Read-only descriptor APIs:

```text
getServiceOrderAllowedTransitions(serviceOrderOrStatus)
getServiceOrderLifecycleDescriptor(serviceOrderOrStatus)
```

The descriptor exposes:

```js
{
  recordDomain: "SERVICE_BRIDGE_ORDER",
  status,
  terminal,
  revision,
  allowedTransitions
}
```

These APIs do not mutate Service Orders and do not create a second lifecycle registry.

## Admin UI contract

Admin Service workspace must render separate surfaces:

```text
Citizen Service Log / Work Records
Service Bridge Orders / Transactional Provider Operations
```

Citizen Service Log actions display only transitions returned by:

```text
getCitizenServiceAllowedTransitions()
```

The UI must not render a raw select containing every known status.

For each selected Service Log record, Admin shows:

```text
record domain
current lifecycle state
allowed next transitions
revision
lifecycle history
```

For Service Bridge Orders, Admin shows a read-only summary and allowed-next projection. Service Bridge mutations remain under Service Bridge command APIs.

## Audit

Every Admin transition attempt writes one canonical Admin Audit result with:

```text
workspace = SERVICE
recordDomain = CITIZEN_SERVICE_LOG
citizenId
recordId
fromStatus
toStatus
resultCode
revisionBefore
revisionAfter
correlationId
idempotencyKey
operatorNote
```

Invalid transitions and stale revisions are audited as failures.

## Persistence and migration

Legacy Service Log records without `revision` or `lifecycleHistory` are normalized in place:

```text
revision = 1
lifecycleHistory = []
```

No duplicate Service Log store is introduced.

Because the project is pre-alpha, incompatible test/runtime records may be normalized or cleared when they cannot be mapped safely.

## Not in scope

```text
Service Definition authoring
Offer Template authoring
provider capability editing
full manual offer editor
Service Bridge lifecycle changes
World Bridge Operations workspace
shared Archive / Restore / Delete contract across all domains
Citizen hard delete
Admin Item Ownership Transfer
```
