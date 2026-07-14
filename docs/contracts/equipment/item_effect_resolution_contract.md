# Item Effect Resolution Contract

## Scope

This contract owns post-commit resolution for consumable Item Type operations. It does not own ItemInstance quantity, Citizen HP/wounds, combat, Billing, Services or Market fulfillment.

Canonical chain:

```text
useConsumable()
  -> ItemInstance transaction commit
  -> resolveConsumableEffect()
  -> persistent resolution receipt
  -> optional Citizen status application
```

The physical consumable quantity is committed first. Effect resolution reuses the committed operation/transaction identity and is independently retryable and idempotent.

## Owners

```text
data/item-effect-catalog.js
  declarative consumable effect profiles

js/item-effect-resolver.js
  profile selection, preview, idempotent resolution and receipts

js/citizen-status-store.js
  persistent Citizen status instances, refresh/stack semantics and expiration
```

Item Type Operations calls the resolver. Inspector UI is a read/command projection only.

## Effect profile

A profile contains:

```js
{
  id: "HABITAT_STANDARD_RATION",
  label: "Standard Nutrition",
  targetScope: "CITIZEN",
  matches: {
    definitionIds: ["eqcat-habitat-standard-ration-pack"]
  },
  resultLabel: "Standard nutrition active",
  statusEffects: [
    {
      statusId: "NOURISHED",
      label: "Nourished",
      category: "NUTRITION",
      durationSeconds: 28800,
      stackMode: "REFRESH",
      magnitude: 1,
      maxStacks: 1,
      tags: ["FOOD", "NUTRITION", "RATION"],
      modifiers: { hungerPenalty: -1 }
    }
  ]
}
```

Exact `definitionId` matches take precedence over category/subtype/tag fallback profiles.

## Resolution receipt

Persistence keys:

```text
ws_item_effect_resolutions_v1
ws_item_effect_resolutions_schema
```

Canonical receipt fields:

```js
{
  resolutionId,
  signature,
  status,              // PENDING | COMPLETED | FAILED
  reason,
  citizenId,
  instanceId,
  definitionId,
  operationId,
  profileId,
  targetScope,         // CITIZEN | EXTERNAL | NONE
  unitsConsumed,
  resultLabel,
  appliedStatusInstanceIds: [],
  appliedStatusIds: [],
  inputSnapshot,
  error,
  createdAt,
  updatedAt,
  revision
}
```

`resolutionId` normally equals the committed Item Type operation/transaction identity. Reusing the same identity with a different signature returns `ITEM_EFFECT_IDEMPOTENCY_CONFLICT`.

A completed resolution can be replayed without creating a second Citizen status. A failed resolution can be retried through the stored input snapshot.

## Citizen statuses

Persistence keys:

```text
ws_citizen_status_effects_v1
ws_citizen_status_effects_schema
```

A status instance contains:

```js
{
  statusInstanceId,
  citizenId,
  statusId,
  label,
  category,
  state,               // ACTIVE | EXPIRED | REMOVED
  stackMode,           // REFRESH | STACK | REPLACE
  stacks,
  maxStacks,
  magnitude,
  durationSeconds,
  startedAt,
  expiresAt,
  tags: [],
  modifiers: {},
  source: {
    resolutionId,
    operationId,
    definitionId,
    instanceId,
    profileId,
    units
  },
  revision
}
```

`REFRESH` updates the existing active status for the same Citizen/status identity instead of duplicating it. Status expiration uses Campaign Time when available and falls back to an ISO timestamp only when no campaign date exists.

## External-use consumables

Profiles with `targetScope: EXTERNAL` complete with an effect-resolution receipt and no Citizen status. This supports hygiene, cleaning and utility supplies without inventing a body/health mutation.

## Public API

Item Effect Resolver:

```text
getConsumableEffectProfile
previewConsumableEffect
resolveConsumableEffect
retryConsumableEffectResolution
getItemEffectResolution
getItemEffectResolutions
resetItemEffectResolutionStore
```

Citizen Status Store:

```text
getCitizenStatusEffects
getCitizenStatusEffect
applyCitizenStatusEffects
removeCitizenStatusEffect
expireCitizenStatusEffects
resetCitizenStatusStore
```

## Events

```text
ws:item-effect-resolution-completed
ws:citizen-status-effects-updated
```

Events are notifications. They do not become alternate state owners.

## Campaign Data I/O

Citizen status and effect-resolution persistence keys are registered through `js/campaign-data-io-adapters.js`. Import/export/reset preserves IDs and receipts and must not rerun consumable operations during import.

## Current boundaries

Implemented:

```text
exact and fallback effect-profile selection
Inspector effect preview
persistent idempotent resolution receipts
Citizen status apply/refresh/stack foundation
Campaign Time expiration
external-use household receipts
Campaign Data I/O adapter coverage
```

Not implemented:

```text
HP, wound or disease mutation
combat damage/healing formulas
medical procedure resolution
nutrition/dehydration simulation loop
status modifier consumption by dice/combat resolvers
grenade timer, detonation, blast or damage
```
