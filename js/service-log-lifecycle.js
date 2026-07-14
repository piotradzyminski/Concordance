window.WS_APP = window.WS_APP || {};

(function initServiceLogLifecycleRegistry() {
  const STATUSES = Object.freeze([
    "ACTIVE",
    "SUSPENDED",
    "COMPLETED",
    "FAILED",
    "TERMINATED",
    "ARCHIVED"
  ]);

  const STATUS_SET = new Set(STATUSES);
  const TRANSITIONS = Object.freeze({
    ACTIVE: Object.freeze(["SUSPENDED", "COMPLETED", "FAILED", "TERMINATED"]),
    SUSPENDED: Object.freeze(["ACTIVE", "FAILED", "TERMINATED"]),
    COMPLETED: Object.freeze(["ARCHIVED"]),
    FAILED: Object.freeze(["ARCHIVED"]),
    TERMINATED: Object.freeze(["ARCHIVED"]),
    ARCHIVED: Object.freeze([])
  });

  const DESCRIPTIONS = Object.freeze({
    ACTIVE: "Current employment or assignment record.",
    SUSPENDED: "Temporarily paused record that may return to ACTIVE.",
    COMPLETED: "Successfully completed work record. Only ARCHIVE is allowed.",
    FAILED: "Failed work record. Only ARCHIVE is allowed.",
    TERMINATED: "Terminated work record. Only ARCHIVE is allowed.",
    ARCHIVED: "Terminal historical record. No further lifecycle transition is allowed."
  });

  function normalizeStatus(value = "ACTIVE", fallback = "ACTIVE") {
    const normalizedFallback = STATUS_SET.has(String(fallback || "ACTIVE").trim().toUpperCase())
      ? String(fallback || "ACTIVE").trim().toUpperCase()
      : "ACTIVE";
    const status = String(value || normalizedFallback).trim().toUpperCase();
    return STATUS_SET.has(status) ? status : normalizedFallback;
  }

  function getAllowedTransitions(status = "ACTIVE") {
    return [...(TRANSITIONS[normalizeStatus(status)] || [])];
  }

  function canTransition(fromStatus = "ACTIVE", toStatus = "ACTIVE") {
    const from = normalizeStatus(fromStatus);
    const to = String(toStatus || "").trim().toUpperCase();
    if (!STATUS_SET.has(to)) return false;
    if (from === to) return true;
    return (TRANSITIONS[from] || []).includes(to);
  }

  function getDescriptor(status = "ACTIVE") {
    const normalized = normalizeStatus(status);
    return {
      status: normalized,
      terminal: normalized === "ARCHIVED",
      description: DESCRIPTIONS[normalized] || "",
      allowedTransitions: getAllowedTransitions(normalized)
    };
  }

  const registry = Object.freeze({
    version: "citizen_service_log_lifecycle_1_0x",
    statuses: STATUSES,
    transitions: TRANSITIONS,
    normalizeStatus,
    getAllowedTransitions,
    canTransition,
    getDescriptor
  });

  window.WS_APP.ServiceLogLifecycle = registry;
  window.WS_APP.SERVICE_LOG_LIFECYCLE_VERSION = registry.version;
  window.WS_APP.normalizeCitizenServiceLogStatus = normalizeStatus;
  window.WS_APP.getCitizenServiceAllowedTransitionsForStatus = getAllowedTransitions;
  window.WS_APP.canTransitionCitizenServiceStatus = canTransition;
  window.WS_APP.getCitizenServiceLifecycleDescriptor = getDescriptor;
})();
