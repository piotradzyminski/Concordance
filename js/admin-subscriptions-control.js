window.WS_APP = window.WS_APP || {};

(function initAdminSubscriptionsControl(app) {
  "use strict";

  if (app.AdminSubscriptionsControl) return;

  const VERSION = "subscriptions_entitlement_projection_4_6";
  const MAX_RENDERED_CONTRACTS = 80;
  const DEFAULT_STATE = Object.freeze({
    query: "",
    citizenId: "ALL",
    providerId: "ALL",
    subscriptionCatalogId: "ALL",
    billingStatus: "ALL",
    entitlementStatus: "ALL",
    targetType: "ALL",
    tierId: "ALL",
    sort: "ATTENTION",
    selectedContractId: "",
    feedback: null
  });

  function clone(value) {
    if (value == null) return value;
    if (typeof structuredClone === "function") {
      try { return structuredClone(value); } catch (error) { /* fall through */ }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function token(value = "") {
    return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9_:-]+/g, "_");
  }

  function escapeHtml(value = "") {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeSearchText(value = "") {
    return String(value || "")
      .replace(/[Łł]/g, (character) => character === "Ł" ? "L" : "l")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function formatCredits(value = 0) {
    const number = Number(value || 0);
    const safe = Number.isFinite(number) ? Math.trunc(number) : 0;
    const sign = safe < 0 ? "-" : "";
    const body = String(Math.abs(safe)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${sign}${body} ₡`;
  }

  function getState(patch = null) {
    const current = app.adminSubscriptionUiState && typeof app.adminSubscriptionUiState === "object"
      ? app.adminSubscriptionUiState
      : {};
    const next = {
      ...DEFAULT_STATE,
      ...current,
      ...(patch && typeof patch === "object" ? patch : {})
    };
    next.query = String(next.query || "");
    ["citizenId", "providerId", "subscriptionCatalogId", "billingStatus", "entitlementStatus", "targetType", "tierId", "sort"]
      .forEach((key) => { next[key] = String(next[key] || DEFAULT_STATE[key]); });
    next.selectedContractId = String(next.selectedContractId || "");
    next.feedback = next.feedback && typeof next.feedback === "object"
      ? { tone: next.feedback.tone === "error" ? "error" : "info", message: String(next.feedback.message || "") }
      : null;
    app.adminSubscriptionUiState = next;
    return next;
  }

  function setState(patch = {}) {
    return getState(patch);
  }

  function getCitizens() {
    const source = typeof app.getCitizens === "function"
      ? app.getCitizens()
      : (window.APP_DATA?.citizens || []);
    return (Array.isArray(source) ? source : [])
      .filter((citizen) => citizen && citizen.recordType !== "admin" && citizen.archived !== true)
      .map((citizen) => clone(citizen));
  }

  function getCitizenName(citizen = {}) {
    return app.getCitizenDisplayName?.(citizen, { user: app.currentUser, legal: true })
      || citizen.legalName
      || citizen.displayName
      || citizen.shortId
      || citizen.id
      || "UNKNOWN CITIZEN";
  }

  function getCitizenShortId(citizen = {}) {
    return app.getCitizenShortId?.(citizen) || citizen.shortId || citizen.id || "—";
  }

  function getCatalogDefinitions() {
    const source = typeof app.getSubscriptionCatalog === "function"
      ? app.getSubscriptionCatalog({ includeArchived: true })
      : (window.APP_DATA?.subscriptionCatalogDefinitions?.subscriptions || []);
    return Array.isArray(source) ? source.map((definition) => clone(definition)) : [];
  }

  function getCatalogId(contract = {}) {
    return String(contract.subscriptionCatalogId || contract.catalogId || "").trim();
  }

  function getContractId(contract = {}) {
    return String(contract.subscriptionContractId || contract.id || "").trim();
  }

  function getContractsForCitizen(citizen = {}) {
    const citizenId = String(citizen.id || "").trim();
    const api = app.SubscriptionAPI;
    if (api?.getCitizenSubscriptionContracts && citizenId) {
      const contracts = api.getCitizenSubscriptionContracts(citizenId, { includeCancelled: true });
      if (Array.isArray(contracts)) return contracts;
    }
    return (Array.isArray(citizen.subscriptions) ? citizen.subscriptions : []).map((contract, index) => {
      if (typeof app.normalizeSubscriptionContract === "function") {
        return app.normalizeSubscriptionContract(contract, index, { citizenId });
      }
      return { ...clone(contract), citizenId };
    });
  }

  function getTier(catalog = {}, tierId = "") {
    return (Array.isArray(catalog.tiers) ? catalog.tiers : [])
      .find((candidate) => String(candidate.tierId || candidate.id || "") === String(tierId || "")) || null;
  }

  function getEntitlementCodes(catalog = {}, tier = {}) {
    return [...new Set([
      ...(Array.isArray(catalog.entitlementCodes) ? catalog.entitlementCodes : []),
      ...(Array.isArray(tier?.entitlementCodes) ? tier.entitlementCodes : [])
    ].map(token).filter(Boolean))];
  }

  function getTargetDisplay(contract = {}, citizen = {}) {
    const target = contract.coverageTarget && typeof contract.coverageTarget === "object"
      ? contract.coverageTarget
      : { type: "CITIZEN", id: citizen.id || contract.citizenId || "" };
    const type = token(target.type || "CITIZEN") || "CITIZEN";
    const id = String(target.id || (type === "CITIZEN" ? citizen.id || contract.citizenId || "" : "")).trim();
    if (type === "CITIZEN") return { type, id, label: getCitizenName(citizen) };
    const item = app.getItemInstanceById?.(id) || null;
    const label = item?.playerLabel || item?.customName || item?.name || item?.displayName || item?.definitionId || id || "UNBOUND ITEM";
    return { type, id, label };
  }

  function getContractEntitlementSnapshot(contract = {}, citizenId = "") {
    const source = {
      ...contract,
      citizenId: String(contract.citizenId || citizenId || "").trim()
    };
    const atTime = String(
      app.getCampaignTimeIso?.()
      || app.CAMPAIGN_TIME_ISO
      || app.getCampaignDateIso?.()
      || app.CAMPAIGN_DATE_ISO
      || ""
    ).trim();
    if (typeof app.getSubscriptionContractEntitlementSnapshot === "function") {
      try {
        const snapshot = app.getSubscriptionContractEntitlementSnapshot(source, atTime) || null;
        if (snapshot && typeof snapshot === "object") return snapshot;
      } catch (error) {
        // Admin read projection falls back to persisted axes.
      }
    }
    const status = token(
      source.entitlementStatus
      || (source.contractStatus === "CANCELLED" ? "CANCELLED" : source.billingStatus || source.status || "PENDING")
    ) || "PENDING";
    return {
      allowed: ["ACTIVE", "GRACE_PERIOD"].includes(status),
      status,
      reasons: [],
      evaluatedAt: atTime || null
    };
  }

  function resolveSelectedEntitlements(row = {}) {
    const codes = row.entitlementCodes || [];
    const resolver = app.SubscriptionAPI?.resolveSubscriptionEntitlement;
    if (!codes.length || typeof resolver !== "function") {
      return {
        status: token(row.contract.entitlementStatus || "NONE") || "NONE",
        allowedCount: 0,
        totalCount: codes.length,
        entries: codes.map((code) => ({ code, allowed: false, status: "UNKNOWN", reasons: [] })),
        reasons: []
      };
    }

    const entries = codes.map((code) => {
      const result = resolver({
        citizenId: row.citizenId,
        subscriptionContractId: row.contractId,
        subscriptionCatalogId: row.catalogId,
        providerId: row.providerId,
        entitlementCode: code,
        coverageTarget: row.contract.coverageTarget,
        targetType: row.target.type,
        targetId: row.target.id
      }) || {};
      return {
        code,
        allowed: result.allowed === true,
        status: token(result.status || (result.allowed ? "ACTIVE" : "BLOCKED")) || "UNKNOWN",
        reasons: Array.isArray(result.reasons) ? result.reasons : []
      };
    });
    const allowedCount = entries.filter((entry) => entry.allowed).length;
    const reasons = [...new Set(entries.flatMap((entry) => entry.reasons.map((reason) => token(reason.code || reason) || "UNKNOWN")))];
    return {
      status: allowedCount === entries.length ? "ACTIVE" : allowedCount > 0 ? "PARTIAL" : (entries[0]?.status || token(row.contract.entitlementStatus || "BLOCKED") || "BLOCKED"),
      allowedCount,
      totalCount: entries.length,
      entries,
      reasons
    };
  }

  function buildContractRows() {
    const catalogs = getCatalogDefinitions();
    const catalogById = new Map(catalogs.map((definition) => [String(definition.subscriptionCatalogId || definition.id || ""), definition]));
    const rows = [];

    getCitizens().forEach((citizen) => {
      getContractsForCitizen(citizen).forEach((contract, index) => {
        const contractId = getContractId(contract) || `subscription-${citizen.id}-${index + 1}`;
        const catalogId = getCatalogId(contract);
        const catalog = catalogById.get(catalogId) || app.SubscriptionAPI?.getSubscriptionCatalogEntry?.(catalogId) || null;
        const tier = getTier(catalog || {}, contract.tierId);
        const target = getTargetDisplay(contract, citizen);
        const title = String(contract.displaySnapshot?.title || contract.title || catalog?.title || "SUBSCRIPTION").trim();
        const provider = String(contract.displaySnapshot?.provider || contract.provider || catalog?.provider || contract.providerId || "UNKNOWN PROVIDER").trim();
        const providerId = String(contract.providerId || catalog?.providerId || provider).trim();
        const billingStatus = token(contract.billingStatus || contract.status || "PENDING") || "PENDING";
        const contractStatus = token(contract.contractStatus || (billingStatus === "CANCELLED" ? "CANCELLED" : "ACTIVE")) || "ACTIVE";
        const entitlementSnapshot = getContractEntitlementSnapshot(contract, citizen.id);
        const entitlementStatus = token(
          entitlementSnapshot.status
          || contract.entitlementStatus
          || (contractStatus === "CANCELLED" ? "CANCELLED" : billingStatus === "PAID" ? "ACTIVE" : billingStatus)
        ) || "UNKNOWN";
        const entitlementReasonCodes = [...new Set(
          (Array.isArray(entitlementSnapshot.reasons) ? entitlementSnapshot.reasons : [])
            .map((reason) => token(reason?.code || reason))
            .filter(Boolean)
        )];
        const tierId = String(contract.tierId || "").trim();
        const tierLabel = String(contract.displaySnapshot?.tierLabel || contract.tierLabel || tier?.label || tierId || "—").trim();
        const amount = Number(contract.amount ?? tier?.amount ?? 0) || 0;
        const searchText = normalizeSearchText([
          contractId,
          citizen.id,
          getCitizenName(citizen),
          getCitizenShortId(citizen),
          title,
          provider,
          providerId,
          catalogId,
          tierId,
          tierLabel,
          billingStatus,
          contractStatus,
          entitlementStatus,
          ...entitlementReasonCodes,
          target.type,
          target.id,
          target.label
        ].join(" "));
        rows.push({
          contractId,
          catalogId,
          providerId,
          tierId,
          citizenId: String(citizen.id || ""),
          citizen,
          citizenName: getCitizenName(citizen),
          citizenShortId: getCitizenShortId(citizen),
          contract: clone(contract),
          catalog: catalog ? clone(catalog) : null,
          tier: tier ? clone(tier) : null,
          title,
          provider,
          billingStatus,
          contractStatus,
          entitlementStatus,
          entitlementAllowed: entitlementSnapshot.allowed === true,
          entitlementReasonCodes,
          entitlementEvaluatedAt: entitlementSnapshot.evaluatedAt || null,
          tierLabel,
          target,
          amount,
          category: token(contract.displaySnapshot?.category || contract.category || catalog?.category || "OTHER") || "OTHER",
          market: token(contract.displaySnapshot?.market || contract.market || catalog?.market || "UNKNOWN") || "UNKNOWN",
          entitlementCodes: getEntitlementCodes(catalog || {}, tier || {}),
          searchText
        });
      });
    });

    return rows;
  }

  function isAttentionRow(row = {}) {
    return row.contractStatus === "CANCELLED"
      ? false
      : ["OVERDUE", "SUSPENDED", "PENDING"].includes(row.billingStatus)
        || ["BLOCKED", "REVOKED", "EXPIRED", "NOT_FOUND", "SUSPENDED", "INVALID", "PARTIAL"].includes(row.entitlementStatus);
  }

  function filterContractRows(rows = [], stateInput = {}) {
    const state = { ...DEFAULT_STATE, ...stateInput };
    const query = normalizeSearchText(state.query);
    const queryTerms = query.split(/\s+/).filter(Boolean);
    let result = (Array.isArray(rows) ? rows : []).filter((row) => {
      if (queryTerms.length && !queryTerms.every((term) => row.searchText.includes(term))) return false;
      if (state.citizenId !== "ALL" && row.citizenId !== state.citizenId) return false;
      if (state.providerId !== "ALL" && row.providerId !== state.providerId) return false;
      if (state.subscriptionCatalogId !== "ALL" && row.catalogId !== state.subscriptionCatalogId) return false;
      if (state.billingStatus !== "ALL" && row.billingStatus !== state.billingStatus) return false;
      if (state.entitlementStatus !== "ALL" && row.entitlementStatus !== state.entitlementStatus) return false;
      if (state.targetType !== "ALL" && row.target.type !== state.targetType) return false;
      if (state.tierId !== "ALL" && row.tierId !== state.tierId) return false;
      return true;
    });

    const attentionRank = (row) => {
      if (row.billingStatus === "OVERDUE") return 0;
      if (row.billingStatus === "SUSPENDED") return 1;
      if (["EXPIRED", "REVOKED", "BLOCKED", "NOT_FOUND"].includes(row.entitlementStatus)) return 2;
      if (row.billingStatus === "PENDING") return 3;
      if (row.contractStatus === "CANCELLED") return 9;
      return 5;
    };

    result = result.slice().sort((left, right) => {
      if (state.sort === "CITIZEN") return left.citizenName.localeCompare(right.citizenName) || left.title.localeCompare(right.title);
      if (state.sort === "PROVIDER") return left.provider.localeCompare(right.provider) || left.title.localeCompare(right.title);
      if (state.sort === "PRICE_DESC") return right.amount - left.amount || left.title.localeCompare(right.title);
      if (state.sort === "PRICE_ASC") return left.amount - right.amount || left.title.localeCompare(right.title);
      if (state.sort === "NAME") return left.title.localeCompare(right.title);
      return attentionRank(left) - attentionRank(right) || left.citizenName.localeCompare(right.citizenName) || left.title.localeCompare(right.title);
    });
    return result;
  }

  function getGroupKey(row = {}) {
    if (row.contractStatus === "CANCELLED") return "CANCELLED";
    if (row.billingStatus === "SUSPENDED" || row.entitlementStatus === "SUSPENDED") return "SUSPENDED";
    if (isAttentionRow(row)) return "ATTENTION";
    return "ACTIVE";
  }

  function ensureSelection(rows = [], state = getState()) {
    const visibleIds = new Set(rows.map((row) => row.contractId));
    if (state.selectedContractId && visibleIds.has(state.selectedContractId)) return state.selectedContractId;
    const fallback = rows[0]?.contractId || "";
    setState({ selectedContractId: fallback });
    return fallback;
  }

  function option(value, label, selectedValue) {
    return `<option value="${escapeHtml(value)}" ${String(value) === String(selectedValue) ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }

  function uniqueOptions(rows = [], key = "", labelKey = key) {
    const map = new Map();
    rows.forEach((row) => {
      const value = String(row[key] || "").trim();
      if (!value) return;
      const label = String(row[labelKey] || value).trim();
      if (!map.has(value)) map.set(value, label);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }

  function adminSubscriptionDomId(value = "") {
    return String(value || "subscription-contract")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "subscription-contract";
  }

  function renderMetric(label, value, note, tone = "neutral") {
    return `
      <article class="admin-subscription-metric is-${escapeHtml(tone)}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(note)}</small>
      </article>
    `;
  }

  function stateTone(status = "") {
    const normalized = token(status);
    if (["PAID", "ACTIVE", "ALLOWED", "CLEAR"].includes(normalized)) return "active";
    if (["OVERDUE", "SUSPENDED", "BLOCKED", "REVOKED", "INVALID", "PARTIAL"].includes(normalized)) return "warning";
    if (["CANCELLED", "FAILED", "DENIED"].includes(normalized)) return "locked";
    return "muted";
  }

  function renderBadge(label, tone = stateTone(label)) {
    return `<span class="admin-subscription-badge is-${escapeHtml(tone)}">${escapeHtml(token(label) || "UNKNOWN")}</span>`;
  }

  function renderFilters(rows = [], state = getState()) {
    const citizenOptions = uniqueOptions(rows, "citizenId", "citizenName");
    const providerOptions = uniqueOptions(rows, "providerId", "provider");
    const productOptions = uniqueOptions(rows, "catalogId", "title");
    const tierOptions = uniqueOptions(rows, "tierId", "tierLabel");
    const billingOptions = [...new Set(rows.map((row) => row.billingStatus).filter(Boolean))].sort();
    const entitlementOptions = [...new Set(rows.map((row) => row.entitlementStatus).filter(Boolean))].sort();
    const targetOptions = [...new Set(rows.map((row) => row.target.type).filter(Boolean))].sort();

    return `
      <form class="admin-subscription-filterbar" data-admin-subscriptions-filter-form aria-label="Admin subscription filters">
        <label class="admin-subscription-filterbar__query">Search
          <input type="search" name="query" value="${escapeHtml(state.query)}" placeholder="Citizen, provider, product or contract ID">
        </label>
        <label>Citizen
          <select name="citizenId">
            ${option("ALL", "ALL CITIZENS", state.citizenId)}
            ${citizenOptions.map(([value, label]) => option(value, label, state.citizenId)).join("")}
          </select>
        </label>
        <label>Provider
          <select name="providerId">
            ${option("ALL", "ALL PROVIDERS", state.providerId)}
            ${providerOptions.map(([value, label]) => option(value, label, state.providerId)).join("")}
          </select>
        </label>
        <label>Product
          <select name="subscriptionCatalogId">
            ${option("ALL", "ALL PRODUCTS", state.subscriptionCatalogId)}
            ${productOptions.map(([value, label]) => option(value, label, state.subscriptionCatalogId)).join("")}
          </select>
        </label>
        <label>Billing
          <select name="billingStatus">
            ${option("ALL", "ALL BILLING STATES", state.billingStatus)}
            ${billingOptions.map((value) => option(value, value, state.billingStatus)).join("")}
          </select>
        </label>
        <label>Entitlement
          <select name="entitlementStatus">
            ${option("ALL", "ALL ENTITLEMENT STATES", state.entitlementStatus)}
            ${entitlementOptions.map((value) => option(value, value, state.entitlementStatus)).join("")}
          </select>
        </label>
        <label>Target
          <select name="targetType">
            ${option("ALL", "ALL TARGET TYPES", state.targetType)}
            ${targetOptions.map((value) => option(value, value, state.targetType)).join("")}
          </select>
        </label>
        <label>Tier
          <select name="tierId">
            ${option("ALL", "ALL TIERS", state.tierId)}
            ${tierOptions.map(([value, label]) => option(value, label, state.tierId)).join("")}
          </select>
        </label>
        <label>Sort
          <select name="sort">
            ${option("ATTENTION", "ATTENTION FIRST", state.sort)}
            ${option("CITIZEN", "CITIZEN", state.sort)}
            ${option("PROVIDER", "PROVIDER", state.sort)}
            ${option("NAME", "PRODUCT", state.sort)}
            ${option("PRICE_ASC", "PRICE LOW-HIGH", state.sort)}
            ${option("PRICE_DESC", "PRICE HIGH-LOW", state.sort)}
          </select>
        </label>
        <div class="admin-subscription-filterbar__actions">
          <button type="submit">Apply Filters</button>
          <button type="button" data-admin-subscriptions-clear-filters>Clear</button>
        </div>
      </form>
    `;
  }

  function renderContractCard(row = {}, selected = false) {
    return `
      <button id="admin-subscription-contract-${adminSubscriptionDomId(row.contractId)}" class="admin-subscription-contract-card ${selected ? "is-selected" : ""}" type="button" role="option" data-admin-subscriptions-select="${escapeHtml(row.contractId)}" aria-selected="${selected ? "true" : "false"}" tabindex="${selected ? "0" : "-1"}">
        <span class="admin-subscription-contract-card__rail"></span>
        <span class="admin-subscription-contract-card__head">
          <span>
            <strong>${escapeHtml(row.title)}</strong>
            <small>${escapeHtml(row.provider)}</small>
          </span>
          ${renderBadge(row.billingStatus)}
        </span>
        <span class="admin-subscription-contract-card__citizen">
          <b>${escapeHtml(row.citizenName)}</b>
          <small>${escapeHtml(row.citizenShortId)}</small>
        </span>
        <span class="admin-subscription-contract-card__meta">
          <span>${escapeHtml(row.tierLabel)}</span>
          <span>${escapeHtml(row.target.type)}</span>
          <span>${escapeHtml(formatCredits(row.amount))} / ${escapeHtml(row.contract.billingCycle || "WEEKLY")}</span>
        </span>
        <span class="admin-subscription-contract-card__footer">
          ${renderBadge(row.entitlementStatus)}
          <small>${escapeHtml(row.contractId)}</small>
        </span>
      </button>
    `;
  }

  function renderContractGroups(rows = [], selectedContractId = "") {
    const groups = [
      ["ATTENTION", "NEEDS ATTENTION", "Overdue, pending or blocked contracts."],
      ["ACTIVE", "ACTIVE", "Paid and operational contracts."],
      ["SUSPENDED", "SUSPENDED", "Contracts suspended by billing or administration."],
      ["CANCELLED", "CANCELLED", "Archived contract history."]
    ];
    const limitedRows = rows.slice(0, MAX_RENDERED_CONTRACTS);
    const grouped = new Map(groups.map(([key]) => [key, []]));
    limitedRows.forEach((row) => grouped.get(getGroupKey(row))?.push(row));

    const content = groups.map(([key, label, note]) => {
      const entries = grouped.get(key) || [];
      if (!entries.length) return "";
      return `
        <section class="admin-subscription-contract-group is-${escapeHtml(key.toLowerCase())}">
          <header>
            <div><p class="kicker">${escapeHtml(label)}</p><small>${escapeHtml(note)}</small></div>
            <b>${escapeHtml(String(entries.length))}</b>
          </header>
          <div class="admin-subscription-contract-list">
            ${entries.map((row) => renderContractCard(row, row.contractId === selectedContractId)).join("")}
          </div>
        </section>
      `;
    }).join("");

    if (!content) return `<div class="admin-subscription-empty">No subscription contracts match the active filters.</div>`;
    const clipped = rows.length > MAX_RENDERED_CONTRACTS
      ? `<p class="admin-subscription-limit-note">Showing first ${MAX_RENDERED_CONTRACTS} of ${rows.length} matching contracts. Narrow the filters to inspect the remainder.</p>`
      : "";
    return `${content}${clipped}`;
  }

  function renderDetailValue(label, value, options = {}) {
    return `<div><dt>${escapeHtml(label)}</dt><dd>${options.html ? value : escapeHtml(value ?? "—")}</dd></div>`;
  }

  function renderEntitlementPanel(row = {}) {
    const summary = resolveSelectedEntitlements(row);
    const resolvedStatus = row.entitlementStatus || summary.status;
    const combinedReasons = [...new Set([
      ...(Array.isArray(row.entitlementReasonCodes) ? row.entitlementReasonCodes : []),
      ...(Array.isArray(summary.reasons) ? summary.reasons : [])
    ].map(token).filter(Boolean))];
    const entries = summary.entries.length
      ? summary.entries.map((entry) => `
          <li>
            <span>${escapeHtml(entry.code)}</span>
            ${renderBadge(entry.allowed ? "ACTIVE" : entry.status, entry.allowed ? "active" : stateTone(entry.status))}
          </li>
        `).join("")
      : `<li class="is-empty">No entitlement codes are declared for this package.</li>`;
    const reasons = combinedReasons.length
      ? `<div class="admin-subscription-reasons"><b>Resolver reasons</b>${combinedReasons.map((reason) => `<span>${escapeHtml(reason)}</span>`).join("")}</div>`
      : "";
    return `
      <section class="admin-subscription-profile-section">
        <header><p class="kicker">ENTITLEMENT RESOLUTION</p>${renderBadge(resolvedStatus)}</header>
        <ul class="admin-subscription-entitlement-list">${entries}</ul>
        ${reasons}
      </section>
    `;
  }

  function getEligibleTargets(row = {}) {
    const api = app.SubscriptionAPI;
    const currentValue = `${row.target.type}::${row.target.id}`;
    let targets = [];
    if (api?.getEligibleSubscriptionTargets) {
      const policy = row.catalog?.targetPolicy || {};
      const allowedTypes = Array.isArray(policy.allowedTargetTypes) && policy.allowedTargetTypes.length
        ? policy.allowedTargetTypes
        : [row.target.type || "CITIZEN"];
      targets = allowedTypes.flatMap((targetType) => api.getEligibleSubscriptionTargets({
        citizenId: row.citizenId,
        subscriptionCatalogId: row.catalogId,
        tierId: row.tierId,
        targetType,
        includeIneligible: true,
        includeCancelled: true
      }) || []);
    }
    const options = targets.map((candidate) => {
      const target = candidate.coverageTarget || {};
      const value = `${token(target.type)}::${String(target.id || "")}`;
      const item = target.type === "ITEM_INSTANCE" ? app.getItemInstanceById?.(target.id) : null;
      const label = target.type === "CITIZEN"
        ? row.citizenName
        : (item?.playerLabel || item?.customName || item?.name || item?.definitionId || target.id || "ITEM INSTANCE");
      return { value, label: `${target.type} / ${label}`, valid: candidate.valid === true, available: candidate.available !== false, reasons: candidate.errors || candidate.reasons || [] };
    });
    if (!options.some((entry) => entry.value === currentValue)) {
      options.unshift({ value: currentValue, label: `${row.target.type} / ${row.target.label}`, valid: true, available: true, reasons: [] });
    }
    return options;
  }

  function renderHistory(row = {}) {
    const history = Array.isArray(row.contract.billingHistory) ? row.contract.billingHistory.slice(-5).reverse() : [];
    const metadata = row.contract.metadata && typeof row.contract.metadata === "object" ? row.contract.metadata : {};
    if (!history.length && !metadata.lastCommand) {
      return `<div class="admin-subscription-history-empty">No billing or administrative history is recorded.</div>`;
    }
    return `
      <div class="admin-subscription-history-list">
        ${metadata.lastCommand ? `<article><b>${escapeHtml(metadata.lastCommand)}</b><span>${escapeHtml(metadata.lastCommandAt || "—")}</span><small>${escapeHtml(metadata.lastCommandBy || "SYSTEM")}</small></article>` : ""}
        ${history.map((entry) => `<article><b>${escapeHtml(entry.status || entry.type || "BILLING")}</b><span>${escapeHtml(entry.date || entry.at || entry.createdAt || "—")}</span><small>${escapeHtml(formatCredits(entry.amount || 0))}</small></article>`).join("")}
      </div>
    `;
  }

  function getActionAvailability(row = {}, action = "", context = {}) {
    const normalizedAction = token(action);
    const cancelled = row.contractStatus === "CANCELLED";
    const suspended = row.billingStatus === "SUSPENDED";
    if (cancelled) return { enabled: false, reason: "Cancelled contracts are read-only. Create a new contract for further coverage." };
    if (normalizedAction === "PAY" && row.billingStatus === "PAID") return { enabled: false, reason: "The current period is already paid." };
    if (["PAY", "BILLING"].includes(normalizedAction) && suspended) return { enabled: false, reason: "Resume the contract before changing Billing or processing payment." };
    if (normalizedAction === "SUSPEND" && suspended) return { enabled: false, reason: "The contract is already suspended." };
    if (normalizedAction === "RESUME" && !suspended) return { enabled: false, reason: "Only suspended contracts can be resumed." };
    if (normalizedAction === "TIER" && Number(context.alternativeCount || 0) <= 0) return { enabled: false, reason: "No alternative active tier is available." };
    if (normalizedAction === "TARGET" && Number(context.alternativeCount || 0) <= 0) return { enabled: false, reason: "No alternative eligible coverage target is available." };
    return { enabled: true, reason: "" };
  }

  function renderActionAvailabilityHint(availability = {}) {
    return availability.enabled || !availability.reason
      ? ""
      : `<small class="admin-subscription-action-hint">${escapeHtml(availability.reason)}</small>`;
  }

  function renderManagement(row = {}) {
    const catalogTiers = (Array.isArray(row.catalog?.tiers) ? row.catalog.tiers : [])
      .filter((tier) => tier.active !== false && tier.archived !== true);
    const targetOptions = getEligibleTargets(row);
    const currentTargetValue = `${row.target.type}::${row.target.id}`;
    const alternativeTiers = catalogTiers.filter((tier) => String(tier.tierId || tier.id || "") !== row.tierId);
    const alternativeTargets = targetOptions.filter((entry) => entry.valid && entry.available !== false && entry.value !== currentTargetValue);
    const tierAvailability = getActionAvailability(row, "TIER", { alternativeCount: alternativeTiers.length });
    const billingAvailability = getActionAvailability(row, "BILLING");
    const targetAvailability = getActionAvailability(row, "TARGET", { alternativeCount: alternativeTargets.length });
    const payAvailability = getActionAvailability(row, "PAY");
    const suspendAvailability = getActionAvailability(row, "SUSPEND");
    const resumeAvailability = getActionAvailability(row, "RESUME");
    const cancelAvailability = getActionAvailability(row, "CANCEL");
    const suspended = row.billingStatus === "SUSPENDED";
    return `
      <section class="admin-subscription-profile-section admin-subscription-management">
        <header><p class="kicker">ADMINISTRATIVE ACTIONS</p><span>All mutations use SubscriptionAPI.</span></header>
        <label class="admin-subscription-note">Operator note
          <textarea rows="3" data-admin-subscriptions-note placeholder="Required for every administrative mutation."></textarea>
        </label>
        <div class="admin-subscription-action-grid">
          <form data-admin-subscriptions-action-form="TIER" data-contract-id="${escapeHtml(row.contractId)}">
            <label>Tier
              <select name="tierId" ${tierAvailability.enabled ? "" : "disabled"}>
                ${catalogTiers.map((tier) => option(String(tier.tierId || tier.id || ""), `${tier.label || tier.tierId} / ${formatCredits(tier.amount || 0)}`, row.tierId)).join("")}
              </select>
            </label>
            <button type="submit" ${tierAvailability.enabled ? "" : `disabled aria-disabled="true" title="${escapeHtml(tierAvailability.reason)}"`}>Apply Tier</button>
            ${renderActionAvailabilityHint(tierAvailability)}
          </form>
          <form data-admin-subscriptions-action-form="BILLING" data-contract-id="${escapeHtml(row.contractId)}">
            <label>Billing state
              <select name="billingStatus" ${billingAvailability.enabled ? "" : "disabled"}>
                ${["PAID", "PENDING", "OVERDUE"].map((status) => option(status, status, row.billingStatus)).join("")}
              </select>
            </label>
            <button type="submit" ${billingAvailability.enabled ? "" : `disabled aria-disabled="true" title="${escapeHtml(billingAvailability.reason)}"`}>Apply Billing</button>
            ${renderActionAvailabilityHint(billingAvailability)}
          </form>
          <form data-admin-subscriptions-action-form="TARGET" data-contract-id="${escapeHtml(row.contractId)}">
            <label>Coverage target
              <select name="coverageTarget" ${targetAvailability.enabled ? "" : "disabled"}>
                ${targetOptions.map((entry) => `<option value="${escapeHtml(entry.value)}" ${entry.value === currentTargetValue ? "selected" : ""} ${!entry.valid || entry.available === false ? "disabled" : ""}>${escapeHtml(entry.label)}${entry.available ? "" : " / IN USE"}${entry.valid ? "" : " / INVALID"}</option>`).join("")}
              </select>
            </label>
            <button type="submit" ${targetAvailability.enabled ? "" : `disabled aria-disabled="true" title="${escapeHtml(targetAvailability.reason)}"`}>Rebind Target</button>
            ${renderActionAvailabilityHint(targetAvailability)}
          </form>
          <div class="admin-subscription-command-row">
            <span class="admin-subscription-command-control">
              <button type="button" data-admin-subscriptions-command="PAY" data-contract-id="${escapeHtml(row.contractId)}" ${payAvailability.enabled ? "" : `disabled aria-disabled="true" title="${escapeHtml(payAvailability.reason)}"`}>Process Payment</button>
              ${renderActionAvailabilityHint(payAvailability)}
            </span>
            <span class="admin-subscription-command-control">
              ${suspended
                ? `<button type="button" data-admin-subscriptions-command="RESUME" data-contract-id="${escapeHtml(row.contractId)}" ${resumeAvailability.enabled ? "" : `disabled aria-disabled="true" title="${escapeHtml(resumeAvailability.reason)}"`}>Resume Contract</button>${renderActionAvailabilityHint(resumeAvailability)}`
                : `<button type="button" data-admin-subscriptions-command="SUSPEND" data-contract-id="${escapeHtml(row.contractId)}" ${suspendAvailability.enabled ? "" : `disabled aria-disabled="true" title="${escapeHtml(suspendAvailability.reason)}"`}>Suspend Contract</button>${renderActionAvailabilityHint(suspendAvailability)}`}
            </span>
            <span class="admin-subscription-command-control">
              <button class="is-danger" type="button" data-admin-subscriptions-command="CANCEL" data-contract-id="${escapeHtml(row.contractId)}" ${cancelAvailability.enabled ? "" : `disabled aria-disabled="true" title="${escapeHtml(cancelAvailability.reason)}"`}>Cancel Contract</button>
              ${renderActionAvailabilityHint(cancelAvailability)}
            </span>
          </div>
        </div>
      </section>
    `;
  }

  function renderContractProfile(row = null) {
    if (!row) {
      return `<div class="admin-subscription-empty admin-subscription-empty--profile">Select a contract to inspect Billing, target, entitlements and administrative actions.</div>`;
    }
    const targetValidation = app.SubscriptionAPI?.validateSubscriptionTarget?.({
      citizenId: row.citizenId,
      subscriptionCatalogId: row.catalogId,
      tierId: row.tierId,
      coverageTarget: row.contract.coverageTarget,
      catalog: row.catalog
    }) || { valid: true, errors: [], reasons: [] };
    const targetReasons = [...new Set([...(targetValidation.errors || []), ...(targetValidation.reasons || []).map((reason) => reason.code || reason)].map(token).filter(Boolean))];

    return `
      <article class="admin-subscription-profile" data-admin-subscriptions-profile="${escapeHtml(row.contractId)}">
        <header class="admin-subscription-profile__hero">
          <div>
            <p class="kicker">CONTRACT PROFILE / ${escapeHtml(row.market)}</p>
            <h5>${escapeHtml(row.title)}</h5>
            <span>${escapeHtml(row.provider)}</span>
          </div>
          <div class="admin-subscription-profile__states">
            ${renderBadge(row.contractStatus)}
            ${renderBadge(row.billingStatus)}
            ${renderBadge(row.entitlementStatus)}
          </div>
        </header>

        <section class="admin-subscription-profile-section">
          <header><p class="kicker">CONTRACT STATUS</p><span>Revision ${escapeHtml(String(row.contract.revision || 1))}</span></header>
          <dl class="admin-subscription-detail-grid">
            ${renderDetailValue("Citizen", row.citizenName)}
            ${renderDetailValue("Citizen ID", row.citizenShortId)}
            ${renderDetailValue("Contract ID", row.contractId)}
            ${renderDetailValue("Catalog ID", row.catalogId || "—")}
            ${renderDetailValue("Provider", row.provider)}
            ${renderDetailValue("Tier", row.tierLabel)}
            ${renderDetailValue("Started", row.contract.startedAt || row.contract.startDate || "—")}
            ${renderDetailValue("Period End", row.contract.currentPeriodEnd || row.contract.renewalDate || "—")}
            ${renderDetailValue("Grace End", row.contract.gracePeriodEndsAt || "—")}
            ${renderDetailValue("Access", row.entitlementAllowed ? "ALLOWED" : "BLOCKED")}
            ${renderDetailValue("Evaluated At", row.entitlementEvaluatedAt || "—")}
          </dl>
        </section>

        <section class="admin-subscription-profile-section">
          <header><p class="kicker">BILLING</p>${renderBadge(row.billingStatus)}</header>
          <dl class="admin-subscription-detail-grid">
            ${renderDetailValue("Weekly Cost", formatCredits(row.amount))}
            ${renderDetailValue("Cycle", row.contract.billingCycle || row.tier?.billingCycle || "WEEKLY")}
            ${renderDetailValue("Last Paid", row.contract.lastPaidAt || "—")}
            ${renderDetailValue("Last Billed", row.contract.lastBilledAt || "—")}
            ${renderDetailValue("Last Amount", formatCredits(row.contract.lastBilledAmount || 0))}
            ${renderDetailValue("Debt Increase", formatCredits(row.contract.lastDebtIncrease || 0))}
          </dl>
        </section>

        <section class="admin-subscription-profile-section">
          <header><p class="kicker">COVERAGE TARGET</p>${renderBadge(targetValidation.valid === true ? "VALID" : "INVALID", targetValidation.valid === true ? "active" : "warning")}</header>
          <dl class="admin-subscription-detail-grid">
            ${renderDetailValue("Type", row.target.type)}
            ${renderDetailValue("Target", row.target.label)}
            ${renderDetailValue("Target ID", row.target.id || "—")}
            ${renderDetailValue("Policy", (row.catalog?.targetPolicy?.allowedTargetTypes || [row.target.type]).join(" / "))}
          </dl>
          ${targetReasons.length ? `<div class="admin-subscription-reasons"><b>Validation reasons</b>${targetReasons.map((reason) => `<span>${escapeHtml(reason)}</span>`).join("")}</div>` : ""}
        </section>

        ${renderEntitlementPanel(row)}

        <section class="admin-subscription-profile-section">
          <header><p class="kicker">PACKAGE DETAILS</p><span>${escapeHtml(row.category)}</span></header>
          <p class="admin-subscription-package-description">${escapeHtml(row.tier?.description || row.catalog?.description || row.contract.displaySnapshot?.description || "No package description is available.")}</p>
          <dl class="admin-subscription-detail-grid">
            ${renderDetailValue("Market", row.market)}
            ${renderDetailValue("Currency", row.contract.currency || row.catalog?.currency || "CREDIT")}
            ${renderDetailValue("Entitlements", row.entitlementCodes.length ? row.entitlementCodes.join(" / ") : "NONE")}
            ${renderDetailValue("Provider ID", row.providerId || "—")}
          </dl>
        </section>

        <section class="admin-subscription-profile-section">
          <header><p class="kicker">HISTORY</p><span>Latest recorded events</span></header>
          ${renderHistory(row)}
        </section>

        ${renderManagement(row)}
      </article>
    `;
  }

  function renderFeedback(state = getState()) {
    const shared = app.SubscriptionActionFeedback?.render?.("ADMIN") || "";
    const fallback = state.feedback?.message
      ? `<div class="admin-subscription-feedback is-${escapeHtml(state.feedback.tone)}" role="status">${escapeHtml(state.feedback.message)}</div>`
      : "";
    return `<div class="subscription-action-feedback-slot admin-subscription-action-feedback-slot" data-subscription-action-feedback-scope="ADMIN">${shared || fallback}</div>`;
  }

  function renderWorkspace({ user } = {}) {
    const allRows = buildContractRows();
    const state = getState();
    const visibleRows = filterContractRows(allRows, state);
    const selectedContractId = ensureSelection(visibleRows, state);
    const selectedRow = visibleRows.find((row) => row.contractId === selectedContractId) || null;
    if (selectedRow?.citizenId) {
      app.adminSelectedCitizenId = selectedRow.citizenId;
      app.adminSelectedCitizenByWorkspace = app.adminSelectedCitizenByWorkspace || {};
      app.adminSelectedCitizenByWorkspace.subscriptions = selectedRow.citizenId;
    }

    const active = allRows.filter((row) => row.contractStatus !== "CANCELLED" && row.billingStatus !== "SUSPENDED").length;
    const attention = allRows.filter(isAttentionRow).length;
    const suspended = allRows.filter((row) => row.billingStatus === "SUSPENDED").length;
    const weekly = allRows.filter((row) => row.contractStatus !== "CANCELLED").reduce((sum, row) => sum + row.amount, 0);

    return `
      <section class="admin-subscription-summary-grid" aria-label="Subscription contract summary">
        ${renderMetric("Contracts", String(allRows.length), `${visibleRows.length} match current filters`)}
        ${renderMetric("Active", String(active), "Operational contract records", "active")}
        ${renderMetric("Attention", String(attention), "Pending, overdue or blocked", attention ? "warning" : "active")}
        ${renderMetric("Suspended", String(suspended), "Administrative or billing hold", suspended ? "warning" : "neutral")}
        ${renderMetric("Weekly Exposure", formatCredits(weekly), "All non-cancelled contracts")}
      </section>
      ${renderFeedback(state)}
      <section class="admin-workspace-panel admin-subscription-control-panel">
        <div class="admin-panel-headline admin-subscription-control-panel__headline">
          <div>
            <p class="kicker">ADMIN / SUBSCRIPTION CONTROL</p>
            <h5>Contracts, Billing, Targets and Entitlements</h5>
          </div>
          <button class="admin-inline-button" type="button" data-admin-open-module="subscriptions">Open Player Module</button>
        </div>
        ${renderFilters(allRows, state)}
        <div class="admin-subscription-control-layout">
          <div class="admin-subscription-contract-column" role="listbox" aria-label="Subscription contracts" aria-activedescendant="${selectedContractId ? `admin-subscription-contract-${adminSubscriptionDomId(selectedContractId)}` : ""}">
            ${renderContractGroups(visibleRows, selectedContractId)}
          </div>
          <div class="admin-subscription-profile-column" role="region" aria-label="Selected subscription contract" aria-live="polite">
            ${renderContractProfile(selectedRow)}
          </div>
        </div>
      </section>
    `;
  }

  function renderInspector({ workspace } = {}) {
    const rows = buildContractRows();
    const state = getState();
    const visibleRows = filterContractRows(rows, state);
    const selected = visibleRows.find((row) => row.contractId === state.selectedContractId) || visibleRows[0] || null;
    const attention = rows.filter(isAttentionRow).length;

    return `
      <section class="admin-inspector-block">
        <p class="kicker">ADMIN INSPECTOR</p>
        <h5>${escapeHtml(workspace?.title || "Subscriptions")}</h5>
        <p>Administrative projection over SubscriptionAPI. No direct contract mutation path is introduced.</p>
      </section>
      ${selected ? `
        <section class="admin-inspector-block">
          <p class="kicker">SELECTED CONTRACT</p>
          <div class="admin-selected-record-card">
            <strong>${escapeHtml(selected.title)}</strong>
            <small>${escapeHtml(selected.citizenName)} / ${escapeHtml(selected.provider)}</small>
            <dl class="admin-snapshot-list admin-record-detail-list">
              <div><dt>Billing</dt><dd>${escapeHtml(selected.billingStatus)}</dd></div>
              <div><dt>Entitlement</dt><dd>${escapeHtml(selected.entitlementStatus)}</dd></div>
              <div><dt>Tier</dt><dd>${escapeHtml(selected.tierLabel)}</dd></div>
              <div><dt>Target</dt><dd>${escapeHtml(selected.target.type)}</dd></div>
              <div><dt>Weekly</dt><dd>${escapeHtml(formatCredits(selected.amount))}</dd></div>
            </dl>
          </div>
        </section>
      ` : ""}
      <section class="admin-inspector-block">
        <p class="kicker">WORKSPACE SNAPSHOT</p>
        <dl class="admin-snapshot-list">
          <div><dt>Contracts</dt><dd>${escapeHtml(String(rows.length))}</dd></div>
          <div><dt>Visible</dt><dd>${escapeHtml(String(visibleRows.length))}</dd></div>
          <div><dt>Attention</dt><dd>${escapeHtml(String(attention))}</dd></div>
          <div><dt>Citizen Filter</dt><dd>${escapeHtml(state.citizenId)}</dd></div>
        </dl>
      </section>
      <section class="admin-inspector-block">
        <p class="kicker">COMMAND BOUNDARY</p>
        <ul class="admin-inspector-notes">
          <li>Tier, billing, target, suspend, resume, cancel and payment commands use SubscriptionAPI.</li>
          <li>Billing Store, Citizen records and ItemInstance targets remain read-only dependencies here.</li>
          <li>Every mutation requires an operator note and writes an Admin Audit result.</li>
        </ul>
      </section>
      <section class="admin-inspector-block">
        <p class="kicker">CONTROL ROUTES</p>
        <div class="admin-inspector-actions">
          <button class="admin-inline-button" type="button" data-admin-open-module="subscriptions">Player Subscriptions</button>
          <button class="admin-inline-button" type="button" data-admin-open-workspace="billing">Billing / Settlement</button>
          ${selected ? `<button class="admin-inline-button" type="button" data-admin-open-selected-citizen-card>Selected Citizen Card</button>` : ""}
        </div>
      </section>
    `;
  }

  function commandEnvelope(action = "", row = {}, note = "", user = app.currentUser) {
    const actorId = String(user?.login || user?.id || "").trim();
    const normalizedNote = String(note || "").trim();
    if (!actorId) return { ok: false, resultCode: "ACTOR_REQUIRED" };
    if (token(user?.role) !== "ADMIN") return { ok: false, resultCode: "ADMIN_ROLE_REQUIRED" };
    if (!normalizedNote) return { ok: false, resultCode: "REASON_REQUIRED" };
    const uuid = window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return {
      ok: true,
      actorId,
      reason: normalizedNote,
      source: "ADMIN_SUBSCRIPTIONS_CONTROL",
      idempotencyKey: `admin:subscriptions:${String(action || "command").toLowerCase()}:${row.contractId}:${uuid}`,
      metadata: { adminNote: normalizedNote, sourceCommand: `ADMIN_SUBSCRIPTION_${token(action)}` }
    };
  }

  function getResultCode(result = {}) {
    return token(result.resultCode || result.errorCode || result.error?.code || result.reason || "SUBSCRIPTION_ADMIN_COMMAND_FAILED");
  }

  function appendAudit(user, row, action, command, result) {
    const success = result?.ok === true;
    app.appendAdminAuditEvent?.({
      category: "SUBSCRIPTION",
      action: success ? `SUBSCRIPTION_${token(action)}_APPLIED` : `SUBSCRIPTION_${token(action)}_FAILED`,
      sourceCommand: `ADMIN_SUBSCRIPTION_${token(action)}`,
      citizenId: row.citizenId,
      recordId: row.contractId,
      target: row.contractId,
      idempotencyKey: command?.idempotencyKey || "",
      resultStatus: success ? "SUCCESS" : "FAILED",
      resultCode: getResultCode(result),
      summary: success
        ? `${row.citizenId} subscription ${row.contractId}: ${action} applied. Note: ${command.reason}`
        : `${row.citizenId} subscription ${row.contractId}: ${action} failed (${getResultCode(result)}).`,
      meta: {
        action,
        note: command?.reason || "",
        idempotencyKey: command?.idempotencyKey || "",
        resultCode: getResultCode(result)
      }
    }, { user });
  }

  function executeCommand(action = "", row = {}, values = {}, note = "", user = app.currentUser) {
    const api = app.SubscriptionAPI;
    if (!api) return { ok: false, resultCode: "SUBSCRIPTION_API_UNAVAILABLE" };
    const command = commandEnvelope(action, row, note, user);
    if (!command.ok) {
      appendAudit(user, row, action, command, command);
      return command;
    }
    const options = {
      reason: command.reason,
      note: command.reason,
      createdBy: command.actorId,
      source: command.source,
      idempotencyKey: command.idempotencyKey,
      metadata: command.metadata
    };
    let result;
    if (action === "TIER") result = api.changeSubscriptionTier?.(row.contractId, values.tierId, options);
    else if (action === "BILLING") result = api.setSubscriptionBillingStatus?.(row.contractId, values.billingStatus, options);
    else if (action === "TARGET") result = api.changeSubscriptionCoverageTarget?.(row.contractId, values.coverageTarget, options);
    else if (action === "PAY") result = api.processSubscriptionBilling?.(row.contractId, { ...options, paymentSource: "CREDITS" });
    else if (action === "SUSPEND") result = api.suspendSubscriptionContract?.(row.contractId, command.reason, options);
    else if (action === "RESUME") result = api.resumeSubscriptionContract?.(row.contractId, { ...options, billingStatus: "PENDING" });
    else if (action === "CANCEL") result = api.cancelSubscriptionContract?.(row.contractId, command.reason, { ...options, waiveCharge: true });
    else result = { ok: false, resultCode: "SUBSCRIPTION_ADMIN_ACTION_UNKNOWN" };
    result = result || { ok: false, resultCode: "SUBSCRIPTION_ADMIN_COMMAND_NO_RESULT" };
    appendAudit(user, row, action, command, result);
    return result;
  }

  function getRowById(contractId = "") {
    return buildContractRows().find((row) => row.contractId === String(contractId || "")) || null;
  }

  function getSharedNote(container) {
    return String(container.querySelector("[data-admin-subscriptions-note]")?.value || "").trim();
  }

  function getTransientState() {
    const current = app.adminSubscriptionUiTransient && typeof app.adminSubscriptionUiTransient === "object"
      ? app.adminSubscriptionUiTransient
      : {};
    app.adminSubscriptionUiTransient = current;
    return current;
  }

  function captureScrollPosition() {
    const scrollY = Number(window.scrollY || window.pageYOffset || 0);
    if (Number.isFinite(scrollY)) getTransientState().pendingScrollY = Math.max(0, scrollY);
  }

  function restoreScrollPosition() {
    if (typeof window.scrollTo !== "function") return;
    const transient = getTransientState();
    if (!Number.isFinite(Number(transient.pendingScrollY))) return;
    const scrollY = Math.max(0, Number(transient.pendingScrollY));
    delete transient.pendingScrollY;
    const restore = () => window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
    if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(restore);
    else window.setTimeout(restore, 0);
  }

  function restoreInteractionFocus(container) {
    const transient = getTransientState();
    const contractId = String(transient.pendingFocusContractId || "");
    const selector = String(transient.pendingFocusSelector || "");
    delete transient.pendingFocusContractId;
    delete transient.pendingFocusSelector;

    let target = null;
    if (contractId) {
      target = Array.from(container.querySelectorAll("[data-admin-subscriptions-select]"))
        .find((candidate) => String(candidate.dataset.adminSubscriptionsSelect || "") === contractId) || null;
    } else if (selector) {
      try {
        target = container.querySelector(selector);
      } catch (_error) {
        target = null;
      }
    }

    if (target && typeof target.focus === "function") target.focus({ preventScroll: true });
  }

  function rerender(user = app.currentUser, focus = {}) {
    captureScrollPosition();
    const transient = getTransientState();
    if (focus.contractId) transient.pendingFocusContractId = String(focus.contractId);
    if (focus.selector) transient.pendingFocusSelector = String(focus.selector);
    app.renderAdminControlCenter?.(user, "subscriptions");
  }

  function getCommandPreview(action = "", row = {}, values = {}) {
    const normalizedAction = token(action);
    if (normalizedAction === "TIER") {
      const tier = getTier(row.catalog || {}, values.tierId);
      return {
        title: "APPLY SUBSCRIPTION TIER",
        message: `Change ${row.title} for ${row.citizenName} from ${row.tierLabel} to ${tier?.label || values.tierId || "the selected tier"}? Billing will return to the command-defined state.`,
        confirmLabel: "Apply Tier",
        tone: "default"
      };
    }
    if (normalizedAction === "BILLING") return { title: "UPDATE BILLING STATUS", message: `Set ${row.title} for ${row.citizenName} to ${values.billingStatus}? Entitlement projection may change immediately.`, confirmLabel: "Apply Billing", tone: "warning" };
    if (normalizedAction === "TARGET") return { title: "REBIND COVERAGE TARGET", message: `Bind ${row.title} to ${values.coverageTarget?.type}:${values.coverageTarget?.id}? Entitlement will be recalculated for the exact target.`, confirmLabel: "Rebind Target", tone: "warning" };
    if (normalizedAction === "PAY") return { title: "PROCESS SUBSCRIPTION PAYMENT", message: `Process the current payable amount for ${row.title} using Citizen Credits?`, confirmLabel: "Process Payment", tone: "default" };
    if (normalizedAction === "SUSPEND") return { title: "SUSPEND CONTRACT", message: `Suspend ${row.title} for ${row.citizenName}? Billing and entitlement will enter a held state.`, confirmLabel: "Suspend", tone: "warning" };
    if (normalizedAction === "RESUME") return { title: "RESUME CONTRACT", message: `Resume ${row.title} for ${row.citizenName} and return Billing to pending?`, confirmLabel: "Resume", tone: "default" };
    if (normalizedAction === "CANCEL") return { title: "CANCEL CONTRACT", message: `Cancel ${row.title} for ${row.citizenName}? This contract becomes archived and cannot be resumed from this panel.`, confirmLabel: "Cancel Contract", tone: "danger" };
    return { title: "CONFIRM SUBSCRIPTION COMMAND", message: `Apply ${normalizedAction} to ${row.title} for ${row.citizenName}?`, confirmLabel: "Confirm", tone: "default" };
  }

  function handleResult(result, action, user, row = {}, context = {}, release = () => {}) {
    const descriptor = app.SubscriptionActionFeedback?.present?.("ADMIN", action, result, context) || null;
    if (!result?.ok) {
      release();
      if (!descriptor) {
        const code = getResultCode(result);
        setState({ feedback: { tone: "error", message: `${action} failed: ${code}.` } });
        rerender(user);
      }
      return descriptor;
    }
    setState({ feedback: null });
    rerender(user);
    return descriptor;
  }

  function bind(container, user = app.currentUser) {
    if (!container) return;

    const contractListbox = container.querySelector('.admin-subscription-contract-column[role="listbox"]');
    contractListbox?.addEventListener("keydown", (event) => {
      if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      const options = Array.from(contractListbox.querySelectorAll('[role="option"][data-admin-subscriptions-select]'));
      if (!options.length) return;
      const currentIndex = Math.max(0, options.indexOf(document.activeElement));
      let nextIndex = currentIndex;
      if (event.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - 1);
      if (event.key === "ArrowDown") nextIndex = Math.min(options.length - 1, currentIndex + 1);
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = options.length - 1;
      event.preventDefault();
      options[nextIndex]?.click();
    });

    container.querySelectorAll("[data-admin-subscriptions-select]").forEach((button) => {
      button.addEventListener("click", () => {
        const contractId = String(button.dataset.adminSubscriptionsSelect || "");
        const row = getRowById(contractId);
        setState({ selectedContractId: contractId, feedback: null });
        if (row?.citizenId) {
          app.adminSelectedCitizenId = row.citizenId;
          app.adminSelectedCitizenByWorkspace = app.adminSelectedCitizenByWorkspace || {};
          app.adminSelectedCitizenByWorkspace.subscriptions = row.citizenId;
        }
        rerender(user, { contractId });
      });
    });

    container.querySelector("[data-admin-subscriptions-filter-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      setState({
        query: String(data.get("query") || ""),
        citizenId: String(data.get("citizenId") || "ALL"),
        providerId: String(data.get("providerId") || "ALL"),
        subscriptionCatalogId: String(data.get("subscriptionCatalogId") || "ALL"),
        billingStatus: String(data.get("billingStatus") || "ALL"),
        entitlementStatus: String(data.get("entitlementStatus") || "ALL"),
        targetType: String(data.get("targetType") || "ALL"),
        tierId: String(data.get("tierId") || "ALL"),
        sort: String(data.get("sort") || "ATTENTION"),
        selectedContractId: "",
        feedback: null
      });
      rerender(user, { selector: '[name="query"]' });
    });

    container.querySelector("[data-admin-subscriptions-clear-filters]")?.addEventListener("click", () => {
      setState({ ...DEFAULT_STATE, selectedContractId: getState().selectedContractId });
      rerender(user, { selector: '[name="query"]' });
    });

    container.querySelectorAll("[data-admin-subscriptions-action-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (app.SubscriptionActionFeedback?.isBusy?.(form)) return;
        const action = String(form.dataset.adminSubscriptionsActionForm || "").toUpperCase();
        const contractId = String(form.dataset.contractId || "");
        const row = getRowById(contractId);
        if (!row) return handleResult({ ok: false, resultCode: "SUBSCRIPTION_CONTRACT_NOT_FOUND" }, action, user);
        const note = getSharedNote(container);
        const data = new FormData(form);
        let values = {};
        if (action === "TIER") values = { tierId: String(data.get("tierId") || "") };
        if (action === "BILLING") values = { billingStatus: String(data.get("billingStatus") || "") };
        if (action === "TARGET") {
          const [type, ...idParts] = String(data.get("coverageTarget") || "").split("::");
          values = { coverageTarget: { type, id: idParts.join("::") } };
        }
        const preview = getCommandPreview(action, row, values);
        const confirmed = await app.confirmAction?.({ ...preview, cancelLabel: "Cancel" });
        if (!confirmed) return;
        const release = app.SubscriptionActionFeedback?.lock?.(form, "PROCESSING...") || (() => {});
        let result;
        try {
          result = executeCommand(action, row, values, note, user);
        } catch (error) {
          result = { ok: false, resultCode: error?.code || "SUBSCRIPTION_ADMIN_COMMAND_EXCEPTION" };
        }
        handleResult(result, action, user, row, {
          packageLabel: action === "TIER" ? values.tierId : "",
          targetLabel: action === "TARGET" ? `${values.coverageTarget?.type}:${values.coverageTarget?.id}` : ""
        }, release);
      });
    });

    container.querySelectorAll("[data-admin-subscriptions-command]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (app.SubscriptionActionFeedback?.isBusy?.(button)) return;
        const action = String(button.dataset.adminSubscriptionsCommand || "").toUpperCase();
        const contractId = String(button.dataset.contractId || "");
        const row = getRowById(contractId);
        if (!row) return handleResult({ ok: false, resultCode: "SUBSCRIPTION_CONTRACT_NOT_FOUND" }, action, user);
        const note = getSharedNote(container);
        const preview = getCommandPreview(action, row, {});
        const confirmed = await app.confirmAction?.({ ...preview, cancelLabel: "Cancel" });
        if (!confirmed) return;
        const release = app.SubscriptionActionFeedback?.lock?.(button, "PROCESSING...") || (() => {});
        let result;
        try {
          result = executeCommand(action, row, {}, note, user);
        } catch (error) {
          result = { ok: false, resultCode: error?.code || "SUBSCRIPTION_ADMIN_COMMAND_EXCEPTION" };
        }
        handleResult(result, action, user, row, {}, release);
      });
    });

    restoreScrollPosition();
    restoreInteractionFocus(container);
  }

  app.AdminSubscriptionsControl = Object.freeze({
    version: VERSION,
    maxRenderedContracts: MAX_RENDERED_CONTRACTS,
    getState,
    setState,
    normalizeSearchText,
    captureScrollPosition,
    restoreScrollPosition,
    getContractEntitlementSnapshot,
    buildContractRows,
    filterContractRows,
    renderWorkspace,
    renderInspector,
    executeCommand,
    bind
  });
})(window.WS_APP);
