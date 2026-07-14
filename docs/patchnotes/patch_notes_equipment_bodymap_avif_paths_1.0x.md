# Equipment Bodymap AVIF Paths 1.0x

## Base

```text
future_3_1907.zip
Parallel Scope Merge 15.14x
```

## Scope

Correct the Equipment → CyberGrid Bodymap asset references after the canonical Bodymap masters moved into `assets/bodymap/` and were converted to AVIF.

## Changed files

```text
js/equipment-bodymap-panel.js
js/modules.js
index.html
tests/contracts/equipment-bodymap-fast-path.test.cjs
tests/contracts/runtime-bundle-boundaries.test.cjs
tests/contracts/admin-equipment-catalog-authoring.test.cjs
tests/contracts/admin-subscriptions-ui.test.cjs
tests/contracts/admin-workspace-renderers.test.cjs
tests/contracts/item-type-operations-ui.test.cjs
tests/contracts/market-delivery-fulfillment.test.cjs
tests/contracts/market-partial-return-refund.test.cjs
tests/contracts/market-pickup-fulfillment.test.cjs
tests/contracts/subscriptions-catalog-presentation.test.cjs
tests/contracts/subscriptions-profiles-ui.test.cjs
tests/contracts/subscriptions-responsive-accessibility.test.cjs
tests/contracts/subscriptions-workspace-ui.test.cjs
docs/contracts/equipment/equipment_bodymap_view_contract.md
docs/PATCH_STATE.md
docs/FILE_MAP.md
PATCH_STATE.md
FILE_MAP.md
project.md
```

The non-Equipment contract tests change only their expected shared `js/modules.js` cache-bust version.

## Added files

```text
docs/patchnotes/patch_notes_equipment_bodymap_avif_paths_1.0x.md
```

## Runtime changes

```text
FRONT: assets/bodymap/bodymap_front.avif
BACK:  assets/bodymap/bodymap_back.avif
```

The existing calibrated geometry remains `949 x 1658`. No anchor coordinates, region definitions, mounted dual-view behavior, selection fast path or decode warmup behavior changed.

## Asset ownership

The AVIF files already exist in the supplied full project ZIP and are not duplicated in this replacement patch. Uploaded JPG anchor references remain design/calibration inputs for the future Cyberware anatomy Bodymap and are not used by Equipment runtime.

## Validation

- exact canonical path contract;
- both AVIF files exist and are non-empty;
- retired root-level Equipment JPG paths are absent;
- JavaScript syntax check;
- active Node unit/contract/data-I/O harness: `349 / 349 PASS`;
- full unfiltered harness: `350 / 354 PASS`, with four known failures from the manifest-retired `item-type-effect-resolution.test.cjs`.

## Risks / browser check

- confirm AVIF decode in the target browser;
- confirm Front/Back switch preserves panel identity and calibrated anchor alignment;
- confirm no stale browser cache serves the retired JPG paths.
