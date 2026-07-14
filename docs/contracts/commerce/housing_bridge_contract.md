# Housing Bridge Contract

## Status

```text
IMPLEMENTED: patch_housing_bridge_readiness_4.2x
SCHEMA: housing_bridge_schema_2
STORE: js/housing-bridge-store.js
UI: js/housing.js
PERSISTENCE: ws_housing_placement_reservations_v1
```

## Ownership

`js/housing-bridge-store.js` is the canonical owner of:

- normalized Housing records and storage units;
- targeted storage lookup;
- targeted occupancy reads;
- placement validation;
- placement reservation lifecycle;
- reservation indexes;
- reservation revisions and events;
- deferred reservation persistence and recovery.

`js/housing.js` owns Housing rendering, interaction state, storage UI, Market UI and legacy shipment presentation. It must not redefine or persist placement reservations.

## Eager dependency boundary

The bridge store is loaded from `index.html` after Citizen/ItemInstance/Billing foundations and before Market and Services:

```text
store.js
billing-store.js
housing-bridge-store.js
market-store.js
service-bridge-store.js
```

Housing UI remains lazy-loaded. World Bridge consumers may use Housing placement APIs before the Housing module has ever been opened.

## Public read API

```js
resolveHousingStorageProfile(record)
getCitizenHousingRecords(citizenOrId)
getHousingStorage(housingStorageId, citizenId)
getHousingStorageOccupancy(input)
getHousingPlacementReservation(reservationId)
getHousingPlacementReservations(filters)
validateHousingPlacement(input)
```

`getHousingStorageOccupancy()` and `validateHousingPlacement()` read canonical ItemInstance locations through `getCitizenEquipmentItemInstances(citizenId)`. They do not call `getEquipmentState()`, compatibility view builders, CyberGrid renderers or Housing UI.

## Public command API

```js
reserveHousingPlacement(input)
commitHousingPlacement(input)
releaseHousingPlacementReservation(reservationId, reason, options)
flushHousingPlacementPersistence()
```

All reservation commands are idempotent and revision-aware.

### Reserve input

```js
{
  reservationId,
  citizenId,
  housingStorageId,
  definitionId,
  marketOrderId,
  idempotencyKey,
  expectedRevision
}
```

### Commit input

```js
{
  reservationId,
  instanceId,
  marketOrderId,
  expectedRevision
}
```

A commit is accepted only when the referenced canonical ItemInstance already has the exact reserved `HOUSING_STORAGE` owner, storage unit, grid coordinates and rotation.

## Reservation lifecycle

```text
RESERVED -> COMMITTED
RESERVED -> RELEASED
COMMITTED -> ROLLED_BACK
```

Terminal states:

```text
RELEASED
ROLLED_BACK
```

Repeated commands against the same final state return `IDEMPOTENT_REPLAY`. Invalid regressions return `HOUSING_RESERVATION_TRANSITION_REJECTED`.

Each mutation increments `revision`. Commands with stale `expectedRevision` return:

```text
HOUSING_RESERVATION_REVISION_CONFLICT
```

## Indexes

The store maintains:

```text
reservationById
reservationByIdempotencyKey
reservationsByCitizenId
reservationsByHousingStorageId
```

Replay and filtered reads do not scan the full reservation collection.

## Event contract

Mutation event:

```text
ws:housing-placement-reservation-updated
```

Payload:

```js
{
  eventId,
  reservationId,
  citizenId,
  housingStorageId,
  marketOrderId,
  instanceId,
  status,
  previousStatus,
  revision,
  previousRevision,
  changedFields,
  changedDomains: ["HOUSING"]
}
```

`eventId` format:

```text
housing-placement:{reservationId}:{revision}
```

The same event ID is emitted at most once per runtime.

Persistence recovery event:

```text
ws:housing-placement-persistence-recovered
```

This event indicates that an unpersisted in-memory mutation was rolled back to the last durable snapshot.

## Persistence

Reservation mutation path:

```text
in-memory mutation
-> indexes updated
-> domain event
-> dirty flag
-> deferred persistence
```

Persistence is flushed on:

- explicit `flushHousingPlacementPersistence()`;
- `pagehide`;
- document visibility transition to hidden.

Market uses explicit flushes at transaction boundaries:

