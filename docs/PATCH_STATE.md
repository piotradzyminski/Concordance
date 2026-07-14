# PATCH_STATE — Current Canonical State

## Baseline

```text
runtime: Parallel Scope Merge 15.11x
documentation: Canonical Documentation 4.0x
phase: pre-alpha
```

## Installed in 15.3x

```text
Citizen Card Editor Hotfix 2.1.1x
Admin Billing Transfers 1.0x
Subscriptions Workspace UI 4.0
Equipment Bodymap View Fast Path 1.0x
```

The merge also repairs an incomplete application of Parallel Scope Merge 15.2x in the supplied baseline. The baseline contained the 15.2x documentation, tests, CSS and entrypoint versions, but eleven runtime JavaScript files plus `js/modules.js` were still the 15.1x variants. The canonical 15.2x runtime files were restored before the four new scopes were merged.

Source patch notes and duplicate state copies were not restored. Active behavior is documented only in `project.md`, the canonical state files and `docs/contracts/**`.

## Installed after 15.3x

```text
Equipment Inspector Label Normalization 1.3.2x
```

The adapted patch preserves the complete 15.3x runtime, including Citizen Editor, Admin Transfers, Subscriptions Workspace and the mounted dual-view Equipment Bodymap fast path. Only player-facing Equipment label projection, related tests and canonical documentation are changed.


## Installed in 15.4x

```text
Cyberware UI Neural Core Workspace 13.3x
Equipment Selection Fast Path 1.0x
Equipment Region/Slot Workspace Tabs 1.3.3x
Subscriptions Workspace Terminal Cards 4.0x
```

The merge preserves Equipment Inspector Label Normalization 1.3.2x and all 15.3x Citizen, Admin, Subscriptions and Bodymap work. Source copies that predated the normalized Equipment formatters were not overlaid wholesale. Only the intended fast-path, empty-slot and terminal-card deltas were transferred.

## Installed in 15.5x

```text
ItemInstance Player Labels UI Hotfix 1.0.1x
Subscriptions Profiles UI 4.1
Market Product Catalog Consumables 5.1x
```

The merge preserves the 15.4x Equipment selection fast path and Neural Core styles. The player-label patch contributed only the collapsed `RENAME` disclosure and its local action handling; its older copies of Equipment selection handlers and shared CSS were not overlaid. Subscriptions profiles remain read projections over SubscriptionAPI and Organization Store. Market consumables remain canonical Equipment Catalog definitions projected through the existing Market Store and Housing storefront.

## Installed in 15.6.1x

```text
Subscriptions Admin UI Alignment 4.2
Item Type Framework 1.0x
Equipment Dual Test Loadouts 1.4.0x
Services Cold Entry Performance 3.3x
```

The merge is based on the supplied 15.5x archive. The Item Type patch originated on 15.3x and was transferred three-way so that player labels, terminal cards, consumables and Selection Fast Path remain intact. Admin Subscriptions adds one lazy workspace over SubscriptionAPI. Item types add functional definitions and per-instance `itemState` without creating another ownership store. Two deterministic Equipment QA sets replace previous test seeds. Service cold entry now shares one eligibility/insurance context per weekly batch and uses a revision-aware subscription contract snapshot cache. Source patch notes were not restored.

## Installed in 15.7x

```text
Database Citizen Files Foundation 1.0x
Database Record Relations 1.0x
Market Cart Drawer Quickfix 5.2.1x
Market Pickup Fulfillment 6.0x
Item Type Operations 1.1x
Item Type Operations UI 1.2x
Citizen Creator/Editor Browser Validation 2.2x
Runtime Bundle Boundaries 1.0x
Terminal Notification Content Projection 2.2x
Cyberware UI Operations Workspace 13.4x
Subscriptions UI Stability 4.2.1
Admin Service Lifecycle 1.0x
```

