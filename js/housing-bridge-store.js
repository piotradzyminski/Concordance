window.WS_APP = window.WS_APP || {};

(function initHousingBridgeStore() {
  const HOUSING_BRIDGE_SCHEMA_VERSION = 2;
  const HOUSING_STORAGE_WIDTH = 4;
  const HOUSING_STORAGE_LOCATION = "HOUSING_STORAGE";
  const DEFAULT_STORAGE_UNIT_ID = "housing-storage-main";
  const HOUSING_PLACEMENT_RESERVATION_STORAGE_KEY = "ws_housing_placement_reservations_v1";
  const HOUSING_PLACEMENT_PERSISTENCE_DELAY_MS = 120;
  const HOUSING_RESERVATION_STATUSES = new Set(["RESERVED", "COMMITTED", "RELEASED", "ROLLED_BACK"]);
  const ACTIVE_HOUSING_RESERVATION_STATUSES = new Set(["RESERVED"]);
  const HOUSING_RESERVATION_TRANSITIONS = {
    RESERVED: new Set(["COMMITTED", "RELEASED"]),
    COMMITTED: new Set(["ROLLED_BACK"]),
    RELEASED: new Set(),
    ROLLED_BACK: new Set()
  };
  const HOUSING_STORAGE_PROFILES = [
    { keys: ["HAB_CELL", "HABCELL", "CELL", "CELL_ACCESS", "RENT_ACCESS"], label: "Cell Access", rows: 1 },
    { keys: ["MICRO_UNIT", "MICRO", "MICRO_HAB", "HAB_MICRO"], label: "Micro Unit", rows: 2 },
    { keys: ["STANDARD_UNIT", "STANDARD", "HAB_STANDARD", "HABITAT_STANDARD"], label: "Standard Unit", rows: 3 },
    { keys: ["TECHNICAL_HOUSING", "TECHNICAL", "C12_TECHNICAL", "WORKSHOP_UNIT"], label: "Technical Housing", rows: 4 },
    { keys: ["SECURED_UNIT", "SECURED", "HAB_SECURED", "SAFEHOUSE", "SAFE_HOUSE"], label: "Secured Unit", rows: 4 },
    { keys: ["CORPORATE_UNIT", "CORPORATE", "EXECUTIVE_UNIT", "ALPHA_UNIT"], label: "Corporate Unit", rows: 6 },
    { keys: ["WAREHOUSE_LEASE", "WAREHOUSE", "STORAGE_LEASE"], label: "Warehouse Lease", rows: 8 }
  ];

  let reservationsById = new Map();
  let reservationIdByIdempotencyKey = new Map();
  let reservationIdsByCitizenId = new Map();
  let reservationIdsByHousingStorageId = new Map();
  let persistedReservationSnapshot = [];
  let persistenceTimer = 0;
  let persistenceDirty = false;
  const emittedEventIds = new Set();
  const diagnostics = createDiagnostics();

  function createDiagnostics() {
    return {
      storageLookups: 0,
      occupancyReads: 0,
      placementValidations: 0,
      reservationReads: 0,
      reservationWrites: 0,
      reservationIdempotentReplays: 0,
      reservationIdempotencyConflicts: 0,
      revisionConflicts: 0,
      lifecycleRejections: 0,
      emittedEvents: 0,
      suppressedDuplicateEvents: 0,
      persistenceSchedules: 0,
      persistenceFlushes: 0,
      persistenceFailures: 0,
      persistenceRollbacks: 0
    };
  }

  function clone(value) {
    if (value == null) return value;
    if (typeof structuredClone === "function") {
      try { return structuredClone(value); } catch (_) { /* fall through */ }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function normalizeToken(value = "") {
    return normalizeId(value).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function clampInteger(value, min, max, fallback = min) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function getWorldDate() {
    const iso = normalizeId(window.WS_APP.getCampaignDateIso?.() || window.WS_APP.CAMPAIGN_DATE_ISO || "2109-02-13");
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : "2109-02-13";
  }

  function makeRuntimeId(prefix = "housing_reservation") {
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${Date.now().toString(36)}_${random}`;
  }

  function getRentSubscriptions(citizen = {}) {
    return (Array.isArray(citizen.subscriptions) ? citizen.subscriptions : [])
      .filter((subscription) => subscription && normalizeToken(subscription.category) === "RENT" && subscription.archived !== true);
  }

  function resolveHousingStorageProfile(record = {}) {
    const candidates = [record.storageProfile, record.type, record.title, record.linkedSubscriptionId, record.provider]
      .map(normalizeToken)
      .filter(Boolean);
    const profile = HOUSING_STORAGE_PROFILES.find((entry) => entry.keys.some((key) => candidates.includes(key) || candidates.some((candidate) => candidate.includes(key))));
    return clone(profile || { label: "Unit Storage", rows: 2 });
  }

  function normalizeHousingStorageUnit(unit = {}, index = 0, record = {}) {
    const source = unit && typeof unit === "object" && !Array.isArray(unit) ? unit : {};
    const profile = resolveHousingStorageProfile(record);
    const width = clampInteger(source.width ?? source.columns ?? HOUSING_STORAGE_WIDTH, 1, 24, HOUSING_STORAGE_WIDTH);
    const requestedCapacity = clampInteger(source.slotCapacity ?? source.capacitySlots ?? source.slots ?? 0, 0, 9999, 0);
    const height = clampInteger(source.height ?? source.rows ?? (requestedCapacity ? Math.ceil(requestedCapacity / width) : profile.rows), 1, 99, profile.rows);
    return {
      id: normalizeId(source.id || (index === 0 ? DEFAULT_STORAGE_UNIT_ID : `housing-storage-${index + 1}`)),
      label: normalizeId(source.label || (index === 0 ? profile.label : `Housing Storage ${index + 1}`)),
      type: normalizeToken(source.type || HOUSING_STORAGE_LOCATION),
      profileLabel: normalizeId(source.profileLabel || profile.label),
      width,
      height,
      slotCapacity: requestedCapacity || height * width,
      retiring: source.retiring === true
    };
  }

  function normalizeHousingRecord(record = {}, index = 0) {
    const source = record && typeof record === "object" && !Array.isArray(record) ? record : {};
    const utilities = source.utilities && typeof source.utilities === "object" && !Array.isArray(source.utilities) ? source.utilities : {};
    const maintenance = source.maintenance && typeof source.maintenance === "object" && !Array.isArray(source.maintenance) ? source.maintenance : {};
    const normalized = {
      id: normalizeId(source.id || `housing-${index + 1}`),
      title: normalizeId(source.title || source.name || "Housing Record"),
      type: normalizeToken(source.type || "UNIT"),
      status: normalizeToken(source.status || "ACTIVE"),
      provider: normalizeId(source.provider || "Habitat Ledger"),
      rentStatus: normalizeToken(source.rentStatus || source.billingStatus || source.status || "UNKNOWN"),
      visibleAddress: normalizeId(source.visibleAddress || source.address || ""),
      traceAddress: normalizeId(source.traceAddress || source.trace || ""),
      linkedSubscriptionId: normalizeId(source.linkedSubscriptionId || source.subscriptionId || ""),
      isPrimary: source.isPrimary === true,
      occupancyStatus: normalizeToken(source.occupancyStatus || (source.status === "ACTIVE" ? "OCCUPIED" : "")),
      standardCode: normalizeToken(source.standardCode || source.housingStandard || ""),
      standardTierId: normalizeId(source.standardTierId || source.housingTierId || ""),
      areaM2: source.areaM2 == null ? null : Number(source.areaM2),
      occupancy: source.occupancy && typeof source.occupancy === "object" && !Array.isArray(source.occupancy) ? clone(source.occupancy) : {},
      furnishingPolicy: normalizeToken(source.furnishingPolicy || ""),
      fixedFixtures: Array.isArray(source.fixedFixtures) ? source.fixedFixtures.map(normalizeToken).filter(Boolean) : [],
      rentalFurnishings: Array.isArray(source.rentalFurnishings) ? source.rentalFurnishings.map(normalizeToken).filter(Boolean) : [],
      capabilities: Array.isArray(source.capabilities) ? source.capabilities.map(normalizeToken).filter(Boolean) : [],
      parcelMaxFootprint: normalizeId(source.parcelMaxFootprint || ""),
      logistics: source.logistics && typeof source.logistics === "object" && !Array.isArray(source.logistics) ? clone(source.logistics) : {},
      disposalAccess: normalizeToken(source.disposalAccess || ""),
      defaultFurnishingGrade: normalizeToken(source.defaultFurnishingGrade || ""),
      fixtureReplacementPolicy: normalizeToken(source.fixtureReplacementPolicy || ""),
      upgradeSlotPolicy: normalizeToken(source.upgradeSlotPolicy || ""),
      maintenanceCoverage: normalizeToken(source.maintenanceCoverage || ""),
      layoutPolicy: normalizeToken(source.layoutPolicy || ""),
      layoutTemplateId: normalizeId(source.layoutTemplateId || source.household?.layoutTemplateId || ""),
      layoutSeed: normalizeId(source.layoutSeed || source.household?.layoutSeed || ""),
      layoutVariantFamily: normalizeToken(source.layoutVariantFamily || source.household?.variantFamily || ""),
      securityLevel: clampInteger(source.securityLevel ?? 0, 0, 99, 0),
      privacyLevel: clampInteger(source.privacyLevel ?? 0, 0, 99, 0),
      comfortLevel: clampInteger(source.comfortLevel ?? 0, 0, 99, 0),
      accessLevel: normalizeToken(source.accessLevel || source.access || source.zone || source.zoneCode || "STANDARD"),
      utilityStatus: normalizeToken(source.utilityStatus || utilities.status || utilities.state || "UNKNOWN"),
      maintenanceStatus: normalizeToken(source.maintenanceStatus || maintenance.status || maintenance.state || "NOMINAL"),
      storageProfile: normalizeId(source.storageProfile || ""),
      rentBridge: source.rentBridge && typeof source.rentBridge === "object" && !Array.isArray(source.rentBridge) ? clone(source.rentBridge) : null,
      rentTransition: source.rentTransition && typeof source.rentTransition === "object" && !Array.isArray(source.rentTransition) ? clone(source.rentTransition) : null,
      restrictions: Array.isArray(source.restrictions) ? source.restrictions.map(normalizeId).filter(Boolean) : [],
      issues: Array.isArray(source.issues) ? source.issues.map(normalizeId).filter(Boolean) : [],
      linkedServices: Array.isArray(source.linkedServices) ? source.linkedServices.map(normalizeId).filter(Boolean) : [],
      storageUnits: [],
      household: source.household && typeof source.household === "object" && !Array.isArray(source.household) ? clone(source.household) : {},
      archived: source.archived === true
    };
    normalized.storageUnits = Array.isArray(source.storageUnits) && source.storageUnits.length
      ? source.storageUnits.map((unit, unitIndex) => normalizeHousingStorageUnit(unit, unitIndex, normalized))
      : [normalizeHousingStorageUnit({}, 0, normalized)];
    const assignment = window.WS_APP.resolveHousingLayoutAssignment?.({
      ...normalized,
      housingRecordId: normalized.id,
      layoutTemplateId: normalized.layoutTemplateId,
      layoutSeed: normalized.layoutSeed
    }) || null;
    if (assignment) {
      normalized.layoutPolicy = normalized.layoutPolicy || normalizeToken(assignment.layoutPolicy);
      normalized.layoutTemplateId = normalized.layoutTemplateId || normalizeId(assignment.layoutTemplateId);
      normalized.layoutSeed = normalized.layoutSeed || normalizeId(assignment.layoutSeed);
      normalized.layoutVariantFamily = normalized.layoutVariantFamily || normalizeToken(assignment.template?.variantFamily || "");
    }
    return normalized;
  }

  function deriveHousingFromRent(citizen = {}) {
    return getRentSubscriptions(citizen).map((subscription, index) => {
      const resolution = window.WS_APP.resolveHousingRentTierFromSubscription?.(subscription) || null;
      const standard = resolution?.standard || null;
      const tier = resolution?.tier || null;
      const housingRecordId = subscription.id || subscription.subscriptionContractId || `housing-rent-${index + 1}`;
      const storageUnits = tier ? window.WS_APP.buildHousingRentStorageUnits?.(resolution, housingRecordId) || [] : [];
      return normalizeHousingRecord({
        id: housingRecordId,
        title: tier ? `${standard.label} / ${tier.label}` : subscription.title || subscription.tierLabel || "Habitat Ledger Access",
        type: standard ? `HOUSING_STANDARD_${standard.code}` : subscription.tierId || subscription.tierLabel || "RENT_ACCESS",
        status: subscription.active === false ? "SUSPENDED" : "ACTIVE",
        provider: subscription.provider || "Habitat Ledger",
        rentStatus: subscription.status || subscription.billingStatus || "UNKNOWN",
        visibleAddress: citizen.address || citizen.visibleAddress || "",
        traceAddress: citizen.trace || citizen.traceAddress || "",
        linkedSubscriptionId: housingRecordId,
        storageProfile: subscription.tierId || subscription.tierLabel || "",
        standardCode: standard?.code || "",
        standardTierId: tier?.tierId || subscription.tierId || "",
        areaM2: tier?.areaM2 ?? null,
        furnishingPolicy: tier?.furnishingPolicy || "",
        parcelMaxFootprint: tier?.logistics?.parcelMaxFootprint || "",
        disposalAccess: tier?.disposalAccess || "",
        defaultFurnishingGrade: tier?.defaultFurnishingGrade || "",
        maintenanceCoverage: tier?.maintenanceCoverage || "",
        layoutPolicy: standard?.layoutPolicy || "",
        layoutTemplateId: subscription.layoutTemplateId || "",
        layoutSeed: subscription.layoutSeed || "",
        storageUnits
      }, index);
    });
  }

  function getCitizenHousingRecords(citizenOrId = {}) {
    const citizen = typeof citizenOrId === "string"
      ? window.WS_APP.getCitizenById?.(normalizeId(citizenOrId)) || null
      : citizenOrId;
    if (!citizen || typeof citizen !== "object") return [];
    const explicit = Array.isArray(citizen.housing)
      ? citizen.housing.map((record, index) => normalizeHousingRecord(record, index)).filter((record) => !record.archived)
      : [];
    return explicit.length ? explicit : deriveHousingFromRent(citizen);
  }

  function getHousingStorage(housingStorageId = "", citizenId = "") {
    diagnostics.storageLookups += 1;
    const ownerId = normalizeId(citizenId);
    const storageId = normalizeId(housingStorageId);
    if (!ownerId || !storageId) return null;
    const citizen = window.WS_APP.getCitizenById?.(ownerId) || null;
    if (!citizen) return null;
    const records = getCitizenHousingRecords(citizen);
    const record = records.find((entry) => entry.storageUnits.some((unit) => unit.id === storageId)) || null;
    const unit = record?.storageUnits.find((entry) => entry.id === storageId) || null;
    return record && unit ? { citizen, record: clone(record), unit: clone(unit) } : null;
  }

  function normalizeHousingPlacementReservation(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const status = normalizeToken(source.status || "RESERVED");
    return {
      schemaVersion: HOUSING_BRIDGE_SCHEMA_VERSION,
      reservationId: normalizeId(source.reservationId),
      citizenId: normalizeId(source.citizenId),
      housingStorageId: normalizeId(source.housingStorageId || source.storageUnitId),
      definitionId: normalizeId(source.definitionId),
      marketOrderId: normalizeId(source.marketOrderId),
      instanceId: normalizeId(source.instanceId),
      idempotencyKey: normalizeId(source.idempotencyKey),
      status: HOUSING_RESERVATION_STATUSES.has(status) ? status : "RESERVED",
      placement: source.placement && typeof source.placement === "object" ? {
        gridX: clampInteger(source.placement.gridX ?? source.placement.column ?? 1, 1, 999, 1),
        gridY: clampInteger(source.placement.gridY ?? source.placement.row ?? 1, 1, 999, 1),
        rotation: Number(source.placement.rotation) === 90 ? 90 : 0,
        width: clampInteger(source.placement.width || 1, 1, 99, 1),
        height: clampInteger(source.placement.height || 1, 1, 99, 1)
      } : null,
      createdAt: normalizeId(source.createdAt || getWorldDate()),
      committedAt: normalizeId(source.committedAt),
      releasedAt: normalizeId(source.releasedAt),
      releaseReason: normalizeToken(source.releaseReason),
      revision: clampInteger(source.revision || 1, 1, Number.MAX_SAFE_INTEGER, 1)
    };
  }

  function serializeReservations() {
    return Array.from(reservationsById.values()).map((reservation) => clone(reservation));
  }

  function addIndexValue(index, key, value) {
    if (!key) return;
    const current = index.get(key) || new Set();
    current.add(value);
    index.set(key, current);
  }

  function rebuildReservationIndexes() {
    reservationIdByIdempotencyKey = new Map();
    reservationIdsByCitizenId = new Map();
    reservationIdsByHousingStorageId = new Map();
    reservationsById.forEach((reservation, reservationId) => {
      if (reservation.idempotencyKey) reservationIdByIdempotencyKey.set(reservation.idempotencyKey, reservationId);
      addIndexValue(reservationIdsByCitizenId, reservation.citizenId, reservationId);
      addIndexValue(reservationIdsByHousingStorageId, reservation.housingStorageId, reservationId);
    });
  }

  function replaceReservations(records = []) {
    reservationsById = new Map();
    (Array.isArray(records) ? records : []).map(normalizeHousingPlacementReservation).forEach((reservation) => {
      if (!reservation.reservationId || !reservation.citizenId || !reservation.housingStorageId || !reservation.idempotencyKey) return;
      const existing = reservationsById.get(reservation.reservationId);
      if (!existing || reservation.revision > existing.revision) reservationsById.set(reservation.reservationId, reservation);
    });
    rebuildReservationIndexes();
  }

  function readStoredReservations() {
    try {
      const parsed = JSON.parse(window.localStorage?.getItem(HOUSING_PLACEMENT_RESERVATION_STORAGE_KEY) || "null");
      return Array.isArray(parsed?.reservations) ? parsed.reservations : [];
    } catch (error) {
      console.warn("W&S Housing placement reservations could not be read.", error);
      return [];
    }
  }

  function flushHousingPlacementPersistence() {
    if (persistenceTimer) window.clearTimeout?.(persistenceTimer);
    persistenceTimer = 0;
    if (!persistenceDirty) return true;
    diagnostics.persistenceFlushes += 1;
    try {
      const reservations = serializeReservations();
      window.localStorage?.setItem(HOUSING_PLACEMENT_RESERVATION_STORAGE_KEY, JSON.stringify({
        schemaVersion: HOUSING_BRIDGE_SCHEMA_VERSION,
        reservations
      }));
      persistedReservationSnapshot = clone(reservations);
      persistenceDirty = false;
      return true;
    } catch (error) {
      diagnostics.persistenceFailures += 1;
      diagnostics.persistenceRollbacks += 1;
      console.warn("W&S Housing placement reservations could not be persisted; memory state was restored.", error);
      replaceReservations(persistedReservationSnapshot);
      persistenceDirty = false;
      window.dispatchEvent?.(new CustomEvent("ws:housing-placement-persistence-recovered", {
        detail: { reason: "HOUSING_RESERVATION_PERSISTENCE_FAILED", changedDomains: ["HOUSING"] }
      }));
      return false;
    }
  }

  function scheduleHousingPlacementPersistence() {
    if (persistenceTimer) window.clearTimeout?.(persistenceTimer);
    diagnostics.persistenceSchedules += 1;
    persistenceDirty = true;
    persistenceTimer = window.setTimeout?.(flushHousingPlacementPersistence, HOUSING_PLACEMENT_PERSISTENCE_DELAY_MS) || 0;
  }

  function getChangedFields(previous = null, next = {}) {
    if (!previous) return Object.keys(next).filter((key) => key !== "schemaVersion");
    return Object.keys(next).filter((key) => key !== "schemaVersion" && JSON.stringify(previous[key]) !== JSON.stringify(next[key]));
  }

  function emitHousingPlacementReservationUpdate(reservation = {}, previous = null) {
    const eventId = `housing-placement:${reservation.reservationId}:${reservation.revision}`;
    if (emittedEventIds.has(eventId)) {
      diagnostics.suppressedDuplicateEvents += 1;
      return;
    }
    emittedEventIds.add(eventId);
    diagnostics.emittedEvents += 1;
    window.dispatchEvent?.(new CustomEvent("ws:housing-placement-reservation-updated", {
      detail: {
        eventId,
        reservationId: reservation.reservationId,
        citizenId: reservation.citizenId,
        housingStorageId: reservation.housingStorageId,
        marketOrderId: reservation.marketOrderId,
        instanceId: reservation.instanceId,
        status: reservation.status,
        previousStatus: previous?.status || "",
        revision: reservation.revision,
        previousRevision: previous?.revision || 0,
        changedFields: getChangedFields(previous, reservation),
        changedDomains: ["HOUSING"]
      }
    }));
  }

  function validateExpectedRevision(reservation = {}, options = {}) {
    if (options.expectedRevision == null) return null;
    const expectedRevision = clampInteger(options.expectedRevision, 1, Number.MAX_SAFE_INTEGER, 1);
    if (expectedRevision === reservation.revision) return null;
    diagnostics.revisionConflicts += 1;
    return {
      ok: false,
      reason: "HOUSING_RESERVATION_REVISION_CONFLICT",
      reservationId: reservation.reservationId,
      expectedRevision,
      actualRevision: reservation.revision
    };
  }

  function isTransitionAllowed(previousStatus = "", nextStatus = "") {
    if (previousStatus === nextStatus) return true;
    return HOUSING_RESERVATION_TRANSITIONS[previousStatus]?.has(nextStatus) === true;
  }

  function saveReservation(nextValue = {}, options = {}) {
    const normalizedInput = normalizeHousingPlacementReservation(nextValue);
    if (!normalizedInput.reservationId || !normalizedInput.citizenId || !normalizedInput.housingStorageId || !normalizedInput.idempotencyKey) return null;
    const previous = reservationsById.get(normalizedInput.reservationId) || null;
    if (previous) {
      const conflict = validateExpectedRevision(previous, options);
      if (conflict) return conflict;
      if (!isTransitionAllowed(previous.status, normalizedInput.status)) {
        diagnostics.lifecycleRejections += 1;
        return { ok: false, reason: "HOUSING_RESERVATION_TRANSITION_REJECTED", previousStatus: previous.status, nextStatus: normalizedInput.status };
      }
    }
    const normalized = normalizeHousingPlacementReservation({
      ...normalizedInput,
      revision: previous ? previous.revision + 1 : 1
    });
    const indexedReservationId = reservationIdByIdempotencyKey.get(normalized.idempotencyKey);
    if (indexedReservationId && indexedReservationId !== normalized.reservationId) {
      diagnostics.reservationIdempotencyConflicts += 1;
      return { ok: false, reason: "HOUSING_RESERVATION_IDEMPOTENCY_CONFLICT", reservationId: indexedReservationId };
    }
    reservationsById.set(normalized.reservationId, normalized);
    rebuildReservationIndexes();
    diagnostics.reservationWrites += 1;
    scheduleHousingPlacementPersistence();
    emitHousingPlacementReservationUpdate(normalized, previous);
    return { ok: true, reservation: clone(normalized) };
  }

  function getHousingPlacementReservation(reservationId = "") {
    diagnostics.reservationReads += 1;
    const reservation = reservationsById.get(normalizeId(reservationId)) || null;
    return reservation ? clone(reservation) : null;
  }

  function getHousingPlacementReservations(filters = {}) {
    diagnostics.reservationReads += 1;
    const citizenId = normalizeId(filters.citizenId);
    const housingStorageId = normalizeId(filters.housingStorageId);
    const status = normalizeToken(filters.status);
    let candidateIds = null;
    if (citizenId) candidateIds = new Set(reservationIdsByCitizenId.get(citizenId) || []);
    if (housingStorageId) {
      const storageIds = new Set(reservationIdsByHousingStorageId.get(housingStorageId) || []);
      candidateIds = candidateIds == null ? storageIds : new Set([...candidateIds].filter((id) => storageIds.has(id)));
    }
    const ids = candidateIds == null ? Array.from(reservationsById.keys()) : Array.from(candidateIds);
    return ids.map((id) => reservationsById.get(id)).filter(Boolean)
      .filter((reservation) => !status || reservation.status === status)
      .map(clone);
  }

  function resolveHousingPlacementFootprint(input = {}) {
    const item = input.item && typeof input.item === "object" ? input.item : {};
    const definition = input.definitionId ? window.WS_APP.getEquipmentCatalogItemById?.(input.definitionId) || {} : {};
    const source = { ...definition, ...item };
    let width = Number(input.width ?? source.width ?? source.w);
    let height = Number(input.height ?? source.height ?? source.h);
    const footprint = normalizeId(source.footprint).match(/(\d+)\s*[x×]\s*(\d+)/i);
    if (!Number.isFinite(width) && footprint) width = Number(footprint[1]);
    if (!Number.isFinite(height) && footprint) height = Number(footprint[2]);
    return {
      width: clampInteger(width || 1, 1, 99, 1),
      height: clampInteger(height || 1, 1, 99, 1)
    };
  }

  function addOccupiedCells(cells, placement = {}, width = 1, height = 1) {
    const rotation = Number(placement.rotation) === 90 ? 90 : 0;
    const occupiedWidth = rotation === 90 ? height : width;
    const occupiedHeight = rotation === 90 ? width : height;
    const startX = clampInteger(placement.gridX ?? placement.column ?? 1, 1, 999, 1);
    const startY = clampInteger(placement.gridY ?? placement.row ?? 1, 1, 999, 1);
    for (let y = startY; y < startY + occupiedHeight; y += 1) {
      for (let x = startX; x < startX + occupiedWidth; x += 1) cells.add(`${x}:${y}`);
    }
  }

  function buildHousingStorageOccupancy(citizen = {}, unit = {}, excludeReservationId = "") {
    diagnostics.occupancyReads += 1;
    const cells = new Set();
    const instances = window.WS_APP.getCitizenEquipmentItemInstances?.(citizen.id) || [];
    (Array.isArray(instances) ? instances : []).forEach((instance) => {
      const location = instance?.location || {};
      if (normalizeToken(location.type) !== HOUSING_STORAGE_LOCATION || normalizeId(location.storageUnitId) !== unit.id) return;
      const footprint = resolveHousingPlacementFootprint({ item: instance, definitionId: instance.definitionId });
      addOccupiedCells(cells, location, footprint.width, footprint.height);
    });
    getHousingPlacementReservations({ citizenId: citizen.id, housingStorageId: unit.id }).forEach((reservation) => {
      if (reservation.reservationId === excludeReservationId || !ACTIVE_HOUSING_RESERVATION_STATUSES.has(reservation.status) || !reservation.placement) return;
      addOccupiedCells(cells, reservation.placement, reservation.placement.width, reservation.placement.height);
    });
    return cells;
  }

  function findHousingPlacement(unit = {}, cells = new Set(), footprint = {}) {
    const rotations = footprint.width === footprint.height ? [0] : [0, 90];
    for (const rotation of rotations) {
      const width = rotation === 90 ? footprint.height : footprint.width;
      const height = rotation === 90 ? footprint.width : footprint.height;
      if (width > unit.width || height > unit.height) continue;
      for (let gridY = 1; gridY <= unit.height - height + 1; gridY += 1) {
        for (let gridX = 1; gridX <= unit.width - width + 1; gridX += 1) {
          let free = true;
          for (let y = gridY; y < gridY + height && free; y += 1) {
            for (let x = gridX; x < gridX + width; x += 1) {
              if (cells.has(`${x}:${y}`)) { free = false; break; }
            }
          }
          if (free) return { gridX, gridY, rotation, width: footprint.width, height: footprint.height };
        }
      }
    }
    return null;
  }

  function getHousingStorageOccupancy(input = {}) {
    const citizenId = normalizeId(input.citizenId);
    const housingStorageId = normalizeId(input.housingStorageId || input.storageUnitId);
    const context = getHousingStorage(housingStorageId, citizenId);
    if (!context) return { ok: false, reason: "HOUSING_STORAGE_NOT_FOUND", citizenId, housingStorageId };
    const cells = buildHousingStorageOccupancy(context.citizen, context.unit, normalizeId(input.excludeReservationId));
    return {
      ok: true,
      citizenId,
      housingStorageId,
      occupiedCellCount: cells.size,
      occupiedCells: Array.from(cells).sort(),
      unit: clone(context.unit)
    };
  }

  function validateHousingPlacement(input = {}) {
    diagnostics.placementValidations += 1;
    const citizenId = normalizeId(input.citizenId);
    const housingStorageId = normalizeId(input.housingStorageId || input.storageUnitId);
    if (!citizenId) return { ok: false, reason: "CITIZEN_ID_REQUIRED" };
    if (!housingStorageId) return { ok: false, reason: "HOUSING_DESTINATION_REQUIRED" };
    const context = getHousingStorage(housingStorageId, citizenId);
    if (!context) return { ok: false, reason: "HOUSING_STORAGE_NOT_FOUND" };
    const footprint = resolveHousingPlacementFootprint(input);
    const occupancy = buildHousingStorageOccupancy(context.citizen, context.unit, normalizeId(input.excludeReservationId));
    const placement = findHousingPlacement(context.unit, occupancy, footprint);
    if (!placement) return { ok: false, reason: "HOUSING_STORAGE_FULL", citizenId, housingStorageId, footprint };
    return {
      ok: true,
      reason: "PLACEMENT_AVAILABLE",
      citizenId,
      housingStorageId,
      housingRecordId: context.record.id,
      placement,
      unit: clone(context.unit)
    };
  }

  function isSameReservationIntent(reservation = {}, input = {}) {
    const expected = {
      citizenId: normalizeId(input.citizenId),
      housingStorageId: normalizeId(input.housingStorageId || input.storageUnitId),
      definitionId: normalizeId(input.definitionId),
      marketOrderId: normalizeId(input.marketOrderId)
    };
    return (!expected.citizenId || reservation.citizenId === expected.citizenId)
      && (!expected.housingStorageId || reservation.housingStorageId === expected.housingStorageId)
      && (!expected.definitionId || reservation.definitionId === expected.definitionId)
      && (!expected.marketOrderId || reservation.marketOrderId === expected.marketOrderId);
  }

  function reserveHousingPlacement(input = {}) {
    const idempotencyKey = normalizeId(input.idempotencyKey);
    const reservationId = normalizeId(input.reservationId || makeRuntimeId());
    if (!idempotencyKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
    const indexedId = reservationIdByIdempotencyKey.get(idempotencyKey);
    const replay = reservationsById.get(indexedId || reservationId) || null;
    if (replay) {
      if (replay.idempotencyKey !== idempotencyKey) {
        diagnostics.reservationIdempotencyConflicts += 1;
        return { ok: false, reason: "HOUSING_RESERVATION_IDEMPOTENCY_CONFLICT", reservationId: replay.reservationId };
      }
      if (!isSameReservationIntent(replay, input)) {
        diagnostics.reservationIdempotencyConflicts += 1;
        return { ok: false, reason: "HOUSING_RESERVATION_IDEMPOTENCY_CONFLICT", reservationId: replay.reservationId };
      }
      const conflict = validateExpectedRevision(replay, input);
      if (conflict) return conflict;
      diagnostics.reservationIdempotentReplays += 1;
      return { ok: true, operation: "IDEMPOTENT_REPLAY", reservation: clone(replay) };
    }
    const validation = validateHousingPlacement(input);
    if (!validation.ok) return validation;
    const saved = saveReservation({
      reservationId,
      citizenId: validation.citizenId,
      housingStorageId: validation.housingStorageId,
      definitionId: normalizeId(input.definitionId),
      marketOrderId: normalizeId(input.marketOrderId),
      idempotencyKey,
      status: "RESERVED",
      placement: validation.placement,
      createdAt: getWorldDate(),
      revision: 1
    });
    if (!saved?.ok) return saved || { ok: false, reason: "HOUSING_RESERVATION_WRITE_FAILED" };
    return { ok: true, operation: "RESERVED", reservation: saved.reservation, persistencePending: true };
  }

  function commitHousingPlacement(input = {}) {
    const source = typeof input === "object" && input !== null ? input : { reservationId: input };
    const reservationId = normalizeId(source.reservationId);
    const reservation = reservationsById.get(reservationId) || null;
    if (!reservation) return { ok: false, reason: "HOUSING_RESERVATION_NOT_FOUND" };
    const conflict = validateExpectedRevision(reservation, source);
    if (conflict) return conflict;
    if (reservation.status === "COMMITTED") {
      diagnostics.reservationIdempotentReplays += 1;
      return { ok: true, operation: "IDEMPOTENT_REPLAY", reservation: clone(reservation) };
    }
    if (reservation.status !== "RESERVED") return { ok: false, reason: "HOUSING_RESERVATION_NOT_COMMITTABLE" };
    const instanceId = normalizeId(source.instanceId || reservation.instanceId);
    const instance = window.WS_APP.getItemInstanceById?.(instanceId) || null;
    if (!instance) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND" };
    const location = instance.location || {};
    if (normalizeId(instance.ownerId) !== reservation.citizenId
      || normalizeToken(location.type) !== HOUSING_STORAGE_LOCATION
      || normalizeId(location.storageUnitId) !== reservation.housingStorageId
      || Number(location.gridX || 0) !== Number(reservation.placement?.gridX || 0)
      || Number(location.gridY || 0) !== Number(reservation.placement?.gridY || 0)
      || Number(location.rotation || 0) !== Number(reservation.placement?.rotation || 0)) {
      return { ok: false, reason: "HOUSING_PLACEMENT_INSTANCE_MISMATCH" };
    }
    const saved = saveReservation({
      ...reservation,
      instanceId,
      marketOrderId: normalizeId(source.marketOrderId || reservation.marketOrderId),
      status: "COMMITTED",
      committedAt: getWorldDate()
    }, source);
    if (!saved?.ok) return saved || { ok: false, reason: "HOUSING_RESERVATION_WRITE_FAILED" };
    return { ok: true, operation: "COMMITTED", reservation: saved.reservation, persistencePending: true };
  }

  function releaseHousingPlacementReservation(reservationId = "", reason = "", options = {}) {
    let id = reservationId;
    let releaseReason = reason;
    let commandOptions = options;
    if (reservationId && typeof reservationId === "object") {
      id = reservationId.reservationId;
      releaseReason = reservationId.reason || reservationId.releaseReason;
      commandOptions = reservationId;
    }
    const reservation = reservationsById.get(normalizeId(id)) || null;
    if (!reservation) return { ok: false, reason: "HOUSING_RESERVATION_NOT_FOUND" };
    const conflict = validateExpectedRevision(reservation, commandOptions || {});
    if (conflict) return conflict;
    if (["RELEASED", "ROLLED_BACK"].includes(reservation.status)) {
      diagnostics.reservationIdempotentReplays += 1;
      return { ok: true, operation: "IDEMPOTENT_REPLAY", reservation: clone(reservation) };
    }
    if (reservation.status === "COMMITTED" && !normalizeId(releaseReason)) return { ok: false, reason: "HOUSING_COMMITTED_RESERVATION_ROLLBACK_REASON_REQUIRED" };
    const nextStatus = reservation.status === "COMMITTED" ? "ROLLED_BACK" : "RELEASED";
    const saved = saveReservation({
      ...reservation,
      status: nextStatus,
      releasedAt: getWorldDate(),
      releaseReason: normalizeToken(releaseReason)
    }, commandOptions || {});
    if (!saved?.ok) return saved || { ok: false, reason: "HOUSING_RESERVATION_WRITE_FAILED" };
    return { ok: true, operation: nextStatus, reservation: saved.reservation, persistencePending: true };
  }

  function getHousingBridgeDiagnostics() {
    return clone({
      ...diagnostics,
      reservationCount: reservationsById.size,
      idempotencyIndexSize: reservationIdByIdempotencyKey.size,
      citizenIndexSize: reservationIdsByCitizenId.size,
      storageIndexSize: reservationIdsByHousingStorageId.size,
      persistenceDirty
    });
  }

  function resetHousingBridgeDiagnostics() {
    const fresh = createDiagnostics();
    Object.keys(diagnostics).forEach((key) => { diagnostics[key] = fresh[key]; });
    return getHousingBridgeDiagnostics();
  }

  function validateHousingBridgeReadiness() {
    const errors = [];
    const seenIdempotencyKeys = new Set();
    reservationsById.forEach((reservation, reservationId) => {
      if (!reservationId || reservation.reservationId !== reservationId) errors.push({ code: "HOUSING_RESERVATION_ID_MISMATCH", reservationId });
      if (!reservation.citizenId) errors.push({ code: "HOUSING_RESERVATION_CITIZEN_REQUIRED", reservationId });
      if (!reservation.housingStorageId) errors.push({ code: "HOUSING_RESERVATION_STORAGE_REQUIRED", reservationId });
      if (!reservation.idempotencyKey) errors.push({ code: "HOUSING_RESERVATION_IDEMPOTENCY_REQUIRED", reservationId });
      if (seenIdempotencyKeys.has(reservation.idempotencyKey)) errors.push({ code: "DUPLICATE_HOUSING_RESERVATION_IDEMPOTENCY", idempotencyKey: reservation.idempotencyKey });
      seenIdempotencyKeys.add(reservation.idempotencyKey);
      if (!HOUSING_RESERVATION_STATUSES.has(reservation.status)) errors.push({ code: "HOUSING_RESERVATION_STATUS_INVALID", reservationId, status: reservation.status });
      if (!Number.isInteger(reservation.revision) || reservation.revision < 1) errors.push({ code: "HOUSING_RESERVATION_REVISION_INVALID", reservationId, revision: reservation.revision });
      if (reservationIdByIdempotencyKey.get(reservation.idempotencyKey) !== reservationId) errors.push({ code: "HOUSING_RESERVATION_IDEMPOTENCY_INDEX_MISMATCH", reservationId });
      if (!reservationIdsByCitizenId.get(reservation.citizenId)?.has(reservationId)) errors.push({ code: "HOUSING_RESERVATION_CITIZEN_INDEX_MISMATCH", reservationId });
      if (!reservationIdsByHousingStorageId.get(reservation.housingStorageId)?.has(reservationId)) errors.push({ code: "HOUSING_RESERVATION_STORAGE_INDEX_MISMATCH", reservationId });
    });
    const requiredApis = [
      "getCitizenHousingRecords",
      "getHousingStorage",
      "getHousingStorageOccupancy",
      "validateHousingPlacement",
      "reserveHousingPlacement",
      "getHousingPlacementReservation",
      "getHousingPlacementReservations",
      "commitHousingPlacement",
      "releaseHousingPlacementReservation",
      "flushHousingPlacementPersistence"
    ];
    requiredApis.forEach((api) => {
      if (typeof window.WS_APP[api] !== "function") errors.push({ code: "HOUSING_PUBLIC_API_MISSING", api });
    });
    return {
      ok: errors.length === 0,
      schemaVersion: HOUSING_BRIDGE_SCHEMA_VERSION,
      counts: {
        reservations: reservationsById.size,
        idempotencyKeys: reservationIdByIdempotencyKey.size,
        errors: errors.length
      },
      diagnostics: getHousingBridgeDiagnostics(),
      errors
    };
  }

  const storedReservations = readStoredReservations();
  replaceReservations(storedReservations);
  persistedReservationSnapshot = serializeReservations();

  window.addEventListener?.("pagehide", flushHousingPlacementPersistence);
  document.addEventListener?.("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushHousingPlacementPersistence();
  });

  Object.assign(window.WS_APP, {
    HOUSING_BRIDGE_SCHEMA_VERSION,
    resolveHousingStorageProfile,
    getCitizenHousingRecords,
    getHousingStorage,
    getHousingStorageOccupancy,
    validateHousingPlacement,
    reserveHousingPlacement,
    getHousingPlacementReservation,
    getHousingPlacementReservations,
    commitHousingPlacement,
    releaseHousingPlacementReservation,
    flushHousingPlacementPersistence,
    validateHousingBridgeReadiness,
    getHousingBridgeDiagnostics,
    resetHousingBridgeDiagnostics
  });
})();
