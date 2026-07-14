# ItemInstance View Cache 1.0x

## Scope

Shared ItemInstance read performance used by Equipment and Cyberware.

Cross-scope marker `x` is required because the patch changes the canonical ItemInstance Store while fixing Equipment entry and first Cyberware projection cost.

## Replaced files

- `js/item-instance-store.js`
- `index.html`
- `tests/contracts/equipment-dual-test-loadouts.test.cjs`
- `tests/contracts/item-instance-view-cache.test.cjs`
- `docs/contracts/core/item_instance_contract.md`
- `docs/PATCH_STATE.md`
- `docs/FILE_MAP.md`
- `docs/README.md`
- `PATCH_STATE.md`
- `FILE_MAP.md`
- `project.md`

## Runtime changes

- Equipment/Cyberware view list getters filter canonical `itemInstancesById` records internally.
- Public ItemInstance record getters still return defensive clones.
- `getItemInstanceView()` can now read and write its existing object-identity cache for list projections.
- Installed Cyberware projection no longer builds views from cloned records or performs a second uncached projection pass.
- ItemInstance Store rebuild schedules bounded view-cache warmup.
- Browser fallback warmup processes one ItemInstance per task to avoid replacing the EQ-entry freeze with a startup long task.
- Store/catalog revision invalidation remains canonical.

## Not changed

- EquipmentState algorithms.
- CyberGrid or Bodymap renderers.
- selection and Front/Back fast paths.
- ItemInstance ownership, persistence, schemas or mutation commands.
- Citizen B portrait asset.

## Validation

- syntax check for the complete project;
- complete sequential Node unit/contract/data-I/O suite;
- cache hit/miss tests for Equipment and installed Cyberware;
- defensive clone test;
- catalog revision invalidation test;
- bounded idle warmup test;
- clean replacement overlay test.
