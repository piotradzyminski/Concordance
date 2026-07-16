window.WS_APP = window.WS_APP || {};

(function registerAdminOperationsWorkspace(app) {
  "use strict";

  const registry = app.AdminWorkspaceRegistry;
  if (!registry?.registerRenderer) return;

  const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
  const RECOVERY_STATUSES = new Set(["RECOVERY_REQUIRED", "PAYMENT_RECOVERY_REQUIRED", "COMPENSATION_REQUIRED"]);

  function getContext() {
    const context = app.AdminControlRendererContext;
    if (!context) throw new Error("ADMIN_CONTROL_RENDERER_CONTEXT_UNAVAILABLE");
    return context;
  }

  function escapeHtml(value) {
    return getContext().escapeHtml(value);
  }

  function getState() {
    const source = app.adminOperationsState || {};
    const state = {
      status: String(source.status || "ALL").toUpperCase(),
      operationType: String(source.operationType || "ALL").toUpperCase(),
      recoveryOnly: source.recoveryOnly === true,
      query: String(source.query || "").trim(),
      selectedId: String(source.selectedId || "")
    };
    app.adminOperationsState = state;
    return state;
  }

  function patchState(patch = {}) {
    app.adminOperationsState = { ...getState(), ...patch };
    return getState();
  }

  function getOperations() {
    return app.getWorldBridgeOperations?.() || [];
  }

  function isRecovery(operation = {}) {
    return operation.recovery?.required === true || RECOVERY_STATUSES.has(String(operation.status || "").toUpperCase());
  }

  function getFilteredOperations() {
    const state = getState();
    const query = state.query.toLowerCase();
    return getOperations().filter((operation) => {
      const status = String(operation.status || "").toUpperCase();
      if (state.status === "ACTIVE" && TERMINAL_STATUSES.has(status)) return false;
      if (state.status === "TERMINAL" && !TERMINAL_STATUSES.has(status)) return false;
      if (!["ALL", "ACTIVE", "TERMINAL"].includes(state.status) && status !== state.status) return false;
      if (state.operationType !== "ALL" && String(operation.operationType || "").toUpperCase() !== state.operationType) return false;
      if (state.recoveryOnly && !isRecovery(operation)) return false;
      if (query) {
        const haystack = JSON.stringify({
          operationId: operation.operationId,
          operationType: operation.operationType,
          citizenId: operation.citizenId,
          providerId: operation.providerId,
          status: operation.status,
          currentStep: operation.currentStep,
          refs: operation.refs,
          errors: operation.errors,
          recovery: operation.recovery
        }).toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }

  function getSelectedOperation() {
    const state = getState();
    const all = getOperations();
    let selected = all.find((operation) => operation.operationId === state.selectedId) || null;
    if (!selected) selected = getFilteredOperations()[0] || all[0] || null;
    if (selected?.operationId && state.selectedId !== selected.operationId) patchState({ selectedId: selected.operationId });
    return selected;
  }

  function statusTone(status = "") {
    const token = String(status || "").toUpperCase();
    if (token === "COMPLETED") return "active";
    if (RECOVERY_STATUSES.has(token)) return "warning";
    if (["FAILED", "CANCELLED"].includes(token)) return "locked";
    if (["IN_PROGRESS", "COMMITTING", "CAPTURING", "AUTHORIZED"].includes(token)) return "active";
    return "neutral";
  }

  function renderReferenceSummary(operation = {}) {
    const refs = operation.refs || {};
    const parts = [
      refs.marketOrderId && `Market:${refs.marketOrderId}`,
      refs.serviceOrderId && `Service:${refs.serviceOrderId}`,
      refs.billingIntentId && `Intent:${refs.billingIntentId}`,
      refs.billingTransactionId && `Billing:${refs.billingTransactionId}`,
      refs.itemTransactionId && `ItemTx:${refs.itemTransactionId}`,
      ...(Array.isArray(refs.instanceIds) ? refs.instanceIds.map((id) => `Item:${id}`) : []),
      ...(Array.isArray(refs.housingReservationIds) ? refs.housingReservationIds.map((id) => `Housing:${id}`) : []),
      ...(Array.isArray(refs.marketStockReservationIds) ? refs.marketStockReservationIds.map((id) => `Stock:${id}`) : [])
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : "No linked domain references";
  }

  function renderLastResult() {
    const result = app.adminOperationsLastResult;
    if (!result) return "";
    const tone = result.ok ? "active" : result.status === "RECOVERY_REQUIRED" ? "warning" : "locked";
    return `
      <section class="admin-workspace-panel">
        <div class="admin-panel-headline">
          <div>
            <p class="kicker">ADMIN / LAST COMMAND RESULT</p>
            <h5>${getContext().renderStateBadge(result.status || (result.ok ? "SUCCEEDED" : "FAILED"), tone)}</h5>
          </div>
          <button class="admin-inline-button" type="button" data-admin-operations-clear-result>Clear</button>
        </div>
        <p><b>${escapeHtml(result.resultCode || "UNKNOWN")}</b></p>
        <p class="admin-panel-note">${escapeHtml(result.operation?.operationId || "No operation reference")}</p>
      </section>
    `;
  }

  function renderReadinessPanel() {
    const readiness = [
      {
        label: "WORLD BRIDGE",
        ready: typeof app.getWorldBridgeOperations === "function" && typeof app.reconcileWorldBridgeOperation === "function",
        note: "Inspect, retry, reconcile and resource claim control are enabled."
      },
      {
        label: "MARKET",
        ready: typeof app.getMarketOrder === "function" && typeof app.getWorldBridgeOperationsByReference === "function",
        note: "Linked Market references are inspectable. Dedicated Admin Market commands remain a separate integration."
      },
      {
        label: "FIRMWARE",
        ready: typeof app.getFirmwareRelease === "function",
        note: "Registry is readable. Release authoring and rollout commands are not exposed by this workspace."
      },
      {
        label: "CYBERWARE",
        ready: typeof app.getCyberwareWorldOperation === "function" || typeof app.startCyberwareService === "function",
        note: "Cyberware World Bridge operations are projected through the common operation store."
      }
    ];
    const rows = readiness.map((entry) => [
      `<strong>${escapeHtml(entry.label)}</strong>`,
      getContext().renderStateBadge(entry.ready ? "READY" : "NOT READY", entry.ready ? "active" : "warning"),
      `<small>${escapeHtml(entry.note)}</small>`
    ]);
    return `
      <section class="admin-workspace-panel">
        <div class="admin-panel-headline">
          <div><p class="kicker">ADMIN / DOMAIN READINESS</p><h5>Operations integration surfaces</h5></div>
        </div>
        ${getContext().renderAdminDataList(rows, ["Domain", "State", "Scope"], "No operation integrations registered.")}
      </section>
    `;
  }

  function renderOperationsWorkspace(workspace) {
    const { renderWorkspaceHead, renderAdminMetricCard, renderAdminDataList, renderStateBadge } = getContext();
    const all = getOperations();
    const filtered = getFilteredOperations();
    const state = getState();
    const types = [...new Set(all.map((operation) => String(operation.operationType || "WORLD_OPERATION").toUpperCase()))].sort();
    const metrics = {
      total: all.length,
      active: all.filter((operation) => !TERMINAL_STATUSES.has(String(operation.status || "").toUpperCase())).length,
      recovery: all.filter(isRecovery).length,
      claimed: all.filter((operation) => Array.isArray(operation.claims) && operation.claims.length).length,
      failed: all.filter((operation) => String(operation.status || "").toUpperCase() === "FAILED").length
    };
    const rows = filtered.map((operation) => {
      const retry = Number(operation.retry?.count || 0);
      const retryMax = Number(operation.retry?.maxAttempts || 0);
      return [
        `<strong>${escapeHtml(operation.operationId || "UNKNOWN")}</strong><small>rev ${escapeHtml(operation.revision || 0)} · ${escapeHtml(operation.updatedAt || operation.createdAt || "")}</small>`,
        `<strong>${escapeHtml(operation.operationType || "WORLD_OPERATION")}</strong><small>${escapeHtml(operation.citizenId || "NO CITIZEN")}</small>`,
        `${renderStateBadge(operation.status || "UNKNOWN", statusTone(operation.status))}<small>${escapeHtml(operation.currentStep || "DRAFT")}</small>`,
        `<strong>${escapeHtml(String(operation.claims?.length || 0))}</strong><small>resource claims</small>`,
        `<strong>${escapeHtml(`${retry} / ${retryMax}`)}</strong><small>${escapeHtml(operation.retry?.lastErrorCode || operation.recovery?.reasonCodes?.[0] || "no retry error")}</small>`,
        `<button class="admin-inline-button" type="button" data-admin-operations-inspect="${escapeHtml(operation.operationId || "")}">Inspect</button>`
      ];
    });

    return `
      ${renderWorkspaceHead(workspace, `<button class="admin-inline-button" type="button" data-admin-operations-refresh>Refresh</button>`)}
      <section class="admin-dashboard-grid">
        ${renderAdminMetricCard("Operations", metrics.total, "campaign-persistent World Bridge operations", "operations")}
        ${renderAdminMetricCard("Active", metrics.active, "non-terminal operation records", "operations")}
        ${renderAdminMetricCard("Recovery", metrics.recovery, "operations requiring reconciliation or retry", "operations")}
        ${renderAdminMetricCard("Claimed", metrics.claimed, "operations holding resource claims", "operations")}
        ${renderAdminMetricCard("Failed", metrics.failed, "terminal failed operations", "operations")}
      </section>
      ${renderLastResult()}
      <section class="admin-workspace-panel">
        <div class="admin-panel-headline">
          <div><p class="kicker">ADMIN / WORLD BRIDGE</p><h5>Operation queue</h5></div>
        </div>
        <div class="admin-form-grid">
          <label class="admin-form-field"><span>Status</span>
            <select name="adminOperationsStatus" data-admin-operations-status>
              ${["ALL", "ACTIVE", "RECOVERY_REQUIRED", "PAYMENT_RECOVERY_REQUIRED", "COMPENSATION_REQUIRED", "COMPLETED", "FAILED", "CANCELLED", "TERMINAL"].map((value) => `<option value="${value}" ${state.status === value ? "selected" : ""}>${value}</option>`).join("")}
            </select>
          </label>
          <label class="admin-form-field"><span>Operation Type</span>
            <select name="adminOperationsType" data-admin-operations-type>
              <option value="ALL">ALL</option>
              ${types.map((value) => `<option value="${escapeHtml(value)}" ${state.operationType === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
            </select>
          </label>
          <label class="admin-form-field admin-form-field--wide"><span>Search</span>
            <input type="search" name="adminOperationsQuery" value="${escapeHtml(state.query)}" placeholder="operation, citizen, reference, error" data-admin-operations-query>
          </label>
          <label class="admin-form-field"><span>Recovery only</span>
            <input class="ui-select-control" type="checkbox" name="adminOperationsRecoveryOnly" ${state.recoveryOnly ? "checked" : ""} data-admin-operations-recovery-only>
          </label>
        </div>
        <p class="admin-panel-note">The list is a projection of the canonical World Bridge Operation Store. Admin actions call public domain APIs and never edit operation records directly.</p>
        ${renderAdminDataList(rows, ["Operation", "Type / Citizen", "Status / Step", "Claims", "Retry", "Action"], "No World Bridge operations match the current filters.")}
      </section>
      ${renderReadinessPanel()}
    `;
  }

  function renderClaimList(operation = {}) {
    const claims = Array.isArray(operation.claims) ? operation.claims : [];
    if (!claims.length) return "<p>No active resource claims.</p>";
    return `<ul class="admin-inspector-notes">${claims.map((claim) => `<li><b>${escapeHtml(claim.resourceType || "RESOURCE")}</b>: ${escapeHtml(claim.resourceId || "UNKNOWN")}</li>`).join("")}</ul>`;
  }

  function renderAdminOperationsInspector() {
    const { renderStateBadge } = getContext();
    const operation = getSelectedOperation();
    if (!operation) {
      return `
        <section class="admin-inspector-block">
          <p class="kicker">OPERATIONS INSPECTOR</p>
          <h5>No operation selected</h5>
          <p>The World Bridge Operation Store is currently empty or filtered out.</p>
        </section>
      `;
    }
    const availability = app.getAdminWorldBridgeOperationActionAvailability?.(operation) || { actions: {} };
    const refs = operation.refs || {};
    const errors = Array.isArray(operation.errors) ? operation.errors.slice(-6).reverse() : [];
    const checkpoints = Array.isArray(operation.checkpoints) ? operation.checkpoints.slice(-6).reverse() : [];
    const canRetry = availability.actions?.RETRY?.allowed === true;
    const canClaim = availability.actions?.CLAIM?.allowed === true;
    const canRelease = availability.actions?.RELEASE_CLAIM?.allowed === true;

    return `
      <section class="admin-inspector-block">
        <p class="kicker">OPERATIONS INSPECTOR</p>
        <h5>${escapeHtml(operation.operationId)}</h5>
        <p>${renderStateBadge(operation.status || "UNKNOWN", statusTone(operation.status))} · ${escapeHtml(operation.currentStep || "DRAFT")}</p>
        <dl class="admin-snapshot-list">
          <div><dt>Type</dt><dd>${escapeHtml(operation.operationType || "WORLD_OPERATION")}</dd></div>
          <div><dt>Citizen</dt><dd>${escapeHtml(operation.citizenId || "—")}</dd></div>
          <div><dt>Provider</dt><dd>${escapeHtml(operation.providerId || "—")}</dd></div>
          <div><dt>Revision</dt><dd>${escapeHtml(operation.revision || 0)}</dd></div>
          <div><dt>Retry</dt><dd>${escapeHtml(operation.retry?.count || 0)} / ${escapeHtml(operation.retry?.maxAttempts || 0)}</dd></div>
          <div><dt>Compensation</dt><dd>${escapeHtml(operation.compensation?.status || "NOT_REQUIRED")}</dd></div>
        </dl>
      </section>
      <section class="admin-inspector-block">
        <p class="kicker">DOMAIN REFERENCES</p>
        <p>${escapeHtml(renderReferenceSummary(operation))}</p>
        <dl class="admin-snapshot-list">
          <div><dt>Market</dt><dd>${escapeHtml(refs.marketOrderId || "—")}</dd></div>
          <div><dt>Service</dt><dd>${escapeHtml(refs.serviceOrderId || "—")}</dd></div>
          <div><dt>Billing Intent</dt><dd>${escapeHtml(refs.billingIntentId || "—")}</dd></div>
          <div><dt>Billing Tx</dt><dd>${escapeHtml(refs.billingTransactionId || "—")}</dd></div>
          <div><dt>Item Tx</dt><dd>${escapeHtml(refs.itemTransactionId || "—")}</dd></div>
        </dl>
      </section>
      <section class="admin-inspector-block">
        <p class="kicker">RESOURCE CLAIMS</p>
        ${renderClaimList(operation)}
      </section>
      <section class="admin-inspector-block">
        <p class="kicker">RECOVERY</p>
        <p>${operation.recovery?.required ? renderStateBadge("REQUIRED", "warning") : renderStateBadge("NOT REQUIRED", "active")}</p>
        <ul class="admin-inspector-notes">
          ${(operation.recovery?.reasonCodes || []).map((code) => `<li>${escapeHtml(code)}</li>`).join("") || "<li>No recovery reasons.</li>"}
        </ul>
      </section>
      <section class="admin-inspector-block">
        <p class="kicker">COMMANDS</p>
        <div class="admin-form-actions">
          <button class="admin-inline-button" type="button" data-admin-operations-action="RECONCILE" data-operation-id="${escapeHtml(operation.operationId)}">Reconcile</button>
          <button class="admin-inline-button ${canRetry ? "" : "is-disabled"}" type="button" ${canRetry ? "" : "disabled"} data-admin-operations-action="RETRY" data-operation-id="${escapeHtml(operation.operationId)}">Retry</button>
          <button class="admin-inline-button ${canClaim ? "" : "is-disabled"}" type="button" ${canClaim ? "" : "disabled"} data-admin-operations-action="CLAIM" data-operation-id="${escapeHtml(operation.operationId)}">Claim Resource</button>
          <button class="admin-inline-button ${canRelease ? "" : "is-disabled"}" type="button" ${canRelease ? "" : "disabled"} data-admin-operations-action="RELEASE_CLAIM" data-operation-id="${escapeHtml(operation.operationId)}">Release Claims</button>
        </div>
      </section>
      <section class="admin-inspector-block">
        <p class="kicker">RECENT CHECKPOINTS</p>
        <ul class="admin-inspector-notes">
          ${checkpoints.map((entry) => `<li><b>${escapeHtml(entry.status || "UNKNOWN")}</b> / ${escapeHtml(entry.step || "DRAFT")} · rev ${escapeHtml(entry.revision || 0)} · ${escapeHtml(entry.code || "")}</li>`).join("") || "<li>No checkpoints.</li>"}
        </ul>
      </section>
      <section class="admin-inspector-block">
        <p class="kicker">RECENT ERRORS</p>
        <ul class="admin-inspector-notes">
          ${errors.map((entry) => `<li><b>${escapeHtml(entry.code || "UNKNOWN")}</b>${entry.detail ? `: ${escapeHtml(entry.detail)}` : ""}</li>`).join("") || "<li>No operation errors.</li>"}
        </ul>
      </section>
    `;
  }

  function makeIdempotencyKey(action, operation) {
    const random = Math.random().toString(36).slice(2, 9);
    return `admin-operations:${operation.operationId}:${action}:${operation.revision}:${Date.now()}:${random}`;
  }

  async function executeAction(action, operation, user) {
    const operatorNote = window.prompt(`Operator note required for ${action} on ${operation.operationId}:`, "");
    if (operatorNote == null) return null;
    if (!String(operatorNote).trim()) {
      window.alert("Operator note is required.");
      return null;
    }
    let claims = [];
    if (action === "CLAIM") {
      const resourceType = window.prompt("Resource claim type (for example ITEM_INSTANCE, MARKET_ORDER, SERVICE_ORDER):", "ITEM_INSTANCE");
      if (resourceType == null) return null;
      const resourceId = window.prompt("Resource claim ID:", "");
      if (resourceId == null) return null;
      claims = [{ resourceType, resourceId }];
    }
    if (action === "RELEASE_CLAIM") claims = operation.claims || [];

    const preview = app.previewAdminWorldBridgeOperationAction?.({
      actor: user,
      action,
      operationId: operation.operationId,
      claims
    });
    if (!preview?.ok) {
      window.alert(`Action blocked: ${preview?.resultCode || "UNKNOWN"}`);
      return preview;
    }
    const confirmed = window.confirm([
      `${action} ${operation.operationId}`,
      `Status: ${operation.status}`,
      `Step: ${operation.currentStep}`,
      `Revision: ${operation.revision}`,
      claims.length ? `Claims: ${claims.map((claim) => `${claim.resourceType}:${claim.resourceId}`).join(", ")}` : "",
      `Note: ${operatorNote}`
    ].filter(Boolean).join("\n"));
    if (!confirmed) return null;

    return app.executeAdminWorldBridgeOperationAction?.({
      actor: user,
      action,
      operationId: operation.operationId,
      claims,
      operatorNote,
      expectedRevision: operation.revision,
      idempotencyKey: makeIdempotencyKey(action, operation)
    });
  }

  function bind(container, user) {
    container.querySelectorAll("[data-admin-operations-inspect]").forEach((button) => {
      if (button.dataset.adminRuntimeBound === "operations-inspect") return;
      button.dataset.adminRuntimeBound = "operations-inspect";
      button.addEventListener("click", () => {
        patchState({ selectedId: String(button.dataset.adminOperationsInspect || "") });
        app.renderAdminControlCenter?.(user, "operations");
      });
    });

    const bindFilter = (selector, key, mapper = (value) => value) => {
      container.querySelectorAll(selector).forEach((field) => {
        if (field.dataset.adminRuntimeBound === `operations-filter-${key}`) return;
        field.dataset.adminRuntimeBound = `operations-filter-${key}`;
        const eventName = field.matches("input[type='search']") ? "input" : "change";
        field.addEventListener(eventName, () => {
          patchState({ [key]: mapper(field.type === "checkbox" ? field.checked : field.value) });
          app.renderAdminControlCenter?.(user, "operations");
        });
      });
    };
    bindFilter("[data-admin-operations-status]", "status", (value) => String(value || "ALL").toUpperCase());
    bindFilter("[data-admin-operations-type]", "operationType", (value) => String(value || "ALL").toUpperCase());
    bindFilter("[data-admin-operations-query]", "query", (value) => String(value || ""));
    bindFilter("[data-admin-operations-recovery-only]", "recoveryOnly", Boolean);

    container.querySelectorAll("[data-admin-operations-refresh]").forEach((button) => {
      if (button.dataset.adminRuntimeBound === "operations-refresh") return;
      button.dataset.adminRuntimeBound = "operations-refresh";
      button.addEventListener("click", () => app.renderAdminControlCenter?.(user, "operations"));
    });

    container.querySelectorAll("[data-admin-operations-clear-result]").forEach((button) => {
      if (button.dataset.adminRuntimeBound === "operations-clear") return;
      button.dataset.adminRuntimeBound = "operations-clear";
      button.addEventListener("click", () => {
        app.adminOperationsLastResult = null;
        app.renderAdminControlCenter?.(user, "operations");
      });
    });

    container.querySelectorAll("[data-admin-operations-action]").forEach((button) => {
      if (button.dataset.adminRuntimeBound === "operations-action") return;
      button.dataset.adminRuntimeBound = "operations-action";
      button.addEventListener("click", async () => {
        const operation = app.getWorldBridgeOperation?.(button.dataset.operationId || "");
        if (!operation) {
          window.alert("World Bridge operation not found.");
          return;
        }
        button.disabled = true;
        try {
          const result = await executeAction(String(button.dataset.adminOperationsAction || ""), operation, user);
          if (result) app.adminOperationsLastResult = result;
        } catch (error) {
          app.adminOperationsLastResult = { ok: false, status: "FAILED", resultCode: error?.message || "ADMIN_WORLD_BRIDGE_ACTION_EXCEPTION", operation };
        } finally {
          app.renderAdminControlCenter?.(user, "operations");
        }
      });
    });
  }

  app.AdminOperationsControl = Object.freeze({
    bind,
    renderInspector: renderAdminOperationsInspector,
    getState,
    getSelectedOperation
  });

  registry.registerRenderer("operations", (workspace) => renderOperationsWorkspace(workspace));
})(window.WS_APP);
