window.WS_APP = window.WS_APP || {};

(function initCitizenQuickNpcModule() {
  const OVERLAY_ID = "citizen-quick-npc-overlay";
  let bound = false;
  let dirty = false;

  const utils = () => window.WS_APP.CitizenEditorUtils || {};

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function ensureShell() {
    if (document.getElementById(OVERLAY_ID)) return document.getElementById(OVERLAY_ID);
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "citizen-editor-overlay citizen-quick-npc-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <section class="citizen-editor-shell citizen-quick-npc-shell" role="dialog" aria-modal="true" aria-labelledby="citizen-quick-npc-title">
        <header class="citizen-editor-head">
          <div>
            <p>Admin / Citizen Registry</p>
            <h3 id="citizen-quick-npc-title">Quick NPC Creator</h3>
          </div>
          <button class="citizen-editor-close" type="button" data-quick-npc-close aria-label="Close Quick NPC Creator">Close</button>
        </header>
        <form class="citizen-quick-npc-form" id="citizen-quick-npc-form" autocomplete="off">
          <p class="citizen-editor-message" data-quick-npc-message role="status" aria-live="polite"></p>
          <div class="citizen-quick-npc-layout">
            <section class="citizen-quick-npc-fields">
              <div class="citizen-editor-form-grid">
                <label class="citizen-editor-field is-wide">
                  <span>Template</span>
                  <select name="templateId" required></select>
                </label>
                <label class="citizen-editor-field">
                  <span>Competence</span>
                  <select name="competencePresetId"></select>
                </label>
                <label class="citizen-editor-field">
                  <span>Biological profile</span>
                  <select name="biologicalProfile">
                    <option value="ALPHA">ALPHA</option>
                    <option value="BETA">BETA</option>
                    <option value="GAMMA">GAMMA</option>
                    <option value="UNCLASSIFIED">UNCLASSIFIED</option>
                  </select>
                </label>
                <label class="citizen-editor-field">
                  <span>First name</span>
                  <input name="firstName" type="text" maxlength="80" />
                </label>
                <label class="citizen-editor-field">
                  <span>Surname</span>
                  <input name="surname" type="text" maxlength="80" />
                </label>
                <label class="citizen-editor-field">
                  <span>Pseudonym</span>
                  <input name="pseudonym" type="text" maxlength="80" />
                </label>
                <label class="citizen-editor-field">
                  <span>Birth date</span>
                  <input name="birthDate" type="date" required />
                </label>
                <label class="citizen-editor-field is-wide">
                  <span>Origin</span>
                  <select name="origin"></select>
                </label>
                <label class="citizen-editor-field is-wide">
                  <span>Admin note</span>
                  <textarea name="reason" maxlength="480">Quick NPC created from a pre-alpha role template.</textarea>
                </label>
              </div>
            </section>
            <aside class="citizen-quick-npc-preview" data-quick-npc-preview></aside>
          </div>
          <footer class="citizen-profile-editor-foot citizen-quick-npc-foot">
            <span class="citizen-editor-unsaved" data-quick-npc-dirty hidden>Unsaved configuration</span>
            <small>Shortcut: Ctrl/Cmd + Enter creates the NPC.</small>
            <div>
              <button class="citizen-editor-button" type="button" data-quick-npc-close>Cancel</button>
              <button class="citizen-editor-button is-primary" type="submit">Create Active NPC</button>
            </div>
          </footer>
        </form>
      </section>
    `;
    document.body.appendChild(overlay);
    bindShell(overlay);
    return overlay;
  }

  function bindShell(overlay) {
    if (bound) return;
    bound = true;
    const form = overlay.querySelector("#citizen-quick-npc-form");
    form.addEventListener("input", () => {
      setDirty(true);
      renderPreview(form);
    });
    form.addEventListener("change", (event) => {
      setDirty(true);
      if (event.target.name === "templateId") applyTemplateDefaults(form);
      renderPreview(form);
    });
    form.addEventListener("submit", createNpc);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-quick-npc-close]")) {
        event.preventDefault();
        closeCitizenQuickNpcCreator();
      }
    });

    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCitizenQuickNpcCreator();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        form.requestSubmit();
        return;
      }
      utils().trapFocus?.(event, overlay.querySelector(".citizen-quick-npc-shell"));
    });
  }

  function openCitizenQuickNpcCreator() {
    const user = window.WS_APP.currentUser;
    if (user?.role !== "admin") return { ok: false, error: { code: "ADMIN_REQUIRED" } };
    const overlay = ensureShell();
    const form = overlay.querySelector("#citizen-quick-npc-form");
    const templates = window.WS_APP.getCitizenTemplates?.({ characterType: "NPC" }) || [];
    const presets = window.WS_APP.getCitizenCompetencePresets?.() || [];
    const origins = window.APP_DATA?.citizenCreationConfig?.origins || ["NE3:51.00"];

    form.elements.templateId.innerHTML = templates.map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.label)}</option>`).join("");
    form.elements.competencePresetId.innerHTML = presets.map((preset) => `<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.label)}</option>`).join("");
    form.elements.origin.innerHTML = origins.map((origin) => `<option value="${escapeHtml(origin)}">${escapeHtml(origin)}</option>`).join("");
    form.reset();
    form.elements.birthDate.value = "2080-01-01";
    form.elements.origin.value = origins.includes("NE3:51.00") ? "NE3:51.00" : origins[0];
    form.elements.reason.value = "Quick NPC created from a pre-alpha role template.";
    applyTemplateDefaults(form);
    clearMessage(overlay);
    setDirty(false);
    overlay.classList.add("is-active");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-citizen-editor-open");
    utils().rememberTrigger?.(document.activeElement);
    window.requestAnimationFrame?.(() => form.elements.templateId.focus());
    return { ok: true };
  }

  function closeCitizenQuickNpcCreator(options = {}) {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay?.classList.contains("is-active")) return false;
    if (dirty && options.force !== true) {
      const confirmed = window.confirm("Discard Quick NPC configuration?");
      if (!confirmed) return false;
    }
    overlay.classList.remove("is-active");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-citizen-editor-open");
    clearMessage(overlay);
    setDirty(false);
    if (options.restoreFocus !== false) utils().restoreTriggerFocus?.();
    return true;
  }

  function applyTemplateDefaults(form) {
    const template = window.WS_APP.getCitizenTemplate?.(form.elements.templateId.value);
    if (!template) return;
    form.elements.biologicalProfile.value = template.biologicalProfile || "GAMMA";
    renderPreview(form);
  }

  function renderPreview(form) {
    const preview = ensureShell().querySelector("[data-quick-npc-preview]");
    const built = window.WS_APP.buildCitizenTemplatePatch?.(form.elements.templateId.value, {
      characterType: "NPC",
      competencePresetId: form.elements.competencePresetId.value
    });
    if (!built?.ok) {
      preview.innerHTML = `<p>Template preview unavailable.</p>`;
      return;
    }
    const abilityLabels = new Map((window.WS_APP.getAbilityDefinitions?.() || []).map((entry) => [entry.id, entry.label]));
    const skillLabels = new Map((window.WS_APP.getSkillDefinitions?.() || []).map((entry) => [entry.id, entry.label]));
    preview.innerHTML = `
      <p class="kicker">TEMPLATE PREVIEW</p>
      <h4>${escapeHtml(built.template.label)}</h4>
      <p>${escapeHtml(built.template.summary || "")}</p>
      <dl>
        <dt>Profile</dt><dd>${escapeHtml(form.elements.biologicalProfile.value || built.patch.biologicalProfile)}</dd>
        <dt>Role</dt><dd>${escapeHtml(built.patch.classProfile)}</dd>
        <dt>Competence</dt><dd>${escapeHtml(built.preset.label)}</dd>
      </dl>
      <div class="citizen-quick-npc-stat-list">
        ${built.patch.abilities.map((entry) => `<span><b>${escapeHtml(abilityLabels.get(entry.abilityId) || entry.abilityId)}</b><i>${entry.natural}</i></span>`).join("")}
      </div>
      <div class="citizen-quick-npc-skill-list">
        ${built.patch.skills.map((entry) => `<span>${escapeHtml(skillLabels.get(entry.skillId) || entry.skillId)} <b>${entry.value}</b></span>`).join("") || "<span>No selected skills</span>"}
      </div>
    `;
  }

  function createNpc(event) {
    event.preventDefault();
    const overlay = ensureShell();
    const form = overlay.querySelector("#citizen-quick-npc-form");
    const identity = {
      firstName: form.elements.firstName.value.trim(),
      middleName: "",
      surname: form.elements.surname.value.trim(),
      pseudonym: form.elements.pseudonym.value.trim()
    };
    if (!identity.firstName && !identity.surname && !identity.pseudonym) {
      showMessage(overlay, "First name, surname or pseudonym is required.", "error");
      form.elements.firstName.focus();
      return;
    }
    const built = window.WS_APP.buildCitizenTemplatePatch?.(form.elements.templateId.value, {
      characterType: "NPC",
      competencePresetId: form.elements.competencePresetId.value
    });
    if (!built?.ok) {
      showMessage(overlay, built?.error?.code || "Template could not be resolved.", "error");
      return;
    }
    const reason = form.elements.reason.value.trim() || "Quick NPC created by Admin.";
    const result = window.WS_APP.CitizenCommandAPI?.createQuickNpc?.({
      ...built.patch,
      biologicalProfile: form.elements.biologicalProfile.value,
      profile: form.elements.biologicalProfile.value,
      identity,
      origin: form.elements.origin.value,
      birthDate: String(form.elements.birthDate.value || "").replace(/[^0-9]/g, ""),
      reason,
      source: "QUICK_NPC_CREATOR",
      idempotencyKey: `quick-npc:create:${Date.now()}`
    }, window.WS_APP.currentUser);

    if (!result?.ok) {
      showMessage(overlay, `Creation failed: ${result?.error?.code || "UNKNOWN"}.`, "error");
      return;
    }
    setDirty(false);
    showMessage(overlay, `NPC created: ${result.citizen.shortId || result.citizen.id}.`, "ok");
    window.WS_APP.appendTerminalLogLine?.(`QUICK NPC CREATED / ${result.citizen.shortId || result.citizen.id}`, { typed: true, speed: 8 });
    window.setTimeout(() => {
      closeCitizenQuickNpcCreator({ force: true, restoreFocus: false });
      window.WS_APP.renderCitizenCardModule?.(window.WS_APP.currentUser, "CITIZEN CARDS", result.citizen.id, { returnTarget: "citizen-cards" });
    }, 180);
  }

  function setDirty(value) {
    dirty = value === true;
    const marker = document.querySelector("[data-quick-npc-dirty]");
    if (marker) marker.hidden = !dirty;
  }

  function showMessage(overlay, text, tone) {
    const node = overlay?.querySelector("[data-quick-npc-message]");
    if (!node) return;
    node.textContent = text;
    node.className = `citizen-editor-message is-visible ${tone === "error" ? "is-error" : "is-ok"}`;
  }

  function clearMessage(overlay) {
    const node = overlay?.querySelector("[data-quick-npc-message]");
    if (!node) return;
    node.textContent = "";
    node.className = "citizen-editor-message";
  }

  Object.assign(window.WS_APP, {
    openCitizenQuickNpcCreator,
    closeCitizenQuickNpcCreator
  });
})();
