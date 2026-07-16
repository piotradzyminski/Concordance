window.WS_APP = window.WS_APP || {};

(function initHousingModule() {
  const HOUSING_STORAGE_WIDTH = 4;
  const HOUSING_STORAGE_LOCATION = "HOUSING_STORAGE";
  const DEFAULT_STORAGE_UNIT_ID = "housing-storage-main";
  const HOUSING_DELIVERY_DEFAULT_DAYS = 1;
  const HOUSING_SHIPMENT_CLOSED_STATUSES = new Set(["DELIVERED", "FAILED", "CANCELLED", "RETURNED"]);
  const HOUSING_STORAGE_KINDS = ["ALL", "COLLECTIBLE", "IMPORTANT", "SECURE", "ARCHIVE", "WEAPON", "ARMOR", "MEDICAL", "TOOLS", "CONTAINER", "DOCUMENT", "CYBERWARE_PACKAGE", "MISC"];
  const HOUSING_STORAGE_STATUSES = ["ALL", "AVAILABLE", "STORED", "OVERFLOW"];
  const HOUSING_STORAGE_SORTS = ["CATEGORY", "NAME", "SIZE_DESC", "SIZE_ASC", "STATUS", "VALUE_DESC", "VALUE_ASC"];
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

  function escapeSelectorValue(value = "") {
    const token = String(value || "");
    return window.CSS?.escape ? window.CSS.escape(token) : token.replace(/(["\\])/g, "\\$1");
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

  const HOUSING_PRIMARY_TABS = ["OVERVIEW", "HOUSEHOLD", "STORAGE", "DELIVERIES"];

  function normalizeHousingActiveTab(tab = "OVERVIEW") {
    const token = String(tab || "OVERVIEW").trim().toUpperCase();
    if (["UNIT", "HISTORY"].includes(token)) return "OVERVIEW";
    if (token === "COLLECTION") return "STORAGE";
    return HOUSING_PRIMARY_TABS.includes(token) ? token : "OVERVIEW";
  }

  function getHousingActiveTab(citizenId = "") {
    window.WS_APP.housingActiveTabByCitizen = window.WS_APP.housingActiveTabByCitizen || {};
    const tab = normalizeHousingActiveTab(window.WS_APP.housingActiveTabByCitizen[citizenId] || "OVERVIEW");
    window.WS_APP.housingActiveTabByCitizen[citizenId] = tab;
    return tab;
  }

  function setHousingActiveTab(citizenId = "", tab = "OVERVIEW") {
    window.WS_APP.housingActiveTabByCitizen = window.WS_APP.housingActiveTabByCitizen || {};
    window.WS_APP.housingActiveTabByCitizen[citizenId] = normalizeHousingActiveTab(tab);
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
    getHousingItemIndexOpen,
    setHousingItemIndexOpen,
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
    renderHousingItemIndexDrawer,
    locateHousingItemIndexEntry,
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
    setWorkspaceState,
    renderHousingHouseholdTab,
    handleHousingHouseholdPointerMove,
    handleHousingHouseholdPointerLeave,
    handleHousingHouseholdInput,
    handleHousingHouseholdChange,
    handleHousingHouseholdClick
  } = housingHouseholdRuntime;


  function handleHousingModuleBack(user = window.WS_APP.currentUser) {
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
    const raw = String(iso || "").trim();
    const source = isIsoDate(raw) ? `${raw}T00:00:00.000Z` : raw;
    const parsed = Date.parse(source);
    if (!Number.isFinite(parsed)) {
      const fallback = getCampaignDateIso();
      const match = fallback.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return match ? `${match[3]}.${match[2]}.${match[1]}` : fallback;
    }
    const normalized = new Date(parsed).toISOString();
    const label = `${normalized.slice(8, 10)}.${normalized.slice(5, 7)}.${normalized.slice(0, 4)}`;
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? label : `${label} / ${normalized.slice(11, 16)}`;
  }

  function normalizeShipmentStatus(value = "IN_TRANSIT") {
    const status = String(value || "IN_TRANSIT").trim().toUpperCase();
    return status || "IN_TRANSIT";
  }

  function getCitizenMarketOrders(citizen = {}) {
    const citizenId = String(citizen?.id || "").trim();
    const canonical = typeof window.WS_APP.getCitizenMarketOrders === "function"
      ? window.WS_APP.getCitizenMarketOrders(citizenId)
      : [];
    const legacy = Array.isArray(citizen.marketOrders) ? citizen.marketOrders.filter(Boolean) : [];
    const merged = new Map();
    [...canonical, ...legacy].forEach((order, index) => {
      const normalized = normalizeMarketOrder(order, index);
      merged.set(normalized.id, normalized);
    });
    return [...merged.values()];
  }

  function getCitizenShipments(citizen = {}) {
    const citizenId = String(citizen?.id || "").trim();
    const canonical = typeof window.WS_APP.getMarketShipments === "function"
      ? window.WS_APP.getMarketShipments().filter((shipment) => String(shipment?.citizenId || "").trim() === citizenId)
      : [];
    const legacy = Array.isArray(citizen.shipments) ? citizen.shipments.filter(Boolean) : [];
    const merged = new Map();
    [...canonical, ...legacy].forEach((shipment, index) => {
      const normalized = normalizeShipment(shipment, index);
      merged.set(normalized.id, normalized);
    });
    return [...merged.values()];
  }

  function normalizeMarketOrder(order = {}, index = 0) {
    const source = order && typeof order === "object" && !Array.isArray(order) ? order : {};
    return {
      ...source,
      id: String(source.id || source.marketOrderId || `order-${index + 1}`).trim(),
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
      etaIso: isIsoDate(source.etaIso) ? source.etaIso : addDaysIso(getCampaignDateIso(), HOUSING_DELIVERY_DEFAULT_DAYS),
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
      id: String(source.id || source.shipmentId || `ship-${index + 1}`).trim(),
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
      etaIso: isIsoDate(source.etaIso) ? source.etaIso : addDaysIso(getCampaignDateIso(), HOUSING_DELIVERY_DEFAULT_DAYS),
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
    const transition = record.rentTransition && typeof record.rentTransition === "object" ? record.rentTransition : null;
    const transitionTarget = transition?.targetUnit || null;
    const transferCount = Number(transition?.transferManifest?.instanceIds?.length || 0);
    const standardLabel = [record.standardCode, record.standardTierId].filter(Boolean).join(" / ") || record.type;
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
          <div><dt>Standard</dt><dd>${escapeHtml(standardLabel)}</dd></div>
          <div><dt>Occupancy</dt><dd>${escapeHtml(record.occupancyStatus || record.status)}</dd></div>
          <div><dt>Visible Address</dt><dd>${escapeHtml(record.visibleAddress || "UNASSIGNED")}</dd></div>
          <div><dt>Access</dt><dd>${escapeHtml(record.accessLevel)}</dd></div>
          <div><dt>Security</dt><dd>${escapeHtml(record.securityLevel)}</dd></div>
          <div><dt>Privacy</dt><dd>${escapeHtml(record.privacyLevel)}</dd></div>
          <div><dt>Storage</dt><dd>${escapeHtml(storageSlots ? `${storageSlots} SLOTS` : "NONE")}</dd></div>
        </dl>
        ${transition ? `
          <div class="housing-record-transition" data-housing-rent-transition="${escapeHtml(transition.transitionId || "pending")}">
            <b>${escapeHtml(String(transition.type || "RENT TRANSITION").replace(/_/g, " "))}</b>
            <small>${escapeHtml(transitionTarget ? `${transitionTarget.standardCode || "?"} / ${transitionTarget.standardTierId || "?"} / ${transitionTarget.areaM2 ?? "?"} m²` : "UNIT RELEASE")}</small>
            <small>${escapeHtml(`${transferCount} ITEM${transferCount === 1 ? "" : "S"} REQUIRE TRANSFER`)}</small>
            ${String(transition.type || "").toUpperCase() === "RELOCATION_REQUIRED" && String(transition.status || "PREPARED").toUpperCase() === "PREPARED" ? `
              <div class="housing-record-transition-actions">
                <button class="housing-inline-action is-primary" type="button" data-housing-approve-relocation="${escapeHtml(record.linkedSubscriptionId || "")}">APPROVE</button>
                <button class="housing-inline-action" type="button" data-housing-cancel-relocation="${escapeHtml(record.linkedSubscriptionId || "")}">CANCEL</button>
              </div>
            ` : ""}
          </div>
        ` : ""}
        <div class="housing-record-actions">
          <button class="housing-inline-action" type="button" data-housing-select-unit="${escapeHtml(record.id)}">${isActive ? "ACTIVE UNIT" : "SET ACTIVE"}</button>
          <button class="housing-inline-action" type="button" data-housing-open-storage-record="${escapeHtml(record.id)}">STORAGE</button>
        </div>
      </article>
    `;
  }

  function renderHousingTabs(citizen = {}, records = []) {
    const active = getHousingActiveTab(citizen.id);
    const storageSlots = records.reduce((sum, record) => sum + record.storageUnits.reduce((unitSum, unit) => unitSum + unit.slotCapacity, 0), 0);
    const activeShipments = getCitizenShipments(citizen).filter((shipment) => !isHousingShipmentClosed(shipment, {}));
    const collection = window.WS_APP.getHousingCollectionItems?.(citizen.id, getHousingActiveRecordId(citizen.id, records)) || [];
    const tab = (id, title, description) => `
      <button class="housing-module-tab system-segment-tile system-segment-tile--card ${active === id ? "is-active" : ""}" type="button" role="tab" aria-selected="${active === id ? "true" : "false"}" data-housing-tab="${id}">
        <span class="system-segment-tile__body"><b class="system-segment-tile__title">${title}</b><small class="system-segment-tile__description">${description}</small></span>
      </button>`;
    return `
      <div class="housing-module-tabs system-segment-tabs housing-module-tabs--hub" role="tablist" aria-label="Housing Sections">
        ${tab("OVERVIEW", "OVERVIEW", `UNIT / FEED / ${escapeHtml(records.length)} RECORD${records.length === 1 ? "" : "S"}`)}
        ${tab("HOUSEHOLD", "HOUSEHOLD", `FURNISHING / DISPLAY / ${escapeHtml(collection.length)} ITEMS`)}
        ${tab("STORAGE", "STORAGE", `GRID / ITEM INDEX / ${escapeHtml(storageSlots)} CELLS`)}
        ${tab("DELIVERIES", "DELIVERIES", `INBOUND / ${escapeHtml(activeShipments.length)} ACTIVE`)}
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
    const marketOrderId = String(order.marketOrderId || order.id || shipment.orderId || "").trim();
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
          ${canOpenStorage ? `<button class="housing-inline-action" type="button" data-housing-open-storage-record="${escapeHtml(context.record.id)}">STORAGE</button>` : ""}
          ${marketOrderId ? `<button class="housing-inline-action" type="button" data-housing-open-market-order="${escapeHtml(marketOrderId)}">ORDER</button>` : ""}
          <span class="module-status-badge">${escapeHtml(formatCredits(order.price || 0))}</span>
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

  function renderHousingDeliveriesTab(citizen = {}) {
    const records = getCitizenHousingRecords(citizen);
    const activeRecord = getHousingActiveRecord(citizen, records);
    const shipments = getCitizenShipments(citizen);
    const orders = getCitizenMarketOrders(citizen);
    const orderByShipmentId = new Map(orders.map((order) => [order.shipmentId, order]));
    const active = shipments.filter((shipment) => !isHousingShipmentClosed(shipment, orderByShipmentId.get(shipment.id) || {}));
    const history = shipments.filter((shipment) => isHousingShipmentClosed(shipment, orderByShipmentId.get(shipment.id) || {}));
    const held = active.filter((shipment) => getHousingShipmentState(shipment, orderByShipmentId.get(shipment.id) || {}) === "HELD");
    return `
      <div class="housing-deliveries-tab">
        ${renderHousingFeedback(citizen.id)}
        <section class="housing-module-panel">
          <header class="housing-module-panel-head">
            <div>
              <p class="kicker">HOUSING / DELIVERIES</p>
              <h5>${escapeHtml(activeRecord?.title || "No Active Unit")}</h5>
              <small>Read-only logistics projection. Shopping, checkout and order recovery remain in the global Market module.</small>
            </div>
            <button class="housing-inline-action" type="button" data-housing-open-market>MARKET</button>
          </header>
          <div class="housing-summary-unit housing-shipment-summary">
            ${renderHousingMetric("ACTIVE", active.length)}
            ${renderHousingMetric("HELD", held.length)}
            ${renderHousingMetric("HISTORY", history.length)}
            ${renderHousingMetric("TARGET", activeRecord?.visibleAddress || "UNASSIGNED")}
          </div>
        </section>
        <section class="housing-module-panel housing-shipment-panel">
          <header class="housing-module-panel-head">
            <div><p class="kicker">INBOUND QUEUE</p><h5>Active and held shipments</h5></div>
            <span class="module-status-badge">${escapeHtml(active.length)} ACTIVE</span>
          </header>
          <div class="housing-shipment-list">
            ${active.length
              ? active.map((shipment) => renderHousingShipmentRow(orderByShipmentId.get(shipment.id) || {}, shipment, citizen)).join("")
              : '<p class="housing-storage-note">No active deliveries for this citizen.</p>'}
          </div>
        </section>
        <section class="housing-module-panel housing-shipment-panel">
          <header class="housing-module-panel-head">
            <div><p class="kicker">DELIVERY HISTORY</p><h5>Recent completed or closed shipments</h5></div>
            <span class="module-status-badge">${escapeHtml(history.length)} RECORDS</span>
          </header>
          <div class="housing-shipment-list is-compact">
            ${history.length
              ? history.slice().reverse().slice(0, 12).map((shipment) => renderHousingShipmentRow(orderByShipmentId.get(shipment.id) || {}, shipment, citizen)).join("")
              : '<p class="housing-storage-note">No delivery history.</p>'}
          </div>
        </section>
      </div>
    `;
  }

  function formatHubTime(value = "") {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return value || "UNAVAILABLE";
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date).replace(",", " /");
  }

  function renderHousingOverviewTab(citizen = {}) {
    const record = getHousingActiveRecord(citizen);
    const overview = window.WS_APP.getHousingHouseholdHubOverview?.(citizen.id, record?.id) || null;
    if (!overview) return '<section class="housing-module-panel"><p class="file-empty">Household Hub projection is unavailable.</p></section>';
    const current = overview.weather?.current || {};
    const forecast = overview.weather?.forecast || [];
    return `
      <div class="housing-hub-overview">
        ${renderHousingFeedback(citizen.id)}
        <section class="housing-module-panel housing-hub-command-panel">
          <header class="housing-module-panel-head"><div><p class="kicker">PERSONAL HOUSING HUB</p><h5>${escapeHtml(record?.title || "Unassigned Housing")}</h5></div><span class="module-status-badge">${escapeHtml(overview.unitStatus)}</span></header>
          <div class="housing-hub-clock"><small>CAMPAIGN TIME</small><b>${escapeHtml(formatHubTime(overview.campaignTimeIso))}</b><span>${escapeHtml(overview.visibleAddress)}</span></div>
          <div class="housing-summary-unit">
            ${renderHousingMetric("RENT", overview.rentStatus)}
            ${renderHousingMetric("COLLECTION", overview.collectionCount)}
            ${renderHousingMetric("IMPORTANT", overview.importantItemCount)}
            ${renderHousingMetric("DISPLAY", `${overview.displayUsed}/${overview.displayCapacity}`)}
            ${renderHousingMetric("UNREAD", overview.unreadTerminalCount)}
          </div>
          <div class="housing-hub-quick-actions housing-action-rail">
            <button class="housing-inline-action is-primary" type="button" data-housing-open-collection>COLLECTION</button>
            <button class="housing-inline-action" type="button" data-housing-open-terminal>TERMINAL</button>
            <button class="housing-inline-action" type="button" data-housing-open-market>MARKET</button>
          </div>
        </section>
        <section class="housing-module-panel housing-hub-weather">
          <header class="housing-module-panel-head"><div><p class="kicker">GLOBAL WEATHER FEED</p><h5>${escapeHtml(current.label || "Unavailable")}</h5></div><span class="module-status-badge">${escapeHtml(current.exteriorRisk || "UNKNOWN")}</span></header>
          <div class="housing-hub-weather-current">
            <strong>${escapeHtml(current.temperatureC ?? "—")}°C</strong>
            <div><span>VISIBILITY <b>${escapeHtml(current.visibilityPercent ?? "—")}%</b></span><span>AIR <b>${escapeHtml(current.airQuality || "—")}</b></span><span>PRECIPITATION <b>${escapeHtml(current.precipitation || "—")}</b></span></div>
            <p>${escapeHtml(current.note || "No environmental advisory.")}</p>
          </div>
          <div class="housing-hub-forecast">${forecast.map((entry) => `<span><small>${escapeHtml(formatHubTime(entry.validFrom))}</small><b>${escapeHtml(entry.label)}</b><em>${escapeHtml(entry.temperatureC)}°C / ${escapeHtml(entry.visibilityPercent)}%</em></span>`).join("")}</div>
        </section>
        <section class="housing-module-panel housing-hub-feed">
          <header class="housing-module-panel-head"><div><p class="kicker">WORLD / TERMINAL FEED</p><h5>Current signals</h5></div></header>
          <div class="housing-hub-feed-list">${(overview.worldFeed || []).map((entry) => `<article class="housing-hub-feed-entry ${entry.important ? "is-important" : ""} ${entry.unread ? "is-unread" : ""}"><span>${escapeHtml(entry.category || entry.source || "FEED")}</span><b>${escapeHtml(entry.title || "Signal")}</b><p>${escapeHtml(entry.body || "")}</p><small>${escapeHtml(formatHubTime(entry.timestamp))}</small></article>`).join("") || '<p class="file-empty">No current signals.</p>'}</div>
        </section>
      </div>
    `;
  }

  function getHousingCollectionRenderContext(citizen = {}) {
    const record = getHousingActiveRecord(citizen);
    if (!record) return { record: null, collection: [], hosts: [], candidates: [], candidateOptions: "" };
    const collection = window.WS_APP.getHousingCollectionItems?.(citizen.id, record.id) || [];
    const hosts = window.WS_APP.getHousingDisplayHosts?.(citizen.id, record.id) || [];
    const candidates = window.WS_APP.getHousingDisplayCandidates?.(citizen.id) || [];
    const candidateOptions = candidates.map((item) => `<option value="${escapeHtml(item.instanceId)}">${escapeHtml(item.playerLabel || item.instanceData?.name || item.definitionId)}</option>`).join("");
    return { record, collection, hosts, candidates, candidateOptions };
  }

  function renderHousingCollectionStoragePanel(citizen = {}) {
    const { record, collection } = getHousingCollectionRenderContext(citizen);
    if (!record) return '<section class="housing-module-panel"><p class="file-empty">Collection requires an active Housing Unit.</p></section>';
    return `
      <section class="housing-module-panel housing-hub-collection-storage">
        <header class="housing-module-panel-head"><div><p class="kicker">STORAGE / COLLECTION</p><h5>Collectibles and important items</h5></div><span class="module-status-badge">${escapeHtml(collection.length)} ITEMS</span></header>
        <p class="housing-hub-note">Collection remains a projection of canonical ItemInstances. Use Item Index filters to locate collectible, important, secure and archival records.</p>
        <div class="housing-hub-collection-list system-scroll-surface" data-system-scroll>${collection.map((entry) => `<article class="housing-hub-collection-item ${entry.important ? "is-important" : ""}"><div><span>${escapeHtml(entry.category)}</span><b>${escapeHtml(entry.label)}</b><small>${escapeHtml(entry.displayed ? "DISPLAYED" : entry.storageProtection)}</small></div><p>${escapeHtml(entry.note || entry.provenance || "No collection note.")}</p><div class="housing-hub-item-actions housing-action-rail"><button class="housing-inline-action ${entry.important ? "is-primary" : ""}" type="button" data-housing-toggle-important="${escapeHtml(entry.instance.instanceId)}" data-housing-important-next="${entry.important ? "false" : "true"}">${entry.important ? "UNMARK" : "IMPORTANT"}</button>${entry.displayed ? `<button class="housing-inline-action" type="button" data-housing-remove-display="${escapeHtml(entry.instance.instanceId)}">RETURN</button>` : ""}</div></article>`).join("") || '<p class="file-empty">No collectibles or important items are registered.</p>'}</div>
      </section>
    `;
  }

  function renderHousingDisplaySurfacesPanel(citizen = {}) {
    const { record, hosts, candidateOptions } = getHousingCollectionRenderContext(citizen);
    if (!record) return "";
    return `
      <section class="housing-module-panel housing-hub-display-panel">
        <header class="housing-module-panel-head"><div><p class="kicker">HOUSEHOLD / DISPLAY</p><h5>Exhibition slots</h5></div><span class="module-status-badge">${escapeHtml(hosts.length)} HOSTS</span></header>
        <div class="housing-hub-display-hosts system-scroll-surface" data-system-scroll>${hosts.map((host) => `<article class="housing-hub-display-host"><header><b>${escapeHtml(host.label)}</b><small>${escapeHtml(host.slots.filter((slot) => slot.item).length)}/${escapeHtml(host.slots.length)} OCCUPIED</small></header><div>${host.slots.map((slot) => slot.item ? `<span class="housing-hub-display-slot is-filled"><small>${escapeHtml(slot.slotId)}</small><b>${escapeHtml(slot.item.playerLabel || slot.item.instanceData?.name || slot.item.definitionId)}</b><button class="housing-inline-action" type="button" data-housing-remove-display="${escapeHtml(slot.item.instanceId)}">REMOVE</button></span>` : `<span class="housing-hub-display-slot"><small>${escapeHtml(slot.slotId)}</small>${candidateOptions ? `<select data-housing-display-candidate><option value="">SELECT ITEM</option>${candidateOptions}</select><button class="housing-inline-action" type="button" data-housing-display-item data-host-instance-id="${escapeHtml(host.instance.instanceId)}" data-display-slot-id="${escapeHtml(slot.slotId)}">DISPLAY</button>` : '<em>NO DISPLAYABLE ITEM IN STORAGE</em>'}</span>`).join("")}</div></article>`).join("") || '<p class="file-empty">Place display furniture or install a Display Rail module to expose display slots.</p>'}</div>
      </section>
    `;
  }

  function renderHousingCollectionTab(citizen = {}) {
    return `<div class="housing-hub-collection">${renderHousingCollectionStoragePanel(citizen)}${renderHousingDisplaySurfacesPanel(citizen)}</div>`;
  }

  function renderHousingHistoryTab(citizen = {}) {
    const record = getHousingActiveRecord(citizen);
    const history = window.WS_APP.getHousingHouseholdHistory?.(citizen.id, record?.id) || [];
    return `<section class="housing-module-panel housing-hub-history"><header class="housing-module-panel-head"><div><p class="kicker">HOUSEHOLD HISTORY</p><h5>Canonical Housing and ItemInstance activity</h5></div><span class="module-status-badge">${escapeHtml(history.length)} EVENTS</span></header><div class="housing-hub-history-list">${history.map((entry) => `<article><span>${escapeHtml(entry.type)}</span><b>${escapeHtml(entry.status)}</b><small>${escapeHtml(formatHubTime(entry.at))}</small><p>${escapeHtml(entry.detail || "")}</p></article>`).join("") || '<p class="file-empty">No Household activity has been committed yet.</p>'}</div></section>`;
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
          ${activeTab === "OVERVIEW"
            ? `<div class="housing-overview-consolidated">${renderHousingOverviewTab(citizen)}${renderHousingUnitTab(citizen)}${renderHousingHistoryTab(citizen)}</div>`
            : activeTab === "HOUSEHOLD"
              ? `<div class="housing-household-consolidated">${renderHousingHouseholdTab(citizen)}${renderHousingDisplaySurfacesPanel(citizen)}</div>`
              : activeTab === "STORAGE"
                ? `<div class="housing-storage-consolidated">${renderHousingStorageTab(citizen)}${renderHousingCollectionStoragePanel(citizen)}</div>`
                : renderHousingDeliveriesTab(citizen)}
        </div>
      </section>
    `;

    window.WS_APP.bindModuleBackButton?.(user, () => handleHousingModuleBack(user));
    bindHousingModuleActions(user);
  }

  function bindHousingModuleActions(user = window.WS_APP.currentUser) {
    const root = document.querySelector("[data-housing-module]");
    if (!root) return;
    const citizenId = String(root.getAttribute("data-housing-citizen-id") || "").trim();

    root.addEventListener("pointerdown", (event) => beginHousingGridDrag(event, root, citizenId, user));
    root.addEventListener("pointermove", (event) => handleHousingHouseholdPointerMove(event, { root, citizenId, user }));
    root.addEventListener("pointerleave", (event) => handleHousingHouseholdPointerLeave(event, { root, citizenId, user }));

    root.querySelector("[data-housing-target-citizen]")?.addEventListener("change", (event) => {
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
    });

    root.addEventListener("click", (event) => {
      if (Date.now() < Number(window.WS_APP.housingSuppressClickUntil || 0)) {
        event.preventDefault();
        return;
      }
      const tabButton = event.target.closest?.("[data-housing-tab]");
      if (tabButton) {
        const nextTab = String(tabButton.getAttribute("data-housing-tab") || "UNIT").toUpperCase();
        setHousingActiveTab(citizenId, nextTab);
        setHousingFeedback(citizenId, "");
        renderHousingModule(user);
        return;
      }

      if (handleHousingHouseholdClick(event, { root, citizenId, user })) return;

      const openCollectionButton = event.target.closest?.("[data-housing-open-collection]");
      if (openCollectionButton) {
        setHousingStorageFilters(citizenId, { kind: "COLLECTIBLE" });
        setHousingItemIndexOpen(citizenId, true);
        setHousingActiveTab(citizenId, "STORAGE");
        renderHousingModule(user);
        return;
      }

      const openTerminalButton = event.target.closest?.("[data-housing-open-terminal]");
      if (openTerminalButton) {
        window.WS_APP.openModule?.("terminal-hub", user, { citizenId });
        return;
      }

      const importantButton = event.target.closest?.("[data-housing-toggle-important]");
      if (importantButton) {
        const result = window.WS_APP.setHousingItemImportant?.({ citizenId, instanceId: String(importantButton.getAttribute("data-housing-toggle-important") || ""), important: String(importantButton.getAttribute("data-housing-important-next") || "true") === "true" }) || { ok: false, reason: "HOUSEHOLD_HUB_API_UNAVAILABLE" };
        setHousingFeedback(citizenId, result.ok ? "Important-item marker updated." : `Collection update failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "SUCCESS" : "ERROR");
        renderHousingModule(user);
        return;
      }

      const displayButton = event.target.closest?.("[data-housing-display-item]");
      if (displayButton) {
        const slot = displayButton.closest?.(".housing-hub-display-slot");
        const select = slot?.querySelector?.("[data-housing-display-candidate]");
        const instanceId = String(select?.value || "").trim();
        const recordId = getHousingActiveRecordId(citizenId, getCitizenHousingRecords(window.WS_APP.getCitizenById?.(citizenId) || {}));
        const result = instanceId ? window.WS_APP.displayHousingCollectionItem?.({ citizenId, housingRecordId: recordId, instanceId, hostInstanceId: String(displayButton.getAttribute("data-host-instance-id") || ""), slotId: String(displayButton.getAttribute("data-display-slot-id") || "") }) : { ok: false, reason: "HOUSEHOLD_DISPLAY_ITEM_REQUIRED" };
        setHousingFeedback(citizenId, result?.ok ? "Item assigned to the Household display." : `Display failed: ${String(result?.reason || "UNKNOWN").replace(/_/g, " ")}.`, result?.ok ? "SUCCESS" : "ERROR");
        renderHousingModule(user);
        return;
      }

      const removeDisplayButton = event.target.closest?.("[data-housing-remove-display]");
      if (removeDisplayButton) {
        const recordId = getHousingActiveRecordId(citizenId, getCitizenHousingRecords(window.WS_APP.getCitizenById?.(citizenId) || {}));
        const result = window.WS_APP.removeHousingCollectionDisplay?.({ citizenId, housingRecordId: recordId, instanceId: String(removeDisplayButton.getAttribute("data-housing-remove-display") || "") }) || { ok: false, reason: "HOUSEHOLD_HUB_API_UNAVAILABLE" };
        setHousingFeedback(citizenId, result.ok ? "Displayed item returned to Housing Storage." : `Display removal failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "SUCCESS" : "ERROR");
        renderHousingModule(user);
        return;
      }

      const approveRelocationButton = event.target.closest?.("[data-housing-approve-relocation]");
      if (approveRelocationButton) {
        const contractId = String(approveRelocationButton.getAttribute("data-housing-approve-relocation") || "").trim();
        const preview = window.WS_APP.previewHousingRentRelocation?.(contractId) || { ok: false, errorCode: "HOUSING_RELOCATION_RUNTIME_UNAVAILABLE" };
        if (!preview.ok) {
          setHousingFeedback(citizenId, `Relocation blocked: ${String(preview.errorCode || preview.reason || "UNKNOWN").replace(/_/g, " ")}.`, "ERROR");
          renderHousingModule(user);
          return;
        }
        const confirmed = typeof window.confirm !== "function" || window.confirm(`Move ${preview.instanceIds?.length || 0} item(s) to the new Housing Unit? Furnishings will be staged in storage for placement on the new layout.`);
        if (!confirmed) return;
        const result = window.WS_APP.approveHousingRentRelocation?.(contractId) || { ok: false, errorCode: "HOUSING_RELOCATION_RUNTIME_UNAVAILABLE" };
        setHousingFeedback(citizenId, result.ok ? "Relocation completed. The new unit is now primary and transferred furnishings are staged in storage." : `Relocation failed: ${String(result.errorCode || result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "SUCCESS" : "ERROR");
        setHousingActiveTab(citizenId, "UNIT");
        renderHousingModule(user);
        return;
      }

      const cancelRelocationButton = event.target.closest?.("[data-housing-cancel-relocation]");
      if (cancelRelocationButton) {
        const contractId = String(cancelRelocationButton.getAttribute("data-housing-cancel-relocation") || "").trim();
        const confirmed = typeof window.confirm !== "function" || window.confirm("Cancel this prepared move and restore the previous Rent tier?");
        if (!confirmed) return;
        const result = window.WS_APP.cancelHousingRentRelocation?.(contractId) || { ok: false, errorCode: "HOUSING_RELOCATION_RUNTIME_UNAVAILABLE" };
        setHousingFeedback(citizenId, result.ok ? "Prepared relocation cancelled and the previous Rent tier restored." : `Relocation cancellation failed: ${String(result.errorCode || result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "SUCCESS" : "ERROR");
        setHousingActiveTab(citizenId, "UNIT");
        renderHousingModule(user);
        return;
      }

      const openMarketOrderButton = event.target.closest?.("[data-housing-open-market-order]");
      if (openMarketOrderButton) {
        const marketOrderId = String(openMarketOrderButton.getAttribute("data-housing-open-market-order") || "").trim();
        window.WS_APP.openModule?.("market", user, {
          citizenId,
          routeId: "MARKET_ORDER",
          entityRef: marketOrderId ? { type: "MARKET_ORDER", id: marketOrderId } : null,
          params: marketOrderId ? { marketOrderId } : {}
        });
        return;
      }

      const openMarketButton = event.target.closest?.("[data-housing-open-market]");
      if (openMarketButton) {
        window.WS_APP.openModule?.("market", user, {
          citizenId,
          params: { department: "HOUSEHOLD", deliveryHousingId: getHousingActiveRecordId(citizenId, getCitizenHousingRecords(window.WS_APP.getCitizenById?.(citizenId) || {})) }
        });
        return;
      }

      const itemIndexToggle = event.target.closest?.("[data-housing-item-index-toggle]");
      if (itemIndexToggle) {
        setHousingItemIndexOpen(citizenId, true);
        setHousingActiveTab(citizenId, "STORAGE");
        renderHousingModule(user);
        return;
      }

      const itemIndexClose = event.target.closest?.("[data-housing-item-index-close]");
      if (itemIndexClose) {
        setHousingItemIndexOpen(citizenId, false);
        renderHousingModule(user);
        return;
      }

      const itemIndexLocate = event.target.closest?.("[data-housing-item-index-locate]");
      if (itemIndexLocate) {
        const result = locateHousingItemIndexEntry(citizenId, String(itemIndexLocate.getAttribute("data-housing-item-index-locate") || ""), {
          setHousingActiveRecordId,
          setHousingActiveTab,
          setWorkspaceState
        });
        setHousingFeedback(citizenId, result.ok ? "Item located." : `Locate failed: ${String(result.reason || "UNKNOWN").replace(/_/g, " ")}.`, result.ok ? "SUCCESS" : "ERROR");
        setHousingItemIndexOpen(citizenId, false);
        renderHousingModule(user);
        window.requestAnimationFrame?.(() => {
          const target = document.querySelector(`[data-housing-storage-select-item="${escapeSelectorValue(result.itemId || "")}"], [data-household-select-item="${escapeSelectorValue(result.itemId || "")}"], [data-housing-open-container-select-item="${escapeSelectorValue(result.itemId || "")}"]`);
          target?.scrollIntoView?.({ block: "center", inline: "center", behavior: "smooth" });
          target?.classList?.add("is-located");
          window.setTimeout?.(() => target?.classList?.remove("is-located"), 1200);
        });
        return;
      }

      const unitSelectButton = event.target.closest?.("[data-housing-select-unit]");
      if (unitSelectButton) {
        setHousingActiveRecordId(citizenId, String(unitSelectButton.getAttribute("data-housing-select-unit") || ""));
        setHousingActiveTab(citizenId, "UNIT");
        setHousingFeedback(citizenId, "");
        renderHousingModule(user);
        return;
      }

      const recordButton = event.target.closest?.("[data-housing-open-storage-record]");
      if (recordButton) {
        setHousingActiveRecordId(citizenId, String(recordButton.getAttribute("data-housing-open-storage-record") || ""));
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

  const refreshHousingDeliveryProjection = (event) => {
    const root = document.querySelector("[data-housing-module]");
    if (!root) return;
    const citizenId = String(root.getAttribute("data-housing-citizen-id") || "").trim();
    if (!event?.detail?.citizenId || event.detail.citizenId === citizenId) renderHousingModule(window.WS_APP.currentUser);
  };

  window.addEventListener("ws:campaign-time-updated", refreshHousingDeliveryProjection);
  window.addEventListener("ws:campaign-date-updated", refreshHousingDeliveryProjection);
  window.addEventListener("ws:terminal-entries-updated", refreshHousingDeliveryProjection);
  window.addEventListener("ws:item-instances-updated", refreshHousingDeliveryProjection);
  window.addEventListener("ws:market-shipment-updated", refreshHousingDeliveryProjection);
  window.addEventListener("ws:market-shipment-in-transit", refreshHousingDeliveryProjection);
  window.addEventListener("ws:market-shipment-delivered", refreshHousingDeliveryProjection);

  window.WS_APP.renderHousingModule = renderHousingModule;
  window.WS_APP.getHousingModuleMetric = getHousingModuleMetric;
})();
