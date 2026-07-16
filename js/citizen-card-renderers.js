// Citizen Card domain and presentation renderers.
// This file is read-only UI composition: it owns no record lifecycle commands,
// module routing, registry filtering or event binding.

function getCitizenCardIdentityView(citizen = {}, user = window.WS_APP.currentUser) {
  const identity = window.WS_APP.getCitizenIdentity?.(citizen) || {};
  const encrypted = Boolean(identity.encryptedName || citizen.encryptedName);
  const canViewLegal = window.WS_APP.canViewCitizenLegalName?.(citizen, user) !== false;
  const masked = encrypted && !canViewLegal;
  const shortId = getCitizenShortId(citizen);
  const idNumber = citizen.idNumber || citizen.id || "";

  return {
    masked,
    name: getCitizenNameLabel(citizen, { user }),
    shortId: masked ? buildMaskedShortId(citizen) : shortId,
    fullId: masked ? buildMaskedFullId(citizen) : idNumber,
    ageLabel: masked ? buildMaskedAge(citizen) : getCitizenAgeLabel(citizen),
    origin: masked ? buildMaskedOrigin(citizen) : (citizen.origin || "UNKNOWN"),
    biologicalProfile: citizen.biologicalProfile || citizen.profile || "UNCLASSIFIED"
  };
}

function buildMaskedShortId(citizen = {}) {
  const seed = simpleCitizenHash(citizen.id || citizen.shortId || citizen.idNumber || "MASKED");
  const date = String(20600101 + (seed % 260000)).slice(0, 8);
  const token = String((seed * 2654435761 >>> 0).toString(36).toUpperCase()).padEnd(6, "X").slice(0, 6);
  return `${date}.${token}`;
}

function buildMaskedFullId(citizen = {}) {
  const seed = simpleCitizenHash(citizen.idNumber || citizen.id || "MASKED");
  const chunk = String((seed % 36).toString(36).toUpperCase()).padStart(2, "0") + String(seed % 100).padStart(2, "0");
  return `03.51N00E.${chunk}.${buildMaskedShortId(citizen)}`;
}

function buildMaskedAge(citizen = {}) {
  const seed = simpleCitizenHash(citizen.id || citizen.shortId || "AGE");
  return String(22 + (seed % 29));
}

function buildMaskedOrigin(citizen = {}) {
  const seed = simpleCitizenHash(citizen.id || citizen.origin || "ORIGIN");
  return `N${(seed % 9) + 1}:${String(40 + (seed % 20)).padStart(2, "0")}.--`;
}

function simpleCitizenHash(value = "") {
  return String(value || "")
    .split("")
    .reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) >>> 0, 2166136261);
}

function getCitizenAgeLabel(citizen = {}) {
  if (typeof window.WS_APP.getCitizenAge === "function") {
    const age = window.WS_APP.getCitizenAge(citizen);
    if (age !== null && age !== undefined && age !== "") return String(age);
  }

  const explicitAge = citizen.age ?? citizen.identity?.age;
  if (explicitAge !== null && explicitAge !== undefined && explicitAge !== "") return String(explicitAge);

  const idSource = String(citizen.idNumber || citizen.shortId || "");
  const match = idSource.match(/(?:^|\.)(20\d{6})(?:\.|$)/);
  if (match) {
    const year = Number(match[1].slice(0, 4));
    if (year > 1900 && year <= 2109) return String(Math.max(0, 2109 - year));
  }

  return "N/A";
}

function renderCitizenPortraitBlock(citizen = {}, identity = {}) {
  return `
    <section class="citizen-portrait-block">
      <div class="citizen-card-portrait${citizen.portrait ? "" : " is-missing"}">
        ${citizen.portrait ? `<img
          src="${escapeHtml(citizen.portrait)}"
          alt="Citizen portrait: ${escapeHtml(identity.name || citizen.legalName || citizen.id)}"
          onerror="this.closest('.citizen-card-portrait').classList.add('is-missing'); this.remove();"
        />` : ""}
      </div>
    </section>
  `;
}

function renderCitizenIdentityBlock(identity = {}) {
  return `
    <section class="citizen-card-identity-block">
      <div class="citizen-card-id-name">
        <span>${escapeHtml(identity.shortId || "NO SHORT ID")}</span>
        <h5>${escapeHtml(identity.name || "ENCRYPTED NAME")}</h5>
      </div>
      <div class="citizen-core-tag-row">
        <span class="citizen-bio-profile-tag">${escapeHtml(identity.biologicalProfile || "UNCLASSIFIED")}</span>
        <span class="citizen-age-tag"><small>AGE</small><b>${escapeHtml(identity.ageLabel)}</b></span>
      </div>
    </section>
  `;
}

