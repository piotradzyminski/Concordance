# Housing Rent Subscription Bridge Contract 3.2x

## Ownership

- `SubscriptionAPI` remains the canonical owner of Rent contracts, product/tier selection, entitlement, Billing status, contract revision and cancellation.
- `Housing Rent Standards Catalog` owns semantic Housing standards H–A and tier capabilities.
- `Housing Layout Pools` owns reusable layout templates and deterministic assignment.
- `Housing Rent Subscription Bridge` projects one Rent contract into one concrete physical Housing Unit stored in `citizen.housing`.
- `Housing Bridge Store` normalizes and exposes physical Housing records.
- `ItemInstance` remains the canonical owner of citizen furnishings and all physical item locations.
- This scope does not execute relocation ItemInstance transfers, Billing, Market checkout, delivery fulfillment, furniture wear, repairs or fixture replacement.

## Canonical runtime

```text
js/housing-rent-subscription-bridge.js
```

Version:

```text
housing_rent_subscription_bridge_3_2x
```

The runtime is eager and loads after `SubscriptionAPI`, Housing Rent Standards, Housing Layout Pools and Housing Bridge Store. No new persistence store or `localStorage` key is introduced.

## Contract-to-unit identity

One active Rent contract resolves to one linked physical Housing record:

```text
subscriptionContractId
→ citizen.housing[].linkedSubscriptionId
→ concrete Housing Unit
```

New unit IDs are derived from stable Rent contract identity. Reconciliation is revision-aware and replay-safe.

The concrete unit stores at minimum:

```text
linkedSubscriptionId
standardCode
standardTierId
areaM2
occupancyStatus
fixedFixtures
rentalFurnishings
capabilities
logistics
storageUnits
layoutPolicy
layoutTemplateId
layoutSeed
layoutVariantFamily
rentBridge
```

## New contract allocation

When an active Rent contract has no linked Housing record, the bridge:

1. resolves the Rent standard and tier;
2. creates one physical Housing Unit;
3. assigns the tier storage profile;
4. resolves one stable layout according to the layout policy;
5. persists the result in `citizen.housing`;
6. emits `HOUSING_UNIT_ALLOCATED`.

If the Citizen already has a non-archived primary Housing Unit, the newly allocated unit is not automatically made primary.

## Reconciliation and revisions

The physical unit stores:

```js
rentBridge: {
  schemaVersion,
  subscriptionContractId,
  subscriptionCatalogId,
  appliedContractRevision,
  lastReconciledAt,
  transitionState
}
```

If the same contract revision has already been applied, reconciliation returns:

```text
HOUSING_RENT_RECONCILIATION_REPLAY
```

and does not create another unit or transition.

## Tier-change classification

### No physical change

When standard, tier and area remain unchanged, the unit is synchronized from the current contract without replacing its identity.

Result:

```text
HOUSING_UNIT_SYNCHRONIZED
```

### Modernization in place

A tier change may modernize the existing unit only when:

```text
current standard = target standard
current areaM2 = target areaM2
```

The operation:

- preserves the Housing Unit ID;
- preserves `layoutTemplateId` and `layoutSeed`;
- updates fixtures, rental furnishings, capabilities, logistics, maintenance and tier metadata;
- adds target storage definitions;
- may mark no-longer-standard storage as `retiring` instead of deleting it;
- does not move or delete ItemInstances.

Result:

```text
HOUSING_UNIT_MODERNIZED
```

### Relocation required

A standard change or area change never silently replaces the current physical unit.

The bridge preserves the currently occupied unit and creates a persistent plan:

```js
rentTransition: {
  transitionId,
  type: "RELOCATION_REQUIRED",
  status: "PREPARED",
  contractRevision,
  from,
  targetUnit,
  transferManifest,
  preparedAt
}
```

`targetUnit` contains the target standard/tier, layout, storage, fixtures, capabilities and Household projection. It is not yet an active delivery target or occupied Housing record.

Result:

```text
HOUSING_RELOCATION_PREPARED
```

