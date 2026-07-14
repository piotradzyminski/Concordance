window.WS_APP = window.WS_APP || {};

/*
  Knowledge section renderer for SYSTEM and SYSTEM INDEX.
  SYSTEM = dry mechanics manual.
  SYSTEM INDEX = approved civic / propaganda index.
*/

const SYSTEM_BROWSER_CONFIG = {
  system: {
    title: "System",
    statusLabel: "SYSTEM",
    kicker: "SYSTEM / MECHANICS",
    heading: "Mechanics",
    description: "Zasady, procedury, katalogi i formuły używane podczas gry.",
    searchPlaceholder: "Filter rules / mechanics / category",
    emptyTitle: "NO MECHANICS RECORDS LOADED",
    emptyBody: "Rules, formulas and procedures will appear here after system seed import.",
    categories: ["ALL", "ABILITIES", "SKILLS", "ROLLS", "SERVICE", "ECONOMY", "SUBSCRIPTIONS", "CYBERWARE", "STATUS EFFECTS"]
  },
  "system-index": {
    title: "System Index",
    statusLabel: "SYSTEM INDEX",
    kicker: "SYSTEM INDEX / CIVIC MANUAL",
    heading: "Civic Manual",
    description: "Zatwierdzony obywatelski indeks pojęć, obowiązków i instytucji Systemu.",
    searchPlaceholder: "Filter approved entries / ministry / doctrine",
    emptyTitle: "NO AUTHORIZED CIVIC ENTRIES LOADED",
    emptyBody: "Approved System descriptions will appear here after index import.",
    categories: ["ALL", "MINISTRIES", "ORDER", "CITIZEN DUTIES", "PUBLIC SAFETY", "WORK", "HEALTH", "ACCESS", "ABUNDANCE", "UNITY"]
  }
};

function getSystemBrowserConfig(registry = "system") {
  return SYSTEM_BROWSER_CONFIG[registry === "system-index" ? "system-index" : "system"];
}

function getVisibleKnowledgeCategories(categories = [], records = []) {
  const source = Array.isArray(categories) ? categories : [];
  const counts = new Map();

  (Array.isArray(records) ? records : []).forEach((record) => {
    const category = String(record.category || "UNCATEGORIZED").trim().toUpperCase();
    counts.set(category, (counts.get(category) || 0) + 1);
  });

  return source.filter((category) => category === "ALL" || (counts.get(String(category).toUpperCase()) || 0) > 0);
}

function renderSystemSectionBlock(section = {}, registry = "system") {
  const title = String(section.title || "").trim();
  const body = String(section.body || "").trim();
  if (!title && !body) return "";

  const isCivicIndex = registry === "system-index";
  const normalizedTitle = normalizeKnowledgeText(title);
  const showTitle = title && !(isCivicIndex && ["approved description", "official description", "civic text"].includes(normalizedTitle));

  return `
    <div class="knowledge-section-block ${!showTitle ? "knowledge-section-block--plain" : ""}">
      ${showTitle ? `<h5>${escapeHtml(title)}</h5>` : ""}
      ${body ? `<p>${escapeHtml(body)}</p>` : ""}
    </div>
  `;
}

function getSystemKnowledgeMode(registry = "system") {
  return registry === "system-index" ? "civic-index" : "rulebook";
}

function getSystemDisplayType(article = {}, registry = article.registry || "system") {
  if (registry === "system-index") return "INDEX RECORD";
  const raw = String(article.type || "RULE").toUpperCase();
  if (raw.includes("CATALOG")) return "CATALOG";
  if (raw.includes("FORMULA")) return "FORMULA";
  if (raw.includes("PROCEDURE")) return "PROCEDURE";
  return "RULE";
}

function normalizeKnowledgeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function shouldShowKnowledgeLocalTitle(record = {}, summary = "") {
  const localTitle = String(record.localTitle || "").trim();
  if (!localTitle) return false;
  const normalizedLocal = normalizeKnowledgeText(localTitle);
  const normalizedTitle = normalizeKnowledgeText(record.title);
  const normalizedSummary = normalizeKnowledgeText(summary);
  if (!normalizedLocal || normalizedLocal === normalizedTitle) return false;
  if (normalizedSummary && normalizedSummary.startsWith(normalizedLocal)) return false;
  return true;
}

function formatKnowledgeLabel(value = "") {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}


function renderKnowledgeInfoList(items = []) {
  const rows = (Array.isArray(items) ? items : []).filter((item) => item && item.label && item.value);
  if (!rows.length) return "";
  return `
    <dl class="knowledge-info-list">
      ${rows.map((item) => `
        <div>
          <dt>${escapeHtml(item.label)}</dt>
          <dd>${escapeHtml(item.value)}</dd>
        </div>
      `).join("")}
    </dl>
  `;
}

