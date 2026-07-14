window.WS_APP = window.WS_APP || {};

(function initItemTypeOperations() {
  const API_VERSION = "1.3.1";
  const MAGAZINE_WELL_SLOT = "MAGAZINE_WELL";
  const EQUIPMENT_RETURN_LOCATION_TYPES = new Set(["EQUIPPED", "CONTAINER_GRID", "HOUSING_STORAGE", "UNPLACED"]);

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

  function normalizePositiveInteger(value, fallback = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(1, Math.round(number));
  }


  const LEGACY_CONSUMABLE_EFFECT_STORAGE_KEYS = Object.freeze([
    "ws_citizen_status_effects_v1",
    "ws_citizen_status_effects_schema",
    "ws_item_effect_resolutions_v1",
    "ws_item_effect_resolutions_schema"
  ]);

  function getCampaignDay(value = "") {
    const direct = normalizeId(value).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct;
    const campaignDay = normalizeId(window.WS_APP.getCampaignDateIso?.() || window.WS_APP.CAMPAIGN_DATE_ISO).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(campaignDay) ? campaignDay : "2109-02-13";
  }

  function clearLegacyConsumableEffectStorage() {
    try {
      LEGACY_CONSUMABLE_EFFECT_STORAGE_KEYS.forEach((key) => window.localStorage?.removeItem?.(key));
      return true;
    } catch (error) {
      console.warn("W&S legacy consumable effect storage could not be cleared.", error);
      return false;
    }
  }

  function getConsumableUsageLog(filters = {}) {
    const citizenId = normalizeId(filters.citizenId);
    const instanceId = normalizeId(filters.instanceId || filters.itemInstanceId);
    const definitionId = normalizeId(filters.definitionId);
    const campaignDay = normalizeId(filters.campaignDay).slice(0, 10);
    const transactions = typeof window.WS_APP.getItemInstanceTransactions === "function"
      ? window.WS_APP.getItemInstanceTransactions({ citizenId, sourceDomain: "ITEM_TYPE", status: "COMMITTED" })
      : [];
    return transactions
      .filter((record) => normalizeToken(record?.metadata?.operationType) === "CONSUMABLE_USE")
      .map((record) => {
        const result = record?.metadata?.result && typeof record.metadata.result === "object" ? record.metadata.result : {};
        const day = getCampaignDay(result.campaignDay || record.committedAt || record.preparedAt || record.updatedAt);
        return {
          usageId: normalizeId(record.transactionId),
          campaignDay: day,
          citizenId: normalizeId(record.citizenId),
          itemInstanceId: normalizeId(result.instanceId),
          definitionId: normalizeId(result.definitionId),
          itemName: normalizeId(result.itemName || result.catalogName || result.definitionId || "Consumable"),
          quantityUsed: Math.max(1, Number(result.quantityUsed || result.unitsConsumed || 1)),
          remainingQuantity: Math.max(0, Number(result.remainingQuantity || 0)),
          itemRemoved: result.itemRemoved === true,
          source: normalizeToken(result.usageSource || "EQUIPMENT"),
          recordedAt: normalizeId(record.committedAt || record.preparedAt || record.updatedAt || day)
        };
      })
      .filter((entry) => !instanceId || entry.itemInstanceId === instanceId)
      .filter((entry) => !definitionId || entry.definitionId === definitionId)
      .filter((entry) => !campaignDay || entry.campaignDay === campaignDay)
      .sort((left, right) => right.campaignDay.localeCompare(left.campaignDay) || right.usageId.localeCompare(left.usageId));
  }

  function getConsumableUsageByDay(filters = {}) {
    const groups = new Map();
    getConsumableUsageLog(filters).forEach((entry) => {
      if (!groups.has(entry.campaignDay)) {
        groups.set(entry.campaignDay, {
          campaignDay: entry.campaignDay,
          totalQuantityUsed: 0,
          entries: []
        });
      }
      const group = groups.get(entry.campaignDay);
      group.totalQuantityUsed += entry.quantityUsed;
      group.entries.push(entry);
    });
    return [...groups.values()]
      .sort((left, right) => right.campaignDay.localeCompare(left.campaignDay))
      .map((group) => clone(group));
  }

  function stableSerialize(value) {
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value ?? null);
  }

  function makeCommandSignature(operationType = "", input = {}) {
    const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    const signatureInput = { ...clone(source) };
    delete signatureInput.idempotencyKey;
    delete signatureInput.expectedStoreRevision;
    delete signatureInput.primaryInstanceId;
    return `${normalizeToken(operationType)}:${stableSerialize(signatureInput)}`;
  }

  function getOperationContext(instanceId = "") {
    const id = normalizeId(instanceId);
    const instance = window.WS_APP.getItemInstanceById?.(id) || null;
    if (!instance) return null;
    const view = window.WS_APP.getItemInstanceView?.(id) || clone(instance);
    const typeId = typeof window.WS_APP.resolveItemTypeId === "function"
      ? window.WS_APP.resolveItemTypeId(view)
      : normalizeToken(view.itemType || instance.itemState?.typeId || "GENERIC_ITEM");
    const profile = typeof window.WS_APP.normalizeItemTypeProfile === "function"
      ? window.WS_APP.normalizeItemTypeProfile(typeId, view.itemTypeProfile || {})
      : clone(view.itemTypeProfile || {});
    const state = typeof window.WS_APP.normalizeItemTypeState === "function"
      ? window.WS_APP.normalizeItemTypeState(typeId, instance.itemState || {}, profile)
      : clone(instance.itemState || { schemaVersion: 1, typeId, data: {} });
    return { instance, view, typeId, profile, state };
  }

  function assertContext(citizenId = "", instanceId = "", requiredType = "") {
    const ownerId = normalizeId(citizenId);
    if (!ownerId) return { ok: false, reason: "CITIZEN_ID_REQUIRED" };
    const context = getOperationContext(instanceId);
    if (!context) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND", instanceId: normalizeId(instanceId) };
    if (context.instance.ownerId && ownerId && context.instance.ownerId !== ownerId) {
      return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH", instanceId: context.instance.instanceId };
    }
    if (requiredType && context.typeId !== normalizeToken(requiredType)) {
      return { ok: false, reason: "ITEM_TYPE_OPERATION_TYPE_MISMATCH", instanceId: context.instance.instanceId, expectedType: normalizeToken(requiredType), actualType: context.typeId };
    }
    if (context.instance.location?.type === "DESTROYED" || context.instance.lifecycleState === "DISPOSED") {
      return { ok: false, reason: "ITEM_INSTANCE_DISPOSED", instanceId: context.instance.instanceId };
    }
    return { ok: true, context };
  }

  function buildItemState(context = {}, dataPatch = {}) {
    const nextData = {
      ...(clone(context.state?.data) || {}),
      ...(dataPatch && typeof dataPatch === "object" && !Array.isArray(dataPatch) ? clone(dataPatch) : {})
    };
    return typeof window.WS_APP.normalizeItemTypeState === "function"
      ? window.WS_APP.normalizeItemTypeState(context.typeId, nextData, context.profile)
      : { schemaVersion: 1, typeId: context.typeId, data: nextData };
  }

  function getInstalledMagazineContexts(firearmInstanceId = "") {
    const parentItemInstanceId = normalizeId(firearmInstanceId);
    return (window.WS_APP.getItemInstances?.({ includeDisposed: false }) || [])
      .filter((instance) => instance.location?.type === "INSTALLED_IN_ITEM"
        && normalizeId(instance.location.parentItemInstanceId) === parentItemInstanceId
        && normalizeToken(instance.location.moduleSlotId) === MAGAZINE_WELL_SLOT)
      .map((instance) => getOperationContext(instance.instanceId))
      .filter(Boolean);
  }

  function getInstalledMagazine(firearmInstanceId = "") {
    const matches = getInstalledMagazineContexts(firearmInstanceId);
    return matches.length === 1 ? clone(matches[0].instance) : null;
  }

  function resolveExistingReplay(idempotencyKey = "", commandSignature = "") {
    const key = normalizeId(idempotencyKey);
    if (!key) return null;
    const transaction = window.WS_APP.getItemInstanceTransactionByIdempotencyKey?.(key) || null;
    if (!transaction) return null;
    if (transaction.metadata?.commandSignature !== commandSignature) {
      return { ok: false, reason: "ITEM_TYPE_OPERATION_IDEMPOTENCY_CONFLICT", transaction: clone(transaction) };
    }
    return {
      ok: ["COMMITTED", "COMPENSATED", "RECOVERY_REQUIRED"].includes(transaction.status),
      operation: "IDEMPOTENT_REPLAY",
      committed: transaction.status === "COMMITTED",
      compensated: transaction.status === "COMPENSATED",
      recoveryRequired: transaction.status === "RECOVERY_REQUIRED",
      transaction: clone(transaction),
      result: clone(transaction.metadata?.result || null)
    };
  }


  function getOperationReplay(operationType = "", input = {}) {
    const idempotencyKey = normalizeId(input.idempotencyKey);
    if (!idempotencyKey) return null;
    return resolveExistingReplay(idempotencyKey, makeCommandSignature(operationType, input));
  }

  function emitOperationCommitted(operationType = "", result = {}, input = {}) {
    if (!result?.ok || result.operation === "IDEMPOTENT_REPLAY") return;
    window.dispatchEvent?.(new CustomEvent("ws:item-type-operation-committed", {
      detail: {
        operationType: normalizeToken(operationType),
        citizenId: normalizeId(input.citizenId),
        transactionId: result.transaction?.transactionId || "",
        instanceIds: [...(result.instanceIds || [])],
        storeRevision: result.storeRevision ?? null,
        result: clone(result.result || null)
      }
    }));
  }

  function commitOperation(operationType = "", input = {}, operations = [], resultMetadata = {}) {
    const idempotencyKey = normalizeId(input.idempotencyKey);
    if (!idempotencyKey) return { ok: false, reason: "IDEMPOTENCY_KEY_REQUIRED" };
    if (typeof window.WS_APP.commitItemInstanceTransaction !== "function") {
      return { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_API_REQUIRED" };
    }
    const commandSignature = makeCommandSignature(operationType, input);
    const replay = resolveExistingReplay(idempotencyKey, commandSignature);
    if (replay) return replay;
    const result = window.WS_APP.commitItemInstanceTransaction({
      idempotencyKey,
      expectedStoreRevision: input.expectedStoreRevision,
      sourceDomain: "ITEM_TYPE",
      sourceRefId: `${normalizeToken(operationType)}:${normalizeId(input.primaryInstanceId || input.firearmInstanceId || input.magazineInstanceId || input.grenadeInstanceId || input.instanceId)}`,
      citizenId: normalizeId(input.citizenId),
      operations,
      changedDomains: ["ITEM_INSTANCE", "ITEM_TYPE"],
      source: `ITEM_TYPE_${normalizeToken(operationType)}`,
      metadata: {
        operationType: normalizeToken(operationType),
        commandSignature,
        result: clone(resultMetadata)
      }
    });
    const next = { ...result, result: clone(resultMetadata) };
    emitOperationCommitted(operationType, next, input);
    return next;
  }

  function validateMagazineCompatibility(firearm = {}, magazine = {}) {
    if (normalizeToken(firearm.profile.magazineType) !== normalizeToken(magazine.profile.magazineType)) {
      return { ok: false, reason: "MAGAZINE_TYPE_INCOMPATIBLE" };
    }
    const firearmAmmoType = normalizeToken(firearm.profile.ammunitionType);
    const magazineAmmoType = normalizeToken(magazine.profile.ammunitionType);
    if (firearmAmmoType && magazineAmmoType && firearmAmmoType !== magazineAmmoType) {
      return { ok: false, reason: "MAGAZINE_AMMUNITION_TYPE_INCOMPATIBLE" };
    }
    return { ok: true };
  }

  function loadMagazine(input = {}) {
    const replay = getOperationReplay("MAGAZINE_LOAD", input);
    if (replay) return replay;
    const magazineCheck = assertContext(input.citizenId, input.magazineInstanceId, "MAGAZINE");
    if (!magazineCheck.ok) return magazineCheck;
    const ammunitionCheck = assertContext(input.citizenId, input.ammunitionInstanceId, "AMMUNITION");
    if (!ammunitionCheck.ok) return ammunitionCheck;
    const magazine = magazineCheck.context;
    const ammunition = ammunitionCheck.context;
    const rounds = normalizePositiveInteger(input.rounds, 1);
    const capacity = Math.max(1, Number(magazine.profile.capacity || 1));
    const currentRounds = Math.max(0, Number(magazine.state.data.roundsCurrent || 0));
    if (currentRounds + rounds > capacity) return { ok: false, reason: "MAGAZINE_CAPACITY_EXCEEDED", capacity, currentRounds, requestedRounds: rounds };
    if (Number(ammunition.instance.quantity || 0) < rounds) return { ok: false, reason: "AMMUNITION_QUANTITY_INSUFFICIENT", availableRounds: ammunition.instance.quantity, requestedRounds: rounds };
    if (normalizeToken(magazine.profile.ammunitionType) !== normalizeToken(ammunition.profile.ammunitionType)) {
      return { ok: false, reason: "AMMUNITION_TYPE_INCOMPATIBLE" };
    }
    const loadedDefinitionId = normalizeId(magazine.state.data.ammunitionDefinitionId);
    if (currentRounds > 0 && loadedDefinitionId && loadedDefinitionId !== ammunition.instance.definitionId) {
      return { ok: false, reason: "MAGAZINE_MIXED_AMMUNITION_NOT_SUPPORTED", loadedDefinitionId, requestedDefinitionId: ammunition.instance.definitionId };
    }
    const remainingQuantity = Number(ammunition.instance.quantity || 0) - rounds;
    const nextMagazineState = buildItemState(magazine, {
      ammunitionDefinitionId: ammunition.instance.definitionId,
      roundsCurrent: currentRounds + rounds
    });
    const operations = [
      { type: "PATCH", instanceId: magazine.instance.instanceId, patch: { itemState: nextMagazineState } },
      remainingQuantity > 0
        ? { type: "PATCH", instanceId: ammunition.instance.instanceId, patch: { quantity: remainingQuantity } }
        : { type: "REMOVE", instanceId: ammunition.instance.instanceId }
    ];
    return commitOperation("MAGAZINE_LOAD", { ...input, primaryInstanceId: magazine.instance.instanceId }, operations, {
      magazineInstanceId: magazine.instance.instanceId,
      ammunitionInstanceId: ammunition.instance.instanceId,
      ammunitionDefinitionId: ammunition.instance.definitionId,
      roundsLoaded: rounds,
      roundsCurrent: currentRounds + rounds,
      ammunitionStackRemaining: remainingQuantity
    });
  }

  function unloadMagazine(input = {}) {
    const replay = getOperationReplay("MAGAZINE_UNLOAD", input);
    if (replay) return replay;
    const magazineCheck = assertContext(input.citizenId, input.magazineInstanceId, "MAGAZINE");
    if (!magazineCheck.ok) return magazineCheck;
    const magazine = magazineCheck.context;
    const currentRounds = Math.max(0, Number(magazine.state.data.roundsCurrent || 0));
    if (!currentRounds) return { ok: false, reason: "MAGAZINE_EMPTY" };
    const rounds = normalizePositiveInteger(input.rounds, currentRounds);
    if (rounds > currentRounds) return { ok: false, reason: "MAGAZINE_ROUNDS_INSUFFICIENT", availableRounds: currentRounds, requestedRounds: rounds };
    const ammunitionDefinitionId = normalizeId(magazine.state.data.ammunitionDefinitionId);
    if (!ammunitionDefinitionId) return { ok: false, reason: "MAGAZINE_AMMUNITION_DEFINITION_REQUIRED" };
    const nextRounds = currentRounds - rounds;
    const nextMagazineState = buildItemState(magazine, {
      ammunitionDefinitionId: nextRounds > 0 ? ammunitionDefinitionId : "",
      roundsCurrent: nextRounds
    });
    const operations = [{ type: "PATCH", instanceId: magazine.instance.instanceId, patch: { itemState: nextMagazineState } }];
    let targetInstanceId = normalizeId(input.targetAmmunitionInstanceId);
    if (targetInstanceId) {
      const targetCheck = assertContext(input.citizenId, targetInstanceId, "AMMUNITION");
      if (!targetCheck.ok) return targetCheck;
      const target = targetCheck.context;
      if (target.instance.definitionId !== ammunitionDefinitionId) return { ok: false, reason: "AMMUNITION_RETURN_DEFINITION_MISMATCH" };
      const stackLimit = Math.max(1, Number(target.profile.stackLimit || 1));
      const nextQuantity = Number(target.instance.quantity || 0) + rounds;
      if (nextQuantity > stackLimit) return { ok: false, reason: "AMMUNITION_STACK_LIMIT_EXCEEDED", stackLimit, nextQuantity };
      operations.push({ type: "PATCH", instanceId: target.instance.instanceId, patch: { quantity: nextQuantity } });
    } else {
      targetInstanceId = normalizeId(input.newAmmunitionInstanceId);
      if (!targetInstanceId) return { ok: false, reason: "AMMUNITION_RETURN_TARGET_REQUIRED" };
      if (window.WS_APP.getItemInstanceById?.(targetInstanceId)) return { ok: false, reason: "DUPLICATE_INSTANCE_ID", instanceId: targetInstanceId };
      const returnLocation = input.returnLocation && typeof input.returnLocation === "object"
        ? clone(input.returnLocation)
        : { type: "UNPLACED", characterId: normalizeId(input.citizenId) };
      operations.push({
        type: "CREATE",
        instanceId: targetInstanceId,
        instance: {
          instanceId: targetInstanceId,
          definitionId: ammunitionDefinitionId,
          ownerId: normalizeId(input.citizenId),
          quantity: rounds,
          location: returnLocation
        }
      });
    }
    return commitOperation("MAGAZINE_UNLOAD", { ...input, primaryInstanceId: magazine.instance.instanceId }, operations, {
      magazineInstanceId: magazine.instance.instanceId,
      ammunitionInstanceId: targetInstanceId,
      ammunitionDefinitionId,
      roundsUnloaded: rounds,
      roundsCurrent: nextRounds
    });
  }

  function insertFirearmMagazine(input = {}) {
    const replay = getOperationReplay("FIREARM_INSERT_MAGAZINE", input);
    if (replay) return replay;
    const firearmCheck = assertContext(input.citizenId, input.firearmInstanceId, "FIREARM");
    if (!firearmCheck.ok) return firearmCheck;
    const magazineCheck = assertContext(input.citizenId, input.magazineInstanceId, "MAGAZINE");
    if (!magazineCheck.ok) return magazineCheck;
    const firearm = firearmCheck.context;
    const magazine = magazineCheck.context;
    const compatibility = validateMagazineCompatibility(firearm, magazine);
    if (!compatibility.ok) return compatibility;
    const installed = getInstalledMagazineContexts(firearm.instance.instanceId);
    if (installed.length) return { ok: false, reason: "FIREARM_MAGAZINE_WELL_OCCUPIED", magazineInstanceId: installed[0].instance.instanceId };
    if (magazine.instance.location?.type === "INSTALLED_IN_ITEM") return { ok: false, reason: "MAGAZINE_ALREADY_INSTALLED", magazineInstanceId: magazine.instance.instanceId };
    return commitOperation("FIREARM_INSERT_MAGAZINE", { ...input, primaryInstanceId: firearm.instance.instanceId }, [{
      type: "MOVE",
      instanceId: magazine.instance.instanceId,
      toLocation: {
        type: "INSTALLED_IN_ITEM",
        parentItemInstanceId: firearm.instance.instanceId,
        moduleSlotId: MAGAZINE_WELL_SLOT
      },
      lifecycleState: "INSTALLED"
    }], {
      firearmInstanceId: firearm.instance.instanceId,
      magazineInstanceId: magazine.instance.instanceId,
      moduleSlotId: MAGAZINE_WELL_SLOT
    });
  }

  function removeFirearmMagazine(input = {}) {
    const replay = getOperationReplay("FIREARM_REMOVE_MAGAZINE", input);
    if (replay) return replay;
    const firearmCheck = assertContext(input.citizenId, input.firearmInstanceId, "FIREARM");
    if (!firearmCheck.ok) return firearmCheck;
    const matches = getInstalledMagazineContexts(firearmCheck.context.instance.instanceId);
    if (!matches.length) return { ok: false, reason: "FIREARM_MAGAZINE_NOT_INSTALLED" };
    if (matches.length > 1) return { ok: false, reason: "FIREARM_MAGAZINE_WELL_CONFLICT", magazineInstanceIds: matches.map((entry) => entry.instance.instanceId) };
    const magazine = matches[0];
    const requestedMagazineId = normalizeId(input.magazineInstanceId);
    if (requestedMagazineId && requestedMagazineId !== magazine.instance.instanceId) {
      return { ok: false, reason: "FIREARM_MAGAZINE_INSTANCE_MISMATCH", magazineInstanceId: magazine.instance.instanceId };
    }
    const returnLocation = input.returnLocation && typeof input.returnLocation === "object"
      ? clone(input.returnLocation)
      : { type: "UNPLACED", characterId: normalizeId(input.citizenId) };
    const returnType = normalizeToken(returnLocation.type);
    if (!EQUIPMENT_RETURN_LOCATION_TYPES.has(returnType)) return { ok: false, reason: "MAGAZINE_RETURN_LOCATION_INVALID", locationType: returnType };
    return commitOperation("FIREARM_REMOVE_MAGAZINE", { ...input, primaryInstanceId: firearmCheck.context.instance.instanceId }, [{
      type: "MOVE",
      instanceId: magazine.instance.instanceId,
      toLocation: returnLocation,
      lifecycleState: returnType === "UNPLACED" ? "STORED" : "UNPACKAGED"
    }], {
      firearmInstanceId: firearmCheck.context.instance.instanceId,
      magazineInstanceId: magazine.instance.instanceId,
      returnLocation
    });
  }

  function chamberFirearmRound(input = {}) {
    const replay = getOperationReplay("FIREARM_CHAMBER", input);
    if (replay) return replay;
    const firearmCheck = assertContext(input.citizenId, input.firearmInstanceId, "FIREARM");
    if (!firearmCheck.ok) return firearmCheck;
    const firearm = firearmCheck.context;
    if (firearm.state.data.jammed) return { ok: false, reason: "FIREARM_JAMMED" };
    const chamberCapacity = Math.max(0, Number(firearm.profile.chamberCapacity || 0));
    const chamberedRounds = Math.max(0, Number(firearm.state.data.chamberedRounds || 0));
    const rounds = normalizePositiveInteger(input.rounds, 1);
    if (chamberedRounds + rounds > chamberCapacity) return { ok: false, reason: "FIREARM_CHAMBER_CAPACITY_EXCEEDED", chamberCapacity, chamberedRounds, requestedRounds: rounds };
    const matches = getInstalledMagazineContexts(firearm.instance.instanceId);
    if (matches.length !== 1) return { ok: false, reason: matches.length ? "FIREARM_MAGAZINE_WELL_CONFLICT" : "FIREARM_MAGAZINE_NOT_INSTALLED" };
    const magazine = matches[0];
    const magazineRounds = Math.max(0, Number(magazine.state.data.roundsCurrent || 0));
    if (magazineRounds < rounds) return { ok: false, reason: "MAGAZINE_ROUNDS_INSUFFICIENT", availableRounds: magazineRounds, requestedRounds: rounds };
    const firearmState = buildItemState(firearm, { chamberedRounds: chamberedRounds + rounds });
    const magazineState = buildItemState(magazine, {
      ammunitionDefinitionId: magazine.state.data.ammunitionDefinitionId,
      roundsCurrent: magazineRounds - rounds
    });
    return commitOperation("FIREARM_CHAMBER", { ...input, primaryInstanceId: firearm.instance.instanceId }, [
      { type: "PATCH", instanceId: firearm.instance.instanceId, patch: { itemState: firearmState } },
      { type: "PATCH", instanceId: magazine.instance.instanceId, patch: { itemState: magazineState } }
    ], {
      firearmInstanceId: firearm.instance.instanceId,
      magazineInstanceId: magazine.instance.instanceId,
      roundsChambered: rounds,
      chamberedRounds: chamberedRounds + rounds,
      magazineRoundsCurrent: magazineRounds - rounds
    });
  }

  function clearFirearmChamber(input = {}) {
    const replay = getOperationReplay("FIREARM_CLEAR_CHAMBER", input);
    if (replay) return replay;
    const firearmCheck = assertContext(input.citizenId, input.firearmInstanceId, "FIREARM");
    if (!firearmCheck.ok) return firearmCheck;
    const firearm = firearmCheck.context;
    const chamberedRounds = Math.max(0, Number(firearm.state.data.chamberedRounds || 0));
    if (!chamberedRounds) return { ok: false, reason: "FIREARM_CHAMBER_EMPTY" };
    const operations = [{ type: "PATCH", instanceId: firearm.instance.instanceId, patch: { itemState: buildItemState(firearm, { chamberedRounds: 0 }) } }];
    let recoveredToMagazine = false;
    let magazineInstanceId = "";
    if (input.discardEjectedRounds !== true) {
      const matches = getInstalledMagazineContexts(firearm.instance.instanceId);
      if (matches.length !== 1) return { ok: false, reason: "CHAMBER_CLEAR_RETURN_TARGET_REQUIRED" };
      const magazine = matches[0];
      const compatibility = validateMagazineCompatibility(firearm, magazine);
      if (!compatibility.ok) return compatibility;
      const magazineRounds = Math.max(0, Number(magazine.state.data.roundsCurrent || 0));
      const capacity = Math.max(1, Number(magazine.profile.capacity || 1));
      if (magazineRounds + chamberedRounds > capacity) return { ok: false, reason: "MAGAZINE_CAPACITY_EXCEEDED", capacity, currentRounds: magazineRounds, requestedRounds: chamberedRounds };
      const ammunitionDefinitionId = normalizeId(magazine.state.data.ammunitionDefinitionId || input.ammunitionDefinitionId);
      if (!ammunitionDefinitionId) return { ok: false, reason: "CHAMBER_AMMUNITION_DEFINITION_REQUIRED" };
      operations.push({
        type: "PATCH",
        instanceId: magazine.instance.instanceId,
        patch: { itemState: buildItemState(magazine, { ammunitionDefinitionId, roundsCurrent: magazineRounds + chamberedRounds }) }
      });
      recoveredToMagazine = true;
      magazineInstanceId = magazine.instance.instanceId;
    }
    return commitOperation("FIREARM_CLEAR_CHAMBER", { ...input, primaryInstanceId: firearm.instance.instanceId }, operations, {
      firearmInstanceId: firearm.instance.instanceId,
      magazineInstanceId,
      ejectedRounds: chamberedRounds,
      recoveredToMagazine,
      discarded: !recoveredToMagazine
    });
  }

  function setFirearmSafety(input = {}) {
    const replay = getOperationReplay("FIREARM_SET_SAFETY", input);
    if (replay) return replay;
    const firearmCheck = assertContext(input.citizenId, input.firearmInstanceId, "FIREARM");
    if (!firearmCheck.ok) return firearmCheck;
    const firearm = firearmCheck.context;
    const safety = normalizeToken(input.safety);
    if (!["SAFE", "FIRE"].includes(safety)) return { ok: false, reason: "FIREARM_SAFETY_VALUE_INVALID", safety };
    return commitOperation("FIREARM_SET_SAFETY", { ...input, primaryInstanceId: firearm.instance.instanceId }, [{
      type: "PATCH",
      instanceId: firearm.instance.instanceId,
      patch: { itemState: buildItemState(firearm, { safety }) }
    }], { firearmInstanceId: firearm.instance.instanceId, safety });
  }

  function setFirearmFireMode(input = {}) {
    const replay = getOperationReplay("FIREARM_SET_FIRE_MODE", input);
    if (replay) return replay;
    const firearmCheck = assertContext(input.citizenId, input.firearmInstanceId, "FIREARM");
    if (!firearmCheck.ok) return firearmCheck;
    const firearm = firearmCheck.context;
    const fireMode = normalizeToken(input.fireMode);
    const supportedModes = Array.isArray(firearm.profile.fireModes) ? firearm.profile.fireModes.map(normalizeToken) : [];
    if (!supportedModes.includes(fireMode)) return { ok: false, reason: "FIREARM_FIRE_MODE_UNSUPPORTED", fireMode, supportedModes };
    return commitOperation("FIREARM_SET_FIRE_MODE", { ...input, primaryInstanceId: firearm.instance.instanceId }, [{
      type: "PATCH",
      instanceId: firearm.instance.instanceId,
      patch: { itemState: buildItemState(firearm, { fireMode }) }
    }], { firearmInstanceId: firearm.instance.instanceId, fireMode });
  }

  function armGrenade(input = {}) {
    const replay = getOperationReplay("GRENADE_ARM", input);
    if (replay) return replay;
    const grenadeCheck = assertContext(input.citizenId, input.grenadeInstanceId, "GRENADE");
    if (!grenadeCheck.ok) return grenadeCheck;
    const grenade = grenadeCheck.context;
    if (grenade.state.data.spent) return { ok: false, reason: "GRENADE_SPENT" };
    const triggerMode = normalizeToken(input.triggerMode || grenade.state.data.triggerMode || grenade.profile.triggerModes?.[0] || "MANUAL");
    const supportedModes = Array.isArray(grenade.profile.triggerModes) ? grenade.profile.triggerModes.map(normalizeToken) : [];
    if (supportedModes.length && !supportedModes.includes(triggerMode)) return { ok: false, reason: "GRENADE_TRIGGER_MODE_UNSUPPORTED", triggerMode, supportedModes };
    const fuseSeconds = Math.max(0, Math.round(Number(input.fuseSeconds ?? grenade.profile.defaultFuseSeconds ?? 0)) || 0);
    return commitOperation("GRENADE_ARM", { ...input, primaryInstanceId: grenade.instance.instanceId }, [{
      type: "PATCH",
      instanceId: grenade.instance.instanceId,
      patch: { itemState: buildItemState(grenade, { armed: true, triggerMode, fuseSeconds }) }
    }], {
      grenadeInstanceId: grenade.instance.instanceId,
      armed: true,
      triggerMode,
      fuseSeconds,
      timerStarted: false
    });
  }

  function disarmGrenade(input = {}) {
    const replay = getOperationReplay("GRENADE_DISARM", input);
    if (replay) return replay;
    const grenadeCheck = assertContext(input.citizenId, input.grenadeInstanceId, "GRENADE");
    if (!grenadeCheck.ok) return grenadeCheck;
    const grenade = grenadeCheck.context;
    if (grenade.state.data.spent) return { ok: false, reason: "GRENADE_SPENT" };
    return commitOperation("GRENADE_DISARM", { ...input, primaryInstanceId: grenade.instance.instanceId }, [{
      type: "PATCH",
      instanceId: grenade.instance.instanceId,
      patch: { itemState: buildItemState(grenade, { armed: false, fuseSeconds: 0 }) }
    }], { grenadeInstanceId: grenade.instance.instanceId, armed: false });
  }

  function useConsumable(input = {}) {
    const replay = getOperationReplay("CONSUMABLE_USE", input);
    if (replay) return replay;
    const itemCheck = assertContext(input.citizenId, input.instanceId, "CONSUMABLE");
    if (!itemCheck.ok) return itemCheck;
    const item = itemCheck.context;
    const units = normalizePositiveInteger(input.units, 1);
    const quantity = Math.max(1, Number(item.instance.quantity || 1));
    if (units > quantity) return { ok: false, reason: "CONSUMABLE_QUANTITY_INSUFFICIENT", availableUnits: quantity, requestedUnits: units };
    const remainingQuantity = quantity - units;
    const operation = remainingQuantity > 0
      ? { type: "PATCH", instanceId: item.instance.instanceId, patch: { quantity: remainingQuantity } }
      : { type: "REMOVE", instanceId: item.instance.instanceId };
    return commitOperation("CONSUMABLE_USE", { ...input, primaryInstanceId: item.instance.instanceId }, [operation], {
      instanceId: item.instance.instanceId,
      definitionId: item.instance.definitionId,
      itemName: normalizeId(item.view.playerLabel || item.view.displayName || item.view.catalogName || item.view.name || item.instance.definitionId || "Consumable"),
      consumableKind: normalizeToken(item.profile.consumableKind || "GENERAL"),
      quantityUsed: units,
      unitsConsumed: units,
      remainingQuantity,
      itemRemoved: remainingQuantity === 0,
      campaignDay: getCampaignDay(input.campaignDay || input.atTime),
      usageSource: normalizeToken(input.usageSource || input.source || "EQUIPMENT")
    });
  }

  function getItemTypeOperationAvailability(citizenId = "", instanceId = "") {
    const check = assertContext(citizenId, instanceId);
    if (!check.ok) return { ok: false, reason: check.reason, operations: [] };
    const context = check.context;
    const operations = [];
    if (context.typeId === "FIREARM") {
      const magazines = getInstalledMagazineContexts(context.instance.instanceId);
      const chamberedRounds = Number(context.state.data.chamberedRounds || 0);
      operations.push(
        { id: "FIREARM_INSERT_MAGAZINE", enabled: magazines.length === 0 },
        { id: "FIREARM_REMOVE_MAGAZINE", enabled: magazines.length === 1 },
        { id: "FIREARM_CHAMBER", enabled: magazines.length === 1 && chamberedRounds < Number(context.profile.chamberCapacity || 0) && Number(magazines[0]?.state.data.roundsCurrent || 0) > 0 },
        { id: "FIREARM_CLEAR_CHAMBER", enabled: chamberedRounds > 0 },
        { id: "FIREARM_SET_SAFETY", enabled: true },
        { id: "FIREARM_SET_FIRE_MODE", enabled: Array.isArray(context.profile.fireModes) && context.profile.fireModes.length > 0 }
      );
    } else if (context.typeId === "MAGAZINE") {
      operations.push(
        { id: "MAGAZINE_LOAD", enabled: Number(context.state.data.roundsCurrent || 0) < Number(context.profile.capacity || 0) },
        { id: "MAGAZINE_UNLOAD", enabled: Number(context.state.data.roundsCurrent || 0) > 0 }
      );
    } else if (context.typeId === "GRENADE") {
      operations.push(
        { id: "GRENADE_ARM", enabled: !context.state.data.armed && !context.state.data.spent },
        { id: "GRENADE_DISARM", enabled: Boolean(context.state.data.armed) && !context.state.data.spent }
      );
    } else if (context.typeId === "CONSUMABLE") {
      operations.push({ id: "CONSUMABLE_USE", enabled: true });
    }
    return { ok: true, instanceId: context.instance.instanceId, itemType: context.typeId, operations };
  }

  clearLegacyConsumableEffectStorage();

  Object.assign(window.WS_APP, {
    ITEM_TYPE_OPERATIONS_VERSION: API_VERSION,
    ITEM_TYPE_MAGAZINE_WELL_SLOT: MAGAZINE_WELL_SLOT,
    getInstalledMagazine,
    getItemTypeOperationAvailability,
    loadMagazine,
    unloadMagazine,
    insertFirearmMagazine,
    removeFirearmMagazine,
    chamberFirearmRound,
    clearFirearmChamber,
    setFirearmSafety,
    setFirearmFireMode,
    armGrenade,
    disarmGrenade,
    useConsumable,
    getConsumableUsageLog,
    getConsumableUsageByDay
  });
})();
