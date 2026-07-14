(function initCyberwareDiagnostics() {
  window.WS_APP = window.WS_APP || {};
  const app = window.WS_APP;
  const MAX_HISTORY = 24;
  const SEVERITY_RANK = Object.freeze({ INFO: 1, WARNING: 2, ERROR: 3, CRITICAL: 4 });
  const STATUS_RANK = Object.freeze({ NOMINAL: 0, ADVISORY: 1, DEGRADED: 2, CRITICAL: 3 });

  const getRuntimeState = typeof app.getCyberwareRuntimeState === "function"
    ? app.getCyberwareRuntimeState
    : app.cyberwareRuntime?.getCyberwareRuntimeState;

  if (typeof getRuntimeState !== "function") {
    throw new Error("Cyberware Runtime must load before cyberware-diagnostics.js.");
  }

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min = 0, max = 100, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }

  function normalizeToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function itemId(item = {}) {
    const source = item && typeof item === "object" ? item : {};
    return String(source.instanceId || source.id || source.itemId || "").trim();
  }

  function getCitizen(citizenOrId = {}) {
    if (typeof citizenOrId === "string") return app.getCitizenById?.(citizenOrId) || null;
    if (citizenOrId?.id) return citizenOrId;
    return null;
  }

  function getCondition(item = {}) {
    const source = item && typeof item === "object" ? item : {};
    return clamp(source.condition ?? source.durability?.current, 0, 100, 100);
  }

  function formatCode(value = "") {
    return normalizeToken(value).replace(/_/g, " ");
  }

  function normalizeHistory(citizen = {}) {
    return (Array.isArray(citizen?.cyberwareDiagnostics) ? citizen.cyberwareDiagnostics : [])
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => ({
        id: String(entry.id || "").trim(),
        createdAt: String(entry.createdAt || "").trim(),
        status: normalizeToken(entry.status || "NOMINAL"),
        neurocrashRisk: clamp(entry.neurocrashRisk, 0, 100, 0),
        issueCount: Math.max(0, Math.round(Number(entry.issueCount || 0))),
        criticalCount: Math.max(0, Math.round(Number(entry.criticalCount || 0))),
        errorCount: Math.max(0, Math.round(Number(entry.errorCount || 0))),
        warningCount: Math.max(0, Math.round(Number(entry.warningCount || 0))),
        stability: clamp(entry.stability, 0, 100, 0),
        security: clamp(entry.security, 0, 100, 0),
        neuralStrain: Math.max(0, Math.round(Number(entry.neuralStrain || 0))),
        codes: Array.isArray(entry.codes) ? entry.codes.map(normalizeToken).filter(Boolean).slice(0, 12) : []
      }))
      .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
      .slice(0, MAX_HISTORY);
  }

  function issueTitle(code = "") {
    const token = normalizeToken(code).split(":")[0];
    const titles = {
      NO_NEUROCHIP: "Neurochip unavailable",
      NO_INTERFACE: "Interface unavailable",
      NO_SERVICE_PORT: "Service Port unavailable",
      NEURAL_STRAIN: "Neural strain detected",
      STABILITY_CRITICAL: "Critical stability",
      STABILITY_DEGRADED: "Degraded stability",
      SECURITY_CRITICAL: "Critical security exposure",
      SECURITY_DEGRADED: "Security below recommended threshold",
      NEUROLOAD_SATURATED: "Neuroload capacity saturated",
      NEUROCHANNELS_SATURATED: "Neurochannels saturated",
      INTERFACE_LOAD_SATURATED: "Interface capacity saturated",
      CONDITION_ZERO: "Implant nonfunctional",
      CONDITION_CRITICAL: "Critical implant condition",
      CONDITION_DEGRADED: "Degraded implant condition",
      SLOT_CONFLICT: "Body slot conflict",
      BODY_SLOT_UNASSIGNED: "Body slot unassigned",
      PROTOCOL_UNSUPPORTED: "Unsupported protocol",
      COMPONENT_STANDARD_MISSING: "Required component standard missing",
      INTERFACE_CAPACITY_EXCEEDED: "Interface capacity exceeded",
      NEUROCHANNELS_EXCEEDED: "Neurochannels exceeded",
      INTERFACE_SOCKET_RATING_TOO_LOW: "Interface socket rating too low",
      NEUROCHIP_TIER_TOO_LOW: "Neurochip tier too low",
      INTERFACE_TIER_TOO_LOW: "Interface tier too low",
      NEUROCHIP_GRADE_LIMIT: "Neurochip grade limit exceeded",
      NEUROCHIP_SCALE_LIMIT: "Neurochip scale limit exceeded",
      IN_SERVICE: "System in maintenance",
      AUTHORIZATION_BLOCKED: "Authorization blocked",
      SYSTEM_NOMINAL: "No active diagnostic faults"
    };
    return titles[token] || formatCode(token || "DIAGNOSTIC EVENT");
  }

  function createIssue(code, severity = "WARNING", detail = "", item = null, category = "SYSTEM") {
    const normalizedCode = normalizeToken(code || "DIAGNOSTIC_EVENT");
    return {
      id: `${normalizedCode}:${itemId(item) || "SYSTEM"}`,
      code: normalizedCode,
      severity: SEVERITY_RANK[normalizeToken(severity)] ? normalizeToken(severity) : "WARNING",
      category: normalizeToken(category || "SYSTEM"),
      title: issueTitle(normalizedCode),
      detail: String(detail || "").trim() || formatCode(normalizedCode),
      itemId: itemId(item),
      itemName: String(item?.name || item?.label || itemId(item) || "").trim(),
      operationalState: normalizeToken(item?.operationalState || item?.runtimeStatus || "")
    };
  }

  function addIssue(map, issue) {
    if (!issue?.id) return;
    const previous = map.get(issue.id);
    if (!previous || SEVERITY_RANK[issue.severity] > SEVERITY_RANK[previous.severity]) map.set(issue.id, issue);
  }

  function severityForOperationalState(state = "") {
    const token = normalizeToken(state);
    if (token === "FAULT") return "ERROR";
    if (token === "LOCKED") return "ERROR";
    if (token === "DISABLED") return "WARNING";
    if (token === "MAINTENANCE") return "INFO";
    return "INFO";
  }

  function classifyRuntimeCode(code = "", fallback = "WARNING") {
    const token = normalizeToken(code).split(":")[0];
    if (["NO_NEUROCHIP", "NO_INTERFACE", "CONDITION_ZERO"].includes(token)) return "CRITICAL";
    if (["SLOT_CONFLICT", "BODY_SLOT_UNASSIGNED", "PROTOCOL_UNSUPPORTED", "COMPONENT_STANDARD_MISSING", "INTERFACE_SOCKET_RATING_TOO_LOW", "NEUROCHIP_TIER_TOO_LOW", "INTERFACE_TIER_TOO_LOW", "NEUROCHIP_GRADE_LIMIT", "NEUROCHIP_SCALE_LIMIT"].includes(token)) return "ERROR";
    if (["INTERFACE_CAPACITY_EXCEEDED", "NEUROCHANNELS_EXCEEDED", "CONDITION_CRITICAL"].includes(token)) return "ERROR";
    if (["IN_SERVICE", "NO_SERVICE_PORT"].includes(token)) return "INFO";
    return fallback;
  }

  function getAverageCondition(items = []) {
    const values = items.map(getCondition).filter((value) => Number.isFinite(value));
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 100;
  }

  function calculateNeurocrashRisk(runtime = {}) {
    const core = runtime.neuralCore || {};
    const stability = clamp(core.stability, 0, 100, 0);
    const strain = Math.max(0, Number(core.neuralStrain || 0));
    const faults = Array.isArray(runtime.faults) ? runtime.faults.length : 0;
    const locked = Array.isArray(runtime.locked) ? runtime.locked.length : 0;
    const criticalCondition = (runtime.items || []).filter((item) => getCondition(item) < 25).length;
    const missingCore = (!core.neurochip ? 35 : 0) + (!core.interface ? 45 : 0);
    const score = clamp(
      missingCore
      + strain * 12
      + Math.max(0, 65 - stability) * 1.15
      + faults * 14
      + locked * 5
      + criticalCondition * 8,
      0,
      100,
      0
    );
    const level = score >= 70 ? "CRITICAL" : score >= 45 ? "HIGH" : score >= 20 ? "ELEVATED" : "LOW";
    return { score: Math.round(score), level };
  }

  function buildFactorState(runtime = {}) {
    const core = runtime.neuralCore || {};
    const enabledNonCore = (runtime.enabled || []).filter((item) => !item.isCoreProcessor && !item.isCoreInterface && !item.isServicePort);
    const averageCondition = getAverageCondition(enabledNonCore);
    return {
      stability: [
        { key: "NEUROCHIP_STABILITY", label: "Neurochip", value: clamp(core.neurochip?.stability, 0, 100, 0) },
        { key: "SIGNAL_INTEGRITY", label: "Signal integrity", value: clamp(core.interface?.signalIntegrity, 0, 100, 0) },
        { key: "REDUNDANCY", label: "Interface redundancy", value: clamp(core.interface?.redundancy, 0, 100, 0) },
        { key: "IMPLANT_CONDITION", label: "Active implant condition", value: averageCondition },
        { key: "STRAIN_PENALTY", label: "Neural strain penalty", value: -Math.max(0, Math.round(Number(core.neuralStrain || 0) * 3)) }
      ],
      security: [
        { key: "NEUROCHIP_SECURITY", label: "Neurochip", value: clamp(core.neurochip?.security, 0, 100, 0) },
        { key: "INTERFACE_ISOLATION", label: "Interface isolation", value: clamp(core.interface?.securityIsolation, 0, 100, 0) },
        { key: "SERVICE_PORT_LOCK", label: "Service Port lock", value: core.servicePort ? clamp(core.servicePort?.securityLock, 0, 100, 0) : null }
      ]
    };
  }

  function buildResourceState(runtime = {}) {
    const core = runtime.neuralCore || {};
    function resource(key, label, value, capacity, demanded = value) {
      const safeCapacity = Math.max(0, Number(capacity || 0));
      const safeValue = Math.max(0, Number(value || 0));
      const safeDemanded = Math.max(0, Number(demanded || 0));
      return {
        key,
        label,
        value: Math.round(safeValue),
        demanded: Math.round(safeDemanded),
        capacity: Math.round(safeCapacity),
        remaining: Math.max(0, Math.round(safeCapacity - safeValue)),
        ratio: safeCapacity > 0 ? safeValue / safeCapacity : safeValue > 0 ? 1 : 0,
        demandRatio: safeCapacity > 0 ? safeDemanded / safeCapacity : safeDemanded > 0 ? 1 : 0
      };
    }
    return [
      resource("NEUROLOAD", "Neuroload", core.neuroLoad, core.neuroCapacity, core.installedNeuroLoad),
      resource("NEUROCHANNELS", "Neurochannels", core.channelLoad, core.controlChannels, core.channelLoad),
      resource("INTERFACE_LOAD", "Interface Load", core.interfaceLoad, core.interfaceCapacity, core.interfaceLoad)
    ];
  }

  function buildCyberwareDiagnostics(citizenOrId = {}, runtimeState = null) {
    const citizen = getCitizen(citizenOrId);
    const runtime = runtimeState || (citizen ? getRuntimeState(citizen) : { items: [], counts: {}, neuralCore: {} });
    const core = runtime.neuralCore || {};
    const issueMap = new Map();

    if (!core.neurochip) addIssue(issueMap, createIssue("NO_NEUROCHIP", "CRITICAL", "No active Neurochip is available to process installed cyberware.", null, "CORE"));
    if (!core.interface) addIssue(issueMap, createIssue("NO_INTERFACE", "CRITICAL", "No active Interface is available to connect the Neurochip with the body bus.", null, "CORE"));
    if (!core.servicePort) addIssue(issueMap, createIssue("NO_SERVICE_PORT", "INFO", "External diagnostics and authorized service access are unavailable.", null, "CORE"));

    const strain = Math.max(0, Math.round(Number(core.neuralStrain || 0)));
    if (strain > 0) {
      const severity = strain >= 7 ? "CRITICAL" : strain >= 5 ? "ERROR" : "WARNING";
      addIssue(issueMap, createIssue(`NEURAL_STRAIN:${strain}`, severity, `Active Neuroload exceeds capacity by ${strain}.`, null, "LOAD"));
    }

    const stability = clamp(core.stability, 0, 100, 0);
    if (stability < 25) addIssue(issueMap, createIssue("STABILITY_CRITICAL", "CRITICAL", `Stability is ${Math.round(stability)}. Neurocrash risk is severe.`, null, "STABILITY"));
    else if (stability < 50) addIssue(issueMap, createIssue("STABILITY_DEGRADED", "ERROR", `Stability is ${Math.round(stability)}. Internal faults and signal loss are likely.`, null, "STABILITY"));
    else if (stability < 70) addIssue(issueMap, createIssue("STABILITY_DEGRADED", "WARNING", `Stability is ${Math.round(stability)}. Preventive diagnostics are recommended.`, null, "STABILITY"));

    const security = clamp(core.security, 0, 100, 0);
    if (security < 25) addIssue(issueMap, createIssue("SECURITY_CRITICAL", "CRITICAL", `Security is ${Math.round(security)}. Neural control channels are critically exposed.`, null, "SECURITY"));
    else if (security < 50) addIssue(issueMap, createIssue("SECURITY_DEGRADED", "WARNING", `Security is ${Math.round(security)}. Additional isolation is recommended.`, null, "SECURITY"));

    const resources = buildResourceState(runtime);
    resources.forEach((resource) => {
      if (resource.capacity <= 0 && resource.demanded > 0) {
        addIssue(issueMap, createIssue(`${resource.key}_SATURATED`, "CRITICAL", `${resource.label} has demand without available capacity.`, null, "LOAD"));
      } else if (resource.demandRatio > 1) {
        addIssue(issueMap, createIssue(`${resource.key}_SATURATED`, resource.key === "NEUROLOAD" ? "ERROR" : "WARNING", `${resource.label} demand is ${Math.round(resource.demandRatio * 100)}% of capacity.`, null, "LOAD"));
      } else if (resource.ratio >= 0.9) {
        addIssue(issueMap, createIssue(`${resource.key}_SATURATED`, "WARNING", `${resource.label} utilization is ${Math.round(resource.ratio * 100)}%.`, null, "LOAD"));
      }
    });

    (runtime.items || []).forEach((item) => {
      const state = normalizeToken(item.operationalState || item.runtimeStatus || "UNKNOWN");
      const reason = normalizeToken(item.operationalReason || item.runtimeReason || "UNKNOWN");
      const condition = getCondition(item);
      if (state !== "ENABLED") {
        const detail = `${item.name || itemId(item) || "Cyberware"} is ${formatCode(state)}: ${formatCode(reason)}.`;
        addIssue(issueMap, createIssue(reason || state, severityForOperationalState(state), detail, item, state === "MAINTENANCE" ? "SERVICE" : "OPERATION"));
      }
      if (condition <= 0) addIssue(issueMap, createIssue("CONDITION_ZERO", "CRITICAL", `${item.name || itemId(item)} has 0% condition.`, item, "CONDITION"));
      else if (condition < 25) addIssue(issueMap, createIssue("CONDITION_CRITICAL", "ERROR", `${item.name || itemId(item)} condition is ${Math.round(condition)}%.`, item, "CONDITION"));
      else if (condition < 60) addIssue(issueMap, createIssue("CONDITION_DEGRADED", "WARNING", `${item.name || itemId(item)} condition is ${Math.round(condition)}%.`, item, "CONDITION"));

      (item.operationalBlockers || item.operational?.blockers || []).forEach((code) => {
        const normalized = normalizeToken(code);
        addIssue(issueMap, createIssue(normalized, classifyRuntimeCode(normalized, "ERROR"), `${item.name || itemId(item)}: ${formatCode(normalized)}.`, item, normalized.startsWith("PROTOCOL") || normalized.startsWith("COMPONENT") ? "COMPATIBILITY" : "OPERATION"));
      });
      (item.operationalWarnings || item.operational?.warnings || []).forEach((code) => {
        const normalized = normalizeToken(code);
        addIssue(issueMap, createIssue(normalized, classifyRuntimeCode(normalized, "WARNING"), `${item.name || itemId(item)}: ${formatCode(normalized)}.`, item, "WARNING"));
      });
    });

    const issues = [...issueMap.values()].sort((left, right) => {
      const severityDelta = SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity];
      if (severityDelta) return severityDelta;
      const itemDelta = String(left.itemName || "").localeCompare(String(right.itemName || ""));
      return itemDelta || String(left.code || "").localeCompare(String(right.code || ""));
    });

    if (!issues.length) issues.push(createIssue("SYSTEM_NOMINAL", "INFO", "No active faults, blockers, overloads or compatibility errors were detected.", null, "SYSTEM"));

    const counts = { INFO: 0, WARNING: 0, ERROR: 0, CRITICAL: 0 };
    issues.forEach((issue) => { counts[issue.severity] = (counts[issue.severity] || 0) + 1; });
    const neurocrashRisk = calculateNeurocrashRisk(runtime);
    const status = counts.CRITICAL > 0 || neurocrashRisk.level === "CRITICAL"
      ? "CRITICAL"
      : counts.ERROR > 0 || neurocrashRisk.level === "HIGH"
        ? "DEGRADED"
        : counts.WARNING > 0 || neurocrashRisk.level === "ELEVATED"
          ? "ADVISORY"
          : "NOMINAL";

    return {
      citizenId: String(citizen?.id || "").trim(),
      generatedAt: new Date().toISOString(),
      status,
      statusRank: STATUS_RANK[status] || 0,
      runtime,
      core: {
        systemState: normalizeToken(core.systemState || "UNKNOWN"),
        stability: Math.round(stability),
        security: Math.round(security),
        latencyClass: normalizeToken(core.latencyClass || "UNKNOWN"),
        latencyRank: Math.max(0, Math.round(Number(core.latencyRank || 0))),
        neuralStrain: strain
      },
      resources,
      factors: buildFactorState(runtime),
      neurocrashRisk,
      issues,
      counts,
      history: normalizeHistory(citizen || {})
    };
  }

  function makeScanId(citizenId = "") {
    return `cyberdiag-${String(citizenId || "citizen").replace(/[^a-z0-9_-]+/gi, "-")}-${Date.now().toString(36)}`;
  }

  function runCyberwareDiagnosticScan(citizenOrId = {}, options = {}) {
    const citizen = getCitizen(citizenOrId);
    if (!citizen?.id) return { ok: false, reason: "CITIZEN_NOT_FOUND" };
    const runtime = options.runtime || getRuntimeState(citizen);
    const diagnostics = buildCyberwareDiagnostics(citizen, runtime);
    const record = {
      id: makeScanId(citizen.id),
      createdAt: new Date().toISOString(),
      status: diagnostics.status,
      neurocrashRisk: diagnostics.neurocrashRisk.score,
      issueCount: diagnostics.issues.filter((issue) => issue.code !== "SYSTEM_NOMINAL").length,
      criticalCount: diagnostics.counts.CRITICAL || 0,
      errorCount: diagnostics.counts.ERROR || 0,
      warningCount: diagnostics.counts.WARNING || 0,
      stability: diagnostics.core.stability,
      security: diagnostics.core.security,
      neuralStrain: diagnostics.core.neuralStrain,
      codes: diagnostics.issues.filter((issue) => issue.code !== "SYSTEM_NOMINAL").map((issue) => issue.code).slice(0, 12)
    };
    const history = [record, ...normalizeHistory(citizen)].slice(0, MAX_HISTORY);
    const updatedCitizen = app.updateCitizen?.(citizen.id, { cyberwareDiagnostics: history }, {
      source: "CYBERWARE_DIAGNOSTICS",
      skipModuleRefresh: true,
      skipProfileRefresh: true
    }) || { ...citizen, cyberwareDiagnostics: history };
    const result = {
      ...diagnostics,
      history: normalizeHistory(updatedCitizen)
    };
    window.dispatchEvent(new CustomEvent("ws:cyberware-diagnostics-updated", {
      detail: { citizenId: citizen.id, scanId: record.id, record: clone(record), diagnostics: result }
    }));
    return { ok: true, record: clone(record), diagnostics: result };
  }

  function getCyberwareDiagnosticHistory(citizenOrId = {}) {
    return clone(normalizeHistory(getCitizen(citizenOrId) || {}));
  }

  function clearCyberwareDiagnosticHistory(citizenOrId = {}) {
    const citizen = getCitizen(citizenOrId);
    if (!citizen?.id) return { ok: false, reason: "CITIZEN_NOT_FOUND" };
    const updatedCitizen = app.updateCitizen?.(citizen.id, { cyberwareDiagnostics: [] }, {
      source: "CYBERWARE_DIAGNOSTICS",
      skipModuleRefresh: true,
      skipProfileRefresh: true
    });
    window.dispatchEvent(new CustomEvent("ws:cyberware-diagnostics-updated", {
      detail: { citizenId: citizen.id, cleared: true }
    }));
    return { ok: true, citizen: updatedCitizen || { ...citizen, cyberwareDiagnostics: [] } };
  }

  app.cyberwareDiagnostics = {
    MAX_HISTORY,
    SEVERITY_RANK,
    buildCyberwareDiagnostics,
    runCyberwareDiagnosticScan,
    getCyberwareDiagnosticHistory,
    clearCyberwareDiagnosticHistory
  };
  app.getCyberwareDiagnosticsState = buildCyberwareDiagnostics;
  app.runCyberwareDiagnosticScan = runCyberwareDiagnosticScan;
  app.getCyberwareDiagnosticHistory = getCyberwareDiagnosticHistory;
  app.clearCyberwareDiagnosticHistory = clearCyberwareDiagnosticHistory;
})();
