# Subscription Contracts Contract — Housing Rent Catalog 4.0x / Public API 3.1x / Events 2.3x / Workspace UI 4.0 + Terminal Cards 4.0x / Profiles UI 4.1 / UI Stability 4.2.1 / Actions & Feedback 4.3 / Catalog Presentation 4.4 / Responsive & Accessibility 4.5

## Status

```text
SCHEMA: subscription_contracts_bridge_schema_2_0x
CATALOG: subscription_catalog_housing_rent_4_0x
WORLD BRIDGE PHASE: SUBSCRIPTIONS / BRIDGE READY 3.1x
```

This contract defines canonical persisted Subscription catalog and citizen contract records plus the public command/read boundary and deterministic entitlement resolver required by Cyberware World Bridge.

## Canonical ownership

```text
data/subscription-catalog.js
  seed catalog with machine-readable ItemInstance target eligibility

js/subscription-catalog-store.js
  catalog normalization, target-policy runtime views and canonical v4 persistence

js/subscription-entitlement.js
  contract normalization, validation, strict citizen sanitization and canonical persistence projection
  query-based entitlement resolution, ItemInstance target validation, reason codes and ItemInstance-revision-aware query cache and revision-aware per-contract snapshot cache

js/subscription-api.js
  indexed public reads, target eligibility/rebind commands, revision updates, idempotency receipts
  revisioned Subscription domain events and external mutation reconciliation

js/subscription-notification-producer.js
  strict Terminal notification projection for Subscription events

data/notification-event-catalog.js
data/notification-provider-capabilities.js
  strict Subscription notification event definitions and provider capability manifests

js/store.js
  low-level citizen-owned contract storage and current billing compatibility flow
  weekly settlement increments contract revision for every changed contract
```

`citizen.subscriptions[]` remains the only citizen contract collection.

Forbidden citizen scalar fields:

```text
citizen.subscription
citizen.trauma
```

## Housing Rent catalog extension

Rent products are split by Housing standard. `data/housing-rent-standards.js` and `js/housing-rent-standards-store.js` own tier capabilities, area, fixtures, storage, delivery, disposal, furnishing grade and maintenance policy. Subscription definitions own only the billable product/tier and entitlement identity.

## Catalog entry

Canonical persisted shape:

```js
{
  subscriptionCatalogId: "sub-mass-compression-service",
  providerId: "provider-mass-compression-service",
  organizationId: "mass-compression",
  productCode: "MC-SERVICE",

  title: "Mass Compression Service",
  provider: "Mass Compression Service",
  category: "MASS_COMPRESSION",
  market: "PRIVATE",
  domain: "CYBERWARE",

  billingCycle: "WEEKLY",
  currency: "CREDIT",

  entitlementCodes: ["MC_CERTIFIED_SERVICE"],
  targetPolicy: {
    allowedTargetTypes: ["CITIZEN", "ITEM_INSTANCE"],
    defaultTargetType: "CITIZEN",
    maximumTargets: 1,
    itemEligibility: {
      requireOwnedByCitizen: true,
      blockedLifecycleStates: ["DISPOSED"],
      allowedDefinitionIds: [],
      allowedCategories: ["CONTAINER"],
      allowedSubtypes: ["MASS_COMPRESSION_CUBE"],
      requiredTagsAny: ["MASS_COMPRESSION", "CAPACITY_MODULE"],
      requiredTagsAll: [],
      allowedManufacturerIds: [],
      allowedProviderIds: []
    }
  },
  coverageRules: [],

  tiers: [],
  active: true,
  revision: 1
}
```

### Catalog tier

```js
{
  tierId: "capacity-corporate",
  tierLevel: 4,
  label: "T4 Corporate",
  amount: 4200,
  billingCycle: "WEEKLY",
  durationDays: 7,
  description: "...",
  entitlementCodes: [
    "MC_CERTIFIED_SERVICE_T4",
    "MC_FIRMWARE_ACCESS",
    "MC_PRIORITY_DIAGNOSTICS",
    "MC_FIRMWARE_ACCESS_T4"
  ],
  coverageRuleIds: [],
  active: true,
  revision: 1
}
```

## Subscription contract

Canonical persisted shape:

