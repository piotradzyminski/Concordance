# Admin Audit Store Contract — 3.0x

## Ownership

`js/admin-audit-store.js` is the canonical owner of persistent Admin audit events.

It replaces the legacy helper array:

```text
futureNoir.adminAuditLog.v1
```

Canonical keys:

```text
ws_admin_audit_store_v2
ws_admin_audit_recovery_v1
```

The legacy key remains migration-only and is removed after a confirmed migration.

## Event model

Each event contains:

```text
auditEventId
sequence
actor.actorId
actor.actorRole
actor.displayName
workspace
sourceCommand
category
citizenId
targetRefs[]
request.idempotencyKey
request.correlationId
request.payloadHash
result.status
result.resultCode
result.message
domainRefs
previousRevision
nextRevision
summary
metadata
createdAt
```

Allowed result statuses:

```text
SUCCEEDED
FAILED
RECOVERY_REQUIRED
```

`sequence` is monotonic inside the campaign store. UI ordering uses descending sequence. Events are not silently truncated.

## Public API

```text
appendAdminAuditResult(input, options?)
appendAdminAuditEvent(event, options?)
getAdminAuditEvents(options?)
getAdminAuditEvent(auditEventId)
getAdminAuditRecoveryQueue()
retryAdminAuditRecovery()
exportAdminAuditState()
validateAdminAuditState(state)
importAdminAuditState(state)
resetAdminAuditState()
```

Only an actor with `actorRole: ADMIN` may append an event.

Repeated writes with the same `sourceCommand + request.idempotencyKey` return `IDEMPOTENT_REPLAY` and do not create another event.

## Persistence and recovery

A failed canonical store write returns:

```text
AUDIT_RECOVERY_REQUIRED
```

The event is queued in `ws_admin_audit_recovery_v1` when that secondary write succeeds. The runtime emits:

```text
ws:admin-audit-recovery-required
```

Recovery is retried at store initialization, before new appends and through the Admin Audit workspace action.

An audit failure does not mutate or roll back the owning business domain. It records that the already-attempted audit persistence requires recovery.

## Legacy migration

When the canonical key is absent and `futureNoir.adminAuditLog.v1` contains an array:

```text
legacy newest-first array
→ reverse to chronological order
→ assign monotonic sequence
→ normalize actor/result/targets
→ write canonical store
→ remove legacy key
```

No parallel legacy write path remains after successful migration.

## Campaign Data I/O v6

The required `admin-audit` adapter exports/imports/resets:

```text
ws_admin_audit_store_v2
ws_admin_audit_recovery_v1
futureNoir.adminAuditLog.v1  # migration-only compatibility key
```

The adapter validates canonical state through `validateAdminAuditState()` and reports event/recovery counts.

Successful Campaign import and reset append one new Admin audit event after the imported/reset state has committed. Campaign reset requires an operator note and exact typed confirmation:

```text
RESET CAMPAIGN
```

## UI

Admin Audit workspace supports:

```text
ALL
SUCCEEDED
FAILED
RECOVERY_REQUIRED
BILLING
CITIZEN
EQUIPMENT
ACCESS
DATA_IO
```

Event detail shows actor, command, result code, target references, domain references, revisions, correlation ID, idempotency key and timestamp.

The Audit workspace does not log ordinary navigation/tab changes.

## Covered producers in 3.0x

```text
Admin Control Center command actions
Admin Economy Tools
Citizen Runtime Cleanup
Equipment create/update/archive/hard delete
Citizen Editor admin update
Citizen Cards draft/create, owner-edit grant and Archive/Restore
Access Control user/tag mutations
Tag Registry create/update/duplicate/archive/restore/delete
Campaign Data I/O export/import/reset
```

Existing Admin Control call sites use the compatibility `appendAdminAuditEvent()` boundary, which normalizes their result into the canonical event model.

## Non-ownership

Admin Audit Store does not own:

```text
Billing mutation
Citizen mutation
Access mutation
Tag mutation
ItemInstance mutation
Service/Market/Subscription mutation
Campaign import/reset transaction
```

It records results and references only.
