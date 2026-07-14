# Cyberware Contract Stability 12.1x

## Scope

This patch stabilizes data and operation contracts shared by Cyberware Runtime, Core Stack, Planner, Authorization, Maintenance and the canonical ItemInstance lifecycle.

It does not optimize Planner projection cost. Planner performance remains a separate 12.2x scope.

## Requirement domains

Cyberware requirements are represented by three independent arrays:

```js
{
  requiredProtocols: ["CIVIC", "MEDICAL"],
  requiredBuses: ["STANDARD_BODY_BUS"],
  requiredComponentStandards: ["MC_HAND_M3_R"]
}
```

Contract:

```text
requiredProtocols
= logical/firmware control protocols provided by the effective Neurochip + Interface protocol set

requiredBuses
= physical/logical body-bus families provided by Interface.supportedBuses

requiredComponentStandards
= required installed component identities/compatibility standards
```

Legacy `requiredBuses` arrays are classified at normalization time:

```text
known protocol token -> requiredProtocols
*_BUS token -> requiredBuses
remaining token -> requiredComponentStandards
```

New/edited records must write the three fields explicitly.

## Anatomy contract

Explicit anatomy is authoritative:

```text
slots / occupiedSlots / slotKeys / primarySlot / targetSlot / slot
```

Text inference is used only when no explicit slot exists. Token matching uses anatomical boundaries so substrings such as `heart` and `forearm` cannot infer `ear`.

## Product tier and grade

```text
productTier / tier
= numeric hardware tier 0..6

grade
= authorization/quality class, e.g. CIVILIAN, LICENSED, CORPORATE
```

`normalizeCyberwareEntry()` preserves a numeric product tier and does not use a textual grade as a numeric tier.

Maintenance cost/duration must be finite. Invalid derived values add:

```text
MAINTENANCE_QUOTE_INVALID
```

and are sanitized before persistence. Service history never stores `NaN`.

## Deinstall and replace return destination

Canonical successful deinstall/replace requires a valid Housing destination:

```js
{
  type: "HOUSING_STORAGE",
  storageUnitId: "..."
}
```

The commit resolves the first valid placement immediately before mutation. Missing or unavailable placement returns:

```text
RETURN_LOCATION_REQUIRED
```

Successful deinstall:

```text
same ItemInstance
BODY / INSTALLED
-> HOUSING_STORAGE / STORED
```

The stored instance retains firmware, calibration, authorization and service history while clearing:

```text
cyberwareState.installedCharacterId
cyberwareState.installedBodySlots
```

Replace remains one atomic ItemInstance batch:

```text
old target -> Housing
incoming source -> BODY
```

## Blocker aggregation

Slot, core-stack and authorization validation return one combined blocker list. Independent failures are not hidden by the first core-stack error.

Example:

```text
PROTOCOL_UNSUPPORTED:MEDICAL
LICENSE_SUSPENDED
```

`reason` remains the first blocker for backward-compatible consumers; `blockers[]` is authoritative for diagnostics and UI.

## Preserved contracts

Unchanged:

```text
ItemInstance schema
ItemState model
CyberGrid placement rules
same-grid fast path
container drag/drop
workspace cache/lazy mounting
Runtime resource formulas
Authorization semantics
Maintenance operation semantics
```

## Seed behavior

No ItemInstance seed-version reset is introduced. Existing records are normalized through the legacy requirement classifier. The five Player B test records are updated to explicit requirement domains in source data.