function renderSystemModule(user, registry = "system") {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");
  const normalizedRegistry = registry === "system-index" ? "system-index" : "system";
  const config = getSystemBrowserConfig(normalizedRegistry);
  const mode = getSystemKnowledgeMode(normalizedRegistry);
  const records = getSystemArticles(normalizedRegistry, user);
  if (!container) return;

  terminalGrid?.classList.add("is-card-open");
  window.WS_APP.currentModuleId = normalizedRegistry;

  if (status) status.textContent = `${config.statusLabel} / ${records.length} ${normalizedRegistry === "system-index" ? "ENTRIES" : "RULES"}`;

  container.innerHTML = `
    <article class="module-detail knowledge-shell knowledge-shell--${escapeHtml(mode)}" data-registry="${escapeHtml(normalizedRegistry)}">
      <header class="knowledge-hero">
        <div class="knowledge-hero-main">
          <p class="kicker">${escapeHtml(config.kicker)}</p>
          <h4>${escapeHtml(config.heading)}</h4>
          <small>${escapeHtml(config.description)}</small>
        </div>
        <div class="knowledge-hero-actions">
          ${window.WS_APP.renderKnowledgePackIndicator?.({ compact: true }) || ""}
          <button class="module-back-button" type="button">Back</button>
        </div>
      </header>

      <section class="knowledge-browser-layout">
        <aside class="knowledge-browser-rail" aria-label="System filters">
          <section class="knowledge-control-bar">
            <input id="system-registry-filter" type="search" placeholder="${escapeHtml(config.searchPlaceholder)}" autocomplete="off" />
            <select id="system-registry-sort" aria-label="Sort records">
              <option value="title">Title A-Z</option>
              <option value="category">Category</option>
              <option value="updated">Updated</option>
            </select>
            ${user.role === "admin" ? `
              <span class="knowledge-admin-tools">
                <button type="button" id="system-default-button">Add Default</button>
                <button type="button" id="system-create-button">Create Blank</button>
              </span>
            ` : `<span class="knowledge-admin-tools knowledge-admin-tools--empty"></span>`}
          </section>

          <section class="knowledge-filter-grid" id="system-category-tabs" aria-label="Category filters">
            ${getVisibleKnowledgeCategories(config.categories, records).map((category, index) => renderKnowledgeCategoryTile(category, records, index === 0, normalizedRegistry)).join("")}
          </section>
        </aside>

        <section class="knowledge-browser-main">
          <section class="knowledge-card-list" id="system-record-list">
            ${renderSystemRecordList(records, user, normalizedRegistry)}
          </section>
        </section>
      </section>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => window.WS_APP.renderModules(user));
  bindSystemRegistry(user, normalizedRegistry);
}

function renderKnowledgeCategoryTile(category, records, active = false, registry = "system") {
  const count = category === "ALL" ? records.length : records.filter((record) => String(record.category || "").toUpperCase() === category).length;
  return `
    <button class="knowledge-filter-tile ${active ? "is-active" : ""}" type="button" data-category="${escapeHtml(category)}">
      <strong>${escapeHtml(category)}</strong>
      <i>${count}</i>
    </button>
  `;
}

function getSystemArticles(registry = null, user = window.WS_APP.currentUser) {
  const records = window.WS_APP.getSystemRecords?.({
    includeArchived: user?.role === "admin",
    registry
  }) || [];

  return records
    .filter((record) => user?.role === "admin" || !record.archived)
    .filter((record) => window.WS_APP.canAccessRecord ? window.WS_APP.canAccessRecord(user, record) : true)
    .sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "pl"));
}

function renderSystemRecordList(records, user, registry) {
  if (!records.length) return renderSystemEmptyState(user, registry);
  return records.map((article) => renderSystemArticleRow(article, registry)).join("");
}

function renderSystemEmptyState(user, registry = "system") {
  const config = getSystemBrowserConfig(registry);
  return `
    <div class="knowledge-empty-panel">
      <b>${escapeHtml(config.emptyTitle)}</b>
      <span>${escapeHtml(user.role === "admin" ? `${config.emptyBody} Use Add Default or import seeds.` : config.emptyBody)}</span>
    </div>
  `;
}

window.WS_APP.openSystemArticle = function openSystemArticleFromPanel(user, articleId) {
  renderSystemArticle(user || window.WS_APP.currentUser, articleId);
};

window.WS_APP.getSystemArticles = function getSystemArticlesForSearch() {
  return getSystemArticles(null, window.WS_APP.currentUser);
};

function renderSystemArticleRow(article, registry = article.registry || "system") {
  const archived = article.archived === true;
  const summary = article.officialSummary || article.summary || "No summary";
  const showLocalTitle = registry !== "system-index" && shouldShowKnowledgeLocalTitle(article, summary);

  return `
    <button class="knowledge-card knowledge-card--${escapeHtml(getSystemKnowledgeMode(registry))} ${archived ? "is-archived" : ""}" type="button" data-article-id="${escapeHtml(article.id)}">
      <span class="knowledge-card-main">
        <b>${escapeHtml(article.title)}</b>
        ${showLocalTitle ? `<em>${escapeHtml(article.localTitle)}</em>` : ""}
        <small>${escapeHtml(summary)}</small>
      </span>
      ${archived ? `<span class="knowledge-card-meta knowledge-card-meta--admin"><b class="knowledge-card-badge">ARCHIVED</b></span>` : ""}
    </button>
  `;
}

function bindSystemRegistry(user, registry) {
  const list = document.querySelector("#system-record-list");
  const input = document.querySelector("#system-registry-filter");
  const sort = document.querySelector("#system-registry-sort");
  const tabs = document.querySelector("#system-category-tabs");
  let activeCategory = "ALL";

  document.querySelector("#system-create-button")?.addEventListener("click", () => {
    window.WS_APP.pushModuleView?.(() => renderSystemModule(user, registry));
    renderSystemForm(user, registry);
  });

  document.querySelector("#system-default-button")?.addEventListener("click", () => {
    const saved = window.WS_APP.createDefaultSystemRecord?.(registry);
    if (saved) {
      window.WS_APP.appendTerminalLogLine?.(`SYSTEM RECORD CREATED / ${saved.title}`, { typed: true, speed: 8 });
      window.WS_APP.pushModuleView?.(() => renderSystemModule(user, registry));
      renderSystemArticle(user, saved.id);
    }
  });

  function applyFilters() {
    const query = normalizeRegistryQuery(input?.value || "");
    const sortMode = sort?.value || "title";
    let records = getSystemArticles(registry, user).filter((record) => {
      const categoryMatch = activeCategory === "ALL" || String(record.category || "").toUpperCase() === activeCategory;
      if (!categoryMatch) return false;
      if (!query) return true;
      return normalizeRegistryQuery(systemSearchBlob(record)).includes(query);
    });

    records = sortSystemRecords(records, sortMode);
    if (list) list.innerHTML = renderSystemRecordList(records, user, registry);
    bindSystemArticleRows(user);
  }

  tabs?.addEventListener("click", (event) => {
    const tile = event.target?.closest?.("[data-category]");
    if (!tile) return;
    activeCategory = String(tile.dataset.category || "ALL").toUpperCase();
    tabs.querySelectorAll(".knowledge-filter-tile").forEach((item) => item.classList.toggle("is-active", item === tile));
    applyFilters();
  });

  input?.addEventListener("input", applyFilters);
  sort?.addEventListener("change", applyFilters);
  bindSystemArticleRows(user);
}

function systemSearchBlob(record) {
  const registry = record?.registry === "system-index" ? "system-index" : "system";
  const relationLabels = registry === "system-index"
    ? (window.WS_APP.getKnowledgeRelationLabels?.(record.relatedEntries || [], "system-index") || record.relatedEntries || [])
    : [
        ...(window.WS_APP.getKnowledgeRelationLabels?.(record.relatedTerms || [], "encyclopedia") || record.relatedTerms || []),
        ...(window.WS_APP.getKnowledgeRelationLabels?.(record.relatedRules || [], "system") || record.relatedRules || [])
      ];

  return [
    record.title,
    record.localTitle,
    record.type,
    record.category,
    record.summary,
    record.officialSummary,
    ...(record.tags || []),
    ...(record.slogans || []),
    ...relationLabels,
    ...(record.sections || []).map((section) => `${section.title} ${section.body}`),
    ...systemDefinitionSearchParts(record)
  ].join(" ");
}

function sortSystemRecords(records, sortMode) {
  const copy = [...records];
  if (sortMode === "category") {
    return copy.sort((a, b) => String(a.category || "").localeCompare(String(b.category || ""), "pl") || String(a.title || "").localeCompare(String(b.title || ""), "pl"));
  }
  if (sortMode === "updated") {
    return copy.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) || String(a.title || "").localeCompare(String(b.title || ""), "pl"));
  }
  return copy.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "pl"));
}

function bindSystemArticleRows(user) {
  document.querySelectorAll(".knowledge-card[data-article-id]").forEach((row) => {
    row.addEventListener("click", () => {
      const article = window.WS_APP.getSystemRecordById?.(row.dataset.articleId);
      window.WS_APP.pushModuleView?.(() => renderSystemModule(user, article?.registry || "system"));
      renderSystemArticle(user, row.dataset.articleId);
    });
  });
}

function renderSystemArticle(user, articleId) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");
  const article = window.WS_APP.getSystemRecordById?.(articleId);

  if (!container || !article) return;
  if (window.WS_APP.canAccessRecord && !window.WS_APP.canAccessRecord(user, article)) {
    window.WS_APP.appendTerminalLogLine?.("SYSTEM RECORD DENIED / ACCESS TAG MISMATCH", { typed: true, speed: 8, extraClass: "module-denied-line" });
    renderSystemModule(user, article.registry || "system");
    return;
  }

  const registry = article.registry === "system-index" ? "system-index" : "system";
  const config = getSystemBrowserConfig(registry);
  const mode = getSystemKnowledgeMode(registry);
  const summary = article.officialSummary || article.summary || "";
  const isCivicIndex = registry === "system-index";
  const showLocalTitle = shouldShowKnowledgeLocalTitle(article, summary);
  const adminMeta = renderSystemRecordAdminMeta(article, user, registry);
  const relatedBlocks = renderSystemRelatedBlocks(article, user, registry);
  const layoutClass = `knowledge-record-layout knowledge-record-layout--single${relatedBlocks ? " knowledge-record-layout--with-sidecar" : ""}`;

  terminalGrid?.classList.add("is-card-open");
  if (status) status.textContent = `${config.statusLabel} / ${String(article.title || article.id).toUpperCase()}`;

  container.innerHTML = `
    <article class="module-detail knowledge-record-view knowledge-record-view--${escapeHtml(mode)}" data-system-record="${escapeHtml(article.id)}">
      <header class="knowledge-hero">
        <div class="knowledge-hero-main">
          <p class="kicker">${escapeHtml(config.kicker)}</p>
          <h4>${escapeHtml(article.title)}</h4>
          ${showLocalTitle ? `<small>${escapeHtml(article.localTitle)}</small>` : ""}
        </div>
        <div class="knowledge-hero-actions">
          ${window.WS_APP.renderKnowledgePackIndicator?.({ compact: true }) || ""}
          <button class="module-back-button" type="button">Back</button>
        </div>
      </header>

      ${user.role === "admin" ? renderSystemAdminActions(article) : ""}

      <section class="${layoutClass}">
        ${relatedBlocks ? `<aside class="knowledge-related-sidecar" aria-label="Related knowledge entries">${relatedBlocks}</aside>` : ""}
        <section class="knowledge-reading-panel">
          ${summary ? `<p class="knowledge-lead">${escapeHtml(summary)}</p>` : ""}
          ${(article.sections || []).map((section) => renderSystemSectionBlock(section, registry)).join("")}
          ${!isCivicIndex ? renderSystemDefinitionCatalog(article, user) : ""}
          ${adminMeta}
        </section>
      </section>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => renderSystemModule(user, registry));
  bindSystemArticleControls(user, article, registry);
  bindSystemRelatedNavigation(user, article);
  if (isSubscriptionCatalogRecord(article)) window.WS_APP.bindSubscriptionCatalogSystemActions?.(user, article);
}

