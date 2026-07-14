window.WS_APP = window.WS_APP || {};

(function registerAdminWorkspaceRenderer() {
  const registry = window.WS_APP.AdminWorkspaceRegistry;
  if (!registry?.registerRenderer) return;

  function getContext() {
    const context = window.WS_APP.AdminControlRendererContext;
    if (!context) throw new Error("ADMIN_CONTROL_RENDERER_CONTEXT_UNAVAILABLE");
    return context;
  }

  function renderAdminDashboard(user) {
    const { getAdminDashboardMetrics, getPriorityQueueRows, renderAdminMetricCard, renderAdminDataList } = getContext();
    const metrics = getAdminDashboardMetrics(user);
    const priorityRows = getPriorityQueueRows(user);
    return `
      <section class="admin-dashboard-grid">
        ${renderAdminMetricCard("Citizens", metrics.citizens, "registered citizen cards", "citizens")}
        ${renderAdminMetricCard("Open Requests", metrics.openRequests, "requests awaiting operator review", "system-requests")}
        ${renderAdminMetricCard("Active Service", metrics.activeService, "active Service Log records", "service")}
        ${renderAdminMetricCard("Subscriptions", `${metrics.activeSubscriptions} / ${metrics.totalSubscriptions}`, "active / total subscription records", "subscriptions")}
        ${renderAdminMetricCard("Access Tags", metrics.accessTags, "system access/clearance tags", "tags-access")}
        ${renderAdminMetricCard("Content Tags", metrics.contentTags, "editable record/content tags", "tags-access")}
      </section>

      <section class="admin-workspace-panel">
        <div class="admin-panel-headline">
          <p class="kicker">ADMIN / PRIORITY QUEUE</p>
          <h5>Operator actions</h5>
        </div>
        ${renderAdminDataList(priorityRows, ["Domain", "State", "Target", "Action"], "No urgent admin items.")}
      </section>

      <section class="admin-workspace-panel">
        <div class="admin-panel-headline">
          <p class="kicker">ADMIN / QUICK ACCESS</p>
          <h5>Control routes</h5>
        </div>
        <div class="admin-quick-actions">
          <button type="button" data-admin-open-workspace="system-requests">Review System Requests</button>
          <button type="button" data-admin-open-workspace="tags-access">Open Tags & Access</button>
          <button type="button" data-admin-open-workspace="service">Review Service Logs</button>
          <button type="button" data-admin-open-terminal-panel="billing">Open Billing Control</button>
        </div>
      </section>
    `;
  }

  registry.registerRenderer("dashboard", (workspace, user) => renderAdminDashboard(user));
})();
