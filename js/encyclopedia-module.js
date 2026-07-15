window.WS_APP = window.WS_APP || {};

const ENCYCLOPEDIA_CATEGORIES = ["ALL", "PEOPLE", "SERVICE", "SYSTEM", "CORPORATIONS", "SECURITY", "MEDICAL", "ECONOMY", "NETWORK", "DAILY LIFE"];

function getVisibleEntryCategories(categories = [], entries = []) {
  const counts = new Map();
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const category = String(entry.category || "UNCLASSIFIED").trim().toUpperCase();
    counts.set(category, (counts.get(category) || 0) + 1);
  });

  return (Array.isArray(categories) ? categories : []).filter((category) => category === "ALL" || (counts.get(String(category).toUpperCase()) || 0) > 0);
}

function renderEncyclopediaModule(user) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");
  const entries = getVisibleEntries(user);
  if (!container) return;

  terminalGrid?.classList.add("is-card-open");
  if (status) status.textContent = `ENCYCLOPEDIA / ${entries.length} TERMS`;

  container.innerHTML = `
    <article class="module-detail knowledge-shell knowledge-shell--glossary" data-registry="entries">
      <header class="knowledge-hero">
        <div class="knowledge-hero-main">
          <p class="kicker">ENCYCLOPEDIA / GLOSSARY</p>
          <h4>Term Index</h4>
          <small>Słowniczek pojęć używanych w aplikacji i świecie gry.</small>
        </div>
        <div class="knowledge-hero-actions">
          ${window.WS_APP.renderKnowledgePackIndicator?.({ compact: true }) || ""}
          <button class="module-back-button" type="button">Back</button>
        </div>
      </header>

      <section class="knowledge-browser-layout">
        <aside class="knowledge-browser-rail" aria-label="Encyclopedia filters">
          <section class="knowledge-control-bar">
            <input id="entry-registry-filter" type="search" placeholder="Filter terms / aliases / related concepts" autocomplete="off" />
            <select id="entry-registry-sort" aria-label="Sort terms">
              <option value="term">Term A-Z</option>
              <option value="category">Category</option>
              <option value="updated">Updated</option>
            </select>
            ${user.role === "admin" ? `
              <span class="knowledge-admin-tools">
                <button type="button" id="entry-default-button">Add Default Term</button>
                <button type="button" id="entry-create-button">Create Blank</button>
              </span>
            ` : `<span class="knowledge-admin-tools knowledge-admin-tools--empty"></span>`}
          </section>

          <section class="knowledge-filter-grid" id="entry-category-tabs" aria-label="Term category filters">
            ${getVisibleEntryCategories(ENCYCLOPEDIA_CATEGORIES, entries).map((category, index) => renderEntryCategoryTile(category, entries, index === 0)).join("")}
          </section>
        </aside>

        <section class="knowledge-browser-main">
          <section class="knowledge-card-list" id="entry-record-list">
            ${renderEntryRows(entries, user)}
          </section>
        </section>
      </section>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => window.WS_APP.renderModules(user));
  bindEntryRegistry(user);
}

window.WS_APP.openEntryRecord = function openEntryRecord(user, entryId) {
  renderEntryRecord(user || window.WS_APP.currentUser, entryId);
};

function getVisibleEntries(user, options = {}) {
  const entries = window.WS_APP.getEntries?.({ includeArchived: user?.role === "admin" }) || [];
  const includeArchived = options.includeArchived === true || user?.role === "admin";

  return entries
    .filter((entry) => includeArchived || !entry.archived)
    .filter((entry) => canViewEntry(entry, user))
    .sort((a, b) => getEntryTerm(a).localeCompare(getEntryTerm(b), "pl"));
}

function canViewEntry(entry, user) {
  if (!entry || !user) return false;
  if (entry.archived && user.role !== "admin") return false;
  return true;
}

function getEntryTerm(entry = {}) {
  return String(entry.term || entry.title || entry.id || "TERM");
}

function getEntryLocalTerm(entry = {}) {
  return String(entry.localTerm || "");
}

function getEntryDefinition(entry = {}) {
  return String(entry.shortDefinition || entry.summary || "");
}

function getEntryBody(entry = {}) {
  return String(entry.body || entry.publicText || "");
}

function getEntryRelated(entry = {}) {
  return Array.isArray(entry.relatedTerms) ? entry.relatedTerms : Array.isArray(entry.related) ? entry.related : [];
}

function renderEntryCategoryTile(category, entries, active = false) {
  const count = category === "ALL" ? entries.length : entries.filter((entry) => String(entry.category || "").toUpperCase() === category).length;
  return `
    <button class="knowledge-filter-tile ${active ? "is-active" : ""}" type="button" data-category="${escapeHtml(category)}">
      <strong>${escapeHtml(category)}</strong>
      <i>${count}</i>
    </button>
  `;
}

function renderEntryRows(entries, user) {
  if (!entries.length) {
    return `
      <div class="knowledge-empty-panel">
        <b>NO GLOSSARY TERMS LOADED</b>
        <span>${user.role === "admin" ? "ADD DEFAULT TERM OR IMPORT PLAYER-FACING DEFINITIONS" : "PLAYER-FACING DEFINITIONS WILL APPEAR HERE AFTER TERM IMPORT"}</span>
      </div>
    `;
  }

  return entries.map((entry) => renderEntryRow(entry)).join("");
}

function renderEntryRow(entry) {
  const archived = entry.archived === true;
  return `
    <button class="knowledge-term-card knowledge-card ${archived ? "is-archived" : ""}" type="button" data-entry-id="${escapeHtml(entry.id)}">
      <span class="knowledge-card-main">
        <b>${escapeHtml(getEntryTerm(entry))}</b>
        ${getEntryLocalTerm(entry) ? `<em>${escapeHtml(getEntryLocalTerm(entry))}</em>` : ""}
        <small>${escapeHtml(getEntryDefinition(entry) || "No definition")}</small>
      </span>
      ${archived ? `<span class="knowledge-card-meta knowledge-card-meta--admin"><b class="knowledge-card-badge">ARCHIVED</b></span>` : ""}
    </button>
  `;
}

function bindEntryRegistry(user) {
  const list = document.querySelector("#entry-record-list");
  const input = document.querySelector("#entry-registry-filter");
  const sort = document.querySelector("#entry-registry-sort");
  const tabs = document.querySelector("#entry-category-tabs");
  let activeCategory = "ALL";

  document.querySelector("#entry-create-button")?.addEventListener("click", () => {
    window.WS_APP.pushModuleView?.(() => renderEncyclopediaModule(user));
    renderEntryForm(user);
  });

  document.querySelector("#entry-default-button")?.addEventListener("click", () => {
    const saved = window.WS_APP.createDefaultEntry?.();
    if (saved) {
      window.WS_APP.appendTerminalLogLine?.(`TERM CREATED / ${saved.title}`, { typed: true, speed: 8 });
      window.WS_APP.pushModuleView?.(() => renderEncyclopediaModule(user));
      renderEntryRecord(user, saved.id);
    }
  });

  function applyFilters() {
    const query = normalizeRegistryQuery(input?.value || "");
    const sortMode = sort?.value || "term";
    let entries = getVisibleEntries(user).filter((entry) => {
      const categoryMatch = activeCategory === "ALL" || String(entry.category || "").toUpperCase() === activeCategory;
      if (!categoryMatch) return false;
      if (!query) return true;
      return normalizeRegistryQuery(entrySearchBlob(entry)).includes(query);
    });

    entries = sortEntries(entries, sortMode);
    if (list) list.innerHTML = renderEntryRows(entries, user);
    bindEntryRowOpen(user);
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
  bindEntryRowOpen(user);
}

function entrySearchBlob(entry) {
  return [
    entry.term,
    entry.localTerm,
    entry.title,
    entry.category,
    entry.shortDefinition,
    entry.body,
    entry.summary,
    entry.publicText,
    ...(entry.aliases || []),
    ...(entry.tags || []),
    ...(window.WS_APP.getKnowledgeRelationLabels?.(getEntryRelated(entry), "encyclopedia") || getEntryRelated(entry))
  ].join(" ");
}

function sortEntries(entries, sortMode) {
  const copy = [...entries];
  if (sortMode === "category") return copy.sort((a, b) => String(a.category || "").localeCompare(String(b.category || ""), "pl") || getEntryTerm(a).localeCompare(getEntryTerm(b), "pl"));
  if (sortMode === "updated") return copy.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) || getEntryTerm(a).localeCompare(getEntryTerm(b), "pl"));
  return copy.sort((a, b) => getEntryTerm(a).localeCompare(getEntryTerm(b), "pl"));
}

function bindEntryRowOpen(user) {
  document.querySelectorAll(".knowledge-term-card[data-entry-id]").forEach((row) => {
    row.addEventListener("click", () => {
      window.WS_APP.pushModuleView?.(() => renderEncyclopediaModule(user));
      renderEntryRecord(user, row.dataset.entryId);
    });
  });
}

function renderEntryRecord(user, entryId) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");
  const entry = window.WS_APP.getEntryById?.(entryId);

  if (!container || !entry || !canViewEntry(entry, user)) return;

  terminalGrid?.classList.add("is-card-open");
  if (status) status.textContent = `ENCYCLOPEDIA / ${getEntryTerm(entry).toUpperCase()}`;

  const aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
  const adminMeta = renderEntryAdminMeta(entry, user);
  const relatedBlock = renderEntryRelated(entry, user);
  const layoutClass = `knowledge-record-layout knowledge-record-layout--single${relatedBlock ? " knowledge-record-layout--with-sidecar" : ""}`;

  container.innerHTML = `
    <article class="module-detail knowledge-record-view knowledge-record-view--glossary" data-entry-record="${escapeHtml(entry.id)}">
      <header class="knowledge-hero">
        <div class="knowledge-hero-main">
          <p class="kicker">ENCYCLOPEDIA / GLOSSARY</p>
          <h4>${escapeHtml(getEntryTerm(entry))}</h4>
          ${getEntryLocalTerm(entry) ? `<small>${escapeHtml(getEntryLocalTerm(entry))}</small>` : ""}
        </div>
        <div class="knowledge-hero-actions">
          ${window.WS_APP.renderKnowledgePackIndicator?.({ compact: true }) || ""}
          <button class="module-back-button" type="button">Back</button>
        </div>
      </header>

      ${user.role === "admin" ? renderEntryAdminActions(entry) : ""}

      <section class="${layoutClass}">
        ${relatedBlock ? `<aside class="knowledge-related-sidecar" aria-label="Related encyclopedia terms">${relatedBlock}</aside>` : ""}
        <section class="knowledge-reading-panel">
          ${getEntryDefinition(entry) ? `<p class="knowledge-lead">${escapeHtml(getEntryDefinition(entry))}</p>` : ""}
          <div class="knowledge-section-block knowledge-section-block--plain">
            <p>${escapeHtml(getEntryBody(entry) || "No readable definition has been entered.")}</p>
          </div>
          ${aliases.length ? renderEntryAliases(entry) : ""}
          ${adminMeta}
        </section>
      </section>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => renderEncyclopediaModule(user));
  bindEntryRecordControls(user, entry);
  bindEntryRelatedNavigation(user, entry);
}

