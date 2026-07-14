window.WS_APP = window.WS_APP || {};

if (!window.WS_APP.getCitizenById) {
  window.WS_APP.getCitizenById = function getCitizenById(citizenId) {
    const citizens = window.APP_DATA?.citizens || [];
    return citizens.find((citizen) => citizen.id === citizenId) || null;
  };
}

window.WS_APP.renderCitizenProfile = function renderCitizenProfile(citizen, user) {
  const container = document.querySelector("#profile-panel");

  if (!container) return;

  if (user?.role === "admin") {
    renderAdminAccessPanel(container, user);
    return;
  }

  if (!citizen) {
    container.innerHTML = `
      <article class="citizen-profile">
        <p class="kicker">CITIZEN PROFILE / ERROR</p>
        <p class="profile-note">Brak profilu obywatela dla aktywnej sesji.</p>
      </article>
    `;
    return;
  }

  const view = buildProfilePanelView(citizen, user);

  container.innerHTML = `
    <article class="citizen-profile is-card-synced" data-citizen-id="${escapeHtml(citizen.id)}">
      <div class="profile-header">
        <div class="portrait-frame${citizen.portrait ? "" : " is-missing"}">
          ${citizen.portrait ? `<img
            src="${escapeHtml(citizen.portrait)}"
            alt="Citizen profile portrait: ${escapeHtml(view.shortId)}"
            onerror="this.closest('.portrait-frame').classList.add('is-missing'); this.remove();"
          />` : ""}
        </div>

        <div class="profile-title-row scan-reveal">
          <div class="profile-title">
            <h3>${escapeHtml(view.shortId)}</h3>
            <span>${escapeHtml(view.name)}</span>
          </div>

          <span class="profile-badge-stack">
            <span class="profile-badge ${escapeHtml(view.profileClass)}">${escapeHtml(view.profile)}</span>
            <span class="profile-badge age is-profile-age"><small>AGE</small><b>${escapeHtml(view.age)}</b></span>
          </span>
        </div>
      </div>

      <div class="risk-block">
        <div class="risk-label">
          <span>W&S RISK INDEX</span>
          <strong>${escapeHtml(view.risk)}%</strong>
        </div>

        <div class="risk-meter">
          <span class="risk-fill" data-risk-value="${escapeHtml(view.risk)}" style="width: 0%;"></span>
        </div>
      </div>

      <div class="profile-data is-card-summary">
        <section class="profile-summary-section scan-reveal profile-active-service-block">
          <h4>Active Service</h4>
          <ul class="profile-occupation-list">
            ${view.occupations.map((entry) => `<li><b>${escapeHtml(entry.organization)}</b> - ${escapeHtml(entry.role)}</li>`).join("")}
          </ul>
        </section>

        <section class="profile-summary-grid scan-reveal" aria-label="Financial summary">
          ${renderProfileMetric("Credits", formatCredits(view.credits))}
          ${renderProfileMetric("Debt", formatCredits(view.debt))}
          ${renderProfileMetric("Net Cycle", formatCredits(view.netCycle))}
        </section>

        <section class="profile-summary-grid scan-reveal" aria-label="Subscription summary">
          ${renderProfileMetric("Active Subs", `${view.activeSubscriptions} / ${view.totalSubscriptions}`)}
          ${renderProfileMetric("Weekly Cost", formatCredits(view.subscriptionCost))}
          ${renderProfileMetric("Cyberware", `${view.cyberwareCount} installed`)}
        </section>
      </div>

      ${view.note ? `<p class="profile-note scan-reveal">${escapeHtml(view.note)}</p>` : ""}

      ${window.WS_APP.canEditCitizen?.(citizen.id, user) ? `
        <footer class="profile-action-footer scan-reveal">
          <button type="button" class="profile-edit-button" data-citizen-editor-open="${escapeHtml(citizen.id)}">${window.WS_APP.hasOwnerFullCardEditGrant?.(citizen, user) ? "Edit Full Card" : "Edit Profile"}</button>
        </footer>
      ` : ""}
    </article>
  `;

};

