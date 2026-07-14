# Admin Operations Workspace Contract

## Scope

`OPERATIONS` is the administrative projection and command surface for the canonical World Bridge Operation Store.

It does not own World Bridge operation state and must not write operation records directly.

## Runtime ownership

```text
World Bridge Operation Store
  owns operation records, revisions, recovery state, retry handlers and resource claims

Admin Operations Command
  validates Admin actor, operator note, expected revision and idempotency
  invokes public World Bridge APIs
  writes canonical Admin Audit results

Admin Operations Workspace
  filters and renders operations
  selects one operation for Inspector projection
  collects operator confirmation
  invokes Admin Operations Command
```

Canonical files:

```text
js/world-bridge-operation-store.js
js/admin-operations-command.js
js/admin/workspaces/admin-workspace-operations.js
```

## Workspace registration

The workspace ID is:

```text
operations
```

It is registered by `AdminWorkspaceRegistry` and loaded through the lazy bundle:

```text
admin-workspace-operations
```

The base Admin bundle must not load Equipment, Cyberware, Market UI or Service UI in order to display the operation queue.

## Read model

The list is obtained only through:

```text
getWorldBridgeOperations()
getWorldBridgeOperation()
```

The workspace may filter by:

```text
status
operationType
recoveryOnly
free-text operation/reference search
```

The Inspector presents:

```text
operationId
operationType
citizenId
providerId
status
currentStep
revision
retry count / limit
recovery reason codes
compensation status
resource claims
domain references
recent checkpoints
recent errors
```

## Administrative commands

Supported actions:

```text
RETRY
RECONCILE
CLAIM
RELEASE_CLAIM
```

Canonical calls:

```text
retryWorldBridgeOperation()
reconcileWorldBridgeOperation()
claimWorldBridgeOperationResources()
releaseWorldBridgeOperationClaims()
```

The workspace and renderer must never call:

```text
updateWorldBridgeOperation()
transitionWorldBridgeOperation()
```

## Command envelope

Each mutation requires:

```text
actor.actorId
actor.actorRole = ADMIN
operationId
action
operatorNote
expectedRevision
idempotencyKey
```

Claims additionally require:

```text
resourceType
resourceId
```

Release without explicit claims uses the operation's current claim set.

## Revision and idempotency

The Admin command compares `expectedRevision` with the current operation revision before invoking the domain API.

A mismatch returns:

```text
WORLD_BRIDGE_OPERATION_STALE_REVISION
```

The canonical Admin Audit Store is the persistent idempotency receipt for Admin operation commands. The same command and idempotency key returns the existing result without a second domain call. Reusing the key for another action or operation returns:

```text
ADMIN_WORLD_BRIDGE_IDEMPOTENCY_CONFLICT
```

## Audit

Every attempted command writes one event with:

```text
workspace = OPERATIONS
category = WORLD_BRIDGE
source command
target World Bridge operation
operator note
operation type
status/step before and after
revision before and after
World Bridge domain references
idempotency key
correlation ID
result status and result code
```

Possible result statuses:

```text
SUCCEEDED
FAILED
RECOVERY_REQUIRED
```

A successful domain mutation with failed Audit persistence returns:

```text
ADMIN_AUDIT_RECOVERY_REQUIRED
```

The domain mutation is not repeated. Audit Store recovery owns persistence repair.

## Resource claims

Claims are World Bridge resource locks owned by an operation. They are not user/session locks and do not introduce another claim store.

The Admin surface may:

```text
add a validated resource claim to a non-terminal operation
release selected or all current claims
inspect conflicts through getWorldBridgeOperationClaimOwner()
```

Terminal operations cannot acquire or release claims.

## Domain readiness sections

The workspace may display read-only readiness for:

```text
Market
Firmware
Cyberware
```

A readiness card does not authorize mutation. Dedicated domain commands are exposed only after their canonical APIs exist.

## UI runtime

The persistent Admin Shell remains mounted. Workspace switching replaces only Workspace and Inspector regions.

The Operations bundle must:

```text
load once
register one renderer
avoid heavy domain UI bundles
ignore stale async workspace loads through the existing loader sequence
preserve Admin navigation ownership
```

Operator note and confirmation currently use the shared browser prompt/confirm pattern. Replacement by canonical Admin modals remains a later UI consolidation scope.

## Out of scope

```text
Market refund approval UI
Firmware release lifecycle authoring
Cyberware direct operations UI
World Bridge cancellation commands
new World Bridge status transitions
new recovery handlers
second operation or claim store
Campaign Snapshot schema changes
```
