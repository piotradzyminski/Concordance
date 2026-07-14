# World Bridge Coverage Foundation Contract — 1.0x

## Patch identity

```text
patch_world_bridge_coverage_foundation_1.0x.zip
COVERAGE_FOUNDATION_VERSION = world_bridge_coverage_foundation_1_0x
COVERAGE_RESOLVER_API_VERSION = shared_coverage_resolver_1_0x
```

This patch establishes Coverage as a shared World Bridge domain. The resolver is not owned by Services, Market, Billing or Subscriptions.

## Canonical owner

```text
js/coverage-resolver.js
```

Coverage is a read-only financial projection boundary. It does not own:

```text
Subscription contracts
Billing intents or transactions
Service offers or orders
Market carts or orders
ItemInstance records
insurance/intervention usage counters
Citizen balance
```

## Public API

```js
resolveCoverage(input)
previewCoverage(input)
getCoverageRule(coverageRuleId)
getCoverageRules(filters)
validateCoverageRules()
getCoverageResolverDiagnostics()
invalidateCoverageResolver(options)
```

`previewCoverage()` is a stable semantic alias for read-only checkout, quote and Billing preview consumers.

## Input

```js
{
  sourceDomain: "SERVICE",
  citizenId: "citizen-b",
  providerId: "provider-mass-compression-service",
  serviceDefinitionId: "svc-cyberware-repair-standard",
  catalogItemId: "",
  grossPrice: 1500,
  currency: "CREDIT",
  subjectRefs: {
    instanceIds: ["item_..."]
  },
  targetId: "",
  subscriptionRefs: [],
  coverageRuleIds: [],
  coverageAuthorizations: [],
  atTime: "2109-02-13",
  cache: true,
  forceRefresh: false
}
```

Caller-provided references restrict eligible canonical sources. They do not create coverage and cannot inject an arbitrary covered amount.

## Result

```js
{
  ok: true,
  foundationVersion: "world_bridge_coverage_foundation_1_0x",
  version: "shared_coverage_resolver_1_0x",
  grossPrice: 1500,
  coveredAmount: 900,
  payableAmount: 600,
  currency: "CREDIT",
  sources: [
    {
      sourceType: "SUBSCRIPTION",
      sourceId: "subscription_contract_...",
      subscriptionContractId: "subscription_contract_...",
      subscriptionCatalogId: "sub-mass-compression-service",
      tierId: "capacity-corporate",
      providerId: "provider-mass-compression-service",
      coverageRuleId: "COVERAGE_MASS_COMPRESSION_SERVICE",
      coverageCode: "MC_SERVICE_COVERAGE",
      amount: 900,
      requestedAmount: 900,
      coverageTarget: {
        type: "CITIZEN",
        id: "citizen-b"
      },
      status: "ACTIVE",
      revision: 3,
      metadata: {}
    }
  ],
  coverageRuleIds: [],
  evaluatedRuleIds: [],
  blockers: [],
  warnings: [],
  evaluatedAt: "ISO-8601",
  revision: 3,
  signature: "deterministic-hash"
}
```

Invariant:

```text
0 <= coveredAmount <= grossPrice
payableAmount = grossPrice - coveredAmount
```

## Canonical source types

```text
SUBSCRIPTION
TRAUMA
LIVE_AND_PREVAIL
INSURANCE
SYSTEM
MANUAL_OVERRIDE
```

Compatibility aliases accepted during normalization:

```text
LIVE_PREVAIL -> LIVE_AND_PREVAIL
EXTERNAL -> MANUAL_OVERRIDE
```

The current built-in source acquisition path reads canonical Subscription contracts and catalog coverage rules. `SYSTEM` and `MANUAL_OVERRIDE` are reserved source semantics for future authorized provider adapters; callers cannot create them by passing arbitrary source objects.

## Rule source

Canonical rule definitions remain attached to Subscription Catalog entries through:

```js
subscription.coverageRules[]
```

Rule shape:

```js
{
  coverageRuleId: "COVERAGE_COREMED_SERVICE",
  sourceType: "SUBSCRIPTION",
  coverageCode: "COREMED_SERVICE_COVERAGE",
  stackGroup: "SERVICE_PRIMARY_COVERAGE",
  stackMode: "EXCLUSIVE_HIGHEST",
  priority: 300,
  appliesTo: {
    sourceDomains: ["SERVICE"],
    providerIds: ["provider-coremed-service"],
    serviceDefinitionIds: [],
    catalogItemIds: []
  },
  benefitsByTierId: {
    "cms-basic": {
      calculation: "PERCENT_CAP",
      percent: 15,
      maxAmount: 750
    }
  },
  active: true,
  revision: 1
}
```

Supported calculations:

```text
PERCENT
PERCENT_CAP
FIXED
FULL
```

Supported stack modes:

```text
STACK
EXCLUSIVE_HIGHEST
```

## Contract and target validation

Coverage is evaluated only from canonical Subscription contracts.

```text
ACTIVE or GRACE_PERIOD entitlement snapshot required
contract Citizen must match input Citizen
CITIZEN target must match input Citizen
ITEM_INSTANCE target must match subjectRefs.instanceIds or explicit targetId
inactive rules are ignored
provider/service/catalog filters are exact
```

## Usage-gated coverage

A tier benefit may require an authorization code:

```js
authorizationCode: "TRAUMA_INTERVENTION_AVAILABLE"
```

The resolver applies that benefit only when the caller supplies the same code through `coverageAuthorizations`.

Coverage does not decrement intervention quotas. A future usage ledger or World Bridge operation must authorize and consume the quota atomically.

## Stacking

Candidates in `EXCLUSIVE_HIGHEST` groups are ranked by:

```text
requested covered amount
rule priority
coverageRuleId
subscriptionContractId
```

Only the highest candidate is selected from that group. `STACK` sources are allocated by priority until the gross price is covered.

## Determinism and cache

The deterministic signature includes:

```text
Citizen
provider/service/catalog context
subject and target IDs
price and currency
selected source IDs and rule IDs
allocated amounts
contract/catalog/tier/rule revisions
evaluation time
```

The resolver maintains an in-memory LRU cache with a maximum of 500 results. Cache entries are keyed by normalized query data, contract entitlement snapshots and the coverage-rule revision signature.

Targeted invalidation occurs after:

```text
Subscription created/updated/entitlement-changed/cancelled
Citizen or ItemInstance mutation
```

Full rule/result invalidation occurs after:

```text
Subscription Catalog update
campaign date update
explicit invalidateCoverageResolver({ scope: "ALL" })
```

Diagnostics expose cache size, limit, hits, misses and invalidation count.

## Mutation restrictions

`resolveCoverage()` and `previewCoverage()` must not:

```text
write localStorage
change Subscription status
consume quotas
create, authorize or capture Billing intents
change Service orders
change Market orders
mutate ItemInstance
change Citizen balance
emit domain mutation events
```

## Current baseline rules

Current bridge rules cover:

```text
CoreMed Service
Mass Compression Service
Kagami Sentinel service support
Aurum Body Maintenance service support
TRAUMA service coverage
TRAUMA replacement cap
TRAUMA usage-authorized emergency intervention
```

Percentage/cap values marked `BRIDGE_BASELINE` remain economy-balancing inputs. TRAUMA replacement and intervention rules marked `LORE_CANON` encode current world rules.

## Current consumers

```text
Services Coverage Bridge 2.3x
Billing preview adapter
Subscriptions and Services readiness audits
```

Market may consume the same API in a later bridge patch. It must not implement a parallel coverage calculator.