The merge uses Parallel Scope Merge 15.6.1x as the canonical base. The four patches prepared on 15.5x were transferred through their actual 15.5x ancestor; the remaining patches were merged against 15.6.1x. Citizen Files and Database Relations share one stable document store and projected relation layer. Item Type Operations preserve ItemInstance as the sole physical-state owner. Market pickup and cart inspection share the existing Market/Housing orchestration. Runtime Bundle Boundaries keeps player Subscriptions lazy-only and gives Housing a read-only Cyberware market projection rather than the full Cyberware UI runtime. Source patch notes and historical audits were not restored.

## Installed after 15.7x

```text
ItemInstance View Cache 1.0x
```

Equipment and Cyberware list projections now pass canonical ItemInstance records into the existing view cache instead of mapping cloned records. Public record getters remain defensive. Store rebuilds schedule one-item idle warmup slices so the first Equipment/Cyberware read can reuse prepared views without moving the reconstruction cost into another long task.

## Installed in 15.8x

```text
Market Partial Return / Refund 6.1x
Admin Workspace Renderers 1.0x
```

Completed Market orders may return selected physical ItemInstances through one revisioned `partialReturns[]` operation log. Market Store owns request and recovery state, ItemInstance Transaction Store moves only selected units to vendor custody, Market restores the matching stock quantities and Billing refunds the persisted proportional amount. Housing renders request, execute, withdraw, retry and history controls without owning another return store.

Admin Control resolves workspace content through `AdminWorkspaceRegistry`. Dashboard registers in the base Admin bundle; Citizens, Tags & Access, Subscriptions, Service, Billing, System Requests, Records, Audit and Data / Settings register one renderer from their dedicated lazy workspace bundle. `AdminWorkspaceLoader` marks a bundle ready only after its canonical renderer exists.

## Installed in 15.9x

```text
Market Product Visual Assets 6.2x
Terminal Notification Projection Policy 2.3x
Housing Storage Runtime Split 1.0x
Runtime Cold Entry Dependencies 1.1x
Item Type Consumable Log Simplification 1.3.1x
Subscriptions Actions & Feedback 4.3
Admin Record Lifecycle Contract 1.0x
```

Equipment Catalog owns one optional normalized `visualProfile`. Nineteen starter consumables use dedicated local SVG artwork and department fallbacks, while Market offers retain no competing image field or asset registry.

Notification Projection Policy maintains one primary Inbox card per World Bridge operation, suppresses intermediate technical noise and preserves Notification Registry/API ownership.

Housing Unit and Storage use `js/housing-storage-runtime.js` for projections, selection, transfer actions and grid rendering. `js/housing.js` remains the Housing shell and Market/Orders/Shipments owner; no second Housing, Market or ItemInstance store is introduced.

Cold-entry dependencies move shared Citizen finance/date helpers to eager `js/citizen-finance.js`, keep player Subscriptions lazy-only and route Knowledge/System Back actions through the module-shell API. Module rendering always clears loading/transition state through `finally`.

Consumables now change only ItemInstance quantity and produce a transaction-backed daily usage log. Effect definitions, effect receipts and Citizen Status Store were removed; tabletop consequences remain outside the webapp.

Player and Admin Subscriptions share one transient action-feedback controller with confirmations, processing locks, disabled reasons and mapped domain results. All mutations remain behind `SubscriptionAPI`.

Admin Record Lifecycle introduces one command boundary for Archive, Restore, Dispose and Hard Delete. Structured dependencies are classified as blockers or warnings, every mutation requires Admin actor, operator note and idempotency key, and results are written to Admin Audit.

## Installed in 15.10x

```text
Terminal Inbox Content UI 2.4x
Admin Operations Workspace 5.0x
Subscriptions Catalog Presentation 4.4
UI Tabs Component Contract 1.0x
Housing Household Foundation 2.0x
Housing Market Workspace Split 2.0x
Item Grid Presentation 1.0x + 1.0.1x
Market Delivery Fulfillment 6.3x
```

