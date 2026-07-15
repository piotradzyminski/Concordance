# Cyberware Upgrade System Contract 16.1x

## Ownership

Cyberware upgrades do not create a second cyberware store.

```text
host cyberware = ItemInstance in BODY
hardware module = separate ItemInstance in INSTALLED_IN_ITEM
firmware = host cyberwareState.installedFirmware
calibration = host cyberwareState.calibration
permanent modification = host cyberwareState.permanentModifications
```

`citizen.cyberwareList` is never written by this system.

## Scale and definition responsibility

Scale provides a default upper bound. A concrete Cyberware definition owns the actual slots and capacities.

| Scale | Default hardware capacity | Default module slots | Default firmware capacity | Default permanent-mod capacity |
|---|---:|---:|---:|---:|
| SMALL | 0 | 0 | 0 | 0 |
| MEDIUM | 1 | 1 | 1 | 1 |
| LARGE | 2 | 2 | 2 | 1 |
| FULL_SET | 3 | 3 | 3 | 2 |

A definition may override `upgradeCapacity`, `moduleSlots`, `firmwareCapacity` and `permanentModificationCapacity`. Equal scale does not imply equal slot types.

## Typed hardware slots

Each slot has a stable `slotId` and `slotType`. Compatibility may additionally restrict definition IDs, manufacturers and protocols.

```js
{
  slotId: "motor-1",
  slotType: "MOTOR",
  acceptedModuleDefinitionIds: [],
  acceptedManufacturers: [],
  requiredProtocols: []
}
```

Supported slot families are domain-specific and include MOTOR, TOOL, SENSOR, PROCESSOR, MEMORY, SECURITY, COOLING, ROUTING, DIAGNOSTIC, MEDICAL, POWER, STRUCTURE and UTILITY.

## Physical module lifecycle

Installation, removal and replacement use one atomic ItemInstance transaction.

```text
stored module
→ Service / World Bridge
→ INSTALLED_IN_ITEM
```

Canonical installed location:

```js
{
  type: "INSTALLED_IN_ITEM",
  parentItemInstanceId: "host_instance_id",
  moduleSlotId: "host_slot_id"
}
```

The host stores only an index reference in `cyberwareState.installedModules`. The child ItemInstance remains the source of condition, identity, authorization and history.

## Operations

```text
INSTALL_MODULE
REMOVE_MODULE
REPLACE_MODULE
APPLY_PERMANENT_MOD
```

Player execution must call Cyberware World Bridge. Physical commit is performed only after Service completion through `commitCyberwareUpgradeServiceResult()`.

Required service definitions:

```text
svc-cyberware-module-install-standard
svc-cyberware-module-remove-standard
svc-cyberware-module-replace-standard
svc-cyberware-permanent-modification-standard
```

## Effective runtime projection

`applyCyberwareUpgradeEffects()` merges installed hardware-module and permanent-modification effects into the read-only Cyberware Runtime projection. It must not mutate the host ItemInstance during render.

## Firmware and calibration

Firmware and calibration remain separate from hardware slots:

- firmware consumes `firmwareCapacity`;
- calibration changes `cyberwareState.calibration`;
- neither creates a child ItemInstance;
- both remain Service/Maintenance operations.

## UI

Cyberware Instance Inspector exposes one `UPGRADES` disclosure with:

```text
HARDWARE
FIRMWARE
CALIBRATION
PERMANENT MODS
```

Hardware controls operate on physical module ItemInstances. UI commands do not directly patch the ItemInstance Store.

## Public API

```text
getScalePolicy
getModuleDefinitions
getModuleDefinition
getPermanentModificationDefinitions
getPermanentModificationDefinition
getCyberwareUpgradeProfile
getInstalledCyberwareModules
getCyberwareModuleProfile
getCompatibleCyberwareModuleCandidates
validateCyberwareModuleCompatibility
buildCyberwareUpgradeQuote
commitCyberwareUpgradeServiceResult
applyCyberwareUpgradeEffects
startCyberwareUpgrade
renderCyberwareUpgradePanel
```
