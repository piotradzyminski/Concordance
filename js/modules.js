window.WS_APP = window.WS_APP || {};

window.WS_APP.moduleViewHistory = window.WS_APP.moduleViewHistory || [];
window.WS_APP.moduleNavigationSequence = Number(window.WS_APP.moduleNavigationSequence || 0);

window.WS_APP.beginModuleNavigation = function beginModuleNavigation() {
  window.WS_APP.moduleNavigationSequence += 1;
  return window.WS_APP.moduleNavigationSequence;
};

window.WS_APP.isCurrentModuleNavigation = function isCurrentModuleNavigation(sequence) {
  return Number(sequence) === Number(window.WS_APP.moduleNavigationSequence);
};

window.WS_APP.cancelPendingModuleNavigation = function cancelPendingModuleNavigation() {
  window.WS_APP.moduleNavigationSequence += 1;
};

window.WS_APP.resetModuleHistory = function resetModuleHistory() {
  window.WS_APP.moduleViewHistory = [];
};

window.WS_APP.pushModuleView = function pushModuleView(callback) {
  if (typeof callback !== "function") return;
  const history = Array.isArray(window.WS_APP.moduleViewHistory) ? window.WS_APP.moduleViewHistory : [];
  window.WS_APP.moduleViewHistory = [...history, callback].slice(-30);
};

window.WS_APP.goBackInModule = function goBackInModule(user, fallback) {
  window.WS_APP.cancelPendingModuleNavigation?.();
  const history = Array.isArray(window.WS_APP.moduleViewHistory) ? window.WS_APP.moduleViewHistory : [];
  const previous = history.pop();
  window.WS_APP.moduleViewHistory = history;

  if (typeof previous === "function") {
    previous();
    return;
  }

  if (typeof fallback === "function") {
    fallback();
    return;
  }

  window.WS_APP.renderModules?.(user || window.WS_APP.currentUser);
};

window.WS_APP.bindModuleBackButton = function bindModuleBackButton(user, fallback) {
  const button = document.querySelector(".module-back-button");
  if (!button) return;
  button.addEventListener("click", () => window.WS_APP.goBackInModule(user, fallback));
};

const CYBERWARE_CATALOG_DATA_SCRIPTS = [
  "data/neurochip-catalog.js?v=3",
  "data/interface-catalog.js?v=3",
  "data/service-port-catalog.js?v=3",
  "data/body-cyberware-catalog.js?v=3"
];

// Read-only catalog projection used by Housing Market. This bundle intentionally
// excludes Cyberware UI, diagnostics, maintenance, operations and controller code.
const CYBERWARE_MARKET_PROJECTION_SCRIPTS = [
  ...CYBERWARE_CATALOG_DATA_SCRIPTS,
  "js/cyberware-store.js?v=9",
  "js/cyberware-rules.js?v=7",
  "js/subscription-entitlement.js?v=7",
  "js/cyberware-bodymap-panel.js?v=2",
  "js/cyberware-items-panel.js?v=2",
  "js/cyberware-market-projection.js?v=1"
];

// Full Cyberware domain and UI runtime. The standalone Cyberware module and
// Citizen record views use this bundle; Equipment loads only a navigation bridge.
const CYBERWARE_UI_RUNTIME_SCRIPTS = [
  ...CYBERWARE_CATALOG_DATA_SCRIPTS,
  "data/firmware-registry.js?v=1",
  "js/cyberware-store.js?v=9",
  "js/cyberware-rules.js?v=7",
  "js/subscription-entitlement.js?v=7",
  "js/firmware-registry.js?v=1",
  "js/cyberware-authorization.js?v=8",
  "js/cyberware-runtime.js?v=2",
  "js/cyberware-core-stack.js?v=3",
  "js/cyberware-diagnostics.js?v=2",
  "js/cyberware-maintenance.js?v=4",
  "js/cyberware-assignment.js?v=4",
  "js/cyberware-bodymap-panel.js?v=2",
  "js/cyberware-items-panel.js?v=2",
  "js/cyberware-market-projection.js?v=1",
  "js/cyberware-actions.js?v=6",
  "js/cyberware.js?v=23"
];

