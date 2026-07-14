# Terminal Notifications Bridge 2.5x — Contract

## 0. Status

```text
FOUNDATION:
patch_terminal_notifications_bridge_foundation_2.0x.zip

CURRENT OPERATION PROJECTION PATCH:
patch_world_bridge_notifications_2.1x.zip

CURRENT CONTENT PROJECTION PATCH:
patch_terminal_notification_content_projection_2.2x.zip

CURRENT OPERATION PROJECTION POLICY PATCH:
patch_terminal_notification_projection_policy_2.3x.zip

CURRENT INBOX CONTENT UI PATCH:
patch_terminal_inbox_content_ui_2.4x.zip

CURRENT MARKET PRODUCER PATCH:
patch_market_notification_producer_2.5x.zip

BASE USED FOR 2.1x:
World Bridge Prerequisites Merge 9.0x
Equipment Bodymap Anchor Layout 1.1x
Equipment Bodymap Anchor Layout Fix 1.1.1x

CONNECTED PRODUCERS WITH PLAYER CONTENT:
Billing
Subscriptions
Transactional Services
World Bridge operation projection
Market Orders

EVENT SOURCES CONSUMED:
ws:world-bridge-operation-updated
ws:cyberware-world-operation-updated
ws:market-order-updated
```

The shared foundation provides the event registry, provider capability validation, versioned notification record and idempotent write API. Patch 2.1x adds the canonical World Bridge operation projection without taking ownership of orchestration, Billing, Services, Market, ItemInstance or recovery.

The Cyberware-specific listener consumes the installed Cyberware World Bridge 14.0x event. The generic operation listener processes only the explicit Cyberware operation types listed by the producer, and both paths share one operationId-based notification identity.

---

# 1. Canonical ownership

```text
Organization Store
= canonical organization identity and provider aliases

Notification Provider Capability Registry
= which provider may emit which notification domains/events

Notification Event Catalog
= event meaning, severity, attention, audience, aggregation and retention

Notification Content Template Catalog
= event-to-template ownership and shared player-facing labels

Notification Content Resolver
= read-only projection from canonical domain records to title, lead, panels, rows, tags and actions

Notification Projection Policy
= one-card ownership, child-event suppression and unread policy for World Bridge operations

TerminalNotifications API
= validation, content projection, emission, deduplication, lifecycle and write orchestration

Terminal entry store in js/store.js
= persistence, migration, per-citizen retention and legacy Inbox compatibility
```

Provider capability records must not duplicate organization names, organization type, organization locations or addresses.

---

# 2. Public API

```js
TerminalNotifications.registerEvents(definitions);
TerminalNotifications.registerProvider(manifest);
TerminalNotifications.registerPackage(packageDefinition);

TerminalNotifications.emit(input);
TerminalNotifications.updateByEvent(input);
TerminalNotifications.acknowledge(input);
TerminalNotifications.resolve(input);
TerminalNotifications.expire(input);
TerminalNotifications.archive(input);

TerminalNotifications.validateRegistry();
TerminalNotifications.getDiagnostics();

WS_APP.resolveNotificationContent(input);
WS_APP.getNotificationContentTemplate(eventCode);
WS_APP.validateNotificationContentProjection(options);
WS_APP.getNotificationContentProjectionDiagnostics();

WS_APP.resolveNotificationProjectionPolicy(input);
WS_APP.resolveNotificationParentOperation(input);
WS_APP.validateNotificationProjectionPolicy();
WS_APP.getNotificationProjectionPolicyDiagnostics();
```

Compatibility alias:

```js
WS_APP.emitNotification(input);
```

Legacy domain emitters continue to call `emitTerminalNotification()` in `js/store.js`. That emitter now validates the legacy type/subtype and routes through `TerminalNotifications.emitLegacy()` after Notification API initialization.

---

# 3. Required event input

```js
{
  citizenId: "citizen-b",
  eventCode: "CYBERWARE.FIRMWARE.UPDATE_AVAILABLE",
  providerId: "provider-coremed-service",

  subjectRef: {
    type: "ITEM_INSTANCE",
    id: "item_..."
  },

  correlationId: "firmware-release-...",
  revision: 1,

  data: {
    availableVersion: "2.4.1"
  }
}
```

