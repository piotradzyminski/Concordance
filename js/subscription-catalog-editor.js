window.WS_APP = window.WS_APP || {};

(function initSubscriptionCatalogEditorModule() {
  const MARKET_OPTIONS = ["SYSTEM", "PRIVATE"];

  function escapeHtml(value) {
    if (typeof window.WS_APP?.escapeHtml === "function") return window.WS_APP.escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function parseCreditValue(value) {
    const parser = window.WS_APP?.parseCreditValue || window.WS_APP?.parseCreditNumber || window.WS_APP?.storeUtils?.parseCreditNumber;
    if (typeof parser === "function") return Math.max(0, parser(value));
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
    const number = Number(String(value || "").replace(/[^0-9,.-]/g, "").replace(/,/g, "."));
    return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
  }

  function formatCredits(value) {
    const formatter = window.WS_APP?.formatCredits || window.WS_APP?.storeUtils?.formatCredits;
    if (typeof formatter === "function") return formatter(value);
    return `${Math.round(Number(value) || 0)} ₡`;
  }

  function clampNumber(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function slugifyDefinition(value) {
    return String(value || "definition")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 54) || "definition";
  }

  function readDefinitionField(row, field) {
    return String(row?.querySelector?.(`[data-definition-field='${field}']`)?.value || "").trim();
  }

  function readDefinitionCheckbox(row, field) {
    return row?.querySelector?.(`[data-definition-field='${field}']`)?.checked === true;
  }


  function readDefinitionList(row, field) {
    return String(readDefinitionField(row, field) || "")
      .split(/[\n,]+/g)
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  }

  function listToEditorText(value = []) {
    return (Array.isArray(value) ? value : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join(", ");
  }

  function getEditorTargetMode(definition = {}) {
    const allowed = Array.isArray(definition.targetPolicy?.allowedTargetTypes)
      ? definition.targetPolicy.allowedTargetTypes.map((value) => String(value || "").trim().toUpperCase())
      : ["CITIZEN"];
    const hasCitizen = allowed.includes("CITIZEN");
    const hasItem = allowed.includes("ITEM_INSTANCE");
    if (hasCitizen && hasItem) return "CITIZEN_AND_ITEM_INSTANCE";
    if (hasItem) return "ITEM_INSTANCE";
    return "CITIZEN";
  }

  function targetModeToAllowedTypes(value = "CITIZEN") {
    const mode = String(value || "CITIZEN").trim().toUpperCase();
    if (mode === "CITIZEN_AND_ITEM_INSTANCE") return ["CITIZEN", "ITEM_INSTANCE"];
    if (mode === "ITEM_INSTANCE") return ["ITEM_INSTANCE"];
    return ["CITIZEN"];
  }

  function isSkillsAbilitiesRecord(article) {
    if (!article) return false;
    const title = String(article.title || "").toUpperCase();
    return article.id === "system-skills-abilities" || (title.includes("SKILLS") && title.includes("ABIL"));
  }

  function isSubscriptionCatalogRecord(article) {
    if (!article) return false;
    const title = String(article.title || "").toUpperCase();
    return article.id === "system-subscription-catalog" || (title.includes("SUBSCRIPTION") && title.includes("CATALOG"));
  }

  function getSubscriptionCategories() {
    return window.WS_APP.getSubscriptionCatalogCategories?.() || [{ id: "OTHER", title: "Other", label: "Other" }];
  }

  function normalizeSubscriptionMarketInput(value) {
    return window.WS_APP.normalizeSubscriptionMarketInput?.(value) || (String(value || "SYSTEM").trim().toUpperCase() === "PRIVATE" ? "PRIVATE" : "SYSTEM");
  }

  function inferSubscriptionMarket(definition = {}) {
    return window.WS_APP.inferSubscriptionMarket?.(definition) || normalizeSubscriptionMarketInput(definition.market || definition.sourceType || definition.marketType);
  }

  function getSubscriptionMarketTags(definition = {}) {
    return [inferSubscriptionMarket(definition)];
  }

  function isSubscriptionLogoImage(value) {
    const normalized = window.WS_APP.normalizeSubscriptionLogoPath?.(value) || String(value || "").trim();
    return /^(https?:|data:image\/|assets\/|\.\/|\/)/i.test(normalized) || /\.(png|jpe?g|webp|svg|gif)$/i.test(normalized);
  }

  function buildSubscriptionLogoFallback(subscription = {}, rawValue = "") {
    const explicit = String(rawValue || "").trim();
    if (explicit && !isSubscriptionLogoImage(explicit)) {
      return explicit
        .replace(/^.*[\/]/, "")
        .replace(/\.[a-z0-9]+$/i, "")
        .slice(0, 4)
        .toUpperCase() || "?";
    }

    return String(subscription.provider || subscription.title || subscription.category || "?")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 3)
      .toUpperCase() || "?";
  }

  function renderSubscriptionCatalogLogo(subscription = {}) {
    const rawValue = String(subscription.logo || subscription.logoImage || subscription.logoUrl || "").trim();
    const value = window.WS_APP.normalizeSubscriptionLogoPath?.(rawValue) || rawValue;
    const fallback = buildSubscriptionLogoFallback(subscription, rawValue);

    if (value && isSubscriptionLogoImage(value)) {
      return `<span class="subscription-logo has-image" data-fallback="${escapeHtml(fallback)}"><img src="${escapeHtml(value)}" alt="" onerror="this.parentElement.classList.remove('has-image'); this.parentElement.textContent=this.parentElement.dataset.fallback||'?';" /></span>`;
    }

    return `<span class="subscription-logo">${escapeHtml(fallback)}</span>`;
  }

  function getCatalogLowestTierAmount(definition = {}) {
    return window.WS_APP.getSubscriptionCatalogLowestTierAmount?.(definition) || 0;
  }

  function getCatalogWeeklyRangeLabel(definition = {}) {
    return window.WS_APP.getSubscriptionCatalogWeeklyRangeLabel?.(definition) || "NO PRICE";
  }

  function renderSubscriptionCatalogDefinitionTable(subscriptions, user) {
    const visible = (Array.isArray(subscriptions) ? subscriptions : [])
      .filter((definition) => user?.role === "admin" || !definition.archived);

    if (!visible.length) return `<p>No subscription catalog records.</p>`;

    const categories = getSubscriptionCategories();
    const minPrices = visible.map((definition) => getCatalogLowestTierAmount(definition)).filter((value) => Number.isFinite(value));
    const maxPrice = minPrices.length ? Math.max(...minPrices) : 0;

    const systemServices = visible.filter((definition) => getSubscriptionMarketTags(definition).includes("SYSTEM"));
    const privateServices = visible.filter((definition) => getSubscriptionMarketTags(definition).includes("PRIVATE"));

    return `
      <section class="subscription-shop subscription-system-catalog-view" data-subscription-shop>
        <header class="subscription-shop-head">
          <div>
            <p class="kicker">CATALOG MARKET / SYSTEM PRICING</p>
            <h5>Available subscriptions</h5>
          </div>
          <span>${escapeHtml(visible.length)} SERVICES</span>
        </header>

        <div class="subscription-shop-controls">
          <label>
            Search
            <input type="search" data-subscription-shop-search placeholder="Filter by name or provider" />
          </label>
          <label>
            Category
            <select data-subscription-shop-category>
              <option value="ALL">ALL</option>
              ${categories.map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.title || category.label || category.id)}</option>`).join("")}
            </select>
          </label>
          <label>
            Max price
            <span class="currency-input-wrap compact"><input type="number" min="0" step="50" data-subscription-shop-price placeholder="${escapeHtml(maxPrice || "any")}" /><b>₡</b></span>
          </label>
        </div>

        ${renderSystemSubscriptionCatalogMarketSection("SYSTEM", "System-controlled mandatory and civic services.", systemServices, user)}
        ${renderSystemSubscriptionCatalogMarketSection("PRIVATE", "Private corporate services and premium contracts.", privateServices, user)}
      </section>
    `;
  }

  function renderSystemSubscriptionCatalogMarketSection(title, description, services, user) {
    return `
      <section class="subscription-market-section subscription-system-market-section" data-market-section="${escapeHtml(title)}">
        <header class="subscription-market-section-head">
          <div>
            <p class="kicker">${escapeHtml(title)} SERVICES</p>
            <p class="subscription-section-description">${escapeHtml(description)}</p>
          </div>
          <small>${escapeHtml(services.length)} SERVICE${services.length === 1 ? "" : "S"}</small>
        </header>
        <div class="subscription-shop-grid subscription-market-grid">
          ${services.length ? services.map((service) => renderSubscriptionCatalogShopCard(service, user, { market: title })).join("") : '<p class="file-empty">No services in this section.</p>'}
        </div>
      </section>
    `;
  }

  function renderSubscriptionCatalogShopCard(definition = {}, user = window.WS_APP.currentUser, options = {}) {
    const lowest = getCatalogLowestTierAmount(definition);
    const weeklyRange = getCatalogWeeklyRangeLabel(definition);
    const tierCount = (definition.tiers || []).filter((tier) => !tier.archived).length;
    const market = options.market || getSubscriptionMarketTags(definition)[0] || "SYSTEM";
    const summary = String(definition.summary || definition.description || "No description.").trim();
    const searchText = [definition.title, definition.provider, definition.category, definition.description, definition.summary, market, ...(definition.tiers || []).map((tier) => `${tier.label} ${tier.amount}`)].join(" ").toLowerCase();
    const sourceTags = getSubscriptionMarketTags(definition);

    return `
      <button class="subscription-shop-card subscription-market-card subscription-system-catalog-card" type="button" data-system-catalog-service="${escapeHtml(definition.id || "")}" data-shop-market="${escapeHtml(market)}" data-shop-category="${escapeHtml(String(definition.category || "OTHER").toUpperCase())}" data-shop-price="${escapeHtml(lowest)}" data-shop-search="${escapeHtml(searchText)}">
        <span class="subscription-shop-logo-wrap">${renderSubscriptionCatalogLogo({ title: definition.title, provider: definition.provider, logo: definition.logo, category: definition.category })}</span>
        <span class="subscription-shop-main">
          <span class="subscription-card-topline">
            <b>${escapeHtml(definition.title || "Subscription")}</b>
          </span>
          <small>${escapeHtml(definition.provider || "LOCAL LEDGER")}</small>
          <em>${escapeHtml(summary)}</em>
          ${sourceTags.length ? `<span class="subscription-source-tags">${sourceTags.map((tag) => `<i>${escapeHtml(tag)}</i>`).join("")}</span>` : ""}
        </span>
        <span class="subscription-shop-meta">
          <strong>${escapeHtml(weeklyRange)}</strong>
          <small>${escapeHtml(String(definition.category || "OTHER").toUpperCase())} / ${escapeHtml(tierCount)} TIER${tierCount === 1 ? "" : "S"}</small>
        </span>
      </button>
    `;
  }

  function renderSubscriptionCatalogProfile(user, articleId, serviceId) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    const article = window.WS_APP.getSystemRecordById?.(articleId);
    const service = (article?.definitions?.subscriptions || []).find((item) => item.id === serviceId);

    if (!container || !article || !service) {
      window.WS_APP.renderSystemArticle?.(user, articleId);
      return;
    }

    if (status) status.textContent = `SYSTEM / SUBSCRIPTION CATALOG / ${String(service.title || service.id).toUpperCase()}`;

    container.innerHTML = `
      <article class="module-detail system-article-view subscription-shop-profile-view">
        <div class="module-detail-head subscription-profile-head">
          <div class="subscription-profile-title">
            ${renderSubscriptionCatalogLogo({ title: service.title, provider: service.provider, logo: service.logo, category: service.category })}
            <span>
              <p class="kicker">SYSTEM / SUBSCRIPTION PROVIDER</p>
              <h4>${escapeHtml(service.title || "Subscription")}</h4>
              <small>${escapeHtml(service.provider || "LOCAL LEDGER")} / ${escapeHtml(String(service.category || "OTHER").toUpperCase())}</small>
            </span>
          </div>
          <button class="module-back-button" type="button">Back</button>
        </div>

        <section class="subscription-shop-profile-body">
          <p>${escapeHtml(service.description || "No catalog description.")}</p>
          <div class="subscription-tier-options is-shop-profile">
            ${(service.tiers || []).filter((tier) => user?.role === "admin" || !tier.archived).map((tier) => `
              <article class="subscription-tier-option">
                <div class="subscription-tier-option-main">
                  <b>${escapeHtml(tier.label || "Tier")}</b>
                  <small>${escapeHtml(tier.description || "No tier description.")}</small>
                </div>
                <div class="subscription-tier-option-side">
                  <div class="subscription-tier-option-meta"></div>
                  <div class="subscription-tier-option-billing">
                    <strong>${escapeHtml(formatCredits(tier.amount))} / ${escapeHtml(tier.cycle || "WEEKLY")}</strong>
                  </div>
                </div>
              </article>
            `).join("") || '<p class="file-empty">No tiers available</p>'}
          </div>
        </section>
      </article>
    `;

    window.WS_APP.bindModuleBackButton?.(user, () => window.WS_APP.renderSystemArticle?.(user, articleId));
  }

  function bindSubscriptionCatalogSystemActions(user, article) {
    if (!isSubscriptionCatalogRecord(article)) return;

    document.querySelectorAll("[data-system-catalog-service]").forEach((button) => {
      button.addEventListener("click", () => {
        window.WS_APP.pushModuleView?.(() => window.WS_APP.renderSystemArticle?.(user, article.id));
        renderSubscriptionCatalogProfile(user, article.id, button.dataset.systemCatalogService);
      });
    });

    const shop = document.querySelector("[data-subscription-shop]");
    if (!shop) return;

    const searchInput = shop.querySelector("[data-subscription-shop-search]");
    const categorySelect = shop.querySelector("[data-subscription-shop-category]");
    const priceInput = shop.querySelector("[data-subscription-shop-price]");
    const cards = Array.from(shop.querySelectorAll("[data-system-catalog-service]"));

    const applyFilters = () => {
      const query = String(searchInput?.value || "").trim().toLowerCase();
      const category = String(categorySelect?.value || "ALL").toUpperCase();
      const maxPrice = Number(priceInput?.value || 0);
      window.WS_APP.subscriptionShopCategory = category;

      cards.forEach((card) => {
        const matchesQuery = !query || String(card.dataset.shopSearch || "").includes(query);
        const matchesCategory = category === "ALL" || String(card.dataset.shopCategory || "").toUpperCase() === category;
        const price = Number(card.dataset.shopPrice || 0);
        const matchesPrice = !maxPrice || (price > 0 && price <= maxPrice);
        card.hidden = !(matchesQuery && matchesCategory && matchesPrice);
      });
    };

    searchInput?.addEventListener("input", applyFilters);
    categorySelect?.addEventListener("change", applyFilters);
    priceInput?.addEventListener("input", applyFilters);
  }

  function renderSystemDefinitionEditor(article) {
    if (isSkillsAbilitiesRecord(article)) {
      const definitions = article.definitions || {};
      const abilities = Array.isArray(definitions.abilities) ? definitions.abilities : [];
      const skills = Array.isArray(definitions.skills) ? definitions.skills : [];

      return `
        <section class="system-definition-editor" data-definition-type="abilities">
          <header>
            <div>
              <p class="kicker">SYSTEM / ABILITIES REGISTRY</p>
              <h5>Abilities</h5>
            </div>
            <button type="button" class="definition-editor-action" data-add-definition="ability">Add Ability</button>
          </header>
          <div class="definition-editor-grid ability-editor-grid">
            <span>Label</span>
            <span>Description</span>
            <span>Category</span>
            <span>Natural</span>
            <span>Cyberware</span>
            <span>Archive</span>
            <span>Actions</span>
          </div>
          <div class="definition-editor-list" data-definition-list="abilities">
            ${abilities.map((definition) => renderAbilityDefinitionEditorRow(definition)).join("")}
          </div>
        </section>

        <section class="system-definition-editor" data-definition-type="skills">
          <header>
            <div>
              <p class="kicker">SYSTEM / SKILLS REGISTRY</p>
              <h5>Skills</h5>
            </div>
            <button type="button" class="definition-editor-action" data-add-definition="skill">Add Skill</button>
          </header>
          <div class="definition-editor-grid skill-editor-grid">
            <span>Label</span>
            <span>Description</span>
            <span>Category</span>
            <span>Max</span>
            <span>Archive</span>
            <span>Actions</span>
          </div>
          <div class="definition-editor-list" data-definition-list="skills">
            ${skills.map((definition) => renderSkillDefinitionEditorRow(definition)).join("")}
          </div>
        </section>
      `;
    }

    if (isSubscriptionCatalogRecord(article)) {
      const definitions = window.WS_APP.getSubscriptionCatalogDefinitions?.() || article.definitions || {};
      const subscriptions = Array.isArray(definitions.subscriptions) ? definitions.subscriptions : [];
      const summary = window.WS_APP.getSubscriptionCatalogStatusSummary?.() || {};

      return `
        <section class="system-definition-editor subscription-catalog-editor" data-definition-type="subscriptions">
          <header>
            <div>
              <p class="kicker">SYSTEM / SUBSCRIPTION CATALOG</p>
              <h5>Catalog authoring moved to Admin</h5>
            </div>
            <button type="button" class="definition-editor-action" data-open-admin-subscription-authoring>Open Catalog Management</button>
          </header>
          <div class="subscription-editor-note">
            This legacy System form is read-only. Canonical product, provider, target-policy, presentation and tier mutations are owned by Admin / Catalog Management / Subscriptions.
          </div>
          <dl class="admin-snapshot-list">
            <div><dt>Total definitions</dt><dd>${escapeHtml(subscriptions.length)}</dd></div>
            <div><dt>Canonical</dt><dd>${escapeHtml(summary.CANONICAL || 0)}</dd></div>
            <div><dt>Provisional</dt><dd>${escapeHtml(summary.PROVISIONAL || 0)}</dd></div>
            <div><dt>Test only</dt><dd>${escapeHtml(summary.TEST_ONLY || 0)}</dd></div>
            <div><dt>Deprecated</dt><dd>${escapeHtml(summary.DEPRECATED || 0)}</dd></div>
          </dl>
        </section>
      `;
    }

    return "";
  }

  function renderAbilityDefinitionEditorRow(definition = {}) {
    return `
      <div class="definition-editor-row ability-editor-row" data-definition-row="ability" data-definition-id="${escapeHtml(definition.id || "")}">
        <input data-definition-field="label" value="${escapeHtml(definition.label || "New Ability")}" />
        <textarea data-definition-field="description" rows="2">${escapeHtml(definition.description || "")}</textarea>
        <input data-definition-field="category" value="${escapeHtml(definition.category || "GENERAL")}" />
        <input data-definition-field="maxNatural" type="number" min="1" max="7" value="${escapeHtml(definition.maxNatural ?? 7)}" />
        <input data-definition-field="maxCyberware" type="number" min="0" max="8" value="${escapeHtml(definition.maxCyberware ?? 8)}" />
        <label class="definition-archive-check"><input class="ui-select-control" data-definition-field="archived" type="checkbox" ${definition.archived ? "checked" : ""} /> Archived</label>
        <span class="definition-editor-row-actions">
          <button type="button" data-duplicate-definition="ability">Duplicate</button>
          <button type="button" data-delete-definition="ability">Delete</button>
        </span>
      </div>
    `;
  }

  function renderSkillDefinitionEditorRow(definition = {}) {
    return `
      <div class="definition-editor-row skill-editor-row" data-definition-row="skill" data-definition-id="${escapeHtml(definition.id || "")}">
        <input data-definition-field="label" value="${escapeHtml(definition.label || "New Skill")}" />
        <textarea data-definition-field="description" rows="2">${escapeHtml(definition.description || "")}</textarea>
        <input data-definition-field="category" value="${escapeHtml(definition.category || "GENERAL")}" />
        <input data-definition-field="maxValue" type="number" min="1" max="10" value="${escapeHtml(definition.maxValue ?? 10)}" />
        <label class="definition-archive-check"><input class="ui-select-control" data-definition-field="archived" type="checkbox" ${definition.archived ? "checked" : ""} /> Archived</label>
        <span class="definition-editor-row-actions">
          <button type="button" data-duplicate-definition="skill">Duplicate</button>
          <button type="button" data-delete-definition="skill">Delete</button>
        </span>
      </div>
    `;
  }

  function renderSubscriptionDefinitionEditorRow(rawDefinition = {}) {
    const definition = window.WS_APP.normalizeSubscriptionDefinition?.(rawDefinition) || rawDefinition;
    const market = inferSubscriptionMarket(definition);
    const preview = renderSubscriptionCatalogLogo({
      title: definition.title,
      provider: definition.provider,
      category: definition.category,
      logo: definition.logo
    });

    return `
      <div class="definition-editor-row subscription-editor-row subscription-editor-card" data-definition-row="subscription" data-definition-id="${escapeHtml(definition.id || "")}">
        <header class="subscription-editor-card-head">
          <div class="subscription-editor-title-block">
            ${preview}
            <span>
              <input data-definition-field="title" value="${escapeHtml(definition.title || "New Subscription")}" placeholder="Service name" />
              <small>${escapeHtml(definition.provider || "LOCAL LEDGER")} / ${escapeHtml(String(definition.category || "OTHER").toUpperCase())} / ${escapeHtml(market)}</small>
            </span>
          </div>
          <div class="subscription-editor-card-actions">
            <label class="definition-archive-check"><input class="ui-select-control" data-definition-field="archived" type="checkbox" ${definition.archived ? "checked" : ""} /> Archived</label>
            <button type="button" data-duplicate-subscription-definition>Duplicate</button>
            <button type="button" data-delete-subscription-definition>Delete</button>
          </div>
        </header>

        <div class="subscription-editor-fields">
          <label class="wide">
            Description
            <textarea data-definition-field="description" rows="3">${escapeHtml(definition.description || "")}</textarea>
          </label>
          <label>
            Provider / company
            <input data-definition-field="provider" value="${escapeHtml(definition.provider || "LOCAL LEDGER")}" />
          </label>
          <label>
            Category
            <select data-definition-field="category">
              ${getSubscriptionCategories().map((category) => `<option value="${escapeHtml(category.id)}" ${String(definition.category || "OTHER").toUpperCase() === category.id ? "selected" : ""}>${escapeHtml(category.id)}</option>`).join("")}
            </select>
          </label>
          <label>
            Logo path
            <input data-definition-field="logo" value="${escapeHtml(definition.logo || "")}" placeholder="assets/logos/corp/logo.png" />
          </label>
          <label>
            Market
            <select data-definition-field="market">
              ${MARKET_OPTIONS.map((item) => `<option value="${item}" ${market === item ? "selected" : ""}>${item}</option>`).join("")}
            </select>
          </label>
          <label class="wide">
            Short shop summary
            <input data-definition-field="summary" value="${escapeHtml(definition.summary || "")}" placeholder="Short text used on catalog cards" />
          </label>
          <fieldset class="subscription-target-policy-editor wide">
            <legend>Contract target policy</legend>
            <label>
              Allowed target mode
              <select data-definition-field="targetMode">
                ${[
                  ["CITIZEN", "Citizen only"],
                  ["CITIZEN_AND_ITEM_INSTANCE", "Citizen or ItemInstance"],
                  ["ITEM_INSTANCE", "ItemInstance only"]
                ].map(([value, label]) => `<option value="${value}" ${getEditorTargetMode(definition) === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </label>
            <label>
              Default target
              <select data-definition-field="defaultTargetType">
                ${["CITIZEN", "ITEM_INSTANCE"].map((value) => `<option value="${value}" ${String(definition.targetPolicy?.defaultTargetType || "CITIZEN").toUpperCase() === value ? "selected" : ""}>${value}</option>`).join("")}
              </select>
            </label>
            <label>
              Maximum targets
              <input data-definition-field="maximumTargets" type="number" min="1" max="100" value="${escapeHtml(definition.targetPolicy?.maximumTargets ?? 1)}" />
            </label>
            <label class="definition-archive-check">
              <input class="ui-select-control" data-definition-field="requireOwnedByCitizen" type="checkbox" ${definition.targetPolicy?.itemEligibility?.requireOwnedByCitizen !== false ? "checked" : ""} />
              Require citizen ownership
            </label>
            <label class="wide">
              Eligible categories
              <input data-definition-field="allowedCategories" value="${escapeHtml(listToEditorText(definition.targetPolicy?.itemEligibility?.allowedCategories))}" placeholder="CYBERWARE, CONTAINER" />
            </label>
            <label class="wide">
              Eligible subtypes
              <input data-definition-field="allowedSubtypes" value="${escapeHtml(listToEditorText(definition.targetPolicy?.itemEligibility?.allowedSubtypes))}" placeholder="NEUROCHIP, MASS_COMPRESSION_CUBE" />
            </label>
            <label class="wide">
              Required tags — any
              <input data-definition-field="requiredTagsAny" value="${escapeHtml(listToEditorText(definition.targetPolicy?.itemEligibility?.requiredTagsAny))}" placeholder="MASS_COMPRESSION, CAPACITY_MODULE" />
            </label>
            <label class="wide">
              Required tags — all
              <input data-definition-field="requiredTagsAll" value="${escapeHtml(listToEditorText(definition.targetPolicy?.itemEligibility?.requiredTagsAll))}" />
            </label>
            <label class="wide">
              Allowed definition IDs
              <textarea data-definition-field="allowedDefinitionIds" rows="2">${escapeHtml(listToEditorText(definition.targetPolicy?.itemEligibility?.allowedDefinitionIds))}</textarea>
            </label>
            <label class="wide">
              Allowed manufacturer IDs
              <input data-definition-field="allowedManufacturerIds" value="${escapeHtml(listToEditorText(definition.targetPolicy?.itemEligibility?.allowedManufacturerIds))}" />
            </label>
            <label class="wide">
              Allowed provider IDs
              <input data-definition-field="allowedProviderIds" value="${escapeHtml(listToEditorText(definition.targetPolicy?.itemEligibility?.allowedProviderIds))}" />
            </label>
            <label class="wide">
              Blocked lifecycle states
              <input data-definition-field="blockedLifecycleStates" value="${escapeHtml(listToEditorText(definition.targetPolicy?.itemEligibility?.blockedLifecycleStates || ["DISPOSED"]))}" />
            </label>
          </fieldset>
          <label class="wide tiers">
            Packages / tiers
            <textarea data-definition-field="tiers" rows="5" placeholder="Package | amount | cycle | durationDays | description">${escapeHtml(subscriptionTiersToText(definition.tiers || []))}</textarea>
          </label>
        </div>
      </div>
    `;
  }

  function subscriptionTiersToText(tiers = []) {
    return (Array.isArray(tiers) ? tiers : [])
      .map((tier) => [
        tier.label || "Tier",
        tier.amount ?? 0,
        tier.cycle || "WEEKLY",
        tier.durationDays ?? 7,
        tier.description || ""
      ].join(" | "))
      .join("\n");
  }

  function parseSubscriptionTiers(value) {
    return String(value || "")
      .split(/\n+/g)
      .map((line, index) => {
        const parts = line.split("|").map((part) => part.trim());
        if (!parts.some(Boolean)) return null;
        const label = parts[0] || `Tier ${index + 1}`;
        const tier = {
          id: slugifyDefinition(`tier-${label}`),
          label,
          amount: parseCreditValue(parts[1] || 0),
          cycle: String(parts[2] || "WEEKLY").toUpperCase(),
          durationDays: clampNumber(parts[3] || 7, 0, 3650),
          description: parts.slice(4).join(" | ")
        };
        return window.WS_APP.normalizeSubscriptionTierDefinition?.(tier, index) || tier;
      })
      .filter(Boolean);
  }

  function collectSystemSubscriptionDefinitions(_form) {
    // Catalog authoring is owned by Admin Catalog Management. System record saves
    // preserve the current canonical definitions without rebuilding lossy rows.
    return window.WS_APP.getSubscriptionCatalogDefinitions?.() || { subscriptions: [] };
  }

  function bindSubscriptionCatalogDefinitionEditor(form) {
    if (!form || form.dataset.definitionEditor !== "subscription-catalog") return false;
    form.querySelector("[data-open-admin-subscription-authoring]")?.addEventListener("click", () => {
      window.WS_APP.adminCatalogManagementState = {
        ...(window.WS_APP.adminCatalogManagementState || {}),
        section: "subscriptions",
        selectedCatalogId: "subscriptions",
        selectedDefinitionId: ""
      };
      window.WS_APP.renderAdminControlCenter?.(window.WS_APP.currentUser, "catalog-management");
    });
    return true;
  }

  window.WS_APP.renderSubscriptionCatalogDefinitionTable = renderSubscriptionCatalogDefinitionTable;
  window.WS_APP.bindSubscriptionCatalogSystemActions = bindSubscriptionCatalogSystemActions;
  window.WS_APP.renderSystemDefinitionEditor = renderSystemDefinitionEditor;
  window.WS_APP.renderSubscriptionDefinitionEditorRow = renderSubscriptionDefinitionEditorRow;
  window.WS_APP.bindSubscriptionCatalogDefinitionEditor = bindSubscriptionCatalogDefinitionEditor;
  window.WS_APP.collectSystemSubscriptionDefinitions = collectSystemSubscriptionDefinitions;

  // Compatibility aliases for legacy unscoped System Registry probes.
  window.renderSubscriptionCatalogDefinitionTable = renderSubscriptionCatalogDefinitionTable;
  window.bindSystemArticleDynamicActions = bindSubscriptionCatalogSystemActions;
  window.renderSystemDefinitionEditor = renderSystemDefinitionEditor;
  window.renderSubscriptionDefinitionEditorRow = renderSubscriptionDefinitionEditorRow;
  window.collectSystemSubscriptionDefinitions = collectSystemSubscriptionDefinitions;
})();
