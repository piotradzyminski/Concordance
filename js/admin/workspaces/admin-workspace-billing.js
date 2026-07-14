window.WS_APP = window.WS_APP || {};

(function registerAdminWorkspaceRenderer() {
  const registry = window.WS_APP.AdminWorkspaceRegistry;
  if (!registry?.registerRenderer) return;

  function getContext() {
    const context = window.WS_APP.AdminControlRendererContext;
    if (!context) throw new Error("ADMIN_CONTROL_RENDERER_CONTEXT_UNAVAILABLE");
    return context;
  }

  function renderBillingWorkspace(workspace, user) {
    const { getCitizenBillingGroups, getAdminSelectedCitizenId, renderWorkspaceHead, renderTerminalButton, renderAdminInboxGeneratorButton, renderAdminEconomyTools, renderAdminTransferTools, renderCitizenScopedRecordList } = getContext();
    const groups = getCitizenBillingGroups(user);
    const selectedId = getAdminSelectedCitizenId(workspace.id, groups);
    const selectedGroup = groups.find((group) => String(group.citizen?.id || "") === selectedId) || groups[0] || null;

    return `
      ${renderWorkspaceHead(workspace, renderTerminalButton("Open Billing Control", "billing") + renderAdminInboxGeneratorButton())}
      ${renderAdminEconomyTools(selectedGroup, user)}
      ${renderAdminTransferTools(selectedGroup, user)}
      <section class="admin-workspace-panel">
        <div class="admin-panel-headline">
          <p class="kicker">ADMIN / CITIZEN CONTEXT</p>
          <h5>Selected Citizen Billing Record</h5>
        </div>
        ${renderCitizenScopedRecordList(workspace.id, groups, ["Metric", "Value", "State"], "No billing record for selected citizen.")}
      </section>
    `;
  }

  registry.registerRenderer("billing", (workspace, user) => renderBillingWorkspace(workspace, user));
})();
