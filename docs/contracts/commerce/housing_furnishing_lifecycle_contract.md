# Housing Furnishing Lifecycle Contract 4.0x

## Scope

This contract defines the runtime lifecycle of functional Household furniture and Housing fixtures. It extends the existing Household placement workspace and canonical ItemInstance model. It does not introduce another inventory, Housing or furniture store.

## State ownership

```text
ItemInstance Store
  physical identity
  ownerId
  location
  lifecycleState
  durability.current
  installed module ItemInstances
  serviceHistory

Housing Rent Standards Catalog
  default furnishing grade
  fixed fixture definitions
  rental furnishing definitions
  maintenance/replacement policy metadata

Housing Furnishing Lifecycle
  lifecycle projection
  grade wear resolution
  condition band projection
  functional slot compatibility
  repair/replacement/disposal commands
  operator furnishing reconciliation
```

One physical furnishing remains one `ItemInstance`. A module installed into furniture remains a separate `ItemInstance` with:

```js
location: {
  type: "INSTALLED_IN_ITEM",
  parentItemInstanceId,
  moduleSlotId
}
```

## Ownership classes

```text
FIXED_FIXTURE
RENTAL_FURNISHING
CITIZEN_FURNISHING
```

`FIXED_FIXTURE` and `RENTAL_FURNISHING` are operator assets represented by canonical ItemInstances so condition, grade and installed citizen-owned modules can be projected consistently. Their `ownerId` remains the current Citizen integration owner, while `instanceData.householdLifecycle.ownershipType` and `operatorId` define domain ownership.

Operator assets:

- are reconciled from the active Housing Unit definition;
- are excluded from Citizen relocation and move-out manifests;
- are disposed by reconciliation only after the Housing Unit is released;
- cannot be incinerated or directly replaced by Citizen commands;
- require a later operator/service workflow for model replacement.

Citizen furnishings:

- move between `HOUSING_STORAGE` and `HOUSING_ROOM` as the same ItemInstance;
- may receive compatible modules;
- may be repaired, replaced by another stored furnishing of the same functional class, or disposed;
- remain part of relocation manifests.

## Grade and weekly wear

The canonical grade registry remains in `data/housing-rent-standards.js`:

```text
ECONOMY  4.0% / campaign week
UTILITY  3.0% / campaign week
STANDARD 1.5% / campaign week
QUALITY  1.0% / campaign week
PREMIUM  0.5% / campaign week
```

Wear is evaluated only for furnishings whose canonical location is `HOUSING_ROOM`.

```text
weeks = floor((currentCampaignTime - lastWearAt) / 7 days)
conditionAfter = max(0, conditionBefore - weeklyWearPercent * weeks)
```

Storage does not accumulate deferred wear. A transition between `HOUSING_STORAGE` and `HOUSING_ROOM` resets `lastWearAt` to current Campaign Time through the canonical `ws:item-instances-updated` event payload. Moving an item out of a room also resets the anchor.

Wear is one simple weekly tick. There are no materials, usage counters, durability builds or upgrades that reduce wear.

## Condition bands and capabilities

```text
61–100 OPERATIONAL
31–60  WORN
1–30   DAMAGED
0      BROKEN
```

- `OPERATIONAL` and `WORN` expose essential and optional capabilities.
- `DAMAGED` exposes only essential capabilities.
- `BROKEN` exposes no furnishing capabilities.
- Installed modules add capabilities while the parent is not `BROKEN`.

Condition is a projection over `ItemInstance.durability.current`; it is not a second status store.

## Functional slots

Slots are bounded by furniture definition/profile. Current slot families are:

```text
STORAGE
COMFORT
UTILITY
SECURITY
DISPLAY
```

Current functional modules add concrete capabilities:

- under-bed storage;
- acoustic sleep privacy;
- terminal workspace;
- cold storage;
- secure storage;
- display surface for future collectibles/mementos.

No module changes weekly wear or grade.

## Commands

Public command boundary:

```text
installHousingFurnishingModule()
removeHousingFurnishingModule()
repairHousingFurnishing()
replaceHousingFurnishing()
disposeHousingFurnishing()
```

All physical mutations commit through `commitItemInstanceTransaction()`.

### Repair

Repair restores `durability.current` to `100`, resets the wear anchor, and appends one service-history record. Cost/provider orchestration is outside this patch.

### Replacement

Citizen replacement swaps locations of two same-class Citizen furnishings atomically. If the active furnishing is placed in a room, the replacement footprint is validated against the current active-cell layout and collisions before commit. Installed modules remain attached to their parent ItemInstance.

Operator furnishing replacement is rejected with an explicit service-required result.

### Disposal

Only Citizen furnishings can be disposed through this command. Installed modules must be removed first.

```text
ItemInstance → DESTROYED / DISPOSED
Citizen credits += 5 ₡
```

The item mutation commits first. If Citizen credit persistence fails, the ItemInstance transaction is compensated. Billing history/transaction projection is best-effort after the Citizen credit commit.

## Relocation integration

`js/housing-rent-subscription-bridge.js` excludes operator assets from the transfer manifest using `ownershipType`:

```text
FIXED_FIXTURE
RENTAL_FURNISHING
```

Citizen furniture is packed by Housing Rent Relocation Runtime. Modules installed in Citizen-owned furniture remain attached through `INSTALLED_IN_ITEM` and are not cloned.

Citizen-owned modules installed in operator fixtures or rental furnishings are handled separately: the operator parent remains in the released unit, while the module is included in `detachedOperatorModuleInstanceIds` and in the relocation `instanceIds` manifest so the relocation runtime moves that same module ItemInstance into target Housing storage.

## UI boundary

`js/housing-household-runtime.js` displays:

- ownership;
- grade;
- condition and condition band;
- weekly wear rate;
- effective capabilities;
- functional slots and installed modules;
- install/remove module actions;
- repair, replacement and disposal actions when allowed.

The UI does not own lifecycle state and does not persist transient selection.

## Out of scope

- wear-reduction upgrades;
- material-level degradation;
- per-use wear;
- repair pricing/provider scheduling;
- operator replacement service execution;
- collectibles inventory and display-slot assignment;
- Household Hub, weather and World Feed;
- consumable effects or status runtime;
- Rest/Sleep consequence resolution.
