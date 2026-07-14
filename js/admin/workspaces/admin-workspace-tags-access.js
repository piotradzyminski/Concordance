window.WS_APP = window.WS_APP || {};

(function registerAdminWorkspaceRenderer() {
  const registry = window.WS_APP.AdminWorkspaceRegistry;
  if (!registry?.registerRenderer) return;

  function getContext() {
    const context = window.WS_APP.AdminControlRendererContext;
    if (!context) throw new Error("ADMIN_CONTROL_RENDERER_CONTEXT_UNAVAILABLE");
    return context;
  }

  function renderTagsAccessWorkspace(workspace, user) {
    const { getAdminAccessTagsForManager, getAdminContentTagsForManager, renderWorkspaceHead, renderModuleButton, renderAdminTagManager, renderAdminAccessMatrixEditor } = getContext();
    const accessTags = getAdminAccessTagsForManager();
    const contentTags = getAdminContentTagsForManager();

    return `
      ${renderWorkspaceHead(workspace, renderModuleButton("Access Control", "access-control") + renderModuleButton("Tag Registry", "tag-registry"))}
      ${renderAdminTagManager(accessTags, contentTags)}
      ${renderAdminAccessMatrixEditor(accessTags)}
    `;
  }

  registry.registerRenderer("tags-access", (workspace, user) => renderTagsAccessWorkspace(workspace, user));
})();
