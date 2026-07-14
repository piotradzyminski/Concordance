# Housing Household Furnishing Workspace Contract

## Status

```text
scope: Housing / Household
version: 2.1x
phase: pre-alpha
runtime owner: js/housing-household-runtime.js
state owner: ItemInstance + Citizen Housing record
```

## Purpose

The furnishing workspace makes the Household floor plan interactive without introducing another item inventory, furniture store or persistence key.

A physical furnishing remains one canonical `ItemInstance` and changes only its location:

```text
HOUSING_STORAGE
  -> HOUSING_ROOM
  -> HOUSING_ROOM
  -> HOUSING_STORAGE
```

## Ownership

| Responsibility | Owner |
|---|---|
| floor plan and room definitions | Citizen Housing record projected by `js/household-store.js` |
| physical furnishing identity | ItemInstance Store |
| placement validation | `validateHouseholdPlacement()` |
| placement commit | `placeHouseholdItem()` through ItemInstance Transaction Store |
| return commit | `returnHouseholdItemToStorage()` through ItemInstance Transaction Store |
| transient selection, rotation, search and preview | `js/housing-household-runtime.js` |
| player UI | `js/housing-household-runtime.js` + `css/housing.css` |

The transient workspace state is not campaign data and must not use `localStorage` or `sessionStorage`.

## Furnishing query

`getHouseholdFurnishingItems(citizenId, housingRecordId)` returns only placeable ItemInstances that are:

```text
stored in a storage unit owned by the selected Housing record
or
placed in a HOUSING_ROOM owned by the selected Housing record
```

Each row contains:

```js
{
  instance,
  profile,
  scope: "STORAGE" | "PLACED",
  housingRecordId,
  roomId,
  storageUnitId
}
```

Foreign Housing storage and foreign Household placements are excluded.

## Workspace interaction

The player can:

```text
select a furnishing from Housing Storage
select an already placed furnishing
rotate the selected footprint between 0 and 90 degrees
hover a room cell to preview the full footprint
see valid or blocked preview state
commit placement by clicking a valid cell
move an existing furnishing by selecting it and committing a new cell
return an existing furnishing to a selected Housing Storage unit
filter the furnishing library by name, definition, type or tag
```

The workspace does not execute recovery or consumable operations.

## Preview contract

Pointer preview is read-only and calls:

```js
validateHouseholdPlacement({
  citizenId,
  housingRecordId,
  roomId,
  instanceId,
  gridX,
  gridY,
  rotation
})
```

The preview must represent the full rotated footprint and expose at least:

```text
valid placement
collision
outside room
blocked room type
missing item or room
```

Pointer movement must not perform a write, persistence operation or full Housing rerender.

## Commit contract

Placement uses:

```js
placeHouseholdItem({
  citizenId,
  housingRecordId,
  roomId,
  instanceId,
  gridX,
  gridY,
  rotation,
  idempotencyKey
})
```

Return uses:

```js
returnHouseholdItemToStorage({
  citizenId,
  instanceId,
  storageUnitId,
  idempotencyKey
})
```

The workspace must not mutate ItemInstance records directly.

## Furniture definitions

The canonical item type is:

```text
HOUSEHOLD_FURNISHING
```

A definition remains placeable when its `householdProfile.placeable` is true or its normalized tags/type declare a supported furnishing role.

Example:

```js
{
  itemType: "HOUSEHOLD_FURNISHING",
  footprint: "2x3",
  tags: ["FURNITURE", "HOUSEHOLD_PLACEABLE"],
  householdProfile: {
    placeable: true,
    footprint: "2x3",
    capabilities: ["REST", "SLEEP"],
    allowedRoomTypes: ["MULTIPURPOSE", "LIVING", "SLEEPING", "SAFE_ROOM"]
  }
}
```

Definition metadata describes footprint, room compatibility and capabilities. Current placement remains owned by ItemInstance.

## Fixture data

Citizen B contains a pre-alpha furnishing staging storage and deterministic furnishing ItemInstances for immediate browser verification.

Fixture data may be reset or replaced before beta and does not create compatibility obligations.

## Events

Successful physical commits continue to emit:

```text
ws:household-layout-updated
```

The Housing shell may rerender the active Household workspace in response. Preview-only interactions emit no domain event.

## Out of scope

```text
recovery execution
sleep time progression
Citizen status mutation
consumable selection and dosage
drug tolerance, addiction and overdose
furniture installation Service orders
Market furnishing offers and delivery placement
room editing and floor-plan authoring
freeform drag-and-drop pointer sessions
```
