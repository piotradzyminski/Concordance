# FUTURE NOIR — Roadmap

## Baseline

```text
runtime: Parallel Scope Merge 15.12x
phase: pre-alpha
```

This roadmap records recommended directions and dependency order. It does not override `project.md`, current contracts or findings from actual tests.

## Installed scope verification — 15.8x

```text
Market Partial Return / Refund 6.1x
  selected units preserve original instanceId values
  unselected units remain in Citizen/Housing custody
  stock restoration and Billing refund are proportional and idempotent
  reload/retry reuses persisted ItemInstance, stock and Billing receipts
  final unit return transitions the order to REFUNDED

Admin Workspace Renderers 1.0x
  Dashboard renderer is available with the base Admin bundle
  every non-dashboard workspace registers one canonical renderer from its lazy bundle
  a resolved bundle without renderer registration fails explicitly
  workspace changes retain the persistent shell, focus and viewport invariants
```

A corrective patch is appropriate only for a reproduced browser or recovery failure.

## Installed scope verification — 15.7x

```text
Citizen Files / Database Relations
  create, update, archive and restore preserve stable fileId and citizenId
  Case ↔ Citizen File navigation uses stable IDs and reports missing references
  Snapshot v6 round-trip preserves records and relations without duplicate migration

Market drawer / pickup
  drawer backdrop does not react as a product card and summary remains sticky
  PICKUP checkout creates ItemInstance records in vendor custody
  confirm/retry pickup moves the same records to Citizen custody without duplication

Item Type Operations / UI / Consumable Usage Log
  magazine, chamber, safety, fire-mode, grenade and consumable commands remain atomic
  Inspector controls call public commands and do not write itemState or location directly
  committed consumable use changes quantity and is logged by Campaign Day
  no effect/status runtime is maintained by the webapp

Runtime boundaries
  Subscriptions remains lazy-only
  Housing loads Cyberware market projection without diagnostics, maintenance or controller runtime

Citizen browser validation
  Creator and Admin Editor Save/Discard, identity preview and mechanics controls pass Playwright when the dependency is installed

Cyberware Operations / Subscriptions stability / Admin Service lifecycle
  operations share one planner/maintenance/history context
  subscription list/profile scroll and render scheduling remain stable
  Service Log transitions use allowed-next actions, revision and idempotency guards

Terminal notification content
  event payloads resolve through the content catalog and preserve deduplication semantics
```

## Installed scope verification — 15.9x

```text
Market Product Visual Assets 6.2x
  catalog cards and Product Inspector share one visual resolver
  missing artwork resolves through department fallbacks

Terminal Notification Projection Policy 2.3x
  one primary operation card remains stable across revisions
  technical intermediate events do not create duplicate Inbox noise

Housing Storage Runtime Split 1.0x
  Unit/Storage projection and pointer-grid work remain outside the Housing Market shell
  transfer actions use public Housing/Equipment/ItemInstance boundaries

Runtime Cold Entry Dependencies 1.1x
  Citizen Card, Service, System, System Index and Encyclopedia can open first
  failed renderers release transition/loading state and retain Back navigation

Item Type Consumable Log Simplification 1.3.1x
  committed consumable use produces one transaction-backed daily log entry
  effect/status runtime and Campaign Time expiration were removed
  tabletop consequences remain outside the webapp

Subscriptions Actions & Feedback 4.3
  player/Admin actions show confirmation, processing, result and disabled reason
  duplicate submissions are blocked while the canonical command is pending

Admin Record Lifecycle Contract 1.0x
  Archive/Restore remain reversible and separate from physical Dispose
  dependency preview classifies blockers and warnings before destructive actions
  operator note, exact-ID confirmation, idempotency and Admin Audit are enforced
```

A corrective patch is appropriate only for a reproduced browser, recovery, dependency or asset-loading failure.

## Installed scope verification — 15.10x

```text
Terminal Inbox Content UI 2.4x
  projected title/summary/sections remain stable across operation revisions
  lifecycle actions use Notification API boundaries and technical details remain admin-only

Admin Operations Workspace 5.0x
  first lazy open registers the renderer before READY
  claim/release/retry/reconcile use World Bridge Operation Store commands
  filters, selection, focus and viewport survive local updates

Subscriptions Catalog Presentation 4.4
  benefits, limitations, usage, tier comparison and coverage render from structured catalog data
  list/profile/back transitions preserve catalog query and selected product state

UI Tabs Component Contract 1.0x
  segment, inline and mode families share eager system-tabs.css rules
  active tabs are no-ops and keyboard/focus behavior remains consistent

Housing Household Foundation 2.0x
  floor plan, furniture placement, safe-space readiness and consumable eligibility persist per Household
  HOUSING_ROOM locations remain canonical ItemInstance locations

Housing Market Workspace Split 2.0x
  Unit/Household/Storage open without Market runtime
  Market bundle loads once on demand and preserves shell/tab identity

Item Grid Presentation 1.0.1x
  empty cells, occupied footprints and concise item labels remain readable in Equipment and Housing Storage
  cumulative hotfix remains the final presentation owner

Market Delivery Fulfillment 6.3x
  purchased ItemInstances remain in vendor custody until ETA
  delivery reserves Housing only at execution, preserves instanceId and recovers idempotently
  Orders/Shipments and admin diagnostics render through the split Market runtime
```

