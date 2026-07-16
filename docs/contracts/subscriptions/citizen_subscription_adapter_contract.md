# Citizen Subscription Adapter Contract

## Ownership

```text
js/store.js
= canonical Citizen collection, normalization, persistence and store events

js/citizen-subscription-adapter.js
= low-level Citizen-backed Subscription command implementation

js/subscription-api.js
= only public Subscription command API
```

The adapter is not a store. It receives canonical Citizen Store functions and state accessors during `js/store.js` initialization. It must not read or write localStorage, create a contract collection, own catalog records or calculate a competing entitlement state.

## Load order

```text
subscription normalization / entitlement helpers
→ terminal stores
→ citizen-subscription-adapter.js
→ store.js
→ subscription-catalog-store.js
→ subscription-api.js
```

`store.js` creates the adapter after Citizen normalization, Billing helpers, notification producers and settlement helpers exist. It then exposes one frozen, non-enumerable and non-writable `__subscriptionStoreCommands` object for `SubscriptionAPI` initialization.

## Low-level commands

```text
addCitizenSubscription
updateCitizenSubscription
cancelCitizenSubscription
deleteCitizenSubscription
clearCancelledCitizenSubscriptions
payCitizenSubscriptions
processWeeklySubscriptionSettlement
```

These functions are internal implementation commands. They must not remain on `WS_APP` as direct public mutators.

## Public boundary

Consumers use `WS_APP.SubscriptionAPI`. Existing command names, result shapes, idempotency handling, domain events and entitlement invalidation remain owned by `js/subscription-api.js`.

The mutation boundary version remains:

```text
subscriptions_command_boundary_3_1x
```

## Persistence invariant

```text
one Citizen record
→ one citizen.subscriptions array
→ serialized by Citizen Store
```

The adapter may:

- call `updateCitizen()` for contract and direct-payment changes;
- map the canonical Citizen Store for weekly settlement through injected `getCitizenStore()` and `replaceCitizenStore()` functions;
- request Citizen Store persistence and emit the existing Citizen update event.

The adapter may not:

- access `localStorage` or `sessionStorage`;
- define another storage key;
- persist a separate Subscription contract store;
- mutate the Subscription catalog;
- persist derived entitlement projections.

## Cross-domain settlement

Weekly settlement preserves the existing orchestration of:

```text
Income Sources
→ Subscription charges
→ Debt increase/recovery
→ Commission payout settlement
→ Citizen persistence
→ Billing/Terminal projections
```

The adapter receives these helpers from Citizen Store. It does not become the owner of Income, Service Log, Billing history or Terminal entries.

## Required invariants

1. `SubscriptionAPI` is the only public command surface.
2. `__subscriptionStoreCommands` is frozen, non-enumerable, non-writable and non-configurable.
3. Citizen Store remains the only persistence owner for `citizen.subscriptions`.
4. Contract IDs, status fields, Billing behavior and notification payloads are unchanged.
5. No second Subscription collection or entitlement resolver is introduced.
6. Existing localStorage data requires no migration.
