window.WS_APP = window.WS_APP || {};

(function initAdminControlCenter() {
  const originalRenderModules = window.WS_APP.renderModules;
  if (typeof originalRenderModules !== "function") return;
  if (window.WS_APP.__adminControlCenterPatched) return;

  window.WS_APP.__adminControlCenterPatched = true;
  window.WS_APP.renderPlayerAccessPanel = originalRenderModules;

  function createAdminCommandEnvelope(user, sourceCommand, reason, target = "") {
    const actorId = String(user?.login || user?.id || window.WS_APP.currentUser?.login || window.WS_APP.currentUser?.id || "").trim();
    const actorRole = String(user?.role || window.WS_APP.currentUser?.role || "").trim().toUpperCase();
    const normalizedReason = String(reason || "").trim();
    if (!actorId) return { ok: false, resultCode: "ACTOR_REQUIRED", message: "Admin actor is required." };
    if (actorRole !== "ADMIN") return { ok: false, resultCode: "ADMIN_ROLE_REQUIRED", message: "Admin role is required." };
    if (!normalizedReason) return { ok: false, resultCode: "REASON_REQUIRED", message: "Operator note is required." };
    const uuid = window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return {
      ok: true,
      actor: {
        actorId,
        actorRole,
        source: "ADMIN_CONTROL"
      },
      reason: normalizedReason,
      sourceCommand: String(sourceCommand || "ADMIN_COMMAND").trim().toUpperCase(),
      idempotencyKey: `admin:${String(sourceCommand || "command").toLowerCase()}:${String(target || "system").toLowerCase()}:${uuid}`
    };
  }

  function getAdminCommandResultCode(result, fallback = "ADMIN_COMMAND_FAILED") {
    return String(result?.resultCode || result?.error?.code || result?.errorCode || result?.reason || fallback).trim().toUpperCase();
  }

  function promptAdminQuickActionNote(label = "status change") {
    return String(window.prompt?.(`Operator note required for ${label}:`, "") || "").trim();
  }

  function executeAdminSubscriptionStatusCommand(subscriptionContractId, status, options = {}) {
    const api = window.WS_APP.SubscriptionAPI;
    const normalizedStatus = String(status || "PENDING").trim().toUpperCase();
    if (!api) return { ok: false, errorCode: "SUBSCRIPTION_API_UNAVAILABLE" };
    if (normalizedStatus === "SUSPENDED") {
      return api.suspendSubscriptionContract?.(subscriptionContractId, options.reason || "ADMIN_STATUS_OVERRIDE", options);
    }
    if (normalizedStatus === "CANCELLED") {
      return api.cancelSubscriptionContract?.(subscriptionContractId, options.reason || "ADMIN_STATUS_OVERRIDE", {
        ...options,
        waiveCharge: true
      });
    }
    if (["PAID", "PENDING", "OVERDUE"].includes(normalizedStatus)) {
      return api.setSubscriptionBillingStatus?.(subscriptionContractId, normalizedStatus, options);
    }
    return { ok: false, errorCode: "SUBSCRIPTION_BILLING_STATUS_INVALID" };
  }

  const ADMIN_WORKSPACES = window.WS_APP.AdminWorkspaceRegistry?.list?.() || [];

  const CITIZEN_SCOPED_WORKSPACE_IDS = new Set([
    "citizens",
    "subscriptions",
    "service",
    "billing",
    "system-requests"
  ]);

  window.WS_APP.renderModules = function renderModules(user) {
    if (user?.role === "admin") {
      clearAdminRouteState({ preserveWorkspace: true, preserveCitizen: true });
      renderAdminControlCenter(user, window.WS_APP.adminActiveWorkspace || "dashboard");
      return;
    }

    clearAdminRouteState({ clearWorkspace: true, clearCitizen: true, clearTerminalPanel: true });
    setAdminShellState(false);
    setModulePanelHeader("SYSTEM MODULES / USER SCOPE", "Access Panel");
    originalRenderModules(user);
  };

  window.WS_APP.renderAdminControlCenter = renderAdminControlCenter;

  function getAdminWorkspaceById(workspaceId = "dashboard") {
    const safeWorkspaceId = ADMIN_WORKSPACES.some((item) => item.id === workspaceId) ? workspaceId : "dashboard";
    return {
      safeWorkspaceId,
      workspace: ADMIN_WORKSPACES.find((item) => item.id === safeWorkspaceId) || ADMIN_WORKSPACES[0]
    };
  }

  function renderAdminCommandBand(user, workspace) {
    return `
      <div>
        <p class="kicker" data-admin-shell-eyebrow>${escapeHtml(workspace.eyebrow)}</p>
        <h4 data-admin-shell-title>${escapeHtml(workspace.title)}</h4>
      </div>
      <div class="admin-command-band__meta">
        <span>OPERATOR <b>${escapeHtml(user.displayName || user.login || "ADMIN")}</b></span>
        <span>ROLE <b>${escapeHtml(String(user.role || "admin").toUpperCase())}</b></span>
        <span>MODE <b>CONTROL</b></span>
      </div>
    `;
  }

  function renderAdminWorkspaceLoading(workspace) {
    return `
      ${renderWorkspaceHead(workspace)}
      <section class="admin-workspace-panel admin-runtime-loading" role="status">
        <p class="kicker">ADMIN / WORKSPACE RUNTIME</p>
        <h5>Loading ${escapeHtml(workspace.title)}</h5>
        <p>Required domain tools are being loaded for this workspace.</p>
      </section>
    `;
  }

  function renderAdminWorkspaceLoadFailure(workspace, description = {}) {
    return `
      ${renderWorkspaceHead(workspace)}
      <section class="admin-workspace-panel admin-runtime-loading is-error" role="alert">
        <p class="kicker">ADMIN / WORKSPACE RUNTIME</p>
        <h5>${escapeHtml(workspace.title)} unavailable</h5>
        <p>${escapeHtml(description.errorMessage || "Workspace bundle could not be loaded.")}</p>
        <div class="admin-form-actions">
          <button class="admin-inline-button" type="button" data-admin-workspace-retry="${escapeHtml(workspace.id)}">Retry Workspace Load</button>
        </div>
      </section>
    `;
  }

  function renderAdminLoadingInspector(workspace, message = "Workspace tools are loading.") {
    return `
      <div class="admin-inspector-block">
        <p class="kicker">ADMIN / INSPECTOR</p>
        <h5>${escapeHtml(workspace.title)}</h5>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function renderAdminShell(user, workspace, workspaceHtml, inspectorHtml, options = {}) {
    const container = document.querySelector("#module-grid");
    if (!container) return null;
    const shellRuntime = window.WS_APP.AdminShellRuntime;
    const headerHtml = renderAdminCommandBand(user, workspace);
    const navigationHtml = ADMIN_WORKSPACES.map((item) => renderAdminNavButton(item, workspace.id)).join("");

    if (shellRuntime?.render) {
      return shellRuntime.render({
        container,
        workspaceId: workspace.id,
        headerHtml,
        navigationHtml,
        workspaceHtml,
        inspectorHtml,
        busy: options.busy === true,
        announcement: options.announcement || ""
      });
    }

    container.innerHTML = `
      <section class="admin-control-center" data-admin-workspace="${escapeHtml(workspace.id)}">
        <header class="admin-command-band" data-admin-shell-header>${headerHtml}</header>
        <nav class="admin-navigation-rail" data-admin-shell-navigation aria-label="Admin Navigation">${navigationHtml}</nav>
        <main class="admin-workspace" data-admin-shell-workspace aria-label="Admin Workspace">${workspaceHtml}</main>
        <aside class="admin-inspector-panel" data-admin-shell-inspector aria-label="Admin Inspector">${inspectorHtml}</aside>
      </section>
    `;
    return { ok: true, mounted: true, workspaceChanged: true };
  }

  function renderAdminControlCenter(user, workspaceId = "dashboard") {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    if (!container) return;
    if (String(user?.role || "").trim().toLowerCase() !== "admin") {
      clearAdminRouteState({ clearWorkspace: true, clearCitizen: true, clearTerminalPanel: true });
      setAdminShellState(false);
      return;
    }

    const { safeWorkspaceId, workspace } = getAdminWorkspaceById(workspaceId);
    const previousWorkspaceId = String(window.WS_APP.adminActiveWorkspace || "");
    const workspaceChanged = previousWorkspaceId !== safeWorkspaceId;
    window.WS_APP.adminWorkspaceRenderSequence = Number(window.WS_APP.adminWorkspaceRenderSequence || 0) + 1;
    const renderSequence = window.WS_APP.adminWorkspaceRenderSequence;

    if (workspaceChanged) {
      window.WS_APP.resetModuleHistory?.();
      window.WS_APP.initModuleHomeButtons?.();
      window.WS_APP.currentModuleId = null;
      window.WS_APP.currentCitizenCardsSelectedId = null;
    }
    window.WS_APP.adminActiveWorkspace = safeWorkspaceId;
    clearAdminRouteState({ preserveWorkspace: true, preserveCitizen: true });

    setAdminShellState(true);
    setModulePanelHeader("WATCH & SECURE / ADMIN CONTROL CENTER", "Operator Console");
    if (status) status.textContent = `${ADMIN_WORKSPACES.length} ADMIN WORKSPACES`;

    const loader = window.WS_APP.AdminWorkspaceLoader;
    const description = loader?.describe?.(safeWorkspaceId) || { status: "READY", bundleId: "" };

    if (description.status === "FAILED") {
      renderAdminShell(
        user,
        workspace,
        renderAdminWorkspaceLoadFailure(workspace, description),
        renderAdminLoadingInspector(workspace, "Workspace load failed. Retry from the workspace panel."),
        { busy: false, announcement: `${workspace.title} workspace failed to load.` }
      );
      bindAdminControlCenterActions(container, user);
      return;
    }

    if (loader && !loader.isReady(safeWorkspaceId)) {
      renderAdminShell(
        user,
        workspace,
        renderAdminWorkspaceLoading(workspace),
        renderAdminLoadingInspector(workspace),
        { busy: true, announcement: `Loading ${workspace.title} workspace.` }
      );
      bindAdminControlCenterActions(container, user);
      loader.ensure(safeWorkspaceId)
        .then(() => {
          if (Number(window.WS_APP.adminWorkspaceRenderSequence || 0) !== renderSequence) return;
          renderAdminControlCenter(user, safeWorkspaceId);
        })
        .catch((error) => {
          console.warn("W&S admin workspace load failed.", safeWorkspaceId, error);
          if (Number(window.WS_APP.adminWorkspaceRenderSequence || 0) !== renderSequence) return;
          renderAdminControlCenter(user, safeWorkspaceId);
        });
      return;
    }

    renderAdminShell(
      user,
      workspace,
      renderAdminWorkspace(workspace, user),
      renderAdminInspector(workspace, user),
      { busy: false, announcement: `${workspace.title} workspace ready.` }
    );
    bindAdminControlCenterActions(container, user);
  }

  function renderAdminNavButton(item, activeId) {
    return `
      <button class="admin-nav-item ${item.id === activeId ? "is-active" : ""}" type="button" data-admin-workspace-target="${escapeHtml(item.id)}">
        <span>${escapeHtml(item.title)}</span>
        <small>${escapeHtml(item.eyebrow.replace("ADMIN / ", ""))}</small>
      </button>
    `;
  }

  function renderAdminWorkspace(workspace, user) {
    const registry = window.WS_APP.AdminWorkspaceRegistry;
    const renderer = registry?.getRenderer?.(workspace.id);
    if (typeof renderer !== "function") {
      return renderWorkspaceRendererUnavailable(workspace);
    }
    try {
      return renderer(workspace, user);
    } catch (error) {
      console.warn("W&S admin workspace renderer failed.", workspace.id, error);
      return renderWorkspaceRendererUnavailable(workspace, error?.message || "Workspace renderer failed.");
    }
  }

  function renderWorkspaceFallback(workspace) {
    return `
      ${renderWorkspaceHead(workspace)}
      <div class="admin-action-grid">
        ${workspace.modules.map((moduleId) => renderAdminModuleAction(moduleId, workspace)).join("")}
      </div>
    `;
  }

  function renderWorkspaceRendererUnavailable(workspace, message = "Workspace renderer is not registered.") {
    return `
      ${renderWorkspaceHead(workspace)}
      <section class="admin-workspace-panel admin-runtime-loading is-error" role="alert">
        <p class="kicker">ADMIN / WORKSPACE RENDERER</p>
        <h5>${escapeHtml(workspace.title)} renderer unavailable</h5>
        <p>${escapeHtml(message)}</p>
      </section>
    `;
  }

  function renderWorkspaceHead(workspace, actions = "") {
    return `
      <section class="admin-workspace-head">
        <div>
          <p class="kicker">${escapeHtml(workspace.eyebrow)}</p>
          <p>${escapeHtml(workspace.description)}</p>
        </div>
        ${actions ? `<div class="admin-workspace-actions">${actions}</div>` : ""}
      </section>
    `;
  }
  function getAdminAccessTagsForManager() {
    const records = window.WS_APP.getAccessTags?.({ includeArchived: true }) || window.APP_DATA?.accessTags || [];
    return (Array.isArray(records) ? records : []).slice().sort((a, b) => {
      const rankA = a.rank === null || a.rank === undefined ? 999 : Number(a.rank);
      const rankB = b.rank === null || b.rank === undefined ? 999 : Number(b.rank);
      return rankA - rankB || String(a.type || "").localeCompare(String(b.type || ""), "pl") || String(a.id || "").localeCompare(String(b.id || ""), "pl");
    });
  }

  function getAdminContentTagsForManager() {
    const records = window.WS_APP.getTags?.({ includeArchived: true }) || window.APP_DATA?.tags || [];
    return (Array.isArray(records) ? records : []).slice().sort((a, b) => {
      const archived = Number(a.archived === true) - Number(b.archived === true);
      if (archived) return archived;
      return String(a.name || a.id || "").localeCompare(String(b.name || b.id || ""), "pl");
    });
  }

  function getAdminTagManagerState() {
    const current = window.WS_APP.adminTagManagerState || {};
    const family = ["access", "content"].includes(String(current.family || "")) ? current.family : "access";
    const mode = ["list", "create", "edit"].includes(String(current.mode || "")) ? current.mode : "list";
    const recordId = String(current.recordId || "");
    window.WS_APP.adminTagManagerState = { family, mode, recordId };
    return window.WS_APP.adminTagManagerState;
  }

  function setAdminTagManagerState(patch = {}) {
    const current = getAdminTagManagerState();
    window.WS_APP.adminTagManagerState = {
      ...current,
      ...patch
    };
    return getAdminTagManagerState();
  }

  function renderAdminTagManager(accessTags, contentTags) {
    const state = getAdminTagManagerState();
    return `
      <section class="admin-workspace-panel admin-tag-manager-panel">
        <div class="admin-panel-headline admin-tag-manager-headline">
          <div>
            <p class="kicker">ADMIN / TAG MANAGER</p>
            <h5>${state.family === "content" ? "Content / Record Tags" : "System / Control Tags"}</h5>
          </div>
          <div class="admin-tag-manager-actions">
            <button class="admin-inline-button" type="button" data-admin-create-access-tag>Create Access Tag</button>
            <button class="admin-inline-button" type="button" data-admin-create-content-tag>Create Content Tag</button>
          </div>
        </div>
        <div class="admin-tag-family-tabs" role="tablist" aria-label="Admin Tag Families">
          ${renderAdminTagFamilyTab("access", "System / Control", accessTags.length, state.family)}
          ${renderAdminTagFamilyTab("content", "Content / Record", contentTags.length, state.family)}
        </div>
        ${state.mode === "create" || state.mode === "edit"
          ? renderAdminTagForm(state, accessTags, contentTags)
          : renderAdminTagFamilyList(state.family, accessTags, contentTags)}
      </section>
    `;
  }

  function renderAdminTagFamilyTab(family, label, count, activeFamily) {
    return `
      <button class="admin-tag-family-tab ${family === activeFamily ? "is-active" : ""}" type="button" data-admin-tag-family="${escapeHtml(family)}">
        <span>${escapeHtml(label)}</span>
        <b>${escapeHtml(String(count))}</b>
      </button>
    `;
  }

  function renderAdminTagFamilyList(family, accessTags, contentTags) {
    if (family === "content") return renderAdminContentTagList(contentTags);
    return renderAdminAccessTagList(accessTags);
  }

  function renderAdminAccessTagList(accessTags) {
    const rows = accessTags.map((tag) => {
      const id = String(tag.id || tag.label || "ACCESS").trim();
      const usage = getAdminAccessTagUsageCount(id);
      const action = tag.locked
        ? `<span class="admin-table-actions admin-table-actions--locked">${renderStateBadge("LOCKED", "locked")}</span>`
        : `
          <span class="admin-table-actions">
            <button class="admin-mini-action" type="button" data-admin-edit-access-tag="${escapeHtml(id)}">Edit</button>
            ${tag.archived
              ? `<button class="admin-mini-action" type="button" data-admin-restore-access-tag="${escapeHtml(id)}">Restore</button>`
              : `<button class="admin-mini-action" type="button" data-admin-archive-access-tag="${escapeHtml(id)}">Deactivate</button>`}
          </span>
        `;

      return [
        `<strong>${escapeHtml(id)}</strong><small>${escapeHtml(tag.label || id)}</small>`,
        renderTagPills([tag.type || "custom"], "system"),
        `<strong>${escapeHtml(String(usage))}</strong><small>assignments / records</small>`,
        `${tag.archived ? renderStateBadge("INACTIVE", "warning") : renderStateBadge("ACTIVE", "active")} ${tag.adminOnly ? renderStateBadge("ADMIN", "locked") : ""}`,
        action
      ];
    });

    return `
      <div class="admin-tag-manager-copy">
        <p><b>SYSTEM / CONTROL TAGS</b> organize access and system state. This foundation manages Access/Clearance and Organization/Compartment tags only.</p>
      </div>
      ${renderAdminDataList(rows, ["Tag", "Type", "Usage", "State", "Action"], "No access tags defined.")}
    `;
  }

  function renderAdminContentTagList(contentTags) {
    const rows = contentTags.map((tag) => {
      const id = String(tag.id || tag.name || "content-tag").trim();
      const name = String(tag.name || tag.label || id).trim();
      const usage = getAdminContentTagUsageCount(tag);
      return [
        `<strong>${escapeHtml(name)}</strong><small>${escapeHtml(id)}</small>`,
        renderTagPills([tag.type || "CONTENT"], "content"),
        renderTagPills([tag.visibility || "RESTRICTED"], "access"),
        `<strong>${escapeHtml(String(usage))}</strong><small>record matches</small>`,
        tag.archived ? renderStateBadge("INACTIVE", "warning") : renderStateBadge("ACTIVE", "active"),
        `
          <span class="admin-table-actions">
            <button class="admin-mini-action" type="button" data-admin-edit-content-tag="${escapeHtml(id)}">Edit</button>
            ${tag.archived
              ? `<button class="admin-mini-action" type="button" data-admin-restore-content-tag="${escapeHtml(id)}">Restore</button>`
              : `<button class="admin-mini-action" type="button" data-admin-archive-content-tag="${escapeHtml(id)}">Deactivate</button>`}
          </span>
        `
      ];
    });

    return `
      <div class="admin-tag-manager-copy">
        <p><b>CONTENT / RECORD TAGS</b> describe record content. They do not grant access, restrict visibility, affect payments, service income, subscriptions or settlement.</p>
      </div>
      ${renderAdminDataList(rows, ["Tag", "Type", "Visibility", "Usage", "State", "Action"], "No content tags defined.")}
    `;
  }

  function getAdminAccessMatrixState(accessTags = getAdminAccessTagsForManager()) {
    const current = window.WS_APP.adminAccessMatrixState || {};
    const available = Array.isArray(accessTags) ? accessTags : [];
    const fallbackId = String(available.find((tag) => !tag.archived)?.id || available[0]?.id || "");
    const selectedTagId = available.some((tag) => String(tag.id || "") === String(current.selectedTagId || ""))
      ? String(current.selectedTagId || "")
      : fallbackId;
    const feedback = current.feedback && typeof current.feedback === "object"
      ? { tone: current.feedback.tone === "error" ? "error" : "info", message: String(current.feedback.message || "") }
      : null;
    window.WS_APP.adminAccessMatrixState = { selectedTagId, feedback };
    return window.WS_APP.adminAccessMatrixState;
  }

  function setAdminAccessMatrixState(patch = {}, accessTags = getAdminAccessTagsForManager()) {
    const current = getAdminAccessMatrixState(accessTags);
    window.WS_APP.adminAccessMatrixState = {
      ...current,
      ...patch
    };
    return getAdminAccessMatrixState(accessTags);
  }

  function renderAdminAccessMatrixEditor(accessTags) {
    const state = getAdminAccessMatrixState(accessTags);
    const selectedTag = accessTags.find((tag) => String(tag.id || "") === state.selectedTagId) || accessTags[0] || null;
    const selectedId = String(selectedTag?.id || "");
    const feedback = state.feedback?.message
      ? `<p class="admin-panel-note ${state.feedback.tone === "error" ? "is-error" : "is-info"}">${escapeHtml(state.feedback.message)}</p>`
      : "";

    if (!selectedTag) {
      return `
        <section class="admin-workspace-panel admin-tag-matrix-panel">
          <div class="admin-panel-headline">
            <div>
              <p class="kicker">ADMIN / ACCESS MATRIX</p>
              <h5>Access Matrix Editor</h5>
            </div>
          </div>
          <div class="admin-empty-state">No access tags available.</div>
        </section>
      `;
    }

    const relationOptions = accessTags
      .filter((tag) => String(tag.id || "") !== selectedId)
      .map((tag) => ({
        id: String(tag.id || ""),
        label: String(tag.label || tag.id || ""),
        type: String(tag.type || "custom"),
        archived: tag.archived === true
      }));

    return `
      <section class="admin-workspace-panel admin-tag-matrix-panel">
        <div class="admin-panel-headline admin-tag-manager-headline">
          <div>
            <p class="kicker">ADMIN / ACCESS MATRIX</p>
            <h5>Access Matrix Editor</h5>
          </div>
          <div class="admin-tag-manager-actions">
            <button class="admin-inline-button" type="button" data-admin-edit-access-tag="${escapeHtml(selectedId)}">Open Tag Form</button>
          </div>
        </div>
        <div class="admin-tag-matrix-toolbar">
          <label class="admin-tag-matrix-picker">
            <span>Matrix Tag</span>
            <select data-admin-access-matrix-target>
              ${accessTags.map((tag) => {
                const id = String(tag.id || "");
                const meta = `${String(tag.type || "custom").toUpperCase()}${tag.locked ? " / LOCKED" : ""}${tag.archived ? " / INACTIVE" : ""}`;
                return `<option value="${escapeHtml(id)}" ${id === selectedId ? "selected" : ""}>${escapeHtml(id)} / ${escapeHtml(meta)}</option>`;
              }).join("")}
            </select>
          </label>
          <div class="admin-tag-matrix-summary">
            <span>${renderTagPills([selectedTag.type || "custom"], "system")}</span>
            <span>${selectedTag.locked ? renderStateBadge("LOCKED", "locked") : renderStateBadge("EDITABLE", "active")}</span>
            <span>${selectedTag.archived ? renderStateBadge("INACTIVE", "warning") : renderStateBadge("ACTIVE", "active")}</span>
          </div>
        </div>
        <div class="admin-tag-manager-copy">
          <p><b>ACCESS MATRIX EDITOR</b> manages hierarchy and relation logic for Access/Clearance tags. Use <b>Rank</b> for order, <b>Includes</b> for inherited visibility and <b>Exclusive With</b> for same-level exclusions or incompatible scopes.</p>
        </div>
        ${feedback}
        <form class="admin-tag-form" data-admin-access-matrix-form data-admin-tag-id="${escapeHtml(selectedId)}">
          <div class="admin-tag-form__head">
            <div>
              <p class="kicker">MATRIX / ${escapeHtml(selectedId)}</p>
              <h5>${escapeHtml(selectedTag.label || selectedId)}</h5>
            </div>
            ${selectedTag.locked ? renderStateBadge("LOCKED SOURCE", "locked") : renderStateBadge("LIVE EDIT", "active")}
          </div>
          <div class="admin-form-grid">
            <label>ID<input value="${escapeHtml(selectedId)}" readonly /></label>
            <label>Type<input value="${escapeHtml(String(selectedTag.type || "custom").toUpperCase())}" readonly /></label>
            <label>Rank<input name="rank" type="number" step="1" value="${selectedTag.rank === null || selectedTag.rank === undefined ? "" : escapeHtml(String(selectedTag.rank))}" ${selectedTag.locked ? "disabled" : ""} /></label>
            <label class="admin-form-checkbox"><input class="ui-select-control" type="checkbox" name="requiresExplicitAssignment" ${selectedTag.requiresExplicitAssignment ? "checked" : ""} ${selectedTag.locked ? "disabled" : ""} /> Explicit assignment</label>
          </div>
          ${renderAdminAccessRelationGrid(selectedTag, relationOptions)}
          <p class="admin-panel-note">Relation rows are mutually exclusive: each target tag can be <b>None</b>, <b>Included</b> or <b>Exclusive</b>. Validation blocks self-relations, impossible overlaps and unknown tag IDs. Locked source tags remain visible but are not writable here.</p>
          <div class="admin-form-actions">
            <button class="admin-inline-button" type="submit" ${selectedTag.locked ? "disabled" : ""}>Save Matrix</button>
            <button class="admin-inline-button" type="button" data-admin-reset-access-matrix>Reset</button>
          </div>
        </form>
      </section>
    `;
  }

  function renderAdminAccessRelationGrid(selectedTag, relationOptions = []) {
    const selectedId = String(selectedTag?.id || "");
    const includes = new Set((selectedTag?.includes || []).map((item) => String(item || "").trim().toUpperCase()).filter(Boolean));
    const exclusiveWith = new Set((selectedTag?.exclusiveWith || []).map((item) => String(item || "").trim().toUpperCase()).filter(Boolean));
    const disabled = selectedTag?.locked ? "disabled" : "";

    if (!relationOptions.length) {
      return `<div class="admin-empty-state">No relation targets available for ${escapeHtml(selectedId)}.</div>`;
    }

    return `
      <div class="admin-relation-grid" role="group" aria-label="Access Matrix Relations">
        <div class="admin-relation-grid__head">
          <span>Target Tag</span>
          <span>None</span>
          <span>Include</span>
          <span>Exclusive</span>
        </div>
        ${relationOptions.map((option) => {
          const id = String(option.id || "").trim().toUpperCase();
          const current = includes.has(id) ? "include" : exclusiveWith.has(id) ? "exclusive" : "none";
          const name = `relation::${id}`;
          return `
            <div class="admin-relation-grid__row ${option.archived ? "is-archived" : ""}">
              <div class="admin-relation-grid__target">
                <strong>${escapeHtml(id)}</strong>
                <small>${escapeHtml(option.label || id)} / ${escapeHtml(String(option.type || "custom").toUpperCase())}${option.archived ? " / INACTIVE" : ""}</small>
              </div>
              ${["none", "include", "exclusive"].map((value) => `
                <label class="admin-relation-choice ${current === value ? "is-selected" : ""}">
                  <input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(value)}" ${current === value ? "checked" : ""} ${disabled} />
                  <span>${escapeHtml(value)}</span>
                </label>
              `).join("")}
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function validateAdminAccessMatrixPayload(tag, payload, accessTags) {
    const errors = [];
    if (!tag) errors.push("Access tag not found.");
    if (tag?.locked) errors.push("Locked access tags cannot be edited from Admin Control Center.");

    const currentId = String(tag?.id || "").trim().toUpperCase();
    const known = new Set((Array.isArray(accessTags) ? accessTags : []).map((item) => String(item.id || "").trim().toUpperCase()).filter(Boolean));
    const includes = Array.isArray(payload.includes) ? payload.includes : [];
    const exclusiveWith = Array.isArray(payload.exclusiveWith) ? payload.exclusiveWith : [];
    const overlap = includes.filter((item) => exclusiveWith.includes(item));
    const unknown = [...includes, ...exclusiveWith].filter((item) => !known.has(item));

    if (includes.includes(currentId) || exclusiveWith.includes(currentId)) errors.push("A tag cannot reference itself.");
    if (overlap.length) errors.push(`Includes and Exclusive With overlap: ${overlap.join(", ")}.`);
    if (unknown.length) errors.push(`Unknown relation tags: ${unknown.join(", ")}.`);
    if (payload.rank !== null && !Number.isFinite(payload.rank)) errors.push("Rank must be a number or left empty.");

    return errors;
  }

  function renderAdminTagForm(state, accessTags, contentTags) {
    if (state.family === "content") return renderAdminContentTagForm(state, contentTags);
    return renderAdminAccessTagForm(state, accessTags);
  }

  function renderAdminAccessTagForm(state, accessTags) {
    const editing = state.mode === "edit";
    const tag = editing ? accessTags.find((item) => String(item.id || "") === state.recordId) : null;
    if (editing && !tag) return renderAdminTagFormMissing("Access tag not found.");
    if (tag?.locked) return renderAdminTagFormMissing("Locked access tags are visible here but editable only through source data.");

    const current = tag || {
      id: "",
      label: "",
      type: "custom",
      description: "",
      requiresExplicitAssignment: true,
      adminOnly: false,
      archived: false
    };
    const types = ["classification", "organization", "compartment", "case", "system", "special", "custom"];

    return `
      <form class="admin-tag-form" data-admin-access-tag-form data-admin-tag-mode="${escapeHtml(state.mode)}" data-admin-tag-id="${escapeHtml(current.id || "")}">
        <div class="admin-tag-form__head">
          <div>
            <p class="kicker">SYSTEM / CONTROL TAG</p>
            <h5>${editing ? "Edit Access Tag" : "Create Access Tag"}</h5>
          </div>
          <button class="admin-inline-button" type="button" data-admin-cancel-tag-form>Cancel</button>
        </div>
        <div class="admin-form-grid">
          <label>ID<input name="id" value="${escapeHtml(current.id || "")}" ${editing ? "readonly" : ""} required /></label>
          <label>Label<input name="label" value="${escapeHtml(current.label || "")}" required /></label>
          <label>Type<select name="type">${types.map((type) => `<option value="${escapeHtml(type)}" ${type === current.type ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}</select></label>
          <label>State<select name="state"><option value="active" ${current.archived ? "" : "selected"}>ACTIVE</option><option value="inactive" ${current.archived ? "selected" : ""}>INACTIVE</option></select></label>
          <label class="admin-form-checkbox"><input class="ui-select-control" type="checkbox" name="requiresExplicitAssignment" ${current.requiresExplicitAssignment ? "checked" : ""} /> Explicit assignment</label>
          <label class="admin-form-checkbox"><input class="ui-select-control" type="checkbox" name="adminOnly" ${current.adminOnly ? "checked" : ""} /> Admin only</label>
          <label class="admin-form-field--wide">Description<textarea name="description" rows="3">${escapeHtml(current.description || "")}</textarea></label>
        </div>
        <p class="admin-panel-note">General tag metadata is edited here. Rank, includes, exclusive relations and explicit-assignment logic now live in the Access Matrix Editor below.</p>
        <div class="admin-form-actions">
          <button class="admin-inline-button" type="submit">${editing ? "Save Access Tag" : "Create Access Tag"}</button>
        </div>
      </form>
    `;
  }

  function renderAdminContentTagForm(state, contentTags) {
    const editing = state.mode === "edit";
    const tag = editing ? contentTags.find((item) => String(item.id || "") === state.recordId) : null;
    if (editing && !tag) return renderAdminTagFormMissing("Content tag not found.");

    const current = tag || {
      id: "",
      name: "",
      type: "SYSTEM",
      visibility: "RESTRICTED",
      description: "",
      gmNote: "",
      archived: false
    };
    const types = ["SYSTEM", "RISK", "MEDICAL", "NETWORK", "ECONOMIC", "SOCIAL", "CASE", "LORE", "GM"];
    const visibility = ["PUBLIC", "CIVIL", "RESTRICTED", "BLACK", "GM"];

    return `
      <form class="admin-tag-form" data-admin-content-tag-form data-admin-tag-mode="${escapeHtml(state.mode)}" data-admin-tag-id="${escapeHtml(current.id || "")}">
        <div class="admin-tag-form__head">
          <div>
            <p class="kicker">CONTENT / RECORD TAG</p>
            <h5>${editing ? "Edit Content Tag" : "Create Content Tag"}</h5>
          </div>
          <button class="admin-inline-button" type="button" data-admin-cancel-tag-form>Cancel</button>
        </div>
        <div class="admin-form-grid">
          <label>Name<input name="name" value="${escapeHtml(current.name || "")}" required /></label>
          <label>Type<select name="type">${types.map((type) => `<option value="${escapeHtml(type)}" ${type === current.type ? "selected" : ""}>${escapeHtml(type)}</option>`).join("")}</select></label>
          <label>Visibility<select name="visibility">${visibility.map((level) => `<option value="${escapeHtml(level)}" ${level === current.visibility ? "selected" : ""}>${escapeHtml(level)}</option>`).join("")}</select></label>
          <label>State<select name="state"><option value="active" ${current.archived ? "" : "selected"}>ACTIVE</option><option value="inactive" ${current.archived ? "selected" : ""}>INACTIVE</option></select></label>
          <label class="admin-form-field--wide">Description<textarea name="description" rows="3">${escapeHtml(current.description || "")}</textarea></label>
          <label class="admin-form-field--wide">GM Note<textarea name="gmNote" rows="3">${escapeHtml(current.gmNote || "")}</textarea></label>
        </div>
        <p class="admin-panel-note">Content tags are descriptive metadata only. They must not drive access, settlement, payment, subscription or service logic.</p>
        <div class="admin-form-actions">
          <button class="admin-inline-button" type="submit">${editing ? "Save Content Tag" : "Create Content Tag"}</button>
        </div>
      </form>
    `;
  }

  function renderAdminTagFormMissing(message) {
    return `
      <div class="admin-empty-state">
        ${escapeHtml(message)}
        <br />
        <button class="admin-inline-button" type="button" data-admin-cancel-tag-form>Back to Tag Manager</button>
      </div>
    `;
  }

  function getAdminAccessTagUsageCount(tagId) {
    const normalized = String(tagId || "").trim().toUpperCase();
    if (!normalized) return 0;
    let count = 0;

    (window.WS_APP.getUsers?.({ includeDisabled: true }) || []).forEach((user) => {
      if ((user.accessTags || []).map((tag) => String(tag).toUpperCase()).includes(normalized)) count += 1;
    });

    getAdminGenericRecordPool().forEach((record) => {
      const tags = [record.accessTags, record.requiredAccessTags, record.clearance]
        .flatMap((value) => Array.isArray(value) ? value : String(value || "").split(/[,\n]/))
        .map((tag) => String(tag || "").trim().toUpperCase())
        .filter(Boolean);
      if (tags.includes(normalized)) count += 1;
    });

    return count;
  }

  function getAdminContentTagUsageCount(tag = {}) {
    const tokens = [tag.id, tag.name, tag.label]
      .map((value) => String(value || "").trim().toUpperCase())
      .filter(Boolean);
    if (!tokens.length) return 0;

    let count = 0;
    getAdminGenericRecordPool().forEach((record) => {
      const tags = [record.tags, record.contentTags, record.recordTags, record.caseTags]
        .flatMap((value) => Array.isArray(value) ? value : String(value || "").split(/[,\n]/))
        .map((value) => String(value || "").trim().toUpperCase())
        .filter(Boolean);
      if (tags.some((value) => tokens.includes(value))) count += 1;
    });
    return count;
  }

  function getAdminGenericRecordPool() {
    const pool = [];
    const pushRecords = (records) => {
      if (Array.isArray(records)) pool.push(...records.filter(Boolean));
    };

    pushRecords(window.WS_APP.getEntries?.({ includeArchived: true }));
    pushRecords(window.WS_APP.getSystemRecords?.({ includeArchived: true }));
    pushRecords(window.WS_APP.getCaseFiles?.({ includeArchived: true }));
    pushRecords(window.WS_APP.getAddresses?.({ includeArchived: true }));
    pushRecords(window.WS_APP.getCitizens?.({ includeArchived: true }));
    pushRecords(window.APP_DATA?.entries);
    pushRecords(window.APP_DATA?.systemRecords);
    pushRecords(window.APP_DATA?.caseFiles);
    pushRecords(window.APP_DATA?.addresses);
    pushRecords(window.APP_DATA?.citizens);
    return pool;
  }
  function renderAdminServiceDomainBoundaryPanel(citizen = null) {
    if (!citizen) return "";
    const orders = (window.WS_APP.getCitizenServiceOrders?.(citizen.id) || []).slice().sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
    const rows = orders.slice(0, 12).map((order) => {
      const status = String(order.status || "DRAFT").toUpperCase();
      const descriptor = window.WS_APP.getServiceOrderLifecycleDescriptor?.(order) || { allowedTransitions: [], terminal: false };
      const operation = String(order.serviceType || order.operationType || order.serviceDefinitionId || "SERVICE OPERATION").toUpperCase();
      return [
        `<strong>${escapeHtml(operation)}</strong><small>${escapeHtml(order.serviceOrderId || "")}</small>`,
        renderStateBadge(status, descriptor.terminal ? "muted" : getServiceStateTone(status)),
        `<span>${escapeHtml(order.providerId || "—")}</span><small>${escapeHtml(order.serviceOfferId || "")}</small>`,
        `<span>${escapeHtml((descriptor.allowedTransitions || []).join(" / ") || "TERMINAL")}</span><small>REV ${escapeHtml(order.revision || 1)}</small>`,
        escapeHtml(order.updatedAt || order.createdAt || "—")
      ];
    });

    return `
      <section class="admin-workspace-panel">
        <div class="admin-panel-headline">
          <p class="kicker">ADMIN / SERVICE BRIDGE ORDERS</p>
          <h5>Transactional Provider Operations</h5>
        </div>
        <p class="admin-panel-note">Quote, authorization, schedule, execution and result records owned by Service Bridge. They are not Citizen Service Log entries and are not changed by the Service Log lifecycle controls below.</p>
        ${renderAdminDataList(rows, ["Order", "Status", "Provider", "Allowed Next", "Updated"], "No Service Bridge orders for selected citizen.")}
      </section>
    `;
  }

  function getAdminServiceToolState() {
    const current = window.WS_APP.adminServiceMarketToolState || {};
    const feedback = current.feedback && typeof current.feedback === "object"
      ? { tone: current.feedback.tone === "error" ? "error" : "info", message: String(current.feedback.message || "") }
      : null;
    const selectedOffers = current.selectedOffers && typeof current.selectedOffers === "object"
      ? { ...current.selectedOffers }
      : {};
    window.WS_APP.adminServiceMarketToolState = { ...current, feedback, selectedOffers };
    return window.WS_APP.adminServiceMarketToolState;
  }

  function setAdminServiceToolFeedback(message = "", tone = "info") {
    window.WS_APP.adminServiceMarketToolState = {
      ...(window.WS_APP.adminServiceMarketToolState || {}),
      feedback: message ? { message: String(message), tone: tone === "error" ? "error" : "info" } : null
    };
  }

  function setAdminServiceToolSelectedOffer(citizenId = "", offerKey = "") {
    const state = getAdminServiceToolState();
    const safeCitizenId = String(citizenId || "").trim();
    if (!safeCitizenId) return;
    state.selectedOffers = state.selectedOffers && typeof state.selectedOffers === "object" ? state.selectedOffers : {};
    state.selectedOffers[safeCitizenId] = String(offerKey || "").trim();
    window.WS_APP.adminServiceMarketToolState = state;
  }

  function getAdminServiceToolSelectedOfferKey(citizenId = "") {
    const state = getAdminServiceToolState();
    return String(state.selectedOffers?.[String(citizenId || "").trim()] || "").trim();
  }

  function adminNormalizeServiceKey(value = "") {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function getAdminServiceMarketDatabase() {
    return window.APP_DATA?.serviceDatabase || {};
  }

  function getAdminCurrentSettlementWeek() {
    return String(window.ServiceOfferGenerator?.getSettlementWeekKey?.() || window.WS_APP.getSettlementPeriodEndIso?.() || window.WS_APP.SETTLEMENT_PERIOD_END_ISO || "").trim();
  }

  function getAdminServiceManualOffers() {
    return window.WS_APP.getServiceOffers?.() || [];
  }

  function getAdminServiceGeneratedOffers(citizen = {}) {
    if (!citizen || typeof window.ServiceOfferGenerator?.generateWeeklyOffers !== "function") return [];
    return window.ServiceOfferGenerator.generateWeeklyOffers({
      character: citizen,
      citizen,
      database: getAdminServiceMarketDatabase(),
      manualOffers: getAdminServiceManualOffers(),
      settlementWeek: getAdminCurrentSettlementWeek()
    }) || [];
  }

  function getAdminServiceOfferStateMap(citizen = {}) {
    return window.WS_APP.getCitizenServiceOfferStates?.(citizen) || citizen.serviceOfferStates || {};
  }

  function getAdminServiceOfferKey(offer = {}) {
    return String(offer.generatedOfferId || offer.offerId || offer.id || offer.templateId || "").trim();
  }

  function getAdminServiceSourceLabel(value = "") {
    const key = adminNormalizeServiceKey(value || "GENERATED_WEEKLY");
    const labels = {
      GENERATED_WEEKLY: "Generated Weekly",
      MANUAL_ADMIN: "Manual Admin",
      SYSTEM_MANDATORY: "System Mandatory",
      STORY_EVENT: "Story Event",
      BLACK_EVENT: "Black Event"
    };
    return labels[key] || key.replace(/_/g, " ");
  }

  function getAdminOfferStateTone(status = "") {
    const key = adminNormalizeServiceKey(status || "AVAILABLE");
    if (["AVAILABLE", "ACTIVE", "COMPLETED"].includes(key)) return "active";
    if (["LOCKED", "EXPIRED", "FAILED", "TERMINATED"].includes(key)) return "warning";
    if (["REJECTED", "HIDDEN"].includes(key)) return "locked";
    if (["ARCHIVED"].includes(key)) return "muted";
    return "neutral";
  }

  function getAdminServiceEmployerLabel(employerId = "") {
    const id = String(employerId || "").trim();
    const database = getAdminServiceMarketDatabase();
    const employer = (database.serviceEmployers || []).find((item) => String(item.id || "") === id);
    return employer?.label || id || "LOCAL SERVICE REGISTRY";
  }

  function getAdminServiceEmployerOptions(citizen = {}) {
    const names = new Map();
    const add = (id, label) => {
      const safeId = String(id || label || "").trim();
      if (!safeId) return;
      names.set(safeId, String(label || safeId).trim());
    };
    (getAdminServiceMarketDatabase().serviceEmployers || []).forEach((employer) => add(employer.id, employer.label));
    getAdminServiceGeneratedOffers(citizen).forEach((offer) => add(offer.employerId || offer.provider, offer.provider || offer.employerId));
    (citizen.serviceLog || []).forEach((record) => add(record.employerId || record.provider, record.provider || record.employerId));
    return Array.from(names.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }

  function renderAdminServiceMarketTools(selectedGroup, user) {
    const citizen = selectedGroup?.citizen || null;
    const state = getAdminServiceToolState();
    if (!citizen) {
      return `
        <section class="admin-workspace-panel admin-service-market-panel">
          <div class="admin-panel-headline">
            <p class="kicker">ADMIN / SERVICE MARKET</p>
            <h5>Service Market Control</h5>
          </div>
          <div class="admin-empty-state">No citizen selected for Service Market control.</div>
        </section>
      `;
    }

    const offers = getAdminServiceGeneratedOffers(citizen);
    const stateMap = getAdminServiceOfferStateMap(citizen);
    const stateEntries = Object.values(stateMap || {}).filter(Boolean);
    const serviceLog = window.WS_APP.getCitizenServiceLog?.(citizen.id) || citizen.serviceLog || [];
    const pendingPayments = window.WS_APP.getCitizenPendingServicePayments?.(citizen) || [];
    const activeRecords = serviceLog.filter((entry) => adminNormalizeServiceKey(entry.status) === "ACTIVE");
    const demandProfile = window.ServiceOfferGenerator?.getWeeklyDemandProfile?.(getAdminServiceMarketDatabase(), getAdminCurrentSettlementWeek()) || [];
    const feedback = state.feedback
      ? `<p class="admin-panel-note ${state.feedback.tone === "error" ? "is-error" : "is-info"}">${escapeHtml(state.feedback.message)}</p>`
      : "";

    return `
      <section class="admin-workspace-panel admin-service-market-panel">
        <div class="admin-panel-headline admin-tag-manager-headline">
          <div>
            <p class="kicker">ADMIN / SERVICE MARKET</p>
            <h5>Weekly Offer Control</h5>
          </div>
          <div class="admin-tag-manager-actions">
            <button class="admin-inline-button" type="button" data-admin-service-regenerate="${escapeHtml(citizen.id)}">Regenerate Current Week</button>
            <button class="admin-inline-button" type="button" data-admin-open-module="service">Open Player Service View</button>
          </div>
        </div>
        ${feedback}
        <div class="admin-service-market-summary">
          ${renderAdminServiceMarketMetric("Settlement", getAdminCurrentSettlementWeek() || "UNKNOWN", "current week key")}
          ${renderAdminServiceMarketMetric("Offers", offers.length, "generated + manual visible")}
          ${renderAdminServiceMarketMetric("States", stateEntries.length, "stored lifecycle entries")}
          ${renderAdminServiceMarketMetric("Active", activeRecords.length, "active service records")}
          ${renderAdminServiceMarketMetric("Pending Pay", pendingPayments.length, "completion-paid services")}
          ${renderAdminServiceMarketMetric("Demand", demandProfile.length, "active weekly modifiers")}
        </div>
        <div class="admin-service-market-grid">
          ${renderAdminSelectedServiceOfferPanel(citizen, offers)}
          ${renderAdminServiceGeneratedOffersPanel(citizen, offers)}
          ${renderAdminServiceManualOfferPanel(citizen)}
          ${renderAdminServiceLifecycleDiagnosticsPanel(citizen, stateEntries)}
          ${renderAdminServiceReputationPanel(citizen)}
          ${renderAdminServiceDemandPanel(demandProfile)}
        </div>
      </section>
    `;
  }

  function renderAdminServiceMarketMetric(label, value, note) {
    return `
      <article class="admin-service-market-metric">
        <span>${escapeHtml(label)}</span>
        <b>${escapeHtml(value)}</b>
        <small>${escapeHtml(note)}</small>
      </article>
    `;
  }

  function getAdminServiceOfferLinkKeySet(offer = {}) {
    return new Set([
      offer.generatedOfferId,
      offer.offerId,
      offer.id,
      offer.templateId
    ].map((value) => String(value || "").trim()).filter(Boolean));
  }

  function adminServiceRecordMatchesOffer(record = {}, offer = {}) {
    const keys = getAdminServiceOfferLinkKeySet(offer);
    if (!keys.size) return false;
    return [
      record.generatedOfferId,
      record.offerId,
      record.id,
      record.templateId
    ].some((value) => keys.has(String(value || "").trim()));
  }

  function adminIncomeRecordMatchesOffer(record = {}, offer = {}, serviceRecords = []) {
    const keys = getAdminServiceOfferLinkKeySet(offer);
    const serviceIds = new Set(serviceRecords.map((entry) => String(entry.id || "").trim()).filter(Boolean));
    return [
      record.generatedOfferId,
      record.offerId,
      record.templateId
    ].some((value) => keys.has(String(value || "").trim()))
      || (record.serviceRecordId && serviceIds.has(String(record.serviceRecordId || "").trim()));
  }

  function getAdminServiceOfferLinkedRecords(citizen = {}, offer = {}) {
    const serviceLog = window.WS_APP.getCitizenServiceLog?.(citizen.id) || citizen.serviceLog || [];
    const serviceRecords = (Array.isArray(serviceLog) ? serviceLog : []).filter((record) => adminServiceRecordMatchesOffer(record, offer));
    const activeServices = serviceRecords.filter((record) => adminNormalizeServiceKey(record.status) === "ACTIVE");
    const completedServices = serviceRecords.filter((record) => adminNormalizeServiceKey(record.status) === "COMPLETED");
    const income = Array.isArray(citizen.income) ? citizen.income : [];
    const incomeSources = income.filter((record) => adminIncomeRecordMatchesOffer(record, offer, serviceRecords));
    const pendingPayments = (window.WS_APP.getCitizenPendingServicePayments?.(citizen) || [])
      .filter((record) => adminIncomeRecordMatchesOffer(record, offer, serviceRecords));
    const serviceStates = Object.values(getAdminServiceOfferStateMap(citizen) || {})
      .filter((state) => adminServiceRecordMatchesOffer(state, offer));
    return { serviceRecords, activeServices, completedServices, incomeSources, pendingPayments, serviceStates };
  }

  function getAdminServiceLinkHealth(linked = {}) {
    const notes = [];
    if (linked.activeServices?.length) {
      notes.push({ label: "ACTIVE SERVICE", tone: "active" });
      if (!linked.incomeSources?.length && !linked.pendingPayments?.length) notes.push({ label: "NO PAYMENT LINK", tone: "warning" });
    }
    if (linked.completedServices?.length) {
      notes.push({ label: "WORK RECORD", tone: "active" });
      const unpaid = linked.pendingPayments?.some((payment) => adminNormalizeServiceKey(payment.paymentStatus) === "READY_FOR_SETTLEMENT");
      if (unpaid) notes.push({ label: "READY FOR SETTLEMENT", tone: "warning" });
    }
    if (!linked.serviceRecords?.length && !linked.incomeSources?.length && !linked.pendingPayments?.length) {
      notes.push({ label: "NO LINKED RECORDS", tone: "muted" });
    }
    if (linked.incomeSources?.length) notes.push({ label: "INCOME LINK", tone: "active" });
    if (linked.pendingPayments?.length) notes.push({ label: "PENDING PAYMENT", tone: "warning" });
    return notes;
  }

  function renderAdminServiceOfferLinkedInspector(citizen = {}, offer = {}) {
    const linked = getAdminServiceOfferLinkedRecords(citizen, offer);
    const health = getAdminServiceLinkHealth(linked);
    const recordRows = linked.serviceRecords.slice(0, 6).map((record) => [
      `<strong>${escapeHtml(record.title || offer.title || "SERVICE RECORD")}</strong><small>${escapeHtml(record.id || "")}</small>`,
      renderStateBadge(record.status || "STATE", getAdminOfferStateTone(record.status)),
      escapeHtml(record.form || record.typeLabel || "—"),
      `${adminFormatCredits(record.amount || record.payment || 0)}<small>${escapeHtml(record.completedAt || record.acceptedAt || "")}</small>`
    ]);
    const incomeRows = [...linked.incomeSources, ...linked.pendingPayments].slice(0, 6).map((record) => [
      `<strong>${escapeHtml(record.title || offer.title || "PAYMENT")}</strong><small>${escapeHtml(record.id || record.serviceRecordId || "")}</small>`,
      renderStateBadge(record.paymentStatus || record.status || "STATE", adminNormalizeServiceKey(record.paymentStatus || record.status).includes("PENDING") ? "warning" : "active"),
      escapeHtml(record.serviceForm || record.cycle || record.payoutMode || "—"),
      adminFormatCredits(record.amount || record.payment || 0)
    ]);

    return `
      <section class="admin-service-linked-inspector">
        <div class="admin-panel-headline">
          <p class="kicker">LINKED RECORDS</p>
          <h6>Offer → Service → Income Trace</h6>
        </div>
        <div class="admin-service-link-health">
          ${health.map((item) => renderStateBadge(item.label, item.tone)).join("")}
        </div>
        <div class="admin-service-linked-grid">
          <div>
            <p class="kicker">SERVICE RECORDS</p>
            ${renderAdminDataList(recordRows, ["Record", "State", "Form", "Payment"], "No linked service records.")}
          </div>
          <div>
            <p class="kicker">INCOME / PENDING PAYMENT</p>
            ${renderAdminDataList(incomeRows, ["Payment", "State", "Mode", "Amount"], "No linked income or pending payment records.")}
          </div>
        </div>
      </section>
    `;
  }

  function renderAdminSelectedServiceOfferPanel(citizen = {}, offers = []) {
    const citizenId = String(citizen.id || "").trim();
    const selectedKey = getAdminServiceToolSelectedOfferKey(citizenId);
    const selectedOffer = selectedKey
      ? offers.find((offer) => getAdminServiceOfferKey(offer) === selectedKey)
      : null;

    if (!selectedOffer) {
      return `
        <section class="admin-service-market-card admin-service-selected-offer-card">
          <div class="admin-panel-headline">
            <p class="kicker">SELECTED SERVICE OFFER</p>
            <h6>No Offer Selected</h6>
          </div>
          <p class="admin-panel-note">Select an offer from Weekly Generated Offers before editing its lifecycle override.</p>
        </section>
      `;
    }

    const key = getAdminServiceOfferKey(selectedOffer);
    const status = adminNormalizeServiceKey(selectedOffer.status || "AVAILABLE");
    const metaRows = [
      ["Offer", selectedOffer.title || "SERVICE OFFER"],
      ["Provider", selectedOffer.provider || getAdminServiceEmployerLabel(selectedOffer.employerId)],
      ["State", status],
      ["Source", getAdminServiceSourceLabel(selectedOffer.sourceType)],
      ["Payment", adminFormatCredits(selectedOffer.amount || selectedOffer.payment || 0)],
      ["Settlement", selectedOffer.settlementWeek || getAdminCurrentSettlementWeek() || "—"]
    ];

    return `
      <section class="admin-service-market-card admin-service-selected-offer-card">
        <div class="admin-panel-headline">
          <p class="kicker">SELECTED SERVICE OFFER</p>
          <h6>Editable Offer Override</h6>
        </div>
        <dl class="admin-snapshot-list admin-service-selected-offer-summary">
          ${metaRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
        ${renderAdminServiceOfferLinkedInspector(citizen, selectedOffer)}
        ${renderAdminServiceOfferStateForm(citizenId, selectedOffer, key, { mode: "selected" })}
      </section>
    `;
  }

  function renderAdminServiceGeneratedOffersPanel(citizen = {}, offers = []) {
    const citizenId = String(citizen.id || "").trim();
    const selectedKey = getAdminServiceToolSelectedOfferKey(citizenId);
    const rows = offers.slice(0, 18).map((offer) => {
      const key = getAdminServiceOfferKey(offer);
      const status = adminNormalizeServiceKey(offer.status || "AVAILABLE");
      const isSelected = key && key === selectedKey;
      return [
        `<strong>${escapeHtml(offer.title || "SERVICE OFFER")}</strong><small>${escapeHtml(offer.provider || "LOCAL SERVICE REGISTRY")}</small>`,
        renderTagPills([getAdminServiceSourceLabel(offer.sourceType), offer.typeLabel || offer.form || "SERVICE"], "system"),
        renderStateBadge(status, getAdminOfferStateTone(status)),
        `${adminFormatCredits(offer.amount || offer.payment || 0)}<small>${escapeHtml(offer.settlementWeek || getAdminCurrentSettlementWeek() || "")}</small>`,
        `<div class="admin-service-offer-row-actions ${isSelected ? "is-selected-offer" : ""}">
          <button class="admin-inline-button" type="button" data-admin-service-select-offer="${escapeHtml(key)}" data-admin-citizen-id="${escapeHtml(citizenId)}">${isSelected ? "Selected" : "Select"}</button>
          ${renderAdminServiceOfferStateForm(citizenId, offer, key, { mode: "compact" })}
        </div>`
      ];
    });
    return `
      <section class="admin-service-market-card admin-service-offers-admin-card">
        <div class="admin-panel-headline">
          <p class="kicker">WEEKLY GENERATED OFFERS</p>
          <h6>Offer State Overrides</h6>
        </div>
        ${renderAdminDataList(rows, ["Offer", "Source", "Status", "Payment", "Action"], "No generated offers for selected citizen.")}
      </section>
    `;
  }

  function renderAdminServiceOfferStateForm(citizenId, offer = {}, key = "", options = {}) {
    const status = adminNormalizeServiceKey(offer.status || "AVAILABLE");
    const statuses = ["AVAILABLE", "LOCKED", "HIDDEN", "REJECTED", "EXPIRED"];
    const modeClass = options.mode === "selected" ? " is-selected-editor" : options.mode === "compact" ? " is-compact-editor" : "";
    return `
      <form class="admin-service-offer-state-form${modeClass}" data-admin-service-offer-state-form data-admin-citizen-id="${escapeHtml(citizenId)}" data-admin-offer-key="${escapeHtml(key)}">
        <input type="hidden" name="offerId" value="${escapeHtml(offer.id || key)}" />
        <input type="hidden" name="templateId" value="${escapeHtml(offer.templateId || "")}" />
        <input type="hidden" name="employerId" value="${escapeHtml(offer.employerId || "")}" />
        <input type="hidden" name="employerType" value="${escapeHtml(offer.employerType || offer.providerClass || "")}" />
        <input type="hidden" name="categoryId" value="${escapeHtml(offer.categoryId || "")}" />
        <input type="hidden" name="workCharacterId" value="${escapeHtml(offer.workCharacterId || "")}" />
        <input type="hidden" name="settlementWeek" value="${escapeHtml(offer.settlementWeek || getAdminCurrentSettlementWeek() || "")}" />
        <input type="hidden" name="sourceType" value="${escapeHtml(offer.sourceType || "GENERATED_WEEKLY")}" />
        <input type="hidden" name="title" value="${escapeHtml(offer.title || "")}" />
        <input type="hidden" name="provider" value="${escapeHtml(offer.provider || "")}" />
        <select name="status" aria-label="Offer status override">
          ${statuses.map((item) => `<option value="${escapeHtml(item)}" ${item === status ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
        </select>
        <input name="reason" type="text" placeholder="Reason" value="Admin override" required />
        <button class="admin-inline-button" type="submit">Apply</button>
      </form>
    `;
  }

  function renderAdminServiceManualOfferPanel(citizen = {}) {
    const database = getAdminServiceMarketDatabase();
    const employers = getAdminServiceEmployerOptions(citizen);
    const categories = database.serviceCategories || [];
    const characters = database.serviceWorkCharacters || [];
    return `
      <section class="admin-service-market-card admin-service-manual-offer-card">
        <div class="admin-panel-headline">
          <p class="kicker">MANUAL SERVICE OFFER</p>
          <h6>Add Admin Offer</h6>
        </div>
        <form class="admin-service-manual-offer-form" data-admin-service-manual-offer-form data-admin-citizen-id="${escapeHtml(citizen.id || "")}">
          <input type="hidden" name="targetCitizenId" value="${escapeHtml(citizen.id || "")}" />
          <label>Title<input name="title" required placeholder="Manual service title" /></label>
          <label>Provider
            <select name="provider">
              ${employers.map(([id, label]) => `<option value="${escapeHtml(label)}" data-employer-id="${escapeHtml(id)}">${escapeHtml(label)}</option>`).join("")}
            </select>
          </label>
          <label>Employer Type
            <select name="employerType">
              ${["SYSTEM", "PRIVATE", "BLACK"].map((item) => `<option value="${item}">${item}</option>`).join("")}
            </select>
          </label>
          <label>Source Type
            <select name="sourceType">
              ${["MANUAL_ADMIN", "SYSTEM_MANDATORY", "STORY_EVENT", "BLACK_EVENT"].map((item) => `<option value="${item}">${item}</option>`).join("")}
            </select>
          </label>
          <label>Form
            <select name="form">
              ${["COMMISSION", "CONTRACT", "AGREEMENT"].map((item) => `<option value="${item}">${item}</option>`).join("")}
            </select>
          </label>
          <label>Category
            <select name="categoryId">
              ${categories.map((item) => `<option value="${escapeHtml(item.id || "")}">${escapeHtml(item.label || item.id || "CATEGORY")}</option>`).join("")}
            </select>
          </label>
          <label>Work Character
            <select name="workCharacterId">
              ${characters.map((item) => `<option value="${escapeHtml(item.id || "")}">${escapeHtml(item.label || item.id || "WORK")}</option>`).join("")}
            </select>
          </label>
          <label>Payment<input name="amount" type="number" min="0" step="500" required placeholder="8000" /></label>
          <label>Due Date<input name="dueDate" type="date" /></label>
          <label>Duration Weeks<input name="durationWeeks" type="number" min="0" step="1" value="0" /></label>
          <label class="admin-form-field--wide">Details<textarea name="details" rows="3" placeholder="Manual assignment scope / reason."></textarea></label>
          <div class="admin-form-actions admin-form-field--wide">
            <button class="admin-inline-button" type="submit">Add Manual Offer</button>
          </div>
        </form>
      </section>
    `;
  }

  function renderAdminServiceLifecycleDiagnosticsPanel(citizen = {}, stateEntries = []) {
    const rows = stateEntries.slice(0, 18).map((state) => [
      `<strong>${escapeHtml(state.title || state.generatedOfferId || "OFFER STATE")}</strong><small>${escapeHtml(state.provider || state.generatedOfferId || "")}</small>`,
      renderStateBadge(state.status || "STATE", getAdminOfferStateTone(state.status)),
      escapeHtml(getAdminServiceSourceLabel(state.sourceType)),
      escapeHtml(state.serviceRecordId || state.incomeSourceId || "—"),
      escapeHtml(state.reason || "—")
    ]);
    return `
      <section class="admin-service-market-card admin-service-lifecycle-card">
        <div class="admin-panel-headline">
          <p class="kicker">LIFECYCLE DIAGNOSTICS</p>
          <h6>Persisted Offer Lifecycle States</h6>
        </div>
        ${renderAdminDataList(rows, ["Offer", "State", "Source", "Links", "Reason"], "No persisted service offer states.")}
      </section>
    `;
  }

  function renderAdminServiceReputationPanel(citizen = {}) {
    const reputation = window.WS_APP.getCitizenById?.(citizen.id)?.serviceReputation || citizen.serviceReputation || citizen.serviceEmployerReputation || {};
    const entries = Object.entries(reputation || {});
    const rows = entries.map(([employerId, entry]) => {
      const score = typeof entry === "number" ? entry : Number(entry?.score || 0);
      return [
        `<strong>${escapeHtml(getAdminServiceEmployerLabel(employerId))}</strong><small>${escapeHtml(employerId)}</small>`,
        renderStateBadge(String(score), score > 0 ? "active" : score < 0 ? "warning" : "muted"),
        escapeHtml(entry?.updatedAt || "—"),
        escapeHtml(entry?.updatedBy || "—")
      ];
    });
    const employers = getAdminServiceEmployerOptions(citizen);
    return `
      <section class="admin-service-market-card admin-service-reputation-card">
        <div class="admin-panel-headline">
          <p class="kicker">EMPLOYER REPUTATION</p>
          <h6>Reputation Override</h6>
        </div>
        <form class="admin-service-reputation-form" data-admin-service-reputation-form data-admin-citizen-id="${escapeHtml(citizen.id || "")}">
          <label>Employer
            <select name="employerId" required>
              ${employers.map(([id, label]) => `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`).join("")}
            </select>
          </label>
          <label>Mode
            <select name="mode"><option value="SET">SET</option><option value="CHANGE">CHANGE</option></select>
          </label>
          <label>Value<input name="value" type="number" min="-10" max="10" step="1" value="0" required /></label>
          <label class="admin-form-field--wide">Reason / Admin Note<textarea name="note" rows="2" required></textarea></label>
          <button class="admin-inline-button" type="submit">Apply Reputation</button>
        </form>
        ${renderAdminDataList(rows, ["Employer", "Score", "Updated", "By"], "No employer reputation records.")}
      </section>
    `;
  }

  function renderAdminServiceDemandPanel(demandProfile = []) {
    const rows = demandProfile.map((modifier) => [
      `<strong>${escapeHtml(modifier.label || modifier.id || "DEMAND")}</strong><small>${escapeHtml(modifier.id || "")}</small>`,
      `${escapeHtml(String(modifier.spawnMultiplier || 1))}x`,
      `${escapeHtml(String(modifier.paymentMultiplier || 1))}x`,
      renderTagPills([...(modifier.categoryIds || []), ...(modifier.employerIds || []), ...(modifier.tags || [])].slice(0, 4), "system")
    ]);
    return `
      <section class="admin-service-market-card admin-service-demand-card">
        <div class="admin-panel-headline">
          <p class="kicker">WEEKLY DEMAND MODIFIERS</p>
          <h6>Current Demand Profile</h6>
        </div>
        ${renderAdminDataList(rows, ["Modifier", "Spawn", "Payment", "Targets"], "No weekly demand modifiers active for current week.")}
      </section>
    `;
  }

  function renderAdminInboxGeneratorButton() {
    return `
      <span class="admin-inline-control admin-inbox-generator-control">
        <select data-admin-inbox-notification-mode aria-label="Inbox notification generator mode">
          <option value="PLAYER">Player-visible</option>
          <option value="INTERNAL">Internal/admin</option>
        </select>
        <button class="admin-inline-button" type="button" data-admin-generate-inbox-notifications>Generate Inbox Notifications</button>
      </span>
    `;
  }
  function getAdminEconomyState() {
    const current = window.WS_APP.adminEconomyToolState || {};
    const feedback = current.feedback && typeof current.feedback === "object"
      ? { tone: current.feedback.tone === "error" ? "error" : "info", message: String(current.feedback.message || "") }
      : null;
    window.WS_APP.adminEconomyToolState = { feedback };
    return window.WS_APP.adminEconomyToolState;
  }

  function setAdminEconomyState(patch = {}) {
    const current = getAdminEconomyState();
    window.WS_APP.adminEconomyToolState = { ...current, ...patch };
    return window.WS_APP.adminEconomyToolState;
  }


  function parseAdminTransferPartyValue(value = "") {
    const raw = String(value || "").trim();
    const separator = raw.indexOf("::");
    if (separator < 1) return { partyType: "", partyId: "" };
    const partyType = raw.slice(0, separator).trim().toUpperCase();
    const partyId = decodeURIComponent(raw.slice(separator + 2)).trim();
    return { partyType, partyId };
  }

  function getAdminTransferPartyOptions() {
    const accounts = typeof window.WS_APP.getBillingTransferAccounts === "function"
      ? window.WS_APP.getBillingTransferAccounts()
      : [];
    const organizations = accounts.filter((account) => account.partyType === "ORGANIZATION");
    const citizens = accounts.filter((account) => account.partyType === "CITIZEN");
    return [...organizations, ...citizens].map((account) => ({
      value: `${account.partyType}::${encodeURIComponent(account.partyId)}`,
      partyType: account.partyType,
      partyId: account.partyId,
      label: account.label || account.partyId,
      credits: adminParseCredits(account.credits || 0),
      debt: adminParseCredits(account.debt || 0),
      creditOverdraftAllowed: account.creditOverdraftAllowed === true
    }));
  }

  function renderAdminTransferPartyOptions(options = [], selectedValue = "") {
    return options.map((option) => {
      const typeLabel = option.partyType === "ORGANIZATION" ? "ORG" : "CITIZEN";
      const ledger = `credits ${adminFormatCredits(option.credits)} / debt ${adminFormatCredits(option.debt)}`;
      return `<option value="${escapeHtml(option.value)}" ${option.value === selectedValue ? "selected" : ""}>${escapeHtml(typeLabel)} — ${escapeHtml(option.label)} — ${escapeHtml(ledger)}</option>`;
    }).join("");
  }

  function getAdminTransferPartyLabel(party = {}) {
    const account = window.WS_APP.getBillingTransferAccount?.(party.partyType, party.partyId);
    return account?.label || party.partyId || "UNKNOWN";
  }

  function renderAdminTransferHistory() {
    const records = window.WS_APP.getAdminBillingTransfers?.() || [];
    if (!records.length) return `<div class="admin-empty-state">No canonical Billing transfers recorded.</div>`;
    return `
      <div class="admin-record-list admin-transfer-history">
        ${records.slice(0, 8).map((record) => {
          const source = getAdminTransferPartyLabel(record.sourceParty || {});
          const target = getAdminTransferPartyLabel(record.targetParty || {});
          return `
            <article class="admin-record-card">
              <div class="admin-record-card__head">
                <div>
                  <p class="kicker">${escapeHtml(record.asset || "TRANSFER")} / ${escapeHtml(record.status || "UNKNOWN")}</p>
                  <h5>${escapeHtml(source)} → ${escapeHtml(target)}</h5>
                </div>
                ${renderStateBadge(record.status || "UNKNOWN", record.status === "CAPTURED" ? "active" : record.status === "REVERSED" ? "muted" : "warning")}
              </div>
              <div class="admin-record-card__meta">
                <span>${escapeHtml(adminFormatCredits(record.amount || 0))}</span>
                <span>${escapeHtml(record.transferId || "")}</span>
                <span>${escapeHtml(record.createdAt || "")}</span>
              </div>
              <p>${escapeHtml(record.reason || "No operator note.")}</p>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderAdminTransferTools(group, user) {
    const citizen = group?.citizen || null;
    const options = getAdminTransferPartyOptions();
    const targetValue = citizen ? `CITIZEN::${encodeURIComponent(citizen.id)}` : options.find((option) => option.partyType === "CITIZEN")?.value || "";
    const sourceValue = options.find((option) => option.partyType === "ORGANIZATION")?.value
      || options.find((option) => option.value !== targetValue)?.value
      || "";
    const disabled = options.length < 2 || typeof window.WS_APP.executeAdminBillingTransfer !== "function";

    return `
      <section class="admin-workspace-panel admin-transfer-tools-panel">
        <div class="admin-panel-headline admin-tag-manager-headline">
          <div>
            <p class="kicker">ADMIN / BILLING TRANSFER</p>
            <h5>Atomic Account Transfer</h5>
          </div>
        </div>
        <form class="admin-economy-form admin-transfer-form" data-admin-transfer-form>
          <label>Asset
            <select name="asset" required>
              <option value="CREDITS">Credits</option>
              <option value="DEBT">Debt liability</option>
            </select>
          </label>
          <label>Source Account
            <select name="sourceParty" required ${disabled ? "disabled" : ""}>
              ${renderAdminTransferPartyOptions(options, sourceValue)}
            </select>
          </label>
          <label>Target Account
            <select name="targetParty" required ${disabled ? "disabled" : ""}>
              ${renderAdminTransferPartyOptions(options, targetValue)}
            </select>
          </label>
          <label>Amount
            <input name="amount" type="text" inputmode="numeric" placeholder="500" required ${disabled ? "disabled" : ""} />
          </label>
          <label>Visibility
            <select name="visibility" required ${disabled ? "disabled" : ""}>
              <option value="INGAME_TRANSFER">In-game transfer</option>
              <option value="ADMIN_ONLY">Admin only</option>
            </select>
          </label>
          <label class="admin-form-field--wide">Reason / Transfer Note
            <textarea name="reason" rows="3" placeholder="Mission payout, account settlement, liability assignment…" required ${disabled ? "disabled" : ""}></textarea>
          </label>
          <div class="admin-form-actions admin-form-field--wide">
            <button class="admin-inline-button" type="submit" ${disabled ? "disabled" : ""}>Execute Atomic Transfer</button>
          </div>
        </form>
        <p class="admin-panel-note">Credits create a paired debit and credit. Debt moves liability from the source account to the target account. Organization treasury accounts are canonical Billing ledger accounts and may carry a negative Credits balance; the debit remains visible instead of being simulated as a sender label.</p>
        <div class="admin-transfer-ledger">
          <p class="kicker">RECENT TRANSFERS</p>
          ${renderAdminTransferHistory()}
        </div>
      </section>
    `;
  }

  function emitAdminBillingTransferNotification(party, direction, transfer, transaction, counterpartyLabel, visibility) {
    if (String(visibility || "").toUpperCase() !== "INGAME_TRANSFER") return;
    if (party?.partyType !== "CITIZEN") return;
    const asset = String(transfer?.asset || "CREDITS").toUpperCase();
    const snapshot = transaction?.accountSnapshot || {};
    const effect = transaction?.accountEffect || {};
    const delta = asset === "DEBT" ? adminParseCredits(effect.debtDelta || 0) : adminParseCredits(effect.creditsDelta || 0);
    const isIncoming = direction === "IN";
    window.WS_APP.emitBillingNotification?.(party.partyId, {
      subtype: asset === "DEBT" ? `DEBT_TRANSFER_${direction}` : `CREDIT_TRANSFER_${direction}`,
      severity: "NOTICE",
      title: asset === "DEBT"
        ? (isIncoming ? "Debt Liability Assigned" : "Debt Liability Transferred")
        : (isIncoming ? "Incoming Transfer" : "Outgoing Transfer"),
      layout: "finance-transfer",
      panels: [
        { title: "TRANSFER", rows: [
          { label: isIncoming ? "Sender" : "Recipient", value: counterpartyLabel },
          { label: "Asset", value: asset },
          { label: "Amount", value: adminFormatCredits(transfer.amount || 0) },
          { label: "Note", value: transfer.reason || "-" }
        ] },
        { title: asset === "DEBT" ? "DEBT" : "ACCOUNT", rows: [
          { label: "Before", value: adminFormatCredits(asset === "DEBT" ? snapshot.debtBefore : snapshot.creditsBefore) },
          { label: "Change", value: `${delta > 0 ? "+" : ""}${adminFormatCredits(delta)}` },
          { label: "After", value: adminFormatCredits(asset === "DEBT" ? snapshot.debtAfter : snapshot.creditsAfter) }
        ] }
      ],
      createdBy: "ADMIN"
    });
  }


  function previewAdminEconomyTransfer(user, sourceValue, targetValue, assetInput, amountInput, reasonInput, visibilityInput) {
    const sourceParty = parseAdminTransferPartyValue(sourceValue);
    const targetParty = parseAdminTransferPartyValue(targetValue);
    const asset = String(assetInput || "CREDITS").trim().toUpperCase();
    const amount = adminParseCredits(amountInput);
    const reason = String(reasonInput || "").trim();
    const visibility = String(visibilityInput || "INGAME_TRANSFER").trim().toUpperCase() === "ADMIN_ONLY" ? "ADMIN_ONLY" : "INGAME_TRANSFER";
    const command = createAdminCommandEnvelope(user, "ADMIN_BILLING_TRANSFER", reason, `${sourceParty.partyType}:${sourceParty.partyId}:${targetParty.partyType}:${targetParty.partyId}:${asset}:${amount}`);
    if (!command.ok) return command;
    if (typeof window.WS_APP.previewAdminBillingTransfer !== "function") {
      return { ok: false, resultCode: "ADMIN_TRANSFER_API_UNAVAILABLE", message: "Canonical Billing transfer preview API is unavailable." };
    }
    const previewResult = window.WS_APP.previewAdminBillingTransfer({
      sourceParty,
      targetParty,
      asset,
      amount,
      reason,
      actor: command.actor,
      idempotencyKey: command.idempotencyKey,
      correlationId: command.idempotencyKey,
      metadata: { visibility, sourceCommand: command.sourceCommand }
    });
    if (!previewResult?.ok) {
      const resultCode = getAdminCommandResultCode(previewResult, "ADMIN_TRANSFER_PREVIEW_FAILED");
      return { ok: false, resultCode, message: `Transfer preview failed: ${resultCode}.` };
    }
    return { ok: true, command, sourceParty, targetParty, asset, amount, reason, visibility, preview: previewResult };
  }

  function executeAdminEconomyTransfer(user, sourceValue, targetValue, assetInput, amountInput, reasonInput, visibilityInput, prepared = null) {
    const preparedResult = prepared?.ok ? prepared : previewAdminEconomyTransfer(user, sourceValue, targetValue, assetInput, amountInput, reasonInput, visibilityInput);
    if (!preparedResult?.ok) return preparedResult;
    const { sourceParty, targetParty, asset, amount, reason, visibility, command } = preparedResult;
    if (typeof window.WS_APP.executeAdminBillingTransfer !== "function") {
      return { ok: false, resultCode: "ADMIN_TRANSFER_API_UNAVAILABLE", message: "Canonical Billing transfer API is unavailable." };
    }

    const result = window.WS_APP.executeAdminBillingTransfer({
      sourceParty,
      targetParty,
      asset,
      amount,
      reason,
      actor: command.actor,
      idempotencyKey: command.idempotencyKey,
      correlationId: command.idempotencyKey,
      metadata: { visibility, sourceCommand: command.sourceCommand }
    });

    if (!result?.ok) {
      const resultCode = getAdminCommandResultCode(result, "ADMIN_TRANSFER_FAILED");
      appendAdminAuditEvent(user, {
        category: "ECONOMY",
        action: result?.recoveryRequired ? "ADMIN_BILLING_TRANSFER_RECOVERY_REQUIRED" : "ADMIN_BILLING_TRANSFER_FAILED",
        target: `${sourceParty.partyType}:${sourceParty.partyId}→${targetParty.partyType}:${targetParty.partyId}`,
        resultCode,
        status: result?.recoveryRequired ? "RECOVERY_REQUIRED" : "FAILED",
        summary: `Billing transfer failed: ${resultCode}.`,
        domainRefs: {
          citizenIds: [sourceParty, targetParty].filter((party) => party.partyType === "CITIZEN").map((party) => party.partyId),
          organizationIds: [sourceParty, targetParty].filter((party) => party.partyType === "ORGANIZATION").map((party) => party.partyId)
        },
        meta: { sourceParty, targetParty, asset, amount, reason, visibility, resultCode, idempotencyKey: command.idempotencyKey }
      });
      return {
        ok: false,
        resultCode,
        recoveryRequired: result?.recoveryRequired === true,
        message: result?.recoveryRequired ? `Transfer requires Billing recovery: ${resultCode}.` : `Transfer failed: ${resultCode}.`
      };
    }

    const transfer = result.billingTransfer || {};
    const sourceLabel = getAdminTransferPartyLabel(transfer.sourceParty || sourceParty);
    const targetLabel = getAdminTransferPartyLabel(transfer.targetParty || targetParty);
    emitAdminBillingTransferNotification(transfer.sourceParty, "OUT", transfer, result.sourceTransaction, targetLabel, visibility);
    emitAdminBillingTransferNotification(transfer.targetParty, "IN", transfer, result.targetTransaction, sourceLabel, visibility);

    appendAdminAuditEvent(user, {
      category: "ECONOMY",
      action: "ADMIN_BILLING_TRANSFER",
      recordId: transfer.transferId || "",
      target: transfer.transferId || `${sourceLabel}→${targetLabel}`,
      status: "SUCCEEDED",
      resultCode: result.resultCode || "ADMIN_TRANSFER_COMPLETED",
      summary: `${asset} transfer ${adminFormatCredits(amount)}: ${sourceLabel} → ${targetLabel}.`,
      idempotencyKey: command.idempotencyKey,
      correlationId: transfer.correlationId || command.idempotencyKey,
      domainRefs: {
        billingTransferIds: [transfer.transferId].filter(Boolean),
        billingTransactionIds: [result.sourceTransaction?.billingTransactionId, result.targetTransaction?.billingTransactionId].filter(Boolean),
        citizenIds: [transfer.sourceParty, transfer.targetParty].filter((party) => party?.partyType === "CITIZEN").map((party) => party.partyId),
        organizationIds: [transfer.sourceParty, transfer.targetParty].filter((party) => party?.partyType === "ORGANIZATION").map((party) => party.partyId)
      },
      meta: {
        sourceParty: transfer.sourceParty,
        targetParty: transfer.targetParty,
        asset,
        amount,
        reason,
        visibility,
        sourceTransactionId: result.sourceTransaction?.billingTransactionId || "",
        targetTransactionId: result.targetTransaction?.billingTransactionId || "",
        idempotencyKey: command.idempotencyKey,
        correlationId: transfer.correlationId || ""
      }
    });

    return {
      ok: true,
      resultCode: result.resultCode || "ADMIN_TRANSFER_COMPLETED",
      message: `${asset} transfer completed: ${sourceLabel} → ${targetLabel}, ${adminFormatCredits(amount)}.`,
      billingTransfer: transfer
    };
  }

  function normalizeAdminAccessTagId(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9&_-]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function getAdminAccessToolState() {
    const current = window.WS_APP.adminAccessToolState || {};
    const feedback = current.feedback && typeof current.feedback === "object"
      ? { tone: current.feedback.tone === "error" ? "error" : "info", message: String(current.feedback.message || "") }
      : null;
    window.WS_APP.adminAccessToolState = { feedback };
    return window.WS_APP.adminAccessToolState;
  }

  function setAdminAccessToolState(patch = {}) {
    const current = getAdminAccessToolState();
    window.WS_APP.adminAccessToolState = { ...current, ...patch };
    return window.WS_APP.adminAccessToolState;
  }

  function getAdminAssignableCitizenAccessTags() {
    return (window.WS_APP.getAccessTags?.({ includeArchived: false }) || window.APP_DATA?.accessTags || [])
      .filter((tag) => tag && !tag.archived)
      .filter((tag) => !tag.adminOnly && normalizeAdminAccessTagId(tag.id) !== "GAME_MASTER")
      .map((tag) => ({
        ...tag,
        id: normalizeAdminAccessTagId(tag.id),
        label: String(tag.label || tag.id || "ACCESS").trim(),
        type: String(tag.type || "custom").trim().toLowerCase()
      }))
      .filter((tag) => tag.id)
      .sort((a, b) => {
        const rankA = a.rank === null || a.rank === undefined ? 999 : Number(a.rank);
        const rankB = b.rank === null || b.rank === undefined ? 999 : Number(b.rank);
        return rankA - rankB || String(a.type).localeCompare(String(b.type), "pl") || String(a.id).localeCompare(String(b.id), "pl");
      });
  }

  function getAdminLinkedUserForCitizen(citizenId) {
    const users = window.WS_APP.getUsers?.({ includeDisabled: true }) || [];
    return users.find((entry) => String(entry.citizenId || "") === String(citizenId || "") && entry.role !== "admin") || null;
  }

  function normalizeAdminCitizenAccessTags(tags, fallback = ["PUBLIC"]) {
    if (window.WS_APP.normalizeAccessTagList) return window.WS_APP.normalizeAccessTagList(tags, fallback);
    const source = Array.isArray(tags) && tags.length ? tags : fallback;
    const normalized = source.map((tag) => normalizeAdminAccessTagId(tag)).filter(Boolean);
    return normalized.length ? Array.from(new Set(normalized)) : ["PUBLIC"];
  }

  function applyAdminCitizenAccessAction(user, citizenId, action, tagId, note, options = {}) {
    const normalizedAction = String(action || "GRANT").toUpperCase() === "REVOKE" ? "REVOKE" : "GRANT";
    const normalizedTagId = normalizeAdminAccessTagId(tagId);
    const normalizedNote = String(note || "").trim();
    const command = createAdminCommandEnvelope(user, `CITIZEN_ACCESS_${normalizedAction}`, normalizedNote, `${citizenId}:${normalizedTagId}`);
    const syncLinkedUser = options.syncLinkedUser !== false;
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    const availableTags = getAdminAssignableCitizenAccessTags();
    const tag = availableTags.find((item) => item.id === normalizedTagId) || null;

    if (!command.ok) return command;
    if (!citizen || citizen.recordType === "admin") return { ok: false, resultCode: "CITIZEN_CONTEXT_INVALID", message: "Citizen context is invalid." };
    if (!tag) return { ok: false, resultCode: "ACCESS_TAG_NOT_ASSIGNABLE", message: "Selected access tag is not assignable." };

    const tagMap = new Map(availableTags.map((item) => [item.id, item]));
    const current = normalizeAdminCitizenAccessTags(citizen.accessTags, ["PUBLIC"]);
    let next = current.slice();

    if (normalizedAction === "GRANT") {
      const exclusive = new Set([...(Array.isArray(tag.exclusiveWith) ? tag.exclusiveWith : [])].map((item) => normalizeAdminAccessTagId(item)).filter(Boolean));
      next = next.filter((item) => !exclusive.has(item));
      next = next.filter((item) => {
        const definition = tagMap.get(item);
        const reverseExclusive = Array.isArray(definition?.exclusiveWith) ? definition.exclusiveWith.map((value) => normalizeAdminAccessTagId(value)) : [];
        return !reverseExclusive.includes(normalizedTagId);
      });
      if (!next.includes(normalizedTagId)) next.push(normalizedTagId);
    } else {
      next = next.filter((item) => item !== normalizedTagId);
      if (!next.length) next = ["PUBLIC"];
    }

    next = normalizeAdminCitizenAccessTags(next, ["PUBLIC"]);
    const linkedUser = syncLinkedUser ? getAdminLinkedUserForCitizen(citizen.id) : null;
    let userNext = null;
    if (linkedUser) {
      const userCurrent = normalizeAdminCitizenAccessTags(linkedUser.accessTags, ["PUBLIC"]);
      userNext = userCurrent.slice();
      if (normalizedAction === "GRANT") {
        const exclusive = new Set([...(Array.isArray(tag.exclusiveWith) ? tag.exclusiveWith : [])].map((item) => normalizeAdminAccessTagId(item)).filter(Boolean));
        userNext = userNext.filter((item) => !exclusive.has(item));
        userNext = userNext.filter((item) => {
          const definition = tagMap.get(item);
          const reverseExclusive = Array.isArray(definition?.exclusiveWith) ? definition.exclusiveWith.map((value) => normalizeAdminAccessTagId(value)) : [];
          return !reverseExclusive.includes(normalizedTagId);
        });
        if (!userNext.includes(normalizedTagId)) userNext.push(normalizedTagId);
      } else {
        userNext = userNext.filter((item) => item !== normalizedTagId);
        if (!userNext.length) userNext = ["PUBLIC"];
      }
      userNext = normalizeAdminCitizenAccessTags(userNext, ["PUBLIC"]);
    }

    const accessResult = window.WS_APP.CitizenCommandAPI?.adminUpdateCitizenAccess?.(citizen.id, {
      patch: { accessTags: next },
      reason: normalizedNote,
      source: "ADMIN_CONTROL_ACCESS",
      idempotencyKey: command.idempotencyKey
    }, user);
    const updatedCitizen = accessResult?.citizen || null;
    if (!accessResult?.ok || !updatedCitizen) {
      return {
        ok: false,
        resultCode: getAdminCommandResultCode(accessResult, "CITIZEN_ACCESS_UPDATE_FAILED"),
        message: accessResult?.error?.code || "Citizen access tags could not be updated."
      };
    }

    let updatedUser = null;
    if (linkedUser) {
      updatedUser = window.WS_APP.updateUser?.(linkedUser.id, { accessTags: userNext });
      if (!updatedUser) {
        const rollbackResult = window.WS_APP.CitizenCommandAPI?.adminUpdateCitizenAccess?.(citizen.id, {
          patch: { accessTags: current },
          reason: `Rollback after linked user access synchronization failure. ${normalizedNote}`.trim(),
          source: "ADMIN_CONTROL_ACCESS_ROLLBACK",
          idempotencyKey: `${command.idempotencyKey}:rollback`
        }, user);
        const rollbackCitizen = rollbackResult?.citizen || null;
        if (!rollbackResult?.ok || !rollbackCitizen) {
          return {
            ok: false,
            resultCode: "ACCESS_SYNC_RECOVERY_REQUIRED",
            recoveryRequired: true,
            message: "Linked user synchronization failed and Citizen rollback was not confirmed."
          };
        }
        return {
          ok: false,
          resultCode: "LINKED_USER_ACCESS_UPDATE_FAILED",
          recoveryRequired: false,
          message: "Linked user synchronization failed; Citizen change was rolled back."
        };
      }
    }

    appendAdminAuditEvent(user, {
      category: "ACCESS",
      action: normalizedAction === "GRANT" ? "CITIZEN_ACCESS_TAG_GRANTED" : "CITIZEN_ACCESS_TAG_REVOKED",
      citizenId: citizen.id,
      recordId: normalizedTagId,
      target: normalizedTagId,
      summary: `${citizen.id} ${normalizedAction === "GRANT" ? "granted" : "revoked"} access tag ${normalizedTagId}. Note: ${normalizedNote}`,
      meta: {
        action: normalizedAction,
        tagId: normalizedTagId,
        note: normalizedNote,
        idempotencyKey: command.idempotencyKey,
        actorId: command.actor.actorId,
        previousTags: current,
        nextTags: updatedCitizen.accessTags || next,
        linkedUserId: linkedUser?.id || "",
        linkedUserSynced: !linkedUser || Boolean(updatedUser)
      }
    });

    return {
      ok: true,
      resultCode: "ACCESS_SYNCED",
      message: `${normalizedAction === "GRANT" ? "Granted" : "Revoked"} ${normalizedTagId}.`,
      citizen: updatedCitizen,
      user: updatedUser,
      linkedUserSynced: !linkedUser || Boolean(updatedUser),
      idempotencyKey: command.idempotencyKey
    };
  }

  function renderAdminCitizenAccessTools(citizen, user) {
    if (!citizen || citizen.recordType === "admin") return "";
    const state = getAdminAccessToolState();
    const tags = getAdminAssignableCitizenAccessTags();
    const currentTags = normalizeAdminCitizenAccessTags(citizen.accessTags, ["PUBLIC"]);
    const linkedUser = getAdminLinkedUserForCitizen(citizen.id);
    const feedback = state.feedback?.message
      ? `<p class="admin-panel-note ${state.feedback.tone === "error" ? "is-error" : "is-info"}">${escapeHtml(state.feedback.message)}</p>`
      : "";

    return `
      <section class="admin-inspector-block admin-access-direct-panel">
        <p class="kicker">DIRECT ACTION / CITIZEN ACCESS</p>
        <h5>Access Tag Assignment</h5>
        <div class="admin-access-current">
          <span>Current citizen tags</span>
          <div>${renderTagPills(currentTags, "access")}</div>
        </div>
        <form class="admin-direct-action-form" data-admin-citizen-access-form data-admin-citizen-id="${escapeHtml(citizen.id)}">
          <label>Action
            <select name="action" required>
              <option value="GRANT">GRANT TAG</option>
              <option value="REVOKE">REVOKE TAG</option>
            </select>
          </label>
          <label>Access Tag
            <select name="tagId" required>
              ${tags.map((tag) => `<option value="${escapeHtml(tag.id)}">${escapeHtml(tag.id)} — ${escapeHtml(tag.label)} / ${escapeHtml(tag.type)}</option>`).join("")}
            </select>
          </label>
          <label class="admin-form-field--wide">Reason / Admin Note
            <textarea name="note" rows="3" placeholder="Why this access tag is granted or revoked." required></textarea>
          </label>
          <label class="admin-form-checkbox admin-form-field--wide">
                  <input class="ui-select-control" type="checkbox" name="syncLinkedUser" value="1" checked ${linkedUser ? "" : "disabled"} />
            <span>Sync linked login account${linkedUser ? `: ${escapeHtml(linkedUser.login || linkedUser.id)}` : ": no linked citizen login"}</span>
          </label>
          <div class="admin-form-actions admin-form-field--wide">
            <button class="admin-inline-button" type="submit" ${tags.length ? "" : "disabled"}>Apply Access Action</button>
            <button class="admin-inline-button" type="button" data-admin-open-workspace="tags-access">Open Tags & Access</button>
          </div>
          ${feedback}
        </form>
      </section>
    `;
  }

  function getAdminEconomySenderOptions() {
    const names = new Map();
    const addName = (value) => {
      const name = String(value || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!names.has(key)) names.set(key, name);
    };

    (window.WS_APP.getAccessTags?.({ includeArchived: false }) || window.APP_DATA?.accessTags || [])
      .filter((tag) => String(tag.type || "").toLowerCase() === "organization")
      .forEach((tag) => addName(tag.label || tag.id));

    (window.APP_DATA?.systemRecords || []).forEach((record) => {
      const subscriptions = record?.definitions?.subscriptions || [];
      subscriptions.forEach((subscription) => addName(subscription.provider || subscription.title));
    });

    (window.WS_APP.getServiceOffers?.() || []).forEach((offer) => addName(offer.provider || offer.employer || offer.commissioningParty));
    getAdminCitizens().forEach((citizen) => (citizen.serviceLog || []).forEach((entry) => addName(entry.provider || entry.employer || entry.commissioningParty)));

    const organizations = Array.from(names.values()).sort((a, b) => a.localeCompare(b, "pl", { sensitivity: "base" }));
    return [
      ...organizations.map((name) => ({ value: `ORG::${encodeURIComponent(name)}`, label: name, type: "organization" })),
      { value: "CUSTOM", label: "CUSTOM", type: "custom" },
      { value: "ADMIN", label: "ADMIN", type: "admin" }
    ];
  }

  function resolveAdminEconomySender(user, senderSource, customSender) {
    const raw = String(senderSource || "ADMIN").trim();
    if (raw === "CUSTOM") {
      const label = String(customSender || "").trim();
      if (!label) return { ok: false, message: "Custom sender name is required." };
      return { ok: true, type: "custom", label, source: raw };
    }
    if (raw.startsWith("ORG::")) {
      const label = decodeURIComponent(raw.slice(5));
      if (!label) return { ok: false, message: "Organization sender is invalid." };
      return { ok: true, type: "organization", label, source: raw };
    }
    return {
      ok: true,
      type: "admin",
      label: "ADMIN",
      source: "ADMIN",
      operator: user?.login || window.WS_APP.currentUser?.login || "ADMIN"
    };
  }

  function renderAdminEconomyOperatingContext(citizen = {}) {
    const citizenId = String(citizen.id || "");
    const legalName = window.WS_APP.getCitizenDisplayName?.(citizen, { legal: true }) || citizen.legalName || citizen.shortId || citizenId || "UNKNOWN";
    const shortId = citizen.shortId || window.WS_APP.getCitizenShortId?.(citizen) || citizenId || "UNKNOWN";
    return `
      <div class="admin-economy-operating-context" aria-label="Billing operation target">
        <small>OPERATING ON</small>
        <strong>${escapeHtml(legalName)}</strong>
        <span>${escapeHtml(shortId)}</span>
      </div>
    `;
  }

  function getAdminEconomyNotificationTitle(targetId, creditDelta, debtDelta, visibility) {
    const isAdminCorrection = String(visibility || "").toUpperCase() === "ADMIN_CORRECTION";
    if (isAdminCorrection) return "Administrative Correction";
    if (targetId === "credits" && creditDelta > 0) return "Incoming Transfer";
    if (targetId === "credits" && creditDelta < 0) return "Outgoing Transfer";
    if (targetId === "debt" && debtDelta > 0) return "Debt Record Update";
    if (targetId === "debt" && debtDelta < 0) return "Debt Reduction Notice";
    return "Economy Record Update";
  }

  function renderAdminEconomyTools(group, user) {
    const citizen = group?.citizen || null;
    const state = getAdminEconomyState();
    const credits = adminParseCredits(citizen?.credits || 0);
    const debt = adminParseCredits(citizen?.debt || 0);
    const senderOptions = getAdminEconomySenderOptions();
    const feedback = state.feedback?.message
      ? `<p class="admin-panel-note ${state.feedback.tone === "error" ? "is-error" : "is-info"}">${escapeHtml(state.feedback.message)}</p>`
      : "";

    if (!citizen) {
      return `
        <section class="admin-workspace-panel admin-economy-tools-panel">
          <div class="admin-panel-headline">
            <p class="kicker">ADMIN / ECONOMY TOOLS</p>
            <h5>Manual Economy Adjustment</h5>
          </div>
          <div class="admin-empty-state">Select a citizen context to unlock economy tools.</div>
        </section>
      `;
    }

    return `
      <section class="admin-workspace-panel admin-economy-tools-panel">
        <div class="admin-panel-headline admin-tag-manager-headline">
          <div>
            <p class="kicker">ADMIN / ECONOMY TOOLS</p>
            <h5>Manual Economy Adjustment</h5>
          </div>
        </div>
        ${renderAdminEconomyOperatingContext(citizen)}
        ${feedback}
        <form class="admin-economy-form" data-admin-economy-form data-admin-citizen-id="${escapeHtml(citizen.id || "")}">
          <fieldset class="admin-economy-choice-group admin-form-field--wide">
            <legend>Target</legend>
            <div class="admin-economy-tile-grid">
              <label class="admin-economy-tile">
                  <input type="radio" name="target" value="credits" checked />
                <span>Credits</span>
                <strong>${escapeHtml(adminFormatCredits(credits))}</strong>
                <small>Current balance</small>
              </label>
              <label class="admin-economy-tile">
                  <input type="radio" name="target" value="debt" />
                <span>Debt</span>
                <strong>${escapeHtml(adminFormatCredits(debt))}</strong>
                <small>Current debt</small>
              </label>
            </div>
          </fieldset>
          <fieldset class="admin-economy-choice-group admin-form-field--wide">
            <legend>Mode</legend>
            <div class="admin-economy-mode-grid">
              <label class="admin-economy-mode-tile">
                  <input type="radio" name="mode" value="SET" checked />
                <span>SET</span>
                <small>Set final value</small>
              </label>
              <label class="admin-economy-mode-tile">
                  <input type="radio" name="mode" value="CHANGE" />
                <span>CHANGE</span>
                <small>Use + or - delta</small>
              </label>
            </div>
          </fieldset>
          <label>Value
            <input name="amount" type="text" inputmode="numeric" placeholder="SET: 1200 / CHANGE: +500 or -500" required />
          </label>
          <label>Transfer Visibility
            <select name="visibility" required>
              <option value="INGAME_TRANSFER">In-game transfer</option>
              <option value="ADMIN_CORRECTION">Admin correction</option>
            </select>
          </label>
          <label>Sender Source
            <select name="senderSource" data-admin-economy-sender-source required>
              ${senderOptions.map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}${option.type === "organization" ? " / organization" : ""}</option>`).join("")}
            </select>
          </label>
          <label class="admin-form-field--wide">Custom Sender
            <input name="customSender" data-admin-economy-custom-sender type="text" placeholder="Custom sender name" disabled />
          </label>
          <label class="admin-form-field--wide">Reason / Public Transfer Note
            <textarea name="reason" rows="3" placeholder="Mission reward, penalty, correction, debt override…" required></textarea>
          </label>
          <div class="admin-form-actions admin-form-field--wide">
            <button class="admin-inline-button" type="submit">Apply Economy Operation</button>
          </div>
        </form>
        <p class="admin-panel-note">SET writes the final value. CHANGE accepts signed values: + adds, - removes/reduces. The sender field is display metadata for a one-account correction. Use Atomic Account Transfer below when both source and target accounts must receive paired ledger effects.</p>
      </section>
    `;
  }

  function applyAdminEconomyAdjustment(user, citizenId, target, mode, amountInput, reasonInput, senderSource, customSenderInput, visibilityInput) {
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || citizen.recordType === "admin") return { ok: false, resultCode: "CITIZEN_NOT_FOUND", message: "Citizen record not found." };

    const targetId = String(target || "").trim().toUpperCase();
    const modeId = String(mode || "").trim().toUpperCase();
    const amount = adminParseCredits(amountInput);
    const reason = String(reasonInput || "").trim();
    const visibility = String(visibilityInput || "INGAME_TRANSFER").trim().toUpperCase() === "ADMIN_CORRECTION" ? "ADMIN_CORRECTION" : "INGAME_TRANSFER";
    const sender = resolveAdminEconomySender(user, senderSource, customSenderInput);
    const command = createAdminCommandEnvelope(user, "ADMIN_ECONOMY_ADJUSTMENT", reason, `${citizenId}:${targetId}:${modeId}`);

    if (!command.ok) return command;
    if (!["CREDITS", "DEBT"].includes(targetId)) return { ok: false, resultCode: "ADMIN_ADJUSTMENT_TARGET_INVALID", message: "Economy target must be Credits or Debt." };
    if (!["SET", "CHANGE"].includes(modeId)) return { ok: false, resultCode: "ADMIN_ADJUSTMENT_MODE_INVALID", message: "Economy mode must be SET or CHANGE." };
    if (!sender.ok) return { ok: false, resultCode: "ADMIN_ADJUSTMENT_SENDER_INVALID", message: sender.message || "Sender is invalid." };
    if (typeof window.WS_APP.applyAdminBillingAdjustment !== "function") {
      return { ok: false, resultCode: "ADMIN_BILLING_API_UNAVAILABLE", message: "Canonical Billing adjustment API is unavailable." };
    }

    const isInGameTransfer = visibility === "INGAME_TRANSFER";
    const senderLabel = sender.label || "ADMIN";
    const historyTitle = isInGameTransfer
      ? targetId === "CREDITS" ? "CREDITS_TRANSFER" : "DEBT_RECORD_UPDATE"
      : `${targetId}_${modeId}`;
    const billingResult = window.WS_APP.applyAdminBillingAdjustment({
      citizenId,
      target: targetId,
      mode: modeId,
      amount,
      reason,
      actor: command.actor,
      idempotencyKey: command.idempotencyKey,
      correlationId: command.idempotencyKey,
      publicSender: senderLabel,
      visibility,
      historyType: isInGameTransfer ? "INGAME_TRANSFER" : "ADMIN_ECONOMY_ADJUSTMENT",
      historyTitle,
      metadata: {
        senderType: sender.type || "admin",
        senderSource: sender.source || "ADMIN",
        sourceCommand: command.sourceCommand
      }
    });

    if (!billingResult?.ok) {
      const resultCode = getAdminCommandResultCode(billingResult, "ADMIN_BILLING_ADJUSTMENT_FAILED");
      appendAdminAuditEvent(user, {
        category: "ECONOMY",
        action: billingResult?.recoveryRequired ? "ADMIN_ECONOMY_RECOVERY_REQUIRED" : "ADMIN_ECONOMY_ADJUSTMENT_FAILED",
        citizenId,
        target: citizenId,
        summary: `${citizenId} economy adjustment failed: ${resultCode}.`,
        meta: { target: targetId, mode: modeId, amount, reason, visibility, resultCode, idempotencyKey: command.idempotencyKey }
      });
      return {
        ok: false,
        resultCode,
        recoveryRequired: billingResult?.recoveryRequired === true,
        message: billingResult?.recoveryRequired
          ? `Adjustment requires Billing recovery: ${resultCode}.`
          : `Economy operation failed: ${resultCode}.`
      };
    }

    const transaction = billingResult.billingTransaction || {};
    const snapshot = billingResult.account || transaction.accountSnapshot || {};
    const effect = transaction.accountEffect || {};
    const creditsBefore = adminParseCredits(snapshot.creditsBefore || 0);
    const creditsAfter = adminParseCredits(snapshot.creditsAfter || 0);
    const debtBefore = adminParseCredits(snapshot.debtBefore || 0);
    const debtAfter = adminParseCredits(snapshot.debtAfter || 0);
    const creditDelta = adminParseCredits(effect.creditsDelta || 0);
    const debtDelta = adminParseCredits(effect.debtDelta || 0);
    const operationLabel = historyTitle;
    const publicTitle = getAdminEconomyNotificationTitle(targetId.toLowerCase(), creditDelta, debtDelta, visibility);
    const publicCreatedBy = isInGameTransfer ? senderLabel : command.actor.actorId;

    window.WS_APP.emitBillingNotification?.(citizenId, {
      subtype: isInGameTransfer
        ? (creditDelta >= 0 ? "CREDIT_TRANSFER_IN" : "CREDIT_TRANSFER_OUT")
        : "ADMINISTRATIVE_CORRECTION",
      severity: "NOTICE",
      title: publicTitle,
      layout: "finance-transfer",
      panels: [
        { title: "CORRECTION", rows: [
          { label: "Sender", value: senderLabel },
          { label: "Operation", value: operationLabel },
          { label: "Note", value: reason || "-" }
        ] },
        { title: "ACCOUNT", rows: [
          { label: "Balance", value: adminFormatCredits(creditsBefore) },
          { label: "Change", value: `${creditDelta > 0 ? "+" : ""}${adminFormatCredits(creditDelta)}` },
          { label: "Final balance", value: adminFormatCredits(creditsAfter) }
        ] },
        { title: "DEBT", rows: [
          { label: "Before", value: adminFormatCredits(debtBefore) },
          { label: "Change", value: `${debtDelta > 0 ? "+" : ""}${adminFormatCredits(debtDelta)}` },
          { label: "Remaining", value: adminFormatCredits(debtAfter) }
        ] }
      ],
      createdBy: publicCreatedBy
    });

    appendAdminAuditEvent(user, {
      category: "ECONOMY",
      action: "ADMIN_ECONOMY_ADJUSTMENT",
      citizenId,
      recordId: transaction.billingTransactionId || billingResult.historyEntry?.id || "",
      target: citizenId,
      summary: `${citizenId} ${operationLabel}: credits ${adminFormatCredits(creditsBefore)} → ${adminFormatCredits(creditsAfter)}, debt ${adminFormatCredits(debtBefore)} → ${adminFormatCredits(debtAfter)}. Sender: ${senderLabel}.`,
      meta: {
        operation: `${targetId}_${modeId}`,
        target: targetId,
        mode: modeId,
        amount,
        reason,
        visibility,
        senderType: sender.type || "admin",
        senderLabel,
        senderSource: sender.source || "ADMIN",
        operator: command.actor.actorId,
        idempotencyKey: command.idempotencyKey,
        billingTransactionId: transaction.billingTransactionId || "",
        correlationId: transaction.correlationId || "",
        creditsBefore,
        creditsAfter,
        debtBefore,
        debtAfter,
        ledgerId: billingResult.historyEntry?.id || ""
      }
    });

    return {
      ok: true,
      resultCode: billingResult.resultCode || "ADMIN_ADJUSTMENT_APPLIED",
      message: `${operationLabel} applied. Sender: ${senderLabel}. Credits ${adminFormatCredits(creditsBefore)} → ${adminFormatCredits(creditsAfter)} / debt ${adminFormatCredits(debtBefore)} → ${adminFormatCredits(debtAfter)}.`,
      citizen: billingResult.citizen,
      billingTransaction: transaction
    };
  }
  function renderAdminAuditDetail(event) {
    if (!event) return `
      <section class="admin-workspace-panel">
        <div class="admin-panel-headline"><p class="kicker">ADMIN / AUDIT DETAIL</p><h5>No Event Selected</h5></div>
      </section>
    `;
    const targets = (event.targetRefs || []).map((ref) => `${ref.type}:${ref.id}`).join(" / ") || "SYSTEM";
    const refs = Object.entries(event.domainRefs || {}).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`).join(" / ") || "NONE";
    return `
      <section class="admin-workspace-panel admin-audit-detail">
        <div class="admin-panel-headline">
          <div>
            <p class="kicker">ADMIN / AUDIT DETAIL</p>
            <h5>${escapeHtml(event.auditEventId || "AUDIT")}</h5>
          </div>
          ${renderStateBadge(event.result?.status || "UNKNOWN", event.result?.status === "SUCCEEDED" ? "active" : event.result?.status === "RECOVERY_REQUIRED" ? "warning" : "locked")}
        </div>
        ${renderAdminDataList([
          ["Sequence", escapeHtml(event.sequence || 0)],
          ["Actor", `${escapeHtml(event.actor?.displayName || "ADMIN")}<small>${escapeHtml(event.actor?.actorId || "")} / ${escapeHtml(event.actor?.actorRole || "ADMIN")}</small>`],
          ["Command", `${escapeHtml(event.sourceCommand || "ADMIN_EVENT")}<small>${escapeHtml(event.category || "ADMIN")} / ${escapeHtml(event.workspace || "ADMIN")}</small>`],
          ["Result", `${escapeHtml(event.result?.resultCode || "UNKNOWN")}<small>${escapeHtml(event.result?.message || event.summary || "")}</small>`],
          ["Targets", escapeHtml(targets)],
          ["Domain Refs", escapeHtml(refs)],
          ["Revisions", `${escapeHtml(event.previousRevision ?? "—")} → ${escapeHtml(event.nextRevision ?? "—")}`],
          ["Correlation", `${escapeHtml(event.request?.correlationId || "—")}<small>${escapeHtml(event.request?.idempotencyKey || "NO IDEMPOTENCY KEY")}</small>`],
          ["Created", escapeHtml(event.createdAt || "UNKNOWN")]
        ], ["Field", "Value"], "No audit detail available.")}
      </section>
    `;
  }

  function renderAdminMetricCard(title, value, description, workspaceId) {
    return `
      <button class="admin-metric-card" type="button" data-admin-open-workspace="${escapeHtml(workspaceId)}">
        <span>${escapeHtml(title)}</span>
        <b>${escapeHtml(value)}</b>
        <small>${escapeHtml(description)}</small>
      </button>
    `;
  }

  function renderAdminModuleAction(moduleId, workspace = {}) {
    const module = getModuleDefinition(moduleId);
    const terminalPanel = workspace.terminalPanel || "";
    const dataAttr = terminalPanel && moduleId === "terminal-hub"
      ? `data-admin-open-terminal-panel="${escapeHtml(terminalPanel)}"`
      : `data-admin-open-module="${escapeHtml(moduleId)}"`;

    return `
      <button class="admin-action-card" type="button" ${dataAttr}>
        <span>${escapeHtml(module.title || moduleId)}</span>
        <b>${escapeHtml(String(module.status || "READY").toUpperCase())}</b>
        <small>${escapeHtml(module.description || "Open admin workspace.")}</small>
      </button>
    `;
  }

  function renderAdminInspector(workspace, user) {
    if (workspace.id === "operations" && window.WS_APP.AdminOperationsControl?.renderInspector) {
      return window.WS_APP.AdminOperationsControl.renderInspector({ workspace, user });
    }
    if (workspace.id === "subscriptions" && window.WS_APP.AdminSubscriptionsControl?.renderInspector) {
      return window.WS_APP.AdminSubscriptionsControl.renderInspector({ workspace, user });
    }
    if (workspace.id === "catalog-management" && window.WS_APP.AdminCatalogManagementControl?.renderInspector) {
      return window.WS_APP.AdminCatalogManagementControl.renderInspector({ workspace, user });
    }
    if (workspace.id === "cyberware-runtime" && window.WS_APP.AdminCyberwareRuntimeControl?.renderInspector) {
      return window.WS_APP.AdminCyberwareRuntimeControl.renderInspector({ workspace, user });
    }

    const selectedGroup = getAdminSelectedCitizenGroupForWorkspace(workspace.id, user);
    if (selectedGroup?.citizen) {
      return renderAdminCitizenInspector(workspace, user, selectedGroup);
    }

    const metrics = getAdminDashboardMetrics(user);
    const notes = getInspectorNotes(workspace.id);
    return `
      <section class="admin-inspector-block">
        <p class="kicker">ADMIN INSPECTOR</p>
        <h5>${escapeHtml(workspace.title)}</h5>
        <p>${escapeHtml(workspace.description)}</p>
      </section>
      <section class="admin-inspector-block">
        <p class="kicker">SYSTEM SNAPSHOT</p>
        <dl class="admin-snapshot-list">
          <div><dt>Citizens</dt><dd>${escapeHtml(metrics.citizens)}</dd></div>
          <div><dt>Open Requests</dt><dd>${escapeHtml(metrics.openRequests)}</dd></div>
          <div><dt>Active Service</dt><dd>${escapeHtml(metrics.activeService)}</dd></div>
          <div><dt>Subscriptions</dt><dd>${escapeHtml(metrics.totalSubscriptions)}</dd></div>
        </dl>
      </section>
      <section class="admin-inspector-block">
        <p class="kicker">WORKSPACE NOTES</p>
        <ul class="admin-inspector-notes">
          ${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
        </ul>
      </section>
    `;
  }

  function renderAdminCitizenInspector(workspace, user, group) {
    const citizen = group.citizen;
    const serviceLog = window.WS_APP.getCitizenServiceLog?.(citizen.id) || citizen.serviceLog || [];
    const subscriptions = Array.isArray(citizen.subscriptions) ? citizen.subscriptions : [];
    const requests = window.WS_APP.getServiceRequests?.(citizen.id) || [];
    const activeService = serviceLog.filter((entry) => String(entry.status || "").toUpperCase() === "ACTIVE").length;
    const activeSubscriptions = subscriptions.filter((item) => item.active && String(item.status || "").toUpperCase() !== "CANCELLED").length;
    const openRequests = requests.filter((request) => !["CLOSED", "DENIED", "ARCHIVED"].includes(String(request.status || "").toUpperCase())).length;
    const income = window.WS_APP.getCitizenWeeklyIncomeTotal?.(citizen.id) || 0;
    const weeklyCost = subscriptions
      .filter((sub) => sub.active !== false && String(sub.status || "").toUpperCase() !== "CANCELLED")
      .reduce((sum, sub) => sum + Number(sub.amount || 0), 0);
    const notes = getInspectorNotes(workspace.id);
    const selectedRecord = getAdminSelectedRecordForWorkspace(workspace.id, group);

    return `
      <section class="admin-inspector-block">
        <p class="kicker">ADMIN INSPECTOR</p>
        <h5>${escapeHtml(workspace.title)}</h5>
        <p>${escapeHtml(workspace.description)}</p>
      </section>
      ${selectedRecord ? renderAdminSelectedRecordInspector(workspace, citizen, selectedRecord) : ""}
      <section class="admin-inspector-block admin-inspector-citizen-card">
        <p class="kicker">SELECTED CITIZEN</p>
        <div class="admin-inspector-citizen-card__identity">
          ${renderCitizenCell(citizen, user)}
        </div>
        <div class="admin-inspector-tag-row">
          ${renderTagPills([citizen.biologicalProfile || citizen.profile || "UNCLASSIFIED"], "identity")}
          ${renderTagPills(citizen.accessTags || ["PUBLIC"], "access")}
        </div>
        <dl class="admin-snapshot-list">
          <div><dt>Credits</dt><dd>${escapeHtml(adminFormatCredits(citizen.credits || 0))}</dd></div>
          <div><dt>Debt</dt><dd>${escapeHtml(adminFormatCredits(citizen.debt || 0))}</dd></div>
          <div><dt>Income</dt><dd>${escapeHtml(adminFormatCredits(income))}</dd></div>
          <div><dt>Sub Cost</dt><dd>${escapeHtml(adminFormatCredits(weeklyCost))}</dd></div>
          <div><dt>Service</dt><dd>${escapeHtml(`${activeService} / ${serviceLog.length}`)}</dd></div>
          <div><dt>Subs</dt><dd>${escapeHtml(`${activeSubscriptions} / ${subscriptions.length}`)}</dd></div>
          <div><dt>Requests</dt><dd>${escapeHtml(`${openRequests} / ${requests.length}`)}</dd></div>
        </dl>
      </section>
      ${workspace.id === "citizens" ? renderAdminCitizenAccessTools(citizen, user) : ""}
      <section class="admin-inspector-block">
        <p class="kicker">CONTROL ROUTES</p>
        <div class="admin-inspector-actions">
          <button class="admin-inline-button" type="button" data-admin-open-selected-citizen-card>Selected Citizen Card</button>
          ${renderModuleButton("Citizen Database", "citizen-database")}
          ${renderModuleButton("Equipment", "equipment")}
          ${renderModuleButton("Service", "service")}
          ${renderModuleButton("Subscriptions", "subscriptions")}
          ${renderTerminalButton("Billing", "billing")}
          ${renderTerminalButton("Requests", "requests")}
        </div>
      </section>
      <section class="admin-inspector-block">
        <p class="kicker">WORKSPACE NOTES</p>
        <ul class="admin-inspector-notes">
          ${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
        </ul>
      </section>
    `;
  }

  function renderAdminSelectedRecordInspector(workspace, citizen, selectedRecord) {
    const record = selectedRecord.record || {};
    const rawType = String(record.type || selectedRecord.type || workspace.id || "record").toUpperCase();
    const type = rawType === "INDEX_ENTRY" ? "AUTHORIZED ENTRY" : rawType === "PROPAGANDA_ENTRY" ? "AUTHORIZED ENTRY" : rawType.replace(/[_-]+/g, " ");
    const title = record.title || selectedRecord.title || selectedRecord.key || "Selected record";
    const subtitle = record.subtitle || record.provider || record.category || record.status || selectedRecord.key || "";
    const details = Array.isArray(record.details) ? record.details : [];

    return `
      <section class="admin-inspector-block admin-selected-record-inspector">
        <p class="kicker">SELECTED RECORD / ${escapeHtml(type)}</p>
        <div class="admin-selected-record-card">
          <strong>${escapeHtml(title)}</strong>
          ${subtitle ? `<small>${escapeHtml(subtitle)}</small>` : ""}
          ${details.length ? `
            <dl class="admin-snapshot-list admin-record-detail-list">
              ${details.map((item) => `<div><dt>${escapeHtml(item.label)}</dt><dd>${item.html ? item.value : escapeHtml(item.value)}</dd></div>`).join("")}
            </dl>
          ` : ""}
        </div>
        ${renderSelectedRecordActions(workspace.id, citizen, selectedRecord)}
      </section>
    `;
  }

  function renderSelectedRecordActions(workspaceId, citizen, selectedRecord) {
    const record = selectedRecord.record || {};
    const recordKey = selectedRecord.key || record.key || record.id || "";
    const escapedCitizenId = escapeHtml(citizen?.id || "");
    const escapedRecordKey = escapeHtml(recordKey);

    if (workspaceId === "subscriptions") {
      const currentStatus = String(record.status || "PENDING").toUpperCase();
      const options = ["PAID", "PENDING", "OVERDUE", "SUSPENDED", "CANCELLED"];
      return `
        <div class="admin-direct-action-panel">
          <div class="admin-direct-action-panel__head">
            <p class="kicker">DIRECT ACTION / SUBSCRIPTION</p>
            <h6>Status Override</h6>
          </div>
          <form class="admin-direct-action-form" data-admin-subscription-action-form data-admin-citizen-id="${escapedCitizenId}" data-admin-record-key="${escapedRecordKey}">
            <label>Status
              <select name="status" required>
                ${options.map((status) => `<option value="${escapeHtml(status)}" ${status === currentStatus ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}
              </select>
            </label>
            <label class="admin-form-field--wide">Reason / Admin Note
              <textarea name="note" rows="3" placeholder="Why this subscription status is being changed." required></textarea>
            </label>
            <div class="admin-form-actions admin-form-field--wide">
              <button class="admin-inline-button" type="submit">Apply Subscription Action</button>
              <button class="admin-inline-button" type="button" data-admin-open-module="subscriptions">Open Subscription Module</button>
            </div>
          </form>
        </div>
      `;
    }

    if (workspaceId === "service") {
      const currentStatus = String(record.status || "ACTIVE").toUpperCase();
      const allowedTransitions = window.WS_APP.getCitizenServiceAllowedTransitions?.(citizen?.id || "", recordKey)
        || window.WS_APP.getCitizenServiceAllowedTransitionsForStatus?.(currentStatus)
        || [];
      const descriptor = window.WS_APP.getCitizenServiceLifecycleDescriptor?.(currentStatus) || { description: "", terminal: false };
      const revision = Math.max(1, Number(record.revision || 1));
      const isCommission = String(record.form || "").toUpperCase() === "COMMISSION";
      const amount = Number(record.amount || 0);
      const payoutStatus = String(record.payoutStatus || (isCommission && currentStatus === "COMPLETED" ? "PENDING" : "NOT_READY")).toUpperCase();
      const payoutLocked = payoutStatus === "SETTLED" || Boolean(String(record.payoutSettledAt || "").trim());
      const payoutDisabled = !isCommission || currentStatus !== "COMPLETED" || amount <= 0 || payoutLocked;
      const payoutStateOptions = payoutLocked
        ? `<option value="SETTLED" selected>SETTLED</option>`
        : `
                <option value="APPROVE" ${payoutStatus === "APPROVED" ? "selected" : ""}>APPROVE PAYOUT</option>
                <option value="REJECT" ${payoutStatus === "REJECTED" ? "selected" : ""}>REJECT PAYOUT</option>
                <option value="PENDING" ${!["APPROVED", "REJECTED"].includes(payoutStatus) ? "selected" : ""}>MARK PENDING</option>`;
      const payoutMeta = payoutLocked && record.payoutSettledAt ? ` / Settled: ${escapeHtml(record.payoutSettledAt)}` : "";
      const payoutPanel = isCommission ? `
        <div class="admin-direct-action-panel">
          <div class="admin-direct-action-panel__head">
            <p class="kicker">DIRECT ACTION / COMMISSION PAYOUT</p>
            <h6>One-Time Commission Payout</h6>
          </div>
          <form class="admin-direct-action-form" data-admin-service-payout-form data-admin-citizen-id="${escapedCitizenId}" data-admin-record-key="${escapedRecordKey}">
            <label>Current Payout State
              <select name="action" ${payoutDisabled ? "disabled" : ""} required>
                ${payoutStateOptions}
              </select>
            </label>
            <label class="admin-form-field--wide">Reason / Payout Note
              <textarea name="note" rows="3" placeholder="Why this one-time commission payout is approved or rejected." ${payoutDisabled ? "disabled" : ""} required>${escapeHtml(record.payoutNote || "")}</textarea>
            </label>
            <div class="admin-form-actions admin-form-field--wide">
              <button class="admin-inline-button" type="submit" ${payoutDisabled ? "disabled" : ""}>Apply Payout Action</button>
              <span class="admin-panel-note ${payoutDisabled ? "is-info" : ""}">Current: ${escapeHtml(payoutStatus)}${payoutMeta} / Value: ${adminFormatCredits(amount)}</span>
            </div>
          </form>
        </div>
      ` : "";
      const lifecycleAction = allowedTransitions.length ? `
          <form class="admin-direct-action-form" data-admin-service-action-form data-admin-citizen-id="${escapedCitizenId}" data-admin-record-key="${escapedRecordKey}" data-admin-record-revision="${escapeHtml(revision)}">
            <label>Allowed Next State
              <select name="status" required>
                ${allowedTransitions.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join("")}
              </select>
            </label>
            <label class="admin-form-field--wide">Reason / Admin Note
              <textarea name="note" rows="3" placeholder="Why this Citizen Service Log transition is being executed." required></textarea>
            </label>
            <div class="admin-form-actions admin-form-field--wide">
              <button class="admin-inline-button" type="submit">Apply Allowed Transition</button>
              <button class="admin-inline-button" type="button" data-admin-open-module="service">Open Service Module</button>
            </div>
          </form>
      ` : `
          <p class="admin-panel-note">${escapeHtml(descriptor.description || "This Service Log record is terminal.")} No further lifecycle transition is available.</p>
          <div class="admin-form-actions">
            <button class="admin-inline-button" type="button" data-admin-open-module="service">Open Service Module</button>
          </div>
      `;
      return `
        <div class="admin-direct-action-panel">
          <div class="admin-direct-action-panel__head">
            <p class="kicker">DIRECT ACTION / CITIZEN SERVICE LOG</p>
            <h6>Strict Lifecycle Transition</h6>
          </div>
          <p class="admin-panel-note">Current: ${escapeHtml(currentStatus)} / Revision: ${escapeHtml(revision)}. ${escapeHtml(descriptor.description || "")}</p>
          ${lifecycleAction}
        </div>
        ${payoutPanel}
      `;
    }

    if (workspaceId === "system-requests") {
      const currentStatus = String(record.status || "REVIEWED").toUpperCase();
      const options = ["REVIEWED", "APPROVED", "DENIED", "CLOSED"];
      return `
        <div class="admin-direct-action-panel">
          <div class="admin-direct-action-panel__head">
            <p class="kicker">DIRECT ACTION / SYSTEM REQUEST</p>
            <h6>Resolve Request</h6>
          </div>
          <form class="admin-direct-action-form" data-admin-request-resolution-form data-admin-citizen-id="${escapedCitizenId}" data-admin-record-key="${escapedRecordKey}">
            <label>Resolution
              <select name="status" required>
                ${options.map((status) => `<option value="${escapeHtml(status)}" ${status === currentStatus ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}
              </select>
            </label>
            <label class="admin-form-field--wide">Reason / Resolution Note
              <textarea name="note" rows="3" placeholder="Decision reason visible in request status notification." required>${escapeHtml(record.resolutionNote || "")}</textarea>
            </label>
            <div class="admin-form-actions admin-form-field--wide">
              <button class="admin-inline-button" type="submit">Resolve Request</button>
              <button class="admin-inline-button" type="button" data-admin-open-terminal-panel="requests">Open Request Queue</button>
            </div>
          </form>
        </div>
      `;
    }

    return "";
  }

  function bindAdminControlCenterActions(container, user) {
    if (window.WS_APP.adminActiveWorkspace === "subscriptions") {
      window.WS_APP.AdminSubscriptionsControl?.bind?.(container, user);
    }
    if (window.WS_APP.adminActiveWorkspace === "operations") {
      window.WS_APP.AdminOperationsControl?.bind?.(container, user);
    }
    if (window.WS_APP.adminActiveWorkspace === "catalog-management") {
      window.WS_APP.AdminCatalogManagementControl?.bind?.(container, user);
    }
    if (window.WS_APP.adminActiveWorkspace === "cyberware-runtime") {
      window.WS_APP.AdminCyberwareRuntimeControl?.bind?.(container, user);
    }

    container.querySelectorAll("[data-admin-workspace-target], [data-admin-open-workspace]").forEach((button) => {
      if (button.dataset.adminRuntimeBound === "workspace") return;
      button.dataset.adminRuntimeBound = "workspace";
      button.addEventListener("click", () => {
        const workspaceId = button.dataset.adminWorkspaceTarget || button.dataset.adminOpenWorkspace;
        renderAdminControlCenter(user, workspaceId);
      });
    });

    container.querySelectorAll("[data-admin-workspace-retry]").forEach((button) => {
      if (button.dataset.adminRuntimeBound === "retry") return;
      button.dataset.adminRuntimeBound = "retry";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const workspaceId = String(button.dataset.adminWorkspaceRetry || window.WS_APP.adminActiveWorkspace || "dashboard");
        const loader = window.WS_APP.AdminWorkspaceLoader;
        if (!loader?.retry) return;
        loader.retry(workspaceId).catch(() => {});
        renderAdminControlCenter(user, workspaceId);
      });
    });


    container.querySelectorAll("[data-admin-audit-filter]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.WS_APP.adminAuditFilter = String(button.dataset.adminAuditFilter || "ALL").toUpperCase();
        renderAdminControlCenter(user, "audit");
      });
    });

    container.querySelectorAll("[data-admin-audit-inspect]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.WS_APP.adminAuditSelectedEventId = String(button.dataset.adminAuditInspect || "");
        renderAdminControlCenter(user, "audit");
      });
    });

    container.querySelectorAll("[data-admin-audit-retry]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const retry = window.WS_APP.retryAdminAuditRecovery?.() || { ok: false, resultCode: "ADMIN_AUDIT_STORE_UNAVAILABLE" };
        appendAdminAuditEvent(user, {
          category: "ADMIN",
          action: retry.ok ? "ADMIN_AUDIT_RECOVERY_RETRIED" : "ADMIN_AUDIT_RECOVERY_FAILED",
          target: "ADMIN_AUDIT_STORE",
          summary: retry.ok ? `Recovered ${retry.recovered || 0} audit event(s).` : `Audit recovery failed: ${retry.resultCode || "UNKNOWN"}.`,
          resultCode: retry.resultCode || (retry.ok ? "ADMIN_AUDIT_RECOVERY_COMPLETE" : "ADMIN_AUDIT_RECOVERY_FAILED"),
          meta: retry
        });
        renderAdminControlCenter(user, "audit");
      });
    });

    container.querySelectorAll("[data-admin-open-module]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openAdminModuleRoute(button.dataset.adminOpenModule, user);
      });
    });

    container.querySelectorAll("[data-admin-open-terminal-panel]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openAdminTerminalRoute(button.dataset.adminOpenTerminalPanel || "inbox", user);
      });
    });


    container.querySelectorAll("[data-admin-generate-inbox-notifications]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const citizenId = getCurrentAdminSelectedCitizenId(user);
        const mode = String(container.querySelector("[data-admin-inbox-notification-mode]")?.value || "PLAYER").toUpperCase();
        const result = window.WS_APP.generateInboxNotifications?.(citizenId, { mode, createdBy: user?.login || "ADMIN" }) || { ok: false, count: 0, message: "Inbox notification generator unavailable." };
        setAdminEconomyState({ feedback: { tone: result.ok ? "info" : "error", message: result.message || `${result.count || 0} inbox notifications generated.` } });
        appendAdminAuditEvent(user, {
          category: "INBOX",
          action: result.ok ? "INBOX_NOTIFICATION_TEST_GENERATED" : "INBOX_NOTIFICATION_TEST_FAILED",
          citizenId,
          target: citizenId,
          summary: result.ok ? `${result.count || 0} ${result.mode || mode} inbox notification test entries generated for ${citizenId}.` : `Inbox notification test failed for ${citizenId}.`,
          meta: { count: result.count || 0, mode: result.mode || mode }
        });
        renderAdminControlCenter(user, "billing");
      });
    });

    container.querySelectorAll("[data-admin-citizen-selector]").forEach((select) => {
      select.addEventListener("change", () => {
        const workspaceId = select.dataset.adminCitizenWorkspace || window.WS_APP.adminActiveWorkspace || "dashboard";
        setAdminSelectedCitizenId(select.value, workspaceId);
        clearAdminSelectedRecord(workspaceId, select.value);
        renderAdminControlCenter(user, workspaceId);
      });
    });


    container.querySelectorAll("[data-admin-citizen-cleanup-preview]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const form = button.closest("[data-admin-citizen-cleanup-form]");
        if (!form) return;
        const citizenId = form.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        const data = new FormData(form);
        const mode = String(data.get("mode") || "CLEAR_SELECTED_SECTIONS").toUpperCase();
        const requestedSections = data.getAll("section").map((section) => String(section || "").trim()).filter(Boolean);
        const sections = mode === "RESET_TO_IDENTITY_BASELINE"
          ? (window.WS_APP.getCitizenRuntimeCleanupSections?.() || []).map((section) => section.id)
          : requestedSections;
        const preview = window.WS_APP.previewCitizenCleanup?.(citizenId, sections, { mode }) || { ok: false, reason: "ADMIN_DEPENDENCY_RESOLVER_MISSING", dependencies: [] };
        setAdminCitizenCleanupState(citizenId, {
          dependencyPreview: preview,
          feedback: {
            tone: preview.ok && !preview.blocked ? "info" : "error",
            message: preview.ok
              ? preview.blocked
                ? `Cleanup blocked by ${preview.counts?.blockers || 0} active dependencies.`
                : `Dependency preview clear. ${preview.counts?.warnings || 0} warning(s).`
              : `Dependency preview failed: ${preview.reason || "UNKNOWN"}.`
          }
        });
        renderAdminControlCenter(user, "citizens");
      });
    });

    container.querySelectorAll("[data-admin-citizen-cleanup-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const citizenId = form.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        const data = new FormData(form);
        const confirmed = String(data.get("confirm") || "") === "yes";
        const mode = String(data.get("mode") || "CLEAR_SELECTED_SECTIONS").toUpperCase();
        const reason = String(data.get("reason") || "Manual admin citizen runtime cleanup").trim();
        const requestedSections = data.getAll("section").map((section) => String(section || "").trim()).filter(Boolean);
        const sections = mode === "RESET_TO_IDENTITY_BASELINE"
          ? (window.WS_APP.getCitizenRuntimeCleanupSections?.() || []).map((section) => section.id)
          : requestedSections;
        const dependencyPreview = window.WS_APP.previewCitizenCleanup?.(citizenId, sections, { mode }) || { ok: false, reason: "ADMIN_DEPENDENCY_RESOLVER_MISSING", blocked: true, dependencies: [] };
        if (!dependencyPreview.ok || dependencyPreview.blocked) {
          setAdminCitizenCleanupState(citizenId, {
            dependencyPreview,
            feedback: {
              tone: "error",
              message: dependencyPreview.ok
                ? `Cleanup blocked by ${dependencyPreview.counts?.blockers || 0} active dependencies.`
                : `Cleanup dependency validation failed: ${dependencyPreview.reason || "UNKNOWN"}.`
            }
          });
          appendAdminAuditEvent(user, {
            category: "CITIZEN",
            action: "CITIZEN_RUNTIME_CLEANUP_BLOCKED",
            citizenId,
            target: citizenId,
            summary: `${citizenId} runtime cleanup blocked by dependency guard.`,
            meta: { mode, sections, blockers: dependencyPreview.blockers || [], reason }
          });
          renderAdminControlCenter(user, "citizens");
          return;
        }
        if (!confirmed) {
          setAdminCitizenCleanupState(citizenId, { feedback: { tone: "error", message: "Cleanup blocked: confirmation checkbox is required." } });
          renderAdminControlCenter(user, "citizens");
          return;
        }
        const result = window.WS_APP.applyCitizenRuntimeCleanup?.(citizenId, {
          mode,
          sections,
          reason,
          createdBy: user?.login || "ADMIN"
        }) || { ok: false, reason: "CLEANUP_API_MISSING" };
        const total = result.preview?.totalRecords || 0;
        setAdminCitizenCleanupState(citizenId, {
          dependencyPreview: result.ok ? null : dependencyPreview,
          feedback: {
            tone: result.ok ? "info" : "error",
            message: result.ok ? `Cleanup applied: ${total} records reset.` : `Cleanup failed: ${result.reason || "UNKNOWN"}.`
          }
        });
        appendAdminAuditEvent(user, {
          category: "CITIZEN",
          action: result.ok ? "CITIZEN_RUNTIME_CLEANUP" : "CITIZEN_RUNTIME_CLEANUP_FAILED",
          citizenId,
          target: citizenId,
          summary: result.ok ? `${citizenId} runtime cleanup applied. Mode: ${mode}. Sections: ${(result.preview?.sections || sections).join(", ")}. Reason: ${reason}` : `${citizenId} runtime cleanup failed: ${result.reason || "UNKNOWN"}.`,
          meta: { mode, sections: result.preview?.sections || sections, totalRecords: total, reason }
        });
        renderAdminControlCenter(user, "citizens");
      });
    });

    const selectAdminRecord = (source) => {
      if (!source) return;
      const workspaceId = source.dataset.adminWorkspaceId || window.WS_APP.adminActiveWorkspace || "dashboard";
      const citizenId = source.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
      const recordKey = source.dataset.adminRecordKey || "";
      if (!workspaceId || !citizenId || !recordKey) return;
      setAdminSelectedRecord(workspaceId, citizenId, recordKey);
      renderAdminControlCenter(user, workspaceId);
    };

    if (container.dataset.adminRecordDelegationBound !== "true") {
      container.dataset.adminRecordDelegationBound = "true";
      container.addEventListener("click", (event) => {
        const ignoredInteractive = event.target.closest("[data-admin-open-module], [data-admin-open-terminal-panel], [data-admin-subscription-status], [data-admin-service-status], [data-admin-request-status], [data-admin-open-selected-citizen-card], [data-admin-citizen-selector], button, a, input, select, textarea");
        if (ignoredInteractive) return;

        const card = event.target.closest("[data-admin-select-record]");
        if (!card || !container.contains(card)) return;
        event.preventDefault();
        selectAdminRecord(card);
      });
    }

    container.querySelectorAll("[data-admin-record-select-button]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectAdminRecord(button);
      });
    });

    container.querySelectorAll("[data-admin-select-record]").forEach((row) => {
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectAdminRecord(row);
        }
      });
    });

    container.querySelectorAll("[data-admin-subscription-action-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const citizenId = form.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        const subscriptionId = form.dataset.adminRecordKey || "";
        const data = new FormData(form);
        const status = String(data.get("status") || "PENDING").toUpperCase();
        const note = String(data.get("note") || "").trim();
        if (!note) {
          appendAdminAuditEvent(user, {
            category: "SUBSCRIPTION",
            action: "SUBSCRIPTION_ACTION_BLOCKED",
            citizenId,
            recordId: subscriptionId,
            target: subscriptionId,
            summary: `${citizenId} subscription ${subscriptionId} rejected: missing admin note.`
          });
          return;
        }
        if (!citizenId || !subscriptionId) return;
        const command = createAdminCommandEnvelope(user, "SUBSCRIPTION_DIRECT_ACTION", note, `${citizenId}:${subscriptionId}:${status}`);
        if (!command.ok) return;
        const updated = executeAdminSubscriptionStatusCommand(subscriptionId, status, {
          reason: note,
          createdBy: command.actor.actorId,
          source: "ADMIN_CONTROL",
          idempotencyKey: command.idempotencyKey,
          metadata: { adminNote: note, sourceCommand: command.sourceCommand }
        });
        if (!updated?.ok) {
          appendAdminAuditEvent(user, {
            category: "SUBSCRIPTION",
            action: "SUBSCRIPTION_DIRECT_ACTION_FAILED",
            citizenId,
            recordId: subscriptionId,
            target: subscriptionId,
            summary: `${citizenId} subscription ${subscriptionId} update failed: ${getAdminCommandResultCode(updated)}.`,
            meta: { status, note, resultCode: getAdminCommandResultCode(updated), idempotencyKey: command.idempotencyKey }
          });
          return;
        }
        appendAdminAuditEvent(user, {
          category: "SUBSCRIPTION",
          action: "SUBSCRIPTION_DIRECT_ACTION",
          citizenId,
          recordId: subscriptionId,
          target: subscriptionId,
          summary: `${citizenId} subscription ${subscriptionId} set to ${status}. Note: ${note}`,
          meta: { status, note }
        });
        renderAdminControlCenter(user, "subscriptions");
      });
    });

    container.querySelectorAll("[data-admin-service-action-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const citizenId = form.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        const recordId = form.dataset.adminRecordKey || "";
        const expectedRevision = Number(form.dataset.adminRecordRevision || 0) || undefined;
        const data = new FormData(form);
        const status = String(data.get("status") || "").toUpperCase();
        const note = String(data.get("note") || "").trim();
        if (!note) {
          appendAdminAuditEvent(user, {
            category: "SERVICE",
            action: "SERVICE_LOG_TRANSITION_BLOCKED",
            citizenId,
            recordId,
            target: recordId,
            summary: `${citizenId} Citizen Service Log ${recordId} transition rejected: missing admin note.`,
            meta: { status, resultCode: "ADMIN_NOTE_REQUIRED" }
          });
          return;
        }
        if (!citizenId || !recordId || !window.WS_APP.transitionCitizenServiceRecord) return;
        const command = createAdminCommandEnvelope(user, "SERVICE_LOG_TRANSITION", note, `${citizenId}:${recordId}:${status}:${expectedRevision || 0}`);
        if (!command.ok) return;
        const result = window.WS_APP.transitionCitizenServiceRecord(citizenId, recordId, status, {
          createdBy: command.actor.actorId,
          source: "ADMIN_CONTROL",
          reason: note,
          expectedRevision,
          idempotencyKey: command.idempotencyKey,
          correlationId: command.correlationId
        });
        if (!result?.ok) {
          appendAdminAuditEvent(user, {
            category: "SERVICE",
            action: "SERVICE_LOG_TRANSITION_FAILED",
            citizenId,
            recordId,
            target: recordId,
            summary: `${citizenId} Citizen Service Log ${recordId} transition failed: ${getAdminCommandResultCode(result, "SERVICE_LOG_TRANSITION_FAILED")}.`,
            meta: {
              status,
              note,
              resultCode: getAdminCommandResultCode(result, "SERVICE_LOG_TRANSITION_FAILED"),
              previousStatus: result?.previousStatus || "",
              allowedTransitions: result?.allowedTransitions || [],
              expectedRevision,
              actualRevision: result?.actualRevision || result?.revisionBefore || 0,
              idempotencyKey: command.idempotencyKey
            }
          });
          renderAdminControlCenter(user, "service");
          return;
        }
        appendAdminAuditEvent(user, {
          category: "SERVICE",
          action: "SERVICE_LOG_TRANSITION",
          citizenId,
          recordId,
          target: recordId,
          summary: `${citizenId} Citizen Service Log ${recordId}: ${result.previousStatus} → ${result.nextStatus}. Note: ${note}`,
          meta: {
            status: result.nextStatus,
            note,
            resultCode: result.resultCode,
            previousStatus: result.previousStatus,
            nextStatus: result.nextStatus,
            revisionBefore: result.revisionBefore,
            revisionAfter: result.revisionAfter,
            correlationId: result.correlationId,
            idempotencyKey: command.idempotencyKey,
            recordDomain: "CITIZEN_SERVICE_LOG"
          }
        });
        renderAdminControlCenter(user, "service");
      });
    });

    container.querySelectorAll("[data-admin-service-payout-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const citizenId = form.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        const recordId = form.dataset.adminRecordKey || "";
        const data = new FormData(form);
        const action = String(data.get("action") || "APPROVE").toUpperCase();
        const note = String(data.get("note") || "").trim();
        if (!note) {
          appendAdminAuditEvent(user, {
            category: "SERVICE",
            action: "SERVICE_PAYOUT_BLOCKED",
            citizenId,
            recordId,
            target: recordId,
            summary: `${citizenId} service payout ${recordId} rejected: missing payout note.`
          });
          return;
        }
        if (!citizenId || !recordId || !window.WS_APP.updateCitizenServicePayout) return;
        const result = window.WS_APP.updateCitizenServicePayout(citizenId, recordId, action, {
          createdBy: user?.login || "ADMIN",
          note
        });
        if (!result || result.ok === false) {
          appendAdminAuditEvent(user, {
            category: "SERVICE",
            action: "SERVICE_PAYOUT_BLOCKED",
            citizenId,
            recordId,
            target: recordId,
            summary: `${citizenId} service payout ${recordId} blocked: ${result?.reason || "NO_CHANGE"}. Requested: ${action}. Note: ${note}`,
            meta: { action, note, reason: result?.reason || "NO_CHANGE", incomeId: result?.incomeId || "" }
          });
          renderAdminControlCenter(user, "service");
          return;
        }
        appendAdminAuditEvent(user, {
          category: "SERVICE",
          action: "SERVICE_PAYOUT_DIRECT_ACTION",
          citizenId,
          recordId,
          target: recordId,
          summary: `${citizenId} service payout ${recordId} set to ${action}. Note: ${note}`,
          meta: { action, note, incomeId: result?.incomeId || "" }
        });
        renderAdminControlCenter(user, "service");
      });
    });


    container.querySelectorAll("[data-admin-service-select-offer]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const citizenId = button.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        const offerKey = button.dataset.adminServiceSelectOffer || "";
        if (!citizenId || !offerKey) return;
        setAdminServiceToolSelectedOffer(citizenId, offerKey);
        setAdminServiceToolFeedback(`Selected offer ${offerKey} for lifecycle editing.`, "info");
        renderAdminControlCenter(user, "service");
      });
    });

    container.querySelectorAll("[data-admin-service-regenerate]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const citizenId = button.dataset.adminServiceRegenerate || getCurrentAdminSelectedCitizenId(user);
        if (!citizenId) return;
        const week = getAdminCurrentSettlementWeek();
        window.WS_APP.clearCitizenWeeklyServiceOfferStates?.(citizenId, {
          settlementWeek: week,
          createdBy: user?.login || "ADMIN"
        });
        const citizen = window.WS_APP.getCitizenById?.(citizenId);
        const offers = getAdminServiceGeneratedOffers(citizen || {});
        window.WS_APP.syncCitizenServiceMarketOffers?.(citizenId, offers, week);
        setAdminServiceToolFeedback(`Regenerated service offer states for ${week || "current week"}.`, "info");
        appendAdminAuditEvent(user, {
          category: "SERVICE",
          action: "SERVICE_MARKET_REGENERATE",
          citizenId,
          target: citizenId,
          summary: `${citizenId} service market regenerated for ${week || "current week"}.`,
          meta: { settlementWeek: week, offers: offers.length }
        });
        renderAdminControlCenter(user, "service");
      });
    });

    container.querySelectorAll("[data-admin-service-offer-state-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const citizenId = form.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        const key = form.dataset.adminOfferKey || "";
        const data = new FormData(form);
        const status = String(data.get("status") || "AVAILABLE").toUpperCase();
        const reason = String(data.get("reason") || "Admin override").trim();
        if (!citizenId || !key) return;
        const result = window.WS_APP.setCitizenServiceOfferState?.(citizenId, {
          generatedOfferId: key,
          offerId: data.get("offerId") || key,
          templateId: data.get("templateId") || "",
          employerId: data.get("employerId") || "",
          employerType: data.get("employerType") || "",
          categoryId: data.get("categoryId") || "",
          workCharacterId: data.get("workCharacterId") || "",
          settlementWeek: data.get("settlementWeek") || getAdminCurrentSettlementWeek(),
          sourceType: data.get("sourceType") || "GENERATED_WEEKLY",
          title: data.get("title") || "",
          provider: data.get("provider") || "",
          status,
          reason
        }, {
          createdBy: user?.login || "ADMIN",
          reason
        });
        setAdminServiceToolFeedback(result ? `Offer state set to ${status}.` : "Offer state override failed.", result ? "info" : "error");
        appendAdminAuditEvent(user, {
          category: "SERVICE",
          action: "SERVICE_OFFER_STATE_OVERRIDE",
          citizenId,
          recordId: key,
          target: key,
          summary: `${citizenId} offer ${key} set to ${status}. Reason: ${reason}`,
          meta: { status, reason }
        });
        renderAdminControlCenter(user, "service");
      });
    });

    container.querySelectorAll("[data-admin-service-manual-offer-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const data = new FormData(form);
        const sourceType = String(data.get("sourceType") || "MANUAL_ADMIN").toUpperCase();
        const formType = String(data.get("form") || "COMMISSION").toUpperCase();
        const title = String(data.get("title") || "").trim();
        const provider = String(data.get("provider") || "LOCAL SERVICE REGISTRY").trim();
        const amount = adminParseCredits(data.get("amount") || 0);
        const dueDate = String(data.get("dueDate") || getAdminCurrentSettlementWeek() || "").trim();
        const durationWeeks = Number(data.get("durationWeeks") || 0);
        const offer = window.WS_APP.addServiceOffer?.({
          title,
          provider,
          providerClass: data.get("employerType") || "SYSTEM",
          employerType: data.get("employerType") || "SYSTEM",
          category: sourceType === "SYSTEM_MANDATORY" ? "MANDATORY" : "REGULAR",
          categoryId: data.get("categoryId") || "",
          workCharacterId: data.get("workCharacterId") || "",
          sourceType,
          targetCitizenId: data.get("targetCitizenId") || getCurrentAdminSelectedCitizenId(user),
          form: formType,
          amount,
          payment: amount,
          dueDate: formType === "COMMISSION" ? dueDate : "",
          durationWeeks: formType === "CONTRACT" ? Math.max(1, durationWeeks || 1) : 0,
          details: data.get("details") || "Manual admin service offer.",
          status: "AVAILABLE",
          createdBy: user?.login || "ADMIN"
        });
        setAdminServiceToolFeedback(offer ? `Manual service offer added: ${title || offer.title}.` : "Manual service offer failed validation.", offer ? "info" : "error");
        appendAdminAuditEvent(user, {
          category: "SERVICE",
          action: offer ? "SERVICE_MANUAL_OFFER_ADDED" : "SERVICE_MANUAL_OFFER_REJECTED",
          citizenId: getCurrentAdminSelectedCitizenId(user),
          recordId: offer?.id || "",
          target: offer?.id || title,
          summary: offer ? `Manual service offer added: ${offer.title}.` : `Manual service offer rejected: ${title || "NO_TITLE"}.`,
          meta: { sourceType, form: formType, amount }
        });
        renderAdminControlCenter(user, "service");
      });
    });

    container.querySelectorAll("[data-admin-service-reputation-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const citizenId = form.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        const data = new FormData(form);
        const employerId = String(data.get("employerId") || "").trim();
        const mode = String(data.get("mode") || "SET").toUpperCase();
        const value = Number(data.get("value") || 0);
        const note = String(data.get("note") || "").trim();
        if (!citizenId || !employerId || !note) return;
        const command = createAdminCommandEnvelope(user, "SERVICE_REPUTATION_OVERRIDE", note, `${citizenId}:${employerId}:${mode}`);
        if (!command.ok) return;
        const result = window.WS_APP.setCitizenServiceEmployerReputation?.(citizenId, employerId, value, {
          mode,
          createdBy: command.actor.actorId,
          source: "ADMIN_CONTROL",
          note,
          idempotencyKey: command.idempotencyKey
        });
        setAdminServiceToolFeedback(result ? `Employer reputation ${mode} ${value} applied.` : "Employer reputation override failed.", result ? "info" : "error");
        appendAdminAuditEvent(user, {
          category: "SERVICE",
          action: result ? "SERVICE_REPUTATION_OVERRIDE" : "SERVICE_REPUTATION_OVERRIDE_FAILED",
          citizenId,
          recordId: employerId,
          target: employerId,
          summary: result ? `${citizenId} employer reputation ${employerId} ${mode} ${value}. Note: ${note}` : `${citizenId} employer reputation override failed for ${employerId}.`,
          meta: { employerId, mode, value, note, resultCode: result ? "APPLIED" : "REPUTATION_UPDATE_FAILED", idempotencyKey: command.idempotencyKey }
        });
        renderAdminControlCenter(user, "service");
      });
    });


    container.querySelectorAll("[data-admin-request-resolution-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const citizenId = form.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        const requestId = form.dataset.adminRecordKey || "";
        const data = new FormData(form);
        const status = String(data.get("status") || "REVIEWED").toUpperCase();
        const note = String(data.get("note") || "").trim();
        if (!note) {
          appendAdminAuditEvent(user, {
            category: "REQUEST",
            action: "SYSTEM_REQUEST_ACTION_BLOCKED",
            citizenId,
            recordId: requestId,
            target: requestId,
            summary: `${citizenId} request ${requestId} rejected: missing resolution note.`
          });
          return;
        }
        if (!citizenId || !requestId || !window.WS_APP.updateServiceRequestStatus) return;
        const command = createAdminCommandEnvelope(user, "SYSTEM_REQUEST_RESOLUTION", note, `${citizenId}:${requestId}:${status}`);
        if (!command.ok) return;
        const updated = window.WS_APP.updateServiceRequestStatus(citizenId, requestId, status, {
          createdBy: command.actor.actorId,
          source: "ADMIN_CONTROL",
          note,
          idempotencyKey: command.idempotencyKey
        });
        if (!updated) {
          appendAdminAuditEvent(user, {
            category: "REQUEST",
            action: "SYSTEM_REQUEST_RESOLUTION_FAILED",
            citizenId,
            recordId: requestId,
            target: requestId,
            summary: `${citizenId} request ${requestId} resolution failed.`,
            meta: { status, note, resultCode: "REQUEST_STATUS_UPDATE_FAILED", idempotencyKey: command.idempotencyKey }
          });
          return;
        }
        appendAdminAuditEvent(user, {
          category: "REQUEST",
          action: "SYSTEM_REQUEST_RESOLVED",
          citizenId,
          recordId: requestId,
          target: requestId,
          summary: `${citizenId} request ${requestId} resolved as ${status}. Note: ${note}`,
          meta: { status, note }
        });
        renderAdminControlCenter(user, "system-requests");
      });
    });

    container.querySelectorAll("[data-admin-subscription-status]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const citizenId = button.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        const subscriptionId = button.dataset.adminRecordKey || "";
        const status = String(button.dataset.adminSubscriptionStatus || "PENDING").toUpperCase();
        if (!citizenId || !subscriptionId) return;
        const note = promptAdminQuickActionNote(`subscription ${subscriptionId} → ${status}`);
        const command = createAdminCommandEnvelope(user, "SUBSCRIPTION_QUICK_STATUS", note, `${citizenId}:${subscriptionId}:${status}`);
        if (!command.ok) return;
        const result = executeAdminSubscriptionStatusCommand(subscriptionId, status, {
          reason: note,
          createdBy: command.actor.actorId,
          source: "ADMIN_CONTROL",
          idempotencyKey: command.idempotencyKey,
          metadata: { adminNote: note, sourceCommand: command.sourceCommand }
        });
        if (!result?.ok) {
          appendAdminAuditEvent(user, {
            category: "SUBSCRIPTION",
            action: "SUBSCRIPTION_QUICK_STATUS_FAILED",
            citizenId,
            recordId: subscriptionId,
            target: subscriptionId,
            summary: `${citizenId} subscription ${subscriptionId} update failed: ${getAdminCommandResultCode(result)}.`,
            meta: { status, note, resultCode: getAdminCommandResultCode(result), idempotencyKey: command.idempotencyKey }
          });
          return;
        }
        appendAdminAuditEvent(user, {
          category: "SUBSCRIPTION",
          action: "SUBSCRIPTION_STATUS_UPDATED",
          citizenId,
          recordId: subscriptionId,
          target: subscriptionId,
          summary: `${citizenId} subscription ${subscriptionId} set to ${status}. Note: ${note}`,
          meta: { status, note, idempotencyKey: command.idempotencyKey }
        });
        renderAdminControlCenter(user, window.WS_APP.adminActiveWorkspace || "subscriptions");
      });
    });

    container.querySelectorAll("[data-admin-service-status]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const citizenId = button.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        const recordId = button.dataset.adminRecordKey || "";
        const status = String(button.dataset.adminServiceStatus || "").toUpperCase();
        const expectedRevision = Number(button.dataset.adminRecordRevision || 0) || undefined;
        if (!citizenId || !recordId || !window.WS_APP.transitionCitizenServiceRecord) return;
        const note = promptAdminQuickActionNote(`Citizen Service Log ${recordId} → ${status}`);
        const command = createAdminCommandEnvelope(user, "SERVICE_LOG_QUICK_TRANSITION", note, `${citizenId}:${recordId}:${status}:${expectedRevision || 0}`);
        if (!command.ok) return;
        const result = window.WS_APP.transitionCitizenServiceRecord(citizenId, recordId, status, {
          createdBy: command.actor.actorId,
          source: "ADMIN_CONTROL",
          reason: note,
          expectedRevision,
          idempotencyKey: command.idempotencyKey,
          correlationId: command.correlationId
        });
        appendAdminAuditEvent(user, {
          category: "SERVICE",
          action: result?.ok ? "SERVICE_LOG_QUICK_TRANSITION" : "SERVICE_LOG_QUICK_TRANSITION_FAILED",
          citizenId,
          recordId,
          target: recordId,
          summary: result?.ok
            ? `${citizenId} Citizen Service Log ${recordId}: ${result.previousStatus} → ${result.nextStatus}. Note: ${note}`
            : `${citizenId} Citizen Service Log ${recordId} transition failed: ${getAdminCommandResultCode(result, "SERVICE_LOG_TRANSITION_FAILED")}.`,
          meta: {
            status,
            note,
            resultCode: getAdminCommandResultCode(result, result?.ok ? "SERVICE_LOG_TRANSITION_SUCCEEDED" : "SERVICE_LOG_TRANSITION_FAILED"),
            previousStatus: result?.previousStatus || "",
            nextStatus: result?.nextStatus || status,
            revisionBefore: result?.revisionBefore || expectedRevision || 0,
            revisionAfter: result?.revisionAfter || 0,
            idempotencyKey: command.idempotencyKey,
            recordDomain: "CITIZEN_SERVICE_LOG"
          }
        });
        renderAdminControlCenter(user, window.WS_APP.adminActiveWorkspace || "service");
      });
    });

    container.querySelectorAll("[data-admin-request-status]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const citizenId = button.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        const requestId = button.dataset.adminRecordKey || "";
        const status = String(button.dataset.adminRequestStatus || "REVIEWED").toUpperCase();
        if (!citizenId || !requestId || !window.WS_APP.updateServiceRequestStatus) return;
        const note = promptAdminQuickActionNote(`request ${requestId} → ${status}`);
        const command = createAdminCommandEnvelope(user, "REQUEST_QUICK_STATUS", note, `${citizenId}:${requestId}:${status}`);
        if (!command.ok) return;
        const updated = window.WS_APP.updateServiceRequestStatus(citizenId, requestId, status, {
          createdBy: command.actor.actorId,
          source: "ADMIN_CONTROL",
          note,
          idempotencyKey: command.idempotencyKey
        });
        if (!updated) {
          appendAdminAuditEvent(user, {
            category: "REQUEST",
            action: "SYSTEM_REQUEST_QUICK_STATUS_FAILED",
            citizenId,
            recordId: requestId,
            target: requestId,
            summary: `${citizenId} request ${requestId} update failed.`,
            meta: { status, note, resultCode: "REQUEST_STATUS_UPDATE_FAILED", idempotencyKey: command.idempotencyKey }
          });
          return;
        }
        appendAdminAuditEvent(user, {
          category: "REQUEST",
          action: "SYSTEM_REQUEST_STATUS_UPDATED",
          citizenId,
          recordId: requestId,
          target: requestId,
          summary: `${citizenId} request ${requestId} set to ${status}. Note: ${note}`,
          meta: { status, note, idempotencyKey: command.idempotencyKey }
        });
        renderAdminControlCenter(user, window.WS_APP.adminActiveWorkspace || "system-requests");
      });
    });

    container.querySelectorAll("[data-admin-open-selected-citizen-card]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const citizenId = getCurrentAdminSelectedCitizenId(user);
        if (!citizenId || !window.WS_APP.openCitizenCard) return;
        window.WS_APP.pushModuleView?.(() => renderAdminControlCenter(user, window.WS_APP.adminActiveWorkspace || "dashboard"));
        window.WS_APP.openCitizenCard(citizenId, "citizen-cards");
      });
    });

    container.querySelectorAll("[data-admin-citizen-access-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const data = new FormData(form);
        const result = applyAdminCitizenAccessAction(
          user,
          form.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user),
          data.get("action"),
          data.get("tagId"),
          data.get("note"),
          { syncLinkedUser: data.get("syncLinkedUser") === "1" }
        );
        setAdminAccessToolState({ feedback: { tone: result.ok ? "info" : "error", message: result.message || "Access action processed." } });
        renderAdminControlCenter(user, "citizens");
      });
    });

    container.querySelectorAll("[data-admin-equipment-select-item]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const citizenId = button.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        setAdminEquipmentEditorState(citizenId, { selectedItemId: button.dataset.adminEquipmentSelectItem || "", mode: "edit", feedback: null });
        renderAdminControlCenter(user, "citizens");
      });
    });

    container.querySelectorAll("[data-admin-equipment-new]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const citizenId = button.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        setAdminEquipmentEditorState(citizenId, { selectedItemId: "", mode: "create", catalogTemplateId: "", feedback: null });
        renderAdminControlCenter(user, "citizens");
      });
    });


    container.querySelectorAll("[data-admin-equipment-catalog-select]").forEach((select) => {
      select.addEventListener("change", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const citizenId = select.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        setAdminEquipmentEditorState(citizenId, { catalogTemplateId: String(select.value || ""), mode: "create", selectedItemId: "", feedback: null });
        renderAdminControlCenter(user, "citizens");
      });
    });

    container.querySelectorAll("[data-admin-equipment-use-catalog]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const citizenId = button.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        const state = getAdminEquipmentEditorState(citizenId);
        const selectedCatalogId = state.catalogTemplateId || button.closest(".admin-equipment-catalog-panel")?.querySelector("[data-admin-equipment-catalog-select]")?.value || "";
        setAdminEquipmentEditorState(citizenId, { catalogTemplateId: selectedCatalogId, mode: "create", selectedItemId: "", feedback: selectedCatalogId ? { tone: "info", message: "Catalog template loaded into create form." } : { tone: "warning", message: "Select a catalog template first." } });
        renderAdminControlCenter(user, "citizens");
      });
    });

    container.querySelectorAll("[data-admin-equipment-dependency-preview]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const citizenId = button.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user);
        const itemId = button.dataset.adminEquipmentItemId || "";
        const preview = window.WS_APP.previewItemInstanceAdminDependencies?.(itemId, { action: "PREVIEW" }) || { ok: false, reason: "ADMIN_DEPENDENCY_RESOLVER_MISSING", dependencies: [] };
        setAdminEquipmentEditorState(citizenId, {
          dependencyPreview: preview,
          feedback: {
            tone: preview.ok && !preview.blocked ? "info" : "error",
            message: preview.ok
              ? preview.blocked
                ? `Item action blocked by ${preview.counts?.blockers || 0} active dependencies.`
                : `Item dependency preview clear. ${preview.counts?.warnings || 0} warning(s).`
              : `Item dependency preview failed: ${preview.reason || "UNKNOWN"}.`
          }
        });
        renderAdminControlCenter(user, "citizens");
      });
    });

    container.querySelectorAll("[data-admin-equipment-archive]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        archiveAdminEquipmentItem(button.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user), button.dataset.adminEquipmentItemId || "", user);
      });
    });

    container.querySelectorAll("[data-admin-equipment-restore]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        restoreAdminEquipmentItem(button.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user), button.dataset.adminEquipmentItemId || "", user);
      });
    });

    container.querySelectorAll("[data-admin-equipment-dispose]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        disposeAdminEquipmentItem(button.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user), button.dataset.adminEquipmentItemId || "", user);
      });
    });

    container.querySelectorAll("[data-admin-equipment-hard-delete]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteAdminEquipmentItem(button.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user), button.dataset.adminEquipmentItemId || "", user);
      });
    });

    container.querySelectorAll("[data-admin-equipment-editor-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        saveAdminEquipmentEditorForm(form, user);
      });
    });

    container.querySelectorAll("[data-admin-economy-form]").forEach((form) => {
      const syncSender = () => {
        const source = form.querySelector("[data-admin-economy-sender-source]");
        const custom = form.querySelector("[data-admin-economy-custom-sender]");
        const isCustom = String(source?.value || "") === "CUSTOM";
        if (custom) {
          custom.disabled = !isCustom;
          custom.required = isCustom;
          if (!isCustom) custom.value = "";
        }
      };
      form.querySelector("[data-admin-economy-sender-source]")?.addEventListener("change", syncSender);
      syncSender();

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const data = new FormData(form);
        const result = applyAdminEconomyAdjustment(
          user,
          form.dataset.adminCitizenId || getCurrentAdminSelectedCitizenId(user),
          data.get("target"),
          data.get("mode"),
          data.get("amount"),
          data.get("reason"),
          data.get("senderSource"),
          form.querySelector("[data-admin-economy-custom-sender]")?.value || "",
          data.get("visibility")
        );
        setAdminEconomyState({ feedback: { tone: result.ok ? "info" : "error", message: result.message || "Economy adjustment processed." } });
        renderAdminControlCenter(user, "billing");
      });
    });


    container.querySelectorAll("[data-admin-transfer-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const data = new FormData(form);
        const args = [
          user,
          data.get("sourceParty"),
          data.get("targetParty"),
          data.get("asset"),
          data.get("amount"),
          data.get("reason"),
          data.get("visibility")
        ];
        const prepared = previewAdminEconomyTransfer(...args);
        if (!prepared.ok) {
          setAdminEconomyState({ feedback: { tone: "error", message: prepared.message || "Billing transfer preview failed." } });
          renderAdminControlCenter(user, "billing");
          return;
        }
        const sourceLabel = prepared.preview.sourceLabel || getAdminTransferPartyLabel(prepared.sourceParty);
        const targetLabel = prepared.preview.targetLabel || getAdminTransferPartyLabel(prepared.targetParty);
        const sourceSnapshot = prepared.preview.sourceAccountSnapshot || {};
        const targetSnapshot = prepared.preview.targetAccountSnapshot || {};
        const field = prepared.asset === "DEBT" ? "debt" : "credits";
        const confirmed = await window.WS_APP.confirmAction?.({
          title: "ATOMIC BILLING TRANSFER",
          message: [
            `ASSET: ${prepared.asset}`,
            `AMOUNT: ${adminFormatCredits(prepared.amount)}`,
            `SOURCE: ${sourceLabel}`,
            `SOURCE ${prepared.asset}: ${adminFormatCredits(sourceSnapshot[`${field}Before`])} → ${adminFormatCredits(sourceSnapshot[`${field}After`])}`,
            `TARGET: ${targetLabel}`,
            `TARGET ${prepared.asset}: ${adminFormatCredits(targetSnapshot[`${field}Before`])} → ${adminFormatCredits(targetSnapshot[`${field}After`])}`,
            `NOTE: ${prepared.reason}`
          ].join("\n"),
          confirmLabel: "Execute Transfer",
          cancelLabel: "Cancel",
          tone: "danger"
        });
        if (!confirmed) return;
        const result = executeAdminEconomyTransfer(...args, prepared);
        setAdminEconomyState({ feedback: { tone: result.ok ? "info" : "error", message: result.message || "Billing transfer processed." } });
        renderAdminControlCenter(user, "billing");
      });
    });

    container.querySelectorAll("[data-admin-tag-family]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setAdminTagManagerState({ family: button.dataset.adminTagFamily || "access", mode: "list", recordId: "" });
        renderAdminControlCenter(user, "tags-access");
      });
    });

    container.querySelectorAll("[data-admin-create-access-tag]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setAdminTagManagerState({ family: "access", mode: "create", recordId: "" });
        renderAdminControlCenter(user, "tags-access");
      });
    });

    container.querySelectorAll("[data-admin-create-content-tag]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setAdminTagManagerState({ family: "content", mode: "create", recordId: "" });
        renderAdminControlCenter(user, "tags-access");
      });
    });

    container.querySelectorAll("[data-admin-edit-access-tag]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setAdminTagManagerState({ family: "access", mode: "edit", recordId: button.dataset.adminEditAccessTag || "" });
        renderAdminControlCenter(user, "tags-access");
      });
    });

    container.querySelectorAll("[data-admin-edit-content-tag]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setAdminTagManagerState({ family: "content", mode: "edit", recordId: button.dataset.adminEditContentTag || "" });
        renderAdminControlCenter(user, "tags-access");
      });
    });

    container.querySelectorAll("[data-admin-cancel-tag-form]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setAdminTagManagerState({ mode: "list", recordId: "" });
        renderAdminControlCenter(user, "tags-access");
      });
    });

    container.querySelectorAll("[data-admin-archive-access-tag], [data-admin-restore-access-tag]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const id = button.dataset.adminArchiveAccessTag || button.dataset.adminRestoreAccessTag || "";
        const archived = Boolean(button.dataset.adminArchiveAccessTag);
        if (id) {
          window.WS_APP.updateAccessTag?.(id, { archived });
          appendAdminAuditEvent(user, {
            category: "ACCESS",
            action: archived ? "ACCESS_TAG_DEACTIVATED" : "ACCESS_TAG_RESTORED",
            target: id,
            summary: `Access tag ${id} ${archived ? "deactivated" : "restored"}.`
          });
        }
        setAdminTagManagerState({ family: "access", mode: "list", recordId: "" });
        renderAdminControlCenter(user, "tags-access");
      });
    });

    container.querySelectorAll("[data-admin-archive-content-tag], [data-admin-restore-content-tag]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const id = button.dataset.adminArchiveContentTag || button.dataset.adminRestoreContentTag || "";
        if (id && button.dataset.adminArchiveContentTag) {
          window.WS_APP.archiveTag?.(id);
          appendAdminAuditEvent(user, { category: "CONTENT_TAG", action: "CONTENT_TAG_DEACTIVATED", target: id, summary: `Content tag ${id} deactivated.` });
        }
        if (id && button.dataset.adminRestoreContentTag) {
          window.WS_APP.restoreTag?.(id);
          appendAdminAuditEvent(user, { category: "CONTENT_TAG", action: "CONTENT_TAG_RESTORED", target: id, summary: `Content tag ${id} restored.` });
        }
        setAdminTagManagerState({ family: "content", mode: "list", recordId: "" });
        renderAdminControlCenter(user, "tags-access");
      });
    });

    container.querySelectorAll("[data-admin-access-matrix-target]").forEach((select) => {
      select.addEventListener("change", (event) => {
        event.stopPropagation();
        setAdminAccessMatrixState({ selectedTagId: select.value || "", feedback: null }, getAdminAccessTagsForManager());
        renderAdminControlCenter(user, "tags-access");
      });
    });

    container.querySelectorAll("[data-admin-reset-access-matrix]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setAdminAccessMatrixState({ feedback: null }, getAdminAccessTagsForManager());
        renderAdminControlCenter(user, "tags-access");
      });
    });

    container.querySelectorAll("[data-admin-access-matrix-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const data = new FormData(form);
        const accessTags = getAdminAccessTagsForManager();
        const id = String(form.dataset.adminTagId || "").trim();
        const tag = accessTags.find((item) => String(item.id || "") === id) || null;
        const relationEntries = Array.from(form.querySelectorAll('input[type="radio"][name^="relation::"]:checked'));
        const includes = [];
        const exclusiveWith = [];
        relationEntries.forEach((input) => {
          const tagId = String(input.name || "").replace(/^relation::/, "").trim().toUpperCase();
          const relation = String(input.value || "none").trim().toLowerCase();
          if (!tagId) return;
          if (relation === "include") includes.push(tagId);
          if (relation === "exclusive") exclusiveWith.push(tagId);
        });
        const payload = {
          rank: String(data.get("rank") || "").trim() === "" ? null : Number(data.get("rank")),
          includes: Array.from(new Set(includes)),
          exclusiveWith: Array.from(new Set(exclusiveWith)),
          requiresExplicitAssignment: data.get("requiresExplicitAssignment") === "on"
        };
        const errors = validateAdminAccessMatrixPayload(tag, payload, accessTags);
        if (errors.length) {
          setAdminAccessMatrixState({ selectedTagId: id, feedback: { tone: "error", message: errors.join(" ") } }, accessTags);
          renderAdminControlCenter(user, "tags-access");
          return;
        }
        window.WS_APP.updateAccessTag?.(id, payload);
        appendAdminAuditEvent(user, {
          category: "ACCESS_MATRIX",
          action: "ACCESS_MATRIX_UPDATED",
          target: id,
          summary: `Access Matrix updated for ${id}.`,
          meta: payload
        });
        setAdminAccessMatrixState({ selectedTagId: id, feedback: { tone: "info", message: `Matrix updated for ${id}.` } }, getAdminAccessTagsForManager());
        renderAdminControlCenter(user, "tags-access");
      });
    });

    container.querySelectorAll("[data-admin-access-tag-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const data = new FormData(form);
        const mode = form.dataset.adminTagMode || "create";
        const id = String(form.dataset.adminTagId || data.get("id") || "").trim();
        const payload = {
          id: String(data.get("id") || id || "").trim(),
          label: String(data.get("label") || "").trim(),
          type: String(data.get("type") || "custom").trim(),
          description: String(data.get("description") || "").trim(),
          requiresExplicitAssignment: data.get("requiresExplicitAssignment") === "on",
          adminOnly: data.get("adminOnly") === "on",
          archived: data.get("state") === "inactive"
        };

        if (mode === "edit" && id) {
          window.WS_APP.updateAccessTag?.(id, payload);
          appendAdminAuditEvent(user, { category: "ACCESS", action: "ACCESS_TAG_UPDATED", target: id, summary: `Access tag ${id} updated.` });
        }
        if (mode !== "edit") {
          window.WS_APP.createAccessTag?.(payload);
          appendAdminAuditEvent(user, { category: "ACCESS", action: "ACCESS_TAG_CREATED", target: payload.id, summary: `Access tag ${payload.id} created.` });
        }

        setAdminTagManagerState({ family: "access", mode: "list", recordId: "" });
        renderAdminControlCenter(user, "tags-access");
      });
    });

    container.querySelectorAll("[data-admin-content-tag-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const data = new FormData(form);
        const mode = form.dataset.adminTagMode || "create";
        const id = String(form.dataset.adminTagId || "").trim();
        const payload = {
          name: String(data.get("name") || "").trim(),
          type: String(data.get("type") || "SYSTEM").trim(),
          visibility: String(data.get("visibility") || "RESTRICTED").trim(),
          description: String(data.get("description") || "").trim(),
          gmNote: String(data.get("gmNote") || "").trim(),
          archived: data.get("state") === "inactive"
        };

        if (mode === "edit" && id) {
          window.WS_APP.updateTag?.(id, payload);
          appendAdminAuditEvent(user, { category: "CONTENT_TAG", action: "CONTENT_TAG_UPDATED", target: id, summary: `Content tag ${id} updated.` });
        }
        if (mode !== "edit") {
          const created = window.WS_APP.createTag?.(payload);
          const target = created?.id || payload.name || "content-tag";
          appendAdminAuditEvent(user, { category: "CONTENT_TAG", action: "CONTENT_TAG_CREATED", target, summary: `Content tag ${target} created.` });
        }

        setAdminTagManagerState({ family: "content", mode: "list", recordId: "" });
        renderAdminControlCenter(user, "tags-access");
      });
    });

    container.querySelector("[data-admin-open-data-io]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const viewportState = captureAdminViewportState();
      event.currentTarget?.blur?.();
      window.WS_APP.openDataIO?.({ source: "admin-control-center", preserveViewport: true });
      restoreAdminViewportState(viewportState);
      window.setTimeout(() => restoreAdminViewportState(viewportState), 0);
    });
  }

  function openAdminModuleRoute(moduleId, user) {
    const safeModuleId = String(moduleId || "").trim();
    if (!safeModuleId || user?.role !== "admin") return;

    const selectedCitizenId = getCurrentAdminSelectedCitizenId(user);
    if (selectedCitizenId) {
      window.WS_APP.terminalTargetCitizenId = selectedCitizenId;
      window.WS_APP.currentCitizenCardsSelectedId = selectedCitizenId;
    }

    const returnWorkspaceId = window.WS_APP.adminActiveWorkspace || "dashboard";
    beginAdminLegacyRoute(safeModuleId, returnWorkspaceId, {
      citizenId: selectedCitizenId,
      clearTerminalPanel: safeModuleId !== "terminal-hub"
    });

    window.WS_APP.resetModuleHistory?.();
    window.WS_APP.pushModuleView?.(() => returnToAdminControlCenter(user, returnWorkspaceId));
    window.WS_APP.openModule?.(safeModuleId, user, { skipLoader: true });
  }

  function openAdminTerminalRoute(panel, user) {
    const selectedCitizenId = getCurrentAdminSelectedCitizenId(user);
    if (selectedCitizenId) window.WS_APP.terminalTargetCitizenId = selectedCitizenId;
    window.WS_APP.terminalActivePanel = panel || "inbox";
    openAdminModuleRoute("terminal-hub", user);
  }

  function beginAdminLegacyRoute(moduleId, returnWorkspaceId, options = {}) {
    window.WS_APP.adminRouteReturnWorkspace = returnWorkspaceId || "dashboard";
    window.WS_APP.adminRouteOrigin = "admin-control-center";
    window.WS_APP.adminLegacyRouteActive = true;
    window.WS_APP.adminLegacyRouteModuleId = moduleId || "";
    if (options.citizenId) window.WS_APP.adminLegacyRouteCitizenId = options.citizenId;
    if (options.clearTerminalPanel) window.WS_APP.terminalActivePanel = "";
    setAdminLegacyRouteState(true);
  }

  function clearAdminRouteState(options = {}) {
    window.WS_APP.adminLegacyRouteActive = false;
    window.WS_APP.adminLegacyRouteModuleId = "";
    window.WS_APP.adminRouteOrigin = "";
    window.WS_APP.adminLegacyRouteCitizenId = "";
    if (!options.preserveRouteReturn) window.WS_APP.adminRouteReturnWorkspace = "";
    if (options.clearWorkspace) window.WS_APP.adminActiveWorkspace = "";
    if (options.clearCitizen) {
      window.WS_APP.currentCitizenCardsSelectedId = null;
    }
    if (options.clearTerminalPanel) window.WS_APP.terminalActivePanel = "";
    setAdminLegacyRouteState(false);
  }

  function setAdminLegacyRouteState(enabled) {
    const terminalGrid = document.querySelector(".terminal-grid");
    const modulePanel = document.querySelector(".module-panel-region");
    const isEnabled = Boolean(enabled);
    terminalGrid?.classList.toggle("is-admin-legacy-route", isEnabled);
    modulePanel?.classList.toggle("is-admin-legacy-route", isEnabled);
    document.body?.classList.toggle("is-admin-legacy-route", isEnabled);
  }

  function captureAdminViewportState() {
    return {
      x: window.scrollX || document.documentElement?.scrollLeft || 0,
      y: window.scrollY || document.documentElement?.scrollTop || 0
    };
  }

  function restoreAdminViewportState(state) {
    if (!state) return;
    window.requestAnimationFrame?.(() => window.scrollTo(state.x || 0, state.y || 0));
  }

  function getCurrentAdminSelectedCitizenId(user) {
    const workspaceId = window.WS_APP.adminActiveWorkspace || "dashboard";
    const groups = getAdminCitizenGroupsForWorkspace(workspaceId, user);
    if (groups.length) return getAdminSelectedCitizenId(workspaceId, groups);

    const citizens = getAdminCitizens();
    if (!citizens.length) return "";
    const current = String(window.WS_APP.adminSelectedCitizenId || "");
    if (citizens.some((citizen) => String(citizen.id || "") === current)) return current;
    const fallback = String(citizens[0]?.id || "");
    setAdminSelectedCitizenId(fallback, workspaceId);
    return fallback;
  }

  function setAdminSelectedCitizenId(citizenId, workspaceId = window.WS_APP.adminActiveWorkspace || "dashboard") {
    const safeCitizenId = String(citizenId || "");
    window.WS_APP.adminSelectedCitizenId = safeCitizenId;
    window.WS_APP.adminSelectedCitizenByWorkspace = window.WS_APP.adminSelectedCitizenByWorkspace || {};
    if (workspaceId) window.WS_APP.adminSelectedCitizenByWorkspace[workspaceId] = safeCitizenId;
    window.WS_APP.terminalTargetCitizenId = safeCitizenId;
    window.WS_APP.currentCitizenCardsSelectedId = safeCitizenId;
  }

  function getAdminDashboardMetrics(user) {
    const citizens = getAdminCitizens();
    const accessTags = window.WS_APP.getAccessTags?.() || window.APP_DATA?.accessTags || [];
    const contentTags = window.WS_APP.getTags?.({ includeArchived: false }) || window.APP_DATA?.tags || [];

    let openRequests = 0;
    let activeService = 0;
    let totalSubscriptions = 0;
    let activeSubscriptions = 0;

    citizens.forEach((citizen) => {
      const requests = window.WS_APP.getServiceRequests?.(citizen.id) || [];
      openRequests += requests.filter((request) => !["CLOSED", "DENIED", "ARCHIVED"].includes(String(request.status || "").toUpperCase())).length;

      const serviceLog = window.WS_APP.getCitizenServiceLog?.(citizen.id) || citizen.serviceLog || [];
      activeService += serviceLog.filter((entry) => String(entry.status || "").toUpperCase() === "ACTIVE").length;

      const subscriptions = Array.isArray(citizen.subscriptions) ? citizen.subscriptions : [];
      totalSubscriptions += subscriptions.length;
      activeSubscriptions += subscriptions.filter((item) => item.active && String(item.status || "").toUpperCase() !== "CANCELLED").length;
    });

    return {
      citizens: citizens.length,
      openRequests,
      activeService,
      accessTags: Array.isArray(accessTags) ? accessTags.length : 0,
      contentTags: Array.isArray(contentTags) ? contentTags.length : 0,
      totalSubscriptions,
      activeSubscriptions
    };
  }

  function getPriorityQueueRows(user) {
    const metrics = getAdminDashboardMetrics(user);
    const rows = [];
    if (metrics.openRequests > 0) rows.push(["System Requests", renderStateBadge("OPEN", "warning"), `${metrics.openRequests} awaiting review`, renderMiniAction("Review", "data-admin-open-workspace=\"system-requests\"")]);
    if (metrics.activeService > 0) rows.push(["Service", renderStateBadge("ACTIVE", "active"), `${metrics.activeService} active records`, renderMiniAction("Review", "data-admin-open-workspace=\"service\"")]);
    if (metrics.totalSubscriptions > 0) rows.push(["Subscriptions", renderStateBadge("SYNC", "active"), `${metrics.activeSubscriptions} / ${metrics.totalSubscriptions} active`, renderMiniAction("Review", "data-admin-open-workspace=\"subscriptions\"")]);
    rows.push(["Tags & Access", renderStateBadge("MATRIX", "active"), "Access/Clearance matrix visible in admin workspace", renderMiniAction("Open", "data-admin-open-workspace=\"tags-access\"")]);
    return rows;
  }

  function getAdminCitizens() {
    return (window.WS_APP.getCitizens?.() || [])
      .filter((citizen) => citizen && citizen.recordType !== "admin" && citizen.id !== "admin");
  }

  function getAdminCitizenGroupsForWorkspace(workspaceId, user) {
    if (workspaceId === "citizens") return getCitizenManagementGroups(user);
    if (workspaceId === "subscriptions") return getCitizenSubscriptionGroups(user);
    if (workspaceId === "service") return getCitizenServiceGroups(user);
    if (workspaceId === "billing") return getCitizenBillingGroups(user);
    if (workspaceId === "system-requests") return getCitizenRequestGroups(user);
    return [];
  }

  function getAdminSelectedCitizenGroupForWorkspace(workspaceId, user) {
    const groups = getAdminCitizenGroupsForWorkspace(workspaceId, user);
    if (!groups.length) return null;
    const selectedId = getAdminSelectedCitizenId(workspaceId, groups);
    return groups.find((group) => String(group.citizen?.id || "") === selectedId) || groups[0] || null;
  }


  function getAdminCitizenCleanupState(citizenId = "") {
    window.WS_APP.adminCitizenCleanupStateByCitizen = window.WS_APP.adminCitizenCleanupStateByCitizen || {};
    const key = String(citizenId || "");
    const state = window.WS_APP.adminCitizenCleanupStateByCitizen[key] || {};
    window.WS_APP.adminCitizenCleanupStateByCitizen[key] = {
      feedback: state.feedback && typeof state.feedback === "object" ? state.feedback : null,
      dependencyPreview: state.dependencyPreview && typeof state.dependencyPreview === "object" ? state.dependencyPreview : null
    };
    return window.WS_APP.adminCitizenCleanupStateByCitizen[key];
  }

  function setAdminCitizenCleanupState(citizenId = "", patch = {}) {
    const key = String(citizenId || "");
    if (!key) return getAdminCitizenCleanupState("");
    const current = getAdminCitizenCleanupState(key);
    window.WS_APP.adminCitizenCleanupStateByCitizen[key] = {
      ...current,
      ...patch,
      feedback: patch.feedback === undefined ? current.feedback : patch.feedback,
      dependencyPreview: patch.dependencyPreview === undefined ? current.dependencyPreview : patch.dependencyPreview
    };
    return window.WS_APP.adminCitizenCleanupStateByCitizen[key];
  }

  function renderAdminDependencyPreview(preview = null, emptyLabel = "No dependency preview generated.") {
    if (!preview || typeof preview !== "object") {
      return `<p class="admin-panel-note">${escapeHtml(emptyLabel)}</p>`;
    }
    if (preview.ok === false) {
      return `<p class="admin-panel-note is-error">Dependency preview failed: ${escapeHtml(preview.reason || "UNKNOWN")}.</p>`;
    }
    const dependencies = Array.isArray(preview.dependencies) ? preview.dependencies : [];
    const rows = dependencies.map((dependency) => [
      `<strong>${escapeHtml(dependency.domain || "DEPENDENCY")}</strong><small>${escapeHtml(dependency.code || "UNKNOWN")}</small>`,
      `<strong>${escapeHtml(dependency.recordId || "—")}</strong><small>${escapeHtml(dependency.recordType || "RECORD")}</small>`,
      renderStateBadge(dependency.severity || "INFORMATION", dependency.severity === "BLOCKER" ? "warning" : dependency.severity === "WARNING" ? "muted" : "active"),
      `<span>${escapeHtml(dependency.summary || "Dependency detected.")}</span>`
    ]);
    const counts = preview.counts || {};
    const headline = preview.blocked
      ? `<p class="admin-panel-note is-error">Blocked by ${escapeHtml(String(counts.blockers || 0))} active dependency record(s).</p>`
      : `<p class="admin-panel-note is-info">Dependency preview clear. Warnings: ${escapeHtml(String(counts.warnings || 0))}.</p>`;
    return `${headline}${renderAdminDataList(rows, ["Domain", "Record", "Severity", "Reason"], "No dependency records detected.")}`;
  }

  function renderAdminCitizenCleanupPanel(citizen = {}, user = window.WS_APP.currentUser) {
    const citizenId = String(citizen.id || "");
    const state = getAdminCitizenCleanupState(citizenId);
    const sections = window.WS_APP.getCitizenRuntimeCleanupSections?.() || [];
    const preview = window.WS_APP.buildCitizenRuntimeCleanupPreview?.(citizen, { mode: "RESET_TO_IDENTITY_BASELINE" }) || { rows: [], totalRecords: 0 };
    const defaultSections = new Set(["equipment", "cyberware", "subscriptions", "skills", "service", "work", "income", "files"]);
    const feedback = state.feedback?.message
      ? `<p class="admin-panel-note ${state.feedback.tone === "error" ? "is-error" : "is-info"}">${escapeHtml(state.feedback.message)}</p>`
      : "";
    const rows = (preview.rows || []).map((row) => [
      `<strong>${escapeHtml(row.label || row.id)}</strong><small>${escapeHtml(row.description || "")}</small>`,
      `<strong>${escapeHtml(String(row.count || 0))}</strong><small>current records</small>`,
      defaultSections.has(row.id) ? renderStateBadge("DEFAULT", "active") : renderStateBadge("OPTIONAL", "muted")
    ]);

    return `
      <section class="admin-workspace-panel admin-citizen-cleanup-panel">
        <div class="admin-panel-headline">
          <div>
            <p class="kicker">ADMIN / CITIZEN CLEANUP</p>
            <h5>Runtime State Cleanup</h5>
          </div>
          <span class="module-status-badge">${escapeHtml(String(preview.totalRecords || 0))} RECORDS</span>
        </div>
        <div class="admin-tag-manager-copy">
          <p><b>Citizen Runtime Cleanup</b> mutates the selected citizen record in the store. It does not hide data in renderers and does not edit catalog/database definitions.</p>
        </div>
        ${feedback}
        ${renderAdminDataList(rows, ["Section", "Detected", "Mode"], "No runtime sections detected for cleanup.")}
        <div class="admin-tag-manager-copy">
          <p><b>Dependency Guard</b> reads active World Bridge, Service, Market, Billing, Housing, ItemInstance and Subscription references before cleanup.</p>
        </div>
        ${renderAdminDependencyPreview(state.dependencyPreview, "Select sections and run dependency preview before applying cleanup.")}
        <form class="admin-direct-action-form" data-admin-citizen-cleanup-form data-admin-citizen-id="${escapeHtml(citizenId)}">
          <div class="admin-form-grid">
            <label>Cleanup Mode
              <select name="mode">
                <option value="CLEAR_SELECTED_SECTIONS" selected>Clear selected sections</option>
                <option value="RESET_TO_IDENTITY_BASELINE">Reset to identity baseline</option>
              </select>
            </label>
            <label class="admin-form-field--wide">Reason
              <input name="reason" type="text" value="Manual admin citizen runtime cleanup" />
            </label>
          </div>
          <div class="admin-checkbox-grid">
            ${sections.map((section) => `
              <label class="admin-form-checkbox">
                <input class="ui-select-control" type="checkbox" name="section" value="${escapeHtml(section.id)}" ${defaultSections.has(section.id) ? "checked" : ""} />
                <span>${escapeHtml(section.label)}</span>
              </label>
            `).join("")}
          </div>
          <label class="admin-form-checkbox admin-cleanup-confirm">
            <input class="ui-select-control" type="checkbox" name="confirm" value="yes" />
            <span>Confirm cleanup for ${escapeHtml(window.WS_APP.getCitizenDisplayName?.(citizen, { user, legal: true }) || citizen.legalName || citizenId)}</span>
          </label>
          <div class="admin-form-actions">
            <button class="admin-inline-button" type="button" data-admin-citizen-cleanup-preview>Preview Dependencies</button>
            <button class="admin-inline-button is-danger" type="submit">Apply Cleanup</button>
          </div>
        </form>
      </section>
    `;
  }

  const ADMIN_EQUIPMENT_FOOTPRINTS = ["1x1", "2x1", "3x1", "4x1", "1x2", "1x3", "2x2", "2x3", "2x4", "3x3"];
  const ADMIN_EQUIPMENT_LOCATION_KINDS = ["LAYER", "BODY_MOUNT", "ITEM_MOUNT", "CONTAINER", "STORED", "ARCHIVED"];
  const ADMIN_EQUIPMENT_STATUSES = ["OWNED", "ACTIVE", "LOCKED", "BROKEN", "CONFISCATED", "LOST", "ARCHIVED", "DESTROYED"];
  const ADMIN_EQUIPMENT_OPERATING_STATUSES = ["ACTIVE", "LOCKED", "OFFLINE", "BROKEN", "UNSUPPORTED", "DEGRADED"];
  const ADMIN_EQUIPMENT_LEGALITY = ["REGISTERED", "LICENSED", "RESTRICTED", "ILLEGAL", "UNREGISTERED", "CORPORATE", "SYSTEM"];
  const ADMIN_EQUIPMENT_CATEGORIES = ["DOCUMENT", "PERSONAL", "WEAPON", "MEDICAL", "TOOLS", "CONTAINER", "ARMOR", "CLOTHING", "SURVIVAL", "CYBERWARE", "UTILITY", "MISC"];

  function getAdminEquipmentEditorState(citizenId = "") {
    window.WS_APP.adminEquipmentEditorStateByCitizen = window.WS_APP.adminEquipmentEditorStateByCitizen || {};
    const key = String(citizenId || "");
    const state = window.WS_APP.adminEquipmentEditorStateByCitizen[key] || {};
    window.WS_APP.adminEquipmentEditorStateByCitizen[key] = {
      selectedItemId: String(state.selectedItemId || ""),
      mode: String(state.mode || "edit").toLowerCase() === "create" ? "create" : "edit",
      catalogTemplateId: String(state.catalogTemplateId || ""),
      feedback: state.feedback && typeof state.feedback === "object" ? state.feedback : null,
      dependencyPreview: state.dependencyPreview && typeof state.dependencyPreview === "object" ? state.dependencyPreview : null
    };
    return window.WS_APP.adminEquipmentEditorStateByCitizen[key];
  }

  function setAdminEquipmentEditorState(citizenId = "", patch = {}) {
    const key = String(citizenId || "");
    if (!key) return getAdminEquipmentEditorState("");
    const current = getAdminEquipmentEditorState(key);
    window.WS_APP.adminEquipmentEditorStateByCitizen[key] = {
      ...current,
      ...patch,
      feedback: patch.feedback === undefined ? current.feedback : patch.feedback,
      dependencyPreview: patch.dependencyPreview === undefined ? current.dependencyPreview : patch.dependencyPreview
    };
    return window.WS_APP.adminEquipmentEditorStateByCitizen[key];
  }

  const ADMIN_EQUIPMENT_BODY_REGIONS = ["HEAD", "NECK", "FACE", "IMPLANT_PORT", "LEFT_SHOULDER", "RIGHT_SHOULDER", "TORSO", "BACK", "LEFT_FOREARM", "RIGHT_FOREARM", "HANDS", "LEFT_HAND", "RIGHT_HAND", "WAIST", "LEFT_THIGH", "RIGHT_THIGH", "LEGS", "FEET"];
  const ADMIN_EQUIPMENT_BODY_LAYERS = ["INNER", "OUTER", "OUTERWEAR", "ARMOR", "FACE", "FOOTWEAR", "HELD"];

  function normalizeAdminEquipmentRegionKey(value = "") {
    if (typeof window.WS_APP.normalizeEquipmentBodyRegionKey === "function") return window.WS_APP.normalizeEquipmentBodyRegionKey(value);
    const normalized = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    return ADMIN_EQUIPMENT_BODY_REGIONS.includes(normalized) ? normalized : "";
  }

  function normalizeAdminEquipmentLayerKey(value = "") {
    if (typeof window.WS_APP.normalizeEquipmentBodyLayerKey === "function") return window.WS_APP.normalizeEquipmentBodyLayerKey(value);
    const normalized = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    return ADMIN_EQUIPMENT_BODY_LAYERS.includes(normalized) ? normalized : "";
  }

  function normalizeAdminEquipmentEquipProfile(source = {}) {
    const profile = source.equipProfile && typeof source.equipProfile === "object" && !Array.isArray(source.equipProfile) ? source.equipProfile : {};
    return {
      allowedAnchors: [...new Set((Array.isArray(profile.allowedAnchors) ? profile.allowedAnchors : []).map(normalizeAdminEquipmentRegionKey).filter(Boolean))],
      layer: normalizeAdminEquipmentLayerKey(profile.layer),
      coverage: [...new Set((Array.isArray(profile.coverage) ? profile.coverage : []).map(normalizeAdminEquipmentRegionKey).filter(Boolean))],
      bodyMountSets: Array.isArray(profile.bodyMountSets) ? profile.bodyMountSets : [],
      itemMountTypes: Array.isArray(profile.itemMountTypes) ? profile.itemMountTypes : [],
      handsRequired: Math.max(1, Math.min(2, Math.round(Number(profile.handsRequired || 1)) || 1)),
      countsAsBulkyCarrier: profile.countsAsBulkyCarrier === true,
      requires: Array.isArray(profile.requires) ? profile.requires : [],
      blocks: Array.isArray(profile.blocks) ? profile.blocks : []
    };
  }

  function normalizeAdminEquipmentSupportSlots(value = []) {
    const source = Array.isArray(value)
      ? value
      : value !== undefined && value !== null && value !== ""
        ? String(value).split(/[\n,]/)
        : [];
    return source.map((entry, index) => {
      if (typeof entry === "string") return entry.trim();
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return "";
      const key = String(entry.key || entry.id || entry.slot || entry.name || `slot-${index + 1}`).trim();
      return key ? { ...entry, key } : "";
    }).filter(Boolean);
  }

  function formatAdminEquipmentSupportSlots(value = []) {
    return normalizeAdminEquipmentSupportSlots(value).map((slot) => typeof slot === "string" ? slot : slot.key || "").filter(Boolean).join(", ");
  }


  function getAdminEquipmentItems(citizen = {}) {
    const items = typeof window.WS_APP.getCitizenEquipmentItemInstanceViews === "function"
      ? window.WS_APP.getCitizenEquipmentItemInstanceViews(citizen.id, { includeArchived: true })
      : [];
    return items.map((item, index) => normalizeAdminEquipmentItem(item, index));
  }

  function stripAdminEquipmentDerivedFields(item = {}) {
    const next = { ...item };
    [
      "isContainer", "isStored", "isEquipped", "isInGrid", "isOrphan", "isLocated", "isCarried", "isPacked",
      "rawLocation", "slots", "locationState", "effectiveFootprint", "placementSource",
      "unitId", "containerItemId", "equippedSlot", "bodySlotId", "gridPlacement", "storagePlacement"
    ].forEach((key) => delete next[key]);
    return next;
  }

  function normalizeAdminEquipmentItem(item = {}, index = 0) {
    const source = item && typeof item === "object" && !Array.isArray(item) ? item : {};
    if (typeof window.WS_APP.normalizeEquipmentItem === "function") {
      return window.WS_APP.normalizeEquipmentItem(source, index);
    }
    const footprint = ADMIN_EQUIPMENT_FOOTPRINTS.includes(String(source.footprint || source.size || "").toLowerCase())
      ? String(source.footprint || source.size).toLowerCase()
      : "1x1";
    const parts = footprint.split("x").map((part) => Number(part));
    return {
      ...source,
      id: String(source.id || source.itemId || `eq-admin-item-${index + 1}`).trim(),
      itemId: String(source.itemId || "").trim(),
      catalogId: String(source.catalogId || source.itemId || "").trim(),
      name: String(source.name || source.title || "Equipment Item").trim(),
      category: String(source.category || "MISC").trim().toUpperCase(),
      subtype: String(source.subtype || source.itemType || "").trim().toUpperCase(),
      footprint,
      width: Number.isFinite(parts[0]) ? parts[0] : 1,
      height: Number.isFinite(parts[1]) ? parts[1] : 1,
      equipProfile: normalizeAdminEquipmentEquipProfile(source),
      equippedLocation: source.equippedLocation || null,
      containerHostId: String(source.containerHostId || "").trim(),
      containerPlacement: source.containerPlacement || null,
      storageUnitId: String(source.storageUnitId || "").trim(),
      housingPlacement: source.housingPlacement || null,
      location: String(source.location || "ORPHAN").trim().toUpperCase(),
      supportSlots: normalizeAdminEquipmentSupportSlots(source.supportSlots || source.containerSlots || source.exposedSlots || []),
      quantity: Math.max(1, Math.round(Number(source.quantity || 1)) || 1),
      status: String(source.status || "OWNED").trim().toUpperCase(),
      operatingStatus: String(source.operatingStatus || source.operationStatus || "ACTIVE").trim().toUpperCase(),
      legality: String(source.legality || "UNREGISTERED").trim().toUpperCase(),
      condition: Math.max(0, Math.min(100, Math.round(Number(source.condition ?? 100)) || 0)),
      archived: source.archived === true
    };
  }


  function getAdminEquipmentCatalogItems() {
    return typeof window.WS_APP.getEquipmentCatalogItems === "function" ? window.WS_APP.getEquipmentCatalogItems() : [];
  }

  function getAdminEquipmentCatalogItemById(catalogId = "") {
    return typeof window.WS_APP.getEquipmentCatalogItemById === "function" ? window.WS_APP.getEquipmentCatalogItemById(catalogId) : null;
  }

  function buildAdminEquipmentItemFromCatalog(catalogId = "", citizen = {}) {
    if (typeof window.WS_APP.buildEquipmentItemFromCatalog !== "function") return null;
    return window.WS_APP.buildEquipmentItemFromCatalog(catalogId, citizen);
  }

  function renderAdminEquipmentCatalogOptionList(selectedId = "") {
    const catalog = getAdminEquipmentCatalogItems();
    const selected = String(selectedId || "");
    return [`<option value="">Catalog template</option>`]
      .concat(catalog.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === selected ? "selected" : ""}>${escapeHtml(item.name)} / ${escapeHtml(item.footprint)} / ${escapeHtml(item.category)}</option>`))
      .join("");
  }

  function renderAdminEquipmentCatalogPanel(citizen = {}, selectedTemplateId = "") {
    const catalog = getAdminEquipmentCatalogItems();
    const selected = selectedTemplateId ? getAdminEquipmentCatalogItemById(selectedTemplateId) : null;
    return `
      <section class="admin-equipment-catalog-panel" aria-label="Equipment Item Catalog">
        <div class="admin-equipment-catalog-panel__head">
          <div>
            <p class="kicker">EQUIPMENT / ITEM CATALOG</p>
            <h6>Catalog Templates</h6>
          </div>
          <span class="admin-equipment-catalog-count">${escapeHtml(catalog.length)} DEFINITIONS</span>
        </div>
        <div class="admin-equipment-catalog-controls">
          <label>Template
            <select data-admin-equipment-catalog-select data-admin-citizen-id="${escapeHtml(citizen.id || "")}">
              ${renderAdminEquipmentCatalogOptionList(selectedTemplateId)}
            </select>
          </label>
          <button class="admin-inline-button" type="button" data-admin-equipment-use-catalog data-admin-citizen-id="${escapeHtml(citizen.id || "")}" ${selected ? "" : "disabled"}>Use Template</button>
        </div>
        ${selected ? `
          <div class="admin-equipment-catalog-preview">
            <strong>${escapeHtml(selected.name)}</strong>
            <small>${escapeHtml(selected.category)} / ${escapeHtml(selected.subtype || "STANDARD")} / ${escapeHtml(selected.footprint)}</small>
            <span>${escapeHtml(selected.equipProfile?.allowedAnchors?.length ? `Anchors: ${selected.equipProfile.allowedAnchors.join(", ")} / ${selected.equipProfile.layer || "LAYER"}` : "Grid-only item")}</span>
            <span>${escapeHtml(selected.notes || "No catalog note.")}</span>
          </div>
        ` : `<p class="file-empty">No equipment catalog definitions loaded.</p>`}
      </section>
    `;
  }

  function getAdminSelectedEquipmentItem(citizen = {}) {
    const items = getAdminEquipmentItems(citizen);
    const state = getAdminEquipmentEditorState(citizen.id);
    return items.find((item) => item.id === state.selectedItemId) || items[0] || null;
  }

  function makeAdminEquipmentItemId(citizen = {}, name = "Equipment Item") {
    const base = adminMakeSlug(name || "equipment-item");
    const existing = new Set(getAdminEquipmentItems(citizen).map((item) => item.id));
    let candidate = `eq-${adminMakeSlug(citizen.id || "citizen")}-${base}`;
    let counter = 2;
    while (existing.has(candidate)) {
      candidate = `eq-${adminMakeSlug(citizen.id || "citizen")}-${base}-${counter}`;
      counter += 1;
    }
    return candidate;
  }

  function renderAdminOptionList(values = [], selected = "", emptyLabel = "—") {
    const normalizedSelected = String(selected || "").toUpperCase();
    return [`<option value="">${escapeHtml(emptyLabel)}</option>`]
      .concat(values.map((value) => `<option value="${escapeHtml(value)}" ${String(value).toUpperCase() === normalizedSelected ? "selected" : ""}>${escapeHtml(value)}</option>`))
      .join("");
  }

  function getAdminEquipmentLocationKind(item = {}) {
    if (item.archived === true) return "ARCHIVED";
    const kind = String(item.equippedLocation?.kind || "").trim().toUpperCase();
    if (["LAYER", "BODY_MOUNT", "ITEM_MOUNT"].includes(kind)) return kind;
    if (item.containerHostId && item.containerPlacement) return "CONTAINER";
    if (item.storageUnitId && item.housingPlacement) return "STORED";
    return "";
  }

  function formatAdminEquipmentLocation(item = {}) {
    const kind = getAdminEquipmentLocationKind(item);
    if (kind === "LAYER") return `BODY / ${item.equippedLocation.anchor} / ${item.equippedLocation.layer}`;
    if (kind === "BODY_MOUNT") return `BODY MOUNT / ${(item.equippedLocation.mountIds || []).join(" + ")}`;
    if (kind === "ITEM_MOUNT") return `ITEM MOUNT / ${item.equippedLocation.ownerItemId} / ${item.equippedLocation.mountId}`;
    if (kind === "CONTAINER") return `CONTAINER / ${item.containerHostId} / C${item.containerPlacement.column} R${item.containerPlacement.row}`;
    if (kind === "STORED") return `HOUSING / ${item.storageUnitId} / C${item.housingPlacement.column} R${item.housingPlacement.row}`;
    if (kind === "ARCHIVED") return "ARCHIVED";
    return "INVALID / ORPHAN";
  }

  function getAdminEquipmentLocationTargets(citizen = {}, currentItemId = "") {
    const equipmentState = typeof window.WS_APP.getEquipmentState === "function" ? window.WS_APP.getEquipmentState(citizen) : null;
    const containers = (equipmentState?.containers?.all || []).filter((item) => item.id !== currentItemId);
    const housingUnits = typeof window.WS_APP.getEquipmentHousingStorageUnits === "function"
      ? window.WS_APP.getEquipmentHousingStorageUnits(citizen)
      : [];
    const mountOwners = (equipmentState?.items || []).filter((item) => item.id !== currentItemId && Array.isArray(item.mountProfile?.slots) && item.mountProfile.slots.length);
    return { equipmentState, containers, housingUnits, mountOwners };
  }

  function renderAdminEquipmentItemRow(item = {}, selectedId = "") {
    const location = formatAdminEquipmentLocation(item);
    const tone = item.archived || item.status === "ARCHIVED" ? "muted" : ["BROKEN", "CONFISCATED", "LOST", "DESTROYED", "LOCKED"].includes(item.status) ? "locked" : "active";
    return makeAdminRecordRow(item.id, [
      `<strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.id)}</small>`,
      renderTagPills([item.category, item.subtype].filter(Boolean), "system"),
      escapeHtml(item.footprint),
      escapeHtml(location),
      renderStateBadge(item.status || "OWNED", tone),
      `<button class="admin-inline-button" type="button" data-admin-equipment-select-item="${escapeHtml(item.id)}" data-admin-citizen-id="${escapeHtml(String(item.citizenId || ""))}">${item.id === selectedId ? "Selected" : "Edit"}</button>`
    ], {
      type: "equipment item",
      title: item.name,
      subtitle: `${item.category} / ${item.footprint}`,
      status: item.status,
      details: [
        { label: "Category", value: item.category || "—" },
        { label: "Subtype", value: item.subtype || "—" },
        { label: "Size", value: item.footprint || "—" },
        { label: "Location", value: location },
        { label: "Status", value: item.status || "—" },
        { label: "Legality", value: item.legality || "—" }
      ]
    });
  }

  function renderAdminEquipmentEditorPanel(citizen = {}, user = window.WS_APP.currentUser) {
    const items = getAdminEquipmentItems(citizen).map((item) => ({ ...item, citizenId: citizen.id }));
    const state = getAdminEquipmentEditorState(citizen.id);
    const selectedItem = state.mode === "create" ? null : items.find((item) => item.id === state.selectedItemId) || items[0] || null;
    const selectedId = selectedItem?.id || "";
    const rows = items.map((item) => renderAdminEquipmentItemRow(item, selectedId));
    const capacityCount = items.filter((item) => ["MASS_COMPRESSION_CUBE", "CAPACITY_MODULE"].includes(String(item.subtype || "").toUpperCase()) || Number(item.capacitySlots || 0) > 0).length;
    const slottedCount = items.filter((item) => item.isEquipped).length;
    const storedCount = items.filter((item) => item.isStored).length;
    const gridCount = items.filter((item) => item.isInGrid).length;

    return `
      <section class="admin-workspace-panel admin-equipment-editor-panel">
        <div class="admin-panel-headline admin-equipment-editor-headline">
          <div>
            <p class="kicker">ADMIN / EQUIPMENT EDITOR</p>
            <h5>Equipment Registry Editor</h5>
          </div>
          <div class="admin-panel-actions">
            <button class="admin-inline-button" type="button" data-admin-equipment-new data-admin-citizen-id="${escapeHtml(citizen.id || "")}">New Item</button>
            ${renderModuleButton("Open Equipment Module", "equipment")}
          </div>
        </div>
        <div class="admin-equipment-metrics">
          ${renderAdminEquipmentMetric("Items", items.length)}
          ${renderAdminEquipmentMetric("Equipped", slottedCount)}
          ${renderAdminEquipmentMetric("Stored", storedCount)}
          ${renderAdminEquipmentMetric("Container Grid", gridCount)}
          ${renderAdminEquipmentMetric("Capacity", capacityCount)}
        </div>
        ${state.feedback ? `<div class="admin-equipment-feedback is-${escapeHtml(toClassToken(state.feedback.tone || "info"))}">${escapeHtml(state.feedback.message || "")}</div>` : ""}
        ${renderAdminEquipmentCatalogPanel(citizen, state.catalogTemplateId)}
        ${renderAdminDataList(rows, ["Item", "Type", "Size", "Location", "State", "Action"], "No equipment items registered for selected citizen.")}
        ${renderAdminEquipmentEditorForm(citizen, selectedItem, state.mode === "create")}
      </section>
    `;
  }

  function renderAdminEquipmentMetric(label, value) {
    return `<span class="admin-equipment-metric"><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b></span>`;
  }

  function renderAdminEquipmentEditorForm(citizen = {}, item = null, createMode = false) {
    const state = getAdminEquipmentEditorState(citizen.id);
    const templateItem = createMode && state.catalogTemplateId ? buildAdminEquipmentItemFromCatalog(state.catalogTemplateId, citizen) : null;
    const source = normalizeAdminEquipmentItem(item || templateItem || {
      id: "", name: "", category: "MISC", subtype: "", footprint: "1x1",
      equipProfile: { allowedAnchors: [], layer: "", coverage: [], bodyMountSets: [], itemMountTypes: [], handsRequired: 1, countsAsBulkyCarrier: false, requires: [], blocks: [] },
      supportSlots: [], quantity: 1, status: "OWNED", operatingStatus: "ACTIVE", legality: "UNREGISTERED", condition: 100,
      value: 0, capacityTier: 0, capacitySlots: 0, requiresSubscriptionCategory: "", requiresSubscriptionTier: 0,
      tags: [], notes: "", gmNote: "", archived: false
    });
    const targets = getAdminEquipmentLocationTargets(citizen, source.id);
    const sourceKind = getAdminEquipmentLocationKind(source);
    const defaultKind = sourceKind || (targets.containers[0] ? "CONTAINER" : targets.housingUnits[0] ? "STORED" : source.equipProfile?.layer ? "LAYER" : "");
    const modeLabel = createMode ? "Create Equipment Item" : `Edit ${source.name || source.id || "Equipment Item"}`;
    const equippedAnchor = source.equippedLocation?.kind === "LAYER" ? source.equippedLocation.anchor : source.equipProfile?.allowedAnchors?.[0] || "";
    const equippedLayer = source.equippedLocation?.kind === "LAYER" ? source.equippedLocation.layer : source.equipProfile?.layer || "";
    const bodyMountIds = source.equippedLocation?.kind === "BODY_MOUNT" ? (source.equippedLocation.mountIds || []).join(", ") : "";
    const ownerItemId = source.equippedLocation?.kind === "ITEM_MOUNT" ? source.equippedLocation.ownerItemId : "";
    const ownerMountId = source.equippedLocation?.kind === "ITEM_MOUNT" ? source.equippedLocation.mountId : "";
    const allowedAnchors = Array.isArray(source.equipProfile?.allowedAnchors) ? source.equipProfile.allowedAnchors.join(", ") : "";
    const coverage = Array.isArray(source.equipProfile?.coverage) ? source.equipProfile.coverage.join(", ") : "";
    const supportSlots = formatAdminEquipmentSupportSlots(source.supportSlots || []);
    const tags = Array.isArray(source.tags) ? source.tags.join(", ") : "";
    const containerId = source.containerHostId || targets.containers[0]?.id || "";
    const storageUnitId = source.storageUnitId || targets.housingUnits[0]?.id || "";
    const containerOptions = [`<option value="">NO CONTAINER</option>`].concat(targets.containers.map((entry) => `<option value="${escapeHtml(entry.id)}" ${entry.id === containerId ? "selected" : ""}>${escapeHtml(entry.name || entry.id)}</option>`)).join("");
    const housingOptions = [`<option value="">NO HOUSING GRID</option>`].concat(targets.housingUnits.map((entry) => `<option value="${escapeHtml(entry.id)}" ${entry.id === storageUnitId ? "selected" : ""}>${escapeHtml(entry.label || entry.id)} · ${escapeHtml(entry.width)}×${escapeHtml(entry.height)}</option>`)).join("");
    const ownerOptions = [`<option value="">NO MOUNT OWNER</option>`].concat(targets.mountOwners.map((entry) => `<option value="${escapeHtml(entry.id)}" ${entry.id === ownerItemId ? "selected" : ""}>${escapeHtml(entry.name || entry.id)}</option>`)).join("");
    return `
      <form class="admin-equipment-editor-form admin-direct-action-form" data-admin-equipment-editor-form data-admin-citizen-id="${escapeHtml(citizen.id || "")}" data-admin-equipment-mode="${createMode ? "create" : "edit"}" data-admin-equipment-item-id="${escapeHtml(source.id || "")}">
        <div class="admin-direct-action-panel__head"><p class="kicker">DIRECT ACTION / EQUIPMENT</p><h6>${escapeHtml(modeLabel)}</h6></div>
        <div class="admin-form-grid admin-equipment-form-grid">
          <label>Item ID<input name="id" type="text" value="${escapeHtml(source.id || "")}" placeholder="auto-generated" ${createMode ? "" : "readonly"} /></label>
          <label>Catalog ID<input name="catalogId" type="text" value="${escapeHtml(source.catalogId || source.itemId || "")}" placeholder="eqcat-..." /></label>
          <label>Name<input name="name" type="text" value="${escapeHtml(source.name || "")}" required /></label>
          <label>Category<select name="category">${renderAdminOptionList(ADMIN_EQUIPMENT_CATEGORIES, source.category || "MISC", "Category")}</select></label>
          <label>Subtype<input name="subtype" type="text" value="${escapeHtml(source.subtype || "")}" /></label>
          <label>Size<select name="footprint">${renderAdminOptionList(ADMIN_EQUIPMENT_FOOTPRINTS, source.footprint || "1x1", "Size")}</select></label>
          <label>Physical Location<select name="locationKind" required>${renderAdminOptionList(ADMIN_EQUIPMENT_LOCATION_KINDS, defaultKind, "Select physical location")}</select></label>
          <label>Layer Anchor<select name="equippedAnchor">${renderAdminOptionList(ADMIN_EQUIPMENT_BODY_REGIONS, equippedAnchor, "No body anchor")}</select></label>
          <label>Layer<select name="equippedLayer">${renderAdminOptionList(ADMIN_EQUIPMENT_BODY_LAYERS, equippedLayer, "No body layer")}</select></label>
          <label>Body Mount IDs<input name="bodyMountIds" type="text" value="${escapeHtml(bodyMountIds)}" placeholder="BACK_CARRY, LEFT_SHOULDER_CARRY" /></label>
          <label>Item Mount Owner<select name="itemMountOwnerId">${ownerOptions}</select></label>
          <label>Item Mount ID<input name="itemMountId" type="text" value="${escapeHtml(ownerMountId)}" placeholder="CHEST_RIG / HOLSTER" /></label>
          <label>Container Grid<select name="containerHostId">${containerOptions}</select></label>
          <label>Container Column<input name="containerColumn" type="number" min="1" value="${escapeHtml(source.containerPlacement?.column || 1)}" /></label>
          <label>Container Row<input name="containerRow" type="number" min="1" value="${escapeHtml(source.containerPlacement?.row || 1)}" /></label>
          <label>Container Rotation<select name="containerRotation"><option value="0" ${Number(source.containerPlacement?.rotation) === 90 ? "" : "selected"}>0°</option><option value="90" ${Number(source.containerPlacement?.rotation) === 90 ? "selected" : ""}>90°</option></select></label>
          <label>Housing Grid<select name="storageUnitId">${housingOptions}</select></label>
          <label>Housing Column<input name="housingColumn" type="number" min="1" value="${escapeHtml(source.housingPlacement?.column || 1)}" /></label>
          <label>Housing Row<input name="housingRow" type="number" min="1" value="${escapeHtml(source.housingPlacement?.row || 1)}" /></label>
          <label>Housing Rotation<select name="housingRotation"><option value="0" ${Number(source.housingPlacement?.rotation) === 90 ? "" : "selected"}>0°</option><option value="90" ${Number(source.housingPlacement?.rotation) === 90 ? "selected" : ""}>90°</option></select></label>
          <label>Allowed Anchors<input name="allowedAnchors" type="text" value="${escapeHtml(allowedAnchors)}" placeholder="TORSO, LEGS" /></label>
          <label>Mechanical Coverage<input name="coverage" type="text" value="${escapeHtml(coverage)}" placeholder="HEAD, LEGS" /></label>
          <label>Container Slots<input name="supportSlots" type="text" value="${escapeHtml(supportSlots)}" /></label>
          <label>Status<select name="status">${renderAdminOptionList(ADMIN_EQUIPMENT_STATUSES, source.status || "OWNED", "Status")}</select></label>
          <label>Operating<select name="operatingStatus">${renderAdminOptionList(ADMIN_EQUIPMENT_OPERATING_STATUSES, source.operatingStatus || "ACTIVE", "Operating")}</select></label>
          <label>Legality<select name="legality">${renderAdminOptionList(ADMIN_EQUIPMENT_LEGALITY, source.legality || "UNREGISTERED", "Legality")}</select></label>
          <label>Condition<input name="condition" type="number" min="0" max="100" value="${escapeHtml(source.condition ?? 100)}" /></label>
          <label>Value<input name="value" type="number" value="${escapeHtml(source.value || 0)}" /></label>
          <label>Quantity<input name="quantity" type="number" min="1" value="${escapeHtml(source.quantity || 1)}" /></label>
          <label>Capacity Tier<input name="capacityTier" type="number" min="0" value="${escapeHtml(source.capacityTier || 0)}" /></label>
          <label>Capacity Slots<input name="capacitySlots" type="number" min="0" value="${escapeHtml(source.capacitySlots || 0)}" /></label>
          <label>Required Sub Category<input name="requiresSubscriptionCategory" type="text" value="${escapeHtml(source.requiresSubscriptionCategory || "")}" /></label>
          <label>Required Sub Tier<input name="requiresSubscriptionTier" type="number" min="0" value="${escapeHtml(source.requiresSubscriptionTier || 0)}" /></label>
          <label>Tags<input name="tags" type="text" value="${escapeHtml(tags)}" /></label>
          <label class="admin-form-field--wide">Notes<textarea name="notes" rows="3">${escapeHtml(source.notes || "")}</textarea></label>
          <label class="admin-form-field--wide">GM Note<textarea name="gmNote" rows="3">${escapeHtml(source.gmNote || "")}</textarea></label>
        </div>
        ${!createMode && source.id ? `<div class="admin-tag-manager-copy"><p><b>Item Dependency Guard</b> checks physical children, BODY/SERVICE custody, World Bridge claims, Service, Market, Housing, transaction and subscription references.</p></div>${renderAdminDependencyPreview(state.dependencyPreview, "Run dependency preview before archive or hard delete.")}` : ""}
        <div class="admin-equipment-editor-actions">
          <button class="admin-inline-button" type="submit">${createMode ? "Create Item" : "Save Item"}</button>
          ${!createMode && source.id ? `<button class="admin-inline-button" type="button" data-admin-equipment-dependency-preview data-admin-citizen-id="${escapeHtml(citizen.id || "")}" data-admin-equipment-item-id="${escapeHtml(source.id)}">Preview Dependencies</button>${source.recordState === "ARCHIVED" ? `<button class="admin-inline-button" type="button" data-admin-equipment-restore data-admin-citizen-id="${escapeHtml(citizen.id || "")}" data-admin-equipment-item-id="${escapeHtml(source.id)}">Restore Item</button><button class="admin-inline-button is-danger" type="button" data-admin-equipment-hard-delete data-admin-citizen-id="${escapeHtml(citizen.id || "")}" data-admin-equipment-item-id="${escapeHtml(source.id)}">Hard Delete</button>` : source.lifecycleState === "DISPOSED" || source.disposed === true ? `<button class="admin-inline-button is-danger" type="button" data-admin-equipment-hard-delete data-admin-citizen-id="${escapeHtml(citizen.id || "")}" data-admin-equipment-item-id="${escapeHtml(source.id)}">Hard Delete</button>` : `<button class="admin-inline-button" type="button" data-admin-equipment-archive data-admin-citizen-id="${escapeHtml(citizen.id || "")}" data-admin-equipment-item-id="${escapeHtml(source.id)}">Archive Item</button><button class="admin-inline-button is-danger" type="button" data-admin-equipment-dispose data-admin-citizen-id="${escapeHtml(citizen.id || "")}" data-admin-equipment-item-id="${escapeHtml(source.id)}">Dispose Item</button>`}` : ""}
        </div>
      </form>
    `;
  }


  function parseAdminEquipmentCsv(value = "") {
    return String(value || "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function parseAdminNullableInteger(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const number = Number(raw);
    return Number.isFinite(number) ? Math.round(number) : null;
  }

  function readAdminEquipmentFormPayload(form, citizen = {}, currentItem = null) {
    const data = new FormData(form);
    const mode = String(form.dataset.adminEquipmentMode || "edit").toLowerCase();
    const name = String(data.get("name") || "Equipment Item").trim();
    const id = mode === "create" ? String(data.get("id") || "").trim() || makeAdminEquipmentItemId(citizen, name) : String(form.dataset.adminEquipmentItemId || currentItem?.id || "").trim();
    const footprint = String(data.get("footprint") || "1x1").trim().toLowerCase();
    const parts = footprint.split("x").map((part) => Number(part));
    const equippedAnchor = normalizeAdminEquipmentRegionKey(data.get("equippedAnchor"));
    const equippedLayer = normalizeAdminEquipmentLayerKey(data.get("equippedLayer"));
    const allowedAnchors = parseAdminEquipmentCsv(data.get("allowedAnchors")).map(normalizeAdminEquipmentRegionKey).filter(Boolean);
    const coverage = parseAdminEquipmentCsv(data.get("coverage")).map(normalizeAdminEquipmentRegionKey).filter(Boolean);
    const locationKind = String(data.get("locationKind") || "").trim().toUpperCase();
    const bodyMountIds = parseAdminEquipmentCsv(data.get("bodyMountIds")).map((entry) => String(entry).trim().replace(/[\s-]+/g, "_").toUpperCase()).filter(Boolean);
    let equippedLocation = null;
    let containerHostId = "";
    let containerPlacement = null;
    let storageUnitId = "";
    let housingPlacement = null;
    if (locationKind === "LAYER") equippedLocation = equippedAnchor && equippedLayer ? { kind: "LAYER", anchor: equippedAnchor, layer: equippedLayer, coverage } : null;
    if (locationKind === "BODY_MOUNT") equippedLocation = bodyMountIds.length ? { kind: "BODY_MOUNT", primaryMountId: bodyMountIds[0], mountIds: bodyMountIds } : null;
    if (locationKind === "ITEM_MOUNT") {
      const ownerItemId = String(data.get("itemMountOwnerId") || "").trim();
      const mountId = String(data.get("itemMountId") || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
      equippedLocation = ownerItemId && mountId ? { kind: "ITEM_MOUNT", ownerItemId, mountId } : null;
    }
    if (locationKind === "CONTAINER") {
      containerHostId = String(data.get("containerHostId") || "").trim();
      if (containerHostId) containerPlacement = { containerId: containerHostId, column: Math.max(1, Number(data.get("containerColumn") || 1)), row: Math.max(1, Number(data.get("containerRow") || 1)), rotation: Number(data.get("containerRotation")) === 90 ? 90 : 0 };
    }
    if (locationKind === "STORED") {
      storageUnitId = String(data.get("storageUnitId") || "").trim();
      if (storageUnitId) housingPlacement = { storageUnitId, column: Math.max(1, Number(data.get("housingColumn") || 1)), row: Math.max(1, Number(data.get("housingRow") || 1)), rotation: Number(data.get("housingRotation")) === 90 ? 90 : 0 };
    }
    const base = stripAdminEquipmentDerivedFields(currentItem || {});
    const payload = {
      ...base,
      id,
      itemId: String(data.get("catalogId") || currentItem?.itemId || id).trim(),
      catalogId: String(data.get("catalogId") || currentItem?.catalogId || currentItem?.itemId || "").trim(),
      name,
      category: String(data.get("category") || "MISC").trim().toUpperCase(),
      subtype: String(data.get("subtype") || "").trim().toUpperCase(),
      footprint,
      width: Number.isFinite(parts[0]) ? parts[0] : 1,
      height: Number.isFinite(parts[1]) ? parts[1] : 1,
      location: locationKind === "STORED" ? "STORED" : locationKind === "CONTAINER" ? "CONTAINER" : locationKind === "ARCHIVED" ? "ARCHIVED" : "EQUIPPED",
      equippedLocation,
      containerHostId,
      containerPlacement,
      storageUnitId,
      housingPlacement,
      equipProfile: {
        allowedAnchors,
        layer: equippedLayer || normalizeAdminEquipmentLayerKey(currentItem?.equipProfile?.layer),
        coverage,
        bodyMountSets: Array.isArray(currentItem?.equipProfile?.bodyMountSets) ? currentItem.equipProfile.bodyMountSets : [],
        itemMountTypes: Array.isArray(currentItem?.equipProfile?.itemMountTypes) ? currentItem.equipProfile.itemMountTypes : [],
        handsRequired: Math.max(1, Math.min(2, Math.round(Number(currentItem?.equipProfile?.handsRequired || 1)) || 1)),
        countsAsBulkyCarrier: currentItem?.equipProfile?.countsAsBulkyCarrier === true,
        requires: Array.isArray(currentItem?.equipProfile?.requires) ? currentItem.equipProfile.requires : [],
        blocks: Array.isArray(currentItem?.equipProfile?.blocks) ? currentItem.equipProfile.blocks : []
      },
      mountProfile: currentItem?.mountProfile && typeof currentItem.mountProfile === "object" ? currentItem.mountProfile : null,
      supportSlots: normalizeAdminEquipmentSupportSlots(data.get("supportSlots")),
      quantity: Math.max(1, Math.round(Number(data.get("quantity") || 1)) || 1),
      status: locationKind === "ARCHIVED" ? "ARCHIVED" : String(data.get("status") || "OWNED").trim().toUpperCase(),
      operatingStatus: String(data.get("operatingStatus") || "ACTIVE").trim().toUpperCase(),
      legality: String(data.get("legality") || "UNREGISTERED").trim().toUpperCase(),
      condition: Math.max(0, Math.min(100, Math.round(Number(data.get("condition") ?? 100)) || 0)),
      value: adminParseCredits(data.get("value") || 0),
      capacityTier: Math.max(0, Math.round(Number(data.get("capacityTier") || 0)) || 0),
      capacitySlots: Math.max(0, Math.round(Number(data.get("capacitySlots") || 0)) || 0),
      requiresSubscriptionCategory: String(data.get("requiresSubscriptionCategory") || "").trim().toUpperCase(),
      requiresSubscriptionTier: Math.max(0, Math.round(Number(data.get("requiresSubscriptionTier") || 0)) || 0),
      restrictions: currentItem?.restrictions && typeof currentItem.restrictions === "object" ? currentItem.restrictions : {},
      tags: parseAdminEquipmentCsv(data.get("tags")),
      notes: String(data.get("notes") || "").trim(),
      gmNote: String(data.get("gmNote") || "").trim(),
      archived: locationKind === "ARCHIVED"
    };
    return stripAdminEquipmentDerivedFields(payload);
  }

  function validateAdminEquipmentCandidate(citizen = {}, nextItems = [], itemId = "") {
    const candidate = { ...citizen };
    const rawItem = nextItems.find((entry, index) => normalizeAdminEquipmentItem(entry, index).id === itemId) || null;
    if (rawItem?.archived === true) return { ok: true, state: null, item: normalizeAdminEquipmentItem(rawItem), candidate };
    const state = typeof window.WS_APP.getEquipmentState === "function" ? window.WS_APP.getEquipmentState(candidate, { items: nextItems }) : null;
    const item = state?.itemById?.[itemId] || null;
    if (!state || !item) return { ok: false, message: "Canonical Equipment state could not be built." };
    if (item.isOrphan) return { ok: false, message: "Selected location is incomplete. Equipment item would become an orphan." };
    const conflict = (state.bodyConflicts || []).find((entry) => entry?.existing?.itemId === itemId || entry?.incoming?.itemId === itemId);
    if (conflict) return { ok: false, message: `Equipment occupancy conflict: ${conflict.key || conflict.kind || "UNKNOWN"}.` };
    if (item.isEquipped && item.equippedLocation?.kind === "LAYER") {
      const profile = item.equipProfile || {};
      if (profile.layer !== item.equippedLocation.layer || !profile.allowedAnchors?.includes(item.equippedLocation.anchor)) {
        return { ok: false, message: "Layer assignment is not declared by the item's equipProfile." };
      }
    }
    if (item.isEquipped && item.equippedLocation?.kind === "BODY_MOUNT") {
      const requested = [...(item.equippedLocation.mountIds || [])].sort().join("+");
      const mountSet = (item.equipProfile?.bodyMountSets || []).find((entry) => [...(entry.mountIds || [])].sort().join("+") === requested);
      if (!mountSet) return { ok: false, message: "Body-mount assignment does not match an equipProfile bodyMountSet." };
      const itemTags = new Set((item.tags || []).map((tag) => String(tag).toUpperCase()));
      const incompatible = (item.equippedLocation.mountIds || []).find((mountId) => {
        const definition = (state.bodyMountDefinitions || []).find((entry) => entry.key === mountId);
        return !definition || (definition.acceptedTags?.length && !definition.acceptedTags.some((tag) => itemTags.has(tag)));
      });
      if (incompatible) return { ok: false, message: `Item is incompatible with body mount ${incompatible}.` };
    }
    if (item.isEquipped && item.equippedLocation?.kind === "ITEM_MOUNT") {
      const owner = state.itemById?.[item.equippedLocation.ownerItemId] || null;
      const slot = owner?.mountProfile?.slots?.find((entry) => entry.id === item.equippedLocation.mountId) || null;
      const itemTypes = item.equipProfile?.itemMountTypes || [];
      const itemTags = new Set((item.tags || []).map((tag) => String(tag).toUpperCase()));
      if (!slot || (itemTypes.length && !itemTypes.includes(slot.type))) return { ok: false, message: "Item is incompatible with the selected item-owned mount type." };
      if (slot.acceptedTags?.length && !slot.acceptedTags.some((tag) => itemTags.has(tag))) return { ok: false, message: "Item tags are not accepted by the selected item-owned mount." };
      if (slot.blockedTags?.some((tag) => itemTags.has(tag))) return { ok: false, message: "Item is blocked by the selected item-owned mount." };
    }
    if (item.isInGrid) {
      let cursor = item.containerHostId;
      const visited = new Set();
      while (cursor && !visited.has(cursor)) {
        if (cursor === item.id) return { ok: false, message: "Container cycle detected." };
        visited.add(cursor);
        cursor = state.itemById?.[cursor]?.containerHostId || "";
      }
      const model = window.WS_APP.getEquipmentContainerGridModel?.(state, item.containerHostId);
      const entry = model?.entries?.find((candidateEntry) => candidateEntry.item?.id === item.id);
      if (!entry || entry.source !== "persistent") return { ok: false, message: "Container placement collides, exceeds the grid, or violates a dedicated cell rule." };
    }
    if (item.isStored) {
      const unit = window.WS_APP.getEquipmentHousingStorageUnit?.(candidate, item.storageUnitId);
      const model = window.WS_APP.buildEquipmentHousingGridModel?.(candidate, item.storageUnitId, { citizen: candidate, state, unit });
      const entry = model?.entries?.find((candidateEntry) => candidateEntry.item?.id === item.id);
      if (!unit || !entry || entry.source !== "persistent") return { ok: false, message: "Housing placement collides or exceeds the selected housing grid." };
    }
    return { ok: true, state, item, candidate };
  }

  function saveAdminEquipmentEditorForm(form, user = window.WS_APP.currentUser) {
    const citizenId = String(form.dataset.adminCitizenId || "");
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen) return;
    const mode = String(form.dataset.adminEquipmentMode || "edit").toLowerCase();
    const currentItems = getAdminEquipmentItems(citizen);
    const currentId = String(form.dataset.adminEquipmentItemId || "");
    const currentItem = currentItems.find((item) => item.id === currentId) || null;
    const payload = readAdminEquipmentFormPayload(form, citizen, currentItem);
    const duplicate = currentItems.some((item) => item.id === payload.id && (mode === "create" || item.id !== currentId));
    if (duplicate) {
      setAdminEquipmentEditorState(citizenId, { feedback: { tone: "error", message: `Equipment item ID already exists: ${payload.id}.` } });
      renderAdminControlCenter(user, "citizens");
      return;
    }
    const rawItems = typeof window.WS_APP.getCitizenEquipmentItemInstanceViews === "function"
      ? window.WS_APP.getCitizenEquipmentItemInstanceViews(citizenId, { includeArchived: true })
      : [];
    const nextItems = mode === "create"
      ? [...rawItems, { ...payload, instanceId: payload.id, ownerId: citizenId }]
      : rawItems.map((raw, index) => normalizeAdminEquipmentItem(raw, index).id === currentId
        ? { ...raw, ...payload, id: currentId, itemId: currentId, instanceId: currentId, ownerId: citizenId }
        : raw);
    const validation = validateAdminEquipmentCandidate(citizen, nextItems, payload.id);
    if (!validation.ok) {
      setAdminEquipmentEditorState(citizenId, { feedback: { tone: "error", message: validation.message } });
      renderAdminControlCenter(user, "citizens");
      return;
    }
    const commit = mode === "create"
      ? window.WS_APP.createItemInstance?.({ ...payload, instanceId: payload.id, ownerId: citizenId }, { source: "ADMIN_EQUIPMENT_CREATE" })
      : window.WS_APP.updateItemInstanceFromView?.(citizenId, { ...payload, id: currentId, itemId: currentId, instanceId: currentId, ownerId: citizenId }, { source: "ADMIN_EQUIPMENT_UPDATE" });
    if (!commit?.ok) {
      setAdminEquipmentEditorState(citizenId, { feedback: { tone: "error", message: "Equipment save failed." } });
      renderAdminControlCenter(user, "citizens");
      return;
    }
    setAdminEquipmentEditorState(citizenId, { selectedItemId: payload.id, mode: "edit", feedback: { tone: "info", message: `${mode === "create" ? "Created" : "Updated"} ${payload.name}.` } });
    appendAdminAuditEvent(user, { category: "EQUIPMENT", action: mode === "create" ? "EQUIPMENT_ITEM_CREATED" : "EQUIPMENT_ITEM_UPDATED", citizenId, recordId: payload.id, target: payload.id, summary: `${mode === "create" ? "Created" : "Updated"} equipment item ${payload.name} for ${citizenId}.`, meta: { category: payload.category, footprint: payload.footprint, status: payload.status } });
    renderAdminControlCenter(user, "citizens");
  }

  function runAdminEquipmentLifecycle(citizenId = "", itemId = "", action = "ARCHIVE", user = window.WS_APP.currentUser) {
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    const item = window.WS_APP.getItemInstanceById?.(itemId);
    const normalizedAction = String(action || "ARCHIVE").trim().toUpperCase();
    if (!citizen || !itemId || !item) return;
    const note = promptAdminQuickActionNote(`${normalizedAction.toLowerCase()} item ${itemId}`);
    if (!note) {
      setAdminEquipmentEditorState(citizenId, { feedback: { tone: "error", message: `${normalizedAction} blocked: operator note is required.` } });
      renderAdminControlCenter(user, "citizens");
      return;
    }
    let typedConfirmation = "";
    if (["DISPOSE", "HARD_DELETE"].includes(normalizedAction)) {
      typedConfirmation = String(window.prompt?.(`Type the exact ItemInstance ID to ${normalizedAction.toLowerCase()}:\n${itemId}`, "") || "").trim();
    }
    const result = window.WS_APP.executeAdminRecordLifecycle?.({
      recordType: "ITEM_INSTANCE",
      recordId: itemId,
      action: normalizedAction,
      actor: user,
      operatorNote: note,
      typedConfirmation,
      expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(item) || 0,
      idempotencyKey: `admin-item-${normalizedAction.toLowerCase()}:${itemId}:${Date.now()}`
    }) || { ok: false, resultCode: "ADMIN_RECORD_LIFECYCLE_MISSING", message: "Record lifecycle contract is unavailable." };
    if (!result.ok) {
      setAdminEquipmentEditorState(citizenId, {
        dependencyPreview: result.preview || null,
        feedback: { tone: "error", message: `${normalizedAction} failed: ${result.resultCode || result.message || "UNKNOWN"}.` }
      });
      renderAdminControlCenter(user, "citizens");
      return;
    }
    const deleted = normalizedAction === "HARD_DELETE";
    setAdminEquipmentEditorState(citizenId, {
      selectedItemId: deleted ? "" : itemId,
      mode: "edit",
      dependencyPreview: null,
      feedback: { tone: normalizedAction === "RESTORE" ? "info" : "warning", message: `${normalizedAction} completed for ${item.instanceData?.name || item.name || itemId}.` }
    });
    renderAdminControlCenter(user, "citizens");
  }

  function archiveAdminEquipmentItem(citizenId = "", itemId = "", user = window.WS_APP.currentUser) {
    return runAdminEquipmentLifecycle(citizenId, itemId, "ARCHIVE", user);
  }

  function restoreAdminEquipmentItem(citizenId = "", itemId = "", user = window.WS_APP.currentUser) {
    return runAdminEquipmentLifecycle(citizenId, itemId, "RESTORE", user);
  }

  function disposeAdminEquipmentItem(citizenId = "", itemId = "", user = window.WS_APP.currentUser) {
    return runAdminEquipmentLifecycle(citizenId, itemId, "DISPOSE", user);
  }

  function deleteAdminEquipmentItem(citizenId = "", itemId = "", user = window.WS_APP.currentUser) {
    return runAdminEquipmentLifecycle(citizenId, itemId, "HARD_DELETE", user);
  }


  function getCitizenManagementGroups(user) {
    return getAdminCitizens().map((citizen) => {
      const serviceLog = window.WS_APP.getCitizenServiceLog?.(citizen.id) || citizen.serviceLog || [];
      const subscriptions = Array.isArray(citizen.subscriptions) ? citizen.subscriptions : [];
      const requests = window.WS_APP.getServiceRequests?.(citizen.id) || [];
      const activeService = serviceLog.filter((entry) => String(entry.status || "").toUpperCase() === "ACTIVE").length;
      const activeSubscriptions = subscriptions.filter((item) => item.active && String(item.status || "").toUpperCase() !== "CANCELLED").length;
      const openRequests = requests.filter((request) => !["CLOSED", "DENIED", "ARCHIVED"].includes(String(request.status || "").toUpperCase())).length;
      const accessTags = citizen.accessTags || ["PUBLIC"];
      const profile = citizen.biologicalProfile || citizen.profile || "UNCLASSIFIED";
      const credits = Number(citizen.credits || 0);
      const debt = Number(citizen.debt || 0);

      return {
        citizen,
        rows: [
          ["Legal Name", escapeHtml(window.WS_APP.getCitizenDisplayName?.(citizen, { user, legal: true }) || citizen.legalName || citizen.shortId || citizen.id || "UNKNOWN"), renderStateBadge("IDENTITY", "active")],
          ["Short ID", escapeHtml(window.WS_APP.getCitizenShortId?.(citizen) || citizen.shortId || citizen.id || "—"), renderStateBadge("ID", "muted")],
          ["Biological Profile", renderTagPills([profile], "identity"), renderStateBadge("PROFILE", "active")],
          ["Access Tags", renderTagPills(accessTags, "access"), renderStateBadge(`${accessTags.length} TAGS`, accessTags.length ? "active" : "muted")],
          ["Credits", adminFormatCredits(credits), renderStateBadge(credits >= 0 ? "CLEAR" : "DEFICIT", credits >= 0 ? "active" : "warning")],
          ["Debt", adminFormatCredits(debt), renderStateBadge(debt > 0 ? "DEBT" : "CLEAR", debt > 0 ? "warning" : "active")],
          ["Service", `${activeService} active / ${serviceLog.length} total`, renderStateBadge(activeService > 0 ? "ACTIVE" : "NONE", activeService > 0 ? "active" : "muted")],
          ["Subscriptions", `${activeSubscriptions} active / ${subscriptions.length} total`, renderStateBadge(activeSubscriptions > 0 ? "ACTIVE" : "NONE", activeSubscriptions > 0 ? "active" : "muted")],
          ["System Requests", `${openRequests} open / ${requests.length} total`, renderStateBadge(openRequests > 0 ? "OPEN" : "CLEAR", openRequests > 0 ? "warning" : "active")]
        ],
        meta: [
          `${profile}`,
          `${accessTags.length} access tags`,
          `debt ${adminFormatCredits(debt)}`
        ]
      };
    });
  }

  function getCitizenSubscriptionGroups(user) {
    return getAdminCitizens().map((citizen) => {
      const subscriptions = Array.isArray(citizen.subscriptions) ? citizen.subscriptions : [];
      const rows = subscriptions.map((subscription, index) => {
        const key = getAdminSubscriptionId(subscription, index);
        const status = String(subscription.status || (subscription.active ? "ACTIVE" : "INACTIVE")).toUpperCase();
        const amount = Number(subscription.amount || 0);
        return makeAdminRecordRow(key, [
          `<strong>${escapeHtml(subscription.title || subscription.provider || "SUBSCRIPTION")}</strong><small>${escapeHtml(subscription.provider || "")}</small>`,
          renderTagPills([subscription.category || "OTHER"], "system"),
          renderStateBadge(status, subscription.active ? "active" : "warning"),
          escapeHtml(subscription.tierLabel || subscription.tierId || "—"),
          adminFormatCredits(amount)
        ], {
          type: "subscription",
          title: subscription.title || subscription.provider || "SUBSCRIPTION",
          subtitle: subscription.provider || subscription.category || "",
          status,
          details: [
            { label: "Provider", value: subscription.provider || "—" },
            { label: "Category", value: subscription.category || "OTHER" },
            { label: "Tier", value: subscription.tierLabel || subscription.tierId || "—" },
            { label: "Payment", value: status },
            { label: "Weekly", value: adminFormatCredits(amount) },
            { label: "Active", value: subscription.active ? "YES" : "NO" }
          ]
        });
      });
      const activeCount = subscriptions.filter((item) => item.active && String(item.status || "").toUpperCase() !== "CANCELLED").length;
      const weeklyTotal = subscriptions
        .filter((item) => item.active !== false && String(item.status || "").toUpperCase() !== "CANCELLED")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      return {
        citizen,
        rows,
        meta: [
          `${subscriptions.length} records`,
          `${activeCount} active`,
          `${adminFormatCredits(weeklyTotal)} / week`
        ]
      };
    });
  }

  function getCitizenServiceGroups(user) {
    return getAdminCitizens().map((citizen) => {
      const serviceLog = (window.WS_APP.getCitizenServiceLog?.(citizen.id) || citizen.serviceLog || []).slice().sort((a, b) => {
        const statusA = String(a.status || "").toUpperCase() === "ACTIVE" ? 0 : 1;
        const statusB = String(b.status || "").toUpperCase() === "ACTIVE" ? 0 : 1;
        return statusA - statusB || String(b.startDate || b.date || "").localeCompare(String(a.startDate || a.date || ""));
      });
      const rows = serviceLog.map((service, index) => {
        const key = String(service.id || `service-${index + 1}`);
        const status = String(service.status || "ACTIVE").toUpperCase();
        const amount = Number(service.amount || 0);
        const payoutCycle = service.form === "COMMISSION" ? "COMPLETION" : "WEEK";
        const payoutLabel = service.form === "COMMISSION"
          ? (String(service.payoutStatus || "").toUpperCase() === "SETTLED" && service.payoutSettledAt
            ? `SETTLED @ ${service.payoutSettledAt}`
            : (service.payoutStatus || (status === "COMPLETED" ? "PENDING" : "NOT_READY")))
          : "—";
        const allowedTransitions = window.WS_APP.getCitizenServiceAllowedTransitions?.(citizen.id, key)
          || window.WS_APP.getCitizenServiceAllowedTransitionsForStatus?.(status)
          || [];
        return makeAdminRecordRow(key, [
          `<strong>${escapeHtml(service.title || "SERVICE RECORD")}</strong><small>${escapeHtml(service.provider || "")}</small>`,
          renderTagPills([service.typeLabel || service.form || "SERVICE"], "system"),
          renderStateBadge(status, getServiceStateTone(status)),
          `${adminFormatCredits(amount)} / ${escapeHtml(payoutCycle)}`,
          escapeHtml(service.durationType || service.cycle || "—")
        ], {
          type: "citizen service log",
          title: service.title || "SERVICE RECORD",
          subtitle: service.provider || service.typeLabel || "",
          status,
          revision: Number(service.revision || 1),
          details: [
            { label: "Record Domain", value: "CITIZEN SERVICE LOG" },
            { label: "Provider", value: service.provider || "—" },
            { label: "Type", value: service.typeLabel || service.form || "SERVICE" },
            { label: "Lifecycle", value: status },
            { label: "Allowed Next", value: allowedTransitions.join(" / ") || "TERMINAL" },
            { label: "Revision", value: String(service.revision || 1) },
            { label: "Lifecycle History", value: String((service.lifecycleHistory || []).length) },
            { label: "Income", value: `${adminFormatCredits(amount)} / ${payoutCycle}` },
            { label: "Payout", value: payoutLabel },
            { label: "Terms", value: service.durationType || service.cycle || "—" },
            { label: "Start", value: service.acceptedAt || service.startDate || service.date || "—" }
          ],
          form: service.form,
          amount: service.amount,
          payoutStatus: service.payoutStatus,
          payoutSettledAt: service.payoutSettledAt,
          payoutNote: service.payoutNote,
          lifecycleHistory: service.lifecycleHistory
        });
      });
      const activeCount = serviceLog.filter((entry) => String(entry.status || "").toUpperCase() === "ACTIVE").length;
      const weeklyIncome = window.WS_APP.getCitizenWeeklyIncomeTotal?.(citizen.id) || 0;

      return {
        citizen,
        rows,
        meta: [
          `${serviceLog.length} records`,
          `${activeCount} active`,
          `${adminFormatCredits(weeklyIncome)} income / week`
        ]
      };
    });
  }

  function getCitizenBillingGroups(user) {
    return getAdminCitizens().map((citizen) => {
      const income = window.WS_APP.getCitizenWeeklyIncomeTotal?.(citizen.id) || 0;
      const subscriptions = Array.isArray(citizen.subscriptions) ? citizen.subscriptions : [];
      const weeklyCost = subscriptions
        .filter((sub) => sub.active !== false && String(sub.status || "").toUpperCase() !== "CANCELLED")
        .reduce((sum, sub) => sum + Number(sub.amount || 0), 0);
      const debt = adminParseCredits(citizen.debt || 0);
      const credits = adminParseCredits(citizen.credits || 0);
      const net = income - weeklyCost;
      const billingRows = [
        ["credits", "Credits", adminFormatCredits(credits), renderStateBadge(credits >= 0 ? "CLEAR" : "DEFICIT", credits >= 0 ? "active" : "warning")],
        ["debt", "Debt", adminFormatCredits(debt), renderStateBadge(debt > 0 ? "DEBT" : "CLEAR", debt > 0 ? "warning" : "active")],
        ["weekly-income", "Weekly Income", `${adminFormatCredits(income)} / week`, renderStateBadge(income > 0 ? "SYNC" : "NONE", income > 0 ? "active" : "muted")],
        ["weekly-subscriptions", "Weekly Subscriptions", `${adminFormatCredits(weeklyCost)} / week`, renderStateBadge(weeklyCost > 0 ? "CHARGE" : "NONE", weeklyCost > 0 ? "warning" : "muted")],
        ["net-settlement", "Net Settlement", `${adminFormatCredits(net)} / week`, renderStateBadge(net >= 0 ? "POSITIVE" : "NEGATIVE", net >= 0 ? "active" : "warning")]
      ];

      return {
        citizen,
        rows: billingRows.map(([key, label, value, state]) => makeAdminRecordRow(key, [label, value, state], {
          type: "billing metric",
          title: label,
          subtitle: "Financial snapshot",
          details: [
            { label: "Value", value: String(value).replace(/<[^>]*>/g, "") },
            { label: "Citizen", value: window.WS_APP.getCitizenDisplayName?.(citizen, { user, legal: true }) || citizen.legalName || citizen.shortId || citizen.id || "UNKNOWN" }
          ]
        })),
        meta: [
          `credits ${adminFormatCredits(credits)}`,
          `debt ${adminFormatCredits(debt)}`,
          `net ${adminFormatCredits(net)} / week`
        ]
      };
    });
  }

  function getCitizenRequestGroups(user) {
    return getAdminCitizens().map((citizen) => {
      const requests = (window.WS_APP.getServiceRequests?.(citizen.id) || []).slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      const rows = requests.map((request, index) => {
        const key = String(request.id || `request-${index + 1}`);
        const status = String(request.status || "PENDING").toUpperCase();
        return makeAdminRecordRow(key, [
          escapeHtml(request.date || "—"),
          escapeHtml(request.type || "REQUEST"),
          renderStateBadge(status, getRequestStateTone(status)),
          escapeHtml(request.createdBy || "SYSTEM"),
          renderTerminalButton("Open Queue", "requests")
        ], {
          type: "system request",
          title: request.type || "REQUEST",
          subtitle: status,
          status,
          details: [
            { label: "Date", value: request.date || "—" },
            { label: "Status", value: status },
            { label: "Created By", value: request.createdBy || "SYSTEM" },
            { label: "Body", value: request.body || "No body supplied." },
            { label: "Resolved At", value: request.resolvedAt || "—" },
            { label: "Resolved By", value: request.resolvedBy || "—" },
            { label: "Resolution Note", value: request.resolutionNote || "—" }
          ]
        });
      });
      const openCount = requests.filter((request) => !["CLOSED", "DENIED", "ARCHIVED"].includes(String(request.status || "").toUpperCase())).length;

      return {
        citizen,
        rows,
        meta: [
          `${requests.length} requests`,
          `${openCount} open`
        ]
      };
    });
  }

  function makeAdminRecordRow(key, cells, record = {}) {
    return {
      key: String(key || "record"),
      cells,
      record
    };
  }

  function getAdminSubscriptionId(subscription = {}, index = 0) {
    const category = String(subscription.category || "OTHER").trim().toLowerCase();
    const title = String(subscription.title || subscription.name || "New Subscription").trim();
    return String(subscription.id || `${category}-${adminMakeSlug(title)}-${index + 1}`).trim();
  }

  function adminMakeSlug(value) {
    const slug = String(value || "citizen")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 42);
    return slug || "citizen";
  }

  function renderAdminDataList(rows, columns, emptyText, options = {}) {
    if (!rows.length) {
      return `<div class="admin-empty-state">${escapeHtml(emptyText)}</div>`;
    }

    const selectable = Boolean(options.selectable);
    const workspaceId = options.workspaceId || window.WS_APP.adminActiveWorkspace || "dashboard";
    const citizenId = options.citizenId || "";
    const selectedRecordKey = options.selectedRecordKey || "";

    if (selectable) {
      return renderAdminSelectableRecordList(rows, columns, {
        workspaceId,
        citizenId,
        selectedRecordKey
      });
    }

    return `
      <div class="admin-data-table" style="--admin-columns: ${escapeHtml(getAdminDataColumns(columns))};">
        <div class="admin-data-row admin-data-head">
          ${columns.map((column) => `<span>${escapeHtml(column)}</span>`).join("")}
        </div>
        ${rows.map((row) => renderAdminDataRow(row)).join("")}
      </div>
    `;
  }

  function renderAdminSelectableRecordList(rows, columns, options = {}) {
    return `
      <div class="admin-record-list" data-admin-record-list="${escapeHtml(options.workspaceId || "workspace")}">
        ${rows.map((row) => renderAdminRecordCard(row, columns, options)).join("")}
      </div>
    `;
  }

  function renderAdminRecordCard(row, columns, options = {}) {
    const cells = Array.isArray(row) ? row : row.cells || [];
    const key = !Array.isArray(row) ? String(row.key || "") : "";
    const selectable = Boolean(key);
    const isSelected = selectable && key === String(options.selectedRecordKey || "");
    const attrs = selectable
      ? `data-admin-select-record data-admin-workspace-id="${escapeHtml(options.workspaceId || "")}" data-admin-citizen-id="${escapeHtml(options.citizenId || "")}" data-admin-record-key="${escapeHtml(key)}" tabindex="0" role="button" aria-pressed="${isSelected ? "true" : "false"}"`
      : "";
    const classes = ["admin-record-card"];
    if (selectable) classes.push("is-selectable");
    if (isSelected) classes.push("is-selected-record");

    return `
      <article class="${classes.join(" ")}" ${attrs}>
        <div class="admin-record-card__fields">
          ${columns.map((column, index) => `
            <div class="admin-record-field admin-record-field--${index + 1}">
              <span class="admin-record-field__label">${escapeHtml(column)}</span>
              <div class="admin-record-field__value">${cells[index] ?? "—"}</div>
            </div>
          `).join("")}
        </div>
        ${selectable ? `
          <div class="admin-record-card__actions">
            <button class="admin-inline-button" type="button" data-admin-record-select-button data-admin-workspace-id="${escapeHtml(options.workspaceId || "")}" data-admin-citizen-id="${escapeHtml(options.citizenId || "")}" data-admin-record-key="${escapeHtml(key)}">${isSelected ? "Selected" : "Select / Edit"}</button>
          </div>
        ` : ""}
      </article>
    `;
  }

  function getAdminDataColumns(columns) {
    return columns.map((_, index) => index === 0 ? "minmax(150px, 1.35fr)" : "minmax(90px, 1fr)").join(" ");
  }

  function renderAdminDataRow(row) {
    const cells = Array.isArray(row) ? row : row.cells || [];
    return `
      <div class="admin-data-row">
        ${cells.map((cell) => `<span>${cell}</span>`).join("")}
      </div>
    `;
  }

  function renderCitizenScopedRecordList(workspaceId, groups, columns, emptyText) {
    if (!groups.length) {
      return `<div class="admin-empty-state">${escapeHtml(emptyText)}</div>`;
    }

    const selectedId = getAdminSelectedCitizenId(workspaceId, groups);
    const selectedGroup = groups.find((group) => String(group.citizen?.id || "") === selectedId) || groups[0];
    const citizenId = String(selectedGroup.citizen?.id || "");
    const selectedRecordKey = getAdminSelectedRecordKey(workspaceId, citizenId, selectedGroup.rows || []);

    return `
      <div class="admin-citizen-scope">
        ${renderCitizenScopeSelector(workspaceId, groups, citizenId)}
        <article class="admin-citizen-record-group is-selected">
          <header class="admin-citizen-record-group__head">
            <div class="admin-citizen-record-group__identity">
              ${renderCitizenCell(selectedGroup.citizen)}
            </div>
            <div class="admin-citizen-record-group__meta">
              ${(selectedGroup.meta || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
            </div>
          </header>
          ${renderAdminDataList(selectedGroup.rows || [], columns, emptyText, {
            selectable: hasSelectableAdminRows(workspaceId),
            workspaceId,
            citizenId,
            selectedRecordKey
          })}
        </article>
      </div>
    `;
  }

  function renderCitizenScopeSelector(workspaceId, groups, selectedId) {
    return `
      <div class="admin-citizen-scope-selector">
        <div class="admin-citizen-scope-selector__label">
          <label for="admin-citizen-scope-${escapeHtml(workspaceId)}">Citizen Context</label>
          <small>Controls workspace records and inspector. Click a record card to inspect it.</small>
        </div>
        <select id="admin-citizen-scope-${escapeHtml(workspaceId)}" data-admin-citizen-selector data-admin-citizen-workspace="${escapeHtml(workspaceId)}">
          ${groups.map((group) => {
            const citizenId = String(group.citizen?.id || "");
            const name = window.WS_APP.getCitizenDisplayName?.(group.citizen, { legal: true }) || group.citizen?.legalName || group.citizen?.shortId || citizenId || "UNKNOWN";
            const count = Array.isArray(group.rows) ? group.rows.length : 0;
            return `<option value="${escapeHtml(citizenId)}" ${citizenId === selectedId ? "selected" : ""}>${escapeHtml(name)} / ${escapeHtml(String(count))} records</option>`;
          }).join("")}
        </select>
      </div>
    `;
  }

  function getAdminSelectedCitizenId(workspaceId, groups) {
    const state = window.WS_APP.adminSelectedCitizenByWorkspace || {};
    window.WS_APP.adminSelectedCitizenByWorkspace = state;

    const validIds = groups.map((group) => String(group.citizen?.id || "")).filter(Boolean);
    const globalCurrent = String(window.WS_APP.adminSelectedCitizenId || "");
    const scopedCurrent = String(state[workspaceId] || "");

    if (validIds.includes(globalCurrent)) {
      state[workspaceId] = globalCurrent;
      return globalCurrent;
    }

    if (validIds.includes(scopedCurrent)) {
      setAdminSelectedCitizenId(scopedCurrent, workspaceId);
      return scopedCurrent;
    }

    const firstWithRows = groups.find((group) => Array.isArray(group.rows) && group.rows.length > 0);
    const fallback = String(firstWithRows?.citizen?.id || groups[0]?.citizen?.id || "");
    setAdminSelectedCitizenId(fallback, workspaceId);
    return fallback;
  }

  function hasSelectableAdminRows(workspaceId) {
    return ["subscriptions", "service", "billing", "system-requests"].includes(String(workspaceId || ""));
  }

  function getAdminRecordStorageKey(workspaceId, citizenId) {
    return `${String(workspaceId || "workspace")}:${String(citizenId || "citizen")}`;
  }

  function setAdminSelectedRecord(workspaceId, citizenId, recordKey) {
    window.WS_APP.adminSelectedRecordByScope = window.WS_APP.adminSelectedRecordByScope || {};
    window.WS_APP.adminSelectedRecordByScope[getAdminRecordStorageKey(workspaceId, citizenId)] = String(recordKey || "");
  }

  function clearAdminSelectedRecord(workspaceId, citizenId) {
    window.WS_APP.adminSelectedRecordByScope = window.WS_APP.adminSelectedRecordByScope || {};
    delete window.WS_APP.adminSelectedRecordByScope[getAdminRecordStorageKey(workspaceId, citizenId)];
  }

  function getAdminSelectedRecordKey(workspaceId, citizenId, rows = []) {
    if (!hasSelectableAdminRows(workspaceId)) return "";
    const recordRows = rows.filter((row) => row && !Array.isArray(row) && row.key);
    if (!recordRows.length) return "";

    window.WS_APP.adminSelectedRecordByScope = window.WS_APP.adminSelectedRecordByScope || {};
    const storageKey = getAdminRecordStorageKey(workspaceId, citizenId);
    const current = String(window.WS_APP.adminSelectedRecordByScope[storageKey] || "");
    if (recordRows.some((row) => String(row.key) === current)) return current;

    const fallback = String(recordRows[0].key || "");
    window.WS_APP.adminSelectedRecordByScope[storageKey] = fallback;
    return fallback;
  }

  function getAdminSelectedRecordForWorkspace(workspaceId, group) {
    if (!group?.citizen || !Array.isArray(group.rows) || !hasSelectableAdminRows(workspaceId)) return null;
    const citizenId = String(group.citizen.id || "");
    const selectedKey = getAdminSelectedRecordKey(workspaceId, citizenId, group.rows);
    return group.rows.find((row) => row && !Array.isArray(row) && String(row.key || "") === selectedKey) || null;
  }

  function renderCitizenCell(citizen, user) {
    const name = window.WS_APP.getCitizenDisplayName?.(citizen, { user, legal: true }) || citizen.legalName || citizen.shortId || citizen.id || "UNKNOWN";
    const shortId = window.WS_APP.getCitizenShortId?.(citizen) || citizen.shortId || citizen.id || "—";
    return `<strong>${escapeHtml(name)}</strong><small>${escapeHtml(shortId)}</small>`;
  }

  function renderTagPills(tags, family = "neutral") {
    const list = (Array.isArray(tags) ? tags : [tags]).filter(Boolean).slice(0, 5);
    if (!list.length) return `<span class="admin-tag-pill is-muted">NONE</span>`;
    return list.map((tag) => `<span class="admin-tag-pill is-${escapeHtml(toClassToken(family))}">${escapeHtml(tag)}</span>`).join("");
  }

  function renderStateBadge(label, tone = "neutral") {
    return `<span class="admin-state-badge is-${escapeHtml(toClassToken(tone))}">${escapeHtml(String(label || "STATE").toUpperCase())}</span>`;
  }

  function renderMiniAction(label, attrs) {
    return `<button class="admin-mini-action" type="button" ${attrs}>${escapeHtml(label)}</button>`;
  }

  function renderAdminRouteCard(label, moduleId, description = "Open existing module route.") {
    const module = getModuleDefinition(moduleId);
    const routeLabel = label || module.title || moduleId;
    const routeDescription = description || module.description || "Open existing module route.";
    return `
      <button class="admin-action-card admin-route-card" type="button" data-admin-open-module="${escapeHtml(moduleId)}">
        <span>${escapeHtml(routeLabel)}</span>
        <b>OPEN ROUTE</b>
        <small>${escapeHtml(routeDescription)}</small>
      </button>
    `;
  }

  function renderModuleButton(label, moduleId) {
    return `<button class="admin-inline-button" type="button" data-admin-open-module="${escapeHtml(moduleId)}">${escapeHtml(label)}</button>`;
  }

  function renderTerminalButton(label, panel) {
    return `<button class="admin-inline-button" type="button" data-admin-open-terminal-panel="${escapeHtml(panel)}">${escapeHtml(label)}</button>`;
  }

  function getServiceStateTone(status) {
    const state = String(status || "ACTIVE").toUpperCase();
    if (["ACTIVE", "COMPLETED"].includes(state)) return "active";
    if (["SUSPENDED", "TERMINATED", "FAILED"].includes(state)) return "warning";
    if (["ARCHIVED"].includes(state)) return "muted";
    return "neutral";
  }

  function getRequestStateTone(status) {
    const state = String(status || "PENDING").toUpperCase();
    if (["APPROVED", "CLOSED"].includes(state)) return "active";
    if (["DENIED"].includes(state)) return "locked";
    if (["PENDING", "REVIEWED"].includes(state)) return "warning";
    return "neutral";
  }

  function appendAdminAuditEvent(user, event = {}) {
    const action = String(event.action || event.sourceCommand || "ADMIN_EVENT").trim().toUpperCase();
    const result = window.WS_APP.appendAdminAuditResult?.({
      actor: {
        actorId: user?.id || user?.login || window.WS_APP.currentUser?.id || window.WS_APP.currentUser?.login || "",
        actorRole: user?.role || window.WS_APP.currentUser?.role || "",
        displayName: user?.displayName || user?.login || window.WS_APP.currentUser?.displayName || window.WS_APP.currentUser?.login || "ADMIN"
      },
      workspace: window.WS_APP.adminActiveWorkspace || "ADMIN",
      category: event.category || "ADMIN",
      sourceCommand: action,
      citizenId: event.citizenId || "",
      recordId: event.recordId || "",
      target: event.target || event.recordId || event.citizenId || "SYSTEM",
      targetRefs: event.targetRefs,
      request: {
        idempotencyKey: event.idempotencyKey || event.meta?.idempotencyKey || "",
        correlationId: event.correlationId || event.meta?.correlationId || "",
        payloadHash: event.payloadHash || ""
      },
      result: {
        status: event.status || event.resultStatus || "",
        resultCode: event.resultCode || event.meta?.resultCode || action,
        message: event.message || event.summary || "Admin event registered."
      },
      domainRefs: event.domainRefs || {},
      previousRevision: event.previousRevision,
      nextRevision: event.nextRevision,
      summary: event.summary || "Admin event registered.",
      metadata: event.meta || event.metadata || {}
    }, { user });
    return result?.event || null;
  }

  function formatAdminAuditTime(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "UNKNOWN";
    return date.toISOString().replace("T", " ").slice(0, 16);
  }

  function getInspectorNotes(workspaceId) {
    const notes = {
      dashboard: ["Dashboard is an admin overview, not a player module grid.", "Priority Queue summarizes current operator-facing counts."],
      operations: ["Operations is a projection of the canonical World Bridge Operation Store.", "Retry, reconcile and resource claims always call public World Bridge APIs and require an operator note."],
      "catalog-management": ["Catalog Management separates reusable definitions from campaign-owned runtime instances.", "Equipment authoring publishes through the canonical Equipment Catalog Store and exports data packs without creating ItemInstances."],
      "cyberware-runtime": ["Cyberware Runtime is a read projection over canonical ItemInstance BODY records.", "PLAYER WORLD uses Service/Billing/World Bridge; ADMIN DIRECT bypasses orchestration but never body-slot, compatibility or return-location invariants."],
      citizens: ["Citizen Management is citizen-scoped: the selector determines the inspected citizen.", "Equipment Editor writes physical records to the canonical global ItemInstance store.", "Detailed identity edits still route to existing Citizen Cards / Database modules."],
      "tags-access": ["Access/Clearance tags and Content/Record tags are separate families.", "Admin Tag Manager manages tag records; Access Matrix edits hierarchy and relation logic."],
      subscriptions: ["Subscription Admin is citizen-scoped: the citizen selector determines visible subscription records.", "Tier/payment edits still route to the existing Subscriptions module."],
      service: ["Service Admin is citizen-scoped: the citizen selector determines visible Service Log records.", "Bulk status control remains in the existing Service module."],
      billing: ["Billing Admin uses the global Citizen Context for corrections and allows explicit source/target selection for canonical transfers.", "Economy Tools separate one-account SET/CHANGE corrections from paired Credits or Debt transfers.", "Every transfer creates one transfer record, two Billing transactions and one Admin Audit result."],
      "system-requests": ["System Requests are citizen-scoped admin queue items, not Service records.", "Request resolution still routes through Terminal System Requests."],
      records: ["Records workspace groups database families by admin route.", "Record routes stay in their existing detailed modules."],
      audit: ["Audit Log records meaningful admin data changes only.", "Normal workspace changes are not logged.", "Admin Economy Tools write ADMIN_ECONOMY_ADJUSTMENT events."],
      "data-settings": ["Data tools remain existing Data I/O and Access Control for now."]
    };
    return notes[workspaceId] || ["No workspace notes registered."];
  }

  function adminParseCredits(value) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
    const cleaned = String(value || "")
      .replace(/[^0-9,.-]/g, "")
      .replace(/,/g, ".");
    const number = Number(cleaned);
    return Number.isFinite(number) ? Math.round(number) : 0;
  }

  function adminFormatCredits(value) {
    const raw = Math.trunc(adminParseCredits(value));
    const sign = raw < 0 ? "-" : "";
    const amount = Math.abs(raw);
    return `${sign}${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₡`;
  }

  function returnToAdminControlCenter(user = window.WS_APP.currentUser, workspaceId = "") {
    if (!user || user.role !== "admin") return false;
    const targetWorkspaceId = workspaceId || window.WS_APP.adminRouteReturnWorkspace || window.WS_APP.adminActiveWorkspace || "dashboard";
    window.WS_APP.closeDataIO?.();
    window.WS_APP.finishModuleTransition?.();
    window.WS_APP.resetModuleHistory?.();
    clearAdminRouteState({ preserveWorkspace: true, preserveCitizen: true, clearTerminalPanel: true });
    window.WS_APP.currentModuleId = null;
    renderAdminControlCenter(user, targetWorkspaceId);
    return true;
  }

  window.WS_APP.AdminControlRendererContext = Object.freeze({
    getAdminDashboardMetrics,
    getPriorityQueueRows,
    getCitizenManagementGroups,
    getAdminSelectedCitizenGroupForWorkspace,
    getAdminAccessTagsForManager,
    getAdminContentTagsForManager,
    getCitizenSubscriptionGroups,
    getCitizenServiceGroups,
    getCitizenBillingGroups,
    getCitizenRequestGroups,
    getAdminSelectedCitizenId,
    renderWorkspaceHead,
    renderModuleButton,
    renderTerminalButton,
    renderAdminMetricCard,
    renderAdminDataList,
    renderStateBadge,
    renderAdminRouteCard,
    renderCitizenScopedRecordList,
    renderAdminCitizenCleanupPanel,
    renderAdminEquipmentEditorPanel,
    renderAdminTagManager,
    renderAdminAccessMatrixEditor,
    renderAdminServiceDomainBoundaryPanel,
    renderAdminServiceMarketTools,
    renderAdminInboxGeneratorButton,
    renderAdminEconomyTools,
    renderAdminTransferTools,
    renderAdminAuditDetail,
    formatAdminAuditTime,
    escapeHtml
  });

  window.WS_APP.returnToAdminControlCenter = returnToAdminControlCenter;

  function setAdminShellState(enabled) {
    const terminalGrid = document.querySelector(".terminal-grid");
    const modulePanel = document.querySelector(".module-panel-region");
    const isEnabled = Boolean(enabled);
    terminalGrid?.classList.toggle("is-admin-control-center", isEnabled);
    modulePanel?.classList.toggle("is-admin-control-center", isEnabled);
    document.body?.classList.toggle("is-admin-control-center", isEnabled);
  }

  function setModulePanelHeader(kickerText, titleText) {
    const panelHead = document.querySelector(".module-panel-shell .panel-head");
    if (!panelHead) return;
    const kicker = panelHead.querySelector(".kicker");
    const title = panelHead.querySelector("h3");
    if (kicker) kicker.textContent = kickerText;
    if (title) title.textContent = titleText;
  }

  function getModuleDefinition(moduleId) {
    const modules = window.APP_DATA?.modules || [];
    return modules.find((module) => module.id === moduleId) || {
      id: moduleId,
      title: moduleId,
      description: "No module definition found.",
      status: "UNKNOWN"
    };
  }

  function toClassToken(value) {
    return String(value || "neutral")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "neutral";
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
