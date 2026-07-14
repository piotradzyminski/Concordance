function renderDatabaseNodeBackButton(user) {
  window.WS_APP.bindModuleBackButton(user, () => {
    if (typeof window.WS_APP.renderDatabaseHubModule === "function") {
      window.WS_APP.renderDatabaseHubModule(user);
      return;
    }
    window.WS_APP.renderModules(user);
  });
}

function renderDatabaseContextLine(items) {
  return window.WS_APP.renderDatabaseContextLine?.(items) || "";
}

function renderDatabaseEmptyState(title, body) {
  return window.WS_APP.renderDatabaseEmptyState?.(title, body) || `<p class="file-empty">${escapeHtml(body || title || "No records")}</p>`;
}

function bindDatabaseContextActions(user) {
  window.WS_APP.bindDatabaseContextActions?.(user);
}

function getCitizenFilesUiState() {
  window.WS_APP.citizenFilesUiState = window.WS_APP.citizenFilesUiState || {
    query: "",
    status: "",
    type: "",
    includeArchived: false,
    feedback: null
  };
  return window.WS_APP.citizenFilesUiState;
}

function canManageCitizenFiles(user = window.WS_APP.currentUser) {
  return window.WS_APP.canManageCitizenFiles?.(user) === true;
}

function getVisibleCitizenProfiles(user = window.WS_APP.currentUser) {
  return window.WS_APP.getCitizens()
    .filter((citizen) => citizen.recordType !== "admin")
    .filter((citizen) => user?.role === "admin" || citizen.playerVisible === true || citizen.id === user?.citizenId)
    .filter((citizen) => window.WS_APP.canAccessRecord ? window.WS_APP.canAccessRecord(user, citizen) : true);
}

function getVisibleCitizenFiles(user = window.WS_APP.currentUser, options = {}) {
  if (typeof window.WS_APP.getCitizenFiles !== "function") return [];
  return window.WS_APP.getCitizenFiles({
    user,
    includeArchived: options.includeArchived === true,
    citizenId: options.citizenId || "",
    query: options.query || "",
    status: options.status || "",
    type: options.type || ""
  });
}

function renderCitizenFilesModule(user) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");
  const categories = getCitizenFileCategories(user);
  const files = getVisibleCitizenFiles(user, { includeArchived: canManageCitizenFiles(user) });

  if (!container) return;

  terminalGrid?.classList.add("is-card-open");
  window.WS_APP.currentModuleId = "citizen-files";

  if (status) status.textContent = `CITIZEN FILES / ${files.length} RECORD${files.length === 1 ? "" : "S"}`;

  container.innerHTML = `
    <article class="module-detail citizen-files-view">
      <div class="module-detail-head">
        <div>
          <p class="kicker">CITIZEN FILES / RECORD GROUPS</p>
          <h4>Citizen Files</h4>
        </div>
        <div class="citizen-file-head-actions">
          ${canManageCitizenFiles(user) ? '<button class="module-action-button" type="button" data-citizen-file-create>New File</button>' : ""}
          <button class="module-back-button" type="button">Back</button>
        </div>
      </div>

      ${renderDatabaseContextLine([
        { label: "DATABASE", target: "database" },
        { label: "CITIZEN FILES" }
      ])}

      ${renderCitizenFileFeedback()}

      <div class="database-hub-intro citizen-files-intro">
        <b>DOCUMENT REGISTRY</b>
        <span>Independent Citizen File records linked by stable fileId to one Citizen and optional Case Files.</span>
      </div>

      <div class="file-category-grid">
        ${categories.map((category) => renderCitizenFileCategoryCard(category)).join("")}
      </div>
    </article>
  `;

  renderDatabaseNodeBackButton(user);
  bindDatabaseContextActions(user);
  bindCitizenFileCategoryCards(user);
  container.querySelector("[data-citizen-file-create]")?.addEventListener("click", () => {
    renderCitizenFileEditor(user, null, () => renderCitizenFilesModule(user));
  });
}

function getCitizenFileCategories(user = window.WS_APP.currentUser) {
  const citizens = getVisibleCitizenProfiles(user);
  const files = getVisibleCitizenFiles(user, { includeArchived: canManageCitizenFiles(user) });
  const groups = [
    { id: "alpha", title: "ALPHA", profiles: ["ALPHA"] },
    { id: "beta", title: "BETA", profiles: ["BETA"] },
    { id: "gamma", title: "GAMMA", profiles: ["GAMMA"] },
    { id: "unclassified", title: "UNCLASSIFIED", profiles: ["UNCLASSIFIED", "SUBHUMAN", "OUTSIDE", "NONE", "UNKNOWN", ""] }
  ];

  return groups.map((group) => {
    const entries = citizens.filter((citizen) => {
      const profile = String(citizen.biologicalProfile || citizen.profile || "").toUpperCase();
      return group.profiles.includes(profile) || (group.id === "unclassified" && !profile);
    });
    const citizenIds = new Set(entries.map((citizen) => citizen.id));
    return {
      ...group,
      entries: sortCitizensByName(entries),
      files: files.filter((file) => citizenIds.has(file.citizenId)),
      fileCount: files.filter((file) => citizenIds.has(file.citizenId)).length
    };
  });
}

function sortCitizensByName(citizens) {
  return [...citizens].sort((a, b) => String(a.legalName || "").localeCompare(String(b.legalName || ""), "pl"));
}

function renderCitizenFileCategoryCard(category) {
  return `
    <button class="file-category-card" type="button" data-category-id="${escapeHtml(category.id)}">
      <span>
        <b>${escapeHtml(category.title)}</b>
        <small>${escapeHtml(category.entries.length)} dossiers / ${escapeHtml(category.fileCount)} records</small>
      </span>
      <strong>Open</strong>
    </button>
  `;
}

