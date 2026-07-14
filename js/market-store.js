window.WS_APP = window.WS_APP || {};

(function initMarketStoreModule() {
  const CART_STORAGE_KEY = "ws_market_carts_v1";
  const ORDER_STORAGE_KEY = "ws_market_orders_v1";
  const STOCK_STORAGE_KEY = "ws_market_stock_v1";
  const MARKET_OFFER_SCHEMA_VERSION = 2;
  const MARKET_CART_SCHEMA_VERSION = 1;
  const MARKET_ORDER_SCHEMA_VERSION = 6;
  const MARKET_SHIPMENT_SCHEMA_VERSION = 1;
  const MARKET_DELIVERY_FULFILLMENT_SCHEMA_VERSION = "market_delivery_fulfillment_6_3x";
  const MARKET_SERVICE_FULFILLMENT_SCHEMA_VERSION = "market_service_fulfillment_4_3x";
  const MARKET_PICKUP_FULFILLMENT_SCHEMA_VERSION = "market_pickup_fulfillment_6_0x";
  const AVAILABILITY_STATUSES = new Set(["AVAILABLE", "LIMITED", "RESTRICTED", "OUT_OF_STOCK", "UNAVAILABLE", "BLOCKED"]);
  const FULFILLMENT_MODES = new Set(["DELIVER_TO_HOUSING", "PICKUP", "PURCHASE_WITH_SERVICE"]);
  const CART_STATUSES = new Set(["DRAFT", "CHECKOUT_PENDING", "CHECKED_OUT", "CANCELLED", "EXPIRED"]);
  const MARKET_ORDER_STATUSES = new Set(["DRAFT", "RESERVING", "AUTHORIZED", "FULFILLING", "COMPLETED", "RETURNING", "REFUNDED", "FAILED", "CANCELLED", "PAYMENT_RECOVERY_REQUIRED"]);
  const MARKET_ORDER_CANCELLABLE_STATUSES = new Set(["DRAFT", "RESERVING", "AUTHORIZED", "FULFILLING"]);
  const MARKET_ORDER_CHECKOUT_RETRY_STATUSES = new Set(["DRAFT", "RESERVING", "AUTHORIZED", "FULFILLING"]);
  const MARKET_REFUND_REQUEST_STATUSES = new Set(["NONE", "REQUESTED", "WITHDRAWN", "APPROVED", "PROCESSING", "RECOVERY_REQUIRED", "REJECTED", "COMPLETED"]);
  const MARKET_PARTIAL_RETURN_STATUSES = new Set(["REQUESTED", "WITHDRAWN", "PROCESSING", "RECOVERY_REQUIRED", "COMPLETED"]);
  const MARKET_SHIPMENT_STATUSES = new Set(["PENDING", "PACKED", "IN_TRANSIT", "PROCESSING", "HELD", "RECOVERY_REQUIRED", "DELIVERED", "CANCELLED"]);
  const MARKET_SHIPMENT_TERMINAL_STATUSES = new Set(["DELIVERED", "CANCELLED"]);
  const MARKET_SHIPMENT_FORCE_TOKEN = Symbol("MARKET_SHIPMENT_FORCE");
  const MARKET_SHIPMENT_TRANSITIONS = Object.freeze({
    PENDING: new Set(["PENDING", "PACKED", "IN_TRANSIT", "RECOVERY_REQUIRED", "CANCELLED"]),
    PACKED: new Set(["PACKED", "IN_TRANSIT", "PROCESSING", "RECOVERY_REQUIRED", "CANCELLED"]),
    IN_TRANSIT: new Set(["IN_TRANSIT", "PROCESSING", "HELD", "RECOVERY_REQUIRED", "DELIVERED", "CANCELLED"]),
    PROCESSING: new Set(["PROCESSING", "HELD", "RECOVERY_REQUIRED", "DELIVERED", "CANCELLED"]),
    HELD: new Set(["HELD", "PROCESSING", "RECOVERY_REQUIRED", "DELIVERED", "CANCELLED"]),
    RECOVERY_REQUIRED: new Set(["RECOVERY_REQUIRED", "PROCESSING", "HELD", "DELIVERED", "CANCELLED"]),
    DELIVERED: new Set(["DELIVERED"]),
    CANCELLED: new Set(["CANCELLED"])
  });
  const ACTIVE_STOCK_RESERVATION_STATUSES = new Set(["RESERVED"]);
  const MARKET_ORDER_TRANSITIONS = Object.freeze({
    DRAFT: new Set(["DRAFT", "RESERVING", "FAILED", "CANCELLED"]),
    RESERVING: new Set(["RESERVING", "AUTHORIZED", "FAILED", "CANCELLED", "PAYMENT_RECOVERY_REQUIRED"]),
    AUTHORIZED: new Set(["AUTHORIZED", "FULFILLING", "FAILED", "CANCELLED", "PAYMENT_RECOVERY_REQUIRED"]),
    FULFILLING: new Set(["FULFILLING", "COMPLETED", "FAILED", "CANCELLED", "PAYMENT_RECOVERY_REQUIRED"]),
    COMPLETED: new Set(["COMPLETED", "RETURNING", "REFUNDED", "PAYMENT_RECOVERY_REQUIRED"]),
    RETURNING: new Set(["RETURNING", "COMPLETED", "REFUNDED", "FAILED", "PAYMENT_RECOVERY_REQUIRED"]),
    REFUNDED: new Set(["REFUNDED"]),
    FAILED: new Set(["FAILED", "CANCELLED", "PAYMENT_RECOVERY_REQUIRED"]),
    CANCELLED: new Set(["CANCELLED"]),
    PAYMENT_RECOVERY_REQUIRED: new Set(["PAYMENT_RECOVERY_REQUIRED", "COMPLETED", "FAILED", "CANCELLED", "RETURNING", "REFUNDED"])
  });

  let offerIndex = null;
  let offersByVendorProviderId = null;
  let offersByCatalogItemId = null;
  let baseStockByOfferId = new Map();
  let offerList = null;
  let offerRevision = 0;
  let indexedEquipmentRevision = -1;
  let cartsById = readStoredCarts();
  const storedMarketOrderState = readStoredMarketOrders();
  let marketOrdersById = storedMarketOrderState.orders;
  let marketShipmentsById = storedMarketOrderState.shipments;
  let stockRuntimeByOfferId = readStoredMarketStock();
  let marketOrderIdByIdempotencyKey = new Map();
  let marketOrderIdByServiceOrderId = new Map();
  let marketShipmentIdByOrderId = new Map();
  let lastMarketOrderEventRevisionById = new Map();
  let lastMarketShipmentEventRevisionById = new Map();
  let finalMarketCommitEventsByOrderId = new Set();
  let serviceCompensationInProgressOrderIds = new Set();
  let cartPersistenceTimer = 0;
  let marketBridgeDiagnostics = createMarketBridgeDiagnostics();

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function normalizeToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function slug(value = "") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "entry";
  }

  function clampInteger(value, min = 0, max = 999999) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function getWorldTime() {
    return String(window.WS_APP.getCampaignDateIso?.() || window.WS_APP.CAMPAIGN_DATE_ISO || "2109-02-13").trim();
  }

  function makeRuntimeId(prefix = "market") {
    return `${slug(prefix)}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function stableToken(value = "") {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function makeDeterministicId(prefix = "market", key = "") {
    return `${slug(prefix)}_${stableToken(key)}`;
  }

  function createMarketBridgeDiagnostics() {
    return {
      orderEventsEmitted: 0,
      duplicateOrderEventsSuppressed: 0,
      stockEventsEmitted: 0,
      itemCommitEventsEmitted: 0,
      duplicateFinalCommitEventsSuppressed: 0,
      checkoutAttempts: 0,
      checkoutRetries: 0,
      checkoutIdempotentReplays: 0,
      cancellationAttempts: 0,
      cancellationRecoveryAttempts: 0,
      refundRequests: 0,
      refundRequestReplays: 0,
      refundRequestConflicts: 0,
      refundExecutions: 0,
      refundExecutionReplays: 0,
      refundRecoveryAttempts: 0,
      partialReturnRequests: 0,
      partialReturnRequestReplays: 0,
      partialReturnExecutions: 0,
      partialReturnExecutionReplays: 0,
      partialReturnRecoveryAttempts: 0,
      partialReturnsCompleted: 0,
      interruptedPartialReturnsReconciled: 0,
      interruptedRefundsReconciled: 0,
      interruptedCancellationsReconciled: 0,
      serviceFulfillmentQuotes: 0,
      serviceFulfillmentStarts: 0,
      serviceFulfillmentReplays: 0,
      serviceFulfillmentCompletions: 0,
      serviceFulfillmentFailures: 0,
      serviceFulfillmentRecoveries: 0,
      pickupFulfillmentQuotes: 0,
      pickupFulfillmentStarts: 0,
      pickupFulfillmentReady: 0,
      pickupFulfillmentCompletions: 0,
      pickupFulfillmentReplays: 0,
      pickupFulfillmentExpirations: 0,
      pickupFulfillmentRecoveries: 0,
      pickupFulfillmentFailures: 0,
      deliveryFulfillmentStarts: 0,
      deliveryFulfillmentInTransit: 0,
      deliveryFulfillmentAttempts: 0,
      deliveryFulfillmentDelivered: 0,
      deliveryFulfillmentHeld: 0,
      deliveryFulfillmentRecoveries: 0,
      deliveryFulfillmentFailures: 0,
      deliveryAdminForces: 0
    };
  }

  function getMarketBridgeDiagnostics() {
    return clone(marketBridgeDiagnostics);
  }

  function resetMarketBridgeDiagnostics() {
    marketBridgeDiagnostics = createMarketBridgeDiagnostics();
    lastMarketOrderEventRevisionById = new Map();
    lastMarketShipmentEventRevisionById = new Map();
    finalMarketCommitEventsByOrderId = new Set();
    return getMarketBridgeDiagnostics();
  }

  function getMarketConfig() {
    const source = window.APP_DATA?.marketOfferConfig;
    return source && typeof source === "object" && !Array.isArray(source) ? source : {};
  }

  function getMarketOverrides() {
    return (Array.isArray(window.APP_DATA?.marketOfferOverrides) ? window.APP_DATA.marketOfferOverrides : [])
      .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry));
  }

  function getServiceFulfillmentConfig() {
    const source = getMarketConfig().serviceFulfillment;
    return source && typeof source === "object" && !Array.isArray(source) ? source : {};
  }

  function getPickupFulfillmentConfig() {
    const source = getMarketConfig().pickupFulfillment;
    return source && typeof source === "object" && !Array.isArray(source) ? source : {};
  }

  function getDeliveryFulfillmentConfig() {
    const source = getMarketConfig().deliveryFulfillment;
    return source && typeof source === "object" && !Array.isArray(source) ? source : {};
  }

  function addWorldDays(value = "", days = 0) {
    const normalized = normalizeId(value) || getWorldTime();
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(normalized);
    const parsed = Date.parse(dateOnly ? `${normalized}T00:00:00.000Z` : normalized);
    if (!Number.isFinite(parsed)) return normalized;
    const next = new Date(parsed + clampInteger(days, 0, 3650) * 86400000);
    return dateOnly ? next.toISOString().slice(0, 10) : next.toISOString();
  }

  function compareWorldTimes(left = "", right = "") {
    const parse = (value) => {
      const normalized = normalizeId(value);
      if (!normalized) return Number.NaN;
      return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(normalized) ? `${normalized}T00:00:00.000Z` : normalized);
    };
    const leftTime = parse(left);
    const rightTime = parse(right);
    if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return String(left || "").localeCompare(String(right || ""));
    return leftTime - rightTime;
  }

  function getPickupReservationDays() {
    const config = getPickupFulfillmentConfig();
    const min = clampInteger(config.minReservationDays ?? 1, 1, 3650);
    const max = clampInteger(config.maxReservationDays ?? 30, min, 3650);
    return clampInteger(config.defaultReservationDays ?? 3, min, max);
  }

  function normalizeProviderCandidateList(values = []) {
    return [...new Set((Array.isArray(values) ? values : [values]).map(normalizeId).filter(Boolean))];
  }

  function resolveOfferServiceLinkage(product = {}, override = {}) {
    const config = getServiceFulfillmentConfig();
    const explicitDefinitions = Array.isArray(override.linkedServiceDefinitionIds)
      ? override.linkedServiceDefinitionIds
      : [];
    const explicitProviders = Array.isArray(override.linkedServiceProviderIds)
      ? override.linkedServiceProviderIds
      : [];
    const serviceDefinitionIds = [...new Set([
      ...explicitDefinitions,
      override.linkedServiceDefinitionId,
      product.linkedServiceDefinitionId,
      config.defaultServiceDefinitionId
    ].map(normalizeId).filter(Boolean))];
    const manufacturerKey = normalizeToken(product.manufacturer || product.provider || product.corporation || "").replace(/_/g, " ");
    const configuredProviders = config.manufacturerProviderIds?.[manufacturerKey]
      || config.manufacturerProviderIds?.[normalizeToken(product.manufacturer || product.provider || product.corporation || "")]
      || [];
    const providerIds = normalizeProviderCandidateList([
      ...explicitProviders,
      override.linkedServiceProviderId,
      ...normalizeProviderCandidateList(configuredProviders),
      ...normalizeProviderCandidateList(config.fallbackProviderIds)
    ]);
    return { serviceDefinitionIds, providerIds };
  }

  function normalizeLinkedServiceSelection(value = {}, offer = null) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const definitionCandidates = Array.isArray(offer?.linkedServiceDefinitionIds) ? offer.linkedServiceDefinitionIds : [];
    const providerCandidates = Array.isArray(offer?.linkedServiceProviderIds) ? offer.linkedServiceProviderIds : [];
    const requestedDefinitionId = normalizeId(source.serviceDefinitionId);
    const serviceDefinitionId = requestedDefinitionId && definitionCandidates.includes(requestedDefinitionId)
      ? requestedDefinitionId
      : normalizeId(definitionCandidates[0]);
    const requestedProviderId = normalizeId(source.providerId || source.serviceProviderId);
    const candidateProviderIds = normalizeProviderCandidateList([
      requestedProviderId,
      ...providerCandidates
    ]);
    const providerId = candidateProviderIds.find((candidate) => {
      if (typeof window.WS_APP.providerSupports !== "function") return candidate === requestedProviderId || candidate === providerCandidates[0];
      return window.WS_APP.providerSupports(candidate, "CYBERWARE_INSTALL") === true;
    }) || "";
    const configuredTargetBodySlots = Array.isArray(source.targetBodySlots) ? source.targetBodySlots : [];
    const catalogTargetBodySlots = [
      ...(Array.isArray(offer?.catalogItem?.slots) ? offer.catalogItem.slots : []),
      offer?.catalogItem?.primarySlot,
      offer?.catalogItem?.slot
    ];
    return {
      serviceDefinitionId,
      providerId,
      targetCharacterId: normalizeId(source.targetCharacterId),
      targetBodySlots: [...new Set((configuredTargetBodySlots.length ? configuredTargetBodySlots : catalogTargetBodySlots).map(normalizeId).filter(Boolean))],
      scheduledStartAt: normalizeId(source.scheduledStartAt || source.startAt),
      estimatedEndAt: normalizeId(source.estimatedEndAt || source.endAt),
      coverageAuthorizations: [...new Set((Array.isArray(source.coverageAuthorizations || source.authorizationCodes) ? (source.coverageAuthorizations || source.authorizationCodes) : []).map(normalizeId).filter(Boolean))]
    };
  }

  function getOrganizationProviderIdentity(query = "") {
    if (!query) return null;
    const organization = window.WS_APP.getOrganizationByProviderId?.(query)
      || window.WS_APP.findOrganization?.(query)
      || null;
    if (!organization) return null;
    const providerId = normalizeId(organization.providerIds?.[0]);
    return providerId ? {
      providerId,
      displayName: normalizeId(organization.shortName || organization.name || providerId),
      organizationId: normalizeId(organization.id)
    } : null;
  }

  function resolveOfferProvider(product = {}, override = {}) {
    const config = getMarketConfig();
    const category = normalizeToken(product.category || "DEFAULT") || "DEFAULT";
    const configured = config.categoryProviders?.[category] || config.categoryProviders?.DEFAULT || {};
    const explicitProviderId = normalizeId(override.vendorProviderId || override.providerId || product.vendorProviderId || product.providerId);
    const organizationIdentity = getOrganizationProviderIdentity(explicitProviderId)
      || getOrganizationProviderIdentity(product.provider || product.manufacturer)
      || getOrganizationProviderIdentity(configured.providerId);
    const providerId = explicitProviderId || organizationIdentity?.providerId || normalizeId(configured.providerId) || "provider-habitat-ledger";
    const organizationLocationId = normalizeId(override.organizationLocationId || product.organizationLocationId || configured.organizationLocationId);
    const locationSource = organizationLocationId ? window.WS_APP.resolveOrganizationLocationSource?.(organizationLocationId) : null;
    return {
      providerId,
      displayName: normalizeId(override.vendorDisplayName || organizationIdentity?.displayName || locationSource?.organizationName || product.provider || product.manufacturer || providerId),
      organizationId: normalizeId(organizationIdentity?.organizationId || locationSource?.organizationId),
      organizationLocationId,
      sourceInstitutionId: normalizeId(override.sourceInstitutionId || locationSource?.sourceInstitutionId || organizationLocationId),
      sourceAddress: normalizeId(override.sourceAddress || locationSource?.sourceAddress)
    };
  }

  function isCyberwareProduct(product = {}) {
    const category = normalizeToken(product.category);
    const subtype = normalizeToken(product.subtype);
    const tags = Array.isArray(product.tags) ? product.tags.map(normalizeToken) : [];
    return product.cyberwareCandidate === true
      || category === "CYBERWARE"
      || ["IMPLANT", "BIOWARE", "NEUROCHIP", "INTERFACE", "SERVICE_PORT"].includes(subtype)
      || tags.includes("CYBERWARE");
  }

  function normalizeStock(value = {}, fallbackMode = "UNLIMITED") {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const mode = normalizeToken(source.mode || fallbackMode) === "FINITE" ? "FINITE" : "UNLIMITED";
    return {
      mode,
      availableQuantity: mode === "FINITE" ? clampInteger(source.availableQuantity ?? source.quantity, 0, 999999) : null,
      reservedQuantity: mode === "FINITE" ? clampInteger(source.reservedQuantity, 0, 999999) : 0
    };
  }

  function getOfferStockRuntime(marketOfferId = "") {
    const id = normalizeId(marketOfferId);
    const source = stockRuntimeByOfferId[id] && typeof stockRuntimeByOfferId[id] === "object" ? stockRuntimeByOfferId[id] : {};
    const reservations = source.reservations && typeof source.reservations === "object" && !Array.isArray(source.reservations) ? source.reservations : {};
    return {
      soldQuantity: clampInteger(source.soldQuantity, 0, 999999),
      reservations: clone(reservations)
    };
  }

  function resolveRuntimeStock(marketOfferId = "", baseStock = {}) {
    const normalizedBase = normalizeStock(baseStock, baseStock?.mode || "UNLIMITED");
    if (normalizedBase.mode !== "FINITE") return normalizedBase;
    const runtime = getOfferStockRuntime(marketOfferId);
    const reservedQuantity = Object.values(runtime.reservations).reduce((sum, reservation) => {
      return ACTIVE_STOCK_RESERVATION_STATUSES.has(normalizeToken(reservation?.status)) ? sum + clampInteger(reservation?.quantity, 0, 999999) : sum;
    }, 0);
    return {
      mode: "FINITE",
      availableQuantity: Math.max(0, clampInteger(normalizedBase.availableQuantity, 0, 999999) - runtime.soldQuantity),
      reservedQuantity
    };
  }

  function refreshIndexedOfferStock(marketOfferId = "") {
    const id = normalizeId(marketOfferId);
    if (!id || !offerIndex?.has(id)) return null;
    const offer = offerIndex.get(id);
    offer.stock = resolveRuntimeStock(id, baseStockByOfferId.get(id) || offer.stock);
    return offer;
  }

  function normalizePurchaseRequirements(product = {}, value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const entitlementCodes = Array.isArray(source.requiredEntitlements) ? [...source.requiredEntitlements] : [];
    const subscriptionCategory = normalizeToken(product.requiresSubscriptionCategory || product.subscriptionCategory);
    const subscriptionTier = clampInteger(product.requiresSubscriptionTier ?? product.subscriptionTierRequired, 0, 99);
    if (subscriptionCategory) entitlementCodes.push(`${subscriptionCategory}${subscriptionTier ? `_T${subscriptionTier}` : ""}`);
    return {
      requiredLicenseCodes: [...new Set((Array.isArray(source.requiredLicenseCodes) ? source.requiredLicenseCodes : []).map(normalizeId).filter(Boolean))],
      requiredEntitlements: [...new Set(entitlementCodes.map(normalizeId).filter(Boolean))],
      requiredAccessLevel: normalizeId(source.requiredAccessLevel) || null,
      allowedCitizenClasses: [...new Set((Array.isArray(source.allowedCitizenClasses) ? source.allowedCitizenClasses : []).map(normalizeToken).filter(Boolean))],
      blockers: [...new Set((Array.isArray(source.blockers) ? source.blockers : []).map(normalizeToken).filter(Boolean))]
    };
  }

  function buildOffer(product = {}, override = {}, index = 0) {
    const config = getMarketConfig();
    const catalogItemId = normalizeId(override.catalogItemId || product.catalogId || product.id);
    if (!catalogItemId) return null;
    const provider = resolveOfferProvider(product, override);
    const basePrice = clampInteger(override.pricing?.basePrice ?? override.basePrice ?? product.marketPrice ?? product.price ?? product.value, 0, 999999999);
    const finalPrice = clampInteger(override.pricing?.finalPrice ?? override.finalPrice ?? basePrice, 0, 999999999);
    const availability = normalizeToken(override.availability || config.defaultAvailability || "AVAILABLE");
    const cyberware = isCyberwareProduct(product);
    const defaultFulfillment = Array.isArray(config.defaultFulfillmentOptions) ? config.defaultFulfillmentOptions : ["DELIVER_TO_HOUSING"];
    const requestedFulfillment = Array.isArray(override.fulfillmentOptions)
      ? override.fulfillmentOptions
      : cyberware
        ? [...defaultFulfillment, "PURCHASE_WITH_SERVICE"]
        : defaultFulfillment;
    const fulfillmentOptions = [...new Set(requestedFulfillment.map(normalizeToken).filter((mode) => FULFILLMENT_MODES.has(mode)))];
    const marketOfferId = normalizeId(override.marketOfferId) || `market_offer_${slug(catalogItemId)}`;
    const baseStock = normalizeStock(override.stock, config.defaultStockMode || "UNLIMITED");
    const serviceLinkage = cyberware ? resolveOfferServiceLinkage(product, override) : { serviceDefinitionIds: [], providerIds: [] };
    return {
      schemaVersion: MARKET_OFFER_SCHEMA_VERSION,
      marketOfferId,
      vendorProviderId: provider.providerId,
      vendorDisplayName: provider.displayName,
      organizationId: provider.organizationId,
      organizationLocationId: provider.organizationLocationId,
      sourceInstitutionId: provider.sourceInstitutionId,
      sourceAddress: provider.sourceAddress,
      catalogItemId,
      definitionId: normalizeId(override.definitionId || product.definitionId || catalogItemId),
      offerType: normalizeToken(override.offerType || "PHYSICAL_ITEM"),
      availability: AVAILABILITY_STATUSES.has(availability) ? availability : "UNAVAILABLE",
      stock: resolveRuntimeStock(marketOfferId, baseStock),
      pricing: {
        basePrice,
        currency: normalizeToken(override.pricing?.currency || override.currency || config.defaultCurrency || "CREDIT"),
        modifiers: Array.isArray(override.pricing?.modifiers) ? clone(override.pricing.modifiers) : [],
        finalPrice
      },
      purchaseRequirements: normalizePurchaseRequirements(product, override.purchaseRequirements),
      fulfillmentOptions: fulfillmentOptions.length ? fulfillmentOptions : ["DELIVER_TO_HOUSING"],
      linkedServiceDefinitionIds: serviceLinkage.serviceDefinitionIds,
      linkedServiceProviderIds: serviceLinkage.providerIds,
      activeFrom: normalizeId(override.activeFrom) || null,
      expiresAt: normalizeId(override.expiresAt) || null,
      active: override.active !== false && product.archived !== true,
      revision: clampInteger(override.revision || 1, 1, 999999),
      catalogItem: clone(product),
      sourceIndex: index
    };
  }

  function rebuildMarketOfferIndex() {
    const products = window.WS_APP.getEquipmentCatalogItems?.({ includeArchived: true }) || [];
    const overrides = getMarketOverrides();
    const overridesByCatalogId = new Map();
    overrides.forEach((entry) => {
      const catalogItemId = normalizeId(entry.catalogItemId || entry.definitionId);
      if (!catalogItemId) return;
      if (!overridesByCatalogId.has(catalogItemId)) overridesByCatalogId.set(catalogItemId, []);
      overridesByCatalogId.get(catalogItemId).push(entry);
    });

    const nextOffers = [];
    products.forEach((product, index) => {
      const catalogItemId = normalizeId(product.catalogId || product.id);
      const productOverrides = overridesByCatalogId.get(catalogItemId) || [];
      if (productOverrides.length) {
        productOverrides.forEach((override, overrideIndex) => {
          const offer = buildOffer(product, override, index + overrideIndex);
          if (offer) nextOffers.push(offer);
        });
        return;
      }
      const offer = buildOffer(product, {}, index);
      if (offer) nextOffers.push(offer);
    });

    const nextById = new Map();
    const nextByVendor = new Map();
    const nextByCatalog = new Map();
    const nextBaseStock = new Map();
    nextOffers.forEach((offer) => {
      if (nextById.has(offer.marketOfferId)) return;
      nextById.set(offer.marketOfferId, offer);
      const override = overrides.find((entry) => normalizeId(entry.marketOfferId) === offer.marketOfferId || normalizeId(entry.catalogItemId || entry.definitionId) === offer.catalogItemId) || {};
      nextBaseStock.set(offer.marketOfferId, normalizeStock(override.stock, getMarketConfig().defaultStockMode || "UNLIMITED"));
      if (!nextByVendor.has(offer.vendorProviderId)) nextByVendor.set(offer.vendorProviderId, []);
      nextByVendor.get(offer.vendorProviderId).push(offer);
      if (!nextByCatalog.has(offer.catalogItemId)) nextByCatalog.set(offer.catalogItemId, []);
      nextByCatalog.get(offer.catalogItemId).push(offer);
    });

    offerIndex = nextById;
    offersByVendorProviderId = nextByVendor;
    offersByCatalogItemId = nextByCatalog;
    baseStockByOfferId = nextBaseStock;
    offerList = [...nextById.values()];
    indexedEquipmentRevision = Number(window.WS_APP.getEquipmentCatalogRevision?.() || 0);
    offerRevision += 1;
    return offerList;
  }

  function ensureMarketOfferIndex() {
    const equipmentRevision = Number(window.WS_APP.getEquipmentCatalogRevision?.() || 0);
    if (!offerIndex || equipmentRevision !== indexedEquipmentRevision) rebuildMarketOfferIndex();
    return offerList || [];
  }

  function invalidateMarketOffers(providerId = "") {
    offerIndex = null;
    offersByVendorProviderId = null;
    offersByCatalogItemId = null;
    offerList = null;
    indexedEquipmentRevision = -1;
    offerRevision += 1;
    window.dispatchEvent(new CustomEvent("ws:market-offers-invalidated", {
      detail: { providerId: normalizeId(providerId), revision: offerRevision }
    }));
    return offerRevision;
  }

  function getMarketOffer(marketOfferId = "") {
    const id = normalizeId(marketOfferId);
    if (!id) return null;
    ensureMarketOfferIndex();
    const offer = offerIndex.get(id) || null;
    return offer ? clone(offer) : null;
  }

  function getMarketOffersByCatalogItemId(catalogItemId = "") {
    const id = normalizeId(catalogItemId);
    if (!id) return [];
    ensureMarketOfferIndex();
    return clone(offersByCatalogItemId.get(id) || []);
  }

  function getMarketOfferByCatalogItemId(catalogItemId = "") {
    return getMarketOffersByCatalogItemId(catalogItemId)[0] || null;
  }

  function getVendorOffers(providerId = "", filters = {}) {
    const id = normalizeId(providerId);
    if (!id) return [];
    ensureMarketOfferIndex();
    return filterOffers(offersByVendorProviderId.get(id) || [], filters);
  }

  function getOfferSearchText(offer = {}) {
    const product = offer.catalogItem || {};
    return [
      offer.marketOfferId,
      offer.vendorProviderId,
      offer.vendorDisplayName,
      offer.catalogItemId,
      product.name,
      product.category,
      product.subtype,
      product.manufacturer,
      product.provider,
      product.legality,
      ...(Array.isArray(product.tags) ? product.tags : [])
    ].map((value) => String(value || "").toUpperCase()).join(" ");
  }

  function filterOffers(source = [], filters = {}) {
    const query = String(filters.query || filters.search || "").trim().toUpperCase();
    const providerId = normalizeId(filters.providerId || filters.vendorProviderId);
    const catalogItemId = normalizeId(filters.catalogItemId);
    const category = normalizeToken(filters.category);
    const availability = normalizeToken(filters.availability);
    const includeInactive = filters.includeInactive === true;
    const activeWorldTime = getWorldTime();
    return clone(source.filter((offer) => {
      if (!includeInactive && !offer.active) return false;
      if (!includeInactive && offer.activeFrom && offer.activeFrom > activeWorldTime) return false;
      if (!includeInactive && offer.expiresAt && offer.expiresAt < activeWorldTime) return false;
      if (providerId && offer.vendorProviderId !== providerId) return false;
      if (catalogItemId && offer.catalogItemId !== catalogItemId) return false;
      if (category && normalizeToken(offer.catalogItem?.category) !== category) return false;
      if (availability && offer.availability !== availability) return false;
      if (query && !getOfferSearchText(offer).includes(query)) return false;
      return true;
    }));
  }

  function searchMarketOffers(filters = {}) {
    ensureMarketOfferIndex();
    if (filters.providerId || filters.vendorProviderId) return getVendorOffers(filters.providerId || filters.vendorProviderId, filters);
    if (filters.catalogItemId) return filterOffers(offersByCatalogItemId.get(normalizeId(filters.catalogItemId)) || [], filters);
    return filterOffers(offerList || [], filters);
  }

  function getMarketOfferRevision() {
    ensureMarketOfferIndex();
    return offerRevision;
  }

  function projectMarketOfferCatalogItem(offerOrId = "") {
    const offer = typeof offerOrId === "object" && offerOrId
      ? offerOrId
      : getMarketOffer(offerOrId);
    if (!offer?.catalogItem) return null;
    return {
      ...clone(offer.catalogItem),
      marketOfferId: offer.marketOfferId,
      marketOfferRevision: offer.revision,
      vendorProviderId: offer.vendorProviderId,
      vendorName: offer.vendorDisplayName,
      organizationId: offer.organizationId,
      organizationLocationId: offer.organizationLocationId,
      sourceInstitutionId: offer.sourceInstitutionId,
      sourceAddress: offer.sourceAddress,
      marketPrice: offer.pricing.finalPrice,
      currency: offer.pricing.currency,
      marketAvailability: offer.availability,
      stock: clone(offer.stock),
      fulfillmentOptions: [...offer.fulfillmentOptions],
      linkedServiceDefinitionIds: [...offer.linkedServiceDefinitionIds],
      linkedServiceProviderIds: [...(offer.linkedServiceProviderIds || [])]
    };
  }

  function getMarketCatalogItems(filters = {}) {
    return searchMarketOffers(filters).map(projectMarketOfferCatalogItem).filter(Boolean);
  }

  function readStoredCarts() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "null");
      const records = Array.isArray(parsed?.carts) ? parsed.carts : [];
      return Object.fromEntries(records.filter((cart) => cart?.cartId).map((cart) => [cart.cartId, cart]));
    } catch (error) {
      console.warn("W&S market cart store could not read localStorage.", error);
      return Object.create(null);
    }
  }

  function flushMarketCartPersistence() {
    if (cartPersistenceTimer) window.clearTimeout(cartPersistenceTimer);
    cartPersistenceTimer = 0;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
        schemaVersion: MARKET_CART_SCHEMA_VERSION,
        carts: Object.values(cartsById)
      }));
      return true;
    } catch (error) {
      console.warn("W&S market cart store could not persist localStorage.", error);
      return false;
    }
  }

  function scheduleMarketCartPersistence() {
    if (cartPersistenceTimer) window.clearTimeout(cartPersistenceTimer);
    cartPersistenceTimer = window.setTimeout(flushMarketCartPersistence, 120);
  }


  function readStoredMarketOrders() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(ORDER_STORAGE_KEY) || "null");
      const orderRecords = Array.isArray(parsed?.orders) ? parsed.orders : [];
      const shipmentRecords = Array.isArray(parsed?.shipments) ? parsed.shipments : [];
      return {
        orders: Object.fromEntries(orderRecords.filter((order) => order?.marketOrderId).map((order) => [order.marketOrderId, order])),
        shipments: Object.fromEntries(shipmentRecords.filter((shipment) => shipment?.shipmentId).map((shipment) => [shipment.shipmentId, shipment]))
      };
    } catch (error) {
      console.warn("W&S market order store could not read localStorage.", error);
      return { orders: Object.create(null), shipments: Object.create(null) };
    }
  }

  function readStoredMarketStock() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STOCK_STORAGE_KEY) || "null");
      return parsed?.offers && typeof parsed.offers === "object" && !Array.isArray(parsed.offers) ? parsed.offers : Object.create(null);
    } catch (error) {
      console.warn("W&S market stock store could not read localStorage.", error);
      return Object.create(null);
    }
  }

  function persistMarketOrders() {
    try {
      window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify({
        schemaVersion: MARKET_ORDER_SCHEMA_VERSION,
        shipmentSchemaVersion: MARKET_SHIPMENT_SCHEMA_VERSION,
        orders: Object.values(marketOrdersById),
        shipments: Object.values(marketShipmentsById)
      }));
      return true;
    } catch (error) {
      console.warn("W&S market order store could not persist localStorage.", error);
      return false;
    }
  }

  function persistMarketStock() {
    try {
      window.localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify({
        schemaVersion: MARKET_ORDER_SCHEMA_VERSION,
        offers: stockRuntimeByOfferId
      }));
      return true;
    } catch (error) {
      console.warn("W&S market stock store could not persist localStorage.", error);
      return false;
    }
  }

  function flushMarketOrderPersistence() {
    const ordersPersisted = persistMarketOrders();
    const stockPersisted = persistMarketStock();
    return ordersPersisted && stockPersisted;
  }

  function normalizeMarketOrderLine(value = {}, index = 0) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      marketOrderLineId: normalizeId(source.marketOrderLineId) || makeRuntimeId(`market_order_line_${index + 1}`),
      cartLineId: normalizeId(source.cartLineId),
      marketOfferId: normalizeId(source.marketOfferId),
      catalogItemId: normalizeId(source.catalogItemId),
      definitionId: normalizeId(source.definitionId || source.catalogItemId),
      vendorProviderId: normalizeId(source.vendorProviderId),
      organizationLocationId: normalizeId(source.organizationLocationId),
      sourceAddress: normalizeId(source.sourceAddress),
      vendorDisplayName: normalizeId(source.vendorDisplayName),
      quantity: clampInteger(source.quantity || 1, 1, 99),
      fulfillmentMode: normalizeToken(source.fulfillmentMode || "DELIVER_TO_HOUSING"),
      destinationRef: normalizeDestinationRef(source.destinationRef),
      unitPrice: clampInteger(source.unitPrice, 0, 999999999),
      lineTotal: clampInteger(source.lineTotal, 0, 999999999),
      stockReservationId: normalizeId(source.stockReservationId),
      housingReservationIds: Array.isArray(source.housingReservationIds) ? source.housingReservationIds.map(normalizeId).filter(Boolean) : [],
      createdItemInstanceIds: Array.isArray(source.createdItemInstanceIds) ? source.createdItemInstanceIds.map(normalizeId).filter(Boolean) : [],
      linkedServiceSelection: source.linkedServiceSelection && typeof source.linkedServiceSelection === "object" ? clone(source.linkedServiceSelection) : null,
      serviceDefinitionId: normalizeId(source.serviceDefinitionId || source.linkedServiceSelection?.serviceDefinitionId),
      serviceProviderId: normalizeId(source.serviceProviderId || source.linkedServiceSelection?.providerId),
      serviceOfferId: normalizeId(source.serviceOfferId),
      serviceOrderId: normalizeId(source.serviceOrderId),
      serviceStatus: normalizeToken(source.serviceStatus || "NOT_REQUIRED")
    };
  }

  function normalizeMarketCancellation(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      status: normalizeToken(source.status || "NONE"),
      reasonCode: normalizeToken(source.reasonCode || ""),
      note: normalizeId(source.note),
      idempotencyKey: normalizeId(source.idempotencyKey),
      recoveryIdempotencyKey: normalizeId(source.recoveryIdempotencyKey),
      attemptCount: clampInteger(source.attemptCount, 0, 999999),
      requestedAt: normalizeId(source.requestedAt) || null,
      lastAttemptAt: normalizeId(source.lastAttemptAt) || null,
      completedAt: normalizeId(source.completedAt) || null,
      errors: Array.isArray(source.errors) ? source.errors.map(normalizeId).filter(Boolean) : []
    };
  }

  function normalizeMarketRefundRequest(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const status = normalizeToken(source.status || "NONE");
    return {
      status: MARKET_REFUND_REQUEST_STATUSES.has(status) ? status : "NONE",
      reasonCode: normalizeToken(source.reasonCode || ""),
      note: normalizeId(source.note),
      idempotencyKey: normalizeId(source.idempotencyKey),
      requestIdempotencyKey: normalizeId(source.requestIdempotencyKey || (status === "REQUESTED" ? source.idempotencyKey : "")),
      withdrawIdempotencyKey: normalizeId(source.withdrawIdempotencyKey || (status === "WITHDRAWN" ? source.idempotencyKey : "")),
      requestedAmount: clampInteger(source.requestedAmount, 0, 999999999),
      returnInstanceIds: Array.isArray(source.returnInstanceIds) ? source.returnInstanceIds.map(normalizeId).filter(Boolean) : [],
      blockers: Array.isArray(source.blockers) ? source.blockers.map(normalizeToken).filter(Boolean) : [],
      executionIdempotencyKey: normalizeId(source.executionIdempotencyKey),
      itemTransactionId: normalizeId(source.itemTransactionId),
      billingRefundTransactionId: normalizeId(source.billingRefundTransactionId),
      processingAt: normalizeId(source.processingAt) || null,
      completedAt: normalizeId(source.completedAt) || null,
      errors: Array.isArray(source.errors) ? source.errors.map(normalizeId).filter(Boolean) : [],
      requestedAt: normalizeId(source.requestedAt) || null,
      withdrawnAt: normalizeId(source.withdrawnAt) || null,
      updatedAt: normalizeId(source.updatedAt) || null
    };
  }

  function normalizeMarketPartialReturnLineReceipt(value = {}, index = 0) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      marketOrderLineId: normalizeId(source.marketOrderLineId),
      marketOfferId: normalizeId(source.marketOfferId),
      stockReservationId: normalizeId(source.stockReservationId),
      quantity: clampInteger(source.quantity, 0, 99),
      instanceIds: [...new Set((Array.isArray(source.instanceIds) ? source.instanceIds : []).map(normalizeId).filter(Boolean))],
      refundAmount: clampInteger(source.refundAmount, 0, 999999999),
      stockReturnIdempotencyKey: normalizeId(source.stockReturnIdempotencyKey),
      stockReturnReceiptId: normalizeId(source.stockReturnReceiptId) || `partial-return-line-${index + 1}`
    };
  }

  function normalizeMarketPartialReturn(value = {}, index = 0) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const status = normalizeToken(source.status || "REQUESTED");
    return {
      partialReturnId: normalizeId(source.partialReturnId) || makeRuntimeId(`market_partial_return_${index + 1}`),
      status: MARKET_PARTIAL_RETURN_STATUSES.has(status) ? status : "REQUESTED",
      reasonCode: normalizeToken(source.reasonCode || "USER_REQUEST"),
      note: normalizeId(source.note),
      requestIdempotencyKey: normalizeId(source.requestIdempotencyKey || source.idempotencyKey),
      withdrawIdempotencyKey: normalizeId(source.withdrawIdempotencyKey),
      executionIdempotencyKey: normalizeId(source.executionIdempotencyKey),
      returnInstanceIds: [...new Set((Array.isArray(source.returnInstanceIds) ? source.returnInstanceIds : []).map(normalizeId).filter(Boolean))],
      lineReceipts: (Array.isArray(source.lineReceipts) ? source.lineReceipts : []).map(normalizeMarketPartialReturnLineReceipt),
      requestedAmount: clampInteger(source.requestedAmount, 0, 999999999),
      itemTransactionId: normalizeId(source.itemTransactionId),
      billingRefundTransactionId: normalizeId(source.billingRefundTransactionId),
      errors: Array.isArray(source.errors) ? source.errors.map(normalizeId).filter(Boolean) : [],
      requestedAt: normalizeId(source.requestedAt) || null,
      withdrawnAt: normalizeId(source.withdrawnAt) || null,
      processingAt: normalizeId(source.processingAt) || null,
      completedAt: normalizeId(source.completedAt) || null,
      updatedAt: normalizeId(source.updatedAt) || null
    };
  }

  function normalizeMarketPickupFulfillment(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      status: normalizeToken(source.status || "NOT_REQUIRED"),
      providerId: normalizeId(source.providerId),
      organizationLocationId: normalizeId(source.organizationLocationId),
      sourceAddress: normalizeId(source.sourceAddress),
      vendorDisplayName: normalizeId(source.vendorDisplayName),
      reservationDays: clampInteger(source.reservationDays || getPickupReservationDays(), 1, 3650),
      readyAt: normalizeId(source.readyAt) || null,
      expiresAt: normalizeId(source.expiresAt) || null,
      processingAt: normalizeId(source.processingAt) || null,
      completedAt: normalizeId(source.completedAt) || null,
      expiredAt: normalizeId(source.expiredAt) || null,
      completionIdempotencyKey: normalizeId(source.completionIdempotencyKey),
      itemTransactionId: normalizeId(source.itemTransactionId),
      recoveryRequired: source.recoveryRequired === true,
      errors: Array.isArray(source.errors) ? source.errors.map(normalizeId).filter(Boolean) : []
    };
  }

  function normalizeMarketDeliveryFulfillment(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      status: normalizeToken(source.status || "NOT_REQUIRED"),
      shipmentId: normalizeId(source.shipmentId),
      etaAt: normalizeId(source.etaAt || source.etaIso) || null,
      routeClass: normalizeToken(source.routeClass || ""),
      lastErrorCode: normalizeToken(source.lastErrorCode || ""),
      recoveryRequired: source.recoveryRequired === true
    };
  }

  function normalizeMarketShipmentPlacement(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      instanceId: normalizeId(source.instanceId),
      marketOrderLineId: normalizeId(source.marketOrderLineId),
      reservationId: normalizeId(source.reservationId),
      housingStorageId: normalizeId(source.housingStorageId),
      gridX: clampInteger(source.gridX, 0, 999),
      gridY: clampInteger(source.gridY, 0, 999),
      rotation: Number(source.rotation) === 90 ? 90 : 0,
      status: normalizeToken(source.status || "RESERVED")
    };
  }

  function normalizeMarketShipment(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const status = normalizeToken(source.status || "PENDING");
    return {
      schemaVersion: MARKET_SHIPMENT_SCHEMA_VERSION,
      shipmentId: normalizeId(source.shipmentId) || makeRuntimeId("market_shipment"),
      marketOrderId: normalizeId(source.marketOrderId),
      citizenId: normalizeId(source.citizenId),
      providerId: normalizeId(source.providerId || source.vendorProviderId),
      organizationLocationId: normalizeId(source.organizationLocationId),
      sourceAddress: normalizeId(source.sourceAddress),
      destinationHousingId: normalizeId(source.destinationHousingId),
      destinationStorageId: normalizeId(source.destinationStorageId || source.housingStorageId),
      destinationAddress: normalizeId(source.destinationAddress),
      status: MARKET_SHIPMENT_STATUSES.has(status) ? status : "RECOVERY_REQUIRED",
      routeClass: normalizeToken(source.routeClass || "STANDARD_LOCAL"),
      shippingDays: clampInteger(source.shippingDays || 1, 1, 30),
      instanceIds: [...new Set((Array.isArray(source.instanceIds) ? source.instanceIds : []).map(normalizeId).filter(Boolean))],
      placementReservations: (Array.isArray(source.placementReservations) ? source.placementReservations : []).map(normalizeMarketShipmentPlacement).filter((entry) => entry.instanceId && entry.reservationId),
      custodyItemTransactionId: normalizeId(source.custodyItemTransactionId),
      deliveryItemTransactionId: normalizeId(source.deliveryItemTransactionId),
      currentAttemptKey: normalizeId(source.currentAttemptKey),
      deliveryAttemptCount: clampInteger(source.deliveryAttemptCount, 0, 999999),
      packedAt: normalizeId(source.packedAt) || null,
      inTransitAt: normalizeId(source.inTransitAt) || null,
      etaAt: normalizeId(source.etaAt || source.etaIso) || null,
      processingAt: normalizeId(source.processingAt) || null,
      heldAt: normalizeId(source.heldAt) || null,
      deliveredAt: normalizeId(source.deliveredAt) || null,
      cancelledAt: normalizeId(source.cancelledAt) || null,
      holdReason: normalizeToken(source.holdReason || ""),
      lastErrorCode: normalizeToken(source.lastErrorCode || ""),
      recoveryRequired: source.recoveryRequired === true,
      lastAdminAction: source.lastAdminAction && typeof source.lastAdminAction === "object" ? clone(source.lastAdminAction) : null,
      createdAt: normalizeId(source.createdAt) || getWorldTime(),
      updatedAt: normalizeId(source.updatedAt) || getWorldTime(),
      revision: clampInteger(source.revision || 1, 1, 999999)
    };
  }

  function normalizeMarketOrder(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const status = normalizeToken(source.status || "DRAFT");
    return {
      schemaVersion: MARKET_ORDER_SCHEMA_VERSION,
      marketOrderId: normalizeId(source.marketOrderId) || makeRuntimeId("market_order"),
      cartId: normalizeId(source.cartId),
      citizenId: normalizeId(source.citizenId),
      vendorProviderId: normalizeId(source.vendorProviderId),
      status: MARKET_ORDER_STATUSES.has(status) ? status : "FAILED",
      paymentStatus: normalizeToken(source.paymentStatus || "NOT_REQUIRED"),
      lines: (Array.isArray(source.lines) ? source.lines : []).map(normalizeMarketOrderLine),
      totals: source.totals && typeof source.totals === "object" ? clone(source.totals) : { finalTotal: 0, currency: "CREDIT" },
      billingRefs: source.billingRefs && typeof source.billingRefs === "object" ? clone(source.billingRefs) : {},
      createdItemInstanceIds: Array.isArray(source.createdItemInstanceIds) ? source.createdItemInstanceIds.map(normalizeId).filter(Boolean) : [],
      linkedServiceOfferIds: [...new Set((Array.isArray(source.linkedServiceOfferIds) ? source.linkedServiceOfferIds : []).map(normalizeId).filter(Boolean))],
      linkedServiceOrderIds: [...new Set((Array.isArray(source.linkedServiceOrderIds) ? source.linkedServiceOrderIds : []).map(normalizeId).filter(Boolean))],
      pickupFulfillment: normalizeMarketPickupFulfillment(source.pickupFulfillment),
      shipmentId: normalizeId(source.shipmentId || source.deliveryFulfillment?.shipmentId),
      deliveryFulfillment: normalizeMarketDeliveryFulfillment(source.deliveryFulfillment),
      serviceFulfillment: source.serviceFulfillment && typeof source.serviceFulfillment === "object"
        ? {
            status: normalizeToken(source.serviceFulfillment.status || "NOT_REQUIRED"),
            startedAt: normalizeId(source.serviceFulfillment.startedAt) || null,
            completedAt: normalizeId(source.serviceFulfillment.completedAt) || null,
            failedAt: normalizeId(source.serviceFulfillment.failedAt) || null,
            lastServiceOrderId: normalizeId(source.serviceFulfillment.lastServiceOrderId),
            lastServiceStatus: normalizeToken(source.serviceFulfillment.lastServiceStatus || ""),
            recoveryRequired: source.serviceFulfillment.recoveryRequired === true,
            errors: Array.isArray(source.serviceFulfillment.errors) ? source.serviceFulfillment.errors.map(normalizeId).filter(Boolean) : []
          }
        : { status: "NOT_REQUIRED", startedAt: null, completedAt: null, failedAt: null, lastServiceOrderId: "", lastServiceStatus: "", recoveryRequired: false, errors: [] },
      idempotencyKey: normalizeId(source.idempotencyKey),
      failureCode: normalizeId(source.failureCode),
      compensationStatus: normalizeToken(source.compensationStatus || "NOT_REQUIRED"),
      compensationErrors: Array.isArray(source.compensationErrors) ? source.compensationErrors.map(normalizeId).filter(Boolean) : [],
      cancellation: normalizeMarketCancellation(source.cancellation),
      refundRequest: normalizeMarketRefundRequest(source.refundRequest),
      partialReturns: (Array.isArray(source.partialReturns) ? source.partialReturns : []).map(normalizeMarketPartialReturn),
      createdAt: normalizeId(source.createdAt) || getWorldTime(),
      completedAt: normalizeId(source.completedAt) || null,
      updatedAt: normalizeId(source.updatedAt) || getWorldTime(),
      revision: clampInteger(source.revision || 1, 1, 999999)
    };
  }

  function rebuildMarketOrderIndexes() {
    const next = new Map();
    const byServiceOrderId = new Map();
    Object.values(marketOrdersById).map(normalizeMarketOrder).forEach((order) => {
      if (order.idempotencyKey && !next.has(order.idempotencyKey)) next.set(order.idempotencyKey, order.marketOrderId);
      order.linkedServiceOrderIds.forEach((serviceOrderId) => {
        if (serviceOrderId && !byServiceOrderId.has(serviceOrderId)) byServiceOrderId.set(serviceOrderId, order.marketOrderId);
      });
    });
    marketOrderIdByIdempotencyKey = next;
    marketOrderIdByServiceOrderId = byServiceOrderId;
    marketShipmentIdByOrderId = new Map(Object.values(marketShipmentsById).map(normalizeMarketShipment).filter((shipment) => shipment.marketOrderId).map((shipment) => [shipment.marketOrderId, shipment.shipmentId]));
    return next;
  }

  function validateExpectedMarketOrderRevision(order = {}, input = {}) {
    if (input.expectedRevision == null) return null;
    const expectedRevision = clampInteger(input.expectedRevision, 1, 999999);
    if (expectedRevision === order.revision) return null;
    return {
      ok: false,
      reason: "MARKET_ORDER_REVISION_CONFLICT",
      expectedRevision,
      actualRevision: order.revision,
      order
    };
  }

  function isMarketOrderTransitionAllowed(previousStatus = "", nextStatus = "") {
    const previous = normalizeToken(previousStatus);
    const next = normalizeToken(nextStatus);
    if (!previous || previous === next) return true;
    return Boolean(MARKET_ORDER_TRANSITIONS[previous]?.has(next));
  }

  function getChangedMarketOrderFields(previous = null, next = {}) {
    if (!previous) return ["created"];
    const fields = [];
    ["status", "paymentStatus", "failureCode", "compensationStatus", "completedAt"].forEach((field) => {
      if (JSON.stringify(previous?.[field] ?? null) !== JSON.stringify(next?.[field] ?? null)) fields.push(field);
    });
    if (previous.cancellation?.status !== next.cancellation?.status) fields.push("cancellation.status");
    if (previous.refundRequest?.status !== next.refundRequest?.status) fields.push("refundRequest.status");
    if (JSON.stringify(previous.partialReturns || []) !== JSON.stringify(next.partialReturns || [])) fields.push("partialReturns");
    if (JSON.stringify(previous.createdItemInstanceIds || []) !== JSON.stringify(next.createdItemInstanceIds || [])) fields.push("createdItemInstanceIds");
    if (JSON.stringify(previous.linkedServiceOrderIds || []) !== JSON.stringify(next.linkedServiceOrderIds || [])) fields.push("linkedServiceOrderIds");
    if (previous.serviceFulfillment?.status !== next.serviceFulfillment?.status) fields.push("serviceFulfillment.status");
    if (previous.deliveryFulfillment?.status !== next.deliveryFulfillment?.status) fields.push("deliveryFulfillment.status");
    if (previous.shipmentId !== next.shipmentId) fields.push("shipmentId");
    return fields;
  }

  function emitMarketOrderUpdate(order = {}, previous = null, previousStatusFallback = "") {
    const lastRevision = lastMarketOrderEventRevisionById.get(order.marketOrderId) || 0;
    if (order.revision <= lastRevision) {
      marketBridgeDiagnostics.duplicateOrderEventsSuppressed += 1;
      return false;
    }
    lastMarketOrderEventRevisionById.set(order.marketOrderId, order.revision);
    marketBridgeDiagnostics.orderEventsEmitted += 1;
    window.dispatchEvent(new CustomEvent("ws:market-order-updated", {
      detail: {
        eventId: `market-order:${order.marketOrderId}:${order.revision}`,
        marketOrderId: order.marketOrderId,
        citizenId: order.citizenId,
        vendorProviderId: order.vendorProviderId,
        status: order.status,
        previousStatus: previous?.status || previousStatusFallback || "",
        changedFields: getChangedMarketOrderFields(previous, order),
        changedDomains: ["MARKET_ORDER"],
        createdItemInstanceIds: [...(order.createdItemInstanceIds || [])],
        cancellationStatus: order.cancellation?.status || "NONE",
        refundRequestStatus: order.refundRequest?.status || "NONE",
        shipmentId: order.shipmentId || "",
        deliveryStatus: order.deliveryFulfillment?.status || "NOT_REQUIRED",
        revision: order.revision
      }
    }));
    return true;
  }

  function saveMarketOrder(order = {}, previousStatus = "") {
    const normalized = normalizeMarketOrder(order);
    if (!normalized.marketOrderId || !normalized.citizenId || !normalized.idempotencyKey) return null;
    const previousSource = marketOrdersById[normalized.marketOrderId] || null;
    const previous = previousSource ? normalizeMarketOrder(previousSource) : null;
    const indexedOrderId = marketOrderIdByIdempotencyKey.get(normalized.idempotencyKey);
    if (indexedOrderId && indexedOrderId !== normalized.marketOrderId) {
      console.warn("W&S Market order idempotency key collision rejected.", { idempotencyKey: normalized.idempotencyKey, indexedOrderId, marketOrderId: normalized.marketOrderId });
      return null;
    }
    if (previous && normalized.revision <= previous.revision) {
      console.warn("W&S Market order revision must increase.", { marketOrderId: normalized.marketOrderId, previousRevision: previous.revision, nextRevision: normalized.revision });
      return null;
    }
    if (previous && !isMarketOrderTransitionAllowed(previous.status, normalized.status)) {
      console.warn("W&S Market order lifecycle transition rejected.", { marketOrderId: normalized.marketOrderId, previousStatus: previous.status, nextStatus: normalized.status });
      return null;
    }
    marketOrdersById = { ...marketOrdersById, [normalized.marketOrderId]: normalized };
    if (!persistMarketOrders()) {
      if (previousSource) marketOrdersById = { ...marketOrdersById, [normalized.marketOrderId]: previousSource };
      else {
        const next = { ...marketOrdersById };
        delete next[normalized.marketOrderId];
        marketOrdersById = next;
      }
      return null;
    }
    marketOrderIdByIdempotencyKey.set(normalized.idempotencyKey, normalized.marketOrderId);
    if (previous) {
      previous.linkedServiceOrderIds.forEach((serviceOrderId) => {
        if (marketOrderIdByServiceOrderId.get(serviceOrderId) === normalized.marketOrderId) marketOrderIdByServiceOrderId.delete(serviceOrderId);
      });
    }
    normalized.linkedServiceOrderIds.forEach((serviceOrderId) => marketOrderIdByServiceOrderId.set(serviceOrderId, normalized.marketOrderId));
    emitMarketOrderUpdate(normalized, previous, previousStatus);
    return clone(normalized);
  }

  function isMarketShipmentTransitionAllowed(previousStatus = "", nextStatus = "") {
    const previous = normalizeToken(previousStatus);
    const next = normalizeToken(nextStatus);
    if (!previous || previous === next) return true;
    return Boolean(MARKET_SHIPMENT_TRANSITIONS[previous]?.has(next));
  }

  function emitMarketShipmentUpdate(shipment = {}, previous = null) {
    const lastRevision = lastMarketShipmentEventRevisionById.get(shipment.shipmentId) || 0;
    if (shipment.revision <= lastRevision) return false;
    lastMarketShipmentEventRevisionById.set(shipment.shipmentId, shipment.revision);
    window.dispatchEvent?.(new CustomEvent("ws:market-shipment-updated", {
      detail: {
        eventId: `market-shipment:${shipment.shipmentId}:${shipment.revision}`,
        shipmentId: shipment.shipmentId,
        marketOrderId: shipment.marketOrderId,
        citizenId: shipment.citizenId,
        status: shipment.status,
        previousStatus: previous?.status || "",
        etaAt: shipment.etaAt,
        instanceIds: [...shipment.instanceIds],
        changedDomains: ["MARKET_SHIPMENT"],
        revision: shipment.revision
      }
    }));
    return true;
  }

  function saveMarketShipment(value = {}, options = {}) {
    const source = normalizeMarketShipment(value);
    if (!source.shipmentId || !source.marketOrderId || !source.citizenId) return null;
    const previousSource = marketShipmentsById[source.shipmentId] || null;
    const previous = previousSource ? normalizeMarketShipment(previousSource) : null;
    if (previous && options.expectedRevision != null && clampInteger(options.expectedRevision, 1, 999999) !== previous.revision) return null;
    if (previous && !isMarketShipmentTransitionAllowed(previous.status, source.status)) return null;
    const normalized = normalizeMarketShipment({ ...source, revision: previous ? previous.revision + 1 : 1, updatedAt: getWorldTime() });
    const previousMap = marketShipmentsById;
    marketShipmentsById = { ...marketShipmentsById, [normalized.shipmentId]: normalized };
    if (!persistMarketOrders()) {
      marketShipmentsById = previousMap;
      return null;
    }
    marketShipmentIdByOrderId.set(normalized.marketOrderId, normalized.shipmentId);
    emitMarketShipmentUpdate(normalized, previous);
    return clone(normalized);
  }

  function getMarketShipment(shipmentId = "") {
    const shipment = marketShipmentsById[normalizeId(shipmentId)] || null;
    return shipment ? clone(normalizeMarketShipment(shipment)) : null;
  }

  function getMarketShipments(filters = {}) {
    const citizenId = normalizeId(filters.citizenId);
    const marketOrderId = normalizeId(filters.marketOrderId);
    const status = normalizeToken(filters.status);
    return Object.values(marketShipmentsById).map(normalizeMarketShipment)
      .filter((shipment) => !citizenId || shipment.citizenId === citizenId)
      .filter((shipment) => !marketOrderId || shipment.marketOrderId === marketOrderId)
      .filter((shipment) => !status || shipment.status === status)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(clone);
  }

  function getMarketOrderShipment(orderOrId = {}) {
    const marketOrderId = typeof orderOrId === "string" ? normalizeId(orderOrId) : normalizeId(orderOrId?.marketOrderId);
    const shipmentId = marketShipmentIdByOrderId.get(marketOrderId) || normalizeId(typeof orderOrId === "object" ? orderOrId?.shipmentId : "");
    return shipmentId ? getMarketShipment(shipmentId) : null;
  }

  function getMarketOrder(marketOrderId = "") {
    const order = marketOrdersById[normalizeId(marketOrderId)] || null;
    return order ? clone(normalizeMarketOrder(order)) : null;
  }

  function getMarketOrders(filters = {}) {
    const citizenId = normalizeId(filters.citizenId);
    const status = normalizeToken(filters.status);
    return Object.values(marketOrdersById)
      .map(normalizeMarketOrder)
      .filter((order) => !citizenId || order.citizenId === citizenId)
      .filter((order) => !status || order.status === status)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map(clone);
  }

  function getCitizenMarketOrders(citizenId = "") {
    return getMarketOrders({ citizenId });
  }

  function getMarketOrderByIdempotencyKey(idempotencyKey = "") {
    const key = normalizeId(idempotencyKey);
    if (!key) return null;
    const marketOrderId = marketOrderIdByIdempotencyKey.get(key);
    return marketOrderId ? getMarketOrder(marketOrderId) : null;
  }

  function getMarketOrderByServiceOrderId(serviceOrderId = "") {
    const marketOrderId = marketOrderIdByServiceOrderId.get(normalizeId(serviceOrderId));
    return marketOrderId ? getMarketOrder(marketOrderId) : null;
  }

  function getMarketOrderInstanceIds(order = {}) {
    return [...new Set([
      ...(Array.isArray(order.createdItemInstanceIds) ? order.createdItemInstanceIds : []),
      ...(Array.isArray(order.lines) ? order.lines.flatMap((line) => Array.isArray(line.createdItemInstanceIds) ? line.createdItemInstanceIds : []) : [])
    ].map(normalizeId).filter(Boolean))];
  }

  function getCompletedMarketPartialReturns(order = {}) {
    return (Array.isArray(order.partialReturns) ? order.partialReturns : [])
      .map(normalizeMarketPartialReturn)
      .filter((entry) => entry.status === "COMPLETED");
  }

  function getActiveMarketPartialReturn(order = {}) {
    return (Array.isArray(order.partialReturns) ? order.partialReturns : [])
      .map(normalizeMarketPartialReturn)
      .find((entry) => ["REQUESTED", "PROCESSING", "RECOVERY_REQUIRED"].includes(entry.status)) || null;
  }

  function getMarketPartialReturn(order = {}, partialReturnId = "") {
    const id = normalizeId(partialReturnId);
    if (!id) return null;
    return (Array.isArray(order.partialReturns) ? order.partialReturns : [])
      .map(normalizeMarketPartialReturn)
      .find((entry) => entry.partialReturnId === id) || null;
  }

  function getReturnedMarketOrderInstanceIds(order = {}) {
    const partialIds = getCompletedMarketPartialReturns(order).flatMap((entry) => entry.returnInstanceIds);
    const fullIds = normalizeToken(order.refundRequest?.status) === "COMPLETED"
      ? (Array.isArray(order.refundRequest?.returnInstanceIds) ? order.refundRequest.returnInstanceIds : [])
      : [];
    return [...new Set([...partialIds, ...fullIds].map(normalizeId).filter(Boolean))];
  }

  function getMarketOrderLineReturnProgress(order = {}, line = {}) {
    const completedReceipts = getCompletedMarketPartialReturns(order)
      .flatMap((entry) => entry.lineReceipts)
      .filter((receipt) => receipt.marketOrderLineId === line.marketOrderLineId);
    const returnedQuantity = completedReceipts.reduce((sum, receipt) => sum + clampInteger(receipt.quantity, 0, 99), 0);
    const refundedAmount = completedReceipts.reduce((sum, receipt) => sum + clampInteger(receipt.refundAmount, 0, 999999999), 0);
    return {
      returnedQuantity,
      refundedAmount,
      remainingQuantity: Math.max(0, clampInteger(line.quantity, 0, 99) - returnedQuantity),
      remainingAmount: Math.max(0, clampInteger(line.lineTotal, 0, 999999999) - refundedAmount)
    };
  }

  function getMarketInstanceReturnBlockers(order = {}, instanceId = "") {
    const id = normalizeId(instanceId);
    const blockers = [];
    const orderInstanceIds = getMarketOrderInstanceIds(order);
    if (!id || !orderInstanceIds.includes(id)) blockers.push(`ITEM_INSTANCE_ORDER_MISMATCH:${id || "UNKNOWN"}`);
    if (getReturnedMarketOrderInstanceIds(order).includes(id)) blockers.push(`ITEM_INSTANCE_ALREADY_RETURNED:${id}`);
    const instance = window.WS_APP.getItemInstanceById?.(id) || null;
    if (!instance) return [...new Set([...blockers, `ITEM_INSTANCE_NOT_FOUND:${id}`])];
    if (normalizeId(instance.acquisition?.marketOrderId || instance.marketOrderId) !== order.marketOrderId) blockers.push(`ITEM_INSTANCE_ORDER_MISMATCH:${id}`);
    if (normalizeToken(instance.location?.type) !== "HOUSING_STORAGE") blockers.push(`ITEM_INSTANCE_RETURN_LOCATION_REQUIRED:${id}`);
    if (!["UNPACKAGED", "STORED"].includes(normalizeToken(instance.lifecycleState || "UNPACKAGED"))) blockers.push(`ITEM_INSTANCE_RETURN_LIFECYCLE_BLOCKED:${id}`);
    if (Array.isArray(instance.serviceHistory) && instance.serviceHistory.length) blockers.push(`ITEM_INSTANCE_SERVICE_HISTORY_PRESENT:${id}`);
    const condition = Number(instance.durability?.current ?? instance.condition ?? 100);
    const maximum = Number(instance.durability?.maximumOverride ?? 100);
    if (Number.isFinite(condition) && Number.isFinite(maximum) && condition < maximum) blockers.push(`ITEM_INSTANCE_CONDITION_CHANGED:${id}`);
    return [...new Set(blockers)];
  }

  function getMarketPartialReturnLineReceipts(order = {}, instanceIds = []) {
    const selectedIds = [...new Set((Array.isArray(instanceIds) ? instanceIds : []).map(normalizeId).filter(Boolean))];
    const receipts = [];
    (order.lines || []).forEach((line) => {
      const lineInstanceIds = (Array.isArray(line.createdItemInstanceIds) ? line.createdItemInstanceIds : []).map(normalizeId).filter(Boolean);
      const selectedLineIds = selectedIds.filter((instanceId) => lineInstanceIds.includes(instanceId));
      if (!selectedLineIds.length) return;
      const progress = getMarketOrderLineReturnProgress(order, line);
      const quantity = selectedLineIds.length;
      const refundAmount = quantity >= progress.remainingQuantity
        ? progress.remainingAmount
        : Math.floor(clampInteger(line.lineTotal, 0, 999999999) * quantity / Math.max(1, clampInteger(line.quantity, 1, 99)));
      receipts.push({
        marketOrderLineId: line.marketOrderLineId,
        marketOfferId: line.marketOfferId,
        stockReservationId: line.stockReservationId,
        quantity,
        instanceIds: selectedLineIds,
        refundAmount: Math.max(0, refundAmount),
        stockReturnIdempotencyKey: "",
        stockReturnReceiptId: makeDeterministicId("market_partial_stock_return", `${order.marketOrderId}:${line.marketOrderLineId}:${selectedLineIds.join(":")}`)
      });
    });
    return receipts;
  }

  function quoteMarketOrderPartialReturn(marketOrderId = "", input = {}) {
    const order = getMarketOrder(marketOrderId);
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND", blockers: ["MARKET_ORDER_NOT_FOUND"] };
    const instanceIds = [...new Set((Array.isArray(input.instanceIds) ? input.instanceIds : []).map(normalizeId).filter(Boolean))];
    const blockers = [];
    if (order.status !== "COMPLETED") blockers.push("MARKET_ORDER_NOT_COMPLETED");
    if (!["CAPTURED", "PARTIALLY_REFUNDED"].includes(normalizeToken(order.paymentStatus))) blockers.push("MARKET_ORDER_PAYMENT_NOT_CAPTURED");
    if (!normalizeId(order.billingRefs?.billingTransactionId)) blockers.push("BILLING_TRANSACTION_REQUIRED");
    const refundStatus = normalizeToken(order.refundRequest?.status || "NONE");
    if (["REQUESTED", "PROCESSING", "RECOVERY_REQUIRED", "APPROVED", "COMPLETED"].includes(refundStatus)) blockers.push("MARKET_ORDER_FULL_REFUND_ACTIVE");
    const activePartial = getActiveMarketPartialReturn(order);
    if (activePartial && normalizeId(input.partialReturnId) !== activePartial.partialReturnId) blockers.push("MARKET_ORDER_PARTIAL_RETURN_ACTIVE");
    if (!instanceIds.length) blockers.push("MARKET_PARTIAL_RETURN_ITEMS_REQUIRED");
    instanceIds.forEach((instanceId) => blockers.push(...getMarketInstanceReturnBlockers(order, instanceId)));
    const lineReceipts = getMarketPartialReturnLineReceipts(order, instanceIds);
    const mappedIds = [...new Set(lineReceipts.flatMap((receipt) => receipt.instanceIds))];
    instanceIds.filter((instanceId) => !mappedIds.includes(instanceId)).forEach((instanceId) => blockers.push(`ITEM_INSTANCE_ORDER_LINE_REQUIRED:${instanceId}`));
    lineReceipts.forEach((receipt) => {
      const line = (order.lines || []).find((candidate) => candidate.marketOrderLineId === receipt.marketOrderLineId);
      const progress = line ? getMarketOrderLineReturnProgress(order, line) : { remainingQuantity: 0 };
      if (receipt.quantity > progress.remainingQuantity) blockers.push(`MARKET_PARTIAL_RETURN_QUANTITY_EXCEEDED:${receipt.marketOrderLineId}`);
      if (!receipt.stockReservationId) blockers.push(`STOCK_RESERVATION_REQUIRED:${receipt.marketOrderLineId}`);
    });
    const requestedAmount = lineReceipts.reduce((sum, receipt) => sum + receipt.refundAmount, 0);
    if (requestedAmount <= 0) blockers.push("MARKET_PARTIAL_REFUND_AMOUNT_REQUIRED");
    const billingTransaction = window.WS_APP.getBillingTransaction?.(order.billingRefs?.billingTransactionId) || null;
    const refundableAmount = billingTransaction
      ? Math.max(0, Number(billingTransaction.amount || 0) - Number(billingTransaction.refundedAmount || 0))
      : 0;
    if (billingTransaction && requestedAmount > refundableAmount) blockers.push("MARKET_PARTIAL_REFUND_AMOUNT_EXCEEDS_BILLING");
    return {
      ok: blockers.length === 0,
      reason: blockers[0] || "OK",
      marketOrderId: order.marketOrderId,
      instanceIds,
      lineReceipts: clone(lineReceipts),
      requestedAmount,
      refundableAmount,
      blockers: [...new Set(blockers)]
    };
  }

  function getMarketOrderReturnBlockers(order = {}) {
    const blockers = [];
    const instanceIds = getMarketOrderInstanceIds(order);
    if (!instanceIds.length) blockers.push("MARKET_ORDER_ITEM_INSTANCES_REQUIRED");
    instanceIds.forEach((instanceId) => {
      const instance = window.WS_APP.getItemInstanceById?.(instanceId) || null;
      if (!instance) {
        blockers.push(`ITEM_INSTANCE_NOT_FOUND:${instanceId}`);
        return;
      }
      if (normalizeId(instance.acquisition?.marketOrderId || instance.marketOrderId) !== order.marketOrderId) {
        blockers.push(`ITEM_INSTANCE_ORDER_MISMATCH:${instanceId}`);
      }
      if (normalizeToken(instance.location?.type) !== "HOUSING_STORAGE") {
        blockers.push(`ITEM_INSTANCE_RETURN_LOCATION_REQUIRED:${instanceId}`);
      }
      if (!["UNPACKAGED", "STORED"].includes(normalizeToken(instance.lifecycleState || "UNPACKAGED"))) {
        blockers.push(`ITEM_INSTANCE_RETURN_LIFECYCLE_BLOCKED:${instanceId}`);
      }
      if (Array.isArray(instance.serviceHistory) && instance.serviceHistory.length) {
        blockers.push(`ITEM_INSTANCE_SERVICE_HISTORY_PRESENT:${instanceId}`);
      }
      const condition = Number(instance.durability?.current ?? instance.condition ?? 100);
      if (Number.isFinite(condition) && condition < 100) blockers.push(`ITEM_INSTANCE_CONDITION_CHANGED:${instanceId}`);
    });
    return [...new Set(blockers)];
  }

  function getMarketOrderActionState(orderOrId = {}) {
    const order = typeof orderOrId === "string"
      ? getMarketOrder(orderOrId)
      : normalizeId(orderOrId?.marketOrderId)
        ? normalizeMarketOrder(orderOrId)
        : null;
    if (!order?.marketOrderId) return {
      ok: false,
      reason: "MARKET_ORDER_NOT_FOUND",
      canCancel: false,
      canRequestRefund: false,
      canWithdrawRefundRequest: false,
      canExecuteRefund: false,
      canRetryRefund: false,
      canRequestPartialReturn: false,
      canExecutePartialReturn: false,
      canWithdrawPartialReturn: false,
      canRetryPartialReturn: false,
      canConfirmPickup: false,
      canRetryPickup: false,
      blockers: ["MARKET_ORDER_NOT_FOUND"]
    };
    const committedInstanceIds = getMarketOrderInstanceIds(order).filter((instanceId) => Boolean(window.WS_APP.getItemInstanceById?.(instanceId)));
    const pendingServiceCustodyOnly = committedInstanceIds.length > 0
      && isPurchaseWithServiceOrder(order)
      && committedInstanceIds.every((instanceId) => isPendingServiceCustodyInstance(order, instanceId));
    const pendingPickupCustodyOnly = committedInstanceIds.length > 0
      && isPickupOrder(order)
      && committedInstanceIds.every((instanceId) => isPendingPickupCustodyInstance(order, instanceId));
    const pendingDeliveryCustodyOnly = committedInstanceIds.length > 0
      && isDeliveryOrder(order)
      && committedInstanceIds.every((instanceId) => isPendingDeliveryCustodyInstance(order, instanceId));
    const pendingCustodyOnly = pendingServiceCustodyOnly || pendingPickupCustodyOnly || pendingDeliveryCustodyOnly;
    const committedInstanceExists = committedInstanceIds.length > 0;
    const cancellationBlockers = [];
    if (!MARKET_ORDER_CANCELLABLE_STATUSES.has(order.status)) cancellationBlockers.push("MARKET_ORDER_NOT_CANCELLABLE");
    if (committedInstanceExists && !pendingCustodyOnly) cancellationBlockers.push("MARKET_ORDER_FULFILLMENT_ALREADY_COMMITTED");
    if (order.cancellation?.status === "PROCESSING") cancellationBlockers.push("MARKET_ORDER_CANCELLATION_PROCESSING");
    if (order.status === "PAYMENT_RECOVERY_REQUIRED") cancellationBlockers.push("MARKET_ORDER_PAYMENT_RECOVERY_REQUIRED");
    const cancellationRecoveryBlockers = [];
    if (order.cancellation?.status !== "RECOVERY_REQUIRED") cancellationRecoveryBlockers.push("MARKET_ORDER_CANCELLATION_RECOVERY_NOT_REQUIRED");
    if (committedInstanceExists && !pendingCustodyOnly) cancellationRecoveryBlockers.push("MARKET_ORDER_FULFILLMENT_ALREADY_COMMITTED");
    const checkoutRetryBlockers = [];
    if (!MARKET_ORDER_CHECKOUT_RETRY_STATUSES.has(order.status)) checkoutRetryBlockers.push("MARKET_ORDER_CHECKOUT_NOT_RETRYABLE");
    if (["PROCESSING", "RECOVERY_REQUIRED"].includes(order.cancellation?.status)) checkoutRetryBlockers.push("MARKET_ORDER_CANCELLATION_ACTIVE");

    const refundStatus = normalizeToken(order.refundRequest?.status || "NONE");
    const returnBlockers = getMarketOrderReturnBlockers(order);
    const refundRequestBlockers = [];
    if (order.status !== "COMPLETED") refundRequestBlockers.push("MARKET_ORDER_NOT_COMPLETED");
    if (order.paymentStatus !== "CAPTURED") refundRequestBlockers.push("MARKET_ORDER_PAYMENT_NOT_CAPTURED");
    if (!normalizeId(order.billingRefs?.billingTransactionId)) refundRequestBlockers.push("BILLING_TRANSACTION_REQUIRED");
    if (["REQUESTED", "PROCESSING", "RECOVERY_REQUIRED", "APPROVED", "COMPLETED"].includes(refundStatus)) refundRequestBlockers.push("MARKET_ORDER_REFUND_ALREADY_REQUESTED");
    refundRequestBlockers.push(...returnBlockers);

    const refundExecutionBlockers = [];
    if (order.status !== "COMPLETED") refundExecutionBlockers.push("MARKET_ORDER_NOT_COMPLETED");
    if (order.paymentStatus !== "CAPTURED") refundExecutionBlockers.push("MARKET_ORDER_PAYMENT_NOT_CAPTURED");
    if (!normalizeId(order.billingRefs?.billingTransactionId)) refundExecutionBlockers.push("BILLING_TRANSACTION_REQUIRED");
    if (refundStatus !== "REQUESTED") refundExecutionBlockers.push("MARKET_ORDER_REFUND_NOT_REQUESTED");
    refundExecutionBlockers.push(...returnBlockers);

    const refundRetryBlockers = [];
    if (!["PROCESSING", "RECOVERY_REQUIRED"].includes(refundStatus)) refundRetryBlockers.push("MARKET_ORDER_REFUND_RECOVERY_NOT_REQUIRED");
    if (!normalizeId(order.refundRequest?.executionIdempotencyKey)) refundRetryBlockers.push("MARKET_ORDER_REFUND_EXECUTION_KEY_REQUIRED");

    const returnedInstanceIds = getReturnedMarketOrderInstanceIds(order);
    const partialReturnEligibleInstanceIds = getMarketOrderInstanceIds(order).filter((instanceId) => !returnedInstanceIds.includes(instanceId) && getMarketInstanceReturnBlockers(order, instanceId).length === 0);
    const activePartialReturn = getActiveMarketPartialReturn(order);
    const partialReturnRequestBlockers = [];
    if (order.status !== "COMPLETED") partialReturnRequestBlockers.push("MARKET_ORDER_NOT_COMPLETED");
    if (!["CAPTURED", "PARTIALLY_REFUNDED"].includes(normalizeToken(order.paymentStatus))) partialReturnRequestBlockers.push("MARKET_ORDER_PAYMENT_NOT_CAPTURED");
    if (!normalizeId(order.billingRefs?.billingTransactionId)) partialReturnRequestBlockers.push("BILLING_TRANSACTION_REQUIRED");
    if (["REQUESTED", "PROCESSING", "RECOVERY_REQUIRED", "APPROVED", "COMPLETED"].includes(refundStatus)) partialReturnRequestBlockers.push("MARKET_ORDER_FULL_REFUND_ACTIVE");
    if (activePartialReturn) partialReturnRequestBlockers.push("MARKET_ORDER_PARTIAL_RETURN_ACTIVE");
    if (!partialReturnEligibleInstanceIds.length) partialReturnRequestBlockers.push("MARKET_ORDER_NO_PARTIAL_RETURN_ITEMS");
    const partialReturnExecutionBlockers = [];
    if (!activePartialReturn || activePartialReturn.status !== "REQUESTED") partialReturnExecutionBlockers.push("MARKET_PARTIAL_RETURN_NOT_REQUESTED");
    if (activePartialReturn) {
      const activeQuote = quoteMarketOrderPartialReturn(order.marketOrderId, {
        instanceIds: activePartialReturn.returnInstanceIds,
        partialReturnId: activePartialReturn.partialReturnId
      });
      partialReturnExecutionBlockers.push(...(activeQuote.blockers || []).filter((code) => code !== "MARKET_ORDER_PARTIAL_RETURN_ACTIVE"));
    }
    const partialReturnRetryBlockers = [];
    if (!activePartialReturn || !["PROCESSING", "RECOVERY_REQUIRED"].includes(activePartialReturn.status)) partialReturnRetryBlockers.push("MARKET_PARTIAL_RETURN_RECOVERY_NOT_REQUIRED");
    if (activePartialReturn && !normalizeId(activePartialReturn.executionIdempotencyKey)) partialReturnRetryBlockers.push("MARKET_PARTIAL_RETURN_EXECUTION_KEY_REQUIRED");

    const pickupStatus = normalizeToken(order.pickupFulfillment?.status || "NOT_REQUIRED");
    const pickupCompletionBlockers = [];
    if (!isPickupOrder(order)) pickupCompletionBlockers.push("MARKET_ORDER_PICKUP_NOT_REQUIRED");
    if (order.status !== "FULFILLING") pickupCompletionBlockers.push("MARKET_ORDER_PICKUP_NOT_FULFILLING");
    if (!["READY", "PROCESSING", "RECOVERY_REQUIRED"].includes(pickupStatus)) pickupCompletionBlockers.push("MARKET_ORDER_PICKUP_NOT_READY");
    if (!committedInstanceIds.length) pickupCompletionBlockers.push("MARKET_ORDER_PICKUP_INSTANCES_REQUIRED");
    if (committedInstanceIds.length && !pendingPickupCustodyOnly && pickupStatus !== "PROCESSING") pickupCompletionBlockers.push("MARKET_ORDER_PICKUP_VENDOR_CUSTODY_REQUIRED");
    if (order.pickupFulfillment?.expiresAt && compareWorldTimes(getWorldTime(), order.pickupFulfillment.expiresAt) > 0) pickupCompletionBlockers.push("MARKET_ORDER_PICKUP_EXPIRED");
    const pickupRetryBlockers = [];
    if (!isPickupOrder(order)) pickupRetryBlockers.push("MARKET_ORDER_PICKUP_NOT_REQUIRED");
    if (pickupStatus !== "RECOVERY_REQUIRED") pickupRetryBlockers.push("MARKET_ORDER_PICKUP_RECOVERY_NOT_REQUIRED");
    if (!normalizeId(order.pickupFulfillment?.completionIdempotencyKey)) pickupRetryBlockers.push("MARKET_ORDER_PICKUP_COMPLETION_KEY_REQUIRED");

    return {
      ok: true,
      marketOrderId: order.marketOrderId,
      canCancel: cancellationBlockers.length === 0,
      canRetryCancellation: cancellationRecoveryBlockers.length === 0,
      canRetryCheckout: checkoutRetryBlockers.length === 0,
      canRequestRefund: refundRequestBlockers.length === 0,
      canWithdrawRefundRequest: refundStatus === "REQUESTED",
      canExecuteRefund: refundExecutionBlockers.length === 0,
      canRetryRefund: refundRetryBlockers.length === 0,
      canRequestPartialReturn: partialReturnRequestBlockers.length === 0,
      canExecutePartialReturn: partialReturnExecutionBlockers.length === 0,
      canWithdrawPartialReturn: Boolean(activePartialReturn && activePartialReturn.status === "REQUESTED"),
      canRetryPartialReturn: partialReturnRetryBlockers.length === 0,
      activePartialReturn: clone(activePartialReturn),
      partialReturnEligibleInstanceIds: clone(partialReturnEligibleInstanceIds),
      returnedInstanceIds: clone(returnedInstanceIds),
      canConfirmPickup: pickupCompletionBlockers.length === 0,
      canRetryPickup: pickupRetryBlockers.length === 0,
      cancellationBlockers: [...new Set(cancellationBlockers)],
      cancellationRecoveryBlockers: [...new Set(cancellationRecoveryBlockers)],
      checkoutRetryBlockers: [...new Set(checkoutRetryBlockers)],
      refundBlockers: [...new Set(refundRequestBlockers)],
      refundExecutionBlockers: [...new Set(refundExecutionBlockers)],
      refundRetryBlockers: [...new Set(refundRetryBlockers)],
      partialReturnBlockers: [...new Set(partialReturnRequestBlockers)],
      partialReturnExecutionBlockers: [...new Set(partialReturnExecutionBlockers)],
      partialReturnRetryBlockers: [...new Set(partialReturnRetryBlockers)],
      pickupCompletionBlockers: [...new Set(pickupCompletionBlockers)],
      pickupRetryBlockers: [...new Set(pickupRetryBlockers)],
      blockers: [...new Set([...cancellationBlockers, ...cancellationRecoveryBlockers, ...checkoutRetryBlockers, ...refundRequestBlockers, ...refundExecutionBlockers, ...refundRetryBlockers, ...partialReturnRequestBlockers, ...partialReturnExecutionBlockers, ...partialReturnRetryBlockers, ...pickupCompletionBlockers, ...pickupRetryBlockers])]
    };
  }

  function getMarketCancellationPaymentState(order = {}) {
    const transactionId = normalizeId(order.billingRefs?.billingTransactionId);
    if (transactionId) {
      const transaction = window.WS_APP.getBillingTransaction?.(transactionId) || null;
      const refundedAmount = Number(transaction?.refundedAmount || 0);
      const amount = Number(transaction?.amount || 0);
      if (normalizeToken(transaction?.status) === "REFUNDED" || (amount > 0 && refundedAmount >= amount)) {
        return { settled: true, paymentStatus: "REFUNDED", transactionId, intentId: "" };
      }
      return { settled: false, paymentStatus: order.paymentStatus, transactionId, intentId: "" };
    }
    const intentId = normalizeId(order.billingRefs?.billingIntentId);
    if (intentId) {
      const intent = window.WS_APP.getBillingIntent?.(intentId) || null;
      if (normalizeToken(intent?.status) === "VOIDED") return { settled: true, paymentStatus: "VOIDED", transactionId: "", intentId };
      return { settled: false, paymentStatus: order.paymentStatus, transactionId: "", intentId };
    }
    return { settled: true, paymentStatus: "NOT_REQUIRED", transactionId: "", intentId: "" };
  }

  function executeMarketOrderCancellation(processing = {}, input = {}) {
    const errors = [];
    const serviceFulfillmentCancellation = isPurchaseWithServiceOrder(processing);
    const pickupCancellation = isPickupOrder(processing);
    const deliveryCancellation = isDeliveryOrder(processing);
    if (serviceFulfillmentCancellation) serviceCompensationInProgressOrderIds.add(processing.marketOrderId);
    if (serviceFulfillmentCancellation) {
      processing.linkedServiceOrderIds.forEach((serviceOrderId) => {
        const settlement = settleThenCancelLinkedServiceOrder(serviceOrderId, normalizeToken(input.reasonCode || processing.cancellation?.reasonCode || "MARKET_ORDER_CANCELLED"), {
          idempotencyKey: `${processing.marketOrderId}:cancel-service:${serviceOrderId}`,
          metadata: { marketOrderId: processing.marketOrderId }
        });
        if (!settlement?.ok) errors.push(`SERVICE_CANCEL:${serviceOrderId}:${settlement?.reason || "FAILED"}`);
      });
      if (errors.some((error) => String(error || "").startsWith("SERVICE_CANCEL:"))) {
        errors.push("ITEM_REMOVE_BLOCKED_BY_SERVICE_TERMINAL_FAILURE");
      } else {
        getMarketOrderInstanceIds(processing).forEach((instanceId) => {
          if (!isPendingServiceCustodyInstance(processing, instanceId)) {
            errors.push(`ITEM_SERVICE_CUSTODY_REQUIRED:${instanceId}`);
            return;
          }
          const removed = window.WS_APP.removeItemInstance?.(instanceId, {
            source: "MARKET_SERVICE_CANCELLATION",
            deferPersistence: true,
            skipCitizenEvent: true,
            skipItemEvent: true,
            skipModuleRefresh: true,
            skipProfileRefresh: true
          });
          if (!removed?.ok) errors.push(`ITEM_REMOVE:${instanceId}:${removed?.reason || "FAILED"}`);
        });
      }
      window.WS_APP.flushScheduledItemStorePersistence?.();
    }
    if (deliveryCancellation) {
      const shipment = getMarketOrderShipment(processing);
      const custodyTransactionId = normalizeId(shipment?.custodyItemTransactionId);
      if (custodyTransactionId) {
        const compensated = window.WS_APP.compensateItemInstanceTransaction?.(custodyTransactionId, { idempotencyKey: `${processing.marketOrderId}:delivery-custody-cancel`, source: "MARKET_DELIVERY_CANCELLATION", changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "MARKET", "MARKET_SHIPMENT"] });
        if (!compensated?.ok) errors.push(`ITEM_TRANSACTION_COMPENSATION:${custodyTransactionId}:${compensated?.reason || "FAILED"}`);
      } else {
        getMarketOrderInstanceIds(processing).forEach((instanceId) => {
          if (!isPendingDeliveryCustodyInstance(processing, instanceId)) { errors.push(`ITEM_DELIVERY_CUSTODY_REQUIRED:${instanceId}`); return; }
          const removed = window.WS_APP.removeItemInstance?.(instanceId, { source: "MARKET_DELIVERY_CANCELLATION", deferPersistence: true, skipCitizenEvent: true, skipItemEvent: true, skipModuleRefresh: true, skipProfileRefresh: true });
          if (!removed?.ok) errors.push(`ITEM_REMOVE:${instanceId}:${removed?.reason || "FAILED"}`);
        });
        window.WS_APP.flushScheduledItemStorePersistence?.();
      }
      if (shipment) {
        releaseMarketShipmentReservations(shipment, "MARKET_ORDER_CANCELLED");
        const shipmentResult = saveMarketShipment({ ...shipment, status: errors.length ? "RECOVERY_REQUIRED" : "CANCELLED", recoveryRequired: errors.length > 0, lastErrorCode: errors[0] || "", cancelledAt: errors.length ? shipment.cancelledAt : getWorldTime() }, { expectedRevision: shipment.revision });
        if (!shipmentResult) errors.push("MARKET_SHIPMENT_CANCELLATION_PERSISTENCE_FAILED");
      }
    }
    if (pickupCancellation) {
      const custodyTransactionId = normalizeId(processing.pickupFulfillment?.itemTransactionId);
      if (custodyTransactionId) {
        const compensated = window.WS_APP.compensateItemInstanceTransaction?.(custodyTransactionId, {
          idempotencyKey: `${processing.marketOrderId}:pickup-custody-cancel`,
          source: "MARKET_PICKUP_CANCELLATION",
          changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "MARKET"]
        });
        if (!compensated?.ok) errors.push(`ITEM_TRANSACTION_COMPENSATION:${custodyTransactionId}:${compensated?.reason || "FAILED"}`);
      } else {
        getMarketOrderInstanceIds(processing).forEach((instanceId) => {
          if (!isPendingPickupCustodyInstance(processing, instanceId)) {
            errors.push(`ITEM_PICKUP_CUSTODY_REQUIRED:${instanceId}`);
            return;
          }
          const removed = window.WS_APP.removeItemInstance?.(instanceId, {
            source: "MARKET_PICKUP_CANCELLATION",
            deferPersistence: true,
            skipCitizenEvent: true,
            skipItemEvent: true,
            skipModuleRefresh: true,
            skipProfileRefresh: true
          });
          if (!removed?.ok) errors.push(`ITEM_REMOVE:${instanceId}:${removed?.reason || "FAILED"}`);
        });
        window.WS_APP.flushScheduledItemStorePersistence?.();
      }
    }
    processing.lines.forEach((line) => {
      (line.housingReservationIds || []).forEach((reservationId) => {
        const result = window.WS_APP.releaseHousingPlacementReservation?.(reservationId, "MARKET_ORDER_CANCELLED");
        if (result && result.ok === false && result.reason !== "HOUSING_RESERVATION_NOT_FOUND") errors.push(`HOUSING_RELEASE:${reservationId}:${result.reason || "FAILED"}`);
      });
      if (line.stockReservationId) {
        const result = releaseMarketStockReservation(line.stockReservationId, "MARKET_ORDER_CANCELLED");
        if (!result.ok && result.reason !== "STOCK_RESERVATION_NOT_FOUND") errors.push(`STOCK_RELEASE:${line.stockReservationId}:${result.reason || "FAILED"}`);
      }
    });

    if (typeof window.WS_APP.flushHousingPlacementPersistence === "function" && !window.WS_APP.flushHousingPlacementPersistence()) {
      errors.push("HOUSING_RELEASE_PERSISTENCE_FAILED");
    }

    let paymentStatus = processing.paymentStatus;
    const paymentState = getMarketCancellationPaymentState(processing);
    if (paymentState.settled) {
      paymentStatus = paymentState.paymentStatus;
    } else if (paymentState.transactionId) {
      const refund = window.WS_APP.refundBillingTransaction?.(paymentState.transactionId, null, {
        idempotencyKey: `${processing.marketOrderId}:cancellation:billing-refund`,
        reason: normalizeToken(input.reasonCode || processing.cancellation?.reasonCode || "MARKET_ORDER_CANCELLED"),
        createdBy: "MARKET"
      });
      if (!refund?.ok) errors.push(`BILLING_REFUND:${paymentState.transactionId}:${refund?.error?.code || "FAILED"}`);
      else paymentStatus = "REFUNDED";
    } else if (paymentState.intentId) {
      const voidResult = window.WS_APP.voidBillingIntent?.(paymentState.intentId, { reason: normalizeToken(input.reasonCode || processing.cancellation?.reasonCode || "MARKET_ORDER_CANCELLED") });
      if (!voidResult?.ok && voidResult?.error?.code !== "BILLING_INTENT_NOT_VOIDABLE") errors.push(`BILLING_VOID:${paymentState.intentId}:${voidResult?.error?.code || "FAILED"}`);
      else if (voidResult?.ok) paymentStatus = "VOIDED";
    }

    const billingError = errors.some((entry) => entry.startsWith("BILLING_"));
    const nextSource = {
      ...processing,
      status: errors.length ? (billingError ? "PAYMENT_RECOVERY_REQUIRED" : "FAILED") : "CANCELLED",
      paymentStatus,
      failureCode: errors.length ? "MARKET_ORDER_CANCELLATION_RECOVERY_REQUIRED" : "",
      compensationStatus: errors.length ? "PARTIAL" : "COMPLETED",
      compensationErrors: errors,
      cancellation: {
        ...processing.cancellation,
        status: errors.length ? "RECOVERY_REQUIRED" : "COMPLETED",
        completedAt: getWorldTime(),
        errors
      },
      deliveryFulfillment: deliveryCancellation
        ? { ...processing.deliveryFulfillment, status: errors.length ? "RECOVERY_REQUIRED" : "CANCELLED", lastErrorCode: errors[0] || "", recoveryRequired: errors.length > 0 }
        : processing.deliveryFulfillment,
      pickupFulfillment: pickupCancellation
        ? {
            ...processing.pickupFulfillment,
            status: errors.length ? "RECOVERY_REQUIRED" : (normalizeToken(input.reasonCode || processing.cancellation?.reasonCode) === "PICKUP_RESERVATION_EXPIRED" ? "EXPIRED" : "CANCELLED"),
            expiredAt: normalizeToken(input.reasonCode || processing.cancellation?.reasonCode) === "PICKUP_RESERVATION_EXPIRED" ? getWorldTime() : processing.pickupFulfillment?.expiredAt,
            recoveryRequired: errors.length > 0,
            errors
          }
        : processing.pickupFulfillment,
      completedAt: errors.length ? processing.completedAt : getWorldTime(),
      updatedAt: getWorldTime(),
      revision: processing.revision + 1
    };
    const next = saveMarketOrder(nextSource, processing.status);
    if (!next) {
      const recovery = normalizeMarketOrder({
        ...nextSource,
        status: billingError ? "PAYMENT_RECOVERY_REQUIRED" : "FAILED",
        failureCode: "MARKET_ORDER_CANCELLATION_PERSISTENCE_RECOVERY_REQUIRED",
        compensationStatus: "PARTIAL",
        compensationErrors: [...errors, "MARKET_ORDER_PERSISTENCE_FAILED"],
        cancellation: {
          ...nextSource.cancellation,
          status: "RECOVERY_REQUIRED",
          errors: [...errors, "MARKET_ORDER_PERSISTENCE_FAILED"]
        }
      });
      marketOrdersById = { ...marketOrdersById, [recovery.marketOrderId]: recovery };
      rebuildMarketOrderIndexes();
      if (serviceFulfillmentCancellation) serviceCompensationInProgressOrderIds.delete(processing.marketOrderId);
      return { ok: false, reason: "MARKET_ORDER_PERSISTENCE_FAILED", recoveryRequired: true, errors: recovery.compensationErrors, order: clone(recovery) };
    }
    if (serviceFulfillmentCancellation) serviceCompensationInProgressOrderIds.delete(processing.marketOrderId);
    return { ok: errors.length === 0, operation: next.status, reason: errors[0] || "", errors, order: next };
  }

  function cancelMarketOrder(marketOrderId = "", input = {}) {
    const order = getMarketOrder(marketOrderId);
    const idempotencyKey = normalizeId(input.idempotencyKey);
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    if (!idempotencyKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
    if (order.status === "CANCELLED") return { ok: true, operation: "IDEMPOTENT_REPLAY", order };
    if (order.cancellation?.idempotencyKey === idempotencyKey && order.cancellation?.status === "COMPLETED") return { ok: true, operation: "IDEMPOTENT_REPLAY", order };
    const revisionConflict = validateExpectedMarketOrderRevision(order, input);
    if (revisionConflict) return revisionConflict;
    if (order.cancellation?.status === "RECOVERY_REQUIRED") return { ok: false, reason: "MARKET_ORDER_CANCELLATION_RECOVERY_REQUIRED", order };
    const actionState = getMarketOrderActionState(order);
    if (!actionState.canCancel) return { ok: false, reason: actionState.cancellationBlockers[0] || "MARKET_ORDER_NOT_CANCELLABLE", blockers: actionState.cancellationBlockers, order };

    marketBridgeDiagnostics.cancellationAttempts += 1;
    const processing = saveMarketOrder({
      ...order,
      cancellation: {
        status: "PROCESSING",
        reasonCode: normalizeToken(input.reasonCode || "USER_REQUEST"),
        note: normalizeId(input.note),
        idempotencyKey,
        recoveryIdempotencyKey: "",
        attemptCount: 1,
        requestedAt: getWorldTime(),
        lastAttemptAt: getWorldTime(),
        completedAt: null,
        errors: []
      },
      updatedAt: getWorldTime(),
      revision: order.revision + 1
    }, order.status);
    if (!processing) return { ok: false, reason: "MARKET_ORDER_PERSISTENCE_FAILED" };
    return executeMarketOrderCancellation(processing, input);
  }

  function retryMarketOrderCancellation(marketOrderId = "", input = {}) {
    const order = getMarketOrder(marketOrderId);
    const idempotencyKey = normalizeId(input.idempotencyKey);
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    if (!idempotencyKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
    if (order.status === "CANCELLED" || order.cancellation?.status === "COMPLETED") return { ok: true, operation: "IDEMPOTENT_REPLAY", order };
    const revisionConflict = validateExpectedMarketOrderRevision(order, input);
    if (revisionConflict) return revisionConflict;
    if (order.cancellation?.status !== "RECOVERY_REQUIRED") return { ok: false, reason: "MARKET_ORDER_CANCELLATION_RECOVERY_NOT_REQUIRED", order };
    if (order.cancellation?.recoveryIdempotencyKey === idempotencyKey) return { ok: false, reason: "MARKET_ORDER_CANCELLATION_RETRY_ALREADY_PROCESSED", order };
    const actionState = getMarketOrderActionState(order);
    if (!actionState.canRetryCancellation) return { ok: false, reason: actionState.cancellationRecoveryBlockers[0] || "MARKET_ORDER_CANCELLATION_RECOVERY_BLOCKED", blockers: actionState.cancellationRecoveryBlockers, order };

    marketBridgeDiagnostics.cancellationRecoveryAttempts += 1;
    const processing = saveMarketOrder({
      ...order,
      cancellation: {
        ...order.cancellation,
        status: "PROCESSING",
        recoveryIdempotencyKey: idempotencyKey,
        attemptCount: clampInteger(order.cancellation?.attemptCount, 0, 999999) + 1,
        lastAttemptAt: getWorldTime(),
        completedAt: null,
        errors: []
      },
      updatedAt: getWorldTime(),
      revision: order.revision + 1
    }, order.status);
    if (!processing) return { ok: false, reason: "MARKET_ORDER_PERSISTENCE_FAILED" };
    return executeMarketOrderCancellation(processing, input);
  }

  function requestMarketOrderRefund(marketOrderId = "", input = {}) {
    const order = getMarketOrder(marketOrderId);
    const idempotencyKey = normalizeId(input.idempotencyKey);
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    if (!idempotencyKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
    if (order.refundRequest?.status === "REQUESTED") {
      if (order.refundRequest.requestIdempotencyKey === idempotencyKey) {
        marketBridgeDiagnostics.refundRequestReplays += 1;
        return { ok: true, operation: "IDEMPOTENT_REPLAY", order };
      }
      marketBridgeDiagnostics.refundRequestConflicts += 1;
      return { ok: false, reason: "MARKET_ORDER_REFUND_ALREADY_REQUESTED", order };
    }
    const revisionConflict = validateExpectedMarketOrderRevision(order, input);
    if (revisionConflict) return revisionConflict;
    const actionState = getMarketOrderActionState(order);
    if (!actionState.canRequestRefund) return { ok: false, reason: actionState.refundBlockers[0] || "MARKET_ORDER_REFUND_BLOCKED", blockers: actionState.refundBlockers, order };
    const next = saveMarketOrder({
      ...order,
      refundRequest: {
        status: "REQUESTED",
        reasonCode: normalizeToken(input.reasonCode || "USER_REQUEST"),
        note: normalizeId(input.note),
        idempotencyKey,
        requestIdempotencyKey: idempotencyKey,
        withdrawIdempotencyKey: "",
        requestedAmount: clampInteger(order.totals?.finalTotal, 0, 999999999),
        returnInstanceIds: getMarketOrderInstanceIds(order),
        blockers: [],
        requestedAt: getWorldTime(),
        withdrawnAt: null,
        updatedAt: getWorldTime()
      },
      updatedAt: getWorldTime(),
      revision: order.revision + 1
    }, order.status);
    if (next) marketBridgeDiagnostics.refundRequests += 1;
    return next ? { ok: true, operation: "REFUND_REQUESTED", order: next } : { ok: false, reason: "MARKET_ORDER_PERSISTENCE_FAILED" };
  }

  function withdrawMarketOrderRefundRequest(marketOrderId = "", input = {}) {
    const order = getMarketOrder(marketOrderId);
    const idempotencyKey = normalizeId(input.idempotencyKey);
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    if (!idempotencyKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
    if (order.refundRequest?.status === "WITHDRAWN") {
      return order.refundRequest.withdrawIdempotencyKey === idempotencyKey
        ? { ok: true, operation: "IDEMPOTENT_REPLAY", order }
        : { ok: false, reason: "MARKET_ORDER_REFUND_ALREADY_WITHDRAWN", order };
    }
    const revisionConflict = validateExpectedMarketOrderRevision(order, input);
    if (revisionConflict) return revisionConflict;
    if (order.refundRequest?.status !== "REQUESTED") return { ok: false, reason: "MARKET_ORDER_REFUND_NOT_REQUESTED" };
    const next = saveMarketOrder({
      ...order,
      refundRequest: {
        ...order.refundRequest,
        status: "WITHDRAWN",
        idempotencyKey,
        withdrawIdempotencyKey: idempotencyKey,
        withdrawnAt: getWorldTime(),
        updatedAt: getWorldTime()
      },
      updatedAt: getWorldTime(),
      revision: order.revision + 1
    }, order.status);
    return next ? { ok: true, operation: "REFUND_REQUEST_WITHDRAWN", order: next } : { ok: false, reason: "MARKET_ORDER_PERSISTENCE_FAILED" };
  }

  function saveMarketPartialReturnOperation(order = {}, partialReturnId = "", operationPatch = {}, orderPatch = {}) {
    const id = normalizeId(partialReturnId);
    const partialReturns = (Array.isArray(order.partialReturns) ? order.partialReturns : []).map(normalizeMarketPartialReturn);
    const index = partialReturns.findIndex((entry) => entry.partialReturnId === id);
    if (index < 0) return null;
    partialReturns[index] = normalizeMarketPartialReturn({ ...partialReturns[index], ...clone(operationPatch), updatedAt: getWorldTime() }, index);
    return saveMarketOrder({
      ...order,
      ...clone(orderPatch),
      partialReturns,
      updatedAt: getWorldTime(),
      revision: order.revision + 1
    }, order.status);
  }

  function requestMarketOrderPartialReturn(marketOrderId = "", input = {}) {
    const order = getMarketOrder(marketOrderId);
    const idempotencyKey = normalizeId(input.idempotencyKey);
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    if (!idempotencyKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
    const replay = (order.partialReturns || []).map(normalizeMarketPartialReturn).find((entry) => entry.requestIdempotencyKey === idempotencyKey);
    if (replay) {
      marketBridgeDiagnostics.partialReturnRequestReplays += 1;
      return { ok: true, operation: "IDEMPOTENT_REPLAY", partialReturn: replay, order };
    }
    const revisionConflict = validateExpectedMarketOrderRevision(order, input);
    if (revisionConflict) return revisionConflict;
    const quote = quoteMarketOrderPartialReturn(marketOrderId, input);
    if (!quote.ok) return { ok: false, reason: quote.reason || "MARKET_PARTIAL_RETURN_BLOCKED", blockers: quote.blockers, quote, order };
    const partialReturnId = normalizeId(input.partialReturnId) || makeDeterministicId("market_partial_return", `${order.marketOrderId}:${idempotencyKey}`);
    const partialReturn = normalizeMarketPartialReturn({
      partialReturnId,
      status: "REQUESTED",
      reasonCode: normalizeToken(input.reasonCode || "USER_REQUEST"),
      note: normalizeId(input.note),
      requestIdempotencyKey: idempotencyKey,
      returnInstanceIds: quote.instanceIds,
      lineReceipts: quote.lineReceipts,
      requestedAmount: quote.requestedAmount,
      requestedAt: getWorldTime(),
      updatedAt: getWorldTime()
    });
    const next = saveMarketOrder({
      ...order,
      partialReturns: [...(order.partialReturns || []), partialReturn],
      updatedAt: getWorldTime(),
      revision: order.revision + 1
    }, order.status);
    if (!next) return { ok: false, reason: "MARKET_ORDER_PERSISTENCE_FAILED" };
    marketBridgeDiagnostics.partialReturnRequests += 1;
    return { ok: true, operation: "PARTIAL_RETURN_REQUESTED", partialReturn: getMarketPartialReturn(next, partialReturnId), order: next };
  }

  function withdrawMarketOrderPartialReturn(marketOrderId = "", partialReturnId = "", input = {}) {
    const order = getMarketOrder(marketOrderId);
    const idempotencyKey = normalizeId(input.idempotencyKey);
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    if (!idempotencyKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
    const partialReturn = getMarketPartialReturn(order, partialReturnId);
    if (!partialReturn) return { ok: false, reason: "MARKET_PARTIAL_RETURN_NOT_FOUND", order };
    if (partialReturn.status === "WITHDRAWN") {
      return partialReturn.withdrawIdempotencyKey === idempotencyKey
        ? { ok: true, operation: "IDEMPOTENT_REPLAY", partialReturn, order }
        : { ok: false, reason: "MARKET_PARTIAL_RETURN_ALREADY_WITHDRAWN", order };
    }
    const revisionConflict = validateExpectedMarketOrderRevision(order, input);
    if (revisionConflict) return revisionConflict;
    if (partialReturn.status !== "REQUESTED") return { ok: false, reason: "MARKET_PARTIAL_RETURN_NOT_WITHDRAWABLE", order };
    const next = saveMarketPartialReturnOperation(order, partialReturn.partialReturnId, {
      status: "WITHDRAWN",
      withdrawIdempotencyKey: idempotencyKey,
      withdrawnAt: getWorldTime(),
      errors: []
    });
    return next ? { ok: true, operation: "PARTIAL_RETURN_WITHDRAWN", partialReturn: getMarketPartialReturn(next, partialReturn.partialReturnId), order: next } : { ok: false, reason: "MARKET_ORDER_PERSISTENCE_FAILED" };
  }

  function commitMarketOrderPartialStockReturn(order = {}, partialReturn = {}, idempotencyKey = "") {
    const key = normalizeId(idempotencyKey);
    if (!key) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
    const lineReceipts = Array.isArray(partialReturn.lineReceipts) ? partialReturn.lineReceipts.map(normalizeMarketPartialReturnLineReceipt) : [];
    if (!lineReceipts.length) return { ok: false, reason: "MARKET_PARTIAL_RETURN_LINE_RECEIPTS_REQUIRED" };
    const previousStock = clone(stockRuntimeByOfferId);
    const touchedOfferIds = new Set();
    const committedReceipts = [];
    for (const lineReceipt of lineReceipts) {
      const record = getMarketStockReservationRecord(lineReceipt.stockReservationId);
      if (!record) {
        stockRuntimeByOfferId = previousStock;
        return { ok: false, reason: "STOCK_RESERVATION_NOT_FOUND", stockReservationId: lineReceipt.stockReservationId };
      }
      const runtime = getOfferStockRuntime(record.marketOfferId);
      const reservation = runtime.reservations[lineReceipt.stockReservationId];
      const receiptKey = `${key}:${lineReceipt.marketOrderLineId}`;
      const returnReceipts = Array.isArray(reservation.returnReceipts) ? reservation.returnReceipts.map(clone) : [];
      const replay = returnReceipts.find((receipt) => normalizeId(receipt.idempotencyKey) === receiptKey);
      if (replay) {
        if (clampInteger(replay.quantity, 0, 999999) !== lineReceipt.quantity) {
          stockRuntimeByOfferId = previousStock;
          return { ok: false, reason: "STOCK_PARTIAL_RETURN_IDEMPOTENCY_CONFLICT", stockReservationId: lineReceipt.stockReservationId };
        }
        committedReceipts.push(clone(replay));
        touchedOfferIds.add(record.marketOfferId);
        continue;
      }
      if (!["COMMITTED", "PARTIALLY_RETURNED"].includes(normalizeToken(reservation.status))) {
        stockRuntimeByOfferId = previousStock;
        return { ok: false, reason: "STOCK_RESERVATION_NOT_PARTIALLY_RETURNABLE", stockReservationId: lineReceipt.stockReservationId, status: reservation.status };
      }
      const returnedQuantity = clampInteger(reservation.returnedQuantity, 0, reservation.quantity);
      const remainingQuantity = Math.max(0, clampInteger(reservation.quantity, 0, 999999) - returnedQuantity);
      if (lineReceipt.quantity <= 0 || lineReceipt.quantity > remainingQuantity) {
        stockRuntimeByOfferId = previousStock;
        return { ok: false, reason: "STOCK_PARTIAL_RETURN_QUANTITY_INVALID", stockReservationId: lineReceipt.stockReservationId, remainingQuantity };
      }
      const receipt = {
        stockReturnReceiptId: lineReceipt.stockReturnReceiptId,
        idempotencyKey: receiptKey,
        marketOrderId: order.marketOrderId,
        partialReturnId: partialReturn.partialReturnId,
        marketOrderLineId: lineReceipt.marketOrderLineId,
        quantity: lineReceipt.quantity,
        returnedAt: getWorldTime(),
        reason: "MARKET_ORDER_PARTIAL_RETURN"
      };
      const nextReturnedQuantity = returnedQuantity + lineReceipt.quantity;
      runtime.soldQuantity = Math.max(0, clampInteger(runtime.soldQuantity, 0, 999999) - lineReceipt.quantity);
      runtime.reservations[lineReceipt.stockReservationId] = {
        ...reservation,
        status: nextReturnedQuantity >= reservation.quantity ? "RETURNED" : "PARTIALLY_RETURNED",
        returnedQuantity: nextReturnedQuantity,
        returnReceipts: [...returnReceipts, receipt],
        returnedAt: nextReturnedQuantity >= reservation.quantity ? getWorldTime() : reservation.returnedAt || null,
        returnReason: nextReturnedQuantity >= reservation.quantity ? "MARKET_ORDER_PARTIAL_RETURN" : reservation.returnReason || ""
      };
      stockRuntimeByOfferId = { ...stockRuntimeByOfferId, [record.marketOfferId]: runtime };
      committedReceipts.push(receipt);
      touchedOfferIds.add(record.marketOfferId);
    }
    if (!persistMarketStock()) {
      stockRuntimeByOfferId = previousStock;
      touchedOfferIds.forEach(refreshIndexedOfferStock);
      return { ok: false, reason: "MARKET_STOCK_PERSISTENCE_FAILED", rolledBack: true };
    }
    touchedOfferIds.forEach(refreshIndexedOfferStock);
    offerRevision += 1;
    return { ok: true, operation: "PARTIALLY_RETURNED", receipts: committedReceipts, marketOfferIds: [...touchedOfferIds] };
  }

  function isMarketOrderPartialStockReturned(partialReturn = {}, executionIdempotencyKey = "") {
    const key = normalizeId(executionIdempotencyKey);
    return (partialReturn.lineReceipts || []).every((lineReceipt) => {
      const record = getMarketStockReservationRecord(lineReceipt.stockReservationId);
      if (!record) return false;
      const receiptKey = `${key}:${lineReceipt.marketOrderLineId}`;
      return (Array.isArray(record.reservation.returnReceipts) ? record.reservation.returnReceipts : []).some((receipt) => normalizeId(receipt.idempotencyKey) === receiptKey && clampInteger(receipt.quantity, 0, 999999) === clampInteger(lineReceipt.quantity, 0, 999999));
    });
  }

  function getMarketPartialReturnBillingState(order = {}, partialReturn = {}, executionIdempotencyKey = "") {
    const originalTransactionId = normalizeId(order.billingRefs?.billingTransactionId);
    if (!originalTransactionId) return { refunded: false, reason: "BILLING_TRANSACTION_REQUIRED" };
    const key = normalizeId(executionIdempotencyKey);
    const persistedRefundId = normalizeId(partialReturn.billingRefundTransactionId);
    const persistedRefund = persistedRefundId
      ? window.WS_APP.getBillingTransaction?.(persistedRefundId) || null
      : null;
    const refundTransaction = persistedRefund || (window.WS_APP.getBillingTransactions?.() || []).find((transaction) => normalizeId(transaction.parentTransactionId) === originalTransactionId && normalizeId(transaction.idempotencyKey) === `${key}:billing-refund`) || null;
    return { refunded: Boolean(refundTransaction), refundTransaction };
  }

  function isMarketOrderFullyReturned(order = {}, includingPartialReturn = null) {
    const returned = new Set(getReturnedMarketOrderInstanceIds(order));
    if (includingPartialReturn) (includingPartialReturn.returnInstanceIds || []).forEach((instanceId) => returned.add(normalizeId(instanceId)));
    const all = getMarketOrderInstanceIds(order);
    return all.length > 0 && all.every((instanceId) => returned.has(instanceId));
  }

  function executeMarketOrderPartialReturn(marketOrderId = "", partialReturnId = "", input = {}) {
    const order = getMarketOrder(marketOrderId);
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    const partialReturn = getMarketPartialReturn(order, partialReturnId);
    if (!partialReturn) return { ok: false, reason: "MARKET_PARTIAL_RETURN_NOT_FOUND", order };
    const requestedKey = normalizeId(input.idempotencyKey || partialReturn.executionIdempotencyKey);
    if (!requestedKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
    if (partialReturn.status === "COMPLETED") {
      if (partialReturn.executionIdempotencyKey !== requestedKey) return { ok: false, reason: "MARKET_PARTIAL_RETURN_EXECUTION_IDEMPOTENCY_CONFLICT", order };
      marketBridgeDiagnostics.partialReturnExecutionReplays += 1;
      return { ok: true, operation: "IDEMPOTENT_REPLAY", partialReturn, order };
    }
    const revisionConflict = validateExpectedMarketOrderRevision(order, input);
    if (revisionConflict) return revisionConflict;
    const retrying = ["PROCESSING", "RECOVERY_REQUIRED"].includes(partialReturn.status);
    if (!retrying && partialReturn.status !== "REQUESTED") return { ok: false, reason: "MARKET_PARTIAL_RETURN_NOT_REQUESTED", order };
    const previousItemTx = partialReturn.itemTransactionId ? window.WS_APP.getItemInstanceTransaction?.(partialReturn.itemTransactionId) : null;
    if (retrying && partialReturn.executionIdempotencyKey && partialReturn.executionIdempotencyKey !== requestedKey && previousItemTx?.status !== "COMPENSATED") {
      return { ok: false, reason: "MARKET_PARTIAL_RETURN_EXECUTION_IDEMPOTENCY_CONFLICT", order };
    }
    const requiresFreshQuote = !retrying || previousItemTx?.status === "COMPENSATED" || !partialReturn.lineReceipts?.length;
    const quote = requiresFreshQuote
      ? quoteMarketOrderPartialReturn(order.marketOrderId, { instanceIds: partialReturn.returnInstanceIds, partialReturnId: partialReturn.partialReturnId })
      : {
          ok: true,
          instanceIds: partialReturn.returnInstanceIds,
          lineReceipts: partialReturn.lineReceipts,
          requestedAmount: partialReturn.requestedAmount,
          blockers: []
        };
    const quoteBlockers = (quote.blockers || []).filter((code) => code !== "MARKET_ORDER_PARTIAL_RETURN_ACTIVE");
    if (quoteBlockers.length) return { ok: false, reason: quoteBlockers[0], blockers: quoteBlockers, order };
    marketBridgeDiagnostics.partialReturnExecutions += 1;
    if (retrying) marketBridgeDiagnostics.partialReturnRecoveryAttempts += 1;
    let processing = saveMarketPartialReturnOperation(order, partialReturn.partialReturnId, {
      status: "PROCESSING",
      executionIdempotencyKey: requestedKey,
      lineReceipts: quote.lineReceipts,
      requestedAmount: quote.requestedAmount,
      processingAt: partialReturn.processingAt || getWorldTime(),
      errors: []
    }, { status: "RETURNING" });
    if (!processing) return { ok: false, reason: "MARKET_ORDER_PERSISTENCE_FAILED", order };
    let active = getMarketPartialReturn(processing, partialReturn.partialReturnId);
    const itemTransactionKey = `${requestedKey}:item-return`;
    let itemTransaction = active.itemTransactionId
      ? window.WS_APP.getItemInstanceTransaction?.(active.itemTransactionId)
      : window.WS_APP.getItemInstanceTransactionByIdempotencyKey?.(itemTransactionKey);
    if (!itemTransaction || !["COMMITTED", "RECOVERY_REQUIRED"].includes(itemTransaction.status)) {
      const itemReturn = window.WS_APP.commitItemInstanceMarketReturn?.({
        idempotencyKey: itemTransactionKey,
        citizenId: processing.citizenId,
        marketOrderId: processing.marketOrderId,
        vendorProviderId: processing.vendorProviderId,
        instanceIds: active.returnInstanceIds,
        returnReferenceId: active.partialReturnId
      }) || { ok: false, reason: "ITEM_INSTANCE_MARKET_RETURN_API_UNAVAILABLE" };
      if (!itemReturn.ok || itemReturn.compensated === true) {
        const failed = saveMarketPartialReturnOperation(processing, active.partialReturnId, {
          status: "RECOVERY_REQUIRED",
          errors: [itemReturn.reason || "ITEM_INSTANCE_MARKET_RETURN_FAILED"]
        }, { status: "COMPLETED" });
        return { ok: false, reason: itemReturn.reason || "ITEM_INSTANCE_MARKET_RETURN_FAILED", order: failed || processing };
      }
      itemTransaction = itemReturn.transaction;
      processing = saveMarketPartialReturnOperation(processing, active.partialReturnId, { itemTransactionId: itemTransaction?.transactionId || "" }) || processing;
      active = getMarketPartialReturn(processing, active.partialReturnId);
    }
    const stockReturn = commitMarketOrderPartialStockReturn(processing, active, requestedKey);
    if (!stockReturn.ok) {
      const compensation = itemTransaction?.transactionId
        ? window.WS_APP.compensateItemInstanceTransaction?.(itemTransaction.transactionId, {
            idempotencyKey: `${requestedKey}:item-return-compensation`,
            source: "MARKET_PARTIAL_RETURN_STOCK_FAILURE_COMPENSATION",
            changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "MARKET"]
          })
        : null;
      const compensated = compensation?.ok === true;
      const failed = saveMarketPartialReturnOperation(processing, active.partialReturnId, {
        status: "RECOVERY_REQUIRED",
        errors: [stockReturn.reason || "MARKET_STOCK_PARTIAL_RETURN_FAILED", ...(compensated ? [] : [compensation?.reason || "ITEM_RETURN_COMPENSATION_FAILED"])]
      }, { status: compensated ? "COMPLETED" : "PAYMENT_RECOVERY_REQUIRED" });
      return { ok: false, reason: stockReturn.reason || "MARKET_STOCK_PARTIAL_RETURN_FAILED", compensated, order: failed || processing };
    }
    const billingState = getMarketPartialReturnBillingState(processing, active, requestedKey);
    let refundTransaction = billingState.refundTransaction;
    let originalTransaction = window.WS_APP.getBillingTransaction?.(processing.billingRefs?.billingTransactionId) || null;
    if (!billingState.refunded) {
      const refund = window.WS_APP.refundBillingTransaction?.(
        processing.billingRefs?.billingTransactionId,
        active.requestedAmount,
        {
          idempotencyKey: `${requestedKey}:billing-refund`,
          reason: normalizeToken(input.reasonCode || active.reasonCode || "MARKET_ORDER_PARTIAL_RETURN"),
          createdBy: "MARKET",
          metadata: {
            marketOrderId: processing.marketOrderId,
            partialReturnId: active.partialReturnId,
            itemTransactionId: itemTransaction?.transactionId || "",
            returnedInstanceIds: active.returnInstanceIds
          }
        }
      ) || { ok: false, error: { code: "BILLING_REFUND_API_UNAVAILABLE" } };
      if (!refund.ok) {
        const recovery = saveMarketPartialReturnOperation(processing, active.partialReturnId, {
          status: "RECOVERY_REQUIRED",
          itemTransactionId: itemTransaction?.transactionId || "",
          errors: [refund.error?.code || "BILLING_REFUND_FAILED"]
        }, {
          status: "PAYMENT_RECOVERY_REQUIRED",
          compensationStatus: "PARTIAL",
          compensationErrors: [...new Set([...(processing.compensationErrors || []), refund.error?.code || "BILLING_REFUND_FAILED"])]
        });
        return { ok: false, reason: refund.error?.code || "BILLING_REFUND_FAILED", recoveryRequired: true, order: recovery || processing };
      }
      refundTransaction = refund.billingTransaction;
      originalTransaction = refund.originalTransaction || originalTransaction;
    }
    const fullyReturned = isMarketOrderFullyReturned(processing, active);
    const fullyRefunded = normalizeToken(originalTransaction?.status) === "REFUNDED";
    const completedOrderStatus = fullyReturned && fullyRefunded ? "REFUNDED" : "COMPLETED";
    const completedPaymentStatus = fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED";
    const completed = saveMarketPartialReturnOperation(processing, active.partialReturnId, {
      status: "COMPLETED",
      executionIdempotencyKey: requestedKey,
      itemTransactionId: itemTransaction?.transactionId || active.itemTransactionId || "",
      billingRefundTransactionId: refundTransaction?.billingTransactionId || active.billingRefundTransactionId || "",
      errors: [],
      completedAt: getWorldTime()
    }, {
      status: completedOrderStatus,
      paymentStatus: completedPaymentStatus,
      compensationStatus: "COMPLETED",
      compensationErrors: []
    });
    if (!completed) return { ok: false, reason: "MARKET_PARTIAL_RETURN_FINALIZATION_PERSISTENCE_FAILED", recoveryRequired: true, marketOrderId: processing.marketOrderId };
    marketBridgeDiagnostics.partialReturnsCompleted += 1;
    return {
      ok: true,
      operation: completedOrderStatus === "REFUNDED" ? "REFUNDED" : "PARTIALLY_REFUNDED",
      marketOrderId: completed.marketOrderId,
      partialReturn: getMarketPartialReturn(completed, active.partialReturnId),
      itemTransactionId: itemTransaction?.transactionId || "",
      billingRefundTransactionId: refundTransaction?.billingTransactionId || "",
      order: completed
    };
  }

  function retryMarketOrderPartialReturn(marketOrderId = "", partialReturnId = "", input = {}) {
    const order = getMarketOrder(marketOrderId);
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    const partialReturn = getMarketPartialReturn(order, partialReturnId);
    if (!partialReturn) return { ok: false, reason: "MARKET_PARTIAL_RETURN_NOT_FOUND", order };
    if (!["PROCESSING", "RECOVERY_REQUIRED"].includes(partialReturn.status)) return { ok: false, reason: "MARKET_PARTIAL_RETURN_RECOVERY_NOT_REQUIRED", order };
    const previousItemTx = partialReturn.itemTransactionId ? window.WS_APP.getItemInstanceTransaction?.(partialReturn.itemTransactionId) : null;
    const idempotencyKey = normalizeId(input.idempotencyKey)
      || (previousItemTx?.status === "COMPENSATED" ? `${partialReturn.executionIdempotencyKey}:retry:${order.revision}` : partialReturn.executionIdempotencyKey);
    return executeMarketOrderPartialReturn(marketOrderId, partialReturn.partialReturnId, { ...input, idempotencyKey, expectedRevision: input.expectedRevision ?? order.revision });
  }

  function reconcileInterruptedMarketPartialReturns() {
    let reconciled = 0;
    Object.values(marketOrdersById).map(normalizeMarketOrder).forEach((order) => {
      const active = getActiveMarketPartialReturn(order);
      if (!active || !["PROCESSING", "RECOVERY_REQUIRED"].includes(active.status)) return;
      const executionKey = normalizeId(active.executionIdempotencyKey);
      const itemTransaction = active.itemTransactionId
        ? window.WS_APP.getItemInstanceTransaction?.(active.itemTransactionId)
        : executionKey
          ? window.WS_APP.getItemInstanceTransactionByIdempotencyKey?.(`${executionKey}:item-return`)
          : null;
      const stockReturned = executionKey ? isMarketOrderPartialStockReturned(active, executionKey) : false;
      const billingState = executionKey ? getMarketPartialReturnBillingState(order, active, executionKey) : { refunded: false };
      if (itemTransaction?.status === "COMMITTED" && stockReturned && billingState.refunded) {
        const original = window.WS_APP.getBillingTransaction?.(order.billingRefs?.billingTransactionId) || null;
        const fullyReturned = isMarketOrderFullyReturned(order, active);
        const fullyRefunded = normalizeToken(original?.status) === "REFUNDED";
        const completed = saveMarketPartialReturnOperation(order, active.partialReturnId, {
          status: "COMPLETED",
          itemTransactionId: itemTransaction.transactionId,
          billingRefundTransactionId: billingState.refundTransaction?.billingTransactionId || active.billingRefundTransactionId || "",
          errors: [],
          completedAt: active.completedAt || getWorldTime()
        }, {
          status: fullyReturned && fullyRefunded ? "REFUNDED" : "COMPLETED",
          paymentStatus: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
          compensationStatus: "COMPLETED",
          compensationErrors: []
        });
        if (completed) reconciled += 1;
        return;
      }
      if (active.status === "PROCESSING") {
        const recovery = saveMarketPartialReturnOperation(order, active.partialReturnId, {
          status: "RECOVERY_REQUIRED",
          errors: [...new Set([...(active.errors || []), "MARKET_PARTIAL_RETURN_INTERRUPTED"])]
        }, { status: itemTransaction?.status === "COMMITTED" || stockReturned ? "PAYMENT_RECOVERY_REQUIRED" : "COMPLETED" });
        if (recovery) reconciled += 1;
      }
    });
    marketBridgeDiagnostics.interruptedPartialReturnsReconciled += reconciled;
    return { ok: true, reconciled };
  }

  function getMarketStockReservationRecord(reservationId = "") {
    const id = normalizeId(reservationId);
    if (!id) return null;
    for (const [marketOfferId] of Object.entries(stockRuntimeByOfferId)) {
      const runtime = getOfferStockRuntime(marketOfferId);
      const reservation = runtime.reservations[id];
      if (reservation) return { marketOfferId, runtime, reservation: clone(reservation) };
    }
    return null;
  }

  function commitMarketOrderStockReturn(order = {}, idempotencyKey = "") {
    const key = normalizeId(idempotencyKey);
    if (!key) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
    const reservationIds = [...new Set((order.lines || []).map((line) => normalizeId(line.stockReservationId)).filter(Boolean))];
    if (!reservationIds.length) return { ok: true, operation: "NOT_REQUIRED", reservationIds: [] };

    const previousStock = clone(stockRuntimeByOfferId);
    const touchedOfferIds = new Set();
    const returnedReservationIds = [];
    for (const reservationId of reservationIds) {
      const record = getMarketStockReservationRecord(reservationId);
      if (!record) {
        stockRuntimeByOfferId = previousStock;
        return { ok: false, reason: "STOCK_RESERVATION_NOT_FOUND", reservationId };
      }
      const runtime = getOfferStockRuntime(record.marketOfferId);
      const reservation = runtime.reservations[reservationId];
      if (reservation.status === "RETURNED") {
        if (normalizeId(reservation.returnIdempotencyKey) !== key) {
          stockRuntimeByOfferId = previousStock;
          return { ok: false, reason: "STOCK_RETURN_IDEMPOTENCY_CONFLICT", reservationId };
        }
        returnedReservationIds.push(reservationId);
        touchedOfferIds.add(record.marketOfferId);
        continue;
      }
      if (reservation.status !== "COMMITTED") {
        stockRuntimeByOfferId = previousStock;
        return { ok: false, reason: "STOCK_RESERVATION_NOT_RETURNABLE", reservationId, status: reservation.status };
      }
      runtime.soldQuantity = Math.max(0, clampInteger(runtime.soldQuantity, 0, 999999) - clampInteger(reservation.quantity, 0, 999999));
      runtime.reservations[reservationId] = {
        ...reservation,
        status: "RETURNED",
        returnIdempotencyKey: key,
        returnedAt: getWorldTime(),
        returnReason: "MARKET_ORDER_REFUND"
      };
      stockRuntimeByOfferId = { ...stockRuntimeByOfferId, [record.marketOfferId]: runtime };
      returnedReservationIds.push(reservationId);
      touchedOfferIds.add(record.marketOfferId);
    }

    if (!persistMarketStock()) {
      stockRuntimeByOfferId = previousStock;
      touchedOfferIds.forEach(refreshIndexedOfferStock);
      return { ok: false, reason: "MARKET_STOCK_PERSISTENCE_FAILED", rolledBack: true };
    }
    touchedOfferIds.forEach(refreshIndexedOfferStock);
    offerRevision += 1;
    return { ok: true, operation: "RETURNED", reservationIds: returnedReservationIds, marketOfferIds: [...touchedOfferIds] };
  }

  function isMarketOrderStockReturned(order = {}, idempotencyKey = "") {
    const key = normalizeId(idempotencyKey);
    const reservationIds = [...new Set((order.lines || []).map((line) => normalizeId(line.stockReservationId)).filter(Boolean))];
    return reservationIds.every((reservationId) => {
      const record = getMarketStockReservationRecord(reservationId);
      if (!record || normalizeToken(record.reservation.status) !== "RETURNED") return false;
      return !key || normalizeId(record.reservation.returnIdempotencyKey) === key;
    });
  }

  function getMarketOrderRefundBillingState(order = {}, executionIdempotencyKey = "") {
    const originalTransactionId = normalizeId(order.billingRefs?.billingTransactionId);
    if (!originalTransactionId) return { refunded: false, reason: "BILLING_TRANSACTION_REQUIRED" };
    const original = window.WS_APP.getBillingTransaction?.(originalTransactionId) || null;
    if (!original) return { refunded: false, reason: "BILLING_TRANSACTION_NOT_FOUND" };
    const amount = Number(original.amount || 0);
    const refundedAmount = Number(original.refundedAmount || 0);
    const key = normalizeId(executionIdempotencyKey);
    const refundTransaction = (window.WS_APP.getBillingTransactions?.() || []).find((transaction) => {
      if (normalizeId(transaction.parentTransactionId) !== originalTransactionId) return false;
      if (!key) return true;
      return normalizeId(transaction.idempotencyKey) === `${key}:billing-refund`;
    }) || null;
    return {
      refunded: normalizeToken(original.status) === "REFUNDED" || (amount > 0 && refundedAmount >= amount),
      originalTransaction: original,
      refundTransaction
    };
  }

  function saveMarketRefundRecovery(order = {}, patch = {}) {
    return saveMarketOrder({
      ...order,
      ...clone(patch),
      updatedAt: getWorldTime(),
      revision: order.revision + 1
    }, order.status);
  }

  function executeMarketOrderRefund(marketOrderId = "", input = {}) {
    const order = getMarketOrder(marketOrderId);
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    const requestedKey = normalizeId(input.idempotencyKey || order.refundRequest?.executionIdempotencyKey);
    if (!requestedKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };

    if (order.refundRequest?.status === "COMPLETED") {
      if (order.refundRequest.executionIdempotencyKey !== requestedKey) return { ok: false, reason: "MARKET_ORDER_REFUND_EXECUTION_IDEMPOTENCY_CONFLICT", order };
      marketBridgeDiagnostics.refundExecutionReplays += 1;
      return { ok: true, operation: "IDEMPOTENT_REPLAY", order };
    }

    const revisionConflict = validateExpectedMarketOrderRevision(order, input);
    if (revisionConflict) return revisionConflict;
    const refundStatus = normalizeToken(order.refundRequest?.status || "NONE");
    const retrying = ["PROCESSING", "RECOVERY_REQUIRED"].includes(refundStatus);
    if (!retrying && refundStatus !== "REQUESTED") return { ok: false, reason: "MARKET_ORDER_REFUND_NOT_REQUESTED", order };
    if (retrying && order.refundRequest.executionIdempotencyKey && order.refundRequest.executionIdempotencyKey !== requestedKey) {
      const previousItemTx = order.refundRequest.itemTransactionId
        ? window.WS_APP.getItemInstanceTransaction?.(order.refundRequest.itemTransactionId)
        : null;
      if (previousItemTx?.status !== "COMPENSATED") return { ok: false, reason: "MARKET_ORDER_REFUND_EXECUTION_IDEMPOTENCY_CONFLICT", order };
    }

    marketBridgeDiagnostics.refundExecutions += 1;
    if (retrying) marketBridgeDiagnostics.refundRecoveryAttempts += 1;

    const itemTransactionKey = `${requestedKey}:item-return`;
    const stockReturnKey = `${requestedKey}:stock-return`;
    const returnInstanceIds = getMarketOrderInstanceIds(order);
    let processing = saveMarketRefundRecovery(order, {
      status: "RETURNING",
      refundRequest: {
        ...order.refundRequest,
        status: "PROCESSING",
        executionIdempotencyKey: requestedKey,
        returnInstanceIds,
        processingAt: order.refundRequest?.processingAt || getWorldTime(),
        errors: [],
        updatedAt: getWorldTime()
      }
    });
    if (!processing) return { ok: false, reason: "MARKET_ORDER_PERSISTENCE_FAILED", order };

    let itemTransaction = processing.refundRequest.itemTransactionId
      ? window.WS_APP.getItemInstanceTransaction?.(processing.refundRequest.itemTransactionId)
      : window.WS_APP.getItemInstanceTransactionByIdempotencyKey?.(itemTransactionKey);

    if (!itemTransaction || !["COMMITTED", "RECOVERY_REQUIRED"].includes(itemTransaction.status)) {
      const itemReturn = window.WS_APP.commitItemInstanceMarketReturn?.({
        idempotencyKey: itemTransactionKey,
        citizenId: processing.citizenId,
        marketOrderId: processing.marketOrderId,
        vendorProviderId: processing.vendorProviderId,
        instanceIds: returnInstanceIds,
        returnReferenceId: requestedKey
      }) || { ok: false, reason: "ITEM_INSTANCE_MARKET_RETURN_API_UNAVAILABLE" };
      if (!itemReturn.ok || itemReturn.compensated === true) {
        const failed = saveMarketRefundRecovery(processing, {
          status: "COMPLETED",
          refundRequest: {
            ...processing.refundRequest,
            status: "RECOVERY_REQUIRED",
            errors: [itemReturn.reason || "ITEM_INSTANCE_MARKET_RETURN_FAILED"],
            updatedAt: getWorldTime()
          }
        });
        return { ok: false, reason: itemReturn.reason || "ITEM_INSTANCE_MARKET_RETURN_FAILED", order: failed || processing };
      }
      itemTransaction = itemReturn.transaction;
      processing = saveMarketRefundRecovery(processing, {
        refundRequest: {
          ...processing.refundRequest,
          itemTransactionId: itemTransaction?.transactionId || "",
          updatedAt: getWorldTime()
        }
      }) || processing;
    }

    const stockReturn = commitMarketOrderStockReturn(processing, stockReturnKey);
    if (!stockReturn.ok) {
      const compensation = itemTransaction?.transactionId
        ? window.WS_APP.compensateItemInstanceTransaction?.(itemTransaction.transactionId, {
            idempotencyKey: `${requestedKey}:item-return-compensation`,
            source: "MARKET_REFUND_STOCK_FAILURE_COMPENSATION",
            changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "MARKET"]
          })
        : null;
      const compensated = compensation?.ok === true;
      const failed = saveMarketRefundRecovery(processing, {
        status: compensated ? "COMPLETED" : "PAYMENT_RECOVERY_REQUIRED",
        refundRequest: {
          ...processing.refundRequest,
          status: "RECOVERY_REQUIRED",
          errors: [stockReturn.reason || "MARKET_STOCK_RETURN_FAILED", ...(compensated ? [] : [compensation?.reason || "ITEM_RETURN_COMPENSATION_FAILED"])],
          updatedAt: getWorldTime()
        }
      });
      return { ok: false, reason: stockReturn.reason || "MARKET_STOCK_RETURN_FAILED", compensated, order: failed || processing };
    }

    const billingState = getMarketOrderRefundBillingState(processing, requestedKey);
    let refundTransaction = billingState.refundTransaction;
    if (!billingState.refunded) {
      const refund = window.WS_APP.refundBillingTransaction?.(
        processing.billingRefs?.billingTransactionId,
        null,
        {
          idempotencyKey: `${requestedKey}:billing-refund`,
          reason: normalizeToken(input.reasonCode || processing.refundRequest?.reasonCode || "MARKET_ORDER_RETURNED"),
          createdBy: "MARKET",
          metadata: {
            marketOrderId: processing.marketOrderId,
            itemTransactionId: itemTransaction?.transactionId || ""
          }
        }
      ) || { ok: false, error: { code: "BILLING_REFUND_API_UNAVAILABLE" } };
      if (!refund.ok) {
        const recovery = saveMarketRefundRecovery(processing, {
          status: "PAYMENT_RECOVERY_REQUIRED",
          compensationStatus: "PARTIAL",
          compensationErrors: [...new Set([...(processing.compensationErrors || []), refund.error?.code || "BILLING_REFUND_FAILED"])],
          refundRequest: {
            ...processing.refundRequest,
            status: "RECOVERY_REQUIRED",
            itemTransactionId: itemTransaction?.transactionId || "",
            errors: [refund.error?.code || "BILLING_REFUND_FAILED"],
            updatedAt: getWorldTime()
          }
        });
        return { ok: false, reason: refund.error?.code || "BILLING_REFUND_FAILED", recoveryRequired: true, order: recovery || processing };
      }
      refundTransaction = refund.billingTransaction;
    }

    const completed = saveMarketRefundRecovery(processing, {
      status: "REFUNDED",
      paymentStatus: "REFUNDED",
      compensationStatus: "COMPLETED",
      compensationErrors: [],
      refundRequest: {
        ...processing.refundRequest,
        status: "COMPLETED",
        executionIdempotencyKey: requestedKey,
        itemTransactionId: itemTransaction?.transactionId || processing.refundRequest?.itemTransactionId || "",
        billingRefundTransactionId: refundTransaction?.billingTransactionId || processing.refundRequest?.billingRefundTransactionId || "",
        errors: [],
        completedAt: getWorldTime(),
        updatedAt: getWorldTime()
      }
    });
    if (!completed) {
      return {
        ok: false,
        reason: "MARKET_ORDER_REFUND_FINALIZATION_PERSISTENCE_FAILED",
        recoveryRequired: true,
        marketOrderId: processing.marketOrderId,
        itemTransactionId: itemTransaction?.transactionId || "",
        billingRefundTransactionId: refundTransaction?.billingTransactionId || ""
      };
    }
    return {
      ok: true,
      operation: "REFUNDED",
      marketOrderId: completed.marketOrderId,
      itemTransactionId: completed.refundRequest.itemTransactionId,
      billingRefundTransactionId: completed.refundRequest.billingRefundTransactionId,
      order: completed
    };
  }

  function retryMarketOrderRefund(marketOrderId = "", input = {}) {
    const order = getMarketOrder(marketOrderId);
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    const status = normalizeToken(order.refundRequest?.status || "NONE");
    if (!["PROCESSING", "RECOVERY_REQUIRED"].includes(status)) return { ok: false, reason: "MARKET_ORDER_REFUND_RECOVERY_NOT_REQUIRED", order };
    const previousItemTx = order.refundRequest.itemTransactionId
      ? window.WS_APP.getItemInstanceTransaction?.(order.refundRequest.itemTransactionId)
      : null;
    const key = normalizeId(input.idempotencyKey)
      || (previousItemTx?.status === "COMPENSATED"
        ? `${order.refundRequest.executionIdempotencyKey}:retry:${order.revision}`
        : order.refundRequest.executionIdempotencyKey);
    return executeMarketOrderRefund(marketOrderId, { ...input, idempotencyKey: key, expectedRevision: input.expectedRevision ?? order.revision });
  }

  function reconcileInterruptedMarketRefunds() {
    let reconciled = 0;
    Object.values(marketOrdersById).map(normalizeMarketOrder).forEach((order) => {
      const status = normalizeToken(order.refundRequest?.status || "NONE");
      if (!["PROCESSING", "RECOVERY_REQUIRED"].includes(status)) return;
      const executionKey = normalizeId(order.refundRequest?.executionIdempotencyKey);
      const itemTransaction = order.refundRequest?.itemTransactionId
        ? window.WS_APP.getItemInstanceTransaction?.(order.refundRequest.itemTransactionId)
        : executionKey
          ? window.WS_APP.getItemInstanceTransactionByIdempotencyKey?.(`${executionKey}:item-return`)
          : null;
      const stockReturned = executionKey ? isMarketOrderStockReturned(order, `${executionKey}:stock-return`) : false;
      const billingState = getMarketOrderRefundBillingState(order, executionKey);
      if (itemTransaction?.status === "COMMITTED" && stockReturned && billingState.refunded) {
        const completed = saveMarketRefundRecovery(order, {
          status: "REFUNDED",
          paymentStatus: "REFUNDED",
          compensationStatus: "COMPLETED",
          compensationErrors: [],
          refundRequest: {
            ...order.refundRequest,
            status: "COMPLETED",
            itemTransactionId: itemTransaction.transactionId,
            billingRefundTransactionId: billingState.refundTransaction?.billingTransactionId || order.refundRequest?.billingRefundTransactionId || "",
            errors: [],
            completedAt: order.refundRequest?.completedAt || getWorldTime(),
            updatedAt: getWorldTime()
          }
        });
        if (completed) reconciled += 1;
        return;
      }
      if (itemTransaction?.status === "COMPENSATED" && !stockReturned) {
        const reset = saveMarketRefundRecovery(order, {
          status: "COMPLETED",
          paymentStatus: "CAPTURED",
          refundRequest: {
            ...order.refundRequest,
            status: "RECOVERY_REQUIRED",
            errors: [...new Set([...(order.refundRequest?.errors || []), "ITEM_RETURN_COMPENSATED"])],
            updatedAt: getWorldTime()
          }
        });
        if (reset) reconciled += 1;
        return;
      }
      if (status === "PROCESSING") {
        const recovery = saveMarketRefundRecovery(order, {
          status: billingState.refunded || stockReturned ? "PAYMENT_RECOVERY_REQUIRED" : "COMPLETED",
          refundRequest: {
            ...order.refundRequest,
            status: "RECOVERY_REQUIRED",
            errors: [...new Set([...(order.refundRequest?.errors || []), "MARKET_REFUND_INTERRUPTED"])],
            updatedAt: getWorldTime()
          }
        });
        if (recovery) reconciled += 1;
      }
    });
    marketBridgeDiagnostics.interruptedRefundsReconciled += reconciled;
    return { ok: true, reconciled };
  }

  function reserveMarketStock(input = {}) {
    const marketOfferId = normalizeId(input.marketOfferId);
    const quantity = clampInteger(input.quantity || 1, 1, 999999);
    const idempotencyKey = normalizeId(input.idempotencyKey);
    const reservationId = normalizeId(input.reservationId) || makeDeterministicId("market_stock_reservation", idempotencyKey || `${marketOfferId}:${quantity}`);
    if (!marketOfferId || !idempotencyKey) return { ok: false, reason: !marketOfferId ? "MARKET_OFFER_ID_REQUIRED" : "IDEMPOTENCY_KEY_REQUIRED" };
    const offer = getMarketOffer(marketOfferId);
    if (!offer) return { ok: false, reason: "MARKET_OFFER_NOT_FOUND" };
    const runtime = getOfferStockRuntime(marketOfferId);
    const replay = Object.values(runtime.reservations).find((reservation) => reservation?.idempotencyKey === idempotencyKey || reservation?.reservationId === reservationId);
    if (replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", reservation: clone(replay), stock: offer.stock };
    if (offer.stock.mode === "FINITE" && offer.stock.availableQuantity - offer.stock.reservedQuantity < quantity) {
      return { ok: false, reason: "INSUFFICIENT_STOCK", availableQuantity: Math.max(0, offer.stock.availableQuantity - offer.stock.reservedQuantity) };
    }
    const reservation = {
      reservationId,
      marketOfferId,
      marketOrderId: normalizeId(input.marketOrderId),
      quantity,
      status: "RESERVED",
      idempotencyKey,
      createdAt: getWorldTime()
    };
    const previousRuntime = stockRuntimeByOfferId[marketOfferId] ? clone(stockRuntimeByOfferId[marketOfferId]) : null;
    runtime.reservations[reservationId] = reservation;
    stockRuntimeByOfferId = { ...stockRuntimeByOfferId, [marketOfferId]: runtime };
    if (!persistMarketStock()) {
      const next = { ...stockRuntimeByOfferId };
      if (previousRuntime) next[marketOfferId] = previousRuntime;
      else delete next[marketOfferId];
      stockRuntimeByOfferId = next;
      refreshIndexedOfferStock(marketOfferId);
      return { ok: false, reason: "MARKET_STOCK_PERSISTENCE_FAILED" };
    }
    refreshIndexedOfferStock(marketOfferId);
    return { ok: true, operation: "RESERVED", reservation: clone(reservation), stock: clone(offerIndex?.get(marketOfferId)?.stock || offer.stock) };
  }

  function commitMarketStockReservation(reservationId = "") {
    const id = normalizeId(reservationId);
    for (const [marketOfferId, rawRuntime] of Object.entries(stockRuntimeByOfferId)) {
      const runtime = getOfferStockRuntime(marketOfferId);
      const reservation = runtime.reservations[id];
      if (!reservation) continue;
      if (reservation.status === "COMMITTED") return { ok: true, operation: "IDEMPOTENT_REPLAY", reservation: clone(reservation) };
      if (reservation.status !== "RESERVED") return { ok: false, reason: "STOCK_RESERVATION_NOT_COMMITTABLE", reservation: clone(reservation) };
      const previousRuntime = clone(stockRuntimeByOfferId[marketOfferId] || runtime);
      reservation.status = "COMMITTED";
      reservation.committedAt = getWorldTime();
      runtime.soldQuantity += clampInteger(reservation.quantity, 0, 999999);
      runtime.reservations[id] = reservation;
      stockRuntimeByOfferId = { ...stockRuntimeByOfferId, [marketOfferId]: runtime };
      if (!persistMarketStock()) {
        stockRuntimeByOfferId = { ...stockRuntimeByOfferId, [marketOfferId]: previousRuntime };
        refreshIndexedOfferStock(marketOfferId);
        return { ok: false, reason: "MARKET_STOCK_PERSISTENCE_FAILED" };
      }
      refreshIndexedOfferStock(marketOfferId);
      return { ok: true, operation: "COMMITTED", reservation: clone(reservation) };
    }
    return { ok: false, reason: "STOCK_RESERVATION_NOT_FOUND" };
  }

  function releaseMarketStockReservation(reservationId = "", reason = "") {
    const id = normalizeId(reservationId);
    for (const [marketOfferId] of Object.entries(stockRuntimeByOfferId)) {
      const runtime = getOfferStockRuntime(marketOfferId);
      const reservation = runtime.reservations[id];
      if (!reservation) continue;
      if (reservation.status === "RELEASED") return { ok: true, operation: "IDEMPOTENT_REPLAY", reservation: clone(reservation) };
      const previousRuntime = clone(stockRuntimeByOfferId[marketOfferId] || runtime);
      if (reservation.status === "COMMITTED") runtime.soldQuantity = Math.max(0, runtime.soldQuantity - clampInteger(reservation.quantity, 0, 999999));
      reservation.status = "RELEASED";
      reservation.releaseReason = normalizeId(reason);
      reservation.releasedAt = getWorldTime();
      runtime.reservations[id] = reservation;
      stockRuntimeByOfferId = { ...stockRuntimeByOfferId, [marketOfferId]: runtime };
      if (!persistMarketStock()) {
        stockRuntimeByOfferId = { ...stockRuntimeByOfferId, [marketOfferId]: previousRuntime };
        refreshIndexedOfferStock(marketOfferId);
        return { ok: false, reason: "MARKET_STOCK_PERSISTENCE_FAILED" };
      }
      refreshIndexedOfferStock(marketOfferId);
      return { ok: true, operation: "RELEASED", reservation: clone(reservation) };
    }
    return { ok: false, reason: "STOCK_RESERVATION_NOT_FOUND" };
  }

  function normalizeDestinationRef(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const housingStorageId = normalizeId(source.housingStorageId);
    return housingStorageId ? { housingStorageId } : null;
  }


  function validateMarketOfferPurchaseRequirements(offerOrId = {}, citizenId = "") {
    const offer = typeof offerOrId === "string" ? getMarketOffer(offerOrId) : offerOrId;
    if (!offer) return { ok: false, blockers: ["MARKET_OFFER_NOT_FOUND"], reasons: ["MARKET_OFFER_NOT_FOUND"] };
    const requirements = offer.purchaseRequirements && typeof offer.purchaseRequirements === "object" ? offer.purchaseRequirements : {};
    const blockers = (Array.isArray(requirements.blockers) ? requirements.blockers : []).map((code) => `PURCHASE_BLOCKED:${normalizeToken(code)}`);
    const citizen = window.WS_APP.getCitizenById?.(normalizeId(citizenId)) || null;
    if (!citizen) blockers.push("CITIZEN_NOT_FOUND");

    const allowedClasses = Array.isArray(requirements.allowedCitizenClasses) ? requirements.allowedCitizenClasses.map(normalizeToken).filter(Boolean) : [];
    if (citizen && allowedClasses.length) {
      const citizenClass = normalizeToken(citizen.citizenClass || citizen.classCode || citizen.socialClass || citizen.class || citizen.type);
      if (!citizenClass || !allowedClasses.includes(citizenClass)) blockers.push("CITIZEN_CLASS_NOT_ALLOWED");
    }

    const requiredEntitlements = Array.isArray(requirements.requiredEntitlements) ? requirements.requiredEntitlements.map(normalizeId).filter(Boolean) : [];
    if (requiredEntitlements.length) {
      const resolver = window.WS_APP.resolveMarketEntitlementRequirements;
      if (typeof resolver !== "function") blockers.push("ENTITLEMENT_RESOLVER_REQUIRED");
      else {
        const result = resolver({
          citizenId: normalizeId(citizenId),
          providerId: offer.vendorProviderId,
          marketOfferId: offer.marketOfferId,
          entitlementCodes: requiredEntitlements
        }) || {};
        if (result.allowed !== true) blockers.push(...(Array.isArray(result.reasons) && result.reasons.length ? result.reasons.map(normalizeToken) : ["ENTITLEMENT_REQUIRED"]));
      }
    }

    const requiredLicenseCodes = Array.isArray(requirements.requiredLicenseCodes) ? requirements.requiredLicenseCodes.map(normalizeId).filter(Boolean) : [];
    if (requiredLicenseCodes.length) {
      const resolver = window.WS_APP.resolveMarketLicenseRequirements;
      if (typeof resolver !== "function") blockers.push("LICENSE_RESOLVER_REQUIRED");
      else {
        const result = resolver({
          citizenId: normalizeId(citizenId),
          marketOfferId: offer.marketOfferId,
          definitionId: offer.definitionId,
          licenseCodes: requiredLicenseCodes
        }) || {};
        if (result.allowed !== true) blockers.push(...(Array.isArray(result.reasons) && result.reasons.length ? result.reasons.map(normalizeToken) : ["LICENSE_REQUIRED"]));
      }
    }

    if (requirements.requiredAccessLevel) {
      const resolver = window.WS_APP.resolveMarketAccessRequirement;
      if (typeof resolver !== "function") blockers.push("ACCESS_RESOLVER_REQUIRED");
      else {
        const result = resolver({
          citizenId: normalizeId(citizenId),
          marketOfferId: offer.marketOfferId,
          requiredAccessLevel: requirements.requiredAccessLevel
        }) || {};
        if (result.allowed !== true) blockers.push(...(Array.isArray(result.reasons) && result.reasons.length ? result.reasons.map(normalizeToken) : ["ACCESS_LEVEL_REQUIRED"]));
      }
    }

    return {
      ok: blockers.length === 0,
      blockers: [...new Set(blockers)],
      reasons: [...new Set(blockers)],
      requirements: clone(requirements)
    };
  }

  function normalizeCartLine(value = {}, index = 0) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const marketOfferId = normalizeId(source.marketOfferId);
    if (!marketOfferId) return null;
    const offer = getMarketOffer(marketOfferId);
    const requestedMode = normalizeToken(source.fulfillmentMode || "DELIVER_TO_HOUSING");
    const fulfillmentMode = offer?.fulfillmentOptions?.includes(requestedMode)
      ? requestedMode
      : offer?.fulfillmentOptions?.[0] || "DELIVER_TO_HOUSING";
    return {
      cartLineId: normalizeId(source.cartLineId) || makeRuntimeId(`cart_line_${index + 1}`),
      marketOfferId,
      quantity: clampInteger(source.quantity || 1, 1, 99),
      fulfillmentMode,
      destinationRef: normalizeDestinationRef(source.destinationRef),
      linkedServiceSelection: fulfillmentMode === "PURCHASE_WITH_SERVICE"
        ? normalizeLinkedServiceSelection(source.linkedServiceSelection, offer)
        : null
    };
  }

  function normalizeCart(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const status = normalizeToken(source.status || "DRAFT");
    const seenLineIds = new Set();
    const lines = (Array.isArray(source.lines) ? source.lines : []).map(normalizeCartLine).filter((line) => {
      if (!line || seenLineIds.has(line.cartLineId)) return false;
      seenLineIds.add(line.cartLineId);
      return true;
    });
    return {
      schemaVersion: MARKET_CART_SCHEMA_VERSION,
      cartId: normalizeId(source.cartId) || makeRuntimeId("market_cart"),
      citizenId: normalizeId(source.citizenId),
      status: CART_STATUSES.has(status) ? status : "DRAFT",
      lines,
      createdAt: normalizeId(source.createdAt) || getWorldTime(),
      updatedAt: normalizeId(source.updatedAt) || getWorldTime(),
      revision: clampInteger(source.revision || 1, 1, 999999)
    };
  }

  function emitCartUpdate(cart = {}, source = "MARKET_CART_UPDATE") {
    window.dispatchEvent(new CustomEvent("ws:market-cart-updated", {
      detail: {
        cartId: cart.cartId,
        citizenId: cart.citizenId,
        status: cart.status,
        revision: cart.revision,
        source
      }
    }));
  }

  function saveCart(cart = {}, source = "MARKET_CART_UPDATE") {
    const normalized = normalizeCart(cart);
    if (!normalized.cartId || !normalized.citizenId) return null;
    cartsById = { ...cartsById, [normalized.cartId]: normalized };
    scheduleMarketCartPersistence();
    emitCartUpdate(normalized, source);
    return clone(normalized);
  }

  function createMarketCart(citizenId = "") {
    const ownerId = normalizeId(citizenId);
    if (!ownerId) return { ok: false, reason: "CITIZEN_ID_REQUIRED", cart: null };
    const cart = saveCart({ citizenId: ownerId, status: "DRAFT", lines: [] }, "MARKET_CART_CREATED");
    return { ok: Boolean(cart), reason: cart ? "CREATED" : "CART_SAVE_FAILED", cart };
  }

  function getMarketCart(cartId = "") {
    const cart = cartsById[normalizeId(cartId)] || null;
    return cart ? clone(normalizeCart(cart)) : null;
  }

  function getCitizenMarketCarts(citizenId = "", options = {}) {
    const ownerId = normalizeId(citizenId);
    return Object.values(cartsById)
      .map(normalizeCart)
      .filter((cart) => cart.citizenId === ownerId && (options.includeClosed === true || cart.status === "DRAFT"))
      .sort((a, b) => b.revision - a.revision)
      .map(clone);
  }

  function getActiveMarketCart(citizenId = "", options = {}) {
    const existing = getCitizenMarketCarts(citizenId).find((cart) => cart.status === "DRAFT") || null;
    if (existing || options.create === false) return existing;
    return createMarketCart(citizenId).cart;
  }

  function updateMarketCart(cartId = "", changes = {}) {
    const current = getMarketCart(cartId);
    if (!current) return { ok: false, reason: "MARKET_CART_NOT_FOUND", cart: null };
    if (current.status !== "DRAFT") return { ok: false, reason: "MARKET_CART_NOT_EDITABLE", cart: current };
    const patch = changes && typeof changes === "object" && !Array.isArray(changes) ? changes : {};
    let lines = [...current.lines];

    if (Array.isArray(patch.lines)) lines = patch.lines.map(normalizeCartLine).filter(Boolean);
    if (patch.addLine) {
      const addition = normalizeCartLine(patch.addLine, lines.length);
      if (!addition || !getMarketOffer(addition.marketOfferId)) return { ok: false, reason: "MARKET_OFFER_NOT_FOUND", cart: current };
      const existingIndex = lines.findIndex((line) => line.marketOfferId === addition.marketOfferId
        && line.fulfillmentMode === addition.fulfillmentMode
        && normalizeId(line.destinationRef?.housingStorageId) === normalizeId(addition.destinationRef?.housingStorageId)
        && normalizeId(line.linkedServiceSelection?.serviceDefinitionId) === normalizeId(addition.linkedServiceSelection?.serviceDefinitionId)
        && normalizeId(line.linkedServiceSelection?.providerId) === normalizeId(addition.linkedServiceSelection?.providerId));
      if (existingIndex >= 0) {
        lines[existingIndex] = { ...lines[existingIndex], quantity: clampInteger(lines[existingIndex].quantity + addition.quantity, 1, 99) };
      } else {
        lines.push(addition);
      }
    }
    if (patch.removeLineId) lines = lines.filter((line) => line.cartLineId !== normalizeId(patch.removeLineId));
    if (patch.setQuantity?.cartLineId) {
      const targetId = normalizeId(patch.setQuantity.cartLineId);
      const quantity = clampInteger(patch.setQuantity.quantity, 0, 99);
      lines = quantity === 0
        ? lines.filter((line) => line.cartLineId !== targetId)
        : lines.map((line) => line.cartLineId === targetId ? { ...line, quantity } : line);
    }
    if (patch.clear === true) lines = [];

    const next = saveCart({
      ...current,
      lines,
      updatedAt: getWorldTime(),
      revision: current.revision + 1
    });
    return { ok: Boolean(next), reason: next ? "UPDATED" : "CART_SAVE_FAILED", cart: next };
  }

  function quoteMarketCart(cartOrId = "") {
    const cart = typeof cartOrId === "string" ? getMarketCart(cartOrId) : normalizeCart(cartOrId);
    if (!cart) return { ok: false, reason: "MARKET_CART_NOT_FOUND", blockers: ["MARKET_CART_NOT_FOUND"], lines: [], totals: { subtotal: 0, finalTotal: 0, currency: "CREDIT" } };
    const blockers = [];
    const quotedLines = cart.lines.map((line) => {
      const offer = getMarketOffer(line.marketOfferId);
      const lineBlockers = [];
      if (!offer || !offer.active) lineBlockers.push("MARKET_OFFER_NOT_FOUND");
      if (offer && !["AVAILABLE", "LIMITED", "RESTRICTED"].includes(offer.availability)) lineBlockers.push(`OFFER_${offer.availability}`);
      if (offer?.stock.mode === "FINITE" && offer.stock.availableQuantity - offer.stock.reservedQuantity < line.quantity) lineBlockers.push("INSUFFICIENT_STOCK");
      if (offer) lineBlockers.push(...validateMarketOfferPurchaseRequirements(offer, cart.citizenId).blockers);
      if (line.fulfillmentMode === "DELIVER_TO_HOUSING" && !line.destinationRef?.housingStorageId) lineBlockers.push("HOUSING_DESTINATION_REQUIRED");

      let linkedServiceSelection = null;
      if (line.fulfillmentMode === "PURCHASE_WITH_SERVICE") {
        marketBridgeDiagnostics.serviceFulfillmentQuotes += 1;
        linkedServiceSelection = normalizeLinkedServiceSelection(line.linkedServiceSelection, offer);
        if (!isCyberwareProduct(offer?.catalogItem || {})) lineBlockers.push("SERVICE_FULFILLMENT_CYBERWARE_REQUIRED");
        if (!linkedServiceSelection.serviceDefinitionId) lineBlockers.push("LINKED_SERVICE_DEFINITION_REQUIRED");
        if (!linkedServiceSelection.providerId) lineBlockers.push("LINKED_SERVICE_PROVIDER_REQUIRED");
        if (!linkedServiceSelection.targetBodySlots.length) lineBlockers.push("TARGET_BODY_SLOTS_REQUIRED");
        const definition = linkedServiceSelection.serviceDefinitionId
          ? window.WS_APP.getServiceDefinition?.(linkedServiceSelection.serviceDefinitionId)
          : null;
        if (!definition) lineBlockers.push("LINKED_SERVICE_DEFINITION_NOT_FOUND");
        if (definition && normalizeToken(definition.serviceType) !== "CYBERWARE_INSTALL") lineBlockers.push("LINKED_SERVICE_TYPE_INVALID");
        if (definition?.subjectPolicy?.maxInstanceCount && line.quantity > Number(definition.subjectPolicy.maxInstanceCount)) {
          lineBlockers.push("LINKED_SERVICE_INSTANCE_LIMIT_EXCEEDED");
        }
        if (linkedServiceSelection.providerId && typeof window.WS_APP.providerSupports === "function"
          && window.WS_APP.providerSupports(linkedServiceSelection.providerId, "CYBERWARE_INSTALL") !== true) {
          lineBlockers.push("LINKED_SERVICE_PROVIDER_CAPABILITY_REQUIRED");
        }
      } else if (line.fulfillmentMode === "PICKUP") {
        marketBridgeDiagnostics.pickupFulfillmentQuotes += 1;
        if (!offer?.organizationLocationId) lineBlockers.push("PICKUP_LOCATION_REQUIRED");
      }

      const unitPrice = offer?.pricing.finalPrice || 0;
      blockers.push(...lineBlockers.map((code) => `${line.cartLineId}:${code}`));
      return {
        ...clone(line),
        linkedServiceSelection,
        serviceDefinitionId: linkedServiceSelection?.serviceDefinitionId || "",
        serviceProviderId: linkedServiceSelection?.providerId || "",
        offerRevision: offer?.revision || 0,
        catalogItemId: offer?.catalogItemId || "",
        vendorProviderId: offer?.vendorProviderId || "",
        vendorDisplayName: offer?.vendorDisplayName || "",
        organizationLocationId: offer?.organizationLocationId || "",
        sourceAddress: offer?.sourceAddress || "",
        unitPrice,
        lineTotal: unitPrice * line.quantity,
        currency: offer?.pricing.currency || "CREDIT",
        blockers: lineBlockers
      };
    });
    const currencies = [...new Set(quotedLines.map((line) => line.currency))];
    const vendors = [...new Set(quotedLines.map((line) => line.vendorProviderId).filter(Boolean))];
    const fulfillmentModes = [...new Set(quotedLines.map((line) => line.fulfillmentMode))];
    if (currencies.length > 1) blockers.push("MIXED_CURRENCY_CART");
    if (vendors.length > 1) blockers.push("MIXED_VENDOR_CART");
    if (fulfillmentModes.length > 1) blockers.push("MIXED_FULFILLMENT_CART_NOT_SUPPORTED");
    const subtotal = quotedLines.reduce((sum, line) => sum + line.lineTotal, 0);
    return {
      ok: blockers.length === 0,
      reason: blockers.length ? "MARKET_CART_BLOCKED" : "QUOTED",
      cartId: cart.cartId,
      citizenId: cart.citizenId,
      cartRevision: cart.revision,
      offerRevision: getMarketOfferRevision(),
      fulfillmentMode: fulfillmentModes[0] || "DELIVER_TO_HOUSING",
      lines: quotedLines,
      blockers: [...new Set(blockers)],
      totals: {
        subtotal,
        modifiers: [],
        finalTotal: subtotal,
        currency: currencies[0] || "CREDIT"
      }
    };
  }

  function validateMarketCheckout(input = {}) {
    const cartId = normalizeId(input.cartId || input);
    const quote = quoteMarketCart(cartId);
    const requiredApiPairs = [
      ["createBillingIntent", window.WS_APP.createBillingIntent],
      ["authorizeBillingIntent", window.WS_APP.authorizeBillingIntent],
      ["captureBillingIntent", window.WS_APP.captureBillingIntent],
      ["voidBillingIntent", window.WS_APP.voidBillingIntent],
      ["refundBillingTransaction", window.WS_APP.refundBillingTransaction]
    ];
    if (quote.fulfillmentMode === "PURCHASE_WITH_SERVICE") {
      requiredApiPairs.push(
        ["createItemInstance", window.WS_APP.createItemInstance],
        ["removeItemInstance", window.WS_APP.removeItemInstance]
      );
    }
    if (quote.fulfillmentMode === "DELIVER_TO_HOUSING") {
      requiredApiPairs.push(
        ["commitItemInstanceTransaction", window.WS_APP.commitItemInstanceTransaction],
        ["getItemInstanceTransactionByIdempotencyKey", window.WS_APP.getItemInstanceTransactionByIdempotencyKey],
        ["compensateItemInstanceTransaction", window.WS_APP.compensateItemInstanceTransaction],
        ["removeItemInstance", window.WS_APP.removeItemInstance],
        ["getHousingStorage", window.WS_APP.getHousingStorage],
        ["reserveHousingPlacement", window.WS_APP.reserveHousingPlacement],
        ["commitHousingPlacement", window.WS_APP.commitHousingPlacement],
        ["releaseHousingPlacementReservation", window.WS_APP.releaseHousingPlacementReservation],
        ["flushHousingPlacementPersistence", window.WS_APP.flushHousingPlacementPersistence]
      );
    }
    if (quote.fulfillmentMode === "PICKUP") {
      requiredApiPairs.push(
        ["commitItemInstanceTransaction", window.WS_APP.commitItemInstanceTransaction],
        ["getItemInstanceTransactionByIdempotencyKey", window.WS_APP.getItemInstanceTransactionByIdempotencyKey],
        ["compensateItemInstanceTransaction", window.WS_APP.compensateItemInstanceTransaction],
        ["removeItemInstance", window.WS_APP.removeItemInstance]
      );
    }
    if (quote.fulfillmentMode === "PURCHASE_WITH_SERVICE") {
      requiredApiPairs.push(
        ["getServiceDefinition", window.WS_APP.getServiceDefinition],
        ["providerSupports", window.WS_APP.providerSupports],
        ["createServiceOffer", window.WS_APP.createServiceOffer],
        ["createServiceOrderFromOffer", window.WS_APP.createServiceOrderFromOffer],
        ["authorizeServiceOrder", window.WS_APP.authorizeServiceOrder],
        ["scheduleServiceOrder", window.WS_APP.scheduleServiceOrder],
        ["getServiceOrder", window.WS_APP.getServiceOrder],
        ["cancelServiceOrder", window.WS_APP.cancelServiceOrder],
        ["voidServiceOrderBilling", window.WS_APP.voidServiceOrderBilling],
        ["refundServiceOrderBilling", window.WS_APP.refundServiceOrderBilling]
      );
    }
    const requiredApis = requiredApiPairs.filter(([, api]) => typeof api !== "function").map(([name]) => name);
    const blockers = [...quote.blockers, ...requiredApis.map((name) => `API_REQUIRED:${name}`)];
    if (!normalizeId(input.idempotencyKey)) blockers.push("IDEMPOTENCY_KEY_REQUIRED");
    if (!quote.lines.length) blockers.push("MARKET_CART_EMPTY");
    return {
      ...quote,
      ok: quote.ok && blockers.length === 0,
      reason: blockers.length ? "MARKET_CHECKOUT_BLOCKED" : "CHECKOUT_READY",
      blockers: [...new Set(blockers)],
      requiredApis
    };
  }

  function buildMarketOrderFromQuote(cart = {}, quote = {}, idempotencyKey = "") {
    const marketOrderId = makeDeterministicId("market_order", idempotencyKey);
    const vendorProviderId = quote.lines[0]?.vendorProviderId || "";
    return normalizeMarketOrder({
      marketOrderId,
      cartId: cart.cartId,
      citizenId: cart.citizenId,
      vendorProviderId,
      status: "DRAFT",
      paymentStatus: "NOT_REQUIRED",
      idempotencyKey,
      totals: clone(quote.totals),
      lines: quote.lines.map((line, lineIndex) => {
        const marketOrderLineId = makeDeterministicId("market_order_line", `${idempotencyKey}:${line.cartLineId}:${lineIndex}`);
        const serviceDefinitionId = normalizeId(line.serviceDefinitionId || line.linkedServiceSelection?.serviceDefinitionId);
        const serviceProviderId = normalizeId(line.serviceProviderId || line.linkedServiceSelection?.providerId);
        return {
          ...line,
          marketOrderLineId,
          definitionId: getMarketOffer(line.marketOfferId)?.definitionId || line.catalogItemId,
          stockReservationId: makeDeterministicId("market_stock_reservation", `${idempotencyKey}:${line.cartLineId}`),
          housingReservationIds: [],
          createdItemInstanceIds: Array.from({ length: line.quantity }, (_, quantityIndex) => makeDeterministicId("item_market", `${idempotencyKey}:${line.cartLineId}:${quantityIndex}`)),
          serviceDefinitionId,
          serviceProviderId,
          serviceOfferId: line.fulfillmentMode === "PURCHASE_WITH_SERVICE" ? makeDeterministicId("service_offer", `${idempotencyKey}:${line.cartLineId}`) : "",
          serviceOrderId: line.fulfillmentMode === "PURCHASE_WITH_SERVICE" ? makeDeterministicId("service_order", `${idempotencyKey}:${line.cartLineId}`) : "",
          serviceStatus: line.fulfillmentMode === "PURCHASE_WITH_SERVICE" ? "PENDING" : "NOT_REQUIRED"
        };
      }),
      linkedServiceOfferIds: quote.lines.filter((line) => line.fulfillmentMode === "PURCHASE_WITH_SERVICE").map((line) => makeDeterministicId("service_offer", `${idempotencyKey}:${line.cartLineId}`)),
      linkedServiceOrderIds: quote.lines.filter((line) => line.fulfillmentMode === "PURCHASE_WITH_SERVICE").map((line) => makeDeterministicId("service_order", `${idempotencyKey}:${line.cartLineId}`)),
      shipmentId: quote.fulfillmentMode === "DELIVER_TO_HOUSING" ? makeDeterministicId("market_shipment", `${idempotencyKey}:delivery`) : "",
      deliveryFulfillment: quote.fulfillmentMode === "DELIVER_TO_HOUSING"
        ? { status: "PENDING", shipmentId: makeDeterministicId("market_shipment", `${idempotencyKey}:delivery`), recoveryRequired: false }
        : { status: "NOT_REQUIRED" },
      pickupFulfillment: quote.fulfillmentMode === "PICKUP"
        ? {
            status: "PENDING",
            providerId: quote.lines[0]?.vendorProviderId || vendorProviderId,
            organizationLocationId: quote.lines[0]?.organizationLocationId || "",
            sourceAddress: quote.lines[0]?.sourceAddress || "",
            vendorDisplayName: quote.lines[0]?.vendorDisplayName || "",
            reservationDays: getPickupReservationDays(),
            completionIdempotencyKey: `${idempotencyKey}:pickup-complete`,
            recoveryRequired: false,
            errors: []
          }
        : { status: "NOT_REQUIRED" },
      serviceFulfillment: quote.fulfillmentMode === "PURCHASE_WITH_SERVICE"
        ? { status: "PENDING", startedAt: null, completedAt: null, failedAt: null, lastServiceOrderId: "", lastServiceStatus: "", recoveryRequired: false, errors: [] }
        : { status: "NOT_REQUIRED" },
      createdAt: getWorldTime(),
      updatedAt: getWorldTime(),
      revision: 1
    });
  }

  function updateCheckoutOrder(order = {}, patch = {}) {
    const previousStatus = order.status;
    return saveMarketOrder({
      ...order,
      ...clone(patch),
      updatedAt: getWorldTime(),
      revision: order.revision + 1
    }, previousStatus);
  }

  function requireCheckoutOrderUpdate(order = {}, patch = {}, failureCode = "MARKET_ORDER_PERSISTENCE_FAILED") {
    const next = updateCheckoutOrder(order, patch);
    if (!next) throw new Error(failureCode);
    return next;
  }

  function buildMarketItemInstanceSource(order = {}, orderLine = {}, unitIndex = 0, placementContext = {}) {
    const offer = getMarketOffer(orderLine.marketOfferId);
    const product = window.WS_APP.getEquipmentCatalogItemById?.(offer?.catalogItemId) || offer?.catalogItem || {};
    const instanceId = orderLine.createdItemInstanceIds[unitIndex];
    const cyberware = isCyberwareProduct(product);
    const serviceFulfillment = orderLine.fulfillmentMode === "PURCHASE_WITH_SERVICE";
    const pickupFulfillment = orderLine.fulfillmentMode === "PICKUP";
    const deliveryFulfillment = orderLine.fulfillmentMode === "DELIVER_TO_HOUSING" && Boolean(placementContext.deliveryShipmentId || order.shipmentId);
    const location = serviceFulfillment
      ? {
          type: "SERVICE",
          characterId: order.citizenId,
          serviceId: orderLine.serviceOrderId,
          serviceOrderId: orderLine.serviceOrderId,
          providerId: orderLine.serviceProviderId,
          marketOrderId: order.marketOrderId,
          marketOrderLineId: orderLine.marketOrderLineId
        }
      : (pickupFulfillment || deliveryFulfillment)
        ? {
            type: "VENDOR",
            vendorId: orderLine.vendorProviderId || order.vendorProviderId,
            vendorProviderId: orderLine.vendorProviderId || order.vendorProviderId,
            organizationLocationId: orderLine.organizationLocationId || order.pickupFulfillment?.organizationLocationId || placementContext.organizationLocationId || "",
            sourceAddress: orderLine.sourceAddress || order.pickupFulfillment?.sourceAddress || placementContext.sourceAddress || "",
            marketOrderId: order.marketOrderId,
            marketOrderLineId: orderLine.marketOrderLineId,
            ...(pickupFulfillment ? { pickupStatus: "READY", pickupExpiresAt: order.pickupFulfillment?.expiresAt || null } : { shipmentId: placementContext.deliveryShipmentId || order.shipmentId, deliveryStatus: "IN_TRANSIT", destinationStorageId: orderLine.destinationRef?.housingStorageId || "" })
          }
        : {
          type: "HOUSING_STORAGE",
          storageUnitId: placementContext.housingStorageId,
          gridX: placementContext.placement?.gridX,
          gridY: placementContext.placement?.gridY,
          rotation: placementContext.placement?.rotation || 0
        };
    return {
      ...clone(product),
      instanceId,
      id: instanceId,
      itemId: offer?.catalogItemId || orderLine.catalogItemId,
      catalogId: offer?.catalogItemId || orderLine.catalogItemId,
      definitionId: offer?.definitionId || orderLine.definitionId || orderLine.catalogItemId,
      ownerId: order.citizenId,
      quantity: 1,
      lifecycleState: serviceFulfillment ? "IN_SERVICE" : ((pickupFulfillment || deliveryFulfillment) ? "PACKAGED" : "UNPACKAGED"),
      location,
      status: "OWNED",
      operatingStatus: cyberware ? "PACKAGED" : (product.operatingStatus || "ACTIVE"),
      acquisition: {
        sourceType: "MARKET",
        marketOrderId: order.marketOrderId,
        marketOrderLineId: orderLine.marketOrderLineId,
        marketOfferId: orderLine.marketOfferId,
        vendorProviderId: order.vendorProviderId,
        serviceOrderId: orderLine.serviceOrderId || "",
        serviceProviderId: orderLine.serviceProviderId || "",
        pickupOrganizationLocationId: pickupFulfillment ? (orderLine.organizationLocationId || order.pickupFulfillment?.organizationLocationId || "") : "",
        pickupReadyAt: pickupFulfillment ? (order.pickupFulfillment?.readyAt || getWorldTime()) : null,
        pickupExpiresAt: pickupFulfillment ? (order.pickupFulfillment?.expiresAt || null) : null,
        deliveryShipmentId: deliveryFulfillment ? (placementContext.deliveryShipmentId || order.shipmentId || "") : "",
        deliveryEtaAt: deliveryFulfillment ? (placementContext.etaAt || order.deliveryFulfillment?.etaAt || null) : null,
        acquiredAt: getWorldTime(),
        price: orderLine.unitPrice,
        currency: order.totals?.currency || "CREDIT"
      },
      marketOrderId: order.marketOrderId,
      marketOrderLineId: orderLine.marketOrderLineId,
      marketOfferId: orderLine.marketOfferId
    };
  }

  function parseMarketVisibleAddress(address = "") {
    const clean = normalizeId(address);
    const [main = "", local = ""] = clean.split("::");
    const mainParts = main.split(".").map((part) => part.trim()).filter(Boolean);
    const localParts = local.split(".").map((part) => part.trim()).filter(Boolean);
    const controlCode = mainParts.length ? mainParts[mainParts.length - 1] : "";
    return { raw: clean, cityCode: mainParts[0] || "", geoAddress: mainParts[1] || "", controlCode, zoneCode: controlCode.slice(0, 1), chunk: localParts[0] || "" };
  }

  function resolveMarketDeliveryRoute(order = {}) {
    const firstLine = order.lines?.[0] || {};
    const destinationStorageId = normalizeId(firstLine.destinationRef?.housingStorageId);
    const storage = window.WS_APP.getHousingStorage?.(destinationStorageId, order.citizenId) || null;
    const citizen = window.WS_APP.getCitizenById?.(order.citizenId) || null;
    const sourceAddress = normalizeId(firstLine.sourceAddress || window.WS_APP.resolveOrganizationLocationSource?.(firstLine.organizationLocationId)?.sourceAddress);
    const destinationAddress = normalizeId(storage?.record?.visibleAddress || citizen?.visibleAddress || citizen?.address);
    const source = parseMarketVisibleAddress(sourceAddress);
    const destination = parseMarketVisibleAddress(destinationAddress);
    const config = getDeliveryFulfillmentConfig();
    let days = clampInteger(config.defaultShippingDays ?? 2, clampInteger(config.minShippingDays ?? 1, 1, 30), clampInteger(config.maxShippingDays ?? 30, 1, 30));
    let routeClass = "STANDARD_LOCAL";
    if (source.cityCode && destination.cityCode && source.cityCode !== destination.cityCode) { days = 3; routeClass = "INTER_AGGLOMERATION"; }
    else if (source.zoneCode && destination.zoneCode && source.zoneCode !== destination.zoneCode) { days = 2; routeClass = "SAME_AGGLOMERATION_DIFFERENT_ZONE"; }
    else if (source.chunk && destination.chunk && source.chunk === destination.chunk) { days = 1; routeClass = "SAME_CHUNK"; }
    else if (source.cityCode && destination.cityCode && source.cityCode === destination.cityCode) { days = 1; routeClass = "SAME_AGGLOMERATION_STANDARD"; }
    const controlled = (order.lines || []).some((line) => {
      const offer = getMarketOffer(line.marketOfferId);
      const product = window.WS_APP.getEquipmentCatalogItemById?.(offer?.catalogItemId) || offer?.catalogItem || {};
      return ["RESTRICTED", "CORPORATE", "LICENSED"].includes(normalizeToken(product.legality)) || ["WEAPON", "ARMOR", "CONTAINER"].includes(normalizeToken(product.category));
    });
    if (controlled) { days = Math.min(30, days + 1); routeClass = `${routeClass}_CONTROLLED`; }
    return { shippingDays: days, routeClass, sourceAddress, destinationAddress, destinationStorageId, destinationHousingId: normalizeId(storage?.record?.id) };
  }

  function buildMarketShipmentForOrder(order = {}) {
    const route = resolveMarketDeliveryRoute(order);
    const packedAt = getWorldTime();
    const shipmentId = normalizeId(order.shipmentId || order.deliveryFulfillment?.shipmentId) || makeDeterministicId("market_shipment", `${order.idempotencyKey}:delivery`);
    return normalizeMarketShipment({
      shipmentId,
      marketOrderId: order.marketOrderId,
      citizenId: order.citizenId,
      providerId: order.vendorProviderId,
      organizationLocationId: order.lines?.[0]?.organizationLocationId || "",
      sourceAddress: route.sourceAddress,
      destinationHousingId: route.destinationHousingId,
      destinationStorageId: route.destinationStorageId,
      destinationAddress: route.destinationAddress,
      status: "PENDING",
      routeClass: route.routeClass,
      shippingDays: route.shippingDays,
      instanceIds: getMarketOrderInstanceIds(order),
      packedAt,
      etaAt: addWorldDays(packedAt, route.shippingDays),
      createdAt: packedAt,
      revision: 1
    });
  }

  function isDeliveryOrder(order = {}) {
    return Array.isArray(order.lines) && order.lines.length > 0 && order.lines.every((line) => line.fulfillmentMode === "DELIVER_TO_HOUSING");
  }

  function isPendingDeliveryCustodyInstance(order = {}, instanceId = "") {
    const shipment = getMarketOrderShipment(order);
    const instance = window.WS_APP.getItemInstanceById?.(instanceId) || null;
    if (!shipment || !instance) return false;
    return normalizeId(instance.ownerId) === order.citizenId
      && normalizeToken(instance.location?.type) === "VENDOR"
      && normalizeId(instance.acquisition?.marketOrderId || instance.marketOrderId) === order.marketOrderId
      && normalizeId(instance.location?.shipmentId || instance.acquisition?.deliveryShipmentId) === shipment.shipmentId;
  }

  function isPurchaseWithServiceOrder(order = {}) {
    return Array.isArray(order.lines)
      && order.lines.length > 0
      && order.lines.every((line) => line.fulfillmentMode === "PURCHASE_WITH_SERVICE");
  }

  function isPickupOrder(order = {}) {
    return Array.isArray(order.lines)
      && order.lines.length > 0
      && order.lines.every((line) => line.fulfillmentMode === "PICKUP");
  }

  function isPendingPickupCustodyInstance(order = {}, instanceId = "") {
    const instance = window.WS_APP.getItemInstanceById?.(instanceId) || null;
    if (!instance) return false;
    return normalizeId(instance.ownerId) === order.citizenId
      && normalizeToken(instance.location?.type) === "VENDOR"
      && normalizeId(instance.acquisition?.marketOrderId || instance.marketOrderId) === order.marketOrderId
      && normalizeId(instance.location?.vendorProviderId || instance.location?.vendorId) === normalizeId(order.pickupFulfillment?.providerId || order.vendorProviderId);
  }

  function isPendingServiceCustodyInstance(order = {}, instanceId = "") {
    const instance = window.WS_APP.getItemInstanceById?.(instanceId) || null;
    if (!instance) return false;
    return normalizeId(instance.ownerId) === order.citizenId
      && normalizeToken(instance.location?.type) === "SERVICE"
      && normalizeId(instance.acquisition?.marketOrderId || instance.marketOrderId) === order.marketOrderId
      && order.linkedServiceOrderIds.includes(normalizeId(instance.location?.serviceOrderId || instance.location?.serviceId));
  }

  function settleLinkedServiceBilling(serviceOrderId = "", reasonCode = "MARKET_SERVICE_FULFILLMENT_COMPENSATION") {
    const serviceOrder = window.WS_APP.getServiceOrder?.(serviceOrderId) || null;
    if (!serviceOrder) return { ok: true, reason: "SERVICE_ORDER_NOT_FOUND_NO_ACTION" };
    const paymentStatus = normalizeToken(serviceOrder.paymentStatus || "NOT_REQUIRED");
    if (["CAPTURED", "PARTIALLY_CAPTURED", "PAYMENT_RECOVERY_REQUIRED", "PARTIALLY_REFUNDED"].includes(paymentStatus)) {
      return window.WS_APP.refundServiceOrderBilling?.(serviceOrderId, null, {
        idempotencyKey: `market:${serviceOrderId}:service-refund`,
        reason: reasonCode,
        createdBy: "MARKET"
      }) || { ok: false, reason: "SERVICE_BILLING_REFUND_API_UNAVAILABLE" };
    }
    if (["AUTHORIZED", "PENDING"].includes(paymentStatus)) {
      return window.WS_APP.voidServiceOrderBilling?.(serviceOrderId, {
        idempotencyKey: `market:${serviceOrderId}:service-void`,
        reason: reasonCode,
        createdBy: "MARKET"
      }) || { ok: false, reason: "SERVICE_BILLING_VOID_API_UNAVAILABLE" };
    }
    return { ok: true, reason: "SERVICE_BILLING_ALREADY_SETTLED" };
  }

  function settleThenCancelLinkedServiceOrder(serviceOrderId = "", reasonCode = "MARKET_SERVICE_FULFILLMENT_COMPENSATION", options = {}) {
    const terminalStatuses = ["COMPLETED", "FAILED", "CANCELLED", "REJECTED", "EXPIRED"];
    const id = normalizeId(serviceOrderId);
    if (!id) return { ok: true, reason: "SERVICE_ORDER_NOT_LINKED" };
    const initial = window.WS_APP.getServiceOrder?.(id) || null;
    if (!initial) return { ok: true, reason: "SERVICE_ORDER_NOT_FOUND_NO_ACTION" };
    if (terminalStatuses.includes(normalizeToken(initial.status))) {
      return { ok: true, reason: "SERVICE_ORDER_ALREADY_TERMINAL", order: initial };
    }

    const billingSettlement = settleLinkedServiceBilling(id, reasonCode);
    if (!billingSettlement?.ok) {
      return { ok: false, reason: billingSettlement?.reason || "SERVICE_BILLING_SETTLEMENT_FAILED", billingSettlement, order: initial };
    }

    const fresh = window.WS_APP.getServiceOrder?.(id) || null;
    if (!fresh) return { ok: true, reason: "SERVICE_ORDER_NOT_FOUND_AFTER_BILLING_SETTLEMENT" };
    if (terminalStatuses.includes(normalizeToken(fresh.status))) {
      return { ok: true, reason: "SERVICE_ORDER_ALREADY_TERMINAL_AFTER_BILLING_SETTLEMENT", billingSettlement, order: fresh };
    }

    const cancelled = window.WS_APP.cancelServiceOrder?.(id, reasonCode, {
      idempotencyKey: normalizeId(options.idempotencyKey) || `market:${id}:service-cancel:${normalizeId(reasonCode) || "compensation"}`,
      expectedRevision: fresh.revision,
      metadata: { ...(options.metadata || {}) }
    }) || { ok: false, reason: "SERVICE_CANCEL_API_UNAVAILABLE", order: fresh };

    return cancelled?.ok
      ? { ok: true, reason: "SERVICE_ORDER_CANCELLED_AFTER_BILLING_SETTLEMENT", billingSettlement, order: cancelled.order || fresh }
      : { ok: false, reason: cancelled?.reason || "SERVICE_CANCEL_FAILED", billingSettlement, cancellation: cancelled, order: fresh };
  }

  function compensateMarketCheckout(order = {}, context = {}, failureCode = "CHECKOUT_FAILED") {
    const compensationErrors = [];
    serviceCompensationInProgressOrderIds.add(order.marketOrderId);
    (context.linkedServiceOrderIds || []).forEach((serviceOrderId) => {
      const settlement = settleThenCancelLinkedServiceOrder(serviceOrderId, failureCode, {
        idempotencyKey: `${order.idempotencyKey}:service-cancel:${serviceOrderId}`,
        metadata: { marketOrderId: order.marketOrderId }
      });
      if (!settlement?.ok) compensationErrors.push(`SERVICE_CANCEL:${serviceOrderId}:${settlement?.reason || "FAILED"}`);
    });
    if (compensationErrors.some((error) => String(error || "").startsWith("SERVICE_CANCEL:"))) {
      compensationErrors.push("ITEM_REMOVE_BLOCKED_BY_SERVICE_TERMINAL_FAILURE");
    } else if (context.itemTransactionId) {
      const compensated = window.WS_APP.compensateItemInstanceTransaction?.(context.itemTransactionId, {
        idempotencyKey: `${order.idempotencyKey}:market-custody-compensation`
      });
      if (!compensated?.ok) compensationErrors.push(`ITEM_TRANSACTION_COMPENSATION:${context.itemTransactionId}:${compensated?.reason || "FAILED"}`);
    } else {
      (context.createdItemInstanceIds || []).forEach((instanceId) => {
        const result = window.WS_APP.removeItemInstance?.(instanceId, {
          source: "MARKET_CHECKOUT_COMPENSATION",
          deferPersistence: true,
          skipCitizenEvent: true,
          skipItemEvent: true,
          skipModuleRefresh: true,
          skipProfileRefresh: true
        });
        if (result && result.ok === false) compensationErrors.push(`ITEM_REMOVE:${instanceId}:${result.reason || "FAILED"}`);
      });
    }
    (context.housingReservationIds || []).forEach((reservationId) => {
      const result = window.WS_APP.releaseHousingPlacementReservation?.(reservationId, failureCode);
      if (!result?.ok) compensationErrors.push(`HOUSING_RELEASE:${reservationId}:${result?.reason || "FAILED"}`);
    });
    if (typeof window.WS_APP.flushHousingPlacementPersistence === "function" && !window.WS_APP.flushHousingPlacementPersistence()) {
      compensationErrors.push("HOUSING_RELEASE_PERSISTENCE_FAILED");
    }
    (context.stockReservationIds || []).forEach((reservationId) => {
      const result = releaseMarketStockReservation(reservationId, failureCode);
      if (!result?.ok) compensationErrors.push(`STOCK_RELEASE:${reservationId}:${result?.reason || "FAILED"}`);
    });

    let billingRecoveryRequired = false;
    if (context.billingTransactionId) {
      const refund = window.WS_APP.refundBillingTransaction?.(context.billingTransactionId, null, {
        idempotencyKey: `${order.idempotencyKey}:refund`,
        reason: failureCode,
        recordHistory: true
      });
      if (!refund?.ok) {
        billingRecoveryRequired = true;
        compensationErrors.push(`BILLING_REFUND:${context.billingTransactionId}:${refund?.error?.code || "FAILED"}`);
      }
    } else if (context.billingIntentId) {
      const voidResult = window.WS_APP.voidBillingIntent?.(context.billingIntentId, { reason: failureCode });
      if (!voidResult?.ok) compensationErrors.push(`BILLING_VOID:${context.billingIntentId}:${voidResult?.error?.code || "FAILED"}`);
    }

    const currentCart = getMarketCart(order.cartId);
    if (currentCart?.status === "CHECKED_OUT") {
      const restoredCart = saveCart({ ...currentCart, status: "DRAFT", updatedAt: getWorldTime(), revision: currentCart.revision + 1 }, "MARKET_CART_CHECKOUT_ROLLED_BACK");
      if (!restoredCart || !flushMarketCartPersistence()) compensationErrors.push(`CART_RESTORE:${order.cartId}:PERSISTENCE_FAILED`);
    }
    window.WS_APP.flushScheduledItemStorePersistence?.();
    const compensated = updateCheckoutOrder(order, {
      status: billingRecoveryRequired ? "PAYMENT_RECOVERY_REQUIRED" : "FAILED",
      paymentStatus: billingRecoveryRequired ? "PAYMENT_RECOVERY_REQUIRED" : (context.billingTransactionId ? "REFUNDED" : (context.billingIntentId ? "VOIDED" : "NOT_REQUIRED")),
      failureCode,
      compensationStatus: compensationErrors.length ? "PARTIAL" : "COMPLETED",
      compensationErrors
    });
    serviceCompensationInProgressOrderIds.delete(order.marketOrderId);
    return compensated;
  }

  function retryMarketOrderCheckout(marketOrderId = "", paymentInput = {}) {
    const order = getMarketOrder(marketOrderId);
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    const revisionConflict = validateExpectedMarketOrderRevision(order, paymentInput);
    if (revisionConflict) return revisionConflict;
    const actionState = getMarketOrderActionState(order);
    if (!actionState.canRetryCheckout) return { ok: false, reason: actionState.checkoutRetryBlockers[0] || "MARKET_ORDER_CHECKOUT_NOT_RETRYABLE", blockers: actionState.checkoutRetryBlockers, order };
    marketBridgeDiagnostics.checkoutRetries += 1;
    return checkoutMarketCart(order.cartId, {
      ...paymentInput,
      idempotencyKey: order.idempotencyKey
    });
  }

  function emitFinalMarketCommitEvents(order = {}, instanceIds = []) {
    const eventKey = `${order.marketOrderId}:${order.revision}`;
    if (finalMarketCommitEventsByOrderId.has(eventKey)) {
      marketBridgeDiagnostics.duplicateFinalCommitEventsSuppressed += 1;
      return false;
    }
    finalMarketCommitEventsByOrderId.add(eventKey);
    marketBridgeDiagnostics.stockEventsEmitted += 1;
    window.dispatchEvent(new CustomEvent("ws:market-stock-updated", {
      detail: {
        eventId: `market-stock:${eventKey}`,
        marketOrderId: order.marketOrderId,
        marketOfferIds: [...new Set(order.lines.map((line) => line.marketOfferId).filter(Boolean))],
        changedDomains: ["MARKET_STOCK"],
        revision: offerRevision
      }
    }));
    marketBridgeDiagnostics.itemCommitEventsEmitted += 1;
    const pickupCommit = isPickupOrder(order);
    const deliveryCommit = isDeliveryOrder(order);
    window.dispatchEvent(new CustomEvent("ws:item-instances-updated", {
      detail: {
        eventId: `market-item-commit:${eventKey}`,
        operationId: order.marketOrderId,
        citizenId: order.citizenId,
        instanceIds: [...new Set(instanceIds.map(normalizeId).filter(Boolean))],
        source: pickupCommit ? "MARKET_PICKUP" : (deliveryCommit ? "MARKET_DELIVERY" : "MARKET_CHECKOUT"),
        changedDomains: pickupCommit ? ["ITEM_INSTANCE", "EQUIPMENT", "MARKET"] : ["ITEM_INSTANCE", "EQUIPMENT", "HOUSING", "MARKET_SHIPMENT"],
        revision: window.WS_APP.getItemInstanceStoreRevision?.() || 0
      }
    }));
    return true;
  }

  function checkoutMarketCartHousing(cartId = "", paymentInput = {}) {
    marketBridgeDiagnostics.checkoutAttempts += 1;
    marketBridgeDiagnostics.deliveryFulfillmentStarts += 1;
    const idempotencyKey = normalizeId(paymentInput.idempotencyKey);
    const existing = getMarketOrderByIdempotencyKey(idempotencyKey);
    if (existing && isDeliveryOrder(existing) && ["FULFILLING", "COMPLETED"].includes(existing.status)) {
      marketBridgeDiagnostics.checkoutIdempotentReplays += 1;
      const shipment = getMarketOrderShipment(existing);
      return { ok: true, operation: existing.status === "COMPLETED" ? "IDEMPOTENT_REPLAY" : "DELIVERY_IN_TRANSIT_REPLAY", status: existing.status, marketOrderId: existing.marketOrderId, billingTransactionId: existing.billingRefs?.billingTransactionId || "", createdItemInstanceIds: [...existing.createdItemInstanceIds], shipment, order: existing };
    }
    if (existing && ["FAILED", "CANCELLED", "PAYMENT_RECOVERY_REQUIRED"].includes(existing.status)) return { ok: false, status: existing.status, reason: existing.failureCode || existing.status, marketOrderId: existing.marketOrderId, order: existing };

    const validation = validateMarketCheckout({ cartId, idempotencyKey });
    if (!validation.ok) return { ok: false, status: "BLOCKED", reason: validation.reason, cartId: normalizeId(cartId), blockers: validation.blockers, requiredApis: validation.requiredApis, marketOrderId: "", billingTransactionId: "", createdItemInstanceIds: [] };
    if (validation.fulfillmentMode !== "DELIVER_TO_HOUSING") return { ok: false, status: "BLOCKED", reason: "MARKET_DELIVERY_CART_REQUIRED" };

    const cart = getMarketCart(cartId);
    let order = existing || saveMarketOrder(buildMarketOrderFromQuote(cart, validation, idempotencyKey));
    if (!order) return { ok: false, status: "FAILED", reason: "MARKET_ORDER_PERSISTENCE_FAILED" };
    let shipment = getMarketOrderShipment(order);
    const context = { stockReservationIds: [], housingReservationIds: [], createdItemInstanceIds: [], billingIntentId: order.billingRefs?.billingIntentId || "", billingTransactionId: order.billingRefs?.billingTransactionId || "", itemTransactionId: shipment?.custodyItemTransactionId || "" };

    try {
      if (order.status === "DRAFT") order = requireCheckoutOrderUpdate(order, { status: "RESERVING" });
      for (const line of order.lines) {
        const stockResult = reserveMarketStock({ marketOfferId: line.marketOfferId, quantity: line.quantity, marketOrderId: order.marketOrderId, reservationId: line.stockReservationId, idempotencyKey: `${idempotencyKey}:stock:${line.marketOrderLineId}` });
        if (!stockResult.ok) throw new Error(stockResult.reason || "STOCK_RESERVATION_FAILED");
        context.stockReservationIds.push(stockResult.reservation.reservationId);
      }

      const billingCreate = window.WS_APP.createBillingIntent({ citizenId: order.citizenId, sourceDomain: "MARKET", sourceRefId: order.marketOrderId, amount: order.totals.finalTotal, currency: order.totals.currency || "CREDIT", descriptionCode: "MARKET_DELIVERY_CHECKOUT", paymentSource: normalizeToken(paymentInput.paymentSource || "CREDITS"), idempotencyKey: `${idempotencyKey}:billing`, correlationId: order.marketOrderId, providerId: order.vendorProviderId, metadata: { cartId: order.cartId, fulfillmentMode: "DELIVER_TO_HOUSING" } });
      if (!billingCreate?.ok) throw new Error(billingCreate?.error?.code || "BILLING_INTENT_CREATE_FAILED");
      context.billingIntentId = billingCreate.billingIntent.billingIntentId;
      const billingAuthorize = window.WS_APP.authorizeBillingIntent(context.billingIntentId, { idempotencyKey: `${idempotencyKey}:authorize` });
      if (!billingAuthorize?.ok) throw new Error(billingAuthorize?.error?.code || "BILLING_AUTHORIZATION_FAILED");
      if (["DRAFT", "RESERVING"].includes(order.status)) order = requireCheckoutOrderUpdate(order, { status: "AUTHORIZED", paymentStatus: "AUTHORIZED", billingRefs: { billingIntentId: context.billingIntentId } });
      const billingCapture = window.WS_APP.captureBillingIntent(context.billingIntentId, { idempotencyKey: `${idempotencyKey}:capture`, note: `Market delivery order ${order.marketOrderId}.`, createdBy: "MARKET" });
      if (!billingCapture?.ok) throw new Error(billingCapture?.error?.code || "BILLING_CAPTURE_FAILED");
      context.billingTransactionId = billingCapture.billingTransaction?.billingTransactionId || "";

      shipment = shipment || saveMarketShipment(buildMarketShipmentForOrder(order));
      if (!shipment) throw new Error("MARKET_SHIPMENT_PERSISTENCE_FAILED");
      order = requireCheckoutOrderUpdate(order, { status: "FULFILLING", paymentStatus: "CAPTURED", billingRefs: { billingIntentId: context.billingIntentId, billingTransactionId: context.billingTransactionId }, shipmentId: shipment.shipmentId, deliveryFulfillment: { status: "PREPARING", shipmentId: shipment.shipmentId, etaAt: shipment.etaAt, routeClass: shipment.routeClass, recoveryRequired: false } });

      const createOperations = [];
      order.lines.forEach((line) => line.createdItemInstanceIds.forEach((instanceId, unitIndex) => {
        createOperations.push({ type: "CREATE", instanceId, expected: { exists: false }, instance: buildMarketItemInstanceSource(order, line, unitIndex, { deliveryShipmentId: shipment.shipmentId, organizationLocationId: shipment.organizationLocationId, sourceAddress: shipment.sourceAddress, etaAt: shipment.etaAt }) });
        context.createdItemInstanceIds.push(instanceId);
      }));
      const itemCommit = window.WS_APP.commitItemInstanceTransaction({ idempotencyKey: `${idempotencyKey}:delivery-custody`, sourceDomain: "MARKET", sourceRefId: order.marketOrderId, citizenId: order.citizenId, changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "MARKET", "MARKET_SHIPMENT"], metadata: { operationType: "MARKET_DELIVERY_PREPARE", shipmentId: shipment.shipmentId, providerId: shipment.providerId, etaAt: shipment.etaAt }, operations: createOperations });
      if (!itemCommit?.ok || itemCommit.compensated) throw new Error(itemCommit?.reason || "ITEM_INSTANCE_DELIVERY_CUSTODY_FAILED");
      context.itemTransactionId = normalizeId(itemCommit.transaction?.transactionId);
      for (const line of order.lines) { const stockCommit = commitMarketStockReservation(line.stockReservationId); if (!stockCommit.ok) throw new Error(stockCommit.reason || "STOCK_COMMIT_FAILED"); }
      window.WS_APP.flushScheduledItemStorePersistence?.();
      const checkedOutCart = saveCart({ ...cart, status: "CHECKED_OUT", updatedAt: getWorldTime(), revision: cart.revision + 1 }, "MARKET_CART_CHECKED_OUT");
      if (!checkedOutCart || !flushMarketCartPersistence()) throw new Error("MARKET_CART_PERSISTENCE_FAILED");

      shipment = saveMarketShipment({ ...shipment, status: "PACKED", instanceIds: [...context.createdItemInstanceIds], custodyItemTransactionId: context.itemTransactionId, packedAt: shipment.packedAt || getWorldTime(), recoveryRequired: false, lastErrorCode: "" }, { expectedRevision: shipment.revision });
      if (!shipment) throw new Error("MARKET_SHIPMENT_PACKED_PERSISTENCE_FAILED");
      shipment = saveMarketShipment({ ...shipment, status: "IN_TRANSIT", inTransitAt: getWorldTime() }, { expectedRevision: shipment.revision });
      if (!shipment) throw new Error("MARKET_SHIPMENT_TRANSIT_PERSISTENCE_FAILED");
      order = requireCheckoutOrderUpdate(order, { status: "FULFILLING", paymentStatus: "CAPTURED", createdItemInstanceIds: [...context.createdItemInstanceIds], compensationStatus: "NOT_REQUIRED", shipmentId: shipment.shipmentId, deliveryFulfillment: { status: "IN_TRANSIT", shipmentId: shipment.shipmentId, etaAt: shipment.etaAt, routeClass: shipment.routeClass, recoveryRequired: false, lastErrorCode: "" } });
      marketBridgeDiagnostics.deliveryFulfillmentInTransit += 1;
      offerRevision += 1;
      window.dispatchEvent?.(new CustomEvent("ws:market-shipment-in-transit", { detail: { eventId: `market-shipment-in-transit:${shipment.shipmentId}:${shipment.revision}`, shipmentId: shipment.shipmentId, marketOrderId: order.marketOrderId, citizenId: order.citizenId, etaAt: shipment.etaAt, instanceIds: [...shipment.instanceIds], changedDomains: ["MARKET", "MARKET_SHIPMENT", "ITEM_INSTANCE", "MARKET_STOCK"], revision: shipment.revision } }));
      return { ok: true, operation: "DELIVERY_IN_TRANSIT", status: order.status, cart: checkedOutCart, marketOrderId: order.marketOrderId, billingTransactionId: context.billingTransactionId, createdItemInstanceIds: [...context.createdItemInstanceIds], shipment, order };
    } catch (error) {
      marketBridgeDiagnostics.deliveryFulfillmentFailures += 1;
      const failureCode = normalizeToken(error?.message || "MARKET_DELIVERY_CHECKOUT_FAILED");
      const failedOrder = compensateMarketCheckout(order, context, failureCode) || order;
      if (shipment && !MARKET_SHIPMENT_TERMINAL_STATUSES.has(shipment.status)) saveMarketShipment({ ...shipment, status: failedOrder.status === "PAYMENT_RECOVERY_REQUIRED" ? "RECOVERY_REQUIRED" : "CANCELLED", recoveryRequired: failedOrder.status === "PAYMENT_RECOVERY_REQUIRED", lastErrorCode: failureCode, cancelledAt: failedOrder.status === "PAYMENT_RECOVERY_REQUIRED" ? shipment.cancelledAt : getWorldTime() }, { expectedRevision: shipment.revision });
      return { ok: false, status: failedOrder.status || "FAILED", reason: failureCode, marketOrderId: failedOrder.marketOrderId, billingTransactionId: context.billingTransactionId, createdItemInstanceIds: [], order: failedOrder };
    }
  }

  function releaseMarketShipmentReservations(shipment = {}, reason = "MARKET_SHIPMENT_RELEASE") {
    const errors = [];
    (shipment.placementReservations || []).forEach((entry) => {
      const result = window.WS_APP.releaseHousingPlacementReservation?.(entry.reservationId, reason);
      if (result && result.ok === false && !["HOUSING_RESERVATION_NOT_FOUND", "HOUSING_RESERVATION_NOT_COMMITTABLE"].includes(result.reason)) errors.push(result.reason || "HOUSING_RELEASE_FAILED");
    });
    window.WS_APP.flushHousingPlacementPersistence?.();
    return errors;
  }

  function reserveMarketShipmentPlacements(shipment = {}, order = {}, attemptKey = "") {
    const placements = [];
    for (const line of order.lines || []) {
      const offer = getMarketOffer(line.marketOfferId);
      const product = window.WS_APP.getEquipmentCatalogItemById?.(offer?.catalogItemId) || offer?.catalogItem || {};
      for (let unitIndex = 0; unitIndex < (line.createdItemInstanceIds || []).length; unitIndex += 1) {
        const instanceId = line.createdItemInstanceIds[unitIndex];
        const reservationId = makeDeterministicId("housing_delivery_reservation", `${attemptKey}:${instanceId}`);
        const result = window.WS_APP.reserveHousingPlacement?.({ citizenId: order.citizenId, housingStorageId: line.destinationRef?.housingStorageId || shipment.destinationStorageId, definitionId: offer?.definitionId || line.definitionId, item: product, reservationId, marketOrderId: order.marketOrderId, idempotencyKey: `${attemptKey}:housing:${instanceId}` });
        if (!result?.ok || !result.reservation) {
          const partial = normalizeMarketShipment({ ...shipment, placementReservations: placements });
          releaseMarketShipmentReservations(partial, "MARKET_SHIPMENT_RESERVATION_ROLLBACK");
          return { ok: false, reason: result?.reason || "HOUSING_RESERVATION_FAILED", placements: [] };
        }
        placements.push(normalizeMarketShipmentPlacement({ instanceId, marketOrderLineId: line.marketOrderLineId, reservationId: result.reservation.reservationId, housingStorageId: result.reservation.housingStorageId, gridX: result.reservation.placement?.gridX, gridY: result.reservation.placement?.gridY, rotation: result.reservation.placement?.rotation || 0, status: result.reservation.status }));
      }
    }
    if (!window.WS_APP.flushHousingPlacementPersistence?.()) { releaseMarketShipmentReservations({ ...shipment, placementReservations: placements }, "MARKET_SHIPMENT_RESERVATION_PERSISTENCE_ROLLBACK"); return { ok: false, reason: "HOUSING_RESERVATION_PERSISTENCE_FAILED", placements: [] }; }
    return { ok: true, placements };
  }

  function processMarketShipment(shipmentId = "", input = {}) {
    let shipment = getMarketShipment(shipmentId);
    if (!shipment) return { ok: false, reason: "MARKET_SHIPMENT_NOT_FOUND" };
    if (input.expectedRevision != null && clampInteger(input.expectedRevision, 1, 999999) !== shipment.revision) return { ok: false, reason: "MARKET_SHIPMENT_REVISION_CONFLICT", expectedRevision: clampInteger(input.expectedRevision, 1, 999999), actualRevision: shipment.revision, shipment };
    if (shipment.status === "DELIVERED") return { ok: true, operation: "IDEMPOTENT_REPLAY", shipment, order: getMarketOrder(shipment.marketOrderId) };
    if (shipment.status === "CANCELLED") return { ok: false, reason: "MARKET_SHIPMENT_CANCELLED", shipment };
    const etaBypassAllowed = input.forceToken === MARKET_SHIPMENT_FORCE_TOKEN;
    if (!etaBypassAllowed && shipment.etaAt && compareWorldTimes(getWorldTime(), shipment.etaAt) < 0) return { ok: false, reason: "MARKET_SHIPMENT_NOT_DUE", shipment };
    let order = getMarketOrder(shipment.marketOrderId);
    if (!order || !isDeliveryOrder(order)) return { ok: false, reason: "MARKET_DELIVERY_ORDER_REQUIRED", shipment };
    marketBridgeDiagnostics.deliveryFulfillmentAttempts += 1;
    const reuseAttempt = shipment.status === "RECOVERY_REQUIRED" && shipment.currentAttemptKey;
    const attemptNumber = reuseAttempt ? Math.max(1, shipment.deliveryAttemptCount) : shipment.deliveryAttemptCount + 1;
    const attemptKey = reuseAttempt ? shipment.currentAttemptKey : `${shipment.shipmentId}:delivery-attempt:${attemptNumber}`;
    shipment = saveMarketShipment({ ...shipment, status: "PROCESSING", processingAt: getWorldTime(), currentAttemptKey: attemptKey, deliveryAttemptCount: attemptNumber, recoveryRequired: false, holdReason: "", lastErrorCode: "" }, { expectedRevision: shipment.revision });
    if (!shipment) return { ok: false, reason: "MARKET_SHIPMENT_PERSISTENCE_FAILED" };

    let placements = shipment.placementReservations || [];
    if (!placements.length) {
      const reserved = reserveMarketShipmentPlacements(shipment, order, attemptKey);
      if (!reserved.ok) {
        const held = saveMarketShipment({ ...shipment, status: "HELD", heldAt: getWorldTime(), holdReason: reserved.reason === "HOUSING_STORAGE_FULL" ? "HOUSING_STORAGE_FULL" : "HOUSING_PLACEMENT_UNAVAILABLE", lastErrorCode: reserved.reason, placementReservations: [], recoveryRequired: false }, { expectedRevision: shipment.revision });
        if (held) {
          order = updateCheckoutOrder(order, { deliveryFulfillment: { ...order.deliveryFulfillment, status: "HELD", shipmentId: held.shipmentId, etaAt: held.etaAt, routeClass: held.routeClass, lastErrorCode: held.lastErrorCode, recoveryRequired: false } }) || order;
          marketBridgeDiagnostics.deliveryFulfillmentHeld += 1;
        }
        return { ok: false, held: true, reason: reserved.reason, shipment: held || shipment, order };
      }
      placements = reserved.placements;
      const saved = saveMarketShipment({ ...shipment, placementReservations: placements }, { expectedRevision: shipment.revision });
      if (!saved) return { ok: false, reason: "MARKET_SHIPMENT_PERSISTENCE_FAILED", shipment };
      shipment = saved;
    }

    const operations = placements.map((placement) => ({ type: "MOVE", instanceId: placement.instanceId, expected: { ownerId: order.citizenId, locationType: "VENDOR", lifecycleState: "PACKAGED" }, toLocation: { type: "HOUSING_STORAGE", storageUnitId: placement.housingStorageId, gridX: placement.gridX, gridY: placement.gridY, rotation: placement.rotation, shipmentId: shipment.shipmentId, marketOrderId: order.marketOrderId }, lifecycleState: "UNPACKAGED", patch: { acquisition: { deliveryShipmentId: shipment.shipmentId, deliveredAt: getWorldTime() }, flags: { inTransit: false, delivered: true } } }));
    const itemKey = `${attemptKey}:item-commit`;
    const itemCommit = window.WS_APP.commitItemInstanceTransaction?.({ idempotencyKey: itemKey, sourceDomain: "MARKET", sourceRefId: shipment.shipmentId, citizenId: order.citizenId, changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "HOUSING", "MARKET", "MARKET_SHIPMENT"], metadata: { operationType: "MARKET_DELIVERY", marketOrderId: order.marketOrderId, shipmentId: shipment.shipmentId, attemptNumber }, operations });
    if (!itemCommit?.ok || itemCommit.compensated) {
      releaseMarketShipmentReservations(shipment, "MARKET_SHIPMENT_ITEM_COMMIT_FAILED");
      const recovery = saveMarketShipment({ ...shipment, status: "RECOVERY_REQUIRED", recoveryRequired: true, lastErrorCode: itemCommit?.reason || "MARKET_DELIVERY_ITEM_COMMIT_FAILED", placementReservations: [], currentAttemptKey: "", deliveryItemTransactionId: normalizeId(itemCommit?.transaction?.transactionId) }, { expectedRevision: shipment.revision });
      order = updateCheckoutOrder(order, { deliveryFulfillment: { ...order.deliveryFulfillment, status: "RECOVERY_REQUIRED", shipmentId: shipment.shipmentId, etaAt: shipment.etaAt, routeClass: shipment.routeClass, lastErrorCode: recovery?.lastErrorCode || "MARKET_DELIVERY_ITEM_COMMIT_FAILED", recoveryRequired: true } }) || order;
      marketBridgeDiagnostics.deliveryFulfillmentFailures += 1;
      return { ok: false, recoveryRequired: true, reason: recovery?.lastErrorCode || "MARKET_DELIVERY_ITEM_COMMIT_FAILED", shipment: recovery || shipment, order };
    }
    shipment = saveMarketShipment({ ...shipment, deliveryItemTransactionId: normalizeId(itemCommit.transaction?.transactionId) }, { expectedRevision: shipment.revision }) || shipment;

    const commitErrors = [];
    for (const placement of placements) {
      const reservation = window.WS_APP.getHousingPlacementReservation?.(placement.reservationId);
      const committed = window.WS_APP.commitHousingPlacement?.({ reservationId: placement.reservationId, instanceId: placement.instanceId, marketOrderId: order.marketOrderId, expectedRevision: reservation?.revision });
      if (!committed?.ok) commitErrors.push(`${placement.reservationId}:${committed?.reason || "HOUSING_COMMIT_FAILED"}`);
    }
    if (!window.WS_APP.flushHousingPlacementPersistence?.()) commitErrors.push("HOUSING_COMMIT_PERSISTENCE_FAILED");
    if (commitErrors.length) {
      const recovery = saveMarketShipment({ ...shipment, status: "RECOVERY_REQUIRED", recoveryRequired: true, lastErrorCode: "HOUSING_DELIVERY_COMMIT_RECOVERY_REQUIRED" }, { expectedRevision: shipment.revision });
      order = updateCheckoutOrder(order, { deliveryFulfillment: { ...order.deliveryFulfillment, status: "RECOVERY_REQUIRED", shipmentId: shipment.shipmentId, etaAt: shipment.etaAt, routeClass: shipment.routeClass, lastErrorCode: "HOUSING_DELIVERY_COMMIT_RECOVERY_REQUIRED", recoveryRequired: true } }) || order;
      marketBridgeDiagnostics.deliveryFulfillmentRecoveries += 1;
      return { ok: false, recoveryRequired: true, reason: "HOUSING_DELIVERY_COMMIT_RECOVERY_REQUIRED", errors: commitErrors, shipment: recovery || shipment, order };
    }

    shipment = saveMarketShipment({ ...shipment, status: "DELIVERED", deliveredAt: getWorldTime(), recoveryRequired: false, lastErrorCode: "", holdReason: "", placementReservations: placements.map((entry) => ({ ...entry, status: "COMMITTED" })) }, { expectedRevision: shipment.revision });
    if (!shipment) return { ok: false, reason: "MARKET_SHIPMENT_PERSISTENCE_FAILED" };
    order = requireCheckoutOrderUpdate(order, { status: "COMPLETED", completedAt: getWorldTime(), deliveryFulfillment: { status: "DELIVERED", shipmentId: shipment.shipmentId, etaAt: shipment.etaAt, routeClass: shipment.routeClass, lastErrorCode: "", recoveryRequired: false } });
    window.WS_APP.flushScheduledItemStorePersistence?.();
    emitFinalMarketCommitEvents(order, shipment.instanceIds);
    marketBridgeDiagnostics.deliveryFulfillmentDelivered += 1;
    window.dispatchEvent?.(new CustomEvent("ws:market-shipment-delivered", { detail: { eventId: `market-shipment-delivered:${shipment.shipmentId}:${shipment.revision}`, shipmentId: shipment.shipmentId, marketOrderId: order.marketOrderId, citizenId: order.citizenId, instanceIds: [...shipment.instanceIds], deliveredAt: shipment.deliveredAt, changedDomains: ["MARKET", "MARKET_SHIPMENT", "ITEM_INSTANCE", "HOUSING"], revision: shipment.revision } }));
    return { ok: true, operation: "DELIVERED", shipment, order, createdItemInstanceIds: [...shipment.instanceIds] };
  }

  function retryMarketShipmentDelivery(shipmentId = "", input = {}) {
    const shipment = getMarketShipment(shipmentId);
    if (!shipment) return { ok: false, reason: "MARKET_SHIPMENT_NOT_FOUND" };
    if (!["HELD", "RECOVERY_REQUIRED"].includes(shipment.status)) return { ok: false, reason: "MARKET_SHIPMENT_RETRY_NOT_REQUIRED", shipment };
    marketBridgeDiagnostics.deliveryFulfillmentRecoveries += 1;
    return processMarketShipment(shipmentId, { ...input, forceToken: MARKET_SHIPMENT_FORCE_TOKEN, expectedRevision: input.expectedRevision ?? shipment.revision });
  }

  function reconcileMarketShipment(shipmentId = "", input = {}) {
    const shipment = getMarketShipment(shipmentId);
    if (!shipment) return { ok: false, reason: "MARKET_SHIPMENT_NOT_FOUND" };
    if (shipment.status === "DELIVERED") return { ok: true, operation: "IDEMPOTENT_REPLAY", shipment, order: getMarketOrder(shipment.marketOrderId) };
    if (shipment.status === "HELD" && input.retryHeld !== true) return { ok: false, reason: "MARKET_SHIPMENT_HELD", shipment };
    const recoveryRetry = shipment.status === "RECOVERY_REQUIRED" || (shipment.status === "HELD" && input.retryHeld === true);
    return processMarketShipment(shipmentId, { ...input, forceToken: recoveryRetry ? MARKET_SHIPMENT_FORCE_TOKEN : undefined, expectedRevision: input.expectedRevision ?? shipment.revision });
  }

  function reconcileMarketShipments(input = {}) {
    const nowIso = normalizeId(input.nowIso) || getWorldTime();
    let processed = 0;
    let delivered = 0;
    let held = 0;
    let recoveryRequired = 0;
    getMarketShipments().filter((shipment) => !MARKET_SHIPMENT_TERMINAL_STATUSES.has(shipment.status)).forEach((shipment) => {
      const due = !shipment.etaAt || compareWorldTimes(nowIso, shipment.etaAt) >= 0;
      const shouldProcess = ["PROCESSING", "RECOVERY_REQUIRED"].includes(shipment.status) || (shipment.status === "HELD" && input.retryHeld === true) || (["PACKED", "IN_TRANSIT"].includes(shipment.status) && due);
      if (!shouldProcess) return;
      const recoveryRetry = ["PROCESSING", "RECOVERY_REQUIRED", "HELD"].includes(shipment.status);
      const result = processMarketShipment(shipment.shipmentId, { forceToken: recoveryRetry ? MARKET_SHIPMENT_FORCE_TOKEN : undefined, expectedRevision: shipment.revision });
      processed += 1;
      if (result.ok) delivered += 1;
      else if (result.held) held += 1;
      else if (result.recoveryRequired) recoveryRequired += 1;
    });
    return { ok: true, processed, delivered, held, recoveryRequired };
  }

  function getMarketShipmentActionState(shipmentOrId = {}) {
    const shipment = typeof shipmentOrId === "string" ? getMarketShipment(shipmentOrId) : normalizeId(shipmentOrId?.shipmentId) ? normalizeMarketShipment(shipmentOrId) : null;
    if (!shipment) return { ok: false, reason: "MARKET_SHIPMENT_NOT_FOUND", canForceDeliver: false, canRetryDelivery: false, canReconcile: false };
    return { ok: true, shipmentId: shipment.shipmentId, canForceDeliver: ["PACKED", "IN_TRANSIT", "HELD"].includes(shipment.status), canRetryDelivery: ["HELD", "RECOVERY_REQUIRED"].includes(shipment.status), canReconcile: !MARKET_SHIPMENT_TERMINAL_STATUSES.has(shipment.status), status: shipment.status };
  }

  function forceProcessMarketShipment(shipmentId = "", input = {}) {
    const actor = input.actor && typeof input.actor === "object" ? input.actor : window.WS_APP.currentUser || {};
    const actorId = normalizeId(input.actorId || actor.id || actor.login);
    const actorRole = normalizeToken(input.actorRole || actor.role);
    const reason = normalizeId(input.reason || input.note || "ADMIN_DEBUG_DELIVERY");
    if (!actorId) return { ok: false, reason: "ACTOR_REQUIRED" };
    if (actorRole !== "ADMIN") return { ok: false, reason: "ADMIN_ROLE_REQUIRED" };
    const shipment = getMarketShipment(shipmentId);
    if (!shipment) return { ok: false, reason: "MARKET_SHIPMENT_NOT_FOUND" };
    const actionKey = normalizeId(input.idempotencyKey) || `admin:market-delivery:${shipment.shipmentId}:${shipment.revision}`;
    marketBridgeDiagnostics.deliveryAdminForces += 1;
    const result = processMarketShipment(shipment.shipmentId, { forceToken: MARKET_SHIPMENT_FORCE_TOKEN, expectedRevision: input.expectedRevision ?? shipment.revision });
    let nextShipment = result.shipment || getMarketShipment(shipment.shipmentId) || shipment;
    if (nextShipment) {
      const recorded = saveMarketShipment({ ...nextShipment, lastAdminAction: { actorId, actorRole, reason, idempotencyKey: actionKey, executedAt: getWorldTime(), resultCode: result.ok ? "MARKET_SHIPMENT_DELIVERED" : (result.reason || "FAILED") } }, { expectedRevision: nextShipment.revision });
      if (recorded) {
        nextShipment = recorded;
        result.shipment = recorded;
      }
    }
    const audit = window.WS_APP.appendAdminAuditResult?.({ actor: { actorId, actorRole, displayName: actor.displayName || actor.login || actorId }, workspace: "MARKET", category: "MARKET_DELIVERY", sourceCommand: "FORCE_PROCESS_MARKET_SHIPMENT", citizenId: shipment.citizenId, recordId: shipment.shipmentId, targetRefs: [{ type: "MARKET_SHIPMENT", id: shipment.shipmentId }, { type: "MARKET_ORDER", id: shipment.marketOrderId }], request: { idempotencyKey: actionKey, correlationId: shipment.marketOrderId }, result: { status: result.ok ? "SUCCEEDED" : (result.recoveryRequired ? "RECOVERY_REQUIRED" : "FAILED"), resultCode: result.ok ? "MARKET_SHIPMENT_DELIVERED" : (result.reason || "MARKET_SHIPMENT_DELIVERY_FAILED"), message: result.ok ? "Market shipment delivered through the canonical delivery resolver." : `Market shipment delivery result: ${result.reason || "FAILED"}.` }, domainRefs: { marketOrderId: shipment.marketOrderId, operationId: shipment.shipmentId, itemTransactionId: nextShipment?.deliveryItemTransactionId || "" }, previousRevision: shipment.revision, nextRevision: nextShipment?.revision || shipment.revision, summary: `Admin delivery override for ${shipment.shipmentId}: ${reason}.`, metadata: { reason, forced: true, shipmentStatus: nextShipment?.status || shipment.status } }, { user: actor });
    return { ...result, shipment: nextShipment, audit };
  }

  function checkoutMarketCartPickup(cartId = "", paymentInput = {}) {
    marketBridgeDiagnostics.checkoutAttempts += 1;
    marketBridgeDiagnostics.pickupFulfillmentStarts += 1;
    const idempotencyKey = normalizeId(paymentInput.idempotencyKey);
    const existing = getMarketOrderByIdempotencyKey(idempotencyKey);
    if (existing && isPickupOrder(existing) && ["FULFILLING", "COMPLETED"].includes(existing.status)) {
      marketBridgeDiagnostics.checkoutIdempotentReplays += 1;
      marketBridgeDiagnostics.pickupFulfillmentReplays += 1;
      return {
        ok: true,
        operation: existing.status === "COMPLETED" ? "IDEMPOTENT_REPLAY" : "PICKUP_READY_REPLAY",
        status: existing.status,
        marketOrderId: existing.marketOrderId,
        billingTransactionId: existing.billingRefs?.billingTransactionId || "",
        createdItemInstanceIds: [...existing.createdItemInstanceIds],
        pickupFulfillment: clone(existing.pickupFulfillment),
        order: existing
      };
    }
    if (existing && ["FAILED", "CANCELLED", "PAYMENT_RECOVERY_REQUIRED"].includes(existing.status)) {
      return { ok: false, status: existing.status, reason: existing.failureCode || existing.status, marketOrderId: existing.marketOrderId, order: existing };
    }

    const validation = validateMarketCheckout({ cartId, idempotencyKey });
    if (!validation.ok) {
      return {
        ok: false,
        status: "BLOCKED",
        reason: validation.reason,
        cartId: normalizeId(cartId),
        blockers: validation.blockers,
        requiredApis: validation.requiredApis,
        marketOrderId: "",
        billingTransactionId: "",
        createdItemInstanceIds: []
      };
    }
    if (validation.fulfillmentMode !== "PICKUP") return { ok: false, status: "BLOCKED", reason: "MARKET_PICKUP_CART_REQUIRED" };

    const cart = getMarketCart(cartId);
    let order = existing || saveMarketOrder(buildMarketOrderFromQuote(cart, validation, idempotencyKey));
    if (!order) return { ok: false, status: "FAILED", reason: "MARKET_ORDER_PERSISTENCE_FAILED" };
    const context = {
      stockReservationIds: [],
      housingReservationIds: [],
      createdItemInstanceIds: [],
      billingIntentId: order.billingRefs?.billingIntentId || "",
      billingTransactionId: order.billingRefs?.billingTransactionId || "",
      itemTransactionId: order.pickupFulfillment?.itemTransactionId || ""
    };

    try {
      if (order.status === "DRAFT") order = requireCheckoutOrderUpdate(order, { status: "RESERVING" });
      for (const line of order.lines) {
        const stockResult = reserveMarketStock({
          marketOfferId: line.marketOfferId,
          quantity: line.quantity,
          marketOrderId: order.marketOrderId,
          reservationId: line.stockReservationId,
          idempotencyKey: `${idempotencyKey}:stock:${line.marketOrderLineId}`
        });
        if (!stockResult.ok) throw new Error(stockResult.reason || "STOCK_RESERVATION_FAILED");
        context.stockReservationIds.push(stockResult.reservation.reservationId);
      }

      const billingCreate = window.WS_APP.createBillingIntent({
        citizenId: order.citizenId,
        sourceDomain: "MARKET",
        sourceRefId: order.marketOrderId,
        amount: order.totals.finalTotal,
        currency: order.totals.currency || "CREDIT",
        descriptionCode: "MARKET_PICKUP_CHECKOUT",
        paymentSource: normalizeToken(paymentInput.paymentSource || "CREDITS"),
        idempotencyKey: `${idempotencyKey}:billing`,
        correlationId: order.marketOrderId,
        providerId: order.vendorProviderId,
        metadata: { cartId: order.cartId, fulfillmentMode: "PICKUP" }
      });
      if (!billingCreate?.ok) throw new Error(billingCreate?.error?.code || "BILLING_INTENT_CREATE_FAILED");
      context.billingIntentId = billingCreate.billingIntent.billingIntentId;
      const billingAuthorize = window.WS_APP.authorizeBillingIntent(context.billingIntentId, { idempotencyKey: `${idempotencyKey}:authorize` });
      if (!billingAuthorize?.ok) throw new Error(billingAuthorize?.error?.code || "BILLING_AUTHORIZATION_FAILED");
      if (["DRAFT", "RESERVING"].includes(order.status)) {
        order = requireCheckoutOrderUpdate(order, {
          status: "AUTHORIZED",
          paymentStatus: "AUTHORIZED",
          billingRefs: { billingIntentId: context.billingIntentId }
        });
      }

      const billingCapture = window.WS_APP.captureBillingIntent(context.billingIntentId, {
        idempotencyKey: `${idempotencyKey}:capture`,
        note: `Market pickup order ${order.marketOrderId}.`,
        createdBy: "MARKET"
      });
      if (!billingCapture?.ok) throw new Error(billingCapture?.error?.code || "BILLING_CAPTURE_FAILED");
      context.billingTransactionId = billingCapture.billingTransaction?.billingTransactionId || "";

      const readyAt = order.pickupFulfillment?.readyAt || getWorldTime();
      const expiresAt = order.pickupFulfillment?.expiresAt || addWorldDays(readyAt, order.pickupFulfillment?.reservationDays || getPickupReservationDays());
      order = requireCheckoutOrderUpdate(order, {
        status: "FULFILLING",
        paymentStatus: "CAPTURED",
        billingRefs: { billingIntentId: context.billingIntentId, billingTransactionId: context.billingTransactionId },
        pickupFulfillment: {
          ...order.pickupFulfillment,
          status: "PREPARING",
          readyAt,
          expiresAt,
          recoveryRequired: false,
          errors: []
        }
      });

      const createOperations = [];
      order.lines.forEach((line) => {
        line.createdItemInstanceIds.forEach((instanceId, unitIndex) => {
          createOperations.push({
            type: "CREATE",
            instanceId,
            expected: { exists: false },
            instance: buildMarketItemInstanceSource(order, line, unitIndex, {})
          });
          context.createdItemInstanceIds.push(instanceId);
        });
      });
      const itemCommit = window.WS_APP.commitItemInstanceTransaction({
        idempotencyKey: `${idempotencyKey}:pickup-custody`,
        sourceDomain: "MARKET",
        sourceRefId: order.marketOrderId,
        citizenId: order.citizenId,
        changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "MARKET"],
        metadata: {
          operationType: "MARKET_PICKUP_PREPARE",
          providerId: order.pickupFulfillment?.providerId || order.vendorProviderId,
          organizationLocationId: order.pickupFulfillment?.organizationLocationId || "",
          expiresAt
        },
        operations: createOperations
      });
      if (!itemCommit?.ok || itemCommit.compensated) throw new Error(itemCommit?.reason || "ITEM_INSTANCE_PICKUP_CUSTODY_FAILED");
      context.itemTransactionId = normalizeId(itemCommit.transaction?.transactionId);

      for (const line of order.lines) {
        const stockCommit = commitMarketStockReservation(line.stockReservationId);
        if (!stockCommit.ok) throw new Error(stockCommit.reason || "STOCK_COMMIT_FAILED");
      }
      window.WS_APP.flushScheduledItemStorePersistence?.();
      const checkedOutCart = saveCart({ ...cart, status: "CHECKED_OUT", updatedAt: getWorldTime(), revision: cart.revision + 1 }, "MARKET_CART_CHECKED_OUT");
      if (!checkedOutCart || !flushMarketCartPersistence()) throw new Error("MARKET_CART_PERSISTENCE_FAILED");

      order = requireCheckoutOrderUpdate(order, {
        status: "FULFILLING",
        paymentStatus: "CAPTURED",
        createdItemInstanceIds: [...context.createdItemInstanceIds],
        compensationStatus: "NOT_REQUIRED",
        pickupFulfillment: {
          ...order.pickupFulfillment,
          status: "READY",
          readyAt,
          expiresAt,
          itemTransactionId: context.itemTransactionId,
          recoveryRequired: false,
          errors: []
        }
      });
      marketBridgeDiagnostics.pickupFulfillmentReady += 1;
      offerRevision += 1;
      window.dispatchEvent?.(new CustomEvent("ws:market-pickup-ready", {
        detail: {
          eventId: `market-pickup-ready:${order.marketOrderId}:${order.revision}`,
          marketOrderId: order.marketOrderId,
          citizenId: order.citizenId,
          providerId: order.pickupFulfillment.providerId,
          organizationLocationId: order.pickupFulfillment.organizationLocationId,
          readyAt,
          expiresAt,
          instanceIds: [...context.createdItemInstanceIds],
          changedDomains: ["MARKET", "ITEM_INSTANCE", "MARKET_STOCK"],
          revision: order.revision
        }
      }));
      return {
        ok: true,
        operation: "PICKUP_READY",
        status: order.status,
        cart: checkedOutCart,
        marketOrderId: order.marketOrderId,
        billingTransactionId: context.billingTransactionId,
        createdItemInstanceIds: [...context.createdItemInstanceIds],
        pickupFulfillment: clone(order.pickupFulfillment),
        order
      };
    } catch (error) {
      marketBridgeDiagnostics.pickupFulfillmentFailures += 1;
      const failureCode = normalizeToken(error?.message || "MARKET_PICKUP_CHECKOUT_FAILED");
      const failedOrder = compensateMarketCheckout(order, context, failureCode) || order;
      return {
        ok: false,
        status: failedOrder.status || "FAILED",
        reason: failureCode,
        marketOrderId: failedOrder.marketOrderId,
        billingTransactionId: context.billingTransactionId,
        createdItemInstanceIds: [],
        order: failedOrder
      };
    }
  }

  function buildMarketServiceSubjectRefs(order = {}, line = {}) {
    const selection = normalizeLinkedServiceSelection(line.linkedServiceSelection, getMarketOffer(line.marketOfferId));
    return {
      instanceIds: [...line.createdItemInstanceIds],
      targetCharacterId: selection.targetCharacterId || order.citizenId,
      targetBodySlots: [...selection.targetBodySlots]
    };
  }

  function checkoutMarketCartWithService(cartId = "", paymentInput = {}) {
    marketBridgeDiagnostics.checkoutAttempts += 1;
    marketBridgeDiagnostics.serviceFulfillmentStarts += 1;
    const idempotencyKey = normalizeId(paymentInput.idempotencyKey);
    const existing = getMarketOrderByIdempotencyKey(idempotencyKey);
    if (existing?.status === "COMPLETED") {
      marketBridgeDiagnostics.checkoutIdempotentReplays += 1;
      marketBridgeDiagnostics.serviceFulfillmentReplays += 1;
      return {
        ok: true,
        operation: "IDEMPOTENT_REPLAY",
        status: existing.status,
        marketOrderId: existing.marketOrderId,
        linkedServiceOrderIds: [...existing.linkedServiceOrderIds],
        createdItemInstanceIds: [...existing.createdItemInstanceIds],
        order: existing
      };
    }
    if (existing?.status === "FULFILLING" && isPurchaseWithServiceOrder(existing)) {
      marketBridgeDiagnostics.checkoutIdempotentReplays += 1;
      marketBridgeDiagnostics.serviceFulfillmentReplays += 1;
      const serviceOrders = existing.linkedServiceOrderIds.map((serviceOrderId) => window.WS_APP.getServiceOrder?.(serviceOrderId)).filter(Boolean);
      if (serviceOrders.length === existing.linkedServiceOrderIds.length && serviceOrders.every((serviceOrder) => normalizeToken(serviceOrder.status) === "COMPLETED")) {
        return finalizeMarketServiceFulfillment(existing.marketOrderId, { idempotencyKey: `${existing.idempotencyKey}:market-finalize` });
      }
      return {
        ok: true,
        operation: "SERVICE_PENDING_REPLAY",
        status: existing.status,
        marketOrderId: existing.marketOrderId,
        linkedServiceOrderIds: [...existing.linkedServiceOrderIds],
        createdItemInstanceIds: [...existing.createdItemInstanceIds],
        order: existing
      };
    }
    if (existing && ["FAILED", "CANCELLED", "PAYMENT_RECOVERY_REQUIRED"].includes(existing.status)) {
      return { ok: false, status: existing.status, reason: existing.failureCode || existing.status, marketOrderId: existing.marketOrderId, order: existing };
    }

    const validation = validateMarketCheckout({ cartId, idempotencyKey });
    if (!validation.ok || validation.fulfillmentMode !== "PURCHASE_WITH_SERVICE") {
      return {
        ok: false,
        status: "BLOCKED",
        reason: validation.ok ? "PURCHASE_WITH_SERVICE_REQUIRED" : validation.reason,
        cartId: normalizeId(cartId),
        blockers: validation.ok ? ["PURCHASE_WITH_SERVICE_REQUIRED"] : validation.blockers,
        requiredApis: validation.requiredApis,
        marketOrderId: "",
        linkedServiceOrderIds: [],
        createdItemInstanceIds: []
      };
    }

    const cart = getMarketCart(cartId);
    let order = existing || saveMarketOrder(buildMarketOrderFromQuote(cart, validation, idempotencyKey));
    if (!order) return { ok: false, status: "FAILED", reason: "MARKET_ORDER_PERSISTENCE_FAILED" };
    const context = {
      stockReservationIds: [],
      housingReservationIds: [],
      createdItemInstanceIds: [],
      linkedServiceOrderIds: [],
      billingIntentId: order.billingRefs?.billingIntentId || "",
      billingTransactionId: order.billingRefs?.billingTransactionId || ""
    };

    try {
      if (order.status === "DRAFT") order = requireCheckoutOrderUpdate(order, { status: "RESERVING" });
      for (const line of order.lines) {
        const stockResult = reserveMarketStock({
          marketOfferId: line.marketOfferId,
          quantity: line.quantity,
          marketOrderId: order.marketOrderId,
          reservationId: line.stockReservationId,
          idempotencyKey: `${idempotencyKey}:stock:${line.marketOrderLineId}`
        });
        if (!stockResult.ok) throw new Error(stockResult.reason || "STOCK_RESERVATION_FAILED");
        context.stockReservationIds.push(stockResult.reservation.reservationId);
      }

      const billingCreate = window.WS_APP.createBillingIntent({
        citizenId: order.citizenId,
        sourceDomain: "MARKET",
        sourceRefId: order.marketOrderId,
        amount: order.totals.finalTotal,
        currency: order.totals.currency || "CREDIT",
        descriptionCode: "MARKET_PURCHASE_WITH_SERVICE",
        paymentSource: normalizeToken(paymentInput.paymentSource || "CREDITS"),
        idempotencyKey: `${idempotencyKey}:billing`,
        correlationId: order.marketOrderId,
        providerId: order.vendorProviderId,
        metadata: { cartId: order.cartId, fulfillmentMode: "PURCHASE_WITH_SERVICE" }
      });
      if (!billingCreate?.ok) throw new Error(billingCreate?.error?.code || "BILLING_INTENT_CREATE_FAILED");
      context.billingIntentId = billingCreate.billingIntent.billingIntentId;
      const billingAuthorize = window.WS_APP.authorizeBillingIntent(context.billingIntentId, { idempotencyKey: `${idempotencyKey}:authorize` });
      if (!billingAuthorize?.ok) throw new Error(billingAuthorize?.error?.code || "BILLING_AUTHORIZATION_FAILED");
      if (["DRAFT", "RESERVING"].includes(order.status)) {
        order = requireCheckoutOrderUpdate(order, {
          status: "AUTHORIZED",
          paymentStatus: "AUTHORIZED",
          billingRefs: { billingIntentId: context.billingIntentId }
        });
      }

      const nextLines = [];
      for (const line of order.lines) {
        for (let unitIndex = 0; unitIndex < line.quantity; unitIndex += 1) {
          const instanceId = line.createdItemInstanceIds[unitIndex];
          const existingInstance = window.WS_APP.getItemInstanceById?.(instanceId);
          if (!existingInstance) {
            const createResult = window.WS_APP.createItemInstance(buildMarketItemInstanceSource(order, line, unitIndex, {}), {
              source: "MARKET_PURCHASE_WITH_SERVICE",
              deferPersistence: true,
              skipCitizenEvent: true,
              skipItemEvent: true,
              skipModuleRefresh: true,
              skipProfileRefresh: true
            });
            if (!createResult?.ok) throw new Error(createResult?.reason || "ITEM_INSTANCE_CREATE_FAILED");
          } else if (!isPendingServiceCustodyInstance(order, instanceId)) {
            throw new Error("ITEM_INSTANCE_SERVICE_CUSTODY_CONFLICT");
          }
          context.createdItemInstanceIds.push(instanceId);
        }

        const subjectRefs = buildMarketServiceSubjectRefs(order, line);
        const offerResult = window.WS_APP.createServiceOffer({
          serviceOfferId: line.serviceOfferId,
          serviceDefinitionId: line.serviceDefinitionId,
          providerId: line.serviceProviderId,
          citizenId: order.citizenId,
          subjectRefs,
          idempotencyKey: `${idempotencyKey}:service-offer:${line.marketOrderLineId}`,
          metadata: {
            sourceDomain: "MARKET",
            fulfillmentMode: "PURCHASE_WITH_SERVICE",
            marketOrderId: order.marketOrderId,
            marketOrderLineId: line.marketOrderLineId,
            marketOfferId: line.marketOfferId
          }
        });
        if (!offerResult?.ok) throw new Error(offerResult?.reason || "SERVICE_OFFER_CREATE_FAILED");

        const orderResult = window.WS_APP.createServiceOrderFromOffer(line.serviceOfferId, {
          serviceOrderId: line.serviceOrderId,
          subjectRefs,
          idempotencyKey: `${idempotencyKey}:service-order:${line.marketOrderLineId}`,
          coverageAuthorizations: line.linkedServiceSelection?.coverageAuthorizations || [],
          metadata: {
            sourceDomain: "MARKET",
            fulfillmentMode: "PURCHASE_WITH_SERVICE",
            marketOrderId: order.marketOrderId,
            marketOrderLineId: line.marketOrderLineId,
            marketOfferId: line.marketOfferId
          }
        });
        if (!orderResult?.ok) throw new Error(orderResult?.reason || "SERVICE_ORDER_CREATE_FAILED");
        if (!context.linkedServiceOrderIds.includes(line.serviceOrderId)) context.linkedServiceOrderIds.push(line.serviceOrderId);

        const currentServiceOrder = window.WS_APP.getServiceOrder(line.serviceOrderId) || orderResult.order;
        let authorizedServiceOrder = currentServiceOrder;
        if (normalizeToken(currentServiceOrder.status) === "PENDING_CONFIRMATION") {
          const authorized = window.WS_APP.authorizeServiceOrder(line.serviceOrderId, {
            idempotencyKey: `${idempotencyKey}:service-authorize:${line.marketOrderLineId}`,
            expectedRevision: currentServiceOrder.revision,
            coverageAuthorizations: line.linkedServiceSelection?.coverageAuthorizations || [],
            metadata: { marketOrderId: order.marketOrderId, marketOrderLineId: line.marketOrderLineId }
          });
          if (!authorized?.ok) throw new Error(authorized?.reason || "SERVICE_ORDER_AUTHORIZATION_FAILED");
          authorizedServiceOrder = authorized.order;
        }
        let scheduledServiceOrder = authorizedServiceOrder;
        if (normalizeToken(authorizedServiceOrder.status) === "AUTHORIZED") {
          const scheduled = window.WS_APP.scheduleServiceOrder(line.serviceOrderId, {
            scheduledStartAt: line.linkedServiceSelection?.scheduledStartAt || getWorldTime(),
            estimatedEndAt: line.linkedServiceSelection?.estimatedEndAt || null
          }, {
            idempotencyKey: `${idempotencyKey}:service-schedule:${line.marketOrderLineId}`,
            expectedRevision: authorizedServiceOrder.revision
          });
          if (!scheduled?.ok) throw new Error(scheduled?.reason || "SERVICE_ORDER_SCHEDULE_FAILED");
          scheduledServiceOrder = scheduled.order;
        }
        nextLines.push({
          ...line,
          serviceStatus: normalizeToken(scheduledServiceOrder.status || "SCHEDULED")
        });
      }

      window.WS_APP.flushScheduledItemStorePersistence?.();
      window.WS_APP.flushServiceBridgePersistence?.();
      const checkedOutCart = saveCart({ ...cart, status: "CHECKED_OUT", updatedAt: getWorldTime(), revision: cart.revision + 1 }, "MARKET_CART_SERVICE_CHECKOUT_CREATED");
      if (!checkedOutCart || !flushMarketCartPersistence()) throw new Error("MARKET_CART_PERSISTENCE_FAILED");
      order = requireCheckoutOrderUpdate(order, {
        status: "FULFILLING",
        paymentStatus: "AUTHORIZED",
        billingRefs: { billingIntentId: context.billingIntentId },
        lines: nextLines,
        createdItemInstanceIds: [...new Set(context.createdItemInstanceIds)],
        linkedServiceOfferIds: nextLines.map((line) => line.serviceOfferId).filter(Boolean),
        linkedServiceOrderIds: nextLines.map((line) => line.serviceOrderId).filter(Boolean),
        serviceFulfillment: {
          status: "SCHEDULED",
          startedAt: getWorldTime(),
          completedAt: null,
          failedAt: null,
          lastServiceOrderId: nextLines[nextLines.length - 1]?.serviceOrderId || "",
          lastServiceStatus: nextLines[nextLines.length - 1]?.serviceStatus || "SCHEDULED",
          recoveryRequired: false,
          errors: []
        },
        compensationStatus: "NOT_REQUIRED"
      });
      rebuildMarketOrderIndexes();
      return {
        ok: true,
        operation: "SERVICE_PENDING",
        status: order.status,
        cart: checkedOutCart,
        marketOrderId: order.marketOrderId,
        billingIntentId: context.billingIntentId,
        linkedServiceOrderIds: [...order.linkedServiceOrderIds],
        createdItemInstanceIds: [...order.createdItemInstanceIds],
        order
      };
    } catch (error) {
      const failureCode = normalizeToken(error?.message || "MARKET_SERVICE_FULFILLMENT_FAILED");
      const failedOrder = compensateMarketCheckout(order, context, failureCode) || order;
      marketBridgeDiagnostics.serviceFulfillmentFailures += 1;
      return {
        ok: false,
        status: failedOrder.status || "FAILED",
        reason: failureCode,
        marketOrderId: failedOrder.marketOrderId,
        linkedServiceOrderIds: [...(failedOrder.linkedServiceOrderIds || [])],
        createdItemInstanceIds: [],
        order: failedOrder
      };
    }
  }

  function emitFinalMarketServiceFulfillmentEvents(order = {}) {
    const eventKey = `${order.marketOrderId}:${order.revision}:service-fulfillment`;
    if (finalMarketCommitEventsByOrderId.has(eventKey)) {
      marketBridgeDiagnostics.duplicateFinalCommitEventsSuppressed += 1;
      return false;
    }
    finalMarketCommitEventsByOrderId.add(eventKey);
    marketBridgeDiagnostics.stockEventsEmitted += 1;
    window.dispatchEvent(new CustomEvent("ws:market-stock-updated", {
      detail: {
        eventId: `market-stock:${eventKey}`,
        marketOrderId: order.marketOrderId,
        marketOfferIds: [...new Set(order.lines.map((line) => line.marketOfferId).filter(Boolean))],
        changedDomains: ["MARKET_STOCK"],
        revision: offerRevision
      }
    }));
    return true;
  }

  function finalizeMarketServiceFulfillment(marketOrderId = "", input = {}) {
    let order = getMarketOrder(marketOrderId);
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    if (!isPurchaseWithServiceOrder(order)) return { ok: false, reason: "MARKET_ORDER_SERVICE_FULFILLMENT_REQUIRED", order };
    if (order.status === "COMPLETED") {
      marketBridgeDiagnostics.serviceFulfillmentReplays += 1;
      return { ok: true, operation: "IDEMPOTENT_REPLAY", status: order.status, order };
    }
    const serviceOrders = order.linkedServiceOrderIds.map((serviceOrderId) => window.WS_APP.getServiceOrder?.(serviceOrderId)).filter(Boolean);
    if (serviceOrders.length !== order.linkedServiceOrderIds.length) return { ok: false, reason: "LINKED_SERVICE_ORDER_NOT_FOUND", order };
    if (!serviceOrders.every((serviceOrder) => normalizeToken(serviceOrder.status) === "COMPLETED")) {
      return { ok: false, reason: "LINKED_SERVICE_ORDERS_NOT_COMPLETED", serviceStatuses: serviceOrders.map((entry) => ({ serviceOrderId: entry.serviceOrderId, status: entry.status })), order };
    }
    const instances = getMarketOrderInstanceIds(order).map((instanceId) => window.WS_APP.getItemInstanceById?.(instanceId)).filter(Boolean);
    if (instances.length !== getMarketOrderInstanceIds(order).length) return { ok: false, reason: "MARKET_ORDER_ITEM_INSTANCES_REQUIRED", order };
    if (instances.some((instance) => normalizeToken(instance.location?.type) === "SERVICE")) {
      return { ok: false, reason: "SERVICE_ITEM_COMMIT_REQUIRED", order };
    }

    const intentId = normalizeId(order.billingRefs?.billingIntentId);
    let billingTransactionId = normalizeId(order.billingRefs?.billingTransactionId);
    if (!billingTransactionId) {
      const captured = window.WS_APP.captureBillingIntent?.(intentId, {
        idempotencyKey: normalizeId(input.idempotencyKey) || `${order.idempotencyKey}:capture`,
        note: `Market order ${order.marketOrderId} service fulfillment.`,
        createdBy: "MARKET",
        metadata: { fulfillmentMode: "PURCHASE_WITH_SERVICE", linkedServiceOrderIds: [...order.linkedServiceOrderIds] }
      });
      if (!captured?.ok) {
        const next = updateCheckoutOrder(order, {
          status: "PAYMENT_RECOVERY_REQUIRED",
          paymentStatus: "PAYMENT_RECOVERY_REQUIRED",
          failureCode: captured?.error?.code || "BILLING_CAPTURE_FAILED",
          compensationStatus: "PENDING",
          serviceFulfillment: {
            ...order.serviceFulfillment,
            status: "COMPLETED_PAYMENT_RECOVERY_REQUIRED",
            completedAt: getWorldTime(),
            recoveryRequired: true,
            errors: [captured?.error?.code || "BILLING_CAPTURE_FAILED"]
          }
        }) || order;
        return { ok: false, reason: "MARKET_BILLING_CAPTURE_FAILED", order: next };
      }
      billingTransactionId = normalizeId(captured.billingTransaction?.billingTransactionId);
    }

    const stockErrors = [];
    order.lines.forEach((line) => {
      const committed = commitMarketStockReservation(line.stockReservationId);
      if (!committed.ok) stockErrors.push(`${line.stockReservationId}:${committed.reason || "FAILED"}`);
    });
    if (stockErrors.length) {
      const next = updateCheckoutOrder(order, {
        status: "PAYMENT_RECOVERY_REQUIRED",
        paymentStatus: "CAPTURED",
        billingRefs: { ...order.billingRefs, billingTransactionId },
        failureCode: "MARKET_STOCK_COMMIT_RECOVERY_REQUIRED",
        compensationStatus: "PARTIAL",
        compensationErrors: [...new Set([...(order.compensationErrors || []), ...stockErrors])],
        serviceFulfillment: {
          ...order.serviceFulfillment,
          status: "COMPLETED_STOCK_RECOVERY_REQUIRED",
          completedAt: getWorldTime(),
          recoveryRequired: true,
          errors: stockErrors
        }
      }) || order;
      return { ok: false, reason: "MARKET_STOCK_COMMIT_RECOVERY_REQUIRED", order: next };
    }

    order = requireCheckoutOrderUpdate(order, {
      status: "COMPLETED",
      paymentStatus: "CAPTURED",
      billingRefs: { ...order.billingRefs, billingTransactionId },
      completedAt: getWorldTime(),
      compensationStatus: "NOT_REQUIRED",
      lines: order.lines.map((line) => ({ ...line, serviceStatus: "COMPLETED" })),
      serviceFulfillment: {
        ...order.serviceFulfillment,
        status: "COMPLETED",
        completedAt: getWorldTime(),
        lastServiceOrderId: serviceOrders[serviceOrders.length - 1]?.serviceOrderId || "",
        lastServiceStatus: "COMPLETED",
        recoveryRequired: false,
        errors: []
      }
    });
    offerRevision += 1;
    marketBridgeDiagnostics.serviceFulfillmentCompletions += 1;
    emitFinalMarketServiceFulfillmentEvents(order);
    return {
      ok: true,
      operation: "COMPLETED",
      status: order.status,
      marketOrderId: order.marketOrderId,
      billingTransactionId,
      linkedServiceOrderIds: [...order.linkedServiceOrderIds],
      createdItemInstanceIds: [...order.createdItemInstanceIds],
      order
    };
  }

  function failMarketServiceFulfillment(marketOrderId = "", serviceOrderId = "", serviceStatus = "FAILED", reasonCode = "LINKED_SERVICE_FAILED") {
    const order = getMarketOrder(marketOrderId);
    if (!order || !isPurchaseWithServiceOrder(order)) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    const instanceIds = getMarketOrderInstanceIds(order);
    const unsafeInstances = instanceIds.filter((instanceId) => {
      const instance = window.WS_APP.getItemInstanceById?.(instanceId);
      return instance && !isPendingServiceCustodyInstance(order, instanceId);
    });
    if (unsafeInstances.length) {
      const next = updateCheckoutOrder(order, {
        status: "PAYMENT_RECOVERY_REQUIRED",
        failureCode: normalizeToken(reasonCode),
        compensationStatus: "PENDING",
        compensationErrors: unsafeInstances.map((instanceId) => `ITEM_ALREADY_COMMITTED:${instanceId}`),
        serviceFulfillment: {
          ...order.serviceFulfillment,
          status: "RECOVERY_REQUIRED",
          failedAt: getWorldTime(),
          lastServiceOrderId: normalizeId(serviceOrderId),
          lastServiceStatus: normalizeToken(serviceStatus),
          recoveryRequired: true,
          errors: unsafeInstances.map((instanceId) => `ITEM_ALREADY_COMMITTED:${instanceId}`)
        }
      }) || order;
      return { ok: false, reason: "MARKET_SERVICE_COMPENSATION_UNSAFE", order: next };
    }
    const compensated = compensateMarketCheckout(order, {
      stockReservationIds: order.lines.map((line) => line.stockReservationId).filter(Boolean),
      housingReservationIds: [],
      createdItemInstanceIds: instanceIds,
      linkedServiceOrderIds: [...order.linkedServiceOrderIds],
      billingIntentId: order.billingRefs?.billingIntentId || "",
      billingTransactionId: order.billingRefs?.billingTransactionId || ""
    }, normalizeToken(reasonCode)) || order;
    const finalStatus = normalizeToken(serviceStatus) === "CANCELLED" ? "CANCELLED" : compensated.status;
    const next = finalStatus === compensated.status
      ? compensated
      : updateCheckoutOrder(compensated, { status: finalStatus }) || compensated;
    marketBridgeDiagnostics.serviceFulfillmentFailures += 1;
    return { ok: false, reason: normalizeToken(reasonCode), status: next.status, order: next };
  }

  function handleLinkedServiceOrderEvent(event = {}) {
    const detail = event.detail && typeof event.detail === "object" ? event.detail : {};
    const serviceOrderId = normalizeId(detail.serviceOrderId);
    if (!serviceOrderId) return;
    const order = getMarketOrderByServiceOrderId(serviceOrderId);
    if (!order || !isPurchaseWithServiceOrder(order) || serviceCompensationInProgressOrderIds.has(order.marketOrderId)) return;
    const status = normalizeToken(detail.status || window.WS_APP.getServiceOrder?.(serviceOrderId)?.status);
    if (status === "COMPLETED") {
      const serviceOrders = order.linkedServiceOrderIds.map((id) => window.WS_APP.getServiceOrder?.(id)).filter(Boolean);
      if (serviceOrders.length === order.linkedServiceOrderIds.length && serviceOrders.every((entry) => normalizeToken(entry.status) === "COMPLETED")) {
        finalizeMarketServiceFulfillment(order.marketOrderId, { idempotencyKey: `${order.idempotencyKey}:capture` });
      }
      return;
    }
    if (["FAILED", "CANCELLED", "REJECTED", "EXPIRED"].includes(status)) {
      failMarketServiceFulfillment(order.marketOrderId, serviceOrderId, status, `LINKED_SERVICE_${status}`);
    }
  }

  function reconcileMarketServiceFulfillment() {
    let reconciled = 0;
    getMarketOrders().filter((order) => ["FULFILLING", "PAYMENT_RECOVERY_REQUIRED"].includes(order.status)).forEach((order) => {
      if (!isPurchaseWithServiceOrder(order)) return;
      const serviceOrders = order.linkedServiceOrderIds.map((serviceOrderId) => window.WS_APP.getServiceOrder?.(serviceOrderId)).filter(Boolean);
      if (serviceOrders.length !== order.linkedServiceOrderIds.length) return;
      if (serviceOrders.every((serviceOrder) => normalizeToken(serviceOrder.status) === "COMPLETED")) {
        const result = finalizeMarketServiceFulfillment(order.marketOrderId, { idempotencyKey: `${order.idempotencyKey}:capture` });
        if (result.ok || result.reason === "MARKET_BILLING_CAPTURE_FAILED" || result.reason === "MARKET_STOCK_COMMIT_RECOVERY_REQUIRED") reconciled += 1;
        return;
      }
      const failed = serviceOrders.find((serviceOrder) => ["FAILED", "CANCELLED", "REJECTED", "EXPIRED"].includes(normalizeToken(serviceOrder.status)));
      if (failed) {
        failMarketServiceFulfillment(order.marketOrderId, failed.serviceOrderId, failed.status, `LINKED_SERVICE_${normalizeToken(failed.status)}`);
        reconciled += 1;
      }
    });
    marketBridgeDiagnostics.serviceFulfillmentRecoveries += reconciled;
    return { ok: true, reconciled };
  }

  function finalizeCommittedMarketPickup(order = {}, itemTransaction = null) {
    const instanceIds = getMarketOrderInstanceIds(order);
    const completed = updateCheckoutOrder(order, {
      status: "COMPLETED",
      completedAt: getWorldTime(),
      compensationStatus: "NOT_REQUIRED",
      pickupFulfillment: {
        ...order.pickupFulfillment,
        status: "COMPLETED",
        itemTransactionId: normalizeId(itemTransaction?.transactionId || order.pickupFulfillment?.itemTransactionId),
        completedAt: getWorldTime(),
        recoveryRequired: false,
        errors: []
      }
    });
    if (!completed) return { ok: false, reason: "MARKET_ORDER_PERSISTENCE_FAILED", recoveryRequired: true, order };
    marketBridgeDiagnostics.pickupFulfillmentCompletions += 1;
    emitFinalMarketCommitEvents(completed, instanceIds);
    window.dispatchEvent?.(new CustomEvent("ws:market-pickup-completed", {
      detail: {
        eventId: `market-pickup-completed:${completed.marketOrderId}:${completed.revision}`,
        marketOrderId: completed.marketOrderId,
        citizenId: completed.citizenId,
        instanceIds,
        changedDomains: ["MARKET", "ITEM_INSTANCE", "EQUIPMENT"],
        revision: completed.revision
      }
    }));
    return { ok: true, operation: "PICKUP_COMPLETED", status: completed.status, marketOrderId: completed.marketOrderId, createdItemInstanceIds: instanceIds, order: completed };
  }

  function confirmMarketPickup(marketOrderId = "", input = {}) {
    let order = getMarketOrder(marketOrderId);
    const idempotencyKey = normalizeId(input.idempotencyKey || order?.pickupFulfillment?.completionIdempotencyKey);
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    if (!isPickupOrder(order)) return { ok: false, reason: "MARKET_ORDER_PICKUP_NOT_REQUIRED", order };
    if (!idempotencyKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED", order };
    if (order.status === "COMPLETED" && normalizeToken(order.pickupFulfillment?.status) === "COMPLETED") {
      marketBridgeDiagnostics.pickupFulfillmentReplays += 1;
      return { ok: true, operation: "IDEMPOTENT_REPLAY", status: order.status, marketOrderId: order.marketOrderId, createdItemInstanceIds: getMarketOrderInstanceIds(order), order };
    }
    const revisionConflict = validateExpectedMarketOrderRevision(order, input);
    if (revisionConflict) return revisionConflict;
    if (order.pickupFulfillment?.expiresAt && compareWorldTimes(getWorldTime(), order.pickupFulfillment.expiresAt) > 0) {
      return { ok: false, reason: "MARKET_ORDER_PICKUP_EXPIRED", order };
    }
    const actionState = getMarketOrderActionState(order);
    if (!actionState.canConfirmPickup && normalizeToken(order.pickupFulfillment?.status) !== "RECOVERY_REQUIRED") {
      return { ok: false, reason: actionState.pickupCompletionBlockers?.[0] || "MARKET_ORDER_PICKUP_NOT_READY", blockers: actionState.pickupCompletionBlockers || [], order };
    }

    const replay = window.WS_APP.getItemInstanceTransactionByIdempotencyKey?.(idempotencyKey) || null;
    if (replay?.status === "COMMITTED") {
      marketBridgeDiagnostics.pickupFulfillmentReplays += 1;
      return finalizeCommittedMarketPickup(order, replay);
    }

    order = updateCheckoutOrder(order, {
      pickupFulfillment: {
        ...order.pickupFulfillment,
        status: "PROCESSING",
        processingAt: getWorldTime(),
        completionIdempotencyKey: idempotencyKey,
        recoveryRequired: false,
        errors: []
      }
    });
    if (!order) return { ok: false, reason: "MARKET_ORDER_PERSISTENCE_FAILED" };

    const instanceIds = getMarketOrderInstanceIds(order);
    const transaction = window.WS_APP.commitItemInstanceTransaction?.({
      idempotencyKey,
      sourceDomain: "MARKET",
      sourceRefId: order.marketOrderId,
      citizenId: order.citizenId,
      changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "MARKET"],
      metadata: {
        operationType: "MARKET_PICKUP_COMPLETE",
        providerId: order.pickupFulfillment?.providerId || order.vendorProviderId,
        organizationLocationId: order.pickupFulfillment?.organizationLocationId || ""
      },
      operations: instanceIds.map((instanceId) => ({
        type: "MOVE",
        instanceId,
        expected: {
          ownerId: order.citizenId,
          locationType: "VENDOR",
          lifecycleState: "PACKAGED"
        },
        toLocation: {
          type: "UNPLACED",
          characterId: order.citizenId,
          citizenId: order.citizenId,
          marketOrderId: order.marketOrderId,
          pickupCompletedAt: getWorldTime()
        },
        lifecycleState: "UNPACKAGED",
        patch: {
          acquisition: {
            pickupCompletedAt: getWorldTime(),
            pickupOrganizationLocationId: order.pickupFulfillment?.organizationLocationId || ""
          },
          flags: {
            pickupCompleted: true,
            pendingHousingPlacement: true
          }
        }
      }))
    }) || { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_API_UNAVAILABLE" };

    if (!transaction.ok || transaction.compensated) {
      marketBridgeDiagnostics.pickupFulfillmentFailures += 1;
      const recovery = updateCheckoutOrder(order, {
        pickupFulfillment: {
          ...order.pickupFulfillment,
          status: "RECOVERY_REQUIRED",
          recoveryRequired: true,
          errors: [...new Set([...(order.pickupFulfillment?.errors || []), transaction.reason || "MARKET_PICKUP_ITEM_COMMIT_FAILED"])]
        },
        failureCode: transaction.reason || "MARKET_PICKUP_ITEM_COMMIT_FAILED"
      }) || order;
      return { ok: false, reason: transaction.reason || "MARKET_PICKUP_ITEM_COMMIT_FAILED", recoveryRequired: true, order: recovery };
    }
    return finalizeCommittedMarketPickup(order, transaction.transaction);
  }

  function retryMarketPickupCompletion(marketOrderId = "", input = {}) {
    const order = getMarketOrder(marketOrderId);
    if (!order) return { ok: false, reason: "MARKET_ORDER_NOT_FOUND" };
    const revisionConflict = validateExpectedMarketOrderRevision(order, input);
    if (revisionConflict) return revisionConflict;
    if (normalizeToken(order.pickupFulfillment?.status) !== "RECOVERY_REQUIRED") return { ok: false, reason: "MARKET_ORDER_PICKUP_RECOVERY_NOT_REQUIRED", order };
    marketBridgeDiagnostics.pickupFulfillmentRecoveries += 1;
    return confirmMarketPickup(marketOrderId, {
      ...input,
      expectedRevision: order.revision,
      idempotencyKey: normalizeId(order.pickupFulfillment?.completionIdempotencyKey) || normalizeId(input.idempotencyKey)
    });
  }

  function reconcileMarketPickupFulfillment(input = {}) {
    const nowIso = normalizeId(input.nowIso) || getWorldTime();
    let reconciled = 0;
    let expired = 0;
    getMarketOrders().filter((order) => isPickupOrder(order) && ["FULFILLING", "PAYMENT_RECOVERY_REQUIRED"].includes(order.status)).forEach((order) => {
      const pickupStatus = normalizeToken(order.pickupFulfillment?.status || "NOT_REQUIRED");
      const completionKey = normalizeId(order.pickupFulfillment?.completionIdempotencyKey);
      const transaction = completionKey ? window.WS_APP.getItemInstanceTransactionByIdempotencyKey?.(completionKey) : null;
      if (transaction?.status === "COMMITTED") {
        const result = finalizeCommittedMarketPickup(order, transaction);
        if (result.ok) reconciled += 1;
        return;
      }
      if (["PROCESSING", "RECOVERY_REQUIRED"].includes(pickupStatus) && completionKey) {
        const result = confirmMarketPickup(order.marketOrderId, { expectedRevision: order.revision, idempotencyKey: completionKey });
        if (result.ok || result.recoveryRequired) reconciled += 1;
        return;
      }
      if (pickupStatus === "READY" && order.pickupFulfillment?.expiresAt && compareWorldTimes(nowIso, order.pickupFulfillment.expiresAt) > 0) {
        const result = cancelMarketOrder(order.marketOrderId, {
          expectedRevision: order.revision,
          idempotencyKey: `${order.idempotencyKey}:pickup-expiry`,
          reasonCode: "PICKUP_RESERVATION_EXPIRED",
          note: `Pickup reservation expired at ${order.pickupFulfillment.expiresAt}.`
        });
        if (result.ok) {
          expired += 1;
          reconciled += 1;
        }
      }
    });
    marketBridgeDiagnostics.pickupFulfillmentExpirations += expired;
    marketBridgeDiagnostics.pickupFulfillmentRecoveries += reconciled;
    return { ok: true, reconciled, expired };
  }

  function checkoutMarketCart(cartId = "", paymentInput = {}) {
    const quote = quoteMarketCart(cartId);
    if (quote.fulfillmentMode === "PICKUP") return checkoutMarketCartPickup(cartId, paymentInput);
    if (quote.fulfillmentMode === "PURCHASE_WITH_SERVICE") return checkoutMarketCartWithService(cartId, paymentInput);
    return checkoutMarketCartHousing(cartId, paymentInput);
  }

  function reconcileInterruptedMarketOrderOperations() {
    const previousOrders = marketOrdersById;
    let reconciled = 0;
    const nextOrders = { ...marketOrdersById };
    Object.values(marketOrdersById).map(normalizeMarketOrder).forEach((order) => {
      if (order.cancellation?.status !== "PROCESSING") return;
      const hasCapturedPayment = Boolean(normalizeId(order.billingRefs?.billingTransactionId)) || order.paymentStatus === "CAPTURED";
      nextOrders[order.marketOrderId] = normalizeMarketOrder({
        ...order,
        status: hasCapturedPayment ? "PAYMENT_RECOVERY_REQUIRED" : "FAILED",
        failureCode: "MARKET_ORDER_CANCELLATION_INTERRUPTED",
        compensationStatus: "PARTIAL",
        compensationErrors: [...new Set([...(order.compensationErrors || []), "CANCELLATION_INTERRUPTED"])],
        cancellation: {
          ...order.cancellation,
          status: "RECOVERY_REQUIRED",
          completedAt: getWorldTime(),
          errors: [...new Set([...(order.cancellation?.errors || []), "CANCELLATION_INTERRUPTED"])]
        },
        updatedAt: getWorldTime(),
        revision: order.revision + 1
      });
      reconciled += 1;
    });
    if (!reconciled) return { ok: true, reconciled: 0 };
    marketOrdersById = nextOrders;
    if (!persistMarketOrders()) {
      marketOrdersById = previousOrders;
      rebuildMarketOrderIndexes();
      return { ok: false, reconciled: 0, reason: "MARKET_ORDER_PERSISTENCE_FAILED" };
    }
    rebuildMarketOrderIndexes();
    marketBridgeDiagnostics.interruptedCancellationsReconciled += reconciled;
    return { ok: true, reconciled };
  }

  function validateMarketBridgeReadiness() {
    const errors = [];
    const seenIds = new Set();
    const seenKeys = new Set();
    ensureMarketOfferIndex();
    const serviceEligibleOffers = (offerList || []).filter((offer) => offer.fulfillmentOptions.includes("PURCHASE_WITH_SERVICE"));
    const pickupEligibleOffers = (offerList || []).filter((offer) => offer.fulfillmentOptions.includes("PICKUP"));
    pickupEligibleOffers.forEach((offer) => {
      if (!offer.organizationLocationId) errors.push({ code: "MARKET_PICKUP_LOCATION_REQUIRED", marketOfferId: offer.marketOfferId });
      if (!offer.vendorProviderId) errors.push({ code: "MARKET_PICKUP_PROVIDER_REQUIRED", marketOfferId: offer.marketOfferId });
    });
    serviceEligibleOffers.forEach((offer) => {
      if (!offer.linkedServiceDefinitionIds.length) errors.push({ code: "MARKET_SERVICE_OFFER_DEFINITION_REQUIRED", marketOfferId: offer.marketOfferId });
      if (!offer.linkedServiceProviderIds.length) errors.push({ code: "MARKET_SERVICE_OFFER_PROVIDER_REQUIRED", marketOfferId: offer.marketOfferId });
      const targetBodySlots = [
        ...(Array.isArray(offer.catalogItem?.slots) ? offer.catalogItem.slots : []),
        offer.catalogItem?.primarySlot,
        offer.catalogItem?.slot
      ].map(normalizeId).filter(Boolean);
      if (!targetBodySlots.length) errors.push({ code: "MARKET_SERVICE_OFFER_TARGET_BODY_SLOTS_REQUIRED", marketOfferId: offer.marketOfferId });
      if (typeof window.WS_APP.providerSupports === "function"
        && !offer.linkedServiceProviderIds.some((providerId) => window.WS_APP.providerSupports(providerId, "CYBERWARE_INSTALL") === true)) {
        errors.push({ code: "MARKET_SERVICE_INSTALL_PROVIDER_REQUIRED", marketOfferId: offer.marketOfferId });
      }
    });
    Object.values(marketOrdersById).map(normalizeMarketOrder).forEach((order) => {
      if (seenIds.has(order.marketOrderId)) errors.push({ code: "DUPLICATE_MARKET_ORDER_ID", marketOrderId: order.marketOrderId });
      if (seenKeys.has(order.idempotencyKey)) errors.push({ code: "DUPLICATE_MARKET_ORDER_IDEMPOTENCY", idempotencyKey: order.idempotencyKey });
      seenIds.add(order.marketOrderId);
      seenKeys.add(order.idempotencyKey);
      if (order.cancellation?.status === "PROCESSING") errors.push({ code: "INTERRUPTED_MARKET_CANCELLATION", marketOrderId: order.marketOrderId });
      if (order.refundRequest?.status === "REQUESTED" && !order.refundRequest?.requestIdempotencyKey) errors.push({ code: "REFUND_REQUEST_IDEMPOTENCY_REQUIRED", marketOrderId: order.marketOrderId });
      if (["PROCESSING", "RECOVERY_REQUIRED"].includes(order.refundRequest?.status) && !order.refundRequest?.executionIdempotencyKey) errors.push({ code: "REFUND_EXECUTION_IDEMPOTENCY_REQUIRED", marketOrderId: order.marketOrderId });
      if (isPickupOrder(order)) {
        if (!order.pickupFulfillment?.organizationLocationId) errors.push({ code: "MARKET_PICKUP_ORDER_LOCATION_REQUIRED", marketOrderId: order.marketOrderId });
        if (["READY", "PROCESSING", "RECOVERY_REQUIRED"].includes(normalizeToken(order.pickupFulfillment?.status))) {
          getMarketOrderInstanceIds(order).forEach((instanceId) => {
            const instance = window.WS_APP.getItemInstanceById?.(instanceId) || null;
            if (!instance) errors.push({ code: "MARKET_PICKUP_INSTANCE_REQUIRED", marketOrderId: order.marketOrderId, instanceId });
            else if (normalizeToken(instance.location?.type) !== "VENDOR") errors.push({ code: "MARKET_PICKUP_VENDOR_CUSTODY_REQUIRED", marketOrderId: order.marketOrderId, instanceId });
          });
        }
      }
      if (isPurchaseWithServiceOrder(order)) {
        if (!order.linkedServiceOrderIds.length) errors.push({ code: "MARKET_SERVICE_ORDER_LINK_REQUIRED", marketOrderId: order.marketOrderId });
        if (order.linkedServiceOrderIds.length !== order.lines.length) errors.push({ code: "MARKET_SERVICE_ORDER_LINK_COUNT_MISMATCH", marketOrderId: order.marketOrderId });
        order.lines.forEach((line) => {
          if (!line.serviceDefinitionId) errors.push({ code: "MARKET_SERVICE_DEFINITION_REQUIRED", marketOrderId: order.marketOrderId, marketOrderLineId: line.marketOrderLineId });
          if (!line.serviceProviderId) errors.push({ code: "MARKET_SERVICE_PROVIDER_REQUIRED", marketOrderId: order.marketOrderId, marketOrderLineId: line.marketOrderLineId });
          if (!line.serviceOrderId) errors.push({ code: "MARKET_SERVICE_ORDER_ID_REQUIRED", marketOrderId: order.marketOrderId, marketOrderLineId: line.marketOrderLineId });
          if (line.housingReservationIds.length) errors.push({ code: "MARKET_SERVICE_HOUSING_RESERVATION_FORBIDDEN", marketOrderId: order.marketOrderId, marketOrderLineId: line.marketOrderLineId });
          if (line.serviceOrderId) {
            const linkedOrder = window.WS_APP.getServiceOrder?.(line.serviceOrderId) || null;
            const linkedStatus = normalizeToken(linkedOrder?.status || "");
            const linkedInstanceIds = Array.isArray(linkedOrder?.subjectRefs?.instanceIds) ? linkedOrder.subjectRefs.instanceIds.map(normalizeId).filter(Boolean) : [];
            if (linkedOrder && !["COMPLETED", "FAILED", "CANCELLED", "REJECTED", "EXPIRED"].includes(linkedStatus)) {
              linkedInstanceIds.forEach((instanceId) => {
                if (!window.WS_APP.getItemInstanceById?.(instanceId)) {
                  errors.push({ code: "MARKET_SERVICE_ORDER_ORPHAN_INSTANCE_REF", marketOrderId: order.marketOrderId, serviceOrderId: line.serviceOrderId, instanceId });
                }
              });
            }
          }
        });
      }
    });
    ["commitItemInstanceMarketReturn", "compensateItemInstanceTransaction", "getItemInstanceTransaction", "commitItemInstanceTransaction", "getItemInstanceTransactionByIdempotencyKey"].forEach((apiName) => {
      if (typeof window.WS_APP[apiName] !== "function") errors.push({ code: "MARKET_RETURN_API_REQUIRED", apiName });
    });
    [
      "createServiceOffer",
      "createServiceOrderFromOffer",
      "authorizeServiceOrder",
      "scheduleServiceOrder",
      "getServiceOrder",
      "cancelServiceOrder",
      "voidServiceOrderBilling",
      "refundServiceOrderBilling"
    ].forEach((apiName) => {
      if (typeof window.WS_APP[apiName] !== "function") errors.push({ code: "MARKET_SERVICE_API_REQUIRED", apiName });
    });
    const backendErrorCodes = new Set([
      "MARKET_PICKUP_LOCATION_REQUIRED",
      "MARKET_PICKUP_PROVIDER_REQUIRED",
      "MARKET_PICKUP_ORDER_LOCATION_REQUIRED",
      "MARKET_PICKUP_INSTANCE_REQUIRED",
      "MARKET_PICKUP_VENDOR_CUSTODY_REQUIRED",
      "MARKET_SERVICE_OFFER_DEFINITION_REQUIRED",
      "MARKET_SERVICE_OFFER_PROVIDER_REQUIRED",
      "MARKET_SERVICE_OFFER_TARGET_BODY_SLOTS_REQUIRED",
      "MARKET_SERVICE_INSTALL_PROVIDER_REQUIRED",
      "MARKET_SERVICE_ORDER_LINK_REQUIRED",
      "MARKET_SERVICE_ORDER_LINK_COUNT_MISMATCH",
      "MARKET_SERVICE_DEFINITION_REQUIRED",
      "MARKET_SERVICE_PROVIDER_REQUIRED",
      "MARKET_SERVICE_ORDER_ID_REQUIRED",
      "MARKET_SERVICE_HOUSING_RESERVATION_FORBIDDEN",
      "MARKET_SERVICE_API_REQUIRED"
    ]);
    const uiErrorCodes = new Set([
      "MARKET_SERVICE_OFFER_DEFINITION_REQUIRED",
      "MARKET_SERVICE_OFFER_PROVIDER_REQUIRED",
      "MARKET_SERVICE_INSTALL_PROVIDER_REQUIRED"
    ]);
    const recoveryErrorCodes = new Set([
      "INTERRUPTED_MARKET_CANCELLATION",
      "MARKET_SERVICE_ORDER_ORPHAN_INSTANCE_REF",
      "REFUND_REQUEST_IDEMPOTENCY_REQUIRED",
      "REFUND_EXECUTION_IDEMPOTENCY_REQUIRED"
    ]);
    const backendErrors = errors.filter((error) => backendErrorCodes.has(error.code));
    const uiErrors = errors.filter((error) => uiErrorCodes.has(error.code));
    const recoveryErrors = errors.filter((error) => recoveryErrorCodes.has(error.code));
    return {
      schemaVersion: MARKET_SERVICE_FULFILLMENT_SCHEMA_VERSION,
      ok: errors.length === 0,
      marketReady: errors.length === 0,
      serviceFulfillmentReady: errors.length === 0 && serviceEligibleOffers.length > 0,
      pickupFulfillmentReady: backendErrors.length === 0 && pickupEligibleOffers.length > 0,
      marketServiceBackendReady: backendErrors.length === 0 && serviceEligibleOffers.length > 0,
      marketServiceUiReady: uiErrors.length === 0 && serviceEligibleOffers.length > 0,
      marketServiceRecoveryReady: recoveryErrors.length === 0,
      readiness: {
        marketServiceBackendReady: backendErrors.length === 0 && serviceEligibleOffers.length > 0,
        marketServiceUiReady: uiErrors.length === 0 && serviceEligibleOffers.length > 0,
        marketServiceRecoveryReady: recoveryErrors.length === 0
      },
      counts: {
        offers: offerList?.length || 0,
        serviceEligibleOffers: serviceEligibleOffers.length,
        pickupEligibleOffers: pickupEligibleOffers.length,
        pickupOrders: Object.values(marketOrdersById).map(normalizeMarketOrder).filter(isPickupOrder).length,
        deliveryOrders: Object.values(marketOrdersById).map(normalizeMarketOrder).filter(isDeliveryOrder).length,
        shipments: Object.keys(marketShipmentsById).length,
        orders: seenIds.size,
        idempotencyKeys: seenKeys.size,
        errors: errors.length
      },
      diagnostics: getMarketBridgeDiagnostics(),
      errors
    };
  }

  rebuildMarketOrderIndexes();
  reconcileInterruptedMarketOrderOperations();
  reconcileInterruptedMarketRefunds();
  reconcileInterruptedMarketPartialReturns();
  reconcileMarketServiceFulfillment();
  reconcileMarketPickupFulfillment();
  reconcileMarketShipments();
  window.setTimeout?.(() => {
    reconcileMarketServiceFulfillment();
    reconcileMarketPickupFulfillment();
    reconcileMarketShipments();
  }, 0);

  window.addEventListener?.("ws:service-order-completed", handleLinkedServiceOrderEvent);
  window.addEventListener?.("ws:service-order-failed", handleLinkedServiceOrderEvent);
  window.addEventListener?.("ws:service-order-cancelled", handleLinkedServiceOrderEvent);
  window.addEventListener?.("ws:campaign-date-updated", (event) => {
    const nowIso = event?.detail?.iso || event?.detail?.campaignDateIso || event?.detail?.dateIso || getWorldTime();
    reconcileMarketPickupFulfillment({ nowIso });
    reconcileMarketShipments({ nowIso });
  });
  window.addEventListener?.("pagehide", () => {
    if (window.WS_APP.CAMPAIGN_DATA_IO_RELOAD_PENDING === true) return;
    flushMarketCartPersistence();
    flushMarketOrderPersistence();
  });
  document.addEventListener?.("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      if (window.WS_APP.CAMPAIGN_DATA_IO_RELOAD_PENDING === true) return;
      flushMarketCartPersistence();
      flushMarketOrderPersistence();
    }
  });
  window.addEventListener?.("ws:equipment-catalog-updated", () => invalidateMarketOffers());

  Object.assign(window.WS_APP, {
    MARKET_OFFER_SCHEMA_VERSION,
    MARKET_CART_SCHEMA_VERSION,
    MARKET_ORDER_SCHEMA_VERSION,
    MARKET_SHIPMENT_SCHEMA_VERSION,
    MARKET_DELIVERY_FULFILLMENT_SCHEMA_VERSION,
    MARKET_SERVICE_FULFILLMENT_SCHEMA_VERSION,
    MARKET_PICKUP_FULFILLMENT_SCHEMA_VERSION,
    rebuildMarketOfferIndex,
    invalidateMarketOffers,
    getMarketOfferRevision,
    getMarketOffer,
    getMarketOfferByCatalogItemId,
    getMarketOffersByCatalogItemId,
    searchMarketOffers,
    getVendorOffers,
    projectMarketOfferCatalogItem,
    getMarketCatalogItems,
    createMarketCart,
    getMarketCart,
    getCitizenMarketCarts,
    getActiveMarketCart,
    updateMarketCart,
    quoteMarketCart,
    validateMarketOfferPurchaseRequirements,
    validateMarketCheckout,
    reserveMarketStock,
    commitMarketStockReservation,
    releaseMarketStockReservation,
    getMarketShipment,
    getMarketShipments,
    getMarketOrderShipment,
    getMarketShipmentActionState,
    processMarketShipment,
    retryMarketShipmentDelivery,
    reconcileMarketShipment,
    reconcileMarketShipments,
    forceProcessMarketShipment,
    getMarketOrder,
    getMarketOrders,
    getCitizenMarketOrders,
    getMarketOrderByServiceOrderId,
    getMarketOrderActionState,
    cancelMarketOrder,
    retryMarketOrderCancellation,
    requestMarketOrderRefund,
    withdrawMarketOrderRefundRequest,
    quoteMarketOrderPartialReturn,
    requestMarketOrderPartialReturn,
    withdrawMarketOrderPartialReturn,
    executeMarketOrderPartialReturn,
    retryMarketOrderPartialReturn,
    executeMarketOrderRefund,
    retryMarketOrderRefund,
    checkoutMarketCart,
    retryMarketOrderCheckout,
    confirmMarketPickup,
    retryMarketPickupCompletion,
    reconcileMarketPickupFulfillment,
    finalizeMarketServiceFulfillment,
    failMarketServiceFulfillment,
    reconcileMarketServiceFulfillment,
    reconcileInterruptedMarketOrderOperations,
    reconcileInterruptedMarketRefunds,
    reconcileInterruptedMarketPartialReturns,
    validateMarketBridgeReadiness,
    getMarketBridgeDiagnostics,
    resetMarketBridgeDiagnostics,
    flushMarketCartPersistence,
    flushMarketOrderPersistence
  });
})();