```js
{
  subscriptionContractId: "sub-citizen-b-mass-compression-capacity-corporate",
  subscriptionCatalogId: "sub-mass-compression-service",
  citizenId: "citizen-b",
  providerId: "provider-mass-compression-service",
  organizationId: "mass-compression",
  tierId: "capacity-corporate",

  contractStatus: "ACTIVE",
  billingStatus: "PAID",
  entitlementStatus: "ACTIVE",

  coverageTarget: {
    type: "CITIZEN",
    id: "citizen-b"
  },

  startedAt: "2109-02-13",
  currentPeriodStart: "2109-02-13",
  currentPeriodEnd: "2109-02-20",
  gracePeriodEndsAt: null,
  cancelledAt: null,
  suspendedAt: null,

  billingAccountId: "billing-account-citizen-b",
  lastBillingTransactionId: null,
  amount: 4200,
  currency: "CREDIT",
  billingCycle: "WEEKLY",

  displaySnapshot: {},
  revision: 1,
  metadata: {}
}
```

## Required identity

Blocking validation errors:

```text
SUBSCRIPTION_CONTRACT_ID_REQUIRED
SUBSCRIPTION_CATALOG_REQUIRED
SUBSCRIPTION_CATALOG_NOT_FOUND
SUBSCRIPTION_TIER_REQUIRED
SUBSCRIPTION_TIER_NOT_FOUND
SUBSCRIPTION_CITIZEN_ID_REQUIRED
SUBSCRIPTION_PROVIDER_ID_REQUIRED
SUBSCRIPTION_TARGET_ID_REQUIRED
SUBSCRIPTION_CITIZEN_TARGET_MISMATCH
```

Optional organization mapping produces:

```text
SUBSCRIPTION_ORGANIZATION_ID_MISSING
```

## Status axes

```text
contractStatus:
ACTIVE
CANCELLED

billingStatus:
PAID
PENDING
OVERDUE
SUSPENDED
CANCELLED

entitlementStatus:
ACTIVE
GRACE_PERIOD
PENDING
SUSPENDED
CANCELLED
```

Entitlement matrix:

| Contract | Billing | Entitlement | Grants access |
|---|---|---|---|
| `ACTIVE` | `PAID` | `ACTIVE` | yes |
| `ACTIVE` | `OVERDUE` | `GRACE_PERIOD` | yes |
| `ACTIVE` | `PENDING` | `PENDING` | no |
| `ACTIVE` | `SUSPENDED` | `SUSPENDED` | no |
| `CANCELLED` | any | `CANCELLED` | no |

## Contract entitlement snapshot cache

`isSubscriptionEntitled(subscription, atTime)` is a read helper over the canonical contract resolver. Repeated calls for the same effective contract state must not repeat full contract normalization, catalog/tier validation and target validation.

The cache key includes:

```text
subscriptionContractId
subscriptionCatalogId
citizenId
providerId
tierId
contractStatus / billingStatus / entitlementStatus
period and grace boundaries
contract revision
coverage target type/id
evaluation time
catalog and tier revisions
ItemInstance store revision for item targets
```

The cache is bounded and lives only in `js/subscription-entitlement.js`. It is not persistence and does not create a second entitlement owner.

Invalidation occurs on:

```text
ws:citizens-updated
ws:item-instances-updated
ws:subscription-catalog-updated
explicit invalidateSubscriptionEntitlement()
```

`getSubscriptionEntitlementCacheStats()` exposes query-cache and contract-snapshot hit/miss counters for diagnostics.

## Runtime compatibility views

Current Subscription UI, Billing, Housing and Cyberware consumers still read temporary runtime projections:

```text
contract.id              -> subscriptionContractId
contract.catalogId       -> subscriptionCatalogId
contract.status          -> billingStatus
contract.cycle           -> billingCycle
contract.startDate       -> startedAt
contract.paidUntil       -> currentPeriodEnd
catalog.id               -> subscriptionCatalogId
tier.id                  -> tierId
tier.cycle               -> billingCycle
```

These fields are adapter output only. They are stripped from:

```text
localStorage citizen persistence
citizen JSON export
subscription catalog localStorage
```

Removal of runtime aliases is deferred until consumers use the public API introduced in the next patch sequence.

## Hard cutover

On schema mismatch:

- stored citizen subscription records are discarded;
- canonical seed contracts are restored unless the citizen has an explicit runtime cleanup marker for Subscriptions;
- catalogless and legacy alias-only records are not migrated;
- old catalog localStorage keys are removed;
- current catalog store is rewritten in canonical asset-target 3.0x format.

No mapping by title, provider text, `catalogId`, `id`, scalar insurance fields or deprecated catalog storage is performed during persisted-state migration.

## Target policy

Supported target types:

```text
CITIZEN
ITEM_INSTANCE
```

Canonical uniqueness key:

