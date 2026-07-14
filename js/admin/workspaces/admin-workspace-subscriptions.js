window.WS_APP = window.WS_APP || {};

(function registerAdminWorkspaceRenderer() {
  const registry = window.WS_APP.AdminWorkspaceRegistry;
  if (!registry?.registerRenderer) return;

  function getContext() {
    const context = window.WS_APP.AdminControlRendererContext;
    if (!context) throw new Error("ADMIN_CONTROL_RENDERER_CONTEXT_UNAVAILABLE");
    return context;
  }

  function renderSubscriptionsWorkspace(workspace, user) {
    const { renderWorkspaceHead, renderModuleButton, getCitizenSubscriptionGroups, renderCitizenScopedRecordList } = getContext();
    const controller = window.WS_APP.AdminSubscriptionsControl;
    if (controller?.renderWorkspace) {
      return `
        ${renderWorkspaceHead(workspace, renderModuleButton("Open Subscription Module", "subscriptions"))}
        ${controller.renderWorkspace({ workspace, user })}
      `;
    }

    const groups = getCitizenSubscriptionGroups(user);
    return `
      ${renderWorkspaceHead(workspace, renderModuleButton("Open Subscription Module", "subscriptions"))}
      <section class="admin-workspace-panel">
        <div class="admin-panel-headline">
          <p class="kicker">ADMIN / CITIZEN CONTEXT</p>
          <h5>Selected Citizen Subscriptions</h5>
        </div>
        ${renderCitizenScopedRecordList(workspace.id, groups, ["Subscription", "Category", "Payment", "Tier", "Weekly"], "No subscription records for selected citizen.")}
      </section>
    `;
  }

  registry.registerRenderer("subscriptions", (workspace, user) => renderSubscriptionsWorkspace(workspace, user));
})();
