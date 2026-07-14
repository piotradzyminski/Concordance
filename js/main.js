window.WS_APP = window.WS_APP || {};

const CAMPAIGN_DATE_STORAGE_KEY = "ws_app_campaign_date_iso_v1";
const SETTLEMENT_PERIOD_STORAGE_KEY = "ws_app_next_settlement_period_iso_v1";

window.WS_APP.CAMPAIGN_DATE_ISO = readStoredCampaignDate() || "2109-02-13";
window.WS_APP.CAMPAIGN_DATE_LABEL = formatCampaignDateLabel(window.WS_APP.CAMPAIGN_DATE_ISO);
window.WS_APP.SETTLEMENT_PERIOD_END_ISO = readStoredSettlementPeriodEnd() || getSettlementPeriodEndIso(window.WS_APP.CAMPAIGN_DATE_ISO);
window.WS_APP.SETTLEMENT_PERIOD_END_LABEL = formatCampaignDateLabel(window.WS_APP.SETTLEMENT_PERIOD_END_ISO);
writeStoredSettlementPeriodEnd(window.WS_APP.SETTLEMENT_PERIOD_END_ISO);

function readStoredCampaignDate() {
  try {
    const value = window.localStorage.getItem(CAMPAIGN_DATE_STORAGE_KEY);
    return isValidIsoDate(value) ? value : "";
  } catch (error) {
    return "";
  }
}

function writeStoredCampaignDate(value) {
  try {
    window.localStorage.setItem(CAMPAIGN_DATE_STORAGE_KEY, value);
  } catch (error) {
    console.warn("W&S campaign date could not be stored.", error);
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

function compareIsoDates(a, b) {
  const left = isValidIsoDate(a) ? a : "2109-02-13";
  const right = isValidIsoDate(b) ? b : "2109-02-13";
  return left.localeCompare(right);
}

function addDaysIso(iso, days = 0) {
  const safeIso = isValidIsoDate(iso) ? iso : "2109-02-13";
  const date = new Date(`${safeIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + (Number(days) || 0));
  return date.toISOString().slice(0, 10);
}

function formatCampaignDateLabel(iso) {
  const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "13.02.2109";
  return `${match[3]}.${match[2]}.${match[1]}`;
}

function getSettlementPeriodEndIso(iso) {
  const safeIso = isValidIsoDate(iso) ? iso : "2109-02-13";
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
      source: options.source || "CAMPAIGN_DATE"
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

  document.querySelectorAll("[data-campaign-date-label], #campaign-date-label").forEach((node) => {
    node.textContent = window.WS_APP.CAMPAIGN_DATE_LABEL;
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
    strip.setAttribute("aria-label", "Date and next settlement period");
    strip.innerHTML = `
      <div class="terminal-date-strip-item">
        <span>DATE</span>
        <strong data-campaign-date-label>${window.WS_APP.CAMPAIGN_DATE_LABEL}</strong>
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

window.WS_APP.setCampaignDateIso = function setCampaignDateIso(value) {
  const iso = String(value || "").trim();
  if (!isValidIsoDate(iso)) return false;

  window.WS_APP.CAMPAIGN_DATE_ISO = iso;
  window.WS_APP.CAMPAIGN_DATE_LABEL = formatCampaignDateLabel(iso);
  writeStoredCampaignDate(iso);

  const settlementResult = processDueSettlementPeriods({ source: "CAMPAIGN_DATE_SET" });
  syncCampaignDateLabels();

  window.dispatchEvent(new CustomEvent("ws:campaign-date-updated", {
    detail: {
      iso,
      label: window.WS_APP.CAMPAIGN_DATE_LABEL,
      settlementPeriodEndIso: window.WS_APP.SETTLEMENT_PERIOD_END_ISO,
      settlementPeriodEndLabel: window.WS_APP.SETTLEMENT_PERIOD_END_LABEL,
      settlement: settlementResult
    }
  }));
  return true;
};

window.WS_APP.addCampaignDays = function addCampaignDays(days = 0) {
  const base = new Date(`${window.WS_APP.getCampaignDateIso()}T00:00:00Z`);
  const delta = Number(days) || 0;
  base.setUTCDate(base.getUTCDate() + delta);
  return window.WS_APP.setCampaignDateIso(base.toISOString().slice(0, 10));
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