Terminal Inbox renders projected title, summary, sections and lifecycle actions from the canonical notification content/projection boundaries. Technical payload details remain admin-only.

Admin Operations is a dedicated lazy workspace over World Bridge Operation Store. It exposes filtering, inspection and canonical claim/release/retry/reconcile actions without introducing another operation store.

Subscriptions Catalog Presentation normalizes benefits, limitations, usage, tier comparison, coverage and entitlement content in the catalog definition/store projection. The UI does not infer structure by tokenizing prose.

`css/system-tabs.css?v=7` is the eager shared owner of segment, inline and mode tab families. Housing, Market, Terminal, Subscriptions and other modules consume this component instead of duplicating base tab rules.

Housing Household adds one campaign-persistent Household Store, floor-plan/furniture placement, safe-space readiness and `HOUSING_ROOM` location support. Housing Market is split into the lazy `housing-market-workspace`; `housing.js` remains the shell for Unit, Household and Storage.

Item Grid Presentation 1.0.1x is the cumulative final owner of empty-cell, footprint and concise item-label projection in Equipment and Housing Storage. It preserves the canonical grid engine and ItemInstance location model.

Market Delivery Fulfillment keeps purchased ItemInstances in vendor custody until ETA, then performs the canonical transfer with Housing reservation, revision/idempotency guards and recovery. Orders and Shipments are rendered by the split Market runtime.

## Installed in 15.11x

```text
Housing Grid Engine Parity Audit 4.6.3x
Subscriptions Responsive Accessibility 4.5
UI Tabs Component Visual Polish 1.1x
Market Notification Producer 2.5x
Market Cart Navigation Semantics 6.3.1x
Equipment Cleanup 1.0x
Housing Household Furnishing Workspace 2.1x
Citizen Store Terminal Extraction 1.0x
Cyberware Index 13.6x
```

Housing grid parity is a contract/static quality gate. It confirms shared pointer-session preview, requestAnimationFrame evaluation, same-unit canonical commit, same-cell no-op and local DOM placement patching after drop; no Housing runtime function was replaced by the audit.

Terminal Inbox entries and calendar reminders now have dedicated eager stores. `js/store.js` delegates persistence and lifecycle while preserving existing public integration APIs. Terminal primary actions and folder navigation have separate layout rows.

Cyberware Index projects canonical catalog definitions only. Search, filters and the Definition Inspector never read or mutate physical ItemInstance state. Equipment cleanup removes patch/version and Citizen identity from the shell, uses concise workspace descriptions, simplifies location labels and keeps tooltip size as plain `WxH`.

Household Furnishing adds a dedicated transient workspace over Household Store and ItemInstance locations. Stored and placed furnishings share one physical instance, placement is validated against rooms/collisions, and preview does not cause a full Housing render.

Market Cart distinguishes `LINES` from `ITEMS`, owns a local Back/Escape hierarchy, traps focus while open and closes Product Inspector before Cart. Market Notification Producer consumes persisted MarketOrder events, keeps one notification identity per standalone order and projects World Bridge-linked orders to the parent operation card.

Subscriptions 4.5 adds responsive player/Admin layouts, roving keyboard navigation, semantic tabpanel/listbox behavior, accessible announcements and focus restoration. Shared tabs visual polish remains centralized in eager `css/system-tabs.css?v=8`.

## Domain status

