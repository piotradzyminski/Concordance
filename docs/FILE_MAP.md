# FILE_MAP — Canonical Ownership

## Entrypoints and loaders

```text
index.html
  shared tabs: css/system-tabs.css?v=8
  Terminal Entry/Reminder stores: v1 / v1 before Citizen Store
  Citizen integration store: v141
  Household Store: v2
  Notification event/templates/resolver/policy/API/Market producer: v5 / v2 / v2 / v2 / v3 / v1
  Market offers/store: v4 / v12
  ItemInstance Store: v15
  shared bundle map: js/modules.js?v=295
  player Subscriptions scripts: lazy-only, not eager

js/modules.js
  canonical lazy bundle registry
  Terminal Inbox: css v4 / runtime v10
  Subscriptions: css v21, runtime/profile v34, workspace v6, action feedback v1
  Equipment: css v127, store v34, actions v55, items v30, containers v39, Cyberware link v19, shell v117, Cyberware Index v1
  Housing: css v31, Storage runtime v3, Household runtime v1, shell v48
  Housing Market workspace: Market offers/store v4/v12, runtime v3
  Admin Subscriptions: css v3 / controller v4
```

## Core state and infrastructure

| Responsibility | Files |
|---|---|
| global store helpers and Citizen integration adapter | `js/store-utils.js`, `js/store.js` |
| Terminal Inbox/reminder persistence | `js/terminal-entry-store.js`, `js/terminal-reminder-store.js`, `js/store.js` delegation |
| shared Citizen finance/date helpers | `js/citizen-finance.js` |
| Citizen identity derivation and commands | `js/citizen-identity.js`, `js/citizen-command-api.js`, `js/citizen-records.js` |
| Citizen Files persistence | `js/citizen-file-store.js`, `docs/contracts/citizen/citizen_files_contract.md` |
| Database record relation projection | `js/database-relations.js`, `docs/contracts/citizen/database_record_relations_contract.md` |
| Service Log lifecycle registry | `js/service-log-lifecycle.js`, `js/store.js`, `docs/contracts/admin/admin_service_lifecycle_contract.md` |
| Item Type command operations and Inspector UI | `js/item-type-operations.js`, `js/item-type-operations-ui.js`, `docs/contracts/equipment/item_type_contract.md` |
| Billing accounts, corrections, atomic transfers and transactions | `js/billing-store.js`, `js/billing.js` |
| Item instances, player labels, itemState, canonical definition projection and warmed view cache | `js/item-instance-store.js`, `js/item-instance-transaction-store.js` |
| consumable quantity operations and daily usage log | `js/item-type-operations.js`, `js/item-instance-transaction-store.js`, `docs/contracts/equipment/consumable_usage_log_contract.md` |
| functional item type registry and schemas | `data/item-type-catalog.js`, `js/item-type-registry.js`, `docs/contracts/equipment/item_type_contract.md` |
| Equipment/Cyberware catalog identity, consumable package metadata and canonical product visualProfile | `js/equipment-catalog-store.js`, `data/equipment-catalog.js`, `data/body-cyberware-catalog.js`, `assets/market/products/**` |
| Campaign snapshot and Billing transfer adapter | `js/campaign-data-io-registry.js`, `js/campaign-data-io-adapters.js`, `js/campaign-data-io-v6.js` |
| Organizations and transfer account identity | `js/organization-store.js`, `data/organizations.js`, `data/organization-locations.js` |
| Notifications, content projection, operation-card policy and Market producer | `js/notification-registry.js`, `data/notification-event-catalog.js`, `data/notification-content-templates.js`, `js/notification-content-resolver.js`, `js/notification-projection-policy.js`, `js/market-notification-producer.js`, `js/notification-api.js` |

## Citizen and Admin