```text
subscriptionCatalogId + citizenId + coverageTarget.type + coverageTarget.id
```

Consequences:

- one open contract is allowed for one catalog and one exact target;
- one citizen may hold several contracts from the same catalog when each contract points to a different ItemInstance;
- cancelled records do not block a new contract for the same target;
- target identity is stored as a reference only; Subscription never copies or mutates ItemInstance data.

### ItemInstance eligibility

Item-capable catalog records persist:

```js
itemEligibility: {
  requireOwnedByCitizen: true,
  blockedLifecycleStates: ["DISPOSED"],
  allowedDefinitionIds: [],
  allowedCategories: [],
  allowedSubtypes: [],
  requiredTagsAny: [],
  requiredTagsAll: [],
  allowedManufacturerIds: [],
  allowedProviderIds: []
}
```

Empty selector arrays mean no restriction for that selector. Non-empty selectors are cumulative constraints. `requiredTagsAny` requires at least one matching tag; `requiredTagsAll` requires all listed tags.

Asset-capable seed catalogs:

```text
Kagami Sentinel
CoreMed Service
Mass Compression Service
Common Lease
```

Creation and target rebind require:

```text
ItemInstance exists
ItemInstance.ownerId == citizenId
ItemInstance lifecycle/location is not blocked
ItemInstance satisfies catalog itemEligibility
```

Runtime invalidation rules:

- missing, transferred, disposed, destroyed or newly ineligible items do not delete the contract;
- billing history and contract identity remain persisted;
- effective entitlement resolves as `REVOKED` with structured target reason codes;
- rebind is available through `changeSubscriptionCoverageTarget()`.

## Public API 3.1x

Implemented read API:

```js
getSubscriptionContract(subscriptionContractId)
getCitizenSubscriptionContracts(citizenId, filters)
getSubscriptionCatalogEntry(subscriptionCatalogId)
getSubscriptionContractsForTarget(query)
getItemInstanceSubscriptionContracts(instanceId, filters)
getEligibleSubscriptionTargets(query)
validateSubscriptionTarget(input)
```

Implemented command API:

```js
createSubscriptionContract(input, options)
changeSubscriptionTier(subscriptionContractId, tierId, options)
changeSubscriptionCoverageTarget(subscriptionContractId, coverageTarget, options)
setSubscriptionBillingStatus(subscriptionContractId, billingStatus, options)
suspendSubscriptionContract(subscriptionContractId, reason, options)
resumeSubscriptionContract(subscriptionContractId, options)
cancelSubscriptionContract(subscriptionContractId, reason, options)
processSubscriptionBilling(subscriptionContractId, options)
```

All APIs are also exposed under:

```text
WS_APP.SubscriptionAPI
```

### Read indexes

The API maintains lazy indexes by:

```text
subscriptionContractId
citizenId
citizenId + coverageTarget.type + coverageTarget.id
```

Indexes are invalidated by:

```text
ws:citizens-updated
ws:subscription-catalog-updated
```

Read methods do not rescan all citizens until an invalidation occurs.

### Command result

Commands return a structured result:

```js
{
  ok: true,
  command: "CHANGE_SUBSCRIPTION_TIER",
  resultCode: "SUBSCRIPTION_TIER_CHANGED",
  citizenId: "citizen-b",
  subscriptionContractId: "subscription-contract-...",
  contract: {},
  citizen: {}
}
```

Failures return:

```js
{
  ok: false,
  command: "CREATE_SUBSCRIPTION_CONTRACT",
  errorCode: "SUBSCRIPTION_CONTRACT_ALREADY_EXISTS",
  resultCode: "SUBSCRIPTION_CONTRACT_ALREADY_EXISTS"
}
```

### Idempotency

Commands accept:

```js
{ idempotencyKey: "..." }
```

Successful receipts are persisted under:

```text
ws_subscription_command_receipts_v1
```

Receipt history is bounded to 200 entries. Replaying the same command/key returns the existing result reference and does not repeat the mutation.

### Revision

Every successful command mutation increments `contract.revision`. A billing command increments revisions for all contracts changed by the payment result.

### Mutation boundary

Current Subscription UI, Billing renderer, Admin Control and campaign settlement invoke `SubscriptionAPI` commands. Public low-level store mutation names are removed in 3.1x.

Citizen Editor does not place `subscriptions[]` in a generic `updateCitizen()` patch. Direct external Citizen patches containing `subscriptions` are rejected with `SUBSCRIPTION_COMMAND_API_REQUIRED`.

## Entitlement resolver 3.0x