function renderCitizenBadgeSlots(citizen = {}) {
  const badges = Array.isArray(citizen.badges) ? citizen.badges.slice(0, 6) : [];
  const slots = Array.from({ length: 6 }, (_, index) => badges[index] || null);

  return `
    <section class="citizen-badge-slots" aria-label="Badge slots">
      <div>
        ${slots.map((badge, index) => `
          <span class="citizen-badge-slot ${badge ? "is-filled" : "is-empty"}" title="${escapeHtml(badge?.title || badge?.label || `Badge slot ${index + 1}`)}">
            ${badge ? escapeHtml(String(badge.shortLabel || badge.label || badge.title || "B").slice(0, 2).toUpperCase()) : ""}
          </span>
        `).join("")}
      </div>
    </section>
  `;
}

function renderCitizenCoreProfile(citizen = {}, identity = {}, options = {}) {
  const full = options.full === true;
  return `
    <section class="citizen-core-profile">
      ${renderCitizenOccupationSection(citizen)}
      <div class="citizen-core-facts">
        ${full ? renderDataRow("ID NUMBER", identity.fullId || "N/A") : ""}
        ${full ? renderDataRow("ORIGIN", identity.origin || "UNKNOWN") : ""}
      </div>
      ${renderCitizenRiskIndexLog(citizen, { compact: !full })}
    </section>
  `;
}

function renderCitizenCompactProfileCard(citizen = {}, identity = {}) {
  const { ledger, activeSubscriptions } = getCitizenCardSummaryStats(citizen);
  return `
    <section class="citizen-card-compact-profile-card">
      ${renderCitizenIdentityBlock(identity)}
      ${renderCitizenOccupationSection(citizen)}
      <div class="citizen-core-facts">
        ${renderDataRow("ID NUMBER", identity.fullId || "N/A")}
        ${renderDataRow("ORIGIN", identity.origin || "UNKNOWN")}
      </div>
      <div class="citizen-card-compact-status-board">
        ${renderDataRow("CREDITS", formatCredits(ledger.credits))}
        ${renderDataRow("NET CYCLE", formatCredits(ledger.netCycle))}
        ${renderDataRow("ACTIVE SUBS", `${activeSubscriptions.length} / ${ledger.subscriptions.length}`)}
        ${renderDataRow("W&S RISK", `${getCitizenRiskValue(citizen)}%`)}
      </div>

      ${renderCitizenRiskIndexLog(citizen, { compact: true })}
    </section>
  `;
}

function renderCitizenRiskIndexLog(citizen = {}, options = {}) {
  const compact = options.compact === true;
  const entries = normalizeCitizenRiskLog(citizen);
  const visible = compact ? entries.slice(0, 1) : entries.slice(0, 5);
  const isAdmin = window.WS_APP.currentUser?.role === "admin";

  return `
    <section class="citizen-risk-log ${compact ? "is-compact" : ""}">
      <header>
        <h6>Risk Index Log</h6>
        ${isAdmin && entries.length ? `<button type="button" data-clear-citizen-risk-log="${escapeHtml(citizen.id)}">Clear</button>` : ""}
      </header>
      <div class="citizen-risk-log-list">
        ${visible.length ? visible.map((entry) => renderCitizenRiskLogEntry(entry)).join("") : '<p class="file-empty">No risk entries registered.</p>'}
      </div>
    </section>
  `;
}

function normalizeCitizenRiskLog(citizen = {}) {
  const source = Array.isArray(citizen.riskLog) ? citizen.riskLog : [];
  return source.slice().reverse().map((entry) => {
    const from = Number(entry.from ?? 0);
    const to = Number(entry.to ?? from);
    const delta = to - from;
    return {
      ...entry,
      delta,
      dateLabel: formatCitizenRiskLogDate(entry.date),
      reason: String(entry.reason || "Manual W&S risk adjustment.").trim()
    };
  });
}

function renderCitizenRiskLogEntry(entry = {}) {
  const delta = Number(entry.delta || 0);
  const sign = delta > 0 ? "+" : "";
  return `
    <article class="citizen-risk-log-entry ${delta < 0 ? "is-negative" : delta > 0 ? "is-positive" : "is-neutral"}">
      <b>${escapeHtml(sign)}${escapeHtml(delta)}%</b>
      <span>${escapeHtml(entry.reason || "Risk adjustment")}</span>
      <time>${escapeHtml(entry.dateLabel || "-")}</time>
    </article>
  `;
}

function formatCitizenRiskLogDate(value = "") {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return text || "-";
  return `${match[3]}.${match[2]}.${match[1]}`;
}


function renderCitizenOccupationSection(citizen = {}) {
  const occupations = getCitizenOccupationEntries(citizen);
  return `
    <section class="citizen-occupation-section">
      <h6>Active Service</h6>
      <ul>
        ${occupations.length ? occupations.map((entry) => `<li><b>${escapeHtml(entry.organization)}</b> - ${escapeHtml(entry.role)}</li>`).join("") : '<li><b>SERVICE REGISTRY</b> - NO ACTIVE SERVICE</li>'}
      </ul>
    </section>
  `;
}