| Responsibility | Files |
|---|---|
| creator/templates | `js/citizen-creator.js`, `js/citizen-template-service.js`, `data/citizen-templates.js` |
| profile/admin editors | `js/citizen-profile-editor.js`, `js/citizen-admin-editor.js`, `css/citizen-admin-editor.css`, `js/citizen-quick-npc.js` |
| complete mechanics projection and identity preview | `js/citizen-admin-editor.js`, `js/citizen-identity.js` |
| section save/discard and delegated full-card commands | `js/citizen-admin-editor.js`, `js/citizen-command-api.js` |
| dependency preview | `js/admin-dependency-resolver.js` |
| record lifecycle command boundary | `js/admin-record-lifecycle.js`, domain lifecycle adapters, `docs/contracts/admin/admin_record_lifecycle_contract.md` |
| audit persistence | `js/admin-audit-store.js` |
| admin shell/runtime, renderer registry and Billing transfer workspace | `js/admin/admin-shell.js`, `js/admin/admin-workspace-registry.js`, `js/admin/admin-workspace-loader.js`, `js/admin-control.js`, `js/admin/workspaces/admin-workspace-*.js` |
| Admin Subscriptions index/profile/actions | `js/admin-subscriptions-control.js`, `css/admin-subscriptions.css` |

## Services, Subscriptions and commerce

| Responsibility | Files |
|---|---|
| subscription catalog/API | `js/subscription-catalog-store.js`, `js/subscription-api.js`, `js/subscription-entitlement.js` |
| four-view Subscriptions player workspace, selectors and terminal navigation cards | `js/subscriptions-workspace.js`, `css/subscriptions.css`, `css/system-tabs.css` |
| shared player/Admin subscription action result mapping, processing lock and feedback presentation | `js/subscription-action-feedback.js`, `css/subscription-action-feedback.css` |
| Subscription product/contract/provider profiles | `js/subscriptions.js` |
| service definitions/orders | `data/service-definitions.js`, `js/service-bridge-store.js` |
| persistent Service shell, contexts, cache/pagination, cold-entry diagnostics and viewport restoration | `js/service.js`, `css/service.css` |
| Service offer-state persistence with refresh suppression | `js/store.js` |
| offer generation, shared weekly eligibility context and requirements | `js/service-offer-generator.js`, `js/service-requirements.js`, `js/subscription-entitlement.js` |
| Market offers, carts, checkout, pickup, refunds and selected-instance partial returns | `js/market-store.js`, `data/market-offers.js`, `docs/contracts/commerce/market_partial_return_refund_contract.md` |
| Housing Unit/Storage runtime | `js/housing-storage-runtime.js`, `js/housing-grid-engine-adapter.js`, public Housing/Equipment APIs |
| Housing Market storefront, cart navigation, product visuals, fulfillment and returns | `js/housing-market-runtime.js`, `js/market-store.js`, `css/housing.css`, `data/equipment-catalog.js`, `js/equipment-catalog-store.js`, `assets/market/fallback/**`, `docs/contracts/commerce/market_cart_navigation_contract.md` |
| Household furnishing projection and placement workspace | `js/household-store.js`, `js/housing-household-runtime.js`, `docs/contracts/commerce/housing_household_furnishing_workspace_contract.md` |
| Housing persistence and grid placement | `js/housing-bridge-store.js`, `js/housing-grid-engine-adapter.js` |
| world time | `js/world-time-service-scheduler.js` |

## Equipment and Cyberware