function bindCitizenFileCategoryCards(user) {
  document.querySelectorAll(".file-category-card").forEach((card) => {
    card.addEventListener("click", () => renderCitizenFileCategory(user, card.dataset.categoryId));
  });
}

function renderCitizenFileCategory(user, categoryId) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const category = getCitizenFileCategories(user).find((item) => item.id === categoryId);
  const state = getCitizenFilesUiState();
  if (!container || !category) return;

  const citizenIds = new Set(category.entries.map((citizen) => citizen.id));
  const files = getVisibleCitizenFiles(user, {
    includeArchived: canManageCitizenFiles(user) && state.includeArchived,
    query: state.query,
    status: state.status,
    type: state.type
  }).filter((file) => citizenIds.has(file.citizenId));

  if (status) status.textContent = `CITIZEN FILES / ${category.title} / ${files.length} RECORD${files.length === 1 ? "" : "S"}`;

  container.innerHTML = `
    <article class="module-detail citizen-files-record">
      <div class="module-detail-head">
        <div>
          <p class="kicker">CITIZEN FILES / ${escapeHtml(category.title)}</p>
          <h4>${escapeHtml(category.title)} Records</h4>
        </div>
        <div class="citizen-file-head-actions">
          ${canManageCitizenFiles(user) ? '<button class="module-action-button" type="button" data-citizen-file-create>New File</button>' : ""}
          <button class="module-back-button" type="button">Back</button>
        </div>
      </div>

      ${renderDatabaseContextLine([
        { label: "DATABASE", target: "database" },
        { label: "CITIZEN FILES", target: "citizen-files" },
        { label: category.title }
      ])}

      ${renderCitizenFileFeedback()}
      ${renderCitizenFileToolbar(state, user)}

      <section class="citizen-file-record-list">
        ${files.length
          ? files.map((file) => renderCitizenFileListRow(file, user)).join("")
          : renderDatabaseEmptyState("NO CITIZEN FILE RECORDS", `No matching ${category.title} records are visible.`)}
      </section>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => renderCitizenFilesModule(user));
  bindDatabaseContextActions(user);
  bindCitizenFileToolbar(user, () => renderCitizenFileCategory(user, category.id));
  bindCitizenFileListRows(user, () => renderCitizenFileCategory(user, category.id));
  container.querySelector("[data-citizen-file-create]")?.addEventListener("click", () => {
    renderCitizenFileEditor(user, null, () => renderCitizenFileCategory(user, category.id));
  });
}

function renderCitizenFileToolbar(state, user) {
  const typeOptions = ["GENERAL", "MEDICAL", "SECURITY", "EMPLOYMENT", "FINANCIAL", "SERVICE", "LEGAL", "INCIDENT", "EDUCATION", "CYBERWARE"];
  const statusOptions = ["DRAFT", "ACTIVE", "PENDING", "CLOSED", "SEALED", "ARCHIVED"];
  return `
    <div class="citizen-file-toolbar">
      <label>
        <span>Search</span>
        <input type="search" value="${escapeHtml(state.query)}" placeholder="Title, summary, tag" data-citizen-file-filter="query">
      </label>
      <label>
        <span>Type</span>
        <select data-citizen-file-filter="type">
          <option value="">All types</option>
          ${typeOptions.map((type) => `<option value="${type}" ${state.type === type ? "selected" : ""}>${type}</option>`).join("")}
        </select>
      </label>
      <label>
        <span>Status</span>
        <select data-citizen-file-filter="status">
          <option value="">All statuses</option>
          ${statusOptions.map((status) => `<option value="${status}" ${state.status === status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </label>
      ${canManageCitizenFiles(user) ? `
        <label class="citizen-file-archive-filter">
          <input type="checkbox" data-citizen-file-filter="includeArchived" ${state.includeArchived ? "checked" : ""}>
          <span>Include archived</span>
        </label>
      ` : ""}
      <button class="module-action-button is-muted" type="button" data-citizen-file-filter-reset>Reset</button>
    </div>
  `;
}

function bindCitizenFileToolbar(user, rerender) {
  document.querySelectorAll("[data-citizen-file-filter]").forEach((control) => {
    const apply = () => {
      const state = getCitizenFilesUiState();
      const key = control.dataset.citizenFileFilter;
      state[key] = control.type === "checkbox" ? control.checked : control.value;
      rerender();
    };

    if (control.type === "search") {
      control.addEventListener("input", () => {
        const state = getCitizenFilesUiState();
        state.query = control.value;
        window.clearTimeout(window.WS_APP.citizenFilesFilterTimer);
        window.WS_APP.citizenFilesFilterTimer = window.setTimeout(() => {
          rerender();
          const nextSearch = document.querySelector('[data-citizen-file-filter="query"]');
          if (nextSearch instanceof HTMLInputElement) {
            nextSearch.focus();
            const caret = nextSearch.value.length;
            nextSearch.setSelectionRange(caret, caret);
          }
        }, 120);
      });
      return;
    }

    control.addEventListener("change", apply);
  });
  document.querySelector("[data-citizen-file-filter-reset]")?.addEventListener("click", () => {
    window.WS_APP.citizenFilesUiState = { query: "", status: "", type: "", includeArchived: false, feedback: null };
    rerender();
  });
}

function renderCitizenFileListRow(file, user) {
  const citizen = window.WS_APP.getCitizenById?.(file.citizenId);
  const citizenLabel = citizen ? getCitizenShortRecordLabel(citizen) : file.citizenId;
  return `
    <button class="citizen-file-record-row ${file.archived ? "is-archived" : ""}" type="button" data-citizen-file-id="${escapeHtml(file.fileId)}">
      <span class="citizen-file-record-row__main">
        <b>${escapeHtml(file.title)}</b>
        <small>${escapeHtml(citizenLabel)}</small>
      </span>
      <span class="citizen-file-record-row__meta">
        <i>${escapeHtml(file.type)}</i>
        <time>${escapeHtml(file.date || "NO DATE")}</time>
      </span>
      <strong>${escapeHtml(file.status)}</strong>
    </button>
  `;
}

function bindCitizenFileListRows(user, returnView) {
  document.querySelectorAll("[data-citizen-file-id]").forEach((button) => {
    button.addEventListener("click", () => renderCitizenFileDocument(user, button.dataset.citizenFileId, returnView));
  });
}

function renderDatabaseRelationLink(label, type, id, meta = "") {
  return `
    <button class="database-relation-link" type="button" data-database-relation-type="${escapeHtml(type)}" data-database-relation-id="${escapeHtml(id)}">
      <span>${escapeHtml(label)}</span>
      ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
    </button>
  `;
}

function bindDatabaseRelationLinks(user, returnView) {
  document.querySelectorAll("[data-database-relation-type][data-database-relation-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.databaseRelationType;
      const id = button.dataset.databaseRelationId;
      const safeReturn = typeof returnView === "function" ? returnView : () => renderCitizenFilesModule(user);
      window.WS_APP.pushModuleView?.(safeReturn);
      if (type === "case-file") {
        window.WS_APP.openCaseFileRecord?.(user, id, { returnView: safeReturn });
        return;
      }
      if (type === "citizen-file") {
        renderCitizenFileDocument(user, id, safeReturn);
        return;
      }
      if (type === "citizen") {
        window.WS_APP.citizenFilesReturnView = safeReturn;
        renderCitizenFileRecord(user, id, "citizen-files");
      }
    });
  });
}