```text
all Housing reservations created
-> flush Housing
-> Billing authorization/capture

all ItemInstances placed and reservations committed
-> flush Housing
-> ItemInstance persistence flush
-> Market order completion
```

Release/compensation and cancellation also flush Housing before reporting completion.

A persistence failure restores the last durable reservation snapshot, rebuilds all indexes and returns `false` from the explicit flush.

## Diagnostics

```js
validateHousingBridgeReadiness()
getHousingBridgeDiagnostics()
resetHousingBridgeDiagnostics()
```

Diagnostics cover:

- storage lookups;
- occupancy reads;
- placement validations;
- reservation reads/writes;
- idempotent replays and conflicts;
- revision conflicts;
- lifecycle rejections;
- emitted/suppressed events;
- persistence schedules, flushes, failures and rollbacks.

The readiness validator checks record invariants, indexes, revisions, statuses and public API availability. It performs no business mutation.

## Performance invariants

```text
placement validation -> EquipmentState builds: 0
occupancy read -> compatibility ItemInstance views: 0
reservation replay -> full reservation scan: 0
render Housing -> placement mutation: 0
```

Housing domain events do not trigger global Equipment or CyberGrid refreshes. Physical Equipment invalidation remains owned by the final ItemInstance commit event.

## Remaining external blockers

Housing is ready for immediate storage placement. The canonical ItemInstance transaction boundary, Market return/refund, Market-Service fulfillment and shared World Bridge operation/recovery store are installed outside Housing ownership. `PURCHASE_WITH_SERVICE` uses direct `SERVICE` custody and does not require a transient Housing placement.

No Housing-owned implementation blocker remains for Cyberware World Bridge 14.0x.

## Housing Market projection fix 4.4x

`js/housing.js` is the lazy Housing Market renderer and must preserve Market-Service linkage fields when normalizing projected Market catalog rows:

```text
linkedServiceDefinitionIds[]
linkedServiceProviderIds[]
```

The renderer may use these fields to enable `BUY + INSTALL` for `PURCHASE_WITH_SERVICE` offers. Housing does not own Service selection, ServiceOrder lifecycle, Billing, ItemInstance custody or Market compensation. Those remain Market/Services/ItemInstance ownership boundaries.

## Housing Grid Engine Unification 4.6x

```text
js/grid-pointer-session.js
js/housing-grid-engine-adapter.js
js/housing-storage-runtime.js
js/housing.js
```

Housing storage drag/drop now uses the shared public pointer-session core. `js/housing-storage-runtime.js` owns Storage rendering, delegated pointerdown binding, feedback and local DOM placement patching. `js/housing.js` remains the Housing shell and no longer owns local document `pointermove`, `pointerup` or `pointercancel` drag runtime.

Canonical boundaries:

```text
pointer session → startGridPointerSession()
footprint → getEquipmentItemGridFootprint()
model → buildEquipmentHousingGridModel()
validation → evaluateEquipmentHousingPlacement()
commit → commitHousingGridDrop() → moveEquipmentItemToHousing()
persistence → ItemInstance.housingPlacement
```

Readiness must report:

```text
uiStillUsesLegacyHousingDrag: false
sharedPointerSessionReady: true
migrationReady: true
```

Housing Bridge reservation and eager placement APIs are unchanged.


---

# Housing Grid Performance Note — 4.6.2x

Housing same-unit storage drag/drop now uses `commitCitizenHousingGridPlacement()` instead of the full Equipment replacement path. This is not a Housing Bridge API change; it is a local runtime fast path for an item already in the same `HOUSING_STORAGE` unit.

The Housing Bridge reserve/commit APIs remain canonical for cross-domain delivery and World Bridge flows. Same-unit UI drag/drop must not create bridge reservations and must not trigger module/profile refresh.

## Housing Grid Parity Audit 4.6.3x

The parity audit is a contract/static verification patch only. It confirms that the installed Housing Storage drag/drop path uses the shared pointer-session core, drag preview, target hit testing, cached drag-context occupancy, same-unit ItemInstance fast path, no-op same-cell drop and local DOM placement patching.

It does not change Housing Bridge APIs, Market delivery, Equipment container drag runtime or CyberGrid runtime. Browser feel/performance verification remains required.