Required fields are defined by the Event Catalog.

Unknown event codes are rejected. Unknown providers are rejected. A provider that does not support the event domain/event is rejected.

No new emission may silently fall back to another event.

---

# 4. Result contract

Created:

```js
{
  ok: true,
  operation: "CREATED",
  notificationId: "entry_...",
  entry: {}
}
```

Updated by dedupe/revision:

```js
{
  ok: true,
  operation: "UPDATED_EXISTING",
  notificationId: "entry_...",
  entry: {}
}
```

Duplicate revision:

```js
{
  ok: true,
  operation: "IGNORED_DUPLICATE",
  notificationId: "entry_...",
  entry: {}
}
```

Possible operations:

```text
CREATED
UPDATED_EXISTING
IGNORED_DUPLICATE
SILENT_LOGGED
PROJECTED_TO_PARENT
SUPPRESSED_BY_POLICY
```

---

# 5. Notification record v2

The store preserves the following bridge fields:

```text
schemaVersion
eventId
domain
eventCode
category
source
attention
audience
lifecycle
userFlags
subjectRef
relatedRefs
correlationId
dedupeKey
revision
summary
body
templateId
templateData
occurredAt
effectiveAt
dueAt
expiresAt
actions
retentionPolicy
aggregationPolicy
```

Legacy fields remain available for the current Terminal UI:

```text
type
subtype
severity
title
layout
panels
finalRows
tags
links
read
important
folder
createdBy
```

The current Inbox renderer remains compatible without a UI redesign.

---

# 6. Audience

Allowed values:

```text
PLAYER
ADMIN
BOTH
SYSTEM_ONLY
```

Legacy `INTERNAL` is normalized to:

```text
SYSTEM_ONLY
```

Default `getTerminalEntries()` reads the `PLAYER` audience. Internal technical entries remain stored but are excluded from the player Inbox and unread counter.

Admin/diagnostic callers may request:

```js
getTerminalEntries(citizenId, {
  folder: "INBOX",
  includeAllAudiences: true
});
```

---

# 7. Provider identity

Provider resolution uses:

```js
getOrganizationByProviderId()
findOrganization()
getOrganizationById()
```

The provider capability registry supports:

```text
providerId
organizationId
sourceKind
supportedEvents
supportedDomains
supportedEventPrefixes
eventOverrides
schemaVersion
revision
active
```

Initial bridge-ready capability manifests cover:

```text
System Authority
Watch & Secure
TRAUMA Team
Live & Prevail
Kagami Kaisha
CoreMed
Mass Compression
Habitat Market
Factory Commons
PerfectMin
system-runtime
settlement-engine
calendar-engine
```

Specific clinics, vendors and service centers introduced by later module updates must register their own manifests or canonical aliases before emitting notifications.

---

# 8. Dedupe and revision

Dedupe behavior is controlled by the event definition.

Supported modes:

```text
CREATE_ALWAYS
REPLACE_EXISTING
APPEND_TO_EXISTING
AGGREGATE_WINDOW
SILENT_LOG_ONLY
IGNORE_DUPLICATE
```

Foundation implementation supports creation, replacement, duplicate suppression and silent result handling.

Matching uses:

```text
eventId
or
dedupeKey
```

For an existing match:

```text
incoming revision <= stored revision
→ IGNORED_DUPLICATE

incoming revision > stored revision
→ UPDATED_EXISTING
```

World Bridge producers must pass stable `operationId`, `eventId`, `dedupeKey` or fields required by Event Catalog policy.

---

# 9. Persistence and retention

Storage key remains:

```text
ws_app_terminal_entries_v1
```

The record schema is versioned independently through `schemaVersion`.

Retention changed from one global last-500 limit to:

```text
maximum 500 stored entries per citizenId
```

This prevents one citizen or admin test generator from evicting another citizen's history.

Import/export uses the same normalizer and preserves record-v2 fields.

---

# 10. Legacy emission rules

Legacy `type/subtype` emissions are validated against:

```text
data/inbox-notification-types.js
```

Unknown explicit type/subtype is rejected and reported through notification diagnostics.

Legacy stored/imported records may still use migration fallback normalization so old localStorage does not become unreadable.

This distinction is mandatory:

