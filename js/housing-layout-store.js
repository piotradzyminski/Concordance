window.WS_APP = window.WS_APP || {};

(function initHousingLayoutStore() {
  const app = window.WS_APP;
  const API_VERSION = "housing_layout_store_3_1x";
  if (app.HousingLayouts?.version === API_VERSION) return;

  function clone(value) {
    if (value == null) return value;
    try { return structuredClone(value); }
    catch (error) { return JSON.parse(JSON.stringify(value)); }
  }

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function normalizeToken(value = "") {
    return normalizeId(value).replace(/[\s-]+/g, "_").replace(/[^A-Za-z0-9_:.]/g, "").toUpperCase();
  }

  function getCatalog() {
    return window.APP_DATA?.housingLayoutPools || { schemaVersion: API_VERSION, cellAreaM2: 0.25, templates: [], pools: [] };
  }

  function getTemplates() {
    return (getCatalog().templates || []).map(clone);
  }

  function getTemplate(layoutTemplateId = "") {
    const id = normalizeId(layoutTemplateId);
    const template = (getCatalog().templates || []).find((entry) => entry.layoutTemplateId === id) || null;
    return template ? clone(template) : null;
  }

  function getPool(tierId = "") {
    const id = normalizeId(tierId);
    const pool = (getCatalog().pools || []).find((entry) => entry.tierId === id || entry.poolId === id) || null;
    if (!pool) return null;
    return {
      ...clone(pool),
      templates: (pool.templateIds || []).map((templateId) => getTemplate(templateId)).filter(Boolean)
    };
  }

  function stableHash(value = "") {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function buildLayoutSeed(input = {}) {
    const explicit = normalizeId(input.layoutSeed);
    if (explicit) return explicit;
    const basis = [
      input.housingRecordId,
      input.linkedSubscriptionId,
      input.citizenId,
      input.tierId,
      input.standardCode
    ].map(normalizeId).filter(Boolean).join("|") || "housing-layout";
    return `LAYOUT-${stableHash(basis).toString(36).toUpperCase().padStart(7, "0")}`;
  }

  function resolveTier(input = {}) {
    const standardCode = normalizeToken(input.standardCode || input.housingStandard || input.type?.replace(/^HOUSING_STANDARD_/, ""));
    const tierId = normalizeId(input.standardTierId || input.tierId || input.housingTierId);
    if (standardCode && tierId && typeof app.getHousingRentTier === "function") {
      const resolution = app.getHousingRentTier(standardCode, tierId);
      if (resolution?.tier) return resolution;
    }
    if (tierId && typeof app.getHousingRentStandards === "function") {
      const standard = app.getHousingRentStandards().find((entry) => (entry.tiers || []).some((tier) => tier.tierId === tierId));
      const tier = standard?.tiers?.find((entry) => entry.tierId === tierId) || null;
      if (standard && tier) return { standard, tier };
    }
    if (input.subscription && typeof app.resolveHousingRentTierFromSubscription === "function") {
      return app.resolveHousingRentTierFromSubscription(input.subscription);
    }
    return null;
  }

  function resolveAssignment(input = {}) {
    const resolution = resolveTier(input);
    if (!resolution?.tier || !resolution?.standard) return null;
    const pool = getPool(resolution.tier.tierId);
    const layoutSeed = buildLayoutSeed({
      ...input,
      tierId: resolution.tier.tierId,
      standardCode: resolution.standard.code
    });
    if (!pool || !(pool.templateIds || []).length) {
      return {
        standard: clone(resolution.standard),
        tier: clone(resolution.tier),
        layoutPolicy: resolution.standard.layoutPolicy,
        layoutSeed,
        layoutTemplateId: "",
        template: null,
        pool: pool ? clone(pool) : null,
        selectionMode: "BEDSPACE_OR_NO_PRIVATE_GRID"
      };
    }

    const requestedTemplateId = normalizeId(input.layoutTemplateId || input.requestedLayoutTemplateId);
    const requestedIndex = pool.templateIds.indexOf(requestedTemplateId);
    const selectedIndex = requestedIndex >= 0 ? requestedIndex : stableHash(`${layoutSeed}|${pool.poolId}`) % pool.templateIds.length;
    const layoutTemplateId = pool.templateIds[selectedIndex];
    const template = getTemplate(layoutTemplateId);
    return {
      standard: clone(resolution.standard),
      tier: clone(resolution.tier),
      layoutPolicy: resolution.standard.layoutPolicy,
      layoutSeed,
      layoutTemplateId,
      template,
      pool: clone(pool),
      selectionMode: requestedIndex >= 0
        ? "EXPLICIT_SELECTION"
        : resolution.standard.layoutPolicy === "CHOICE_POOL"
          ? "DETERMINISTIC_DEFAULT_PENDING_CHOICE"
          : resolution.standard.layoutPolicy === "INDIVIDUAL_ASSIGNMENT"
            ? "INDIVIDUAL_BASE_TEMPLATE"
            : "DETERMINISTIC_RANDOM_POOL"
    };
  }

  function instantiateLayout(input = {}) {
    const assignment = resolveAssignment(input);
    if (!assignment?.template) return assignment ? { ...assignment, household: null } : null;
    const housingRecordId = normalizeId(input.housingRecordId || input.id || "housing");
    const roomIdByKey = new Map();
    const rooms = (assignment.template.rooms || []).map((room, index) => {
      const roomKey = normalizeId(room.key || `room-${index + 1}`);
      const id = `${housingRecordId}-${roomKey}`;
      roomIdByKey.set(roomKey, id);
      return {
        id,
        layoutRoomKey: roomKey,
        label: room.label,
        type: room.type,
        bounds: clone(room.bounds),
        activeCells: [...(room.activeCells || [])],
        capabilities: [...(room.capabilities || [])],
        restrictions: [...(room.restrictions || [])]
      };
    });
    const fixedFixtureAnchors = (assignment.template.fixedFixtureAnchors || []).map((anchor) => ({
      ...clone(anchor),
      roomId: roomIdByKey.get(anchor.roomKey) || ""
    }));
    return {
      ...assignment,
      household: {
        schemaVersion: app.HOUSEHOLD_SCHEMA_VERSION || "household_foundation_2_0x",
        layoutSchemaVersion: getCatalog().schemaVersion,
        layoutTemplateId: assignment.layoutTemplateId,
        layoutSeed: assignment.layoutSeed,
        layoutPolicy: assignment.layoutPolicy,
        variantFamily: assignment.template.variantFamily,
        areaM2: assignment.template.areaM2,
        floorPlan: clone(assignment.template.floorPlan),
        rooms,
        fixedFixtureAnchors,
        residentIds: [],
        notes: ""
      }
    };
  }

  function validateCatalog() {
    const catalog = getCatalog();
    const errors = [];
    const templateIds = new Set();
    const poolTierIds = new Set();
    (catalog.templates || []).forEach((template) => {
      if (!template.layoutTemplateId || templateIds.has(template.layoutTemplateId)) errors.push({ code: "LAYOUT_TEMPLATE_ID_DUPLICATE_OR_MISSING", layoutTemplateId: template.layoutTemplateId || "" });
      templateIds.add(template.layoutTemplateId);
      const activeCells = new Set(template.floorPlan?.activeCells || []);
      if (activeCells.size !== Number(template.activeCellCount || 0)) errors.push({ code: "LAYOUT_ACTIVE_CELL_COUNT_MISMATCH", layoutTemplateId: template.layoutTemplateId });
      const expectedCells = Math.round(Number(template.areaM2 || 0) / Number(catalog.cellAreaM2 || 0.25));
      if (activeCells.size !== expectedCells) errors.push({ code: "LAYOUT_AREA_CELL_COUNT_MISMATCH", layoutTemplateId: template.layoutTemplateId, expectedCells, actualCells: activeCells.size });
      const roomCells = new Set();
      (template.rooms || []).forEach((room) => {
        (room.activeCells || []).forEach((cell) => {
          if (!activeCells.has(cell)) errors.push({ code: "LAYOUT_ROOM_CELL_OUTSIDE_MASK", layoutTemplateId: template.layoutTemplateId, roomKey: room.key, cell });
          if (roomCells.has(cell)) errors.push({ code: "LAYOUT_ROOM_CELL_OVERLAP", layoutTemplateId: template.layoutTemplateId, roomKey: room.key, cell });
          roomCells.add(cell);
        });
      });
      activeCells.forEach((cell) => {
        if (!roomCells.has(cell)) errors.push({ code: "LAYOUT_ACTIVE_CELL_UNASSIGNED", layoutTemplateId: template.layoutTemplateId, cell });
      });
    });
    (catalog.pools || []).forEach((pool) => {
      if (!pool.tierId || poolTierIds.has(pool.tierId)) errors.push({ code: "LAYOUT_POOL_TIER_DUPLICATE_OR_MISSING", tierId: pool.tierId || "" });
      poolTierIds.add(pool.tierId);
      (pool.templateIds || []).forEach((templateId) => {
        if (!templateIds.has(templateId)) errors.push({ code: "LAYOUT_POOL_TEMPLATE_MISSING", tierId: pool.tierId, templateId });
      });
    });
    return {
      valid: errors.length === 0,
      schemaVersion: catalog.schemaVersion,
      counts: {
        templates: (catalog.templates || []).length,
        pools: (catalog.pools || []).length,
        errors: errors.length
      },
      errors
    };
  }

  app.HousingLayouts = Object.freeze({
    version: API_VERSION,
    getCatalog: () => clone(getCatalog()),
    getTemplates,
    getTemplate,
    getPool,
    buildLayoutSeed,
    resolveAssignment,
    instantiateLayout,
    validateCatalog
  });

  Object.assign(app, {
    getHousingLayoutCatalog: () => clone(getCatalog()),
    getHousingLayoutTemplates: getTemplates,
    getHousingLayoutTemplate: getTemplate,
    getHousingLayoutPool: getPool,
    buildHousingLayoutSeed: buildLayoutSeed,
    resolveHousingLayoutAssignment: resolveAssignment,
    instantiateHousingLayout: instantiateLayout,
    validateHousingLayoutPoolsCatalog: validateCatalog
  });
})();
