# Cyberware Anatomy Bodymap Contract — 16.0x

## Scope

The standalone Cyberware module owns an asset-driven, hierarchical anatomy view. The Bodymap is a read-only projection over canonical `ItemInstance` records installed in `BODY`; it does not own physical state, occupancy persistence, installation, removal or service execution.

## Hierarchy

```text
BODYMAP
├─ HEAD
│  ├─ NEURAL
│  ├─ LEFT EYE
│  └─ RIGHT EYE
├─ TORSO
├─ LEFT ARM
│  └─ LEFT HAND
├─ RIGHT ARM
│  └─ RIGHT HAND
├─ LEFT LEG
└─ RIGHT LEG
```

The player may navigate by anchors, breadcrumb or direct region index. `BODYMAP`, `HEAD` and `TORSO` own independent `FRONT/BACK` orientation state. Detail-only regions use their single canonical view.

## Assets

Runtime views use clean AVIF masters in `assets/bodymap/`:

```text
bodymap_front.avif / bodymap_back.avif
head_front.avif / head_back.avif
brain.avif
eye_left.avif / eye_right.avif
torso_front.avif / torso_back.avif
arm_left.avif / arm_right.avif
hand_left.avif / hand_right.avif
legl_left.avif / leg_r.avif
```

Files ending in `_anchor.avif` are calibration references only. They are never rendered by the application. Paths are declared once in `data/cyberware-bodymap-layouts.js`; renderers do not construct or guess file names and do not fall back between orientations.

## Anchor ownership

Cyberware owns separate anchor definitions, coordinates, slot mappings and delegated actions. Equipment and Cyberware do not share anchor IDs or layout data.

They share only the visual language:

```text
point geometry
leader line
label card
hover/focus
selected
occupied
warning
blocked
stack counter
```

The Cyberware renderer may reuse the Equipment point presentation class and shared CSS variables, but it must not import Equipment anchor definitions, occupancy state or event handlers.

## Calibration

Anchor reference graphics are advisory. Final percentage coordinates are normalized in `data/cyberware-bodymap-layouts.js` against each clean runtime asset.

Calibration requirements:

- continuity groups identify corresponding parent/child anatomy transitions;
- positions may differ across assets but must preserve the same anatomical meaning;
- labels may move away from dense areas while leader lines retain the anatomical target;
- left/right and front/back coordinates are calibrated independently;
- no runtime view may use an `_anchor.avif` file;
- overlapping ItemInstances resolve through one stack anchor rather than overlapping controls.

## State

Per-Citizen UI state is transient and belongs to the standalone Cyberware workspace:

```js
{
  bodymapRegion: "BODY",
  bodymapOrientationByRegion: {
    BODY: "FRONT",
    HEAD: "FRONT",
    TORSO: "FRONT"
  },
  selectedAnchorId: "",
  selectedInstanceId: ""
}
```

This state is not written to Citizen records, Campaign Snapshot, `ItemInstance`, `citizen.cyberwareList` or a new Bodymap store.

## Occupancy projection

```text
ItemInstance.location.type = BODY
→ Cyberware Runtime installed projection
→ normalized/expanded body slot footprint
→ anatomy layout slotIds
→ anchor state and ItemInstance stack
```

A single ItemInstance may light multiple anchors. It remains one record and one Inspector target. Items with no matching layout remain visible under `UNMAPPED SYSTEMS` and are never silently omitted.

## Selection and routing

- anchor with one ItemInstance selects that instance;
- anchor with multiple ItemInstances opens a local stack;
- navigation anchor opens its child region;
- Installed Systems or Inspector `LOCATE ON BODYMAP` resolves the deepest mapped region and orientation;
- selection is shared with the existing Cyberware Instance Inspector and Operations context;
- Bodymap actions do not commit install, remove, replace or maintenance operations.

Public UI entry points:

```text
openCyberwareBodymapView()
setCyberwareBodymapOrientation()
selectCyberwareBodymapAnchor()
openCyberwareBodymapForInstance()
getCyberwareBodymapState()
validateCyberwareBodymapLayouts()
```

## Performance invariants

- CSS owns hover/focus; pointer movement triggers no render;
- region/orientation/anchor changes update only the Bodymap workspace and linked Inspector/context;
- no CyberGrid or Equipment workspace refresh is allowed;
- status-only World Bridge updates do not rebuild anatomy unless the physical or relevant runtime projection changed;
- no alternate `ItemInstance` or occupancy store may be introduced.

## Validation

The layout validator checks:

- unique region/view/anchor IDs;
- valid parent and navigation targets;
- coordinates in the `0–100` range;
- known Cyberware slot IDs when runtime definitions are available;
- runtime asset paths and prohibition of `_anchor` references;
- incomplete continuity groups as warnings.
