# Housing Household UI Consolidation Contract 5.1x

## Scope

This contract consolidates the Citizen-facing Housing navigation and interaction surface without changing Housing, Rent, Market or ItemInstance domain ownership.

Canonical primary sections:

```text
OVERVIEW
HOUSEHOLD
STORAGE
DELIVERIES
```

Legacy section requests normalize as follows:

```text
UNIT       -> OVERVIEW
HISTORY    -> OVERVIEW
COLLECTION -> STORAGE
```

The consolidation is presentation and transient UI state only. It does not introduce another Housing, inventory, collection or persistence store.

## Navigation boundaries

A Housing workspace context identifier is not an action.

```text
data-household-record-id
  identifies the Household workspace context

data-housing-open-storage-record
  explicitly requests navigation to a Housing Storage record
```

The Housing shell may change to Storage only after a direct action carrying `data-housing-open-storage-record`. Clicking a floor cell, inactive cell, room background, furnishing or Household panel does not implicitly change the active section.

## Consolidated sections

### Overview

Overview owns the composition of:

- Household Hub summary and World Feed;
- Housing Unit and Rent projection;
- recent canonical Housing/ItemInstance history.

Unit and History remain renderer helpers, not top-level tabs.

### Household

Household owns:

- irregular floor-plan rendering;
- furnishing selection and placement;
- furnishing lifecycle actions;
- display surfaces and display-slot projection.

Collection records remain physical ItemInstances. Household displays only the placement/display side of collection functionality.

### Storage

Storage owns:

- physical Housing storage grids;
- open container grids;
- Item Index drawer;
- Item Inspector;
- collection/important/security/archive filters.

Collection metadata remains on `ItemInstance.instanceData.householdHub`. Collection does not become a separate storage domain.

### Deliveries

Deliveries remains the read-only Housing projection over canonical Market shipment/order state. Market remains a separate global module.

## Item Index

The Item Index is a transient drawer over canonical ItemInstance and Household projections.

It does not persist an index or duplicate item records.

Sections:

```text
HOUSEHOLD
STORAGE
CONTAINER
TRANSFER
```

Supported facets:

```text
ALL
FURNISHING
CYBERWARE
CONSUMABLE
COLLECTIBLE
IMPORTANT
SECURE
ARCHIVE
```

`LOCATE` resolves the physical location and then:

- selects the correct Housing Unit;
- switches to Household for `HOUSING_ROOM` items;
- switches to Storage for `HOUSING_STORAGE` items;
- selects and opens the parent container for nested items;
- selects the same canonical ItemInstance;
- scrolls and highlights the located UI node after render.

Item Index open/closed state is transient under `window.WS_APP` and is not written to localStorage or Campaign Data I/O.

## Action language

Repeated row actions use concise operation labels. The target name remains in the row, selector or inspector content.

Canonical compact verbs include:

```text
OPEN
SELECT
LOCATE
MOVE
INSTALL
REMOVE
REPLACE
REPAIR
RETURN
DISPLAY
DISPOSE
APPROVE
CANCEL
```

A full-width action is reserved for a single primary empty-state or workflow command. Repeated list actions remain intrinsic-width inline controls.

## Scroll surfaces

Shared scrollbar appearance ownership belongs exclusively to eager `css/ui-controls.css`.

Canonical opt-in:

```text
.system-scroll-surface
[data-system-scroll]
```

Housing applies `system-scroll-surface` / `data-system-scroll` as semantic scroll-surface markers to floor plans, storage grids, container grids, furnishing libraries and the Item Index. Housing and shared module CSS may own overflow/layout only and must not define browser-specific scrollbar appearance.

## Runtime loading

Housing remains one lazy bundle with:

```text
css/housing.css
js/housing-storage-runtime.js
js/housing-household-runtime.js
data/housing-household-hub.js
js/housing-household-hub.js
js/housing.js
```

Global Market continues to load its own workspace runtime and does not load the Household UI runtime.

## Out of scope

- Housing, Rent, Market or ItemInstance schema changes;
- new persistence keys or campaign snapshot domains;
- changes to furnishing wear, repair, disposal or relocation rules;
- changes to delivery fulfillment;
- collection award generation;
- visual redesign outside Housing/shared scrollbar ownership;
- browser-specific drag/drop behavior changes.