```text
new emission
= strict validation

legacy record migration
= compatibility normalization
```

---

# 11. World Bridge performance boundary

Notification emission must not call:

```text
getEquipmentState()
getCitizenEquipmentItemInstanceViews()
full ItemInstance projection
Cyberware Runtime resolver
Cyberware Planner build
CyberGrid rebuild
Bodymap rebuild
full catalog build
ItemInstance persistence flush
```

The producer must pass a minimal completed-operation payload.

Notifications react to stable domain transitions and final operation events. They do not react to:

```text
hover
selection
same-grid movement
workspace switching
quote preview
coverage preview
provider selection
render
status polling
```

One World Bridge operation should normally update one notification card by `operationId` and increasing `revision`.

---

# 12. Initial bridge event catalog

Prepared domains include:

```text
CYBERWARE
MARKET
SERVICE
SUBSCRIPTION
BILLING
HOUSING
WORLD_BRIDGE
```

Prepared event families include:

```text
Cyberware installation/removal/replacement
Cyberware maintenance
Firmware availability/completion/failure
License expiry/revocation
Operational-state change
Market order completion/cancellation/failure
Service order scheduling/completion/failure/cancellation
Subscription entitlement/billing/suspension/restoration
Billing authorization/capture/failure/refund/recovery
Housing shipment delivery/hold
Housing storage capacity warning
World operation status update
```

Catalog availability does not mean a domain producer is connected. The installed World Bridge producer calls the public notification API only from canonical operation events after domain state is persisted.

---

# 13. Routing state after 2.1x

Terminal action buttons now preserve and forward:

```text
routeId
citizenId
entityRef
params
```

Implemented route contracts:

```text
CYBERWARE_WORLD_OPERATION
→ Equipment / Cyberware workspace
→ target citizen
→ target ItemInstance when available
→ OVERVIEW / HISTORY / MAINTENANCE view selected by operation type

SERVICE_ORDER
→ Service module
→ target citizen
→ serviceTargetOrderId context preserved for the Service UI
```

The patch does not redesign target modules. Service currently receives the exact order context but may still render its existing general view until a dedicated transactional order inspector is implemented.

Still pending:

```text
dynamic Event Catalog filters
attention-specific Inbox rendering
ACKNOWLEDGED / RESOLVED UI controls
full template engine
admin notification composer
```

---

# 14. Producer rules for World Bridge 14.0x

A producer may emit only after its owning domain has committed the relevant state.

Examples:

```text
Service quote
→ no notification

Billing authorization
→ local payment status only unless explicitly player-relevant

ItemInstance BODY commit
→ installation completion event

Service failure before physical commit
→ one failure/recovery event

firmware eligibility read
→ no notification

new world firmware release detected for an eligible instance
→ update-available event
```

Runtime resolvers and renderers must never emit notifications as a side effect.

---

# 15. World Bridge operation projection contract

Patch 2.1x implements:

```text
operationId → correlationId
one stable eventId/dedupeKey per operation
revision-based update of the existing card
retry and compensation update the same card
MarketOrder, ServiceOrder, BillingIntent, BillingTransaction and ItemTransaction relatedRefs
ItemInstance subjectRef for physical operations
WORLD_OPERATION subjectRef before an ItemInstance exists
provider/clinic/vendor validation with diagnostic fallback to system-runtime
routeId actions to Cyberware and Service
```

Supported operation types:

```text
PURCHASE_TO_HOUSING
PURCHASE_AND_INSTALL
INSTALL
DEINSTALL
REPLACE
MAINTENANCE
REPAIR
CALIBRATION
FIRMWARE_UPDATE
LICENSE_REVIEW
```

Notification handlers may read canonical records by ID for validation. They must not mutate domain records and must not call EquipmentState, CyberGrid, Cyberware Runtime, Planner or ItemInstance persistence.

Remaining acceptance with Cyberware World Bridge 14.0x installed:

```text
[ ] verify the real ws:cyberware-world-operation-updated
ws:market-order-updated payload
[ ] verify duplicate generic + Cyberware events collapse into one card
[ ] verify every final operation type routes to the intended Cyberware view
[ ] verify browser retry/compensation/reload behavior
[ ] verify no status-only event rebuilds EquipmentState or CyberGrid
```

---