Public query:

```js
resolveSubscriptionEntitlement({
  citizenId,
  providerId,
  entitlementCode,
  targetType,
  targetId,
  atTime
})
```

Canonical result:

```js
{
  allowed: true,
  status: "ACTIVE",
  citizenId: "citizen-b",
  subscriptionContractId: "sub-citizen-b-mass-compression-capacity-corporate",
  subscriptionCatalogId: "sub-mass-compression-service",
  providerId: "provider-mass-compression-service",
  entitlementCode: "MC_FIRMWARE_ACCESS",
  coverageTarget: {
    type: "ITEM_INSTANCE",
    id: "eq-citizen-b-capacity-module-ii"
  },
  targetSnapshot: {
    instanceId: "eq-citizen-b-capacity-module-ii",
    definitionId: "eqcat-capacity-module-ii",
    ownerId: "citizen-b",
    lifecycleState: "UNPACKAGED",
    category: "CONTAINER",
    subtype: "MASS_COMPRESSION_CUBE"
  },
  coverageRuleIds: [],
  reasons: [
    {
      code: "ENTITLEMENT_ACTIVE",
      severity: "INFO"
    }
  ],
  evaluatedAt: "2109-02-13T12:00:00.000Z",
  contractRevision: 1,
  catalogRevision: 1,
  tierRevision: 1
}
```

Resolver statuses:

```text
ACTIVE
GRACE_PERIOD
PENDING
SUSPENDED
CANCELLED
EXPIRED
REVOKED
NOT_FOUND
```

Access is granted only for:

```text
ACTIVE
GRACE_PERIOD
```

Resolution rules:

- `providerId` is exact when supplied;
- target type and target ID must exactly match `coverageTarget`;
- ItemInstance target must still exist, belong to the contract citizen and satisfy current catalog eligibility;
- entitlement code is resolved from the union of catalog-level and selected-tier codes;
- catalog/tier inactivity resolves as `REVOKED`;
- period and grace-period dates are evaluated against `atTime`;
- `OVERDUE` resolves as `GRACE_PERIOD`; missing `gracePeriodEndsAt` produces `GRACE_PERIOD_END_UNSPECIFIED` warning;
- financial coverage is not calculated; resolver returns only `coverageRuleIds`;
- reads are pure and emit no mutation event.

Reason codes include:

```text
ENTITLEMENT_ACTIVE
CONTRACT_IN_GRACE_PERIOD
GRACE_PERIOD_END_UNSPECIFIED
CONTRACT_PENDING
CONTRACT_SUSPENDED
CONTRACT_CANCELLED
CONTRACT_EXPIRED
GRACE_PERIOD_EXPIRED
ENTITLEMENT_REVOKED
ENTITLEMENT_NOT_FOUND
PROVIDER_MISMATCH
TARGET_MISMATCH
ENTITLEMENT_CODE_NOT_GRANTED
CONTRACT_INVALID
SUBSCRIPTION_CATALOG_NOT_FOUND
SUBSCRIPTION_TIER_NOT_FOUND
SUBSCRIPTION_TARGET_NOT_ALLOWED
SUBSCRIPTION_ITEM_STORE_UNAVAILABLE
SUBSCRIPTION_ITEM_TARGET_NOT_FOUND
SUBSCRIPTION_ITEM_TARGET_OWNER_MISMATCH
SUBSCRIPTION_ITEM_TARGET_LIFECYCLE_BLOCKED
SUBSCRIPTION_ITEM_TARGET_DESTROYED
SUBSCRIPTION_ITEM_TARGET_DEFINITION_INELIGIBLE
SUBSCRIPTION_ITEM_TARGET_CATEGORY_INELIGIBLE
SUBSCRIPTION_ITEM_TARGET_SUBTYPE_INELIGIBLE
SUBSCRIPTION_ITEM_TARGET_TAG_INELIGIBLE
SUBSCRIPTION_ITEM_TARGET_TAGS_REQUIRED
SUBSCRIPTION_ITEM_TARGET_MANUFACTURER_INELIGIBLE
SUBSCRIPTION_ITEM_TARGET_PROVIDER_INELIGIBLE
SUBSCRIPTION_ITEM_TARGET_POLICY_MISMATCH
```

### Entitlement cache

Cache key includes:

```text
citizenId
providerId
entitlementCode
targetType
targetId
atTime
contract revision/status/date signature
catalog and tier revision/active signature
ItemInstance Store revision for ITEM_INSTANCE queries
```

Public diagnostics and invalidation:

