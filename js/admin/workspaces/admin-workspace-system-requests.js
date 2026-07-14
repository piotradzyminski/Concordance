window.WS_APP = window.WS_APP || {};

(function registerAdminWorkspaceRenderer() {
  const registry = window.WS_APP.AdminWorkspaceRegistry;
  if (!registry?.registerRenderer) return;

  function getContext() {
    const context = window.WS_APP.AdminControlRendererContext;
    if (!context) throw new Error("ADMIN_CONTROL_RENDERER_CONTEXT_UNAVAILABLE");
    return context;
  }

  function renderSystemRequestsWorkspace(workspace, user) {
    const { getCitizenRequestGroups, renderWorkspaceHead, renderTerminalButton, renderCitizenScopedRecordList } = getContext();
    const groups = getCitizenRequestGroups(user);

    return `
      ${renderWorkspaceHead(workspace, renderTerminalButton("Open System Requests", "requests"))}
      <section class="admin-workspace-panel">
        <div class="admin-panel-headline">
          <p class="kicker">ADMIN / CITIZEN CONTEXT</p>
          <h5>Selected Citizen Request Records</h5>
        </div>
        ${renderCitizenScopedRecordList(workspace.id, groups, ["Date", "Type", "Status", "Created By", "Action"], "No System Requests for selected citizen.")}
      </section>
    `;
  }

  registry.registerRenderer("system-requests", (workspace, user) => renderSystemRequestsWorkspace(workspace, user));
})();
