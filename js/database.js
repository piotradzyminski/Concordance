(function initDatabaseHubModule() {
  window.WS_APP = window.WS_APP || {};
  const app = window.WS_APP;
  const escapeHtml = app.escapeHtml || ((value = "") => String(value ?? ""));

function renderDatabaseHubCard(module, user) {
  const metric = app.getModuleCardMetric(module, user || app.currentUser);
  const statusInfo = app.getModuleCardStatus(module, metric);
  const statusClass = statusInfo.className;

  return `
    <article
      class="module-card database-hub-card is-openable module-card--${escapeHtml(statusClass)}"
      data-id="${escapeHtml(module.id)}"
      data-watermark="${escapeHtml(module.title || module.id)}"
      data-label="${escapeHtml(module.title || module.id)}"
      role="button"
      tabindex="0"
    >
      <span class="database-hub-card__kicker">RECORD NODE</span>
      <div class="database-hub-card__body">
        <h4>${escapeHtml(module.title)}</h4>
        <p>${escapeHtml(app.getShortModuleDescription(module))}</p>
      </div>
      <footer class="database-hub-card__footer">
        <span>${escapeHtml(statusInfo.label)}</span>
        ${metric.label ? `<small>${escapeHtml(metric.label)}</small>` : ""}
      </footer>
    </article>
  `;
}

function renderDatabaseContextLine(items = []) {
  const safeItems = Array.isArray(items) && items.length
    ? items
    : [{ label: "DATABASE" }];

  return `
    <nav class="database-context-line" aria-label="Database context">
      ${safeItems.map((item, index) => {
        const isLast = index === safeItems.length - 1;
        const label = item?.label || "DATABASE";
        const target = item?.target || "";
        if (!isLast && target) {
          return `<button type="button" data-database-nav-target="${escapeHtml(target)}">${escapeHtml(label)}</button>`;
        }
        return `<span class="${isLast ? "is-current" : ""}">${escapeHtml(label)}</span>`;
      }).join("<i>/</i>")}
    </nav>
  `;
}

function renderDatabaseEmptyState(title = "NO RECORDS", body = "No visible records in this database node.") {
  return `
    <div class="database-empty-state">
      <b>${escapeHtml(title)}</b>
      <span>${escapeHtml(body)}</span>
    </div>
  `;
}

function bindDatabaseContextActions(user) {
  document.querySelectorAll("[data-database-nav-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.databaseNavTarget || "database";
      if (target === "database") {
        renderDatabaseHubModule(user || app.currentUser);
        return;
      }
      app.openModule?.(target, user || app.currentUser, { skipLoader: true });
    });
  });
}

function renderDatabaseHubModule(user) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  if (!container) return;

  app.currentModuleId = "database";

  const databaseModuleIds = ["citizen-database", "citizen-files", "case-files"];
  const relationDiagnostics = app.getDatabaseRecordRelationDiagnostics?.() || null;
  const modules = (window.APP_DATA?.modules || [])
    .filter((module) => databaseModuleIds.includes(module.id) && app.canOpenModule(module, user))
    .sort((a, b) => databaseModuleIds.indexOf(a.id) - databaseModuleIds.indexOf(b.id));

  if (status) {
    status.textContent = `DATABASE / ${modules.length} RECORD NODE${modules.length === 1 ? "" : "S"}`;
  }

  container.innerHTML = `
    <section class="module-detail module-detail--database-hub">
      <div class="module-detail-head">
        <div>
          <p class="kicker">DATABASE / RECORD HUB</p>
          <h4>Database</h4>
        </div>
        <button class="module-back-button" type="button">Back</button>
      </div>

      ${renderDatabaseContextLine([{ label: "DATABASE" }])}

      <div class="database-hub-intro">
        <b>LOCAL RECORD ACCESS</b>
        <span>Citizen profiles, independent Citizen File documents and local Case Files linked by stable record identifiers.</span>
      </div>

      ${user?.role === "admin" && relationDiagnostics ? `
        <div class="database-relation-diagnostics ${relationDiagnostics.ready ? "is-ready" : "has-errors"}">
          <span><b>RELATION GRAPH</b> ${relationDiagnostics.ready ? "READY" : "ATTENTION"}</span>
          <small>${relationDiagnostics.citizenFileCount} Citizen Files / ${relationDiagnostics.caseFileCount} Case Files / ${relationDiagnostics.errorCount} errors / ${relationDiagnostics.warningCount} warnings</small>
        </div>
      ` : ""}

      <div class="terminal-panel-card-grid database-hub-grid">
        ${modules.map((module) => renderDatabaseHubCard(module, user)).join("")}
      </div>

      <div class="module-detail-footer">
        <button class="module-home-button" type="button">${user?.role === "admin" ? "Return to Admin Control Center" : "Return to Access Panel"}</button>
      </div>
    </section>
  `;

  app.bindModuleBackButton(user, () => app.renderModules(user));

  container.querySelector(".module-home-button")?.addEventListener("click", () => {
    app.resetModuleHistory?.();
    if (user?.role === "admin" && app.returnToAdminControlCenter?.(user)) return;
    app.renderModules(user);
  });

  bindDatabaseContextActions(user);
  app.bindModuleActions(container, user);
}

app.renderDatabaseHubModule = renderDatabaseHubModule;
app.renderDatabaseContextLine = renderDatabaseContextLine;
app.renderDatabaseEmptyState = renderDatabaseEmptyState;
app.bindDatabaseContextActions = bindDatabaseContextActions;


})();
