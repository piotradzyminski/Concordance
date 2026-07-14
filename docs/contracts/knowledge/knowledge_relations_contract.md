# KNOWLEDGE RELATIONS CONTRACT

## Active baseline

```text
relation schema: future-noir.knowledge-relations v2
pack relation schema: stable-id-v2
patch: Knowledge Relation Tabs and Registry Separation 1.1x
```

## Registry boundaries

```text
ENCYCLOPEDIA
  relatedTerms -> ENCYCLOPEDIA

SYSTEM
  relatedTerms -> ENCYCLOPEDIA
  relatedRules -> SYSTEM

SYSTEM INDEX
  relatedEntries -> SYSTEM INDEX
```

System Index must not expose or persist Encyclopedia references. Encyclopedia must not expose or persist System Index references. System rules may still reference glossary terms because the glossary defines player-facing terminology used by mechanics.

## Runtime normalization

Canonical owners:

```text
js/entries-store.js
js/system-store.js
js/knowledge-relations.js
```

Normalization rules:

```text
Encyclopedia: remove relatedRules and relatedEntries
System: remove relatedEntries
System Index: remove relatedTerms, related, and relatedRules
```

Legacy labels remain accepted for allowed fields and are resolved to stable IDs. Forbidden fields are removed rather than adapted.

## UI contract

Related records render as a vertical stack of file-index tabs. Each item has a narrow tab protruding from the left edge beneath the relation surface. The same component is used for:

```text
Encyclopedia RELATED TERMS
System RELATED TERMS
System RELATED RULES
System Index RELATED INDEX ENTRIES
```

System Index must never render `RELATED TERMS`. Its editor must not expose a related Encyclopedia field.

## Import and export

Knowledge Pack schema v3 exports `relationSchema: stable-id-v2`. Import of older packs:

```text
1. normalizes allowed references to stable IDs
2. removes forbidden cross-registry references
3. reports the removal count in preview warnings
4. performs no implicit replacement outside the selected merge mode
```

## Tests

```text
tests/unit/knowledge-relations.test.cjs
tests/contracts/knowledge-relation-tabs.test.cjs
```

## Content preservation boundary

This adapted installation does not copy `data/system-records.js`, Encyclopedia seed records or source-patch prose. Only relation ownership, migration, validation and the shared relation-tab presentation are installed. Current approved project documentation remains authoritative over webapp seed content.
