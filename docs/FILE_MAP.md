# FILE_MAP — Canonical Ownership

## Entrypoints and loaders

```text
index.html
  shared tabs: css/system-tabs.css?v=8
  Terminal Entry/Reminder stores: v2 / v1 before Citizen Store
  Citizen integration store: v144
  Household Store: v4
  Housing Rent standards data/store: v1 / v1
  Housing Layout pools data/store: v1 / v1
  Housing Furnishing lifecycle data/runtime: v1 / v1
  Housing Rent Subscription Bridge: v3
  Subscription catalog data/store: v13 / v8
  Notification event/templates/resolver/policy/API/Market producer/Housing bridge/Housing producer: v6 / v3 / v4 / v2 / v4 / v1 / v1 / v1
  Market offers/store: v4 / v12
  ItemInstance data/store: v8 / v15
  shared bundle map: js/modules.js?v=307
  player Subscriptions scripts: lazy-only, not eager

js/modules.js
  canonical lazy bundle registry
  Terminal Inbox: css v4 / runtime v11
  Subscriptions: css v21, runtime/profile v35, workspace v7, action feedback v1
  Equipment: css v129, store v35, actions v57, Bodymap panel v25, items v30, containers v39, Cyberware bridge v20, shell v118
  Housing: css v36, Storage runtime v3, Household runtime v3, shell v51
  Global Market: Market offers/store v4/v12, workspace runtime v1, module v2
  Admin Subscriptions: css v3 / controller v5
```

## Core state and infrastructure

| Responsibility | Files |
|---|---|
| global store helpers and Citizen integration adapter | `js/store-utils.js`, `js/store.js` |
| Terminal Inbox/reminder persistence and Campaign Time datetime lifecycle | `js/terminal-entry-store.js`, `js/terminal-reminder-store.js`, `js/store.js`, `docs/contracts/core/terminal_inbox_datetime_contract.md` |
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
| Equipment/Cyberware catalog identity and consumable package metadata | `js/equipment-catalog-store.js`, `data/equipment-catalog.js`, `data/body-cyberware-catalog.js` |
| Campaign snapshot and Billing transfer adapter | `js/campaign-data-io-registry.js`, `js/campaign-data-io-adapters.js`, `js/campaign-data-io-v6.js` |
| Campaign Time timestamp/revision and date compatibility | `js/main.js`, `js/world-time-service-scheduler.js`, `docs/contracts/core/campaign_time_datetime_contract.md` |
| stateless deterministic event timing and operating windows | `js/world-time-event-windows.js`, `docs/contracts/core/world_time_event_windows_contract.md` |
| Organizations and transfer account identity | `js/organization-store.js`, `data/organizations.js`, `data/organization-locations.js` |
| Notifications, content projection, operation-card policy and domain producers | `js/notification-registry.js`, `data/notification-event-catalog.js`, `data/notification-content-templates.js`, `js/notification-content-resolver.js`, `js/notification-projection-policy.js`, `js/market-notification-producer.js`, `js/housing-shipment-event-bridge.js`, `js/housing-notification-producer.js`, `js/notification-api.js` |

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
| Admin reusable catalog management and Equipment definition authoring | `js/admin-catalog-management.js`, `js/admin-equipment-catalog-authoring.js`, `js/admin/workspaces/admin-workspace-catalog-management.js` |

## Services, Subscriptions and commerce