function renderSystemRelatedBlocks(article, user, registry) {
  const termRefs = Array.isArray(article.relatedTerms) ? article.relatedTerms : [];
  const ruleRefs = Array.isArray(article.relatedRules) ? article.relatedRules : [];
  const entryRefs = Array.isArray(article.relatedEntries) ? article.relatedEntries : [];
  const blocks = [];

  if (registry !== "system-index" && termRefs.length) blocks.push(renderSystemRelatedTermBlock(termRefs, user));
  if (registry === "system-index" && entryRefs.length) blocks.push(renderSystemRelatedRecordBlock("RELATED INDEX ENTRIES", entryRefs, user, "system-index"));
  if (registry !== "system-index" && ruleRefs.length) blocks.push(renderSystemRelatedRecordBlock("RELATED RULES", ruleRefs, user, "system"));

  return blocks.join("");
}

function renderSystemRelatedTermBlock(references, user) {
  const links = references.map((reference) => {
    const entry = window.WS_APP.resolveEntryRef?.(reference, { includeArchived: user?.role === "admin" });
    if (!entry) return `<span class="knowledge-related-missing">${escapeHtml(reference)}</span>`;
    return `
      <button class="knowledge-related-link" type="button" data-related-entry-id="${escapeHtml(entry.id)}" title="Open ${escapeHtml(entry.term || entry.title || entry.id)}">
        ${escapeHtml(entry.term || entry.title || reference)}
      </button>
    `;
  }).join("");

  return `
    <div class="knowledge-related-box" data-related-scope="terms">
      <b>RELATED TERMS</b>
      <span class="knowledge-related-list">${links}</span>
    </div>
  `;
}

