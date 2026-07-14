window.WS_APP = window.WS_APP || {};

(function initHousingMarketRuntimeFactory() {
  window.WS_APP.createHousingMarketRuntime = function createHousingMarketRuntime(config = {}) {
    const {
      DEFAULT_STORAGE_UNIT_ID,
      HOUSING_MARKET_DEFAULT_SHIPPING_DAYS,
      HOUSING_MARKET_DELIVERABLE_SHIPMENT_STATUSES,
      HOUSING_MARKET_DEPARTMENTS,
      HOUSING_MARKET_MODES,
      HOUSING_MARKET_ORDER_CLOSED_STATUSES,
      HOUSING_MARKET_ORDER_VIEWS,
      HOUSING_MARKET_PAGE_SIZE,
      HOUSING_MARKET_PRODUCT_VISUAL_FALLBACKS,
      HOUSING_MARKET_SORTS,
      HOUSING_MARKET_STATUSES,
      HOUSING_MARKET_VENDOR_DEFAULTS,
      HOUSING_SHIPMENT_ACTIVE_STATUSES,
      addDaysIso,
      clampNumber,
      compareIsoDates,
      escapeHtml,
      formatCredits,
      formatIsoLabel,
      getCampaignDateIso,
      getCitizenEquipmentItems,
      getCitizenHousingRecords,
      getCitizenMarketOrders,
      getCitizenShipments,
      getEquipmentFootprintSize,
      getHousingActiveStorageTarget,
      getHousingShipmentState,
      getHousingShipmentUnitContext,
      isIsoDate,
      normalizeMarketOrder,
      normalizeShipment,
      parseCredits,
      renderHousingFeedback,
      renderHousingMetric,
      renderHousingModule,
      renderHousingShipmentRow,
      setHousingActiveTab,
      setHousingFeedback,
    } = config;

    if (typeof escapeHtml !== "function" || typeof renderHousingModule !== "function" || typeof setHousingActiveTab !== "function") {
      throw new Error("HOUSING_MARKET_RUNTIME_DEPENDENCY_MISSING");
    }

  function makeHousingMarketId(prefix = "order", existing = new Set()) {
      const base = String(prefix || "market").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "market";
      let id = `${base}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      let guard = 0;
      while (existing.has(id) && guard < 25) {
        id = `${base}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        guard += 1;
      }
      return id;
    }

  function parseVisibleAddress(address = "") {
      const clean = String(address || "").trim();
      const [main = "", local = ""] = clean.split("::");
      const mainParts = main.split(".").map((part) => part.trim()).filter(Boolean);
      const localParts = local.split(".").map((part) => part.trim()).filter(Boolean);
      const controlCode = mainParts[3] || "";
      return {
        raw: clean,
        cityCode: mainParts[0] || "",
        geoAddress: mainParts[1] || "",
        networkId: mainParts[2] || "",
        controlCode,
        zoneCode: controlCode ? controlCode.slice(0, 1) : "",
        chunk: localParts[0] || "",
        building: localParts[1] || "",
        cell: localParts[2] || ""
      };
    }

  function getHousingOrganizationLocationSource(locationId = "") {
      if (!locationId || typeof window.WS_APP.resolveOrganizationLocationSource !== "function") return null;
      return window.WS_APP.resolveOrganizationLocationSource(locationId);
    }

  function resolveHousingMarketVendor(catalogItem = {}) {
      const category = String(catalogItem.category || "DEFAULT").trim().toUpperCase();
      const fallback = HOUSING_MARKET_VENDOR_DEFAULTS[category] || HOUSING_MARKET_VENDOR_DEFAULTS.DEFAULT;
      const organizationLocationId = String(catalogItem.organizationLocationId || catalogItem.sourceLocationId || catalogItem.facilityId || fallback.organizationLocationId || "").trim();
      const locationSource = getHousingOrganizationLocationSource(organizationLocationId);
  
      return {
        vendorId: String(catalogItem.vendorProviderId || catalogItem.providerId || catalogItem.vendorId || locationSource?.marketVendorId || fallback.vendorId || "provider-habitat-ledger").trim(),
        vendorName: String(catalogItem.vendorName || catalogItem.provider || catalogItem.manufacturer || locationSource?.locationName || "Habitat Market Fulfillment").trim(),
        organizationId: String(catalogItem.organizationId || locationSource?.organizationId || "").trim(),
        organizationLocationId,
        sourceInstitutionId: String(catalogItem.sourceInstitutionId || catalogItem.institutionId || locationSource?.sourceInstitutionId || organizationLocationId || "inst-habitat-market-local").trim(),
        sourceAddress: String(catalogItem.sourceAddress || catalogItem.vendorAddress || catalogItem.institutionAddress || locationSource?.sourceAddress || "").trim()
      };
    }

  function resolveHousingShippingRoute(sourceAddress = "", destinationAddress = "", item = {}) {
      const source = parseVisibleAddress(sourceAddress);
      const destination = parseVisibleAddress(destinationAddress);
      const legality = String(item.legality || "").trim().toUpperCase();
      const category = String(item.category || "").trim().toUpperCase();
      let days = HOUSING_MARKET_DEFAULT_SHIPPING_DAYS;
      let routeClass = "STANDARD_LOCAL";
  
      if (source.cityCode && destination.cityCode && source.cityCode !== destination.cityCode) {
        days = 3;
        routeClass = "INTER_AGGLOMERATION";
      } else if (source.zoneCode && destination.zoneCode && source.zoneCode !== destination.zoneCode) {
        days = 2;
        routeClass = "SAME_AGGLOMERATION_DIFFERENT_ZONE";
      } else if (source.chunk && destination.chunk && source.chunk === destination.chunk) {
        days = 1;
        routeClass = "SAME_CHUNK";
      } else if (source.cityCode && destination.cityCode && source.cityCode === destination.cityCode) {
        days = 1;
        routeClass = "SAME_AGGLOMERATION_STANDARD";
      }
  
      if (["RESTRICTED", "CORPORATE", "LICENSED"].includes(legality) || ["WEAPON", "ARMOR", "CONTAINER"].includes(category)) {
        days += 1;
        routeClass = `${routeClass}_CONTROLLED`;
      }
  
      return {
        days: clampNumber(days, 1, 30),
        routeClass,
        source,
        destination
      };
    }

  function createMarketOrderAndShipment(citizen = {}, catalogItem = {}, record = {}, unit = {}, price = 0) {
      const currentIso = getCampaignDateIso();
      const orders = getCitizenMarketOrders(citizen);
      const shipments = getCitizenShipments(citizen);
      const existingIds = new Set([...orders.map((order) => order.id), ...shipments.map((shipment) => shipment.id)]);
      const vendor = resolveHousingMarketVendor(catalogItem);
      const destinationAddress = String(record.visibleAddress || citizen.address || citizen.visibleAddress || "").trim();
      const destinationUnitTitle = String(record.title || "Housing Unit").trim();
      const targetUnitLabel = String(unit.label || unit.profileLabel || "Housing Storage").trim();
      const route = resolveHousingShippingRoute(vendor.sourceAddress, destinationAddress, catalogItem);
      const etaIso = addDaysIso(currentIso, route.days);
      const orderId = makeHousingMarketId(`order-${citizen.id || "citizen"}`, existingIds);
      existingIds.add(orderId);
      const shipmentId = makeHousingMarketId(`ship-${citizen.id || "citizen"}`, existingIds);
  
      const order = normalizeMarketOrder({
        id: orderId,
        citizenId: citizen.id,
        type: "ITEM_PURCHASE",
        catalogId: catalogItem.catalogId || catalogItem.id,
        itemName: catalogItem.name,
        quantity: 1,
        vendorId: vendor.vendorId,
        vendorProviderId: vendor.vendorId,
        vendorName: vendor.vendorName,
        organizationLocationId: vendor.organizationLocationId,
        price,
        currency: "CREDITS",
        status: "IN_TRANSIT",
        placedAtIso: currentIso,
        etaIso,
        shipmentId,
        targetHousingId: record.id,
        targetUnitId: unit.id,
        targetUnitTitle: destinationUnitTitle,
        targetUnitLabel,
        destinationAddress
      }, orders.length);
  
      const shipment = normalizeShipment({
        id: shipmentId,
        orderId,
        sourceInstitutionId: vendor.sourceInstitutionId,
        organizationLocationId: vendor.organizationLocationId,
        sourceLabel: vendor.vendorName,
        sourceAddress: vendor.sourceAddress,
        destinationHousingId: record.id,
        destinationAddress,
        destinationUnitTitle,
        targetUnitId: unit.id,
        targetUnitLabel,
        deliveryType: "STANDARD",
        status: "IN_TRANSIT",
        placedAtIso: currentIso,
        etaIso,
        routeClass: route.routeClass,
        payload: {
          type: "EQUIPMENT_ITEM",
          catalogId: catalogItem.catalogId || catalogItem.id,
          itemName: catalogItem.name,
          quantity: 1
        }
      }, shipments.length);
  
      return { order, shipment, vendor, route, etaIso };
    }

  function normalizeHousingMarketMode(mode = "CATALOG") {
      const normalized = String(mode || "CATALOG").trim().toUpperCase();
      if (["ITEMS", "CYBERWARE", "CATALOG"].includes(normalized)) return "CATALOG";
      return HOUSING_MARKET_MODES.includes(normalized) ? normalized : "CATALOG";
    }

  function getHousingMarketMode(citizenId = "") {
      window.WS_APP.housingMarketModeByCitizen = window.WS_APP.housingMarketModeByCitizen || {};
      return normalizeHousingMarketMode(window.WS_APP.housingMarketModeByCitizen[citizenId] || "CATALOG");
    }

  function setHousingMarketMode(citizenId = "", mode = "CATALOG") {
      window.WS_APP.housingMarketModeByCitizen = window.WS_APP.housingMarketModeByCitizen || {};
      window.WS_APP.housingMarketModeByCitizen[citizenId] = normalizeHousingMarketMode(mode);
    }

  function normalizeHousingMarketOrderView(view = "ACTIVE") {
      const normalized = String(view || "ACTIVE").trim().toUpperCase();
      return HOUSING_MARKET_ORDER_VIEWS.includes(normalized) ? normalized : "ACTIVE";
    }

  function getHousingMarketOrderView(citizenId = "") {
      window.WS_APP.housingMarketOrderViewByCitizen = window.WS_APP.housingMarketOrderViewByCitizen || {};
      return normalizeHousingMarketOrderView(window.WS_APP.housingMarketOrderViewByCitizen[citizenId] || "ACTIVE");
    }

  function setHousingMarketOrderView(citizenId = "", view = "ACTIVE") {
      window.WS_APP.housingMarketOrderViewByCitizen = window.WS_APP.housingMarketOrderViewByCitizen || {};
      window.WS_APP.housingMarketOrderViewByCitizen[citizenId] = normalizeHousingMarketOrderView(view);
    }

  function syncHousingMarketModeToOrder(citizenId = "", order = null, fallbackView = "ACTIVE") {
      const view = order
        ? (isCanonicalHousingMarketOrderActive(order) ? "ACTIVE" : "HISTORY")
        : normalizeHousingMarketOrderView(fallbackView);
      setHousingMarketOrderView(citizenId, view);
      setHousingMarketMode(citizenId, view === "ACTIVE" ? "ORDERS" : "DELIVERED");
    }

  function getHousingSelectedMarketOrderId(citizenId = "") {
      window.WS_APP.housingSelectedMarketOrderByCitizen = window.WS_APP.housingSelectedMarketOrderByCitizen || {};
      return String(window.WS_APP.housingSelectedMarketOrderByCitizen[citizenId] || "").trim();
    }

  function setHousingSelectedMarketOrderId(citizenId = "", marketOrderId = "") {
      window.WS_APP.housingSelectedMarketOrderByCitizen = window.WS_APP.housingSelectedMarketOrderByCitizen || {};
      window.WS_APP.housingSelectedMarketOrderByCitizen[citizenId] = String(marketOrderId || "").trim();
    }

  function getHousingMarketSelectedProductId(citizenId = "") {
      window.WS_APP.housingMarketSelectedProductByCitizen = window.WS_APP.housingMarketSelectedProductByCitizen || {};
      return String(window.WS_APP.housingMarketSelectedProductByCitizen[citizenId] || "").trim();
    }

  function setHousingMarketSelectedProductId(citizenId = "", catalogId = "") {
      window.WS_APP.housingMarketSelectedProductByCitizen = window.WS_APP.housingMarketSelectedProductByCitizen || {};
      window.WS_APP.housingMarketSelectedProductByCitizen[citizenId] = String(catalogId || "").trim();
    }

  function getDefaultHousingMarketFilters(citizenId = "") {
      const legacyCategory = String(window.WS_APP.housingMarketCategoryByCitizen?.[citizenId] || "ALL").trim().toUpperCase() || "ALL";
      return {
        search: "",
        type: "ALL",
        category: legacyCategory,
        subtype: "ALL",
        manufacturer: "ALL",
        legality: "ALL",
        tier: "ALL",
        status: "ALL",
        sort: "CATEGORY",
        page: 1
      };
    }

  function normalizeHousingMarketFilters(filters = {}, citizenId = "") {
      const defaults = getDefaultHousingMarketFilters(citizenId);
      const source = filters && typeof filters === "object" && !Array.isArray(filters) ? filters : {};
      const normalized = {
        search: String(source.search ?? defaults.search).trim(),
        type: String(source.type || defaults.type).trim().toUpperCase() || "ALL",
        category: String(source.category || defaults.category).trim().toUpperCase() || "ALL",
        subtype: String(source.subtype || defaults.subtype).trim().toUpperCase() || "ALL",
        manufacturer: String(source.manufacturer || defaults.manufacturer).trim() || "ALL",
        legality: String(source.legality || defaults.legality).trim().toUpperCase() || "ALL",
        tier: String(source.tier || defaults.tier).trim().toUpperCase() || "ALL",
        status: String(source.status || defaults.status).trim().toUpperCase() || "ALL",
        sort: String(source.sort || defaults.sort).trim().toUpperCase() || "CATEGORY",
        page: clampNumber(source.page ?? defaults.page, 1, 9999)
      };
  
      if (!HOUSING_MARKET_DEPARTMENTS.includes(normalized.type)) normalized.type = "ALL";
      if (normalized.type === "ALL") normalized.category = "ALL";
      if (!HOUSING_MARKET_STATUSES.includes(normalized.status)) normalized.status = "ALL";
      if (!HOUSING_MARKET_SORTS.includes(normalized.sort)) normalized.sort = "CATEGORY";
      if (!normalized.manufacturer) normalized.manufacturer = "ALL";
      return normalized;
    }

  function getHousingMarketFilters(citizenId = "") {
      window.WS_APP.housingMarketFiltersByCitizen = window.WS_APP.housingMarketFiltersByCitizen || {};
      const filters = normalizeHousingMarketFilters(window.WS_APP.housingMarketFiltersByCitizen[citizenId], citizenId);
      window.WS_APP.housingMarketFiltersByCitizen[citizenId] = filters;
      return filters;
    }

  function setHousingMarketFilters(citizenId = "", patch = {}) {
      window.WS_APP.housingMarketFiltersByCitizen = window.WS_APP.housingMarketFiltersByCitizen || {};
      const current = getHousingMarketFilters(citizenId);
      window.WS_APP.housingMarketFiltersByCitizen[citizenId] = normalizeHousingMarketFilters({ ...current, ...(patch || {}) }, citizenId);
    }

  function resetHousingMarketFilters(citizenId = "") {
      window.WS_APP.housingMarketFiltersByCitizen = window.WS_APP.housingMarketFiltersByCitizen || {};
      window.WS_APP.housingMarketFiltersByCitizen[citizenId] = getDefaultHousingMarketFilters(citizenId);
    }

  function normalizeEquipmentCatalogFallback(definition = {}, index = 0) {
      const source = definition && typeof definition === "object" && !Array.isArray(definition) ? definition : {};
      const size = getEquipmentFootprintSize(source);
      return {
        ...source,
        id: String(source.id || source.catalogId || `eqcat-${index + 1}`).trim(),
        catalogId: String(source.catalogId || source.id || `eqcat-${index + 1}`).trim(),
        marketOfferId: String(source.marketOfferId || "").trim(),
        marketOfferRevision: clampNumber(source.marketOfferRevision ?? source.revision ?? 0, 0, 999999),
        vendorProviderId: String(source.vendorProviderId || source.providerId || "").trim(),
        marketAvailability: String(source.marketAvailability || source.availability || "AVAILABLE").trim().toUpperCase(),
        stock: source.stock && typeof source.stock === "object" && !Array.isArray(source.stock) ? { ...source.stock } : { mode: "UNLIMITED", availableQuantity: null, reservedQuantity: 0 },
        fulfillmentOptions: Array.isArray(source.fulfillmentOptions) ? [...source.fulfillmentOptions] : ["DELIVER_TO_HOUSING"],
        purchaseRequirements: source.purchaseRequirements && typeof source.purchaseRequirements === "object" && !Array.isArray(source.purchaseRequirements) ? { ...source.purchaseRequirements } : {},
        linkedServiceDefinitionIds: Array.isArray(source.linkedServiceDefinitionIds) ? [...source.linkedServiceDefinitionIds] : [],
        linkedServiceProviderIds: Array.isArray(source.linkedServiceProviderIds) ? [...source.linkedServiceProviderIds] : [],
        name: String(source.name || source.title || "Equipment Catalog Item").trim(),
        category: String(source.category || "MISC").trim().toUpperCase(),
        subtype: String(source.subtype || source.itemType || "").trim().toUpperCase(),
        footprint: size.footprint,
        width: size.width,
        height: size.height,
        equipProfile: source.equipProfile && typeof source.equipProfile === "object" && !Array.isArray(source.equipProfile) ? { ...source.equipProfile } : null,
        status: String(source.status || "OWNED").trim().toUpperCase(),
        operatingStatus: String(source.operatingStatus || "ACTIVE").trim().toUpperCase(),
        legality: String(source.legality || "UNREGISTERED").trim().toUpperCase(),
        condition: clampNumber(source.condition ?? 100, 0, 100),
        value: parseCredits(source.value || 0),
        capacityTier: clampNumber(source.capacityTier ?? source.tier ?? 0, 0, 99),
        capacitySlots: clampNumber(source.capacitySlots ?? source.storageSlots ?? 0, 0, 999),
        requiresSubscriptionCategory: String(source.requiresSubscriptionCategory || source.subscriptionCategory || "").trim().toUpperCase(),
        requiresSubscriptionTier: clampNumber(source.requiresSubscriptionTier ?? source.subscriptionTier ?? 0, 0, 99),
        restrictions: source.restrictions && typeof source.restrictions === "object" && !Array.isArray(source.restrictions) ? { ...source.restrictions } : {},
        tags: Array.isArray(source.tags) ? source.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
        notes: String(source.notes || source.note || "").trim(),
        gmNote: String(source.gmNote || "").trim(),
        manufacturerId: String(source.manufacturerId || "").trim(),
        manufacturer: String(source.manufacturer || "").trim(),
        provider: String(source.provider || source.manufacturer || "").trim(),
        vendorId: String(source.vendorId || source.providerId || "").trim(),
        vendorName: String(source.vendorName || source.provider || source.manufacturer || "").trim(),
        sourceInstitutionId: String(source.sourceInstitutionId || source.institutionId || "").trim(),
        organizationLocationId: String(source.organizationLocationId || source.sourceLocationId || source.facilityId || "").trim(),
        sourceAddress: String(source.sourceAddress || source.vendorAddress || source.institutionAddress || "").trim(),
        marketPrice: parseCredits(source.marketPrice ?? source.price ?? source.value ?? 0),
        tier: clampNumber(source.tier ?? source.neurochipTier ?? source.interfaceTier ?? source.servicePortTier ?? 0, 0, 99),
        grade: String(source.grade || source.quality || "").trim().toUpperCase(),
        scale: String(source.scale || source.implantScale || source.size || "").trim().toUpperCase(),
        processorRole: String(source.processorRole || source.role || "").trim().toUpperCase(),
        cyberwareCandidate: source.cyberwareCandidate === true || source.isCyberware === true,
        isCoreProcessor: source.isCoreProcessor === true,
        isCoreInterface: source.isCoreInterface === true,
        isServicePort: source.isServicePort === true,
        specialFeatures: Array.isArray(source.specialFeatures) ? source.specialFeatures.map((feature) => String(feature).trim()).filter(Boolean) : [],
        archived: source.archived === true
      };
    }

  function getHousingMarketCatalogItems() {
      const source = typeof window.WS_APP.getMarketCatalogItems === "function"
        ? window.WS_APP.getMarketCatalogItems()
        : typeof window.WS_APP.getEquipmentCatalogItems === "function"
          ? window.WS_APP.getEquipmentCatalogItems()
          : Array.isArray(window.APP_DATA?.equipmentCatalog)
            ? window.APP_DATA.equipmentCatalog.map(normalizeEquipmentCatalogFallback)
            : [];
  
      return source
        .filter(Boolean)
        .map(normalizeEquipmentCatalogFallback)
        .filter((item) => item.id && item.archived !== true);
    }

  function getHousingMarketPrice(item = {}) {
      return parseCredits(item.marketPrice ?? item.price ?? item.value ?? 0);
    }

  function getHousingMarketCatalogItemById(catalogId = "") {
      const id = String(catalogId || "").trim();
      if (!id) return null;
      const offer = window.WS_APP.getMarketOffer?.(id)
        || window.WS_APP.getMarketOfferByCatalogItemId?.(id)
        || null;
      const projected = offer ? window.WS_APP.projectMarketOfferCatalogItem?.(offer) : null;
      if (projected) return normalizeEquipmentCatalogFallback(projected);
      const catalogItem = window.WS_APP.getEquipmentCatalogItemById?.(id) || null;
      return catalogItem ? normalizeEquipmentCatalogFallback(catalogItem) : null;
    }

  function getHousingMarketItemTokens(item = {}) {
      return new Set([
        item.marketDepartment,
        item.department,
        item.marketSubcategory,
        item.catalogDomain,
        item.category,
        item.subtype,
        item.itemType,
        ...(Array.isArray(item.tags) ? item.tags : [])
      ].map((value) => String(value || "").trim().toUpperCase()).filter(Boolean));
    }

  function hasHousingMarketItemToken(tokens = new Set(), values = []) {
      return values.some((value) => tokens.has(value));
    }

  function getHousingMarketDepartment(item = {}) {
      const explicit = String(item.marketDepartment || item.department || "").trim().toUpperCase();
      if (HOUSING_MARKET_DEPARTMENTS.includes(explicit) && explicit !== "ALL") return explicit;
      if (isHousingMarketCyberwareItem(item)) return "CYBERWARE";
  
      const tokens = getHousingMarketItemTokens(item);
      if (hasHousingMarketItemToken(tokens, ["MEDICAL", "MEDICINE", "PHARMA", "PHARMACEUTICAL", "DRUG", "STIMULANT", "SUPPRESSANT", "TRAUMA_CARE", "FIRST_AID"])) return "MEDICAL";
      if (hasHousingMarketItemToken(tokens, ["FOOD", "MEAL", "RATIONS", "RATION", "DRINK", "BEVERAGE", "NUTRITION", "EDIBLE"])) return "FOOD";
      if (hasHousingMarketItemToken(tokens, ["HOUSEHOLD", "HYGIENE", "CLEANING", "DOMESTIC", "HABITAT_SUPPLY", "HOME_GOODS"])) return "HOUSEHOLD";
      return "EQUIPMENT";
    }

  function getHousingMarketSubcategory(item = {}) {
      const explicit = String(item.marketSubcategory || item.storeCategory || "").trim().toUpperCase();
      if (explicit) return explicit;
      const department = getHousingMarketDepartment(item);
      const tokens = getHousingMarketItemTokens(item);
      const subtype = String(item.subtype || item.itemType || "").trim().toUpperCase();
      const category = String(item.category || "").trim().toUpperCase();
  
      if (department === "CYBERWARE") return getHousingMarketCyberwareKind(item);
      if (department === "MEDICAL") {
        if (hasHousingMarketItemToken(tokens, ["STIMULANT"])) return "STIMULANTS";
        if (hasHousingMarketItemToken(tokens, ["SUPPRESSANT"])) return "SUPPRESSANTS";
        if (hasHousingMarketItemToken(tokens, ["TRAUMA_CARE", "FIRST_AID"])) return "TRAUMA_CARE";
        if (subtype.includes("KIT") || tokens.has("MEDICAL_KIT")) return "MEDICAL_KITS";
        if (hasHousingMarketItemToken(tokens, ["MEDICINE", "PHARMA", "PHARMACEUTICAL", "DRUG"])) return "MEDICINE";
        return subtype || "MEDICAL_SUPPLIES";
      }
      if (department === "FOOD") {
        if (hasHousingMarketItemToken(tokens, ["DRINK", "BEVERAGE"])) return "DRINKS";
        if (hasHousingMarketItemToken(tokens, ["RATION", "RATIONS"])) return "RATIONS";
        if (hasHousingMarketItemToken(tokens, ["MEAL"])) return "MEALS";
        if (hasHousingMarketItemToken(tokens, ["NUTRITION", "SUPPLEMENT"])) return "SUPPLEMENTS";
        return subtype || "FOOD";
      }
      if (department === "HOUSEHOLD") {
        if (tokens.has("HYGIENE")) return "HYGIENE";
        if (tokens.has("CLEANING")) return "CLEANING";
        if (hasHousingMarketItemToken(tokens, ["UTILITY", "HABITAT_SUPPLY"])) return "UTILITY_SUPPLIES";
        return subtype || "HOUSEHOLD_GOODS";
      }
      return category || subtype || "MISC";
    }

  function getHousingMarketItemType(item = {}) {
      return getHousingMarketDepartment(item);
    }

  function getHousingMarketItemKind(item = {}) {
      return getHousingMarketSubcategory(item);
    }

  function getHousingMarketCyberwareKind(item = {}) {
      const category = String(item.category || "").trim().toUpperCase();
      const subtype = String(item.subtype || item.catalogDomain || item.processorRole || item.type || "").trim().toUpperCase();
      const tags = Array.isArray(item.tags) ? item.tags.map((tag) => String(tag || "").trim().toUpperCase()) : [];
      if (subtype === "NEUROCHIP" || item.isCoreProcessor === true || tags.includes("NEUROCHIP")) return "NEUROCHIP";
      if (subtype === "INTERFACE" || item.isCoreInterface === true || tags.includes("INTERFACE")) return "INTERFACE";
      if (subtype === "SERVICE_PORT" || item.isServicePort === true || tags.includes("SERVICE_PORT")) return "SERVICE_PORT";
      if (subtype === "BIOWARE" || tags.includes("BIOWARE")) return "BIOWARE";
      if (subtype.includes("KIT") || tags.includes("KIT") || tags.includes("PACKAGED")) return "KIT";
      if (subtype === "IMPLANT" || category === "CYBERWARE" || tags.includes("IMPLANT")) return "IMPLANT";
      return subtype || "CYBERWARE";
    }

  function getHousingMarketManufacturer(item = {}) {
      return String(item.manufacturer || item.provider || item.vendorName || "UNSPECIFIED").trim() || "UNSPECIFIED";
    }

  function getHousingMarketItemTier(item = {}) {
      return clampNumber(item.tier ?? item.neurochipTier ?? item.interfaceTier ?? item.servicePortTier ?? item.capacityTier ?? 0, 0, 99);
    }

  function getHousingMarketItemStatus(item = {}, citizen = {}, unit = null) {
      const price = getHousingMarketPrice(item);
      const credits = parseCredits(citizen.credits);
      const requirement = hasRequiredSubscription(citizen, item);
      const noStorage = !unit;
      const insufficientCredits = price > credits;
      const legality = String(item.legality || "").trim().toUpperCase();
      const controlled = ["RESTRICTED", "CORPORATE", "LICENSED", "SERVICE_ISSUED", "CONTROLLED"].includes(legality);
  
      if (noStorage) return { code: "NO_STORAGE", label: "NO STORAGE", disabled: true, controlled };
      if (!requirement.ok) return { code: "REQUIRES_SUBSCRIPTION", label: `REQ ${requirement.label}`, disabled: true, controlled };
      if (insufficientCredits) return { code: "TOO_EXPENSIVE", label: "NO CREDITS", disabled: true, controlled };
      return { code: controlled ? "CONTROLLED" : "BUYABLE", label: controlled ? "CONTROLLED" : "READY", disabled: false, controlled };
    }

  function getHousingMarketFilterOptions(items = []) {
      const departments = HOUSING_MARKET_DEPARTMENTS.map((department) => ({
        id: department,
        count: department === "ALL" ? items.length : items.filter((item) => getHousingMarketDepartment(item) === department).length
      }));
      const subcategoriesByDepartment = Object.fromEntries(HOUSING_MARKET_DEPARTMENTS
        .filter((department) => department !== "ALL")
        .map((department) => {
          const departmentItems = items.filter((item) => getHousingMarketDepartment(item) === department);
          const subcategories = Array.from(new Set(departmentItems.map(getHousingMarketSubcategory).filter(Boolean)))
            .sort((a, b) => a.localeCompare(b))
            .map((subcategory) => ({
              id: subcategory,
              count: departmentItems.filter((item) => getHousingMarketSubcategory(item) === subcategory).length
            }));
          return [department, subcategories];
        }));
      return { departments, subcategoriesByDepartment };
    }

  function getHousingMarketSearchText(item = {}) {
      return [
        item.name,
        item.category,
        item.subtype,
        item.legality,
        item.grade,
        item.scale,
        getHousingMarketManufacturer(item),
        item.notes,
        ...(Array.isArray(item.tags) ? item.tags : []),
        ...(Array.isArray(item.specialFeatures) ? item.specialFeatures : [])
      ].map((part) => String(part || "").toUpperCase()).join(" ");
    }

  function filterHousingMarketItems(items = [], filters = {}, citizen = {}, unit = null, mode = "CATALOG") {
      const normalized = normalizeHousingMarketFilters(filters, citizen.id);
      const search = normalized.search.toUpperCase();
      return items.filter((item) => {
        const department = getHousingMarketDepartment(item);
        if (normalized.type !== "ALL" && department !== normalized.type) return false;
        if (normalized.category !== "ALL" && getHousingMarketSubcategory(item) !== normalized.category) return false;
        if (search && !getHousingMarketSearchText(item).includes(search)) return false;
        return true;
      });
    }

  function sortHousingMarketItems(items = [], filters = {}, activeRecord = null, unit = null, mode = "ITEMS") {
      const normalizedMode = normalizeHousingMarketMode(mode);
      const sort = normalizeHousingMarketFilters(filters).sort;
      const destinationAddress = String(activeRecord?.visibleAddress || "").trim();
      const etaDays = (item) => unit ? resolveHousingShippingRoute(resolveHousingMarketVendor(item).sourceAddress, destinationAddress, item).days : 999;
      const compareName = (a, b) => String(a.name || "").localeCompare(String(b.name || ""));
      const compareKind = (a, b) => getHousingMarketItemKind(a).localeCompare(getHousingMarketItemKind(b)) || getHousingMarketItemTier(a) - getHousingMarketItemTier(b) || compareName(a, b);
      const compareCategory = (a, b) => getHousingMarketDepartment(a).localeCompare(getHousingMarketDepartment(b)) || getHousingMarketSubcategory(a).localeCompare(getHousingMarketSubcategory(b)) || getHousingMarketItemTier(a) - getHousingMarketItemTier(b) || compareName(a, b);
      const fallbackCompare = normalizedMode === "CYBERWARE" ? compareKind : compareCategory;
  
      return [...items].sort((a, b) => {
        if (sort === "NAME") return compareName(a, b);
        if (sort === "PRICE_ASC") return getHousingMarketPrice(a) - getHousingMarketPrice(b) || compareName(a, b);
        if (sort === "PRICE_DESC") return getHousingMarketPrice(b) - getHousingMarketPrice(a) || compareName(a, b);
        if (sort === "TIER_ASC") return getHousingMarketItemTier(a) - getHousingMarketItemTier(b) || fallbackCompare(a, b);
        if (sort === "TIER_DESC") return getHousingMarketItemTier(b) - getHousingMarketItemTier(a) || fallbackCompare(a, b);
        if (sort === "ETA_ASC") return etaDays(a) - etaDays(b) || fallbackCompare(a, b);
        if (sort === "ETA_DESC") return etaDays(b) - etaDays(a) || fallbackCompare(a, b);
        if (sort === "MANUFACTURER") return getHousingMarketManufacturer(a).localeCompare(getHousingMarketManufacturer(b)) || fallbackCompare(a, b);
        return fallbackCompare(a, b);
      });
    }

  function getSubscriptionTierLevel(subscription = {}) {
      if (typeof window.WS_APP.getSubscriptionTierLevel === "function") {
        return window.WS_APP.getSubscriptionTierLevel(subscription);
      }
      const direct = Number(subscription.supportsCapacityTier ?? subscription.capacityTier ?? subscription.tierLevel ?? subscription.tier ?? subscription.level);
      if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
      const match = String(subscription.tierId || subscription.tierLabel || subscription.title || subscription.name || "").match(/(?:TIER|T)\s*([0-9]+)/i);
      return match ? clampNumber(match[1], 0, 99) : 0;
    }

  function hasRequiredSubscription(citizen = {}, item = {}) {
      const requiredCategory = String(item.requiresSubscriptionCategory || "").trim().toUpperCase();
      const requiredTier = clampNumber(item.requiresSubscriptionTier || 0, 0, 99);
      if (!requiredCategory) return { ok: true, label: "" };
  
      const subscriptions = typeof window.WS_APP.getCitizenEntitledSubscriptions === "function"
        ? window.WS_APP.getCitizenEntitledSubscriptions(citizen)
        : (Array.isArray(citizen.subscriptions) ? citizen.subscriptions : []).filter((subscription) => {
          const status = String(subscription?.status || "PENDING").trim().toUpperCase();
          return subscription?.archived !== true && subscription?.active !== false && ["PAID", "OVERDUE"].includes(status);
        });
      const match = subscriptions.find((subscription) => {
        const category = String(subscription.category || subscription.catalogCategory || "").trim().toUpperCase();
        return category === requiredCategory && getSubscriptionTierLevel(subscription) >= requiredTier;
      });
  
      return {
        ok: Boolean(match),
        label: `${requiredCategory}${requiredTier ? ` T${requiredTier}` : ""}`
      };
    }

  function isHousingMarketCyberwareItem(item = {}) {
      const category = String(item.category || "").trim().toUpperCase();
      const subtype = String(item.subtype || "").trim().toUpperCase();
      const tags = Array.isArray(item.tags) ? item.tags.map((tag) => String(tag || "").trim().toUpperCase()) : [];
      return item.cyberwareCandidate === true || category === "CYBERWARE" || ["IMPLANT", "BIOWARE", "NEUROCHIP", "INTERFACE", "SERVICE_PORT"].includes(subtype) || tags.includes("CYBERWARE");
    }

  function stripHousingEquipmentDerivedFields(item = {}) {
      const next = { ...item };
      [
        "isStored", "isInGrid", "isEquipped", "isOrphan", "isLocated", "isCarried", "isPacked",
        "rawLocation", "slots", "locationState", "effectiveFootprint", "placementSource"
      ].forEach((key) => delete next[key]);
      return next;
    }

  function buildHousingMarketItemFromCatalog(catalogItem = {}, citizen = {}, overrides = {}) {
      const marketOverrides = {
        ...overrides,
        operatingStatus: isHousingMarketCyberwareItem(catalogItem) ? "PACKAGED" : overrides.operatingStatus
      };
      if (typeof window.WS_APP.buildEquipmentItemFromCatalog === "function") {
        return stripHousingEquipmentDerivedFields(window.WS_APP.buildEquipmentItemFromCatalog(catalogItem.id || catalogItem.catalogId, citizen, marketOverrides));
      }
  
      const prefix = String(citizen.id || "citizen").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "citizen";
      const base = String(catalogItem.id || catalogItem.name || "catalog-item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "catalog-item";
      const existing = new Set(getCitizenEquipmentItems(citizen).map((item) => item.id));
      let id = `${prefix}-${base}`;
      let counter = 2;
      while (existing.has(id)) {
        id = `${prefix}-${base}-${counter}`;
        counter += 1;
      }
  
      return {
        id,
        itemId: catalogItem.catalogId || catalogItem.id,
        catalogId: catalogItem.catalogId || catalogItem.id,
        name: catalogItem.name,
        category: catalogItem.category,
        subtype: catalogItem.subtype,
        footprint: catalogItem.footprint,
        width: catalogItem.width,
        height: catalogItem.height,
        equipProfile: catalogItem.equipProfile && typeof catalogItem.equipProfile === "object" ? { ...catalogItem.equipProfile } : null,
        quantity: 1,
        status: catalogItem.status,
        operatingStatus: catalogItem.operatingStatus,
        legality: catalogItem.legality,
        condition: catalogItem.condition,
        value: catalogItem.value,
        capacityTier: catalogItem.capacityTier,
        capacitySlots: catalogItem.capacitySlots,
        requiresSubscriptionCategory: catalogItem.requiresSubscriptionCategory,
        requiresSubscriptionTier: catalogItem.requiresSubscriptionTier,
        restrictions: { ...(catalogItem.restrictions || {}) },
        tags: [...(catalogItem.tags || [])],
        notes: catalogItem.notes,
        gmNote: catalogItem.gmNote,
        archived: catalogItem.archived === true,
        ...marketOverrides
      };
    }

  function purchaseHousingMarketItem(citizenId = "", catalogId = "", unitId = DEFAULT_STORAGE_UNIT_ID, user = window.WS_APP.currentUser) {
      const latest = window.WS_APP.getCitizenById?.(citizenId);
      if (!latest) {
        setHousingFeedback(citizenId, "Citizen housing record not found.", "ERROR");
        renderHousingModule(user);
        return;
      }
  
      const records = getCitizenHousingRecords(latest);
      const record = records.find((entry) => entry.storageUnits.some((unit) => unit.id === unitId)) || records[0];
      const unit = record?.storageUnits.find((entry) => entry.id === unitId) || record?.storageUnits[0];
      const catalogItem = getHousingMarketCatalogItemById(catalogId);
  
      if (!record || !unit) {
        setHousingFeedback(citizenId, "Market order requires active housing storage.", "ERROR");
        renderHousingModule(user);
        return;
      }
  
      if (!catalogItem) {
        setHousingFeedback(citizenId, "Market catalog item not found.", "ERROR");
        renderHousingModule(user);
        return;
      }
  
      const requirement = hasRequiredSubscription(latest, catalogItem);
      if (!requirement.ok) {
        setHousingFeedback(citizenId, `Order blocked: requires ${requirement.label}.`, "ERROR");
        renderHousingModule(user);
        return;
      }
  
      const price = getHousingMarketPrice(catalogItem);
      const creditsBefore = parseCredits(latest.credits);
      if (price > creditsBefore) {
        setHousingFeedback(citizenId, `Insufficient credits: missing ${formatCredits(price - creditsBefore)}.`, "ERROR");
        renderHousingModule(user);
        return;
      }
  
      const draft = buildHousingMarketItemFromCatalog(catalogItem, latest, {
        location: "ORPHAN",
        storageUnitId: "",
        housingPlacement: null,
        equippedLocation: null,
        status: "OWNED",
        operatingStatus: "ACTIVE"
      });
  
      if (!draft) {
        setHousingFeedback(citizenId, "Market item build failed.", "ERROR");
        renderHousingModule(user);
        return;
      }
  
      const currentItems = getCitizenEquipmentItems(latest);
      const candidateItems = [...currentItems, draft];
      const candidateState = typeof window.WS_APP.getEquipmentState === "function"
        ? window.WS_APP.getEquipmentState(latest, { items: candidateItems })
        : null;
      const placement = candidateState && typeof window.WS_APP.findFirstEquipmentHousingPlacement === "function"
        ? window.WS_APP.findFirstEquipmentHousingPlacement(candidateState, draft.id, unit.id, { citizen: latest, state: candidateState, unit })
        : null;
      if (!placement) {
        setHousingFeedback(citizenId, "Order blocked: housing grid has no contiguous placement for this item.", "ERROR");
        renderHousingModule(user);
        return;
      }
  
      const { order, shipment, route } = createMarketOrderAndShipment(latest, catalogItem, record, unit, price);
      const billingKey = `housing-legacy-market:${order.id}`;
      const billingResult = window.WS_APP.createAndCaptureBillingIntent?.({
        citizenId,
        sourceDomain: "HOUSING",
        sourceRefId: order.id,
        amount: price,
        currency: "CREDIT",
        descriptionCode: "HOUSING_MARKET_ORDER",
        paymentSource: "CREDITS",
        idempotencyKey: billingKey,
        correlationId: shipment.id,
        providerId: order.vendorId || "",
        organizationId: order.vendorId || "",
        metadata: {
          catalogId: catalogItem.id || catalogItem.catalogId || "",
          shipmentId: shipment.id,
          routeClass: route.routeClass,
          legacyHousingCatalogFlow: true
        }
      }, {
        idempotencyKey: `${billingKey}:capture`,
        note: `Housing market order: ${catalogItem.name}. Shipment ${shipment.id}; ETA ${formatIsoLabel(shipment.etaIso)}; route ${route.routeClass}.`,
        createdBy: user?.login || "SYSTEM",
        notify: false
      });
  
      if (!billingResult?.ok || !billingResult.billingTransaction) {
        setHousingFeedback(citizenId, `Market payment failed: ${billingResult?.error?.code || "BILLING_UNAVAILABLE"}.`, "ERROR");
        renderHousingModule(user);
        return;
      }
  
      const updated = window.WS_APP.updateCitizen?.(citizenId, {
        marketOrders: [...getCitizenMarketOrders(latest), order],
        shipments: [...getCitizenShipments(latest), shipment]
      }, {
        source: "HOUSING_LEGACY_MARKET",
        skipModuleRefresh: true,
        skipProfileRefresh: true
      });
  
      if (!updated) {
        window.WS_APP.refundBillingTransaction?.(billingResult.billingTransaction.billingTransactionId, {
          amount: price,
          reason: "Housing market order persistence failed after payment capture.",
          idempotencyKey: `${billingKey}:rollback`,
          createdBy: "HOUSING",
          notify: false
        });
        setHousingFeedback(citizenId, "Market order save failed. Payment was compensated through Billing.", "ERROR");
        renderHousingModule(user);
        return;
      }
  
      setHousingFeedback(
        citizenId,
        `Ordered ${catalogItem.name} for ${formatCredits(price)}. Shipment ETA ${formatIsoLabel(shipment.etaIso)} (${route.days}d).`,
        "OK"
      );
      renderHousingModule(user);
    }

  function ensureUniqueEquipmentItemId(item = {}, existingItems = []) {
      const existingIds = new Set(existingItems.map((entry) => String(entry.id || "").trim()).filter(Boolean));
      let id = String(item.id || item.itemId || "equipment-item").trim() || "equipment-item";
      if (!existingIds.has(id)) return item;
      const base = id.replace(/-[0-9]+$/, "") || "equipment-item";
      let counter = 2;
      while (existingIds.has(`${base}-${counter}`)) counter += 1;
      return { ...item, id: `${base}-${counter}` };
    }

  function resolveDeliveredShipmentItem(shipment = {}, citizen = {}) {
      const catalogId = String(shipment.payload?.catalogId || "").trim();
      const catalogItem = getHousingMarketCatalogItemById(catalogId);
      if (!catalogItem) return null;
      return buildHousingMarketItemFromCatalog(catalogItem, citizen, {
        location: "ORPHAN",
        storageUnitId: "",
        housingPlacement: null,
        equippedLocation: null,
        status: "OWNED",
        operatingStatus: "ACTIVE",
        marketOrderId: shipment.orderId,
        shipmentId: shipment.id,
        destinationHousingId: shipment.destinationHousingId || shipment.targetHousingId || "",
        destinationAddress: shipment.destinationAddress || "",
        storageUnitTitle: shipment.destinationUnitTitle || "",
        shipmentDeliveryResult: shipment.deliveryResult || "",
        deliveredAtIso: getCampaignDateIso()
      });
    }

  function deliverHousingMarketShipment(citizen = {}, shipment = {}, items = []) {
      const context = getHousingShipmentUnitContext(citizen, shipment, {});
      const record = context.record;
      const unit = context.unit;
      if (!record || !unit) {
        return { ok: false, reason: "NO_STORAGE_TARGET", context };
      }
  
      const rawDraft = resolveDeliveredShipmentItem({
        ...shipment,
        destinationHousingId: record.id,
        destinationAddress: context.destinationAddress,
        destinationUnitTitle: context.unitTitle,
        targetUnitId: unit.id,
        targetUnitLabel: context.unitLabel
      }, citizen);
      if (!rawDraft) return { ok: false, reason: "CATALOG_ITEM_NOT_FOUND", context };
      const draft = stripHousingEquipmentDerivedFields(ensureUniqueEquipmentItemId(rawDraft, items));
      const candidateItems = [...items, draft];
      const candidateState = typeof window.WS_APP.getEquipmentState === "function"
        ? window.WS_APP.getEquipmentState(citizen, { items: candidateItems })
        : null;
      const placement = candidateState && typeof window.WS_APP.findFirstEquipmentHousingPlacement === "function"
        ? window.WS_APP.findFirstEquipmentHousingPlacement(candidateState, draft.id, unit.id, { citizen, state: candidateState, unit })
        : null;
      if (!placement) return { ok: false, reason: "STORAGE_FULL", context };
      const delivered = {
        ...draft,
        storageUnitId: unit.id,
        housingPlacement: {
          storageUnitId: unit.id,
          column: placement.column,
          row: placement.row,
          rotation: placement.rotation
        },
        location: "STORED",
        containerHostId: "",
        containerPlacement: null,
        equippedLocation: null,
        destinationHousingId: record.id,
        destinationAddress: context.destinationAddress,
        storageUnitTitle: context.unitTitle,
        storageUnitLabel: context.unitLabel,
        storageState: "STORED",
        shipmentDeliveryResult: "DELIVERED"
      };
  
      return {
        ok: true,
        overflow: false,
        reason: "DELIVERED",
        state: "DELIVERED",
        item: delivered,
        unit,
        record,
        context
      };
    }

  function processDueHousingMarketShipmentsForCitizen(citizenId = "", options = {}) {
      const citizen = window.WS_APP.getCitizenById?.(citizenId);
      if (!citizen) return { ok: false, delivered: 0, held: 0, reason: "CITIZEN_NOT_FOUND" };
      const nowIso = isIsoDate(options.nowIso) ? options.nowIso : getCampaignDateIso();
      const orders = getCitizenMarketOrders(citizen);
      const shipments = getCitizenShipments(citizen);
      const dueShipments = shipments.filter((shipment) => HOUSING_MARKET_DELIVERABLE_SHIPMENT_STATUSES.has(shipment.status) && compareIsoDates(shipment.etaIso, nowIso) <= 0);
      if (!dueShipments.length) return { ok: true, delivered: 0, held: 0, reason: "NO_DUE_SHIPMENTS" };
  
      let nextItems = getCitizenEquipmentItems(citizen);
      const nextOrders = orders.map((order) => ({ ...order }));
      const nextShipments = shipments.map((shipment) => ({ ...shipment }));
      let deliveredCount = 0;
      let overflowCount = 0;
      let heldCount = 0;
  
      dueShipments.forEach((shipment) => {
        const delivery = deliverHousingMarketShipment(citizen, shipment, nextItems);
        const shipmentIndex = nextShipments.findIndex((entry) => entry.id === shipment.id);
        const orderIndex = nextOrders.findIndex((entry) => entry.id === shipment.orderId);
        if (delivery.ok) {
          nextItems = [...nextItems, delivery.item];
          if (shipmentIndex >= 0) {
            nextShipments[shipmentIndex] = {
              ...nextShipments[shipmentIndex],
              status: "DELIVERED",
              deliveredAtIso: nowIso,
              holdReason: "",
              targetUnitId: delivery.unit.id,
              targetUnitLabel: delivery.context.unitLabel,
              destinationHousingId: delivery.record.id,
              destinationUnitTitle: delivery.context.unitTitle,
              destinationAddress: delivery.context.destinationAddress,
              deliveryResult: delivery.reason,
              deliveredItemId: delivery.item.id
            };
          }
          if (orderIndex >= 0) {
            nextOrders[orderIndex] = {
              ...nextOrders[orderIndex],
              status: "DELIVERED",
              deliveredAtIso: nowIso,
              targetHousingId: delivery.record.id,
              targetUnitId: delivery.unit.id,
              targetUnitTitle: delivery.context.unitTitle,
              targetUnitLabel: delivery.context.unitLabel,
              destinationAddress: delivery.context.destinationAddress,
              deliveryResult: delivery.reason,
              deliveredItemId: delivery.item.id
            };
          }
          deliveredCount += 1;
          if (delivery.overflow) overflowCount += 1;
        } else {
          if (shipmentIndex >= 0) {
            nextShipments[shipmentIndex] = {
              ...nextShipments[shipmentIndex],
              status: "HELD",
              heldAtIso: nowIso,
              holdReason: delivery.reason || "DELIVERY_FAILED",
              deliveryResult: delivery.reason || "DELIVERY_FAILED",
              destinationHousingId: delivery.context?.record?.id || nextShipments[shipmentIndex].destinationHousingId || "",
              destinationUnitTitle: delivery.context?.unitTitle || nextShipments[shipmentIndex].destinationUnitTitle || "",
              targetUnitId: delivery.context?.unit?.id || nextShipments[shipmentIndex].targetUnitId || DEFAULT_STORAGE_UNIT_ID,
              targetUnitLabel: delivery.context?.unitLabel || nextShipments[shipmentIndex].targetUnitLabel || "",
              destinationAddress: delivery.context?.destinationAddress || nextShipments[shipmentIndex].destinationAddress || ""
            };
          }
          if (orderIndex >= 0) {
            nextOrders[orderIndex] = {
              ...nextOrders[orderIndex],
              status: "HELD",
              holdReason: delivery.reason || "DELIVERY_FAILED",
              deliveryResult: delivery.reason || "DELIVERY_FAILED",
              targetHousingId: delivery.context?.record?.id || nextOrders[orderIndex].targetHousingId || "",
              targetUnitId: delivery.context?.unit?.id || nextOrders[orderIndex].targetUnitId || DEFAULT_STORAGE_UNIT_ID,
              targetUnitTitle: delivery.context?.unitTitle || nextOrders[orderIndex].targetUnitTitle || "",
              targetUnitLabel: delivery.context?.unitLabel || nextOrders[orderIndex].targetUnitLabel || "",
              destinationAddress: delivery.context?.destinationAddress || nextOrders[orderIndex].destinationAddress || ""
            };
          }
          heldCount += 1;
        }
      });
  
      const previousItems = getCitizenEquipmentItems(citizen);
      const itemResult = typeof window.WS_APP.replaceCitizenItemInstances === "function"
        ? window.WS_APP.replaceCitizenItemInstances(citizenId, nextItems, { scope: "EQUIPMENT", source: "HOUSING_SHIPMENT" })
        : { ok: false };
      if (!itemResult?.ok) {
        return { ok: false, delivered: 0, overflow: 0, held: heldCount, reason: "ITEM_STORE_SAVE_FAILED" };
      }
      const updated = window.WS_APP.updateCitizen?.(citizenId, {
        marketOrders: nextOrders,
        shipments: nextShipments
      }, { source: "HOUSING_SHIPMENT" });
      if (!updated) {
        window.WS_APP.replaceCitizenItemInstances?.(citizenId, previousItems, {
          scope: "EQUIPMENT",
          source: "HOUSING_SHIPMENT_ROLLBACK"
        });
        return { ok: false, delivered: 0, overflow: 0, held: heldCount, reason: "CITIZEN_SAVE_FAILED" };
      }
  
      return { ok: true, delivered: deliveredCount, overflow: overflowCount, held: heldCount, reason: "PROCESSED" };
    }

  function processDueHousingMarketShipments(options = {}) {
      const citizens = window.WS_APP.getCitizens?.() || [];
      return citizens
        .filter((citizen) => citizen && citizen.recordType !== "admin")
        .map((citizen) => ({ citizenId: citizen.id, ...processDueHousingMarketShipmentsForCitizen(citizen.id, options) }));
    }

  function retryHeldHousingShipment(citizenId = "", shipmentId = "", user = window.WS_APP.currentUser) {
      const latest = window.WS_APP.getCitizenById?.(citizenId);
      if (!latest) {
        setHousingFeedback(citizenId, "Citizen housing record not found.", "ERROR");
        renderHousingModule(user);
        return;
      }
      const shipments = getCitizenShipments(latest);
      const orders = getCitizenMarketOrders(latest);
      const shipment = shipments.find((entry) => entry.id === shipmentId);
      if (!shipment || shipment.status !== "HELD") {
        setHousingFeedback(citizenId, "Held shipment not found.", "ERROR");
        renderHousingModule(user);
        return;
      }
      const nextShipments = shipments.map((entry) => entry.id === shipmentId ? { ...entry, status: "IN_TRANSIT", holdReason: "", deliveryResult: "", heldAtIso: "", etaIso: getCampaignDateIso() } : entry);
      const nextOrders = orders.map((entry) => entry.shipmentId === shipmentId ? { ...entry, status: "IN_TRANSIT", holdReason: "", deliveryResult: "", etaIso: getCampaignDateIso() } : entry);
      const updated = window.WS_APP.updateCitizen?.(citizenId, { shipments: nextShipments, marketOrders: nextOrders }, { source: "HOUSING_SHIPMENT_RETRY" });
      if (updated) processDueHousingMarketShipmentsForCitizen(citizenId, { nowIso: getCampaignDateIso() });
      setHousingFeedback(citizenId, updated ? "Shipment retry queued for current campaign date." : "Shipment retry failed.", updated ? "OK" : "ERROR");
      renderHousingModule(user);
    }

  function getHousingMarketCartOpen(citizenId = "") {
      window.WS_APP.housingMarketCartOpenByCitizen = window.WS_APP.housingMarketCartOpenByCitizen || {};
      return window.WS_APP.housingMarketCartOpenByCitizen[citizenId] === true;
    }

  function setHousingMarketCartOpen(citizenId = "", open = false) {
      window.WS_APP.housingMarketCartOpenByCitizen = window.WS_APP.housingMarketCartOpenByCitizen || {};
      window.WS_APP.housingMarketCartOpenByCitizen[citizenId] = open === true;
    }

  const HOUSING_MARKET_DIALOG_FOCUSABLE_SELECTOR = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])'
    ].join(",");

  function getHousingMarketDialogFocusables(dialog = null) {
      return [...(dialog?.querySelectorAll?.(HOUSING_MARKET_DIALOG_FOCUSABLE_SELECTOR) || [])]
        .filter((node) => node?.getAttribute?.("aria-hidden") !== "true" && !node?.hasAttribute?.("inert"));
    }

  function focusHousingMarketDialog(dialog = null, preferredSelector = "") {
      if (!dialog) return false;
      const preferred = preferredSelector ? dialog.querySelector?.(preferredSelector) : null;
      const target = preferred || getHousingMarketDialogFocusables(dialog)[0] || dialog;
      window.requestAnimationFrame?.(() => target?.focus?.({ preventScroll: true }));
      return true;
    }

  function trapHousingMarketDialogFocus(event = null, dialog = null) {
      if (event?.key !== "Tab" || !dialog) return false;
      const focusables = getHousingMarketDialogFocusables(dialog);
      if (!focusables.length) {
        event.preventDefault();
        dialog.focus?.({ preventScroll: true });
        return true;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains?.(active))) {
        event.preventDefault();
        last.focus?.({ preventScroll: true });
        return true;
      }
      if (!event.shiftKey && (active === last || !dialog.contains?.(active))) {
        event.preventDefault();
        first.focus?.({ preventScroll: true });
        return true;
      }
      return false;
    }

  function isolateHousingMarketModal(root = null, activeLayer = null) {
      const workspace = root?.querySelector?.(".housing-market-tab");
      [...(workspace?.children || [])].forEach((node) => {
        if (node === activeLayer) {
          node.removeAttribute?.("inert");
          node.removeAttribute?.("data-housing-market-modal-inert");
          return;
        }
        if (activeLayer) {
          node.setAttribute?.("inert", "");
          node.setAttribute?.("data-housing-market-modal-inert", "true");
        } else if (node.getAttribute?.("data-housing-market-modal-inert") === "true") {
          node.removeAttribute?.("inert");
          node.removeAttribute?.("data-housing-market-modal-inert");
        }
      });
      document.body?.classList?.toggle?.("housing-market-modal-open", Boolean(activeLayer));
    }

  function syncHousingMarketModalState(root = null, citizenId = "", options = {}) {
      const inspectorLayer = root?.querySelector?.("[data-housing-market-product-inspector-layer]");
      const cartLayer = root?.querySelector?.("[data-housing-market-cart-layer]");
      const inspectorOpen = Boolean(inspectorLayer?.classList?.contains("is-open"));
      const cartOpen = Boolean(getHousingMarketCartOpen(citizenId) && cartLayer);
      if (cartLayer) {
        cartLayer.classList.toggle("is-open", cartOpen);
        cartLayer.setAttribute("aria-hidden", cartOpen ? "false" : "true");
      }
      const activeLayer = inspectorOpen ? inspectorLayer : (cartOpen ? cartLayer : null);
      isolateHousingMarketModal(root, activeLayer);
      if (activeLayer && options.focus !== false) {
        const dialog = activeLayer.querySelector?.('[role="dialog"]');
        if (dialog && !dialog.contains?.(document.activeElement)) {
          focusHousingMarketDialog(dialog, "[data-housing-market-product-inspector-close], [data-housing-market-cart-close]");
        }
      }
      return Boolean(activeLayer);
    }

  function closeHousingMarketCart(root = null, citizenId = "", options = {}) {
      const layer = root?.querySelector?.("[data-housing-market-cart-layer]");
      setHousingMarketCartOpen(citizenId, false);
      layer?.classList?.remove("is-open");
      layer?.setAttribute?.("aria-hidden", "true");
      syncHousingMarketModalState(root, citizenId, { focus: false });
      if (options.restoreFocus !== false) {
        const trigger = root?.querySelector?.("[data-housing-market-cart-open]");
        window.requestAnimationFrame?.(() => trigger?.focus?.({ preventScroll: true }));
      }
      return true;
    }

  function resetHousingMarketTransientUi(root = null, citizenId = "") {
      setHousingMarketCartOpen(citizenId, false);
      setHousingMarketSelectedProductId(citizenId, "");
      const cartLayer = root?.querySelector?.("[data-housing-market-cart-layer]");
      const inspectorLayer = root?.querySelector?.("[data-housing-market-product-inspector-layer]");
      [cartLayer, inspectorLayer].forEach((layer) => {
        layer?.classList?.remove("is-open");
        layer?.setAttribute?.("aria-hidden", "true");
      });
      isolateHousingMarketModal(root, null);
    }

  function getHousingMarketDraftCart(citizenId = "") {
      const carts = window.WS_APP.getCitizenMarketCarts?.(citizenId) || [];
      return carts.find((cart) => String(cart.status || "").toUpperCase() === "DRAFT") || null;
    }

  function getHousingMarketCartContext(citizenId = "") {
      const cart = getHousingMarketDraftCart(citizenId);
      const quote = cart ? window.WS_APP.quoteMarketCart?.(cart.cartId) || null : null;
      const lines = Array.isArray(cart?.lines) ? cart.lines : [];
      const lineCount = lines.length;
      const itemCount = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
      return {
        cart,
        quote,
        lineCount,
        itemCount,
        total: Number(quote?.totals?.finalTotal || 0),
        currency: quote?.totals?.currency || "CREDIT"
      };
    }

  function getHousingMarketAvailability(item = {}) {
      const availability = String(item.marketAvailability || "AVAILABLE").trim().toUpperCase();
      const stock = item.stock && typeof item.stock === "object" ? item.stock : {};
      const availableQuantity = stock.mode === "FINITE"
        ? Math.max(0, Number(stock.availableQuantity || 0) - Number(stock.reservedQuantity || 0))
        : null;
      if (stock.mode === "FINITE" && availableQuantity <= 0) return { code: "OUT_OF_STOCK", label: "OUT OF STOCK", disabled: true, stockLabel: "0 AVAILABLE" };
      if (["OUT_OF_STOCK", "UNAVAILABLE", "BLOCKED"].includes(availability)) {
        return { code: availability, label: availability.replace(/_/g, " "), disabled: true, stockLabel: stock.mode === "FINITE" ? `${availableQuantity} AVAILABLE` : "NETWORK STOCK" };
      }
      return {
        code: availability,
        label: availability.replace(/_/g, " "),
        disabled: !["AVAILABLE", "LIMITED", "RESTRICTED"].includes(availability),
        stockLabel: stock.mode === "FINITE" ? `${availableQuantity} AVAILABLE` : "NETWORK STOCK"
      };
    }

  function addHousingMarketOfferToCart(citizen = {}, marketOfferId = "", unit = null, quantity = 1) {
      const offerId = String(marketOfferId || "").trim();
      if (!offerId) return { ok: false, reason: "MARKET_OFFER_ID_REQUIRED" };
      if (!unit?.id) return { ok: false, reason: "HOUSING_DESTINATION_REQUIRED" };
      const existing = getHousingMarketDraftCart(citizen.id);
      if ((existing?.lines || []).some((line) => String(line.fulfillmentMode || "DELIVER_TO_HOUSING").toUpperCase() !== "DELIVER_TO_HOUSING")) {
        return { ok: false, reason: "MIXED_FULFILLMENT_CART_NOT_SUPPORTED" };
      }
      const cart = existing || window.WS_APP.createMarketCart?.(citizen.id)?.cart || null;
      if (!cart) return { ok: false, reason: "MARKET_CART_CREATE_FAILED" };
      const result = window.WS_APP.updateMarketCart?.(cart.cartId, {
        addLine: {
          marketOfferId: offerId,
          quantity: clampNumber(quantity, 1, 99),
          fulfillmentMode: "DELIVER_TO_HOUSING",
          destinationRef: { housingStorageId: unit.id }
        }
      }) || { ok: false, reason: "MARKET_CART_API_UNAVAILABLE" };
      if (result.ok) setHousingMarketCartOpen(citizen.id, true);
      return result;
    }

  function addHousingMarketOfferForPickupToCart(citizen = {}, marketOfferId = "", quantity = 1) {
      const offerId = String(marketOfferId || "").trim();
      if (!offerId) return { ok: false, reason: "MARKET_OFFER_ID_REQUIRED" };
      const offer = window.WS_APP.getMarketOffer?.(offerId) || null;
      if (!offer) return { ok: false, reason: "MARKET_OFFER_NOT_FOUND" };
      if (!Array.isArray(offer.fulfillmentOptions) || !offer.fulfillmentOptions.includes("PICKUP")) {
        return { ok: false, reason: "PICKUP_NOT_AVAILABLE" };
      }
      if (!offer.organizationLocationId) return { ok: false, reason: "PICKUP_LOCATION_REQUIRED" };
      const existing = getHousingMarketDraftCart(citizen.id);
      if ((existing?.lines || []).some((line) => String(line.fulfillmentMode || "DELIVER_TO_HOUSING").toUpperCase() !== "PICKUP")) {
        return { ok: false, reason: "MIXED_FULFILLMENT_CART_NOT_SUPPORTED" };
      }
      const cart = existing || window.WS_APP.createMarketCart?.(citizen.id)?.cart || null;
      if (!cart) return { ok: false, reason: "MARKET_CART_CREATE_FAILED" };
      const result = window.WS_APP.updateMarketCart?.(cart.cartId, {
        addLine: {
          marketOfferId: offerId,
          quantity: clampNumber(quantity, 1, 99),
          fulfillmentMode: "PICKUP",
          destinationRef: null
        }
      }) || { ok: false, reason: "MARKET_CART_API_UNAVAILABLE" };
      if (result.ok) setHousingMarketCartOpen(citizen.id, true);
      return result;
    }

  function addHousingMarketOfferWithServiceToCart(citizen = {}, marketOfferId = "", quantity = 1) {
      const offerId = String(marketOfferId || "").trim();
      if (!offerId) return { ok: false, reason: "MARKET_OFFER_ID_REQUIRED" };
      const offer = window.WS_APP.getMarketOffer?.(offerId) || null;
      if (!offer) return { ok: false, reason: "MARKET_OFFER_NOT_FOUND" };
      if (!Array.isArray(offer.fulfillmentOptions) || !offer.fulfillmentOptions.includes("PURCHASE_WITH_SERVICE")) {
        return { ok: false, reason: "PURCHASE_WITH_SERVICE_NOT_AVAILABLE" };
      }
      const existing = getHousingMarketDraftCart(citizen.id);
      if ((existing?.lines || []).some((line) => String(line.fulfillmentMode || "DELIVER_TO_HOUSING").toUpperCase() !== "PURCHASE_WITH_SERVICE")) {
        return { ok: false, reason: "MIXED_FULFILLMENT_CART_NOT_SUPPORTED" };
      }
      const cart = existing || window.WS_APP.createMarketCart?.(citizen.id)?.cart || null;
      if (!cart) return { ok: false, reason: "MARKET_CART_CREATE_FAILED" };
      const result = window.WS_APP.updateMarketCart?.(cart.cartId, {
        addLine: {
          marketOfferId: offerId,
          quantity: clampNumber(quantity, 1, 99),
          fulfillmentMode: "PURCHASE_WITH_SERVICE",
          destinationRef: null,
          linkedServiceSelection: {
            serviceDefinitionId: String(offer.linkedServiceDefinitionIds?.[0] || "").trim(),
            providerId: String(offer.linkedServiceProviderIds?.[0] || "").trim(),
            targetCharacterId: String(citizen.id || "").trim(),
            targetBodySlots: []
          }
        }
      }) || { ok: false, reason: "MARKET_CART_API_UNAVAILABLE" };
      if (result.ok) setHousingMarketCartOpen(citizen.id, true);
      return result;
    }

  function updateHousingMarketCartQuantity(citizenId = "", cartLineId = "", quantity = 0) {
      const cart = getHousingMarketDraftCart(citizenId);
      if (!cart) return { ok: false, reason: "MARKET_CART_NOT_FOUND" };
      return window.WS_APP.updateMarketCart?.(cart.cartId, {
        setQuantity: { cartLineId, quantity }
      }) || { ok: false, reason: "MARKET_CART_API_UNAVAILABLE" };
    }

  function removeHousingMarketCartLine(citizenId = "", cartLineId = "") {
      const cart = getHousingMarketDraftCart(citizenId);
      if (!cart) return { ok: false, reason: "MARKET_CART_NOT_FOUND" };
      return window.WS_APP.updateMarketCart?.(cart.cartId, { removeLineId: cartLineId }) || { ok: false, reason: "MARKET_CART_API_UNAVAILABLE" };
    }

  function clearHousingMarketCart(citizenId = "") {
      const cart = getHousingMarketDraftCart(citizenId);
      if (!cart) return { ok: true, reason: "MARKET_CART_ALREADY_EMPTY" };
      return window.WS_APP.updateMarketCart?.(cart.cartId, { clear: true }) || { ok: false, reason: "MARKET_CART_API_UNAVAILABLE" };
    }

  function formatHousingMarketStoreLabel(value = "") {
      return String(value || "").trim().replace(/_/g, " ") || "OTHER";
    }

  function renderHousingMarketModeTabs(activeMode = "CATALOG", stats = {}) {
      const modes = [
        { id: "CATALOG", label: "CATALOG", meta: `${stats.total || 0} PRODUCTS` },
        { id: "ORDERS", label: "ORDERS", meta: `${stats.activeOrders || 0} ACTIVE` },
        { id: "DELIVERED", label: "DELIVERED", meta: `${stats.deliveredOrders || 0} CLOSED` }
      ];
      return `
        <div class="housing-market-subtabs housing-market-section-tabs system-segment-tabs" role="tablist" aria-label="Housing Market Sections">
          ${modes.map((mode) => `
            <button class="housing-market-subtab housing-market-section-tab system-segment-tile system-segment-tile--card ${mode.id === activeMode ? "is-active" : ""}" type="button" role="tab" aria-selected="${mode.id === activeMode ? "true" : "false"}" data-housing-market-mode="${escapeHtml(mode.id)}">
              <span class="system-segment-tile__body">
                <b class="system-segment-tile__title">${escapeHtml(mode.label)}</b>
                <small class="system-segment-tile__description">${escapeHtml(mode.meta)}</small>
              </span>
            </button>
          `).join("")}
        </div>
      `;
    }

  function renderHousingMarketDepartmentNavigation(filters = {}, options = {}) {
      const departments = Array.isArray(options.departments) ? options.departments : [];
      const activeDepartment = HOUSING_MARKET_DEPARTMENTS.includes(filters.type) ? filters.type : "ALL";
      const subcategories = activeDepartment === "ALL"
        ? []
        : (options.subcategoriesByDepartment?.[activeDepartment] || []);
      return `
        <aside class="housing-market-department-nav" aria-label="Market departments">
          <p class="kicker">DEPARTMENTS</p>
          <div class="housing-market-department-list">
            ${departments.map((department) => `
              <button class="housing-market-department ${activeDepartment === department.id ? "is-active" : ""}" type="button" data-housing-market-department="${escapeHtml(department.id)}">
                <b>${escapeHtml(formatHousingMarketStoreLabel(department.id))}</b>
                <small>${escapeHtml(department.count || 0)}</small>
              </button>
            `).join("")}
          </div>
          ${subcategories.length ? `
            <div class="housing-market-subcategory-list">
              <p class="kicker">${escapeHtml(formatHousingMarketStoreLabel(activeDepartment))}</p>
              <button class="housing-market-subcategory ${filters.category === "ALL" ? "is-active" : ""}" type="button" data-housing-market-category="ALL">
                <b>ALL ${escapeHtml(formatHousingMarketStoreLabel(activeDepartment))}</b>
                <small>${escapeHtml(departments.find((entry) => entry.id === activeDepartment)?.count || 0)}</small>
              </button>
              ${subcategories.map((subcategory) => `
                <button class="housing-market-subcategory ${filters.category === subcategory.id ? "is-active" : ""}" type="button" data-housing-market-category="${escapeHtml(subcategory.id)}">
                  <b>${escapeHtml(formatHousingMarketStoreLabel(subcategory.id))}</b>
                  <small>${escapeHtml(subcategory.count || 0)}</small>
                </button>
              `).join("")}
            </div>
          ` : ""}
        </aside>
      `;
    }

  function renderHousingMarketCatalogToolbar(filters = {}, visibleCount = 0) {
      const sortOptions = [
        ["CATEGORY", "CATEGORY"],
        ["NAME", "NAME A-Z"],
        ["PRICE_ASC", "PRICE LOW-HIGH"],
        ["PRICE_DESC", "PRICE HIGH-LOW"],
        ["MANUFACTURER", "VENDOR / MAKER"]
      ];
      return `
        <div class="housing-market-toolbar" aria-label="Market catalog filters">
          <label class="housing-market-field housing-market-search">
            <span>Search products</span>
            <input type="search" value="${escapeHtml(filters.search)}" placeholder="name / maker / tag" data-housing-market-filter-field="search">
          </label>
          <label class="housing-market-field">
            <span>Sort</span>
            <select data-housing-market-filter-field="sort">
              ${sortOptions.map(([id, label]) => `<option value="${escapeHtml(id)}" ${filters.sort === id ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
            </select>
          </label>
          <button class="housing-inline-action housing-market-reset" type="button" data-housing-market-reset-filters>RESET</button>
          <span class="module-status-badge">${escapeHtml(visibleCount)} RESULTS</span>
        </div>
      `;
    }

  function getHousingMarketProductFacts(item = {}) {
      const department = getHousingMarketDepartment(item);
      const kind = getHousingMarketItemKind(item);
      const tier = getHousingMarketItemTier(item);
      const profile = item.consumableProfile && typeof item.consumableProfile === "object" ? item.consumableProfile : {};
      const packageQuantity = profile.packageQuantity ?? item.packageQuantity ?? item.quantityPerPackage ?? item.unitsPerPackage;
      const facts = [];
      const add = (label, value) => {
        const normalized = String(value ?? "").trim();
        if (normalized && normalized !== "0") facts.push({ label, value: normalized });
      };
  
      if (department === "CYBERWARE") {
        add("Class", tier ? `${formatHousingMarketStoreLabel(kind)} / T${tier}` : formatHousingMarketStoreLabel(kind));
        add("Format", item.scale || item.grade || item.footprint || "STANDARD");
      } else if (department === "MEDICAL") {
        add("Dose", profile.dose || item.dose || item.dosage || item.doseLabel);
        add("Package", packageQuantity ? `${packageQuantity} UNIT${Number(packageQuantity) === 1 ? "" : "S"}` : profile.packageLabel || item.packageLabel || formatHousingMarketStoreLabel(kind));
        add("Duration", profile.duration || item.duration || item.effectDuration);
      } else if (department === "FOOD") {
        add("Package", packageQuantity ? `${packageQuantity} UNIT${Number(packageQuantity) === 1 ? "" : "S"}` : (profile.mealUnits || item.mealUnits) ? `${profile.mealUnits || item.mealUnits} MEALS` : formatHousingMarketStoreLabel(kind));
        add("Class", profile.rationClass || item.rationClass || profile.quality || item.quality || item.grade || profile.shelfLife || item.shelfLife);
      } else if (department === "HOUSEHOLD") {
        add("Type", formatHousingMarketStoreLabel(kind));
        add("Package", packageQuantity ? `${packageQuantity} UNIT${Number(packageQuantity) === 1 ? "" : "S"}` : profile.packageLabel || item.packageLabel || item.footprint);
      } else {
        add("Class", `${formatHousingMarketStoreLabel(item.category || department)} / ${formatHousingMarketStoreLabel(item.subtype || kind)}`);
        add("Footprint", item.footprint || (item.width && item.height ? `${item.width}x${item.height}` : ""));
      }
  
      return facts.slice(0, 2);
    }

  function getHousingMarketProductRestrictions(item = {}, availability = {}) {
      const restrictions = [];
      const legality = String(item.legality || "").trim().toUpperCase();
      const requirements = item.purchaseRequirements && typeof item.purchaseRequirements === "object" ? item.purchaseRequirements : {};
      const requirementCodes = [
        ...(Array.isArray(requirements.requiredLicenseCodes) ? requirements.requiredLicenseCodes : []),
        ...(Array.isArray(requirements.requiredEntitlements) ? requirements.requiredEntitlements : []),
        ...(Array.isArray(requirements.blockers) ? requirements.blockers : [])
      ].filter(Boolean);
      if (["RESTRICTED", "CORPORATE", "LICENSED", "SERVICE_ISSUED", "CONTROLLED"].includes(legality)) restrictions.push(legality);
      if (requirements.requiredAccessLevel) restrictions.push(`ACCESS ${requirements.requiredAccessLevel}`);
      for (const code of requirementCodes) {
        restrictions.push(String(code));
        if (restrictions.length >= 3) break;
      }
      if (availability.code === "LIMITED") restrictions.push(availability.stockLabel || "LIMITED STOCK");
      return [...new Set(restrictions)].slice(0, 3);
    }

  function getHousingMarketProductCatalogId(item = {}) {
      return String(item.catalogId || item.id || item.marketOfferId || "").trim();
    }

  function getHousingMarketProductDescription(item = {}) {
      const feature = Array.isArray(item.specialFeatures) ? item.specialFeatures.find(Boolean) : "";
      return String(item.description || item.longDescription || item.shortDescription || item.notes || feature || "Product available through the indexed Market offer.").trim();
    }

  function getHousingMarketInspectorFacts(item = {}) {
      const department = getHousingMarketDepartment(item);
      const kind = getHousingMarketItemKind(item);
      const tier = getHousingMarketItemTier(item);
      const profile = item.consumableProfile && typeof item.consumableProfile === "object" ? item.consumableProfile : {};
      const equipProfile = item.equipProfile && typeof item.equipProfile === "object" ? item.equipProfile : {};
      const facts = [];
      const add = (label, value) => {
        const normalized = Array.isArray(value)
          ? value.map((entry) => String(entry || "").trim()).filter(Boolean).join(" / ")
          : String(value ?? "").trim();
        if (normalized && normalized !== "0") facts.push({ label, value: normalized });
      };
      const packageQuantity = profile.packageQuantity ?? item.packageQuantity ?? item.quantityPerPackage ?? item.unitsPerPackage;
  
      if (department === "CYBERWARE") {
        add("System", formatHousingMarketStoreLabel(kind));
        add("Tier", tier ? `T${tier}` : "STANDARD");
        add("Scale", item.scale || item.implantScale || item.size);
        add("Grade", item.grade || item.quality);
        add("Footprint", item.footprint || (item.width && item.height ? `${item.width}x${item.height}` : ""));
        add("Neuroload", item.neuroload ?? item.neuroLoad ?? item.neuralLoad);
        add("Channels", item.neurochannels ?? item.neuroChannels ?? item.channels);
        add("Latency", item.neurolatency ?? item.neuroLatency ?? item.latency);
        add("Security", item.security ?? item.securityRating);
        add("Stability", item.stability ?? item.stabilityRating);
        add("Protocols", item.protocolSupport || item.protocols || item.supportedProtocols);
        add("Body slots", item.bodySlots || item.allowedBodySlots || item.installationSlots);
      } else if (department === "MEDICAL") {
        add("Product type", formatHousingMarketStoreLabel(kind));
        add("Dose", profile.dose || item.dose || item.dosage || item.doseLabel);
        add("Package", packageQuantity ? `${packageQuantity} UNIT${Number(packageQuantity) === 1 ? "" : "S"}` : profile.packageLabel || item.packageLabel);
        add("Duration", profile.duration || item.duration || item.effectDuration);
        add("Shelf life", profile.shelfLife || item.shelfLife);
        add("Quality", profile.quality || item.quality || item.grade);
      } else if (department === "FOOD") {
        add("Product type", formatHousingMarketStoreLabel(kind));
        add("Package", packageQuantity ? `${packageQuantity} UNIT${Number(packageQuantity) === 1 ? "" : "S"}` : profile.packageLabel || item.packageLabel);
        add("Meal units", profile.mealUnits || item.mealUnits);
        add("Ration class", profile.rationClass || item.rationClass);
        add("Dose / serving", profile.dose || item.dose || item.servingSize);
        add("Quality", profile.quality || item.quality || item.grade);
        add("Shelf life", profile.shelfLife || item.shelfLife);
      } else if (department === "HOUSEHOLD") {
        add("Product type", formatHousingMarketStoreLabel(kind));
        add("Package", packageQuantity ? `${packageQuantity} UNIT${Number(packageQuantity) === 1 ? "" : "S"}` : profile.packageLabel || item.packageLabel);
        add("Quality", profile.quality || item.quality || item.grade);
        add("Shelf life", profile.shelfLife || item.shelfLife);
        add("Footprint", item.footprint || (item.width && item.height ? `${item.width}x${item.height}` : ""));
      } else {
        add("Category", formatHousingMarketStoreLabel(item.category || department));
        add("Type", formatHousingMarketStoreLabel(item.subtype || kind));
        add("Footprint", item.footprint || (item.width && item.height ? `${item.width}x${item.height}` : ""));
        add("Grade", item.grade || item.quality);
        add("Hands", equipProfile.handsRequired);
        add("Equip layer", equipProfile.layer);
        add("Capacity", item.capacitySlots ? `${item.capacitySlots} SLOTS` : item.capacityTier ? `T${item.capacityTier}` : "");
      }
  
      return facts;
    }

  function getHousingMarketInspectorRequirements(item = {}, citizen = {}) {
      const requirements = item.purchaseRequirements && typeof item.purchaseRequirements === "object" ? item.purchaseRequirements : {};
      const offerId = String(item.marketOfferId || "").trim();
      const offer = offerId ? window.WS_APP.getMarketOffer?.(offerId) : null;
      const validation = offer && typeof window.WS_APP.validateMarketOfferPurchaseRequirements === "function"
        ? window.WS_APP.validateMarketOfferPurchaseRequirements(offer, citizen.id)
        : { ok: true, blockers: [] };
      const rows = [];
      const add = (label, value, state = "") => {
        const normalized = Array.isArray(value)
          ? value.map((entry) => formatHousingMarketStoreLabel(entry)).filter(Boolean).join(" / ")
          : String(value ?? "").trim();
        if (normalized) rows.push({ label, value: normalized, state });
      };
      const subscriptionCategory = String(item.requiresSubscriptionCategory || "").trim().toUpperCase();
      const subscriptionTier = clampNumber(item.requiresSubscriptionTier || 0, 0, 99);
  
      add("Eligibility", validation.ok ? "CLEARED" : (validation.blockers || []).map(formatHousingMarketBlocker).join(" / "), validation.ok ? "OK" : "WARN");
      add("Legality", formatHousingMarketStoreLabel(item.legality || "REGISTERED"));
      if (subscriptionCategory) add("Subscription", `${formatHousingMarketStoreLabel(subscriptionCategory)}${subscriptionTier ? ` / T${subscriptionTier}` : ""}`);
      add("Access", requirements.requiredAccessLevel ? `LEVEL ${requirements.requiredAccessLevel}` : "");
      add("License", requirements.requiredLicenseCodes || []);
      add("Entitlement", requirements.requiredEntitlements || []);
      add("Citizen class", requirements.allowedCitizenClasses || []);
      return rows;
    }

  function getHousingMarketInspectorFulfillment(item = {}, unit = null) {
      const options = Array.isArray(item.fulfillmentOptions) ? item.fulfillmentOptions.map((value) => String(value || "").trim().toUpperCase()).filter(Boolean) : [];
      const serviceReady = options.includes("PURCHASE_WITH_SERVICE")
        && Array.isArray(item.linkedServiceDefinitionIds)
        && item.linkedServiceDefinitionIds.length
        && Array.isArray(item.linkedServiceProviderIds)
        && item.linkedServiceProviderIds.length;
      const rows = [];
      if (options.includes("DELIVER_TO_HOUSING")) {
        rows.push({ label: "Housing delivery", value: unit?.id ? "READY" : "NO STORAGE TARGET", state: unit?.id ? "OK" : "WARN" });
      }
      if (options.includes("PURCHASE_WITH_SERVICE")) {
        rows.push({ label: "Certified installation", value: serviceReady ? "AVAILABLE / BODY SLOT REQUIRED" : "SERVICE LINKAGE MISSING", state: serviceReady ? "OK" : "WARN" });
      }
      if (options.includes("PICKUP")) {
        rows.push({ label: "Pickup", value: "RUNTIME UNAVAILABLE", state: "WARN" });
      }
      return rows;
    }

  function getHousingMarketInspectorQuantityMax(item = {}) {
      const stock = item.stock && typeof item.stock === "object" ? item.stock : {};
      if (String(stock.mode || "").toUpperCase() !== "FINITE") return 99;
      return Math.max(1, Math.min(99, Math.max(0, Number(stock.availableQuantity || 0) - Number(stock.reservedQuantity || 0))));
    }

  function getHousingMarketProductVisual(item = {}, view = "thumbnail") {
      const profile = item.visualProfile && typeof item.visualProfile === "object" && !Array.isArray(item.visualProfile)
        ? item.visualProfile
        : {};
      const department = getHousingMarketDepartment(item);
      const requestedView = String(view || "thumbnail").trim().toLowerCase();
      const preferred = requestedView === "detail"
        ? String(profile.detail || profile.thumbnail || "").trim()
        : String(profile.thumbnail || profile.detail || "").trim();
      const fallback = HOUSING_MARKET_PRODUCT_VISUAL_FALLBACKS[department]
        || HOUSING_MARKET_PRODUCT_VISUAL_FALLBACKS.DEFAULT;
      const fit = String(profile.fit || "CONTAIN").trim().toUpperCase() === "COVER" ? "COVER" : "CONTAIN";
      return {
        src: preferred || fallback,
        alt: String(profile.alt || `${item.name || "Market product"} product visual`).trim(),
        fit,
        fallback: !preferred
      };
    }

  function renderHousingMarketInspectorRows(rows = [], className = "") {
      if (!rows.length) return `<p class="file-empty">No additional data registered for this product.</p>`;
      return `
        <div class="housing-market-product-inspector-rows ${escapeHtml(className)}">
          ${rows.map((row) => `
            <div class="housing-market-product-inspector-row ${row.state ? `is-${escapeHtml(String(row.state).toLowerCase())}` : ""}">
              <small>${escapeHtml(row.label)}</small>
              <b>${escapeHtml(row.value)}</b>
            </div>
          `).join("")}
        </div>
      `;
    }

  function renderHousingMarketProductInspectorContent(item = {}, citizen = {}, unit = null) {
      const department = getHousingMarketDepartment(item);
      const kind = getHousingMarketItemKind(item);
      const availability = getHousingMarketAvailability(item);
      const offerId = String(item.marketOfferId || "").trim();
      const catalogId = getHousingMarketProductCatalogId(item);
      const visual = getHousingMarketProductVisual(item, "detail");
      const facts = getHousingMarketInspectorFacts(item);
      const requirements = getHousingMarketInspectorRequirements(item, citizen);
      const fulfillment = getHousingMarketInspectorFulfillment(item, unit);
      const features = Array.isArray(item.specialFeatures) ? item.specialFeatures.map((feature) => String(feature || "").trim()).filter(Boolean) : [];
      const maxQuantity = getHousingMarketInspectorQuantityMax(item);
      const canAdd = Boolean(offerId && unit?.id && !availability.disabled);
      const canAddWithService = Boolean(
        offerId
        && !availability.disabled
        && Array.isArray(item.fulfillmentOptions)
        && item.fulfillmentOptions.includes("PURCHASE_WITH_SERVICE")
        && Array.isArray(item.linkedServiceDefinitionIds)
        && item.linkedServiceDefinitionIds.length
        && Array.isArray(item.linkedServiceProviderIds)
        && item.linkedServiceProviderIds.length
      );
      const price = getHousingMarketPrice(item);
      return `
        <header class="housing-market-product-inspector-head">
          <div>
            <p class="kicker">${escapeHtml(formatHousingMarketStoreLabel(department))} / ${escapeHtml(formatHousingMarketStoreLabel(kind))}</p>
            <h5>${escapeHtml(item.name || "MARKET PRODUCT")}</h5>
            <small>${escapeHtml(item.vendorName || getHousingMarketManufacturer(item))}</small>
          </div>
          <button class="housing-inline-action" type="button" data-housing-market-product-inspector-close>CLOSE</button>
        </header>
        <div class="housing-market-product-inspector-scroll" data-housing-market-product-inspector="${escapeHtml(catalogId)}">
          <div class="housing-market-product-inspector-hero">
            <div class="housing-market-product-inspector-visual has-image ${visual.fallback ? "is-fallback" : ""} is-fit-${escapeHtml(visual.fit.toLowerCase())}">
              <img src="${escapeHtml(visual.src)}" alt="${escapeHtml(visual.alt)}" loading="lazy" decoding="async">
            </div>
            <div class="housing-market-product-inspector-summary">
              <span class="module-status-badge is-${escapeHtml(availability.code.toLowerCase().replace(/_/g, "-"))}">${escapeHtml(availability.label)}</span>
              <div><small>PRICE</small><b>${escapeHtml(formatCredits(price))}</b></div>
              <div><small>STOCK</small><b>${escapeHtml(availability.stockLabel)}</b></div>
              <div><small>MANUFACTURER</small><b>${escapeHtml(getHousingMarketManufacturer(item))}</b></div>
            </div>
          </div>
          <section class="housing-market-product-inspector-section">
            <p class="kicker">PRODUCT DESCRIPTION</p>
            <p class="housing-market-product-inspector-description">${escapeHtml(getHousingMarketProductDescription(item))}</p>
          </section>
          <section class="housing-market-product-inspector-section">
            <p class="kicker">PRODUCT PARAMETERS</p>
            ${renderHousingMarketInspectorRows(facts)}
          </section>
          ${features.length ? `
            <section class="housing-market-product-inspector-section">
              <p class="kicker">FEATURES</p>
              <div class="housing-market-product-inspector-features">${features.map((feature) => `<span>${escapeHtml(feature)}</span>`).join("")}</div>
            </section>
          ` : ""}
          <section class="housing-market-product-inspector-section">
            <p class="kicker">PURCHASE REQUIREMENTS</p>
            ${renderHousingMarketInspectorRows(requirements, "is-requirements")}
          </section>
          <section class="housing-market-product-inspector-section">
            <p class="kicker">FULFILLMENT</p>
            ${renderHousingMarketInspectorRows(fulfillment, "is-fulfillment")}
          </section>
        </div>
        <footer class="housing-market-product-inspector-footer">
          <label class="housing-market-product-inspector-quantity">
            <span>QUANTITY</span>
            <div>
              <button type="button" data-housing-market-product-inspector-quantity-step="-1" ${availability.disabled ? "disabled" : ""}>−</button>
              <input type="number" min="1" max="${escapeHtml(maxQuantity)}" value="1" inputmode="numeric" data-housing-market-product-inspector-quantity ${availability.disabled ? "disabled" : ""}>
              <button type="button" data-housing-market-product-inspector-quantity-step="1" ${availability.disabled ? "disabled" : ""}>+</button>
            </div>
          </label>
          <div class="housing-market-product-inspector-total"><small>ESTIMATED TOTAL</small><b data-housing-market-product-inspector-total data-unit-price="${escapeHtml(price)}">${escapeHtml(formatCredits(price))}</b></div>
          <div class="housing-market-product-inspector-actions">
            <button class="housing-inline-action" type="button" data-housing-market-add-offer="${escapeHtml(offerId)}" ${canAdd ? "" : "disabled"}>${unit?.id ? (availability.disabled ? availability.label : "ADD TO CART") : "NO HOUSING TARGET"}</button>
            ${Array.isArray(item.fulfillmentOptions) && item.fulfillmentOptions.includes("PURCHASE_WITH_SERVICE")
              ? `<button class="housing-inline-action" type="button" data-housing-market-add-service-offer="${escapeHtml(offerId)}" ${canAddWithService ? "" : "disabled"}>${canAddWithService ? "BUY + INSTALL" : "SERVICE UNAVAILABLE"}</button>`
              : ""}
          </div>
        </footer>
      `;
    }

  function renderHousingMarketProductInspectorLayer() {
      return `
        <div class="housing-market-product-inspector-layer" data-housing-market-product-inspector-layer aria-hidden="true">
          <button class="housing-market-product-inspector-backdrop" type="button" tabindex="-1" aria-hidden="true" data-housing-market-product-inspector-close aria-label="Close product details"></button>
          <aside class="housing-market-product-inspector-drawer" role="dialog" aria-modal="true" aria-label="Market product details" tabindex="-1">
            <div data-housing-market-product-inspector-content></div>
          </aside>
        </div>
      `;
    }

  function syncHousingMarketProductInspectorTotal(scope = null) {
      if (!scope) return;
      const input = scope.querySelector?.("[data-housing-market-product-inspector-quantity]");
      const total = scope.querySelector?.("[data-housing-market-product-inspector-total]");
      if (!input || !total) return;
      const min = Math.max(1, Number(input.min || 1));
      const max = Math.max(min, Number(input.max || 99));
      const quantity = Math.max(min, Math.min(max, Math.round(Number(input.value || 1))));
      input.value = String(quantity);
      total.textContent = formatCredits(Number(total.getAttribute("data-unit-price") || 0) * quantity);
    }

  function openHousingMarketProductInspector(root = null, citizen = {}, catalogId = "", unit = null) {
      const id = String(catalogId || "").trim();
      const item = getHousingMarketCatalogItemById(id) || getHousingMarketCatalogItems().find((entry) => getHousingMarketProductCatalogId(entry) === id) || null;
      const layer = root?.querySelector?.("[data-housing-market-product-inspector-layer]");
      const content = layer?.querySelector?.("[data-housing-market-product-inspector-content]");
      if (!item || !layer || !content) return false;
      setHousingMarketSelectedProductId(citizen.id, getHousingMarketProductCatalogId(item));
      content.innerHTML = renderHousingMarketProductInspectorContent(item, citizen, unit);
      layer.classList.add("is-open");
      layer.setAttribute("aria-hidden", "false");
      syncHousingMarketModalState(root, citizen.id, { focus: true });
      return true;
    }

  function closeHousingMarketProductInspector(root = null, citizenId = "") {
      const layer = root?.querySelector?.("[data-housing-market-product-inspector-layer]");
      if (!layer) return false;
      const selectedId = getHousingMarketSelectedProductId(citizenId);
      layer.classList.remove("is-open");
      layer.setAttribute("aria-hidden", "true");
      setHousingMarketSelectedProductId(citizenId, "");
      syncHousingMarketModalState(root, citizenId, { focus: false });
      const selectedCard = selectedId
        ? [...(root.querySelectorAll?.("[data-housing-market-product-card]") || [])].find((card) => card.getAttribute("data-housing-market-product-card") === selectedId)
        : null;
      const trigger = selectedCard?.querySelector?.("[data-housing-market-inspect]") || selectedCard;
      window.requestAnimationFrame?.(() => trigger?.focus?.({ preventScroll: true }));
      return true;
    }

  function renderHousingMarketProductCard(item = {}, citizen = {}, unit = null) {
      const department = getHousingMarketDepartment(item);
      const kind = getHousingMarketItemKind(item);
      const availability = getHousingMarketAvailability(item);
      const offerId = String(item.marketOfferId || "").trim();
      const catalogId = getHousingMarketProductCatalogId(item);
      const canAdd = Boolean(offerId && unit?.id && !availability.disabled);
      const canPickup = Boolean(
        offerId
        && !availability.disabled
        && Array.isArray(item.fulfillmentOptions)
        && item.fulfillmentOptions.includes("PICKUP")
        && item.organizationLocationId
      );
      const canAddWithService = Boolean(
        offerId
        && !availability.disabled
        && Array.isArray(item.fulfillmentOptions)
        && item.fulfillmentOptions.includes("PURCHASE_WITH_SERVICE")
        && Array.isArray(item.linkedServiceDefinitionIds)
        && item.linkedServiceDefinitionIds.length
        && Array.isArray(item.linkedServiceProviderIds)
        && item.linkedServiceProviderIds.length
      );
      const feature = Array.isArray(item.specialFeatures) ? item.specialFeatures.find(Boolean) : "";
      const note = String(item.shortDescription || item.description || item.notes || feature || "Product available through the indexed Market offer.").trim();
      const visual = getHousingMarketProductVisual(item, "thumbnail");
      const facts = getHousingMarketProductFacts(item);
      const restrictions = getHousingMarketProductRestrictions(item, availability);
      return `
        <article class="housing-market-product-card is-${escapeHtml(department.toLowerCase())} ${availability.disabled ? "is-unavailable" : ""}" data-housing-market-product-card="${escapeHtml(catalogId)}">
          <button class="housing-market-product-mark has-image ${visual.fallback ? "is-fallback" : ""} is-fit-${escapeHtml(visual.fit.toLowerCase())}" type="button" data-housing-market-inspect="${escapeHtml(catalogId)}" aria-label="View details for ${escapeHtml(item.name)}">
            <img src="${escapeHtml(visual.src)}" alt="" loading="lazy" decoding="async" aria-hidden="true">
          </button>
          <div class="housing-market-product-head">
            <div>
              <p class="kicker">${escapeHtml(formatHousingMarketStoreLabel(department))} / ${escapeHtml(formatHousingMarketStoreLabel(kind))}</p>
              <h5>${escapeHtml(item.name)}</h5>
              <small>${escapeHtml(item.vendorName || getHousingMarketManufacturer(item))}</small>
            </div>
            <span class="module-status-badge is-${escapeHtml(availability.code.toLowerCase().replace(/_/g, "-"))}">${escapeHtml(availability.label)}</span>
          </div>
          <p class="housing-market-product-note">${escapeHtml(note)}</p>
          ${facts.length ? `<div class="housing-market-product-facts">${facts.map((fact) => `<span><small>${escapeHtml(fact.label)}</small><b>${escapeHtml(fact.value)}</b></span>`).join("")}</div>` : ""}
          ${restrictions.length ? `<div class="housing-market-product-tags">${restrictions.map((restriction) => `<span>${escapeHtml(formatHousingMarketStoreLabel(restriction))}</span>`).join("")}</div>` : ""}
          <div class="housing-market-product-buy-row">
            <div class="housing-market-product-price"><small>PRICE</small><b>${escapeHtml(formatCredits(getHousingMarketPrice(item)))}</b><span>${escapeHtml(availability.stockLabel)}</span></div>
            <div class="housing-market-product-actions">
              <button class="housing-inline-action housing-market-product-details" type="button" data-housing-market-inspect="${escapeHtml(catalogId)}">VIEW DETAILS</button>
              <button class="housing-inline-action housing-market-add-cart" type="button" data-housing-market-add-offer="${escapeHtml(offerId)}" ${canAdd ? "" : "disabled"}>${unit?.id ? (availability.disabled ? availability.label : "ADD TO CART") : "NO HOUSING TARGET"}</button>
              ${Array.isArray(item.fulfillmentOptions) && item.fulfillmentOptions.includes("PICKUP")
                ? `<button class="housing-inline-action housing-market-add-cart" type="button" data-housing-market-add-pickup-offer="${escapeHtml(offerId)}" ${canPickup ? "" : "disabled"}>${canPickup ? "ADD FOR PICKUP" : "PICKUP UNAVAILABLE"}</button>`
                : ""}
              ${Array.isArray(item.fulfillmentOptions) && item.fulfillmentOptions.includes("PURCHASE_WITH_SERVICE")
                ? `<button class="housing-inline-action housing-market-add-cart" type="button" data-housing-market-add-service-offer="${escapeHtml(offerId)}" ${canAddWithService ? "" : "disabled"}>${canAddWithService ? "BUY + INSTALL" : "SERVICE UNAVAILABLE"}</button>`
                : ""}
            </div>
          </div>
        </article>
      `;
    }

  function getHousingMarketPagination(totalItems = 0, requestedPage = 1) {
      const totalPages = Math.max(1, Math.ceil(totalItems / HOUSING_MARKET_PAGE_SIZE));
      const page = Math.min(totalPages, Math.max(1, Number(requestedPage || 1)));
      const startIndex = (page - 1) * HOUSING_MARKET_PAGE_SIZE;
      const endIndex = Math.min(totalItems, startIndex + HOUSING_MARKET_PAGE_SIZE);
      return { page, totalPages, startIndex, endIndex };
    }

  function getHousingMarketPagerPages(page = 1, totalPages = 1) {
      const pages = new Set([1, totalPages, page - 1, page, page + 1]);
      return [...pages].filter((entry) => entry >= 1 && entry <= totalPages).sort((a, b) => a - b);
    }

  function renderHousingMarketPagination(pagination = {}) {
      if (pagination.totalPages <= 1) return "";
      const pages = getHousingMarketPagerPages(pagination.page, pagination.totalPages);
      let previous = 0;
      return `
        <nav class="housing-market-pagination" aria-label="Market catalog pages">
          <button class="housing-inline-action" type="button" data-housing-market-page="${escapeHtml(pagination.page - 1)}" ${pagination.page <= 1 ? "disabled" : ""}>PREV</button>
          <div class="housing-market-page-list">
            ${pages.map((page) => {
              const gap = previous && page - previous > 1 ? `<span aria-hidden="true">…</span>` : "";
              previous = page;
              return `${gap}<button class="housing-market-page ${page === pagination.page ? "is-active" : ""}" type="button" data-housing-market-page="${escapeHtml(page)}">${escapeHtml(page)}</button>`;
            }).join("")}
          </div>
          <button class="housing-inline-action" type="button" data-housing-market-page="${escapeHtml(pagination.page + 1)}" ${pagination.page >= pagination.totalPages ? "disabled" : ""}>NEXT</button>
        </nav>
      `;
    }

  function renderHousingMarketCatalog(items = [], citizen = {}, unit = null, filters = {}, options = {}, pagination = {}) {
      const currentLabel = filters.category !== "ALL"
        ? `${formatHousingMarketStoreLabel(filters.type)} / ${formatHousingMarketStoreLabel(filters.category)}`
        : formatHousingMarketStoreLabel(filters.type === "ALL" ? "ALL PRODUCTS" : filters.type);
      const rangeLabel = items.length ? `${pagination.startIndex + 1}–${pagination.endIndex} OF ${pagination.totalItems}` : `0 OF ${pagination.totalItems || 0}`;
      return `
        <section class="housing-module-panel housing-market-catalog-panel">
          <div class="housing-market-storefront">
            ${renderHousingMarketDepartmentNavigation(filters, options)}
            <div class="housing-market-shop-floor">
              ${renderHousingMarketCatalogToolbar(filters, pagination.totalItems || 0)}
              <header class="housing-market-catalog-head">
                <div><p class="kicker">${escapeHtml(currentLabel)}</p><h5>Products</h5></div>
                <div><span class="module-status-badge">${escapeHtml(rangeLabel)}</span><small>PAGE ${escapeHtml(pagination.page)} / ${escapeHtml(pagination.totalPages)}</small></div>
              </header>
              <div class="housing-market-card-grid">
                ${items.length
                  ? items.map((item) => renderHousingMarketProductCard(item, citizen, unit)).join("")
                  : `<p class="file-empty">No Market products match the current catalog filters.</p>`}
              </div>
              ${renderHousingMarketPagination(pagination)}
            </div>
          </div>
        </section>
      `;
    }

  function formatHousingMarketBlocker(code = "") {
      const value = String(code || "").split(":").pop().replace(/^API_REQUIRED:/, "").replace(/_/g, " ");
      return value || "UNKNOWN BLOCKER";
    }

  function renderHousingMarketCartDrawer(citizen = {}, activeRecord = null, unit = null) {
      const context = getHousingMarketCartContext(citizen.id);
      const open = getHousingMarketCartOpen(citizen.id);
      const serviceCart = Boolean(context.cart?.lines?.length)
        && context.cart.lines.every((line) => String(line.fulfillmentMode || "DELIVER_TO_HOUSING").toUpperCase() === "PURCHASE_WITH_SERVICE");
      const pickupCart = Boolean(context.cart?.lines?.length)
        && context.cart.lines.every((line) => String(line.fulfillmentMode || "DELIVER_TO_HOUSING").toUpperCase() === "PICKUP");
      const pickupOffer = pickupCart ? window.WS_APP.getMarketOffer?.(context.cart.lines[0]?.marketOfferId) || null : null;
      const quotedByLineId = new Map((context.quote?.lines || []).map((line) => [line.cartLineId, line]));
      return `
        <div class="housing-market-cart-layer ${open ? "is-open" : ""}" data-housing-market-cart-layer aria-hidden="${open ? "false" : "true"}">
          <button class="housing-market-cart-backdrop" type="button" tabindex="-1" aria-hidden="true" data-housing-market-cart-close aria-label="Close market cart"></button>
          <aside class="housing-market-cart-drawer" role="dialog" aria-modal="true" aria-label="Market cart draft" tabindex="-1">
            <header class="housing-market-cart-head">
              <div>
                <p class="kicker">MARKET CART DRAFT</p>
                <h5>${escapeHtml(context.cart?.cartId || "NO ACTIVE CART")}</h5>
                <small>${escapeHtml(serviceCart
                  ? "DIRECT SERVICE CUSTODY / CERTIFIED INSTALLATION"
                  : pickupCart
                    ? `PICKUP / ${pickupOffer?.vendorDisplayName || pickupOffer?.vendorProviderId || "VENDOR"} / ${pickupOffer?.organizationLocationId || "LOCATION PENDING"}`
                    : (unit ? `${activeRecord?.title || "HOUSING"} / ${unit.label || unit.id}` : "HOUSING DESTINATION REQUIRED"))}</small>
              </div>
              <button class="housing-inline-action" type="button" data-housing-market-cart-close>CLOSE</button>
            </header>
            <div class="housing-market-cart-lines">
              ${context.cart?.lines?.length ? context.cart.lines.map((line) => {
                const offer = window.WS_APP.getMarketOffer?.(line.marketOfferId) || null;
                const product = offer ? window.WS_APP.projectMarketOfferCatalogItem?.(offer) : null;
                const quoteLine = quotedByLineId.get(line.cartLineId) || {};
                return `
                  <article class="housing-market-cart-line ${quoteLine.blockers?.length ? "has-blocker" : ""}">
                    <div class="housing-market-cart-line-main">
                      <b>${escapeHtml(product?.name || line.marketOfferId)}</b>
                      <small>${escapeHtml(offer?.vendorDisplayName || offer?.vendorProviderId || "UNKNOWN VENDOR")}</small>
                      <small>${escapeHtml(
                        String(line.fulfillmentMode || "DELIVER_TO_HOUSING").toUpperCase() === "PURCHASE_WITH_SERVICE"
                          ? `SERVICE ${line.linkedServiceSelection?.providerId || quoteLine.serviceProviderId || "PROVIDER PENDING"}`
                          : String(line.fulfillmentMode || "DELIVER_TO_HOUSING").toUpperCase() === "PICKUP"
                            ? `PICKUP ${quoteLine.organizationLocationId || offer?.organizationLocationId || "LOCATION REQUIRED"}`
                            : (line.destinationRef?.housingStorageId ? `DESTINATION ${line.destinationRef.housingStorageId}` : "DESTINATION REQUIRED")
                      )}</small>
                      ${quoteLine.blockers?.length ? `<small class="housing-market-cart-blocker">${escapeHtml(quoteLine.blockers.map(formatHousingMarketBlocker).join(" / "))}</small>` : ""}
                    </div>
                    <div class="housing-market-cart-line-price">
                      <b>${escapeHtml(formatCredits(quoteLine.lineTotal || 0))}</b>
                      <small>${escapeHtml(formatCredits(quoteLine.unitPrice || 0))} EACH</small>
                    </div>
                    <div class="housing-market-cart-quantity">
                      <button type="button" data-housing-market-cart-quantity="${escapeHtml(line.cartLineId)}" data-quantity="${escapeHtml(Math.max(0, Number(line.quantity || 1) - 1))}" aria-label="Decrease quantity">−</button>
                      <b>${escapeHtml(line.quantity || 1)}</b>
                      <button type="button" data-housing-market-cart-quantity="${escapeHtml(line.cartLineId)}" data-quantity="${escapeHtml(Math.min(99, Number(line.quantity || 1) + 1))}" aria-label="Increase quantity">+</button>
                    </div>
                    <button class="housing-market-cart-remove" type="button" data-housing-market-cart-remove="${escapeHtml(line.cartLineId)}">REMOVE</button>
                  </article>
                `;
              }).join("") : `<p class="file-empty">Cart draft is empty. Add an indexed offer from Catalog.</p>`}
            </div>
            <footer class="housing-market-cart-summary">
              <div class="housing-market-cart-quote">
                <div><small>LINES</small><b>${escapeHtml(context.lineCount)}</b></div>
                <div><small>ITEMS</small><b>${escapeHtml(context.itemCount)}</b></div>
                <div><small>QUOTE TOTAL</small><b>${escapeHtml(formatCredits(context.total))}</b></div>
                <div><small>QUOTE STATUS</small><b>${escapeHtml(context.quote?.ok ? "READY" : (context.cart ? "BLOCKED" : "EMPTY"))}</b></div>
              </div>
              ${context.quote?.blockers?.length ? `<div class="housing-market-cart-blockers"><b>QUOTE BLOCKERS</b>${context.quote.blockers.map((code) => `<span>${escapeHtml(formatHousingMarketBlocker(code))}</span>`).join("")}</div>` : ""}
              <div class="housing-market-cart-actions">
                <button class="housing-inline-action" type="button" data-housing-market-cart-clear ${context.cart?.lines?.length ? "" : "disabled"}>CLEAR CART</button>
                <button class="housing-inline-action housing-market-checkout" type="button" data-housing-market-checkout ${context.quote?.ok && context.cart?.lines?.length ? "" : "disabled"}>AUTHORIZE CHECKOUT</button>
              </div>
              <p class="housing-storage-note">${escapeHtml(serviceCart
                ? "Checkout authorizes Market and Service Billing, reserves stock, creates one ItemInstance directly in Service custody and schedules the linked Service Order. Final capture waits for confirmed physical placement."
                : pickupCart
                  ? "Checkout captures Billing, commits stock and creates one ItemInstance per purchased unit in vendor custody. Confirm pickup before the reservation expires to move the same records into Citizen custody."
                  : "Checkout authorizes Billing, reserves stock and Housing placement, creates one ItemInstance per purchased unit and commits the final placement.")}</p>
            </footer>
          </aside>
        </div>
      `;
    }

  function getHousingShipmentRows(citizen = {}, mode = "ACTIVE") {
      const normalizedMode = normalizeHousingMarketMode(mode);
      const orders = getCitizenMarketOrders(citizen).filter((order) => order.type === "ITEM_PURCHASE");
      const shipments = getCitizenShipments(citizen);
      const shipmentById = new Map(shipments.map((shipment) => [shipment.id, shipment]));
      return orders
        .map((order) => {
          const shipment = shipmentById.get(order.shipmentId) || {};
          const state = getHousingShipmentState(shipment, order);
          const context = getHousingShipmentUnitContext(citizen, shipment, order);
          return { order, shipment, state, context };
        })
        .filter((row) => {
          if (normalizedMode === "DELIVERED") return row.state === "DELIVERED" || row.state === "DELIVERED_OVERFLOW";
          return HOUSING_SHIPMENT_ACTIVE_STATUSES.has(row.state);
        })
        .sort((a, b) => compareIsoDates(a.shipment.etaIso || a.order.etaIso, b.shipment.etaIso || b.order.etaIso) || String(a.order.itemName).localeCompare(String(b.order.itemName)));
    }

  function getHousingShipmentOrders(citizen = {}, mode = "ACTIVE") {
      return getHousingShipmentRows(citizen, mode).map((row) => row.order);
    }

  function getCanonicalHousingMarketOrders(citizen = {}) {
      return typeof window.WS_APP.getCitizenMarketOrders === "function"
        ? window.WS_APP.getCitizenMarketOrders(citizen.id).filter((order) => order && order.marketOrderId)
        : [];
    }

  function isCanonicalHousingMarketOrderActive(order = {}) {
      const refundStatus = String(order.refundRequest?.status || "").trim().toUpperCase();
      if (["REQUESTED", "PROCESSING", "RECOVERY_REQUIRED"].includes(refundStatus)) return true;
      const partialReturnActive = (Array.isArray(order.partialReturns) ? order.partialReturns : []).some((entry) => ["REQUESTED", "PROCESSING", "RECOVERY_REQUIRED"].includes(String(entry?.status || "").trim().toUpperCase()));
      if (partialReturnActive) return true;
      return !HOUSING_MARKET_ORDER_CLOSED_STATUSES.has(String(order.status || "").trim().toUpperCase());
    }

  function getCanonicalHousingMarketOrderProductName(line = {}) {
      const offer = window.WS_APP.getMarketOffer?.(line.marketOfferId);
      return offer?.catalogItem?.name || line.catalogItemId || line.marketOfferId || "MARKET ITEM";
    }

  function formatCanonicalMarketOrderStatus(order = {}) {
      const refundStatus = String(order.refundRequest?.status || "NONE").trim().toUpperCase();
      if (refundStatus === "REQUESTED") return "REFUND REQUESTED";
      if (refundStatus === "PROCESSING") return "RETURN PROCESSING";
      if (refundStatus === "RECOVERY_REQUIRED") return "REFUND RECOVERY REQUIRED";
      if (refundStatus === "COMPLETED") return "REFUNDED";
      const activePartial = (Array.isArray(order.partialReturns) ? order.partialReturns : []).find((entry) => ["REQUESTED", "PROCESSING", "RECOVERY_REQUIRED"].includes(String(entry?.status || "").trim().toUpperCase()));
      if (activePartial?.status === "REQUESTED") return "PARTIAL RETURN REQUESTED";
      if (activePartial?.status === "PROCESSING") return "PARTIAL RETURN PROCESSING";
      if (activePartial?.status === "RECOVERY_REQUIRED") return "PARTIAL REFUND RECOVERY REQUIRED";
      if (String(order.paymentStatus || "").trim().toUpperCase() === "PARTIALLY_REFUNDED") return "PARTIALLY REFUNDED";
      const deliveryStatus = String(order.deliveryFulfillment?.status || "NOT_REQUIRED").trim().toUpperCase();
      if (String(order.status || "").trim().toUpperCase() === "FULFILLING" && !["", "NOT_REQUIRED", "PENDING", "PREPARING"].includes(deliveryStatus)) return deliveryStatus.replace(/_/g, " ");
      return String(order.status || "UNKNOWN").trim().toUpperCase().replace(/_/g, " ");
    }

  function renderCanonicalMarketOrderLines(order = {}) {
      const completedPartialReturns = (Array.isArray(order.partialReturns) ? order.partialReturns : []).filter((entry) => String(entry?.status || "").trim().toUpperCase() === "COMPLETED");
      const returnedIds = new Set(completedPartialReturns.flatMap((entry) => Array.isArray(entry.returnInstanceIds) ? entry.returnInstanceIds : []));
      return `
        <div class="housing-market-order-lines">
          ${(order.lines || []).map((line) => {
            const instanceIds = Array.isArray(line.createdItemInstanceIds) ? line.createdItemInstanceIds : [];
            const returnedCount = instanceIds.filter((instanceId) => returnedIds.has(instanceId)).length;
            return `
            <div class="housing-market-order-line">
              <div>
                <b>${escapeHtml(`${line.quantity || 1} × ${getCanonicalHousingMarketOrderProductName(line)}`)}</b>
                <small>${escapeHtml(
                  String(line.fulfillmentMode || "DELIVER_TO_HOUSING").toUpperCase() === "PURCHASE_WITH_SERVICE"
                    ? `PURCHASE WITH SERVICE → ${line.serviceOrderId || line.linkedServiceSelection?.providerId || "SERVICE PENDING"}`
                    : `${String(line.fulfillmentMode || "DELIVER_TO_HOUSING").replace(/_/g, " ")} → ${line.destinationRef?.housingStorageId || "UNASSIGNED"}`
                )}</small>
              </div>
              <div>
                <b>${escapeHtml(formatCredits(line.lineTotal || 0))}</b>
                <small>${escapeHtml(`${instanceIds.length} INSTANCE${instanceIds.length === 1 ? "" : "S"}${returnedCount ? ` / ${returnedCount} RETURNED` : ""}`)}</small>
              </div>
            </div>`;
          }).join("")}
        </div>
      `;
    }

  function renderCanonicalMarketPartialReturnWorkspace(order = {}, actionState = {}) {
      const active = actionState.activePartialReturn || null;
      const eligibleIds = new Set(Array.isArray(actionState.partialReturnEligibleInstanceIds) ? actionState.partialReturnEligibleInstanceIds : []);
      const completed = (Array.isArray(order.partialReturns) ? order.partialReturns : []).filter((entry) => String(entry?.status || "").trim().toUpperCase() === "COMPLETED");
      const selector = actionState.canRequestPartialReturn ? `
        <section class="housing-market-partial-return-selector">
          <header>
            <div><p class="kicker">PARTIAL RETURN</p><h6>Select unused units</h6></div>
            <small>Only eligible ItemInstance records are selectable.</small>
          </header>
          <div class="housing-market-partial-return-lines">
            ${(order.lines || []).map((line) => {
              const ids = (Array.isArray(line.createdItemInstanceIds) ? line.createdItemInstanceIds : []).filter((instanceId) => eligibleIds.has(instanceId));
              if (!ids.length) return "";
              return `
                <div class="housing-market-partial-return-line">
                  <b>${escapeHtml(getCanonicalHousingMarketOrderProductName(line))}</b>
                  <div>
                    ${ids.map((instanceId, index) => `
                      <label>
                        <input type="checkbox" value="${escapeHtml(instanceId)}" data-housing-market-partial-return-instance>
                        <span>UNIT ${escapeHtml(index + 1)} <small>${escapeHtml(instanceId)}</small></span>
                      </label>
                    `).join("")}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
          <button class="housing-inline-action" type="button" data-housing-market-partial-return-request="${escapeHtml(order.marketOrderId)}">REQUEST SELECTED RETURN</button>
        </section>
      ` : "";
      const activePanel = active ? `
        <section class="housing-market-partial-return-active is-${escapeHtml(String(active.status || "REQUESTED").toLowerCase().replace(/_/g, "-"))}">
          <header>
            <div><p class="kicker">ACTIVE PARTIAL RETURN</p><h6>${escapeHtml(active.partialReturnId)}</h6></div>
            <span class="module-status-badge">${escapeHtml(String(active.status || "REQUESTED").replace(/_/g, " "))}</span>
          </header>
          <div class="housing-market-partial-return-summary">
            <span><small>UNITS</small><b>${escapeHtml(active.returnInstanceIds?.length || 0)}</b></span>
            <span><small>REFUND</small><b>${escapeHtml(formatCredits(active.requestedAmount || 0))}</b></span>
            <span><small>REASON</small><b>${escapeHtml(String(active.reasonCode || "USER_REQUEST").replace(/_/g, " "))}</b></span>
          </div>
          <div class="housing-market-partial-return-receipts">
            ${(active.lineReceipts || []).map((receipt) => `<span>${escapeHtml(`${receipt.quantity || 0} × ${receipt.marketOrderLineId} / ${formatCredits(receipt.refundAmount || 0)}`)}</span>`).join("")}
          </div>
          ${active.errors?.length ? `<p class="housing-market-order-alert">${escapeHtml(active.errors.join(" / "))}</p>` : ""}
          <div class="housing-market-order-workflow-actions">
            ${actionState.canExecutePartialReturn ? `<button class="housing-inline-action" type="button" data-housing-market-partial-return-execute="${escapeHtml(active.partialReturnId)}">PROCESS SELECTED RETURN</button>` : ""}
            ${actionState.canRetryPartialReturn ? `<button class="housing-inline-action" type="button" data-housing-market-partial-return-retry="${escapeHtml(active.partialReturnId)}">RETRY PARTIAL REFUND</button>` : ""}
            ${actionState.canWithdrawPartialReturn ? `<button class="housing-inline-action" type="button" data-housing-market-partial-return-withdraw="${escapeHtml(active.partialReturnId)}">WITHDRAW PARTIAL RETURN</button>` : ""}
          </div>
        </section>
      ` : "";
      const history = completed.length ? `
        <section class="housing-market-partial-return-history">
          <p class="kicker">PARTIAL RETURN HISTORY</p>
          ${completed.map((entry) => `
            <div>
              <span><b>${escapeHtml(entry.partialReturnId)}</b><small>${escapeHtml(`${entry.returnInstanceIds?.length || 0} UNIT${entry.returnInstanceIds?.length === 1 ? "" : "S"}`)}</small></span>
              <span><b>${escapeHtml(formatCredits(entry.requestedAmount || 0))}</b><small>${escapeHtml(entry.completedAt ? formatIsoLabel(entry.completedAt) : "COMPLETED")}</small></span>
            </div>
          `).join("")}
        </section>
      ` : "";
      return selector || activePanel || history ? `<div class="housing-market-partial-return-workspace">${selector}${activePanel}${history}</div>` : "";
    }

  function renderCanonicalMarketOrderDetails(order = {}, citizen = {}, actionState = {}) {
      const shipment = window.WS_APP.getMarketOrderShipment?.(order) || null;
      const shipmentActionState = shipment ? (window.WS_APP.getMarketShipmentActionState?.(shipment) || {}) : {};
      const isAdmin = String(window.WS_APP.currentUser?.role || "").trim().toLowerCase() === "admin";
      const reasonOptions = [
        ["CHANGED_MIND", "CHANGED MIND"],
        ["WRONG_ITEM", "WRONG ITEM"],
        ["DUPLICATE_ORDER", "DUPLICATE ORDER"],
        ["FULFILLMENT_PROBLEM", "FULFILLMENT PROBLEM"],
        ["OTHER", "OTHER"]
      ];
      const refundStatus = String(order.refundRequest?.status || "NONE").trim().toUpperCase();
      const partialReturnBlockerText = (actionState.partialReturnBlockers || []).map(formatHousingMarketBlocker).join(" / ");
      const blockerText = [...(actionState.refundBlockers || []), ...(actionState.partialReturnBlockers || [])].map(formatHousingMarketBlocker).join(" / ");
      return `
        <div class="housing-market-order-details">
          <div class="housing-market-order-detail-grid">
            <span><small>ORDER ID</small><b>${escapeHtml(order.marketOrderId)}</b></span>
            <span><small>VENDOR</small><b>${escapeHtml(order.vendorProviderId || "UNKNOWN")}</b></span>
            <span><small>PAYMENT</small><b>${escapeHtml(order.paymentStatus || "UNKNOWN")}</b></span>
            <span><small>INTENT</small><b>${escapeHtml(order.billingRefs?.billingIntentId || "NONE")}</b></span>
            <span><small>TRANSACTION</small><b>${escapeHtml(order.billingRefs?.billingTransactionId || "NONE")}</b></span>
            <span><small>REVISION</small><b>${escapeHtml(order.revision || 1)}</b></span>
            <span><small>SERVICE</small><b>${escapeHtml(order.linkedServiceOrderIds?.join(" / ") || "NONE")}</b></span>
            <span><small>SERVICE STATUS</small><b>${escapeHtml(order.serviceFulfillment?.lastServiceStatus || order.serviceFulfillment?.status || "NOT REQUIRED")}</b></span>
            <span><small>PICKUP STATUS</small><b>${escapeHtml(order.pickupFulfillment?.status || "NOT REQUIRED")}</b></span>
            <span><small>PICKUP LOCATION</small><b>${escapeHtml(order.pickupFulfillment?.organizationLocationId || "NONE")}</b></span>
            <span><small>PICKUP ADDRESS</small><b>${escapeHtml(order.pickupFulfillment?.sourceAddress || "NONE")}</b></span>
            <span><small>PICKUP EXPIRES</small><b>${escapeHtml(order.pickupFulfillment?.expiresAt ? formatIsoLabel(order.pickupFulfillment.expiresAt) : "NONE")}</b></span>
            <span><small>SHIPMENT</small><b>${escapeHtml(shipment?.shipmentId || "NONE")}</b></span>
            <span><small>DELIVERY STATUS</small><b>${escapeHtml(shipment?.status || order.deliveryFulfillment?.status || "NOT REQUIRED")}</b></span>
            <span><small>DELIVERY ETA</small><b>${escapeHtml(shipment?.etaAt ? formatIsoLabel(shipment.etaAt) : "NONE")}</b></span>
            <span><small>DELIVERY ROUTE</small><b>${escapeHtml(shipment?.routeClass || "NONE")}</b></span>
            <span><small>DELIVERY TARGET</small><b>${escapeHtml(shipment?.destinationStorageId || "NONE")}</b></span>
            <span><small>DELIVERY ADDRESS</small><b>${escapeHtml(shipment?.destinationAddress || "NONE")}</b></span>
            <span><small>DELIVERY ERROR</small><b>${escapeHtml(shipment?.lastErrorCode || shipment?.holdReason || "NONE")}</b></span>
            <span><small>SHIPMENT REVISION</small><b>${escapeHtml(shipment?.revision || "NONE")}</b></span>
            <span><small>CREATED</small><b>${escapeHtml(formatIsoLabel(order.createdAt))}</b></span>
            <span><small>COMPLETED</small><b>${escapeHtml(order.completedAt ? formatIsoLabel(order.completedAt) : "PENDING")}</b></span>
          </div>
          ${order.failureCode ? `<p class="housing-market-order-alert">FAILURE: ${escapeHtml(String(order.failureCode).replace(/_/g, " "))}</p>` : ""}
          ${order.compensationErrors?.length ? `<p class="housing-market-order-alert">RECOVERY: ${escapeHtml(order.compensationErrors.join(" / "))}</p>` : ""}
          ${refundStatus !== "NONE" ? `<p class="housing-market-order-refund-state">REFUND ${escapeHtml(refundStatus.replace(/_/g, " "))}${order.refundRequest?.reasonCode ? ` / ${escapeHtml(String(order.refundRequest.reasonCode).replace(/_/g, " "))}` : ""}</p>` : ""}
          <div class="housing-market-order-identifiers">
            ${(order.createdItemInstanceIds || []).map((instanceId) => `<span class="${actionState.returnedInstanceIds?.includes(instanceId) ? "is-returned" : ""}">${escapeHtml(instanceId)}</span>`).join("") || `<span>NO ITEM INSTANCES</span>`}
          </div>
          ${renderCanonicalMarketPartialReturnWorkspace(order, actionState)}
          <div class="housing-market-order-workflow">
            <label class="housing-market-field">
              <span>Reason</span>
              <select data-housing-market-order-reason>
                ${reasonOptions.map(([id, label]) => `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`).join("")}
              </select>
            </label>
            <div class="housing-market-order-workflow-actions">
              ${actionState.canRetryCheckout ? `<button class="housing-inline-action" type="button" data-housing-market-order-checkout-retry="${escapeHtml(order.marketOrderId)}">RETRY CHECKOUT</button>` : ""}
              ${actionState.canConfirmPickup ? `<button class="housing-inline-action" type="button" data-housing-market-order-pickup-confirm="${escapeHtml(order.marketOrderId)}">CONFIRM PICKUP</button>` : ""}
              ${actionState.canRetryPickup ? `<button class="housing-inline-action" type="button" data-housing-market-order-pickup-retry="${escapeHtml(order.marketOrderId)}">RETRY PICKUP</button>` : ""}
              ${actionState.canCancel ? `<button class="housing-inline-action" type="button" data-housing-market-order-cancel="${escapeHtml(order.marketOrderId)}">CANCEL ORDER</button>` : ""}
              ${actionState.canRetryCancellation ? `<button class="housing-inline-action" type="button" data-housing-market-order-cancel-retry="${escapeHtml(order.marketOrderId)}">RETRY CANCELLATION</button>` : ""}
              ${actionState.canRequestRefund ? `<button class="housing-inline-action" type="button" data-housing-market-order-refund="${escapeHtml(order.marketOrderId)}">REQUEST REFUND</button>` : ""}
              ${actionState.canExecuteRefund ? `<button class="housing-inline-action" type="button" data-housing-market-order-refund-execute="${escapeHtml(order.marketOrderId)}">PROCESS RETURN</button>` : ""}
              ${actionState.canRetryRefund ? `<button class="housing-inline-action" type="button" data-housing-market-order-refund-retry="${escapeHtml(order.marketOrderId)}">RETRY REFUND</button>` : ""}
              ${actionState.canWithdrawRefundRequest ? `<button class="housing-inline-action" type="button" data-housing-market-order-refund-withdraw="${escapeHtml(order.marketOrderId)}">WITHDRAW REQUEST</button>` : ""}
            </div>
          </div>
          ${isAdmin && shipment && shipmentActionState.canReconcile ? `
            <section class="housing-market-admin-delivery">
              <div>
                <p class="kicker">ADMIN / DELIVERY DEBUG</p>
                <h6>${escapeHtml(shipment.shipmentId)}</h6>
                <small>Uses the canonical shipment resolver. Storage capacity and ItemInstance validation remain active.</small>
              </div>
              <div class="housing-market-order-workflow-actions">
                ${shipmentActionState.canForceDeliver ? `<button class="housing-inline-action" type="button" data-housing-market-shipment-admin-deliver="${escapeHtml(shipment.shipmentId)}">DELIVER NOW</button>` : ""}
                ${shipmentActionState.canRetryDelivery ? `<button class="housing-inline-action" type="button" data-housing-market-shipment-admin-retry="${escapeHtml(shipment.shipmentId)}">RETRY DELIVERY</button>` : ""}
                <button class="housing-inline-action" type="button" data-housing-market-shipment-admin-reconcile="${escapeHtml(shipment.shipmentId)}">RECONCILE SHIPMENT</button>
              </div>
            </section>
          ` : ""}
          ${!actionState.canRetryCheckout && !actionState.canConfirmPickup && !actionState.canRetryPickup && !actionState.canCancel && !actionState.canRetryCancellation && !actionState.canRequestRefund && !actionState.canExecuteRefund && !actionState.canRetryRefund && !actionState.canWithdrawRefundRequest && !actionState.canRequestPartialReturn && !actionState.canExecutePartialReturn && !actionState.canRetryPartialReturn && !actionState.canWithdrawPartialReturn && blockerText ? `<p class="housing-storage-note">Order action blocked: ${escapeHtml(blockerText)}.</p>` : ""}
          ${partialReturnBlockerText && !actionState.canRequestPartialReturn && !actionState.activePartialReturn ? `<p class="housing-storage-note">Partial return unavailable: ${escapeHtml(partialReturnBlockerText)}.</p>` : ""}
          <p class="housing-storage-note">Delivery purchases remain in vendor custody until Campaign Time reaches the shipment ETA. The canonical resolver then reserves Housing placement, moves the same ItemInstance records into Storage and completes the order. Full and partial returns remain available only after delivery.</p>
        </div>
      `;
    }

  function renderCanonicalHousingMarketOrderCard(order = {}, citizen = {}) {
      const status = String(order.status || "UNKNOWN").trim().toUpperCase();
      const destinationIds = [...new Set((order.lines || []).map((line) => line.destinationRef?.housingStorageId).filter(Boolean))];
      const targetRecord = getCitizenHousingRecords(citizen).find((record) => record.storageUnits.some((unit) => destinationIds.includes(unit.id))) || null;
      const selected = getHousingSelectedMarketOrderId(citizen.id) === order.marketOrderId;
      const actionState = window.WS_APP.getMarketOrderActionState?.(order) || { canRetryCheckout: false, canConfirmPickup: false, canRetryPickup: false, canCancel: false, canRetryCancellation: false, canRequestRefund: false, canExecuteRefund: false, canRetryRefund: false, canWithdrawRefundRequest: false, refundBlockers: [] };
      const itemCount = (order.lines || []).reduce((sum, line) => sum + Number(line.quantity || 0), 0);
      return `
        <article class="housing-market-order-card is-${escapeHtml(status.toLowerCase().replace(/_/g, "-"))} ${selected ? "is-expanded" : ""}" data-market-order-card="${escapeHtml(order.marketOrderId)}">
          <header class="housing-market-order-card-head">
            <div>
              <p class="kicker">${escapeHtml(formatCanonicalMarketOrderStatus(order))}</p>
              <h6>${escapeHtml(order.marketOrderId)}</h6>
              <small>${escapeHtml(`${itemCount} ITEM${itemCount === 1 ? "" : "S"} / ${order.vendorProviderId || "UNKNOWN VENDOR"}`)}</small>
            </div>
            <div class="housing-market-order-card-total">
              <b>${escapeHtml(formatCredits(order.totals?.finalTotal || 0))}</b>
              <small>${escapeHtml(order.paymentStatus || "UNKNOWN")}</small>
            </div>
          </header>
          ${renderCanonicalMarketOrderLines(order)}
          <footer class="housing-market-order-card-actions">
            <span class="module-status-badge">${escapeHtml(formatIsoLabel(order.completedAt || order.createdAt))}</span>
            <div>
              ${targetRecord?.id ? `<button class="housing-inline-action" type="button" data-housing-record-id="${escapeHtml(targetRecord.id)}">OPEN STORAGE</button>` : ""}
              <button class="housing-inline-action" type="button" data-housing-market-order-toggle="${escapeHtml(order.marketOrderId)}">${selected ? "HIDE DETAILS" : "VIEW DETAILS"}</button>
            </div>
          </footer>
          ${selected ? renderCanonicalMarketOrderDetails(order, citizen, actionState) : ""}
        </article>
      `;
    }

  function renderHousingShipmentPanel(citizen = {}, requestedView = "") {
      const legacyOrders = getCitizenMarketOrders(citizen).filter((order) => order.type === "ITEM_PURCHASE");
      const activeRows = getHousingShipmentRows(citizen, "ORDERS");
      const deliveredRows = getHousingShipmentRows(citizen, "DELIVERED");
      const canonicalOrders = getCanonicalHousingMarketOrders(citizen);
      const canonicalActive = canonicalOrders.filter(isCanonicalHousingMarketOrderActive);
      const canonicalHistory = canonicalOrders.filter((order) => !isCanonicalHousingMarketOrderActive(order));
      const activeView = normalizeHousingMarketOrderView(requestedView || getHousingMarketOrderView(citizen.id));
      const visibleCanonical = activeView === "ACTIVE" ? canonicalActive : canonicalHistory;
      const visibleLegacy = activeView === "ACTIVE" ? activeRows : deliveredRows;
      const heldRows = activeRows.filter((row) => row.state === "HELD");
      return `
        <section class="housing-module-panel housing-shipment-panel housing-market-orders-panel">
          <header class="housing-module-panel-head">
            <div><p class="kicker">MARKET ORDER LEDGER</p><h5>Orders / Payment / Fulfillment</h5></div>
            ${legacyOrders.length ? `<button class="housing-inline-action" type="button" data-housing-process-shipments>PROCESS LEGACY DUE</button>` : ""}
          </header>
          <div class="housing-market-summary housing-shipment-summary">
            ${renderHousingMetric("ACTIVE", canonicalActive.length + activeRows.length)}
            ${renderHousingMetric("REFUND REQUESTS", canonicalOrders.filter((order) => order.refundRequest?.status === "REQUESTED").length)}
            ${renderHousingMetric("HELD LEGACY", heldRows.length)}
            ${renderHousingMetric("COMPLETED", canonicalOrders.filter((order) => order.status === "COMPLETED").length + deliveredRows.length)}
            ${renderHousingMetric("FAILED / CANCELLED", canonicalOrders.filter((order) => ["FAILED", "CANCELLED"].includes(order.status)).length)}
            ${renderHousingMetric("TOTAL ORDERS", legacyOrders.length + canonicalOrders.length)}
          </div>
          <div class="housing-market-order-shell">
            <section>
              <header><p class="kicker">CANONICAL ORDERS</p><h6>${escapeHtml(activeView === "ACTIVE" ? "Active / Recovery / Refund Requests" : "Completed / Failed / Cancelled")}</h6></header>
              <div class="housing-market-order-list">
                ${visibleCanonical.map((order) => renderCanonicalHousingMarketOrderCard(order, citizen)).join("")}
                ${!visibleCanonical.length ? `<p class="file-empty">No canonical orders in this view.</p>` : ""}
              </div>
            </section>
            ${visibleLegacy.length ? `
              <section class="housing-market-legacy-orders">
                <header><p class="kicker">LEGACY DELIVERY RECORDS</p><h6>${escapeHtml(activeView === "ACTIVE" ? "Transit / Held" : "Delivered / Overflow")}</h6></header>
                <div class="housing-shipment-list is-compact">
                  ${visibleLegacy.map((row) => renderHousingShipmentRow(row.order, row.shipment, citizen)).join("")}
                </div>
              </section>
            ` : ""}
          </div>
        </section>
      `;
    }

  function renderHousingMarketCommandBar(latest = {}, activeRecord = null, unit = null, stats = {}, cartContext = {}) {
      const credits = parseCredits(latest.credits);
      const itemCount = Number(cartContext.itemCount || 0);
      const lineCount = Number(cartContext.lineCount || 0);
      const cartItemLabel = `${itemCount} ITEM${itemCount === 1 ? "" : "S"}`;
      return `
        <section class="housing-module-panel housing-market-command-bar">
          <header class="housing-module-panel-head">
            <div>
              <p class="kicker">MARKET / SHOPPING</p>
              <h5>Market</h5>
              <small class="housing-market-delivery-target">DELIVER TO: ${escapeHtml(unit ? `${activeRecord?.title || "HOUSING"} / ${unit.label}` : "NO STORAGE TARGET")}</small>
            </div>
            <div class="housing-market-command-actions">
              <span class="module-status-badge">${escapeHtml(formatCredits(credits))}</span>
              <button class="housing-inline-action housing-market-cart-toggle" type="button" data-housing-market-cart-open aria-expanded="${getHousingMarketCartOpen(latest.id) ? "true" : "false"}" aria-label="Open Market cart: ${escapeHtml(lineCount)} lines, ${escapeHtml(itemCount)} items, ${escapeHtml(formatCredits(cartContext.total || 0))}">CART ${escapeHtml(cartItemLabel)} / ${escapeHtml(formatCredits(cartContext.total || 0))}</button>
            </div>
          </header>
        </section>
      `;
    }

  function renderHousingMarketTab(citizen = {}) {
      const latest = window.WS_APP.getCitizenById?.(citizen.id) || citizen;
      const { records, activeRecord, unit } = getHousingActiveStorageTarget(latest);
      const catalogItems = getHousingMarketCatalogItems();
      const filters = getHousingMarketFilters(latest.id);
      const activeMode = getHousingMarketMode(latest.id);
      const filterOptions = getHousingMarketFilterOptions(catalogItems);
      const filteredItems = filterHousingMarketItems(catalogItems, filters, latest, unit, "CATALOG");
      const visibleItems = sortHousingMarketItems(filteredItems, filters, activeRecord, unit, "CATALOG");
      const pagination = getHousingMarketPagination(visibleItems.length, filters.page);
      if (pagination.page !== filters.page) setHousingMarketFilters(latest.id, { page: pagination.page });
      const pageItems = visibleItems.slice(pagination.startIndex, pagination.endIndex);
      const canonicalOrders = getCanonicalHousingMarketOrders(latest);
      const activeOrders = getHousingShipmentOrders(latest, "ORDERS").length + canonicalOrders.filter(isCanonicalHousingMarketOrderActive).length;
      const deliveredOrders = getHousingShipmentOrders(latest, "DELIVERED").length + canonicalOrders.filter((order) => !isCanonicalHousingMarketOrderActive(order)).length;
      const cartContext = getHousingMarketCartContext(latest.id);
      const stats = {
        total: catalogItems.length,
        visible: visibleItems.length,
        activeOrders,
        deliveredOrders
      };
      pagination.totalItems = visibleItems.length;
  
      return `
        <div class="housing-market-tab">
          ${renderHousingFeedback(latest.id)}
          ${renderHousingMarketCommandBar(latest, activeRecord, unit, stats, cartContext)}
          ${records.length > 1 ? `
            <section class="housing-module-panel housing-market-target-panel">
              <header class="housing-module-panel-head">
                <div><p class="kicker">DELIVERY TARGET</p><h5>Housing Storage Destination</h5></div>
                <span class="module-status-badge">${escapeHtml(unit ? "ACTIVE" : "NO STORAGE")}</span>
              </header>
              <div class="housing-record-selector">
                ${records.map((record) => `
                  <button class="housing-record-select ${record.id === activeRecord?.id ? "is-active" : ""}" type="button" data-housing-record-id="${escapeHtml(record.id)}">
                    <b>${escapeHtml(record.title)}</b>
                    <small>${escapeHtml(record.storageUnits[0]?.slotCapacity || 0)} SLOTS</small>
                  </button>
                `).join("")}
              </div>
            </section>
          ` : ""}
          ${renderHousingMarketModeTabs(activeMode, stats)}
          ${activeMode === "CATALOG" ? `
            ${renderHousingMarketCatalog(pageItems, latest, unit, filters, filterOptions, pagination)}
          ` : renderHousingShipmentPanel(latest, activeMode === "DELIVERED" ? "HISTORY" : "ACTIVE")}
          ${renderHousingMarketCartDrawer(latest, activeRecord, unit)}
          ${renderHousingMarketProductInspectorLayer()}
        </div>
      `;
    }

    function handleHousingMarketChange(event, context = {}) {
      const citizenId = String(context.citizenId || "").trim();
      const user = context.user || window.WS_APP.currentUser;
      const field = event?.target?.closest?.("[data-housing-market-filter-field]");
      if (!field) return false;
      const key = String(field.getAttribute("data-housing-market-filter-field") || "").trim();
      if (!key) return false;
      setHousingMarketFilters(citizenId, { [key]: String(field.value || ""), page: 1 });
      setHousingActiveTab(citizenId, "MARKET");
      setHousingFeedback(citizenId, "");
      renderHousingModule(user);
      return true;
    }

    function handleHousingMarketInput(event, context = {}) {
      const root = context.root || document.querySelector("[data-housing-module]");
      const citizenId = String(context.citizenId || "").trim();
      const user = context.user || window.WS_APP.currentUser;
      const inspectorQuantity = event?.target?.closest?.("[data-housing-market-product-inspector-quantity]");
      if (inspectorQuantity) {
        syncHousingMarketProductInspectorTotal(inspectorQuantity.closest("[data-housing-market-product-inspector]"));
        return true;
      }
      const field = event?.target?.closest?.('[data-housing-market-filter-field="search"]');
      if (!field) return false;
      window.clearTimeout(window.WS_APP.housingMarketSearchDebounce);
      window.WS_APP.housingMarketSearchDebounce = window.setTimeout(() => {
        setHousingMarketFilters(citizenId, { search: String(field.value || ""), page: 1 });
        setHousingMarketSelectedProductId(citizenId, "");
        setHousingActiveTab(citizenId, "MARKET");
        setHousingFeedback(citizenId, "");
        renderHousingModule(user);
      }, 120);
      return true;
    }

    function handleHousingMarketKeydown(event, context = {}) {
      const root = context.root || document.querySelector("[data-housing-module]");
      const citizenId = String(context.citizenId || "").trim();
      const inspectorLayer = root?.querySelector?.("[data-housing-market-product-inspector-layer]");
      const cartLayer = root?.querySelector?.("[data-housing-market-cart-layer]");
      if (event?.key === "Escape") {
        if (inspectorLayer?.classList.contains("is-open")) {
          event.preventDefault();
          closeHousingMarketProductInspector(root, citizenId);
          return true;
        }
        if (cartLayer?.classList.contains("is-open") || getHousingMarketCartOpen(citizenId)) {
          event.preventDefault();
          closeHousingMarketCart(root, citizenId);
          return true;
        }
        return false;
      }
      if (event?.key !== "Tab") return false;
      const activeLayer = inspectorLayer?.classList.contains("is-open")
        ? inspectorLayer
        : (cartLayer?.classList.contains("is-open") ? cartLayer : null);
      const dialog = activeLayer?.querySelector?.('[role="dialog"]');
      return trapHousingMarketDialogFocus(event, dialog);
    }

    function handleHousingMarketBackNavigation(context = {}) {
      const root = context.root || document.querySelector("[data-housing-module]");
      const citizenId = String(context.citizenId || "").trim();
      const user = context.user || window.WS_APP.currentUser;
      const inspectorLayer = root?.querySelector?.("[data-housing-market-product-inspector-layer]");
      if (inspectorLayer?.classList.contains("is-open")) {
        closeHousingMarketProductInspector(root, citizenId);
        return true;
      }
      const cartLayer = root?.querySelector?.("[data-housing-market-cart-layer]");
      if (cartLayer?.classList.contains("is-open") || getHousingMarketCartOpen(citizenId)) {
        closeHousingMarketCart(root, citizenId);
        return true;
      }
      if (getHousingMarketMode(citizenId) !== "CATALOG") {
        setHousingMarketMode(citizenId, "CATALOG");
        setHousingMarketOrderView(citizenId, "ACTIVE");
        setHousingSelectedMarketOrderId(citizenId, "");
        setHousingFeedback(citizenId, "");
        renderHousingModule(user);
        return true;
      }
      return false;
    }

    function handleHousingMarketClick(event, context = {}) {
      const root = context.root || document.querySelector("[data-housing-module]");
      const citizenId = String(context.citizenId || "").trim();
      const user = context.user || window.WS_APP.currentUser;
      const marketModeButton = event.target.closest?.("[data-housing-market-mode]");
      
      if (marketModeButton) {
              const nextMode = normalizeHousingMarketMode(String(marketModeButton.getAttribute("data-housing-market-mode") || "CATALOG"));
              setHousingMarketMode(citizenId, nextMode);
              setHousingMarketSelectedProductId(citizenId, "");
              if (nextMode === "ORDERS") setHousingMarketOrderView(citizenId, "ACTIVE");
              if (nextMode === "DELIVERED") setHousingMarketOrderView(citizenId, "HISTORY");
              setHousingActiveTab(citizenId, "MARKET");
              setHousingFeedback(citizenId, "");
              renderHousingModule(user);
              return true;
            }
      
      const marketOrderToggleButton = event.target.closest?.("[data-housing-market-order-toggle]");
      
      if (marketOrderToggleButton) {
              const orderId = String(marketOrderToggleButton.getAttribute("data-housing-market-order-toggle") || "");
              setHousingSelectedMarketOrderId(citizenId, getHousingSelectedMarketOrderId(citizenId) === orderId ? "" : orderId);
              setHousingActiveTab(citizenId, "MARKET");
              const currentMode = getHousingMarketMode(citizenId);
              setHousingMarketMode(citizenId, currentMode === "DELIVERED" ? "DELIVERED" : "ORDERS");
              setHousingFeedback(citizenId, "");
              renderHousingModule(user);
              return true;
            }
      
      const marketShipmentAdminDeliverButton = event.target.closest?.("[data-housing-market-shipment-admin-deliver]");
      if (marketShipmentAdminDeliverButton) {
        const shipmentId = String(marketShipmentAdminDeliverButton.getAttribute("data-housing-market-shipment-admin-deliver") || "");
        const shipment = window.WS_APP.getMarketShipment?.(shipmentId);
        const note = String(window.prompt?.("Admin debug delivery note:", "Immediate delivery for debug.") || "").trim();
        if (!note) {
          setHousingFeedback(citizenId, "Admin delivery cancelled: operator note is required.", "ERROR");
          renderHousingModule(user);
          return true;
        }
        const result = window.WS_APP.forceProcessMarketShipment?.(shipmentId, {
          actor: user,
          reason: note,
          expectedRevision: shipment?.revision,
          idempotencyKey: `admin-market-delivery:${shipmentId}:${shipment?.revision || 0}`
        }) || { ok: false, reason: "MARKET_DELIVERY_ADMIN_API_UNAVAILABLE" };
        syncHousingMarketModeToOrder(citizenId, result?.order || null, result?.ok ? "HISTORY" : "ACTIVE");
        setHousingFeedback(citizenId, result.ok ? "Shipment delivered through the canonical delivery resolver." : `Admin delivery result: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
        renderHousingModule(user);
        return true;
      }

      const marketShipmentAdminRetryButton = event.target.closest?.("[data-housing-market-shipment-admin-retry]");
      if (marketShipmentAdminRetryButton) {
        const shipmentId = String(marketShipmentAdminRetryButton.getAttribute("data-housing-market-shipment-admin-retry") || "");
        const shipment = window.WS_APP.getMarketShipment?.(shipmentId);
        const result = window.WS_APP.retryMarketShipmentDelivery?.(shipmentId, { expectedRevision: shipment?.revision, force: true }) || { ok: false, reason: "MARKET_DELIVERY_RETRY_API_UNAVAILABLE" };
        syncHousingMarketModeToOrder(citizenId, result?.order || null, result?.ok ? "HISTORY" : "ACTIVE");
        setHousingFeedback(citizenId, result.ok ? "Shipment delivery recovery completed." : `Delivery retry result: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
        renderHousingModule(user);
        return true;
      }

      const marketShipmentAdminReconcileButton = event.target.closest?.("[data-housing-market-shipment-admin-reconcile]");
      if (marketShipmentAdminReconcileButton) {
        const shipmentId = String(marketShipmentAdminReconcileButton.getAttribute("data-housing-market-shipment-admin-reconcile") || "");
        const shipment = window.WS_APP.getMarketShipment?.(shipmentId);
        const result = window.WS_APP.reconcileMarketShipment?.(shipmentId, { expectedRevision: shipment?.revision, retryHeld: true }) || { ok: false, reason: "MARKET_DELIVERY_RECONCILE_API_UNAVAILABLE" };
        syncHousingMarketModeToOrder(citizenId, result?.order || null, result?.ok ? "HISTORY" : "ACTIVE");
        setHousingFeedback(citizenId, result.ok ? "Shipment reconciliation completed." : `Shipment reconciliation result: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
        renderHousingModule(user);
        return true;
      }

      const marketOrderPickupConfirmButton = event.target.closest?.("[data-housing-market-order-pickup-confirm]");
      
      if (marketOrderPickupConfirmButton) {
              const orderId = String(marketOrderPickupConfirmButton.getAttribute("data-housing-market-order-pickup-confirm") || "");
              const order = window.WS_APP.getMarketOrder?.(orderId);
              const result = window.WS_APP.confirmMarketPickup?.(orderId, {
                expectedRevision: order?.revision,
                idempotencyKey: order?.pickupFulfillment?.completionIdempotencyKey || `market-pickup-complete:${orderId}`
              }) || { ok: false, reason: "MARKET_PICKUP_CONFIRM_API_UNAVAILABLE" };
              syncHousingMarketModeToOrder(citizenId, result?.order || null, result?.ok ? "HISTORY" : "ACTIVE");
              setHousingFeedback(citizenId, result.ok ? "Pickup confirmed. Purchased ItemInstance records moved from vendor custody to Citizen custody." : `Pickup confirmation failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const marketOrderPickupRetryButton = event.target.closest?.("[data-housing-market-order-pickup-retry]");
      
      if (marketOrderPickupRetryButton) {
              const orderId = String(marketOrderPickupRetryButton.getAttribute("data-housing-market-order-pickup-retry") || "");
              const order = window.WS_APP.getMarketOrder?.(orderId);
              const result = window.WS_APP.retryMarketPickupCompletion?.(orderId, {
                expectedRevision: order?.revision,
                idempotencyKey: order?.pickupFulfillment?.completionIdempotencyKey
              }) || { ok: false, reason: "MARKET_PICKUP_RETRY_API_UNAVAILABLE" };
              syncHousingMarketModeToOrder(citizenId, result?.order || null, result?.ok ? "HISTORY" : "ACTIVE");
              setHousingFeedback(citizenId, result.ok ? "Pickup recovery completed without duplicate ItemInstance records." : `Pickup recovery failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const marketOrderCheckoutRetryButton = event.target.closest?.("[data-housing-market-order-checkout-retry]");
      
      if (marketOrderCheckoutRetryButton) {
              const orderId = String(marketOrderCheckoutRetryButton.getAttribute("data-housing-market-order-checkout-retry") || "");
              const order = window.WS_APP.getMarketOrder?.(orderId);
              const result = window.WS_APP.retryMarketOrderCheckout?.(orderId, {
                expectedRevision: order?.revision,
                paymentSource: "CREDITS"
              }) || { ok: false, reason: "MARKET_ORDER_CHECKOUT_RETRY_API_UNAVAILABLE" };
              syncHousingMarketModeToOrder(citizenId, result?.order || null, getHousingMarketMode(citizenId) === "DELIVERED" ? "HISTORY" : "ACTIVE");
              setHousingFeedback(citizenId, result.ok ? "Market checkout resumed without creating duplicate payment or ItemInstance records." : `Checkout retry failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const marketOrderCancelRetryButton = event.target.closest?.("[data-housing-market-order-cancel-retry]");
      
      if (marketOrderCancelRetryButton) {
              const orderId = String(marketOrderCancelRetryButton.getAttribute("data-housing-market-order-cancel-retry") || "");
              const order = window.WS_APP.getMarketOrder?.(orderId);
              const result = window.WS_APP.retryMarketOrderCancellation?.(orderId, {
                expectedRevision: order?.revision,
                reasonCode: order?.cancellation?.reasonCode || "USER_REQUEST",
                idempotencyKey: `market-order-cancel-retry:${orderId}:${order?.revision || 0}`
              }) || { ok: false, reason: "MARKET_ORDER_CANCELLATION_RETRY_API_UNAVAILABLE" };
              syncHousingMarketModeToOrder(citizenId, result?.order || null, getHousingMarketMode(citizenId) === "DELIVERED" ? "HISTORY" : "ACTIVE");
              setHousingFeedback(citizenId, result.ok ? "Market order cancellation recovery completed." : `Cancellation recovery failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const marketOrderCancelButton = event.target.closest?.("[data-housing-market-order-cancel]");
      
      if (marketOrderCancelButton) {
              const orderId = String(marketOrderCancelButton.getAttribute("data-housing-market-order-cancel") || "");
              const reasonCode = String(marketOrderCancelButton.closest?.("[data-market-order-card]")?.querySelector?.("[data-housing-market-order-reason]")?.value || "USER_REQUEST");
              const order = window.WS_APP.getMarketOrder?.(orderId);
              const result = window.WS_APP.cancelMarketOrder?.(orderId, {
                reasonCode,
                expectedRevision: order?.revision,
                idempotencyKey: `market-order-cancel:${orderId}:${order?.revision || 0}`
              }) || { ok: false, reason: "MARKET_ORDER_CANCEL_API_UNAVAILABLE" };
              syncHousingMarketModeToOrder(citizenId, result?.order || null, getHousingMarketMode(citizenId) === "DELIVERED" ? "HISTORY" : "ACTIVE");
              setHousingFeedback(citizenId, result.ok ? "Market order cancelled. Reservations and pending payment were released." : `Cancellation failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const marketOrderPartialReturnRequestButton = event.target.closest?.("[data-housing-market-partial-return-request]");
      
      if (marketOrderPartialReturnRequestButton) {
              const orderId = String(marketOrderPartialReturnRequestButton.getAttribute("data-housing-market-partial-return-request") || "");
              const card = marketOrderPartialReturnRequestButton.closest?.("[data-market-order-card]");
              const instanceIds = [...(card?.querySelectorAll?.("[data-housing-market-partial-return-instance]:checked") || [])].map((input) => String(input.value || "").trim()).filter(Boolean).sort();
              if (!instanceIds.length) {
                setHousingFeedback(citizenId, "Select at least one eligible unit for partial return.", "ERROR");
                renderHousingModule(user);
                return true;
              }
              const reasonCode = String(card?.querySelector?.("[data-housing-market-order-reason]")?.value || "USER_REQUEST");
              const order = window.WS_APP.getMarketOrder?.(orderId);
              const result = window.WS_APP.requestMarketOrderPartialReturn?.(orderId, {
                instanceIds,
                reasonCode,
                expectedRevision: order?.revision,
                idempotencyKey: `market-order-partial-return-request:${orderId}:${instanceIds.join(":")}:${order?.revision || 0}`
              }) || { ok: false, reason: "MARKET_PARTIAL_RETURN_API_UNAVAILABLE" };
              syncHousingMarketModeToOrder(citizenId, result?.order || null, "ACTIVE");
              setHousingFeedback(citizenId, result.ok ? `Partial return requested for ${instanceIds.length} unit${instanceIds.length === 1 ? "" : "s"}.` : `Partial return blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const marketOrderPartialReturnExecuteButton = event.target.closest?.("[data-housing-market-partial-return-execute]");
      
      if (marketOrderPartialReturnExecuteButton) {
              const partialReturnId = String(marketOrderPartialReturnExecuteButton.getAttribute("data-housing-market-partial-return-execute") || "");
              const orderId = String(marketOrderPartialReturnExecuteButton.closest?.("[data-market-order-card]")?.getAttribute?.("data-market-order-card") || "");
              const order = window.WS_APP.getMarketOrder?.(orderId);
              const result = window.WS_APP.executeMarketOrderPartialReturn?.(orderId, partialReturnId, {
                expectedRevision: order?.revision,
                idempotencyKey: `market-order-partial-return-execute:${orderId}:${partialReturnId}:${order?.revision || 0}`
              }) || { ok: false, reason: "MARKET_PARTIAL_RETURN_EXECUTION_API_UNAVAILABLE" };
              syncHousingMarketModeToOrder(citizenId, result?.order || null, result?.order?.status === "REFUNDED" ? "HISTORY" : "ACTIVE");
              setHousingFeedback(citizenId, result.ok ? "Selected units returned and the proportional Billing refund completed." : `Partial refund failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const marketOrderPartialReturnRetryButton = event.target.closest?.("[data-housing-market-partial-return-retry]");
      
      if (marketOrderPartialReturnRetryButton) {
              const partialReturnId = String(marketOrderPartialReturnRetryButton.getAttribute("data-housing-market-partial-return-retry") || "");
              const orderId = String(marketOrderPartialReturnRetryButton.closest?.("[data-market-order-card]")?.getAttribute?.("data-market-order-card") || "");
              const order = window.WS_APP.getMarketOrder?.(orderId);
              const result = window.WS_APP.retryMarketOrderPartialReturn?.(orderId, partialReturnId, { expectedRevision: order?.revision }) || { ok: false, reason: "MARKET_PARTIAL_RETURN_RETRY_API_UNAVAILABLE" };
              syncHousingMarketModeToOrder(citizenId, result?.order || null, result?.order?.status === "REFUNDED" ? "HISTORY" : "ACTIVE");
              setHousingFeedback(citizenId, result.ok ? "Partial refund recovery completed without duplicate stock, item or Billing mutations." : `Partial refund recovery failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const marketOrderPartialReturnWithdrawButton = event.target.closest?.("[data-housing-market-partial-return-withdraw]");
      
      if (marketOrderPartialReturnWithdrawButton) {
              const partialReturnId = String(marketOrderPartialReturnWithdrawButton.getAttribute("data-housing-market-partial-return-withdraw") || "");
              const orderId = String(marketOrderPartialReturnWithdrawButton.closest?.("[data-market-order-card]")?.getAttribute?.("data-market-order-card") || "");
              const order = window.WS_APP.getMarketOrder?.(orderId);
              const result = window.WS_APP.withdrawMarketOrderPartialReturn?.(orderId, partialReturnId, {
                expectedRevision: order?.revision,
                idempotencyKey: `market-order-partial-return-withdraw:${orderId}:${partialReturnId}:${order?.revision || 0}`
              }) || { ok: false, reason: "MARKET_PARTIAL_RETURN_API_UNAVAILABLE" };
              syncHousingMarketModeToOrder(citizenId, result?.order || null, "HISTORY");
              setHousingFeedback(citizenId, result.ok ? "Partial return request withdrawn." : `Partial return update failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const marketOrderRefundButton = event.target.closest?.("[data-housing-market-order-refund]");
      
      if (marketOrderRefundButton) {
              const orderId = String(marketOrderRefundButton.getAttribute("data-housing-market-order-refund") || "");
              const reasonCode = String(marketOrderRefundButton.closest?.("[data-market-order-card]")?.querySelector?.("[data-housing-market-order-reason]")?.value || "USER_REQUEST");
              const order = window.WS_APP.getMarketOrder?.(orderId);
              const result = window.WS_APP.requestMarketOrderRefund?.(orderId, {
                reasonCode,
                expectedRevision: order?.revision,
                idempotencyKey: `market-order-refund-request:${orderId}:${order?.revision || 0}`
              }) || { ok: false, reason: "MARKET_ORDER_REFUND_API_UNAVAILABLE" };
              syncHousingMarketModeToOrder(citizenId, result?.order || null, "ACTIVE");
              setHousingFeedback(citizenId, result.ok ? "Refund request recorded. Item return and Billing refund remain pending." : `Refund request blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const marketOrderRefundExecuteButton = event.target.closest?.("[data-housing-market-order-refund-execute]");
      
      if (marketOrderRefundExecuteButton) {
              const orderId = String(marketOrderRefundExecuteButton.getAttribute("data-housing-market-order-refund-execute") || "");
              const order = window.WS_APP.getMarketOrder?.(orderId);
              const reasonCode = String(marketOrderRefundExecuteButton.closest?.("[data-market-order-card]")?.querySelector?.("[data-housing-market-order-reason]")?.value || order?.refundRequest?.reasonCode || "USER_REQUEST");
              const result = window.WS_APP.executeMarketOrderRefund?.(orderId, {
                reasonCode,
                expectedRevision: order?.revision,
                idempotencyKey: `market-order-refund-execute:${orderId}:${order?.revision || 0}`
              }) || { ok: false, reason: "MARKET_ORDER_REFUND_EXECUTION_API_UNAVAILABLE" };
              syncHousingMarketModeToOrder(citizenId, result?.order || null, getHousingMarketMode(citizenId) === "DELIVERED" ? "HISTORY" : "ACTIVE");
              setHousingFeedback(citizenId, result.ok ? "Item return and Billing refund completed through the canonical transaction boundary." : `Refund execution failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const marketOrderRefundRetryButton = event.target.closest?.("[data-housing-market-order-refund-retry]");
      
      if (marketOrderRefundRetryButton) {
              const orderId = String(marketOrderRefundRetryButton.getAttribute("data-housing-market-order-refund-retry") || "");
              const order = window.WS_APP.getMarketOrder?.(orderId);
              const result = window.WS_APP.retryMarketOrderRefund?.(orderId, {
                expectedRevision: order?.revision
              }) || { ok: false, reason: "MARKET_ORDER_REFUND_RETRY_API_UNAVAILABLE" };
              syncHousingMarketModeToOrder(citizenId, result?.order || null, getHousingMarketMode(citizenId) === "DELIVERED" ? "HISTORY" : "ACTIVE");
              setHousingFeedback(citizenId, result.ok ? "Refund recovery completed without duplicating ItemInstance or Billing records." : `Refund recovery failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const marketOrderRefundWithdrawButton = event.target.closest?.("[data-housing-market-order-refund-withdraw]");
      
      if (marketOrderRefundWithdrawButton) {
              const orderId = String(marketOrderRefundWithdrawButton.getAttribute("data-housing-market-order-refund-withdraw") || "");
              const order = window.WS_APP.getMarketOrder?.(orderId);
              const result = window.WS_APP.withdrawMarketOrderRefundRequest?.(orderId, {
                expectedRevision: order?.revision,
                idempotencyKey: `market-order-refund-withdraw:${orderId}:${order?.revision || 0}`
              }) || { ok: false, reason: "MARKET_ORDER_REFUND_API_UNAVAILABLE" };
              syncHousingMarketModeToOrder(citizenId, result?.order || null, getHousingMarketMode(citizenId) === "DELIVERED" ? "HISTORY" : "ACTIVE");
              setHousingFeedback(citizenId, result.ok ? "Refund request withdrawn." : `Refund request update failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const marketDepartmentButton = event.target.closest?.("[data-housing-market-department]");
      
      if (marketDepartmentButton) {
              setHousingMarketFilters(citizenId, {
                type: String(marketDepartmentButton.getAttribute("data-housing-market-department") || "ALL"),
                category: "ALL",
                page: 1
              });
              setHousingMarketSelectedProductId(citizenId, "");
              setHousingMarketMode(citizenId, "CATALOG");
              setHousingActiveTab(citizenId, "MARKET");
              setHousingFeedback(citizenId, "");
              renderHousingModule(user);
              return true;
            }
      
      const marketCategoryButton = event.target.closest?.("[data-housing-market-category]");
      
      if (marketCategoryButton) {
              setHousingMarketFilters(citizenId, {
                category: String(marketCategoryButton.getAttribute("data-housing-market-category") || "ALL"),
                page: 1
              });
              setHousingMarketSelectedProductId(citizenId, "");
              setHousingMarketMode(citizenId, "CATALOG");
              setHousingActiveTab(citizenId, "MARKET");
              setHousingFeedback(citizenId, "");
              renderHousingModule(user);
              return true;
            }
      
      const marketPageButton = event.target.closest?.("[data-housing-market-page]");
      
      if (marketPageButton) {
              setHousingMarketFilters(citizenId, {
                page: Number(marketPageButton.getAttribute("data-housing-market-page") || 1)
              });
              setHousingMarketSelectedProductId(citizenId, "");
              setHousingMarketMode(citizenId, "CATALOG");
              setHousingActiveTab(citizenId, "MARKET");
              setHousingFeedback(citizenId, "");
              renderHousingModule(user);
              return true;
            }
      
      const inspectorCloseButton = event.target.closest?.("[data-housing-market-product-inspector-close]");
      
      if (inspectorCloseButton) {
              closeHousingMarketProductInspector(root, citizenId);
              return true;
            }
      
      const inspectorQuantityStep = event.target.closest?.("[data-housing-market-product-inspector-quantity-step]");
      
      if (inspectorQuantityStep) {
              const scope = inspectorQuantityStep.closest?.("[data-housing-market-product-inspector]");
              const input = scope?.querySelector?.("[data-housing-market-product-inspector-quantity]");
              if (input) {
                input.value = String(Number(input.value || 1) + Number(inspectorQuantityStep.getAttribute("data-housing-market-product-inspector-quantity-step") || 0));
                syncHousingMarketProductInspectorTotal(scope);
              }
              return true;
            }
      
      const inspectorButton = event.target.closest?.("[data-housing-market-inspect]");
      
      const inspectorCard = event.target.closest?.("[data-housing-market-product-card]");
      
      const cardClick = inspectorCard && !event.target.closest?.("button, input, select, textarea, a");
      
      if (inspectorButton || cardClick) {
              const catalogId = String((inspectorButton || inspectorCard).getAttribute(inspectorButton ? "data-housing-market-inspect" : "data-housing-market-product-card") || "");
              const latestCitizen = window.WS_APP.getCitizenById?.(citizenId) || { id: citizenId };
              const { unit } = getHousingActiveStorageTarget(latestCitizen);
              openHousingMarketProductInspector(root, latestCitizen, catalogId, unit);
              return true;
            }
      
      const cartOpenButton = event.target.closest?.("[data-housing-market-cart-open]");
      
      if (cartOpenButton) {
              setHousingMarketCartOpen(citizenId, true);
              setHousingFeedback(citizenId, "");
              renderHousingModule(user);
              return true;
            }
      
      const cartCloseButton = event.target.closest?.("[data-housing-market-cart-close]");
      
      if (cartCloseButton) {
              closeHousingMarketCart(root, citizenId);
              return true;
            }
      
      const addOfferButton = event.target.closest?.("[data-housing-market-add-offer]");
      
      if (addOfferButton) {
              const latestCitizen = window.WS_APP.getCitizenById?.(citizenId) || { id: citizenId };
              const { unit } = getHousingActiveStorageTarget(latestCitizen);
              const inspector = addOfferButton.closest?.("[data-housing-market-product-inspector]");
              const quantity = Number(inspector?.querySelector?.("[data-housing-market-product-inspector-quantity]")?.value || 1);
              const result = addHousingMarketOfferToCart(latestCitizen, String(addOfferButton.getAttribute("data-housing-market-add-offer") || ""), unit, quantity);
              if (result.ok) setHousingMarketSelectedProductId(citizenId, "");
              setHousingFeedback(citizenId, result.ok ? `${clampNumber(quantity, 1, 99)} product unit${clampNumber(quantity, 1, 99) === 1 ? "" : "s"} added to Market cart draft.` : `Cart update blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const addPickupOfferButton = event.target.closest?.("[data-housing-market-add-pickup-offer]");
      
      if (addPickupOfferButton) {
              const latestCitizen = window.WS_APP.getCitizenById?.(citizenId) || { id: citizenId };
              const result = addHousingMarketOfferForPickupToCart(latestCitizen, String(addPickupOfferButton.getAttribute("data-housing-market-add-pickup-offer") || ""));
              setHousingFeedback(citizenId, result.ok ? "Offer added for vendor pickup." : `Pickup cart update blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const addServiceOfferButton = event.target.closest?.("[data-housing-market-add-service-offer]");
      
      if (addServiceOfferButton) {
              const latestCitizen = window.WS_APP.getCitizenById?.(citizenId) || { id: citizenId };
              const inspector = addServiceOfferButton.closest?.("[data-housing-market-product-inspector]");
              const quantity = Number(inspector?.querySelector?.("[data-housing-market-product-inspector-quantity]")?.value || 1);
              const result = addHousingMarketOfferWithServiceToCart(latestCitizen, String(addServiceOfferButton.getAttribute("data-housing-market-add-service-offer") || ""), quantity);
              if (result.ok) setHousingMarketSelectedProductId(citizenId, "");
              setHousingFeedback(citizenId, result.ok ? `${clampNumber(quantity, 1, 99)} product unit${clampNumber(quantity, 1, 99) === 1 ? "" : "s"} added with certified installation service.` : `Service cart update blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const cartQuantityButton = event.target.closest?.("[data-housing-market-cart-quantity]");
      
      if (cartQuantityButton) {
              const result = updateHousingMarketCartQuantity(
                citizenId,
                String(cartQuantityButton.getAttribute("data-housing-market-cart-quantity") || ""),
                Number(cartQuantityButton.getAttribute("data-quantity") || 0)
              );
              setHousingFeedback(citizenId, result.ok ? "Market cart quantity updated." : `Cart update blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const cartRemoveButton = event.target.closest?.("[data-housing-market-cart-remove]");
      
      if (cartRemoveButton) {
              const result = removeHousingMarketCartLine(citizenId, String(cartRemoveButton.getAttribute("data-housing-market-cart-remove") || ""));
              setHousingFeedback(citizenId, result.ok ? "Offer removed from Market cart draft." : `Cart update blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const cartClearButton = event.target.closest?.("[data-housing-market-cart-clear]");
      
      if (cartClearButton) {
              const result = clearHousingMarketCart(citizenId);
              setHousingFeedback(citizenId, result.ok ? "Market cart draft cleared." : `Cart update blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderHousingModule(user);
              return true;
            }
      
      const marketCheckoutButton = event.target.closest?.("[data-housing-market-checkout]");
      
      if (marketCheckoutButton) {
              const cart = getHousingMarketDraftCart(citizenId);
              const result = cart ? window.WS_APP.checkoutMarketCart?.(cart.cartId, {
                idempotencyKey: `market-checkout:${cart.cartId}:${cart.revision}`,
                paymentSource: "CREDITS"
              }) : { ok: false, reason: "MARKET_CART_NOT_FOUND" };
              if (result?.ok) {
                setHousingMarketCartOpen(citizenId, false);
                setHousingMarketOrderView(citizenId, "ACTIVE");
                setHousingMarketMode(citizenId, "ORDERS");
                const operation = String(result.operation || "").toUpperCase();
                const servicePending = ["SERVICE_PENDING", "SERVICE_PENDING_REPLAY"].includes(operation);
                const pickupReady = ["PICKUP_READY", "PICKUP_READY_REPLAY"].includes(operation);
                setHousingFeedback(
                  citizenId,
                  servicePending
                    ? `Purchase authorized: ${result.createdItemInstanceIds.length} ItemInstance in Service custody / ${result.linkedServiceOrderIds?.length || 0} Service Order scheduled.`
                    : pickupReady
                      ? `Pickup ready: ${result.createdItemInstanceIds.length} ItemInstance in vendor custody until ${result.pickupFulfillment?.expiresAt || "reservation expiry"}.`
                      : `Checkout completed: ${result.createdItemInstanceIds.length} ItemInstance record${result.createdItemInstanceIds.length === 1 ? "" : "s"}.`,
                  "OK"
                );
              } else {
                setHousingFeedback(citizenId, `Checkout failed: ${String(result?.reason || "UNKNOWN").replace(/_/g, " ")}.`, "ERROR");
              }
              renderHousingModule(user);
              return true;
            }
      
      const marketResetButton = event.target.closest?.("[data-housing-market-reset-filters]");
      
      if (marketResetButton) {
              resetHousingMarketFilters(citizenId);
              setHousingMarketSelectedProductId(citizenId, "");
              setHousingActiveTab(citizenId, "MARKET");
              setHousingFeedback(citizenId, "");
              renderHousingModule(user);
              return true;
            }
      
      const processShipmentsButton = event.target.closest?.("[data-housing-process-shipments]");
      
      if (processShipmentsButton) {
              const result = processDueHousingMarketShipmentsForCitizen(citizenId, { nowIso: getCampaignDateIso() });
              setHousingFeedback(citizenId, result.delivered || result.held ? `Processed shipments: ${result.delivered} delivered (${result.overflow || 0} overflow), ${result.held} held.` : "No due shipments for current campaign date.", result.held || result.overflow ? "WARN" : "OK");
              renderHousingModule(user);
              return true;
            }
      
      const retryShipmentButton = event.target.closest?.("[data-housing-retry-shipment]");
      
      if (retryShipmentButton) {
              retryHeldHousingShipment(citizenId, String(retryShipmentButton.getAttribute("data-housing-retry-shipment") || ""), user);
              return true;
            }
      return false;
    }

    return {
      makeHousingMarketId,
      parseVisibleAddress,
      getHousingOrganizationLocationSource,
      resolveHousingMarketVendor,
      resolveHousingShippingRoute,
      createMarketOrderAndShipment,
      normalizeHousingMarketMode,
      getHousingMarketMode,
      setHousingMarketMode,
      normalizeHousingMarketOrderView,
      getHousingMarketOrderView,
      setHousingMarketOrderView,
      syncHousingMarketModeToOrder,
      getHousingSelectedMarketOrderId,
      setHousingSelectedMarketOrderId,
      getHousingMarketSelectedProductId,
      setHousingMarketSelectedProductId,
      getDefaultHousingMarketFilters,
      normalizeHousingMarketFilters,
      getHousingMarketFilters,
      setHousingMarketFilters,
      resetHousingMarketFilters,
      normalizeEquipmentCatalogFallback,
      getHousingMarketCatalogItems,
      getHousingMarketPrice,
      getHousingMarketCatalogItemById,
      getHousingMarketItemTokens,
      hasHousingMarketItemToken,
      getHousingMarketDepartment,
      getHousingMarketSubcategory,
      getHousingMarketItemType,
      getHousingMarketItemKind,
      getHousingMarketCyberwareKind,
      getHousingMarketManufacturer,
      getHousingMarketItemTier,
      getHousingMarketItemStatus,
      getHousingMarketFilterOptions,
      getHousingMarketSearchText,
      filterHousingMarketItems,
      sortHousingMarketItems,
      getSubscriptionTierLevel,
      hasRequiredSubscription,
      isHousingMarketCyberwareItem,
      stripHousingEquipmentDerivedFields,
      buildHousingMarketItemFromCatalog,
      purchaseHousingMarketItem,
      ensureUniqueEquipmentItemId,
      resolveDeliveredShipmentItem,
      deliverHousingMarketShipment,
      processDueHousingMarketShipmentsForCitizen,
      processDueHousingMarketShipments,
      retryHeldHousingShipment,
      getHousingMarketCartOpen,
      setHousingMarketCartOpen,
      getHousingMarketDialogFocusables,
      focusHousingMarketDialog,
      trapHousingMarketDialogFocus,
      isolateHousingMarketModal,
      syncHousingMarketModalState,
      closeHousingMarketCart,
      resetHousingMarketTransientUi,
      getHousingMarketDraftCart,
      getHousingMarketCartContext,
      getHousingMarketAvailability,
      addHousingMarketOfferToCart,
      addHousingMarketOfferForPickupToCart,
      addHousingMarketOfferWithServiceToCart,
      updateHousingMarketCartQuantity,
      removeHousingMarketCartLine,
      clearHousingMarketCart,
      formatHousingMarketStoreLabel,
      renderHousingMarketModeTabs,
      renderHousingMarketDepartmentNavigation,
      renderHousingMarketCatalogToolbar,
      getHousingMarketProductFacts,
      getHousingMarketProductRestrictions,
      getHousingMarketProductCatalogId,
      getHousingMarketProductDescription,
      getHousingMarketInspectorFacts,
      getHousingMarketInspectorRequirements,
      getHousingMarketInspectorFulfillment,
      getHousingMarketInspectorQuantityMax,
      getHousingMarketProductVisual,
      renderHousingMarketInspectorRows,
      renderHousingMarketProductInspectorContent,
      renderHousingMarketProductInspectorLayer,
      syncHousingMarketProductInspectorTotal,
      openHousingMarketProductInspector,
      closeHousingMarketProductInspector,
      renderHousingMarketProductCard,
      getHousingMarketPagination,
      getHousingMarketPagerPages,
      renderHousingMarketPagination,
      renderHousingMarketCatalog,
      formatHousingMarketBlocker,
      renderHousingMarketCartDrawer,
      getHousingShipmentRows,
      getHousingShipmentOrders,
      getCanonicalHousingMarketOrders,
      isCanonicalHousingMarketOrderActive,
      getCanonicalHousingMarketOrderProductName,
      formatCanonicalMarketOrderStatus,
      renderCanonicalMarketOrderLines,
      renderCanonicalMarketPartialReturnWorkspace,
      renderCanonicalMarketOrderDetails,
      renderCanonicalHousingMarketOrderCard,
      renderHousingShipmentPanel,
      renderHousingMarketCommandBar,
      renderHousingMarketTab,
      handleHousingMarketChange,
      handleHousingMarketInput,
      handleHousingMarketKeydown,
      handleHousingMarketBackNavigation,
      handleHousingMarketClick
    };
  };
})();