function buildProfilePanelView(citizen = {}, user = window.WS_APP.currentUser) {
  const identity = window.WS_APP.getCitizenIdentity?.(citizen) || {};
  const encrypted = Boolean(identity.encryptedName || citizen.encryptedName);
  const canViewLegal = window.WS_APP.canViewCitizenLegalName?.(citizen, user) !== false;
  const masked = encrypted && !canViewLegal;
  const shortId = window.WS_APP.getCitizenShortId?.(citizen) || citizen.shortId || citizen.idNumber || citizen.id || "NO-ID";
  const profile = String(citizen.biologicalProfile || citizen.profile || "UNCLASSIFIED").toUpperCase();
  const subscriptions = normalizeProfileSubscriptions(citizen.subscriptions);
  const activeSubscriptions = subscriptions.filter((item) => item.active && String(item.status || "").toUpperCase() !== "CANCELLED");
  const income = normalizeProfileIncome(citizen.income);
  const weeklyIncome = typeof window.WS_APP.getCitizenWeeklyIncomeTotal === "function"
    ? window.WS_APP.getCitizenWeeklyIncomeTotal(citizen)
    : income.filter((item) => item.active).reduce((sum, item) => sum + item.amount, 0);
  const subscriptionCost = activeSubscriptions.reduce((sum, item) => sum + parseCreditValue(item.amount), 0);
  const debt = parseCreditValue(citizen.debt);

  return {
    masked,
    shortId: masked ? maskProfileShortId(shortId) : shortId,
    name: window.WS_APP.formatCitizenDisplayName?.(citizen, { user }) || citizen.legalName || shortId,
    profile,
    profileClass: profile.toLowerCase(),
    age: masked ? "--" : getProfileAge(citizen),
    origin: masked ? maskProfileOrigin(citizen.origin) : (citizen.origin || "UNKNOWN"),
    risk: Number(citizen.risk) || 0,
    occupations: getProfileOccupations(citizen),
    serviceLog: normalizeProfileServiceLog(citizen.serviceLog, citizen),
    credits: parseCreditValue(citizen.credits),
    debt,
    netCycle: weeklyIncome - subscriptionCost,
    activeSubscriptions: activeSubscriptions.length,
    totalSubscriptions: subscriptions.length,
    subscriptionCost,
    cyberwareCount: getProfileCyberwareCount(citizen),
    note: citizen.note || ""
  };
}

function getProfileOccupations(citizen = {}) {
  const activeService = normalizeProfileServiceLog(citizen.serviceLog, citizen)
    .filter((entry) => entry.status === "ACTIVE")
    .map((entry) => ({
      organization: entry.provider || "LOCAL SERVICE REGISTRY",
      role: entry.title || entry.typeLabel || "ACTIVE SERVICE"
    }));
  if (activeService.length) return activeService;

  return [{ organization: "SERVICE REGISTRY", role: "NO ACTIVE SERVICE" }];
}

function normalizeProfileServiceLog(value, citizen = {}) {
  const base = (Array.isArray(value) ? value : []).filter(Boolean);

  return base.map((entry) => ({
    ...entry,
    provider: String(entry.provider || "LOCAL SERVICE REGISTRY").trim(),
    title: String(entry.title || entry.name || "Service Record").trim(),
    typeLabel: String(entry.typeLabel || entry.reference || "SERVICE").trim(),
    status: String(entry.status || "ACTIVE").toUpperCase()
  }));
}

function renderProfileServiceLog(entries = []) {
  const visible = (entries || []).slice(0, 4);
  return `
    <details class="profile-summary-section profile-service-log scan-reveal">
      <summary><h4>Service Log</h4><span>${escapeHtml(entries.length)} RECORD${entries.length === 1 ? "" : "S"}</span></summary>
      <div class="profile-service-log-list">
        ${visible.length ? visible.map((entry) => `
          <article>
            <b>${escapeHtml(entry.title || "Service Record")}</b>
            <small>${escapeHtml(entry.provider || "LOCAL SERVICE REGISTRY")} / ${escapeHtml(entry.typeLabel || "SERVICE")} / ${escapeHtml(entry.status || "ACTIVE")}</small>
          </article>
        `).join("") : '<p>No service records registered.</p>'}
      </div>
    </details>
  `;
}

