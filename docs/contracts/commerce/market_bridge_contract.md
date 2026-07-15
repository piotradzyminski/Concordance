# Market Bridge Foundation Contract

## Status

```text
IMPLEMENTED: patch_market_bridge_foundation_1.0x
IMPLEMENTED UI: patch_housing_market_storefront_ui_5.0x
IMPLEMENTED CHECKOUT: patch_market_checkout_fulfillment_3.0x
IMPLEMENTED ORDERS UI: patch_housing_market_orders_ui_4.0x
IMPLEMENTED READINESS: patch_market_bridge_readiness_4.1x
IMPLEMENTED HOUSING READINESS: patch_housing_bridge_readiness_4.2x
IMPLEMENTED RETURN/REFUND: patch_item_instance_transaction_compensation_6.2x
IMPLEMENTED MARKET-SERVICE FULFILLMENT: patch_market_service_fulfillment_4.3x
IMPLEMENTED PICKUP FULFILLMENT: patch_market_pickup_fulfillment_6.0x
IMPLEMENTED PARTIAL RETURN/REFUND: patch_market_partial_return_refund_6.1x
IMPLEMENTED WORKSPACE EXTRACTION: patch_market_workspace_extraction_6.4x
IMPLEMENTED DATETIME SCHEDULER: patch_market_datetime_scheduler_6.5x
CHECKOUT/FULFILLMENT: DELIVER_TO_HOUSING, PURCHASE_WITH_SERVICE AND PICKUP READY
```

## Domain ownership

- Equipment Catalog owns static product definitions.
- Market Store owns offers, offer indexes, cart drafts, MarketOrders, stock, shipments, pickup state and checkout validation boundary.
- Market Time Scheduler maps exact Market lifecycle timestamps to the shared World Time Scheduled Events queue.
- Billing owns authorization, capture, void and refund.
- ItemInstance Store owns physical item creation and mutation.
- Housing owns storage lookup, placement validation, reservation and commit.
- Housing UI consumes Market read/cart APIs and does not own offer construction.

## Offer identity

Every projected offer contains:

```text
marketOfferId
vendorProviderId
catalogItemId
definitionId
offerType
availability
stock
pricing
purchaseRequirements
fulfillmentOptions
revision
```

Default offers are deterministic projections over Equipment Catalog. `data/market-offers.js` contains commercial defaults and explicit overrides only. It must not duplicate product definitions.

## Campaign Time and scheduling

Market lifecycle timestamps are normalized to full UTC ISO-8601 values. Offer `activeFrom` / `expiresAt`, pickup `expiresAt`, shipment `etaAt` and Market record lifecycle fields use Campaign Time rather than wall-clock timers.

`js/market-time-scheduler.js` registers the `market-time-scheduler` handler with the shared persistent World Time Scheduled Events queue and maps:

```text
MARKET_OFFER_ACTIVATES
MARKET_OFFER_EXPIRES
MARKET_PICKUP_EXPIRES
MARKET_SHIPMENT_DUE
```

The queue owns event envelopes and receipts. Market Store remains the sole owner of domain mutation. Date-only legacy values normalize deterministically to midnight UTC; new records preserve exact hours and minutes.

## Indexes

Market Store maintains:

```text
offerById
offersByVendorProviderId
offersByCatalogItemId
```

Direct lookup by offer/catalog/provider ID must use these indexes. Rebuilding the offer projection is allowed only after Equipment Catalog invalidation or explicit Market invalidation.

## Public read API

```js
getMarketOffer(marketOfferId)
getMarketOfferByCatalogItemId(catalogItemId)
getMarketOffersByCatalogItemId(catalogItemId)
searchMarketOffers(filters)
getVendorOffers(providerId, filters)
getMarketCatalogItems(filters)
quoteMarketCart(cartOrId)
```

## Public cart API

```js
createMarketCart(citizenId)
getMarketCart(cartId)
getCitizenMarketCarts(citizenId, options)
getActiveMarketCart(citizenId, options)
updateMarketCart(cartId, changes)
flushMarketCartPersistence()
```

Cart state is independent from Market orders. Cart events contain IDs/revision only and do not invalidate Equipment:

```text
ws:market-cart-updated
ws:market-offers-invalidated
```

## Checkout boundary

```js
validateMarketOfferPurchaseRequirements(offerOrId, citizenId)
validateMarketCheckout({ cartId, idempotencyKey })
checkoutMarketCart(cartId, { idempotencyKey })
```