```js
invalidateSubscriptionEntitlement(citizenId?)
getSubscriptionEntitlementCacheStats()
```

Cache is bounded to 500 entries and invalidated by Citizen, Subscription Catalog or ItemInstance updates. Contract/catalog/ItemInstance revisions also change the cache key.

### Contract-state helper

Runtime compatibility projections use:

```js
resolveSubscriptionContractState(contract)
```

This helper preserves current UI/Billing status semantics. It is separate from the public query resolver and must not be used as a World Bridge entitlement lookup.

### Subscription domain events 2.3x

Canonical event contract:

```text
ws:subscription-created
ws:subscription-updated
ws:subscription-entitlement-changed
ws:subscription-billing-failed
ws:subscription-cancelled
```

Minimum payload:

```js
{
  eventId,
  citizenId,
  subscriptionContractId,
  subscriptionCatalogId,
  providerId,
  organizationId,

  contractStatus,
  previousContractStatus,
  billingStatus,
  previousBillingStatus,
  entitlementStatus,
  previousEntitlementStatus,

  allowed,
  previousAllowed,
  entitlementCodes: [],
  coverageRuleIds: [],
  coverageTarget,

  changedFields: [],
  reasonCode,
  command,

  revision,
  catalogRevision,
  tierRevision,
  occurredAt,
  external
}
```

Event rules:

- command mutations emit after the canonical citizen contract write succeeds;
- idempotent command replay emits no second event;
- no-op commands do not increment revision and do not emit;
- `ws:subscription-updated` is emitted only when canonical domain fields changed;
- `ws:subscription-entitlement-changed` compares a pure contract entitlement signature, not raw revision;
- signature includes status, access result, catalog/tier identity, provider, target, entitlement codes, coverage-rule references and catalog/tier active state;
- metadata-only and revision-only differences do not count as entitlement changes;
- reads and render paths emit no domain event;
- billing failure can emit without mutating the contract; the event uses the current contract revision and deterministic `eventId`;
- weekly settlement changes increment each affected contract revision;
- external contract writes are reconciled from `ws:citizens-updated`;
- catalog changes re-evaluate entitlements without emitting a false contract update;
- campaign-date changes re-evaluate time-dependent entitlement expiry;
- targeted ItemInstance changes re-evaluate only contracts bound to the affected instance or citizen;
- ItemInstance invalidation can emit entitlement change without a contract revision or false contract-update event;
- reset/import establishes a new observation baseline without emitting historical events.

Pure contract-level event snapshot:

```js
getSubscriptionContractEntitlementSnapshot(contract, atTime?)
```

The snapshot is internal integration support. World Bridge entitlement checks continue to use:

```js
resolveSubscriptionEntitlement(query)
```

### Terminal notification projection

`js/subscription-notification-producer.js` listens to domain events and emits strict Terminal events:

```text
SUBSCRIPTION.CONTRACT.CREATED
SUBSCRIPTION.ENTITLEMENT.CHANGED
SUBSCRIPTION.BILLING.FAILED
SUBSCRIPTION.CONTRACT.SUSPENDED
SUBSCRIPTION.CONTRACT.RESTORED
SUBSCRIPTION.CONTRACT.CANCELLED
```

Notification rules:

- generic `ws:subscription-updated` remains silent;
- contract creation suppresses the simultaneous initial entitlement notification;
- cancellation suppresses the simultaneous entitlement notification;
- suspension and restoration use dedicated notification event codes;
- notification deduplication uses citizen, event code and contract subject;
- domain `eventId` and contract `revision` are forwarded to Terminal Notifications;
- every provider present in the Subscription catalog has a Notification provider manifest supporting the `SUBSCRIPTION` domain;
- a notification failure does not roll back the contract mutation.

### Deferred contract

Not owned or not implemented by Subscriptions 3.1x:

```text
Billing intent and transaction lifecycle — owned by Billing
financial coverage calculation — installed shared `resolveCoverage()`, externally owned and read-only
Subscription UI target selector and asset contract cards
automatic replacement of a lost target
removal of runtime compatibility aliases
shared World Bridge operation/recovery orchestration
```


# Subscriptions Bridge Readiness 3.1x

## Mutation ownership

```text
public mutation owner: SubscriptionAPI
public API version: subscriptions_public_api_3_1x
private store boundary: subscriptions_command_boundary_3_1x
readiness schema: subscriptions_bridge_readiness_3_1x
```

