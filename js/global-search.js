window.WS_APP = window.WS_APP || {};

(function initGlobalSearchModule() {
  const MAX_RESULTS = 30;
  const MIN_QUERY_LENGTH = 1;

  let initialized = false;
  let lastResults = [];

  window.WS_APP.initGlobalSearch = function initGlobalSearch() {
    if (initialized) return;
    initialized = true;

    ensureSearchShell();
    ensureSearchButton();
    bindSearchEvents();
  };

  window.WS_APP.openGlobalSearch = function openGlobalSearch(initialQuery = "") {
    ensureSearchShell();
    ensureSearchButton();

    const overlay = document.querySelector("#global-search-overlay");
    const input = document.querySelector("#global-search-input");

    if (!overlay || !input) return;

    overlay.classList.add("is-active");
    overlay.setAttribute("aria-hidden", "false");

    if (initialQuery) {
      input.value = initialQuery;
      runSearch(initialQuery);
    } else {
      runSearch(input.value);
    }

    window.setTimeout(() => {
      input.focus();
      input.select();
    }, 40);
  };

  window.WS_APP.closeGlobalSearch = function closeGlobalSearch() {
    const overlay = document.querySelector("#global-search-overlay");

    if (!overlay) return;

    overlay.classList.remove("is-active");
    overlay.setAttribute("aria-hidden", "true");
  };

  window.WS_APP.syncTerminalTools = function syncTerminalTools(user = window.WS_APP.currentUser) {
    ensureSearchButton();

    const dataIoPanel = document.querySelector("#data-io-panel");

    if (dataIoPanel) {
      dataIoPanel.hidden = user?.role !== "admin";
    }
  };

  function ensureSearchButton() {
    const form = document.querySelector("#terminal-searchbar");
    const input = document.querySelector("#terminal-search-input");

    if (!form || !input || form.dataset.bound === "true") return;

    form.dataset.bound = "true";

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      window.WS_APP.openGlobalSearch(input.value.trim());
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        input.value = "";
        return;
      }
    });
  }

  function ensureSearchShell() {
    if (document.querySelector("#global-search-overlay")) return;

    const node = document.createElement("div");
    node.className = "global-search-overlay";
    node.id = "global-search-overlay";
    node.setAttribute("aria-hidden", "true");
    node.innerHTML = `
      <section class="global-search-dialog" role="dialog" aria-modal="true" aria-labelledby="global-search-title">
        <header class="global-search-head">
          <div>
            <p class="kicker">WATCH & SECURE / LOCAL CACHE QUERY</p>
            <h4 id="global-search-title">Global Search</h4>
          </div>

          <button class="global-search-close" id="global-search-close" type="button" aria-label="Zamknij wyszukiwarkę">X</button>
        </header>

        <label class="global-search-field">
          Search local records
          <input id="global-search-input" type="search" autocomplete="off" placeholder="citizen, TRAUMA, route, module, tag..." />
        </label>

        <div class="global-search-meta" id="global-search-meta">
          READY / CTRL+K
        </div>

        <div class="global-search-results" id="global-search-results"></div>
      </section>
    `;

    document.body.appendChild(node);
  }

  function bindSearchEvents() {
    document.addEventListener("keydown", (event) => {
      const isSearchShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

      if (isSearchShortcut) {
        event.preventDefault();
        window.WS_APP.openGlobalSearch();
        return;
      }

      if (event.key === "Escape") {
        window.WS_APP.closeGlobalSearch();
      }
    });

    document.addEventListener("input", (event) => {
      if (event.target?.id === "global-search-input") {
        runSearch(event.target.value);
      }
    });

    document.addEventListener("click", (event) => {
      if (event.target?.id === "global-search-close") {
        window.WS_APP.closeGlobalSearch();
        return;
      }

      if (event.target?.id === "global-search-overlay") {
        window.WS_APP.closeGlobalSearch();
        return;
      }

      const result = event.target?.closest?.("[data-search-result-index]");

      if (result) {
        openSearchResult(Number(result.dataset.searchResultIndex));
      }
    });

    const rerunActiveSearch = () => {
      const input = document.querySelector("#global-search-input");
      const overlay = document.querySelector("#global-search-overlay");

      if (overlay?.classList.contains("is-active") && input) {
        runSearch(input.value);
      }
    };

    window.addEventListener("ws:citizens-updated", rerunActiveSearch);
    window.addEventListener("ws:entries-updated", rerunActiveSearch);
    window.addEventListener("ws:addresses-updated", rerunActiveSearch);
    window.addEventListener("ws:tags-updated", rerunActiveSearch);
    window.addEventListener("ws:system-records-updated", rerunActiveSearch);
    window.addEventListener("ws:case-files-updated", rerunActiveSearch);

    window.addEventListener("ws:terminal-rendered", () => {
      window.WS_APP.syncTerminalTools?.();
    });
  }

  function runSearch(rawQuery) {
    const query = normalize(rawQuery);
    const topbarInput = document.querySelector("#terminal-search-input");
    const resultsNode = document.querySelector("#global-search-results");
    const meta = document.querySelector("#global-search-meta");

    if (topbarInput && document.activeElement?.id !== "terminal-search-input") {
      topbarInput.value = String(rawQuery || "");
    }

    if (!resultsNode || !meta) return;

    if (query.length < MIN_QUERY_LENGTH) {
      lastResults = [];
      meta.textContent = "QUERY EMPTY / WAITING";
      resultsNode.innerHTML = `
        <div class="global-search-empty">
          Wpisz frazę, tag, ID, nazwę modułu albo fragment rekordu. Skrót: CTRL+K.
        </div>
      `;
      return;
    }

    lastResults = buildSearchIndex(window.WS_APP.currentUser)
      .filter((entry) => entry.haystack.includes(query))
      .slice(0, MAX_RESULTS);

    meta.textContent = `${lastResults.length} RESULT${lastResults.length === 1 ? "" : "S"} / LOCAL CACHE`;

    if (!lastResults.length) {
      resultsNode.innerHTML = `<div class="global-search-empty">NO LOCAL RECORDS MATCH CURRENT QUERY</div>`;
      return;
    }

    resultsNode.innerHTML = lastResults
      .map((entry, index) => renderResult(entry, index))
      .join("");
  }

  function buildSearchIndex(user) {
    if (!user) return [];

    return [
      ...buildModuleResults(user),
      ...buildCitizenResults(user),
      ...buildArticleResults(user),
      ...buildEntryResults(user),
      ...buildAddressResults(user),
      ...buildTagResults(user),
      ...buildCaseFileResults(user),
      ...buildSubscriptionResults(user)
    ];
  }

  function buildModuleResults(user) {
    const modules = window.APP_DATA?.modules || [];

    return modules
      .filter((module) => Array.isArray(module.roles) && module.roles.includes(user.role))
      .map((module) => makeResult({
        type: "MODULE",
        title: module.title || module.id,
        subtitle: `${module.status || "UNKNOWN"} / ${module.id}`,
        body: module.description || "",
        action: () => window.WS_APP.openModule?.(module.id, user)
      }));
  }

  function buildCitizenResults(user) {
    const citizens = window.WS_APP.getCitizens?.() || [];
    const visibleCitizens = user.role === "admin"
      ? citizens.filter((citizen) => citizen.recordType !== "admin" && citizen.id !== "admin")
      : citizens.filter((citizen) => citizen.id === user.citizenId);

    return visibleCitizens.map((citizen) => makeResult({
      type: "CITIZEN",
      title: citizen.legalName || getCitizenShortId(citizen) || citizen.id,
      subtitle: `${citizen.profile || citizen.biologicalProfile || "PROFILE"} / ${citizen.idNumber || citizen.id}`,
      body: [
        getCitizenShortId(citizen),
        citizen.status,
        citizen.clearance,
        citizen.address,
        citizen.trace,
        citizen.subscription,
        citizen.trauma,
        citizen.debt,
        citizen.note,
        ...(citizen.tags || [])
      ].join(" "),
      action: () => openCitizenResult(user, citizen.id)
    }));
  }

  function buildArticleResults(user) {
    const articles = window.WS_APP.getSystemArticles?.() || [];

    return articles.map((article) => makeResult({
      type: article.registry === "system-index" ? "SYSTEM INDEX" : "SYSTEM",
      title: article.title,
      subtitle: `${article.category || (article.registry === "system-index" ? "AUTHORIZED ENTRY" : "MECHANIC")} / ${article.id}`,
      body: [
        article.localTitle,
        article.type,
        article.category,
        article.summary,
        article.officialSummary,
        ...(article.slogans || []),
        ...(article.tags || []),
        ...(article.sections || []).map((section) => `${section.title} ${section.body}`),
        ...systemDefinitionSearchParts(article)
      ].join(" "),
      action: () => window.WS_APP.openSystemArticle?.(user, article.id)
    }));
  }



  function systemDefinitionSearchParts(article) {
    const definitions = article?.definitions || {};
    const abilities = Array.isArray(definitions.abilities) ? definitions.abilities : [];
    const skills = Array.isArray(definitions.skills) ? definitions.skills : [];
    const subscriptions = Array.isArray(definitions.subscriptions) ? definitions.subscriptions : [];

    return [
      ...abilities.map((definition) => `${definition.label} ${definition.category} ${definition.description || ""} ${definition.id}`),
      ...skills.map((definition) => `${definition.label} ${definition.category} ${definition.description || ""} ${definition.id}`),
      ...subscriptions.map((definition) => `${definition.title} ${definition.provider} ${definition.category} ${definition.logo || ""} ${definition.description || ""} ${(definition.tiers || []).map((tier) => `${tier.label} ${tier.amount} ${tier.cycle} ${tier.description || ""}`).join(" ")} ${definition.id}`)
    ];
  }


  function buildEntryResults(user) {
    const entries = window.WS_APP.getEntries?.({ includeArchived: user?.role === "admin" }) || [];
    const visible = entries.filter((entry) => canSearchEntry(entry, user));

    return visible.map((entry) => makeResult({
      type: "TERM",
      title: entry.title || entry.term || entry.id,
      subtitle: `${entry.category || "UNCLASSIFIED"} / ${entry.id}`,
      body: [
        entry.term,
        entry.localTerm,
        entry.shortDefinition,
        entry.body,
        entry.summary,
        entry.publicText,
        ...(entry.aliases || []),
        ...(entry.tags || []),
        ...(entry.relatedTerms || entry.related || [])
      ].join(" "),
      action: () => {
        if (window.WS_APP.openEntryRecord) {
          window.WS_APP.openEntryRecord(user, entry.id);
          return;
        }

        window.WS_APP.openModule?.("encyclopedia", user);
      }
    }));
  }

  function canSearchEntry(entry, user) {
    if (!entry || !user) return false;
    if (entry.archived && user.role !== "admin") return false;
    return true;
  }


  function buildAddressResults(user) {
    if (user?.role !== "admin") return [];

    const addresses = window.WS_APP.getAddresses?.({ includeArchived: true }) || [];

    return addresses.map((record) => makeResult({
      type: "ADDRESS",
      title: record.label || record.visibleAddress || record.citizenId || record.id,
      subtitle: `${record.clearance || "RESTRICTED"} / ${record.type || "LOCATION"}`,
      body: [
        record.visibleAddress,
        record.trace,
        record.citizenId,
        record.shortId,
        record.cityCode,
        record.geoAddress,
        record.networkId,
        record.controlCode,
        record.chunk,
        record.sessionToken,
        record.packetSignature,
        record.note,
        record.gmNote,
        ...(record.tags || [])
      ].join(" "),
      action: () => {
        if (window.WS_APP.openAddressRecord) {
          window.WS_APP.openAddressRecord(user, record.id);
          return;
        }

        window.WS_APP.openModule?.("address-core", user);
      }
    }));
  }


  function buildTagResults(user) {
    if (user?.role !== "admin") return [];

    const tags = window.WS_APP.getTags?.({ includeArchived: true }) || [];

    return tags.map((tag) => makeResult({
      type: "TAG",
      title: tag.name || tag.id,
      subtitle: `${tag.visibility || "RESTRICTED"} / ${tag.type || "SYSTEM"}`,
      body: [
        tag.description,
        tag.gmNote,
        tag.riskWeight
      ].join(" "),
      action: () => {
        if (window.WS_APP.openTagRecord) {
          window.WS_APP.openTagRecord(user, tag.id);
          return;
        }

        window.WS_APP.openModule?.("tag-registry", user);
      }
    }));
  }

  function buildCaseFileResults(user) {
    const records = window.WS_APP.getCaseFiles?.({ includeArchived: user?.role === "admin" }) || [];
    const visible = records.filter((record) => canSearchCaseFile(record, user));

    return visible.map((record) => makeResult({
      type: "CASE",
      title: record.title || record.caseNumber || record.id,
      subtitle: `${record.status || "OPEN"} / ${record.priority || "NORMAL"} / ${record.caseNumber || record.id}`,
      body: [
        record.type,
        record.clearance,
        record.summary,
        record.publicText,
        user.role === "admin" ? record.restrictedText : "",
        user.role === "admin" ? record.gmText : "",
        ...(record.relatedCitizens || []),
        ...(record.relatedAddresses || []),
        ...(record.relatedEntries || []),
        ...(record.tags || []),
        ...(record.timeline || []).map((item) => `${item.at} ${item.title} ${item.body}`),
        ...(record.tasks || []).map((item) => `${item.title} ${item.status}`)
      ].join(" "),
      action: () => {
        if (window.WS_APP.openCaseFileRecord) {
          window.WS_APP.openCaseFileRecord(user, record.id);
          return;
        }

        window.WS_APP.openModule?.("case-files", user);
      }
    }));
  }

  function canSearchCaseFile(record, user) {
    if (!record || !user) return false;
    if (record.archived && user.role !== "admin") return false;
    if (user.role === "admin") return true;

    const clearance = String(record.clearance || "RESTRICTED").toUpperCase();
    if (clearance === "PUBLIC" || clearance === "CIVIL") return true;

    const relatedCitizens = Array.isArray(record.relatedCitizens) ? record.relatedCitizens : [];
    return relatedCitizens.includes(user.citizenId) && clearance !== "GM" && clearance !== "BLACK";
  }

  function buildSubscriptionResults(user) {
    const citizens = window.WS_APP.getCitizens?.() || [];
    const visibleCitizens = user.role === "admin"
      ? citizens.filter((citizen) => citizen.recordType !== "admin" && citizen.id !== "admin")
      : citizens.filter((citizen) => citizen.id === user.citizenId);

    const results = [];

    visibleCitizens.forEach((citizen) => {
      const subscriptions = normalizeSubscriptions(citizen);

      subscriptions.forEach((subscription) => {
        results.push(makeResult({
          type: "SUBSCRIPTION",
          title: subscription.title || subscription.name || "Subscription",
          subtitle: `${citizen.legalName || getCitizenShortId(citizen)} / ${subscription.status || "UNKNOWN"}`,
          body: [
            subscription.category,
            subscription.provider,
            subscription.tier,
            subscription.tierLabel,
            subscription.catalogId,
            subscription.tierId,
            subscription.logo,
            subscription.status,
            subscription.amount,
            subscription.endDate,
            subscription.renewalDate,
            citizen.legalName,
            getCitizenShortId(citizen)
          ].join(" "),
          action: () => window.WS_APP.openModule?.("subscriptions", user)
        }));
      });
    });

    return results;
  }

  function makeResult(entry) {
    return {
      ...entry,
      haystack: normalize(`${entry.type} ${entry.title} ${entry.subtitle} ${entry.body}`)
    };
  }

  function renderResult(entry, index) {
    return `
      <button class="global-search-result" type="button" data-search-result-index="${escapeHtml(index)}">
        <span class="global-search-type">${escapeHtml(entry.type)}</span>
        <span class="global-search-text">
          <b>${escapeHtml(entry.title)}</b>
          <small>${escapeHtml(entry.subtitle)}</small>
        </span>
      </button>
    `;
  }

  function openSearchResult(index) {
    const entry = lastResults[index];

    if (!entry) return;

    window.WS_APP.closeGlobalSearch();
    entry.action?.();

    window.WS_APP.appendTerminalLogLine?.(`SEARCH OPENED / ${entry.type} / ${entry.title}`, {
      typed: true,
      speed: 8
    });
  }

  function openCitizenResult(user, citizenId) {
    if (user.role !== "admin" && citizenId !== user.citizenId) return;

    if (user.role === "admin") {
      if (window.WS_APP.openCitizenCard) {
        window.WS_APP.openCitizenCard(citizenId, "citizen-cards");
        return;
      }

      window.WS_APP.openModule?.("citizen-cards", user);
      return;
    }

    window.WS_APP.openModule?.("citizen-card", user);
  }

  function getCitizenShortId(citizen) {
    if (typeof window.WS_APP.getCitizenShortId === "function") return window.WS_APP.getCitizenShortId(citizen);
    const shortId = String(citizen?.shortId || "").trim();
    if (shortId) return shortId;
    const idNumber = String(citizen?.idNumber || "").trim();
    const match = idNumber.match(/(\d{8}\.[A-Z0-9]+)$/i) || idNumber.match(/(\d{8}\.[A-Z0-9]+)/i);
    return match ? match[1] : String(citizen?.id || "");
  }

  function normalizeSubscriptions(citizen) {
    const direct = Array.isArray(citizen.subscriptions) ? citizen.subscriptions : [];

    if (direct.length) return direct;

    return [
      citizen.subscription ? { title: "Live & Prevail", category: "CIVIL", provider: "L&P", status: citizen.subscription } : null,
      citizen.trauma ? { title: "TRAUMA", category: "MEDICAL", provider: "TRAUMA", status: citizen.trauma } : null
    ].filter(Boolean);
  }

  function normalize(value) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    if (typeof window.WS_APP.escapeHtml === "function") return window.WS_APP.escapeHtml(value);
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.WS_APP.initGlobalSearch);
  } else {
    window.WS_APP.initGlobalSearch();
  }
})();
