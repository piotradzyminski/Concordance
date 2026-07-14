window.WS_APP = window.WS_APP || {};

(function initHousingStorageRuntimeFactory() {
  window.WS_APP.createHousingStorageRuntime = function createHousingStorageRuntime(config = {}) {
    const {
      HOUSING_STORAGE_WIDTH,
      HOUSING_STORAGE_LOCATION,
      DEFAULT_STORAGE_UNIT_ID,
      HOUSING_STORAGE_KINDS,
      HOUSING_STORAGE_STATUSES,
      HOUSING_STORAGE_SORTS,
      escapeHtml,
      clampNumber,
      formatCredits,
      formatHousingShipmentState,
      formatIsoLabel,
      getCitizenHousingRecords,
      getCitizenMarketOrders,
      getHousingActiveRecord,
      getHousingActiveRecordId,
      getHousingFeedback,
      getHousingRecordShipmentStats,
      getHousingRecordSubscription,
      getHousingShipmentState,
      getHousingShipmentUnitContext,
      parseCredits,
      renderHousingModule,
      renderHousingRecord,
      renderHousingStorageShipmentPanel,
      setHousingFeedback,
    } = config;

    if (typeof escapeHtml !== "function" || typeof renderHousingModule !== "function") {
      throw new Error("HOUSING_STORAGE_RUNTIME_DEPENDENCY_MISSING");
    }

    function resolveHousingStorageProfile(record = {}) {
      return window.WS_APP.resolveHousingStorageProfile?.(record) || { label: "Unit Storage", rows: 2 };
    }

    function getHousingStorageUnitCapacity(record = null) {
      const units = Array.isArray(record?.storageUnits) ? record.storageUnits : [];
      return units.reduce((sum, unit) => sum + Number(unit.slotCapacity || 0), 0);
    }

    function getHousingItemStorageCost(item = {}) {
      const width = clampNumber(item.width ?? item.w ?? 1, 1, HOUSING_STORAGE_WIDTH);
      const height = clampNumber(item.height ?? item.h ?? 1, 1, 99);
      return Math.max(1, width * height);
    }

    function getHousingStoredItems(items = [], storageUnitIds = null) {
      const accepted = Array.isArray(storageUnitIds) ? new Set(storageUnitIds.map((value) => String(value || "").trim()).filter(Boolean)) : null;
      return (Array.isArray(items) ? items : []).filter((item) => isHousingStorageItem(item) && (!accepted || accepted.has(item.storageUnitId)));
    }

    function getHousingStorageUsedSlots(items = [], storageUnitIds = null) {
      return getHousingStoredItems(items, storageUnitIds).reduce((sum, item) => sum + getHousingItemStorageCost(item), 0);
    }

    function getHousingRecordStorageStats(citizen = {}, record = null) {
      const units = record?.storageUnits || [];
      const items = getCitizenEquipmentItems(citizen);
      const unitIds = units.map((unit) => unit.id);
      const storedItems = getHousingStoredItems(items, unitIds);
      const totalSlots = getHousingStorageUnitCapacity(record);
      const usedSlots = getHousingStorageUsedSlots(storedItems, unitIds);
      const overflow = Math.max(0, usedSlots - totalSlots);
      const usage = totalSlots ? Math.min(100, Math.round((usedSlots / totalSlots) * 100)) : 0;
      return {
        units,
        storedItems,
        totalSlots,
        usedSlots,
        overflow,
        storedCount: storedItems.length,
        usage
      };
    }

    function getHousingPrimaryStorageUnit(record = null, unitId = "") {
      if (!record?.storageUnits?.length) return null;
      const requestedId = String(unitId || "").trim();
      return (requestedId ? record.storageUnits.find((unit) => unit.id === requestedId) : null) || record.storageUnits[0] || null;
    }


    function getHousingRecordWarnings(record = null, storageStats = {}, shipmentStats = {}, subscription = null) {
      const warnings = [];
      if (!record) return ["NO ACTIVE HOUSING RECORD"];
      if (!["ACTIVE", "CONFIRMED", "PAID", "SYNCED"].includes(record.status)) warnings.push(`UNIT STATUS: ${record.status}`);
      if (!["ACTIVE", "CONFIRMED", "PAID", "SYNCED"].includes(record.rentStatus)) warnings.push(`RENT STATUS: ${record.rentStatus}`);
      if (subscription && subscription.active === false) warnings.push("LINKED RENT SUBSCRIPTION INACTIVE");
      if (!storageStats.totalSlots) warnings.push("NO STORAGE UNIT ASSIGNED");
      if (storageStats.totalSlots && storageStats.usage >= 90) warnings.push(`STORAGE LOAD ${storageStats.usage}%`);
      if (storageStats.unplaced) warnings.push(`${storageStats.unplaced} STORAGE ITEM${storageStats.unplaced === 1 ? "" : "S"} IN OVERFLOW`);
      if (shipmentStats.held?.length) warnings.push(`${shipmentStats.held.length} HELD SHIPMENT${shipmentStats.held.length === 1 ? "" : "S"}`);
      if (record.utilityStatus && !["ACTIVE", "NOMINAL", "UNKNOWN"].includes(record.utilityStatus)) warnings.push(`UTILITIES: ${record.utilityStatus}`);
      if (record.maintenanceStatus && !["NOMINAL", "OK", "UNKNOWN"].includes(record.maintenanceStatus)) warnings.push(`MAINTENANCE: ${record.maintenanceStatus}`);
      return [...warnings, ...record.issues.map((issue) => String(issue).toUpperCase())];
    }

    function getDefaultHousingStorageFilters() {
      return {
        search: "",
        kind: "ALL",
        status: "ALL",
        sort: "CATEGORY"
      };
    }

    function normalizeHousingStorageFilters(filters = {}) {
      const defaults = getDefaultHousingStorageFilters();
      const normalized = {
        search: String(filters.search ?? defaults.search).trim(),
        kind: String(filters.kind || defaults.kind).trim().toUpperCase(),
        status: String(filters.status || defaults.status).trim().toUpperCase(),
        sort: String(filters.sort || defaults.sort).trim().toUpperCase()
      };
      if (!HOUSING_STORAGE_KINDS.includes(normalized.kind)) normalized.kind = defaults.kind;
      if (!HOUSING_STORAGE_STATUSES.includes(normalized.status)) normalized.status = defaults.status;
      if (!HOUSING_STORAGE_SORTS.includes(normalized.sort)) normalized.sort = defaults.sort;
      return normalized;
    }

    function getHousingStorageFilters(citizenId = "") {
      window.WS_APP.housingStorageFiltersByCitizen = window.WS_APP.housingStorageFiltersByCitizen || {};
      const current = window.WS_APP.housingStorageFiltersByCitizen[citizenId] || getDefaultHousingStorageFilters();
      const normalized = normalizeHousingStorageFilters(current);
      window.WS_APP.housingStorageFiltersByCitizen[citizenId] = normalized;
      return normalized;
    }

    function setHousingStorageFilters(citizenId = "", patch = {}) {
      window.WS_APP.housingStorageFiltersByCitizen = window.WS_APP.housingStorageFiltersByCitizen || {};
      window.WS_APP.housingStorageFiltersByCitizen[citizenId] = normalizeHousingStorageFilters({
        ...getHousingStorageFilters(citizenId),
        ...patch
      });
    }

    function resetHousingStorageFilters(citizenId = "") {
      window.WS_APP.housingStorageFiltersByCitizen = window.WS_APP.housingStorageFiltersByCitizen || {};
      window.WS_APP.housingStorageFiltersByCitizen[citizenId] = getDefaultHousingStorageFilters();
    }

    function getHousingSelectedStorageItemId(citizenId = "") {
      window.WS_APP.housingStorageSelectedItemByCitizen = window.WS_APP.housingStorageSelectedItemByCitizen || {};
      return String(window.WS_APP.housingStorageSelectedItemByCitizen[citizenId] || "").trim();
    }

    function setHousingSelectedStorageItemId(citizenId = "", itemId = "") {
      window.WS_APP.housingStorageSelectedItemByCitizen = window.WS_APP.housingStorageSelectedItemByCitizen || {};
      window.WS_APP.housingStorageSelectedItemByCitizen[citizenId] = String(itemId || "").trim();
    }

    function getHousingSelectedStorageUnitId(citizenId = "", units = []) {
      window.WS_APP.housingSelectedStorageUnitByCitizen = window.WS_APP.housingSelectedStorageUnitByCitizen || {};
      const selected = String(window.WS_APP.housingSelectedStorageUnitByCitizen[citizenId] || "").trim();
      const resolved = units.find((unit) => unit.id === selected)?.id || units[0]?.id || "";
      window.WS_APP.housingSelectedStorageUnitByCitizen[citizenId] = resolved;
      return resolved;
    }

    function setHousingSelectedStorageUnitId(citizenId = "", storageUnitId = "") {
      window.WS_APP.housingSelectedStorageUnitByCitizen = window.WS_APP.housingSelectedStorageUnitByCitizen || {};
      window.WS_APP.housingSelectedStorageUnitByCitizen[citizenId] = String(storageUnitId || "").trim();
    }

    function getHousingOpenContainerId(citizenId = "") {
      window.WS_APP.housingOpenContainerByCitizen = window.WS_APP.housingOpenContainerByCitizen || {};
      return String(window.WS_APP.housingOpenContainerByCitizen[citizenId] || "").trim();
    }

    function setHousingOpenContainerId(citizenId = "", containerId = "") {
      window.WS_APP.housingOpenContainerByCitizen = window.WS_APP.housingOpenContainerByCitizen || {};
      window.WS_APP.housingOpenContainerByCitizen[citizenId] = String(containerId || "").trim();
    }

    function getHousingOpenContainerSelectedItemId(citizenId = "") {
      window.WS_APP.housingOpenContainerSelectedItemByCitizen = window.WS_APP.housingOpenContainerSelectedItemByCitizen || {};
      return String(window.WS_APP.housingOpenContainerSelectedItemByCitizen[citizenId] || "").trim();
    }

    function setHousingOpenContainerSelectedItemId(citizenId = "", itemId = "") {
      window.WS_APP.housingOpenContainerSelectedItemByCitizen = window.WS_APP.housingOpenContainerSelectedItemByCitizen || {};
      window.WS_APP.housingOpenContainerSelectedItemByCitizen[citizenId] = String(itemId || "").trim();
    }

    function getHousingReturnContainerId(citizenId = "", candidates = []) {
      window.WS_APP.housingReturnContainerByCitizen = window.WS_APP.housingReturnContainerByCitizen || {};
      const selected = String(window.WS_APP.housingReturnContainerByCitizen[citizenId] || "").trim();
      const resolved = candidates.find((entry) => entry.id === selected)?.id || candidates[0]?.id || "";
      window.WS_APP.housingReturnContainerByCitizen[citizenId] = resolved;
      return resolved;
    }

    function setHousingReturnContainerId(citizenId = "", containerId = "") {
      window.WS_APP.housingReturnContainerByCitizen = window.WS_APP.housingReturnContainerByCitizen || {};
      window.WS_APP.housingReturnContainerByCitizen[citizenId] = String(containerId || "").trim();
    }

    function getEquipmentFootprintSize(item = {}) {
      if (typeof window.WS_APP.getEquipmentFootprintSize === "function") {
        return window.WS_APP.getEquipmentFootprintSize(item.footprint || item.size || `${item.width || item.w || 1}x${item.height || item.h || 1}`);
      }
      const parts = String(item.footprint || item.size || `${item.width || item.w || 1}x${item.height || item.h || 1}`).toLowerCase().split("x");
      return {
        footprint: `${clampNumber(parts[0], 1, HOUSING_STORAGE_WIDTH)}x${clampNumber(parts[1], 1, 99)}`,
        width: clampNumber(parts[0], 1, HOUSING_STORAGE_WIDTH),
        height: clampNumber(parts[1], 1, 99)
      };
    }

    function normalizeHousingEquipmentItem(item = {}, index = 0) {
      if (typeof window.WS_APP.normalizeEquipmentItem === "function") return window.WS_APP.normalizeEquipmentItem(item, index);
      const size = getEquipmentFootprintSize(item);
      const storageUnitId = String(item.storageUnitId || "").trim();
      const housingPlacement = item.housingPlacement && typeof item.housingPlacement === "object" && !Array.isArray(item.housingPlacement)
        ? {
            storageUnitId,
            column: clampNumber(item.housingPlacement.column, 1, 999),
            row: clampNumber(item.housingPlacement.row, 1, 999),
            rotation: Number(item.housingPlacement.rotation) === 90 ? 90 : 0
          }
        : null;
      const location = storageUnitId && housingPlacement ? "STORED" : "ORPHAN";
      return {
        ...item,
        id: String(item.id || item.itemId || `eq-item-${index + 1}`),
        name: String(item.name || item.title || "Equipment Item"),
        category: String(item.category || "MISC").trim().toUpperCase(),
        footprint: size.footprint,
        width: clampNumber(item.width ?? item.w ?? size.width, 1, HOUSING_STORAGE_WIDTH),
        height: clampNumber(item.height ?? item.h ?? size.height, 1, 99),
        storageUnitId: location === "STORED" ? storageUnitId : "",
        housingPlacement: location === "STORED" ? housingPlacement : null,
        location,
        isStored: location === "STORED",
        isInGrid: false,
        isEquipped: false,
        isOrphan: location === "ORPHAN",
        archived: item.archived === true
      };
    }

    function getCitizenEquipmentItems(citizen = {}) {
      const rawItems = typeof window.WS_APP.getCitizenEquipmentItemInstanceViews === "function"
        ? window.WS_APP.getCitizenEquipmentItemInstanceViews(citizen?.id || "")
        : [];

      return rawItems
        .filter(Boolean)
        .map((item, index) => normalizeHousingEquipmentItem(item, index))
        .filter((item) => !item.archived);
    }

    function getHousingItemStorageSlots(item = {}) {
      if (typeof window.WS_APP.getHousingItemStorageSlots === "function") {
        return window.WS_APP.getHousingItemStorageSlots(item);
      }
      const slots = [];
      const width = clampNumber(item.width ?? 1, 1, HOUSING_STORAGE_WIDTH);
      const height = clampNumber(item.height ?? 1, 1, 99);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          slots.push(`${Number(item.x) + x}:${Number(item.y) + y}`);
        }
      }
      return slots;
    }

    function isHousingStorageUnitId(value = "") {
      return String(value || "").startsWith("housing-storage-");
    }

    function isHousingStorageItem(item = {}) {
      return item?.isStored === true || (String(item.location || "").toUpperCase() === "STORED" && Boolean(item.storageUnitId) && Boolean(item.housingPlacement));
    }

    function isHousingItemForUnit(item = {}, unitId = DEFAULT_STORAGE_UNIT_ID) {
      return isHousingStorageItem(item) && String(item.storageUnitId || "").trim() === String(unitId || DEFAULT_STORAGE_UNIT_ID).trim();
    }

    function getAvailableCarryItems(citizen = {}, items = getCitizenEquipmentItems(citizen)) {
      const state = typeof window.WS_APP.getEquipmentState === "function" ? window.WS_APP.getEquipmentState(citizen) : null;
      const sourceItems = state?.items || items;
      return sourceItems.filter((item) => {
        if (item.archived === true || item.isStored === true || item.isOrphan === true) return false;
        if (item.itemMountLocation) return false;
        if (item.isInGrid === true) {
          const host = state?.itemById?.[item.containerHostId] || null;
          return Boolean(host && host.isStored !== true && host.isOrphan !== true);
        }
        return Boolean(item.isEquipped === true && item.isContainer === true && Number(item.containerProfile?.slotCapacity || 0) > 0);
      });
    }

    function resolveHousingOpenContainer(citizen = {}, unitId = "") {
      const state = typeof window.WS_APP.getEquipmentState === "function" ? window.WS_APP.getEquipmentState(citizen) : null;
      if (!state) return { state: null, container: null };
      const citizenId = String(citizen.id || "").trim();
      const requestedId = getHousingOpenContainerId(citizenId);
      const container = requestedId ? state.itemById?.[requestedId] || null : null;
      const valid = Boolean(
        container
        && container.isStored === true
        && container.isContainer === true
        && Number(container.containerProfile?.slotCapacity || 0) > 0
        && (!unitId || String(container.storageUnitId || "") === String(unitId || ""))
      );
      if (!valid) {
        setHousingOpenContainerId(citizenId, "");
        setHousingOpenContainerSelectedItemId(citizenId, "");
        return { state, container: null };
      }
      return { state, container };
    }

    function isHousingStorageCyberwarePackage(item = {}) {
      const category = String(item.category || "").trim().toUpperCase();
      const subtype = String(item.subtype || item.cyberwareType || "").trim().toUpperCase();
      const tags = Array.isArray(item.tags) ? item.tags.map((tag) => String(tag || "").trim().toUpperCase()) : [];
      return item.cyberwareCandidate === true
        || item.installCandidate === true
        || category === "CYBERWARE"
        || ["IMPLANT", "BIOWARE", "NEUROCHIP", "INTERFACE", "SERVICE_PORT"].includes(subtype)
        || tags.includes("CYBERWARE");
    }

    function getHousingStorageItemKind(item = {}) {
      if (isHousingStorageCyberwarePackage(item)) return "CYBERWARE_PACKAGE";
      const category = String(item.category || "MISC").trim().toUpperCase();
      if (["WEAPON", "ARMOR", "MEDICAL", "TOOLS", "CONTAINER", "DOCUMENT"].includes(category)) return category;
      if (["SURVIVAL", "PERSONAL"].includes(category)) return "MISC";
      return "MISC";
    }

    function getHousingStorageKindLabel(kind = "ALL") {
      const labels = {
        ALL: "ALL",
        WEAPON: "WEAPONS",
        ARMOR: "ARMOR",
        MEDICAL: "MEDICAL",
        TOOLS: "TOOLS",
        CONTAINER: "CONTAINERS",
        DOCUMENT: "DOCUMENTS",
        CYBERWARE_PACKAGE: "CYBERWARE PACKAGES",
        MISC: "MISC"
      };
      return labels[String(kind || "ALL").toUpperCase()] || String(kind || "MISC").toUpperCase();
    }

    function getHousingStorageItemValue(item = {}) {
      return parseCredits(item.marketPrice ?? item.purchasePrice ?? item.value ?? item.price ?? item.cost ?? 0);
    }

    function buildHousingStorageRows(storageUnit = {}, storageState = {}, availableItems = []) {
      const rows = [];
      (Array.isArray(availableItems) ? availableItems : []).forEach((item) => {
        rows.push({ item, status: "AVAILABLE", reason: "READY_TO_STORE", action: "STORE" });
      });
      (storageState.storedItems || []).forEach((item) => {
        const cost = getHousingItemStorageCost(item);
        rows.push({
          item,
          status: storageState.usedSlots > storageState.totalSlots ? "OVERFLOW" : "STORED",
          reason: storageState.usedSlots > storageState.totalSlots ? "OVER_CAPACITY" : "STORED",
          action: "RETURN",
          cost
        });
      });

      return rows.map((row) => ({
        ...row,
        kind: getHousingStorageItemKind(row.item),
        value: getHousingStorageItemValue(row.item),
        storageUnitId: String(storageUnit.id || row.item.storageUnitId || DEFAULT_STORAGE_UNIT_ID),
        sourceLabel: row.status === "AVAILABLE" ? "CARRIED GRID" : "HOUSING STORAGE"
      }));
    }

    function getHousingStorageSearchText(row = {}) {
      const item = row.item || {};
      return [
        item.name,
        item.category,
        item.subtype,
        item.status,
        item.operatingStatus,
        item.legality,
        item.manufacturer,
        item.provider,
        item.notes,
        row.kind,
        row.status,
        row.reason,
        ...(Array.isArray(item.tags) ? item.tags : []),
        ...(Array.isArray(item.specialFeatures) ? item.specialFeatures : [])
      ].map((part) => String(part || "").toUpperCase()).join(" ");
    }

    function filterHousingStorageRows(rows = [], filters = {}) {
      const normalized = normalizeHousingStorageFilters(filters);
      const search = normalized.search.toUpperCase();
      return rows.filter((row) => {
        if (normalized.kind !== "ALL" && row.kind !== normalized.kind) return false;
        if (normalized.status === "STORED" && !["STORED", "OVERFLOW"].includes(row.status)) return false;
        if (!["ALL", "STORED"].includes(normalized.status) && row.status !== normalized.status) return false;
        if (search && !getHousingStorageSearchText(row).includes(search)) return false;
        return true;
      });
    }

    function sortHousingStorageRows(rows = [], filters = {}) {
      const sort = normalizeHousingStorageFilters(filters).sort;
      const compareName = (a, b) => String(a.item?.name || "").localeCompare(String(b.item?.name || ""));
      const compareCategory = (a, b) => getHousingStorageKindLabel(a.kind).localeCompare(getHousingStorageKindLabel(b.kind)) || compareName(a, b);
      const getSlots = (row) => Number(row.item?.width || 1) * Number(row.item?.height || 1);
      return [...rows].sort((a, b) => {
        if (sort === "NAME") return compareName(a, b);
        if (sort === "SIZE_DESC") return getSlots(b) - getSlots(a) || compareCategory(a, b);
        if (sort === "SIZE_ASC") return getSlots(a) - getSlots(b) || compareCategory(a, b);
        if (sort === "STATUS") return String(a.status || "").localeCompare(String(b.status || "")) || compareCategory(a, b);
        if (sort === "VALUE_DESC") return Number(b.value || 0) - Number(a.value || 0) || compareCategory(a, b);
        if (sort === "VALUE_ASC") return Number(a.value || 0) - Number(b.value || 0) || compareCategory(a, b);
        return compareCategory(a, b);
      });
    }

    function getHousingStorageKindStats(rows = []) {
      return HOUSING_STORAGE_KINDS.reduce((acc, kind) => {
        acc[kind] = kind === "ALL" ? rows.length : rows.filter((row) => row.kind === kind).length;
        return acc;
      }, {});
    }

    function getHousingActiveStorageTarget(citizen = {}) {
      const records = getCitizenHousingRecords(citizen);
      const activeRecordId = getHousingActiveRecordId(citizen.id, records);
      const activeRecord = records.find((record) => record.id === activeRecordId) || records[0] || null;
      const unit = activeRecord?.storageUnits?.[0] || null;
      return { records, activeRecord, unit };
    }

    function updateCitizenEquipmentItems(citizenId = "", nextItems = []) {
      if (!citizenId || !Array.isArray(nextItems) || typeof window.WS_APP.replaceCitizenItemInstances !== "function") return null;
      const result = window.WS_APP.replaceCitizenItemInstances(citizenId, nextItems, { scope: "EQUIPMENT", source: "HOUSING" });
      return result?.ok ? window.WS_APP.getCitizenById?.(citizenId) || null : null;
    }

    function getHousingReturnContainerOptions(citizen = {}, itemId = "") {
      const state = typeof window.WS_APP.getEquipmentState === "function" ? window.WS_APP.getEquipmentState(citizen) : null;
      const item = state?.itemById?.[String(itemId || "").trim()] || null;
      if (!state || !item) return [];
      return (Array.isArray(state.containers?.active) ? state.containers.active : []).map((container) => {
        const validation = typeof window.WS_APP.canMoveEquipmentItemToContainer === "function"
          ? window.WS_APP.canMoveEquipmentItemToContainer(state, item.id, container.id, { state, item, allowStoredSource: true })
          : { ok: false, code: "CONTAINER_MOVE_API_UNAVAILABLE" };
        return { id: container.id, label: container.name || container.id, validation };
      }).filter((entry) => entry.validation?.ok);
    }

    function storeEquipmentItemInHousing(citizenId = "", itemId = "", unitId = DEFAULT_STORAGE_UNIT_ID, user = window.WS_APP.currentUser) {
      const latest = window.WS_APP.getCitizenById?.(citizenId);
      const records = latest ? getCitizenHousingRecords(latest) : [];
      const record = records.find((entry) => entry.storageUnits.some((unit) => unit.id === unitId)) || records[0] || null;
      const storageUnit = record?.storageUnits.find((entry) => entry.id === unitId) || record?.storageUnits[0] || null;
      const item = latest ? getCitizenEquipmentItems(latest).find((entry) => entry.id === itemId) : null;
      if (!latest || !record || !storageUnit || !item) {
        setHousingFeedback(citizenId, "Storage target or item is missing.", "ERROR");
        renderHousingModule(user);
        return;
      }
      if (typeof window.WS_APP.moveEquipmentItemToHousing !== "function") {
        setHousingFeedback(citizenId, "Housing-grid transfer API is unavailable.", "ERROR");
        renderHousingModule(user);
        return;
      }
      const result = window.WS_APP.moveEquipmentItemToHousing(latest, item.id, storageUnit.id, {
        unit: storageUnit,
        allowEquippedSource: item.isEquipped === true && item.isContainer === true
      });
      if (result?.ok) setHousingSelectedStorageItemId(citizenId, item.id);
      setHousingFeedback(citizenId, result?.ok ? `Stored ${item.name} in ${storageUnit.label}.` : result?.message || "Storage transfer failed.", result?.ok ? "OK" : "ERROR");
      renderHousingModule(user);
    }

    function returnHousingItemToContainer(citizenId = "", itemId = "", containerId = "", user = window.WS_APP.currentUser) {
      const latest = window.WS_APP.getCitizenById?.(citizenId);
      const item = latest ? getCitizenEquipmentItems(latest).find((entry) => entry.id === itemId) : null;
      if (!latest || !item) {
        setHousingFeedback(citizenId, "Stored item is unavailable.", "ERROR");
        renderHousingModule(user);
        return;
      }
      const candidates = getHousingReturnContainerOptions(latest, item.id);
      const targetId = String(containerId || getHousingReturnContainerId(citizenId, candidates) || "").trim();
      if (!targetId) {
        setHousingFeedback(citizenId, "No carried container can receive this item.", "ERROR");
        renderHousingModule(user);
        return;
      }
      const result = typeof window.WS_APP.moveEquipmentItemFromHousingToContainer === "function"
        ? window.WS_APP.moveEquipmentItemFromHousingToContainer(latest, item.id, targetId)
        : { ok: false, message: "Housing-to-container transfer API is unavailable." };
      if (result?.ok) {
        setHousingSelectedStorageItemId(citizenId, item.id);
        setHousingReturnContainerId(citizenId, targetId);
      }
      setHousingFeedback(citizenId, result?.ok ? `Moved ${item.name} to ${candidates.find((entry) => entry.id === targetId)?.label || targetId}.` : result?.message || "Return transfer failed.", result?.ok ? "OK" : "ERROR");
      renderHousingModule(user);
    }

    function moveHousingItemToStorageUnit(citizenId = "", itemId = "", unitId = "", user = window.WS_APP.currentUser) {
      const latest = window.WS_APP.getCitizenById?.(citizenId);
      const records = latest ? getCitizenHousingRecords(latest) : [];
      const storageUnit = records.flatMap((record) => record.storageUnits).find((unit) => unit.id === unitId) || null;
      const item = latest ? getCitizenEquipmentItems(latest).find((entry) => entry.id === itemId) : null;
      if (!latest || !storageUnit || !item) {
        setHousingFeedback(citizenId, "Housing transfer target is unavailable.", "ERROR");
        renderHousingModule(user);
        return;
      }
      const result = typeof window.WS_APP.moveEquipmentItemToHousing === "function"
        ? window.WS_APP.moveEquipmentItemToHousing(latest, item.id, storageUnit.id, { unit: storageUnit })
        : { ok: false, message: "Housing-grid transfer API is unavailable." };
      if (result?.ok) {
        setHousingSelectedStorageItemId(citizenId, item.id);
        setHousingSelectedStorageUnitId(citizenId, storageUnit.id);
      }
      setHousingFeedback(citizenId, result?.ok ? `Moved ${item.name} to ${storageUnit.label}.` : result?.message || "Housing transfer failed.", result?.ok ? "OK" : "ERROR");
      renderHousingModule(user);
    }

    function moveHousingItemIntoOpenContainer(citizenId = "", itemId = "", containerId = "", user = window.WS_APP.currentUser) {
      const latest = window.WS_APP.getCitizenById?.(citizenId);
      if (!latest || typeof window.WS_APP.moveEquipmentItemToContainer !== "function") {
        setHousingFeedback(citizenId, "Container transfer API is unavailable.", "ERROR");
        renderHousingModule(user);
        return;
      }
      const state = window.WS_APP.getEquipmentState?.(latest);
      const item = state?.itemById?.[String(itemId || "").trim()] || null;
      const container = state?.itemById?.[String(containerId || "").trim()] || null;
      if (!item || !container || container.isStored !== true) {
        setHousingFeedback(citizenId, "Stored container target is unavailable.", "ERROR");
        renderHousingModule(user);
        return;
      }
      const result = window.WS_APP.moveEquipmentItemToContainer(latest, item.id, container.id, {
        allowStoredSource: item.isStored === true,
        allowStoredContainerTarget: true,
        allowEquippedSource: item.isEquipped === true
      });
      if (result?.ok) {
        setHousingOpenContainerSelectedItemId(citizenId, item.id);
        setHousingSelectedStorageItemId(citizenId, "");
      }
      setHousingFeedback(citizenId, result?.ok ? `Moved ${item.name} to ${container.name}.` : result?.message || "Stored-container transfer failed.", result?.ok ? "OK" : "ERROR");
      renderHousingModule(user);
    }

    function moveOpenContainerItemToHousing(citizenId = "", itemId = "", unitId = "", user = window.WS_APP.currentUser) {
      const latest = window.WS_APP.getCitizenById?.(citizenId);
      const records = latest ? getCitizenHousingRecords(latest) : [];
      const unit = records.flatMap((record) => record.storageUnits).find((entry) => entry.id === unitId) || null;
      if (!latest || !unit || typeof window.WS_APP.moveEquipmentItemToHousing !== "function") {
        setHousingFeedback(citizenId, "Housing transfer target is unavailable.", "ERROR");
        renderHousingModule(user);
        return;
      }
      const state = window.WS_APP.getEquipmentState?.(latest);
      const item = state?.itemById?.[String(itemId || "").trim()] || null;
      if (!item?.isInGrid) {
        setHousingFeedback(citizenId, "Container item is unavailable.", "ERROR");
        renderHousingModule(user);
        return;
      }
      const result = window.WS_APP.moveEquipmentItemToHousing(latest, item.id, unit.id, { unit });
      if (result?.ok) {
        setHousingSelectedStorageItemId(citizenId, item.id);
        setHousingOpenContainerSelectedItemId(citizenId, "");
      }
      setHousingFeedback(citizenId, result?.ok ? `Moved ${item.name} to ${unit.label}.` : result?.message || "Container-to-housing transfer failed.", result?.ok ? "OK" : "ERROR");
      renderHousingModule(user);
    }

    function autoSortHousingStorage(citizenId = "", unitId = DEFAULT_STORAGE_UNIT_ID, user = window.WS_APP.currentUser) {
      const latest = window.WS_APP.getCitizenById?.(citizenId);
      const records = latest ? getCitizenHousingRecords(latest) : [];
      const storageUnit = records.flatMap((record) => record.storageUnits).find((unit) => unit.id === unitId) || null;
      if (!latest || !storageUnit) {
        setHousingFeedback(citizenId, "No storage unit available.", "ERROR");
        renderHousingModule(user);
        return;
      }
      const result = typeof window.WS_APP.sortEquipmentHousingStorage === "function"
        ? window.WS_APP.sortEquipmentHousingStorage(latest, storageUnit.id, { unit: storageUnit })
        : { ok: false, message: "Housing-grid sort API is unavailable." };
      setHousingFeedback(citizenId, result?.ok ? "Housing storage sorted." : result?.message || "Storage sort failed.", result?.ok ? "OK" : "ERROR");
      renderHousingModule(user);
    }

    function renderHousingUnitSelector(records = [], activeRecordId = "") {
      if (records.length <= 1) return "";
      return `
        <section class="housing-unit-selector" aria-label="Housing Unit Selector">
          ${records.map((record) => `
            <button class="housing-record-select ${record.id === activeRecordId ? "is-active" : ""}" type="button" data-housing-select-unit="${escapeHtml(record.id)}">
              <b>${escapeHtml(record.title)}</b>
              <small>${escapeHtml(record.type)} / ${escapeHtml(record.status)} / ${escapeHtml(record.visibleAddress || "NO ADDRESS")}</small>
            </button>
          `).join("")}
        </section>
      `;
    }

    function renderHousingUnitStatusRail(record = null, subscription = null) {
      if (!record) return "";
      const linkedLabel = subscription ? `${subscription.provider || "RENT"} / ${subscription.tierLabel || subscription.title || subscription.status || "LINKED"}` : "NO LINKED RENT SOURCE";
      return `
        <div class="housing-unit-status-rail">
          ${renderHousingMetric("UNIT STATUS", record.status)}
          ${renderHousingMetric("RENT", record.rentStatus)}
          ${renderHousingMetric("ACCESS", record.accessLevel)}
          ${renderHousingMetric("UTILITIES", record.utilityStatus)}
          ${renderHousingMetric("MAINTENANCE", record.maintenanceStatus)}
          ${renderHousingMetric("SOURCE", linkedLabel)}
        </div>
      `;
    }

    function renderHousingUnitAddressCard(record = null) {
      if (!record) return "";
      return `
        <section class="housing-module-panel housing-unit-address-card">
          <header class="housing-module-panel-head">
            <div>
              <p class="kicker">SYSTEM ADDRESS</p>
              <h5>Visible / Trace Location</h5>
            </div>
            <span class="module-status-badge">${escapeHtml(record.provider)}</span>
          </header>
          <dl class="housing-unit-address-unit">
            <div><dt>Visible</dt><dd>${escapeHtml(record.visibleAddress || "UNASSIGNED")}</dd></div>
            <div><dt>Trace</dt><dd>${escapeHtml(record.traceAddress || "UNASSIGNED")}</dd></div>
            <div><dt>Type</dt><dd>${escapeHtml(record.type)}</dd></div>
            <div><dt>Storage Profile</dt><dd>${escapeHtml(record.storageProfile || resolveHousingStorageProfile(record).label)}</dd></div>
          </dl>
        </section>
      `;
    }

    function renderHousingUnitCapabilities(record = null, storageStats = {}, shipmentStats = {}) {
      if (!record) return "";
      return `
        <section class="housing-unit-capability-unit" aria-label="Housing Unit Capabilities">
          <article class="housing-unit-capability-card">
            <p class="kicker">STORAGE</p>
            <strong>${escapeHtml(storageStats.usedSlots ?? storageStats.usedSlots ?? 0)} / ${escapeHtml(storageStats.totalSlots ?? storageStats.totalSlots ?? 0)} SLOTS</strong>
            <small>${escapeHtml(storageStats.storedItems?.length || 0)} ITEMS / ${escapeHtml(storageStats.usage || 0)}% LOAD</small>
          </article>
          <article class="housing-unit-capability-card">
            <p class="kicker">SECURITY</p>
            <strong>${escapeHtml(record.securityLevel)}</strong>
            <small>UNIT SECURITY LEVEL</small>
          </article>
          <article class="housing-unit-capability-card">
            <p class="kicker">PRIVACY</p>
            <strong>${escapeHtml(record.privacyLevel)}</strong>
            <small>SIGNAL PRIVACY LEVEL</small>
          </article>
          <article class="housing-unit-capability-card">
            <p class="kicker">SHIPMENTS</p>
            <strong>${escapeHtml(shipmentStats.active?.length || 0)} ACTIVE</strong>
            <small>${escapeHtml(shipmentStats.held?.length || 0)} HELD / ${escapeHtml((shipmentStats.delivered?.length || 0) + (shipmentStats.overflow?.length || 0))} DELIVERED</small>
          </article>
        </section>
      `;
    }

    function renderHousingUnitWarnings(warnings = [], record = null) {
      const restrictions = record?.restrictions || [];
      const linkedServices = record?.linkedServices || [];
      if (!warnings.length && !restrictions.length && !linkedServices.length) {
        return `<p class="housing-unit-clearance-note">No active housing warnings. Access ledger is nominal.</p>`;
      }
      return `
        <div class="housing-unit-warning-list">
          ${warnings.map((warning) => `<span class="housing-unit-warning">${escapeHtml(warning)}</span>`).join("")}
          ${restrictions.map((restriction) => `<span class="housing-unit-warning is-restriction">${escapeHtml(restriction)}</span>`).join("")}
          ${linkedServices.map((service) => `<span class="housing-unit-warning is-service">${escapeHtml(service)}</span>`).join("")}
        </div>
      `;
    }

    function renderHousingUnitActivity(citizen = {}, record = null, shipmentStats = {}) {
      const shipments = shipmentStats.shipments || [];
      const shipmentById = new Map(shipments.map((shipment) => [shipment.id, shipment]));
      const orders = getCitizenMarketOrders(citizen).filter((order) => {
        if (!record) return true;
        const context = getHousingShipmentUnitContext(citizen, shipmentById.get(order.shipmentId) || {}, order);
        return context.record?.id === record.id;
      });
      const latestOrders = orders.slice().sort((a, b) => String(b.placedAtIso || "").localeCompare(String(a.placedAtIso || ""))).slice(0, 4);
      const latestShipments = shipments.slice().sort((a, b) => String(b.placedAtIso || "").localeCompare(String(a.placedAtIso || ""))).slice(0, 4);
      return `
        <section class="housing-module-panel housing-unit-activity-card">
          <header class="housing-module-panel-head">
            <div>
              <p class="kicker">UNIT SHIPMENT LEDGER</p>
              <h5>Orders / Shipments / Storage Target</h5>
            </div>
            <span class="module-status-badge">${escapeHtml(shipmentStats.nextEta ? `ETA ${formatIsoLabel(shipmentStats.nextEta)}` : "NO ETA")}</span>
          </header>
          <div class="housing-unit-activity-unit">
            <div>
              <h6>Shipments</h6>
              ${latestShipments.length ? latestShipments.map((shipment) => {
                const order = getCitizenMarketOrders(citizen).find((entry) => entry.shipmentId === shipment.id) || {};
                const context = getHousingShipmentUnitContext(citizen, shipment, order);
                const state = getHousingShipmentState(shipment, order);
                return `
                  <p class="housing-unit-activity-entry is-${escapeHtml(state.toLowerCase().replace(/_/g, "-"))}">
                    <b>${escapeHtml(shipment.payload?.itemName || order.itemName || shipment.sourceLabel)}</b>
                    <small>${escapeHtml(formatHousingShipmentState(state))} / ${escapeHtml(context.unitTitle)} / ${escapeHtml(context.unitLabel)}</small>
                  </p>
                `;
              }).join("") : `<p class="file-empty">No shipment records linked to this unit.</p>`}
            </div>
            <div>
              <h6>Orders</h6>
              ${latestOrders.length ? latestOrders.map((order) => {
                const shipment = shipmentById.get(order.shipmentId) || {};
                const context = getHousingShipmentUnitContext(citizen, shipment, order);
                return `
                  <p>
                    <b>${escapeHtml(order.itemName)}</b>
                    <small>${escapeHtml(order.status)} / ${escapeHtml(formatCredits(order.price))} / ${escapeHtml(context.unitTitle)}</small>
                  </p>
                `;
              }).join("") : `<p class="file-empty">No market orders linked to this unit.</p>`}
            </div>
          </div>
        </section>
      `;
    }

    function renderHousingUnitDashboard(citizen = {}, record = null) {
      if (!record) {
        return `
          <section class="housing-module-panel housing-unit-dashboard">
            <header class="housing-module-panel-head">
              <div>
                <p class="kicker">ACTIVE UNIT</p>
                <h5>No Assigned Habitat</h5>
              </div>
              <span class="module-status-badge">NO UNIT</span>
            </header>
            <p class="file-empty">No explicit housing record or RENT subscription found for this citizen.</p>
          </section>
        `;
      }

      const subscription = getHousingRecordSubscription(citizen, record);
      const storageStats = getHousingRecordStorageStats(citizen, record);
      const shipmentStats = getHousingRecordShipmentStats(citizen, record);
      const warnings = getHousingRecordWarnings(record, storageStats, shipmentStats, subscription);

      return `
        <section class="housing-module-panel housing-unit-dashboard">
          <header class="housing-module-panel-head">
            <div>
              <p class="kicker">ACTIVE UNIT DASHBOARD</p>
              <h5>${escapeHtml(record.title)}</h5>
              <small>${escapeHtml(record.provider)} / ${escapeHtml(record.type)} / ${escapeHtml(record.visibleAddress || "UNASSIGNED")}</small>
            </div>
            <span class="module-status-badge">${escapeHtml(warnings.length ? `${warnings.length} WARN` : "NOMINAL")}</span>
          </header>
          <div class="housing-unit-dashboard-body">
            ${renderHousingUnitStatusRail(record, subscription)}
            ${renderHousingUnitCapabilities(record, storageStats, shipmentStats)}
            ${renderHousingUnitWarnings(warnings, record)}
            <div class="housing-unit-actions">
              <button class="housing-inline-action" type="button" data-housing-tab="HOUSEHOLD">OPEN HOUSEHOLD</button>
              <button class="housing-inline-action" type="button" data-housing-record-id="${escapeHtml(record.id)}">OPEN STORAGE</button>
              <button class="housing-inline-action" type="button" data-housing-tab="MARKET">OPEN MARKET</button>
            </div>
          </div>
        </section>
        ${renderHousingUnitAddressCard(record)}
        ${renderHousingUnitActivity(citizen, record, shipmentStats)}
      `;
    }

    function renderHousingUnitTab(citizen = {}) {
      const records = getCitizenHousingRecords(citizen);
      const activeRecordId = getHousingActiveRecordId(citizen.id, records);
      const activeRecord = getHousingActiveRecord(citizen, records);
      return `
        <div class="housing-unit-tab">
          ${renderHousingUnitSelector(records, activeRecordId)}
          ${renderHousingUnitDashboard(citizen, activeRecord)}
          <section class="housing-module-panel housing-unit-records-panel">
            <header class="housing-module-panel-head">
              <div>
                <p class="kicker">HABITAT RECORDS</p>
                <h5>Assigned Base / Unit Access</h5>
              </div>
              <span class="module-status-badge">${escapeHtml(records.length)} RECORD${records.length === 1 ? "" : "S"}</span>
            </header>
            ${records.length
              ? `<div class="housing-record-list">${records.map((record, index) => renderHousingRecord(record, index, activeRecordId)).join("")}</div>`
              : `<p class="file-empty">No housing record or RENT subscription found for this citizen.</p>`}
          </section>
        </div>
      `;
    }

    function renderHousingMetric(label, value) {
      return `
        <span class="housing-storage-metric">
          <small>${escapeHtml(label)}</small>
          <b>${escapeHtml(value)}</b>
        </span>
      `;
    }

    function renderHousingStorageSelect(name = "", label = "", value = "ALL", options = [], labels = {}) {
      return `
        <label class="housing-storage-field">
          <span>${escapeHtml(label)}</span>
          <select data-housing-storage-filter-field="${escapeHtml(name)}">
            ${options.map((option) => `
              <option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(labels[option] || option)}</option>
            `).join("")}
          </select>
        </label>
      `;
    }

    function renderHousingStorageKindTabs(rows = [], filters = {}) {
      const stats = getHousingStorageKindStats(rows);
      return `
        <div class="housing-storage-kind-tabs" role="tablist" aria-label="Storage Categories">
          ${HOUSING_STORAGE_KINDS.filter((kind) => kind === "ALL" || stats[kind]).map((kind) => `
            <button class="housing-storage-kind-tab ${filters.kind === kind ? "is-active" : ""}" type="button" data-housing-storage-kind="${escapeHtml(kind)}">
              <b>${escapeHtml(getHousingStorageKindLabel(kind))}</b>
              <small>${escapeHtml(stats[kind] || 0)}</small>
            </button>
          `).join("")}
        </div>
      `;
    }

    function renderHousingStorageFilterRail(filters = {}, rows = [], visibleCount = 0) {
      const statusLabels = {
        ALL: "ALL STATUS",
        AVAILABLE: "AVAILABLE",
        STORED: "STORED",
        OVERFLOW: "OVERFLOW"
      };
      const sortLabels = {
        CATEGORY: "CATEGORY",
        NAME: "NAME",
        SIZE_DESC: "SIZE DESC",
        SIZE_ASC: "SIZE ASC",
        STATUS: "STATUS",
        VALUE_DESC: "VALUE DESC",
        VALUE_ASC: "VALUE ASC"
      };
      return `
        <aside class="housing-storage-filter-rail">
          <div class="housing-storage-filter-head">
            <div>
              <p class="kicker">STORAGE FILTER</p>
              <h5>${escapeHtml(visibleCount)} / ${escapeHtml(rows.length)} ITEMS</h5>
            </div>
            <button class="housing-inline-action" type="button" data-housing-storage-reset-filters>RESET</button>
          </div>
          <label class="housing-storage-field">
            <span>SEARCH</span>
            <input type="search" value="${escapeHtml(filters.search)}" placeholder="item, category, status" data-housing-storage-filter-field="search">
          </label>
          ${renderHousingStorageSelect("status", "STATUS", filters.status, HOUSING_STORAGE_STATUSES, statusLabels)}
          ${renderHousingStorageSelect("sort", "SORT", filters.sort, HOUSING_STORAGE_SORTS, sortLabels)}
          ${renderHousingStorageKindTabs(rows, filters)}
        </aside>
      `;
    }

    function getHousingGridItemDisplayName(item = {}) {
      if (typeof window.WS_APP.getItemInstanceDisplayName === "function") {
        return window.WS_APP.getItemInstanceDisplayName(item);
      }
      return String(item.playerLabel || item.displayName || item.name || item.catalogName || item.id || "Item").trim() || "Item";
    }

    function formatHousingGridItemSize(footprint = {}) {
      return `${Math.max(1, Number(footprint.width || 1))}×${Math.max(1, Number(footprint.height || 1))}`;
    }

    function renderHousingPhysicalGrid(model = {}, selectedItemId = "") {
      const unit = model.unit || {};
      const width = Number(unit.width || 0);
      const height = Number(unit.height || 0);
      const cells = [];
      for (let index = 0; index < width * height; index += 1) {
        const column = (index % width) + 1;
        const row = Math.floor(index / width) + 1;
        const occupantId = String(model.occupancy?.[row - 1]?.[column - 1] || "").trim();
        cells.push(`<span class="housing-physical-grid__cell ${index + 1 > Number(unit.slotCapacity || 0) ? "is-disabled" : ""} ${occupantId ? "is-used" : ""}" data-housing-grid-cell data-housing-grid-column="${column}" data-housing-grid-row="${row}" style="grid-column:${column};grid-row:${row};" aria-hidden="true"></span>`);
      }
      const items = (model.entries || []).map((entry) => {
        if (!entry.placement) return "";
        const selected = entry.item.id === selectedItemId;
        return `
          <button
            class="housing-physical-grid__item ${selected ? "is-selected" : ""} ${entry.source === "persistent" ? "" : "is-derived"}"
            type="button"
            data-housing-storage-select-item="${escapeHtml(entry.item.id)}"
            data-housing-grid-drag-item="${escapeHtml(entry.item.id)}"
            data-housing-grid-column="${escapeHtml(entry.placement.column)}"
            data-housing-grid-row="${escapeHtml(entry.placement.row)}"
            data-housing-grid-rotation="${escapeHtml(entry.placement.rotation || 0)}"
            data-housing-grid-width="${escapeHtml(entry.footprint.width)}"
            data-housing-grid-height="${escapeHtml(entry.footprint.height)}"
            style="grid-column:${escapeHtml(entry.placement.column)} / span ${escapeHtml(entry.footprint.width)};grid-row:${escapeHtml(entry.placement.row)} / span ${escapeHtml(entry.footprint.height)}"
            title="${escapeHtml(getHousingGridItemDisplayName(entry.item))}"
          >
            <b>${escapeHtml(getHousingGridItemDisplayName(entry.item))}</b>
            <small>${escapeHtml(formatHousingGridItemSize(entry.footprint))}</small>
          </button>
        `;
      }).join("");
      return `
        <div class="housing-physical-grid-wrap">
          <div class="housing-physical-grid" data-housing-physical-grid="${escapeHtml(unit.id || "")}" style="--housing-grid-columns:${escapeHtml(unit.width || 1)};--housing-grid-rows:${escapeHtml(unit.height || 1)}">
            ${cells.join("")}
            ${items}
          </div>
          ${model.hasUnplacedItems ? `<p class="housing-storage-note is-warning">Stored data contains an unplaced item. SORT must succeed before this unit is valid.</p>` : ""}
        </div>
      `;
    }

    function renderHousingStoredContainerGrid(citizen = {}, unit = {}, state = {}, container = null) {
      if (!container || typeof window.WS_APP.getEquipmentContainerGridModel !== "function") return "";
      const model = window.WS_APP.getEquipmentContainerGridModel(state, container.id, { state });
      if (!model?.grid?.hasGrid) return "";
      const selectedItemId = getHousingOpenContainerSelectedItemId(citizen.id);
      const selectedEntry = model.entries.find((entry) => String(entry.item?.id || "") === selectedItemId) || null;
      const cells = [];
      const columns = Number(model.grid.columns || 1);
      const totalCells = Math.min(Number(model.grid.slotCapacity || 0), Number(model.grid.visualCells || model.grid.slotCapacity || 0));
      for (let index = 0; index < totalCells; index += 1) {
        const column = (index % columns) + 1;
        const row = Math.floor(index / columns) + 1;
        cells.push(`<span class="housing-open-container-grid__cell" style="grid-column:${column};grid-row:${row};" aria-hidden="true"></span>`);
      }
      const entries = model.entries.map((entry) => {
        if (!entry.placement) return "";
        const selected = String(entry.item?.id || "") === selectedItemId;
        return `<button class="housing-open-container-grid__item ${selected ? "is-selected" : ""}" type="button" data-housing-open-container-select-item="${escapeHtml(entry.item.id)}" style="grid-column:${escapeHtml(entry.placement.column)} / span ${escapeHtml(entry.footprint.width)};grid-row:${escapeHtml(entry.placement.row)} / span ${escapeHtml(entry.footprint.height)}"><b>${escapeHtml(getHousingGridItemDisplayName(entry.item))}</b><small>${escapeHtml(formatHousingGridItemSize(entry.footprint))}</small></button>`;
      }).join("");
      return `
        <section class="housing-module-panel housing-open-container-panel">
          <header class="housing-module-panel-head">
            <div><p class="kicker">OPEN STORED CONTAINER</p><h5>${escapeHtml(container.name || container.id)}</h5></div>
            <button class="housing-inline-action" type="button" data-housing-toggle-container-grid="${escapeHtml(container.id)}">CLOSE GRID</button>
          </header>
          <div class="housing-open-container-layout">
            <div class="housing-open-container-grid" style="--housing-open-grid-columns:${escapeHtml(model.grid.columns)};--housing-open-grid-rows:${escapeHtml(model.grid.rows)}">
              ${cells.join("")}
              ${entries}
            </div>
            <aside class="housing-open-container-inspector">
              ${selectedEntry ? `<p class="kicker">SELECTED CONTAINER ITEM</p><h6>${escapeHtml(selectedEntry.item.name)}</h6><p>${escapeHtml(selectedEntry.item.category || "ITEM")} · ${escapeHtml(selectedEntry.footprint.width)}×${escapeHtml(selectedEntry.footprint.height)}</p><button class="housing-inline-action" type="button" data-housing-container-item-to-storage="${escapeHtml(selectedEntry.item.id)}" data-housing-storage-unit-id="${escapeHtml(unit.id)}">MOVE TO HOUSING GRID</button>` : `<p class="file-empty">Select an item inside this container.</p>`}
            </aside>
          </div>
        </section>
      `;
    }

    function renderHousingStorageRowAction(row = {}, unitId = DEFAULT_STORAGE_UNIT_ID, returnContainerId = "") {
      const item = row.item || {};
      if (row.action === "STORE") {
        return `<button class="housing-inline-action" type="button" data-housing-store-item="${escapeHtml(item.id)}" data-housing-storage-unit-id="${escapeHtml(unitId)}">STORE</button>`;
      }
      return `<button class="housing-inline-action" type="button" data-housing-return-item="${escapeHtml(item.id)}" data-housing-return-container-id="${escapeHtml(returnContainerId)}" ${returnContainerId ? "" : "disabled"}>${returnContainerId ? "MOVE TO CARRIED GRID" : "NO DESTINATION GRID"}</button>`;
    }

    function renderHousingStorageRow(row = {}, selectedItemId = "", unitId = DEFAULT_STORAGE_UNIT_ID, returnContainerId = "") {
      const item = row.item || {};
      const selected = item.id === selectedItemId;
      return `
        <article class="housing-storage-list-row ${selected ? "is-selected" : ""} is-${escapeHtml(row.status.toLowerCase())} ${row.kind === "CYBERWARE_PACKAGE" ? "is-cyberware-package" : ""}">
          <button class="housing-storage-list-main" type="button" data-housing-storage-select-item="${escapeHtml(item.id)}">
            <span>
              <b>${escapeHtml(item.name)}</b>
              <small>${escapeHtml(getHousingStorageKindLabel(row.kind))} / ${escapeHtml(getHousingItemStorageCost(item))} SLOT${getHousingItemStorageCost(item) === 1 ? "" : "S"} / ${escapeHtml(row.status)}</small>
            </span>
            <i>${escapeHtml(row.sourceLabel)}</i>
          </button>
          ${renderHousingStorageRowAction(row, unitId, returnContainerId)}
        </article>
      `;
    }

    function renderHousingStorageInspector(row = null, unit = {}, context = {}) {
      if (!row) {
        return `
          <aside class="housing-storage-inspector">
            <header class="housing-storage-inspector-head">
              <div><p class="kicker">ITEM INSPECTOR</p><h5>No Item Selected</h5></div>
            </header>
            <p class="file-empty">Select a housing-grid item or physical transfer candidate.</p>
          </aside>
        `;
      }

      const item = row.item || {};
      const isCyberware = row.kind === "CYBERWARE_PACKAGE";
      const returnCandidates = Array.isArray(context.returnCandidates) ? context.returnCandidates : [];
      const returnContainerId = String(context.returnContainerId || "").trim();
      const otherUnits = (Array.isArray(context.otherUnits) ? context.otherUnits : []).filter((entry) => entry.id !== unit.id);
      const openContainer = context.openContainer || null;
      const openContainerValidation = context.openContainerValidation || null;
      const hasOwnGrid = Boolean(row.status !== "AVAILABLE" && item.isContainer === true && Number(item.containerProfile?.slotCapacity || 0) > 0);
      const isOpenContainer = Boolean(openContainer && String(openContainer.id || "") === String(item.id || ""));
      const canMoveIntoOpenContainer = Boolean(openContainer && String(openContainer.id || "") !== String(item.id || "") && openContainerValidation?.ok);
      return `
        <aside class="housing-storage-inspector ${isCyberware ? "is-cyberware-package" : ""}">
          <header class="housing-storage-inspector-head">
            <div><p class="kicker">ITEM INSPECTOR</p><h5>${escapeHtml(item.name)}</h5></div>
            <span class="module-status-badge">${escapeHtml(row.status)}</span>
          </header>
          <div class="housing-storage-inspector-body">
            <div class="housing-storage-inspector-metrics">
              ${renderHousingMetric("CATEGORY", getHousingStorageKindLabel(row.kind))}
              ${renderHousingMetric("FOOTPRINT", item.footprint || `${item.width || 1}x${item.height || 1}`)}
              ${renderHousingMetric("VALUE", row.value ? formatCredits(row.value) : "—")}
              ${renderHousingMetric("LOCATION", row.sourceLabel)}
              ${renderHousingMetric("STORAGE UNIT", row.status === "AVAILABLE" ? unit.label || "TARGET STORAGE" : unit.label || item.storageUnitTitle || item.storageUnitId || unit.id)}
              ${renderHousingMetric("PLACEMENT", item.housingPlacement ? `C${item.housingPlacement.column} · R${item.housingPlacement.row} · ${item.housingPlacement.rotation || 0}°` : "PENDING")}
            </div>
            ${isCyberware ? `<p class="housing-storage-note">Cyberware package remains physical hardware. Installation is handled by Equipment → Cyberware.</p>` : ""}
            <div class="housing-storage-transfer-controls">
              ${row.status === "AVAILABLE" ? "" : `
                <label>DESTINATION CARRIED GRID
                  <select data-housing-return-container-select ${returnCandidates.length ? "" : "disabled"}>
                    ${returnCandidates.length ? returnCandidates.map((entry) => `<option value="${escapeHtml(entry.id)}" ${entry.id === returnContainerId ? "selected" : ""}>${escapeHtml(entry.label)}</option>`).join("") : `<option value="">NO COMPATIBLE CONTAINER</option>`}
                  </select>
                </label>
              `}
              ${row.status === "AVAILABLE" || !otherUnits.length ? "" : `
                <label>OTHER HOUSING GRID
                  <select data-housing-target-storage-unit>
                    ${otherUnits.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.housingRecordTitle ? `${entry.housingRecordTitle} / ${entry.label}` : entry.label)}</option>`).join("")}
                  </select>
                </label>
                <button class="housing-inline-action" type="button" data-housing-move-storage-item="${escapeHtml(item.id)}">MOVE BETWEEN HOUSING GRIDS</button>
              `}
            </div>
            <div class="housing-storage-action-stack">
              ${hasOwnGrid ? `<button class="housing-inline-action" type="button" data-housing-toggle-container-grid="${escapeHtml(item.id)}">${isOpenContainer ? "CLOSE CONTAINER GRID" : "OPEN CONTAINER GRID"}</button>` : ""}
              ${canMoveIntoOpenContainer ? `<button class="housing-inline-action" type="button" data-housing-move-item-to-open-container="${escapeHtml(item.id)}" data-housing-open-container-id="${escapeHtml(openContainer.id)}">MOVE TO ${escapeHtml(openContainer.name || "OPEN CONTAINER")}</button>` : ""}
              ${renderHousingStorageRowAction(row, unit.id || DEFAULT_STORAGE_UNIT_ID, returnContainerId)}
            </div>
          </div>
        </aside>
      `;
    }

    function renderHousingFeedback(citizenId = "") {
      const feedback = getHousingFeedback(citizenId);
      if (!feedback) return "";
      return `<div class="housing-feedback is-${escapeHtml(feedback.type.toLowerCase())}">${escapeHtml(feedback.message)}</div>`;
    }

    function renderHousingStorageTab(citizen = {}) {
      const records = getCitizenHousingRecords(citizen);
      if (!records.length) {
        return `
          <section class="housing-module-panel housing-empty-storage-panel">
            <p class="file-empty">No active housing record. Storage requires a housing record or active RENT subscription.</p>
          </section>
        `;
      }

      const activeRecordId = getHousingActiveRecordId(citizen.id, records);
      const activeRecord = records.find((record) => record.id === activeRecordId) || records[0];
      const allUnits = records.flatMap((record) => record.storageUnits.map((unit) => ({ ...unit, housingRecordId: record.id, housingRecordTitle: record.title })));
      const selectedUnitId = getHousingSelectedStorageUnitId(citizen.id, activeRecord.storageUnits);
      const unit = activeRecord.storageUnits.find((entry) => entry.id === selectedUnitId) || activeRecord.storageUnits[0];
      const items = getCitizenEquipmentItems(citizen);
      const storedItems = getHousingStoredItems(items, [unit.id]);
      const available = getAvailableCarryItems(citizen, items);
      const gridModel = typeof window.WS_APP.buildEquipmentHousingGridModel === "function"
        ? window.WS_APP.buildEquipmentHousingGridModel(citizen, unit.id, { citizen, unit })
        : { unit, entries: [], usedSlots: 0, freeSlots: unit.slotCapacity, hasUnplacedItems: false };
      const capacitySlots = unit.slotCapacity;
      const usedSlots = gridModel.usedSlots;
      const storedCount = storedItems.length;
      const storageState = { storedItems, totalSlots: capacitySlots, usedSlots };
      const allRows = buildHousingStorageRows(unit, storageState, available);
      const filters = getHousingStorageFilters(citizen.id);
      const visibleRows = sortHousingStorageRows(filterHousingStorageRows(allRows, filters), filters);
      const selectedItemId = getHousingSelectedStorageItemId(citizen.id);
      const selectedRow = visibleRows.find((row) => row.item?.id === selectedItemId)
        || allRows.find((row) => row.item?.id === selectedItemId)
        || visibleRows[0]
        || null;
      const effectiveSelectedId = selectedRow?.item?.id || "";
      const returnCandidates = selectedRow?.status === "AVAILABLE" ? [] : getHousingReturnContainerOptions(citizen, effectiveSelectedId);
      const returnContainerId = getHousingReturnContainerId(citizen.id, returnCandidates);
      const openContext = resolveHousingOpenContainer(citizen, unit.id);
      const openContainer = openContext.container;
      const openContainerValidation = selectedRow && openContainer && String(selectedRow.item?.id || "") !== String(openContainer.id || "") && typeof window.WS_APP.canMoveEquipmentItemToContainer === "function"
        ? window.WS_APP.canMoveEquipmentItemToContainer(openContext.state, selectedRow.item.id, openContainer.id, {
            state: openContext.state,
            item: openContext.state?.itemById?.[selectedRow.item.id] || selectedRow.item,
            allowStoredSource: selectedRow.item.isStored === true,
            allowStoredContainerTarget: true,
            allowEquippedSource: selectedRow.item.isEquipped === true
          })
        : null;
      const usagePct = capacitySlots ? Math.min(100, Math.round((usedSlots / capacitySlots) * 100)) : 0;

      return `
        <div class="housing-storage-tab">
          ${renderHousingFeedback(citizen.id)}
          <section class="housing-module-panel housing-storage-record-panel">
            <header class="housing-module-panel-head">
              <div><p class="kicker">ACTIVE STORAGE SOURCE</p><h5>${escapeHtml(activeRecord.title)}</h5></div>
              <span class="module-status-badge">${escapeHtml(unit.profileLabel || unit.label)}</span>
            </header>
            <div class="housing-record-selector">
              ${records.map((record) => `
                <button class="housing-record-select ${record.id === activeRecord.id ? "is-active" : ""}" type="button" data-housing-record-id="${escapeHtml(record.id)}">
                  <b>${escapeHtml(record.title)}</b>
                  <small>${escapeHtml(record.storageUnits.reduce((sum, entry) => sum + entry.slotCapacity, 0))} CELLS</small>
                </button>
              `).join("")}
            </div>
            ${activeRecord.storageUnits.length > 1 ? `
              <label class="housing-storage-unit-select">STORAGE GRID
                <select data-housing-active-storage-unit>
                  ${activeRecord.storageUnits.map((entry) => `<option value="${escapeHtml(entry.id)}" ${entry.id === unit.id ? "selected" : ""}>${escapeHtml(entry.label)} · ${escapeHtml(entry.width)}×${escapeHtml(entry.height)}</option>`).join("")}
                </select>
              </label>
            ` : ""}
          </section>

          ${renderHousingStorageShipmentPanel(citizen, activeRecord)}

          <section class="housing-module-panel housing-storage-panel">
            <header class="housing-module-panel-head">
              <div><p class="kicker">PHYSICAL HOUSING GRID</p><h5>${escapeHtml(unit.label)}</h5></div>
              <button class="housing-inline-action" type="button" data-housing-sort-storage data-housing-storage-unit-id="${escapeHtml(unit.id)}" ${storedCount ? "" : "disabled"}>SORT</button>
            </header>
            <div class="housing-storage-layout">
              ${renderHousingPhysicalGrid(gridModel, effectiveSelectedId)}
              <div class="housing-storage-overview">
                <div class="housing-storage-metrics">
                  ${renderHousingMetric("GRID", `${unit.width} × ${unit.height}`)}
                  ${renderHousingMetric("USED CELLS", `${usedSlots} / ${capacitySlots}`)}
                  ${renderHousingMetric("LOAD", `${usagePct}%`)}
                  ${renderHousingMetric("UNPLACED", gridModel.entries.filter((entry) => !entry.placement).length)}
                  ${renderHousingMetric("STORED", storedCount)}
                  ${renderHousingMetric("TRANSFER CANDIDATES", available.length)}
                </div>
                <p class="housing-storage-note">Every stored item owns a persistent housingPlacement. Containers may be stored with their contents. Open a stored container to manage its internal grid; RETURN moves directly to a compatible carried grid.</p>
              </div>
            </div>
          </section>

          ${renderHousingStoredContainerGrid(citizen, unit, openContext.state, openContainer)}

          <section class="housing-module-panel housing-storage-organizer-panel">
            <header class="housing-module-panel-head">
              <div><p class="kicker">STORAGE ORGANIZATION</p><h5>Housing Grid / Physical Transfer Candidates</h5></div>
              <span class="module-status-badge">${escapeHtml(visibleRows.length)} VISIBLE</span>
            </header>
            <div class="housing-storage-organizer">
              ${renderHousingStorageFilterRail(filters, allRows, visibleRows.length)}
              <div class="housing-storage-results">
                <header class="housing-storage-results-head">
                  <div><p class="kicker">FILTERED STORAGE</p><h5>${escapeHtml(getHousingStorageKindLabel(filters.kind))}</h5></div>
                  <span class="module-status-badge">${escapeHtml(filters.status)}</span>
                </header>
                <div class="housing-storage-result-list">
                  ${visibleRows.length
                    ? visibleRows.map((row) => renderHousingStorageRow(row, effectiveSelectedId, unit.id, returnContainerId)).join("")
                    : `<p class="file-empty">No housing or transfer-candidate items match current filters.</p>`}
                </div>
              </div>
              ${renderHousingStorageInspector(selectedRow, unit, { returnCandidates, returnContainerId, otherUnits: allUnits, openContainer, openContainerValidation })}
            </div>
          </section>
        </div>
      `;
    }

    function getHousingGridCellCoordinates(cell = null) {
      return {
        column: Number(cell?.dataset?.housingGridColumn || 0),
        row: Number(cell?.dataset?.housingGridRow || 0)
      };
    }

    function syncHousingGridCellUsage(grid = null) {
      if (!grid) return;
      const occupied = new Set();
      grid.querySelectorAll("[data-housing-grid-drag-item]").forEach((itemNode) => {
        const column = Math.max(1, Number(itemNode.dataset.housingGridColumn || 1));
        const row = Math.max(1, Number(itemNode.dataset.housingGridRow || 1));
        const width = Math.max(1, Number(itemNode.dataset.housingGridWidth || 1));
        const height = Math.max(1, Number(itemNode.dataset.housingGridHeight || 1));
        for (let y = row; y < row + height; y += 1) {
          for (let x = column; x < column + width; x += 1) occupied.add(`${x}:${y}`);
        }
      });
      grid.querySelectorAll("[data-housing-grid-cell]").forEach((cell) => {
        const key = `${Number(cell.dataset.housingGridColumn || 0)}:${Number(cell.dataset.housingGridRow || 0)}`;
        cell.classList.toggle("is-used", occupied.has(key));
      });
    }

    function applyHousingGridPlacementToDom(session = {}, result = {}) {
      if (!session?.source || !session?.grid || !result?.ok || result.noChange === true) return false;
      const placement = result.details?.placement || result.placement || session.validation?.details?.placement || null;
      if (!placement) return false;
      const footprint = result.details?.footprint || session.validation?.details?.footprint || session.context?.footprint || {};
      const column = Math.max(1, Number(placement.column || 1));
      const row = Math.max(1, Number(placement.row || 1));
      const width = Math.max(1, Number(footprint.width || session.source.dataset.housingGridWidth || 1));
      const height = Math.max(1, Number(footprint.height || session.source.dataset.housingGridHeight || 1));
      const rotation = Number(placement.rotation || 0) === 90 ? 90 : 0;
      session.source.dataset.housingGridColumn = String(column);
      session.source.dataset.housingGridRow = String(row);
      session.source.dataset.housingGridRotation = String(rotation);
      session.source.dataset.housingGridWidth = String(width);
      session.source.dataset.housingGridHeight = String(height);
      session.source.style.gridColumn = `${column} / span ${width}`;
      session.source.style.gridRow = `${row} / span ${height}`;
      session.source.classList.remove("is-derived");
      const itemName = session.source.querySelector("b")?.textContent || session.context?.item?.name || "Item";
      session.source.title = itemName;
      const meta = session.source.querySelector("small");
      if (meta) meta.textContent = `${width}×${height} · C${column} R${row}`;
      syncHousingGridCellUsage(session.grid);
      return true;
    }

    function syncHousingSelectedGridItem(root = null, selectedItemId = "") {
      if (!root) return;
      const selectedId = String(selectedItemId || "").trim();
      root.querySelectorAll("[data-housing-grid-drag-item]").forEach((node) => {
        node.classList.toggle("is-selected", String(node.dataset.housingGridDragItem || "").trim() === selectedId);
      });
    }

    function syncHousingFeedbackDom(root = null, citizenId = "") {
      if (!root) return;
      const panel = root.querySelector(".housing-feedback");
      if (!panel) return;
      const feedback = getHousingFeedback(citizenId);
      panel.className = `housing-feedback is-${String(feedback.type || "INFO").toLowerCase()}`;
      panel.textContent = feedback.message;
    }

    function beginHousingGridDrag(event = null, root = null, citizenId = "", user = window.WS_APP.currentUser) {
      if (!event || event.button !== 0 || typeof window.WS_APP.startGridPointerSession !== "function") return;
      const itemElement = event.target.closest?.("[data-housing-grid-drag-item]");
      const gridElement = itemElement?.closest?.("[data-housing-physical-grid]");
      if (!itemElement || !gridElement) return;

      window.WS_APP.startGridPointerSession(event, {
        domain: "HOUSING_GRID",
        sourceSelector: "[data-housing-grid-drag-item]",
        gridSelector: "[data-housing-physical-grid]",
        cellSelector: "[data-housing-grid-cell]",
        draggingClass: "is-dragging",
        dragSourceClass: "is-drag-source",
        dragActiveGridClass: "is-drag-active",
        hoveredCellClass: "is-drag-hovered-cell",
        previewClass: "housing-grid-drag-preview",
        validCellClass: "is-drop-target",
        invalidCellClass: "is-drop-invalid",
        threshold: 5,
        getCellCoordinates: getHousingGridCellCoordinates,
        createContext: ({ source, grid, initialCell }) => {
          const latest = window.WS_APP.getCitizenById?.(citizenId);
          const records = latest ? getCitizenHousingRecords(latest) : [];
          const unitId = String(grid.getAttribute("data-housing-physical-grid") || "").trim();
          const unit = records.flatMap((record) => record.storageUnits).find((entry) => entry.id === unitId) || null;
          const state = latest && window.WS_APP.getEquipmentState?.(latest);
          const itemId = String(source.getAttribute("data-housing-grid-drag-item") || "").trim();
          const item = state?.itemById?.[itemId] || null;
          if (!latest || !unit || !state || !item?.isStored) {
            return { ok: false, code: "HOUSING_GRID_CONTEXT_UNAVAILABLE", message: "Housing grid drag context is unavailable." };
          }
          const startColumn = Number(source.getAttribute("data-housing-grid-column") || item.housingPlacement?.column || 1);
          const startRow = Number(source.getAttribute("data-housing-grid-row") || item.housingPlacement?.row || 1);
          const initialCoordinates = getHousingGridCellCoordinates(initialCell?.element || initialCell);
          const rotation = Number(source.getAttribute("data-housing-grid-rotation") || item.housingPlacement?.rotation || 0) === 90 ? 90 : 0;
          const grabOffset = {
            column: Math.max(0, Number(initialCoordinates.column || startColumn) - startColumn),
            row: Math.max(0, Number(initialCoordinates.row || startRow) - startRow)
          };
          return typeof window.WS_APP.createHousingGridDragContext === "function"
            ? window.WS_APP.createHousingGridDragContext(latest, itemId, unit.id, {
              citizen: latest,
              state,
              unit,
              item,
              rotation,
              grabOffset
            })
            : { ok: false, code: "HOUSING_GRID_ADAPTER_UNAVAILABLE", message: "Housing grid adapter is unavailable." };
        },
        getValidationKey: ({ session, target }) => `${target.column}:${target.row}:${session.context?.rotation || 0}`,
        evaluateDrop: ({ context, targetColumn, targetRow }) => (
          typeof window.WS_APP.evaluateHousingGridDrop === "function"
            ? window.WS_APP.evaluateHousingGridDrop(context, targetColumn, targetRow)
            : { ok: false, code: "HOUSING_GRID_DROP_EVALUATOR_UNAVAILABLE", message: "Housing grid drop evaluator is unavailable." }
        ),
        commitDrop: ({ context, validation }) => (
          typeof window.WS_APP.commitHousingGridDrop === "function"
            ? window.WS_APP.commitHousingGridDrop(context, {
              placement: validation?.details?.placement || null,
              source: "HOUSING_GRID_POINTER_SESSION",
              skipModuleRefresh: true,
              skipProfileRefresh: true,
              deferPersistence: true
            })
            : { ok: false, code: "HOUSING_GRID_DROP_COMMIT_UNAVAILABLE", message: "Housing grid drop commit is unavailable." }
        ),
        onSuppressClick: () => {
          window.WS_APP.housingSuppressClickUntil = Date.now() + 250;
        },
        onComplete: (result, session) => {
          const sessionCitizenId = String(session?.context?.citizenId || citizenId || "").trim();
          const noChange = result?.noChange === true || result?.details?.noChange === true || result?.code === "HOUSING_PLACEMENT_UNCHANGED";
          setHousingFeedback(sessionCitizenId, result?.ok ? (noChange ? "Housing placement unchanged." : "Housing placement updated.") : result?.message || "Housing placement failed.", result?.ok ? "OK" : "ERROR");
          if (result?.ok) {
            const itemId = session?.context?.itemId || "";
            setHousingSelectedStorageItemId(sessionCitizenId, itemId);
            applyHousingGridPlacementToDom(session, result);
            syncHousingSelectedGridItem(root, itemId);
          }
          syncHousingFeedbackDom(root, sessionCitizenId);
        },
        onAbort: (result) => {
          if (result?.message) {
            setHousingFeedback(citizenId, result.message, "ERROR");
            syncHousingFeedbackDom(root, citizenId);
          }
        }
      });
    }


    return {
      resolveHousingStorageProfile,
      getHousingStorageUnitCapacity,
      getHousingItemStorageCost,
      getHousingStoredItems,
      getHousingStorageUsedSlots,
      getHousingRecordStorageStats,
      getHousingPrimaryStorageUnit,
      getHousingRecordWarnings,
      getDefaultHousingStorageFilters,
      normalizeHousingStorageFilters,
      getHousingStorageFilters,
      setHousingStorageFilters,
      resetHousingStorageFilters,
      getHousingSelectedStorageItemId,
      setHousingSelectedStorageItemId,
      getHousingSelectedStorageUnitId,
      setHousingSelectedStorageUnitId,
      getHousingOpenContainerId,
      setHousingOpenContainerId,
      getHousingOpenContainerSelectedItemId,
      setHousingOpenContainerSelectedItemId,
      getHousingReturnContainerId,
      setHousingReturnContainerId,
      getEquipmentFootprintSize,
      normalizeHousingEquipmentItem,
      getCitizenEquipmentItems,
      getHousingItemStorageSlots,
      isHousingStorageUnitId,
      isHousingStorageItem,
      isHousingItemForUnit,
      getAvailableCarryItems,
      resolveHousingOpenContainer,
      isHousingStorageCyberwarePackage,
      getHousingStorageItemKind,
      getHousingStorageKindLabel,
      getHousingStorageItemValue,
      buildHousingStorageRows,
      getHousingStorageSearchText,
      filterHousingStorageRows,
      sortHousingStorageRows,
      getHousingStorageKindStats,
      getHousingActiveStorageTarget,
      updateCitizenEquipmentItems,
      getHousingReturnContainerOptions,
      storeEquipmentItemInHousing,
      returnHousingItemToContainer,
      moveHousingItemToStorageUnit,
      moveHousingItemIntoOpenContainer,
      moveOpenContainerItemToHousing,
      autoSortHousingStorage,
      renderHousingUnitSelector,
      renderHousingUnitStatusRail,
      renderHousingUnitAddressCard,
      renderHousingUnitCapabilities,
      renderHousingUnitWarnings,
      renderHousingUnitActivity,
      renderHousingUnitDashboard,
      renderHousingUnitTab,
      renderHousingMetric,
      renderHousingStorageSelect,
      renderHousingStorageKindTabs,
      renderHousingStorageFilterRail,
      renderHousingPhysicalGrid,
      renderHousingStoredContainerGrid,
      renderHousingStorageRowAction,
      renderHousingStorageRow,
      renderHousingStorageInspector,
      renderHousingFeedback,
      renderHousingStorageTab,
      getHousingGridCellCoordinates,
      syncHousingGridCellUsage,
      applyHousingGridPlacementToDom,
      syncHousingSelectedGridItem,
      syncHousingFeedbackDom,
      beginHousingGridDrag,
    };
  };
})();
