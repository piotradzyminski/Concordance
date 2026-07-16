# Cyberware Standalone Module Contract 15.13x

## Purpose

Cyberware is a standalone player module. Equipment owns Cybergrid, carried items, physical equipment placement and Item Index. Cyberware owns installed body-system presentation, Neural Core, diagnostics, planner, maintenance, history and Cyberware Definition Index.

## Module boundary

```text
EQUIPMENT
  CYBERGRID

CYBERWARE
  SYSTEMS
    OVERVIEW
    BODYMAP
    INSTALLED SYSTEMS
  NEURAL CORE
    CORE STACK
    DIAGNOSTICS
  OPERATIONS
    PLANNER
    MAINTENANCE
    HISTORY
  CYBERWARE INDEX
```

`data/modules.js` registers `cyberware` as a separate module. `js/modules.js` owns a dedicated lazy `cyberware` bundle and routes Cyberware deep links to that bundle.

## Runtime files

```text
js/cyberware-module.js
  standalone shell, target Citizen, delegated UI actions and public open helpers

js/cyberware-workspace.js
  workspace composition, view state, selection, summaries and Inspector projection

js/cyberware-index.js
  read-only ItemDefinition catalog projection

js/cyberware-planner.js
  operation planning UI over the existing planner/domain API
```

Equipment does not lazy-load the Cyberware runtime, planner, Definition Index, workspace or a navigation bridge. Cross-module navigation uses the canonical module router and the public Cyberware API owned by the standalone Cyberware module.

## Presentation boundary

```text
Equipment bundle
  css/equipment.css

Cyberware bundle
  css/cyberware.css
  css/cyberware-anatomy-bodymap.css
```

`css/equipment.css` contains no Cyberware selectors and the Cyberware bundle does not load it. `css/cyberware.css` owns all Cyberware domain selectors plus a bounded copy of the neutral Equipment UI primitives still used by Cyberware markup, including shell panels, badges, selects and the definition-index drawer. This presentation reuse does not create shared UI state or transfer domain ownership.

The Cyberware bundle may continue to reuse `js/equipment-render-utils.js` and `js/equipment-items-panel.js` for neutral rendering helpers. Those files do not own Cyberware persistence, selection or workspace state.

## Public navigation API

```text
openCyberwareModule()
openCyberwareForCitizen()
openCyberwareInstance()
openCyberwarePlanner()
openCyberwareMaintenance()
openCyberwareIndex()
```

Equipment integrations use the canonical module router or the public standalone Cyberware API and never switch an Equipment workspace to `CYBERWARE`.

## Deep links

Cyberware notification and World Bridge routes target module id `cyberware`. Supported payloads retain stable Citizen, ItemInstance, operation and leaf-view references.

```text
routeId: CYBERWARE_WORLD_OPERATION | CYBERWARE_INSTANCE
citizenId
entityRef: ITEM_INSTANCE
params.instanceId
params.operationId
params.cyberwareView
```

The retired Equipment workspace compatibility state and the `openEquipmentWorkspace` alias do not exist.

## State ownership

The extraction changes presentation and routing only.

```text
physical state: ItemInstance Store
installed Cyberware: ItemInstance location BODY projection
runtime: Cyberware Runtime
operations: Planner / Maintenance / World Bridge
recovery: World Bridge Operation Store
catalog: canonical Cyberware ItemDefinitions
```

Forbidden:

```text
new Cyberware inventory
new installed-item store
writes to citizen.cyberwareList
second World Bridge orchestrator
direct physical commit from the module shell
```

## Invalidation and performance

- Equipment opening does not load the full Cyberware UI bundle.
- Cyberware opening does not rebuild Equipment or Cybergrid.
- ItemInstance events remain targeted by Citizen and instance IDs.
- Cyberware selection and view changes remain local UI operations.
- Equipment pointermove and same-grid fast paths are unchanged.

## Future work

The standalone module is the required host for the future anatomy Bodymap. That scope may add region drill-down and dedicated Cyberware anchor definitions, but must preserve this module boundary and the canonical ItemInstance/runtime ownership model.
