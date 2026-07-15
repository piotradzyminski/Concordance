# Market Datetime Scheduler Contract

## Status

```text
schema: market_datetime_scheduler_6_5x
owner: Market
clock owner: Campaign Time
queue owner: World Time Scheduled Events
phase: pre-alpha
```

## Purpose

Market records use full Campaign Time timestamps and schedule exact lifecycle boundaries through the shared persistent World Time queue. Market does not create a second clock, timer loop or scheduled-event persistence store.

## Ownership

```text
Campaign Time
  owns the current campaign timestamp and ws:campaign-time-updated

World Time Scheduled Events
  owns event envelopes, chronological interval processing, claims, attempts and receipts

Market Store
  owns offers, carts, MarketOrders, shipments, pickup state and canonical domain commands

Market Time Scheduler
  maps Market records to shared queue events and invokes Market domain commands

Market / Housing UI
  renders timestamps and dispatches explicit commands only
```

The shared queue may deliver a Market event. It may not mutate a MarketOrder, shipment, offer, stock reservation, Billing record or ItemInstance directly.

## Timestamp format

New and normalized Market timestamps use full UTC ISO-8601 values:

```text
YYYY-MM-DDTHH:mm:ss.sssZ
```

Examples:

```text
2109-02-13T14:30:00.000Z
2109-02-16T18:00:00.000Z
```

Legacy date-only values normalize deterministically to midnight UTC:

```text
2109-02-13
→ 2109-02-13T00:00:00.000Z
```

Migration does not invent historical hours.

## Canonical Market timestamp fields

The datetime contract applies to lifecycle timestamps including:

```text
activeFrom
expiresAt
createdAt
updatedAt
completedAt
readyAt
processingAt
packedAt
inTransitAt
etaAt
heldAt
deliveredAt
cancelledAt
requestedAt
withdrawnAt
startedAt
failedAt
```

Delivery and pickup day offsets preserve the checkout clock. A two-day delivery created at `10:37` receives an ETA at `10:37` two Campaign days later.

## Scheduled event types

Built-in handler ID:

```text
market-time-scheduler
```

Built-in events:

```text
MARKET_OFFER_ACTIVATES
MARKET_OFFER_EXPIRES
MARKET_PICKUP_EXPIRES
MARKET_SHIPMENT_DUE
```

Exact boundary semantics:

```text
active offer: currentTime >= activeFrom
expired offer: currentTime >= expiresAt
expired pickup: currentTime >= pickup.expiresAt
due shipment: currentTime >= shipment.etaAt
```

At an identical timestamp, queue ordering remains deterministic according to the shared Scheduled Events contract. Domain handlers must remain idempotent and re-read the current Market record before mutation.

## Processing model

When Campaign Time advances from `previousTimeIso` to `currentTimeIso`, the shared queue processes matching events in the interval:

```text
(previousTimeIso, currentTimeIso]
```

Events are sorted chronologically. A large skip therefore produces the same domain ordering as several smaller skips.

Market does not use:

```text
setInterval
setTimeout as a game clock
full Market scans every minute
ws:campaign-date-updated as the execution trigger
```

Startup reconciliation remains a recovery path. It may process a record whose exact boundary was already crossed before load, but it must not duplicate a completed physical commit.

## Domain resolution

### Offer boundary

Activation and expiry invalidate the Market offer projection. Availability is always re-evaluated against current Campaign Time by `searchMarketOffers()`.

### Pickup expiry

The scheduler calls the canonical Market cancellation command with:

```text
reasonCode: PICKUP_RESERVATION_EXPIRED
```

Billing refund, stock restoration and ItemInstance compensation remain owned by the existing cancellation path.

### Shipment ETA

The scheduler calls `reconcileMarketShipment()`. Shipment processing, Housing reservations, ItemInstance movement, held state and recovery state remain owned by Market Store.

A domain-level HELD or RECOVERY_REQUIRED result is a completed scheduled-event delivery. Retry belongs to the persisted Market recovery workflow rather than an infinite queue retry.

## Public API

```text
scheduleMarketTimeEvent(input)
scheduleMarketOfferTimeEvents(offerOrId)
scheduleMarketPickupExpiryEvent(orderOrId)
scheduleMarketShipmentDueEvent(shipmentOrId)
registerMarketTimeEventHandler(eventType, handler, options)
unregisterMarketTimeEventHandler(eventType)
rebuildMarketTimeSchedule()
getMarketTimeSchedulerDiagnostics()
```

Market Store also exposes:

```text
normalizeMarketWorldTimeIso(value)
compareMarketWorldTimes(left, right)
migrateMarketDatetimeState(options)
```

## Future secondary-listing boundary

`registerMarketTimeEventHandler()` is the extension boundary for later listing events such as:

```text
MARKET_SECONDARY_LISTING_EXPIRES
MARKET_SECONDARY_DEMAND_CHECK
MARKET_SECONDARY_PRICE_REVIEW
```

This patch does not create MarketListing records, simulated demand, automatic price changes or player listings.

## Persistence and recovery

Scheduled envelope/receipt persistence remains:

```text
ws_world_time_scheduled_events_v1
```

Market record persistence remains:

```text
ws_market_carts_v1
ws_market_orders_v1
ws_market_stock_v1
```

Rebuild is idempotent because each scheduled Market event uses a stable key derived from:

```text
eventType + entityId + scheduledAt
```

Reload, schedule rebuild and repeated interval processing must not duplicate cancellation, delivery, ItemInstance movement or offer lifecycle output.

## UI projection

Market and Housing render full timestamps as:

```text
DD.MM.YYYY / HH:MM
```

Date-only values remain displayable during migration. Rendering never advances Campaign Time and never resolves due Market events.

## Validation gates

Required tests:

```text
exact offer activation
exact offer expiry
exact pickup expiry
exact shipment ETA
chronological large skip
receipt replay without duplicate domain mutation
legacy date-only normalization
load order: Campaign Time -> shared queue -> Market scheduler
future custom Market event handler boundary
```