const MODULE_BUNDLES = {
  "terminal-hub": {
    styles: [
      "css/terminal-module.css?v=4",
      "css/billing.css?v=11",
      "css/terminal-calendar.css?v=5"
    ],
    scripts: [
      "js/billing.js?v=15",
      "js/terminal-module.js?v=11"
    ]
  },
  subscriptions: {
    styles: [
      "css/subscription-action-feedback.css?v=1",
      "css/subscriptions.css?v=21"
    ],
    scripts: [
      "data/subscription-catalog.js?v=13",
      "data/subscription-bridge-fixtures.js?v=1",
      "js/subscription-entitlement.js?v=7",
      "js/subscription-catalog-store.js?v=8",
      "js/subscription-api.js?v=5",
      "js/coverage-resolver.js?v=2",
      "js/subscription-notification-producer.js?v=1",
      "js/subscription-bridge-readiness.js?v=2",
      "js/subscription-action-feedback.js?v=1",
      "js/subscriptions.js?v=34",
      "js/subscriptions-workspace.js?v=6"
    ]
  },
  service: {
    styles: [
      "css/service.css?v=29"
    ],
    scripts: [
      "data/service-database.js?v=6",
      "js/subscription-entitlement.js?v=7",
      "js/service-requirements.js?v=7",
      "js/service-offer-generator.js?v=8",
      "js/service.js?v=31"
    ]
  },
  "service-income": {
    styles: ["css/billing.css?v=11"],
    scripts: ["js/billing.js?v=15"]
  },
  equipment: {
    styles: [
      "css/equipment.css?v=129"
    ],
    scripts: [
      "data/item-type-catalog.js?v=4",
      "js/item-type-registry.js?v=2",
      "js/item-type-operations-ui.js?v=3",
      "js/equipment-render-utils.js?v=1",
      "js/equipment-store.js?v=35",
      "js/equipment-loadout-rules.js?v=6",
      "js/equipment-assignment.js?v=10",
      "js/equipment-inventory.js?v=20",
      "js/equipment-housing-grid.js?v=5",
      "js/equipment-actions.js?v=57",
      "js/equipment-items-panel.js?v=30",
      "js/equipment-body-regions-panel.js?v=11",
      "js/equipment-bodymap-panel.js?v=25",
      "js/equipment-containers-panel.js?v=39",
      "js/equipment-cyberware-link.js?v=20",
      "js/equipment.js?v=118"
    ]
  },
  cyberware: {
    styles: [
      "css/equipment.css?v=129",
      "css/cyberware.css?v=1"
    ],
    scripts: [
      ...CYBERWARE_UI_RUNTIME_SCRIPTS,
      "js/equipment-render-utils.js?v=1",
      "js/equipment-items-panel.js?v=30",
      "js/cyberware-index.js?v=2",
      "js/cyberware-planner.js?v=8",
      "js/cyberware-workspace.js?v=1",
      "js/cyberware-module.js?v=1"
    ]
  },
  market: {
    styles: ["css/housing.css?v=34"],
    scripts: [
      ...CYBERWARE_MARKET_PROJECTION_SCRIPTS,
      "data/market-offers.js?v=4",
      "js/market-store.js?v=12",
      "js/housing-market-runtime.js?v=4",
      "js/market.js?v=1"
    ]
  },
  housing: {
    styles: ["css/housing.css?v=34"],
    scripts: [
      "data/item-type-catalog.js?v=4",
      "data/equipment-catalog.js?v=25",
      "js/item-type-registry.js?v=2",
      "js/equipment-catalog-store.js?v=14",
      "js/equipment-render-utils.js?v=1",
      "js/equipment-store.js?v=34",
      "js/equipment-inventory.js?v=20",
      "js/equipment-housing-grid.js?v=5",
      "js/grid-pointer-session.js?v=3",
      "js/housing-grid-engine-adapter.js?v=4",
      "js/housing-storage-runtime.js?v=3",
      "js/housing-household-runtime.js?v=2",
      "js/housing.js?v=50"
    ]
  },
  database: {
    scripts: ["js/database.js?v=2"]
  },
  "citizen-card": {
    scripts: [
      ...CYBERWARE_UI_RUNTIME_SCRIPTS,
      "js/citizen-records.js?v=36"
    ]
  },
  "citizen-cards": {
    scripts: [
      ...CYBERWARE_UI_RUNTIME_SCRIPTS,
      "js/citizen-records.js?v=36"
    ]
  },
  "citizen-files": {
    scripts: [
      ...CYBERWARE_UI_RUNTIME_SCRIPTS,
      "js/database.js?v=2",
      "js/citizen-records.js?v=36",
      "js/citizen-database.js?v=3"
    ]
  },
  "citizen-database": {
    scripts: [
      ...CYBERWARE_UI_RUNTIME_SCRIPTS,
      "js/database.js?v=2",
      "js/citizen-records.js?v=36",
      "js/citizen-database.js?v=3"
    ]
  },
  "admin-control": {
    styles: ["css/admin-control.css?v=34"],
    scripts: [
      "js/admin/admin-shell.js?v=1",
      "js/admin/admin-workspace-registry.js?v=5",
      "js/admin/admin-workspace-loader.js?v=2",
      "js/admin-control.js?v=66",
      "js/admin/workspaces/admin-workspace-dashboard.js?v=1"
    ]
  },
  "admin-workspace-operations": {
    scripts: [
      "js/admin-operations-command.js?v=1",
      "js/admin/workspaces/admin-workspace-operations.js?v=1"
    ]
  },
  "admin-workspace-catalog-management": {
    scripts: [
      ...CYBERWARE_CATALOG_DATA_SCRIPTS,
      "js/admin-equipment-catalog-authoring.js?v=1",
      "js/admin-catalog-management.js?v=2",
      "js/admin/workspaces/admin-workspace-catalog-management.js?v=2"
    ]
  },
  "admin-workspace-citizens": {
    scripts: [
      "data/item-type-catalog.js?v=4",
      "data/equipment-catalog.js?v=25",
      "js/item-type-registry.js?v=2",
      "js/equipment-catalog-store.js?v=14",
      "js/equipment-render-utils.js?v=1",
      "js/equipment-store.js?v=34",
      "js/equipment-inventory.js?v=20",
      "js/equipment-housing-grid.js?v=5",
      "js/admin/workspaces/admin-workspace-citizens.js?v=1"
    ]
  },
  "admin-workspace-tags-access": {
    scripts: ["js/admin/workspaces/admin-workspace-tags-access.js?v=1"]
  },
  "admin-workspace-subscriptions": {
    styles: [
      "css/subscription-action-feedback.css?v=1",
      "css/admin-subscriptions.css?v=3"
    ],
    scripts: [
      "js/subscription-action-feedback.js?v=1",
      "js/admin-subscriptions-control.js?v=4",
      "js/admin/workspaces/admin-workspace-subscriptions.js?v=1"
    ]
  },
  "admin-workspace-service": {
    scripts: [
      "data/service-database.js?v=6",
      "js/service-requirements.js?v=7",
      "js/service-offer-generator.js?v=8",
      "js/admin/workspaces/admin-workspace-service.js?v=1"
    ]
  },
  "admin-workspace-billing": {
    scripts: ["js/admin/workspaces/admin-workspace-billing.js?v=1"]
  },
  "admin-workspace-system-requests": {
    scripts: ["js/admin/workspaces/admin-workspace-system-requests.js?v=1"]
  },
  "admin-workspace-records": {
    scripts: ["js/admin/workspaces/admin-workspace-records.js?v=1"]
  },
  "admin-workspace-audit": {
    scripts: ["js/admin/workspaces/admin-workspace-audit.js?v=1"]
  },
  "admin-workspace-data-settings": {
    scripts: ["js/admin/workspaces/admin-workspace-data-settings.js?v=1"]
  }
};

MODULE_BUNDLES["gm-layer"] = MODULE_BUNDLES["admin-control"];

function normalizeLazyAssetUrl(url = "") {
  return String(url || "").trim();
}

function getLazyAssetKey(url = "") {
  return normalizeLazyAssetUrl(url).split("?")[0];
}

function hasLoadedLazyAsset(url = "", selector = "") {
  const key = getLazyAssetKey(url);
  if (!key) return true;
  return Array.from(document.querySelectorAll(selector)).some((node) => {
    const source = selector === "link" ? node.getAttribute("href") : node.getAttribute("src");
    return node.dataset.lazySrc === key || getLazyAssetKey(source || "").endsWith(key);
  });
}

function loadLazyStyle(href = "") {
  const url = normalizeLazyAssetUrl(href);
  const key = getLazyAssetKey(url);
  if (!url) return Promise.resolve();

  const pending = window.WS_APP.lazyStylePromises || {};
  const loaded = window.WS_APP.lazyStyleLoadedKeys || {};
  window.WS_APP.lazyStylePromises = pending;
  window.WS_APP.lazyStyleLoadedKeys = loaded;

  if (pending[key]) return pending[key];
  if (loaded[key] || hasLoadedLazyAsset(url, "link")) {
    loaded[key] = true;
    return Promise.resolve();
  }

  pending[key] = new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.dataset.lazySrc = key;
    link.addEventListener("load", () => {
      loaded[key] = true;
      delete pending[key];
      resolve();
    }, { once: true });
    link.addEventListener("error", () => {
      delete pending[key];
      reject(new Error(`Lazy stylesheet failed: ${url}`));
    }, { once: true });
    document.head.appendChild(link);
  });

  return pending[key];
}

function loadLazyScript(src = "") {
  const url = normalizeLazyAssetUrl(src);
  const key = getLazyAssetKey(url);
  if (!url) return Promise.resolve();

  const pending = window.WS_APP.lazyScriptPromises || {};
  const loaded = window.WS_APP.lazyScriptLoadedKeys || {};
  window.WS_APP.lazyScriptPromises = pending;
  window.WS_APP.lazyScriptLoadedKeys = loaded;

  if (pending[key]) return pending[key];
  if (loaded[key] || hasLoadedLazyAsset(url, "script")) {
    loaded[key] = true;
    return Promise.resolve();
  }

  pending[key] = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.dataset.lazySrc = key;
    script.addEventListener("load", () => {
      loaded[key] = true;
      delete pending[key];
      resolve();
    }, { once: true });
    script.addEventListener("error", () => {
      delete pending[key];
      reject(new Error(`Lazy script failed: ${url}`));
    }, { once: true });
    document.body.appendChild(script);
  });

  return pending[key];
}

