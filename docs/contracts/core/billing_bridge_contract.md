# Billing Bridge Foundation 2.0x — public API contract

## Status

```text
PATCH:
patch_billing_bridge_foundation_2.0x.zip

SCHEMA:
billing_bridge_schema_2_1x

PRIMARY OWNER:
js/billing-store.js

ACTIVE CONSUMERS:
Market checkout / return-refund
Transactional Services billing intent bridge 2.4x

PENDING CONSUMER:
Cyberware World Bridge 14.0x
```

This contract defines the canonical Billing API consumed by Market and transactional Services. The Billing UI remains separate. Market checkout/return and Services authorization/capture/refund use this boundary; the Cyberware World Bridge orchestrator is still absent.

## Ownership

```text
Billing Store
= BillingIntent lifecycle
= BillingTransaction lifecycle
= Admin BillingTransfer lifecycle
= Organization transfer-account ledger
= authorization reservation
= capture
= void
= refund
= paired debit/credit transfer
= idempotency
= targeted Billing events
```

Citizen remains the current account-balance projection owner:

```text
citizen.credits
citizen.debt
```

World Bridge code must not edit those fields directly. It must use Billing Store command API.

Legacy Billing actions in `js/store.js` remain compatibility flows. Their history records are mirrored into canonical `BillingTransaction` records through the Billing History adapter.

## Stable identifiers

```text
billingIntentId
billingTransactionId
idempotencyKey
sourceDomain
sourceRefId
correlationId
revision
```

## Intent statuses

```text
PENDING
AUTHORIZED
PARTIALLY_CAPTURED
CAPTURED
FAILED
VOIDED
EXPIRED
PAYMENT_RECOVERY_REQUIRED
```

## Transaction statuses

```text
CAPTURED
PARTIALLY_REFUNDED
REFUNDED
FAILED
PAYMENT_RECOVERY_REQUIRED
```

## Payment sources

```text
CREDITS
DEBT_ACCOUNT
NOT_REQUIRED
COVERED
WAIVED
EXTERNAL
```

`EXTERNAL` is reserved for compatibility transactions already committed by legacy Billing flows.

## Public command API

```js
createBillingIntent(input)
authorizeBillingIntent(billingIntentId, options)
captureBillingIntent(billingIntentId, options)
voidBillingIntent(billingIntentId, options)
refundBillingTransaction(billingTransactionId, amount, options)
createAndCaptureBillingIntent(input, options)
```

## Public read API

```js
getBillingIntent(billingIntentId)
getBillingTransaction(billingTransactionId)
getBillingIntents(filters)
getBillingTransactions(filters)
getCitizenAvailableBalance(citizenId, options)
validateBillingStore()
```

## Compatibility API

```js
recordCommittedBillingTransaction(input)
recordLegacyBillingHistoryEntry(historyEntry)
backfillBillingTransactionsFromHistory(history)
```

World Bridge must not use the compatibility API for new operations.

## Create input

```js
{
  citizenId: "citizen-b",
  sourceDomain: "SERVICE",
  sourceRefId: "service_order_...",
  amount: 2500,
  currency: "CREDIT",
  descriptionCode: "CYBERWARE_INSTALL",
  paymentSource: "CREDITS",
  coverageBreakdown: [],
  providerId: "provider_coremed_clinic_n8_01",
  organizationId: "coremed",
  correlationId: "cw_world_op_...",
  idempotencyKey: "cw_world_op_...:billing",
  metadata: {}
}
```

Required fields:

```text
citizenId
sourceDomain
sourceRefId
amount > 0
idempotencyKey
```

## Authorization

Authorization reserves capacity without changing Citizen balance.

```text
CREDITS
→ validates credits minus other active authorizations

DEBT_ACCOUNT
→ validates debt limit minus current debt and other active authorizations

NOT_REQUIRED / COVERED / WAIVED / EXTERNAL
→ no Citizen balance reservation
```

Repeated authorization of the same intent is idempotent.

## Capture

Capture:

```text
AUTHORIZED / PARTIALLY_CAPTURED intent
→ targeted Citizen account mutation
→ one BillingTransaction
→ intent revision update
→ one ws:billing-transaction-updated event
```

Capture supports partial amount through `options.amount`.

The default capture idempotency key is derived from intent idempotency and cumulative captured amount. Orchestrators should supply an explicit stable key.

## Refund

Refund:

```text
captured transaction
→ targeted inverse account mutation
→ one REFUND transaction
→ original transaction status update
```

For `CREDITS`, refund credits the Citizen account.

For `DEBT_ACCOUNT`, refund reduces Citizen debt.

## Domain events

```text
ws:billing-intent-updated
ws:billing-transaction-updated
```

Required targeted payload fields:

```text
billingIntentId / billingTransactionId
citizenId
status
previousStatus
sourceDomain
sourceRefId
correlationId
revision
```

These events must not invalidate Equipment, CyberGrid, Cyberware Runtime or Planner.

## Terminal Notifications integration

Billing Store emits through `TerminalNotifications`:

```text
BILLING.PAYMENT.AUTHORIZED
BILLING.PAYMENT.CAPTURED
BILLING.PAYMENT.FAILED
BILLING.PAYMENT.REFUNDED
BILLING.PAYMENT_RECOVERY_REQUIRED
```

