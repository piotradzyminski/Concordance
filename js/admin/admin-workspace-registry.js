window.WS_APP = window.WS_APP || {};

(function initAdminWorkspaceRegistry() {
  if (window.WS_APP.AdminWorkspaceRegistry) return;

  const definitions = Object.freeze([
    Object.freeze({ id: "dashboard", title: "Dashboard", eyebrow: "ADMIN / CONTROL CENTER", description: "Operator overview: requests, citizens, service records, subscriptions and access state.", modules: [] }),
    Object.freeze({ id: "operations", title: "Operations", eyebrow: "ADMIN / WORLD BRIDGE OPERATIONS", description: "World Bridge operation queue, recovery, reconciliation and resource claim control.", modules: [], bundleId: "admin-workspace-operations" }),
    Object.freeze({ id: "citizens", title: "Citizens", eyebrow: "ADMIN / CITIZEN MANAGEMENT", description: "Citizen cards, profile database, side records and direct citizen editing.", modules: ["citizen-cards", "citizen-database", "citizen-files"], bundleId: "admin-workspace-citizens" }),
    Object.freeze({ id: "tags-access", title: "Tags & Access", eyebrow: "ADMIN / TAGS & ACCESS", description: "User access, clearance tags, tag registry and current access relations.", modules: ["access-control", "tag-registry"], bundleId: "admin-workspace-tags-access" }),
    Object.freeze({ id: "subscriptions", title: "Subscriptions", eyebrow: "ADMIN / SUBSCRIPTION RECORDS", description: "Subscription records, provider market, tier state and payment status review.", modules: ["subscriptions"], bundleId: "admin-workspace-subscriptions" }),
    Object.freeze({ id: "service", title: "Service", eyebrow: "ADMIN / SERVICE CONTROL", description: "Service Log review, active service, service offers, bulk status and income synchronization.", modules: ["service"], bundleId: "admin-workspace-service" }),
    Object.freeze({ id: "billing", title: "Billing / Settlement", eyebrow: "ADMIN / BILLING CONTROL", description: "Terminal billing, transaction ledger, settlement preview and citizen financial state.", modules: ["terminal-hub"], terminalPanel: "billing", bundleId: "admin-workspace-billing" }),
    Object.freeze({ id: "system-requests", title: "System Requests", eyebrow: "ADMIN / REQUEST QUEUE", description: "System Requests queue routed through the Terminal workspace.", modules: ["terminal-hub"], terminalPanel: "requests", bundleId: "admin-workspace-system-requests" }),
    Object.freeze({ id: "records", title: "Database Records", eyebrow: "ADMIN / RECORD MANAGEMENT", description: "System Index, Database Hub, Case Files, Address Core and GM layer records.", modules: ["database", "system-index", "case-files", "address-core", "gm-layer", "encyclopedia"], bundleId: "admin-workspace-records" }),
    Object.freeze({ id: "audit", title: "Audit Log", eyebrow: "ADMIN / AUDIT TRAIL", description: "Structured record of admin-side status changes, tag edits and access matrix updates.", modules: [], bundleId: "admin-workspace-audit" }),
    Object.freeze({ id: "data-settings", title: "Data / Settings", eyebrow: "ADMIN / DATA I/O", description: "Import, export, reset tools and local system configuration.", modules: ["access-control"], bundleId: "admin-workspace-data-settings" })
  ]);

  const byId = new Map(definitions.map((workspace) => [workspace.id, workspace]));
  const renderers = new Map();

  function list() {
    return definitions.map((workspace) => ({ ...workspace, modules: [...workspace.modules] }));
  }

  function get(workspaceId = "dashboard") {
    const id = String(workspaceId || "dashboard").trim();
    const workspace = byId.get(id) || byId.get("dashboard");
    return { ...workspace, modules: [...workspace.modules] };
  }

  function has(workspaceId = "") {
    return byId.has(String(workspaceId || "").trim());
  }

  function getBundleId(workspaceId = "") {
    return String(byId.get(String(workspaceId || "").trim())?.bundleId || "");
  }

  function registerRenderer(workspaceId = "", renderer) {
    const id = String(workspaceId || "").trim();
    if (!byId.has(id)) throw new Error(`ADMIN_WORKSPACE_UNKNOWN:${id || "EMPTY"}`);
    if (typeof renderer !== "function") throw new TypeError(`ADMIN_WORKSPACE_RENDERER_INVALID:${id}`);
    const current = renderers.get(id);
    if (current && current !== renderer) throw new Error(`ADMIN_WORKSPACE_RENDERER_DUPLICATE:${id}`);
    renderers.set(id, renderer);
    return renderer;
  }

  function getRenderer(workspaceId = "") {
    return renderers.get(String(workspaceId || "").trim()) || null;
  }

  function hasRenderer(workspaceId = "") {
    return typeof getRenderer(workspaceId) === "function";
  }

  function listRendererIds() {
    return Array.from(renderers.keys());
  }

  window.WS_APP.AdminWorkspaceRegistry = Object.freeze({
    list,
    get,
    has,
    getBundleId,
    registerRenderer,
    getRenderer,
    hasRenderer,
    listRendererIds
  });
})();