window.WS_APP.loadModuleBundle = async function loadModuleBundle(moduleId = "", user = window.WS_APP.currentUser) {
  const key = String(moduleId || "").trim();
  const bundle = MODULE_BUNDLES[key] || (user?.role === "admin" ? MODULE_BUNDLES["admin-control"] : null);
  if (!bundle) return;

  await Promise.all((bundle.styles || []).map(loadLazyStyle));
  for (const script of bundle.scripts || []) {
    await loadLazyScript(script);
  }
};

window.WS_APP.loadAdminBundle = function loadAdminBundle() {
  return window.WS_APP.loadModuleBundle?.("admin-control", { role: "admin" }) || Promise.resolve();
};


function getCitizenNameLabel(citizen = {}, options = {}) {
  return window.WS_APP.formatCitizenDisplayName?.(citizen, {
    user: options.user || window.WS_APP.currentUser,
    legal: options.legal === true
  }) || citizen.legalName || getCitizenShortId(citizen) || citizen.id || "UNKNOWN CITIZEN";
}

window.WS_APP.renderModules = function renderModules(user) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");

  if (!container) return;

  window.WS_APP.cancelPendingModuleNavigation?.();
  window.WS_APP.resetModuleHistory();
  window.WS_APP.initModuleHomeButtons?.();
  window.WS_APP.currentModuleId = null;
  window.WS_APP.currentCitizenCardsSelectedId = null;
  terminalGrid?.classList.remove("is-card-open", "is-module-loading", "is-inline-module-open");
  container.classList.remove("is-module-transitioning");

  const modules = window.APP_DATA?.modules || [];
  const availableModules = modules.filter((module) => (
    module.roles.includes(user.role)
    && (window.WS_APP.canAccessCitizenModule?.(module.id, user) ?? true)
  ));
  const sections = getModuleSections(user, availableModules);
  const visibleModuleCount = sections.reduce((total, section) => total + (section.modules?.length || 0), 0);

  if (status) {
    status.textContent = `${visibleModuleCount} MODULES / ${user.role.toUpperCase()}`;
  }

  container.innerHTML = `
    <div class="module-section-layout" data-role-scope="${escapeHtml(user.role)}">
      ${sections.map((section) => buildModuleSection(section, user)).join("")}
    </div>
  `;

  bindModuleActions(container, user);
  window.WS_APP.syncTerminalUnreadPulse?.();
};

function getModuleSections(user, modules) {
  const byId = new Map(modules.map((module) => [module.id, module]));
  const makeSection = (title, description, ids, options = {}) => {
    const entries = ids.map((id) => byId.get(id)).filter(Boolean);
    return entries.length ? { title, description, modules: entries, variant: options.variant || "default" } : null;
  };

  const sections = user?.role === "admin"
    ? [
        makeSection("Citizen Record", "Karty postaci i kontrola usĹ‚ug przypisanych do obywateli.", ["citizen-cards", "subscriptions"], { variant: "citizen-record" }),
        makeSection("Terminal", "Local terminal, billing, requests and assigned service registry.", ["terminal-hub", "service", "equipment", "cyberware", "market", "housing"], { variant: "terminal" }),
        makeSection("SYSTEM KNOWLEDGE", "Autoryzowany indeks Systemu oraz hub lokalnych rekordĂłw.", ["system-index", "database"], { variant: "database" }),
        makeSection("SYSTEM MECHANICS", "Mechanika gry oraz sĹ‚owniczek pojÄ™Ä‡ gracza.", ["system", "encyclopedia"], { variant: "mechanics" }),
        makeSection("ADMIN CONTROL", "NarzÄ™dzia prowadzÄ…cego: dostÄ™p, tagi, adresy, ukryta warstwa i eksport danych.", ["access-control", "tag-registry", "address-core", "gm-layer"], { variant: "admin" })
      ]
    : [
        makeSection("Character Registration", "Tworzenie postaci oraz status akceptacji rekordu.", ["character-creator", "application-status"], { variant: "citizen-record" }),
        makeSection("Citizen Record", "ZarzÄ…dzanie postaciÄ… jako jednostkÄ… systemowÄ….", ["citizen-card", "subscriptions"], { variant: "citizen-record" }),
        makeSection("Terminal", "Local terminal, billing, requests and assigned service registry.", ["terminal-hub", "service", "equipment", "cyberware", "market", "housing"], { variant: "terminal" }),
        makeSection("SYSTEM KNOWLEDGE", "Autoryzowany indeks Systemu oraz hub lokalnych rekordĂłw.", ["system-index", "database"], { variant: "database" }),
        makeSection("SYSTEM MECHANICS", "Mechanika gry oraz sĹ‚owniczek pojÄ™Ä‡ gracza.", ["system", "encyclopedia"], { variant: "mechanics" })
      ];

  return sections.filter(Boolean);
}

function buildModuleSection(section, user) {
  return `
    <section class="module-section module-section-region module-section--${escapeHtml(section.variant || "default")}">
      <header class="module-section-head module-section-header">
        <div>
          <p class="kicker">${escapeHtml(section.title)}</p>
          <small>${escapeHtml(section.description || "")}</small>
        </div>
        <span class="module-status-badge">${escapeHtml(section.modules.length)} MODULE${section.modules.length === 1 ? "" : "S"}</span>
      </header>
      <div class="module-section-grid">
        ${section.modules.map((module) => buildModuleCard(module, user)).join("")}
      </div>
    </section>
  `;
}



window.WS_APP.initModuleHomeButtons = function initModuleHomeButtons() {
  const container = document.querySelector("#module-grid");

  if (!container || container.dataset.homeObserver === "true") return;

  container.dataset.homeObserver = "true";

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(() => appendModuleHomeButton(window.WS_APP.currentUser));
  });

  observer.observe(container, { childList: true });
  window.WS_APP.moduleHomeButtonObserver = observer;
};

function appendModuleHomeButton(user) {
  const detail = document.querySelector("#module-grid .module-detail");

  if (!detail || !user || detail.querySelector(".module-home-footer")) return;

  const isAdmin = user.role === "admin";
  const footer = document.createElement("footer");
  footer.className = "module-home-footer";
  footer.innerHTML = `
    <button class="module-home-button" type="button">
      ${isAdmin ? "Return to Admin Control Center" : "Return to Access Panel"}
    </button>
  `;

  footer.querySelector(".module-home-button")?.addEventListener("click", () => {
    window.WS_APP.cancelModuleAccessSequence?.();
    window.WS_APP.resetModuleHistory?.();
    if (isAdmin && window.WS_APP.returnToAdminControlCenter?.(user)) return;
    window.WS_APP.renderModules(user);
  });

  detail.appendChild(footer);
}

