# Campaign Time Datetime Contract 2.0x

## Canonical owner

```text
js/main.js
```

Campaign Time is one campaign-persistent UTC-normalized timestamp. The default clock is midnight.

```text
2109-02-13T00:00:00.000Z
```

The canonical timestamp is not wall-clock time and is never advanced by browser timers.

## Persistent state

```text
ws_app_campaign_time_iso_v1
ws_app_campaign_time_revision_v1
ws_app_campaign_time_receipts_v1
```

Compatibility projections remain persisted:

```text
ws_app_campaign_date_iso_v1
ws_app_next_settlement_period_iso_v1
```

A campaign containing only `ws_app_campaign_date_iso_v1` migrates once by appending midnight:

```text
YYYY-MM-DD
→ YYYY-MM-DDT00:00:00.000Z
```

The migration does not fabricate another date, settlement or business event.

## Runtime projections

Canonical:

```text
WS_APP.CAMPAIGN_TIME_ISO
WS_APP.CAMPAIGN_TIME_REVISION
```

Derived compatibility fields:

```text
WS_APP.CAMPAIGN_DATE_ISO
WS_APP.CAMPAIGN_DATE_LABEL
WS_APP.CAMPAIGN_TIME_LABEL
WS_APP.CAMPAIGN_DAY_PHASE
```

`CAMPAIGN_DATE_ISO` remains a `YYYY-MM-DD` projection. Existing daily, weekly and monthly consumers must continue to use it until they are explicitly upgraded to hour precision.

## Public read API

```text
getCampaignTimeIso()
getCampaignTimeLabel()
getCampaignClockLabel()
getCampaignTimeRevision()
getCampaignDayPhase()
getCampaignDateIso()
getCampaignDateLabel()
```

`getCampaignDateIso()` never returns a timestamp.

## Mutation API

Absolute administrative/import mutation:

```js
setCampaignTimeIso(targetTimeIso, {
  expectedRevision,
  idempotencyKey,
  actorId,
  reason,
  source
})
```

Date compatibility mutation:

```js
setCampaignDateIso("2109-02-14")
```

`setCampaignDateIso()` always sets the selected day to `00:00`.

Forward-only mutation:

```js
advanceCampaignTime({
  targetTimeIso,
  days,
  hours,
  minutes,
  expectedRevision,
  idempotencyKey,
  actorId,
  reason
})
```

Rules:

```text
advanceCampaignTime() rejects backward targets
positive delta is required when targetTimeIso is absent
expectedRevision rejects stale writes
idempotencyKey replays the stored result without a second mutation
each committed change increments revision once
```

Compatibility helpers:

```text
addCampaignHours(hours, options)
addCampaignDays(days, options)
```

## Events

Every committed timestamp change emits:

```text
ws:campaign-time-updated
```

Core payload:

```js
{
  previousTimeIso,
  currentTimeIso,
  campaignTimeIso,
  previousDateIso,
  currentDateIso,
  campaignDateIso,
  previousLabel,
  currentLabel,
  dayPhase,
  revision,
  advancedMinutes,
  crossedDayBoundaries,
  crossedWeekBoundaries,
  crossedMonthBoundaries,
  direction,
  reason,
  actorId,
  idempotencyKey,
  settlement
}
```

The compatibility event:

```text
ws:campaign-date-updated
```

is emitted only when the calendar day changes. Hour changes inside the same day must not wake daily consumers.

## Day phases

```text
NIGHT    00:00–05:59
MORNING  06:00–11:59
DAY      12:00–17:59
EVENING  18:00–23:59
```

Day phase is a projection. It does not create automatic gameplay effects.

## Settlement behavior

Weekly settlement remains date-boundary logic. A large time jump processes every overdue weekly boundary through the existing settlement loop. Campaign Time does not simulate every intermediate hour.

## UI boundary

The global status strip displays:

```text
DD.MM.YYYY / HH:MM
```

This patch does not add Admin/MG quick-forward controls. Existing date input remains a compatibility command and therefore sets midnight.

## Ownership boundaries

Campaign Time owns only:

```text
current timestamp
revision
idempotency receipts
date/time/day-phase projections
time/date update events
```

It does not directly mutate:

```text
ServiceOrder
MarketOrder or Shipment
ItemInstance
Billing
Subscriptions
Household
Citizen records
```

Domain schedulers observe Campaign Time and commit through their own public APIs.
