# Citizen Creator Contract — 2.2x

## Scope

This contract owns the pre-activation character creation UI, application status UI, Admin review workflow and per-card owner full-edit delegation.

It does not own Billing, Subscriptions, Service, Housing, Equipment, Cyberware, Market or World Bridge mutations.

## Runtime modules

```text
character-creator
application-status
```

A Citizen without an `ACTIVE` record may access only:

```text
system
system-index
encyclopedia
character-creator
application-status
```

An active Citizen does not receive Creator/Application Status cards in the normal module list.

## Creator steps

```text
IDENTITY
ABILITIES
SKILLS
BACKGROUND
REVIEW
```

Creation mode is `FREEFORM` in pre-alpha. Ability and Skill constraints are read from:

```text
data/citizen-creation-config.js
System Registry Ability/Skill definitions
```

The Creator writes only Citizen-owned draft fields through `CitizenCommandAPI.updateCitizenDraft()`.

## Draft and review flow

```text
DRAFT
→ READY_FOR_REVIEW
→ ACTIVE
```

Additional review outcomes:

```text
READY_FOR_REVIEW → CHANGES_REQUESTED → DRAFT
DRAFT / CHANGES_REQUESTED / READY_FOR_REVIEW → REJECTED
```

Admin review commands:

```text
activateCitizenDraft()
requestCitizenChanges()
rejectCitizenDraft()
```

Creator submission does not initialize or mutate external domain records. Active-domain setup remains a separate post-activation workflow.

## Owner assignment

Admin may assign one Citizen login account to a draft through:

```text
adminAssignCitizenOwner()
```

The command updates `Citizen.ownerUserId` and the linked User `citizenId`. One non-archived Citizen record may be assigned to a given owner account.

## Owner full card edit delegation

Per-card switch:

```text
ALLOW PLAYER FULL CARD EDIT
```

Canonical fields:

```text
ownerFullCardEdit
ownerFullCardEditGrantedAt
ownerFullCardEditGrantedBy
```

Admin command:

```text
adminSetOwnerFullCardEdit()
```

When enabled, the assigned owner may use Citizen-owned Admin-like edit commands for the same card. The grant is checked inside `CitizenCommandAPI`, not only in UI.

The grant does not transfer ownership of external domains:

```text
Billing
Subscriptions
Service
Housing
Equipment
Cyberware
Market
World Bridge
```

Those sections remain read-only or route to their canonical modules.

## Identity and mechanics

Citizen ID and Short ID remain immutable after activation. Full-card delegation allows editing Citizen-owned identity/profile/mechanics fields but does not bypass identity finalization rules or direct external-domain mutation boundaries.

## UI ownership

```text
js/citizen-creator.js
css/citizen-creator.css
```

`js/citizen-records.js` exposes Admin review entry and the per-card delegation switch.

`js/citizen-editor.js` routes the assigned owner to the dedicated Admin Citizen Editor when `hasOwnerFullCardEditGrant()` succeeds. No shared legacy modal remains.


## Browser-validated interaction invariants — 2.2x

The Creator keyboard boundary is the complete `.citizen-creator-view`, not only the current form. Therefore shortcuts remain available after applying a template, changing a step or rerendering the step body.

```text
Alt+1–5       select Creator step
Alt+Left      previous step
Alt+Right     next step
Ctrl/Cmd+S    save the current draft
```

After every Creator rerender, focus returns to the active step control. Admin activation invalidates any pending module navigation token before the activated Citizen Card is rendered. A stale `character-creator` refresh must not reopen the read-only Creator after `activateCitizenDraft()` succeeds.

Seed Citizens may use an empty portrait. Empty portrait values render a true missing-state frame and must not emit `<img src="">` or request nonexistent local portrait assets.
