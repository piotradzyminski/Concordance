# Citizen Card Editor 2.2x — canonical contract

## Scope

Citizen Card editing is split into three independent surfaces:

```text
Citizen Creator
  pre-activation DRAFT / review workflow

Citizen Profile Editor
  narrow self-edit for an ACTIVE owned record

Admin Citizen Editor
  section-based administration of Citizen-owned fields
```

`js/citizen-editor.js` is only the editor router and shared interaction utility owner. It does not render the old shared record form and does not scan rendered Citizen cards.

## Explicit entrypoints

Citizen renderers must emit explicit controls with:

```text
data-citizen-editor-open="<citizenId>"
```

Current owners:

```text
js/citizen-profile.js
js/citizen-records.js
```

A global `MutationObserver` must not inject editor buttons or rescan `[data-citizen-id]` nodes.

## Citizen Profile Editor

Owner:

```text
js/citizen-profile-editor.js
css/citizen-profile-editor.css
```

Allowed ACTIVE self-edit fields:

```text
pseudonym
portrait
appearance
playerNote
```

Mutation boundary:

```text
CitizenCommandAPI.updateCitizenSelfProfile()
```

The Profile Editor must not expose or mutate:

```text
identity legal fields
biological profile
Abilities
Skills
Badges
Risk
Access
Billing
Subscriptions
Service
Housing
Equipment
Cyberware
Market
World Bridge
```

## Admin Citizen Editor

Owner:

```text
js/citizen-admin-editor.js
css/citizen-admin-editor.css
```

Sections:

```text
Overview
Identity
Mechanics
Access
Linked Domains
Audit
```

Section commands:

```text
Identity  -> CitizenCommandAPI.adminUpdateCitizenRecord()
Mechanics -> CitizenCommandAPI.adminCorrectCitizenMechanics()
Access    -> CitizenCommandAPI.adminUpdateCitizenAccess()
Risk      -> setCitizenRisk()
```

There is no global `Save Record`. Each mutable section saves independently.

## Delegated full-card edit

When:

```text
citizen.ownerFullCardEdit === true
```

and the current Citizen account owns the record, the owner may open Admin Citizen Editor and use the same Citizen-owned Identity, Mechanics and Access section commands.

Delegation remains per card and is controlled by Admin through:

```text
CitizenCommandAPI.adminSetOwnerFullCardEdit()
```

Delegation does not grant direct mutation rights to external domains.

## Linked domains

Linked Domains are read-only projections and route to canonical modules:

```text
Billing
Subscriptions
Service
Housing
Equipment
Cyberware
```

Citizen Editor code must not write:

```text
credits
debt
subscriptions
serviceLog
housing records
ItemInstance
cyberware runtime
```

## Lifecycle and destructive actions

Draft states route to Citizen Creator.

```text
DRAFT
CHANGES_REQUESTED
READY_FOR_REVIEW
REJECTED
```

Admin Citizen Editor handles ACTIVE/ARCHIVED records. Archive/Restore uses CitizenCommandAPI. Hard Delete remains disabled.

## Interaction requirements

Both editor workspaces require:

```text
Escape close
focus trap
focus restoration
unsaved-change guard
dirty-state marker
section-level validation feedback
```

## Persistence and compatibility

No new storage owner is introduced. Editors write through existing Citizen/Billing/Risk command boundaries.

The previous shared modal implementation is removed from runtime. There is no legacy editor fallback or compatibility write path.


## Admin mechanics editor

The `Mechanics` section must always expose the complete editable Citizen mechanics projection:

```text
all registered Abilities
all registered Skills grouped by category
legacy Citizen-only Ability/Skill records
Natural Ability editor
read-only Cyberware contribution
Total preview
Skill enable/remove control
Skill level editor
block-formatted value preview
```

Definition resolution order:

```text
System Store definitions
→ APP_DATA system-skills-abilities definitions
→ legacy records present on the Citizen card
```

An empty or stale System Store projection must not remove the mechanics UI.

## Identity code synchronization

`Citizen ID` and `Short ID` are read-only derived fields in the editor.

When Admin or a delegated full-card owner saves a changed `origin` or `birthDate`, `CitizenCommandAPI.adminUpdateCitizenRecord()` must recalculate both identifiers through `recalculateCitizenIdentityCodes()`.

The recalculation preserves the existing birth chunk and random block when possible:

```text
old: 03.51N00E.0A04.20800623.A91B880
new birth date: 2081-01-17
new: 03.51N00E.0A04.20810117.A91B880
Short ID: 20810117.A91B880
```

The Identity section provides a live read-only preview before save.

## Save and discard controls

Editable sections:

```text
Identity
Mechanics
Access
```

must expose:

```text
persistent Save <Section>
persistent Discard <Section>
sticky section Save button
Ctrl/Cmd+S
```

`Discard` rerenders the active section from the canonical stored Citizen record and clears only that section's dirty state. Closing the workspace with remaining dirty sections still requires confirmation.


## Browser-validated editor invariants — 2.2x

Admin Citizen Editor keyboard handling is document-scoped only while its overlay is active. Section rerenders, `Discard`, disabled controls and focus restoration must not detach these shortcuts:

```text
Alt+1–6       select editor section
Alt+Left      previous section
Alt+Right     next section
Ctrl/Cmd+S    save the active mutable section
Escape        close with the existing dirty-state guard
```

Profile Editor save is complete only after the command has persisted the allowed fields and the overlay has closed. The browser contract verifies both state mutation and `aria-hidden="true"`.

Citizen Profile and Citizen Card portrait renderers must treat an empty portrait as a missing-state frame. They must not create an image element with an empty source and must remove a failed image while preserving the missing-state container.

The following real-browser flows are accepted at the canonical desktop viewport `1440×960`:

```text
Admin template application → Creator keyboard navigation → activation → Citizen Card
Admin Quick NPC creation
Citizen Profile Editor Ctrl/Cmd+S save and close
Admin Editor section navigation and section save
Mechanics cards, Discard rerender, persistent actions and Short ID preview
```
