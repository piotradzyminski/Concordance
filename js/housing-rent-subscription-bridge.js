window.WS_APP = window.WS_APP || {};

(function initHousingRentSubscriptionBridge() {
  "use strict";

  const app = window.WS_APP;
  const API_VERSION = "housing_rent_subscription_bridge_3_2x";
  const EVENT_NAME = "ws:housing-rent-bridge-updated";
  const SOURCE = "HOUSING_RENT_BRIDGE";

  if (app.HousingRentSubscriptionBridge?.version === API_VERSION) return;

  function clone(value) {
    if (value == null) return value;
    try { return structuredClone(value); }
    catch (_) { return JSON.parse(JSON.stringify(value)); }
  }

  function id(value = "") {
    return String(value || "").trim();
  }

  function token(value = "") {
    return id(value).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function slug(value = "") {
    return id(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "rent";
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function getContract(contractOrId = {}) {
    if (contractOrId && typeof contractOrId === "object" && !Array.isArray(contractOrId)) return clone(contractOrId);
    const contractId = id(contractOrId);
    return contractId ? app.SubscriptionAPI?.getSubscriptionContract?.(contractId) || app.getSubscriptionContract?.(contractId) || null : null;
  }

  function getCitizen(citizenId = "") {
    return app.getCitizenById?.(id(citizenId)) || null;
  }

  function resolveRent(contract = {}) {
    return app.resolveHousingRentTierFromSubscription?.(contract) || null;
  }

  function isRentContract(contract = {}) {
    return Boolean(resolveRent(contract));
  }

  function getRawHousing(citizen = {}) {
    return Array.isArray(citizen?.housing) ? clone(citizen.housing) : [];
  }

  function findLinkedRecordIndex(records = [], contractId = "") {
    const requested = id(contractId);
    const candidates = records
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => id(record?.linkedSubscriptionId || record?.subscriptionContractId) === requested);
    const active = candidates.find(({ record }) => record?.archived !== true && token(record?.status) !== "RELEASED");
    return active?.index ?? candidates[0]?.index ?? -1;
  }

  function makeUnitId(contract = {}) {
    return `housing-unit-${slug(contract.subscriptionContractId || contract.id || `${contract.citizenId}-${contract.subscriptionCatalogId}`)}`;
  }

  function buildAssignment(contract = {}, resolution = {}, housingRecordId = "", existing = null) {
    const metadata = contract.metadata && typeof contract.metadata === "object" ? contract.metadata : {};
    const explicitTemplateId = id(metadata.housingLayoutTemplateId || metadata.layoutTemplateId || existing?.layoutTemplateId);
    const explicitSeed = id(metadata.housingLayoutSeed || metadata.layoutSeed || existing?.layoutSeed);
    return app.resolveHousingLayoutAssignment?.({
      standardCode: resolution.standard?.code,
      standardTierId: resolution.tier?.tierId,
      housingRecordId,
      citizenId: contract.citizenId,
      subscriptionContractId: contract.subscriptionContractId,
      layoutTemplateId: explicitTemplateId,
      layoutSeed: explicitSeed
    }) || {
      layoutPolicy: resolution.standard?.layoutPolicy || "",
      layoutTemplateId: explicitTemplateId,
      layoutSeed: explicitSeed,
      template: null
    };
  }

  function mergeStorageUnits(existingUnits = [], targetUnits = [], options = {}) {
    const currentById = new Map((Array.isArray(existingUnits) ? existingUnits : []).map((unit) => [id(unit?.id), clone(unit)]).filter(([unitId]) => unitId));
    const targetIds = new Set();
    const merged = (Array.isArray(targetUnits) ? targetUnits : []).map((unit) => {
      const unitId = id(unit?.id);
      targetIds.add(unitId);
      return {
        ...(currentById.get(unitId) || {}),
        ...clone(unit),
        retiring: false
      };
    });
    currentById.forEach((unit, unitId) => {
      if (!targetIds.has(unitId)) merged.push({ ...unit, retiring: options.retireMissing === true ? true : unit.retiring === true });
    });
    return merged;
  }

  function buildUnitProfile(contract = {}, resolution = {}, existing = null, options = {}) {
    const standard = resolution.standard || {};
    const tier = resolution.tier || {};
    const housingRecordId = id(options.housingRecordId || existing?.id || makeUnitId(contract));
    const preservePhysicalLayout = options.preservePhysicalLayout === true && existing;
    const assignment = preservePhysicalLayout
      ? {
          layoutPolicy: existing.layoutPolicy || standard.layoutPolicy || "",
          layoutTemplateId: existing.layoutTemplateId || "",
          layoutSeed: existing.layoutSeed || "",
          template: existing.layoutVariantFamily ? { variantFamily: existing.layoutVariantFamily } : null
        }
      : buildAssignment(contract, resolution, housingRecordId, existing);
    const targetStorage = app.buildHousingRentStorageUnits?.(resolution, housingRecordId) || [];
    const storageUnits = mergeStorageUnits(existing?.storageUnits || [], targetStorage, {
      retireMissing: options.retireMissingStorage === true
    });
    const previousHousehold = existing?.household && typeof existing.household === "object" ? clone(existing.household) : {};
    const layoutChanged = id(existing?.layoutTemplateId) !== id(assignment.layoutTemplateId) || id(existing?.layoutSeed) !== id(assignment.layoutSeed);
    const household = {
      ...(layoutChanged && !preservePhysicalLayout ? {} : previousHousehold),
      schemaVersion: previousHousehold.schemaVersion || app.HOUSEHOLD_SCHEMA_VERSION || "household_foundation_2_0x",
      layoutSchemaVersion: previousHousehold.layoutSchemaVersion || "housing_layout_pools_3_1x",
      layoutTemplateId: id(assignment.layoutTemplateId),
      layoutSeed: id(assignment.layoutSeed),
      layoutPolicy: token(assignment.layoutPolicy || standard.layoutPolicy),
      variantFamily: token(assignment.template?.variantFamily || existing?.layoutVariantFamily),
      residentIds: Array.from(new Set([...(Array.isArray(previousHousehold.residentIds) ? previousHousehold.residentIds : []), id(contract.citizenId)].filter(Boolean)))
    };
    const status = token(contract.contractStatus) === "SUSPENDED" || token(contract.entitlementStatus) === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
    return {
      ...(existing ? clone(existing) : {}),
      id: housingRecordId,
      title: `${standard.label || `Housing Standard ${standard.code || ""}`} / ${tier.label || tier.tierId || "Tier"}`,
      type: `HOUSING_STANDARD_${token(standard.code)}`,
      status,
      occupancyStatus: status === "ACTIVE" ? "OCCUPIED" : "ACCESS_SUSPENDED",
      isPrimary: existing?.isPrimary !== false,
      provider: id(contract.displaySnapshot?.provider || contract.provider || existing?.provider || "Habitat Ledger"),
      linkedSubscriptionId: id(contract.subscriptionContractId || contract.id),
      standardCode: token(standard.code),
      standardTierId: id(tier.tierId),
      areaM2: tier.areaM2 == null ? null : Number(tier.areaM2),
      occupancy: clone(tier.occupancy || {}),
      furnishingPolicy: token(tier.furnishingPolicy),
      fixedFixtures: clone(tier.fixedFixtures || []),
      rentalFurnishings: clone(tier.rentalFurnishings || []),
      capabilities: clone(tier.capabilities || []),
      parcelMaxFootprint: id(tier.logistics?.parcelMaxFootprint),
      logistics: clone(tier.logistics || {}),
      disposalAccess: token(tier.disposalAccess),
      defaultFurnishingGrade: token(tier.defaultFurnishingGrade),
      fixtureReplacementPolicy: token(tier.fixtureReplacementPolicy),
      upgradeSlotPolicy: token(tier.upgradeSlotPolicy),
      maintenanceCoverage: token(tier.maintenanceCoverage),
      rentStatus: token(contract.billingStatus || contract.contractStatus || "UNKNOWN"),
      layoutPolicy: token(assignment.layoutPolicy || standard.layoutPolicy),
      layoutTemplateId: id(assignment.layoutTemplateId),
      layoutSeed: id(assignment.layoutSeed),
      layoutVariantFamily: token(assignment.template?.variantFamily || existing?.layoutVariantFamily),
      storageUnits,
      household,
      rentBridge: {
        schemaVersion: API_VERSION,
        subscriptionContractId: id(contract.subscriptionContractId || contract.id),
        subscriptionCatalogId: id(contract.subscriptionCatalogId || contract.catalogId),
        appliedContractRevision: Number(contract.revision || 1),
        lastReconciledAt: nowIso(),
        transitionState: "STABLE"
      },
      rentTransition: null,
      archived: false
    };
  }

  function classifyTierChange(existing = {}, resolution = {}) {
    const nextStandard = token(resolution.standard?.code);
    const nextTierId = id(resolution.tier?.tierId);
    const nextArea = resolution.tier?.areaM2 == null ? null : Number(resolution.tier.areaM2);
    const currentStandard = token(existing.standardCode);
    const currentTierId = id(existing.standardTierId);
    const currentArea = existing.areaM2 == null ? null : Number(existing.areaM2);
    if (currentStandard === nextStandard && currentTierId === nextTierId) return "NO_CHANGE";
    if (currentStandard === nextStandard && currentArea === nextArea) return "MODERNIZE_IN_PLACE";
    return "RELOCATION_REQUIRED";
  }

  function getUnitItemManifest(citizenId = "", record = {}) {
    const storageIds = new Set((Array.isArray(record?.storageUnits) ? record.storageUnits : []).map((unit) => id(unit?.id)).filter(Boolean));
    const allInstances = app.getCitizenItemInstances?.(citizenId, { includeBody: true, includeDisposed: false })
      || app.getCitizenEquipmentItemInstances?.(citizenId)
      || [];
    const instances = Array.isArray(allInstances) ? allInstances : [];
    const stored = [];
    const furnished = [];
    const other = [];
    const operator = [];
    const operatorInstanceIds = new Set();

    instances.forEach((instance) => {
      const location = instance?.location || {};
      const type = token(location.type);
      const instanceId = id(instance.instanceId || instance.id);
      if (!instanceId) return;
      const ownershipType = token(instance?.instanceData?.householdLifecycle?.ownershipType || instance?.flags?.housingOwnershipType || "CITIZEN_FURNISHING");
      const belongsToUnit = (type === "HOUSING_ROOM" && id(location.housingRecordId) === id(record.id))
        || (type === "HOUSING_STORAGE" && storageIds.has(id(location.storageUnitId || location.housingStorageId || location.containerInstanceId)))
        || id(instance?.instanceData?.householdLifecycle?.housingRecordId) === id(record.id);
      if (!belongsToUnit) return;
      if (["FIXED_FIXTURE", "RENTAL_FURNISHING"].includes(ownershipType)) {
        operator.push(instanceId);
        operatorInstanceIds.add(instanceId);
        return;
      }
      if (type === "HOUSING_ROOM") furnished.push(instanceId);
      else if (type === "HOUSING_STORAGE") stored.push(instanceId);
      else other.push(instanceId);
    });

    const detachedOperatorModules = [];
    instances.forEach((instance) => {
      const instanceId = id(instance?.instanceId || instance?.id);
      if (!instanceId || token(instance?.location?.type) !== "INSTALLED_IN_ITEM") return;
      const parentInstanceId = id(instance.location?.parentItemInstanceId);
      if (!operatorInstanceIds.has(parentInstanceId)) return;
      const ownershipType = token(instance?.instanceData?.householdLifecycle?.ownershipType || instance?.flags?.housingOwnershipType || "CITIZEN_FURNISHING");
      if (["FIXED_FIXTURE", "RENTAL_FURNISHING"].includes(ownershipType)) return;
      detachedOperatorModules.push(instanceId);
      other.push(instanceId);
    });

    return {
      housingRecordId: id(record.id),
      storageUnitIds: Array.from(storageIds),
      storedInstanceIds: stored,
      furnishingInstanceIds: furnished,
      otherInstanceIds: Array.from(new Set(other)),
      operatorInstanceIds: operator,
      detachedOperatorModuleInstanceIds: detachedOperatorModules,
      instanceIds: Array.from(new Set([...stored, ...furnished, ...other])),
      generatedAt: nowIso()
    };
  }

  function buildRelocationTarget(contract = {}, resolution = {}, existing = {}) {
    const targetUnitId = `${makeUnitId(contract)}-${slug(resolution.tier?.tierId || "target")}`;
    const profile = buildUnitProfile(contract, resolution, null, { housingRecordId: targetUnitId });
    return {
      housingRecordId: profile.id,
      standardCode: profile.standardCode,
      standardTierId: profile.standardTierId,
      areaM2: profile.areaM2,
      title: profile.title,
      layoutPolicy: profile.layoutPolicy,
      layoutTemplateId: profile.layoutTemplateId,
      layoutSeed: profile.layoutSeed,
      layoutVariantFamily: profile.layoutVariantFamily,
      storageUnits: clone(profile.storageUnits),
      fixedFixtures: clone(profile.fixedFixtures),
      rentalFurnishings: clone(profile.rentalFurnishings),
      capabilities: clone(profile.capabilities),
      furnishingPolicy: profile.furnishingPolicy,
      parcelMaxFootprint: profile.parcelMaxFootprint,
      disposalAccess: profile.disposalAccess,
      defaultFurnishingGrade: profile.defaultFurnishingGrade,
      maintenanceCoverage: profile.maintenanceCoverage,
      household: clone(profile.household),
      visibleAddress: id(contract.metadata?.targetVisibleAddress || existing?.visibleAddress || ""),
      traceAddress: id(contract.metadata?.targetTraceAddress || existing?.traceAddress || "")
    };
  }

  function emitUpdate(detail = {}) {
    if (typeof window.dispatchEvent !== "function" || typeof window.CustomEvent !== "function") return;
    window.dispatchEvent(new CustomEvent(EVENT_NAME, {
      detail: {
        eventId: `housing-rent:${id(detail.contractId || "unknown")}:${Number(detail.revision || 0)}:${token(detail.resultCode || "UPDATED")}`,
        occurredAt: nowIso(),
        ...clone(detail)
      }
    }));
  }

  function persistHousing(citizen = {}, housing = [], options = {}) {
    const updated = app.updateCitizen?.(citizen.id, { housing: clone(housing) }, {
      source: SOURCE,
      skipModuleRefresh: options.skipModuleRefresh === true,
      skipProfileRefresh: options.skipProfileRefresh === true
    });
    return updated || null;
  }

  function reconcileHousingRentContract(contractOrId = {}, options = {}) {
    const contract = getContract(contractOrId);
    if (!contract) return { ok: false, errorCode: "SUBSCRIPTION_CONTRACT_NOT_FOUND" };
    const resolution = resolveRent(contract);
    if (!resolution) return { ok: false, errorCode: "NOT_A_HOUSING_RENT_CONTRACT" };
    const citizen = getCitizen(contract.citizenId);
    if (!citizen) return { ok: false, errorCode: "CITIZEN_NOT_FOUND", citizenId: id(contract.citizenId) };
    const housing = getRawHousing(citizen);
    const recordIndex = findLinkedRecordIndex(housing, contract.subscriptionContractId);
    const existing = recordIndex >= 0 ? clone(housing[recordIndex]) : null;
    const contractStatus = token(contract.contractStatus);

    if (contractStatus === "CANCELLED") {
      if (!existing) return { ok: true, resultCode: "HOUSING_UNIT_ALREADY_RELEASED", contract: clone(contract) };
      const manifest = getUnitItemManifest(citizen.id, existing);
      const canRelease = manifest.instanceIds.length === 0;
      const next = {
        ...existing,
        status: canRelease ? "RELEASED" : "RELEASE_PENDING",
        occupancyStatus: canRelease ? "VACANT" : "MOVE_OUT_REQUIRED",
        rentStatus: "CANCELLED",
        archived: canRelease,
        rentTransition: canRelease ? null : {
          transitionId: `housing-release-${slug(contract.subscriptionContractId)}`,
          type: "RELEASE_REQUIRED",
          status: "PREPARED",
          contractRevision: Number(contract.revision || 1),
          transferManifest: manifest,
          preparedAt: nowIso()
        },
        rentBridge: {
          ...(existing.rentBridge || {}),
          schemaVersion: API_VERSION,
          subscriptionContractId: id(contract.subscriptionContractId),
          subscriptionCatalogId: id(contract.subscriptionCatalogId),
          appliedContractRevision: Number(contract.revision || 1),
          lastReconciledAt: nowIso(),
          transitionState: canRelease ? "RELEASED" : "RELEASE_PENDING"
        }
      };
      housing[recordIndex] = next;
      const updatedCitizen = persistHousing(citizen, housing, options);
      const resultCode = canRelease ? "HOUSING_UNIT_RELEASED" : "HOUSING_RELEASE_PREPARED";
      emitUpdate({ citizenId: citizen.id, contractId: contract.subscriptionContractId, housingRecordId: existing.id, resultCode, revision: contract.revision, transferManifest: manifest });
      return { ok: Boolean(updatedCitizen), resultCode, citizen: updatedCitizen, housingRecord: clone(next), transferManifest: manifest };
    }

    if (!existing) {
      const created = buildUnitProfile(contract, resolution, null);
      if (housing.some((record) => record?.isPrimary === true && !record.archived)) created.isPrimary = false;
      housing.push(created);
      const updatedCitizen = persistHousing(citizen, housing, options);
      emitUpdate({ citizenId: citizen.id, contractId: contract.subscriptionContractId, housingRecordId: created.id, resultCode: "HOUSING_UNIT_ALLOCATED", revision: contract.revision });
      return { ok: Boolean(updatedCitizen), resultCode: "HOUSING_UNIT_ALLOCATED", citizen: updatedCitizen, housingRecord: clone(created) };
    }

    const appliedRevision = Number(existing.rentBridge?.appliedContractRevision || 0);
    if (appliedRevision === Number(contract.revision || 0) && options.force !== true) {
      return { ok: true, resultCode: "HOUSING_RENT_RECONCILIATION_REPLAY", housingRecord: clone(existing) };
    }

    const changeType = classifyTierChange(existing, resolution);
    let next;
    let resultCode;
    if (changeType === "RELOCATION_REQUIRED") {
      const manifest = getUnitItemManifest(citizen.id, existing);
      const targetUnit = buildRelocationTarget(contract, resolution, existing);
      next = {
        ...existing,
        status: "ACTIVE",
        occupancyStatus: "RELOCATION_REQUIRED",
        rentStatus: token(contract.billingStatus || contract.contractStatus || "UNKNOWN"),
        rentTransition: {
          transitionId: `housing-relocation-${slug(contract.subscriptionContractId)}-${slug(resolution.tier?.tierId)}`,
          type: "RELOCATION_REQUIRED",
          status: "PREPARED",
          contractRevision: Number(contract.revision || 1),
          from: {
            housingRecordId: id(existing.id),
            standardCode: token(existing.standardCode),
            standardTierId: id(existing.standardTierId),
            areaM2: existing.areaM2 == null ? null : Number(existing.areaM2),
            layoutTemplateId: id(existing.layoutTemplateId),
            layoutSeed: id(existing.layoutSeed)
          },
          targetUnit,
          transferManifest: manifest,
          preparedAt: nowIso()
        },
        rentBridge: {
          ...(existing.rentBridge || {}),
          schemaVersion: API_VERSION,
          subscriptionContractId: id(contract.subscriptionContractId),
          subscriptionCatalogId: id(contract.subscriptionCatalogId),
          appliedContractRevision: Number(contract.revision || 1),
          lastReconciledAt: nowIso(),
          transitionState: "RELOCATION_REQUIRED"
        }
      };
      resultCode = "HOUSING_RELOCATION_PREPARED";
    } else {
      next = buildUnitProfile(contract, resolution, existing, {
        preservePhysicalLayout: changeType === "MODERNIZE_IN_PLACE",
        retireMissingStorage: changeType === "MODERNIZE_IN_PLACE"
      });
      resultCode = changeType === "MODERNIZE_IN_PLACE" ? "HOUSING_UNIT_MODERNIZED" : "HOUSING_UNIT_SYNCHRONIZED";
    }

    housing[recordIndex] = next;
    const updatedCitizen = persistHousing(citizen, housing, options);
    emitUpdate({ citizenId: citizen.id, contractId: contract.subscriptionContractId, housingRecordId: existing.id, resultCode, revision: contract.revision, transition: clone(next.rentTransition || null) });
    return { ok: Boolean(updatedCitizen), resultCode, citizen: updatedCitizen, housingRecord: clone(next), transition: clone(next.rentTransition || null) };
  }

  function reconcileCitizenHousingRent(citizenId = "", options = {}) {
    const citizen = getCitizen(citizenId);
    if (!citizen) return { ok: false, errorCode: "CITIZEN_NOT_FOUND", citizenId: id(citizenId), results: [] };
    const contracts = app.SubscriptionAPI?.getCitizenSubscriptionContracts?.(citizen.id) || app.getCitizenSubscriptionContracts?.(citizen.id) || [];
    const results = (Array.isArray(contracts) ? contracts : [])
      .filter(isRentContract)
      .map((contract) => reconcileHousingRentContract(contract, { ...options, skipModuleRefresh: true }));
    return { ok: results.every((result) => result.ok !== false), citizenId: citizen.id, results };
  }

  function reconcileAllHousingRentContracts(options = {}) {
    const citizens = app.getCitizens?.() || [];
    const results = (Array.isArray(citizens) ? citizens : [])
      .filter((citizen) => citizen && citizen.recordType !== "admin")
      .map((citizen) => reconcileCitizenHousingRent(citizen.id, { ...options, skipModuleRefresh: true }));
    return { ok: results.every((result) => result.ok !== false), results };
  }

  function getHousingUnitForRentContract(contractId = "") {
    const contract = getContract(contractId);
    if (!contract) return null;
    const citizen = getCitizen(contract.citizenId);
    if (!citizen) return null;
    const records = getRawHousing(citizen);
    const index = findLinkedRecordIndex(records, contract.subscriptionContractId);
    const record = index >= 0 ? records[index] : null;
    return record ? clone(record) : null;
  }

  function getHousingRentTransferPlan(contractId = "") {
    const record = getHousingUnitForRentContract(contractId);
    return record?.rentTransition ? clone(record.rentTransition) : null;
  }

  function finalizeHousingUnitRelease(contractId = "", options = {}) {
    const contract = getContract(contractId);
    if (!contract) return { ok: false, errorCode: "SUBSCRIPTION_CONTRACT_NOT_FOUND" };
    const citizen = getCitizen(contract.citizenId);
    if (!citizen) return { ok: false, errorCode: "CITIZEN_NOT_FOUND" };
    const housing = getRawHousing(citizen);
    const index = findLinkedRecordIndex(housing, contract.subscriptionContractId);
    if (index < 0) return { ok: true, resultCode: "HOUSING_UNIT_ALREADY_RELEASED" };
    const record = housing[index];
    const manifest = getUnitItemManifest(citizen.id, record);
    if (manifest.instanceIds.length) return { ok: false, errorCode: "HOUSING_UNIT_NOT_EMPTY", transferManifest: manifest };
    housing[index] = {
      ...record,
      status: "RELEASED",
      occupancyStatus: "VACANT",
      archived: true,
      rentTransition: null,
      rentBridge: {
        ...(record.rentBridge || {}),
        schemaVersion: API_VERSION,
        lastReconciledAt: nowIso(),
        transitionState: "RELEASED"
      }
    };
    const updatedCitizen = persistHousing(citizen, housing, options);
    emitUpdate({ citizenId: citizen.id, contractId: contract.subscriptionContractId, housingRecordId: record.id, resultCode: "HOUSING_UNIT_RELEASED", revision: contract.revision });
    return { ok: Boolean(updatedCitizen), resultCode: "HOUSING_UNIT_RELEASED", citizen: updatedCitizen, housingRecord: clone(housing[index]) };
  }

  function validateBridge() {
    const errors = [];
    [
      "resolveHousingRentTierFromSubscription",
      "buildHousingRentStorageUnits",
      "resolveHousingLayoutAssignment",
      "updateCitizen"
    ].forEach((name) => {
      if (typeof app[name] !== "function") errors.push({ code: "HOUSING_RENT_BRIDGE_DEPENDENCY_MISSING", dependency: name });
    });
    if (!app.SubscriptionAPI) errors.push({ code: "SUBSCRIPTION_API_MISSING" });
    return { valid: errors.length === 0, version: API_VERSION, errors };
  }

  function handleSubscriptionEvent(event) {
    const contractId = id(event?.detail?.subscriptionContractId);
    if (!contractId) return;
    const contract = getContract(contractId);
    if (!contract || !isRentContract(contract)) return;
    reconcileHousingRentContract(contract, { sourceEvent: event.type, skipModuleRefresh: false });
  }

  app.HousingRentSubscriptionBridge = Object.freeze({
    version: API_VERSION,
    reconcileHousingRentContract,
    reconcileCitizenHousingRent,
    reconcileAllHousingRentContracts,
    getHousingUnitForRentContract,
    getHousingRentTransferPlan,
    getUnitItemManifest,
    finalizeHousingUnitRelease,
    validate: validateBridge
  });

  Object.assign(app, {
    HOUSING_RENT_SUBSCRIPTION_BRIDGE_VERSION: API_VERSION,
    reconcileHousingRentContract,
    reconcileCitizenHousingRent,
    reconcileAllHousingRentContracts,
    getHousingUnitForRentContract,
    getHousingRentTransferPlan,
    getHousingRentUnitItemManifest: getUnitItemManifest,
    finalizeHousingUnitRelease,
    validateHousingRentSubscriptionBridge: validateBridge
  });

  ["ws:subscription-created", "ws:subscription-updated", "ws:subscription-entitlement-changed", "ws:subscription-cancelled"]
    .forEach((eventName) => window.addEventListener?.(eventName, handleSubscriptionEvent));

  if (validateBridge().valid) reconcileAllHousingRentContracts({ sourceEvent: "STARTUP", skipModuleRefresh: true });
})();
