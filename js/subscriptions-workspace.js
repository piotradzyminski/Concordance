window.WS_APP = window.WS_APP || {};

(function initSubscriptionsWorkspace() {
  const app = window.WS_APP;
  if (app.subscriptionWorkspace?.version === "subscriptions_responsive_accessibility_4_5") return;
  const legacySubscriptionsRenderer = app.renderSubscriptionsModuleLegacy || app.renderSubscriptionsModule;
  app.renderSubscriptionsModuleLegacy = legacySubscriptionsRenderer;
  const CATALOG_SECTION_LIMIT = 6;

  const WORKSPACE_VIEWS = ["OVERVIEW", "CONTRACTS", "CATALOG", "PROVIDERS"];
  const DEFAULT_FILTERS = {
    query: "",
    group: "ALL",
    category: "ALL",
    providerId: "ALL",
    market: "ALL",
    status: "OPEN",
    targetType: "ALL",
    maxPrice: "",
    sort: "RELEVANCE"
  };

  const SUBSCRIPTION_GROUPS = [
    {
      id: "BODY_SURVIVAL",
      title: "Body & Survival",
      description: "Medical continuity, nutrition, hygiene, rest and post-life services.",
      categories: ["INSURANCE", "FOOD", "HYGIENE", "REST", "AFTERLIFE"]
    },
    {
      id: "ACCESS_INFRASTRUCTURE",
      title: "Access & Infrastructure",
      description: "Housing, transport and network access required for daily participation.",
      categories: ["RENT", "TRANSPORT", "CYBERSECURITY"]
    },
    {
      id: "PROTECTION_ASSETS",
      title: "Protection & Assets",
      description: "Protection, cyberware support and asset-linked technical services.",
      categories: ["LIVESECURITY", "CYBERWARE", "MASS_COMPRESSION"]
    },
    {
      id: "DEVELOPMENT_OTHER",
      title: "Development & Other",
      description: "Education, specialist access and uncategorized contracted services.",
      categories: ["EDUCATION", "OTHER"]
    }
  ];

  let searchRenderTimer = 0;

  const BILLING_ATTENTION_STATUSES = new Set(["PENDING", "OVERDUE", "SUSPENDED"]);
  const ENTITLEMENT_ATTENTION_STATUSES = new Set(["PENDING", "SUSPENDED", "BLOCKED", "REVOKED", "INVALID", "PARTIAL"]);

  function escapeWorkspaceHtml(value = "") {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeSearchText(value = "") {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[Łł]/g, "l")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function token(value = "", fallback = "") {
    const normalized = String(value || fallback).trim().toUpperCase().replace(/[\s-]+/g, "_");
    return normalized || fallback;
  }

  function parseCredits(value) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
    const parsed = Number(String(value || "").replace(/[^0-9,.-]/g, "").replace(/,/g, "."));
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
  }

  function formatCredits(value) {
    if (typeof app.formatCredits === "function") return app.formatCredits(parseCredits(value));
    return `${parseCredits(value).toLocaleString("pl-PL")} ₡`;
  }

  function getWorkspaceScrollStore() {
    const current = app.subscriptionWorkspaceScrollPositions && typeof app.subscriptionWorkspaceScrollPositions === "object"
      ? app.subscriptionWorkspaceScrollPositions
      : {};
    app.subscriptionWorkspaceScrollPositions = current;
    return current;
  }

  function captureWorkspaceScroll(view = "") {
    const mounted = document.querySelector?.("[data-subscription-workspace-root]");
    const resolvedView = token(
      view
      || mounted?.dataset?.subscriptionWorkspaceRootView
      || app.subscriptionUiState?.view
      || "OVERVIEW",
      "OVERVIEW"
    );
    if (!WORKSPACE_VIEWS.includes(resolvedView)) return;
    const scrollY = Number(window.scrollY || window.pageYOffset || 0);
    if (!Number.isFinite(scrollY)) return;
    getWorkspaceScrollStore()[resolvedView] = Math.max(0, scrollY);
  }

  function restoreWorkspaceScroll(view = "OVERVIEW") {
    if (typeof window.scrollTo !== "function") return;
    const scrollY = Number(getWorkspaceScrollStore()[token(view, "OVERVIEW")] || 0);
    const restore = () => window.scrollTo({ top: Math.max(0, scrollY), left: 0, behavior: "auto" });
    if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(restore);
    else window.setTimeout(restore, 0);
  }

  function cancelScheduledWorkspaceRender() {
    if (searchRenderTimer) window.clearTimeout(searchRenderTimer);
    searchRenderTimer = 0;
  }

  function getWorkspaceState(patch = null) {
    const current = app.subscriptionUiState && typeof app.subscriptionUiState === "object"
      ? app.subscriptionUiState
      : {};
    const requestedView = token(patch?.view || current.view || "OVERVIEW");
    const next = {
      ...DEFAULT_FILTERS,
      ...current,
      ...(patch || {}),
      view: WORKSPACE_VIEWS.includes(requestedView) ? requestedView : "OVERVIEW",
      expandedCatalogSections: Array.isArray(patch?.expandedCatalogSections)
        ? [...patch.expandedCatalogSections]
        : Array.isArray(current.expandedCatalogSections)
          ? [...current.expandedCatalogSections]
          : []
    };
    app.subscriptionUiState = next;
    return next;
  }

  function getCatalog() {
    const catalog = app.getSubscriptionCatalog?.() || [];
    return Array.isArray(catalog) ? catalog.filter((item) => item && item.archived !== true && item.active !== false) : [];
  }

  function getCitizen(user) {
    return app.getCitizenById?.(user?.citizenId) || null;
  }

  function getContracts(user) {
    const citizen = getCitizen(user);
    const source = typeof app.normalizeSubscriptions === "function"
      ? app.normalizeSubscriptions(citizen)
      : Array.isArray(citizen?.subscriptions)
        ? citizen.subscriptions
        : [];
    return Array.isArray(source) ? source : [];
  }

  function getLedger(user) {
    const citizen = getCitizen(user);
    if (typeof app.getCitizenFinancialLedger === "function") return app.getCitizenFinancialLedger(citizen);
    const subscriptions = getContracts(user);
    return {
      subscriptions,
      credits: parseCredits(citizen?.credits),
      incomeTotal: 0,
      debt: parseCredits(citizen?.debt),
      debtLabel: formatCredits(citizen?.debt),
      netCycle: -subscriptions.reduce((sum, item) => sum + parseCredits(item.amount), 0),
      subscriptionTotal: subscriptions.reduce((sum, item) => sum + parseCredits(item.amount), 0),
      paymentStatus: subscriptions.some((item) => ["PENDING", "OVERDUE", "SUSPENDED"].includes(token(item.status))) ? "ACTION REQUIRED" : "PAID"
    };
  }

  function getCategoryMap() {
    const source = app.getSubscriptionCatalogCategories?.() || app.SUBSCRIPTION_CATEGORIES || [];
    const map = new Map();
    (Array.isArray(source) ? source : []).forEach((category) => {
      const id = token(category?.id || category?.category || "OTHER", "OTHER");
      map.set(id, {
        id,
        title: String(category?.title || category?.label || id).trim() || id,
        description: String(category?.description || "").trim(),
        alphaOnly: category?.alphaOnly === true
      });
    });
    if (!map.has("OTHER")) map.set("OTHER", { id: "OTHER", title: "Other", description: "", alphaOnly: false });
    return map;
  }

  function getGroupForCategory(category = "OTHER") {
    const categoryId = token(category, "OTHER");
    return SUBSCRIPTION_GROUPS.find((group) => group.categories.includes(categoryId)) || SUBSCRIPTION_GROUPS[SUBSCRIPTION_GROUPS.length - 1];
  }

  function getProviderId(service = {}) {
    const name = String(service.provider || service.company || "LOCAL LEDGER").trim() || "LOCAL LEDGER";
    const lower = name.toLowerCase();
    if (lower.includes("watch") || lower.includes("w&s")) return "watch-secure";
    if (lower.includes("live") && (lower.includes("prevail") || lower.includes("life"))) return "live-prevail";
    if (lower.includes("trauma")) return "trauma-team";
    if (lower.includes("kagami")) return "kagami-kaisha";
    if (lower.includes("coremed") || lower.includes("core med")) return "coremed";
    if (lower.includes("afterlife")) return "afterlife";
    if (lower.includes("habitat") || lower.includes("housing")) return "habitat-authority";
    if (lower.includes("factory") || lower.includes("common")) return "factory-commons";
    if (lower.includes("perfectmin") || lower.includes("licensed clinic")) return "perfectmin-licensed-clinics";
    return normalizeSearchText(name).replace(/\s+/g, "-") || "local-ledger";
  }

  function getMarket(service = {}) {
    const explicit = token(service.market || service.marketType || service.sourceType || "");
    if (["SYSTEM", "PRIVATE"].includes(explicit)) return explicit;
    const tags = Array.isArray(service.tags) ? service.tags.map((tag) => token(tag)) : [];
    return tags.includes("PRIVATE") && !tags.includes("SYSTEM") ? "PRIVATE" : "SYSTEM";
  }

  function getTargetType(item = {}) {
    const explicit = token(item.coverageTarget?.type || item.targetType || item.coverageTargetType || "");
    if (explicit) return explicit;
    const allowed = item.targetPolicy?.allowedTargetTypes;
    if (Array.isArray(allowed) && allowed.length === 1) return token(allowed[0], "CITIZEN");
    if (Array.isArray(allowed) && allowed.length > 1) return "MIXED";
    return "CITIZEN";
  }

  function getLowestPrice(service = {}) {
    const prices = (Array.isArray(service.tiers) ? service.tiers : [])
      .filter((tier) => tier && tier.archived !== true && tier.active !== false)
      .map((tier) => parseCredits(tier.amount))
      .filter((value) => value > 0);
    return prices.length ? Math.min(...prices) : 0;
  }

  function getHighestPrice(service = {}) {
    const prices = (Array.isArray(service.tiers) ? service.tiers : [])
      .filter((tier) => tier && tier.archived !== true && tier.active !== false)
      .map((tier) => parseCredits(tier.amount))
      .filter((value) => value > 0);
    return prices.length ? Math.max(...prices) : 0;
  }

  function getCatalogId(service = {}) {
    return String(service.subscriptionCatalogId || service.catalogId || service.id || "").trim();
  }

  function getContractCatalogId(contract = {}) {
    return String(contract.subscriptionCatalogId || contract.catalogId || "").trim();
  }
  function getContractStatusAxes(contract = {}) {
    const compatibilityStatus = token(contract.status || "", "");
    const contractStatus = token(
      contract.contractStatus
      || (compatibilityStatus === "CANCELLED" ? "CANCELLED" : "ACTIVE"),
      "ACTIVE"
    );
    const billingStatus = token(
      contract.billingStatus
      || compatibilityStatus
      || (contract.active === true ? "PAID" : "PENDING"),
      "PENDING"
    );
    const entitlementStatus = token(
      contract.entitlementStatus
      || (billingStatus === "PAID" || billingStatus === "ACTIVE" ? "ACTIVE" : billingStatus),
      "PENDING"
    );
    return { contractStatus, billingStatus, entitlementStatus };
  }

  function isContractCancelled(contract = {}) {
    const axes = getContractStatusAxes(contract);
    return axes.contractStatus === "CANCELLED"
      || axes.billingStatus === "CANCELLED"
      || axes.entitlementStatus === "CANCELLED";
  }

  function isContractAttentionRequired(contract = {}) {
    if (isContractCancelled(contract)) return false;
    const axes = getContractStatusAxes(contract);
    return BILLING_ATTENTION_STATUSES.has(axes.billingStatus)
      || ENTITLEMENT_ATTENTION_STATUSES.has(axes.entitlementStatus);
  }

  function getContractDisplayStatus(contract = {}) {
    const axes = getContractStatusAxes(contract);
    if (isContractCancelled(contract)) return "CANCELLED";
    if (BILLING_ATTENTION_STATUSES.has(axes.billingStatus)) return axes.billingStatus;
    if (ENTITLEMENT_ATTENTION_STATUSES.has(axes.entitlementStatus)) return axes.entitlementStatus;
    if (["PAID", "ACTIVE"].includes(axes.billingStatus) && axes.entitlementStatus === "ACTIVE") return axes.billingStatus;
    return axes.billingStatus || axes.entitlementStatus || axes.contractStatus || "PENDING";
  }


  function getCatalogById(catalog = getCatalog()) {
    return new Map(catalog.map((service) => [getCatalogId(service), service]));
  }

  function getTierLabel(contract = {}, catalogById = getCatalogById()) {
    const explicit = String(contract.tierLabel || contract.tier || "").trim();
    if (explicit && token(explicit) !== "NO_TIER") return explicit;
    const service = catalogById.get(getContractCatalogId(contract));
    const tiers = (Array.isArray(service?.tiers) ? service.tiers : []).filter((tier) => tier.archived !== true && tier.active !== false);
    return String(tiers.find((tier) => String(tier.id || tier.tierId) === String(contract.tierId || ""))?.label || "No tier");
  }

  function getContractSearchIndex(contract = {}, catalogById = getCatalogById()) {
    const service = catalogById.get(getContractCatalogId(contract));
    return normalizeSearchText([
      contract.id,
      contract.subscriptionContractId,
      contract.title,
      contract.provider,
      contract.category,
      contract.status,
      contract.contractStatus,
      contract.billingStatus,
      contract.entitlementStatus,
      getTierLabel(contract, catalogById),
      getTargetType(contract),
      contract.coverageTarget?.id,
      service?.domain,
      service?.summary,
      service?.description
    ].filter(Boolean).join(" "));
  }

  function getCatalogSearchIndex(service = {}) {
    return normalizeSearchText([
      getCatalogId(service),
      service.title,
      service.provider,
      service.category,
      service.domain,
      service.market,
      service.summary,
      service.description,
      ...(Array.isArray(service.tags) ? service.tags : []),
      ...(Array.isArray(service.entitlementCodes) ? service.entitlementCodes : []),
      ...(Array.isArray(service.tiers) ? service.tiers.flatMap((tier) => [tier.label, tier.description, tier.amount]) : [])
    ].filter(Boolean).join(" "));
  }

  function getContractStatusGroup(contract = {}) {
    if (isContractCancelled(contract)) return "ARCHIVE";
    if (isContractAttentionRequired(contract)) return "ATTENTION";
    return "ACTIVE";
  }

  function contractMatchesStatus(contract = {}, statusFilter = "OPEN") {
    const filter = token(statusFilter || "OPEN", "OPEN");
    const axes = getContractStatusAxes(contract);
    if (filter === "ALL") return true;
    if (filter === "OPEN") return !isContractCancelled(contract);
    if (filter === "ATTENTION") return isContractAttentionRequired(contract);
    if (filter === "CANCELLED") return isContractCancelled(contract);
    return axes.contractStatus === filter || axes.billingStatus === filter || axes.entitlementStatus === filter;
  }

  function selectVisibleContracts(contracts = [], state = getWorkspaceState(), catalog = getCatalog()) {
    const catalogById = getCatalogById(catalog);
    const query = normalizeSearchText(state.query);
    const providerId = String(state.providerId || "ALL");
    const filtered = (Array.isArray(contracts) ? contracts : []).filter((contract) => {
      const service = catalogById.get(getContractCatalogId(contract));
      const category = token(contract.category || service?.category || "OTHER", "OTHER");
      const market = service ? getMarket(service) : token(contract.market || "SYSTEM", "SYSTEM");
      return contractMatchesStatus(contract, state.status)
        && (state.category === "ALL" || category === state.category)
        && (state.market === "ALL" || market === state.market)
        && (state.targetType === "ALL" || getTargetType(contract) === state.targetType)
        && (providerId === "ALL" || getProviderId(service || contract) === providerId)
        && (!query || getContractSearchIndex(contract, catalogById).includes(query));
    });

    const statusOrder = { OVERDUE: 0, SUSPENDED: 1, PENDING: 2, PAID: 3, ACTIVE: 3, CANCELLED: 9 };
    return filtered.sort((a, b) => {
      const sort = token(state.sort || "STATUS", "STATUS");
      if (sort === "NAME") return String(a.title || "").localeCompare(String(b.title || ""), "pl");
      if (sort === "PROVIDER") return String(a.provider || "").localeCompare(String(b.provider || ""), "pl") || String(a.title || "").localeCompare(String(b.title || ""), "pl");
      if (sort === "PRICE_ASC") return parseCredits(a.amount) - parseCredits(b.amount);
      if (sort === "PRICE_DESC") return parseCredits(b.amount) - parseCredits(a.amount);
      const aStatus = getContractDisplayStatus(a);
      const bStatus = getContractDisplayStatus(b);
      return (statusOrder[aStatus] ?? 5) - (statusOrder[bStatus] ?? 5) || String(a.title || "").localeCompare(String(b.title || ""), "pl");
    });
  }

  function selectVisibleCatalogEntries(catalog = [], state = getWorkspaceState()) {
    const query = normalizeSearchText(state.query);
    const maxPrice = parseCredits(state.maxPrice);
    const filtered = (Array.isArray(catalog) ? catalog : []).filter((service) => {
      const category = token(service.category || "OTHER", "OTHER");
      const group = getGroupForCategory(category);
      const price = getLowestPrice(service);
      return (state.group === "ALL" || group.id === state.group)
        && (state.category === "ALL" || category === state.category)
        && (state.market === "ALL" || getMarket(service) === state.market)
        && (state.targetType === "ALL" || getTargetType(service) === state.targetType)
        && (state.providerId === "ALL" || getProviderId(service) === state.providerId)
        && (!maxPrice || (price > 0 && price <= maxPrice))
        && (!query || getCatalogSearchIndex(service).includes(query));
    });

    return filtered.sort((a, b) => {
      const sort = token(state.sort || "RELEVANCE", "RELEVANCE");
      if (sort === "NAME") return String(a.title || "").localeCompare(String(b.title || ""), "pl");
      if (sort === "PROVIDER") return String(a.provider || "").localeCompare(String(b.provider || ""), "pl") || String(a.title || "").localeCompare(String(b.title || ""), "pl");
      if (sort === "PRICE_ASC") return getLowestPrice(a) - getLowestPrice(b);
      if (sort === "PRICE_DESC") return getLowestPrice(b) - getLowestPrice(a);
      const aGroup = SUBSCRIPTION_GROUPS.findIndex((group) => group.id === getGroupForCategory(a.category).id);
      const bGroup = SUBSCRIPTION_GROUPS.findIndex((group) => group.id === getGroupForCategory(b.category).id);
      return aGroup - bGroup || token(a.category).localeCompare(token(b.category)) || String(a.title || "").localeCompare(String(b.title || ""), "pl");
    });
  }

  function buildProviderGroups(catalog = []) {
    const groups = new Map();
    (Array.isArray(catalog) ? catalog : []).forEach((service) => {
      const providerId = getProviderId(service);
      if (!groups.has(providerId)) {
        groups.set(providerId, {
          id: providerId,
          name: String(service.provider || "LOCAL LEDGER").trim() || "LOCAL LEDGER",
          services: [],
          markets: new Set(),
          categories: new Set()
        });
      }
      const group = groups.get(providerId);
      group.services.push(service);
      group.markets.add(getMarket(service));
      group.categories.add(token(service.category || "OTHER", "OTHER"));
    });

    return Array.from(groups.values()).map((group) => {
      const prices = group.services.flatMap((service) => [getLowestPrice(service), getHighestPrice(service)]).filter((value) => value > 0);
      const market = group.markets.size === 1 ? Array.from(group.markets)[0] : "MIXED";
      return {
        ...group,
        market,
        categories: Array.from(group.categories),
        minPrice: prices.length ? Math.min(...prices) : 0,
        maxPrice: prices.length ? Math.max(...prices) : 0,
        searchIndex: normalizeSearchText([
          group.name,
          providerIdToLabel(group.id),
          market,
          ...group.categories,
          ...group.services.flatMap((service) => [service.title, service.summary, service.description, service.domain])
        ].filter(Boolean).join(" "))
      };
    });
  }

  function providerIdToLabel(providerId = "") {
    return String(providerId || "")
      .replace(/^provider-/, "")
      .replace(/[-_]+/g, " ");
  }

  function selectVisibleProviders(providers = [], state = getWorkspaceState()) {
    const query = normalizeSearchText(state.query);
    return (Array.isArray(providers) ? providers : []).filter((provider) => {
      return (state.market === "ALL" || provider.market === state.market || provider.market === "MIXED")
        && (state.category === "ALL" || provider.categories.includes(state.category))
        && (!query || provider.searchIndex.includes(query));
    }).sort((a, b) => {
      const sort = token(state.sort || "NAME", "NAME");
      if (sort === "SERVICES") return b.services.length - a.services.length || a.name.localeCompare(b.name, "pl");
      if (sort === "PRICE_ASC") return a.minPrice - b.minPrice || a.name.localeCompare(b.name, "pl");
      return a.name.localeCompare(b.name, "pl");
    });
  }

  function getProviderOptions(catalog = getCatalog()) {
    return buildProviderGroups(catalog).sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }

  function getCatalogStateLabel(user, service = {}, contracts = getContracts(user)) {
    const category = getCategoryMap().get(token(service.category || "OTHER", "OTHER"));
    const citizenProfile = token(getCitizen(user)?.biologicalProfile || getCitizen(user)?.profile || "");
    if (category?.alphaOnly && !citizenProfile.includes("ALPHA")) return "INELIGIBLE";

    const openContracts = contracts.filter((contract) => getContractCatalogId(contract) === getCatalogId(service) && !isContractCancelled(contract));
    const allowedTargetTypes = Array.isArray(service.targetPolicy?.allowedTargetTypes)
      ? service.targetPolicy.allowedTargetTypes.map((value) => token(value))
      : [getTargetType(service)];
    if (allowedTargetTypes.includes("ITEM_INSTANCE")) return openContracts.length ? "ASSIGN MORE" : "ASSIGNABLE";

    const owned = openContracts[0] || null;
    if (!owned) return "NO CONTRACT";
    const tiers = (Array.isArray(service.tiers) ? service.tiers : []).filter((tier) => tier.archived !== true && tier.active !== false);
    const currentIndex = tiers.findIndex((tier) => String(tier.tierId || tier.id || "") === String(owned.tierId || ""));
    return currentIndex >= 0 && currentIndex < tiers.length - 1 ? "UPGRADE AVAILABLE" : "OWNED";
  }

  function stateClass(value = "") {
    return token(value || "DEFAULT", "DEFAULT").toLowerCase().replace(/_/g, "-");
  }

  function renderLogo(source = {}) {
    const raw = String(source.logo || source.logoImage || source.logoUrl || "").trim();
    const fallback = String(source.provider || source.title || source.category || "?")
      .split(/\s+|&|\+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase() || "?";
    if (/^(https?:|data:image\/|assets\/|\.\/|\/)/i.test(raw) || /\.(png|jpe?g|webp|svg|gif)$/i.test(raw)) {
      return `<span class="subscription-logo has-image" data-fallback="${escapeWorkspaceHtml(fallback)}"><img src="${escapeWorkspaceHtml(raw)}" alt="" onerror="this.parentElement.classList.remove('has-image');this.parentElement.textContent=this.parentElement.dataset.fallback||'?';" /></span>`;
    }
    return `<span class="subscription-logo">${escapeWorkspaceHtml(raw || fallback)}</span>`;
  }

  function renderStateTag(label = "") {
    const normalized = token(label || "STATE", "STATE");
    return `<i class="subscription-workspace-tag subscription-workspace-tag--${escapeWorkspaceHtml(stateClass(normalized))}">${escapeWorkspaceHtml(normalized.replace(/_/g, " "))}</i>`;
  }

  function workspaceDomId(value = "") {
    return String(value || "subscription")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "subscription";
  }

  function getWorkspaceTabId(view = "OVERVIEW") {
    return `subscription-workspace-tab-${workspaceDomId(view)}`;
  }

  function getWorkspacePanelId(view = "OVERVIEW") {
    return `subscription-workspace-panel-${workspaceDomId(view)}`;
  }

  function focusWorkspaceViewTab(view = "OVERVIEW") {
    const tab = document.getElementById?.(getWorkspaceTabId(view));
    if (tab && typeof tab.focus === "function") tab.focus({ preventScroll: true });
  }

  function renderWorkspaceNav(state, counts = {}) {
    const views = [
      {
        id: "OVERVIEW",
        label: "Overview",
        description: "Current cycle, coverage and payment status."
      },
      {
        id: "CONTRACTS",
        label: "Contracts",
        description: "Manage active services, payment and tier changes."
      },
      {
        id: "CATALOG",
        label: "Catalog",
        description: "Browse available services and subscription tiers."
      },
      {
        id: "PROVIDERS",
        label: "Providers",
        description: "Browse providers and their subscription offers."
      }
    ];
    return `
      <nav class="subscription-workspace-nav system-segment-tabs" role="tablist" aria-label="Subscription workspace views">
        ${views.map((view) => `
          <button type="button" id="${getWorkspaceTabId(view.id)}" class="subscription-workspace-nav__item system-segment-tile system-segment-tile--card ${state.view === view.id ? "is-active" : ""}" role="tab" aria-selected="${state.view === view.id ? "true" : "false"}" aria-controls="${getWorkspacePanelId(view.id)}" tabindex="${state.view === view.id ? "0" : "-1"}" data-subscription-workspace-view="${view.id}" aria-current="${state.view === view.id ? "page" : "false"}">
            <span class="system-segment-tile__body">
              <b class="system-segment-tile__title">${escapeWorkspaceHtml(view.label)}</b>
              <small class="system-segment-tile__description">${escapeWorkspaceHtml(view.description)}</small>
            </span>
          </button>
        `).join("")}
      </nav>
    `;
  }

  function renderWorkspaceStatusBar(ledger = {}, contracts = []) {
    const openContracts = contracts.filter((contract) => !isContractCancelled(contract));
    const paid = openContracts.filter((contract) => {
      const axes = getContractStatusAxes(contract);
      return ["PAID", "ACTIVE"].includes(axes.billingStatus) && axes.entitlementStatus === "ACTIVE";
    }).length;
    const attention = openContracts.filter((contract) => isContractAttentionRequired(contract)).length;
    return `
      <section class="subscription-workspace-statusbar" aria-label="Subscription cycle summary">
        <span><small>CYCLE COST</small><b>${escapeWorkspaceHtml(formatCredits(ledger.subscriptionTotal || 0))}</b></span>
        <span><small>OPEN CONTRACTS</small><b>${escapeWorkspaceHtml(openContracts.length)}</b></span>
        <span><small>PAID / ACTIVE</small><b>${escapeWorkspaceHtml(paid)}</b></span>
        <span class="${attention ? "has-attention" : ""}"><small>NEEDS ATTENTION</small><b>${escapeWorkspaceHtml(attention)}</b></span>
        <span><small>NEXT SETTLEMENT</small><b>${escapeWorkspaceHtml(app.getSettlementPeriodEndLabel?.() || app.SETTLEMENT_PERIOD_END_LABEL || "-")}</b></span>
      </section>
    `;
  }

  function getPayableContracts(contracts = []) {
    return contracts.filter((contract) => {
      const axes = getContractStatusAxes(contract);
      return contract.active !== false && !isContractCancelled(contract) && BILLING_ATTENTION_STATUSES.has(axes.billingStatus);
    });
  }

  function renderOverview(user, state, context) {
    const { ledger, contracts, catalogById } = context;
    const openContracts = contracts.filter((contract) => !isContractCancelled(contract));
    const attention = openContracts.filter((contract) => getContractStatusGroup(contract) === "ATTENTION");
    const active = openContracts.filter((contract) => getContractStatusGroup(contract) === "ACTIVE");
    const payableAmount = getPayableContracts(contracts).reduce((sum, contract) => sum + parseCredits(contract.amount), 0);
    const activeCategories = Array.from(new Set(active.map((contract) => token(contract.category || catalogById.get(getContractCatalogId(contract))?.category || "OTHER", "OTHER"))));
    const categoryMap = getCategoryMap();

    return `
      <section class="subscription-workspace-overview" id="${getWorkspacePanelId("OVERVIEW")}" role="tabpanel" aria-labelledby="${getWorkspaceTabId("OVERVIEW")}" tabindex="0" data-subscription-workspace-panel="OVERVIEW">
        <div class="subscription-overview-dashboard">
          <section class="subscription-overview-primary">
            <header>
              <div><p class="kicker">CURRENT PERIOD</p><h5>Billing & continuity</h5></div>
              ${renderStateTag(attention.length ? "ACTION REQUIRED" : "IN ORDER")}
            </header>
            <div class="subscription-overview-metrics">
              <span><small>PAYABLE NOW</small><b>${escapeWorkspaceHtml(formatCredits(payableAmount))}</b></span>
              <span><small>CREDITS</small><b>${escapeWorkspaceHtml(formatCredits(ledger.credits || 0))}</b></span>
              <span><small>DEBT</small><b>${escapeWorkspaceHtml(ledger.debtLabel || formatCredits(ledger.debt || 0))}</b></span>
              <span><small>NET CYCLE</small><b>${escapeWorkspaceHtml(formatCredits(ledger.netCycle || 0))}</b></span>
            </div>
            <div class="subscription-workspace-actions">
              <button type="button" data-subscription-pay="CREDITS" ${payableAmount > 0 ? "" : "disabled"}>Pay current period</button>
              <button type="button" data-subscription-pay="DEBT_ACCOUNT" ${payableAmount > 0 ? "" : "disabled"}>Charge to debt</button>
              <button type="button" class="is-secondary" data-subscription-workspace-view="CONTRACTS">Review contracts</button>
            </div>
          </section>

          <section class="subscription-overview-coverage">
            <header><div><p class="kicker">ACTIVE COVERAGE</p><h5>Coverage domains</h5></div><small>${escapeWorkspaceHtml(activeCategories.length)} DOMAINS</small></header>
            <div class="subscription-overview-domain-list">
              ${activeCategories.length ? activeCategories.map((category) => {
                const count = active.filter((contract) => token(contract.category || catalogById.get(getContractCatalogId(contract))?.category || "OTHER", "OTHER") === category).length;
                return `<button type="button" data-subscription-overview-category="${escapeWorkspaceHtml(category)}"><b>${escapeWorkspaceHtml(categoryMap.get(category)?.title || category)}</b><small>${escapeWorkspaceHtml(count)} active contract${count === 1 ? "" : "s"}</small></button>`;
              }).join("") : '<p class="subscription-workspace-empty">No active coverage registered.</p>'}
            </div>
          </section>
        </div>

        <section class="subscription-workspace-section subscription-workspace-attention">
          <header>
            <div><p class="kicker">NEEDS ATTENTION</p><h5>Contracts requiring action</h5></div>
            <small>${escapeWorkspaceHtml(attention.length)}</small>
          </header>
          <div class="subscription-contract-grid">
            ${attention.length ? attention.slice(0, 6).map((contract) => renderContractCard(contract, catalogById, "OVERVIEW")).join("") : '<p class="subscription-workspace-empty">No overdue, suspended or pending contracts.</p>'}
          </div>
        </section>

        <section class="subscription-workspace-quicklinks">
          <button type="button" data-subscription-workspace-view="CATALOG"><b>Browse catalog</b><small>Compare available services and packages.</small></button>
          <button type="button" data-subscription-workspace-view="PROVIDERS"><b>Provider directory</b><small>Review providers and their service ranges.</small></button>
        </section>
      </section>
    `;
  }

  function renderContractCard(contract = {}, catalogById = getCatalogById(), returnView = "CONTRACTS") {
    const service = catalogById.get(getContractCatalogId(contract));
    const axes = getContractStatusAxes(contract);
    const status = getContractDisplayStatus(contract);
    const entitlementTag = axes.entitlementStatus && axes.entitlementStatus !== status && axes.entitlementStatus !== "ACTIVE"
      ? renderStateTag(axes.entitlementStatus)
      : "";
    const targetType = getTargetType(contract);
    const targetLabel = contract.coverageTarget?.id || contract.targetId || (targetType === "CITIZEN" ? "CITIZEN" : "UNBOUND");
    return `
      <button type="button" class="subscription-contract-card subscription-contract-card--${escapeWorkspaceHtml(stateClass(status))}" data-open-subscription-contract="${escapeWorkspaceHtml(contract.id || contract.subscriptionContractId || "")}" data-return-view="${escapeWorkspaceHtml(returnView)}">
        <span class="subscription-contract-card__identity">
          ${renderLogo({ ...service, ...contract, logo: contract.logo || service?.logo })}
          <span><b>${escapeWorkspaceHtml(contract.title || service?.title || "Subscription")}</b><small>${escapeWorkspaceHtml(contract.provider || service?.provider || "LOCAL LEDGER")}</small></span>
        </span>
        <span class="subscription-contract-card__tags">${renderStateTag(status)}${entitlementTag}${renderStateTag(getTierLabel(contract, catalogById))}</span>
        <span class="subscription-contract-card__meta">
          <span><small>TARGET</small><b>${escapeWorkspaceHtml(targetType)} / ${escapeWorkspaceHtml(targetLabel)}</b></span>
          <span><small>COST</small><b>${escapeWorkspaceHtml(formatCredits(contract.amount))} / ${escapeWorkspaceHtml(contract.cycle || "WEEKLY")}</b></span>
        </span>
      </button>
    `;
  }

  function renderFilterChip(field, label, value) {
    return `<button type="button" class="subscription-filter-chip" data-subscription-clear-filter="${escapeWorkspaceHtml(field)}"><small>${escapeWorkspaceHtml(label)}</small><b>${escapeWorkspaceHtml(value)}</b><i aria-hidden="true">×</i></button>`;
  }

  function renderActiveFilters(state, view) {
    const chips = [];
    if (state.query) chips.push(renderFilterChip("query", "Search", state.query));
    if (state.group !== "ALL" && view === "CATALOG") chips.push(renderFilterChip("group", "Group", SUBSCRIPTION_GROUPS.find((group) => group.id === state.group)?.title || state.group));
    if (state.category !== "ALL") chips.push(renderFilterChip("category", "Category", getCategoryMap().get(state.category)?.title || state.category));
    if (state.providerId !== "ALL" && view !== "PROVIDERS") chips.push(renderFilterChip("providerId", "Provider", providerIdToLabel(state.providerId)));
    if (state.market !== "ALL") chips.push(renderFilterChip("market", "Market", state.market));
    if (state.status !== "OPEN" && view === "CONTRACTS") chips.push(renderFilterChip("status", "Status", state.status));
    if (state.targetType !== "ALL" && view !== "PROVIDERS") chips.push(renderFilterChip("targetType", "Target", state.targetType));
    if (state.maxPrice && view === "CATALOG") chips.push(renderFilterChip("maxPrice", "Max", formatCredits(state.maxPrice)));
    if (!chips.length) return "";
    return `<div class="subscription-active-filters" role="status" aria-label="Active subscription filters">${chips.join("")}<button type="button" class="subscription-clear-filters" data-subscription-clear-filters>Clear filters</button></div>`;
  }

  function renderCommonSearch(value = "", placeholder = "Search subscriptions") {
    return `<label class="subscription-filter-field subscription-filter-field--search"><span>Search</span><input type="search" value="${escapeWorkspaceHtml(value)}" placeholder="${escapeWorkspaceHtml(placeholder)}" data-subscription-filter="query" autocomplete="off" /></label>`;
  }

  function renderSelectField(label, field, value, options = []) {
    return `<label class="subscription-filter-field"><span>${escapeWorkspaceHtml(label)}</span><select data-subscription-filter="${escapeWorkspaceHtml(field)}">${options.map((option) => `<option value="${escapeWorkspaceHtml(option.value)}" ${String(value) === String(option.value) ? "selected" : ""}>${escapeWorkspaceHtml(option.label)}</option>`).join("")}</select></label>`;
  }

  function getCategoryOptions(catalog = getCatalog()) {
    const categoryMap = getCategoryMap();
    const ids = Array.from(new Set(catalog.map((service) => token(service.category || "OTHER", "OTHER"))));
    return ids.sort((a, b) => String(categoryMap.get(a)?.title || a).localeCompare(String(categoryMap.get(b)?.title || b), "pl"));
  }

  function renderContracts(user, state, context) {
    const { contracts, catalog, catalogById } = context;
    const visible = selectVisibleContracts(contracts, state, catalog);
    const providers = getProviderOptions(catalog);
    const categories = getCategoryOptions(catalog);
    const sections = [
      { id: "ATTENTION", title: "Needs Attention", description: "Pending, overdue or suspended contracts." },
      { id: "ACTIVE", title: "Active", description: "Paid and active contracts in the current cycle." },
      { id: "ARCHIVE", title: "Cancelled Archive", description: "Cancelled records retained on the Citizen card." }
    ];

    return `
      <section class="subscription-workspace-panel" id="${getWorkspacePanelId("CONTRACTS")}" role="tabpanel" aria-labelledby="${getWorkspaceTabId("CONTRACTS")}" tabindex="0" data-subscription-workspace-panel="CONTRACTS">
        <section class="subscription-filterbar" aria-label="Contract filters">
          ${renderCommonSearch(state.query, "Name, provider, tier or target")}
          ${renderSelectField("Status", "status", state.status, [
            { value: "OPEN", label: "Open contracts" },
            { value: "ATTENTION", label: "Needs attention" },
            { value: "PAID", label: "Paid" },
            { value: "PENDING", label: "Pending" },
            { value: "OVERDUE", label: "Overdue" },
            { value: "SUSPENDED", label: "Suspended" },
            { value: "CANCELLED", label: "Cancelled" },
            { value: "ALL", label: "All statuses" }
          ])}
          ${renderSelectField("Category", "category", state.category, [{ value: "ALL", label: "All categories" }, ...categories.map((id) => ({ value: id, label: getCategoryMap().get(id)?.title || id }))])}
          ${renderSelectField("Provider", "providerId", state.providerId, [{ value: "ALL", label: "All providers" }, ...providers.map((provider) => ({ value: provider.id, label: provider.name }))])}
          ${renderSelectField("Target", "targetType", state.targetType, [
            { value: "ALL", label: "All targets" },
            { value: "CITIZEN", label: "Citizen" },
            { value: "ITEM_INSTANCE", label: "Item / asset" },
            { value: "MIXED", label: "Mixed" }
          ])}
          ${renderSelectField("Sort", "sort", state.sort, [
            { value: "STATUS", label: "Status" },
            { value: "NAME", label: "Name" },
            { value: "PROVIDER", label: "Provider" },
            { value: "PRICE_ASC", label: "Price: low to high" },
            { value: "PRICE_DESC", label: "Price: high to low" }
          ])}
        </section>
        ${renderActiveFilters(state, "CONTRACTS")}
        <div class="subscription-workspace-results-head" role="status" aria-live="polite" aria-atomic="true"><span><b>${escapeWorkspaceHtml(visible.length)}</b> of ${escapeWorkspaceHtml(contracts.length)} contracts</span>${contracts.some((contract) => isContractCancelled(contract)) ? '<button type="button" data-subscription-clear-cancelled>Clear cancelled</button>' : ""}</div>
        <div class="subscription-contract-sections">
          ${sections.map((section) => {
            const items = visible.filter((contract) => getContractStatusGroup(contract) === section.id);
            if (!items.length) return "";
            return `<section class="subscription-workspace-section"><header><div><p class="kicker">${escapeWorkspaceHtml(section.id)}</p><h5>${escapeWorkspaceHtml(section.title)}</h5><p>${escapeWorkspaceHtml(section.description)}</p></div><small>${escapeWorkspaceHtml(items.length)}</small></header><div class="subscription-contract-grid">${items.map((contract) => renderContractCard(contract, catalogById, "CONTRACTS")).join("")}</div></section>`;
          }).join("") || '<p class="subscription-workspace-empty subscription-workspace-empty--large" role="status">No contracts match the current filters.</p>'}
        </div>
      </section>
    `;
  }

  function renderCatalogCard(user, service = {}, contracts = []) {
    const tierCount = (Array.isArray(service.tiers) ? service.tiers : []).filter((tier) => tier.archived !== true && tier.active !== false).length;
    const lowest = getLowestPrice(service);
    const state = getCatalogStateLabel(user, service, contracts);
    const targetType = getTargetType(service);
    return `
      <button type="button" class="subscription-catalog-card-v4" data-open-subscription-catalog="${escapeWorkspaceHtml(getCatalogId(service))}">
        <span class="subscription-catalog-card-v4__head">
          ${renderLogo(service)}
          <span><b>${escapeWorkspaceHtml(service.title || "Subscription")}</b><small>${escapeWorkspaceHtml(service.provider || "LOCAL LEDGER")}</small></span>
          ${renderStateTag(state)}
        </span>
        <p>${escapeWorkspaceHtml(service.summary || service.description || "No service summary registered.")}</p>
        <span class="subscription-catalog-card-v4__meta">
          <span><small>FROM</small><b>${escapeWorkspaceHtml(formatCredits(lowest))}</b></span>
          <span><small>TIERS</small><b>${escapeWorkspaceHtml(tierCount)}</b></span>
          <span><small>TARGET</small><b>${escapeWorkspaceHtml(targetType)}</b></span>
          <span><small>SOURCE</small><b>${escapeWorkspaceHtml(getMarket(service))}</b></span>
        </span>
      </button>
    `;
  }

  function renderCatalog(user, state, context) {
    const { catalog, contracts } = context;
    const visible = selectVisibleCatalogEntries(catalog, state);
    const providers = getProviderOptions(catalog);
    const categories = getCategoryOptions(catalog);
    const expanded = new Set(state.expandedCatalogSections || []);

    const sections = SUBSCRIPTION_GROUPS.map((group) => {
      const groupItems = visible.filter((service) => getGroupForCategory(service.category).id === group.id);
      if (!groupItems.length) return "";
      const categorySections = group.categories.map((categoryId) => {
        const items = groupItems.filter((service) => token(service.category || "OTHER", "OTHER") === categoryId);
        if (!items.length) return "";
        const key = `${group.id}:${categoryId}`;
        const isExpanded = expanded.has(key);
        const shown = isExpanded ? items : items.slice(0, CATALOG_SECTION_LIMIT);
        const category = getCategoryMap().get(categoryId);
        const categoryPanelId = `subscription-catalog-section-${workspaceDomId(key)}`;
        return `
          <section class="subscription-catalog-category" id="${categoryPanelId}">
            <header>
              <div><h6>${escapeWorkspaceHtml(category?.title || categoryId)}</h6><p>${escapeWorkspaceHtml(category?.description || "")}</p></div>
              <small>${escapeWorkspaceHtml(items.length)} service${items.length === 1 ? "" : "s"}</small>
            </header>
            <div class="subscription-catalog-grid-v4">${shown.map((service) => renderCatalogCard(user, service, contracts)).join("")}</div>
            ${items.length > CATALOG_SECTION_LIMIT ? `<button type="button" class="subscription-catalog-expand" data-subscription-toggle-catalog-section="${escapeWorkspaceHtml(key)}" aria-expanded="${isExpanded ? "true" : "false"}" aria-controls="${categoryPanelId}">${isExpanded ? "Show less" : `Show all ${items.length}`}</button>` : ""}
          </section>
        `;
      }).join("");
      return `<section class="subscription-catalog-group"><header><div><p class="kicker">${escapeWorkspaceHtml(group.id)}</p><h5>${escapeWorkspaceHtml(group.title)}</h5><p>${escapeWorkspaceHtml(group.description)}</p></div><small>${escapeWorkspaceHtml(groupItems.length)}</small></header>${categorySections}</section>`;
    }).join("");

    return `
      <section class="subscription-workspace-panel" id="${getWorkspacePanelId("CATALOG")}" role="tabpanel" aria-labelledby="${getWorkspaceTabId("CATALOG")}" tabindex="0" data-subscription-workspace-panel="CATALOG">
        <section class="subscription-filterbar subscription-filterbar--catalog" aria-label="Catalog filters">
          ${renderCommonSearch(state.query, "Name, provider, feature or tier")}
          ${renderSelectField("Group", "group", state.group, [{ value: "ALL", label: "All groups" }, ...SUBSCRIPTION_GROUPS.map((group) => ({ value: group.id, label: group.title }))])}
          ${renderSelectField("Category", "category", state.category, [{ value: "ALL", label: "All categories" }, ...categories.map((id) => ({ value: id, label: getCategoryMap().get(id)?.title || id }))])}
          ${renderSelectField("Provider", "providerId", state.providerId, [{ value: "ALL", label: "All providers" }, ...providers.map((provider) => ({ value: provider.id, label: provider.name }))])}
          ${renderSelectField("Source", "market", state.market, [{ value: "ALL", label: "System & private" }, { value: "SYSTEM", label: "System" }, { value: "PRIVATE", label: "Private" }])}
          ${renderSelectField("Target", "targetType", state.targetType, [{ value: "ALL", label: "All targets" }, { value: "CITIZEN", label: "Citizen" }, { value: "ITEM_INSTANCE", label: "Item / asset" }, { value: "MIXED", label: "Mixed" }])}
          <label class="subscription-filter-field"><span>Max price</span><span class="subscription-price-input"><input type="number" min="0" step="50" value="${escapeWorkspaceHtml(state.maxPrice)}" placeholder="Any" data-subscription-filter="maxPrice" /><b>₡</b></span></label>
          ${renderSelectField("Sort", "sort", state.sort, [{ value: "RELEVANCE", label: "Grouped relevance" }, { value: "NAME", label: "Name" }, { value: "PROVIDER", label: "Provider" }, { value: "PRICE_ASC", label: "Price: low to high" }, { value: "PRICE_DESC", label: "Price: high to low" }])}
        </section>
        ${renderActiveFilters(state, "CATALOG")}
        <div class="subscription-workspace-results-head" role="status" aria-live="polite" aria-atomic="true"><span><b>${escapeWorkspaceHtml(visible.length)}</b> of ${escapeWorkspaceHtml(catalog.length)} services</span></div>
        <div class="subscription-catalog-groups">${sections || '<p class="subscription-workspace-empty subscription-workspace-empty--large" role="status">No services match the current filters.</p>'}</div>
      </section>
    `;
  }

  function renderProviderCard(provider = {}) {
    const categoryMap = getCategoryMap();
    const range = provider.minPrice === provider.maxPrice
      ? formatCredits(provider.minPrice)
      : `${formatCredits(provider.minPrice)} – ${formatCredits(provider.maxPrice)}`;
    return `
      <button type="button" class="subscription-provider-card-v4" data-open-subscription-provider-v4="${escapeWorkspaceHtml(provider.id)}">
        <span class="subscription-provider-card-v4__head">
          ${renderLogo({ title: provider.name, provider: provider.name })}
          <span><b>${escapeWorkspaceHtml(provider.name)}</b><small>${escapeWorkspaceHtml(provider.market)} PROVIDER</small></span>
        </span>
        <span class="subscription-provider-card-v4__categories">${provider.categories.slice(0, 4).map((category) => `<i>${escapeWorkspaceHtml(categoryMap.get(category)?.title || category)}</i>`).join("")}</span>
        <span class="subscription-provider-card-v4__meta">
          <span><small>SERVICES</small><b>${escapeWorkspaceHtml(provider.services.length)}</b></span>
          <span><small>WEEKLY RANGE</small><b>${escapeWorkspaceHtml(range)}</b></span>
        </span>
      </button>
    `;
  }

  function renderProviders(user, state, context) {
    const allProviders = buildProviderGroups(context.catalog);
    const visible = selectVisibleProviders(allProviders, state);
    const categories = getCategoryOptions(context.catalog);
    const systemProviders = visible.filter((provider) => provider.market === "SYSTEM");
    const privateProviders = visible.filter((provider) => provider.market !== "SYSTEM");

    return `
      <section class="subscription-workspace-panel" id="${getWorkspacePanelId("PROVIDERS")}" role="tabpanel" aria-labelledby="${getWorkspaceTabId("PROVIDERS")}" tabindex="0" data-subscription-workspace-panel="PROVIDERS">
        <section class="subscription-filterbar subscription-filterbar--providers" aria-label="Provider filters">
          ${renderCommonSearch(state.query, "Provider, scope, category or service")}
          ${renderSelectField("Type", "market", state.market, [{ value: "ALL", label: "All providers" }, { value: "SYSTEM", label: "System" }, { value: "PRIVATE", label: "Private" }])}
          ${renderSelectField("Category", "category", state.category, [{ value: "ALL", label: "All categories" }, ...categories.map((id) => ({ value: id, label: getCategoryMap().get(id)?.title || id }))])}
          ${renderSelectField("Sort", "sort", state.sort, [{ value: "NAME", label: "Name" }, { value: "SERVICES", label: "Service count" }, { value: "PRICE_ASC", label: "Lowest entry price" }])}
        </section>
        ${renderActiveFilters(state, "PROVIDERS")}
        <div class="subscription-workspace-results-head" role="status" aria-live="polite" aria-atomic="true"><span><b>${escapeWorkspaceHtml(visible.length)}</b> of ${escapeWorkspaceHtml(allProviders.length)} providers</span></div>
        <div class="subscription-provider-sections-v4">
          ${renderProviderSection("SYSTEM PROVIDERS", "System-controlled civic and mandatory providers.", systemProviders)}
          ${renderProviderSection("PRIVATE PROVIDERS", "Private corporate and premium providers.", privateProviders)}
          ${visible.length ? "" : '<p class="subscription-workspace-empty subscription-workspace-empty--large" role="status">No providers match the current filters.</p>'}
        </div>
      </section>
    `;
  }

  function renderProviderSection(title, description, providers = []) {
    if (!providers.length) return "";
    return `<section class="subscription-workspace-section"><header><div><p class="kicker">${escapeWorkspaceHtml(title)}</p><h5>${escapeWorkspaceHtml(title.replace(" PROVIDERS", ""))}</h5><p>${escapeWorkspaceHtml(description)}</p></div><small>${escapeWorkspaceHtml(providers.length)}</small></header><div class="subscription-provider-grid-v4">${providers.map(renderProviderCard).join("")}</div></section>`;
  }

  function renderWorkspaceBody(user, state, context) {
    if (state.view === "CONTRACTS") return renderContracts(user, state, context);
    if (state.view === "CATALOG") return renderCatalog(user, state, context);
    if (state.view === "PROVIDERS") return renderProviders(user, state, context);
    return renderOverview(user, state, context);
  }

  function getViewCounts(contracts = [], catalog = []) {
    const providers = buildProviderGroups(catalog);
    return {
      attention: contracts.filter((contract) => isContractAttentionRequired(contract)).length,
      openContracts: contracts.filter((contract) => !isContractCancelled(contract)).length,
      catalog: catalog.length,
      providers: providers.length
    };
  }

  function renderPlayerSubscriptionsWorkspace(user, options = {}) {
    const mountedWorkspace = document.querySelector?.("[data-subscription-workspace-root]");
    if (mountedWorkspace) captureWorkspaceScroll(mountedWorkspace.dataset.subscriptionWorkspaceRootView || "");
    cancelScheduledWorkspaceRender();
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    const terminalGrid = document.querySelector(".terminal-grid");
    if (!container) return;

    const requestedView = options.view || options.panel;
    const normalizedLegacyView = String(requestedView || "").toLowerCase() === "my"
      ? "CONTRACTS"
      : String(requestedView || "").toLowerCase() === "buy"
        ? "CATALOG"
        : requestedView;
    const state = getWorkspaceState(normalizedLegacyView ? { view: normalizedLegacyView } : null);
    const catalog = getCatalog();
    const contracts = getContracts(user);
    const ledger = getLedger(user);
    const context = { catalog, contracts, ledger, catalogById: getCatalogById(catalog) };
    const counts = getViewCounts(contracts, catalog);

    terminalGrid?.classList.add("is-card-open");
    if (status) status.textContent = `SUBSCRIPTIONS / ${state.view} / ${counts.openContracts} OPEN`;

    container.innerHTML = `
      <article class="module-detail subscriptions-view subscription-workspace-v4" data-subscription-workspace-root data-subscription-workspace-root-view="${escapeWorkspaceHtml(state.view)}">
        <div class="module-detail-head">
          <div><p class="kicker">SUBSCRIPTIONS / CONTRACT & ACCESS REGISTRY</p><h4>Subscription Workspace</h4></div>
          <button class="module-back-button" type="button">Back</button>
        </div>
        ${renderWorkspaceNav(state, counts)}
        <div class="subscription-action-feedback-slot" data-subscription-action-feedback-scope="PLAYER">${app.SubscriptionActionFeedback?.render?.("PLAYER") || ""}</div>
        ${renderWorkspaceStatusBar(ledger, contracts)}
        <div class="subscription-workspace-body">${renderWorkspaceBody(user, state, context)}</div>
      </article>
    `;

    app.bindModuleBackButton?.(user, () => app.renderModules?.(user));
    bindWorkspaceActions(user);
    if (options.focusView === true) focusWorkspaceViewTab(state.view);
    else restoreWorkspaceFocus(options.focusField, options.selectionStart, options.selectionEnd);
    restoreWorkspaceScroll(state.view);
  }

  function restoreWorkspaceFocus(field = "", selectionStart = null, selectionEnd = null) {
    if (!field) return;
    const control = document.querySelector(`[data-subscription-filter="${field}"]`);
    if (!control || typeof control.focus !== "function") return;
    control.focus({ preventScroll: true });
    if (typeof control.setSelectionRange === "function" && Number.isInteger(selectionStart)) {
      control.setSelectionRange(selectionStart, Number.isInteger(selectionEnd) ? selectionEnd : selectionStart);
    }
  }

  function resetFiltersForView(view, state) {
    const next = { ...state, ...DEFAULT_FILTERS, view, expandedCatalogSections: state.expandedCatalogSections || [] };
    if (view === "CONTRACTS") next.sort = "STATUS";
    if (view === "PROVIDERS") next.sort = "NAME";
    return next;
  }

  function scheduleWorkspaceRender(user, field, control) {
    cancelScheduledWorkspaceRender();
    const workspaceRoot = document.querySelector?.("[data-subscription-workspace-root]");
    const selectionStart = Number.isInteger(control?.selectionStart) ? control.selectionStart : null;
    const selectionEnd = Number.isInteger(control?.selectionEnd) ? control.selectionEnd : selectionStart;
    searchRenderTimer = window.setTimeout(() => {
      searchRenderTimer = 0;
      const currentRoot = document.querySelector?.("[data-subscription-workspace-root]");
      if (!workspaceRoot || currentRoot !== workspaceRoot || workspaceRoot.isConnected === false) return;
      renderPlayerSubscriptionsWorkspace(user, { focusField: field, selectionStart, selectionEnd });
    }, 90);
  }

  function bindWorkspaceActions(user) {
    const root = document.querySelector("[data-subscription-workspace-root]");
    if (!root) return;

    root.addEventListener("keydown", (event) => {
      const tab = event.target.closest?.('[role="tab"][data-subscription-workspace-view]');
      if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const tabs = Array.from(root.querySelectorAll('[role="tab"][data-subscription-workspace-view]'));
      if (!tabs.length) return;
      const currentIndex = Math.max(0, tabs.indexOf(tab));
      let nextIndex = currentIndex;
      if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      event.preventDefault();
      const nextView = token(tabs[nextIndex]?.dataset.subscriptionWorkspaceView || "OVERVIEW", "OVERVIEW");
      const current = getWorkspaceState();
      app.subscriptionUiState = resetFiltersForView(nextView, current);
      renderPlayerSubscriptionsWorkspace(user, { focusView: true });
    });

    root.addEventListener("click", async (event) => {
      const viewButton = event.target.closest?.("[data-subscription-workspace-view]");
      if (viewButton) {
        const nextView = token(viewButton.dataset.subscriptionWorkspaceView || "OVERVIEW", "OVERVIEW");
        const current = getWorkspaceState();
        app.subscriptionUiState = resetFiltersForView(nextView, current);
        renderPlayerSubscriptionsWorkspace(user, { focusView: true });
        return;
      }

      const contractButton = event.target.closest?.("[data-open-subscription-contract]");
      if (contractButton) {
        cancelScheduledWorkspaceRender();
        captureWorkspaceScroll();
        const returnView = contractButton.dataset.returnView || getWorkspaceState().view;
        app.pushModuleView?.(() => renderPlayerSubscriptionsWorkspace(user, { view: returnView }));
        app.renderPlayerSubscriptionProfile?.(user, contractButton.dataset.openSubscriptionContract, returnView);
        return;
      }

      const catalogButton = event.target.closest?.("[data-open-subscription-catalog]");
      if (catalogButton) {
        cancelScheduledWorkspaceRender();
        captureWorkspaceScroll();
        app.pushModuleView?.(() => renderPlayerSubscriptionsWorkspace(user, { view: "CATALOG" }));
        app.renderPlayerCatalogServiceProfile?.(user, catalogButton.dataset.openSubscriptionCatalog, { returnView: "CATALOG" });
        return;
      }

      const providerButton = event.target.closest?.("[data-open-subscription-provider-v4]");
      if (providerButton) {
        cancelScheduledWorkspaceRender();
        captureWorkspaceScroll();
        app.pushModuleView?.(() => renderPlayerSubscriptionsWorkspace(user, { view: "PROVIDERS" }));
        app.renderSubscriptionProviderProfile?.(user, providerButton.dataset.openSubscriptionProviderV4, { returnView: "PROVIDERS" });
        return;
      }

      const categoryButton = event.target.closest?.("[data-subscription-overview-category]");
      if (categoryButton) {
        const state = getWorkspaceState();
        app.subscriptionUiState = resetFiltersForView("CONTRACTS", state);
        app.subscriptionUiState.category = token(categoryButton.dataset.subscriptionOverviewCategory || "ALL", "ALL");
        renderPlayerSubscriptionsWorkspace(user);
        return;
      }

      const clearFilterButton = event.target.closest?.("[data-subscription-clear-filter]");
      if (clearFilterButton) {
        const field = clearFilterButton.dataset.subscriptionClearFilter;
        const state = getWorkspaceState();
        state[field] = DEFAULT_FILTERS[field] ?? "ALL";
        app.subscriptionUiState = state;
        renderPlayerSubscriptionsWorkspace(user);
        return;
      }

      if (event.target.closest?.("[data-subscription-clear-filters]")) {
        const state = getWorkspaceState();
        app.subscriptionUiState = resetFiltersForView(state.view, state);
        renderPlayerSubscriptionsWorkspace(user);
        return;
      }

      const expandButton = event.target.closest?.("[data-subscription-toggle-catalog-section]");
      if (expandButton) {
        const key = expandButton.dataset.subscriptionToggleCatalogSection;
        const state = getWorkspaceState();
        const expanded = new Set(state.expandedCatalogSections || []);
        if (expanded.has(key)) expanded.delete(key);
        else expanded.add(key);
        state.expandedCatalogSections = Array.from(expanded);
        app.subscriptionUiState = state;
        renderPlayerSubscriptionsWorkspace(user);
        return;
      }

      const payButton = event.target.closest?.("[data-subscription-pay]");
      if (payButton && !payButton.disabled) {
        if (typeof app.handleSubscriptionPayment === "function") {
          await app.handleSubscriptionPayment(user, { paymentSource: payButton.dataset.subscriptionPay || "CREDITS", returnTo: "workspace", returnView: "OVERVIEW", actionControl: payButton });
        }
        return;
      }

      const clearCancelledButton = event.target.closest?.("[data-subscription-clear-cancelled]");
      if (clearCancelledButton) {
        if (app.SubscriptionActionFeedback?.isBusy?.(clearCancelledButton)) return;
        const confirmed = await app.confirmAction?.({
          title: "CLEAR CANCELLED SUBSCRIPTIONS",
          message: "Remove all cancelled subscription records from this Citizen card? This removes archived records only.",
          confirmLabel: "Clear Cancelled",
          cancelLabel: "Cancel",
          tone: "warning"
        });
        if (!confirmed) return;
        const release = app.SubscriptionActionFeedback?.lock?.(clearCancelledButton, "CLEARING...") || (() => {});
        let result;
        try {
          result = app.SubscriptionAPI?.clearCancelledSubscriptionContracts?.(user.citizenId, { createdBy: user.login || "CITIZEN" })
            || { ok: false, resultCode: "SUBSCRIPTION_API_UNAVAILABLE" };
        } catch (error) {
          result = { ok: false, resultCode: error?.code || "SUBSCRIPTION_CANCELLED_CLEAR_FAILED" };
        }
        app.SubscriptionActionFeedback?.present?.("PLAYER", "CLEAR_CANCELLED", result);
        if (!result?.ok) {
          release();
          return;
        }
        renderPlayerSubscriptionsWorkspace(user, { view: "CONTRACTS" });
      }
    });

    root.addEventListener("change", (event) => {
      const control = event.target.closest?.("[data-subscription-filter]");
      if (!control) return;
      const field = control.dataset.subscriptionFilter;
      const state = getWorkspaceState();
      state[field] = control.value;
      app.subscriptionUiState = state;
      renderPlayerSubscriptionsWorkspace(user, { focusField: field });
    });

    root.addEventListener("input", (event) => {
      const control = event.target.closest?.("input[data-subscription-filter]");
      if (!control) return;
      const field = control.dataset.subscriptionFilter;
      const state = getWorkspaceState();
      state[field] = control.value;
      app.subscriptionUiState = state;
      scheduleWorkspaceRender(user, field, control);
    });
  }

  app.renderPlayerSubscriptionsWorkspace = renderPlayerSubscriptionsWorkspace;
  app.subscriptionWorkspace = {
    version: "subscriptions_responsive_accessibility_4_5",
    groups: SUBSCRIPTION_GROUPS.map((group) => ({ ...group, categories: [...group.categories] })),
    getState: getWorkspaceState,
    normalizeSearchText,
    selectVisibleContracts,
    selectVisibleCatalogEntries,
    buildProviderGroups,
    selectVisibleProviders,
    getGroupForCategory,
    getTargetType,
    getLowestPrice,
    getContractStatusAxes,
    getContractDisplayStatus,
    isContractCancelled,
    isContractAttentionRequired,
    getCatalogStateLabel,
    captureScroll: captureWorkspaceScroll,
    restoreScroll: restoreWorkspaceScroll,
    cancelScheduledRender: cancelScheduledWorkspaceRender,
    catalogSectionLimit: CATALOG_SECTION_LIMIT
  };

  app.renderSubscriptionsModule = function renderSubscriptionsModuleWithWorkspace(user) {
    if (user?.role === "admin") return legacySubscriptionsRenderer?.(user);
    return renderPlayerSubscriptionsWorkspace(user);
  };
})();
