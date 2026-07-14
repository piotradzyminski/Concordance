# Cyberware Planner Performance Contract 12.2x

## Scope

This contract defines read-side caching, projection ownership and invalidation for Cyberware Planner analysis. It does not change installation, deinstallation, replacement, anatomy, authorization, Runtime formulas or ItemInstance persistence semantics.

## Catalog index

`js/equipment-catalog-store.js` owns one canonical in-memory merged catalog and one `Map` index.

```text
seed Equipment catalog
+ dynamic Cyberware/Service Port catalog providers
-> canonical normalized catalog
-> id/catalogId Map index
```

`getEquipmentCatalogItemById()` performs an indexed lookup and clones only the selected definition. It must not rebuild or clone the complete catalog for each ItemInstance projection.

The index is invalidated after lazy/dynamic catalog providers become available. Invalidation:

```text
clear catalog array cache
clear Map index
increment catalog revision
invalidate all Planner projections when the Planner API is available
```

The next read rebuilds the index once.

## ItemInstance revision

`js/item-instance-store.js` exposes:

```js
getItemInstanceStoreRevision()
```

The revision increments whenever the canonical snapshot is rebuilt after a successful store mutation/import/reset. It is transient and is not persisted.

## Planner projection

Planner owns one transient projection per Citizen and combined revision:

```text
itemStoreRevision:equipmentCatalogRevision
```

A projection contains:

```text
Citizen reference
one Equipment ItemInstance view projection
installable source list
one installed Cyberware projection
normalized installed list
base Core Stack state
validation Citizen using the installed projection
candidate cache by source instanceId
slot-option cache by source instanceId
```

Plain Planner selection changes do not rebuild the projection. They only update transient selection state and clear the current plan/result.

## Projection invalidation

A projection is rebuilt when:

```text
ItemInstance Store revision changes
Equipment catalog revision changes
explicit invalidateCyberwarePlannerContext(citizenId) is called
Cyberware workspace domain invalidation calls the Planner invalidator
```

A workspace tab click and local Planner rerender do not invalidate domain projections.

## Analysis context

One `buildCyberwareOperationPlan()` call:

```text
applies incoming selection fields
normalizes selections once
reuses one source projection
reuses one installed projection
reuses one base Core Stack state for INSTALL
builds a full preview only for the selected operation/slot
```

REPLACE calculates a separate post-removal Core Stack context because the installed set materially differs.

## Slot discovery

Planner calls `getCyberwareDropTargets()` with:

```js
{
  relevantOnly: true,
  strictPlacement: true,
  includePreview: false
}
```

Strict placement uses the candidate's explicit compressed anatomical footprint. It does not scan mirrored or same-purpose slots for a physical package with an explicit target.

Examples:

```text
BasicSight Left -> leftEye only
Tool Forearm Right -> rightForearm only
Index Finger Right -> rightIndexFinger only
Service Port -> neckService only
```

Full validation and acceptance preview execute only after the selected slot is known.

## Normalization fast path

Cyberware normalized entries and lists are marked in transient `WeakSet` registries. Re-normalizing the same normalized object/list returns it directly.

This is a read-side optimization. No marker is serialized and no ItemInstance/Citizen schema changes.

## Preserved contracts

Unchanged:

```text
ItemInstance schema and identity
ItemState model
CyberGrid same-grid direct commit
container placement and drag/drop
Planner operation rules
12.1x requirement/anatomy/return-destination contracts
Runtime resource formulas
Authorization, Diagnostics and Maintenance semantics
workspace lazy mount/local switching
```
