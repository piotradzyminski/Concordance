window.WS_APP = window.WS_APP || {};

(function registerAdminWorkspaceRenderer() {
  const registry = window.WS_APP.AdminWorkspaceRegistry;
  if (!registry?.registerRenderer) return;

  function getContext() {
    const context = window.WS_APP.AdminControlRendererContext;
    if (!context) throw new Error("ADMIN_CONTROL_RENDERER_CONTEXT_UNAVAILABLE");
    return context;
  }

  function renderCitizensWorkspace(workspace, user) {
    const { getCitizenManagementGroups, getAdminSelectedCitizenGroupForWorkspace, renderWorkspaceHead, renderModuleButton, renderCitizenScopedRecordList, renderAdminCitizenCleanupPanel, renderAdminEquipmentEditorPanel } = getContext();
    const groups = getCitizenManagementGroups(user);
    const selectedGroup = getAdminSelectedCitizenGroupForWorkspace(workspace.id, user);

    return `
      ${renderWorkspaceHead(workspace, renderModuleButton("Citizen Cards", "citizen-cards") + renderModuleButton("Citizen Database", "citizen-database") + renderModuleButton("Equipment", "equipment"))}
      <section class="admin-workspace-panel">
        <div class="admin-panel-headline">
          <p class="kicker">ADMIN / CITIZEN CONTEXT</p>
          <h5>Selected Citizen Management</h5>
        </div>
        ${renderCitizenScopedRecordList(workspace.id, groups, ["Metric", "Value", "State"], "No citizen record selected.")}
      </section>
      ${selectedGroup?.citizen ? renderAdminCitizenCleanupPanel(selectedGroup.citizen, user) : ""}
      ${selectedGroup?.citizen ? renderAdminEquipmentEditorPanel(selectedGroup.citizen, user) : ""}
    `;
  }

  registry.registerRenderer("citizens", (workspace, user) => renderCitizensWorkspace(workspace, user));
})();
