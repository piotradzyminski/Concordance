window.WS_APP = window.WS_APP || {};

(function initCitizenProfileEditorModule() {
  const OVERLAY_ID = "citizen-profile-editor-overlay";
  let activeCitizenId = "";
  let dirty = false;
  let bound = false;

  const utils = () => window.WS_APP.CitizenEditorUtils || {};

  function ensureShell() {
    if (document.getElementById(OVERLAY_ID)) return document.getElementById(OVERLAY_ID);
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "citizen-editor-overlay citizen-profile-editor-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <section class="citizen-editor-shell citizen-profile-editor-shell" role="dialog" aria-modal="true" aria-labelledby="citizen-profile-editor-title">
        <header class="citizen-editor-head">
          <div>
            <p>Citizen / Self Profile</p>
            <h3 id="citizen-profile-editor-title">Edit Profile</h3>
          </div>
          <button class="citizen-editor-close" type="button" data-profile-editor-close aria-label="Close profile editor">Close</button>
        </header>
        <form class="citizen-profile-editor-form" id="citizen-profile-editor-form" autocomplete="off">
          <div class="citizen-profile-editor-intro">
            <div>
              <span>SELF-EDITABLE RECORD</span>
              <strong data-profile-editor-id>—</strong>
            </div>
            <small>Identity, mechanics, access and system-owned domains remain outside this editor.</small>
          </div>
          <p class="citizen-editor-message" data-profile-editor-message role="status" aria-live="polite"></p>
          <div class="citizen-editor-form-grid">
            <label class="citizen-editor-field">
              <span>Pseudonym</span>
              <input name="pseudonym" type="text" maxlength="80" />
            </label>
            <label class="citizen-editor-field">
              <span>Portrait path</span>
              <input name="portrait" type="text" maxlength="260" />
            </label>
            <label class="citizen-editor-field is-wide">
              <span>Appearance</span>
              <textarea name="appearance" maxlength="2400"></textarea>
            </label>
            <label class="citizen-editor-field is-wide">
              <span>Player note</span>
              <textarea name="playerNote" maxlength="2400"></textarea>
            </label>
          </div>
          <footer class="citizen-profile-editor-foot">
            <span class="citizen-editor-unsaved" data-profile-editor-dirty hidden>Unsaved changes</span>
            <small class="citizen-profile-shortcut">Ctrl/Cmd + S saves the profile.</small>
            <div>
              <button class="citizen-editor-button" type="button" data-profile-editor-close>Cancel</button>
              <button class="citizen-editor-button is-primary" type="submit">Save Profile</button>
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
    const form = overlay.querySelector("#citizen-profile-editor-form");

    form.addEventListener("input", () => setDirty(true));
    form.addEventListener("change", () => setDirty(true));
    form.addEventListener("submit", saveProfile);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-profile-editor-close]")) {
        event.preventDefault();
        closeCitizenProfileEditor();
      }
    });

    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCitizenProfileEditor();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === "s") {
        event.preventDefault();
        form.requestSubmit();
        return;
      }
      utils().trapFocus?.(event, overlay.querySelector(".citizen-profile-editor-shell"));
    });
  }

  function openCitizenProfileEditor(citizenId, options = {}) {
    const user = options.user || window.WS_APP.currentUser;
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || user?.role !== "citizen" || citizen.recordState !== "ACTIVE") {
      return { ok: false, error: { code: "SELF_PROFILE_EDITOR_DENIED" } };
    }
    const owner = citizen.id === user.citizenId || citizen.ownerUserId === user.id;
    if (!owner) return { ok: false, error: { code: "SELF_PROFILE_EDITOR_DENIED" } };

    const overlay = ensureShell();
    const form = overlay.querySelector("#citizen-profile-editor-form");
    activeCitizenId = citizen.id;
    form.dataset.citizenId = citizen.id;
    form.elements.pseudonym.value = citizen.identity?.pseudonym || citizen.pseudonym || "";
    form.elements.portrait.value = citizen.portrait || "";
    form.elements.appearance.value = citizen.appearance || "";
    form.elements.playerNote.value = citizen.playerNote || "";
    overlay.querySelector("[data-profile-editor-id]").textContent = citizen.shortId || citizen.id;
    clearMessage(overlay);
    setDirty(false);
    overlay.classList.add("is-active");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-citizen-editor-open");
    window.requestAnimationFrame?.(() => form.elements.pseudonym.focus());
    return { ok: true, editor: "PROFILE", citizen };
  }

  function saveProfile(event) {
    event.preventDefault();
    const overlay = ensureShell();
    const form = overlay.querySelector("#citizen-profile-editor-form");
    const citizen = window.WS_APP.getCitizenById?.(activeCitizenId);
    if (!citizen) {
      showMessage(overlay, "Citizen record is no longer available.", "error");
      return;
    }

    const result = window.WS_APP.CitizenCommandAPI?.updateCitizenSelfProfile?.(citizen.id, {
      patch: {
        pseudonym: form.elements.pseudonym.value.trim(),
        portrait: form.elements.portrait.value.trim(),
        appearance: form.elements.appearance.value.trim(),
        playerNote: form.elements.playerNote.value.trim()
      },
      source: "CITIZEN_PROFILE_EDITOR",
      idempotencyKey: `citizen-profile-editor:${citizen.id}:${Date.now()}`
    }, window.WS_APP.currentUser);

    if (!result?.ok) {
      showMessage(overlay, `Save failed: ${result?.error?.code || "UNKNOWN"}.`, "error");
      return;
    }

    setDirty(false);
    showMessage(overlay, "Profile saved.", "ok");
    window.WS_APP.appendTerminalLogLine?.(`CITIZEN PROFILE UPDATED / ${result.citizen.shortId || result.citizen.id}`, { typed: true, speed: 8 });
    window.setTimeout(() => closeCitizenProfileEditor({ force: true }), 220);
  }

  function closeCitizenProfileEditor(options = {}) {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay?.classList.contains("is-active")) return false;
    if (dirty && options.force !== true) {
      const confirmed = window.confirm("Discard unsaved profile changes?");
      if (!confirmed) return false;
    }
    overlay.classList.remove("is-active");
    overlay.setAttribute("aria-hidden", "true");
    activeCitizenId = "";
    setDirty(false);
    clearMessage(overlay);
    document.body.classList.remove("is-citizen-editor-open");
    if (options.restoreFocus !== false) utils().restoreTriggerFocus?.();
    return true;
  }

  function setDirty(value) {
    dirty = value === true;
    const overlay = document.getElementById(OVERLAY_ID);
    const marker = overlay?.querySelector("[data-profile-editor-dirty]");
    if (marker) marker.hidden = !dirty;
  }

  function showMessage(overlay, text, tone) {
    const node = overlay?.querySelector("[data-profile-editor-message]");
    if (!node) return;
    node.textContent = text;
    node.className = `citizen-editor-message is-visible ${tone === "error" ? "is-error" : "is-ok"}`;
  }

  function clearMessage(overlay) {
    const node = overlay?.querySelector("[data-profile-editor-message]");
    if (!node) return;
    node.textContent = "";
    node.className = "citizen-editor-message";
  }

  Object.assign(window.WS_APP, {
    openCitizenProfileEditor,
    closeCitizenProfileEditor
  });
})();
