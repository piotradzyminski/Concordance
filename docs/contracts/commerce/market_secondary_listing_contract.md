# Market Secondary Listing Contract — 7.1x

```text
schema: market_secondary_fulfillment_7_1x
storage: ws_market_secondary_listings_v1
campaign time: exact UTC timestamp
```

This contract extends the 7.0x system-listing simulation with concrete source ItemInstance custody and player reservation/sale/return states. Checkout and physical fulfillment remain governed by `market_secondary_fulfillment_contract.md`.

## Ownership

`js/market-secondary-listing-store.js` owns:

- listing identity, revision and exact lifecycle timestamps;
- system-generated listing supply;
- condition snapshot and reference pricing;
- concrete source ItemInstance listing identity and vendor-custody metadata;
- listing reservation, release, sale resolution and return/reopen state;
- demand-check scheduling and resolution;
- automatic system-seller price reviews;
- listing expiry and simulated world-buyer sale;
- listing persistence and Campaign Data I/O participation.

It does not own:

- Catalog definitions;
- Market carts, MarketOrder, stock envelope or shipment;
- Billing capture, seller settlement or refund;
- ItemInstance transaction commit implementation;
- Housing placement;
- player listing creation or seller escrow.

`js/market-store.js` remains the canonical cart/order/stock/fulfillment owner. ItemInstance Store and ItemInstance Transaction Store remain the physical-item owners. `js/market-time-scheduler.js` remains the Market adapter to the shared World Time Scheduled Events queue.

## Listing record

```js
{
  schemaVersion: "market_secondary_fulfillment_7_1x",
  listingId: "market_listing_system_...",
  marketOfferId: "market_offer_secondary_...",
  sourceMarketOfferId: "market_offer_catalog_...",
  listingType: "SYSTEM_GENERATED",
  marketChannel: "SECONDARY",

  sellerRef: {
    type: "SYSTEM_VENDOR",
    id: "provider-secondary-exchange",
    displayName: "SECONDARY EXCHANGE"
  },

  definitionId: "...",
  catalogItemId: "...",
  sourceInstanceId: "item_secondary_...",

  catalogReferencePrice: 8000,
  listedPrice: 5000,
  conditionSnapshot: 84,
  conditionFactor: 0.896,
  expectedUsedValue: 7168,
  priceAttractiveness: 0.6975,
  interestLabel: "HIGH",

  listedAt: "2109-04-12T10:37:00.000Z",
  expiresAt: "2109-04-16T18:00:00.000Z",
  nextDemandCheckAt: "2109-04-12T13:37:00.000Z",
  nextPriceReviewAt: "2109-04-13T10:37:00.000Z",

  reservation: {
    reservationId: "",
    idempotencyKey: "",
    citizenId: "",
    cartId: "",
    marketOrderId: "",
    status: "NONE",
    reservedAt: null,
    expiresAt: null,
    committedAt: null,
    releasedAt: null,
    releaseReason: null
  },

  status: "ACTIVE",
  saleResolution: null,
  buyerRef: null,
  saleMarketOrderId: "",
  saleBillingTransactionId: "",
  saleItemTransactionId: "",
  returnCount: 0,
  revision: 1
}
```

## Concrete source custody

Each active system listing materializes one ownerless physical ItemInstance:

```text
sourceInstanceId is stable
ownerId is empty while listed
location.type = VENDOR
location.secondaryListingId = listingId
lifecycleState = PACKAGED
quantity = 1
condition = listing.conditionSnapshot
```

The source instance records the original condition as `durability.maximumOverride`. This prevents the generic return validator from treating the original used condition as new post-purchase damage.

A world-buyer sale or terminal listing expiry retires the ownerless source through ItemInstance transaction APIs. A player sale transfers the same source instance through Market fulfillment.

## Lifecycle

```text
ACTIVE -> RESERVED -> SOLD
ACTIVE -> SOLD          // WORLD_BUYER
ACTIVE -> EXPIRED
RESERVED -> ACTIVE      // release or failed checkout
RESERVED -> EXPIRED     // release after listing window
SOLD -> ACTIVE          // eligible player return
SOLD -> EXPIRED         // player return after listing window
any mutable state -> RECOVERY_REQUIRED
```