function renderCitizenFileDocument(user, fileId, returnView) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const file = window.WS_APP.getCitizenFileById?.(fileId, { user });
  if (!container || !file) return;
  const relations = window.WS_APP.getCitizenFileRelations?.(file.fileId, {
    user,
    includeArchived: canManageCitizenFiles(user)
  }) || {};
  const citizen = relations.citizen || window.WS_APP.getCitizenById?.(file.citizenId);
  const cases = relations.caseFiles || [];

  if (status) status.textContent = `CITIZEN FILES / ${file.fileId.toUpperCase()}`;

  container.innerHTML = `
    <article class="module-detail citizen-file-document ${file.archived ? "is-archived" : ""}">
      <div class="module-detail-head">
        <div>
          <p class="kicker">CITIZEN FILES / DOCUMENT</p>
          <h4>${escapeHtml(file.title)}</h4>
        </div>
        <div class="citizen-file-head-actions">
          ${canManageCitizenFiles(user) ? '<button class="module-action-button" type="button" data-citizen-file-edit>Edit</button><button class="module-action-button" type="button" data-citizen-file-dependency-preview>Preview Dependencies</button>' : ""}
          ${canManageCitizenFiles(user) && !file.archived ? '<button class="module-action-button is-alert" type="button" data-citizen-file-archive>Archive</button>' : ""}
          ${canManageCitizenFiles(user) && file.archived ? '<button class="module-action-button" type="button" data-citizen-file-restore>Restore</button><button class="module-action-button is-alert" type="button" data-citizen-file-hard-delete>Hard Delete</button>' : ""}
          <button class="module-back-button" type="button">Back</button>
        </div>
      </div>

      ${renderDatabaseContextLine([
        { label: "DATABASE", target: "database" },
        { label: "CITIZEN FILES", target: "citizen-files" },
        { label: "DOCUMENT" }
      ])}

      ${renderCitizenFileFeedback()}

      <section class="citizen-file-document__identity">
        <div>
          <span>Citizen</span>
          <button type="button" data-citizen-file-citizen="${escapeHtml(file.citizenId)}">${escapeHtml(citizen ? getCitizenShortRecordLabel(citizen) : file.citizenId)}</button>
        </div>
        <div><span>Type</span><b>${escapeHtml(file.type)}</b></div>
        <div><span>Status</span><b>${escapeHtml(file.status)}</b></div>
        <div><span>Date</span><b>${escapeHtml(file.date || "NO DATE")}</b></div>
        <div><span>Revision</span><b>${escapeHtml(file.revision)}</b></div>
      </section>

      <section class="citizen-file-document__content">
        <p class="citizen-file-document__summary">${escapeHtml(file.summary || "No summary recorded.")}</p>
        <div class="citizen-file-document__body">${escapeHtml(file.body || "No document body recorded.").replace(/\n/g, "<br>")}</div>
      </section>

      <section class="citizen-file-document__relations">
        <div>
          <h5>Access</h5>
          <p>${(file.accessTags || []).map((tag) => `<span class="profile-tag">${escapeHtml(tag)}</span>`).join("") || '<span class="file-empty">No tags</span>'}</p>
        </div>
        <div>
          <h5>Record Tags</h5>
          <p>${(file.tags || []).map((tag) => `<span class="profile-tag">${escapeHtml(tag)}</span>`).join("") || '<span class="file-empty">No tags</span>'}</p>
        </div>
        <div>
          <h5>Related Case Files</h5>
          <div class="database-relation-list">
            ${cases.length
              ? cases.map((record) => renderDatabaseRelationLink(record.title || record.id, "case-file", record.id, record.caseNumber || record.id)).join("")
              : '<span class="file-empty">No case relations</span>'}
            ${(relations.missingCaseFileIds || []).map((caseId) => `<span class="database-relation-missing">Missing: ${escapeHtml(caseId)}</span>`).join("")}
          </div>
        </div>
      </section>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, typeof returnView === "function" ? returnView : () => renderCitizenFilesModule(user));
  bindDatabaseContextActions(user);
  container.querySelector("[data-citizen-file-edit]")?.addEventListener("click", () => renderCitizenFileEditor(user, file.fileId, () => renderCitizenFileDocument(user, file.fileId, returnView)));
  container.querySelector("[data-citizen-file-dependency-preview]")?.addEventListener("click", () => {
    const preview = window.WS_APP.previewAdminRecordLifecycle?.({ recordType: "CITIZEN_FILE", recordId: file.fileId, action: file.archived ? "HARD_DELETE" : "ARCHIVE", actor: user });
    window.alert?.(window.WS_APP.summarizeAdminRecordLifecyclePreview?.(preview) || preview?.message || "Preview unavailable.");
  });
  container.querySelector("[data-citizen-file-archive]")?.addEventListener("click", () => {
    const result = window.WS_APP.requestAdminRecordLifecycleAction?.({ recordType: "CITIZEN_FILE", recordId: file.fileId, action: "ARCHIVE", actor: user, expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(file) || 0, label: file.title || file.fileId });
    setCitizenFileFeedback(result?.ok ? "File archived." : `Archive failed: ${result?.resultCode || formatCitizenFileMutationError()}`, result?.ok ? "ok" : "error");
    if (result?.ok) (typeof returnView === "function" ? returnView : () => renderCitizenFilesModule(user))();
  });
  container.querySelector("[data-citizen-file-restore]")?.addEventListener("click", () => {
    const result = window.WS_APP.requestAdminRecordLifecycleAction?.({ recordType: "CITIZEN_FILE", recordId: file.fileId, action: "RESTORE", actor: user, expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(file) || 0, label: file.title || file.fileId });
    setCitizenFileFeedback(result?.ok ? "File restored." : `Restore failed: ${result?.resultCode || formatCitizenFileMutationError()}`, result?.ok ? "ok" : "error");
    if (result?.ok) renderCitizenFileDocument(user, file.fileId, returnView);
  });
  container.querySelector("[data-citizen-file-hard-delete]")?.addEventListener("click", () => {
    const result = window.WS_APP.requestAdminRecordLifecycleAction?.({ recordType: "CITIZEN_FILE", recordId: file.fileId, action: "HARD_DELETE", actor: user, expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(file) || 0, label: file.title || file.fileId });
    setCitizenFileFeedback(result?.ok ? "File hard deleted." : `Hard delete failed: ${result?.resultCode || formatCitizenFileMutationError()}`, result?.ok ? "ok" : "error");
    if (result?.ok) (typeof returnView === "function" ? returnView : () => renderCitizenFilesModule(user))();
  });
  const documentReturnView = () => renderCitizenFileDocument(user, file.fileId, returnView);
  container.querySelector("[data-citizen-file-citizen]")?.addEventListener("click", () => {
    window.WS_APP.citizenFilesReturnView = documentReturnView;
    renderCitizenFileRecord(user, file.citizenId, "citizen-files");
  });
  bindDatabaseRelationLinks(user, documentReturnView);
}

function renderCitizenFileEditor(user, fileId = null, returnView) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const existing = fileId ? window.WS_APP.getCitizenFileById?.(fileId, { user }) : null;
  if (!container || !canManageCitizenFiles(user)) return;
  const draft = existing || {
    citizenId: "",
    title: "",
    type: "GENERAL",
    status: "ACTIVE",
    date: new Date().toISOString().slice(0, 10),
    accessTags: ["RESTRICTED"],
    tags: [],
    relatedCaseFileIds: [],
    summary: "",
    body: ""
  };
  const citizens = sortCitizensByName(window.WS_APP.getCitizens({ includeArchived: true }).filter((citizen) => citizen.recordType !== "admin"));
  const cases = window.WS_APP.getCaseFiles?.({ includeArchived: true }) || [];

  if (status) status.textContent = `CITIZEN FILES / ${existing ? "EDIT" : "CREATE"}`;
  container.innerHTML = `
    <article class="module-detail citizen-file-editor">
      <div class="module-detail-head">
        <div>
          <p class="kicker">CITIZEN FILES / ${existing ? "EDIT DOCUMENT" : "NEW DOCUMENT"}</p>
          <h4>${existing ? escapeHtml(existing.title) : "Create Citizen File"}</h4>
        </div>
        <button class="module-back-button" type="button">Cancel</button>
      </div>

      ${renderDatabaseContextLine([
        { label: "DATABASE", target: "database" },
        { label: "CITIZEN FILES", target: "citizen-files" },
        { label: existing ? "EDIT" : "CREATE" }
      ])}

      <form class="citizen-file-form" data-citizen-file-form>
        <label>
          <span>Citizen</span>
          <select name="citizenId" required>
            <option value="">Select Citizen</option>
            ${citizens.map((citizen) => `<option value="${escapeHtml(citizen.id)}" ${draft.citizenId === citizen.id ? "selected" : ""}>${escapeHtml(getCitizenShortRecordLabel(citizen))}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Type</span>
          <select name="type">
            ${["GENERAL", "MEDICAL", "SECURITY", "EMPLOYMENT", "FINANCIAL", "SERVICE", "LEGAL", "INCIDENT", "EDUCATION", "CYBERWARE"].map((type) => `<option value="${type}" ${draft.type === type ? "selected" : ""}>${type}</option>`).join("")}
          </select>
        </label>
        <label class="span-2">
          <span>Title</span>
          <input name="title" value="${escapeHtml(draft.title)}" required maxlength="160">
        </label>
        <label>
          <span>Status</span>
          <select name="status">
            ${["DRAFT", "ACTIVE", "PENDING", "CLOSED", "SEALED"].map((value) => `<option value="${value}" ${draft.status === value ? "selected" : ""}>${value}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Record date</span>
          <input type="date" name="date" value="${escapeHtml(draft.date || "")}">
        </label>
        ${window.WS_APP.renderAccessTagSelect?.("accessTags", draft.accessTags || ["RESTRICTED"], { label: "Access required", extraClass: "span-2" }) || `
          <label class="span-2"><span>Access tags</span><input name="accessTagsFallback" value="${escapeHtml((draft.accessTags || []).join(", "))}"></label>
        `}
        <label class="span-2">
          <span>Tags</span>
          <input name="tags" value="${escapeHtml((draft.tags || []).join(", "))}" placeholder="MEDICAL, REVIEWED">
        </label>
        <label class="span-2">
          <span>Summary</span>
          <textarea name="summary" rows="3">${escapeHtml(draft.summary || "")}</textarea>
        </label>
        <label class="span-2">
          <span>Document body</span>
          <textarea name="body" rows="10">${escapeHtml(draft.body || "")}</textarea>
        </label>
        <fieldset class="citizen-file-case-picker span-2">
          <legend>Related Case Files</legend>
          ${cases.length ? cases.map((record) => `
            <label>
              <input type="checkbox" name="relatedCaseFileIds" value="${escapeHtml(record.id)}" ${(draft.relatedCaseFileIds || []).includes(record.id) ? "checked" : ""}>
              <span>${escapeHtml(record.caseNumber || record.id)} — ${escapeHtml(record.title)}</span>
            </label>
          `).join("") : '<p class="file-empty">No Case Files available.</p>'}
        </fieldset>
        <div class="citizen-file-form-actions span-2">
          <button class="module-action-button is-muted" type="button" data-citizen-file-cancel>Cancel</button>
          <button class="module-action-button" type="submit">Save File</button>
        </div>
      </form>
    </article>
  `;

  const safeReturn = typeof returnView === "function" ? returnView : () => renderCitizenFilesModule(user);
  window.WS_APP.bindModuleBackButton(user, safeReturn);
  bindDatabaseContextActions(user);
  container.querySelector("[data-citizen-file-cancel]")?.addEventListener("click", safeReturn);
  container.querySelector("[data-citizen-file-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const accessTags = window.WS_APP.collectMultiSelectValues?.(form, "accessTags", ["RESTRICTED"])
      || String(data.get("accessTagsFallback") || "RESTRICTED").split(/[,\n]/g).map((value) => value.trim()).filter(Boolean);
    const payload = {
      citizenId: String(data.get("citizenId") || ""),
      type: String(data.get("type") || "GENERAL"),
      title: String(data.get("title") || ""),
      status: String(data.get("status") || "ACTIVE"),
      date: String(data.get("date") || ""),
      accessTags,
      tags: String(data.get("tags") || "").split(/[,\n]/g).map((value) => value.trim()).filter(Boolean),
      relatedCaseFileIds: data.getAll("relatedCaseFileIds").map(String),
      summary: String(data.get("summary") || ""),
      body: String(data.get("body") || "")
    };
    const saved = existing
      ? window.WS_APP.updateCitizenFile?.(existing.fileId, payload, { actor: user, expectedRevision: existing.revision })
      : window.WS_APP.createCitizenFile?.(payload, { actor: user });
    if (!saved) {
      setCitizenFileFeedback(formatCitizenFileMutationError(), "error");
      renderCitizenFileEditor(user, existing?.fileId || null, safeReturn);
      return;
    }
    setCitizenFileFeedback(existing ? "Citizen File updated." : "Citizen File created.", "ok");
    renderCitizenFileDocument(user, saved.fileId, safeReturn);
  });
}

function setCitizenFileFeedback(message, tone = "info") {
  const state = getCitizenFilesUiState();
  state.feedback = message ? { message: String(message), tone: String(tone || "info") } : null;
}

function renderCitizenFileFeedback() {
  const feedback = getCitizenFilesUiState().feedback;
  if (!feedback) return "";
  return `<div class="citizen-file-feedback is-${escapeHtml(feedback.tone)}">${escapeHtml(feedback.message)}</div>`;
}

function formatCitizenFileMutationError() {
  const error = window.WS_APP.lastCitizenFileMutationError;
  if (!error) return "Citizen File operation failed.";
  if (error.code === "CITIZEN_FILE_REVISION_CONFLICT") return "The record changed before save. Reopen it and retry.";
  if (error.code === "CITIZEN_FILE_ADMIN_REQUIRED") return "Admin access is required for this operation.";
  if (error.code === "CITIZEN_FILE_VALIDATION_FAILED") return (error.errors || []).map((item) => item.code).join(" / ") || error.code;
  return error.code || "Citizen File operation failed.";
}

function getCitizenShortRecordLabel(citizen) {
  const shortId = getCitizenShortId(citizen);
  return shortId ? `${shortId} - ${citizen.legalName}` : citizen.legalName;
}

function renderCitizenDatabaseModule(user) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");
  const categories = getCitizenDatabaseCategories(user);
  const entryCount = categories.reduce((sum, category) => sum + category.entries.length, 0);

  if (!container) return;

  terminalGrid?.classList.add("is-card-open");
  window.WS_APP.currentModuleId = "citizen-database";

  if (status) {
    status.textContent = `CITIZEN DATABASE / ${entryCount} ENTRIES`;
  }

  container.innerHTML = `
    <article class="module-detail citizen-files-view citizen-database-view">
      <div class="module-detail-head">
        <div>
          <p class="kicker">CITIZEN DATABASE / PROFILE GROUPS</p>
          <h4>Character Index</h4>
        </div>

        <button class="module-back-button" type="button">Back</button>
      </div>

      ${renderDatabaseContextLine([
        { label: "DATABASE", target: "database" },
        { label: "CITIZEN DATABASE" }
      ])}

      <div class="file-category-grid citizen-database-category-grid">
        ${categories.map((category) => renderCitizenDatabaseCategoryCard(category)).join("")}
      </div>
    </article>
  `;

  renderDatabaseNodeBackButton(user);
  bindDatabaseContextActions(user);
  bindCitizenDatabaseCategoryCards(user);
}

function getCitizenDatabaseCategories(user = window.WS_APP.currentUser) {
  const entries = getCitizenFileEntries(user);
  const groups = [
    { id: "alpha", title: "ALPHA", profiles: ["ALPHA"] },
    { id: "beta", title: "BETA", profiles: ["BETA"] },
    { id: "gamma", title: "GAMMA", profiles: ["GAMMA"] },
    { id: "unclassified", title: "UNCLASSIFIED", profiles: ["UNCLASSIFIED", "SUBHUMAN", "OUTSIDE", "NONE", "UNKNOWN", ""] }
  ];

  return groups.map((group) => {
    const groupEntries = entries.filter((entry) => {
      const profile = String(entry.profileTag || "").toUpperCase();
      return group.profiles.includes(profile) || (group.id === "unclassified" && !profile);
    });

    return {
      ...group,
      entries: groupEntries,
      fileCount: groupEntries.reduce((count, entry) => count + (entry.filesCount || 0), 0)
    };
  });
}

function renderCitizenDatabaseCategoryCard(category) {
  return `
    <button class="file-category-card citizen-database-category-card" type="button" data-database-category-id="${escapeHtml(category.id)}">
      <span>
        <b>${escapeHtml(category.title)}</b>
        <small>${escapeHtml(category.entries.length)} profiles / ${escapeHtml(category.fileCount)} files</small>
      </span>
      <strong>Open</strong>
    </button>
  `;
}

function bindCitizenDatabaseCategoryCards(user) {
  document.querySelectorAll("[data-database-category-id]").forEach((card) => {
    card.addEventListener("click", () => {
      window.WS_APP.pushModuleView?.(() => renderCitizenDatabaseModule(user));
      renderCitizenDatabaseCategory(user, card.dataset.databaseCategoryId);
    });
  });
}

function renderCitizenDatabaseCategory(user, categoryId) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const category = getCitizenDatabaseCategories(user).find((item) => item.id === categoryId);

  if (!container || !category) return;

  window.WS_APP.currentModuleId = "citizen-database";

  if (status) {
    status.textContent = `CITIZEN DATABASE / ${category.title} / ${category.entries.length} ENTRIES`;
  }

  container.innerHTML = `
    <article class="module-detail citizen-files-view citizen-database-view">
      <div class="module-detail-head">
        <div>
          <p class="kicker">CITIZEN DATABASE / ${escapeHtml(category.title)}</p>
          <h4>${escapeHtml(category.title)} Profiles</h4>
        </div>

        <button class="module-back-button" type="button">Back</button>
      </div>

      ${renderDatabaseContextLine([
        { label: "DATABASE", target: "database" },
        { label: "CITIZEN DATABASE", target: "citizen-database" },
        { label: category.title }
      ])}

      <div class="citizen-file-index">
        ${category.entries.length
          ? renderAlphabetGroups(category.entries)
          : renderDatabaseEmptyState("NO PROFILES IN GROUP", `No citizen profiles are visible for ${category.title}.`)}
      </div>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => renderCitizenDatabaseModule(user));
  bindDatabaseContextActions(user);
  bindCitizenDatabaseCards(user, () => renderCitizenDatabaseCategory(user, category.id));
}