function renderEntryAdminMeta(entry, user) {
  if (user?.role !== "admin") return "";
  return `
    <details class="knowledge-admin-meta">
      <summary>
        <span>Admin metadata</span>
        <b>${escapeHtml(entry.archived ? "ARCHIVED" : "VISIBLE")}</b>
      </summary>
      ${renderKnowledgeInfoList([
        { label: "Registry", value: "ENCYCLOPEDIA" },
        { label: "Category", value: entry.category || "UNCLASSIFIED" },
        { label: "Reference", value: entry.id }
      ])}
    </details>
  `;
}

function renderEntryAdminActions(entry) {
  return `
    <section class="entry-record-actions knowledge-admin-actions">
      <button class="entry-record-action" type="button" id="entry-edit-button">Edit Term</button>
      <button class="entry-record-action" type="button" id="entry-duplicate-button">Duplicate</button>
      <button class="entry-record-action" type="button" id="entry-dependency-preview-button">Preview Dependencies</button>
      ${entry.archived ? `<button class="entry-record-action" type="button" id="entry-restore-button">Restore</button><button class="entry-record-action danger" type="button" id="entry-delete-button">Hard Delete</button>` : `<button class="entry-record-action danger" type="button" id="entry-archive-button">Archive</button>`}
    </section>
  `;
}

