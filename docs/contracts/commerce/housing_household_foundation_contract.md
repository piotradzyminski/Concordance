# Housing — Household Foundation Contract

## Status

```text
PATCH: patch_housing_household_foundation_2.0x
SCHEMA: household_foundation_2_0x
RUNTIME: js/household-store.js
CANONICAL FURNITURE LOCATION: ItemInstance.location.type = HOUSING_ROOM
```

## Scope boundary

```text
Housing
  owns unit identity, address, access, rent, utilities, maintenance,
  security, privacy, storage units and market/shipment integration.

Household
  projects the usable interior of one Housing record:
  floor plan, rooms, room capabilities, furniture placement and
  safe-space readiness.
```

Household does not own a second Citizen, Housing or ItemInstance store. It does not persist a separate layout payload.

## Canonical data ownership

### Housing record

A Housing record may contain one declarative Household profile:

```js
{
  household: {
    schemaVersion: "household_foundation_2_0x",
    floorPlan: {
      width: 12,
      height: 10,
      cellScale: "ABSTRACT"
    },
    rooms: [
      {
        id: "housing-a-living",
        label: "Living Area",
        type: "LIVING",
        bounds: {
          column: 1,
          row: 1,
          width: 7,
          height: 6
        },
        capabilities: ["REST", "CONSUMABLE_USE", "SOCIAL"],
        restrictions: []
      }
    ],
    residentIds: [],
    notes: ""
  }
}
```

`js/store.js` and `js/housing-bridge-store.js` preserve the declarative profile. `js/household-store.js` normalizes explicit profiles and derives a deterministic default profile for legacy Housing records or RENT-derived records.

### Furniture and placed household items

A placed physical item remains the same ItemInstance:

```js
{
  instanceId: "item-bed-01",
  ownerId: "citizen-a",
  lifecycleState: "UNPACKAGED",
  location: {
    type: "HOUSING_ROOM",
    housingRecordId: "housing-a",
    roomId: "housing-a-sleeping",
    gridX: 9,
    gridY: 1,
    rotation: 0
  }
}
```

The location object is the only canonical furniture placement. Household must not create:

```text
household.items[]
furnitureStore
roomInventory
DOM-only placement state
parallel localStorage layout
```

## Room model

Canonical room types installed by the foundation:

```text
MULTIPURPOSE
LIVING
SLEEPING
KITCHEN
HYGIENE
MEDICAL
WORKSHOP
STORAGE
ENTRY
SAFE_ROOM
```

Each room owns:

```text
id
label
type
bounds
capabilities[]
restrictions[]
notes
```

Room bounds use absolute floor-plan coordinates. Furniture placement also uses absolute floor-plan coordinates and must remain fully inside the target room.

## Default Household profiles

Legacy Housing records receive deterministic read projections based on Housing type:

```text
HAB_CELL / RENT_ACCESS  -> one MULTIPURPOSE cell
MICRO_UNIT              -> main cell + hygiene + utility
STANDARD_UNIT           -> living + sleeping + kitchen + hygiene + entry
TECHNICAL_HOUSING       -> living + workshop + hygiene + storage + entry
SECURED_UNIT / SAFEHOUSE-> living + safe room + kitchen + hygiene + entry
CORPORATE / EXECUTIVE   -> living + sleeping + kitchen + medical + hygiene
WAREHOUSE               -> workshop floor + secure storage + rest cell
```

The derived profile is deterministic and read-only until the Housing record is explicitly edited.

## Household profile validation

`validateHouseholdProfile()` checks:

```text
unique room IDs
room bounds inside the floor plan
no room overlap
valid normalized room records
```

A safe-space projection requires a valid Household layout.

## Furniture eligibility

A physical item is Household-placeable when at least one condition is true:

```text
householdProfile.placeable === true
itemType is FURNITURE, APPLIANCE or FIXTURE
tags include FURNITURE, APPLIANCE, FIXTURE or HOUSEHOLD_PLACEABLE
```

Optional definition-owned profile:

```js
householdProfile: {
  placeable: true,
  footprint: "2x3",
  capabilities: ["SLEEP", "REST"],
  allowedRoomTypes: ["SLEEPING", "SAFE_ROOM"],
  blockedRoomTypes: ["HYGIENE"]
}
```

Definition metadata describes eligibility and capability. ItemInstance owns the physical placement.

## Placement validation

