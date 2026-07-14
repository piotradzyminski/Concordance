window.WS_APP = window.WS_APP || {};

(function initHousingModule() {
  const HOUSING_STORAGE_WIDTH = 4;
  const HOUSING_STORAGE_LOCATION = "HOUSING_STORAGE";
  const DEFAULT_STORAGE_UNIT_ID = "housing-storage-main";
  const HOUSING_MARKET_SOURCE = "HOUSING_MARKET";
  const HOUSING_MARKET_DELIVERABLE_SHIPMENT_STATUSES = new Set(["PENDING", "PAID", "PACKED", "IN_TRANSIT"]);
  const HOUSING_SHIPMENT_ACTIVE_STATUSES = new Set(["PENDING", "PAID", "PACKED", "IN_TRANSIT", "HELD"]);
  const HOUSING_SHIPMENT_CLOSED_STATUSES = new Set(["DELIVERED", "FAILED", "CANCELLED", "RETURNED"]);
  const HOUSING_MARKET_DEFAULT_SHIPPING_DAYS = 1;
  const HOUSING_MARKET_MODES = ["CATALOG", "ORDERS", "DELIVERED"];
  const HOUSING_MARKET_ORDER_VIEWS = ["ACTIVE", "HISTORY"];
  const HOUSING_MARKET_ORDER_CLOSED_STATUSES = new Set(["COMPLETED", "REFUNDED", "FAILED", "CANCELLED"]);
  const HOUSING_MARKET_PAGE_SIZE = 6;
  const HOUSING_MARKET_DEPARTMENTS = ["ALL", "EQUIPMENT", "CYBERWARE", "MEDICAL", "FOOD", "HOUSEHOLD"];
  const HOUSING_MARKET_PRODUCT_VISUAL_FALLBACKS = Object.freeze({
    EQUIPMENT: "assets/market/fallback/equipment.svg",
    CYBERWARE: "assets/market/fallback/cyberware.svg",
    MEDICAL: "assets/market/fallback/medical.svg",
    FOOD: "assets/market/fallback/food.svg",
    HOUSEHOLD: "assets/market/fallback/household.svg",
    DEFAULT: "assets/market/fallback/product.svg"
  });
  const HOUSING_MARKET_SORTS = ["CATEGORY", "PRICE_ASC", "PRICE_DESC", "TIER_ASC", "TIER_DESC", "ETA_ASC", "ETA_DESC", "MANUFACTURER", "NAME"];
  const HOUSING_MARKET_STATUSES = ["ALL", "BUYABLE", "TOO_EXPENSIVE", "TOO_LARGE", "REQUIRES_SUBSCRIPTION", "NO_STORAGE", "CONTROLLED"];
  const HOUSING_STORAGE_KINDS = ["ALL", "WEAPON", "ARMOR", "MEDICAL", "TOOLS", "CONTAINER", "DOCUMENT", "CYBERWARE_PACKAGE", "MISC"];
  const HOUSING_STORAGE_STATUSES = ["ALL", "AVAILABLE", "STORED", "OVERFLOW"];
  const HOUSING_STORAGE_SORTS = ["CATEGORY", "NAME", "SIZE_DESC", "SIZE_ASC", "STATUS", "VALUE_DESC", "VALUE_ASC"];
  const HOUSING_MARKET_VENDOR_DEFAULTS = {
    MEDICAL: { organizationLocationId: "orgloc-trauma-local-medical-supply-n3-a4", vendorId: "vendor-trauma-local-medical" },
    WEAPON: { organizationLocationId: "orgloc-ws-controlled-armory-n3-a4", vendorId: "vendor-ws-controlled-armory" },
    ARMOR: { organizationLocationId: "orgloc-ws-controlled-armory-n3-a4", vendorId: "vendor-ws-controlled-armory" },
    DOCUMENT: { organizationLocationId: "orgloc-system-access-desk-n3-a4", vendorId: "vendor-system-access-desk" },
    CONTAINER: { organizationLocationId: "orgloc-mass-compression-logistics-n3-b12", vendorId: "vendor-mass-compression-logistics" },
    TOOLS: { organizationLocationId: "orgloc-factory-commons-utility-depot-n3-c8", vendorId: "vendor-factory-commons-utility" },
    DEFAULT: { organizationLocationId: "orgloc-habitat-market-fulfillment-n3-b12", vendorId: "vendor-habitat-market" }
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

  function escapeHtml(value) {
    if (typeof window.WS_APP.escapeHtml === "function") return window.WS_APP.escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clampNumber(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function getCitizenShortId(citizen = {}) {
    if (typeof window.WS_APP.getCitizenShortId === "function") return window.WS_APP.getCitizenShortId(citizen);
    return citizen.shortId || citizen.id || "UNKNOWN";
  }

  function getCitizenName(citizen = {}, user = window.WS_APP.currentUser) {
    return window.WS_APP.formatCitizenDisplayName?.(citizen, { user, legal: true })
      || window.WS_APP.getCitizenDisplayName?.(citizen, { user, legal: true })
      || citizen.legalName
      || citizen.name
      || getCitizenShortId(citizen);
  }

  function getHousingCitizens(user = window.WS_APP.currentUser) {
    const citizens = window.WS_APP.getCitizens?.() || [];
    if (user?.role === "admin") return citizens.filter((citizen) => citizen.recordType !== "admin");
    const citizen = window.WS_APP.getCitizenById?.(user?.citizenId);
    return citizen ? [citizen] : [];
  }

  function getHousingTargetCitizen(user = window.WS_APP.currentUser) {
    const citizens = getHousingCitizens(user);
    if (!citizens.length) return null;
    if (user?.role !== "admin") return citizens[0];

    const currentId = String(window.WS_APP.housingTargetCitizenId || window.WS_APP.currentCitizenCardsSelectedId || window.WS_APP.terminalTargetCitizenId || "").trim();
    const current = currentId ? citizens.find((citizen) => citizen.id === currentId) : null;
    const target = current || citizens[0];
    window.WS_APP.housingTargetCitizenId = target.id;
    return target;
  }

  function getRentSubscriptions(citizen = {}) {
    return (Array.isArray(citizen.subscriptions) ? citizen.subscriptions : [])
      .filter((subscription) => subscription && String(subscription.category || "").toUpperCase() === "RENT" && subscription.archived !== true);
  }

  function getCitizenHousingRecords(citizen = {}) {
    return window.WS_APP.getCitizenHousingRecords?.(citizen) || [];
  }

  function getHousingActiveRecord(citizen = {}, records = getCitizenHousingRecords(citizen)) {
    const activeRecordId = getHousingActiveRecordId(citizen.id, records);
    return records.find((record) => record.id === activeRecordId) || records[0] || null;
  }

  function getHousingRecordSubscription(citizen = {}, record = null) {
    if (!record) return null;
    const subscriptions = getRentSubscriptions(citizen);
    const linkedId = String(record.linkedSubscriptionId || "").trim();
    return subscriptions.find((subscription) => {
      const ids = [subscription.id, subscription.catalogId, subscription.tierId, subscription.title]
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      return linkedId ? ids.includes(linkedId) : String(subscription.status || "").trim().toUpperCase() === record.rentStatus;
    }) || subscriptions[0] || null;
  }

  function getHousingShipmentUnitContext(citizen = {}, shipment = {}, order = {}) {
    const records = getCitizenHousingRecords(citizen);
    const targetHousingId = String(shipment.destinationHousingId || shipment.targetHousingId || order.targetHousingId || order.destinationHousingId || "").trim();
    const targetUnitId = String(shipment.targetUnitId || order.targetUnitId || DEFAULT_STORAGE_UNIT_ID).trim();
    const record = (targetHousingId ? records.find((entry) => entry.id === targetHousingId) : null)
      || records.find((entry) => entry.storageUnits.some((unit) => unit.id === targetUnitId))
      || records[0]
      || null;
    const unit = getHousingPrimaryStorageUnit(record, targetUnitId);
    return {
      records,
      record,
      unit,
      housingId: record?.id || targetHousingId || "",
      unitId: unit?.id || targetUnitId || DEFAULT_STORAGE_UNIT_ID,
      unitTitle: String(shipment.destinationUnitTitle || shipment.targetUnitTitle || order.targetUnitTitle || order.destinationUnitTitle || record?.title || "UNASSIGNED UNIT").trim(),
      unitLabel: String(shipment.targetUnitLabel || order.targetUnitLabel || unit?.label || "NO STORAGE UNIT").trim(),
      destinationAddress: String(shipment.destinationAddress || order.destinationAddress || record?.visibleAddress || citizen.address || citizen.visibleAddress || "UNASSIGNED").trim(),
      traceAddress: String(record?.traceAddress || citizen.traceAddress || citizen.trace || "").trim()
    };
  }

  function getHousingShipmentState(shipment = {}, order = {}) {
    const status = normalizeShipmentStatus(shipment.status || order.status || "IN_TRANSIT");
    const result = String(shipment.deliveryResult || order.deliveryResult || "").trim().toUpperCase();
    if (status === "DELIVERED" && result === "STORAGE_OVERFLOW") return "DELIVERED_OVERFLOW";
    return status;
  }

  function formatHousingShipmentState(state = "IN_TRANSIT") {
    return String(state || "IN_TRANSIT").trim().toUpperCase().replace(/_/g, " ");
  }

  function isHousingShipmentClosed(shipment = {}, order = {}) {
    const state = getHousingShipmentState(shipment, order);
    return state === "DELIVERED_OVERFLOW" || HOUSING_SHIPMENT_CLOSED_STATUSES.has(state);
  }

  function getHousingRecordShipmentStats(citizen = {}, record = null) {
    const orders = getCitizenMarketOrders(citizen);
    const orderByShipmentId = new Map(orders.map((order) => [order.shipmentId, order]));
    const shipments = getCitizenShipments(citizen).filter((shipment) => {
      if (!record) return true;
      const context = getHousingShipmentUnitContext(citizen, shipment, orderByShipmentId.get(shipment.id) || {});
      return context.record?.id === record.id;
    });
    const active = shipments.filter((shipment) => !isHousingShipmentClosed(shipment, orderByShipmentId.get(shipment.id) || {}));
    const held = active.filter((shipment) => shipment.status === "HELD");
    const delivered = shipments.filter((shipment) => getHousingShipmentState(shipment, orderByShipmentId.get(shipment.id) || {}) === "DELIVERED");
    const overflow = shipments.filter((shipment) => getHousingShipmentState(shipment, orderByShipmentId.get(shipment.id) || {}) === "DELIVERED_OVERFLOW");
    const nextEta = active
      .map((shipment) => shipment.etaIso)
      .filter(isIsoDate)
      .sort((a, b) => a.localeCompare(b))[0] || "";
    return { shipments, active, held, delivered, overflow, nextEta };
  }

  function getHousingActiveTab(citizenId = "") {
    window.WS_APP.housingActiveTabByCitizen = window.WS_APP.housingActiveTabByCitizen || {};
    const tab = String(window.WS_APP.housingActiveTabByCitizen[citizenId] || "UNIT").toUpperCase();
    return ["UNIT", "HOUSEHOLD", "STORAGE", "MARKET"].includes(tab) ? tab : "UNIT";
  }

  function setHousingActiveTab(citizenId = "", tab = "UNIT") {
    window.WS_APP.housingActiveTabByCitizen = window.WS_APP.housingActiveTabByCitizen || {};
    const normalized = String(tab || "UNIT").toUpperCase();
    window.WS_APP.housingActiveTabByCitizen[citizenId] = ["UNIT", "HOUSEHOLD", "STORAGE", "MARKET"].includes(normalized) ? normalized : "UNIT";
  }

  function getHousingActiveRecordId(citizenId = "", records = []) {
    window.WS_APP.housingActiveRecordByCitizen = window.WS_APP.housingActiveRecordByCitizen || {};
    const storedId = String(window.WS_APP.housingActiveRecordByCitizen[citizenId] || "").trim();
    const match = storedId ? records.find((record) => record.id === storedId) : null;
    const record = match || records[0] || null;
    if (record) window.WS_APP.housingActiveRecordByCitizen[citizenId] = record.id;
    return record?.id || "";
  }

  function setHousingActiveRecordId(citizenId = "", recordId = "") {
    window.WS_APP.housingActiveRecordByCitizen = window.WS_APP.housingActiveRecordByCitizen || {};
    window.WS_APP.housingActiveRecordByCitizen[citizenId] = String(recordId || "").trim();
  }

  function getHousingFeedback(citizenId = "") {
    window.WS_APP.housingFeedbackByCitizen = window.WS_APP.housingFeedbackByCitizen || {};
    return window.WS_APP.housingFeedbackByCitizen[citizenId] || null;
  }

  function setHousingFeedback(citizenId = "", message = "", type = "INFO") {
    window.WS_APP.housingFeedbackByCitizen = window.WS_APP.housingFeedbackByCitizen || {};
    if (!message) {
      delete window.WS_APP.housingFeedbackByCitizen[citizenId];
      return;
    }
    window.WS_APP.housingFeedbackByCitizen[citizenId] = {
      message: String(message),
      type: String(type || "INFO").toUpperCase()
    };
  }

  const housingStorageRuntime = window.WS_APP.createHousingStorageRuntime?.({
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
    setHousingFeedback
  });

  if (!housingStorageRuntime) throw new Error("HOUSING_STORAGE_RUNTIME_UNAVAILABLE");

  const {
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
  } = housingStorageRuntime;

  const housingHouseholdRuntime = window.WS_APP.createHousingHouseholdRuntime?.({
    DEFAULT_STORAGE_UNIT_ID,
    escapeHtml,
    getCitizenHousingRecords,
    getHousingActiveRecord,
    renderHousingFeedback,
    renderHousingMetric,
    renderHousingModule,
    setHousingFeedback
  });

  if (!housingHouseholdRuntime) throw new Error("HOUSING_HOUSEHOLD_RUNTIME_UNAVAILABLE");

  const {
    renderHousingHouseholdTab,
    handleHousingHouseholdPointerMove,
    handleHousingHouseholdPointerLeave,
    handleHousingHouseholdInput,
    handleHousingHouseholdChange,
    handleHousingHouseholdClick
  } = housingHouseholdRuntime;


  let housingMarketRuntime = null;
  let housingMarketRuntimePromise = null;
  let housingMarketRuntimeError = null;

  function createHousingMarketRuntimeInstance() {
    if (housingMarketRuntime) return housingMarketRuntime;
    const factory = window.WS_APP.createHousingMarketRuntime;
    if (typeof factory !== "function") throw new Error("HOUSING_MARKET_RUNTIME_FACTORY_UNAVAILABLE");
    housingMarketRuntime = factory({
      DEFAULT_STORAGE_UNIT_ID,
      HOUSING_MARKET_DEFAULT_SHIPPING_DAYS,
      HOUSING_MARKET_DELIVERABLE_SHIPMENT_STATUSES,
      HOUSING_MARKET_DEPARTMENTS,
      HOUSING_MARKET_MODES,
      HOUSING_MARKET_ORDER_CLOSED_STATUSES,
      HOUSING_MARKET_ORDER_VIEWS,
      HOUSING_MARKET_PAGE_SIZE,
      HOUSING_MARKET_PRODUCT_VISUAL_FALLBACKS,
      HOUSING_MARKET_SORTS,
      HOUSING_MARKET_STATUSES,
      HOUSING_MARKET_VENDOR_DEFAULTS,
      HOUSING_SHIPMENT_ACTIVE_STATUSES,
      addDaysIso,
      clampNumber,
      compareIsoDates,
      escapeHtml,
      formatCredits,
      formatIsoLabel,
      getCampaignDateIso,
      getCitizenEquipmentItems,
      getCitizenHousingRecords,
      getCitizenMarketOrders,
      getCitizenShipments,
      getEquipmentFootprintSize,
      getHousingActiveStorageTarget,
      getHousingShipmentState,
      getHousingShipmentUnitContext,
      isIsoDate,
      normalizeMarketOrder,
      normalizeShipment,
      parseCredits,
      renderHousingFeedback,
      renderHousingMetric,
      renderHousingModule,
      renderHousingShipmentRow,
      setHousingActiveTab,
      setHousingFeedback
    });
    window.WS_APP.housingMarketRuntime = housingMarketRuntime;
    return housingMarketRuntime;
  }

  function ensureHousingMarketRuntime(user = window.WS_APP.currentUser) {
    if (housingMarketRuntime) return Promise.resolve(housingMarketRuntime);
    if (housingMarketRuntimePromise) return housingMarketRuntimePromise;
    housingMarketRuntimeError = null;
    housingMarketRuntimePromise = Promise.resolve(window.WS_APP.loadModuleBundle?.("housing-market-workspace", user))
      .then(() => createHousingMarketRuntimeInstance())
      .catch((error) => {
        housingMarketRuntimeError = error;
        throw error;
      })
      .finally(() => {
        housingMarketRuntimePromise = null;
      });
    return housingMarketRuntimePromise;
  }

  function renderHousingMarketWorkspace(citizen = {}, user = window.WS_APP.currentUser) {
    if (housingMarketRuntime) return housingMarketRuntime.renderHousingMarketTab(citizen);
    if (!housingMarketRuntimePromise && !housingMarketRuntimeError) {
      void ensureHousingMarketRuntime(user).then(() => {
        const activeCitizen = getHousingTargetCitizen(user);
        if (activeCitizen?.id === citizen.id && getHousingActiveTab(citizen.id) === "MARKET") renderHousingModule(user);
      }).catch((error) => {
        console.error("Housing Market runtime failed to load.", error);
        if (document.querySelector("[data-housing-module]") && getHousingActiveTab(citizen.id) === "MARKET") renderHousingModule(user);
      });
    }
    const message = housingMarketRuntimeError
      ? `Market workspace failed to load: ${String(housingMarketRuntimeError.message || housingMarketRuntimeError).replace(/_/g, " ")}`
      : "Loading Market workspace…";
    return `
      <section class="housing-module-panel housing-market-runtime-state" data-housing-market-runtime-state="${housingMarketRuntimeError ? "ERROR" : "LOADING"}">
        <header class="housing-module-panel-head">
          <div><p class="kicker">HOUSING / MARKET</p><h5>${housingMarketRuntimeError ? "Workspace unavailable" : "Initializing workspace"}</h5></div>
          <span class="module-status-badge">${housingMarketRuntimeError ? "ERROR" : "LAZY LOAD"}</span>
        </header>
        <p class="housing-storage-note">${escapeHtml(message)}</p>
        ${housingMarketRuntimeError ? '<button class="housing-inline-action" type="button" data-housing-market-runtime-retry>RETRY LOAD</button>' : ""}
      </section>
    `;
  }

  function isHousingMarketEventTarget(target) {
    let node = target && typeof target === "object" ? target : null;
    while (node && node !== document) {
      if (node.hasAttribute?.("data-housing-process-shipments") || node.hasAttribute?.("data-housing-retry-shipment") || node.hasAttribute?.("data-housing-market-runtime-retry")) return true;
      if (Array.from(node.attributes || []).some((attribute) => String(attribute.name || "").startsWith("data-housing-market-"))) return true;
      node = node.parentElement;
    }
    return false;
  }

  function delegateHousingMarketEvent(type, event, context = {}) {
    if (!isHousingMarketEventTarget(event?.target)) return false;
    const invoke = (runtime) => {
      if (event?.target?.closest?.("[data-housing-market-runtime-retry]")) {
        housingMarketRuntimeError = null;
        renderHousingModule(context.user || window.WS_APP.currentUser);
        return true;
      }
      const handler = runtime?.[type];
      return typeof handler === "function" ? handler(event, context) : false;
    };
    if (housingMarketRuntime) return invoke(housingMarketRuntime);
    void ensureHousingMarketRuntime(context.user).then((runtime) => invoke(runtime)).catch((error) => {
      setHousingFeedback(context.citizenId, `Market workspace unavailable: ${String(error?.message || error || "UNKNOWN").replace(/_/g, " ")}.`, "ERROR");
      renderHousingModule(context.user || window.WS_APP.currentUser);
    });
    return true;
  }

  function resetHousingMarketTransientState(root = null, citizenId = "") {
    if (housingMarketRuntime?.resetHousingMarketTransientUi) {
      housingMarketRuntime.resetHousingMarketTransientUi(root, citizenId);
      return;
    }
    window.WS_APP.housingMarketCartOpenByCitizen = window.WS_APP.housingMarketCartOpenByCitizen || {};
    window.WS_APP.housingMarketSelectedProductByCitizen = window.WS_APP.housingMarketSelectedProductByCitizen || {};
    window.WS_APP.housingMarketCartOpenByCitizen[citizenId] = false;
    window.WS_APP.housingMarketSelectedProductByCitizen[citizenId] = "";
    document.body?.classList?.remove?.("housing-market-modal-open");
  }

  function handleHousingModuleBack(user = window.WS_APP.currentUser, citizenId = "") {
    const root = document.querySelector("[data-housing-module]");
    const targetCitizenId = String(citizenId || root?.getAttribute?.("data-housing-citizen-id") || "").trim();
    if (targetCitizenId && getHousingActiveTab(targetCitizenId) === "MARKET") {
      const handled = housingMarketRuntime?.handleHousingMarketBackNavigation?.({ root, citizenId: targetCitizenId, user });
      if (handled) return;
    }
    resetHousingMarketTransientState(root, targetCitizenId);
    window.WS_APP.renderModules?.(user);
  }

  function getCampaignDateIso() {
    const iso = String(window.WS_APP.getCampaignDateIso?.() || window.WS_APP.CAMPAIGN_DATE_ISO || "2109-02-13").trim();
    return isIsoDate(iso) ? iso : "2109-02-13";
  }

  function isIsoDate(value = "") {
    const iso = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const parsed = new Date(`${iso}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso;
  }

  function compareIsoDates(a = "", b = "") {
    const left = isIsoDate(a) ? a : "2109-02-13";
    const right = isIsoDate(b) ? b : "2109-02-13";
    return left.localeCompare(right);
  }

  function addDaysIso(iso = getCampaignDateIso(), days = 0) {
    const safeIso = isIsoDate(iso) ? iso : getCampaignDateIso();
    const parsed = new Date(`${safeIso}T00:00:00Z`);
    parsed.setUTCDate(parsed.getUTCDate() + clampNumber(days, 0, 3650));
    return parsed.toISOString().slice(0, 10);
  }

  function formatIsoLabel(iso = "") {
    const safeIso = isIsoDate(iso) ? iso : getCampaignDateIso();
    const match = safeIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : safeIso;
  }

  function normalizeShipmentStatus(value = "IN_TRANSIT") {
    const status = String(value || "IN_TRANSIT").trim().toUpperCase();
    return status || "IN_TRANSIT";
  }

  function getCitizenMarketOrders(citizen = {}) {
    return Array.isArray(citizen.marketOrders) ? citizen.marketOrders.filter(Boolean).map((order, index) => normalizeMarketOrder(order, index)) : [];
  }

  function getCitizenShipments(citizen = {}) {
    return Array.isArray(citizen.shipments) ? citizen.shipments.filter(Boolean).map((shipment, index) => normalizeShipment(shipment, index)) : [];
  }

  function normalizeMarketOrder(order = {}, index = 0) {
    const source = order && typeof order === "object" && !Array.isArray(order) ? order : {};
    return {
      ...source,
      id: String(source.id || `order-${index + 1}`).trim(),
      type: String(source.type || "ITEM_PURCHASE").trim().toUpperCase(),
      catalogId: String(source.catalogId || source.itemCatalogId || source.itemId || "").trim(),
      itemName: String(source.itemName || source.name || "Market item").trim(),
      quantity: clampNumber(source.quantity || 1, 1, 999),
      vendorProviderId: String(source.vendorProviderId || source.providerId || source.vendorId || "provider-habitat-ledger").trim(),
      vendorId: String(source.vendorId || source.vendorProviderId || source.providerId || "provider-habitat-ledger").trim(),
      vendorName: String(source.vendorName || "Habitat Market Fulfillment").trim(),
      price: parseCredits(source.price || source.amount || 0),
      currency: String(source.currency || "CREDITS").trim().toUpperCase(),
      status: normalizeShipmentStatus(source.status || "IN_TRANSIT"),
      placedAtIso: isIsoDate(source.placedAtIso) ? source.placedAtIso : getCampaignDateIso(),
      etaIso: isIsoDate(source.etaIso) ? source.etaIso : addDaysIso(getCampaignDateIso(), HOUSING_MARKET_DEFAULT_SHIPPING_DAYS),
      deliveredAtIso: isIsoDate(source.deliveredAtIso) ? source.deliveredAtIso : "",
      shipmentId: String(source.shipmentId || "").trim(),
      targetHousingId: String(source.targetHousingId || source.destinationHousingId || "").trim(),
      targetUnitId: String(source.targetUnitId || DEFAULT_STORAGE_UNIT_ID).trim(),
      targetUnitTitle: String(source.targetUnitTitle || source.destinationUnitTitle || "").trim(),
      targetUnitLabel: String(source.targetUnitLabel || "").trim(),
      destinationAddress: String(source.destinationAddress || "").trim(),
      deliveryResult: String(source.deliveryResult || "").trim().toUpperCase(),
      deliveredItemId: String(source.deliveredItemId || "").trim(),
      holdReason: String(source.holdReason || "").trim().toUpperCase()
    };
  }

  function normalizeShipment(shipment = {}, index = 0) {
    const source = shipment && typeof shipment === "object" && !Array.isArray(shipment) ? shipment : {};
    return {
      ...source,
      id: String(source.id || `ship-${index + 1}`).trim(),
      orderId: String(source.orderId || "").trim(),
      sourceInstitutionId: String(source.sourceInstitutionId || source.vendorId || "inst-habitat-market-local").trim(),
      organizationLocationId: String(source.organizationLocationId || source.sourceLocationId || "").trim(),
      sourceLabel: String(source.sourceLabel || source.vendorName || "Habitat Market Fulfillment").trim(),
      sourceAddress: String(source.sourceAddress || "").trim(),
      destinationHousingId: String(source.destinationHousingId || source.targetHousingId || "").trim(),
      destinationAddress: String(source.destinationAddress || "").trim(),
      targetUnitId: String(source.targetUnitId || DEFAULT_STORAGE_UNIT_ID).trim(),
      deliveryType: String(source.deliveryType || "STANDARD").trim().toUpperCase(),
      status: normalizeShipmentStatus(source.status || "IN_TRANSIT"),
      placedAtIso: isIsoDate(source.placedAtIso) ? source.placedAtIso : getCampaignDateIso(),
      etaIso: isIsoDate(source.etaIso) ? source.etaIso : addDaysIso(getCampaignDateIso(), HOUSING_MARKET_DEFAULT_SHIPPING_DAYS),
      deliveredAtIso: isIsoDate(source.deliveredAtIso) ? source.deliveredAtIso : "",
      heldAtIso: isIsoDate(source.heldAtIso) ? source.heldAtIso : "",
      routeClass: String(source.routeClass || "STANDARD_LOCAL").trim().toUpperCase(),
      holdReason: String(source.holdReason || "").trim().toUpperCase(),
      deliveryResult: String(source.deliveryResult || "").trim().toUpperCase(),
      deliveredItemId: String(source.deliveredItemId || "").trim(),
      destinationUnitTitle: String(source.destinationUnitTitle || source.targetUnitTitle || "").trim(),
      targetUnitLabel: String(source.targetUnitLabel || "").trim(),
      payload: source.payload && typeof source.payload === "object" && !Array.isArray(source.payload) ? { ...source.payload } : {}
    };
  }

  function parseCredits(value = 0) {
    if (typeof window.WS_APP.parseCredits === "function") return window.WS_APP.parseCredits(value);
    return window.WS_APP.storeUtils?.parseCreditNumber?.(value) || 0;
  }

  function formatCredits(value = 0) {
    if (typeof window.WS_APP.formatCredits === "function") return window.WS_APP.formatCredits(value);
    return window.WS_APP.storeUtils?.formatCreditLabel?.(value) || "0 ₡";
  }

  function renderHousingTargetSwitcher(user, selectedId) {
    if (user?.role !== "admin") return "";
    const citizens = getHousingCitizens(user);
    return `
      <section class="housing-target-panel terminal-admin-target">
        <label>
          <span>ADMIN TARGET HOUSING</span>
          <select data-housing-target-citizen>
            ${citizens.map((citizen) => `
              <option value="${escapeHtml(citizen.id)}" ${citizen.id === selectedId ? "selected" : ""}>
                ${escapeHtml(getCitizenName(citizen, user))} / ${escapeHtml(getCitizenShortId(citizen))}
              </option>
            `).join("")}
          </select>
        </label>
      </section>
    `;
  }

  function renderHousingSession(user, citizen) {
    return `
      <section class="housing-module-session terminal-local-session" aria-label="Housing Session">
        <div class="terminal-local-session-head">
          <p class="kicker">HOUSING / HABITAT ACCESS</p>
          <strong>MODULE STATUS: ACTIVE HOUSING</strong>
        </div>
        <div class="terminal-local-session-line">
          <span>CITIZEN: <b>${escapeHtml(getCitizenName(citizen, user))}</b></span>
          <span>SHORT ID: <b>${escapeHtml(getCitizenShortId(citizen))}</b></span>
          <span>ADDRESS: <b>${escapeHtml(citizen.address || citizen.visibleAddress || "UNASSIGNED")}</b></span>
        </div>
      </section>
    `;
  }

  function renderHousingRecord(record, index, activeRecordId = "") {
    const storageSlots = record.storageUnits.reduce((sum, unit) => sum + Number(unit.slotCapacity || 0), 0);
    const isActive = record.id === activeRecordId;
    return `
      <article class="housing-record-card ${index === 0 ? "is-primary" : ""} ${isActive ? "is-active" : ""}">
        <header>
          <div>
            <p class="kicker">${index === 0 ? "PRIMARY HABITAT" : "HABITAT RECORD"}</p>
            <h5>${escapeHtml(record.title)}</h5>
            <small>${escapeHtml(record.provider)} / ${escapeHtml(record.type)}</small>
          </div>
          <span class="module-status-badge">${escapeHtml(isActive ? "ACTIVE" : record.status)}</span>
        </header>
        <dl class="housing-record-unit">
          <div><dt>Rent</dt><dd>${escapeHtml(record.rentStatus)}</dd></div>
          <div><dt>Visible Address</dt><dd>${escapeHtml(record.visibleAddress || "UNASSIGNED")}</dd></div>
          <div><dt>Access</dt><dd>${escapeHtml(record.accessLevel)}</dd></div>
          <div><dt>Security</dt><dd>${escapeHtml(record.securityLevel)}</dd></div>
          <div><dt>Privacy</dt><dd>${escapeHtml(record.privacyLevel)}</dd></div>
          <div><dt>Storage</dt><dd>${escapeHtml(storageSlots ? `${storageSlots} SLOTS` : "NONE")}</dd></div>
        </dl>
        <div class="housing-record-actions">
          <button class="housing-inline-action" type="button" data-housing-select-unit="${escapeHtml(record.id)}">${isActive ? "ACTIVE UNIT" : "SET ACTIVE"}</button>
          <button class="housing-inline-action" type="button" data-housing-record-id="${escapeHtml(record.id)}">OPEN STORAGE</button>
        </div>
      </article>
    `;
  }

  function renderHousingTabs(citizen = {}, records = []) {
    const active = getHousingActiveTab(citizen.id);
    const storageSlots = records.reduce((sum, record) => sum + record.storageUnits.reduce((unitSum, unit) => unitSum + unit.slotCapacity, 0), 0);
    const marketItems = housingMarketRuntime?.getHousingMarketCatalogItems?.() || [];
    const activeShipments = getCitizenShipments(citizen).filter((shipment) => !["DELIVERED", "FAILED", "CANCELLED"].includes(shipment.status));
    return `
      <div class="housing-module-tabs system-segment-tabs" role="tablist" aria-label="Housing Sections">
        <button class="housing-module-tab system-segment-tile system-segment-tile--card ${active === "UNIT" ? "is-active" : ""}" type="button" role="tab" aria-selected="${active === "UNIT" ? "true" : "false"}" data-housing-tab="UNIT">
          <span class="system-segment-tile__body">
            <b class="system-segment-tile__title">UNIT</b>
            <small class="system-segment-tile__description">HABITAT / ${escapeHtml(records.length)} RECORD${records.length === 1 ? "" : "S"}</small>
          </span>
        </button>
        <button class="housing-module-tab system-segment-tile system-segment-tile--card ${active === "HOUSEHOLD" ? "is-active" : ""}" type="button" role="tab" aria-selected="${active === "HOUSEHOLD" ? "true" : "false"}" data-housing-tab="HOUSEHOLD">
          <span class="system-segment-tile__body">
            <b class="system-segment-tile__title">HOUSEHOLD</b>
            <small class="system-segment-tile__description">ROOMS / FURNISHING / SAFE SPACE</small>
          </span>
        </button>
        <button class="housing-module-tab system-segment-tile system-segment-tile--card ${active === "STORAGE" ? "is-active" : ""}" type="button" role="tab" aria-selected="${active === "STORAGE" ? "true" : "false"}" data-housing-tab="STORAGE">
          <span class="system-segment-tile__body">
            <b class="system-segment-tile__title">STORAGE</b>
            <small class="system-segment-tile__description">STORAGE / ${escapeHtml(storageSlots)} SLOTS</small>
          </span>
        </button>
        <button class="housing-module-tab system-segment-tile system-segment-tile--card ${active === "MARKET" ? "is-active" : ""}" type="button" role="tab" aria-selected="${active === "MARKET" ? "true" : "false"}" data-housing-tab="MARKET">
          <span class="system-segment-tile__body">
            <b class="system-segment-tile__title">MARKET</b>
            <small class="system-segment-tile__description">MARKET / SHIPPING / ${escapeHtml(activeShipments.length)} ACTIVE / ${housingMarketRuntime ? `${escapeHtml(marketItems.length)} ITEMS` : "LAZY WORKSPACE"}</small>
          </span>
        </button>
      </div>
    `;
  }


  function renderHousingModuleSummary(citizen = {}, records = []) {
    const activeRecordId = getHousingActiveRecordId(citizen.id, records);
    const activeRecord = records.find((record) => record.id === activeRecordId) || records[0] || null;
    const items = getCitizenEquipmentItems(citizen);
    const storageSlots = records.reduce((sum, record) => sum + record.storageUnits.reduce((unitSum, unit) => unitSum + unit.slotCapacity, 0), 0);
    const storedItems = items.filter((item) => isHousingStorageItem(item));
    const shipments = getCitizenShipments(citizen);
    const activeShipments = shipments.filter((shipment) => !["DELIVERED", "FAILED", "CANCELLED"].includes(shipment.status));
    const heldShipments = activeShipments.filter((shipment) => shipment.status === "HELD");

    return `
      <section class="housing-module-panel housing-module-summary" aria-label="Housing Summary">
        <header class="housing-module-panel-head">
          <div>
            <p class="kicker">HOUSING SUMMARY</p>
            <h5>${escapeHtml(activeRecord?.title || "No Active Unit")}</h5>
          </div>
          <span class="module-status-badge">${escapeHtml(records.length ? "READY" : "NO UNIT")}</span>
        </header>
        <div class="housing-summary-unit">
          ${renderHousingMetric("ACTIVE UNIT", activeRecord ? activeRecord.status : "NONE")}
          ${renderHousingMetric("STORAGE LIMIT", `${storageSlots} SLOTS`)}
          ${renderHousingMetric("STORED ITEMS", storedItems.length)}
          ${renderHousingMetric("ACTIVE SHIPMENTS", activeShipments.length)}
          ${renderHousingMetric("HELD SHIPMENTS", heldShipments.length)}
        </div>
      </section>
    `;
  }

  function renderHousingShipmentRow(order = {}, shipment = {}, citizen = {}) {
    const state = getHousingShipmentState(shipment, order);
    const statusClass = state.toLowerCase().replace(/_/g, "-");
    const isHeld = state === "HELD";
    const context = getHousingShipmentUnitContext(citizen, shipment, order);
    const itemName = order.itemName || shipment.payload?.itemName || "Market item";
    const result = String(shipment.deliveryResult || order.deliveryResult || "").trim().toUpperCase();
    const deliveredItemId = shipment.deliveredItemId || order.deliveredItemId || "";
    const canOpenStorage = Boolean(context.record?.id);
    return `
      <article class="housing-shipment-row is-${escapeHtml(statusClass)}">
        <div class="housing-shipment-row-main">
          <b>${escapeHtml(itemName)}</b>
          <small>${escapeHtml(`${formatHousingShipmentState(state)} / ETA ${formatIsoLabel(shipment.etaIso || order.etaIso)} / ${shipment.routeClass || "STANDARD"}`)}</small>
          <small>${escapeHtml(`${shipment.sourceLabel || order.vendorName || "Vendor"} → ${context.unitTitle} / ${context.unitLabel}`)}</small>
          <small>${escapeHtml(`TARGET ${context.destinationAddress || "UNASSIGNED"}`)}</small>
          ${result ? `<small class="housing-shipment-result">RESULT: ${escapeHtml(result.replace(/_/g, " "))}${deliveredItemId ? ` / ITEM ${escapeHtml(deliveredItemId)}` : ""}</small>` : ""}
          ${isHeld ? `<small class="housing-shipment-hold">HELD: ${escapeHtml(shipment.holdReason || order.holdReason || "UNKNOWN")}</small>` : ""}
        </div>
        <div class="housing-shipment-actions">
          ${canOpenStorage ? `<button class="housing-inline-action" type="button" data-housing-record-id="${escapeHtml(context.record.id)}">OPEN STORAGE</button>` : ""}
          ${isHeld ? `<button class="housing-inline-action" type="button" data-housing-retry-shipment="${escapeHtml(shipment.id)}">RETRY</button>` : `<span class="module-status-badge">${escapeHtml(formatCredits(order.price || 0))}</span>`}
        </div>
      </article>
    `;
  }

  function renderHousingStorageShipmentPanel(citizen = {}, record = null) {
    if (!record) return "";
    const stats = getHousingRecordShipmentStats(citizen, record);
    const tracked = [...stats.active, ...stats.overflow].slice(0, 5);
    if (!tracked.length) return "";
    const orderByShipmentId = new Map(getCitizenMarketOrders(citizen).map((order) => [order.shipmentId, order]));
    return `
      <section class="housing-module-panel housing-storage-shipment-panel">
        <header class="housing-module-panel-head">
          <div>
            <p class="kicker">UNIT DELIVERY QUEUE</p>
            <h5>Held / Active / Overflow Shipments</h5>
          </div>
          <span class="module-status-badge">${escapeHtml(stats.held.length)} HELD / ${escapeHtml(stats.overflow.length)} OVERFLOW</span>
        </header>
        <div class="housing-shipment-list is-compact">
          ${tracked.map((shipment) => renderHousingShipmentRow(orderByShipmentId.get(shipment.id) || {}, shipment, citizen)).join("")}
        </div>
      </section>
    `;
  }

  function renderHousingModule(user = window.WS_APP.currentUser) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    if (!container) return;

    const citizen = getHousingTargetCitizen(user);
    if (status) status.textContent = "HOUSING / ACTIVE";

    if (!citizen) {
      container.innerHTML = `
        <section class="module-detail housing-module-view">
          <div class="module-detail-head">
            <div>
              <p class="kicker">TERMINAL / HOUSING</p>
              <h4>Housing</h4>
            </div>
            <button class="module-back-button" type="button">Back</button>
          </div>
          <p class="file-empty">No citizen profile is linked to this housing session.</p>
        </section>
      `;
      window.WS_APP.bindModuleBackButton?.(user, () => window.WS_APP.renderModules?.(user));
      return;
    }

    const records = getCitizenHousingRecords(citizen);
    const activeTab = getHousingActiveTab(citizen.id);

    container.innerHTML = `
      <section class="module-detail housing-module-view" data-housing-module data-housing-citizen-id="${escapeHtml(citizen.id)}">
        <div class="module-detail-head">
          <div>
            <p class="kicker">TERMINAL / HOUSING</p>
            <h4>Housing</h4>
          </div>
          <button class="module-back-button" type="button">Back</button>
        </div>
        ${renderHousingSession(user, citizen)}
        ${renderHousingTargetSwitcher(user, citizen.id)}
        ${renderHousingModuleSummary(citizen, records)}
        ${renderHousingTabs(citizen, records)}
        <div class="housing-module-unit">
          ${activeTab === "HOUSEHOLD"
            ? renderHousingHouseholdTab(citizen)
            : activeTab === "STORAGE"
              ? renderHousingStorageTab(citizen)
              : activeTab === "MARKET"
                ? renderHousingMarketWorkspace(citizen, user)
                : renderHousingUnitTab(citizen)}
        </div>
      </section>
    `;

    window.WS_APP.bindModuleBackButton?.(user, () => handleHousingModuleBack(user, citizen.id));
    bindHousingModuleActions(user);
    housingMarketRuntime?.syncHousingMarketModalState?.(document.querySelector("[data-housing-module]"), citizen.id, { focus: true });
  }

  function bindHousingModuleActions(user = window.WS_APP.currentUser) {
    const root = document.querySelector("[data-housing-module]");
    if (!root) return;
    const citizenId = String(root.getAttribute("data-housing-citizen-id") || "").trim();

    root.addEventListener("pointerdown", (event) => beginHousingGridDrag(event, root, citizenId, user));
    root.addEventListener("pointermove", (event) => handleHousingHouseholdPointerMove(event, { root, citizenId, user }));
    root.addEventListener("pointerleave", (event) => handleHousingHouseholdPointerLeave(event, { root, citizenId, user }));

    root.querySelector("[data-housing-target-citizen]")?.addEventListener("change", (event) => {
      resetHousingMarketTransientState(root, citizenId);
      window.WS_APP.housingTargetCitizenId = String(event.target.value || "").trim();
      renderHousingModule(user);
    });

    root.addEventListener("change", (event) => {
      const storageField = event.target.closest?.("[data-housing-storage-filter-field]");
      if (storageField) {
        const key = String(storageField.getAttribute("data-housing-storage-filter-field") || "").trim();
        if (!key) return;
        setHousingStorageFilters(citizenId, { [key]: String(storageField.value || "") });
        setHousingSelectedStorageItemId(citizenId, "");
        setHousingActiveTab(citizenId, "STORAGE");
        setHousingFeedback(citizenId, "");
        renderHousingModule(user);
        return;
      }

      const activeStorageUnit = event.target.closest?.("[data-housing-active-storage-unit]");
      if (activeStorageUnit) {
        setHousingSelectedStorageUnitId(citizenId, String(activeStorageUnit.value || ""));
        setHousingSelectedStorageItemId(citizenId, "");
        setHousingFeedback(citizenId, "");
        renderHousingModule(user);
        return;
      }

      const returnContainerSelect = event.target.closest?.("[data-housing-return-container-select]");
      if (returnContainerSelect) {
        setHousingReturnContainerId(citizenId, String(returnContainerSelect.value || ""));
        renderHousingModule(user);
        return;
      }
      if (handleHousingHouseholdChange(event, { root, citizenId, user })) return;
      delegateHousingMarketEvent("handleHousingMarketChange", event, { root, citizenId, user });
    });

    root.addEventListener("input", (event) => {

      const storageField = event.target.closest?.('[data-housing-storage-filter-field="search"]');
      if (storageField) {
        window.clearTimeout(window.WS_APP.housingStorageSearchDebounce);
        window.WS_APP.housingStorageSearchDebounce = window.setTimeout(() => {
          setHousingStorageFilters(citizenId, { search: String(storageField.value || "") });
          setHousingSelectedStorageItemId(citizenId, "");
          setHousingActiveTab(citizenId, "STORAGE");
          setHousingFeedback(citizenId, "");
          renderHousingModule(user);
        }, 180);
        return;
      }
      if (handleHousingHouseholdInput(event, { root, citizenId, user })) return;
      delegateHousingMarketEvent("handleHousingMarketInput", event, { root, citizenId, user });
    });

    root.addEventListener("keydown", (event) => {
      delegateHousingMarketEvent("handleHousingMarketKeydown", event, { root, citizenId, user });
    });

    root.addEventListener("click", (event) => {
      if (Date.now() < Number(window.WS_APP.housingSuppressClickUntil || 0)) {
        event.preventDefault();
        return;
      }
      const tabButton = event.target.closest?.("[data-housing-tab]");
      if (tabButton) {
        const nextTab = String(tabButton.getAttribute("data-housing-tab") || "UNIT").toUpperCase();
        if (nextTab !== "MARKET") resetHousingMarketTransientState(root, citizenId);
        setHousingActiveTab(citizenId, nextTab);
        setHousingFeedback(citizenId, "");
        renderHousingModule(user);
        return;
      }

      if (handleHousingHouseholdClick(event, { root, citizenId, user })) return;

      const unitSelectButton = event.target.closest?.("[data-housing-select-unit]");
      if (unitSelectButton) {
        setHousingActiveRecordId(citizenId, String(unitSelectButton.getAttribute("data-housing-select-unit") || ""));
        setHousingActiveTab(citizenId, "UNIT");
        setHousingFeedback(citizenId, "");
        renderHousingModule(user);
        return;
      }

      const recordButton = event.target.closest?.("[data-housing-record-id]");
      if (recordButton) {
        setHousingActiveRecordId(citizenId, String(recordButton.getAttribute("data-housing-record-id") || ""));
        setHousingSelectedStorageUnitId(citizenId, "");
        setHousingActiveTab(citizenId, "STORAGE");
        setHousingFeedback(citizenId, "");
        renderHousingModule(user);
        return;
      }

      const storageKindButton = event.target.closest?.("[data-housing-storage-kind]");
      if (storageKindButton) {
        setHousingStorageFilters(citizenId, { kind: String(storageKindButton.getAttribute("data-housing-storage-kind") || "ALL") });
        setHousingSelectedStorageItemId(citizenId, "");
        setHousingActiveTab(citizenId, "STORAGE");
        setHousingFeedback(citizenId, "");
        renderHousingModule(user);
        return;
      }

      const storageSelectButton = event.target.closest?.("[data-housing-storage-select-item]");
      if (storageSelectButton) {
        setHousingSelectedStorageItemId(citizenId, String(storageSelectButton.getAttribute("data-housing-storage-select-item") || ""));
        setHousingActiveTab(citizenId, "STORAGE");
        setHousingFeedback(citizenId, "");
        renderHousingModule(user);
        return;
      }

      const toggleContainerGridButton = event.target.closest?.("[data-housing-toggle-container-grid]");
      if (toggleContainerGridButton) {
        const containerId = String(toggleContainerGridButton.getAttribute("data-housing-toggle-container-grid") || "").trim();
        setHousingOpenContainerId(citizenId, getHousingOpenContainerId(citizenId) === containerId ? "" : containerId);
        setHousingOpenContainerSelectedItemId(citizenId, "");
        setHousingFeedback(citizenId, "");
        renderHousingModule(user);
        return;
      }

      const openContainerItemButton = event.target.closest?.("[data-housing-open-container-select-item]");
      if (openContainerItemButton) {
        setHousingOpenContainerSelectedItemId(citizenId, String(openContainerItemButton.getAttribute("data-housing-open-container-select-item") || ""));
        setHousingFeedback(citizenId, "");
        renderHousingModule(user);
        return;
      }

      const containerItemToStorageButton = event.target.closest?.("[data-housing-container-item-to-storage]");
      if (containerItemToStorageButton) {
        moveOpenContainerItemToHousing(
          citizenId,
          String(containerItemToStorageButton.getAttribute("data-housing-container-item-to-storage") || ""),
          String(containerItemToStorageButton.getAttribute("data-housing-storage-unit-id") || DEFAULT_STORAGE_UNIT_ID),
          user
        );
        return;
      }

      const moveToOpenContainerButton = event.target.closest?.("[data-housing-move-item-to-open-container]");
      if (moveToOpenContainerButton) {
        moveHousingItemIntoOpenContainer(
          citizenId,
          String(moveToOpenContainerButton.getAttribute("data-housing-move-item-to-open-container") || ""),
          String(moveToOpenContainerButton.getAttribute("data-housing-open-container-id") || ""),
          user
        );
        return;
      }

      const storageResetButton = event.target.closest?.("[data-housing-storage-reset-filters]");
      if (storageResetButton) {
        resetHousingStorageFilters(citizenId);
        setHousingSelectedStorageItemId(citizenId, "");
        setHousingActiveTab(citizenId, "STORAGE");
        setHousingFeedback(citizenId, "");
        renderHousingModule(user);
        return;
      }

      if (delegateHousingMarketEvent("handleHousingMarketClick", event, { root, citizenId, user })) return;

      const storeButton = event.target.closest?.("[data-housing-store-item]");
      if (storeButton) {
        storeEquipmentItemInHousing(
          citizenId,
          String(storeButton.getAttribute("data-housing-store-item") || ""),
          String(storeButton.getAttribute("data-housing-storage-unit-id") || DEFAULT_STORAGE_UNIT_ID),
          user
        );
        return;
      }

      const returnButton = event.target.closest?.("[data-housing-return-item]");
      if (returnButton) {
        returnHousingItemToContainer(
          citizenId,
          String(returnButton.getAttribute("data-housing-return-item") || ""),
          String(returnButton.getAttribute("data-housing-return-container-id") || ""),
          user
        );
        return;
      }

      const moveStorageButton = event.target.closest?.("[data-housing-move-storage-item]");
      if (moveStorageButton) {
        const targetSelect = root.querySelector("[data-housing-target-storage-unit]");
        moveHousingItemToStorageUnit(
          citizenId,
          String(moveStorageButton.getAttribute("data-housing-move-storage-item") || ""),
          String(targetSelect?.value || ""),
          user
        );
        return;
      }

      const sortButton = event.target.closest?.("[data-housing-sort-storage]");
      if (sortButton) {
        autoSortHousingStorage(citizenId, String(sortButton.getAttribute("data-housing-storage-unit-id") || DEFAULT_STORAGE_UNIT_ID), user);
      }
    });
  }

  function getHousingModuleMetric(user = window.WS_APP.currentUser) {
    const citizens = getHousingCitizens(user);
    let records = 0;
    let slots = 0;
    citizens.forEach((citizen) => {
      const housingRecords = getCitizenHousingRecords(citizen);
      records += housingRecords.length;
      slots += housingRecords.reduce((sum, record) => sum + getHousingStorageUnitCapacity(record), 0);
    });
    return { label: `${records} RECORD${records === 1 ? "" : "S"} / ${slots} SLOTS`, empty: false };
  }

  window.addEventListener("ws:household-layout-updated", (event) => {
    const root = document.querySelector("[data-housing-module]");
    if (!root) return;
    const citizenId = String(root.getAttribute("data-housing-citizen-id") || "").trim();
    if (!event?.detail?.citizenId || event.detail.citizenId === citizenId) renderHousingModule(window.WS_APP.currentUser);
  });

  window.addEventListener("ws:campaign-date-updated", () => {
    void ensureHousingMarketRuntime(window.WS_APP.currentUser).then((runtime) => {
      runtime.processDueHousingMarketShipments({ nowIso: getCampaignDateIso() });
      if (document.querySelector("[data-housing-module]")) renderHousingModule(window.WS_APP.currentUser);
    }).catch((error) => console.error("Housing shipment scheduler could not load Market runtime.", error));
  });

  window.WS_APP.ensureHousingMarketRuntime = ensureHousingMarketRuntime;
  window.WS_APP.processDueHousingMarketShipments = (...args) => (
    housingMarketRuntime
      ? housingMarketRuntime.processDueHousingMarketShipments(...args)
      : ensureHousingMarketRuntime(window.WS_APP.currentUser).then((runtime) => runtime.processDueHousingMarketShipments(...args))
  );
  window.WS_APP.processDueHousingMarketShipmentsForCitizen = (...args) => (
    housingMarketRuntime
      ? housingMarketRuntime.processDueHousingMarketShipmentsForCitizen(...args)
      : ensureHousingMarketRuntime(window.WS_APP.currentUser).then((runtime) => runtime.processDueHousingMarketShipmentsForCitizen(...args))
  );
  window.WS_APP.renderHousingModule = renderHousingModule;
  window.WS_APP.getHousingModuleMetric = getHousingModuleMetric;
})();