function bindEntryRecordControls(user, entry) {
  document.querySelector("#entry-edit-button")?.addEventListener("click", () => {
    window.WS_APP.pushModuleView?.(() => renderEntryRecord(user, entry.id));
    renderEntryForm(user, entry.id);
  });
  document.querySelector("#entry-duplicate-button")?.addEventListener("click", () => {
    const saved = window.WS_APP.duplicateEntry?.(entry.id);
    if (saved) {
      window.WS_APP.appendTerminalLogLine?.(`TERM DUPLICATED / ${saved.title}`, { typed: true, speed: 8 });
      renderEntryRecord(user, saved.id);
    }
  });
  document.querySelector("#entry-dependency-preview-button")?.addEventListener("click", () => {
    const preview = window.WS_APP.previewAdminRecordLifecycle?.({ recordType: "ENCYCLOPEDIA_ENTRY", recordId: entry.id, action: entry.archived ? "HARD_DELETE" : "ARCHIVE", actor: user });
    window.alert?.(window.WS_APP.summarizeAdminRecordLifecyclePreview?.(preview) || preview?.message || "Preview unavailable.");
  });
  document.querySelector("#entry-delete-button")?.addEventListener("click", async () => {
    const confirmed = await confirmRegistryAction("HARD DELETE ENCYCLOPEDIA TERM", "Hard delete this archived glossary term? This cannot be undone.", "Hard Delete");
    if (!confirmed) return;
    const result = window.WS_APP.requestAdminRecordLifecycleAction?.({ recordType: "ENCYCLOPEDIA_ENTRY", recordId: entry.id, action: "HARD_DELETE", actor: user, expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(entry) || 0, label: entry.title || entry.term || entry.id });
    if (!result?.ok) return window.alert?.(`Hard delete failed: ${result?.resultCode || "UNKNOWN"}`);
    renderEncyclopediaModule(user);
  });
  document.querySelector("#entry-archive-button")?.addEventListener("click", async () => {
    const confirmed = await confirmRegistryAction("ARCHIVE ENCYCLOPEDIA TERM", "Archive this glossary term?", "Archive");
    if (!confirmed) return;
    const result = window.WS_APP.requestAdminRecordLifecycleAction?.({ recordType: "ENCYCLOPEDIA_ENTRY", recordId: entry.id, action: "ARCHIVE", actor: user, expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(entry) || 0, label: entry.title || entry.term || entry.id });
    if (!result?.ok) return window.alert?.(`Archive failed: ${result?.resultCode || "UNKNOWN"}`);
    renderEncyclopediaModule(user);
  });
  document.querySelector("#entry-restore-button")?.addEventListener("click", () => {
    const result = window.WS_APP.requestAdminRecordLifecycleAction?.({ recordType: "ENCYCLOPEDIA_ENTRY", recordId: entry.id, action: "RESTORE", actor: user, expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(entry) || 0, label: entry.title || entry.term || entry.id });
    if (!result?.ok) return window.alert?.(`Restore failed: ${result?.resultCode || "UNKNOWN"}`);
    renderEntryRecord(user, entry.id);
  });
}