function bindCitizenDatabaseCards(user, fallback) {
  document.querySelectorAll(".file-person-card").forEach((card) => {
    card.addEventListener("click", () => {
      window.WS_APP.pushModuleView?.(fallback || (() => renderCitizenDatabaseModule(user)));
      renderCitizenFileRecord(user, card.dataset.fileId);
    });
  });
}

function getCitizenFileEntries(user = window.WS_APP.currentUser) {
  return window.WS_APP.getCitizens()
    .filter((citizen) => citizen.recordType !== "admin")
    .filter((citizen) => user?.role === "admin" || citizen.playerVisible === true || citizen.id === user?.citizenId)
    .filter((citizen) => window.WS_APP.canAccessRecord ? window.WS_APP.canAccessRecord(user, citizen) : true)
    .map((citizen) => ({
      id: citizen.id,
      legalName: getCitizenNameLabel(citizen, { user }),
      legalNameReal: getCitizenNameLabel(citizen, { user, legal: true }),
      shortId: getCitizenShortId(citizen),
      age: window.WS_APP.getCitizenAge?.(citizen),
      recordId: citizen.idNumber,
      profileTag: citizen.biologicalProfile || citizen.profile,
      portrait: citizen.portrait,
      tags: citizen.tags || [],
      accessTags: citizen.accessTags || ["PUBLIC"],
      publicSummary: citizen.publicSummary || citizen.appearance || citizen.status || "No public dossier note recorded.",
      publicFields: {
        status: citizen.status,
        origin: citizen.origin,
        clearance: citizen.clearance,
        profile: citizen.biologicalProfile || citizen.profile
      },
      files: getVisibleCitizenFiles(user, { citizenId: citizen.id, includeArchived: user?.role === "admin" }),
      filesCount: getVisibleCitizenFiles(user, { citizenId: citizen.id, includeArchived: user?.role === "admin" }).length,
      adminFields: {
        trace: citizen.trace,
        risk: `${citizen.risk}%`,
        note: citizen.note
      }
    }))
    .sort((a, b) => {
    return String(a.legalName || "").localeCompare(String(b.legalName || ""), "pl");
  });
}

