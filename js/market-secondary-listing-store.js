window.WS_APP = window.WS_APP || {};

(function initMarketSecondaryListingStore(app) {
  "use strict";

  const SCHEMA_VERSION = "market_secondary_listing_foundation_7_0x";
  const STORAGE_KEY = "ws_market_secondary_listings_v1";
  const STORAGE_SCHEMA_KEY = "ws_market_secondary_listings_schema";
  const DEFAULT_ACTIVE_TARGET = 12;
  const REPLENISH_INTERVAL_HOURS = 6;
  const LISTING_STATUSES = new Set(["ACTIVE", "RESERVED", "SOLD", "EXPIRED", "WITHDRAWN", "RECOVERY_REQUIRED"]);
  const LISTING_TYPES = new Set(["SYSTEM_GENERATED", "PLAYER_LISTING"]);
  const PRICING_STRATEGIES = new Set(["FIXED", "STEP_DOWN", "FAST_SALE", "PATIENT"]);
  const TERMINAL_STATUSES = new Set(["SOLD", "EXPIRED", "WITHDRAWN"]);
  const EVENT_TYPES = Object.freeze({
    DEMAND_CHECK: "MARKET_SECONDARY_DEMAND_CHECK",
    PRICE_REVIEW: "MARKET_SECONDARY_PRICE_REVIEW",
    EXPIRES: "MARKET_SECONDARY_LISTING_EXPIRES",
    REPLENISH: "MARKET_SECONDARY_REPLENISH"
  });

  let listingsById = Object.create(null);
  let storeRevision = 0;
  let generatorState = {
    sequence: 0,
    targetActiveCount: DEFAULT_ACTIVE_TARGET,
    lastGeneratedAt: null,
    nextReplenishAt: null
  };
  let persistenceTimer = 0;
  let schedulerHandlersRegistered = false;
  let diagnostics = {
    generated: 0,
    soldToWorld: 0,
    expired: 0,
    priceReviews: 0,
    demandChecks: 0,
    staleEventsIgnored: 0,
    persistenceFailures: 0,
    lastReconcileAt: null
  };

  function clone(value) {
    if (value == null) return value;
    try { return structuredClone(value); }
    catch (error) {
      try { return JSON.parse(JSON.stringify(value)); }
      catch (fallbackError) { return null; }
    }
  }

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function normalizeToken(value = "") {
    return String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  }

  function clampNumber(value, min, max, fallback = min) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function clampInteger(value, min, max, fallback = min) {
    return Math.round(clampNumber(value, min, max, fallback));
  }

  function normalizeIso(value = "") {
    if (typeof app.normalizeMarketWorldTimeIso === "function") return app.normalizeMarketWorldTimeIso(value) || "";
    const raw = normalizeId(value);
    if (!raw) return "";
    const source = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00.000Z` : raw;
    const parsed = Date.parse(source);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
  }

  function nowIso() {
    return normalizeIso(app.getCampaignTimeIso?.() || app.CAMPAIGN_TIME_ISO || app.getCampaignDateIso?.() || app.CAMPAIGN_DATE_ISO || new Date().toISOString());
  }

  function addHours(iso = nowIso(), hours = 0) {
    const parsed = Date.parse(normalizeIso(iso));
    if (!Number.isFinite(parsed)) return "";
    return new Date(parsed + (Number(hours || 0) * 60 * 60 * 1000)).toISOString();
  }

  function compareTimes(left = "", right = "") {
    if (typeof app.compareMarketWorldTimes === "function") return app.compareMarketWorldTimes(left, right);
    const leftTime = Date.parse(normalizeIso(left));
    const rightTime = Date.parse(normalizeIso(right));
    if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return String(left || "").localeCompare(String(right || ""));
    return leftTime - rightTime;
  }

  function slug(value = "") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "listing";
  }

  function hash32(value = "") {
    let hash = 2166136261;
    const source = String(value || "");
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededUnit(seed = "") {
    return hash32(seed) / 4294967295;
  }

  function seededInteger(seed = "", min = 0, max = 1) {
    const safeMin = Math.ceil(Math.min(min, max));
    const safeMax = Math.floor(Math.max(min, max));
    return safeMin + Math.floor(seededUnit(seed) * (safeMax - safeMin + 1));
  }

  function roundPrice(value = 0) {
    const price = Math.max(1, Number(value || 0));
    if (price >= 10000) return Math.max(1, Math.round(price / 100) * 100);
    if (price >= 1000) return Math.max(1, Math.round(price / 50) * 50);
    if (price >= 100) return Math.max(1, Math.round(price / 10) * 10);
    return Math.max(1, Math.round(price));
  }

  function resolveConditionFactor(condition = 100) {
    return 0.35 + (0.65 * clampNumber(condition, 0, 100, 100) / 100);
  }

  function resolveExpectedUsedValue(catalogReferencePrice = 0, condition = 100) {
    return roundPrice(Math.max(1, Number(catalogReferencePrice || 0)) * resolveConditionFactor(condition));
  }

  function resolvePriceAttractiveness(listedPrice = 0, expectedUsedValue = 0) {
    const expected = Math.max(1, Number(expectedUsedValue || 0));
    return Number((Math.max(0, Number(listedPrice || 0)) / expected).toFixed(4));
  }

  function resolveInterestLabel(ratio = 1) {
    const value = Number(ratio || 0);
    if (value <= 0.65) return "VERY_HIGH";
    if (value <= 0.82) return "HIGH";
    if (value <= 1.0) return "MODERATE";
    if (value <= 1.15) return "LOW";
    return "VERY_LOW";
  }

  function resolveDailySaleChance(ratio = 1) {
    const value = Number(ratio || 0);
    if (value <= 0.40) return 0.55;
    if (value <= 0.55) return 0.42;
    if (value <= 0.70) return 0.30;
    if (value <= 0.80) return 0.20;
    if (value <= 0.90) return 0.11;
    if (value <= 1.00) return 0.05;
    if (value <= 1.15) return 0.02;
    return 0.005;
  }

  function resolveIntervalSaleChance(dailyChance = 0, intervalHours = 1) {
    const daily = clampNumber(dailyChance, 0, 1, 0);
    const hours = clampNumber(intervalHours, 0.01, 720, 1);
    const hourly = 1 - Math.pow(1 - daily, 1 / 24);
    return Number((1 - Math.pow(1 - hourly, hours)).toFixed(8));
  }

  function resolveDemandIntervalHours(listing = {}, seedSuffix = "") {
    const ratio = Number(listing.priceAttractiveness || resolvePriceAttractiveness(listing.listedPrice, listing.expectedUsedValue));
    let min = 3;
    let max = 8;
    if (ratio <= 0.70) { min = 1; max = 4; }
    else if (ratio <= 1.0) { min = 3; max = 8; }
    else if (ratio <= 1.15) { min = 6; max = 18; }
    else { min = 12; max = 36; }
    return seededInteger(`${listing.listingId}:${listing.revision}:${seedSuffix}:demand-interval`, min, max);
  }

  function resolvePriceReviewIntervalHours(strategy = "FIXED") {
    const normalized = normalizeToken(strategy);
    if (normalized === "FAST_SALE") return 12;
    if (normalized === "STEP_DOWN") return 24;
    if (normalized === "PATIENT") return 48;
    return 0;
  }

  function normalizeListing(raw = {}) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const listingType = normalizeToken(source.listingType || "SYSTEM_GENERATED");
    const status = normalizeToken(source.status || "ACTIVE");
    const strategy = normalizeToken(source.pricingStrategy || "FIXED");
    const condition = clampInteger(source.conditionSnapshot ?? source.condition ?? 100, 0, 100, 100);
    const catalogReferencePrice = roundPrice(source.catalogReferencePrice || source.referencePrice || 1);
    const expectedUsedValue = roundPrice(source.expectedUsedValue || resolveExpectedUsedValue(catalogReferencePrice, condition));
    const listedPrice = roundPrice(source.listedPrice || expectedUsedValue);
    const listedAt = normalizeIso(source.listedAt || source.createdAt || nowIso()) || nowIso();
    const expiresAt = normalizeIso(source.expiresAt) || addHours(listedAt, 72);
    const normalizedStatus = LISTING_STATUSES.has(status) ? status : "ACTIVE";
    const listing = {
      schemaVersion: SCHEMA_VERSION,
      listingId: normalizeId(source.listingId),
      marketOfferId: normalizeId(source.marketOfferId),
      listingType: LISTING_TYPES.has(listingType) ? listingType : "SYSTEM_GENERATED",
      marketChannel: "SECONDARY",
      sellerRef: {
        type: normalizeToken(source.sellerRef?.type || (listingType === "PLAYER_LISTING" ? "CITIZEN" : "SYSTEM_VENDOR")),
        id: normalizeId(source.sellerRef?.id || source.sellerId || "provider-secondary-exchange"),
        displayName: normalizeId(source.sellerRef?.displayName || source.sellerDisplayName || "SECONDARY EXCHANGE")
      },
      definitionId: normalizeId(source.definitionId || source.catalogItemId),
      catalogItemId: normalizeId(source.catalogItemId || source.definitionId),
      sourceInstanceId: normalizeId(source.sourceInstanceId) || null,
      catalogReferencePrice,
      listedPrice,
      conditionSnapshot: condition,
      conditionFactor: Number(resolveConditionFactor(condition).toFixed(4)),
      expectedUsedValue,
      priceAttractiveness: resolvePriceAttractiveness(listedPrice, expectedUsedValue),
      interestLabel: resolveInterestLabel(resolvePriceAttractiveness(listedPrice, expectedUsedValue)),
      listedAt,
      expiresAt,
      lastDemandCheckAt: normalizeIso(source.lastDemandCheckAt) || null,
      nextDemandCheckAt: normalizeIso(source.nextDemandCheckAt) || null,
      lastPriceReviewAt: normalizeIso(source.lastPriceReviewAt) || null,
      nextPriceReviewAt: normalizeIso(source.nextPriceReviewAt) || null,
      pricingStrategy: PRICING_STRATEGIES.has(strategy) ? strategy : "FIXED",
      demandProfile: normalizeToken(source.demandProfile || "NORMAL"),
      status: normalizedStatus,
      soldAt: normalizeIso(source.soldAt) || null,
      expiredAt: normalizeIso(source.expiredAt) || null,
      withdrawnAt: normalizeIso(source.withdrawnAt) || null,
      saleResolution: normalizeToken(source.saleResolution) || null,
      priceHistory: Array.isArray(source.priceHistory)
        ? source.priceHistory.map((entry) => ({
            price: roundPrice(entry?.price || listedPrice),
            changedAt: normalizeIso(entry?.changedAt || listedAt) || listedAt,
            reason: normalizeToken(entry?.reason || "PRICE_SET")
          })).slice(-20)
        : [{ price: listedPrice, changedAt: listedAt, reason: "LISTED" }],
      revision: clampInteger(source.revision || 1, 1, 999999, 1),
      createdAt: normalizeIso(source.createdAt || listedAt) || listedAt,
      updatedAt: normalizeIso(source.updatedAt || listedAt) || listedAt
    };
    if (TERMINAL_STATUSES.has(normalizedStatus)) {
      listing.nextDemandCheckAt = null;
      listing.nextPriceReviewAt = null;
    }
    return listing;
  }

  function readStoredState() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      const listings = Array.isArray(parsed?.listings) ? parsed.listings : [];
      const normalized = Object.create(null);
      listings.map(normalizeListing).forEach((listing) => {
        if (!listing.listingId || normalized[listing.listingId]) return;
        normalized[listing.listingId] = listing;
      });
      listingsById = normalized;
      storeRevision = clampInteger(parsed?.revision || 0, 0, 999999999, 0);
      generatorState = {
        sequence: clampInteger(parsed?.generator?.sequence || 0, 0, 999999999, 0),
        targetActiveCount: clampInteger(parsed?.generator?.targetActiveCount || DEFAULT_ACTIVE_TARGET, 1, 100, DEFAULT_ACTIVE_TARGET),
        lastGeneratedAt: normalizeIso(parsed?.generator?.lastGeneratedAt) || null,
        nextReplenishAt: normalizeIso(parsed?.generator?.nextReplenishAt) || null
      };
    } catch (error) {
      console.warn("W&S secondary listing store could not read localStorage.", error);
      listingsById = Object.create(null);
    }
  }

  function exportState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      revision: storeRevision,
      listings: Object.values(listingsById).map(normalizeListing),
      generator: clone(generatorState),
      diagnostics: clone(diagnostics)
    };
  }

  function flushPersistence() {
    if (persistenceTimer) window.clearTimeout(persistenceTimer);
    persistenceTimer = 0;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(exportState()));
      window.localStorage.setItem(STORAGE_SCHEMA_KEY, SCHEMA_VERSION);
      return true;
    } catch (error) {
      diagnostics.persistenceFailures += 1;
      console.warn("W&S secondary listing store could not persist localStorage.", error);
      return false;
    }
  }

  function schedulePersistence() {
    if (persistenceTimer) return;
    persistenceTimer = window.setTimeout?.(() => flushPersistence(), 0) || 0;
  }

  function emitUpdated(reason = "MARKET_SECONDARY_LISTINGS_UPDATED", listing = null, metadata = {}) {
    window.dispatchEvent?.(new CustomEvent("ws:market-secondary-listings-updated", {
      detail: {
        reason,
        listingId: listing?.listingId || null,
        revision: storeRevision,
        listingRevision: listing?.revision || null,
        campaignTimeIso: nowIso(),
        ...clone(metadata)
      }
    }));
  }

  function commitListing(nextListing = {}, reason = "MARKET_SECONDARY_LISTING_UPDATED", metadata = {}) {
    const listing = normalizeListing(nextListing);
    if (!listing.listingId) return { ok: false, reason: "MARKET_SECONDARY_LISTING_ID_REQUIRED" };
    listingsById = { ...listingsById, [listing.listingId]: listing };
    storeRevision += 1;
    schedulePersistence();
    emitUpdated(reason, listing, metadata);
    return { ok: true, reason, listing: clone(listing), revision: storeRevision };
  }

  function getListing(listingId = "") {
    const listing = listingsById[normalizeId(listingId)] || null;
    return listing ? clone(listing) : null;
  }

  function filterListings(source = [], filters = {}) {
    const status = normalizeToken(filters.status);
    const listingType = normalizeToken(filters.listingType);
    const definitionId = normalizeId(filters.definitionId || filters.catalogItemId);
    const query = String(filters.query || filters.search || "").trim().toUpperCase();
    const includeTerminal = filters.includeTerminal === true;
    const current = normalizeIso(filters.campaignTimeIso || nowIso());
    return source.filter((listing) => {
      if (!includeTerminal && listing.status !== "ACTIVE") return false;
      if (status && listing.status !== status) return false;
      if (listingType && listing.listingType !== listingType) return false;
      if (definitionId && listing.definitionId !== definitionId && listing.catalogItemId !== definitionId) return false;
      if (listing.status === "ACTIVE" && listing.expiresAt && compareTimes(current, listing.expiresAt) >= 0) return false;
      if (query) {
        const offer = app.getMarketOfferByCatalogItemId?.(listing.catalogItemId) || null;
        const text = [listing.listingId, listing.catalogItemId, listing.definitionId, offer?.catalogItem?.name, offer?.catalogItem?.manufacturer, listing.sellerRef?.displayName]
          .map((value) => String(value || "").toUpperCase()).join(" ");
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }

  function getListings(filters = {}) {
    const listings = Object.values(listingsById).map(normalizeListing);
    return clone(filterListings(listings, filters).sort((left, right) => {
      if (left.status === "ACTIVE" && right.status !== "ACTIVE") return -1;
      if (right.status === "ACTIVE" && left.status !== "ACTIVE") return 1;
      return compareTimes(left.expiresAt, right.expiresAt) || left.listingId.localeCompare(right.listingId);
    }));
  }

  function getListingRevision() {
    return storeRevision;
  }

  function getCatalogProjection(listingOrId = {}) {
    const listing = typeof listingOrId === "string" ? getListing(listingOrId) : normalizeListing(listingOrId);
    if (!listing?.listingId) return null;
    const offer = app.getMarketOfferByCatalogItemId?.(listing.catalogItemId) || app.getMarketOffer?.(listing.marketOfferId) || null;
    const item = offer?.catalogItem || app.getEquipmentCatalogItem?.(listing.catalogItemId) || null;
    return {
      ...clone(listing),
      item: item ? clone(item) : null,
      name: String(item?.name || listing.definitionId || listing.listingId),
      manufacturer: String(item?.manufacturer || item?.provider || offer?.vendorDisplayName || "UNKNOWN"),
      category: normalizeToken(item?.category || "EQUIPMENT"),
      subtype: normalizeToken(item?.subtype || item?.kind || "USED_ITEM"),
      currency: offer?.pricing?.currency || "CREDIT",
      playerPurchaseAvailable: false,
      purchaseBlocker: "SECONDARY_FULFILLMENT_NOT_IMPLEMENTED"
    };
  }

  function scheduleEvent(eventType = "", listing = {}, scheduledAt = "", extra = {}) {
    if (typeof app.scheduleMarketTimeEvent !== "function") return { ok: false, reason: "MARKET_TIME_SCHEDULER_UNAVAILABLE" };
    const listingId = normalizeId(listing.listingId || extra.entityId);
    if (!listingId || !normalizeIso(scheduledAt)) return { ok: false, reason: "MARKET_SECONDARY_SCHEDULE_INPUT_INVALID" };
    return app.scheduleMarketTimeEvent({
      eventType,
      entityType: eventType === EVENT_TYPES.REPLENISH ? "MARKET_SECONDARY_GENERATOR" : "MARKET_SECONDARY_LISTING",
      entityId: listingId,
      scheduledAt,
      payload: {
        listingId: eventType === EVENT_TYPES.REPLENISH ? null : listingId,
        expectedListingRevision: listing.revision || null,
        expectedScheduledAt: normalizeIso(scheduledAt),
        ...clone(extra.payload)
      },
      metadata: {
        sourceDomain: "MARKET_SECONDARY",
        listingType: listing.listingType || null,
        ...clone(extra.metadata)
      }
    });
  }

  function scheduleListingEvents(listingOrId = {}) {
    const listing = typeof listingOrId === "string" ? getListing(listingOrId) : normalizeListing(listingOrId);
    if (!listing?.listingId || listing.status !== "ACTIVE") return { ok: true, reason: "MARKET_SECONDARY_LISTING_NOT_SCHEDULABLE", scheduled: [] };
    const scheduled = [];
    if (listing.expiresAt) scheduled.push(scheduleEvent(EVENT_TYPES.EXPIRES, listing, listing.expiresAt));
    if (listing.nextDemandCheckAt) scheduled.push(scheduleEvent(EVENT_TYPES.DEMAND_CHECK, listing, listing.nextDemandCheckAt));
    if (listing.nextPriceReviewAt) scheduled.push(scheduleEvent(EVENT_TYPES.PRICE_REVIEW, listing, listing.nextPriceReviewAt));
    return { ok: scheduled.every((entry) => entry?.ok), reason: "MARKET_SECONDARY_LISTING_EVENTS_SCHEDULED", scheduled };
  }

  function scheduleReplenish(at = "") {
    const scheduledAt = normalizeIso(at || generatorState.nextReplenishAt || addHours(nowIso(), REPLENISH_INTERVAL_HOURS));
    generatorState.nextReplenishAt = scheduledAt;
    schedulePersistence();
    return scheduleEvent(EVENT_TYPES.REPLENISH, { listingId: "secondary-market-generator", revision: storeRevision, listingType: "SYSTEM_GENERATED" }, scheduledAt, {
      entityId: "secondary-market-generator",
      payload: { expectedScheduledAt: scheduledAt }
    });
  }

  function chooseCandidateOffer(sequence = 0, activeDefinitionIds = new Set()) {
    const offers = (app.searchMarketOffers?.({ includeInactive: false }) || [])
      .filter((offer) => Number(offer?.pricing?.finalPrice || 0) > 0)
      .filter((offer) => normalizeToken(offer?.offerType || "PHYSICAL_ITEM") === "PHYSICAL_ITEM")
      .sort((left, right) => String(left.marketOfferId || "").localeCompare(String(right.marketOfferId || "")));
    if (!offers.length) return null;
    const preferred = offers.filter((offer) => !activeDefinitionIds.has(normalizeId(offer.definitionId || offer.catalogItemId)));
    const pool = preferred.length ? preferred : offers;
    return pool[sequence % pool.length] || null;
  }

  function buildSystemListing(offer = {}, sequence = 0, listedAt = nowIso()) {
    const definitionId = normalizeId(offer.definitionId || offer.catalogItemId);
    const seed = `${definitionId}:${sequence}:${listedAt.slice(0, 13)}`;
    const condition = seededInteger(`${seed}:condition`, 45, 98);
    const referencePrice = roundPrice(offer.pricing?.finalPrice || offer.pricing?.basePrice || 1);
    const expectedUsedValue = resolveExpectedUsedValue(referencePrice, condition);
    const marketVariance = 0.70 + (seededUnit(`${seed}:variance`) * 0.45);
    const listedPrice = roundPrice(expectedUsedValue * marketVariance);
    const strategies = ["FIXED", "STEP_DOWN", "FAST_SALE", "PATIENT"];
    const pricingStrategy = strategies[seededInteger(`${seed}:strategy`, 0, strategies.length - 1)];
    const durations = [24, 48, 72, 120, 168];
    const durationHours = durations[seededInteger(`${seed}:duration`, 0, durations.length - 1)];
    const expiresAt = addHours(listedAt, durationHours);
    const listingId = `market_listing_system_${slug(definitionId)}_${String(sequence).padStart(6, "0")}`;
    const provisional = normalizeListing({
      listingId,
      marketOfferId: normalizeId(offer.marketOfferId),
      listingType: "SYSTEM_GENERATED",
      sellerRef: {
        type: "SYSTEM_VENDOR",
        id: "provider-secondary-exchange",
        displayName: "SECONDARY EXCHANGE"
      },
      definitionId,
      catalogItemId: normalizeId(offer.catalogItemId || definitionId),
      catalogReferencePrice: referencePrice,
      listedPrice,
      conditionSnapshot: condition,
      expectedUsedValue,
      listedAt,
      expiresAt,
      pricingStrategy,
      demandProfile: "NORMAL",
      status: "ACTIVE",
      revision: 1,
      createdAt: listedAt,
      updatedAt: listedAt,
      priceHistory: [{ price: listedPrice, changedAt: listedAt, reason: "LISTED" }]
    });
    provisional.nextDemandCheckAt = addHours(listedAt, resolveDemandIntervalHours(provisional, "initial"));
    const reviewHours = resolvePriceReviewIntervalHours(pricingStrategy);
    provisional.nextPriceReviewAt = reviewHours && compareTimes(addHours(listedAt, reviewHours), expiresAt) < 0
      ? addHours(listedAt, reviewHours)
      : null;
    return normalizeListing(provisional);
  }

  function createSystemListing(input = {}) {
    const offer = typeof input.offer === "object" && input.offer
      ? input.offer
      : app.getMarketOffer?.(input.marketOfferId) || app.getMarketOfferByCatalogItemId?.(input.catalogItemId || input.definitionId);
    if (!offer) return { ok: false, reason: "MARKET_SECONDARY_SOURCE_OFFER_REQUIRED" };
    generatorState.sequence += 1;
    const listing = buildSystemListing(offer, generatorState.sequence, normalizeIso(input.listedAt || nowIso()));
    const committed = commitListing(listing, "MARKET_SECONDARY_LISTING_CREATED", { source: input.source || "SYSTEM_GENERATOR" });
    if (!committed.ok) return committed;
    diagnostics.generated += 1;
    generatorState.lastGeneratedAt = listing.listedAt;
    scheduleListingEvents(listing);
    return committed;
  }

  function generateListings(options = {}) {
    const current = normalizeIso(options.campaignTimeIso || nowIso());
    const target = clampInteger(options.targetActiveCount || generatorState.targetActiveCount || DEFAULT_ACTIVE_TARGET, 1, 100, DEFAULT_ACTIVE_TARGET);
    generatorState.targetActiveCount = target;
    const active = getListings({ status: "ACTIVE", campaignTimeIso: current });
    const activeDefinitionIds = new Set(active.map((listing) => listing.definitionId));
    const needed = Math.max(0, target - active.length);
    const created = [];
    for (let index = 0; index < needed; index += 1) {
      const offer = chooseCandidateOffer(generatorState.sequence + 1, activeDefinitionIds);
      if (!offer) break;
      const result = createSystemListing({ offer, listedAt: current, source: options.source || "REPLENISH" });
      if (!result.ok) break;
      created.push(result.listing);
      activeDefinitionIds.add(result.listing.definitionId);
    }
    generatorState.nextReplenishAt = addHours(current, REPLENISH_INTERVAL_HOURS);
    scheduleReplenish(generatorState.nextReplenishAt);
    schedulePersistence();
    return {
      ok: true,
      reason: created.length ? "MARKET_SECONDARY_LISTINGS_GENERATED" : "MARKET_SECONDARY_TARGET_ALREADY_MET",
      created,
      activeCount: active.length + created.length,
      targetActiveCount: target,
      nextReplenishAt: generatorState.nextReplenishAt
    };
  }

  function markExpired(listing = {}, effectiveAt = nowIso(), reason = "MARKET_SECONDARY_LISTING_EXPIRED") {
    if (!listing?.listingId) return { ok: false, reason: "MARKET_SECONDARY_LISTING_NOT_FOUND" };
    if (listing.status !== "ACTIVE") return { ok: true, reason: "MARKET_SECONDARY_LISTING_ALREADY_TERMINAL", listing: clone(listing) };
    const timestamp = normalizeIso(effectiveAt || listing.expiresAt || nowIso());
    const next = normalizeListing({
      ...listing,
      status: "EXPIRED",
      expiredAt: timestamp,
      nextDemandCheckAt: null,
      nextPriceReviewAt: null,
      updatedAt: timestamp,
      revision: listing.revision + 1
    });
    diagnostics.expired += 1;
    return commitListing(next, reason);
  }

  function resolveDemandCheck(listingId = "", options = {}) {
    const listing = getListing(listingId);
    if (!listing) return { ok: true, reason: "MARKET_SECONDARY_LISTING_NO_LONGER_EXISTS", listingId };
    if (listing.status !== "ACTIVE") return { ok: true, reason: "MARKET_SECONDARY_LISTING_NOT_ACTIVE", listing };
    const scheduledAt = normalizeIso(options.scheduledAt || options.currentTimeIso || nowIso());
    if (listing.expiresAt && compareTimes(scheduledAt, listing.expiresAt) >= 0) return markExpired(listing, listing.expiresAt);
    if (listing.nextDemandCheckAt && normalizeIso(listing.nextDemandCheckAt) !== scheduledAt) {
      diagnostics.staleEventsIgnored += 1;
      return { ok: true, reason: "MARKET_SECONDARY_STALE_DEMAND_EVENT", listing };
    }
    const previousAt = normalizeIso(listing.lastDemandCheckAt || listing.listedAt);
    const elapsedHours = Math.max(0.01, (Date.parse(scheduledAt) - Date.parse(previousAt)) / 3600000);
    const dailyChance = resolveDailySaleChance(listing.priceAttractiveness);
    const saleChance = resolveIntervalSaleChance(dailyChance, elapsedHours);
    const roll = seededUnit(`${listing.listingId}:${listing.revision}:${scheduledAt}:demand-roll`);
    diagnostics.demandChecks += 1;
    if (roll < saleChance) {
      const sold = normalizeListing({
        ...listing,
        status: "SOLD",
        soldAt: scheduledAt,
        saleResolution: "WORLD_BUYER",
        lastDemandCheckAt: scheduledAt,
        nextDemandCheckAt: null,
        nextPriceReviewAt: null,
        updatedAt: scheduledAt,
        revision: listing.revision + 1
      });
      diagnostics.soldToWorld += 1;
      return commitListing(sold, "MARKET_SECONDARY_LISTING_SOLD_TO_WORLD", { saleChance, roll });
    }
    const nextInterval = resolveDemandIntervalHours(listing, scheduledAt);
    const nextCheckAt = addHours(scheduledAt, nextInterval);
    const next = normalizeListing({
      ...listing,
      lastDemandCheckAt: scheduledAt,
      nextDemandCheckAt: compareTimes(nextCheckAt, listing.expiresAt) < 0 ? nextCheckAt : null,
      updatedAt: scheduledAt,
      revision: listing.revision + 1
    });
    const committed = commitListing(next, "MARKET_SECONDARY_DEMAND_CHECK_COMPLETED", { saleChance, roll });
    if (committed.ok && committed.listing.nextDemandCheckAt) scheduleEvent(EVENT_TYPES.DEMAND_CHECK, committed.listing, committed.listing.nextDemandCheckAt);
    return committed;
  }

  function resolveReviewedPrice(listing = {}) {
    const strategy = normalizeToken(listing.pricingStrategy);
    const expected = Math.max(1, Number(listing.expectedUsedValue || 1));
    const current = Math.max(1, Number(listing.listedPrice || expected));
    if (strategy === "FAST_SALE") return roundPrice(Math.max(expected * 0.55, current * 0.92));
    if (strategy === "STEP_DOWN") return roundPrice(Math.max(expected * 0.65, current * 0.95));
    if (strategy === "PATIENT") return roundPrice(Math.max(expected * 0.80, current * 0.97));
    return roundPrice(current);
  }

  function resolvePriceReview(listingId = "", options = {}) {
    const listing = getListing(listingId);
    if (!listing) return { ok: true, reason: "MARKET_SECONDARY_LISTING_NO_LONGER_EXISTS", listingId };
    if (listing.status !== "ACTIVE") return { ok: true, reason: "MARKET_SECONDARY_LISTING_NOT_ACTIVE", listing };
    const scheduledAt = normalizeIso(options.scheduledAt || options.currentTimeIso || nowIso());
    if (listing.expiresAt && compareTimes(scheduledAt, listing.expiresAt) >= 0) return markExpired(listing, listing.expiresAt);
    if (!listing.nextPriceReviewAt || normalizeIso(listing.nextPriceReviewAt) !== scheduledAt) {
      diagnostics.staleEventsIgnored += 1;
      return { ok: true, reason: "MARKET_SECONDARY_STALE_PRICE_REVIEW_EVENT", listing };
    }
    const nextPrice = resolveReviewedPrice(listing);
    const reviewHours = resolvePriceReviewIntervalHours(listing.pricingStrategy);
    const candidateReviewAt = reviewHours ? addHours(scheduledAt, reviewHours) : null;
    const nextReviewAt = candidateReviewAt && compareTimes(candidateReviewAt, listing.expiresAt) < 0 ? candidateReviewAt : null;
    const nextDemandAt = addHours(scheduledAt, 1);
    const next = normalizeListing({
      ...listing,
      listedPrice: nextPrice,
      priceAttractiveness: resolvePriceAttractiveness(nextPrice, listing.expectedUsedValue),
      interestLabel: resolveInterestLabel(resolvePriceAttractiveness(nextPrice, listing.expectedUsedValue)),
      lastPriceReviewAt: scheduledAt,
      nextPriceReviewAt: nextReviewAt,
      nextDemandCheckAt: compareTimes(nextDemandAt, listing.expiresAt) < 0 ? nextDemandAt : null,
      priceHistory: [...listing.priceHistory, { price: nextPrice, changedAt: scheduledAt, reason: "AUTOMATIC_PRICE_REVIEW" }].slice(-20),
      updatedAt: scheduledAt,
      revision: listing.revision + 1
    });
    diagnostics.priceReviews += 1;
    const committed = commitListing(next, nextPrice === listing.listedPrice ? "MARKET_SECONDARY_PRICE_REVIEW_NO_CHANGE" : "MARKET_SECONDARY_PRICE_CHANGED");
    if (committed.ok) {
      if (committed.listing.nextPriceReviewAt) scheduleEvent(EVENT_TYPES.PRICE_REVIEW, committed.listing, committed.listing.nextPriceReviewAt);
      if (committed.listing.nextDemandCheckAt) scheduleEvent(EVENT_TYPES.DEMAND_CHECK, committed.listing, committed.listing.nextDemandCheckAt);
    }
    return committed;
  }

  function resolveExpiry(listingId = "", options = {}) {
    const listing = getListing(listingId);
    if (!listing) return { ok: true, reason: "MARKET_SECONDARY_LISTING_NO_LONGER_EXISTS", listingId };
    if (listing.status !== "ACTIVE") return { ok: true, reason: "MARKET_SECONDARY_LISTING_NOT_ACTIVE", listing };
    const scheduledAt = normalizeIso(options.scheduledAt || options.currentTimeIso || nowIso());
    if (listing.expiresAt && normalizeIso(listing.expiresAt) !== scheduledAt) {
      diagnostics.staleEventsIgnored += 1;
      return { ok: true, reason: "MARKET_SECONDARY_STALE_EXPIRY_EVENT", listing };
    }
    return markExpired(listing, scheduledAt);
  }

  async function handleDemandEvent(event = {}, context = {}) {
    const listingId = normalizeId(event.payload?.listingId || event.payload?.entityId || event.entityId);
    return resolveDemandCheck(listingId, { scheduledAt: context.scheduledAt || event.scheduledAt, currentTimeIso: context.currentTimeIso });
  }

  async function handlePriceReviewEvent(event = {}, context = {}) {
    const listingId = normalizeId(event.payload?.listingId || event.payload?.entityId || event.entityId);
    return resolvePriceReview(listingId, { scheduledAt: context.scheduledAt || event.scheduledAt, currentTimeIso: context.currentTimeIso });
  }

  async function handleExpiryEvent(event = {}, context = {}) {
    const listingId = normalizeId(event.payload?.listingId || event.payload?.entityId || event.entityId);
    return resolveExpiry(listingId, { scheduledAt: context.scheduledAt || event.scheduledAt, currentTimeIso: context.currentTimeIso });
  }

  async function handleReplenishEvent(event = {}, context = {}) {
    const scheduledAt = normalizeIso(context.scheduledAt || event.scheduledAt || nowIso());
    if (generatorState.nextReplenishAt && normalizeIso(generatorState.nextReplenishAt) !== scheduledAt) {
      diagnostics.staleEventsIgnored += 1;
      return { ok: true, reason: "MARKET_SECONDARY_STALE_REPLENISH_EVENT" };
    }
    return generateListings({ campaignTimeIso: scheduledAt, targetActiveCount: generatorState.targetActiveCount, source: "SCHEDULED_REPLENISH" });
  }

  function registerSchedulerHandlers() {
    if (schedulerHandlersRegistered || typeof app.registerMarketTimeEventHandler !== "function") return false;
    const handlers = [
      [EVENT_TYPES.DEMAND_CHECK, handleDemandEvent],
      [EVENT_TYPES.PRICE_REVIEW, handlePriceReviewEvent],
      [EVENT_TYPES.EXPIRES, handleExpiryEvent],
      [EVENT_TYPES.REPLENISH, handleReplenishEvent]
    ];
    const results = handlers.map(([eventType, handler]) => app.registerMarketTimeEventHandler(eventType, handler, { replace: true }));
    schedulerHandlersRegistered = results.every((entry) => entry?.ok);
    return schedulerHandlersRegistered;
  }

  function reconcileListings(options = {}) {
    const current = normalizeIso(options.campaignTimeIso || nowIso());
    let expired = 0;
    let scheduled = 0;
    Object.values(listingsById).map(normalizeListing).forEach((listing) => {
      if (listing.status !== "ACTIVE") return;
      if (listing.expiresAt && compareTimes(current, listing.expiresAt) >= 0) {
        const result = markExpired(listing, listing.expiresAt, "MARKET_SECONDARY_LISTING_EXPIRED_DURING_RECONCILE");
        if (result.ok) expired += 1;
        return;
      }
      const result = scheduleListingEvents(listing);
      scheduled += result.scheduled?.filter((entry) => entry?.ok).length || 0;
    });
    diagnostics.lastReconcileAt = current;
    const generated = options.generate === false ? { created: [] } : generateListings({ campaignTimeIso: current, source: "STARTUP_RECONCILE" });
    if (options.generate === false) scheduleReplenish(generatorState.nextReplenishAt || addHours(current, REPLENISH_INTERVAL_HOURS));
    schedulePersistence();
    return {
      ok: true,
      reason: "MARKET_SECONDARY_LISTINGS_RECONCILED",
      expired,
      scheduled,
      generated: generated.created?.length || 0,
      activeCount: getListings({ status: "ACTIVE", campaignTimeIso: current }).length,
      revision: storeRevision
    };
  }

  function importState(raw = {}, options = {}) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const next = Object.create(null);
    (Array.isArray(source.listings) ? source.listings : []).map(normalizeListing).forEach((listing) => {
      if (!listing.listingId || next[listing.listingId]) return;
      next[listing.listingId] = listing;
    });
    listingsById = next;
    storeRevision = clampInteger(source.revision || 0, 0, 999999999, 0);
    generatorState = {
      sequence: clampInteger(source.generator?.sequence || 0, 0, 999999999, 0),
      targetActiveCount: clampInteger(source.generator?.targetActiveCount || DEFAULT_ACTIVE_TARGET, 1, 100, DEFAULT_ACTIVE_TARGET),
      lastGeneratedAt: normalizeIso(source.generator?.lastGeneratedAt) || null,
      nextReplenishAt: normalizeIso(source.generator?.nextReplenishAt) || null
    };
    const persisted = options.persist === false || flushPersistence();
    if (options.reconcile !== false) queueMicrotask(() => reconcileListings({ generate: options.generate !== false }));
    return { ok: persisted, reason: persisted ? "MARKET_SECONDARY_STATE_IMPORTED" : "MARKET_SECONDARY_IMPORT_PERSISTENCE_FAILED", listingCount: Object.keys(listingsById).length };
  }

  function resetState(options = {}) {
    listingsById = Object.create(null);
    storeRevision = 0;
    generatorState = { sequence: 0, targetActiveCount: DEFAULT_ACTIVE_TARGET, lastGeneratedAt: null, nextReplenishAt: null };
    diagnostics = { generated: 0, soldToWorld: 0, expired: 0, priceReviews: 0, demandChecks: 0, staleEventsIgnored: 0, persistenceFailures: 0, lastReconcileAt: null };
    const persisted = options.persist === false || flushPersistence();
    if (options.generate === true) queueMicrotask(() => reconcileListings({ generate: true }));
    emitUpdated("MARKET_SECONDARY_STATE_RESET");
    return { ok: persisted, reason: "MARKET_SECONDARY_STATE_RESET" };
  }

  function getDiagnostics() {
    return {
      schemaVersion: SCHEMA_VERSION,
      ready: schedulerHandlersRegistered,
      revision: storeRevision,
      counts: {
        total: Object.keys(listingsById).length,
        active: getListings({ status: "ACTIVE" }).length,
        sold: getListings({ status: "SOLD", includeTerminal: true }).length,
        expired: getListings({ status: "EXPIRED", includeTerminal: true }).length
      },
      generator: clone(generatorState),
      diagnostics: clone(diagnostics)
    };
  }

  readStoredState();

  Object.assign(app, {
    MARKET_SECONDARY_LISTING_SCHEMA_VERSION: SCHEMA_VERSION,
    MARKET_SECONDARY_LISTING_EVENT_TYPES: EVENT_TYPES,
    normalizeMarketSecondaryListing: normalizeListing,
    resolveMarketSecondaryConditionFactor: resolveConditionFactor,
    resolveMarketSecondaryExpectedUsedValue: resolveExpectedUsedValue,
    resolveMarketSecondaryPriceAttractiveness: resolvePriceAttractiveness,
    resolveMarketSecondaryInterestLabel: resolveInterestLabel,
    resolveMarketSecondaryDailySaleChance: resolveDailySaleChance,
    resolveMarketSecondaryIntervalSaleChance: resolveIntervalSaleChance,
    getMarketSecondaryListing: getListing,
    getMarketSecondaryListings: getListings,
    getMarketSecondaryListingRevision: getListingRevision,
    projectMarketSecondaryListing: getCatalogProjection,
    createSystemMarketSecondaryListing: createSystemListing,
    generateSystemMarketSecondaryListings: generateListings,
    scheduleMarketSecondaryListingEvents: scheduleListingEvents,
    reconcileMarketSecondaryListings: reconcileListings,
    resolveMarketSecondaryDemandCheck: resolveDemandCheck,
    resolveMarketSecondaryPriceReview: resolvePriceReview,
    expireMarketSecondaryListing: resolveExpiry,
    exportMarketSecondaryListingState: exportState,
    importMarketSecondaryListingState: importState,
    resetMarketSecondaryListingState: resetState,
    flushMarketSecondaryListingPersistence: flushPersistence,
    getMarketSecondaryListingDiagnostics: getDiagnostics
  });

  registerSchedulerHandlers();
  window.addEventListener?.("ws:market-time-scheduler-ready", () => {
    registerSchedulerHandlers();
    reconcileListings({ generate: true });
  }, { once: true });
  window.addEventListener?.("ws:equipment-catalog-updated", () => reconcileListings({ generate: true }));
  window.addEventListener?.("pagehide", () => {
    if (app.CAMPAIGN_DATA_IO_RELOAD_PENDING === true) return;
    flushPersistence();
  });
  document.addEventListener?.("visibilitychange", () => {
    if (document.visibilityState !== "hidden" || app.CAMPAIGN_DATA_IO_RELOAD_PENDING === true) return;
    flushPersistence();
  });

  queueMicrotask(() => {
    registerSchedulerHandlers();
    reconcileListings({ generate: true });
    window.dispatchEvent?.(new CustomEvent("ws:market-secondary-listing-store-ready", { detail: getDiagnostics() }));
  });
})(window.WS_APP);