| Responsibility | Files |
|---|---|
| subscription catalog/API | `data/subscription-catalog.js`, `js/subscription-catalog-store.js`, `js/subscription-api.js`, `js/subscription-entitlement.js` |
| Housing Rent standards H–A, tier capabilities and storage projection | `data/housing-rent-standards.js`, `js/housing-rent-standards-store.js`, `docs/contracts/commerce/housing_rent_standards_catalog_contract.md` |
| four-view Subscriptions player workspace, selectors and terminal navigation cards | `js/subscriptions-workspace.js`, `css/subscriptions.css`, `css/system-tabs.css` |
| shared player/Admin subscription action result mapping, processing lock and feedback presentation | `js/subscription-action-feedback.js`, `css/subscription-action-feedback.css` |
| Subscription product/contract/provider profiles | `js/subscriptions.js` |
| service definitions/orders | `data/service-definitions.js`, `js/service-bridge-store.js` |
| persistent Service shell, contexts, cache/pagination, cold-entry diagnostics and viewport restoration | `js/service.js`, `css/service.css` |
| Service offer-state persistence with refresh suppression | `js/store.js` |
| offer generation, shared weekly eligibility context and requirements | `js/service-offer-generator.js`, `js/service-requirements.js`, `js/subscription-entitlement.js` |
| Market offers, carts, checkout, pickup, refunds and selected-instance partial returns | `js/market-store.js`, `data/market-offers.js`, `docs/contracts/commerce/market_partial_return_refund_contract.md` |
| Housing Unit/Storage runtime | `js/housing-storage-runtime.js`, `js/housing-grid-engine-adapter.js`, public Housing/Equipment APIs |
| Global Market storefront, neutral product cards, cart navigation, fulfillment and returns | `js/market.js?v=2`, `js/market-workspace-runtime.js?v=1`, `js/market-store.js?v=12`, `css/housing.css`, `data/equipment-catalog.js`, `js/equipment-catalog-store.js` |
| Household furnishing projection and placement workspace | `js/household-store.js`, `js/housing-household-runtime.js`, `docs/contracts/commerce/housing_household_furnishing_workspace_contract.md` |
| Household furnishing lifecycle, ownership, grade wear, condition, slots, repair/replacement/disposal | `data/housing-furnishing-lifecycle.js`, `js/housing-furnishing-lifecycle.js`, `js/household-store.js`, `js/housing-household-runtime.js`, `docs/contracts/commerce/housing_furnishing_lifecycle_contract.md` |
| Housing persistence, Rent contract projection and grid placement | `js/housing-rent-standards-store.js`, `js/housing-rent-subscription-bridge.js`, `js/housing-bridge-store.js`, `js/housing-grid-engine-adapter.js` |
| world time scheduler | `js/world-time-service-scheduler.js` |
| event window policy resolver | `js/world-time-event-windows.js` |

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
| dual mounted Bodymap trees, canonical AVIF masters, view sync, selection sync and image decode warmup | `js/equipment-bodymap-panel.js`, `assets/bodymap/bodymap_front.avif`, `assets/bodymap/bodymap_back.avif` |
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
| module rendering and layered desktop relation sidecar | `js/encyclopedia-module.js`, `js/system-registry.js`, `css/knowledge-sections.css` |

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
| Lazy Market workspace runtime | `js/market-workspace-runtime.js`, `js/market-store.js`, `data/market-offers.js` |
| Item grid presentation | `js/equipment-containers-panel.js`, `js/housing-storage-runtime.js`, `css/equipment.css`, `css/housing.css` |
| Market delivery fulfillment | `js/market-store.js`, `js/market-workspace-runtime.js`, `data/market-offers.js` |

Tests added or extended in 15.10x:

