window.WS_APP = window.WS_APP || {};

(function initTerminalEntryStoreFactory() {
  const STORAGE_KEY = "ws_app_terminal_entries_v1";

  function createTerminalEntryStore(dependencies = {}) {
    const {
      clone,
      readStoredArray,
      writeStoredArray,
      makeStoreId,
      getLocalCreatedAt,
      getNextSortIndex,
      resolveSortIndex,
      compareStoreRecordsByNewest,
      normalizeEntry,
      normalizeToken
    } = dependencies;

    const required = {
      clone,
      readStoredArray,
      writeStoredArray,
      makeStoreId,
      getLocalCreatedAt,
      getNextSortIndex,
      resolveSortIndex,
      compareStoreRecordsByNewest,
      normalizeEntry,
      normalizeToken
    };
    const missing = Object.entries(required)
      .filter(([, value]) => typeof value !== "function")
      .map(([name]) => name);
    if (missing.length) throw new Error(`Terminal Entry Store dependencies missing: ${missing.join(", ")}`);

    let normalizedCache = null;

    function readEntries() {
      const raw = readStoredArray(STORAGE_KEY);
      if (normalizedCache?.raw === raw) return normalizedCache.value;
      const normalized = (Array.isArray(raw) ? raw : []).map((entry, index) => {
        const stableSortIndex = resolveSortIndex(entry, entry?.id || "") || (index + 1);
        return normalizeEntry({
          ...entry,
          sortIndex: entry?.sortIndex || stableSortIndex
        });
      });
      normalizedCache = { raw, value: normalized };
      return normalized;
    }

    function applyRetention(entries = []) {
      const maxPerCitizen = 500;
      const counts = new Map();
      const retainedReversed = [];

      [...entries].reverse().forEach((entry) => {
        const key = String(entry?.citizenId || "__UNASSIGNED__").trim() || "__UNASSIGNED__";
        const count = counts.get(key) || 0;
        if (count >= maxPerCitizen) return;
        counts.set(key, count + 1);
        retainedReversed.push(entry);
      });

      return retainedReversed.reverse();
    }

    function writeEntries(entries) {
      const normalized = applyRetention((Array.isArray(entries) ? entries : []).map(normalizeEntry));
      normalizedCache = null;
      writeStoredArray(STORAGE_KEY, normalized);
      window.dispatchEvent(new CustomEvent("ws:terminal-entries-updated", { detail: { entries: clone(normalized) } }));
      window.WS_APP.syncTerminalUnreadLabels?.();
      return normalized;
    }

    function matchesAudience(entry = {}, requestedAudience = "PLAYER") {
      const requested = normalizeToken(requestedAudience, "PLAYER");
      const audience = Array.isArray(entry?.audience) ? entry.audience : [entry?.audience || "PLAYER"];
      const normalizedAudience = audience.map((item) => normalizeToken(item, "PLAYER"));
      if (requested === "ALL") return true;
      if (normalizedAudience.includes("BOTH")) return requested === "PLAYER" || requested === "ADMIN";
      return normalizedAudience.includes(requested);
    }

    function getEntries(citizenId, options = {}) {
      const id = String(citizenId || "").trim();
      const folder = String(options.folder || "INBOX").trim().toUpperCase() === "TRASH" ? "TRASH" : "INBOX";
      const requestedAudience = options.includeAllAudiences === true ? "ALL" : String(options.audience || "PLAYER").trim().toUpperCase();
      const entries = readEntries().filter((entry) => (
        id &&
        entry.citizenId === id &&
        entry.folder === folder &&
        matchesAudience(entry, requestedAudience)
      ));

      return clone(entries.sort((a, b) => {
        if (a.important !== b.important) return a.important ? -1 : 1;
        return compareStoreRecordsByNewest(a, b);
      }));
    }

    function countUnread(citizenId) {
      return getEntries(citizenId, { folder: "INBOX", audience: "PLAYER" }).filter((entry) => entry.read !== true).length;
    }

    function addEntry(citizenId, entry = {}) {
      const id = String(citizenId || entry.citizenId || "").trim();
      if (!id) return null;

      const entries = readEntries();
      const normalized = normalizeEntry({
        ...clone(entry),
        citizenId: id,
        id: entry.id || makeStoreId("entry"),
        createdAt: entry.createdAt || getLocalCreatedAt(),
        sortIndex: entry.sortIndex || getNextSortIndex(),
        read: entry.read === true
      });

      entries.push(normalized);
      writeEntries(entries);
      return clone(normalized);
    }

    function upsertEntry(citizenId, entry = {}, options = {}) {
      const id = String(citizenId || entry.citizenId || "").trim();
      if (!id) return { ok: false, error: { code: "CITIZEN_ID_REQUIRED" } };

      const entries = readEntries();
      const eventId = String(entry.eventId || "").trim();
      const dedupeKey = String(entry.dedupeKey || "").trim();
      const existingIndex = entries.findIndex((record) => (
        record.citizenId === id &&
        ((eventId && record.eventId === eventId) || (dedupeKey && record.dedupeKey === dedupeKey))
      ));

      if (existingIndex < 0) {
        const created = addEntry(id, entry);
        return created
          ? { ok: true, operation: "CREATED", notificationId: created.id, entry: created }
          : { ok: false, error: { code: "TERMINAL_ENTRY_WRITE_FAILED" } };
      }

      const existing = entries[existingIndex];
      const incomingRevision = Math.max(1, Number(entry.revision || 1) || 1);
      const existingRevision = Math.max(1, Number(existing.revision || 1) || 1);
      if (incomingRevision <= existingRevision) {
        return {
          ok: true,
          operation: "IGNORED_DUPLICATE",
          notificationId: existing.id,
          entry: clone(existing)
        };
      }

      const markUnreadOnUpdate = options.markUnreadOnUpdate !== false;
      const hasIncomingLifecycleStatus = String(entry?.lifecycle?.status || "").trim() !== "";
      const nextLifecycle = {
        ...(existing.lifecycle || {}),
        ...(entry.lifecycle || {}),
        ...(markUnreadOnUpdate && !hasIncomingLifecycleStatus
          ? {
            status: "NEW",
            readAt: "",
            acknowledgedAt: "",
            resolvedAt: "",
            expiredAt: "",
            archivedAt: ""
          }
          : {})
      };
      const merged = normalizeEntry({
        ...existing,
        ...clone(entry),
        id: existing.id,
        citizenId: id,
        createdAt: existing.createdAt,
        sortIndex: existing.sortIndex,
        folder: existing.folder,
        read: markUnreadOnUpdate ? false : existing.read,
        important: Object.prototype.hasOwnProperty.call(entry || {}, "important") ? entry.important : existing.important,
        userFlags: {
          ...(existing.userFlags || {}),
          ...(entry.userFlags || {})
        },
        lifecycle: nextLifecycle,
        revision: incomingRevision
      });

      entries[existingIndex] = merged;
      writeEntries(entries);
      return {
        ok: true,
        operation: "UPDATED_EXISTING",
        notificationId: merged.id,
        entry: clone(merged)
      };
    }

    function updateEntryById(citizenId, entryId, changes = {}) {
      const id = String(citizenId || "").trim();
      const targetId = String(entryId || "").trim();
      if (!id || !targetId) return null;

      const entries = readEntries();
      const index = entries.findIndex((entry) => entry.citizenId === id && entry.id === targetId);
      if (index < 0) return null;

      const existing = entries[index];
      const merged = normalizeEntry({
        ...existing,
        ...clone(changes),
        id: existing.id,
        citizenId: existing.citizenId,
        createdAt: existing.createdAt,
        sortIndex: existing.sortIndex,
        lifecycle: {
          ...(existing.lifecycle || {}),
          ...(changes.lifecycle || {})
        },
        userFlags: {
          ...(existing.userFlags || {}),
          ...(changes.userFlags || {})
        }
      });
      entries[index] = merged;
      writeEntries(entries);
      return clone(merged);
    }

    function mapEntry(citizenId, entryId, mutator) {
      const id = String(citizenId || "").trim();
      const target = String(entryId || "").trim();
      if (!id || !target || typeof mutator !== "function") return false;

      let changed = false;
      const entries = readEntries().map((entry) => {
        if (entry.citizenId !== id || entry.id !== target) return entry;
        const next = mutator(entry);
        if (!next) return entry;
        changed = true;
        return normalizeEntry(next);
      });

      if (!changed) return false;
      writeEntries(entries);
      return true;
    }

    function markEntryRead(citizenId, entryId, read = true) {
      return mapEntry(citizenId, entryId, (entry) => ({ ...entry, read: read === true }));
    }

    function markAllRead(citizenId) {
      const id = String(citizenId || "").trim();
      if (!id) return 0;
      let changed = 0;
      const entries = readEntries().map((entry) => {
        if (entry.citizenId === id && entry.folder === "INBOX" && entry.read !== true) {
          changed += 1;
          return normalizeEntry({ ...entry, read: true });
        }
        return entry;
      });
      if (changed) writeEntries(entries);
      return changed;
    }

    function setImportant(citizenId, entryId, important = true) {
      return mapEntry(citizenId, entryId, (entry) => ({ ...entry, important: important === true }));
    }

    function moveToTrash(citizenId, entryId) {
      return mapEntry(citizenId, entryId, (entry) => ({ ...entry, folder: "TRASH", read: true }));
    }

    function restoreFromTrash(citizenId, entryId) {
      return mapEntry(citizenId, entryId, (entry) => ({ ...entry, folder: "INBOX" }));
    }

    function deleteEntry(citizenId, entryId) {
      const id = String(citizenId || "").trim();
      const target = String(entryId || "").trim();
      if (!id || !target) return false;
      const entries = readEntries();
      const next = entries.filter((entry) => !(entry.citizenId === id && entry.id === target && entry.folder === "TRASH"));
      if (next.length === entries.length) return false;
      writeEntries(next);
      return true;
    }

    function emptyTrash(citizenId) {
      const id = String(citizenId || "").trim();
      if (!id) return 0;
      const entries = readEntries();
      const next = entries.filter((entry) => !(entry.citizenId === id && entry.folder === "TRASH"));
      const removed = entries.length - next.length;
      if (removed > 0) writeEntries(next);
      return removed;
    }

    function moveReadToTrash(citizenId) {
      const id = String(citizenId || "").trim();
      if (!id) return 0;
      let moved = 0;
      const entries = readEntries().map((entry) => {
        if (entry.citizenId === id && entry.folder === "INBOX" && entry.read === true) {
          moved += 1;
          return normalizeEntry({ ...entry, folder: "TRASH", read: true });
        }
        return entry;
      });
      if (moved > 0) writeEntries(entries);
      return moved;
    }

    function restoreAllFromTrash(citizenId) {
      const id = String(citizenId || "").trim();
      if (!id) return 0;
      let restored = 0;
      const entries = readEntries().map((entry) => {
        if (entry.citizenId === id && entry.folder === "TRASH") {
          restored += 1;
          return normalizeEntry({ ...entry, folder: "INBOX" });
        }
        return entry;
      });
      if (restored > 0) writeEntries(entries);
      return restored;
    }

    function updateBulk(citizenId, entryIds = [], action = "MARK_READ") {
      const id = String(citizenId || "").trim();
      const targets = new Set((Array.isArray(entryIds) ? entryIds : [])
        .map((entryId) => String(entryId || "").trim())
        .filter(Boolean));
      const normalizedAction = String(action || "MARK_READ").trim().toUpperCase();
      if (!id || !targets.size) return 0;

      const sourceEntries = readEntries();
      let changed = 0;

      if (normalizedAction === "DELETE") {
        const nextEntries = sourceEntries.filter((entry) => {
          const remove = entry.citizenId === id && targets.has(entry.id) && entry.folder === "TRASH";
          if (remove) changed += 1;
          return !remove;
        });
        if (changed) writeEntries(nextEntries);
        return changed;
      }

      const nextEntries = sourceEntries.map((entry) => {
        if (entry.citizenId !== id || !targets.has(entry.id)) return entry;
        if (normalizedAction === "RESTORE" && entry.folder !== "TRASH") return entry;
        if (normalizedAction === "TRASH" && entry.folder !== "INBOX") return entry;

        let nextEntry = entry;
        if (normalizedAction === "MARK_READ") nextEntry = { ...entry, read: true };
        else if (normalizedAction === "MARK_UNREAD") nextEntry = { ...entry, read: false };
        else if (normalizedAction === "MARK_IMPORTANT") nextEntry = { ...entry, important: true };
        else if (normalizedAction === "UNMARK_IMPORTANT") nextEntry = { ...entry, important: false };
        else if (normalizedAction === "TRASH") nextEntry = { ...entry, folder: "TRASH", read: true };
        else if (normalizedAction === "RESTORE") nextEntry = { ...entry, folder: "INBOX" };
        else return entry;

        changed += 1;
        return normalizeEntry(nextEntry);
      });

      if (changed) writeEntries(nextEntries);
      return changed;
    }

    function importEntries(entries) {
      if (!Array.isArray(entries)) return null;
      const normalized = entries.map(normalizeEntry).filter((entry) => entry.citizenId && entry.id);
      writeEntries(normalized);
      return clone(normalized);
    }

    const api = Object.freeze({
      storageKey: STORAGE_KEY,
      normalizeEntry,
      readEntries,
      writeEntries,
      getEntries,
      countUnread,
      addEntry,
      upsertEntry,
      updateEntryById,
      markEntryRead,
      markAllRead,
      setImportant,
      moveToTrash,
      restoreFromTrash,
      deleteEntry,
      emptyTrash,
      moveReadToTrash,
      restoreAllFromTrash,
      updateBulk,
      importEntries
    });

    window.WS_APP.TerminalEntryStore = api;
    window.WS_APP.getTerminalEntries = getEntries;
    window.WS_APP.countUnreadTerminalEntries = countUnread;
    window.WS_APP.addTerminalEntry = addEntry;
    window.WS_APP.upsertTerminalEntry = upsertEntry;
    window.WS_APP.updateTerminalEntryById = updateEntryById;
    window.WS_APP.markTerminalEntryRead = markEntryRead;
    window.WS_APP.markAllTerminalEntriesRead = markAllRead;
    window.WS_APP.setTerminalEntryImportant = setImportant;
    window.WS_APP.moveTerminalEntryToTrash = moveToTrash;
    window.WS_APP.restoreTerminalEntryFromTrash = restoreFromTrash;
    window.WS_APP.deleteTerminalEntry = deleteEntry;
    window.WS_APP.emptyTerminalTrash = emptyTrash;
    window.WS_APP.moveReadTerminalEntriesToTrash = moveReadToTrash;
    window.WS_APP.restoreAllTerminalEntriesFromTrash = restoreAllFromTrash;
    window.WS_APP.updateTerminalEntriesBulk = updateBulk;
    window.WS_APP.importTerminalEntries = importEntries;
    return api;
  }

  window.WS_APP.createTerminalEntryStore = createTerminalEntryStore;
})();
