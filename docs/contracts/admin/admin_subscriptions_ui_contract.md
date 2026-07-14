# Admin Subscriptions UI Contract

## Ownership

```text
js/admin-subscriptions-control.js
= administrative presentation state, contract index, filters, profiles and command routing

css/admin-subscriptions.css
= Admin-only terminal layout and responsive behavior

SubscriptionAPI
= canonical owner of contract mutations and entitlement resolution

Admin Audit Store
= append-only success/failure audit records for administrative commands
```

The Admin workspace may read Billing, Citizen, Organization and ItemInstance data, but it must not mutate those domains directly or persist a second subscription model.

## Workspace

The lazy bundle `admin-workspace-subscriptions` provides one index across non-admin Citizens. Filtering occurs before render and may use:

```text
Citizen
provider
product
Billing status
entitlement status
coverage target type
tier
free-text query
```

Contracts are grouped attention-first into active, attention, suspended and cancelled states.

## Contract profile

One administrative profile contains:

```text
Contract Status
Billing
Coverage Target and validator reasons
Active Entitlements
Package Details
Billing/admin History
Administrative Actions
```

Item targets are resolved through canonical ItemInstance lookup. Provider/location facts come from Organization Store and are not synthesized.

## Mutation boundary

Administrative actions route through `SubscriptionAPI` for:

```text
tier change
Billing status change
target rebind
payment
suspend
resume
cancel
```

Every command requires an operator note and creates an Admin Audit success or failure result. Cancellation requires explicit confirmation. Repeated commands must respect the existing idempotency/revision behavior of SubscriptionAPI.

## Fallback

The former generic Admin subscription table may render only when the lazy controller fails to load. It is not a second canonical workspace.


## UI stability 4.2.1

Admin Subscriptions stores viewport position only as transient presentation state before rebuilding the Admin Control Center. The next controller bind restores that position through `requestAnimationFrame` or a zero-delay fallback. This state is not campaign persistence and does not affect contract commands, filters or Admin Audit. Long contract IDs, provider names, target IDs and entitlement codes must wrap inside the profile and contract cards without widening the workspace.

## Actions and feedback 4.3

Admin commands share `SubscriptionActionFeedback` with the player module. The controller is presentation-only and does not replace `SubscriptionAPI` or Admin Audit.

Every command control must provide:

```text
explicit confirmation summary
processing and aria-busy state
duplicate-submit guard
visible reason when disabled
resultCode/errorCode mapping into readable feedback
inline failure without rebuilding the workspace
workspace refresh only after a successful command
```

Tier, Billing, target, payment, suspend, resume and cancellation previews must identify the affected contract and material state change. A missing operator note is audited as a failed administrative attempt before any domain mutation. Shared feedback state is transient and excluded from Campaign Snapshot.


## Keyboard and responsive contract

The filtered contract index renders as a single-select listbox. The selected contract is the only option in the normal tab sequence; ArrowUp, ArrowDown, Home and End select adjacent records and the controller restores focus after the Admin workspace rerender. Filter controls and command controls preserve visible focus. The workspace must remain bounded at 980, 720 and 520 px without horizontal overflow. This presentation state is transient and does not enter campaign persistence.
