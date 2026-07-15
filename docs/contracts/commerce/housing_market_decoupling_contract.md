# Housing / Market Decoupling Contract 2.3x

## Ownership boundary

### Global Market module

`js/market.js` owns the standalone player-facing commerce shell. `js/market-workspace-runtime.js` owns its lazy renderer and command adapter.

The Market workspace provides:

- storefront and department navigation;
- Product Inspector and cart presentation;
- canonical checkout, pickup, refund and partial-return commands;
- canonical MarketOrder inspection;
- selection of the target Housing storage destination.

Market Store remains the owner of offers, carts, orders, stock, shipments, fulfillment and recovery. The workspace does not persist these records.

### Housing module

`js/housing.js` owns:

```text
UNIT
HOUSEHOLD
STORAGE
DELIVERIES
```

`DELIVERIES` is a read-only logistics projection. Housing may explain incoming, held, delivered or failed deliveries and navigate to Market or Storage. Housing does not own Market offers, carts, checkout, stock, order recovery, refund or shipment execution.

## Module loading

The lazy bundles are independent:

```text
Market:
  Cyberware Market projection
  Market offers/store
  market-workspace-runtime
  market shell

Housing:
  Housing storage runtime
  Household runtime
  Housing shell
```

Opening Housing must not load the Market Store or Market Workspace Runtime. Opening Market may read Housing storage projections required to select a destination, but it must not mutate Household floor-plan state directly.

## Navigation

Market notifications and `MARKET_ORDER` routes open module `market` directly and write only Market-owned transient navigation state:

```text
marketModeByCitizen
marketOrderViewByCitizen
marketSelectedOrderByCitizen
marketFiltersByCitizen
```

Housing may open Market with navigation hints such as `citizenId`, `deliveryHousingId`, `department` or `marketOrderId`. Housing does not perform the Market operation.

## Delivery bridge

Canonical flow:

```text
MarketOrder
→ Market Shipment
→ Housing reservation at execution
→ canonical ItemInstance MOVE
→ Housing Storage
```

Stable references:

```text
marketOrderId
shipmentId
citizenId
housingUnitId
storageUnitId
instanceId
```

Market Store owns shipment creation, scheduling, processing and recovery. Housing owns destination capacity/reservation and the final storage location. Delivery preserves the same `instanceId`.

## Legacy exclusion

The Market shell and workspace do not read or write:

```text
citizen.marketOrders
citizen.shipments
```

The retired `js/housing-market-runtime.js` path and its factory aliases must not be reintroduced.

## Prohibited duplication

Do not add:

- a Housing-local Market catalog;
- a Housing-local cart, order or shipment store;
- a Market-local Housing/Household store;
- direct Market placement into `HOUSING_ROOM`;
- direct Housing price, stock or checkout calculations;
- direct workspace mutation of ItemInstance or Billing records.