function renderProfileMetric(label, value) {
  return `
    <div class="profile-metric">
      <b>${escapeHtml(label)}</b>
      <span>${escapeHtml(value)}</span>
    </div>
  `;
}

function normalizeProfileSubscriptions(value) {
  return (Array.isArray(value) ? value : []).filter(Boolean).map((subscription) => ({
    ...subscription,
    active: subscription.active !== false,
    status: String(subscription.status || "PENDING").toUpperCase(),
    amount: parseCreditValue(subscription.amount)
  }));
}

function normalizeProfileIncome(value) {
  return (Array.isArray(value) ? value : [])
    .filter(Boolean)
    .filter((income) => String(income.serviceRecordId || "").trim())
    .map((income) => ({
      ...income,
      amount: parseCreditValue(income.amount),
      active: !["ARCHIVED", "SUSPENDED", "CANCELLED", "TERMINATED", "FAILED"].includes(String(income.status || "ACTIVE").toUpperCase()) && !income.archivedAt
    }));
}

function getProfileCyberwareCount(citizen = {}) {
  return typeof window.WS_APP.getInstalledCyberwareInstances === "function"
    ? window.WS_APP.getInstalledCyberwareInstances(citizen?.id || "").length
    : 0;
}

function getProfileAge(citizen = {}) {
  const age = window.WS_APP.getCitizenAge?.(citizen);
  if (age !== null && age !== undefined && age !== "") return String(age);
  if (citizen.age !== null && citizen.age !== undefined && citizen.age !== "") return String(citizen.age);
  return "N/A";
}

function maskProfileShortId(value = "") {
  const text = String(value || "00000000.XXXXXX");
  const tail = text.split(".").pop() || "XXXXXX";
  return `XXXXXXXX.${tail.slice(0, 2).padEnd(6, "X")}`;
}

function maskProfileOrigin(value = "") {
  const text = String(value || "N0:00.00");
  const prefix = text.split("::")[0] || "N0:00.00";
  return `${prefix}::MASKED`;
}

function parseCreditValue(value) {
  if (typeof window.WS_APP?.parseCreditValue === "function") return window.WS_APP.parseCreditValue(value);
  if (typeof window.WS_APP?.parseCredits === "function") return window.WS_APP.parseCredits(value);
  return window.WS_APP?.storeUtils?.parseCreditNumber?.(value) || 0;
}

function formatCredits(value) {
  if (typeof window.WS_APP?.formatCredits === "function") return window.WS_APP.formatCredits(value);
  return window.WS_APP?.storeUtils?.formatCreditLabel?.(value) || "0 ₡";
}

function renderDataRow(label, value) {
  return `
    <div class="data-row">
      <b>${escapeHtml(label)}</b>
      <span>${escapeHtml(value)}</span>
    </div>
  `;
}

function formatInsurance(citizen) {
  const values = [citizen.subscription, citizen.trauma].filter(Boolean);
  return values.length ? values.join(" / ") : "No active policy";
}

