# Admin Dependency Guard Contract

## Ownership

`js/admin-dependency-resolver.js` is a read-only cross-domain dependency projection for destructive Admin actions.

It does not:

- mutate Citizen, ItemInstance, Billing, Service, Market, Housing, Subscription or World Bridge records;
- cancel, compensate or force-complete active operations;
- read private store collections when a public read API exists;
- replace domain lifecycle commands.

## Public API

```text
previewCitizenAdminDependencies(citizenId, options)
previewItemInstanceAdminDependencies(instanceId, options)
previewCitizenCleanup(citizenId, sections, options)
canArchiveItemInstance(instanceId)
canHardDeleteItemInstance(instanceId)
canHardDeleteCitizen(citizenId)
```

Every preview returns:

```text
ok
subjectType
subjectId
blocked
blockers[]
warnings[]
information[]
dependencies[]
counts
storeRevisions
generatedAt
```

## Severity

```text
BLOCKER
  active operation, claim, reservation, custody, recovery state or physical child relation;
  destructive action must not execute.

WARNING
  terminal or historical reference;
  archive may proceed, hard delete remains blocked.

INFORMATION
  non-blocking state such as an already archived ItemInstance.
```

## Cleanup rule

Citizen Runtime Cleanup must call `previewCitizenCleanup()` immediately before mutation. A previously rendered preview is informational only. Execution always uses a fresh preview built from current domain state.

Cleanup ignores ownership of records selected for cleanup as a blocker, but preserves blockers produced by active external operations and references. Parent-child ItemInstance relations do not block cleanup when both records are inside the same selected cleanup scope.

## ItemInstance rule

`Archive Item` is the default destructive action. It sets:

```text
lifecycleState = DISPOSED
location.type = DESTROYED
```

The same `instanceId` remains available for history and diagnostics.

`Hard Delete` requires:

- operator note;
- exact typed `instanceId` confirmation;
- zero blockers;
- zero historical warnings.

ItemInstance in `BODY` must be deinstalled through Services before archive or hard delete. ItemInstance in `SERVICE` custody, used by a non-terminal World Bridge/Service/Market operation, referenced by an active Housing reservation, active Subscription target, active ItemInstance transaction, or containing dependent child records is blocked.

## Citizen hard delete

Citizen hard delete remains disabled by the Citizen Record Foundation. `canHardDeleteCitizen()` is read-only readiness for a possible future command. Archive/Restore remains the canonical Citizen lifecycle operation.
