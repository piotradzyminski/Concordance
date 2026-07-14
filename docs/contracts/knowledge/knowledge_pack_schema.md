# KNOWLEDGE PACK SCHEMA

## Active runtime

```text
patch: Knowledge Content Pack Rebase 1.2x
runtime baseline: Parallel Scope Merge 14.4x
campaign transport: Campaign Snapshot schema v6
knowledge transport: future-noir.knowledge-pack v1
```

This document is the canonical content-pack contract after the rebase.

## Contract

```text
schema: future-noir.knowledge-pack
schemaVersion: 1
```

The Knowledge Pack is a content-only transport and persistence boundary for:

```text
Encyclopedia
System
System Index
```

It is independent from application patch/version identifiers and campaign/runtime schemas.

Excluded domains:

```text
Citizen Database
Citizen Files
Case Files
citizens
ItemInstances
Equipment
Cyberware runtime
Billing
Service
Subscriptions runtime
Terminal runtime
users/access control
```

## Canonical payload

```json
{
  "schema": "future-noir.knowledge-pack",
  "schemaVersion": 1,
  "packId": "future-noir-main",
  "packVersion": "1.0.0-local",
  "updatedAt": "2026-07-12T00:00:00.000Z",
  "encyclopedia": [],
  "system": [],
  "systemIndex": []
}
```

## Registry ownership

### `encyclopedia`

Player-facing glossary records. Canonical runtime owner:

```text
js/entries-store.js
```

Required transport field:

```text
id
```

### `system`

Dry rules/mechanics records. Canonical runtime owner:

```text
js/system-store.js
registry = system
```

Required transport field:

```text
id
```

### `systemIndex`

Approved propaganda/civic records. Canonical runtime owner:

```text
js/system-store.js
registry = system-index
```

Required transport field:

```text
id
```

The importer forces the canonical registry value for `system` and `systemIndex` arrays.

## Version boundaries

```text
application/cache version
!= campaign schema version
!= Knowledge Pack schemaVersion
!= packVersion
```

`schemaVersion` defines payload compatibility. Runtime supports version `1`.

`packVersion` is author-controlled content metadata. It does not gate application startup.

Newer unsupported `schemaVersion` values are rejected without modifying runtime data.

Version `0`/legacy payloads with recognizable `entries`, `systemRecords`, `system`, or `systemIndex` arrays are migrated in memory to version `1` before validation.

## Import modes

### MERGE — default Knowledge Pack mode

Merge key:

```text
registry + id
```

Rules:

```text
incoming new ID -> add
incoming existing ID -> incoming record replaces current record
current ID absent from incoming pack -> preserve current record
archived: true -> preserve record as archived
explicit tombstone -> remove matching current ID
```

Accepted explicit tombstone flags:

```json
{
  "id": "record-id",
  "tombstone": true
}
```

Compatibility aliases:

```text
_delete: true
deleted: true
```

### REPLACE

Available through the store API for controlled tooling. Each registry is replaced by the validated incoming registry after tombstone removal.

The Data I/O Knowledge Pack action uses MERGE.

## Validation

Import is blocked when:

```text
payload is not an object
schema is unsupported
schemaVersion is newer than runtime support
registry is not an array
record is not an object
record has no stable id
duplicate id exists inside one incoming registry
```

Validation and import preview run before confirmation and before any mutation.

## Backups

Knowledge Pack import creates:

```text
full campaign pre-import backup
content-only Knowledge Pack pre-import backup
```

Content backup localStorage key:

```text
ws_app_knowledge_pack_backup_v1
```

Pack metadata localStorage key:

```text
ws_app_knowledge_pack_meta_v1
```

The Data I/O dialog can download the most recent content-only backup.

## Registry persistence compatibility

Legacy registry payloads remain in their established storage keys:

```text
ws_app_entries_v1
ws_app_system_records_v1
```

Schema marker values are stable content contracts:

```text
future-noir.knowledge.encyclopedia.v1
future-noir.knowledge.system-records.v1
```

Store startup reads valid legacy arrays even when the previous schema marker contains an application patch identifier. The data is normalized and the marker is migrated in place. Patch version changes no longer discard valid Knowledge records.

Legacy keys are not deleted by migration.

## Public API

