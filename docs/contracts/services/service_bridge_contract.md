# Services Bridge Contract — Foundation 2.0x + Entitlement 2.2x + Coverage 2.3x + Billing 2.4x + Final Readiness 2.5x

## Canonical scope

This contract covers transactional service operations required by Cyberware World Bridge.

It is separate from the existing employment domain:

```text
Citizen.serviceLog
= employment / assignment / payout registry

Service Bridge Store
= provider quote / offer / order / execution result registry
```

No migration from `Citizen.serviceLog` to bridge orders is performed.

## Canonical files

```text
data/service-definitions.js
js/service-bridge-store.js
```

Ownership:

```text
data/service-definitions.js
  service operation definitions
  service provider capability manifests

js/service-bridge-store.js
  provider capability indexes
  offer/order persistence
  quote and eligibility boundary
  service order lifecycle
  idempotency
  revisioned events
```

Organization identity remains owned by:

```text
data/organizations.js
js/organization-store.js
```

Service provider manifests extend organization/provider identity with service capabilities. They do not create a second organization store.

## Store schema

```text
schema marker: service_bridge_foundation_2_0x
localStorage schema key: ws_service_bridge_schema
localStorage data key: ws_service_bridge_store_v1
```

Persisted state:

```js
{
  schemaVersion: 1,
  revision: 0,
  offers: [],
  orders: [],
  idempotency: []
}
```

Persistence is deferred. Status updates do not serialize Citizen, EquipmentState, CyberGrid or the full project store.

## Stable identifiers

```text
serviceDefinitionId
serviceOfferId
serviceOrderId
providerId
citizenId
instanceId
billingIntentId
billingTransactionId
subscriptionContractId
insuranceContractId
housingStorageId
```

Provider names are display data. All bridge relations use `providerId`.

## Provider record

```js
{
  providerId: "provider-coremed-service",
  providerType: "CLINIC",
  legalName: "CoreMed",
  displayName: "CoreMed Clinical Services",
  organizationId: "coremed",
  locationId: "",
  capabilities: ["CYBERWARE_INSTALL"],
  active: true,
  revision: 1
}
```

Provider aliases resolve to one canonical `providerId`.

Public provider API:

```text
getProvider(providerId)
searchProviders(filters)
getProviderCapabilities(providerId)
getProviderServiceCapabilities(providerId)
providerSupports(providerId, capabilityCode)
```

## Service definition

```js
{
  serviceDefinitionId: "svc-cyberware-install-standard",
  serviceType: "CYBERWARE_INSTALL",
  domain: "CYBERWARE",
  requiredCapabilities: ["CYBERWARE_INSTALL"],
  subjectPolicy: {
    minInstanceCount: 1,
    maxInstanceCount: 4,
    returnLocationRequired: false
  },
  durationModel: {
    type: "FORMULA",
    formulaId: "cyberware_install_duration_v1",
    baseMinutes: 120,
    perInstanceMinutes: 90
  },
  pricingModel: {
    type: "FORMULA",
    formulaId: "cyberware_install_price_v1",
    basePrice: 1500,
    perInstancePrice: 1500
  },
  riskModel: {
    formulaId: "cyberware_install_risk_v1"
  },
  active: true,
  revision: 1
}
```

Foundation definitions cover:

```text
CYBERWARE_DIAGNOSTIC
CYBERWARE_INSTALL
CYBERWARE_DEINSTALL
CYBERWARE_REPLACE
CYBERWARE_REPAIR
CYBERWARE_CALIBRATE
CYBERWARE_CLEAN
FIRMWARE_UPDATE
LICENSE_REVIEW
EMERGENCY_EXTRACTION
```

Formula IDs and base values are bridge seeds. Final economic balance remains outside this patch.

## Subscription entitlement policy

Each service definition may expose a declarative provider-specific policy:

```js
entitlementPolicy: {
  targetStrategy: "SUBJECT_OR_CITIZEN",
  providerRules: [
    {
      providerId: "provider-coremed-service",
      entitlementCode: "COREMED_FIRMWARE_ACCESS",
      requirement: "REQUIRED"
    }
  ]
}
```

Supported requirements:

```text
REQUIRED
  missing or inactive entitlement blocks eligibility

OPTIONAL
  missing entitlement produces a warning and keeps paid service available

COVERAGE_ONLY
  active entitlement contributes Subscription references and coverageRuleIds
  missing entitlement does not block paid service
```

Supported target strategies:

```text
CITIZEN_ONLY
ITEM_INSTANCE_ONLY
SUBJECT_OR_CITIZEN
```

