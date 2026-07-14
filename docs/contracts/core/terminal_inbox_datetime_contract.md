# Terminal Inbox Datetime Contract 1.0x

## Canonical ownership

```text
Terminal Entry Store
= persistence, migration, ordering and lifecycle timestamps

Notification API
= validated notification emission and Campaign Time advance projection

Terminal Inbox UI
= date/time presentation only

Campaign Time Event Windows
= stateless selection of a deterministic minute inside an advance
```

Terminal Inbox does not own Campaign Time and does not advance it.

## Notification record v3

Every normalized Terminal Inbox entry uses:

```text
schemaVersion: 3
occurredAt
createdAt
sentAt
receivedAt
readAt
```

All timestamp fields are UTC-normalized ISO strings:

```text
YYYY-MM-DDTHH:mm:ss.sssZ
```

Meaning:

```text
occurredAt = time of the source-domain event
createdAt  = time the notification record was created
sentAt     = time the provider/system dispatched the message
receivedAt = time the message entered the Citizen Inbox
readAt     = first current read-state timestamp; empty while unread
```

For ordinary immediate notifications the first four timestamps may be identical.

## Campaign Time boundary

New notifications without explicit timestamps use the current canonical Campaign Time. Browser wall-clock time is only a last-resort fallback when Campaign Time is unavailable during isolated test/bootstrap execution.

Lifecycle actions use Campaign Time:

```text
mark read
acknowledge
resolve
expire
archive
```

`readAt` is synchronized between the top-level record and `lifecycle.readAt`.

## Legacy migration

Date-only records migrate as:

```text
YYYY-MM-DD
→ YYYY-MM-DDT00:00:00.000Z
```

The migration preserves `id`, `citizenId`, revision, event identity, folder and user flags. Normalized v3 records are written back to `ws_app_terminal_entries_v1` on first store read.

## Ordering and UI

Inbox ordering uses the first available timestamp in this order:

```text
receivedAt
sentAt
createdAt
occurredAt
```

The player-facing footer renders:

```text
DD.MM.YYYY / HH:MM / PROVIDER
```

Admin technical details expose occurred, created, sent, received and read timestamps.

## Emission during Campaign Time advance

Public API:

```js
TerminalNotifications.emitDuringCampaignAdvance(campaignEvent, input)
WS_APP.emitNotificationDuringCampaignAdvance(campaignEvent, input)
```

Required stable identity:

```text
eventId
or idempotencyKey
or dedupeKey
or correlationId
```

Default policy:

```js
{ type: "ANYTIME" }
```

Example:

```js
TerminalNotifications.emitDuringCampaignAdvance(event, {
  citizenId: "citizen-a",
  eventCode: "SYSTEM.NOTICE",
  eventId: "message-001",
  revision: 1,
  timePolicy: { type: "ANYTIME" }
});
```

For a `10:00 → 13:00` advance, the Event Windows resolver may select a stable minute from `10:01–12:59`. The resolved timestamp is written into the notification record and is not recalculated on reload.

A replay with the same event identity and revision uses the existing Notification dedupe/revision contract and does not create another message.

## Deferred policy result

If the supplied policy returns a future `NEXT_AVAILABLE` timestamp outside the current advance, the API returns:

```js
{
  ok: true,
  operation: "DEFERRED",
  emitted: false,
  scheduledAt
}
```

Terminal Inbox does not persist a deferred queue in this patch. The owning domain must keep the future schedule and emit after it becomes due.

## Campaign Data I/O

`ws_app_terminal_entries_v1` remains the sole persisted Inbox key and is exported/imported by Campaign Snapshot v6. Import uses the same normalizer and preserves stable IDs plus v3 timestamps.

## Ownership exclusions

This patch does not add:

```text
organization operating-hour records
delivery scheduling
message transport delay simulation
a deferred Inbox queue
automatic domain-message generators
Campaign Time mutation
```