```text
tests/contracts/admin-operations-workspace.test.cjs
tests/unit/admin-operations-command.test.cjs
tests/contracts/housing-household-foundation.test.cjs
tests/contracts/market-workspace-runtime-split.test.cjs
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
| Market Cart navigation semantics | `js/market-workspace-runtime.js`, `js/housing.js`, `docs/contracts/commerce/market_cart_navigation_contract.md` |
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

## Runtime 15.12x additions

| Responsibility | Canonical files |
|---|---|
| Market workspace extraction and Housing decoupling | `data/modules.js`, `js/market.js`, `js/housing.js`, `js/market-workspace-runtime.js`, `docs/contracts/commerce/housing_market_decoupling_contract.md` |
| Equipment catalog authoring | `js/admin-equipment-catalog-authoring.js`, `js/admin-catalog-management.js`, `js/admin/workspaces/admin-workspace-catalog-management.js`, `js/equipment-catalog-store.js` |
| Campaign datetime foundation | `js/main.js`, `js/world-time-service-scheduler.js`, `js/campaign-data-io-adapters.js`, `js/campaign-data-io-v6.js` |
| Knowledge relation isolation without content replacement | `js/knowledge-relations.js`, `js/knowledge-pack-store.js`, `js/entries-store.js`, `js/system-store.js`, `js/system-registry.js`, `css/knowledge-sections.css` |

Tests added or extended in 15.12x:

```text
tests/contracts/housing-market-decoupling.test.cjs
tests/contracts/admin-catalog-management.test.cjs
tests/contracts/admin-equipment-catalog-authoring.test.cjs
tests/unit/admin-equipment-catalog-authoring.test.cjs
tests/contracts/knowledge-relation-tabs.test.cjs
tests/unit/knowledge-relations.test.cjs
tests/unit/campaign-time.test.cjs
tests/unit/world-time-scheduler.test.cjs
```
## Runtime 15.14x additions

| Responsibility | Canonical files |
|---|---|
| Knowledge relation desktop sidecar presentation | `css/knowledge-sections.css`, `js/system-registry.js`, `js/encyclopedia-module.js` |
| Terminal Inbox Campaign Time timestamps and skipped-interval emission | `js/terminal-entry-store.js`, `js/notification-api.js`, `js/terminal-module.js`, `docs/contracts/core/terminal_inbox_datetime_contract.md` |
| Housing irregular layout pools and deterministic assignment | `data/housing-layout-pools.js`, `js/housing-layout-store.js`, `js/household-store.js`, `js/housing-household-runtime.js`, `docs/contracts/commerce/housing_layout_pools_contract.md` |
| Standalone Cyberware player module | `data/modules.js`, `js/cyberware-module.js`, `js/cyberware-workspace.js`, `css/cyberware.css`, `docs/contracts/cyberware/cyberware_module_extraction_contract.md` |

```text
index.html: data/modules v58, citizens v79, item-instances v7, Terminal Entry v2, Citizen integration store v144, Housing Layout store v1, Housing Bridge v4, Household Store v3, Notification API v4, Campaign Data I/O adapters v8, modules v301
js/modules.js: Terminal runtime v11; Equipment css/store/actions/bodymap/bridge/shell v129/35/57/25/20/118; Cyberware css/index/planner/workspace/module v1/2/8/1/1; Housing css/Household runtime v33/2
```

## Runtime 15.15x additions

| Responsibility | Canonical files |
|---|---|
| Rent subscription → physical Housing Unit projection, modernization and relocation/release preparation | `js/housing-rent-subscription-bridge.js`, `js/housing-bridge-store.js`, `js/housing.js`, `docs/contracts/commerce/housing_rent_subscription_bridge_contract.md` |
| Knowledge sidecar stacking and opaque article-edge occlusion | `css/knowledge-sections.css`, existing `js/system-registry.js`, existing `js/encyclopedia-module.js`, `docs/contracts/knowledge/knowledge_relations_contract.md` |

```text
index.html: knowledge CSS v12, Housing Bridge v5, Rent Subscription Bridge v1, modules v302
js/modules.js: Housing css/shell v34/50; Equipment Bodymap remains v25 with canonical AVIF paths
```


## Runtime 15.16x additions

| Responsibility | Canonical files |
|---|---|
| Article-anchored Knowledge relation tabs | `css/knowledge-sections.css`, `docs/contracts/knowledge/knowledge_relations_contract.md` |
| Hierarchical Cyberware Anatomy Bodymap | `data/cyberware-bodymap-layouts.js`, `js/cyberware-anatomy-bodymap.js`, `css/cyberware-anatomy-bodymap.css`, `js/cyberware-workspace.js` |
| Atomic Housing Rent relocation execution and recovery | `js/housing-rent-relocation-runtime.js`, `js/housing-rent-subscription-bridge.js`, `docs/contracts/commerce/housing_rent_relocation_runtime_contract.md` |
| Persistent exact-time Campaign queue | `js/world-time-scheduled-events.js`, `js/campaign-data-io-adapters.js`, `docs/contracts/core/world_time_scheduled_events_contract.md` |
| Neutral text-only Market product cards | `data/equipment-catalog.js`, `js/equipment-catalog-store.js`, `js/market-workspace-runtime.js`, `css/housing.css`, `docs/contracts/commerce/market_card_ui_contract.md` |

```text
index.html: Knowledge CSS v13; Equipment Catalog data/store v26/v15; Rent Bridge v2; Relocation Runtime v1; modules v304; Campaign Data I/O adapters v9; Scheduled Events v1
js/modules.js: Cyberware Anatomy CSS/layout/runtime v1 and workspace/module v2; Housing/Market CSS v35; Housing shell v51; Market runtime v5
```

## Runtime 15.17x additions

### Housing Furnishing Lifecycle 4.0x

```text
index.html
  data/housing-furnishing-lifecycle.js?v=1
  data/item-instances.js?v=8
  js/household-store.js?v=4
  js/housing-rent-subscription-bridge.js?v=3
  js/housing-furnishing-lifecycle.js?v=1
  js/modules.js?v=306

