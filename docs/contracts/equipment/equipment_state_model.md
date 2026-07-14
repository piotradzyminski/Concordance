# Equipment State and Fast-Path Contract — Current

## Canonical physical state

`ItemInstance.location` is the persisted source of physical location. Equipment state is a runtime projection used by renderers, placement validation and interaction helpers. Compatibility fields such as `equippedLocation`, `containerHostId`, `containerPlacement`, `storageUnitId` and `housingPlacement` may exist on Equipment view models, but they are not independent persisted ownership.

Canonical location families used by the current ItemInstance store include:

```text
BODY
EQUIPPED
CONTAINER_GRID
CONTAINER_SLOT
HOUSING_STORAGE
SERVICE
VENDOR
DESTROYED
```

Cross-domain physical commits use `js/item-instance-transaction-store.js`. Local Equipment interactions continue to use existing Equipment APIs and must not be routed through World Bridge.

## Runtime Equipment-state cache

The Equipment shell stores the most recently rendered normalized state for the active citizen:

```js
window.WS_APP.equipmentRuntimeStateCache = {
  citizenId,
  state
}
```

The cache is replaced during a full Equipment render and targeted scoped refreshes. Drag startup reuses the matching rendered state and falls back to `getEquipmentState()` only when no valid cache is available.

## Drag hit-test contract

`pointerdown` records source identity and pointer coordinates. After the drag threshold:

```text
0 forced grid width/height mutations
0 per-cell geometry measurements
0 Equipment-state rebuilds when a matching rendered state is cached
1 geometry model when a target grid is first entered
1 placement context when that target grid is first evaluated
```

The active cell is resolved in this order:

```text
1. document.elementFromPoint() -> actual data-equipment-grid-cell
2. cached grid-track math only when the pointer is over a grid gap
```

Grid geometry and placement context remain cached for the drag session. Pointer movement over the same logical cell does not repeat validation.

## Placement coordinate rule

The cursor holds the grabbed item segment:

```text
targetColumn = pointedColumn - grabOffsetColumn
targetRow    = pointedRow - grabOffsetRow
```

Grab offsets are derived once from the source item rectangle and rendered footprint. This rule applies to normal, rotated and cross-container multi-cell transfers.

## World Bridge boundary

The following must not rebuild EquipmentState or CyberGrid:

```text
quote
provider selection
coverage preview
Billing authorization/capture status
Service scheduling/status polling
Subscription entitlement reads
Market cart updates
```

A real ItemInstance physical commit may mark targeted caches dirty and cause one controlled refresh. Same-grid placement and ordinary cross-container transfers remain Equipment fast paths.

## Superseded material

The former 5.1.3x document described legacy physical-location fields as the primary model. That ownership model is superseded by `docs/contracts/core/item_instance_contract.md` and `docs/contracts/core/item_instance_transaction_contract.md`.

## Bodymap region and inspector-selection contract

The player-facing Bodymap exposes composite paired regions while retaining side-specific mechanical mounts:

```text
SHOULDERS -> LEFT_SHOULDER + RIGHT_SHOULDER
FOREARMS  -> LEFT_FOREARM + RIGHT_FOREARM
THIGHS    -> LEFT_THIGH + RIGHT_THIGH
SHINS     -> LEFT_SHIN + RIGHT_SHIN
```

`SHINS` is visible on both FRONT and BACK. Each side exposes one body mount accepting a shin pad/shin guard or a purpose-tagged small holster. Shin-specific tags resolve before generic `ARMOR` layer inference; an unqualified generic holster remains a thigh-mount candidate; shin mounting requires `SMALL_HOLSTER` or `SHIN_HOLSTER`. Side child regions remain hidden from the top-level Bodymap and are rendered inside the composite region inspector.

The active CyberGrid container and the Item Inspector target are separate selection concepts:

```text
selectedContainerId  = active visible storage grid
inspectedContainerId = explicit container target in Item Inspector
```

Automatic selection of the first active storage grid must not populate Item Inspector. Only an explicit container action sets `inspectedContainerId`.



## Per-instance player labels

Equipment and Cyberware consume the same ItemInstance naming projection:

