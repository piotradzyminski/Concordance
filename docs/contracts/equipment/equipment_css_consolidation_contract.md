# Equipment CSS Consolidation Contract 6.2

## Ownership

`css/equipment.css?v=132` is the canonical presentation owner for the player Equipment module:

- CyberGrid and storage regions;
- Equipment Bodymap presentation;
- Command Rail and Inspector;
- Item Index;
- Equipment item-operation controls.

Cyberware domain styling remains outside this file.

## Removed legacy presentation

The Equipment stylesheet must not define the retired multi-workspace and transfer presentation:

```text
.equipment-shell-layout--workspace
.equipment-workspace-tabs
.equipment-storage-transfer-columns
.equipment-storage-transfer-column
.equipment-transfer-row
.equipment-transfer-feedback
.equipment-transfer-blocked
.equipment-body-workspace
.equipment-secondary-workspace
.equipment-utility-workspace
```

These selectors had no active Equipment runtime consumer in the 15.22x baseline.

## Preserved active shell

The following selectors remain active and must not be removed by legacy cleanup:

```text
.equipment-shell-layout--screen-split
.equipment-screen
.equipment-cybergrid-workspace
```

The current renderer mounts a single `CYBERGRID` screen inside this shell. Their presence does not reintroduce the retired multi-tab state model.

## Cascade rules

The stylesheet must not contain repeated root blocks for canonical selectors whose declarations were consolidated in 6.2:

```text
.equipment-body-region-row.is-reserved
.equipment-container-groups
.equipment-shell-panel__head--bodymap
.equipment-bodymap-penalty
.equipment-storage-region
.equipment-storage-region__identity h6
.equipment-shell-inspector-grid--player
```

Responsive variants inside media queries are separate contracts and may remain.

## Scope boundary

This patch does not change:

- Equipment runtime or store state;
- ItemInstance ownership or location;
- selection fast paths;
- Bodymap Front/Back mounted-tree behavior;
- pointer/drag handling;
- Cyberware styles or runtime;
- visual design values beyond relocating already-effective declarations into canonical blocks.
