# Cyberware World Bridge Stability 14.1x — Runtime Contract

## Baseline

```text
Parallel Scope + Cyberware World Bridge Merge 14.0x
Market Service Fulfillment Fix 4.4x
World Bridge Operation Recovery 1.0x
World Time Service Completion Scheduler 1.2x
World Bridge Notifications 2.1x
```

## Scope

This contract stabilizes the existing Cyberware orchestrator. It does not introduce a second operation store, Market flow, Service flow, Billing flow, ItemInstance mutation path, scheduler or notification model.

## Idempotent start boundary

`startCyberwareService()` and `startCyberwarePurchase()` must check an explicit `idempotencyKey` before rebuilding a quote or invoking any domain command.

A matching operation returns the stored projection immediately:

```text
COMPLETED → ok + IDEMPOTENT_REPLAY
SCHEDULED / active execution → ok + current operation state
FAILED / CANCELLED → non-success replay result
RECOVERY_REQUIRED / PAYMENT_RECOVERY_REQUIRED / COMPENSATION_REQUIRED
→ non-success replay result with recoveryRequired
```

A repeated start command must not create another Market cart, Service offer, Service order, ItemInstance transaction or physical mutation.

Recovery continues only through the explicit retry/resume boundary.

## Revision conflict boundary

Every Cyberware-owned mutation of the shared World Bridge Operation Store uses the latest operation revision.

On one `WORLD_BRIDGE_OPERATION_STALE_REVISION` response:

```text
reload current operation
retry exactly once with the current revision
record revision conflict/retry diagnostics
```

A second failure is returned and recorded. The adapter must not silently report a successful transition when the operation store rejected it.

## Reload and resume boundary

Automatic resume candidates:

```text
SCHEDULED
IN_PROGRESS
COMMITTING
CAPTURING
RECOVERY_REQUIRED
PAYMENT_RECOVERY_REQUIRED
```

A candidate is resumed only when its linked Service order is in a resumable state. A signature composed from World operation revision/status, Service order revision/status and `itemTransactionId` suppresses repeated handling of the same state.

`COMPENSATION_REQUIRED` is excluded from normal execution replay. It requires a dedicated compensation path and cannot re-run install/deinstall/replace/maintenance as a normal retry.

## Event and refresh boundary

The generic operation event carries only `WORLD_BRIDGE_OPERATION` as its domain. Cyberware must recover the actual changed domains from the persisted operation metadata.

Final Cyberware event:

```text
ws:cyberware-world-operation-updated
```

Payload adds:

```text
physicalChange: boolean
```

Refresh rules:

```text
SERVICE / BILLING / MARKET / WORLD_BRIDGE_OPERATION only
→ emit/update notification projection
→ no Cyberware workspace invalidation
→ no EquipmentState/CyberGrid rebuild

ITEM_INSTANCE / EQUIPMENT / CYBERWARE
→ one deferred Cyberware workspace refresh
→ refreshes coalesced per citizen within the same task
```

The adapter must preserve one targeted ItemInstance physical event as the canonical physical invalidation source.

## Compensation safety

`COMPENSATION_REQUIRED` cannot be processed by the standard retry handler. The retry result is:

```text
CYBERWARE_WORLD_OPERATION_COMPENSATION_REQUIRED
```

This prevents replay of a physical operation after a compensation boundary has already been reached.

## Diagnostics

`getCyberwareWorldBridgeDiagnostics()` includes:

```text
physicalTerminalEvents
statusOnlyTerminalEvents
statusOnlyRefreshSkips
workspaceRefreshes
refreshCoalesces
idempotentStartReplays
replayShortCircuits
revisionConflicts
revisionRetries
operationMutationFailures
resumeAttempts
resumeSuppressed
startupResumeCandidates
compensationRetryBlocks
```

`auditCyberwareWorldBridgeStability()` validates persisted Cyberware operation records for:

```text
completed service operation without ItemInstance transaction proof
recovery status without recovery.required
compensation status conflict
```

The audit is read-only.

## Ownership preserved

```text
World Bridge Operation Store → durable operation and claims
Market → Market order, stock, purchase fulfillment and market compensation
Services → Service order and Service Billing references
Billing → intents, capture, void and refund
ItemInstance Transaction Store → physical commit and compensation
Cyberware World Bridge → orchestration only
```

## Acceptance conditions

```text
explicit idempotent replay performs zero new quote/domain mutations
status-only terminal event performs zero Cyberware workspace refreshes
physical terminal revisions for one citizen coalesce to one deferred refresh
one stale operation revision retries once and succeeds or returns the second failure
IN_PROGRESS / COMMITTING / CAPTURING survive reload resume discovery
COMPENSATION_REQUIRED cannot replay the physical operation
CyberGrid same-grid path and Bodymap remain unchanged
```
