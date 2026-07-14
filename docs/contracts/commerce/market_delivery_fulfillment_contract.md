# Market Delivery Fulfillment Contract

## Status

```text
schema: market_delivery_fulfillment_6_3x
owner: Market Store
phase: pre-alpha
```

## Ownership

`js/market-store.js` owns Market Shipment identity, lifecycle, ETA, retry/recovery state and the relation between `MarketOrder` and `ItemInstance` custody.

External ownership remains unchanged:

```text
Market Store                 order, shipment, stock reservation, fulfillment state
Billing Store                payment authorization, capture, void and refund
ItemInstance Store           physical item identity, owner, lifecycle and location
Housing Bridge / Grid        delivery placement reservation and final storage commit
Campaign Time                clock used to determine ETA eligibility
Admin Audit Store            operator audit record for forced debug processing
```

`js/housing.js` renders shipment state and dispatches commands. It does not own shipment records or write ItemInstance/Housing state directly.

## Canonical delivery lifecycle

```text
CHECKOUT
  -> MarketOrder FULFILLING
  -> ItemInstance VENDOR / PACKAGED
  -> Shipment PACKED
  -> Shipment IN_TRANSIT
  -> ETA reached or Admin DELIVER NOW
  -> Shipment PROCESSING
  -> Housing placement reservations
  -> ItemInstance MOVE to HOUSING_STORAGE / UNPACKAGED
  -> Housing placement commit
  -> Shipment DELIVERED
  -> MarketOrder COMPLETED
```

Failure branches:

```text
Housing capacity unavailable
  -> Shipment HELD
  -> ItemInstance remains VENDOR / PACKAGED

ItemInstance or Housing commit cannot be completed safely
  -> Shipment RECOVERY_REQUIRED
  -> persisted transaction/reservation receipts are reused by retry/reconciliation
```

## Shipment record

```js
{
  schemaVersion: 1,
  shipmentId,
  marketOrderId,
  citizenId,
  providerId,
  organizationLocationId,
  sourceAddress,
  destinationHousingId,
  destinationStorageId,
  destinationAddress,
  status,
  routeClass,
  shippingDays,
  instanceIds: [],
  placementReservations: [],
  custodyItemTransactionId,
  deliveryItemTransactionId,
  currentAttemptKey,
  deliveryAttemptCount,
  packedAt,
  inTransitAt,
  etaAt,
  processingAt,
  heldAt,
  deliveredAt,
  cancelledAt,
  holdReason,
  lastErrorCode,
  recoveryRequired,
  lastAdminAction,
  createdAt,
  updatedAt,
  revision
}
```

## Persistence

Shipments are stored with Market orders in:

```text
ws_market_orders_v1
```

Payload:

```js
{
  schemaVersion: 6,
  shipmentSchemaVersion: 1,
  orders: [],
  shipments: []
}
```

The shared payload preserves existing Campaign Data I/O ownership and avoids a parallel shipment store.

## Invariants

```text
1. One purchased unit keeps one instanceId from checkout through delivery.
2. Checkout does not place delivery items directly in Housing.
3. IN_TRANSIT, HELD and RECOVERY_REQUIRED delivery items remain in vendor custody unless the delivery ItemInstance transaction committed.
4. Housing placement is reserved only when the shipment is processed.
5. MarketOrder becomes COMPLETED only after ItemInstance movement and Housing placement commit both succeed.
6. HELD does not create an orphan item and does not release vendor custody.
7. Retry and reconciliation reuse persisted idempotency keys or start a new bounded attempt after released reservations.
8. Campaign Time processing and Admin delivery use the same canonical resolver.
9. Admin commands cannot bypass Housing capacity, ItemInstance ownership, revision or transaction validation.
10. Terminal Shipment states are DELIVERED and CANCELLED.
```

## Route and ETA

Market resolves delivery duration from the source and destination visible addresses. Configuration is owned by `data/market-offers.js`:

```js
deliveryFulfillment: {
  schemaVersion: 1,
  defaultShippingDays: 2,
  minShippingDays: 1,
  maxShippingDays: 30
}
```

Route classes may include:

```text
SAME_CHUNK
SAME_AGGLOMERATION_STANDARD
SAME_AGGLOMERATION_DIFFERENT_ZONE
INTER_AGGLOMERATION
*_CONTROLLED
```

ETA uses Campaign Time and is persisted on the shipment. Rendering the Market or Housing module must not advance or complete a shipment.

## Public API

```text
getMarketShipment(shipmentId)
getMarketShipments(filters)
getMarketOrderShipment(orderOrId)
getMarketShipmentActionState(shipmentOrId)
processMarketShipment(shipmentId, input)
retryMarketShipmentDelivery(shipmentId, input)
reconcileMarketShipment(shipmentId, input)
reconcileMarketShipments(input)
forceProcessMarketShipment(shipmentId, input)
```

## Campaign Time processing

`reconcileMarketShipments()` runs:

```text
- during Market Store initialization;
- in the deferred startup reconciliation pass;
- after ws:campaign-date-updated;
- through explicit recovery/debug commands.
```

Normal processing requires `Campaign Time >= etaAt`. `forceProcessMarketShipment()` may bypass ETA only after Admin authorization.

## Admin debug commands

Housing Market order details expose the following controls only to Admin:

```text
DELIVER NOW
RETRY DELIVERY
RECONCILE SHIPMENT
```

`DELIVER NOW` calls:

```js
forceProcessMarketShipment(shipmentId, {
  actor,
  reason,
  expectedRevision,
  idempotencyKey
});
```

Requirements:

```text
- actor role ADMIN;
- non-empty operator reason from the UI;
- revision guard;
- canonical shipment processor;
- persisted lastAdminAction;
- Admin Audit entry with MarketOrder, Shipment and ItemInstance transaction references.
```

The command skips remaining ETA only. It does not ignore storage capacity or transaction failures.

## Events

```text
ws:market-shipment-in-transit
ws:market-shipment-updated
ws:market-shipment-delivered
ws:market-order-updated
ws:item-instances-updated
```

Events contain stable IDs and monotonically increasing revision values. Replayed physical commits must not create duplicate ItemInstances.

## Recovery

### HELD

Use `retryMarketShipmentDelivery()` after capacity becomes available. A new placement attempt receives a new attempt key.

### RECOVERY_REQUIRED

Use `retryMarketShipmentDelivery()` or `reconcileMarketShipment()`. Persisted ItemInstance transaction and Housing reservation receipts determine whether the operation should replay, continue or start a new attempt.

### Startup

`reconcileMarketShipments()` evaluates non-terminal shipment records without mutating shipments whose ETA has not arrived.