function getCitizenCardServiceLogEntries(citizen = {}) {
  if (typeof window.WS_APP.getCitizenServiceLog === "function") {
    return window.WS_APP.getCitizenServiceLog(citizen);
  }

  return (Array.isArray(citizen?.serviceLog) ? citizen.serviceLog : [])
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .map((entry, index) => ({
      id: String(entry.id || `service-${index + 1}`).trim(),
      title: String(entry.title || entry.name || "Service Record").trim(),
      provider: String(entry.provider || entry.employer || entry.commissioningParty || "LOCAL SERVICE REGISTRY").trim(),
      status: String(entry.status || "ACTIVE").trim().toUpperCase(),
      amount: typeof window.WS_APP.parseCredits === "function" ? window.WS_APP.parseCredits(entry.amount ?? entry.payment) : Number(entry.amount ?? entry.payment) || 0,
      cycle: String(entry.cycle || "WEEKLY").trim().toUpperCase(),
      typeLabel: String(entry.typeLabel || entry.form || entry.serviceForm || entry.type || "SERVICE").trim(),
      details: String(entry.details || entry.description || "").trim(),
      completedAt: String(entry.completedAt || "").trim(),
      acceptedAt: String(entry.acceptedAt || "").trim()
    }));
}

function getCitizenOccupationEntries(citizen = {}) {
  return getCitizenCardServiceLogEntries(citizen)
    .filter((entry) => String(entry.status || "").toUpperCase() === "ACTIVE")
    .map((entry) => ({
      organization: entry.provider || "LOCAL SERVICE REGISTRY",
      role: entry.title || entry.typeLabel || "ACTIVE SERVICE"
    }));
}

function renderCitizenServiceLogSummary(citizen = {}, options = {}) {
  const compact = options.compact === true;
  const entries = getCitizenCardServiceLogEntries(citizen);
  const visible = entries.slice(0, compact ? 2 : 5);
  return `
    <details class="citizen-service-log-summary ${compact ? "is-compact" : ""}" ${compact ? "" : "open"}>
      <summary>
        <h6>Service Log</h6>
        <span>${escapeHtml(entries.length)} RECORD${entries.length === 1 ? "" : "S"}</span>
      </summary>
      <div class="citizen-service-log-list service-cv-list">
        ${visible.length ? visible.map((entry) => renderServiceCvRecord(entry, { compact })).join("") : '<p class="file-empty">No service records registered.</p>'}
      </div>
    </details>
  `;
}

function renderCitizenServiceLogCard(citizen = {}, options = {}) {
  const compact = options.compact === true;
  const entries = getCitizenCardServiceLogEntries(citizen);
  const visible = entries.slice(0, compact ? 3 : 8);
  return `
    <section class="citizen-service-log-card ${compact ? "is-compact" : ""}">
      <header>
        <div>
          <h6>Service Log</h6>
          <small>Official work history. Active contracts and agreements remain routed into weekly income.</small>
        </div>
        <span>${escapeHtml(entries.length)} RECORD${entries.length === 1 ? "" : "S"}</span>
      </header>
      <div class="citizen-service-log-list service-cv-list">
        ${visible.length ? visible.map((entry) => renderServiceCvRecord(entry, { compact })).join("") : '<p class="file-empty">No service records registered.</p>'}
      </div>
    </section>
  `;
}

function getCitizenCardProjectionApi() {
  return window.WS_APP.citizenCardProjection && typeof window.WS_APP.citizenCardProjection === "object"
    ? window.WS_APP.citizenCardProjection
    : {};
}

function getCitizenCyberwareMountedRows(runtime = {}) {
  return [
    ...(Array.isArray(runtime.installed) ? runtime.installed : []),
    ...(Array.isArray(runtime.conflicts) ? runtime.conflicts : []),
    ...(Array.isArray(runtime.unassigned) ? runtime.unassigned : [])
  ]
    .filter(Boolean)
    .filter((item) => !item.isCoreProcessor && !item.isCoreInterface && !item.isServicePort)
    .filter((item) => !["PACKAGED", "OWNED", "PENDING_INSTALL", "PLANNED_INSTALL", "REMOVED", "DESTROYED"].includes(String(item.runtimeStatus || item.status || "").toUpperCase()));
}

function getCitizenCyberwareSummaryWarnings(runtime = {}, mountedRows = [], citizen = {}) {
  const warnings = [];
  const counts = runtime.counts || {};
  if (Number(counts.conflicts || 0) > 0) warnings.push(`${counts.conflicts} SLOT CONFLICT${Number(counts.conflicts || 0) === 1 ? "" : "S"}`);
  if (Number(counts.unassigned || 0) > 0) warnings.push(`${counts.unassigned} UNASSIGNED IMPLANT${Number(counts.unassigned || 0) === 1 ? "" : "S"}`);
  if (Number(counts.offline || 0) > 0) warnings.push(`${counts.offline} OFFLINE IMPLANT${Number(counts.offline || 0) === 1 ? "" : "S"}`);

  mountedRows.forEach((item) => {
    const projection = getCitizenCardProjectionApi();
    const compliance = projection.getCyberwareCompliancePresentation?.(item, citizen)
      || window.WS_APP.getCyberwareCompliancePresentation?.(item, citizen);
    const blocked = compliance?.valid === false;
    const status = String(item.runtimeStatus || item.status || "").toUpperCase();
    if (["SUSPENDED", "DAMAGED", "REJECTED", "OFFLINE"].includes(status)) warnings.push(`${item.name || item.id || "IMPLANT"}: ${status.replace(/_/g, " ")}`);
    if (blocked) warnings.push(`${item.name || item.id || "IMPLANT"}: ${String(compliance.reason || "COMPLIANCE BLOCK").replace(/_/g, " ")}`);
  });

  return Array.from(new Set(warnings)).slice(0, 6);
}