# 13. Player content projection 2.2x

## 13.1. Covered event families

```text
WORLD_OPERATION.STATUS_CHANGED
SERVICE.ORDER.SCHEDULED / COMPLETED / FAILED / CANCELLED
SUBSCRIPTION.CONTRACT.CREATED / CANCELLED / SUSPENDED / RESTORED
SUBSCRIPTION.ENTITLEMENT.CHANGED
SUBSCRIPTION.BILLING.FAILED
BILLING.PAYMENT.AUTHORIZED / CAPTURED / FAILED / REFUNDED
BILLING.PAYMENT_RECOVERY_REQUIRED
```

Each covered event has an explicit `templateId` in the Event Catalog and a corresponding entry in `data/notification-content-templates.js`.

## 13.2. Resolution order

```text
explicit structured panels supplied by caller
→ preserve unchanged

otherwise
→ resolve canonical domain records by subjectRef / relatedRefs / templateData
→ build player-facing title, lead, panels, final rows, tags and fallback actions
→ persist the resolved projection in the existing Notification v2 record

if projection cannot resolve
→ use controlled fallback content from Notification API
```

The content resolver does not mutate producer payloads or domain records.

## 13.3. Canonical label sources

```text
ItemInstance: playerLabel first, then canonical Equipment/Cyberware definition
Provider: Organization Store
Service: ServiceOrder + ServiceDefinition
Subscription: Subscription contract + catalog entry + tier
Billing: BillingIntent / BillingTransaction + source-domain reference
World Bridge: WorldBridgeOperation and linked Market/Service/Billing/ItemInstance references
```

Raw identifiers remain in `subjectRef`, `relatedRefs`, `entityRef`, `templateData` and technical diagnostics. They must not be used as the primary visible label.

## 13.4. Read-only and performance boundary

The resolver may use indexed canonical getters. It must not call:

```text
EquipmentState builders
CyberGrid builders
Cyberware Runtime builders
Planner builders
full render projections
persistence commands
domain mutation commands
```

A notification resolution failure must not roll back or block the source-domain transition.

## 13.5. Legacy compatibility

Legacy entries and any caller that provides explicit non-empty `panels` retain those panels. Content projection applies only to Notification v2 emissions without an explicit structured payload.


# 14. Operation projection policy 2.3x

## 14.1. Primary card ownership

```text
one World Bridge operationId
= one player-facing Inbox card
```

The canonical `WORLD_OPERATION.STATUS_CHANGED` card owns the player-facing projection of linked Service and Billing steps. Child events remain valid domain events, but when they resolve to an existing World Bridge operation they return:

```text
PROJECTED_TO_PARENT
```

and do not create a second player card.

Parent resolution is read-only and may use:

```text
operationId / correlationId
World Bridge reference indexes
ServiceOrder.metadata.operationId
Billing sourceDomain + sourceRefId
BillingIntent / BillingTransaction correlationId
subjectRef / relatedRefs / templateData references
```

Standalone Service and Billing events that are not linked to a World Bridge operation keep their existing independent notification behavior.

## 14.2. Player Inbox status policy

```text
DRAFT / VALIDATING / RESERVING
→ no player card

AUTHORIZED / SCHEDULED
→ create or update the operation card
→ unread

IN_PROGRESS / COMMITTING / CAPTURING
→ update the existing card
→ do not reopen unread state

COMPLETED / FAILED / CANCELLED
RECOVERY_REQUIRED / PAYMENT_RECOVERY_REQUIRED / COMPENSATION_REQUIRED
→ update the same card
→ unread
```

Retry through VALIDATING or RESERVING does not create another card. A later progress state updates the original card quietly. Recovery and compensation outcomes update that same identity.

## 14.3. Boundaries

The policy must not:

```text
mutate World Bridge operations
mutate Service or Billing records
create a second operation store
rebuild EquipmentState or CyberGrid
call Cyberware Planner or Runtime builders
change standalone domain notification semantics
```

The policy executes inside `TerminalNotifications.emit()` after event validation and before content persistence. Policy failure degrades to the previous emission path and is diagnostic only.


---

# 12. Inbox Content UI 2.4x

## 12.1. Rendering ownership

