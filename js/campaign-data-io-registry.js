window.WS_APP = window.WS_APP || {};

(function initCampaignDataIoRegistry(app) {
  "use strict";

  const CLASSIFICATIONS = Object.freeze({
    SEED_ONLY: "SEED_ONLY",
    DERIVED: "DERIVED",
    RUNTIME_PERSISTENT: "RUNTIME_PERSISTENT",
    CAMPAIGN_PERSISTENT: "CAMPAIGN_PERSISTENT",
    LOCAL_UI_ONLY: "LOCAL_UI_ONLY"
  });

  const adaptersById = new Map();

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function clone(value) {
    if (value == null) return value;
    if (typeof structuredClone === "function") {
      try { return structuredClone(value); } catch (error) {}
    }
    return JSON.parse(JSON.stringify(value));
  }

  function stableNormalize(value) {
    if (Array.isArray(value)) return value.map(stableNormalize);
    if (!value || typeof value !== "object") return value;
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = stableNormalize(value[key]);
        return result;
      }, {});
  }

  function stableSerialize(value) {
    return JSON.stringify(stableNormalize(value));
  }

  function checksumCampaignData(value) {
    const text = stableSerialize(value);
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
  }

  function parseRawValue(raw, format = "JSON") {
    if (raw == null) return null;
    if (String(format || "JSON").toUpperCase() === "TEXT") return String(raw);
    return JSON.parse(String(raw));
  }

  function getPath(source, path = "") {
    const parts = String(path || "").split(".").filter(Boolean);
    let current = source;
    for (const part of parts) {
      if (current == null || typeof current !== "object") return undefined;
      current = current[part];
    }
    return current;
  }

  function countRecordsFromSpecs(state = {}, specs = []) {
    let count = 0;
    const storage = state?.storage && typeof state.storage === "object" ? state.storage : {};
    specs.forEach((spec) => {
      const entry = storage[spec.key];
      if (!entry?.present) return;
      let parsed;
      try {
        parsed = parseRawValue(entry.value, spec.format);
      } catch (error) {
        return;
      }
      const paths = Array.isArray(spec.countPaths) ? spec.countPaths : [];
      if (!paths.length) {
        if (Array.isArray(parsed)) count += parsed.length;
        else if (parsed && typeof parsed === "object") count += 1;
        return;
      }
      paths.forEach((path) => {
        const value = getPath(parsed, path);
        if (Array.isArray(value)) count += value.length;
        else if (value && typeof value === "object") count += Object.keys(value).length;
        else if (value != null) count += 1;
      });
    });
    return count;
  }

  function normalizeStorageSpecs(specs = []) {
    const seen = new Set();
    return (Array.isArray(specs) ? specs : []).map((spec) => {
      const key = normalizeId(typeof spec === "string" ? spec : spec?.key);
      if (!key) throw new Error("CAMPAIGN_DATA_STORAGE_KEY_REQUIRED");
      if (seen.has(key)) throw new Error(`CAMPAIGN_DATA_STORAGE_KEY_DUPLICATE:${key}`);
      seen.add(key);
      return {
        key,
        format: String(spec?.format || "JSON").toUpperCase() === "TEXT" ? "TEXT" : "JSON",
        countPaths: Array.isArray(spec?.countPaths) ? [...spec.countPaths] : []
      };
    });
  }

  function validateStorageState(state = {}, specs = []) {
    const errors = [];
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      return [{ code: "SNAPSHOT_DOMAIN_STATE_INVALID", message: "Domain state must be an object." }];
    }
    const storage = state.storage;
    if (!storage || typeof storage !== "object" || Array.isArray(storage)) {
      return [{ code: "SNAPSHOT_DOMAIN_STORAGE_INVALID", message: "Domain state.storage must be an object." }];
    }
    const allowed = new Set(specs.map((spec) => spec.key));
    Object.keys(storage).forEach((key) => {
      if (!allowed.has(key)) errors.push({ code: "SNAPSHOT_DOMAIN_STORAGE_KEY_UNSUPPORTED", key });
    });
    specs.forEach((spec) => {
      const entry = storage[spec.key];
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        errors.push({ code: "SNAPSHOT_DOMAIN_STORAGE_ENTRY_REQUIRED", key: spec.key });
        return;
      }
      if (typeof entry.present !== "boolean") {
        errors.push({ code: "SNAPSHOT_DOMAIN_STORAGE_PRESENCE_INVALID", key: spec.key });
        return;
      }
      if (!entry.present) {
        if (entry.value != null && entry.value !== "") errors.push({ code: "SNAPSHOT_DOMAIN_STORAGE_ABSENT_VALUE", key: spec.key });
        return;
      }
      if (typeof entry.value !== "string") {
        errors.push({ code: "SNAPSHOT_DOMAIN_STORAGE_VALUE_INVALID", key: spec.key });
        return;
      }
      if (spec.format === "JSON") {
        try { JSON.parse(entry.value); }
        catch (error) { errors.push({ code: "SNAPSHOT_DOMAIN_STORAGE_JSON_INVALID", key: spec.key }); }
      }
    });
    return errors;
  }

  function applyStorageState(state = {}, specs = []) {
    const storage = state.storage || {};
    specs.forEach((spec) => {
      const entry = storage[spec.key];
      if (entry?.present) window.localStorage.setItem(spec.key, entry.value);
      else window.localStorage.removeItem(spec.key);
    });
    return true;
  }

  function createLocalStorageCampaignDataAdapter(definition = {}) {
    const domainId = normalizeId(definition.domainId);
    if (!domainId) throw new Error("CAMPAIGN_DATA_DOMAIN_ID_REQUIRED");
    const specs = normalizeStorageSpecs(definition.storageKeys || []);
    const classification = CLASSIFICATIONS[definition.classification] || definition.classification || CLASSIFICATIONS.CAMPAIGN_PERSISTENT;
    const schemaVersion = normalizeId(definition.schemaVersion || "1");

    return {
      domainId,
      schemaVersion,
      classification,
      required: definition.required === true,
      description: normalizeId(definition.description),
      storageKeys: specs.map((spec) => spec.key),
      exportState() {
        const storage = {};
        specs.forEach((spec) => {
          const value = window.localStorage.getItem(spec.key);
          storage[spec.key] = value == null
            ? { present: false, value: null }
            : { present: true, value: String(value) };
        });
        return { storage };
      },
      validateState(state = {}) {
        const errors = validateStorageState(state, specs);
        if (typeof definition.validateState === "function") {
          const custom = definition.validateState(clone(state), { parseRawValue, getPath }) || [];
          (Array.isArray(custom) ? custom : [custom]).filter(Boolean).forEach((error) => errors.push(error));
        }
        return { ok: errors.length === 0, errors };
      },
      stageImport(state = {}) {
        const validation = this.validateState(state);
        if (!validation.ok) return { ok: false, errors: validation.errors, staged: null };
        return { ok: true, errors: [], staged: clone(state) };
      },
      commitImport(staged = {}) {
        applyStorageState(staged, specs);
        return { ok: true, reloadRequired: true };
      },
      restoreBackup(staged = {}) {
        applyStorageState(staged, specs);
        return { ok: true, reloadRequired: true };
      },
      resetState() {
        specs.forEach((spec) => window.localStorage.removeItem(spec.key));
        return { ok: true, reloadRequired: true };
      },
      reconcileState() {
        const current = this.exportState();
        const validation = this.validateState(current);
        return { ok: validation.ok, errors: validation.errors, reloadRequired: true };
      },
      summarizeState(state = {}) {
        if (typeof definition.summarizeState === "function") {
          return definition.summarizeState(clone(state), { parseRawValue, getPath, countRecordsFromSpecs }) || { recordCount: 0 };
        }
        return { recordCount: countRecordsFromSpecs(state, specs) };
      }
    };
  }

  function validateAdapter(adapter = {}) {
    const requiredFunctions = [
      "exportState",
      "validateState",
      "stageImport",
      "commitImport",
      "restoreBackup",
      "resetState",
      "reconcileState",
      "summarizeState"
    ];
    const errors = [];
    const domainId = normalizeId(adapter.domainId);
    if (!domainId) errors.push({ code: "CAMPAIGN_DATA_DOMAIN_ID_REQUIRED" });
    if (!normalizeId(adapter.schemaVersion)) errors.push({ code: "CAMPAIGN_DATA_DOMAIN_SCHEMA_REQUIRED", domainId });
    if (!Object.values(CLASSIFICATIONS).includes(adapter.classification)) errors.push({ code: "CAMPAIGN_DATA_DOMAIN_CLASSIFICATION_INVALID", domainId });
    requiredFunctions.forEach((name) => {
      if (typeof adapter[name] !== "function") errors.push({ code: "CAMPAIGN_DATA_DOMAIN_API_REQUIRED", domainId, api: name });
    });
    return errors;
  }

  function registerCampaignDataDomainAdapter(adapter = {}) {
    const errors = validateAdapter(adapter);
    if (errors.length) return { ok: false, errors };
    const domainId = normalizeId(adapter.domainId);
    if (adaptersById.has(domainId)) return { ok: false, errors: [{ code: "CAMPAIGN_DATA_DOMAIN_DUPLICATE", domainId }] };
    adaptersById.set(domainId, adapter);
    return { ok: true, domainId };
  }

  function getCampaignDataDomainAdapter(domainId = "") {
    return adaptersById.get(normalizeId(domainId)) || null;
  }

  function getCampaignDataDomainAdapters(options = {}) {
    const classification = normalizeId(options.classification);
    return Array.from(adaptersById.values())
      .filter((adapter) => !classification || adapter.classification === classification)
      .sort((left, right) => left.domainId.localeCompare(right.domainId));
  }

  function getCampaignDataIoRegistryDiagnostics() {
    const errors = [];
    const storageOwners = new Map();
    getCampaignDataDomainAdapters().forEach((adapter) => {
      validateAdapter(adapter).forEach((error) => errors.push(error));
      (Array.isArray(adapter.storageKeys) ? adapter.storageKeys : []).forEach((key) => {
        const owner = storageOwners.get(key);
        if (owner && owner !== adapter.domainId) errors.push({ code: "CAMPAIGN_DATA_STORAGE_KEY_OWNERSHIP_CONFLICT", key, domainIds: [owner, adapter.domainId] });
        storageOwners.set(key, adapter.domainId);
      });
    });
    return {
      ready: errors.length === 0,
      adapterCount: adaptersById.size,
      campaignPersistentCount: getCampaignDataDomainAdapters({ classification: CLASSIFICATIONS.CAMPAIGN_PERSISTENT }).length,
      classifications: Object.values(CLASSIFICATIONS).reduce((result, classification) => {
        result[classification] = getCampaignDataDomainAdapters({ classification }).length;
        return result;
      }, {}),
      errors
    };
  }

  Object.assign(app, {
    CAMPAIGN_DATA_DOMAIN_CLASSIFICATIONS: CLASSIFICATIONS,
    stableSerializeCampaignData: stableSerialize,
    checksumCampaignData,
    createLocalStorageCampaignDataAdapter,
    registerCampaignDataDomainAdapter,
    getCampaignDataDomainAdapter,
    getCampaignDataDomainAdapters,
    getCampaignDataIoRegistryDiagnostics
  });
})(window.WS_APP);
