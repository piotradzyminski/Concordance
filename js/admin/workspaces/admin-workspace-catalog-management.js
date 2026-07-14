window.WS_APP = window.WS_APP || {};

(function registerAdminCatalogManagementWorkspace(app) {
  "use strict";

  const registry = app.AdminWorkspaceRegistry;
  if (!registry?.registerRenderer) return;

  function getContext() {
    const context = app.AdminControlRendererContext;
    if (!context) throw new Error("ADMIN_CONTROL_RENDERER_CONTEXT_UNAVAILABLE");
    return context;
  }

  function escapeHtml(value) {
    return getContext().escapeHtml(value);
  }

  function state() {
    const source = app.adminCatalogManagementState || {};
    const next = {
      section: String(source.section || "overview").toLowerCase(),
      query: String(source.query || ""),
      selectedCatalogId: String(source.selectedCatalogId || "equipment").toLowerCase(),
      selectedDefinitionId: String(source.selectedDefinitionId || ""),
      packPreview: source.packPreview || null,
      lastExportAt: source.lastExportAt || null,
      equipmentEditor: source.equipmentEditor || null,
      equipmentPreview: source.equipmentPreview || null,
      equipmentResult: source.equipmentResult || null
    };
    app.adminCatalogManagementState = next;
    return next;
  }

  function patchState(patch = {}) {
    app.adminCatalogManagementState = { ...state(), ...patch };
    return state();
  }

  function badge(label, tone = "neutral") {
    return getContext().renderStateBadge(label, tone);
  }

  function getRegistry() {
    return app.getAdminCatalogRegistry?.() || [];
  }

  function getSelectedDefinition() {
    const current = state();
    if (!current.selectedDefinitionId) return null;
    const canonical = app.getAdminCatalogDefinition?.(current.selectedCatalogId, current.selectedDefinitionId) || null;
    if (canonical) return canonical;
    if (current.selectedCatalogId === "equipment") {
      const record = app.getAdminEquipmentDefinitionAuthoringRecord?.(current.selectedDefinitionId);
      return record?.draftDefinition || record?.publishedDefinition || null;
    }
    return null;
  }

  function renderTabs() {
    const current = state();
    const tabs = [
      ["overview", "Overview"],
      ["equipment", "Equipment"],
      ["cyberware", "Cyberware"],
      ["service", "Service"],
      ["subscriptions", "Subscriptions"],
      ["data-packs", "Data Packs"]
    ];
    return `<div class="admin-form-actions">${tabs.map(([id, label]) => `<button class="admin-inline-button ${current.section === id ? "is-active" : ""}" type="button" data-admin-catalog-section="${escapeHtml(id)}">${escapeHtml(label)}</button>`).join("")}</div>`;
  }

  function renderRuntimeCard(descriptor) {
    const action = descriptor.runtimeWorkspaceId
      ? `<button class="admin-inline-button" type="button" data-admin-open-workspace="${escapeHtml(descriptor.runtimeWorkspaceId)}">Open Runtime</button>`
      : `<button class="admin-inline-button" type="button" data-admin-open-module="${escapeHtml(descriptor.runtimeModuleId || "")}">Open Runtime</button>`;
    return `
      <article class="admin-metric-card">
        <span>${escapeHtml(descriptor.runtimeLabel)}</span>
        <b>RUNTIME INSTANCE</b>
        <small>Campaign-owned records and physical instances. Editing runtime does not create reusable definitions.</small>
        <div class="admin-form-actions">${action}</div>
      </article>
    `;
  }

  function renderDefinitionCard(descriptor) {
    const tone = descriptor.validationStatus === "ERROR" ? "locked" : descriptor.validationStatus === "WARNING" ? "warning" : "active";
    const authoringAction = descriptor.authoringModuleId
      ? `<button class="admin-inline-button" type="button" data-admin-open-module="${escapeHtml(descriptor.authoringModuleId)}">Open Existing Editor</button>`
      : "";
    return `
      <article class="admin-metric-card">
        <span>${escapeHtml(descriptor.title)}</span>
        <b>${escapeHtml(descriptor.definitionCount)} DEFINITIONS</b>
        <small>${escapeHtml(descriptor.owner)} · ${escapeHtml(descriptor.sourceFiles.join(" / "))}</small>
        <p>${badge(descriptor.validationStatus, tone)} ${badge(descriptor.authoringStatus, descriptor.authoringStatus === "AVAILABLE_IN_SYSTEM" || descriptor.authoringStatus === "AVAILABLE_IN_ADMIN" ? "active" : "neutral")}</p>
        <div class="admin-form-actions">
          <button class="admin-inline-button" type="button" data-admin-catalog-section="${escapeHtml(descriptor.catalogId)}">Inspect Definitions</button>
          ${authoringAction}
        </div>
      </article>
    `;
  }

  function renderOverview(workspace) {
    const descriptors = getRegistry();
    return `
      ${getContext().renderWorkspaceHead(workspace, renderTabs())}
      <section class="admin-workspace-panel">
        <p class="kicker">CATALOG BOUNDARY</p>
        <h5>Runtime instances and reusable definitions are separate domains</h5>
        <p>Runtime records belong to the current campaign. Reusable definitions belong to canonical catalogs and are exported as data packs for the patch/merge workflow.</p>
      </section>
      <section class="admin-workspace-panel">
        <p class="kicker">RUNTIME INSTANCES</p>
        <div class="admin-metrics-grid">${descriptors.map(renderRuntimeCard).join("")}</div>
      </section>
      <section class="admin-workspace-panel">
        <p class="kicker">REUSABLE DEFINITIONS</p>
        <div class="admin-metrics-grid">${descriptors.map(renderDefinitionCard).join("")}</div>
      </section>
      <section class="admin-workspace-panel">
        <p class="kicker">AUTHORING POLICY</p>
        <p>Equipment authoring is available through the canonical Equipment Catalog authoring store and exports replacement-ready data packs. Cyberware and Service authoring remain planned domain patches. The existing Subscription Catalog Editor remains canonical.</p>
      </section>
    `;
  }

  function definitionCategory(catalogId, definition = {}) {
    if (catalogId === "cyberware") return definition.catalogType || definition.subtype || "CYBERWARE";
    if (catalogId === "service") return definition.serviceType || definition.domain || "SERVICE";
    if (catalogId === "subscriptions") return definition.category || definition.market || "SUBSCRIPTION";
    return definition.category || definition.itemType || definition.subtype || "EQUIPMENT";
  }


  function getEquipmentAuthoringRecord(definitionId = state().selectedDefinitionId) {
    return app.getAdminEquipmentDefinitionAuthoringRecord?.(definitionId) || null;
  }

  function createEquipmentDraftTemplate() {
    return {
      id: `eqcat-new-${Date.now().toString(36)}`,
      name: "New Equipment Definition",
      category: "MISC",
      subtype: "",
      itemType: "GENERIC_ITEM",
      footprint: "1x1",
      status: "OWNED",
      operatingStatus: "ACTIVE",
      legality: "UNREGISTERED",
      condition: 100,
      value: 0,
      capacityTier: 0,
      capacitySlots: 0,
      requiresSubscriptionCategory: "",
      requiresSubscriptionTier: 0,
      marketDepartment: "",
      marketSubcategory: "",
      tags: [],
      notes: "",
      gmNote: "",
      itemTypeProfile: {},
      equipProfile: {},
      containerProfile: null,
      mountProfile: null,
      visualProfile: {}
    };
  }

  function jsonText(value, fallback = {}) {
    return JSON.stringify(value == null ? fallback : value, null, 2);
  }

  function renderEquipmentResult(result) {
    if (!result) return "";
    const success = result.ok === true;
    return `<div class="admin-result-banner ${success ? "is-success" : "is-error"}"><b>${escapeHtml(result.resultCode || (success ? "SUCCEEDED" : "FAILED"))}</b><span>${escapeHtml(result.definitionId || result.message || "")}</span></div>`;
  }

  function renderEquipmentDraftList() {
    const records = app.getAdminEquipmentDefinitionAuthoringRecords?.({ includeDrafts: true, includePublished: true, includeArchived: true }) || [];
    const drafts = records.filter((record) => record.draftDefinition);
    if (!drafts.length) return `<p class="file-empty">No saved Equipment definition drafts.</p>`;
    return `<div class="admin-record-list">${drafts.map((record) => `
      <button class="admin-record-row" type="button" data-admin-equipment-authoring-edit-draft="${escapeHtml(record.definitionId)}">
        <span><b>${escapeHtml(record.draftDefinition?.name || record.definitionId)}</b><small>${escapeHtml(record.definitionId)}</small></span>
        <span>revision ${escapeHtml(record.revision)}</span>
        <span>${badge(record.state || "DRAFT", record.publishedDefinition ? "warning" : "neutral")}</span>
      </button>
    `).join("")}</div>`;
  }

  function renderEquipmentEditor(editor) {
    if (!editor?.definition) return "";
    const definition = editor.definition;
    const footprints = Object.keys(app.EQUIPMENT_FOOTPRINTS || { "1x1": {} });
    const definitionIdLocked = !["CREATE", "DUPLICATE"].includes(String(editor.mode || "").toUpperCase());
    return `
      <section class="admin-workspace-panel">
        <p class="kicker">EQUIPMENT DEFINITION AUTHORING / ${escapeHtml(String(editor.mode || "EDIT").toUpperCase())}</p>
        <form data-admin-equipment-authoring-form>
          <input type="hidden" name="sourceDefinitionId" value="${escapeHtml(editor.sourceDefinitionId || "")}" />
          <input type="hidden" name="expectedRevision" value="${escapeHtml(editor.expectedRevision || 0)}" />
          <div class="admin-form-grid">
            <label>Stable definition ID
              <input name="id" required pattern="eqcat-[a-z0-9-]+" value="${escapeHtml(definition.id || "")}" ${definitionIdLocked ? 'readonly aria-readonly="true"' : ""} />
            </label>
            <label>Name
              <input name="name" required value="${escapeHtml(definition.name || "")}" />
            </label>
            <label>Category
              <input name="category" required value="${escapeHtml(definition.category || "MISC")}" />
            </label>
            <label>Subtype
              <input name="subtype" value="${escapeHtml(definition.subtype || "")}" />
            </label>
            <label>Item type
              <input name="itemType" required value="${escapeHtml(definition.itemType || "GENERIC_ITEM")}" />
            </label>
            <label>Footprint
              <select name="footprint">${footprints.map((footprint) => `<option value="${escapeHtml(footprint)}" ${definition.footprint === footprint ? "selected" : ""}>${escapeHtml(footprint)}</option>`).join("")}</select>
            </label>
            <label>Legality
              <input name="legality" value="${escapeHtml(definition.legality || "UNREGISTERED")}" />
            </label>
            <label>Default condition
              <input name="condition" type="number" min="0" max="100" value="${escapeHtml(definition.condition ?? 100)}" />
            </label>
            <label>Base value
              <input name="value" type="number" min="0" value="${escapeHtml(definition.value ?? 0)}" />
            </label>
            <label>Capacity tier
              <input name="capacityTier" type="number" min="0" value="${escapeHtml(definition.capacityTier ?? 0)}" />
            </label>
            <label>Capacity slots
              <input name="capacitySlots" type="number" min="0" value="${escapeHtml(definition.capacitySlots ?? 0)}" />
            </label>
            <label>Subscription category
              <input name="requiresSubscriptionCategory" value="${escapeHtml(definition.requiresSubscriptionCategory || "")}" />
            </label>
            <label>Subscription tier
              <input name="requiresSubscriptionTier" type="number" min="0" value="${escapeHtml(definition.requiresSubscriptionTier ?? 0)}" />
            </label>
            <label>Market department
              <input name="marketDepartment" value="${escapeHtml(definition.marketDepartment || "")}" />
            </label>
            <label>Market subcategory
              <input name="marketSubcategory" value="${escapeHtml(definition.marketSubcategory || "")}" />
            </label>
            <label class="admin-form-field--wide">Tags, comma separated
              <input name="tags" value="${escapeHtml((definition.tags || []).join(", "))}" />
            </label>
            <label class="admin-form-field--wide">Player-facing notes
              <textarea name="notes" rows="2">${escapeHtml(definition.notes || "")}</textarea>
            </label>
            <label class="admin-form-field--wide">GM note
              <textarea name="gmNote" rows="2">${escapeHtml(definition.gmNote || "")}</textarea>
            </label>
            <label class="admin-form-field--wide">Item type profile JSON
              <textarea name="itemTypeProfile" rows="5">${escapeHtml(jsonText(definition.itemTypeProfile, {}))}</textarea>
            </label>
            <label class="admin-form-field--wide">Equip profile JSON
              <textarea name="equipProfile" rows="5">${escapeHtml(jsonText(definition.equipProfile, {}))}</textarea>
            </label>
            <label class="admin-form-field--wide">Container profile JSON or null
              <textarea name="containerProfile" rows="5">${escapeHtml(jsonText(definition.containerProfile, null))}</textarea>
            </label>
            <label class="admin-form-field--wide">Mount profile JSON or null
              <textarea name="mountProfile" rows="5">${escapeHtml(jsonText(definition.mountProfile, null))}</textarea>
            </label>
            <label class="admin-form-field--wide">Visual profile JSON
              <textarea name="visualProfile" rows="4">${escapeHtml(jsonText(definition.visualProfile, {}))}</textarea>
            </label>
            <label class="admin-form-field--wide">Operator note
              <input name="operatorNote" placeholder="Required for Save Draft and Publish; preview is read-only" />
            </label>
          </div>
          <div class="admin-form-actions">
            <button class="admin-inline-button" type="submit" value="PREVIEW" data-admin-equipment-authoring-submit>Preview Instance</button>
            <button class="admin-inline-button" type="submit" value="SAVE_DRAFT" data-admin-equipment-authoring-submit>Save Draft</button>
            <button class="admin-inline-button" type="submit" value="PUBLISH" data-admin-equipment-authoring-submit>Publish</button>
            <button class="admin-inline-button" type="button" data-admin-equipment-authoring-cancel>Cancel</button>
          </div>
        </form>
      </section>
    `;
  }

  function renderEquipmentAuthoringPanel() {
    const current = state();
    const selected = getSelectedDefinition();
    const record = getEquipmentAuthoringRecord();
    const selectedArchived = selected?.archived === true || record?.archived === true;
    return `
      <section class="admin-workspace-panel">
        <p class="kicker">CANONICAL EQUIPMENT AUTHORING</p>
        <p>Create and publish reusable Equipment definitions. Drafts remain in the Equipment authoring store; published definitions are projected through the canonical Equipment Catalog Store.</p>
        ${renderEquipmentResult(current.equipmentResult)}
        <div class="admin-form-actions">
          <button class="admin-inline-button" type="button" data-admin-equipment-authoring-create>Create Draft</button>
          <button class="admin-inline-button" type="button" data-admin-equipment-authoring-duplicate ${selected ? "" : "disabled"}>Duplicate Selected</button>
          <button class="admin-inline-button" type="button" data-admin-equipment-authoring-edit ${selected ? "" : "disabled"}>Edit Selected</button>
          <button class="admin-inline-button" type="button" data-admin-equipment-authoring-export>Export Equipment Pack</button>
        </div>
        ${selected ? `
          <form class="admin-form-grid" data-admin-equipment-authoring-lifecycle>
            <input type="hidden" name="definitionId" value="${escapeHtml(selected.id || selected.catalogId || "")}" />
            <input type="hidden" name="expectedRevision" value="${escapeHtml(record?.revision || 0)}" />
            <label class="admin-form-field--wide">Lifecycle operator note
              <input name="operatorNote" required placeholder="Reason for archive, restore or draft discard" />
            </label>
            <div class="admin-form-actions admin-form-field--wide">
              ${selectedArchived
                ? `<button class="admin-inline-button" type="submit" value="RESTORE" data-admin-equipment-lifecycle-submit>Restore Definition</button>`
                : `<button class="admin-inline-button" type="submit" value="ARCHIVE" data-admin-equipment-lifecycle-submit>Archive Definition</button>`}
              ${record?.draftDefinition ? `<button class="admin-inline-button" type="submit" value="DISCARD_DRAFT" data-admin-equipment-lifecycle-submit>Discard Saved Draft</button>` : ""}
            </div>
          </form>
        ` : ""}
      </section>
      ${renderEquipmentEditor(current.equipmentEditor)}
      ${current.equipmentPreview ? `
        <section class="admin-workspace-panel">
          <p class="kicker">INSTANCE PREVIEW</p>
          ${renderEquipmentResult(current.equipmentPreview)}
          <pre>${escapeHtml(JSON.stringify(current.equipmentPreview.instancePreview || current.equipmentPreview.issues || {}, null, 2))}</pre>
        </section>
      ` : ""}
      <section class="admin-workspace-panel">
        <p class="kicker">SAVED AUTHORING DRAFTS</p>
        ${renderEquipmentDraftList()}
      </section>
    `;
  }

  function renderCatalog(workspace, catalogId) {
    const current = state();
    const descriptor = app.AdminCatalogManagement?.getCatalogDescriptor?.(catalogId) || {};
    const definitions = app.searchAdminCatalogDefinitions?.(catalogId, current.query) || [];
    if (!current.selectedDefinitionId && definitions[0]?._definitionId) patchState({ selectedCatalogId: catalogId, selectedDefinitionId: definitions[0]._definitionId });
    return `
      ${getContext().renderWorkspaceHead(workspace, renderTabs())}
      <section class="admin-workspace-panel">
        <p class="kicker">REUSABLE DEFINITIONS / ${escapeHtml(catalogId.toUpperCase())}</p>
        <div class="admin-form-grid">
          <label class="admin-form-field--wide">Search definitions
            <input type="search" value="${escapeHtml(current.query)}" data-admin-catalog-query placeholder="ID, title, category, provider or tag" />
          </label>
        </div>
        <p>${badge(descriptor.validationStatus || "UNKNOWN", descriptor.validationStatus === "ERROR" ? "locked" : descriptor.validationStatus === "WARNING" ? "warning" : "active")} ${escapeHtml(descriptor.definitionCount || 0)} canonical definitions · revision ${escapeHtml(descriptor.revision || "")}</p>
      </section>
      ${catalogId === "equipment" ? renderEquipmentAuthoringPanel() : ""}
      <section class="admin-workspace-panel">
        <div class="admin-record-list">
          ${definitions.slice(0, 250).map((definition) => `
            <button class="admin-record-row ${current.selectedDefinitionId === definition._definitionId ? "is-selected" : ""}" type="button" data-admin-catalog-inspect="${escapeHtml(definition._definitionId)}" data-admin-catalog-id="${escapeHtml(catalogId)}">
              <span><b>${escapeHtml(definition._title)}</b><small>${escapeHtml(definition._definitionId)}</small></span>
              <span>${escapeHtml(definitionCategory(catalogId, definition))}</span>
              <span>${definition.archived === true || definition.active === false ? badge("ARCHIVED", "neutral") : badge("ACTIVE", "active")}</span>
            </button>
          `).join("") || `<p class="file-empty">No definitions match the current filter.</p>`}
        </div>
        ${definitions.length > 250 ? `<p class="file-empty">Showing first 250 of ${escapeHtml(definitions.length)} matching definitions.</p>` : ""}
      </section>
    `;
  }

  function renderPackPreview(preview) {
    if (!preview) return `<p class="file-empty">No data pack has been previewed in this session.</p>`;
    if (!preview.ok) {
      return `<div class="admin-result-banner is-error"><b>${escapeHtml(preview.resultCode || "ADMIN_CATALOG_PACK_FAILED")}</b><span>${escapeHtml(preview.message || preview.actualSchemaVersion || "Catalog pack validation failed.")}</span></div>`;
    }
    return `
      <div class="admin-result-banner is-success"><b>${escapeHtml(preview.resultCode)}</b><span>Preview only. Applying a pack requires the relevant domain authoring patch.</span></div>
      <div class="admin-record-list">
        ${(preview.summaries || []).map((summary) => `
          <div class="admin-record-row">
            <span><b>${escapeHtml(summary.catalogId.toUpperCase())}</b><small>${escapeHtml(summary.incomingCount)} incoming / ${escapeHtml(summary.currentCount)} current</small></span>
            <span>+${escapeHtml(summary.added)} / Δ${escapeHtml(summary.changed)} / =${escapeHtml(summary.unchanged)}</span>
            <span>${summary.issueCount ? badge(`${summary.issueCount} ISSUES`, "warning") : badge("VALID", "active")}</span>
          </div>
        `).join("")}
      </div>
      ${(preview.issues || []).length ? `<ul class="admin-inspector-notes">${preview.issues.slice(0, 30).map((issue) => `<li><b>${escapeHtml(issue.severity)}</b> ${escapeHtml(issue.code)} ${escapeHtml(issue.catalogId || "")} ${escapeHtml(issue.definitionId || "")}</li>`).join("")}</ul>` : ""}
    `;
  }

  function renderDataPacks(workspace) {
    const current = state();
    return `
      ${getContext().renderWorkspaceHead(workspace, renderTabs())}
      <section class="admin-workspace-panel">
        <p class="kicker">CANONICAL DATA PACK EXPORT</p>
        <h5>Export current reusable definitions</h5>
        <p>The export contains stable IDs, schema versions and current canonical catalog payloads. It is intended for patch review and merge workflows.</p>
        <div class="admin-form-actions">
          <button class="admin-inline-button" type="button" data-admin-catalog-export>Export All Catalogs</button>
          <label class="admin-inline-button" for="admin-catalog-pack-input">Preview Data Pack</label>
          <input id="admin-catalog-pack-input" type="file" accept="application/json,.json" data-admin-catalog-pack-input hidden />
        </div>
        ${current.lastExportAt ? `<p class="file-empty">Last export: ${escapeHtml(current.lastExportAt)}</p>` : ""}
      </section>
      <section class="admin-workspace-panel">
        <p class="kicker">IMPORT PREVIEW</p>
        ${renderPackPreview(current.packPreview)}
      </section>
      <section class="admin-workspace-panel">
        <p class="kicker">APPLY POLICY</p>
        <p>${badge("PREVIEW ONLY", "warning")} Cross-domain packs remain preview-only. Equipment definitions can be created and published through the Equipment authoring panel; Cyberware and Service still require their domain authoring stores. Subscription definitions continue to use the existing Subscription Catalog Editor.</p>
      </section>
    `;
  }

  function renderWorkspace(workspace) {
    const current = state();
    if (current.section === "overview") return renderOverview(workspace);
    if (current.section === "data-packs") return renderDataPacks(workspace);
    if (["equipment", "cyberware", "service", "subscriptions"].includes(current.section)) return renderCatalog(workspace, current.section);
    patchState({ section: "overview" });
    return renderOverview(workspace);
  }

  function renderInspector() {
    const current = state();
    const descriptor = app.AdminCatalogManagement?.getCatalogDescriptor?.(current.selectedCatalogId) || null;
    const definition = getSelectedDefinition();
    if (!descriptor || current.section === "overview" || current.section === "data-packs") {
      const registryItems = getRegistry();
      return `
        <section class="admin-inspector-block">
          <p class="kicker">CATALOG INSPECTOR</p>
          <h5>Canonical catalog inventory</h5>
          <p>Definitions are read from their existing owners. This workspace adds no shadow persistence.</p>
        </section>
        <section class="admin-inspector-block">
          <p class="kicker">COUNTS</p>
          <dl class="admin-snapshot-list">
            ${registryItems.map((item) => `<div><dt>${escapeHtml(item.catalogId)}</dt><dd>${escapeHtml(item.definitionCount)}</dd></div>`).join("")}
          </dl>
        </section>
      `;
    }
    if (!definition) {
      return `<section class="admin-inspector-block"><p class="kicker">CATALOG INSPECTOR</p><h5>${escapeHtml(descriptor.title)}</h5><p>Select a definition from the workspace list.</p></section>`;
    }
    const definitionId = app.AdminCatalogManagement.getDefinitionId(current.selectedCatalogId, definition);
    const title = app.AdminCatalogManagement.getDefinitionTitle(current.selectedCatalogId, definition);
    const keys = Object.keys(definition).filter((key) => !key.startsWith("_")).slice(0, 18);
    return `
      <section class="admin-inspector-block">
        <p class="kicker">REUSABLE DEFINITION</p>
        <h5>${escapeHtml(title)}</h5>
        <p><code>${escapeHtml(definitionId)}</code></p>
        <p>${badge(current.selectedCatalogId.toUpperCase(), "active")} ${badge(descriptor.authoringStatus, descriptor.authoringStatus === "AVAILABLE_IN_SYSTEM" || descriptor.authoringStatus === "AVAILABLE_IN_ADMIN" ? "active" : "neutral")}</p>
      </section>
      <section class="admin-inspector-block">
        <p class="kicker">SOURCE OWNER</p>
        <p>${escapeHtml(descriptor.owner)}</p>
        <ul class="admin-inspector-notes">${descriptor.sourceFiles.map((file) => `<li>${escapeHtml(file)}</li>`).join("")}</ul>
      </section>
      <section class="admin-inspector-block">
        <p class="kicker">DEFINITION SNAPSHOT</p>
        <dl class="admin-snapshot-list">
          ${keys.map((key) => {
            const value = definition[key];
            const display = value && typeof value === "object" ? JSON.stringify(value).slice(0, 180) : String(value ?? "");
            return `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(display)}</dd></div>`;
          }).join("")}
        </dl>
      </section>
      <section class="admin-inspector-block">
        <p class="kicker">AUTHORING</p>
        <p>${descriptor.authoringStatus === "AVAILABLE_IN_SYSTEM"
          ? "An existing canonical editor is available through the System module."
          : descriptor.authoringStatus === "AVAILABLE_IN_ADMIN"
            ? "Canonical authoring is available in this Admin workspace."
            : `Planned owner patch: ${escapeHtml(descriptor.authoringPatch || "domain authoring patch")}.`}</p>
      </section>
    `;
  }

  function downloadDataPack() {
    const pack = app.buildAdminCatalogDataPack?.();
    const serialized = app.serializeAdminCatalogDataPack?.(pack);
    if (!pack || !serialized) throw new Error("ADMIN_CATALOG_PACK_EXPORT_UNAVAILABLE");
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `future-noir-catalog-pack-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    patchState({ lastExportAt: new Date().toISOString() });
  }


  function parseJsonField(formData, name, fallback) {
    const raw = String(formData.get(name) || "").trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  }

  function readEquipmentDefinitionForm(form) {
    const formData = new FormData(form);
    return {
      definition: {
        id: formData.get("id"),
        name: formData.get("name"),
        category: formData.get("category"),
        subtype: formData.get("subtype"),
        itemType: formData.get("itemType"),
        footprint: formData.get("footprint"),
        status: "OWNED",
        operatingStatus: "ACTIVE",
        legality: formData.get("legality"),
        condition: Number(formData.get("condition") || 0),
        value: Number(formData.get("value") || 0),
        capacityTier: Number(formData.get("capacityTier") || 0),
        capacitySlots: Number(formData.get("capacitySlots") || 0),
        requiresSubscriptionCategory: formData.get("requiresSubscriptionCategory"),
        requiresSubscriptionTier: Number(formData.get("requiresSubscriptionTier") || 0),
        marketDepartment: formData.get("marketDepartment"),
        marketSubcategory: formData.get("marketSubcategory"),
        tags: String(formData.get("tags") || "").split(",").map((entry) => entry.trim()).filter(Boolean),
        notes: formData.get("notes"),
        gmNote: formData.get("gmNote"),
        itemTypeProfile: parseJsonField(formData, "itemTypeProfile", {}),
        equipProfile: parseJsonField(formData, "equipProfile", {}),
        containerProfile: parseJsonField(formData, "containerProfile", null),
        mountProfile: parseJsonField(formData, "mountProfile", null),
        visualProfile: parseJsonField(formData, "visualProfile", {})
      },
      sourceDefinitionId: String(formData.get("sourceDefinitionId") || ""),
      expectedRevision: Number(formData.get("expectedRevision") || 0),
      operatorNote: String(formData.get("operatorNote") || "").trim()
    };
  }

  function adminActor(user = {}) {
    return {
      actorId: user.id || user.login || "",
      actorRole: user.role || "",
      displayName: user.displayName || user.login || "ADMIN"
    };
  }

  function commandInput(user, payload = {}) {
    return {
      ...payload,
      actor: adminActor(user),
      idempotencyKey: `admin-equipment-catalog:${payload.command || "command"}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`,
      correlationId: `equipment-catalog:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`
    };
  }

  function openEquipmentEditor(mode, definition, sourceDefinitionId = "", expectedRevision = 0) {
    patchState({
      section: "equipment",
      selectedCatalogId: "equipment",
      selectedDefinitionId: definition?.id || definition?.catalogId || "",
      equipmentEditor: {
        mode,
        sourceDefinitionId: String(sourceDefinitionId || ""),
        expectedRevision,
        definition: JSON.parse(JSON.stringify(definition || createEquipmentDraftTemplate()))
      },
      equipmentPreview: null,
      equipmentResult: null
    });
  }

  function downloadEquipmentDataPack() {
    const pack = app.buildAdminEquipmentCatalogDataPack?.({ includeDrafts: true });
    const serialized = app.serializeAdminEquipmentCatalogDataPack?.(pack);
    if (!pack || !serialized) throw new Error("EQUIPMENT_CATALOG_PACK_EXPORT_UNAVAILABLE");
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `future-noir-equipment-catalog-authoring-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    patchState({ lastExportAt: new Date().toISOString() });
  }

  function bind(container, user) {
    container.querySelectorAll("[data-admin-catalog-section]").forEach((button) => {
      if (button.dataset.adminRuntimeBound === "catalog-section") return;
      button.dataset.adminRuntimeBound = "catalog-section";
      button.addEventListener("click", () => {
        const section = String(button.dataset.adminCatalogSection || "overview").toLowerCase();
        patchState({ section, selectedCatalogId: ["equipment", "cyberware", "service", "subscriptions"].includes(section) ? section : state().selectedCatalogId, selectedDefinitionId: "", query: "" });
        app.renderAdminControlCenter?.(user, "catalog-management");
      });
    });

    container.querySelectorAll("[data-admin-catalog-inspect]").forEach((button) => {
      if (button.dataset.adminRuntimeBound === "catalog-inspect") return;
      button.dataset.adminRuntimeBound = "catalog-inspect";
      button.addEventListener("click", () => {
        patchState({ selectedCatalogId: String(button.dataset.adminCatalogId || state().section), selectedDefinitionId: String(button.dataset.adminCatalogInspect || "") });
        app.renderAdminControlCenter?.(user, "catalog-management");
      });
    });

    container.querySelectorAll("[data-admin-catalog-query]").forEach((input) => {
      if (input.dataset.adminRuntimeBound === "catalog-query") return;
      input.dataset.adminRuntimeBound = "catalog-query";
      input.addEventListener("input", () => {
        patchState({ query: String(input.value || ""), selectedDefinitionId: "" });
        app.renderAdminControlCenter?.(user, "catalog-management");
      });
    });

    container.querySelectorAll("[data-admin-catalog-export]").forEach((button) => {
      if (button.dataset.adminRuntimeBound === "catalog-export") return;
      button.dataset.adminRuntimeBound = "catalog-export";
      button.addEventListener("click", () => {
        try {
          downloadDataPack();
          app.renderAdminControlCenter?.(user, "catalog-management");
        } catch (error) {
          window.alert(error?.message || "Catalog export failed.");
        }
      });
    });

    container.querySelectorAll("[data-admin-catalog-pack-input]").forEach((input) => {
      if (input.dataset.adminRuntimeBound === "catalog-pack-input") return;
      input.dataset.adminRuntimeBound = "catalog-pack-input";
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const preview = app.previewAdminCatalogDataPack?.(await file.text()) || { ok: false, resultCode: "ADMIN_CATALOG_PACK_PREVIEW_UNAVAILABLE" };
          patchState({ packPreview: preview });
        } catch (error) {
          patchState({ packPreview: { ok: false, resultCode: "ADMIN_CATALOG_PACK_READ_FAILED", message: error?.message || "Unable to read data pack." } });
        }
        app.renderAdminControlCenter?.(user, "catalog-management");
      });
    });


    container.querySelectorAll("[data-admin-equipment-authoring-create]").forEach((button) => {
      if (button.dataset.adminRuntimeBound === "equipment-authoring-create") return;
      button.dataset.adminRuntimeBound = "equipment-authoring-create";
      button.addEventListener("click", () => {
        openEquipmentEditor("CREATE", createEquipmentDraftTemplate(), "", 0);
        app.renderAdminControlCenter?.(user, "catalog-management");
      });
    });

    container.querySelectorAll("[data-admin-equipment-authoring-duplicate]").forEach((button) => {
      if (button.dataset.adminRuntimeBound === "equipment-authoring-duplicate") return;
      button.dataset.adminRuntimeBound = "equipment-authoring-duplicate";
      button.addEventListener("click", () => {
        const selected = getSelectedDefinition();
        if (!selected) return;
        const copy = JSON.parse(JSON.stringify(selected));
        const baseId = String(selected.id || selected.catalogId || "eqcat-item").replace(/-copy(?:-[a-z0-9]+)?$/, "");
        copy.id = `${baseId}-copy-${Date.now().toString(36).slice(-5)}`;
        copy.catalogId = copy.id;
        copy.name = `${selected.name || "Equipment"} Copy`;
        copy.archived = false;
        openEquipmentEditor("DUPLICATE", copy, String(selected.id || selected.catalogId || ""), 0);
        app.renderAdminControlCenter?.(user, "catalog-management");
      });
    });

    container.querySelectorAll("[data-admin-equipment-authoring-edit]").forEach((button) => {
      if (button.dataset.adminRuntimeBound === "equipment-authoring-edit") return;
      button.dataset.adminRuntimeBound = "equipment-authoring-edit";
      button.addEventListener("click", () => {
        const selected = getSelectedDefinition();
        if (!selected) return;
        const record = getEquipmentAuthoringRecord(selected.id || selected.catalogId || "");
        openEquipmentEditor("EDIT", record?.draftDefinition || selected, selected.id || selected.catalogId || "", record?.revision || 0);
        app.renderAdminControlCenter?.(user, "catalog-management");
      });
    });

    container.querySelectorAll("[data-admin-equipment-authoring-edit-draft]").forEach((button) => {
      if (button.dataset.adminRuntimeBound === "equipment-authoring-edit-draft") return;
      button.dataset.adminRuntimeBound = "equipment-authoring-edit-draft";
      button.addEventListener("click", () => {
        const definitionId = String(button.dataset.adminEquipmentAuthoringEditDraft || "");
        const record = app.getAdminEquipmentDefinitionAuthoringRecord?.(definitionId);
        if (!record?.draftDefinition) return;
        patchState({ selectedDefinitionId: definitionId });
        openEquipmentEditor("EDIT_DRAFT", record.draftDefinition, record.sourceDefinitionId || definitionId, record.revision || 0);
        app.renderAdminControlCenter?.(user, "catalog-management");
      });
    });

    container.querySelectorAll("[data-admin-equipment-authoring-cancel]").forEach((button) => {
      if (button.dataset.adminRuntimeBound === "equipment-authoring-cancel") return;
      button.dataset.adminRuntimeBound = "equipment-authoring-cancel";
      button.addEventListener("click", () => {
        patchState({ equipmentEditor: null, equipmentPreview: null, equipmentResult: null });
        app.renderAdminControlCenter?.(user, "catalog-management");
      });
    });

    container.querySelectorAll("[data-admin-equipment-authoring-export]").forEach((button) => {
      if (button.dataset.adminRuntimeBound === "equipment-authoring-export") return;
      button.dataset.adminRuntimeBound = "equipment-authoring-export";
      button.addEventListener("click", () => {
        try {
          downloadEquipmentDataPack();
          app.renderAdminControlCenter?.(user, "catalog-management");
        } catch (error) {
          patchState({ equipmentResult: { ok: false, resultCode: error?.message || "EQUIPMENT_CATALOG_PACK_EXPORT_FAILED" } });
          app.renderAdminControlCenter?.(user, "catalog-management");
        }
      });
    });

    container.querySelectorAll("[data-admin-equipment-authoring-form]").forEach((form) => {
      if (form.dataset.adminRuntimeBound === "equipment-authoring-form") return;
      form.dataset.adminRuntimeBound = "equipment-authoring-form";
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const action = String(event.submitter?.value || "PREVIEW").toUpperCase();
        let payload;
        try {
          payload = readEquipmentDefinitionForm(form);
        } catch (error) {
          patchState({ equipmentResult: { ok: false, resultCode: "EQUIPMENT_DEFINITION_JSON_INVALID", message: error?.message || "Invalid JSON profile." } });
          app.renderAdminControlCenter?.(user, "catalog-management");
          return;
        }
        let result;
        if (action === "PREVIEW") {
          result = app.previewAdminEquipmentDefinitionInstance?.({ definition: payload.definition, sourceDefinitionId: payload.sourceDefinitionId });
          patchState({ equipmentPreview: result, equipmentResult: result });
        } else if (action === "SAVE_DRAFT") {
          result = app.saveAdminEquipmentDefinitionDraft?.(commandInput(user, { ...payload, definitionId: payload.definition.id, command: action }));
          patchState({
            selectedDefinitionId: payload.definition.id,
            equipmentResult: result,
            equipmentPreview: null,
            equipmentEditor: result?.ok ? { ...state().equipmentEditor, definition: payload.definition, sourceDefinitionId: payload.sourceDefinitionId || payload.definition.id, expectedRevision: result.revisionAfter } : state().equipmentEditor
          });
        } else if (action === "PUBLISH") {
          result = app.publishAdminEquipmentDefinition?.(commandInput(user, { ...payload, definitionId: payload.definition.id, command: action }));
          patchState({ selectedDefinitionId: payload.definition.id, equipmentResult: result, equipmentPreview: null, equipmentEditor: result?.ok ? null : state().equipmentEditor });
        }
        app.renderAdminControlCenter?.(user, "catalog-management");
      });
    });

    container.querySelectorAll("[data-admin-equipment-authoring-lifecycle]").forEach((form) => {
      if (form.dataset.adminRuntimeBound === "equipment-authoring-lifecycle") return;
      form.dataset.adminRuntimeBound = "equipment-authoring-lifecycle";
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const action = String(event.submitter?.value || "").toUpperCase();
        const payload = commandInput(user, {
          command: action,
          definitionId: String(formData.get("definitionId") || ""),
          expectedRevision: Number(formData.get("expectedRevision") || 0),
          operatorNote: String(formData.get("operatorNote") || "").trim()
        });
        let result = null;
        if (action === "ARCHIVE") result = app.archiveAdminEquipmentDefinition?.(payload);
        if (action === "RESTORE") result = app.restoreAdminEquipmentDefinition?.(payload);
        if (action === "DISCARD_DRAFT") result = app.discardAdminEquipmentDefinitionDraft?.(payload);
        patchState({ equipmentResult: result, equipmentPreview: null, equipmentEditor: null });
        app.renderAdminControlCenter?.(user, "catalog-management");
      });
    });
  }

  app.AdminCatalogManagementControl = Object.freeze({ bind, renderInspector, getState: state, getSelectedDefinition });
  registry.registerRenderer("catalog-management", (workspace) => renderWorkspace(workspace));
})(window.WS_APP);
