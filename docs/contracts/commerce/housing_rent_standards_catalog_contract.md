# Housing Rent Standards Catalog Contract 3.0x

## Ownership

- `Subscriptions` owns Rent contracts, weekly billing, tier selection and entitlement state.
- `Housing Rent Standards Catalog` owns the semantic definition of standards H–A and their tiers.
- `Housing` owns assigned units, concrete layouts, fixtures, storage, furnishing state and delivery intake.
- This patch does not implement relocation, layout pools, furnishing wear ticks or fixture upgrade runtime.

## Catalog identity

Each Housing standard is one separate subscription product:

```text
sub-housing-standard-h
sub-housing-standard-g
sub-housing-standard-f
sub-housing-standard-e
sub-housing-standard-d
sub-housing-standard-c
sub-housing-standard-b
sub-housing-standard-a
```

Each tier has one globally stable `tierId`. `subscriptionCatalogId + tierId` resolves to exactly one Housing tier.

## Canonical standard limits

| Standard | Maximum area | Layout policy |
|---|---:|---|
| H | bedspace | assigned shared quarters |
| G | 18 m² | random pool |
| F | 22 m² | random pool |
| E | 25 m² | random pool |
| D | 30 m² | random pool |
| C | 40 m² | player choice pool |
| B | 50 m² | player choice pool |
| A | 100 m² | individual assignment |

Floor grids may be non-rectangular. This catalog stores area and layout policy only; concrete masks belong to the later Layout Pools scope.

## Tier differentiation

Tiers are differentiated by concrete capabilities and infrastructure, not point scores. Required fields include:

- area and occupancy;
- fixed fixtures and rental furnishings;
- storage grids and storage types;
- parcel footprint, food/cold/unattended delivery;
- disposal access;
- furnishing policy;
- fixture replacement and functional upgrade policy;
- default furnishing grade;
- maintenance coverage;
- capability tokens.

## Furnishing grade and wear

The catalog defines simple weekly wear baselines:

```text
ECONOMY  4.0%
UTILITY  3.0%
STANDARD 1.5%
QUALITY  1.0%
PREMIUM  0.5%
```

This patch does not apply wear. A later furnishing lifecycle runtime may use these values once per completed Campaign Time week.

## Compatibility

Legacy `sub-habitat-ledger` tier resolution is read-only compatibility:

```text
hab-cell     -> H T1
hab-standard -> G T2
hab-secured  -> C T2
```

New records must use the standard-specific products.

## Public API

```text
getHousingRentStandards()
getHousingRentStandard(codeOrId)
getHousingRentTier(codeOrId, tierIdOrLevel)
resolveHousingRentTierFromSubscription(subscription)
getHousingFurnishingGrade(gradeId)
getHousingFurnishingWeeklyWearPercent(gradeId)
buildHousingRentStorageUnits(resolution, housingRecordId)
validateHousingRentStandardsCatalog()
```

## Deferred scopes

- concrete non-rectangular layout pools;
- contract-to-unit assignment and relocation;
- weekly furniture wear execution;
- functional upgrade slot installation;
- fixture replacement service operations;
- Rent pricing balance.
