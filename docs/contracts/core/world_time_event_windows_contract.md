# World Time Event Windows Contract 2.2x

## Canonical role

```text
js/world-time-event-windows.js
```

The module is a stateless Campaign Time policy resolver. It converts one committed forward time advance into a deterministic minute for a future domain event.

It does not create messages, deliveries, ServiceOrders, Market shipments or organization records.

## Primary use case

A Campaign Time advance:

```text
10:00 → 13:00
```

may produce a synthetic event timestamp inside the skipped interval:

```text
10:01–12:59
```

The result is deterministic for the same stable event identity, advance interval and policy. A consumer must persist the resolved timestamp on its own canonical record. Re-rendering an Inbox or reopening a module must never resolve a new timestamp for an already-created event.

## Public API

```text
resolveEventTimeWithinAdvance(input)
resolveEventTimeFromCampaignEvent(eventOrDetail, options)
getOperatingWindowsWithinAdvance(input)
isWithinOperatingHours(timeIso, operatingHours)
normalizeWorldTimeEventPolicy(policy)
normalizeOperatingHours(operatingHours)
```

Runtime metadata:

```text
WORLD_TIME_EVENT_WINDOWS_SCHEMA_VERSION
WORLD_TIME_EVENT_POLICY_TYPES
```

## Stable identity

Randomized policies require one stable value:

```text
eventId
idempotencyKey
seed
eventKey
```

Missing identity returns:

```text
EVENT_TIME_STABLE_KEY_REQUIRED
```

The resolver does not use `Math.random()` or browser wall-clock time. It derives a deterministic slot from the stable identity, original advance interval and normalized policy.

## Advance boundaries

Default randomized behavior uses `INTERIOR` boundaries:

```text
previous Campaign Time minute excluded
current Campaign Time minute excluded
```

Therefore:

```text
10:00 → 13:00
```

has 179 candidate minutes:

```text
10:01 ... 12:59
```

Available boundary modes:

```text
INTERIOR  previous and current boundary minutes excluded
DUE       previous excluded, current included
CLOSED    both boundary minutes included
```

Exact due events use `DUE` behavior.

## Policies

### ANYTIME

Selects one deterministic minute inside the allowed advance interval.

```js
{
  type: "ANYTIME"
}
```

### WINDOWED

Intersects the advance interval with one or more recurring daily windows.

```js
{
  type: "WINDOWED",
  windows: [
    { start: "06:00", end: "20:00" }
  ]
}
```

### BUSINESS_HOURS

Intersects the advance interval with a weekly operating calendar.

```js
{
  type: "BUSINESS_HOURS",
  operatingHours: {
    monday: [{ start: "07:00", end: "15:00" }],
    tuesday: [{ start: "07:00", end: "15:00" }],
    wednesday: [{ start: "07:00", end: "15:00" }],
    thursday: [{ start: "07:00", end: "15:00" }],
    friday: [{ start: "07:00", end: "15:00" }]
  }
}
```

### EXACT

Resolves a fixed full timestamp or recurring UTC campaign clock time when it becomes due inside `(previousTime, currentTime]`.

```js
{
  type: "EXACT",
  at: "12:30"
}
```

### NEXT_AVAILABLE

Uses windows or operating hours. If no allowed minute exists inside the advance, the resolver selects a deterministic minute in the next available window and returns:

```text
status: DEFERRED
withinAdvance: false
deferred: true
```

This policy is appropriate for deliveries, offices and providers that cannot complete an operation while closed.

### IMMEDIATE

Uses the current Campaign Time minute. It is deterministic without a random identity and is intended only for events that explicitly occur at the end of an advance.

## Operating hours

A schedule may define `daily` hours or per-day hours.

```js
{
  daily: [{ start: "06:00", end: "20:00" }]
}
```

```js
{
  monday: [{ start: "07:00", end: "15:00" }],
  saturday: [{ start: "08:00", end: "12:00" }],
  sunday: []
}
```

Overnight windows are supported:

```js
{
  daily: [{ start: "16:00", end: "02:00" }]
}
```

`00:00 → 24:00` represents a full open day. Equal start and end values are invalid rather than implicitly 24-hour.

## Result shape

Resolved event:

```js
{
  ok: true,
  status: "RESOLVED",
  reason: "EVENT_TIME_RESOLVED_WITHIN_ADVANCE",
  eventTimeIso: "2109-02-13T11:37:00.000Z",
  scheduledAt: "2109-02-13T11:37:00.000Z",
  withinAdvance: true,
  deferred: false,
  candidateMinutes: 179,
  selectedRange: {
    startTimeIso,
    endTimeIso,
    sourceWindows
  },
  resolutionKey
}
```

Deferred event:

```js
{
  ok: true,
  status: "DEFERRED",
  reason: "EVENT_TIME_DEFERRED_TO_NEXT_WINDOW",
  scheduledAt,
  withinAdvance: false,
  deferred: true,
  nextWindow
}
```

## Campaign Time integration

Consumers should call:

```js
resolveEventTimeFromCampaignEvent(event, {
  eventId,
  policy
})
```

from their own `ws:campaign-time-updated` listener. The listener owns only domain-specific event creation. It must persist the returned timestamp and enforce its own idempotency.

Terminal Inbox provides the convenience boundary:

```js
TerminalNotifications.emitDuringCampaignAdvance(event, input)
```

It persists a resolved within-advance timestamp on notification record v3. A deferred result is returned to the source domain without creating an Inbox entry.

## Ownership boundaries

The resolver owns:

```text
policy normalization
operating-window calculations
deterministic minute selection
next-window deferral calculation
```

The resolver does not own:

```text
Terminal Inbox persistence
Notification lifecycle
Market shipment state
Housing delivery intake
Service lifecycle
organization/provider records
Campaign Time mutation
Campaign Data I/O state
```

There is no resolver persistence adapter because the module is stateless. Persisted domain records remain the source of truth for an already-resolved event time.