A corrective patch is appropriate only for a reproduced browser, recovery, dependency, layout or asset-loading failure.

## Installed scope verification — 15.11x

```text
Terminal Store Extraction 1.0x
  cold reload preserves Inbox entries and reminders through dedicated stores
  legacy WS_APP APIs delegate without duplicate persistence or duplicate due notifications
  folder navigation remains horizontal on desktop and inactive bulk controls reserve no space

Cyberware Index 13.6x
  search/filter/grouping use canonical definitions only
  Definition Inspector stays read-only and physical ItemInstance state never enters the index
  Equipment/Cyberware shell cleanup remains compatible with shared tabs and workspace routing

Household Furnishing Workspace 2.1x
  one furnishing ItemInstance moves between storage and HOUSING_ROOM placement
  rotate, collision, room-boundary and room-type validation remain local until commit
  Household update rerenders after commit, never during pointer/cell preview

Market Cart Navigation 6.3.1x
  LINES and ITEMS remain distinct for multi-quantity carts
  Back/Escape closes Product Inspector before Cart and returns Orders/Delivered to Catalog
  modal focus, inert siblings, scroll lock and focus restoration survive local close without rebuilding Housing

Market Notification Producer 2.5x
  one standalone MarketOrder keeps one notification identity across revisions
  World Bridge-linked orders project to the parent operation card
  action routing opens Housing Market with the target order selected

Subscriptions Responsive Accessibility 4.5
  roving tabs, labelled tabpanels, result announcements and Admin listbox navigation work at 980/720/520 px
  focus restoration survives local rerenders and mutation feedback

UI Tabs Visual Polish 1.1x
  system-tabs.css remains the only base owner of segment/inline/mode visuals
  module CSS contains layout integration only and reduced-motion/focus-visible remain intact

Housing Grid Parity Audit 4.6.3x
  shared pointer session and local post-drop DOM patch remain active
  same-cell drop is a no-op and completion never calls full renderHousingModule

Equipment Cleanup 1.0x
  no patch version or Citizen name in the Equipment shell
  concise workspace descriptions, simplified location labels and plain WxH tooltip size remain visible
```

A corrective patch is appropriate only for a reproduced browser, accessibility, navigation, notification or furnishing-placement failure.

## Installed scope verification — 15.12x

```text
Housing / Market Decoupling 2.2x
  Market opens as a separate module and lazy bundle
  Housing remains Unit / Household / Storage / Deliveries only
  Market notifications route to Market instead of reopening Housing

Admin Equipment Catalog Authoring 1.0x
  drafts remain outside the canonical catalog until publish
  preview does not persist ItemInstance
  stable IDs, revision and idempotency guards remain enforced

Item Type Effect Removal 1.3.1x cleanup
  retired effect/status runtime and contract are physically removed after cleanup
  consumable use remains quantity mutation plus Campaign-Day log only

Knowledge Relation Tabs / Registry Separation 1.1x — adapted
  System Index persists only relatedEntries
  Encyclopedia persists only relatedTerms
  current seed content and approved lore remain unchanged

Campaign Time Datetime Foundation 2.0x
  canonical time is a revisioned UTC timestamp
  date-only APIs remain compatibility projections
  schedulers compare full timestamps without taking ownership of domain records
```

A corrective patch is appropriate only for a reproduced browser, import/migration, time-scheduler or authoring failure.

## Gate A — browser regression verification

The deterministic Node harness covers syntax, contracts and data round-trips. The browser matrix should validate:

