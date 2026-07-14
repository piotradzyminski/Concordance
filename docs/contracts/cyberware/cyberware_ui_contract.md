# Cyberware UI Contract 15.13x

## Ownership

Cyberware is a standalone player module registered as `cyberware`.

```text
js/cyberware-module.js
  module shell, target Citizen, delegated actions and public navigation

js/cyberware-workspace.js
  player-facing workspace composition, navigation state and Instance Inspector

js/equipment-cyberware-link.js
  Equipment-to-Cyberware navigation bridge only
```

Domain resolvers remain in Runtime, Core Stack, Authorization, Planner, Diagnostics, Maintenance and World Bridge modules. Equipment owns only Cybergrid and physical equipment placement; it does not own a Cyberware workspace tab.

Cyberware internal navigation remains contained inside the standalone module.

## Internal section hierarchy

Cyberware exposes three primary internal sections:

```text
SYSTEMS
NEURAL_CORE
OPERATIONS
```

Stable leaf views are grouped as follows:

```text
SYSTEMS
  OVERVIEW
  BODYMAP
  SYSTEMS

NEURAL_CORE
  CORE_STACK
  DIAGNOSTICS

OPERATIONS
  PLANNER
  MAINTENANCE
  HISTORY
```

`SYSTEMS` as a primary section key and `SYSTEMS` as the existing Installed Systems leaf-view key belong to different navigation levels. Primary section controls use `data-cyberware-ui-section`; leaf controls use `data-cyberware-ui-view`.

## Navigation state

Per-Citizen UI state stores:

```text
activeSection
activeView
sectionViews[SYSTEMS]
sectionViews[NEURAL_CORE]
sectionViews[OPERATIONS]
selectedInstanceId
bodymapView
```

`selectedInstanceId` and `bodymapView` are transient presentation state. They are not written to Citizen, ItemInstance, Equipment state or campaign persistence. Cyberware does not reuse the global Equipment item selection or Equipment Bodymap view state.

Switching a primary section restores the last valid leaf view used in that section. A direct route to any existing leaf view derives and activates its owning primary section.

Default leaf views:

```text
SYSTEMS -> OVERVIEW
NEURAL_CORE -> CORE_STACK
OPERATIONS -> PLANNER
```

Existing route payloads and notification links may continue to target:

```text
OVERVIEW
BODYMAP
SYSTEMS
CORE_STACK
PLANNER
DIAGNOSTICS
MAINTENANCE
HISTORY
```

No route migration is required.

## Neural Core workspace

`NEURAL_CORE` remains a primary Cyberware section with the stable leaf routes:

```text
CORE_STACK
DIAGNOSTICS
```

Both leaf views render inside one coherent Neural Core workspace. They share one read-only context surface containing:

```text
Neuroload
Neurochannels
Interface load
Stability
Security
Neurolatency
Neurochip status
Interface status
Service Port status
last persisted diagnostic scan
current Core Stack blocker/warning counts
```

`CORE_STACK` adds component detail, Neurochip-to-Interface link state, effective protocols, body buses and the dependent-system compatibility matrix. `DIAGNOSTICS` adds the canonical current diagnostic resolver output, resource pressure, Stability/Security factors, current findings and saved scan history.

The shared summary reads Core Stack state and saved `citizen.cyberwareDiagnostics[]` history. It does not create another diagnostics result, store, cache or persistence path. Full diagnostics remain lazy and are built only when the `DIAGNOSTICS` leaf is mounted.

Core Stack and Diagnostics must not present duplicate top-level workspace headers. Embedded panels use a local subhead beneath the shared Neural Core context. The embedded Diagnostics action row does not render a redundant `Close Diagnostics` control; navigation back to `CORE_STACK` is handled by the stable leaf route.

A saved diagnostic scan refreshes the mounted Diagnostics body and both Neural Core summary projections without rebuilding EquipmentState or CyberGrid.


## Overview dashboard

`OVERVIEW` remains the default leaf view of `SYSTEMS`. It is a read-only status dashboard, not a navigation hub.

The Overview must project the current Cyberware state from canonical owners:

```text
Cyberware Runtime
  installed and operational counts
  Neuroload, Neurochannels and Interface load
  Stability, Security, latency and Core warnings

Cyberware Authorization
  license validity
  required-subscription billing state
  managed firmware state

ItemInstance view
  physical condition
  Runtime blockers and warnings
```

The Overview presents three layers:

```text
CAPACITY
READINESS
ATTENTION
```

`READINESS` includes operational state, subscription billing, licenses/access, firmware, physical condition and current findings.

The Overview must not render:

```text
Citizen identity or legal name
shortcut-only buttons to other Cyberware views
direct payment, firmware, maintenance or ItemInstance mutation controls
a second persisted summary store
```

Subscription billing labels are projections of the linked canonical subscription contract state. Firmware labels are projections of the canonical Cyberware Authorization/Firmware resolver. The Overview does not infer successful payment or current firmware from UI state.

## Stable panel roots

The workspace retains persistent roots for all eight leaf views:

```text
OVERVIEW
BODYMAP
SYSTEMS
CORE_STACK
PLANNER
DIAGNOSTICS
MAINTENANCE
HISTORY
```

Primary or local navigation changes presentation state only. It must not rebuild EquipmentState, invalidate ItemInstance projections or replace the Equipment module root.

Planner, Diagnostics and Maintenance mount lazily on first leaf-view entry. Primary section switching must not eagerly mount hidden leaf views.

## Layout boundary

The Cyberware workspace uses one full-width content column. The inherited two-column Equipment link/workspace layout must not split Cyberware navigation from its active panel.