| Scope | Status | Canonical owner |
|---|---|---|
| Citizen record, creator and editors | ACTIVE / BROWSER VALIDATED CONTRACT / MANUAL UI CHECK RECOMMENDED | CitizenCommandAPI + dedicated editor workspaces |
| Citizen Files and record relations | ACTIVE / STABLE FOUNDATION | Citizen File Store + Database Relations projection |
| Admin dependency safety | ACTIVE / STABLE | Admin Dependency Resolver |
| Admin record lifecycle | ACTIVE / CONTRACTED / BROWSER VALIDATION REQUIRED | Admin Record Lifecycle + domain adapters |
| Admin audit | ACTIVE / STABLE | Admin Audit Store + Snapshot v6 |
| Admin workspace shell and renderer registry | ACTIVE / STABLE / BROWSER VALIDATION REQUIRED | Admin Shell + Admin Workspace Registry/Loader + dedicated workspace renderers |
| Admin operations workspace | ACTIVE / LAZY / BROWSER VALIDATION REQUIRED | World Bridge Operation Store + Admin Operations command adapter |
| Billing corrections and transfers | ACTIVE / STABLE | Billing Store public commands |
| Subscriptions core | ACTIVE / FROZEN | SubscriptionAPI |
| Subscriptions admin workspace | ACTIVE / ACTION FEEDBACK ENABLED / BROWSER VALIDATION REQUIRED | Admin Subscriptions Control + SubscriptionAPI |
| Subscriptions player workspace and profiles | ACTIVE / ACTION FEEDBACK ENABLED / BROWSER VALIDATION REQUIRED | `js/subscriptions-workspace.js` + `js/subscriptions.js` |
| Service Log / income | ACTIVE / STRICT LIFECYCLE / BROWSER VALIDATION REQUIRED | Citizen Store + Service Log Lifecycle registry |
| Transactional services | ACTIVE / FROZEN | Service Bridge |
| Services UI | ACTIVE / COLD ENTRY DEPENDENCIES STABILIZED / BROWSER VALIDATION REQUIRED | persistent shell + eager Citizen finance/date helpers + panel contexts/cache/pagination |
| Market fulfillment | ACTIVE / DELIVERY + PICKUP + PARTIAL RETURNS ENABLED / BROWSER VALIDATION REQUIRED | Market Store orchestration boundary + split Housing Market runtime |
| Housing Market storefront, starter consumables and product visuals | ACTIVE / LAZY WORKSPACE + DELIVERY ENABLED / BROWSER VALIDATION REQUIRED | `js/housing-market-runtime.js` consuming Market Store APIs + Equipment Catalog definitions |
| Housing Unit / Household / Storage runtime | ACTIVE / SPLIT FOUNDATION / BROWSER VALIDATION REQUIRED | Housing shell + Household Store + `js/housing-storage-runtime.js` |
| ItemInstance | ACTIVE / STABLE / VIEW CACHE WARMED | ItemInstance Store |
| Item Type Framework | ACTIVE / OPERATIONS + EFFECT RESOLUTION | Item Type Registry + Item Type Operations + Item Effect Resolver |
| Equipment QA loadouts | ACTIVE / PRE-ALPHA FIXTURE | deterministic Citizen A/B ItemInstance seeds |
| Equipment / CyberGrid | ACTIVE / BROWSER VALIDATION REQUIRED | Equipment Store + ItemInstance location |
| Equipment Bodymap transition | ACTIVE / BROWSER VALIDATION REQUIRED | mounted dual-view Bodymap fast path |
| Housing grid | ACTIVE / STABLE | Housing Grid Engine Adapter |
| Cyberware runtime/core stack | ACTIVE / STABLE | Cyberware domain resolvers |
| Cyberware UI | ACTIVE / BROWSER VALIDATION REQUIRED | Systems + Neural Core + Operations workspaces |
| World Bridge | ACTIVE / STABLE | one orchestrator + operation recovery |
| Firmware | ACTIVE / STABLE | Firmware Registry |
| Notifications | ACTIVE / CONTENT + PROJECTION POLICY / STABLE | Notification Registry/API + Content Resolver + Projection Policy |
| Campaign import/export | ACTIVE / STABLE | Campaign Data I/O schema v6 |
| Knowledge | ACTIVE / STABLE | Knowledge Pack Store v2 |
| Node test harness | ACTIVE | deterministic unit/contract/data-I/O tests |
| Browser E2E | ACTIVE / ENVIRONMENT DEPENDENT | Playwright |