`checkoutMarketCart()` dispatches `DELIVER_TO_HOUSING` through the Housing fulfillment path, `PURCHASE_WITH_SERVICE` through the Market-Service path and `PICKUP` through vendor custody. Pickup creates the purchased ItemInstances once in `VENDOR / PACKAGED`; confirmation moves the same instances out of vendor custody without creating Housing reservations.

Required dependency set:

```text
createBillingIntent
authorizeBillingIntent
captureBillingIntent
voidBillingIntent
refundBillingTransaction
validateHousingPlacement
reserveHousingPlacement
commitHousingPlacement
releaseHousingPlacementReservation
flushHousingPlacementPersistence
createItemInstance
removeItemInstance
```

The command never falls back to direct `Citizen.credits`, legacy `citizen.marketOrders` / `citizen.shipments`, Billing history writes or parallel Equipment records. Offers with unresolved entitlement, license or access requirements remain blocked rather than bypassing authorization.

Checkout sequence:

```text
quote
→ stock reservation
→ Housing placement reservation
→ explicit Housing persistence flush
→ Billing intent create/authorize/capture
→ one ItemInstance per purchased unit
→ Housing placement commit
→ stock commit
→ explicit Housing persistence flush
→ Market order COMPLETED
→ one final ItemInstance update event
```

Compensation before completion:

```text
remove created ItemInstance records
release Housing reservations
release/rollback stock reservations
void Billing intent or refund captured transaction
mark Market order FAILED with compensationStatus = COMPLETED
refund failure → PAYMENT_RECOVERY_REQUIRED with compensationStatus = PARTIAL and compensationErrors[]
```

`PICKUP` uses deterministic vendor custody, reservation expiry and canonical ItemInstance transactions. `PURCHASE_WITH_SERVICE` uses deterministic provider/service linkage, direct `SERVICE` custody and linked Service Orders. Final Market capture and completion require the linked Service Orders to be `COMPLETED` and the purchased ItemInstances to have left temporary Service custody through the canonical physical transaction boundary.

## Performance invariants

- browsing, filtering, selection, cart update and quote never build EquipmentState;
- Market lookup by ID never rebuilds/clones the full Equipment Catalog;
- cart persistence is deferred and flushed on controlled lifecycle boundaries;
- rendering Market or Housing does not process due shipments or mutate stores;
- physical Equipment invalidation is reserved for final ItemInstance creation plus placement commit;
- one checkout retry key must eventually map to at most one Market order, Billing transaction and ItemInstance.

## Retired legacy boundary

The standalone Market workspace does not read or write `citizen.marketOrders` or `citizen.shipments`. `purchaseHousingMarketItem()`, `createMarketOrderAndShipment()` and the legacy Housing shipment scheduler are retired from the active Market workspace. Canonical Catalog, Cart, Orders, Delivery, Pickup and Recovery use Market Store APIs only.
## Housing Market Storefront UI 5.0x

Primary navigation:

```text
CATALOG
ORDERS
DELIVERED
```

`ORDERS` projects the active order view. `DELIVERED` projects the closed/history order view. They do not create parallel order stores.

Catalog storefront rules:

- catalog browsing is organized by departments: `ALL`, `EQUIPMENT`, `CYBERWARE`, `MEDICAL`, `FOOD`, `HOUSEHOLD`;
- department classification uses explicit `marketDepartment` / `department` first, then canonical product fields and tags;
- subcategories are generated from current catalog data rather than hard-coded option lists;
- future Medicine, Food and Household definitions may expose product-specific fields without changing the storefront structure;
- search and sort operate before pagination;
- page size is exactly six offers;
- only the current six-offer page is rendered;
- changing search, sort, department or subcategory resets the catalog to page 1;
- cards prioritize name, maker, short description, two product-type facts, price, availability and purchase action;
- routine values such as `REGISTERED`, `OPEN PURCHASE` and normal Housing delivery are not repeated as tags;
- restriction tags are reserved for controlled legality, access, entitlement, license and limited-stock conditions;
- `BUY + INSTALL` remains available only for complete `PURCHASE_WITH_SERVICE` linkage;
- no Catalog control calls `purchaseHousingMarketItem()`;
- render does not create a cart; an empty draft is created only after explicit `ADD TO CART`;
- cart drawer continues to use Market Store read/cart/quote/checkout APIs;
- storefront state is UI-only and does not alter Market offer, Billing, stock, Housing placement or ItemInstance ownership.