function renderSystemRelatedRecordBlock(label, references, user, registry) {
  const links = references.map((reference) => {
    const record = window.WS_APP.resolveSystemRecordRef?.(reference, { registry, includeArchived: user?.role === "admin" });
    if (!record) return `<span class="knowledge-related-missing">${escapeHtml(reference)}</span>`;
    return `
      <button class="knowledge-related-link" type="button" data-related-system-id="${escapeHtml(record.id)}" title="Open ${escapeHtml(record.title || record.id)}">
        ${escapeHtml(record.title || reference)}
      </button>
    `;
  }).join("");

  return `
    <div class="knowledge-related-box" data-related-scope="records">
      <b>${escapeHtml(label)}</b>
      <span class="knowledge-related-list">${links}</span>
    </div>
  `;
}

function bindSystemRelatedNavigation(user, currentArticle) {
  document.querySelectorAll("[data-related-system-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = window.WS_APP.getSystemRecordById?.(button.dataset.relatedSystemId);
      if (!target) return;
      window.WS_APP.pushModuleView?.(() => renderSystemArticle(user, currentArticle.id));
      renderSystemArticle(user, target.id);
    });
  });

  document.querySelectorAll("[data-related-entry-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.relatedEntryId;
      if (!targetId || !window.WS_APP.getEntryById?.(targetId)) return;
      window.WS_APP.pushModuleView?.(() => renderSystemArticle(user, currentArticle.id));
      window.WS_APP.openEntryRecord?.(user, targetId);
    });
  });
}

