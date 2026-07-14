# Equipment Bodymap View Fast-Path Contract

## Scope

This contract owns the `Front / Back` view transition inside Equipment → CyberGrid Bodymap.

The transition is presentation-only. It must not reconstruct EquipmentState, refresh Storage, replace the Bodymap panel or synchronize the Equipment workspace shell.

## Mounted view model

The Bodymap panel mounts both view trees during a normal Bodymap render:

```text
[data-equipment-panel="bodymap"]
  [data-equipment-bodymap-view-panel="front"]
  [data-equipment-bodymap-view-panel="back"]
```

One view is active. The other remains mounted with:

```text
hidden
aria-hidden="true"
inert
```

A regular Equipment refresh may rebuild both trees after a real state or selection projection change. A pure `Front / Back` transition must preserve the identity of the panel and both mounted view nodes.

## Fast-path API

```text
switchEquipmentBodymapView(view, options?)
```

Required behavior:

1. normalize the target to `front` or `back`;
2. return an immediate no-op when the target is already active;
3. update the global Equipment selection;
4. update `equipmentRuntimeStateCache.state.selections.selectedBodymapView` when the cache exists;
5. delegate DOM visibility changes to `syncEquipmentBodymapPanelView()`;
6. preserve scroll, workspace selection, panel identity and mounted image nodes.

Forbidden calls in this path:

```text
getEquipmentState()
refreshEquipmentWorkspace()
renderEquipmentBodymapPanel()
renderEquipmentCybergridPanel()
syncEquipmentWorkspaceShell()
```

## Asset warmup

Both Bodymap images are present in the mounted panel with:

```text
loading="eager"
decoding="async"
data-equipment-bodymap-image
```

`preloadEquipmentBodymapAssets()` starts `decode()` for both images after the CyberGrid screen is mounted. The same decode promise is reused for the lifetime of that panel instance.

A full Bodymap rebuild creates a new panel and therefore a new two-image decode cycle.

## Invalidation boundary

`ws:item-instances-updated` and other real Equipment invalidations continue to clear the cached EquipmentState and mark CyberGrid dirty. The next regular refresh rebuilds the dual Bodymap projection from the new state.

Changing only `selectedBodymapView` does not invalidate EquipmentState.

## Acceptance criteria

After the panel and images are mounted:

```text
getEquipmentState calls: 0
renderEquipmentBodymapPanel calls: 0
renderEquipmentCybergridPanel calls: 0
refreshEquipmentWorkspace calls: 0
syncEquipmentWorkspaceShell calls: 0
Bodymap panel identity: preserved
Front frame identity: preserved
Back frame identity: preserved
scroll drift: 0 px
warm synchronous switch: <16 ms
active-view click: no-op
```
