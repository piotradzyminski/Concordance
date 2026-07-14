window.WS_APP = window.WS_APP || {};

(function registerAdminWorkspaceRenderer() {
  const registry = window.WS_APP.AdminWorkspaceRegistry;
  if (!registry?.registerRenderer) return;

  function getContext() {
    const context = window.WS_APP.AdminControlRendererContext;
    if (!context) throw new Error("ADMIN_CONTROL_RENDERER_CONTEXT_UNAVAILABLE");
    return context;
  }

  function renderAdminAuditWorkspace(workspace, user) {
    const { renderWorkspaceHead, renderAdminMetricCard, renderStateBadge, escapeHtml, formatAdminAuditTime, renderAdminDataList, renderAdminAuditDetail } = getContext();
    const allEvents = window.WS_APP.getAdminAuditEvents?.() || [];
    const recoveryQueue = window.WS_APP.getAdminAuditRecoveryQueue?.() || [];
    const activeFilter = String(window.WS_APP.adminAuditFilter || "ALL").toUpperCase();
    const selectedId = String(window.WS_APP.adminAuditSelectedEventId || allEvents[0]?.auditEventId || "");
    const filters = [
      ["ALL", "ALL"],
      ["SUCCEEDED", "SUCCEEDED"],
      ["FAILED", "FAILED"],
      ["RECOVERY_REQUIRED", "RECOVERY"],
      ["BILLING", "BILLING"],
      ["CITIZEN", "CITIZEN"],
      ["EQUIPMENT", "EQUIPMENT"],
      ["ACCESS", "ACCESS"],
      ["DATA_IO", "DATA I/O"]
    ];
    const events = allEvents.filter((event) => {
      if (activeFilter === "ALL") return true;
      if (["SUCCEEDED", "FAILED", "RECOVERY_REQUIRED"].includes(activeFilter)) return event.result?.status === activeFilter;
      if (activeFilter === "DATA_IO") return event.category === "DATA_IO" || event.workspace === "DATA_SETTINGS";
      return event.category === activeFilter;
    });
    const selected = window.WS_APP.getAdminAuditEvent?.(selectedId) || events[0] || allEvents[0] || null;
    if (selected?.auditEventId) window.WS_APP.adminAuditSelectedEventId = selected.auditEventId;

    const rows = events.map((event) => {
      const targets = (event.targetRefs || []).map((ref) => `${ref.type}:${ref.id}`).join(", ") || "SYSTEM";
      return [
        `<strong>${escapeHtml(formatAdminAuditTime(event.createdAt))}</strong><small>#${escapeHtml(event.sequence || 0)} / ${escapeHtml(event.auditEventId || "AUDIT")}</small>`,
        `<strong>${escapeHtml(event.sourceCommand || "ADMIN_EVENT")}</strong><small>${escapeHtml(event.category || "ADMIN")}</small>`,
        `<strong>${renderStateBadge(event.result?.status || "UNKNOWN", event.result?.status === "SUCCEEDED" ? "active" : event.result?.status === "RECOVERY_REQUIRED" ? "warning" : "locked")}</strong><small>${escapeHtml(event.result?.resultCode || "UNKNOWN")}</small>`,
        `<strong>${escapeHtml(targets)}</strong><small>${escapeHtml(event.summary || event.result?.message || "No summary.")}</small>`,
        `<strong>${escapeHtml(event.actor?.displayName || event.actor?.actorId || "ADMIN")}</strong><small>${escapeHtml(event.workspace || "ADMIN")}</small>`,
        `<button class="admin-inline-button" type="button" data-admin-audit-inspect="${escapeHtml(event.auditEventId || "")}">Inspect</button>`
      ];
    });

    return `
      ${renderWorkspaceHead(workspace)}
      <section class="admin-dashboard-grid">
        ${renderAdminMetricCard("Audit Events", allEvents.length, "campaign-persistent events", "audit")}
        ${renderAdminMetricCard("Failures", allEvents.filter((event) => event.result?.status === "FAILED").length, "validation and domain rejections", "audit")}
        ${renderAdminMetricCard("Recovery", recoveryQueue.length, "audit writes awaiting retry", "audit")}
      </section>
      <section class="admin-workspace-panel admin-audit-panel">
        <div class="admin-panel-headline">
          <div>
            <p class="kicker">ADMIN / CANONICAL AUDIT TRAIL</p>
            <h5>Admin Audit Events</h5>
          </div>
          ${recoveryQueue.length ? `<button class="admin-inline-button is-danger" type="button" data-admin-audit-retry>Retry Audit Recovery</button>` : ""}
        </div>
        <p class="admin-panel-note">Events are sequence-ordered, included in Campaign Snapshot v6 and never silently trimmed. Navigation-only actions remain excluded.</p>
        <div class="admin-form-actions">
          ${filters.map(([value, label]) => `<button class="admin-inline-button ${activeFilter === value ? "is-active" : ""}" type="button" data-admin-audit-filter="${escapeHtml(value)}">${escapeHtml(label)}</button>`).join("")}
        </div>
        ${renderAdminDataList(rows, ["Time", "Command", "Result", "Target", "Operator", "Action"], "No audit events match this filter.")}
      </section>
      ${renderAdminAuditDetail(selected)}
    `;
  }

  registry.registerRenderer("audit", (workspace, user) => renderAdminAuditWorkspace(workspace, user));
})();
