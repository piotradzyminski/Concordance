# Housing / Market Decoupling Contract 2.2x

## Ownership boundary

### Global Market module

`js/market.js` owns the player-facing commerce workspace:

- storefront and department navigation;
- Product Inspector and cart presentation;
- checkout, pickup, refund and partial-return commands;
- Market order inspection;
- shipment scheduling and reconciliation;
- selection of the target Housing unit for delivery.

The Market shell uses `js/housing-market-runtime.js` as a legacy-compatible renderer/command runtime. The historical `housing-market-*` function and CSS names are compatibility names only and do not imply Housing ownership.

### Housing module

`js/housing.js` owns the assigned unit and read-only logistics intake:

- Unit;
- Household;
- Storage;
- Deliveries.

Housing may project Market orders and shipments to explain incoming, held, delivered or failed logistics. Housing must not own offers, carts, checkout, order recovery, stock, refund or shipment execution.

## Module loading

The lazy bundles are independent:

```text
Market:
  Cyberware Market projection
  Market offers/store
  housing-market-runtime
  market shell

Housing:
  Housing storage runtime
  Household furnishing runtime
  Housing shell
```

Opening Housing must not load the Market catalog/runtime. Opening Market may load Housing-compatible storage projections required to choose a delivery target, but it must not render or mutate the Household floor plan.

## Navigation

Market notifications and `MARKET_ORDER` routes open module `market` directly and select the referenced order in the Orders view.

Housing buttons may open Market with:

```text
citizenId
deliveryHousingId
department
marketOrderId
```

The route is a navigation hint. Housing does not perform the Market command.

## Delivery bridge

Canonical flow:

```text
Market Order
→ Shipment
→ Housing delivery target
→ Housing Storage
```

Stable references:

```text
marketOrderId
shipmentId
citizenId
housingUnitId
storageUnitId
itemInstanceId
```

Market owns shipment creation, processing and recovery. Housing owns destination capacity/reservation and the final storage location. A delivery must preserve the same `ItemInstance` identity.

## Prohibited duplication

Do not add:

- a Housing-local Market catalog;
- a Housing-local cart or order store;
- a Market-local Housing/Household store;
- direct Market placement into `HOUSING_ROOM`;
- direct Housing price, stock or checkout calculations.

## UI contract

Market is a first-class module card. Housing tabs are:

```text
UNIT
HOUSEHOLD
STORAGE
DELIVERIES
```

`Deliveries` is read-only except for navigation to Market or Storage. Product browsing and order actions remain in Market.