`js/store.js` keeps low-level persistence functions in the frozen private table `window.WS_APP.__subscriptionStoreCommands`. Public low-level mutation names are deleted after `SubscriptionAPI` initialization. Integrations must use the canonical command API.

Direct `updateCitizen()` writes containing `subscriptions` are rejected outside approved internal sources with `SUBSCRIPTION_COMMAND_API_REQUIRED`.

## Final public command set

```text
createSubscriptionContract
changeSubscriptionTier
changeSubscriptionCoverageTarget
setSubscriptionBillingStatus
suspendSubscriptionContract
resumeSubscriptionContract
cancelSubscriptionContract
processSubscriptionBilling
processCitizenSubscriptionBilling
processWeeklySubscriptionSettlement
removeSubscriptionContractRecord
clearCancelledSubscriptionContracts
```

## Readiness audit

```js
runSubscriptionBridgeReadinessAudit()
```

The report distinguishes internal `blockers` from `externalBlockers`. `subscriptionReady: true` certifies the Subscriptions domain. `worldBridgeReady` additionally requires shared external APIs such as financial `resolveCoverage()`.

Declarative fixture definitions live in `data/subscription-bridge-fixtures.js`. Current readiness is verified by the installed runtime diagnostics and contract tests; no separate readiness report is authoritative.

## Deferred after 3.1x

```text
Subscription UI target selection and asset contract presentation
final removal of read-only runtime UI aliases
shared World Bridge operation/recovery orchestration outside Subscription ownership
```

---

# Asset Contracts UI 3.2x

## Status

```text
UI PATCH: subscription_asset_contracts_ui_3_2x
BACKEND DEPENDENCY: subscriptions_bridge_readiness_3_1x
INSTALLATION STATUS: installed in current baseline
PRIMARY OWNER: SUBSCRIPTIONS
```

This UI layer consumes the existing target-aware Subscription API. It does not add a second entitlement resolver, persistence path or ItemInstance ownership model.

## Player surface

An open contract profile displays:

```text
coverageTarget.type
coverageTarget.id
resolved target title
ItemInstance definition and lifecycle/location state
entitlementStatus
exact target reference used by firmware/service entitlement
validation/revocation reason codes
```

Catalog tiers whose `targetPolicy.allowedTargetTypes` includes `ITEM_INSTANCE` expose a target selector before contract creation. The selected target is passed directly to:

```js
createSubscriptionContract({
  citizenId,
  subscriptionCatalogId,
  tierId,
  coverageTarget
})
```

For an existing contract, target changes use only:

```js
changeSubscriptionCoverageTarget(contractId, coverageTarget, options)
```

No UI path writes `citizen.subscriptions[]` directly.

## Admin surface

Admin Subscription Control exposes the same target diagnostics and command boundary. Assignment of a new asset contract requires an eligible exact target. Existing contract rebind uses the public command API and preserves revision/event handling.

## Target selector rules

Selectable candidates come from:

```js
getEligibleSubscriptionTargets({
  citizenId,
  subscriptionCatalogId,
  tierId,
  targetType: "ITEM_INSTANCE",
  includeIneligible: true
})
```

The UI:

- keeps the current target visible even after loss, transfer or disposal;
- disables ineligible candidates;
- disables targets already covered by another open contract of the same catalog entry;
- presents validator reason codes without duplicating target policy logic;
- supports `CITIZEN`, `ITEM_INSTANCE`, or both according to catalog policy;
- never mutates ItemInstance ownership, lifecycle or location.

## Revocation diagnostics

A target is displayed as `REVOKED` in the UI when canonical validation fails. Typical reason codes include:

```text
SUBSCRIPTION_ITEM_TARGET_NOT_FOUND
SUBSCRIPTION_ITEM_TARGET_OWNER_MISMATCH
SUBSCRIPTION_ITEM_TARGET_LIFECYCLE_BLOCKED
SUBSCRIPTION_ITEM_TARGET_CATEGORY_INELIGIBLE
SUBSCRIPTION_ITEM_TARGET_SUBTYPE_INELIGIBLE
SUBSCRIPTION_ITEM_TARGET_TAGS_REQUIRED
SUBSCRIPTION_ITEM_TARGET_MANUFACTURER_INELIGIBLE
SUBSCRIPTION_ITEM_TARGET_PROVIDER_INELIGIBLE
```

The contract record remains visible and stored. The UI does not cancel, delete or retarget it automatically.

## Catalog editor

The Subscription Catalog editor exposes the existing `targetPolicy` schema:

