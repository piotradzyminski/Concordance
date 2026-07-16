# Billing Marketplace Settlement 1.0x — contract

## Status

```text
PATCH:
patch_billing_marketplace_settlement_1.0x.zip

SCHEMA:
billing_bridge_schema_2_2x

PRIMARY OWNER:
js/billing-store.js
```

This contract adds a Billing-owned settlement boundary for fixed-price marketplace sales. It is designed for future player-created Secondary Market listings. Market may reference the settlement, but Billing owns all account effects, transaction records, refunds, idempotency and recovery state.

## Ownership

```text
Billing Store
= buyer debit
= seller credit
= platform fee
= proportional refund
= paired account snapshots
= persistent MarketplaceSettlement
= recovery status
= idempotency
```

Market remains owner of:

```text
listing lifecycle
MarketOrder
stock / reservation
ItemInstance custody and fulfillment
```

Marketplace settlement must not call `ADMIN_TRANSFER` and must not create an `Admin BillingTransfer`. Administrative transfers and marketplace settlement are separate command families.

## Settlement record

```js
{
  settlementId,
  settlementType: "MARKETPLACE_SALE",
  listingId,
  marketOrderId,

  buyerRef: { partyType: "CITIZEN", partyId },
  sellerRef: { partyType: "CITIZEN" | "ORGANIZATION", partyId },
  platformRef: { partyType: "ORGANIZATION", partyId },

  grossAmount,
  platformFeeRate,
  platformFeeAmount,
  sellerNetAmount,

  buyerDebitTransactionId,
  sellerCreditTransactionId,
  platformFeeTransactionId,

  refundedAmount,
  sellerRefundedAmount,
  platformFeeRefundedAmount,
  refunds: [],

  status,
  compensationState,
  retryCount,
  failureCode,
  idempotencyKey,
  correlationId,
  revision
}
```

## Statuses

```text
PENDING
CAPTURED
PARTIALLY_REFUNDED
REFUNDED
FAILED
RECOVERY_REQUIRED
```

`FAILED` means all already-applied account effects were rolled back. The same settlement may be retried.

`RECOVERY_REQUIRED` means rollback could not be proven complete. Automatic retry is blocked until an operator or orchestrator confirms that account state was restored.

## Public API

```js
quoteMarketplaceSettlement(input)
commitMarketplaceSettlement(input)
refundMarketplaceSettlement(settlementId, amount, options)
retryMarketplaceSettlement(settlementId, options)
reconcileMarketplaceSettlements(options)
getMarketplaceSettlement(idOrIdempotencyKey)
getMarketplaceSettlements(filters)
importMarketplaceSettlements(records)
```

## Commit split

For a gross sale of `5 000 ₡` with a 5% fee:

```text
buyer debit:       -5 000 ₡
seller credit:     +4 750 ₡
platform fee:        +250 ₡
```

The three effects are one settlement. A successful commit creates three BillingTransactions:

```text
MARKETPLACE_BUYER_DEBIT
MARKETPLACE_SELLER_CREDIT
MARKETPLACE_PLATFORM_FEE
```

The sum invariant is mandatory:

```text
sellerNetAmount + platformFeeAmount = grossAmount
```

## Refund

Refund reverses the original split proportionally:

```text
seller debit
+ platform fee debit
= buyer refund credit
```

A final refund uses the exact remaining seller and platform amounts to avoid cumulative rounding drift.

Refund transactions:

```text
MARKETPLACE_SELLER_REFUND_DEBIT
MARKETPLACE_PLATFORM_FEE_REFUND_DEBIT
MARKETPLACE_BUYER_REFUND_CREDIT
```

## Idempotency

```text
one settlement idempotencyKey
= one buyer debit
= one seller credit
= one platform fee
```

Each refund requires its own stable `idempotencyKey`. Replays return the existing settlement or refund and must not mutate balances again.

## Atomicity and rollback

Account projections are committed with revision and before-state guards. If a later party commit fails, earlier party effects are restored from persisted snapshots.

If persistence fails after account effects:

1. Billing restores in-memory transaction and settlement arrays;
2. Billing reverses buyer, seller and platform account snapshots;
3. Billing persists `FAILED` when rollback succeeds;
4. Billing persists `RECOVERY_REQUIRED` when rollback cannot be proven complete.

Automatic reconciliation processes only `PENDING`. `RECOVERY_REQUIRED` remains unresolved until `confirmAccountStateRestored: true` is supplied.

## Events

```text
ws:billing-marketplace-settlement-updated
```

Payload includes:

```text
settlementId
listingId
marketOrderId
status
previousStatus
grossAmount
refundedAmount
buyerRef
sellerRef
platformRef
correlationId
revision
```

## Data I/O

Campaign Data I/O includes:

```text
ws_app_billing_marketplace_settlements_v1
```

Billing runtime export includes `marketplaceSettlements`.

## Scope exclusion

This patch does not:

- create player listings;
- move ItemInstance into escrow;
- connect Market checkout to settlement;
- change existing system-generated Secondary purchases;
- add marketplace UI;
- define auction or negotiation mechanics.