Performance invariant:

```text
rendered catalog product cards <= 6
```

Orders rules:

- canonical Market orders are projected by the standalone Market Workspace; Housing may expose read-only delivery intake;
- `ORDERS` shows active/recovery/refund-request records;
- `DELIVERED` shows completed/failed/cancelled/refunded/history records;
- rendering either view does not process shipments;


## Checkout / fulfillment 3.0x

Canonical runtime stores:

```text
ws_market_orders_v1
ws_market_stock_v1
ws_housing_placement_reservations_v1
```

Public Market API added:

```js
reserveMarketStock(input)
commitMarketStockReservation(reservationId)
releaseMarketStockReservation(reservationId, reason)
getMarketOrder(marketOrderId)
getMarketOrders(filters)
getCitizenMarketOrders(citizenId)
flushMarketOrderPersistence()
```

Public Housing API added:

```js
getHousingStorage(housingStorageId, citizenId)
validateHousingPlacement(input)
reserveHousingPlacement(input)
getHousingPlacementReservation(reservationId)
getHousingPlacementReservations(filters)
commitHousingPlacement(input)
releaseHousingPlacementReservation(reservationId, reason, options)
flushHousingPlacementPersistence()
validateHousingBridgeReadiness()
getHousingBridgeDiagnostics()
resetHousingBridgeDiagnostics()
```

Housing placement validation reads canonical ItemInstance location records for the selected citizen/storage plus active reservations. It does not build `EquipmentState`, full compatibility views or CyberGrid.

Market order event:

```text
ws:market-order-updated
```

Final physical mutation event:

```text
ws:item-instances-updated
```

One checkout key maps to at most one Market order, Billing capture and deterministic set of ItemInstance IDs. Order, stock and Housing reservation persistence failures restore the previous in-memory record and do not report a successful commit.

## Orders UI and post-checkout workflow 4.0x

Orders navigation inside Housing Market is split into:

```text
ACTIVE
HISTORY
```

Canonical order cards group all lines by `marketOrderId` and expose:

```text
status
vendorProviderId
createdAt / completedAt
paymentStatus
billingIntentId
billingTransactionId
fulfillmentMode
destinationRef.housingStorageId
createdItemInstanceIds
failureCode
compensationErrors
revision
```

Public Market API added:

```js
getMarketOrderActionState(orderOrId)
cancelMarketOrder(marketOrderId, input)
retryMarketOrderCancellation(marketOrderId, input)
requestMarketOrderRefund(marketOrderId, input)
withdrawMarketOrderRefundRequest(marketOrderId, input)
executeMarketOrderRefund(marketOrderId, input)
retryMarketOrderRefund(marketOrderId, input)
quoteMarketOrderPartialReturn(marketOrderId, input)
requestMarketOrderPartialReturn(marketOrderId, input)
withdrawMarketOrderPartialReturn(marketOrderId, partialReturnId, input)
executeMarketOrderPartialReturn(marketOrderId, partialReturnId, input)
retryMarketOrderPartialReturn(marketOrderId, partialReturnId, input)
retryMarketOrderCheckout(marketOrderId, input)
```

### Cancellation boundary

`cancelMarketOrder()` is available only before physical fulfillment has created ItemInstances. It releases known Housing and stock reservations and voids or refunds Billing through canonical APIs. It never edits Citizen balance, ItemInstance fields or Housing occupancy directly.

Cancellation is blocked when:

```text
order is final
ItemInstance fulfillment already exists
payment recovery is required
cancellation is already processing
```

### Refund and return boundary

`requestMarketOrderRefund()` remains a read/validation receipt. It records a request only when every purchased ItemInstance:

```text
still exists
belongs to the same marketOrderId
remains in HOUSING_STORAGE
has lifecycle UNPACKAGED or STORED
has no service history
has unchanged condition
```

`executeMarketOrderRefund()` performs the full-order return:

```text
persist refund PROCESSING state
→ one ItemInstance transaction moves all returned records HOUSING_STORAGE → VENDOR
→ one stock-return commit restores sold quantity
→ Billing refund through refundBillingTransaction()
→ Market order REFUNDED
```

The same physical records and `instanceId` values are preserved. No replacement item is created and the player cannot retain both the item and refunded credits.

Recovery rules:

