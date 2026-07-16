# Cyberware Taxonomy Migration Contract — schema 2

## Ownership

- `data/cyberware-taxonomy.js` owns canonical identifiers.
- `js/cyberware-taxonomy-migration.js` owns deterministic legacy-to-schema-2 projection.
- `js/cyberware-store.js` consumes schema-2 slot definitions for occupancy.
- `ItemInstance` remains the only physical-instance source of truth.

## Invariants

- `TEMPLE` does not exist. `JAW` exists.
- `EARS`, `LUNGS`, `KIDNEYS` are presentation groups with two occupancy slots.
- `LEFT_EYE` and `RIGHT_EYE` remain independent regions and slots.
- systemic layers are `DERMAL`, `SKELETAL`, `NERVOUS`, `VASCULAR`; no global `MUSCULAR`.
- bilateral products remain one `ItemInstance` with multiple `bodySlots`.
- ambiguous systemic coverage is never guessed.
- migration mutates catalog definition projections only; it does not create instances or commit player operations.

## Migration outcomes

- deterministic legacy footprints are rewritten to canonical uppercase slot IDs;
- bilateral legacy groups expand to two canonical body slots;
- full arm/hand/leg hosts expand to explicit anatomical footprints;
- unresolved records carry `taxonomyReview.required` and diagnostic codes.
