# Cyberware Interaction Performance Contract 12.3x

## Scope

This contract covers the remaining synchronous Cyberware interaction hot paths after Planner Performance 12.2x:

```text
Maintenance selection/execution
Diagnostics scan/history refresh
firmware update
Planner commit persistence
ItemInstance read projection
Cyberware overview authorization projection
```

It does not change Cyberware mechanics, Runtime formulas, ItemInstance schema, anatomy, authorization rules, service outcomes or CyberGrid placement.

## ItemInstance view cache

`js/item-instance-store.js` owns a transient cache for canonical `ItemInstance` view projections.

Cache identity:

```text
instanceId
+ ItemInstance Store revision
+ Equipment catalog revision
```

Rules:

```text
canonical store reads may use the cache
returned views remain cloned/mutable for consumers
store mutation clears the cache
catalog revision change clears the cache
transient/noncanonical objects are not cached
no cache data is persisted
```

## Maintenance projection

`js/cyberware-maintenance.js` owns one transient serviceable-Cyberware projection per Citizen and combined store/catalog revision.

A plain change of:

```text
selected ItemInstance
operation type
panel feedback
```

must not rescan all Citizen ItemInstances.

A store or catalog revision rebuilds the projection once.

The projection creates each ItemInstance view once and classifies it using `isCyberwareView()`. It must not call `isCyberwareInstance()` and then create the same view again.

## Maintenance diagnostic reuse

A `DIAGNOSTIC` Maintenance operation receives/reuses the cached Cyberware workspace Runtime when available.

One quote/execution cycle owns one diagnostic snapshot. The snapshot is reused for:

```text
quote warning/status
maintenance.lastDiagnostic
serviceHistory entry
```

## Diagnostics scan

One `Run Diagnostic Scan` action performs one full diagnostics resolver pass.

After Citizen history is updated, the existing diagnostics result receives only the new normalized history. The resolver is not executed again solely because history changed.

The `ws:cyberware-diagnostics-updated` event carries the precomputed diagnostics model. The mounted panel renders that model directly.

## Deferred ItemInstance persistence

Cyberware operations may commit the canonical in-memory snapshot immediately while deferring only serialization/localStorage I/O.

Default deferred operations in 12.3x:

```text
Planner INSTALL / DEINSTALL / REPLACE
Maintenance operations
firmware updates from Cyberware UI
```

Still synchronous:

```text
full invariant validation
canonical store replacement
snapshot revision increment
cache invalidation
domain update events
```

Deferred:

```text
JSON.stringify(snapshot)
localStorage.setItem(...)
```

The existing debounce/idle writer remains canonical. Pending writes flush on `pagehide` and when document visibility becomes hidden.

## Refresh ownership

Maintenance domain events mark the mounted Maintenance panel dirty. They do not synchronously rebuild the panel.

The initiating UI action owns the single post-operation refresh after it stores feedback and invalidates Runtime.

Diagnostics events may refresh the mounted panel once using their precomputed model.

## Authorization overview

One Cyberware overview render builds one authorization summary. Per-item cards consume `summary.states` by `instanceId`; they do not independently resolve authorization again.

## Preserved contracts

Unchanged:

```text
ItemInstance schema and identity
ItemState model
CyberGrid direct same-grid commit
container placement and drag/drop
Planner rules and stale-plan validation
Runtime/Core Stack formulas
Authorization semantics
Diagnostics classifications
Maintenance costs/outcomes/history
workspace lazy mounting and local switching
```
