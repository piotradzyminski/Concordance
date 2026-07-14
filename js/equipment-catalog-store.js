window.WS_APP = window.WS_APP || {};

(function initEquipmentCatalogStoreModule() {
  const EQUIPMENT_CATALOG_DATA_URL = "data/equipment-catalog.js?v=21";

  const EQUIPMENT_FOOTPRINTS = {
    "1x1": { w: 1, h: 1, label: "Small" },
    "2x1": { w: 2, h: 1, label: "Small Horizontal" },
    "3x1": { w: 3, h: 1, label: "Medium Horizontal" },
    "4x1": { w: 4, h: 1, label: "Long Horizontal" },
    "1x2": { w: 1, h: 2, label: "Small Vertical" },
    "1x3": { w: 1, h: 3, label: "Medium Vertical" },
    "1x4": { w: 1, h: 4, label: "Long Vertical" },
    "2x2": { w: 2, h: 2, label: "Large Square" },
    "2x3": { w: 2, h: 3, label: "Large" },
    "2x4": { w: 2, h: 4, label: "Very Large" },
    "2x5": { w: 2, h: 5, label: "Extended Pack" },
    "3x3": { w: 3, h: 3, label: "Oversized" }
  };

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function clampNumber(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function getEquipmentFootprintSize(value = "1x1") {
    const key = typeof value === "object"
      ? String(value.footprint || `${value.width || value.w || 1}x${value.height || value.h || 1}`).trim().toLowerCase()
      : String(value || "1x1").trim().toLowerCase();
    const definition = EQUIPMENT_FOOTPRINTS[key] || EQUIPMENT_FOOTPRINTS["1x1"];
    return {
      footprint: key in EQUIPMENT_FOOTPRINTS ? key : "1x1",
      width: definition.w,
      height: definition.h,
      label: definition.label
    };
  }

  function normalizeEquipmentContainerProfile(source = {}) {
    const raw = source?.containerProfile || null;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const slotCapacity = clampNumber(raw.slotCapacity ?? raw.capacity ?? raw.capacitySlots, 0, 9999);
    const cellRules = Array.isArray(raw.cellRules) ? raw.cellRules.map((entry) => {
      const rule = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
      const column = clampNumber(rule.column ?? rule.col ?? rule.x, 0, 12);
      const row = clampNumber(rule.row ?? rule.y, 0, 24);
      if (!column || !row) return null;
      return {
        column,
        row,
        key: String(rule.key || rule.type || rule.label || "DEDICATED").trim().replace(/[\s-]+/g, "_").toUpperCase(),
        label: String(rule.label || rule.key || "DEDICATED").trim().toUpperCase(),
        acceptedTags: Array.isArray(rule.acceptedTags) ? rule.acceptedTags.map((tag) => String(tag).trim().toUpperCase()).filter(Boolean) : [],
        blockedTags: Array.isArray(rule.blockedTags) ? rule.blockedTags.map((tag) => String(tag).trim().toUpperCase()).filter(Boolean) : [],
        footprintMode: String(rule.footprintMode || "NATURAL").trim().toUpperCase() === "SLOT" ? "SLOT" : "NATURAL"
      };
    }).filter(Boolean) : [];
    return {
      label: String(raw.label || source.containerLabel || source.label || "CONTAINER").trim().toUpperCase(),
      slotCapacity,
      gridColumns: clampNumber(raw.gridColumns ?? raw.columns, 0, 12),
      gridRows: clampNumber(raw.gridRows ?? raw.rows, 0, 24),
      isolatedCells: raw.isolatedCells === true,
      cellRules,
      acceptedTags: Array.isArray(raw.acceptedTags) ? raw.acceptedTags.map((tag) => String(tag).trim().toUpperCase()).filter(Boolean) : [],
      blockedTags: Array.isArray(raw.blockedTags) ? raw.blockedTags.map((tag) => String(tag).trim().toUpperCase()).filter(Boolean) : []
    };
  }

  function normalizeEquipmentAnchorKeyForCatalog(value = "") {
    const token = String(value || "").trim().replace(/[\s_-]+/g, "").toUpperCase();
    const aliases = {
      LEFTUPPERARM: "LEFT_SHOULDER", RIGHTUPPERARM: "RIGHT_SHOULDER",
      LEFTHANDHELD: "LEFT_HAND", RIGHTHANDHELD: "RIGHT_HAND",
      IMPLANTPORT: "IMPLANT_PORT"
    };
    return aliases[token] || String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function normalizeEquipmentLayerKeyForCatalog(value = "") {
    const normalized = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    const aliases = { BODY: "INNER", PROTECTION: "ARMOR" };
    const canonical = aliases[normalized] || normalized;
    return ["INNER", "OUTER", "OUTERWEAR", "ARMOR", "FACE", "FOOTWEAR", "HELD"].includes(canonical) ? canonical : "";
  }

  function normalizeCatalogMountSet(value = {}, index = 0) {
    const source = Array.isArray(value) ? { mountIds: value } : value && typeof value === "object" ? value : { mountIds: [value] };
    const mountIds = [...new Set((Array.isArray(source.mountIds) ? source.mountIds : []).map((entry) => String(entry || "").trim().replace(/[\s-]+/g, "_").toUpperCase()).filter(Boolean))];
    return mountIds.length ? { id: String(source.id || source.key || mountIds.join("+") || `MOUNT_SET_${index + 1}`).trim().replace(/[\s-]+/g, "_").toUpperCase(), label: String(source.label || mountIds.join(" + ")).trim(), mountIds } : null;
  }

  function normalizeEquipmentEquipProfile(source = {}) {
    const raw = source?.equipProfile && typeof source.equipProfile === "object" && !Array.isArray(source.equipProfile) ? source.equipProfile : {};
    return {
      allowedAnchors: Array.isArray(raw.allowedAnchors) ? raw.allowedAnchors.map(normalizeEquipmentAnchorKeyForCatalog).filter(Boolean) : [],
      layer: normalizeEquipmentLayerKeyForCatalog(raw.layer),
      coverage: Array.isArray(raw.coverage) ? raw.coverage.map(normalizeEquipmentAnchorKeyForCatalog).filter(Boolean) : [],
      bodyMountSets: Array.isArray(raw.bodyMountSets) ? raw.bodyMountSets.map(normalizeCatalogMountSet).filter(Boolean) : [],
      itemMountTypes: Array.isArray(raw.itemMountTypes) ? [...new Set(raw.itemMountTypes.map((entry) => String(entry || "").trim().replace(/[\s-]+/g, "_").toUpperCase()).filter(Boolean))] : [],
      handsRequired: Math.max(1, Math.min(2, Math.round(Number(raw.handsRequired || 1)) || 1)),
      countsAsBulkyCarrier: raw.countsAsBulkyCarrier === true,
      requires: Array.isArray(raw.requires) ? raw.requires.map((entry) => ({ anchor: normalizeEquipmentAnchorKeyForCatalog(entry?.anchor || entry?.region), layer: normalizeEquipmentLayerKeyForCatalog(entry?.layer) })).filter((entry) => entry.anchor && entry.layer) : [],
      blocks: Array.isArray(raw.blocks) ? raw.blocks.map((entry) => ({ anchor: normalizeEquipmentAnchorKeyForCatalog(entry?.anchor || entry?.region), layer: normalizeEquipmentLayerKeyForCatalog(entry?.layer) })).filter((entry) => entry.anchor && entry.layer) : []
    };
  }

  function normalizeEquipmentMountProfile(source = {}) {
    const raw = source?.mountProfile && typeof source.mountProfile === "object" && !Array.isArray(source.mountProfile) ? source.mountProfile : {};
    const slots = (Array.isArray(raw.slots) ? raw.slots : []).map((entry, index) => {
      const slot = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
      const id = String(slot.id || slot.key || `MOUNT_${index + 1}`).trim().replace(/[\s-]+/g, "_").toUpperCase();
      const type = String(slot.type || slot.mountType || id).trim().replace(/[\s-]+/g, "_").toUpperCase();
      return id && type ? { id, type, label: String(slot.label || id).trim(), acceptedTags: Array.isArray(slot.acceptedTags) ? slot.acceptedTags.map((tag) => String(tag || "").trim().toUpperCase()).filter(Boolean) : [], blockedTags: Array.isArray(slot.blockedTags) ? slot.blockedTags.map((tag) => String(tag || "").trim().toUpperCase()).filter(Boolean) : [] } : null;
    }).filter(Boolean);
    return slots.length ? { slots } : null;
  }

function normalizeEquipmentCyberwareMeta(source = {}) {
    const cyberware = source.cyberware && typeof source.cyberware === "object" && !Array.isArray(source.cyberware) ? source.cyberware : {};
    const combined = { ...source, ...cyberware };
    const tags = Array.isArray(combined.tags) ? combined.tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
    const slots = Array.isArray(combined.slots)
      ? combined.slots.map((slot) => String(slot).trim()).filter(Boolean)
      : combined.slots !== undefined && combined.slots !== null && combined.slots !== ""
        ? [String(combined.slots).trim()].filter(Boolean)
        : [];
    const compatibleSlots = Array.isArray(combined.compatibleSlots)
      ? combined.compatibleSlots.map((slot) => String(slot).trim()).filter(Boolean)
      : combined.compatibleSlots !== undefined && combined.compatibleSlots !== null && combined.compatibleSlots !== ""
        ? [String(combined.compatibleSlots).trim()].filter(Boolean)
        : [];
    const requiredBuses = Array.isArray(combined.requiredBuses)
      ? combined.requiredBuses.map((bus) => String(bus).trim()).filter(Boolean)
      : combined.requiredBuses !== undefined && combined.requiredBuses !== null && combined.requiredBuses !== ""
        ? [String(combined.requiredBuses).trim()].filter(Boolean)
        : [];
    const compatibleWith = Array.isArray(combined.compatibleWith)
      ? combined.compatibleWith.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const exposedSlots = Array.isArray(combined.exposedSlots)
      ? combined.exposedSlots.map((slot) => String(slot).trim()).filter(Boolean)
      : [];
    const lockedDescendants = Array.isArray(combined.lockedDescendants)
      ? combined.lockedDescendants.map((slot) => String(slot).trim()).filter(Boolean)
      : [];
    const acceptedChildGroups = Array.isArray(combined.acceptedChildGroups)
      ? combined.acceptedChildGroups.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const acceptedManufacturers = Array.isArray(combined.acceptedManufacturers)
      ? combined.acceptedManufacturers.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const acceptedStandards = Array.isArray(combined.acceptedStandards)
      ? combined.acceptedStandards.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const installLog = Array.isArray(combined.installLog)
      ? combined.installLog.filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry)).slice(-12).map((entry) => ({ ...entry }))
      : [];
    const isCyberwareCandidate = combined.cyberwareCandidate === true
      || combined.isCyberware === true
      || tags.map((tag) => tag.toUpperCase()).includes("CYBERWARE")
      || String(combined.category || "").trim().toUpperCase() === "CYBERWARE";
    const isInstallOnlyCandidate = combined.installOnlyCandidate === true || combined.notWearable === true || isCyberwareCandidate;

    return {
      cyberwareCandidate: isCyberwareCandidate,
      installOnlyCandidate: isInstallOnlyCandidate,
      notWearable: isInstallOnlyCandidate,
      cyberware: Object.keys(cyberware).length ? { ...cyberware } : null,
      implantId: String(combined.implantId || combined.cyberwareId || "").trim(),
      sourceCatalogId: String(combined.sourceCatalogId || combined.catalogId || combined.itemId || "").trim(),
      sourceType: String(combined.sourceType || combined.installSourceType || "EQUIPMENT").trim().toUpperCase(),
      manufacturer: String(combined.manufacturer || "").trim(),
      provider: String(combined.provider || combined.manufacturer || "").trim(),
      grade: String(combined.grade || combined.quality || "").trim().toUpperCase(),
      scale: String(combined.scale || combined.implantScale || combined.size || "").trim().toUpperCase(),
      primarySlot: String(combined.primarySlot || combined.slot || "").trim(),
      slot: String(combined.slot || combined.primarySlot || "").trim(),
      slots,
      compatibleSlots,
      slotLevel: String(combined.slotLevel || "").trim().toUpperCase(),
      descendantPolicy: String(combined.descendantPolicy || combined.childSlotPolicy || combined.subslotPolicy || "").trim().toUpperCase(),
      exposedSlots,
      lockedDescendants,
      acceptedChildGroups,
      acceptedManufacturers,
      acceptedStandards,
      slotCost: Number.isFinite(Number(combined.slotCost ?? combined.slotsUsed)) ? Math.max(0, Math.round(Number(combined.slotCost ?? combined.slotsUsed))) : 0,
      customizationSlots: Number.isFinite(Number(combined.customizationSlots ?? combined.customSlots)) ? Math.max(0, Math.round(Number(combined.customizationSlots ?? combined.customSlots))) : 0,
      neuroLoad: Number.isFinite(Number(combined.neuroLoad)) ? Math.max(0, Math.round(Number(combined.neuroLoad))) : 0,
      interfaceLoad: Number.isFinite(Number(combined.interfaceLoad)) ? Math.max(0, Math.round(Number(combined.interfaceLoad))) : 0,
      requiredBuses,
      requiresNeurochipTier: Number.isFinite(Number(combined.requiresNeurochipTier ?? combined.requiredNeurochipTier)) ? Math.max(0, Math.round(Number(combined.requiresNeurochipTier ?? combined.requiredNeurochipTier))) : 0,
      requiresInterfaceTier: Number.isFinite(Number(combined.requiresInterfaceTier ?? combined.requiredInterfaceTier)) ? Math.max(0, Math.round(Number(combined.requiresInterfaceTier ?? combined.requiredInterfaceTier))) : 0,
      processorRole: String(combined.processorRole || combined.role || "").trim().toUpperCase(),
      neurochipTier: Number.isFinite(Number(combined.neurochipTier)) ? Math.max(0, Math.round(Number(combined.neurochipTier))) : 0,
      interfaceTier: Number.isFinite(Number(combined.interfaceTier)) ? Math.max(0, Math.round(Number(combined.interfaceTier))) : 0,
      maxCyberwareGrade: String(combined.maxCyberwareGrade || combined.qualityCeiling || "").trim().toUpperCase(),
      maxScale: String(combined.maxScale || combined.maxImplantSize || "").trim().toUpperCase(),
      supportedBuses: Array.isArray(combined.supportedBuses) ? combined.supportedBuses.map((bus) => String(bus).trim()).filter(Boolean) : [],
      compatibilityGroup: String(combined.compatibilityGroup || "").trim(),
      compatibleWith,
      vendorLocked: combined.vendorLocked === true,
      isCoreProcessor: combined.isCoreProcessor === true,
      isCoreInterface: combined.isCoreInterface === true,
      isServicePort: combined.isServicePort === true || String(combined.processorRole || combined.role || "").trim().toUpperCase() === "SERVICE_PORT" || String(combined.subtype || "").trim().toUpperCase() === "SERVICE_PORT",
      servicePortTier: Number.isFinite(Number(combined.servicePortTier ?? combined.portTier)) ? Math.max(0, Math.round(Number(combined.servicePortTier ?? combined.portTier))) : 0,
      serviceAccess: Number.isFinite(Number(combined.serviceAccess)) ? Math.max(0, Math.round(Number(combined.serviceAccess))) : 0,
      diagnosticDepth: Number.isFinite(Number(combined.diagnosticDepth)) ? Math.max(0, Math.round(Number(combined.diagnosticDepth))) : 0,
      firmwareAccess: Number.isFinite(Number(combined.firmwareAccess)) ? Math.max(0, Math.round(Number(combined.firmwareAccess))) : 0,
      calibrationQuality: Number.isFinite(Number(combined.calibrationQuality)) ? Math.max(0, Math.round(Number(combined.calibrationQuality))) : 0,
      securityLock: Number.isFinite(Number(combined.securityLock)) ? Math.max(0, Math.round(Number(combined.securityLock))) : 0,
      emergencyAccess: Number.isFinite(Number(combined.emergencyAccess)) ? Math.max(0, Math.round(Number(combined.emergencyAccess))) : 0,
      traceability: Number.isFinite(Number(combined.traceability)) ? Math.max(0, Math.round(Number(combined.traceability))) : 0,
      physicalResilience: Number.isFinite(Number(combined.physicalResilience)) ? Math.max(0, Math.round(Number(combined.physicalResilience))) : 0,
      visualLocation: String(combined.visualLocation || "").trim(),
      compatibilityTags: Array.isArray(combined.compatibilityTags) ? combined.compatibilityTags.map((item) => String(item).trim()).filter(Boolean) : [],
      specialFeatures: Array.isArray(combined.specialFeatures) ? combined.specialFeatures.map((item) => String(item).trim()).filter(Boolean) : [],
      licenseRequired: combined.licenseRequired === true || combined.requiresLicense === true || combined.licenseActivationRequired === true || combined.licenseCodeRequired === true,
      licenseActivationRequired: combined.licenseActivationRequired === true || combined.activationRequired === true,
      licenseCodeRequired: combined.licenseCodeRequired === true || combined.requiresLicenseCode === true,
      licenseStatus: String(combined.licenseStatus || combined.licenseState || "").trim().toUpperCase(),
      licenseCode: String(combined.licenseCode || combined.activationCode || combined.licenseKey || "").trim(),
      licenseActivatedAt: String(combined.licenseActivatedAt || combined.activatedAt || "").trim(),
      subscriptionRequired: combined.subscriptionRequired === true || combined.requiresSubscription === true || combined.restrictions?.requiresSubscription === true,
      subscriptionCategory: String(combined.subscriptionCategory || combined.requiresSubscriptionCategory || "").trim().toUpperCase(),
      subscriptionTierRequired: Number.isFinite(Number(combined.subscriptionTierRequired ?? combined.requiresSubscriptionTier)) ? Math.max(0, Math.round(Number(combined.subscriptionTierRequired ?? combined.requiresSubscriptionTier))) : 0,
      subscriptionAvailableAfterPurchase: combined.subscriptionAvailableAfterPurchase !== undefined ? combined.subscriptionAvailableAfterPurchase === true : combined.availableAfterPurchase === true,
      firmwareRequired: combined.firmwareRequired === true || combined.requiresFirmware === true,
      firmwareChannel: String(combined.firmwareChannel || combined.firmwareSource || combined.updateChannel || "").trim().toUpperCase(),
      firmwareVersion: String(combined.firmwareVersion || combined.currentFirmwareVersion || combined.firmwareCurrentVersion || "").trim(),
      firmwareLatestVersion: String(combined.firmwareLatestVersion || combined.latestFirmwareVersion || "").trim(),
      firmwareStatus: String(combined.firmwareStatus || combined.firmwareState || combined.updateStatus || "").trim().toUpperCase(),
      firmwareUpdateRequired: combined.firmwareUpdateRequired === true || combined.requiresFirmwareUpdate === true,
      firmwareDownloadUrl: String(combined.firmwareDownloadUrl || combined.firmwareUrl || combined.updateUrl || "").trim(),
      lastImplantCheck: combined.lastImplantCheck && typeof combined.lastImplantCheck === "object" && !Array.isArray(combined.lastImplantCheck) ? { ...combined.lastImplantCheck } : null,
      installLog
    };
  }

  function normalizeEquipmentConsumableProfile(definition = {}) {
    const source = definition && typeof definition === "object" && !Array.isArray(definition) ? definition : {};
    const profile = source.consumableProfile && typeof source.consumableProfile === "object" && !Array.isArray(source.consumableProfile)
      ? source.consumableProfile
      : {};
    const packageQuantity = Number(profile.packageQuantity ?? source.packageQuantity ?? source.quantityPerPackage ?? source.unitsPerPackage);
    return {
      packageQuantity: Number.isFinite(packageQuantity) ? Math.max(0, Math.round(packageQuantity)) : 0,
      packageLabel: String(profile.packageLabel || source.packageLabel || "").trim(),
      dose: String(profile.dose || source.dose || source.dosage || source.doseLabel || "").trim(),
      duration: String(profile.duration || source.duration || source.effectDuration || "").trim(),
      shelfLife: String(profile.shelfLife || source.shelfLife || "").trim(),
      mealUnits: Number.isFinite(Number(profile.mealUnits ?? source.mealUnits)) ? Math.max(0, Math.round(Number(profile.mealUnits ?? source.mealUnits))) : 0,
      rationClass: String(profile.rationClass || source.rationClass || "").trim().toUpperCase(),
      quality: String(profile.quality || source.quality || "").trim().toUpperCase()
    };
  }

  function normalizeEquipmentVisualProfile(definition = {}) {
    const source = definition && typeof definition === "object" && !Array.isArray(definition) ? definition : {};
    const profile = source.visualProfile && typeof source.visualProfile === "object" && !Array.isArray(source.visualProfile)
      ? source.visualProfile
      : {};
    const thumbnail = String(profile.thumbnail || "").trim();
    const detail = String(profile.detail || thumbnail).trim();
    const fitToken = String(profile.fit || "CONTAIN").trim().toUpperCase();
    return {
      thumbnail,
      detail: detail || thumbnail,
      alt: String(profile.alt || source.name || source.title || "Product visual").trim(),
      fit: fitToken === "COVER" ? "COVER" : "CONTAIN"
    };
  }

  function normalizeEquipmentCatalogItem(definition = {}, index = 0) {
    const source = definition && typeof definition === "object" && !Array.isArray(definition) ? definition : {};
    const size = getEquipmentFootprintSize(source.footprint || source.size || "1x1");
    const equipProfile = normalizeEquipmentEquipProfile(source);
    const cyberwareMeta = normalizeEquipmentCyberwareMeta(source);
    const consumableProfile = normalizeEquipmentConsumableProfile(source);
    const visualProfile = normalizeEquipmentVisualProfile(source);
    const itemType = typeof window.WS_APP.resolveItemTypeId === "function"
      ? window.WS_APP.resolveItemTypeId(source)
      : String(source.itemType || source.itemTypeId || "GENERIC_ITEM").trim().replace(/[\s-]+/g, "_").toUpperCase();
    const itemTypeProfile = typeof window.WS_APP.normalizeItemTypeProfile === "function"
      ? window.WS_APP.normalizeItemTypeProfile(itemType, source.itemTypeProfile || source.typeProfile || {})
      : { ...(source.itemTypeProfile || source.typeProfile || {}) };
    const typeCapabilities = typeof window.WS_APP.getItemTypeCapabilities === "function"
      ? window.WS_APP.getItemTypeCapabilities(itemType)
      : [];
    const capabilities = [...new Set([
      ...typeCapabilities,
      ...(Array.isArray(source.capabilities) ? source.capabilities : [])
    ].map((entry) => String(entry || "").trim().replace(/[\s-]+/g, "_").toUpperCase()).filter(Boolean))];
    const itemTypeDefinition = typeof window.WS_APP.getItemTypeDefinition === "function"
      ? window.WS_APP.getItemTypeDefinition(itemType)
      : null;
    return {
      id: String(source.id || source.catalogId || `eqcat-${index + 1}`).trim(),
      catalogId: String(source.catalogId || source.id || `eqcat-${index + 1}`).trim(),
      name: String(source.name || source.title || "Equipment Catalog Item").trim(),
      category: String(source.category || "MISC").trim().toUpperCase(),
      subtype: String(source.subtype || source.modelType || "").trim().toUpperCase(),
      itemType,
      itemTypeLabel: String(itemTypeDefinition?.label || itemType).trim(),
      itemTypeProfile,
      capabilities,
      footprint: size.footprint,
      width: size.width,
      height: size.height,
      containerProfile: normalizeEquipmentContainerProfile(source),
      equipProfile,
      mountProfile: normalizeEquipmentMountProfile(source),
      status: String(source.status || "OWNED").trim().toUpperCase(),
      operatingStatus: String(source.operatingStatus || "ACTIVE").trim().toUpperCase(),
      legality: String(source.legality || "UNREGISTERED").trim().toUpperCase(),
      condition: clampNumber(source.condition ?? 100, 0, 100),
      value: Number.isFinite(Number(source.value)) ? Math.round(Number(source.value)) : 0,
      capacityTier: clampNumber(source.capacityTier ?? source.tier ?? 0, 0, 99),
      capacitySlots: clampNumber(source.capacitySlots ?? source.storageSlots ?? 0, 0, 999),
      requiresSubscriptionCategory: String(source.requiresSubscriptionCategory || source.subscriptionCategory || "").trim().toUpperCase(),
      requiresSubscriptionTier: clampNumber(source.requiresSubscriptionTier ?? source.subscriptionTier ?? 0, 0, 99),
      restrictions: source.restrictions && typeof source.restrictions === "object" && !Array.isArray(source.restrictions) ? { ...source.restrictions } : {},
      marketDepartment: String(source.marketDepartment || source.department || "").trim().toUpperCase(),
      marketSubcategory: String(source.marketSubcategory || source.storeCategory || "").trim().toUpperCase(),
      consumable: source.consumable === true || Array.isArray(source.tags) && source.tags.some((tag) => String(tag || "").trim().toUpperCase() === "CONSUMABLE"),
      consumableProfile,
      visualProfile,
      packageQuantity: consumableProfile.packageQuantity,
      packageLabel: consumableProfile.packageLabel,
      dose: consumableProfile.dose,
      duration: consumableProfile.duration,
      shelfLife: consumableProfile.shelfLife,
      mealUnits: consumableProfile.mealUnits,
      rationClass: consumableProfile.rationClass,
      quality: consumableProfile.quality,
      tags: Array.isArray(source.tags) ? source.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
      notes: String(source.notes || source.note || "").trim(),
      gmNote: String(source.gmNote || "").trim(),
      ...cyberwareMeta,
      archived: source.archived === true
    };
  }

  let equipmentCatalogCache = null;
  let equipmentCatalogIndex = null;
  let equipmentCatalogRevision = 0;

  function getSeedEquipmentCatalogItems() {
    const source = Array.isArray(window.APP_DATA?.equipmentCatalog)
      ? window.APP_DATA.equipmentCatalog
      : Array.isArray(window.WS_APP.equipmentCatalog)
        ? window.WS_APP.equipmentCatalog
        : [];
    return source.map(normalizeEquipmentCatalogItem).filter((item) => item.id);
  }

  function getDynamicCyberwareCatalogItems() {
    const items = [];

    if (typeof window.WS_APP.getCyberwareEquipmentCatalogItems === "function") {
      items.push(...window.WS_APP.getCyberwareEquipmentCatalogItems());
    }

    if (typeof window.WS_APP.getServicePortEquipmentCatalogItems === "function") {
      items.push(...window.WS_APP.getServicePortEquipmentCatalogItems());
    }

    return items.map(normalizeEquipmentCatalogItem).filter((item) => item.id);
  }

  function mergeEquipmentCatalogItems(...lists) {
    const seen = new Set();
    const merged = [];

    lists.flat().forEach((item) => {
      const key = item?.catalogId || item?.id;
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });

    return merged;
  }

  function rebuildEquipmentCatalogIndex() {
    const catalog = mergeEquipmentCatalogItems(getSeedEquipmentCatalogItems(), getDynamicCyberwareCatalogItems());
    const index = new Map();
    catalog.forEach((item) => {
      const ids = [item?.id, item?.catalogId, item?.implantId, item?.sourceCatalogId]
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      ids.forEach((id) => {
        if (!index.has(id)) index.set(id, item);
      });
    });
    equipmentCatalogCache = catalog;
    equipmentCatalogIndex = index;
    equipmentCatalogRevision += 1;
    return equipmentCatalogCache;
  }

  function getCanonicalEquipmentCatalog() {
    return equipmentCatalogCache || rebuildEquipmentCatalogIndex();
  }

  function getEquipmentCatalogIndex() {
    if (!equipmentCatalogIndex) rebuildEquipmentCatalogIndex();
    return equipmentCatalogIndex;
  }

  function invalidateEquipmentCatalogIndex() {
    equipmentCatalogCache = null;
    equipmentCatalogIndex = null;
    equipmentCatalogRevision += 1;
    window.WS_APP.invalidateCyberwarePlannerContext?.();
    return equipmentCatalogRevision;
  }

  function getEquipmentCatalogRevision() {
    return equipmentCatalogRevision;
  }

  function getEquipmentCatalogItems(options = {}) {
    const includeArchived = options.includeArchived === true;
    const catalog = getCanonicalEquipmentCatalog();
    const filtered = includeArchived ? catalog : catalog.filter((item) => !item.archived);
    return clone(filtered);
  }

  function getEquipmentCatalogItemById(catalogId = "") {
    const requestedId = String(catalogId || "").trim();
    if (!requestedId) return null;
    const aliases = { ...(window.APP_DATA?.bodyCyberwareDefinitionAliases || {}), ...(window.APP_DATA?.equipmentDefinitionAliases || {}) };
    const id = String(aliases[requestedId] || requestedId).trim();
    const item = getEquipmentCatalogIndex().get(id) || null;
    return item ? clone(item) : null;
  }

  window.WS_APP.ensureEquipmentCatalogLoaded = function ensureEquipmentCatalogLoaded() {
    if (Array.isArray(window.APP_DATA?.equipmentCatalog)) return Promise.resolve(getEquipmentCatalogItems({ includeArchived: true }));
    if (typeof window.WS_APP.loadLazyScript === "function") {
      return window.WS_APP.loadLazyScript(EQUIPMENT_CATALOG_DATA_URL)
        .then(() => {
          invalidateEquipmentCatalogIndex();
          return getEquipmentCatalogItems({ includeArchived: true });
        });
    }
    return Promise.resolve(getEquipmentCatalogItems({ includeArchived: true }));
  };

  window.WS_APP.EQUIPMENT_FOOTPRINTS = EQUIPMENT_FOOTPRINTS;
  window.WS_APP.getEquipmentFootprintSize = getEquipmentFootprintSize;
  window.WS_APP.normalizeEquipmentContainerProfile = normalizeEquipmentContainerProfile;
  window.WS_APP.normalizeEquipmentCyberwareMeta = normalizeEquipmentCyberwareMeta;
  window.WS_APP.normalizeEquipmentVisualProfile = normalizeEquipmentVisualProfile;
  window.WS_APP.normalizeEquipmentCatalogItem = normalizeEquipmentCatalogItem;
  window.WS_APP.getEquipmentCatalogItems = getEquipmentCatalogItems;
  window.WS_APP.getEquipmentCatalogItemById = getEquipmentCatalogItemById;
  window.WS_APP.getEquipmentCatalogIndex = getEquipmentCatalogIndex;
  window.WS_APP.getEquipmentCatalogRevision = getEquipmentCatalogRevision;
  window.WS_APP.invalidateEquipmentCatalogIndex = invalidateEquipmentCatalogIndex;
})();