function renderAlphabetGroups(entries) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const groupedEntries = groupEntriesByLetter(entries);

  return alphabet.map((letter) => {
    const people = groupedEntries.get(letter) || [];

    return `
      <details class="file-letter-group">
        <summary>
          <span>${escapeHtml(letter)}</span>
          <b>${escapeHtml(people.length)}</b>
        </summary>

        <div class="file-person-list">
          ${people.length
            ? people.map((entry) => renderCitizenFileTile(entry)).join("")
            : '<p class="file-empty">No records</p>'}
        </div>
      </details>
    `;
  }).join("");
}

function groupEntriesByLetter(entries) {
  return entries.reduce((groups, entry) => {
    const letter = getIndexLetter(entry.legalName);
    const people = groups.get(letter) || [];

    people.push(entry);
    groups.set(letter, people);

    return groups;
  }, new Map());
}

function getIndexLetter(value) {
  const firstLetter = String(value || "#").trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(firstLetter) ? firstLetter : "#";
}

function renderCitizenFileTile(entry) {
  return `
    <button class="file-person-card" type="button" data-file-id="${escapeHtml(entry.id)}">
      ${renderFileThumb(entry)}

      <span class="file-person-main">
        <b>${escapeHtml(entry.legalName)}</b>
        <small>${escapeHtml(entry.recordId)}</small>
      </span>

      <span class="file-person-badges">
        ${entry.age !== null && entry.age !== undefined ? `<i class="citizen-age-badge is-index-age"><small>AGE</small><b>${escapeHtml(entry.age)}</b></i>` : ""}
        <strong>${escapeHtml(entry.profileTag)}</strong>
      </span>
    </button>
  `;
}

