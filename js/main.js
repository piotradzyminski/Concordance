window.WS_APP = window.WS_APP || {};

const CAMPAIGN_TIME_STORAGE_KEY = "ws_app_campaign_time_iso_v1";
const CAMPAIGN_TIME_REVISION_STORAGE_KEY = "ws_app_campaign_time_revision_v1";
const CAMPAIGN_TIME_RECEIPTS_STORAGE_KEY = "ws_app_campaign_time_receipts_v1";
const CAMPAIGN_DATE_STORAGE_KEY = "ws_app_campaign_date_iso_v1";
const SETTLEMENT_PERIOD_STORAGE_KEY = "ws_app_next_settlement_period_iso_v1";
const DEFAULT_CAMPAIGN_DATE_ISO = "2109-02-13";
const DEFAULT_CAMPAIGN_TIME_ISO = `${DEFAULT_CAMPAIGN_DATE_ISO}T00:00:00.000Z`;
const CAMPAIGN_TIME_RECEIPT_LIMIT = 128;

const initialCampaignTimeIso = readStoredCampaignTime()
  || readStoredCampaignDateAsTime()
  || DEFAULT_CAMPAIGN_TIME_ISO;

window.WS_APP.CAMPAIGN_TIME_REVISION = readStoredCampaignTimeRevision();
syncCampaignTimeState(initialCampaignTimeIso);
window.WS_APP.SETTLEMENT_PERIOD_END_ISO = readStoredSettlementPeriodEnd() || getSettlementPeriodEndIso(window.WS_APP.CAMPAIGN_DATE_ISO);
window.WS_APP.SETTLEMENT_PERIOD_END_LABEL = formatCampaignDateLabel(window.WS_APP.SETTLEMENT_PERIOD_END_ISO);
let campaignTimeReceipts = readStoredCampaignTimeReceipts();
writeStoredCampaignTime(window.WS_APP.CAMPAIGN_TIME_ISO, window.WS_APP.CAMPAIGN_TIME_REVISION);
writeStoredSettlementPeriodEnd(window.WS_APP.SETTLEMENT_PERIOD_END_ISO);

function readStoredCampaignTime() {
  try {
    return normalizeCampaignTimeIso(window.localStorage.getItem(CAMPAIGN_TIME_STORAGE_KEY));
  } catch (error) {
    return "";
  }
}

function readStoredCampaignDateAsTime() {
  try {
    const value = window.localStorage.getItem(CAMPAIGN_DATE_STORAGE_KEY);
    return isValidIsoDate(value) ? `${value}T00:00:00.000Z` : "";
  } catch (error) {
    return "";
  }
}

function readStoredCampaignTimeRevision() {
  try {
    const revision = Number(window.localStorage.getItem(CAMPAIGN_TIME_REVISION_STORAGE_KEY));
    return Number.isInteger(revision) && revision >= 0 ? revision : 0;
  } catch (error) {
    return 0;
  }
}

function readStoredCampaignTimeReceipts() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CAMPAIGN_TIME_RECEIPTS_STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return new Map();
    return new Map(parsed
      .filter((entry) => entry && typeof entry === "object" && String(entry.idempotencyKey || "").trim())
      .slice(-CAMPAIGN_TIME_RECEIPT_LIMIT)
      .map((entry) => [String(entry.idempotencyKey).trim(), entry]));
  } catch (error) {
    return new Map();
  }
}

function writeStoredCampaignTime(value, revision = window.WS_APP.CAMPAIGN_TIME_REVISION) {
  const timeIso = normalizeCampaignTimeIso(value);
  if (!timeIso) return false;

  try {
    window.localStorage.setItem(CAMPAIGN_TIME_STORAGE_KEY, timeIso);
    window.localStorage.setItem(CAMPAIGN_DATE_STORAGE_KEY, timeIso.slice(0, 10));
    window.localStorage.setItem(CAMPAIGN_TIME_REVISION_STORAGE_KEY, String(Math.max(0, Number(revision) || 0)));
    return true;
  } catch (error) {
    console.warn("W&S campaign time could not be stored.", error);
    return false;
  }
}

