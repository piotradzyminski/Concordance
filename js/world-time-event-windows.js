(() => {
  "use strict";

  window.WS_APP = window.WS_APP || {};
  const app = window.WS_APP;

  const SCHEMA_VERSION = "world_time_event_windows_2_2x";
  const MINUTE_MS = 60 * 1000;
  const DAY_MS = 24 * 60 * MINUTE_MS;
  const DEFAULT_LOOKAHEAD_DAYS = 14;
  const MAX_LOOKAHEAD_DAYS = 366;
  const DAY_NAMES = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  const POLICY_TYPES = new Set(["ANYTIME", "WINDOWED", "BUSINESS_HOURS", "EXACT", "NEXT_AVAILABLE", "IMMEDIATE"]);
  const BOUNDARY_MODES = new Set(["INTERIOR", "DUE", "CLOSED"]);

  function clone(value) {
    return value == null ? value : structuredClone(value);
  }

  function normalizeToken(value = "") {
    return String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  }

  function normalizeIso(value = "") {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const parsedDate = Date.parse(`${raw}T00:00:00.000Z`);
      return Number.isFinite(parsedDate) ? new Date(parsedDate).toISOString() : "";
    }
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
  }

  function clampInteger(value, minimum, maximum, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.trunc(parsed)));
  }

  function parseClockMinutes(value, options = {}) {
    if (Number.isInteger(value)) {
      const maximum = options.allowEndOfDay === true ? 1440 : 1439;
      return value >= 0 && value <= maximum ? value : null;
    }

    const raw = String(value || "").trim();
    const match = raw.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    if (minute > 59) return null;
    if (hour === 24 && minute === 0 && options.allowEndOfDay === true) return 1440;
    if (hour > 23) return null;
    return hour * 60 + minute;
  }

  function formatClockMinutes(value) {
    const minutes = Number(value);
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) return "";
    if (minutes === 1440) return "24:00";
    return `${String(Math.trunc(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }

  function normalizeWindow(source = {}) {
    const startMinute = parseClockMinutes(source.start ?? source.open ?? source.from);
    const endMinute = parseClockMinutes(source.end ?? source.close ?? source.to, { allowEndOfDay: true });
    if (startMinute == null || endMinute == null || startMinute === endMinute) return null;
    return {
      start: formatClockMinutes(startMinute),
      end: formatClockMinutes(endMinute),
      startMinute,
      endMinute,
      overnight: endMinute < startMinute,
      sourceId: String(source.sourceId || source.windowId || "").trim()
    };
  }

  function normalizeWindowList(value) {
    const list = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
    return list.map(normalizeWindow).filter(Boolean);
  }

  function dayKeyFromValue(value = "") {
    const token = normalizeToken(value);
    const aliases = {
      SUN: "SUNDAY",
      MON: "MONDAY",
      TUE: "TUESDAY",
      TUES: "TUESDAY",
      WED: "WEDNESDAY",
      THU: "THURSDAY",
      THUR: "THURSDAY",
      THURS: "THURSDAY",
      FRI: "FRIDAY",
      SAT: "SATURDAY"
    };
    return DAY_NAMES.includes(token) ? token : aliases[token] || "";
  }

  function normalizeOperatingHours(source = {}) {
    const normalized = Object.fromEntries(DAY_NAMES.map((day) => [day, []]));
    const input = source && typeof source === "object" ? source : {};
    const days = input.days && typeof input.days === "object" ? input.days : input;
    const daily = normalizeWindowList(input.daily || input.everyDay || input.everyday);

    DAY_NAMES.forEach((day) => {
      normalized[day] = daily.map(clone);
    });

    Object.entries(days).forEach(([key, value]) => {
      const day = dayKeyFromValue(key);
      if (!day) return;
      normalized[day] = normalizeWindowList(value);
    });

    if (input.alwaysOpen === true) {
      DAY_NAMES.forEach((day) => {
        normalized[day] = [{
          start: "00:00",
          end: "24:00",
          startMinute: 0,
          endMinute: 1440,
          overnight: false,
          sourceId: "ALWAYS_OPEN"
        }];
      });
    }

    return normalized;
  }

  function normalizePolicy(source = {}) {
    const input = typeof source === "string" ? { type: source } : source && typeof source === "object" ? source : {};
    const type = POLICY_TYPES.has(normalizeToken(input.type)) ? normalizeToken(input.type) : "ANYTIME";
    const boundaryMode = BOUNDARY_MODES.has(normalizeToken(input.boundaryMode))
      ? normalizeToken(input.boundaryMode)
      : type === "EXACT" || type === "IMMEDIATE" ? "DUE" : "INTERIOR";
    const windows = normalizeWindowList(input.windows || input.window);
    const operatingHours = normalizeOperatingHours(input.operatingHours || input.calendar || {});
    const maxLookaheadDays = clampInteger(input.maxLookaheadDays, 1, MAX_LOOKAHEAD_DAYS, DEFAULT_LOOKAHEAD_DAYS);

    return {
      type,
      boundaryMode,
      windows,
      operatingHours,
      exactAt: String(input.exactAt || input.at || "").trim(),
      deferToNextWindow: input.deferToNextWindow === true || type === "NEXT_AVAILABLE",
      maxLookaheadDays,
      metadata: input.metadata && typeof input.metadata === "object" ? clone(input.metadata) : {}
    };
  }

  function floorMinute(timestamp) {
    return Math.floor(timestamp / MINUTE_MS) * MINUTE_MS;
  }

  function ceilMinute(timestamp) {
    return Math.ceil(timestamp / MINUTE_MS) * MINUTE_MS;
  }

  function resolveAdvanceMinuteBounds(previousTimestamp, currentTimestamp, boundaryMode) {
    if (boundaryMode === "CLOSED") {
      return { startMs: floorMinute(previousTimestamp), endMs: floorMinute(currentTimestamp) };
    }
    if (boundaryMode === "DUE") {
      return { startMs: floorMinute(previousTimestamp) + MINUTE_MS, endMs: floorMinute(currentTimestamp) };
    }
    return { startMs: floorMinute(previousTimestamp) + MINUTE_MS, endMs: ceilMinute(currentTimestamp) - MINUTE_MS };
  }

  function startOfUtcDay(timestamp) {
    const date = new Date(timestamp);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  function addUtcDays(timestamp, days) {
    return timestamp + days * DAY_MS;
  }

  function createRange(startMs, endMs, metadata = {}) {
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null;
    return { startMs, endMs, ...metadata };
  }

  function mergeRanges(ranges = []) {
    const sorted = ranges.filter(Boolean).sort((left, right) => left.startMs - right.startMs || left.endMs - right.endMs);
    const merged = [];
    sorted.forEach((range) => {
      const previous = merged[merged.length - 1];
      if (!previous || range.startMs > previous.endMs + MINUTE_MS) {
        merged.push({ ...range });
        return;
      }
      previous.endMs = Math.max(previous.endMs, range.endMs);
      previous.sourceWindows = [...new Set([...(previous.sourceWindows || []), ...(range.sourceWindows || [])])];
    });
    return merged;
  }

  function intersectRanges(leftRanges = [], rightRanges = []) {
    const intersections = [];
    leftRanges.forEach((left) => {
      rightRanges.forEach((right) => {
        const startMs = Math.max(left.startMs, right.startMs);
        const endMs = Math.min(left.endMs, right.endMs);
        if (endMs < startMs) return;
        intersections.push(createRange(startMs, endMs, {
          sourceWindows: [...new Set([...(left.sourceWindows || []), ...(right.sourceWindows || [])])]
        }));
      });
    });
    return mergeRanges(intersections);
  }

  function buildDailyRanges(startTimestamp, endTimestamp, windows = []) {
    if (!windows.length) return [];
    const ranges = [];
    const firstDay = addUtcDays(startOfUtcDay(startTimestamp), -1);
    const lastDay = addUtcDays(startOfUtcDay(endTimestamp), 1);

    for (let dayStart = firstDay; dayStart <= lastDay; dayStart += DAY_MS) {
      windows.forEach((windowDef) => {
        const startMs = dayStart + windowDef.startMinute * MINUTE_MS;
        const endMs = windowDef.overnight
          ? dayStart + DAY_MS + windowDef.endMinute * MINUTE_MS - MINUTE_MS
          : dayStart + windowDef.endMinute * MINUTE_MS - MINUTE_MS;
        const range = createRange(startMs, endMs, {
          sourceWindows: [`${windowDef.start}-${windowDef.end}`]
        });
        if (range) ranges.push(range);
      });
    }
    return mergeRanges(ranges);
  }

  function buildOperatingRanges(startTimestamp, endTimestamp, operatingHours = {}) {
    const schedule = normalizeOperatingHours(operatingHours);
    const ranges = [];
    const firstDay = addUtcDays(startOfUtcDay(startTimestamp), -1);
    const lastDay = addUtcDays(startOfUtcDay(endTimestamp), 1);

    for (let dayStart = firstDay; dayStart <= lastDay; dayStart += DAY_MS) {
      const dayName = DAY_NAMES[new Date(dayStart).getUTCDay()];
      (schedule[dayName] || []).forEach((windowDef) => {
        const startMs = dayStart + windowDef.startMinute * MINUTE_MS;
        const endMs = windowDef.overnight
          ? dayStart + DAY_MS + windowDef.endMinute * MINUTE_MS - MINUTE_MS
          : dayStart + windowDef.endMinute * MINUTE_MS - MINUTE_MS;
        const range = createRange(startMs, endMs, {
          sourceWindows: [`${dayName}:${windowDef.start}-${windowDef.end}`]
        });
        if (range) ranges.push(range);
      });
    }
    return mergeRanges(ranges);
  }

  function candidateRangesForPolicy(previousTimestamp, currentTimestamp, policy) {
    const bounds = resolveAdvanceMinuteBounds(previousTimestamp, currentTimestamp, policy.boundaryMode);
    const baseRange = createRange(bounds.startMs, bounds.endMs, { sourceWindows: ["ADVANCE_INTERVAL"] });
    if (!baseRange) return [];
    const baseRanges = [baseRange];

    if (policy.type === "ANYTIME") return baseRanges;
    if (policy.type === "IMMEDIATE") {
      const immediateMs = floorMinute(currentTimestamp);
      return immediateMs >= bounds.startMs && immediateMs <= bounds.endMs
        ? [createRange(immediateMs, immediateMs, { sourceWindows: ["IMMEDIATE"] })]
        : [];
    }
    if (policy.type === "WINDOWED" || (policy.type === "NEXT_AVAILABLE" && policy.windows.length)) {
      return intersectRanges(baseRanges, buildDailyRanges(bounds.startMs, bounds.endMs, policy.windows));
    }
    if (policy.type === "BUSINESS_HOURS" || policy.type === "NEXT_AVAILABLE") {
      return intersectRanges(baseRanges, buildOperatingRanges(bounds.startMs, bounds.endMs, policy.operatingHours));
    }
    return baseRanges;
  }

  function exactCandidates(previousTimestamp, currentTimestamp, policy) {
    const raw = policy.exactAt;
    const exactIso = normalizeIso(raw);
    if (exactIso && /T/.test(raw)) {
      const timestamp = Date.parse(exactIso);
      return timestamp > previousTimestamp && timestamp <= currentTimestamp
        ? [createRange(floorMinute(timestamp), floorMinute(timestamp), { sourceWindows: ["EXACT_TIMESTAMP"] })]
        : [];
    }

    const clockMinute = parseClockMinutes(raw);
    if (clockMinute == null) return [];
    const ranges = [];
    const firstDay = startOfUtcDay(previousTimestamp);
    const lastDay = startOfUtcDay(currentTimestamp);
    for (let dayStart = firstDay; dayStart <= lastDay; dayStart += DAY_MS) {
      const timestamp = dayStart + clockMinute * MINUTE_MS;
      if (timestamp > previousTimestamp && timestamp <= currentTimestamp) {
        ranges.push(createRange(timestamp, timestamp, { sourceWindows: [`EXACT:${formatClockMinutes(clockMinute)}`] }));
      }
    }
    return ranges;
  }

  function countRangeMinutes(range) {
    return Math.trunc((range.endMs - range.startMs) / MINUTE_MS) + 1;
  }

  function hashSeed(value = "") {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function stablePolicyFingerprint(policy) {
    const schedule = DAY_NAMES.map((day) => `${day}:${(policy.operatingHours[day] || []).map((windowDef) => `${windowDef.start}-${windowDef.end}`).join(",")}`).join("|");
    const windows = policy.windows.map((windowDef) => `${windowDef.start}-${windowDef.end}`).join(",");
    return [policy.type, policy.boundaryMode, policy.exactAt, windows, schedule, policy.deferToNextWindow, policy.maxLookaheadDays].join("::");
  }

  function selectDeterministicMinute(ranges, seed) {
    const totalMinutes = ranges.reduce((sum, range) => sum + countRangeMinutes(range), 0);
    if (!totalMinutes) return null;
    let remaining = hashSeed(seed) % totalMinutes;
    for (const range of ranges) {
      const rangeMinutes = countRangeMinutes(range);
      if (remaining < rangeMinutes) {
        return {
          timestamp: range.startMs + remaining * MINUTE_MS,
          slot: remaining,
          totalMinutes,
          range
        };
      }
      remaining -= rangeMinutes;
    }
    return null;
  }

  function buildFutureAllowedRanges(currentTimestamp, policy) {
    const firstMinute = floorMinute(currentTimestamp) + MINUTE_MS;
    const lookaheadEnd = firstMinute + policy.maxLookaheadDays * DAY_MS;
    if (policy.type === "WINDOWED" || (policy.type === "NEXT_AVAILABLE" && policy.windows.length)) {
      return buildDailyRanges(firstMinute, lookaheadEnd, policy.windows)
        .map((range) => createRange(Math.max(firstMinute, range.startMs), range.endMs, { sourceWindows: range.sourceWindows }))
        .filter(Boolean);
    }
    return buildOperatingRanges(firstMinute, lookaheadEnd, policy.operatingHours)
      .map((range) => createRange(Math.max(firstMinute, range.startMs), range.endMs, { sourceWindows: range.sourceWindows }))
      .filter(Boolean);
  }

  function resolveSeed(input, previousTimeIso, currentTimeIso, policy) {
    const eventKey = String(input.eventId || input.idempotencyKey || input.seed || input.eventKey || "").trim();
    if (!eventKey) return "";
    return `${eventKey}::${previousTimeIso}::${currentTimeIso}::${stablePolicyFingerprint(policy)}`;
  }

  function serializeRange(range) {
    if (!range) return null;
    return {
      startTimeIso: new Date(range.startMs).toISOString(),
      endTimeIso: new Date(range.endMs).toISOString(),
      sourceWindows: [...(range.sourceWindows || [])]
    };
  }

  function makeBaseResult(previousTimeIso, currentTimeIso, policy) {
    return {
      schemaVersion: SCHEMA_VERSION,
      previousTimeIso,
      currentTimeIso,
      policyType: policy.type,
      boundaryMode: policy.boundaryMode,
      deferred: false,
      withinAdvance: false,
      eventTimeIso: "",
      scheduledAt: "",
      candidateMinutes: 0,
      selectedRange: null,
      nextWindow: null
    };
  }

  function resolveEventTimeWithinAdvance(input = {}) {
    const previousTimeIso = normalizeIso(input.previousTimeIso || input.previousTime || input.fromTimeIso);
    const currentTimeIso = normalizeIso(input.currentTimeIso || input.campaignTimeIso || input.currentTime || input.toTimeIso);
    const policy = normalizePolicy(input.policy || input.timePolicy || input);
    const base = makeBaseResult(previousTimeIso, currentTimeIso, policy);

    if (!previousTimeIso || !currentTimeIso) {
      return { ...base, ok: false, status: "INVALID", reason: "EVENT_TIME_ADVANCE_REQUIRED" };
    }

    const previousTimestamp = Date.parse(previousTimeIso);
    const currentTimestamp = Date.parse(currentTimeIso);
    if (currentTimestamp <= previousTimestamp) {
      return { ...base, ok: false, status: "INVALID", reason: "EVENT_TIME_FORWARD_ADVANCE_REQUIRED" };
    }

    if (policy.type === "EXACT") {
      const exact = exactCandidates(previousTimestamp, currentTimestamp, policy)[0];
      if (!exact) {
        return { ...base, ok: false, status: "NOT_DUE", reason: "EVENT_TIME_EXACT_NOT_IN_ADVANCE" };
      }
      const eventTimeIso = new Date(exact.startMs).toISOString();
      return {
        ...base,
        ok: true,
        status: "RESOLVED",
        reason: "EVENT_TIME_EXACT_RESOLVED",
        withinAdvance: true,
        eventTimeIso,
        scheduledAt: eventTimeIso,
        candidateMinutes: 1,
        selectedRange: serializeRange(exact)
      };
    }

    const seed = resolveSeed(input, previousTimeIso, currentTimeIso, policy);
    if (!seed && policy.type !== "IMMEDIATE") {
      return { ...base, ok: false, status: "INVALID", reason: "EVENT_TIME_STABLE_KEY_REQUIRED" };
    }

    const ranges = candidateRangesForPolicy(previousTimestamp, currentTimestamp, policy);
    const selected = policy.type === "IMMEDIATE"
      ? ranges.length ? { timestamp: ranges[0].startMs, totalMinutes: 1, range: ranges[0] } : null
      : selectDeterministicMinute(ranges, seed);

    if (selected) {
      const eventTimeIso = new Date(selected.timestamp).toISOString();
      return {
        ...base,
        ok: true,
        status: "RESOLVED",
        reason: "EVENT_TIME_RESOLVED_WITHIN_ADVANCE",
        withinAdvance: true,
        eventTimeIso,
        scheduledAt: eventTimeIso,
        candidateMinutes: selected.totalMinutes,
        deterministicHash: seed ? hashSeed(seed) : null,
        selectedRange: serializeRange(selected.range),
        resolutionKey: seed
      };
    }

    if (!policy.deferToNextWindow || !["WINDOWED", "BUSINESS_HOURS", "NEXT_AVAILABLE"].includes(policy.type)) {
      return {
        ...base,
        ok: false,
        status: "NO_WINDOW",
        reason: "EVENT_TIME_NO_ALLOWED_MINUTE_IN_ADVANCE",
        resolutionKey: seed
      };
    }

    const futureRanges = buildFutureAllowedRanges(currentTimestamp, policy);
    const nextRange = futureRanges.find((range) => range.endMs >= floorMinute(currentTimestamp) + MINUTE_MS);
    if (!nextRange) {
      return {
        ...base,
        ok: false,
        status: "NO_WINDOW",
        reason: "EVENT_TIME_NEXT_WINDOW_NOT_FOUND",
        resolutionKey: seed
      };
    }

    const futureSeed = `${seed}::DEFERRED::${new Date(nextRange.startMs).toISOString()}::${new Date(nextRange.endMs).toISOString()}`;
    const deferredSelection = selectDeterministicMinute([nextRange], futureSeed);
    const eventTimeIso = new Date(deferredSelection.timestamp).toISOString();
    return {
      ...base,
      ok: true,
      status: "DEFERRED",
      reason: "EVENT_TIME_DEFERRED_TO_NEXT_WINDOW",
      deferred: true,
      withinAdvance: false,
      eventTimeIso,
      scheduledAt: eventTimeIso,
      candidateMinutes: deferredSelection.totalMinutes,
      deterministicHash: hashSeed(futureSeed),
      selectedRange: serializeRange(nextRange),
      nextWindow: serializeRange(nextRange),
      resolutionKey: futureSeed
    };
  }

  function resolveEventTimeFromCampaignEvent(eventOrDetail = {}, options = {}) {
    const detail = eventOrDetail?.detail && typeof eventOrDetail.detail === "object" ? eventOrDetail.detail : eventOrDetail;
    return resolveEventTimeWithinAdvance({
      ...options,
      previousTimeIso: options.previousTimeIso || detail?.previousTimeIso,
      currentTimeIso: options.currentTimeIso || detail?.currentTimeIso || detail?.campaignTimeIso
    });
  }

  function getOperatingWindowsWithinAdvance(input = {}) {
    const previousTimeIso = normalizeIso(input.previousTimeIso || input.fromTimeIso);
    const currentTimeIso = normalizeIso(input.currentTimeIso || input.toTimeIso || input.campaignTimeIso);
    if (!previousTimeIso || !currentTimeIso || Date.parse(currentTimeIso) <= Date.parse(previousTimeIso)) return [];
    const policy = normalizePolicy({ type: "BUSINESS_HOURS", boundaryMode: input.boundaryMode || "DUE", operatingHours: input.operatingHours });
    const bounds = resolveAdvanceMinuteBounds(Date.parse(previousTimeIso), Date.parse(currentTimeIso), policy.boundaryMode);
    const base = createRange(bounds.startMs, bounds.endMs, { sourceWindows: ["ADVANCE_INTERVAL"] });
    if (!base) return [];
    return intersectRanges([base], buildOperatingRanges(bounds.startMs, bounds.endMs, policy.operatingHours)).map(serializeRange);
  }

  function isWithinOperatingHours(timeIso, operatingHours = {}) {
    const normalized = normalizeIso(timeIso);
    if (!normalized) return false;
    const timestamp = floorMinute(Date.parse(normalized));
    return buildOperatingRanges(timestamp, timestamp, operatingHours)
      .some((range) => timestamp >= range.startMs && timestamp <= range.endMs);
  }

  app.WORLD_TIME_EVENT_WINDOWS_SCHEMA_VERSION = SCHEMA_VERSION;
  app.WORLD_TIME_EVENT_POLICY_TYPES = Object.freeze([...POLICY_TYPES]);
  app.normalizeWorldTimeEventPolicy = normalizePolicy;
  app.normalizeOperatingHours = normalizeOperatingHours;
  app.getOperatingWindowsWithinAdvance = getOperatingWindowsWithinAdvance;
  app.isWithinOperatingHours = isWithinOperatingHours;
  app.resolveEventTimeWithinAdvance = resolveEventTimeWithinAdvance;
  app.resolveEventTimeFromCampaignEvent = resolveEventTimeFromCampaignEvent;

  window.dispatchEvent?.(new CustomEvent("ws:world-time-event-windows-ready", {
    detail: {
      schemaVersion: SCHEMA_VERSION,
      policyTypes: [...POLICY_TYPES]
    }
  }));
})();
