window.WS_APP = window.WS_APP || {};

(function initMarketWorkspaceRuntimeFactory() {
  window.WS_APP.createMarketWorkspaceRuntime = function createMarketWorkspaceRuntime(config = {}) {
    const {
      DEFAULT_STORAGE_UNIT_ID,
      MARKET_DEFAULT_SHIPPING_DAYS,
      MARKET_DEPARTMENTS,
      MARKET_MODES,
      MARKET_ORDER_CLOSED_STATUSES,
      MARKET_ORDER_VIEWS,
      MARKET_PAGE_SIZE,
      MARKET_SORTS,
      MARKET_STATUSES,
      MARKET_VENDOR_DEFAULTS,
      clampNumber,
      escapeHtml,
      formatCredits,
      formatIsoLabel,
      getCitizenHousingRecords,
      getEquipmentFootprintSize,
      getHousingActiveStorageTarget,
      isIsoDate,
      parseCredits,
      renderMarketFeedback,
      renderMarketMetric,
      renderMarketModule,
      rootSelector = "[data-market-module]",
      setMarketWorkspaceTab,
      setMarketFeedback,
    } = config;

    if (typeof escapeHtml !== "function" || typeof renderMarketModule !== "function" || typeof setMarketWorkspaceTab !== "function") {
      throw new Error("MARKET_WORKSPACE_RUNTIME_DEPENDENCY_MISSING");
    }

  function makeMarketWorkspaceId(prefix = "order", existing = new Set()) {
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

  function getMarketOrganizationLocationSource(locationId = "") {
      if (!locationId || typeof window.WS_APP.resolveOrganizationLocationSource !== "function") return null;
      return window.WS_APP.resolveOrganizationLocationSource(locationId);
    }

  function resolveMarketWorkspaceVendor(catalogItem = {}) {
      const category = String(catalogItem.category || "DEFAULT").trim().toUpperCase();
      const fallback = MARKET_VENDOR_DEFAULTS[category] || MARKET_VENDOR_DEFAULTS.DEFAULT;
      const organizationLocationId = String(catalogItem.organizationLocationId || catalogItem.sourceLocationId || catalogItem.facilityId || fallback.organizationLocationId || "").trim();
      const locationSource = getMarketOrganizationLocationSource(organizationLocationId);
  
      return {
        vendorId: String(catalogItem.vendorProviderId || catalogItem.providerId || catalogItem.vendorId || locationSource?.marketVendorId || fallback.vendorId || "provider-habitat-ledger").trim(),
        vendorName: String(catalogItem.vendorName || catalogItem.provider || catalogItem.manufacturer || locationSource?.locationName || "Habitat Market Fulfillment").trim(),
        organizationId: String(catalogItem.organizationId || locationSource?.organizationId || "").trim(),
        organizationLocationId,
        sourceInstitutionId: String(catalogItem.sourceInstitutionId || catalogItem.institutionId || locationSource?.sourceInstitutionId || organizationLocationId || "inst-habitat-market-local").trim(),
        sourceAddress: String(catalogItem.sourceAddress || catalogItem.vendorAddress || catalogItem.institutionAddress || locationSource?.sourceAddress || "").trim()
      };
    }

  function resolveMarketShippingRoute(sourceAddress = "", destinationAddress = "", item = {}) {
      const source = parseVisibleAddress(sourceAddress);
      const destination = parseVisibleAddress(destinationAddress);
      const legality = String(item.legality || "").trim().toUpperCase();
      const category = String(item.category || "").trim().toUpperCase();
      let days = MARKET_DEFAULT_SHIPPING_DAYS;
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

  function normalizeMarketWorkspaceMode(mode = "CATALOG") {
      const normalized = String(mode || "CATALOG").trim().toUpperCase();
      if (["ITEMS", "CYBERWARE", "CATALOG"].includes(normalized)) return "CATALOG";
      return MARKET_MODES.includes(normalized) ? normalized : "CATALOG";
    }

  function getMarketWorkspaceMode(citizenId = "") {
      window.WS_APP.marketModeByCitizen = window.WS_APP.marketModeByCitizen || {};
      return normalizeMarketWorkspaceMode(window.WS_APP.marketModeByCitizen[citizenId] || "CATALOG");
    }

  function setMarketWorkspaceMode(citizenId = "", mode = "CATALOG") {
      window.WS_APP.marketModeByCitizen = window.WS_APP.marketModeByCitizen || {};
      window.WS_APP.marketModeByCitizen[citizenId] = normalizeMarketWorkspaceMode(mode);
    }

  function normalizeMarketWorkspaceOrderView(view = "ACTIVE") {
      const normalized = String(view || "ACTIVE").trim().toUpperCase();
      return MARKET_ORDER_VIEWS.includes(normalized) ? normalized : "ACTIVE";
    }

  function getMarketWorkspaceOrderView(citizenId = "") {
      window.WS_APP.marketOrderViewByCitizen = window.WS_APP.marketOrderViewByCitizen || {};
      return normalizeMarketWorkspaceOrderView(window.WS_APP.marketOrderViewByCitizen[citizenId] || "ACTIVE");
    }

  function setMarketWorkspaceOrderView(citizenId = "", view = "ACTIVE") {
      window.WS_APP.marketOrderViewByCitizen = window.WS_APP.marketOrderViewByCitizen || {};
      window.WS_APP.marketOrderViewByCitizen[citizenId] = normalizeMarketWorkspaceOrderView(view);
    }

  function syncMarketWorkspaceModeToOrder(citizenId = "", order = null, fallbackView = "ACTIVE") {
      const view = order
        ? (isCanonicalMarketWorkspaceOrderActive(order) ? "ACTIVE" : "HISTORY")
        : normalizeMarketWorkspaceOrderView(fallbackView);
      setMarketWorkspaceOrderView(citizenId, view);
      setMarketWorkspaceMode(citizenId, view === "ACTIVE" ? "ORDERS" : "DELIVERED");
    }

  function getMarketSelectedOrderId(citizenId = "") {
      window.WS_APP.marketSelectedOrderByCitizen = window.WS_APP.marketSelectedOrderByCitizen || {};
      return String(window.WS_APP.marketSelectedOrderByCitizen[citizenId] || "").trim();
    }

  function setMarketSelectedOrderId(citizenId = "", marketOrderId = "") {
      window.WS_APP.marketSelectedOrderByCitizen = window.WS_APP.marketSelectedOrderByCitizen || {};
      window.WS_APP.marketSelectedOrderByCitizen[citizenId] = String(marketOrderId || "").trim();
    }

  function getMarketWorkspaceSelectedProductId(citizenId = "") {
      window.WS_APP.marketSelectedProductByCitizen = window.WS_APP.marketSelectedProductByCitizen || {};
      return String(window.WS_APP.marketSelectedProductByCitizen[citizenId] || "").trim();
    }

  function setMarketWorkspaceSelectedProductId(citizenId = "", catalogId = "") {
      window.WS_APP.marketSelectedProductByCitizen = window.WS_APP.marketSelectedProductByCitizen || {};
      window.WS_APP.marketSelectedProductByCitizen[citizenId] = String(catalogId || "").trim();
    }

  function getDefaultMarketWorkspaceFilters(citizenId = "") {
      const legacyCategory = String(window.WS_APP.marketCategoryByCitizen?.[citizenId] || "ALL").trim().toUpperCase() || "ALL";
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

  function normalizeMarketWorkspaceFilters(filters = {}, citizenId = "") {
      const defaults = getDefaultMarketWorkspaceFilters(citizenId);
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
  
      if (!MARKET_DEPARTMENTS.includes(normalized.type)) normalized.type = "ALL";
      if (normalized.type === "ALL") normalized.category = "ALL";
      if (!MARKET_STATUSES.includes(normalized.status)) normalized.status = "ALL";
      if (!MARKET_SORTS.includes(normalized.sort)) normalized.sort = "CATEGORY";
      if (!normalized.manufacturer) normalized.manufacturer = "ALL";
      return normalized;
    }

  function getMarketWorkspaceFilters(citizenId = "") {
      window.WS_APP.marketFiltersByCitizen = window.WS_APP.marketFiltersByCitizen || {};
      const filters = normalizeMarketWorkspaceFilters(window.WS_APP.marketFiltersByCitizen[citizenId], citizenId);
      window.WS_APP.marketFiltersByCitizen[citizenId] = filters;
      return filters;
    }

  function setMarketWorkspaceFilters(citizenId = "", patch = {}) {
      window.WS_APP.marketFiltersByCitizen = window.WS_APP.marketFiltersByCitizen || {};
      const current = getMarketWorkspaceFilters(citizenId);
      window.WS_APP.marketFiltersByCitizen[citizenId] = normalizeMarketWorkspaceFilters({ ...current, ...(patch || {}) }, citizenId);
    }

  function resetMarketWorkspaceFilters(citizenId = "") {
      window.WS_APP.marketFiltersByCitizen = window.WS_APP.marketFiltersByCitizen || {};
      window.WS_APP.marketFiltersByCitizen[citizenId] = getDefaultMarketWorkspaceFilters(citizenId);
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

  function getMarketWorkspaceCatalogItems() {
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

  function getMarketWorkspacePrice(item = {}) {
      return parseCredits(item.marketPrice ?? item.price ?? item.value ?? 0);
    }

  function getMarketWorkspaceCatalogItemById(catalogId = "") {
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

  function getMarketWorkspaceItemTokens(item = {}) {
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

  function hasMarketWorkspaceItemToken(tokens = new Set(), values = []) {
      return values.some((value) => tokens.has(value));
    }

  function getMarketWorkspaceDepartment(item = {}) {
      const explicit = String(item.marketDepartment || item.department || "").trim().toUpperCase();
      if (MARKET_DEPARTMENTS.includes(explicit) && explicit !== "ALL") return explicit;
      if (isMarketWorkspaceCyberwareItem(item)) return "CYBERWARE";
  
      const tokens = getMarketWorkspaceItemTokens(item);
      if (hasMarketWorkspaceItemToken(tokens, ["MEDICAL", "MEDICINE", "PHARMA", "PHARMACEUTICAL", "DRUG", "STIMULANT", "SUPPRESSANT", "TRAUMA_CARE", "FIRST_AID"])) return "MEDICAL";
      if (hasMarketWorkspaceItemToken(tokens, ["FOOD", "MEAL", "RATIONS", "RATION", "DRINK", "BEVERAGE", "NUTRITION", "EDIBLE"])) return "FOOD";
      if (hasMarketWorkspaceItemToken(tokens, ["HOUSEHOLD", "HYGIENE", "CLEANING", "DOMESTIC", "HABITAT_SUPPLY", "HOME_GOODS"])) return "HOUSEHOLD";
      return "EQUIPMENT";
    }

  function getMarketWorkspaceSubcategory(item = {}) {
      const explicit = String(item.marketSubcategory || item.storeCategory || "").trim().toUpperCase();
      if (explicit) return explicit;
      const department = getMarketWorkspaceDepartment(item);
      const tokens = getMarketWorkspaceItemTokens(item);
      const subtype = String(item.subtype || item.itemType || "").trim().toUpperCase();
      const category = String(item.category || "").trim().toUpperCase();
  
      if (department === "CYBERWARE") return getMarketWorkspaceCyberwareKind(item);
      if (department === "MEDICAL") {
        if (hasMarketWorkspaceItemToken(tokens, ["STIMULANT"])) return "STIMULANTS";
        if (hasMarketWorkspaceItemToken(tokens, ["SUPPRESSANT"])) return "SUPPRESSANTS";
        if (hasMarketWorkspaceItemToken(tokens, ["TRAUMA_CARE", "FIRST_AID"])) return "TRAUMA_CARE";
        if (subtype.includes("KIT") || tokens.has("MEDICAL_KIT")) return "MEDICAL_KITS";
        if (hasMarketWorkspaceItemToken(tokens, ["MEDICINE", "PHARMA", "PHARMACEUTICAL", "DRUG"])) return "MEDICINE";
        return subtype || "MEDICAL_SUPPLIES";
      }
      if (department === "FOOD") {
        if (hasMarketWorkspaceItemToken(tokens, ["DRINK", "BEVERAGE"])) return "DRINKS";
        if (hasMarketWorkspaceItemToken(tokens, ["RATION", "RATIONS"])) return "RATIONS";
        if (hasMarketWorkspaceItemToken(tokens, ["MEAL"])) return "MEALS";
        if (hasMarketWorkspaceItemToken(tokens, ["NUTRITION", "SUPPLEMENT"])) return "SUPPLEMENTS";
        return subtype || "FOOD";
      }
      if (department === "HOUSEHOLD") {
        if (tokens.has("HYGIENE")) return "HYGIENE";
        if (tokens.has("CLEANING")) return "CLEANING";
        if (hasMarketWorkspaceItemToken(tokens, ["UTILITY", "HABITAT_SUPPLY"])) return "UTILITY_SUPPLIES";
        return subtype || "HOUSEHOLD_GOODS";
      }
      return category || subtype || "MISC";
    }

  function getMarketWorkspaceItemType(item = {}) {
      return getMarketWorkspaceDepartment(item);
    }

  function getMarketWorkspaceItemKind(item = {}) {
      return getMarketWorkspaceSubcategory(item);
    }

  function getMarketWorkspaceCyberwareKind(item = {}) {
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

  function getMarketWorkspaceManufacturer(item = {}) {
      return String(item.manufacturer || item.provider || item.vendorName || "UNSPECIFIED").trim() || "UNSPECIFIED";
    }

  function getMarketWorkspaceItemTier(item = {}) {
      return clampNumber(item.tier ?? item.neurochipTier ?? item.interfaceTier ?? item.servicePortTier ?? item.capacityTier ?? 0, 0, 99);
    }

  function getMarketWorkspaceItemStatus(item = {}, citizen = {}, unit = null) {
      const price = getMarketWorkspacePrice(item);
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

  function getMarketWorkspaceFilterOptions(items = []) {
      const departments = MARKET_DEPARTMENTS.map((department) => ({
        id: department,
        count: department === "ALL" ? items.length : items.filter((item) => getMarketWorkspaceDepartment(item) === department).length
      }));
      const subcategoriesByDepartment = Object.fromEntries(MARKET_DEPARTMENTS
        .filter((department) => department !== "ALL")
        .map((department) => {
          const departmentItems = items.filter((item) => getMarketWorkspaceDepartment(item) === department);
          const subcategories = Array.from(new Set(departmentItems.map(getMarketWorkspaceSubcategory).filter(Boolean)))
            .sort((a, b) => a.localeCompare(b))
            .map((subcategory) => ({
              id: subcategory,
              count: departmentItems.filter((item) => getMarketWorkspaceSubcategory(item) === subcategory).length
            }));
          return [department, subcategories];
        }));
      return { departments, subcategoriesByDepartment };
    }

  function getMarketWorkspaceSearchText(item = {}) {
      return [
        item.name,
        item.category,
        item.subtype,
        item.legality,
        item.grade,
        item.scale,
        getMarketWorkspaceManufacturer(item),
        item.notes,
        ...(Array.isArray(item.tags) ? item.tags : []),
        ...(Array.isArray(item.specialFeatures) ? item.specialFeatures : [])
      ].map((part) => String(part || "").toUpperCase()).join(" ");
    }

  function filterMarketWorkspaceItems(items = [], filters = {}, citizen = {}, unit = null, mode = "CATALOG") {
      const normalized = normalizeMarketWorkspaceFilters(filters, citizen.id);
      const search = normalized.search.toUpperCase();
      return items.filter((item) => {
        const department = getMarketWorkspaceDepartment(item);
        if (normalized.type !== "ALL" && department !== normalized.type) return false;
        if (normalized.category !== "ALL" && getMarketWorkspaceSubcategory(item) !== normalized.category) return false;
        if (search && !getMarketWorkspaceSearchText(item).includes(search)) return false;
        return true;
      });
    }

  function sortMarketWorkspaceItems(items = [], filters = {}, activeRecord = null, unit = null, mode = "ITEMS") {
      const normalizedMode = normalizeMarketWorkspaceMode(mode);
      const sort = normalizeMarketWorkspaceFilters(filters).sort;
      const destinationAddress = String(activeRecord?.visibleAddress || "").trim();
      const etaDays = (item) => unit ? resolveMarketShippingRoute(resolveMarketWorkspaceVendor(item).sourceAddress, destinationAddress, item).days : 999;
      const compareName = (a, b) => String(a.name || "").localeCompare(String(b.name || ""));
      const compareKind = (a, b) => getMarketWorkspaceItemKind(a).localeCompare(getMarketWorkspaceItemKind(b)) || getMarketWorkspaceItemTier(a) - getMarketWorkspaceItemTier(b) || compareName(a, b);
      const compareCategory = (a, b) => getMarketWorkspaceDepartment(a).localeCompare(getMarketWorkspaceDepartment(b)) || getMarketWorkspaceSubcategory(a).localeCompare(getMarketWorkspaceSubcategory(b)) || getMarketWorkspaceItemTier(a) - getMarketWorkspaceItemTier(b) || compareName(a, b);
      const fallbackCompare = normalizedMode === "CYBERWARE" ? compareKind : compareCategory;
  
      return [...items].sort((a, b) => {
        if (sort === "NAME") return compareName(a, b);
        if (sort === "PRICE_ASC") return getMarketWorkspacePrice(a) - getMarketWorkspacePrice(b) || compareName(a, b);
        if (sort === "PRICE_DESC") return getMarketWorkspacePrice(b) - getMarketWorkspacePrice(a) || compareName(a, b);
        if (sort === "TIER_ASC") return getMarketWorkspaceItemTier(a) - getMarketWorkspaceItemTier(b) || fallbackCompare(a, b);
        if (sort === "TIER_DESC") return getMarketWorkspaceItemTier(b) - getMarketWorkspaceItemTier(a) || fallbackCompare(a, b);
        if (sort === "ETA_ASC") return etaDays(a) - etaDays(b) || fallbackCompare(a, b);
        if (sort === "ETA_DESC") return etaDays(b) - etaDays(a) || fallbackCompare(a, b);
        if (sort === "MANUFACTURER") return getMarketWorkspaceManufacturer(a).localeCompare(getMarketWorkspaceManufacturer(b)) || fallbackCompare(a, b);
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

  function isMarketWorkspaceCyberwareItem(item = {}) {
      const category = String(item.category || "").trim().toUpperCase();
      const subtype = String(item.subtype || "").trim().toUpperCase();
      const tags = Array.isArray(item.tags) ? item.tags.map((tag) => String(tag || "").trim().toUpperCase()) : [];
      return item.cyberwareCandidate === true || category === "CYBERWARE" || ["IMPLANT", "BIOWARE", "NEUROCHIP", "INTERFACE", "SERVICE_PORT"].includes(subtype) || tags.includes("CYBERWARE");
    }

  function getMarketWorkspaceCartOpen(citizenId = "") {
      window.WS_APP.marketCartOpenByCitizen = window.WS_APP.marketCartOpenByCitizen || {};
      return window.WS_APP.marketCartOpenByCitizen[citizenId] === true;
    }

  function setMarketWorkspaceCartOpen(citizenId = "", open = false) {
      window.WS_APP.marketCartOpenByCitizen = window.WS_APP.marketCartOpenByCitizen || {};
      window.WS_APP.marketCartOpenByCitizen[citizenId] = open === true;
    }

  function getMarketWorkspaceWishlistOpen(citizenId = "") {
      window.WS_APP.marketWishlistOpenByCitizen = window.WS_APP.marketWishlistOpenByCitizen || {};
      return window.WS_APP.marketWishlistOpenByCitizen[citizenId] === true;
    }

  function setMarketWorkspaceWishlistOpen(citizenId = "", open = false) {
      window.WS_APP.marketWishlistOpenByCitizen = window.WS_APP.marketWishlistOpenByCitizen || {};
      window.WS_APP.marketWishlistOpenByCitizen[citizenId] = open === true;
    }

  function getMarketWorkspaceActiveWishlistId(citizenId = "") {
      window.WS_APP.marketActiveWishlistIdByCitizen = window.WS_APP.marketActiveWishlistIdByCitizen || {};
      const lists = window.WS_APP.getCitizenMarketWishlists?.(citizenId) || [];
      const requested = String(window.WS_APP.marketActiveWishlistIdByCitizen[citizenId] || "").trim();
      return lists.some((wishlist) => wishlist.wishlistId === requested)
        ? requested
        : String(lists[0]?.wishlistId || "");
    }

  function setMarketWorkspaceActiveWishlistId(citizenId = "", wishlistId = "") {
      window.WS_APP.marketActiveWishlistIdByCitizen = window.WS_APP.marketActiveWishlistIdByCitizen || {};
      window.WS_APP.marketActiveWishlistIdByCitizen[citizenId] = String(wishlistId || "").trim();
    }

  function getMarketWorkspacePendingWishlistItem(citizenId = "") {
      window.WS_APP.marketPendingWishlistItemByCitizen = window.WS_APP.marketPendingWishlistItemByCitizen || {};
      const value = window.WS_APP.marketPendingWishlistItemByCitizen[citizenId];
      return value && typeof value === "object" ? value : null;
    }

  function setMarketWorkspacePendingWishlistItem(citizenId = "", value = null) {
      window.WS_APP.marketPendingWishlistItemByCitizen = window.WS_APP.marketPendingWishlistItemByCitizen || {};
      if (!value) {
        delete window.WS_APP.marketPendingWishlistItemByCitizen[citizenId];
        return;
      }
      window.WS_APP.marketPendingWishlistItemByCitizen[citizenId] = {
        marketOfferId: String(value.marketOfferId || "").trim(),
        quantity: clampNumber(value.quantity || 1, 1, 99)
      };
    }

  const MARKET_DIALOG_FOCUSABLE_SELECTOR = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])'
    ].join(",");

  function getMarketWorkspaceDialogFocusables(dialog = null) {
      return [...(dialog?.querySelectorAll?.(MARKET_DIALOG_FOCUSABLE_SELECTOR) || [])]
        .filter((node) => node?.getAttribute?.("aria-hidden") !== "true" && !node?.hasAttribute?.("inert"));
    }

  function focusMarketWorkspaceDialog(dialog = null, preferredSelector = "") {
      if (!dialog) return false;
      const preferred = preferredSelector ? dialog.querySelector?.(preferredSelector) : null;
      const target = preferred || getMarketWorkspaceDialogFocusables(dialog)[0] || dialog;
      window.requestAnimationFrame?.(() => target?.focus?.({ preventScroll: true }));
      return true;
    }

  function trapMarketWorkspaceDialogFocus(event = null, dialog = null) {
      if (event?.key !== "Tab" || !dialog) return false;
      const focusables = getMarketWorkspaceDialogFocusables(dialog);
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

  function isolateMarketWorkspaceModal(root = null, activeLayer = null) {
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
      document.documentElement?.classList?.toggle?.("housing-market-modal-open", Boolean(activeLayer));
      document.body?.classList?.toggle?.("housing-market-modal-open", Boolean(activeLayer));
    }

  function syncMarketWorkspaceModalState(root = null, citizenId = "", options = {}) {
      const inspectorLayer = root?.querySelector?.("[data-housing-market-product-inspector-layer]");
      const wishlistLayer = root?.querySelector?.("[data-housing-market-wishlist-layer]");
      const cartLayer = root?.querySelector?.("[data-housing-market-cart-layer]");
      const inspectorOpen = Boolean(inspectorLayer?.classList?.contains("is-open"));
      const wishlistOpen = Boolean(getMarketWorkspaceWishlistOpen(citizenId) && wishlistLayer);
      const cartOpen = Boolean(getMarketWorkspaceCartOpen(citizenId) && cartLayer);
      if (wishlistLayer) {
        wishlistLayer.classList.toggle("is-open", wishlistOpen);
        wishlistLayer.setAttribute("aria-hidden", wishlistOpen ? "false" : "true");
      }
      if (cartLayer) {
        cartLayer.classList.toggle("is-open", cartOpen);
        cartLayer.setAttribute("aria-hidden", cartOpen ? "false" : "true");
      }
      const activeLayer = inspectorOpen ? inspectorLayer : (wishlistOpen ? wishlistLayer : (cartOpen ? cartLayer : null));
      isolateMarketWorkspaceModal(root, activeLayer);
      if (activeLayer && options.focus !== false) {
        const dialog = activeLayer.querySelector?.('[role="dialog"]');
        if (dialog && !dialog.contains?.(document.activeElement)) {
          focusMarketWorkspaceDialog(dialog, "[data-housing-market-product-inspector-close], [data-housing-market-wishlist-close], [data-housing-market-cart-close]");
        }
      }
      return Boolean(activeLayer);
    }

  function closeMarketWorkspaceCart(root = null, citizenId = "", options = {}) {
      const layer = root?.querySelector?.("[data-housing-market-cart-layer]");
      setMarketWorkspaceCartOpen(citizenId, false);
      layer?.classList?.remove("is-open");
      layer?.setAttribute?.("aria-hidden", "true");
      syncMarketWorkspaceModalState(root, citizenId, { focus: false });
      if (options.restoreFocus !== false) {
        const trigger = root?.querySelector?.("[data-housing-market-cart-open]");
        window.requestAnimationFrame?.(() => trigger?.focus?.({ preventScroll: true }));
      }
      return true;
    }

  function closeMarketWorkspaceWishlist(root = null, citizenId = "", options = {}) {
      const layer = root?.querySelector?.("[data-housing-market-wishlist-layer]");
      setMarketWorkspaceWishlistOpen(citizenId, false);
      setMarketWorkspacePendingWishlistItem(citizenId, null);
      layer?.classList?.remove("is-open");
      layer?.setAttribute?.("aria-hidden", "true");
      syncMarketWorkspaceModalState(root, citizenId, { focus: false });
      if (options.restoreFocus !== false) {
        const trigger = root?.querySelector?.("[data-housing-market-wishlist-open]");
        window.requestAnimationFrame?.(() => trigger?.focus?.({ preventScroll: true }));
      }
      return true;
    }

  function resetMarketWorkspaceTransientUi(root = null, citizenId = "") {
      setMarketWorkspaceCartOpen(citizenId, false);
      setMarketWorkspaceWishlistOpen(citizenId, false);
      setMarketWorkspacePendingWishlistItem(citizenId, null);
      setMarketWorkspaceSelectedProductId(citizenId, "");
      const cartLayer = root?.querySelector?.("[data-housing-market-cart-layer]");
      const wishlistLayer = root?.querySelector?.("[data-housing-market-wishlist-layer]");
      const inspectorLayer = root?.querySelector?.("[data-housing-market-product-inspector-layer]");
      [cartLayer, wishlistLayer, inspectorLayer].forEach((layer) => {
        layer?.classList?.remove("is-open");
        layer?.setAttribute?.("aria-hidden", "true");
      });
      isolateMarketWorkspaceModal(root, null);
    }

  function getMarketWorkspaceDraftCart(citizenId = "") {
      const carts = window.WS_APP.getCitizenMarketCarts?.(citizenId) || [];
      return carts.find((cart) => String(cart.status || "").toUpperCase() === "DRAFT") || null;
    }

  function getMarketWorkspaceCartContext(citizenId = "") {
      const cart = getMarketWorkspaceDraftCart(citizenId);
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

  function getMarketWorkspaceAvailability(item = {}) {
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

  function addMarketWorkspaceOfferToCart(citizen = {}, marketOfferId = "", unit = null, quantity = 1) {
      const offerId = String(marketOfferId || "").trim();
      if (!offerId) return { ok: false, reason: "MARKET_OFFER_ID_REQUIRED" };
      if (!unit?.id) return { ok: false, reason: "HOUSING_DESTINATION_REQUIRED" };
      const existing = getMarketWorkspaceDraftCart(citizen.id);
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
      if (result.ok) setMarketWorkspaceCartOpen(citizen.id, true);
      return result;
    }

  function addMarketWorkspaceOfferForPickupToCart(citizen = {}, marketOfferId = "", quantity = 1) {
      const offerId = String(marketOfferId || "").trim();
      if (!offerId) return { ok: false, reason: "MARKET_OFFER_ID_REQUIRED" };
      const offer = window.WS_APP.getMarketOffer?.(offerId) || null;
      if (!offer) return { ok: false, reason: "MARKET_OFFER_NOT_FOUND" };
      if (!Array.isArray(offer.fulfillmentOptions) || !offer.fulfillmentOptions.includes("PICKUP")) {
        return { ok: false, reason: "PICKUP_NOT_AVAILABLE" };
      }
      if (!offer.organizationLocationId) return { ok: false, reason: "PICKUP_LOCATION_REQUIRED" };
      const existing = getMarketWorkspaceDraftCart(citizen.id);
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
      if (result.ok) setMarketWorkspaceCartOpen(citizen.id, true);
      return result;
    }

  function addMarketWorkspaceOfferWithServiceToCart(citizen = {}, marketOfferId = "", quantity = 1) {
      const offerId = String(marketOfferId || "").trim();
      if (!offerId) return { ok: false, reason: "MARKET_OFFER_ID_REQUIRED" };
      const offer = window.WS_APP.getMarketOffer?.(offerId) || null;
      if (!offer) return { ok: false, reason: "MARKET_OFFER_NOT_FOUND" };
      if (!Array.isArray(offer.fulfillmentOptions) || !offer.fulfillmentOptions.includes("PURCHASE_WITH_SERVICE")) {
        return { ok: false, reason: "PURCHASE_WITH_SERVICE_NOT_AVAILABLE" };
      }
      const existing = getMarketWorkspaceDraftCart(citizen.id);
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
      if (result.ok) setMarketWorkspaceCartOpen(citizen.id, true);
      return result;
    }

  function updateMarketWorkspaceCartQuantity(citizenId = "", cartLineId = "", quantity = 0) {
      const cart = getMarketWorkspaceDraftCart(citizenId);
      if (!cart) return { ok: false, reason: "MARKET_CART_NOT_FOUND" };
      return window.WS_APP.updateMarketCart?.(cart.cartId, {
        setQuantity: { cartLineId, quantity }
      }) || { ok: false, reason: "MARKET_CART_API_UNAVAILABLE" };
    }

  function removeMarketWorkspaceCartLine(citizenId = "", cartLineId = "") {
      const cart = getMarketWorkspaceDraftCart(citizenId);
      if (!cart) return { ok: false, reason: "MARKET_CART_NOT_FOUND" };
      return window.WS_APP.updateMarketCart?.(cart.cartId, { removeLineId: cartLineId }) || { ok: false, reason: "MARKET_CART_API_UNAVAILABLE" };
    }

  function clearMarketWorkspaceCart(citizenId = "") {
      const cart = getMarketWorkspaceDraftCart(citizenId);
      if (!cart) return { ok: true, reason: "MARKET_CART_ALREADY_EMPTY" };
      return window.WS_APP.updateMarketCart?.(cart.cartId, { clear: true }) || { ok: false, reason: "MARKET_CART_API_UNAVAILABLE" };
    }

  function formatMarketWorkspaceStoreLabel(value = "") {
      return String(value || "").trim().replace(/_/g, " ") || "OTHER";
    }

  function renderMarketWorkspaceModeTabs(activeMode = "CATALOG", stats = {}) {
      const modes = [
        { id: "CATALOG", label: "CATALOG", meta: `${stats.total || 0} PRODUCTS` },
        { id: "SECONDARY", label: "SECONDARY", meta: `${stats.secondaryActive || 0} ACTIVE` },
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


  function renderMarketSecondaryListingCard(listing = {}) {
      const item = listing.item || {};
      const referencePrice = Number(listing.catalogReferencePrice || 0);
      const listedPrice = Number(listing.listedPrice || 0);
      const difference = listedPrice - referencePrice;
      const differencePercent = referencePrice > 0 ? Math.round((difference / referencePrice) * 100) : 0;
      const differenceLabel = `${difference > 0 ? "+" : ""}${formatCredits(difference)} / ${differencePercent > 0 ? "+" : ""}${differencePercent}%`;
      const note = String(item.shortDescription || item.description || "Used physical item listed through the secondary exchange.").trim();
      return `
        <article class="housing-market-product-card" data-market-secondary-listing="${escapeHtml(listing.listingId)}">
          <div class="housing-market-product-head">
            <div>
              <p class="kicker">SECONDARY / ${escapeHtml(formatMarketWorkspaceStoreLabel(listing.subtype || item.subtype || "USED ITEM"))}</p>
              <h5>${escapeHtml(listing.name || item.name || listing.definitionId)}</h5>
              <small>${escapeHtml(listing.sellerRef?.displayName || "SECONDARY EXCHANGE")}</small>
            </div>
            <span class="module-status-badge">${escapeHtml(formatMarketWorkspaceStoreLabel(listing.interestLabel || "MODERATE"))} INTEREST</span>
          </div>
          <p class="housing-market-product-note">${escapeHtml(note)}</p>
          <div class="housing-market-product-facts">
            <span><small>CONDITION</small><b>${escapeHtml(listing.conditionSnapshot)}%</b></span>
            <span><small>CATALOG</small><b>${escapeHtml(formatCredits(referencePrice))}</b></span>
            <span><small>DIFFERENCE</small><b>${escapeHtml(differenceLabel)}</b></span>
            <span><small>EXPIRES</small><b>${escapeHtml(formatIsoLabel(listing.expiresAt))}</b></span>
          </div>
          <div class="housing-market-product-tags">
            <span>${escapeHtml(formatMarketWorkspaceStoreLabel(listing.pricingStrategy || "FIXED"))}</span>
            <span>${escapeHtml(formatMarketWorkspaceStoreLabel(listing.status || "ACTIVE"))}</span>
            <span>STOCK 1</span>
          </div>
          <div class="housing-market-product-buy-row">
            <div class="housing-market-product-price"><small>LISTED PRICE</small><b>${escapeHtml(formatCredits(listedPrice))}</b><span>EXPECTED USED ${escapeHtml(formatCredits(listing.expectedUsedValue || 0))}</span></div>
            <div class="housing-market-product-actions" aria-label="Secondary listing actions">
              <button class="housing-inline-action housing-market-action-primary" type="button" disabled title="Secondary fulfillment is introduced in patch 7.1x">PURCHASE LOCKED</button>
            </div>
          </div>
        </article>
      `;
    }

  function renderMarketSecondaryWorkspace(listings = []) {
      return `
        <section class="housing-module-panel housing-market-catalog-panel">
          <header class="housing-market-catalog-head">
            <div><p class="kicker">SECONDARY EXCHANGE</p><h5>Used Listings</h5></div>
            <div><span class="module-status-badge">${escapeHtml(listings.length)} ACTIVE</span><small>CAMPAIGN TIME SCHEDULED</small></div>
          </header>
          <p class="housing-storage-note">System-generated listings use exact Campaign Time for demand checks, automatic price reviews and expiry. Player purchase remains disabled until the canonical secondary fulfillment patch.</p>
          <div class="housing-market-card-grid">
            ${listings.length
              ? listings.map((listing) => renderMarketSecondaryListingCard(listing)).join("")
              : `<p class="file-empty">No active secondary listings are available at the current Campaign Time.</p>`}
          </div>
        </section>
      `;
    }

  function renderMarketWorkspaceDepartmentNavigation(filters = {}, options = {}) {
      const departments = Array.isArray(options.departments) ? options.departments : [];
      const activeDepartment = MARKET_DEPARTMENTS.includes(filters.type) ? filters.type : "ALL";
      const subcategories = activeDepartment === "ALL"
        ? []
        : (options.subcategoriesByDepartment?.[activeDepartment] || []);
      return `
        <aside class="housing-market-department-nav" aria-label="Market departments">
          <p class="kicker">DEPARTMENTS</p>
          <div class="housing-market-department-list">
            ${departments.map((department) => `
              <button class="housing-market-department ${activeDepartment === department.id ? "is-active" : ""}" type="button" data-housing-market-department="${escapeHtml(department.id)}">
                <b>${escapeHtml(formatMarketWorkspaceStoreLabel(department.id))}</b>
                <small>${escapeHtml(department.count || 0)}</small>
              </button>
            `).join("")}
          </div>
          ${subcategories.length ? `
            <div class="housing-market-subcategory-list">
              <p class="kicker">${escapeHtml(formatMarketWorkspaceStoreLabel(activeDepartment))}</p>
              <button class="housing-market-subcategory ${filters.category === "ALL" ? "is-active" : ""}" type="button" data-housing-market-category="ALL">
                <b>ALL ${escapeHtml(formatMarketWorkspaceStoreLabel(activeDepartment))}</b>
                <small>${escapeHtml(departments.find((entry) => entry.id === activeDepartment)?.count || 0)}</small>
              </button>
              ${subcategories.map((subcategory) => `
                <button class="housing-market-subcategory ${filters.category === subcategory.id ? "is-active" : ""}" type="button" data-housing-market-category="${escapeHtml(subcategory.id)}">
                  <b>${escapeHtml(formatMarketWorkspaceStoreLabel(subcategory.id))}</b>
                  <small>${escapeHtml(subcategory.count || 0)}</small>
                </button>
              `).join("")}
            </div>
          ` : ""}
        </aside>
      `;
    }

  function renderMarketWorkspaceCatalogToolbar(filters = {}, visibleCount = 0) {
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

  function getMarketWorkspaceProductFacts(item = {}) {
      const department = getMarketWorkspaceDepartment(item);
      const kind = getMarketWorkspaceItemKind(item);
      const tier = getMarketWorkspaceItemTier(item);
      const profile = item.consumableProfile && typeof item.consumableProfile === "object" ? item.consumableProfile : {};
      const packageQuantity = profile.packageQuantity ?? item.packageQuantity ?? item.quantityPerPackage ?? item.unitsPerPackage;
      const facts = [];
      const add = (label, value) => {
        const normalized = String(value ?? "").trim();
        if (normalized && normalized !== "0") facts.push({ label, value: normalized });
      };
  
      if (department === "CYBERWARE") {
        add("Class", tier ? `${formatMarketWorkspaceStoreLabel(kind)} / T${tier}` : formatMarketWorkspaceStoreLabel(kind));
        add("Format", item.scale || item.grade || item.footprint || "STANDARD");
      } else if (department === "MEDICAL") {
        add("Dose", profile.dose || item.dose || item.dosage || item.doseLabel);
        add("Package", packageQuantity ? `${packageQuantity} UNIT${Number(packageQuantity) === 1 ? "" : "S"}` : profile.packageLabel || item.packageLabel || formatMarketWorkspaceStoreLabel(kind));
        add("Duration", profile.duration || item.duration || item.effectDuration);
      } else if (department === "FOOD") {
        add("Package", packageQuantity ? `${packageQuantity} UNIT${Number(packageQuantity) === 1 ? "" : "S"}` : (profile.mealUnits || item.mealUnits) ? `${profile.mealUnits || item.mealUnits} MEALS` : formatMarketWorkspaceStoreLabel(kind));
        add("Class", profile.rationClass || item.rationClass || profile.quality || item.quality || item.grade || profile.shelfLife || item.shelfLife);
      } else if (department === "HOUSEHOLD") {
        add("Type", formatMarketWorkspaceStoreLabel(kind));
        add("Package", packageQuantity ? `${packageQuantity} UNIT${Number(packageQuantity) === 1 ? "" : "S"}` : profile.packageLabel || item.packageLabel || item.footprint);
      } else {
        add("Class", `${formatMarketWorkspaceStoreLabel(item.category || department)} / ${formatMarketWorkspaceStoreLabel(item.subtype || kind)}`);
        add("Footprint", item.footprint || (item.width && item.height ? `${item.width}x${item.height}` : ""));
      }
  
      return facts.slice(0, 2);
    }

  function getMarketWorkspaceProductRestrictions(item = {}, availability = {}) {
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

  function getMarketWorkspaceProductCatalogId(item = {}) {
      return String(item.catalogId || item.id || item.marketOfferId || "").trim();
    }

  function getMarketWorkspaceProductDescription(item = {}) {
      const feature = Array.isArray(item.specialFeatures) ? item.specialFeatures.find(Boolean) : "";
      return String(item.description || item.longDescription || item.shortDescription || item.notes || feature || "Product available through the indexed Market offer.").trim();
    }

  function getMarketWorkspaceInspectorFacts(item = {}) {
      const department = getMarketWorkspaceDepartment(item);
      const kind = getMarketWorkspaceItemKind(item);
      const tier = getMarketWorkspaceItemTier(item);
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
        add("System", formatMarketWorkspaceStoreLabel(kind));
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
        add("Product type", formatMarketWorkspaceStoreLabel(kind));
        add("Dose", profile.dose || item.dose || item.dosage || item.doseLabel);
        add("Package", packageQuantity ? `${packageQuantity} UNIT${Number(packageQuantity) === 1 ? "" : "S"}` : profile.packageLabel || item.packageLabel);
        add("Duration", profile.duration || item.duration || item.effectDuration);
        add("Shelf life", profile.shelfLife || item.shelfLife);
        add("Quality", profile.quality || item.quality || item.grade);
      } else if (department === "FOOD") {
        add("Product type", formatMarketWorkspaceStoreLabel(kind));
        add("Package", packageQuantity ? `${packageQuantity} UNIT${Number(packageQuantity) === 1 ? "" : "S"}` : profile.packageLabel || item.packageLabel);
        add("Meal units", profile.mealUnits || item.mealUnits);
        add("Ration class", profile.rationClass || item.rationClass);
        add("Dose / serving", profile.dose || item.dose || item.servingSize);
        add("Quality", profile.quality || item.quality || item.grade);
        add("Shelf life", profile.shelfLife || item.shelfLife);
      } else if (department === "HOUSEHOLD") {
        add("Product type", formatMarketWorkspaceStoreLabel(kind));
        add("Package", packageQuantity ? `${packageQuantity} UNIT${Number(packageQuantity) === 1 ? "" : "S"}` : profile.packageLabel || item.packageLabel);
        add("Quality", profile.quality || item.quality || item.grade);
        add("Shelf life", profile.shelfLife || item.shelfLife);
        add("Footprint", item.footprint || (item.width && item.height ? `${item.width}x${item.height}` : ""));
      } else {
        add("Category", formatMarketWorkspaceStoreLabel(item.category || department));
        add("Type", formatMarketWorkspaceStoreLabel(item.subtype || kind));
        add("Footprint", item.footprint || (item.width && item.height ? `${item.width}x${item.height}` : ""));
        add("Grade", item.grade || item.quality);
        add("Hands", equipProfile.handsRequired);
        add("Equip layer", equipProfile.layer);
        add("Capacity", item.capacitySlots ? `${item.capacitySlots} SLOTS` : item.capacityTier ? `T${item.capacityTier}` : "");
      }
  
      return facts;
    }

  function getMarketWorkspaceInspectorRequirements(item = {}, citizen = {}) {
      const requirements = item.purchaseRequirements && typeof item.purchaseRequirements === "object" ? item.purchaseRequirements : {};
      const offerId = String(item.marketOfferId || "").trim();
      const offer = offerId ? window.WS_APP.getMarketOffer?.(offerId) : null;
      const validation = offer && typeof window.WS_APP.validateMarketOfferPurchaseRequirements === "function"
        ? window.WS_APP.validateMarketOfferPurchaseRequirements(offer, citizen.id)
        : { ok: true, blockers: [] };
      const rows = [];
      const add = (label, value, state = "") => {
        const normalized = Array.isArray(value)
          ? value.map((entry) => formatMarketWorkspaceStoreLabel(entry)).filter(Boolean).join(" / ")
          : String(value ?? "").trim();
        if (normalized) rows.push({ label, value: normalized, state });
      };
      const subscriptionCategory = String(item.requiresSubscriptionCategory || "").trim().toUpperCase();
      const subscriptionTier = clampNumber(item.requiresSubscriptionTier || 0, 0, 99);
  
      add("Eligibility", validation.ok ? "CLEARED" : (validation.blockers || []).map(formatMarketWorkspaceBlocker).join(" / "), validation.ok ? "OK" : "WARN");
      add("Legality", formatMarketWorkspaceStoreLabel(item.legality || "REGISTERED"));
      if (subscriptionCategory) add("Subscription", `${formatMarketWorkspaceStoreLabel(subscriptionCategory)}${subscriptionTier ? ` / T${subscriptionTier}` : ""}`);
      add("Access", requirements.requiredAccessLevel ? `LEVEL ${requirements.requiredAccessLevel}` : "");
      add("License", requirements.requiredLicenseCodes || []);
      add("Entitlement", requirements.requiredEntitlements || []);
      add("Citizen class", requirements.allowedCitizenClasses || []);
      return rows;
    }

  function getMarketWorkspaceInspectorFulfillment(item = {}, unit = null) {
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

  function getMarketWorkspaceInspectorQuantityMax(item = {}) {
      const stock = item.stock && typeof item.stock === "object" ? item.stock : {};
      if (String(stock.mode || "").toUpperCase() !== "FINITE") return 99;
      return Math.max(1, Math.min(99, Math.max(0, Number(stock.availableQuantity || 0) - Number(stock.reservedQuantity || 0))));
    }

  function renderMarketWorkspaceInspectorRows(rows = [], className = "") {
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

  function renderMarketWorkspaceProductInspectorContent(item = {}, citizen = {}, unit = null) {
      const department = getMarketWorkspaceDepartment(item);
      const kind = getMarketWorkspaceItemKind(item);
      const availability = getMarketWorkspaceAvailability(item);
      const offerId = String(item.marketOfferId || "").trim();
      const catalogId = getMarketWorkspaceProductCatalogId(item);
      const facts = getMarketWorkspaceInspectorFacts(item);
      const requirements = getMarketWorkspaceInspectorRequirements(item, citizen);
      const fulfillment = getMarketWorkspaceInspectorFulfillment(item, unit);
      const features = Array.isArray(item.specialFeatures) ? item.specialFeatures.map((feature) => String(feature || "").trim()).filter(Boolean) : [];
      const maxQuantity = getMarketWorkspaceInspectorQuantityMax(item);
      const canAdd = Boolean(offerId && unit?.id && !availability.disabled);
      const price = getMarketWorkspacePrice(item);
      return `
        <header class="housing-market-product-inspector-head">
          <div>
            <p class="kicker">${escapeHtml(formatMarketWorkspaceStoreLabel(department))} / ${escapeHtml(formatMarketWorkspaceStoreLabel(kind))}</p>
            <h5>${escapeHtml(item.name || "MARKET PRODUCT")}</h5>
            <small>${escapeHtml(item.vendorName || getMarketWorkspaceManufacturer(item))}</small>
          </div>
          <button class="housing-inline-action" type="button" data-housing-market-product-inspector-close>CLOSE</button>
        </header>
        <div class="housing-market-product-inspector-scroll" data-housing-market-product-inspector="${escapeHtml(catalogId)}">
          <div class="housing-market-product-inspector-hero">
            <div class="housing-market-product-inspector-summary">
              <span class="module-status-badge is-${escapeHtml(availability.code.toLowerCase().replace(/_/g, "-"))}">${escapeHtml(availability.label)}</span>
              <div><small>PRICE</small><b>${escapeHtml(formatCredits(price))}</b></div>
              <div><small>STOCK</small><b>${escapeHtml(availability.stockLabel)}</b></div>
              <div><small>MANUFACTURER</small><b>${escapeHtml(getMarketWorkspaceManufacturer(item))}</b></div>
            </div>
          </div>
          <section class="housing-market-product-inspector-section">
            <p class="kicker">PRODUCT DESCRIPTION</p>
            <p class="housing-market-product-inspector-description">${escapeHtml(getMarketWorkspaceProductDescription(item))}</p>
          </section>
          <section class="housing-market-product-inspector-section">
            <p class="kicker">PRODUCT PARAMETERS</p>
            ${renderMarketWorkspaceInspectorRows(facts)}
          </section>
          ${features.length ? `
            <section class="housing-market-product-inspector-section">
              <p class="kicker">FEATURES</p>
              <div class="housing-market-product-inspector-features">${features.map((feature) => `<span>${escapeHtml(feature)}</span>`).join("")}</div>
            </section>
          ` : ""}
          <section class="housing-market-product-inspector-section">
            <p class="kicker">PURCHASE REQUIREMENTS</p>
            ${renderMarketWorkspaceInspectorRows(requirements, "is-requirements")}
          </section>
          <section class="housing-market-product-inspector-section">
            <p class="kicker">FULFILLMENT</p>
            ${renderMarketWorkspaceInspectorRows(fulfillment, "is-fulfillment")}
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
            <button class="housing-inline-action" type="button" data-housing-market-wishlist-offer="${escapeHtml(offerId)}" ${offerId ? "" : "disabled"} title="${escapeHtml(offerId ? "Add product to a named wishlist" : "Market offer unavailable")}">WISHLIST</button>
            <button class="housing-inline-action housing-market-action-primary" type="button" data-housing-market-add-offer="${escapeHtml(offerId)}" ${canAdd ? "" : "disabled"} title="${escapeHtml(canAdd ? "Add selected quantity to cart" : availability.label)}">ADD TO CART</button>
          </div>
        </footer>
      `;
    }

  function renderMarketWorkspaceProductInspectorLayer() {
      return `
        <div class="housing-market-product-inspector-layer" data-housing-market-product-inspector-layer aria-hidden="true">
          <button class="housing-market-product-inspector-backdrop" type="button" tabindex="-1" aria-hidden="true" data-housing-market-product-inspector-close aria-label="Close product details"></button>
          <aside class="housing-market-product-inspector-drawer" role="dialog" aria-modal="true" aria-label="Market product details" tabindex="-1">
            <div data-housing-market-product-inspector-content></div>
          </aside>
        </div>
      `;
    }

  function getMarketWorkspaceWishlistLineProduct(line = {}) {
      const offer = window.WS_APP.getMarketOffer?.(line.marketOfferId) || null;
      const product = offer ? window.WS_APP.projectMarketOfferCatalogItem?.(offer) || null : null;
      return { offer, product };
    }

  function getMarketWorkspaceWishlistContext(citizenId = "") {
      const wishlists = window.WS_APP.getCitizenMarketWishlists?.(citizenId) || [];
      const activeWishlistId = getMarketWorkspaceActiveWishlistId(citizenId);
      const activeWishlist = wishlists.find((wishlist) => wishlist.wishlistId === activeWishlistId) || wishlists[0] || null;
      if (activeWishlist && activeWishlist.wishlistId !== activeWishlistId) {
        setMarketWorkspaceActiveWishlistId(citizenId, activeWishlist.wishlistId);
      }
      const pending = getMarketWorkspacePendingWishlistItem(citizenId);
      return { wishlists, activeWishlist, pending };
    }

  function renderMarketWorkspaceWishlistLine(line = {}) {
      const { offer, product } = getMarketWorkspaceWishlistLineProduct(line);
      const unitPrice = Number(offer?.pricing?.finalPrice || getMarketWorkspacePrice(product || {}));
      return `
        <article class="housing-market-wishlist-line">
          <div class="housing-market-wishlist-line-main">
            <b>${escapeHtml(product?.name || line.marketOfferId)}</b>
            <small>${escapeHtml(offer?.vendorDisplayName || offer?.vendorProviderId || product?.manufacturer || "UNKNOWN VENDOR")}</small>
            <small>${escapeHtml(formatCredits(unitPrice))} EACH</small>
          </div>
          <div class="housing-market-wishlist-quantity" aria-label="Wishlist quantity">
            <button type="button" data-housing-market-wishlist-quantity="${escapeHtml(line.wishlistLineId)}" data-quantity="${escapeHtml(Math.max(0, Number(line.quantity || 1) - 1))}" aria-label="Decrease quantity">−</button>
            <b>${escapeHtml(line.quantity || 1)}</b>
            <button type="button" data-housing-market-wishlist-quantity="${escapeHtml(line.wishlistLineId)}" data-quantity="${escapeHtml(Math.min(99, Number(line.quantity || 1) + 1))}" aria-label="Increase quantity">+</button>
            <button class="housing-market-wishlist-remove" type="button" data-housing-market-wishlist-remove="${escapeHtml(line.wishlistLineId)}">REMOVE</button>
          </div>
        </article>
      `;
    }

  function renderMarketWorkspaceWishlistDrawer(citizen = {}, unit = null) {
      const context = getMarketWorkspaceWishlistContext(citizen.id);
      const open = getMarketWorkspaceWishlistOpen(citizen.id);
      const active = context.activeWishlist;
      const pendingOffer = context.pending?.marketOfferId ? window.WS_APP.getMarketOffer?.(context.pending.marketOfferId) || null : null;
      const pendingProduct = pendingOffer ? window.WS_APP.projectMarketOfferCatalogItem?.(pendingOffer) || null : null;
      const itemCount = active?.lines?.reduce((sum, line) => sum + Number(line.quantity || 0), 0) || 0;
      const total = active?.lines?.reduce((sum, line) => {
        const { offer, product } = getMarketWorkspaceWishlistLineProduct(line);
        return sum + Number(line.quantity || 0) * Number(offer?.pricing?.finalPrice || getMarketWorkspacePrice(product || {}));
      }, 0) || 0;
      const canMove = Boolean(active?.lines?.length && unit?.id);
      return `
        <div class="housing-market-wishlist-layer ${open ? "is-open" : ""}" data-housing-market-wishlist-layer aria-hidden="${open ? "false" : "true"}">
          <button class="housing-market-wishlist-backdrop" type="button" tabindex="-1" aria-hidden="true" data-housing-market-wishlist-close aria-label="Close wishlists"></button>
          <aside class="housing-market-wishlist-drawer" role="dialog" aria-modal="true" aria-label="Market wishlists" tabindex="-1">
            <header class="housing-market-wishlist-head">
              <div>
                <p class="kicker">MARKET / WISHLISTS</p>
                <h5>${escapeHtml(active?.name || "NO WISHLIST")}</h5>
                <small>${escapeHtml(`${context.wishlists.length} LIST${context.wishlists.length === 1 ? "" : "S"} / ${itemCount} ITEM${itemCount === 1 ? "" : "S"}`)}</small>
              </div>
              <button class="housing-inline-action" type="button" data-housing-market-wishlist-close>CLOSE</button>
            </header>
            <div class="housing-market-wishlist-scroll">
              <section class="housing-market-wishlist-create">
                <label>
                  <span>NEW WISHLIST NAME</span>
                  <input type="text" maxlength="48" placeholder="E.G. NEURAL UPGRADES" data-housing-market-wishlist-create-name>
                </label>
                <button class="housing-inline-action" type="button" data-housing-market-wishlist-create>CREATE</button>
              </section>
              ${context.wishlists.length ? `
                <nav class="housing-market-wishlist-tabs" aria-label="Named wishlists">
                  ${context.wishlists.map((wishlist) => `
                    <button class="housing-market-wishlist-tab ${wishlist.wishlistId === active?.wishlistId ? "is-active" : ""}" type="button" data-housing-market-wishlist-select="${escapeHtml(wishlist.wishlistId)}">
                      <b>${escapeHtml(wishlist.name)}</b>
                      <small>${escapeHtml(wishlist.lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0))} ITEMS</small>
                    </button>
                  `).join("")}
                </nav>
              ` : `<p class="file-empty">Create a named wishlist to save Market products.</p>`}
              ${active ? `
                <section class="housing-market-wishlist-manage">
                  <label>
                    <span>LIST NAME</span>
                    <input type="text" maxlength="48" value="${escapeHtml(active.name)}" data-housing-market-wishlist-rename-name>
                  </label>
                  <button class="housing-inline-action" type="button" data-housing-market-wishlist-rename="${escapeHtml(active.wishlistId)}">RENAME</button>
                  <button class="housing-inline-action is-danger" type="button" data-housing-market-wishlist-delete="${escapeHtml(active.wishlistId)}">DELETE</button>
                </section>
                ${context.pending ? `
                  <section class="housing-market-wishlist-pending">
                    <div>
                      <p class="kicker">ADD PRODUCT</p>
                      <b>${escapeHtml(pendingProduct?.name || context.pending.marketOfferId)}</b>
                      <small>${escapeHtml(`${context.pending.quantity || 1} UNIT${Number(context.pending.quantity || 1) === 1 ? "" : "S"} → ${active.name}`)}</small>
                    </div>
                    <button class="housing-inline-action housing-market-action-primary" type="button" data-housing-market-wishlist-add-pending="${escapeHtml(active.wishlistId)}">ADD TO LIST</button>
                  </section>
                ` : ""}
                <section class="housing-market-wishlist-lines">
                  ${active.lines.length ? active.lines.map(renderMarketWorkspaceWishlistLine).join("") : `<p class="file-empty">This wishlist is empty.</p>`}
                </section>
              ` : ""}
            </div>
            <footer class="housing-market-wishlist-summary">
              <div class="housing-market-wishlist-metrics">
                <span><small>LINES</small><b>${escapeHtml(active?.lines?.length || 0)}</b></span>
                <span><small>ITEMS</small><b>${escapeHtml(itemCount)}</b></span>
                <span><small>ESTIMATED TOTAL</small><b>${escapeHtml(formatCredits(total))}</b></span>
              </div>
              <button class="housing-inline-action housing-market-action-primary" type="button" data-housing-market-wishlist-move="${escapeHtml(active?.wishlistId || "")}" ${canMove ? "" : "disabled"} title="${escapeHtml(active?.lines?.length ? (unit?.id ? "Move the entire wishlist into the active delivery cart" : "Housing destination required") : "Wishlist is empty")}">MOVE LIST TO CART</button>
            </footer>
          </aside>
        </div>
      `;
    }

  function openMarketWorkspaceWishlist(root = null, citizenId = "", pending = null) {
      setMarketWorkspaceCartOpen(citizenId, false);
      setMarketWorkspaceWishlistOpen(citizenId, true);
      setMarketWorkspacePendingWishlistItem(citizenId, pending);
      const layer = root?.querySelector?.("[data-housing-market-wishlist-layer]");
      layer?.classList?.add("is-open");
      layer?.setAttribute?.("aria-hidden", "false");
      syncMarketWorkspaceModalState(root, citizenId, { focus: true });
      return true;
    }

  function syncMarketWorkspaceProductInspectorTotal(scope = null) {
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

  function openMarketWorkspaceProductInspector(root = null, citizen = {}, catalogId = "", unit = null) {
      const id = String(catalogId || "").trim();
      const item = getMarketWorkspaceCatalogItemById(id) || getMarketWorkspaceCatalogItems().find((entry) => getMarketWorkspaceProductCatalogId(entry) === id) || null;
      const layer = root?.querySelector?.("[data-housing-market-product-inspector-layer]");
      const content = layer?.querySelector?.("[data-housing-market-product-inspector-content]");
      if (!item || !layer || !content) return false;
      setMarketWorkspaceSelectedProductId(citizen.id, getMarketWorkspaceProductCatalogId(item));
      content.innerHTML = renderMarketWorkspaceProductInspectorContent(item, citizen, unit);
      layer.classList.add("is-open");
      layer.setAttribute("aria-hidden", "false");
      syncMarketWorkspaceModalState(root, citizen.id, { focus: true });
      return true;
    }

  function closeMarketWorkspaceProductInspector(root = null, citizenId = "") {
      const layer = root?.querySelector?.("[data-housing-market-product-inspector-layer]");
      if (!layer) return false;
      const selectedId = getMarketWorkspaceSelectedProductId(citizenId);
      layer.classList.remove("is-open");
      layer.setAttribute("aria-hidden", "true");
      setMarketWorkspaceSelectedProductId(citizenId, "");
      syncMarketWorkspaceModalState(root, citizenId, { focus: false });
      const selectedCard = selectedId
        ? [...(root.querySelectorAll?.("[data-housing-market-product-card]") || [])].find((card) => card.getAttribute("data-housing-market-product-card") === selectedId)
        : null;
      const trigger = selectedCard?.querySelector?.("[data-housing-market-inspect]") || selectedCard;
      window.requestAnimationFrame?.(() => trigger?.focus?.({ preventScroll: true }));
      return true;
    }

  function renderMarketWorkspaceProductCard(item = {}, citizen = {}, unit = null) {
      const department = getMarketWorkspaceDepartment(item);
      const kind = getMarketWorkspaceItemKind(item);
      const availability = getMarketWorkspaceAvailability(item);
      const offerId = String(item.marketOfferId || "").trim();
      const catalogId = getMarketWorkspaceProductCatalogId(item);
      const canAdd = Boolean(offerId && unit?.id && !availability.disabled);
      const feature = Array.isArray(item.specialFeatures) ? item.specialFeatures.find(Boolean) : "";
      const note = String(item.shortDescription || item.description || item.notes || feature || "Product available through the indexed Market offer.").trim();
      const facts = getMarketWorkspaceProductFacts(item);
      const restrictions = getMarketWorkspaceProductRestrictions(item, availability);
      return `
        <article class="housing-market-product-card ${availability.disabled ? "is-unavailable" : ""}" data-housing-market-product-card="${escapeHtml(catalogId)}" data-market-department="${escapeHtml(department)}">
          <div class="housing-market-product-head">
            <div>
              <p class="kicker">${escapeHtml(formatMarketWorkspaceStoreLabel(department))} / ${escapeHtml(formatMarketWorkspaceStoreLabel(kind))}</p>
              <h5>${escapeHtml(item.name)}</h5>
              <small>${escapeHtml(item.vendorName || getMarketWorkspaceManufacturer(item))}</small>
            </div>
            <span class="module-status-badge is-${escapeHtml(availability.code.toLowerCase().replace(/_/g, "-"))}">${escapeHtml(availability.label)}</span>
          </div>
          <p class="housing-market-product-note">${escapeHtml(note)}</p>
          ${facts.length ? `<div class="housing-market-product-facts">${facts.map((fact) => `<span><small>${escapeHtml(fact.label)}</small><b>${escapeHtml(fact.value)}</b></span>`).join("")}</div>` : ""}
          ${restrictions.length ? `<div class="housing-market-product-tags">${restrictions.map((restriction) => `<span>${escapeHtml(formatMarketWorkspaceStoreLabel(restriction))}</span>`).join("")}</div>` : ""}
          <div class="housing-market-product-buy-row">
            <div class="housing-market-product-price"><small>PRICE</small><b>${escapeHtml(formatCredits(getMarketWorkspacePrice(item)))}</b><span>${escapeHtml(availability.stockLabel)}</span></div>
            <div class="housing-market-product-actions" aria-label="Product actions">
              <button class="housing-inline-action housing-market-product-details" type="button" data-housing-market-inspect="${escapeHtml(catalogId)}">DETAILS</button>
              <button class="housing-inline-action" type="button" data-housing-market-wishlist-offer="${escapeHtml(offerId)}" ${offerId ? "" : "disabled"} title="${escapeHtml(offerId ? "Add product to a named wishlist" : "Market offer unavailable")}">WISHLIST</button>
              <button class="housing-inline-action housing-market-action-primary" type="button" data-housing-market-add-offer="${escapeHtml(offerId)}" ${canAdd ? "" : "disabled"} title="${escapeHtml(canAdd ? "Add product to cart" : availability.label)}">ADD TO CART</button>
            </div>
          </div>
        </article>
      `;
    }

  function getMarketWorkspacePagination(totalItems = 0, requestedPage = 1) {
      const totalPages = Math.max(1, Math.ceil(totalItems / MARKET_PAGE_SIZE));
      const page = Math.min(totalPages, Math.max(1, Number(requestedPage || 1)));
      const startIndex = (page - 1) * MARKET_PAGE_SIZE;
      const endIndex = Math.min(totalItems, startIndex + MARKET_PAGE_SIZE);
      return { page, totalPages, startIndex, endIndex };
    }

  function getMarketWorkspacePagerPages(page = 1, totalPages = 1) {
      const pages = new Set([1, totalPages, page - 1, page, page + 1]);
      return [...pages].filter((entry) => entry >= 1 && entry <= totalPages).sort((a, b) => a - b);
    }

  function renderMarketWorkspacePagination(pagination = {}) {
      if (pagination.totalPages <= 1) return "";
      const pages = getMarketWorkspacePagerPages(pagination.page, pagination.totalPages);
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

  function renderMarketWorkspaceCatalog(items = [], citizen = {}, unit = null, filters = {}, options = {}, pagination = {}) {
      const currentLabel = filters.category !== "ALL"
        ? `${formatMarketWorkspaceStoreLabel(filters.type)} / ${formatMarketWorkspaceStoreLabel(filters.category)}`
        : formatMarketWorkspaceStoreLabel(filters.type === "ALL" ? "ALL PRODUCTS" : filters.type);
      const rangeLabel = items.length ? `${pagination.startIndex + 1}–${pagination.endIndex} OF ${pagination.totalItems}` : `0 OF ${pagination.totalItems || 0}`;
      return `
        <section class="housing-module-panel housing-market-catalog-panel">
          <div class="housing-market-storefront">
            ${renderMarketWorkspaceDepartmentNavigation(filters, options)}
            <div class="housing-market-shop-floor">
              ${renderMarketWorkspaceCatalogToolbar(filters, pagination.totalItems || 0)}
              <header class="housing-market-catalog-head">
                <div><p class="kicker">${escapeHtml(currentLabel)}</p><h5>Products</h5></div>
                <div><span class="module-status-badge">${escapeHtml(rangeLabel)}</span><small>PAGE ${escapeHtml(pagination.page)} / ${escapeHtml(pagination.totalPages)}</small></div>
              </header>
              <div class="housing-market-card-grid">
                ${items.length
                  ? items.map((item) => renderMarketWorkspaceProductCard(item, citizen, unit)).join("")
                  : `<p class="file-empty">No Market products match the current catalog filters.</p>`}
              </div>
              ${renderMarketWorkspacePagination(pagination)}
            </div>
          </div>
        </section>
      `;
    }

  function formatMarketWorkspaceBlocker(code = "") {
      const value = String(code || "").split(":").pop().replace(/^API_REQUIRED:/, "").replace(/_/g, " ");
      return value || "UNKNOWN BLOCKER";
    }

  function renderMarketWorkspaceCartDrawer(citizen = {}, activeRecord = null, unit = null) {
      const context = getMarketWorkspaceCartContext(citizen.id);
      const open = getMarketWorkspaceCartOpen(citizen.id);
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
                      ${quoteLine.blockers?.length ? `<small class="housing-market-cart-blocker">${escapeHtml(quoteLine.blockers.map(formatMarketWorkspaceBlocker).join(" / "))}</small>` : ""}
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
              ${context.quote?.blockers?.length ? `<div class="housing-market-cart-blockers"><b>QUOTE BLOCKERS</b>${context.quote.blockers.map((code) => `<span>${escapeHtml(formatMarketWorkspaceBlocker(code))}</span>`).join("")}</div>` : ""}
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

  function getCanonicalMarketWorkspaceOrders(citizen = {}) {
      return typeof window.WS_APP.getCitizenMarketOrders === "function"
        ? window.WS_APP.getCitizenMarketOrders(citizen.id).filter((order) => order && order.marketOrderId)
        : [];
    }

  function isCanonicalMarketWorkspaceOrderActive(order = {}) {
      const refundStatus = String(order.refundRequest?.status || "").trim().toUpperCase();
      if (["REQUESTED", "PROCESSING", "RECOVERY_REQUIRED"].includes(refundStatus)) return true;
      const partialReturnActive = (Array.isArray(order.partialReturns) ? order.partialReturns : []).some((entry) => ["REQUESTED", "PROCESSING", "RECOVERY_REQUIRED"].includes(String(entry?.status || "").trim().toUpperCase()));
      if (partialReturnActive) return true;
      return !MARKET_ORDER_CLOSED_STATUSES.has(String(order.status || "").trim().toUpperCase());
    }

  function getCanonicalMarketWorkspaceOrderProductName(line = {}) {
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
                <b>${escapeHtml(`${line.quantity || 1} × ${getCanonicalMarketWorkspaceOrderProductName(line)}`)}</b>
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
                  <b>${escapeHtml(getCanonicalMarketWorkspaceOrderProductName(line))}</b>
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
      const partialReturnBlockerText = (actionState.partialReturnBlockers || []).map(formatMarketWorkspaceBlocker).join(" / ");
      const blockerText = [...(actionState.refundBlockers || []), ...(actionState.partialReturnBlockers || [])].map(formatMarketWorkspaceBlocker).join(" / ");
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

  function renderCanonicalMarketWorkspaceOrderCard(order = {}, citizen = {}) {
      const status = String(order.status || "UNKNOWN").trim().toUpperCase();
      const destinationIds = [...new Set((order.lines || []).map((line) => line.destinationRef?.housingStorageId).filter(Boolean))];
      const targetRecord = getCitizenHousingRecords(citizen).find((record) => record.storageUnits.some((unit) => destinationIds.includes(unit.id))) || null;
      const selected = getMarketSelectedOrderId(citizen.id) === order.marketOrderId;
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

  function renderMarketOrderPanel(citizen = {}, requestedView = "") {
      const canonicalOrders = getCanonicalMarketWorkspaceOrders(citizen);
      const canonicalActive = canonicalOrders.filter(isCanonicalMarketWorkspaceOrderActive);
      const canonicalHistory = canonicalOrders.filter((order) => !isCanonicalMarketWorkspaceOrderActive(order));
      const activeView = normalizeMarketWorkspaceOrderView(requestedView || getMarketWorkspaceOrderView(citizen.id));
      const visibleCanonical = activeView === "ACTIVE" ? canonicalActive : canonicalHistory;
      return `
        <section class="housing-module-panel housing-shipment-panel housing-market-orders-panel">
          <header class="housing-module-panel-head">
            <div><p class="kicker">MARKET ORDER LEDGER</p><h5>Orders / Payment / Fulfillment</h5></div>
          </header>
          <div class="housing-market-summary housing-shipment-summary">
            ${renderMarketMetric("ACTIVE", canonicalActive.length)}
            ${renderMarketMetric("REFUND REQUESTS", canonicalOrders.filter((order) => order.refundRequest?.status === "REQUESTED").length)}
            ${renderMarketMetric("RECOVERY REQUIRED", canonicalOrders.filter((order) => String(order.deliveryFulfillment?.status || "").toUpperCase() === "RECOVERY_REQUIRED" || String(order.refundRequest?.status || "").toUpperCase() === "RECOVERY_REQUIRED").length)}
            ${renderMarketMetric("COMPLETED", canonicalOrders.filter((order) => order.status === "COMPLETED").length)}
            ${renderMarketMetric("FAILED / CANCELLED", canonicalOrders.filter((order) => ["FAILED", "CANCELLED"].includes(order.status)).length)}
            ${renderMarketMetric("TOTAL ORDERS", canonicalOrders.length)}
          </div>
          <div class="housing-market-order-shell">
            <section>
              <header><p class="kicker">CANONICAL ORDERS</p><h6>${escapeHtml(activeView === "ACTIVE" ? "Active / Recovery / Refund Requests" : "Completed / Failed / Cancelled")}</h6></header>
              <div class="housing-market-order-list">
                ${visibleCanonical.map((order) => renderCanonicalHousingMarketOrderCard(order, citizen)).join("")}
                ${!visibleCanonical.length ? `<p class="file-empty">No canonical orders in this view.</p>` : ""}
              </div>
            </section>
          </div>
        </section>
      `;
    }

  function renderMarketWorkspaceCommandBar(latest = {}, activeRecord = null, unit = null, stats = {}, cartContext = {}) {
      const credits = parseCredits(latest.credits);
      const itemCount = Number(cartContext.itemCount || 0);
      const lineCount = Number(cartContext.lineCount || 0);
      const cartItemLabel = `${itemCount} ITEM${itemCount === 1 ? "" : "S"}`;
      const wishlists = window.WS_APP.getCitizenMarketWishlists?.(latest.id) || [];
      const wishlistItems = wishlists.reduce((sum, wishlist) => sum + wishlist.lines.reduce((lineSum, line) => lineSum + Number(line.quantity || 0), 0), 0);
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
              <button class="housing-inline-action" type="button" data-housing-market-wishlist-open aria-expanded="${getMarketWorkspaceWishlistOpen(latest.id) ? "true" : "false"}" aria-label="Open Market wishlists: ${escapeHtml(wishlists.length)} lists, ${escapeHtml(wishlistItems)} items">WISHLISTS ${escapeHtml(wishlists.length)}</button>
              <button class="housing-inline-action housing-market-cart-toggle" type="button" data-housing-market-cart-open aria-expanded="${getMarketWorkspaceCartOpen(latest.id) ? "true" : "false"}" aria-label="Open Market cart: ${escapeHtml(lineCount)} lines, ${escapeHtml(itemCount)} items, ${escapeHtml(formatCredits(cartContext.total || 0))}">CART ${escapeHtml(cartItemLabel)} / ${escapeHtml(formatCredits(cartContext.total || 0))}</button>
            </div>
          </header>
        </section>
      `;
    }

  function renderMarketWorkspaceTab(citizen = {}) {
      const latest = window.WS_APP.getCitizenById?.(citizen.id) || citizen;
      const { records, activeRecord, unit } = getHousingActiveStorageTarget(latest);
      const catalogItems = getMarketWorkspaceCatalogItems();
      const filters = getMarketWorkspaceFilters(latest.id);
      const activeMode = getMarketWorkspaceMode(latest.id);
      const filterOptions = getMarketWorkspaceFilterOptions(catalogItems);
      const filteredItems = filterMarketWorkspaceItems(catalogItems, filters, latest, unit, "CATALOG");
      const visibleItems = sortMarketWorkspaceItems(filteredItems, filters, activeRecord, unit, "CATALOG");
      const pagination = getMarketWorkspacePagination(visibleItems.length, filters.page);
      if (pagination.page !== filters.page) setMarketWorkspaceFilters(latest.id, { page: pagination.page });
      const pageItems = visibleItems.slice(pagination.startIndex, pagination.endIndex);
      const secondaryListings = (window.WS_APP.getMarketSecondaryListings?.({ status: "ACTIVE" }) || [])
        .map((listing) => window.WS_APP.projectMarketSecondaryListing?.(listing) || listing)
        .filter(Boolean);
      const canonicalOrders = getCanonicalMarketWorkspaceOrders(latest);
      const activeOrders = canonicalOrders.filter(isCanonicalMarketWorkspaceOrderActive).length;
      const deliveredOrders = canonicalOrders.filter((order) => !isCanonicalMarketWorkspaceOrderActive(order)).length;
      const cartContext = getMarketWorkspaceCartContext(latest.id);
      const stats = {
        total: catalogItems.length,
        visible: visibleItems.length,
        secondaryActive: secondaryListings.length,
        activeOrders,
        deliveredOrders
      };
      pagination.totalItems = visibleItems.length;
  
      return `
        <div class="housing-market-tab">
          ${renderMarketFeedback(latest.id)}
          ${renderMarketWorkspaceCommandBar(latest, activeRecord, unit, stats, cartContext)}
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
          ${renderMarketWorkspaceModeTabs(activeMode, stats)}
          ${activeMode === "CATALOG" ? `
            ${renderMarketWorkspaceCatalog(pageItems, latest, unit, filters, filterOptions, pagination)}
          ` : activeMode === "SECONDARY"
            ? renderMarketSecondaryWorkspace(secondaryListings)
            : renderMarketOrderPanel(latest, activeMode === "DELIVERED" ? "HISTORY" : "ACTIVE")}
          ${renderMarketWorkspaceCartDrawer(latest, activeRecord, unit)}
          ${renderMarketWorkspaceWishlistDrawer(latest, unit)}
          ${renderMarketWorkspaceProductInspectorLayer()}
        </div>
      `;
    }

    function handleMarketWorkspaceChange(event, context = {}) {
      const citizenId = String(context.citizenId || "").trim();
      const user = context.user || window.WS_APP.currentUser;
      const field = event?.target?.closest?.("[data-housing-market-filter-field]");
      if (!field) return false;
      const key = String(field.getAttribute("data-housing-market-filter-field") || "").trim();
      if (!key) return false;
      setMarketWorkspaceFilters(citizenId, { [key]: String(field.value || ""), page: 1 });
      setMarketWorkspaceTab(citizenId, "MARKET");
      setMarketFeedback(citizenId, "");
      renderMarketModule(user);
      return true;
    }

    function handleMarketWorkspaceInput(event, context = {}) {
      const root = context.root || document.querySelector(rootSelector);
      const citizenId = String(context.citizenId || "").trim();
      const user = context.user || window.WS_APP.currentUser;
      const inspectorQuantity = event?.target?.closest?.("[data-housing-market-product-inspector-quantity]");
      if (inspectorQuantity) {
        syncMarketWorkspaceProductInspectorTotal(inspectorQuantity.closest("[data-housing-market-product-inspector]"));
        return true;
      }
      const field = event?.target?.closest?.('[data-housing-market-filter-field="search"]');
      if (!field) return false;
      window.clearTimeout(window.WS_APP.marketSearchDebounce);
      window.WS_APP.marketSearchDebounce = window.setTimeout(() => {
        setMarketWorkspaceFilters(citizenId, { search: String(field.value || ""), page: 1 });
        setMarketWorkspaceSelectedProductId(citizenId, "");
        setMarketWorkspaceTab(citizenId, "MARKET");
        setMarketFeedback(citizenId, "");
        renderMarketModule(user);
      }, 120);
      return true;
    }

    function handleMarketWorkspaceKeydown(event, context = {}) {
      const root = context.root || document.querySelector(rootSelector);
      const citizenId = String(context.citizenId || "").trim();
      const inspectorLayer = root?.querySelector?.("[data-housing-market-product-inspector-layer]");
      const wishlistLayer = root?.querySelector?.("[data-housing-market-wishlist-layer]");
      const cartLayer = root?.querySelector?.("[data-housing-market-cart-layer]");
      if (event?.key === "Escape") {
        if (inspectorLayer?.classList.contains("is-open")) {
          event.preventDefault();
          closeMarketWorkspaceProductInspector(root, citizenId);
          return true;
        }
        if (wishlistLayer?.classList.contains("is-open") || getMarketWorkspaceWishlistOpen(citizenId)) {
          event.preventDefault();
          closeMarketWorkspaceWishlist(root, citizenId);
          return true;
        }
        if (cartLayer?.classList.contains("is-open") || getMarketWorkspaceCartOpen(citizenId)) {
          event.preventDefault();
          closeMarketWorkspaceCart(root, citizenId);
          return true;
        }
        return false;
      }
      if (event?.key !== "Tab") return false;
      const activeLayer = inspectorLayer?.classList.contains("is-open")
        ? inspectorLayer
        : (wishlistLayer?.classList.contains("is-open")
          ? wishlistLayer
          : (cartLayer?.classList.contains("is-open") ? cartLayer : null));
      const dialog = activeLayer?.querySelector?.('[role="dialog"]');
      return trapMarketWorkspaceDialogFocus(event, dialog);
    }

    function handleMarketWorkspaceBackNavigation(context = {}) {
      const root = context.root || document.querySelector(rootSelector);
      const citizenId = String(context.citizenId || "").trim();
      const user = context.user || window.WS_APP.currentUser;
      const inspectorLayer = root?.querySelector?.("[data-housing-market-product-inspector-layer]");
      if (inspectorLayer?.classList.contains("is-open")) {
        closeMarketWorkspaceProductInspector(root, citizenId);
        return true;
      }
      const wishlistLayer = root?.querySelector?.("[data-housing-market-wishlist-layer]");
      if (wishlistLayer?.classList.contains("is-open") || getMarketWorkspaceWishlistOpen(citizenId)) {
        closeMarketWorkspaceWishlist(root, citizenId);
        return true;
      }
      const cartLayer = root?.querySelector?.("[data-housing-market-cart-layer]");
      if (cartLayer?.classList.contains("is-open") || getMarketWorkspaceCartOpen(citizenId)) {
        closeMarketWorkspaceCart(root, citizenId);
        return true;
      }
      if (getMarketWorkspaceMode(citizenId) !== "CATALOG") {
        setMarketWorkspaceMode(citizenId, "CATALOG");
        setMarketWorkspaceOrderView(citizenId, "ACTIVE");
        setMarketSelectedOrderId(citizenId, "");
        setMarketFeedback(citizenId, "");
        renderMarketModule(user);
        return true;
      }
      return false;
    }

    function handleMarketWorkspaceClick(event, context = {}) {
      const root = context.root || document.querySelector(rootSelector);
      const citizenId = String(context.citizenId || "").trim();
      const user = context.user || window.WS_APP.currentUser;
      const marketModeButton = event.target.closest?.("[data-housing-market-mode]");
      
      if (marketModeButton) {
              const nextMode = normalizeMarketWorkspaceMode(String(marketModeButton.getAttribute("data-housing-market-mode") || "CATALOG"));
              setMarketWorkspaceMode(citizenId, nextMode);
              setMarketWorkspaceSelectedProductId(citizenId, "");
              if (nextMode === "ORDERS") setMarketWorkspaceOrderView(citizenId, "ACTIVE");
              if (nextMode === "DELIVERED") setMarketWorkspaceOrderView(citizenId, "HISTORY");
              setMarketWorkspaceTab(citizenId, "MARKET");
              setMarketFeedback(citizenId, "");
              renderMarketModule(user);
              return true;
            }
      
      const marketOrderToggleButton = event.target.closest?.("[data-housing-market-order-toggle]");
      
      if (marketOrderToggleButton) {
              const orderId = String(marketOrderToggleButton.getAttribute("data-housing-market-order-toggle") || "");
              setMarketSelectedOrderId(citizenId, getMarketSelectedOrderId(citizenId) === orderId ? "" : orderId);
              setMarketWorkspaceTab(citizenId, "MARKET");
              const currentMode = getMarketWorkspaceMode(citizenId);
              setMarketWorkspaceMode(citizenId, currentMode === "DELIVERED" ? "DELIVERED" : "ORDERS");
              setMarketFeedback(citizenId, "");
              renderMarketModule(user);
              return true;
            }
      
      const marketShipmentAdminDeliverButton = event.target.closest?.("[data-housing-market-shipment-admin-deliver]");
      if (marketShipmentAdminDeliverButton) {
        const shipmentId = String(marketShipmentAdminDeliverButton.getAttribute("data-housing-market-shipment-admin-deliver") || "");
        const shipment = window.WS_APP.getMarketShipment?.(shipmentId);
        const note = String(window.prompt?.("Admin debug delivery note:", "Immediate delivery for debug.") || "").trim();
        if (!note) {
          setMarketFeedback(citizenId, "Admin delivery cancelled: operator note is required.", "ERROR");
          renderMarketModule(user);
          return true;
        }
        const result = window.WS_APP.forceProcessMarketShipment?.(shipmentId, {
          actor: user,
          reason: note,
          expectedRevision: shipment?.revision,
          idempotencyKey: `admin-market-delivery:${shipmentId}:${shipment?.revision || 0}`
        }) || { ok: false, reason: "MARKET_DELIVERY_ADMIN_API_UNAVAILABLE" };
        syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, result?.ok ? "HISTORY" : "ACTIVE");
        setMarketFeedback(citizenId, result.ok ? "Shipment delivered through the canonical delivery resolver." : `Admin delivery result: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
        renderMarketModule(user);
        return true;
      }

      const marketShipmentAdminRetryButton = event.target.closest?.("[data-housing-market-shipment-admin-retry]");
      if (marketShipmentAdminRetryButton) {
        const shipmentId = String(marketShipmentAdminRetryButton.getAttribute("data-housing-market-shipment-admin-retry") || "");
        const shipment = window.WS_APP.getMarketShipment?.(shipmentId);
        const result = window.WS_APP.retryMarketShipmentDelivery?.(shipmentId, { expectedRevision: shipment?.revision, force: true }) || { ok: false, reason: "MARKET_DELIVERY_RETRY_API_UNAVAILABLE" };
        syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, result?.ok ? "HISTORY" : "ACTIVE");
        setMarketFeedback(citizenId, result.ok ? "Shipment delivery recovery completed." : `Delivery retry result: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
        renderMarketModule(user);
        return true;
      }

      const marketShipmentAdminReconcileButton = event.target.closest?.("[data-housing-market-shipment-admin-reconcile]");
      if (marketShipmentAdminReconcileButton) {
        const shipmentId = String(marketShipmentAdminReconcileButton.getAttribute("data-housing-market-shipment-admin-reconcile") || "");
        const shipment = window.WS_APP.getMarketShipment?.(shipmentId);
        const result = window.WS_APP.reconcileMarketShipment?.(shipmentId, { expectedRevision: shipment?.revision, retryHeld: true }) || { ok: false, reason: "MARKET_DELIVERY_RECONCILE_API_UNAVAILABLE" };
        syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, result?.ok ? "HISTORY" : "ACTIVE");
        setMarketFeedback(citizenId, result.ok ? "Shipment reconciliation completed." : `Shipment reconciliation result: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
        renderMarketModule(user);
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
              syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, result?.ok ? "HISTORY" : "ACTIVE");
              setMarketFeedback(citizenId, result.ok ? "Pickup confirmed. Purchased ItemInstance records moved from vendor custody to Citizen custody." : `Pickup confirmation failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
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
              syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, result?.ok ? "HISTORY" : "ACTIVE");
              setMarketFeedback(citizenId, result.ok ? "Pickup recovery completed without duplicate ItemInstance records." : `Pickup recovery failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
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
              syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, getMarketWorkspaceMode(citizenId) === "DELIVERED" ? "HISTORY" : "ACTIVE");
              setMarketFeedback(citizenId, result.ok ? "Market checkout resumed without creating duplicate payment or ItemInstance records." : `Checkout retry failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
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
              syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, getMarketWorkspaceMode(citizenId) === "DELIVERED" ? "HISTORY" : "ACTIVE");
              setMarketFeedback(citizenId, result.ok ? "Market order cancellation recovery completed." : `Cancellation recovery failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
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
              syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, getMarketWorkspaceMode(citizenId) === "DELIVERED" ? "HISTORY" : "ACTIVE");
              setMarketFeedback(citizenId, result.ok ? "Market order cancelled. Reservations and pending payment were released." : `Cancellation failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
              return true;
            }
      
      const marketOrderPartialReturnRequestButton = event.target.closest?.("[data-housing-market-partial-return-request]");
      
      if (marketOrderPartialReturnRequestButton) {
              const orderId = String(marketOrderPartialReturnRequestButton.getAttribute("data-housing-market-partial-return-request") || "");
              const card = marketOrderPartialReturnRequestButton.closest?.("[data-market-order-card]");
              const instanceIds = [...(card?.querySelectorAll?.("[data-housing-market-partial-return-instance]:checked") || [])].map((input) => String(input.value || "").trim()).filter(Boolean).sort();
              if (!instanceIds.length) {
                setMarketFeedback(citizenId, "Select at least one eligible unit for partial return.", "ERROR");
                renderMarketModule(user);
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
              syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, "ACTIVE");
              setMarketFeedback(citizenId, result.ok ? `Partial return requested for ${instanceIds.length} unit${instanceIds.length === 1 ? "" : "s"}.` : `Partial return blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
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
              syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, result?.order?.status === "REFUNDED" ? "HISTORY" : "ACTIVE");
              setMarketFeedback(citizenId, result.ok ? "Selected units returned and the proportional Billing refund completed." : `Partial refund failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
              return true;
            }
      
      const marketOrderPartialReturnRetryButton = event.target.closest?.("[data-housing-market-partial-return-retry]");
      
      if (marketOrderPartialReturnRetryButton) {
              const partialReturnId = String(marketOrderPartialReturnRetryButton.getAttribute("data-housing-market-partial-return-retry") || "");
              const orderId = String(marketOrderPartialReturnRetryButton.closest?.("[data-market-order-card]")?.getAttribute?.("data-market-order-card") || "");
              const order = window.WS_APP.getMarketOrder?.(orderId);
              const result = window.WS_APP.retryMarketOrderPartialReturn?.(orderId, partialReturnId, { expectedRevision: order?.revision }) || { ok: false, reason: "MARKET_PARTIAL_RETURN_RETRY_API_UNAVAILABLE" };
              syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, result?.order?.status === "REFUNDED" ? "HISTORY" : "ACTIVE");
              setMarketFeedback(citizenId, result.ok ? "Partial refund recovery completed without duplicate stock, item or Billing mutations." : `Partial refund recovery failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
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
              syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, "HISTORY");
              setMarketFeedback(citizenId, result.ok ? "Partial return request withdrawn." : `Partial return update failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
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
              syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, "ACTIVE");
              setMarketFeedback(citizenId, result.ok ? "Refund request recorded. Item return and Billing refund remain pending." : `Refund request blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
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
              syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, getMarketWorkspaceMode(citizenId) === "DELIVERED" ? "HISTORY" : "ACTIVE");
              setMarketFeedback(citizenId, result.ok ? "Item return and Billing refund completed through the canonical transaction boundary." : `Refund execution failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
              return true;
            }
      
      const marketOrderRefundRetryButton = event.target.closest?.("[data-housing-market-order-refund-retry]");
      
      if (marketOrderRefundRetryButton) {
              const orderId = String(marketOrderRefundRetryButton.getAttribute("data-housing-market-order-refund-retry") || "");
              const order = window.WS_APP.getMarketOrder?.(orderId);
              const result = window.WS_APP.retryMarketOrderRefund?.(orderId, {
                expectedRevision: order?.revision
              }) || { ok: false, reason: "MARKET_ORDER_REFUND_RETRY_API_UNAVAILABLE" };
              syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, getMarketWorkspaceMode(citizenId) === "DELIVERED" ? "HISTORY" : "ACTIVE");
              setMarketFeedback(citizenId, result.ok ? "Refund recovery completed without duplicating ItemInstance or Billing records." : `Refund recovery failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
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
              syncMarketWorkspaceModeToOrder(citizenId, result?.order || null, getMarketWorkspaceMode(citizenId) === "DELIVERED" ? "HISTORY" : "ACTIVE");
              setMarketFeedback(citizenId, result.ok ? "Refund request withdrawn." : `Refund request update failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
              return true;
            }
      
      const marketDepartmentButton = event.target.closest?.("[data-housing-market-department]");
      
      if (marketDepartmentButton) {
              setMarketWorkspaceFilters(citizenId, {
                type: String(marketDepartmentButton.getAttribute("data-housing-market-department") || "ALL"),
                category: "ALL",
                page: 1
              });
              setMarketWorkspaceSelectedProductId(citizenId, "");
              setMarketWorkspaceMode(citizenId, "CATALOG");
              setMarketWorkspaceTab(citizenId, "MARKET");
              setMarketFeedback(citizenId, "");
              renderMarketModule(user);
              return true;
            }
      
      const marketCategoryButton = event.target.closest?.("[data-housing-market-category]");
      
      if (marketCategoryButton) {
              setMarketWorkspaceFilters(citizenId, {
                category: String(marketCategoryButton.getAttribute("data-housing-market-category") || "ALL"),
                page: 1
              });
              setMarketWorkspaceSelectedProductId(citizenId, "");
              setMarketWorkspaceMode(citizenId, "CATALOG");
              setMarketWorkspaceTab(citizenId, "MARKET");
              setMarketFeedback(citizenId, "");
              renderMarketModule(user);
              return true;
            }
      
      const marketPageButton = event.target.closest?.("[data-housing-market-page]");
      
      if (marketPageButton) {
              setMarketWorkspaceFilters(citizenId, {
                page: Number(marketPageButton.getAttribute("data-housing-market-page") || 1)
              });
              setMarketWorkspaceSelectedProductId(citizenId, "");
              setMarketWorkspaceMode(citizenId, "CATALOG");
              setMarketWorkspaceTab(citizenId, "MARKET");
              setMarketFeedback(citizenId, "");
              renderMarketModule(user);
              return true;
            }
      
      const inspectorCloseButton = event.target.closest?.("[data-housing-market-product-inspector-close]");
      
      if (inspectorCloseButton) {
              closeMarketWorkspaceProductInspector(root, citizenId);
              return true;
            }
      
      const inspectorQuantityStep = event.target.closest?.("[data-housing-market-product-inspector-quantity-step]");
      
      if (inspectorQuantityStep) {
              const scope = inspectorQuantityStep.closest?.("[data-housing-market-product-inspector]");
              const input = scope?.querySelector?.("[data-housing-market-product-inspector-quantity]");
              if (input) {
                input.value = String(Number(input.value || 1) + Number(inspectorQuantityStep.getAttribute("data-housing-market-product-inspector-quantity-step") || 0));
                syncMarketWorkspaceProductInspectorTotal(scope);
              }
              return true;
            }
      
      const inspectorButton = event.target.closest?.("[data-housing-market-inspect]");
      
      if (inspectorButton) {
              const catalogId = String(inspectorButton.getAttribute("data-housing-market-inspect") || "");
              const latestCitizen = window.WS_APP.getCitizenById?.(citizenId) || { id: citizenId };
              const { unit } = getHousingActiveStorageTarget(latestCitizen);
              openMarketWorkspaceProductInspector(root, latestCitizen, catalogId, unit);
              return true;
            }
      
      const wishlistCloseButton = event.target.closest?.("[data-housing-market-wishlist-close]");

      if (wishlistCloseButton) {
              closeMarketWorkspaceWishlist(root, citizenId);
              return true;
            }

      const wishlistOpenButton = event.target.closest?.("[data-housing-market-wishlist-open]");

      if (wishlistOpenButton) {
              setMarketWorkspaceCartOpen(citizenId, false);
              setMarketWorkspaceWishlistOpen(citizenId, true);
              setMarketWorkspacePendingWishlistItem(citizenId, null);
              setMarketFeedback(citizenId, "");
              renderMarketModule(user);
              return true;
            }

      const wishlistOfferButton = event.target.closest?.("[data-housing-market-wishlist-offer]");

      if (wishlistOfferButton) {
              const offerId = String(wishlistOfferButton.getAttribute("data-housing-market-wishlist-offer") || "").trim();
              const inspector = wishlistOfferButton.closest?.("[data-housing-market-product-inspector]");
              const quantity = Number(inspector?.querySelector?.("[data-housing-market-product-inspector-quantity]")?.value || 1);
              setMarketWorkspaceSelectedProductId(citizenId, "");
              setMarketWorkspaceCartOpen(citizenId, false);
              setMarketWorkspaceWishlistOpen(citizenId, true);
              setMarketWorkspacePendingWishlistItem(citizenId, { marketOfferId: offerId, quantity });
              setMarketFeedback(citizenId, "");
              renderMarketModule(user);
              return true;
            }

      const wishlistCreateButton = event.target.closest?.("[data-housing-market-wishlist-create]");

      if (wishlistCreateButton) {
              const drawer = wishlistCreateButton.closest?.("[data-housing-market-wishlist-layer]");
              const name = String(drawer?.querySelector?.("[data-housing-market-wishlist-create-name]")?.value || "").trim();
              const result = window.WS_APP.createMarketWishlist?.(citizenId, name) || { ok: false, reason: "MARKET_WISHLIST_API_UNAVAILABLE" };
              if (result.ok && result.wishlist?.wishlistId) {
                setMarketWorkspaceActiveWishlistId(citizenId, result.wishlist.wishlistId);
                const pending = getMarketWorkspacePendingWishlistItem(citizenId);
                if (pending?.marketOfferId) {
                  const addResult = window.WS_APP.addMarketWishlistLine?.(result.wishlist.wishlistId, pending) || { ok: false, reason: "MARKET_WISHLIST_API_UNAVAILABLE" };
                  if (addResult.ok) setMarketWorkspacePendingWishlistItem(citizenId, null);
                  setMarketFeedback(citizenId, addResult.ok ? `Wishlist ${result.wishlist.name} created and product added.` : `Wishlist created, but product could not be added: ${String(addResult.reason || "UNKNOWN").replace(/_/g, " ")}.`, addResult.ok ? "OK" : "ERROR");
                } else {
                  setMarketFeedback(citizenId, `Wishlist ${result.wishlist.name} created.`, "OK");
                }
              } else {
                setMarketFeedback(citizenId, `Wishlist creation blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, "ERROR");
              }
              renderMarketModule(user);
              return true;
            }

      const wishlistSelectButton = event.target.closest?.("[data-housing-market-wishlist-select]");

      if (wishlistSelectButton) {
              setMarketWorkspaceActiveWishlistId(citizenId, String(wishlistSelectButton.getAttribute("data-housing-market-wishlist-select") || ""));
              setMarketFeedback(citizenId, "");
              renderMarketModule(user);
              return true;
            }

      const wishlistRenameButton = event.target.closest?.("[data-housing-market-wishlist-rename]");

      if (wishlistRenameButton) {
              const drawer = wishlistRenameButton.closest?.("[data-housing-market-wishlist-layer]");
              const wishlistId = String(wishlistRenameButton.getAttribute("data-housing-market-wishlist-rename") || "");
              const name = String(drawer?.querySelector?.("[data-housing-market-wishlist-rename-name]")?.value || "").trim();
              const result = window.WS_APP.renameMarketWishlist?.(wishlistId, name) || { ok: false, reason: "MARKET_WISHLIST_API_UNAVAILABLE" };
              setMarketFeedback(citizenId, result.ok ? `Wishlist renamed to ${result.wishlist?.name || name}.` : `Wishlist rename blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
              return true;
            }

      const wishlistDeleteButton = event.target.closest?.("[data-housing-market-wishlist-delete]");

      if (wishlistDeleteButton) {
              const wishlistId = String(wishlistDeleteButton.getAttribute("data-housing-market-wishlist-delete") || "");
              const result = window.WS_APP.deleteMarketWishlist?.(wishlistId) || { ok: false, reason: "MARKET_WISHLIST_API_UNAVAILABLE" };
              if (result.ok) setMarketWorkspaceActiveWishlistId(citizenId, "");
              setMarketFeedback(citizenId, result.ok ? "Wishlist deleted." : `Wishlist delete blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
              return true;
            }

      const wishlistAddPendingButton = event.target.closest?.("[data-housing-market-wishlist-add-pending]");

      if (wishlistAddPendingButton) {
              const wishlistId = String(wishlistAddPendingButton.getAttribute("data-housing-market-wishlist-add-pending") || "");
              const pending = getMarketWorkspacePendingWishlistItem(citizenId);
              const result = pending
                ? (window.WS_APP.addMarketWishlistLine?.(wishlistId, pending) || { ok: false, reason: "MARKET_WISHLIST_API_UNAVAILABLE" })
                : { ok: false, reason: "WISHLIST_PENDING_PRODUCT_REQUIRED" };
              if (result.ok) setMarketWorkspacePendingWishlistItem(citizenId, null);
              setMarketFeedback(citizenId, result.ok ? "Product added to wishlist." : `Wishlist update blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
              return true;
            }

      const wishlistQuantityButton = event.target.closest?.("[data-housing-market-wishlist-quantity]");

      if (wishlistQuantityButton) {
              const wishlistId = getMarketWorkspaceActiveWishlistId(citizenId);
              const lineId = String(wishlistQuantityButton.getAttribute("data-housing-market-wishlist-quantity") || "");
              const quantity = Number(wishlistQuantityButton.getAttribute("data-quantity") || 0);
              const result = window.WS_APP.setMarketWishlistLineQuantity?.(wishlistId, lineId, quantity) || { ok: false, reason: "MARKET_WISHLIST_API_UNAVAILABLE" };
              setMarketFeedback(citizenId, result.ok ? "" : `Wishlist quantity blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "INFO" : "ERROR");
              renderMarketModule(user);
              return true;
            }

      const wishlistRemoveButton = event.target.closest?.("[data-housing-market-wishlist-remove]");

      if (wishlistRemoveButton) {
              const wishlistId = getMarketWorkspaceActiveWishlistId(citizenId);
              const lineId = String(wishlistRemoveButton.getAttribute("data-housing-market-wishlist-remove") || "");
              const result = window.WS_APP.removeMarketWishlistLine?.(wishlistId, lineId) || { ok: false, reason: "MARKET_WISHLIST_API_UNAVAILABLE" };
              setMarketFeedback(citizenId, result.ok ? "Product removed from wishlist." : `Wishlist removal blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
              return true;
            }

      const wishlistMoveButton = event.target.closest?.("[data-housing-market-wishlist-move]");

      if (wishlistMoveButton) {
              const latestCitizen = window.WS_APP.getCitizenById?.(citizenId) || { id: citizenId };
              const { unit } = getHousingActiveStorageTarget(latestCitizen);
              const wishlistId = String(wishlistMoveButton.getAttribute("data-housing-market-wishlist-move") || "");
              const result = window.WS_APP.moveMarketWishlistToCart?.(wishlistId, { housingStorageId: unit?.id || "" }) || { ok: false, reason: "MARKET_WISHLIST_API_UNAVAILABLE" };
              if (result.ok) {
                setMarketWorkspaceWishlistOpen(citizenId, false);
                setMarketWorkspacePendingWishlistItem(citizenId, null);
                setMarketWorkspaceCartOpen(citizenId, true);
              }
              setMarketFeedback(citizenId, result.ok ? `${result.movedItemCount || 0} wishlist item${result.movedItemCount === 1 ? "" : "s"} moved to the Market cart.` : `Wishlist transfer blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
              return true;
            }

      const cartOpenButton = event.target.closest?.("[data-housing-market-cart-open]");
      
      if (cartOpenButton) {
              setMarketWorkspaceWishlistOpen(citizenId, false);
              setMarketWorkspacePendingWishlistItem(citizenId, null);
              setMarketWorkspaceCartOpen(citizenId, true);
              setMarketFeedback(citizenId, "");
              renderMarketModule(user);
              return true;
            }
      
      const cartCloseButton = event.target.closest?.("[data-housing-market-cart-close]");
      
      if (cartCloseButton) {
              closeMarketWorkspaceCart(root, citizenId);
              return true;
            }
      
      const addOfferButton = event.target.closest?.("[data-housing-market-add-offer]");
      
      if (addOfferButton) {
              const latestCitizen = window.WS_APP.getCitizenById?.(citizenId) || { id: citizenId };
              const { unit } = getHousingActiveStorageTarget(latestCitizen);
              const inspector = addOfferButton.closest?.("[data-housing-market-product-inspector]");
              const quantity = Number(inspector?.querySelector?.("[data-housing-market-product-inspector-quantity]")?.value || 1);
              const result = addMarketWorkspaceOfferToCart(latestCitizen, String(addOfferButton.getAttribute("data-housing-market-add-offer") || ""), unit, quantity);
              if (result.ok) setMarketWorkspaceSelectedProductId(citizenId, "");
              setMarketFeedback(citizenId, result.ok ? `${clampNumber(quantity, 1, 99)} product unit${clampNumber(quantity, 1, 99) === 1 ? "" : "s"} added to Market cart draft.` : `Cart update blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
              return true;
            }
      
      const addPickupOfferButton = event.target.closest?.("[data-housing-market-add-pickup-offer]");
      
      if (addPickupOfferButton) {
              const latestCitizen = window.WS_APP.getCitizenById?.(citizenId) || { id: citizenId };
              const result = addMarketWorkspaceOfferForPickupToCart(latestCitizen, String(addPickupOfferButton.getAttribute("data-housing-market-add-pickup-offer") || ""));
              setMarketFeedback(citizenId, result.ok ? "Offer added for vendor pickup." : `Pickup cart update blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
              return true;
            }
      
      const addServiceOfferButton = event.target.closest?.("[data-housing-market-add-service-offer]");
      
      if (addServiceOfferButton) {
              const latestCitizen = window.WS_APP.getCitizenById?.(citizenId) || { id: citizenId };
              const inspector = addServiceOfferButton.closest?.("[data-housing-market-product-inspector]");
              const quantity = Number(inspector?.querySelector?.("[data-housing-market-product-inspector-quantity]")?.value || 1);
              const result = addMarketWorkspaceOfferWithServiceToCart(latestCitizen, String(addServiceOfferButton.getAttribute("data-housing-market-add-service-offer") || ""), quantity);
              if (result.ok) setMarketWorkspaceSelectedProductId(citizenId, "");
              setMarketFeedback(citizenId, result.ok ? `${clampNumber(quantity, 1, 99)} product unit${clampNumber(quantity, 1, 99) === 1 ? "" : "s"} added with certified installation service.` : `Service cart update blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
              return true;
            }
      
      const cartQuantityButton = event.target.closest?.("[data-housing-market-cart-quantity]");
      
      if (cartQuantityButton) {
              const result = updateMarketWorkspaceCartQuantity(
                citizenId,
                String(cartQuantityButton.getAttribute("data-housing-market-cart-quantity") || ""),
                Number(cartQuantityButton.getAttribute("data-quantity") || 0)
              );
              setMarketFeedback(citizenId, result.ok ? "Market cart quantity updated." : `Cart update blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
              return true;
            }
      
      const cartRemoveButton = event.target.closest?.("[data-housing-market-cart-remove]");
      
      if (cartRemoveButton) {
              const result = removeMarketWorkspaceCartLine(citizenId, String(cartRemoveButton.getAttribute("data-housing-market-cart-remove") || ""));
              setMarketFeedback(citizenId, result.ok ? "Offer removed from Market cart draft." : `Cart update blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
              return true;
            }
      
      const cartClearButton = event.target.closest?.("[data-housing-market-cart-clear]");
      
      if (cartClearButton) {
              const result = clearMarketWorkspaceCart(citizenId);
              setMarketFeedback(citizenId, result.ok ? "Market cart draft cleared." : `Cart update blocked: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "OK" : "ERROR");
              renderMarketModule(user);
              return true;
            }
      
      const marketCheckoutButton = event.target.closest?.("[data-housing-market-checkout]");
      
      if (marketCheckoutButton) {
              const cart = getMarketWorkspaceDraftCart(citizenId);
              const result = cart ? window.WS_APP.checkoutMarketCart?.(cart.cartId, {
                idempotencyKey: `market-checkout:${cart.cartId}:${cart.revision}`,
                paymentSource: "CREDITS"
              }) : { ok: false, reason: "MARKET_CART_NOT_FOUND" };
              if (result?.ok) {
                setMarketWorkspaceCartOpen(citizenId, false);
                setMarketWorkspaceOrderView(citizenId, "ACTIVE");
                setMarketWorkspaceMode(citizenId, "ORDERS");
                const operation = String(result.operation || "").toUpperCase();
                const servicePending = ["SERVICE_PENDING", "SERVICE_PENDING_REPLAY"].includes(operation);
                const pickupReady = ["PICKUP_READY", "PICKUP_READY_REPLAY"].includes(operation);
                setMarketFeedback(
                  citizenId,
                  servicePending
                    ? `Purchase authorized: ${result.createdItemInstanceIds.length} ItemInstance in Service custody / ${result.linkedServiceOrderIds?.length || 0} Service Order scheduled.`
                    : pickupReady
                      ? `Pickup ready: ${result.createdItemInstanceIds.length} ItemInstance in vendor custody until ${result.pickupFulfillment?.expiresAt || "reservation expiry"}.`
                      : `Checkout completed: ${result.createdItemInstanceIds.length} ItemInstance record${result.createdItemInstanceIds.length === 1 ? "" : "s"}.`,
                  "OK"
                );
              } else {
                setMarketFeedback(citizenId, `Checkout failed: ${String(result?.reason || "UNKNOWN").replace(/_/g, " ")}.`, "ERROR");
              }
              renderMarketModule(user);
              return true;
            }
      
      const marketResetButton = event.target.closest?.("[data-housing-market-reset-filters]");
      
      if (marketResetButton) {
              resetMarketWorkspaceFilters(citizenId);
              setMarketWorkspaceSelectedProductId(citizenId, "");
              setMarketWorkspaceTab(citizenId, "MARKET");
              setMarketFeedback(citizenId, "");
              renderMarketModule(user);
              return true;
            }
      return false;
    }

    return {
      makeMarketWorkspaceId,
      parseVisibleAddress,
      getMarketOrganizationLocationSource,
      resolveMarketWorkspaceVendor,
      resolveMarketShippingRoute,
      normalizeMarketWorkspaceMode,
      getMarketWorkspaceMode,
      setMarketWorkspaceMode,
      normalizeMarketWorkspaceOrderView,
      getMarketWorkspaceOrderView,
      setMarketWorkspaceOrderView,
      syncMarketWorkspaceModeToOrder,
      getMarketSelectedOrderId,
      setMarketSelectedOrderId,
      getMarketWorkspaceSelectedProductId,
      setMarketWorkspaceSelectedProductId,
      getDefaultMarketWorkspaceFilters,
      normalizeMarketWorkspaceFilters,
      getMarketWorkspaceFilters,
      setMarketWorkspaceFilters,
      resetMarketWorkspaceFilters,
      normalizeEquipmentCatalogFallback,
      getMarketWorkspaceCatalogItems,
      getMarketWorkspacePrice,
      getMarketWorkspaceCatalogItemById,
      getMarketWorkspaceItemTokens,
      hasMarketWorkspaceItemToken,
      getMarketWorkspaceDepartment,
      getMarketWorkspaceSubcategory,
      getMarketWorkspaceItemType,
      getMarketWorkspaceItemKind,
      getMarketWorkspaceCyberwareKind,
      getMarketWorkspaceManufacturer,
      getMarketWorkspaceItemTier,
      getMarketWorkspaceItemStatus,
      getMarketWorkspaceFilterOptions,
      getMarketWorkspaceSearchText,
      filterMarketWorkspaceItems,
      sortMarketWorkspaceItems,
      getSubscriptionTierLevel,
      hasRequiredSubscription,
      isMarketWorkspaceCyberwareItem,
      getMarketWorkspaceCartOpen,
      setMarketWorkspaceCartOpen,
      getMarketWorkspaceWishlistOpen,
      setMarketWorkspaceWishlistOpen,
      getMarketWorkspaceActiveWishlistId,
      setMarketWorkspaceActiveWishlistId,
      getMarketWorkspacePendingWishlistItem,
      setMarketWorkspacePendingWishlistItem,
      getMarketWorkspaceDialogFocusables,
      focusMarketWorkspaceDialog,
      trapMarketWorkspaceDialogFocus,
      isolateMarketWorkspaceModal,
      syncMarketWorkspaceModalState,
      closeMarketWorkspaceCart,
      closeMarketWorkspaceWishlist,
      resetMarketWorkspaceTransientUi,
      getMarketWorkspaceDraftCart,
      getMarketWorkspaceCartContext,
      getMarketWorkspaceAvailability,
      addMarketWorkspaceOfferToCart,
      addMarketWorkspaceOfferForPickupToCart,
      addMarketWorkspaceOfferWithServiceToCart,
      updateMarketWorkspaceCartQuantity,
      removeMarketWorkspaceCartLine,
      clearMarketWorkspaceCart,
      formatMarketWorkspaceStoreLabel,
      renderMarketWorkspaceModeTabs,
      renderMarketWorkspaceDepartmentNavigation,
      renderMarketWorkspaceCatalogToolbar,
      getMarketWorkspaceProductFacts,
      getMarketWorkspaceProductRestrictions,
      getMarketWorkspaceProductCatalogId,
      getMarketWorkspaceProductDescription,
      getMarketWorkspaceInspectorFacts,
      getMarketWorkspaceInspectorRequirements,
      getMarketWorkspaceInspectorFulfillment,
      getMarketWorkspaceInspectorQuantityMax,
      renderMarketWorkspaceInspectorRows,
      renderMarketWorkspaceProductInspectorContent,
      renderMarketWorkspaceProductInspectorLayer,
      getMarketWorkspaceWishlistLineProduct,
      getMarketWorkspaceWishlistContext,
      renderMarketWorkspaceWishlistLine,
      renderMarketWorkspaceWishlistDrawer,
      openMarketWorkspaceWishlist,
      syncMarketWorkspaceProductInspectorTotal,
      openMarketWorkspaceProductInspector,
      closeMarketWorkspaceProductInspector,
      renderMarketWorkspaceProductCard,
      getMarketWorkspacePagination,
      getMarketWorkspacePagerPages,
      renderMarketWorkspacePagination,
      renderMarketWorkspaceCatalog,
      formatMarketWorkspaceBlocker,
      renderMarketWorkspaceCartDrawer,
      getCanonicalMarketWorkspaceOrders,
      isCanonicalMarketWorkspaceOrderActive,
      getCanonicalMarketWorkspaceOrderProductName,
      formatCanonicalMarketOrderStatus,
      renderCanonicalMarketOrderLines,
      renderCanonicalMarketPartialReturnWorkspace,
      renderCanonicalMarketOrderDetails,
      renderCanonicalMarketWorkspaceOrderCard,
      renderMarketOrderPanel,
      renderMarketWorkspaceCommandBar,
      renderMarketWorkspaceTab,
      handleMarketWorkspaceChange,
      handleMarketWorkspaceInput,
      handleMarketWorkspaceKeydown,
      handleMarketWorkspaceBackNavigation,
      handleMarketWorkspaceClick
    };
  };
})();
