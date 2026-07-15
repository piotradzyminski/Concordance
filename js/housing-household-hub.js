window.WS_APP = window.WS_APP || {};

(function initHousingHouseholdHub() {
  const app = window.WS_APP;
  const registry = window.APP_DATA?.housingHouseholdHub || {};
  const API_VERSION = "housing_household_hub_5_0x";
  if (app.HousingHouseholdHub?.version === API_VERSION) return;

  function clone(value) {
    if (value == null) return value;
    try { return structuredClone(value); }
    catch (error) { return JSON.parse(JSON.stringify(value)); }
  }
  function id(value = "") { return String(value || "").trim(); }
  function token(value = "") { return id(value).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, ""); }
  function unique(values = []) { return [...new Set((Array.isArray(values) ? values : []).map(token).filter(Boolean))]; }
  function nowIso() { return id(app.getCampaignTimeIso?.() || app.CAMPAIGN_TIME_ISO || new Date().toISOString()); }
  function hash(value = "") {
    let result = 2166136261;
    for (const char of String(value || "")) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619); }
    return result >>> 0;
  }
  function getDefinition(instance = {}) {
    return app.getEquipmentCatalogItemById?.(instance.definitionId) || instance.instanceData || {};
  }
  function getTags(instance = {}) {
    const definition = getDefinition(instance);
    return unique([...(definition.tags || []), ...(instance.instanceData?.tags || [])]);
  }
  function getHubMeta(instance = {}) {
    const source = instance.instanceData?.householdHub;
    return source && typeof source === "object" && !Array.isArray(source) ? clone(source) : {};
  }
  function getItemLabel(instance = {}) {
    const definition = getDefinition(instance);
    return id(instance.playerLabel || definition.name || instance.instanceData?.name || instance.definitionId || instance.instanceId || "Item");
  }
  function getHousingRecord(citizenId = "", housingRecordId = "") {
    return (app.getCitizenHousingRecords?.(app.getCitizenById?.(citizenId) || {}) || []).find((entry) => id(entry.id) === id(housingRecordId)) || null;
  }
  function getActiveHousingRecord(citizenId = "", housingRecordId = "") {
    const records = app.getCitizenHousingRecords?.(app.getCitizenById?.(citizenId) || {}) || [];
    return records.find((entry) => id(entry.id) === id(housingRecordId)) || records.find((entry) => entry.isPrimary === true && entry.archived !== true) || records[0] || null;
  }

  function resolveWeatherAt(value = "") {
    const iso = id(value || nowIso());
    const date = new Date(iso);
    const valid = Number.isFinite(date.getTime()) ? date : new Date();
    const cycleHours = Math.max(1, Number(registry.weatherCycleHours || 6));
    const period = Math.floor(valid.getUTCHours() / cycleHours);
    const dayKey = valid.toISOString().slice(0, 10);
    const profiles = registry.weatherProfiles || [];
    const profile = profiles.length ? profiles[hash(`${dayKey}|${period}`) % profiles.length] : { code: "UNKNOWN", label: "No weather feed" };
    return {
      ...clone(profile),
      global: true,
      period,
      cycleHours,
      validFrom: new Date(Date.UTC(valid.getUTCFullYear(), valid.getUTCMonth(), valid.getUTCDate(), period * cycleHours)).toISOString(),
      validUntil: new Date(Date.UTC(valid.getUTCFullYear(), valid.getUTCMonth(), valid.getUTCDate(), (period + 1) * cycleHours)).toISOString()
    };
  }

  function getGlobalWeatherProjection(value = "") {
    const currentIso = id(value || nowIso());
    const currentDate = new Date(currentIso);
    const base = Number.isFinite(currentDate.getTime()) ? currentDate : new Date();
    const cycleMs = Math.max(1, Number(registry.weatherCycleHours || 6)) * 60 * 60 * 1000;
    return {
      current: resolveWeatherAt(base.toISOString()),
      forecast: [1, 2, 3].map((step) => resolveWeatherAt(new Date(base.getTime() + step * cycleMs).toISOString()))
    };
  }

  function isDisplayMounted(instance = {}) {
    return token(instance.location?.type) === "INSTALLED_IN_ITEM" && token(instance.location?.mountRole) === "DISPLAY";
  }
  function isCollectionItem(instance = {}) {
    if (!instance || token(instance.lifecycleState) === "DISPOSED") return false;
    const meta = getHubMeta(instance);
    if (meta.collection === true || meta.important === true || isDisplayMounted(instance)) return true;
    const categories = new Set(registry.collectionCategories || []);
    return getTags(instance).some((entry) => categories.has(entry));
  }
  function getCollectionCategory(instance = {}) {
    const explicit = token(getHubMeta(instance).category);
    if (explicit) return explicit;
    const categories = registry.collectionCategories || [];
    return getTags(instance).find((entry) => categories.includes(entry)) || "MEMENTO";
  }
  function getStorageProtection(instance = {}) {
    const location = instance.location || {};
    if (token(location.type) !== "CONTAINER_GRID") return token(location.type) === "HOUSING_STORAGE" ? "HOUSEHOLD_STORAGE" : "NONE";
    const parent = app.getItemInstanceById?.(location.containerInstanceId);
    const tags = getTags(parent || {});
    if (tags.includes("ARCHIVAL_STORAGE")) return "ARCHIVAL";
    if (tags.includes("SECURE_STORAGE")) return "SECURE";
    if (tags.includes("HIDDEN_STORAGE")) return "HIDDEN";
    return "CONTAINER";
  }
  function getCitizenCollection(citizenId = "", housingRecordId = "") {
    const record = getActiveHousingRecord(citizenId, housingRecordId);
    return (app.getItemInstances?.({ includeDisposed: false }) || [])
      .filter((instance) => id(instance.ownerId) === id(citizenId) && isCollectionItem(instance))
      .map((instance) => ({
        instance: clone(instance),
        label: getItemLabel(instance),
        category: getCollectionCategory(instance),
        important: getHubMeta(instance).important === true,
        note: id(getHubMeta(instance).note),
        provenance: id(getHubMeta(instance).provenance),
        displayed: isDisplayMounted(instance),
        displayParentInstanceId: isDisplayMounted(instance) ? id(instance.location.parentItemInstanceId) : "",
        displaySlotId: isDisplayMounted(instance) ? id(instance.location.moduleSlotId) : "",
        storageProtection: getStorageProtection(instance),
        inActiveHousing: !record || !["HOUSING_ROOM", "HOUSING_STORAGE"].includes(token(instance.location?.type)) || id(instance.location?.housingRecordId || record.id) === id(record.id)
      }))
      .sort((left, right) => Number(right.important) - Number(left.important) || left.category.localeCompare(right.category) || left.label.localeCompare(right.label));
  }

  function getDisplayProfile(instance = {}) {
    const definition = getDefinition(instance);
    const direct = definition.householdDisplayProfile || instance.instanceData?.householdDisplayProfile;
    if (direct && typeof direct === "object") return clone(direct);
    const lifecycle = app.getHousingFurnishingLifecycleProjection?.(instance.instanceId) || null;
    const hasDisplayRail = (lifecycle?.slots || lifecycle?.moduleSlots || []).some((slot) => token(slot.slotType) === "DISPLAY" && slot.installedModule);
    if (!hasDisplayRail) return null;
    return { slotCount: Number(registry.displayDefaults?.railSlots || 2), acceptedCategories: registry.collectionCategories || [] };
  }
  function getDisplayHosts(citizenId = "", housingRecordId = "") {
    const record = getActiveHousingRecord(citizenId, housingRecordId);
    if (!record) return [];
    const instances = app.getItemInstances?.({ includeDisposed: false }) || [];
    return instances
      .filter((instance) => id(instance.ownerId) === id(citizenId) && token(instance.location?.type) === "HOUSING_ROOM" && id(instance.location?.housingRecordId) === id(record.id))
      .map((instance) => ({ instance, profile: getDisplayProfile(instance) }))
      .filter((entry) => entry.profile && Number(entry.profile.slotCount || 0) > 0)
      .map((entry) => {
        const slotCount = Math.max(1, Number(entry.profile.slotCount || 1));
        const displayed = instances.filter((instance) => isDisplayMounted(instance) && id(instance.location.parentItemInstanceId) === id(entry.instance.instanceId));
        const slots = Array.from({ length: slotCount }, (_, index) => {
          const slotId = `display-item-${index + 1}`;
          return { slotId, item: displayed.find((instance) => id(instance.location.moduleSlotId) === slotId) || null };
        });
        return { instance: clone(entry.instance), label: getItemLabel(entry.instance), profile: clone(entry.profile), slots };
      });
  }

  function updateHubMetadata(input = {}) {
    const instance = app.getItemInstanceById?.(id(input.instanceId));
    if (!instance) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND" };
    if (id(instance.ownerId) !== id(input.citizenId)) return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH" };
    const currentMeta = getHubMeta(instance);
    const nextMeta = {
      ...currentMeta,
      ...(Object.prototype.hasOwnProperty.call(input, "important") ? { important: input.important === true } : {}),
      ...(Object.prototype.hasOwnProperty.call(input, "collection") ? { collection: input.collection === true } : {}),
      ...(input.category ? { category: token(input.category) } : {}),
      ...(Object.prototype.hasOwnProperty.call(input, "note") ? { note: id(input.note) } : {}),
      ...(Object.prototype.hasOwnProperty.call(input, "provenance") ? { provenance: id(input.provenance) } : {}),
      updatedAt: nowIso()
    };
    const result = app.updateItemInstance?.(instance.instanceId, {
      ...clone(instance),
      instanceData: { ...(clone(instance.instanceData) || {}), householdHub: nextMeta }
    }, { source: "HOUSING_HOUSEHOLD_HUB_METADATA" });
    return result?.ok ? { ok: true, instance: result.instance, metadata: nextMeta } : { ok: false, reason: result?.reason || "ITEM_INSTANCE_UPDATE_FAILED" };
  }

  function isDisplayCandidate(instance = {}) {
    const type = token(instance.location?.type);
    return type === "HOUSING_STORAGE" && (isCollectionItem(instance) || getTags(instance).some((entry) => (registry.collectionCategories || []).includes(entry)));
  }
  function getDisplayCandidates(citizenId = "") {
    return (app.getItemInstances?.({ includeDisposed: false }) || []).filter((instance) => id(instance.ownerId) === id(citizenId) && isDisplayCandidate(instance)).map(clone);
  }
  function displayItem(input = {}) {
    const citizenId = id(input.citizenId);
    const item = app.getItemInstanceById?.(id(input.instanceId));
    const host = app.getItemInstanceById?.(id(input.hostInstanceId));
    if (!item || !host) return { ok: false, reason: "HOUSEHOLD_DISPLAY_ITEM_OR_HOST_NOT_FOUND" };
    if (id(item.ownerId) !== citizenId || id(host.ownerId) !== citizenId) return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH" };
    if (!isDisplayCandidate(item)) return { ok: false, reason: "HOUSEHOLD_DISPLAY_ITEM_NOT_IN_STORAGE" };
    const hostEntry = getDisplayHosts(citizenId, input.housingRecordId).find((entry) => id(entry.instance.instanceId) === id(host.instanceId));
    const slot = hostEntry?.slots?.find((entry) => id(entry.slotId) === id(input.slotId));
    if (!slot) return { ok: false, reason: "HOUSEHOLD_DISPLAY_SLOT_NOT_FOUND" };
    if (slot.item) return { ok: false, reason: "HOUSEHOLD_DISPLAY_SLOT_OCCUPIED" };
    const metadata = { ...getHubMeta(item), collection: true, displayedAt: nowIso() };
    return app.commitItemInstanceTransaction?.({
      idempotencyKey: id(input.idempotencyKey) || `housing-hub:display:${item.instanceId}:${host.instanceId}:${slot.slotId}:${Date.now()}`,
      sourceDomain: "HOUSING",
      sourceRefId: id(input.housingRecordId || host.location?.housingRecordId),
      citizenId,
      changedDomains: ["ITEM_INSTANCE", "HOUSING"],
      operations: [{
        type: "MOVE",
        instanceId: item.instanceId,
        toLocation: { type: "INSTALLED_IN_ITEM", parentItemInstanceId: host.instanceId, moduleSlotId: slot.slotId, mountRole: "DISPLAY", housingRecordId: id(input.housingRecordId || host.location?.housingRecordId) },
        lifecycleState: "INSTALLED",
        patch: { instanceData: { ...(clone(item.instanceData) || {}), householdHub: metadata } }
      }],
      metadata: { operationType: "HOUSEHOLD_DISPLAY_ITEM", hostInstanceId: host.instanceId, slotId: slot.slotId }
    }) || { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_API_UNAVAILABLE" };
  }

  function getItemFootprint(instance = {}, rotation = 0) {
    const definition = getDefinition(instance);
    const source = definition.footprint || instance.instanceData?.footprint || instance.footprint || "1x1";
    const match = id(source).match(/(\d+)x(\d+)/i);
    let width = Math.max(1, match ? Number(match[1]) : 1);
    let height = Math.max(1, match ? Number(match[2]) : 1);
    if (Number(rotation) === 90) [width, height] = [height, width];
    return { width, height };
  }

  function findStoragePlacement(record = {}, citizenId = "", footprint = { width: 1, height: 1 }) {
    const instances = app.getItemInstances?.({ includeDisposed: false }) || [];
    for (const unit of record.storageUnits || []) {
      const width = Math.max(1, Number(unit.width || 1));
      const height = Math.max(1, Number(unit.height || 1));
      const occupied = new Set();
      instances.filter((instance) => id(instance.ownerId) === id(citizenId) && token(instance.location?.type) === "HOUSING_STORAGE" && id(instance.location.storageUnitId) === id(unit.id)).forEach((instance) => {
        const itemFootprint = getItemFootprint(instance, instance.location?.rotation);
        const itemWidth = itemFootprint.width;
        const itemHeight = itemFootprint.height;
        for (let row = Number(instance.location.gridY || 1); row < Number(instance.location.gridY || 1) + itemHeight; row += 1) {
          for (let column = Number(instance.location.gridX || 1); column < Number(instance.location.gridX || 1) + itemWidth; column += 1) occupied.add(`${column}:${row}`);
        }
      });
      for (let row = 1; row <= height - footprint.height + 1; row += 1) {
        for (let column = 1; column <= width - footprint.width + 1; column += 1) {
          let free = true;
          for (let y = row; y < row + footprint.height; y += 1) for (let x = column; x < column + footprint.width; x += 1) if (occupied.has(`${x}:${y}`)) free = false;
          if (free) return { type: "HOUSING_STORAGE", storageUnitId: id(unit.id), gridX: column, gridY: row, rotation: 0 };
        }
      }
    }
    return null;
  }
  function removeDisplayItem(input = {}) {
    const citizenId = id(input.citizenId);
    const item = app.getItemInstanceById?.(id(input.instanceId));
    if (!item) return { ok: false, reason: "ITEM_INSTANCE_NOT_FOUND" };
    if (id(item.ownerId) !== citizenId) return { ok: false, reason: "ITEM_INSTANCE_OWNER_MISMATCH" };
    if (!isDisplayMounted(item)) return { ok: false, reason: "HOUSEHOLD_ITEM_NOT_DISPLAYED" };
    const record = getActiveHousingRecord(citizenId, input.housingRecordId || item.location?.housingRecordId);
    if (!record) return { ok: false, reason: "HOUSING_RECORD_NOT_FOUND" };
    const placement = findStoragePlacement(record, citizenId, getItemFootprint(item, 0));
    if (!placement) return { ok: false, reason: "HOUSING_STORAGE_CAPACITY_EXCEEDED" };
    const metadata = { ...getHubMeta(item), displayedAt: "", lastDisplayedAt: nowIso() };
    return app.commitItemInstanceTransaction?.({
      idempotencyKey: id(input.idempotencyKey) || `housing-hub:undisplay:${item.instanceId}:${Date.now()}`,
      sourceDomain: "HOUSING",
      sourceRefId: record.id,
      citizenId,
      changedDomains: ["ITEM_INSTANCE", "HOUSING"],
      operations: [{ type: "MOVE", instanceId: item.instanceId, toLocation: placement, lifecycleState: "UNPACKAGED", patch: { instanceData: { ...(clone(item.instanceData) || {}), householdHub: metadata } } }],
      metadata: { operationType: "HOUSEHOLD_REMOVE_DISPLAY_ITEM" }
    }) || { ok: false, reason: "ITEM_INSTANCE_TRANSACTION_API_UNAVAILABLE" };
  }

  function getWorldFeed(citizenId = "", housingRecordId = "") {
    const entries = app.getTerminalEntries?.(citizenId, { folder: "INBOX", audience: "PLAYER" }) || [];
    const terminal = entries.filter((entry) => entry.important === true || entry.read !== true).slice(0, 4).map((entry) => ({
      id: entry.id,
      category: token(entry.category || entry.type || "TERMINAL"),
      title: id(entry.title || entry.subject || "Terminal entry"),
      body: id(entry.summary || entry.body || entry.message),
      timestamp: id(entry.receivedAt || entry.createdAt),
      source: "TERMINAL",
      important: entry.important === true,
      unread: entry.read !== true
    }));
    const weather = getGlobalWeatherProjection().current;
    const ambient = (registry.ambientFeed || []).map((entry) => ({ ...clone(entry), source: "WORLD", timestamp: nowIso() }));
    return [
      { id: `weather:${weather.validFrom}`, category: "WEATHER", title: weather.label, body: `${weather.temperatureC}°C / visibility ${weather.visibilityPercent}% / air ${weather.airQuality}. ${weather.note || ""}`, timestamp: weather.validFrom, source: "WORLD", important: weather.exteriorRisk === "HIGH" },
      ...terminal,
      ...ambient
    ].slice(0, 8);
  }

  function getHistory(citizenId = "", housingRecordId = "") {
    const record = getActiveHousingRecord(citizenId, housingRecordId);
    const transactions = app.getItemInstanceTransactions?.({ citizenId }) || app.getItemInstanceTransactions?.() || [];
    const housingTransactions = transactions.filter((entry) => token(entry.sourceDomain) === "HOUSING" || token(entry.metadata?.operationType).startsWith("HOUSEHOLD_")).slice(-20).reverse();
    const relocation = Array.isArray(record?.relocationHistory) ? [...record.relocationHistory].reverse() : [];
    return [
      ...housingTransactions.map((entry) => ({ id: entry.transactionId, type: token(entry.metadata?.operationType || entry.sourceDomain || "HOUSING"), at: id(entry.committedAt || entry.updatedAt || entry.createdAt), status: token(entry.status), detail: id(entry.resultCode || entry.sourceRefId) })),
      ...relocation.map((entry, index) => ({ id: id(entry.transitionId || `relocation-${index}`), type: "RELOCATION", at: id(entry.completedAt || entry.createdAt), status: token(entry.status || "COMPLETED"), detail: id(entry.targetHousingRecordId || entry.targetUnitId) }))
    ].sort((left, right) => String(right.at).localeCompare(String(left.at))).slice(0, 24);
  }

  function getOverview(citizenId = "", housingRecordId = "") {
    const citizen = app.getCitizenById?.(citizenId) || {};
    const record = getActiveHousingRecord(citizenId, housingRecordId);
    const collection = getCitizenCollection(citizenId, record?.id);
    const displayHosts = getDisplayHosts(citizenId, record?.id);
    const weather = getGlobalWeatherProjection();
    const terminalEntries = app.getTerminalEntries?.(citizenId, { folder: "INBOX", audience: "PLAYER" }) || [];
    return {
      citizenId,
      housingRecordId: record?.id || "",
      campaignTimeIso: nowIso(),
      weather,
      worldFeed: getWorldFeed(citizenId, record?.id),
      collectionCount: collection.length,
      importantItemCount: collection.filter((entry) => entry.important).length,
      displayedItemCount: collection.filter((entry) => entry.displayed).length,
      displayCapacity: displayHosts.reduce((sum, host) => sum + host.slots.length, 0),
      displayUsed: displayHosts.reduce((sum, host) => sum + host.slots.filter((slot) => slot.item).length, 0),
      unreadTerminalCount: terminalEntries.filter((entry) => entry.read !== true).length,
      rentStatus: token(record?.rentStatus || "UNASSIGNED"),
      unitStatus: token(record?.status || "UNASSIGNED"),
      visibleAddress: id(record?.visibleAddress || citizen.visibleAddress || citizen.address || "UNASSIGNED")
    };
  }

  function validate() {
    const required = ["getItemInstances", "getItemInstanceById", "updateItemInstance", "commitItemInstanceTransaction", "getCampaignTimeIso"];
    const missingApis = required.filter((name) => typeof app[name] !== "function");
    return { ready: missingApis.length === 0, version: API_VERSION, missingApis, weatherProfiles: (registry.weatherProfiles || []).length, collectionCategories: (registry.collectionCategories || []).length };
  }

  const api = Object.freeze({ version: API_VERSION, getOverview, getGlobalWeatherProjection, getWorldFeed, getHistory, getCitizenCollection, getDisplayHosts, getDisplayCandidates, updateHubMetadata, displayItem, removeDisplayItem, validate });
  app.HousingHouseholdHub = api;
  Object.assign(app, {
    HOUSING_HOUSEHOLD_HUB_VERSION: API_VERSION,
    getHousingHouseholdHubOverview: getOverview,
    getGlobalHousingWeather: getGlobalWeatherProjection,
    getHousingWorldFeed: getWorldFeed,
    getHousingHouseholdHistory: getHistory,
    getHousingCollectionItems: getCitizenCollection,
    getHousingDisplayHosts: getDisplayHosts,
    getHousingDisplayCandidates: getDisplayCandidates,
    updateHousingCollectionMetadata: updateHubMetadata,
    setHousingItemImportant: (input = {}) => updateHubMetadata({ ...input, important: input.important !== false, collection: true }),
    displayHousingCollectionItem: displayItem,
    removeHousingCollectionDisplay: removeDisplayItem,
    validateHousingHouseholdHub: validate
  });
})();
