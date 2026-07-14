window.WS_APP = window.WS_APP || {};

(function initCyberwareIndexModule() {
  const app = window.WS_APP;
  const uiStateByCitizen = Object.create(null);

  function escapeHtml(value = "") {
    if (typeof app.escapeHtml === "function") return app.escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatToken(value = "") {
    return String(value || "").trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").toUpperCase();
  }

  function unique(values = []) {
    return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
  }

  function numberOrNull(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function normalizeCategory(item = {}) {
    const role = String(item.processorRole || "").trim().toUpperCase();
    if (role === "NEUROCHIP") return "NEUROCHIP";
    if (role === "INTERFACE_BACKPLANE" || item.isCoreInterface === true) return "INTERFACE";
    if (role === "SERVICE_PORT" || item.isServicePort === true) return "SERVICE_PORT";
    return String(item.catalogDomain || item.subtype || item.bodyCategory || item.category || "IMPLANT")
      .trim()
      .replace(/[\s-]+/g, "_")
      .toUpperCase() || "IMPLANT";
  }

  function normalizeDefinition(item = {}, index = 0) {
    const definitionId = String(item.catalogId || item.id || item.implantId || `cyberware-definition-${index + 1}`).trim();
    if (!definitionId) return null;
    const category = normalizeCategory(item);
    const manufacturer = String(item.manufacturer || item.provider || item.manufacturerId || "UNSPECIFIED").trim() || "UNSPECIFIED";
    const tier = numberOrNull(item.tier ?? item.neurochipTier ?? item.interfaceTier ?? item.servicePortTier);
    const neurochannels = numberOrNull(item.neurochannels ?? item.neuroChannels ?? item.channels);
    const latency = item.neurolatency ?? item.neuroLatency ?? item.latencyClass ?? item.latency ?? "";
    const protocols = unique([
      ...(Array.isArray(item.protocolSupport) ? item.protocolSupport : []),
      ...(Array.isArray(item.requiredProtocols) ? item.requiredProtocols : []),
      ...(Array.isArray(item.supportedProtocols) ? item.supportedProtocols : [])
    ]);
    const buses = unique([
      ...(Array.isArray(item.requiredBuses) ? item.requiredBuses : []),
      ...(Array.isArray(item.supportedBuses) ? item.supportedBuses : [])
    ]);
    const slots = unique([
      ...(Array.isArray(item.slots) ? item.slots : []),
      ...(Array.isArray(item.compatibleSlots) ? item.compatibleSlots : []),
      item.primarySlot,
      item.slot
    ]);
    const tags = unique([
      ...(Array.isArray(item.tags) ? item.tags : []),
      ...(Array.isArray(item.compatibilityTags) ? item.compatibilityTags : []),
      ...(Array.isArray(item.specialFeatures) ? item.specialFeatures : [])
    ]);
    const name = String(item.name || item.model || definitionId).trim() || definitionId;
    const model = String(item.model || item.line || name).trim() || name;
    const summary = String(item.summary || item.mainFeature || item.description || item.notes || "").trim();
    const grade = String(item.grade || item.quality || "UNSPECIFIED").trim().toUpperCase() || "UNSPECIFIED";
    const legality = String(item.legality || "UNSPECIFIED").trim().toUpperCase() || "UNSPECIFIED";
    const availability = String(item.availability || "UNSPECIFIED").trim().toUpperCase() || "UNSPECIFIED";
    const scale = String(item.scale || item.size || item.slotLevel || "UNSPECIFIED").trim().toUpperCase() || "UNSPECIFIED";
    const searchText = [
      definitionId,
      item.id,
      item.implantId,
      name,
      model,
      manufacturer,
      category,
      grade,
      legality,
      availability,
      scale,
      summary,
      ...slots,
      ...protocols,
      ...buses,
      ...tags
    ].filter(Boolean).join(" ").toLowerCase();
    return {
      ...item,
      definitionId,
      name,
      model,
      manufacturer,
      category,
      tier,
      grade,
      legality,
      availability,
      scale,
      summary,
      slots,
      protocols,
      buses,
      tags,
      neuroLoad: numberOrNull(item.neuroLoad ?? item.neuroload),
      neurochannels,
      interfaceLoad: numberOrNull(item.interfaceLoad),
      latency: String(latency || "").trim(),
      security: numberOrNull(item.security ?? item.securityIsolation ?? item.securityLock),
      stability: numberOrNull(item.stability),
      price: numberOrNull(item.marketPrice ?? item.basePrice ?? item.value),
      searchText
    };
  }

  function getCyberwareIndexDefinitions() {
    const source = typeof app.getCyberwareCatalog === "function" ? app.getCyberwareCatalog() : [];
    const seen = new Set();
    return (Array.isArray(source) ? source : [])
      .map(normalizeDefinition)
      .filter(Boolean)
      .filter((item) => {
        if (seen.has(item.definitionId)) return false;
        seen.add(item.definitionId);
        return true;
      })
      .sort((left, right) => left.category.localeCompare(right.category) || left.manufacturer.localeCompare(right.manufacturer) || left.name.localeCompare(right.name));
  }

  function getCyberwareIndexState(citizenId = "") {
    const id = String(citizenId || "GLOBAL").trim() || "GLOBAL";
    if (!uiStateByCitizen[id]) {
      uiStateByCitizen[id] = {
        open: false,
        query: "",
        category: "ALL",
        manufacturer: "ALL",
        grade: "ALL",
        selectedDefinitionId: ""
      };
    }
    return uiStateByCitizen[id];
  }

  function setCyberwareIndexOpen(citizenId = "", open = false) {
    getCyberwareIndexState(citizenId).open = open === true;
    return getCyberwareIndexState(citizenId).open;
  }

  function toggleCyberwareIndex(citizenId = "") {
    const state = getCyberwareIndexState(citizenId);
    state.open = !state.open;
    return state.open;
  }

  function setCyberwareIndexFilter(citizenId = "", patch = {}) {
    const state = getCyberwareIndexState(citizenId);
    if (Object.hasOwn(patch, "query")) state.query = String(patch.query || "").slice(0, 160);
    if (Object.hasOwn(patch, "category")) state.category = String(patch.category || "ALL").trim().toUpperCase() || "ALL";
    if (Object.hasOwn(patch, "manufacturer")) state.manufacturer = String(patch.manufacturer || "ALL").trim() || "ALL";
    if (Object.hasOwn(patch, "grade")) state.grade = String(patch.grade || "ALL").trim().toUpperCase() || "ALL";
    return state;
  }

  function selectCyberwareIndexDefinition(citizenId = "", definitionId = "") {
    const state = getCyberwareIndexState(citizenId);
    const id = String(definitionId || "").trim();
    const definitions = getCyberwareIndexDefinitions();
    state.selectedDefinitionId = definitions.some((item) => item.definitionId === id) ? id : "";
    return state.selectedDefinitionId;
  }

  function buildCyberwareIndexProjection(citizenId = "") {
    const state = getCyberwareIndexState(citizenId);
    const definitions = getCyberwareIndexDefinitions();
    if (!state.selectedDefinitionId || !definitions.some((item) => item.definitionId === state.selectedDefinitionId)) {
      state.selectedDefinitionId = definitions[0]?.definitionId || "";
    }
    return {
      state,
      definitions,
      categories: unique(definitions.map((item) => item.category)).sort((a, b) => a.localeCompare(b)),
      manufacturers: unique(definitions.map((item) => item.manufacturer)).sort((a, b) => a.localeCompare(b)),
      grades: unique(definitions.map((item) => item.grade)).sort((a, b) => a.localeCompare(b)),
      selected: definitions.find((item) => item.definitionId === state.selectedDefinitionId) || null
    };
  }

  function renderMetric(label = "", value = "", options = {}) {
    const resolved = value === null || value === undefined || value === "" ? "—" : String(value);
    return `<span class="cyberware-index-metric ${options.wide ? "is-wide" : ""}"><small>${escapeHtml(label)}</small><b>${escapeHtml(resolved)}</b></span>`;
  }

  function renderTokenList(label = "", values = []) {
    const list = unique(values);
    if (!list.length) return "";
    return `<section class="cyberware-index-inspector__section"><h6>${escapeHtml(label)}</h6><div class="cyberware-index-token-list">${list.map((value) => `<span>${escapeHtml(formatToken(value))}</span>`).join("")}</div></section>`;
  }

  function renderCyberwareDefinitionInspector(item = null) {
    if (!item) return `<div class="cyberware-index-inspector is-empty" data-cyberware-index-inspector><p class="file-empty">No Cyberware definition selected.</p></div>`;
    const tier = item.tier === null ? "—" : `T${item.tier}`;
    const price = item.price === null ? "—" : `${item.price.toLocaleString("en-US")} ₡`;
    const license = item.licenseRequired === true || item.licenseActivationRequired === true ? "REQUIRED" : "NOT REQUIRED";
    const subscription = item.subscriptionRequired === true || item.requiresSubscriptionCategory ? "REQUIRED" : "NOT REQUIRED";
    const firmware = item.firmwareRequired === true ? (item.firmwareLatestVersion || item.firmwareVersion || item.firmwareChannel || "REQUIRED") : "NOT REQUIRED";
    return `<article class="cyberware-index-inspector" data-cyberware-index-inspector data-cyberware-index-definition="${escapeHtml(item.definitionId)}">
      <header class="cyberware-index-inspector__head">
        <p class="kicker">${escapeHtml(`CYBERWARE / ${formatToken(item.category)}`)}</p>
        <h5>${escapeHtml(item.name)}</h5>
        <small>${escapeHtml(`${item.manufacturer} · ${item.model}`)}</small>
      </header>
      ${item.summary ? `<p class="cyberware-index-inspector__summary">${escapeHtml(item.summary)}</p>` : ""}
      <div class="cyberware-index-inspector__metrics">
        ${renderMetric("Tier", tier)}
        ${renderMetric("Grade", formatToken(item.grade))}
        ${renderMetric("Scale", formatToken(item.scale))}
        ${renderMetric("Price", price)}
        ${renderMetric("Neuroload", item.neuroLoad)}
        ${renderMetric("Neurochannels", item.neurochannels)}
        ${renderMetric("Interface Load", item.interfaceLoad)}
        ${renderMetric("Neurolatency", formatToken(item.latency))}
        ${renderMetric("Security", item.security)}
        ${renderMetric("Stability", item.stability)}
      </div>
      <section class="cyberware-index-inspector__section">
        <h6>Access and lifecycle</h6>
        <div class="cyberware-index-inspector__metrics">
          ${renderMetric("Legality", formatToken(item.legality))}
          ${renderMetric("Availability", formatToken(item.availability))}
          ${renderMetric("License", license)}
          ${renderMetric("Subscription", subscription)}
          ${renderMetric("Firmware", formatToken(firmware), { wide: true })}
        </div>
      </section>
      ${renderTokenList("Body slots", item.slots)}
      ${renderTokenList("Protocols", item.protocols)}
      ${renderTokenList("Buses", item.buses)}
      ${renderTokenList("Features and tags", item.tags)}
      <details class="cyberware-index-inspector__technical"><summary>Technical identity</summary><div>
        ${renderMetric("Definition ID", item.definitionId, { wide: true })}
        ${renderMetric("Catalog ID", item.catalogId || item.id || "—", { wide: true })}
        ${renderMetric("Source", formatToken(item.sourceType || item.catalogDomain || item.category), { wide: true })}
      </div></details>
    </article>`;
  }

  function renderCyberwareIndexRow(item = {}, selectedDefinitionId = "") {
    const selected = item.definitionId === selectedDefinitionId;
    const meta = [item.manufacturer, item.tier === null ? "" : `T${item.tier}`, formatToken(item.grade), formatToken(item.scale)].filter(Boolean).join(" · ");
    return `<article class="equipment-item-index-row cyberware-index-row ${selected ? "is-selected" : ""}"
      data-cyberware-index-row data-cyberware-index-category="${escapeHtml(item.category)}" data-cyberware-index-manufacturer="${escapeHtml(item.manufacturer)}" data-cyberware-index-grade="${escapeHtml(item.grade)}" data-cyberware-index-keywords="${escapeHtml(item.searchText)}">
      <button class="equipment-item-index-row__main" type="button" data-cyberware-index-select="${escapeHtml(item.definitionId)}" aria-pressed="${selected ? "true" : "false"}">
        <b>${escapeHtml(item.name)}</b><small>${escapeHtml(meta || item.definitionId)}</small>
      </button>
    </article>`;
  }

  function renderCyberwareIndexSection(category = "", items = [], selectedDefinitionId = "") {
    return `<section class="equipment-item-index-section" data-cyberware-index-section="${escapeHtml(category)}">
      <div class="equipment-item-index-section__head"><h6>${escapeHtml(formatToken(category))}</h6><span>${escapeHtml(items.length)}</span></div>
      <div class="equipment-item-index-section__rows">${items.map((item) => renderCyberwareIndexRow(item, selectedDefinitionId)).join("")}</div>
    </section>`;
  }

  function renderCyberwareIndex(citizenId = "") {
    const projection = buildCyberwareIndexProjection(citizenId);
    const { state, definitions, categories, manufacturers, grades, selected } = projection;
    if (state.open !== true) return "";
    return `<div class="equipment-item-index-overlay cyberware-index-overlay" data-cyberware-index-overlay>
      <div class="equipment-item-index-backdrop" data-cyberware-index-close aria-hidden="true"></div>
      <aside class="equipment-item-index-drawer cyberware-index-drawer" data-cyberware-index-drawer aria-label="Cyberware Index">
        <div class="equipment-item-index-head"><div><p class="kicker">CYBERWARE / INDEX</p><h5>Cyberware Definitions</h5></div><button class="secondary-action is-compact" type="button" data-cyberware-index-close>Close</button></div>
        <div class="equipment-item-index-controls cyberware-index-controls">
          <label><span>Search</span><input type="search" value="${escapeHtml(state.query)}" placeholder="Name, model, slot or protocol" data-cyberware-index-search></label>
          <label><span>Category</span><select data-cyberware-index-category><option value="ALL" ${state.category === "ALL" ? "selected" : ""}>All categories</option>${categories.map((value) => `<option value="${escapeHtml(value)}" ${state.category === value ? "selected" : ""}>${escapeHtml(formatToken(value))}</option>`).join("")}</select></label>
          <label><span>Manufacturer</span><select data-cyberware-index-manufacturer><option value="ALL" ${state.manufacturer === "ALL" ? "selected" : ""}>All manufacturers</option>${manufacturers.map((value) => `<option value="${escapeHtml(value)}" ${state.manufacturer === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label>
          <label><span>Grade</span><select data-cyberware-index-grade><option value="ALL" ${state.grade === "ALL" ? "selected" : ""}>All grades</option>${grades.map((value) => `<option value="${escapeHtml(value)}" ${state.grade === value ? "selected" : ""}>${escapeHtml(formatToken(value))}</option>`).join("")}</select></label>
        </div>
        <div class="cyberware-index-content">
          <div class="equipment-item-index-list cyberware-index-list" data-cyberware-index-list>
            ${definitions.length ? categories.map((category) => renderCyberwareIndexSection(category, definitions.filter((item) => item.category === category), state.selectedDefinitionId)).join("") : `<p class="file-empty">No Cyberware definitions registered.</p>`}
            <p class="file-empty equipment-item-index-empty" data-cyberware-index-empty hidden>No Cyberware definitions match the current filters.</p>
          </div>
          ${renderCyberwareDefinitionInspector(selected)}
        </div>
      </aside>
    </div>`;
  }

  function applyCyberwareIndexFilters(root = document) {
    const drawer = root?.querySelector?.("[data-cyberware-index-drawer]");
    if (!drawer) return 0;
    const query = String(drawer.querySelector("[data-cyberware-index-search]")?.value || "").trim().toLowerCase();
    const category = String(drawer.querySelector("[data-cyberware-index-category]")?.value || "ALL").trim().toUpperCase();
    const manufacturer = String(drawer.querySelector("[data-cyberware-index-manufacturer]")?.value || "ALL").trim();
    const grade = String(drawer.querySelector("[data-cyberware-index-grade]")?.value || "ALL").trim().toUpperCase();
    let visibleCount = 0;
    drawer.querySelectorAll("[data-cyberware-index-row]").forEach((row) => {
      const visible = (!query || String(row.dataset.cyberwareIndexKeywords || "").includes(query))
        && (category === "ALL" || String(row.dataset.cyberwareIndexCategory || "") === category)
        && (manufacturer === "ALL" || String(row.dataset.cyberwareIndexManufacturer || "") === manufacturer)
        && (grade === "ALL" || String(row.dataset.cyberwareIndexGrade || "") === grade);
      row.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    drawer.querySelectorAll("[data-cyberware-index-section]").forEach((section) => {
      section.hidden = ![...section.querySelectorAll("[data-cyberware-index-row]")].some((row) => !row.hidden);
    });
    const empty = drawer.querySelector("[data-cyberware-index-empty]");
    if (empty) empty.hidden = visibleCount !== 0;
    return visibleCount;
  }

  function syncCyberwareIndexOverlay(citizenId = "", options = {}) {
    const root = options.root || document.querySelector?.("[data-equipment-module-shell]") || null;
    const workspace = root?.querySelector?.('[data-equipment-panel="cyberware-workspace"]') || null;
    if (!workspace) return false;
    workspace.querySelector("[data-cyberware-index-overlay]")?.remove();
    const markup = renderCyberwareIndex(citizenId);
    if (markup) {
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      const node = template.content.firstElementChild;
      if (node) workspace.appendChild(node);
    }
    const open = getCyberwareIndexState(citizenId).open === true;
    root.querySelectorAll("[data-cyberware-index-toggle]").forEach((button) => button.setAttribute("aria-expanded", open ? "true" : "false"));
    if (open) applyCyberwareIndexFilters(root);
    return true;
  }

  Object.assign(app, {
    getCyberwareIndexDefinitions,
    getCyberwareIndexState,
    setCyberwareIndexOpen,
    toggleCyberwareIndex,
    setCyberwareIndexFilter,
    selectCyberwareIndexDefinition,
    buildCyberwareIndexProjection,
    renderCyberwareDefinitionInspector,
    renderCyberwareIndex,
    applyCyberwareIndexFilters,
    syncCyberwareIndexOverlay
  });
})();