function escapeHtml(value) {
  if (typeof window.WS_APP?.escapeHtml === "function") return window.WS_APP.escapeHtml(value);
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function renderAdminAccessPanel(container, user) {
  const citizens = (window.WS_APP.getCitizens?.() || [])
    .filter((citizen) => citizen.recordType !== "admin")
    .sort((a, b) => getCitizenNameLabel(a, { user, legal: true }).localeCompare(getCitizenNameLabel(b, { user, legal: true }), "pl"));

  const senderOptions = buildAdminSenderOptions();
  const currentDate = window.WS_APP.getCampaignDateIso?.() || "2109-02-13";
  const requests = window.WS_APP.getServiceRequests?.("") || [];
  const activeRequests = requests.filter((request) => !["CLOSED", "DENIED"].includes(String(request.status || "").toUpperCase()));
  const firstRiskCitizen = citizens[0] || {};
  const firstRisk = Math.max(0, Math.min(100, Number(firstRiskCitizen.risk || 0)));

  container.innerHTML = `
    <article class="admin-command-panel is-polished">
      <div class="admin-access-header">
        <p class="kicker">ADMIN ACCESS / COMMAND PANEL</p>
        <h3>Command Panel</h3>
        <p>Local campaign control organized by date, economy, registry, requests and data operations.</p>
      </div>

      <nav class="admin-command-tabs system-inline-tabs" role="tablist" aria-label="Admin Command Panel tabs">
        <button type="button" class="system-inline-tab is-active" role="tab" aria-selected="true" data-admin-command-tab="date">Date</button>
        <button type="button" class="system-inline-tab" role="tab" aria-selected="false" data-admin-command-tab="economy">Economy</button>
        <button type="button" class="system-inline-tab" role="tab" aria-selected="false" data-admin-command-tab="users">Users</button>
        <button type="button" class="system-inline-tab" role="tab" aria-selected="false" data-admin-command-tab="requests">Requests</button>
        <button type="button" class="system-inline-tab" role="tab" aria-selected="false" data-admin-command-tab="data">Data</button>
      </nav>

      <section class="admin-command-group is-active" data-admin-tab-panel="date">
        <header class="admin-command-group-head">
          <span>Campaign Control</span>
          <strong>${escapeHtml(window.WS_APP.getCampaignDateLabel?.() || "13.02.2109")}</strong>
        </header>

        <section class="admin-command-block">
          <div class="admin-command-head">
            <span>Campaign Date</span>
            <strong data-campaign-date-label>${escapeHtml(window.WS_APP.getCampaignDateLabel?.() || "13.02.2109")}</strong>
          </div>

          <div class="admin-command-actions is-three">
            <button type="button" data-admin-date-delta="-1">-1 Day</button>
            <button type="button" data-admin-date-delta="1">+1 Day</button>
            <button type="button" data-admin-date-reset>Reset</button>
          </div>

          <label class="admin-command-field">
            <span>Set exact date</span>
            <input id="admin-campaign-date-input" type="date" value="${escapeHtml(currentDate)}" />
          </label>
          <button type="button" class="admin-command-primary" id="admin-set-campaign-date">Apply Date</button>
        </section>
      </section>

      <section class="admin-command-group" data-admin-tab-panel="economy">
        <header class="admin-command-group-head">
          <span>Economy Control</span>
          <strong>Credits / Risk</strong>
        </header>

        <section class="admin-command-block">
          <div class="admin-command-head">
            <span>Funds Transfer</span>
            <strong>Credits</strong>
          </div>

          <div class="admin-command-field-grid">
            <label class="admin-command-field">
              <span>Recipient</span>
              <select id="admin-transfer-recipient">
                ${citizens.map((citizen) => `<option value="${escapeHtml(citizen.id)}">${escapeHtml(getCitizenNameLabel(citizen, { user, legal: true }))}</option>`).join("")}
              </select>
            </label>

            <label class="admin-command-field">
              <span>Sender</span>
              <select id="admin-transfer-sender">
                <option value="__ADMIN__">Admin</option>
                <option value="__CUSTOM__">Custom</option>
                <option value="" disabled>────────────</option>
                ${senderOptions.map((sender) => `<option value="${escapeHtml(sender)}">${escapeHtml(sender)}</option>`).join("")}
              </select>
            </label>

            <label class="admin-command-field is-disabled" id="admin-custom-sender-wrap">
              <span>Custom sender</span>
              <input id="admin-transfer-custom-sender" type="text" placeholder="Manual transfer source" disabled />
            </label>

            <label class="admin-command-field">
              <span>Operation</span>
              <input type="hidden" id="admin-transfer-mode" value="ADD" />
              <span class="admin-command-switch" data-admin-transfer-mode-switch>
                <button type="button" class="is-active" data-admin-transfer-mode="ADD">Add</button>
                <button type="button" data-admin-transfer-mode="DEDUCT">Deduct</button>
              </span>
            </label>

            <label class="admin-command-field">
              <span>Amount</span>
              <span class="currency-input"><input id="admin-transfer-amount" type="number" min="0" step="1" placeholder="0" /><b>₡</b></span>
            </label>

            <label class="admin-command-field">
              <span>Transfer name</span>
              <input id="admin-transfer-title" type="text" placeholder="Payroll / reward / manual adjustment" />
            </label>

            <label class="admin-command-field">
              <span>Note</span>
              <input id="admin-transfer-note" type="text" placeholder="Transfer note / payroll / reward" />
            </label>
          </div>

          <button type="button" class="admin-command-primary" id="admin-add-funds">Apply Funds Operation</button>
        </section>

        <section class="admin-command-block">
          <div class="admin-command-head">
            <span>W&S Risk Control</span>
            <strong>Index</strong>
          </div>

          <div class="admin-risk-control-layout">
            <label class="admin-command-field">
              <span>Citizen</span>
              <select id="admin-risk-citizen">
                ${citizens.map((citizen) => `<option value="${escapeHtml(citizen.id)}">${escapeHtml(getCitizenNameLabel(citizen, { user, legal: true }))} / ${escapeHtml(citizen.risk ?? 0)}%</option>`).join("")}
              </select>
            </label>

            <section class="admin-risk-preview" data-admin-risk-preview>
              <div>
                <span>Current Risk</span>
                <strong data-admin-risk-current>${escapeHtml(firstRisk)}%</strong>
              </div>
              <div class="risk-meter">
                <span class="risk-fill" data-admin-risk-fill style="width: ${escapeHtml(firstRisk)}%;"></span>
              </div>
            </section>

            <div class="admin-risk-operation-row">
              <label class="admin-command-field">
                <span>Operation</span>
                <input type="hidden" id="admin-risk-mode" value="ADD" />
                <span class="admin-command-switch" data-admin-risk-mode-switch>
                  <button type="button" class="is-active" data-admin-risk-mode="ADD">Add</button>
                  <button type="button" data-admin-risk-mode="DEDUCT">Deduct</button>
                </span>
              </label>

              <label class="admin-command-field">
                <span>Reason</span>
                <input id="admin-risk-note" type="text" placeholder="Reason / incident / manual adjustment" />
              </label>
            </div>

            <label class="admin-command-field admin-risk-delta-field">
              <span>Risk delta</span>
              <input id="admin-risk-value" type="number" min="0" max="100" step="1" value="1" />
            </label>
          </div>

          <button type="button" class="admin-command-primary" id="admin-apply-risk">Apply Risk</button>
        </section>
      </section>

      <section class="admin-command-group" data-admin-tab-panel="users">
        <header class="admin-command-group-head">
          <span>User Registry</span>
          <strong>Login / Access</strong>
        </header>

        <section class="admin-command-block is-compact-actions">
          <div class="admin-command-head">
            <span>User Management</span>
            <strong>${escapeHtml((window.WS_APP.getUsers?.({ includeDisabled: true }) || []).length)} users</strong>
          </div>
          <button type="button" class="admin-command-primary" id="admin-open-user-registry">Open User Registry</button>
          <button type="button" id="admin-create-user-shortcut">Create User + Edit Login</button>
        </section>
      </section>

      <section class="admin-command-group" data-admin-tab-panel="requests">
        <header class="admin-command-group-head">
          <span>Request Control</span>
          <strong>${escapeHtml(activeRequests.length)} open</strong>
        </header>

        <section class="admin-command-block admin-command-request-block">
          <div class="admin-command-head">
            <span>System Requests</span>
            <strong>Review queue</strong>
          </div>
          ${renderAdminRequestControlList(activeRequests, citizens, user)}
        </section>
      </section>

      <section class="admin-command-group" data-admin-tab-panel="data">
        <header class="admin-command-group-head">
          <span>Data I/O</span>
          <strong>Schema / Import</strong>
        </header>

        <section class="admin-command-block is-compact-actions">
          <div class="admin-command-head">
            <span>Data Operations</span>
            <strong>Backup first</strong>
          </div>
          <button type="button" class="admin-command-primary" id="admin-open-data-io">Open Data I/O</button>
          <small class="admin-command-hint">Imports validate supported record arrays and create a local backup before writing.</small>
        </section>
      </section>
    </article>
  `;

  bindAdminCommandPanel(container, user);
}

function renderAdminRequestControlList(requests = [], citizens = [], user = {}) {
  const visible = requests.slice(0, 8);
  if (!visible.length) return '<p class="admin-command-empty">No open system requests.</p>';

  return `
    <div class="admin-command-request-list">
      ${visible.map((request) => {
        const citizen = citizens.find((item) => item.id === request.citizenId);
        const citizenLabel = citizen ? getCitizenNameLabel(citizen, { user, legal: true }) : request.citizenId;
        return `
          <article class="admin-command-request-card">
            <header>
              <span>
                <b>${escapeHtml(request.type || "REQUEST")}</b>
                <small>${escapeHtml(citizenLabel)} / ${escapeHtml(request.date || "-")}</small>
              </span>
              <strong>${escapeHtml(request.status || "PENDING")}</strong>
            </header>
            ${request.body ? `<p>${escapeHtml(request.body)}</p>` : ""}
            <div class="admin-command-request-actions">
              <button type="button" data-admin-panel-request-status="${escapeHtml(request.citizenId)}::${escapeHtml(request.id)}::REVIEWED">Reviewed</button>
              <button type="button" data-admin-panel-request-status="${escapeHtml(request.citizenId)}::${escapeHtml(request.id)}::APPROVED">Approve</button>
              <button type="button" data-admin-panel-request-status="${escapeHtml(request.citizenId)}::${escapeHtml(request.id)}::DENIED">Deny</button>
              <button type="button" data-admin-panel-request-status="${escapeHtml(request.citizenId)}::${escapeHtml(request.id)}::CLOSED">Resolve</button>
              <button type="button" data-admin-panel-open-terminal="${escapeHtml(request.citizenId)}">Open Terminal</button>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function buildAdminSenderOptions() {
  const base = [
    "PlentyMin Payroll Node",
    "TRAUMA Team",
    "Live & Prevail",
    "Watch & Secure",
    "Habitat Ledger",
    "Kagami Kaisha",
    "Factory Commons",
    "Black Market Contact"
  ];
  const providers = (window.WS_APP.getSubscriptionCatalog?.({ includeArchived: true }) || [])
    .flatMap((service) => [service.provider, service.name, service.title])
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return Array.from(new Set([...base, ...providers])).sort((a, b) => a.localeCompare(b, "pl"));
}

function bindAdminCommandSwitch(container, selector, hiddenInput) {
  container.querySelectorAll(selector).forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.adminTransferMode || button.dataset.adminRiskMode || "";
      if (hiddenInput) hiddenInput.value = value;
      const wrap = button.closest(".admin-command-switch");
      wrap?.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
    });
  });
}

