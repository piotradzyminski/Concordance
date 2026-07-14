/*
  Billing / Income / Transaction Ledger module.
  Extracted from js/modules.js so Terminal Hub routing can stay generic while
  Billing rendering and transaction helpers live next to css/billing.css.
*/

const TERMINAL_BILLING_SECTIONS = ["financial", "income", "transactions"];
const TERMINAL_TRANSACTION_MODES = ["transfer", "debt", "subscriptions"];
const TERMINAL_LEDGER_DIRECTION_OPTIONS = [
  ["ALL", "All"],
  ["CREDITS", "Credits"],
  ["CHARGES", "Charges"]
];
const TERMINAL_LEDGER_SORT_OPTIONS = [
  ["NEWEST", "Newest"],
  ["OLDEST", "Oldest"],
  ["CREDITS_FIRST", "Credits first"],
  ["CHARGES_FIRST", "Charges first"]
];

function parseBillingCreditNumber(value) {
  if (typeof window.WS_APP?.parseCredits === "function") return window.WS_APP.parseCredits(value);
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const cleaned = String(value || "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/,/g, ".");
  const number = Number(cleaned);
  return Number.isFinite(number) ? Math.round(number) : 0;
}


function billingEscapeHtml(value) {
  if (typeof window.WS_APP?.escapeHtml === "function") return window.WS_APP.escapeHtml(value);
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function billingFormatCredits(value) {
  if (typeof window.WS_APP?.formatCredits === "function") return window.WS_APP.formatCredits(value);
  return `${parseBillingCreditNumber(value).toLocaleString("pl-PL")} ?`;
}

function billingFormatDateDisplay(value) {
  if (typeof window.WS_APP?.formatDateDisplay === "function") return window.WS_APP.formatDateDisplay(value);
  const text = String(value || "").trim();
  if (!text) return "OPEN-ENDED";
  return text.length >= 10 ? text.slice(0, 10) : text;
}

function billingGetCitizenShortId(citizen = {}) {
  return window.WS_APP?.getCitizenShortId?.(citizen) || citizen.shortId || citizen.id || "UNKNOWN";
}

function billingGetCitizenNameLabel(citizen = {}, options = {}) {
  return window.WS_APP?.getCitizenNameLabel?.(citizen, options)
    || window.WS_APP?.formatCitizenDisplayName?.(citizen, { user: options.user || window.WS_APP.currentUser, legal: options.legal === true })
    || citizen.legalName
    || billingGetCitizenShortId(citizen)
    || "UNKNOWN CITIZEN";
}

function billingGetFinancialLedger(citizen = {}) {
  const ledger = window.WS_APP?.getCitizenFinancialLedger?.(citizen);
  if (ledger) return ledger;
  const income = window.WS_APP?.getCitizenWeeklyIncomeSources?.(citizen) || [];
  const credits = parseBillingCreditNumber(citizen.credits);
  const debt = parseBillingCreditNumber(citizen.debt);
  return {
    subscriptions: Array.isArray(citizen.subscriptions) ? citizen.subscriptions : [],
    income,
    subscriptionTotal: 0,
    incomeTotal: window.WS_APP?.getCitizenWeeklyIncomeTotal?.(citizen) || 0,
    credits,
    debt,
    netCycle: 0 - debt
  };
}

function billingIsSubscriptionPayable(subscription = {}) {
  return typeof window.WS_APP?.isSubscriptionPayable === "function"
    ? window.WS_APP.isSubscriptionPayable(subscription)
    : false;
}

function normalizeBillingPaymentSource(value) {
  const source = String(value || "CREDITS").trim().toUpperCase();
  return source === "DEBT_ACCOUNT" ? "DEBT_ACCOUNT" : "CREDITS";
}

function billingGetDebtAccountStatus(citizenOrLedger = {}) {
  if (typeof window.WS_APP?.getCitizenDebtCapacity === "function" && citizenOrLedger?.id) {
    return window.WS_APP.getCitizenDebtCapacity(citizenOrLedger);
  }
  const debt = parseBillingCreditNumber(citizenOrLedger.debt);
  const limit = parseBillingCreditNumber(window.WS_APP?.BILLING_DEBT_LIMIT || 20000);
  const capacity = Math.max(0, limit - debt);
  return { debt, limit, capacity, canCharge: capacity > 0 };
}

function getBillingPaymentSourceLabel(source) {
  return normalizeBillingPaymentSource(source) === "DEBT_ACCOUNT" ? "Debt Account" : "Credits";
}

function executeBillingSubscriptionCommand(citizenId, options = {}) {
  const api = window.WS_APP?.SubscriptionAPI;
  if (!api) return { ok: false, reason: "SUBSCRIPTION_API_UNAVAILABLE" };
  const commandResult = options.subscriptionId && !options.category && !(Array.isArray(options.subscriptionIds) && options.subscriptionIds.length)
    ? api.processSubscriptionBilling?.(options.subscriptionId, options)
    : api.processCitizenSubscriptionBilling?.(citizenId, options);
  if (!commandResult?.ok) {
    return {
      ok: false,
      reason: commandResult?.errorCode || commandResult?.resultCode || "SUBSCRIPTION_COMMAND_FAILED",
      ...(commandResult?.billingResult || {})
    };
  }
  return {
    ...(commandResult.billingResult || {}),
    ok: true,
    citizen: commandResult.citizen || null,
    resultCode: commandResult.resultCode || "OK"
  };
}

function billingFormatTerminalRowValue(label = "", value = "") {
  if (typeof window.WS_APP?.formatTerminalRowValue === "function") return window.WS_APP.formatTerminalRowValue(label, value);
  const key = String(label || "").trim().toUpperCase();
  return key ? `${key}: ${value}` : String(value ?? "");
}

function renderTerminalBillingPanel(user, citizen) {
  const ledger = billingGetFinancialLedger(citizen);
  const incomeSources = window.WS_APP.getCitizenWeeklyIncomeSources?.(citizen) || ledger.income;
  const weeklyIncome = window.WS_APP.getCitizenWeeklyIncomeTotal?.(citizen) || ledger.incomeTotal;
  const weeklyCost = ledger.subscriptionTotal;
  const forecast = window.WS_APP.previewWeeklySettlement?.(citizen.id) || buildLocalSettlementPreview(ledger, weeklyIncome, weeklyCost);
  const payableSubscriptions = ledger.subscriptions.filter(isSubscriptionPayable);
  const recipients = (window.WS_APP.getTerminalTransferCitizens?.() || []).filter((entry) => entry.id !== citizen.id);
  const history = window.WS_APP.getBillingHistory?.(citizen.id) || [];
  const activeSection = getTerminalBillingSection();
  const transactionMode = getTerminalTransactionMode();

  return `
    <section class="terminal-subpanel terminal-billing-panel">
      <header class="terminal-subpanel-head terminal-billing-head">
        <div>
          <p class="kicker">TERMINAL / BILLING</p>
          <h5>Financial Control</h5>
        </div>
        <div class="terminal-subpanel-actions">
          <button type="button" data-terminal-open-module="subscriptions">Open Subscriptions</button>
          ${user.role === "admin" ? '<button type="button" data-terminal-preview-settlement>Preview Settlement</button><button type="button" data-terminal-force-settlement>Force Settlement</button>' : ""}
        </div>
      </header>

      <nav class="terminal-billing-tabs system-inline-tabs" role="tablist" aria-label="Billing sections">
        ${renderTerminalBillingTab("financial", "Financial Control", activeSection)}
        ${renderTerminalBillingTab("income", "Income Sources", activeSection)}
        ${renderTerminalBillingTab("transactions", "Transaction Ledger", activeSection)}
      </nav>

      <div class="terminal-billing-section-body">
        ${activeSection === "income" ? renderIncomeSourcesPanel(user, citizen, incomeSources) : ""}
        ${activeSection === "transactions" ? renderTerminalTransactionPanel(ledger, recipients, payableSubscriptions, history, transactionMode) : ""}
        ${activeSection === "financial" ? renderTerminalFinancialControlSection(ledger, weeklyIncome, weeklyCost, forecast) : ""}
      </div>
    </section>
  `;
}

function getTerminalBillingSection() {
  const value = String(window.WS_APP.terminalBillingSection || "financial").toLowerCase();
  return TERMINAL_BILLING_SECTIONS.includes(value) ? value : "financial";
}

function getTerminalTransactionMode() {
  const value = String(window.WS_APP.terminalTransactionMode || "transfer").toLowerCase();
  return TERMINAL_TRANSACTION_MODES.includes(value) ? value : "transfer";
}

function renderTerminalBillingTab(id, label, activeSection) {
  return `<button type="button" class="terminal-billing-tab system-inline-tab ${activeSection === id ? "is-active" : ""}" role="tab" aria-selected="${activeSection === id ? "true" : "false"}" data-terminal-billing-section="${billingEscapeHtml(id)}">${billingEscapeHtml(label)}</button>`;
}

function renderTransactionModeButton(id, label, activeMode) {
  return `<button type="button" class="system-mode-switch__option ${activeMode === id ? "is-active" : ""}" role="tab" aria-selected="${activeMode === id ? "true" : "false"}" data-terminal-transaction-mode="${billingEscapeHtml(id)}">${billingEscapeHtml(label)}</button>`;
}

function renderTerminalFinancialControlSection(ledger, weeklyIncome, weeklyCost, forecast) {
  const nextSettlement = window.WS_APP.getSettlementPeriodEndLabel?.() || window.WS_APP.SETTLEMENT_PERIOD_END_LABEL || "-";
  return `
    <section class="terminal-billing-section terminal-financial-control-section">
      ${renderTerminalBillingNotice(forecast)}
      <div class="terminal-financial-control-grid">
        ${renderBillingControlBox("Account Control", [
          ["Credits", billingFormatCredits(ledger.credits)],
          ["Billing Status", forecast.status || "CLEAR"],
          ["Next Settlement Period", nextSettlement]
        ])}
        ${renderBillingControlBox("Subscription Control", [
          ["Weekly Subscriptions", billingFormatCredits(weeklyCost)],
          ["Subscriptions Due", billingFormatCredits(forecast.subscriptionCharge || weeklyCost || 0)],
          ["Credits Used", billingFormatCredits(forecast.paidFromCredits || 0)]
        ])}
        ${renderBillingControlBox("Debt Control", [
          ["Current Debt", billingFormatCredits(ledger.debt)],
          ["Projected Debt Increase", billingFormatCredits(forecast.debtIncrease || 0)],
          ["Projected Debt Recovery", billingFormatCredits(forecast.debtRecovery || 0)],
          ["Projected Final Debt", billingFormatCredits(forecast.finalDebt || 0)]
        ])}
        ${renderBillingControlBox("Income Control", [
          ["Weekly Income", `${billingFormatCredits(weeklyIncome)} / WEEK`],
          ["Projected Final Balance", billingFormatCredits(forecast.finalCredits || 0)]
        ])}
      </div>
    </section>
  `;
}

function renderBillingControlBox(title, rows = []) {
  return `
    <section class="terminal-billing-control-box">
      <h6>${billingEscapeHtml(title)}</h6>
      <div class="terminal-billing-control-list">
        ${rows.map(([label, value]) => `
          <div class="terminal-billing-control-row">
            <span>${billingEscapeHtml(label)}</span>
            <strong>${billingEscapeHtml(value)}</strong>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderTerminalTransactionPanel(ledger, recipients, payableSubscriptions, history, transactionMode = "transfer") {
  const ledgerControls = getTerminalLedgerControls();

  return `
    <section class="terminal-billing-section terminal-transaction-control-section">
      <div class="terminal-transaction-shell">
        <header class="terminal-transaction-head">
          <div>
            <h6>Transaction Control</h6>
            <small>Select an operation, then complete the required fields.</small>
          </div>
          <div class="terminal-transaction-type-field">
            <span>Transaction Type</span>
            <div class="terminal-transaction-mode-tabs system-mode-switch" role="tablist" aria-label="Transaction type">
              ${renderTransactionModeButton("transfer", "Transfer", transactionMode)}
              ${renderTransactionModeButton("debt", "Pay Debt", transactionMode)}
              ${renderTransactionModeButton("subscriptions", "Pay Subscriptions", transactionMode)}
            </div>
          </div>
        </header>

        ${renderTransactionOperationForms(ledger, recipients, payableSubscriptions, transactionMode)}
      </div>

      ${renderTransactionLedgerSection(history, ledgerControls)}
    </section>
  `;
}

function renderTransactionOperationForms(ledger, recipients, payableSubscriptions, transactionMode = "transfer") {
  return [
    renderCreditTransferForm(recipients, transactionMode),
    renderDebtPaymentForm(ledger, transactionMode),
    renderSubscriptionPaymentForm(payableSubscriptions, transactionMode, ledger)
  ].join("");
}

function renderCreditTransferForm(recipients = [], transactionMode = "transfer") {
  const hasRecipients = recipients.length > 0;
  return `
    <form class="terminal-action-form terminal-transaction-form ${transactionMode === "transfer" ? "is-active" : ""}" data-terminal-transfer-form data-terminal-transaction-block="transfer">
      <h6>Transfer ₡</h6>
      <label><span>Recipient</span><select name="recipient" required>${recipients.map(renderCreditTransferRecipientOption).join("")}</select></label>
      <label><span>Title</span><input name="title" type="text" maxlength="80" placeholder="Transfer title" required /></label>
      <label><span>Amount</span><span class="terminal-credit-input"><input name="amount" type="number" min="1" step="1" placeholder="0" required /><em>₡</em></span></label>
      <label><span>Type</span><input type="hidden" name="transferType" value="ONE_TIME" /><span class="terminal-payment-scope-tabs system-mode-switch"><button type="button" class="system-mode-switch__option is-active" aria-pressed="true" data-terminal-transfer-type="ONE_TIME">ONE-TIME</button><button type="button" class="system-mode-switch__option" aria-pressed="false" data-terminal-transfer-type="STANDING_ORDER">STANDING ORDER</button></span></label>
      <label class="is-wide"><span>Note</span><input name="note" type="text" maxlength="120" placeholder="Optional transfer note" /></label>
      <button type="submit" ${hasRecipients ? "" : "disabled"}>Send Transfer</button>
    </form>
  `;
}

function renderCreditTransferRecipientOption(entry) {
  return `<option value="${billingEscapeHtml(entry.id)}">${billingEscapeHtml(billingGetCitizenNameLabel(entry, { legal: true }))} / ${billingEscapeHtml(billingGetCitizenShortId(entry) || entry.id)}</option>`;
}

function renderDebtPaymentForm(ledger, transactionMode = "transfer") {
  const maxDebtPayment = Math.min(ledger.credits, ledger.debt);
  const canPayDebt = ledger.debt > 0 && ledger.credits > 0;
  return `
    <form class="terminal-action-form terminal-transaction-form ${transactionMode === "debt" ? "is-active" : ""}" data-terminal-debt-form data-terminal-transaction-block="debt">
      <h6>Pay Debt</h6>
      <label><span>Amount</span><span class="terminal-credit-input"><input name="amount" type="number" min="1" max="${billingEscapeHtml(maxDebtPayment)}" step="1" placeholder="${billingEscapeHtml(maxDebtPayment)}" required /><em>₡</em></span></label>
      <div class="terminal-transaction-button-row">
        <button type="button" data-terminal-debt-max ${maxDebtPayment > 0 ? "" : "disabled"}>MAX</button>
        <button type="submit" ${canPayDebt ? "" : "disabled"}>Pay Debt</button>
      </div>
    </form>
  `;
}

function renderSubscriptionPaymentForm(payableSubscriptions = [], transactionMode = "transfer", ledger = {}) {
  const hasPayableSubscriptions = payableSubscriptions.length > 0;
  const debtStatus = billingGetDebtAccountStatus(ledger);
  const canUseDebtAccount = debtStatus.capacity > 0;
  return `
    <form class="terminal-action-form terminal-transaction-form ${transactionMode === "subscriptions" ? "is-active" : ""}" data-terminal-subscription-form data-terminal-transaction-block="subscriptions">
      <h6>Pay Subscriptions</h6>
      <label class="is-wide"><span>Payment Scope</span><input type="hidden" name="subscriptionPaymentMode" value="SELECTED" /><span class="terminal-payment-scope-tabs system-mode-switch"><button type="button" class="system-mode-switch__option is-active" aria-pressed="true" data-terminal-subscription-scope="SELECTED">SELECTED SERVICES</button><button type="button" class="system-mode-switch__option" aria-pressed="false" data-terminal-subscription-scope="ALL">ALL POSSIBLE</button></span></label>
      <label class="is-wide"><span>Payment Source</span><input type="hidden" name="subscriptionPaymentSource" value="CREDITS" /><span class="terminal-payment-scope-tabs terminal-payment-source-tabs system-mode-switch"><button type="button" class="system-mode-switch__option is-active" aria-pressed="true" data-terminal-subscription-source="CREDITS">CREDITS</button><button type="button" class="system-mode-switch__option" aria-pressed="false" data-terminal-subscription-source="DEBT_ACCOUNT" ${canUseDebtAccount ? "" : "disabled"}>DEBT ACCOUNT</button></span><small class="terminal-debt-capacity-note">Debt Account capacity: ${billingEscapeHtml(billingFormatCredits(debtStatus.capacity))} / ${billingEscapeHtml(billingFormatCredits(debtStatus.limit))}</small></label>
      <div class="terminal-subscription-payment-list">
        ${hasPayableSubscriptions ? payableSubscriptions.map(renderSubscriptionPaymentOption).join("") : '<p class="file-empty">No pending or overdue subscription payment found.</p>'}
      </div>
      <button type="submit" ${hasPayableSubscriptions ? "" : "disabled"}>Pay Subscriptions</button>
    </form>
  `;
}

function renderSubscriptionPaymentOption(subscription, index) {
  return `
    <label class="terminal-subscription-payment-option">
      <input class="ui-select-control" type="checkbox" name="subscriptionIds" value="${billingEscapeHtml(subscription.id)}" ${index === 0 ? "checked" : ""} />
      <span>
        <b>${billingEscapeHtml(subscription.title)}</b>
        <small>${billingEscapeHtml(subscription.provider || subscription.category || "SERVICE")} / ${billingEscapeHtml(subscription.status || "PENDING")}</small>
      </span>
      <strong>${billingEscapeHtml(billingFormatCredits(subscription.amount))}</strong>
    </label>
  `;
}

function renderTransactionLedgerSection(history = [], ledgerControls = getTerminalLedgerControls()) {
  return `
    <details class="terminal-history-section terminal-ledger-section" open>
      <summary class="terminal-ledger-summary-row">
        <span>Transaction Ledger</span>
        <button type="button" data-terminal-clear-ledger ${history.length ? "" : "disabled"}>Clear Ledger</button>
      </summary>
      ${renderTerminalLedgerControls(ledgerControls)}
      <div class="terminal-ledger-scroll" data-terminal-ledger-list>
        ${history.length ? history.map((entry) => renderBillingHistoryEntry(entry)).join("") : '<p class="file-empty">No billing history registered.</p>'}
      </div>
      <p class="file-empty terminal-ledger-filter-empty" data-terminal-ledger-empty hidden>No transactions match current filters.</p>
    </details>
  `;
}

function getTerminalLedgerControls() {
  return {
    direction: String(window.WS_APP.terminalLedgerDirection || "ALL").toUpperCase(),
    sort: String(window.WS_APP.terminalLedgerSort || "NEWEST").toUpperCase(),
    sender: String(window.WS_APP.terminalLedgerSenderFilter || "").trim()
  };
}

function renderTerminalLedgerControls(controls = getTerminalLedgerControls()) {
  return `
    <div class="terminal-ledger-controls" data-terminal-ledger-controls>
      ${renderTerminalLedgerDropdown("Type", "direction", "data-terminal-ledger-direction", controls.direction, TERMINAL_LEDGER_DIRECTION_OPTIONS)}
      ${renderTerminalLedgerDropdown("Sort", "sort", "data-terminal-ledger-sort", controls.sort, TERMINAL_LEDGER_SORT_OPTIONS)}
      <label><span>Sender</span><input type="search" data-terminal-ledger-sender-filter value="${billingEscapeHtml(controls.sender)}" placeholder="Sender name" /></label>
    </div>
  `;
}

function renderTerminalLedgerDropdown(label, key, dataAttr, selectedValue, options = []) {
  const active = options.find(([value]) => value === selectedValue) || options[0] || ["", "-"];
  return `
    <label class="terminal-ledger-control-field"><span>${billingEscapeHtml(label)}</span>
      <div class="terminal-ledger-select" data-terminal-ledger-select="${billingEscapeHtml(key)}">
        <input type="hidden" ${dataAttr} value="${billingEscapeHtml(active[0])}" />
        <button type="button" class="terminal-ledger-select__button" data-terminal-ledger-select-toggle aria-haspopup="listbox" aria-expanded="false">${billingEscapeHtml(active[1])}</button>
        <div class="terminal-ledger-select__menu" role="listbox">
          ${options.map(([value, optionLabel]) => `
            <button type="button" role="option" class="terminal-ledger-select__option ${value === active[0] ? "is-active" : ""}" data-terminal-ledger-option="${billingEscapeHtml(value)}">${billingEscapeHtml(optionLabel)}</button>
          `).join("")}
        </div>
      </div>
    </label>
  `;
}

function getBillingHistorySignedAmount(entry = {}) {
  const type = String(entry.type || "").toUpperCase();
  const title = String(entry.title || "").toUpperCase();
  const isContractEvent = /^SUBSCRIPTION_(ACTIVATION|TIER_CHANGE)$/.test(type);
  if (entry.amount !== undefined && entry.amount !== null && entry.amount !== "") {
    const raw = parseBillingCreditNumber(entry.amount);
    if (isContractEvent && !entry.paidFromCredits && !entry.debtIncrease && !entry.debtRecovery) return 0;
    if (raw < 0) return raw;
    if (/(OUT|DEDUCT|DEDUCTION|PAYMENT|SUBSCRIPTION|DEBT)/.test(type) || /(OUT|DEDUCT|DEDUCTION|PAYMENT|SUBSCRIPTION|DEBT)/.test(title)) {
      return -Math.abs(raw);
    }
    return raw;
  }

  let signed = 0;
  signed += parseBillingCreditNumber(entry.income || 0);
  signed -= parseBillingCreditNumber(entry.subscriptionCharge || 0);
  signed -= parseBillingCreditNumber(entry.debtPayment || 0);
  signed -= parseBillingCreditNumber(entry.debtRecovery || 0);
  signed -= parseBillingCreditNumber(entry.debtIncrease || 0);
  return signed;
}

function buildBillingHistorySearchSender(entry = {}) {
  return [
    entry.sourceLabel,
    entry.sender,
    entry.createdBy,
    entry.counterpartyCitizenId ? billingGetCitizenNameLabel(window.WS_APP.getCitizenById?.(entry.counterpartyCitizenId) || {}, { legal: true }) : ""
  ].filter(Boolean).join(" ").toLowerCase();
}

function isTechnicalTerminalNote(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized || ["test", "dev", "developer", "null", "undefined"].includes(normalized);
}

function normalizeLedgerFlow(value) {
  const text = String(value || "").trim().toUpperCase();
  if (!text || text === "ALL") return "ALL";
  if (text.startsWith("CREDIT")) return "CREDIT";
  if (text.startsWith("CHARGE") || text.startsWith("DEBIT")) return "CHARGE";
  if (text.startsWith("NEUTRAL") || text === "ZERO") return "NEUTRAL";
  return text;
}

function applyTerminalLedgerControls(root = document) {
  const controls = root.querySelector("[data-terminal-ledger-controls]");
  const list = root.querySelector("[data-terminal-ledger-list]");
  if (!controls || !list) return;

  const direction = normalizeLedgerFlow(controls.querySelector("[data-terminal-ledger-direction]")?.value || "ALL");
  const sort = String(controls.querySelector("[data-terminal-ledger-sort]")?.value || "NEWEST").toUpperCase();
  const sender = String(controls.querySelector("[data-terminal-ledger-sender-filter]")?.value || "").trim().toLowerCase();
  const entries = Array.from(list.querySelectorAll(".terminal-ledger-entry"));

  const compareLedgerNewest = (a, b) => {
    const dateCompare = String(b.dataset.ledgerDate || "").localeCompare(String(a.dataset.ledgerDate || ""));
    if (dateCompare) return dateCompare;
    const sortCompare = Number(b.dataset.ledgerSortIndex || 0) - Number(a.dataset.ledgerSortIndex || 0);
    if (sortCompare) return sortCompare;
    const createdCompare = String(b.dataset.ledgerCreatedAt || "").localeCompare(String(a.dataset.ledgerCreatedAt || ""));
    if (createdCompare) return createdCompare;
    return String(b.dataset.ledgerRecordId || "").localeCompare(String(a.dataset.ledgerRecordId || ""));
  };
  const compareLedgerOldest = (a, b) => {
    const dateCompare = String(a.dataset.ledgerDate || "").localeCompare(String(b.dataset.ledgerDate || ""));
    if (dateCompare) return dateCompare;
    const sortCompare = Number(a.dataset.ledgerSortIndex || 0) - Number(b.dataset.ledgerSortIndex || 0);
    if (sortCompare) return sortCompare;
    const createdCompare = String(a.dataset.ledgerCreatedAt || "").localeCompare(String(b.dataset.ledgerCreatedAt || ""));
    if (createdCompare) return createdCompare;
    return String(a.dataset.ledgerRecordId || "").localeCompare(String(b.dataset.ledgerRecordId || ""));
  };

  entries.sort((a, b) => {
    if (sort === "OLDEST") return compareLedgerOldest(a, b);
    if (sort === "CREDIT_FIRST" || sort === "CREDITS_FIRST") return Number(b.dataset.ledgerSignedAmount || 0) - Number(a.dataset.ledgerSignedAmount || 0) || compareLedgerNewest(a, b);
    if (sort === "DEBIT_FIRST" || sort === "CHARGE_FIRST" || sort === "CHARGES_FIRST") return Number(a.dataset.ledgerSignedAmount || 0) - Number(b.dataset.ledgerSignedAmount || 0) || compareLedgerNewest(a, b);
    return compareLedgerNewest(a, b);
  }).forEach((entry) => list.appendChild(entry));

  let visible = 0;
  entries.forEach((entry) => {
    const amount = Number(entry.dataset.ledgerSignedAmount || 0);
    const entryDirection = normalizeLedgerFlow(entry.dataset.ledgerDirection || (amount > 0 ? "CREDIT" : amount < 0 ? "CHARGE" : "NEUTRAL"));
    const senderText = String(entry.dataset.ledgerSender || "").toLowerCase();
    const matchesDirection = direction === "ALL" || entryDirection === direction;
    const matchesSender = !sender || senderText.includes(sender);
    const isVisible = matchesDirection && matchesSender;
    entry.hidden = !isVisible;
    if (isVisible) visible += 1;
  });

  const empty = root.querySelector("[data-terminal-ledger-empty]");
  if (empty) empty.hidden = visible > 0 || entries.length === 0;
}

function buildLocalSettlementPreview(ledger, weeklyIncome, weeklyCost) {
  const creditsBefore = ledger.credits;
  const debtBefore = ledger.debt;
  const income = weeklyIncome;
  const subscriptionCharge = weeklyCost;
  const creditsAfterIncome = creditsBefore + income;
  const paidFromCredits = Math.min(creditsAfterIncome, subscriptionCharge);
  const debtIncrease = Math.max(0, subscriptionCharge - paidFromCredits);
  const creditsAfterSubscriptions = Math.max(0, creditsAfterIncome - paidFromCredits);
  const debtAfterSubscriptions = debtBefore + debtIncrease;
  const debtRecovery = Math.min(creditsAfterSubscriptions, debtAfterSubscriptions);
  const finalCredits = Math.max(0, creditsAfterSubscriptions - debtRecovery);
  const finalDebt = Math.max(0, debtAfterSubscriptions - debtRecovery);

  return {
    creditsBefore,
    debtBefore,
    income,
    subscriptionCharge,
    chargedSubscriptions: ledger.subscriptions.filter((item) => item.active).length,
    paidFromCredits,
    debtIncrease,
    debtRecovery,
    finalCredits,
    finalDebt,
    status: debtIncrease > 0 ? "DEFICIT" : debtRecovery > 0 ? "DEBT_RECOVERY" : "CLEAR"
  };
}

function renderTerminalBillingNotice(forecast = {}) {
  if (forecast.debtIncrease > 0) {
    return `
      <aside class="terminal-billing-notice is-warning">
        <b>BILLING WARNING</b>
        <span>Projected deficit detected. Expected debt increase: ${billingEscapeHtml(billingFormatCredits(forecast.debtIncrease))}.</span>
      </aside>
    `;
  }

  if (forecast.debtRecovery > 0) {
    return `
      <aside class="terminal-billing-notice is-debt">
        <b>DEBT NOTICE</b>
        <span>Debt will be automatically recovered during next settlement. Projected recovery: ${billingEscapeHtml(billingFormatCredits(forecast.debtRecovery))}.</span>
      </aside>
    `;
  }

  return `
    <aside class="terminal-billing-notice is-clear">
      <b>SETTLEMENT PREVIEW CLEAR</b>
      <span>No projected deficit for the next settlement period.</span>
    </aside>
  `;
}


const INCOME_SERVICE_TYPES = [
  "One-Time Mandatory Commission",
  "One-Time Regular Commission",
  "Fixed-Term Mandatory Contract",
  "Fixed-Term Regular Contract",
  "Long-Term Mandatory Agreement",
  "Long-Term Regular Agreement"
];

function normalizeIncomeServiceLabel(value = "", income = {}) {
  const raw = String(value || income.service || income.contractRef || "").trim();
  const normalized = raw.toUpperCase().replace(/\s+/g, " ");
  const mapped = {
    "JEDNORAZOWA MANDATORY": "One-Time Mandatory Commission",
    "JEDNORAZOWA REGULAR": "One-Time Regular Commission",
    "KONTRAKTOWA MANDATORY": "Fixed-Term Mandatory Contract",
    "KONTRAKTOWA REGULAR": "Fixed-Term Regular Contract",
    "DLUGOTERMINOWA REGULAR": "Long-Term Regular Agreement",
    "DŁUGOTERMINOWA REGULAR": "Long-Term Regular Agreement",
    "DLUGOTERMINOWA MANDATORY": "Long-Term Mandatory Agreement",
    "DŁUGOTERMINOWA MANDATORY": "Long-Term Mandatory Agreement",
    "ONE-TIME MANDATORY": "One-Time Mandatory Commission",
    "ONE-TIME REGULAR": "One-Time Regular Commission",
    "ONE TIME MANDATORY": "One-Time Mandatory Commission",
    "ONE TIME REGULAR": "One-Time Regular Commission",
    "MANDATORY ONE-TIME": "One-Time Mandatory Commission",
    "REGULAR ONE-TIME": "One-Time Regular Commission",
    "CONTRACT MANDATORY": "Fixed-Term Mandatory Contract",
    "CONTRACT REGULAR": "Fixed-Term Regular Contract",
    "LONG-TERM REGULAR": "Long-Term Regular Agreement",
    "LONG-TERM MANDATORY": "Long-Term Mandatory Agreement",
    "LONG TERM REGULAR": "Long-Term Regular Agreement",
    "LONG TERM MANDATORY": "Long-Term Mandatory Agreement"
  };
  if (/^OCCUPATION-\d+$/i.test(raw)) return "Long-Term Regular Agreement";
  if (mapped[normalized]) return mapped[normalized];
  if (INCOME_SERVICE_TYPES.some((type) => type.toUpperCase() === normalized)) {
    return INCOME_SERVICE_TYPES.find((type) => type.toUpperCase() === normalized);
  }
  return raw || "Long-Term Regular Agreement";
}

function isOneTimeIncomeService(serviceLabel = "") {
  const value = String(serviceLabel || "").toUpperCase();
  return value.includes("ONE-TIME") || value.includes("ONE TIME") || value.includes("COMMISSION") || value.includes("ASSIGNMENT");
}

function getIncomeProviderRoleLabel(serviceLabel = "") {
  return isOneTimeIncomeService(serviceLabel) ? "COMMISSIONING PARTY" : "EMPLOYER";
}


function getPendingServicePaymentStatusLabel(status = "") {
  const normalized = String(status || "").trim().toUpperCase();
  if (normalized === "PENDING_COMPLETION") return "Pending Completion";
  if (normalized === "READY_FOR_SETTLEMENT") return "Ready for Settlement";
  if (normalized === "PAID" || normalized === "SETTLED") return "Paid";
  if (normalized === "CANCELLED" || normalized === "FORFEITED") return "Cancelled";
  return normalized ? normalized.replace(/_/g, " ") : "Pending";
}

function getPendingServicePaymentDateLabel(payment = {}) {
  const status = String(payment.paymentStatus || "").toUpperCase();
  if (status === "READY_FOR_SETTLEMENT" && payment.completedAt) return `Completed ${billingFormatDateDisplay(payment.completedAt)}`;
  if (payment.dueDate) return `Due ${billingFormatDateDisplay(payment.dueDate)}`;
  if (payment.acceptedAt) return `Accepted ${billingFormatDateDisplay(payment.acceptedAt)}`;
  return "Awaiting service completion";
}

function renderPendingServicePaymentEntry(payment = {}) {
  const status = String(payment.paymentStatus || "PENDING_COMPLETION").toUpperCase();
  const meta = [
    payment.provider || "LOCAL SERVICE REGISTRY",
    payment.typeLabel || "Service Commission",
    getPendingServicePaymentStatusLabel(status)
  ].filter(Boolean).join(" / ");
  const details = [
    payment.provider ? `<span><b>COMMISSIONING PARTY</b>${billingEscapeHtml(payment.provider)}</span>` : "",
    payment.serviceStatus ? `<span><b>SERVICE STATUS</b>${billingEscapeHtml(payment.serviceStatus)}</span>` : "",
    payment.paymentStatus ? `<span><b>PAYMENT STATUS</b>${billingEscapeHtml(getPendingServicePaymentStatusLabel(payment.paymentStatus))}</span>` : "",
    payment.acceptedAt ? `<span><b>ACCEPTED</b>${billingEscapeHtml(billingFormatDateDisplay(payment.acceptedAt))}</span>` : "",
    payment.completedAt ? `<span><b>COMPLETED</b>${billingEscapeHtml(billingFormatDateDisplay(payment.completedAt))}</span>` : "",
    payment.dueDate ? `<span><b>DUE</b>${billingEscapeHtml(billingFormatDateDisplay(payment.dueDate))}</span>` : "",
    payment.settlementWeek ? `<span><b>SETTLEMENT WEEK</b>${billingEscapeHtml(payment.settlementWeek)}</span>` : "",
    payment.details ? `<span><b>DETAILS</b>${billingEscapeHtml(payment.details)}</span>` : ""
  ].filter(Boolean).join("");

  return `
    <details class="terminal-income-source-entry terminal-income-pending-entry ${status === "READY_FOR_SETTLEMENT" ? "is-ready" : "is-pending"}">
      <summary>
        <span>
          <b>${billingEscapeHtml(payment.title || "Pending Service Payment")}</b>
          <small>${billingEscapeHtml(meta)}</small>
          <small>${billingEscapeHtml(getPendingServicePaymentDateLabel(payment))}</small>
        </span>
        <strong>${billingEscapeHtml(billingFormatCredits(payment.amount || 0))}</strong>
      </summary>
      <div class="terminal-income-source-detail">
        ${details || '<span><b>DETAILS</b>No pending payment data registered.</span>'}
      </div>
    </details>
  `;
}

function renderIncomeSourcesPanel(user, citizen, incomeSources = []) {
  const pendingPayments = window.WS_APP.getCitizenPendingServicePayments?.(citizen) || [];
  const pendingCompletionTotal = pendingPayments
    .filter((payment) => String(payment.paymentStatus || "").toUpperCase() === "PENDING_COMPLETION")
    .reduce((sum, payment) => sum + parseBillingCreditNumber(payment.amount), 0);
  const readyForSettlementTotal = pendingPayments
    .filter((payment) => String(payment.paymentStatus || "").toUpperCase() === "READY_FOR_SETTLEMENT")
    .reduce((sum, payment) => sum + parseBillingCreditNumber(payment.amount), 0);

  return `
    <section class="terminal-income-source-section">
      <div class="terminal-income-source-head">
        <h6>Income Sources</h6>
        <small>Active weekly ledger sources and service-linked recurring income are settlement income. Pending service payments are future or queued commission payouts and are not counted as recurring income.</small>
      </div>
      <div class="terminal-income-source-list">
        ${incomeSources.length ? incomeSources.map((income) => {
          const status = String(income.status || "ACTIVE").toUpperCase();
          const serviceLabel = normalizeIncomeServiceLabel(income.reference, income);
          const providerRoleLabel = getIncomeProviderRoleLabel(serviceLabel);
          const meta = [income.provider || "LOCAL LEDGER", serviceLabel, status].filter(Boolean).join(" / ");
          const isArchived = ["ARCHIVED", "TERMINATED"].includes(status);
          const details = [
            income.provider ? `<span><b>${billingEscapeHtml(providerRoleLabel)}</b>${billingEscapeHtml(income.provider)}</span>` : "",
            serviceLabel ? `<span><b>SERVICE</b>${billingEscapeHtml(serviceLabel)}</span>` : "",
            income.details ? `<span><b>DETAILS</b>${billingEscapeHtml(income.details)}</span>` : "",
            income.terms ? `<span><b>TERMS</b>${billingEscapeHtml(income.terms)}</span>` : "",
            user.role === "admin" && income.createdBy ? `<span><b>CREATED BY</b>${billingEscapeHtml(income.createdBy)}</span>` : "",
            income.updatedAt ? `<span><b>UPDATED</b>${billingEscapeHtml(billingFormatDateDisplay(income.updatedAt))}</span>` : "",
            income.archivedAt ? `<span><b>ARCHIVED</b>${billingEscapeHtml(billingFormatDateDisplay(income.archivedAt))}</span>` : ""
          ].filter(Boolean).join("");
          return `
          <details class="terminal-income-source-entry ${status !== "ACTIVE" ? "is-muted" : ""} ${isArchived ? "is-archived" : ""}">
            <summary>
              <span>
                <b>${billingEscapeHtml(income.title || income.name || "Income Source")}</b>
                <small>${billingEscapeHtml(meta)}</small>
              </span>
              <strong>${billingEscapeHtml(billingFormatCredits(income.amount))}</strong>
            </summary>
            <div class="terminal-income-source-detail">
              ${details || '<span><b>DETAILS</b>No additional income source data registered.</span>'}
            </div>
            ${user.role === "admin" ? `
              <div class="terminal-income-source-actions">
                <span>Controlled by Service Log / ${billingEscapeHtml(income.serviceRecordId || "NO SERVICE RECORD")}</span>
              </div>
            ` : ""}
          </details>
        `; }).join("") : '<p class="file-empty">No sanctioned recurring service income registered.</p>'}
      </div>
      <section class="terminal-income-pending-section">
        <header class="terminal-income-pending-head">
          <div>
            <h6>Pending Service Payments</h6>
            <small>Completion-paid services waiting for completion or settlement. These values do not increase active weekly income.</small>
          </div>
          <span>Pending ${billingEscapeHtml(billingFormatCredits(pendingCompletionTotal))} / Ready ${billingEscapeHtml(billingFormatCredits(readyForSettlementTotal))}</span>
        </header>
        <div class="terminal-income-source-list terminal-income-pending-list">
          ${pendingPayments.length ? pendingPayments.map(renderPendingServicePaymentEntry).join("") : '<p class="file-empty">No pending service payments registered.</p>'}
        </div>
      </section>
      ${user.role === "admin" ? `
        <p class="file-empty">Income Sources include direct ledger income and service-linked recurring income. Completion-paid commissions remain pending until completed and approved/settled.</p>
      ` : ""}
    </section>
  `;
}

function getLedgerDirectionFromSignedAmount(signedAmount = 0) {
  if (signedAmount > 0) return "CREDIT";
  if (signedAmount < 0) return "CHARGE";
  return "NEUTRAL";
}

function getLedgerDirectionClass(signedAmount = 0) {
  const direction = getLedgerDirectionFromSignedAmount(signedAmount);
  if (direction === "CREDIT") return "is-credit";
  if (direction === "CHARGE") return "is-debit";
  return "is-neutral";
}

function renderBillingHistoryEntry(entry) {
  const signedAmount = getBillingHistorySignedAmount(entry);
  const ledgerDirection = getLedgerDirectionFromSignedAmount(signedAmount);
  const directionClass = getLedgerDirectionClass(signedAmount);
  const counterparty = entry.counterpartyCitizenId ? window.WS_APP.getCitizenById?.(entry.counterpartyCitizenId) : null;
  const counterpartyLabel = counterparty ? `${billingGetCitizenNameLabel(counterparty, { legal: true })} / ${billingGetCitizenShortId(counterparty) || counterparty.id}` : "";
  const sourceLabel = String(entry.sourceLabel || entry.sender || "").trim();
  const senderSearch = buildBillingHistorySearchSender(entry);
  const displayTitle = formatLedgerEntryTitle(entry, sourceLabel);
  const displayNote = isTechnicalTerminalNote(entry.note) ? "" : String(entry.note || "").trim();

  return `
    <div
      class="terminal-history-entry terminal-ledger-entry ${billingEscapeHtml(directionClass)}"
      data-ledger-signed-amount="${billingEscapeHtml(signedAmount)}"
      data-ledger-direction="${billingEscapeHtml(ledgerDirection)}"
      data-ledger-date="${billingEscapeHtml(entry.date || "")}"
      data-ledger-created-at="${billingEscapeHtml(entry.createdAt || "")}"
      data-ledger-sort-index="${billingEscapeHtml(entry.sortIndex || 0)}"
      data-ledger-record-id="${billingEscapeHtml(entry.id || "")}"
      data-ledger-sender="${billingEscapeHtml(senderSearch)}"
    >
      <span>
        <b>${billingEscapeHtml(displayTitle)}</b>
        <small>${billingEscapeHtml(billingFormatDateDisplay(entry.date))}${displayNote ? ` / ${billingEscapeHtml(billingFormatTerminalRowValue("note", displayNote))}` : ""}</small>
        ${sourceLabel ? `<small>SENDER: ${billingEscapeHtml(sourceLabel)}</small>` : ""}
        ${counterpartyLabel ? `<small>COUNTERPARTY: ${billingEscapeHtml(counterpartyLabel)}</small>` : ""}
      </span>
      <strong>${billingEscapeHtml(formatLedgerSignedCredits(signedAmount))}</strong>
      <div class="terminal-ledger-after">
        <span>BALANCE AFTER: <b>${billingEscapeHtml(billingFormatCredits(entry.creditsAfter || 0))}</b></span>
        <span>DEBT AFTER: <b>${billingEscapeHtml(billingFormatCredits(entry.debtAfter || 0))}</b></span>
      </div>
    </div>
  `;
}

function recordBillingSubscriptionPayment(citizenId, result = {}, previousLedger = null, options = {}) {
  // Compatibility wrapper retained for older call sites. Persistent subscription
  // payment history and Terminal Inbox entries are emitted by js/store.js inside
  // SubscriptionAPI payment commands. Do not duplicate them from the Billing renderer.
  void citizenId;
  void previousLedger;
  void options;
  return Boolean(result?.notificationRecorded);
}

function refreshTerminalBillingPanel(user) {
  if (typeof window.WS_APP?.renderTerminalPanelPartial === "function") {
    window.WS_APP.renderTerminalPanelPartial(user, "billing");
    return;
  }
  window.WS_APP?.renderTerminalHubModule?.(user, "billing");
}

function bindTerminalBillingActions(root, user, citizen) {
  if (!root || !citizen) return;

  root.querySelectorAll("[data-terminal-billing-section]").forEach((button) => {
    button.addEventListener("click", () => {
      window.WS_APP.terminalBillingSection = button.dataset.terminalBillingSection || "financial";
      refreshTerminalBillingPanel(user);
    });
  });

  root.querySelectorAll("[data-terminal-transaction-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      window.WS_APP.terminalTransactionMode = button.dataset.terminalTransactionMode || "transfer";
      root.querySelectorAll("[data-terminal-transaction-mode]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", active ? "true" : "false");
      });
      root.querySelectorAll("[data-terminal-transaction-block]").forEach((block) => {
        block.classList.toggle("is-active", block.dataset.terminalTransactionBlock === window.WS_APP.terminalTransactionMode);
      });
    });
  });

  root.querySelectorAll("[data-terminal-transfer-type]").forEach((button) => {
    button.addEventListener("click", () => {
      const form = button.closest("[data-terminal-transfer-form]");
      const input = form?.querySelector("input[name='transferType']");
      if (input) input.value = button.dataset.terminalTransferType || "ONE_TIME";
      form?.querySelectorAll("[data-terminal-transfer-type]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", active ? "true" : "false");
      });
    });
  });

  root.querySelectorAll("[data-terminal-subscription-source]").forEach((button) => {
    button.addEventListener("click", () => {
      const form = button.closest("[data-terminal-subscription-form]");
      const input = form?.querySelector("input[name='subscriptionPaymentSource']");
      if (input) input.value = button.dataset.terminalSubscriptionSource || "CREDITS";
      form?.querySelectorAll("[data-terminal-subscription-source]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", active ? "true" : "false");
      });
    });
  });

  root.querySelectorAll("[data-terminal-subscription-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      const form = button.closest("[data-terminal-subscription-form]");
      const input = form?.querySelector("input[name='subscriptionPaymentMode']");
      if (input) input.value = button.dataset.terminalSubscriptionScope || "SELECTED";
      form?.querySelectorAll("[data-terminal-subscription-scope]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", active ? "true" : "false");
      });
    });
  });

  root.querySelectorAll("[data-terminal-ledger-select]").forEach((select) => {
    const input = select.querySelector("[data-terminal-ledger-direction], [data-terminal-ledger-sort]");
    const toggle = select.querySelector("[data-terminal-ledger-select-toggle]");
    const options = Array.from(select.querySelectorAll("[data-terminal-ledger-option]"));
    const closeSelect = () => {
      select.classList.remove("is-open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    };

    toggle?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const shouldOpen = !select.classList.contains("is-open");
      root.querySelectorAll("[data-terminal-ledger-select].is-open").forEach((item) => {
        item.classList.remove("is-open");
        item.querySelector("[data-terminal-ledger-select-toggle]")?.setAttribute("aria-expanded", "false");
      });
      select.classList.toggle("is-open", shouldOpen);
      toggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
      if (shouldOpen) {
        setTimeout(() => {
          document.addEventListener("click", (outsideEvent) => {
            if (!select.contains(outsideEvent.target)) closeSelect();
          }, { once: true });
        }, 0);
      }
    });

    options.forEach((option) => {
      option.addEventListener("click", (event) => {
        event.preventDefault();
        const value = String(option.dataset.terminalLedgerOption || "").toUpperCase();
        if (input) input.value = value;
        if (toggle) toggle.textContent = option.textContent || value;
        options.forEach((item) => item.classList.toggle("is-active", item === option));
        if (input?.matches("[data-terminal-ledger-direction]")) {
          window.WS_APP.terminalLedgerDirection = value || "ALL";
        }
        if (input?.matches("[data-terminal-ledger-sort]")) {
          window.WS_APP.terminalLedgerSort = value || "NEWEST";
        }
        closeSelect();
        applyTerminalLedgerControls(root);
      });
    });
  });

  root.querySelector("[data-terminal-ledger-direction]")?.addEventListener("change", (event) => {
    window.WS_APP.terminalLedgerDirection = String(event.target.value || "ALL").toUpperCase();
    applyTerminalLedgerControls(root);
  });

  root.querySelector("[data-terminal-ledger-sort]")?.addEventListener("change", (event) => {
    window.WS_APP.terminalLedgerSort = String(event.target.value || "NEWEST").toUpperCase();
    applyTerminalLedgerControls(root);
  });

  root.querySelector("[data-terminal-ledger-sender-filter]")?.addEventListener("input", (event) => {
    window.WS_APP.terminalLedgerSenderFilter = String(event.target.value || "");
    applyTerminalLedgerControls(root);
  });

  applyTerminalLedgerControls(root);

  root.querySelector("[data-terminal-preview-settlement]")?.addEventListener("click", async () => {
    const forecast = window.WS_APP.previewWeeklySettlement?.(citizen.id);
    await window.WS_APP.confirmAction?.({
      title: "SETTLEMENT PREVIEW",
      message: [
        `Income: ${billingFormatCredits(forecast?.income || 0)}`,
        `Subscriptions due: ${billingFormatCredits(forecast?.subscriptionCharge || 0)}`,
        `Debt increase: ${billingFormatCredits(forecast?.debtIncrease || 0)}`,
        `Debt recovery: ${billingFormatCredits(forecast?.debtRecovery || 0)}`,
        `Final balance: ${billingFormatCredits(forecast?.finalCredits || 0)}`,
        `Final debt: ${billingFormatCredits(forecast?.finalDebt || 0)}`
      ].join("\n"),
      confirmLabel: "OK",
      cancelLabel: null,
      hideCancel: true
    });
  });

  root.querySelector("[data-terminal-force-settlement]")?.addEventListener("click", async () => {
    const confirmed = await window.WS_APP.confirmAction?.({
      title: "FORCE SETTLEMENT",
      message: "Process the next settlement period immediately for all active player citizens?",
      confirmLabel: "Force",
      cancelLabel: "Cancel",
      tone: "danger"
    });
    if (!confirmed) return;
    const result = window.WS_APP.forceNextSettlementPeriod?.({ source: "ADMIN_FORCE_SETTLEMENT" });
    await window.WS_APP.confirmAction?.({
      title: result?.ok ? "SETTLEMENT PROCESSED" : "SETTLEMENT FAILED",
      message: result?.ok
        ? `Income: ${billingFormatCredits(result.income || 0)}\nSubscriptions due: ${billingFormatCredits(result.totalDue || 0)}\nDebt increase: ${billingFormatCredits(result.debtIncrease || 0)}\nDebt recovery: ${billingFormatCredits(result.debtRecovery || 0)}\nNext settlement: ${result.nextSettlementPeriodLabel || "-"}`
        : `Reason: ${String(result?.reason || "UNKNOWN_ERROR").replace(/_/g, " ")}`,
      confirmLabel: "OK",
      cancelLabel: null,
      hideCancel: true,
      tone: result?.ok ? "default" : "danger"
    });
    refreshTerminalBillingPanel(user);
  });

  root.querySelector("[data-terminal-clear-ledger]")?.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const confirmed = await window.WS_APP.confirmAction?.({
      title: "CLEAR TRANSACTION LEDGER",
      message: "Clear local transaction ledger for this citizen? This does not change credits or debt.",
      confirmLabel: "Clear",
      cancelLabel: "Cancel"
    });
    if (!confirmed) return;
    window.WS_APP.clearBillingHistory?.(citizen.id);
    refreshTerminalBillingPanel(user);
  });

  root.querySelector("[data-terminal-transfer-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const amount = parseBillingCreditNumber(form.elements.amount?.value);
    const recipientId = String(form.elements.recipient?.value || "").trim();
    const recipient = window.WS_APP.getCitizenById?.(recipientId);
    const transferTitle = String(form.elements.title?.value || "Credit transfer").trim();
    const transferType = String(form.elements.transferType?.value || "ONE_TIME").trim().toUpperCase();
    const note = [transferTitle, `TYPE: ${transferType.replace(/_/g, " ")}`, form.elements.note?.value || ""].filter(Boolean).join(" / ");
    const confirmed = await window.WS_APP.confirmAction?.({
      title: "TRANSFER CONFIRMATION",
      message: [
        `FROM: ${billingGetCitizenNameLabel(citizen, { legal: true })}`,
        `TO: ${recipient ? billingGetCitizenNameLabel(recipient, { legal: true }) : "UNKNOWN CITIZEN"}`,
        `TITLE: ${transferTitle}`,
        `TYPE: ${transferType.replace(/_/g, " ")}`,
        `AMOUNT: ${billingFormatCredits(amount)}`,
        "This operation will be recorded."
      ].join("\n"),
      confirmLabel: "Confirm",
      cancelLabel: "Cancel"
    });
    if (!confirmed) return;
    const result = window.WS_APP.transferCitizenCredits?.(citizen.id, recipientId, amount, { note });
    await showTerminalOperationResult(result, "TRANSFER COMPLETE", "TRANSFER FAILED");
    refreshTerminalBillingPanel(user);
  });

  root.querySelector("[data-terminal-debt-max]")?.addEventListener("click", () => {
    const input = root.querySelector("[data-terminal-debt-form] input[name='amount']");
    if (input) input.value = input.max || input.placeholder || "0";
  });

  root.querySelector("[data-terminal-debt-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const amount = parseBillingCreditNumber(event.currentTarget.elements.amount?.value);
    const confirmed = await window.WS_APP.confirmAction?.({
      title: "PAY DEBT",
      message: `Pay ${billingFormatCredits(amount)} from current credits toward debt?`,
      confirmLabel: "Pay",
      cancelLabel: "Cancel"
    });
    if (!confirmed) return;
    const result = window.WS_APP.payCitizenDebt?.(citizen.id, amount, { note: "Terminal debt payment." });
    await showTerminalOperationResult(result, "DEBT PAYMENT COMPLETE", "DEBT PAYMENT FAILED");
    refreshTerminalBillingPanel(user);
  });

  root.querySelector("[data-terminal-subscription-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const mode = String(form.elements.subscriptionPaymentMode?.value || "SELECTED").toUpperCase();
    const paymentSource = normalizeBillingPaymentSource(form.elements.subscriptionPaymentSource?.value);
    if (mode === "ALL") {
      await handleTerminalSubscriptionPayment(user, citizen, { paymentSource });
      return;
    }
    const selectedIds = Array.from(form.querySelectorAll("input[name='subscriptionIds']:checked")).map((input) => String(input.value || "").trim()).filter(Boolean);
    await handleTerminalSubscriptionBatchPayment(user, citizen, selectedIds, { paymentSource });
  });

}

