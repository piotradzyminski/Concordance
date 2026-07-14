window.WS_APP = window.WS_APP || {};

(function initTerminalModule() {
  const TERMINAL_REQUEST_TYPES = [
    { id: "ACCESS_REVIEW", label: "Access Review" },
    { id: "DEBT_REVIEW", label: "Debt Review" },
    { id: "SUBSCRIPTION_CHANGE", label: "Subscription Change" },
    { id: "MEDICAL_SERVICE", label: "Medical Service" },
    { id: "HOUSING_CHANGE", label: "Housing Change" },
    { id: "MESSAGE_TO_ADMIN", label: "Message to Admin" }
  ];

  const TERMINAL_REMINDER_COLORS = Array.from({ length: 6 }, (_, index) => index);
  const TERMINAL_MODULE_VERSION = "5.3.0x";

  function escapeHtml(value = "") {
    if (typeof window.WS_APP.escapeHtml === "function") return window.WS_APP.escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getCitizenShortId(citizen = {}) {
    if (typeof window.WS_APP.getCitizenShortId === "function") {
      return window.WS_APP.getCitizenShortId(citizen);
    }
    return String(citizen?.shortId || citizen?.id || "").trim();
  }

  function getCitizenNameLabel(citizen = {}, options = {}) {
    if (typeof window.WS_APP.getCitizenNameLabel === "function") {
      return window.WS_APP.getCitizenNameLabel(citizen, options);
    }
    const legalName = [citizen?.firstName, citizen?.lastName].filter(Boolean).join(" ").trim();
    return legalName || String(citizen?.legalName || citizen?.name || getCitizenShortId(citizen) || citizen?.id || "UNKNOWN CITIZEN");
  }

  function getCitizenFinancialLedger(citizen = {}) {
    if (typeof window.WS_APP.getCitizenFinancialLedger === "function") {
      return window.WS_APP.getCitizenFinancialLedger(citizen);
    }
    const credits = Number(citizen?.credits || 0) || 0;
    const debt = Number(citizen?.debt || 0) || 0;
    const incomeTotal = typeof window.WS_APP.getCitizenWeeklyIncomeTotal === "function"
      ? Number(window.WS_APP.getCitizenWeeklyIncomeTotal(citizen) || 0)
      : 0;
    return {
      credits,
      debt,
      incomeTotal,
      subscriptions: [],
      subscriptionTotal: 0,
      allSubscriptionTotal: 0,
      netCycle: incomeTotal
    };
  }

  function formatCredits(value = 0) {
    if (typeof window.WS_APP.formatCredits === "function") return window.WS_APP.formatCredits(value);
    const numeric = Number(value || 0);
    return `${Number.isFinite(numeric) ? Math.round(numeric).toLocaleString("en-US") : 0} ₡`;
  }

  function formatDateDisplay(value = "") {
    if (typeof window.WS_APP.formatDateDisplay === "function") return window.WS_APP.formatDateDisplay(value);
    const source = String(value || "").trim();
    const match = source.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : source;
  }

  function formatDateTimeDisplay(value = "", fallbackDate = "") {
    const source = String(value || "").trim();
    const expanded = /^\d{4}-\d{2}-\d{2}$/.test(source) ? `${source}T00:00:00.000Z` : source;
    const parsed = Date.parse(expanded);
    if (!Number.isFinite(parsed)) {
      const fallback = String(fallbackDate || "").slice(0, 10);
      return fallback ? `${formatDateDisplay(fallback)} / 00:00` : source;
    }
    const date = new Date(parsed);
    const dateIso = date.toISOString().slice(0, 10);
    const time = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
    return `${formatDateDisplay(dateIso)} / ${time}`;
  }

  function getTerminalEntryTimestamp(entry = {}) {
    return String(entry.receivedAt || entry.sentAt || entry.createdAt || entry.occurredAt || entry.date || "").trim();
  }

  function getTerminalCalendarUiState(citizenId) {
    const id = String(citizenId || "local").trim() || "local";
    window.WS_APP.terminalCalendarState = window.WS_APP.terminalCalendarState || {};
    if (!window.WS_APP.terminalCalendarState[id]) {
      const campaignIso = window.WS_APP.getCampaignDateIso?.() || window.WS_APP.CAMPAIGN_DATE_ISO || "2109-02-13";
      window.WS_APP.terminalCalendarState[id] = { monthIso: campaignIso, selectedIso: campaignIso };
    }
    return window.WS_APP.terminalCalendarState[id];
  }

  function setTerminalCalendarUiState(citizenId, patch = {}) {
    const id = String(citizenId || "local").trim() || "local";
    const state = getTerminalCalendarUiState(id);
    window.WS_APP.terminalCalendarState[id] = { ...state, ...patch };
    return window.WS_APP.terminalCalendarState[id];
  }

  function renderTerminalHubModule(user, panel = window.WS_APP.terminalActivePanel || "inbox") {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    const terminalGrid = document.querySelector(".terminal-grid");
    if (!container) return;

    terminalGrid?.classList.add("is-card-open");
    window.WS_APP.currentModuleId = "terminal-hub";
    window.WS_APP.terminalActivePanel = getSafeTerminalPanel(panel);

    const targetCitizen = getTerminalTargetCitizen(user);
    if (!targetCitizen) {
      container.innerHTML = renderTerminalUnavailable(user);
      window.WS_APP.bindModuleBackButton(user, () => window.WS_APP.renderModules(user));
      return;
    }

    const unread = window.WS_APP.countUnreadTerminalEntries?.(targetCitizen.id) || 0;
    const activePanel = window.WS_APP.terminalActivePanel;
    const panelTitle = getTerminalPanelTitle(activePanel);

    if (status) {
      status.textContent = `TERMINAL / ${panelTitle}`;
    }

    container.innerHTML = `
      <section class="module-detail module-detail--terminal" data-terminal-root data-terminal-citizen-id="${escapeHtml(targetCitizen.id)}">
        <div class="module-detail-head">
          <div>
            <p class="kicker">TERMINAL / LOCAL USER SESSION</p>
            <h4>Terminal</h4>
          </div>
          <button class="module-back-button" type="button">Back</button>
        </div>

        ${renderTerminalLocalSession(user, targetCitizen)}
        ${user.role === "admin" ? renderTerminalCitizenSwitcher(targetCitizen.id) : ""}
        <div data-terminal-panel-cards>
          ${renderTerminalPanelCards(activePanel, targetCitizen)}
        </div>
        <div class="terminal-panel-content" data-terminal-panel-content>
          ${renderTerminalPanelContent(activePanel, user, targetCitizen)}
        </div>
        <div data-terminal-calendar-shell>
          ${renderTerminalCalendar(targetCitizen)}
        </div>
      </section>
    `;

    window.WS_APP.bindModuleBackButton(user, () => window.WS_APP.renderModules(user));
    bindTerminalHubActions(user, targetCitizen);
    window.WS_APP.syncTerminalUnreadLabels?.();
    window.WS_APP.syncTerminalUnreadPulse?.();
  }

  function getSafeTerminalPanel(panel) {
    return ["inbox", "billing", "requests", "command"].includes(panel) ? panel : "inbox";
  }

  function renderTerminalPanelPartial(user, panel = window.WS_APP.terminalActivePanel || "inbox") {
    const root = document.querySelector("[data-terminal-root]");
    const cardsHost = root?.querySelector("[data-terminal-panel-cards]");
    const contentHost = root?.querySelector("[data-terminal-panel-content]");
    const calendarHost = root?.querySelector("[data-terminal-calendar-shell]");
    const targetCitizen = getTerminalTargetCitizen(user);
    const activePanel = getSafeTerminalPanel(panel);

    if (!root || !cardsHost || !contentHost || !calendarHost || !targetCitizen || root.dataset.terminalCitizenId !== String(targetCitizen.id || "")) {
      renderTerminalHubModule(user, activePanel);
      return;
    }

    window.WS_APP.currentModuleId = "terminal-hub";
    window.WS_APP.terminalActivePanel = activePanel;
    const status = document.querySelector("#module-status");
    if (status) {
      status.textContent = `TERMINAL / ${getTerminalPanelTitle(activePanel)}`;
    }

    cardsHost.innerHTML = renderTerminalPanelCards(activePanel, targetCitizen);
    contentHost.innerHTML = renderTerminalPanelContent(activePanel, user, targetCitizen);
    calendarHost.innerHTML = renderTerminalCalendar(targetCitizen);

    bindTerminalHubActions(user, targetCitizen);
    window.WS_APP.syncTerminalUnreadLabels?.();
    window.WS_APP.syncTerminalUnreadPulse?.();
  }
  function renderTerminalUnavailable(user) {
    return `
      <section class="module-detail module-detail--terminal">
        <div class="module-detail-head">
          <div>
            <p class="kicker">TERMINAL / LOCAL USER SESSION</p>
            <h4>Terminal</h4>
          </div>
          <button class="module-back-button" type="button">Back</button>
        </div>
        <p class="file-empty">No citizen profile is linked to this terminal session.</p>
      </section>
    `;
  }

  function getTerminalTargetCitizen(user) {
    if (!user) return null;
    if (user.role !== "admin") return window.WS_APP.getCitizenById?.(user.citizenId);

    const citizens = getTerminalTransferCitizens();
    const currentId = String(window.WS_APP.terminalTargetCitizenId || "").trim();
    const current = currentId ? citizens.find((citizen) => citizen.id === currentId) : null;
    const fallback = citizens[0] || window.WS_APP.getCitizenById?.(user.citizenId);
    const target = current || fallback;
    window.WS_APP.terminalTargetCitizenId = target?.id || "";
    return target || null;
  }

  function getTerminalPanelTitle(panel) {
    if (panel === "billing") return "BILLING";
    if (panel === "requests") return "SYSTEM REQUESTS";
    if (panel === "command") return "COMMAND LINE";
    return "INBOX";
  }

  function renderTerminalLocalSession(user, citizen) {
    const shortId = getCitizenShortId(citizen) || citizen.shortId || citizen.id;
    const profile = String(citizen.biologicalProfile || citizen.profile || "UNCLASSIFIED").toUpperCase();
    const dateLabel = window.WS_APP.getCampaignDateLabel?.() || window.WS_APP.CAMPAIGN_DATE_LABEL || "13.02.2109";
    const settlementLabel = window.WS_APP.getSettlementPeriodEndLabel?.() || window.WS_APP.SETTLEMENT_PERIOD_END_LABEL || "16.02.2109";

    return `
      <section class="terminal-local-session" aria-label="Local Session">
        <div class="terminal-local-session-head">
          <p class="kicker">LOCAL SESSION</p>
          <strong>NODE STATUS: SYNCHRONIZED</strong>
        </div>
        <div class="terminal-local-session-line">
          <span>USER: <b>${escapeHtml(user.displayName || user.login || "UNKNOWN")}</b></span>
          <span>SHORT ID: <b>${escapeHtml(shortId)}</b></span>
          <span>PROFILE: <b>${escapeHtml(profile)}</b></span>
          <span>DATE: <b>${escapeHtml(dateLabel)}</b></span>
          <span>NEXT SETTLEMENT PERIOD: <b>${escapeHtml(settlementLabel)}</b></span>
        </div>
      </section>
    `;
  }

  function renderTerminalCitizenSwitcher(selectedId) {
    const citizens = getTerminalTransferCitizens();
    return `
      <section class="terminal-admin-target">
        <label>
          <span>ADMIN TARGET TERMINAL</span>
          <select data-terminal-target-citizen>
            ${citizens.map((citizen) => `
              <option value="${escapeHtml(citizen.id)}" ${citizen.id === selectedId ? "selected" : ""}>${escapeHtml(getCitizenNameLabel(citizen, { legal: true }))} / ${escapeHtml(getCitizenShortId(citizen) || citizen.id)}</option>
            `).join("")}
          </select>
        </label>
      </section>
    `;
  }

  function renderTerminalPanelCards(activePanel, citizen) {
    const unread = window.WS_APP.countUnreadTerminalEntries?.(citizen.id) || 0;
    const ledger = getCitizenFinancialLedger(citizen);
    const requests = window.WS_APP.getServiceRequests?.(citizen.id) || [];
    const openRequests = requests.filter((request) => !["CLOSED", "DENIED"].includes(String(request.status || "").toUpperCase())).length;

    const panels = [
      { id: "inbox", title: "Terminal Inbox", badge: unread, badgeLabel: "Unread terminal entries", description: "System entries, warnings and linked actions." },
      { id: "billing", title: "Billing", meta: `${formatCredits(ledger.credits)} / debt ${formatCredits(ledger.debt)}`, description: "Credits, income, transfer, debt and subscription payments." },
      { id: "requests", title: "System Requests", badge: openRequests, badgeLabel: "Open system requests", description: "Submit requests to the system or local operator." },
      { id: "command", title: "Command Line", description: "Text interface for terminal shortcuts." }
    ];

    return `
      <div class="terminal-panel-card-grid system-segment-tabs" role="tablist" aria-label="Terminal sections">
        ${panels.map((panel) => `
          <button class="terminal-panel-card system-segment-tile system-segment-tile--card ${activePanel === panel.id ? "is-active" : ""} ${panel.badge !== undefined ? "has-badge" : ""} ${panel.badge === 0 ? "has-zero-badge" : ""}" type="button" role="tab" aria-selected="${activePanel === panel.id ? "true" : "false"}" data-terminal-panel="${escapeHtml(panel.id)}">
            ${panel.badge !== undefined ? `<em class="terminal-panel-badge ${panel.badge === 0 ? "is-empty" : "has-unread"}" aria-label="${escapeHtml(panel.badgeLabel || "Panel notification count")}">${escapeHtml(panel.badge)}</em>` : ""}
            <span class="system-segment-tile__body">
              <b class="system-segment-tile__title">${escapeHtml(panel.title)}</b>
              ${panel.meta ? `<strong class="system-segment-tile__meta">${escapeHtml(panel.meta)}</strong>` : ""}
              <small class="system-segment-tile__description">${escapeHtml(panel.description)}</small>
            </span>
          </button>
        `).join("")}
      </div>
    `;
  }

  function renderTerminalPanelContent(panel, user, citizen) {
    if (panel === "billing") {
      const renderBilling = window.WS_APP.renderTerminalBillingPanel;
      return typeof renderBilling === "function"
        ? renderBilling(user, citizen)
        : renderTerminalBillingUnavailable();
    }
    if (panel === "requests") return renderTerminalRequestsPanel(user, citizen);
    if (panel === "command") return renderTerminalCommandPanel(user, citizen);
    return renderTerminalInboxPanel(user, citizen);
  }

  function renderTerminalBillingUnavailable() {
    return `
      <section class="terminal-subpanel terminal-billing-panel">
        <header class="terminal-subpanel-head terminal-billing-head">
          <div>
            <p class="kicker">TERMINAL / BILLING</p>
            <h5>Financial Control</h5>
          </div>
        </header>
        <p class="file-empty">Billing module is not available in this runtime.</p>
      </section>
    `;
  }

  function renderTerminalCalendar(citizen) {
    const campaignIso = window.WS_APP.getCampaignDateIso?.() || window.WS_APP.CAMPAIGN_DATE_ISO || "2109-02-13";
    const settlementIso = window.WS_APP.getSettlementPeriodEndIso?.() || window.WS_APP.SETTLEMENT_PERIOD_END_ISO || "";
    const calendarState = getTerminalCalendarUiState(citizen?.id);
    const calendarMonthIso = /^\d{4}-\d{2}-\d{2}$/.test(String(calendarState.monthIso || "")) ? calendarState.monthIso : campaignIso;
    const selectedIso = /^\d{4}-\d{2}-\d{2}$/.test(String(calendarState.selectedIso || "")) ? calendarState.selectedIso : campaignIso;
    setTerminalCalendarUiState(citizen?.id, { monthIso: calendarMonthIso, selectedIso });
    const reminders = window.WS_APP.getTerminalCalendarReminders?.(citizen?.id) || [];
    const calendar = buildTerminalCalendar(campaignIso, settlementIso, calendarMonthIso, reminders, selectedIso);

    return `
      <section class="terminal-calendar-panel" aria-label="Terminal Calendar">
        <header class="terminal-calendar-head">
          <div>
            <p class="kicker">TERMINAL / CALENDAR</p>
            <h5>${escapeHtml(calendar.monthLabel)}</h5>
          </div>
          <div class="terminal-calendar-head-side">
            <strong>DATE: ${escapeHtml(calendar.currentLabel)}</strong>
            <nav class="terminal-calendar-nav" aria-label="Calendar month navigation">
              <button type="button" data-terminal-calendar-nav="-1">PREV</button>
              <button type="button" data-terminal-calendar-nav="0">DATE</button>
              <button type="button" data-terminal-calendar-nav="1">NEXT</button>
            </nav>
          </div>
        </header>
        <div class="terminal-calendar-weekdays" aria-hidden="true">
          ${calendar.weekdays.map((day) => `<span>${escapeHtml(day)}</span>`).join("")}
        </div>
        <div class="terminal-calendar-grid">
          ${calendar.days.map((day) => {
            const labels = [];
            const firstColor = Array.isArray(day.reminderColors) && day.reminderColors.length ? Math.max(0, Math.min(5, Number(day.reminderColors[0] || 0))) : null;
            if (day.current) labels.push("DATE");
            if (day.settlement) labels.push("SET");
            if (day.selected && !day.current) labels.push("SEL");
            if (day.reminderCount) labels.push(day.reminderCount > 1 ? `REM ${day.reminderCount}` : "REM");
            return `
            <button type="button" data-terminal-calendar-date="${escapeHtml(day.iso)}" class="terminal-calendar-day ${day.outside ? "is-outside" : ""} ${day.sunday ? "is-sunday" : ""} ${day.current ? "is-current" : ""} ${day.selected ? "is-selected" : ""} ${day.settlement ? "is-settlement" : ""} ${day.reminderCount ? "has-reminder" : ""} ${firstColor !== null ? `terminal-reminder-color-${escapeHtml(firstColor)}` : ""}" aria-label="Select ${escapeHtml(formatDateDisplay(day.iso))}">
              <span>${escapeHtml(day.dayLabel)}</span>
              ${labels.length ? `<b>${labels.map((label) => escapeHtml(label)).join(" / ")}</b>` : ""}
            </button>`;
          }).join("")}
        </div>

        <section class="terminal-calendar-reminders">
          <div class="terminal-calendar-reminders-head">
            <h6>Calendar Reminders</h6>
            <small>Select a date in the calendar, then register a reminder below.</small>
          </div>
          <form class="terminal-calendar-reminder-form" data-terminal-reminder-form>
            <div class="terminal-calendar-selected-date">
              <span>Selected date</span>
              <b>${escapeHtml(formatDateDisplay(selectedIso))}</b>
              <input name="date" type="hidden" value="${escapeHtml(selectedIso)}" />
            </div>
            <label><span>Entry</span><input name="title" type="text" maxlength="80" placeholder="Reminder title" required /></label>
            <label><span>Notify before</span><input name="notifyDaysBefore" type="number" min="0" max="365" step="1" value="1" required /></label>
            <label class="terminal-calendar-color-field">
              <span>Marker color</span>
              <details class="terminal-calendar-color-panel">
                <summary>
                  <b class="terminal-reminder-color-0"></b>
                </summary>
                <div class="terminal-calendar-color-bars" aria-label="Reminder color">
                  ${TERMINAL_REMINDER_COLORS.map((colorIndex) => `
                    <label class="terminal-calendar-color-option terminal-reminder-color-${escapeHtml(colorIndex)}">
                      <input type="radio" name="colorIndex" value="${escapeHtml(colorIndex)}" ${colorIndex === 0 ? "checked" : ""} />
                      <span></span>
                    </label>
                  `).join("")}
                </div>
              </details>
            </label>
            <label class="is-wide"><span>Details</span><input name="body" type="text" maxlength="180" placeholder="Optional details" /></label>
            <button type="submit">Add Entry</button>
          </form>
          <div class="terminal-calendar-reminder-list">
            ${reminders.length ? reminders.slice(0, 8).map((reminder) => {
              const colorIndex = Math.max(0, Math.min(5, Number(reminder.colorIndex || 0)));
              return `
              <article class="terminal-calendar-reminder-entry terminal-reminder-color-${escapeHtml(colorIndex)} ${String(reminder.notifiedAt || "").trim() ? "is-notified" : ""}">
                <span>
                  <b>${escapeHtml(reminder.title)}</b>
                  <small>${escapeHtml(formatDateDisplay(reminder.date))} / notify ${escapeHtml(reminder.notifyDaysBefore)} day(s) before${reminder.notifiedAt ? ` / notified ${escapeHtml(formatDateDisplay(reminder.notifiedAt))}` : ""}</small>
                </span>
                <button type="button" data-terminal-reminder-close="${escapeHtml(reminder.id)}">Close</button>
              </article>
            `; }).join("") : '<p class="file-empty">No calendar reminders registered.</p>'}
          </div>
        </section>
      </section>
    `;
  }

  function buildTerminalCalendar(campaignIso, settlementIso, viewMonthIso = campaignIso, reminders = [], selectedIso = campaignIso) {
    const current = parseIsoDateUtc(campaignIso) || parseIsoDateUtc("2109-02-13");
    const selected = parseIsoDateUtc(selectedIso) || current;
    const view = parseIsoDateUtc(viewMonthIso) || current;
    const reminderCounts = new Map();
    const reminderColors = new Map();
    (Array.isArray(reminders) ? reminders : []).forEach((reminder) => {
      const iso = String(reminder?.date || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
      const colorIndex = Math.max(0, Math.min(7, Number(reminder?.colorIndex || 0)));
      reminderCounts.set(iso, (reminderCounts.get(iso) || 0) + 1);
      reminderColors.set(iso, [...(reminderColors.get(iso) || []), colorIndex]);
    });
    const monthStart = new Date(Date.UTC(view.getUTCFullYear(), view.getUTCMonth(), 1));
    const firstDay = monthStart.getUTCDay();
    const mondayOffset = (firstDay + 6) % 7;
    const gridStart = new Date(monthStart);
    gridStart.setUTCDate(gridStart.getUTCDate() - mondayOffset);

    const days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setUTCDate(gridStart.getUTCDate() + index);
      const iso = date.toISOString().slice(0, 10);
      return {
        iso,
        dayLabel: String(date.getUTCDate()).padStart(2, "0"),
        outside: date.getUTCMonth() !== view.getUTCMonth(),
        sunday: date.getUTCDay() === 0,
        current: iso === current.toISOString().slice(0, 10),
        selected: iso === selected.toISOString().slice(0, 10),
        settlement: date.getUTCDay() === 0,
        reminderCount: reminderCounts.get(iso) || 0,
        reminderColors: reminderColors.get(iso) || []
      };
    });

    const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(view).toUpperCase();
    return {
      monthLabel,
      currentLabel: window.WS_APP.getCampaignDateLabel?.() || formatDateDisplay(campaignIso),
      weekdays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
      days
    };
  }

  function parseIsoDateUtc(value) {
    const iso = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const date = new Date(`${iso}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? date : null;
  }

  function getTerminalInboxSelectionState(citizenId = "") {
    const current = window.WS_APP.terminalInboxSelection || {};
    const id = String(citizenId || "").trim();
    if (!id || current.citizenId !== id) return { citizenId: id, active: false, ids: [] };
    const ids = Array.from(new Set((Array.isArray(current.ids) ? current.ids : [])
      .map((entryId) => String(entryId || "").trim())
      .filter(Boolean)));
    return { citizenId: id, active: current.active === true, ids };
  }

  function setTerminalInboxSelectionState(citizenId = "", patch = {}) {
    const id = String(citizenId || "").trim();
    const current = getTerminalInboxSelectionState(id);
    const nextIds = patch.ids === undefined
      ? current.ids
      : Array.from(new Set((Array.isArray(patch.ids) ? patch.ids : [])
        .map((entryId) => String(entryId || "").trim())
        .filter(Boolean)));
    window.WS_APP.terminalInboxSelection = {
      citizenId: id,
      active: patch.active === undefined ? current.active : patch.active === true,
      ids: nextIds
    };
    return window.WS_APP.terminalInboxSelection;
  }

  function clearTerminalInboxSelection(citizenId = "") {
    return setTerminalInboxSelectionState(citizenId, { active: false, ids: [] });
  }

  function renderTerminalInboxPanel(user, citizen) {
    const storedView = String(window.WS_APP.terminalInboxView || "ALL").toUpperCase();
    const activeView = ["ALL", "UNREAD", "IMPORTANT", "READ", "TRASH"].includes(storedView) ? storedView : "ALL";
    const activeFolder = activeView === "TRASH" ? "TRASH" : "INBOX";
    const inboxEntries = window.WS_APP.getTerminalEntries?.(citizen.id, { folder: "INBOX" }) || [];
    const trashEntries = window.WS_APP.getTerminalEntries?.(citizen.id, { folder: "TRASH" }) || [];
    const sourceEntries = activeFolder === "TRASH" ? trashEntries : inboxEntries;
    const activeType = String(window.WS_APP.terminalInboxTypeFilter || "ALL").toUpperCase();
    const activeSort = String(window.WS_APP.terminalInboxSort || "NEWEST").toUpperCase();
    const unread = inboxEntries.filter((entry) => entry.read !== true).length;
    const important = inboxEntries.filter((entry) => entry.important === true).length;
    const read = inboxEntries.filter((entry) => entry.read === true).length;
    const trash = trashEntries.length;
    const filteredEntries = sortTerminalInboxEntries(filterTerminalInboxEntries(sourceEntries, activeView, activeType), activeSort);
    const selection = getTerminalInboxSelectionState(citizen.id);
    const selectionIds = new Set(selection.ids);
    const visibleIds = filteredEntries.map((entry) => entry.id).filter(Boolean);
    const selectedVisibleCount = visibleIds.filter((id) => selectionIds.has(id)).length;
    const hasSelection = selection.active && selection.ids.length > 0;
    const selectControlsDisabled = selection.active ? "" : "disabled";
    const bulkActionDisabled = hasSelection ? "" : "disabled";
    const emptyMessage = filteredEntries.length ? "" : renderTerminalInboxEmptyLabel(activeView, activeType);

    return `
      <section class="terminal-subpanel terminal-inbox-panel ${selection.active ? "is-select-mode" : ""}">
        <header class="terminal-subpanel-head terminal-inbox-head">
          <div>
            <p class="kicker">TERMINAL / INBOX</p>
          </div>
          <div class="terminal-subpanel-actions terminal-inbox-actions">
            <button type="button" class="terminal-select-mode-toggle ${selection.active ? "is-active" : ""}" data-terminal-select-mode>${selection.active ? "EXIT SELECT" : "SELECT MODE"}</button>
            <button type="button" data-terminal-mark-all-read ${activeFolder === "INBOX" && unread ? "" : "disabled"}>Mark All Read</button>
          </div>
        </header>
        <nav class="terminal-inbox-filter-tabs system-inline-tabs" role="tablist" aria-label="Terminal entry folders">
          ${renderTerminalInboxFilterButton("ALL", "All", activeView, inboxEntries.length)}
          ${renderTerminalInboxFilterButton("UNREAD", "Unread", activeView, unread)}
          ${renderTerminalInboxFilterButton("IMPORTANT", "Important", activeView, important)}
          ${renderTerminalInboxFilterButton("READ", "Read", activeView, read)}
          ${renderTerminalInboxFilterButton("TRASH", "Trash", activeView, trash)}
        </nav>
        <div class="terminal-inbox-bulk-actions ${selection.active ? "" : "is-disabled"}" data-terminal-bulk-actions data-visible-ids="${escapeHtml(visibleIds.join(","))}">
          <button type="button" data-terminal-select-visible ${selection.active && visibleIds.length ? "" : "disabled"}>${selectedVisibleCount === visibleIds.length && visibleIds.length ? "UNSELECT VISIBLE" : "SELECT VISIBLE"}</button>
          <button type="button" data-terminal-select-clear ${selectControlsDisabled}>CLEAR SELECTION</button>
          <button type="button" data-terminal-bulk-action="MARK_READ" ${bulkActionDisabled}>Mark read</button>
          <button type="button" data-terminal-bulk-action="MARK_UNREAD" ${bulkActionDisabled}>Mark unread</button>
          <button type="button" data-terminal-bulk-action="MARK_IMPORTANT" ${bulkActionDisabled}>Mark important</button>
          <button type="button" data-terminal-bulk-action="UNMARK_IMPORTANT" ${bulkActionDisabled}>Unmark important</button>
          <button type="button" data-terminal-bulk-action="${activeFolder === "TRASH" ? "RESTORE" : "TRASH"}" ${bulkActionDisabled}>${activeFolder === "TRASH" ? "Restore" : "Move to Trash"}</button>
          ${activeFolder === "TRASH" ? `<button type="button" data-terminal-bulk-action="DELETE" ${bulkActionDisabled}>Delete permanently</button>` : ""}
        </div>
        <div class="terminal-inbox-list-toolbar">
          <p class="file-empty terminal-inbox-result-state">${emptyMessage}</p>
          <div class="terminal-inbox-sort-controls">
            ${renderTerminalInboxTypeFilterMenu(activeType, sourceEntries)}
            <select data-terminal-inbox-sort aria-label="Sort terminal entries">
              ${[
                ["NEWEST", "NEWEST"],
                ["OLDEST", "OLDEST"],
                ["IMPORTANT_FIRST", "IMPORTANT FIRST"],
                ["UNREAD_FIRST", "UNREAD FIRST"]
              ].map(([value, label]) => `<option value="${escapeHtml(value)}" ${activeSort === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="terminal-entry-list" data-terminal-entry-list>
          ${filteredEntries.length ? filteredEntries.map((entry) => renderTerminalEntryCard(entry, activeFolder, selection, user)).join("") : ""}
        </div>
      </section>
    `;
  }

  function renderTerminalInboxFilterButton(value, label, activeView, count) {
    return `<button type="button" class="system-inline-tab ${activeView === value ? "is-active" : ""}" role="tab" aria-selected="${activeView === value ? "true" : "false"}" data-terminal-inbox-view="${escapeHtml(value)}">${escapeHtml(label)} <b class="system-inline-tab__count">${escapeHtml(count || 0)}</b></button>`;
  }

  function formatTerminalFilterLabel(value = "") {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ");
  }

  function getTerminalInboxLegacyCategoryDefinitions() {
    return [
      { id: "BILLING", label: "BILLING", match: ({ type }) => type === "BILLING" },
      { id: "PAYMENT", label: "PAYMENT", match: ({ subtype, tags }) => /PAYMENT|PAYOUT|SETTLEMENT/.test(subtype) || tags.some((tag) => /PAYMENT|PAYOUT|SETTLEMENT/.test(tag)) },
      { id: "DEBT", label: "DEBT", match: ({ subtype, tags }) => /DEBT/.test(subtype) || tags.some((tag) => /DEBT/.test(tag)) },
      { id: "SUBSCRIPTION", label: "SUBSCRIPTION", match: ({ type }) => type === "SUBSCRIPTION" },
      { id: "SERVICE", label: "SERVICE", match: ({ type, subtype }) => type === "SERVICE" && !/INCOME_SOURCE/.test(subtype) },
      { id: "INCOME", label: "INCOME", match: ({ subtype, tags }) => /INCOME_SOURCE|INCOME|COMMISSION_PAYOUT/.test(subtype) || tags.some((tag) => /INCOME|PAYOUT/.test(tag)) },
      { id: "REQUEST", label: "REQUEST", match: ({ type }) => type === "REQUEST" },
      { id: "CALENDAR", label: "CALENDAR", match: ({ type, subtype }) => type === "CALENDAR" || /DEADLINE|REMINDER|APPOINTMENT/.test(subtype) },
      { id: "PROFILE", label: "PROFILE", match: ({ type, subtype }) => type === "PROFILE" && !/INCOME_SOURCE|RISK|COMPLIANCE/.test(subtype) },
      { id: "RISK", label: "RISK", match: ({ subtype, tags }) => /RISK|COMPLIANCE/.test(subtype) || tags.some((tag) => /RISK|COMPLIANCE/.test(tag)) },
      { id: "ACCESS", label: "ACCESS", match: ({ type, subtype }) => type === "ACCESS" || /ACCESS|CLEARANCE|VISIBILITY/.test(subtype) },
      { id: "DATABASE", label: "DATABASE", match: ({ type, subtype }) => type === "DATABASE" || /DATABASE|RECORD|CASE_FILE|CITIZEN_FILE|CITIZEN_RECORD/.test(subtype) },
      { id: "SYSTEM", label: "SYSTEM", match: ({ type }) => type === "SYSTEM" }
    ];
  }

  function getTerminalInboxEntryFilterContext(entry = {}) {
    return {
      schemaVersion: Math.max(1, Number(entry.schemaVersion || 1) || 1),
      eventCode: String(entry.eventCode || "").trim().toUpperCase(),
      domain: String(entry.domain || entry.type || "SYSTEM").trim().toUpperCase(),
      category: String(entry.category || entry.domain || entry.type || "SYSTEM").trim().toUpperCase(),
      type: String(entry.type || "SYSTEM").trim().toUpperCase(),
      subtype: String(entry.subtype || "").trim().toUpperCase(),
      tags: (Array.isArray(entry.tags) ? entry.tags : []).map((tag) => String(tag || "").trim().toUpperCase()).filter(Boolean)
    };
  }

  function getTerminalInboxCatalogFilterGroups(entries = []) {
    const entryList = Array.isArray(entries) ? entries : [];
    const contexts = entryList.map(getTerminalInboxEntryFilterContext);
    const catalog = window.WS_APP.notificationRegistry?.getEvents?.() || [];
    const eventMap = new Map(catalog.map((event) => [String(event.eventCode || "").trim().toUpperCase(), event]));
    const domains = new Map();
    const categories = new Map();
    const events = new Map();

    contexts.forEach((context) => {
      if (context.domain) domains.set(context.domain, formatTerminalFilterLabel(context.domain));
      if (context.category) categories.set(context.category, formatTerminalFilterLabel(context.category));
      if (context.eventCode) {
        const eventDefinition = eventMap.get(context.eventCode);
        events.set(context.eventCode, String(eventDefinition?.label || formatTerminalFilterLabel(context.eventCode)).trim());
      }
    });

    return {
      domains: Array.from(domains.entries()).sort((a, b) => a[1].localeCompare(b[1])),
      categories: Array.from(categories.entries()).sort((a, b) => a[1].localeCompare(b[1])),
      events: Array.from(events.entries()).sort((a, b) => a[1].localeCompare(b[1]))
    };
  }

  function normalizeTerminalInboxTypeFilter(value = "ALL") {
    const raw = String(value || "ALL").trim().toUpperCase();
    if (!raw || raw === "ALL") return "ALL";
    if (/^(DOMAIN|EVENT_CATEGORY|EVENT|CATEGORY|TAG|TYPE|SUBTYPE):/.test(raw)) return raw;
    const categoryIds = new Set(getTerminalInboxLegacyCategoryDefinitions().map((item) => item.id));
    return categoryIds.has(raw) ? `CATEGORY:${raw}` : `TYPE:${raw}`;
  }

  function getTerminalInboxTypeFilterLabel(value = "ALL") {
    const normalized = normalizeTerminalInboxTypeFilter(value);
    if (normalized === "ALL") return "ALL TYPES";
    const [scope, ...rest] = normalized.split(":");
    const id = rest.join(":");
    if (scope === "CATEGORY") {
      return getTerminalInboxLegacyCategoryDefinitions().find((item) => item.id === id)?.label || formatTerminalFilterLabel(id);
    }
    if (scope === "TAG") return formatTerminalFilterLabel(id);
    return formatTerminalFilterLabel(id);
  }

  function renderTerminalInboxTypeFilterMenu(activeFilter = "ALL", entries = []) {
    const active = normalizeTerminalInboxTypeFilter(activeFilter);
    const entryList = Array.isArray(entries) ? entries : [];
    const catalogGroups = getTerminalInboxCatalogFilterGroups(entryList);
    const legacyCategories = getTerminalInboxLegacyCategoryDefinitions().filter((category) => entryList.some((entry) => {
      const context = getTerminalInboxEntryFilterContext(entry);
      return context.schemaVersion < 2 && category.match(context);
    }));
    const tagMap = new Map();
    entryList.forEach((entry) => getTerminalInboxEntryFilterContext(entry).tags.forEach((tag) => {
      const mapped = getTerminalInboxTagFilterCategory(tag);
      if (mapped) tagMap.set(mapped.id, mapped.label);
    }));

    const renderOption = (value, label) => `<button type="button" class="${active === value ? "is-selected" : ""}" data-terminal-inbox-type-option="${escapeHtml(value)}" aria-pressed="${active === value ? "true" : "false"}">${escapeHtml(label)}</button>`;
    const domainOptions = catalogGroups.domains.map(([id, label]) => renderOption(`DOMAIN:${id}`, label)).join("");
    const categoryOptions = catalogGroups.categories.map(([id, label]) => renderOption(`EVENT_CATEGORY:${id}`, label)).join("");
    const eventOptions = catalogGroups.events.map(([id, label]) => renderOption(`EVENT:${id}`, label)).join("");
    const legacyOptions = legacyCategories.map((item) => renderOption(`CATEGORY:${item.id}`, item.label)).join("");
    const tagOptions = Array.from(tagMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, label]) => renderOption(`TAG:${id}`, label))
      .join("");

    return `
      <details class="terminal-inbox-filter-menu" data-terminal-inbox-type-filter-menu>
        <summary aria-label="Filter terminal entries by event catalog">${escapeHtml(getTerminalInboxTypeFilterLabel(active))}</summary>
        <div class="terminal-inbox-filter-menu-panel">
          ${renderOption("ALL", "ALL TYPES")}
          ${domainOptions ? `<span>EVENT DOMAINS</span>${domainOptions}` : ""}
          ${categoryOptions ? `<span>EVENT CATEGORIES</span>${categoryOptions}` : ""}
          ${eventOptions ? `<span>EVENT TYPES</span>${eventOptions}` : ""}
          ${legacyOptions ? `<span>LEGACY CATEGORIES</span>${legacyOptions}` : ""}
          ${tagOptions ? `<span>ENTRY TAGS</span>${tagOptions}` : ""}
        </div>
      </details>
    `;
  }

  function getTerminalInboxTagFilterCategory(tag = "") {
    const value = String(tag || "").trim().toUpperCase();
    if (!value) return null;
    if (/ACCESS|CLEARANCE/.test(value)) return { id: "ACCESS", label: "ACCESS" };
    if (/CASE|CITIZEN|DATABASE|RECORD|FILE/.test(value)) return { id: "DATABASE", label: "DATABASE" };
    if (/INCOME|PAYOUT/.test(value)) return { id: "INCOME", label: "INCOME" };
    if (/SUBSCRIPTION|TIER|SERVICE|BILLING|PAYMENT|DEBT|REQUEST|CALENDAR|PROFILE|RISK|SYSTEM/.test(value)) {
      return { id: value.replace(/\s+/g, "_"), label: value.replaceAll("_", " ") };
    }
    return { id: value.replace(/\s+/g, "_"), label: value.replaceAll("_", " ") };
  }


  function filterTerminalInboxEntries(entries, view, type) {
    const activeFilter = normalizeTerminalInboxTypeFilter(type);
    return (Array.isArray(entries) ? entries : []).filter((entry) => {
      if (view === "UNREAD" && entry.read === true) return false;
      if (view === "READ" && entry.read !== true) return false;
      if (view === "IMPORTANT" && entry.important !== true) return false;
      if (activeFilter !== "ALL") {
        const [scope, expected] = activeFilter.split(":");
        const context = getTerminalInboxEntryFilterContext(entry);
        if (scope === "CATEGORY") {
          const category = getTerminalInboxLegacyCategoryDefinitions().find((item) => item.id === expected);
          if (!category || !category.match(context)) return false;
        }
        if (scope === "DOMAIN" && context.domain !== expected) return false;
        if (scope === "EVENT_CATEGORY" && context.category !== expected) return false;
        if (scope === "EVENT" && context.eventCode !== expected) return false;
        if (scope === "TYPE" && context.type !== expected) return false;
        if (scope === "SUBTYPE" && context.subtype !== expected) return false;
        if (scope === "TAG") {
          const mappedTags = context.tags.map((tag) => getTerminalInboxTagFilterCategory(tag)?.id).filter(Boolean);
          if (!context.tags.includes(expected) && !mappedTags.includes(expected)) return false;
        }
      }
      return true;
    });
  }

  function getTerminalEntrySortIndex(entry = {}) {
    const explicit = Number(entry.sortIndex ?? entry.entryOrder ?? entry.orderIndex);
    if (Number.isFinite(explicit)) return explicit;
    const timestamp = Date.parse(getTerminalEntryTimestamp(entry));
    if (Number.isFinite(timestamp)) return timestamp;
    const match = String(entry.id || "").match(/-(\d{10,})-/);
    return match ? Number(match[1]) || 0 : 0;
  }

  function compareTerminalEntriesNewest(a = {}, b = {}) {
    const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
    if (dateCompare) return dateCompare;
    const sortCompare = getTerminalEntrySortIndex(b) - getTerminalEntrySortIndex(a);
    if (sortCompare) return sortCompare;
    const createdCompare = String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    if (createdCompare) return createdCompare;
    return String(b.id || "").localeCompare(String(a.id || ""));
  }

  function compareTerminalEntriesOldest(a = {}, b = {}) {
    const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
    if (dateCompare) return dateCompare;
    const sortCompare = getTerminalEntrySortIndex(a) - getTerminalEntrySortIndex(b);
    if (sortCompare) return sortCompare;
    const createdCompare = String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    if (createdCompare) return createdCompare;
    return String(a.id || "").localeCompare(String(b.id || ""));
  }

  function sortTerminalInboxEntries(entries, sortMode) {
    const mode = String(sortMode || "NEWEST").toUpperCase();
    const list = [...(Array.isArray(entries) ? entries : [])];
    return list.sort((a, b) => {
      if (mode === "IMPORTANT_FIRST" && a.important !== b.important) return a.important ? -1 : 1;
      if (mode === "UNREAD_FIRST" && a.read !== b.read) return a.read ? 1 : -1;
      if (mode === "OLDEST") return compareTerminalEntriesOldest(a, b);
      return compareTerminalEntriesNewest(a, b);
    });
  }

  function renderTerminalInboxEmptyLabel(view, type) {
    const viewLabel = String(view || "ALL").toUpperCase().replaceAll("_", " ");
    const typeLabel = String(type || "ALL").toUpperCase();
    if (viewLabel === "TRASH") return "Trash is empty.";
    if (typeLabel !== "ALL") return `No terminal entries match ${escapeHtml(viewLabel)} / ${escapeHtml(typeLabel)}.`;
    if (viewLabel === "UNREAD") return "No unread terminal entries.";
    if (viewLabel === "IMPORTANT") return "No important terminal entries.";
    if (viewLabel === "READ") return "No read terminal entries.";
    return "No terminal entries registered.";
  }

  function renderTerminalInboxEmptyState(view, type) {
    return `<p class="file-empty">${renderTerminalInboxEmptyLabel(view, type)}</p>`;
  }

  function isTerminalStructuredEmptyValue(value = "") {
    const normalized = String(value ?? "").trim();
    return !normalized || normalized === "-" || /^n\/?a$/i.test(normalized) || /^none$/i.test(normalized) || /^undefined$/i.test(normalized) || /^null$/i.test(normalized);
  }

  function normalizeTerminalStructuredRowsForRender(rows = [], options = {}) {
    const hideEmpty = options.hideEmpty === true;
    return (Array.isArray(rows) ? rows : [])
      .map((row) => {
        const source = Array.isArray(row) ? { label: row[0], value: row[1] } : row;
        const label = String(source?.label || source?.name || source?.title || "").trim();
        const value = String(source?.value ?? source?.amount ?? "").trim();
        if (hideEmpty && isTerminalStructuredEmptyValue(value)) return null;
        return label || value ? { label, value } : null;
      })
      .filter(Boolean);
  }

  function normalizeTerminalFinanceRowsForRender(rows = []) {
    return normalizeTerminalStructuredRowsForRender(rows);
  }

  function getTerminalStructuredLayoutSlug(layout = "") {
    return String(layout || "structured")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-") || "structured";
  }

  function isTerminalFinanceLayout(layout = "") {
    return /^finance-/.test(String(layout || "").trim().toLowerCase());
  }

  function getTerminalFinanceValueClass(row = {}) {
    const label = String(row.label || "").trim().toLowerCase();
    if (!/change/.test(label)) return "";
    const value = String(row.value || "").trim();
    if (/^-/.test(value)) return "is-negative-change";
    if (/^\+/.test(value)) {
      const amount = parseCreditValue(value);
      return amount === 0 ? "is-neutral-change" : "is-positive-change";
    }
    return "is-neutral-change";
  }

  function renderTerminalFinanceRows(rows = []) {
    const normalized = normalizeTerminalFinanceRowsForRender(rows);
    if (!normalized.length) return "";
    return normalized.map((row) => {
      const valueClass = getTerminalFinanceValueClass(row);
      const displayValue = formatTerminalRowValue(row.label, row.value || "-");
      return `
        <span>${escapeHtml(row.label)}</span>
        <strong class="${escapeHtml(valueClass)}">${escapeHtml(displayValue)}</strong>
      `;
    }).join("");
  }

  function getTerminalDomainRowLength(rows = []) {
    return normalizeTerminalStructuredRowsForRender(rows, { hideEmpty: true })
      .reduce((total, row) => total + String(row.label || "").length + String(row.value || "").length, 0);
  }

  function renderTerminalRecordRows(rows = []) {
    const normalized = normalizeTerminalStructuredRowsForRender(rows, { hideEmpty: true });
    if (!normalized.length) return "";
    return `<div class="terminal-domain-row-list">${normalized.map((row) => {
      const displayValue = formatTerminalRowValue(row.label, row.value || "-");
      return `
        <span class="terminal-domain-row-label">${escapeHtml(row.label)}</span>
        <strong class="terminal-domain-row-value">${escapeHtml(displayValue)}</strong>
      `;
    }).join("")}</div>`;
  }

  function renderTerminalDomainFinalRows(rows = []) {
    const normalized = normalizeTerminalStructuredRowsForRender(rows, { hideEmpty: true });
    if (!normalized.length) return "";
    return `<div class="terminal-domain-final-items">${normalized.map((row) => `
      <span><b>${escapeHtml(row.label)}</b><strong>${escapeHtml(formatTerminalRowValue(row.label, row.value || "-"))}</strong></span>
    `).join("")}</div>`;
  }

  function renderTerminalFinanceEntry(entry = {}, panels = [], finalRows = []) {
    const layout = String(entry.layout || "finance-transfer").trim().toLowerCase();
    return `
      <div class="terminal-entry-structured terminal-entry-finance ${escapeHtml(layout)}">
        ${panels.length ? `<div class="terminal-finance-panel-grid" style="--finance-panel-count:${Math.max(1, Math.min(3, panels.length))}">
          ${panels.map((panel) => `
            <section class="terminal-finance-panel">
              ${panel.title ? `<h6>${escapeHtml(panel.title)}</h6>` : ""}
              <div class="terminal-finance-panel-rows">
                ${renderTerminalFinanceRows(panel.rows)}
              </div>
            </section>
          `).join("")}
        </div>` : ""}
        ${finalRows.length ? `
          <section class="terminal-finance-final-row">
            <h6>FINAL SETTLEMENT</h6>
            <div class="terminal-finance-final-items">
              ${finalRows.map((row) => `
                <span><b>${escapeHtml(row.label)}</b><strong class="${escapeHtml(getTerminalFinanceValueClass(row))}">${escapeHtml(formatTerminalRowValue(row.label, row.value || "-"))}</strong></span>
              `).join("")}
            </div>
          </section>
        ` : ""}
      </div>
    `;
  }

  function getTerminalDomainPanelRole(panel = {}) {
    const explicitRole = String(panel.role || "").trim().toLowerCase();
    if (["subject", "change", "status", "finance", "warning", "action", "metadata"].includes(explicitRole)) return explicitRole;
    const title = String(panel.title || "").trim().toUpperCase();
    if (["BILLING", "CHARGE", "ACCOUNT", "PAYOUT", "PAYMENT", "EXPECTED", "FAILED PAYMENT"].includes(title)) return title === "FAILED PAYMENT" ? "warning" : "finance";
    if (["PLAN CHANGE", "STATUS CHANGE", "CHANGE", "DECISION", "CLASSIFICATION"].includes(title)) return "change";
    if (["STATUS", "DEADLINE", "SETTLEMENT"].includes(title)) return "status";
    if (["WARNING"].includes(title)) return "warning";
    if (["ACTION"].includes(title)) return "action";
    if (["SYSTEM", "NOTICE", "SUMMARY"].includes(title)) return "metadata";
    return "subject";
  }

  function getTerminalDomainContentProfile(entry = {}, panels = [], finalRows = []) {
    const type = String(entry.type || "SYSTEM").trim().toUpperCase();
    const subtype = String(entry.subtype || "").trim().toUpperCase();
    const normalizedPanels = Array.isArray(panels) ? panels : [];
    const normalizedFinalRows = normalizeTerminalStructuredRowsForRender(finalRows, { hideEmpty: true });
    const panelCount = normalizedPanels.length;
    const rowCounts = normalizedPanels.map((panel) => normalizeTerminalStructuredRowsForRender(panel.rows, { hideEmpty: true }).length);
    const totalRows = rowCounts.reduce((sum, count) => sum + count, normalizedFinalRows.length);
    const maxPanelRows = Math.max(0, ...rowCounts);
    const textLength = normalizedPanels.reduce((sum, panel) => sum + getTerminalDomainRowLength(panel.rows), 0)
      + normalizedFinalRows.reduce((sum, row) => sum + String(row.label || "").length + String(row.value || "").length, 0);
    const hasLongContent = textLength > 220 || normalizedPanels.some((panel) => getTerminalDomainRowLength(panel.rows) > 110);
    const hasNarrativePanel = normalizedPanels.some((panel) => normalizeTerminalStructuredRowsForRender(panel.rows, { hideEmpty: true })
      .some((row) => String(row.value || "").length > 72));

    return {
      type,
      subtype,
      panelCount,
      totalRows,
      maxPanelRows,
      textLength,
      hasLongContent,
      hasNarrativePanel
    };
  }

  function getTerminalEntryVisualContract(entry = {}, panels = [], finalRows = []) {
    const profile = getTerminalDomainContentProfile(entry, panels, finalRows);
    const columnsFor = (count) => Math.max(1, Math.min(3, count || 1));

    if (profile.type === "SYSTEM") {
      return { mode: "single", columns: 1, variant: "system-notice", density: "compact" };
    }

    if (profile.panelCount <= 1) {
      const density = profile.totalRows <= 4 && !profile.hasLongContent ? "compact" : "standard";
      return { mode: "single", columns: 1, variant: "single-panel", density };
    }

    if (profile.hasNarrativePanel && profile.maxPanelRows > 4) {
      return { mode: "stack", columns: 1, variant: "narrative", density: "standard" };
    }

    const columns = columnsFor(profile.panelCount);
    const density = profile.maxPanelRows <= 3 && profile.totalRows <= 8 ? "tight" : "standard";
    return { mode: "grid", columns, variant: `${profile.type.toLowerCase()}-grid`, density };
  }

  function getTerminalDomainPanelClass(panel = {}, contract = {}) {
    const title = String(panel.title || "DETAILS").trim().toUpperCase();
    const titleSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "details";
    const role = getTerminalDomainPanelRole(panel);
    const rows = normalizeTerminalStructuredRowsForRender(panel.rows, { hideEmpty: true });
    const variant = String(panel.variant || "").trim().toLowerCase();
    const isShortPanel = rows.length <= 3 && getTerminalDomainRowLength(rows) <= 120;
    const isWide = contract.mode === "single" || variant === "wide";
    return {
      title,
      titleSlug,
      role,
      className: [
        "terminal-domain-panel",
        `terminal-domain-panel--${titleSlug}`,
        `terminal-domain-panel-role--${role}`,
        isShortPanel ? "is-short-panel" : "",
        isWide ? "is-wide-panel" : ""
      ].filter(Boolean).join(" ")
    };
  }

  function getTerminalInboxSubscriptionServiceName(value = "") {
    return String(value || "").split(/\s+\/\s+/)[0]?.trim() || String(value || "").trim();
  }

  function normalizeTerminalRecordPanelRows(panel = {}) {
    const rows = normalizeTerminalStructuredRowsForRender(panel.rows, { hideEmpty: true });
    const title = String(panel.title || "").trim().toUpperCase();
    if (title !== "SUBSCRIPTION") return rows;
    return rows.map((row) => String(row.label || "").trim().toUpperCase() === "SERVICE"
      ? { ...row, value: getTerminalInboxSubscriptionServiceName(row.value) }
      : row);
  }

  function renderTerminalRecordPanel(panel = {}, layout = "", contract = {}) {
    const rows = normalizeTerminalRecordPanelRows(panel);
    const meta = getTerminalDomainPanelClass(panel, contract);
    if (!meta.title && !rows.length) return "";
    return `
      <section class="${escapeHtml(meta.className)}">
        ${meta.title ? `<h6>${escapeHtml(meta.title)}</h6>` : ""}
        ${renderTerminalRecordRows(rows)}
      </section>
    `;
  }

  function renderTerminalRecordEntry(entry = {}, panels = [], finalRows = []) {
    const layout = String(entry.layout || "notice-system").trim().toLowerCase();
    const layoutSlug = getTerminalStructuredLayoutSlug(layout);
    const visiblePanels = panels
      .map((panel) => ({
        title: panel.title,
        rows: normalizeTerminalStructuredRowsForRender(panel.rows, { hideEmpty: true }),
        role: getTerminalDomainPanelRole(panel),
        variant: panel.variant
      }))
      .filter((panel) => panel.title || panel.rows.length);
    const visibleFinalRows = normalizeTerminalStructuredRowsForRender(finalRows, { hideEmpty: true });
    if (!visiblePanels.length && !visibleFinalRows.length) return "";

    const contract = getTerminalEntryVisualContract(entry, visiblePanels, visibleFinalRows);
    const panelSetClass = [
      "terminal-domain-panel-set",
      `terminal-domain-panel-set--${contract.mode}`,
      `terminal-domain-panel-set--${contract.variant}`,
      `terminal-domain-panel-set--density-${contract.density}`,
      `terminal-domain-panel-set--columns-${contract.columns}`
    ].join(" ");

    return `
      <div class="terminal-entry-structured terminal-entry-record terminal-entry-domain terminal-entry-record--${escapeHtml(layoutSlug)} terminal-entry-domain--${escapeHtml(contract.mode)} terminal-entry-domain--${escapeHtml(contract.variant)} terminal-entry-domain--density-${escapeHtml(contract.density)} terminal-entry-domain--columns-${escapeHtml(String(contract.columns))}">
        ${visiblePanels.length ? `<div class="${escapeHtml(panelSetClass)}" style="--domain-panel-count:${escapeHtml(String(contract.columns))}">
          ${visiblePanels.map((panel) => renderTerminalRecordPanel(panel, layout, contract)).join("")}
        </div>` : ""}
        ${visibleFinalRows.length ? `
          <section class="terminal-domain-final-row">
            <h6>SUMMARY</h6>
            ${renderTerminalDomainFinalRows(visibleFinalRows)}
          </section>
        ` : ""}
      </div>
    `;
  }

  function renderTerminalStructuredEntry(entry = {}) {
    const panels = (Array.isArray(entry.panels) ? entry.panels : [])
      .map((panel) => ({
        title: String(panel?.title || panel?.label || "").trim(),
        rows: normalizeTerminalStructuredRowsForRender(panel?.rows),
        role: String(panel?.role || "").trim().toLowerCase(),
        variant: String(panel?.variant || "").trim().toLowerCase()
      }))
      .filter((panel) => panel.title || panel.rows.length);
    const finalRows = normalizeTerminalStructuredRowsForRender(entry.finalRows);
    if (!panels.length && !finalRows.length) return "";

    const layout = String(entry.layout || "notice-system").trim().toLowerCase();
    return isTerminalFinanceLayout(layout)
      ? renderTerminalFinanceEntry(entry, panels, finalRows)
      : renderTerminalRecordEntry(entry, panels, finalRows);
  }

  function formatTerminalValue(value = "") {
    const raw = String(value ?? "").replace(/\n/g, " ").trim();
    if (!raw) return "-";
    if (/^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(raw)) {
      return raw.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
    }
    return raw;
  }

  function formatTerminalRowValue(label = "", value = "") {
    const raw = String(value ?? "").trim();
    const normalizedLabel = String(label || "").trim().toLowerCase();
    if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && /(deadline|date|accepted|completed|updated|submitted|charge|due)/.test(normalizedLabel)) {
      return formatDateDisplay(raw);
    }
    return formatTerminalValue(value);
  }

  function getTerminalEntryDisplayTags(entry = {}, severity = "INFO", statusTag = "") {
    const excluded = new Set([
      String(entry.domain || "").trim().toUpperCase(),
      String(entry.category || "").trim().toUpperCase(),
      String(entry.attention || "").trim().toUpperCase(),
      String(entry.lifecycle?.status || "").trim().toUpperCase(),
      String(severity || "").trim().toUpperCase()
    ].filter(Boolean));
    const sourceTags = Array.isArray(entry.tags) && entry.tags.length ? entry.tags : [];
    const tags = sourceTags
      .map((tag) => String(tag || "").trim().toUpperCase())
      .filter((tag) => tag && !excluded.has(tag));
    if (entry.important) tags.push("IMPORTANT");
    if (statusTag) tags.push(statusTag);
    return Array.from(new Set(tags)).slice(0, 4);
  }

  function getTerminalEntryLifecycleStatus(entry = {}) {
    return String(entry.lifecycle?.status || (entry.read ? "READ" : "NEW")).trim().toUpperCase() || "NEW";
  }

  function getTerminalEntryAttention(entry = {}) {
    const value = String(entry.attention || "INBOX").trim().toUpperCase();
    return ["SILENT", "BADGE", "INBOX", "BANNER", "BLOCKING"].includes(value) ? value : "INBOX";
  }

  function getTerminalEntryProviderLabel(entry = {}) {
    const source = entry.source && typeof entry.source === "object" ? entry.source : {};
    const organization = source.organizationId
      ? window.WS_APP.getOrganizationById?.(source.organizationId)
      : (source.providerId ? window.WS_APP.getOrganizationByProviderId?.(source.providerId) : null);
    const resolved = String(organization?.name || organization?.displayName || source.label || source.providerId || entry.createdBy || "SYSTEM").trim();
    return resolved || "SYSTEM";
  }

  function getTerminalEntrySubjectLabel(entry = {}) {
    const preferredLabels = new Set(["ITEM", "DEVICE", "SERVICE", "PROCEDURE", "CONTRACT", "SUBSCRIPTION", "ORDER", "TARGET", "SUBJECT", "ACCOUNT"]);
    const panels = Array.isArray(entry.panels) ? entry.panels : [];
    for (const panel of panels) {
      for (const row of normalizeTerminalStructuredRowsForRender(panel?.rows, { hideEmpty: true })) {
        if (preferredLabels.has(String(row.label || "").trim().toUpperCase()) && !isTerminalStructuredEmptyValue(row.value)) {
          return formatTerminalRowValue(row.label, row.value);
        }
      }
    }
    const subjectType = String(entry.subjectRef?.type || "").trim().toUpperCase();
    return subjectType ? formatTerminalFilterLabel(subjectType) : "";
  }

  function renderTerminalEntryContext(entry = {}) {
    const providerLabel = getTerminalEntryProviderLabel(entry);
    const subjectLabel = getTerminalEntrySubjectLabel(entry);
    if (!providerLabel && !subjectLabel) return "";
    return `
      <div class="terminal-entry-context" aria-label="Notification source and subject">
        ${providerLabel ? `<span><b>SOURCE</b><strong>${escapeHtml(providerLabel)}</strong></span>` : ""}
        ${subjectLabel ? `<span><b>SUBJECT</b><strong>${escapeHtml(subjectLabel)}</strong></span>` : ""}
      </div>
    `;
  }

  function renderTerminalEntryStateRail(entry = {}) {
    const domain = String(entry.domain || entry.type || "SYSTEM").trim().toUpperCase();
    const category = String(entry.category || domain).trim().toUpperCase();
    const attention = getTerminalEntryAttention(entry);
    const lifecycle = getTerminalEntryLifecycleStatus(entry);
    return `
      <div class="terminal-entry-state-rail" aria-label="Notification classification">
        <span class="terminal-entry-state terminal-entry-state--domain">${escapeHtml(formatTerminalFilterLabel(domain))}</span>
        <span class="terminal-entry-state terminal-entry-state--category">${escapeHtml(formatTerminalFilterLabel(category))}</span>
        <span class="terminal-entry-state terminal-entry-state--attention">${escapeHtml(formatTerminalFilterLabel(attention))}</span>
        <span class="terminal-entry-state terminal-entry-state--lifecycle">${escapeHtml(formatTerminalFilterLabel(lifecycle))}</span>
      </div>
    `;
  }

  function renderTerminalEntrySummary(entry = {}) {
    const summary = String(entry.summary || entry.body || "").trim();
    return summary ? `<p class="terminal-entry-summary">${escapeHtml(summary)}</p>` : "";
  }

  function formatTerminalTechnicalReference(reference = {}) {
    const type = String(reference?.type || "").trim().toUpperCase();
    const id = String(reference?.id || "").trim();
    return type && id ? `${type}:${id}` : "";
  }

  function renderTerminalEntryTechnicalDetails(entry = {}, user = {}) {
    if (user?.role !== "admin") return "";
    const rows = [
      ["Event", entry.eventCode],
      ["Event ID", entry.eventId],
      ["Correlation", entry.correlationId],
      ["Revision", entry.revision],
      ["Subject", formatTerminalTechnicalReference(entry.subjectRef)],
      ["Related", (Array.isArray(entry.relatedRefs) ? entry.relatedRefs : []).map(formatTerminalTechnicalReference).filter(Boolean).join(" / ")],
      ["Dedupe", entry.dedupeKey],
      ["Template", entry.templateId],
      ["Occurred", entry.occurredAt],
      ["Created", entry.createdAt],
      ["Sent", entry.sentAt],
      ["Received", entry.receivedAt],
      ["Read", entry.readAt || entry.lifecycle?.readAt]
    ].filter(([, value]) => String(value ?? "").trim());
    if (!rows.length) return "";
    return `
      <details class="terminal-entry-technical-details">
        <summary>TECHNICAL DETAILS</summary>
        <div>${rows.map(([label, value]) => `<span><b>${escapeHtml(label)}</b><code>${escapeHtml(value)}</code></span>`).join("")}</div>
      </details>
    `;
  }

  function formatTerminalEntryTitle(value = "") {
    const title = formatTerminalValue(value || "Terminal entry");
    return title.replace(/:\s*([a-z])/g, (_, letter) => `: ${letter.toUpperCase()}`);
  }

  function formatLedgerEntryTitle(entry = {}, sourceLabel = "") {
    const explicit = String(entry.title || "").trim();
    if (explicit) return formatTerminalEntryTitle(explicit);
    if (sourceLabel && String(entry.type || "").toUpperCase() !== "ADMIN_ADJUSTMENT") return formatTerminalEntryTitle(sourceLabel);
    return formatTerminalEntryTitle(entry.type || "Ledger entry");
  }

  function renderTerminalEntryBody(entry = {}) {
    if (!entry.layout && !Array.isArray(entry.panels) && !Array.isArray(entry.finalRows)) return "";
    return renderTerminalStructuredEntry(entry);
  }

  const TERMINAL_ENTRY_ACTION_ICON_HTML = {
    READ: "&#10003;",
    FLAG: "&#9929;",
    UNFLAG: "&#9930;",
    TRASH: "&#10006;",
    DELETE: "&#10006;",
    RESTORE: "&#8634;",
    OPEN: "&#9654;",
    BILLING: "&#8353;",
    SUBS: "&#9636;",
    REQUEST: "&#8253;",
    CALENDAR: "&#9716;",
    CMD: "&#9654;",
    SYSTEM: "&#9670;",
    CYBERWARE: "&#9672;",
    SERVICE: "&#8853;",
    MARKET: "&#9635;",
    HOUSING: "&#8962;"
  };

  function getTerminalEntryActionIconHtml(label = "ACTION") {
    const action = String(label || "").trim().toUpperCase();
    return TERMINAL_ENTRY_ACTION_ICON_HTML[action] || "";
  }

  function renderTerminalEntryActionButton(label = "ACTION", attributes = {}) {
    const attrs = Object.entries(attributes)
      .filter(([, value]) => value !== undefined && value !== null && value !== false)
      .map(([key, value]) => value === true ? key : `${key}="${escapeHtml(value)}"`)
      .join(" ");
    const iconHtml = getTerminalEntryActionIconHtml(label);
    const className = iconHtml ? "terminal-entry-icon-btn" : "terminal-entry-action-btn";
    const iconAction = escapeHtml(String(label || "ACTION").trim().toUpperCase());
    const content = iconHtml
      ? `<span class="terminal-entry-icon-glyph" aria-hidden="true" data-terminal-entry-icon="${iconAction}">${iconHtml}</span>`
      : escapeHtml(label);
    return `<button class="${className}" type="button" ${iconHtml ? `data-terminal-entry-action-icon="${iconAction}"` : ""} ${attrs}>${content}</button>`;
  }

  function getTerminalEntryLinkActionLabel(link = {}) {
    const label = String(link.label || "").trim().toUpperCase();
    const moduleId = String(link.module || "").trim().toLowerCase();
    const panelId = String(link.panel || "").trim().toLowerCase();

    if (/BILLING|LEDGER|ACCOUNT|DEBT|PAYMENT/.test(label) || panelId === "billing") return "BILLING";
    if (/CYBERWARE|IMPLANT|FIRMWARE/.test(label) || moduleId === "cyberware") return "CYBERWARE";
    if (/SERVICE|CLINIC|PROCEDURE/.test(label) || moduleId === "service") return "SERVICE";
    if (/MARKET|ORDER|VENDOR/.test(label) || moduleId === "market") return "MARKET";
    if (/HOUSING|HOUSEHOLD|HOME|STORAGE/.test(label) || moduleId === "housing") return "HOUSING";
    if (/SUBSCRIPTION|SUBSCRIPTIONS/.test(label) || moduleId === "subscriptions") return "SUBS";
    if (/REQUEST/.test(label) || panelId === "requests") return "REQUEST";
    if (/CALENDAR/.test(label) || panelId === "calendar") return "CALENDAR";
    if (/COMMAND/.test(label) || panelId === "command") return "CMD";
    if (/SYSTEM/.test(label) || moduleId === "system") return "SYSTEM";
    return "OPEN";
  }

  function renderTerminalEntryCard(entry, folder = "INBOX", selection = { active: false, ids: [] }, user = {}) {
    const links = Array.isArray(entry.links) ? entry.links : [];
    const isTrash = String(folder || entry.folder || "INBOX").toUpperCase() === "TRASH";
    const severity = String(entry.severity || "INFO").trim().toUpperCase();
    const subtype = String(entry.subtype || "").trim().toUpperCase();
    const domain = String(entry.domain || entry.type || "SYSTEM").trim().toUpperCase();
    const category = String(entry.category || domain).trim().toUpperCase();
    const attention = getTerminalEntryAttention(entry);
    const lifecycle = getTerminalEntryLifecycleStatus(entry);
    const severityClass = ["INFO", "NOTICE", "WARNING", "CRITICAL"].includes(severity) ? `is-severity-${severity.toLowerCase()}` : "is-severity-info";
    const attentionClass = `is-attention-${attention.toLowerCase()}`;
    const lifecycleClass = `is-lifecycle-${lifecycle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const title = formatTerminalEntryTitle(entry.title);
    const statusTag = isTrash ? "TRASH" : "";
    const structuredLayout = String(entry.layout || "").trim().toLowerCase();
    const structuredLayoutSlug = getTerminalStructuredLayoutSlug(structuredLayout);
    const structuredClass = structuredLayout
      ? `is-structured-entry ${isTerminalFinanceLayout(structuredLayout) ? `is-finance-entry is-finance-${structuredLayoutSlug}` : `is-record-entry is-record-${structuredLayoutSlug}`}`
      : "";
    const selectMode = selection?.active === true;
    const selected = selectMode && Array.isArray(selection.ids) && selection.ids.includes(entry.id);
    const actionButtons = [];

    if (!isTrash && !entry.read) {
      actionButtons.push(renderTerminalEntryActionButton("READ", {
        "data-terminal-entry-read": entry.id,
        title: "Mark read",
        "aria-label": "Mark read"
      }));
    }

    if (!isTrash && ["BANNER", "BLOCKING"].includes(attention) && ["NEW", "READ"].includes(lifecycle)) {
      actionButtons.push(renderTerminalEntryActionButton("ACK", {
        "data-terminal-entry-acknowledge": entry.id,
        title: "Acknowledge notification",
        "aria-label": "Acknowledge notification"
      }));
    }

    if (!isTrash && lifecycle === "ACKNOWLEDGED") {
      actionButtons.push(renderTerminalEntryActionButton("RESOLVE", {
        "data-terminal-entry-resolve": entry.id,
        title: "Resolve notification",
        "aria-label": "Resolve notification"
      }));
    }

    if (!isTrash) {
      actionButtons.push(renderTerminalEntryActionButton(entry.important ? "UNFLAG" : "FLAG", {
        "data-terminal-entry-important": entry.id,
        "data-important": entry.important ? "false" : "true",
        title: entry.important ? "Unmark important" : "Mark important",
        "aria-label": entry.important ? "Unmark important" : "Mark important"
      }));
      actionButtons.push(renderTerminalEntryActionButton("TRASH", {
        "data-terminal-entry-trash": entry.id,
        title: "Move to trash",
        "aria-label": "Move to trash"
      }));
      links.forEach((link) => {
        const entityRef = link?.entityRef && typeof link.entityRef === "object" ? link.entityRef : {};
        const params = link?.params && typeof link.params === "object" ? link.params : {};
        actionButtons.push(renderTerminalEntryActionButton(getTerminalEntryLinkActionLabel(link), {
          "data-terminal-entry-link": true,
          "data-module": link.module,
          "data-panel": link.panel,
          "data-section": link.section || "",
          "data-route-id": link.routeId || "",
          "data-route-citizen-id": link.citizenId || entry.citizenId || "",
          "data-entity-type": entityRef.type || "",
          "data-entity-id": entityRef.id || "",
          "data-route-params": encodeURIComponent(JSON.stringify(params)),
          title: link.label,
          "aria-label": link.label
        }));
      });
    } else {
      actionButtons.push(renderTerminalEntryActionButton("RESTORE", {
        "data-terminal-entry-restore": entry.id,
        title: "Restore",
        "aria-label": "Restore"
      }));
      actionButtons.push(renderTerminalEntryActionButton("DELETE", {
        "data-terminal-entry-delete": entry.id,
        title: "Delete permanently",
        "aria-label": "Delete permanently"
      }));
    }

    return `
      <article class="terminal-entry-card ${entry.read ? "is-read" : "is-unread"} ${entry.important ? "is-important" : ""} ${isTrash ? "is-trash" : ""} ${selectMode ? "is-selectable" : ""} ${selected ? "is-selected" : ""} ${severityClass} ${attentionClass} ${lifecycleClass} ${structuredClass}" data-terminal-entry-id="${escapeHtml(entry.id)}" data-terminal-entry-type="${escapeHtml(entry.type)}" data-terminal-entry-subtype="${escapeHtml(subtype)}" data-terminal-entry-domain="${escapeHtml(domain)}" data-terminal-entry-category="${escapeHtml(category)}" data-terminal-entry-attention="${escapeHtml(attention)}" data-terminal-entry-lifecycle="${escapeHtml(lifecycle)}" data-terminal-entry-severity="${escapeHtml(severity)}">
        ${selectMode ? `<button class="ui-select-button terminal-entry-select-box ${selected ? "is-selected" : ""}" type="button" data-terminal-entry-select="${escapeHtml(entry.id)}" aria-label="${selected ? "Unselect entry" : "Select entry"}" aria-pressed="${selected ? "true" : "false"}"><span aria-hidden="true"></span></button>` : ""}
        <header>
          <div class="terminal-entry-heading">
            <h6>${escapeHtml(title)}</h6>
            ${renderTerminalEntryStateRail(entry)}
            ${renderTerminalEntrySummary(entry)}
            ${renderTerminalEntryContext(entry)}
            ${getTerminalEntryDisplayTags(entry, severity, statusTag).length ? `<span class="terminal-entry-tags" aria-label="Entry tags">
              ${getTerminalEntryDisplayTags(entry, severity, statusTag).map((tag) => `<span class="terminal-entry-type">${escapeHtml(tag)}</span>`).join("")}
            </span>` : ""}
          </div>
        </header>
        ${renderTerminalEntryBody(entry)}
        ${renderTerminalEntryTechnicalDetails(entry, user)}
        <footer>
          <small><time datetime="${escapeHtml(getTerminalEntryTimestamp(entry))}">${escapeHtml(formatDateTimeDisplay(getTerminalEntryTimestamp(entry), entry.date))}</time> / ${escapeHtml(getTerminalEntryProviderLabel(entry))}</small>
          <span class="terminal-entry-actions">${actionButtons.join("")}</span>
        </footer>
      </article>
    `;
  }

  function formatLedgerSignedCredits(value) {
    const amount = parseCreditValue(value);
    if (amount > 0) return `+${formatCredits(amount)}`;
    if (amount < 0) return `-${formatCredits(Math.abs(amount))}`;
    return formatCredits(0);
  }

  function renderTerminalRequestsPanel(user, citizen) {
    const requests = window.WS_APP.getServiceRequests?.(citizen.id) || [];
    const isAdmin = user.role === "admin";

    return `
      <section class="terminal-subpanel terminal-requests-panel">
        <header class="terminal-subpanel-head">
          <div>
            <p class="kicker">TERMINAL / SYSTEM REQUESTS</p>
            <h5>Request Gateway</h5>
          </div>
        </header>
        ${!isAdmin ? `
        <form class="terminal-request-form" data-terminal-request-form>
          <label>
            <span>Request Type</span>
            <select name="type">
              ${TERMINAL_REQUEST_TYPES.map((type) => `<option value="${escapeHtml(type.id)}">${escapeHtml(type.label)}</option>`).join("")}
            </select>
          </label>
          <label class="is-wide">
            <span>Request Body</span>
            <textarea name="body" rows="4" placeholder="Describe the request. The local node will register it as PENDING."></textarea>
          </label>
          <button type="submit">Submit Request</button>
        </form>` : `
        <aside class="terminal-request-admin-note">
          <b>ADMIN REQUEST RESOLUTION</b>
          <span>Resolve requests for the selected target citizen. Status changes are written to that citizen terminal only.</span>
        </aside>`}
        <section class="terminal-request-list">
          <h6>Registered Requests</h6>
          ${requests.length ? requests.map((request) => {
            const status = String(request.status || "PENDING").toUpperCase();
            const isOpenIssue = ["PENDING", "REVIEWED", "APPROVED"].includes(status);
            return `
            <article class="terminal-request-card ${isOpenIssue ? "is-open" : "is-closed"}">
              <header><b>${escapeHtml(request.type)}</b><strong>${escapeHtml(status)}</strong></header>
              <p>${escapeHtml(request.body || "No body supplied.")}</p>
              <small>${escapeHtml(formatDateDisplay(request.date))} / ${escapeHtml(request.createdBy)}</small>
              ${(isAdmin || !isOpenIssue) ? `
                <footer class="terminal-request-actions">
                  ${isAdmin ? `
                    <button type="button" data-terminal-request-status="${escapeHtml(request.id)}" data-status="REVIEWED">Reviewed</button>
                    <button type="button" data-terminal-request-status="${escapeHtml(request.id)}" data-status="APPROVED">Approve</button>
                    <button type="button" data-terminal-request-status="${escapeHtml(request.id)}" data-status="DENIED">Deny</button>
                    <button type="button" data-terminal-request-status="${escapeHtml(request.id)}" data-status="CLOSED">Resolve</button>
                  ` : ""}
                  ${!isOpenIssue ? `<button type="button" data-terminal-request-delete="${escapeHtml(request.id)}">Delete</button>` : ""}
                </footer>
              ` : ""}
            </article>
          `; }).join("") : '<p class="file-empty">No system requests registered.</p>'}
        </section>
      </section>
    `;
  }

  function renderTerminalCommandPanel(user, citizen) {
    const ledger = getCitizenFinancialLedger(citizen);
    const unread = window.WS_APP.countUnreadTerminalEntries?.(citizen.id) || 0;

    return `
      <section class="terminal-subpanel terminal-command-panel">
        <header class="terminal-subpanel-head">
          <div>
            <p class="kicker">TERMINAL / COMMAND LINE</p>
            <h5>Manual Input</h5>
          </div>
        </header>
        <div class="terminal-command-output" data-terminal-command-output>
          ${renderTerminalCommandLines([
            "> status",
            `CREDITS: ${formatCredits(ledger.credits)}`,
            `DEBT: ${formatCredits(ledger.debt)}`,
            `INBOX: ${unread} UNREAD`
          ])}
        </div>
        <form class="terminal-command-form" data-terminal-command-form autocomplete="off">
          <span>&gt;</span>
          <input name="command" type="text" placeholder="help" autocomplete="off" />
          <button type="submit">Run</button>
        </form>
      </section>
    `;
  }

  function bindTerminalHubActions(user, citizen) {
    const root = document.querySelector("[data-terminal-root]");
    if (!root) return;
    const renderPanel = (nextPanel = window.WS_APP.terminalActivePanel || "inbox") => renderTerminalPanelPartial(user, nextPanel);

    const targetSelect = root.querySelector("[data-terminal-target-citizen]");
    if (targetSelect && targetSelect.dataset.terminalBound !== "true") {
      targetSelect.dataset.terminalBound = "true";
      targetSelect.addEventListener("change", (event) => {
        clearTerminalInboxSelection(citizen.id);
        window.WS_APP.terminalTargetCitizenId = event.target.value;
        renderTerminalHubModule(user, window.WS_APP.terminalActivePanel || "inbox");
      });
    }

    root.querySelectorAll("[data-terminal-panel]").forEach((button) => {
      button.addEventListener("click", () => {
        window.WS_APP.terminalActivePanel = button.dataset.terminalPanel;
        renderPanel(button.dataset.terminalPanel);
      });
    });

    window.WS_APP.bindTerminalBillingActions?.(root, user, citizen);

    root.querySelectorAll("[data-terminal-inbox-view]").forEach((button) => {
      button.addEventListener("click", () => {
        window.WS_APP.terminalInboxView = String(button.dataset.terminalInboxView || "ALL").toUpperCase();
        window.WS_APP.terminalInboxTypeFilter = "ALL";
        clearTerminalInboxSelection(citizen.id);
        renderPanel("inbox");
      });
    });

    root.querySelectorAll("[data-terminal-inbox-type-option]").forEach((button) => {
      button.addEventListener("click", () => {
        window.WS_APP.terminalInboxTypeFilter = normalizeTerminalInboxTypeFilter(button.dataset.terminalInboxTypeOption || "ALL");
        clearTerminalInboxSelection(citizen.id);
        renderPanel("inbox");
      });
    });

    root.querySelector("[data-terminal-inbox-sort]")?.addEventListener("change", (event) => {
      window.WS_APP.terminalInboxSort = String(event.target.value || "NEWEST").toUpperCase();
      clearTerminalInboxSelection(citizen.id);
      renderPanel("inbox");
    });

    root.querySelector("[data-terminal-select-mode]")?.addEventListener("click", () => {
      const current = getTerminalInboxSelectionState(citizen.id);
      setTerminalInboxSelectionState(citizen.id, { active: !current.active, ids: [] });
      renderPanel("inbox");
    });

    root.querySelector("[data-terminal-select-visible]")?.addEventListener("click", () => {
      const current = getTerminalInboxSelectionState(citizen.id);
      const visibleIds = String(root.querySelector("[data-terminal-bulk-actions]")?.dataset.visibleIds || "")
        .split(",")
        .map((entryId) => entryId.trim())
        .filter(Boolean);
      const selected = new Set(current.ids);
      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((entryId) => selected.has(entryId));
      if (allVisibleSelected) visibleIds.forEach((entryId) => selected.delete(entryId));
      else visibleIds.forEach((entryId) => selected.add(entryId));
      setTerminalInboxSelectionState(citizen.id, { active: true, ids: Array.from(selected) });
      renderPanel("inbox");
    });

    root.querySelector("[data-terminal-select-clear]")?.addEventListener("click", () => {
      setTerminalInboxSelectionState(citizen.id, { active: true, ids: [] });
      renderPanel("inbox");
    });

    root.querySelectorAll("[data-terminal-entry-select]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const current = getTerminalInboxSelectionState(citizen.id);
        const selected = new Set(current.ids);
        const entryId = String(button.dataset.terminalEntrySelect || "").trim();
        if (!entryId) return;
        if (selected.has(entryId)) selected.delete(entryId);
        else selected.add(entryId);
        setTerminalInboxSelectionState(citizen.id, { active: true, ids: Array.from(selected) });
        renderPanel("inbox");
      });
    });

    root.querySelectorAll("[data-terminal-bulk-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = String(button.dataset.terminalBulkAction || "").trim().toUpperCase();
        const current = getTerminalInboxSelectionState(citizen.id);
        if (!action || !current.ids.length) return;
        if (action === "DELETE") {
          const confirmed = await window.WS_APP.confirmAction?.({
            title: "DELETE SELECTED ENTRIES",
            message: `Permanently delete ${current.ids.length} selected terminal entr${current.ids.length === 1 ? "y" : "ies"} from Trash?`,
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            tone: "danger"
          });
          if (!confirmed) return;
        }
        window.WS_APP.updateTerminalEntriesBulk?.(citizen.id, current.ids, action);
        setTerminalInboxSelectionState(citizen.id, { active: true, ids: [] });
        renderPanel("inbox");
      });
    });

    root.querySelector("[data-terminal-mark-all-read]")?.addEventListener("click", () => {
      window.WS_APP.markAllTerminalEntriesRead?.(citizen.id);
      renderPanel("inbox");
    });

    root.querySelector("[data-terminal-trash-read]")?.addEventListener("click", async () => {
      const confirmed = await window.WS_APP.confirmAction?.({
        title: "MOVE READ ENTRIES",
        message: "Move all read terminal entries to Trash?",
        confirmLabel: "Move Read",
        cancelLabel: "Cancel",
        tone: "default"
      });
      if (!confirmed) return;
      window.WS_APP.moveReadTerminalEntriesToTrash?.(citizen.id);
      renderPanel("inbox");
    });

    root.querySelector("[data-terminal-trash-restore-all]")?.addEventListener("click", () => {
      window.WS_APP.restoreAllTerminalEntriesFromTrash?.(citizen.id);
      renderPanel("inbox");
    });

    root.querySelector("[data-terminal-trash-empty]")?.addEventListener("click", async () => {
      const confirmed = await window.WS_APP.confirmAction?.({
        title: "EMPTY TERMINAL TRASH",
        message: "Permanently delete all terminal entries from Trash?",
        confirmLabel: "Delete All",
        cancelLabel: "Cancel",
        tone: "danger"
      });
      if (!confirmed) return;
      window.WS_APP.emptyTerminalTrash?.(citizen.id);
      renderPanel("inbox");
    });

    root.querySelectorAll("[data-terminal-entry-read]").forEach((button) => {
      button.addEventListener("click", () => {
        window.WS_APP.markTerminalEntryRead?.(citizen.id, button.dataset.terminalEntryRead, true);
        renderPanel("inbox");
      });
    });

    root.querySelectorAll("[data-terminal-entry-acknowledge]").forEach((button) => {
      button.addEventListener("click", () => {
        window.TerminalNotifications?.acknowledge?.({
          citizenId: citizen.id,
          notificationId: button.dataset.terminalEntryAcknowledge
        });
        renderPanel("inbox");
      });
    });

    root.querySelectorAll("[data-terminal-entry-resolve]").forEach((button) => {
      button.addEventListener("click", () => {
        window.TerminalNotifications?.resolve?.({
          citizenId: citizen.id,
          notificationId: button.dataset.terminalEntryResolve
        });
        renderPanel("inbox");
      });
    });

    root.querySelectorAll("[data-terminal-entry-important]").forEach((button) => {
      button.addEventListener("click", () => {
        window.WS_APP.setTerminalEntryImportant?.(citizen.id, button.dataset.terminalEntryImportant, button.dataset.important === "true");
        renderPanel("inbox");
      });
    });

    root.querySelectorAll("[data-terminal-entry-trash]").forEach((button) => {
      button.addEventListener("click", () => {
        window.WS_APP.moveTerminalEntryToTrash?.(citizen.id, button.dataset.terminalEntryTrash);
        renderPanel("inbox");
      });
    });

    root.querySelectorAll("[data-terminal-entry-restore]").forEach((button) => {
      button.addEventListener("click", () => {
        window.WS_APP.restoreTerminalEntryFromTrash?.(citizen.id, button.dataset.terminalEntryRestore);
        renderPanel("inbox");
      });
    });

    root.querySelectorAll("[data-terminal-entry-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const confirmed = await window.WS_APP.confirmAction?.({
          title: "DELETE TERMINAL ENTRY",
          message: "Permanently delete this entry from Trash?",
          confirmLabel: "Delete",
          cancelLabel: "Cancel",
          tone: "danger"
        });
        if (!confirmed) return;
        window.WS_APP.deleteTerminalEntry?.(citizen.id, button.dataset.terminalEntryDelete);
        renderPanel("inbox");
      });
    });

    root.querySelectorAll("[data-terminal-entry-link]").forEach((button) => {
      button.addEventListener("click", () => {
        const moduleId = button.dataset.module || "terminal-hub";
        const panel = button.dataset.panel || "";
        const section = button.dataset.section || "";
        const routeId = String(button.dataset.routeId || "").trim().toUpperCase();
        const routeCitizenId = String(button.dataset.routeCitizenId || citizen.id || "").trim();
        const entityType = String(button.dataset.entityType || "").trim().toUpperCase();
        const entityId = String(button.dataset.entityId || "").trim();
        let params = {};
        try {
          params = JSON.parse(decodeURIComponent(button.dataset.routeParams || "%7B%7D"));
        } catch (error) {
          params = {};
        }
        const entityRef = entityType && entityId ? { type: entityType, id: entityId } : null;
        window.WS_APP.pushModuleView?.(() => renderTerminalHubModule(user, "inbox"));
        if (moduleId === "terminal-hub") {
          if (String(panel || "").trim().toLowerCase() === "billing" && section) {
            window.WS_APP.terminalBillingSection = String(section).trim().toLowerCase();
          }
          renderPanel(panel || "inbox");
        } else {
          window.WS_APP.openModule?.(moduleId, user, {
            skipLoader: true,
            panel,
            section,
            routeId,
            citizenId: routeCitizenId || citizen.id,
            entityRef,
            params
          });
        }
      });
    });

    root.querySelectorAll("[data-terminal-open-module]").forEach((button) => {
      button.addEventListener("click", () => {
        window.WS_APP.pushModuleView?.(() => renderTerminalHubModule(user, "billing"));
        window.WS_APP.openModule?.(button.dataset.terminalOpenModule, user, { skipLoader: true });
      });
    });

    root.querySelector("[data-terminal-request-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const request = window.WS_APP.createServiceRequest?.(citizen.id, {
        type: form.elements.type?.value,
        body: form.elements.body?.value,
        createdBy: user.login || user.displayName || "LOCAL USER"
      });
      if (request) {
        window.WS_APP.appendTerminalLogLine?.(`SERVICE REQUEST CREATED / ${request.type}`, { typed: true, speed: 8 });
      }
      renderPanel("requests");
    });

    root.querySelectorAll("[data-terminal-request-status]").forEach((button) => {
      button.addEventListener("click", async () => {
        const status = button.dataset.status || "CLOSED";
        const confirmed = await window.WS_APP.confirmAction?.({
          title: "UPDATE SERVICE REQUEST",
          message: `Set request status to ${status}?`,
          confirmLabel: "Confirm",
          cancelLabel: "Cancel"
        });
        if (!confirmed) return;
        window.WS_APP.updateServiceRequestStatus?.(citizen.id, button.dataset.terminalRequestStatus, status, { createdBy: user.login || "ADMIN" });
        renderPanel("requests");
      });
    });

    root.querySelectorAll("[data-terminal-request-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const confirmed = await window.WS_APP.confirmAction?.({
          title: "DELETE SERVICE REQUEST",
          message: "Delete this closed request from the local terminal?",
          confirmLabel: "Delete",
          cancelLabel: "Cancel"
        });
        if (!confirmed) return;
        window.WS_APP.deleteServiceRequest?.(citizen.id, button.dataset.terminalRequestDelete);
        renderPanel("requests");
      });
    });

    root.querySelector("[data-terminal-reminder-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const reminder = window.WS_APP.createTerminalCalendarReminder?.(citizen.id, {
        title: form.elements.title?.value,
        date: form.elements.date?.value,
        notifyDaysBefore: form.elements.notifyDaysBefore?.value,
        body: form.elements.body?.value,
        colorIndex: form.elements.colorIndex?.value,
        createdBy: user.login || user.displayName || "LOCAL USER"
      });
      if (reminder) {
        window.WS_APP.appendTerminalLogLine?.(`CALENDAR REMINDER REGISTERED / ${reminder.title}`, { typed: true, speed: 8 });
      }
      renderPanel(window.WS_APP.terminalActivePanel || "inbox");
    });

    root.querySelectorAll("[data-terminal-reminder-close]").forEach((button) => {
      button.addEventListener("click", () => {
        window.WS_APP.closeTerminalCalendarReminder?.(citizen.id, button.dataset.terminalReminderClose);
        renderPanel(window.WS_APP.terminalActivePanel || "inbox");
      });
    });

    root.querySelectorAll("[data-terminal-calendar-date]").forEach((button) => {
      button.addEventListener("click", () => {
        const iso = String(button.dataset.terminalCalendarDate || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
        const selected = parseIsoDateUtc(iso);
        if (selected) {
          setTerminalCalendarUiState(citizen.id, {
            selectedIso: iso,
            monthIso: new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1)).toISOString().slice(0, 10)
          });
        }
        renderPanel(window.WS_APP.terminalActivePanel || "inbox");
      });
    });

    root.querySelectorAll("[data-terminal-calendar-nav]").forEach((button) => {
      button.addEventListener("click", () => {
        const campaignIso = window.WS_APP.getCampaignDateIso?.() || window.WS_APP.CAMPAIGN_DATE_ISO || "2109-02-13";
        const delta = Number(button.dataset.terminalCalendarNav || 0);
        if (delta === 0) {
          setTerminalCalendarUiState(citizen.id, { monthIso: campaignIso, selectedIso: campaignIso });
        } else {
          const calendarState = getTerminalCalendarUiState(citizen.id);
          const base = parseIsoDateUtc(calendarState.monthIso || campaignIso) || parseIsoDateUtc(campaignIso);
          const next = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + delta, 1));
          setTerminalCalendarUiState(citizen.id, { monthIso: next.toISOString().slice(0, 10) });
        }
        renderPanel(window.WS_APP.terminalActivePanel || "inbox");
      });
    });

    root.querySelector("[data-terminal-command-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      handleTerminalCommand(user, citizen, event.currentTarget);
    });
  }

  function handleTerminalCommand(user, citizen, form) {
    const input = form.elements.command;
    const output = document.querySelector("[data-terminal-command-output]");
    const command = String(input?.value || "").trim().toLowerCase();
    if (!output || !command) return;

    const ledger = getCitizenFinancialLedger(citizen);
    const unread = window.WS_APP.countUnreadTerminalEntries?.(citizen.id) || 0;
    const requestCount = (window.WS_APP.getServiceRequests?.(citizen.id) || []).length;
    const append = (lines) => {
      output.innerHTML += renderTerminalCommandLines(lines);
      output.scrollTop = output.scrollHeight;
    };

    if (command === "clear") {
      output.innerHTML = "";
      input.value = "";
      return;
    }

    if (command === "help") {
      append(["> help", "COMMANDS: help / inbox / billing / forecast / requests / status / clear"]);
    } else if (command === "inbox") {
      append(["> inbox", `INBOX: ${unread} UNREAD`]);
    } else if (command === "billing") {
      append(["> billing", `CREDITS: ${formatCredits(ledger.credits)}`, `DEBT: ${formatCredits(ledger.debt)}`, `WEEKLY INCOME: ${formatCredits(window.WS_APP.getCitizenWeeklyIncomeTotal?.(citizen) || ledger.incomeTotal)} / WEEK`]);
    } else if (command === "forecast") {
      const forecast = window.WS_APP.previewWeeklySettlement?.(citizen.id);
      append(["> forecast", `SUBSCRIPTIONS DUE: ${formatCredits(forecast?.subscriptionCharge || 0)}`, `DEBT INCREASE: ${formatCredits(forecast?.debtIncrease || 0)}`, `DEBT RECOVERY: ${formatCredits(forecast?.debtRecovery || 0)}`, `FINAL BALANCE: ${formatCredits(forecast?.finalCredits || 0)}`, `FINAL DEBT: ${formatCredits(forecast?.finalDebt || 0)}`]);
    } else if (command === "requests") {
      append(["> requests", `REGISTERED REQUESTS: ${requestCount}`]);
    } else if (command === "status") {
      append(["> status", `USER: ${user.displayName || user.login}`, `SHORT ID: ${getCitizenShortId(citizen) || citizen.id}`, `PROFILE: ${String(citizen.biologicalProfile || citizen.profile || "UNCLASSIFIED").toUpperCase()}`, `NODE: SYNCHRONIZED`]);
    } else {
      append([`> ${command}`, "UNKNOWN COMMAND. TYPE help."]);
    }

    input.value = "";
  }

  function renderTerminalCommandLines(lines = []) {
    return (Array.isArray(lines) ? lines : []).map((line) => {
      const text = String(line || "");
      const tone = getTerminalCommandLineTone(text);
      return `<div class="terminal-command-line is-${escapeHtml(tone)}">${escapeHtml(text)}</div>`;
    }).join("");
  }

  function getTerminalCommandLineTone(text = "") {
    const line = String(text || "").trim().toUpperCase();
    if (!line) return "muted";
    if (line.startsWith(">")) return "command";
    if (line.includes("UNKNOWN") || line.includes("FAILED") || line.includes("DENIED")) return "error";
    if (line.includes("DEBT") || line.includes("DUE") || line.includes("OVERDUE") || line.includes("MISSING")) return "warning";
    if (line.includes("SYNCHRONIZED") || line.includes("CREDITS") || line.includes("INBOX") || line.includes("PROFILE") || line.includes("USER") || line.includes("SHORT ID")) return "ok";
    return "muted";
  }

  function getTerminalTransferCitizens() {
    return (window.WS_APP.getCitizens?.() || [])
      .filter((citizen) => citizen && citizen.recordType !== "admin")
      .filter((citizen) => citizen.playerVisible === true || (window.WS_APP.getUsers?.({ includeDisabled: false }) || []).some((user) => user.citizenId === citizen.id));
  }

  window.WS_APP.renderTerminalHubModule = renderTerminalHubModule;
  window.WS_APP.renderTerminalPanelPartial = renderTerminalPanelPartial;
  window.WS_APP.formatTerminalRowValue = window.WS_APP.formatTerminalRowValue || formatTerminalRowValue;
  window.WS_APP.getTerminalTransferCitizens = getTerminalTransferCitizens;
})();
