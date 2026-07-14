# ItemInstance Foundation Contract — 6.2x

## Status

```text
CANONICAL
```

This document defines the physical item state architecture introduced by `patch_item_instance_foundation_6.1x.zip` and the canonical transaction/compensation boundary added by `patch_item_instance_transaction_compensation_6.2x.zip`.

## Canonical ownership

Every physical object is represented by exactly one record in:

```text
window.WS_APP.state.itemInstances
```

The store is indexed by `instanceId`.

```js
window.WS_APP.state.itemInstances[instanceId]
```

Citizen records do not own canonical item arrays.

Forbidden as canonical state:

```text
citizen.equipment.items
citizen.cyberwareList
citizen.cyberware
```

`citizen.equipment` may contain Equipment configuration only.

## Entity split

```text
ItemDefinition
= catalog/static model data

ItemInstance
= one physical copy

Item view
= transient compatibility projection for current renderers
```

Cyberware is identified through its definition/category. Installation does not move the record to another store.

```text
CYBERWARE
= ItemDefinition category

INSTALLED
= ItemInstance lifecycle state

BODY
= ItemInstance location
```

## Canonical ItemInstance shape

```js
{
  instanceId: "item-id",
  definitionId: "catalog-definition-id",
  schemaVersion: 1,
  ownerId: "citizen-id",
  playerLabel: "Old Faithful",
  quantity: 1,

  lifecycleState: "UNPACKAGED",
  location: {
    type: "CONTAINER_GRID"
  },

  durability: {
    current: 100,
    maximumOverride: null
  },

  hardwareIdentity: null,
  packaging: null,
  cyberwareState: null,
  authorizationRefs: null,
  flags: {},
  acquisition: null,
  serviceHistory: [],
  instanceData: {}
}
```

`playerLabel` is an optional user-authored label for one physical copy. It never replaces `definitionId` or the catalog model name. Empty `playerLabel` means that every UI projection falls back to the catalog name.

`instanceData` is a transitional per-instance compatibility payload for current Equipment/Cyberware renderers. It contains mutable copy fields and may retain a static definition snapshot when the corresponding lazy cyberware catalog is not loaded yet. `definitionId` remains the canonical model reference; future catalog normalization should reduce the snapshot instead of creating another instance store.

## Location types

```text
EQUIPPED
CONTAINER_GRID
HOUSING_STORAGE
BODY
INSTALLED_IN_ITEM
SERVICE
VENDOR
UNPLACED
DESTROYED
```

### Required location fields

```text
BODY
- characterId
- bodySlots[]

EQUIPPED
- characterId
- equippedLocation

CONTAINER_GRID
- containerInstanceId
- gridX
- gridY
- rotation

HOUSING_STORAGE
- storageUnitId
- gridX
- gridY
- rotation

INSTALLED_IN_ITEM
- parentItemInstanceId
- moduleSlotId

SERVICE
- characterId
- optional serviceId
```

## Lifecycle states

```text
PACKAGED
UNPACKAGED
INSTALLED
REMOVED
IN_SERVICE
STORED
DISPOSED
```

Hard normalization rules:

```text
location BODY or INSTALLED_IN_ITEM
=> lifecycleState INSTALLED

location SERVICE
=> lifecycleState IN_SERVICE

location DESTROYED
=> lifecycleState DISPOSED
```

## Store APIs

Canonical reads:

```text
getItemInstances
getItemInstanceById
getCitizenItemInstances
getCitizenEquipmentItemInstances
getInstalledCyberwareInstances
```

Current renderer projections:

```text
getItemInstanceView
getCitizenItemInstanceViews
getCitizenEquipmentItemInstanceViews
getInstalledCyberwareInstanceViews
```

## Item view cache and read boundary

Canonical record getters remain defensive and return clones. Renderer projection getters use canonical records internally and return cloned views from `getItemInstanceView()`.

Required path:

```text
itemInstancesById canonical record
-> getItemInstanceView(canonical record)
-> revision-aware cached view
-> defensive clone returned to caller
```

Forbidden path:

```text
getCitizenEquipmentItemInstances() clone list
-> map(getItemInstanceView)
```

Passing list clones into `getItemInstanceView()` disables object-identity cache ownership and causes every Equipment or Cyberware state build to reconstruct catalog-backed fields. The canonical list projections therefore filter `itemInstancesById` internally without exposing those records.

Cache invalidation:

```text
ItemInstance Store revision change -> clear view cache and schedule warmup
Equipment Catalog revision change -> clear cache on the next view read
```

After store initialization or mutation, view warmup runs in bounded idle slices. The fallback scheduler processes one ItemInstance per task so cache preparation does not become another long main-thread task. Warmup never mutates ItemInstance, EquipmentState or Citizen records.

Canonical writes:

```text
createItemInstance
updateItemInstance
renameItemInstance
updateItemInstanceFromView
updateItemInstancesFromViews
replaceCitizenItemInstances
replaceCitizenInstalledCyberware
removeItemInstance
```