window.WS_APP = window.WS_APP || {};
window.WS_APP.renderTerminalBillingPanel = renderTerminalBillingPanel;
window.WS_APP.recordBillingSubscriptionPayment = recordBillingSubscriptionPayment;
window.WS_APP.bindTerminalBillingActions = bindTerminalBillingActions;

async function handleTerminalSubscriptionPayment(user, citizen, options = {}) {
  const ledger = billingGetFinancialLedger(citizen);
  const expectedAmount = options.subscriptionId
    ? ledger.subscriptions.filter((item) => item.id === options.subscriptionId && billingIsSubscriptionPayable(item)).reduce((sum, item) => sum + parseBillingCreditNumber(item.amount), 0)
    : sumPayableSubscriptions(ledger.subscriptions);

  if (expectedAmount <= 0) {
    await window.WS_APP.confirmAction?.({ title: "NO PAYABLE SERVICES", message: "No pending or overdue subscription payment found.", confirmLabel: "OK", cancelLabel: null, hideCancel: true });
    return;
  }

  const paymentSource = normalizeBillingPaymentSource(options.paymentSource);
  const debtStatus = billingGetDebtAccountStatus(citizen);
  const debtChargePreview = Math.min(expectedAmount, debtStatus.capacity);
  const debtCapacityWarning = paymentSource === "DEBT_ACCOUNT" && expectedAmount > debtStatus.capacity
    ? " Only obligations within remaining Debt Account capacity will be charged."
    : "";
  const sourceLine = paymentSource === "DEBT_ACCOUNT"
    ? `Source: Debt Account. Debt after payable charges: ${billingFormatCredits(debtStatus.debt + debtChargePreview)} / ${billingFormatCredits(debtStatus.limit)}.${debtCapacityWarning}`
    : "Source: Credits.";
  const confirmed = await window.WS_APP.confirmAction?.({
    title: "PAY SUBSCRIPTIONS",
    message: `Pay selected subscription obligation for ${billingFormatCredits(expectedAmount)}?\n${sourceLine}`,
    confirmLabel: paymentSource === "DEBT_ACCOUNT" ? "Charge to Debt" : "Pay",
    cancelLabel: "Cancel"
  });
  if (!confirmed) return;

  const result = executeBillingSubscriptionCommand(citizen.id, { ...options, paymentSource });
  if (!result?.ok) {
    await showTerminalOperationResult(result, "SUBSCRIPTION PAYMENT COMPLETE", "SUBSCRIPTION PAYMENT FAILED");
    return;
  }

  window.WS_APP.appendTerminalLogLine?.(`TERMINAL SUBSCRIPTION PAYMENT / ${billingFormatCredits(result.total)} / ${getBillingPaymentSourceLabel(paymentSource).toUpperCase()}`, { typed: true, speed: 8 });
  refreshTerminalBillingPanel(user);
}