js/modules.js
  css/housing.css?v=36
  data/equipment-catalog.js?v=27
  js/housing-household-runtime.js?v=3
```

| Responsibility | Canonical files |
|---|---|
| lifecycle registry and functional module compatibility | `data/housing-furnishing-lifecycle.js` |
| operator furnishing reconciliation, weekly wear and lifecycle commands | `js/housing-furnishing-lifecycle.js` |
| Household lifecycle projection and collision rules | `js/household-store.js` |
| player-facing lifecycle, slots and actions | `js/housing-household-runtime.js`, `css/housing.css` |
| operator-asset exclusion from Rent relocation manifests | `js/housing-rent-subscription-bridge.js` |
| module definitions and pre-alpha physical instances | `data/equipment-catalog.js`, `data/item-instances.js` |

### Market Workspace Extraction 6.4x

| Responsibility | Canonical files |
|---|---|
| standalone Market shell | `js/market.js?v=2` |
| lazy Market renderer and command adapter | `js/market-workspace-runtime.js?v=1` |
| offers, carts, orders, stock, shipments and recovery | `js/market-store.js?v=12` |
| workspace runtime contract | `docs/contracts/commerce/market_workspace_runtime_contract.md` |
| Housing / Market boundary | `docs/contracts/commerce/housing_market_decoupling_contract.md` |
| extraction quality gate | `tests/contracts/market-workspace-extraction.test.cjs` |
| retired path | `js/housing-market-runtime.js` through `DELETE_FILES.txt` |

### Knowledge Relation Article Index Tabs 1.5x

| Responsibility | Canonical files |
|---|---|
| fixed-depth article index tabs, opaque occlusion and deterministic label wrapping | `css/knowledge-sections.css`, `js/system-registry.js`, `js/encyclopedia-module.js`, `docs/contracts/knowledge/knowledge_relations_contract.md` |

```text
index.html
  css/knowledge-sections.css?v=14
  js/system-registry.js?v=18
  js/encyclopedia-module.js?v=15
