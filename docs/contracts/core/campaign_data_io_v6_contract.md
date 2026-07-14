# Campaign Data I/O v6 Contract

## Status

```text
contract: campaign_data_io_v6_1_0x
snapshot schema: ws-local-campaign-data-v6
snapshot version: 6
baseline: Parallel Scope + Cyberware World Bridge Merge 14.0x
```

This contract owns complete local campaign backup, validation, atomic persistence import, rollback and campaign-persistent reset.

## Public API

```text
exportCampaignSnapshotV6(options?)
previewCampaignSnapshotV6(snapshotOrJson)
validateCampaignSnapshotV6(snapshotOrJson)
importCampaignSnapshotV6(snapshotOrJson, options?)
resetCampaignStateV6(options?)
getCampaignDataIoReadiness()
```

Compatibility alias:

```text
exportCampaignData()
→ exportCampaignSnapshotV6()
```

## Domain adapter contract

Every registered adapter implements:

```js
{
  domainId,
  schemaVersion,
  classification,
  required,
  storageKeys,
  exportState,
  validateState,
  stageImport,
  commitImport,
  restoreBackup,
  resetState,
  reconcileState,
  summarizeState
}
```

Registration APIs:

```text
registerCampaignDataDomainAdapter()
getCampaignDataDomainAdapter()
getCampaignDataDomainAdapters()
getCampaignDataIoRegistryDiagnostics()
```

Classifications:

```text
SEED_ONLY
DERIVED
RUNTIME_PERSISTENT
CAMPAIGN_PERSISTENT
LOCAL_UI_ONLY
```

Only `CAMPAIGN_PERSISTENT` adapters are included in Snapshot v6.

## Registered campaign-persistent domains

```text
campaign-clock
citizens
users-access
citizen-command-receipts
item-instances
item-instance-transactions
billing
subscriptions
service-bridge
market
housing
world-bridge-operations
world-time-scheduler
terminal-runtime
admin-audit
knowledge-entries
addresses
tags
system-records
case-files
```

The adapters cover:

```text
Citizens and Citizen schema
Users and Access Tags
CitizenCommandAPI receipts
ItemInstances
ItemInstance transaction receipts/snapshots/compensation records
Billing intents/transactions/transfer accounts/transfers/history/schema
Subscription contracts schema, command receipts and custom catalog versions
Service Bridge offers/orders/idempotency receipts
legacy Service requests/offers required by current runtime
Market carts/orders/stock and recovery state
Housing placement reservations
World Bridge operations, refs, claims and recovery state
World Time START/COMPLETE receipts
Terminal cards, lifecycle, dedupe/revision, reminders and requests
Admin Audit Log
editable content/address/tag/system/case stores
campaign date and settlement period
```

## Explicitly omitted domains

```text
firmware-registry
notification-catalog
```

Reason:

```text
SEED_ONLY
```

```text
equipment-derived-state
```

Reason:

```text
DERIVED_FROM_CANONICAL_CAMPAIGN_STATE
```

```text
equipment-ui-sort-counter
test-mode
```

Reason:

```text
LOCAL_UI_STATE_NOT_PART_OF_CAMPAIGN
```

## Snapshot format

```js
{
  schema: "ws-local-campaign-data-v6",
  snapshotSchemaVersion: 6,
  exportedAt,
  projectStateVersion,
  campaignId,
  campaign: {
    campaignDateIso,
    nextSettlementPeriodIso
  },
  domains: [
    {
      domainId,
      schemaVersion,
      classification: "CAMPAIGN_PERSISTENT",
      recordCount,
      checksum,
      required
    }
  ],
  omittedDomains: [
    {
      domainId,
      classification,
      reason
    }
  ],
  activeOperations: {
    policy: "EXPORT_AND_RESUME",
    count,
    operationIds
  },
  data: {
    [domainId]: {
      schemaVersion,
      state
    }
  }
}
```

Each domain checksum is deterministic FNV-1a over stable-key JSON serialization.

The storage adapter state preserves exact localStorage values:

```js
{
  storage: {
    [storageKey]: {
      present: true,
      value: "exact serialized value"
    }
  }
}
```

An absent key is explicit:

```js
{
  present: false,
  value: null
}
```

This allows exact rollback, including schema markers and absent optional stores.

## Active operation policy

```text
EXPORT_AND_RESUME
```

Non-terminal World Bridge operations are exported together with all required referenced stores and receipts.

Terminal World Bridge statuses:

```text
COMPLETED
FAILED
CANCELLED
```

Every other status is counted as active in the snapshot manifest.

## Export sequence

```text
FLUSH PENDING DOMAIN PERSISTENCE
→ EXPORT ALL CAMPAIGN_PERSISTENT ADAPTERS
→ SUMMARIZE RECORD COUNTS
→ CALCULATE CHECKSUMS
→ RECORD ACTIVE OPERATIONS
→ RETURN SNAPSHOT V6
```

The flush boundary includes available canonical persistence APIs for:

```text
Citizens
ItemInstances
Services
Market carts/orders/stock
Housing reservations
World Bridge operations
World Time scheduler
```

## Import sequence

