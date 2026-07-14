window.WS_APP = window.WS_APP || {};

(function initCitizenIdentityService() {
  const CITIZEN_RECORD_SCHEMA_VERSION = "citizen_record_foundation_2_0x";
  const SCHEMA_STORAGE_KEY = "ws_app_citizen_record_schema";
  const PRE_ALPHA_RESET_KEYS = Object.freeze([
    "ws_app_citizens_v1",
    "ws_app_item_instances_v1",
    "ws_app_item_instance_transactions_v1",
    "ws_app_terminal_entries_v1",
    "ws_app_service_requests_v1",
    "ws_app_service_offers_v1",
    "ws_app_billing_history_v1",
    "ws_app_billing_intents_v2",
    "ws_app_billing_transactions_v2",
    "ws_app_billing_bridge_schema",
    "ws_app_subscription_contracts_schema",
    "ws_subscription_command_receipts_v1",
    "ws_service_bridge_store_v1",
    "ws_service_bridge_schema",
    "ws_world_time_service_scheduler_v1",
    "ws_world_time_service_scheduler_schema",
    "ws_market_carts_v1",
    "ws_market_orders_v1",
    "ws_market_stock_v1",
    "ws_housing_placement_reservations_v1",
    "ws_world_bridge_operations_v1",
    "ws_app_calendar_reminders_v1",
    "ws_citizen_command_receipts_v1",
    "ws_admin_audit_store_v2",
    "ws_admin_audit_recovery_v1",
    "futureNoir.adminAuditLog.v1"
  ]);

  const RECORD_STATES = Object.freeze([
    "DRAFT",
    "READY_FOR_REVIEW",
    "CHANGES_REQUESTED",
    "ACTIVE",
    "REJECTED",
    "ARCHIVED"
  ]);
  const CHARACTER_TYPES = Object.freeze(["PLAYER", "NPC", "SYSTEM"]);
  const BIOLOGICAL_PROFILES = Object.freeze(["ALPHA", "BETA", "GAMMA", "UNCLASSIFIED"]);
  const ORIGIN_CITY_CODES = Object.freeze({
    "NE1:48.20": "01.48N20E",
    "NE2:49.60": "02.49N60E",
    "NE3:51.00": "03.51N00E",
    "NE4:52.70": "04.52N70E",
    "NE5:47.30": "05.47N30E",
    "NE6:54.40": "06.54N40E",
    "NE7:50.80": "07.50N80E",
    "NE8:53.10": "08.53N10E",
    "SE1:34.60": "11.34S60E",
    "EA2:22.90": "12.22N90E"
  });

  function normalizeToken(value = "", fallback = "") {
    const normalized = String(value || fallback).trim().toUpperCase().replace(/[\s-]+/g, "_");
    return normalized || fallback;
  }

  function normalizeRecordState(value, record = {}) {
    if (record?.recordType === "admin" || record?.id === "admin") return "ACTIVE";
    const normalized = normalizeToken(value, "ACTIVE");
    return RECORD_STATES.includes(normalized) ? normalized : "ACTIVE";
  }

  function normalizeCharacterType(value, record = {}) {
    if (record?.recordType === "admin" || record?.id === "admin") return "SYSTEM";
    if (String(record?.recordType || "").trim().toLowerCase() === "npc") return "NPC";
    const normalized = normalizeToken(value, "PLAYER");
    return CHARACTER_TYPES.includes(normalized) ? normalized : "PLAYER";
  }

  function normalizeBiologicalProfile(value, fallback = "UNCLASSIFIED") {
    const normalized = normalizeToken(value, fallback);
    if (normalized === "ALFA") return "ALPHA";
    if (["PODLUDZIE", "SUBHUMAN", "OUTSIDE", "NONE", "UNKNOWN"].includes(normalized)) return "UNCLASSIFIED";
    return BIOLOGICAL_PROFILES.includes(normalized) ? normalized : fallback;
  }

  function randomAlphaNum(length) {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  function makeInternalId(prefix = "citizen") {
    const stamp = Date.now().toString(36).toUpperCase();
    return `${String(prefix || "citizen").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "citizen"}_${stamp}_${randomAlphaNum(6).toLowerCase()}`;
  }

  function normalizeBirthDate(value = "") {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const compact = raw.replace(/[^0-9]/g, "");
    if (!/^\d{8}$/.test(compact)) return "";
    const year = Number(compact.slice(0, 4));
    const month = Number(compact.slice(4, 6));
    const day = Number(compact.slice(6, 8));
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
    return compact;
  }

  function parseCitizenIdNumber(value = "") {
    const source = String(value || "").trim().toUpperCase();
    const match = source.match(/^(.+)\.([A-Z0-9]{4})\.(\d{8})\.([A-Z0-9]{6,8})$/);
    if (!match) return null;
    return {
      cityCode: match[1],
      birthChunk: match[2],
      birthDate: match[3],
      randomBlock: match[4]
    };
  }

  function extractShortId(idNumber = "") {
    const source = String(idNumber || "").trim();
    const match = source.match(/(\d{8}\.[A-Z0-9]+)$/i) || source.match(/(\d{8}\.[A-Z0-9]+)/i);
    return match ? match[1].toUpperCase() : "";
  }

  function generateCitizenIdNumber(input = {}) {
    const origin = String(input.origin || "NE3:51.00").trim().toUpperCase();
    const cityCode = ORIGIN_CITY_CODES[origin] || "03.51N00E";
    const birthDate = normalizeBirthDate(input.birthDate) || "20800101";
    const chunk = String(input.birthChunk || "0A04").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4).padEnd(4, "0");
    const randomBlock = String(input.randomBlock || randomAlphaNum(7)).trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7).padEnd(7, "0");
    return `${cityCode}.${chunk}.${birthDate}.${randomBlock}`;
  }

  function recalculateCitizenIdentityCodes(input = {}, options = {}) {
    const parsed = parseCitizenIdNumber(input.idNumber);
    const origin = String(input.origin || "NE3:51.00").trim().toUpperCase();
    const birthDate = normalizeBirthDate(input.birthDate) || parsed?.birthDate || "";
    if (!birthDate) return { ok: false, error: { code: "VALID_BIRTH_DATE_REQUIRED" } };
    const birthChunk = String(input.birthChunk || parsed?.birthChunk || "0A04").trim().toUpperCase();
    const randomBlock = String(input.randomBlock || parsed?.randomBlock || randomAlphaNum(7)).trim().toUpperCase();
    const idNumber = generateCitizenIdNumber({ origin, birthDate, birthChunk, randomBlock });
    const shortId = extractShortId(idNumber);
    const excludeCitizenId = String(options.excludeCitizenId || input.id || "").trim();
    if (options.validateUniqueness !== false) {
      if (!isCitizenIdNumberAvailable(idNumber, excludeCitizenId)) return { ok: false, error: { code: "CITIZEN_ID_NOT_UNIQUE" } };
      if (!isCitizenShortIdAvailable(shortId, excludeCitizenId)) return { ok: false, error: { code: "SHORT_ID_NOT_UNIQUE" } };
    }
    return { ok: true, idNumber, shortId, birthDate, birthChunk, randomBlock };
  }

  function isCitizenIdNumberAvailable(idNumber, excludeCitizenId = "") {
    const target = String(idNumber || "").trim().toUpperCase();
    if (!target) return true;
    return !(window.WS_APP.getCitizens?.({ includeArchived: true }) || []).some((citizen) => (
      String(citizen?.id || "") !== String(excludeCitizenId || "")
      && String(citizen?.idNumber || "").trim().toUpperCase() === target
    ));
  }

  function isCitizenShortIdAvailable(shortId, excludeCitizenId = "") {
    const target = String(shortId || "").trim().toUpperCase();
    if (!target) return true;
    return !(window.WS_APP.getCitizens?.({ includeArchived: true }) || []).some((citizen) => (
      String(citizen?.id || "") !== String(excludeCitizenId || "")
      && String(citizen?.shortId || "").trim().toUpperCase() === target
    ));
  }

  function validateCitizenIdentity(input = {}, options = {}) {
    const errors = [];
    const warnings = [];
    const identity = input.identity && typeof input.identity === "object" ? input.identity : input;
    const firstName = String(identity.firstName ?? input.firstName ?? "").trim();
    const surname = String(identity.surname ?? input.surname ?? "").trim();
    const pseudonym = String(identity.pseudonym ?? input.pseudonym ?? "").trim();
    const profile = normalizeBiologicalProfile(input.biologicalProfile || input.profile, "UNCLASSIFIED");
    const origin = String(input.origin || "").trim();
    const birthDate = normalizeBirthDate(input.birthDate);
    const recordState = normalizeRecordState(input.recordState, input);
    const requireComplete = options.requireComplete === true || ["READY_FOR_REVIEW", "ACTIVE"].includes(recordState);

    if (requireComplete && !firstName && !surname && !pseudonym) errors.push({ field: "identity", code: "DISPLAY_IDENTITY_REQUIRED" });
    if (requireComplete && !BIOLOGICAL_PROFILES.includes(profile)) errors.push({ field: "biologicalProfile", code: "BIOLOGICAL_PROFILE_REQUIRED" });
    if (requireComplete && !origin) errors.push({ field: "origin", code: "ORIGIN_REQUIRED" });
    if (requireComplete && !birthDate) errors.push({ field: "birthDate", code: "VALID_BIRTH_DATE_REQUIRED" });
    if (birthDate) {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      if (birthDate > today && Number(birthDate.slice(0, 4)) < 2100) warnings.push({ field: "birthDate", code: "BIRTH_DATE_AFTER_REAL_DATE" });
    }

    const idNumber = String(input.idNumber || "").trim().toUpperCase();
    const shortId = String(input.shortId || extractShortId(idNumber)).trim().toUpperCase();
    if (idNumber && !isCitizenIdNumberAvailable(idNumber, options.excludeCitizenId)) errors.push({ field: "idNumber", code: "CITIZEN_ID_NOT_UNIQUE" });
    if (shortId && !isCitizenShortIdAvailable(shortId, options.excludeCitizenId)) errors.push({ field: "shortId", code: "SHORT_ID_NOT_UNIQUE" });

    return {
      ok: errors.length === 0,
      errors,
      warnings,
      normalized: {
        firstName,
        surname,
        pseudonym,
        biologicalProfile: profile,
        origin,
        birthDate,
        idNumber,
        shortId
      }
    };
  }

  function finalizeCitizenIdentity(input = {}, options = {}) {
    const excludeCitizenId = String(options.excludeCitizenId || input.id || "").trim();
    const parsed = parseCitizenIdNumber(input.idNumber);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const result = recalculateCitizenIdentityCodes({
        ...input,
        randomBlock: attempt === 0 ? (input.randomBlock || parsed?.randomBlock || "") : randomAlphaNum(7)
      }, { excludeCitizenId, validateUniqueness: true });
      if (result.ok) return result;
      if (!["CITIZEN_ID_NOT_UNIQUE", "SHORT_ID_NOT_UNIQUE"].includes(result.error?.code)) return result;
    }
    return { ok: false, error: { code: "CITIZEN_ID_GENERATION_FAILED" } };
  }

  function applyPreAlphaSchemaReset() {
    try {
      const current = window.localStorage?.getItem(SCHEMA_STORAGE_KEY) || "";
      if (current === CITIZEN_RECORD_SCHEMA_VERSION) return { reset: false, clearedKeys: [] };
      PRE_ALPHA_RESET_KEYS.forEach((key) => window.localStorage?.removeItem(key));
      window.localStorage?.setItem(SCHEMA_STORAGE_KEY, CITIZEN_RECORD_SCHEMA_VERSION);
      return { reset: true, clearedKeys: [...PRE_ALPHA_RESET_KEYS] };
    } catch (error) {
      console.warn("W&S Citizen record schema reset could not complete.", error);
      return { reset: false, clearedKeys: [], error };
    }
  }

  const resetResult = applyPreAlphaSchemaReset();

  Object.assign(window.WS_APP, {
    CITIZEN_RECORD_SCHEMA_VERSION,
    CITIZEN_RECORD_STATES: RECORD_STATES,
    CITIZEN_CHARACTER_TYPES: CHARACTER_TYPES,
    CITIZEN_PRE_ALPHA_RESET_KEYS: PRE_ALPHA_RESET_KEYS,
    citizenRecordSchemaResetResult: resetResult,
    normalizeCitizenRecordState: normalizeRecordState,
    normalizeCitizenCharacterType: normalizeCharacterType,
    normalizeCitizenBiologicalProfile: normalizeBiologicalProfile,
    generateCitizenInternalId: makeInternalId,
    generateCitizenIdNumber,
    parseCitizenIdNumber,
    recalculateCitizenIdentityCodes,
    extractCitizenShortIdFromIdNumber: extractShortId,
    validateCitizenIdentity,
    finalizeCitizenIdentity,
    isCitizenIdNumberAvailable,
    isCitizenShortIdAvailable
  });
})();
