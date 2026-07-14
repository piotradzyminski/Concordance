window.WS_APP = window.WS_APP || {};

(function registerAdminWorkspaceRenderer() {
  const registry = window.WS_APP.AdminWorkspaceRegistry;
  if (!registry?.registerRenderer) return;

  function getContext() {
    const context = window.WS_APP.AdminControlRendererContext;
    if (!context) throw new Error("ADMIN_CONTROL_RENDERER_CONTEXT_UNAVAILABLE");
    return context;
  }

  function renderServiceWorkspace(workspace, user) {
    const { getCitizenServiceGroups, getAdminSelectedCitizenId, renderWorkspaceHead, renderModuleButton, renderAdminServiceDomainBoundaryPanel, renderAdminServiceMarketTools, renderCitizenScopedRecordList } = getContext();
    const groups = getCitizenServiceGroups(user);
    const selectedId = getAdminSelectedCitizenId(workspace.id, groups);
    const selectedGroup = groups.find((group) => String(group.citizen?.id || "") === selectedId) || groups[0] || null;

    return `
      ${renderWorkspaceHead(workspace, renderModuleButton("Open Service Module", "service"))}
      ${renderAdminServiceDomainBoundaryPanel(selectedGroup?.citizen || null)}
      ${renderAdminServiceMarketTools(selectedGroup, user)}
      <section class="admin-workspace-panel">
        <div class="admin-panel-headline">
          <p class="kicker">ADMIN / CITIZEN SERVICE LOG</p>
          <h5>Citizen Service Log / Work Records</h5>
        </div>
        <p class="admin-panel-note">Employment, assignment, payout and verified work-history records. These records are separate from transactional Service Bridge provider orders.</p>
        ${renderCitizenScopedRecordList(workspace.id, groups, ["Service Log Record", "Type", "Lifecycle", "Income", "Terms"], "No Citizen Service Log records for selected citizen.")}
      </section>
    `;
  }

  registry.registerRenderer("service", (workspace, user) => renderServiceWorkspace(workspace, user));
})();
