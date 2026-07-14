# Equipment Item Selection Fast Path Contract

## Scope

This contract owns UI-only item selection in the mounted Equipment / CyberGrid workspace.

Selection changes do not mutate ItemInstance, Equipment placement, container occupancy, Bodymap occupancy, carry state or Cyberware runtime. They must not be processed as Equipment domain mutations.

## Canonical state

The mounted workspace uses the cached `EquipmentState` stored by `js/equipment.js`.

A selection change may update only:

```text
state.selections.selectedItemId
state.selections.selectedRegion
state.selections.inspectorReturnRegion
state.selections.selectedContainerId
state.selections.inspectedContainerId
state.selectedItem
```

`state.selectedItem` is a reference resolved from the existing `state.itemById`. Selection must not normalize ItemInstances or rebuild any state index.

## Required fast path

Player item selection uses:

```text
selectEquipmentItemFastPath(itemId, options)
```

Supported contexts:

```text
CyberGrid item: options.containerId
Body/region item: options.returnRegion
Generic item: itemId only
```

The fast path must:

1. reject an item missing from cached `state.itemById`;
2. return `ALREADY_SELECTED` without DOM work when selection context is unchanged;
3. invoke the existing lightweight selection setter;
4. merge the returned selection snapshot into cached state;
5. update CyberGrid selection classes and only affected grid action bars;
6. update Bodymap selected/related classes and its selection summary;
7. update the existing command rail header and body;
8. preserve panel identity and scroll position.

## Forbidden work

A successful warm selection must not call:

```text
getEquipmentState()
refreshEquipmentWorkspace()
renderEquipmentBodymapPanel()
renderEquipmentCybergridPanel()
syncEquipmentWorkspaceShell()
renderEquipmentModule()
```

It must not replace:

```text
[data-equipment-panel="bodymap"]
[data-equipment-panel="cybergrid"]
[data-equipment-panel="command-rail"]
```

The command rail body may replace its own inner markup because Inspector content changes with the selected item.

## Fallback

A full refresh is permitted only when the mounted root, Citizen or cached `EquipmentState` is unavailable. The delegated action layer must attempt the fast path first and keep the old refresh inside the explicit failure branch.

## Invalidation

Actual ItemInstance or Equipment mutations invalidate the cached state through the existing domain events and may rebuild all affected Equipment projections. The fast path must never suppress such invalidation.

## Acceptance

Warm item selection after Equipment is mounted:

```text
getEquipmentState calls: 0
Bodymap panel renders: 0
CyberGrid panel renders: 0
workspace refresh calls: 0
shell sync calls: 0
Bodymap DOM identity: preserved
CyberGrid DOM identity: preserved
command rail DOM identity: preserved
scroll drift: 0 px
same-item reselect: no-op
Inspector render: exactly one for a changed item
```

Browser performance target:

```text
changed item selection: <50 ms
same-item no-op: <16 ms
```
