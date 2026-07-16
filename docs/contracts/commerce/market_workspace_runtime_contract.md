# Market Workspace Runtime Contract 7.1x

## Purpose

`js/market-workspace-runtime.js` is the lazy renderer and command adapter for the standalone Market module.

It owns only transient Market UI state and presentation:

```text
catalog filters
selected product
cart dialog state
selected MarketOrder
Catalog / Secondary / Orders mode
Ordered / Delivered order subview
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

Transient state normalization maps the retired presentation values without changing Market Store data:

```text
mode DELIVERED → mode ORDERS + order view DELIVERED
order view ACTIVE → ORDERED
order view HISTORY → DELIVERED
catalog department EQUIPMENT / MEDICAL / FOOD → GENERAL
```

The normalization is idempotent and affects only UI state.

## Workspace navigation

The primary Market navigation has exactly three sections:

```text
CATALOG
SECONDARY
ORDERS
```

`DELIVERED` is not a primary Market mode. `ORDERS` owns two internal views:

```text
ORDERED
DELIVERED
```

`ORDERED` contains every order not proven to have completed a successful fulfillment, including in-progress, held, recovery, failed and cancelled records. `DELIVERED` contains orders with a successful Housing delivery, completed vendor pickup or completed Service fulfillment. A later partial or full refund does not erase the fact that fulfillment occurred.

Back navigation resolves locally before leaving Market:

```text
open modal → close modal
ORDERS / DELIVERED → ORDERS / ORDERED
ORDERS / ORDERED or SECONDARY → CATALOG
CATALOG → module-level Back
```

## Catalog presentation groups

Catalog navigation uses a broad UI projection without changing Equipment Catalog identity:

```text
HOUSEHOLD
CYBERWARE
GENERAL
```

`HOUSEHOLD` includes furnishings, fixtures, furnishing modules, storage furniture, decorations, hygiene, cleaning and domestic supplies. `CYBERWARE` includes packaged and direct cyberware definitions. `GENERAL` contains Equipment, Medical, Food and all other catalog domains.

Original `category`, `subtype`, tags, definition IDs and offer linkage remain canonical. The grouping is renderer-owned and must not be persisted back into catalog definitions.

## Order summary projection

Collapsed order cards expose:

```text
STATUS
ETA or DELIVERED AT
TIME REMAINING
FULFILLMENT
DESTINATION
```

Successful fulfillment classification must use fulfillment state, not only whether an order status is terminal. Failed or cancelled orders remain in `ORDERED`.

ETA and remaining time are derived from persisted MarketOrder/MarketShipment records and the canonical exact Campaign Time. The workspace must not create a second timer or scheduler.

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

Market projections render full Campaign timestamps as `DD.MM.YYYY / HH:MM`. Date-only values remain readable during migration. Remaining time is calculated from `getCampaignTimeIso()` and the persisted ETA whenever the Market shell re-renders after `ws:campaign-time-updated`.

Formatting and countdown projection are presentation-only. They must not resolve, schedule, advance or mutate Market records. Exact event processing remains owned by Market Time Scheduler and World Time Scheduled Events.
