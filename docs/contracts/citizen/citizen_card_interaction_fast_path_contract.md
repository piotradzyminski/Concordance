# Citizen Card Interaction Fast Path Contract

```text
scope: Citizen Card mounted interaction lifecycle
version: 2.1x
phase: pre-alpha
```

## Purpose

Full/Compact switching and Equipment summary selection update only the mounted Citizen Card boundary that changed. Presentation-state actions must not rebuild the complete module shell or wait on an artificial transition timer.

This contract extends the renderer split introduced in 2.0x. It does not create another Citizen, Equipment, Finance, Subscription or Cyberware owner.

## Canonical owner

```text
js/citizen-card-shell.js
```

The shell remains the owner of mounted-card interaction state and event binding. Read-only HTML remains owned by `js/citizen-card-renderers.js` and the projection adapters.

## Full / Compact fast path

A mode change must:

```text
capture mounted UI state
set the transient Citizen Card mode
replace only .citizen-card-layout contents
update mode classes and active control state
bind only the newly rendered layout controls
restore restorable UI state
```

It must not:

```text
wait 180 ms or another artificial delay
call renderCitizenCardModule()
replace #module-grid
recreate the card header, quick links or Admin lifecycle controls
persist the presentation mode to a domain store
```

The local layout refresh may recompute read-only layout projections once. It must not invoke domain mutations.

## Equipment summary fast path

When an existing Equipment summary exposes item-selection or clear controls, the interaction must:

```text
update citizenCardEquipmentInspectorByCitizen transient selection
replace only the mounted Equipment section body
bind only the replaced Equipment controls
restore restorable UI state
```

It must not rerender Financial, Subscriptions, Skills, Abilities, Cyberware, Service Log, portrait or the complete Citizen Card.

This scope does not add a new Equipment Inspector renderer. It optimizes the existing interaction contract when inspectable controls are present.

## Preserved mounted state

Local refreshes preserve, where the corresponding DOM target still exists:

```text
major Citizen Card section open/closed state
Financial / Subscriptions selected radio tab
focused stable control
window scroll position
#module-grid scroll position
Citizen Card scroll position
```

Section state is transient and keyed by Citizen ID so a Full-only section can retain its state across a Full → Compact → Full round trip.

## Compatibility invariants

- `window.WS_APP.renderCitizenCardModule` remains the full entrypoint for initial module entry, explicit return navigation and actual record lifecycle mutations.
- Archive/Restore, owner-full-edit and creator actions retain their existing controlled full refresh behavior.
- Quick-link payloads and Skills/Abilities semantics remain unchanged in 2.1x.
- No CSS selector, record schema, persistence key or domain command changes are introduced.

## Explicit non-goals

This scope does not:

- change quick-link Citizen targeting;
- implement Skills or Abilities reference navigation;
- consolidate Citizen Card CSS;
- retire legacy Cyberware CSS;
- paginate, virtualize or delegate the GM registry;
- replace full refreshes that follow actual Citizen record mutations.
