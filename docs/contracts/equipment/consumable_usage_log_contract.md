# Consumable Usage Log Contract

## Ownership

Consumable quantity remains part of the canonical `ItemInstance`.

Every successful `useConsumable()` call is one committed `CONSUMABLE_USE` record in ItemInstance Transaction Store. The transaction is the only persistent source for the daily usage log. No parallel effect/status store exists.

## Operation

```text
USE CONSUMABLE
-> validate owner and quantity
-> decrement quantity or remove exhausted ItemInstance
-> commit ItemInstance transaction
-> expose transaction as a daily usage-log entry
```

## Log fields

```text
usageId
campaignDay
citizenId
itemInstanceId
definitionId
itemName
quantityUsed
remainingQuantity
itemRemoved
source
```

## Public read API

```text
getConsumableUsageLog(filters)
getConsumableUsageByDay(filters)
```

Supported filters include `citizenId`, `instanceId`, `definitionId` and `campaignDay`.

## Non-goals

The webapp does not store or calculate consumable effects, durations, status stacks, expiration, health changes, food/hydration simulation or other tabletop consequences.
