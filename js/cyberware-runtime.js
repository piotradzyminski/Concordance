(function initCyberwareOperationalRuntime() {
  window.WS_APP = window.WS_APP || {};
  const runtime = window.WS_APP.cyberwareRuntime = window.WS_APP.cyberwareRuntime || {};

  if (typeof runtime.getCyberwarePlacementState !== "function") {
    throw new Error("Cyberware placement rules must be loaded before cyberware-runtime.js.");
  }

  const getCyberwarePlacementState = runtime.getCyberwarePlacementState;
  const normalizeCyberwareEntry = runtime.normalizeCyberwareEntry;
  const validateCyberwareAccessForItem = runtime.validateCyberwareAccessForItem;
  const getCyberwareGradeRank = runtime.getCyberwareGradeRank;
  const getCyberwareIdentityTokens = runtime.getCyberwareIdentityTokens;

  const CYBERWARE_OPERATIONAL_STATES = Object.freeze({
    ENABLED: "ENABLED",
    DISABLED: "DISABLED",
    MAINTENANCE: "MAINTENANCE",
    FAULT: "FAULT",
    LOCKED: "LOCKED"
  });

  const STATE_SET = new Set(Object.values(CYBERWARE_OPERATIONAL_STATES));
  const ENABLE_TOKENS = new Set(["ACTIVE", "ENABLED", "INSTALLED", "ONLINE", "READY", "SYNCED", "REGISTERED", "LICENSED"]);
  const DISABLE_TOKENS = new Set(["DISABLED", "OFFLINE", "INACTIVE", "SUSPENDED", "POWERED_DOWN", "STANDBY"]);
  const MAINTENANCE_TOKENS = new Set(["MAINTENANCE", "SERVICE", "IN_SERVICE", "CALIBRATION", "REPAIR"]);
  const FAULT_TOKENS = new Set(["FAULT", "BROKEN", "DAMAGED", "DESTROYED", "REJECTED", "FAILED"]);
  const LOCK_TOKENS = new Set(["LOCKED", "BLOCKED", "SEALED", "REVOKED", "QUARANTINED"]);
  const CORE_PROTOCOL_TOKENS = new Set([
    "CIVIC", "UTILITY", "INDUSTRIAL", "MEDICAL", "TRAUMA", "BIOMETRIC", "BIOMONITORING",
    "SENSORY", "PRECISION", "PREMIUM", "SECURE", "NETRUNNER", "TACTICAL", "FULLSET",
    "EXPERIMENTAL", "GRIDLINK", "MULTIBUS", "EQUIPMENT_LAYOUT", "SERVICE", "SYSTEM", "COMPLIANCE"
  ]);
  const SCALE_RANK = Object.freeze({ SMALL: 1, MEDIUM: 2, LARGE: 3, FULL_SET: 4 });
  const LATENCY_RANK = Object.freeze({
    PREEMPTIVE: 0,
    UNIQUE: 0,
    PREDICTIVE: 1,
    BLACK: 1,
    TACTICAL: 1,
    REAL_TIME: 2,
    LOW: 2,
    LOW_LATENCY: 2,
    RESPONSIVE: 3,
    MEDIUM: 3,
    STANDARD: 3,
    DELAYED: 4,
    HIGH: 4,
    BASIC: 4,
    NONE: 5
  });
  const LATENCY_LABEL = Object.freeze({ 0: "PREEMPTIVE", 1: "PREDICTIVE", 2: "REAL_TIME", 3: "RESPONSIVE", 4: "DELAYED", 5: "NONE" });

  const BUS_PROTOCOL_MAP = Object.freeze({
    STANDARD_BODY_BUS: ["CIVIC", "UTILITY"],
    CORPORATE_BODY_BUS: ["CIVIC", "UTILITY", "SENSORY", "MEDICAL", "SECURE"],
    SECURITY_BODY_BUS: ["SECURE", "NETRUNNER"],
    SECURE_BODY_BUS: ["SECURE", "NETRUNNER"],
    MEDICAL_BODY_BUS: ["MEDICAL", "BIOMETRIC", "BIOMONITORING"],
    TRAUMA_MEDICAL_BUS: ["MEDICAL", "TRAUMA", "BIOMETRIC", "BIOMONITORING"],
    SENSORY_BODY_BUS: ["SENSORY", "PRECISION"],
    PREMIUM_SIGNAL_BUS: ["SENSORY", "PRECISION", "PREMIUM"],
    INDUSTRIAL_BODY_BUS: ["INDUSTRIAL", "UTILITY"],
    MASS_COMPRESSION_BUS: ["UTILITY", "INDUSTRIAL", "GRIDLINK", "MULTIBUS", "EQUIPMENT_LAYOUT"],
    EQUIPMENT_BODY_BUS: ["UTILITY", "GRIDLINK", "EQUIPMENT_LAYOUT"],
    SYSTEM_BODY_BUS: ["SYSTEM", "COMPLIANCE", "CIVIC"],
    BIOMETRIC_BODY_BUS: ["BIOMETRIC", "BIOMONITORING", "MEDICAL"],
    MILITARY_BODY_BUS: ["TACTICAL", "SECURE", "INDUSTRIAL"],
    UNIQUE_BODY_BUS: ["EXPERIMENTAL", "FULLSET"]
  });

  function normalizeToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function unique(values = []) {
    return [...new Set((Array.isArray(values) ? values : [values]).map(normalizeToken).filter(Boolean))];
  }

  function clamp(value, min = 0, max = 100, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
  }

  function itemId(item = {}) {
    return String(item.instanceId || item.id || item.implantId || "").trim();
  }

  function getLocationType(item = {}) {
    return normalizeToken(item.locationType || item.locationData?.type || item.location || "");
  }

  function getLifecycleState(item = {}) {
    return normalizeToken(item.lifecycleState || (getLocationType(item) === "BODY" ? "INSTALLED" : ""));
  }

  function getOperatingToken(item = {}) {
    return normalizeToken(item.operatingStatus || item.operationStatus || item.runtimeMode || "ACTIVE");
  }

  function getCondition(item = {}) {
    return clamp(item.condition ?? item.durability?.current, 0, 100, 100);
  }

  function getChannelCost(item = {}) {
    if (item.isCoreProcessor || item.isCoreInterface || item.isServicePort) return 0;
    return clamp(item.neuroChannels ?? item.neuroChannelCost ?? item.controlChannelCost ?? item.channelCost, 0, 16, 1);
  }

  function getOperationalPriority(item = {}) {
    return clamp(item.operationalPriority ?? item.runtimePriority ?? item.activationPriority, 0, 9999, 100);
  }

  function compareOperationalPriority(left = {}, right = {}) {
    const priorityDelta = getOperationalPriority(left) - getOperationalPriority(right);
    if (priorityDelta) return priorityDelta;
    const installedDelta = String(left.installedAt || "").localeCompare(String(right.installedAt || ""));
    if (installedDelta) return installedDelta;
    return itemId(left).localeCompare(itemId(right));
  }

  function getBaseOperationalAssessment(item = {}) {
    const blockers = [];
    const warnings = [];
    const locationType = getLocationType(item);
    const lifecycleState = getLifecycleState(item);
    const operatingToken = getOperatingToken(item);
    const condition = getCondition(item);
    const placementStatus = normalizeToken(item.placementStatus || item.runtimeStatus || "");

    if (item.archived === true || lifecycleState === "DISPOSED" || locationType === "DESTROYED") {
      return { state: "FAULT", reason: "ITEM_DISPOSED", blockers: ["ITEM_DISPOSED"], warnings, condition };
    }
    if (locationType === "SERVICE" || lifecycleState === "IN_SERVICE" || MAINTENANCE_TOKENS.has(operatingToken)) {
      return { state: "MAINTENANCE", reason: "IN_SERVICE", blockers: ["IN_SERVICE"], warnings, condition };
    }
    if (locationType !== "BODY" || lifecycleState !== "INSTALLED") {
      return { state: "DISABLED", reason: "NOT_INSTALLED_IN_BODY", blockers: ["NOT_INSTALLED_IN_BODY"], warnings, condition };
    }
    if (condition <= 0) {
      return { state: "FAULT", reason: "CONDITION_ZERO", blockers: ["CONDITION_ZERO"], warnings, condition };
    }
    if (FAULT_TOKENS.has(operatingToken) || FAULT_TOKENS.has(normalizeToken(item.status))) {
      return { state: "FAULT", reason: `OPERATING_STATUS_${operatingToken || normalizeToken(item.status)}`, blockers: [`OPERATING_STATUS_${operatingToken || normalizeToken(item.status)}`], warnings, condition };
    }
    if (LOCK_TOKENS.has(operatingToken)) {
      return { state: "LOCKED", reason: `OPERATING_STATUS_${operatingToken}`, blockers: [`OPERATING_STATUS_${operatingToken}`], warnings, condition };
    }
    if (DISABLE_TOKENS.has(operatingToken)) {
      return { state: "DISABLED", reason: `OPERATING_STATUS_${operatingToken}`, blockers: [`OPERATING_STATUS_${operatingToken}`], warnings, condition };
    }
    if (placementStatus === "CONFLICT" || (Array.isArray(item.conflictSlots) && item.conflictSlots.length)) {
      return { state: "FAULT", reason: "SLOT_CONFLICT", blockers: ["SLOT_CONFLICT"], warnings, condition };
    }
    if (!Array.isArray(item.slots) || !item.slots.length || placementStatus === "UNASSIGNED") {
      return { state: "FAULT", reason: "BODY_SLOT_UNASSIGNED", blockers: ["BODY_SLOT_UNASSIGNED"], warnings, condition };
    }
    if (!ENABLE_TOKENS.has(operatingToken) && operatingToken) warnings.push(`OPERATING_STATUS_UNKNOWN:${operatingToken}`);
    if (condition < 25) warnings.push("CONDITION_CRITICAL");
    else if (condition < 60) warnings.push("CONDITION_DEGRADED");
    return { state: "ENABLED", reason: "BASE_READY", blockers, warnings, condition };
  }

  function expandCapabilityTokens(item = {}) {
    const direct = unique([
      ...(Array.isArray(item.protocolSupport) ? item.protocolSupport : []),
      ...(Array.isArray(item.supportedProtocols) ? item.supportedProtocols : []),
      ...(Array.isArray(item.supportedBuses) ? item.supportedBuses : [])
    ]);
    const result = new Set(direct);
    direct.forEach((token) => (BUS_PROTOCOL_MAP[token] || []).forEach((protocol) => result.add(protocol)));
    (Array.isArray(item.tags) ? item.tags : []).map(normalizeToken).filter((token) => CORE_PROTOCOL_TOKENS.has(token)).forEach((token) => result.add(token));
    return result;
  }

  function getRequiredProtocolTokens(item = {}) {
    return unique(item.requiredProtocols || item.protocolRequirements || []);
  }

  function getRequiredBusTokens(item = {}) {
    return unique(item.requiredBuses || []).filter((token) => token.endsWith("_BUS"));
  }

  function getRequiredComponentStandards(item = {}) {
    return unique(item.requiredComponentStandards || item.requiredStandards || item.componentStandards || []);
  }

  function getEffectiveProtocolSupport(neurochip = null, bodyInterface = null) {
    if (!neurochip || !bodyInterface) return [];
    const neuro = expandCapabilityTokens(neurochip);
    const iface = expandCapabilityTokens(bodyInterface);
    const intersection = [...neuro].filter((token) => iface.has(token));
    return unique(intersection);
  }

  function getIdentityTokenSet(item = {}) {
    const values = typeof getCyberwareIdentityTokens === "function"
      ? getCyberwareIdentityTokens(item)
      : [item.id, item.instanceId, item.compatibilityGroup, item.manufacturer, ...(item.tags || [])];
    return new Set(unique(values));
  }

  function resolveLatencyRank(value = "") {
    const token = normalizeToken(value);
    return LATENCY_RANK[token] ?? 4;
  }

  function weightedAverage(parts = []) {
    const valid = parts.filter((part) => Number.isFinite(Number(part.value)) && Number(part.weight) > 0);
    const weight = valid.reduce((sum, part) => sum + Number(part.weight), 0);
    if (!weight) return 0;
    return valid.reduce((sum, part) => sum + Number(part.value) * Number(part.weight), 0) / weight;
  }

  function selectCoreComponent(items = [], predicate = () => false, sorter = () => 0) {
    return items.filter((item) => predicate(item) && item.baseAssessment?.state === "ENABLED").sort(sorter)[0] || null;
  }

  function buildCoreContext(items = []) {
    const neurochip = selectCoreComponent(items, (item) => item.isCoreProcessor, (a, b) => (b.neurochipTier - a.neurochipTier) || (b.neuroCapacity - a.neuroCapacity) || itemId(a).localeCompare(itemId(b)));
    const bodyInterface = selectCoreComponent(items, (item) => item.isCoreInterface, (a, b) => (b.interfaceTier - a.interfaceTier) || (b.interfaceCapacity - a.interfaceCapacity) || (b.interfaceLanes - a.interfaceLanes) || itemId(a).localeCompare(itemId(b)));
    const servicePort = selectCoreComponent(items, (item) => item.isServicePort, (a, b) => (b.servicePortTier - a.servicePortTier) || (b.serviceAccess - a.serviceAccess) || itemId(a).localeCompare(itemId(b)));
    const neurochipChannels = neurochip ? clamp(neurochip.controlChannels, 0, 99, 0) : 0;
    const interfaceLanes = bodyInterface ? clamp(bodyInterface.interfaceLanes, 0, 99, bodyInterface.interfaceCapacity || 0) : 0;
    const effectiveChannels = neurochip && bodyInterface ? Math.min(neurochipChannels, interfaceLanes) : 0;
    const protocolSupport = getEffectiveProtocolSupport(neurochip, bodyInterface);
    return {
      neurochip,
      interface: bodyInterface,
      servicePort,
      neurochipTier: neurochip?.neurochipTier || 0,
      interfaceTier: bodyInterface?.interfaceTier || 0,
      neuroCapacity: neurochip?.neuroCapacity || 0,
      interfaceCapacity: bodyInterface?.interfaceCapacity || 0,
      neurochipChannels,
      interfaceLanes,
      effectiveChannels,
      controlChannels: effectiveChannels,
      protocolSupport,
      supportedBuses: unique([...(neurochip?.supportedBuses || []), ...(bodyInterface?.supportedBuses || [])]),
      firmwareSlots: neurochip?.firmwareSlots || 0,
      maxCyberwareGrade: neurochip?.maxCyberwareGrade || "CIVILIAN",
      maxScale: neurochip?.maxScale || "SMALL"
    };
  }

  function buildAssessment(item = {}, context = {}, citizen = {}, allItems = []) {
    const base = item.baseAssessment || getBaseOperationalAssessment(item);
    const blockers = [...base.blockers];
    const warnings = [...base.warnings];
    if (base.state !== "ENABLED") return { ...base, blockers, warnings };

    if (item.isCoreInterface) {
      if (context.interface && itemId(context.interface) !== itemId(item)) return { state: "DISABLED", reason: "STANDBY_INTERFACE", blockers: ["STANDBY_INTERFACE"], warnings, condition: base.condition };
      return { state: "ENABLED", reason: "INTERFACE_READY", blockers, warnings, condition: base.condition };
    }

    if (item.isCoreProcessor) {
      if (context.neurochip && itemId(context.neurochip) !== itemId(item)) return { state: "DISABLED", reason: "STANDBY_NEUROCHIP", blockers: ["STANDBY_NEUROCHIP"], warnings, condition: base.condition };
      if (!context.interface) return { state: "LOCKED", reason: "NO_INTERFACE", blockers: ["NO_INTERFACE"], warnings, condition: base.condition };
      const socketRating = clamp(context.interface.neurochipSocketRating, 0, 10, context.interface.interfaceTier || 0);
      if (socketRating < clamp(item.neurochipTier, 0, 10, 0)) {
        return { state: "LOCKED", reason: "INTERFACE_SOCKET_RATING_TOO_LOW", blockers: ["INTERFACE_SOCKET_RATING_TOO_LOW"], warnings, condition: base.condition };
      }
      return { state: "ENABLED", reason: "NEUROCHIP_READY", blockers, warnings, condition: base.condition };
    }

    if (item.isServicePort) {
      if (context.servicePort && itemId(context.servicePort) !== itemId(item)) return { state: "DISABLED", reason: "STANDBY_SERVICE_PORT", blockers: ["STANDBY_SERVICE_PORT"], warnings, condition: base.condition };
      if (!context.interface) warnings.push("NO_INTERFACE_SERVICE_BRIDGE");
      return { state: "ENABLED", reason: "SERVICE_PORT_READY", blockers, warnings, condition: base.condition };
    }

    if (!context.neurochip) blockers.push("NO_NEUROCHIP");
    if (!context.interface) blockers.push("NO_INTERFACE");
    if (blockers.length) return { state: "LOCKED", reason: blockers[0], blockers, warnings, condition: base.condition };

    if (context.neurochipTier < clamp(item.requiresNeurochipTier, 0, 10, 0)) blockers.push("NEUROCHIP_TIER_TOO_LOW");
    if (context.interfaceTier < clamp(item.requiresInterfaceTier, 0, 10, 0)) blockers.push("INTERFACE_TIER_TOO_LOW");
    if (typeof getCyberwareGradeRank === "function" && getCyberwareGradeRank(item.grade) > getCyberwareGradeRank(context.maxCyberwareGrade)) blockers.push("NEUROCHIP_GRADE_LIMIT");
    if ((SCALE_RANK[normalizeToken(item.scale)] || 1) > (SCALE_RANK[normalizeToken(context.maxScale)] || 1)) blockers.push("NEUROCHIP_SCALE_LIMIT");

    const supportedProtocols = new Set(context.protocolSupport);
    getRequiredProtocolTokens(item).forEach((token) => {
      if (!supportedProtocols.has(token)) blockers.push(`PROTOCOL_UNSUPPORTED:${token}`);
    });

    const supportedBuses = new Set(context.supportedBuses || []);
    getRequiredBusTokens(item).forEach((token) => {
      if (!supportedBuses.has(token)) blockers.push(`INTERFACE_BUS_INCOMPATIBLE:${token}`);
    });

    const enabledIdentityTokens = new Set();
    allItems.filter((entry) => entry.baseAssessment?.state === "ENABLED").forEach((entry) => getIdentityTokenSet(entry).forEach((token) => enabledIdentityTokens.add(token)));
    getRequiredComponentStandards(item).forEach((token) => {
      if (!getIdentityTokenSet(item).has(token) && !enabledIdentityTokens.has(token)) blockers.push(`COMPONENT_STANDARD_MISSING:${token}`);
    });

    const access = typeof validateCyberwareAccessForItem === "function" ? validateCyberwareAccessForItem(citizen, item) : { valid: true, blockers: [], warnings: [] };
    if (access.valid === false) blockers.push(...(Array.isArray(access.blockers) ? access.blockers : [access.reason || "ACCESS_LOCKED"]));
    if (Array.isArray(access.warnings)) warnings.push(...access.warnings);

    return blockers.length
      ? { state: "LOCKED", reason: blockers[0], blockers: unique(blockers), warnings: unique(warnings), condition: base.condition }
      : { state: "ENABLED", reason: "DEPENDENCIES_READY", blockers: [], warnings: unique(warnings), condition: base.condition };
  }

  function enrichPlacementItem(item = {}, assessment = {}, allocation = {}) {
    const placementStatus = item.runtimeStatus || "";
    const placementReason = item.runtimeReason || "";
    const state = STATE_SET.has(assessment.state) ? assessment.state : "FAULT";
    return {
      ...item,
      placementStatus,
      placementReason,
      operationalState: state,
      operationalReason: assessment.reason || "UNKNOWN",
      operationalBlockers: unique(assessment.blockers || []),
      operationalWarnings: unique(assessment.warnings || []),
      operational: {
        state,
        reason: assessment.reason || "UNKNOWN",
        blockers: unique(assessment.blockers || []),
        warnings: unique(assessment.warnings || []),
        condition: assessment.condition ?? getCondition(item),
        allocation: { ...allocation }
      },
      resourceAllocation: { ...allocation },
      runtimeStatus: state,
      runtimeReason: assessment.reason || "UNKNOWN",
      isOperational: state === "ENABLED"
    };
  }

  function getCyberwareRuntimeState(citizenOrList = {}) {
    const citizen = Array.isArray(citizenOrList) ? {} : citizenOrList || {};
    const placement = getCyberwarePlacementState(citizenOrList);
    const sourceItems = uniqueItems([...(placement.installed || []), ...(placement.conflicts || []), ...(placement.unassigned || [])]);
    const items = sourceItems.map((item, index) => {
      const normalized = normalizeCyberwareEntry ? normalizeCyberwareEntry(item, index) : { ...item };
      const merged = { ...item, ...normalized, placementStatus: item.runtimeStatus || "", placementReason: item.runtimeReason || "" };
      merged.baseAssessment = getBaseOperationalAssessment(merged);
      return merged;
    });

    const core = buildCoreContext(items);
    const assessments = new Map();
    const coreItems = items.filter((item) => item.isCoreProcessor || item.isCoreInterface || item.isServicePort);
    coreItems.forEach((item) => assessments.set(itemId(item), buildAssessment(item, core, citizen, items)));
    const operationalContext = {
      ...core,
      neurochip: core.neurochip && assessments.get(itemId(core.neurochip))?.state === "ENABLED" ? core.neurochip : null,
      interface: core.interface && assessments.get(itemId(core.interface))?.state === "ENABLED" ? core.interface : null,
      servicePort: core.servicePort && assessments.get(itemId(core.servicePort))?.state === "ENABLED" ? core.servicePort : null
    };
    items.filter((item) => !item.isCoreProcessor && !item.isCoreInterface && !item.isServicePort)
      .forEach((item) => assessments.set(itemId(item), buildAssessment(item, operationalContext, citizen, items)));

    let interfaceLoad = 0;
    let channelLoad = 0;
    let neuroLoad = 0;
    const allocations = new Map();
    const candidates = items
      .filter((item) => !item.isCoreProcessor && !item.isCoreInterface && !item.isServicePort && assessments.get(itemId(item))?.state === "ENABLED")
      .sort(compareOperationalPriority);

    candidates.forEach((item) => {
      const id = itemId(item);
      const assessment = assessments.get(id);
      const neededInterface = clamp(item.interfaceLoad, 0, 99, 0);
      const neededChannels = getChannelCost(item);
      const neededNeuro = clamp(item.neuroLoad, 0, 99, 0);
      const allocation = {
        neuroLoad: neededNeuro,
        interfaceLoad: neededInterface,
        neuroChannels: neededChannels,
        priority: getOperationalPriority(item),
        allocated: false
      };
      if (interfaceLoad + neededInterface > core.interfaceCapacity) {
        assessments.set(id, { ...assessment, state: "DISABLED", reason: "INTERFACE_CAPACITY_EXCEEDED", blockers: ["INTERFACE_CAPACITY_EXCEEDED"], warnings: assessment.warnings || [] });
      } else if (channelLoad + neededChannels > core.effectiveChannels) {
        assessments.set(id, { ...assessment, state: "DISABLED", reason: "NEUROCHANNELS_EXCEEDED", blockers: ["NEUROCHANNELS_EXCEEDED"], warnings: assessment.warnings || [] });
      } else {
        interfaceLoad += neededInterface;
        channelLoad += neededChannels;
        neuroLoad += neededNeuro;
        allocation.allocated = true;
      }
      allocations.set(id, allocation);
    });

    const neuralStrain = Math.max(0, neuroLoad - core.neuroCapacity);
    if (neuralStrain > 0) {
      candidates.forEach((item) => {
        const id = itemId(item);
        const assessment = assessments.get(id);
        if (assessment?.state === "ENABLED") assessments.set(id, { ...assessment, warnings: unique([...(assessment.warnings || []), `NEURAL_STRAIN:${neuralStrain}`]) });
      });
    }

    const enrichedById = new Map();
    items.forEach((item) => {
      const id = itemId(item);
      enrichedById.set(id, enrichPlacementItem(item, assessments.get(id) || { state: "FAULT", reason: "ASSESSMENT_MISSING", blockers: ["ASSESSMENT_MISSING"], warnings: [] }, allocations.get(id) || { neuroLoad: 0, interfaceLoad: 0, neuroChannels: 0, priority: getOperationalPriority(item), allocated: item.isCoreProcessor || item.isCoreInterface || item.isServicePort }));
    });

    const enrich = (item) => enrichedById.get(itemId(item)) || item;
    const enrichedItems = items.map(enrich);
    const enabled = enrichedItems.filter((item) => item.operationalState === "ENABLED");
    const disabled = enrichedItems.filter((item) => item.operationalState === "DISABLED");
    const maintenance = enrichedItems.filter((item) => item.operationalState === "MAINTENANCE");
    const faults = enrichedItems.filter((item) => item.operationalState === "FAULT");
    const locked = enrichedItems.filter((item) => item.operationalState === "LOCKED");
    const enabledConditions = enabled.map(getCondition);

    const neuroSecurity = clamp(core.neurochip?.security, 0, 100, 0);
    const interfaceSecurity = clamp(core.interface?.securityIsolation, 0, 100, 0);
    const portSecurity = core.servicePort ? clamp(core.servicePort.securityLock, 0, 100, 0) : null;
    const securityScore = Math.round(weightedAverage([
      { value: neuroSecurity, weight: 0.55 },
      { value: interfaceSecurity, weight: 0.35 },
      ...(portSecurity === null ? [] : [{ value: portSecurity, weight: 0.10 }])
    ]));
    const baseStability = weightedAverage([
      { value: clamp(core.neurochip?.stability, 0, 100, 0), weight: 0.45 },
      { value: clamp(core.interface?.signalIntegrity, 0, 100, 0), weight: 0.30 },
      { value: clamp(core.interface?.redundancy, 0, 100, 0), weight: 0.10 },
      { value: enabledConditions.length ? enabledConditions.reduce((sum, value) => sum + value, 0) / enabledConditions.length : 100, weight: 0.15 }
    ]);
    const stabilityScore = Math.round(clamp(baseStability - neuralStrain * 3, 0, 100, 0));
    const latencyRank = Math.min(5, Math.max(resolveLatencyRank(core.neurochip?.latencyClass), resolveLatencyRank(core.interface?.latencyClass)) + (neuralStrain > 0 ? 1 : 0));
    const protocolSupport = [...core.protocolSupport].sort();

    const neuralCore = {
      ...placement.neuralCore,
      ...core,
      neurochip: core.neurochip ? enrich(core.neurochip) : null,
      interface: core.interface ? enrich(core.interface) : null,
      servicePort: core.servicePort ? enrich(core.servicePort) : null,
      neurochipLabel: core.neurochip ? `${core.neurochip.name} / T${core.neurochipTier}` : "NO NEUROCHIP",
      interfaceLabel: core.interface ? `${core.interface.name} / T${core.interfaceTier}` : "NO INTERFACE",
      servicePortLabel: core.servicePort ? `${core.servicePort.name} / T${core.servicePort.servicePortTier || 0}` : "NO SERVICE PORT",
      neuroLoad,
      installedNeuroLoad: candidates.reduce((sum, item) => sum + clamp(item.neuroLoad, 0, 99, 0), 0),
      neuroRemaining: Math.max(0, core.neuroCapacity - neuroLoad),
      neuralStrain,
      interfaceLoad,
      interfaceRemaining: Math.max(0, core.interfaceCapacity - interfaceLoad),
      channelLoad,
      channelRemaining: Math.max(0, core.effectiveChannels - channelLoad),
      controlChannels: core.effectiveChannels,
      neurochipChannels: core.neurochipChannels,
      interfaceLanes: core.interfaceLanes,
      protocolSupport,
      supportedBuses: core.supportedBuses,
      security: securityScore,
      stability: stabilityScore,
      latencyRank,
      latencyClass: LATENCY_LABEL[latencyRank],
      activeImplantCount: enabled.filter((item) => !item.isCoreProcessor && !item.isCoreInterface && !item.isServicePort).length,
      disabledImplantCount: disabled.filter((item) => !item.isCoreProcessor && !item.isCoreInterface && !item.isServicePort).length,
      systemState: !core.neurochip || !core.interface ? "LOCKED" : faults.length || locked.length || neuralStrain > 0 ? "DEGRADED" : "ENABLED",
      warnings: unique([
        ...(!core.neurochip ? ["NO_NEUROCHIP"] : []),
        ...(!core.interface ? ["NO_INTERFACE"] : []),
        ...(!core.servicePort ? ["NO_SERVICE_PORT"] : []),
        ...(neuralStrain > 0 ? [`NEURAL_STRAIN:${neuralStrain}`] : [])
      ])
    };

    const slots = (placement.slots || []).map((slot) => ({
      ...slot,
      item: slot.item ? enrich(slot.item) : null,
      items: (slot.items || []).map(enrich),
      conflicts: (slot.conflicts || []).map(enrich)
    }));
    const slotGroups = (placement.slotGroups || []).map((group) => ({
      ...group,
      slots: (group.slots || []).map((slot) => slots.find((candidate) => candidate.key === slot.key) || slot)
    }));

    return {
      ...placement,
      slots,
      slotGroups,
      installed: (placement.installed || []).map(enrich),
      conflicts: (placement.conflicts || []).map(enrich),
      unassigned: (placement.unassigned || []).map(enrich),
      occupiedSlots: slots.filter((slot) => slot.item),
      emptySlots: slots.filter((slot) => !slot.item),
      items: enrichedItems,
      operational: { enabled, disabled, maintenance, faults, locked },
      enabled,
      disabled,
      maintenance,
      faults,
      locked,
      neuralCore,
      counts: {
        ...(placement.counts || {}),
        total: enrichedItems.length,
        installed: enrichedItems.length,
        enabled: enabled.length,
        disabled: disabled.length,
        maintenance: maintenance.length,
        fault: faults.length,
        locked: locked.length,
        offline: enrichedItems.length - enabled.length,
        neuroLoad,
        neuroCapacity: core.neuroCapacity,
        neuralStrain,
        interfaceLoad,
        interfaceCapacity: core.interfaceCapacity,
        channelLoad,
        controlChannels: core.effectiveChannels
      }
    };
  }

  function uniqueItems(items = []) {
    const seen = new Set();
    return items.filter((item) => {
      const id = itemId(item);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function resolveCyberwareOperationalState(citizenOrList = {}, itemOrId = {}) {
    const id = typeof itemOrId === "string" ? itemOrId : itemId(itemOrId);
    const state = getCyberwareRuntimeState(citizenOrList);
    const item = state.items.find((entry) => itemId(entry) === id) || null;
    return item?.operational || { state: "DISABLED", reason: "ITEM_NOT_FOUND", blockers: ["ITEM_NOT_FOUND"], warnings: [], allocation: {} };
  }

  function getCyberwareRuntimeStatus(item = {}, citizenOrList = null) {
    if (STATE_SET.has(normalizeToken(item.operationalState))) return normalizeToken(item.operationalState);
    const legacyConflictSlots = Array.isArray(citizenOrList) && citizenOrList.every((entry) => typeof entry === "string");
    if (legacyConflictSlots) return getBaseOperationalAssessment({ ...item, conflictSlots: citizenOrList }).state;
    if (citizenOrList && (Array.isArray(citizenOrList) || typeof citizenOrList === "object")) {
      return resolveCyberwareOperationalState(citizenOrList, item).state;
    }
    return getBaseOperationalAssessment(item).state;
  }

  function isCyberwareOnline(item = {}) {
    if (item.operationalState) return normalizeToken(item.operationalState) === "ENABLED";
    return getBaseOperationalAssessment(item).state === "ENABLED";
  }

  function getCyberwareNeuralCoreState(citizenOrList = {}) {
    return getCyberwareRuntimeState(citizenOrList).neuralCore;
  }

  function getCyberwareSlotState(citizenOrList = {}) {
    return getCyberwareRuntimeState(citizenOrList).slots;
  }

  Object.assign(runtime, {
    CYBERWARE_OPERATIONAL_STATES,
    getCyberwareRuntimeState,
    getCyberwareRuntimeStatus,
    getCyberwareNeuralCoreState,
    getCyberwareSlotState,
    resolveCyberwareOperationalState,
    getCyberwareBaseOperationalAssessment: getBaseOperationalAssessment,
    getCyberwareChannelCost: getChannelCost,
    getCyberwareEffectiveProtocolSupport: getEffectiveProtocolSupport,
    getCyberwareRequiredProtocolTokens: getRequiredProtocolTokens,
    getCyberwareRequiredBusTokens: getRequiredBusTokens,
    getCyberwareRequiredComponentStandards: getRequiredComponentStandards,
    isCyberwareOnline
  });
})();
