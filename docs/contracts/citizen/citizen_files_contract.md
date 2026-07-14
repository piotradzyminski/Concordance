# Citizen Files Contract

## Ownership

```text
Citizen profile identity and mechanics  = Citizen Record Store / CitizenCommandAPI
Citizen File documents                  = Citizen File Store
Case investigation records              = Case File Store
Cross-record navigation                 = Database Relations projection
Campaign portability                    = Campaign Data I/O v6 adapter registry
```

`citizen.files[]` is a legacy migration source only. New records are never written back into a Citizen record.

## Canonical record

```js
{
  schemaVersion: 2,
  fileId: "citizen-file-citizen-a-medical-intake",
  id: "citizen-file-citizen-a-medical-intake",
  citizenId: "citizen-a",
  type: "MEDICAL",
  title: "Medical intake",
  status: "ACTIVE",
  summary: "...",
  body: "...",
  date: "2109-02-13",
  accessTags: ["RESTRICTED"],
  tags: ["CLINICAL"],
  relatedCaseFileIds: ["case-file-2109-0001"],
  archived: false,
  revision: 1,
  createdAt: "...",
  updatedAt: "...",
  createdBy: "admin",
  updatedBy: "admin",
  legacyRefs: {}
}
```

## Invariants

```text
one Citizen File document = one stable fileId
one Citizen File document = one required citizenId
Citizen File body is not embedded in the Citizen record
relatedCaseFileIds store stable Case File IDs only
accessTags control read visibility
create/update/archive/restore/delete require Admin
updates may use expectedRevision and reject stale writes
ARCHIVED records are hidden from non-Admin readers
cross-record UI resolves references through Database Relations; it never copies target records
```

## Persistence

```text
records: ws_app_citizen_files_v1
schema:  ws_app_citizen_files_schema
schema value: citizen_files_record_relations_1_0x
```

On first initialization with no canonical storage key, embedded legacy `citizen.files[]` records are migrated once and persisted. Reinitialization reads the canonical store and must not duplicate migrated records. The storage key remains stable across the schema-marker change.

## Public API

```text
initCitizenFileStore()
normalizeCitizenFile(record)
validateCitizenFile(record)
getCitizenFiles(options)
getCitizenFileById(fileId, options)
createCitizenFile(data, options)
updateCitizenFile(fileId, patch, options)
archiveCitizenFile(fileId, options)
restoreCitizenFile(fileId, options)
deleteCitizenFile(fileId, options)
importCitizenFiles(records, options)
resetCitizenFileStore(options)
canAccessCitizenFile(user, record)
canManageCitizenFiles(user)
getCitizenFileDiagnostics()
```

## Campaign Data I/O

Citizen Files are a required `CAMPAIGN_PERSISTENT` domain in Campaign Snapshot v6. Import/export/reset owns the two Citizen File storage keys through one adapter. Snapshot import does not create new records, increment revisions or emit Citizen File business mutations. Stable `fileId`, `citizenId` and `relatedCaseFileIds` values are preserved verbatim.

## UI boundary

`js/citizen-database.js` renders the Citizen Files workspace as a projection of Citizen File Store. Admin UI may create, edit, archive and restore through public store commands. Citizen Database and Case Files remain separate stores and are referenced by stable IDs. Navigation and missing-reference diagnostics are owned by `js/database-relations.js`.
