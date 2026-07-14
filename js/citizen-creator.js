window.WS_APP = window.WS_APP || {};

(function initCitizenCreatorModule() {
  const config = window.APP_DATA?.citizenCreationConfig || {};
  const STEPS = Array.isArray(config.steps) && config.steps.length
    ? config.steps
    : [
        { id: "IDENTITY", label: "Identity" },
        { id: "ABILITIES", label: "Abilities" },
        { id: "SKILLS", label: "Skills" },
        { id: "BACKGROUND", label: "Background" },
        { id: "REVIEW", label: "Review" }
      ];

  const state = {
    citizenId: "",
    stepId: STEPS[0].id,
    saveTimer: 0,
    rendering: false,
    lastSavedRevision: 0
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeState(value) {
    return String(value || "DRAFT").trim().toUpperCase();
  }

  function getIdentity(citizen = {}) {
    return window.WS_APP.getCitizenIdentity?.(citizen) || citizen.identity || {
      firstName: citizen.firstName || "",
      middleName: citizen.middleName || "",
      surname: citizen.surname || "",
      pseudonym: citizen.pseudonym || ""
    };
  }

  function getDraftForUser(user = window.WS_APP.currentUser) {
    if (user?.role === "admin") {
      const targetId = String(window.WS_APP.citizenCreatorTargetId || state.citizenId || window.WS_APP.currentCitizenCardsSelectedId || "").trim();
      return targetId ? window.WS_APP.getCitizenById?.(targetId) || null : null;
    }
    return window.WS_APP.CitizenCommandAPI?.getUserCitizen?.(user)
      || window.WS_APP.getUserCitizen?.(user)
      || null;
  }

  function buildDefaultAbilities() {
    const min = Number(config.abilityNaturalMin ?? 0);
    return (window.WS_APP.getAbilityDefinitions?.() || []).map((definition) => ({
      abilityId: definition.id,
      label: definition.label,
      natural: Math.max(min, 1),
      cyberware: 0,
      cyberwareActive: true
    }));
  }

  function ensureCitizenDraft(user) {
    let citizen = getDraftForUser(user);
    if (citizen || user?.role !== "citizen") return citizen;
    const result = window.WS_APP.CitizenCommandAPI?.createCitizenDraft?.({
      abilities: buildDefaultAbilities(),
      reason: "Citizen created a character draft.",
      source: "CITIZEN_CREATOR",
      idempotencyKey: `citizen-creator:auto-create:${user.id}:${Date.now()}`
    }, user);
    citizen = result?.citizen || null;
    if (citizen) {
      state.citizenId = citizen.id;
      window.WS_APP.citizenCreatorTargetId = citizen.id;
    }
    return citizen;
  }

  function isEditable(citizen, user) {
    const recordState = normalizeState(citizen?.recordState);
    if (!citizen || !["DRAFT", "CHANGES_REQUESTED"].includes(recordState)) return false;
    if (user?.role === "admin") return true;
    return window.WS_APP.CitizenCommandAPI?.canEditCitizen?.(citizen.id, user) === true;
  }

  function getCreatorValidation(citizen = {}, draft = citizen) {
    const identityValidation = window.WS_APP.validateCitizenIdentity?.({
      ...citizen,
      ...draft,
      recordState: "READY_FOR_REVIEW"
    }, {
      requireComplete: true,
      excludeCitizenId: citizen.id
    }) || { ok: true, errors: [], warnings: [] };

    const abilityDefinitions = window.WS_APP.getAbilityDefinitions?.() || [];
    const abilityMap = new Map((draft.abilities || []).map((entry) => [entry.abilityId, entry]));
    const errors = [...(identityValidation.errors || [])];
    const warnings = [...(identityValidation.warnings || [])];
    if (config.requireAllAbilities !== false) {
      abilityDefinitions.forEach((definition) => {
        const entry = abilityMap.get(definition.id);
        const natural = Number(entry?.natural);
        if (!entry || !Number.isFinite(natural)) {
          errors.push({ field: definition.id, code: "ABILITY_VALUE_REQUIRED" });
          return;
        }
        if (natural < Number(config.abilityNaturalMin ?? 0) || natural > Number(definition.maxNatural ?? config.abilityNaturalMax ?? 7)) {
          errors.push({ field: definition.id, code: "ABILITY_VALUE_OUT_OF_RANGE" });
        }
      });
    }

    const skillDefinitions = new Map((window.WS_APP.getSkillDefinitions?.() || []).map((definition) => [definition.id, definition]));
    const seen = new Set();
    (draft.skills || []).forEach((entry) => {
      if (!skillDefinitions.has(entry.skillId)) errors.push({ field: entry.skillId || "skills", code: "UNKNOWN_SKILL" });
      if (seen.has(entry.skillId)) errors.push({ field: entry.skillId || "skills", code: "DUPLICATE_SKILL" });
      seen.add(entry.skillId);
      const value = Number(entry.value);
      if (!Number.isFinite(value) || value < Number(config.skillMin ?? 1) || value > Number(config.skillMax ?? 10)) {
        errors.push({ field: entry.skillId || "skills", code: "SKILL_VALUE_OUT_OF_RANGE" });
      }
    });

    return { ok: errors.length === 0, errors, warnings };
  }

  function renderModuleShell(user, citizen) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    if (!container) return;
    const recordState = normalizeState(citizen?.recordState);
    const editable = isEditable(citizen, user);
    state.citizenId = citizen?.id || "";
    state.lastSavedRevision = Number(citizen?.revision || 0);
    if (status) status.textContent = `CHARACTER CREATOR / ${recordState}`;

    if (!citizen) {
      container.innerHTML = `
        <article class="module-detail citizen-creator-view">
          <div class="module-detail-head">
            <div><p class="kicker">CITIZEN REGISTRATION</p><h4>Character Creator</h4></div>
            <button class="module-back-button" type="button">Back</button>
          </div>
          <section class="citizen-application-card">
            <p>No Citizen draft is selected.</p>
            ${user?.role === "admin" ? `<p>Open a DRAFT record from Citizen Cards.</p>` : `<p>The draft could not be created.</p>`}
          </section>
        </article>`;
      window.WS_APP.bindModuleBackButton?.(user);
      return;
    }

    const validation = getCreatorValidation(citizen);
    container.innerHTML = `
      <article class="module-detail citizen-creator-view" data-citizen-id="${escapeHtml(citizen.id)}">
        <div class="module-detail-head">
          <div>
            <p class="kicker">CITIZEN REGISTRATION / ${escapeHtml(recordState)}</p>
            <h4>Character Creator</h4>
          </div>
          <button class="module-back-button" type="button">Back</button>
        </div>

        ${recordState === "CHANGES_REQUESTED" && citizen.reviewNote ? `<p class="citizen-application-note"><strong>ADMIN REVIEW:</strong> ${escapeHtml(citizen.reviewNote)}</p>` : ""}
        ${recordState === "REJECTED" && citizen.reviewNote ? `<p class="citizen-application-note"><strong>APPLICATION REJECTED:</strong> ${escapeHtml(citizen.reviewNote)}</p>` : ""}

        <div class="citizen-creator-shell">
          <nav class="citizen-creator-steps" aria-label="Character creator steps">
            ${STEPS.map((step) => renderStepButton(step, citizen)).join("")}
          </nav>

          <form class="citizen-creator-stage" id="citizen-creator-form" autocomplete="off">
            <header class="citizen-creator-stage-head">
              <div>
                <p class="kicker">${escapeHtml(state.stepId)}</p>
                <h5>${escapeHtml(STEPS.find((step) => step.id === state.stepId)?.label || state.stepId)}</h5>
              </div>
              <span class="citizen-creator-save-state ${editable ? "" : "is-saved"}" data-creator-save-state>${editable ? "SAVED" : `READ ONLY / ${escapeHtml(recordState)}`}</span>
            </header>
            ${renderCurrentStep(citizen, user, editable, validation)}
            ${renderCreatorFooter(citizen, user, editable, validation)}
          </form>

          ${renderLiveSummary(citizen, validation)}
        </div>
      </article>`;

    bindCreatorActions(user, citizen, editable);
    window.WS_APP.bindModuleBackButton?.(user);
    window.requestAnimationFrame?.(() => {
      container.querySelector(`[data-creator-step="${state.stepId}"]`)?.focus();
    });
  }

  function renderStepButton(step, citizen) {
    const complete = isStepComplete(step.id, citizen);
    return `<button class="citizen-creator-step ${state.stepId === step.id ? "is-active" : ""} ${complete ? "is-complete" : ""}" type="button" data-creator-step="${escapeHtml(step.id)}">${escapeHtml(step.label)}</button>`;
  }

  function isStepComplete(stepId, citizen) {
    const identity = getIdentity(citizen);
    if (stepId === "IDENTITY") return Boolean(identity.firstName || identity.surname || identity.pseudonym) && Boolean(citizen.birthDate && citizen.origin);
    if (stepId === "ABILITIES") return (citizen.abilities || []).length >= (window.WS_APP.getAbilityDefinitions?.() || []).length;
    if (stepId === "SKILLS") return true;
    if (stepId === "BACKGROUND") return Boolean(citizen.appearance || citizen.playerNote || citizen.portrait);
    if (stepId === "REVIEW") return getCreatorValidation(citizen).ok;
    return false;
  }

  function renderCurrentStep(citizen, user, editable, validation) {
    if (state.stepId === "IDENTITY") return renderIdentityStep(citizen, user, editable);
    if (state.stepId === "ABILITIES") return renderAbilitiesStep(citizen, editable);
    if (state.stepId === "SKILLS") return renderSkillsStep(citizen, editable);
    if (state.stepId === "BACKGROUND") return renderBackgroundStep(citizen, editable);
    return renderReviewStep(citizen, user, validation);
  }

  function renderIdentityStep(citizen, user, editable) {
    const identity = getIdentity(citizen);
    const disabled = editable ? "" : "disabled";
    const ownerUsers = (window.WS_APP.getUsers?.({ includeDisabled: true }) || window.APP_DATA?.users || [])
      .filter((entry) => entry.role === "citizen");
    return `
      <div class="citizen-creator-form-grid">
        <label class="citizen-creator-field"><span>First Name</span><input name="firstName" value="${escapeHtml(identity.firstName || "")}" ${disabled}></label>
        <label class="citizen-creator-field"><span>Middle Name</span><input name="middleName" value="${escapeHtml(identity.middleName || "")}" ${disabled}></label>
        <label class="citizen-creator-field"><span>Surname</span><input name="surname" value="${escapeHtml(identity.surname || "")}" ${disabled}></label>
        <label class="citizen-creator-field"><span>Pseudonym</span><input name="pseudonym" value="${escapeHtml(identity.pseudonym || "")}" ${disabled}></label>
        <label class="citizen-creator-field"><span>Biological Profile</span><select name="biologicalProfile" ${disabled}>${(config.biologicalProfiles || ["ALPHA", "BETA", "GAMMA", "UNCLASSIFIED"]).map((profile) => `<option value="${escapeHtml(profile)}" ${profile === citizen.biologicalProfile ? "selected" : ""}>${escapeHtml(profile)}</option>`).join("")}</select></label>
        <label class="citizen-creator-field"><span>Origin</span><select name="origin" ${disabled}>${(config.origins || []).map((origin) => `<option value="${escapeHtml(origin)}" ${origin === citizen.origin ? "selected" : ""}>${escapeHtml(origin)}</option>`).join("")}</select></label>
        <label class="citizen-creator-field"><span>Birth Date</span><input type="date" name="birthDate" value="${escapeHtml(toDateInput(citizen.birthDate))}" ${disabled}></label>
        <label class="citizen-creator-field"><span>Portrait Path</span><input name="portrait" value="${escapeHtml(citizen.portrait || "")}" ${disabled}></label>
        ${user?.role === "admin" ? `
          <label class="citizen-creator-field is-wide"><span>Owner Account</span><select name="ownerUserId" ${editable ? "" : "disabled"}>
            <option value="">UNASSIGNED</option>
            ${ownerUsers.map((entry) => `<option value="${escapeHtml(entry.id)}" ${entry.id === citizen.ownerUserId ? "selected" : ""}>${escapeHtml(entry.login || entry.displayName || entry.id)}</option>`).join("")}
          </select></label>` : ""}
      </div>`;
  }

  function renderAbilitiesStep(citizen, editable) {
    const existing = new Map((citizen.abilities || []).map((entry) => [entry.abilityId, entry]));
    const disabled = editable ? "" : "disabled";
    const characterType = String(citizen.characterType || "PLAYER").toUpperCase();
    const templates = window.WS_APP.getCitizenTemplates?.({ characterType }) || [];
    const presets = window.WS_APP.getCitizenCompetencePresets?.() || [];
    return `
      <section class="citizen-creator-template-panel">
        <div>
          <p class="kicker">OPTIONAL TEMPLATE</p>
          <strong>Apply a pre-alpha role profile</strong>
          <small>Templates replace Natural Abilities and selected Skills. Manual editing remains available.</small>
        </div>
        <label class="citizen-creator-field"><span>Template</span><select data-creator-template ${disabled}>${templates.map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.label)}</option>`).join("")}</select></label>
        <label class="citizen-creator-field"><span>Competence</span><select data-creator-template-competence ${disabled}>${presets.map((preset) => `<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.label)}</option>`).join("")}</select></label>
        <button class="citizen-creator-action" type="button" data-creator-apply-template ${editable && templates.length ? "" : "disabled"}>Apply Template</button>
      </section>
      <p>FREEFORM pre-alpha values. Natural Ability range: ${escapeHtml(config.abilityNaturalMin ?? 0)}–${escapeHtml(config.abilityNaturalMax ?? 7)}.</p>
      <div class="citizen-creator-ability-list">
        ${(window.WS_APP.getAbilityDefinitions?.() || []).map((definition) => {
          const entry = existing.get(definition.id) || { natural: 1 };
          return `<label class="citizen-creator-ability-row">
            <strong>${escapeHtml(definition.label)}</strong>
            <span>${escapeHtml(definition.description || definition.category || "")}</span>
            <input type="number" name="ability:${escapeHtml(definition.id)}" min="${escapeHtml(config.abilityNaturalMin ?? 0)}" max="${escapeHtml(definition.maxNatural ?? config.abilityNaturalMax ?? 7)}" value="${escapeHtml(entry.natural ?? 1)}" ${disabled}>
          </label>`;
        }).join("")}
      </div>`;
  }

  function renderSkillsStep(citizen, editable) {
    const selected = new Map((citizen.skills || []).map((entry) => [entry.skillId, entry]));
    const disabled = editable ? "" : "disabled";
    return `
      <label class="citizen-creator-field is-wide"><span>Search Skills</span><input class="citizen-creator-skill-search" type="search" data-creator-skill-search placeholder="Name / category"></label>
      <div class="citizen-creator-skill-list" data-creator-skill-list>
        ${(window.WS_APP.getSkillDefinitions?.() || []).map((definition) => {
          const entry = selected.get(definition.id);
          return `<label class="citizen-creator-skill-row" data-creator-skill-row data-search="${escapeHtml(`${definition.label} ${definition.category} ${definition.description}`.toLowerCase())}">
            <input type="checkbox" name="skill-selected:${escapeHtml(definition.id)}" ${entry ? "checked" : ""} ${disabled}>
            <strong>${escapeHtml(definition.label)}</strong>
            <span>${escapeHtml(definition.description || definition.category || "")}</span>
            <input type="number" name="skill-value:${escapeHtml(definition.id)}" min="${escapeHtml(config.skillMin ?? 1)}" max="${escapeHtml(definition.maxValue ?? config.skillMax ?? 10)}" value="${escapeHtml(entry?.value ?? 1)}" ${entry && editable ? "" : "disabled"}>
          </label>`;
        }).join("")}
      </div>`;
  }

  function renderBackgroundStep(citizen, editable) {
    const disabled = editable ? "" : "disabled";
    return `
      <div class="citizen-creator-form-grid">
        <label class="citizen-creator-field is-wide"><span>Appearance</span><textarea name="appearance" ${disabled}>${escapeHtml(citizen.appearance || "")}</textarea></label>
        <label class="citizen-creator-field is-wide"><span>Character Concept / Player Note</span><textarea name="playerNote" ${disabled}>${escapeHtml(citizen.playerNote || "")}</textarea></label>
      </div>
      <p>Equipment, Cyberware, Housing, Billing, Service and Subscriptions are configured through their canonical modules after activation.</p>`;
  }

  function renderReviewStep(citizen, user, validation) {
    const identity = getIdentity(citizen);
    return `
      <div class="citizen-creator-review-list">
        ${reviewRow("Identity", [identity.firstName, identity.middleName, identity.surname].filter(Boolean).join(" ") || identity.pseudonym || "UNSET")}
        ${reviewRow("Pseudonym", identity.pseudonym || "—")}
        ${reviewRow("Profile", citizen.biologicalProfile || "UNCLASSIFIED")}
        ${reviewRow("Origin", citizen.origin || "—")}
        ${reviewRow("Birth Date", citizen.birthDate || "—")}
        ${reviewRow("Abilities", String((citizen.abilities || []).length))}
        ${reviewRow("Skills", String((citizen.skills || []).length))}
        ${reviewRow("Owner", citizen.ownerUserId || "UNASSIGNED")}
      </div>
      ${renderValidation(validation)}
      ${user?.role === "admin" ? renderAdminReviewActions(citizen, validation) : ""}`;
  }

  function reviewRow(label, value) {
    return `<div class="citizen-creator-review-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span><i></i></div>`;
  }

  function renderValidation(validation) {
    if (validation.ok) return `<div class="citizen-creator-validation is-ok"><strong>VALIDATION PASSED</strong><p>Draft is ready for submission or activation.</p></div>`;
    return `<div class="citizen-creator-validation is-error"><strong>VALIDATION FAILED</strong><ul>${validation.errors.map((error) => `<li>${escapeHtml(error.field || "record")} / ${escapeHtml(error.code || "INVALID")}</li>`).join("")}</ul></div>`;
  }

  function renderAdminReviewActions(citizen, validation) {
    const recordState = normalizeState(citizen.recordState);
    if (!["DRAFT", "CHANGES_REQUESTED", "READY_FOR_REVIEW"].includes(recordState)) return "";
    return `
      <div class="citizen-application-actions" data-admin-review-actions>
        <button class="citizen-application-action is-primary" type="button" data-creator-admin-action="ACCEPT" ${validation.ok ? "" : "disabled"}>Accept / Activate</button>
        <button class="citizen-application-action" type="button" data-creator-admin-action="REQUEST_CHANGES" ${recordState === "READY_FOR_REVIEW" ? "" : "disabled"}>Request Changes</button>
        <button class="citizen-application-action is-danger" type="button" data-creator-admin-action="REJECT">Reject</button>
      </div>`;
  }

  function renderCreatorFooter(citizen, user, editable, validation) {
    const index = Math.max(0, STEPS.findIndex((step) => step.id === state.stepId));
    const recordState = normalizeState(citizen.recordState);
    return `
      <footer class="citizen-creator-footer">
        <div>
          <button class="citizen-creator-action" type="button" data-creator-nav="PREV" ${index === 0 ? "disabled" : ""}>Previous</button>
          <button class="citizen-creator-action" type="button" data-creator-nav="NEXT" ${index >= STEPS.length - 1 ? "disabled" : ""}>Next</button>
        </div>
        <small class="citizen-creator-shortcuts">Alt+1–5 steps / Alt+←→ navigate / Ctrl+S save</small>
        <div>
          ${editable ? `<button class="citizen-creator-action" type="button" data-creator-save>Save Draft</button>` : ""}
          ${editable && user?.role === "citizen" ? `<button class="citizen-creator-action is-primary" type="button" data-creator-submit ${validation.ok ? "" : "disabled"}>Submit for Review</button>` : ""}
          ${recordState === "READY_FOR_REVIEW" && user?.role === "citizen" ? `<button class="citizen-creator-action" type="button" data-open-application-status>Application Status</button>` : ""}
        </div>
      </footer>`;
  }

  function renderLiveSummary(citizen, validation) {
    const identity = getIdentity(citizen);
    return `
      <aside class="citizen-creator-summary">
        <p class="kicker">LIVE SUMMARY</p>
        <h5>${escapeHtml(identity.pseudonym || [identity.firstName, identity.surname].filter(Boolean).join(" ") || "NEW CITIZEN")}</h5>
        <dl>
          <dt>State</dt><dd>${escapeHtml(citizen.recordState || "DRAFT")}</dd>
          <dt>Profile</dt><dd>${escapeHtml(citizen.biologicalProfile || "UNCLASSIFIED")}</dd>
          <dt>Origin</dt><dd>${escapeHtml(citizen.origin || "—")}</dd>
          <dt>Abilities</dt><dd>${escapeHtml((citizen.abilities || []).length)}</dd>
          <dt>Skills</dt><dd>${escapeHtml((citizen.skills || []).length)}</dd>
          <dt>Revision</dt><dd>${escapeHtml(citizen.revision || 1)}</dd>
        </dl>
        ${validation.ok ? `<p class="citizen-creator-validation is-ok">READY FOR REVIEW</p>` : `<p class="citizen-creator-validation is-error">${escapeHtml(validation.errors.length)} VALIDATION ISSUE(S)</p>`}
      </aside>`;
  }

  function collectDraftPatch(form, citizen) {
    const identity = getIdentity(citizen);
    const patch = {
      identity: {
        ...identity,
        firstName: String(form.elements.firstName?.value ?? identity.firstName ?? "").trim(),
        middleName: String(form.elements.middleName?.value ?? identity.middleName ?? "").trim(),
        surname: String(form.elements.surname?.value ?? identity.surname ?? "").trim(),
        pseudonym: String(form.elements.pseudonym?.value ?? identity.pseudonym ?? "").trim()
      },
      biologicalProfile: String(form.elements.biologicalProfile?.value || citizen.biologicalProfile || "GAMMA").trim().toUpperCase(),
      profile: String(form.elements.biologicalProfile?.value || citizen.biologicalProfile || "GAMMA").trim().toUpperCase(),
      origin: String(form.elements.origin?.value || citizen.origin || "NE3:51.00").trim(),
      birthDate: fromDateInput(form.elements.birthDate?.value || citizen.birthDate || ""),
      portrait: String(form.elements.portrait?.value ?? citizen.portrait ?? "").trim(),
      appearance: String(form.elements.appearance?.value ?? citizen.appearance ?? "").trim(),
      playerNote: String(form.elements.playerNote?.value ?? citizen.playerNote ?? "").trim()
    };

    const abilityDefinitions = window.WS_APP.getAbilityDefinitions?.() || [];
    const currentAbilities = new Map((citizen.abilities || []).map((entry) => [entry.abilityId, entry]));
    patch.abilities = abilityDefinitions.map((definition) => {
      const input = form.elements[`ability:${definition.id}`];
      const current = currentAbilities.get(definition.id) || {};
      return {
        abilityId: definition.id,
        label: definition.label,
        natural: clampNumber(input?.value ?? current.natural ?? 1, Number(config.abilityNaturalMin ?? 0), Number(definition.maxNatural ?? config.abilityNaturalMax ?? 7)),
        cyberware: Number(current.cyberware || 0),
        cyberwareActive: current.cyberwareActive !== false
      };
    });

    const currentSkills = new Map((citizen.skills || []).map((entry) => [entry.skillId, entry]));
    patch.skills = (window.WS_APP.getSkillDefinitions?.() || []).flatMap((definition) => {
      const selected = form.elements[`skill-selected:${definition.id}`];
      if (!selected?.checked && !currentSkills.has(definition.id)) return [];
      if (selected && !selected.checked) return [];
      const valueField = form.elements[`skill-value:${definition.id}`];
      return [{
        skillId: definition.id,
        label: definition.label,
        value: clampNumber(valueField?.value ?? currentSkills.get(definition.id)?.value ?? 1, Number(config.skillMin ?? 1), Number(definition.maxValue ?? config.skillMax ?? 10))
      }];
    });
    return patch;
  }

  function saveDraft(user, citizen, options = {}) {
    const form = document.querySelector("#citizen-creator-form");
    if (!form || !isEditable(citizen, user)) return { ok: false, error: { code: "DRAFT_NOT_EDITABLE" } };
    setSaveState("SAVING", "is-saving");
    const patch = collectDraftPatch(form, citizen);

    if (user?.role === "admin" && form.elements.ownerUserId && String(form.elements.ownerUserId.value || "") !== String(citizen.ownerUserId || "")) {
      const ownerResult = window.WS_APP.CitizenCommandAPI?.adminAssignCitizenOwner?.(citizen.id, {
        ownerUserId: String(form.elements.ownerUserId.value || ""),
        reason: "Owner account assigned through Character Creator.",
        source: "CITIZEN_CREATOR",
        idempotencyKey: `citizen-creator:owner:${citizen.id}:${Date.now()}`
      }, user);
      if (!ownerResult?.ok) {
        setSaveState(ownerResult?.error?.code || "OWNER SAVE FAILED", "is-error");
        return ownerResult;
      }
      citizen = ownerResult.citizen;
    }

    const result = window.WS_APP.CitizenCommandAPI?.updateCitizenDraft?.(citizen.id, {
      patch,
      reason: user?.role === "admin" ? "Draft updated by Admin through Character Creator." : "Draft updated by owner through Character Creator.",
      source: "CITIZEN_CREATOR",
      idempotencyKey: `citizen-creator:save:${citizen.id}:${Date.now()}`
    }, user);
    if (!result?.ok) {
      setSaveState(result?.error?.code || "SAVE FAILED", "is-error");
      return result;
    }
    state.lastSavedRevision = Number(result.citizen?.revision || 0);
    setSaveState("SAVED", "is-saved");
    if (options.rerender === true) renderModuleShell(user, result.citizen);
    return result;
  }

  function setSaveState(text, className = "") {
    const node = document.querySelector("[data-creator-save-state]");
    if (!node) return;
    node.className = `citizen-creator-save-state ${className}`.trim();
    node.textContent = text;
  }

  function scheduleAutosave(user, citizen) {
    if (!isEditable(citizen, user)) return;
    window.clearTimeout(state.saveTimer);
    setSaveState("UNSAVED", "is-saving");
    state.saveTimer = window.setTimeout(() => {
      const latest = window.WS_APP.getCitizenById?.(citizen.id) || citizen;
      saveDraft(user, latest);
    }, 650);
  }

  function bindCreatorActions(user, citizen, editable) {
    const form = document.querySelector("#citizen-creator-form");
    const shortcutRoot = document.querySelector(".citizen-creator-view");
    document.querySelectorAll("[data-creator-step]").forEach((button) => {
      button.addEventListener("click", () => {
        if (editable) saveDraft(user, window.WS_APP.getCitizenById?.(citizen.id) || citizen);
        state.stepId = button.dataset.creatorStep || STEPS[0].id;
        renderModuleShell(user, window.WS_APP.getCitizenById?.(citizen.id) || citizen);
      });
    });

    form?.addEventListener("input", (event) => {
      if (event.target.matches("[data-creator-skill-search]")) {
        filterSkills(event.target.value);
        return;
      }
      if (event.target.name?.startsWith("skill-selected:")) {
        const skillId = event.target.name.split(":")[1];
        const valueField = form.elements[`skill-value:${skillId}`];
        if (valueField) valueField.disabled = !event.target.checked || !editable;
      }
      scheduleAutosave(user, window.WS_APP.getCitizenById?.(citizen.id) || citizen);
    });
    form?.addEventListener("change", () => scheduleAutosave(user, window.WS_APP.getCitizenById?.(citizen.id) || citizen));
    form?.addEventListener("submit", (event) => event.preventDefault());
    shortcutRoot?.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === "s") {
        event.preventDefault();
        if (editable) saveDraft(user, window.WS_APP.getCitizenById?.(citizen.id) || citizen, { rerender: true });
        return;
      }
      if (event.altKey && /^[1-5]$/.test(event.key)) {
        event.preventDefault();
        const next = STEPS[Number(event.key) - 1];
        if (!next) return;
        if (editable) saveDraft(user, window.WS_APP.getCitizenById?.(citizen.id) || citizen);
        state.stepId = next.id;
        renderModuleShell(user, window.WS_APP.getCitizenById?.(citizen.id) || citizen);
        return;
      }
      if (event.altKey && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        const index = STEPS.findIndex((step) => step.id === state.stepId);
        const delta = event.key === "ArrowRight" ? 1 : -1;
        const next = STEPS[Math.max(0, Math.min(STEPS.length - 1, index + delta))];
        if (!next || next.id === state.stepId) return;
        if (editable) saveDraft(user, window.WS_APP.getCitizenById?.(citizen.id) || citizen);
        state.stepId = next.id;
        renderModuleShell(user, window.WS_APP.getCitizenById?.(citizen.id) || citizen);
      }
    });

    document.querySelector("[data-creator-apply-template]")?.addEventListener("click", () => {
      const templateId = document.querySelector("[data-creator-template]")?.value || "";
      const competencePresetId = document.querySelector("[data-creator-template-competence]")?.value || "STANDARD";
      const built = window.WS_APP.buildCitizenTemplatePatch?.(templateId, {
        characterType: String(citizen.characterType || "PLAYER").toUpperCase(),
        competencePresetId
      });
      if (!built?.ok) {
        setSaveState(built?.error?.code || "TEMPLATE FAILED", "is-error");
        return;
      }
      const result = window.WS_APP.CitizenCommandAPI?.updateCitizenDraft?.(citizen.id, {
        patch: built.patch,
        reason: `Applied Citizen template: ${built.template.label} / ${built.preset.label}.`,
        source: "CITIZEN_CREATOR_TEMPLATE",
        idempotencyKey: `citizen-creator:template:${citizen.id}:${templateId}:${Date.now()}`
      }, user);
      if (!result?.ok) {
        setSaveState(result?.error?.code || "TEMPLATE SAVE FAILED", "is-error");
        return;
      }
      state.stepId = "ABILITIES";
      renderModuleShell(user, result.citizen);
    });

    document.querySelectorAll("[data-creator-nav]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = STEPS.findIndex((step) => step.id === state.stepId);
        const delta = button.dataset.creatorNav === "NEXT" ? 1 : -1;
        const next = STEPS[Math.max(0, Math.min(STEPS.length - 1, index + delta))];
        if (!next) return;
        if (editable) saveDraft(user, window.WS_APP.getCitizenById?.(citizen.id) || citizen);
        state.stepId = next.id;
        renderModuleShell(user, window.WS_APP.getCitizenById?.(citizen.id) || citizen);
      });
    });

    document.querySelector("[data-creator-save]")?.addEventListener("click", () => saveDraft(user, window.WS_APP.getCitizenById?.(citizen.id) || citizen, { rerender: true }));
    document.querySelector("[data-creator-submit]")?.addEventListener("click", () => {
      const saved = saveDraft(user, window.WS_APP.getCitizenById?.(citizen.id) || citizen);
      if (!saved?.ok) return;
      const latest = saved.citizen;
      const validation = getCreatorValidation(latest);
      if (!validation.ok) {
        state.stepId = "REVIEW";
        renderModuleShell(user, latest);
        return;
      }
      const result = window.WS_APP.CitizenCommandAPI?.submitCitizenDraft?.(latest.id, {
        reason: "Character submitted for Admin review.",
        source: "CITIZEN_CREATOR",
        idempotencyKey: `citizen-creator:submit:${latest.id}:${Date.now()}`
      }, user);
      if (!result?.ok) {
        setSaveState(result?.error?.code || "SUBMIT FAILED", "is-error");
        return;
      }
      window.WS_APP.openModule?.("application-status", user, { skipLoader: true });
    });

    document.querySelector("[data-open-application-status]")?.addEventListener("click", () => window.WS_APP.openModule?.("application-status", user, { skipLoader: true }));
    document.querySelectorAll("[data-creator-admin-action]").forEach((button) => {
      button.addEventListener("click", () => handleAdminReviewAction(button.dataset.creatorAdminAction, user, window.WS_APP.getCitizenById?.(citizen.id) || citizen));
    });
  }

  function handleAdminReviewAction(action, user, citizen) {
    if (user?.role !== "admin") return;
    if (action === "ACCEPT") {
      const result = window.WS_APP.CitizenCommandAPI?.activateCitizenDraft?.(citizen.id, {
        reason: "Character application accepted by Admin.",
        source: "CITIZEN_CREATOR",
        idempotencyKey: `citizen-creator:accept:${citizen.id}:${Date.now()}`
      }, user);
      if (result?.ok) {
        window.clearTimeout(state.saveTimer);
        window.WS_APP.citizenCreatorTargetId = "";
        window.WS_APP.beginModuleNavigation?.();
        window.WS_APP.currentModuleId = "citizen-cards";
        window.WS_APP.renderCitizenCardModule?.(user, "CITIZEN CARDS", result.citizen.id, { returnTarget: "citizen-cards" });
      } else setSaveState(result?.error?.code || "ACCEPT FAILED", "is-error");
      return;
    }

    const reason = window.prompt(action === "REQUEST_CHANGES" ? "Required changes:" : "Reason for rejection:", "");
    if (!String(reason || "").trim()) return;
    const command = action === "REQUEST_CHANGES"
      ? window.WS_APP.CitizenCommandAPI?.requestCitizenChanges
      : window.WS_APP.CitizenCommandAPI?.rejectCitizenDraft;
    const result = command?.(citizen.id, {
      reason: String(reason).trim(),
      source: "CITIZEN_CREATOR",
      idempotencyKey: `citizen-creator:${action.toLowerCase()}:${citizen.id}:${Date.now()}`
    }, user);
    if (!result?.ok) {
      setSaveState(result?.error?.code || `${action} FAILED`, "is-error");
      return;
    }
    renderModuleShell(user, result.citizen);
  }

  function filterSkills(value) {
    const query = String(value || "").trim().toLowerCase();
    document.querySelectorAll("[data-creator-skill-row]").forEach((row) => {
      row.hidden = Boolean(query) && !String(row.dataset.search || "").includes(query);
    });
  }

  function renderApplicationStatusModule(user) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    const citizen = getDraftForUser(user);
    if (!container) return;
    if (status) status.textContent = "CHARACTER APPLICATION / STATUS";
    if (!citizen) {
      container.innerHTML = `<article class="module-detail"><div class="module-detail-head"><div><p class="kicker">CITIZEN REGISTRATION</p><h4>Application Status</h4></div><button class="module-back-button" type="button">Back</button></div><section class="citizen-application-card"><p>No character application exists.</p><button class="citizen-application-action is-primary" type="button" data-status-open-creator>Create Character</button></section></article>`;
      document.querySelector("[data-status-open-creator]")?.addEventListener("click", () => window.WS_APP.openModule?.("character-creator", user, { skipLoader: true }));
      window.WS_APP.bindModuleBackButton?.(user);
      return;
    }
    const identity = getIdentity(citizen);
    const recordState = normalizeState(citizen.recordState);
    container.innerHTML = `
      <article class="module-detail">
        <div class="module-detail-head"><div><p class="kicker">CITIZEN REGISTRATION</p><h4>Application Status</h4></div><button class="module-back-button" type="button">Back</button></div>
        <section class="citizen-application-card" data-citizen-id="${escapeHtml(citizen.id)}">
          <h5>${escapeHtml(identity.pseudonym || [identity.firstName, identity.surname].filter(Boolean).join(" ") || "NEW CITIZEN")}</h5>
          <dl>
            <dt>State</dt><dd>${escapeHtml(recordState)}</dd>
            <dt>Submitted</dt><dd>${escapeHtml(citizen.submittedAt || "—")}</dd>
            <dt>Revision</dt><dd>${escapeHtml(citizen.revision || 1)}</dd>
            <dt>Profile</dt><dd>${escapeHtml(citizen.biologicalProfile || "UNCLASSIFIED")}</dd>
          </dl>
          ${citizen.reviewNote ? `<p class="citizen-application-note">${escapeHtml(citizen.reviewNote)}</p>` : ""}
          <div class="citizen-application-actions">
            ${["DRAFT", "CHANGES_REQUESTED"].includes(recordState) ? `<button class="citizen-application-action is-primary" type="button" data-status-open-creator>Continue Creation</button>` : ""}
            ${recordState === "READY_FOR_REVIEW" ? `<button class="citizen-application-action" type="button" data-status-open-creator>View Submitted Character</button>` : ""}
          </div>
        </section>
      </article>`;
    document.querySelector("[data-status-open-creator]")?.addEventListener("click", () => window.WS_APP.openModule?.("character-creator", user, { skipLoader: true }));
    window.WS_APP.bindModuleBackButton?.(user);
  }

  function openCitizenCreator(citizenId = "") {
    if (citizenId) window.WS_APP.citizenCreatorTargetId = String(citizenId);
    state.citizenId = String(citizenId || state.citizenId || "");
    state.stepId = STEPS[0].id;
    window.WS_APP.openModule?.("character-creator", window.WS_APP.currentUser, { skipLoader: true });
  }

  function renderCitizenCreatorModule(user = window.WS_APP.currentUser) {
    if (state.rendering) return;
    state.rendering = true;
    try {
      const citizen = ensureCitizenDraft(user);
      renderModuleShell(user, citizen);
    } finally {
      state.rendering = false;
    }
  }

  function clampNumber(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function toDateInput(value) {
    const compact = String(value || "").replace(/[^0-9]/g, "");
    if (!/^\d{8}$/.test(compact)) return "";
    return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  }

  function fromDateInput(value) {
    return String(value || "").replace(/[^0-9]/g, "").slice(0, 8);
  }

  Object.assign(window.WS_APP, {
    renderCitizenCreatorModule,
    renderApplicationStatusModule,
    openCitizenCreator,
    getCitizenCreatorValidation: getCreatorValidation
  });
})();
