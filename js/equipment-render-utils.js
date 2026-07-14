window.WS_APP = window.WS_APP || {};

(function initEquipmentRenderUtils() {
  function escapeHtml(value = "") {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function renderEquipmentEmptyState(message = "No Equipment data available.") {
    return `<p class="file-empty">${escapeHtml(message)}</p>`;
  }

  window.WS_APP.equipmentRenderUtils = {
    escapeHtml,
    clone,
    renderEquipmentEmptyState
  };

  window.WS_APP.escapeEquipmentHtml = escapeHtml;
  window.WS_APP.cloneEquipmentValue = clone;
})();