`SUBJECT_OR_CITIZEN` evaluates every `subjectRefs.instanceIds[]` target as `ITEM_INSTANCE`. If no active item-target contract grants the entitlement, the resolver retries against the owning `CITIZEN` target. A citizen-level contract can therefore cover all subject items, while a future asset contract can cover one specific instance.

Canonical resolver:

```text
resolveServiceEntitlements(input)
```

Input:

```js
{
  serviceDefinitionId,
  citizenId,
  providerId,
  subjectRefs,
  atTime
}
```

Result:

```js
{
  ok,
  connected,
  policyApplied,
  subscriptionRefs: [],
  coverageRuleIds: [],
  entitlementResults: [],
  blockers: [],
  warnings: [],
  evaluatedAt
}
```

Services delegates every entitlement decision to:

```text
resolveSubscriptionEntitlement(query)
```

Services does not read or mutate `citizen.subscriptions[]` directly.

Current blocking mappings:

```text
CoreMed firmware update
  COREMED_FIRMWARE_ACCESS

Mass Compression firmware update
  MC_FIRMWARE_ACCESS

Kagami firmware update
  KAGAMI_FIRMWARE_SECURITY_UPDATES

TRAUMA emergency extraction
  TRAUMA_EMERGENCY_RESPONSE
```

Current certified-service, medical and maintenance mappings use `OPTIONAL` or `COVERAGE_ONLY` and do not block a normal paid service.

## Service offer

```js
{
  schemaVersion: 1,
  serviceOfferId: "service_offer_...",
  serviceDefinitionId: "svc-cyberware-install-standard",
  providerId: "provider-coremed-service",
  organizationId: "coremed",
  citizenId: "citizen-b",
  subjectRefs: {
    instanceIds: ["item_..."],
    targetCharacterId: "citizen-b",
    targetBodySlots: ["LEFT_EYE"],
    returnLocation: null
  },
  quote: {
    grossPrice: 3000,
    coveredAmount: 0,
    payableAmount: 3000,
    currency: "CREDIT",
    estimatedDurationMinutes: 210,
    pricingModelId: "cyberware_install_price_v1",
    durationModelId: "cyberware_install_duration_v1",
    coverageSources: [],
    coverageRuleIds: [],
    revision: 1
  },
  subscriptionRefs: [],
  coverageRuleIds: [],
  entitlementResults: [],
  availability: "AVAILABLE",
  blockers: [],
  warnings: [],
  expiresAt: null,
  revision: 1
}
```

An offer is a quote snapshot. It is not an active service order.

Blocked eligibility may produce a stored offer with:

```text
availability: BLOCKED
blockers: [...]
```

A blocked offer cannot create an order.

## Service order

```js
{
  schemaVersion: 1,
  serviceOrderId: "service_order_...",
  serviceOfferId: "service_offer_...",
  serviceDefinitionId: "svc-cyberware-install-standard",
  providerId: "provider-coremed-service",
  organizationId: "coremed",
  citizenId: "citizen-b",

  status: "SCHEDULED",
  paymentStatus: "AUTHORIZED",

  subjectRefs: {
    instanceIds: ["item_..."],
    targetCharacterId: "citizen-b",
    targetBodySlots: ["LEFT_EYE"],
    returnLocation: {
      type: "HOUSING_STORAGE",
      housingStorageId: "housing_storage_b"
    }
  },

  quote: {},

  billingRefs: {
    billingIntentId: "billing_intent_...",
    billingTransactionId: ""
  },

  subscriptionRefs: [],
  coverageRuleIds: [],
  entitlementResults: [],
  insuranceRefs: [],

  scheduledStartAt: "world-time",
  estimatedEndAt: "world-time",
  startedAt: null,
  completedAt: null,
  cancelledAt: null,
  failedAt: null,

  result: null,
  revision: 1
}
```

## Lifecycle

Supported order statuses:

```text
DRAFT
QUOTED
PENDING_CONFIRMATION
AUTHORIZED
SCHEDULED
IN_PROGRESS
COMPLETED
FAILED
CANCELLED
EXPIRED
REJECTED
```

Canonical transition path:

```text
PENDING_CONFIRMATION
→ AUTHORIZED
→ SCHEDULED
→ IN_PROGRESS
→ COMPLETED
```

Allowed failure/cancellation transitions are validated by the store. Terminal states cannot be reopened by this API.

Payment lifecycle remains independent:

```text
NOT_REQUIRED
PENDING
AUTHORIZED
CAPTURED
PARTIALLY_CAPTURED
FAILED
REFUNDED
PARTIALLY_REFUNDED
WAIVED
COVERED
```

