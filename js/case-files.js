window.WS_APP = window.WS_APP || {};

(function initCaseFilesModule() {
  const CLEARANCE_ORDER = ["PUBLIC", "CIVIL", "RESTRICTED", "BLACK", "GM"];

  window.WS_APP.renderCaseFilesModule = function renderCaseFilesModule(user = window.WS_APP.currentUser) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    const terminalGrid = document.querySelector(".terminal-grid");
    const records = getVisibleCaseFiles(user);
    const filterOptions = getCaseFilterOptions(records);

    if (!container || !user) return;

    terminalGrid?.classList.add("is-card-open");
    window.WS_APP.currentModuleId = "case-files";

    if (status) {
      status.textContent = `CASE FILES / ${records.length} RECORDS`;
    }

    container.innerHTML = `
      <article class="module-detail case-files-view editable-registry">
        <div class="module-detail-head">
          <div>
            <p class="kicker">CASE FILES / LOCAL INCIDENT REGISTRY</p>
            <h4>Case Files</h4>
          </div>

          <button class="module-back-button" type="button">Back</button>
        </div>

        ${renderDatabaseContextLine([
          { label: "DATABASE", target: "database" },
          { label: "CASE FILES" }
        ])}

        <section class="registry-toolbar case-file-toolbar">
          <label>
            <span>Search</span>
            <input
              class="registry-search"
              id="case-file-filter"
              type="search"
              placeholder="Filter case files"
              autocomplete="off"
            />
          </label>

          <label>
            <span>Tag</span>
            <select id="case-file-tag-filter">
              <option value="">All tags</option>
              ${filterOptions.tags.map((tag) => `<option value="${escapeAttr(tag)}">${escapeHtml(tag)}</option>`).join("")}
            </select>
          </label>

          <label>
            <span>Date</span>
            <input id="case-file-date-filter" type="text" placeholder="2109-01-03" autocomplete="off" />
          </label>

          <label>
            <span>Status</span>
            <select id="case-file-status-filter">
              <option value="">All status</option>
              ${filterOptions.statuses.map((item) => `<option value="${escapeAttr(item)}">${escapeHtml(item)}</option>`).join("")}
            </select>
          </label>

          ${user.role === "admin" ? `
            <div class="case-file-toolbar-actions">
              <button class="registry-action" type="button" id="case-default-button">Add Default Case</button>
              <button class="registry-action" type="button" id="case-create-button">Create Blank</button>
            </div>
          ` : ""}
        </section>

        <section class="case-file-list" id="case-file-list">
          ${renderCaseFileGroups(records, user)}
        </section>
      </article>
    `;

    bindBackButton(user);
    bindDatabaseContextActions(user);
    bindCaseFileRegistry(user, records);
  };

  window.WS_APP.openCaseFileRecord = function openCaseFileRecord(user, recordId, options = {}) {
    renderCaseFileRecord(user || window.WS_APP.currentUser, recordId, options);
  };

  function getVisibleCaseFiles(user) {
    const records = window.WS_APP.getCaseFiles?.({ includeArchived: user?.role === "admin" }) || [];

    return records
      .filter((record) => canReadCaseFile(record, user))
      .sort((a, b) => String(a.caseNumber || "").localeCompare(String(b.caseNumber || ""), "pl"));
  }


  function getCaseFilterOptions(records) {
    const tags = new Set();
    const statuses = new Set();

    records.forEach((record) => {
      (record.tags || []).forEach((tag) => tags.add(String(tag).trim()));
      statuses.add(normalizeCaseStatus(record));
    });

    return {
      tags: [...tags].filter(Boolean).sort((a, b) => a.localeCompare(b, "pl")),
      statuses: [...statuses].filter(Boolean).sort((a, b) => a.localeCompare(b, "pl"))
    };
  }

  function renderCaseFileGroups(records, user) {
    const groups = getCaseStatusGroups(records);

    if (!records.length) return renderEmptyState(user);

    return groups
      .filter((group) => group.records.length)
      .map((group) => `
        <section class="case-file-status-group" data-case-group="${escapeAttr(group.id)}">
          <header class="case-file-group-head">
            <span>${escapeHtml(group.title)}</span>
            <b>${escapeHtml(group.records.length)}</b>
          </header>

          <div class="case-file-list-header" aria-hidden="true">
            <span>Case file</span>
            <span>Content tags</span>
            <span>Priority</span>
          </div>

          <div class="case-file-group-list">
            ${group.records.map((record) => renderCaseFileRow(record)).join("")}
          </div>
        </section>
      `).join("");
  }

  function getCaseStatusGroups(records) {
    const order = [
      { id: "open", title: "Open", match: ["OPEN"] },
      { id: "pending", title: "Pending", match: ["PENDING", "WAITING"] },
      { id: "closed", title: "Closed", match: ["CLOSED", "RESOLVED", "SEALED"] },
      { id: "archived", title: "Archived", match: ["ARCHIVED"] }
    ];

    return order.map((group) => ({
      ...group,
      records: records.filter((record) => {
        if (group.id === "archived") return record.archived === true || normalizeCaseStatus(record) === "ARCHIVED";
        if (record.archived === true) return false;
        return group.match.includes(normalizeCaseStatus(record));
      })
    }));
  }

  function normalizeCaseStatus(record) {
    if (record?.archived === true) return "ARCHIVED";
    return String(record?.status || "OPEN").trim().toUpperCase() || "OPEN";
  }

  function getCaseRecordDate(record) {
    const source = record?.date || record?.createdAt || record?.timeline?.[0]?.at || record?.updatedAt || "";
    const value = String(source).trim();
    const match = value.match(/\d{4}-\d{2}-\d{2}/) || value.match(/\d{4}\.\d{2}\.\d{2}/);
    return match ? match[0].replace(/\./g, "-") : value.slice(0, 10);
  }

  function filterCaseFiles(records) {
    const query = normalize(document.querySelector("#case-file-filter")?.value || "");
    const tag = normalize(document.querySelector("#case-file-tag-filter")?.value || "");
    const date = normalize(document.querySelector("#case-file-date-filter")?.value || "");
    const status = normalize(document.querySelector("#case-file-status-filter")?.value || "");

    return records.filter((record) => {
      const recordText = normalize([
        record.title,
        record.caseNumber,
        record.type,
        record.summary,
        record.priority,
        normalizeCaseStatus(record),
        getCaseRecordDate(record),
        ...(record.tags || [])
      ].join(" "));
      const recordTags = (record.tags || []).map((item) => normalize(item));
      const recordDate = normalize(getCaseRecordDate(record));
      const recordStatus = normalize(normalizeCaseStatus(record));

      return (!query || recordText.includes(query))
        && (!tag || recordTags.includes(tag))
        && (!date || recordDate.includes(date))
        && (!status || recordStatus === status);
    });
  }

  function canReadCaseFile(record, user) {
    if (!record || !user) return false;
    if (record.archived && user.role !== "admin") return false;
    if (user.role === "admin") return true;

    if (window.WS_APP.canAccessRecord?.(user, record)) return true;

    const clearance = String(record.clearance || "RESTRICTED").toUpperCase();
    const relatedCitizens = Array.isArray(record.relatedCitizens) ? record.relatedCitizens : [];
    return relatedCitizens.includes(user.citizenId) && clearance !== "GM" && clearance !== "GAME_MASTER" && clearance !== "BLACK";
  }

  function canSeeRestrictedLayer(record, user) {
    if (user?.role === "admin") return true;
    const clearance = String(record?.clearance || "RESTRICTED").toUpperCase();
    return clearance === "PUBLIC" || clearance === "CIVIL";
  }

  function renderCaseFileRow(record) {
    const archived = record.archived === true;
    const priorityClass = String(record.priority || "NORMAL").toLowerCase();
    const tags = (record.tags || []).slice(0, 4);

    return `
      <button class="case-file-row ${archived ? "is-archived" : ""}" type="button" data-case-id="${escapeHtml(record.id)}">
        <span class="case-file-main">
          <b>${escapeHtml(record.title || record.id)}</b>
          <small>${escapeHtml(record.caseNumber || record.id)} / ${escapeHtml(record.type || "INCIDENT")}</small>
        </span>

        <span class="case-file-tags">
          ${tags.map((tag) => `<i class="ui-badge ui-badge--content">${escapeHtml(tag)}</i>`).join("")}
        </span>

        <strong class="ui-badge ui-badge--priority case-file-priority ${escapeHtml(priorityClass)}">${archived ? "ARCHIVED" : escapeHtml(record.priority || "NORMAL")}</strong>
      </button>
    `;
  }

  function renderEmptyState(user) {
    return renderDatabaseEmptyState(
      "NO CASE FILES FOUND",
      user?.role === "admin" ? "Add a default case or create a blank record." : "No visible case files are available for this account."
    );
  }

  function bindCaseFileRegistry(user, records = []) {
    bindRowOpen(user);

    const rerenderFilteredCases = () => {
      const list = document.querySelector("#case-file-list");
      if (!list) return;
      const filtered = filterCaseFiles(records);
      list.innerHTML = filtered.length ? renderCaseFileGroups(filtered, user) : renderEmptyState(user);
      bindRowOpen(user);
    };

    [
      "#case-file-filter",
      "#case-file-tag-filter",
      "#case-file-date-filter",
      "#case-file-status-filter"
    ].forEach((selector) => {
      document.querySelector(selector)?.addEventListener("input", rerenderFilteredCases);
      document.querySelector(selector)?.addEventListener("change", rerenderFilteredCases);
    });

    document.querySelector("#case-default-button")?.addEventListener("click", () => {
      const record = window.WS_APP.createDefaultCaseFile?.();
      if (record) {
        window.WS_APP.pushModuleView?.(() => window.WS_APP.renderCaseFilesModule(user));
        renderCaseFileRecord(user, record.id, { edit: true });
      }
    });

    document.querySelector("#case-create-button")?.addEventListener("click", () => {
      window.WS_APP.pushModuleView?.(() => window.WS_APP.renderCaseFilesModule(user));
      renderCaseFileEditor(user, null);
    });
  }

  function bindRowOpen(user) {
    document.querySelectorAll("[data-case-id]").forEach((row) => {
      row.addEventListener("click", () => {
        window.WS_APP.pushModuleView?.(() => window.WS_APP.renderCaseFilesModule(user));
        renderCaseFileRecord(user, row.dataset.caseId);
      });
    });
  }

  function renderCaseFileRecord(user, recordId, options = {}) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    const record = window.WS_APP.getCaseFileById?.(recordId);

    if (!container || !record || !canReadCaseFile(record, user)) return;

    const relations = window.WS_APP.getCaseFileRelations?.(record.id, {
      user,
      includeArchived: user?.role === "admin"
    }) || { citizens: [], citizenFiles: [], missingCitizenIds: [], missingCitizenFileIds: [] };

    if (options.edit && user?.role === "admin") {
      renderCaseFileEditor(user, record, options);
      return;
    }

    if (status) {
      status.textContent = `CASE FILE / ${String(record.caseNumber || record.id).toUpperCase()}`;
    }

    container.innerHTML = `
      <article class="module-detail case-file-record ${record.archived ? "is-archived" : ""}">
        <div class="module-detail-head">
          <div>
            <p class="kicker">CASE FILE / ${escapeHtml(record.caseNumber || record.id)}</p>
            <h4>${escapeHtml(record.title || record.id)}</h4>
          </div>

          <button class="module-back-button" type="button">Back</button>
        </div>

        ${renderDatabaseContextLine([
          { label: "DATABASE", target: "database" },
          { label: "CASE FILES", target: "case-files" },
          { label: record.caseNumber || record.id || "CASE RECORD" }
        ])}

        <section class="case-file-status-strip">
          <strong>${escapeHtml(record.status || "OPEN")}</strong>
          <strong>${escapeHtml(record.priority || "NORMAL")}</strong>
          <strong>${escapeHtml(record.clearance || "RESTRICTED")}</strong>
          ${record.archived ? "<strong>ARCHIVED</strong>" : ""}
        </section>

        ${user.role === "admin" ? renderAdminActions(record) : ""}

        <section class="system-article-body">
          ${renderDataRowLocal("TYPE", record.type)}
          ${renderDataRowLocal("SUMMARY", record.summary || "No summary")}

          <div class="system-article-section">
            <h5>PUBLIC LAYER</h5>
            <p>${escapeHtml(record.publicText || "No public layer")}</p>
          </div>

          ${canSeeRestrictedLayer(record, user) ? `
            <div class="system-article-section">
              <h5>RESTRICTED LAYER</h5>
              <p>${escapeHtml(record.restrictedText || "No restricted layer")}</p>
            </div>
          ` : ""}

          ${user.role === "admin" ? `
            <div class="system-article-section gm-layer-section">
              <h5>GM LAYER</h5>
              <p>${escapeHtml(record.gmText || "No GM layer")}</p>
            </div>
          ` : ""}
        </section>

        <section class="case-file-relations">
          ${renderCitizenRelationBlock(relations.citizens, relations.missingCitizenIds)}
          ${renderCitizenFileRelationBlock(relations.citizenFiles, relations.missingCitizenFileIds)}
          ${renderRelationBlock("ADDRESSES", record.relatedAddresses)}
          ${renderRelationBlock("ENTRIES", record.relatedEntries)}
          ${renderRelationBlock("TAGS", record.tags)}
        </section>

        <section class="case-file-timeline">
          <h5>TIMELINE</h5>
          ${record.timeline?.length ? record.timeline.map(renderTimelineItem).join("") : '<p class="file-empty">No timeline entries</p>'}
        </section>

        <section class="case-file-tasks">
          <h5>TASKS</h5>
          ${record.tasks?.length ? record.tasks.map(renderTaskItem).join("") : '<p class="file-empty">No tasks</p>'}
        </section>
      </article>
    `;

    const recordReturnView = typeof options.returnView === "function"
      ? options.returnView
      : () => window.WS_APP.renderCaseFilesModule(user);
    window.WS_APP.bindModuleBackButton?.(user, recordReturnView);
    bindDatabaseContextActions(user);
    bindCaseRelationLinks(user, record, recordReturnView);
    bindCaseFileRecordActions(user, record, options);
  }

  function renderAdminActions(record) {
    return `
      <section class="case-file-actions">
        <button class="entry-record-action" type="button" id="case-edit-button">Edit Record</button>
        <button class="entry-record-action" type="button" id="case-duplicate-button">Duplicate</button>
        <button class="entry-record-action" type="button" id="case-dependency-preview-button">Preview Dependencies</button>
        ${record.archived ? `
          <button class="entry-record-action" type="button" id="case-restore-button">Restore</button>
          <button class="entry-record-action danger" type="button" id="case-delete-button">Hard Delete</button>
        ` : `
          <button class="entry-record-action danger" type="button" id="case-archive-button">Archive</button>
        `}
      </section>
    `;
  }

  function bindCaseFileRecordActions(user, record, options = {}) {
    if (user?.role !== "admin") return;

    document.querySelector("#case-edit-button")?.addEventListener("click", () => {
      window.WS_APP.pushModuleView?.(() => renderCaseFileRecord(user, record.id, options));
      renderCaseFileEditor(user, record, options);
    });

    document.querySelector("#case-duplicate-button")?.addEventListener("click", () => {
      const copy = window.WS_APP.duplicateCaseFile?.(record.id);
      if (copy) renderCaseFileRecord(user, copy.id, options);
    });

    document.querySelector("#case-dependency-preview-button")?.addEventListener("click", () => {
      const preview = window.WS_APP.previewAdminRecordLifecycle?.({ recordType: "CASE_FILE", recordId: record.id, action: record.archived ? "HARD_DELETE" : "ARCHIVE", actor: user });
      window.alert?.(window.WS_APP.summarizeAdminRecordLifecyclePreview?.(preview) || preview?.message || "Preview unavailable.");
    });

    document.querySelector("#case-archive-button")?.addEventListener("click", async () => {
      const confirmed = await confirmCaseAction("ARCHIVE CASE FILE", `Archive case file ${record.caseNumber || record.title}?`, "Archive");
      if (!confirmed) return;
      const result = window.WS_APP.requestAdminRecordLifecycleAction?.({ recordType: "CASE_FILE", recordId: record.id, action: "ARCHIVE", actor: user, expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(record) || 0, label: record.caseNumber || record.title || record.id });
      if (!result?.ok) return window.alert?.(`Archive failed: ${result?.resultCode || "UNKNOWN"}`);
      renderCaseFileRecord(user, record.id, options);
    });

    document.querySelector("#case-restore-button")?.addEventListener("click", () => {
      const result = window.WS_APP.requestAdminRecordLifecycleAction?.({ recordType: "CASE_FILE", recordId: record.id, action: "RESTORE", actor: user, expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(record) || 0, label: record.caseNumber || record.title || record.id });
      if (!result?.ok) return window.alert?.(`Restore failed: ${result?.resultCode || "UNKNOWN"}`);
      renderCaseFileRecord(user, record.id, options);
    });

    document.querySelector("#case-delete-button")?.addEventListener("click", async () => {
      const confirmed = await confirmCaseAction("HARD DELETE CASE FILE", `Hard delete archived case file ${record.caseNumber || record.title}? This cannot be undone.`, "Hard Delete");
      if (!confirmed) return;
      const result = window.WS_APP.requestAdminRecordLifecycleAction?.({ recordType: "CASE_FILE", recordId: record.id, action: "HARD_DELETE", actor: user, expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(record) || 0, label: record.caseNumber || record.title || record.id });
      if (!result?.ok) return window.alert?.(`Hard delete failed: ${result?.resultCode || "UNKNOWN"}`);
      if (typeof options.returnView === "function") options.returnView();
      else window.WS_APP.renderCaseFilesModule(user);
    });
  }

  function renderCaseFileEditor(user, record, options = {}) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    const isNew = !record;
    const draft = record || {
      title: "",
      caseNumber: "",
      type: "INCIDENT",
      status: "OPEN",
      priority: "NORMAL",
      clearance: "RESTRICTED",
      summary: "",
      publicText: "",
      restrictedText: "",
      gmText: "",
      relatedCitizens: [],
      relatedCitizenFileIds: [],
      relatedAddresses: [],
      relatedEntries: [],
      tags: [],
      timeline: [],
      tasks: []
    };

    if (!container || user?.role !== "admin") return;
    const citizenFiles = window.WS_APP.getCitizenFiles?.({ includeArchived: true, enforceAccess: false }) || [];

    if (status) {
      status.textContent = isNew ? "CASE FILE / CREATE" : `CASE FILE / EDIT / ${String(draft.caseNumber || draft.id).toUpperCase()}`;
    }

    container.innerHTML = `
      <article class="module-detail case-file-editor">
        <div class="module-detail-head">
          <div>
            <p class="kicker">CASE FILE / ${isNew ? "CREATE BLANK" : "EDIT RECORD"}</p>
            <h4>${isNew ? "New Case File" : escapeHtml(draft.title || draft.id)}</h4>
          </div>

          <button class="module-back-button" type="button">Back</button>
        </div>

        ${renderDatabaseContextLine([
          { label: "DATABASE", target: "database" },
          { label: "CASE FILES", target: "case-files" },
          { label: isNew ? "CREATE" : "EDIT" }
        ])}

        <form class="case-file-form" id="case-file-form">
          <label>Title<input name="title" value="${escapeAttr(draft.title)}" required /></label>
          <label>Case Number<input name="caseNumber" value="${escapeAttr(draft.caseNumber)}" placeholder="auto if empty" /></label>
          <label>Type<input name="type" value="${escapeAttr(draft.type)}" /></label>

          <label>Status
            <select name="status">
              ${renderOptions(["OPEN", "PENDING", "CLOSED", "SEALED", "ARCHIVED"], draft.status)}
            </select>
          </label>

          <label>Priority
            <select name="priority">
              ${renderOptions(["LOW", "NORMAL", "HIGH", "CRITICAL", "BLACK"], draft.priority)}
            </select>
          </label>

          ${window.WS_APP.renderAccessTagSelect?.("accessTags", draft.accessTags || [draft.clearance || "RESTRICTED"], { label: "Access required", extraClass: "span-2" }) || `
            <label>Clearance
              <select name="clearance">
                ${renderOptions(CLEARANCE_ORDER, draft.clearance)}
              </select>
            </label>
          `}

          <label class="span-2">Summary<textarea name="summary" rows="3">${escapeHtml(draft.summary)}</textarea></label>
          <label class="span-2">Public Layer<textarea name="publicText" rows="5">${escapeHtml(draft.publicText)}</textarea></label>
          <label class="span-2">Restricted Layer<textarea name="restrictedText" rows="5">${escapeHtml(draft.restrictedText)}</textarea></label>
          <label class="span-2">GM Layer<textarea name="gmText" rows="5">${escapeHtml(draft.gmText)}</textarea></label>

          <label>Related Citizens<textarea name="relatedCitizens" rows="4" placeholder="citizen-a, citizen-b">${escapeHtml((draft.relatedCitizens || []).join("\n"))}</textarea></label>
          <fieldset class="case-file-citizen-file-picker span-2">
            <legend>Related Citizen Files</legend>
            ${citizenFiles.length ? citizenFiles.map((file) => `
              <label>
                <input class="ui-select-control" type="checkbox" name="relatedCitizenFileIds" value="${escapeAttr(file.fileId)}" ${(draft.relatedCitizenFileIds || []).includes(file.fileId) ? "checked" : ""}>
                <span>${escapeHtml(file.title)} <small>${escapeHtml(file.fileId)} / ${escapeHtml(file.citizenId)}</small></span>
              </label>
            `).join("") : '<p class="file-empty">No Citizen File records available.</p>'}
          </fieldset>
          <label>Related Addresses<textarea name="relatedAddresses" rows="4">${escapeHtml((draft.relatedAddresses || []).join("\n"))}</textarea></label>
          <label>Related Entries<textarea name="relatedEntries" rows="4">${escapeHtml((draft.relatedEntries || []).join("\n"))}</textarea></label>
          ${window.WS_APP.renderContentTagSelect?.("tags", draft.tags || [], { label: "Content tags", extraClass: "span-2" }) || `<label class="span-2">Tags<textarea name="tags" rows="4">${escapeHtml((draft.tags || []).join("\n"))}</textarea></label>`}

          <label class="span-2">Timeline<textarea name="timeline" rows="7" placeholder="2109-01-01 21:37&#10;TITLE&#10;Body&#10;---&#10;2109-01-02 00:12&#10;TITLE&#10;Body">${escapeHtml(formatTimelineForEdit(draft.timeline))}</textarea></label>
          <label class="span-2">Tasks<textarea name="tasks" rows="5" placeholder="Task title">${escapeHtml(formatTasksForEdit(draft.tasks))}</textarea></label>

          <footer class="case-file-form-actions span-2">
            <button class="entry-record-action" type="submit">Save Record</button>
            <button class="entry-record-action danger" type="button" id="case-editor-cancel">Cancel</button>
          </footer>
        </form>
      </article>
    `;

    window.WS_APP.bindModuleBackButton?.(user, () => cancelEditor(user, record, options));
    bindDatabaseContextActions(user);
    document.querySelector("#case-editor-cancel")?.addEventListener("click", () => cancelEditor(user, record, options));
    document.querySelector("#case-file-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      saveEditor(user, record, event.currentTarget, options);
    });
  }

  function saveEditor(user, record, form, options = {}) {
    const data = new FormData(form);
    const payload = {
      title: data.get("title"),
      caseNumber: data.get("caseNumber"),
      type: data.get("type"),
      status: data.get("status"),
      priority: data.get("priority"),
      clearance: data.get("clearance"),
      accessTags: window.WS_APP.collectMultiSelectValues?.(form, "accessTags", [data.get("clearance") || "RESTRICTED"]) || [String(data.get("clearance") || "RESTRICTED").toUpperCase()],
      summary: data.get("summary"),
      publicText: data.get("publicText"),
      restrictedText: data.get("restrictedText"),
      gmText: data.get("gmText"),
      relatedCitizens: parseList(data.get("relatedCitizens")),
      relatedCitizenFileIds: data.getAll("relatedCitizenFileIds").map(String),
      relatedAddresses: parseList(data.get("relatedAddresses")),
      relatedEntries: parseList(data.get("relatedEntries")),
      tags: window.WS_APP.collectContentTagValues?.(form, "tags") || parseList(data.get("tags")),
      timeline: parseTimeline(data.get("timeline")),
      tasks: parseTasks(data.get("tasks")),
      archived: data.get("status") === "ARCHIVED"
    };

    const saved = record?.id
      ? window.WS_APP.updateCaseFile?.(record.id, payload)
      : window.WS_APP.createCaseFile?.(payload);

    if (saved) renderCaseFileRecord(user, saved.id, options);
  }

  function cancelEditor(user, record, options = {}) {
    if (record?.id) {
      renderCaseFileRecord(user, record.id, options);
      return;
    }

    window.WS_APP.renderCaseFilesModule(user);
  }

  function renderCitizenRelationBlock(citizens = [], missingIds = []) {
    return `
      <div class="case-file-relation-block">
        <h5>CITIZENS</h5>
        <div class="database-relation-list">
          ${(citizens || []).length
            ? citizens.map((citizen) => `
              <button class="database-relation-link" type="button" data-case-relation-type="citizen" data-case-relation-id="${escapeAttr(citizen.id)}">
                <span>${escapeHtml(citizen.legalName || citizen.name || citizen.id)}</span>
                <small>${escapeHtml(citizen.id)}</small>
              </button>
            `).join("")
            : '<span class="file-empty">None</span>'}
          ${(missingIds || []).map((id) => `<span class="database-relation-missing">Missing: ${escapeHtml(id)}</span>`).join("")}
        </div>
      </div>
    `;
  }

  function renderCitizenFileRelationBlock(files = [], missingIds = []) {
    return `
      <div class="case-file-relation-block">
        <h5>CITIZEN FILES</h5>
        <div class="database-relation-list">
          ${(files || []).length
            ? files.map((file) => `
              <button class="database-relation-link" type="button" data-case-relation-type="citizen-file" data-case-relation-id="${escapeAttr(file.fileId)}">
                <span>${escapeHtml(file.title || file.fileId)}</span>
                <small>${escapeHtml(file.fileId)} / ${escapeHtml(file.citizenId)}</small>
              </button>
            `).join("")
            : '<span class="file-empty">None</span>'}
          ${(missingIds || []).map((id) => `<span class="database-relation-missing">Missing: ${escapeHtml(id)}</span>`).join("")}
        </div>
      </div>
    `;
  }

  function bindCaseRelationLinks(user, record, returnView) {
    document.querySelectorAll("[data-case-relation-type][data-case-relation-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const type = button.dataset.caseRelationType;
        const id = button.dataset.caseRelationId;
        const safeReturn = () => renderCaseFileRecord(user, record.id, { returnView });
        window.WS_APP.pushModuleView?.(safeReturn);
        if (type === "citizen-file") {
          window.WS_APP.renderCitizenFileDocument?.(user, id, safeReturn);
          return;
        }
        if (type === "citizen") {
          window.WS_APP.citizenFilesReturnView = safeReturn;
          window.WS_APP.renderCitizenFileRecord?.(user, id, "citizen-files");
        }
      });
    });
  }

  function renderRelationBlock(label, values = []) {
    const items = Array.isArray(values) ? values : [];
    return `
      <div class="case-file-relation-block">
        <h5>${escapeHtml(label)}</h5>
        ${items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : '<p class="file-empty">None</p>'}
      </div>
    `;
  }

  function renderTimelineItem(item) {
    return `
      <article class="case-file-timeline-item">
        <time>${escapeHtml(item.at || "NO TIME")}</time>
        <b>${escapeHtml(item.title || "TIMELINE ENTRY")}</b>
        <p>${escapeHtml(item.body || "")}</p>
      </article>
    `;
  }

  function renderTaskItem(item) {
    const status = String(item.status || "OPEN").toLowerCase();
    return `
      <div class="case-file-task">
        <span>${escapeHtml(item.title || "TASK")}</span>
        <strong class="case-file-task-status ${escapeHtml(status)}">${escapeHtml(item.status || "OPEN")}</strong>
      </div>
    `;
  }

  function formatTimelineForEdit(timeline = []) {
    return (Array.isArray(timeline) ? timeline : [])
      .map((item) => [item.at, item.title, item.body].filter(Boolean).join("\n"))
      .join("\n---\n");
  }

  function formatTasksForEdit(tasks = []) {
    return (Array.isArray(tasks) ? tasks : [])
      .map((item) => item.status ? `${item.title} :: ${item.status}` : item.title)
      .join("\n");
  }

  function parseTimeline(value) {
    return String(value || "")
      .split(/\n-{3,}\n/g)
      .map((block) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        if (!lines.length) return null;
        return {
          at: lines.shift() || "",
          title: lines.shift() || "TIMELINE ENTRY",
          body: lines.join("\n")
        };
      })
      .filter(Boolean);
  }

  function parseTasks(value) {
    return String(value || "")
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, status] = line.split("::").map((part) => part.trim());
        return { title, status: (status || "OPEN").toUpperCase() };
      });
  }

  function parseList(value) {
    return String(value || "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function renderOptions(options, current) {
    const normalizedCurrent = String(current || "").toUpperCase();
    return options.map((option) => `
      <option value="${escapeAttr(option)}" ${option === normalizedCurrent ? "selected" : ""}>${escapeHtml(option)}</option>
    `).join("");
  }

  function renderDataRowLocal(label, value) {
    return `
      <div class="data-row">
        <b>${escapeHtml(label)}</b>
        <span>${escapeHtml(value || "No data")}</span>
      </div>
    `;
  }

  function confirmCaseAction(title, message, confirmLabel) {
    return window.WS_APP.confirmAction?.({
      title,
      message,
      confirmLabel,
      cancelLabel: "Cancel",
      tone: "danger"
    }) ?? Promise.resolve(false);
  }

  function bindBackButton(user) {
    const fallback = () => {
      if (typeof window.WS_APP.renderDatabaseHubModule === "function") {
        window.WS_APP.renderDatabaseHubModule(user);
        return;
      }
      window.WS_APP.renderModules?.(user);
    };
    if (window.WS_APP.bindModuleBackButton) {
      window.WS_APP.bindModuleBackButton(user, fallback);
      return;
    }
    document.querySelector(".module-back-button")?.addEventListener("click", fallback);
  }

  function renderDatabaseContextLine(items) {
    return window.WS_APP.renderDatabaseContextLine?.(items) || "";
  }

  function renderDatabaseEmptyState(title, body) {
    return window.WS_APP.renderDatabaseEmptyState?.(title, body) || `<div class="entry-empty-state"><b>${escapeHtml(title || "NO RECORDS")}</b><span>${escapeHtml(body || "No records")}</span></div>`;
  }

  function bindDatabaseContextActions(user) {
    window.WS_APP.bindDatabaseContextActions?.(user);
  }

  function normalize(value) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
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

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }
})();
