window.WS_APP = window.WS_APP || {};

(function registerAdminWorkspaceRenderer() {
  const registry = window.WS_APP.AdminWorkspaceRegistry;
  if (!registry?.registerRenderer) return;

  function getContext() {
    const context = window.WS_APP.AdminControlRendererContext;
    if (!context) throw new Error("ADMIN_CONTROL_RENDERER_CONTEXT_UNAVAILABLE");
    return context;
  }

  function renderRecordsWorkspace(workspace, user) {
    const { renderWorkspaceHead, escapeHtml, renderStateBadge, renderModuleButton, renderAdminRouteCard, renderAdminDataList } = getContext();
    const allSystemRecords = window.WS_APP.getSystemRecords?.({ includeArchived: false }) || [];
    const citizenFileCount = typeof window.WS_APP.getCitizenFiles === "function"
      ? window.WS_APP.getCitizenFiles({ includeArchived: false, enforceAccess: false }).length
      : 0;
    const recordGroups = [
      { label: "System", count: allSystemRecords.filter((record) => record.registry === "system").length, module: "system" },
      { label: "System Index", count: allSystemRecords.filter((record) => record.registry === "system-index").length, module: "system-index" },
      { label: "Encyclopedia", count: (window.WS_APP.getEntries?.({ includeArchived: false }) || []).length, module: "encyclopedia" },
      { label: "Citizen Files", count: citizenFileCount, module: "citizen-files" },
      { label: "Case Files", count: (window.WS_APP.getCaseFiles?.({ includeArchived: false }) || []).length, module: "case-files" },
      { label: "Address Core", count: (window.WS_APP.getAddresses?.({ includeArchived: false }) || []).length, module: "address-core" },
      { label: "GM Layer", count: (window.WS_APP.getSystemRecords?.({ includeArchived: true }) || []).filter((record) => String(record.access || record.visibility || record.classification || "").toUpperCase().includes("BLACK") || String(record.access || "").toUpperCase().includes("GM")).length, module: "gm-layer" }
    ];
    const rows = recordGroups.map((group) => [
      `<strong>${escapeHtml(group.label)}</strong><small>record family</small>`,
      escapeHtml(group.count),
      renderStateBadge(group.count > 0 ? "ACTIVE" : "EMPTY", group.count > 0 ? "active" : "muted"),
      renderModuleButton("Open", group.module)
    ]);

    return `
      ${renderWorkspaceHead(workspace)}
      <section class="admin-workspace-panel admin-route-panel">
        <div class="admin-panel-headline">
          <p class="kicker">ADMIN / RECORD ROUTES</p>
          <h5>Canonical Record Modules</h5>
        </div>
        <div class="admin-route-grid">
          ${recordGroups.map((group) => renderAdminRouteCard(group.label, group.module, `${group.count} active records`)).join("")}
        </div>
      </section>
      <section class="admin-workspace-panel">
        <div class="admin-panel-headline">
          <p class="kicker">ADMIN / RECORD FAMILIES</p>
          <h5>Database Records</h5>
        </div>
        ${renderAdminDataList(rows, ["Family", "Records", "State", "Action"], "No record groups found.")}
      </section>
    `;
  }

  registry.registerRenderer("records", (workspace, user) => renderRecordsWorkspace(workspace, user));
})();