A failed service order does not automatically mark payment as failed. Billing state is supplied by Billing/World Bridge.

## Subject references and return location

```js
subjectRefs: {
  instanceIds: [],
  targetCharacterId: "",
  targetBodySlots: [],
  returnLocation: null
}
```

Supported return location types:

```text
HOUSING_STORAGE
CONTAINER_GRID
CONTAINER_SLOT
VENDOR
SERVICE
```

Definitions for deinstall and replace require an explicit return location.

Eligibility performs indexed `getItemInstanceById()` reads when ItemInstance API is available. It does not build EquipmentState or project all citizen items.

## Quote and coverage boundary

```text
quoteService(input)
resolveServiceEntitlements(input)
validateServiceEligibility(input)
```

`quoteService()` owns deterministic service price/duration calculation from the selected definition and item count.

Coverage behavior after 2.3x:

```text
resolveCoverage() available
→ quote consumes normalized shared result
→ quote snapshots sources, rule IDs, warnings, resolver version and deterministic signature

resolveCoverage() unavailable
→ coveredAmount = 0
→ warning: COVERAGE_RESOLVER_NOT_CONNECTED
```

Services do not implement a second financial rules engine and do not charge funds. The shared resolver is owned by `js/coverage-resolver.js`; Services only supplies service identity, subject references, entitlement-selected Subscription references and gross price.

## Read API

```text
getServiceDefinition(serviceDefinitionId)
getServiceDefinitions(filters)
getServiceOffer(serviceOfferId)
getServiceOrder(serviceOrderId)
getServiceOrders(filters)
getCitizenServiceOrders(citizenId, filters)
getProviderServiceOrders(providerId, filters)
getProviderServiceCapabilities(providerId)
quoteService(input)
validateServiceEligibility(input)
getServiceBridgeStoreRevision()
getServiceBridgeDiagnostics()
```

All single-record lookups use indexes.

## Command API

```text
createServiceOffer(input)
createServiceOrderFromOffer(serviceOfferId, input)
authorizeServiceOrder(serviceOrderId, options)
scheduleServiceOrder(serviceOrderId, schedule, options)
startServiceOrder(serviceOrderId, options)
completeServiceOrder(serviceOrderId, result, options)
failServiceOrder(serviceOrderId, failure, options)
cancelServiceOrder(serviceOrderId, reason, options)
```

Every command requires:

```js
{
  idempotencyKey: "stable-command-key"
}
```

Lifecycle commands may also provide:

```js
{
  expectedRevision: 4
}
```

Revision mismatch returns:

```text
SERVICE_ORDER_REVISION_CONFLICT
```

Repeated idempotency keys return the existing entity and do not emit another event.

## Completion result

```js
{
  outcome: "SUCCESS",
  resultCode: "CYBERWARE_INSTALL_COMPLETED",
  itemMutations: [],
  conditionChanges: [],
  firmwareChanges: [],
  authorizationChanges: [],
  serviceHistoryEntries: [],
  complications: [],
  generatedDiagnostics: [],
  refundInstruction: null,
  itemCommit: null,
  metadata: {}
}
```

Allowed outcomes:

```text
SUCCESS
PARTIAL_SUCCESS
FAILED
CANCELLED
```

Services do not commit ItemInstance mutations.

When a completion result contains physical, firmware, authorization, condition or history mutations, it must include bridge confirmation:

```js
itemCommit: {
  status: "COMMITTED",
  committed: true,
  transactionId: "..."
}
```

Without confirmation, completion returns:

```text
ITEM_COMMIT_CONFIRMATION_REQUIRED
```

Required order:

```text
Service result prepared
→ World Bridge validates result
→ canonical ItemInstance transaction commits
→ completion receives commit confirmation
→ Service order becomes COMPLETED
```

## Events

```text
ws:service-offer-created
ws:service-order-created
ws:service-order-updated
ws:service-order-started
ws:service-order-completed
ws:service-order-failed
ws:service-order-cancelled
```

Order event payload:

```js
{
  serviceOrderId,
  serviceDefinitionId,
  providerId,
  citizenId,
  status,
  previousStatus,
  paymentStatus,
  subjectInstanceIds: [],
  subscriptionContractIds: [],
  coverageRuleIds: [],
  revision
}
```

Events contain no Citizen snapshot, EquipmentState, CyberGrid state or full ItemInstance projection.

## Performance invariants

```text
quote does not build EquipmentState
provider selection does not project all ItemInstances
status changes do not rebuild CyberGrid
single-record reads use Map indexes
persistence is deferred
one command emits at most one service domain event
idempotent replay emits no duplicate event
```

