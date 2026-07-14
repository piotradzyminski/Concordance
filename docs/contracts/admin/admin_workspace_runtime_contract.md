# Admin Workspace Runtime 4.0x Contract

## Scope

This contract owns Admin Control Center shell persistence, workspace registry, deferred workspace dependency loading and region-level rendering.

It does not own business-domain mutation, Admin Audit event semantics, Citizen/ItemInstance lifecycle, Billing, Service, Market, Housing, Subscriptions or World Bridge operations.

## Runtime owners

```text
js/admin/admin-workspace-registry.js
  canonical Admin workspace definitions
  workspace -> lazy bundle relation

js/admin/admin-workspace-loader.js
  workspace bundle state
  one in-flight load per workspace
  failure and explicit retry

js/admin/admin-shell.js
  persistent Command Band
  persistent Navigation Rail
  Workspace region replacement
  Inspector region replacement
  aria-busy and live-region state
  focus and viewport restoration after region replacement

js/admin-control.js
  shared renderer context
  Admin commands and delegated action bindings
  compatibility entrypoint for renderAdminControlCenter()

js/admin/workspaces/admin-workspace-*.js
  one canonical renderer per workspace
  renderer registration through AdminWorkspaceRegistry
  no independent persistence or business-domain mutation
```

## Persistent shell invariant

The following nodes remain mounted while Admin workspaces change:

```text
.admin-command-band
.admin-navigation-rail
.admin-control-center
```

The following regions may be replaced:

```text
[data-admin-shell-workspace]
[data-admin-shell-inspector]
[data-admin-shell-header]
```

`renderAdminControlCenter()` must call `AdminShellRuntime.render()` and must not replace `#module-grid` after the shell has mounted.

## Deferred dependency bundles

Admin login loads only:

```text
css/admin-control.css
js/admin/admin-shell.js
js/admin/admin-workspace-registry.js
js/admin/admin-workspace-loader.js
js/admin-control.js
js/admin/workspaces/admin-workspace-dashboard.js
```

Workspace-specific runtime:

```text
Citizens
  data/equipment-catalog.js
  js/equipment-catalog-store.js
  js/equipment-render-utils.js
  js/equipment-store.js
  js/equipment-inventory.js
  js/equipment-housing-grid.js

Service
  data/service-database.js
  js/service-requirements.js
  js/service-offer-generator.js
```

Full Equipment and Cyberware presentation/runtime bundles remain owned by their existing module routes and are not loaded by the Admin Dashboard.

## Renderer registration invariant

`AdminWorkspaceRegistry` owns renderer registration and lookup. `admin-control.js` must resolve the active renderer through the registry instead of a central workspace switch.

```text
dashboard    base Admin bundle
citizens     admin-workspace-citizens
tags-access  admin-workspace-tags-access
subscriptions admin-workspace-subscriptions
service      admin-workspace-service
billing      admin-workspace-billing
system-requests admin-workspace-system-requests
records      admin-workspace-records
audit        admin-workspace-audit
data-settings admin-workspace-data-settings
```

A lazy bundle is `READY` only when its script load resolves and the matching renderer has been registered. Missing registration is an explicit `ADMIN_WORKSPACE_RENDERER_NOT_REGISTERED` failure and may be retried through the existing loader. Renderer modules consume the shared Admin context and do not own domain persistence.

## Loading state

A workspace with a deferred bundle uses:

```text
IDLE -> LOADING -> READY
IDLE -> LOADING -> FAILED
FAILED -> explicit RETRY -> LOADING
```

Only the current Admin render sequence may replace the loading state after an asynchronous bundle finishes. A resolved stale request must not navigate the operator back to an older workspace.

## Event binding invariant

Persistent navigation buttons use a binding marker and must not accumulate duplicate listeners across region renders.

The root record-selection delegation is installed once per `#module-grid` container through:

```text
data-admin-record-delegation-bound="true"
```

Dynamic workspace controls are replaced with their workspace region and may be rebound after each region render.

## Citizen Context

The global Admin Citizen Context is the only selector controlling Billing target state.

Billing workspace renders a read-only `OPERATING ON` summary. It must not render a second local Citizen selector.

## Accessibility

Admin shell must provide:

```text
aria-current="page" on the active workspace
aria-busy on shell/workspace during deferred loading
aria-live polite region for workspace transitions
focus restoration to the previous semantic control when possible
fallback focus inside the newly selected workspace
```

## Performance baseline

Before 4.0x, the Admin base bundle listed 39 scripts and approximately 1,861,985 source bytes.

After 4.0x, the Admin base bundle lists 4 scripts and approximately 282,421 source bytes.

Approximate deferred source reduction at Admin Dashboard entry:

```text
1,579,564 bytes
84.8%
```

This is a source-size comparison. It is not a browser network benchmark and does not include compression, cache state or eager scripts already loaded by `index.html`.

## Forbidden regressions

```text
Dashboard loading Equipment/Cyberware module UI
workspace change replacing the entire #module-grid
persistent Navigation Rail listener duplication
stale async workspace load changing active workspace
Billing rendering a second Citizen Context selector
workspace loader mutating domain data
central admin-control workspace renderer switch
lazy bundle marked READY without renderer registration
```
