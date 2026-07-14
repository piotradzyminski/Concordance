# Admin Billing Transfers 1.0x — contract

## Owner

```text
Billing Store owns transfer validation, account effects, transfer records, paired BillingTransactions, idempotency and rollback.
Admin Control Center owns operator input, preview surface, notifications and Admin Audit projection.
Organization Store owns organization identity only.
Citizen Store remains the Citizen balance projection owner.
```

## Separation from corrections

```text
ADMIN_ADJUSTMENT
= one-account SET / CHANGE correction

ADMIN_TRANSFER
= paired source debit and target credit/liability assignment
```

The legacy sender label in an adjustment is metadata. It never substitutes for a transfer source account.

## Command input

```js
{
  sourceParty: { partyType: "CITIZEN" | "ORGANIZATION", partyId },
  targetParty: { partyType: "CITIZEN" | "ORGANIZATION", partyId },
  asset: "CREDITS" | "DEBT",
  amount,
  reason,
  actor: { actorId, actorRole: "ADMIN", source },
  idempotencyKey,
  correlationId,
  sourceExpectedRevision?,
  targetExpectedRevision?,
  metadata?
}
```

## Success result

```js
{
  ok: true,
  resultCode: "ADMIN_TRANSFER_COMPLETED",
  billingTransfer,
  sourceTransaction,
  targetTransaction,
  sourceAccount,
  targetAccount,
  historyEntries
}
```

## Safety

- source and target must differ;
- amount must be positive;
- Citizen Credits cannot fall below zero;
- transferred Debt cannot exceed source liability;
- Citizen target Debt cannot exceed debt limit;
- current account balances must still match preview snapshots at commit;
- repeated idempotency key returns the existing transfer;
- transfer persistence failure rolls back both projections;
- rollback uncertainty returns `ADMIN_TRANSFER_RECOVERY_REQUIRED`;
- reversal is a second paired transfer and never edits historical transaction effects.

## Audit

Admin Audit event `ADMIN_BILLING_TRANSFER` contains:

```text
transferId
sourceTransactionId
targetTransactionId
source/target party refs
Citizen and Organization IDs
asset
amount
operator note
correlationId
idempotencyKey
resultCode
```

## UI

Billing workspace contains separate panels:

```text
Manual Economy Adjustment
Atomic Account Transfer
```

The transfer form supports Citizen and Organization accounts and shows the current Credits/Debt ledger values in account selectors.