| Responsibility | Files |
|---|---|
| Equipment state, itemType/itemState and ItemInstance display-name projection | `js/equipment-store.js`, `js/equipment-assignment.js`, `js/item-type-registry.js` |
| delegated Equipment actions, collapsed rename disclosure, rename commands, tooltip controller, Bodymap view action and selection fast-path dispatch | `js/equipment-actions.js` |
| shared player-facing label formatter, item/Inspector/tooltip projection and rename control | `js/equipment-items-panel.js` |
| canonical equip validation including BROKEN rejection | `js/equipment-loadout-rules.js` |
| grid pointer/placement | `js/grid-pointer-session.js`, `js/equipment-housing-grid.js` |
| body-region slot projection, condition classes, contextual labels and single empty-slot ghost identity | `js/equipment-body-regions-panel.js` |
| normalized container hierarchy/type labels, grids and local CyberGrid selection sync | `js/equipment-containers-panel.js` |
| dual mounted Bodymap trees, view sync, selection sync and image decode warmup | `js/equipment-bodymap-panel.js` |
| Equipment workspace cache, Bodymap view fast path and item-selection fast path | `js/equipment.js` |
| Cyberware workspace composition, Neural Core, operations, Definition Index and rename controls | `js/equipment-cyberware-link.js`, `js/cyberware-items-panel.js`, `js/cyberware-index.js` |
| Cyberware normalization and display-name projection | `js/cyberware-store.js`, `js/cyberware-actions.js` |
| Cyberware runtime and Core Stack labels | `js/cyberware-runtime.js`, `js/cyberware-core-stack.js`, `js/cyberware-authorization.js` |
| planner/diagnostics/maintenance | `js/cyberware-planner.js`, `js/cyberware-diagnostics.js`, `js/cyberware-maintenance.js` |
| World Bridge | `js/cyberware-world-bridge.js`, `js/world-bridge-operation-store.js` |
| firmware | `js/firmware-registry.js`, `data/firmware-registry.js` |

## Knowledge

| Responsibility | Files |
|---|---|
| records | `js/entries-store.js`, `data/entries.js` |
| pack import/merge | `js/knowledge-pack-store.js` |
| stable relations | `js/knowledge-relations.js` |
| module rendering | `js/encyclopedia-module.js`, `js/system-registry.js` |

## Test infrastructure

```text
scripts/check-js.mjs
scripts/run-tests.mjs
tests/unit/admin-billing-transfers.test.cjs
tests/unit/admin-workspace-loader.test.cjs
tests/unit/market-partial-return-refund.test.cjs
tests/unit/citizen-command-api.test.cjs
tests/contracts/admin-billing-transfers.test.cjs
tests/contracts/admin-workspace-renderers.test.cjs
tests/contracts/market-partial-return-refund.test.cjs
tests/contracts/citizen-card-editor.test.cjs
tests/contracts/subscriptions-workspace-ui.test.cjs
tests/contracts/subscriptions-profiles-ui.test.cjs
tests/contracts/subscriptions-actions-feedback.test.cjs
tests/contracts/equipment-bodymap-fast-path.test.cjs
tests/contracts/equipment-selection-fast-path.test.cjs
tests/contracts/equipment-region-slot-workspace-tabs.test.cjs
tests/contracts/market-product-catalog-consumables.test.cjs
tests/contracts/market-product-visual-assets.test.cjs
tests/contracts/cyberware-ui-neural-core-workspace.test.cjs
tests/contracts/admin-subscriptions-ui.test.cjs
tests/contracts/item-type-framework.test.cjs
tests/contracts/equipment-dual-test-loadouts.test.cjs
tests/contracts/item-instance-view-cache.test.cjs
tests/contracts/service-entry-eligibility-cache.test.cjs
tests/e2e/equipment-selection-fast-path.spec.cjs
tests/e2e/citizen-creator-editor.spec.cjs
tests/e2e/equipment-bodymap-fast-path.spec.cjs
tests/contracts/notification-projection-policy.test.cjs
tests/contracts/housing-storage-runtime-split.test.cjs
tests/contracts/item-type-effect-resolution.test.cjs
tests/contracts/admin-record-lifecycle-contract.test.cjs
tests/unit/admin-record-lifecycle.test.cjs
tests/e2e/module-cold-entry.spec.cjs
playwright.config.cjs
```

## Documentation layout