## Explicit non-goals

```text
current Service Market UI rewrite
current Service Log replacement
Mandatory/Regular generator changes
Coverage balance finalization
Housing reservation implementation
ItemInstance transaction commit
Cyberware World Bridge orchestrator
final service price balance
```

## Final Readiness 2.5x

Services readiness is owned by:

```text
data/service-bridge-fixtures.js
js/service-notification-producer.js
js/service-bridge-readiness.js
```

Public readiness API:

```text
getServiceBridgeFixtureFlows()
getServiceBridgeFinalReadinessScenarios()
validateServiceBridgeDefinitions()
validateServiceBridgeProviders()
validateServiceBridgeFixtures()
validateServiceBridgeFinalScenarios()
validateServiceNotificationContract()
validateServiceBridgeOperationalContract()
runServiceBridgeReadinessAudit()
```

Public operational contract API:

```text
getServiceBridgeOperationalContract()
SERVICE_BRIDGE_OPERATIONAL_CONTRACT_SCHEMA_VERSION = services_bridge_operational_contract_2_5x
```

The final audit separates Services-owned readiness from external dependency readiness:

```text
servicesInternalReady
externalDependenciesReady
foundationReady = servicesInternalReady
worldBridgeReady = servicesInternalReady && externalDependenciesReady
```

Readiness states:

```text
SERVICES_INTERNAL_BLOCKED
EXTERNAL_DEPENDENCY_PENDING
WORLD_BRIDGE_READY
```

The final scenario matrix covers paid, covered and free success paths; pre-execution void; pre-capture ItemInstance compensation; post-capture refund compensation; failure without item mutation; idempotent replay; stale revision rejection; and notification deduplication. The startup audit validates scenario contracts without executing mutations.

Service order notification mapping remains:

```text
SCHEDULED -> SERVICE.ORDER.SCHEDULED
COMPLETED -> SERVICE.ORDER.COMPLETED
FAILED -> SERVICE.ORDER.FAILED
CANCELLED -> SERVICE.ORDER.CANCELLED
```

The producer uses `TerminalNotifications.emit()` and does not write Terminal entries directly.

Expected state on the current baseline:

```text
servicesInternalReady: true
externalDependenciesReady: true
foundationReady: true
worldBridgeReady: true
servicesFrozen: true
runtimeVerificationRequired: true
readinessState: WORLD_BRIDGE_READY
```

`worldBridgeReady` is a static contract result. Browser execution against the current persisted runtime remains a separate verification step. Remaining Cyberware World Bridge blockers are outside the Services-owned scope.

## Coverage Bridge 2.3x

Public markers:

```text
SERVICE_COVERAGE_BRIDGE_SCHEMA_VERSION = services_coverage_bridge_2_3x
COVERAGE_RESOLVER_API_VERSION = shared_coverage_resolver_1_0x
```

`quoteService()` forwards:

```text
sourceDomain = SERVICE
citizenId
providerId
serviceDefinitionId
grossPrice
subjectRefs
subscriptionRefs
entitlementResults
coverageRuleIds
coverageAuthorizations
atTime
```

The normalized quote persists:

```js
{
  grossPrice,
  coveredAmount,
  payableAmount,
  coverageSources: [],
  coverageRuleIds: [],
  coverageBlockers: [],
  coverageWarnings: [],
  coverageEvaluatedAt,
  coverageSignature,
  coverageResolverVersion,
  revision
}
```

`createServiceOrderFromOffer()` performs a fresh quote instead of trusting a caller-provided covered amount.

`authorizeServiceOrder()` performs a second coverage evaluation. When the stored and current financial snapshots differ, authorization returns:

```text
SERVICE_ORDER_REQUOTE_REQUIRED
```

The caller may retry with explicit `acceptCoverageChange: true` after presenting the current quote to the operator/player.

Usage-limited benefits require an explicit coverage authorization code. Services does not decrement the usage ledger.

## Billing Intent Bridge 2.4x

Public marker:

```text
SERVICE_BILLING_INTENT_BRIDGE_SCHEMA_VERSION = services_billing_intent_bridge_2_4x
```

Services consumes the canonical Billing command API:

```text
createBillingIntent()
authorizeBillingIntent()
captureBillingIntent()
voidBillingIntent()
refundBillingTransaction()
getBillingIntent()
getBillingTransaction()
```

Services never edits:

```text
citizen.credits
citizen.debt
BillingIntent storage
BillingTransaction storage
```

`authorizeServiceOrder()` performs the following boundary:

