# Citizen Record Contract — Foundation 2.0x

## Scope

This contract owns Citizen record identity, lifecycle, actor-aware mutation commands, pre-activation module access and pre-alpha runtime reset behavior.

It does not own Billing, Subscriptions, Service, Housing, Equipment, Cyberware, Market or World Bridge records.

## Schema

```text
recordSchemaVersion: citizen_record_foundation_2_0x
```

Required record control fields:

```text
recordState
characterType
ownerUserId
revision
createdAt
updatedAt
submittedAt
activatedAt
archivedAt
reviewNote
playerNote
systemNote
citizenAuditTrail
```

`citizen.id` is the immutable internal relation key. `idNumber` and `shortId` are system identity values finalized at activation.

## Lifecycle

```text
DRAFT
→ READY_FOR_REVIEW
→ ACTIVE
→ ARCHIVED
```

Additional transitions:

```text
READY_FOR_REVIEW → CHANGES_REQUESTED → DRAFT
ARCHIVED → ACTIVE or DRAFT
```

`status` remains a world-facing status string and must not replace `recordState`.

## Character type

```text
PLAYER
NPC
SYSTEM
```

Admin is `SYSTEM`. Seed player records are `PLAYER`. Campaign NPC records are `NPC`.

## Command boundary

Public commands are owned by:

```text
window.WS_APP.CitizenCommandAPI
```

Supported commands:

```text
createCitizenDraft
updateCitizenDraft
submitCitizenDraft
requestCitizenChanges
rejectCitizenDraft
activateCitizenDraft
updateCitizenSelfProfile
adminUpdateCitizenRecord
adminUpdateCitizenAccess
adminCorrectCitizenMechanics
adminAssignCitizenOwner
adminSetOwnerFullCardEdit
archiveCitizen
restoreCitizen
```

Mutating commands require actor context and `idempotencyKey`. Administrative corrections require `reason`.

Low-level `createCitizen()` and protected `updateCitizen()` fields accept writes only from canonical command sources.

## Field ownership

Citizen self-edit for an active record:

```text
pseudonym
portrait
appearance
playerNote
```

Draft owner edit:

```text
identity
biologicalProfile
origin
birthDate
portrait
appearance
playerNote
abilities
skills
characterType
```

Admin Citizen-owned correction:

```text
identity/profile fields
badges
tags
visibility/access
systemNote
status/clearance/classProfile
abilities/skills
```

External domain fields are not owned by Citizen Editor:

```text
credits/debt          → Billing
subscriptions         → SubscriptionAPI
serviceLog/income     → Service
Equipment/Cyberware   → ItemInstance and domain stores
Housing/Market        → respective domain stores
```

## Identity

Owned by:

```text
js/citizen-identity.js
```

Rules:

```text
citizen.id: immutable internal key
idNumber: generated/finalized at activation
shortId: derived from idNumber
idNumber and shortId: unique across active and archived records
active idNumber and shortId: not editable through generic Citizen commands
```

## Pre-activation access

For a Citizen account without an `ACTIVE` record, the only runtime module IDs allowed are:

```text
system
system-index
encyclopedia
character-creator
application-status
```

Current foundation runtime contains the first three modules. Creator and application-status are reserved for the next scoped UI implementation.

The same resolver is called by module list rendering and direct module opening:

```text
canAccessCitizenModule(moduleId, actor)
```

## Archive and destructive operations

Normal per-record hard delete is disabled.

```text
deleteCitizen() → HARD_DELETE_DISABLED
duplicateCitizen() → DUPLICATE_CITIZEN_DISABLED
```

Citizen Cards uses reversible `archiveCitizen()` / `restoreCitizen()`.

Pre-alpha destructive cleanup is performed only through `resetCitizenRuntimeData()`. It clears Citizen-linked runtime domains together to prevent orphan records.

## Billing correction

Canonical Admin Credits/Debt correction is owned by:

```text
applyAdminBillingAdjustment()
```

The command requires:

```text
citizenId
target: CREDITS | DEBT
mode: SET | CHANGE
amount
reason
idempotencyKey
ADMIN actor envelope
```

It commits the account mutation through Billing, persists one `ADMIN_ADJUSTMENT` BillingTransaction, writes Billing history, supports idempotent replay and attempts account rollback when transaction persistence fails.

Compatibility API:

```text
adminAdjustCitizenAccount()
```

The compatibility adapter accepts one non-zero `creditsDelta` or `debtDelta` and delegates to `applyAdminBillingAdjustment()`. Simultaneous two-target mutation is rejected with `MULTI_TARGET_ADMIN_ADJUSTMENT_NOT_SUPPORTED` so there is one canonical transaction implementation.

## Import/export

Campaign Data I/O schema:

```text
ws-local-campaign-data-v6
```

Citizen exports include archived records. Citizen import rejects duplicate internal IDs, Short IDs and Citizen ID Numbers.

## Pre-alpha reset

No player-data migration is required for this schema cutover.

On first load after schema change, Citizen-linked localStorage domains are cleared and canonical seed data is reloaded. Knowledge/content stores are not cleared.


## Legacy Housing purchase compatibility

The retained legacy Housing catalog purchase path must not mutate Citizen Credits directly. It creates and captures a BillingIntent before saving Housing order/shipment projections. If the Citizen projection save fails, the captured BillingTransaction is refunded through Billing compensation.


## Character Creator 1.0x extension

The pre-activation UI and review workflow are owned by:

```text
data/citizen-creation-config.js
js/citizen-creator.js
css/citizen-creator.css
docs/contracts/citizen/citizen_creator_contract.md
```

Admin may grant the assigned owner full Citizen-owned card editing through `ownerFullCardEdit`. This delegation is per record, reversible and checked by `CitizenCommandAPI`. It does not allow direct writes to external domains.