`validateHouseholdPlacement()` verifies:

```text
Citizen owner
Housing record
room existence
placeable item profile
allowed/blocked room type
rotated footprint
full containment in room bounds
collision against other HOUSING_ROOM ItemInstances
```

No EquipmentState build or Housing Storage mutation is required for read validation.

## Placement commands

### Place or move furniture

```js
placeHouseholdItem({
  citizenId,
  housingRecordId,
  roomId,
  instanceId,
  gridX,
  gridY,
  rotation,
  idempotencyKey,
  expectedStoreRevision
})
```

The command uses `commitItemInstanceTransaction()` with one `MOVE` operation. Accepted default source locations:

```text
HOUSING_STORAGE
CONTAINER_GRID
UNPLACED
HOUSING_ROOM
```

The same ItemInstance moves to `HOUSING_ROOM`; no copy is created.

### Return furniture to storage

```js
returnHouseholdItemToStorage({
  citizenId,
  instanceId,
  storageUnitId,
  idempotencyKey,
  expectedStoreRevision
})
```

The command requests canonical Housing Storage placement from `validateHousingPlacement()` and moves the same ItemInstance back to `HOUSING_STORAGE` through ItemInstance Transaction Store.

## Events

A newly committed furniture transaction emits:

```text
ws:household-layout-updated
```

Payload:

```js
{
  eventId,
  citizenId,
  housingRecordId,
  roomId,
  instanceId,
  operationType,
  transactionId,
  changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "HOUSING", "HOUSEHOLD"]
}
```

Idempotent transaction replays do not emit another Household layout event.

## Safe-space projection

`getHouseholdSafeSpaceProfile()` combines:

```text
valid Household layout
Housing status and rent state
utilities
maintenance
security
privacy
room and furniture capabilities
```

Projection fields:

```text
ready
layoutReady
accessReady
utilitiesReady
maintenanceReady
securityLevel
privacyLevel
comfortLevel
capabilities[]
recoveryReady
consumableUseReady
```

This foundation does not mutate Citizen health or time.

## Household operation readiness

`resolveHouseholdOperationReadiness()` supports contract checks for:

```text
REST
SLEEP
USE_CONSUMABLE
USE_MEDICAL_CONSUMABLE
USE_RECREATIONAL_SUBSTANCE
HYGIENE
FOOD_PREP
MAINTENANCE
```

The function reports required capability and downstream execution owner.

```text
Consumable execution -> existing Item Type Operations / transaction-backed daily usage log
Rest and sleep execution -> future Household Recovery runtime
Campaign Time mutation -> future Household Recovery runtime
```

`commitSupported` remains `false` for these operations in 2.0x.

## Player UI

Housing navigation contains:

```text
UNIT
HOUSEHOLD
STORAGE
MARKET
```

The Household tab shows:

```text
safe-space readiness
floor-plan dimensions
rooms and room capabilities
placed ItemInstance count
read-only furniture placement projection
operation readiness for rest, sleep and consumables
```

Interactive furnishing drag/drop, recovery execution and consumable execution are not installed by this patch.

## Public API

```text
normalizeHouseholdProfile
normalizeHouseholdRoom
validateHouseholdProfile
getHousingHousehold
getHouseholdRooms
getHouseholdRoom
getHouseholdPlacedItems
getHouseholdItemProfile
getHouseholdItemFootprint
getHouseholdRoomOccupancy
validateHouseholdPlacement
placeHouseholdItem
returnHouseholdItemToStorage
getHouseholdCapabilities
getHouseholdSafeSpaceProfile
resolveHouseholdOperationReadiness
validateHouseholdReadiness
```

## Readiness

```js
validateHouseholdReadiness()
```

Required dependencies:

```text
Housing Bridge records
canonical ItemInstance reads
ItemInstance Transaction Store
Housing Storage placement validation
```

Persistence ownership remains:

```text
Housing record / Citizen persistence -> Citizen Store
furniture placement -> ItemInstance Store
transaction receipt -> ItemInstance Transaction Store
```

## Explicitly out of scope

```text
interactive room editor
furniture drag/drop UI
furniture catalog expansion
sleep or rest time advancement
health, wound or fatigue regeneration
consumable dosage UI
addiction, tolerance and overdose mechanics
status-effect mutation outside existing Item Type Operations
room environmental hazards
resident permissions and guest access
Household Services and maintenance scheduling
```
