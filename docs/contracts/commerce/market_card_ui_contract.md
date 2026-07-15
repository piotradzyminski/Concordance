# Market Card UI Contract

## Scope

This contract owns the presentation of Market catalog product cards and the text-only Product Inspector shell. It does not own Market offers, cart state, fulfillment, Billing, stock, ItemInstance, pickup, delivery or returns. Wishlist persistence and commands are defined by `market_wishlist_contract.md`.

## Card chrome

All product departments use one neutral terminal card style:

```text
graphite / near-black background
shared green-gray border
shared muted/text hierarchy
semantic status colors only
no category-tinted card backgrounds
no product images or generated artwork
```

Department identity is conveyed by text and catalog metadata, not by recoloring the card.

## Card actions

Every product card renders exactly three actions in this order:

```text
DETAILS
WISHLIST
ADD TO CART
```

`DETAILS` opens the existing Product Inspector. `ADD TO CART` uses the existing Market cart command. `WISHLIST` opens the named Wishlist drawer and stages the selected offer for insertion through the canonical Market Wishlist Store.

The card surface itself is not an implicit button. Only the explicit `DETAILS` control opens the inspector.

## Removed presentation layer

The following are not part of the active Market UI:

```text
assets/market/**
Equipment Catalog visualProfile
product visual resolver
category fallback artwork
image viewport in cards or Product Inspector
card CTAs for ADD FOR PICKUP or BUY + INSTALL
```

Pickup, service purchase and delivery runtime remain owned by their existing domain APIs. Their removal from the compact card CTA rail does not delete or replace those domain operations.

## Ownership constraints

- Equipment Catalog owns product identity and metadata, but no Market artwork field.
- Market Store remains the only owner of carts and orders.
- Housing and Product Inspector render projections only.
- Wishlist records are owned only by `js/market-wishlist-store.js`; cards and Product Inspector never persist favorites directly.
