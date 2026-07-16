# KNOWLEDGE RELATIONS CONTRACT

## Active baseline

```text
relation schema: future-noir.knowledge-relations v2
pack relation schema: stable-id-v2
patch: Knowledge Relation Index Layout 2.0
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

## Desktop relation sidecar presentation

At viewport widths `>= 1280px`, visible same-registry relation blocks may render in a sibling `.knowledge-related-sidecar` rail. Below that breakpoint they remain in normal document flow. This is a presentation-only rule: it does not alter relation IDs, registry ownership, migration, visibility policy or Knowledge Pack content.

The sidecar must never make Encyclopedia relations visible inside System Index, or System Index relations visible inside Encyclopedia. Source-patch content is not authoritative and must not be imported as part of the UI layout change.

## Deterministic relation index layout

At desktop width the relation UI is a two-column grid owned by `.knowledge-record-layout--with-sidecar`:

```text
184px relation column | unchanged article column
```

The wrapper expands `184px` to the left and uses a matching negative outer margin, so the article remains in its existing position. The sidecar is normal-flow grid content rather than an absolutely positioned layer.

Desktop presentation requirements:

```text
layout: explicit 184px + article grid columns
sidecar: static grid item, no negative stacking layer
article: unchanged horizontal position
all tabs: 226px × 68px
visible tab viewport: 168px
concealed tab section: 58px
mask boundary: deterministic overflow clipping at the outer article edge
connector lines: none
relation heading: retained without a background strip
title label: dedicated wrapper with balanced multi-line wrapping
hover/focus: no geometry or length change
```

The `168px` tab viewport preserves the accepted 1.6x article-edge mask. The grid relation column remains `184px` wide because the Knowledge record sits inside the `16px` `.module-detail` content inset. The final `16px` of the relation column corresponds to that inset; clipping the tab list at `168px` aligns the visible tab end with the outer article boundary.

The implementation must not use:

```text
position: absolute for the desktop sidecar
z-index: -1
isolation: isolate for occlusion
clip-path masking
!important wrapping overrides
article background or box-shadow as a masking surface
```

This remains strictly presentational. It does not change stable relation IDs, registry ownership, migration, visibility policy, seed records or the canonical SYSTEM / ENCYCLOPEDIA / SYSTEM INDEX split.
