# Cyberware Diagnostics Contract — 11.0x

## Canonical inputs

Diagnostics is a read model over existing canonical domains:

```text
Cyberware Runtime 7.0x
Cyberware Core Stack 9.0x
Cyberware Authorization 10.0x
ItemInstance condition/location/runtime projection
```

`js/cyberware-diagnostics.js` must not create a second operational state and must not write diagnostic values back into `ItemInstance`.

Canonical current-state API:

```text
buildCyberwareDiagnostics(citizenOrId, runtimeState?)
getCyberwareDiagnosticsState(citizenOrId, runtimeState?)
```

When a runtime state is supplied, the diagnostics resolver must reuse it. It must not rebuild Cyberware Runtime.

## Diagnostic status

System-level statuses:

```text
NOMINAL
ADVISORY
DEGRADED
CRITICAL
```

Finding severities:

```text
INFO
WARNING
ERROR
CRITICAL
```

Status is derived from current findings and Neurocrash Risk. It is not persisted as live runtime state.

## Covered domains

Diagnostics evaluates:

```text
Neuroload / capacity / demand
Neurochannels / effective channels
Interface Load / capacity
Neural Strain
Security
Stability
Neurolatency class
core component availability
body-slot conflicts
condition degradation
operational FAULT / LOCKED / DISABLED / MAINTENANCE
protocol and component-standard incompatibility
authorization / subscription / firmware blockers exposed by Runtime
```

## Stability

Patch 11.0x does not change the Runtime 7.0x Stability formula.

The diagnostics panel exposes the existing inputs:

```text
Neurochip Stability
Interface Signal Integrity
Interface Redundancy
average condition of active non-core implants
Neural Strain penalty
```

The displayed Stability value remains `runtime.neuralCore.stability`.

## Neurocrash Risk

`Neurocrash Risk` is a diagnostic indicator from 0–100. Inputs include:

```text
missing Neurochip / Interface
Neural Strain
low Stability
FAULT count
LOCKED count
critical item condition
```

Risk levels:

```text
LOW
ELEVATED
HIGH
CRITICAL
```

11.0x does not apply health damage, unconsciousness, time advancement or automatic service operations. Those effects remain outside Diagnostics.

## Scan history

Manual scans persist compact snapshots in:

```text
Citizen.cyberwareDiagnostics[]
```

Maximum retained records:

```text
24
```

A scan record contains only summary telemetry:

```text
id
createdAt
status
neurocrashRisk
issue counts
Stability
Security
Neural Strain
up to 12 issue codes
```

It must not duplicate ItemInstance or full Runtime records. Citizen export/import carries this history automatically as part of the Citizen record.

Mutation API:

```text
runCyberwareDiagnosticScan()
clearCyberwareDiagnosticHistory()
```

Citizen updates use:

```text
source = CYBERWARE_DIAGNOSTICS
skipModuleRefresh = true
skipProfileRefresh = true
```

Equipment and Cyberware runtime cache invalidation listeners must ignore this source because saving a scan does not change domain state.

## UI and performance

Diagnostics is lazy:

```text
enter CYBERWARE
→ render Diagnostics placeholder only
→ no diagnostics view-model build
→ Open Diagnostics
→ build from cached Cyberware Runtime
```

A plain `CYBERGRID ↔ CYBERWARE` switch must not build Diagnostics.

After a real Cyberware mutation:

```text
Runtime cache invalidated
Diagnostics host marked dirty
mounted Diagnostics refreshed only during targeted Cyberware refresh
closed Diagnostics remains unbuilt
```

Manual scan and history clear refresh only the mounted Diagnostics panel.

## Non-goals

11.0x does not change:

```text
ItemInstance schema
ItemState
CyberGrid placement or drag paths
Cyberware Runtime formulas
Core Stack mechanics
Authorization mechanics
Planner procedure rules
health/damage mechanics
Maintenance operations
Billing or world time
```
