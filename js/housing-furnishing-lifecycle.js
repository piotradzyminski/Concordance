window.WS_APP = window.WS_APP || {};

(function initHousingFurnishingLifecycleRuntime() {
  "use strict";

  const app = window.WS_APP;
  const API_VERSION = "housing_furnishing_lifecycle_4_0x";
  const SOURCE_DOMAIN = "HOUSING_FURNISHING";
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const OWNERSHIP_TYPES = new Set(["FIXED_FIXTURE", "RENTAL_FURNISHING", "CITIZEN_FURNISHING"]);
  const registry = window.APP_DATA?.housingFurnishingLifecycle || {};
  let commandSequence = 0;
  let locationAnchorCommitActive = false;

  if (app.HousingFurnishingLifecycle?.version === API_VERSION) return;

  function clone(value) {
    if (value == null) return value;
    try { return structuredClone(value); }
    catch (_) { return JSON.parse(JSON.stringify(value)); }
  }

  function id(value = "") { return String(value || "").trim(); }
  function token(value = "") { return id(value).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
  function slug(value = "") { return id(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item"; }
  function nowCampaignIso() { return id(app.getCampaignTimeIso?.() || app.CAMPAIGN_TIME_ISO || new Date().toISOString()); }
  function clamp(value, min = 0, max = 100) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min;
  }
  function uniqueTokens(values = []) { return [...new Set((Array.isArray(values) ? values : []).map(token).filter(Boolean))]; }
  function nextKey(prefix = "housing-furnishing") {
    commandSequence += 1;
    return `${prefix}:${Date.now()}:${commandSequence}`;
  }

  function getRawLifecycle(instance = {}) {
    const source = instance?.instanceData?.householdLifecycle;
    return source && typeof source === "object" && !Array.isArray(source) ? clone(source) : {};
  }

  function labelFromCode(code = "") {
    return token(code).toLowerCase().split("_").filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ") || "Household Fixture";
  }

  function inferCapabilities(code = "") {
    const value = token(code);
    const capabilities = [];
    if (/BED|SLEEP|BERTH|SUITE|BEDROOM/.test(value)) capabilities.push("SLEEP", "REST");
    if (/TOILET|WASH|WET|BATH|SANITARY|HYGIENE/.test(value)) capabilities.push("HYGIENE");
    if (/KITCHEN|COOK|PREPARATION|SERVICE_WALL/.test(value)) capabilities.push("FOOD_PREP");
    if (/REFRIGERATOR|COLD/.test(value)) capabilities.push("COLD_STORAGE", "FOOD_STORAGE");
    if (/WARDROBE|STORAGE|LOCKER|SERVICE_ROOM/.test(value)) capabilities.push("STORAGE");
    if (/WORK|OFFICE|TABLE|SURFACE/.test(value)) capabilities.push("WORKSPACE");
    if (/DISPLAY/.test(value)) capabilities.push("DISPLAY");
    if (/DELIVERY|LOGISTICS|FREIGHT/.test(value)) capabilities.push("DELIVERY_INTAKE");
    if (/GUEST|VISITOR/.test(value)) capabilities.push("GUEST_ACCESS");
    return uniqueTokens(capabilities);
  }

  function inferFurnishingClass(code = "") {
    const value = token(code);
    if (/BED|SLEEP|BERTH|SUITE|BEDROOM/.test(value)) return "REST";
    if (/REFRIGERATOR|COLD/.test(value)) return "COLD_STORAGE";
    if (/WARDROBE|LOCKER|STORAGE/.test(value)) return "STORAGE";
    if (/TABLE|SURFACE|WORK|OFFICE/.test(value)) return "UTILITY_SURFACE";
    if (/DISPLAY/.test(value)) return "DISPLAY";
    if (/TOILET|WASH|WET|BATH|SANITARY|HYGIENE/.test(value)) return "HYGIENE";
    if (/KITCHEN|COOK|PREPARATION|SERVICE_WALL/.test(value)) return "FOOD_SERVICE";
    if (/DELIVERY|LOGISTICS|FREIGHT/.test(value)) return "LOGISTICS";
    return "FIXTURE";
  }

  function inferFootprint(code = "") {
    const value = token(code);
    if (/DOUBLE.*BED|PREMIUM_BED|PRIMARY_BED|GUEST_BED/.test(value)) return { width: 3, height: 3 };
    if (/BED|BERTH/.test(value)) return { width: 2, height: 3 };
    if (/TABLE|WORK_SURFACE|WORKSTATION/.test(value)) return { width: 2, height: 2 };
    if (/REFRIGERATOR|WARDROBE|LOCKER/.test(value)) return { width: 1, height: 2 };
    return { width: 1, height: 1 };
  }

  function inferSlots(code = "", furnishingClass = "") {
    const value = token(code);
    const slots = [];
    if (furnishingClass === "REST") {
      slots.push({ slotId: "storage-1", slotType: "STORAGE", acceptedModuleIds: ["eqcat-household-underbed-storage-module"] });
      slots.push({ slotId: "comfort-1", slotType: "COMFORT", acceptedModuleIds: ["eqcat-household-acoustic-canopy-module"] });
    }
    if (furnishingClass === "STORAGE") {
      slots.push({ slotId: "security-1", slotType: "SECURITY", acceptedModuleIds: ["eqcat-household-secure-lock-module"] });
      slots.push({ slotId: "display-1", slotType: "DISPLAY", acceptedModuleIds: ["eqcat-household-display-rail-module"] });
    }
    if (furnishingClass === "UTILITY_SURFACE") {
      slots.push({ slotId: "utility-1", slotType: "UTILITY", acceptedModuleIds: ["eqcat-household-terminal-dock-module"] });
    }
    if (/MEDICAL|CLINICAL/.test(value)) {
      slots.push({ slotId: "utility-1", slotType: "UTILITY", acceptedModuleIds: ["eqcat-household-cold-compartment-module"] });
    }
    return slots;
  }

  function getDefinitionProfile(instanceOrDefinitionId = {}, housingRecord = null) {
    const instance = typeof instanceOrDefinitionId === "object" ? instanceOrDefinitionId : null;
    const definitionId = id(instance?.definitionId || instanceOrDefinitionId);
    const direct = registry.definitionProfiles?.[definitionId];
    if (direct) return clone(direct);
    const instanceData = instance?.instanceData || {};
    const profile = instanceData.householdLifecycleProfile && typeof instanceData.householdLifecycleProfile === "object"
      ? clone(instanceData.householdLifecycleProfile)
      : {};
    const code = token(profile.fixtureCode || instanceData.fixtureCode || definitionId.split(":").pop());
    const furnishingClass = token(profile.furnishingClass || instanceData.householdProfile?.furnishingClass || inferFurnishingClass(code));
    const capabilities = uniqueTokens(profile.capabilities?.length ? profile.capabilities : instanceData.householdProfile?.capabilities?.length ? instanceData.householdProfile.capabilities : inferCapabilities(code));
    return {
      furnishingClass,
      defaultGrade: token(profile.defaultGrade || housingRecord?.defaultFurnishingGrade || "STANDARD"),
      essentialCapabilities: uniqueTokens(profile.essentialCapabilities?.length ? profile.essentialCapabilities : capabilities.slice(0, 1)),
      optionalCapabilities: uniqueTokens(profile.optionalCapabilities?.length ? profile.optionalCapabilities : capabilities.slice(1)),
      slots: Array.isArray(profile.slots) ? clone(profile.slots) : inferSlots(code, furnishingClass),
      footprint: profile.footprint || instanceData.householdProfile?.footprint || `${inferFootprint(code).width}x${inferFootprint(code).height}`,
      nonBlocking: profile.nonBlocking === true || instanceData.householdProfile?.nonBlocking === true,
      movable: profile.movable !== false && instanceData.householdProfile?.movable !== false
    };
  }

  function getOwnershipType(instance = {}) {
    const explicit = token(getRawLifecycle(instance).ownershipType || instance?.flags?.housingOwnershipType);
    if (OWNERSHIP_TYPES.has(explicit)) return explicit;
    const definitionId = id(instance.definitionId);
    if (definitionId.startsWith("housing-fixture:")) return "FIXED_FIXTURE";
    if (definitionId.startsWith("housing-rental:")) return "RENTAL_FURNISHING";
    return "CITIZEN_FURNISHING";
  }

  function getCondition(instance = {}) { return clamp(instance?.durability?.current ?? instance?.condition ?? 100, 0, 100); }
  function getConditionState(instance = {}) {
    const condition = getCondition(instance);
    if (condition <= 0) return "BROKEN";
    if (condition <= 30) return "DAMAGED";
    if (condition <= 60) return "WORN";
    return "OPERATIONAL";
  }

  function getGrade(instance = {}, housingRecord = null) {
    const lifecycle = getRawLifecycle(instance);
    const profile = getDefinitionProfile(instance, housingRecord);
    return token(lifecycle.grade || instance?.flags?.housingFurnishingGrade || profile.defaultGrade || housingRecord?.defaultFurnishingGrade || "STANDARD");
  }

  function getWeeklyWearPercent(instance = {}, housingRecord = null) {
    const grade = getGrade(instance, housingRecord);
    return Number(app.getHousingFurnishingWeeklyWearPercent?.(grade) || 0);
  }

  function getInstalledModules(parentInstanceId = "") {
    const parentId = id(parentInstanceId);
    return (app.getItemInstances?.({ includeDisposed: false }) || [])
      .filter((instance) => token(instance?.location?.type) === "INSTALLED_IN_ITEM" && id(instance.location.parentItemInstanceId) === parentId)
      .map(clone);
  }

  function getUpgradeProfile(moduleOrDefinitionId = {}) {
    const module = typeof moduleOrDefinitionId === "object" ? moduleOrDefinitionId : null;
    const definitionId = id(module?.definitionId || moduleOrDefinitionId);
    const direct = registry.upgradeProfiles?.[definitionId];
    if (direct) return { definitionId, ...clone(direct) };
    const source = module?.instanceData?.householdUpgradeProfile;
    return source && typeof source === "object" ? { definitionId, ...clone(source) } : null;
  }

  function getFurnishingSlots(instance = {}, housingRecord = null) {
    const profile = getDefinitionProfile(instance, housingRecord);
    const installed = getInstalledModules(instance.instanceId);
    return (profile.slots || []).map((slot) => {
      const installedModule = installed.find((module) => id(module.location?.moduleSlotId) === id(slot.slotId)) || null;
      return {
        slotId: id(slot.slotId),
        slotType: token(slot.slotType),
        acceptedModuleIds: (slot.acceptedModuleIds || []).map(id).filter(Boolean),
        installedModule
      };
    });
  }

  function getEffectiveCapabilities(instance = {}, housingRecord = null) {
    const profile = getDefinitionProfile(instance, housingRecord);
    const state = getConditionState(instance);
    let capabilities = [];
    if (state === "OPERATIONAL" || state === "WORN") capabilities = [...profile.essentialCapabilities, ...profile.optionalCapabilities];
    else if (state === "DAMAGED") capabilities = [...profile.essentialCapabilities];
    getInstalledModules(instance.instanceId).forEach((module) => {
      const upgrade = getUpgradeProfile(module);
      if (upgrade && state !== "BROKEN") capabilities.push(...(upgrade.capabilities || []));
    });
    return uniqueTokens(capabilities);
  }

  function getProjection(instanceOrId = {}, housingRecord = null) {
    const instance = typeof instanceOrId === "string" ? app.getItemInstanceById?.(instanceOrId) : instanceOrId;
    if (!instance) return null;
    const lifecycle = getRawLifecycle(instance);
    const definition = getDefinitionProfile(instance, housingRecord);
    const ownershipType = getOwnershipType(instance);
    const condition = getCondition(instance);
    const conditionState = getConditionState(instance);
    const slots = getFurnishingSlots(instance, housingRecord);
    return {
      schemaVersion: API_VERSION,
      instanceId: id(instance.instanceId),
      ownershipType,
      operatorId: id(lifecycle.operatorId),
      housingRecordId: id(lifecycle.housingRecordId || instance.location?.housingRecordId),
      fixtureCode: token(lifecycle.fixtureCode || instance.instanceData?.fixtureCode),
      furnishingClass: token(definition.furnishingClass),
      grade: getGrade(instance, housingRecord),
      weeklyWearPercent: getWeeklyWearPercent(instance, housingRecord),
      condition,
      conditionState,
      movable: ownershipType === "CITIZEN_FURNISHING" && definition.movable !== false,
      replaceable: ownershipType === "CITIZEN_FURNISHING",
      repairable: ownershipType === "CITIZEN_FURNISHING" && condition < 100 && token(instance.lifecycleState) !== "DISPOSED",
      serviceRequired: ownershipType !== "CITIZEN_FURNISHING" && condition < 100 && token(instance.lifecycleState) !== "DISPOSED",
      disposable: ownershipType === "CITIZEN_FURNISHING" && token(instance.lifecycleState) !== "DISPOSED",
      nonBlocking: definition.nonBlocking === true,
      slots,
      capabilities: getEffectiveCapabilities(instance, housingRecord),
      baseCapabilities: uniqueTokens([...definition.essentialCapabilities, ...definition.optionalCapabilities]),
      lastWearAt: id(lifecycle.lastWearAt),
      lastServiceAt: id(lifecycle.lastServiceAt)
    };
  }

  function getHousingRecord(citizenId = "", housingRecordId = "") {
    const citizen = app.getCitizenById?.(id(citizenId));
    const records = Array.isArray(citizen?.housing) ? citizen.housing : [];
    return records.find((record) => id(record?.id) === id(housingRecordId)) || null;
  }

  function buildLifecyclePatch(instance = {}, housingRecord = null, overrides = {}) {
    const current = getRawLifecycle(instance);
    const ownershipType = token(overrides.ownershipType || current.ownershipType || getOwnershipType(instance));
    const grade = token(overrides.grade || current.grade || getGrade(instance, housingRecord));
    return {
      ...current,
      schemaVersion: API_VERSION,
      ownershipType: OWNERSHIP_TYPES.has(ownershipType) ? ownershipType : "CITIZEN_FURNISHING",
      operatorId: id(overrides.operatorId ?? current.operatorId ?? (ownershipType === "CITIZEN_FURNISHING" ? "" : housingRecord?.provider || "HOUSING_OPERATOR")),
      housingRecordId: id(overrides.housingRecordId ?? current.housingRecordId ?? housingRecord?.id ?? instance.location?.housingRecordId),
      fixtureCode: token(overrides.fixtureCode ?? current.fixtureCode ?? instance.instanceData?.fixtureCode),
      grade,
      lastWearAt: id(overrides.lastWearAt ?? current.lastWearAt ?? nowCampaignIso()),
      lastServiceAt: id(overrides.lastServiceAt ?? current.lastServiceAt),
      disposedForCredits: overrides.disposedForCredits === true || current.disposedForCredits === true
    };
  }

  function getAnchorForFixture(household = {}, fixtureCode = "") {
    const anchors = Array.isArray(household?.fixedFixtureAnchors) ? household.fixedFixtureAnchors : [];
    return anchors.find((anchor) => token(anchor.fixtureId) === token(fixtureCode)) || anchors[0] || null;
  }

  function parseCell(value = "1:1") {
    const match = id(value).match(/^(\d+):(\d+)$/);
    return match ? { gridX: Number(match[1]), gridY: Number(match[2]) } : { gridX: 1, gridY: 1 };
  }

  function syntheticInstance(citizen = {}, record = {}, code = "", ownershipType = "FIXED_FIXTURE", index = 0, storagePlacement = null) {
    const fixtureCode = token(code);
    const furnishingClass = inferFurnishingClass(fixtureCode);
    const capabilities = inferCapabilities(fixtureCode);
    const footprint = inferFootprint(fixtureCode);
    const isFixed = ownershipType === "FIXED_FIXTURE";
    const anchor = isFixed ? getAnchorForFixture(record.household, fixtureCode) : null;
    const cell = parseCell(anchor?.anchorCell || "1:1");
    const instanceId = `housing-${isFixed ? "fixture" : "rental"}-${slug(record.id)}-${slug(fixtureCode)}-${index + 1}`;
    const location = isFixed
      ? {
          type: "HOUSING_ROOM",
          housingRecordId: id(record.id),
          roomId: id(anchor?.roomId || record.household?.rooms?.[0]?.id),
          gridX: cell.gridX,
          gridY: cell.gridY,
          rotation: 0
        }
      : storagePlacement || { type: "UNPLACED", characterId: id(citizen.id) };
    return {
      instanceId,
      definitionId: `housing-${isFixed ? "fixture" : "rental"}:${fixtureCode}`,
      schemaVersion: 3,
      ownerId: id(citizen.id),
      quantity: 1,
      lifecycleState: location.type === "UNPLACED" ? "STORED" : "UNPACKAGED",
      location,
      durability: { current: 100, maximumOverride: null },
      flags: {
        housingOwnershipType: ownershipType,
        housingFurnishingGrade: token(record.defaultFurnishingGrade || "STANDARD")
      },
      acquisition: {
        sourceType: "HOUSING_RENT_ALLOCATION",
        sourceId: id(record.linkedSubscriptionId || record.id),
        acquiredAt: nowCampaignIso()
      },
      serviceHistory: [],
      instanceData: {
        name: labelFromCode(fixtureCode),
        category: "HOUSEHOLD",
        itemType: "HOUSEHOLD_FURNISHING",
        fixtureCode,
        footprint: `${footprint.width}x${footprint.height}`,
        tags: ["HOUSEHOLD", isFixed ? "FIXED_FIXTURE" : "RENTAL_FURNISHING"],
        householdProfile: {
          placeable: !isFixed,
          movable: !isFixed,
          nonBlocking: isFixed,
          footprint: `${footprint.width}x${footprint.height}`,
          furnishingClass,
          capabilities
        },
        householdLifecycleProfile: {
          fixtureCode,
          furnishingClass,
          defaultGrade: token(record.defaultFurnishingGrade || "STANDARD"),
          essentialCapabilities: capabilities.slice(0, 1),
          optionalCapabilities: capabilities.slice(1),
          slots: inferSlots(fixtureCode, furnishingClass),
          footprint: `${footprint.width}x${footprint.height}`,
          nonBlocking: isFixed,
          movable: !isFixed
        },
        householdLifecycle: {
          schemaVersion: API_VERSION,
          ownershipType,
          operatorId: id(record.provider || "HOUSING_OPERATOR"),
          housingRecordId: id(record.id),
          fixtureCode,
          grade: token(record.defaultFurnishingGrade || "STANDARD"),
          lastWearAt: nowCampaignIso(),
          lastServiceAt: "",
          disposedForCredits: false
        }
      }
    };
  }

  function getInstanceFootprint(instance = {}) {
    const projection = getProjection(instance);
    const profile = getDefinitionProfile(instance);
    const match = id(profile.footprint || instance.instanceData?.footprint || "1x1").match(/^(\d+)x(\d+)$/i);
    if (match) return { width: Number(match[1]), height: Number(match[2]) };
    return projection?.nonBlocking ? { width: 0, height: 0 } : { width: 1, height: 1 };
  }

  function getStoragePlacement(record = {}, citizenId = "", footprint = { width: 1, height: 1 }, excludeIds = [], stagedItems = []) {
    const excluded = new Set(excludeIds.map(id));
    const units = (Array.isArray(record.storageUnits) ? record.storageUnits : []).filter((unit) => unit && unit.retiring !== true);
    const items = [...(app.getCitizenEquipmentItemInstances?.(citizenId) || []), ...(Array.isArray(stagedItems) ? stagedItems : [])];
    for (const unit of units) {
      const width = Math.max(1, Number(unit.width || 1));
      const height = Math.max(1, Number(unit.height || 1));
      const occupied = new Set();
      items.forEach((item) => {
        if (excluded.has(id(item.instanceId)) || token(item.location?.type) !== "HOUSING_STORAGE" || id(item.location.storageUnitId) !== id(unit.id)) return;
        const itemFootprint = getInstanceFootprint(item);
        const rotated = Number(item.location.rotation) === 90;
        const w = rotated ? itemFootprint.height : itemFootprint.width;
        const h = rotated ? itemFootprint.width : itemFootprint.height;
        for (let y = Number(item.location.gridY || 1); y < Number(item.location.gridY || 1) + h; y += 1) {
          for (let x = Number(item.location.gridX || 1); x < Number(item.location.gridX || 1) + w; x += 1) occupied.add(`${x}:${y}`);
        }
      });
      const rotations = [{ width: footprint.width, height: footprint.height, rotation: 0 }];
      if (footprint.width !== footprint.height) rotations.push({ width: footprint.height, height: footprint.width, rotation: 90 });
      for (const shape of rotations) {
        for (let y = 1; y <= height - shape.height + 1; y += 1) {
          for (let x = 1; x <= width - shape.width + 1; x += 1) {
            let free = true;
            for (let yy = y; yy < y + shape.height && free; yy += 1) {
              for (let xx = x; xx < x + shape.width; xx += 1) if (occupied.has(`${xx}:${yy}`)) { free = false; break; }
            }
            if (free) return { type: "HOUSING_STORAGE", housingRecordId: id(record.id), storageUnitId: id(unit.id), gridX: x, gridY: y, rotation: shape.rotation };
          }
        }
      }
    }
    return null;
  }

  function reconcileHousingUnitFurnishings(citizenId = "", housingRecordId = "", options = {}) {
    const citizen = app.getCitizenById?.(id(citizenId));
    if (!citizen) return { ok: false, reason: "CITIZEN_NOT_FOUND" };
    const record = (Array.isArray(citizen.housing) ? citizen.housing : []).find((entry) => id(entry?.id) === id(housingRecordId));
    if (!record) return { ok: false, reason: "HOUSING_RECORD_NOT_FOUND" };
    const existing = app.getCitizenItemInstances?.(citizen.id, { includeBody: true, includeDisposed: true }) || [];
    const existingById = new Map(existing.map((instance) => [id(instance.instanceId), instance]));
    const operations = [];

    existing.filter((instance) => {
      const locationType = token(instance.location?.type);
      const lifecycle = getRawLifecycle(instance);
      return ["HOUSING_STORAGE", "HOUSING_ROOM"].includes(locationType)
        && (id(lifecycle.housingRecordId) === id(record.id)
          || id(instance.location?.housingRecordId) === id(record.id)
          || (locationType === "HOUSING_STORAGE" && (record.storageUnits || []).some((unit) => id(unit.id) === id(instance.location.storageUnitId))));
    }).forEach((instance) => {
      const lifecycle = buildLifecyclePatch(instance, record, { ownershipType: getOwnershipType(instance), housingRecordId: record.id });
      if (JSON.stringify(lifecycle) !== JSON.stringify(getRawLifecycle(instance))) {
        operations.push({ type: "PATCH", instanceId: instance.instanceId, patch: { instanceData: { ...(instance.instanceData || {}), householdLifecycle: lifecycle } } });
      }
    });

    if (record.archived !== true && token(record.status) !== "RELEASED" && token(record.layoutPolicy) !== "ASSIGNED_BEDSPACE") {
      const desired = [
        ...(record.fixedFixtures || []).map((code, index) => ({ code, ownershipType: "FIXED_FIXTURE", index })),
        ...(record.rentalFurnishings || []).map((code, index) => ({ code, ownershipType: "RENTAL_FURNISHING", index }))
      ];
      const stagedInstances = [];
      desired.forEach((entry) => {
        const expectedId = `housing-${entry.ownershipType === "FIXED_FIXTURE" ? "fixture" : "rental"}-${slug(record.id)}-${slug(entry.code)}-${entry.index + 1}`;
        if (existingById.has(expectedId)) return;
        const footprint = inferFootprint(entry.code);
        const placement = entry.ownershipType === "RENTAL_FURNISHING" ? getStoragePlacement(record, citizen.id, footprint, [], stagedInstances) : null;
        const instance = syntheticInstance(citizen, record, entry.code, entry.ownershipType, entry.index, placement);
        stagedInstances.push(instance);
        operations.push({ type: "CREATE", instanceId: instance.instanceId, instance });
      });
    }

    existing.filter((instance) => {
      const lifecycle = getRawLifecycle(instance);
      return id(lifecycle.housingRecordId) === id(record.id)
        && ["FIXED_FIXTURE", "RENTAL_FURNISHING"].includes(token(lifecycle.ownershipType))
        && (record.archived === true || token(record.status) === "RELEASED")
        && token(instance.lifecycleState) !== "DISPOSED";
    }).forEach((instance) => operations.push({
      type: "MOVE",
      instanceId: instance.instanceId,
      toLocation: { type: "DESTROYED" },
      lifecycleState: "DISPOSED",
      patch: { disposedAt: nowCampaignIso(), disposedBy: SOURCE_DOMAIN, disposeReason: "HOUSING_UNIT_RELEASED" }
    }));

    if (!operations.length) return { ok: true, noChange: true, housingRecordId: record.id };
    const result = app.commitItemInstanceTransaction?.({
      idempotencyKey: options.idempotencyKey || `housing-furnishing:reconcile:${citizen.id}:${record.id}:${app.getItemInstanceStoreRevision?.() || 0}`,
      sourceDomain: SOURCE_DOMAIN,
      sourceRefId: record.id,
      citizenId: citizen.id,
      operations,
      changedDomains: ["ITEM_INSTANCE", "HOUSING_FURNISHING"],
      metadata: { operationType: "HOUSING_FURNISHING_RECONCILE", housingRecordId: record.id }
    }) || { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_API_REQUIRED" };
    return { ...result, housingRecordId: record.id, operationCount: operations.length };
  }

  function reconcileCitizenHousingFurnishings(citizenId = "", options = {}) {
    const citizen = app.getCitizenById?.(id(citizenId));
    if (!citizen) return { ok: false, reason: "CITIZEN_NOT_FOUND", results: [] };
    const results = (Array.isArray(citizen.housing) ? citizen.housing : []).map((record) => reconcileHousingUnitFurnishings(citizen.id, record.id, options));
    return { ok: results.every((result) => result.ok !== false), citizenId: citizen.id, results };
  }

  function reconcileAllHousingFurnishings(options = {}) {
    const results = (app.getCitizens?.() || []).filter((citizen) => citizen?.recordType !== "admin").map((citizen) => reconcileCitizenHousingFurnishings(citizen.id, options));
    return { ok: results.every((result) => result.ok !== false), results };
  }

  function processHousingFurnishingWear(input = {}) {
    const currentTimeIso = id(input.currentTimeIso || input.campaignTimeIso || nowCampaignIso());
    const currentMs = Date.parse(currentTimeIso);
    if (!Number.isFinite(currentMs)) return { ok: false, reason: "CAMPAIGN_TIME_INVALID" };
    const operations = [];
    const receipts = [];
    (app.getItemInstances?.({ includeDisposed: false }) || []).forEach((instance) => {
      if (token(instance.location?.type) !== "HOUSING_ROOM") return;
      const lifecycle = buildLifecyclePatch(instance, getHousingRecord(instance.ownerId, instance.location?.housingRecordId));
      const anchorMs = Date.parse(lifecycle.lastWearAt || currentTimeIso);
      if (!Number.isFinite(anchorMs)) return;
      const weeks = Math.floor((currentMs - anchorMs) / WEEK_MS);
      if (weeks <= 0) return;
      const rate = getWeeklyWearPercent(instance, getHousingRecord(instance.ownerId, instance.location?.housingRecordId));
      const previousCondition = getCondition(instance);
      const nextCondition = clamp(previousCondition - rate * weeks, 0, 100);
      const nextAnchor = new Date(anchorMs + weeks * WEEK_MS).toISOString();
      const nextLifecycle = { ...lifecycle, lastWearAt: nextAnchor };
      const history = Array.isArray(instance.serviceHistory) ? [...instance.serviceHistory] : [];
      history.push({
        type: "HOUSEHOLD_WEEKLY_WEAR",
        occurredAt: currentTimeIso,
        weeks,
        grade: getGrade(instance),
        weeklyWearPercent: rate,
        conditionBefore: previousCondition,
        conditionAfter: nextCondition
      });
      operations.push({
        type: "PATCH",
        instanceId: instance.instanceId,
        patch: {
          durability: { ...(instance.durability || {}), current: nextCondition },
          instanceData: { ...(instance.instanceData || {}), householdLifecycle: nextLifecycle },
          serviceHistory: history
        }
      });
      receipts.push({ instanceId: instance.instanceId, weeks, rate, conditionBefore: previousCondition, conditionAfter: nextCondition });
    });
    if (!operations.length) return { ok: true, noChange: true, currentTimeIso, receipts: [] };
    const result = app.commitItemInstanceTransaction?.({
      idempotencyKey: input.idempotencyKey || `housing-furnishing:wear:${currentTimeIso}`,
      sourceDomain: SOURCE_DOMAIN,
      sourceRefId: currentTimeIso,
      citizenId: "",
      operations,
      changedDomains: ["ITEM_INSTANCE", "HOUSING_FURNISHING"],
      metadata: { operationType: "HOUSING_FURNISHING_WEEKLY_WEAR", currentTimeIso, receipts }
    }) || { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_API_REQUIRED" };
    return { ...result, currentTimeIso, receipts };
  }

  function getModuleCandidates(citizenId = "", parentInstanceId = "", slotId = "") {
    const parent = app.getItemInstanceById?.(id(parentInstanceId));
    if (!parent) return [];
    const slot = getFurnishingSlots(parent).find((entry) => id(entry.slotId) === id(slotId));
    if (!slot || slot.installedModule) return [];
    return (app.getCitizenItemInstances?.(citizenId, { includeBody: true, includeDisposed: false }) || [])
      .filter((instance) => token(instance.location?.type) === "HOUSING_STORAGE")
      .filter((instance) => {
        const upgrade = getUpgradeProfile(instance);
        return upgrade && token(upgrade.slotType) === slot.slotType && (!slot.acceptedModuleIds.length || slot.acceptedModuleIds.includes(id(instance.definitionId)));
      })
      .map(clone);
  }

  function installHousingFurnishingModule(input = {}) {
    const parent = app.getItemInstanceById?.(id(input.parentInstanceId));
    const module = app.getItemInstanceById?.(id(input.moduleInstanceId));
    if (!parent || !module) return { ok: false, reason: "FURNISHING_OR_MODULE_NOT_FOUND" };
    if (id(parent.ownerId) !== id(input.citizenId) || id(module.ownerId) !== id(input.citizenId)) return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH" };
    if (token(module.location?.type) !== "HOUSING_STORAGE") return { ok: false, reason: "HOUSEHOLD_MODULE_NOT_IN_STORAGE" };
    const slot = getFurnishingSlots(parent).find((entry) => id(entry.slotId) === id(input.slotId));
    if (!slot) return { ok: false, reason: "HOUSEHOLD_UPGRADE_SLOT_NOT_FOUND" };
    if (slot.installedModule) return { ok: false, reason: "HOUSEHOLD_UPGRADE_SLOT_OCCUPIED" };
    const upgrade = getUpgradeProfile(module);
    if (!upgrade || token(upgrade.slotType) !== slot.slotType || (slot.acceptedModuleIds.length && !slot.acceptedModuleIds.includes(id(module.definitionId)))) {
      return { ok: false, reason: "HOUSEHOLD_UPGRADE_INCOMPATIBLE" };
    }
    return app.commitItemInstanceTransaction?.({
      idempotencyKey: id(input.idempotencyKey) || nextKey(`housing-furnishing:install:${parent.instanceId}:${slot.slotId}`),
      sourceDomain: SOURCE_DOMAIN,
      sourceRefId: parent.instanceId,
      citizenId: id(input.citizenId),
      operations: [{ type: "MOVE", instanceId: module.instanceId, toLocation: { type: "INSTALLED_IN_ITEM", parentItemInstanceId: parent.instanceId, moduleSlotId: slot.slotId }, lifecycleState: "INSTALLED" }],
      changedDomains: ["ITEM_INSTANCE", "HOUSING_FURNISHING"],
      metadata: { operationType: "HOUSEHOLD_MODULE_INSTALL", parentInstanceId: parent.instanceId, slotId: slot.slotId }
    }) || { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_API_REQUIRED" };
  }

  function removeHousingFurnishingModule(input = {}) {
    const parent = app.getItemInstanceById?.(id(input.parentInstanceId));
    if (!parent) return { ok: false, reason: "FURNISHING_NOT_FOUND" };
    const slot = getFurnishingSlots(parent).find((entry) => id(entry.slotId) === id(input.slotId));
    const module = slot?.installedModule;
    if (!module) return { ok: false, reason: "HOUSEHOLD_UPGRADE_SLOT_EMPTY" };
    const record = getHousingRecord(input.citizenId, input.housingRecordId || parent.location?.housingRecordId || getRawLifecycle(parent).housingRecordId);
    if (!record) return { ok: false, reason: "HOUSING_RECORD_NOT_FOUND" };
    const placement = getStoragePlacement(record, input.citizenId, { width: 1, height: 1 }, [module.instanceId]);
    if (!placement) return { ok: false, reason: "HOUSING_STORAGE_CAPACITY_EXCEEDED" };
    return app.commitItemInstanceTransaction?.({
      idempotencyKey: id(input.idempotencyKey) || nextKey(`housing-furnishing:remove:${parent.instanceId}:${slot.slotId}`),
      sourceDomain: SOURCE_DOMAIN,
      sourceRefId: parent.instanceId,
      citizenId: id(input.citizenId),
      operations: [{ type: "MOVE", instanceId: module.instanceId, toLocation: placement, lifecycleState: "UNPACKAGED" }],
      changedDomains: ["ITEM_INSTANCE", "HOUSING_FURNISHING"],
      metadata: { operationType: "HOUSEHOLD_MODULE_REMOVE", parentInstanceId: parent.instanceId, slotId: slot.slotId }
    }) || { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_API_REQUIRED" };
  }

  function repairHousingFurnishing(input = {}) {
    const instance = app.getItemInstanceById?.(id(input.instanceId));
    if (!instance) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND" };
    if (id(instance.ownerId) !== id(input.citizenId)) return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH" };
    if (getOwnershipType(instance) !== "CITIZEN_FURNISHING") return { ok: false, reason: "HOUSEHOLD_OPERATOR_FURNISHING_REPAIR_REQUIRES_SERVICE" };
    if (token(instance.lifecycleState) === "DISPOSED") return { ok: false, reason: "ITEM_INSTANCE_DISPOSED" };
    const currentTimeIso = nowCampaignIso();
    const lifecycle = buildLifecyclePatch(instance, getHousingRecord(input.citizenId, instance.location?.housingRecordId || getRawLifecycle(instance).housingRecordId), { lastWearAt: currentTimeIso, lastServiceAt: currentTimeIso });
    const history = [...(Array.isArray(instance.serviceHistory) ? instance.serviceHistory : []), {
      type: "HOUSEHOLD_FURNISHING_REPAIR",
      occurredAt: currentTimeIso,
      conditionBefore: getCondition(instance),
      conditionAfter: 100,
      source: id(input.source || "HOUSEHOLD")
    }];
    return app.commitItemInstanceTransaction?.({
      idempotencyKey: id(input.idempotencyKey) || nextKey(`housing-furnishing:repair:${instance.instanceId}`),
      sourceDomain: SOURCE_DOMAIN,
      sourceRefId: instance.instanceId,
      citizenId: id(input.citizenId),
      operations: [{ type: "PATCH", instanceId: instance.instanceId, patch: { durability: { ...(instance.durability || {}), current: 100 }, instanceData: { ...(instance.instanceData || {}), householdLifecycle: lifecycle }, serviceHistory: history } }],
      changedDomains: ["ITEM_INSTANCE", "HOUSING_FURNISHING"],
      metadata: { operationType: "HOUSEHOLD_FURNISHING_REPAIR" }
    }) || { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_API_REQUIRED" };
  }

  function getReplacementCandidates(citizenId = "", instanceId = "") {
    const current = app.getItemInstanceById?.(id(instanceId));
    if (!current) return [];
    const currentClass = token(getDefinitionProfile(current).furnishingClass);
    return (app.getCitizenEquipmentItemInstances?.(citizenId) || [])
      .filter((candidate) => candidate.instanceId !== current.instanceId && token(candidate.location?.type) === "HOUSING_STORAGE")
      .filter((candidate) => getOwnershipType(candidate) === "CITIZEN_FURNISHING")
      .filter((candidate) => token(getDefinitionProfile(candidate).furnishingClass) === currentClass)
      .map(clone);
  }

  function replaceHousingFurnishing(input = {}) {
    const current = app.getItemInstanceById?.(id(input.currentInstanceId));
    const replacement = app.getItemInstanceById?.(id(input.replacementInstanceId));
    if (!current || !replacement) return { ok: false, reason: "HOUSEHOLD_REPLACEMENT_ITEM_NOT_FOUND" };
    if (id(current.ownerId) !== id(input.citizenId) || id(replacement.ownerId) !== id(input.citizenId)) return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH" };
    if (getOwnershipType(current) !== "CITIZEN_FURNISHING" || getOwnershipType(replacement) !== "CITIZEN_FURNISHING") return { ok: false, reason: "HOUSEHOLD_OPERATOR_FURNISHING_REPLACEMENT_REQUIRES_SERVICE" };
    if (token(replacement.location?.type) !== "HOUSING_STORAGE") return { ok: false, reason: "HOUSEHOLD_REPLACEMENT_NOT_IN_STORAGE" };
    if (token(getDefinitionProfile(current).furnishingClass) !== token(getDefinitionProfile(replacement).furnishingClass)) return { ok: false, reason: "HOUSEHOLD_REPLACEMENT_CLASS_MISMATCH" };
    const currentLocation = clone(current.location);
    const replacementLocation = clone(replacement.location);
    if (token(currentLocation.type) === "HOUSING_ROOM") {
      const validation = app.validateHouseholdPlacement?.({
        citizenId: input.citizenId,
        housingRecordId: currentLocation.housingRecordId,
        roomId: currentLocation.roomId,
        instanceId: replacement.instanceId,
        gridX: currentLocation.gridX,
        gridY: currentLocation.gridY,
        rotation: currentLocation.rotation,
        excludeInstanceIds: [current.instanceId, replacement.instanceId]
      });
      if (!validation?.ok) return { ok: false, reason: validation?.reason || "HOUSEHOLD_REPLACEMENT_PLACEMENT_BLOCKED" };
    }
    return app.commitItemInstanceTransaction?.({
      idempotencyKey: id(input.idempotencyKey) || nextKey(`housing-furnishing:replace:${current.instanceId}:${replacement.instanceId}`),
      sourceDomain: SOURCE_DOMAIN,
      sourceRefId: current.instanceId,
      citizenId: id(input.citizenId),
      operations: [
        { type: "MOVE", instanceId: replacement.instanceId, toLocation: currentLocation, lifecycleState: token(current.lifecycleState) || "UNPACKAGED" },
        { type: "MOVE", instanceId: current.instanceId, toLocation: replacementLocation, lifecycleState: "UNPACKAGED" }
      ],
      changedDomains: ["ITEM_INSTANCE", "HOUSING_FURNISHING"],
      metadata: { operationType: "HOUSEHOLD_FURNISHING_REPLACE", currentInstanceId: current.instanceId, replacementInstanceId: replacement.instanceId }
    }) || { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_API_REQUIRED" };
  }

  function disposeHousingFurnishing(input = {}) {
    const instance = app.getItemInstanceById?.(id(input.instanceId));
    if (!instance) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND" };
    if (id(instance.ownerId) !== id(input.citizenId)) return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH" };
    if (getOwnershipType(instance) !== "CITIZEN_FURNISHING") return { ok: false, reason: "HOUSEHOLD_OPERATOR_FURNISHING_CANNOT_BE_DISPOSED" };
    if (getInstalledModules(instance.instanceId).length) return { ok: false, reason: "HOUSEHOLD_REMOVE_MODULES_BEFORE_DISPOSAL" };
    const citizen = app.getCitizenById?.(id(input.citizenId));
    if (!citizen) return { ok: false, reason: "CITIZEN_NOT_FOUND" };
    const lifecycle = buildLifecyclePatch(instance, getHousingRecord(input.citizenId, instance.location?.housingRecordId || getRawLifecycle(instance).housingRecordId), { disposedForCredits: true });
    const itemResult = app.commitItemInstanceTransaction?.({
      idempotencyKey: id(input.idempotencyKey) || nextKey(`housing-furnishing:dispose:${instance.instanceId}`),
      sourceDomain: SOURCE_DOMAIN,
      sourceRefId: instance.instanceId,
      citizenId: id(input.citizenId),
      operations: [{
        type: "MOVE",
        instanceId: instance.instanceId,
        toLocation: { type: "DESTROYED" },
        lifecycleState: "DISPOSED",
        patch: {
          disposedAt: nowCampaignIso(),
          disposedBy: id(input.citizenId),
          disposeReason: "SYSTEM_INCINERATOR",
          instanceData: { ...(instance.instanceData || {}), householdLifecycle: lifecycle }
        }
      }],
      changedDomains: ["ITEM_INSTANCE", "HOUSING_FURNISHING"],
      metadata: { operationType: "HOUSEHOLD_FURNISHING_DISPOSAL", creditValue: Number(registry.disposalCreditValue || 5) }
    }) || { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_API_REQUIRED" };
    if (!itemResult?.ok) return itemResult;
    if (itemResult.operation === "IDEMPOTENT_REPLAY") return { ...itemResult, creditValue: Number(registry.disposalCreditValue || 5) };
    const creditValue = Number(registry.disposalCreditValue || 5);
    const updated = app.updateCitizen?.(citizen.id, { credits: Number(citizen.credits || 0) + creditValue }, { source: "HOUSING_FURNISHING_DISPOSAL", skipModuleRefresh: true });
    if (!updated) {
      app.compensateItemInstanceTransaction?.(itemResult.transaction?.transactionId, { idempotencyKey: `${itemResult.transaction?.idempotencyKey}:credit-compensation` });
      return { ok: false, reason: "HOUSEHOLD_DISPOSAL_CREDIT_COMMIT_FAILED", itemTransaction: itemResult.transaction };
    }
    app.addBillingHistoryEntry?.(citizen.id, {
      type: "INCOME",
      category: "DISPOSAL",
      amount: creditValue,
      note: `System incinerator return: ${instance.instanceId}`,
      source: "HOUSING_FURNISHING_DISPOSAL",
      createdAt: nowCampaignIso()
    });
    app.recordCommittedBillingTransaction?.({
      citizenId: citizen.id,
      transactionType: "DISPOSAL_CREDIT",
      amount: creditValue,
      paymentSource: "EXTERNAL",
      sourceDomain: SOURCE_DOMAIN,
      sourceRefId: instance.instanceId,
      idempotencyKey: `${itemResult.transaction?.idempotencyKey}:billing`,
      accountEffect: { creditsDelta: creditValue },
      metadata: { itemInstanceId: instance.instanceId }
    });
    return { ...itemResult, resultCode: "HOUSEHOLD_FURNISHING_DISPOSED", creditValue, citizen: updated };
  }


  function isHouseholdFurnishingInstance(instance = {}) {
    const itemType = token(instance?.instanceData?.itemType);
    const definitionId = id(instance?.definitionId);
    return itemType === "HOUSEHOLD_FURNISHING"
      || Boolean(registry.definitionProfiles?.[definitionId])
      || definitionId.startsWith("housing-fixture:")
      || definitionId.startsWith("housing-rental:")
      || token(instance?.flags?.housingOwnershipType) !== "";
  }

  function handleItemInstancesUpdate(event) {
    const detail = event?.detail || {};
    const source = token(detail.source);
    if (locationAnchorCommitActive || source.startsWith(SOURCE_DOMAIN)) return;
    const instanceIds = Array.isArray(detail.instanceIds)
      ? detail.instanceIds.map(id).filter(Boolean)
      : [id(detail.instanceId)].filter(Boolean);
    if (!instanceIds.length) return;
    const previousLocations = detail.previousLocations && typeof detail.previousLocations === "object" ? detail.previousLocations : {};
    const nextLocations = detail.nextLocations && typeof detail.nextLocations === "object" ? detail.nextLocations : {};
    const currentTimeIso = nowCampaignIso();
    const operations = [];

    instanceIds.forEach((instanceId) => {
      const beforeType = token(previousLocations[instanceId]?.type);
      const afterType = token(nextLocations[instanceId]?.type);
      if (!beforeType || !afterType || beforeType === afterType) return;
      if (![beforeType, afterType].some((value) => ["HOUSING_ROOM", "HOUSING_STORAGE"].includes(value))) return;
      const instance = app.getItemInstanceById?.(instanceId);
      if (!instance || !isHouseholdFurnishingInstance(instance)) return;
      const housingRecordId = id(instance.location?.housingRecordId || getRawLifecycle(instance).housingRecordId);
      const record = getHousingRecord(instance.ownerId, housingRecordId);
      const lifecycle = buildLifecyclePatch(instance, record, {
        housingRecordId: housingRecordId || record?.id,
        lastWearAt: currentTimeIso
      });
      operations.push({
        type: "PATCH",
        instanceId,
        patch: {
          instanceData: { ...(instance.instanceData || {}), householdLifecycle: lifecycle }
        }
      });
    });

    if (!operations.length) return;
    locationAnchorCommitActive = true;
    try {
      app.commitItemInstanceTransaction?.({
        idempotencyKey: `housing-furnishing:location-anchor:${id(detail.transactionId || detail.eventId || detail.storeRevision || nextKey("event"))}`,
        sourceDomain: SOURCE_DOMAIN,
        sourceRefId: id(detail.transactionId || detail.eventId),
        citizenId: id(detail.citizenId),
        operations,
        changedDomains: ["ITEM_INSTANCE", "HOUSING_FURNISHING"],
        metadata: { operationType: "HOUSEHOLD_FURNISHING_LOCATION_ANCHOR", currentTimeIso }
      });
    } finally {
      locationAnchorCommitActive = false;
    }
  }

  function handleCampaignTime(event) {
    processHousingFurnishingWear({ currentTimeIso: event?.detail?.currentTimeIso || event?.detail?.campaignTimeIso, idempotencyKey: `housing-furnishing:wear:${event?.detail?.revision || 0}:${event?.detail?.currentTimeIso || ""}` });
  }

  function handleHousingChange(event) {
    const citizenId = id(event?.detail?.citizenId);
    if (citizenId) reconcileCitizenHousingFurnishings(citizenId, { idempotencyKey: `housing-furnishing:bridge:${event?.detail?.eventId || event.type}` });
  }

  function validateRuntime() {
    const dependencies = ["getItemInstanceById", "getItemInstances", "commitItemInstanceTransaction", "getCitizenById"];
    const missing = dependencies.filter((name) => typeof app[name] !== "function");
    return { valid: missing.length === 0, version: API_VERSION, missing };
  }

  function initialize() {
    if (!validateRuntime().valid) return validateRuntime();
    const result = reconcileAllHousingFurnishings();
    processHousingFurnishingWear({ currentTimeIso: nowCampaignIso(), idempotencyKey: `housing-furnishing:startup-wear:${nowCampaignIso()}` });
    return result;
  }

  app.HousingFurnishingLifecycle = Object.freeze({
    version: API_VERSION,
    getProjection,
    getConditionState,
    getEffectiveCapabilities,
    getFurnishingSlots,
    getInstalledModules,
    getModuleCandidates,
    getReplacementCandidates,
    reconcileHousingUnitFurnishings,
    reconcileCitizenHousingFurnishings,
    reconcileAllHousingFurnishings,
    processHousingFurnishingWear,
    installHousingFurnishingModule,
    removeHousingFurnishingModule,
    repairHousingFurnishing,
    replaceHousingFurnishing,
    disposeHousingFurnishing,
    validate: validateRuntime
  });

  Object.assign(app, {
    HOUSING_FURNISHING_LIFECYCLE_VERSION: API_VERSION,
    getHousingFurnishingLifecycleProjection: getProjection,
    getHousingFurnishingConditionState: getConditionState,
    getHousingFurnishingEffectiveCapabilities: getEffectiveCapabilities,
    getHousingFurnishingSlots: getFurnishingSlots,
    getHousingFurnishingInstalledModules: getInstalledModules,
    getHousingFurnishingModuleCandidates: getModuleCandidates,
    getHousingFurnishingReplacementCandidates: getReplacementCandidates,
    reconcileHousingUnitFurnishings,
    reconcileCitizenHousingFurnishings,
    reconcileAllHousingFurnishings,
    processHousingFurnishingWear,
    installHousingFurnishingModule,
    removeHousingFurnishingModule,
    repairHousingFurnishing,
    replaceHousingFurnishing,
    disposeHousingFurnishing,
    initializeHousingFurnishingLifecycle: initialize,
    validateHousingFurnishingLifecycle: validateRuntime
  });

  window.addEventListener?.("ws:item-instances-updated", handleItemInstancesUpdate);
  window.addEventListener?.("ws:campaign-time-updated", handleCampaignTime);
  window.addEventListener?.("ws:housing-rent-bridge-updated", handleHousingChange);
  window.addEventListener?.("ws:housing-rent-relocation-updated", handleHousingChange);
  window.addEventListener?.("load", initialize, { once: true });
})();
