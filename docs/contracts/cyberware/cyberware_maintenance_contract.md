# Cyberware Maintenance Contract 12.0x

## Scope

Maintenance operates on the canonical physical `ItemInstance`. It does not create a service copy, a Cyberware-side record or a second operational state.

```text
Citizen
→ selected owned Cyberware ItemInstance
→ maintenance quote
→ one canonical ItemInstance update
→ targeted Cyberware cache invalidation/refresh
```

## Canonical APIs

```text
getCyberwareMaintenanceViewModel(citizenOrId)
buildCyberwareMaintenanceQuote(citizen, item, operation)
runCyberwareMaintenance(citizenOrId, options)
setCyberwareMaintenanceSelection(citizenId, patch)
normalizeCyberwareServiceHistory(history)
```

## Supported operations

```text
DIAGNOSTIC
CLEAN
CALIBRATE
REPAIR
FIRMWARE
```

### `DIAGNOSTIC`

- reads the current Cyberware Runtime result for the selected instance;
- records operational state, blockers, warnings, Security and Stability context;
- stores the compact result under `cyberwareState.maintenance.lastDiagnostic`;
- appends one `serviceHistory` record.

### `CLEAN`

- stores `cyberwareState.maintenance.cleanliness = 100`;
- stores `lastCleanedAt`;
- appends one service record;
- no decay or runtime modifier is introduced in 12.0x.

### `CALIBRATE`

- updates the existing `cyberwareState.calibration` object;
- sets profile `CERTIFIED_SERVICE` and quality `100`;
- stores `lastCalibratedAt`;
- appends one service record.

### `REPAIR`

- restores `durability.current` to the instance durability maximum, default `100`;
- refuses execution when repair is unnecessary;
- runtime effects are inherited from the existing condition resolver;
- appends one service record.

### `FIRMWARE`

- delegates firmware mutation to `installCyberwareFirmware()`;
- authorization remains the canonical firmware resolver;
- firmware installation and service-history append are committed in the same `updateItemInstance()` call;
- refuses execution when firmware is not managed or already current.

## Service history

Canonical storage:

```text
ItemInstance.serviceHistory[]
```

Retention:

```text
48 most recent entries per ItemInstance
```

Canonical entry fields:

```text
id
type
status
createdAt
provider
cost
durationMinutes
conditionBefore / conditionAfter
calibrationBefore / calibrationAfter
cleanlinessBefore / cleanlinessAfter
firmwareBefore / firmwareAfter
diagnosticStatus
codes[]
note
```

History follows the same `instanceId` through storage, installation, service, removal and resale.

## Serviceable instances

Maintenance resolves owned Cyberware instances from the global ItemInstance Store. Supported locations include installed, service, Housing and container storage. Disposed/vendor records are excluded.

Owner validation and ItemInstance existence are rechecked at commit time.

## Quote semantics

Cost and duration are deterministic service estimates based on operation, condition, tier and physical scale. In 12.0x they are written to service history only.

```text
no Billing debit
no campaign-time advancement
no Service order creation
```

Those integrations belong to the later world bridge.

## UI and cache contract

Maintenance is lazy:

```text
enter CYBERWARE
→ placeholder only
→ Open Maintenance
→ build Maintenance view model
```

A maintenance field change refreshes only the Maintenance host. A completed operation invalidates Cyberware Runtime/Core Stack/Diagnostics as required and requests a targeted Cyberware workspace refresh.

Prohibited in the maintenance path:

```text
full EquipmentState rebuild
full Equipment module innerHTML replacement
CyberGrid same-grid commit changes
ItemInstance schema migration
Planner eager mount
```