function renderEntryAliases(entry) {
  const aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
  if (!aliases.length) return "";
  return `<div class="knowledge-alias-box"><b>ALIASES</b>${aliases.map((alias) => `<span>${escapeHtml(alias)}</span>`).join("")}</div>`;
}

function renderEntryRelated(entry, user) {
  const related = getEntryRelated(entry);
  if (!related.length) return "";
  const links = related.map((item) => renderEntryRelatedLink(item, user)).join("");
  return `
    <div class="knowledge-related-box" data-related-scope="encyclopedia">
      <b>RELATED TERMS</b>
      <span class="knowledge-related-list">${links}</span>
    </div>
  `;
}

function renderEntryRelatedLink(reference, user) {
  const entry = window.WS_APP.resolveEntryRef?.(reference, { includeArchived: user?.role === "admin" });
  if (!entry) return `<span class="knowledge-related-missing"><span class="knowledge-related-link__label">${escapeHtml(reference)}</span></span>`;
  return `
    <button class="knowledge-related-link" type="button" data-related-entry-id="${escapeHtml(entry.id)}" title="Open ${escapeHtml(entry.term || entry.title || entry.id)}">
      <span class="knowledge-related-link__label">${escapeHtml(entry.term || entry.title || reference)}</span>
    </button>
  `;
}

function bindEntryRelatedNavigation(user, currentEntry) {
  document.querySelectorAll("[data-related-entry-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.relatedEntryId;
      const target = window.WS_APP.getEntryById?.(targetId);
      if (!target) return;
      window.WS_APP.pushModuleView?.(() => renderEntryRecord(user, currentEntry.id));
      renderEntryRecord(user, target.id);
    });
  });
}