function renderCitizenCyberwareCards(citizen = {}, options = {}) {
  const full = options.full === true;
  const projection = getCitizenCardProjectionApi();
  const runtime = projection.getCyberwareRuntimeState?.(citizen)
    || window.WS_APP.getCyberwareRuntimeState?.(citizen)
    || { slots: [], slotGroups: [], installed: [], conflicts: [], unassigned: [], counts: { total: 0, installed: 0, conflicts: 0, unassigned: 0, offline: 0 } };
  const counts = runtime.counts || {};
  const mountedRows = getCitizenCyberwareMountedRows(runtime);
  const visibleLimit = full ? 8 : 4;
  const visibleRows = mountedRows.slice(0, visibleLimit);
  const hiddenCount = Math.max(0, mountedRows.length - visibleRows.length);
  const warnings = getCitizenCyberwareSummaryWarnings(runtime, mountedRows, citizen);

  return `
    <div class="citizen-cyberware-shell citizen-cyberware-summary-shell">
      <section class="citizen-cyberware-summary-head citizen-cyberware-bodymap">
        <header class="citizen-cyberware-slot-summary">
          <span>CYBERWARE SUMMARY</span>
          <b>${escapeHtml(mountedRows.length)} MOUNTED IMPLANT${mountedRows.length === 1 ? "" : "S"}</b>
          <small>${escapeHtml(`${counts.occupiedSlots || 0} OCCUPIED SLOTS / ${counts.slotCost || 0} SLOT COST / ${counts.conflicts || 0} CONFLICTS`)}</small>
        </header>
        ${renderCitizenCyberwareNeuralCorePanel(runtime.neuralCore || {})}
        <div class="citizen-cyberware-summary-actions">
          <span class="citizen-cyberware-card-action">Cyberware management is paused while the Equipment module is being redesigned.</span>
        </div>
      </section>

      ${warnings.length ? `
        <section class="citizen-cyberware-summary-warning citizen-cyberware-bodymap">
          <header class="citizen-cyberware-slot-summary">
            <span>WARNINGS</span>
            <b>${escapeHtml(warnings.length)} ACTIVE NOTICE${warnings.length === 1 ? "" : "S"}</b>
          </header>
          <ul>
            ${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}
          </ul>
        </section>
      ` : ""}

      <section class="citizen-cyberware-installed-summary">
        <header>
          <span>INSTALLED IMPLANTS</span>
          <b>${escapeHtml(visibleRows.length)} DISPLAYED${hiddenCount ? ` / +${hiddenCount} MORE` : ""}</b>
        </header>
        <div class="citizen-cyberware-grid citizen-cyberware-summary-grid">
          ${visibleRows.length ? visibleRows.map((implant) => renderCitizenCyberwareImplantCard(implant, citizen)).join("") : '<p class="file-empty">No mounted body cyberware.</p>'}
        </div>
      </section>
    </div>
  `;
}

function renderCitizenCyberwareImplantCard(implant = {}, citizen = {}) {
  const status = String(implant.runtimeStatus || implant.status || "INSTALLED").toLowerCase();
  const projection = getCitizenCardProjectionApi();
  const slotLabel = implant.slotDisplayLabel || implant.slotLabel || projection.getCyberwareSlotLabel?.(implant.slot) || window.WS_APP.getCyberwareSlotLabel?.(implant.slot) || "UNASSIGNED";
  const slotsLabel = implant.slotsGroupedLabel || projection.getCyberwareSlotsGroupedLabel?.(implant.slots || implant.slot) || window.WS_APP.getCyberwareSlotsGroupedLabel?.(implant.slots || implant.slot) || implant.slotsLabel || projection.getCyberwareSlotsLabel?.(implant.slots || implant.slot) || window.WS_APP.getCyberwareSlotsLabel?.(implant.slots || implant.slot) || slotLabel;
  const scaleLabel = implant.scaleLabel || projection.getCyberwareScaleLabel?.(implant.scale) || window.WS_APP.getCyberwareScaleLabel?.(implant.scale) || implant.scale || "Small Implant";
  const load = `N${implant.neuroLoad || 0} / I${implant.interfaceLoad || 0}`;
  const sourceLabel = implant.runtimeStatus || implant.status || "INSTALLED";
  const compliancePresentation = projection.getCyberwareCompliancePresentation?.(implant, citizen)
    || window.WS_APP.getCyberwareCompliancePresentation?.(implant, citizen)
    || {};
  const compliance = [
    implant.licenseRequired ? `LIC ${compliancePresentation.licenseLabel || implant.licenseStatus || "UNACTIVATED"}` : "",
    implant.firmwareRequired ? `FW ${compliancePresentation.firmwareLabel || implant.firmwareStatus || "UNKNOWN"}` : "",
    implant.subscriptionRequired ? `SUB ${compliancePresentation.subscriptionLabel || implant.subscriptionCategory || implant.requiresSubscriptionCategory || "CYBERWARE"}` : ""
  ].filter(Boolean).join(" / ");
  const meta = [implant.provider, implant.gradeLabel || implant.grade || implant.tier, implant.runtimeReason].filter(Boolean).join(" / ");
  return `
    <article class="citizen-cyberware-card is-${escapeHtml(status)} citizen-cyberware-summary-card">
      <span>${escapeHtml(slotsLabel)} / ${escapeHtml(sourceLabel)}</span>
      <b>${escapeHtml(implant.name || "Cyberware")}</b>
      <small>${escapeHtml(`${scaleLabel} / ${load}`)}</small>
      <small>${escapeHtml(meta || "LOCAL INSTALLED RECORD")}</small>
      ${compliance ? `<small>${escapeHtml(compliance)}</small>` : ""}
      ${compliancePresentation.valid === false ? `<small class="citizen-cyberware-card-action">${escapeHtml(String(compliancePresentation.reason || "COMPLIANCE BLOCK").replace(/_/g, " "))}</small>` : ""}
      ${implant.lastImplantCheck ? `<small>${escapeHtml(`LAST: ${String(implant.lastImplantCheck.result || "UNKNOWN").replace(/_/g, " ")} / ROLL ${Math.round(Number(implant.lastImplantCheck.roll || 0) * 100)}%`)}</small>` : ""}
    </article>
  `;
}

