window.WS_APP = window.WS_APP || {};

(function initTagRegistryModule() {
  const VISIBILITY_LEVELS = ["PUBLIC", "CIVIL", "RESTRICTED", "BLACK", "GM"];
  const TAG_TYPES = ["SYSTEM", "RISK", "MEDICAL", "NETWORK", "ECONOMIC", "SOCIAL", "GM"];

  window.WS_APP.renderTagRegistryModule = function renderTagRegistryModule(user) {
    if (user?.role !== "admin") {
      window.WS_APP.openModule?.("system", user);
      return;
    }

    renderTagList(user);
  };

  window.WS_APP.openTagRecord = function openTagRecord(user, tagId) {
    const currentUser = user || window.WS_APP.currentUser;
    if (currentUser?.role !== "admin") return;
    renderTagRecord(currentUser, tagId);
  };

  function renderTagList(user) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    const terminalGrid = document.querySelector(".terminal-grid");
    const tags = getVisibleTags(user);

    if (!container) return;

    terminalGrid?.classList.add("is-card-open");
    window.WS_APP.currentModuleId = "tag-registry";

    if (status) {
      status.textContent = `TAG REGISTRY / ${tags.length} RECORDS`;
    }

    container.innerHTML = `
      <article class="module-detail tag-registry-view editable-registry" data-registry="tags">
        <div class="module-detail-head">
          <div>
            <p class="kicker">TAG REGISTRY / LOCAL DICTIONARY</p>
            <h4>Tag Registry</h4>
          </div>

          <button class="module-back-button" type="button">Back</button>
        </div>

        <section class="registry-toolbar tag-toolbar">
          <input
            class="registry-search"
            id="tag-registry-filter"
            type="search"
            placeholder="Filter tags / type / visibility / description"
            autocomplete="off"
          />

          <button class="registry-action" type="button" id="tag-default-button">Add Default Tag</button>
          <button class="registry-action" type="button" id="tag-create-button">Create Blank</button>
        </section>

        <section class="tag-record-list" id="tag-record-list">
          ${renderTagRows(tags)}
        </section>
      </article>
    `;

    bindBackButton(user);
    bindTagRegistry(user);
  }

  function getVisibleTags(user) {
    const tags = window.WS_APP.getTags?.({ includeArchived: user?.role === "admin" }) || [];
    return tags
      .filter((record) => user?.role === "admin" || !record.archived)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pl"));
  }

  function renderTagRows(tags) {
    if (!tags.length) {
      return `
        <div class="tag-empty-state">
          <b>NO TAG RECORDS FOUND</b>
          <span>ADD DEFAULT TAG</span>
        </div>
      `;
    }

    return tags.map((tag) => renderTagRow(tag)).join("");
  }

  function renderTagRow(tag) {
    const archived = tag.archived === true;

    return `
      <button class="tag-record-row ${archived ? "is-archived" : ""}" type="button" data-tag-id="${escapeHtml(tag.id)}">
        <span>
          <b>${escapeHtml(tag.name)}</b>
          <small>${escapeHtml(tag.type || "SYSTEM")} / ${escapeHtml(tag.description || "No description")}</small>
        </span>

        <strong class="module-status ${escapeHtml(String(tag.visibility || "RESTRICTED").toLowerCase())}">
          ${archived ? "ARCHIVED" : escapeHtml(tag.visibility || "RESTRICTED")}
        </strong>
      </button>
    `;
  }

  function bindTagRegistry(user) {
    const list = document.querySelector("#tag-record-list");
    const input = document.querySelector("#tag-registry-filter");

    document.querySelector("#tag-create-button")?.addEventListener("click", () => {
      window.WS_APP.pushModuleView?.(() => renderTagList(user));
      renderTagForm(user);
    });
    document.querySelector("#tag-default-button")?.addEventListener("click", () => {
      const saved = window.WS_APP.createDefaultTag?.();
      if (saved) {
        window.WS_APP.appendTerminalLogLine?.(`TAG CREATED / ${saved.name}`, { typed: true, speed: 8 });
        window.WS_APP.pushModuleView?.(() => renderTagList(user));
        renderTagRecord(user, saved.id);
      }
    });

    input?.addEventListener("input", () => {
      const query = normalizeQuery(input.value);
      const records = getVisibleTags(user).filter((tag) => {
        if (!query) return true;
        return normalizeQuery([
          tag.name,
          tag.type,
          tag.visibility,
          tag.riskWeight,
          tag.description,
          tag.gmNote
        ].join(" ")).includes(query);
      });

      if (list) list.innerHTML = renderTagRows(records);
      bindTagRowOpen(user);
    });

    bindTagRowOpen(user);
  }

  function bindTagRowOpen(user) {
    document.querySelectorAll(".tag-record-row[data-tag-id]").forEach((row) => {
      row.addEventListener("click", () => {
        window.WS_APP.pushModuleView?.(() => renderTagList(user));
        renderTagRecord(user, row.dataset.tagId);
      });
    });
  }

  function appendTagAudit(user, event = {}) {
    return window.WS_APP.appendAdminAuditEvent?.({
      category: "CONTENT_TAG",
      workspace: "RECORDS",
      ...event
    }, { user });
  }

  function renderTagRecord(user, tagId) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    const terminalGrid = document.querySelector(".terminal-grid");
    const tag = window.WS_APP.getTagById?.(tagId);

    if (!container || !tag) return;

    terminalGrid?.classList.add("is-card-open");
    window.WS_APP.currentModuleId = "tag-registry";

    if (status) {
      status.textContent = `TAG REGISTRY / ${String(tag.name || tag.id).toUpperCase()}`;
    }

    container.innerHTML = `
      <article class="module-detail tag-registry-view tag-record-view" data-tag-record="${escapeHtml(tag.id)}">
        <div class="module-detail-head">
          <div>
            <p class="kicker">TAG REGISTRY / RECORD</p>
            <h4>${escapeHtml(tag.name)}</h4>
          </div>

          <button class="module-back-button" type="button">Back</button>
        </div>

        <section class="tag-record-headline">
          <div class="tag-record-title">
            <span>${escapeHtml(tag.type || "SYSTEM")}</span>
            <div class="tag-chip-row">
              <i>${escapeHtml(tag.visibility || "RESTRICTED")}</i>
              <i>RISK ${escapeHtml(tag.riskWeight || 0)}</i>
            </div>
          </div>

          <div class="tag-record-actions">
            <button class="tag-record-action" type="button" id="tag-edit-button">Edit Tag</button>
            <button class="tag-record-action" type="button" id="tag-duplicate-button">Duplicate</button>
            ${tag.archived ? `
              <button class="tag-record-action" type="button" id="tag-restore-button">Restore</button>
            ` : `
              <button class="tag-record-action danger" type="button" id="tag-archive-button">Archive</button>
            `}
            <button class="tag-record-action danger hard" type="button" id="tag-delete-button">Hard Delete</button>
          </div>
        </section>

        <section class="system-article-body">
          ${renderTagLayer("DESCRIPTION", tag.description || "No description entered.")}
          ${tag.gmNote ? renderTagLayer("GM NOTE", tag.gmNote) : ""}
        </section>
      </article>
    `;

    window.WS_APP.bindModuleBackButton?.(user, () => renderTagList(user));
    document.querySelector("#tag-edit-button")?.addEventListener("click", () => {
      window.WS_APP.pushModuleView?.(() => renderTagRecord(user, tag.id));
      renderTagForm(user, tag.id);
    });
    document.querySelector("#tag-duplicate-button")?.addEventListener("click", () => {
      const saved = window.WS_APP.duplicateTag?.(tag.id);
      appendTagAudit(user, {
        action: saved ? "CONTENT_TAG_DUPLICATED" : "CONTENT_TAG_DUPLICATE_FAILED",
        target: saved?.id || tag.id,
        recordId: saved?.id || tag.id,
        summary: saved ? `Content tag ${tag.id} duplicated as ${saved.id}.` : `Content tag ${tag.id} duplicate failed.`,
        resultCode: saved ? "CONTENT_TAG_DUPLICATED" : "CONTENT_TAG_DUPLICATE_FAILED",
        status: saved ? "SUCCEEDED" : "FAILED",
        meta: { sourceTagId: tag.id }
      });
      if (saved) renderTagRecord(user, saved.id);
    });
    document.querySelector("#tag-archive-button")?.addEventListener("click", async () => {
      const confirmed = await confirmTagAction("ARCHIVE TAG", "Archive this tag record?", "Archive");
      if (!confirmed) return;
      const archived = window.WS_APP.archiveTag?.(tag.id);
      appendTagAudit(user, {
        action: archived ? "CONTENT_TAG_ARCHIVED" : "CONTENT_TAG_ARCHIVE_FAILED",
        target: tag.id,
        recordId: tag.id,
        summary: archived ? `Content tag ${tag.id} archived.` : `Content tag ${tag.id} archive failed.`,
        resultCode: archived ? "CONTENT_TAG_ARCHIVED" : "CONTENT_TAG_ARCHIVE_FAILED",
        status: archived ? "SUCCEEDED" : "FAILED"
      });
      renderTagList(user);
    });
    document.querySelector("#tag-restore-button")?.addEventListener("click", () => {
      const restored = window.WS_APP.restoreTag?.(tag.id);
      appendTagAudit(user, {
        action: restored ? "CONTENT_TAG_RESTORED" : "CONTENT_TAG_RESTORE_FAILED",
        target: tag.id,
        recordId: tag.id,
        summary: restored ? `Content tag ${tag.id} restored.` : `Content tag ${tag.id} restore failed.`,
        resultCode: restored ? "CONTENT_TAG_RESTORED" : "CONTENT_TAG_RESTORE_FAILED",
        status: restored ? "SUCCEEDED" : "FAILED"
      });
      renderTagRecord(user, tag.id);
    });
    document.querySelector("#tag-delete-button")?.addEventListener("click", async () => {
      const confirmed = await confirmTagAction("HARD DELETE TAG", "Hard delete this tag record? This cannot be undone.", "Hard Delete");
      if (!confirmed) return;
      const deleted = window.WS_APP.deleteTag?.(tag.id);
      appendTagAudit(user, {
        action: deleted ? "CONTENT_TAG_HARD_DELETED" : "CONTENT_TAG_HARD_DELETE_FAILED",
        target: tag.id,
        recordId: tag.id,
        summary: deleted ? `Content tag ${tag.id} hard deleted.` : `Content tag ${tag.id} hard delete failed.`,
        resultCode: deleted ? "CONTENT_TAG_HARD_DELETED" : "CONTENT_TAG_HARD_DELETE_FAILED",
        status: deleted ? "SUCCEEDED" : "FAILED"
      });
      renderTagList(user);
    });
  }

  function renderTagLayer(title, body) {
    return `
      <div class="entry-layer">
        <h5>${escapeHtml(title)}</h5>
        <p>${escapeHtml(body)}</p>
      </div>
    `;
  }

  function renderTagForm(user, tagId = null) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    const terminalGrid = document.querySelector(".terminal-grid");
    const tag = tagId ? window.WS_APP.getTagById?.(tagId) : null;
    const isEdit = Boolean(tag);
    const draft = tag || { name: "", type: "SYSTEM", visibility: "RESTRICTED", riskWeight: 0, description: "", gmNote: "" };

    if (!container) return;

    terminalGrid?.classList.add("is-card-open");

    if (status) {
      status.textContent = isEdit ? "TAG REGISTRY / EDIT RECORD" : "TAG REGISTRY / CREATE RECORD";
    }

    container.innerHTML = `
      <article class="module-detail tag-registry-view tag-form-view">
        <div class="module-detail-head">
          <div>
            <p class="kicker">TAG REGISTRY / ${isEdit ? "MUTATE" : "CREATE"}</p>
            <h4>${isEdit ? "Edit Tag" : "Create Tag"}</h4>
          </div>

          <button class="module-back-button" type="button">Back</button>
        </div>

        <form class="tag-form" id="tag-form" autocomplete="off">
          <div class="tag-form-message" id="tag-form-message"></div>
          <div class="tag-form-grid">
            ${renderInput("name", "Tag Name", draft.name || "")}
            ${renderSelect("type", "Type", draft.type || "SYSTEM", TAG_TYPES)}
            ${renderSelect("visibility", "Visibility", draft.visibility || "RESTRICTED", VISIBILITY_LEVELS)}
            ${renderInput("riskWeight", "Risk Weight", draft.riskWeight || 0, "", "number")}
            ${renderTextarea("description", "Description", draft.description || "", "is-wide", 5)}
            ${renderTextarea("gmNote", "GM Note", draft.gmNote || "", "is-wide", 5)}
          </div>

          <footer class="tag-form-actions">
            <button class="tag-form-cancel" type="button" id="tag-form-cancel">Cancel</button>
            <button class="tag-form-save" type="submit">Save Tag</button>
          </footer>
        </form>
      </article>
    `;

    window.WS_APP.bindModuleBackButton?.(user, () => {
      if (isEdit) renderTagRecord(user, tag.id);
      else renderTagList(user);
    });
    document.querySelector("#tag-form-cancel")?.addEventListener("click", () => {
      if (isEdit) renderTagRecord(user, tag.id);
      else renderTagList(user);
    });

    document.querySelector("#tag-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = collectTagForm(event.currentTarget);

      if (!payload.name) {
        setFormMessage("SAVE FAILED / TAG NAME REQUIRED");
        return;
      }

      const saved = isEdit
        ? window.WS_APP.updateTag?.(tag.id, payload)
        : window.WS_APP.createTag?.(payload);

      appendTagAudit(user, {
        action: saved ? (isEdit ? "CONTENT_TAG_UPDATED" : "CONTENT_TAG_CREATED") : (isEdit ? "CONTENT_TAG_UPDATE_FAILED" : "CONTENT_TAG_CREATE_FAILED"),
        target: saved?.id || tag?.id || payload.name || "CONTENT_TAG",
        recordId: saved?.id || tag?.id || "",
        summary: saved ? `Content tag ${saved.id} ${isEdit ? "updated" : "created"}.` : `Content tag ${isEdit ? "update" : "creation"} failed.`,
        resultCode: saved ? (isEdit ? "CONTENT_TAG_UPDATED" : "CONTENT_TAG_CREATED") : (isEdit ? "CONTENT_TAG_UPDATE_FAILED" : "CONTENT_TAG_CREATE_FAILED"),
        status: saved ? "SUCCEEDED" : "FAILED",
        meta: { name: payload.name, type: payload.type, visibility: payload.visibility }
      });
      if (saved) {
        window.WS_APP.appendTerminalLogLine?.(`TAG SAVED / ${saved.name}`, { typed: true, speed: 8 });
        renderTagRecord(user, saved.id);
      }
    });
  }

  function collectTagForm(form) {
    const data = new FormData(form);
    return {
      name: String(data.get("name") || "").trim().toUpperCase(),
      type: String(data.get("type") || "SYSTEM").trim().toUpperCase(),
      visibility: String(data.get("visibility") || "RESTRICTED").trim().toUpperCase(),
      riskWeight: Number(data.get("riskWeight") || 0),
      description: String(data.get("description") || "").trim(),
      gmNote: String(data.get("gmNote") || "").trim()
    };
  }

  function renderInput(name, label, value = "", extraClass = "", type = "text") {
    return `
      <label class="tag-form-field ${escapeHtml(extraClass)}">
        ${escapeHtml(label)}
        <input name="${escapeHtml(name)}" type="${escapeHtml(type)}" value="${escapeHtml(value)}" />
      </label>
    `;
  }

  function renderTextarea(name, label, value = "", extraClass = "", rows = 4) {
    return `
      <label class="tag-form-field ${escapeHtml(extraClass)}">
        ${escapeHtml(label)}
        <textarea name="${escapeHtml(name)}" rows="${escapeHtml(rows)}">${escapeHtml(value)}</textarea>
      </label>
    `;
  }

  function renderSelect(name, label, value, options) {
    return `
      <label class="tag-form-field">
        ${escapeHtml(label)}
        <select name="${escapeHtml(name)}">
          ${options.map((option) => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function confirmTagAction(title, message, confirmLabel) {
    return window.WS_APP.confirmAction?.({
      title,
      message,
      confirmLabel,
      cancelLabel: "Cancel",
      tone: "danger"
    }) ?? Promise.resolve(false);
  }

  function bindBackButton(user) {
    const button = document.querySelector(".module-back-button");
    if (window.WS_APP.bindModuleBackButton) {
      window.WS_APP.bindModuleBackButton(user, () => window.WS_APP.renderModules?.(user));
      return;
    }
    button?.addEventListener("click", () => window.WS_APP.renderModules?.(user));
  }

  function setFormMessage(message) {
    const node = document.querySelector("#tag-form-message");
    if (node) node.textContent = message;
  }

  function normalizeQuery(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
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
})();