function buildModuleCard(module, user) {
  const metric = getModuleCardMetric(module, user || window.WS_APP.currentUser);
  const statusInfo = getModuleCardStatus(module, metric);
  const statusClass = statusInfo.className;
  const isOpenable = true;

  return `
    <article
      class="module-card module-tile ${isOpenable ? "is-openable" : ""} module-card--${escapeHtml(statusClass)} ${metric.notificationCount > 0 ? "has-notification-count" : ""}"
      data-id="${escapeHtml(module.id)}"
      data-watermark="${escapeHtml(module.title || module.id)}"
      data-label="${escapeHtml(module.title || module.id)}"
      ${isOpenable ? 'role="button" tabindex="0"' : ""}
    >
      ${metric.notificationCount !== undefined ? `<em class="module-card-notification-badge module-status-badge ${metric.notificationCount > 0 ? "has-unread" : "is-empty"}" aria-label="Unread terminal entries">${escapeHtml(metric.notificationCount)}</em>` : ""}

      <div>
        <h4>${escapeHtml(module.title)}</h4>
        <p>${escapeHtml(getShortModuleDescription(module))}</p>
      </div>

      <div class="module-footer">
        <span class="module-status module-status-badge ${escapeHtml(statusClass)}">
          ${escapeHtml(statusInfo.label)}
        </span>

        ${metric.label ? `<small class="module-card-metric module-status-badge">${escapeHtml(metric.label)}</small>` : ""}

        <span class="module-action">
          ${isOpenable ? "Open" : "Pending"}
        </span>
      </div>
    </article>
  `;
}

function getShortModuleDescription(module = {}) {
  return String(module.description || "No module description loaded.").trim();
}

function getModuleCardStatus(module = {}, metric = {}) {
  const raw = String(module.status || "").trim().toUpperCase();
  if (["BLACK", "LOCKED", "PLANNED"].includes(raw)) return { label: "LOCKED", className: "locked" };
  if (["WIP", "WORK_IN_PROGRESS"].includes(raw)) return { label: "WIP", className: "wip" };
  if (raw === "ADMIN") return { label: "ADMIN", className: "admin" };
  if (metric.empty === true) return { label: "EMPTY", className: "empty" };
  if (metric.statusLabel) {
    return {
      label: String(metric.statusLabel).trim().toUpperCase(),
      className: metric.statusClass || "ready"
    };
  }
  return { label: "ACTIVE", className: "active" };
}

function formatModuleMetricCount(count, singular, plural = `${singular}S`) {
  const value = Number.isFinite(Number(count)) ? Number(count) : 0;
  const label = value === 1 ? singular : plural;
  return `${value} ${label}`;
}

function getKnowledgeModuleMetric(id) {
  if (id === "encyclopedia") {
    const entries = window.WS_APP.getEntries?.({ includeArchived: false })
      || (window.APP_DATA?.entries || []).filter((entry) => entry && entry.archived !== true);
    return {
      label: formatModuleMetricCount(entries.length, "TERM"),
      empty: entries.length === 0,
      statusLabel: "GLOSSARY",
      statusClass: "ready"
    };
  }

  if (id === "system" || id === "system-index") {
    const registry = id === "system" ? "system" : "system-index";
    const records = window.WS_APP.getSystemRecords?.({ includeArchived: false, registry })
      || (window.APP_DATA?.systemRecords || []).filter((record) => record && record.archived !== true && record.registry === registry);
    return {
      label: formatModuleMetricCount(records.length, id === "system" ? "RULE" : "ENTRY", id === "system" ? "RULES" : "ENTRIES"),
      empty: records.length === 0,
      statusLabel: id === "system" ? "RULEBOOK" : "INDEX",
      statusClass: "ready"
    };
  }

  if (id === "gm-layer") {
    const records = window.WS_APP.getSystemRecords?.({ includeArchived: false, registry: "gm-layer" })
      || (window.APP_DATA?.systemRecords || []).filter((record) => record && record.archived !== true && record.registry === "gm-layer");
    return {
      label: formatModuleMetricCount(records.length, "GM NOTE"),
      empty: records.length === 0,
      statusLabel: "BLACK",
      statusClass: "black"
    };
  }

  return { label: "", empty: false };
}

function getDatabaseNodeCountForMetric(user = {}) {
  const ids = ["citizen-database", "citizen-files", "case-files"];
  const modules = window.APP_DATA?.modules || [];
  return modules.filter((module) => ids.includes(module.id) && canOpenModule(module, user || window.WS_APP.currentUser)).length;
}

function getCitizenFileCountsForMetrics(user = {}) {
  const citizens = getVisibleCitizensForMetrics(user);
  const visibleIds = new Set(citizens.map((citizen) => citizen.id));
  const files = (window.WS_APP.getCitizenFiles?.({ user, includeArchived: false }) || [])
    .filter((record) => visibleIds.has(record.citizenId)).length;
  return { profiles: citizens.length, files };
}

function getModuleCardMetric(module = {}, user = {}) {
  const id = String(module.id || "").trim();
  try {
    if (id === "terminal-hub") return getTerminalModuleMetric(user);
    if (id === "subscriptions") return getSubscriptionsModuleMetric(user);
    if (id === "service") return getServiceModuleMetric(user);
    if (id === "equipment") return getEquipmentModuleMetric(user);
    if (id === "cyberware") return getCyberwareModuleMetric(user);
    if (id === "market") return window.WS_APP.getMarketModuleMetric?.(user) || getMarketModuleMetric(user);
    if (id === "housing") return window.WS_APP.getHousingModuleMetric?.(user) || getHousingModuleMetric(user);
    if (id === "citizen-card") return { label: "", empty: !user?.citizenId };
    if (id === "citizen-cards") {
      const citizens = getVisibleCitizensForMetrics();
      return { label: `${citizens.length} CITIZEN CARD${citizens.length === 1 ? "" : "S"}`, empty: citizens.length === 0 };
    }
    if (id === "citizen-database") {
      const citizens = getVisibleCitizensForMetrics(user);
      return {
        label: formatModuleMetricCount(citizens.length, "PROFILE"),
        empty: citizens.length === 0,
        statusLabel: "PROFILES",
        statusClass: "ready"
      };
    }
    if (id === "citizen-files") {
      const counts = getCitizenFileCountsForMetrics(user);
      return {
        label: `${formatModuleMetricCount(counts.profiles, "DOSSIER", "DOSSIERS")} / ${formatModuleMetricCount(counts.files, "FILE")}`,
        empty: counts.profiles === 0 && counts.files === 0,
        statusLabel: "FILES",
        statusClass: "ready"
      };
    }
    if (id === "case-files") {
      const cases = window.WS_APP.getCaseFiles?.({ includeArchived: false }) || [];
      const open = cases.filter((record) => String(record.status || "").toUpperCase() === "OPEN").length;
      const pending = cases.filter((record) => String(record.status || "").toUpperCase() === "PENDING").length;
      return { label: `${open} OPEN / ${pending} PENDING`, empty: cases.length === 0, statusLabel: "CASES", statusClass: "ready" };
    }
    if (id === "database") {
      const nodes = getDatabaseNodeCountForMetric(user);
      return {
        label: formatModuleMetricCount(nodes, "RECORD NODE"),
        empty: nodes === 0,
        statusLabel: "HUB",
        statusClass: "ready"
      };
    }
    if (id === "system-index" || id === "system" || id === "encyclopedia" || id === "gm-layer") {
      return getKnowledgeModuleMetric(id);
    }
    if (id === "access-control") {
      const users = window.WS_APP.getUsers?.({ includeDisabled: true }) || [];
      return { label: `${users.length} USER${users.length === 1 ? "" : "S"}`, empty: users.length === 0 };
    }
    if (id === "tag-registry") {
      const tags = window.WS_APP.getTags?.({ includeArchived: false }) || window.APP_DATA?.tags || [];
      return { label: `${tags.length} TAG${tags.length === 1 ? "" : "S"}`, empty: tags.length === 0 };
    }
    if (id === "address-core") {
      const addresses = window.WS_APP.getAddresses?.({ includeArchived: false }) || [];
      return { label: `${addresses.length} ADDRESS RECORD${addresses.length === 1 ? "" : "S"}`, empty: addresses.length === 0 };
    }
  } catch (error) {
    console.warn("W&S module metric failed.", error);
  }

  return { label: "", empty: false };
}

