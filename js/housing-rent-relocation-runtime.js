window.WS_APP = window.WS_APP || {};

(function initHousingRentRelocationRuntime() {
  "use strict";

  const app = window.WS_APP;
  const API_VERSION = "housing_rent_relocation_runtime_3_3x";
  const SOURCE_DOMAIN = "HOUSING";
  const EVENT_NAME = "ws:housing-rent-relocation-updated";

  if (app.HousingRentRelocationRuntime?.version === API_VERSION) return;

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

  function getTransitionContext(contractOrId = {}) {
    const contract = getContract(contractOrId);
    if (!contract) return { ok: false, errorCode: "SUBSCRIPTION_CONTRACT_NOT_FOUND" };
    const citizen = getCitizen(contract.citizenId);
    if (!citizen) return { ok: false, errorCode: "CITIZEN_NOT_FOUND", citizenId: id(contract.citizenId) };
    const housing = getRawHousing(citizen);
    const recordIndex = findLinkedRecordIndex(housing, contract.subscriptionContractId);
    if (recordIndex < 0) return { ok: false, errorCode: "HOUSING_UNIT_NOT_FOUND", contract, citizen, housing };
    const record = clone(housing[recordIndex]);
    const transition = record?.rentTransition && typeof record.rentTransition === "object" ? clone(record.rentTransition) : null;
    return { ok: true, contract, citizen, housing, recordIndex, record, transition };
  }

  function parseFootprint(value = "") {
    const match = String(value || "").trim().toLowerCase().match(/^(\d+)\s*[x×]\s*(\d+)$/);
    return match ? { width: Math.max(1, Number(match[1]) || 1), height: Math.max(1, Number(match[2]) || 1) } : null;
  }

  function getItemDimensions(instance = {}) {
    const view = app.getItemInstanceView?.(instance.instanceId || instance.id) || {};
    const footprint = parseFootprint(view.footprint || instance.instanceData?.footprint || instance.footprint);
    return {
      width: Math.max(1, Math.round(Number(view.width ?? view.w ?? instance.width ?? instance.w ?? footprint?.width ?? 1)) || 1),
      height: Math.max(1, Math.round(Number(view.height ?? view.h ?? instance.height ?? instance.h ?? footprint?.height ?? 1)) || 1)
    };
  }

  function normalizeStorageUnit(unit = {}) {
    return {
      ...clone(unit),
      id: id(unit.id),
      type: token(unit.type || "GENERAL") || "GENERAL",
      width: Math.max(1, Math.round(Number(unit.width || 1)) || 1),
      height: Math.max(1, Math.round(Number(unit.height || 1)) || 1)
    };
  }

  function createOccupancy(unit = {}) {
    return Array.from({ length: unit.height }, () => Array(unit.width).fill(false));
  }

  function canPlace(occupancy = [], x = 0, y = 0, width = 1, height = 1) {
    if (y < 0 || x < 0 || y + height > occupancy.length || x + width > (occupancy[0]?.length || 0)) return false;
    for (let row = y; row < y + height; row += 1) {
      for (let col = x; col < x + width; col += 1) {
        if (occupancy[row][col]) return false;
      }
    }
    return true;
  }

  function markPlacement(occupancy = [], x = 0, y = 0, width = 1, height = 1) {
    for (let row = y; row < y + height; row += 1) {
      for (let col = x; col < x + width; col += 1) occupancy[row][col] = true;
    }
  }

  function getSourceStorageType(record = {}, instance = {}) {
    const storageId = id(instance.location?.storageUnitId || instance.location?.housingStorageId || instance.location?.containerInstanceId);
    const unit = (Array.isArray(record.storageUnits) ? record.storageUnits : []).find((entry) => id(entry?.id) === storageId);
    return token(unit?.type || "GENERAL") || "GENERAL";
  }

  function buildTransferPacking(context = {}) {
    const { citizen, record, transition } = context;
    if (!transition || token(transition.type) !== "RELOCATION_REQUIRED") {
      return { ok: false, errorCode: "HOUSING_RELOCATION_NOT_PREPARED" };
    }
    if (token(transition.status || "PREPARED") !== "PREPARED") {
      return { ok: false, errorCode: "HOUSING_RELOCATION_NOT_PREPARED", transitionStatus: token(transition.status) };
    }
    const targetUnit = transition.targetUnit && typeof transition.targetUnit === "object" ? clone(transition.targetUnit) : null;
    if (!targetUnit?.housingRecordId) return { ok: false, errorCode: "HOUSING_RELOCATION_TARGET_REQUIRED" };
    const units = (Array.isArray(targetUnit.storageUnits) ? targetUnit.storageUnits : []).map(normalizeStorageUnit).filter((unit) => unit.id);
    if (!units.length && Number(transition.transferManifest?.instanceIds?.length || 0) > 0) {
      return { ok: false, errorCode: "HOUSING_RELOCATION_TARGET_STORAGE_REQUIRED" };
    }

    const occupancies = new Map(units.map((unit) => [unit.id, createOccupancy(unit)]));
    const manifestIds = Array.from(new Set((Array.isArray(transition.transferManifest?.instanceIds) ? transition.transferManifest.instanceIds : []).map(id).filter(Boolean)));
    const missingInstanceIds = [];
    const items = manifestIds.map((instanceId) => {
      const instance = app.getItemInstanceById?.(instanceId) || null;
      if (!instance) {
        missingInstanceIds.push(instanceId);
        return null;
      }
      const dimensions = getItemDimensions(instance);
      const sourceType = token(instance.location?.type);
      const preferredStorageType = sourceType === "HOUSING_STORAGE" ? getSourceStorageType(record, instance) : "GENERAL";
      return { instanceId, instance, sourceType, preferredStorageType, ...dimensions };
    }).filter(Boolean).sort((left, right) => (right.width * right.height) - (left.width * left.height) || left.instanceId.localeCompare(right.instanceId));

    if (missingInstanceIds.length) return { ok: false, errorCode: "HOUSING_RELOCATION_MANIFEST_ITEM_MISSING", missingInstanceIds };

    const placements = [];
    for (const item of items) {
      const candidates = [...units].sort((left, right) => {
        const leftScore = left.type === item.preferredStorageType ? 0 : left.type === "GENERAL" ? 1 : 2;
        const rightScore = right.type === item.preferredStorageType ? 0 : right.type === "GENERAL" ? 1 : 2;
        return leftScore - rightScore || (right.width * right.height) - (left.width * left.height) || left.id.localeCompare(right.id);
      });
      let placement = null;
      for (const unit of candidates) {
        const occupancy = occupancies.get(unit.id);
        const orientations = item.width === item.height
          ? [{ width: item.width, height: item.height, rotation: 0 }]
          : [{ width: item.width, height: item.height, rotation: 0 }, { width: item.height, height: item.width, rotation: 90 }];
        for (const orientation of orientations) {
          for (let y = 0; y <= unit.height - orientation.height; y += 1) {
            for (let x = 0; x <= unit.width - orientation.width; x += 1) {
              if (!canPlace(occupancy, x, y, orientation.width, orientation.height)) continue;
              markPlacement(occupancy, x, y, orientation.width, orientation.height);
              placement = {
                instanceId: item.instanceId,
                sourceLocation: clone(item.instance.location || {}),
                targetLocation: {
                  type: "HOUSING_STORAGE",
                  housingRecordId: id(targetUnit.housingRecordId),
                  storageUnitId: unit.id,
                  gridX: x + 1,
                  gridY: y + 1,
                  rotation: orientation.rotation
                },
                width: orientation.width,
                height: orientation.height,
                targetStorageType: unit.type
              };
              break;
            }
            if (placement) break;
          }
          if (placement) break;
        }
        if (placement) break;
      }
      if (!placement) {
        return {
          ok: false,
          errorCode: "HOUSING_RELOCATION_TARGET_CAPACITY_EXCEEDED",
          blockedInstanceId: item.instanceId,
          requiredFootprint: `${item.width}x${item.height}`,
          targetStorageUnits: units.map((unit) => ({ id: unit.id, type: unit.type, width: unit.width, height: unit.height })),
          placements
        };
      }
      placements.push(placement);
    }

    return {
      ok: true,
      transitionId: id(transition.transitionId),
      citizenId: id(citizen.id),
      fromHousingRecordId: id(record.id),
      targetHousingRecordId: id(targetUnit.housingRecordId),
      targetUnit,
      placements,
      instanceIds: placements.map((placement) => placement.instanceId),
      targetStorageUnits: units
    };
  }

  function getRelocationAttemptIndex(transitionId = "") {
    const requested = id(transitionId);
    if (!requested || typeof app.getItemInstanceTransactions !== "function") return 0;
    const transactions = app.getItemInstanceTransactions({ sourceDomain: SOURCE_DOMAIN }) || [];
    return transactions.filter((transaction) => {
      if (token(transaction?.metadata?.operationType) !== "HOUSING_RELOCATION") return false;
      if (id(transaction?.metadata?.transitionId) !== requested) return false;
      return ["FAILED", "COMPENSATED"].includes(token(transaction?.status));
    }).length;
  }

  function emitUpdate(detail = {}) {
    if (typeof window.dispatchEvent !== "function" || typeof window.CustomEvent !== "function") return;
    window.dispatchEvent(new CustomEvent(EVENT_NAME, {
      detail: {
        eventId: `housing-relocation:${id(detail.transitionId || detail.contractId || "unknown")}:${token(detail.resultCode || "UPDATED")}`,
        occurredAt: nowIso(),
        ...clone(detail)
      }
    }));
  }

  function buildCompletedHousingState(context = {}, plan = {}, transaction = null) {
    const { citizen, housing, recordIndex, record, transition, contract } = context;
    const target = clone(plan.targetUnit || transition.targetUnit || {});
    const address = id(target.visibleAddress || record.visibleAddress || citizen.address || citizen.visibleAddress);
    const traceAddress = id(target.traceAddress || record.traceAddress || citizen.traceAddress || citizen.trace);
    const completedAt = nowIso();
    const historyEntry = {
      transitionId: id(transition.transitionId),
      type: "RELOCATION",
      status: "COMPLETED",
      contractRevision: Number(transition.contractRevision || contract.revision || 1),
      fromHousingRecordId: id(record.id),
      targetHousingRecordId: id(target.housingRecordId),
      instanceIds: clone(plan.instanceIds || []),
      itemTransactionId: id(transaction?.transactionId),
      completedAt
    };
    const targetRecord = {
      ...clone(record),
      ...target,
      id: id(target.housingRecordId),
      title: id(target.title || record.title),
      status: "ACTIVE",
      occupancyStatus: "OCCUPIED",
      isPrimary: record.isPrimary === true,
      provider: id(record.provider || contract.displaySnapshot?.provider || "Habitat Ledger"),
      linkedSubscriptionId: id(contract.subscriptionContractId),
      rentStatus: token(contract.billingStatus || contract.contractStatus || "UNKNOWN"),
      visibleAddress: address,
      traceAddress,
      archived: false,
      rentTransition: null,
      relocationHistory: [...(Array.isArray(record.relocationHistory) ? clone(record.relocationHistory) : []), historyEntry],
      rentBridge: {
        ...(clone(record.rentBridge) || {}),
        subscriptionContractId: id(contract.subscriptionContractId),
        subscriptionCatalogId: id(contract.subscriptionCatalogId),
        appliedContractRevision: Number(transition.contractRevision || contract.revision || 1),
        lastReconciledAt: completedAt,
        transitionState: "STABLE",
        relocationRuntimeVersion: API_VERSION,
        lastRelocationTransitionId: id(transition.transitionId),
        lastRelocationTransactionId: id(transaction?.transactionId)
      }
    };
    delete targetRecord.housingRecordId;
    const releasedRecord = {
      ...clone(record),
      status: "RELEASED",
      occupancyStatus: "VACANT",
      isPrimary: false,
      linkedSubscriptionId: "",
      historicalSubscriptionContractId: id(contract.subscriptionContractId),
      archived: true,
      rentTransition: null,
      releasedAt: completedAt,
      releasedByTransitionId: id(transition.transitionId),
      rentBridge: {
        ...(clone(record.rentBridge) || {}),
        transitionState: "RELOCATED",
        lastReconciledAt: completedAt,
        relocationRuntimeVersion: API_VERSION,
        lastRelocationTransitionId: id(transition.transitionId),
        lastRelocationTransactionId: id(transaction?.transactionId)
      }
    };
    const nextHousing = clone(housing);
    if (targetRecord.isPrimary) {
      nextHousing.forEach((entry, index) => {
        if (index !== recordIndex && entry?.archived !== true) entry.isPrimary = false;
      });
    }
    nextHousing.splice(recordIndex, 1, targetRecord, releasedRecord);
    return { nextHousing, targetRecord, releasedRecord, address, traceAddress, historyEntry };
  }

  function persistCompletedHousing(context = {}, plan = {}, transaction = null, options = {}) {
    const state = buildCompletedHousingState(context, plan, transaction);
    const patch = { housing: state.nextHousing };
    if (context.record.isPrimary === true) {
      patch.address = state.address;
      patch.visibleAddress = state.address;
      patch.trace = state.traceAddress;
      patch.traceAddress = state.traceAddress;
    }
    const updatedCitizen = app.updateCitizen?.(context.citizen.id, patch, {
      source: "HOUSING_RENT_RELOCATION_RUNTIME",
      skipModuleRefresh: options.skipModuleRefresh === true,
      skipProfileRefresh: options.skipProfileRefresh === true
    });
    if (!updatedCitizen) return { ok: false, errorCode: "HOUSING_RELOCATION_PERSISTENCE_FAILED", ...state };
    app.housingActiveRecordByCitizen = app.housingActiveRecordByCitizen || {};
    app.housingActiveRecordByCitizen[context.citizen.id] = state.targetRecord.id;
    return { ok: true, updatedCitizen: clone(updatedCitizen), ...state };
  }

  function previewHousingRentRelocation(contractOrId = {}) {
    const context = getTransitionContext(contractOrId);
    if (!context.ok) return context;
    const packing = buildTransferPacking(context);
    return { ...packing, contractId: id(context.contract.subscriptionContractId), transition: clone(context.transition) };
  }

  function approveHousingRentRelocation(contractOrId = {}, options = {}) {
    const context = getTransitionContext(contractOrId);
    if (!context.ok) return context;
    if (!context.transition || token(context.transition.type) !== "RELOCATION_REQUIRED") {
      const completed = (Array.isArray(context.record.relocationHistory) ? context.record.relocationHistory : [])
        .find((entry) => id(entry?.transitionId) === id(options.transitionId));
      return completed
        ? { ok: true, resultCode: "HOUSING_RELOCATION_ALREADY_COMPLETED", housingRecord: clone(context.record), historyEntry: clone(completed) }
        : { ok: false, errorCode: "HOUSING_RELOCATION_NOT_PREPARED" };
    }
    const plan = buildTransferPacking(context);
    if (!plan.ok) return plan;

    let itemCommit = null;
    if (plan.placements.length) {
      const attemptIndex = getRelocationAttemptIndex(plan.transitionId);
      itemCommit = app.commitItemInstanceTransaction?.({
        idempotencyKey: `housing-relocation:${plan.transitionId}:${Number(context.transition.contractRevision || context.contract.revision || 1)}:attempt-${attemptIndex}`,
        sourceDomain: SOURCE_DOMAIN,
        sourceRefId: plan.transitionId,
        citizenId: context.citizen.id,
        changedDomains: ["ITEM_INSTANCE", "HOUSING"],
        metadata: {
          operationType: "HOUSING_RELOCATION",
          transitionId: plan.transitionId,
          contractId: id(context.contract.subscriptionContractId),
          fromHousingRecordId: plan.fromHousingRecordId,
          targetHousingRecordId: plan.targetHousingRecordId,
          contractRevision: Number(context.transition.contractRevision || context.contract.revision || 1),
          attemptIndex
        },
        operations: plan.placements.map((placement) => ({
          type: "MOVE",
          instanceId: placement.instanceId,
          expected: {
            ownerId: context.citizen.id,
            locationType: token(placement.sourceLocation?.type)
          },
          toLocation: clone(placement.targetLocation),
          lifecycleState: "UNPACKAGED"
        }))
      }) || { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_API_REQUIRED" };
      if (!itemCommit.ok || itemCommit.compensated === true || (itemCommit.operation === "IDEMPOTENT_REPLAY" && itemCommit.committed !== true)) {
        return { ok: false, errorCode: itemCommit.reason || "HOUSING_RELOCATION_ITEM_TRANSFER_FAILED", itemCommit, plan };
      }
    }

    const latestContext = getTransitionContext(context.contract.subscriptionContractId);
    if (!latestContext.ok || id(latestContext.transition?.transitionId) !== plan.transitionId) {
      if (itemCommit?.transaction?.transactionId) {
        app.compensateItemInstanceTransaction?.(itemCommit.transaction.transactionId, {
          idempotencyKey: `${itemCommit.transaction.idempotencyKey}:housing-transition-conflict`,
          source: "HOUSING_RELOCATION_CONFLICT_COMPENSATION",
          changedDomains: ["ITEM_INSTANCE", "HOUSING"]
        });
      }
      return { ok: false, errorCode: "HOUSING_RELOCATION_TRANSITION_CONFLICT", plan };
    }

    const persisted = persistCompletedHousing(latestContext, plan, itemCommit?.transaction || null, options);
    if (!persisted.ok) {
      const compensation = itemCommit?.transaction?.transactionId
        ? app.compensateItemInstanceTransaction?.(itemCommit.transaction.transactionId, {
            idempotencyKey: `${itemCommit.transaction.idempotencyKey}:housing-persistence-failed`,
            source: "HOUSING_RELOCATION_PERSISTENCE_COMPENSATION",
            changedDomains: ["ITEM_INSTANCE", "HOUSING"]
          })
        : null;
      return { ...persisted, compensation, recoveryRequired: compensation?.ok === false };
    }

    emitUpdate({
      citizenId: context.citizen.id,
      contractId: context.contract.subscriptionContractId,
      transitionId: plan.transitionId,
      fromHousingRecordId: plan.fromHousingRecordId,
      targetHousingRecordId: plan.targetHousingRecordId,
      resultCode: "HOUSING_RELOCATION_COMPLETED",
      instanceIds: plan.instanceIds,
      itemTransactionId: id(itemCommit?.transaction?.transactionId)
    });
    return {
      ok: true,
      resultCode: "HOUSING_RELOCATION_COMPLETED",
      citizen: persisted.updatedCitizen,
      housingRecord: clone(persisted.targetRecord),
      releasedHousingRecord: clone(persisted.releasedRecord),
      transferPlan: plan,
      itemCommit
    };
  }

  function cancelHousingRentRelocation(contractOrId = {}, options = {}) {
    const context = getTransitionContext(contractOrId);
    if (!context.ok) return context;
    const transition = context.transition;
    if (!transition || token(transition.type) !== "RELOCATION_REQUIRED" || token(transition.status || "PREPARED") !== "PREPARED") {
      return { ok: false, errorCode: "HOUSING_RELOCATION_NOT_PREPARED" };
    }
    const previousTierId = id(transition.from?.standardTierId);
    if (!previousTierId) return { ok: false, errorCode: "HOUSING_RELOCATION_PREVIOUS_TIER_REQUIRED" };
    if (typeof app.SubscriptionAPI?.changeSubscriptionTier !== "function") {
      return { ok: false, errorCode: "SUBSCRIPTION_TIER_CHANGE_API_REQUIRED" };
    }
    const result = app.SubscriptionAPI.changeSubscriptionTier(context.contract.subscriptionContractId, previousTierId, {
      idempotencyKey: options.idempotencyKey || `housing-relocation-cancel:${id(transition.transitionId)}`,
      reason: "HOUSING_RELOCATION_CANCELLED",
      resultCode: "HOUSING_RELOCATION_CANCELLED",
      billingStatus: context.contract.billingStatus || "PENDING"
    });
    if (!result?.ok) {
      return { ok: false, errorCode: result?.errorCode || result?.reason || "HOUSING_RELOCATION_CANCEL_FAILED", subscriptionResult: result };
    }
    app.reconcileHousingRentContract?.(context.contract.subscriptionContractId, { force: true, skipModuleRefresh: options.skipModuleRefresh === true });
    emitUpdate({
      citizenId: context.citizen.id,
      contractId: context.contract.subscriptionContractId,
      transitionId: id(transition.transitionId),
      resultCode: "HOUSING_RELOCATION_CANCELLED"
    });
    return { ok: true, resultCode: "HOUSING_RELOCATION_CANCELLED", subscriptionResult: result };
  }

  function recoverHousingRentRelocations(options = {}) {
    const transactions = app.getItemInstanceTransactions?.({ sourceDomain: SOURCE_DOMAIN }) || [];
    const recoverable = transactions.filter((transaction) => token(transaction.metadata?.operationType) === "HOUSING_RELOCATION" && ["COMMITTED", "RECOVERY_REQUIRED"].includes(token(transaction.status)));
    const results = [];
    recoverable.forEach((transaction) => {
      const contractId = id(transaction.metadata?.contractId);
      const context = getTransitionContext(contractId);
      if (!context.ok || !context.transition) return;
      if (id(context.transition.transitionId) !== id(transaction.metadata?.transitionId)) return;
      const plan = buildTransferPacking(context);
      const recordedAfter = Array.isArray(transaction.afterInstances) ? transaction.afterInstances : [];
      const recoveredPlan = plan.ok ? plan : {
        ok: true,
        transitionId: id(context.transition.transitionId),
        citizenId: id(context.citizen.id),
        fromHousingRecordId: id(context.record.id),
        targetHousingRecordId: id(context.transition.targetUnit?.housingRecordId),
        targetUnit: clone(context.transition.targetUnit),
        placements: recordedAfter.map((entry) => ({ instanceId: id(entry.instanceId), targetLocation: clone(entry.instance?.location || {}) })),
        instanceIds: recordedAfter.map((entry) => id(entry.instanceId)).filter(Boolean)
      };
      const persisted = persistCompletedHousing(context, recoveredPlan, transaction, options);
      if (persisted.ok) {
        emitUpdate({ citizenId: context.citizen.id, contractId, transitionId: recoveredPlan.transitionId, resultCode: "HOUSING_RELOCATION_RECOVERED", itemTransactionId: transaction.transactionId });
      }
      results.push({ contractId, transactionId: transaction.transactionId, ...persisted });
    });
    return { ok: results.every((result) => result.ok !== false), recovered: results.filter((result) => result.ok).length, results };
  }

  function validateRuntime() {
    const dependencies = [
      "getCitizenById",
      "updateCitizen",
      "getItemInstanceById",
      "getItemInstanceView",
      "commitItemInstanceTransaction",
      "compensateItemInstanceTransaction",
      "reconcileHousingRentContract"
    ];
    const missing = dependencies.filter((name) => typeof app[name] !== "function");
    if (!app.SubscriptionAPI) missing.push("SubscriptionAPI");
    return { valid: missing.length === 0, version: API_VERSION, missing };
  }

  app.HousingRentRelocationRuntime = Object.freeze({
    version: API_VERSION,
    previewHousingRentRelocation,
    approveHousingRentRelocation,
    cancelHousingRentRelocation,
    recoverHousingRentRelocations,
    validate: validateRuntime
  });

  Object.assign(app, {
    HOUSING_RENT_RELOCATION_RUNTIME_VERSION: API_VERSION,
    previewHousingRentRelocation,
    approveHousingRentRelocation,
    cancelHousingRentRelocation,
    recoverHousingRentRelocations,
    validateHousingRentRelocationRuntime: validateRuntime
  });

  if (validateRuntime().valid) recoverHousingRentRelocations({ skipModuleRefresh: true, skipProfileRefresh: true });
})();