```text
stock persistence failure
→ compensate ItemInstance return back to the exact before snapshots
→ no Billing refund

Billing refund failure
→ keep ItemInstances in VENDOR custody
→ keep stock restored
→ MarketOrder PAYMENT_RECOVERY_REQUIRED
→ retry only the Billing/finalization phase

later ItemInstance change after commit
→ compensation rejected with snapshot conflict
```

Refund execution stores:

```text
refundRequest.executionIdempotencyKey
refundRequest.itemTransactionId
refundRequest.billingRefundTransactionId
refundRequest.errors[]
```

`retryMarketOrderRefund()` reuses the committed item transaction and returned stock when only Billing recovery remains. It does not duplicate the physical transfer or refund transaction.

### Partial return and proportional refund boundary — 6.1x

Partial returns are stored in `MarketOrder.partialReturns[]`. Each operation selects concrete physical instances rather than only a requested quantity:

```text
partialReturnId
status
requestIdempotencyKey
withdrawIdempotencyKey
executionIdempotencyKey
returnInstanceIds[]
lineReceipts[]
requestedAmount
itemTransactionId
billingRefundTransactionId
errors[]
requestedAt / processingAt / completedAt
```

A line receipt binds the selected physical units to the original order line and stock reservation:

```text
marketOrderLineId
marketOfferId
stockReservationId
quantity
instanceIds[]
refundAmount
stockReturnReceiptId
```

`quoteMarketOrderPartialReturn()` validates every selected ItemInstance against the same physical return constraints as a full refund and rejects already returned instances. The refund amount is derived from the original line total. The last remaining units of a line consume the exact remaining line amount, preventing rounding drift across repeated partial returns.

`executeMarketOrderPartialReturn()` performs one recoverable sequence:

```text
persist partial return PROCESSING
→ one ItemInstance transaction moves only selected records HOUSING_STORAGE → VENDOR
→ per-line stock receipts restore only selected quantities
→ Billing refunds exactly partialReturn.requestedAmount
→ partial return COMPLETED
→ order remains COMPLETED / PARTIALLY_REFUNDED while any units remain
→ order becomes REFUNDED only after all ItemInstances and captured value are returned
```

The same `instanceId` values are preserved. Unselected units stay in their existing Housing location and remain owned by the Citizen. Stock reservations track `returnedQuantity` and immutable `returnReceipts[]`; status becomes `PARTIALLY_RETURNED` until the full reserved quantity has been restored.

Recovery rules:

```text
ItemInstance return failure
→ no stock mutation and no Billing refund

stock persistence failure
→ compensate the committed ItemInstance transaction
→ keep partial return RECOVERY_REQUIRED
→ no Billing refund

Billing refund failure
→ keep selected ItemInstances in VENDOR custody
→ keep selected stock restored
→ MarketOrder PAYMENT_RECOVERY_REQUIRED
→ retry only Billing/finalization with the same execution key

startup with PROCESSING operation
→ reconcile committed ItemInstance transaction, stock receipts and Billing refund
→ finalize if all receipts exist
→ otherwise mark RECOVERY_REQUIRED
```

`retryMarketOrderPartialReturn()` reuses persisted line receipts, ItemInstance transaction IDs, stock-return receipt keys and Billing idempotency keys. It does not revalidate already returned items as if they were still in Housing and does not duplicate any physical or financial mutation.

### Performance invariants

- switching `ACTIVE/HISTORY` changes only Housing Market UI state;
- expanding order details uses indexed `getMarketOrder()` and direct ItemInstance lookups;
- cancellation/refund request does not build EquipmentState or CyberGrid;
- order rendering performs no Billing, stock, Housing or ItemInstance mutation;
- legacy shipment processing remains an explicit legacy-only action.

### Remaining blockers

```text
admin refund approval/rejection tooling
```
## Market Bridge Readiness 4.1x

Market order schema version is `5`. Existing `ws_market_orders_v1` records are normalized in place; the storage key remains stable. Missing Pickup and partial-return fields receive canonical defaults without generating duplicate orders, ItemInstances or transactions.

### Lifecycle guard

Market order status writes are validated against an explicit transition map. Status updates may remain on the current state for metadata-only operations, but checkout and recovery commands cannot regress an order to an earlier phase.

```text
DRAFT → RESERVING → AUTHORIZED → FULFILLING → COMPLETED
                         ↘ FAILED / PAYMENT_RECOVERY_REQUIRED
COMPLETED → RETURNING → COMPLETED for a partial return
COMPLETED → RETURNING → REFUNDED when every purchased unit and captured credit is returned
RETURNING → PAYMENT_RECOVERY_REQUIRED when Billing refund must be retried
PAYMENT_RECOVERY_REQUIRED → RETURNING for idempotent recovery
pre-fulfillment states → CANCELLED
```

