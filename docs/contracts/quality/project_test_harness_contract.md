# Project Test Harness Contract 1.2x

## Ownership

```text
scope owner: TEST INFRASTRUCTURE / QUALITY
runtime ownership: unchanged
production storage keys: unchanged
production business APIs: unchanged
```

The harness tests browser-oriented JavaScript without introducing a production bundler, framework or alternate domain implementation.

## Commands

```text
npm run check
npm run test:unit
npm run test:contracts
npm run test:data-io
npm run test:node
npm test
npm run test:e2e
npm run test:e2e:citizen
npm run test:e2e:smoke
npm run test:e2e:world-bridge
npm run test:e2e:critical
```

`npm test` is the mandatory zero-browser gate. Browser E2E is an explicit second gate and requires `@playwright/test` plus a Chromium browser installation.

## Runtime requirements

```text
Node.js >= 20
Node built-in test runner: node:test
Browser E2E: @playwright/test
No production bundler
No production transpiler
```

Node tests have no runtime package dependency. Playwright is a development dependency used only by browser E2E commands. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` may point to a system Chromium binary; Linux fallback paths are detected when present.

## Node test isolation

Browser scripts loaded by Node tests run in isolated `node:vm` contexts. Each test receives:

```text
isolated window
isolated WS_APP
isolated APP_DATA
isolated localStorage/sessionStorage
isolated EventTarget/CustomEvent
fixed campaign clock
seeded deterministic Math.random
controlled timers
```

Node tests must not depend on the developer browser profile, actual campaign storage or execution order of other tests.

## Browser E2E isolation

Playwright runs with one worker and a fresh browser context per test. E2E scenarios use only public runtime APIs and test-session wrappers installed through `page.evaluate()`. Browser fixtures abort non-local network requests so external fonts, analytics or unavailable CDNs cannot block a deterministic local acceptance run.

Allowed test hooks:

```text
wrap an existing public WS_APP command
return a deterministic injected result
count calls to existing public runtime functions
dispatch a documented public CustomEvent
restore the original API after the test
```

The E2E layer does not alter source files, create production storage keys or add runtime-only test branches.

## Browser helper surface

```text
tests/e2e/fixtures.cjs
  Admin and Player login
  post-reload authentication recovery
  public API readiness waits
  fixture Citizen resolution
  single and multi-API failure injection
  public API call counters
  heavy Equipment/CyberGrid runtime counter list
  World Bridge event dispatch
  operation-correlated Terminal entry lookup
  hook restoration after every test
```

## Current Node coverage

```text
CitizenCommandAPI replay
Billing authorize/capture replay and monotonic revisions
ItemInstance Transaction idempotency
Service lifecycle transition guard
Service expectedRevision guard
Market-Service compensation ordering
World Bridge operation replay
World Bridge stale revision guard
World Time START receipt replay
World Time COMPLETE receipt replay
World Bridge notification dedupe by operation/revision
Campaign Snapshot v6 round-trip
Campaign Snapshot v6 active-operation preservation
Campaign Snapshot v6 rollback after late commit failure
Campaign Data I/O readiness
index.html local script integrity
runtime eval/new Function guard
```

## Browser E2E coverage 1.1x

### Authentication smoke

```text
Admin login
Player login
terminal activation
console/pageerror collection
```

### World Bridge contract gate

```text
World Bridge Operation readiness
Cyberware World Bridge readiness
Cyberware stability audit
Cyberware compensation audit
14.2x version assertion
```

### Idempotency and claims

```text
same idempotencyKey + same request
→ one operationId + replay result

second operation claiming the same resource
→ WORLD_BRIDGE_OPERATION_CLAIM_CONFLICT
```

### Reload and retry

```text
RECOVERY_REQUIRED operation persisted
→ browser reload
→ same operationId and revision restored
→ registered recovery handler
→ retryWorldBridgeOperation()
→ COMPLETED with one retry count
```

### Notification projection and performance

```text
one cyberware operationId
→ multiple increasing revisions
→ one Terminal card

same revision replay
→ ignored

status-only notification
→ 0 EquipmentState reads/builds
→ 0 Equipment/CyberGrid renders
→ 0 Equipment/Cyberware workspace invalidations

browser reload
→ one persisted card with the latest revision
```

### Compensation failure and retry

```text
Cyberware PURCHASE_TO_HOUSING compensation
→ missing MarketOrder failure
→ COMPENSATION_REQUIRED / RECOVERY_REQUIRED
→ deterministic Market API overrides
→ retryCyberwareWorldCompensation()
→ CANCELLED + compensation COMPLETED
→ one Terminal card updated to final revision
→ 0 heavy Equipment/CyberGrid runtime calls for non-physical compensation
```

The compensation scenario exercises the production Cyberware World Bridge compensation orchestrator. Test doubles replace only documented Market public API responses for the test session.

## Heavy runtime counter contract

The default status-only/non-physical counter set includes existing public functions when present:

```text
getEquipmentState
getEquipmentRuntimeState
invalidateEquipmentRuntimeState
renderEquipmentModule
renderEquipmentCybergridPanel
renderEquipmentCyberwareWorkspace
refreshEquipmentWorkspace
refreshEquipmentCyberwareWorkspace
invalidateCyberwareWorkspaceRuntime
```

Missing functions are skipped. Existing functions are wrapped and restored without changing their behavior.



## Citizen browser acceptance runner — 2.2x

```text
npm run test:e2e:citizen
```

`scripts/run-citizen-e2e.mjs` executes each Citizen scenario in a separate Playwright process. This isolates browser lifecycle failures observed in constrained distro-Chromium environments. Each scenario has a 90-second process timeout and one timeout retry.

The runner covers:

```text
Character Creator template/rerender/activation navigation
Quick NPC Creator
Citizen Profile Editor save/close
Admin Citizen Editor keyboard navigation/save
Mechanics cards, Discard rerender and Short ID preview
```

`tests/e2e/fixtures.cjs` permits only localhost plus `data:`, `blob:` and `about:` resources. Expected `ERR_BLOCKED_BY_CLIENT` messages from deliberately aborted external requests are excluded from console-error acceptance; all other console and page errors remain failures.


## Required patch gate

Every later patch should run at least:

```text
npm test
```

A patch touching Citizen Creator, Citizen Profile Editor, Admin Citizen Editor, Quick NPC or Citizen navigation should additionally run:

```text
npm run test:e2e:citizen
```

A patch touching World Bridge, Cyberware, Billing, Market, Services, ItemInstance, Scheduler, Notifications, Campaign Data I/O or Equipment invalidation should additionally run:

```text
npm run test:e2e:world-bridge
```

The combined local release smoke is:

```text
npm run test:e2e:critical
```

## Prohibited test accommodations

```text
no changing production semantics only to make a test pass
no alternate production storage keys
no duplicate operation store
no duplicate notification producer
no global test mode suppressing business guards
no direct private-state mutation from E2E
no dependency on real campaign data
no permanent API override after a test
```

## Environment boundary

Playwright execution depends on local package installation and browser binaries. Environments that block localhost or browser launch may run `npm test` but cannot claim browser E2E acceptance. In that case the patch must report E2E as not executed rather than inferred from static checks.
