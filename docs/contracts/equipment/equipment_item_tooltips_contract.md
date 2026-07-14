# Equipment Item Tooltips Contract

## Status

```text
installed: Equipment Item Tooltips 1.3.0x
```

## Ownership

```text
js/equipment-items-panel.js
  canonical read-only tooltip models and shared tooltip attributes

js/equipment-actions.js
  one delegated tooltip controller and one body-level tooltip portal

js/equipment-body-regions-panel.js
js/equipment-bodymap-panel.js
js/equipment-containers-panel.js
  tooltip targets only; no alternate EquipmentState projection

css/equipment.css
  compact terminal tooltip presentation
```

Tooltips are a read-only projection over canonical EquipmentState, ItemInstance and Inspector formatters. They do not own location, condition, placement, capacity or compatibility.

## Item projection

An item tooltip contains a title and at most three information lines:

```text
CATEGORY / SUBTYPE · FOOTPRINT
CONDITION CLASS · PERCENT
LOCATION OR CONTAINER CAPACITY
```

The projection reuses the same condition, footprint, rotation, location and container-capacity formatters as Item Inspector. Invalid or orphan items use warning tone.

## Region and slot projection

Body regions expose compact occupancy and slot-family information. Empty, blocked and reserved slots may receive `tabindex="0"` solely for keyboard tooltip access.

Visible slot labels remain local to their current region:

```text
WRIST
FOREARM
MOUNT
CONTAINER
PORT
```

Tooltip titles may retain the full anatomical target label to disambiguate the target.

## Runtime invariant

The UI owns one tooltip portal and uses delegated listeners on the Equipment root.

```text
show delay: 300 ms
pointer hover and keyboard focus supported
Escape, click, change, scroll and workspace replacement dismiss the tooltip
active grid drag suppresses the tooltip
aria-describedby exists only while the target owns the visible tooltip
pointermove may reposition the visible portal
pointermove must not rebuild EquipmentState or rerender Equipment panels
```

## Forbidden scope

Tooltips must not contain buttons, selectors, descriptions, technical IDs or state-changing actions. They must not introduce a second formatter stack or an alternate item/location projection.

## Regression gate

```text
tests/contracts/equipment-item-tooltips.test.cjs
```
