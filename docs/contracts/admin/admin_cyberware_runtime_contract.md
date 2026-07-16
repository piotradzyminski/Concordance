# Admin Cyberware Runtime Contract 1.0x

## Ownership

The Admin workspace is a client of existing Cyberware domain APIs. It does not own ItemInstance, BODY placement, Service, Billing, Firmware or World Bridge state.

## Operations

Supported commands:

```text
INSTALL
DEINSTALL
REPLACE
MAINTENANCE
DIAGNOSTIC
REPAIR
CALIBRATION
FIRMWARE_UPDATE
```

Execution modes:

```text
PLAYER_WORLD_OPERATION
ADMIN_DIRECT_OPERATION
```

PLAYER WORLD routes through Cyberware World Bridge and therefore Service, Billing, scheduling and recovery. ADMIN DIRECT uses existing direct Planner/Maintenance commits and explicitly bypasses those orchestration layers. Direct mode never bypasses ItemInstance identity, BODY slots, compatibility, ownership, return destination, condition or firmware eligibility checks.

## Command safety

Every execution requires ADMIN actor, operator note, idempotency key and a fresh planner ID or ItemInstance revision. Audit Store is the idempotency ledger. Reusing a key with another command signature returns `ADMIN_CYBERWARE_IDEMPOTENCY_CONFLICT`.

## Read projection

The workspace reads installed systems from `getInstalledCyberwareInstanceViews()` and runtime/core metrics from `getCyberwareRuntimeState()`. No `citizen.cyberwareList` write is allowed.

## Non-goals

- Cyberware catalog authoring;
- new World Bridge operation types;
- manual raw BODY-slot editing;
- manual Neuroload/Security/Stability writes;
- direct Billing balance mutation;
- browser repository-file writes.