function bindCitizenFileCards(user) {
  const cards = document.querySelectorAll(".file-person-card");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      window.WS_APP.pushModuleView?.(() => renderCitizenDatabaseModule(user));
      renderCitizenFileRecord(user, card.dataset.fileId);
    });
  });
}

function renderCitizenFileRecord(user, fileId, returnTarget = "database") {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const entry = getCitizenFileEntries(user).find((item) => item.id === fileId);

  if (!container || !entry) return;

  window.WS_APP.currentModuleId = "citizen-database";

  if (status) {
    status.textContent = `CITIZEN DATABASE / ${entry.recordId}`;
  }

  const relations = window.WS_APP.getCitizenRecordRelations?.(entry.id, {
    user,
    includeArchived: user?.role === "admin"
  }) || { citizenFiles: entry.files || [], caseFiles: [] };

  container.innerHTML = `
    <article class="module-detail citizen-file-record" data-citizen-id="${escapeHtml(fileId)}">
      <div class="module-detail-head">
        <div>
          <p class="kicker">CITIZEN DATABASE / CHARACTER RECORD</p>
          <h4>${escapeHtml(entry.legalName)}</h4>
        </div>

        <button class="module-back-button" type="button">Back</button>
      </div>

      ${renderDatabaseContextLine([
        { label: "DATABASE", target: "database" },
        { label: returnTarget === "citizen-files" ? "CITIZEN FILES" : "CITIZEN DATABASE", target: returnTarget === "citizen-files" ? "citizen-files" : "citizen-database" },
        { label: "CHARACTER RECORD" }
      ])}

      <div class="file-record-layout is-database-profile">
        ${renderFileThumb(entry)}

        <section class="file-record-main">
          <div class="file-record-title is-public-profile-title">
            <div>
              <h5>${escapeHtml(entry.legalName)}</h5>
              <span>${escapeHtml(entry.recordId)}</span>
            </div>
            ${entry.age !== null && entry.age !== undefined ? `<i class="citizen-age-badge is-record-age"><small>AGE</small><b>${escapeHtml(entry.age)}</b></i>` : ""}
          </div>

          <div class="profile-tags">
            <span class="profile-tag">${escapeHtml(entry.profileTag)}</span>
            ${(entry.tags || []).map((tag) => `<span class="profile-tag">${escapeHtml(tag)}</span>`).join("")}
          </div>

          ${renderRecordTagPills(entry)}

          <p class="file-summary">${escapeHtml(entry.publicSummary)}</p>

          <div class="profile-data database-profile-data">
            ${renderRecordFields(entry.publicFields)}
          </div>

          ${user.role === "admin" ? renderAdminRecordFields(entry.adminFields, { compact: true }) : ""}

          <section class="database-record-relations">
            <div>
              <h5>Citizen Files</h5>
              <div class="database-relation-list">
                ${(relations.citizenFiles || []).length
                  ? relations.citizenFiles.map((file) => renderDatabaseRelationLink(file.title || file.fileId, "citizen-file", file.fileId, file.type || "CITIZEN FILE")).join("")
                  : '<span class="file-empty">No linked Citizen Files</span>'}
              </div>
            </div>
            <div>
              <h5>Case Files</h5>
              <div class="database-relation-list">
                ${(relations.caseFiles || []).length
                  ? relations.caseFiles.map((record) => renderDatabaseRelationLink(record.title || record.id, "case-file", record.id, record.caseNumber || record.id)).join("")
                  : '<span class="file-empty">No linked Case Files</span>'}
              </div>
            </div>
          </section>

          <div class="record-action-grid record-navigation-grid">
            ${renderCitizenDatabaseActionTiles(entry, user)}
          </div>
        </section>
      </div>
    </article>
  `;

  const button = document.querySelector(".module-back-button");

  window.WS_APP.bindModuleBackButton(user, () => {
    if (returnTarget === "files" || returnTarget === "citizen-files") {
      const returnView = window.WS_APP.citizenFilesReturnView;
      if (typeof returnView === "function") {
        returnView();
        return;
      }
      renderCitizenFilesModule(user);
      return;
    }

    renderCitizenDatabaseModule(user);
  });

  bindDatabaseContextActions(user);
  bindRecordFilesTile(user);
  bindDatabaseRelationLinks(user, () => renderCitizenFileRecord(user, entry.id, returnTarget));
}

