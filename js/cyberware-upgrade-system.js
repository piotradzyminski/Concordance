window.WS_APP = window.WS_APP || {};

(function initCyberwareUpgradeSystem() {
  "use strict";

  const app = window.WS_APP;
  const config = window.APP_DATA?.cyberwareUpgradeSystem || {};
  const API_VERSION = "cyberware_upgrade_system_16_1x";
  const SCALE_RANK = Object.freeze({ SMALL: 1, MEDIUM: 2, LARGE: 3, FULL_SET: 4 });
  const MODULE_SOURCE_LOCATIONS = new Set(["HOUSING_STORAGE", "CONTAINER_GRID", "CONTAINER_SLOT", "UNPLACED", "SERVICE"]);
  let sequence = 0;

  if (app.CyberwareUpgradeSystem?.version === API_VERSION) return;

  function clone(value) { if (value == null) return value; try { return structuredClone(value); } catch (_) { return JSON.parse(JSON.stringify(value)); } }
  function id(value = "") { return String(value || "").trim(); }
  function token(value = "") { return id(value).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
  function unique(values = []) { return [...new Set((Array.isArray(values) ? values : [values]).map(id).filter(Boolean))]; }
  function uniqueTokens(values = []) { return [...new Set((Array.isArray(values) ? values : [values]).map(token).filter(Boolean))]; }
  function finite(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
  function nextKey(prefix = "cyberware-upgrade") { sequence += 1; return `${prefix}:${Date.now()}:${sequence}`; }
  function now() { return id(app.getCampaignTimeIso?.() || app.getCampaignDateIso?.() || app.CAMPAIGN_TIME_ISO || app.CAMPAIGN_DATE_ISO || new Date().toISOString()); }

  function getScalePolicy(scale = "SMALL") {
    return clone(config.scalePolicies?.[token(scale)] || config.scalePolicies?.SMALL || { upgradeCapacity: 0, moduleSlotCount: 0, firmwareCapacity: 0, permanentModificationCapacity: 0 });
  }

  function getModuleDefinitions() { return (config.moduleDefinitions || []).map(clone); }
  function getModuleDefinition(definitionId = "") { const key = id(definitionId); return getModuleDefinitions().find((entry) => id(entry.id) === key) || null; }
  function getPermanentModificationDefinitions() { return (config.permanentModificationDefinitions || []).map(clone); }
  function getPermanentModificationDefinition(modificationId = "") { const key = id(modificationId); return getPermanentModificationDefinitions().find((entry) => id(entry.id) === key) || null; }

  function getDefinition(itemOrId = {}) {
    const item = typeof itemOrId === "object" ? itemOrId : null;
    const definitionId = id(item?.definitionId || itemOrId);
    return app.getCyberwareCatalogItem?.(definitionId) || (item ? clone(item) : null);
  }

  function resolveHostDomain(itemOrDefinition = {}) {
    const source = itemOrDefinition || {};
    if (source.isCoreProcessor || token(source.processorRole) === "NEUROCHIP") return "NEUROCHIP";
    if (source.isCoreInterface || /INTERFACE|BODY_BUS/.test(token(source.processorRole))) return "INTERFACE";
    if (source.isServicePort || token(source.catalogDomain) === "SERVICE_PORT") return "SERVICE_PORT";
    const candidates = [source.catalogDomain, source.subtype, source.bodyCategory, source.category, source.primarySlot, ...(source.tags || [])].map(token);
    const ordered = ["OCULAR", "AUDIO", "NEURAL", "HEAD", "FOREARM", "FINGER", "HAND", "ARM", "FOOT", "LEG", "TORSO", "ORGAN", "DERMAL", "SKELETAL", "SPINE"];
    return ordered.find((entry) => candidates.some((candidate) => candidate.includes(entry))) || "IMPLANT";
  }

  function makeSlots(domain = "IMPLANT", count = 0) {
    const slotTypes = config.domainSlotTemplates?.[domain] || config.domainSlotTemplates?.IMPLANT || ["UTILITY", "SECURITY", "PROCESSOR"];
    return Array.from({ length: Math.max(0, count) }, (_, index) => {
      const slotType = token(slotTypes[index % slotTypes.length] || "UTILITY");
      return { slotId: `${slotType.toLowerCase()}-${index + 1}`, slotType };
    });
  }

  function getInstalledModules(parentInstanceId = "") {
    const parentId = id(parentInstanceId);
    return (app.getItemInstances?.({ includeDisposed: false }) || [])
      .filter((instance) => token(instance?.location?.type) === "INSTALLED_IN_ITEM" && id(instance.location.parentItemInstanceId) === parentId)
      .map((instance) => app.getItemInstanceView?.(instance.instanceId) || clone(instance));
  }

  function getPermanentModifications(host = {}) {
    return Array.isArray(host?.cyberwareState?.permanentModifications) ? clone(host.cyberwareState.permanentModifications) : [];
  }

  function getCyberwareUpgradeProfile(hostOrId = {}) {
    const raw = typeof hostOrId === "string" ? app.getItemInstanceView?.(hostOrId) || app.getItemInstanceById?.(hostOrId) : hostOrId;
    if (!raw) return null;
    const definition = getDefinition(raw) || raw;
    if (token(definition.catalogDomain || definition.subtype) === "CYBERWARE_MODULE" || token(definition.itemType) === "CYBERWARE_MODULE") return null;
    const scale = token(definition.scale || raw.scale || "SMALL") || "SMALL";
    const policy = getScalePolicy(scale);
    const override = clone(config.hostOverrides?.[id(definition.id || raw.definitionId)] || {});
    const permanent = getPermanentModifications(raw);
    const permanentEffects = permanent.reduce((sum, record) => {
      const definition = getPermanentModificationDefinition(record.modificationId || record.id);
      const effects = definition?.effects || record.effects || {};
      sum.upgradeCapacity += finite(effects.upgradeCapacity, 0);
      sum.firmwareCapacity += finite(effects.firmwareCapacity, 0);
      return sum;
    }, { upgradeCapacity: 0, firmwareCapacity: 0 });
    const domain = resolveHostDomain(definition);
    const explicitSlots = Array.isArray(override.moduleSlots) ? override.moduleSlots : Array.isArray(definition.moduleSlots) ? definition.moduleSlots : [];
    const moduleSlotCount = Math.max(0, Math.round(finite(override.moduleSlotCount ?? definition.moduleSlotCount, policy.moduleSlotCount)));
    const moduleSlots = (explicitSlots.length ? explicitSlots : makeSlots(domain, moduleSlotCount)).map((slot, index) => ({
      slotId: id(slot.slotId || `${token(slot.slotType || "UTILITY").toLowerCase()}-${index + 1}`),
      slotType: token(slot.slotType || "UTILITY"),
      acceptedModuleDefinitionIds: unique(slot.acceptedModuleDefinitionIds || slot.acceptedModuleIds),
      acceptedManufacturers: uniqueTokens(slot.acceptedManufacturers),
      requiredProtocols: uniqueTokens(slot.requiredProtocols)
    }));
    const installedModules = getInstalledModules(raw.instanceId);
    const slots = moduleSlots.map((slot) => ({
      ...slot,
      installedModule: installedModules.find((module) => id(module.location?.moduleSlotId || module.moduleSlotId) === slot.slotId) || null
    }));
    const capacity = Math.max(0, Math.round(finite(override.upgradeCapacity ?? definition.upgradeCapacity, policy.upgradeCapacity) + permanentEffects.upgradeCapacity));
    const usedCapacity = installedModules.reduce((sum, module) => sum + Math.max(1, Math.round(finite(getModuleDefinition(module.definitionId)?.moduleProfile?.upgradeCapacityCost || module.moduleProfile?.upgradeCapacityCost, 1))), 0);
    const installedFirmware = Array.isArray(raw.cyberwareState?.installedFirmware) ? raw.cyberwareState.installedFirmware : [];
    const moduleFirmwareCapacity = installedModules.reduce((sum, module) => sum + finite(getModuleProfile(module)?.effects?.firmwareCapacity, 0), 0);
    const baseFirmwareCapacity = raw.isCoreProcessor ? finite(raw.firmwareSlots, policy.firmwareCapacity) : finite(override.firmwareCapacity ?? definition.firmwareCapacity, policy.firmwareCapacity);
    const firmwareCapacity = Math.max(0, Math.round(baseFirmwareCapacity + permanentEffects.firmwareCapacity + moduleFirmwareCapacity));
    const usedFirmwareCapacity = installedFirmware.reduce((sum, record) => sum + Math.max(1, Math.round(finite(record.capacityCost, 1))), 0);
    const permanentCapacity = Math.max(0, Math.round(finite(override.permanentModificationCapacity ?? definition.permanentModificationCapacity, policy.permanentModificationCapacity)));
    const usedPermanentCapacity = permanent.reduce((sum, record) => sum + Math.max(1, Math.round(finite(getPermanentModificationDefinition(record.modificationId || record.id)?.capacityCost || record.capacityCost, 1))), 0);
    return {
      hostInstanceId: id(raw.instanceId), definitionId: id(raw.definitionId), scale, domain,
      upgradeCapacity: capacity, usedUpgradeCapacity: usedCapacity, freeUpgradeCapacity: Math.max(0, capacity - usedCapacity),
      moduleSlots: slots, installedModules,
      firmwareCapacity, usedFirmwareCapacity, freeFirmwareCapacity: Math.max(0, firmwareCapacity - usedFirmwareCapacity), installedFirmware: clone(installedFirmware),
      permanentModificationCapacity: permanentCapacity, usedPermanentModificationCapacity: usedPermanentCapacity,
      freePermanentModificationCapacity: Math.max(0, permanentCapacity - usedPermanentCapacity), permanentModifications: permanent
    };
  }

  function getModuleProfile(moduleOrDefinition = {}) {
    const source = typeof moduleOrDefinition === "string" ? getModuleDefinition(moduleOrDefinition) : moduleOrDefinition || {};
    const definition = getModuleDefinition(source.definitionId || source.id) || source;
    return definition?.moduleProfile ? { definitionId: id(definition.id || source.definitionId), ...clone(definition.moduleProfile) } : null;
  }

  function getCompatibleCyberwareModuleCandidates(citizenId = "", hostInstanceId = "", slotId = "", options = {}) {
    const host = app.getItemInstanceView?.(hostInstanceId) || app.getItemInstanceById?.(hostInstanceId);
    const profile = getCyberwareUpgradeProfile(host);
    const slot = profile?.moduleSlots.find((entry) => entry.slotId === id(slotId));
    const allowOccupied = options.includeOccupied === true;
    if (!host || !profile || !slot || (slot.installedModule && !allowOccupied)) return [];
    const oldCapacityCost = slot.installedModule
      ? Math.max(1, Math.round(finite(getModuleProfile(slot.installedModule)?.upgradeCapacityCost, 1)))
      : 0;
    return (app.getCitizenItemInstances?.(citizenId, { includeBody: true, includeDisposed: false }) || [])
      .map((instance) => app.getItemInstanceView?.(instance.instanceId) || instance)
      .filter((instance) => MODULE_SOURCE_LOCATIONS.has(token(instance.locationData?.type || instance.location?.type || instance.location)))
      .filter((instance) => {
        const result = validateCyberwareModuleCompatibility({ citizenId, hostInstanceId, moduleInstanceId: instance.instanceId, slotId });
        if (result.ok) return true;
        if (!allowOccupied) return false;
        const blockers = (result.blockers || []).filter((code) => !["CYBERWARE_MODULE_SLOT_OCCUPIED", "CYBERWARE_UPGRADE_CAPACITY_EXCEEDED"].includes(code));
        const newCapacityCost = Math.max(1, Math.round(finite(result.moduleProfile?.upgradeCapacityCost, 1)));
        return blockers.length === 0 && profile.freeUpgradeCapacity + oldCapacityCost >= newCapacityCost;
      })
      .map(clone);
  }

  function validateCyberwareModuleCompatibility(input = {}) {
    const citizenId = id(input.citizenId);
    const host = app.getItemInstanceView?.(id(input.hostInstanceId)) || app.getItemInstanceById?.(id(input.hostInstanceId));
    const module = app.getItemInstanceView?.(id(input.moduleInstanceId)) || app.getItemInstanceById?.(id(input.moduleInstanceId));
    if (!host) return { ok: false, reason: "CYBERWARE_UPGRADE_HOST_NOT_FOUND", blockers: ["CYBERWARE_UPGRADE_HOST_NOT_FOUND"] };
    if (!module) return { ok: false, reason: "CYBERWARE_MODULE_NOT_FOUND", blockers: ["CYBERWARE_MODULE_NOT_FOUND"] };
    if (id(host.ownerId) !== citizenId || id(module.ownerId) !== citizenId) return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH", blockers: ["ITEM_INSTANCE_OWNER_MISMATCH"] };
    if (!MODULE_SOURCE_LOCATIONS.has(token(module.locationData?.type || module.location?.type || module.location))) return { ok: false, reason: "CYBERWARE_MODULE_SOURCE_LOCATION_INVALID", blockers: ["CYBERWARE_MODULE_SOURCE_LOCATION_INVALID"] };
    const profile = getCyberwareUpgradeProfile(host);
    if (!profile) return { ok: false, reason: "CYBERWARE_UPGRADE_HOST_UNSUPPORTED", blockers: ["CYBERWARE_UPGRADE_HOST_UNSUPPORTED"] };
    const slot = profile.moduleSlots.find((entry) => entry.slotId === id(input.slotId));
    if (!slot) return { ok: false, reason: "CYBERWARE_MODULE_SLOT_NOT_FOUND", blockers: ["CYBERWARE_MODULE_SLOT_NOT_FOUND"] };
    if (slot.installedModule) return { ok: false, reason: "CYBERWARE_MODULE_SLOT_OCCUPIED", blockers: ["CYBERWARE_MODULE_SLOT_OCCUPIED"] };
    const moduleProfile = getModuleProfile(module);
    if (!moduleProfile) return { ok: false, reason: "CYBERWARE_MODULE_DEFINITION_REQUIRED", blockers: ["CYBERWARE_MODULE_DEFINITION_REQUIRED"] };
    const blockers = [];
    const warnings = [];
    if (token(moduleProfile.slotType) !== slot.slotType) blockers.push("CYBERWARE_MODULE_SLOT_TYPE_MISMATCH");
    const hostDomain = profile.domain;
    const compatibleDomains = uniqueTokens(moduleProfile.compatibleHostDomains);
    if (compatibleDomains.length && !compatibleDomains.includes("ANY") && !compatibleDomains.includes(hostDomain)) blockers.push("CYBERWARE_MODULE_HOST_DOMAIN_MISMATCH");
    if (slot.acceptedModuleDefinitionIds.length && !slot.acceptedModuleDefinitionIds.includes(id(module.definitionId))) blockers.push("CYBERWARE_MODULE_DEFINITION_NOT_ACCEPTED");
    if (slot.acceptedManufacturers.length && !slot.acceptedManufacturers.includes(token(module.manufacturer || module.provider))) blockers.push("CYBERWARE_MODULE_MANUFACTURER_NOT_ACCEPTED");
    const hostProtocols = new Set(uniqueTokens([...(host.requiredProtocols || []), ...(host.protocolSupport || []), ...(host.tags || [])]));
    uniqueTokens(moduleProfile.requiredProtocols).forEach((protocol) => { if (!hostProtocols.has(protocol)) blockers.push(`CYBERWARE_MODULE_PROTOCOL_REQUIRED:${protocol}`); });
    const capacityCost = Math.max(1, Math.round(finite(moduleProfile.upgradeCapacityCost, 1)));
    if (profile.freeUpgradeCapacity < capacityCost) blockers.push("CYBERWARE_UPGRADE_CAPACITY_EXCEEDED");
    if (finite(module.durability?.current ?? module.condition, 100) < 25) warnings.push("CYBERWARE_MODULE_CONDITION_CRITICAL");
    return { ok: blockers.length === 0, reason: blockers[0] || warnings[0] || "CYBERWARE_MODULE_COMPATIBLE", blockers: unique(blockers), warnings: unique(warnings), host, module, profile, slot, moduleProfile, capacityCost };
  }

  function getDefaultReturnDestination(citizenId = "", module = {}) {
    const citizen = app.getCitizenById?.(citizenId);
    const options = citizen && typeof app.getCyberwarePlannerReturnDestinationOptions === "function"
      ? app.getCyberwarePlannerReturnDestinationOptions(citizen, module, null)
      : [];
    const selected = options[0];
    return selected ? { type: "HOUSING_STORAGE", storageUnitId: selected.storageUnitId, gridX: selected.placement?.column, gridY: selected.placement?.row, rotation: selected.placement?.rotation || 0 } : null;
  }

  function buildCyberwareUpgradeQuote(input = {}) {
    const operationType = token(input.operationType || input.operation || "INSTALL_MODULE");
    const citizenId = id(input.citizenId);
    const hostInstanceId = id(input.hostInstanceId || input.instanceId);
    const host = app.getItemInstanceView?.(hostInstanceId) || app.getItemInstanceById?.(hostInstanceId);
    const blockers = [];
    const warnings = [];
    let module = null;
    let oldModule = null;
    let slotId = id(input.slotId);
    let cost = 0;
    let durationMinutes = 0;
    if (!citizenId) blockers.push("CITIZEN_ID_REQUIRED");
    if (!host) blockers.push("CYBERWARE_UPGRADE_HOST_NOT_FOUND");
    if (host && id(host.ownerId) !== citizenId) blockers.push("ITEM_INSTANCE_OWNER_MISMATCH");
    const profile = host ? getCyberwareUpgradeProfile(host) : null;
    if (host && !profile) blockers.push("CYBERWARE_UPGRADE_HOST_UNSUPPORTED");

    if (operationType === "INSTALL_MODULE") {
      module = app.getItemInstanceView?.(id(input.moduleInstanceId || input.sourceItemId)) || app.getItemInstanceById?.(id(input.moduleInstanceId || input.sourceItemId));
      const check = validateCyberwareModuleCompatibility({ citizenId, hostInstanceId, moduleInstanceId: module?.instanceId, slotId });
      blockers.push(...(check.blockers || [])); warnings.push(...(check.warnings || []));
      cost = 550 + Math.round(finite(module?.value ?? module?.basePrice, 0) * 0.08) + check.capacityCost * 250;
      durationMinutes = 45 + check.capacityCost * 30;
    } else if (operationType === "REMOVE_MODULE") {
      const slot = profile?.moduleSlots.find((entry) => entry.slotId === slotId);
      oldModule = slot?.installedModule || null;
      if (!slot) blockers.push("CYBERWARE_MODULE_SLOT_NOT_FOUND");
      if (!oldModule) blockers.push("CYBERWARE_MODULE_SLOT_EMPTY");
      const returnDestination = input.returnDestination || (oldModule ? getDefaultReturnDestination(citizenId, oldModule) : null);
      if (!returnDestination?.type) blockers.push("RETURN_LOCATION_REQUIRED");
      cost = 400; durationMinutes = 45;
    } else if (operationType === "REPLACE_MODULE") {
      const slot = profile?.moduleSlots.find((entry) => entry.slotId === slotId);
      oldModule = slot?.installedModule || null;
      module = app.getItemInstanceView?.(id(input.moduleInstanceId || input.sourceItemId)) || app.getItemInstanceById?.(id(input.moduleInstanceId || input.sourceItemId));
      if (!slot) blockers.push("CYBERWARE_MODULE_SLOT_NOT_FOUND");
      if (!oldModule) blockers.push("CYBERWARE_MODULE_SLOT_EMPTY");
      const check = validateCyberwareModuleCompatibility({ citizenId, hostInstanceId, moduleInstanceId: module?.instanceId, slotId });
      const filtered = (check.blockers || []).filter((code) => code !== "CYBERWARE_MODULE_SLOT_OCCUPIED" && code !== "CYBERWARE_UPGRADE_CAPACITY_EXCEEDED");
      blockers.push(...filtered); warnings.push(...(check.warnings || []));
      const oldCost = Math.max(1, Math.round(finite(getModuleProfile(oldModule)?.upgradeCapacityCost, 1)));
      const newCost = Math.max(1, Math.round(finite(check.moduleProfile?.upgradeCapacityCost, 1)));
      if (profile && profile.freeUpgradeCapacity + oldCost < newCost) blockers.push("CYBERWARE_UPGRADE_CAPACITY_EXCEEDED");
      const returnDestination = input.returnDestination || (oldModule ? getDefaultReturnDestination(citizenId, oldModule) : null);
      if (!returnDestination?.type) blockers.push("RETURN_LOCATION_REQUIRED");
      cost = 750 + newCost * 250; durationMinutes = 75 + newCost * 25;
    } else if (operationType === "APPLY_PERMANENT_MOD") {
      const modification = getPermanentModificationDefinition(input.modificationId);
      if (!modification) blockers.push("CYBERWARE_PERMANENT_MODIFICATION_NOT_FOUND");
      if (modification && (SCALE_RANK[profile?.scale] || 1) < (SCALE_RANK[token(modification.minimumScale)] || 1)) blockers.push("CYBERWARE_PERMANENT_MODIFICATION_SCALE_TOO_SMALL");
      if (modification && profile?.permanentModifications.some((record) => id(record.modificationId || record.id) === modification.id)) blockers.push("CYBERWARE_PERMANENT_MODIFICATION_ALREADY_APPLIED");
      if (modification && profile && profile.freePermanentModificationCapacity < Math.max(1, finite(modification.capacityCost, 1))) blockers.push("CYBERWARE_PERMANENT_MODIFICATION_CAPACITY_EXCEEDED");
      cost = Math.max(0, Math.round(finite(modification?.serviceCost, 0))); durationMinutes = Math.max(0, Math.round(finite(modification?.durationMinutes, 0)));
    } else blockers.push("CYBERWARE_UPGRADE_OPERATION_UNSUPPORTED");

    return { ok: blockers.length === 0, status: blockers.length ? "BLOCKED" : warnings.length ? "ADVISORY" : "QUOTED", reason: blockers[0] || warnings[0] || "CYBERWARE_UPGRADE_QUOTED", operationType, citizenId, hostInstanceId, host, profile, slotId, module, oldModule, returnDestination: input.returnDestination || (oldModule ? getDefaultReturnDestination(citizenId, oldModule) : null), modificationId: id(input.modificationId), cost, durationMinutes, blockers: unique(blockers), warnings: unique(warnings) };
  }

  function appendHistory(item = {}, entry = {}) { return [...(Array.isArray(item.serviceHistory) ? item.serviceHistory : []), entry]; }
  function refsAfter(host = {}, operationType = "", slotId = "", module = null, oldModule = null) {
    const existing = Array.isArray(host.cyberwareState?.installedModules) ? clone(host.cyberwareState.installedModules) : [];
    const withoutSlot = existing.filter((record) => id(record.moduleSlotId || record.slotId) !== slotId && id(record.instanceId) !== id(oldModule?.instanceId));
    if (operationType === "REMOVE_MODULE") return withoutSlot;
    if (module) withoutSlot.push({ instanceId: id(module.instanceId), definitionId: id(module.definitionId), moduleSlotId: slotId, installedAt: now() });
    return withoutSlot;
  }

  function commitCyberwareUpgradeServiceResult(input = {}, serviceOrder = {}) {
    const quote = buildCyberwareUpgradeQuote(input);
    if (!quote.ok) return quote;
    const operationType = quote.operationType;
    const host = app.getItemInstanceById?.(quote.hostInstanceId);
    if (!host) return { ok: false, reason: "CYBERWARE_UPGRADE_HOST_NOT_FOUND" };
    const serviceOrderId = id(serviceOrder.serviceOrderId || input.serviceOrderId);
    const history = { type: operationType, occurredAt: now(), serviceOrderId, hostInstanceId: host.instanceId, moduleInstanceId: id(quote.module?.instanceId), replacedModuleInstanceId: id(quote.oldModule?.instanceId), slotId: quote.slotId, modificationId: quote.modificationId };
    const operations = [];
    if (operationType === "INSTALL_MODULE") {
      operations.push({ type: "MOVE", instanceId: quote.module.instanceId, expected: { ownerId: quote.citizenId, locationTypes: [...MODULE_SOURCE_LOCATIONS] }, toLocation: { type: "INSTALLED_IN_ITEM", parentItemInstanceId: host.instanceId, moduleSlotId: quote.slotId }, lifecycleState: "INSTALLED" });
      operations.push({ type: "PATCH", instanceId: host.instanceId, expected: { ownerId: quote.citizenId }, patch: { cyberwareState: { ...(host.cyberwareState || {}), installedModules: refsAfter(host, operationType, quote.slotId, quote.module) }, serviceHistory: appendHistory(host, history) } });
    } else if (operationType === "REMOVE_MODULE") {
      operations.push({ type: "MOVE", instanceId: quote.oldModule.instanceId, expected: { ownerId: quote.citizenId, locationType: "INSTALLED_IN_ITEM", lifecycleState: "INSTALLED" }, toLocation: clone(quote.returnDestination), lifecycleState: "STORED" });
      operations.push({ type: "PATCH", instanceId: host.instanceId, expected: { ownerId: quote.citizenId }, patch: { cyberwareState: { ...(host.cyberwareState || {}), installedModules: refsAfter(host, operationType, quote.slotId, null, quote.oldModule) }, serviceHistory: appendHistory(host, history) } });
    } else if (operationType === "REPLACE_MODULE") {
      operations.push({ type: "MOVE", instanceId: quote.oldModule.instanceId, expected: { ownerId: quote.citizenId, locationType: "INSTALLED_IN_ITEM", lifecycleState: "INSTALLED" }, toLocation: clone(quote.returnDestination), lifecycleState: "STORED" });
      operations.push({ type: "MOVE", instanceId: quote.module.instanceId, expected: { ownerId: quote.citizenId, locationTypes: [...MODULE_SOURCE_LOCATIONS] }, toLocation: { type: "INSTALLED_IN_ITEM", parentItemInstanceId: host.instanceId, moduleSlotId: quote.slotId }, lifecycleState: "INSTALLED" });
      operations.push({ type: "PATCH", instanceId: host.instanceId, expected: { ownerId: quote.citizenId }, patch: { cyberwareState: { ...(host.cyberwareState || {}), installedModules: refsAfter(host, operationType, quote.slotId, quote.module, quote.oldModule) }, serviceHistory: appendHistory(host, history) } });
    } else if (operationType === "APPLY_PERMANENT_MOD") {
      const definition = getPermanentModificationDefinition(quote.modificationId);
      const permanentModifications = [...getPermanentModifications(host), { modificationId: definition.id, appliedAt: now(), serviceOrderId, capacityCost: definition.capacityCost, effects: clone(definition.effects || {}) }];
      operations.push({ type: "PATCH", instanceId: host.instanceId, expected: { ownerId: quote.citizenId }, patch: { cyberwareState: { ...(host.cyberwareState || {}), permanentModifications }, serviceHistory: appendHistory(host, history) } });
    }
    const transactionResult = app.commitItemInstanceTransaction?.({ idempotencyKey: id(input.idempotencyKey) || nextKey(`${operationType}:${host.instanceId}`), sourceDomain: "SERVICE", sourceRefId: serviceOrderId || host.instanceId, citizenId: quote.citizenId, operations, changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE", "SERVICE"], metadata: { operationType, hostInstanceId: host.instanceId, moduleInstanceId: id(quote.module?.instanceId), slotId: quote.slotId, modificationId: quote.modificationId, serviceOrderId } });
    if (transactionResult?.ok !== true) return { ok: false, reason: transactionResult?.reason || "CYBERWARE_UPGRADE_TRANSACTION_FAILED", transactionResult };
    return { ok: true, reason: "CYBERWARE_UPGRADE_COMMITTED", transaction: transactionResult.transaction, itemTransactionId: transactionResult.transaction?.transactionId, itemCommit: transactionResult.itemCommit, instanceIds: unique([host.instanceId, quote.module?.instanceId, quote.oldModule?.instanceId]), quote };
  }

  function applyCyberwareUpgradeEffects(item = {}) {
    const profile = getCyberwareUpgradeProfile(item);
    if (!profile) return clone(item);
    const effects = {};
    const addEffects = (source = {}) => Object.entries(source || {}).forEach(([key, value]) => { effects[key] = finite(effects[key], 0) + finite(value, 0); });
    profile.installedModules.forEach((module) => addEffects(getModuleProfile(module)?.effects));
    profile.permanentModifications.forEach((record) => addEffects(getPermanentModificationDefinition(record.modificationId || record.id)?.effects || record.effects));
    const next = { ...clone(item), upgradeProfile: profile, upgradeEffects: effects };
    ["neuroLoad", "neuroChannels", "interfaceLoad", "security", "stability"].forEach((key) => { next[key] = finite(next[key], 0) + finite(effects[key], 0); });
    if (effects.neurolatencyDelta) {
      const rank = Math.max(0, Math.min(5, finite(next.neurolatencyRank ?? next.latencyRank, 3) + effects.neurolatencyDelta));
      next.neurolatencyRank = rank;
    }
    next.firmwareCapacity = profile.firmwareCapacity;
    return next;
  }

  function startCyberwareUpgrade(input = {}) {
    const operationType = token(input.operationType || "INSTALL_MODULE");
    const quote = buildCyberwareUpgradeQuote({ ...input, operationType });
    if (!quote.ok) return quote;
    if (typeof app.startCyberwareService !== "function") return { ok: false, reason: "CYBERWARE_WORLD_BRIDGE_REQUIRED", quote };
    return app.startCyberwareService({ ...input, operationType, citizenId: quote.citizenId, instanceId: quote.hostInstanceId, hostInstanceId: quote.hostInstanceId, moduleInstanceId: id(quote.module?.instanceId || input.moduleInstanceId), oldModuleInstanceId: id(quote.oldModule?.instanceId), slotId: quote.slotId, modificationId: quote.modificationId, returnDestination: quote.returnDestination, instanceIds: unique([quote.hostInstanceId, quote.module?.instanceId, quote.oldModule?.instanceId]), grossPrice: quote.cost, estimatedDurationMinutes: quote.durationMinutes, idempotencyKey: id(input.idempotencyKey) || nextKey(`cyberware-upgrade:${operationType}:${quote.hostInstanceId}`) });
  }

  function renderCyberwareUpgradePanel(item = {}, citizen = {}) {
    const profile = getCyberwareUpgradeProfile(item);
    if (!profile) return "";
    const citizenId = id(citizen.id || item.ownerId);
    const slots = profile.moduleSlots.map((slot) => {
      if (slot.installedModule) {
        const replacements = getCompatibleCyberwareModuleCandidates(citizenId, profile.hostInstanceId, slot.slotId, { includeOccupied: true });
        return `<article class="cyberware-upgrade-slot is-occupied"><header><span>${hostEscape(slot.slotType)}</span><b>${hostEscape(slot.slotId)}</b></header><strong>${hostEscape(slot.installedModule.displayName || slot.installedModule.name || slot.installedModule.definitionId)}</strong><small>${hostEscape(slot.installedModule.definitionId || slot.installedModule.instanceId)}</small><div class="cyberware-upgrade-slot__actions"><button type="button" class="secondary-action is-compact" data-cyberware-upgrade-remove data-host-instance-id="${hostEscape(profile.hostInstanceId)}" data-slot-id="${hostEscape(slot.slotId)}">Remove module</button>${replacements.length ? `<select data-cyberware-upgrade-replacement>${replacements.map((candidate) => `<option value="${hostEscape(candidate.instanceId)}">${hostEscape(candidate.displayName || candidate.name || candidate.definitionId)}</option>`).join("")}</select><button type="button" class="secondary-action is-compact" data-cyberware-upgrade-replace data-host-instance-id="${hostEscape(profile.hostInstanceId)}" data-slot-id="${hostEscape(slot.slotId)}">Replace module</button>` : ""}</div></article>`;
      }
      const candidates = getCompatibleCyberwareModuleCandidates(citizenId, profile.hostInstanceId, slot.slotId);
      return `<article class="cyberware-upgrade-slot"><header><span>${hostEscape(slot.slotType)}</span><b>${hostEscape(slot.slotId)}</b></header>${candidates.length ? `<select data-cyberware-upgrade-candidate>${candidates.map((candidate) => `<option value="${hostEscape(candidate.instanceId)}">${hostEscape(candidate.displayName || candidate.name || candidate.definitionId)}</option>`).join("")}</select><button type="button" class="secondary-action is-compact" data-cyberware-upgrade-install data-host-instance-id="${hostEscape(profile.hostInstanceId)}" data-slot-id="${hostEscape(slot.slotId)}">Install module</button>` : `<small>NO COMPATIBLE MODULE IN STORAGE</small>`}</article>`;
    }).join("");
    const permanent = getPermanentModificationDefinitions().map((definition) => {
      const applied = profile.permanentModifications.some((record) => id(record.modificationId || record.id) === definition.id);
      const eligible = (SCALE_RANK[profile.scale] || 1) >= (SCALE_RANK[token(definition.minimumScale)] || 1) && profile.freePermanentModificationCapacity >= Math.max(1, finite(definition.capacityCost, 1));
      return `<article class="cyberware-upgrade-permanent ${applied ? "is-applied" : ""}"><b>${hostEscape(definition.name)}</b><small>${hostEscape(Object.entries(definition.effects || {}).map(([key, value]) => `${key} ${value > 0 ? "+" : ""}${value}`).join(" / "))}</small>${applied ? `<span>APPLIED</span>` : `<button type="button" class="secondary-action is-compact" data-cyberware-upgrade-permanent data-host-instance-id="${hostEscape(profile.hostInstanceId)}" data-modification-id="${hostEscape(definition.id)}" ${eligible ? "" : "disabled"}>Apply modification</button>`}</article>`;
    }).join("");
    return `<details class="cyberware-upgrade-panel" data-cyberware-upgrade-panel><summary>Upgrades · ${profile.usedUpgradeCapacity}/${profile.upgradeCapacity}</summary><div class="cyberware-upgrade-tabs"><section><h6>HARDWARE</h6><p>${profile.usedUpgradeCapacity}/${profile.upgradeCapacity} CAPACITY · ${profile.moduleSlots.length} SLOTS</p><div class="cyberware-upgrade-slot-grid">${slots || `<small>NO HARDWARE MODULE SLOTS</small>`}</div></section><section><h6>FIRMWARE</h6><p>${profile.usedFirmwareCapacity}/${profile.firmwareCapacity} CAPACITY · ${profile.installedFirmware.length} INSTALLED</p><button type="button" class="secondary-action is-compact" data-cyberware-maintenance-action="open" data-item-id="${hostEscape(profile.hostInstanceId)}">Open firmware service</button></section><section><h6>CALIBRATION</h6><p>${hostEscape(`${item.cyberwareState?.calibration?.quality ?? 100}% / ${token(item.cyberwareState?.calibration?.profile || "FACTORY")}`)}</p><button type="button" class="secondary-action is-compact" data-cyberware-maintenance-action="open" data-item-id="${hostEscape(profile.hostInstanceId)}">Open calibration</button></section><section><h6>PERMANENT MODS</h6><p>${profile.usedPermanentModificationCapacity}/${profile.permanentModificationCapacity} CAPACITY</p><div class="cyberware-upgrade-permanent-grid">${permanent}</div></section></div><p class="cyberware-upgrade-feedback" data-cyberware-upgrade-feedback></p></details>`;
  }

  function hostEscape(value = "") { return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character])); }

  const api = { version: API_VERSION, getScalePolicy, getModuleDefinitions, getModuleDefinition, getPermanentModificationDefinitions, getPermanentModificationDefinition, getCyberwareUpgradeProfile, getInstalledCyberwareModules: getInstalledModules, getCyberwareModuleProfile: getModuleProfile, getCompatibleCyberwareModuleCandidates, validateCyberwareModuleCompatibility, buildCyberwareUpgradeQuote, commitCyberwareUpgradeServiceResult, applyCyberwareUpgradeEffects, startCyberwareUpgrade, renderCyberwareUpgradePanel };
  app.CyberwareUpgradeSystem = api;
  Object.assign(app, api);
})();