function getVisibleCitizensForMetrics(user = window.WS_APP.currentUser) {
  const citizens = window.WS_APP.getCitizens?.() || [];
  if (user?.role === "admin") return citizens.filter((citizen) => citizen.recordType !== "admin");
  return citizens.filter((citizen) => citizen.id === user?.citizenId);
}

function getTerminalModuleMetric(user = {}) {
  const requestCitizens = getVisibleCitizensForMetrics(user);
  const unreadCitizens = user?.role === "citizen" ? getVisibleCitizensForMetrics(user) : [];
  const unread = unreadCitizens.reduce((sum, citizen) => sum + (window.WS_APP.countUnreadTerminalEntries?.(citizen.id) || 0), 0);
  const requests = requestCitizens.reduce((sum, citizen) => {
    const list = window.WS_APP.getServiceRequests?.(citizen.id) || [];
    return sum + list.filter((request) => !["CLOSED", "DENIED", "ARCHIVED"].includes(String(request.status || "").toUpperCase())).length;
  }, 0);
  return { label: `${requests} OPEN REQUEST${requests === 1 ? "" : "S"}`, empty: unread === 0 && requests === 0, notificationCount: unread };
}

function getSubscriptionsModuleMetric(user = {}) {
  const citizens = user?.role === "admin" ? getVisibleCitizensForMetrics(user) : getVisibleCitizensForMetrics(user);
  let active = 0;
  let total = 0;
  citizens.forEach((citizen) => {
    const subscriptions = typeof window.WS_APP.normalizeSubscriptions === "function"
      ? window.WS_APP.normalizeSubscriptions(citizen)
      : (Array.isArray(citizen.subscriptions) ? citizen.subscriptions : []);
    total += subscriptions.length;
    active += subscriptions.filter((item) => item.active && String(item.status || "").toUpperCase() !== "CANCELLED").length;
  });
  return { label: `${active} ACTIVE / ${total} TOTAL`, empty: total === 0 };
}

function getServiceModuleMetric(user = {}) {
  const citizens = getVisibleCitizensForMetrics(user);
  let active = 0;
  let offers = 0;
  citizens.forEach((citizen) => {
    const activeEntries = typeof getActiveServiceLogEntries === "function"
      ? getActiveServiceLogEntries(citizen)
      : (Array.isArray(citizen.serviceLog) ? citizen.serviceLog.filter((entry) => String(entry?.status || "ACTIVE").toUpperCase() === "ACTIVE") : []);
    const contracts = typeof getCitizenServiceContracts === "function"
      ? getCitizenServiceContracts(citizen)
      : [];
    active += activeEntries.length;
    offers += contracts.filter((contract) => contract.status === "AVAILABLE").length;
  });
  return { label: `${active} ACTIVE / ${offers} OFFER${offers === 1 ? "" : "S"}`, empty: active === 0 && offers === 0 };
}

function getEquipmentModuleMetric(user = {}) {
  const citizenIds = getVisibleCitizensForMetrics(user)
    .map((citizen) => String(citizen?.id || "").trim())
    .filter(Boolean);
  const summary = typeof window.WS_APP.getEquipmentInstanceSummary === "function"
    ? window.WS_APP.getEquipmentInstanceSummary(citizenIds)
    : { itemCount: 0, equippedCount: 0 };
  const itemCount = Math.max(0, Number(summary?.itemCount) || 0);
  const equippedCount = Math.max(0, Number(summary?.equippedCount) || 0);
  return { label: `${itemCount} ITEM${itemCount === 1 ? "" : "S"} / ${equippedCount} EQUIPPED`, empty: itemCount === 0 };
}

function getCyberwareModuleMetric(user = {}) {
  const citizens = getVisibleCitizensForMetrics(user);
  let installed = 0;
  let operational = 0;
  citizens.forEach((citizen) => {
    const instances = typeof window.WS_APP.getInstalledCyberwareInstances === "function"
      ? window.WS_APP.getInstalledCyberwareInstances(citizen.id)
      : [];
    installed += instances.length;
    operational += instances.filter((instance) => {
      const state = String(instance?.cyberwareState?.operationalState || instance?.operationalState || "").trim().toUpperCase();
      return !["DISABLED", "FAULT", "LOCKED", "BROKEN", "OFFLINE"].includes(state);
    }).length;
  });
  return {
    label: `${installed} SYSTEM${installed === 1 ? "" : "S"} / ${operational} ONLINE`,
    empty: installed === 0,
    statusLabel: installed > 0 ? "BODY" : "EMPTY",
    statusClass: installed > 0 ? "ready" : "empty"
  };
}

function getMarketModuleMetric(user = {}) {
  const citizens = getVisibleCitizensForMetrics(user);
  let orders = 0;
  let active = 0;
  citizens.forEach((citizen) => {
    const rows = window.WS_APP.getCitizenMarketOrders?.(citizen.id) || [];
    orders += rows.length;
    active += rows.filter((order) => !["COMPLETED", "REFUNDED", "FAILED", "CANCELLED"].includes(String(order?.status || "").toUpperCase())).length;
  });
  return { label: `${active} ACTIVE / ${orders} ORDER${orders === 1 ? "" : "S"}`, empty: orders === 0 };
}

function getHousingModuleMetric(user = {}) {
  const citizens = getVisibleCitizensForMetrics(user);
  let records = 0;
  citizens.forEach((citizen) => {
    const explicit = Array.isArray(citizen.housing) ? citizen.housing.filter((entry) => entry && entry.archived !== true).length : 0;
    const rent = Array.isArray(citizen.subscriptions)
      ? citizen.subscriptions.filter((subscription) => String(subscription?.category || "").toUpperCase() === "RENT" && subscription.archived !== true).length
      : 0;
    records += Math.max(explicit, rent);
  });
  return { label: `${records} HABITAT RECORD${records === 1 ? "" : "S"}`, empty: false };
}