```text
allowed target mode
default target type
maximumTargets
requireOwnedByCitizen
blockedLifecycleStates
allowedDefinitionIds
allowedCategories
allowedSubtypes
requiredTagsAny
requiredTagsAll
allowedManufacturerIds
allowedProviderIds
```

Collected definitions are normalized through the existing Subscription Catalog Store. The editor does not introduce a second schema.

## Non-goals

```text
no entitlement resolver changes
no Subscription API changes
no Subscription persistence changes
no Coverage Resolver changes
no Service entitlement changes
no Firmware Registry changes
no ItemInstance mutation
no World Bridge orchestration
no automatic target reassignment
```

---

# Player Workspace UI 4.0

## Status

```text
UI LAYER: subscriptions_workspace_ui_4_0
PRIMARY OWNER: SUBSCRIPTIONS PLAYER UI
COMMAND OWNER: SubscriptionAPI
PROFILE LAYOUT: subscriptions_profiles_ui_4_1
```

The player shell is a four-view workspace:

```text
OVERVIEW
CONTRACTS
CATALOG
PROVIDERS
```

`js/subscriptions-workspace.js` owns workspace navigation, shared filter state, data selectors and grouped list rendering. `js/subscriptions.js` retains product, owned-contract and provider profiles and bridges their back actions to the current workspace view.

## Shared UI state

```js
window.WS_APP.subscriptionUiState = {
  view: "OVERVIEW",
  query: "",
  group: "ALL",
  category: "ALL",
  providerId: "ALL",
  market: "ALL",
  status: "OPEN",
  targetType: "ALL",
  maxPrice: "",
  sort: "RELEVANCE",
  expandedCatalogSections: []
};
```

The state is player-UI state only. It is not persisted into Citizen, catalog, contract or Campaign Snapshot records.

## Selector boundary

Search and filters are resolved before markup is emitted:

```text
selectVisibleContracts()
selectVisibleCatalogEntries()
buildProviderGroups()
selectVisibleProviders()
```

The workspace does not render the complete catalog and then toggle card `hidden` state. Search normalization is case-insensitive, diacritic-insensitive and includes Polish `Ł/ł` normalization.

## Catalog grouping

Canonical player-facing groups:

```text
BODY_SURVIVAL
ACCESS_INFRASTRUCTURE
PROTECTION_ASSETS
DEVELOPMENT_OTHER
```

Groups are presentation projections over canonical catalog categories. They do not modify catalog records. Each category initially renders at most six matching entries and exposes an explicit section expansion action.

## Command and ownership rules

```text
no direct citizen.subscriptions[] writes
no second entitlement resolver
no second catalog store
no Billing mutation outside public Billing commands
no ItemInstance mutation
no provider identity persistence in UI state
```

Workspace cards and dashboards are read projections. Contract purchase, tier change, target rebind, billing status and cancellation continue through the public commands documented above.

## Profiles UI 4.1

`js/subscriptions.js` owns one terminal layout for product, owned-contract and provider profiles. Profile rendering remains a read projection over the canonical catalog, normalized Citizen contract projection, entitlement resolver, target validator and Organization Store.

### Product profile

```text
availability and market state
service scope and catalog metadata
tier comparison
coverage rules by tier
base and tier entitlement codes
target policy and eligible target selector
provider navigation
```

### Owned-contract profile

```text
contract, Billing and entitlement status
coverage target and validation reason codes
active entitlement codes
current package details
upgrade/downgrade comparison
payment, cancellation and target-rebind controls
provider navigation
```

### Provider profile

```text
provider presentation identity
services grouped by canonical catalog category
price range and category count
Organization Store registration status
actual primary location and network projection when registered
```

Missing Organization Store data is displayed as unavailable. The UI must not generate a substitute headquarters, visible address or network code.

Profile actions continue through the existing SubscriptionAPI/Billing command bindings. Profiles do not mutate catalog records, contracts, entitlements, Organization Store records or ItemInstance state directly. Back actions may return to `CONTRACTS`, `CATALOG` or `PROVIDERS` without discarding shared workspace filters.



## Player workspace navigation

The canonical player workspace remains:

```text
OVERVIEW
CONTRACTS
CATALOG
PROVIDERS
```

`js/subscriptions-workspace.js` owns the single shared `subscriptionUiState`. Navigation uses independent `system-segment-tile system-segment-tile--card` controls with a title and concise functional description. Counts remain in the workspace status bar and section headers; the navigation cards do not own dynamic counters. `css/system-tabs.css` is loaded globally by `index.html` and must not be duplicated by the Subscriptions lazy bundle.

