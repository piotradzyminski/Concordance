window.WS_APP = window.WS_APP || {};

(function initHousingRentStandardsStore() {
  const app = window.WS_APP;
  const API_VERSION = "housing_rent_standards_store_3_0x";
  if (app.HousingRentStandards?.version === API_VERSION) return;

  function clone(value) {
    if (value == null) return value;
    try { return structuredClone(value); }
    catch (error) { return JSON.parse(JSON.stringify(value)); }
  }

  function token(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").replace(/[^A-Za-z0-9_:.]/g, "").toUpperCase();
  }

  function getCatalog() {
    return window.APP_DATA?.housingRentStandards || { schemaVersion: API_VERSION, furnishingGrades: [], standards: [] };
  }

  function getStandards() {
    return (getCatalog().standards || []).map(clone);
  }

  function getStandard(standardCodeOrId = "") {
    const requested = token(standardCodeOrId);
    const standard = (getCatalog().standards || []).find((entry) => token(entry.code) === requested || token(entry.standardId) === requested || token(entry.subscriptionCatalogId) === requested);
    return standard ? clone(standard) : null;
  }

  function getTier(standardCodeOrId = "", tierIdOrLevel = "") {
    const standard = getStandard(standardCodeOrId);
    if (!standard) return null;
    const requested = String(tierIdOrLevel ?? "").trim();
    const requestedToken = token(requested);
    const requestedLevel = Number(requested);
    const tier = (standard.tiers || []).find((entry) => token(entry.tierId) === requestedToken || (Number.isFinite(requestedLevel) && Number(entry.tierLevel) === requestedLevel));
    return tier ? { standard, tier: clone(tier) } : null;
  }

  function resolveTierFromSubscription(subscription = {}) {
    const catalogId = String(subscription.subscriptionCatalogId || subscription.catalogId || "").trim();
    const tierId = String(subscription.tierId || "").trim();
    let standard = (getCatalog().standards || []).find((entry) => entry.subscriptionCatalogId === catalogId) || null;
    if (!standard && catalogId === "sub-habitat-ledger") {
      const legacyMap = { "hab-cell": ["H", 1], "hab-standard": ["G", 2], "hab-secured": ["C", 2] };
      const legacy = legacyMap[tierId];
      if (legacy) return getTier(legacy[0], legacy[1]);
    }
    if (!standard) {
      standard = (getCatalog().standards || []).find((entry) => (entry.tiers || []).some((tier) => tier.tierId === tierId)) || null;
    }
    if (!standard) return null;
    const tier = (standard.tiers || []).find((entry) => entry.tierId === tierId) || standard.tiers?.[0] || null;
    return tier ? { standard: clone(standard), tier: clone(tier) } : null;
  }

  function getFurnishingGrade(gradeId = "") {
    const requested = token(gradeId);
    const grade = (getCatalog().furnishingGrades || []).find((entry) => token(entry.gradeId) === requested);
    return grade ? clone(grade) : null;
  }

  function getWeeklyWearPercent(gradeId = "") {
    return Number(getFurnishingGrade(gradeId)?.weeklyWearPercent || 0);
  }

  function buildStorageUnits(resolution = {}, housingRecordId = "") {
    const source = resolution?.tier ? resolution : resolveTierFromSubscription(resolution);
    if (!source?.tier) return [];
    const prefix = String(housingRecordId || `${source.standard.code}-${source.tier.tierLevel}`).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return (source.tier.storage || []).map((storage, index) => ({
      id: `${prefix}-${storage.storageId || `storage-${index + 1}`}`,
      label: storage.label || `Housing Storage ${index + 1}`,
      type: storage.storageType || "GENERAL",
      width: Number(storage.grid?.width || 1),
      height: Number(storage.grid?.height || 1),
      slotCapacity: Number(storage.grid?.width || 1) * Number(storage.grid?.height || 1)
    }));
  }

  function validateCatalog() {
    const catalog = getCatalog();
    const errors = [];
    const standardCodes = new Set();
    const subscriptionIds = new Set();
    const tierIds = new Set();
    (catalog.standards || []).forEach((standard) => {
      const code = token(standard.code);
      if (!code || standardCodes.has(code)) errors.push({ code: "DUPLICATE_OR_MISSING_STANDARD", standard: standard.code || "" });
      standardCodes.add(code);
      if (!standard.subscriptionCatalogId || subscriptionIds.has(standard.subscriptionCatalogId)) errors.push({ code: "DUPLICATE_OR_MISSING_SUBSCRIPTION", standard: code });
      subscriptionIds.add(standard.subscriptionCatalogId);
      (standard.tiers || []).forEach((tier) => {
        if (!tier.tierId || tierIds.has(tier.tierId)) errors.push({ code: "DUPLICATE_OR_MISSING_TIER", standard: code, tierId: tier.tierId || "" });
        tierIds.add(tier.tierId);
        if (standard.maxAreaM2 != null && Number(tier.areaM2 || 0) > Number(standard.maxAreaM2)) errors.push({ code: "TIER_EXCEEDS_STANDARD_AREA", standard: code, tierId: tier.tierId });
      });
    });
    return { valid: errors.length === 0, schemaVersion: catalog.schemaVersion, errors };
  }

  app.HousingRentStandards = Object.freeze({
    version: API_VERSION,
    getCatalog: () => clone(getCatalog()),
    getStandards,
    getStandard,
    getTier,
    resolveTierFromSubscription,
    getFurnishingGrade,
    getWeeklyWearPercent,
    buildStorageUnits,
    validateCatalog
  });

  Object.assign(app, {
    getHousingRentStandards: getStandards,
    getHousingRentStandard: getStandard,
    getHousingRentTier: getTier,
    resolveHousingRentTierFromSubscription: resolveTierFromSubscription,
    getHousingFurnishingGrade: getFurnishingGrade,
    getHousingFurnishingWeeklyWearPercent: getWeeklyWearPercent,
    buildHousingRentStorageUnits: buildStorageUnits,
    validateHousingRentStandardsCatalog: validateCatalog
  });
})();