Import/export/reset:

```text
exportItemInstances
importItemInstances
resetItemInstanceStore
initItemInstanceStore
```

## Replacement scopes

`replaceCitizenItemInstances` supports:

```text
EQUIPMENT
= EQUIPPED, CONTAINER_GRID, HOUSING_STORAGE, UNPLACED

BODY
= BODY only

NON_BODY
= every owned location except BODY

ALL
= every owned ItemInstance
```

`EQUIPMENT` is used by CyberGrid/Equipment commits so that Equipment rendering cannot delete implants in the body or items held in service.

`NON_BODY` is reserved for administrative cleanup.

## Mutation invariants

Installation:

```text
same instanceId
CONTAINER_GRID / HOUSING_STORAGE / UNPLACED
-> BODY
lifecycleState -> INSTALLED
```

Deinstallation:

```text
same instanceId
BODY
-> SERVICE
lifecycleState -> IN_SERVICE
```

Replacement:

```text
old instance: BODY -> SERVICE
new instance: equipment location -> BODY or SERVICE
single atomic updateItemInstancesFromViews commit
```

No operation may clone a physical item or create a parallel installed-cyberware record.

## Player-label invariant

```text
ItemDefinition.name = immutable catalog/model identity
ItemInstance.playerLabel = optional label for one physical copy
Item view.catalogName = catalog/model identity
Item view.displayName = playerLabel || catalogName
```

`renameItemInstance(citizenId, instanceId, playerLabel)` is the canonical command. It verifies ownership, normalizes whitespace, removes control characters, limits the label to 64 characters and persists the same `ItemInstance`. Clearing the label restores catalog-name presentation without changing any definition, statistic, location, authorization or runtime state.


## Transaction and compensation boundary

Canonical physical operations spanning one or more records use:

```text
js/item-instance-transaction-store.js
```

Public transaction commands:

```text
commitItemInstanceTransaction
compensateItemInstanceTransaction
commitItemInstanceServiceCustody
commitItemInstanceBodyPlacement
commitItemInstanceReplacement
commitItemInstanceMarketReturn
commitItemInstanceServiceResult
```

The transaction layer records before/after snapshots and idempotency receipts, but does not own a second item collection. Canonical mutation remains inside `js/item-instance-store.js`.

Full contract:

```text
docs/contracts/core/item_instance_transaction_contract.md
```

## Renderer compatibility boundary

Existing Equipment/CyberGrid renderers currently consume transient item views exposing fields such as:

```text
id
location string
containerHostId
containerPlacement
storageUnitId
housingPlacement
equippedLocation
condition
```

These fields are generated from the canonical ItemInstance. They are not stored in Citizen and are not a second source of truth.

All writes from current renderers must return through ItemInstance store APIs.

## Validation

`validateItemInstances()` verifies at minimum:

```text
INVALID_INSTANCE_RECORD
INSTANCE_ID_REQUIRED
DUPLICATE_INSTANCE_ID
DEFINITION_REFERENCE_REQUIRED
OWNER_REQUIRED
INVALID_LIFECYCLE_STATE
INVALID_LOCATION_TYPE
BODY_CHARACTER_REQUIRED
BODY_SLOTS_REQUIRED
BODY_LIFECYCLE_MISMATCH
EQUIPPED_CHARACTER_REQUIRED
CONTAINER_INSTANCE_REQUIRED
CONTAINER_COORDINATES_REQUIRED
STORAGE_UNIT_REQUIRED
HOUSING_COORDINATES_REQUIRED
PARENT_ITEM_INSTANCE_REQUIRED
MODULE_SLOT_REQUIRED
INSTALLED_IN_ITEM_LIFECYCLE_MISMATCH
SERVICE_LIFECYCLE_MISMATCH
DESTROYED_LIFECYCLE_MISMATCH
```

A commit is rejected when blocking validation errors exist.

## Persistence

Canonical local persistence key:

```text
ws_app_item_instances_v1
```

Seed source:

```text
data/item-instances.js
window.APP_DATA.itemInstances
```

Campaign exports use schema version 3 and include:

```text
data.itemInstances
```

## Explicit exclusions

Foundation 6.1x does not define:

- final operational-state resolver;
- subscription-expiry shutdown logic;
- license lifecycle;
- activation-token service;
- firmware release campaigns;
- maintenance return placement;
- new Cyberware planner UI;
- final module/firmware entity stores;
- condition threshold gameplay effects.

These features must consume ItemInstance APIs rather than introduce additional physical-item stores.


## Functional item state

ItemInstance may contain a normalized per-instance functional state:

```js
itemState: {
  schemaVersion: 1,
  typeId: "MAGAZINE",
  data: { roundsCurrent: 7 }
}
```

`itemState` is validated by Item Type Registry and must not duplicate owner, location, durability, catalog identity or Billing state. Generic changes route through `updateItemTypeState()` and commit through ItemInstance Store.