```text
revalidate entitlement
recalculate coverage
require explicit requote acceptance when financial snapshot changed
create or reuse one SERVICE BillingIntent
authorize BillingIntent
persist Billing references on ServiceOrder
transition ServiceOrder to AUTHORIZED
```

Authorization reserves Billing capacity and does not capture funds.

Zero-payable orders do not create a BillingIntent:

```text
grossPrice = 0
→ paymentStatus = NOT_REQUIRED

payableAmount = 0 due to coverage
→ paymentStatus = COVERED
```

Public Service billing commands:

```text
captureServiceOrderBilling(serviceOrderId, options)
voidServiceOrderBilling(serviceOrderId, options)
refundServiceOrderBilling(serviceOrderId, amount, options)
getServiceOrderBillingState(serviceOrderId)
```

Canonical `billingRefs` snapshot:

```js
{
  billingIntentId,
  billingTransactionId,
  refundTransactionId,
  intentIdempotencyKey,
  captureIdempotencyKey,
  lastCaptureIdempotencyKey,
  voidIdempotencyKey,
  refundIdempotencyKey,
  lastRefundIdempotencyKey,
  correlationId,
  paymentSource,
  intentStatus,
  transactionStatus,
  compensationStatus,
  itemTransactionId,
  itemTransactionStatus,
  itemTransactionRevision,
  itemCommitStoreRevision,
  executionMode,
  executionConfirmedAt,
  intentRevision,
  transactionRevision
}
```

Billing idempotency keys are derived from:

```text
serviceOrderId
serviceOrder revision
financial quote fingerprint
optional explicit retry key
```

A changed quote cannot reuse an incompatible authorized intent. Pending or authorized mismatched intents are voided before replacement. Captured intents return:

```text
SERVICE_BILLING_CAPTURED_INTENT_CONFLICT
```

Execution boundaries:

```text
startServiceOrder()
→ requires AUTHORIZED / CAPTURED / COVERED / WAIVED / NOT_REQUIRED payment state

captureServiceOrderBilling()
→ requires persisted ItemInstance transaction status COMMITTED
→ transaction.sourceDomain = SERVICE
→ transaction.sourceRefId = serviceOrderId
→ transaction.citizenId = ServiceOrder.citizenId
→ transaction instanceIds must belong to ServiceOrder.subjectRefs.instanceIds

mutation-free Service
→ requires explicit mutationFree + executionConfirmed

completeServiceOrder()
→ revalidates the same transactionId from Billing refs / result.itemCommit
→ requires CAPTURED / COVERED / WAIVED / NOT_REQUIRED payment state

refundServiceOrderBilling()
→ requires bound ItemInstance transaction status COMPENSATED
→ mutation-free Service requires explicit executionCompensated
```

`itemCommit.committed = true` without a resolvable transaction record is rejected.

A completed physical operation with failed Billing capture may use the explicit recovery path:

```text
paymentStatus = PAYMENT_RECOVERY_REQUIRED
allowPaymentRecovery = true
```

Services does not automatically refund or void on failure/cancellation. Failure and cancellation are blocked while an authorized intent or captured transaction remains uncompensated. The World Bridge orchestrator must call the explicit void/refund command with stable idempotency and operation references before the terminal transition.

Billing capture success followed by Service persistence failure returns:

```text
SERVICE_BILLING_CAPTURE_RECONCILIATION_REQUIRED
```

The caller must reconcile from the stored Billing transaction reference and must not retry physical mutation.

## World Time Service Completion Scheduler 1.1x integration

`js/world-time-service-scheduler.js` remains an external lifecycle consumer of the Service Bridge. It does not become a second Service store.

Indexed reads:

```text
getServiceOrders({ statuses: ["SCHEDULED"] })
getServiceOrders({ statuses: ["IN_PROGRESS"] })
```

Start boundary:

```text
SCHEDULED due
→ scheduler calls startServiceOrder()
→ Service validates expectedRevision and payment authorization
→ Service transitions order to IN_PROGRESS
```

Completion boundary:

```text
IN_PROGRESS estimatedEndAt due
→ scheduler requests one registered completion handler
→ handler performs canonical external execution
→ handler either commits Service itself or returns canonical Service result
→ scheduler may call completeServiceOrder() through the public API
```

The scheduler never assumes success from time alone. Missing handlers produce `SERVICE_COMPLETION_HANDLER_REQUIRED` and leave the order `IN_PROGRESS`.

When `completeServiceOrder()` is invoked from a handler result, all existing physical proof, ItemInstance transaction, Billing capture, outcome, revision and transition guards remain mandatory.

Full contract:

```text
docs/contracts/world_bridge/world_time_service_scheduler_contract.md
```