Every persisted mutation must increase `revision`. UI commands send `expectedRevision`; stale actions return `MARKET_ORDER_REVISION_CONFLICT`.

### Retry and recovery

`retryMarketOrderCheckout()` resumes the same deterministic checkout from its persisted phase. It reuses the original order idempotency key and does not rewrite `FULFILLING` or `AUTHORIZED` back to `RESERVING`.

`retryMarketOrderCancellation()` resumes a cancellation with `cancellation.status = RECOVERY_REQUIRED`. Reservation release and Billing settlement remain idempotent. Billing recovery checks the canonical intent/transaction state before issuing a new void/refund command.

A cancellation left in `PROCESSING` across reload is reconciled during Market Store initialization to `RECOVERY_REQUIRED`; no render path performs this mutation.

### Refund request receipts

Refund request and withdrawal maintain separate receipt keys:

```text
refundRequest.requestIdempotencyKey
refundRequest.withdrawIdempotencyKey
```

The same key returns `IDEMPOTENT_REPLAY`. A different key against an already active request returns `MARKET_ORDER_REFUND_ALREADY_REQUESTED` without a revision increment or duplicate event.

### Order index and targeted events

Market Store maintains an in-memory index from checkout `idempotencyKey` to `marketOrderId`; checkout replay does not scan the full order collection.

`ws:market-order-updated` now includes:

```text
eventId
changedFields
changedDomains = [MARKET_ORDER]
revision
```

Duplicate order events with the same or older revision are suppressed. Final checkout emits one stock event and one consolidated ItemInstance event per completed order revision. Neither event listener path calls `getEquipmentState()` directly.

### Readiness diagnostics

Public diagnostics:

```js
validateMarketBridgeReadiness()
getMarketBridgeDiagnostics()
resetMarketBridgeDiagnostics()
reconcileInterruptedMarketOrderOperations()
```

Diagnostics count checkout/retry operations, cancellation recovery attempts, full and partial refund request/return recovery, ItemInstance transaction reuse and emitted/suppressed events. They do not build EquipmentState or render UI.

### Market state after ItemInstance Transaction 6.2x

Immediate Housing purchase, Pickup fulfillment, full-order refund and selected-instance partial return/refund are implemented. Remaining approval/rejection tooling belongs to the Admin scope and must consume the same Market command boundary rather than writing order state directly.



## Housing Bridge Readiness 4.2x

Housing placement ownership moved from lazy `js/housing.js` into eager `js/housing-bridge-store.js`.

Entrypoint order:

```text
billing-store.js
housing-bridge-store.js
market-store.js
service-bridge-store.js
```

Housing UI remains lazy and consumes the public store API.

Reservation schema version is `2`. Existing `ws_housing_placement_reservations_v1` payloads are normalized in place and missing revisions default to `1`.

Indexes:

```text
reservationById
reservationByIdempotencyKey
reservationsByCitizenId
reservationsByHousingStorageId
```

Reservation lifecycle:

```text
RESERVED -> COMMITTED
RESERVED -> RELEASED
COMMITTED -> ROLLED_BACK
```

Commands support `expectedRevision`; stale writes return `HOUSING_RESERVATION_REVISION_CONFLICT`. Mutation events include deterministic `eventId`, revision data, changed fields and `changedDomains = [HOUSING]`.

Reservation persistence is deferred. Market explicitly flushes Housing after all reservations are created, after all placements are committed, and after cancellation/compensation releases. A failed explicit flush restores the last durable Housing reservation snapshot; Market treats the flush failure as transaction failure and runs compensation.

Public targeted occupancy read:

```js
getHousingStorageOccupancy({ citizenId, housingStorageId, excludeReservationId })
```

The read uses canonical ItemInstance locations and active reservation indexes. It does not build EquipmentState, compatibility projections or CyberGrid.

Housing readiness diagnostics:

```js
validateHousingBridgeReadiness()
getHousingBridgeDiagnostics()
resetHousingBridgeDiagnostics()
```

Housing has no remaining eager-loading or placement-readiness blocker for World Bridge 14.0x.


## Market-Service Fulfillment 4.3x

Schema marker:

```text
market_service_fulfillment_4_3x
```

Deterministic offer linkage is owned by Market configuration and offer projection:

