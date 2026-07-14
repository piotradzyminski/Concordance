# Service UI Render Contract

Schema marker:

```text
service_ui_tab_stability_performance_3_3x
```

## Ownership

```text
js/service.js
= persistent Service shell, panel-specific contexts, Contracts cache/pagination,
  delegated Service UI actions, cold-entry diagnostics, idle synchronization/preload and viewport preservation

js/service-offer-generator.js
js/service-requirements.js
= one shared eligibility context per weekly offer generation; insurance and biochip projection are lazy and batch-scoped

js/subscription-entitlement.js
= canonical entitlement owner and revision-aware contract snapshot cache used by `isSubscriptionEntitled()`

js/store.js
= canonical Citizen Service-offer-state persistence; synchronization accepts refresh suppression

css/service.css
= Service layout, tab geometry, contract pagination and Service-local scroll-anchor exclusion
```

The contract applies to the player/admin Service UI. It does not change Service Bridge lifecycle, Billing semantics, Income derivation, Service Log ownership or Experience reward rules.

## Stable shell invariant

For the same active Citizen, the following nodes remain mounted while navigating between Contracts, Income Sources, Service Log, Experience, offer details and log details:

```text
[data-service-root]
.module-detail-head
[data-service-citizen-context-shell]
[data-service-active-roster-shell]
.service-tabs
```

Only this node is replaced for same-Citizen panel navigation, filters and Contracts pagination:

```text
.service-section-body
```

A full `#module-grid` replacement is permitted only when entering Service, leaving Service, changing the selected Citizen or explicitly forcing a shell rebuild.

## Panel-specific render contexts

The monolithic Service context is retired. Rendering uses:

```text
getServiceBaseContext()
getServiceContractsContext()
getServiceIncomeContext()
getServiceLogContext()
getServiceExperienceContext()
```

`getServiceBaseContext()` normalizes Service Log once and shares the result with the selected panel and persistent shell summaries.

Only Contracts and offer details may resolve the generated Contracts collection. Income, Service Log and Experience must not call `generateWeeklyOffers()` during their render path.

Experience consumes a lightweight offer summary or a cached summary. It does not require the Contracts DOM/view model.

## Cold-entry eligibility budget

A cold Contracts cache miss may generate the complete weekly market, but the generation must create exactly one shared eligibility context:

```text
createEligibilityContext(character)
```

The context is passed to every generated and manual offer. Insurance coverage is lazy: it is computed only when at least one offer requires insurance. Within one generation it may perform at most:

```text
one scan of citizen.subscriptions
one `isSubscriptionEntitled()` call per subscription contract
one installed-Cyberware scan for biochip detection
```

The following pattern is prohibited:

```text
offer count × subscription count × full contract normalization/validation
```

Offers without insurance requirements must not resolve subscription entitlement or scan installed Cyberware. Ability, Skill, Experience, clearance and risk checks retain their existing semantics.

`isSubscriptionEntitled()` uses the cache owned by `js/subscription-entitlement.js`. Cache identity includes contract/catalog/tier revisions, statuses, period boundaries, target identity, evaluation time and ItemInstance store revision where applicable. Canonical invalidation events clear affected entries.

## Contracts cache

Generated weekly offers and the derived Contracts collection are cached by a deterministic key containing:

```text
citizenId
settlementWeek
serviceOfferStates revision token
serviceLog revision token
eligibility/profile revision token
serviceDatabase revision token
manual Service offers revision token
```

The eligibility/profile token includes the Citizen revision/profile, clearance, abilities, skills, Experience, reputation, Subscriptions and installed Cyberware summary used by requirements.

`generateWeeklyOffers()` runs only on a cache miss. Cache entries are bounded and invalidated when the Citizen, campaign week or Service-related runtime state changes.

## Store synchronization boundary

`syncCitizenServiceMarketOffers()` is not part of the render path.

Synchronization is scheduled as an idle task when:

```text
Service is entered
campaign date / settlement week changes while Service is active
a relevant Service runtime event invalidates the cache
```

