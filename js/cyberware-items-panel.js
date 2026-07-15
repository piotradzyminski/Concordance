(function initCyberwareItems() {
  window.WS_APP = window.WS_APP || {};
  const runtime = window.WS_APP.cyberwareRuntime = window.WS_APP.cyberwareRuntime || {};
  const clampNumber = (...args) => runtime.clampNumber(...args);
  const getArmFootprint = (...args) => runtime.getArmFootprint(...args);
  const getHandFootprint = (...args) => runtime.getHandFootprint(...args);
  const getInterfaceTierDefinition = (...args) => runtime.getInterfaceTierDefinition(...args);
  const inferCyberwareScale = (...args) => runtime.inferCyberwareScale(...args);
  const inferCyberwareSlots = (...args) => runtime.inferCyberwareSlots(...args);
  const normalizeCyberwareBusList = (...args) => runtime.normalizeCyberwareBusList(...args);
  const normalizeCyberwareEntry = (...args) => runtime.normalizeCyberwareEntry(...args);
  const normalizeCyberwareFirmwareStatus = (...args) => runtime.normalizeCyberwareFirmwareStatus(...args);
  const normalizeCyberwareFlag = (...args) => runtime.normalizeCyberwareFlag(...args);
  const normalizeCyberwareGradeKey = (...args) => runtime.normalizeCyberwareGradeKey(...args);
  const normalizeCyberwareLicenseStatus = (...args) => runtime.normalizeCyberwareLicenseStatus(...args);
  const normalizeCyberwareScaleKey = (...args) => runtime.normalizeCyberwareScaleKey(...args);
  const normalizeCyberwareSubscriptionCategory = (...args) => runtime.normalizeCyberwareSubscriptionCategory(...args);
  const normalizeCyberwareSubscriptionTier = (...args) => runtime.normalizeCyberwareSubscriptionTier(...args);
  const normalizeCyberwareTier = (...args) => runtime.normalizeCyberwareTier(...args);
  const normalizeCyberwareVersion = (...args) => runtime.normalizeCyberwareVersion(...args);
  const normalizeToken = (...args) => runtime.normalizeToken(...args);
  const uniqueValues = (...args) => runtime.uniqueValues(...args);
  const BODY_CYBERWARE_CATALOG_DOMAINS = runtime.BODY_CYBERWARE_CATALOG_DOMAINS;
  const CYBERWARE_BLOCKING_FIRMWARE_STATUSES = runtime.CYBERWARE_BLOCKING_FIRMWARE_STATUSES;

  function normalizeNeurochipCatalogManufacturer(source = {}, index = 0) {
    if (!source || typeof source !== "object") return null;
    const id = String(source.id || `neurochip-manufacturer-${index + 1}`).trim();
    const name = String(source.name || id).trim();
    if (!id || !name) return null;
    return {
      id,
      name,
      market: String(source.market || "PRIVATE").trim().toUpperCase(),
      role: String(source.role || "NEUROCHIP_MANUFACTURER").trim().toUpperCase(),
      specialization: String(source.specialization || "").trim(),
      mechanicalProfile: String(source.mechanicalProfile || "").trim(),
      bestFor: Array.isArray(source.bestFor) ? source.bestFor.map((item) => String(item).trim()).filter(Boolean) : [],
      strengths: Array.isArray(source.strengths) ? source.strengths.map((item) => String(item).trim()).filter(Boolean) : [],
      weaknesses: Array.isArray(source.weaknesses) ? source.weaknesses.map((item) => String(item).trim()).filter(Boolean) : []
    };
  }

  function getRawNeurochipCatalog() {
    const catalog = window.APP_DATA?.neurochipCatalog || {};
    const neurochips = Array.isArray(catalog.neurochips)
      ? catalog.neurochips
      : Array.isArray(window.APP_DATA?.neurochips)
        ? window.APP_DATA.neurochips
        : [];
    const manufacturers = Array.isArray(catalog.manufacturers)
      ? catalog.manufacturers
      : Array.isArray(window.APP_DATA?.neurochipManufacturers)
        ? window.APP_DATA.neurochipManufacturers
        : [];
    return { neurochips, manufacturers };
  }

  function getNeurochipCatalogManufacturers() {
    return getRawNeurochipCatalog().manufacturers
      .map((item, index) => normalizeNeurochipCatalogManufacturer(item, index))
      .filter(Boolean);
  }

  function normalizeNeurochipCatalogItem(source = {}, index = 0) {
    if (!source || typeof source !== "object") return null;
    const id = String(source.id || source.catalogId || `neurochip-${index + 1}`).trim();
    const name = String(source.name || source.model || id).trim();
    if (!id || !name) return null;
    const manufacturerId = String(source.manufacturerId || source.providerId || "").trim();
    const manufacturer = String(source.manufacturer || source.provider || manufacturerId || "Unknown Neurochip Vendor").trim();
    const tier = normalizeCyberwareTier(source.neurochipTier ?? source.tier ?? source.processorTier ?? 1);
    const grade = normalizeCyberwareGradeKey(source.grade || source.quality || "LICENSED");
    const maxScale = normalizeCyberwareScaleKey(source.maxScale || source.maxImplantSize || "SMALL") || "SMALL";
    const maxGrade = normalizeCyberwareGradeKey(source.maxCyberwareGrade || source.qualityCeiling || grade);
    const tags = Array.isArray(source.tags) ? source.tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
    const base = normalizeCyberwareEntry({
      ...source,
      id,
      implantId: source.implantId || id,
      name,
      manufacturer,
      provider: manufacturer,
      processorRole: "NEUROCHIP",
      isCoreProcessor: true,
      scale: "SMALL",
      size: "SMALL",
      slot: "neural",
      slots: ["neural"],
      slotCost: 1,
      neurochipTier: tier,
      grade,
      maxCyberwareGrade: maxGrade,
      maxScale,
      status: source.status || "CATALOG",
      neuroLoad: 0,
      interfaceLoad: 0,
      requiredBuses: [],
      tags: uniqueValues(["CYBERWARE", "NEUROCHIP", grade, String(source.availability || "").trim().toUpperCase(), ...tags])
    }, index);
    if (!base) return null;
    return {
      ...base,
      catalogId: String(source.catalogId || id).trim(),
      manufacturerId,
      manufacturer,
      provider: manufacturer,
      market: String(source.market || "PRIVATE").trim().toUpperCase(),
      category: String(source.category || "CYBERWARE").trim().toUpperCase(),
      subtype: String(source.subtype || "NEUROCHIP").trim().toUpperCase(),
      role: String(source.role || "NEUROCHIP_CPU").trim().toUpperCase(),
      line: String(source.line || "").trim(),
      model: String(source.model || name).trim(),
      summary: String(source.summary || source.mainFeature || "").trim(),
      mainFeature: String(source.mainFeature || source.summary || "").trim(),
      description: String(source.description || source.notes || "").trim(),
      tier,
      neurochipTier: tier,
      qualityCeiling: maxGrade,
      maxImplantSize: maxScale,
      memory: clampNumber(source.memory, 0, 240, 0),
      latency: String(source.latency || source.latencyClass || base.latencyClass || "MEDIUM").trim().toUpperCase(),
      stability: clampNumber(source.stability, 0, 100, 50),
      security: clampNumber(source.security, 0, 100, 50),
      maintenanceCost: String(source.maintenanceCost || "MEDIUM").trim().toUpperCase(),
      basePrice: Math.max(0, Number(source.basePrice || source.value || 0)),
      value: Math.max(0, Number(source.value || source.basePrice || 0)),
      availability: String(source.availability || "CONTROLLED").trim().toUpperCase(),
      specialFeatures: Array.isArray(source.specialFeatures) ? source.specialFeatures.map((item) => String(item).trim()).filter(Boolean) : [],
      requiredSubscriptionTags: Array.isArray(source.requiredSubscriptionTags) ? source.requiredSubscriptionTags.map((item) => String(item).trim()).filter(Boolean) : []
    };
  }

  function getNeurochipCatalog() {
    return getRawNeurochipCatalog().neurochips
      .map((item, index) => normalizeNeurochipCatalogItem(item, index))
      .filter(Boolean);
  }

  function getNeurochipCatalogItem(id = "") {
    const key = String(id || "").trim();
    if (!key) return null;
    return getNeurochipCatalog().find((item) => item.id === key || item.catalogId === key || item.implantId === key || item.model === key || item.name === key) || null;
  }

  function searchNeurochipCatalog(filters = {}) {
    const query = normalizeToken(filters.q || filters.query || filters.search || filters.text || "");
    const manufacturerId = String(filters.manufacturerId || "").trim();
    const role = String(filters.role || "").trim().toUpperCase();
    const grade = filters.grade ? normalizeCyberwareGradeKey(filters.grade) : "";
    const legality = String(filters.legality || "").trim().toUpperCase();
    const availability = String(filters.availability || "").trim().toUpperCase();
    const maxScale = filters.maxScale || filters.maxImplantSize ? normalizeCyberwareScaleKey(filters.maxScale || filters.maxImplantSize) : "";
    const minTier = filters.minTier !== undefined ? normalizeCyberwareTier(filters.minTier) : null;
    const maxTier = filters.maxTier !== undefined ? normalizeCyberwareTier(filters.maxTier) : null;
    const tag = normalizeToken(filters.tag || "");
    return getNeurochipCatalog().filter((item) => {
      if (query) {
        const haystack = normalizeToken([item.id, item.name, item.model, item.manufacturer, item.role, item.summary, item.mainFeature, item.description, ...(item.specialFeatures || []), ...(item.tags || [])].join(" "));
        if (!haystack.includes(query)) return false;
      }
      if (manufacturerId && item.manufacturerId !== manufacturerId) return false;
      if (role && item.role !== role) return false;
      if (grade && item.grade !== grade && item.qualityCeiling !== grade && item.maxCyberwareGrade !== grade) return false;
      if (legality && item.legality !== legality) return false;
      if (availability && item.availability !== availability) return false;
      if (maxScale && item.maxScale !== maxScale && item.maxImplantSize !== maxScale) return false;
      if (minTier !== null && item.neurochipTier < minTier) return false;
      if (maxTier !== null && item.neurochipTier > maxTier) return false;
      if (tag && !(item.tags || []).some((itemTag) => normalizeToken(itemTag) === tag)) return false;
      return true;
    });
  }

  function createNeurochipInstallCandidateFromCatalogItem(itemOrId = {}, options = {}) {
    const catalogItem = typeof itemOrId === "string" ? getNeurochipCatalogItem(itemOrId) : normalizeNeurochipCatalogItem(itemOrId, options.index || 0);
    if (!catalogItem) return null;
    const instanceId = String(options.id || options.instanceId || `installed-${catalogItem.id}`).trim();
    return normalizeCyberwareEntry({
      ...catalogItem,
      id: instanceId,
      implantId: catalogItem.id,
      catalogId: catalogItem.catalogId || catalogItem.id,
      sourceCatalogId: catalogItem.catalogId || catalogItem.id,
      sourceType: "NEUROCHIP_CATALOG",
      status: options.status || "PENDING_INSTALL",
      condition: options.condition ?? 100,
      lastImplantCheck: null,
      installLog: []
    }, options.index || 0);
  }

  function normalizeInterfaceCatalogManufacturer(source = {}, index = 0) {
    if (!source || typeof source !== "object") return null;
    const id = String(source.id || `interface-manufacturer-${index + 1}`).trim();
    const name = String(source.name || id).trim();
    if (!id || !name) return null;
    return {
      id,
      name,
      market: String(source.market || "PRIVATE").trim().toUpperCase(),
      role: String(source.role || "INTERFACE_MANUFACTURER").trim().toUpperCase(),
      specialization: String(source.specialization || "").trim(),
      mechanicalProfile: String(source.mechanicalProfile || "").trim(),
      bestFor: Array.isArray(source.bestFor) ? source.bestFor.map((item) => String(item).trim()).filter(Boolean) : [],
      strengths: Array.isArray(source.strengths) ? source.strengths.map((item) => String(item).trim()).filter(Boolean) : [],
      weaknesses: Array.isArray(source.weaknesses) ? source.weaknesses.map((item) => String(item).trim()).filter(Boolean) : []
    };
  }

  function getRawInterfaceCatalog() {
    const catalog = window.APP_DATA?.interfaceCatalog || {};
    const interfaces = Array.isArray(catalog.interfaces)
      ? catalog.interfaces
      : Array.isArray(window.APP_DATA?.interfaces)
        ? window.APP_DATA.interfaces
        : [];
    const manufacturers = Array.isArray(catalog.manufacturers)
      ? catalog.manufacturers
      : Array.isArray(window.APP_DATA?.interfaceManufacturers)
        ? window.APP_DATA.interfaceManufacturers
        : [];
    return { interfaces, manufacturers };
  }

  function getInterfaceCatalogManufacturers() {
    return getRawInterfaceCatalog().manufacturers
      .map((item, index) => normalizeInterfaceCatalogManufacturer(item, index))
      .filter(Boolean);
  }

  function normalizeInterfaceCatalogItem(source = {}, index = 0) {
    if (!source || typeof source !== "object") return null;
    const id = String(source.id || source.catalogId || `interface-${index + 1}`).trim();
    const name = String(source.name || source.model || id).trim();
    if (!id || !name) return null;
    const manufacturerId = String(source.manufacturerId || source.providerId || "").trim();
    const manufacturer = String(source.manufacturer || source.provider || manufacturerId || "Unknown Interface Vendor").trim();
    const tier = normalizeCyberwareTier(source.interfaceTier ?? source.tier ?? source.socketTier ?? 1);
    const grade = normalizeCyberwareGradeKey(source.grade || source.quality || "LICENSED");
    const supportedBuses = normalizeCyberwareBusList(source.supportedBuses || source.buses || ["STANDARD_BODY_BUS"]);
    const interfaceDefinition = getInterfaceTierDefinition(tier);
    const tags = Array.isArray(source.tags) ? source.tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
    const base = normalizeCyberwareEntry({
      ...source,
      id,
      implantId: source.implantId || id,
      name,
      manufacturer,
      provider: manufacturer,
      processorRole: "INTERFACE_BACKPLANE",
      isCoreInterface: true,
      scale: "SMALL",
      size: "SMALL",
      slot: "interface",
      slots: ["interface"],
      slotCost: 1,
      interfaceTier: tier,
      interfaceCapacity: source.interfaceCapacity ?? interfaceDefinition.interfaceCapacity,
      supportedBuses,
      grade,
      status: source.status || "CATALOG",
      neuroLoad: 0,
      interfaceLoad: 0,
      requiredBuses: [],
      tags: uniqueValues(["CYBERWARE", "INTERFACE", grade, String(source.availability || "").trim().toUpperCase(), ...tags])
    }, index);
    if (!base) return null;
    return {
      ...base,
      catalogId: String(source.catalogId || id).trim(),
      manufacturerId,
      manufacturer,
      provider: manufacturer,
      market: String(source.market || "PRIVATE").trim().toUpperCase(),
      category: String(source.category || "CYBERWARE").trim().toUpperCase(),
      subtype: String(source.subtype || "INTERFACE").trim().toUpperCase(),
      role: String(source.role || "INTERFACE_BACKPLANE").trim().toUpperCase(),
      line: String(source.line || "").trim(),
      model: String(source.model || name).trim(),
      summary: String(source.summary || source.mainFeature || "").trim(),
      mainFeature: String(source.mainFeature || source.summary || "").trim(),
      localFeature: String(source.localFeature || "").trim(),
      description: String(source.description || source.notes || "").trim(),
      tier,
      interfaceTier: tier,
      physicalSlot: String(source.physicalSlot || "occipital_spinal").trim(),
      bodyLocation: String(source.bodyLocation || source.location || "rear_head_spine_junction").trim(),
      interfaceLanes: clampNumber(source.interfaceLanes, 0, 64, Math.max(1, tier + 2)),
      neurochipSocketRating: clampNumber(source.neurochipSocketRating, 0, 10, tier),
      bodyBusRating: clampNumber(source.bodyBusRating, 0, 100, 20 + tier * 12),
      signalIntegrity: clampNumber(source.signalIntegrity, 0, 100, 45 + tier * 7),
      powerRouting: clampNumber(source.powerRouting, 0, 100, 38 + tier * 7),
      thermalRouting: clampNumber(source.thermalRouting, 0, 100, 34 + tier * 7),
      securityIsolation: clampNumber(source.securityIsolation, 0, 100, 36 + tier * 7),
      redundancy: clampNumber(source.redundancy, 0, 100, 18 + tier * 10),
      latency: String(source.latency || source.latencyClass || base.latencyClass || "MEDIUM").trim().toUpperCase(),
      protocolSupport: Array.isArray(source.protocolSupport) ? source.protocolSupport.map((item) => String(item).trim()).filter(Boolean) : [],
      supportedBuses,
      bestPairedWith: Array.isArray(source.bestPairedWith) ? source.bestPairedWith.map((item) => String(item).trim()).filter(Boolean) : [],
      hotSwapSupport: source.hotSwapSupport === true,
      maintenanceCost: String(source.maintenanceCost || "MEDIUM").trim().toUpperCase(),
      basePrice: Math.max(0, Number(source.basePrice || source.value || 0)),
      value: Math.max(0, Number(source.value || source.basePrice || 0)),
      availability: String(source.availability || "CONTROLLED").trim().toUpperCase(),
      specialFeatures: Array.isArray(source.specialFeatures) ? source.specialFeatures.map((item) => String(item).trim()).filter(Boolean) : []
    };
  }

  function getInterfaceCatalog() {
    return getRawInterfaceCatalog().interfaces
      .map((item, index) => normalizeInterfaceCatalogItem(item, index))
      .filter(Boolean);
  }

  function getInterfaceCatalogItem(id = "") {
    const key = String(id || "").trim();
    if (!key) return null;
    return getInterfaceCatalog().find((item) => item.id === key || item.catalogId === key || item.implantId === key || item.model === key || item.name === key) || null;
  }

  function searchInterfaceCatalog(filters = {}) {
    const query = normalizeToken(filters.q || filters.query || filters.search || filters.text || "");
    const manufacturerId = String(filters.manufacturerId || "").trim();
    const role = String(filters.role || "").trim().toUpperCase();
    const grade = filters.grade ? normalizeCyberwareGradeKey(filters.grade) : "";
    const legality = String(filters.legality || "").trim().toUpperCase();
    const availability = String(filters.availability || "").trim().toUpperCase();
    const supportedBus = normalizeToken(filters.supportedBus || filters.bus || "");
    const protocol = normalizeToken(filters.protocol || filters.protocolSupport || "");
    const minTier = filters.minTier !== undefined ? normalizeCyberwareTier(filters.minTier) : null;
    const maxTier = filters.maxTier !== undefined ? normalizeCyberwareTier(filters.maxTier) : null;
    const minLanes = filters.minLanes !== undefined ? Number(filters.minLanes) : null;
    const tag = normalizeToken(filters.tag || "");
    return getInterfaceCatalog().filter((item) => {
      if (query) {
        const haystack = normalizeToken([item.id, item.name, item.model, item.manufacturer, item.role, item.summary, item.mainFeature, item.description, ...(item.specialFeatures || []), ...(item.tags || [])].join(" "));
        if (!haystack.includes(query)) return false;
      }
      if (manufacturerId && item.manufacturerId !== manufacturerId) return false;
      if (role && item.role !== role) return false;
      if (grade && item.grade !== grade) return false;
      if (legality && item.legality !== legality) return false;
      if (availability && item.availability !== availability) return false;
      if (supportedBus && !(item.supportedBuses || []).some((bus) => normalizeToken(bus) === supportedBus)) return false;
      if (protocol && !(item.protocolSupport || []).some((itemProtocol) => normalizeToken(itemProtocol) === protocol)) return false;
      if (minTier !== null && item.interfaceTier < minTier) return false;
      if (maxTier !== null && item.interfaceTier > maxTier) return false;
      if (minLanes !== null && item.interfaceLanes < minLanes) return false;
      if (tag && !(item.tags || []).some((itemTag) => normalizeToken(itemTag) === tag)) return false;
      return true;
    });
  }

  function createInterfaceInstallCandidateFromCatalogItem(itemOrId = {}, options = {}) {
    const catalogItem = typeof itemOrId === "string" ? getInterfaceCatalogItem(itemOrId) : normalizeInterfaceCatalogItem(itemOrId, options.index || 0);
    if (!catalogItem) return null;
    const instanceId = String(options.id || options.instanceId || `installed-${catalogItem.id}`).trim();
    return normalizeCyberwareEntry({
      ...catalogItem,
      id: instanceId,
      implantId: catalogItem.id,
      catalogId: catalogItem.catalogId || catalogItem.id,
      sourceCatalogId: catalogItem.catalogId || catalogItem.id,
      sourceType: "INTERFACE_CATALOG",
      status: options.status || "PENDING_INSTALL",
      condition: options.condition ?? 100,
      lastImplantCheck: null,
      installLog: []
    }, options.index || 0);
  }


  function normalizeServicePortCatalogManufacturer(source = {}, index = 0) {
    if (!source || typeof source !== "object") return null;
    const id = String(source.id || `service-port-manufacturer-${index + 1}`).trim();
    const name = String(source.name || id).trim();
    if (!id || !name) return null;
    return {
      id,
      name,
      market: String(source.market || "PRIVATE").trim().toUpperCase(),
      role: String(source.role || "SERVICE_PORT_VENDOR").trim().toUpperCase(),
      specialization: String(source.specialization || "").trim(),
      mechanicalProfile: String(source.mechanicalProfile || "").trim(),
      bestFor: Array.isArray(source.bestFor) ? source.bestFor.map((item) => String(item).trim()).filter(Boolean) : [],
      strengths: Array.isArray(source.strengths) ? source.strengths.map((item) => String(item).trim()).filter(Boolean) : [],
      weaknesses: Array.isArray(source.weaknesses) ? source.weaknesses.map((item) => String(item).trim()).filter(Boolean) : [],
      compatibilityTags: Array.isArray(source.compatibilityTags) ? source.compatibilityTags.map((item) => String(item).trim()).filter(Boolean) : []
    };
  }

  function getRawServicePortCatalog() {
    const catalog = window.APP_DATA?.servicePortCatalog || {};
    const servicePorts = Array.isArray(catalog.servicePorts)
      ? catalog.servicePorts
      : Array.isArray(window.APP_DATA?.servicePorts)
        ? window.APP_DATA.servicePorts
        : [];
    const manufacturers = Array.isArray(catalog.manufacturers)
      ? catalog.manufacturers
      : Array.isArray(window.APP_DATA?.servicePortManufacturers)
        ? window.APP_DATA.servicePortManufacturers
        : [];
    return { servicePorts, manufacturers };
  }

  function getServicePortCatalogManufacturers() {
    return getRawServicePortCatalog().manufacturers
      .map((item, index) => normalizeServicePortCatalogManufacturer(item, index))
      .filter(Boolean);
  }

  function normalizeServicePortCatalogItem(source = {}, index = 0) {
    if (!source || typeof source !== "object") return null;
    const id = String(source.id || source.catalogId || `service-port-${index + 1}`).trim();
    const name = String(source.name || source.model || id).trim();
    if (!id || !name) return null;
    const manufacturerId = String(source.manufacturerId || source.providerId || "").trim();
    const manufacturer = String(source.manufacturer || source.provider || manufacturerId || "Unknown Service Port Vendor").trim();
    const tier = normalizeCyberwareTier(source.servicePortTier ?? source.tier ?? source.portTier ?? 1);
    const grade = normalizeCyberwareGradeKey(source.grade || source.quality || (tier >= 3 ? "CORPORATE" : tier >= 2 ? "LICENSED" : "CIVILIAN"));
    const tags = Array.isArray(source.tags) ? source.tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
    const base = normalizeCyberwareEntry({
      ...source,
      id,
      implantId: source.implantId || id,
      name,
      manufacturer,
      provider: manufacturer,
      category: "CYBERWARE",
      subtype: "SERVICE_PORT",
      processorRole: "SERVICE_PORT",
      isServicePort: true,
      scale: "SMALL",
      size: "SMALL",
      slot: "neckService",
      primarySlot: "neckService",
      slots: ["neckService"],
      slotCost: 1,
      neuroLoad: 0,
      interfaceLoad: 0,
      requiresNeurochipTier: 0,
      requiresInterfaceTier: 0,
      requiredBuses: [],
      supportedBuses: [],
      servicePortTier: tier,
      grade,
      status: source.status || "CATALOG",
      tags: uniqueValues(["CYBERWARE", "SERVICE_PORT", "PORT", grade, String(source.availability || "").trim().toUpperCase(), ...tags])
    }, index);
    if (!base) return null;
    return {
      ...base,
      catalogId: String(source.catalogId || id).trim(),
      manufacturerId,
      manufacturer,
      provider: manufacturer,
      market: String(source.market || "PRIVATE").trim().toUpperCase(),
      category: "CYBERWARE",
      subtype: "SERVICE_PORT",
      role: Array.isArray(source.role) ? "SERVICE_PORT" : String(source.role || "SERVICE_PORT").trim().toUpperCase(),
      line: String(source.line || "Service Port").trim(),
      model: String(source.model || name).trim(),
      summary: String(source.summary || source.mainFeature || "").trim(),
      mainFeature: String(source.mainFeature || source.summary || "").trim(),
      description: String(source.description || source.notes || "").trim(),
      tier,
      servicePortTier: tier,
      physicalSlot: String(source.physicalSlot || "neck_service").trim(),
      bodyLocation: String(source.bodyLocation || source.location || "neck_head_junction").trim(),
      visualLocation: String(source.visualLocation || "rear neck Matrix-like cable socket").trim(),
      serviceAccess: clampNumber(source.serviceAccess, 0, 100, 35 + tier * 18),
      diagnosticDepth: clampNumber(source.diagnosticDepth, 0, 100, 30 + tier * 18),
      firmwareAccess: clampNumber(source.firmwareAccess, 0, 100, 24 + tier * 18),
      calibrationQuality: clampNumber(source.calibrationQuality, 0, 100, 30 + tier * 18),
      securityLock: clampNumber(source.securityLock, 0, 100, 28 + tier * 18),
      emergencyAccess: clampNumber(source.emergencyAccess, 0, 100, 22 + tier * 18),
      traceability: clampNumber(source.traceability, 0, 100, 45 + tier * 12),
      physicalResilience: clampNumber(source.physicalResilience, 0, 100, 40 + tier * 10),
      roleDescription: Array.isArray(source.roleDescription)
        ? source.roleDescription.map((item) => String(item).trim()).filter(Boolean)
        : Array.isArray(source.role)
          ? source.role.map((item) => String(item).trim()).filter(Boolean)
          : base.roleDescription || [],
      notRole: Array.isArray(source.notRole) ? source.notRole.map((item) => String(item).trim()).filter(Boolean) : base.notRole || [],
      compatibilityTags: Array.isArray(source.compatibilityTags) ? source.compatibilityTags.map((item) => String(item).trim()).filter(Boolean) : [],
      bestFor: Array.isArray(source.bestFor) ? source.bestFor.map((item) => String(item).trim()).filter(Boolean) : [],
      strengths: Array.isArray(source.strengths) ? source.strengths.map((item) => String(item).trim()).filter(Boolean) : [],
      weaknesses: Array.isArray(source.weaknesses) ? source.weaknesses.map((item) => String(item).trim()).filter(Boolean) : [],
      basePrice: Math.max(0, Number(source.basePrice || source.value || 0)),
      value: Math.max(0, Number(source.value || source.basePrice || 0)),
      availability: String(source.availability || "CONTROLLED").trim().toUpperCase(),
      specialFeatures: Array.isArray(source.specialFeatures) ? source.specialFeatures.map((item) => String(item).trim()).filter(Boolean) : []
    };
  }

  function getServicePortCatalog() {
    return getRawServicePortCatalog().servicePorts
      .map((item, index) => normalizeServicePortCatalogItem(item, index))
      .filter(Boolean);
  }

  function getServicePortCatalogItem(id = "") {
    const key = String(id || "").trim();
    if (!key) return null;
    return getServicePortCatalog().find((item) => item.id === key || item.catalogId === key || item.implantId === key || item.model === key || item.name === key) || null;
  }

  function searchServicePortCatalog(filters = {}) {
    const query = normalizeToken(filters.q || filters.query || filters.search || filters.text || "");
    const manufacturerId = String(filters.manufacturerId || "").trim();
    const role = String(filters.role || "").trim().toUpperCase();
    const grade = filters.grade ? normalizeCyberwareGradeKey(filters.grade) : "";
    const legality = String(filters.legality || "").trim().toUpperCase();
    const availability = String(filters.availability || "").trim().toUpperCase();
    const minTier = filters.minTier !== undefined ? normalizeCyberwareTier(filters.minTier) : null;
    const maxTier = filters.maxTier !== undefined ? normalizeCyberwareTier(filters.maxTier) : null;
    const minSecurity = filters.minSecurity !== undefined ? Number(filters.minSecurity) : null;
    const minEmergencyAccess = filters.minEmergencyAccess !== undefined ? Number(filters.minEmergencyAccess) : null;
    const tag = normalizeToken(filters.tag || "");
    return getServicePortCatalog().filter((item) => {
      if (query) {
        const haystack = normalizeToken([item.id, item.name, item.model, item.manufacturer, item.role, item.summary, item.mainFeature, item.description, ...(item.specialFeatures || []), ...(item.tags || []), ...(item.compatibilityTags || [])].join(" "));
        if (!haystack.includes(query)) return false;
      }
      if (manufacturerId && item.manufacturerId !== manufacturerId) return false;
      if (role && item.role !== role) return false;
      if (grade && item.grade !== grade) return false;
      if (legality && item.legality !== legality) return false;
      if (availability && item.availability !== availability) return false;
      if (minTier !== null && item.servicePortTier < minTier) return false;
      if (maxTier !== null && item.servicePortTier > maxTier) return false;
      if (minSecurity !== null && item.securityLock < minSecurity) return false;
      if (minEmergencyAccess !== null && item.emergencyAccess < minEmergencyAccess) return false;
      if (tag && !(item.tags || []).some((itemTag) => normalizeToken(itemTag) === tag) && !(item.compatibilityTags || []).some((itemTag) => normalizeToken(itemTag) === tag)) return false;
      return true;
    });
  }

  function createServicePortInstallCandidateFromCatalogItem(itemOrId = {}, options = {}) {
    const catalogItem = typeof itemOrId === "string" ? getServicePortCatalogItem(itemOrId) : normalizeServicePortCatalogItem(itemOrId, options.index || 0);
    if (!catalogItem) return null;
    const instanceId = String(options.id || options.instanceId || `installed-${catalogItem.id}`).trim();
    return normalizeCyberwareEntry({
      ...catalogItem,
      id: instanceId,
      implantId: catalogItem.id,
      catalogId: catalogItem.catalogId || catalogItem.id,
      sourceCatalogId: catalogItem.catalogId || catalogItem.id,
      sourceType: "SERVICE_PORT_CATALOG",
      status: options.status || "PENDING_INSTALL",
      condition: options.condition ?? 100,
      lastImplantCheck: null,
      installLog: []
    }, options.index || 0);
  }

  function buildServicePortEquipmentCatalogItem(item = {}) {
    const port = normalizeServicePortCatalogItem(item, 0);
    if (!port) return null;
    return {
      id: `eqcat-${port.id}`,
      catalogId: `eqcat-${port.id}`,
      name: `${port.name} Implant Kit`,
      category: "CYBERWARE",
      subtype: "SERVICE_PORT",
      footprint: "1x1",
      status: "OWNED",
      operatingStatus: "PACKAGED",
      legality: port.legality,
      condition: 100,
      value: port.value || port.basePrice || 0,
      cyberwareCandidate: true,
      implantId: port.id,
      sourceCatalogId: port.catalogId || port.id,
      sourceType: "SERVICE_PORT_CATALOG",
      manufacturer: port.manufacturer,
      provider: port.provider,
      grade: port.grade,
      scale: "SMALL",
      primarySlot: "neckService",
      slot: "neckService",
      slots: ["neckService"],
      slotCost: 1,
      customizationSlots: 0,
      neuroLoad: 0,
      interfaceLoad: 0,
      requiredBuses: [],
      requiresNeurochipTier: 0,
      requiresInterfaceTier: 0,
      processorRole: "SERVICE_PORT",
      isServicePort: true,
      servicePortTier: port.servicePortTier,
      serviceAccess: port.serviceAccess,
      diagnosticDepth: port.diagnosticDepth,
      firmwareAccess: port.firmwareAccess,
      calibrationQuality: port.calibrationQuality,
      securityLock: port.securityLock,
      emergencyAccess: port.emergencyAccess,
      traceability: port.traceability,
      physicalResilience: port.physicalResilience,
      visualLocation: port.visualLocation,
      compatibilityTags: [...(port.compatibilityTags || [])],
      specialFeatures: [...(port.specialFeatures || [])],
      tags: uniqueValues(["CYBERWARE", "SERVICE_PORT", "IMPLANT", "PORT", ...(port.tags || [])]),
      notes: `Packaged service port implant kit from ${port.manufacturer}. Equipment source for Cyberware install planner.`
    };
  }

  function getServicePortEquipmentCatalogItems() {
    return getServicePortCatalog().map(buildServicePortEquipmentCatalogItem).filter(Boolean);
  }


  function getRawBodyCyberwareCatalog() {
    const catalog = window.APP_DATA?.bodyCyberwareCatalog || {};
    const bodyCyberware = Array.isArray(catalog.bodyCyberware)
      ? catalog.bodyCyberware
      : Array.isArray(window.APP_DATA?.bodyCyberware)
        ? window.APP_DATA.bodyCyberware
        : [];
    return { bodyCyberware };
  }

  function normalizeBodyCyberwareCatalogItem(source = {}, index = 0) {
    if (!source || typeof source !== "object") return null;
    const id = String(source.id || source.catalogId || `body-cyberware-${index + 1}`).trim();
    const name = String(source.name || source.model || source.title || id).trim();
    if (!id || !name) return null;
    const subtype = String(source.catalogDomain || source.subtype || source.bodyCategory || source.itemType || "IMPLANT").trim().toUpperCase() || "IMPLANT";
    const manufacturerId = String(source.manufacturerId || source.providerId || "").trim();
    const manufacturer = String(source.manufacturer || source.provider || manufacturerId || "Unknown Cyberware Vendor").trim();
    const grade = normalizeCyberwareGradeKey(source.grade || source.quality || "LICENSED");
    const tags = Array.isArray(source.tags) ? source.tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
    const base = normalizeCyberwareEntry({
      ...source,
      id,
      implantId: source.implantId || id,
      name,
      manufacturer,
      provider: manufacturer,
      category: "CYBERWARE",
      subtype,
      catalogDomain: subtype,
      sourceType: "BODY_CYBERWARE_CATALOG",
      status: source.status || "CATALOG",
      grade,
      tags: uniqueValues(["CYBERWARE", "BODY_CYBERWARE", subtype, grade, String(source.availability || "").trim().toUpperCase(), ...tags])
    }, index);
    if (!base) return null;
    return {
      ...base,
      catalogId: String(source.catalogId || id).trim(),
      manufacturerId,
      manufacturer,
      provider: manufacturer,
      market: String(source.market || "PRIVATE").trim().toUpperCase(),
      category: "CYBERWARE",
      subtype,
      catalogDomain: subtype,
      bodyCategory: subtype,
      sourceType: "BODY_CYBERWARE_CATALOG",
      role: String(source.role || subtype).trim().toUpperCase(),
      line: String(source.line || "").trim(),
      model: String(source.model || name).trim(),
      summary: String(source.summary || source.mainFeature || "").trim(),
      mainFeature: String(source.mainFeature || source.summary || "").trim(),
      description: String(source.description || source.notes || "").trim(),
      basePrice: Math.max(0, Number(source.basePrice || source.value || 0)),
      value: Math.max(0, Number(source.value || source.basePrice || 0)),
      marketPrice: Math.max(0, Number(source.marketPrice || source.price || source.basePrice || source.value || 0)),
      availability: String(source.availability || "CONTROLLED").trim().toUpperCase(),
      legality: String(source.legality || base.legality || "LICENSED").trim().toUpperCase(),
      equipmentFootprint: String(source.equipmentFootprint || source.footprint || "1x1").trim() || "1x1",
      bodyRegion: String(source.bodyRegion || source.targetRegion || "").trim().toUpperCase(),
      specialFeatures: Array.isArray(source.specialFeatures) ? source.specialFeatures.map((item) => String(item).trim()).filter(Boolean) : [],
      compatibilityTags: Array.isArray(source.compatibilityTags) ? source.compatibilityTags.map((item) => String(item).trim()).filter(Boolean) : []
    };
  }

  function getBodyCyberwareCatalog() {
    return getRawBodyCyberwareCatalog().bodyCyberware
      .map((item, index) => normalizeBodyCyberwareCatalogItem(item, index))
      .filter(Boolean);
  }

  function getBodyCyberwareCatalogItem(id = "") {
    const key = String(id || "").trim();
    if (!key) return null;
    return getBodyCyberwareCatalog().find((item) => item.id === key || item.catalogId === key || item.implantId === key || item.model === key || item.name === key) || null;
  }

  function searchBodyCyberwareCatalog(filters = {}) {
    const query = normalizeToken(filters.q || filters.query || filters.search || filters.text || "");
    const subtype = String(filters.subtype || filters.category || filters.catalogDomain || filters.bodyCategory || "").trim().toUpperCase();
    const manufacturerId = String(filters.manufacturerId || "").trim();
    const manufacturer = normalizeToken(filters.manufacturer || filters.provider || "");
    const grade = filters.grade ? normalizeCyberwareGradeKey(filters.grade) : "";
    const legality = String(filters.legality || "").trim().toUpperCase();
    const availability = String(filters.availability || "").trim().toUpperCase();
    const tag = normalizeToken(filters.tag || "");
    return getBodyCyberwareCatalog().filter((item) => {
      if (query) {
        const haystack = normalizeToken([
          item.id,
          item.catalogId,
          item.name,
          item.model,
          item.manufacturer,
          item.provider,
          item.catalogDomain,
          item.subtype,
          item.role,
          item.summary,
          item.mainFeature,
          item.description,
          ...(item.specialFeatures || []),
          ...(item.tags || [])
        ].join(" "));
        if (!haystack.includes(query)) return false;
      }
      if (subtype && item.subtype !== subtype && item.catalogDomain !== subtype && item.bodyCategory !== subtype) return false;
      if (manufacturerId && item.manufacturerId !== manufacturerId) return false;
      if (manufacturer && normalizeToken(item.manufacturer || item.provider || "") !== manufacturer) return false;
      if (grade && item.grade !== grade) return false;
      if (legality && item.legality !== legality) return false;
      if (availability && item.availability !== availability) return false;
      if (tag && !(item.tags || []).some((itemTag) => normalizeToken(itemTag) === tag)) return false;
      return true;
    });
  }

  function withCyberwareCatalogDomain(item = {}, catalogDomain = "") {
    if (!item || typeof item !== "object") return null;
    const domain = String(catalogDomain || item.catalogDomain || item.subtype || "CYBERWARE").trim().toUpperCase();
    const sourceType = domain === "NEUROCHIP"
      ? "NEUROCHIP_CATALOG"
      : domain === "INTERFACE"
        ? "INTERFACE_CATALOG"
        : domain === "SERVICE_PORT"
          ? "SERVICE_PORT_CATALOG"
          : String(item.sourceType || "CYBERWARE_CATALOG").trim().toUpperCase();
    const manufacturerToken = String(item.manufacturerId || item.manufacturer || item.provider || domain || "CYBERWARE")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "CYBERWARE";
    const explicitSubscriptionCategory = normalizeCyberwareSubscriptionCategory(item.subscriptionCategory || item.requiresSubscriptionCategory);
    const licenseRequired = item.licenseExempt === true
      ? false
      : normalizeCyberwareFlag(item.catalogLicenseRequired ?? item.catalogRequiresLicense ?? item.requiresCatalogLicense, true);
    const licenseActivationRequired = normalizeCyberwareFlag(item.catalogLicenseActivationRequired ?? item.catalogActivationRequired, licenseRequired);
    const licenseCodeRequired = normalizeCyberwareFlag(item.catalogLicenseCodeRequired ?? item.catalogRequiresLicenseCode, licenseActivationRequired);
    const subscriptionRequired = normalizeCyberwareFlag(item.catalogSubscriptionRequired ?? item.catalogRequiresSubscription ?? (item.subscriptionRequired === true ? true : undefined), false);
    const subscriptionCategory = subscriptionRequired ? explicitSubscriptionCategory || "CYBERWARE" : explicitSubscriptionCategory;
    const subscriptionTierRequired = normalizeCyberwareSubscriptionTier(item.subscriptionTierRequired ?? item.requiresSubscriptionTier ?? 0);
    const firmwareRequired = normalizeCyberwareFlag(item.catalogFirmwareRequired ?? item.catalogRequiresFirmware ?? item.requiresCatalogFirmware, true);
    const firmwareVersion = normalizeCyberwareVersion(item.firmwareVersion || item.currentFirmwareVersion || item.firmwareCurrentVersion || "1.0.0");
    const firmwareLatestVersion = normalizeCyberwareVersion(item.firmwareLatestVersion || item.latestFirmwareVersion || firmwareVersion);
    const firmwareChannel = String(item.firmwareChannel || item.firmwareSource || item.updateChannel || `${manufacturerToken}_STABLE`).trim().toUpperCase();
    const sourceFirmwareStatus = String(item.firmwareStatus || item.firmwareState || "").trim().toUpperCase();
    const firmwareStatus = normalizeCyberwareFirmwareStatus(sourceFirmwareStatus && sourceFirmwareStatus !== "NOT_REQUIRED" ? sourceFirmwareStatus : "CURRENT", firmwareRequired);
    return {
      ...item,
      catalogDomain: domain,
      sourceType,
      licenseRequired,
      licenseActivationRequired,
      licenseCodeRequired,
      licenseStatus: normalizeCyberwareLicenseStatus(item.licenseStatus || "CATALOG", licenseRequired),
      defaultLicenseStatus: normalizeCyberwareLicenseStatus(item.defaultLicenseStatus || item.equipmentLicenseStatus || (licenseActivationRequired ? "UNACTIVATED" : "NOT_REQUIRED"), licenseRequired),
      subscriptionRequired,
      subscriptionCategory,
      subscriptionTierRequired,
      subscriptionAvailableAfterPurchase: normalizeCyberwareFlag(item.subscriptionAvailableAfterPurchase ?? item.availableAfterPurchase, true),
      requiresSubscriptionCategory: subscriptionCategory,
      requiresSubscriptionTier: subscriptionTierRequired,
      firmwareRequired,
      firmwareChannel,
      firmwareVersion,
      firmwareLatestVersion,
      firmwareStatus,
      firmwareUpdateRequired: normalizeCyberwareFlag(item.firmwareUpdateRequired ?? item.requiresFirmwareUpdate, firmwareRequired && CYBERWARE_BLOCKING_FIRMWARE_STATUSES.has(firmwareStatus)),
      firmwareDownloadUrl: String(item.firmwareDownloadUrl || item.firmwareUrl || item.updateUrl || "").trim()
    };
  }

  function normalizeCyberwareCatalogItem(source = {}, index = 0) {
    if (!source || typeof source !== "object") return null;
    const marker = String(source.catalogDomain || source.subtype || source.processorRole || source.type || source.role || "").trim().toUpperCase();
    if (marker.includes("NEUROCHIP") || marker === "CORE_PROCESSOR" || source.isCoreProcessor === true) {
      return withCyberwareCatalogDomain(normalizeNeurochipCatalogItem(source, index), "NEUROCHIP");
    }
    if (marker.includes("INTERFACE") || marker.includes("BODY_BUS") || marker === "INTERFACE_BACKPLANE" || source.isCoreInterface === true) {
      return withCyberwareCatalogDomain(normalizeInterfaceCatalogItem(source, index), "INTERFACE");
    }
    if (marker.includes("SERVICE_PORT") || marker.includes("SERVICE ACCESS") || source.isServicePort === true) {
      return withCyberwareCatalogDomain(normalizeServicePortCatalogItem(source, index), "SERVICE_PORT");
    }
    if (marker === "CYBERWARE_MODULE" || String(source.itemType || "").trim().toUpperCase() === "CYBERWARE_MODULE") {
      return {
        ...source,
        id: String(source.id || source.catalogId || `cyberware-module-${index + 1}`).trim(),
        catalogId: String(source.catalogId || source.id || `cyberware-module-${index + 1}`).trim(),
        catalogDomain: "CYBERWARE_MODULE",
        subtype: "CYBERWARE_MODULE",
        category: "CYBERWARE",
        itemType: "CYBERWARE_MODULE",
        scale: String(source.scale || "SMALL").trim().toUpperCase(),
        grade: String(source.grade || "LICENSED").trim().toUpperCase(),
        tags: uniqueValues(["CYBERWARE", "CYBERWARE_MODULE", ...(source.tags || [])]),
        sourceType: "CYBERWARE_UPGRADE_CATALOG",
        status: "CATALOG"
      };
    }
    if (BODY_CYBERWARE_CATALOG_DOMAINS.has(marker) || String(source.sourceType || "").trim().toUpperCase() === "BODY_CYBERWARE_CATALOG") {
      const domain = BODY_CYBERWARE_CATALOG_DOMAINS.has(marker) ? marker : String(source.subtype || source.catalogDomain || "IMPLANT").trim().toUpperCase();
      return withCyberwareCatalogDomain(normalizeBodyCyberwareCatalogItem(source, index), domain || "IMPLANT");
    }
    const base = normalizeCyberwareEntry({
      ...source,
      category: String(source.category || "CYBERWARE").trim().toUpperCase(),
      status: source.status || "CATALOG"
    }, index);
    return base ? withCyberwareCatalogDomain(base, String(source.subtype || "IMPLANT").trim().toUpperCase() || "IMPLANT") : null;
  }

  function getCyberwareCatalog() {
    const source = [
      ...getNeurochipCatalog().map((item) => withCyberwareCatalogDomain(item, "NEUROCHIP")),
      ...getInterfaceCatalog().map((item) => withCyberwareCatalogDomain(item, "INTERFACE")),
      ...getServicePortCatalog().map((item) => withCyberwareCatalogDomain(item, "SERVICE_PORT")),
      ...getBodyCyberwareCatalog().map((item) => withCyberwareCatalogDomain(item, item.subtype || item.catalogDomain || "IMPLANT")),
      ...((window.APP_DATA?.cyberwareUpgradeSystem?.moduleDefinitions || []).map((item) => normalizeCyberwareCatalogItem(item)).filter(Boolean))
    ].filter(Boolean);
    const seen = new Set();
    return source.filter((item) => {
      const key = String(item.catalogId || item.id || item.implantId || "").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getCyberwareCatalogItem(id = "") {
    const key = String(id || "").trim();
    if (!key) return null;
    return getCyberwareCatalog().find((item) => item.id === key || item.catalogId === key || item.implantId === key || item.model === key || item.name === key) || null;
  }

  function searchCyberwareCatalog(filters = {}) {
    const query = normalizeToken(filters.q || filters.query || filters.search || filters.text || "");
    const category = String(filters.category || "").trim().toUpperCase();
    const subtype = String(filters.subtype || filters.catalogDomain || filters.domain || "").trim().toUpperCase();
    const manufacturerId = String(filters.manufacturerId || "").trim();
    const manufacturer = normalizeToken(filters.manufacturer || filters.provider || "");
    const grade = filters.grade ? normalizeCyberwareGradeKey(filters.grade) : "";
    const legality = String(filters.legality || "").trim().toUpperCase();
    const availability = String(filters.availability || "").trim().toUpperCase();
    const tag = normalizeToken(filters.tag || "");
    const minTier = filters.minTier !== undefined ? normalizeCyberwareTier(filters.minTier) : null;
    const maxTier = filters.maxTier !== undefined ? normalizeCyberwareTier(filters.maxTier) : null;
    return getCyberwareCatalog().filter((item) => {
      if (query) {
        const haystack = normalizeToken([
          item.id,
          item.catalogId,
          item.name,
          item.model,
          item.manufacturer,
          item.provider,
          item.catalogDomain,
          item.subtype,
          item.role,
          item.summary,
          item.mainFeature,
          item.description,
          ...(item.specialFeatures || []),
          ...(item.tags || [])
        ].join(" "));
        if (!haystack.includes(query)) return false;
      }
      if (category && item.category !== category && item.subtype !== category && item.catalogDomain !== category && item.bodyCategory !== category) return false;
      if (subtype && item.subtype !== subtype && item.catalogDomain !== subtype && item.bodyCategory !== subtype) return false;
      if (manufacturerId && item.manufacturerId !== manufacturerId) return false;
      if (manufacturer && normalizeToken(item.manufacturer || item.provider || "") !== manufacturer) return false;
      if (grade && item.grade !== grade && item.qualityCeiling !== grade && item.maxCyberwareGrade !== grade) return false;
      if (legality && item.legality !== legality) return false;
      if (availability && item.availability !== availability) return false;
      if (tag && !(item.tags || []).some((itemTag) => normalizeToken(itemTag) === tag)) return false;
      if (minTier !== null && normalizeCyberwareTier(item.tier ?? item.neurochipTier ?? item.interfaceTier ?? item.servicePortTier ?? 0) < minTier) return false;
      if (maxTier !== null && normalizeCyberwareTier(item.tier ?? item.neurochipTier ?? item.interfaceTier ?? item.servicePortTier ?? 0) > maxTier) return false;
      return true;
    });
  }

  function createCyberwareInstallCandidateFromCatalogItem(itemOrId = {}, options = {}) {
    const catalogItem = typeof itemOrId === "string" ? getCyberwareCatalogItem(itemOrId) : normalizeCyberwareCatalogItem(itemOrId, options.index || 0);
    if (!catalogItem) return null;
    const subtype = String(catalogItem.catalogDomain || catalogItem.subtype || "").trim().toUpperCase();
    if (subtype === "CYBERWARE_MODULE") return null;
    if (subtype === "NEUROCHIP") return createNeurochipInstallCandidateFromCatalogItem(catalogItem, options);
    if (subtype === "INTERFACE") return createInterfaceInstallCandidateFromCatalogItem(catalogItem, options);
    if (subtype === "SERVICE_PORT") return createServicePortInstallCandidateFromCatalogItem(catalogItem, options);
    const instanceId = String(options.id || options.instanceId || `installed-${catalogItem.id}`).trim();
    return normalizeCyberwareEntry({
      ...catalogItem,
      id: instanceId,
      implantId: catalogItem.id,
      catalogId: catalogItem.catalogId || catalogItem.id,
      sourceCatalogId: catalogItem.catalogId || catalogItem.id,
      sourceType: catalogItem.sourceType || "CYBERWARE_CATALOG",
      status: options.status || "PENDING_INSTALL",
      licenseRequired: catalogItem.licenseRequired,
      licenseActivationRequired: catalogItem.licenseActivationRequired,
      licenseCodeRequired: catalogItem.licenseCodeRequired,
      licenseStatus: options.licenseStatus || catalogItem.defaultLicenseStatus || catalogItem.licenseStatus,
      subscriptionRequired: catalogItem.subscriptionRequired,
      subscriptionCategory: catalogItem.subscriptionCategory,
      subscriptionTierRequired: catalogItem.subscriptionTierRequired,
      subscriptionAvailableAfterPurchase: catalogItem.subscriptionAvailableAfterPurchase,
      requiresSubscriptionCategory: catalogItem.requiresSubscriptionCategory || catalogItem.subscriptionCategory,
      requiresSubscriptionTier: catalogItem.requiresSubscriptionTier || catalogItem.subscriptionTierRequired,
      firmwareRequired: catalogItem.firmwareRequired,
      firmwareChannel: catalogItem.firmwareChannel,
      firmwareVersion: catalogItem.firmwareVersion,
      firmwareLatestVersion: catalogItem.firmwareLatestVersion,
      firmwareStatus: options.firmwareStatus || catalogItem.firmwareStatus,
      firmwareUpdateRequired: catalogItem.firmwareUpdateRequired,
      firmwareDownloadUrl: catalogItem.firmwareDownloadUrl,
      condition: options.condition ?? 100,
      lastImplantCheck: null,
      installLog: []
    }, options.index || 0);
  }

  function buildCyberwareEquipmentCatalogItem(itemOrId = {}, options = {}) {
    const catalogItem = typeof itemOrId === "string" ? getCyberwareCatalogItem(itemOrId) : normalizeCyberwareCatalogItem(itemOrId, options.index || 0);
    if (!catalogItem) return null;
    const subtype = String(catalogItem.catalogDomain || catalogItem.subtype || "IMPLANT").trim().toUpperCase();
    const suffix = subtype === "NEUROCHIP"
      ? "Neurochip Kit"
      : subtype === "INTERFACE"
        ? "Interface Kit"
        : subtype === "SERVICE_PORT"
          ? "Service Port Kit"
        : subtype === "CYBERWARE_MODULE"
          ? "Module Kit"
          : "Implant Kit";
    const itemName = String(catalogItem.name || catalogItem.model || catalogItem.id || "Cyberware").trim();
    const kitName = itemName.toUpperCase().endsWith(" KIT") ? itemName : `${itemName} ${suffix}`;
    const footprint = String(options.footprint || catalogItem.equipmentFootprint || catalogItem.footprint || "1x1").trim() || "1x1";
    const sourceType = String(catalogItem.sourceType || `${subtype}_CATALOG`).trim().toUpperCase();
    return {
      id: `eqcat-${catalogItem.id}`,
      catalogId: `eqcat-${catalogItem.id}`,
      name: kitName,
      category: "CYBERWARE",
      subtype,
      footprint,
      status: "OWNED",
      operatingStatus: "PACKAGED",
      legality: catalogItem.legality || "LICENSED",
      condition: 100,
      value: catalogItem.value || catalogItem.basePrice || 0,
      marketPrice: catalogItem.marketPrice || catalogItem.price || catalogItem.basePrice || catalogItem.value || 0,
      cyberwareCandidate: subtype !== "CYBERWARE_MODULE",
      itemType: subtype === "CYBERWARE_MODULE" ? "CYBERWARE_MODULE" : (catalogItem.itemType || "CYBERWARE"),
      moduleProfile: catalogItem.moduleProfile ? { ...catalogItem.moduleProfile } : null,
      implantId: catalogItem.id,
      sourceCatalogId: catalogItem.catalogId || catalogItem.id,
      sourceType,
      manufacturer: catalogItem.manufacturer,
      provider: catalogItem.provider || catalogItem.manufacturer,
      grade: catalogItem.grade,
      scale: catalogItem.scale || "SMALL",
      size: catalogItem.size || catalogItem.scale || "SMALL",
      primarySlot: catalogItem.primarySlot || catalogItem.slot,
      slot: catalogItem.slot || catalogItem.primarySlot,
      slots: [...(catalogItem.slots || [])],
      compatibleSlots: [...(catalogItem.compatibleSlots || [])],
      slotLevel: catalogItem.slotLevel || "",
      slotCost: catalogItem.slotCost || catalogItem.slotsUsed || 1,
      customizationSlots: catalogItem.customizationSlots || catalogItem.customSlots || 0,
      descendantPolicy: catalogItem.descendantPolicy,
      exposedSlots: Array.isArray(catalogItem.exposedSlots) ? [...catalogItem.exposedSlots] : [],
      lockedDescendants: Array.isArray(catalogItem.lockedDescendants) ? [...catalogItem.lockedDescendants] : [],
      acceptedChildGroups: Array.isArray(catalogItem.acceptedChildGroups) ? [...catalogItem.acceptedChildGroups] : [],
      acceptedManufacturers: Array.isArray(catalogItem.acceptedManufacturers) ? [...catalogItem.acceptedManufacturers] : [],
      acceptedStandards: Array.isArray(catalogItem.acceptedStandards) ? [...catalogItem.acceptedStandards] : [],
      neuroLoad: catalogItem.neuroLoad || 0,
      interfaceLoad: catalogItem.interfaceLoad || 0,
      requiredBuses: [...(catalogItem.requiredBuses || [])],
      supportedBuses: [...(catalogItem.supportedBuses || [])],
      requiresNeurochipTier: catalogItem.requiresNeurochipTier || 0,
      requiresInterfaceTier: catalogItem.requiresInterfaceTier || 0,
      processorRole: catalogItem.processorRole || (subtype === "NEUROCHIP" ? "NEUROCHIP" : subtype === "INTERFACE" ? "INTERFACE_BACKPLANE" : subtype === "SERVICE_PORT" ? "SERVICE_PORT" : ""),
      isCoreProcessor: catalogItem.isCoreProcessor === true,
      isCoreInterface: catalogItem.isCoreInterface === true,
      isServicePort: catalogItem.isServicePort === true || subtype === "SERVICE_PORT",
      neurochipTier: catalogItem.neurochipTier || 0,
      interfaceTier: catalogItem.interfaceTier || 0,
      servicePortTier: catalogItem.servicePortTier || 0,
      maxCyberwareGrade: catalogItem.maxCyberwareGrade || catalogItem.qualityCeiling || "",
      maxScale: catalogItem.maxScale || catalogItem.maxImplantSize || "",
      interfaceCapacity: catalogItem.interfaceCapacity || 0,
      interfaceLanes: catalogItem.interfaceLanes || 0,
      neurochipSocketRating: catalogItem.neurochipSocketRating || 0,
      bodyBusRating: catalogItem.bodyBusRating || 0,
      signalIntegrity: catalogItem.signalIntegrity || 0,
      powerRouting: catalogItem.powerRouting || 0,
      thermalRouting: catalogItem.thermalRouting || 0,
      securityIsolation: catalogItem.securityIsolation || catalogItem.security || 0,
      serviceAccess: catalogItem.serviceAccess || 0,
      diagnosticDepth: catalogItem.diagnosticDepth || 0,
      firmwareAccess: catalogItem.firmwareAccess || 0,
      licenseRequired: catalogItem.licenseRequired === true,
      licenseActivationRequired: catalogItem.licenseActivationRequired === true,
      licenseCodeRequired: catalogItem.licenseCodeRequired === true,
      licenseStatus: catalogItem.defaultLicenseStatus || (catalogItem.licenseActivationRequired ? "UNACTIVATED" : "NOT_REQUIRED"),
      subscriptionRequired: catalogItem.subscriptionRequired === true,
      subscriptionCategory: catalogItem.subscriptionCategory || "",
      subscriptionTierRequired: catalogItem.subscriptionTierRequired || 0,
      subscriptionAvailableAfterPurchase: catalogItem.subscriptionAvailableAfterPurchase !== false,
      requiresSubscriptionCategory: catalogItem.requiresSubscriptionCategory || catalogItem.subscriptionCategory || "",
      requiresSubscriptionTier: catalogItem.requiresSubscriptionTier || catalogItem.subscriptionTierRequired || 0,
      firmwareRequired: catalogItem.firmwareRequired === true,
      firmwareChannel: catalogItem.firmwareChannel || "",
      firmwareVersion: catalogItem.firmwareVersion || "",
      firmwareLatestVersion: catalogItem.firmwareLatestVersion || catalogItem.firmwareVersion || "",
      firmwareStatus: catalogItem.firmwareStatus || "CURRENT",
      firmwareUpdateRequired: catalogItem.firmwareUpdateRequired === true,
      firmwareDownloadUrl: catalogItem.firmwareDownloadUrl || "",
      calibrationQuality: catalogItem.calibrationQuality || 0,
      securityLock: catalogItem.securityLock || 0,
      emergencyAccess: catalogItem.emergencyAccess || 0,
      traceability: catalogItem.traceability || 0,
      physicalResilience: catalogItem.physicalResilience || 0,
      compatibilityGroup: catalogItem.compatibilityGroup || catalogItem.manufacturerId || "",
      compatibleWith: [...(catalogItem.compatibleWith || [])],
      vendorLocked: catalogItem.vendorLocked === true,
      compatibilityTags: [...(catalogItem.compatibilityTags || [])],
      specialFeatures: [...(catalogItem.specialFeatures || [])],
      visualLocation: catalogItem.visualLocation || "",
      availability: catalogItem.availability || "CONTROLLED",
      tags: uniqueValues(["CYBERWARE", subtype, "IMPLANT", "PACKAGED", catalogItem.grade, catalogItem.availability, ...(catalogItem.tags || [])]),
      notes: `Packaged ${subtype.toLowerCase().replace(/_/g, " ")} cyberware kit from ${catalogItem.manufacturer || catalogItem.provider || "catalog"}. Equipment source for Cyberware install planner.`
    };
  }

  function getCyberwareEquipmentCatalogItems() {
    return getCyberwareCatalog().map((item, index) => buildCyberwareEquipmentCatalogItem(item, { index })).filter(Boolean);
  }


  function getCyberwareEditorOptions(includeName = "") {
    const fallback = [
      { name: "BasicSight Left", slots: ["leftEye"], scale: "SMALL", provider: "LOCAL RECORD", status: "INSTALLED" },
      { name: "BasicSight Right", slots: ["rightEye"], scale: "SMALL", provider: "LOCAL RECORD", status: "INSTALLED" },
      { name: "Service Port", slots: ["neckService"], scale: "SMALL", provider: "LOCAL RECORD", status: "INSTALLED", processorRole: "SERVICE_PORT", isServicePort: true },
      { name: "Procedural Neurochip", slots: ["neural"], scale: "SMALL", provider: "LOCAL RECORD", status: "INSTALLED" },
      { name: "Biometric Sensor", slots: ["internal"], scale: "SMALL", provider: "LOCAL RECORD", status: "INSTALLED" },
      { name: "Port rdzeniowy", slots: ["neckService"], scale: "SMALL", provider: "LOCAL RECORD", status: "INSTALLED", processorRole: "SERVICE_PORT", isServicePort: true },
      { name: "Ocular Suite", slots: ["leftEye", "rightEye", "neural"], scale: "MEDIUM", provider: "LOCAL RECORD", status: "INSTALLED", customizationSlots: 1 },
      { name: "Cyber Index Finger L", slots: ["leftIndexFinger"], scale: "SMALL", provider: "LOCAL RECORD", status: "INSTALLED" },
      { name: "Cyber Hand L", slots: getHandFootprint("left"), scale: "MEDIUM", provider: "LOCAL RECORD", status: "INSTALLED", customizationSlots: 1 },
      { name: "Cyber Arm R", slots: getArmFootprint("right"), scale: "LARGE", provider: "LOCAL RECORD", status: "INSTALLED", customizationSlots: 2 },
      { name: "Twin Arm Integrated Set", slots: [...getArmFootprint("left"), ...getArmFootprint("right"), "spineCore"], scale: "FULL_SET", provider: "LOCAL RECORD", status: "INSTALLED", customizationSlots: 3, vendorLocked: true }
    ];
    const extra = includeName ? [{ name: includeName, slots: inferCyberwareSlots(includeName), scale: inferCyberwareScale({ name: includeName }, inferCyberwareSlots(includeName)), provider: "LOCAL RECORD", status: "INSTALLED" }] : [];
    const seen = new Set();
    return [...fallback, ...extra]
      .map((item, index) => normalizeCyberwareEntry(item, index))
      .filter(Boolean)
      .filter((item) => {
        const key = item.name.toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  Object.assign(runtime, {
    normalizeNeurochipCatalogManufacturer,
    getRawNeurochipCatalog,
    getNeurochipCatalogManufacturers,
    normalizeNeurochipCatalogItem,
    getNeurochipCatalog,
    getNeurochipCatalogItem,
    searchNeurochipCatalog,
    createNeurochipInstallCandidateFromCatalogItem,
    normalizeInterfaceCatalogManufacturer,
    getRawInterfaceCatalog,
    getInterfaceCatalogManufacturers,
    normalizeInterfaceCatalogItem,
    getInterfaceCatalog,
    getInterfaceCatalogItem,
    searchInterfaceCatalog,
    createInterfaceInstallCandidateFromCatalogItem,
    normalizeServicePortCatalogManufacturer,
    getRawServicePortCatalog,
    getServicePortCatalogManufacturers,
    normalizeServicePortCatalogItem,
    getServicePortCatalog,
    getServicePortCatalogItem,
    searchServicePortCatalog,
    createServicePortInstallCandidateFromCatalogItem,
    buildServicePortEquipmentCatalogItem,
    getServicePortEquipmentCatalogItems,
    getRawBodyCyberwareCatalog,
    normalizeBodyCyberwareCatalogItem,
    getBodyCyberwareCatalog,
    getBodyCyberwareCatalogItem,
    searchBodyCyberwareCatalog,
    withCyberwareCatalogDomain,
    normalizeCyberwareCatalogItem,
    getCyberwareCatalog,
    getCyberwareCatalogItem,
    searchCyberwareCatalog,
    createCyberwareInstallCandidateFromCatalogItem,
    buildCyberwareEquipmentCatalogItem,
    getCyberwareEquipmentCatalogItems,
    getCyberwareEditorOptions,
  });
})();
