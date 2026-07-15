window.WS_APP = window.WS_APP || {};

(function initHouseholdStore() {
  const HOUSEHOLD_SCHEMA_VERSION = "household_foundation_2_0x";
  const HOUSEHOLD_LAYOUT_SCHEMA_VERSION = "housing_layout_pools_3_1x";
  const HOUSEHOLD_LOCATION_TYPE = "HOUSING_ROOM";
  const HOUSEHOLD_OPERATION_TYPES = new Set([
    "REST",
    "SLEEP",
    "USE_CONSUMABLE",
    "USE_MEDICAL_CONSUMABLE",
    "USE_RECREATIONAL_SUBSTANCE",
    "HYGIENE",
    "FOOD_PREP",
    "MAINTENANCE"
  ]);
  const ROOM_CAPABILITIES = Object.freeze({
    MULTIPURPOSE: ["REST", "SLEEP", "CONSUMABLE_USE"],
    LIVING: ["REST", "CONSUMABLE_USE", "SOCIAL"],
    SLEEPING: ["REST", "SLEEP", "RECOVERY"],
    KITCHEN: ["FOOD_PREP", "CONSUMABLE_USE", "FOOD_STORAGE"],
    HYGIENE: ["HYGIENE"],
    MEDICAL: ["REST", "RECOVERY", "MEDICAL_CONSUMABLE_USE", "SECURE_CONSUMABLE_STORAGE"],
    WORKSHOP: ["MAINTENANCE", "UTILITY"],
    WORKSPACE: ["UTILITY", "WORKSPACE"],
    FLEX: ["UTILITY", "SOCIAL"],
    STORAGE: ["STORAGE"],
    ENTRY: ["ACCESS"],
    SAFE_ROOM: ["REST", "SLEEP", "RECOVERY", "SECURE_CONSUMABLE_STORAGE"]
  });
  const BLOCKED_UNIT_STATUSES = new Set(["ARCHIVED", "CANCELLED", "TERMINATED", "EVICTED", "INACTIVE"]);
  const BLOCKED_RENT_STATUSES = new Set(["CANCELLED", "TERMINATED", "EVICTED", "DEFAULTED", "UNPAID"]);
  const BLOCKED_UTILITY_STATUSES = new Set(["OFFLINE", "FAILED", "DISCONNECTED", "TERMINATED"]);
  const BLOCKED_MAINTENANCE_STATUSES = new Set(["UNSAFE", "CONDEMNED", "FAILED", "LOCKED"]);

  const clone = window.WS_APP.storeUtils?.clone || function cloneFallback(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  };

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function normalizeToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function clampInteger(value, min = 0, max = 999, fallback = min) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function normalizeStringList(value = []) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(normalizeToken).filter(Boolean))];
  }

  function normalizeCellKey(value = "") {
    const match = String(value || "").trim().match(/^(\d+):(\d+)$/);
    if (!match) return "";
    return `${Number(match[1])}:${Number(match[2])}`;
  }

  function normalizeCellKeys(value = []) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map((entry) => {
      if (entry && typeof entry === "object") return normalizeCellKey(`${entry.column ?? entry.gridX}:${entry.row ?? entry.gridY}`);
      return normalizeCellKey(entry);
    }).filter(Boolean))];
  }

  function rectangleCellKeys(bounds = {}) {
    const cells = [];
    const endColumn = Number(bounds.column || 0) + Number(bounds.width || 0) - 1;
    const endRow = Number(bounds.row || 0) + Number(bounds.height || 0) - 1;
    for (let row = Number(bounds.row || 1); row <= endRow; row += 1) {
      for (let column = Number(bounds.column || 1); column <= endColumn; column += 1) cells.push(`${column}:${row}`);
    }
    return cells;
  }

  function createRoom(id, label, type, column, row, width, height, capabilities = []) {
    const roomType = normalizeToken(type || "MULTIPURPOSE");
    return {
      id: normalizeId(id),
      label: normalizeId(label || roomType.replace(/_/g, " ")),
      type: roomType,
      bounds: {
        column: clampInteger(column, 1, 999, 1),
        row: clampInteger(row, 1, 999, 1),
        width: clampInteger(width, 1, 999, 1),
        height: clampInteger(height, 1, 999, 1)
      },
      capabilities: normalizeStringList(capabilities.length ? capabilities : ROOM_CAPABILITIES[roomType] || []),
      restrictions: []
    };
  }

  function getDefaultHouseholdTemplate(record = {}) {
    const type = normalizeToken(record.type || record.storageProfile || "UNIT");
    const recordId = normalizeId(record.id || "housing");
    const assignedLayout = window.WS_APP.instantiateHousingLayout?.({
      ...record,
      housingRecordId: recordId,
      layoutTemplateId: record.layoutTemplateId || record.household?.layoutTemplateId,
      layoutSeed: record.layoutSeed || record.household?.layoutSeed
    }) || null;
    if (assignedLayout?.household) return clone(assignedLayout.household);
    if (assignedLayout?.layoutPolicy === "ASSIGNED_BEDSPACE") {
      return {
        schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
        layoutSchemaVersion: HOUSEHOLD_LAYOUT_SCHEMA_VERSION,
        layoutTemplateId: "",
        layoutSeed: normalizeId(assignedLayout.layoutSeed || ""),
        layoutPolicy: "ASSIGNED_BEDSPACE",
        variantFamily: "BEDSPACE",
        areaM2: null,
        floorPlan: {
          width: 1,
          height: 1,
          cellAreaM2: 0.25,
          activeCells: [],
          inactiveCells: ["1:1"]
        },
        rooms: [],
        fixedFixtureAnchors: [],
        residentIds: [],
        notes: ""
      };
    }
    if (type.includes("WAREHOUSE")) {
      return {
        floorPlan: { width: 18, height: 12 },
        rooms: [
          createRoom(`${recordId}-main`, "Main Floor", "WORKSHOP", 1, 1, 14, 12),
          createRoom(`${recordId}-secure`, "Secure Storage", "STORAGE", 15, 1, 4, 7),
          createRoom(`${recordId}-rest`, "Rest Cell", "MULTIPURPOSE", 15, 8, 4, 5)
        ]
      };
    }
    if (type.includes("CORPORATE") || type.includes("EXECUTIVE") || type.includes("ALPHA")) {
      return {
        floorPlan: { width: 16, height: 12 },
        rooms: [
          createRoom(`${recordId}-living`, "Living Area", "LIVING", 1, 1, 9, 7),
          createRoom(`${recordId}-sleep`, "Sleeping Room", "SLEEPING", 11, 1, 6, 7),
          createRoom(`${recordId}-kitchen`, "Kitchen", "KITCHEN", 1, 9, 6, 4),
          createRoom(`${recordId}-medical`, "Recovery Room", "MEDICAL", 7, 9, 5, 4),
          createRoom(`${recordId}-hygiene`, "Hygiene", "HYGIENE", 13, 9, 4, 4)
        ]
      };
    }
    if (type.includes("TECHNICAL") || type.includes("WORKSHOP")) {
      return {
        floorPlan: { width: 14, height: 10 },
        rooms: [
          createRoom(`${recordId}-living`, "Living Cell", "MULTIPURPOSE", 1, 1, 7, 7),
          createRoom(`${recordId}-workshop`, "Workshop", "WORKSHOP", 9, 1, 6, 7),
          createRoom(`${recordId}-hygiene`, "Hygiene", "HYGIENE", 1, 8, 4, 3),
          createRoom(`${recordId}-storage`, "Utility Storage", "STORAGE", 5, 8, 5, 3),
          createRoom(`${recordId}-entry`, "Entry", "ENTRY", 10, 8, 5, 3)
        ]
      };
    }
    if (type.includes("SECURED") || type.includes("SAFE")) {
      return {
        floorPlan: { width: 12, height: 10 },
        rooms: [
          createRoom(`${recordId}-living`, "Living Area", "LIVING", 1, 1, 7, 6),
          createRoom(`${recordId}-safe`, "Safe Room", "SAFE_ROOM", 9, 1, 4, 6),
          createRoom(`${recordId}-kitchen`, "Kitchen", "KITCHEN", 1, 8, 4, 3),
          createRoom(`${recordId}-hygiene`, "Hygiene", "HYGIENE", 5, 8, 4, 3),
          createRoom(`${recordId}-entry`, "Entry", "ENTRY", 9, 8, 4, 3)
        ]
      };
    }
    if (type.includes("STANDARD")) {
      return {
        floorPlan: { width: 12, height: 8 },
        rooms: [
          createRoom(`${recordId}-living`, "Living Area", "LIVING", 1, 1, 7, 5),
          createRoom(`${recordId}-sleep`, "Sleeping Room", "SLEEPING", 9, 1, 4, 5),
          createRoom(`${recordId}-kitchen`, "Kitchen", "KITCHEN", 1, 6, 4, 3),
          createRoom(`${recordId}-hygiene`, "Hygiene", "HYGIENE", 5, 6, 4, 3),
          createRoom(`${recordId}-entry`, "Entry", "ENTRY", 9, 6, 4, 3)
        ]
      };
    }
    if (type.includes("MICRO")) {
      return {
        floorPlan: { width: 8, height: 6 },
        rooms: [
          createRoom(`${recordId}-main`, "Main Cell", "MULTIPURPOSE", 1, 1, 6, 6),
          createRoom(`${recordId}-hygiene`, "Hygiene", "HYGIENE", 7, 1, 2, 3),
          createRoom(`${recordId}-utility`, "Utility", "STORAGE", 7, 4, 2, 3)
        ]
      };
    }
    return {
      floorPlan: { width: 6, height: 6 },
      rooms: [createRoom(`${recordId}-main`, "Habitat Cell", "MULTIPURPOSE", 1, 1, 6, 6)]
    };
  }

  function normalizeHouseholdRoom(room = {}, index = 0, record = {}, floorPlan = {}) {
    const source = room && typeof room === "object" && !Array.isArray(room) ? room : {};
    const boundsSource = source.bounds && typeof source.bounds === "object" && !Array.isArray(source.bounds) ? source.bounds : source;
    const type = normalizeToken(source.type || source.roomType || "MULTIPURPOSE");
    const column = clampInteger(boundsSource.column ?? boundsSource.gridX ?? boundsSource.x ?? 1, 1, floorPlan.width || 999, 1);
    const row = clampInteger(boundsSource.row ?? boundsSource.gridY ?? boundsSource.y ?? 1, 1, floorPlan.height || 999, 1);
    const width = clampInteger(boundsSource.width ?? boundsSource.w ?? 1, 1, Math.max(1, (floorPlan.width || 999) - column + 1), 1);
    const height = clampInteger(boundsSource.height ?? boundsSource.h ?? 1, 1, Math.max(1, (floorPlan.height || 999) - row + 1), 1);
    const bounds = { column, row, width, height };
    const activeCells = normalizeCellKeys(source.activeCells?.length ? source.activeCells : rectangleCellKeys(bounds));
    return {
      id: normalizeId(source.id || source.roomId || `${record.id || "housing"}-room-${index + 1}`),
      layoutRoomKey: normalizeId(source.layoutRoomKey || source.key || ""),
      label: normalizeId(source.label || source.name || source.title || type.replace(/_/g, " ")),
      type,
      bounds,
      activeCells,
      capabilities: normalizeStringList(source.capabilities?.length ? source.capabilities : ROOM_CAPABILITIES[type] || []),
      restrictions: normalizeStringList(source.restrictions || []),
      notes: normalizeId(source.notes || source.note || "")
    };
  }

  function normalizeHouseholdProfile(value = {}, record = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const template = getDefaultHouseholdTemplate(record);
    const floorSource = source.floorPlan && typeof source.floorPlan === "object" && !Array.isArray(source.floorPlan) ? source.floorPlan : source;
    const floorPlan = {
      width: clampInteger(floorSource.width ?? floorSource.columns ?? template.floorPlan.width, 1, 64, template.floorPlan.width),
      height: clampInteger(floorSource.height ?? floorSource.rows ?? template.floorPlan.height, 1, 64, template.floorPlan.height),
      cellScale: normalizeId(floorSource.cellScale || source.cellScale || "ABSTRACT") || "ABSTRACT"
    };
    const rawRooms = Array.isArray(source.rooms) && source.rooms.length ? source.rooms : template.rooms;
    const rooms = rawRooms.map((room, index) => normalizeHouseholdRoom(room, index, record, floorPlan));
    const roomCellKeys = [...new Set(rooms.flatMap((room) => room.activeCells || []))];
    const activeCells = normalizeCellKeys(floorSource.activeCells?.length ? floorSource.activeCells : source.activeCells?.length ? source.activeCells : roomCellKeys);
    const activeCellSet = new Set(activeCells);
    const inactiveCells = normalizeCellKeys(floorSource.inactiveCells?.length ? floorSource.inactiveCells : (() => {
      const cells = [];
      for (let row = 1; row <= floorPlan.height; row += 1) {
        for (let column = 1; column <= floorPlan.width; column += 1) {
          const key = `${column}:${row}`;
          if (!activeCellSet.has(key)) cells.push(key);
        }
      }
      return cells;
    })());
    return {
      schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
      layoutSchemaVersion: normalizeId(source.layoutSchemaVersion || template.layoutSchemaVersion || (activeCells.length ? HOUSEHOLD_LAYOUT_SCHEMA_VERSION : "")),
      layoutTemplateId: normalizeId(source.layoutTemplateId || template.layoutTemplateId || record.layoutTemplateId || ""),
      layoutSeed: normalizeId(source.layoutSeed || template.layoutSeed || record.layoutSeed || ""),
      layoutPolicy: normalizeToken(source.layoutPolicy || template.layoutPolicy || record.layoutPolicy || ""),
      variantFamily: normalizeToken(source.variantFamily || template.variantFamily || ""),
      areaM2: source.areaM2 ?? template.areaM2 ?? record.areaM2 ?? (activeCells.length * 0.25),
      floorPlan: {
        ...floorPlan,
        cellAreaM2: Number(floorSource.cellAreaM2 || template.floorPlan?.cellAreaM2 || 0.25),
        activeCells,
        inactiveCells
      },
      rooms,
      fixedFixtureAnchors: Array.isArray(source.fixedFixtureAnchors) ? clone(source.fixedFixtureAnchors) : Array.isArray(template.fixedFixtureAnchors) ? clone(template.fixedFixtureAnchors) : [],
      residentIds: [...new Set((Array.isArray(source.residentIds) ? source.residentIds : []).map(normalizeId).filter(Boolean))],
      notes: normalizeId(source.notes || "")
    };
  }

  function validateHouseholdProfile(value = {}, record = {}) {
    const household = value?.schemaVersion === HOUSEHOLD_SCHEMA_VERSION && value?.floorPlan && Array.isArray(value?.rooms)
      ? value
      : normalizeHouseholdProfile(value, record);
    const errors = [];
    const roomIds = new Set();
    const occupiedCells = new Map();
    const floorCells = new Set(normalizeCellKeys(household.floorPlan?.activeCells || []));
    household.rooms.forEach((room, index) => {
      if (!room.id) errors.push({ code: "HOUSEHOLD_ROOM_ID_REQUIRED", index });
      else if (roomIds.has(room.id)) errors.push({ code: "HOUSEHOLD_ROOM_ID_DUPLICATE", roomId: room.id });
      else roomIds.add(room.id);
      const bounds = room.bounds || {};
      const endColumn = Number(bounds.column || 0) + Number(bounds.width || 0) - 1;
      const endRow = Number(bounds.row || 0) + Number(bounds.height || 0) - 1;
      if (Number(bounds.column || 0) < 1 || Number(bounds.row || 0) < 1 || endColumn > household.floorPlan.width || endRow > household.floorPlan.height) {
        errors.push({ code: "HOUSEHOLD_ROOM_OUTSIDE_FLOOR_PLAN", roomId: room.id, bounds: clone(bounds) });
        return;
      }
      const roomCells = normalizeCellKeys(room.activeCells?.length ? room.activeCells : rectangleCellKeys(bounds));
      roomCells.forEach((cell) => {
        if (floorCells.size && !floorCells.has(cell)) errors.push({ code: "HOUSEHOLD_ROOM_CELL_OUTSIDE_ACTIVE_MASK", roomId: room.id, cell });
        const conflict = occupiedCells.get(cell);
        if (conflict && conflict !== room.id) errors.push({ code: "HOUSEHOLD_ROOM_OVERLAP", roomId: room.id, conflictRoomId: conflict, cell });
        else occupiedCells.set(cell, room.id);
      });
    });
    floorCells.forEach((cell) => {
      if (!occupiedCells.has(cell)) errors.push({ code: "HOUSEHOLD_ACTIVE_CELL_UNASSIGNED", cell });
    });
    return { valid: errors.length === 0, schemaVersion: HOUSEHOLD_SCHEMA_VERSION, errors };
  }

  function getHousingRecord(citizenId = "", housingRecordId = "") {
    const records = window.WS_APP.getCitizenHousingRecords?.(citizenId) || [];
    const id = normalizeId(housingRecordId);
    return (id ? records.find((record) => normalizeId(record.id) === id) : null) || records[0] || null;
  }

  function getHousingHousehold(citizenId = "", housingRecordId = "") {
    const record = getHousingRecord(citizenId, housingRecordId);
    if (!record) return null;
    const household = normalizeHouseholdProfile(record.household || {}, record);
    const validation = validateHouseholdProfile(household, record);
    return { citizenId: normalizeId(citizenId), housingRecordId: record.id, record: clone(record), ...clone(household), validation };
  }

  function getHouseholdRooms(citizenId = "", housingRecordId = "") {
    return getHousingHousehold(citizenId, housingRecordId)?.rooms || [];
  }

  function getHouseholdRoom(citizenId = "", housingRecordId = "", roomId = "") {
    const id = normalizeId(roomId);
    return getHouseholdRooms(citizenId, housingRecordId).find((room) => room.id === id) || null;
  }

  function getHouseholdPlacedItems(citizenId = "", housingRecordId = "", roomId = "") {
    const ownerId = normalizeId(citizenId);
    const housingId = normalizeId(housingRecordId);
    const requestedRoomId = normalizeId(roomId);
    const items = window.WS_APP.getCitizenEquipmentItemInstances?.(ownerId) || [];
    return items.filter((instance) => {
      const location = instance?.location || {};
      return normalizeToken(location.type) === HOUSEHOLD_LOCATION_TYPE
        && normalizeId(location.housingRecordId) === housingId
        && (!requestedRoomId || normalizeId(location.roomId) === requestedRoomId);
    }).map(clone);
  }

  function getHouseholdFurnishingItems(citizenId = "", housingRecordId = "") {
    const ownerId = normalizeId(citizenId);
    const record = getHousingRecord(ownerId, housingRecordId);
    if (!record) return [];
    const storageUnitIds = new Set((Array.isArray(record.storageUnits) ? record.storageUnits : []).map((unit) => normalizeId(unit.id)).filter(Boolean));
    const items = window.WS_APP.getCitizenEquipmentItemInstances?.(ownerId) || [];
    return items.reduce((rows, instance) => {
      const profile = getHouseholdItemProfile(instance);
      const lifecycle = window.WS_APP.getHousingFurnishingLifecycleProjection?.(instance, record) || null;
      if (!profile.placeable && !lifecycle) return rows;
      const location = instance.location || {};
      const locationType = normalizeToken(location.type);
      const storedHere = locationType === "HOUSING_STORAGE" && storageUnitIds.has(normalizeId(location.storageUnitId));
      const placedHere = locationType === HOUSEHOLD_LOCATION_TYPE && normalizeId(location.housingRecordId) === record.id;
      if (!storedHere && !placedHere) return rows;
      rows.push({
        instance: clone(instance),
        profile,
        lifecycle,
        scope: placedHere ? "PLACED" : "STORAGE",
        housingRecordId: record.id,
        roomId: placedHere ? normalizeId(location.roomId) : "",
        storageUnitId: storedHere ? normalizeId(location.storageUnitId) : ""
      });
      return rows;
    }, []);
  }

  function parseFootprint(value = "") {
    const match = String(value || "").trim().match(/^(\d+)\s*[x×]\s*(\d+)$/i);
    return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
  }

  function getHouseholdItemProfile(instance = {}) {
    const definition = window.WS_APP.getEquipmentCatalogItemById?.(instance.definitionId) || {};
    const instanceData = instance.instanceData && typeof instance.instanceData === "object" ? instance.instanceData : {};
    const profile = definition.householdProfile && typeof definition.householdProfile === "object"
      ? definition.householdProfile
      : instanceData.householdProfile && typeof instanceData.householdProfile === "object"
        ? instanceData.householdProfile
        : {};
    const tags = normalizeStringList([...(definition.tags || []), ...(instanceData.tags || []), ...(instance.tags || [])]);
    const itemType = normalizeToken(definition.itemType || instanceData.itemType || instance.itemType || "");
    const category = normalizeToken(definition.category || instanceData.category || instance.category || "");
    const footprint = parseFootprint(profile.footprint || definition.footprint || instanceData.footprint || instance.footprint) || {
      width: clampInteger(profile.width ?? definition.width ?? instanceData.width ?? 1, 1, 32, 1),
      height: clampInteger(profile.height ?? definition.height ?? instanceData.height ?? 1, 1, 32, 1)
    };
    const placeable = profile.placeable === true
      || ["FURNITURE", "APPLIANCE", "FIXTURE", "HOUSEHOLD_FURNISHING"].includes(itemType)
      || tags.some((tag) => ["FURNITURE", "APPLIANCE", "FIXTURE", "HOUSEHOLD_PLACEABLE"].includes(tag));
    const lifecycle = window.WS_APP.getHousingFurnishingLifecycleProjection?.(instance) || null;
    return {
      definitionId: normalizeId(instance.definitionId),
      placeable: lifecycle ? lifecycle.movable === true : placeable,
      movable: lifecycle ? lifecycle.movable === true : placeable,
      nonBlocking: lifecycle?.nonBlocking === true,
      itemType,
      category,
      tags,
      footprint,
      capabilities: lifecycle ? normalizeStringList(lifecycle.capabilities || []) : normalizeStringList(profile.capabilities || []),
      ownershipType: lifecycle?.ownershipType || "",
      grade: lifecycle?.grade || "",
      condition: lifecycle?.condition ?? null,
      conditionState: lifecycle?.conditionState || "",
      allowedRoomTypes: normalizeStringList(profile.allowedRoomTypes || []),
      blockedRoomTypes: normalizeStringList(profile.blockedRoomTypes || [])
    };
  }

  function getHouseholdItemFootprint(instance = {}, rotation = 0) {
    const profile = getHouseholdItemProfile(instance);
    const normalizedRotation = Number(rotation) === 90 ? 90 : 0;
    return normalizedRotation === 90
      ? { width: profile.footprint.height, height: profile.footprint.width, rotation: 90 }
      : { width: profile.footprint.width, height: profile.footprint.height, rotation: 0 };
  }

  function isCellInsideRoom(room = {}, column = 1, row = 1) {
    const activeCells = normalizeCellKeys(room.activeCells || []);
    if (activeCells.length) return new Set(activeCells).has(`${Number(column)}:${Number(row)}`);
    const bounds = room.bounds || {};
    return column >= bounds.column
      && row >= bounds.row
      && column <= bounds.column + bounds.width - 1
      && row <= bounds.row + bounds.height - 1;
  }

  function getHouseholdRoomOccupancy(input = {}) {
    const citizenId = normalizeId(input.citizenId);
    const housingRecordId = normalizeId(input.housingRecordId);
    const roomId = normalizeId(input.roomId);
    const room = getHouseholdRoom(citizenId, housingRecordId, roomId);
    if (!room) return { ok: false, reason: "HOUSEHOLD_ROOM_NOT_FOUND", citizenId, housingRecordId, roomId };
    const excludeInstanceIds = new Set([normalizeId(input.excludeInstanceId), ...(Array.isArray(input.excludeInstanceIds) ? input.excludeInstanceIds.map(normalizeId) : [])].filter(Boolean));
    const cells = new Map();
    const entries = [];
    getHouseholdPlacedItems(citizenId, housingRecordId, roomId).forEach((instance) => {
      if (excludeInstanceIds.has(instance.instanceId)) return;
      const profile = getHouseholdItemProfile(instance);
      if (profile.nonBlocking) return;
      const location = instance.location || {};
      const footprint = getHouseholdItemFootprint(instance, location.rotation);
      const placement = {
        column: clampInteger(location.gridX, 1, 999, 1),
        row: clampInteger(location.gridY, 1, 999, 1),
        rotation: Number(location.rotation) === 90 ? 90 : 0
      };
      entries.push({ instance: clone(instance), placement, footprint });
      for (let row = placement.row; row < placement.row + footprint.height; row += 1) {
        for (let column = placement.column; column < placement.column + footprint.width; column += 1) {
          cells.set(`${column}:${row}`, instance.instanceId);
        }
      }
    });
    return {
      ok: true,
      citizenId,
      housingRecordId,
      roomId,
      room: clone(room),
      occupiedCells: [...cells.entries()].map(([cell, instanceId]) => ({ cell, instanceId })),
      entries
    };
  }

  function validateHouseholdPlacement(input = {}) {
    const citizenId = normalizeId(input.citizenId);
    const housingRecordId = normalizeId(input.housingRecordId);
    const roomId = normalizeId(input.roomId);
    const instanceId = normalizeId(input.instanceId || input.itemInstanceId);
    if (!citizenId) return { ok: false, reason: "CITIZEN_ID_REQUIRED" };
    if (!housingRecordId) return { ok: false, reason: "HOUSING_RECORD_ID_REQUIRED" };
    if (!roomId) return { ok: false, reason: "HOUSEHOLD_ROOM_ID_REQUIRED" };
    if (!instanceId) return { ok: false, reason: "ITEM_INSTANCE_ID_REQUIRED" };
    const record = getHousingRecord(citizenId, housingRecordId);
    if (!record) return { ok: false, reason: "HOUSING_RECORD_NOT_FOUND" };
    const room = getHouseholdRoom(citizenId, housingRecordId, roomId);
    if (!room) return { ok: false, reason: "HOUSEHOLD_ROOM_NOT_FOUND" };
    const instance = window.WS_APP.getItemInstanceById?.(instanceId) || null;
    if (!instance) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND" };
    if (normalizeId(instance.ownerId) !== citizenId) return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH" };
    const profile = getHouseholdItemProfile(instance);
    if (!profile.placeable) return { ok: false, reason: "ITEM_NOT_HOUSEHOLD_PLACEABLE", instanceId };
    if (profile.allowedRoomTypes.length && !profile.allowedRoomTypes.includes(room.type)) return { ok: false, reason: "HOUSEHOLD_ROOM_TYPE_NOT_ALLOWED", roomType: room.type };
    if (profile.blockedRoomTypes.includes(room.type)) return { ok: false, reason: "HOUSEHOLD_ROOM_TYPE_BLOCKED", roomType: room.type };
    const footprint = getHouseholdItemFootprint(instance, input.rotation);
    const placement = {
      column: clampInteger(input.gridX ?? input.column, 1, 999, 1),
      row: clampInteger(input.gridY ?? input.row, 1, 999, 1),
      rotation: footprint.rotation
    };
    const endColumn = placement.column + footprint.width - 1;
    const endRow = placement.row + footprint.height - 1;
    for (let row = placement.row; row <= endRow; row += 1) {
      for (let column = placement.column; column <= endColumn; column += 1) {
        if (!isCellInsideRoom(room, column, row)) {
          return { ok: false, reason: "HOUSEHOLD_PLACEMENT_OUTSIDE_ROOM", room: clone(room), placement, footprint, blockedCell: `${column}:${row}` };
        }
      }
    }
    const occupancy = getHouseholdRoomOccupancy({ citizenId, housingRecordId, roomId, excludeInstanceId: instanceId, excludeInstanceIds: input.excludeInstanceIds });
    const occupied = new Map((occupancy.occupiedCells || []).map((entry) => [entry.cell, entry.instanceId]));
    const collisions = new Set();
    for (let row = placement.row; row <= endRow; row += 1) {
      for (let column = placement.column; column <= endColumn; column += 1) {
        const occupant = occupied.get(`${column}:${row}`);
        if (occupant) collisions.add(occupant);
      }
    }
    if (collisions.size) return { ok: false, reason: "HOUSEHOLD_PLACEMENT_COLLISION", collisions: [...collisions], placement, footprint };
    return { ok: true, reason: "HOUSEHOLD_PLACEMENT_AVAILABLE", citizenId, housingRecordId, roomId, record: clone(record), room: clone(room), instance: clone(instance), profile, placement, footprint };
  }

  function emitHouseholdLayoutUpdated(result = {}, detail = {}) {
    const transaction = result.transaction || {};
    window.dispatchEvent?.(new CustomEvent("ws:household-layout-updated", {
      detail: {
        eventId: `household-layout:${transaction.transactionId || detail.idempotencyKey || "unknown"}`,
        citizenId: detail.citizenId,
        housingRecordId: detail.housingRecordId,
        roomId: detail.roomId || "",
        instanceId: detail.instanceId,
        operationType: detail.operationType,
        transactionId: transaction.transactionId || "",
        changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "HOUSING", "HOUSEHOLD"]
      }
    }));
  }

  function placeHouseholdItem(input = {}) {
    if (typeof window.WS_APP.commitItemInstanceTransaction !== "function") return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_API_REQUIRED" };
    const validation = validateHouseholdPlacement(input);
    if (!validation.ok) return validation;
    const currentLocationType = normalizeToken(validation.instance.location?.type);
    const allowedSourceLocationTypes = normalizeStringList(input.allowedSourceLocationTypes?.length
      ? input.allowedSourceLocationTypes
      : ["HOUSING_STORAGE", "CONTAINER_GRID", "UNPLACED", HOUSEHOLD_LOCATION_TYPE]);
    if (!allowedSourceLocationTypes.includes(currentLocationType)) {
      return { ok: false, reason: "HOUSEHOLD_ITEM_SOURCE_LOCATION_REJECTED", actualLocationType: currentLocationType, allowedSourceLocationTypes };
    }
    const idempotencyKey = normalizeId(input.idempotencyKey);
    if (!idempotencyKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
    const toLocation = {
      type: HOUSEHOLD_LOCATION_TYPE,
      housingRecordId: validation.housingRecordId,
      roomId: validation.roomId,
      gridX: validation.placement.column,
      gridY: validation.placement.row,
      rotation: validation.placement.rotation
    };
    const operationType = currentLocationType === HOUSEHOLD_LOCATION_TYPE ? "MOVE_FURNITURE" : "PLACE_FURNITURE";
    const result = window.WS_APP.commitItemInstanceTransaction({
      idempotencyKey,
      sourceDomain: "HOUSEHOLD",
      sourceRefId: validation.housingRecordId,
      citizenId: validation.citizenId,
      expectedStoreRevision: input.expectedStoreRevision,
      changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "HOUSING", "HOUSEHOLD"],
      metadata: { operationType, roomId: validation.roomId },
      operations: [{
        type: "MOVE",
        instanceId: validation.instance.instanceId,
        expected: { ownerId: validation.citizenId, locationTypes: allowedSourceLocationTypes },
        toLocation,
        lifecycleState: "UNPACKAGED"
      }]
    });
    if (result?.ok && result.operation === "COMMITTED") emitHouseholdLayoutUpdated(result, { idempotencyKey, citizenId: validation.citizenId, housingRecordId: validation.housingRecordId, roomId: validation.roomId, instanceId: validation.instance.instanceId, operationType });
    return { ...result, placement: validation.placement, room: validation.room };
  }

  function returnHouseholdItemToStorage(input = {}) {
    if (typeof window.WS_APP.commitItemInstanceTransaction !== "function") return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_API_REQUIRED" };
    const citizenId = normalizeId(input.citizenId);
    const instanceId = normalizeId(input.instanceId || input.itemInstanceId);
    const storageUnitId = normalizeId(input.storageUnitId || input.housingStorageId);
    const idempotencyKey = normalizeId(input.idempotencyKey);
    if (!citizenId) return { ok: false, reason: "CITIZEN_ID_REQUIRED" };
    if (!instanceId) return { ok: false, reason: "ITEM_INSTANCE_ID_REQUIRED" };
    if (!storageUnitId) return { ok: false, reason: "HOUSING_STORAGE_UNIT_REQUIRED" };
    if (!idempotencyKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
    const instance = window.WS_APP.getItemInstanceById?.(instanceId) || null;
    if (!instance) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND" };
    if (normalizeId(instance.ownerId) !== citizenId) return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH" };
    if (normalizeToken(instance.location?.type) !== HOUSEHOLD_LOCATION_TYPE) return { ok: false, reason: "ITEM_INSTANCE_NOT_IN_HOUSEHOLD" };
    const storageValidation = window.WS_APP.validateHousingPlacement?.({ citizenId, housingStorageId: storageUnitId, definitionId: instance.definitionId });
    if (!storageValidation?.ok) return storageValidation || { ok: false, reason: "HOUSING_PLACEMENT_API_REQUIRED" };
    const toLocation = {
      type: "HOUSING_STORAGE",
      storageUnitId,
      gridX: storageValidation.placement.column,
      gridY: storageValidation.placement.row,
      rotation: storageValidation.placement.rotation || 0
    };
    const result = window.WS_APP.commitItemInstanceTransaction({
      idempotencyKey,
      sourceDomain: "HOUSEHOLD",
      sourceRefId: normalizeId(instance.location.housingRecordId),
      citizenId,
      expectedStoreRevision: input.expectedStoreRevision,
      changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "HOUSING", "HOUSEHOLD"],
      metadata: { operationType: "RETURN_FURNITURE_TO_STORAGE", storageUnitId },
      operations: [{
        type: "MOVE",
        instanceId,
        expected: { ownerId: citizenId, locationType: HOUSEHOLD_LOCATION_TYPE },
        toLocation,
        lifecycleState: "UNPACKAGED"
      }]
    });
    if (result?.ok && result.operation === "COMMITTED") emitHouseholdLayoutUpdated(result, { idempotencyKey, citizenId, housingRecordId: normalizeId(instance.location.housingRecordId), roomId: normalizeId(instance.location.roomId), instanceId, operationType: "RETURN_FURNITURE_TO_STORAGE" });
    return { ...result, placement: storageValidation.placement, storageUnitId };
  }

  function getHouseholdCapabilities(citizenId = "", housingRecordId = "") {
    const household = getHousingHousehold(citizenId, housingRecordId);
    if (!household) return [];
    const capabilities = new Set(household.rooms.flatMap((room) => room.capabilities || []));
    getHouseholdPlacedItems(citizenId, household.housingRecordId).forEach((instance) => {
      getHouseholdItemProfile(instance).capabilities.forEach((capability) => capabilities.add(capability));
    });
    return [...capabilities].sort();
  }

  function getHouseholdSafeSpaceProfile(citizenId = "", housingRecordId = "") {
    const household = getHousingHousehold(citizenId, housingRecordId);
    if (!household) return { ready: false, reason: "HOUSING_RECORD_NOT_FOUND" };
    const record = household.record || {};
    const status = normalizeToken(record.status || "UNKNOWN");
    const rentStatus = normalizeToken(record.rentStatus || "UNKNOWN");
    const utilityStatus = normalizeToken(record.utilityStatus || "UNKNOWN");
    const maintenanceStatus = normalizeToken(record.maintenanceStatus || "NOMINAL");
    const accessReady = !BLOCKED_UNIT_STATUSES.has(status) && !BLOCKED_RENT_STATUSES.has(rentStatus);
    const utilitiesReady = !BLOCKED_UTILITY_STATUSES.has(utilityStatus);
    const maintenanceReady = !BLOCKED_MAINTENANCE_STATUSES.has(maintenanceStatus);
    const securityLevel = clampInteger(record.securityLevel, 0, 99, 0);
    const privacyLevel = clampInteger(record.privacyLevel, 0, 99, 0);
    const comfortLevel = clampInteger(record.comfortLevel, 0, 99, 0);
    const capabilities = getHouseholdCapabilities(citizenId, household.housingRecordId);
    const layoutReady = household.validation?.valid === true;
    const safeSpaceReady = layoutReady && accessReady && utilitiesReady && maintenanceReady && securityLevel > 0 && privacyLevel > 0;
    return {
      ready: safeSpaceReady,
      schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
      citizenId: normalizeId(citizenId),
      housingRecordId: household.housingRecordId,
      layoutReady,
      accessReady,
      utilitiesReady,
      maintenanceReady,
      securityLevel,
      privacyLevel,
      comfortLevel,
      capabilities,
      recoveryReady: safeSpaceReady && capabilities.some((capability) => ["REST", "SLEEP", "RECOVERY"].includes(capability)),
      consumableUseReady: safeSpaceReady && capabilities.some((capability) => ["CONSUMABLE_USE", "MEDICAL_CONSUMABLE_USE"].includes(capability)),
      executionOwner: "HOUSEHOLD_RUNTIME_PENDING"
    };
  }

  function resolveHouseholdOperationReadiness(input = {}) {
    const operationType = normalizeToken(input.operationType);
    if (!HOUSEHOLD_OPERATION_TYPES.has(operationType)) return { ok: false, reason: "HOUSEHOLD_OPERATION_UNSUPPORTED", operationType };
    const safeSpace = getHouseholdSafeSpaceProfile(input.citizenId, input.housingRecordId);
    if (!safeSpace.ready) return { ok: false, reason: "HOUSEHOLD_SAFE_SPACE_NOT_READY", operationType, safeSpace };
    const requiredCapability = {
      REST: "REST",
      SLEEP: "SLEEP",
      USE_CONSUMABLE: "CONSUMABLE_USE",
      USE_MEDICAL_CONSUMABLE: "MEDICAL_CONSUMABLE_USE",
      USE_RECREATIONAL_SUBSTANCE: "CONSUMABLE_USE",
      HYGIENE: "HYGIENE",
      FOOD_PREP: "FOOD_PREP",
      MAINTENANCE: "MAINTENANCE"
    }[operationType];
    if (requiredCapability && !safeSpace.capabilities.includes(requiredCapability)) {
      return { ok: false, reason: "HOUSEHOLD_CAPABILITY_REQUIRED", operationType, requiredCapability, safeSpace };
    }
    return {
      ok: true,
      reason: "HOUSEHOLD_OPERATION_READY",
      operationType,
      requiredCapability,
      safeSpace,
      commitSupported: false,
      executionOwner: operationType.startsWith("USE_") ? "ITEM_TYPE_OPERATIONS" : "HOUSEHOLD_RECOVERY_RUNTIME_PENDING"
    };
  }

  function validateHouseholdReadiness() {
    const requiredApis = [
      "getCitizenHousingRecords",
      "getCitizenEquipmentItemInstances",
      "getItemInstanceById",
      "commitItemInstanceTransaction",
      "validateHousingPlacement"
    ];
    const missingApis = requiredApis.filter((api) => typeof window.WS_APP[api] !== "function");
    return {
      ready: missingApis.length === 0,
      schemaVersion: HOUSEHOLD_SCHEMA_VERSION,
      canonicalItemLocation: HOUSEHOLD_LOCATION_TYPE,
      persistenceOwner: "ITEM_INSTANCE_AND_CITIZEN_HOUSING",
      missingApis
    };
  }

  Object.assign(window.WS_APP, {
    HOUSEHOLD_SCHEMA_VERSION,
    HOUSEHOLD_LAYOUT_SCHEMA_VERSION,
    HOUSEHOLD_LOCATION_TYPE,
    normalizeHouseholdProfile,
    normalizeHouseholdRoom,
    validateHouseholdProfile,
    getHousingHousehold,
    getHouseholdRooms,
    getHouseholdRoom,
    getHouseholdPlacedItems,
    getHouseholdFurnishingItems,
    getHouseholdItemProfile,
    getHouseholdItemFootprint,
    getHouseholdRoomOccupancy,
    validateHouseholdPlacement,
    placeHouseholdItem,
    returnHouseholdItemToStorage,
    getHouseholdCapabilities,
    getHouseholdSafeSpaceProfile,
    resolveHouseholdOperationReadiness,
    validateHouseholdReadiness
  });
})();
