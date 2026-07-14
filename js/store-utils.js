window.WS_APP = window.WS_APP || {};

(function initStoreUtilsModule() {
  const STORE_SORT_COUNTER_KEY = "ws_app_sort_counter_v1";
  const storedArrayCache = new Map();

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function readStoredArray(key) {
    try {
      const raw = window.localStorage.getItem(key);
      const cached = storedArrayCache.get(key);

      if (!raw) {
        if (cached?.raw === "") return cached.value;
        const empty = [];
        storedArrayCache.set(key, { raw: "", value: empty });
        return empty;
      }

      if (cached?.raw === raw) return cached.value;

      const parsed = JSON.parse(raw);
      const value = Array.isArray(parsed) ? parsed : [];
      storedArrayCache.set(key, { raw, value });
      return value;
    } catch (error) {
      console.warn(`W&S store could not read ${key}.`, error);
      return [];
    }
  }

  function writeStoredArray(key, value) {
    try {
      const safeValue = Array.isArray(value) ? value : [];
      const raw = JSON.stringify(safeValue);
      window.localStorage.setItem(key, raw);
      storedArrayCache.set(key, { raw, value: safeValue });
    } catch (error) {
      console.warn(`W&S store could not write ${key}.`, error);
    }
  }

  function clearStoredArrayCache(key = "") {
    const normalizedKey = String(key || "").trim();
    if (normalizedKey) {
      storedArrayCache.delete(normalizedKey);
      return;
    }
    storedArrayCache.clear();
  }

  window.addEventListener?.("storage", (event) => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key) storedArrayCache.delete(event.key);
    else storedArrayCache.clear();
  });

  function makeStoreId(prefix = "entry") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function getLocalCreatedAt(value = "") {
    const raw = String(value || "").trim();
    if (/^\d{10,}$/.test(raw)) {
      const numeric = Number(raw);
      if (Number.isFinite(numeric)) return new Date(numeric).toISOString();
    }
    if (raw && Number.isFinite(Date.parse(raw))) return new Date(raw).toISOString();
    return new Date().toISOString();
  }

  function extractTimestampFromStoreId(id = "") {
    const match = String(id || "").match(/-(\d{10,})-/);
    if (!match) return 0;
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : 0;
  }

  function getNextSortIndex() {
    try {
      const current = Number(window.localStorage.getItem(STORE_SORT_COUNTER_KEY) || 0);
      const next = Math.max(Number.isFinite(current) ? current : 0, Date.now()) + 1;
      window.localStorage.setItem(STORE_SORT_COUNTER_KEY, String(next));
      return next;
    } catch (error) {
      return Date.now();
    }
  }

  function resolveSortIndex(entry = {}, id = "") {
    const explicit = Number(entry?.sortIndex ?? entry?.entryOrder ?? entry?.orderIndex);
    if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
    const fromCreated = Date.parse(entry?.createdAt || "");
    if (Number.isFinite(fromCreated)) return fromCreated;
    const fromId = extractTimestampFromStoreId(id || entry?.id || "");
    if (fromId > 0) return fromId;
    return 0;
  }

  function compareStoreRecordsByNewest(a = {}, b = {}) {
    const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
    if (dateCompare) return dateCompare;
    const sortCompare = Number(b.sortIndex || 0) - Number(a.sortIndex || 0);
    if (sortCompare) return sortCompare;
    const createdCompare = String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    if (createdCompare) return createdCompare;
    return String(b.id || "").localeCompare(String(a.id || ""));
  }

  function compareStoreRecordsByOldest(a = {}, b = {}) {
    const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
    if (dateCompare) return dateCompare;
    const sortCompare = Number(a.sortIndex || 0) - Number(b.sortIndex || 0);
    if (sortCompare) return sortCompare;
    const createdCompare = String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    if (createdCompare) return createdCompare;
    return String(a.id || "").localeCompare(String(b.id || ""));
  }

  function normalizeDefinitionKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function clampInteger(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function parseCreditNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
    const cleaned = String(value || "")
      .replace(/[^0-9,.-]/g, "")
      .replace(/,/g, ".");
    const number = Number(cleaned);
    return Number.isFinite(number) ? Math.round(number) : 0;
  }

  function formatCreditNumber(value) {
    const rounded = Math.round(Number(value) || 0);
    const sign = rounded < 0 ? "-" : "";
    const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${sign}${digits} ₡`;
  }

  function formatCreditLabel(value) {
    return formatCreditNumber(parseCreditNumber(value));
  }

  function formatSignedCreditLabel(value, options = {}) {
    const amount = parseCreditNumber(value);
    if (amount > 0) return `+${formatCreditNumber(amount)}`;
    if (amount < 0) return formatCreditNumber(amount);
    return options.showZeroSign ? `+${formatCreditNumber(0)}` : formatCreditNumber(0);
  }

  function formatChangeCreditLabel(value) {
    return formatSignedCreditLabel(value, { showZeroSign: true });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function buildFinanceAccountRows(balanceBefore, balanceAfter) {
    const before = parseCreditNumber(balanceBefore);
    const after = parseCreditNumber(balanceAfter);
    return [
      { label: "Balance", value: formatCreditLabel(before) },
      { label: "Change", value: formatChangeCreditLabel(after - before) },
      { label: "Final balance", value: formatCreditLabel(after) }
    ];
  }

  window.WS_APP.storeUtils = {
    clone,
    readStoredArray,
    writeStoredArray,
    clearStoredArrayCache,
    makeStoreId,
    getLocalCreatedAt,
    extractTimestampFromStoreId,
    getNextSortIndex,
    resolveSortIndex,
    compareStoreRecordsByNewest,
    compareStoreRecordsByOldest,
    normalizeDefinitionKey,
    clampInteger,
    parseCreditNumber,
    parseCreditValue: parseCreditNumber,
    parseCredits: parseCreditNumber,
    formatCreditNumber,
    formatCreditLabel,
    formatCredits: formatCreditLabel,
    formatSignedCreditLabel,
    formatChangeCreditLabel,
    escapeHtml,
    buildFinanceAccountRows
  };

  window.WS_APP.formatCredits = formatCreditLabel;
  window.WS_APP.parseCredits = parseCreditNumber;
  window.WS_APP.parseCreditNumber = parseCreditNumber;
  window.WS_APP.parseCreditValue = parseCreditNumber;
  window.WS_APP.escapeHtml = escapeHtml;
})();