The terminal-card presentation must not create a second catalog, entitlement resolver, contract store or persistence path.


## UI stability projection 4.2.1

Player and Admin presentation must read the canonical status axes independently:

```text
contractStatus
billingStatus
entitlementStatus
```

The temporary `contract.status -> billingStatus` alias is not sufficient for grouping, cancellation detection, attention counters or status tags. A paid contract with a blocked/revoked/invalid entitlement remains an attention case. `contractStatus=CANCELLED` remains cancelled even when the Billing snapshot is still `PAID`.

Catalog products whose target policy includes `ITEM_INSTANCE` are repeat-assignable per eligible target. Their list state is `ASSIGNABLE` when no open target contract exists and `ASSIGN MORE` when one or more target contracts already exist. Player UI must not collapse them into a single `OWNED` product state.

Tier actions resolve identity with:

```text
tier.tierId || tier.id
```

`tierId` is canonical; `id` is compatibility only. Search debounce callbacks must verify that the same workspace root is still mounted before rendering. Player list/profile/back and Admin rerender flows retain transient viewport state without adding persistence or another UI state owner.

## Actions and feedback projection 4.3

```text
PRESENTATION CONTROLLER: subscriptions_actions_feedback_4_3
OWNER: js/subscription-action-feedback.js
PERSISTENCE: none
```

Player and Admin Subscription commands use one transient result projection. The controller does not execute mutations and does not own contract, Billing, entitlement, Citizen, provider or ItemInstance state. It receives the existing command result and maps `resultCode`, `errorCode`, nested Billing reasons and partial-payment metadata into a user-facing descriptor.

Covered action classes:

```text
PURCHASE
ASSIGN
UPGRADE
DOWNGRADE
TIER
PAYMENT
BILLING
TARGET
CANCEL
SUSPEND
RESUME
CLEAR_CANCELLED
```

Required interaction rules:

```text
confirmation summary before a destructive or financial command
one processing lock per active control
repeat click ignored while the control is busy
inline success or failure result with accessible live region
visible reason for unavailable actions
failed commands preserve the current list/profile and filters
successful commands refresh only the owning Subscriptions view
no optimistic contract or Billing mutation in the UI
```

Feedback state is scoped as `PLAYER` or `ADMIN` and exists only in memory. It is not exported through Campaign Data I/O and must not be written to Citizen records or localStorage. Admin command-envelope failures, including missing operator notes, still append a failure result to Admin Audit through the existing Admin command path.

## Catalog presentation projection 4.4

```text
PRESENTATION MODEL: subscriptions_catalog_presentation_4_4
OWNER: data/subscription-catalog.js + js/subscription-catalog-store.js
PLAYER RENDERER: js/subscriptions.js
MUTATION OWNER: unchanged / SubscriptionAPI
```

Presentation is optional structured prose on the canonical catalog record. It does not create another catalog, entitlement resolver, coverage engine or persistence path.

### Product presentation

```js
{
  presentation: {
    overview: "...",
    benefits: ["..."],
    limitations: ["..."],
    usageNotes: ["..."],
    comparisonAxes: ["INCLUDED SCOPE", "LIMITS", "PRIORITY", "TARGET", "PRICE / ACTION"]
  }
}
```

### Tier presentation

```js
{
  presentation: {
    features: ["..."],
    limits: ["..."],
    priorityLabel: "STANDARD",
    comparisonValues: {
      scope: "...",
      access: "...",
      limit: "...",
      priority: "STANDARD"
    }
  }
}
```

Rules:

```text
presentation prose preserves case and punctuation; it is not normalized as an entitlement token
seed and stored presentation arrays are merged without duplicate strings
missing presentation falls back to existing summary/description only
no benefit, limit or exclusion may change SubscriptionAPI eligibility or entitlement resolution
all twenty seed products and all active tiers carry complete structured presentation
technical entitlement codes remain visible as diagnostic detail, not the main comparison language
```

The player tier matrix uses included scope, explicit limits, priority/target and price/action columns. Quantified coverage rules remain rendered inside included scope when present. Contract profiles show the same structured presentation for the currently selected tier.


## Responsive and accessibility boundary

The player workspace uses one roving-tabindex tablist for Overview, Contracts, Catalog and Providers. Each selected view is a labelled `tabpanel`; filtered result totals are announced through polite status regions. Product tier comparison uses table/row/columnheader/cell semantics without introducing a second data projection. Profile navigation moves focus to the new route heading. Player layouts must remain bounded at 980, 720 and 520 px and honor reduced-motion preferences.
