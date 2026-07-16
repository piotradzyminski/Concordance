window.WS_APP = window.WS_APP || {};

(function initializeRegistryUI(app) {
  function escapeRegistryHtml(value) {
    if (typeof app.escapeHtml === "function") return app.escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeConfirmOptions(titleOrOptions, message, confirmLabel, extraOptions = {}) {
    if (titleOrOptions && typeof titleOrOptions === "object") {
      return {
        cancelLabel: "Cancel",
        tone: "danger",
        ...titleOrOptions
      };
    }

    return {
      title: String(titleOrOptions || "CONFIRM ACTION"),
      message: String(message || "Confirm this registry operation."),
      confirmLabel: String(confirmLabel || "Confirm"),
      cancelLabel: "Cancel",
      tone: "danger",
      ...extraOptions
    };
  }

  function confirmAction(titleOrOptions, message, confirmLabel, extraOptions = {}) {
    if (typeof app.confirmAction !== "function") return Promise.resolve(false);
    return app.confirmAction(normalizeConfirmOptions(titleOrOptions, message, confirmLabel, extraOptions));
  }

  function renderInput(name, label, value = "", extraClass = "") {
    return `
      <label class="entry-form-field ${escapeRegistryHtml(extraClass)}">
        ${escapeRegistryHtml(label)}
        <input name="${escapeRegistryHtml(name)}" value="${escapeRegistryHtml(value)}" />
      </label>
    `;
  }

  function renderTextarea(name, label, value = "", extraClass = "", rows = 4) {
    return `
      <label class="entry-form-field ${escapeRegistryHtml(extraClass)}">
        ${escapeRegistryHtml(label)}
        <textarea name="${escapeRegistryHtml(name)}" rows="${escapeRegistryHtml(rows)}">${escapeRegistryHtml(value)}</textarea>
      </label>
    `;
  }

  function renderSelect(name, label, value = "PUBLIC", options = {}) {
    const levels = Array.isArray(options.options) && options.options.length
      ? options.options
      : ["PUBLIC", "CIVIL", "RESTRICTED", "BLACK", "GM"];
    const extraClass = String(options.extraClass || "");

    return `
      <label class="entry-form-field ${escapeRegistryHtml(extraClass)}">
        ${escapeRegistryHtml(label)}
        <select name="${escapeRegistryHtml(name)}">
          ${levels.map((level) => {
            const normalized = typeof level === "object"
              ? { value: level.value, label: level.label ?? level.value }
              : { value: level, label: level };
            return `<option value="${escapeRegistryHtml(normalized.value)}" ${String(normalized.value) === String(value) ? "selected" : ""}>${escapeRegistryHtml(normalized.label)}</option>`;
          }).join("")}
        </select>
      </label>
    `;
  }

  function parseList(value) {
    return String(value || "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeQuery(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  app.registryUI = Object.freeze({
    version: 1,
    confirmAction,
    renderInput,
    renderTextarea,
    renderSelect,
    parseList,
    normalizeQuery
  });
})(window.WS_APP);
