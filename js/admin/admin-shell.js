window.WS_APP = window.WS_APP || {};

(function initAdminShellRuntime() {
  if (window.WS_APP.AdminShellRuntime) return;

  const REGION_SELECTORS = {
    root: ".admin-control-center",
    header: "[data-admin-shell-header]",
    navigation: "[data-admin-shell-navigation]",
    workspace: "[data-admin-shell-workspace]",
    inspector: "[data-admin-shell-inspector]",
    live: "[data-admin-shell-live]"
  };

  function getAttributeSnapshot(node, name) {
    const value = node?.getAttribute?.(name);
    return value == null || value === "" ? "" : String(value);
  }

  function captureFocus(container) {
    const active = document.activeElement;
    if (!active || active === document.body || !container?.contains(active)) return null;
    return {
      id: String(active.id || ""),
      name: getAttributeSnapshot(active, "name"),
      workspaceTarget: getAttributeSnapshot(active, "data-admin-workspace-target"),
      openWorkspace: getAttributeSnapshot(active, "data-admin-open-workspace"),
      recordKey: getAttributeSnapshot(active, "data-admin-record-key"),
      citizenId: getAttributeSnapshot(active, "data-admin-citizen-id"),
      action: getAttributeSnapshot(active, "data-admin-runtime-focus-key")
    };
  }

  function matchesFocusSnapshot(node, snapshot) {
    if (!node || !snapshot) return false;
    if (snapshot.id && String(node.id || "") === snapshot.id) return true;
    if (snapshot.action && getAttributeSnapshot(node, "data-admin-runtime-focus-key") === snapshot.action) return true;
    if (snapshot.workspaceTarget && getAttributeSnapshot(node, "data-admin-workspace-target") === snapshot.workspaceTarget) return true;
    if (snapshot.openWorkspace && getAttributeSnapshot(node, "data-admin-open-workspace") === snapshot.openWorkspace) return true;
    if (snapshot.recordKey && getAttributeSnapshot(node, "data-admin-record-key") === snapshot.recordKey) {
      return !snapshot.citizenId || getAttributeSnapshot(node, "data-admin-citizen-id") === snapshot.citizenId;
    }
    if (snapshot.name && getAttributeSnapshot(node, "name") === snapshot.name) return true;
    return false;
  }

  function restoreFocus(container, snapshot, workspaceChanged) {
    if (!container || !snapshot) return;
    window.requestAnimationFrame?.(() => {
      const candidates = Array.from(container.querySelectorAll("button, a, input, select, textarea, [tabindex]"));
      const exact = candidates.find((node) => matchesFocusSnapshot(node, snapshot));
      if (exact && typeof exact.focus === "function") {
        exact.focus({ preventScroll: true });
        return;
      }
      if (!workspaceChanged) return;
      const fallback = container.querySelector("[data-admin-shell-workspace] button:not([disabled]), [data-admin-shell-workspace] input:not([disabled]), [data-admin-shell-workspace] select:not([disabled]), [data-admin-shell-workspace] textarea:not([disabled]), .admin-nav-item.is-active");
      fallback?.focus?.({ preventScroll: true });
    });
  }

  function updateNavigation(navigation, workspaceId) {
    navigation?.querySelectorAll?.("[data-admin-workspace-target]").forEach((button) => {
      const active = String(button.dataset.adminWorkspaceTarget || "") === String(workspaceId || "");
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function buildShellMarkup(options = {}) {
    return `
      <section class="admin-control-center" data-admin-workspace="${options.workspaceId || "dashboard"}">
        <header class="admin-command-band" data-admin-shell-header>${options.headerHtml || ""}</header>
        <nav class="admin-navigation-rail" data-admin-shell-navigation aria-label="Admin Navigation">${options.navigationHtml || ""}</nav>
        <main class="admin-workspace" data-admin-shell-workspace aria-label="Admin Workspace">${options.workspaceHtml || ""}</main>
        <aside class="admin-inspector-panel" data-admin-shell-inspector aria-label="Admin Inspector">${options.inspectorHtml || ""}</aside>
        <div class="admin-runtime-live-region" data-admin-shell-live aria-live="polite" aria-atomic="true"></div>
      </section>
    `;
  }

  function render(options = {}) {
    const container = options.container;
    if (!container) return { ok: false, mounted: false, workspaceChanged: false };

    const focusSnapshot = captureFocus(container);
    let root = container.querySelector(REGION_SELECTORS.root);
    const viewportSnapshot = root ? { x: window.scrollX || 0, y: window.scrollY || 0 } : null;
    const previousWorkspaceId = String(root?.dataset?.adminWorkspace || "");
    const workspaceId = String(options.workspaceId || "dashboard");
    const workspaceChanged = previousWorkspaceId !== workspaceId;
    let mounted = false;

    if (!root || options.forceMount === true) {
      container.innerHTML = buildShellMarkup(options);
      root = container.querySelector(REGION_SELECTORS.root);
      mounted = true;
    } else {
      root.dataset.adminWorkspace = workspaceId;
      const header = root.querySelector(REGION_SELECTORS.header);
      const workspace = root.querySelector(REGION_SELECTORS.workspace);
      const inspector = root.querySelector(REGION_SELECTORS.inspector);
      if (header && options.headerHtml !== undefined) header.innerHTML = options.headerHtml;
      if (workspace && options.workspaceHtml !== undefined) workspace.innerHTML = options.workspaceHtml;
      if (inspector && options.inspectorHtml !== undefined) inspector.innerHTML = options.inspectorHtml;
      updateNavigation(root.querySelector(REGION_SELECTORS.navigation), workspaceId);
    }

    if (mounted) updateNavigation(root?.querySelector(REGION_SELECTORS.navigation), workspaceId);
    root?.setAttribute("aria-busy", options.busy ? "true" : "false");
    const workspaceRegion = root?.querySelector(REGION_SELECTORS.workspace);
    if (workspaceRegion) workspaceRegion.setAttribute("aria-busy", options.busy ? "true" : "false");
    const live = root?.querySelector(REGION_SELECTORS.live);
    if (live && options.announcement) live.textContent = String(options.announcement);

    if (viewportSnapshot) {
      window.requestAnimationFrame?.(() => window.scrollTo?.(viewportSnapshot.x, viewportSnapshot.y));
    }
    restoreFocus(container, focusSnapshot, workspaceChanged);
    return { ok: Boolean(root), mounted, workspaceChanged, root };
  }

  function isMounted(container) {
    return Boolean(container?.querySelector?.(REGION_SELECTORS.root));
  }

  window.WS_APP.AdminShellRuntime = Object.freeze({
    render,
    isMounted,
    selectors: Object.freeze({ ...REGION_SELECTORS })
  });
})();
