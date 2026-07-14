# Item Type Effect Removal 1.3.1x

## Changed
- removed consumable effect catalog, resolver and Citizen status runtime;
- `useConsumable()` now changes only ItemInstance quantity;
- every committed use is exposed as a Campaign-Day usage-log entry from ItemInstance Transaction Store;
- Inspector shows quantity, used-today count and an aggregated daily log;
- Campaign Data I/O no longer owns effect/status keys;
- legacy effect/status localStorage keys are removed during Item Type Operations initialization.

## Deleted
- `data/item-effect-catalog.js`
- `js/citizen-status-store.js`
- `js/item-effect-resolver.js`
- `tests/contracts/item-type-effect-resolution.test.cjs`
- `docs/contracts/equipment/item_effect_resolution_contract.md`
