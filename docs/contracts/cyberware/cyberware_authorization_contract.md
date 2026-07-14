# Cyberware Authorization Contract — 10.0x

## Canonical ownership

Authorization is split by domain.

```text
Citizen.cyberwareLicenses
= permanent entitlement records

Citizen.subscriptions
= temporary paid service access

ItemInstance.authorizationRefs
= references to selected license/subscription/firmware records

ItemInstance.cyberwareState.installedFirmware
= installed firmware state for the physical specimen
```

No duplicate authorization state may be introduced in Cyberware Runtime, Planner or UI caches.

## Lifetime license

A cyberware license belongs to the citizen and is permanent by default.

Canonical statuses:

```text
ACTIVE
PENDING
SUSPENDED
REVOKED
```

`ACTIVE` authorizes matching cyberware. `SUSPENDED`, `REVOKED` and missing licenses block operation and procedure confirmation.

A license can restrict:

```text
category
manufacturers
protocols
grades
```

`CYBERWARE` category is a universal category. Domain categories such as `CIVIC`, `INDUSTRIAL` and `MEDICAL` authorize only matching items.

## Subscription

Subscription requirements are temporary and resolved through the canonical contract module:

```text
js/subscription-entitlement.js
```

Cyberware Authorization consumes:

```text
getCitizenEntitledSubscriptions(citizenOrId)
getSubscriptionTierLevel(subscription)
resolveSubscriptionEntitlement(subscription)
```

Entitlement behavior:

```text
PAID -> ACTIVE / authorized
OVERDUE -> GRACE_PERIOD / authorized with warning
PENDING -> blocked
SUSPENDED -> blocked
CANCELLED -> blocked
```

`ACTIVE`, `CONFIRMED` and `SYNCED` are normalized at the subscription boundary. Cyberware must not maintain an independent active-status interpretation. Matching uses category, minimum tier and optional `authorizationRefs.subscriptionId`.

## Firmware

Firmware is stored on the ItemInstance:

```text
cyberwareState.installedFirmware[]
```

Each record contains:

```text
channel
version
status
installedAt
source
```

Resolution states:

```text
NOT_REQUIRED
CURRENT
UPDATE_AVAILABLE
OUTDATED
MISSING
CORRUPTED
BLOCKED
```

`UPDATE_AVAILABLE` is nonblocking when the update is optional. `OUTDATED`, `MISSING`, `CORRUPTED` and `BLOCKED` are blocking states.

Firmware installation updates one ItemInstance through `updateItemInstance()` and never writes a parallel cyberware record.

## Combined resolver

Canonical API:

```text
getCyberwareAuthorizationState(citizenOrId, item)
```

Result:

```text
valid
reason
blockers[]
warnings[]
license
subscription
firmware
```

Runtime and Planner consume this resolver through `validateCyberwareAccessForItem()`.

## Mutation API

```text
grantCyberwareLicense()
suspendCyberwareLicense()
revokeCyberwareLicense()
restoreCyberwareLicense()
linkCyberwareLicense()
installCyberwareFirmware()
```

Citizen mutations invalidate the Cyberware workspace cache through existing citizen-update events. Firmware mutations invalidate through ItemInstance update events.

## UI refresh contract

Authorization actions in the Cyberware workspace may refresh only:

```text
Cyberware Overview
Core Stack/runtime projection
mounted Planner when explicitly requested
```

They must not trigger a full Equipment module render or rebuild CyberGrid state.
