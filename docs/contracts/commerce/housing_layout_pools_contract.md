# Housing Layout Pools Contract 3.1x

## Ownership

- `Housing Rent Standards Catalog` owns the semantic standard/tier definition and layout policy.
- `Housing Layout Pools` owns reusable floor-mask templates, pool membership and deterministic assignment policy.
- `Housing Bridge` persists the assigned `layoutTemplateId`, `layoutSeed`, policy and variant metadata on the concrete Housing record.
- `Household Store` instantiates the assigned template, owns the runtime room IDs and validates furnishing placement against the active floor mask.
- This scope does not own Rent contract changes, relocation, furniture ownership, delivery fulfillment or fixture lifecycle.

## Catalog

Canonical files:

```text
data/housing-layout-pools.js
js/housing-layout-store.js
```

The catalog is generated from `data/housing-rent-standards.js` during eager data initialization. It does not duplicate standard/tier semantics.

Current generated totals:

```text
24 tier pools
79 layout templates
```

Pool sizes:

```text
H       0 private layouts
G–D     4 RANDOM_POOL layouts per tier
C–B     4 CHOICE_POOL layouts per tier
A       1 INDIVIDUAL_ASSIGNMENT base layout per tier
```

## Floor mask

A layout template stores a bounding matrix plus explicit active and inactive cells:

```js
{
  floorPlan: {
    width: 14,
    height: 11,
    cellAreaM2: 0.25,
    activeCells: ["1:1", "2:1"],
    inactiveCells: ["14:1"]
  }
}
```

The bounding matrix is a renderer container only. Usable floor area is calculated exclusively from `activeCells`.

```text
1 cell = 0.5 m × 0.5 m = 0.25 m²
activeCellCount = areaM2 / 0.25
```

Templates may contain alcoves, offsets, corners, stepped edges, technical cut-outs and other non-rectangular geometry.

## Rooms

Every active floor cell belongs to exactly one logical room/zone. A room stores:

```text
key
label
type
bounds
activeCells
capabilities
restrictions
```

`bounds` is only the room renderer envelope. Placement validity is determined from the room's explicit `activeCells`.

Required invariants:

- no room cell exists outside the layout active mask;
- no active cell belongs to more than one room;
- every active floor cell belongs to one room;
- room IDs are instantiated from the concrete Housing record ID and stable room key.

## Assignment policies

### Standard H

```text
ASSIGNED_BEDSPACE
```

Standard H has no private floor template, no private active cells and no furnishing room. The occupant receives only the storage and shared-quarter capabilities defined by the Rent tier.

### Standards G–D

```text
RANDOM_POOL
```

The resolver deterministically selects one of four templates using a stable seed. Reopening or importing the same Housing record must not reroll its layout.

### Standards C–B

```text
CHOICE_POOL
```

An explicitly selected valid template is preserved. Without an explicit choice, the resolver produces a deterministic default pending player selection.

### Standard A

```text
INDIVIDUAL_ASSIGNMENT
```

The catalog provides one stable signature/base template per tier. A later assignment workflow may replace it with an individually authored layout while preserving the same contract fields.

## Stable assignment

Concrete Housing records may store:

```js
{
  layoutPolicy: "RANDOM_POOL",
  layoutTemplateId: "housing-g-t3-layout-alcove-03",
  layoutSeed: "LAYOUT-0ABC123",
  layoutVariantFamily: "ALCOVE"
}
```

If `layoutSeed` is absent, it is derived deterministically from stable Housing/Rent identity fields. Runtime refresh must not generate a new random layout.

## Furnishing placement

`Household Store` validates every occupied footprint cell of a furnishing.

A placement is invalid when any occupied cell:

- is outside the global active floor mask;
- is outside the selected room's active cell set;
- overlaps another placed furnishing;
- violates existing item/room restrictions.

Checking only the furnishing corners is forbidden for irregular masks.

## Fixed fixture anchors

Templates may expose fixture anchors:

```text
fixtureId
roomKey
anchorCell
```

Anchors describe intended fixed-infrastructure positions. They do not create ItemInstances or implement fixture replacement in this scope.

## Public API

```text
getHousingLayoutCatalog()
getHousingLayoutTemplates()
getHousingLayoutTemplate(layoutTemplateId)
getHousingLayoutPool(tierId)
buildHousingLayoutSeed(input)
resolveHousingLayoutAssignment(input)
instantiateHousingLayout(input)
validateHousingLayoutPoolsCatalog()
```

## Persistence and import

Canonical persisted identity is:

```text
layoutTemplateId
layoutSeed
layoutPolicy
layoutVariantFamily
```

The full generated template is not copied into each Rent contract. Household may persist its instantiated room/runtime representation, but canonical template identity remains resolvable from the layout catalog.

## Deferred scopes

- Rent upgrade/downgrade and relocation;
- transfer of citizen-owned furnishings between units;
- player layout-choice workflow for C–B;
- individually authored Standard A layouts;
- fixture installation/replacement;
- weekly furniture wear execution;
- Household hub, collections, weather and world feed.