```text
project.md                 project identity, ownership and engineering rules
PATCH_STATE.md             root pointer
FILE_MAP.md                root pointer
docs/README.md             documentation policy and index
docs/PATCH_STATE.md        current canonical state
docs/FILE_MAP.md           canonical ownership map
docs/ROADMAP.md            recommended remaining work
docs/contracts/**          active domain contracts only
```

The repository intentionally does not contain committed `docs/patchnotes`, `docs/audits`, `docs/plans` or retirement tombstones. Git history is the implementation archive.
## Runtime 15.10x additions

| Responsibility | Canonical files |
|---|---|
| Shared tab component | `css/system-tabs.css` |
| Terminal Inbox projected content UI | `js/terminal-module.js`, `css/terminal-module.css`, Notification API/content/projection contracts |
| Admin World Bridge operations workspace | `js/admin-operations-command.js`, `js/admin/workspaces/admin-workspace-operations.js` |
| Subscription catalog presentation | `data/subscription-catalog.js`, `js/subscription-catalog-store.js`, `js/subscriptions.js`, `js/subscriptions-workspace.js` |
| Household state and safe-space readiness | `js/household-store.js`, `js/housing.js`, `css/housing.css` |
| Housing storage runtime | `js/housing-storage-runtime.js` |
| Lazy Housing Market runtime | `js/housing-market-runtime.js`, `js/market-store.js`, `data/market-offers.js` |
| Item grid presentation | `js/equipment-containers-panel.js`, `js/housing-storage-runtime.js`, `css/equipment.css`, `css/housing.css` |
| Market delivery fulfillment | `js/market-store.js`, `js/housing-market-runtime.js`, `data/market-offers.js` |

Tests added or extended in 15.10x:

```text
tests/contracts/admin-operations-workspace.test.cjs
tests/unit/admin-operations-command.test.cjs
tests/contracts/housing-household-foundation.test.cjs
tests/contracts/housing-market-runtime-split.test.cjs
tests/contracts/item-grid-presentation.test.cjs
tests/contracts/market-delivery-fulfillment.test.cjs
tests/unit/market-delivery-fulfillment.test.cjs
tests/contracts/subscriptions-catalog-presentation.test.cjs
tests/contracts/terminal-inbox-content-ui.test.cjs
tests/contracts/ui-tabs-component-contract.test.cjs
```

## Runtime 15.11x additions

| Responsibility | Canonical files |
|---|---|
| Terminal Inbox entry/reminder persistence extraction | `js/terminal-entry-store.js`, `js/terminal-reminder-store.js`, `js/store.js` |
| Cyberware definition catalog | `js/cyberware-index.js`, `js/equipment-cyberware-link.js`, `docs/contracts/cyberware/cyberware_ui_contract.md` |
| Household furnishing workspace | `js/housing-household-runtime.js`, `js/household-store.js`, `docs/contracts/commerce/housing_household_furnishing_workspace_contract.md` |
| Market Cart navigation semantics | `js/housing-market-runtime.js`, `js/housing.js`, `docs/contracts/commerce/market_cart_navigation_contract.md` |
| Market notification projection producer | `js/market-notification-producer.js`, Notification content/projection files |
| Subscriptions responsive accessibility | `js/subscriptions-workspace.js`, `js/subscriptions.js`, `js/admin-subscriptions-control.js`, related CSS |
| Shared tabs visual polish | `css/system-tabs.css` and module-local layout integration only |
| Housing grid parity quality gate | `tests/contracts/housing-grid-engine-parity-audit.test.cjs`, existing Housing contracts |

Tests added in 15.11x:

```text
tests/contracts/citizen-store-terminal-extraction.test.cjs
tests/unit/terminal-stores.test.cjs
tests/contracts/cyberware-index.test.cjs
tests/contracts/housing-grid-engine-parity-audit.test.cjs
tests/contracts/housing-household-furnishing-workspace.test.cjs
tests/contracts/market-cart-navigation-semantics.test.cjs
tests/contracts/market-notification-producer.test.cjs
tests/contracts/subscriptions-responsive-accessibility.test.cjs
```
