# Market Wishlist Contract

## Scope

Market Wishlists are Citizen-owned, campaign-persistent shopping lists. They store references to active Market offers and desired quantities. They do not reserve stock, authorize Billing, create ItemInstances or create orders.

## Canonical record

```js
{
  schemaVersion: 1,
  wishlistId: "market-wishlist-...",
  citizenId: "citizen-a",
  name: "Neural Upgrades",
  lines: [
    {
      wishlistLineId: "wishlist-line-...",
      marketOfferId: "market-offer-...",
      quantity: 1,
      addedAt: "...",
      updatedAt: "..."
    }
  ],
  createdAt: "...",
  updatedAt: "...",
  revision: 1
}
```

Persistence key:

```text
ws_market_wishlists_v1
```

The key is part of the existing `market` Campaign Data I/O domain and pre-alpha reset manifest.

## Ownership

- `js/market-wishlist-store.js` owns wishlist records, names, lines, quantities and persistence.
- `js/market-store.js` remains the sole owner of carts, quotes, stock, orders and fulfillment.
- `js/market-workspace-runtime.js` renders wishlist controls and invokes public APIs only.
- Equipment Catalog and Market offers remain product identity and availability sources.

## Commands

Public APIs:

```text
getMarketWishlist
getCitizenMarketWishlists
createMarketWishlist
renameMarketWishlist
deleteMarketWishlist
addMarketWishlistLine
setMarketWishlistLineQuantity
removeMarketWishlistLine
clearMarketWishlist
moveMarketWishlistToCart
getMarketWishlistStoreSnapshot
```

Names are required, trimmed, limited to 48 characters and unique per Citizen case-insensitively. A wishlist contains at most one line per Market offer; repeated additions increase quantity up to 99.

## Move to cart

`moveMarketWishlistToCart()` performs one cart update containing all wishlist lines. Every moved line uses:

```text
fulfillmentMode = DELIVER_TO_HOUSING
housingStorageId = active Market delivery target
```

The operation is blocked when:

- the wishlist is empty;
- no Housing Storage target exists;
- a referenced Market offer no longer exists;
- the active draft cart uses Pickup or Purchase With Service fulfillment;
- merging a matching cart line would exceed the canonical quantity limit of 99.

On successful cart update, the wishlist is cleared but not deleted. The same named list can be reused. Wishlist movement does not reserve stock or guarantee checkout eligibility; the canonical cart quote remains responsible for current stock, vendor, currency, eligibility and fulfillment blockers.

## Modal behavior

Product Inspector, Wishlist drawer and Cart drawer are viewport-fixed modal layers. Exactly one layer is active. The active layer:

- locks root and body scrolling;
- removes the transformed/filtered screen containing block;
- isolates background content with `inert`;
- traps keyboard focus;
- closes through `CLOSE`, backdrop, `Escape` or module Back hierarchy;
- restores focus to its launcher when possible.
