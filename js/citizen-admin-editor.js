window.WS_APP = window.WS_APP || {};

(function initCitizenAdminEditorModule() {
  const OVERLAY_ID = "citizen-admin-editor-overlay";
  const TABS = ["overview", "identity", "mechanics", "access", "domains", "audit"];
  const EDITABLE_TABS = new Set(["identity", "mechanics", "access"]);
  let activeCitizenId = "";
  let activeTab = "overview";
  let dirtySections = new Set();
  let bound = false;

  const utils = () => window.WS_APP.CitizenEditorUtils || {};
  const escapeHtml = (value) => utils().escapeHtml?.(value) || String(value ?? "");

  function getCitizen() {
    return window.WS_APP.getCitizenById?.(activeCitizenId) || null;
  }

  function isAdminActor(user = window.WS_APP.currentUser) {
    return String(user?.role || "").trim().toLowerCase() === "admin";
  }

  function appendEditorAudit(user, citizen, input = {}) {
    if (!isAdminActor(user) || typeof window.WS_APP.appendAdminAuditEvent !== "function") return null;
    return window.WS_APP.appendAdminAuditEvent({
      category: input.category || "CITIZEN",
      action: input.action || "CITIZEN_ADMIN_EDITOR_EVENT",
      citizenId: citizen?.id || input.citizenId || "",
      target: citizen?.id || input.target || "CITIZEN_RECORD",
      summary: input.summary || "Citizen Admin Editor event.",
      resultCode: input.resultCode || input.action || "CITIZEN_ADMIN_EDITOR_EVENT",
      status: input.status || "SUCCEEDED",
      idempotencyKey: input.idempotencyKey || "",
      previousRevision: input.previousRevision ?? citizen?.revision ?? citizen?.recordRevision ?? null,
      nextRevision: input.nextRevision ?? null,
      meta: {
        source: "CITIZEN_ADMIN_EDITOR",
        section: input.section || "",
        ...(input.meta || {})
      }
    }, { user });
  }

  function canOpen(citizen, user = window.WS_APP.currentUser) {
    if (!citizen || citizen.recordType === "admin" || !user) return false;
    return isAdminActor(user) || window.WS_APP.hasOwnerFullCardEditGrant?.(citizen, user) === true;
  }

  function ensureShell() {
    if (document.getElementById(OVERLAY_ID)) return document.getElementById(OVERLAY_ID);
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "citizen-editor-overlay citizen-admin-editor-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <section class="citizen-editor-shell citizen-admin-editor-shell" role="dialog" aria-modal="true" aria-labelledby="citizen-admin-editor-title">
        <header class="citizen-editor-head citizen-admin-editor-head">
          <div>
            <p data-admin-editor-kicker>Admin / Citizen Record</p>
            <h3 id="citizen-admin-editor-title">Manage Citizen</h3>
          </div>
          <div class="citizen-admin-editor-head-actions">
            <small class="citizen-admin-shortcuts">Alt+1–6 sections / Ctrl+S save</small>
            <span class="citizen-editor-unsaved" data-admin-editor-dirty hidden>Unsaved sections</span>
            <div class="citizen-admin-editor-persistent-actions" aria-label="Citizen editor actions">
              <button class="citizen-editor-button" type="button" data-admin-editor-action="discard-current" disabled>Discard Changes</button>
              <button class="citizen-editor-button is-primary" type="button" data-admin-editor-action="save-current" disabled>Save Current</button>
            </div>
            <button class="citizen-editor-close" type="button" data-admin-editor-close aria-label="Close Citizen editor">Close</button>
          </div>
        </header>
        <div class="citizen-admin-editor-layout">
          <aside class="citizen-admin-editor-nav" aria-label="Citizen editor sections">
            ${TABS.map((tab) => `<button type="button" data-admin-editor-tab="${tab}">${formatTabLabel(tab)}</button>`).join("")}
          </aside>
          <main class="citizen-admin-editor-main">
            <p class="citizen-editor-message" data-admin-editor-message role="status" aria-live="polite"></p>
            <section class="citizen-admin-editor-panel" data-admin-editor-panel="overview"></section>
            <section class="citizen-admin-editor-panel" data-admin-editor-panel="identity"></section>
            <section class="citizen-admin-editor-panel" data-admin-editor-panel="mechanics"></section>
            <section class="citizen-admin-editor-panel" data-admin-editor-panel="access"></section>
            <section class="citizen-admin-editor-panel" data-admin-editor-panel="domains"></section>
            <section class="citizen-admin-editor-panel" data-admin-editor-panel="audit"></section>
          </main>
        </div>
      </section>
    `;
    document.body.appendChild(overlay);
    bindShell(overlay);
    return overlay;
  }

  function bindShell(overlay) {
    if (bound) return;
    bound = true;

    overlay.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-admin-editor-tab]");
      if (tab) {
        event.preventDefault();
        activateTab(tab.dataset.adminEditorTab);
        return;
      }

      if (event.target === overlay || event.target.closest("[data-admin-editor-close]")) {
        event.preventDefault();
        closeCitizenAdminEditor();
        return;
      }

      const saveButton = event.target.closest("[data-admin-editor-save]");
      if (saveButton) {
        event.preventDefault();
        saveSection(saveButton.dataset.adminEditorSave);
        return;
      }

      const action = event.target.closest("[data-admin-editor-action]");
      if (action) {
        event.preventDefault();
        handleAction(action.dataset.adminEditorAction, action);
      }
    });

    overlay.addEventListener("input", markEventSectionDirty);
    overlay.addEventListener("change", markEventSectionDirty);
    overlay.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-editor-section-form]");
      if (!form) return;
      event.preventDefault();
      saveSection(form.dataset.editorSectionForm);
    });
    document.addEventListener("keydown", (event) => {
      if (!overlay.classList.contains("is-active")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeCitizenAdminEditor();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === "s") {
        event.preventDefault();
        if (["identity", "mechanics", "access"].includes(activeTab)) saveSection(activeTab);
        else showMessage("The active section is read-only.", "error");
        return;
      }
      if (event.altKey && /^[1-6]$/.test(event.key)) {
        event.preventDefault();
        activateTab(TABS[Number(event.key) - 1]);
        return;
      }
      if (event.altKey && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        const index = Math.max(0, TABS.indexOf(activeTab));
        const delta = event.key === "ArrowRight" ? 1 : -1;
        activateTab(TABS[Math.max(0, Math.min(TABS.length - 1, index + delta))]);
        return;
      }
      utils().trapFocus?.(event, overlay.querySelector(".citizen-admin-editor-shell"));
    });
  }

  function openCitizenAdminEditor(citizenId, options = {}) {
    const user = options.user || window.WS_APP.currentUser;
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!canOpen(citizen, user)) return { ok: false, error: { code: "ADMIN_CITIZEN_EDITOR_DENIED" } };

    const state = String(citizen.recordState || "ACTIVE").toUpperCase();
    if (["DRAFT", "CHANGES_REQUESTED", "READY_FOR_REVIEW", "REJECTED"].includes(state)
      && typeof window.WS_APP.openCitizenCreator === "function") {
      window.WS_APP.openCitizenCreator(citizen.id);
      return { ok: true, editor: "CREATOR", citizen };
    }

    const overlay = ensureShell();
    activeCitizenId = citizen.id;
    activeTab = options.tab && TABS.includes(options.tab) ? options.tab : "overview";
    dirtySections = new Set();
    renderAll(citizen, user);
    clearMessage(overlay);
    overlay.classList.add("is-active");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-citizen-editor-open");
    activateTab(activeTab);
    window.requestAnimationFrame?.(() => overlay.querySelector(`[data-admin-editor-tab="${activeTab}"]`)?.focus());
    return { ok: true, editor: "ADMIN", citizen };
  }

  function renderAll(citizen, user) {
    renderHeader(citizen, user);
    renderOverview(citizen, user);
    renderIdentity(citizen, user);
    renderMechanics(citizen, user);
    renderAccess(citizen, user);
    renderDomains(citizen, user);
    renderAudit(citizen, user);
    updateDirtyMarker();
  }

  function renderHeader(citizen, user) {
    const overlay = ensureShell();
    const admin = isAdminActor(user);
    overlay.querySelector("[data-admin-editor-kicker]").textContent = admin
      ? "Admin / Citizen Record"
      : "Delegated Owner / Full Card Edit";
    overlay.querySelector("#citizen-admin-editor-title").textContent = `${getCitizenName(citizen)} / ${citizen.shortId || citizen.id}`;
  }

  function renderOverview(citizen, user) {
    const panel = getPanel("overview");
    const admin = isAdminActor(user);
    const ownerOptions = getOwnerOptions(citizen.ownerUserId);
    panel.innerHTML = `
      <header class="citizen-admin-panel-head">
        <div><p>Record Overview</p><h4>${escapeHtml(getCitizenName(citizen))}</h4></div>
        <span class="citizen-admin-state is-${escapeHtml(String(citizen.recordState || "active").toLowerCase())}">${escapeHtml(citizen.recordState || "ACTIVE")}</span>
      </header>
      <div class="citizen-admin-overview-grid">
        ${renderFact("Citizen ID", citizen.idNumber || "UNFINALIZED")}
        ${renderFact("Short ID", citizen.shortId || citizen.id)}
        ${renderFact("Profile", citizen.biologicalProfile || citizen.profile || "UNCLASSIFIED")}
        ${renderFact("Origin", citizen.origin || "UNKNOWN")}
        ${renderFact("Revision", citizen.revision || 1)}
        ${renderFact("Owner", citizen.ownerUserId || "UNASSIGNED")}
        ${renderFact("Risk", `${Number(citizen.risk || 0)}%`)}
        ${renderFact("Full card edit", citizen.ownerFullCardEdit === true ? "ENABLED" : "DISABLED")}
      </div>
      ${admin ? `
        <section class="citizen-admin-action-block">
          <header><h5>Ownership & Delegation</h5><p>These controls remain Admin-only.</p></header>
          <div class="citizen-admin-inline-controls">
            <label class="citizen-editor-field">
              <span>Assigned owner account</span>
              <select data-admin-owner-select>${ownerOptions}</select>
            </label>
            <button class="citizen-editor-button" type="button" data-admin-editor-action="assign-owner">Assign Owner</button>
          </div>
          <label class="citizen-admin-switch">
            <input class="ui-select-control" type="checkbox" data-admin-full-edit-switch ${citizen.ownerFullCardEdit === true ? "checked" : ""} ${citizen.ownerUserId ? "" : "disabled"} />
            <span><b>ALLOW PLAYER FULL CARD EDIT</b><small>Admin-like editing of Citizen-owned fields for this card only.</small></span>
          </label>
        </section>
        <section class="citizen-admin-action-block">
          <header><h5>Record Lifecycle</h5><p>Linked domain history is preserved.</p></header>
          <button class="citizen-editor-button ${citizen.recordState === "ARCHIVED" ? "" : "is-danger"}" type="button" data-admin-editor-action="toggle-archive">
            ${citizen.recordState === "ARCHIVED" ? "Restore Record" : "Archive Record"}
          </button>
        </section>
      ` : `
        <section class="citizen-admin-action-block">
          <header><h5>Delegated Editing</h5></header>
          <p class="citizen-admin-copy">You may edit Citizen-owned identity, mechanics, badges, tags, access fields and notes. External domain records remain read-only.</p>
        </section>
      `}
    `;
  }

  function renderIdentity(citizen, user) {
    const panel = getPanel("identity");
    const identity = window.WS_APP.getCitizenIdentity?.(citizen) || citizen.identity || {};
    panel.innerHTML = `
      ${renderSectionHeader("Identity & Character", "Citizen-owned profile data. Citizen ID and Short ID are automatically synchronized with origin and birth date.")}
      <form class="citizen-admin-section-form" data-editor-section-form="identity" autocomplete="off">
        <div class="citizen-editor-form-grid">
          ${textField("firstName", "First name", identity.firstName || "")}
          ${textField("middleName", "Middle name", identity.middleName || "")}
          ${textField("surname", "Surname", identity.surname || "")}
          ${textField("pseudonym", "Pseudonym", identity.pseudonym || "")}
          ${textField("displayNameOverride", "Encrypted display name", identity.displayNameOverride || "")}
          <label class="citizen-editor-field"><span>Name reveal access</span><select name="nameRevealAccess">
            ${["PUBLIC", "RESTRICTED", "CONFIDENTIAL", "BLACK", "GAME_MASTER"].map((value) => `<option value="${value}" ${identity.nameRevealAccess === value ? "selected" : ""}>${value}</option>`).join("")}
          </select></label>
          <label class="citizen-admin-checkbox"><input class="ui-select-control" name="encryptedName" type="checkbox" ${identity.encryptedName ? "checked" : ""} /><span>Encrypt legal name outside authorized access</span></label>
          <label class="citizen-editor-field"><span>Biological profile</span><select name="biologicalProfile">
            ${["ALPHA", "BETA", "GAMMA", "UNCLASSIFIED"].map((value) => `<option value="${value}" ${(citizen.biologicalProfile || citizen.profile) === value ? "selected" : ""}>${value}</option>`).join("")}
          </select></label>
          ${textField("origin", "Origin", citizen.origin || "")}
          ${textField("birthDate", "Birth date", getCitizenBirthDateValue(citizen), "date")}
          ${textField("portrait", "Portrait path", citizen.portrait || "", "text", "is-wide")}
          <label class="citizen-editor-field"><span>Citizen ID <small>auto-derived from origin and birth date</small></span><input name="idNumber" type="text" value="${escapeHtml(citizen.idNumber || "UNFINALIZED")}" readonly data-citizen-id-preview /></label>
          <label class="citizen-editor-field"><span>Short ID <small>auto-derived from birth date</small></span><input name="shortId" type="text" value="${escapeHtml(citizen.shortId || citizen.id)}" readonly data-citizen-short-id-preview /></label>
          ${textareaField("appearance", "Appearance", citizen.appearance || "", "is-wide")}
          ${textareaField("playerNote", "Player note", citizen.playerNote || "", "is-wide")}
          ${textareaField("tags", "Content tags — comma or line separated", utils().listToText?.(citizen.tags) || "", "is-wide")}
          ${textareaField("badges", "Badges — Label | Code | Description, one per line", badgesToText(citizen.badges), "is-wide")}
        </div>
        ${renderSectionFooter("identity", user)}
      </form>
    `;
    bindIdentityLocalControls(panel, citizen);
  }

  function renderMechanics(citizen, user) {
    const panel = getPanel("mechanics");
    const abilityValues = normalizeAbilityMap(citizen.abilities);
    const skillValues = normalizeSkillMap(citizen.skills);
    const abilities = getAbilityDefinitionsForEditor(citizen);
    const skills = getSkillDefinitionsForEditor(citizen);
    const skillGroups = groupDefinitionsByCategory(skills);
    panel.innerHTML = `
      ${renderSectionHeader("Mechanics Correction", "Full Citizen-owned Ability and Skill editing. Cyberware contribution remains a read-only runtime projection.")}
      <form class="citizen-admin-section-form" data-editor-section-form="mechanics" autocomplete="off">
        <section class="citizen-admin-mechanics-block citizen-admin-abilities-block">
          <header class="citizen-admin-mechanics-block-head">
            <div><h5>Abilities</h5><p>Natural 0–7 / Cyberware read-only / Total preview</p></div>
            <span>${abilities.length} registered</span>
          </header>
          <div class="citizen-admin-ability-card-grid">
            ${abilities.map((definition) => {
              const value = abilityValues.get(definition.id) || { natural: 0, cyberware: 0, cyberwareActive: true };
              const natural = clamp(value.natural, 0, Number(definition.maxNatural || 7));
              const cyberware = value.cyberwareActive === false ? 0 : clamp(value.cyberware, 0, Number(definition.maxCyberware || 8));
              return `<article class="citizen-admin-ability-card" data-ability-card data-ability-id="${escapeHtml(definition.id)}" data-ability-label="${escapeHtml(definition.label || definition.id)}" data-ability-cyberware="${cyberware}" data-ability-max-natural="${Number(definition.maxNatural || 7)}" data-ability-max-cyberware="${Number(definition.maxCyberware || 8)}">
                <header><div><b>${escapeHtml(definition.label || definition.id)}</b><small>${escapeHtml(definition.category || "GENERAL")}</small></div><strong data-ability-total>${natural + cyberware}</strong></header>
                <p>${escapeHtml(definition.description || "No Ability description registered.")}</p>
                <div class="citizen-admin-rating-control">
                  <span>Natural</span>
                  ${renderMechanicsStepper("ability", natural, 0, Number(definition.maxNatural || 7), "data-ability-natural")}
                  <span class="citizen-admin-cyber-readout">Cyber <b>${cyberware}</b></span>
                </div>
                <div class="citizen-admin-rating-blocks is-ability" data-ability-blocks aria-label="Ability value blocks">${renderAbilityBlocks(natural, cyberware, Number(definition.maxNatural || 7), Number(definition.maxCyberware || 8))}</div>
              </article>`;
            }).join("") || '<p class="citizen-admin-copy">No Ability definitions available.</p>'}
          </div>
        </section>
        <section class="citizen-admin-mechanics-block citizen-admin-skills-block">
          <header class="citizen-admin-mechanics-block-head">
            <div><h5>Skills</h5><p>Enable or remove a Skill, then set Level 1–10.</p></div>
            <label class="citizen-admin-skill-search"><span>Filter</span><input type="search" placeholder="Filter skills" data-skill-filter /></label>
          </header>
          <div class="citizen-admin-skill-groups">
            ${skillGroups.map(([category, definitions]) => `<section class="citizen-admin-skill-group" data-skill-group>
              <header><h6>${escapeHtml(category)}</h6><span>${definitions.length}</span></header>
              <div class="citizen-admin-skill-list">
                ${definitions.map((definition) => {
                  const value = skillValues.get(definition.id);
                  const level = clamp(value?.value || 1, 1, Number(definition.maxValue || 10));
                  return `<article class="citizen-admin-skill-card ${value ? "is-enabled" : ""}" data-skill-row data-skill-search="${escapeHtml(`${definition.label || ""} ${definition.id} ${definition.category || ""} ${definition.description || ""}`.toLowerCase())}">
                    <label class="citizen-admin-skill-enable"><input class="ui-select-control" type="checkbox" data-skill-enabled data-skill-id="${escapeHtml(definition.id)}" data-skill-label="${escapeHtml(definition.label || definition.id)}" ${value ? "checked" : ""} /><span><b>${escapeHtml(definition.label || definition.id)}</b><small>${escapeHtml(definition.id)}</small></span></label>
                    <p>${escapeHtml(definition.description || "No Skill description registered.")}</p>
                    <div class="citizen-admin-skill-value">
                      ${renderMechanicsStepper("skill", level, 1, Number(definition.maxValue || 10), "data-skill-value", !value)}
                      <div class="citizen-admin-rating-blocks is-skill" data-skill-blocks aria-label="Skill level blocks">${renderRatingBlocks(level, Number(definition.maxValue || 10), "skill")}</div>
                    </div>
                  </article>`;
                }).join("")}
              </div>
            </section>`).join("") || '<p class="citizen-admin-copy">No Skill definitions available.</p>'}
          </div>
        </section>
        ${renderSectionFooter("mechanics", user)}
      </form>
    `;
    bindMechanicsLocalControls(panel);
  }

  function renderAccess(citizen, user) {
    const panel = getPanel("access");
    const admin = isAdminActor(user);
    panel.innerHTML = `
      ${renderSectionHeader("Access & System Fields", "Card visibility and Citizen-owned access metadata. Risk uses a separate canonical command.")}
      <form class="citizen-admin-section-form" data-editor-section-form="access" autocomplete="off">
        <div class="citizen-editor-form-grid">
          <label class="citizen-admin-checkbox"><input class="ui-select-control" name="playerVisible" type="checkbox" ${citizen.playerVisible !== false ? "checked" : ""} /><span>Visible in player-facing Citizen registry</span></label>
          ${textField("recordState", "Record state", citizen.recordState || "ACTIVE", "text", "", true)}
          ${textareaField("accessTags", "Access tags — comma or line separated", utils().listToText?.(citizen.accessTags) || "", "is-wide")}
          ${textareaField("systemNote", "System note", citizen.systemNote || citizen.note || "", "is-wide")}
        </div>
        ${renderSectionFooter("access", user)}
      </form>
      ${admin ? `
        <section class="citizen-admin-action-block citizen-admin-risk-control">
          <header><h5>Risk Adjustment</h5><p>Writes the canonical Risk log. A reason is required.</p></header>
          <div class="citizen-admin-inline-controls">
            <label class="citizen-editor-field"><span>Risk 0–100</span><input type="number" min="0" max="100" step="1" value="${Number(citizen.risk || 0)}" data-admin-risk-value /></label>
            <label class="citizen-editor-field is-grow"><span>Reason</span><input type="text" maxlength="240" data-admin-risk-reason placeholder="Operator reason" /></label>
            <button class="citizen-editor-button is-primary" type="button" data-admin-editor-action="adjust-risk">Apply Risk</button>
          </div>
        </section>
      ` : ""}
    `;
  }

  function renderDomains(citizen, user) {
    const panel = getPanel("domains");
    const itemCount = window.WS_APP.getCitizenItemInstances?.(citizen.id, { includeBody: true, includeDisposed: false })?.length || 0;
    const cyberwareCount = window.WS_APP.getInstalledCyberwareInstances?.(citizen.id)?.length || 0;
    const housingCount = window.WS_APP.getCitizenHousingRecords?.(citizen.id)?.length || 0;
    const subscriptions = Array.isArray(citizen.subscriptions) ? citizen.subscriptions : [];
    const serviceLog = Array.isArray(citizen.serviceLog) ? citizen.serviceLog : [];
    panel.innerHTML = `
      ${renderSectionHeader("Linked Domains", "Read-only projections. Changes are performed in canonical domain modules.")}
      <div class="citizen-admin-domain-grid">
        ${renderDomainCard("Billing", `${formatCredits(citizen.credits)} / Debt ${formatCredits(citizen.debt)}`, "billing")}
        ${renderDomainCard("Subscriptions", `${subscriptions.length} contract(s)`, "subscriptions")}
        ${renderDomainCard("Service", `${serviceLog.length} record(s)`, "service")}
        ${renderDomainCard("Housing", `${housingCount} record(s)`, "housing")}
        ${renderDomainCard("Equipment", `${itemCount} ItemInstance record(s)`, "equipment")}
        ${renderDomainCard("Cyberware", `${cyberwareCount} installed system(s)`, "cyberware")}
      </div>
      <p class="citizen-admin-copy">This workspace does not write Credits, Debt, Subscription contracts, Service records, Housing, ItemInstance or Cyberware state.</p>
    `;
  }

  function renderAudit(citizen) {
    const panel = getPanel("audit");
    const audit = (Array.isArray(citizen.citizenAuditTrail) ? citizen.citizenAuditTrail : []).slice().reverse();
    const riskLog = (Array.isArray(citizen.riskLog) ? citizen.riskLog : []).slice().reverse();
    panel.innerHTML = `
      ${renderSectionHeader("Citizen Audit", "Citizen command history and Risk changes.")}
      <div class="citizen-admin-audit-columns">
        <section><header><h5>Command Audit</h5><span>${audit.length}</span></header>
          <div class="citizen-admin-audit-list">${audit.length ? audit.map(renderAuditEntry).join("") : '<p class="citizen-admin-copy">No Citizen command audit entries.</p>'}</div>
        </section>
        <section><header><h5>Risk Log</h5><span>${riskLog.length}</span></header>
          <div class="citizen-admin-audit-list">${riskLog.length ? riskLog.map(renderRiskEntry).join("") : '<p class="citizen-admin-copy">No Risk changes.</p>'}</div>
        </section>
      </div>
    `;
  }

  function saveSection(section) {
    const citizen = getCitizen();
    const user = window.WS_APP.currentUser;
    if (!citizen || !canOpen(citizen, user)) {
      showMessage("Editor access expired.", "error");
      return;
    }
    if (section === "identity") saveIdentity(citizen, user);
    if (section === "mechanics") saveMechanics(citizen, user);
    if (section === "access") saveAccess(citizen, user);
  }

  function saveIdentity(citizen, user) {
    const form = getPanel("identity").querySelector("form");
    const biologicalProfile = form.elements.biologicalProfile.value;
    const patch = {
      firstName: form.elements.firstName.value.trim(),
      middleName: form.elements.middleName.value.trim(),
      surname: form.elements.surname.value.trim(),
      pseudonym: form.elements.pseudonym.value.trim(),
      encryptedName: form.elements.encryptedName.checked,
      displayNameOverride: form.elements.displayNameOverride.value.trim(),
      nameRevealAccess: form.elements.nameRevealAccess.value,
      biologicalProfile,
      profile: biologicalProfile,
      origin: form.elements.origin.value.trim(),
      birthDate: form.elements.birthDate.value,
      portrait: form.elements.portrait.value.trim(),
      appearance: form.elements.appearance.value.trim(),
      playerNote: form.elements.playerNote.value.trim(),
      tags: utils().parseList?.(form.elements.tags.value) || [],
      badges: parseBadges(form.elements.badges.value)
    };
    const idempotencyKey = `citizen-admin-editor:identity:${citizen.id}:${Date.now()}`;
    const result = window.WS_APP.CitizenCommandAPI?.adminUpdateCitizenRecord?.(citizen.id, {
      patch,
      reason: isAdminActor(user)
        ? "Citizen identity and character fields updated through Admin Citizen Editor."
        : "Citizen-owned fields updated through delegated full card edit.",
      source: "CITIZEN_ADMIN_EDITOR",
      idempotencyKey
    }, user);
    handleSaveResult(result, "identity", "Identity saved.", {
      citizen,
      user,
      idempotencyKey,
      action: "CITIZEN_IDENTITY_UPDATED",
      changedFields: Object.keys(patch)
    });
  }

  function saveMechanics(citizen, user) {
    const form = getPanel("mechanics").querySelector("form");
    const existingAbilities = normalizeAbilityMap(citizen.abilities);
    const abilities = Array.from(form.querySelectorAll("[data-ability-card]")).map((card) => {
      const existing = existingAbilities.get(card.dataset.abilityId) || {};
      const naturalInput = card.querySelector("[data-ability-natural]");
      return {
        abilityId: card.dataset.abilityId,
        label: card.dataset.abilityLabel,
        natural: clamp(naturalInput?.value, 0, Number(card.dataset.abilityMaxNatural || 7)),
        cyberware: Number(existing.cyberware || 0),
        cyberwareActive: existing.cyberwareActive !== false
      };
    });
    const skills = Array.from(form.querySelectorAll("[data-skill-row]")).flatMap((row) => {
      const enabled = row.querySelector("[data-skill-enabled]");
      if (!enabled?.checked) return [];
      return [{
        skillId: enabled.dataset.skillId,
        label: enabled.dataset.skillLabel,
        value: clamp(row.querySelector("[data-skill-value]")?.value, 1, 10)
      }];
    });
    const idempotencyKey = `citizen-admin-editor:mechanics:${citizen.id}:${Date.now()}`;
    const result = window.WS_APP.CitizenCommandAPI?.adminCorrectCitizenMechanics?.(citizen.id, {
      patch: { abilities, skills },
      reason: isAdminActor(user)
        ? "Citizen mechanics corrected through Admin Citizen Editor."
        : "Citizen mechanics updated through delegated full card edit.",
      source: "CITIZEN_ADMIN_EDITOR",
      idempotencyKey
    }, user);
    handleSaveResult(result, "mechanics", "Mechanics saved.", {
      citizen,
      user,
      idempotencyKey,
      action: "CITIZEN_MECHANICS_UPDATED",
      changedFields: ["abilities", "skills"]
    });
  }

  function saveAccess(citizen, user) {
    const form = getPanel("access").querySelector("form");
    const patch = {
      playerVisible: form.elements.playerVisible.checked,
      accessTags: utils().parseList?.(form.elements.accessTags.value) || [],
      systemNote: form.elements.systemNote.value.trim()
    };
    const idempotencyKey = `citizen-admin-editor:access:${citizen.id}:${Date.now()}`;
    const result = window.WS_APP.CitizenCommandAPI?.adminUpdateCitizenAccess?.(citizen.id, {
      patch,
      reason: isAdminActor(user)
        ? "Citizen access fields updated through Admin Citizen Editor."
        : "Citizen-owned access fields updated through delegated full card edit.",
      source: "CITIZEN_ADMIN_EDITOR",
      idempotencyKey
    }, user);
    handleSaveResult(result, "access", "Access fields saved.", {
      citizen,
      user,
      idempotencyKey,
      action: "CITIZEN_ACCESS_UPDATED",
      category: "ACCESS",
      changedFields: Object.keys(patch)
    });
  }

  function handleSaveResult(result, section, successMessage, context = {}) {
    const citizen = context.citizen || getCitizen();
    if (!result?.ok) {
      appendEditorAudit(context.user, citizen, {
        category: context.category || "CITIZEN",
        action: `${context.action || "CITIZEN_SECTION_UPDATE"}_FAILED`,
        summary: `Citizen ${section} update failed for ${citizen?.id || "unknown"}.`,
        resultCode: result?.error?.code || "CITIZEN_SECTION_UPDATE_FAILED",
        status: "FAILED",
        idempotencyKey: context.idempotencyKey,
        section,
        meta: { changedFields: context.changedFields || [] }
      });
      showMessage(`Save failed: ${result?.error?.code || "UNKNOWN"}.`, "error");
      return;
    }
    appendEditorAudit(context.user, citizen, {
      category: context.category || "CITIZEN",
      action: context.action || "CITIZEN_SECTION_UPDATED",
      summary: `Citizen ${section} updated through Admin Citizen Editor.`,
      resultCode: result?.operation || context.action || "CITIZEN_SECTION_UPDATED",
      status: "SUCCEEDED",
      idempotencyKey: context.idempotencyKey,
      section,
      nextRevision: result?.citizen?.revision ?? result?.citizen?.recordRevision ?? null,
      meta: { changedFields: context.changedFields || [] }
    });
    dirtySections.delete(section);
    updateDirtyMarker();
    showMessage(successMessage, "ok");
    refreshReadOnlyPanels(result.citizen);
  }

  function handleAction(action) {
    const citizen = getCitizen();
    const user = window.WS_APP.currentUser;
    if (!citizen) return;

    if (action === "save-current") return saveCurrentSection();
    if (action === "discard-current") return discardCurrentSection();
    if (action === "assign-owner") return assignOwner(citizen, user);
    if (action === "toggle-archive") return toggleArchive(citizen, user);
    if (action === "adjust-risk") return adjustRisk(citizen, user);
    if (action.startsWith("open-domain:")) return openDomain(action.split(":")[1], citizen, user);
  }

  function saveCurrentSection() {
    if (!EDITABLE_TABS.has(activeTab)) {
      showMessage("The active section is read-only.", "error");
      return false;
    }
    saveSection(activeTab);
    return true;
  }

  function discardCurrentSection() {
    if (!EDITABLE_TABS.has(activeTab)) {
      showMessage("The active section is read-only.", "error");
      return false;
    }
    const citizen = getCitizen();
    const user = window.WS_APP.currentUser;
    if (!citizen || !canOpen(citizen, user)) return false;
    if (activeTab === "identity") renderIdentity(citizen, user);
    if (activeTab === "mechanics") renderMechanics(citizen, user);
    if (activeTab === "access") renderAccess(citizen, user);
    dirtySections.delete(activeTab);
    updateDirtyMarker();
    showMessage(`${formatTabLabel(activeTab)} changes discarded.`, "ok");
    return true;
  }

  function assignOwner(citizen, user) {
    if (!isAdminActor(user)) return;
    const select = getPanel("overview").querySelector("[data-admin-owner-select]");
    const ownerUserId = select?.value || "";
    const idempotencyKey = `citizen-admin-editor:owner:${citizen.id}:${Date.now()}`;
    const result = window.WS_APP.CitizenCommandAPI?.adminAssignCitizenOwner?.(citizen.id, {
      ownerUserId,
      reason: "Citizen owner assignment updated through Admin Citizen Editor.",
      source: "CITIZEN_ADMIN_EDITOR",
      idempotencyKey
    }, user);
    if (!result?.ok) {
      appendEditorAudit(user, citizen, {
        category: "ACCESS",
        action: "CITIZEN_OWNER_ASSIGNMENT_FAILED",
        summary: `Citizen owner assignment failed for ${citizen.id}.`,
        resultCode: result?.error?.code || "CITIZEN_OWNER_ASSIGNMENT_FAILED",
        status: "FAILED",
        idempotencyKey,
        section: "overview",
        meta: { ownerUserId }
      });
      return showMessage(`Owner update failed: ${result?.error?.code || "UNKNOWN"}.`, "error");
    }
    appendEditorAudit(user, citizen, {
      category: "ACCESS",
      action: "CITIZEN_OWNER_ASSIGNED",
      summary: `Citizen owner assignment updated for ${citizen.id}.`,
      resultCode: result?.operation || "CITIZEN_OWNER_ASSIGNED",
      status: "SUCCEEDED",
      idempotencyKey,
      section: "overview",
      nextRevision: result?.citizen?.revision ?? result?.citizen?.recordRevision ?? null,
      meta: { ownerUserId }
    });
    showMessage("Owner assignment saved.", "ok");
    refreshReadOnlyPanels(result.citizen);
  }

  function setFullEdit(citizen, enabled, checkbox) {
    const user = window.WS_APP.currentUser;
    const idempotencyKey = `citizen-admin-editor:full-edit:${citizen.id}:${enabled}:${Date.now()}`;
    const result = window.WS_APP.CitizenCommandAPI?.adminSetOwnerFullCardEdit?.(citizen.id, {
      enabled,
      reason: enabled
        ? "Admin allowed the assigned player to edit Citizen-owned card fields."
        : "Admin revoked delegated full card editing.",
      source: "CITIZEN_ADMIN_EDITOR",
      idempotencyKey
    }, user);
    if (!result?.ok) {
      checkbox.checked = !enabled;
      appendEditorAudit(user, citizen, {
        category: "ACCESS",
        action: "CITIZEN_OWNER_FULL_EDIT_FAILED",
        summary: `Owner full-card edit update failed for ${citizen.id}.`,
        resultCode: result?.error?.code || "CITIZEN_OWNER_FULL_EDIT_FAILED",
        status: "FAILED",
        idempotencyKey,
        section: "overview",
        meta: { enabled }
      });
      return showMessage(`Delegation update failed: ${result?.error?.code || "UNKNOWN"}.`, "error");
    }
    appendEditorAudit(user, citizen, {
      category: "ACCESS",
      action: enabled ? "CITIZEN_OWNER_FULL_EDIT_ENABLED" : "CITIZEN_OWNER_FULL_EDIT_DISABLED",
      summary: `Owner full-card edit ${enabled ? "enabled" : "disabled"} for ${citizen.id}.`,
      resultCode: result?.operation || "CITIZEN_OWNER_FULL_EDIT_UPDATED",
      status: "SUCCEEDED",
      idempotencyKey,
      section: "overview",
      nextRevision: result?.citizen?.revision ?? result?.citizen?.recordRevision ?? null,
      meta: { enabled }
    });
    showMessage(`Full card edit ${enabled ? "enabled" : "disabled"}.`, "ok");
    refreshReadOnlyPanels(result.citizen);
  }

  function toggleArchive(citizen, user) {
    if (!isAdminActor(user)) return;
    const archived = citizen.recordState === "ARCHIVED";
    if (!window.confirm(archived ? "Restore this Citizen record?" : "Archive this Citizen record?")) return;
    const input = {
      reason: archived ? "Restored through Admin Citizen Editor." : "Archived through Admin Citizen Editor.",
      source: "CITIZEN_ADMIN_EDITOR",
      idempotencyKey: `citizen-admin-editor:${archived ? "restore" : "archive"}:${citizen.id}:${Date.now()}`
    };
    const result = archived
      ? window.WS_APP.CitizenCommandAPI?.restoreCitizen?.(citizen.id, input, user)
      : window.WS_APP.CitizenCommandAPI?.archiveCitizen?.(citizen.id, input, user);
    if (!result?.ok) {
      appendEditorAudit(user, citizen, {
        category: "CITIZEN",
        action: archived ? "CITIZEN_RESTORE_FAILED" : "CITIZEN_ARCHIVE_FAILED",
        summary: `${archived ? "Restore" : "Archive"} failed for Citizen ${citizen.id}.`,
        resultCode: result?.error?.code || "CITIZEN_RECORD_ACTION_FAILED",
        status: "FAILED",
        idempotencyKey: input.idempotencyKey,
        section: "overview"
      });
      return showMessage(`Lifecycle update failed: ${result?.error?.code || "UNKNOWN"}.`, "error");
    }
    appendEditorAudit(user, citizen, {
      category: "CITIZEN",
      action: archived ? "CITIZEN_RESTORED" : "CITIZEN_ARCHIVED",
      summary: `Citizen ${citizen.id} ${archived ? "restored" : "archived"}.`,
      resultCode: result?.operation || (archived ? "RESTORE_CITIZEN" : "ARCHIVE_CITIZEN"),
      status: "SUCCEEDED",
      idempotencyKey: input.idempotencyKey,
      section: "overview",
      nextRevision: result?.citizen?.revision ?? result?.citizen?.recordRevision ?? null
    });
    closeCitizenAdminEditor({ force: true, restoreFocus: false });
    window.WS_APP.renderCitizenCardsModule?.(user);
  }

  function adjustRisk(citizen, user) {
    if (!isAdminActor(user)) return;
    const panel = getPanel("access");
    const value = clamp(panel.querySelector("[data-admin-risk-value]")?.value, 0, 100);
    const reason = String(panel.querySelector("[data-admin-risk-reason]")?.value || "").trim();
    if (!reason) return showMessage("Risk adjustment requires a reason.", "error");
    const idempotencyKey = `citizen-admin-editor:risk:${citizen.id}:${Date.now()}`;
    const updated = window.WS_APP.setCitizenRisk?.(citizen.id, value, {
      reason,
      createdBy: user.login || user.id || "admin"
    });
    if (!updated) {
      appendEditorAudit(user, citizen, {
        category: "RISK",
        action: "CITIZEN_RISK_UPDATE_FAILED",
        summary: `Risk update failed for Citizen ${citizen.id}.`,
        resultCode: "CITIZEN_RISK_UPDATE_FAILED",
        status: "FAILED",
        idempotencyKey,
        section: "access",
        meta: { value, reason }
      });
      return showMessage("Risk adjustment failed.", "error");
    }
    appendEditorAudit(user, citizen, {
      category: "RISK",
      action: "CITIZEN_RISK_UPDATED",
      summary: `Risk updated for Citizen ${citizen.id}.`,
      resultCode: "CITIZEN_RISK_UPDATED",
      status: "SUCCEEDED",
      idempotencyKey,
      section: "access",
      nextRevision: updated?.revision ?? updated?.recordRevision ?? null,
      meta: { value, reason }
    });
    showMessage("Risk updated.", "ok");
    refreshReadOnlyPanels(updated);
  }

  function openDomain(domain, citizen, user) {
    if (dirtySections.size && !window.confirm("Leave the editor with unsaved section changes?")) return;
    closeCitizenAdminEditor({ force: true, restoreFocus: false });
    window.WS_APP.currentCitizenCardsSelectedId = citizen.id;
    window.WS_APP.terminalTargetCitizenId = citizen.id;
    window.WS_APP.adminSelectedCitizenId = citizen.id;

    if (isAdminActor(user) && ["billing", "subscriptions", "service"].includes(domain)) {
      window.WS_APP.renderAdminControlCenter?.(user, domain);
      return;
    }

    const moduleMap = {
      billing: "terminal-hub",
      subscriptions: "subscriptions",
      service: "service",
      housing: "housing",
      equipment: "equipment",
      cyberware: "equipment"
    };
    const moduleId = moduleMap[domain];
    if (!moduleId) return;
    const options = domain === "billing"
      ? { skipLoader: true, citizenId: citizen.id, panel: "billing", section: "transactions" }
      : { skipLoader: true, citizenId: citizen.id };
    window.WS_APP.openModule?.(moduleId, user, options);
  }

  function refreshReadOnlyPanels(citizen) {
    if (!citizen) return;
    const user = window.WS_APP.currentUser;
    renderHeader(citizen, user);
    renderOverview(citizen, user);
    renderDomains(citizen, user);
    renderAudit(citizen, user);
    const riskValue = getPanel("access")?.querySelector("[data-admin-risk-value]");
    if (riskValue) riskValue.value = String(Number(citizen.risk || 0));
  }

  function markEventSectionDirty(event) {
    if (event.target.matches("[data-skill-filter]")) return;
    if (event.target.matches("[data-admin-full-edit-switch]")) {
      setFullEdit(getCitizen(), event.target.checked === true, event.target);
      return;
    }
    const form = event.target.closest("[data-editor-section-form]");
    if (!form) return;
    const section = form.dataset.editorSectionForm;
    if (section) dirtySections.add(section);
    updateDirtyMarker();
  }

  function bindIdentityLocalControls(panel, citizen) {
    const form = panel.querySelector("form");
    if (!form) return;
    const updatePreview = () => {
      const result = window.WS_APP.recalculateCitizenIdentityCodes?.({
        ...citizen,
        origin: form.elements.origin?.value || citizen.origin,
        birthDate: form.elements.birthDate?.value || citizen.birthDate,
        idNumber: citizen.idNumber,
        shortId: citizen.shortId
      }, { excludeCitizenId: citizen.id, validateUniqueness: false });
      const idPreview = form.querySelector("[data-citizen-id-preview]");
      const shortPreview = form.querySelector("[data-citizen-short-id-preview]");
      if (result?.ok) {
        if (idPreview) idPreview.value = result.idNumber;
        if (shortPreview) shortPreview.value = result.shortId;
      } else {
        if (idPreview) idPreview.value = "INVALID ID BASIS";
        if (shortPreview) shortPreview.value = "INVALID BIRTH DATE";
      }
    };
    form.elements.origin?.addEventListener("input", updatePreview);
    form.elements.birthDate?.addEventListener("input", updatePreview);
    updatePreview();
  }

  function bindMechanicsLocalControls(panel) {
    const filter = panel.querySelector("[data-skill-filter]");
    filter?.addEventListener("input", (event) => {
      const query = String(event.target.value || "").trim().toLowerCase();
      panel.querySelectorAll("[data-skill-row]").forEach((row) => {
        row.hidden = Boolean(query) && !String(row.dataset.skillSearch || "").includes(query);
      });
      panel.querySelectorAll("[data-skill-group]").forEach((group) => {
        group.hidden = !Array.from(group.querySelectorAll("[data-skill-row]")).some((row) => !row.hidden);
      });
    });
    panel.querySelectorAll("[data-skill-enabled]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const row = checkbox.closest("[data-skill-row]");
        row?.querySelectorAll("[data-mechanics-stepper] button, [data-skill-value]").forEach((control) => {
          control.disabled = !checkbox.checked;
        });
        row?.classList.toggle("is-enabled", checkbox.checked);
        syncMechanicsRow(row);
      });
    });
    panel.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mechanics-step]");
      if (!button || !panel.contains(button)) return;
      event.preventDefault();
      const stepper = button.closest("[data-mechanics-stepper]");
      const input = stepper?.querySelector("input[type=number]");
      if (!input || input.disabled) return;
      const min = Number(input.min || 0);
      const max = Number(input.max || 999);
      input.value = String(clamp(Number(input.value || 0) + Number(button.dataset.mechanicsStep || 0), min, max));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    panel.addEventListener("input", (event) => {
      const row = event.target.closest("[data-ability-card], [data-skill-row]");
      if (row) syncMechanicsRow(row);
    });
    panel.querySelectorAll("[data-ability-card], [data-skill-row]").forEach(syncMechanicsRow);
  }

  function syncMechanicsRow(row) {
    if (!row) return;
    if (row.matches("[data-ability-card]")) {
      const input = row.querySelector("[data-ability-natural]");
      const natural = clamp(input?.value, 0, Number(row.dataset.abilityMaxNatural || 7));
      const cyberware = clamp(row.dataset.abilityCyberware, 0, Number(row.dataset.abilityMaxCyberware || 8));
      if (input) input.value = String(natural);
      const total = row.querySelector("[data-ability-total]");
      if (total) total.textContent = String(natural + cyberware);
      const blocks = row.querySelector("[data-ability-blocks]");
      if (blocks) blocks.innerHTML = renderAbilityBlocks(natural, cyberware, Number(row.dataset.abilityMaxNatural || 7), Number(row.dataset.abilityMaxCyberware || 8));
      return;
    }
    const enabled = row.querySelector("[data-skill-enabled]")?.checked === true;
    const input = row.querySelector("[data-skill-value]");
    const max = Number(input?.max || 10);
    const level = clamp(input?.value, 1, max);
    if (input) input.value = String(level);
    row.classList.toggle("is-enabled", enabled);
    const blocks = row.querySelector("[data-skill-blocks]");
    if (blocks) blocks.innerHTML = renderRatingBlocks(enabled ? level : 0, max, "skill");
  }

  function activateTab(tab) {
    if (!TABS.includes(tab)) tab = "overview";
    activeTab = tab;
    const overlay = ensureShell();
    overlay.querySelectorAll("[data-admin-editor-tab]").forEach((button) => {
      const active = button.dataset.adminEditorTab === tab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });
    overlay.querySelectorAll("[data-admin-editor-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.adminEditorPanel === tab);
    });
    updatePersistentActions();
  }

  function closeCitizenAdminEditor(options = {}) {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay?.classList.contains("is-active")) return false;
    if (dirtySections.size && options.force !== true) {
      const confirmed = window.confirm("Discard unsaved Citizen card changes?");
      if (!confirmed) return false;
    }
    overlay.classList.remove("is-active");
    overlay.setAttribute("aria-hidden", "true");
    activeCitizenId = "";
    dirtySections = new Set();
    updateDirtyMarker();
    clearMessage(overlay);
    document.body.classList.remove("is-citizen-editor-open");
    if (options.restoreFocus !== false) utils().restoreTriggerFocus?.();
    return true;
  }

  function getPanel(name) {
    return ensureShell().querySelector(`[data-admin-editor-panel="${name}"]`);
  }

  function updateDirtyMarker() {
    const marker = document.getElementById(OVERLAY_ID)?.querySelector("[data-admin-editor-dirty]");
    if (!marker) return;
    marker.hidden = dirtySections.size === 0;
    marker.textContent = dirtySections.size ? `Unsaved: ${Array.from(dirtySections).join(", ")}` : "";
    updatePersistentActions();
  }

  function updatePersistentActions() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    const editable = EDITABLE_TABS.has(activeTab);
    const dirty = dirtySections.has(activeTab);
    const save = overlay.querySelector('[data-admin-editor-action="save-current"]');
    const discard = overlay.querySelector('[data-admin-editor-action="discard-current"]');
    if (save) {
      save.disabled = !editable || !dirty;
      save.textContent = editable ? `Save ${formatTabLabel(activeTab)}` : "Save Current";
    }
    if (discard) {
      discard.disabled = !editable || !dirty;
      discard.textContent = editable ? `Discard ${formatTabLabel(activeTab)}` : "Discard Changes";
    }
  }

  function showMessage(text, tone) {
    const node = ensureShell().querySelector("[data-admin-editor-message]");
    node.textContent = text;
    node.className = `citizen-editor-message is-visible ${tone === "error" ? "is-error" : "is-ok"}`;
  }

  function clearMessage(overlay = ensureShell()) {
    const node = overlay.querySelector("[data-admin-editor-message]");
    node.textContent = "";
    node.className = "citizen-editor-message";
  }

  function renderSectionHeader(title, description) {
    return `<header class="citizen-admin-panel-head"><div><p>Citizen Card Editor</p><h4>${escapeHtml(title)}</h4></div><small>${escapeHtml(description)}</small></header>`;
  }

  function renderSectionFooter(section, user) {
    return `<footer class="citizen-admin-section-foot"><span>Sectional save / ${isAdminActor(user) ? "Admin" : "Delegated owner"}</span><button class="citizen-editor-button is-primary" type="button" data-admin-editor-save="${section}">Save ${formatTabLabel(section)}</button></footer>`;
  }

  function renderFact(label, value) {
    return `<div class="citizen-admin-fact"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`;
  }

  function renderDomainCard(title, summary, domain) {
    return `<article class="citizen-admin-domain-card"><div><span>CANONICAL DOMAIN</span><h5>${escapeHtml(title)}</h5><p>${escapeHtml(summary)}</p></div><button class="citizen-editor-button" type="button" data-admin-editor-action="open-domain:${domain}">Open ${escapeHtml(title)}</button></article>`;
  }

  function renderAuditEntry(entry) {
    return `<article><header><b>${escapeHtml(entry.command || "CITIZEN_UPDATE")}</b><time>${escapeHtml(formatDate(entry.createdAt))}</time></header><p>${escapeHtml(entry.reason || "No operator note.")}</p><small>${escapeHtml(entry.actorLogin || entry.actorId || "UNKNOWN")} / rev ${escapeHtml(entry.metadata?.revision || "—")}</small></article>`;
  }

  function renderRiskEntry(entry) {
    return `<article><header><b>${escapeHtml(`${Number(entry.from || 0)}% → ${Number(entry.to || 0)}%`)}</b><time>${escapeHtml(entry.date || "—")}</time></header><p>${escapeHtml(entry.reason || "Risk adjustment")}</p><small>${escapeHtml(entry.createdBy || "SYSTEM")}</small></article>`;
  }

  function textField(name, label, value, type = "text", extraClass = "", readonly = false) {
    return `<label class="citizen-editor-field ${extraClass}"><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" ${readonly ? "readonly" : ""} /></label>`;
  }

  function textareaField(name, label, value, extraClass = "") {
    return `<label class="citizen-editor-field ${extraClass}"><span>${escapeHtml(label)}</span><textarea name="${escapeHtml(name)}">${escapeHtml(value)}</textarea></label>`;
  }

  function formatTabLabel(value) {
    return String(value || "").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function getCitizenName(citizen) {
    return window.WS_APP.getCitizenDisplayName?.(citizen, { legal: true, user: window.WS_APP.currentUser })
      || citizen.legalName
      || citizen.shortId
      || citizen.id;
  }

  function getOwnerOptions(selectedId = "") {
    const users = window.WS_APP.getUsers?.({ includeDisabled: true }) || window.APP_DATA?.users || [];
    return [`<option value="">UNASSIGNED</option>`, ...users
      .filter((user) => String(user.role || "").toLowerCase() === "citizen")
      .map((user) => `<option value="${escapeHtml(user.id)}" ${user.id === selectedId ? "selected" : ""}>${escapeHtml(user.login || user.displayName || user.id)}</option>`)
    ].join("");
  }

  function getAbilityDefinitionsForEditor(citizen) {
    const registered = window.WS_APP.getAbilityDefinitions?.({ includeArchived: false }) || [];
    const sourceRecord = (window.APP_DATA?.systemRecords || []).find((record) => record.id === "system-skills-abilities");
    const source = registered.length
      ? registered
      : (Array.isArray(sourceRecord?.definitions?.abilities) ? sourceRecord.definitions.abilities.filter((definition) => !definition.archived) : []);
    const byId = new Map(source.map((definition) => [definition.id, definition]));
    (Array.isArray(citizen?.abilities) ? citizen.abilities : []).forEach((entry) => {
      const id = entry.abilityId || entry.id || entry.label;
      if (!id || byId.has(id)) return;
      byId.set(id, {
        id,
        label: entry.label || id,
        category: entry.category || "LEGACY",
        description: entry.description || "Legacy Ability preserved from the Citizen record.",
        maxNatural: 7,
        maxCyberware: 8
      });
    });
    return Array.from(byId.values());
  }

  function getSkillDefinitionsForEditor(citizen) {
    const registered = window.WS_APP.getSkillDefinitions?.({ includeArchived: false }) || [];
    const sourceRecord = (window.APP_DATA?.systemRecords || []).find((record) => record.id === "system-skills-abilities");
    const source = registered.length
      ? registered
      : (Array.isArray(sourceRecord?.definitions?.skills) ? sourceRecord.definitions.skills.filter((definition) => !definition.archived) : []);
    const byId = new Map(source.map((definition) => [definition.id, definition]));
    (Array.isArray(citizen?.skills) ? citizen.skills : []).forEach((entry) => {
      const id = entry.skillId || entry.id || entry.label;
      if (!id || byId.has(id)) return;
      byId.set(id, {
        id,
        label: entry.label || id,
        category: entry.category || "LEGACY",
        description: entry.description || "Legacy Skill preserved from the Citizen record.",
        maxValue: 10
      });
    });
    return Array.from(byId.values());
  }

  function getCitizenBirthDateValue(citizen) {
    const explicit = String(citizen?.birthDate || "").trim();
    if (explicit) {
      const compact = explicit.replace(/[^0-9]/g, "");
      if (/^\d{8}$/.test(compact)) return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
      return explicit.slice(0, 10);
    }
    const parsed = window.WS_APP.parseCitizenIdNumber?.(citizen?.idNumber);
    const compact = String(parsed?.birthDate || "");
    return /^\d{8}$/.test(compact) ? `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}` : "";
  }

  function groupDefinitionsByCategory(definitions) {
    const groups = new Map();
    (definitions || []).forEach((definition) => {
      const category = String(definition.category || "GENERAL").trim().toUpperCase() || "GENERAL";
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(definition);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }

  function renderMechanicsStepper(type, value, min, max, attribute, disabled = false) {
    return `<span class="citizen-admin-rating-stepper" data-mechanics-stepper="${escapeHtml(type)}">
      <button type="button" data-mechanics-step="-1" aria-label="Decrease ${escapeHtml(type)}" ${disabled ? "disabled" : ""}>−</button>
      <input type="number" min="${Number(min)}" max="${Number(max)}" step="1" value="${clamp(value, min, max)}" ${attribute} ${disabled ? "disabled" : ""} />
      <button type="button" data-mechanics-step="1" aria-label="Increase ${escapeHtml(type)}" ${disabled ? "disabled" : ""}>+</button>
    </span>`;
  }

  function renderAbilityBlocks(natural, cyberware, maxNatural = 7, maxCyberware = 8) {
    const blocks = [];
    for (let index = 0; index < maxNatural; index += 1) {
      blocks.push(`<i class="citizen-rating-mini-block ${index < natural ? "is-filled is-natural" : "is-empty"}" aria-hidden="true"></i>`);
    }
    for (let index = 0; index < maxCyberware; index += 1) {
      blocks.push(`<i class="citizen-rating-mini-block ${index < cyberware ? "is-filled is-cyberware" : "is-empty is-cyberware-slot"}" aria-hidden="true"></i>`);
    }
    return blocks.join("");
  }

  function renderRatingBlocks(value, max = 10, tone = "skill") {
    return Array.from({ length: max }, (_, index) => `<i class="citizen-rating-mini-block ${index < value ? `is-filled is-${tone}` : "is-empty"}" aria-hidden="true"></i>`).join("");
  }

  function normalizeAbilityMap(value) {
    return new Map((Array.isArray(value) ? value : []).map((entry) => [entry.abilityId || entry.id || entry.label, entry]));
  }

  function normalizeSkillMap(value) {
    return new Map((Array.isArray(value) ? value : []).map((entry) => [entry.skillId || entry.id || entry.label, { ...entry, value: Number(entry.value ?? entry.level ?? entry.total ?? 1) } ]));
  }

  function badgesToText(value) {
    return (Array.isArray(value) ? value : []).slice(0, 6).map((badge) => [
      badge?.label || badge?.title || "Badge",
      badge?.shortLabel || badge?.code || "",
      badge?.description || badge?.details || ""
    ].join(" | ")).join("\n");
  }

  function parseBadges(value) {
    return String(value || "").split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 6).map((line, index) => {
      const [label, shortLabel, description] = line.split("|").map((part) => part.trim());
      return {
        id: `badge-${index + 1}`,
        label: label || `Badge ${index + 1}`,
        shortLabel: String(shortLabel || label || "B").slice(0, 4).toUpperCase(),
        description: description || ""
      };
    });
  }

  function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function formatCredits(value) {
    if (typeof window.WS_APP.formatCredits === "function") return window.WS_APP.formatCredits(value);
    const number = Number(String(value ?? 0).replace(/[^0-9.-]/g, "")) || 0;
    return `${Math.round(number).toLocaleString("pl-PL")} ₡`;
  }

  function formatDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return String(value || "—");
    return date.toISOString().replace("T", " ").slice(0, 16);
  }

  Object.assign(window.WS_APP, {
    openCitizenAdminEditor,
    closeCitizenAdminEditor
  });
})();
