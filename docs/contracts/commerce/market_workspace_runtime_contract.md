# Market Workspace Runtime Contract 6.4x

## Purpose

`js/market-workspace-runtime.js` is the lazy renderer and command adapter for the standalone Market module.

It owns only transient Market UI state and presentation:

```text
catalog filters
selected product
cart dialog state
selected MarketOrder
Catalog / Orders / Delivered mode
order, refund, pickup and delivery command controls
```

It does not own commerce persistence or cross-domain mutation.

## Factory boundary

The only runtime factory is:

```text
createMarketWorkspaceRuntime(config)
```

The Market shell exposes:

```text
ensureMarketRuntime()
renderMarketModule()
```

The following aliases are prohibited:

```text
createHousingMarketRuntime
housingMarketRuntime
ensureHousingMarketRuntime
```

## Transient state

Market-owned transient state uses only:

```text
marketModeByCitizen
marketOrderViewByCitizen
marketSelectedOrderByCitizen
marketSelectedProductByCitizen
marketFiltersByCitizen
marketCartOpenByCitizen
marketSearchDebounce
```

No migration is required for the previous transient keys in pre-alpha.

## Canonical domain ownership

| Concern | Owner |
|---|---|
| Offers, carts, orders, stock, shipments, pickup, refunds | `js/market-store.js` |
| Market workspace rendering and UI commands | `js/market-workspace-runtime.js` |
| Physical item identity and mutation | ItemInstance Store / ItemInstance Transaction Store |
| Credits, authorization, capture and refunds | Billing Store |
| Destination storage and placement reservation | Housing Store / Housing Grid Engine |
| Campaign clock | Campaign Time |
| exact Market event mapping | `js/market-time-scheduler.js` |
| persistent event envelope/receipt | World Time Scheduled Events |

The workspace reads canonical Market Store APIs and must not persist a competing order or shipment collection.

## Prohibited legacy paths

The Market shell and workspace must not read or write:

```text
citizen.marketOrders
citizen.shipments
```

They must not expose or call:

```text
purchaseHousingMarketItem
createMarketOrderAndShipment
processDueHousingMarketShipments
processDueHousingMarketShipmentsForCitizen
retryHeldHousingShipment
```

The workspace does not schedule or execute Campaign Time events. `js/market-time-scheduler.js` delivers exact boundaries through canonical Market Store APIs:

```text
processMarketShipment
retryMarketShipmentDelivery
reconcileMarketShipment
reconcileMarketShipments
forceProcessMarketShipment
```

## Housing boundary

Housing remains the owner of Unit, Household, Storage and the read-only Deliveries intake. It may navigate to Market or Storage but does not load the Market workspace runtime and does not execute Market commands.

## Bundle boundary

```text
Market lazy bundle:
  Cyberware Market Projection
  Market offers
  Market Store
  Market Workspace Runtime
  Market shell

Housing lazy bundle:
  Housing stores and adapters
  Housing Storage Runtime
  Housing Household Runtime
  Housing shell
```

`js/housing-market-runtime.js` is retired through `DELETE_FILES.txt`.


## Datetime projection

Market and Housing projections render full Campaign timestamps as `DD.MM.YYYY / HH:MM`. Date-only values remain readable during migration. Formatting is presentation-only and must not resolve, schedule or mutate Market records.
