window.WS_APP = window.WS_APP || {};

(function initAddressStoreModule() {
  const STORAGE_KEY = "ws_app_addresses_v1";
  let addressStore = [];

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function slugify(value) {
    const base = String(value || "address")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);

    return base || "address";
  }

  function uniqueId(seed) {
    const base = slugify(seed || "address-record");
    const existing = new Set(addressStore.map((record) => record.id));

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

  function extractShortId(value) {
    const source = String(value || "").trim();
    const match = source.match(/(\d{8}\.[A-Z0-9]+)$/i) || source.match(/(\d{8}\.[A-Z0-9]+)/i);
    return match ? match[1].toUpperCase() : "";
  }

  function normalizeAddress(record = {}) {
    const normalized = clone(record || {});
    const now = new Date().toISOString();

    normalized.label = String(normalized.label || "Address Record").trim();
    normalized.id = String(normalized.id || uniqueId(normalized.label || "address-record")).trim();
    normalized.type = String(normalized.type || "LOCATION").trim().toUpperCase();
    normalized.clearance = normalizeClearance(normalized.clearance);
    normalized.tags = parseList(normalized.tags);
    normalized.cityCode = String(normalized.cityCode || "03").trim().toUpperCase();
    normalized.geoAddress = String(normalized.geoAddress || "51N00E").trim().toUpperCase();
    normalized.networkId = String(normalized.networkId || "002").trim().toUpperCase();
    normalized.controlCode = String(normalized.controlCode || "109").trim().toUpperCase();
    normalized.chunk = String(normalized.chunk || "A4").trim().toUpperCase();
    normalized.building = String(normalized.building || "001").trim().toUpperCase();
    normalized.cell = String(normalized.cell || "001").trim().toUpperCase();
    normalized.visibleAddress = String(normalized.visibleAddress || "").trim().toUpperCase();
    normalized.birthChunk = String(normalized.birthChunk || "0A04").trim().toUpperCase();
    normalized.birthDate = String(normalized.birthDate || "20720121").trim();
    normalized.randomBlock = String(normalized.randomBlock || "").trim().toUpperCase();
    normalized.citizenId = String(normalized.citizenId || "").trim().toUpperCase();
    normalized.shortId = String(normalized.shortId || extractShortId(normalized.citizenId)).trim().toUpperCase();
    normalized.latTrace = String(normalized.latTrace || "51N3410").trim().toUpperCase();
    normalized.lonTrace = String(normalized.lonTrace || "00E2131").trim().toUpperCase();
    normalized.dateCode = String(normalized.dateCode || "21090101").trim();
    normalized.timeCode = String(normalized.timeCode || "2137").trim();
    normalized.sessionToken = String(normalized.sessionToken || "K7X9Q2").trim().toUpperCase();
    normalized.packetSignature = String(normalized.packetSignature || "F91A").trim().toUpperCase();
    normalized.trace = String(normalized.trace || "").trim().toUpperCase();
    normalized.note = String(normalized.note || "").trim();
    normalized.gmNote = String(normalized.gmNote || "").trim();
    normalized.archived = normalized.archived === true;
    normalized.updatedAt = normalized.updatedAt || now;
    normalized.createdAt = normalized.createdAt || normalized.updatedAt;

    return normalized;
  }

  function normalizeAddresses(records) {
    return (Array.isArray(records) ? records : [])
      .filter(Boolean)
      .map((record) => normalizeAddress(record));
  }

  function readBaseAddresses() {
    return normalizeAddresses(window.APP_DATA?.addresses || []);
  }

  function readStoredAddresses() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? normalizeAddresses(parsed) : null;
    } catch (error) {
      console.warn("W&S address store could not read localStorage.", error);
      return null;
    }
  }

  function mergeBaseAddresses(storedRecords) {
    const baseRecords = readBaseAddresses();
    if (!storedRecords) return baseRecords;

    const merged = clone(storedRecords);
    const existingIds = new Set(merged.map((record) => record.id));
    let changed = false;

    baseRecords.forEach((record) => {
      if (existingIds.has(record.id)) return;
      merged.push(record);
      existingIds.add(record.id);
      changed = true;
    });

    if (changed) writeStoredAddresses(merged);
    return merged;
  }

  function writeStoredAddresses(records) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.warn("W&S address store could not write localStorage.", error);
    }
  }

  function emitAddressUpdate(detail = {}) {
    window.dispatchEvent(new CustomEvent("ws:addresses-updated", { detail }));
  }

  function save() {
    writeStoredAddresses(addressStore);
    emitAddressUpdate({ addresses: clone(addressStore) });
  }

  window.WS_APP.extractShortIdFromCitizenId = function extractShortIdFromCitizenId(value) {
    return extractShortId(value);
  };

  window.WS_APP.initAddressStore = function initAddressStore() {
    const storedAddresses = readStoredAddresses();
    addressStore = mergeBaseAddresses(storedAddresses);
    return window.WS_APP.getAddresses({ includeArchived: true });
  };

  window.WS_APP.getAddresses = function getAddresses(options = {}) {
    const includeArchived = options.includeArchived === true;
    const records = includeArchived ? addressStore : addressStore.filter((record) => !record.archived);
    return clone(records);
  };

  window.WS_APP.getAddressById = function getAddressById(id) {
    const record = addressStore.find((item) => item.id === id);
    return record ? clone(record) : null;
  };

  window.WS_APP.createAddress = function createAddress(data = {}) {
    const now = new Date().toISOString();
    const record = normalizeAddress({
      ...data,
      id: data.id || uniqueId(data.label || data.visibleAddress || "address-record"),
      createdAt: now,
      updatedAt: now
    });

    addressStore.push(record);
    save();
    return clone(record);
  };

  window.WS_APP.updateAddress = function updateAddress(id, patch = {}) {
    const index = addressStore.findIndex((record) => record.id === id);
    if (index < 0) return null;

    const updated = normalizeAddress({
      ...addressStore[index],
      ...clone(patch),
      id: addressStore[index].id,
      createdAt: addressStore[index].createdAt,
      updatedAt: new Date().toISOString()
    });

    addressStore.splice(index, 1, updated);
    save();
    return clone(updated);
  };

  window.WS_APP.archiveAddress = function archiveAddress(id) {
    return window.WS_APP.updateAddress(id, { archived: true });
  };

  window.WS_APP.restoreAddress = function restoreAddress(id) {
    return window.WS_APP.updateAddress(id, { archived: false });
  };

  window.WS_APP.deleteAddress = function deleteAddress(id) {
    const index = addressStore.findIndex((record) => record.id === id);
    if (index < 0) return false;
    const [deleted] = addressStore.splice(index, 1);
    save();
    emitAddressUpdate({ deleted: true, id, address: clone(deleted) });
    return true;
  };

  window.WS_APP.importAddresses = function importAddresses(records) {
    if (!Array.isArray(records)) return null;
    addressStore = normalizeAddresses(records);
    save();
    return window.WS_APP.getAddresses({ includeArchived: true });
  };

  window.WS_APP.resetAddressStore = function resetAddressStore() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("W&S address store could not clear localStorage.", error);
    }

    addressStore = readBaseAddresses();
    emitAddressUpdate({ reset: true });
    return window.WS_APP.getAddresses({ includeArchived: true });
  };

  window.WS_APP.initAddressStore();
})();