function renderCitizenCyberwareNeuralCorePanel(core = {}) {
  const serviceStats = [
    core.serviceAccess ? `SVC ${core.serviceAccess}` : "",
    core.diagnosticDepth ? `DIAG ${core.diagnosticDepth}` : "",
    core.firmwareAccess ? `FW ${core.firmwareAccess}` : "",
    core.securityLock ? `SEC ${core.securityLock}` : ""
  ].filter(Boolean).join(" / ") || "NO EXTERNAL ACCESS";
  return `
    <aside class="citizen-cyberware-bodymap citizen-cyberware-neural-core">
      <header class="citizen-cyberware-slot-summary">
        <span>CORE STACK</span>
        <b>${escapeHtml(core.neurochipLabel || "NO NEUROCHIP")}</b>
        <small>${escapeHtml(`LOAD ${core.neuroLoad || 0}/${core.neuroCapacity || 0} / MAX ${core.maxCyberwareGrade || "CIVILIAN"} / ${core.maxScale || "SMALL"} / ${core.latencyClass || "NONE"}`)}</small>
      </header>
      <div class="citizen-cyberware-core-grid">
        <div><span>NEUROCHIP</span><b>${escapeHtml(core.neurochipLabel || "NO NEUROCHIP")}</b><small>${escapeHtml(`${core.controlChannels || 0} CHANNELS / ${core.firmwareSlots || 0} FIRMWARE`)}</small></div>
        <div><span>INTERFACE</span><b>${escapeHtml(core.interfaceLabel || "NO INTERFACE")}</b><small>${escapeHtml(`LOAD ${core.interfaceLoad || 0}/${core.interfaceCapacity || 0}`)}</small></div>
        <div><span>SERVICE PORT</span><b>${escapeHtml(core.servicePortLabel || "NO SERVICE PORT")}</b><small>${escapeHtml(serviceStats)}</small></div>
        <div><span>BUS</span><b>${escapeHtml((core.supportedBuses || []).length ? core.supportedBuses.join(" / ") : "NONE")}</b><small>${escapeHtml(`${core.activeImplantCount || 0} ACTIVE IMPLANTS`)}</small></div>
      </div>
    </aside>
  `;
}

