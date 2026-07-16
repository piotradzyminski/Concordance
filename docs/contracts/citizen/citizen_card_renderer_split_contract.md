# Citizen Card Renderer Split Contract

```text
scope: Citizen Card rendering architecture
version: 2.0x
phase: pre-alpha
```

## Purpose

Citizen Card rendering is separated into explicit lazy-runtime responsibilities without changing current markup, commands, navigation semantics or CSS ownership. The original 2.0x rerender behavior is superseded for presentation-only interactions by the Citizen Card Interaction Fast Path 2.1x contract.

The split exists to make later interaction and presentation work local and reviewable. It does not introduce a second Citizen model or another persistence boundary.

## Canonical files

```text
js/citizen-card-renderers.js
js/citizen-card-shell.js
js/citizen-cards-registry.js
js/citizen-records.js
js/modules.js
```

## Ownership boundaries

### `citizen-card-renderers.js`

Owns read-only HTML projection helpers for:

- identity and masked identity;
- portrait, badges and profile data;
- risk, occupation and service-log presentation;
- Skills and Abilities presentation;
- Cyberware card projection;
- Financial and Subscription summary presentation;
- Equipment summary delegation;
- common Citizen Card section and rating renderers.

It must not own event listeners, module routing, record lifecycle commands, registry filtering or persistence.

### `citizen-card-shell.js`

Owns:

- `renderCitizenCardModule()`;
- mounted Citizen Card composition;
- card-mode, quick-link, subscription and Equipment Inspector bindings;
- Admin owner-edit and Archive/Restore command invocation;
- back-button binding;
- mounted local refresh boundaries defined by Citizen Card Interaction Fast Path 2.1x.

It does not own the GM Citizen Cards list renderer or filtering implementation.

### `citizen-cards-registry.js`

Owns:

- `renderCitizenCardsModule()`;
- GM registry summary and list-card projection;
- registry search/profile/risk/debt/subscription filters;
- draft and Quick NPC entry actions;
- `openCitizenCard()` registry routing.

It does not own Citizen Card domain sections, card-mode controls or card-detail event bindings.

### `citizen-records.js`

Remains a compatibility facade only. It exposes the established `WS_APP.renderCitizenCardModule` and `WS_APP.renderCitizenCardsModule` entrypoints when their owning scripts are present.

The facade must not contain UI markup, event listeners, persistence, lifecycle commands or registry calculations.

## Lazy bundle boundaries

```text
citizen-card
  projections
  citizen-card-renderers.js
  citizen-card-shell.js
  citizen-records.js

citizen-cards
  projections
  citizen-card-renderers.js
  citizen-card-shell.js
  citizen-cards-registry.js
  citizen-records.js

citizen-files / citizen-database
  projections
  citizen-card-renderers.js
  citizen-card-shell.js
  citizen-records.js
  database-specific scripts
```

The GM registry renderer must not be loaded by the player Citizen Card, Citizen Files or Citizen Database detail bundle.

## Compatibility invariants

- `window.WS_APP.renderCitizenCardModule` remains available after the detail bundle loads.
- `window.WS_APP.renderCitizenCardsModule` and `window.WS_APP.openCitizenCard` remain available after the GM registry bundle loads.
- Direct compatibility calls from `citizen-database.js` to `renderCitizenCardModule()` and `getCitizenShortId()` remain valid.
- Projection adapters remain read-only and continue to load before all Citizen Card renderers.
- Quick-link target behavior, Skills/Abilities semantics and CSS ownership remain unchanged by the renderer split.
- Citizen Card Interaction Fast Path 2.1x supersedes the former Full/Compact delay and presentation-only full-card rerender behavior.

## Explicit non-goals

This scope does not itself define interaction optimization; that responsibility is now documented by `citizen_card_interaction_fast_path_contract.md`.

The remaining non-goals are:

- change quick-link routing payloads;
- change Skills or Abilities interaction semantics;
- consolidate Citizen Card CSS;
- retire legacy Cyberware CSS;
- paginate or virtualize the GM registry.

Those remain separate follow-up patches.
