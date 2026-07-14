window.WS_APP = window.WS_APP || {};

(function registerAdminWorkspaceRenderer() {
  const registry = window.WS_APP.AdminWorkspaceRegistry;
  if (!registry?.registerRenderer) return;

  function getContext() {
    const context = window.WS_APP.AdminControlRendererContext;
    if (!context) throw new Error("ADMIN_CONTROL_RENDERER_CONTEXT_UNAVAILABLE");
    return context;
  }

  function renderDataSettingsWorkspace(workspace, user) {
    const { renderWorkspaceHead, renderAdminRouteCard } = getContext();
    return `
      ${renderWorkspaceHead(workspace)}
      <section class="admin-workspace-panel admin-route-panel">
        <div class="admin-panel-headline">
          <p class="kicker">ADMIN / DATA ROUTES</p>
          <h5>Import / Export / Local Settings</h5>
        </div>
        <div class="admin-route-grid">
          ${renderAdminRouteCard("Access Control", "access-control", "Access users, permissions and clearance state.")}
          <button class="admin-action-card admin-route-card" type="button" data-admin-open-data-io aria-haspopup="dialog">
            <span>Data I/O</span>
            <b>IMPORT / EXPORT</b>
            <small>Open the existing campaign import/export dialog.</small>
          </button>
        </div>
      </section>
    `;
  }

  registry.registerRenderer("data-settings", (workspace, user) => renderDataSettingsWorkspace(workspace, user));
})();