function renderCitizenCardFinancialSummary(citizen = {}, ledger = window.WS_APP.getCitizenFinancialLedger(citizen), activeSubscriptions = [], options = {}) {
  const safeId = slugifyRecordId(citizen.id || citizen.shortId || "citizen-financial");
  const financialId = `citizen-financial-tab-${safeId}`;
  const subscriptionsId = `citizen-financial-subscriptions-tab-${safeId}`;
  const full = options.full === true;
  return `
    <div class="citizen-card-financial-shell citizen-cyberware-tab-shell citizen-financial-tab-shell ${full ? 'is-full-mode' : 'is-compact-mode'}">
      <input class="citizen-cyberware-tab-input" type="radio" name="citizen-financial-view-${escapeHtml(safeId)}" id="${escapeHtml(financialId)}" checked />
      <input class="citizen-cyberware-tab-input" type="radio" name="citizen-financial-view-${escapeHtml(safeId)}" id="${escapeHtml(subscriptionsId)}" />
      <div class="citizen-cyberware-tabs citizen-financial-tabs" role="tablist" aria-label="Financial summary view">
        <label for="${escapeHtml(financialId)}">Financial</label>
        <label for="${escapeHtml(subscriptionsId)}">Subscriptions</label>
      </div>
      <div class="citizen-cyberware-tab-panel citizen-financial-panel citizen-financial-panel-main">
        <div class="citizen-card-financial-summary citizen-card-financial-metrics">
          ${renderDataRow("CREDITS", formatCredits(ledger.credits))}
          ${renderDataRow("WEEKLY INCOME", formatCredits(ledger.incomeTotal))}
          ${renderDataRow("DEBT", ledger.debtLabel || formatCredits(ledger.debt))}
          ${renderDataRow("NET CYCLE", formatCredits(ledger.netCycle))}
        </div>
      </div>
      <div class="citizen-cyberware-tab-panel citizen-financial-panel citizen-financial-panel-subscriptions">
        <div class="citizen-card-subscription-summary-header">
          ${renderDataRow("SUBSCRIPTION COST", formatCredits(ledger.subscriptionTotal))}
          ${renderDataRow("ACTIVE SUBSCRIPTIONS", `${activeSubscriptions.length} / ${ledger.subscriptions.length}`)}
        </div>
        <div class="citizen-card-subscription-summary-list">
          ${getCitizenCardProjectionApi().renderSubscriptionSummaryTiles?.(activeSubscriptions, { context: "citizen-card" }) || window.WS_APP.renderCitizenSubscriptionSummaryTiles?.(activeSubscriptions, { context: "citizen-card" }) || '<p class="file-empty">No active subscriptions</p>'}
        </div>
      </div>
    </div>
  `;
}


function getCitizenShortId(citizen) {
  if (window.WS_APP.getCitizenShortId) {
    return window.WS_APP.getCitizenShortId(citizen);
  }

  const shortId = String(citizen.shortId || "").trim();
  if (shortId) return shortId;

  const legacyDisplayName = String(citizen.displayName || "").trim();
  if (/^\d{8}\.[A-Z0-9]+$/i.test(legacyDisplayName)) return legacyDisplayName;

  const idNumber = String(citizen.idNumber || "").trim();
  const match = idNumber.match(/(\d{8}\.[A-Z0-9]+)$/i) || idNumber.match(/(\d{8}\.[A-Z0-9]+)/i);

  return match ? match[1] : legacyDisplayName;
}

function renderRecordFields(fields = {}) {
  return Object.entries(fields)
    .map(([label, value]) => renderDataRow(label.toUpperCase(), value))
    .join("");
}

function renderAdminRecordFields(fields = {}, options = {}) {
  const compact = options.compact === true;
  return `
    <details class="admin-record-fields ${compact ? "is-compact-admin-details" : ""}">
      <summary>
        <span>GM Details</span>
        <b>ADMIN</b>
      </summary>
      <div class="profile-data">
        ${renderRecordFields(fields)}
      </div>
    </details>
  `;
}

function renderStaticCitizenSection(title, content, extraClass = "") {
  return `
    <section class="citizen-card-static-section ${escapeHtml(extraClass)}">
      <header>${escapeHtml(title)}</header>
      <div class="citizen-card-section-body">${content}</div>
    </section>
  `;
}

function renderSkillsAbilitiesBlock(citizen = {}, options = {}) {
  const open = options.open === true;
  return `
    <div class="skills-abilities-block">
      <details class="citizen-card-inner-section" ${open ? "open" : ""}>
        <summary>Abilities</summary>
        <div class="citizen-card-section-body">${renderAbilities(citizen.abilities)}</div>
      </details>

      <details class="citizen-card-inner-section" ${open ? "open" : ""}>
        <summary>Skills</summary>
        <div class="citizen-card-section-body">${renderSkills(citizen.skills)}</div>
      </details>
    </div>
  `;
}

function getCitizenCardSectionOpenState(citizenId = "") {
  const card = Array.from(document.querySelectorAll(".citizen-card-view"))
    .find((node) => String(node.dataset.citizenId || "") === String(citizenId || ""));
  if (!card) return {};

  return Array.from(card.querySelectorAll(".citizen-card-section[data-citizen-card-section-key]"))
    .reduce((state, section) => {
      const key = String(section.dataset.citizenCardSectionKey || "").trim();
      if (key) state[key] = section.open === true;
      return state;
    }, {});
}

function renderDetailSection(title, content, open = false, extraClass = "", sectionKey = "", openState = null) {
  const key = sectionKey || slugifyRecordId(title);
  const hasStoredState = openState && Object.prototype.hasOwnProperty.call(openState, key);
  const isOpen = hasStoredState ? openState[key] === true : open;
  return `
    <details class="citizen-card-section ${escapeHtml(extraClass)}" data-citizen-card-section-key="${escapeHtml(key)}" ${isOpen ? "open" : ""}>
      <summary>${escapeHtml(title)}</summary>
      <div class="citizen-card-section-body">${content}</div>
    </details>
  `;
}

function renderCitizenEquipmentSummaryBlock(citizen = {}, options = {}) {
  const projection = getCitizenCardProjectionApi();
  if (typeof projection.renderEquipmentSummary === "function") {
    return projection.renderEquipmentSummary(citizen, options);
  }
  if (typeof window.WS_APP.renderCitizenEquipmentSummary === "function") {
    return window.WS_APP.renderCitizenEquipmentSummary(citizen, options);
  }

  return '<p class="file-empty">Equipment summary unavailable.</p>';
}


