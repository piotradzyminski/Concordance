window.WS_APP = window.WS_APP || {};

(function initTerminalReminderStoreFactory() {
  const STORAGE_KEY = "ws_app_calendar_reminders_v1";

  function createTerminalReminderStore(dependencies = {}) {
    const {
      clone,
      readStoredArray,
      writeStoredArray,
      makeStoreId,
      parseCreditNumber,
      getTerminalDateIso,
      isIsoDate,
      addDaysIso,
      compareIsoDates,
      getCitizenById,
      emitCalendarNotification
    } = dependencies;

    const required = {
      clone,
      readStoredArray,
      writeStoredArray,
      makeStoreId,
      parseCreditNumber,
      getTerminalDateIso,
      isIsoDate,
      addDaysIso,
      compareIsoDates,
      getCitizenById,
      emitCalendarNotification
    };
    const missing = Object.entries(required)
      .filter(([, value]) => typeof value !== "function")
      .map(([name]) => name);
    if (missing.length) throw new Error(`Terminal Reminder Store dependencies missing: ${missing.join(", ")}`);

    let normalizedCache = null;

    function normalizeReminder(reminder = {}) {
      return {
        id: String(reminder?.id || makeStoreId("reminder")).trim(),
        citizenId: String(reminder?.citizenId || "").trim(),
        title: String(reminder?.title || "Calendar reminder").trim(),
        body: String(reminder?.body || "").trim(),
        date: isIsoDate(reminder?.date) ? String(reminder.date).trim() : getTerminalDateIso(),
        notifyDaysBefore: Math.max(0, Math.min(365, parseCreditNumber(reminder?.notifyDaysBefore))),
        colorIndex: Math.max(0, Math.min(5, parseCreditNumber(reminder?.colorIndex))),
        status: String(reminder?.status || "ACTIVE").trim().toUpperCase(),
        notifiedAt: String(reminder?.notifiedAt || "").trim(),
        createdBy: String(reminder?.createdBy || window.WS_APP.currentUser?.login || "SYSTEM").trim()
      };
    }

    function readReminders() {
      const raw = readStoredArray(STORAGE_KEY);
      if (normalizedCache?.raw === raw) return normalizedCache.value;
      const normalized = (Array.isArray(raw) ? raw : []).map(normalizeReminder);
      normalizedCache = { raw, value: normalized };
      return normalized;
    }

    function writeReminders(reminders) {
      const normalized = (Array.isArray(reminders) ? reminders : []).map(normalizeReminder).slice(-400);
      normalizedCache = null;
      writeStoredArray(STORAGE_KEY, normalized);
      window.dispatchEvent(new CustomEvent("ws:calendar-reminders-updated", { detail: { reminders: clone(normalized) } }));
      return normalized;
    }

    function getReminders(citizenId, options = {}) {
      const id = String(citizenId || "").trim();
      const includeClosed = options.includeClosed === true;
      return clone(readReminders()
        .filter((reminder) => id && reminder.citizenId === id)
        .filter((reminder) => includeClosed || reminder.status !== "CLOSED")
        .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.id || "").localeCompare(String(b.id || ""))));
    }

    function createReminder(citizenId, data = {}) {
      const id = String(citizenId || data.citizenId || "").trim();
      const citizen = getCitizenById(id);
      if (!id || !citizen || citizen.recordType === "admin") return null;

      const reminder = normalizeReminder({
        ...clone(data),
        id: data.id || makeStoreId("reminder"),
        citizenId: id,
        status: "ACTIVE",
        createdBy: data.createdBy || window.WS_APP.currentUser?.login || "LOCAL USER"
      });

      if (!reminder.title || !isIsoDate(reminder.date)) return null;
      const reminders = readReminders();
      reminders.push(reminder);
      writeReminders(reminders);

      emitCalendarNotification(id, reminder, {
        subtype: "CALENDAR_REMINDER_REGISTERED",
        title: "Calendar reminder registered",
        createdBy: "SYSTEM"
      });

      processReminders(getTerminalDateIso());
      return clone(reminder);
    }

    function closeReminder(citizenId, reminderId) {
      const id = String(citizenId || "").trim();
      const target = String(reminderId || "").trim();
      if (!id || !target) return false;

      let changed = false;
      const reminders = readReminders().map((reminder) => {
        if (reminder.citizenId === id && reminder.id === target) {
          changed = true;
          return normalizeReminder({ ...reminder, status: "CLOSED" });
        }
        return reminder;
      });
      if (!changed) return false;
      writeReminders(reminders);
      return true;
    }

    function processReminders(campaignDateIso = getTerminalDateIso()) {
      const currentIso = isIsoDate(campaignDateIso) ? campaignDateIso : getTerminalDateIso();
      let created = 0;
      let changed = false;
      const reminders = readReminders().map((reminder) => {
        if (reminder.status !== "ACTIVE" || reminder.notifiedAt) return reminder;
        const notifyIso = addDaysIso(reminder.date, -reminder.notifyDaysBefore);
        if (compareIsoDates(currentIso, notifyIso) < 0) return reminder;

        emitCalendarNotification(reminder.citizenId, reminder, {
          subtype: "CALENDAR_REMINDER_TRIGGERED",
          title: `Reminder: ${reminder.title}`,
          createdBy: "CALENDAR"
        });
        created += 1;
        changed = true;
        return normalizeReminder({ ...reminder, notifiedAt: currentIso });
      });

      if (changed) writeReminders(reminders);
      return { ok: true, created };
    }

    function importReminders(reminders) {
      if (!Array.isArray(reminders)) return null;
      const normalized = reminders.map(normalizeReminder).filter((reminder) => reminder.citizenId && reminder.id);
      writeReminders(normalized);
      return clone(normalized);
    }

    const api = Object.freeze({
      storageKey: STORAGE_KEY,
      normalizeReminder,
      readReminders,
      writeReminders,
      getReminders,
      createReminder,
      closeReminder,
      processReminders,
      importReminders
    });

    window.WS_APP.TerminalReminderStore = api;
    window.WS_APP.getTerminalCalendarReminders = getReminders;
    window.WS_APP.createTerminalCalendarReminder = createReminder;
    window.WS_APP.closeTerminalCalendarReminder = closeReminder;
    window.WS_APP.processTerminalCalendarReminders = processReminders;
    window.WS_APP.importCalendarReminders = importReminders;
    return api;
  }

  window.WS_APP.createTerminalReminderStore = createTerminalReminderStore;
})();
