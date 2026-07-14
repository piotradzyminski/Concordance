window.WS_APP = window.WS_APP || {};

(function initCitizenEditorRouter() {
  const EDITOR_TRIGGER_SELECTOR = "[data-citizen-editor-open]";
  let initialized = false;
  let lastTrigger = null;

  function normalizeUser(user = window.WS_APP.currentUser) {
    if (!user) return null;
    return {
      ...user,
      role: String(user.role || "").trim().toLowerCase()
    };
  }

  function getCitizen(citizenId) {
    return window.WS_APP.getCitizenById?.(String(citizenId || "").trim()) || null;
  }

  function shouldUseCreator(citizen) {
    return ["DRAFT", "CHANGES_REQUESTED", "READY_FOR_REVIEW", "REJECTED"].includes(
      String(citizen?.recordState || "").trim().toUpperCase()
    );
  }

  function rememberTrigger(trigger) {
    if (trigger instanceof HTMLElement) lastTrigger = trigger;
  }

  function restoreTriggerFocus() {
    const trigger = lastTrigger;
    lastTrigger = null;
    if (trigger?.isConnected) window.requestAnimationFrame?.(() => trigger.focus());
  }

  function openCitizenEditor(citizenId, options = {}) {
    const citizen = getCitizen(citizenId);
    const user = normalizeUser(options.user || window.WS_APP.currentUser);
    rememberTrigger(options.trigger || document.activeElement);

    if (!citizen || !user || citizen.recordType === "admin") {
      return { ok: false, error: { code: "CITIZEN_EDITOR_TARGET_INVALID" } };
    }

    if (shouldUseCreator(citizen) && typeof window.WS_APP.openCitizenCreator === "function") {
      window.WS_APP.openCitizenCreator(citizen.id);
      return { ok: true, editor: "CREATOR", citizen };
    }

    const adminLike = user.role === "admin"
      || window.WS_APP.hasOwnerFullCardEditGrant?.(citizen, user) === true;

    if (adminLike && typeof window.WS_APP.openCitizenAdminEditor === "function") {
      return window.WS_APP.openCitizenAdminEditor(citizen.id, { ...options, user });
    }

    if (typeof window.WS_APP.openCitizenProfileEditor === "function") {
      return window.WS_APP.openCitizenProfileEditor(citizen.id, { ...options, user });
    }

    return { ok: false, error: { code: "CITIZEN_EDITOR_NOT_READY" } };
  }

  function closeCitizenEditor(options = {}) {
    const adminClosed = window.WS_APP.closeCitizenAdminEditor?.(options) === true;
    const profileClosed = window.WS_APP.closeCitizenProfileEditor?.(options) === true;
    if ((adminClosed || profileClosed) && options.restoreFocus !== false) restoreTriggerFocus();
    return adminClosed || profileClosed;
  }

  function handleEditorTrigger(event) {
    const trigger = event.target?.closest?.(EDITOR_TRIGGER_SELECTOR);
    if (!trigger) return;
    const citizenId = String(trigger.dataset.citizenEditorOpen || "").trim();
    if (!citizenId) return;
    event.preventDefault();
    event.stopPropagation();
    openCitizenEditor(citizenId, { trigger });
  }

  function initCitizenEditor() {
    if (initialized) return;
    initialized = true;
    document.addEventListener("click", handleEditorTrigger);
  }

  function escapeHtml(value) {
    if (typeof window.WS_APP.escapeHtml === "function") return window.WS_APP.escapeHtml(value);
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseList(value) {
    if (Array.isArray(value)) return value.map((entry) => String(entry || "").trim()).filter(Boolean);
    return String(value || "")
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function listToText(value) {
    return (Array.isArray(value) ? value : []).map((entry) => String(entry || "").trim()).filter(Boolean).join(", ");
  }

  function getFocusable(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((node) => !node.hidden && node.offsetParent !== null);
  }

  function trapFocus(event, root) {
    if (event.key !== "Tab") return false;
    const focusable = getFocusable(root);
    if (!focusable.length) return false;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return true;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
      return true;
    }
    return false;
  }

  window.WS_APP.CitizenEditorUtils = Object.freeze({
    escapeHtml,
    parseList,
    listToText,
    getFocusable,
    trapFocus,
    rememberTrigger,
    restoreTriggerFocus
  });

  Object.assign(window.WS_APP, {
    initCitizenEditor,
    openCitizenEditor,
    closeCitizenEditor
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCitizenEditor, { once: true });
  } else {
    initCitizenEditor();
  }
})();
