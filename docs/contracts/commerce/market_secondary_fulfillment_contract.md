# Market Secondary Fulfillment Contract

## Scope

This contract defines player purchase and return behavior for system-generated Secondary Market listings.

Implemented scope:

```text
Market Secondary Fulfillment 7.1x
```

Excluded scope:

```text
player-created listings
seller escrow
seller payout
platform fee
marketplace settlement
negotiation or auctions
service fulfillment
pickup fulfillment
```

## Ownership boundary

| Responsibility | Canonical owner |
|---|---|
| listing lifecycle, listing reservation and source-item listing custody | Market Secondary Listing Store |
| cart, quote, checkout, stock reservation, MarketOrder, shipment, return and recovery | Market Store |
| physical used item and ownership/location mutation | ItemInstance Store + ItemInstance Transaction Store |
| buyer charge and refund | Billing Store |
| delivery placement | Housing reservation/placement APIs |
| exact event execution | Market scheduler over World Time Scheduled Events |

The Secondary Listing Store does not create a cart, order, Billing transaction or shipment.

## One physical item invariant

Each purchasable system listing references one concrete ItemInstance:

```text
listing.sourceInstanceId
= cartLine.sourceInstanceId
= orderLine.sourceInstanceId
= shipment item instance ID
= delivered item instance ID
```

Secondary checkout uses an ItemInstance `MOVE` operation. It must not create a replacement ItemInstance.

The source ItemInstance is ownerless while listed and remains in vendor custody:

```js
{
  ownerId: "",
  lifecycleState: "PACKAGED",
  location: {
    type: "VENDOR",
    secondaryListingId,
    marketOfferId
  }
}
```

Condition, durability maximum override, hardware identity, firmware, modules, serial number and service history remain attached to the same ItemInstance.

## Offer and cart projection

A purchasable listing projects a dynamic Market offer with:

```text
offerSource = SECONDARY
quantity = 1
fulfillmentMode = DELIVER_TO_HOUSING
listingId
listingRevision
sourceInstanceId
sourceMarketOfferId
```

Secondary lines cannot be merged by definition alone. `listingId` and `sourceInstanceId` identify the singular cart line.

The first implementation is delivery-only. Secondary pickup and Service checkout are rejected.

## Reservation lifecycle

Checkout reserves both the Market stock envelope and the listing.

```text
ACTIVE
→ RESERVED
→ SOLD
```

Failed checkout before sale commit releases the listing:

```text
RESERVED
→ ACTIVE
```

The reservation has an exact Campaign Time expiry and is executed through the shared scheduled-event queue. Replay of the same reservation command or event is idempotent.

## Checkout order

Canonical delivery checkout sequence:

```text
1. quote cart
2. reserve Secondary listing
3. reserve Market stock envelope
4. authorize Billing
5. MOVE exact source ItemInstance to buyer-owned vendor transit custody
6. capture Billing
7. commit listing sale as PLAYER_BUYER
8. commit Market stock reservation
9. create MarketOrder and shipment
10. clear cart
```

The listing sale commit records:

```text
saleResolution = PLAYER_BUYER
saleMarketOrderId
saleCitizenId
saleBillingTransactionId
saleItemTransactionId
soldAt
```

## Compensation

Before listing sale commit, checkout failure must:

```text
compensate committed ItemInstance transaction when present
void Billing authorization when possible
release Market stock reservation
release listing reservation
preserve source ItemInstance and listing price/condition
```

A failed payment must not delete, duplicate or transfer the source item.

After an interrupted commit, reconciliation uses persisted Market, Billing, ItemInstance and listing receipts. Reentrant commands must return the prior result instead of repeating physical mutation.

## Delivery

The purchased item remains buyer-owned in `VENDOR` transit custody until shipment ETA. At delivery, Market Store moves the same ItemInstance into the reserved Housing destination.

```text
VENDOR / PACKAGED / owner = buyer
→ HOUSING_STORAGE / UNPACKAGED / owner = buyer
```

No second source or delivered ItemInstance is permitted.

## Returns

Full or selected-instance return uses the existing Market return/refund path. For a Secondary line:

```text
buyer Housing custody
→ ownerless Secondary vendor custody
```

The Secondary Listing Store restores listing-specific custody metadata after the generic ItemInstance return.

If the original listing is still within its listing window, return reopens the same listing and same source instance. Otherwise the listing expires and its source item is retired through the ItemInstance transaction boundary.

Return does not create a seller payout reversal in 7.1x because system listings have no citizen seller settlement.

## Persistence

The existing Secondary Listing Campaign Data I/O adapter persists listing, reservation and sale references. Market carts/orders/shipments and ItemInstance transactions remain in their existing domain adapters.

Import and startup reconciliation must preserve:

```text
listingId
marketOfferId
sourceInstanceId
MarketOrder references
Billing references
ItemInstance transaction references
revision
exact timestamps
```

## UI boundary

The Secondary workspace may add one available listing to the existing Market delivery cart. It does not execute checkout directly and does not create a parallel order screen.

Secondary cart lines:

```text
quantity controls disabled
quantity fixed to 1
concrete listing/source identity visible to runtime
```