```text
PARSE
→ MANIFEST VALIDATION
→ REQUIRED DOMAIN CHECK
→ DOMAIN SCHEMA VALIDATION
→ DOMAIN PAYLOAD VALIDATION
→ CHECKSUM / RECORD COUNT VALIDATION
→ FLUSH CURRENT PENDING PERSISTENCE
→ CREATE COMPLETE PRE-IMPORT SNAPSHOT V6
→ PERSIST PRE-IMPORT BACKUP
→ STAGE ALL DOMAINS
→ COMMIT ALL DOMAIN STORAGE STATES
→ VERIFY ALL DOMAIN CHECKSUMS
→ STORAGE RECONCILIATION VALIDATION
→ SET RELOAD WRITE BARRIER
→ RELOAD
→ CANONICAL STARTUP RECONCILIATION
```

No domain business command is called during import.

Import does not:

```text
capture/refund Billing
mutate ItemInstance through physical commands
create Service/Market/World Bridge operations
emit new business notifications
run Planner
build EquipmentState
rebuild CyberGrid
```

## Atomic rollback

Any commit, verification or reconciliation failure performs:

```text
RESTORE EVERY DOMAIN FROM PRE-IMPORT SNAPSHOT
→ VERIFY RESTORED CHECKSUMS
→ RETURN ORIGINAL FAILURE + ROLLBACK RESULT
```

If restore verification fails:

```text
SNAPSHOT_ROLLBACK_FAILED
```

The backup is stored under:

```text
ws_app_last_import_backup_v6
```

The backup key is not included inside campaign snapshots.

## Reload write barrier

Raw storage commit deliberately avoids business commands and in-memory mutation. A page reload is mandatory after successful import/reset.

Before raw commit:

```text
pending persistence timers are flushed/cancelled
```

After successful commit:

```text
CAMPAIGN_DATA_IO_RELOAD_PENDING = true
```

Market pagehide/visibility persistence checks this flag and cannot overwrite imported storage with its stale pre-import in-memory state.

Other deferred stores are flushed before commit, leaving no dirty persistence scheduled for pagehide.

## Reset sequence

```text
FLUSH PENDING PERSISTENCE
→ CREATE COMPLETE PRE-RESET SNAPSHOT V6
→ PERSIST BACKUP
→ REMOVE ALL CAMPAIGN_PERSISTENT STORAGE KEYS
→ SET RELOAD WRITE BARRIER
→ RELOAD CANONICAL SEEDS
```

Reset does not remove:

```text
Snapshot v6 backup
LOCAL_UI_ONLY settings
SEED_ONLY definitions
DERIVED runtime definitions
```

## Error classes

```text
SNAPSHOT_PARSE_FAILED
SNAPSHOT_MANIFEST_INVALID
SNAPSHOT_DOMAIN_UNSUPPORTED
SNAPSHOT_DOMAIN_VALIDATION_FAILED
SNAPSHOT_STAGE_FAILED
SNAPSHOT_COMMIT_FAILED
SNAPSHOT_RECONCILIATION_FAILED
SNAPSHOT_VERIFY_FAILED
SNAPSHOT_ROLLBACK_FAILED
```

Domain-level diagnostics may additionally include:

```text
SNAPSHOT_REQUIRED_DOMAIN_MISSING
SNAPSHOT_DOMAIN_SCHEMA_UNSUPPORTED
SNAPSHOT_DOMAIN_CHECKSUM_MISMATCH
SNAPSHOT_DOMAIN_RECORD_COUNT_MISMATCH
SNAPSHOT_DOMAIN_STORAGE_JSON_INVALID
CAMPAIGN_DATA_STORAGE_KEY_OWNERSHIP_CONFLICT
CAMPAIGN_DATA_SOURCE_FLUSH_FAILED
```

A persistence or domain error is never reported as a JSON parse error.

## Legacy import policy

```text
Snapshot v6 full import
→ supported and atomic

legacy single-domain record array
→ supported through existing domain importer after complete v6 backup

legacy multi-domain campaign snapshot
→ blocked
```

Legacy multi-domain import is blocked because the previous schema does not provide complete domain coverage or atomic rollback metadata.

Pre-alpha policy does not require backward-compatible restoration of incomplete Campaign Snapshot v5 files.

## Terminal state policy

Snapshot v6 includes complete persisted Terminal records:

```text
notification identity
correlationId / operationId
eventCode
revision
dedupeKey
lifecycle
audience
subjectRef / relatedRefs
routeId / entityRef
read
important
folder / trash state
calendar reminders
legacy System Requests
```

Transient renderer state is not persisted by the Terminal store and therefore is not exported:

```text
selected card
active local filter
scroll position
hover/focus state
```

## Acceptance invariants

```text
all registered CAMPAIGN_PERSISTENT domains appear in export
all required domains are present before import
checksums and record counts survive round-trip
stable IDs survive round-trip
active World Bridge operations survive round-trip
late commit failure restores exact pre-import storage
reconciliation failure restores exact pre-import storage
parse and validation errors use distinct codes
import emits no business commands
import creates no duplicate events
successful import/reset requires one reload
```


## Admin Audit Store 3.0x adapter

The required `admin-audit` domain uses schema:

```text
admin_audit_store_3_0x
```

Storage coverage:

```text
ws_admin_audit_store_v2
ws_admin_audit_recovery_v1
futureNoir.adminAuditLog.v1  # migration-only
```

Canonical state is validated through `validateAdminAuditState()` when the eager Audit Store API is available. Snapshot round-trip preserves event IDs, monotonic sequences and recovery records. Campaign import/reset does not emit per-record business events; Data I/O appends one Admin audit outcome after the import/reset transaction returns.