Repeated synchronization for the same Citizen/cache key is deduplicated. Store updates from this path suppress module/profile refresh to prevent a render loop.

## Viewport transition invariant

A same-Citizen panel replacement must:

```text
capture scrollX, scrollY and .service-tabs document position
lock .service-section-body to its current measured height
replace the panel contents
restore the captured viewport synchronously in the same task
focus the requested control with preventScroll
on RAF1: release the height lock and restore the viewport again
on RAF2: perform the final guarded restoration
ignore stale restores after a newer Service render
abort when the root disconnects or Service is no longer active
clamp only when the requested position exceeds the document maximum
```

The first restore must not wait until RAF2. The temporary height lock prevents the browser from painting a frame based on the collapsed short-panel document height.

## Scroll anchoring

Service uses explicit viewport preservation. Native anchoring remains disabled while the Service shell is mounted:

```css
.module-grid:has(> [data-service-root]),
.service-module-view,
.service-tabs,
.service-section-body {
  overflow-anchor: none;
}
```

This is required at and below the `1320px` single-column terminal breakpoint, where Session Log moves below the module and panel heights differ by several thousand pixels.

## Contracts DOM budget

Contracts use explicit pagination:

```text
20 offers per page
```

Only the active Mandatory/Regular page is rendered. Search, sort and category changes reset the relevant page to page 1.

`content-visibility` and `contain-intrinsic-size` are prohibited for `.service-contract-tile`. Estimated intrinsic placeholders are not an accepted substitute for bounded DOM.

## No-op navigation

Clicking the already active primary Service tab must:

```text
preserve .service-section-body DOM identity
not rebuild panel markup
not increment the section render counter
focus the active tab with preventScroll
```

The same no-op rule applies to the already active Mandatory/Regular Contracts group.

## Income preload

After Service mounts, `service-income` is preloaded through `requestIdleCallback` with a timer fallback. Scheduling and in-flight loads are deduplicated.

A cold direct click may still await the bundle if idle preload has not completed. Subsequent navigation must use the already loaded renderer.

## Diagnostics

The browser test may read resettable Service UI diagnostics through:

```text
window.WS_APP.getServiceUiDiagnostics()
window.WS_APP.resetServiceUiDiagnostics()
```

Tracked values include:

```text
generateWeeklyOffersCalls
sectionRenderCount
activeTabNoopCount
incomePreloadRequests
lastRenderPanel
lastRenderDurationMs
eligibility.eligibilityContextsCreated
eligibility.insuranceCoverageComputations
eligibility.subscriptionEntitlementChecks
eligibility.installedCyberwareScans
subscriptionEntitlement.contractSnapshotHits
subscriptionEntitlement.contractSnapshotMisses
```

These diagnostics are observational and do not own gameplay state.

## Event ownership

`[data-service-root]` owns one delegated listener for each required event family:

```text
click
change
input
submit
```

Section replacement and pagination must not rebind handlers to individual cards or controls.

## Regression gates

Node contract tests:

```text
tests/contracts/service-ui-shell.test.cjs
tests/contracts/service-entry-eligibility-cache.test.cjs
```

Browser acceptance test:

```text
tests/e2e/service-tab-stability.spec.cjs
```

Playwright viewport matrix:

```text
1440x960
1320x720
1265x720
1180x720
```

For every tab transition, the browser test samples:

```text
immediately after click
RAF1
RAF2
100 ms after click
```

Acceptance targets:

```text
maximum .service-tabs viewport drift in any sampled frame <= 1 px
Income / Log / Experience generateWeeklyOffers delta = 0
active-tab second click does not replace body DOM
rendered Contracts tiles <= 20
light-panel measured render duration < 50 ms
Contracts measured render duration < 100 ms
cold first Income entry is tested separately
cold Contracts entry creates one eligibility context and stays below the browser performance budget
```

The test opens Service through the Access Panel and preserves its inherited scroll position. It must not manually place `.service-tabs` at an artificial offset.
