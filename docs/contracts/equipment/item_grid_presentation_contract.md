# Item Grid Presentation Contract

## Scope

Visible item tiles rendered inside physical grids.

Covered surfaces:

- Equipment container grids / CyberGrid;
- Housing physical storage grids;
- stored-container grids opened from Housing;
- drag previews cloned from those tiles.

## Visible fields

Each item tile renders exactly two pieces of information:

```text
NAME
WIDTH×HEIGHT
```

Name resolution:

```text
playerLabel
→ displayName
→ catalog/model name
→ instance id fallback
```

`playerLabel` changes presentation only. It does not replace catalog identity.

Size uses the effective grid footprint after rotation:

```text
footprint.width × footprint.height
```

## Excluded from grid tiles

The tile must not render:

- category;
- subtype;
- functional item type;
- rotation angle;
- grid column or row;
- mount state;
- condition;
- quantity;
- manufacturer or model subtitle.

Those fields remain available in Item Inspector, tooltips or placement metadata.

## Data ownership

The contract is presentation-only. It does not mutate `ItemInstance`, Equipment placement, Housing placement, footprint, rotation or container occupancy.
