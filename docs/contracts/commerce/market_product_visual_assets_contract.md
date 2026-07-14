# Market Product Visual Assets Contract

## Ownership

Product identity remains owned by Equipment Catalog. Market offers reference a catalog product through `catalogItemId` / `definitionId` and must not own, copy or override product artwork.

The canonical optional product visual field is:

```js
visualProfile: {
  thumbnail: "assets/market/products/example.svg",
  detail: "assets/market/products/example.svg",
  alt: "Accessible product visual description",
  fit: "CONTAIN"
}
```

`visualProfile` is normalized by `js/equipment-catalog-store.js` and copied into the existing read-only `catalogItem` projection carried by Market offers. No visual registry, Market asset store or second product catalog is introduced.

## Schema

| Field | Required | Meaning |
|---|---:|---|
| `thumbnail` | no | local asset used by the storefront card |
| `detail` | no | local asset used by Product Detail Inspector; falls back to `thumbnail` |
| `alt` | no | accessible description; falls back to the catalog product name |
| `fit` | no | `CONTAIN` or `COVER`; defaults to `CONTAIN` |

Product asset paths are application-root-relative local paths. Market product definitions must not depend on external URLs.

## Rendering

`js/housing.js` is the player-facing visual resolver.

```text
Catalog card      → visualProfile.thumbnail → visualProfile.detail → department fallback
Product Inspector → visualProfile.detail    → visualProfile.thumbnail → department fallback
```

Department fallbacks are read-only UI assets for:

```text
EQUIPMENT
CYBERWARE
MEDICAL
FOOD
HOUSEHOLD
DEFAULT
```

Fallback selection does not mutate Equipment Catalog or Market offers.

Catalog cards render one bounded lazy image inside the existing product-card button. Product Inspector renders the detail image inside the existing hero viewport. Closing or opening the inspector does not alter catalog filters, pagination, scroll ownership or Market state.

## Asset rules

- assets are stored under `assets/market/**`;
- SVG assets are self-contained and contain no scripts, external references or embedded runtime code;
- product visuals are presentation-only and do not affect item identity, stock, price, fulfillment, eligibility or ItemInstance state;
- Market offers do not define `marketImage`, `productImage`, `imageUrl`, `assetPath` or other competing visual fields;
- missing product artwork resolves to a department fallback without creating a compatibility store;
- asset failures must not create a new purchase command path or block existing Market commands.

## Starter coverage

The nineteen starter `MEDICAL`, `FOOD` and `HOUSEHOLD` consumables have dedicated local SVG visuals. Other Equipment and Cyberware products use department fallback assets until dedicated product artwork is added to their Equipment Catalog definitions.

## Validation

The Node contract harness verifies:

- every starter consumable visual path exists;
- Equipment Catalog normalization preserves one `visualProfile`;
- card and inspector rendering consume the canonical resolver;
- all department fallback assets exist;
- SVG assets are self-contained and contain no executable or external content.
