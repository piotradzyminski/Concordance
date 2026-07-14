window.WS_APP = window.WS_APP || {};
window.WS_APP.state = window.WS_APP.state || {};

(function initItemInstanceStore() {
  const STORAGE_KEY = "ws_app_item_instances_v1";
  const SCHEMA_VERSION = 3;
  const PLAYER_LABEL_MAX_LENGTH = 64;
  const SEED_VERSION = "equipment-dual-test-loadouts-1.4.0x";
  const ITEM_STORE_PERSIST_DEBOUNCE_MS = 700;
  const ITEM_INSTANCE_VIEW_WARMUP_BATCH_SIZE = 1;
  const ITEM_INSTANCE_VIEW_WARMUP_TIMEOUT_MS = 1500;
  const LOCATION_TYPES = new Set([
    "EQUIPPED",
    "CONTAINER_GRID",
    "HOUSING_STORAGE",
    "HOUSING_ROOM",
    "BODY",
    "INSTALLED_IN_ITEM",
    "SERVICE",
    "VENDOR",
    "UNPLACED",
    "DESTROYED"
  ]);
  const EQUIPMENT_LOCATION_TYPES = new Set([
    "EQUIPPED",
    "CONTAINER_GRID",
    "HOUSING_STORAGE",
    "HOUSING_ROOM",
    "UNPLACED"
  ]);

  const DEFINITION_OWNED_VIEW_KEYS = [
    "name", "title", "summary", "description", "publicDescription",
    "primarySlot", "targetSlot", "slot", "slots", "compatibleSlots",
    "slotLevel", "descendantPolicy", "compatibilityGroup", "compatibleWith",
    "requiredComponentStandards", "itemType", "itemTypeLabel", "itemTypeProfile", "capabilities"
  ];

  const LIFECYCLE_STATES = new Set([
    "PACKAGED",
    "UNPACKAGED",
    "INSTALLED",
    "REMOVED",
    "IN_SERVICE",
    "STORED",
    "DISPOSED"
  ]);

  const storeUtils = window.WS_APP.storeUtils || {};
  const clone = storeUtils.clone || function cloneFallback(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  };

  let itemInstancesById = Object.create(null);
  let snapshot = [];
  let itemStorePersistenceDirty = false;
  let itemStorePersistenceTimer = 0;
  let itemStorePersistenceIdleHandle = 0;
  let itemStoreRevision = 0;
  let itemInstanceViewCache = new Map();
  let itemInstanceViewCacheCatalogRevision = -1;
  let itemInstanceViewWarmupGeneration = 0;

  function clampNumber(value, min = 0, max = 100) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, number));
  }

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function normalizeItemPlayerLabel(value = "") {
    return String(value ?? "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, PLAYER_LABEL_MAX_LENGTH);
  }

  function normalizeToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function normalizeStringList(value = []) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map((entry) => String(entry || "").trim()).filter(Boolean))];
  }

  function makeInstanceId(source = {}) {
    const explicit = normalizeId(source.instanceId || source.id || source.itemId);
    if (explicit) return explicit;
    const base = normalizeId(source.definitionId || source.catalogId || source.name || "item")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";
    let counter = Object.keys(itemInstancesById).length + 1;
    let id = `item-${base}-${counter}`;
    while (itemInstancesById[id]) {
      counter += 1;
      id = `item-${base}-${counter}`;
    }
    return id;
  }

  function getLegacyContainerPlacement(source = {}) {
    const placement = source.containerPlacement && typeof source.containerPlacement === "object" && !Array.isArray(source.containerPlacement)
      ? source.containerPlacement
      : null;
    if (!placement) return null;
    const containerInstanceId = normalizeId(placement.containerInstanceId || placement.containerId || placement.containerHostId || source.containerHostId);
    if (!containerInstanceId) return null;
    return {
      type: "CONTAINER_GRID",
      containerInstanceId,
      gridX: Math.max(1, Math.round(Number(placement.gridX ?? placement.column ?? placement.col ?? placement.x ?? 1)) || 1),
      gridY: Math.max(1, Math.round(Number(placement.gridY ?? placement.row ?? placement.y ?? 1)) || 1),
      rotation: Number(placement.rotation) === 90 ? 90 : 0
    };
  }

  function getLegacyHousingPlacement(source = {}) {
    const placement = source.housingPlacement && typeof source.housingPlacement === "object" && !Array.isArray(source.housingPlacement)
      ? source.housingPlacement
      : null;
    if (!placement) return null;
    const storageUnitId = normalizeId(placement.storageUnitId || source.storageUnitId);
    if (!storageUnitId) return null;
    return {
      type: "HOUSING_STORAGE",
      storageUnitId,
      gridX: Math.max(1, Math.round(Number(placement.gridX ?? placement.column ?? placement.col ?? placement.x ?? 1)) || 1),
      gridY: Math.max(1, Math.round(Number(placement.gridY ?? placement.row ?? placement.y ?? 1)) || 1),
      rotation: Number(placement.rotation) === 90 ? 90 : 0
    };
  }

  function normalizeItemLocation(source = {}, ownerId = "") {
    const raw = source.location && typeof source.location === "object" && !Array.isArray(source.location)
      ? source.location
      : null;
    if (raw) {
      const type = normalizeToken(raw.type || "UNPLACED");
      const location = { ...clone(raw), type: LOCATION_TYPES.has(type) ? type : "UNPLACED" };
      if (location.type === "BODY") {
        location.characterId = normalizeId(location.characterId || ownerId);
        location.bodySlots = normalizeStringList(location.bodySlots || source.bodySlots || source.slots);
      } else if (location.type === "EQUIPPED") {
        location.characterId = normalizeId(location.characterId || ownerId);
        location.equippedLocation = location.equippedLocation && typeof location.equippedLocation === "object"
          ? clone(location.equippedLocation)
          : source.equippedLocation && typeof source.equippedLocation === "object"
            ? clone(source.equippedLocation)
            : null;
      } else if (location.type === "CONTAINER_GRID") {
        location.containerInstanceId = normalizeId(location.containerInstanceId || location.containerId || location.containerHostId);
        location.gridX = Math.max(1, Math.round(Number(location.gridX ?? location.column ?? location.x ?? 1)) || 1);
        location.gridY = Math.max(1, Math.round(Number(location.gridY ?? location.row ?? location.y ?? 1)) || 1);
        location.rotation = Number(location.rotation) === 90 ? 90 : 0;
      } else if (location.type === "HOUSING_STORAGE") {
        location.storageUnitId = normalizeId(location.storageUnitId || location.unitId);
        location.gridX = Math.max(1, Math.round(Number(location.gridX ?? location.column ?? location.x ?? 1)) || 1);
        location.gridY = Math.max(1, Math.round(Number(location.gridY ?? location.row ?? location.y ?? 1)) || 1);
        location.rotation = Number(location.rotation) === 90 ? 90 : 0;
      } else if (location.type === "HOUSING_ROOM") {
        location.housingRecordId = normalizeId(location.housingRecordId || location.housingId);
        location.roomId = normalizeId(location.roomId || location.householdRoomId);
        location.gridX = Math.max(1, Math.round(Number(location.gridX ?? location.column ?? location.x ?? 1)) || 1);
        location.gridY = Math.max(1, Math.round(Number(location.gridY ?? location.row ?? location.y ?? 1)) || 1);
        location.rotation = Number(location.rotation) === 90 ? 90 : 0;
      } else if (location.type === "INSTALLED_IN_ITEM") {
        location.parentItemInstanceId = normalizeId(location.parentItemInstanceId || location.parentItemId);
        location.moduleSlotId = normalizeId(location.moduleSlotId || location.slotId);
      } else if (location.type === "SERVICE") {
        location.characterId = normalizeId(location.characterId || ownerId);
        location.serviceId = normalizeId(location.serviceId);
      } else if (location.type === "VENDOR") {
        location.vendorId = normalizeId(location.vendorId);
      } else if (location.type === "UNPLACED") {
        location.characterId = normalizeId(location.characterId || ownerId);
      }
      return location;
    }

    const legacyLocation = normalizeToken(source.location || "");
    if (["BODY", "CYBERWARE", "INSTALLED"].includes(legacyLocation)) {
      return {
        type: "BODY",
        characterId: normalizeId(source.characterId || ownerId),
        bodySlots: normalizeStringList(source.bodySlots || source.slots || (source.slot ? [source.slot] : []))
      };
    }
    if (["SERVICE", "SURGERY", "IN_SERVICE"].includes(legacyLocation)) {
      return {
        type: "SERVICE",
        characterId: normalizeId(source.characterId || ownerId),
        serviceId: normalizeId(source.serviceId || source.installServiceId || source.deinstallServiceId)
      };
    }
    if (["INSTALLED_IN_ITEM", "ITEM_MODULE"].includes(legacyLocation)) {
      return {
        type: "INSTALLED_IN_ITEM",
        parentItemInstanceId: normalizeId(source.parentItemInstanceId || source.parentItemId),
        moduleSlotId: normalizeId(source.moduleSlotId || source.slotId)
      };
    }
    if (["DESTROYED", "DISPOSED", "ARCHIVED"].includes(legacyLocation) || source.archived === true) {
      return { type: "DESTROYED" };
    }
    if (legacyLocation === "EQUIPPED" && source.equippedLocation) {
      return {
        type: "EQUIPPED",
        characterId: normalizeId(ownerId || source.characterId),
        equippedLocation: clone(source.equippedLocation)
      };
    }
    if (["CONTAINER", "CONTAINER_GRID"].includes(legacyLocation) || (!legacyLocation && source.containerHostId)) {
      const location = getLegacyContainerPlacement(source);
      if (location) return location;
    }
    if (["HOUSEHOLD", "HOUSING_ROOM"].includes(legacyLocation) || (!legacyLocation && source.housingRecordId && source.roomId)) {
      return {
        type: "HOUSING_ROOM",
        housingRecordId: normalizeId(source.housingRecordId || source.housingId),
        roomId: normalizeId(source.roomId || source.householdRoomId),
        gridX: Math.max(1, Math.round(Number(source.gridX ?? source.column ?? source.x ?? 1)) || 1),
        gridY: Math.max(1, Math.round(Number(source.gridY ?? source.row ?? source.y ?? 1)) || 1),
        rotation: Number(source.rotation) === 90 ? 90 : 0
      };
    }
    if (["STORAGE", "STORED", "HOUSING_STORAGE", "SECURED_UNIT"].includes(legacyLocation) || (!legacyLocation && source.storageUnitId)) {
      const location = getLegacyHousingPlacement(source);
      if (location) return location;
    }
    if (!legacyLocation && normalizeToken(source.status) === "INSTALLED") {
      return {
        type: "BODY",
        characterId: normalizeId(source.characterId || ownerId),
        bodySlots: normalizeStringList(source.bodySlots || source.slots || (source.slot ? [source.slot] : []))
      };
    }
    return { type: "UNPLACED", characterId: normalizeId(ownerId || source.characterId) };
  }

  function inferLifecycleState(source = {}, location = {}) {
    if (location.type === "BODY" || location.type === "INSTALLED_IN_ITEM") return "INSTALLED";
    if (location.type === "SERVICE") return "IN_SERVICE";
    if (location.type === "DESTROYED") return "DISPOSED";
    const explicit = normalizeToken(source.lifecycleState || "");
    if (LIFECYCLE_STATES.has(explicit)) return explicit;
    if (location.type === "VENDOR") return "PACKAGED";
    if (["CONTAINER_GRID", "HOUSING_STORAGE", "HOUSING_ROOM", "EQUIPPED"].includes(location.type)) return "UNPACKAGED";
    return "STORED";
  }

  const CANONICAL_KEYS = new Set([
    "instanceId", "definitionId", "schemaVersion", "ownerId", "playerLabel", "quantity", "lifecycleState", "location",
    "recordState", "archivedAt", "archivedBy", "archiveReason", "disposedAt", "disposedBy", "disposeReason", "recordLifecycle",
    "durability", "hardwareIdentity", "packaging", "cyberwareState", "itemState", "authorizationRefs", "flags",
    "acquisition", "serviceHistory", "instanceData", "id", "itemId", "catalogId", "sourceCatalogId",
    "displayName", "catalogName", "customName", "nickname",
    "condition", "equippedLocation", "containerHostId", "containerPlacement", "storageUnitId", "housingPlacement",
    "x", "y", "bodySlots", "characterId"
  ]);

  function extractInstanceData(source = {}) {
    if (source.instanceData && typeof source.instanceData === "object" && !Array.isArray(source.instanceData)) {
      const data = clone(source.instanceData);
      delete data.playerLabel;
      delete data.displayName;
      delete data.catalogName;
      delete data.customName;
      delete data.nickname;
      delete data.itemState;
      return data;
    }
    return Object.fromEntries(Object.entries(clone(source) || {}).filter(([key]) => !CANONICAL_KEYS.has(key)));
  }

  function normalizeItemInstance(source = {}, index = 0, options = {}) {
    if (!source || typeof source !== "object" || Array.isArray(source)) return null;
    const ownerId = normalizeId(options.ownerId || source.ownerId || source.characterId);
    const instanceId = normalizeId(source.instanceId || source.id || source.itemId) || makeInstanceId(source);
    const definitionId = normalizeId(source.definitionId || source.catalogId || source.sourceCatalogId || source.itemId || source.catalogDefinitionId || `custom:${instanceId}`);
    const location = normalizeItemLocation(source, ownerId);
    const durabilitySource = source.durability && typeof source.durability === "object" && !Array.isArray(source.durability)
      ? source.durability
      : {};
    const condition = source.condition ?? durabilitySource.current ?? 100;
    const hasMaximumOverride = durabilitySource.maximumOverride !== null
      && durabilitySource.maximumOverride !== undefined
      && durabilitySource.maximumOverride !== ""
      && Number.isFinite(Number(durabilitySource.maximumOverride))
      && Number(durabilitySource.maximumOverride) > 0;
    const durabilityMaximum = hasMaximumOverride ? Number(durabilitySource.maximumOverride) : 100;
    const definitionSnapshot = getDefinitionSnapshot(definitionId) || {};
    const itemTypeSource = Object.keys(definitionSnapshot).length ? definitionSnapshot : source;
    const itemType = typeof window.WS_APP.resolveItemTypeId === "function"
      ? window.WS_APP.resolveItemTypeId(itemTypeSource)
      : normalizeToken(itemTypeSource.itemType || itemTypeSource.itemTypeId || "GENERIC_ITEM") || "GENERIC_ITEM";
    const itemTypeProfile = typeof window.WS_APP.normalizeItemTypeProfile === "function"
      ? window.WS_APP.normalizeItemTypeProfile(itemType, itemTypeSource.itemTypeProfile || itemTypeSource.typeProfile || {})
      : clone(itemTypeSource.itemTypeProfile || itemTypeSource.typeProfile || {});
    const rawItemState = source.itemState
      ?? source.instanceData?.itemState
      ?? source.typeState
      ?? {};
    const itemState = typeof window.WS_APP.normalizeItemTypeState === "function"
      ? window.WS_APP.normalizeItemTypeState(itemType, rawItemState, itemTypeProfile)
      : { schemaVersion: 1, typeId: itemType, data: clone(rawItemState?.data || rawItemState || {}) };
    const normalized = {
      instanceId,
      definitionId,
      schemaVersion: SCHEMA_VERSION,
      ownerId,
      playerLabel: normalizeItemPlayerLabel(
        source.playerLabel
        ?? source.instanceData?.playerLabel
        ?? source.customName
        ?? source.nickname
        ?? ""
      ),
      quantity: Math.max(1, Math.round(Number(source.quantity || 1)) || 1),
      recordState: normalizeToken(source.recordState || "ACTIVE") === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
      archivedAt: normalizeId(source.archivedAt),
      archivedBy: normalizeId(source.archivedBy),
      archiveReason: String(source.archiveReason || "").trim(),
      disposedAt: normalizeId(source.disposedAt),
      disposedBy: normalizeId(source.disposedBy),
      disposeReason: String(source.disposeReason || "").trim(),
      recordLifecycle: source.recordLifecycle && typeof source.recordLifecycle === "object" && !Array.isArray(source.recordLifecycle)
        ? clone(source.recordLifecycle)
        : { revision: 0, history: [] },
      lifecycleState: inferLifecycleState(source, location),
      location,
      durability: {
        current: clampNumber(condition, 0, durabilityMaximum),
        maximumOverride: hasMaximumOverride ? durabilityMaximum : null
      },
      hardwareIdentity: source.hardwareIdentity && typeof source.hardwareIdentity === "object" && !Array.isArray(source.hardwareIdentity)
        ? clone(source.hardwareIdentity)
        : null,
      packaging: source.packaging && typeof source.packaging === "object" && !Array.isArray(source.packaging)
        ? clone(source.packaging)
        : null,
      itemState,
      cyberwareState: source.cyberwareState && typeof source.cyberwareState === "object" && !Array.isArray(source.cyberwareState)
        ? clone(source.cyberwareState)
        : location.type === "BODY"
          ? {
              installedCharacterId: normalizeId(location.characterId || ownerId),
              installedBodySlots: normalizeStringList(location.bodySlots),
              installedModules: [],
              installedFirmware: [],
              calibration: { profile: "FACTORY", quality: 100 }
            }
          : null,
      authorizationRefs: source.authorizationRefs && typeof source.authorizationRefs === "object" && !Array.isArray(source.authorizationRefs)
        ? clone(source.authorizationRefs)
        : null,
      flags: source.flags && typeof source.flags === "object" && !Array.isArray(source.flags) ? clone(source.flags) : {},
      acquisition: source.acquisition && typeof source.acquisition === "object" && !Array.isArray(source.acquisition) ? clone(source.acquisition) : null,
      serviceHistory: Array.isArray(source.serviceHistory) ? clone(source.serviceHistory) : [],
      instanceData: extractInstanceData(source)
    };

    if (location.type === "BODY") {
      normalized.cyberwareState = {
        ...(normalized.cyberwareState || {}),
        installedCharacterId: normalizeId(normalized.cyberwareState?.installedCharacterId || location.characterId || ownerId),
        installedBodySlots: normalizeStringList(normalized.cyberwareState?.installedBodySlots || location.bodySlots),
        installedModules: Array.isArray(normalized.cyberwareState?.installedModules) ? clone(normalized.cyberwareState.installedModules) : [],
        installedFirmware: Array.isArray(normalized.cyberwareState?.installedFirmware) ? clone(normalized.cyberwareState.installedFirmware) : [],
        calibration: normalized.cyberwareState?.calibration && typeof normalized.cyberwareState.calibration === "object"
          ? clone(normalized.cyberwareState.calibration)
          : { profile: "FACTORY", quality: 100 }
      };
    }
    return normalized;
  }

  function getDefinitionSnapshot(definitionId = "") {
    const id = normalizeId(definitionId);
    if (!id) return null;
    if (typeof window.WS_APP.getCyberwareCatalogItem === "function") {
      const definition = window.WS_APP.getCyberwareCatalogItem(id);
      if (definition) return definition;
    }
    if (typeof window.WS_APP.getEquipmentCatalogItemById === "function") {
      const definition = window.WS_APP.getEquipmentCatalogItemById(id);
      if (definition) return definition;
    }
    return null;
  }

  function applyDefinitionOwnedViewFields(view = {}, definition = {}) {
    if (!definition || typeof definition !== "object" || Array.isArray(definition)) return view;
    DEFINITION_OWNED_VIEW_KEYS.forEach((key) => {
      if (definition[key] !== undefined) view[key] = clone(definition[key]);
    });
    return view;
  }

  function getItemInstanceCatalogName(item = {}) {
    const source = typeof item === "string" ? getItemInstanceView(item) || {} : item || {};
    return String(source.catalogName || source.name || source.model || source.title || source.definitionId || source.instanceId || source.id || "Item").trim() || "Item";
  }

  function getItemInstanceDisplayName(item = {}) {
    const source = typeof item === "string" ? getItemInstanceView(item) || {} : item || {};
    return normalizeItemPlayerLabel(source.playerLabel) || String(source.displayName || getItemInstanceCatalogName(source)).trim() || "Item";
  }

  function getViewStatus(instance = {}) {
    if (instance.recordState === "ARCHIVED") return "ARCHIVED";
    if (instance.lifecycleState === "INSTALLED") return "INSTALLED";
    if (instance.lifecycleState === "IN_SERVICE") return "IN_SERVICE";
    if (instance.lifecycleState === "DISPOSED") return "DISPOSED";
    return normalizeToken(instance.instanceData?.status || "OWNED") || "OWNED";
  }

  function getItemInstanceView(instanceOrId = {}) {
    const instance = typeof instanceOrId === "string" ? itemInstancesById[instanceOrId] : instanceOrId;
    if (!instance) return null;
    const instanceId = normalizeId(instance.instanceId);
    window.WS_APP.getEquipmentCatalogIndex?.();
    const catalogRevision = Number(window.WS_APP.getEquipmentCatalogRevision?.() || 0);
    if (itemInstanceViewCacheCatalogRevision !== catalogRevision) {
      itemInstanceViewCache.clear();
      itemInstanceViewCacheCatalogRevision = catalogRevision;
    }
    const canonicalInstance = instanceId && itemInstancesById[instanceId] === instance;
    if (canonicalInstance) {
      const cached = itemInstanceViewCache.get(instanceId);
      if (cached && cached.storeRevision === itemStoreRevision && cached.catalogRevision === catalogRevision) {
        return clone(cached.view);
      }
    }
    const definition = getDefinitionSnapshot(instance.definitionId) || {};
    const data = instance.instanceData && typeof instance.instanceData === "object" ? instance.instanceData : {};
    const location = instance.location || { type: "UNPLACED" };
    const view = {
      ...clone(definition),
      ...clone(data),
      instanceId: instance.instanceId,
      id: instance.instanceId,
      itemId: instance.instanceId,
      definitionId: instance.definitionId,
      catalogId: instance.definitionId,
      ownerId: instance.ownerId,
      playerLabel: normalizeItemPlayerLabel(instance.playerLabel),
      quantity: instance.quantity,
      recordState: instance.recordState || "ACTIVE",
      archivedAt: instance.archivedAt || "",
      archivedBy: instance.archivedBy || "",
      archiveReason: instance.archiveReason || "",
      disposedAt: instance.disposedAt || "",
      disposedBy: instance.disposedBy || "",
      disposeReason: instance.disposeReason || "",
      recordLifecycle: clone(instance.recordLifecycle || { revision: 0, history: [] }),
      lifecycleState: instance.lifecycleState,
      durability: clone(instance.durability),
      condition: clampNumber(instance.durability?.current ?? 100, 0, instance.durability?.maximumOverride || 100),
      hardwareIdentity: clone(instance.hardwareIdentity),
      packaging: clone(instance.packaging),
      itemState: clone(instance.itemState),
      cyberwareState: clone(instance.cyberwareState),
      authorizationRefs: clone(instance.authorizationRefs),
      flags: clone(instance.flags),
      acquisition: clone(instance.acquisition),
      serviceHistory: clone(instance.serviceHistory),
      status: getViewStatus(instance),
      archived: instance.recordState === "ARCHIVED",
      disposed: instance.lifecycleState === "DISPOSED" || location.type === "DESTROYED"
    };
    applyDefinitionOwnedViewFields(view, definition);
    view.itemType = typeof window.WS_APP.resolveItemTypeId === "function"
      ? window.WS_APP.resolveItemTypeId(Object.keys(definition).length ? definition : view)
      : normalizeToken(view.itemType || "GENERIC_ITEM") || "GENERIC_ITEM";
    view.itemTypeProfile = typeof window.WS_APP.normalizeItemTypeProfile === "function"
      ? window.WS_APP.normalizeItemTypeProfile(view.itemType, definition.itemTypeProfile || view.itemTypeProfile || {})
      : clone(definition.itemTypeProfile || view.itemTypeProfile || {});
    view.itemState = typeof window.WS_APP.normalizeItemTypeState === "function"
      ? window.WS_APP.normalizeItemTypeState(view.itemType, instance.itemState || {}, view.itemTypeProfile)
      : clone(instance.itemState || { schemaVersion: 1, typeId: view.itemType, data: {} });
    view.capabilities = typeof window.WS_APP.getItemTypeCapabilities === "function"
      ? window.WS_APP.getItemTypeCapabilities(view.itemType)
      : Array.isArray(view.capabilities) ? [...view.capabilities] : [];
    const itemTypeDefinition = typeof window.WS_APP.getItemTypeDefinition === "function"
      ? window.WS_APP.getItemTypeDefinition(view.itemType)
      : null;
    view.itemTypeLabel = String(itemTypeDefinition?.label || view.itemTypeLabel || view.itemType).trim();
    const canonicalDefinitionId = normalizeId(definition.id || definition.catalogId || instance.definitionId);
    view.definitionId = canonicalDefinitionId;
    view.catalogId = canonicalDefinitionId;
    view.catalogName = String(definition.name || definition.model || definition.title || view.name || view.model || canonicalDefinitionId || instance.instanceId || "Item").trim() || "Item";
    view.displayName = normalizeItemPlayerLabel(view.playerLabel) || view.catalogName;

    view.equippedLocation = null;
    view.containerHostId = "";
    view.containerPlacement = null;
    view.storageUnitId = "";
    view.housingPlacement = null;
    view.householdPlacement = null;
    view.locationData = clone(location);

    if (location.type === "EQUIPPED") {
      view.location = "EQUIPPED";
      view.equippedLocation = clone(location.equippedLocation);
    } else if (location.type === "CONTAINER_GRID") {
      view.location = "CONTAINER";
      view.containerHostId = normalizeId(location.containerInstanceId);
      view.containerPlacement = {
        containerId: normalizeId(location.containerInstanceId),
        column: Math.max(1, Math.round(Number(location.gridX || 1)) || 1),
        row: Math.max(1, Math.round(Number(location.gridY || 1)) || 1),
        rotation: Number(location.rotation) === 90 ? 90 : 0
      };
    } else if (location.type === "HOUSING_STORAGE") {
      view.location = "STORED";
      view.storageUnitId = normalizeId(location.storageUnitId);
      view.housingPlacement = {
        storageUnitId: normalizeId(location.storageUnitId),
        column: Math.max(1, Math.round(Number(location.gridX || 1)) || 1),
        row: Math.max(1, Math.round(Number(location.gridY || 1)) || 1),
        rotation: Number(location.rotation) === 90 ? 90 : 0
      };
    } else if (location.type === "HOUSING_ROOM") {
      view.location = "HOUSEHOLD";
      view.housingRecordId = normalizeId(location.housingRecordId);
      view.roomId = normalizeId(location.roomId);
      view.householdPlacement = {
        housingRecordId: normalizeId(location.housingRecordId),
        roomId: normalizeId(location.roomId),
        column: Math.max(1, Math.round(Number(location.gridX || 1)) || 1),
        row: Math.max(1, Math.round(Number(location.gridY || 1)) || 1),
        rotation: Number(location.rotation) === 90 ? 90 : 0
      };
    } else if (location.type === "BODY") {
      view.location = "BODY";
      view.characterId = normalizeId(location.characterId || instance.ownerId);
      view.bodySlots = normalizeStringList(location.bodySlots || instance.cyberwareState?.installedBodySlots);
      if (view.bodySlots.length) {
        view.slots = [...view.bodySlots];
        view.slot = view.bodySlots[0];
        view.primarySlot = view.bodySlots[0];
      } else {
        view.slots = normalizeStringList(view.slots);
        view.slot = normalizeId(view.slot || view.primarySlot);
        view.primarySlot = normalizeId(view.primarySlot || view.slot);
      }
      view.operatingStatus = normalizeToken(view.operatingStatus || "ACTIVE");
    } else if (location.type === "INSTALLED_IN_ITEM") {
      view.location = "INSTALLED_IN_ITEM";
      view.parentItemInstanceId = normalizeId(location.parentItemInstanceId);
      view.moduleSlotId = normalizeId(location.moduleSlotId);
    } else if (location.type === "SERVICE") {
      view.location = "SERVICE";
      view.characterId = normalizeId(location.characterId || instance.ownerId);
      view.serviceId = normalizeId(location.serviceId);
    } else if (location.type === "VENDOR") {
      view.location = "VENDOR";
      view.vendorId = normalizeId(location.vendorId);
    } else if (location.type === "DESTROYED") {
      view.location = "DESTROYED";
    } else {
      view.location = "ORPHAN";
    }
    if (canonicalInstance) {
      itemInstanceViewCache.set(instanceId, {
        storeRevision: itemStoreRevision,
        catalogRevision,
        view: clone(view)
      });
    }
    return view;
  }

  function scheduleItemInstanceViewCacheWarmup() {
    const instanceIds = Object.keys(itemInstancesById);
    const storeRevision = itemStoreRevision;
    const generation = ++itemInstanceViewWarmupGeneration;
    let cursor = 0;

    if (!instanceIds.length) return generation;

    const scheduleSlice = (callback) => {
      if (typeof window.requestIdleCallback === "function") {
        return window.requestIdleCallback(callback, { timeout: ITEM_INSTANCE_VIEW_WARMUP_TIMEOUT_MS });
      }
      return window.setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), 0);
    };

    const warmSlice = (deadline = {}) => {
      if (generation !== itemInstanceViewWarmupGeneration || storeRevision !== itemStoreRevision) return;
      let processed = 0;
      while (cursor < instanceIds.length && processed < ITEM_INSTANCE_VIEW_WARMUP_BATCH_SIZE) {
        if (processed > 0
          && deadline.didTimeout !== true
          && typeof deadline.timeRemaining === "function"
          && deadline.timeRemaining() < 2) {
          break;
        }
        getItemInstanceView(instanceIds[cursor]);
        cursor += 1;
        processed += 1;
      }
      if (cursor < instanceIds.length) scheduleSlice(warmSlice);
    };

    scheduleSlice(warmSlice);
    return generation;
  }

  function getCanonicalCitizenItemInstances(citizenId = "", options = {}) {
    const id = normalizeId(citizenId);
    const includeDisposed = options.includeDisposed === true;
    const includeArchived = options.includeArchived === true;
    const includeBody = options.includeBody !== false;
    return Object.values(itemInstancesById).filter((instance) => {
      if (instance.ownerId !== id) return false;
      if (!includeDisposed && instance.lifecycleState === "DISPOSED") return false;
      if (!includeArchived && instance.recordState === "ARCHIVED") return false;
      if (!includeBody && instance.location?.type === "BODY") return false;
      return true;
    });
  }

  function getCanonicalCitizenEquipmentItemInstances(citizenId = "", options = {}) {
    const includeDisposed = options.includeDisposed === true;
    const includeArchived = options.includeArchived === true;
    return getCanonicalCitizenItemInstances(citizenId, { includeDisposed, includeArchived }).filter((instance) =>
      EQUIPMENT_LOCATION_TYPES.has(instance.location?.type)
    );
  }

  function getCanonicalCitizenBodyItemInstances(citizenId = "") {
    const id = normalizeId(citizenId);
    return Object.values(itemInstancesById).filter((instance) =>
      instance.recordState !== "ARCHIVED"
      && instance.location?.type === "BODY"
      && normalizeId(instance.location.characterId || instance.ownerId) === id
    );
  }

  function getCanonicalInstalledCyberwareInstances(citizenId = "") {
    return getCanonicalCitizenBodyItemInstances(citizenId).filter(isCyberwareInstance);
  }

  function isCyberwareView(view = {}) {
    const category = normalizeToken(view.category);
    const subtype = normalizeToken(view.subtype || view.itemType);
    const tags = Array.isArray(view.tags) ? view.tags.map(normalizeToken) : [];
    const role = normalizeToken(view.processorRole || view.role);
    return category === "CYBERWARE"
      || ["CYBERWARE", "IMPLANT", "NEUROCHIP", "INTERFACE", "SERVICE_PORT", "BIOWARE"].includes(subtype)
      || tags.some((tag) => ["CYBERWARE", "IMPLANT", "NEUROCHIP", "INTERFACE", "SERVICE_PORT", "BIOWARE"].includes(tag))
      || ["NEUROCHIP", "INTERFACE_BACKPLANE", "CORE_INTERFACE", "BODY_BUS", "SERVICE_PORT"].includes(role);
  }

  function isCyberwareInstance(instanceOrId = {}) {
    const view = getItemInstanceView(instanceOrId);
    return Boolean(view && isCyberwareView(view));
  }

  function rebuildSnapshot() {
    snapshot = Object.values(itemInstancesById).map((item) => clone(item));
    window.WS_APP.state.itemInstances = itemInstancesById;
    itemStoreRevision += 1;
    itemInstanceViewCache.clear();
    scheduleItemInstanceViewCacheWarmup();
  }

  function getItemInstanceStoreRevision() {
    return itemStoreRevision;
  }

  function readStoredPayload() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION || parsed.seedVersion !== SEED_VERSION || !Array.isArray(parsed.items)) return null;
      return parsed.items;
    } catch (error) {
      console.warn("W&S item instance store could not read localStorage.", error);
      return null;
    }
  }

  function cancelScheduledItemStorePersistence() {
    if (itemStorePersistenceTimer) {
      window.clearTimeout(itemStorePersistenceTimer);
      itemStorePersistenceTimer = 0;
    }
    if (itemStorePersistenceIdleHandle) {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(itemStorePersistenceIdleHandle);
      } else {
        window.clearTimeout(itemStorePersistenceIdleHandle);
      }
      itemStorePersistenceIdleHandle = 0;
    }
  }

  function writeStoredPayload() {
    cancelScheduledItemStorePersistence();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, seedVersion: SEED_VERSION, items: snapshot }));
      itemStorePersistenceDirty = false;
      return true;
    } catch (error) {
      console.warn("W&S item instance store could not write localStorage.", error);
      return false;
    }
  }

  function flushScheduledItemStorePersistence() {
    if (!itemStorePersistenceDirty) {
      cancelScheduledItemStorePersistence();
      return false;
    }
    return writeStoredPayload();
  }

  function scheduleItemStorePersistence() {
    itemStorePersistenceDirty = true;
    cancelScheduledItemStorePersistence();
    itemStorePersistenceTimer = window.setTimeout(() => {
      itemStorePersistenceTimer = 0;
      const flush = () => {
        itemStorePersistenceIdleHandle = 0;
        flushScheduledItemStorePersistence();
      };
      if (typeof window.requestIdleCallback === "function") {
        itemStorePersistenceIdleHandle = window.requestIdleCallback(flush, { timeout: 2000 });
      } else {
        itemStorePersistenceIdleHandle = window.setTimeout(flush, 0);
      }
    }, ITEM_STORE_PERSIST_DEBOUNCE_MS);
  }

  function validateItemInstances(items = Object.values(itemInstancesById)) {
    const errors = [];
    const ids = new Set();
    (Array.isArray(items) ? items : Object.values(items || {})).forEach((instance, index) => {
      if (!instance || typeof instance !== "object") {
        errors.push({ code: "INVALID_INSTANCE_RECORD", index });
        return;
      }
      if (!instance.instanceId) errors.push({ code: "INSTANCE_ID_REQUIRED", index });
      else if (ids.has(instance.instanceId)) errors.push({ code: "DUPLICATE_INSTANCE_ID", instanceId: instance.instanceId });
      else ids.add(instance.instanceId);
      if (!instance.definitionId) errors.push({ code: "DEFINITION_REFERENCE_REQUIRED", instanceId: instance.instanceId });
      if (!instance.ownerId && !["VENDOR", "DESTROYED"].includes(instance.location?.type)) errors.push({ code: "OWNER_REQUIRED", instanceId: instance.instanceId });
      if (!LIFECYCLE_STATES.has(instance.lifecycleState)) errors.push({ code: "INVALID_LIFECYCLE_STATE", instanceId: instance.instanceId, value: instance.lifecycleState });
      if (!LOCATION_TYPES.has(instance.location?.type)) errors.push({ code: "INVALID_LOCATION_TYPE", instanceId: instance.instanceId, value: instance.location?.type });
      if (instance.location?.type === "BODY") {
        if (!instance.location.characterId) errors.push({ code: "BODY_CHARACTER_REQUIRED", instanceId: instance.instanceId });
        if (!Array.isArray(instance.location.bodySlots) || !instance.location.bodySlots.length) errors.push({ code: "BODY_SLOTS_REQUIRED", instanceId: instance.instanceId });
        if (instance.lifecycleState !== "INSTALLED") errors.push({ code: "BODY_LIFECYCLE_MISMATCH", instanceId: instance.instanceId });
      }
      if (instance.location?.type === "EQUIPPED" && !instance.location.characterId) {
        errors.push({ code: "EQUIPPED_CHARACTER_REQUIRED", instanceId: instance.instanceId });
      }
      if (instance.location?.type === "CONTAINER_GRID") {
        if (!instance.location.containerInstanceId) errors.push({ code: "CONTAINER_INSTANCE_REQUIRED", instanceId: instance.instanceId });
        if (!Number.isFinite(Number(instance.location.gridX)) || !Number.isFinite(Number(instance.location.gridY))) errors.push({ code: "CONTAINER_COORDINATES_REQUIRED", instanceId: instance.instanceId });
      }
      if (instance.location?.type === "HOUSING_STORAGE") {
        if (!instance.location.storageUnitId) errors.push({ code: "STORAGE_UNIT_REQUIRED", instanceId: instance.instanceId });
        if (!Number.isFinite(Number(instance.location.gridX)) || !Number.isFinite(Number(instance.location.gridY))) errors.push({ code: "HOUSING_COORDINATES_REQUIRED", instanceId: instance.instanceId });
      }
      if (instance.location?.type === "HOUSING_ROOM") {
        if (!instance.location.housingRecordId) errors.push({ code: "HOUSING_RECORD_REQUIRED", instanceId: instance.instanceId });
        if (!instance.location.roomId) errors.push({ code: "HOUSEHOLD_ROOM_REQUIRED", instanceId: instance.instanceId });
        if (!Number.isFinite(Number(instance.location.gridX)) || !Number.isFinite(Number(instance.location.gridY))) errors.push({ code: "HOUSEHOLD_COORDINATES_REQUIRED", instanceId: instance.instanceId });
      }
      if (instance.location?.type === "INSTALLED_IN_ITEM") {
        if (!instance.location.parentItemInstanceId) errors.push({ code: "PARENT_ITEM_INSTANCE_REQUIRED", instanceId: instance.instanceId });
        if (!instance.location.moduleSlotId) errors.push({ code: "MODULE_SLOT_REQUIRED", instanceId: instance.instanceId });
        if (instance.lifecycleState !== "INSTALLED") errors.push({ code: "INSTALLED_IN_ITEM_LIFECYCLE_MISMATCH", instanceId: instance.instanceId });
      }
      if (instance.location?.type === "SERVICE" && instance.lifecycleState !== "IN_SERVICE") {
        errors.push({ code: "SERVICE_LIFECYCLE_MISMATCH", instanceId: instance.instanceId });
      }
      if (instance.location?.type === "DESTROYED" && instance.lifecycleState !== "DISPOSED") {
        errors.push({ code: "DESTROYED_LIFECYCLE_MISMATCH", instanceId: instance.instanceId });
      }
    });
    return { valid: errors.length === 0, errors };
  }

  function setStore(items = [], options = {}) {
    const normalizedItems = [];
    (Array.isArray(items) ? items : Object.values(items || {})).forEach((source, index) => {
      const instance = normalizeItemInstance(source, index);
      if (instance?.instanceId) normalizedItems.push(instance);
    });
    const validation = validateItemInstances(normalizedItems);
    if (!validation.valid && options.allowInvalid !== true) {
      console.error("W&S item instance store validation failed.", validation.errors);
      return validation;
    }
    const next = Object.create(null);
    normalizedItems.forEach((instance) => {
      next[instance.instanceId] = instance;
    });
    itemInstancesById = next;
    rebuildSnapshot();
    if (options.persist !== false) writeStoredPayload();
    return validation;
  }

  function emitUpdate(detail = {}) {
    if (detail.skipItemEvent !== true) {
      window.dispatchEvent(new CustomEvent("ws:item-instances-updated", { detail }));
    }
    if (detail.citizenId && detail.skipCitizenEvent !== true) {
      window.dispatchEvent(new CustomEvent("ws:citizens-updated", {
        detail: {
          id: detail.citizenId,
          itemInstancesChanged: true,
          source: detail.source || "ITEM_INSTANCES",
          skipModuleRefresh: detail.skipModuleRefresh === true,
          skipProfileRefresh: detail.skipProfileRefresh === true
        }
      }));
    }
  }

  function commitNextStore(nextMap = {}, detail = {}) {
    const validation = validateItemInstances(Object.values(nextMap));
    if (!validation.valid) return { ok: false, reason: "ITEM_INSTANCE_VALIDATION_FAILED", validation };

    const previousMap = itemInstancesById;
    const previousSnapshot = snapshot;
    const previousRevision = itemStoreRevision;
    const previousPersistenceDirty = itemStorePersistenceDirty;

    itemInstancesById = nextMap;
    rebuildSnapshot();

    let persisted = true;
    if (detail.deferPersistence === true) {
      scheduleItemStorePersistence();
    } else {
      persisted = writeStoredPayload();
    }

    if (detail.requirePersistence === true && !persisted) {
      cancelScheduledItemStorePersistence();
      itemInstancesById = previousMap;
      snapshot = previousSnapshot;
      itemStoreRevision = previousRevision;
      itemStorePersistenceDirty = previousPersistenceDirty;
      window.WS_APP.state.itemInstances = itemInstancesById;
      itemInstanceViewCache.clear();
      return {
        ok: false,
        reason: "ITEM_INSTANCE_PERSISTENCE_FAILED",
        validation,
        rolledBack: true,
        storeRevision: itemStoreRevision
      };
    }

    const eventDetail = {
      ...detail,
      revision: itemStoreRevision,
      storeRevision: itemStoreRevision
    };
    emitUpdate(eventDetail);
    return { ok: true, validation, persisted, storeRevision: itemStoreRevision };
  }

  function stableSerializeItemValue(value) {
    if (value === null || value === undefined) return JSON.stringify(value ?? null);
    if (Array.isArray(value)) return `[${value.map(stableSerializeItemValue).join(",")}]`;
    if (typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerializeItemValue(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function itemSnapshotsEqual(left, right) {
    return stableSerializeItemValue(left ?? null) === stableSerializeItemValue(right ?? null);
  }

  function validateItemMutationExpectation(current = null, expected = {}, instanceId = "") {
    const source = expected && typeof expected === "object" && !Array.isArray(expected) ? expected : {};
    if (source.exists === true && !current) return { ok: false, reason: "ITEM_INSTANCE_EXPECTED_TO_EXIST", instanceId };
    if (source.exists === false && current) return { ok: false, reason: "ITEM_INSTANCE_EXPECTED_TO_BE_MISSING", instanceId };
    if (!current) return { ok: true };

    if (source.snapshot !== undefined && !itemSnapshotsEqual(current, source.snapshot)) {
      return { ok: false, reason: "ITEM_INSTANCE_SNAPSHOT_CONFLICT", instanceId };
    }
    if (source.ownerId !== undefined && normalizeId(current.ownerId) !== normalizeId(source.ownerId)) {
      return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH", instanceId };
    }
    if (source.definitionId !== undefined && normalizeId(current.definitionId) !== normalizeId(source.definitionId)) {
      return { ok: false, reason: "ITEM_INSTANCE_DEFINITION_MISMATCH", instanceId };
    }

    const expectedLocationTypes = Array.isArray(source.locationTypes)
      ? source.locationTypes.map(normalizeToken).filter(Boolean)
      : source.locationType !== undefined
        ? [normalizeToken(source.locationType)]
        : [];
    if (expectedLocationTypes.length && !expectedLocationTypes.includes(normalizeToken(current.location?.type))) {
      return {
        ok: false,
        reason: "ITEM_INSTANCE_LOCATION_CONFLICT",
        instanceId,
        expectedLocationTypes,
        actualLocationType: normalizeToken(current.location?.type)
      };
    }

    const expectedLifecycleStates = Array.isArray(source.lifecycleStates)
      ? source.lifecycleStates.map(normalizeToken).filter(Boolean)
      : source.lifecycleState !== undefined
        ? [normalizeToken(source.lifecycleState)]
        : [];
    if (expectedLifecycleStates.length && !expectedLifecycleStates.includes(normalizeToken(current.lifecycleState))) {
      return {
        ok: false,
        reason: "ITEM_INSTANCE_LIFECYCLE_CONFLICT",
        instanceId,
        expectedLifecycleStates,
        actualLifecycleState: normalizeToken(current.lifecycleState)
      };
    }
    return { ok: true };
  }

  function previewItemInstanceMutationPlan(plan = {}) {
    const expectedStoreRevision = plan.expectedStoreRevision == null ? null : Number(plan.expectedStoreRevision);
    if (expectedStoreRevision !== null && expectedStoreRevision !== itemStoreRevision) {
      return {
        ok: false,
        reason: "ITEM_INSTANCE_STORE_REVISION_CONFLICT",
        expectedStoreRevision,
        actualStoreRevision: itemStoreRevision
      };
    }

    const operations = Array.isArray(plan.operations) ? plan.operations : [];
    if (!operations.length) return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_OPERATIONS_REQUIRED" };

    const nextMap = { ...itemInstancesById };
    const beforeById = new Map();
    const afterById = new Map();
    const normalizedOperations = [];
    const touchedIds = new Set();

    for (const rawOperation of operations) {
      const operation = rawOperation && typeof rawOperation === "object" && !Array.isArray(rawOperation) ? rawOperation : {};
      const type = normalizeToken(operation.type || "UPSERT");
      const instanceId = normalizeId(operation.instanceId || operation.instance?.instanceId || operation.instance?.id);
      if (!instanceId) return { ok: false, reason: "ITEM_INSTANCE_ID_REQUIRED" };
      if (touchedIds.has(instanceId)) return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_DUPLICATE_OPERATION", instanceId };
      touchedIds.add(instanceId);

      const current = nextMap[instanceId] ? clone(nextMap[instanceId]) : null;
      const expectation = validateItemMutationExpectation(current, operation.expected || {}, instanceId);
      if (!expectation.ok) return expectation;
      beforeById.set(instanceId, current ? clone(current) : null);

      if (type === "REMOVE") {
        if (!current && operation.allowMissing !== true) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND", instanceId };
        delete nextMap[instanceId];
        afterById.set(instanceId, null);
        normalizedOperations.push({ type: "REMOVE", instanceId, expected: { snapshot: current ? clone(current) : null, exists: Boolean(current) } });
        continue;
      }

      if (type !== "UPSERT") return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_OPERATION_UNSUPPORTED", operationType: type, instanceId };
      const source = operation.instance && typeof operation.instance === "object" && !Array.isArray(operation.instance)
        ? { ...clone(operation.instance), instanceId }
        : null;
      if (!source) return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_INSTANCE_REQUIRED", instanceId };
      const normalized = normalizeItemInstance(source, 0, { ownerId: source.ownerId });
      if (!normalized) return { ok: false, reason: "INVALID_ITEM_INSTANCE", instanceId };
      normalized.instanceId = instanceId;
      nextMap[instanceId] = normalized;
      afterById.set(instanceId, clone(normalized));
      normalizedOperations.push({
        type: "UPSERT",
        instanceId,
        instance: clone(normalized),
        expected: { snapshot: current ? clone(current) : null, exists: Boolean(current) }
      });
    }

    const validation = validateItemInstances(Object.values(nextMap));
    if (!validation.valid) return { ok: false, reason: "ITEM_INSTANCE_VALIDATION_FAILED", validation };

    const instanceIds = [...touchedIds];
    return {
      ok: true,
      expectedStoreRevision: itemStoreRevision,
      instanceIds,
      beforeInstances: instanceIds.map((instanceId) => ({ instanceId, instance: clone(beforeById.get(instanceId) ?? null) })),
      afterInstances: instanceIds.map((instanceId) => ({ instanceId, instance: clone(afterById.get(instanceId) ?? null) })),
      operations: normalizedOperations,
      validation
    };
  }

  function commitItemInstanceMutationPlan(plan = {}, options = {}) {
    const preview = previewItemInstanceMutationPlan(plan);
    if (!preview.ok) return preview;

    const nextMap = { ...itemInstancesById };
    preview.operations.forEach((operation) => {
      if (operation.type === "REMOVE") delete nextMap[operation.instanceId];
      else nextMap[operation.instanceId] = clone(operation.instance);
    });

    const previousLocations = Object.fromEntries(preview.beforeInstances.map((entry) => [entry.instanceId, clone(entry.instance?.location || null)]));
    const nextLocations = Object.fromEntries(preview.afterInstances.map((entry) => [entry.instanceId, clone(entry.instance?.location || null)]));
    const ownerIds = [...new Set(preview.afterInstances
      .map((entry) => normalizeId(entry.instance?.ownerId))
      .concat(preview.beforeInstances.map((entry) => normalizeId(entry.instance?.ownerId)))
      .filter(Boolean))];

    const result = commitNextStore(nextMap, {
      source: options.source || plan.source || "ITEM_INSTANCE_TRANSACTION",
      transactionId: normalizeId(options.transactionId || plan.transactionId),
      eventId: normalizeId(options.eventId || plan.eventId),
      citizenId: ownerIds.length === 1 ? ownerIds[0] : "",
      citizenIds: ownerIds,
      instanceIds: [...preview.instanceIds],
      previousLocations,
      nextLocations,
      changedDomains: Array.isArray(options.changedDomains || plan.changedDomains)
        ? [...new Set((options.changedDomains || plan.changedDomains).map(normalizeToken).filter(Boolean))]
        : ["ITEM_INSTANCE"],
      requirePersistence: true,
      deferPersistence: false,
      skipCitizenEvent: options.skipCitizenEvent !== false,
      skipItemEvent: options.skipItemEvent === true,
      skipModuleRefresh: true,
      skipProfileRefresh: true
    });
    return {
      ...result,
      instanceIds: [...preview.instanceIds],
      beforeInstances: clone(preview.beforeInstances),
      afterInstances: clone(preview.afterInstances),
      previousLocations,
      nextLocations
    };
  }

  function restoreItemInstanceSnapshots(beforeInstances = [], afterInstances = [], options = {}) {
    const expectedById = new Map((Array.isArray(afterInstances) ? afterInstances : []).map((entry) => [normalizeId(entry?.instanceId), clone(entry?.instance ?? null)]));
    const operations = (Array.isArray(beforeInstances) ? beforeInstances : []).map((entry) => {
      const instanceId = normalizeId(entry?.instanceId);
      const expectedSnapshot = expectedById.has(instanceId) ? expectedById.get(instanceId) : undefined;
      return entry?.instance
        ? { type: "UPSERT", instanceId, instance: clone(entry.instance), expected: { snapshot: expectedSnapshot, exists: expectedSnapshot !== null } }
        : { type: "REMOVE", instanceId, expected: { snapshot: expectedSnapshot, exists: expectedSnapshot !== null }, allowMissing: expectedSnapshot === null };
    });
    return commitItemInstanceMutationPlan({
      expectedStoreRevision: options.expectedStoreRevision,
      operations,
      source: options.source || "ITEM_INSTANCE_TRANSACTION_COMPENSATION",
      transactionId: options.transactionId,
      eventId: options.eventId,
      changedDomains: options.changedDomains || ["ITEM_INSTANCE"]
    }, options);
  }

  function commitItemInstanceGridPlacement(citizenId = "", itemId = "", placement = {}) {
    const ownerId = normalizeId(citizenId);
    const instanceId = normalizeId(itemId);
    const containerInstanceId = normalizeId(placement?.containerInstanceId || placement?.containerId);

    if (!ownerId) {
      return { ok: false, code: "ITEM_INSTANCE_OWNER_REQUIRED", reason: "ITEM_INSTANCE_OWNER_REQUIRED", message: "Citizen owner ID is required." };
    }
    if (!instanceId) {
      return { ok: false, code: "ITEM_INSTANCE_ID_REQUIRED", reason: "ITEM_INSTANCE_ID_REQUIRED", message: "Item instance ID is required." };
    }
    if (!containerInstanceId) {
      return { ok: false, code: "GRID_CONTAINER_REQUIRED", reason: "GRID_CONTAINER_REQUIRED", message: "Target grid container ID is required.", itemId: instanceId };
    }

    const current = itemInstancesById[instanceId];
    if (!current) {
      return { ok: false, code: "ITEM_INSTANCE_NOT_FOUND", reason: "ITEM_INSTANCE_NOT_FOUND", message: "Item instance was not found.", itemId: instanceId };
    }
    if (current.ownerId !== ownerId) {
      return { ok: false, code: "ITEM_INSTANCE_OWNER_MISMATCH", reason: "ITEM_INSTANCE_OWNER_MISMATCH", message: "Item instance does not belong to the requested citizen.", itemId: instanceId, citizenId: ownerId };
    }
    if (current.location?.type !== "CONTAINER_GRID") {
      return { ok: false, code: "ITEM_INSTANCE_NOT_IN_CONTAINER_GRID", reason: "ITEM_INSTANCE_NOT_IN_CONTAINER_GRID", message: "Item instance is not currently located in a container grid.", itemId: instanceId, locationType: current.location?.type || "" };
    }

    const currentContainerId = normalizeId(current.location.containerInstanceId);
    if (!currentContainerId) {
      return { ok: false, code: "CURRENT_GRID_CONTAINER_REQUIRED", reason: "CURRENT_GRID_CONTAINER_REQUIRED", message: "Item instance has no canonical current grid container.", itemId: instanceId };
    }
    if (currentContainerId !== containerInstanceId) {
      return { ok: false, code: "GRID_CONTAINER_MISMATCH", reason: "GRID_CONTAINER_MISMATCH", message: "Same-grid commit cannot change the canonical container.", itemId: instanceId, currentContainerId, targetContainerId: containerInstanceId };
    }

    const container = itemInstancesById[containerInstanceId];
    if (!container) {
      return { ok: false, code: "GRID_CONTAINER_NOT_FOUND", reason: "GRID_CONTAINER_NOT_FOUND", message: "Canonical grid container instance was not found.", itemId: instanceId, containerInstanceId };
    }
    if (container.ownerId !== ownerId) {
      return { ok: false, code: "GRID_CONTAINER_OWNER_MISMATCH", reason: "GRID_CONTAINER_OWNER_MISMATCH", message: "Grid container does not belong to the requested citizen.", itemId: instanceId, containerInstanceId, citizenId: ownerId };
    }

    const nextLocation = {
      ...current.location,
      type: "CONTAINER_GRID",
      containerInstanceId,
      gridX: Math.max(1, Math.round(Number(placement.gridX ?? placement.column ?? 1)) || 1),
      gridY: Math.max(1, Math.round(Number(placement.gridY ?? placement.row ?? 1)) || 1),
      rotation: Number(placement.rotation) === 90 ? 90 : 0
    };

    const unchanged = Number(current.location.gridX || 0) === nextLocation.gridX
      && Number(current.location.gridY || 0) === nextLocation.gridY
      && Number(current.location.rotation || 0) === nextLocation.rotation;
    const legacyPlacement = {
      containerId: nextLocation.containerInstanceId,
      column: nextLocation.gridX,
      row: nextLocation.gridY,
      rotation: nextLocation.rotation
    };
    if (unchanged) {
      return { ok: true, noChange: true, citizenId: ownerId, itemId: instanceId, placement: legacyPlacement, deferredPersistence: false };
    }

    const nextInstance = {
      ...current,
      location: nextLocation
    };
    itemInstancesById[instanceId] = nextInstance;
    const snapshotIndex = snapshot.findIndex((instance) => instance?.instanceId === instanceId);
    if (snapshotIndex >= 0) snapshot[snapshotIndex] = clone(nextInstance);
    else rebuildSnapshot();
    window.WS_APP.state.itemInstances = itemInstancesById;
    scheduleItemStorePersistence();

    return {
      ok: true,
      noChange: false,
      citizenId: ownerId,
      itemId: instanceId,
      placement: legacyPlacement,
      deferredPersistence: true
    };
  }

  function commitCitizenHousingGridPlacement(citizenId = "", itemId = "", placement = {}, options = {}) {
    const ownerId = normalizeId(citizenId);
    const instanceId = normalizeId(itemId);
    const storageUnitId = normalizeId(placement?.storageUnitId || placement?.storageId || placement?.unitId);

    if (!ownerId) {
      return { ok: false, code: "ITEM_INSTANCE_OWNER_REQUIRED", reason: "ITEM_INSTANCE_OWNER_REQUIRED", message: "Citizen owner ID is required." };
    }
    if (!instanceId) {
      return { ok: false, code: "ITEM_INSTANCE_ID_REQUIRED", reason: "ITEM_INSTANCE_ID_REQUIRED", message: "Item instance ID is required." };
    }
    if (!storageUnitId) {
      return { ok: false, code: "HOUSING_STORAGE_UNIT_REQUIRED", reason: "HOUSING_STORAGE_UNIT_REQUIRED", message: "Target housing storage unit ID is required.", itemId: instanceId };
    }

    const current = itemInstancesById[instanceId];
    if (!current) {
      return { ok: false, code: "ITEM_INSTANCE_NOT_FOUND", reason: "ITEM_INSTANCE_NOT_FOUND", message: "Item instance was not found.", itemId: instanceId };
    }
    if (current.ownerId !== ownerId) {
      return { ok: false, code: "ITEM_INSTANCE_OWNER_MISMATCH", reason: "ITEM_INSTANCE_OWNER_MISMATCH", message: "Item instance does not belong to the requested citizen.", itemId: instanceId, citizenId: ownerId };
    }
    if (current.location?.type !== "HOUSING_STORAGE") {
      return { ok: false, code: "ITEM_INSTANCE_NOT_IN_HOUSING_STORAGE", reason: "ITEM_INSTANCE_NOT_IN_HOUSING_STORAGE", message: "Item instance is not currently located in housing storage.", itemId: instanceId, locationType: current.location?.type || "" };
    }

    const currentStorageUnitId = normalizeId(current.location.storageUnitId);
    if (!currentStorageUnitId) {
      return { ok: false, code: "CURRENT_HOUSING_STORAGE_UNIT_REQUIRED", reason: "CURRENT_HOUSING_STORAGE_UNIT_REQUIRED", message: "Item instance has no canonical current housing storage unit.", itemId: instanceId };
    }
    if (currentStorageUnitId !== storageUnitId) {
      return { ok: false, code: "HOUSING_STORAGE_UNIT_MISMATCH", reason: "HOUSING_STORAGE_UNIT_MISMATCH", message: "Same-grid Housing commit cannot change the canonical storage unit.", itemId: instanceId, currentStorageUnitId, targetStorageUnitId: storageUnitId };
    }

    const nextLocation = {
      ...current.location,
      type: "HOUSING_STORAGE",
      storageUnitId,
      gridX: Math.max(1, Math.round(Number(placement.gridX ?? placement.column ?? 1)) || 1),
      gridY: Math.max(1, Math.round(Number(placement.gridY ?? placement.row ?? 1)) || 1),
      rotation: Number(placement.rotation) === 90 ? 90 : 0
    };
    const legacyPlacement = {
      storageUnitId: nextLocation.storageUnitId,
      column: nextLocation.gridX,
      row: nextLocation.gridY,
      rotation: nextLocation.rotation
    };
    const unchanged = Number(current.location.gridX || 0) === nextLocation.gridX
      && Number(current.location.gridY || 0) === nextLocation.gridY
      && Number(current.location.rotation || 0) === nextLocation.rotation;

    if (unchanged) {
      return { ok: true, noChange: true, citizenId: ownerId, itemId: instanceId, placement: legacyPlacement, deferredPersistence: false };
    }

    const nextInstance = {
      ...current,
      lifecycleState: current.lifecycleState || "UNPACKAGED",
      location: nextLocation
    };
    itemInstancesById[instanceId] = nextInstance;
    const snapshotIndex = snapshot.findIndex((instance) => instance?.instanceId === instanceId);
    if (snapshotIndex >= 0) snapshot[snapshotIndex] = clone(nextInstance);
    else snapshot.push(clone(nextInstance));
    window.WS_APP.state.itemInstances = itemInstancesById;
    itemStoreRevision += 1;
    itemInstanceViewCache.clear();

    if (options.deferPersistence === false) writeStoredPayload();
    else scheduleItemStorePersistence();

    return {
      ok: true,
      noChange: false,
      citizenId: ownerId,
      itemId: instanceId,
      placement: legacyPlacement,
      deferredPersistence: options.deferPersistence !== false,
      storeRevision: itemStoreRevision
    };
  }

  function getItemInstances(options = {}) {
    const includeDisposed = options.includeDisposed === true;
    const includeArchived = options.includeArchived === true;
    return snapshot
      .filter((instance) => includeDisposed || instance.lifecycleState !== "DISPOSED")
      .filter((instance) => includeArchived || instance.recordState !== "ARCHIVED")
      .map((instance) => clone(instance));
  }

  function getItemInstanceById(instanceId = "") {
    const instance = itemInstancesById[normalizeId(instanceId)];
    return instance ? clone(instance) : null;
  }

  function getCitizenItemInstances(citizenId = "", options = {}) {
    return getCanonicalCitizenItemInstances(citizenId, options).map((instance) => clone(instance));
  }

  function getCitizenItemInstanceViews(citizenId = "", options = {}) {
    return getCanonicalCitizenItemInstances(citizenId, options).map(getItemInstanceView).filter(Boolean);
  }

  function getCitizenEquipmentItemInstances(citizenId = "", options = {}) {
    return getCanonicalCitizenEquipmentItemInstances(citizenId, options).map((instance) => clone(instance));
  }

  function getEquipmentInstanceSummary(citizenIds = []) {
    const ownerIds = new Set((Array.isArray(citizenIds) ? citizenIds : [citizenIds])
      .map((citizenId) => normalizeId(citizenId))
      .filter(Boolean));
    const summary = {
      itemCount: 0,
      equippedCount: 0,
      gridStoredCount: 0,
      storedCount: 0,
      householdPlacedCount: 0,
      unplacedCount: 0,
      carriedCount: 0
    };
    if (!ownerIds.size) return summary;

    snapshot.forEach((instance) => {
      if (!instance || instance.lifecycleState === "DISPOSED") return;
      if (!ownerIds.has(normalizeId(instance.ownerId))) return;
      const locationType = normalizeToken(instance.location?.type || "");
      if (!EQUIPMENT_LOCATION_TYPES.has(locationType)) return;

      summary.itemCount += 1;
      if (locationType === "EQUIPPED") summary.equippedCount += 1;
      else if (locationType === "CONTAINER_GRID") summary.gridStoredCount += 1;
      else if (locationType === "HOUSING_STORAGE") summary.storedCount += 1;
      else if (locationType === "HOUSING_ROOM") summary.householdPlacedCount = Number(summary.householdPlacedCount || 0) + 1;
      else if (locationType === "UNPLACED") summary.unplacedCount += 1;
    });
    summary.carriedCount = summary.equippedCount + summary.gridStoredCount;
    return summary;
  }

  function getCitizenEquipmentItemInstanceViews(citizenId = "", options = {}) {
    return getCanonicalCitizenEquipmentItemInstances(citizenId, options).map(getItemInstanceView).filter(Boolean);
  }

  function getInstalledCyberwareInstances(citizenId = "") {
    return getCanonicalInstalledCyberwareInstances(citizenId).map((instance) => clone(instance));
  }

  function getInstalledCyberwareInstanceViews(citizenId = "") {
    return getCanonicalCitizenBodyItemInstances(citizenId)
      .map(getItemInstanceView)
      .filter((view) => view && isCyberwareView(view));
  }

  function createItemInstance(source = {}, options = {}) {
    const instance = normalizeItemInstance(source, 0, options);
    if (!instance) return { ok: false, reason: "INVALID_ITEM_INSTANCE" };
    if (itemInstancesById[instance.instanceId]) return { ok: false, reason: "DUPLICATE_INSTANCE_ID", instanceId: instance.instanceId };
    const next = { ...itemInstancesById, [instance.instanceId]: instance };
    const result = commitNextStore(next, {
      citizenId: instance.ownerId,
      instanceId: instance.instanceId,
      source: options.source || "ITEM_CREATE",
      deferPersistence: options.deferPersistence === true,
      skipCitizenEvent: options.skipCitizenEvent === true,
      skipItemEvent: options.skipItemEvent === true,
      skipModuleRefresh: options.skipModuleRefresh === true,
      skipProfileRefresh: options.skipProfileRefresh === true
    });
    return { ...result, instance: result.ok ? clone(instance) : null, item: result.ok ? getItemInstanceView(instance.instanceId) : null };
  }

  function updateItemInstance(instanceId = "", patch = {}, options = {}) {
    const id = normalizeId(instanceId);
    const current = itemInstancesById[id];
    if (!current) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND", instanceId: id };
    const source = typeof patch === "function" ? patch(clone(current)) : { ...clone(current), ...clone(patch), instanceId: id };
    if (!source || typeof source !== "object") return { ok: false, reason: "INVALID_ITEM_INSTANCE_PATCH" };
    const normalized = normalizeItemInstance(source, 0, { ownerId: source.ownerId || current.ownerId });
    normalized.instanceId = id;
    const next = { ...itemInstancesById, [id]: normalized };
    const result = commitNextStore(next, {
      citizenId: normalized.ownerId || current.ownerId,
      instanceId: id,
      source: options.source || "ITEM_UPDATE",
      deferPersistence: options.deferPersistence === true,
      skipCitizenEvent: options.skipCitizenEvent === true,
      skipItemEvent: options.skipItemEvent === true,
      skipModuleRefresh: options.skipModuleRefresh === true,
      skipProfileRefresh: options.skipProfileRefresh === true
    });
    return { ...result, instance: result.ok ? clone(normalized) : null, item: result.ok ? getItemInstanceView(id) : null };
  }

  function renameItemInstance(citizenId = "", instanceId = "", playerLabel = "", options = {}) {
    const ownerId = normalizeId(citizenId);
    const id = normalizeId(instanceId);
    if (!id) return { ok: false, reason: "INSTANCE_ID_REQUIRED" };
    const current = itemInstancesById[id];
    if (!current) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND", instanceId: id };
    if (current.ownerId && ownerId && current.ownerId !== ownerId) {
      return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH", instanceId: id };
    }
    const normalizedLabel = normalizeItemPlayerLabel(playerLabel);
    if (normalizedLabel === normalizeItemPlayerLabel(current.playerLabel)) {
      return {
        ok: true,
        unchanged: true,
        instance: clone(current),
        item: getItemInstanceView(id),
        playerLabel: normalizedLabel,
        storeRevision: itemStoreRevision
      };
    }
    const result = updateItemInstance(id, { ...clone(current), playerLabel: normalizedLabel }, {
      ...options,
      source: options.source || "ITEM_RENAME"
    });
    return { ...result, playerLabel: normalizedLabel };
  }

  function updateItemTypeState(citizenId = "", instanceId = "", statePatch = {}, options = {}) {
    const ownerId = normalizeId(citizenId);
    const id = normalizeId(instanceId);
    if (!id) return { ok: false, reason: "INSTANCE_ID_REQUIRED" };
    const current = itemInstancesById[id];
    if (!current) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND", instanceId: id };
    if (current.ownerId && ownerId && current.ownerId !== ownerId) {
      return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH", instanceId: id };
    }
    const definition = getDefinitionSnapshot(current.definitionId) || {};
    const itemType = typeof window.WS_APP.resolveItemTypeId === "function"
      ? window.WS_APP.resolveItemTypeId(Object.keys(definition).length ? definition : getItemInstanceView(id) || {})
      : normalizeToken(current.itemState?.typeId || "GENERIC_ITEM") || "GENERIC_ITEM";
    const itemTypeProfile = typeof window.WS_APP.normalizeItemTypeProfile === "function"
      ? window.WS_APP.normalizeItemTypeProfile(itemType, definition.itemTypeProfile || {})
      : clone(definition.itemTypeProfile || {});
    const currentData = current.itemState?.data && typeof current.itemState.data === "object" && !Array.isArray(current.itemState.data)
      ? current.itemState.data
      : {};
    const requestedData = typeof statePatch === "function"
      ? statePatch(clone(currentData))
      : { ...clone(currentData), ...(statePatch && typeof statePatch === "object" && !Array.isArray(statePatch) ? clone(statePatch) : {}) };
    const itemState = typeof window.WS_APP.normalizeItemTypeState === "function"
      ? window.WS_APP.normalizeItemTypeState(itemType, requestedData, itemTypeProfile)
      : { schemaVersion: 1, typeId: itemType, data: clone(requestedData || {}) };
    const validation = typeof window.WS_APP.validateItemTypeState === "function"
      ? window.WS_APP.validateItemTypeState(itemType, itemState, itemTypeProfile)
      : { ok: true, errors: [] };
    if (!validation.ok) return { ok: false, reason: "ITEM_TYPE_STATE_INVALID", instanceId: id, validation };
    const result = updateItemInstance(id, { ...clone(current), itemState }, {
      ...options,
      source: options.source || "ITEM_TYPE_STATE_UPDATE"
    });
    return { ...result, itemType, itemState };
  }

  function updateItemInstanceFromView(citizenId = "", view = {}, options = {}) {
    const id = normalizeId(view.instanceId || view.id || view.itemId);
    if (!id) return { ok: false, reason: "INSTANCE_ID_REQUIRED" };
    const current = itemInstancesById[id];
    if (!current) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND", instanceId: id };
    const requestedOwnerId = normalizeId(citizenId || view.ownerId || current.ownerId);
    if (current.ownerId && requestedOwnerId && current.ownerId !== requestedOwnerId) {
      return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH", instanceId: id };
    }
    const normalized = normalizeItemInstance({ ...clone(view), instanceId: id, ownerId: requestedOwnerId }, 0, { ownerId: requestedOwnerId });
    const next = { ...itemInstancesById, [id]: normalized };
    const result = commitNextStore(next, {
      citizenId: normalized.ownerId,
      instanceId: id,
      source: options.source || "ITEM_VIEW_UPDATE",
      deferPersistence: options.deferPersistence === true,
      skipCitizenEvent: options.skipCitizenEvent === true,
      skipItemEvent: options.skipItemEvent === true,
      skipModuleRefresh: options.skipModuleRefresh === true,
      skipProfileRefresh: options.skipProfileRefresh === true
    });
    return { ...result, instance: result.ok ? clone(normalized) : null, item: result.ok ? getItemInstanceView(id) : null };
  }

  function updateItemInstancesFromViews(citizenId = "", views = [], options = {}) {
    const ownerId = normalizeId(citizenId);
    if (!ownerId || !Array.isArray(views) || !views.length) return { ok: false, reason: "INVALID_ITEM_INSTANCE_BATCH" };
    const next = { ...itemInstancesById };
    const updatedIds = [];
    const seenIds = new Set();
    for (let index = 0; index < views.length; index += 1) {
      const view = views[index];
      const id = normalizeId(view?.instanceId || view?.id || view?.itemId);
      const current = itemInstancesById[id];
      if (!id || !current) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND", instanceId: id };
      if (seenIds.has(id)) return { ok: false, reason: "DUPLICATE_INSTANCE_ID", instanceId: id };
      if (current.ownerId && current.ownerId !== ownerId) return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH", instanceId: id };
      seenIds.add(id);
      const normalized = normalizeItemInstance({ ...clone(view), instanceId: id, ownerId }, index, { ownerId });
      if (!normalized) return { ok: false, reason: "INVALID_ITEM_INSTANCE_VIEW", instanceId: id };
      normalized.instanceId = id;
      next[id] = normalized;
      updatedIds.push(id);
    }
    const result = commitNextStore(next, {
      citizenId: ownerId,
      instanceIds: updatedIds,
      source: options.source || "ITEM_VIEW_BATCH_UPDATE",
      deferPersistence: options.deferPersistence === true,
      skipCitizenEvent: options.skipCitizenEvent === true,
      skipItemEvent: options.skipItemEvent === true,
      skipModuleRefresh: options.skipModuleRefresh === true,
      skipProfileRefresh: options.skipProfileRefresh === true
    });
    return {
      ...result,
      instances: result.ok ? updatedIds.map((id) => getItemInstanceById(id)).filter(Boolean) : [],
      items: result.ok ? updatedIds.map((id) => getItemInstanceView(id)).filter(Boolean) : []
    };
  }

  function replaceCitizenItemInstances(citizenId = "", views = [], options = {}) {
    const ownerId = normalizeId(citizenId);
    if (!ownerId || !Array.isArray(views)) return { ok: false, reason: "INVALID_CITIZEN_ITEM_REPLACEMENT" };
    const scope = normalizeToken(options.scope || "EQUIPMENT");
    const next = Object.create(null);
    Object.values(itemInstancesById).forEach((instance) => {
      const owned = instance.ownerId === ownerId;
      const inScope = scope === "ALL"
        ? owned
        : scope === "BODY"
          ? owned && instance.location?.type === "BODY"
          : scope === "NON_BODY"
            ? owned && instance.location?.type !== "BODY"
            : owned && EQUIPMENT_LOCATION_TYPES.has(instance.location?.type);
      if (!inScope) next[instance.instanceId] = clone(instance);
    });
    const seenIds = new Set();
    for (let index = 0; index < views.length; index += 1) {
      const view = views[index];
      const normalized = normalizeItemInstance({ ...clone(view), ownerId }, index, { ownerId });
      const id = normalizeId(normalized?.instanceId);
      if (!id) return { ok: false, reason: "INSTANCE_ID_REQUIRED" };
      if (seenIds.has(id)) return { ok: false, reason: "DUPLICATE_INSTANCE_ID", instanceId: id };
      const existing = itemInstancesById[id];
      if (existing?.ownerId && existing.ownerId !== ownerId) return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH", instanceId: id };
      const isTypeInScope = (locationType) => scope === "ALL"
        || (scope === "BODY" && locationType === "BODY")
        || (scope === "NON_BODY" && locationType !== "BODY")
        || (scope === "EQUIPMENT" && EQUIPMENT_LOCATION_TYPES.has(locationType));
      if (existing && !isTypeInScope(existing.location?.type)) {
        return { ok: false, reason: "ITEM_INSTANCE_SOURCE_SCOPE_MISMATCH", instanceId: id, scope, locationType: existing.location?.type };
      }
      const locationType = normalized.location?.type;
      if (!isTypeInScope(locationType)) return { ok: false, reason: "ITEM_INSTANCE_SCOPE_MISMATCH", instanceId: id, scope, locationType };
      seenIds.add(id);
      next[id] = normalized;
    }
    const result = commitNextStore(next, {
      citizenId: ownerId,
      source: options.source || `ITEM_REPLACE_${scope}`,
      skipCitizenEvent: options.skipCitizenEvent === true,
      skipItemEvent: options.skipItemEvent === true,
      skipModuleRefresh: options.skipModuleRefresh === true,
      skipProfileRefresh: options.skipProfileRefresh === true,
      deferPersistence: options.deferPersistence === true
    });
    return {
      ...result,
      items: result.ok
        ? scope === "EQUIPMENT"
          ? getCitizenEquipmentItemInstanceViews(ownerId)
          : getCitizenItemInstanceViews(ownerId, { includeBody: true })
        : []
    };
  }

  function replaceCitizenInstalledCyberware(citizenId = "", views = [], options = {}) {
    return replaceCitizenItemInstances(citizenId, views, { ...options, scope: "BODY", source: options.source || "CYBERWARE_REPLACE" });
  }

  function removeItemInstance(instanceId = "", options = {}) {
    const id = normalizeId(instanceId);
    const current = itemInstancesById[id];
    if (!current) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND" };
    const next = { ...itemInstancesById };
    delete next[id];
    const result = commitNextStore(next, {
      citizenId: current.ownerId,
      instanceId: id,
      source: options.source || "ITEM_REMOVE",
      deferPersistence: options.deferPersistence === true,
      skipCitizenEvent: options.skipCitizenEvent === true,
      skipItemEvent: options.skipItemEvent === true,
      skipModuleRefresh: options.skipModuleRefresh === true,
      skipProfileRefresh: options.skipProfileRefresh === true
    });
    return { ...result, removed: result.ok ? clone(current) : null };
  }

  function exportItemInstances() {
    return getItemInstances({ includeDisposed: true });
  }

  function importItemInstances(items = []) {
    if (!Array.isArray(items)) return null;
    const validation = setStore(items, { persist: true });
    if (!validation.valid) return null;
    emitUpdate({ source: "ITEM_IMPORT" });
    return getItemInstances({ includeDisposed: true });
  }

  function resetItemInstanceStore() {
    cancelScheduledItemStorePersistence();
    itemStorePersistenceDirty = false;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("W&S item instance store could not clear localStorage.", error);
    }
    const seeds = Array.isArray(window.APP_DATA?.itemInstances) ? window.APP_DATA.itemInstances : [];
    const validation = setStore(seeds, { persist: true });
    emitUpdate({ source: "ITEM_RESET" });
    return validation;
  }

  function initItemInstanceStore() {
    const seeds = Array.isArray(window.APP_DATA?.itemInstances) ? window.APP_DATA.itemInstances : [];
    const stored = readStoredPayload();
    return setStore(stored || seeds, { persist: true });
  }

  window.addEventListener?.("pagehide", flushScheduledItemStorePersistence);
  document.addEventListener?.("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushScheduledItemStorePersistence();
  });

  Object.assign(window.WS_APP, {
    ITEM_INSTANCE_SCHEMA_VERSION: SCHEMA_VERSION,
    ITEM_INSTANCE_SEED_VERSION: SEED_VERSION,
    ITEM_INSTANCE_PLAYER_LABEL_MAX_LENGTH: PLAYER_LABEL_MAX_LENGTH,
    getItemInstanceStoreRevision,
    normalizeItemPlayerLabel,
    normalizeItemInstance,
    normalizeItemLocation,
    validateItemInstances,
    getItemInstances,
    getItemInstanceById,
    getItemInstanceView,
    getItemInstanceCatalogName,
    getItemInstanceDisplayName,
    getCitizenItemInstances,
    getCitizenItemInstanceViews,
    getCitizenEquipmentItemInstances,
    getEquipmentInstanceSummary,
    getCitizenEquipmentItemInstanceViews,
    getInstalledCyberwareInstances,
    getInstalledCyberwareInstanceViews,
    isCyberwareInstance,
    isCyberwareItemView: isCyberwareView,
    createItemInstance,
    updateItemInstance,
    renameItemInstance,
    updateItemTypeState,
    updateItemInstanceFromView,
    updateItemInstancesFromViews,
    previewItemInstanceMutationPlan,
    commitItemInstanceMutationPlan,
    restoreItemInstanceSnapshots,
    itemSnapshotsEqual,
    replaceCitizenItemInstances,
    replaceCitizenInstalledCyberware,
    commitItemInstanceGridPlacement,
    commitCitizenEquipmentGridPlacement: commitItemInstanceGridPlacement,
    commitCitizenHousingGridPlacement,
    flushScheduledItemStorePersistence,
    removeItemInstance,
    exportItemInstances,
    importItemInstances,
    resetItemInstanceStore,
    initItemInstanceStore
  });

  initItemInstanceStore();
})();