```text
marketOfferId
→ linkedServiceDefinitionIds[]
→ linkedServiceProviderIds[]
```

The default Cyberware path uses `svc-cyberware-install-standard`. Manufacturer mappings provide ordered provider candidates; `providerSupports(providerId, "CYBERWARE_INSTALL")` selects the first valid provider.

Checkout flow:

```text
quote
→ stock reservation
→ Market Billing intent create + authorize
→ exactly one ItemInstance created directly in SERVICE custody
→ Service Offer create
→ Service Order create + authorize + schedule
→ Market order FULFILLING / payment AUTHORIZED
```

Canonical temporary custody contains:

```text
location.type = SERVICE
serviceOrderId
providerId
marketOrderId
marketOrderLineId
```

The purchased item does not pass through Housing or CyberGrid before installation. The same `instanceId` must be committed to BODY by the future orchestrator through the existing ItemInstance transaction API.

Finalization:

```text
all linked Service Orders COMPLETED
+ all purchased ItemInstances left SERVICE custody
→ Market Billing capture
→ stock commit
→ Market order COMPLETED
```

Failure before the physical item leaves controlled Service custody performs:

```text
void/refund linked Service Billing
re-read linked ServiceOrder after Billing settlement
cancel linked ServiceOrder using fresh expectedRevision
remove temporary SERVICE-custody ItemInstance only after ServiceOrder terminal transition succeeds
release stock
void/refund Market Billing
mark Market order FAILED or PAYMENT_RECOVERY_REQUIRED
```

The compensation order is deliberate. Services reject terminal cancellation while a payable order still has active Billing authorization or captured payment. Market must therefore settle linked Service Billing first, re-read the ServiceOrder, and only then call the terminal Service command with the current revision. If terminal Service cancellation fails, Market must not delete the temporary ItemInstance, because that would leave an active ServiceOrder pointing at a removed subject instance.

If the item has already left Service custody, Market refuses unsafe deletion and records `PAYMENT_RECOVERY_REQUIRED` for the future shared operation/recovery layer.

Public API added:

```js
getMarketOrderByServiceOrderId(serviceOrderId)
finalizeMarketServiceFulfillment(marketOrderId, input)
failMarketServiceFulfillment(marketOrderId, reasonCode, input)
reconcileMarketServiceFulfillment()
```

Market listens to terminal Service events only to update/finalize its own order. Service and Billing status events do not emit Equipment/CyberGrid refreshes. Physical invalidation remains owned by ItemInstance transaction events.

The Market UI adds an explicit `BUY + INSTALL` action. Housing Market projection must preserve both `linkedServiceDefinitionIds[]` and `linkedServiceProviderIds[]`; otherwise a backend-ready offer would render as `SERVICE UNAVAILABLE`. `DELIVER_TO_HOUSING` and `PURCHASE_WITH_SERVICE` cannot be mixed in one cart.

Readiness exposes three separate flags:

```text
marketServiceBackendReady
marketServiceUiReady
marketServiceRecoveryReady
```

`marketServiceUiReady` covers offer projection and provider linkage required by `BUY + INSTALL`. `marketServiceRecoveryReady` covers interrupted cancellation, retry/refund idempotency and active ServiceOrder subject references to removed ItemInstances.


## Shared World Bridge Operation Recovery 1.0x integration

`js/world-bridge-operation-store.js` is installed as the canonical durable coordination record for future cross-domain orchestrators. Market remains the owner of MarketOrder and stock; the operation store keeps only stable references, checkpoints, claims and recovery metadata.

Market rendering and status-only operation events must not invalidate Equipment or CyberGrid. The Cyberware World Bridge orchestrator may attach MarketOrder and ServiceOrder references through the public operation API, but must not create a second Market lifecycle.


## Starter consumable catalog 5.1x

Medical, Food and Household starter products are canonical Equipment Catalog definitions. Each consumable uses stable product identity plus a normalized `consumableProfile` projection:

```text
marketDepartment
marketSubcategory
packageQuantity / packageLabel
dose / duration
shelfLife / mealUnits / rationClass
```

`js/equipment-catalog-store.js` normalizes these fields. Housing Market reads them through the existing catalog/offer projection; it does not create a consumable store, consumption runtime or effect resolver. Unit / Storage / Market and Catalog / Orders / Delivered navigation uses the shared `system-segment-tile` contract from `css/system-tabs.css`. Commerce actions remain owned by Market, Billing, Housing, Services and ItemInstance public APIs.
