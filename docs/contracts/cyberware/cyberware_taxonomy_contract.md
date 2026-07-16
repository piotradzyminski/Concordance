# Cyberware Taxonomy Contract — schema 2

## Ownership

`data/cyberware-taxonomy.js` is the canonical vocabulary for Cyberware anatomy and product classification.

It separates:

- `BODY_REGION`: Bodymap navigation only;
- `BODY_SLOT`: mechanical installation occupancy;
- `SLOT_GROUP`: compact presentation of related independent slots;
- `IMPLANT_FAMILY` / `IMPLANT_SUBTYPE`: physical host classification;
- `CAPABILITY`: feature of a concrete definition;
- `MODULE_SLOT`: upgrade socket owned by a concrete host definition.

The legacy slot tree in `js/cyberware-store.js` remains active until the schema migration patch. It is not extended with additional ad-hoc terms.

## Canonical decisions

- no `TEMPLE` body slots;
- `JAW` is a body slot;
- eyes remain separate regions and slots;
- `EARS`, `LUNGS`, and `KIDNEYS` are two-column slot groups;
- their left/right members remain independent mechanical occupancy slots;
- one bilateral `ItemInstance` may occupy both member slots;
- systemic layers are exactly `DERMAL`, `SKELETAL`, `NERVOUS`, `VASCULAR`;
- there is no global `MUSCULAR` layer;
- muscle systems remain inside limb hosts and their explicit upgrade profiles.

## Core Stack

Exactly three dedicated body slots:

- `NEURAL`;
- `OCCIPITAL_INTERFACE`;
- `NECK_SERVICE_PORT`.

Each has cardinality `0..1`.

## Two-column groups

`EARS`, `LUNGS`, and `KIDNEYS` support:

- `SINGLE_SIDE`;
- `TWO_INDEPENDENT`;
- `BILATERAL_SINGLE_INSTANCE`.

A group is not a separate occupancy slot.

## Systemic layer installation

Systemic definitions use:

```js
installation: {
  mode: "COVERAGE",
  systemicLayer: "DERMAL",
  coverageRegions: ["TORSO", "LEFT_ARM", "RIGHT_ARM"]
}
```

A systemic definition without coverage is invalid.

## Migration boundary

This patch provides aliases and review codes only. It does not guess ambiguous footprints.

Deterministic aliases include:

```text
interface   -> OCCIPITAL_INTERFACE
neckService -> NECK_SERVICE_PORT
cardiac     -> HEART
leftEar     -> LEFT_EAR
rightEar    -> RIGHT_EAR
leftKidney  -> LEFT_KIDNEY
rightKidney -> RIGHT_KIDNEY
spineCore   -> SPINE
```

Ambiguous records return one of:

```text
CYBERWARE_TAXONOMY_REVIEW_REQUIRED
CYBERWARE_BODY_FOOTPRINT_UNRESOLVED
CYBERWARE_SYSTEMIC_COVERAGE_UNDEFINED
```

## Invariants

- capabilities cannot use anatomy or slot-group IDs;
- module-slot IDs cannot be used as body slots;
- a slot group has no independent occupancy;
- a bilateral product remains one `ItemInstance` with multiple `bodySlots`;
- no writes to `citizen.cyberwareList`;
- no second Cyberware inventory or occupancy store.