```text
Notification Registry/API
= record meaning, persistence input, dedupe and lifecycle commands

Terminal Inbox renderer
= read-only player/admin presentation of stored records
```

The renderer consumes the persisted v2 fields without rewriting them:

```text
summary
domain
category
attention
lifecycle
source
subjectRef
relatedRefs
actions / links
```

It must not create another notification record, mutate source domains, resolve World Bridge recovery or write directly to localStorage.

## 12.2. Card presentation

Every v2 card may show:

```text
title
summary / lead
source label
subject label
domain
category
attention
lifecycle
structured content panels
actions
```

Attention presentation:

```text
INBOX    = normal card
BADGE    = low-intensity highlighted classification
BANNER   = prominent warning rail
BLOCKING = critical action-required rail
SILENT   = not expected in Player Inbox
```

Lifecycle presentation uses the stored Notification lifecycle. `ACKNOWLEDGED` and `RESOLVED` actions call the existing `TerminalNotifications` API. `EXPIRED` and `ARCHIVED` are displayed as terminal states; the renderer does not invent domain completion.

## 12.3. Filters

For schema v2 records, filter groups come from the registered Notification Event Catalog and the actual records present in the Inbox:

```text
EVENT DOMAINS
EVENT CATEGORIES
EVENT TYPES
```

Legacy-only entries retain compatibility categories and tags. Regex-based compatibility categories are not the source of truth for v2 events.

## 12.4. Technical details

Player cards must not expose raw event, correlation, dedupe or entity IDs as primary content. Admin may open a collapsed `TECHNICAL DETAILS` disclosure containing:

```text
eventCode
eventId
correlationId
revision
subjectRef
relatedRefs
dedupeKey
templateId
```

## 12.5. Routing actions

Inbox action projection recognizes dedicated routes for:

```text
CYBERWARE
SERVICE
MARKET
HOUSING
BILLING
SUBSCRIPTIONS
```

Routing still uses the existing `module`, `panel`, `section`, `routeId`, `entityRef` and `params` contract.

---

# 15. Market notification producer 2.5x

## 15.1. Source event

The producer consumes only the persisted Market Store event:

```text
ws:market-order-updated
```

It reads the canonical MarketOrder after the event and maps player-relevant terminal states. It does not emit from render paths, carts, stock projections or transient fulfillment calculations.

## 15.2. Event mapping

```text
COMPLETED                         → MARKET.ORDER.COMPLETED
CANCELLED                         → MARKET.ORDER.CANCELLED
FAILED                            → MARKET.ORDER.FAILED
refundRequest.status=REQUESTED    → MARKET.ORDER.REFUND_REQUESTED
REFUNDED / refund completed       → MARKET.ORDER.REFUNDED
payment/refund/cancel/delivery/
pickup/service recovery           → MARKET.ORDER.RECOVERY_REQUIRED
```

Intermediate states remain silent. One standalone MarketOrder uses:

```text
dedupeKey = market-order:<marketOrderId>
correlationId = marketOrderId
revision = MarketOrder.revision
```

Refund requests, refunds, failures and recovery therefore update the existing order card rather than creating parallel Market cards.

## 15.3. World Bridge ownership

`MARKET.ORDER.*` is a child family in Notification Projection Policy. If the MarketOrder is referenced by a World Bridge operation, the event returns `PROJECTED_TO_PARENT` and creates no second player card.

Standalone Market orders continue to own one independent Market Inbox card.

## 15.4. Content and routing

The Market content resolver reads MarketOrder, Organization Store, Equipment Catalog, ItemInstance and optional Housing/Shipment records through indexed getters. Primary content includes:

```text
product or item summary
quantity
vendor
order total
fulfillment mode
destination
payment/result/recovery state
```

Raw MarketOrder, ItemInstance, Billing and Shipment identifiers remain technical metadata only.

The canonical action uses:

```text
routeId = MARKET_ORDER
module = housing
housing tab = MARKET
entityRef = MARKET_ORDER
```

The Housing module route stores the selected citizen/order before rendering the existing lazy Market workspace. It does not create another Market UI or order store.

## 15.5. Boundaries

The producer and resolver must not mutate:

```text
Market checkout
stock reservations
Billing
Service lifecycle
shipment fulfillment
Housing placement
refund algorithms
World Bridge operations
ItemInstance
```