```text
WS_APP.exportKnowledgePack(options?)
WS_APP.validateKnowledgePack(payload)
WS_APP.previewKnowledgePackImport(payload, { mode })
WS_APP.importKnowledgePack(payload, { mode })
WS_APP.isKnowledgePackPayload(payload)
WS_APP.getKnowledgePackMeta()
WS_APP.setKnowledgePackMeta(patch)
WS_APP.createKnowledgePackBackup(reason?)
WS_APP.getKnowledgePackBackup()
WS_APP.mergeKnowledgeRegistry(current, incoming, mode)
```

Store import APIs accept an optional mode:

```text
WS_APP.importEntries(records, { mode: merge|replace })
WS_APP.importSystemRecords(records, { mode: merge|replace })
```

## Events

```text
ws:entries-updated
ws:system-records-updated
ws:knowledge-pack-updated
```

Local record mutations mark the active pack metadata as `dirty: true`.

Successful pack import writes imported metadata and sets `dirty: false`.

Successful SAVE PACK or SAVE COPY clears the local dirty marker only after a write/download payload is produced successfully.

## Deferred scope

Not implemented:

```text
per-record conflict choice/partial merge
separate local draft layer
cross-file pack dependency graph
GM/BLACK archive pack
Campaign Pack
```

## External workspace — active workspace contract

The runtime can bind the active Knowledge Pack to one external JSON file when the browser exposes the File System Access API.

Workspace handle storage:

```text
IndexedDB database: ws_app_knowledge_workspace_v1
object store: handles
key: active
```

The file handle is browser-local state. It is not embedded in the Knowledge Pack payload, campaign export, localStorage metadata, or patch files.

Workspace states:

```text
LOCAL
CONNECTED / permission granted
CONNECTED / permission prompt required
CONNECTED / permission denied
```

Workspace commands:

```text
CONNECT PACK
- select external pack
- read and validate payload
- build detailed merge preview
- import only after explicit APPLY MERGE
- persist selected handle after successful import

SAVE PACK
- require active file handle
- request read/write permission when needed
- write current Encyclopedia + System + System Index payload atomically through createWritable()
- clear dirty marker only after writable.close() succeeds

SAVE COPY
- select a new target file
- write current pack
- make the new file the active workspace
- fallback to JSON download when File System Access API is unavailable

DISCONNECT
- remove persisted handle
- preserve all local Knowledge records and metadata
```

Restoring a handle does not silently import file contents. The handle is restored as a write target only. Re-reading another file still requires CONNECT PACK and import preview.

## Detailed preview contract

`WS_APP.previewKnowledgePackImport()` retains count fields and now also returns per-record detail:

```text
registries.<registry>.conflicts
registries.<registry>.changes.added[]
registries.<registry>.changes.updated[]
registries.<registry>.changes.removed[]
registries.<registry>.changes.unchanged[]
registries.<registry>.changes.ignoredTombstones[]
```

Updated records include:

```json
{
  "id": "stable-record-id",
  "label": "Incoming display label",
  "currentLabel": "Current display label",
  "changedFields": ["body", "relatedTerms", "summary"]
}
```

`updated` records are merge conflicts in UI terminology because the incoming record replaces the current record with the same stable ID. The merge rule itself remains deterministic and unchanged.

## Workspace metadata

Additional fields in `ws_app_knowledge_pack_meta_v1`:

```text
lastSavedAt
lastExportedAt
```

`dirty` means local registries differ from the last successful import/save/export snapshot. It does not indicate a campaign-data change.

## Workspace API

```text
WS_APP.getKnowledgePackWorkspace()
WS_APP.restoreKnowledgePackWorkspace()
WS_APP.pickKnowledgePackWorkspaceFile()
WS_APP.activateKnowledgePackWorkspace(handle, options?)
WS_APP.disconnectKnowledgePackWorkspace()
WS_APP.saveKnowledgePackWorkspace()
WS_APP.saveKnowledgePackCopy()
WS_APP.renderKnowledgePackIndicator(options?)
WS_APP.syncKnowledgePackIndicators()
```

Additional events:

```text
ws:knowledge-pack-workspace-updated
ws:knowledge-pack-saved
```

## Browser fallback

When File System Access API is unavailable:

```text
CONNECT PACK -> hidden JSON file input + merge preview
SAVE COPY -> standard JSON download
SAVE PACK -> unavailable because there is no writable connected handle
```

The content schema, stable-ID merge, backups and local persistence remain available in fallback mode.
