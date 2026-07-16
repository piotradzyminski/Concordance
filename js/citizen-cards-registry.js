// Citizen Cards GM registry renderer and bindings.
// This file owns the registry list surface only. Citizen Card detail rendering
// remains in citizen-card-shell.js and citizen-card-renderers.js.

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

window.WS_APP.renderCitizenCardsModule = renderCitizenCardsModule;