This layout rule applies only to `.cyberware-ui-workspace`. CyberGrid and other Equipment screens retain their existing layout contracts.

## Refresh boundary

Cyberware domain mutation may replace the cheap read-only roots independently:

```text
overview summary
bodymap
installed systems
Cyberware Inspector hosts
core stack
history
```

Local Bodymap view changes and ItemInstance selection update only the mounted Cyberware Bodymap, Installed Systems and Inspector DOM projections. They must not call the Equipment workspace refresh path, rebuild EquipmentState or invalidate CyberGrid.

Planner, Diagnostics and Maintenance hosts remain mounted and use their existing dirty/invalidation contracts. Status-only World Bridge events must not trigger EquipmentState or CyberGrid rebuilds.

## Bodymap

The Bodymap is a read-only projection of installed ItemInstances. It uses canonical installed slots and does not mutate anatomy, assignment or placement.

Canonical assets are:

```text
FRONT -> assets/bodymap_front.jpg
BACK  -> assets/bodymap_back.jpg
```

Internal view keys and player-facing labels use `front` / `back` and `FRONT` / `BACK` consistently. `ANTERIOR` and `POSTERIOR` are not player-facing view names.

The two figure trees may remain mounted to keep switching cheap, but only one large figure is visible and interactive at a time. `FRONT / BACK` changes are local presentation updates. They do not rebuild the Cyberware workspace, EquipmentState or CyberGrid.

The Bodymap, Installed Systems list and Cyberware Inspector share the same per-Citizen `selectedInstanceId`. Every interactive marker carries the canonical ItemInstance identifier. Selecting a mapped system:

```text
selects the matching Installed Systems record
highlights the matching marker
refreshes all mounted Cyberware Inspector hosts
switches bodymapView to the system's mapped FRONT or BACK side when required
```

Selection does not perform installation, removal, reassignment or any other physical commit.

## Cyberware Inspector

The Cyberware Inspector is a read-only projection of the selected physical ItemInstance and canonical Cyberware resolvers. It is functionally analogous to the Equipment Item Inspector but owns a separate transient Cyberware selection state.

The Inspector may present:

```text
player label and catalog/model identity
manufacturer, type, tier, grade and scale
condition, lifecycle and BODY location
operational state, reason, blockers and warnings
Neuroload, Neurochannels and Interface load
protocol and bus requirements
license, subscription and billing projection
installed/current firmware projection
calibration and latest service information
instanceId, definitionId and hardware serial
```

Inspector controls may route the selected ItemInstance into Planner or Maintenance, including deinstall, replace and firmware workflows. They must use existing public APIs and World Bridge boundaries. The Inspector must not commit physical ItemInstance state, create an alternate authorization/firmware resolver, or persist a second summary record.

## Operations Workspace

`PLANNER`, `MAINTENANCE` and `HISTORY` remain stable leaf routes inside the `OPERATIONS` section, but render through one shared workspace composition:

```text
Operations summary
active detail panel
Cyberware Inspector
```

The summary is a read-only projection of the active operation context. It may expose selected ItemInstance, operation type, current planner/maintenance status, quote, duration, blockers, warnings and the latest matching World Bridge operation. It does not create a second operation store or persist a duplicate status record.

Planner selection owns source/target semantics. For `REPLACE`, the Inspector can switch between `SOURCE` and `TARGET` without changing the planned operation or mutating planner state. For `INSTALL` the Inspector follows the source; for `DEINSTALL` it follows the target.

Maintenance reuses the shared selected ItemInstance when that instance is serviceable. Manual maintenance selection updates the transient Cyberware selection. The embedded Maintenance panel does not render a redundant close action; navigation is owned by the Cyberware leaf tabs.

History rows retain their canonical `instanceId` whenever the event concerns one physical ItemInstance. The player may filter history by:

```text
ALL SYSTEMS
SELECTED SYSTEM
```

Selecting an ItemInstance-linked history row updates the shared Cyberware selection and Inspector. System-wide diagnostic entries may remain unlinked.

Planner, Maintenance and History continue to use existing public APIs and canonical stores. The workspace must not:

```text
commit ItemInstance directly
create Billing or Service state
advance Campaign Time locally
create a local World Bridge operation record
replace planner, maintenance or history persistence
```

Legacy copy claiming that Billing, scheduling or Campaign Time are universally disconnected is not rendered. UI copy describes current domain ownership instead of historical patch limitations.

## History

History combines installed ItemInstance `serviceHistory[]` with Citizen `cyberwareDiagnostics[]`. It is a view projection and is not a separate persisted log.

## World Bridge boundary

Player-facing install, deinstall, replace, maintenance, diagnostics, repair, calibration, cleaning, firmware and license operations remain coordinated by the existing Cyberware World Bridge APIs.

The UI must not:

```text
write citizen.cyberwareList
commit ItemInstance physical state directly in player flow
create a second operation store
fall back silently from World Bridge to direct commit
```

Explicit `ADMIN_DIRECT_OPERATION` and `DEVELOPER_DIRECT_OPERATION` remain separate authorized modes outside ordinary player navigation.


## Cyberware Index 13.6x

- Index source: `getCyberwareCatalog()` canonical definition projection.
- Index owns transient per-Citizen UI state only: open/query/category/manufacturer/grade/selectedDefinitionId.
- Definition Inspector is read-only and never receives ItemInstance mutation controls.
- Installed Cyberware Inspector remains the owner of serial, condition, authorization, firmware and service-history projections for a physical instance.
- Equipment bundle loads `js/cyberware-index.js` after the Cyberware catalog/runtime projection and before the workspace renderer.
- Index reuses the Item Index drawer visual language but does not reuse Item Index instance-location semantics.
