# Citizen Card Projection Boundary Contract

## Status

```text
scope: Citizen Card read-only domain projections
version: 1.0x
base: Parallel Scope Merge 15.19x
phase: pre-alpha
```

## Purpose

Citizen Card must open as the first lazy module without loading operational Equipment, Subscriptions or Cyberware UI runtimes.

The card consumes one dedicated read-only projection namespace:

```text
window.WS_APP.citizenCardProjection
```

This namespace does not own domain persistence, commands, operational state or UI workspace state.

## Owned files

```text
js/citizen-card-equipment-projection.js
js/citizen-card-subscription-projection.js
js/citizen-card-cyberware-projection.js
js/citizen-records.js
js/modules.js
css/citizen-card.css
```

## Bundle invariant

The following bundles load `CITIZEN_CARD_PROJECTION_SCRIPTS` before `citizen-records.js`:

```text
citizen-card
citizen-cards
citizen-files
citizen-database
```

They must not load `CYBERWARE_UI_RUNTIME_SCRIPTS`.

The Citizen Card projection bundle must not contain:

```text
cyberware-diagnostics.js
cyberware-maintenance.js
cyberware-assignment.js
cyberware-actions.js
cyberware.js
subscriptions.js
subscriptions-workspace.js
equipment.js
```

## Equipment projection

Source of truth:

```text
ItemInstance Store
getCitizenEquipmentItemInstanceViews()
getEquipmentInstanceSummary()
```

The projection may derive only presentation metrics:

```text
item count
equipped count
occupied layer/mount count
grid-stored count
carry penalty summary
```

It must not create or mutate EquipmentState, ItemInstance location or selection state.

## Subscription projection

Source of truth:

```text
citizen-finance.js
SubscriptionAPI / subscription entitlement APIs
Citizen subscription contracts
```

The projection renders the supplied active contract list directly. A non-empty active list must never fall back to `No active subscriptions` because the lazy Subscriptions UI has not been opened.

## Cyberware projection

Source of truth:

```text
ItemInstance Store BODY selectors
getInstalledCyberwareInstanceViews()
```

The projection derives only the Citizen Card summary shape:

```text
installed/conflict/unassigned rows
slot and scale labels
basic compliance presentation
Neural Core summary
counts and warnings
```

It must not expose planner, maintenance, diagnostics, assignment, authorization mutation, World Bridge execution or Cyberware workspace commands.

The full Cyberware runtime remains authoritative when the standalone Cyberware module is opened. Projection scripts must not overwrite full-domain globals.

## Namespace precedence

`citizen-records.js` reads the dedicated projection namespace first. Legacy/full-domain globals are compatibility fallbacks only.

```text
citizenCardProjection API
→ optional full-domain fallback
→ explicit empty state
```

## Cold-entry invariants

```text
Equipment summary is available before Equipment UI is opened.
Active subscription tiles are available before Subscriptions UI is opened.
Cyberware summary is available before Cyberware UI is opened.
Opening Citizen Card does not register operational Cyberware UI controllers.
Projection loading does not replace globals already registered by a full domain runtime.
```

## Non-goals

```text
citizen-records.js renderer split
Full/Compact interaction fast path
Equipment Inspector local DOM patching
quick-link citizen targeting cleanup
Skills/Abilities navigation
Citizen Card CSS consolidation
registry pagination/virtualization
```
