# Market Pickup Fulfillment Contract

## Scope

This contract defines `PICKUP` fulfillment for Market checkout. It extends the canonical Market Store orchestration boundary without creating another cart, order, stock, Billing or ItemInstance store.

## Domain ownership

| State | Canonical owner |
|---|---|
| offers, carts, MarketOrder and pickup reservation state | Market Store |
| stock reservation and committed quantity | Market Store |
| payment intent, capture and refund | Billing Store |
| physical purchased unit and custody location | ItemInstance Store / ItemInstance Transaction Store |
| vendor and pickup location identity | Organization Store / Organization Locations |
| player controls and projections | Market Workspace / Housing delivery projection |
| campaign timestamp | Campaign Time |
| exact event envelope and receipt | World Time Scheduled Events |
| Market event mapping and handler | Market Time Scheduler |

Market and Housing UI are read/command projections. It may not mutate pickup state, ItemInstance location, stock or Billing directly.

## Offer requirements

A pickup-capable offer must expose:

```text
fulfillmentOptions includes PICKUP
organizationLocationId is non-empty
vendorProviderId resolves through Organization Store
```

Default pickup policy:

```text
schemaVersion: 1
defaultReservationDays: 3
minReservationDays: 1
maxReservationDays: 30
```

A cart may contain one fulfillment mode only. Mixed Delivery, Pickup and Purchase-with-Service lines remain blocked.

## Checkout lifecycle

```text
MarketOrder DRAFT
  -> RESERVING
  -> AUTHORIZED
  -> FULFILLING / pickup PREPARING
  -> FULFILLING / pickup READY
```

Checkout performs one coordinated operation:

1. reserve stock for every line;
2. create, authorize and capture one Billing intent;
3. create exactly one ItemInstance per purchased unit in one ItemInstance transaction;
4. commit stock reservations;
5. persist cart as `CHECKED_OUT`;
6. persist pickup state as `READY`;
7. emit `ws:market-pickup-ready`.

Prepared item custody:

```text
ownerId: purchasing Citizen
location.type: VENDOR
lifecycleState: PACKAGED
marketOrderId: source MarketOrder
organizationLocationId: pickup location
```

The Citizen owns the purchased unit while the vendor retains physical custody. Checkout does not create Housing reservations and does not commit `BODY`.

## Pickup confirmation

Public command:

```text
confirmMarketPickup(marketOrderId, {
  expectedRevision,
  idempotencyKey
})
```

Confirmation atomically moves every MarketOrder ItemInstance:

```text
expected: VENDOR / PACKAGED
target:   UNPLACED / UNPACKAGED
flags:    pickupCompleted = true
          pendingHousingPlacement = true
```

The transaction reuses the same `instanceId`. It may not delete and recreate the item. Successful confirmation changes the order to `COMPLETED`, changes pickup status to `COMPLETED`, records the transaction receipt and emits:

```text
ws:market-pickup-completed
ws:market-stock-updated
ws:item-instances-updated
```

Housing placement remains a later explicit ItemInstance/Housing operation.

## Expiration

`READY` pickup stores a full `expiresAt` Campaign timestamp. It expires at the exact boundary:

```text
current Campaign Time >= expiresAt
```

`js/market-time-scheduler.js` schedules `MARKET_PICKUP_EXPIRES` through the shared persistent World Time queue. Startup and explicit `reconcileMarketPickupFulfillment()` remain recovery paths. Market Store does not depend on `ws:campaign-date-updated`.

Expired pickup must use the canonical Market cancellation path with reason:

```text
PICKUP_RESERVATION_EXPIRED
```

Cancellation must:

- compensate the pickup preparation ItemInstance transaction;
- restore committed stock;
- refund the captured Billing transaction;
- persist MarketOrder cancellation;
- set pickup status to `EXPIRED`;
- remain retry-safe.

## Recovery and idempotency

Required properties:

```text
checkout idempotencyKey is stable for the cart/order operation
pickup completion idempotencyKey is stable per MarketOrder
expectedRevision protects explicit confirmation/retry commands
committed ItemInstance transaction replay returns the existing receipt
no retry may create an additional ItemInstance
```

Failed confirmation sets pickup state to `RECOVERY_REQUIRED`. Recovery uses:

```text
retryMarketPickupCompletion(marketOrderId, input)
```

Startup reconciliation may complete an already committed transaction receipt or expire a stale READY reservation whose exact timestamp was crossed before load.

## Public API

```text
checkoutMarketCart()
confirmMarketPickup()
retryMarketPickupCompletion()
reconcileMarketPickupFulfillment()
getMarketOrder()
getMarketOrderActionState()
```

## Invariants

```text
one purchased physical unit = one ItemInstance
PICKUP READY requires VENDOR / PACKAGED custody
PICKUP COMPLETED requires the same instance in UNPLACED / UNPACKAGED
PICKUP never creates a Housing placement reservation
PICKUP never commits directly to BODY
Billing capture precedes READY
stock is committed exactly once
expiration uses Campaign time, not wall-clock timers
all write paths are idempotent and revision-aware
```

## UI contract

Market Workspace may expose:

```text
ADD FOR PICKUP
pickup vendor/location/address/expiry
CONFIRM PICKUP
RETRY PICKUP
```

UI feedback does not imply physical placement. After confirmation, the item is owned and unplaced until another canonical command moves it into Housing, Equipment or Service custody.
