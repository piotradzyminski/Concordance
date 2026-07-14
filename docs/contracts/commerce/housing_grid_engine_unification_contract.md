# Housing Grid Engine Unification Contract

## Status

```text
patch_housing_grid_engine_parity_audit_4.6.3x
```

This contract records the Housing runtime migration from its local DOM pointer drag implementation to the shared grid pointer-session core, including the 4.6.1x drag-preview parity fix, 4.6.2x same-unit performance fast path and 4.6.3x parity audit gate.

## Current ownership

```text
js/grid-pointer-session.js
  owns the public delegated pointer-session core used by Housing grid drag/drop

js/equipment-inventory.js
  owns shared item footprint, rotation and container placement-context APIs

js/equipment-housing-grid.js
  owns Housing storage unit normalization, occupancy, validation, sorting and housingPlacement commit path

js/housing-grid-engine-adapter.js
  owns the Housing-compatible context/evaluation/commit adapter and readiness diagnostics

js/housing-storage-runtime.js
  owns Housing Unit/Storage rendering, delegated pointerdown binding, local DOM placement patching and feedback

js/housing.js
  owns the Housing shell and loads the split Unit/Storage runtime

js/housing-bridge-store.js
  owns eager Housing placement reservation/commit APIs used by Market and World Bridge
```

## Canonical persistence

```text
ItemInstance.housingPlacement = {
  storageUnitId,
  column,
  row,
  rotation
}
```

No second placement store, DOM shadow persistence or containerPlacement mirroring is allowed for Housing storage.

## Public pointer-session API

```text
startGridPointerSession(event, config)
completeGridPointerSession(event, cancelled)
resetGridPointerSession()
getGridPointerSessionReadiness()
getGridPointerSessionDiagnostics()
```

Housing uses the core with:

```text
sourceSelector: [data-housing-grid-drag-item]
gridSelector: [data-housing-physical-grid]
cellSelector: [data-housing-grid-cell]
```

The core owns:

```text
pointer capture best effort
document pointermove / pointerup / pointercancel listeners
window blur cancellation
threshold before drag start
validation cache per target key
requestAnimationFrame throttling for pointermove evaluation
DOM presentation class cleanup
drag preview creation and cleanup
drag source/grid active presentation
```

The core must not render the module, rebuild EquipmentState, commit persistence directly or know Housing domain rules.

## Housing adapter API

```text
getHousingGridFootprint(item, rotation)
getHousingGridCellModel(citizenOrState, storageUnitId, options)
createHousingGridDragContext(citizenOrState, itemId, storageUnitId, options)
evaluateHousingGridDrop(context, targetColumn, targetRow, options)
commitHousingGridDrop(context, options)
getHousingGridEngineReadiness()
validateHousingGridEngineParity(item, options)
getHousingGridEngineDiagnostics()
resetHousingGridEngineDiagnostics()
```

## Adapter invariants

```text
footprint source → getEquipmentItemGridFootprint()
Housing occupancy source → buildEquipmentHousingGridModel()
Housing validation source → evaluateEquipmentHousingPlacement()
Housing commit source → moveEquipmentItemToHousing()
physical persistence → housingPlacement only
grab offset → target cell minus grabbed footprint-cell offset
rotation → 0 or 90
```

## Expected readiness after Housing lazy bundle load

```text
housingModelReady: true
housingValidatorReady: true
housingCommitReady: true
equipmentFootprintReady: true
sharedPlacementContextReady: true
sharedPointerSessionReady: true
sharedPointerPreviewReady: true
sharedAdapterReady: true
uiStillUsesLegacyHousingDrag: false
housingPlacementPersistenceReady: true
```

```text
ready: true
migrationReady: true
uiMode: SHARED_POINTER_SESSION
canonicalPersistence: housingPlacement
canonicalCommitApi: moveEquipmentItemToHousing
```

`migrationReady: true` means Housing UI no longer owns a local pointermove/pointerup drag implementation. It still owns rendering, filtering, selection and feedback.

## Runtime migration rules

```text
1. Housing pointerdown remains one delegated listener on [data-housing-module].
2. pointermove never calls renderHousingModule().
3. pointermove never calls getEquipmentState() after session context creation.
4. validation is cached by target column/row/rotation.
5. commit uses commitHousingGridDrop().
6. commit delegates to moveEquipmentItemToHousing().
7. shared drag preview follows the pointer using requestAnimationFrame without module rerender.
8. successful same-unit Housing commit must patch the moved item and grid occupancy in local DOM without full `renderHousingModule()`.
9. failed commit gives Housing feedback through the existing feedback panel without full `renderHousingModule()`.
10. click without drag remains a normal item selection click.
11. pointercancel/window blur cancels without persistence.
```