async function handleTerminalSubscriptionBatchPayment(user, citizen, subscriptionIds = [], options = {}) {
  const ids = Array.from(new Set((Array.isArray(subscriptionIds) ? subscriptionIds : []).map((id) => String(id || "").trim()).filter(Boolean)));
  if (!ids.length) {
    await window.WS_APP.confirmAction?.({ title: "NO SERVICES SELECTED", message: "Select at least one pending or overdue subscription.", confirmLabel: "OK", cancelLabel: null, hideCancel: true });
    return;
  }

  const ledger = billingGetFinancialLedger(citizen);
  const selected = ledger.subscriptions.filter((item) => ids.includes(item.id) && billingIsSubscriptionPayable(item));
  const expectedAmount = selected.reduce((sum, item) => sum + parseBillingCreditNumber(item.amount), 0);
  if (expectedAmount <= 0) {
    await window.WS_APP.confirmAction?.({ title: "NO PAYABLE SERVICES", message: "No pending or overdue subscription payment found for selected services.", confirmLabel: "OK", cancelLabel: null, hideCancel: true });
    return;
  }

  const paymentSource = normalizeBillingPaymentSource(options.paymentSource);
  const debtStatus = billingGetDebtAccountStatus(citizen);
  const selectedDebtAfter = debtStatus.debt + expectedAmount;
  const selectedDebtWarning = paymentSource === "DEBT_ACCOUNT" && expectedAmount > debtStatus.capacity
    ? " This selected payment exceeds remaining Debt Account capacity and will be denied unless reduced."
    : "";
  const sourceLine = paymentSource === "DEBT_ACCOUNT"
    ? `Source: Debt Account. Debt after selected payment: ${billingFormatCredits(selectedDebtAfter)} / ${billingFormatCredits(debtStatus.limit)}.${selectedDebtWarning}`
    : "Source: Credits.";
  const confirmed = await window.WS_APP.confirmAction?.({
    title: "PAY SELECTED SUBSCRIPTIONS",
    message: `Pay ${selected.length} selected subscription obligation(s) for ${billingFormatCredits(expectedAmount)}?\n${sourceLine}`,
    confirmLabel: paymentSource === "DEBT_ACCOUNT" ? "Charge to Debt" : "Pay",
    cancelLabel: "Cancel"
  });
  if (!confirmed) return;

  const result = executeBillingSubscriptionCommand(citizen.id, { subscriptionIds: ids, paymentSource });
  if (result?.ok) {
    window.WS_APP.appendTerminalLogLine?.(`TERMINAL SUBSCRIPTION PAYMENT / ${billingFormatCredits(result.total)} / ${getBillingPaymentSourceLabel(paymentSource).toUpperCase()}`, { typed: true, speed: 8 });
    await window.WS_APP.confirmAction?.({ title: "SUBSCRIPTION PAYMENT COMPLETE", message: "Operation registered in local terminal ledger.", confirmLabel: "OK", cancelLabel: null, hideCancel: true });
  } else {
    await showTerminalOperationResult(result, "SUBSCRIPTION PAYMENT COMPLETE", "SUBSCRIPTION PAYMENT FAILED");
  }
  refreshTerminalBillingPanel(user);
}

async function showTerminalOperationResult(result, successTitle, failureTitle) {
  if (result?.ok) {
    await window.WS_APP.confirmAction?.({ title: successTitle, message: "Operation registered in local terminal ledger.", confirmLabel: "OK", cancelLabel: null, hideCancel: true });
    return;
  }

  const reason = String(result?.reason || "UNKNOWN_ERROR").replace(/_/g, " ");
  const detail = result?.reason === "INSUFFICIENT_CREDITS"
    ? `Available credits are insufficient. Missing ${billingFormatCredits(result.missing || 0)}.`
    : result?.reason === "DEBT_LIMIT_EXCEEDED"
      ? `Debt Account limit reached. Capacity ${billingFormatCredits(result.debtCapacity || 0)} / ${billingFormatCredits(result.debtLimit || window.WS_APP?.BILLING_DEBT_LIMIT || 20000)}. Missing ${billingFormatCredits(result.missing || 0)}.`
      : `Reason: ${reason}`;
  await window.WS_APP.confirmAction?.({ title: failureTitle, message: detail, confirmLabel: "OK", cancelLabel: null, hideCancel: true, tone: "danger" });
}