function renderEntryForm(user, entryId = null) {
  if (user?.role !== "admin") return;
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");
  const entry = entryId ? window.WS_APP.getEntryById?.(entryId) : null;
  const isEdit = Boolean(entry);

  if (!container) return;
  terminalGrid?.classList.add("is-card-open");
  if (status) status.textContent = isEdit ? "ENCYCLOPEDIA / EDIT TERM" : "ENCYCLOPEDIA / CREATE TERM";

  container.innerHTML = `
    <article class="module-detail encyclopedia-view entry-form-view knowledge-form-view">
      <div class="module-detail-head knowledge-browser-head">
        <div>
          <p class="kicker">ENCYCLOPEDIA / ${isEdit ? "MUTATE TERM" : "CREATE TERM"}</p>
          <h4>${isEdit ? "Edit Term" : "Create Term"}</h4>
        </div>
        <div class="knowledge-browser-head-actions">
          ${window.WS_APP.renderKnowledgePackIndicator?.({ compact: true }) || ""}
          <button class="module-back-button" type="button">Back</button>
        </div>
      </div>

      <form class="entry-form" id="entry-form" autocomplete="off">
        <div class="entry-form-message" id="entry-form-message"></div>
        <div class="entry-form-grid">
          ${renderEntryInput("term", "Term", entry?.term || entry?.title || "")}
          ${renderEntryInput("localTerm", "Local term / PL", entry?.localTerm || "")}
          ${renderEntryInput("category", "Category", entry?.category || "UNCLASSIFIED")}
          ${renderEntryInput("aliases", "Aliases, comma separated", (entry?.aliases || []).join(", "))}
          ${window.WS_APP.renderContentTagSelect?.("tags", entry?.tags || [], { label: "Content tags", extraClass: "is-wide" }) || renderEntryInput("tags", "Content tags", (entry?.tags || []).join(", "), "is-wide")}
          ${renderEntryInput("shortDefinition", "Short definition", entry?.shortDefinition || entry?.summary || "", "is-wide")}
          ${renderEntryTextarea("body", "Definition body", entry?.body || entry?.publicText || "", "is-wide", 7)}
          ${renderEntryTextarea("relatedTerms", "Related terms, comma separated", (window.WS_APP.formatKnowledgeRelationRefsForEditor?.(entry?.relatedTerms || entry?.related || [], "encyclopedia") || entry?.relatedTerms || entry?.related || []).join(", "), "is-wide", 3)}
        </div>
        <footer class="entry-form-actions">
          <button class="entry-form-cancel" type="button" id="entry-form-cancel">Cancel</button>
          <button class="entry-form-save" type="submit">Save Term</button>
        </footer>
      </form>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => renderEncyclopediaModule(user));
  document.querySelector("#entry-form-cancel")?.addEventListener("click", () => isEdit ? renderEntryRecord(user, entry.id) : renderEncyclopediaModule(user));
  document.querySelector("#entry-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = collectEntryForm(form);
    if (!payload.term) {
      const message = document.querySelector("#entry-form-message");
      if (message) message.textContent = "SAVE FAILED / TERM REQUIRED";
      return;
    }
    const saved = isEdit ? window.WS_APP.updateEntry?.(entry.id, payload) : window.WS_APP.createEntry?.(payload);
    if (saved) {
      window.WS_APP.appendTerminalLogLine?.(`TERM SAVED / ${saved.title}`, { typed: true, speed: 8 });
      renderEntryRecord(user, saved.id);
    }
  });
}

function collectEntryForm(form) {
  const data = new FormData(form);
  return {
    type: "TERM",
    term: String(data.get("term") || "").trim(),
    localTerm: String(data.get("localTerm") || "").trim(),
    category: String(data.get("category") || "UNCLASSIFIED").trim().toUpperCase(),
    aliases: parseRegistryList(data.get("aliases")),
    tags: window.WS_APP.collectContentTagValues?.(form, "tags") || parseRegistryList(data.get("tags")),
    shortDefinition: String(data.get("shortDefinition") || "").trim(),
    body: String(data.get("body") || "").trim(),
    relatedTerms: typeof window.WS_APP.normalizeKnowledgeRelationRefs === "function"
      ? window.WS_APP.normalizeKnowledgeRelationRefs(parseRegistryList(data.get("relatedTerms")), "encyclopedia")
      : parseRegistryList(data.get("relatedTerms"))
  };
}

window.WS_APP.renderEncyclopediaModule = renderEncyclopediaModule;
