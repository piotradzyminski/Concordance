# Housing Household Hub Contract 5.0x

## Scope

This contract turns Housing into a Citizen-facing household hub without creating another world-state, weather, collection, notification or inventory store.

The hub adds read/projection workspaces for:

```text
OVERVIEW
COLLECTION
HISTORY
```

Existing Housing workspaces remain:

```text
UNIT
HOUSEHOLD
STORAGE
DELIVERIES
```

Market remains a separate global module.

## State ownership

```text
Campaign Time
  canonical current world time

Terminal Entry Store
  canonical Citizen messages and alerts

ItemInstance Store
  collectibles, mementos, important-item metadata
  display placement
  secure/archive container placement

Housing / Household
  active unit, storage, furniture and display hosts

Housing Household Hub
  read projections and ItemInstance commands only
```

`data/housing-household-hub.js` is a read-only registry for presentation categories, deterministic global weather profiles and ambient world-feed entries. It is not a persistence owner.

## Global weather

There is one weather state for the world/campaign, not one state per Citizen.

Weather is derived deterministically from canonical Campaign Time:

```text
campaign date + six-hour period
→ stable weather profile
```

The same Campaign Time produces the same current weather and forecast for every Citizen. Housing does not persist weather, reroll it per render or create a second clock.

Public projection:

```text
getGlobalHousingWeather()
```

## World Feed

The Household Overview projects one feed from:

```text
global weather
+ relevant unread/important Terminal entries
+ read-only ambient world entries
```

The Hub does not copy Terminal entries, mark them read or own notification lifecycle. Opening Terminal delegates to the global Terminal module.

## Collections and important items

A collectible or important object remains the same canonical `ItemInstance`.

Hub metadata is stored on that instance:

```js
instanceData: {
  householdHub: {
    collection,
    important,
    category,
    note,
    provenance,
    displayedAt,
    lastDisplayedAt,
    updatedAt
  }
}
```

Supported presentation categories include:

```text
COLLECTIBLE
MEMENTO
TROPHY
DOCUMENT
MEDIA
DISPLAY_ITEM
```

Metadata never changes catalog identity, ownership or physical location by itself.

## Display furniture and slots

A display host is a placed Housing furnishing with either:

- a direct `householdDisplayProfile`; or
- an installed `DISPLAY` module such as Display Rail.

Display slots are bounded and use stable IDs:

```text
display-item-1
display-item-2
...
```

Displaying an object moves the same ItemInstance:

```text
HOUSING_STORAGE
→ INSTALLED_IN_ITEM
```

Canonical display location:

```js
location: {
  type: "INSTALLED_IN_ITEM",
  parentItemInstanceId,
  moduleSlotId,
  mountRole: "DISPLAY",
  housingRecordId
}
```

Removing an object from display finds real free space in Housing Storage using its actual footprint and moves the same ItemInstance back. There is no display-only copy and no micro-grid for small objects.

## Secure and archival storage

Secure/archive behavior is represented by real container ItemInstances and canonical container tags:

```text
SECURE_STORAGE
ARCHIVAL_STORAGE
HIDDEN_STORAGE
```

The Collection projection derives protection from the actual parent container. A badge does not grant protection by itself.

## Decorations

Decorative furnishings may be placed through the existing Household grid. Decorations can provide visual identity and ambient presentation, but they do not grant synthetic comfort, rest or recovery points.

## History

Housing History is a read-only projection over:

- canonical Housing/ItemInstance transaction receipts;
- Housing relocation history.

The Hub does not create a second history log.

## Public API

```text
getHousingHouseholdHubOverview()
getGlobalHousingWeather()
getHousingWorldFeed()
getHousingHouseholdHistory()
getHousingCollectionItems()
getHousingDisplayHosts()
getHousingDisplayCandidates()
updateHousingCollectionMetadata()
setHousingItemImportant()
displayHousingCollectionItem()
removeHousingCollectionDisplay()
validateHousingHouseholdHub()
```

Physical mutations use `commitItemInstanceTransaction()`.

## Runtime loading

The Household Hub is lazy and belongs only to the Housing module bundle:

```text
data/housing-household-hub.js
js/housing-household-hub.js
```

Market does not load the Hub runtime. `index.html` does not eagerly register a second Housing state owner.

## Relocation

Displayed items follow canonical ItemInstance parent/ownership rules:

- a displayed item attached to Citizen-owned display furniture remains attached to that parent during relocation;
- a Citizen-owned displayed item attached to an operator asset is detached and moved through the existing operator-module relocation path;
- no display item is cloned or silently destroyed.

## Out of scope

- per-Citizen weather;
- weather survival mechanics;
- decorative numerical bonuses;
- collectible award generation from Cases, Service or quests;
- canonical lore content for collectibles;
- Market ownership or storefront embedding;
- consumable effects;
- Rest/Sleep consequence resolution;
- a separate household activity store.
