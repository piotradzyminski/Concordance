window.WS_APP = window.WS_APP || {};

(function initCitizenCardSubscriptionProjection(app) {
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

  function formatCredits(value) {
    if (typeof app.formatCredits === "function") return app.formatCredits(value);
    const rounded = Math.round(Number(value) || 0);
    return `${String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₡`;
  }

  function getSubscriptionId(subscription = {}) {
    return String(subscription.id || subscription.subscriptionContractId || "").trim();
  }

  function getTierLabel(subscription = {}) {
    return String(
      subscription.displaySnapshot?.tierLabel
      || subscription.tierLabel
      || subscription.tierName
      || subscription.tierId
      || "No tier"
    ).trim() || "No tier";
  }

  function getTitle(subscription = {}) {
    return String(
      subscription.title
      || subscription.displaySnapshot?.title
      || subscription.name
      || subscription.provider
      || subscription.displaySnapshot?.provider
      || "Subscription"
    ).trim() || "Subscription";
  }

  function getProvider(subscription = {}) {
    return String(
      subscription.provider
      || subscription.displaySnapshot?.provider
      || subscription.organizationId
      || ""
    ).trim();
  }

  function buildMark(subscription = {}) {
    const source = String(subscription.logo || subscription.displaySnapshot?.logo || getProvider(subscription) || getTitle(subscription)).trim();
    const parts = source.split(/[^A-Za-z0-9]+/).filter(Boolean);
    const fallback = (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2)).toUpperCase() || "SB";
    return `<span class="citizen-card-subscription-mark" aria-hidden="true">${escapeHtml(fallback)}</span>`;
  }

  function renderSubscriptionSummaryTiles(input = [], options = {}) {
    const subscriptions = Array.isArray(input) ? input.filter(Boolean) : [];
    const emptyLabel = options.emptyLabel || "No active subscriptions";
    if (!subscriptions.length) return `<p class="file-empty">${escapeHtml(emptyLabel)}</p>`;

    return subscriptions.map((subscription) => {
      const id = getSubscriptionId(subscription);
      const title = getTitle(subscription);
      const tier = getTierLabel(subscription);
      const cycle = String(subscription.cycle || subscription.billingCycle || "WEEKLY").toUpperCase();
      const amount = Number(subscription.amount || 0);
      return `
        <button type="button" class="citizen-card-subscription-tile" data-view-subscription-id="${escapeHtml(id)}" ${id ? "" : "disabled"}>
          ${buildMark(subscription)}
          <span class="citizen-card-subscription-main">
            <b>${escapeHtml(title)}</b>
            <small>${escapeHtml(tier)}</small>
          </span>
          <span class="citizen-card-subscription-side">
            <strong>${escapeHtml(formatCredits(amount))}</strong>
            <small>${escapeHtml(cycle)}</small>
          </span>
        </button>
      `;
    }).join("");
  }


  Object.assign(projection, {
    renderSubscriptionSummaryTiles
  });
})(window.WS_APP);
