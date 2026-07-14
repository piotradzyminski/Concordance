function renderCitizenCardModule(user, moduleLabel = "CITIZEN CARD", citizenId = user?.citizenId, options = {}) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");
  const citizen = window.WS_APP.getCitizenById(citizenId);
  const returnTarget = options.returnTarget || "access-panel";

  if (!container) return;

  terminalGrid?.classList.add("is-card-open");
  window.WS_APP.currentCitizenCardsSelectedId = returnTarget === "citizen-cards" ? citizenId : null;

  if (!citizen) {
    container.innerHTML = `
      <article class="module-detail">
        <button class="module-back-button" type="button">Back</button>
        <p class="profile-note">Brak karty postaci dla aktywnej sesji.</p>
      </article>
    `;
    bindBackButton(user);
    return;
  }

  const identity = getCitizenCardIdentityView(citizen, user);
  const cardMode = getCitizenCardViewMode();
  const { ledger, activeSubscriptions } = getCitizenCardSummaryStats(citizen);

  if (status) {
    status.textContent = `${moduleLabel} / ${String(identity.shortId || identity.name || citizen.id).toUpperCase()}`;
  }

  const fullMode = cardMode === "full";
  const detailOpenState = options.detailOpenState || getCitizenCardSectionOpenState(citizen.id);
  const modeRibbon = `
    <aside class="citizen-card-mode-ribbon" aria-label="Citizen card view mode">
      ${renderCitizenCardModeButton("full", "Full", cardMode)}
      ${renderCitizenCardModeButton("compact", "Compact", cardMode)}
    </aside>
  `;

  container.innerHTML = `
    <article class="module-detail citizen-card-view citizen-card-mode-${escapeHtml(cardMode)}${window.WS_APP.citizenCardModeEntering ? " is-card-mode-entering" : ""}" data-citizen-id="${escapeHtml(citizen.id)}">
      <div class="module-detail-head">
        <div>
          <p class="kicker">${escapeHtml(moduleLabel)} / LOCAL PROFILE</p>
          <h4>${escapeHtml(identity.shortId || identity.name || citizen.id)}</h4>
        </div>
        <button class="module-back-button" type="button">Back</button>
      </div>

      <div class="citizen-card-shell">
        ${modeRibbon}

        <section class="citizen-card-main-panel">
          <div class="citizen-card-top-strip">
            ${renderCitizenQuickLinks(user, citizen)}
            ${renderRiskFooter(citizen, "is-priority-risk")}
          </div>

          ${user.role === "admin" && returnTarget === "citizen-cards" ? `
            <section class="entry-record-actions citizen-card-record-actions">
              <span class="entry-record-state">${escapeHtml(citizen.recordState || "ACTIVE")}</span>
              ${String(citizen.recordState || "ACTIVE").toUpperCase() === "ACTIVE" ? `<button class="entry-record-action" type="button" data-citizen-editor-open="${escapeHtml(citizen.id)}">Manage Record</button>` : ""}
              ${["DRAFT", "CHANGES_REQUESTED", "READY_FOR_REVIEW", "REJECTED"].includes(String(citizen.recordState || "").toUpperCase()) ? `
                <button class="entry-record-action" type="button" id="citizen-open-creator-button">Open Creator</button>
              ` : ""}
              <button class="entry-record-action ${citizen.recordState === "ARCHIVED" ? "" : "danger"}" type="button" id="citizen-archive-button">
                ${citizen.recordState === "ARCHIVED" ? "Restore Record" : "Archive Record"}
              </button>
              <div class="citizen-full-edit-control">
                <label>
                  <input type="checkbox" id="citizen-owner-full-edit-switch" ${citizen.ownerFullCardEdit === true ? "checked" : ""} ${citizen.ownerUserId ? "" : "disabled"}>
                  <span>ALLOW PLAYER FULL CARD EDIT</span>
                </label>
                <small>${citizen.ownerUserId ? `Owner: ${escapeHtml(citizen.ownerUserId)}` : "Assign an owner account first."}</small>
              </div>
            </section>
          ` : ""}

          <div class="citizen-card-layout">
            ${fullMode ? `
              <section class="citizen-card-left citizen-card-visual-column">
                ${renderCitizenPortraitBlock(citizen, identity)}
                ${renderCitizenBadgeSlots(citizen)}
                ${renderCitizenIdentityBlock(identity)}
                ${renderCitizenCoreProfile(citizen, identity, { full: true })}
              </section>
            ` : `
              <section class="citizen-card-left citizen-card-compact-column">
                <div class="citizen-card-compact-profile-wrap">
                  ${renderCitizenCompactProfileCard(citizen, identity)}
                </div>
              </section>
            `}

            <section class="citizen-card-right citizen-card-record-column">
              ${fullMode ? renderDetailSection("Appearance Description", `<p>${escapeHtml(citizen.appearance || "No description recorded.")}</p>`, true, "appearance-text-block", "appearance", detailOpenState) : ""}
              ${renderDetailSection("Skills / Abilities", renderSkillsAbilitiesBlock(citizen, { open: fullMode }), fullMode, "competence-card-block", "skills-abilities", detailOpenState)}
              ${renderDetailSection("Cyberware", renderCitizenCyberwareCards(citizen, { full: fullMode }), fullMode, "", "cyberware", detailOpenState)}
              ${renderDetailSection("Financial / Subscription Summary", renderCitizenCardFinancialSummary(citizen, ledger, activeSubscriptions, { full: fullMode }), true, "financial-card-block citizen-card-summary-block", "financial-subscription-summary", detailOpenState)}
              ${fullMode ? renderDetailSection("Equipment", renderCitizenEquipmentSummaryBlock(citizen, { compact: false, inspectable: true }), false, "equipment-card-block citizen-card-summary-block equipment-summary", detailOpenState) : ""}
              ${renderDetailSection("Service Log", renderCitizenServiceLogCard(citizen, { compact: !fullMode }), true, "service-log-card-block citizen-card-summary-block", "service-log", detailOpenState)}
              ${!fullMode ? renderDetailSection("Equipment", renderCitizenEquipmentSummaryBlock(citizen, { compact: true, inspectable: true }), true, "equipment-card-block citizen-card-summary-block equipment-summary", detailOpenState) : ""}
            </section>
          </div>
        </section>
      </div>
    </article>
  `;

  document.querySelector("#citizen-open-creator-button")?.addEventListener("click", () => {
    window.WS_APP.pushModuleView?.(() => renderCitizenCardModule(user, moduleLabel, citizen.id, options));
    window.WS_APP.openCitizenCreator?.(citizen.id);
  });

  document.querySelector("#citizen-owner-full-edit-switch")?.addEventListener("change", (event) => {
    const enabled = event.target.checked === true;
    const result = window.WS_APP.CitizenCommandAPI?.adminSetOwnerFullCardEdit?.(citizen.id, {
      enabled,
      reason: enabled
        ? "Admin allowed the assigned player to edit the full Citizen-owned card record."
        : "Admin revoked player full card editing for this Citizen record.",
      source: "CITIZEN_CARDS",
      idempotencyKey: `citizen-owner-full-edit:${citizen.id}:${enabled ? "enable" : "disable"}:${Date.now()}`
    }, user);
    if (!result?.ok) {
      event.target.checked = !enabled;
      window.WS_APP.appendAdminAuditEvent?.({
        category: "ACCESS",
        action: "CITIZEN_OWNER_FULL_EDIT_FAILED",
        citizenId: citizen.id,
        target: citizen.id,
        summary: `Owner full-card edit update failed for ${citizen.id}.`,
        resultCode: result?.error?.code || "CITIZEN_OWNER_FULL_EDIT_FAILED",
        status: "FAILED",
        meta: { enabled, source: "CITIZEN_CARDS" }
      }, { user });
      window.WS_APP.appendTerminalLogLine?.(`FULL CARD EDIT UPDATE FAILED / ${result?.error?.code || "UNKNOWN"}`, { typed: true, speed: 8 });
      return;
    }
    window.WS_APP.appendAdminAuditEvent?.({
      category: "ACCESS",
      action: enabled ? "CITIZEN_OWNER_FULL_EDIT_ENABLED" : "CITIZEN_OWNER_FULL_EDIT_DISABLED",
      citizenId: citizen.id,
      target: citizen.id,
      summary: `Owner full-card edit ${enabled ? "enabled" : "disabled"} for ${citizen.id}.`,
      resultCode: result?.operation || "CITIZEN_OWNER_FULL_EDIT_UPDATED",
      status: "SUCCEEDED",
      previousRevision: citizen?.revision ?? citizen?.recordRevision ?? null,
      nextRevision: result?.citizen?.revision ?? result?.citizen?.recordRevision ?? null,
      meta: { enabled, source: "CITIZEN_CARDS" }
    }, { user });
    window.WS_APP.appendTerminalLogLine?.(`FULL CARD EDIT ${enabled ? "ENABLED" : "DISABLED"} / ${citizen.shortId || citizen.id}`, { typed: true, speed: 8 });
    renderCitizenCardModule(user, moduleLabel, result.citizen.id, options);
  });

  document.querySelector("#citizen-archive-button")?.addEventListener("click", async () => {
    const archived = citizen.recordState === "ARCHIVED";
    const confirmed = await confirmRegistryAction(
      archived ? "RESTORE CITIZEN RECORD" : "ARCHIVE CITIZEN RECORD",
      archived
        ? "Restore this citizen record to the active registry?"
        : "Archive this citizen record? Linked domain history will be preserved.",
      archived ? "Restore" : "Archive"
    );
    if (!confirmed) return;

    const input = {
      reason: archived ? "Restored from Citizen Cards registry." : "Archived from Citizen Cards registry.",
      source: "CITIZEN_CARDS",
      idempotencyKey: `citizen-${archived ? "restore" : "archive"}:${citizen.id}:${Date.now()}`
    };
    const result = archived
      ? window.WS_APP.CitizenCommandAPI?.restoreCitizen?.(citizen.id, input, user)
      : window.WS_APP.CitizenCommandAPI?.archiveCitizen?.(citizen.id, input, user);
    if (!result?.ok) {
      window.WS_APP.appendAdminAuditEvent?.({
        category: "CITIZEN",
        action: archived ? "CITIZEN_RESTORE_FAILED" : "CITIZEN_ARCHIVE_FAILED",
        citizenId: citizen.id,
        target: citizen.id,
        summary: `${archived ? "Restore" : "Archive"} failed for Citizen ${citizen.id}.`,
        resultCode: result?.error?.code || "CITIZEN_RECORD_ACTION_FAILED",
        status: "FAILED",
        idempotencyKey: input.idempotencyKey,
        meta: { source: "CITIZEN_CARDS" }
      }, { user });
      window.WS_APP.appendTerminalLogLine?.(`CITIZEN RECORD ACTION FAILED / ${result?.error?.code || "UNKNOWN"}`, { typed: true, speed: 8 });
      return;
    }
    window.WS_APP.appendAdminAuditEvent?.({
      category: "CITIZEN",
      action: archived ? "CITIZEN_RESTORED" : "CITIZEN_ARCHIVED",
      citizenId: citizen.id,
      target: citizen.id,
      summary: `Citizen ${citizen.id} ${archived ? "restored" : "archived"}.`,
      resultCode: result?.operation || (archived ? "RESTORE_CITIZEN" : "ARCHIVE_CITIZEN"),
      status: "SUCCEEDED",
      idempotencyKey: input.idempotencyKey,
      previousRevision: citizen?.revision ?? citizen?.recordRevision ?? null,
      nextRevision: result?.citizen?.revision ?? result?.citizen?.recordRevision ?? null,
      meta: { source: "CITIZEN_CARDS" }
    }, { user });
    window.WS_APP.appendTerminalLogLine?.(`CITIZEN RECORD ${archived ? "RESTORED" : "ARCHIVED"} / ${citizen.shortId || citizen.id}`, { typed: true, speed: 8 });
    renderCitizenCardsModule(user);
  });

  document.querySelector("[data-open-citizen-subscriptions]")?.addEventListener("click", () => {
    window.WS_APP.pushModuleView?.(() => renderCitizenCardModule(user, moduleLabel, citizen.id, options));
    if (user.role === "admin") {
      renderAdminCitizenSubscriptionControl(user, citizen.id);
      return;
    }

    renderSubscriptionsModule(user);
  });

  bindCitizenCardPolishActions(user, citizen, moduleLabel, options);

  if (window.WS_APP.citizenCardModeEntering) {
    const renderedCard = container.querySelector(".citizen-card-view.is-card-mode-entering");
    window.requestAnimationFrame?.(() => renderedCard?.classList.add("is-card-mode-entered"));
    window.setTimeout(() => {
      renderedCard?.classList.remove("is-card-mode-entering", "is-card-mode-entered");
      window.WS_APP.citizenCardModeEntering = false;
    }, 260);
  }

  if (returnTarget === "citizen-cards") {
    window.WS_APP.bindModuleBackButton(user, () => renderCitizenCardsModule(user));
    return;
  }

  bindBackButton(user);
}

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
    const compliance = window.WS_APP.getCyberwareCompliancePresentation?.(item, citizen);
    const blocked = compliance?.valid === false;
    const status = String(item.runtimeStatus || item.status || "").toUpperCase();
    if (["SUSPENDED", "DAMAGED", "REJECTED", "OFFLINE"].includes(status)) warnings.push(`${item.name || item.id || "IMPLANT"}: ${status.replace(/_/g, " ")}`);
    if (blocked) warnings.push(`${item.name || item.id || "IMPLANT"}: ${String(compliance.reason || "COMPLIANCE BLOCK").replace(/_/g, " ")}`);
  });

  return Array.from(new Set(warnings)).slice(0, 6);
}

