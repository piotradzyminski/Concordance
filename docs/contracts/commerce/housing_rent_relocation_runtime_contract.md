# Housing Rent Relocation Runtime Contract 3.3x

## Ownership

- `SubscriptionAPI` remains the canonical owner of Rent product, tier, Billing, entitlement and contract revision.
- `Housing Rent Subscription Bridge` prepares `RELOCATION_REQUIRED` plans and read-only transfer manifests.
- `Housing Rent Relocation Runtime` executes, cancels and recovers prepared relocations.
- `ItemInstance Store` remains the only owner of physical furnishings and stored items.
- `ItemInstance Transaction Store` owns the atomic physical move and compensation record.
- `citizen.housing` owns the occupied target unit, archived source unit and relocation history.
- Market remains the owner of orders and in-flight shipment destinations. This runtime changes only the Citizen's default/primary Housing address for future operations.

This scope does not implement furniture wear, repair, fixture upgrades, Household collectibles, World Feed, automatic furnishing placement or Market shipment redirection.

## Canonical runtime

```text
js/housing-rent-relocation-runtime.js
```

Version:

```text
housing_rent_relocation_runtime_3_3x
```

The runtime is eager and loads after `housing-rent-subscription-bridge.js`. It introduces no new persistence store or `localStorage` key.

## Prepared relocation prerequisite

Execution requires one linked Housing record with:

```js
rentTransition: {
  type: "RELOCATION_REQUIRED",
  status: "PREPARED",
  transitionId,
  contractRevision,
  from,
  targetUnit,
  transferManifest
}
```

The target unit is still a prepared profile at this stage. It is not occupied, primary or a delivery target until the relocation commits.

## Preview and packing

`previewHousingRentRelocation(contractId)` reads the current canonical ItemInstances from `transferManifest.instanceIds` and creates a deterministic packing plan.

Rules:

- the same `instanceId` is retained;
- `HOUSING_ROOM` furnishings are packed into target Housing storage;
- current `HOUSING_STORAGE` items are packed into target Housing storage;
- storage type affinity is preferred, then `GENERAL` storage;
- 0° and 90° orientation may be used;
- larger footprints are placed first;
- the operation is rejected before mutation if any item does not fit;
- no furniture is automatically positioned on the target floor plan.

Capacity failure:

```text
HOUSING_RELOCATION_TARGET_CAPACITY_EXCEEDED
```

A missing manifest instance fails explicitly and is never silently omitted.

## ItemInstance transaction

Approval submits one canonical transaction:

```text
sourceDomain: HOUSING
metadata.operationType: HOUSING_RELOCATION
```

Every manifest entry receives one `MOVE` operation to:

```js
{
  type: "HOUSING_STORAGE",
  housingRecordId: targetHousingRecordId,
  storageUnitId,
  gridX,
  gridY,
  rotation
}
```

The logical idempotency key is stable for a relocation transition and contract revision. A new attempt suffix is used only after a previous attempt reached `FAILED` or `COMPENSATED`; unrelated ItemInstance store revisions do not create another logical move.

## Commit order and compensation

Commit order:

1. validate the prepared transition and target capacity;
2. commit the ItemInstance transaction;
3. re-read the Rent transition and reject a conflicting transition;
4. persist the target and released Housing records in one Citizen update;
5. update the active Housing selection;
6. emit the relocation event.

The source unit is not released before the ItemInstance transaction commits.

If Housing persistence fails after the physical move, the runtime invokes canonical ItemInstance transaction compensation. The operation returns `recoveryRequired` when compensation itself cannot be confirmed.

## Target activation

On success the target record becomes:

```text
status = ACTIVE
occupancyStatus = OCCUPIED
archived = false
rentTransition = null
```

It retains the Rent contract link and records:

```text
relocationHistory[]
rentBridge.lastRelocationTransitionId
rentBridge.lastRelocationTransactionId
```

The prepared-only `housingRecordId` field is normalized into canonical `id` and is not persisted as a second unit identity field.

## Source release

The source record is preserved as history and becomes:

```text
status = RELEASED
occupancyStatus = VACANT
archived = true
linkedSubscriptionId = ""
```

It retains `historicalSubscriptionContractId`, release metadata and its prior unit profile. It no longer competes with the target record when resolving the active unit for the Rent contract.

## Primary unit and address

If the source unit was primary:

- the target unit becomes primary;
- other non-archived units are marked non-primary;
- `citizen.address` and `citizen.visibleAddress` use the target visible address;
- `citizen.trace` and `citizen.traceAddress` use the target trace address;
- `housingActiveRecordByCitizen[citizenId]` points to the target unit.

Existing Market orders and shipments keep their already committed destination. Only future flows that resolve the Citizen's current Housing address use the new primary unit.

## Cancellation

`cancelHousingRentRelocation(contractId)` restores the previous tier recorded in `rentTransition.from.standardTierId` through `SubscriptionAPI.changeSubscriptionTier()` and forces Rent/Housing reconciliation.

Cancellation never edits ItemInstances because a prepared relocation has not moved them yet.

The current Subscription API changes tiers inside the existing Rent product. A relocation produced by an unsupported direct cross-catalog mutation returns the corresponding Subscription API error instead of rewriting contract data outside the API boundary.

## Recovery

At startup the runtime inspects canonical ItemInstance transactions with:

```text
sourceDomain = HOUSING
metadata.operationType = HOUSING_RELOCATION
status = COMMITTED or RECOVERY_REQUIRED
```

When the matching Housing transition is still prepared, the runtime finalizes Housing activation from the persisted transaction snapshots. Recovery does not execute the physical move a second time.

A completed Housing record has no prepared transition, so replay does not create another unit or history entry.

## Public API

```text
previewHousingRentRelocation(contractOrId)
approveHousingRentRelocation(contractOrId, options)
cancelHousingRentRelocation(contractOrId, options)
recoverHousingRentRelocations(options)
validateHousingRentRelocationRuntime()
```

## Domain event

Committed, cancelled and recovered operations emit:

```text
ws:housing-rent-relocation-updated
```

The event includes stable context such as Citizen, contract, transition, source/target Housing IDs, result code, ItemInstance IDs and ItemInstance transaction ID.

## UI contract

`Housing → Unit` exposes actions only for a prepared `RELOCATION_REQUIRED` transition:

```text
APPROVE MOVE
CANCEL MOVE
```

Approval requires confirmation and explicitly states that furnishings will be staged in target storage for later placement. The UI owns no relocation persistence and calls only the public runtime API.
