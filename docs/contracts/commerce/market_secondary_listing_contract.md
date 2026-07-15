# Market Secondary Listing Foundation Contract — 7.0x

```text
schema: market_secondary_listing_foundation_7_0x
storage: ws_market_secondary_listings_v1
campaign time: exact UTC timestamp
```

## Ownership

`js/market-secondary-listing-store.js` owns only the lifecycle and simulation state of secondary listings.

It owns:

- listing identity and revision;
- system-generated listing supply;
- condition snapshot and reference pricing;
- demand-check scheduling and resolution;
- automatic system-seller price reviews;
- listing expiry and simulated world-buyer sale;
- listing persistence and Campaign Data I/O participation.

It does not own:

- Catalog definitions;
- Market carts or MarketOrder;
- Billing capture, settlement or refund;
- ItemInstance creation, custody or transfer;
- player listing escrow;
- Housing delivery or pickup fulfillment.

`js/market-store.js` remains the canonical owner of checkout, orders, stock, fulfillment and recovery. `js/market-time-scheduler.js` remains the Market adapter to the shared World Time Scheduled Events queue.

## Listing record

```js
{
  schemaVersion: "market_secondary_listing_foundation_7_0x",
  listingId: "market_listing_system_...",
  marketOfferId: "market_offer_...",
  listingType: "SYSTEM_GENERATED",
  marketChannel: "SECONDARY",

  sellerRef: {
    type: "SYSTEM_VENDOR",
    id: "provider-secondary-exchange",
    displayName: "SECONDARY EXCHANGE"
  },

  definitionId: "...",
  catalogItemId: "...",
  sourceInstanceId: null,

  catalogReferencePrice: 8000,
  listedPrice: 5000,
  conditionSnapshot: 84,
  conditionFactor: 0.896,
  expectedUsedValue: 7168,
  priceAttractiveness: 0.6975,
  interestLabel: "HIGH",

  listedAt: "2109-04-12T10:37:00.000Z",
  expiresAt: "2109-04-16T18:00:00.000Z",
  lastDemandCheckAt: null,
  nextDemandCheckAt: "2109-04-12T13:37:00.000Z",
  lastPriceReviewAt: null,
  nextPriceReviewAt: "2109-04-13T10:37:00.000Z",

  pricingStrategy: "STEP_DOWN",
  demandProfile: "NORMAL",
  status: "ACTIVE",
  soldAt: null,
  expiredAt: null,
  saleResolution: null,
  priceHistory: [],
  revision: 1
}
```

System-generated records have `sourceInstanceId: null` in 7.0x. A physical ItemInstance is not created merely because a simulated listing exists.

## Lifecycle

```text
ACTIVE -> SOLD
ACTIVE -> EXPIRED
```

The schema reserves `RESERVED`, `WITHDRAWN` and `RECOVERY_REQUIRED` for later fulfillment and player-listing scopes, but 7.0x does not expose commands that enter those states.

A simulated sale sets:

```text
status: SOLD
saleResolution: WORLD_BUYER
soldAt: exact scheduled timestamp
```

Expiry occurs when the exact Campaign Time reaches `expiresAt`.

## Pricing

Condition factor:

```text
conditionFactor = 0.35 + 0.65 * condition / 100
```

Expected used value:

```text
expectedUsedValue = catalogReferencePrice * conditionFactor
```

Price attractiveness:

```text
priceAttractiveness = listedPrice / expectedUsedValue
```

System listing generation applies deterministic market variance in the range `0.70–1.15` to expected used value. Prices are rounded to a magnitude-appropriate credit increment.

Supported system-seller strategies:

```text
FIXED
STEP_DOWN
FAST_SALE
PATIENT
```

Player-controlled prices are not part of 7.0x.

## Demand checks

Demand uses a daily probability curve derived from price attractiveness. The probability for an individual scheduled interval is calculated from the daily probability rather than dividing by 24:

```text
hourly = 1 - (1 - dailyChance)^(1/24)
intervalChance = 1 - (1 - hourly)^intervalHours
```

Demand rolls and intervals are deterministic from listing identity, revision and scheduled timestamp. Reloading or replaying the same scheduled event cannot produce another result because the shared queue owns execution receipts.

Intervals are scheduled by attractiveness:

```text
very attractive: 1–4 h
normal:          3–8 h
overpriced:      6–18 h
niche:          12–36 h
```

## Scheduled event types

```text
MARKET_SECONDARY_DEMAND_CHECK
MARKET_SECONDARY_PRICE_REVIEW
MARKET_SECONDARY_LISTING_EXPIRES
MARKET_SECONDARY_REPLENISH
```

All events are registered through `registerMarketTimeEventHandler()` and scheduled through `scheduleMarketTimeEvent()`. No wall-clock timer or `setInterval` performs domain progression.

Stale events are valid no-op results. An event is stale when its scheduled timestamp no longer matches the listing's current `nextDemandCheckAt`, `nextPriceReviewAt` or `expiresAt`.

## Supply generator

The generator targets 12 active system listings by default and reconciles supply every six Campaign Time hours.

Generation:

- reads eligible physical catalog offers from Market Store;
- prefers definitions not currently active on the secondary market;
- assigns deterministic condition, duration, variance and seller strategy;
- schedules demand, review and expiry events immediately;
- never mutates Catalog, stock, ItemInstance or Citizen records.

## UI

Market exposes these top-level sections:

```text
CATALOG
SECONDARY
ORDERS
DELIVERED
```

`SECONDARY` is read-only in 7.0x. Cards show:

- listed and catalog price;
- price difference;
- expected used value;
- condition;
- exact expiry timestamp;
- seller strategy and interest label.

The purchase action is disabled and explicitly reports that secondary fulfillment is not implemented. UI must not emulate purchase by calling Catalog checkout.

## Persistence and import/export

Campaign Data I/O classifies these Market-owned keys as campaign-persistent:

```text
ws_market_secondary_listings_v1
ws_market_secondary_listings_schema
```

The shared World Time Scheduled Events domain persists event envelopes and execution receipts separately. Listing import preserves IDs, revisions and exact timestamps, then runs reconciliation.

## Required invariants

```text
one listingId = one listing record
ACTIVE listing has exact listedAt and expiresAt timestamps
terminal listing has no next demand or price-review timestamp
system listing generation does not create ItemInstance
world-buyer sale does not create MarketOrder
UI purchase remains disabled until canonical fulfillment exists
```

## Deferred scope

The following are explicitly deferred:

```text
player purchase and listing reservation
secondary MarketOrder fulfillment
physical ItemInstance creation/transfer
player listing creation
VENDOR escrow
seller payout and platform fee
withdrawal and return-to-owner recovery
notifications for player-owned listings
```