function renderCitizenCyberwareCards(citizen = {}, options = {}) {
  const full = options.full === true;
  const runtime = window.WS_APP.getCyberwareRuntimeState
    ? window.WS_APP.getCyberwareRuntimeState(citizen)
    : { slots: [], slotGroups: [], installed: [], conflicts: [], unassigned: [], counts: { total: 0, installed: 0, conflicts: 0, unassigned: 0, offline: 0 } };
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
  const slotLabel = implant.slotDisplayLabel || implant.slotLabel || window.WS_APP.getCyberwareSlotLabel?.(implant.slot) || "UNASSIGNED";
  const slotsLabel = implant.slotsGroupedLabel || window.WS_APP.getCyberwareSlotsGroupedLabel?.(implant.slots || implant.slot) || implant.slotsLabel || window.WS_APP.getCyberwareSlotsLabel?.(implant.slots || implant.slot) || slotLabel;
  const scaleLabel = implant.scaleLabel || window.WS_APP.getCyberwareScaleLabel?.(implant.scale) || implant.scale || "Small Implant";
  const load = `N${implant.neuroLoad || 0} / I${implant.interfaceLoad || 0}`;
  const sourceLabel = implant.runtimeStatus || implant.status || "INSTALLED";
  const compliancePresentation = window.WS_APP.getCyberwareCompliancePresentation?.(implant, citizen) || {};
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
          ${window.WS_APP.renderCitizenSubscriptionSummaryTiles?.(activeSubscriptions, { context: "citizen-card" }) || '<p class="file-empty">No active subscriptions</p>'}
        </div>
      </div>
    </div>
  `;
}

function renderCitizenCardsModule(user) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");
  const citizens = window.WS_APP.getCitizens({ includeArchived: true })
    .filter((citizen) => citizen.recordType !== "admin" && citizen.id !== "admin")
    .sort((a, b) => String(a.legalName || getCitizenShortId(a) || "").localeCompare(String(b.legalName || getCitizenShortId(b) || ""), "pl"));
  const profileCounts = getCitizenCardsProfileCounts(citizens);

  if (!container) return;

  terminalGrid?.classList.add("is-card-open");
  window.WS_APP.currentModuleId = "citizen-cards";
  window.WS_APP.currentCitizenCardsSelectedId = null;

  if (status) {
    status.textContent = `CITIZEN CARDS / ${citizens.length} PROFILES`;
  }

  container.innerHTML = `
    <article class="module-detail citizen-cards-view">
      <div class="module-detail-head">
        <div>
          <p class="kicker">CITIZEN CARDS / GM REGISTRY</p>
          <h4>Citizen Cards</h4>
        </div>

        <button class="module-back-button" type="button">Back</button>
      </div>

      <section class="citizen-cards-summary citizen-cards-summary-polish">
        ${renderDataRow("TOTAL CARDS", citizens.length)}
        ${renderDataRow("ALPHA", profileCounts.ALPHA || 0)}
        ${renderDataRow("BETA", profileCounts.BETA || 0)}
        ${renderDataRow("GAMMA", profileCounts.GAMMA || 0)}
        ${renderDataRow("UNCLASSIFIED", profileCounts.UNCLASSIFIED || 0)}
      </section>

      <section class="registry-toolbar citizen-cards-toolbar citizen-card-filter-toolbar" data-citizen-card-filters>
        <label>Search<input type="search" data-citizen-card-search placeholder="Name / ID / short ID" /></label>
        <label>Profile<select data-citizen-card-profile>
          <option value="ALL">ALL</option>
          <option value="ALPHA">ALPHA</option>
          <option value="BETA">BETA</option>
          <option value="GAMMA">GAMMA</option>
          <option value="UNCLASSIFIED">UNCLASSIFIED</option>
        </select></label>
        <label>Risk<select data-citizen-card-risk-filter>
          <option value="ALL">ALL</option>
          <option value="25">RISK ≥ 25</option>
          <option value="50">RISK ≥ 50</option>
          <option value="75">RISK ≥ 75</option>
        </select></label>
            <label class="toggle-field"><input class="ui-select-control" type="checkbox" data-citizen-card-debt-filter /> DEBT &gt; 0</label>
            <label class="toggle-field"><input class="ui-select-control" type="checkbox" data-citizen-card-active-sub-filter /> ACTIVE SUBS</label>
        <div class="citizen-cards-create-actions">
          <button class="registry-action" type="button" id="citizen-default-button">Create Citizen Draft</button>
          <button class="registry-action" type="button" id="citizen-quick-npc-button">Quick NPC</button>
        </div>
      </section>

      <section class="citizen-cards-grid" data-citizen-cards-grid>
        ${citizens.length
          ? citizens.map((citizen) => renderCitizenCardsListCard(citizen)).join("")
          : '<p class="file-empty">No citizen cards available</p>'}
      </section>
    </article>
  `;

  bindBackButton(user);
  document.querySelector("#citizen-default-button")?.addEventListener("click", () => {
    const result = window.WS_APP.CitizenCommandAPI?.createCitizenDraft?.({
      characterType: "PLAYER",
      reason: "Admin created Citizen draft from Citizen Cards registry.",
      source: "CITIZEN_CARDS",
      idempotencyKey: `citizen-draft:create:${Date.now()}`
    }, user);
    const saved = result?.citizen || null;
    if (result?.ok && saved) {
      window.WS_APP.appendAdminAuditEvent?.({
        category: "CITIZEN",
        action: "CITIZEN_DRAFT_CREATED",
        citizenId: saved.id,
        target: saved.id,
        summary: `Citizen draft ${saved.id} created from Citizen Cards registry.`,
        resultCode: result?.operation || "CREATE_DRAFT",
        status: "SUCCEEDED",
        nextRevision: saved?.revision ?? saved?.recordRevision ?? null,
        meta: { source: "CITIZEN_CARDS" }
      }, { user });
      window.WS_APP.appendTerminalLogLine?.(`CITIZEN DRAFT CREATED / ${saved.id}`, { typed: true, speed: 8 });
      window.WS_APP.pushModuleView?.(() => renderCitizenCardsModule(user));
      window.WS_APP.openCitizenCreator?.(saved.id);
    } else {
      window.WS_APP.appendAdminAuditEvent?.({
        category: "CITIZEN",
        action: "CITIZEN_DRAFT_CREATE_FAILED",
        target: "CITIZEN_DRAFT",
        summary: "Citizen draft creation failed from Citizen Cards registry.",
        resultCode: result?.error?.code || "CITIZEN_DRAFT_CREATE_FAILED",
        status: "FAILED",
        meta: { source: "CITIZEN_CARDS" }
      }, { user });
    }
  });
  document.querySelector("#citizen-quick-npc-button")?.addEventListener("click", (event) => {
    window.WS_APP.CitizenEditorUtils?.rememberTrigger?.(event.currentTarget);
    const result = window.WS_APP.openCitizenQuickNpcCreator?.();
    if (result?.ok === false) {
      window.WS_APP.appendTerminalLogLine?.(`QUICK NPC CREATOR FAILED / ${result?.error?.code || "UNKNOWN"}`, { typed: true, speed: 8 });
    }
  });
  bindCitizenCardsList(user);
}

function getCitizenCardsProfileCounts(citizens = []) {
  return (Array.isArray(citizens) ? citizens : []).reduce((acc, citizen) => {
    const raw = String(citizen.biologicalProfile || citizen.profile || "UNCLASSIFIED").toUpperCase();
    const profile = ["ALPHA", "BETA", "GAMMA"].includes(raw) ? raw : "UNCLASSIFIED";
    acc[profile] = (acc[profile] || 0) + 1;
    return acc;
  }, { ALPHA: 0, BETA: 0, GAMMA: 0, UNCLASSIFIED: 0 });
}

function renderCitizenCardsListCard(citizen) {
  const entry = citizenToFileEntry(citizen);
  const profile = citizen.biologicalProfile || citizen.profile || "UNCLASSIFIED";
  const normalizedProfile = ["ALPHA", "BETA", "GAMMA"].includes(String(profile || "").toUpperCase()) ? String(profile).toUpperCase() : "UNCLASSIFIED";
  const tags = (citizen.tags || []).slice(0, 4);
  const age = window.WS_APP.getCitizenAge?.(citizen);
  const ledger = window.WS_APP.getCitizenFinancialLedger(citizen);
  const activeSubscriptions = ledger.subscriptions.filter((subscription) => subscription.active && String(subscription.status || "").toUpperCase() !== "CANCELLED").length;
  const recordState = String(citizen.recordState || "ACTIVE").toUpperCase();
  const searchText = [getCitizenNameLabel(citizen, { legal: true }), getCitizenNameLabel(citizen), citizen.id, citizen.idNumber, getCitizenShortId(citizen), profile, recordState].join(" ").toLowerCase();

  return `
    <button class="citizen-card-list-item" type="button" data-card-citizen-id="${escapeHtml(citizen.id)}" data-card-profile="${escapeHtml(normalizedProfile)}" data-card-debt="${escapeHtml(ledger.debt)}" data-card-active-subscriptions="${escapeHtml(activeSubscriptions)}" data-card-risk="${escapeHtml(getCitizenRiskValue(citizen))}" data-card-search="${escapeHtml(searchText)}">
      ${renderFileThumb(entry)}

      <span class="citizen-card-list-main">
        <b>${escapeHtml(getCitizenNameLabel(citizen))}</b>
        <small>${escapeHtml(citizen.idNumber || citizen.id)}</small>
        <span class="citizen-card-list-tags">
          ${tags.map((tag) => `<i>${escapeHtml(tag)}</i>`).join("")}
        </span>
      </span>

      <span class="file-person-badges">
        ${age !== null && age !== undefined ? `<i class="citizen-age-badge is-index-age"><small>AGE</small><b>${escapeHtml(age)}</b></i>` : ""}
        <strong>${escapeHtml(profile)}</strong>
        <i class="citizen-card-mini-metric">${escapeHtml(recordState)}</i>
        <i class="citizen-card-mini-metric">${escapeHtml(formatCredits(ledger.debt))} DEBT</i>
        <i class="citizen-card-mini-metric">${escapeHtml(activeSubscriptions)} SUBS</i>
      </span>
    </button>
  `;
}

function bindCitizenCardsList(user) {
  const cards = document.querySelectorAll("[data-card-citizen-id]");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      window.WS_APP.pushModuleView?.(() => renderCitizenCardsModule(user));
      renderCitizenCardModule(user, "CITIZEN CARDS", card.dataset.cardCitizenId, { returnTarget: "citizen-cards" });
    });
  });

  bindCitizenCardFilters();
}

function bindCitizenCardFilters() {
  const toolbar = document.querySelector("[data-citizen-card-filters]");
  const cards = Array.from(document.querySelectorAll("[data-card-citizen-id]"));
  if (!toolbar || !cards.length) return;

  const apply = () => {
    const query = String(toolbar.querySelector("[data-citizen-card-search]")?.value || "").trim().toLowerCase();
    const profile = String(toolbar.querySelector("[data-citizen-card-profile]")?.value || "ALL").toUpperCase();
    const riskMin = Number(toolbar.querySelector("[data-citizen-card-risk-filter]")?.value || 0);
    const debtOnly = Boolean(toolbar.querySelector("[data-citizen-card-debt-filter]")?.checked);
    const activeOnly = Boolean(toolbar.querySelector("[data-citizen-card-active-sub-filter]")?.checked);

    cards.forEach((card) => {
      const matchesQuery = !query || String(card.dataset.cardSearch || "").includes(query);
      const matchesProfile = profile === "ALL" || String(card.dataset.cardProfile || "").toUpperCase() === profile;
      const matchesRisk = !riskMin || Number(card.dataset.cardRisk || 0) >= riskMin;
      const matchesDebt = !debtOnly || Number(card.dataset.cardDebt || 0) > 0;
      const matchesActive = !activeOnly || Number(card.dataset.cardActiveSubscriptions || 0) > 0;
      card.hidden = !(matchesQuery && matchesProfile && matchesRisk && matchesDebt && matchesActive);
    });
  };

  toolbar.querySelectorAll("input, select").forEach((field) => {
    field.addEventListener("input", apply);
    field.addEventListener("change", apply);
  });
}

window.WS_APP.openCitizenCard = function openCitizenCard(citizenId, returnTarget = "citizen-cards") {
  const user = window.WS_APP.currentUser;

  if (!user || !citizenId) return;

  if (user.role !== "admin" && citizenId !== user.citizenId) return;

  if (user.role === "admin") {
    window.WS_APP.currentModuleId = "citizen-cards";
    renderCitizenCardModule(user, "CITIZEN CARDS", citizenId, { returnTarget });
    return;
  }

  window.WS_APP.currentModuleId = "citizen-card";
  renderCitizenCardModule(user, "CITIZEN CARD", citizenId);
}

function confirmRegistryAction(title, message, confirmLabel) {
  return window.WS_APP.confirmAction?.({
    title,
    message,
    confirmLabel,
    cancelLabel: "Cancel",
    tone: "danger"
  }) ?? Promise.resolve(false);
}

function bindBackButton(user) {
  window.WS_APP.bindModuleBackButton(user, () => window.WS_APP.renderModules(user));
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

function citizenToFileEntry(citizen) {
  return {
    id: citizen.id,
    legalName: getCitizenNameLabel(citizen),
    legalNameReal: getCitizenNameLabel(citizen, { legal: true }),
    age: window.WS_APP.getCitizenAge?.(citizen),
    recordId: citizen.idNumber,
    profileTag: citizen.biologicalProfile || citizen.profile,
    portrait: citizen.portrait,
    tags: citizen.tags || []
  };
}

function renderFileThumb(entry) {
  const initials = String(entry.legalName || "?")
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!entry.portrait) {
    return `<span class="file-thumb is-placeholder">${escapeHtml(initials)}</span>`;
  }

  return `
    <span class="file-thumb">
      <img
        src="${escapeHtml(entry.portrait)}"
        alt="Miniatura: ${escapeHtml(entry.legalName)}"
        onerror="this.closest('.file-thumb').classList.add('is-placeholder'); this.closest('.file-thumb').textContent='${escapeHtml(initials)}';"
      />
    </span>
  `;
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


window.WS_APP.renderCitizenCardModule = renderCitizenCardModule;
window.WS_APP.renderCitizenCardsModule = renderCitizenCardsModule;

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

function bindCitizenCardPolishActions(user, citizen, moduleLabel = "CITIZEN CARD", options = {}) {
  document.querySelectorAll("[data-citizen-card-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.citizenCardMode || "full";
      const currentMode = getCitizenCardViewMode();
      if (nextMode === currentMode) return;

      const card = button.closest(".citizen-card-view");
      card?.classList.add("is-card-mode-transitioning");

      window.setTimeout(() => {
        window.WS_APP.citizenCardViewMode = nextMode;
        window.WS_APP.citizenCardModeEntering = true;
        renderCitizenCardModule(user, moduleLabel, citizen.id, options);
      }, 180);
    });
  });

  document.querySelectorAll("[data-citizen-card-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = String(button.dataset.citizenCardAction || "").trim().toLowerCase();
      const targetId = String(button.dataset.citizenCardTargetId || citizen?.id || user?.citizenId || "").trim();
      if (!action) return;

      const returnView = () => renderCitizenCardModule(user, moduleLabel, citizen.id, options);
      window.WS_APP.pushModuleView?.(returnView);

      if (action === "terminal") {
        window.WS_APP.openModule?.("terminal-hub", user, { skipLoader: true, citizenId: targetId, panel: "inbox" });
        return;
      }

      if (action === "billing") {
        window.WS_APP.openModule?.("terminal-hub", user, { skipLoader: true, citizenId: targetId, panel: "billing", section: "transactions" });
        return;
      }

      if (action === "subscriptions") {
        window.WS_APP.openModule?.("subscriptions", user, { skipLoader: true });
        return;
      }

      if (action === "service") {
        window.WS_APP.openModule?.("service", user, { skipLoader: true });
        return;
      }

      if (action === "citizen-files") {
        window.WS_APP.openModule?.("citizen-files", user, { skipLoader: true });
      }
    });
  });

  document.querySelectorAll(".citizen-card-view [data-view-subscription-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const subscriptionId = String(button.dataset.viewSubscriptionId || "").trim();
      if (!subscriptionId) return;
      const returnView = () => renderCitizenCardModule(user, moduleLabel, citizen.id, options);

      if (typeof window.WS_APP.openCitizenSubscriptionFromSummary === "function") {
        window.WS_APP.openCitizenSubscriptionFromSummary(user, citizen, subscriptionId, {
          returnView,
          returnViewId: "citizen-card"
        });
        return;
      }

      const activeSubscriptions = getCitizenCardSummaryStats(citizen).activeSubscriptions || [];
      const subscription = activeSubscriptions.find((item) => String(item.id || "") === subscriptionId)
        || (Array.isArray(citizen.subscriptions) ? citizen.subscriptions : []).find((item) => String(item.id || "") === subscriptionId)
        || null;
      window.WS_APP.pushModuleView?.(returnView);

      if (user?.role === "admin" && typeof window.WS_APP.renderAdminCitizenSubscriptionControl === "function") {
        window.WS_APP.renderAdminCitizenSubscriptionControl(user, citizen.id, {
          category: subscription?.category || "INSURANCE",
          selectedSubscriptionId: subscriptionId
        });
        return;
      }

      if (typeof window.WS_APP.renderPlayerSubscriptionProfile === "function") {
        window.WS_APP.renderPlayerSubscriptionProfile(user, subscriptionId, "citizen-card");
        return;
      }

      window.WS_APP.openModule?.("subscriptions", user, { skipLoader: true });
    });
  });

  document.querySelectorAll(".citizen-card-view [data-citizen-card-equipment-item-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const itemId = String(button.dataset.citizenCardEquipmentItemId || "").trim();
      if (!citizen?.id || !itemId) return;
      window.WS_APP.citizenCardEquipmentInspectorByCitizen = window.WS_APP.citizenCardEquipmentInspectorByCitizen || {};
      window.WS_APP.citizenCardEquipmentInspectorByCitizen[citizen.id] = itemId;
      renderCitizenCardModule(user, moduleLabel, citizen.id, options);
    });
  });

  document.querySelectorAll(".citizen-card-view [data-citizen-card-equipment-clear]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (citizen?.id && window.WS_APP.citizenCardEquipmentInspectorByCitizen) {
        delete window.WS_APP.citizenCardEquipmentInspectorByCitizen[citizen.id];
      }
      renderCitizenCardModule(user, moduleLabel, citizen.id, options);
    });
  });



}