function renderList(value) {
  const items = Array.isArray(value)
    ? value
    : String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  if (!items.length) {
    return `<p>${escapeHtml(value || "No data")}</p>`;
  }

  return `
    <ul>
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}


function renderSkills(skills) {
  const definitions = window.WS_APP.getSkillDefinitions?.({ includeArchived: true }) || [];
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const items = Array.isArray(skills) ? skills : [];

  if (!items.length) {
    return "<p>No data</p>";
  }

  return `
    <div class="rating-list skill-rating-list">
      <div class="skill-rating-head">
        <span>Skill</span>
        <b>Total</b>
        <b>Level</b>
      </div>
      ${items.map((skill) => {
        const normalized = normalizeCitizenSkillForView(skill, definitionById);
        const rating = clampNumber(normalized.value, 1, normalized.maxValue || 10);

        return `
          <button type="button" class="rating-row skill-row is-clickable" data-skill-id="${escapeHtml(normalized.id)}" data-skill-label="${escapeHtml(normalized.label)}" title="Open skill reference">
            <span class="rating-label">${escapeHtml(normalized.label)}</span>
            <b class="rating-value">${escapeHtml(rating)}</b>
            <strong class="rating-blocks ${escapeHtml(getRatingTone(rating))}" aria-label="${escapeHtml(rating)} of ${escapeHtml(normalized.maxValue || 10)}">
              ${renderSkillBlocks(rating, normalized.maxValue || 10)}
            </strong>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderAbilities(abilities) {
  const definitions = window.WS_APP.getAbilityDefinitions?.({ includeArchived: true }) || [];
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const items = Array.isArray(abilities) ? abilities : [];

  if (!items.length) {
    return "<p>No data</p>";
  }

  return `
    <div class="rating-list ability-rating-list">
      <div class="ability-rating-head">
        <span>Ability</span>
        <b>Total</b>
        <b>Natural</b>
        <b>Cyberware</b>
      </div>
      ${items.map((ability) => {
        const normalized = normalizeCitizenAbilityForView(ability, definitionById);
        const natural = clampNumber(normalized.natural, 0, normalized.maxNatural || 7);
        const cyberware = clampNumber(normalized.cyberware, 0, normalized.maxCyberware || 8);
        const activeCyberware = normalized.cyberwareActive === false ? 0 : cyberware;
        const total = natural + activeCyberware;
        const offline = normalized.cyberwareActive === false && cyberware > 0;

        return `
          <button type="button" class="rating-row ability-row is-clickable ${offline ? "is-cyberware-offline" : ""}" data-ability-id="${escapeHtml(normalized.id)}" data-ability-label="${escapeHtml(normalized.label)}" title="Open ability reference">
            <span class="rating-label">${escapeHtml(normalized.label)}</span>
            <b class="rating-value">${escapeHtml(total)}</b>
            <strong class="rating-blocks ${escapeHtml(getRatingTone(total))}" aria-label="${escapeHtml(natural)} natural of ${escapeHtml(normalized.maxNatural || 7)}">
              ${renderAbilityBaseBlocks(natural, normalized.maxNatural || 7)}
            </strong>
            <strong class="cyberware-blocks" aria-label="${escapeHtml(cyberware)} cyberware of ${escapeHtml(normalized.maxCyberware || 8)}">
              ${renderCyberwareBlocks(cyberware, normalized.maxCyberware || 8)}
              ${offline ? `<em>OFF</em>` : ""}
            </strong>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function slugifyRecordId(value = "record") {
  return String(value || "record")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "record";
}

function normalizeCitizenSkillForView(skill, definitionById) {
  if (typeof skill === "string") {
    return { id: slugifyRecordId(skill), label: skill, value: 5, maxValue: 10 };
  }

  const definition = definitionById.get(skill?.skillId);
  return {
    id: skill?.skillId || definition?.id || slugifyRecordId(skill?.label || "skill"),
    label: definition?.label || skill?.label || "Skill",
    value: skill?.value ?? 1,
    maxValue: definition?.maxValue || 10
  };
}

function normalizeCitizenAbilityForView(ability, definitionById) {
  if (typeof ability === "string") {
    return { id: slugifyRecordId(ability), label: ability, natural: 1, cyberware: 0, cyberwareActive: true, maxNatural: 7, maxCyberware: 8 };
  }

  const definition = definitionById.get(ability?.abilityId);
  return {
    id: ability?.abilityId || definition?.id || slugifyRecordId(ability?.label || "ability"),
    label: definition?.label || ability?.label || "Ability",
    natural: ability?.natural ?? ability?.base ?? 1,
    cyberware: ability?.cyberware ?? 0,
    cyberwareActive: ability?.cyberwareActive !== false,
    maxNatural: definition?.maxNatural || 7,
    maxCyberware: definition?.maxCyberware || 8
  };
}

function renderSkillBlocks(value, max = 10) {
  const rating = clampNumber(value, 0, max);
  return renderRatingBlocks(rating, max, "rating-block");
}

function renderAbilityBaseBlocks(value, max = 7) {
  const rating = clampNumber(value, 0, max);
  return renderRatingBlocks(rating, max, "rating-block");
}

function renderCyberwareBlocks(value, max = 8) {
  const rating = clampNumber(value, 0, max);
  return renderRatingBlocks(rating, max, "rating-block cyberware-rating-block");
}

function renderRatingBlocks(value, max, className) {
  return Array.from({ length: max }, (_, index) => {
    const isFilled = index < value;
    return `<i class="${escapeHtml(className)} ${isFilled ? "is-filled" : "is-empty"}" aria-hidden="true"></i>`;
  }).join("");
}

function getRatingTone(value) {
  const rating = Number(value) || 0;

  if (rating >= 9) return "level-4";
  if (rating >= 8) return "level-3";
  if (rating >= 5) return "level-2";
  if (rating >= 2) return "level-1";
  return "level-0";
}

function clampNumber(value, min, max) {
  const number = Number(value) || 0;
  return Math.max(min, Math.min(max, number));
}

function getCitizenRiskValue(citizen = {}) {
  const raw = String(citizen.risk ?? citizen.riskIndex ?? 0).replace("%", "").trim();
  const parsed = Number(raw.replace(",", "."));
  return clampNumber(Number.isFinite(parsed) ? parsed : 0, 0, 100);
}

function renderRiskFooter(citizen, extraClass = "") {
  const riskValue = getCitizenRiskValue(citizen);
  return `
    <footer class="citizen-card-risk ${escapeHtml(extraClass)}">
      <div class="risk-label">
        <span>W&S RISK INDEX</span>
        <strong>${escapeHtml(riskValue)}%</strong>
      </div>

      <div class="risk-meter">
        <span style="width: ${riskValue}%;"></span>
      </div>
    </footer>
  `;
}

function getCitizenCardViewMode() {
  const mode = String(window.WS_APP.citizenCardViewMode || "full").toLowerCase();
  return mode === "compact" ? "compact" : "full";
}

function renderCitizenCardModeButton(mode, label, activeMode) {
  return `<button type="button" class="citizen-card-mode-button ${activeMode === mode ? "is-active" : ""}" data-citizen-card-mode="${escapeHtml(mode)}">${escapeHtml(label)}</button>`;
}

function getCitizenCardSummaryStats(citizen = {}) {
  const summary = window.WS_APP.getCitizenSubscriptionSummary?.(citizen);
  if (summary) {
    return {
      ledger: summary.ledger,
      activeSubscriptions: summary.activeSubscriptions
    };
  }

  const ledger = window.WS_APP.getCitizenFinancialLedger(citizen);
  const activeSubscriptions = ledger.subscriptions.filter((subscription) => subscription.active && String(subscription.status || "").toUpperCase() !== "CANCELLED");
  return { ledger, activeSubscriptions };
}

function renderCitizenQuickLinks(user, citizen, context = "card") {
  const isOwnCitizen = user?.role === "admin" || citizen?.id === user?.citizenId;
  if (!isOwnCitizen) return "";

  return `
    <section class="citizen-quick-links" aria-label="Citizen quick links">
      <button type="button" data-citizen-editor-open="${escapeHtml(citizen.id)}">${user?.role === "admin" ? "Manage Record" : (window.WS_APP.hasOwnerFullCardEditGrant?.(citizen, user) ? "Edit Full Card" : "Edit Profile")}</button>
      <button type="button" data-citizen-card-action="terminal" data-citizen-card-target-id="${escapeHtml(citizen.id)}">Open Terminal</button>
      <button type="button" data-citizen-card-action="billing" data-citizen-card-target-id="${escapeHtml(citizen.id)}">Open Billing</button>
      <button type="button" data-citizen-card-action="subscriptions" data-citizen-card-target-id="${escapeHtml(citizen.id)}">Open Subscriptions</button>
      <button type="button" data-citizen-card-action="service" data-citizen-card-target-id="${escapeHtml(citizen.id)}">Open Service</button>
      <button type="button" data-citizen-card-action="citizen-files" data-citizen-card-target-id="${escapeHtml(citizen.id)}">Open Citizen Files</button>
    </section>
  `;
}

function renderCitizenStatusSummary(citizen = {}, ledger = window.WS_APP.getCitizenFinancialLedger(citizen), activeSubscriptions = []) {
  return `
    <section class="citizen-status-summary">
      ${renderDataRow("PROFILE", citizen.biologicalProfile || citizen.profile || "UNCLASSIFIED")}
      ${renderDataRow("CREDITS", formatCredits(ledger.credits))}
      ${renderDataRow("DEBT", ledger.debtLabel || formatCredits(ledger.debt))}
      ${renderDataRow("ACTIVE SUBS", `${activeSubscriptions.length} / ${ledger.subscriptions.length}`)}
      ${renderDataRow("W&S RISK", `${getCitizenRiskValue(citizen)}%`)}
    </section>
  `;
}