`options.notify === false` suppresses Terminal output while retaining Billing domain events.

World Bridge should normally suppress intermediate authorization notification when one consolidated operation card is used.

## Data I/O

Campaign export/import includes:

```text
billingIntents
billingTransactions
billingHistory
```

Billing History remains a UI compatibility projection.

BillingIntent and BillingTransaction are the bridge records.

## Performance invariants

Billing commands must not call:

```text
getEquipmentState()
getCitizenEquipmentItemInstanceViews()
Cyberware Runtime resolver
Planner resolver
CyberGrid renderer
ItemInstance persistence
```

Status-only Billing events must not cause Equipment/CyberGrid refresh.

## Idempotency

```text
one idempotencyKey
= one BillingIntent or one BillingTransaction command result
```

Repeated commands return:

```text
IDEMPOTENT_REPLAY
```

They must not:

- debit twice;
- increase debt twice;
- create a second transaction;
- create a second refund;
- create a duplicate Terminal notification from the Billing command.

## Recovery boundary

When the Citizen account changes but persistence of the canonical Billing record fails, the intent is marked:

```text
PAYMENT_RECOVERY_REQUIRED
```

and may emit:

```text
BILLING.PAYMENT_RECOVERY_REQUIRED
```

World Bridge must stop completion and preserve operation references for recovery.

## Legacy adapter

Existing Billing History records are backfilled once in a batched operation.

New legacy history writes are mirrored to canonical transactions through:

```text
addBillingHistoryEntry()
→ recordLegacyBillingHistoryEntry()
```

The adapter uses:

```text
billing-history:{historyEntryId}
```

as its idempotency key.

Legacy transactions are marked:

```text
externalCommit: true
```

This adapter prevents loss of stable transaction identity while existing Billing UI remains unchanged.

## Non-goals

- Billing UI redesign;
- replacement of Weekly Settlement logic;
- Market checkout integration;
- Service Order integration;
- Subscription Public API implementation;
- World Bridge operation store;
- Equipment or Cyberware invalidation;
- final accounting model;
- multi-currency economy;
- asynchronous backend payment provider.

## Acceptance criteria

```text
[ ] create requires stable idempotencyKey
[ ] duplicate create returns the existing intent
[ ] authorize does not change Citizen balance
[ ] active authorization reduces available capacity
[ ] capture changes balance exactly once
[ ] duplicate capture does not change balance
[ ] refund changes balance exactly once
[ ] duplicate refund does not change balance
[ ] debt capture respects debt limit
[ ] targeted Billing events contain revision
[ ] Terminal billing event uses Notification API
[ ] Billing export/import preserves intents and transactions
[ ] legacy history receives a canonical transaction identity
[ ] legacy backfill performs one persistence batch
[ ] no Equipment/CyberGrid/Cyberware resolver is invoked
```

## Services consumer — 2.4x

Transactional Services consumes Billing through public commands only.

```text
sourceDomain = SERVICE
sourceRefId = serviceOrderId
correlationId = World Bridge operation ID or serviceOrderId
```

Authorization flow:

```text
Service quote and coverage revalidated
→ BillingIntent created
→ BillingIntent authorized
→ ServiceOrder AUTHORIZED
```

Capture remains an explicit later command:

```text
captureServiceOrderBilling()
→ captureBillingIntent()
```

Compensation remains explicit:

```text
voidServiceOrderBilling()
→ voidBillingIntent()

refundServiceOrderBilling()
→ refundBillingTransaction()
```

Services stores references and idempotency keys. Billing remains the sole owner of intent/transaction lifecycle and Citizen account mutation.



## Admin paired transfers — 1.0x

Canonical Admin transfer API:

```js
previewAdminBillingTransfer(input)
executeAdminBillingTransfer(input)
retryAdminBillingTransfer(transferId, input)
reverseAdminBillingTransfer(transferId, input)
getAdminBillingTransfer(idOrIdempotencyKey)
getAdminBillingTransfers(filters)
getBillingTransferAccount(partyType, partyId)
getBillingTransferAccounts(filters)
```

Supported parties:

```text
CITIZEN
ORGANIZATION
```

Supported assets:

```text
CREDITS
DEBT
```

Credits transfer semantics:

```text
source.credits -= amount
target.credits += amount
```

Citizen sources cannot fall below zero. Organization transfer accounts are explicit Billing ledger accounts and may carry a negative Credits balance. This preserves a real debit instead of representing an organization only as display metadata.

Debt transfer semantics:

```text
source.debt -= amount
target.debt += amount
```

The source must own at least the transferred liability. A Citizen target remains constrained by its debt limit.

Each completed transfer creates:

```text
one BillingTransfer
one ADMIN_TRANSFER_DEBIT BillingTransaction
one ADMIN_TRANSFER_CREDIT BillingTransaction
one shared transferId / correlationId
paired account snapshots and effects
```

The commit is logical-atomic. A failed target mutation or persistence failure rolls both account projections and all new transfer records back. Failure to confirm rollback returns `ADMIN_TRANSFER_RECOVERY_REQUIRED` and exposes `lastAdminBillingTransferRecoveryError`.

Campaign Snapshot v6 persists:

```text
ws_app_billing_transfer_accounts_v1
ws_app_billing_transfers_v1
```

Domain event:

```text
ws:billing-transfer-updated
```
