window.WS_APP = window.WS_APP || {};

(function initCitizenCardEquipmentProjection(app) {
  "use strict";

  const projection = app.citizenCardProjection = app.citizenCardProjection || {};

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeToken(value) {
    return String(value || "").trim().toUpperCase();
  }

  function getCitizenId(citizenOrId = {}) {
    return typeof citizenOrId === "string"
      ? String(citizenOrId).trim()
      : String(citizenOrId?.id || citizenOrId?.citizenId || "").trim();
  }

  function getEquipmentViews(citizenOrId = {}) {
    const citizenId = getCitizenId(citizenOrId);
    if (!citizenId || typeof app.getCitizenEquipmentItemInstanceViews !== "function") return [];
    return app.getCitizenEquipmentItemInstanceViews(citizenId, { includeArchived: false }) || [];
  }

  function getOccupiedPlacementCount(items = []) {
    const occupied = new Set();
    items.forEach((item) => {
      if (normalizeToken(item?.locationData?.type || item?.location) !== "EQUIPPED") return;
      const placement = item.equippedLocation || item.locationData?.equippedLocation || {};
      const kind = normalizeToken(placement.kind || "EQUIPPED");
      const anchor = normalizeToken(placement.anchor || placement.bodyAnchor || "");
      const layer = normalizeToken(placement.layer || "");
      const mountIds = Array.isArray(placement.mountIds)
        ? placement.mountIds
        : [placement.mountId || placement.bodyMountId || placement.itemMountId].filter(Boolean);

      if (mountIds.length) {
        mountIds.forEach((mountId) => occupied.add(`${kind}:${normalizeToken(mountId)}`));
        return;
      }
      occupied.add(`${kind}:${anchor || item.instanceId || item.id}:${layer}`);
    });
    return occupied.size;
  }

  function getCarryPenalty(items = []) {
    const bulkyCarriers = items.filter((item) => {
      if (normalizeToken(item?.locationData?.type || item?.location) !== "EQUIPPED") return false;
      return item?.equipProfile?.countsAsBulkyCarrier === true;
    }).length;
    return Math.max(0, bulkyCarriers * 10);
  }

  function getEquipmentSummary(citizenOrId = {}) {
    const citizenId = getCitizenId(citizenOrId);
    const views = getEquipmentViews(citizenOrId);
    const storeSummary = typeof app.getEquipmentInstanceSummary === "function"
      ? app.getEquipmentInstanceSummary(citizenId)
      : {};

    const itemCount = Number(storeSummary.itemCount ?? views.length) || 0;
    const equippedCount = Number(storeSummary.equippedCount ?? views.filter((item) => normalizeToken(item?.locationData?.type || item?.location) === "EQUIPPED").length) || 0;
    const gridStoredCount = Number(storeSummary.gridStoredCount ?? views.filter((item) => normalizeToken(item?.locationData?.type || item?.location) === "CONTAINER_GRID").length) || 0;

    return {
      itemCount,
      equippedCount,
      gridStoredCount,
      occupiedCount: getOccupiedPlacementCount(views),
      reflexDexterityPenaltyPercent: getCarryPenalty(views),
      status: "READY"
    };
  }

  function renderEquipmentSummary(citizen = {}, options = {}) {
    const summary = getEquipmentSummary(citizen);
    return `<section class="equipment-shell-card ${options.compact === true ? "is-compact" : ""}" data-citizen-card-projection="equipment"><p class="kicker">EQUIPMENT</p><h6>Equipment summary</h6><div class="equipment-shell-card__meta"><span>${escapeHtml(summary.itemCount)} items</span><span>${escapeHtml(summary.equippedCount)} equipped</span><span>${escapeHtml(summary.occupiedCount)} occupied layers/mounts</span><span>${escapeHtml(summary.gridStoredCount)} in grids</span><span>${escapeHtml(summary.reflexDexterityPenaltyPercent)}% carry penalty</span><span>${escapeHtml(summary.status)}</span></div></section>`;
  }

  Object.assign(projection, {
    getEquipmentSummary,
    renderEquipmentSummary
  });
})(window.WS_APP);