```

## 15.18x additions

### Housing Notification Events 2.6x

| Responsibility | Canonical files |
|---|---|
| persisted MarketShipment to semantic Housing event projection | `js/housing-shipment-event-bridge.js` |
| Housing semantic event to Terminal notification projection | `js/housing-notification-producer.js` |
| Housing shipment/storage player content | `data/notification-event-catalog.js?v=6`, `data/notification-content-templates.js?v=3`, `js/notification-content-resolver.js?v=4` |
| notification bridge contract and regression coverage | `docs/contracts/world_bridge/terminal_notifications_bridge_contract.md`, `tests/contracts/housing-notification-events.test.cjs` |

### Subscriptions Entitlement Projection 4.6

| Responsibility | Canonical files |
|---|---|
| exact-time defensive contract entitlement snapshot | `js/subscription-entitlement.js?v=8` |
| Campaign Time entitlement reconciliation boundary | `js/subscription-api.js?v=6` |
| player profile and list projection | `js/subscriptions.js?v=35`, `js/subscriptions-workspace.js?v=7` |
| Admin list/profile projection | `js/admin-subscriptions-control.js?v=5` |
| deterministic expiry, grace, target-loss and no-mutation coverage | `tests/contracts/subscriptions-entitlement-projection.test.cjs` |

```text
index.html
  data/notification-event-catalog.js?v=6
  data/notification-content-templates.js?v=3
  js/subscription-entitlement.js?v=8
  js/notification-content-resolver.js?v=4
  js/housing-shipment-event-bridge.js?v=1
  js/housing-notification-producer.js?v=1
  js/subscription-api.js?v=6
  js/modules.js?v=307
```

## Runtime 15.19x additions

### Market exact-time, secondary listings and wishlists

| Responsibility | Canonical files |
|---|---|
| exact Campaign Time Market lifecycle scheduling | `js/market-time-scheduler.js`, `js/world-time-scheduled-events.js`, `docs/contracts/commerce/market_datetime_scheduler_contract.md` |
| system-generated secondary listing persistence and simulation | `js/market-secondary-listing-store.js`, `docs/contracts/commerce/market_secondary_listing_contract.md` |
| named wishlist persistence | `js/market-wishlist-store.js`, `docs/contracts/commerce/market_wishlist_contract.md` |
| storefront, modal Product Inspector, Secondary and Wishlist projections | `js/market-workspace-runtime.js?v=3`, `js/market.js?v=4`, `css/housing.css?v=38` |
| canonical cart/order/stock/fulfillment ownership | `js/market-store.js?v=13` |
| Market snapshot adapters | `js/campaign-data-io-adapters.js?v=11` |

### Household Hub

| Responsibility | Canonical files |
|---|---|
| presentation registry, global weather profiles and ambient feed entries | `data/housing-household-hub.js` |
| Household overview, collections, displays and read-only history | `js/housing-household-hub.js` |
| physical furnishings, storage and placement | `js/household-store.js`, `js/housing-household-runtime.js`, `js/housing.js?v=53` |
| Household Hub contract | `docs/contracts/commerce/housing_household_hub_contract.md` |

### Cyberware upgrades

| Responsibility | Canonical files |
|---|---|
| module/permanent-mod catalog | `data/cyberware-upgrade-catalog.js` |
| typed slot validation, quotes, effective projection and service-result commit | `js/cyberware-upgrade-system.js` |
| host ItemInstance state and child module location | `js/item-instance-store.js?v=16`, `js/cyberware-store.js?v=10`, `js/cyberware-runtime.js?v=3` |
| player UI and World Bridge operations | `js/cyberware-items-panel.js?v=3`, `js/cyberware-workspace.js?v=3`, `js/cyberware-world-bridge.js`, `js/cyberware-module.js?v=3` |
| active contract | `docs/contracts/cyberware/cyberware_upgrade_system_contract.md` |

### Knowledge tabs 1.6x

| Responsibility | Canonical files |
|---|---|
| desktop article-tab clip boundary and mask | `css/knowledge-sections.css?v=15`, `docs/contracts/knowledge/knowledge_relations_contract.md` |

```text
index.html: Item Type v5; Equipment Catalog v28; ItemInstance seed/store v9/v16; Market Store v13; Campaign Data I/O v11; Market scheduler/listing v1; modules v309
js/modules.js: Cyberware Upgrade catalog/runtime v1; Cyberware CSS/module/workspace v2/v3/v3; Market CSS v38, Wishlist v1, workspace v3, shell v4; Household Hub data/runtime v1, Housing shell v53
```