function bindAdminCommandTabs(container) {
  const tabs = Array.from(container.querySelectorAll("[data-admin-command-tab]"));
  const panels = Array.from(container.querySelectorAll("[data-admin-tab-panel]"));
  if (!tabs.length || !panels.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.adminCommandTab || "date";
      tabs.forEach((item) => {
        const active = item === tab;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", active ? "true" : "false");
      });
      panels.forEach((panel) => {
        const active = panel.dataset.adminTabPanel === target;
        panel.hidden = !active;
        panel.classList.toggle("is-active", active);
      });
    });
  });

  panels.forEach((panel) => {
    const active = panel.classList.contains("is-active");
    panel.hidden = !active;
  });
}

function syncAdminRiskPreview(container) {
  const citizen = window.WS_APP.getCitizenById?.(container.querySelector("#admin-risk-citizen")?.value || "");
  const risk = Math.max(0, Math.min(100, Number(citizen?.risk || 0)));
  const label = container.querySelector("[data-admin-risk-current]");
  const fill = container.querySelector("[data-admin-risk-fill]");
  if (label) label.textContent = `${risk}%`;
  if (fill) fill.style.width = `${risk}%`;
}

function bindAdminCommandPanel(container, user) {
  bindAdminCommandTabs(container);

  container.querySelectorAll("[data-admin-date-delta]").forEach((button) => {
    button.addEventListener("click", () => {
      window.WS_APP.addCampaignDays?.(Number(button.dataset.adminDateDelta) || 0);
      const input = container.querySelector("#admin-campaign-date-input");
      if (input) input.value = window.WS_APP.getCampaignDateIso?.() || "2109-02-13";
      window.WS_APP.appendTerminalLogLine?.(`CAMPAIGN DATE UPDATED / ${window.WS_APP.getCampaignDateLabel?.()}`, { typed: true, speed: 8 });
    });
  });

  container.querySelector("[data-admin-date-reset]")?.addEventListener("click", () => {
    window.WS_APP.setCampaignDateIso?.("2109-02-13");
    const input = container.querySelector("#admin-campaign-date-input");
    if (input) input.value = "2109-02-13";
  });

  container.querySelector("#admin-set-campaign-date")?.addEventListener("click", () => {
    const value = container.querySelector("#admin-campaign-date-input")?.value || "";
    if (!window.WS_APP.setCampaignDateIso?.(value)) {
      window.WS_APP.confirmAction?.({ title: "INVALID DATE", message: "Campaign date must use YYYY-MM-DD format.", confirmLabel: "OK", singleAction: true });
      return;
    }
    window.WS_APP.appendTerminalLogLine?.(`CAMPAIGN DATE SET / ${window.WS_APP.getCampaignDateLabel?.()}`, { typed: true, speed: 8 });
  });

  const senderSelect = container.querySelector("#admin-transfer-sender");
  const customSenderWrap = container.querySelector("#admin-custom-sender-wrap");
  const customSenderInput = container.querySelector("#admin-transfer-custom-sender");
  const transferModeInput = container.querySelector("#admin-transfer-mode");
  const riskModeInput = container.querySelector("#admin-risk-mode");

  const syncCustomSender = () => {
    const custom = senderSelect?.value === "__CUSTOM__";
    if (customSenderInput) customSenderInput.disabled = !custom;
    customSenderWrap?.classList.toggle("is-disabled", !custom);
  };

  senderSelect?.addEventListener("change", syncCustomSender);
  syncCustomSender();

  bindAdminCommandSwitch(container, "[data-admin-transfer-mode]", transferModeInput);
  bindAdminCommandSwitch(container, "[data-admin-risk-mode]", riskModeInput);

  container.querySelector("#admin-add-funds")?.addEventListener("click", () => {
    const citizenId = container.querySelector("#admin-transfer-recipient")?.value || "";
    const amount = Number(container.querySelector("#admin-transfer-amount")?.value || 0);
    const senderValue = senderSelect?.value || "__ADMIN__";
    const sender = senderValue === "__CUSTOM__"
      ? (customSenderInput?.value || "Custom transfer")
      : senderValue === "__ADMIN__"
        ? "Admin"
        : senderValue;
    const note = container.querySelector("#admin-transfer-note")?.value || "";
    const title = container.querySelector("#admin-transfer-title")?.value || "";
    const senderType = senderValue === "__ADMIN__" ? "ADMIN" : "EXTERNAL";

    const mode = String(transferModeInput?.value || "ADD").toUpperCase();
    const updated = mode === "DEDUCT"
      ? window.WS_APP.deductCitizenCredits?.(citizenId, { amount, sender, senderType, note, title, createdBy: user.login })
      : window.WS_APP.addCitizenCredits?.(citizenId, { amount, sender, senderType, note, title, createdBy: user.login });

    if (!updated) {
      window.WS_APP.confirmAction?.({ title: "TRANSFER FAILED", message: "Select a recipient and a positive credit amount.", confirmLabel: "OK", singleAction: true });
      return;
    }

    const verb = mode === "DEDUCT" ? "deducted from" : "transferred to";
    window.WS_APP.confirmAction?.({ title: "TRANSFER COMPLETE", message: `${amount} ₡ ${verb} ${getCitizenNameLabel(updated, { user, legal: true })}.`, confirmLabel: "OK", singleAction: true });
    window.WS_APP.renderCitizenProfile?.(null, user);
  });

  container.querySelector("#admin-risk-citizen")?.addEventListener("change", () => {
    const input = container.querySelector("#admin-risk-value");
    if (input && !Number(input.value)) input.value = "1";
    syncAdminRiskPreview(container);
  });

  container.querySelector("#admin-risk-citizen")?.dispatchEvent(new Event("change"));
  syncAdminRiskPreview(container);

  container.querySelector("#admin-apply-risk")?.addEventListener("click", () => {
    const citizenId = container.querySelector("#admin-risk-citizen")?.value || "";
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    const delta = Math.max(0, Number(container.querySelector("#admin-risk-value")?.value || 0));
    const mode = String(riskModeInput?.value || "ADD").toUpperCase();
    const currentRisk = Number(citizen?.risk || 0);
    const risk = mode === "DEDUCT" ? Math.max(0, currentRisk - delta) : Math.min(100, currentRisk + delta);
    const reason = container.querySelector("#admin-risk-note")?.value || "Manual W&S risk adjustment.";
    const updated = window.WS_APP.setCitizenRisk?.(citizenId, risk, { reason, createdBy: user.login });

    if (!updated) {
      window.WS_APP.confirmAction?.({ title: "RISK UPDATE FAILED", message: "Select a citizen and risk value from 0 to 100.", confirmLabel: "OK", singleAction: true });
      return;
    }

    window.WS_APP.confirmAction?.({ title: "RISK UPDATED", message: `${getCitizenNameLabel(updated, { user, legal: true })}: ${updated.risk}%`, confirmLabel: "OK", singleAction: true });
    syncAdminRiskPreview(container);
  });

  container.querySelector("#admin-open-user-registry")?.addEventListener("click", () => {
    window.WS_APP.openModule?.("access-control", user, { skipLoader: true });
  });

  container.querySelector("#admin-create-user-shortcut")?.addEventListener("click", () => {
    const created = window.WS_APP.createUser?.({ login: "New User", password: "password", role: "citizen", displayName: "New User", accessTags: ["PUBLIC"] });
    window.WS_APP.accessControlOpenUserId = created?.id || "";
    window.WS_APP.openModule?.("access-control", user, { skipLoader: true });
  });

  container.querySelector("#admin-open-data-io")?.addEventListener("click", () => {
    window.WS_APP.openDataIO?.();
  });

  container.querySelectorAll("[data-admin-panel-request-status]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [citizenId, requestId, status] = String(button.dataset.adminPanelRequestStatus || "").split("::");
      if (!citizenId || !requestId || !status) return;
      const confirmed = await window.WS_APP.confirmAction?.({
        title: "UPDATE SERVICE REQUEST",
        message: `Set request status to ${status}?`,
        confirmLabel: "Confirm",
        cancelLabel: "Cancel"
      });
      if (!confirmed) return;
      window.WS_APP.updateServiceRequestStatus?.(citizenId, requestId, status, { createdBy: user.login || "ADMIN" });
      window.WS_APP.renderCitizenProfile?.(null, user);
    });
  });

  container.querySelectorAll("[data-admin-panel-open-terminal]").forEach((button) => {
    button.addEventListener("click", () => {
      window.WS_APP.terminalTargetCitizenId = button.dataset.adminPanelOpenTerminal || "";
      window.WS_APP.openModule?.("terminal-hub", user, { skipLoader: true, panel: "requests" });
    });
  });
}

function formatInsurance(citizen) {
  const insuranceSubscriptions = (Array.isArray(citizen?.subscriptions) ? citizen.subscriptions : [])
    .filter((subscription) => String(subscription.category || "").toUpperCase() === "INSURANCE" && String(subscription.status || "").toUpperCase() !== "CANCELLED")
    .map((subscription) => {
      const tier = String(subscription.tierLabel || subscription.tier || "").trim();
      const provider = String(subscription.provider || subscription.title || "INSURANCE").trim();
      return tier ? `${provider}: ${tier}` : provider;
    });

  if (insuranceSubscriptions.length) return insuranceSubscriptions.join(" / ");

  const subscription = String(citizen.subscription || "").trim();
  const trauma = String(citizen.trauma || "").trim();

  if (!subscription || subscription === "N/A") {
    return trauma && trauma !== "N/A" ? trauma : "N/A";
  }

  if (!trauma || trauma === "N/A") {
    return subscription;
  }

  return `${subscription} / ${trauma}`;
}

function renderDataRow(label, value) {
  return `
    <div class="data-row">
      <b>${escapeHtml(label)}</b>
      <span>${escapeHtml(value)}</span>
    </div>
  `;
}

