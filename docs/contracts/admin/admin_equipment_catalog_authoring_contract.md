# Admin Equipment Catalog Authoring Contract 1.0x

## Ownership

`js/equipment-catalog-store.js` remains the canonical read projection for Equipment definitions.

`js/admin-equipment-catalog-authoring.js` owns the administrative authoring overlay:

```text
seed definitions
+ published authoring definitions
→ Equipment Catalog Store projection
```

Drafts never enter the canonical projection. Published authoring definitions replace a seed definition with the same stable ID in the read projection without mutating `data/equipment-catalog.js`.

## Store

```text
localStorage: ws_admin_equipment_catalog_authoring_v1
schema: admin_equipment_catalog_authoring_1
```

Record states:

```text
DRAFT
PUBLISHED
PUBLISHED_WITH_DRAFT
ARCHIVED
```

Each record contains stable `definitionId`, revision, optional draft, optional published definition, timestamps and last actor.

## Command requirements

Every mutation requires:

```text
actorRole = ADMIN
operatorNote
idempotencyKey
expectedRevision
```

Commands:

```text
saveAdminEquipmentDefinitionDraft
publishAdminEquipmentDefinition
archiveAdminEquipmentDefinition
restoreAdminEquipmentDefinition
discardAdminEquipmentDefinitionDraft
```

Commands are revisioned and idempotent. Reusing a key with another command signature returns `EQUIPMENT_CATALOG_AUTHORING_IDEMPOTENCY_CONFLICT`.

## Definition validation

Minimum validation covers:

```text
stable ID: eqcat-...
name
category
item type
footprint
condition
value
container grid shape
ID collision
```

The authoring definition is normalized through the canonical Equipment Catalog normalizer.

Stable ID policy:

```text
Create / Duplicate → a new ID may be entered
Edit / Edit Draft → the existing stable ID is read-only
```

Create mode cannot shadow a seed or published definition. Reusing an existing ID without an explicit matching `sourceDefinitionId` returns `EQUIPMENT_DEFINITION_ID_DUPLICATE`.

## Instance preview

`previewAdminEquipmentDefinitionInstance()` creates only a transient view model. It must never call ItemInstance create/update APIs or persist an instance.

## Lifecycle

Archive hides an authored definition from the active catalog projection while retaining its stable ID and authored record. Restore returns the same definition. No hard delete is implemented by this patch.

## Data pack

```text
equipment_catalog_authoring_pack_1
```

The Equipment pack contains canonical published definitions, aliases and optionally authoring records/drafts. It is separate from runtime ItemInstance and Campaign Snapshot data.

## UI integration

Equipment authoring extends the existing lazy `CATALOG MANAGEMENT` workspace. No separate Admin workspace or duplicate navigation entry is created.

## Non-goals

- direct repository file writes;
- ItemInstance creation;
- Cyberware or Service authoring;
- Market offer generation;
- Campaign Snapshot schema changes;
- Equipment Editor runtime redesign.