## Current UI state

```text
Citizen Admin Editor
  complete Ability projection with Natural / Cyberware / Total blocks
  Skills grouped by category with enable/remove and level editing
  legacy Citizen-only mechanics records remain visible
  Citizen ID and Short ID are read-only derived previews
  origin/birthDate save recalculates identity codes
  persistent Save Current / Discard Changes controls
  sticky section Save and Ctrl/Cmd+S

Admin Control Center
  persistent Command Band, Navigation Rail, Workspace and Inspector shell
  registry-owned renderer resolution with no central workspace switch
  dashboard renderer in the base bundle
  nine non-dashboard renderers loaded through dedicated workspace bundles
  bundle readiness requires renderer registration

Admin Billing
  Manual Economy Adjustment remains a one-account correction
  Atomic Account Transfer is a separate paired operation
  Citizen and Organization source/target accounts
  Credits and Debt transfers
  one transfer record plus two opposite BillingTransactions
  revision, idempotency, rollback and reversal support

Subscriptions
  Overview / Contracts / Catalog / Providers workspace
  independent terminal section cards using the shared system tile contract
  one shared subscriptionUiState
  pre-render search, group, category, provider, market, status, target and price selectors
  grouped catalog with six-card section limit and explicit expansion
  grouped contract states and provider directory
  one terminal product/contract/provider profile layout
  product availability, target policy, tier comparison, coverage and entitlement projection
  contract Billing, target diagnostics, active entitlements and management controls
  provider service groups and Organization Store-backed location/network facts
  installed product/contract/provider profiles retained

Admin Subscriptions
  one lazy global contract index across non-admin Citizens
  filters for Citizen, provider, product, Billing, entitlement, target and tier
  one administrative profile and command-bound actions
  mandatory operator note and Admin Audit result

Item Type Framework
  category, subtype and functional itemType are separate
  immutable itemTypeProfile on definitions
  normalized per-instance itemState
  reload/chamber/grenade/quantity-use operations active; combat and damage resolution remain out of scope

Dual Equipment QA seeds
  Citizen A mobile mounts / coverage / condition edges
  Citizen B heavy layers / deep container nesting / Housing storage

ItemInstance view cache
  Equipment and Cyberware list projections use canonical store records internally
  repeated view reads reuse catalog-backed cached projections
  public record reads remain defensive clones
  store rebuild warmup is split into one-item idle tasks

Equipment selection
  warm item selection reuses cached EquipmentState
  local CyberGrid, Bodymap and command rail synchronization
  same-item reselection is an explicit no-op

Equipment Bodymap
  Front and Back view trees mount together
  pure view changes preserve panel/frame/image identity
  no EquipmentState reconstruction or workspace refresh
  both images use eager async decode and one panel-local decode promise

Equipment Item Inspector
  item / region / container modes
  one shared player-facing formatter for category, subtype, region, slot, mount and container type
  no raw enum tokens such as FOREARM_GUARD, RIGHT_FOREARM, CHEST_RIG or MASS_COMPRESSION_CUBE in player UI
  contextual labels such as ARMOR, WRIST, FOREARM, MOUNT, CONTAINER, PORT and C-CUBE
  grouped Quick Equip and terminal scrollbar
  compact cards keep condition visual-only; DAMAGED/BROKEN remain frame states
  playerLabel and MODEL identity remain available together

ItemInstance player labels
  optional playerLabel on one physical instance
  displayName = playerLabel || catalogName
  collapsed RENAME disclosure below Item Description
  save/clear returns Inspector to the compact trigger state
  catalog/model identity remains immutable

Housing Market storefront
  Unit / Storage / Market and Catalog / Orders / Delivered use shared Terminal tiles
  department and generated subcategory filters
  two-column catalog with six rendered products per page
  normalized Equipment Catalog visualProfile projected through existing Market offers
  dedicated local SVG visuals for nineteen Medical, Food and Household consumables
  department fallback visuals for Equipment, Cyberware and products without dedicated artwork
  the same visual resolver supplies catalog thumbnails and Product Inspector detail views
  normalized package, dose, duration, shelf-life, meal and ration metadata
  order detail actions for full refund and selected-instance partial return
  partial return line receipts, returned-unit history and recovery commands

Equipment tooltips
  one shared body-level portal
  compact read-only projections
  keyboard access and drag suppression

Cyberware
  neutral product identity with lateral placement only
  Capacity / Readiness / Attention Overview
  sectioned Systems / Neural Core / Operations workspace
  shared Neural Core context for Core Stack and lazy Diagnostics

Services
  persistent same-Citizen shell
  panel-specific render contexts
  Contracts cache and 20-item pagination
  synchronous + RAF1 + RAF2 viewport restoration
```


