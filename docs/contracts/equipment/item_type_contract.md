# Item Type Contract

## Ownership

```text
Catalog definition owns:
  category
  subtype
  itemType
  itemTypeProfile
  type capabilities

ItemInstance owns:
  itemState
  quantity
  durability
  current owner
  current location
  playerLabel
```

`category` is a storefront and filtering group. `subtype` identifies the product variant. `itemType` is the canonical functional behavior family.

Example:

```text
category: WEAPON
itemType: FIREARM
subtype: SIDEARM
```

## Registry

Canonical files:

```text
data/item-type-catalog.js
js/item-type-registry.js
```

Registered foundation types:

```text
GENERIC_ITEM
CREDENTIAL
WALLET
FIREARM
MELEE_WEAPON
GRENADE
MAGAZINE
AMMUNITION
CONTAINER
MEDICAL_ITEM
TOOL
SURVIVAL_GEAR
ARMOR
CLOTHING
ACCESSORY
DEVICE
CYBERWARE
CONSUMABLE
```

Each type definition may declare:

```text
family
capabilities
category/subtype/tag inference aliases
profileFields
stateFields
```

## Definition profile

`itemTypeProfile` contains immutable model-level compatibility and capacity data.

Examples:

```js
{
  itemType: "FIREARM",
  itemTypeProfile: {
    weaponClass: "SIDEARM",
    magazineType: "COMPACT_PISTOL",
    ammunitionType: "PISTOL_STANDARD",
    fireModes: ["SINGLE"],
    chamberCapacity: 1,
    handsRequired: 1
  }
}
```

```js
{
  itemType: "MAGAZINE",
  itemTypeProfile: {
    magazineType: "COMPACT_PISTOL",
    ammunitionType: "PISTOL_STANDARD",
    capacity: 12
  }
}
```

## Instance state

`itemState` is canonical per-instance state:

```js
{
  schemaVersion: 1,
  typeId: "MAGAZINE",
  data: {
    ammunitionDefinitionId: "eqcat-standard-pistol-rounds",
    roundsCurrent: 7
  }
}
```

It must not duplicate owner, location, durability or catalog identity.

A loaded or attached physical item continues to use canonical ItemInstance location. Magazine insertion uses:

```js
location: {
  type: "INSTALLED_IN_ITEM",
  parentItemInstanceId: "firearm-instance-id",
  moduleSlotId: "MAGAZINE_WELL"
}
```

No second magazine reference is stored on the firearm.

## Public API

```text
getItemTypeDefinition
getItemTypeDefinitions
resolveItemTypeId
normalizeItemTypeProfile
normalizeItemTypeState
validateItemTypeState
getItemTypeCapabilities
itemHasCapability
getItemTypeStateSummary
updateItemTypeState
```

`updateItemTypeState()` is the only generic instance-state mutation command introduced by the foundation. It validates ownership, normalizes state and commits through ItemInstance Store.

## Item type operations

Canonical command owner:

```text
js/item-type-operations.js
```

Every mutating command uses `commitItemInstanceTransaction()` with an explicit `idempotencyKey`. Multi-item operations are atomic and never create a second magazine/ammunition/firearm store.

Public API:

```text
getInstalledMagazine
getItemTypeOperationAvailability
loadMagazine
unloadMagazine
insertFirearmMagazine
removeFirearmMagazine
chamberFirearmRound
clearFirearmChamber
setFirearmSafety
setFirearmFireMode
armGrenade
disarmGrenade
useConsumable
```

### Magazine and ammunition

Loaded rounds are stored in `MAGAZINE.itemState`. Ammunition stacks remain physical `ItemInstance` records. Loading decrements or removes an ammunition stack atomically. Unloading requires an existing compatible ammunition stack or an explicit new `instanceId` and creates/updates that physical stack in the same transaction.

### Firearm magazine well

A detachable magazine is represented only by its canonical location:

```js
location: {
  type: "INSTALLED_IN_ITEM",
  parentItemInstanceId: "firearm-instance-id",
  moduleSlotId: "MAGAZINE_WELL"
}
```

The firearm `itemState` never stores `magazineInstanceId`. Chambering atomically decrements the installed magazine and increments the firearm chamber state. Clearing the chamber returns rounds to the installed magazine by default; explicit discard is available for a future world-drop resolver.

### Grenades

Arming/disarming updates only `armed`, `triggerMode` and `fuseSeconds`. No timer, detonation, blast, damage or effect resolution starts in this patch.

### Consumables

`useConsumable()` changes only physical `ItemInstance.quantity` (or removes the exhausted instance) through the ItemInstance transaction boundary.

The committed transaction metadata stores the tabletop usage record:

```text
campaignDay
citizenId
instanceId
definitionId
itemName
quantityUsed
remainingQuantity
itemRemoved
usageSource
```

The daily usage log is derived from committed `CONSUMABLE_USE` ItemInstance transactions through:

```text
getConsumableUsageLog()
getConsumableUsageByDay()
```

No effect resolver, Citizen status, duration, stack, timer, health mutation or automatic gameplay consequence is created. Rules consequences remain at the table.

### Event

A new committed command emits one event:

```text
ws:item-type-operation-committed
```

Idempotent replay does not emit a duplicate event.

## Item Type Operations UI

Canonical renderer:

```text
js/item-type-operations-ui.js
```

The renderer is a read projection over ItemInstance and Item Type Operations. It owns no persistence and does not write `itemState` or `location` directly. Delegated forms in `js/equipment-actions.js` call the public commands from `js/item-type-operations.js`, generate an explicit idempotency key and rerender the current Inspector after the command result.

Supported Inspector controls:

```text
FIREARM
  insert/remove magazine
  chamber/clear chamber
  explicit discard chamber
  safety
  fire mode

MAGAZINE
  load from compatible physical ammunition stack
  unload to a compatible or new physical ammunition stack

GRENADE
  trigger mode
  fuse configuration
  arm/disarm

CONSUMABLE
  quantity use
  remaining quantity
  daily Campaign Time usage-log projection
```

The UI must present operation state and command feedback without creating a second state owner. A magazine installed in a firearm remains a normal ItemInstance whose canonical location is `INSTALLED_IN_ITEM`; Equipment projection must treat this location as valid and carried, not `ORPHAN`.

The controls do not expose attack, firing, blast, damage or detonation. Grenade arming changes configuration state only. Consumable use reports the committed quantity change and transaction-backed daily usage record. It does not resolve an effect, create a Citizen status or apply an automatic gameplay consequence.

## Current scope boundary

Implemented:

```text
type registry
legacy inference
catalog profiles
per-instance normalized itemState
owner-checked state mutation
Inspector technical projection
sample grenade, magazine and ammunition definitions
atomic magazine load/unload and firearm magazine-well placement
chamber, safety and fire-mode state commands
grenade arm/disarm state commands
consumable quantity use through the ItemInstance transaction boundary
transaction-backed daily consumable usage log keyed by Campaign Time day
legacy consumable effect/status storage cleanup
```

Not implemented:

```text
combat resolution
damage formulas
blast areas
combat firing and attack resolution
arming timers and detonation
wallet ledger or digital balance
ballistics
```

Credits and debt remain owned by Billing. A wallet can store physical credentials or tokens, but it does not become a second monetary ledger.
