# Database Record Relations Contract

## Scope

The Database relation layer connects three existing record owners without creating another persistence store:

```text
Citizen Database record  = Citizen Record Store
Citizen File document     = Citizen File Store
Case File record          = Case File Store
Relation graph            = read-only Database Relations projection
```

## Stable references

```text
Citizen File.citizenId               -> Citizen.id
Citizen File.relatedCaseFileIds[]     -> Case File.id
Case File.relatedCitizens[]           -> Citizen.id
Case File.relatedCitizenFileIds[]     -> Citizen File.fileId
```

`citizenFileIds` is accepted only as a legacy input alias for `relatedCitizenFileIds` during Case File normalization.

## Projection rules

- Direct references remain owned by their source record.
- Navigation resolves the union of direct and inbound links.
- A one-sided valid link remains navigable and is reported as a reciprocal-link warning.
- A reference to a missing record is an error.
- Relation projection never copies Citizen, Citizen File or Case File data into another record.
- Access checks are applied before a related target is returned to the UI.
- Archived Citizen Files are excluded unless the caller explicitly requests them and has access.

## Public API

```text
normalizeDatabaseRelationIds(value)
getCitizenRecordRelations(citizenId, options)
getCitizenFileRelations(fileId, options)
getCaseFileRelations(caseFileId, options)
getDatabaseRecordRelationDiagnostics()
```

Schema marker:

```text
database_record_relations_1_0x
```

## UI navigation

Citizen profiles, Citizen File documents and Case File records may open related records through the public renderers. Cross-record transitions carry an explicit return callback so the originating filtered/list context can be restored. Renderers must not mutate relation arrays while opening a target.

## Diagnostics

Errors:

```text
DATABASE_RELATION_CITIZEN_MISSING
DATABASE_RELATION_CITIZEN_FILE_MISSING
DATABASE_RELATION_CASE_FILE_MISSING
```

Warnings:

```text
DATABASE_RELATION_RECIPROCAL_CASE_LINK_MISSING
DATABASE_RELATION_RECIPROCAL_FILE_LINK_MISSING
```

Warnings do not block navigation because the resolver uses inbound links. Errors identify broken stable references and require record correction.

## Campaign Data I/O

Campaign Snapshot v6 preserves the source records and their stable references. The relation graph itself is not serialized because it is a deterministic projection rebuilt after domain import.