function writeStoredCampaignTimeReceipts() {
  try {
    const receipts = Array.from(campaignTimeReceipts.values()).slice(-CAMPAIGN_TIME_RECEIPT_LIMIT);
    window.localStorage.setItem(CAMPAIGN_TIME_RECEIPTS_STORAGE_KEY, JSON.stringify(receipts));
    return true;
  } catch (error) {
    console.warn("W&S campaign time receipts could not be stored.", error);
    return false;
  }
}

function readStoredSettlementPeriodEnd() {
  try {
    const value = window.localStorage.getItem(SETTLEMENT_PERIOD_STORAGE_KEY);
    return isValidIsoDate(value) ? value : "";
  } catch (error) {
    return "";
  }
}

function writeStoredSettlementPeriodEnd(value) {
  if (!isValidIsoDate(value)) return;

  try {
    window.localStorage.setItem(SETTLEMENT_PERIOD_STORAGE_KEY, value);
  } catch (error) {
    console.warn("W&S settlement period could not be stored.", error);
  }
}

function isValidIsoDate(value) {
  const iso = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso;
}

function normalizeCampaignTimeIso(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isValidIsoDate(raw)) return `${raw}T00:00:00.000Z`;

  const localMatch = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?Z?$/);
  if (localMatch && isValidIsoDate(localMatch[1])) {
    const hour = Number(localMatch[2]);
    const minute = Number(localMatch[3]);
    const second = Number(localMatch[4] || 0);
    const millisecond = Number(String(localMatch[5] || "0").padEnd(3, "0"));
    if (hour > 23 || minute > 59 || second > 59 || millisecond > 999) return "";
    const [year, month, day] = localMatch[1].split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond)).toISOString();
  }

  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function compareIsoDates(a, b) {
  const left = isValidIsoDate(a) ? a : DEFAULT_CAMPAIGN_DATE_ISO;
  const right = isValidIsoDate(b) ? b : DEFAULT_CAMPAIGN_DATE_ISO;
  return left.localeCompare(right);
}

