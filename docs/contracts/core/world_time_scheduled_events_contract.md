# World Time Scheduled Events Contract 2.3x

## Canonical role

```text
js/world-time-scheduled-events.js
```

The module is the campaign-persistent, domain-neutral queue for exact future events driven by Campaign Time.

It stores when an event is due and which registered domain handler owns execution. It does not generate domain content and does not mutate domain records directly.

## Persistent state

```text
ws_world_time_scheduled_events_v1
ws_world_time_scheduled_events_schema
```

Store schema:

```js
{
  schemaVersion: 1,
  schedulerSchemaVersion: "world_time_scheduled_events_2_3x",
  revision,
  lastProcessedTimeIso,
  events: [],
  receipts: []
}
```

Campaign Snapshot v6 includes both keys through the `world-time-scheduled-events` Campaign Data I/O adapter.

## Scheduled event record

```js
{
  eventId,
  idempotencyKey,
  eventType,
  handlerId,
  scheduledAt,
  status,
  revision,
  attemptCount,
  retryCount,
  maxAttempts,
  createdAt,
  updatedAt,
  processingStartedAt,
  executedAt,
  completedAt,
  failedAt,
  cancelledAt,
  processedAtCampaignTime,
  payload,
  metadata,
  lastError,
  result,
  executionKey,
  scheduleSignature
}
```

The queue owns only this scheduling envelope. `payload` contains references or command input required by the owning domain; it must not become another canonical copy of a Citizen, ItemInstance, MarketOrder, ServiceOrder or notification record.

## Status lifecycle

```text
SCHEDULED
  → PROCESSING
  → COMPLETED
  → FAILED

SCHEDULED / FAILED
  → CANCELLED

FAILED
  → SCHEDULED through explicit retry
```

`PROCESSING` is a persisted claim. On reload, an interrupted `PROCESSING` record returns to `SCHEDULED` with:

```text
SCHEDULED_EVENT_INTERRUPTED_RECOVERED
```

The stable execution key is reused so the domain handler can replay safely.

## Public API

```text
scheduleWorldTimeEvent(input)
scheduleWorldTimeEventDuringAdvance(eventOrDetail, input)
getWorldTimeScheduledEvent(eventId)
getWorldTimeScheduledEvents(filters)
cancelWorldTimeScheduledEvent(eventId, options)
rescheduleWorldTimeScheduledEvent(eventId, scheduledAt, options)
retryWorldTimeScheduledEvent(eventId, options)
registerWorldTimeScheduledEventHandler(handlerId, handler, options)
unregisterWorldTimeScheduledEventHandler(handlerId)
processScheduledWorldTimeEvents(options)
reconcileWorldTimeScheduledEvents(options)
getWorldTimeScheduledEventsDiagnostics()
exportWorldTimeScheduledEventsState()
importWorldTimeScheduledEventsState(state, options)
resetWorldTimeScheduledEvents()
```

## Scheduling and idempotency

A command requires:

```text
handlerId
scheduledAt
idempotencyKey or explicit eventId
```

The first successful command creates one event. Repeating the same command returns:

```text
SCHEDULED_EVENT_REPLAY
```

Changing the original handler, event type, timestamp, payload or metadata while reusing the same idempotency key returns:

```text
SCHEDULED_EVENT_IDEMPOTENCY_CONFLICT
```

The original command signature remains immutable even if the event is later rescheduled.

## Campaign Time interval processing

The canonical due interval is:

```text
(previousTimeIso, currentTimeIso]
```

Events are ordered by:

```text
scheduledAt
then eventId
```

The scheduler is invoked from `ws:campaign-time-updated` in a microtask. This allows other synchronous listeners to schedule events for the just-committed skip before due processing begins.

A single processing pass repeatedly reads the queue until no due event remains. Therefore a handler may schedule another event inside the same skipped interval and the new event is executed before the pass ends.

The bounded loop limit is 500 events per pass. Reaching the limit returns:

```text
SCHEDULED_EVENT_PROCESS_LIMIT_REACHED
```

## Handler boundary

Handlers are registered by stable ID:

```js
registerWorldTimeScheduledEventHandler("terminal-message", async (event, context) => {
  // call the Terminal Notification API here
  return { ok: true };
});
```

Handler context includes:

```text
executionKey
idempotencyKey
previousTimeIso
currentTimeIso
scheduledAt
campaignTimeRevision
source
scheduleWorldTimeEvent()
scheduleWorldTimeEventDuringAdvance()
getWorldTimeScheduledEvent()
```

`executionKey` is stable for the same event, handler and scheduled timestamp:

```text
[eventId]::[handlerId]::[scheduledAt]
```

The handler must use this key when invoking an idempotent domain command. The scheduler provides retry-safe at-least-once delivery; the owning domain remains responsible for preventing duplicated business mutation.

A missing handler does not fail or delete the event. The event remains `SCHEDULED` and the pass reports:

```text
SCHEDULED_EVENT_HANDLER_NOT_REGISTERED
```

Registering a handler reconciles overdue events by default. This can be disabled with:

```js
{ reconcileDue: false }
```

## Receipts and replay

A successful execution creates one persistent receipt keyed by `executionKey`.

If a queued event is recovered while its receipt already exists, the scheduler restores `COMPLETED` without invoking the handler again and reports:

```text
SCHEDULED_EVENT_RECEIPT_REPLAY
```

Failed executions do not create success receipts. Explicit retry preserves the same execution key unless the event was intentionally rescheduled.

## Event Windows bridge

The convenience command:

```text
scheduleWorldTimeEventDuringAdvance()
```

uses `World Time Event Windows` to resolve a deterministic timestamp inside the supplied Campaign Time advance, then persists that timestamp as `scheduledAt`.

The queue does not recalculate it on reload.

## Runtime events

```text
ws:world-time-scheduled-events-ready
ws:world-time-scheduled-event-handler-registered
ws:world-time-scheduled-event-updated
ws:world-time-scheduled-event-completed
ws:world-time-scheduled-event-failed
ws:world-time-scheduled-events-processed
```

## Ownership exclusions

This patch does not assign operating hours to organizations or locations.

The scheduler does not own:

```text
Campaign Time mutation
Terminal Inbox content
Market shipment state
Service lifecycle
Housing delivery intake
organization/location calendars
Citizen or ItemInstance mutation
Billing or Subscription commands
domain-specific retry policy
```

Each domain registers a handler and commits through its existing public API.
