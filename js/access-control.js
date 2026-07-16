window.WS_APP = window.WS_APP || {};

(function initAccessControlModule() {
  const USER_STORAGE_KEY = "ws_app_users_v1";
  const ACCESS_TAG_STORAGE_KEY = "ws_app_access_tags_v1";
  let userStore = [];
  let accessTagStore = [];

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  const CLASSIFICATION_ORDER = ["PUBLIC", "RESTRICTED", "CONFIDENTIAL", "BLACK", "GAME_MASTER"];
  const CLASSIFICATION_SET = new Set(CLASSIFICATION_ORDER);

  function getClassificationPriority(tag) {
    const index = CLASSIFICATION_ORDER.indexOf(String(tag || "").trim().toUpperCase());
    return index < 0 ? -1 : index;
  }

  function isClassificationTag(tag) {
    return CLASSIFICATION_SET.has(String(tag || "").trim().toUpperCase());
  }

  function splitAccessTags(value, fallback = ["PUBLIC"]) {
    const raw = parseList(value).map((tag) => normalizeId(tag)).filter(Boolean);
    const source = raw.length ? raw : parseList(fallback).map((tag) => normalizeId(tag)).filter(Boolean);
    let classification = "PUBLIC";
    let classificationPriority = getClassificationPriority(classification);
    const compartments = [];

    source.forEach((tag) => {
      const priority = getClassificationPriority(tag);
      if (priority >= 0) {
        if (priority >= classificationPriority) {
          classification = tag;
          classificationPriority = priority;
        }
        return;
      }
      if (!compartments.includes(tag)) compartments.push(tag);
    });

    return { classification, compartments, tags: [classification, ...compartments] };
  }

  function normalizeId(value, fallback = "ACCESS") {
    const raw = String(value || fallback).trim().toUpperCase();
    return raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9&_-]+/g, "_")
      .replace(/^_+|_+$/g, "") || fallback;
  }

  function slugify(value, fallback = "user") {
    return String(value || fallback)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback;
  }

  function uniqueUserId(seed) {
    const base = slugify(seed || "user");
    const existing = new Set(userStore.map((user) => user.id));
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

  function parseAccessRelationList(value) {
    return parseList(value)
      .map((item) => normalizeId(item))
      .filter(Boolean);
  }

  function getDefaultIncludes(id, type) {
    const normalized = normalizeId(id);
    const normalizedType = String(type || "custom").trim().toLowerCase();

    if (normalized === "RESTRICTED") return ["PUBLIC"];
    if (normalized === "CONFIDENTIAL") return ["PUBLIC", "RESTRICTED"];
    if (normalized === "BLACK") return ["PUBLIC", "RESTRICTED", "CONFIDENTIAL"];
    if (normalized === "GAME_MASTER") return ["PUBLIC", "RESTRICTED", "CONFIDENTIAL", "BLACK"];
    if (normalizedType !== "classification") return [];
    return [];
  }

  function getDefaultRank(id, type) {
    const normalized = normalizeId(id);
    if (normalized === "PUBLIC") return 10;
    if (normalized === "RESTRICTED") return 20;
    if (normalized === "CONFIDENTIAL") return 30;
    if (normalized === "BLACK") return 40;
    if (normalized === "GAME_MASTER") return 100;
    return String(type || "").toLowerCase() === "classification" ? 0 : null;
  }

  function normalizeRank(value, fallback = null) {
    if (value === null || value === undefined || value === "") return fallback;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function normalizeAccessTagType(value) {
    const type = String(value || "custom").trim().toLowerCase();
    const allowed = ["classification", "organization", "compartment", "case", "system", "special", "custom"];
    return allowed.includes(type) ? type : "custom";
  }

  function shouldRequireExplicitAssignment(id, type, value) {
    if (value === true) return true;
    if (value === false) return false;

    const normalized = normalizeId(id);
    const normalizedType = normalizeAccessTagType(type);
    if (["PUBLIC", "RESTRICTED", "CONFIDENTIAL", "BLACK"].includes(normalized)) return false;
    return ["organization", "compartment", "system", "special", "custom", "case"].includes(normalizedType);
  }

  function normalizeAccessTags(value, fallback = ["PUBLIC"]) {
    return splitAccessTags(value, fallback).tags;
  }

  function normalizeAccessTag(record = {}) {
    const id = normalizeId(record.id || record.name || record.label || "ACCESS");
    const type = normalizeAccessTagType(record.type || (isClassificationTag(id) ? "classification" : "custom"));
    const fallbackRank = getDefaultRank(id, type);
    return {
      id,
      label: String(record.label || record.name || id).trim(),
      type,
      rank: normalizeRank(record.rank, fallbackRank),
      includes: parseAccessRelationList(Object.prototype.hasOwnProperty.call(record, "includes") ? record.includes : getDefaultIncludes(id, type)).filter((tag) => tag !== id),
      exclusiveWith: parseAccessRelationList(Object.prototype.hasOwnProperty.call(record, "exclusiveWith") ? record.exclusiveWith : []).filter((tag) => tag !== id),
      requiresExplicitAssignment: shouldRequireExplicitAssignment(id, type, record.requiresExplicitAssignment),
      adminOnly: record.adminOnly === true || id === "GAME_MASTER",
      description: String(record.description || "").trim(),
      locked: record.locked === true,
      archived: record.archived === true,
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: record.updatedAt || record.createdAt || new Date().toISOString()
    };
  }

  function normalizeUser(user = {}) {
    const role = String(user.role || "citizen").trim().toLowerCase() === "admin" ? "admin" : "citizen";
    const defaultTags = role === "admin"
      ? ["PUBLIC", "RESTRICTED", "CONFIDENTIAL", "BLACK", "GAME_MASTER", "W&S", "TRAUMA"]
      : ["PUBLIC"];

    return {
      id: String(user.id || uniqueUserId(user.login || user.displayName || "user")).trim(),
      login: String(user.login || "New User").trim(),
      password: String(user.password || "password").trim(),
      role,
      citizenId: String(user.citizenId || "").trim(),
      displayName: String(user.displayName || user.login || "User").trim(),
      accessTags: normalizeAccessTags(user.accessTags, defaultTags),
      disabled: user.disabled === true,
      locked: user.locked === true || role === "admin",
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: user.updatedAt || user.createdAt || new Date().toISOString()
    };
  }

  function normalizeUsers(users) {
    return (Array.isArray(users) ? users : []).filter(Boolean).map((user) => normalizeUser(user));
  }

  function normalizeAccessTagRecords(records) {
    const normalized = (Array.isArray(records) ? records : []).filter(Boolean).map((record) => normalizeAccessTag(record));
    const byId = new Map();
    normalized.forEach((record) => byId.set(record.id, record));
    return Array.from(byId.values());
  }


  function buildAccessTagMap(options = {}) {
    const includeArchived = options.includeArchived === true;
    const map = new Map();
    normalizeAccessTagRecords(window.APP_DATA?.accessTags || []).forEach((tag) => {
      if (includeArchived || !tag.archived) map.set(tag.id, tag);
    });
    accessTagStore.forEach((tag) => {
      if (includeArchived || !tag.archived) map.set(tag.id, normalizeAccessTag(tag));
    });
    CLASSIFICATION_ORDER.forEach((id) => {
      if (!map.has(id)) map.set(id, normalizeAccessTag({ id, label: id, type: "classification" }));
    });
    return map;
  }

  function resolveAccessGrantSet(tags, options = {}) {
    const map = buildAccessTagMap(options);
    const direct = parseAccessRelationList(tags);
    const source = direct.length ? direct : ["PUBLIC"];
    const granted = new Set();
    const visiting = new Set();

    function add(tagId) {
      const normalized = normalizeId(tagId);
      if (!normalized || visiting.has(normalized)) return;
      if (granted.has(normalized)) return;
      visiting.add(normalized);
      granted.add(normalized);
      const definition = map.get(normalized) || normalizeAccessTag({ id: normalized });
      parseAccessRelationList(definition.includes).forEach(add);
      visiting.delete(normalized);
    }

    source.forEach(add);
    return granted;
  }

  function getAccessMatrixRows(options = {}) {
    const map = buildAccessTagMap({ includeArchived: options.includeArchived === true });
    return Array.from(map.values()).sort((a, b) => {
      const rankA = a.rank === null || a.rank === undefined ? 999 : Number(a.rank);
      const rankB = b.rank === null || b.rank === undefined ? 999 : Number(b.rank);
      return rankA - rankB || String(a.type || "").localeCompare(String(b.type || ""), "pl") || String(a.id).localeCompare(String(b.id), "pl");
    });
  }

  function readStored(key, normalizer) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return normalizer(parsed);
    } catch (error) {
      console.warn("W&S access control store read failed.", error);
      return null;
    }
  }

  function writeStored(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("W&S access control store write failed.", error);
    }
  }

  function emitAccessUpdate(detail = {}) {
    window.dispatchEvent(new CustomEvent("ws:access-control-updated", { detail }));
  }

  function seedUsers() {
    return normalizeUsers(window.APP_DATA?.users || []);
  }

  function seedAccessTags() {
    return normalizeAccessTagRecords(window.APP_DATA?.accessTags || []);
  }

  function saveUsers() {
    writeStored(USER_STORAGE_KEY, userStore);
    emitAccessUpdate({ users: clone(userStore) });
  }

  function saveAccessTags() {
    writeStored(ACCESS_TAG_STORAGE_KEY, accessTagStore);
    emitAccessUpdate({ accessTags: clone(accessTagStore) });
  }

  window.WS_APP.initAccessControlStore = function initAccessControlStore() {
    userStore = readStored(USER_STORAGE_KEY, normalizeUsers) || seedUsers();
    accessTagStore = readStored(ACCESS_TAG_STORAGE_KEY, normalizeAccessTagRecords) || seedAccessTags();
    return {
      users: window.WS_APP.getUsers(),
      accessTags: window.WS_APP.getAccessTags({ includeArchived: true })
    };
  };

  window.WS_APP.getUsers = function getUsers(options = {}) {
    const includeDisabled = options.includeDisabled === true;
    const users = includeDisabled ? userStore : userStore.filter((user) => !user.disabled);
    return clone(users);
  };

  window.WS_APP.getUserById = function getUserById(id) {
    const user = userStore.find((entry) => entry.id === id);
    return user ? clone(user) : null;
  };

  window.WS_APP.getUserByLogin = function getUserByLogin(login) {
    const normalizedLogin = window.WS_APP.normalizeLogin
      ? window.WS_APP.normalizeLogin(login)
      : String(login || "").trim().toLowerCase();

    const user = userStore.find((entry) => {
      const entryLogin = window.WS_APP.normalizeLogin
        ? window.WS_APP.normalizeLogin(entry.login)
        : String(entry.login || "").trim().toLowerCase();
      return entryLogin === normalizedLogin;
    });

    return user ? clone(user) : null;
  };

  window.WS_APP.createUser = function createUser(data = {}) {
    const user = normalizeUser({ ...clone(data), id: data.id || uniqueUserId(data.login || data.displayName || "user") });
    userStore.push(user);
    saveUsers();
    return clone(user);
  };

  window.WS_APP.updateUser = function updateUser(id, patch = {}) {
    const index = userStore.findIndex((user) => user.id === id);
    if (index < 0) return null;

    const updated = normalizeUser({
      ...userStore[index],
      ...clone(patch),
      id: userStore[index].id,
      locked: userStore[index].locked,
      createdAt: userStore[index].createdAt,
      updatedAt: new Date().toISOString()
    });

    userStore.splice(index, 1, updated);
    saveUsers();
    return clone(updated);
  };

  window.WS_APP.deleteUser = function deleteUser(id) {
    const index = userStore.findIndex((user) => user.id === id && user.role !== "admin");
    if (index < 0) return false;
    userStore.splice(index, 1);
    saveUsers();
    return true;
  };

  window.WS_APP.importUsers = function importUsers(users) {
    if (!Array.isArray(users)) return null;
    userStore = normalizeUsers(users);
    saveUsers();
    return window.WS_APP.getUsers({ includeDisabled: true });
  };

  window.WS_APP.resetUserStore = function resetUserStore() {
    try { window.localStorage.removeItem(USER_STORAGE_KEY); } catch (error) {}
    userStore = seedUsers();
    emitAccessUpdate({ resetUsers: true });
    return window.WS_APP.getUsers({ includeDisabled: true });
  };

  window.WS_APP.getAccessTags = function getAccessTags(options = {}) {
    const includeArchived = options.includeArchived === true;
    const records = includeArchived ? accessTagStore : accessTagStore.filter((tag) => !tag.archived);
    return clone(records);
  };

  window.WS_APP.getAccessTagById = function getAccessTagById(id) {
    const normalized = normalizeId(id);
    const tag = accessTagStore.find((entry) => entry.id === normalized);
    return tag ? clone(tag) : null;
  };

  window.WS_APP.createAccessTag = function createAccessTag(data = {}) {
    const tag = normalizeAccessTag(data);
    if (accessTagStore.some((entry) => entry.id === tag.id)) return null;
    accessTagStore.push(tag);
    saveAccessTags();
    return clone(tag);
  };

  window.WS_APP.updateAccessTag = function updateAccessTag(id, patch = {}) {
    const normalized = normalizeId(id);
    const index = accessTagStore.findIndex((tag) => tag.id === normalized);
    if (index < 0 || accessTagStore[index].locked) return null;

    const updated = normalizeAccessTag({
      ...accessTagStore[index],
      ...clone(patch),
      id: accessTagStore[index].id,
      locked: accessTagStore[index].locked,
      createdAt: accessTagStore[index].createdAt,
      updatedAt: new Date().toISOString()
    });

    accessTagStore.splice(index, 1, updated);
    saveAccessTags();
    return clone(updated);
  };

  window.WS_APP.deleteAccessTag = function deleteAccessTag(id) {
    const normalized = normalizeId(id);
    const index = accessTagStore.findIndex((tag) => tag.id === normalized && !tag.locked);
    if (index < 0) return false;
    accessTagStore.splice(index, 1);
    saveAccessTags();
    return true;
  };

  window.WS_APP.importAccessTags = function importAccessTags(tags) {
    if (!Array.isArray(tags)) return null;
    accessTagStore = normalizeAccessTagRecords(tags);
    saveAccessTags();
    return window.WS_APP.getAccessTags({ includeArchived: true });
  };

  window.WS_APP.resetAccessTagStore = function resetAccessTagStore() {
    try { window.localStorage.removeItem(ACCESS_TAG_STORAGE_KEY); } catch (error) {}
    accessTagStore = seedAccessTags();
    emitAccessUpdate({ resetAccessTags: true });
    return window.WS_APP.getAccessTags({ includeArchived: true });
  };

  window.WS_APP.getUserAccessTags = function getUserAccessTags(user = window.WS_APP.currentUser) {
    if (!user) return [];
    if (user.role === "admin") {
      return normalizeAccessTags([...(user.accessTags || []), "GAME_MASTER", "W&S", "TRAUMA"], ["GAME_MASTER"]);
    }
    return normalizeAccessTags(user.accessTags, ["PUBLIC"]);
  };

  window.WS_APP.normalizeAccessTagList = function normalizeAccessTagList(value, fallback = ["PUBLIC"]) {
    return normalizeAccessTags(value, fallback);
  };

  window.WS_APP.splitAccessTags = function splitAccessTagList(value, fallback = ["PUBLIC"]) {
    return clone(splitAccessTags(value, fallback));
  };

  window.WS_APP.isClassificationAccessTag = function isClassificationAccessTagPublic(tag) {
    return isClassificationTag(tag);
  };

  window.WS_APP.getRecordAccessTags = function getRecordAccessTags(record = {}) {
    if (Array.isArray(record.accessTags) && record.accessTags.length) return normalizeAccessTags(record.accessTags);
    if (Array.isArray(record.requiredAccessTags) && record.requiredAccessTags.length) return normalizeAccessTags(record.requiredAccessTags);
    return ["PUBLIC"];
  };

  window.WS_APP.canAccessRecord = function canAccessRecord(user, record = {}) {
    if (!user || !record) return false;
    if (user.role === "admin") return true;

    const requiredTags = window.WS_APP.getRecordAccessTags(record);
    const grantedTags = resolveAccessGrantSet(window.WS_APP.getUserAccessTags(user), { includeArchived: false });

    return parseAccessRelationList(requiredTags).every((tag) => grantedTags.has(tag));
  };

  window.WS_APP.resolveAccessGrantTags = function resolveAccessGrantTags(tags, options = {}) {
    return Array.from(resolveAccessGrantSet(tags, options));
  };

  window.WS_APP.getAccessMatrixRows = function getAccessMatrixRowsPublic(options = {}) {
    return clone(getAccessMatrixRows(options));
  };

  function renderTagChipPicker(name, items, selectedSet, options = {}) {
    const label = options.label || "Tags";
    const hint = options.hint || "Click tags to attach them to this record.";
    const empty = options.empty || "No tags available";
    const cssClass = options.cssClass || "content-tag-field";

    return `
      <fieldset class="entry-form-field tag-picker-field ${cssClass} ${options.extraClass || ""}">
        <legend>${escapeHtmlLocal(label)}</legend>
        <div class="tag-picker-grid" data-tag-picker="${escapeHtmlLocal(name)}">
          ${items.length ? items.map((item) => {
            const id = String(item.id || item.value || item.label || "").trim();
            const display = String(item.label || item.name || item.id || id).trim();
            const checked = selectedSet.has(id.toUpperCase());
            const type = String(item.type || item.category || "").trim();
            return `
              <label class="tag-picker-chip ${checked ? "is-selected" : ""}">
                <input class="ui-select-control" type="checkbox" name="${escapeHtmlLocal(name)}" value="${escapeHtmlLocal(id)}" ${checked ? "checked" : ""} />
                <span>${escapeHtmlLocal(id)}</span>
                ${display && display.toUpperCase() !== id.toUpperCase() ? `<small>${escapeHtmlLocal(display)}</small>` : ""}
                ${type ? `<em>${escapeHtmlLocal(type)}</em>` : ""}
              </label>
            `;
          }).join("") : `<p class="file-empty">${escapeHtmlLocal(empty)}</p>`}
        </div>
        <small>${escapeHtmlLocal(hint)}</small>
      </fieldset>
    `;
  }

  window.WS_APP.renderAccessTagSelect = function renderAccessTagSelect(name, selected = ["PUBLIC"], options = {}) {
    const tags = window.WS_APP.getAccessTags?.({ includeArchived: false }) || [];
    const selectedGroups = splitAccessTags(selected, options.fallback || ["PUBLIC"]);
    const selectedSet = new Set(selectedGroups.tags);
    const byId = new Map();

    tags.forEach((tag) => {
      const id = normalizeId(tag.id || tag.label || "ACCESS");
      byId.set(id, { ...tag, id });
    });
    CLASSIFICATION_ORDER.forEach((id) => {
      if (!byId.has(id)) byId.set(id, { id, label: id, type: "classification" });
    });

    const classificationTags = CLASSIFICATION_ORDER
      .map((id) => byId.get(id))
      .filter(Boolean);

    const compartmentTags = Array.from(byId.values())
      .filter((tag) => !isClassificationTag(tag.id))
      .sort((a, b) => String(a.id).localeCompare(String(b.id), "pl"));

    const label = options.label || "Required access tags";
    const hint = options.hint || "Choose one clearance level. Additional tags, such as W&S or TRAUMA, are required separately.";

    return `
      <fieldset class="entry-form-field tag-picker-field access-tag-field access-tag-split-field ${options.extraClass || ""}">
        <legend>${escapeHtmlLocal(label)}</legend>
        <div class="access-tag-split">
          <div class="access-tag-split-section">
            <p>Clearance level</p>
            <div class="tag-picker-grid is-classification-picker" data-tag-picker="${escapeHtmlLocal(name)}-classification">
              ${classificationTags.map((item) => {
                const id = normalizeId(item.id);
                const display = String(item.label || id).trim();
                const checked = selectedGroups.classification === id;
                return `
                  <label class="tag-picker-chip is-classification ${checked ? "is-selected" : ""}">
                    <input type="radio" name="${escapeHtmlLocal(name)}" value="${escapeHtmlLocal(id)}" ${checked ? "checked" : ""} />
                    <span>${escapeHtmlLocal(id)}</span>
                    ${display && display.toUpperCase() !== id ? `<small>${escapeHtmlLocal(display)}</small>` : ""}
                  </label>
                `;
              }).join("")}
            </div>
          </div>
          <div class="access-tag-split-section">
            <p>Required organization / special tags</p>
            <div class="tag-picker-grid is-compartment-picker" data-tag-picker="${escapeHtmlLocal(name)}-compartments">
              ${compartmentTags.length ? compartmentTags.map((item) => {
                const id = normalizeId(item.id);
                const display = String(item.label || id).trim();
                const checked = selectedSet.has(id);
                const type = String(item.type || "custom").trim();
                return `
                  <label class="tag-picker-chip is-compartment ${checked ? "is-selected" : ""}">
                    <input class="ui-select-control" type="checkbox" name="${escapeHtmlLocal(name)}" value="${escapeHtmlLocal(id)}" ${checked ? "checked" : ""} />
                    <span>${escapeHtmlLocal(id)}</span>
                    ${display && display.toUpperCase() !== id ? `<small>${escapeHtmlLocal(display)}</small>` : ""}
                    ${type ? `<em>${escapeHtmlLocal(type)}</em>` : ""}
                  </label>
                `;
              }).join("") : `<p class="file-empty">No extra access tags available. Create them in ACCESS CONTROL.</p>`}
            </div>
          </div>
        </div>
        <small>${escapeHtmlLocal(hint)}</small>
      </fieldset>
    `;
  };

  window.WS_APP.renderContentTagSelect = function renderContentTagSelect(name, selected = [], options = {}) {
    const registryTags = window.WS_APP.getTags?.({ includeArchived: false }) || [];
    const selectedList = parseList(selected).map((tag) => String(tag || "").trim()).filter(Boolean);
    const selectedSet = new Set(selectedList.map((tag) => tag.toUpperCase()));
    const byName = new Map();

    registryTags.forEach((tag) => {
      const nameValue = String(tag.name || tag.tag || tag.id || "").trim();
      if (!nameValue) return;
      byName.set(nameValue.toUpperCase(), {
        id: nameValue.toUpperCase(),
        label: tag.label || tag.name || nameValue,
        type: tag.type || tag.category || ""
      });
    });

    selectedList.forEach((tag) => {
      const id = tag.toUpperCase();
      if (!byName.has(id)) byName.set(id, { id, label: id, type: "custom" });
    });

    const values = Array.from(byName.values()).sort((a, b) => String(a.id).localeCompare(String(b.id), "pl"));
    return renderTagChipPicker(name, values, selectedSet, {
      ...options,
      label: options.label || "Content tags",
      hint: options.hint || "Tag Registry tags describe content. They do not grant access.",
      empty: "No content tags available. Add them in TAG REGISTRY.",
      cssClass: "content-tag-field"
    });
  };

  window.WS_APP.collectContentTagValues = function collectContentTagValues(form, name) {
    return Array.from(form.querySelectorAll(`input[name="${CSS.escape(name)}"]:checked, select[name="${CSS.escape(name)}"] option:checked`))
      .map((node) => String(node.value || "").trim().toUpperCase())
      .filter(Boolean);
  };

  window.WS_APP.collectMultiSelectValues = function collectMultiSelectValues(form, name, fallback = ["PUBLIC"]) {
    const values = Array.from(form.querySelectorAll(`input[name="${CSS.escape(name)}"]:checked, select[name="${CSS.escape(name)}"] option:checked`)).map((node) => node.value);
    return normalizeAccessTags(values, fallback);
  };

  window.WS_APP.renderAccessControlModule = function renderAccessControlModule(user) {
    if (!user || user.role !== "admin") return;
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    const terminalGrid = document.querySelector(".terminal-grid");
    if (!container) return;

    terminalGrid?.classList.add("is-card-open");
    window.WS_APP.currentModuleId = "access-control";

    const users = window.WS_APP.getUsers({ includeDisabled: true });
    const tags = window.WS_APP.getAccessTags({ includeArchived: true });
    const citizens = (window.WS_APP.getCitizens?.() || []).filter((citizen) => citizen.recordType !== "admin");

    if (status) status.textContent = `ACCESS CONTROL / ${users.length} USERS / ${tags.length} TAGS`;

    container.innerHTML = `
      <article class="module-detail access-control-view">
        <div class="module-detail-head">
          <div>
            <p class="kicker">ADMIN / ACCESS CONTROL</p>
            <h4>Users & Access Tags</h4>
          </div>
          <button class="module-back-button" type="button">Back</button>
        </div>

        <section class="access-control-grid">
          <div class="access-control-panel">
            <header>
              <div>
                <p class="kicker">LOGIN REGISTRY</p>
                <h5>Users</h5>
                <small>Expand one user to edit login, password, card and clearance tags.</small>
              </div>
              <button type="button" class="registry-action" id="access-create-user">Create User</button>
            </header>
            <div class="access-user-list">
              ${users.map((entry) => renderUserCard(entry, citizens)).join("")}
            </div>
          </div>

          <div class="access-control-panel">
            <header>
              <div>
                <p class="kicker">ACCESS TAG REGISTRY</p>
                <h5>Clearance Tags</h5>
                <small>Access tags control visibility. Content tags stay in Tag Registry.</small>
              </div>
              <button type="button" class="registry-action" id="access-create-tag">Create Tag</button>
            </header>
            <div class="access-tag-list">
              ${tags.map((tag) => renderAccessTagCard(tag)).join("")}
            </div>
          </div>
        </section>
      </article>
    `;

    if (window.WS_APP.bindModuleBackButton) {
      window.WS_APP.bindModuleBackButton(user, () => window.WS_APP.renderModules(user));
    } else {
      document.querySelector(".module-back-button")?.addEventListener("click", () => window.WS_APP.renderModules(user));
    }
    bindAccessControlEvents(user);
    window.WS_APP.accessControlOpenUserId = "";
  };

  function renderUserCard(entry, citizens) {
    const tagOptions = accessTagStore.filter((tag) => !tag.archived || (entry.accessTags || []).includes(tag.id));
    const card = citizens.find((citizen) => citizen.id === entry.citizenId);
    const cardLabel = card ? (card.legalName || card.shortId || card.id) : "No card";
    const selectedCount = (entry.accessTags || []).length;
    const statusPills = [
      entry.role === "admin" ? "ADMIN" : "CITIZEN",
      entry.disabled ? "DISABLED" : "ENABLED",
      `${selectedCount} TAG${selectedCount === 1 ? "" : "S"}`
    ];

    return `
      <details class="access-record-card access-user-card" data-user-id="${escapeHtmlLocal(entry.id)}" ${window.WS_APP.accessControlOpenUserId === entry.id ? "open" : ""}>
        <summary class="access-record-summary">
          <span>
            <strong>${escapeHtmlLocal(entry.displayName || entry.login)}</strong>
            <small>${escapeHtmlLocal(entry.login)} / ${escapeHtmlLocal(cardLabel)}</small>
          </span>
          <span class="access-record-pills">
            ${statusPills.map((pill) => `<i>${escapeHtmlLocal(pill)}</i>`).join("")}
          </span>
        </summary>
        <form class="access-user-form" data-user-id="${escapeHtmlLocal(entry.id)}" data-current-role="${escapeHtmlLocal(entry.role)}">
          <div class="access-form-grid">
            <label>
              <span>Login</span>
              <input name="login" value="${escapeHtmlLocal(entry.login)}" placeholder="Login" />
            </label>
            <label>
              <span>Password</span>
              <input name="password" value="${escapeHtmlLocal(entry.password)}" placeholder="Password" />
            </label>
            <label>
              <span>Role</span>
              <select name="role">
                <option value="citizen" ${entry.role === "citizen" ? "selected" : ""}>citizen</option>
                <option value="admin" ${entry.role === "admin" ? "selected" : ""}>admin</option>
              </select>
            </label>
            <label>
              <span>Citizen card</span>
              <select name="citizenId">
                <option value="">No card</option>
                ${citizens.map((citizen) => `<option value="${escapeHtmlLocal(citizen.id)}" ${citizen.id === entry.citizenId ? "selected" : ""}>${escapeHtmlLocal(citizen.legalName || citizen.shortId || citizen.id)}</option>`).join("")}
              </select>
            </label>
          </div>

          <div class="access-tag-picker">
            <p class="kicker">Required user clearance</p>
            <div class="access-chip-grid">
              ${tagOptions.map((tag) => renderAccessCheckbox("accessTags", tag.id, tag.label, (entry.accessTags || []).includes(tag.id))).join("")}
            </div>
            <small>User receives access only when their tags satisfy all tags required by a record.</small>
          </div>

          <div class="access-record-footer">
            <label class="access-check"><input class="ui-select-control" name="disabled" type="checkbox" ${entry.disabled ? "checked" : ""} ${entry.role === "admin" ? "disabled" : ""}/> Disabled</label>
            <span class="access-row-actions">
              <button type="submit">Save</button>
              <button type="button" data-delete-user ${entry.role === "admin" ? "disabled" : ""}>Delete</button>
            </span>
          </div>
        </form>
      </details>
    `;
  }

  function renderAccessTagCard(tag) {
    const statusPills = [tag.type || "custom", tag.archived ? "ARCHIVED" : "ACTIVE", tag.locked ? "LOCKED" : "EDITABLE"];
    return `
      <details class="access-record-card access-tag-card" data-access-tag-id="${escapeHtmlLocal(tag.id)}">
        <summary class="access-record-summary">
          <span>
            <strong>${escapeHtmlLocal(tag.id)}</strong>
            <small>${escapeHtmlLocal(tag.label)}</small>
          </span>
          <span class="access-record-pills">
            ${statusPills.map((pill) => `<i>${escapeHtmlLocal(pill)}</i>`).join("")}
          </span>
        </summary>
        <form class="access-tag-form" data-access-tag-id="${escapeHtmlLocal(tag.id)}">
          <div class="access-form-grid">
            <label>
              <span>Tag ID</span>
              <input name="id" value="${escapeHtmlLocal(tag.id)}" ${tag.locked ? "readonly" : ""} />
            </label>
            <label>
              <span>Label</span>
              <input name="label" value="${escapeHtmlLocal(tag.label)}" />
            </label>
            <label>
              <span>Type</span>
              <select name="type">
                ${["classification", "organization", "compartment", "case", "system", "special", "custom"].map((type) => `<option value="${type}" ${tag.type === type ? "selected" : ""}>${type}</option>`).join("")}
              </select>
            </label>
            <label>
              <span>Rank</span>
              <input name="rank" value="${escapeHtmlLocal(tag.rank ?? "")}" placeholder="optional" />
            </label>
          </div>
          <div class="access-form-grid">
            <label>
              <span>Includes</span>
              <input name="includes" value="${escapeHtmlLocal((tag.includes || []).join(", "))}" placeholder="PUBLIC, RESTRICTED" />
            </label>
            <label>
              <span>Exclusive With</span>
              <input name="exclusiveWith" value="${escapeHtmlLocal((tag.exclusiveWith || []).join(", "))}" placeholder="DECODED" />
            </label>
            <label class="access-check access-form-check">
              <input class="ui-select-control" name="requiresExplicitAssignment" type="checkbox" ${tag.requiresExplicitAssignment ? "checked" : ""} />
              <span>Explicit assignment</span>
            </label>
            <label class="access-check access-form-check">
              <input class="ui-select-control" name="adminOnly" type="checkbox" ${tag.adminOnly ? "checked" : ""} />
              <span>Admin only</span>
            </label>
          </div>
          <label class="access-textarea-field">
            <span>Description</span>
            <textarea name="description" rows="4">${escapeHtmlLocal(tag.description)}</textarea>
          </label>
          <div class="access-record-footer">
            <label class="access-check"><input class="ui-select-control" name="archived" type="checkbox" ${tag.archived ? "checked" : ""} ${tag.locked ? "disabled" : ""}/> Archived</label>
            <span class="access-row-actions">
              <button type="submit" ${tag.locked ? "disabled" : ""}>Save</button>
              <button type="button" data-delete-access-tag ${tag.locked ? "disabled" : ""}>Delete</button>
            </span>
          </div>
        </form>
      </details>
    `;
  }

  function renderAccessCheckbox(name, value, label, checked) {
    return `
      <label class="access-chip ${checked ? "is-selected" : ""}">
      <input class="ui-select-control" type="checkbox" name="${escapeHtmlLocal(name)}" value="${escapeHtmlLocal(value)}" ${checked ? "checked" : ""} />
        <span>${escapeHtmlLocal(value)}</span>
        <small>${escapeHtmlLocal(label)}</small>
      </label>
    `;
  }

  function appendAccessAudit(user, event = {}) {
    return window.WS_APP.appendAdminAuditEvent?.({
      category: "ACCESS",
      workspace: "TAGS_ACCESS",
      ...event
    }, { user });
  }

  function bindAccessControlEvents(user) {
    document.querySelector("#access-create-user")?.addEventListener("click", () => {
      const created = window.WS_APP.createUser?.({ login: "New User", password: "password", role: "citizen", displayName: "New User", accessTags: ["PUBLIC"] });
      appendAccessAudit(user, {
        action: created ? "ACCESS_USER_CREATED" : "ACCESS_USER_CREATE_FAILED",
        target: created?.id || "ACCESS_USER",
        recordId: created?.id || "",
        summary: created ? `Access user ${created.id} created.` : "Access user creation failed.",
        resultCode: created ? "ACCESS_USER_CREATED" : "ACCESS_USER_CREATE_FAILED",
        status: created ? "SUCCEEDED" : "FAILED",
        meta: { login: created?.login || "New User", role: created?.role || "citizen" }
      });
      window.WS_APP.renderAccessControlModule(user);
      if (created?.id) {
        document.querySelector(`.access-record-card[data-user-id="${CSS.escape(created.id)}"]`)?.setAttribute("open", "");
      }
    });

    document.querySelector("#access-create-tag")?.addEventListener("click", () => {
      const created = window.WS_APP.createAccessTag?.({ id: `CUSTOM_${Date.now().toString().slice(-5)}`, label: "Custom Access", type: "custom", includes: [], exclusiveWith: [], requiresExplicitAssignment: true, description: "New access tag." });
      appendAccessAudit(user, {
        action: created ? "ACCESS_TAG_CREATED" : "ACCESS_TAG_CREATE_FAILED",
        target: created?.id || "ACCESS_TAG",
        recordId: created?.id || "",
        summary: created ? `Access tag ${created.id} created.` : "Access tag creation failed.",
        resultCode: created ? "ACCESS_TAG_CREATED" : "ACCESS_TAG_CREATE_FAILED",
        status: created ? "SUCCEEDED" : "FAILED"
      });
      if (!created) window.WS_APP.appendTerminalLogLine?.("ACCESS TAG CREATE FAILED / DUPLICATE ID", { typed: true, speed: 8 });
      window.WS_APP.renderAccessControlModule(user);
      if (created?.id) {
        document.querySelector(`.access-record-card[data-access-tag-id="${CSS.escape(created.id)}"]`)?.setAttribute("open", "");
      }
    });

    document.querySelectorAll(".access-user-form").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const role = data.get("role") || form.dataset.currentRole || "citizen";
        const updated = window.WS_APP.updateUser?.(form.dataset.userId, {
          login: data.get("login"),
          password: data.get("password"),
          role,
          citizenId: data.get("citizenId"),
          displayName: data.get("login"),
          accessTags: Array.from(form.querySelectorAll('[name="accessTags"]:checked')).map((option) => option.value),
          disabled: form.querySelector('[name="disabled"]')?.checked === true
        });
        appendAccessAudit(user, {
          action: updated ? "ACCESS_USER_UPDATED" : "ACCESS_USER_UPDATE_FAILED",
          target: form.dataset.userId,
          recordId: form.dataset.userId,
          citizenId: updated?.citizenId || "",
          summary: updated ? `Access user ${form.dataset.userId} updated.` : `Access user ${form.dataset.userId} update failed.`,
          resultCode: updated ? "ACCESS_USER_UPDATED" : "ACCESS_USER_UPDATE_FAILED",
          status: updated ? "SUCCEEDED" : "FAILED",
          meta: { role: updated?.role || role, disabled: updated?.disabled === true, accessTags: updated?.accessTags || [] }
        });
        window.WS_APP.renderAccessControlModule(user);
      });

      form.querySelector("[data-delete-user]")?.addEventListener("click", async () => {
        const confirmed = await (window.WS_APP.confirmAction?.({ title: "DELETE USER", message: "Delete this local login user?", confirmLabel: "Delete", tone: "danger" }) || Promise.resolve(false));
        if (!confirmed) return;
        const deleted = window.WS_APP.deleteUser?.(form.dataset.userId);
        appendAccessAudit(user, {
          action: deleted ? "ACCESS_USER_DELETED" : "ACCESS_USER_DELETE_FAILED",
          target: form.dataset.userId,
          recordId: form.dataset.userId,
          summary: deleted ? `Access user ${form.dataset.userId} deleted.` : `Access user ${form.dataset.userId} delete failed.`,
          resultCode: deleted ? "ACCESS_USER_DELETED" : "ACCESS_USER_DELETE_FAILED",
          status: deleted ? "SUCCEEDED" : "FAILED"
        });
        window.WS_APP.renderAccessControlModule(user);
      });
    });

    document.querySelectorAll(".access-tag-form").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const updated = window.WS_APP.updateAccessTag?.(form.dataset.accessTagId, {
          id: data.get("id"),
          label: data.get("label"),
          type: data.get("type"),
          rank: data.get("rank"),
          includes: data.get("includes"),
          exclusiveWith: data.get("exclusiveWith"),
          requiresExplicitAssignment: form.querySelector('[name="requiresExplicitAssignment"]')?.checked === true,
          adminOnly: form.querySelector('[name="adminOnly"]')?.checked === true,
          description: data.get("description"),
          archived: form.querySelector('[name="archived"]')?.checked === true
        });
        appendAccessAudit(user, {
          action: updated ? "ACCESS_TAG_UPDATED" : "ACCESS_TAG_UPDATE_FAILED",
          target: form.dataset.accessTagId,
          recordId: form.dataset.accessTagId,
          summary: updated ? `Access tag ${form.dataset.accessTagId} updated.` : `Access tag ${form.dataset.accessTagId} update failed.`,
          resultCode: updated ? "ACCESS_TAG_UPDATED" : "ACCESS_TAG_UPDATE_FAILED",
          status: updated ? "SUCCEEDED" : "FAILED",
          meta: { archived: updated?.archived === true, includes: updated?.includes || [], exclusiveWith: updated?.exclusiveWith || [] }
        });
        window.WS_APP.renderAccessControlModule(user);
      });

      form.querySelector("[data-delete-access-tag]")?.addEventListener("click", async () => {
        const confirmed = await (window.WS_APP.confirmAction?.({ title: "DELETE ACCESS TAG", message: "Delete this access tag?", confirmLabel: "Delete", tone: "danger" }) || Promise.resolve(false));
        if (!confirmed) return;
        const deleted = window.WS_APP.deleteAccessTag?.(form.dataset.accessTagId);
        appendAccessAudit(user, {
          action: deleted ? "ACCESS_TAG_DELETED" : "ACCESS_TAG_DELETE_FAILED",
          target: form.dataset.accessTagId,
          recordId: form.dataset.accessTagId,
          summary: deleted ? `Access tag ${form.dataset.accessTagId} deleted.` : `Access tag ${form.dataset.accessTagId} delete failed.`,
          resultCode: deleted ? "ACCESS_TAG_DELETED" : "ACCESS_TAG_DELETE_FAILED",
          status: deleted ? "SUCCEEDED" : "FAILED"
        });
        window.WS_APP.renderAccessControlModule(user);
      });
    });
  }

  function escapeHtmlLocal(value) {
    if (typeof window.WS_APP?.escapeHtml === "function") return window.WS_APP.escapeHtml(value);
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.WS_APP.initAccessControlStore();
})();