function addDaysIso(iso, days = 0) {
  const safeIso = isValidIsoDate(iso) ? iso : DEFAULT_CAMPAIGN_DATE_ISO;
  const date = new Date(`${safeIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + (Number(days) || 0));
  return date.toISOString().slice(0, 10);
}

function formatCampaignDateLabel(iso) {
  const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "13.02.2109";
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function formatCampaignTimeLabel(value) {
  const timeIso = normalizeCampaignTimeIso(value);
  if (!timeIso) return "13.02.2109 / 00:00";
  return `${formatCampaignDateLabel(timeIso.slice(0, 10))} / ${timeIso.slice(11, 16)}`;
}

function resolveCampaignDayPhase(value = window.WS_APP.CAMPAIGN_TIME_ISO) {
  const timeIso = normalizeCampaignTimeIso(value) || DEFAULT_CAMPAIGN_TIME_ISO;
  const hour = Number(timeIso.slice(11, 13));
  if (hour < 6) return "NIGHT";
  if (hour < 12) return "MORNING";
  if (hour < 18) return "DAY";
  return "EVENING";
}

function syncCampaignTimeState(value) {
  const timeIso = normalizeCampaignTimeIso(value) || DEFAULT_CAMPAIGN_TIME_ISO;
  window.WS_APP.CAMPAIGN_TIME_ISO = timeIso;
  window.WS_APP.CAMPAIGN_DATE_ISO = timeIso.slice(0, 10);
  window.WS_APP.CAMPAIGN_DATE_LABEL = formatCampaignDateLabel(window.WS_APP.CAMPAIGN_DATE_ISO);
  window.WS_APP.CAMPAIGN_TIME_LABEL = formatCampaignTimeLabel(timeIso);
  window.WS_APP.CAMPAIGN_DAY_PHASE = resolveCampaignDayPhase(timeIso);
}

function getCampaignTimeBoundarySummary(previousTimeIso, currentTimeIso) {
  const previous = new Date(normalizeCampaignTimeIso(previousTimeIso) || DEFAULT_CAMPAIGN_TIME_ISO);
  const current = new Date(normalizeCampaignTimeIso(currentTimeIso) || DEFAULT_CAMPAIGN_TIME_ISO);
  const previousDay = Date.UTC(previous.getUTCFullYear(), previous.getUTCMonth(), previous.getUTCDate());
  const currentDay = Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate());
  const signedDayBoundaries = Math.trunc((currentDay - previousDay) / 86400000);
  const signedMonthBoundaries = (current.getUTCFullYear() - previous.getUTCFullYear()) * 12
    + current.getUTCMonth() - previous.getUTCMonth();
  const mondayBucket = (date) => {
    const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    return Math.trunc((midnight - mondayOffset * 86400000) / 604800000);
  };

  return {
    advancedMinutes: Math.trunc((current.getTime() - previous.getTime()) / 60000),
    crossedDayBoundaries: Math.abs(signedDayBoundaries),
    crossedWeekBoundaries: Math.abs(mondayBucket(current) - mondayBucket(previous)),
    crossedMonthBoundaries: Math.abs(signedMonthBoundaries),
    crossedDayBoundary: signedDayBoundaries !== 0,
    direction: current > previous ? "FORWARD" : current < previous ? "BACKWARD" : "UNCHANGED"
  };
}

function rememberCampaignTimeReceipt(idempotencyKey, result) {
  const key = String(idempotencyKey || "").trim();
  if (!key) return;
  const storedResult = {
    ok: result?.ok === true,
    reason: String(result?.reason || "CAMPAIGN_TIME_RESULT_RECORDED"),
    noChange: result?.noChange === true,
    previousTimeIso: String(result?.previousTimeIso || ""),
    currentTimeIso: String(result?.currentTimeIso || window.WS_APP.CAMPAIGN_TIME_ISO),
    campaignTimeIso: String(result?.campaignTimeIso || result?.currentTimeIso || window.WS_APP.CAMPAIGN_TIME_ISO),
    campaignDateIso: String(result?.campaignDateIso || window.WS_APP.CAMPAIGN_DATE_ISO),
    revision: Number(result?.revision || window.WS_APP.CAMPAIGN_TIME_REVISION || 0),
    advancedMinutes: Number(result?.advancedMinutes || 0),
    crossedDayBoundaries: Number(result?.crossedDayBoundaries || 0),
    crossedWeekBoundaries: Number(result?.crossedWeekBoundaries || 0),
    crossedMonthBoundaries: Number(result?.crossedMonthBoundaries || 0),
    crossedDayBoundary: result?.crossedDayBoundary === true,
    direction: String(result?.direction || "UNCHANGED")
  };
  campaignTimeReceipts.set(key, {
    idempotencyKey: key,
    result: storedResult,
    recordedAt: window.WS_APP.CAMPAIGN_TIME_ISO
  });
  while (campaignTimeReceipts.size > CAMPAIGN_TIME_RECEIPT_LIMIT) {
    campaignTimeReceipts.delete(campaignTimeReceipts.keys().next().value);
  }
  writeStoredCampaignTimeReceipts();
}

function getSettlementPeriodEndIso(iso) {
  const safeIso = isValidIsoDate(iso) ? iso : DEFAULT_CAMPAIGN_DATE_ISO;
  const date = new Date(`${safeIso}T00:00:00Z`);
  const day = date.getUTCDay();
  const daysUntilSunday = (7 - day) % 7;
  date.setUTCDate(date.getUTCDate() + daysUntilSunday);
  return date.toISOString().slice(0, 10);
}

function refreshSettlementPeriodEnd() {
  if (!isValidIsoDate(window.WS_APP.SETTLEMENT_PERIOD_END_ISO)) {
    window.WS_APP.SETTLEMENT_PERIOD_END_ISO = getSettlementPeriodEndIso(window.WS_APP.CAMPAIGN_DATE_ISO);
    writeStoredSettlementPeriodEnd(window.WS_APP.SETTLEMENT_PERIOD_END_ISO);
  }

  window.WS_APP.SETTLEMENT_PERIOD_END_LABEL = formatCampaignDateLabel(window.WS_APP.SETTLEMENT_PERIOD_END_ISO);
}

function processDueSettlementPeriods(options = {}) {
  const processedPeriods = [];
  let guard = 0;

  refreshSettlementPeriodEnd();

  while (compareIsoDates(window.WS_APP.CAMPAIGN_DATE_ISO, window.WS_APP.SETTLEMENT_PERIOD_END_ISO) > 0 && guard < 260) {
    const settlementDateIso = window.WS_APP.SETTLEMENT_PERIOD_END_ISO;
    const result = window.WS_APP.SubscriptionAPI?.processWeeklySubscriptionSettlement?.({
      settlementDateIso,
      campaignDateIso: window.WS_APP.CAMPAIGN_DATE_ISO,
      campaignTimeIso: window.WS_APP.CAMPAIGN_TIME_ISO,
      source: options.source || "CAMPAIGN_TIME"
    }) || {
      ok: false,
      settlementDateIso,
      reason: "SETTLEMENT_PROCESSOR_UNAVAILABLE"
    };

    processedPeriods.push(result);
    window.WS_APP.SETTLEMENT_PERIOD_END_ISO = addDaysIso(settlementDateIso, 7);
    writeStoredSettlementPeriodEnd(window.WS_APP.SETTLEMENT_PERIOD_END_ISO);
    guard += 1;
  }

  refreshSettlementPeriodEnd();

  if (processedPeriods.length) {
    const totalDue = processedPeriods.reduce((sum, item) => sum + (Number(item.totalDue) || 0), 0);
    const debtIncrease = processedPeriods.reduce((sum, item) => sum + (Number(item.debtIncrease) || 0), 0);

    window.dispatchEvent(new CustomEvent("ws:settlement-period-processed", {
      detail: {
        periods: processedPeriods,
        nextSettlementPeriodIso: window.WS_APP.SETTLEMENT_PERIOD_END_ISO,
        nextSettlementPeriodLabel: window.WS_APP.SETTLEMENT_PERIOD_END_LABEL,
        totalDue,
        debtIncrease
      }
    }));

    if (options.log !== false) {
      window.WS_APP.appendTerminalLogLine?.(
        `SETTLEMENT PERIOD PROCESSED / ${processedPeriods.length} PERIOD(S) / DUE ${window.WS_APP.formatCredits?.(totalDue) || `${totalDue} ₡`} / DEBT +${window.WS_APP.formatCredits?.(debtIncrease) || `${debtIncrease} ₡`}`,
        { typed: true, speed: 8 }
      );
    }
  }

  return {
    ok: true,
    processed: processedPeriods.length,
    periods: processedPeriods,
    nextSettlementPeriodIso: window.WS_APP.SETTLEMENT_PERIOD_END_ISO,
    nextSettlementPeriodLabel: window.WS_APP.SETTLEMENT_PERIOD_END_LABEL
  };
}

function syncCampaignDateLabels() {
  refreshSettlementPeriodEnd();
  window.WS_APP.processTerminalCalendarReminders?.(window.WS_APP.CAMPAIGN_DATE_ISO);

  document.querySelectorAll("[data-campaign-date-label]").forEach((node) => {
    node.textContent = window.WS_APP.CAMPAIGN_DATE_LABEL;
  });

  document.querySelectorAll("[data-campaign-time-label], #campaign-time-label").forEach((node) => {
    node.textContent = window.WS_APP.CAMPAIGN_TIME_LABEL;
  });

  document.querySelectorAll("[data-settlement-period-end-label], #settlement-period-end-label").forEach((node) => {
    node.textContent = window.WS_APP.SETTLEMENT_PERIOD_END_LABEL;
  });

  syncTerminalUnreadLabels();
}

const TERMINAL_UNREAD_PULSE_MS = 2800;

function syncTerminalUnreadPulse() {
  const now = typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
  const delay = `-${((now % TERMINAL_UNREAD_PULSE_MS) / 1000).toFixed(3)}s`;
  document.documentElement.style.setProperty("--terminal-unread-pulse-duration", `${TERMINAL_UNREAD_PULSE_MS}ms`);
  document.documentElement.style.setProperty("--terminal-unread-pulse-delay", delay);
}

function syncTerminalUnreadLabels() {
  const user = window.WS_APP.currentUser;
  const citizenId = user?.role === "citizen" ? user.citizenId : "";
  const count = citizenId ? (window.WS_APP.countUnreadTerminalEntries?.(citizenId) || 0) : 0;
  const label = `${count} UNREAD TERMINAL ${count === 1 ? "ENTRY" : "ENTRIES"}`;

  document.querySelectorAll("[data-terminal-unread-label]").forEach((node) => {
    node.textContent = label;
    node.dataset.unreadCount = String(count);
    const item = node.closest(".terminal-unread-strip-item");
    item?.classList.toggle("is-empty", count === 0);
    item?.classList.toggle("has-unread", count > 0);
  });

  syncTerminalUnreadPulse();
}

window.WS_APP.syncTerminalUnreadPulse = syncTerminalUnreadPulse;
window.WS_APP.syncTerminalUnreadLabels = syncTerminalUnreadLabels;

function ensureTerminalDateStrip() {
  const shell = document.querySelector(".terminal-shell");
  const topbar = document.querySelector(".terminal-topbar");
  const grid = document.querySelector(".terminal-grid");
  if (!shell || !topbar || !grid) return;

  let strip = shell.querySelector(".terminal-date-strip");
  if (!strip) {
    strip = document.createElement("section");
    strip.className = "terminal-date-strip";
    strip.setAttribute("aria-label", "Campaign time and next settlement period");
    strip.innerHTML = `
      <div class="terminal-date-strip-item">
        <span>TIME</span>
        <strong data-campaign-time-label>${window.WS_APP.CAMPAIGN_TIME_LABEL}</strong>
      </div>

      <div class="terminal-date-strip-item is-wide">
        <span>NEXT SETTLEMENT PERIOD</span>
        <strong data-settlement-period-end-label>${window.WS_APP.SETTLEMENT_PERIOD_END_LABEL}</strong>
      </div>

      <div class="terminal-date-strip-item is-wide terminal-unread-strip-item">
        <span>TERMINAL</span>
        <strong data-terminal-unread-label>0 UNREAD TERMINAL ENTRIES</strong>
      </div>
    `;
    topbar.insertAdjacentElement("afterend", strip);
  } else {
    const settlementLabel = strip.querySelector("[data-settlement-period-end-label]")?.previousElementSibling;
    if (settlementLabel) settlementLabel.textContent = "NEXT SETTLEMENT PERIOD";

    if (!strip.querySelector("[data-terminal-unread-label]")) {
      const unread = document.createElement("div");
      unread.className = "terminal-date-strip-item is-wide terminal-unread-strip-item";
      unread.innerHTML = `
        <span>TERMINAL</span>
        <strong data-terminal-unread-label>0 UNREAD TERMINAL ENTRIES</strong>
      `;
      strip.appendChild(unread);
    }
  }

  // Previous patches placed the date near Session Log. The authoritative
  // location is now the narrow strip between the topbar and the main UI.
  document.querySelectorAll(".terminal-campaign-date-card, .terminal-campaign-date-tab").forEach((node) => node.remove());
  syncCampaignDateLabels();
}

window.WS_APP.getCampaignTimeIso = function getCampaignTimeIso() {
  return window.WS_APP.CAMPAIGN_TIME_ISO;
};

window.WS_APP.getCampaignTimeLabel = function getCampaignTimeLabel() {
  return window.WS_APP.CAMPAIGN_TIME_LABEL;
};

window.WS_APP.getCampaignClockLabel = window.WS_APP.getCampaignTimeLabel;

window.WS_APP.getCampaignTimeRevision = function getCampaignTimeRevision() {
  return Number(window.WS_APP.CAMPAIGN_TIME_REVISION || 0);
};

window.WS_APP.getCampaignDayPhase = function getCampaignDayPhase() {
  return window.WS_APP.CAMPAIGN_DAY_PHASE;
};

window.WS_APP.getCampaignDateIso = function getCampaignDateIso() {
  return window.WS_APP.CAMPAIGN_DATE_ISO;
};

window.WS_APP.getCampaignDateLabel = function getCampaignDateLabel() {
  return window.WS_APP.CAMPAIGN_DATE_LABEL;
};

window.WS_APP.getSettlementPeriodEndIso = function getSettlementPeriodEndIsoPublic() {
  refreshSettlementPeriodEnd();
  return window.WS_APP.SETTLEMENT_PERIOD_END_ISO;
};

window.WS_APP.getSettlementPeriodEndLabel = function getSettlementPeriodEndLabel() {
  refreshSettlementPeriodEnd();
  return window.WS_APP.SETTLEMENT_PERIOD_END_LABEL;
};

window.WS_APP.processDueSettlementPeriods = processDueSettlementPeriods;

window.WS_APP.forceNextSettlementPeriod = function forceNextSettlementPeriod(options = {}) {
  refreshSettlementPeriodEnd();

  const settlementDateIso = window.WS_APP.SETTLEMENT_PERIOD_END_ISO;
  const result = window.WS_APP.SubscriptionAPI?.processWeeklySubscriptionSettlement?.({
    settlementDateIso,
    campaignDateIso: window.WS_APP.CAMPAIGN_DATE_ISO,
    campaignTimeIso: window.WS_APP.CAMPAIGN_TIME_ISO,
    source: options.source || "ADMIN_FORCE_SETTLEMENT"
  }) || {
    ok: false,
    settlementDateIso,
    reason: "SETTLEMENT_PROCESSOR_UNAVAILABLE"
  };

  if (result.ok) {
    window.WS_APP.SETTLEMENT_PERIOD_END_ISO = addDaysIso(settlementDateIso, 7);
    writeStoredSettlementPeriodEnd(window.WS_APP.SETTLEMENT_PERIOD_END_ISO);
    refreshSettlementPeriodEnd();
    syncCampaignDateLabels();

    window.dispatchEvent(new CustomEvent("ws:settlement-period-processed", {
      detail: {
        periods: [result],
        forced: true,
        nextSettlementPeriodIso: window.WS_APP.SETTLEMENT_PERIOD_END_ISO,
        nextSettlementPeriodLabel: window.WS_APP.SETTLEMENT_PERIOD_END_LABEL,
        totalDue: Number(result.totalDue) || 0,
        debtIncrease: Number(result.debtIncrease) || 0
      }
    }));
  }

  return {
    ...result,
    forced: true,
    nextSettlementPeriodIso: window.WS_APP.SETTLEMENT_PERIOD_END_ISO,
    nextSettlementPeriodLabel: window.WS_APP.SETTLEMENT_PERIOD_END_LABEL
  };
};

function commitCampaignTime(value, options = {}) {
  const targetTimeIso = normalizeCampaignTimeIso(value);
  if (!targetTimeIso) return { ok: false, reason: "CAMPAIGN_TIME_INVALID" };

  const idempotencyKey = String(options.idempotencyKey || "").trim();
  const existingReceipt = idempotencyKey ? campaignTimeReceipts.get(idempotencyKey) : null;
  if (existingReceipt?.result) return { ...JSON.parse(JSON.stringify(existingReceipt.result)), replayed: true };

  const currentRevision = Number(window.WS_APP.CAMPAIGN_TIME_REVISION || 0);
  if (options.expectedRevision !== undefined && Number(options.expectedRevision) !== currentRevision) {
    return {
      ok: false,
      reason: "CAMPAIGN_TIME_REVISION_CONFLICT",
      expectedRevision: Number(options.expectedRevision),
      currentRevision
    };
  }

  const previousTimeIso = window.WS_APP.CAMPAIGN_TIME_ISO;
  const previousDateIso = window.WS_APP.CAMPAIGN_DATE_ISO;
  const previousTimeLabel = window.WS_APP.CAMPAIGN_TIME_LABEL;
  const boundaries = getCampaignTimeBoundarySummary(previousTimeIso, targetTimeIso);

  if (options.forwardOnly === true && boundaries.direction === "BACKWARD") {
    return {
      ok: false,
      reason: "CAMPAIGN_TIME_BACKWARD_NOT_ALLOWED",
      previousTimeIso,
      targetTimeIso,
      revision: currentRevision
    };
  }

  if (previousTimeIso === targetTimeIso) {
    const result = {
      ok: true,
      reason: "CAMPAIGN_TIME_UNCHANGED",
      noChange: true,
      previousTimeIso,
      currentTimeIso: targetTimeIso,
      campaignDateIso: previousDateIso,
      revision: currentRevision,
      ...boundaries
    };
    rememberCampaignTimeReceipt(idempotencyKey, result);
    return result;
  }

  window.WS_APP.CAMPAIGN_TIME_REVISION = currentRevision + 1;
  syncCampaignTimeState(targetTimeIso);
  writeStoredCampaignTime(window.WS_APP.CAMPAIGN_TIME_ISO, window.WS_APP.CAMPAIGN_TIME_REVISION);

  const settlement = processDueSettlementPeriods({ source: options.source || options.reason || "CAMPAIGN_TIME_SET" });
  syncCampaignDateLabels();

  const detail = {
    previousTimeIso,
    currentTimeIso: window.WS_APP.CAMPAIGN_TIME_ISO,
    campaignTimeIso: window.WS_APP.CAMPAIGN_TIME_ISO,
    timeIso: window.WS_APP.CAMPAIGN_TIME_ISO,
    previousDateIso,
    currentDateIso: window.WS_APP.CAMPAIGN_DATE_ISO,
    campaignDateIso: window.WS_APP.CAMPAIGN_DATE_ISO,
    dateIso: window.WS_APP.CAMPAIGN_DATE_ISO,
    previousLabel: previousTimeLabel,
    currentLabel: window.WS_APP.CAMPAIGN_TIME_LABEL,
    label: window.WS_APP.CAMPAIGN_TIME_LABEL,
    dayPhase: window.WS_APP.CAMPAIGN_DAY_PHASE,
    revision: window.WS_APP.CAMPAIGN_TIME_REVISION,
    reason: String(options.reason || options.source || "CAMPAIGN_TIME_SET").trim() || "CAMPAIGN_TIME_SET",
    actorId: String(options.actorId || "").trim(),
    idempotencyKey,
    settlement,
    ...boundaries
  };

  window.dispatchEvent(new CustomEvent("ws:campaign-time-updated", { detail }));

  if (previousDateIso !== window.WS_APP.CAMPAIGN_DATE_ISO) {
    window.dispatchEvent(new CustomEvent("ws:campaign-date-updated", {
      detail: {
        iso: window.WS_APP.CAMPAIGN_DATE_ISO,
        dateIso: window.WS_APP.CAMPAIGN_DATE_ISO,
        campaignDateIso: window.WS_APP.CAMPAIGN_DATE_ISO,
        previousDateIso,
        timeIso: window.WS_APP.CAMPAIGN_TIME_ISO,
        campaignTimeIso: window.WS_APP.CAMPAIGN_TIME_ISO,
        label: window.WS_APP.CAMPAIGN_DATE_LABEL,
        timeLabel: window.WS_APP.CAMPAIGN_TIME_LABEL,
        revision: window.WS_APP.CAMPAIGN_TIME_REVISION,
        campaignTimeEventDispatched: true,
        reason: detail.reason,
        settlementPeriodEndIso: window.WS_APP.SETTLEMENT_PERIOD_END_ISO,
        settlementPeriodEndLabel: window.WS_APP.SETTLEMENT_PERIOD_END_LABEL,
        settlement,
        ...boundaries
      }
    }));
  }

  const result = { ok: true, reason: "CAMPAIGN_TIME_UPDATED", ...detail };
  rememberCampaignTimeReceipt(idempotencyKey, result);
  return result;
}

window.WS_APP.setCampaignTimeIso = function setCampaignTimeIso(value, options = {}) {
  return commitCampaignTime(value, options);
};

window.WS_APP.setCampaignDateIso = function setCampaignDateIso(value, options = {}) {
  const iso = String(value || "").trim();
  if (!isValidIsoDate(iso)) return false;
  return commitCampaignTime(`${iso}T00:00:00.000Z`, {
    ...options,
    reason: options.reason || "CAMPAIGN_DATE_SET"
  }).ok === true;
};

window.WS_APP.advanceCampaignTime = function advanceCampaignTime(options = {}) {
  const input = typeof options === "number" ? { hours: options } : (options || {});
  const currentTimeIso = window.WS_APP.CAMPAIGN_TIME_ISO;
  let targetTimeIso = normalizeCampaignTimeIso(input.targetTimeIso || input.targetTime || "");

  if (!targetTimeIso) {
    const deltaMinutes = Math.trunc((Number(input.days) || 0) * 1440
      + (Number(input.hours) || 0) * 60
      + (Number(input.minutes) || 0));
    if (deltaMinutes <= 0) {
      return { ok: false, reason: "CAMPAIGN_TIME_FORWARD_DELTA_REQUIRED", currentTimeIso };
    }
    const target = new Date(currentTimeIso);
    target.setUTCMinutes(target.getUTCMinutes() + deltaMinutes);
    targetTimeIso = target.toISOString();
  }

  return commitCampaignTime(targetTimeIso, {
    ...input,
    forwardOnly: true,
    reason: input.reason || "CAMPAIGN_TIME_ADVANCED"
  });
};

window.WS_APP.addCampaignHours = function addCampaignHours(hours = 0, options = {}) {
  return window.WS_APP.advanceCampaignTime({ ...options, hours });
};

window.WS_APP.addCampaignDays = function addCampaignDays(days = 0, options = {}) {
  const amount = Number(days) || 0;
  if (amount === 0) return true;
  if (amount > 0) return window.WS_APP.advanceCampaignTime({ ...options, days: amount }).ok === true;

  const target = new Date(window.WS_APP.CAMPAIGN_TIME_ISO);
  target.setUTCDate(target.getUTCDate() + amount);
  return commitCampaignTime(target.toISOString(), {
    ...options,
    reason: options.reason || "CAMPAIGN_DAY_SET"
  }).ok === true;
};

window.WS_APP.extractCitizenBirthDate = function extractCitizenBirthDate(citizen = {}) {
  const candidates = [citizen.shortId, citizen.idNumber, citizen.id, citizen.legacyId]
    .map((value) => String(value || ""));

  for (const value of candidates) {
    const match = value.match(/(?:^|[^0-9])(20\d{6})(?:\.|[^0-9]|$)/);
    if (match) return match[1];
  }

  return "";
};

window.WS_APP.getCitizenAge = function getCitizenAge(citizen = {}) {
  const birth = window.WS_APP.extractCitizenBirthDate?.(citizen);
  if (!/^\d{8}$/.test(String(birth || ""))) return null;

  const year = Number(birth.slice(0, 4));
  const month = Number(birth.slice(4, 6));
  const day = Number(birth.slice(6, 8));
  const campaignDate = new Date(`${window.WS_APP.CAMPAIGN_DATE_ISO}T00:00:00Z`);

  let age = campaignDate.getUTCFullYear() - year;
  const currentMonth = campaignDate.getUTCMonth() + 1;
  const currentDay = campaignDate.getUTCDate();

  if (currentMonth < month || (currentMonth === month && currentDay < day)) {
    age -= 1;
  }

  return Number.isFinite(age) && age >= 0 ? age : null;
};

window.WS_APP.renderAgeBadge = function renderAgeBadge(citizen = {}, extraClass = "") {
  const age = window.WS_APP.getCitizenAge?.(citizen);
  if (age === null || age === undefined) return "";
  return `<span class="citizen-age-badge ${extraClass}"><small>AGE</small><b>${String(age)}</b></span>`;
};


document.addEventListener("DOMContentLoaded", () => {
  window.WS_APP.processDueSettlementPeriods?.({ source: "INIT" });
  ensureTerminalDateStrip();
  syncCampaignDateLabels();

  window.addEventListener("ws:terminal-entries-updated", syncTerminalUnreadLabels);
  window.addEventListener("ws:terminal-rendered", syncTerminalUnreadLabels);
  window.addEventListener("ws:citizens-updated", syncTerminalUnreadLabels);

  window.WS_APP.initAuth();
  window.WS_APP.initAuthCache();
  window.WS_APP.initLogout();
  window.WS_APP.initCitizenStoreRefresh?.();
});
