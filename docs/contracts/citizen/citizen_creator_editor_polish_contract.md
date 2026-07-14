# Citizen Creator / Editor Polish 2.1x Contract

## Scope

This layer extends the installed Citizen Creator 1.0x and Citizen Card Editor 2.0x surfaces. It does not replace their lifecycle, ownership or external-domain boundaries.

## Template Registry

Canonical source:

```text
data/citizen-templates.js
js/citizen-template-service.js
```

Templates contain only Citizen-owned starting values:

```text
characterType eligibility
biologicalProfile
classProfile
Natural Abilities
selected Skills
```

Templates do not create or mutate:

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

Template application remains explicit. Manual FREEFORM pre-alpha editing remains available after application.

## Quick NPC Creator

Canonical UI:

```text
js/citizen-quick-npc.js
css/citizen-quick-npc.css
```

Admin-only entrypoint:

```text
Citizen Cards -> Quick NPC
```

Quick NPC creation uses:

```text
CitizenCommandAPI.createQuickNpc()
```

The command creates one `NPC` record and activates it through the Citizen lifecycle. It requires Admin actor metadata, reason and idempotency key. A repeated command must resolve to the same created Citizen.

Quick NPC creation does not assign an owner account and does not grant player full-card edit.

## Keyboard Contract

Character Creator:

```text
Alt+1..5       select step
Alt+Left/Right previous/next step
Ctrl/Cmd+S     save editable draft
```

Citizen Profile Editor:

```text
Ctrl/Cmd+S     save profile
Escape         close with dirty-state guard
```

Admin Citizen Editor:

```text
Alt+1..6       select section
Alt+Left/Right previous/next section
Ctrl/Cmd+S     save active mutable section
Escape         close with dirty-state guard
```

Quick NPC Creator:

```text
Ctrl/Cmd+Enter create active NPC
Escape         close with dirty-state guard
```

## E2E Coverage

Canonical browser spec:

```text
tests/e2e/citizen-creator-editor.spec.cjs
```

Covered flows:

```text
Admin creates and activates a templated Citizen
Admin creates an active Quick NPC
Citizen Profile Editor keyboard save
Admin Citizen Editor keyboard navigation and sectional save
```

The E2E spec uses the existing Playwright harness and local static server contract.
