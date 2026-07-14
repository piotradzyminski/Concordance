# Admin Record Lifecycle Contract 1.0x

## Scope

Canonical administrative lifecycle boundary for records that support archival, restoration, physical disposal or permanent deletion.

Supported adapters:

```text
ITEM_INSTANCE
ENCYCLOPEDIA_ENTRY
SYSTEM_RECORD
ADDRESS
CASE_FILE
CITIZEN_FILE
```

Citizen archive/restore remains owned by `CitizenCommandAPI`. Citizen hard delete is not enabled by this contract.

## State model

```text
ACTIVE
ARCHIVED
DISPOSED
DELETED
```

Definitions:

```text
ARCHIVE
  reversible registry state;
  record identity and domain state are retained;
  ItemInstance location and physical lifecycle are not changed.

RESTORE
  returns an archived record to the active registry.

DISPOSE
  ItemInstance-only physical terminal operation;
  lifecycleState = DISPOSED;
  location.type = DESTROYED.

HARD_DELETE
  permanent store removal;
  allowed only from ARCHIVED or DISPOSED;
  requires dependency preview, operator note and typed exact record ID.
```

## Public API

```text
previewAdminRecordLifecycle(input)
executeAdminRecordLifecycle(input)
requestAdminRecordLifecycleAction(options)
getAdminRecordLifecycleState(recordType, record)
getAdminRecordLifecycleRevision(record)
summarizeAdminRecordLifecyclePreview(preview)
```

Dependency API:

```text
previewAdminRecordDependencies(recordType, recordId, options)
canArchiveRecord(recordType, recordId)
canHardDeleteRecord(recordType, recordId)
```

## Command input

```js
{
  recordType,
  recordId,
  action,
  actor,
  operatorNote,
  typedConfirmation,
  expectedRevision,
  idempotencyKey,
  correlationId
}
```

Requirements:

```text
actor.actorRole = ADMIN
operatorNote is required for every mutation
idempotencyKey is required
expectedRevision guards recordLifecycle.revision
typedConfirmation === recordId for DISPOSE and HARD_DELETE
```

## Dependency semantics

```text
BLOCKER
  active record or operation reference;
  blocks Archive for ItemInstance custody cases, Dispose and Hard Delete.

WARNING
  archived or historical reference;
  does not block Archive;
  blocks Hard Delete.

INFORMATION
  non-blocking diagnostic relation.
```

Generic record dependency scanning is limited to structured ID/reference fields. Body text, summaries and free-form notes are not searched to avoid false blockers.

## ItemInstance rules

ItemInstance gains a record-level state separate from physical lifecycle:

```js
{
  recordState: "ACTIVE" | "ARCHIVED",
  archivedAt,
  archivedBy,
  archiveReason,
  disposedAt,
  disposedBy,
  disposeReason,
  recordLifecycle: {
    revision,
    updatedAt,
    history: []
  }
}
```

Archive preserves:

```text
instanceId
definitionId
ownerId
location
lifecycleState
durability
service history
```

Dispose changes only the physical terminal state required by the ItemInstance contract.

Normal ItemInstance list projections exclude `recordState = ARCHIVED`. Admin Equipment requests `includeArchived: true` so records remain restorable.

## Idempotency

Lifecycle command receipts are stored in:

```text
ws_admin_record_lifecycle_receipts_v1
```

A replay with the same key and command signature returns the original result. Reusing a key for another record/action returns:

```text
RECORD_LIFECYCLE_IDEMPOTENCY_CONFLICT
```

## Audit

Every attempted lifecycle mutation writes one canonical Admin Audit result with:

```text
sourceCommand
recordType
recordId
stateBefore
stateAfter
revisionBefore
revisionAfter
operatorNote
dependency counts
correlationId
idempotencyKey
resultCode
```

## UI contract

Equipment:

```text
Archive Item
Restore Item
Dispose Item
Hard Delete
```

Knowledge, System, Address, Case Files and Citizen Files:

```text
Preview Dependencies
Archive
Restore
Hard Delete (archived records only)
```

Existing domain-specific editors remain owners of create/update forms. This contract owns only lifecycle transitions.
