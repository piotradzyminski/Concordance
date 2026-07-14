# Cyberware Runtime Contract — 7.0x

## Scope

`js/cyberware-runtime.js` is the canonical owner of derived Cyberware operational state.

It does not persist runtime state and does not create another item collection. Inputs are:

```text
ItemInstance view
+ Cyberware definition fields
+ Citizen authorization/subscription records
+ slot-placement result
```

Output is a deterministic runtime projection.

## Operational states

```text
ENABLED
DISABLED
MAINTENANCE
FAULT
LOCKED
```

### State meaning

- `ENABLED`: installed and all required dependencies are available.
- `DISABLED`: intentionally inactive or load-shed because available Interface/Neurochannels are exhausted.
- `MAINTENANCE`: instance is in `SERVICE`, `IN_SERVICE`, calibration or repair mode.
- `FAULT`: physical failure, zero condition, invalid slot assignment or slot conflict.
- `LOCKED`: installed but blocked by missing core components, tier/grade/scale, protocol, firmware, license or subscription requirements.

## State precedence

```text
DISPOSED / DESTROYED
→ SERVICE / IN_SERVICE
→ physical fault
→ explicit lock/disable
→ slot-placement fault
→ core/dependency/authorization gates
→ resource allocation
→ ENABLED
```

The result is derived every time `getCyberwareRuntimeState()` is called.

## Placement separation

`js/cyberware-rules.js` owns anatomical placement only:

```text
getCyberwarePlacementState()
getCyberwarePlacementStatus()
```

`js/cyberware-runtime.js` consumes this projection and adds operational state. It preserves:

```text
placementStatus
placementReason
```

Compatibility aliases:

```text
runtimeStatus = operationalState
runtimeReason = operationalReason
```

## Core stack

The resolver selects one active component for each role:

```text
Neurochip
Interface
Service Port
```

Selection uses tier/capacity ranking after base physical and placement validation.

Dependencies:

- Neurochip requires an operational Interface.
- Interface socket rating must support the Neurochip tier.
- Service Port is optional for ordinary operation.
- Non-core Cyberware requires an operational Neurochip and Interface.

## Capacity model

### Neuroload

Enabled non-core implants contribute `neuroLoad`.

```text
neuralStrain = max(0, activeNeuroLoad - neuroCapacity)
```

Neuroload overflow does not automatically disable implants. It produces `NEURAL_STRAIN:<value>` and reduces derived Stability.

### Interface load

Enabled non-core implants contribute `interfaceLoad`.

If the next item would exceed Interface capacity, the item is derived as:

```text
DISABLED / INTERFACE_CAPACITY_EXCEEDED
```

### Neurochannels

Effective channels:

```text
min(Neurochip.controlChannels, Interface.interfaceLanes)
```

Each active non-core implant uses:

```text
neuroChannels
neuroChannelCost
controlChannelCost
channelCost
```

Fallback cost is `1`. Core components use `0`.

Overflow state:

```text
DISABLED / NEUROCHANNELS_EXCEEDED
```

Allocation is deterministic:

```text
operationalPriority ascending
→ installedAt ascending
→ instanceId ascending
```

Default priority is `100`.

## Protocol resolution

The resolver derives effective support from the intersection of Neurochip and Interface capabilities.

Inputs:

```text
protocolSupport
supportedProtocols
supportedBuses
protocol tags
```

Body-bus identifiers are expanded to protocol capabilities. Examples:

```text
STANDARD_BODY_BUS → CIVIC, UTILITY
MEDICAL_BODY_BUS → MEDICAL, BIOMETRIC, BIOMONITORING
SECURE_BODY_BUS → SECURE, NETRUNNER
MASS_COMPRESSION_BUS → UTILITY, GRIDLINK, MULTIBUS, EQUIPMENT_LAYOUT
```

Generic requirements use `requiredProtocols`, `protocolRequirements` or `requiredBuses`.

Mass Compression component standards prefixed with `MC_` are resolved against installed component identity/compatibility tokens.

## Authorization gates

7.0x consumes existing fields and existing validation:

```text
licenseRequired / licenseStatus
subscriptionRequired / category / tier
firmwareRequired / firmwareStatus
```

These are runtime inputs only. Final persistent authorization records and expiry/revocation behavior remain assigned to `patch_cyberware_authorization_10.0x`.

## Derived core metrics

`neuralCore` exposes:

```text
neuroLoad
neuroCapacity
neuralStrain
interfaceLoad
interfaceCapacity
channelLoad
controlChannels
neurochipChannels
interfaceLanes
protocolSupport
security
stability
latencyRank
latencyClass
systemState
warnings
```

`security`, `stability` and effective latency are derived summaries. They are not written to ItemInstance.

## Public API

```text
getCyberwareRuntimeState(citizenOrList)
getCyberwareRuntimeStatus(item, citizenOrList?)
resolveCyberwareOperationalState(citizenOrList, itemOrId)
getCyberwareNeuralCoreState(citizenOrList)
getCyberwareSlotState(citizenOrList)
isCyberwareOnline(item)
CYBERWARE_OPERATIONAL_STATES
```

## Invariants

- Runtime is read-only.
- No operational-state field is persisted as a second source of truth.
- `ItemInstance.location`, lifecycle, condition and instance data remain canonical inputs.
- CyberGrid files and same-grid persistence path are outside this patch.
- Slot placement remains independent from operational enablement.