function renderCitizenDatabaseActionTiles(entry, user) {
  const isOwner = entry.id === user?.citizenId;
  const canOpenCard = user?.role === "admin" || isOwner;
  const canOpenSubscriptions = user?.role === "admin" || isOwner;
  return `
    ${canOpenCard ? renderRecordActionTile({
      label: "Citizen Card",
      hint: "Full mechanical card",
      state: "OPEN",
      action: "card",
      id: entry.id
    }) : ""}
    ${renderRecordActionTile({
      label: "Citizen Files",
      hint: `${entry.filesCount} file entries`,
      state: "OPEN",
      action: "files",
      id: entry.id,
      disabled: false
    })}
    ${canOpenSubscriptions ? renderRecordActionTile({
      label: "Subscriptions",
      hint: "Service control panel",
      state: "OPEN",
      action: "subscriptions",
      id: entry.id
    }) : ""}
  `;
}

function renderRecordActionTile({ label, hint, state, action, id, disabled = false }) {
  return `
    <button
      class="record-action-tile ${disabled ? "is-disabled" : ""}"
      type="button"
      data-record-action="${escapeHtml(action)}"
      data-record-id="${escapeHtml(id || "")}"
      ${disabled ? "disabled" : ""}
    >
      <span>
        <b>${escapeHtml(label)}</b>
        <small>${escapeHtml(hint)}</small>
      </span>
      <strong>${escapeHtml(state)}</strong>
    </button>
  `;
}

