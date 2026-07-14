# CYBERWARE PLANNER CONTRACT — 8.0x

## Purpose

`js/cyberware-planner.js` is the canonical pre-commit orchestration layer for Cyberware procedures.

Supported operations:

```text
INSTALL
DEINSTALL
REPLACE
```

The planner does not implement a second installation engine. It delegates validation and commit work to the existing canonical modules:

```text
cyberware-rules.js
cyberware-assignment.js
item-instance-store.js
cyberware-runtime.js
```

## Workflow

```text
select operation parameters
-> build derived plan
-> review blockers, warnings, slots, quote, duration and risk
-> confirm using planId
-> rebuild plan from current canonical state
-> reject stale/blocked plan or invoke canonical commit
```

## Planner state

Planner selections are volatile UI state stored in:

```text
window.WS_APP.cyberwarePlannerStates[citizenId]
```

This state is not persisted and is not part of Citizen, ItemState or ItemInstance.

Stored fields:

```text
operation
sourceItemId
targetItemId
primarySlot
surgeryPreset
plan
result
```

## Plan identity and stale-state protection

Every analysis receives a deterministic `planId` derived from:

- operation;
- Citizen ID;
- source and target ItemInstance IDs;
- selected body slot and surgery preset;
- source/target condition, lifecycle, location and compliance state;
- complete installed Cyberware fingerprint.

Confirmation rebuilds the plan from current canonical state. A mismatch returns:

```text
CYBERWARE_PLAN_STALE
```

No commit is attempted after a stale-state rejection.

## INSTALL

Source records come from canonical Equipment ItemInstance views and must pass:

```text
isEquipmentItemCyberwareInstallCandidate()
```

Analysis delegates to:

```text
buildCyberwareInstallCandidateFromEquipmentItem()
buildCyberwareInstallPreview()
```

Confirmation delegates to:

```text
commitCyberwareInstallFromEquipment()
```

The same ItemInstance moves to BODY or SERVICE according to the procedure outcome.

## DEINSTALL

Targets come from canonical installed Cyberware ItemInstance views.

Analysis delegates to:

```text
buildCyberwareDeinstallPreview()
```

Confirmation delegates to:

```text
commitCyberwareDeinstallPlan()
```

Core-stack dependency blockers remain owned by `cyberware-rules.js`.

## REPLACE

Analysis:

1. validates removal of the installed target;
2. creates a preview list without the target;
3. validates installation of the source against the resulting body/core state;
4. combines blockers, warnings, cost and duration.

Confirmation delegates to:

```text
commitCyberwareReplaceFromEquipment()
```

The existing two-ItemInstance batch commit remains the atomic write boundary.

## Quote and duration

`procedureCost` is a preview quote calculated from existing Cyberware procedure rules.

8.0x does not debit Citizen funds and does not create Billing records.

`durationMinutes` is derived by the planner from:

- operation;
- implant scale;
- occupied slot count;
- medical-care mode;
- procedure mode.

It is informational and not yet connected to Calendar, Service or world-time progression.

## Risk

INSTALL and REPLACE display the acceptance/rejection probabilities returned by canonical bio-acceptance rules.

Risk bands:

```text
STANDARD
ELEVATED
HIGH
CRITICAL
BLOCKED
```

DEINSTALL uses `CONTROLLED` when valid because the current removal rules are deterministic.

## UI ownership

`js/cyberware-workspace.js` renders:

- installed Cyberware overview;
- direct Plan Removal / Plan Replace actions;
- operation controls;
- analysis results;
- confirmation/result state.

`css/equipment.css` owns the component layout and visual state.

`js/cyberware-planner.js` binds its own delegated click/change handlers. `js/cyberware-module.js` owns delegated Cyberware UI actions; Equipment actions are not the Cyberware event boundary.

## Explicit non-goals

8.0x does not change:

- ItemState;
- ItemInstance schema;
- CyberGrid mechanics or fast path;
- Cyberware Runtime 7.0x operational-state rules;
- Billing settlement;
- Service orders;
- Calendar/time advancement;
- license/subscription lifecycle mechanics;
- firmware world events.