function renderSystemRecordAdminMeta(article, user, registry) {
  if (user?.role !== "admin") return "";
  return `
    <details class="knowledge-admin-meta">
      <summary>
        <span>Admin metadata</span>
        <b>${escapeHtml(article.archived ? "ARCHIVED" : "VISIBLE")}</b>
      </summary>
      ${renderKnowledgeInfoList([
        { label: "Registry", value: registry === "system-index" ? "SYSTEM INDEX" : "SYSTEM" },
        { label: "Category", value: article.category || "UNCATEGORIZED" },
        { label: "Reference", value: article.id }
      ])}
    </details>
  `;
}

function renderSystemAdminActions(article) {
  return `
    <section class="entry-record-actions system-record-actions knowledge-admin-actions">
      <button class="entry-record-action" type="button" id="system-edit-button">Edit Record</button>
      <button class="entry-record-action" type="button" id="system-duplicate-button">Duplicate</button>
      <button class="entry-record-action" type="button" id="system-dependency-preview-button">Preview Dependencies</button>
      ${article.archived ? `<button class="entry-record-action" type="button" id="system-restore-button">Restore</button><button class="entry-record-action danger" type="button" id="system-delete-button">Hard Delete</button>` : `<button class="entry-record-action danger" type="button" id="system-archive-button">Archive</button>`}
    </section>
  `;
}

function bindSystemArticleControls(user, article, registry) {
  document.querySelector("#system-edit-button")?.addEventListener("click", () => {
    window.WS_APP.pushModuleView?.(() => renderSystemArticle(user, article.id));
    renderSystemForm(user, registry, article.id);
  });
  document.querySelector("#system-duplicate-button")?.addEventListener("click", () => {
    const saved = window.WS_APP.duplicateSystemRecord?.(article.id);
    if (saved) renderSystemArticle(user, saved.id);
  });
  document.querySelector("#system-dependency-preview-button")?.addEventListener("click", () => {
    const preview = window.WS_APP.previewAdminRecordLifecycle?.({ recordType: "SYSTEM_RECORD", recordId: article.id, action: article.archived ? "HARD_DELETE" : "ARCHIVE", actor: user });
    window.alert?.(window.WS_APP.summarizeAdminRecordLifecyclePreview?.(preview) || preview?.message || "Preview unavailable.");
  });
  document.querySelector("#system-archive-button")?.addEventListener("click", async () => {
    const confirmed = await confirmRegistryAction("ARCHIVE SYSTEM RECORD", "Archive this system record?", "Archive");
    if (!confirmed) return;
    const result = window.WS_APP.requestAdminRecordLifecycleAction?.({ recordType: "SYSTEM_RECORD", recordId: article.id, action: "ARCHIVE", actor: user, expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(article) || 0, label: article.title || article.id });
    if (!result?.ok) return window.alert?.(`Archive failed: ${result?.resultCode || "UNKNOWN"}`);
    renderSystemModule(user, registry);
  });
  document.querySelector("#system-restore-button")?.addEventListener("click", () => {
    const result = window.WS_APP.requestAdminRecordLifecycleAction?.({ recordType: "SYSTEM_RECORD", recordId: article.id, action: "RESTORE", actor: user, expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(article) || 0, label: article.title || article.id });
    if (!result?.ok) return window.alert?.(`Restore failed: ${result?.resultCode || "UNKNOWN"}`);
    renderSystemArticle(user, article.id);
  });
  document.querySelector("#system-delete-button")?.addEventListener("click", async () => {
    const confirmed = await confirmRegistryAction("HARD DELETE SYSTEM RECORD", "Hard delete this archived system record? This cannot be undone.", "Hard Delete");
    if (!confirmed) return;
    const result = window.WS_APP.requestAdminRecordLifecycleAction?.({ recordType: "SYSTEM_RECORD", recordId: article.id, action: "HARD_DELETE", actor: user, expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(article) || 0, label: article.title || article.id });
    if (!result?.ok) return window.alert?.(`Hard delete failed: ${result?.resultCode || "UNKNOWN"}`);
    renderSystemModule(user, registry);
  });
}

function isSkillsAbilitiesRecord(article) {
  if (!article) return false;
  const title = String(article.title || "").toUpperCase();
  return article.id === "system-skills-abilities" || (title.includes("SKILLS") && title.includes("ABIL"));
}

function isSubscriptionCatalogRecord(article) {
  if (!article) return false;
  const title = String(article.title || "").toUpperCase();
  return article.id === "system-subscription-catalog" || (title.includes("SUBSCRIPTION") && title.includes("CATALOG"));
}

function renderSystemDefinitionCatalog(article, user) {
  if (isSkillsAbilitiesRecord(article)) {
    const definitions = article.definitions || {};
    const abilities = Array.isArray(definitions.abilities) ? definitions.abilities : [];
    const skills = Array.isArray(definitions.skills) ? definitions.skills : [];
    return `
      <div class="knowledge-section-block system-definition-catalog">
        <h5>ABILITIES REGISTRY</h5>
        ${renderAbilityDefinitionTable(abilities, user)}
      </div>
      <div class="knowledge-section-block system-definition-catalog">
        <h5>SKILLS REGISTRY</h5>
        ${renderSkillDefinitionTable(skills, user)}
      </div>
    `;
  }

  if (isSubscriptionCatalogRecord(article)) {
    const definitions = article.definitions || {};
    const subscriptions = Array.isArray(definitions.subscriptions) ? definitions.subscriptions : [];
    return `
      <div class="knowledge-section-block system-definition-catalog">
        <h5>AVAILABLE SUBSCRIPTIONS</h5>
        ${typeof window.WS_APP.renderSubscriptionCatalogDefinitionTable === "function" ? window.WS_APP.renderSubscriptionCatalogDefinitionTable(subscriptions, user) : `<p>${subscriptions.length} subscription definitions loaded.</p>`}
      </div>
    `;
  }

  return "";
}