Player sale sets:

```text
saleResolution = PLAYER_BUYER
buyerRef = CITIZEN
saleMarketOrderId
saleBillingTransactionId
saleItemTransactionId
soldAt
```

Simulated sale sets:

```text
saleResolution = WORLD_BUYER
soldAt
```

## Reservation

A reservation is singular, exact-time and idempotent.

```text
reservation duration: 1 Campaign hour
```

Reservation requires:

- listing status `ACTIVE`;
- exact expected listing revision;
- valid ownerless source ItemInstance in listing vendor custody;
- one Citizen/cart identity;
- one idempotency key.

Reservation expiry is a scheduled Market event. If a qualifying MarketOrder already owns the reservation, expiry is a no-op. Otherwise the listing returns to `ACTIVE` or becomes `EXPIRED` when the original listing window has ended.

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

System generation applies deterministic market variance `0.70–1.15` and supports:

```text
FIXED
STEP_DOWN
FAST_SALE
PATIENT
```

Player-controlled prices remain outside 7.1x.

## Demand checks

Demand interval chance derives from daily probability:

```text
hourly = 1 - (1 - dailyChance)^(1/24)
intervalChance = 1 - (1 - hourly)^intervalHours
```

Demand rolls and intervals are deterministic from listing identity, revision and scheduled timestamp. `RESERVED` listings have no demand or price-review schedule.

## Scheduled event types

```text
MARKET_SECONDARY_DEMAND_CHECK
MARKET_SECONDARY_PRICE_REVIEW
MARKET_SECONDARY_LISTING_EXPIRES
MARKET_SECONDARY_REPLENISH
MARKET_SECONDARY_RESERVATION_EXPIRES
```

All events use `registerMarketTimeEventHandler()` and `scheduleMarketTimeEvent()`. No wall-clock timer or `setInterval` performs domain progression. Stale events are valid no-op results.

## Supply generator

The generator targets 12 active system listings by default and reconciles every six Campaign Time hours.

Generation:

- reads eligible physical catalog offers from Market Store;
- prefers definitions not currently active;
- assigns deterministic condition, duration, variance and seller strategy;
- materializes one concrete source ItemInstance;
- commits the listing only after source materialization succeeds;
- compensates source creation if listing persistence fails;
- schedules demand, review and expiry events immediately.

## Market offer projection

An active listing projects one dynamic Market offer:

```text
offerSource = SECONDARY
marketChannel = SECONDARY
stock.availableQuantity = 1
fulfillmentOptions = [DELIVER_TO_HOUSING]
pricing.finalPrice = listing.listedPrice
sourceInstanceId = listing.sourceInstanceId
```

The projection is not inserted as a second canonical catalog record. It is resolved by stable listing/offer identity through Market Store.

## UI

Market sections:

```text
CATALOG
SECONDARY
ORDERS
DELIVERED
```

An active listing with valid source custody exposes `ADD USED ITEM`. The command adds exactly one line to the existing Market delivery cart. Quantity editing, pickup and Service fulfillment are disabled for Secondary lines.

## Persistence and import/export

Campaign Data I/O persists:

```text
ws_market_secondary_listings_v1
ws_market_secondary_listings_schema
```

Import preserves IDs, exact timestamps, reservations, sale references and revisions, then runs reconciliation. Reconciliation materializes missing legacy 7.0 source instances and detects custody conflicts.

## Required invariants

```text
one listingId = one listing record
one active/reserved listing = one concrete sourceInstanceId
one sourceInstanceId cannot back two active listings
ACTIVE or RESERVED source is ownerless and in VENDOR custody
Secondary cart quantity is exactly one
player checkout MOVE does not CREATE the source item
world-buyer sale does not create MarketOrder
listing store does not create cart/order/shipment/Billing records
```

## Deferred scope

```text
player listing creation
seller ItemInstance escrow
seller payout and platform fee
marketplace settlement
withdrawal and return-to-owner recovery for player sellers
Secondary pickup
Secondary Service fulfillment
auctions and negotiation
player-listing notifications
```