```text
Citizen Card Editor 2.1.1x
  all Ability definitions and Citizen-only legacy records remain visible
  Skills remain grouped and editable after filtering
  identity preview updates after origin/birthDate changes
  Save Current, Discard Changes, sticky Save and Ctrl/Cmd+S remain synchronized
  Discard clears only the active section dirty state
  delegated owner edit preserves external-domain read-only boundaries

Admin Billing Transfers 1.0x
  Citizen and Organization selectors show current Credits/Debt values
  preview snapshot matches committed source/target effects
  insufficient Credits/Debt and Citizen debt-limit failures are readable
  idempotent replay does not create a second transfer
  reversal creates a second paired transfer
  Admin Audit contains transfer and transaction references

Subscriptions Workspace UI 4.0 / Terminal Cards 4.0x / Profiles UI 4.1 / Admin UI 4.2 / Actions & Feedback 4.3
  Overview / Contracts / Catalog / Providers navigation
  independent terminal cards with stable title/description layout
  query and filter state persists across list/profile/back transitions
  product availability, tier comparison, coverage and entitlement projection
  contract Billing/target/management controls remain command-bound
  provider location/network facts use Organization Store only
  Polish diacritic and Ł/ł search normalization
  six-card category expansion behavior
  responsive lists and profiles at 1440, 1180 and 980 px
  purchase/tier/target/cancel operations still use SubscriptionAPI
  Admin contract index, filters, operator notes and audit feedback
  mapped domain result feedback for player and Admin commands
  confirmation summaries and processing locks prevent duplicate submissions
  unavailable actions expose a visible reason instead of silent disabled controls

Equipment Bodymap Fast Path 1.0x
  Front and Back panel/frame/image node identity remains stable
  active-view click is a no-op
  scroll drift remains 0 px
  no EquipmentState reconstruction or workspace refresh
  warm synchronous switch remains under one frame
  both images decode once per mounted panel instance

Equipment Selection Fast Path 1.0x
  CyberGrid, Bodymap and Item Index selections preserve panel identity
  same-item reselection is a no-op
  command rail body updates exactly once
  no EquipmentState reconstruction or workspace refresh
  scroll drift remains 0 px

Cyberware Neural Core Workspace 13.3x
  Core Stack and Diagnostics retain one shared context surface
  Diagnostics remains lazy until opened
  saved scans refresh both Neural Core summaries without rebuilding Equipment
  embedded Diagnostics does not render a redundant close control

Services 3.2x
  Contracts → Income → Service Log → Experience
  same-Citizen shell and body DOM identity
  immediate / RAF1 / RAF2 / 100 ms tab-position drift <= 1 px
  no generateWeeklyOffers calls in Income/Log/Experience
  <= 20 rendered Contracts cards per active group page
  active primary/group tab is a no-op

Equipment 15.2x / Player Labels UI Hotfix 1.0.1x
  tooltip delay, keyboard focus, viewport clamping and drag suppression
  neutral product identity with lateral placement only
  DAMAGED/BROKEN contrast and equip rejection
  RENAME expands below Item Description and save/clear restores the compact trigger
  playerLabel rename/clear/reload/Snapshot round-trip
  selection fast path remains active during rename interactions
  nested container hierarchy labels

Market storefront 5.0x / Consumables 5.1x / Product Visual Assets 6.2x
  Unit / Storage / Market and Catalog / Orders / Delivered use shared Terminal tiles
  two-column product grid with exactly six rendered cards per page
  filters reset page and remain connected to canonical Market APIs
  Medical, Food and Household consumables are generated from Equipment Catalog definitions
  package/dose/duration/shelf-life metadata renders without horizontal overflow
  dedicated SVG thumbnails render inside the existing cards without changing pagination
  Product Inspector uses the detail asset from the same visualProfile
  missing artwork resolves to a local department fallback
```

A corrective patch is appropriate only for a reproduced browser failure. It must retain the installed contracts and avoid alternate command paths, duplicate UI state owners or full-module rerenders.

## Gate B — remaining application regression matrix

```text
Admin workspace
  lazy first-open states
  persistent Command Band / Navigation Rail
  global Citizen Context
  focus and viewport retention

Housing / Equipment
  grid drag/drop and deferred persistence
  no full rerender on pointermove

World Bridge
  failure → reload → retry
  operation claims and stale revision guards
  notification deduplication
  compensation and Snapshot v6 round-trip
```

## Functional continuation

Independent recommended scopes after validation:

```text
Market browser verification and dedicated artwork expansion for non-consumable products
World Bridge admin operations
Firmware release rollout
```

Each scope should consume existing public APIs and preserve domain ownership. No continuation should reintroduce duplicate stores, direct cross-domain writes, side-specific product definitions, alternate Citizen identity calculation, one-sided transfer mutations or full-module rerenders for Bodymap view changes.

## Frozen foundations

The following foundations should change only for a proven defect, contract gap or measured performance regression:

```text
Citizen Record / Creator / Card Editor / Template Service
Admin Command Safety / Dependency Guard / Audit Store / Workspace Runtime
Billing correction and paired transfer boundaries
SubscriptionAPI and entitlement resolver
Service Bridge
ItemInstance and transaction/compensation stores
Housing Grid Engine
Equipment/Cyberware neutral laterality
Equipment Bodymap dual-view fast path
World Bridge Operation Store
Firmware Registry
Cyberware World Bridge
Campaign Data I/O v6
Knowledge Pack Store
Project Test Harness
```

## Gate B — merged foundation verification

```text
Item Type Framework 1.0x / Operations 1.1x / Operations UI 1.2x / Consumable Log 1.3.1x
  Inspector keeps playerLabel and immutable MODEL identity
  itemState updates validate ownership and type schema
  grenade, magazine and ammunition skeletons remain non-combat foundations
  consumable use preserves ItemInstance quantity ownership and logs quantity by Campaign Day
  no consumable status, duration or expiration runtime exists
  wallets do not become a second Credits/Debt ledger

Equipment Dual Test Loadouts 1.4.0x
  forced seed reconciliation creates 33 Citizen A and 52 Citizen B Equipment instances
  no orphan items and no duplicate instanceId
  nested grids, rotation, BROKEN validation and Housing storage remain usable

Services Cold Entry Performance 3.3x
  cold Contracts generation resolves insurance/biochip projection once per weekly batch
  repeated entitlement checks hit the revision-aware contract snapshot cache
  invalidation follows Citizen, ItemInstance and catalog changes
  warm Service tab behavior and viewport restoration remain unchanged
```