## Explicitly unchanged in 4.6x

```text
Housing Bridge reservation lifecycle
Market checkout and delivery
ItemInstance Transaction Store
Equipment container drag UI
CyberGrid drag UI
Cyberware Planner
Equipment container drag UI CSS
CyberGrid CSS
```

## Follow-up boundary

The next step may extend the same `js/grid-pointer-session.js` core to Equipment container grids or CyberGrid, but this patch intentionally does not migrate those runtimes. Equipment remains the source of footprint and placement-context logic; Housing is the first consumer of the public pointer-session core.


## 4.6.1x parity fix

```text
The player must see the dragged Housing grid item during drag/drop.
```

The shared pointer-session core owns the drag preview and source presentation. Housing provides only class names and markup through configuration:

```text
previewClass: housing-grid-drag-preview
dragSourceClass: is-drag-source
dragActiveGridClass: is-drag-active
hoveredCellClass: is-drag-hovered-cell
```

Housing storage UI wording uses `SORT`. The button must not be labeled `NORMALIZE STORAGE`; the underlying command remains `sortEquipmentHousingStorage()`.


---

# 4.6.2x Performance Contract

## Required same-unit Housing drop path

```text
startGridPointerSession()
→ createHousingGridDragContext()
→ evaluateHousingGridDrop() using context.cellModel.model.occupancy
→ commitHousingGridDrop()
→ commitCitizenHousingGridPlacement()
→ applyHousingGridPlacementToDom()
```

## Invariants

```text
same-unit Housing drag/drop must update exactly one ItemInstance
same-unit Housing drag/drop must defer ItemInstance persistence
same-unit Housing drag/drop must not emit ws:citizens-updated module/profile refresh
same-unit Housing drag/drop must not call renderHousingModule() in onComplete
same-cell drop must return HOUSING_PLACEMENT_UNCHANGED and skip write
validation during one drag session must reuse the captured occupancy model
pointer-session cell hover must update only previous/current cell classes
```

## Public readiness indicators

```text
getGridPointerSessionReadiness().supportsElementFromPointHitTesting === true
getGridPointerSessionReadiness().supportsTargetedCellClassUpdates === true
getHousingGridEngineReadiness().checks.fastHousingCommitReady === true
getHousingGridEngineReadiness().checks.sessionOccupancyModelReady === true
getHousingGridEngineReadiness().checks.noOpCommitReady === true
```

## Out of scope

```text
Equipment container runtime migration
CyberGrid runtime migration
Housing Bridge API changes
Market delivery changes
Campaign Data I/O changes
```

---

# 4.6.3x Parity Audit Gate

## Audit scope

```text
contract/static parity only
runtime behavior unchanged
no CSS changes
no index.html changes
no Equipment/CyberGrid migration
```

The audit gate verifies that Housing now consumes the same shared grid interaction primitives expected from the Equipment grid contract where applicable, without claiming that Equipment or CyberGrid have been migrated to the Housing adapter.

## Required parity assertions

```text
shared pointer core provides drag preview
shared pointer core provides grab-offset context
shared pointer core uses requestAnimationFrame for pointermove evaluation
shared pointer core prefers elementFromPoint().closest() hit testing
shared pointer core exposes targeted cell class readiness
Housing Storage uses startGridPointerSession()
Housing Storage creates a session occupancy model once per drag context
Housing Storage validates cells through evaluateHousingGridDrop()
Housing Storage commits through commitHousingGridDrop()
Housing Storage completion does not call renderHousingModule()
Housing Storage completion applies local DOM placement patch
Housing same-unit drop uses commitCitizenHousingGridPlacement()
Housing same-cell drop returns HOUSING_PLACEMENT_UNCHANGED
Storage UI label is SORT, not NORMALIZE STORAGE
```

## Browser validation still required

This audit is a Node/static contract gate. It does not replace manual browser verification for pointer feel, visual drag preview, dropped item position, collision/out-of-bounds styling or perceived frame-time.

Required browser checks remain:

```text
click without drag selects the item
drag shows the held item preview
drag source visibly dims
hovered cell is visible
valid and invalid targets are visually distinct
same-cell drop performs no write
same-unit drop moves the item without profile/sidebar refresh
reload preserves housingPlacement after deferred persistence
```