function bindModuleActions(container, user) {
  const cards = container.querySelectorAll(".module-card.is-openable");

  cards.forEach((card) => {
    const open = () => {
      rememberCurrentModuleView(user, card.dataset.id);
      const skipLoader = Boolean(card.closest(".database-hub-grid"));
      openModule(card.dataset.id, user, { skipLoader });
    };

    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function rememberCurrentModuleView(user, nextModuleId) {
  const currentModuleId = window.WS_APP.currentModuleId;
  if (!currentModuleId || currentModuleId === nextModuleId) return;

  const renderCurrent = getCurrentModuleViewRenderer(user, currentModuleId);
  if (renderCurrent) window.WS_APP.pushModuleView(renderCurrent);
}

function getCurrentModuleViewRenderer(user, moduleId) {
  if (moduleId === "database") return () => window.WS_APP.renderDatabaseHubModule?.(user);
  if (moduleId === "system" || moduleId === "system-index") return () => window.WS_APP.renderSystemModule?.(user, moduleId);
  if (moduleId === "encyclopedia") return () => window.WS_APP.renderEncyclopediaModule?.(user);
  if (moduleId === "character-creator") return () => window.WS_APP.renderCitizenCreatorModule?.(user);
  if (moduleId === "application-status") return () => window.WS_APP.renderApplicationStatusModule?.(user);
  if (moduleId === "subscriptions") return () => window.WS_APP.renderSubscriptionsModule?.(user);
  if (moduleId === "service") return () => window.WS_APP.renderServiceModule?.(user);
  if (moduleId === "equipment") return () => window.WS_APP.renderEquipmentModule?.(user);
  if (moduleId === "cyberware") return () => window.WS_APP.renderCyberwareModule?.(user);
  if (moduleId === "housing") return () => window.WS_APP.renderHousingModule?.(user);
  if (moduleId === "citizen-files") return () => window.WS_APP.renderCitizenFilesModule?.(user);
  if (moduleId === "citizen-database") return () => window.WS_APP.renderCitizenDatabaseModule?.(user);
  if (moduleId === "citizen-cards") return () => window.WS_APP.renderCitizenCardsModule?.(user);
  if (moduleId === "address-core") return () => window.WS_APP.renderAddressCoreModule?.(user);
  if (moduleId === "tag-registry") return () => window.WS_APP.renderTagRegistryModule?.(user);
  if (moduleId === "case-files") return () => window.WS_APP.renderCaseFilesModule?.(user);
  if (moduleId === "access-control") return () => window.WS_APP.renderAccessControlModule?.(user);
  return null;
}

function openModule(moduleId, user, options = {}) {
  const module = getModuleDefinition(moduleId);
  const granted = canOpenModule(module, user);
  const navigationSequence = window.WS_APP.beginModuleNavigation();
  const navigationOptions = { ...options, navigationSequence };

  if (options.skipLoader || window.WS_APP.isTestModeEnabled?.() || !window.WS_APP.runModuleAccessSequence) {
    if (granted) {
      renderModuleDirect(moduleId, user, module, navigationOptions);
    }
    return;
  }

  window.WS_APP.runModuleAccessSequence({ module, user, granted }).then((result) => {
    if (!window.WS_APP.isCurrentModuleNavigation(navigationSequence)) return;
    if (result.cancelled) {
      return;
    }

    if (!result.granted) {
      window.setTimeout(() => {
        if (window.WS_APP.currentUser === user && window.WS_APP.isCurrentModuleNavigation(navigationSequence)) {
          window.WS_APP.renderModules(user);
        }
      }, 520);
      return;
    }

    renderModuleDirect(moduleId, user, module, navigationOptions);
  });
}

window.WS_APP.openModule = openModule;

function getModuleDefinition(moduleId) {
  const modules = window.APP_DATA?.modules || [];
  return modules.find((module) => module.id === moduleId) || {
    id: moduleId,
    title: moduleId,
    description: "No module definition found.",
    status: "UNKNOWN",
    roles: []
  };
}

function canOpenModule(module, user) {
  if (!module || !user) return false;
  if (!Array.isArray(module.roles) || !module.roles.includes(user.role)) return false;
  if ((window.WS_APP.canAccessCitizenModule?.(module.id, user) ?? true) === false) return false;

  const status = String(module.status || "").toUpperCase();
  const restrictedStatuses = ["ADMIN", "BLACK", "LOCKED", "RESTRICTED"];

  if (user.role !== "admin" && restrictedStatuses.includes(status)) {
    return false;
  }

  if (window.WS_APP.canAccessRecord && !window.WS_APP.canAccessRecord(user, module)) {
    return false;
  }

  return true;
}

Object.assign(window.WS_APP, {
  bindModuleActions,
  canOpenModule,
  getModuleCardMetric,
  getModuleCardStatus,
  getShortModuleDescription
});

async function renderModuleDirect(moduleId, user, module = getModuleDefinition(moduleId), options = {}) {
  const navigationSequence = Number(options.navigationSequence || window.WS_APP.beginModuleNavigation());
  const terminalGrid = document.querySelector(".terminal-grid");

  terminalGrid?.classList.remove("is-inline-module-open");
  terminalGrid?.classList.add("is-card-open");

  try {
    await window.WS_APP.loadModuleBundle?.(moduleId, user);
    if (!window.WS_APP.isCurrentModuleNavigation(navigationSequence)) return;

    window.WS_APP.currentModuleId = moduleId;

    if (moduleId === "system") {
      window.WS_APP.renderSystemModule?.(user, "system");
      return;
    }

    if (moduleId === "system-index") {
      window.WS_APP.renderSystemModule?.(user, "system-index");
      return;
    }

    if (moduleId === "access-control") {
      window.WS_APP.renderAccessControlModule?.(user);
      return;
    }

    if (moduleId === "tag-registry") {
      window.WS_APP.renderTagRegistryModule?.(user);
      return;
    }

    if (moduleId === "encyclopedia") {
      window.WS_APP.renderEncyclopediaModule?.(user);
      return;
    }

    if (moduleId === "character-creator") {
      window.WS_APP.renderCitizenCreatorModule?.(user);
      return;
    }

    if (moduleId === "application-status") {
      window.WS_APP.renderApplicationStatusModule?.(user);
      return;
    }

    if (moduleId === "citizen-card") {
      window.WS_APP.renderCitizenCardModule?.(user, "CITIZEN CARD");
      return;
    }

    if (moduleId === "address-core") {
      window.WS_APP.renderAddressCoreModule?.(user);
      return;
    }

    if (moduleId === "citizen-cards") {
      window.WS_APP.renderCitizenCardsModule?.(user);
      return;
    }

    if (moduleId === "database") {
      window.WS_APP.renderDatabaseHubModule?.(user);
      return;
    }

    if (moduleId === "citizen-files") {
      window.WS_APP.renderCitizenFilesModule?.(user);
      return;
    }

    if (moduleId === "citizen-database") {
      window.WS_APP.renderCitizenDatabaseModule?.(user);
      return;
    }

    if (moduleId === "case-files") {
      window.WS_APP.renderCaseFilesModule?.(user);
      return;
    }

    if (moduleId === "subscriptions") {
      if (typeof window.WS_APP.renderSubscriptionsModule === "function") window.WS_APP.renderSubscriptionsModule(user);
      else renderModulePlaceholder(user, module);
      return;
    }

    if (moduleId === "service") {
      const targetCitizenId = String(options.citizenId || "").trim();
      const entityRef = options.entityRef && typeof options.entityRef === "object" ? options.entityRef : null;
      if (targetCitizenId) window.WS_APP.serviceTargetCitizenId = targetCitizenId;
      if (String(options.routeId || "").trim().toUpperCase() === "SERVICE_ORDER" && entityRef?.type === "SERVICE_ORDER") {
        window.WS_APP.serviceTargetOrderId = String(entityRef.id || "").trim();
      }
      if (typeof window.WS_APP.renderServiceModule === "function") window.WS_APP.renderServiceModule(user);
      else renderModulePlaceholder(user, module);
      return;
    }

    if (moduleId === "equipment") {
      const targetCitizenId = String(options.citizenId || "").trim();
      if (targetCitizenId) window.WS_APP.equipmentTargetCitizenId = targetCitizenId;
      if (window.WS_APP.renderEquipmentModule) window.WS_APP.renderEquipmentModule(user);
      else renderModulePlaceholder(user, module);
      return;
    }

    if (moduleId === "cyberware") {
      const targetCitizenId = String(options.citizenId || "").trim();
      const routeId = String(options.routeId || "").trim().toUpperCase();
      const entityRef = options.entityRef && typeof options.entityRef === "object" ? options.entityRef : null;
      const params = options.params && typeof options.params === "object" ? options.params : {};
      if (targetCitizenId) window.WS_APP.cyberwareTargetCitizenId = targetCitizenId;
      const selectedInstanceId = entityRef?.type === "ITEM_INSTANCE"
        ? String(entityRef.id || "").trim()
        : String(params.instanceId || params.instanceIds?.[0] || "").trim();
      if (targetCitizenId && selectedInstanceId) {
        window.WS_APP.setCyberwareSelectedInstance?.(targetCitizenId, selectedInstanceId, { syncView: false });
      }
      const cyberwareView = String(params.cyberwareView || options.section || (routeId === "CYBERWARE_WORLD_OPERATION" ? "OVERVIEW" : "OVERVIEW")).trim().toUpperCase();
      if (targetCitizenId) window.WS_APP.setCyberwareUiView?.(targetCitizenId, cyberwareView, { mount: false });
      if (routeId === "CYBERWARE_WORLD_OPERATION") {
        window.WS_APP.worldBridgeTargetOperationId = String(params.operationId || "").trim();
      }
      if (window.WS_APP.renderCyberwareModule) window.WS_APP.renderCyberwareModule(user, { activeView: cyberwareView });
      else renderModulePlaceholder(user, module);
      if (targetCitizenId) window.WS_APP.setCyberwareUiView?.(targetCitizenId, cyberwareView, { mount: true });
      return;
    }

    if (moduleId === "market") {
      const targetCitizenId = String(options.citizenId || "").trim();
      const routeId = String(options.routeId || "").trim().toUpperCase();
      const entityRef = options.entityRef && typeof options.entityRef === "object" ? options.entityRef : null;
      const params = options.params && typeof options.params === "object" ? options.params : {};
      if (targetCitizenId) window.WS_APP.marketTargetCitizenId = targetCitizenId;
      if (targetCitizenId && params.deliveryHousingId) {
        window.WS_APP.marketDeliveryHousingByCitizen = window.WS_APP.marketDeliveryHousingByCitizen || {};
        window.WS_APP.marketDeliveryHousingByCitizen[targetCitizenId] = String(params.deliveryHousingId || "").trim();
      }
      if (targetCitizenId && params.department) {
        window.WS_APP.housingMarketFiltersByCitizen = window.WS_APP.housingMarketFiltersByCitizen || {};
        window.WS_APP.housingMarketFiltersByCitizen[targetCitizenId] = {
          ...(window.WS_APP.housingMarketFiltersByCitizen[targetCitizenId] || {}),
          type: String(params.department || "ALL").trim().toUpperCase(),
          category: "ALL",
          page: 1
        };
      }
      if (routeId === "MARKET_ORDER") {
        const marketOrderId = entityRef?.type === "MARKET_ORDER"
          ? String(entityRef.id || "").trim()
          : String(params.marketOrderId || "").trim();
        if (targetCitizenId) {
          window.WS_APP.housingMarketModeByCitizen = window.WS_APP.housingMarketModeByCitizen || {};
          window.WS_APP.housingMarketModeByCitizen[targetCitizenId] = "ORDERS";
          window.WS_APP.housingSelectedMarketOrderByCitizen = window.WS_APP.housingSelectedMarketOrderByCitizen || {};
          if (marketOrderId) window.WS_APP.housingSelectedMarketOrderByCitizen[targetCitizenId] = marketOrderId;
        }
      }
      if (window.WS_APP.renderMarketModule) window.WS_APP.renderMarketModule(user);
      else renderModulePlaceholder(user, module);
      return;
    }

    if (moduleId === "housing") {
      const targetCitizenId = String(options.citizenId || "").trim();
      const section = String(options.section || options.params?.housingTab || "").trim().toUpperCase();
      if (targetCitizenId) window.WS_APP.housingTargetCitizenId = targetCitizenId;
      if (targetCitizenId && ["UNIT", "HOUSEHOLD", "STORAGE", "DELIVERIES"].includes(section)) {
        window.WS_APP.housingActiveTabByCitizen = window.WS_APP.housingActiveTabByCitizen || {};
        window.WS_APP.housingActiveTabByCitizen[targetCitizenId] = section;
      }
      if (window.WS_APP.renderHousingModule) window.WS_APP.renderHousingModule(user);
      else renderModulePlaceholder(user, module);
      return;
    }

    if (moduleId === "terminal-hub") {
      const requestedPanel = String(options.panel || "").trim().toLowerCase();
      const requestedSection = String(options.section || "").trim().toLowerCase();
      const targetPanel = ["inbox", "billing", "requests", "command"].includes(requestedPanel)
        ? requestedPanel
        : (window.WS_APP.terminalActivePanel || "inbox");
      const targetCitizenId = String(options.citizenId || "").trim();
      if (targetCitizenId) window.WS_APP.terminalTargetCitizenId = targetCitizenId;
      if (targetPanel === "billing" && requestedSection) {
        window.WS_APP.terminalBillingSection = requestedSection;
      }
      const renderTerminal = window.WS_APP.renderTerminalHubModule;
      if (typeof renderTerminal === "function") renderTerminal(user, targetPanel);
      else renderModulePlaceholder(user, module);
      return;
    }

    renderModulePlaceholder(user, module);
  } catch (error) {
    if (!window.WS_APP.isCurrentModuleNavigation(navigationSequence)) return;
    console.error("W&S module render failed.", moduleId, error);
    try {
      renderModuleFailure(user, module, error);
    } catch (fallbackError) {
      console.error("W&S module failure view could not render.", moduleId, fallbackError);
    }
  } finally {
    if (window.WS_APP.isCurrentModuleNavigation(navigationSequence)) {
      window.WS_APP.finishModuleTransition?.();
    }
  }
}

window.WS_APP.finishModuleTransition = function finishModuleTransition() {
  const container = document.querySelector("#module-grid");
  const terminalGrid = document.querySelector(".terminal-grid");

  terminalGrid?.classList.remove("is-module-loading");
  container?.classList.remove("is-module-transitioning");
  container?.classList.add("is-module-rendered");

  window.setTimeout(() => {
    container?.classList.remove("is-module-rendered");
  }, 280);
};


function renderModuleFailure(user, module = {}, error = null) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");
  if (!container) return;

  terminalGrid?.classList.add("is-card-open");
  if (status) status.textContent = `${String(module.title || module.id || "MODULE").toUpperCase()} / RENDER ERROR`;

  container.innerHTML = `
    <article class="module-detail system-article-view is-module-error">
      <div class="module-detail-head">
        <div>
          <p class="kicker">MODULE / LOCAL FAILURE</p>
          <h4>${escapeHtml(module.title || module.id || "MODULE")}</h4>
        </div>
        <button class="module-back-button" type="button">Back</button>
      </div>
      <section class="system-article-body">
        <strong class="module-status restricted">RENDER FAILED</strong>
        <p>The module could not complete its local render. The access shell has been released.</p>
        <div class="system-article-section">
          <h5>DIAGNOSTIC</h5>
          <p>${escapeHtml(error?.name || "MODULE_RENDER_ERROR")}</p>
        </div>
      </section>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => window.WS_APP.renderModules(user));
}

function renderModulePlaceholder(user, module) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");

  if (!container) return;

  terminalGrid?.classList.add("is-card-open");

  if (status) {
    status.textContent = `${String(module.title || module.id || "MODULE").toUpperCase()} / LOCAL`;
  }

  container.innerHTML = `
    <article class="module-detail system-article-view">
      <div class="module-detail-head">
        <div>
          <p class="kicker">MODULE / LOCAL PLACEHOLDER</p>
          <h4>${escapeHtml(module.title || module.id)}</h4>
        </div>

        <button class="module-back-button" type="button">Back</button>
      </div>

      <section class="system-article-body">
        <strong class="module-status ${escapeHtml(String(module.status || "UNKNOWN").toLowerCase())}">${escapeHtml(module.status || "UNKNOWN")}</strong>
        <p>${escapeHtml(module.description || "Renderer for this module is not assigned yet.")}</p>
        <div class="system-article-section">
          <h5>LOCAL RESPONSE</h5>
          <p>Access sequence completed. This module is registered, but its full panel has not been implemented yet.</p>
        </div>
      </section>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => window.WS_APP.renderModules(user));
}

function getRecordAccessGroups(record = {}) {
  const tags = window.WS_APP.getRecordAccessTags
    ? window.WS_APP.getRecordAccessTags(record)
    : (record.accessTags || [record.tag || "PUBLIC"]);
  if (window.WS_APP.splitAccessTags) return window.WS_APP.splitAccessTags(tags, ["PUBLIC"]);
  const classification = tags[0] || "PUBLIC";
  return { classification, compartments: tags.slice(1), tags };
}

function accessClassName(tag) {
  return String(tag || "PUBLIC").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
}

function renderCompactAccessBadge(record = {}, options = {}) {
  const groups = getRecordAccessGroups(record);
  const label = options.label || "ACCESS";
  return `
    <span class="compact-access-badges">
      <strong class="module-status record-access-badge ${escapeHtml(accessClassName(groups.classification))}"><span>${escapeHtml(label)}</span><i>${escapeHtml(groups.classification)}</i></strong>
      ${groups.compartments.length ? `<em>${groups.compartments.map((tag) => escapeHtml(tag)).join(" + ")}</em>` : ""}
    </span>
  `;
}

function renderRecordTagPills(record = {}) {
  const contentTags = Array.isArray(record.tags) ? record.tags : [];
  const accessGroups = getRecordAccessGroups(record);

  return `
    <div class="record-tag-matrix is-compact-record-tags ${contentTags.length ? "has-content-tags" : ""}">
      <div class="record-access-strip">
        <span>Access Required:</span>
        <p><i class="is-access is-classification-access">${escapeHtml(accessGroups.classification)}</i></p>
        ${accessGroups.compartments.length ? `
          <span>Required Tags:</span>
          <p class="record-access-compartments">${accessGroups.compartments.map((tag) => `<i class="is-access is-compartment-access">${escapeHtml(tag)}</i>`).join("")}</p>
        ` : ""}
      </div>
      ${contentTags.length ? `
        <div class="record-content-ribbons" aria-label="Content tags">
          ${contentTags.map((tag) => `<i>${escapeHtml(tag)}</i>`).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderEntryInput(name, label, value = "", extraClass = "") {
  return `
    <label class="entry-form-field ${escapeHtml(extraClass)}">
      ${escapeHtml(label)}
      <input name="${escapeHtml(name)}" value="${escapeHtml(value)}" />
    </label>
  `;
}

function renderEntryTextarea(name, label, value = "", extraClass = "", rows = 4) {
  return `
    <label class="entry-form-field ${escapeHtml(extraClass)}">
      ${escapeHtml(label)}
      <textarea name="${escapeHtml(name)}" rows="${escapeHtml(rows)}">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function renderEntrySelect(name, label, value = "PUBLIC") {
  const levels = ["PUBLIC", "CIVIL", "RESTRICTED", "BLACK", "GM"];

  return `
    <label class="entry-form-field">
      ${escapeHtml(label)}
      <select name="${escapeHtml(name)}">
        ${levels.map((level) => `<option value="${escapeHtml(level)}" ${level === value ? "selected" : ""}>${escapeHtml(level)}</option>`).join("")}
      </select>
    </label>
  `;
}

function parseRegistryList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeRegistryQuery(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseCreditValue(value) {
  if (typeof window.WS_APP?.parseCreditValue === "function") return window.WS_APP.parseCreditValue(value);
  if (typeof window.WS_APP?.parseCredits === "function") return window.WS_APP.parseCredits(value);
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);

  const cleaned = String(value || "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/,/g, ".");
  const number = Number(cleaned);

  return Number.isFinite(number) ? Math.round(number) : 0;
}

function formatCreditNumber(value) {
  if (typeof window.WS_APP?.formatCredits === "function") return window.WS_APP.formatCredits(value);
  const rounded = Math.round(Number(value) || 0);
  const sign = rounded < 0 ? "-" : "";
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${digits} â‚ˇ`;
}

function normalizeIncomeEntries(citizen) {
  return (Array.isArray(citizen?.income) ? citizen.income : [])
    .filter((income) => String(income?.serviceRecordId || "").trim())
    .map((income, index) => {
      const status = String(income.status || "ACTIVE").toUpperCase();
      const archivedAt = String(income.archivedAt || "").trim();
      return {
        id: income.id || `income-${index + 1}`,
        title: income.title || income.name || "Income Source",
        provider: income.provider || "LOCAL LEDGER",
        amount: parseCreditValue(income.amount),
        cycle: String(income.cycle || "WEEKLY").toUpperCase(),
        status,
        reference: String(income.reference || income.contractRef || "").trim(),
        details: String(income.details || income.description || "").trim(),
        terms: String(income.terms || "").trim(),
        serviceRecordId: String(income.serviceRecordId || "").trim(),
        serviceForm: String(income.serviceForm || "").trim().toUpperCase(),
        serviceCategory: String(income.serviceCategory || "").trim().toUpperCase(),
        oneTime: income.oneTime === true,
        createdBy: String(income.createdBy || "SYSTEM").trim(),
        updatedAt: String(income.updatedAt || "").trim(),
        archivedAt,
        active: !archivedAt && !["INACTIVE", "ARCHIVED", "SUSPENDED", "CANCELLED", "TERMINATED", "FAILED"].includes(status)
      };
    });
}

window.WS_APP.openCitizenRecord = function openCitizenRecord(citizenId, returnTarget = "database") {
  const user = window.WS_APP.currentUser;

  if (!user || !citizenId) return;

  window.WS_APP.renderCitizenFileRecord?.(user, citizenId, returnTarget);
};

function renderDataRow(label, value) {
  return `
    <div class="data-row">
      <b>${escapeHtml(label)}</b>
      <span>${escapeHtml(value)}</span>
    </div>
  `;
}

function escapeHtml(value) {
  if (typeof window.WS_APP?.escapeHtml === "function") return window.WS_APP.escapeHtml(value);
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.WS_APP.getCitizenNameLabel = window.WS_APP.getCitizenNameLabel || getCitizenNameLabel;