Terminal / Notifications
  Terminal Entry Store owns persisted Inbox entries and lifecycle/bulk mutations
  Terminal Reminder Store owns calendar reminders and trigger processing
  Market Notification Producer keeps one standalone card per MarketOrder and projects linked operations to the World Bridge parent

Housing Household furnishings
  one canonical ItemInstance per furnishing
  Storage and Placed libraries are projections over Household Store and HOUSING_ROOM locations
  placement preview is local; commit uses Household commands and rerenders only after the committed update event

Cyberware Index
  definition-only catalog with search/filter/grouping
  read-only Definition Inspector
  no ItemInstance, installation or parallel catalog persistence

## Runtime invariants

```text
one physical item = one ItemInstance
playerLabel changes presentation only; definition/model identity remains immutable
condition 0–14 is BROKEN and cannot be newly equipped
already equipped BROKEN items remain removable
Bodymap Front/Back is presentation-only and never reconstructs EquipmentState
both Bodymap view nodes remain mounted during a warm view switch
Citizen identity codes are derived through the Citizen identity helper
Citizen editor external domains remain read-only projections
ADMIN_ADJUSTMENT is a one-account correction
ADMIN_TRANSFER is an atomic paired Billing operation
one Admin transfer creates one transfer record and two opposite transactions
Subscriptions workspace owns no second catalog, entitlement or persistence layer
Subscriptions filtering is resolved before DOM render
Subscriptions action feedback is transient and creates no second persistence path
Subscriptions command controls reject duplicate processing while busy
shared Citizen finance/date helpers are eager and do not depend on the Subscriptions UI bundle
module renderer completion always releases loading/transition state through `finally`
consumable use preserves ItemInstance quantity ownership and logs usage by Campaign Day
record Archive is reversible and separate from physical ItemInstance Dispose
Market consumable identity, package metadata and optional visualProfile remain in canonical Equipment Catalog definitions
Market offers do not own or override product artwork
missing dedicated artwork resolves through a presentation-only department fallback
one selected returned unit = one original ItemInstance moved to vendor custody
partial refund amount is persisted per Market line receipt and settled only through Billing Store
Housing Market UI owns no parallel offer, cart, order or return store
neutral product definitions; laterality only in placement/anatomy
World Bridge remains the player-operation coordinator
Campaign Snapshot remains schema v6 and includes Billing transfer state
Admin Audit remains campaign-persistent
no full Housing or Equipment rerender on pointermove
```

## Verification state

```text
JavaScript syntax: 285 / 285 PASS
Node unit/contract/data-I/O: 303 / 303 PASS with sequential Node test execution
browser E2E: not executed in release workspace
missing local entrypoint assets: 0
Market SVG assets: 25 / 25 PRESENT
```

Browser verification remains required for Market artwork/fallback loading, Housing Unit/Storage split behavior, module cold entry, Subscriptions confirmations and feedback, Admin record lifecycle confirmations/dependency previews, Citizen editor focus/dirty state, Bodymap identity/scroll preservation, selected-instance returns, Admin lazy renderers, Equipment tooltips, Services viewport drift and drag/drop behavior.