```text
catalogName = immutable definition/model name
playerLabel = optional user label stored on ItemInstance
displayName = playerLabel || catalogName
```

Player-facing grids, Item Index, tooltips, Item Inspector, Installed Systems and Core Stack use `displayName`. Item Inspector and rename controls retain the catalog model name as technical identity. Rename operations must call `renameItemInstance`; renderers may not write `name`, `instanceData.name` or catalog definitions. The Item Inspector keeps the rename editor collapsed behind a `RENAME` trigger placed below `Item Description`; opening the disclosure is presentation-only, and the subsequent save/clear rerender returns to the compact trigger state.

## Inspector condition and CyberGrid label contract

Compact Inspector and slot cards use humanized category/subtype tokens. They show the named condition band without a numeric percentage.

```text
PERFECT  90–100
GOOD     71–89
WORN     45–70
DAMAGED  15–44
BROKEN    0–14
```

`DAMAGED` receives the alert border treatment. `BROKEN` is visually dimmed and canonical equip validation returns `ITEM_BROKEN`; an already equipped broken item may still be unequipped. Renderers must not implement a separate condition threshold.

CyberGrid storage headings describe the physical relationship rather than internal location enums:

```text
equipped container: REGION / CONTAINER TYPE
nested container:   PARENT CONTAINER TYPE / CHILD CONTAINER TYPE
```

The instance display name remains the separate second heading line. Container-type aliases may humanize canonical tokens, for example `MASS_COMPRESSION_CUBE -> C-CUBE`, without mutating the definition or ItemInstance.

## Player-facing label normalization

Equipment exposes one shared formatter family from `js/equipment-items-panel.js`:

```text
formatEquipmentCategoryLabel
formatEquipmentSubtypeLabel
formatEquipmentRegionLabel
formatEquipmentSlotLabel
formatEquipmentMountLabel
formatEquipmentContainerTypeLabel
```

Player UI must use these formatters instead of rendering raw enum tokens. Contextual formatting may shorten a mechanical key when the surrounding region already supplies its meaning. Examples:

```text
FOREARM_GUARD in RIGHT_FOREARM -> ARMOR
RIGHT_FOREARM                  -> RIGHT FOREARM
CHEST_RIG                      -> CHEST RIG
MASS_COMPRESSION_CUBE          -> C-CUBE
```

Normalization is presentation-only. It must not change `definitionId`, catalog names, placement anchors, equip profiles, `playerLabel` or persisted ItemInstance data. `playerLabel` remains the instance display name and the immutable catalog/model name remains visible in technical identity and rename controls. Compact slot cards keep condition visual-only; tooltip and full Inspector projections may continue to show detailed condition information.



## Item selection fast path

Warm selection is a presentation-only operation. `selectEquipmentItemFastPath()` consumes the cached EquipmentState and updates only:

```text
selected item/container/return-region fields
CyberGrid selected classes and affected action bars
Bodymap selected/related classes and summary
command rail header and body
```

It must not call `getEquipmentState()`, rebuild Bodymap/CyberGrid panels, replace the Equipment root or alter ItemInstance placement. `clearEquipmentActiveSelectionFastPath()` follows the same boundary. A full shell refresh is allowed only when the mounted root, Citizen or cached state is unavailable.

## Workspace cards and empty-slot identity

The top-level `CYBERGRID` and `CYBERWARE` controls use the shared terminal tile proportions. An empty region slot renders one centered ghost label and one status badge. The identity block must not repeat the slot label in a corner `<small>` element. Occupied slots retain the normalized slot label, item display name and visual condition classes.


## Deterministic pre-alpha QA loadouts

`data/item-instances.js` contains two replaceable pre-alpha fixture sets identified by `flags.equipmentTestLoadout`. Citizen A covers mobile mounts, coverage reservations, held/item-mounted equipment and condition edges. Citizen B covers complete independent layers, blocked mounts, deep container nesting, rotation and Housing storage. `ITEM_INSTANCE_SEED_VERSION` intentionally forces reconciliation when the fixture version changes. These records are QA data and are not lore canon.
