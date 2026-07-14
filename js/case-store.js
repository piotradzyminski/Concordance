window.WS_APP = window.WS_APP || {};

(function initCaseFileStoreModule() {
  const STORAGE_KEY = "ws_app_case_files_v1";
  let caseFileStore = [];

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function slugify(value) {
    const base = String(value || "case-file")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 56);

    return base || "case-file";
  }

  function uniqueId(seed) {
    const base = slugify(seed || "case-file");
    const existing = new Set(caseFileStore.map((record) => record.id));

    if (!existing.has(base)) return base;

    let index = 2;
    while (existing.has(`${base}-${index}`)) index += 1;
    return `${base}-${index}`;
  }

  function parseList(value) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item || "").trim()).filter(Boolean);
    }

    return String(value || "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeClearance(value) {
    const clearance = String(value || "RESTRICTED").trim().toUpperCase();
    const allowed = ["PUBLIC", "CIVIL", "RESTRICTED", "BLACK", "GM"];
    return allowed.includes(clearance) ? clearance : "RESTRICTED";
  }

  function normalizeStatus(value) {
    const status = String(value || "OPEN").trim().toUpperCase();
    const allowed = ["OPEN", "PENDING", "CLOSED", "SEALED", "ARCHIVED"];
    return allowed.includes(status) ? status : "OPEN";
  }

  function normalizePriority(value) {
    const priority = String(value || "NORMAL").trim().toUpperCase();
    const allowed = ["LOW", "NORMAL", "HIGH", "CRITICAL", "BLACK"];
    return allowed.includes(priority) ? priority : "NORMAL";
  }


  function clearanceToAccessTags(clearance) {
    const value = String(clearance || "RESTRICTED").trim().toUpperCase();
    if (value === "GM" || value === "GAME_MASTER") return ["GAME_MASTER"];
    if (value === "BLACK") return ["BLACK"];
    if (value === "CONFIDENTIAL") return ["CONFIDENTIAL"];
    if (value === "RESTRICTED") return ["RESTRICTED"];
    return ["PUBLIC"];
  }

  function normalizeCaseAccessTags(value, clearance) {
    if (window.WS_APP?.normalizeAccessTagList) {
      return window.WS_APP.normalizeAccessTagList(value, clearanceToAccessTags(clearance));
    }

    const fallback = clearanceToAccessTags(clearance);
    const raw = Array.isArray(value) && value.length ? value : fallback;
    return raw.map((tag) => String(tag || "").trim().toUpperCase()).filter(Boolean);
  }

  function accessTagsToLegacyClearance(accessTags = [], fallback = "RESTRICTED") {
    const tags = Array.isArray(accessTags) ? accessTags.map((tag) => String(tag || "").toUpperCase()) : [];
    if (tags.includes("GAME_MASTER")) return "GM";
    if (tags.includes("BLACK")) return "BLACK";
    if (tags.includes("CONFIDENTIAL")) return "RESTRICTED";
    if (tags.includes("RESTRICTED")) return "RESTRICTED";
    if (tags.includes("PUBLIC")) return "PUBLIC";
    return normalizeClearance(fallback);
  }

  function normalizeTimeline(value) {
    if (Array.isArray(value)) {
      return value.map((item) => ({
        at: String(item?.at || "").trim(),
        title: String(item?.title || "TIMELINE ENTRY").trim(),
        body: String(item?.body || "").trim()
      })).filter((item) => item.at || item.title || item.body);
    }

    return String(value || "")
      .split(/\n-{3,}\n/g)
      .map((block) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        if (!lines.length) return null;
        return {
          at: lines.shift() || "",
          title: lines.shift() || "TIMELINE ENTRY",
          body: lines.join("\n")
        };
      })
      .filter(Boolean);
  }

  function normalizeTasks(value) {
    if (Array.isArray(value)) {
      return value.map((item) => ({
        title: String(item?.title || item || "TASK").trim(),
        status: String(item?.status || "OPEN").trim().toUpperCase()
      })).filter((item) => item.title);
    }

    return String(value || "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((title) => ({ title, status: "OPEN" }));
  }

  function normalizeCaseFile(record = {}) {
    const normalized = clone(record || {});
    const now = new Date().toISOString();

    normalized.title = String(normalized.title || "NEW CASE FILE").trim();
    normalized.id = String(normalized.id || uniqueId(normalized.title)).trim();
    normalized.caseNumber = String(normalized.caseNumber || composeCaseNumber()).trim().toUpperCase();
    normalized.type = String(normalized.type || "INCIDENT").trim().toUpperCase();
    normalized.status = normalizeStatus(normalized.status);
    normalized.priority = normalizePriority(normalized.priority);
    normalized.accessTags = normalizeCaseAccessTags(normalized.accessTags, normalized.clearance);
    normalized.clearance = accessTagsToLegacyClearance(normalized.accessTags, normalized.clearance);
    normalized.summary = String(normalized.summary || "").trim();
    normalized.publicText = String(normalized.publicText || "").trim();
    normalized.restrictedText = String(normalized.restrictedText || "").trim();
    normalized.gmText = String(normalized.gmText || "").trim();
    normalized.relatedCitizens = parseList(normalized.relatedCitizens);
    normalized.relatedCitizenFileIds = parseList(normalized.relatedCitizenFileIds || normalized.citizenFileIds);
    normalized.relatedAddresses = parseList(normalized.relatedAddresses);
    normalized.relatedEntries = parseList(normalized.relatedEntries);
    normalized.tags = parseList(normalized.tags).map((tag) => tag.toUpperCase());
    normalized.timeline = normalizeTimeline(normalized.timeline);
    normalized.tasks = normalizeTasks(normalized.tasks);
    normalized.archived = normalized.archived === true || normalized.status === "ARCHIVED";
    normalized.updatedAt = normalized.updatedAt || now;
    normalized.createdAt = normalized.createdAt || normalized.updatedAt;

    return normalized;
  }

  function normalizeCaseFiles(records) {
    return (Array.isArray(records) ? records : [])
      .filter(Boolean)
      .map((record) => normalizeCaseFile(record));
  }

  function readBaseCaseFiles() {
    return normalizeCaseFiles(window.APP_DATA?.caseFiles || []);
  }

  function readStoredCaseFiles() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? normalizeCaseFiles(parsed) : null;
    } catch (error) {
      console.warn("W&S case file store could not read localStorage.", error);
      return null;
    }
  }

  function writeStoredCaseFiles(records) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.warn("W&S case file store could not write localStorage.", error);
    }
  }

  function emitCaseFileUpdate(detail = {}) {
    window.dispatchEvent(new CustomEvent("ws:case-files-updated", { detail }));
  }

  function save() {
    writeStoredCaseFiles(caseFileStore);
    emitCaseFileUpdate({ caseFiles: clone(caseFileStore) });
  }

  function composeCaseNumber() {
    const year = 2109;
    const index = String(caseFileStore.length + 1).padStart(4, "0");
    return `CF-${year}-${index}`;
  }

  window.WS_APP.initCaseFileStore = function initCaseFileStore() {
    const stored = readStoredCaseFiles();
    caseFileStore = stored || readBaseCaseFiles();
    return window.WS_APP.getCaseFiles({ includeArchived: true });
  };

  window.WS_APP.getCaseFiles = function getCaseFiles(options = {}) {
    const includeArchived = options.includeArchived === true;
    const records = includeArchived ? caseFileStore : caseFileStore.filter((record) => !record.archived);
    return clone(records);
  };

  window.WS_APP.getCaseFileById = function getCaseFileById(id) {
    const record = caseFileStore.find((item) => item.id === id);
    return record ? clone(record) : null;
  };

  window.WS_APP.createCaseFile = function createCaseFile(data = {}) {
    const now = new Date().toISOString();
    const record = normalizeCaseFile({
      ...data,
      id: data.id || uniqueId(data.title || data.caseNumber || "case-file"),
      caseNumber: data.caseNumber || composeCaseNumber(),
      createdAt: now,
      updatedAt: now
    });

    caseFileStore.push(record);
    save();
    return clone(record);
  };

  window.WS_APP.updateCaseFile = function updateCaseFile(id, patch = {}) {
    const index = caseFileStore.findIndex((record) => record.id === id);
    if (index < 0) return null;

    const updated = normalizeCaseFile({
      ...caseFileStore[index],
      ...clone(patch),
      id: caseFileStore[index].id,
      createdAt: caseFileStore[index].createdAt,
      updatedAt: new Date().toISOString()
    });

    caseFileStore.splice(index, 1, updated);
    save();
    return clone(updated);
  };

  window.WS_APP.archiveCaseFile = function archiveCaseFile(id) {
    return window.WS_APP.updateCaseFile(id, { archived: true, status: "ARCHIVED" });
  };

  window.WS_APP.restoreCaseFile = function restoreCaseFile(id) {
    return window.WS_APP.updateCaseFile(id, { archived: false, status: "OPEN" });
  };

  window.WS_APP.deleteCaseFile = function deleteCaseFile(id) {
    const index = caseFileStore.findIndex((record) => record.id === id);
    if (index < 0) return false;
    const [deleted] = caseFileStore.splice(index, 1);
    save();
    emitCaseFileUpdate({ deleted: true, id, caseFile: clone(deleted) });
    return true;
  };

  window.WS_APP.createDefaultCaseFile = function createDefaultCaseFile() {
    return window.WS_APP.createCaseFile({
      title: "NEW CASE FILE",
      type: "INCIDENT",
      status: "OPEN",
      priority: "NORMAL",
      clearance: "RESTRICTED",
      summary: "Pending case summary.",
      publicText: "Public layer pending.",
      restrictedText: "Restricted layer pending.",
      gmText: "GM layer pending.",
      relatedCitizens: [],
      relatedCitizenFileIds: [],
      relatedAddresses: [],
      relatedEntries: [],
      tags: ["DRAFT"],
      timeline: [],
      tasks: [{ title: "Define case scope", status: "OPEN" }],
      archived: false
    });
  };

  window.WS_APP.duplicateCaseFile = function duplicateCaseFile(id) {
    const record = window.WS_APP.getCaseFileById(id);
    if (!record) return null;

    return window.WS_APP.createCaseFile({
      ...record,
      id: undefined,
      caseNumber: undefined,
      title: `${record.title || "CASE FILE"} COPY`,
      status: "OPEN",
      archived: false,
      createdAt: undefined,
      updatedAt: undefined
    });
  };

  window.WS_APP.importCaseFiles = function importCaseFiles(records) {
    if (!Array.isArray(records)) return null;
    caseFileStore = normalizeCaseFiles(records);
    save();
    return window.WS_APP.getCaseFiles({ includeArchived: true });
  };

  window.WS_APP.resetCaseFileStore = function resetCaseFileStore() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("W&S case file store could not clear localStorage.", error);
    }

    caseFileStore = readBaseCaseFiles();
    emitCaseFileUpdate({ reset: true });
    return window.WS_APP.getCaseFiles({ includeArchived: true });
  };

  window.WS_APP.initCaseFileStore();
})();