function renderAbilityDefinitionTable(abilities, user) {
  const visible = (Array.isArray(abilities) ? abilities : []).filter((definition) => user?.role === "admin" || !definition.archived);
  if (!visible.length) return `<p>No ability definitions.</p>`;
  return `
    <div class="system-definition-table ability-definition-table">
      <div class="system-definition-head"><span>Ability</span><b>Description</b><b>Category</b></div>
      ${visible.map((definition) => `
        <div class="system-definition-row ${definition.archived ? "is-archived" : ""}">
          <span>${escapeHtml(definition.label)}</span>
          <p>${escapeHtml(definition.description || "No description.")}</p>
          <b>${escapeHtml(definition.category || "GENERAL")}</b>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSkillDefinitionTable(skills, user) {
  const visible = (Array.isArray(skills) ? skills : []).filter((definition) => user?.role === "admin" || !definition.archived);
  if (!visible.length) return `<p>No skill definitions.</p>`;
  return `
    <div class="system-definition-table skill-definition-table">
      <div class="system-definition-head"><span>Skill</span><b>Description</b><b>Category</b></div>
      ${visible.map((definition) => `
        <div class="system-definition-row ${definition.archived ? "is-archived" : ""}">
          <span>${escapeHtml(definition.label)}</span>
          <p>${escapeHtml(definition.description || "No description.")}</p>
          <b>${escapeHtml(definition.category || "GENERAL")}</b>
        </div>
      `).join("")}
    </div>
  `;
}

function systemDefinitionSearchParts(article) {
  const definitions = article?.definitions || {};
  const abilities = Array.isArray(definitions.abilities) ? definitions.abilities : [];
  const skills = Array.isArray(definitions.skills) ? definitions.skills : [];
  const subscriptions = Array.isArray(definitions.subscriptions) ? definitions.subscriptions : [];
  return [
    ...abilities.map((definition) => `${definition.label} ${definition.category} ${definition.description || ""} ${definition.id}`),
    ...skills.map((definition) => `${definition.label} ${definition.category} ${definition.description || ""} ${definition.id}`),
    ...subscriptions.map((definition) => `${definition.title} ${definition.provider} ${definition.category} ${definition.logo || ""} ${definition.description || ""} ${(definition.tiers || []).map((tier) => `${tier.label} ${tier.amount} ${tier.cycle} ${tier.description || ""}`).join(" ")} ${definition.id}`)
  ];
}


function renderSystemRecordTypeField(draft = {}, registry = "system") {
  const value = registry === "system-index" ? "INDEX_ENTRY" : String(draft.type || "RULE").trim().toUpperCase();
  const display = registry === "system-index" ? "INDEX RECORD" : getSystemDisplayType(draft, registry);
  return `
    <input type="hidden" name="type" value="${escapeHtml(value)}" />
    <label class="entry-form-field">
      Record class
      <input value="${escapeHtml(display)}" disabled />
    </label>
  `;
}

function renderSystemForm(user, registry = "system", articleId = null) {
  if (user?.role !== "admin") return;
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");
  const article = articleId ? window.WS_APP.getSystemRecordById?.(articleId) : null;
  const isEdit = Boolean(article);
  const normalizedRegistry = registry === "system-index" ? "system-index" : "system";
  const config = getSystemBrowserConfig(normalizedRegistry);
  const draft = article || {
    registry: normalizedRegistry,
    type: normalizedRegistry === "system-index" ? "INDEX_ENTRY" : "RULE",
    category: "UNCATEGORIZED",
    title: "",
    localTitle: "",
    tag: "PUBLIC",
    accessTags: ["PUBLIC"],
    tags: [],
    summary: "",
    officialSummary: "",
    slogans: [],
    sections: [],
    relatedTerms: [],
    relatedRules: [],
    relatedEntries: []
  };

  if (!container) return;
  terminalGrid?.classList.add("is-card-open");
  if (status) status.textContent = isEdit ? `${config.statusLabel} / EDIT RECORD` : `${config.statusLabel} / CREATE RECORD`;

  container.innerHTML = `
    <article class="module-detail system-article-view entry-form-view knowledge-form-view">
      <div class="module-detail-head knowledge-browser-head">
        <div>
          <p class="kicker">${escapeHtml(config.kicker)} / ${isEdit ? "MUTATE" : "CREATE"}</p>
          <h4>${isEdit ? "Edit Record" : "Create Record"}</h4>
        </div>
        <div class="knowledge-browser-head-actions">
          ${window.WS_APP.renderKnowledgePackIndicator?.({ compact: true }) || ""}
          <button class="module-back-button" type="button">Back</button>
        </div>
      </div>

      <form class="entry-form" id="system-form" autocomplete="off" ${isSkillsAbilitiesRecord(draft) ? 'data-definition-editor="skills-abilities"' : isSubscriptionCatalogRecord(draft) ? 'data-definition-editor="subscription-catalog"' : ""}>
        <div class="entry-form-message" id="system-form-message"></div>
        <div class="entry-form-grid">
          ${renderEntryInput("title", "Title", draft.title || "")}
          ${renderEntryInput("localTitle", "Local title / PL", draft.localTitle || "")}
          ${renderSystemRecordTypeField(draft, normalizedRegistry)}
          ${renderEntryInput("category", "Category", draft.category || "UNCATEGORIZED")}
          ${window.WS_APP.renderContentTagSelect?.("tags", draft.tags || [], { label: "Content tags", extraClass: "is-wide" }) || renderEntryInput("tags", "Content tags", (draft.tags || []).join(", "), "is-wide")}
          ${window.WS_APP.renderAccessTagSelect?.("accessTags", draft.accessTags || [draft.tag || "PUBLIC"], { label: "Required access tags", extraClass: "is-wide" }) || ""}
          ${renderEntryInput("summary", "Summary", draft.summary || "", "is-wide")}
          ${normalizedRegistry === "system-index" ? renderEntryInput("officialSummary", "Official summary", draft.officialSummary || draft.summary || "", "is-wide") : ""}
          ${normalizedRegistry === "system-index" ? renderEntryTextarea("slogans", "Slogans, comma separated", (draft.slogans || []).join(", "), "is-wide", 3) : ""}
          ${renderEntryTextarea("sections", "Sections. Format: title line, then body. Separate sections with --- on its own line.", sectionsToText(draft.sections || []), "is-wide", 12)}
          ${normalizedRegistry !== "system-index" ? renderEntryTextarea("relatedTerms", "Related Encyclopedia terms, comma separated", (window.WS_APP.formatKnowledgeRelationRefsForEditor?.(draft.relatedTerms || draft.related || [], "encyclopedia") || draft.relatedTerms || draft.related || []).join(", "), "is-wide", 3) : ""}
          ${normalizedRegistry === "system-index" ? renderEntryTextarea("relatedEntries", "Related System Index entries, comma separated", (window.WS_APP.formatKnowledgeRelationRefsForEditor?.(draft.relatedEntries || [], "system-index") || draft.relatedEntries || []).join(", "), "is-wide", 3) : renderEntryTextarea("relatedRules", "Related System rules, comma separated", (window.WS_APP.formatKnowledgeRelationRefsForEditor?.(draft.relatedRules || [], "system") || draft.relatedRules || []).join(", "), "is-wide", 3)}
        </div>
        ${typeof window.WS_APP.renderSystemDefinitionEditor === "function" ? window.WS_APP.renderSystemDefinitionEditor(draft) : ""}
        <footer class="entry-form-actions">
          <button class="entry-form-cancel" type="button" id="system-form-cancel">Cancel</button>
          <button class="entry-form-save" type="submit">Save Record</button>
        </footer>
      </form>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => renderSystemModule(user, normalizedRegistry));
  document.querySelector("#system-form-cancel")?.addEventListener("click", () => isEdit ? renderSystemArticle(user, article.id) : renderSystemModule(user, normalizedRegistry));

  if (typeof bindSystemDefinitionEditor === "function") bindSystemDefinitionEditor(document.querySelector("#system-form"));

  document.querySelector("#system-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = collectSystemForm(form, normalizedRegistry);
    if (!payload.title) {
      const message = document.querySelector("#system-form-message");
      if (message) message.textContent = "SAVE FAILED / TITLE REQUIRED";
      return;
    }
    const saved = isEdit ? window.WS_APP.updateSystemRecord?.(article.id, payload) : window.WS_APP.createSystemRecord?.(payload);
    if (saved) {
      window.WS_APP.appendTerminalLogLine?.(`SYSTEM RECORD SAVED / ${saved.title}`, { typed: true, speed: 8 });
      renderSystemArticle(user, saved.id);
    }
  });
}


function bindSystemDefinitionEditor(form) {
  if (!form || !form.dataset.definitionEditor) return;
  if (form.dataset.definitionEditor === "subscription-catalog") {
    window.WS_APP.bindSubscriptionCatalogDefinitionEditor?.(form);
    return;
  }

  form.addEventListener("click", (event) => {
    if (form.dataset.definitionEditor === "subscription-catalog") return;

    if (form.dataset.definitionEditor !== "skills-abilities") return;

    const add = event.target?.closest?.("[data-add-definition]");
    const duplicate = event.target?.closest?.("[data-duplicate-definition]");
    const remove = event.target?.closest?.("[data-delete-definition]");

    if (add) {
      const type = add.dataset.addDefinition;
      const list = form.querySelector(`[data-definition-list='${type === "skill" ? "skills" : "abilities"}']`);
      if (list) list.insertAdjacentHTML("beforeend", type === "skill" ? renderSkillDefinitionEditorRow({}) : renderAbilityDefinitionEditorRow({}));
      return;
    }

    if (duplicate) {
      const row = duplicate.closest(".definition-editor-row");
      if (row) row.insertAdjacentHTML("afterend", row.outerHTML.replace(/data-definition-id="[^"]*"/, 'data-definition-id=""'));
      return;
    }

    if (remove) remove.closest(".definition-editor-row")?.remove();
  });
}

function collectSystemForm(form, registry) {
  const data = new FormData(form);
  const accessTags = window.WS_APP.collectMultiSelectValues?.(form, "accessTags", ["PUBLIC"]) || ["PUBLIC"];
  const payload = {
    registry,
    title: String(data.get("title") || "").trim(),
    localTitle: String(data.get("localTitle") || "").trim(),
    type: String(data.get("type") || (registry === "system-index" ? "INDEX_ENTRY" : "RULE")).trim().toUpperCase(),
    category: String(data.get("category") || "UNCATEGORIZED").trim().toUpperCase(),
    tag: accessTags[0] || "PUBLIC",
    tags: window.WS_APP.collectContentTagValues?.(form, "tags") || parseRegistryList(data.get("tags")),
    accessTags,
    summary: String(data.get("summary") || "").trim(),
    officialSummary: String(data.get("officialSummary") || "").trim(),
    slogans: parseRegistryList(data.get("slogans")),
    sections: parseSystemSections(data.get("sections")),
    relatedTerms: registry === "system-index"
      ? []
      : (typeof window.WS_APP.normalizeKnowledgeRelationRefs === "function"
        ? window.WS_APP.normalizeKnowledgeRelationRefs(parsePlainReferenceList(data.get("relatedTerms")), "encyclopedia")
        : parsePlainReferenceList(data.get("relatedTerms"))),
    relatedRules: registry === "system-index"
      ? []
      : (typeof window.WS_APP.normalizeKnowledgeRelationRefs === "function"
        ? window.WS_APP.normalizeKnowledgeRelationRefs(parsePlainReferenceList(data.get("relatedRules")), "system")
        : parsePlainReferenceList(data.get("relatedRules"))),
    relatedEntries: registry === "system-index"
      ? (typeof window.WS_APP.normalizeKnowledgeRelationRefs === "function"
        ? window.WS_APP.normalizeKnowledgeRelationRefs(parsePlainReferenceList(data.get("relatedEntries")), "system-index")
        : parsePlainReferenceList(data.get("relatedEntries")))
      : []
  };

  if (form.dataset.definitionEditor === "skills-abilities") payload.definitions = collectSystemDefinitions(form);
  if (form.dataset.definitionEditor === "subscription-catalog" && typeof window.WS_APP.collectSystemSubscriptionDefinitions === "function") payload.definitions = window.WS_APP.collectSystemSubscriptionDefinitions(form);
  return payload;
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function collectSystemDefinitions(form) {
  return {
    abilities: Array.from(form.querySelectorAll("[data-definition-row='ability']")).map((row) => {
      const label = readDefinitionField(row, "label") || "New Ability";
      return {
        id: row.dataset.definitionId || slugifyDefinition(`ability-${label}`),
        label,
        category: readDefinitionField(row, "category") || "GENERAL",
        description: readDefinitionField(row, "description"),
        maxNatural: clampNumber(readDefinitionField(row, "maxNatural"), 1, 7),
        maxCyberware: clampNumber(readDefinitionField(row, "maxCyberware"), 0, 8),
        archived: readDefinitionCheckbox(row, "archived")
      };
    }),
    skills: Array.from(form.querySelectorAll("[data-definition-row='skill']")).map((row) => {
      const label = readDefinitionField(row, "label") || "New Skill";
      return {
        id: row.dataset.definitionId || slugifyDefinition(`skill-${label}`),
        label,
        category: readDefinitionField(row, "category") || "GENERAL",
        description: readDefinitionField(row, "description"),
        maxValue: clampNumber(readDefinitionField(row, "maxValue"), 1, 10),
        archived: readDefinitionCheckbox(row, "archived")
      };
    })
  };
}

function readDefinitionField(row, field) {
  return String(row.querySelector(`[data-definition-field='${field}']`)?.value || "").trim();
}

function readDefinitionCheckbox(row, field) {
  return row.querySelector(`[data-definition-field='${field}']`)?.checked === true;
}

function slugifyDefinition(value) {
  return String(value || "definition")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54) || "definition";
}

function sectionsToText(sections) {
  return (Array.isArray(sections) ? sections : [])
    .map((section) => `${section.title || "SECTION"}\n${section.body || ""}`.trim())
    .join("\n---\n");
}

function parsePlainReferenceList(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseSystemSections(value) {
  return String(value || "")
    .split(/\n-{3,}\n/g)
    .map((block, index) => {
      const lines = block.split("\n");
      const title = String(lines.shift() || `SECTION ${index + 1}`).trim();
      const body = lines.join("\n").trim();
      return { title, body };
    })
    .filter((section) => section.title || section.body);
}

window.WS_APP.renderSystemArticle = renderSystemArticle;
window.WS_APP.renderSystemModule = renderSystemModule;
