(function initCyberwareCoreStack() {
  window.WS_APP = window.WS_APP || {};
  const runtimeApi = window.WS_APP.cyberwareRuntime || {};

  if (typeof runtimeApi.getCyberwareRuntimeState !== "function") {
    throw new Error("cyberware-runtime.js must be loaded before cyberware-core-stack.js.");
  }

  const CORE_KINDS = Object.freeze({
    NEUROCHIP: "NEUROCHIP",
    INTERFACE: "INTERFACE",
    SERVICE_PORT: "SERVICE_PORT"
  });

  function normalizeToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function unique(values = []) {
    return [...new Set((Array.isArray(values) ? values : [values]).map(normalizeToken).filter(Boolean))];
  }

  function number(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function itemId(item = {}) {
    return String(item.instanceId || item.id || item.itemId || "").trim();
  }

  function getRuntimeState(citizenOrRuntime = {}) {
    if (citizenOrRuntime && typeof citizenOrRuntime === "object" && citizenOrRuntime.neuralCore && Array.isArray(citizenOrRuntime.items)) {
      return citizenOrRuntime;
    }
    return runtimeApi.getCyberwareRuntimeState(citizenOrRuntime || {});
  }

  function getRequiredProtocols(item = {}) {
    return unique(item.requiredProtocols || item.protocolRequirements || []);
  }

  function getRequiredBuses(item = {}) {
    return unique(item.requiredBuses || []).filter((token) => token.endsWith("_BUS"));
  }

  function getRequiredStandards(item = {}) {
    return unique(item.requiredComponentStandards || item.requiredStandards || item.componentStandards || []);
  }

  function buildMetric(key, label, value, capacity = null, suffix = "") {
    const numericValue = number(value, 0);
    const numericCapacity = capacity === null || capacity === undefined ? null : number(capacity, 0);
    const ratio = numericCapacity === null || numericCapacity <= 0 ? null : Math.max(0, Math.min(1, numericValue / numericCapacity));
    return {
      key,
      label,
      value: numericValue,
      capacity: numericCapacity,
      remaining: numericCapacity === null ? null : Math.max(0, numericCapacity - numericValue),
      ratio,
      suffix
    };
  }

  function buildComponent(kind, item = null, core = {}) {
    if (!item) {
      return {
        kind,
        installed: false,
        id: "",
        name: kind === CORE_KINDS.SERVICE_PORT ? "NO SERVICE PORT" : `NO ${kind}`,
        tier: 0,
        state: kind === CORE_KINDS.SERVICE_PORT ? "OPTIONAL" : "MISSING",
        reason: kind === CORE_KINDS.SERVICE_PORT ? "SERVICE_PORT_OPTIONAL" : `${kind}_MISSING`,
        metrics: [],
        buses: [],
        blockers: kind === CORE_KINDS.SERVICE_PORT ? [] : [`NO_${kind}`],
        warnings: kind === CORE_KINDS.SERVICE_PORT ? ["NO_SERVICE_PORT"] : []
      };
    }

    const common = {
      kind,
      installed: true,
      id: itemId(item),
      playerLabel: String(item.playerLabel || "").trim(),
      catalogName: String(item.catalogName || item.model || item.name || itemId(item) || kind).trim(),
      name: item.name || item.model || itemId(item) || kind,
      manufacturer: item.manufacturer || item.provider || "",
      tier: number(item.neurochipTier ?? item.interfaceTier ?? item.servicePortTier ?? item.tier, 0),
      grade: normalizeToken(item.grade || item.maxCyberwareGrade || ""),
      condition: number(item.condition ?? item.durability?.current, 100),
      state: normalizeToken(item.operationalState || item.runtimeStatus || item.status || "ENABLED"),
      reason: normalizeToken(item.operationalReason || item.runtimeReason || "READY"),
      blockers: unique(item.operationalBlockers || item.operational?.blockers || []),
      warnings: unique(item.operationalWarnings || item.operational?.warnings || []),
      buses: unique(item.supportedBuses || []),
      protocols: unique(item.protocolSupport || item.supportedProtocols || [])
    };

    if (kind === CORE_KINDS.NEUROCHIP) {
      return {
        ...common,
        metrics: [
          { key: "NEURO_CAPACITY", label: "Neuroload", value: number(item.neuroCapacity, 0) },
          { key: "CONTROL_CHANNELS", label: "Channels", value: number(item.controlChannels, 0) },
          { key: "FIRMWARE_SLOTS", label: "Firmware", value: number(item.firmwareSlots, 0) },
          { key: "SECURITY", label: "Security", value: number(item.security, 0) },
          { key: "STABILITY", label: "Stability", value: number(item.stability, 0) },
          { key: "LATENCY", label: "Latency", value: normalizeToken(item.latencyClass || item.latency || core.latencyClass || "NONE"), textual: true },
          { key: "MAX_GRADE", label: "Max grade", value: normalizeToken(item.maxCyberwareGrade || "CIVILIAN"), textual: true },
          { key: "MAX_SCALE", label: "Max scale", value: normalizeToken(item.maxScale || "SMALL"), textual: true }
        ]
      };
    }

    if (kind === CORE_KINDS.INTERFACE) {
      return {
        ...common,
        metrics: [
          { key: "INTERFACE_CAPACITY", label: "Bus capacity", value: number(item.interfaceCapacity, 0) },
          { key: "INTERFACE_LANES", label: "Lanes", value: number(item.interfaceLanes, 0) },
          { key: "SOCKET_RATING", label: "Socket", value: `T${number(item.neurochipSocketRating ?? item.interfaceTier, 0)}`, textual: true },
          { key: "SIGNAL_INTEGRITY", label: "Signal", value: number(item.signalIntegrity, 0) },
          { key: "SECURITY_ISOLATION", label: "Isolation", value: number(item.securityIsolation, 0) },
          { key: "REDUNDANCY", label: "Redundancy", value: number(item.redundancy, 0) },
          { key: "POWER_ROUTING", label: "Power", value: number(item.powerRouting, 0) },
          { key: "THERMAL_ROUTING", label: "Thermal", value: number(item.thermalRouting, 0) }
        ]
      };
    }

    return {
      ...common,
      metrics: [
        { key: "SERVICE_ACCESS", label: "Service", value: number(item.serviceAccess, 0) },
        { key: "DIAGNOSTIC_DEPTH", label: "Diagnostics", value: number(item.diagnosticDepth, 0) },
        { key: "FIRMWARE_ACCESS", label: "Firmware", value: number(item.firmwareAccess, 0) },
        { key: "CALIBRATION", label: "Calibration", value: number(item.calibrationQuality, 0) },
        { key: "SECURITY_LOCK", label: "Security", value: number(item.securityLock, 0) },
        { key: "EMERGENCY_ACCESS", label: "Emergency", value: number(item.emergencyAccess, 0) },
        { key: "TRACEABILITY", label: "Trace", value: number(item.traceability, 0) }
      ]
    };
  }

  function buildCoreLink(core = {}) {
    const neurochip = core.neurochip || null;
    const bodyInterface = core.interface || null;
    if (!neurochip || !bodyInterface) {
      return {
        state: "BLOCKED",
        reason: !neurochip ? "NO_NEUROCHIP" : "NO_INTERFACE",
        socketRating: number(bodyInterface?.neurochipSocketRating ?? bodyInterface?.interfaceTier, 0),
        neurochipTier: number(neurochip?.neurochipTier, 0),
        effectiveChannels: number(core.controlChannels ?? core.effectiveChannels, 0),
        effectiveProtocols: unique(core.protocolSupport || [])
      };
    }
    const socketRating = number(bodyInterface.neurochipSocketRating ?? bodyInterface.interfaceTier, 0);
    const neurochipTier = number(neurochip.neurochipTier, 0);
    return {
      state: socketRating >= neurochipTier ? "READY" : "BLOCKED",
      reason: socketRating >= neurochipTier ? "SOCKET_COMPATIBLE" : "INTERFACE_SOCKET_RATING_TOO_LOW",
      socketRating,
      neurochipTier,
      effectiveChannels: number(core.controlChannels ?? core.effectiveChannels, 0),
      effectiveProtocols: unique(core.protocolSupport || [])
    };
  }

  function buildCompatibilityEntry(item = {}, core = {}) {
    const supportedProtocols = new Set(unique(core.protocolSupport || []));
    const requiredProtocols = getRequiredProtocols(item);
    const missingProtocols = requiredProtocols.filter((token) => !supportedProtocols.has(token));
    const supportedBuses = new Set(unique(core.supportedBuses || []));
    const requiredBuses = getRequiredBuses(item);
    const missingBuses = requiredBuses.filter((token) => !supportedBuses.has(token));
    const allocation = item.resourceAllocation || item.operational?.allocation || {};
    return {
      id: itemId(item),
      name: item.name || item.model || itemId(item) || "CYBERWARE",
      slot: item.slotDisplayLabel || item.slotLabel || item.primarySlot || item.slot || "UNASSIGNED",
      state: normalizeToken(item.operationalState || item.runtimeStatus || item.status || "DISABLED"),
      reason: normalizeToken(item.operationalReason || item.runtimeReason || "UNKNOWN"),
      requiredProtocols,
      missingProtocols,
      requiredBuses,
      missingBuses,
      requiredStandards: getRequiredStandards(item),
      allocation: {
        neuroLoad: number(allocation.neuroLoad ?? item.neuroLoad, 0),
        neuroChannels: number(allocation.neuroChannels, item.isCoreProcessor || item.isCoreInterface || item.isServicePort ? 0 : 1),
        interfaceLoad: number(allocation.interfaceLoad ?? item.interfaceLoad, 0),
        allocated: allocation.allocated === true
      },
      blockers: unique(item.operationalBlockers || item.operational?.blockers || []),
      warnings: unique(item.operationalWarnings || item.operational?.warnings || [])
    };
  }

  function getCyberwareCoreStackViewModel(citizenOrRuntime = {}) {
    const runtimeState = getRuntimeState(citizenOrRuntime);
    const core = runtimeState.neuralCore || {};
    const installed = Array.isArray(runtimeState.installed) ? runtimeState.installed : [];
    const dependent = installed.filter((item) => !item.isCoreProcessor && !item.isCoreInterface && !item.isServicePort);
    const coreWarnings = unique(core.warnings || []);

    return {
      systemState: normalizeToken(core.systemState || (!core.neurochip || !core.interface ? "LOCKED" : "ENABLED")),
      warnings: coreWarnings,
      resources: [
        buildMetric("NEUROLOAD", "Neuroload", core.neuroLoad, core.neuroCapacity),
        buildMetric("NEUROCHANNELS", "Neurochannels", core.channelLoad, core.controlChannels),
        buildMetric("INTERFACE_LOAD", "Interface load", core.interfaceLoad, core.interfaceCapacity)
      ],
      quality: [
        { key: "SECURITY", label: "Security", value: number(core.security, 0) },
        { key: "STABILITY", label: "Stability", value: number(core.stability, 0) },
        { key: "NEUROLATENCY", label: "Neurolatency", value: normalizeToken(core.latencyClass || "NONE"), textual: true },
        { key: "NEURAL_STRAIN", label: "Neural strain", value: number(core.neuralStrain, 0) }
      ],
      limits: {
        maxCyberwareGrade: normalizeToken(core.maxCyberwareGrade || "CIVILIAN"),
        maxScale: normalizeToken(core.maxScale || "SMALL"),
        firmwareSlots: number(core.firmwareSlots, 0),
        activeImplantCount: number(core.activeImplantCount, 0),
        disabledImplantCount: number(core.disabledImplantCount, 0)
      },
      components: [
        buildComponent(CORE_KINDS.NEUROCHIP, core.neurochip || null, core),
        buildComponent(CORE_KINDS.INTERFACE, core.interface || null, core),
        buildComponent(CORE_KINDS.SERVICE_PORT, core.servicePort || null, core)
      ],
      coreLink: buildCoreLink(core),
      protocols: unique(core.protocolSupport || []).filter((token) => !token.endsWith("_BUS")),
      buses: unique(core.supportedBuses || []),
      compatibility: dependent.map((item) => buildCompatibilityEntry(item, core)),
      dependentItems: dependent,
      runtime: runtimeState,
      core
    };
  }

  const api = window.WS_APP.cyberwareCoreStack = window.WS_APP.cyberwareCoreStack || {};
  Object.assign(api, {
    CORE_KINDS,
    getCyberwareCoreStackViewModel
  });
  window.WS_APP.getCyberwareCoreStackViewModel = getCyberwareCoreStackViewModel;
})();