The current unit receives:

```text
occupancyStatus = RELOCATION_REQUIRED
rentBridge.transitionState = RELOCATION_REQUIRED
```

## ItemInstance transfer manifest

The bridge reads canonical ItemInstances and records what must be transferred without mutating their locations.

Manifest:

```js
{
  housingRecordId,
  storageUnitIds,
  storedInstanceIds,
  furnishingInstanceIds,
  otherInstanceIds,
  instanceIds,
  generatedAt
}
```

Classification:

- `storedInstanceIds`: ItemInstances in storage units owned by the current Housing record;
- `furnishingInstanceIds`: ItemInstances placed in `HOUSING_ROOM` for the current Housing record;
- `otherInstanceIds`: other canonical ItemInstance locations explicitly linked to the Housing record.

The bridge must not:

- rewrite ItemInstance locations;
- duplicate furnishings;
- delete items from retiring storage;
- activate the target Housing Unit;
- archive the current unit during relocation preparation.

## Cancellation and release

When a Rent contract becomes `CANCELLED`:

### Empty unit

If no ItemInstances remain in the unit, the unit is released immediately:

```text
status = RELEASED
occupancyStatus = VACANT
archived = true
```

Result:

```text
HOUSING_UNIT_RELEASED
```

### Non-empty unit

If ItemInstances remain, the bridge preserves the unit and prepares move-out:

```text
status = RELEASE_PENDING
occupancyStatus = MOVE_OUT_REQUIRED
rentTransition.type = RELEASE_REQUIRED
```

Result:

```text
HOUSING_RELEASE_PREPARED
```

`finalizeHousingUnitRelease(contractId)` succeeds only when the canonical transfer manifest is empty. Otherwise it returns:

```text
HOUSING_UNIT_NOT_EMPTY
```

## Storage preservation

Reconciliation merges canonical target storage definitions with existing storage records.

Rules:

- target storage keeps stable IDs;
- existing runtime state is preserved where IDs match;
- citizen/custom storage is not deleted by synchronization;
- modernization may mark obsolete tier storage `retiring`;
- retiring storage remains valid until later transfer/retirement runtime confirms it is empty.

## Subscription events

The bridge listens to:

```text
ws:subscription-created
ws:subscription-updated
ws:subscription-entitlement-changed
ws:subscription-cancelled
```

It also performs startup reconciliation after all required eager dependencies are available.

## Domain event

Every committed bridge change emits:

```text
ws:housing-rent-bridge-updated
```

Payload includes stable operation context such as:

```text
eventId
occurredAt
citizenId
contractId
housingRecordId
resultCode
revision
transition or transferManifest when applicable
```

## Public API

```text
reconcileHousingRentContract(contractOrId, options)
reconcileCitizenHousingRent(citizenId, options)
reconcileAllHousingRentContracts(options)
getHousingUnitForRentContract(contractId)
getHousingRentTransferPlan(contractId)
getHousingRentUnitItemManifest(citizenId, housingRecord)
finalizeHousingUnitRelease(contractId, options)
validateHousingRentSubscriptionBridge()
```

## Market visibility

Global Market remains a separate module and lazy bundle. It is explicitly included in the visible Terminal module sections for both Admin and Citizen users:

```text
Terminal
  Terminal Hub
  Service
  Equipment
  Cyberware
  Market
  Housing
```

This visibility change does not move Market business ownership back into Housing.

## Housing UI projection

Housing Unit cards may display:

- Rent standard/tier;
- occupancy state;
- relocation or release transition;
- target unit summary;
- transfer manifest item count.

Housing UI remains a projection. It does not execute ItemInstance transfer or contract changes in this scope.

## Deferred scopes

- atomic relocation commit and cancellation;
- transfer of storage and placed furnishings into the target unit;
- target address assignment and delivery-target activation;
- primary-unit switch;
- archive/release of the old unit after successful transfer;
- fixture replacement runtime;
- furniture grade wear tick;
- Household collections, hub feed, weather and history.