function bindRecordFilesTile(user) {
  document.querySelectorAll("[data-record-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.recordAction;
      const citizenId = button.dataset.recordId;
      if (!citizenId) return;

      window.WS_APP.pushModuleView?.(() => renderCitizenFileRecord(user, citizenId));

      if (action === "card") {
        renderCitizenCardModule(user, "CITIZEN CARD", citizenId, { returnTarget: "database" });
        return;
      }

      if (action === "subscriptions") {
        if (user.role === "admin") {
          renderAdminCitizenSubscriptionControl(user, citizenId);
          return;
        }
        renderSubscriptionsModule(user);
        return;
      }

      renderCitizenSingleFiles(user, citizenId, "database");
    });
  });
}

function renderCitizenSingleFiles(user, citizenId, returnTarget = "database") {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const citizen = window.WS_APP.getCitizenById(citizenId);
  const files = getVisibleCitizenFiles(user, {
    citizenId,
    includeArchived: canManageCitizenFiles(user)
  });
  const fileLabel = citizen ? getCitizenShortRecordLabel(citizen) : "";

  if (!container || !citizen) return;

  window.WS_APP.currentModuleId = "citizen-files";
  if (status) status.textContent = `CITIZEN FILES / ${citizen.legalName.toUpperCase()} / ${files.length}`;

  const returnView = () => {
    if (returnTarget === "database") {
      renderCitizenFileRecord(user, citizenId);
      return;
    }
    renderCitizenFilesModule(user);
  };

  container.innerHTML = `
    <article class="module-detail citizen-files-record">
      <div class="module-detail-head">
        <div>
          <p class="kicker">CITIZEN FILES / DOSSIER</p>
          <h4>${escapeHtml(fileLabel)}</h4>
        </div>
        <div class="citizen-file-head-actions">
          ${canManageCitizenFiles(user) ? '<button class="module-action-button" type="button" data-citizen-file-create>New File</button>' : ""}
          <button class="module-back-button" type="button">Back</button>
        </div>
      </div>

      ${renderDatabaseContextLine([
        { label: "DATABASE", target: "database" },
        { label: "CITIZEN FILES", target: "citizen-files" },
        { label: "DOSSIER" }
      ])}

      ${renderCitizenFileFeedback()}

      <section class="citizen-file-record-list">
        ${files.length
          ? files.map((file) => renderCitizenFileListRow(file, user)).join("")
          : renderDatabaseEmptyState("NO CITIZEN FILE RECORDS", "This citizen has no visible Citizen File records.")}
      </section>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, returnView);
  bindDatabaseContextActions(user);
  bindCitizenFileListRows(user, returnView);
  container.querySelector("[data-citizen-file-create]")?.addEventListener("click", () => {
    renderCitizenFileEditor(user, null, returnView);
    const select = document.querySelector('[data-citizen-file-form] [name="citizenId"]');
    if (select) select.value = citizenId;
  });
}


window.WS_APP.renderCitizenFilesModule = renderCitizenFilesModule;
window.WS_APP.renderCitizenDatabaseModule = renderCitizenDatabaseModule;
window.WS_APP.renderCitizenFileRecord = renderCitizenFileRecord;
window.WS_APP.renderCitizenFileDocument = renderCitizenFileDocument;
window.WS_APP.renderCitizenSingleFiles = renderCitizenSingleFiles;
