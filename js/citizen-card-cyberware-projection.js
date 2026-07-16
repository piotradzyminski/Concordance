window.WS_APP = window.WS_APP || {};

(function initCitizenCardCyberwareProjection(app) {
  "use strict";

  const projection = app.citizenCardProjection = app.citizenCardProjection || {};
  const OFFLINE_STATES = new Set(["DISABLED", "FAULT", "LOCKED", "MAINTENANCE", "SUSPENDED", "DAMAGED", "REJECTED", "OFFLINE", "BROKEN"]);
  const CORE_SLOT_KEYS = new Set(["NEURAL", "INTERFACE", "SERVICE_PORT", "NECK_SERVICE"]);
  const SLOT_LABELS = {
    NEURAL: "Neural Core",
    INTERFACE: "Occipital Interface",
    SERVICE_PORT: "Service Port",
    NECK_SERVICE: "Service Port",
    LEFT_EYE: "Left Eye",
    RIGHT_EYE: "Right Eye",
    LEFT_EAR: "Left Ear",
    RIGHT_EAR: "Right Ear",
    LEFT_HAND_CORE: "Left Hand Core",
    RIGHT_HAND_CORE: "Right Hand Core",
    LEFT_ARM: "Left Arm",
    RIGHT_ARM: "Right Arm",
    LEFT_LEG: "Left Leg",
    RIGHT_LEG: "Right Leg",
    SPINE: "Spine",
    TORSO: "Torso"
  };

  function normalizeToken(value) {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function unique(values = []) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function getCitizenId(citizenOrId = {}) {
    return typeof citizenOrId === "string"
      ? String(citizenOrId).trim()
      : String(citizenOrId?.id || citizenOrId?.citizenId || "").trim();
  }

  function getSlots(item = {}) {
    const source = Array.isArray(item.bodySlots) && item.bodySlots.length
      ? item.bodySlots
      : Array.isArray(item.slots) && item.slots.length
        ? item.slots
        : [item.slot || item.primarySlot].filter(Boolean);
    return unique(source.map((slot) => String(slot || "").trim()).filter(Boolean));
  }

  function isCoreProcessor(item = {}) {
    return item.isCoreProcessor === true || normalizeToken(item.subtype) === "NEUROCHIP" || normalizeToken(item.processorRole) === "NEUROCHIP";
  }

  function isCoreInterface(item = {}) {
    return item.isCoreInterface === true || normalizeToken(item.subtype) === "INTERFACE" || normalizeToken(item.processorRole) === "INTERFACE_BACKPLANE";
  }

  function isServicePort(item = {}) {
    return item.isServicePort === true || normalizeToken(item.subtype) === "SERVICE_PORT" || getSlots(item).some((slot) => ["SERVICE_PORT", "NECK_SERVICE"].includes(normalizeToken(slot)));
  }

  function getStatus(item = {}) {
    const explicit = normalizeToken(item.operationalState || item.runtimeStatus || item.operatingStatus || item.status || "INSTALLED");
    if (number(item.condition ?? item.durability?.current, 100) <= 0) return "FAULT";
    if (["INSTALLED", "ACTIVE", "ONLINE", "READY", "FULL"].includes(explicit)) return "ENABLED";
    return explicit || "ENABLED";
  }

  function humanize(value = "") {
    return String(value || "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .trim()
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  function getSlotLabel(slot = "") {
    const token = normalizeToken(slot);
    return SLOT_LABELS[token] || humanize(slot || "UNASSIGNED") || "UNASSIGNED";
  }

  function getSlotsLabel(slots = []) {
    const values = Array.isArray(slots) ? slots : [slots];
    const labels = unique(values.filter(Boolean).map(getSlotLabel));
    return labels.length ? labels.join(" / ") : "UNASSIGNED";
  }

  function getScaleLabel(scale = "") {
    const token = normalizeToken(scale || "SMALL");
    return `${humanize(token)} Implant`;
  }

  function getEntitledSubscriptions(citizen = {}) {
    if (typeof app.getCitizenEntitledSubscriptions === "function") {
      return app.getCitizenEntitledSubscriptions(citizen) || [];
    }
    return (Array.isArray(citizen?.subscriptions) ? citizen.subscriptions : []).filter((subscription) => subscription.active === true);
  }

  function getCompliancePresentation(item = {}, citizen = {}) {
    const licenseStatus = normalizeToken(item.licenseStatus || item.authorizationRefs?.licenseStatus || (item.authorizationRefs?.licenseId ? "ACTIVE" : "UNKNOWN"));
    const firmwareStatus = normalizeToken(item.firmwareStatus || item.authorizationRefs?.firmwareStatus || (item.cyberwareState?.installedFirmware?.length ? "CURRENT" : "UNKNOWN"));
    const requiredCategory = normalizeToken(item.subscriptionCategory || item.requiresSubscriptionCategory || "CYBERWARE");
    const subscriptions = getEntitledSubscriptions(citizen);
    const matchingSubscription = subscriptions.find((subscription) => {
      const category = normalizeToken(subscription.category || subscription.displaySnapshot?.category || subscription.subscriptionCategory || "");
      return category === requiredCategory || normalizeToken(subscription.subscriptionCatalogId).includes(requiredCategory);
    });
    const subscriptionStatus = item.subscriptionRequired || item.requiresSubscriptionCategory
      ? matchingSubscription ? "ACTIVE" : "MISSING"
      : "NOT_REQUIRED";

    const blockers = [];
    if (item.licenseRequired && ["SUSPENDED", "REVOKED", "EXPIRED", "UNACTIVATED", "MISSING"].includes(licenseStatus)) blockers.push(`LICENSE_${licenseStatus}`);
    if (item.firmwareRequired && ["REVOKED", "BLOCKED", "MISSING"].includes(firmwareStatus)) blockers.push(`FIRMWARE_${firmwareStatus}`);
    if ((item.subscriptionRequired || item.requiresSubscriptionCategory) && subscriptionStatus === "MISSING") blockers.push("SUBSCRIPTION_MISSING");

    return {
      valid: blockers.length === 0,
      reason: blockers[0] || "COMPLIANT",
      licenseLabel: humanize(licenseStatus || "UNKNOWN"),
      firmwareLabel: humanize(firmwareStatus || "UNKNOWN"),
      subscriptionLabel: matchingSubscription
        ? String(matchingSubscription.displaySnapshot?.tierLabel || matchingSubscription.tierLabel || matchingSubscription.tierId || requiredCategory)
        : humanize(requiredCategory)
    };
  }

  function getInstalledViews(citizenOrId = {}) {
    const citizenId = getCitizenId(citizenOrId);
    if (citizenId && typeof app.getInstalledCyberwareInstanceViews === "function") {
      return app.getInstalledCyberwareInstanceViews(citizenId) || [];
    }
    const citizen = typeof citizenOrId === "object" ? citizenOrId : app.getCitizenById?.(citizenId);
    return Array.isArray(citizen?.cyberwareList) ? citizen.cyberwareList : [];
  }

  function enrich(item = {}) {
    const slots = getSlots(item);
    const status = getStatus(item);
    return {
      ...item,
      id: item.id || item.instanceId || item.definitionId,
      instanceId: item.instanceId || item.id || "",
      name: item.displayName || item.name || item.model || "Cyberware",
      slots,
      slot: slots[0] || item.slot || "",
      primarySlot: slots[0] || item.primarySlot || item.slot || "",
      slotLabel: getSlotLabel(slots[0] || item.slot),
      slotDisplayLabel: getSlotLabel(slots[0] || item.slot),
      slotsLabel: getSlotsLabel(slots),
      slotsGroupedLabel: getSlotsLabel(slots),
      scaleLabel: getScaleLabel(item.scale || item.size),
      runtimeStatus: status,
      operationalState: status,
      runtimeReason: OFFLINE_STATES.has(status) ? status : "READY",
      isCoreProcessor: isCoreProcessor(item),
      isCoreInterface: isCoreInterface(item),
      isServicePort: isServicePort(item)
    };
  }

  function buildNeuralCore(items = []) {
    const neurochip = items.find((item) => item.isCoreProcessor) || null;
    const bodyInterface = items.find((item) => item.isCoreInterface) || null;
    const servicePort = items.find((item) => item.isServicePort) || null;
    const dependent = items.filter((item) => !item.isCoreProcessor && !item.isCoreInterface && !item.isServicePort);
    const enabledDependent = dependent.filter((item) => !OFFLINE_STATES.has(item.runtimeStatus));
    const neuroLoad = enabledDependent.reduce((sum, item) => sum + number(item.neuroLoad, 0), 0);
    const interfaceLoad = enabledDependent.reduce((sum, item) => sum + number(item.interfaceLoad, 0), 0);
    const neuroCapacity = number(neurochip?.neuroCapacity ?? neurochip?.neuroLoadCapacity, 0);
    const interfaceCapacity = number(bodyInterface?.interfaceCapacity ?? bodyInterface?.bodyBusRating, 0);
    const controlChannels = number(neurochip?.controlChannels ?? neurochip?.neuroChannels, 0);
    const interfaceLanes = number(bodyInterface?.interfaceLanes ?? bodyInterface?.lines, controlChannels);

    return {
      neurochip,
      interface: bodyInterface,
      servicePort,
      neurochipLabel: neurochip?.name || neurochip?.model || "NO NEUROCHIP",
      interfaceLabel: bodyInterface?.name || bodyInterface?.model || "NO INTERFACE",
      servicePortLabel: servicePort?.name || servicePort?.model || "NO SERVICE PORT",
      neuroLoad,
      neuroCapacity,
      interfaceLoad,
      interfaceCapacity,
      controlChannels: Math.min(controlChannels || interfaceLanes, interfaceLanes || controlChannels),
      firmwareSlots: number(neurochip?.firmwareSlots, 0),
      maxCyberwareGrade: neurochip?.maxCyberwareGrade || neurochip?.qualityCeiling || neurochip?.grade || "CIVILIAN",
      maxScale: neurochip?.maxScale || neurochip?.maxImplantSize || "SMALL",
      latencyClass: neurochip?.latencyClass || neurochip?.latency || "NONE",
      supportedBuses: unique([...(neurochip?.supportedBuses || []), ...(bodyInterface?.supportedBuses || [])]),
      serviceAccess: servicePort?.serviceAccess || servicePort?.tier || "",
      diagnosticDepth: servicePort?.diagnosticDepth || "",
      firmwareAccess: servicePort?.firmwareAccess || "",
      securityLock: servicePort?.securityLock || servicePort?.security || "",
      activeImplantCount: enabledDependent.length,
      disabledImplantCount: dependent.length - enabledDependent.length,
      systemState: !neurochip || !bodyInterface ? "LOCKED" : neuroLoad > neuroCapacity || interfaceLoad > interfaceCapacity ? "DEGRADED" : "ENABLED"
    };
  }

  function getRuntimeState(citizenOrId = {}) {
    const items = getInstalledViews(citizenOrId).map(enrich);
    const slotOwners = new Map();
    items.forEach((item) => {
      if (item.isCoreProcessor || item.isCoreInterface || item.isServicePort) return;
      item.slots.forEach((slot) => {
        const token = normalizeToken(slot);
        if (!token || CORE_SLOT_KEYS.has(token)) return;
        const list = slotOwners.get(token) || [];
        list.push(item);
        slotOwners.set(token, list);
      });
    });

    const conflictIds = new Set();
    slotOwners.forEach((owners) => {
      if (owners.length > 1) owners.forEach((item) => conflictIds.add(item.instanceId || item.id));
    });

    const installed = [];
    const conflicts = [];
    const unassigned = [];
    items.forEach((item) => {
      if (!item.slots.length) unassigned.push(item);
      else if (conflictIds.has(item.instanceId || item.id)) conflicts.push({ ...item, runtimeStatus: "FAULT", runtimeReason: "SLOT_CONFLICT" });
      else installed.push(item);
    });

    const neuralCore = buildNeuralCore(items);
    const offlineIds = new Set(
      items
        .filter((item) => OFFLINE_STATES.has(item.runtimeStatus))
        .map((item) => item.instanceId || item.id)
        .filter(Boolean)
    );
    conflicts.forEach((item) => offlineIds.add(item.instanceId || item.id));
    const offline = offlineIds.size;
    const occupiedSlots = unique(items.flatMap((item) => item.slots).filter((slot) => !CORE_SLOT_KEYS.has(normalizeToken(slot)))).length;
    const slotCost = items.reduce((sum, item) => sum + number(item.slotCost ?? item.slotsUsed, item.slots.length || 0), 0);

    return {
      items,
      installed,
      conflicts,
      unassigned,
      neuralCore,
      counts: {
        total: items.length,
        installed: items.length,
        conflicts: conflicts.length,
        unassigned: unassigned.length,
        offline,
        occupiedSlots,
        slotCost,
        neuroLoad: neuralCore.neuroLoad,
        neuroCapacity: neuralCore.neuroCapacity,
        interfaceLoad: neuralCore.interfaceLoad,
        interfaceCapacity: neuralCore.interfaceCapacity,
        controlChannels: neuralCore.controlChannels
      }
    };
  }

  Object.assign(projection, {
    getCyberwareRuntimeState: getRuntimeState,
    getCyberwareCompliancePresentation: getCompliancePresentation,
    getCyberwareSlotLabel: getSlotLabel,
    getCyberwareSlotsLabel: getSlotsLabel,
    getCyberwareSlotsGroupedLabel: getSlotsLabel,
    getCyberwareScaleLabel: getScaleLabel
  });
})(window.WS_APP);
