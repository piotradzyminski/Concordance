window.WS_APP = window.WS_APP || {};

(function initMarketModule() {
  const DEFAULT_STORAGE_UNIT_ID = "housing-storage-main";
  const MARKET_DEFAULT_SHIPPING_DAYS = 1;
  const MARKET_DELIVERABLE_SHIPMENT_STATUSES = new Set(["PENDING", "PAID", "PACKED", "IN_TRANSIT"]);
  const MARKET_SHIPMENT_ACTIVE_STATUSES = new Set(["PENDING", "PAID", "PACKED", "IN_TRANSIT", "HELD"]);
  const MARKET_SHIPMENT_CLOSED_STATUSES = new Set(["DELIVERED", "FAILED", "CANCELLED", "RETURNED"]);
  const MARKET_MODES = ["CATALOG", "ORDERS", "DELIVERED"];
  const MARKET_ORDER_VIEWS = ["ACTIVE", "HISTORY"];
  const MARKET_ORDER_CLOSED_STATUSES = new Set(["COMPLETED", "REFUNDED", "FAILED", "CANCELLED"]);
  const MARKET_PAGE_SIZE = 6;
  const MARKET_DEPARTMENTS = ["ALL", "EQUIPMENT", "CYBERWARE", "MEDICAL", "FOOD", "HOUSEHOLD"];
  const MARKET_PRODUCT_VISUAL_FALLBACKS = Object.freeze({
    EQUIPMENT: "assets/market/fallback/equipment.svg",
    CYBERWARE: "assets/market/fallback/cyberware.svg",
    MEDICAL: "assets/market/fallback/medical.svg",
    FOOD: "assets/market/fallback/food.svg",
    HOUSEHOLD: "assets/market/fallback/household.svg",
    DEFAULT: "assets/market/fallback/product.svg"
  });
  const MARKET_SORTS = ["CATEGORY", "PRICE_ASC", "PRICE_DESC", "TIER_ASC", "TIER_DESC", "ETA_ASC", "ETA_DESC", "MANUFACTURER", "NAME"];
  const MARKET_STATUSES = ["ALL", "BUYABLE", "TOO_EXPENSIVE", "TOO_LARGE", "REQUIRES_SUBSCRIPTION", "NO_STORAGE", "CONTROLLED"];
  const MARKET_VENDOR_DEFAULTS = {
    MEDICAL: { organizationLocationId: "orgloc-trauma-local-medical-supply-n3-a4", vendorId: "vendor-trauma-local-medical" },
    WEAPON: { organizationLocationId: "orgloc-ws-controlled-armory-n3-a4", vendorId: "vendor-ws-controlled-armory" },
    ARMOR: { organizationLocationId: "orgloc-ws-controlled-armory-n3-a4", vendorId: "vendor-ws-controlled-armory" },
    DOCUMENT: { organizationLocationId: "orgloc-system-access-desk-n3-a4", vendorId: "vendor-system-access-desk" },
    CONTAINER: { organizationLocationId: "orgloc-mass-compression-logistics-n3-b12", vendorId: "vendor-mass-compression-logistics" },
    TOOLS: { organizationLocationId: "orgloc-factory-commons-utility-depot-n3-c8", vendorId: "vendor-factory-commons-utility" },
    DEFAULT: { organizationLocationId: "orgloc-habitat-market-fulfillment-n3-b12", vendorId: "vendor-habitat-market" }
  };

  let marketRuntime = null;

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

  function parseCredits(value = 0) {
    if (typeof window.WS_APP.parseCredits === "function") return window.WS_APP.parseCredits(value);
    return window.WS_APP.storeUtils?.parseCreditNumber?.(value) || 0;
  }

  function formatCredits(value = 0) {
    if (typeof window.WS_APP.formatCredits === "function") return window.WS_APP.formatCredits(value);
    return window.WS_APP.storeUtils?.formatCreditLabel?.(value) || "0 ₡";
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

  function getMarketCitizens(user = window.WS_APP.currentUser) {
    const citizens = window.WS_APP.getCitizens?.() || [];
    if (user?.role === "admin") return citizens.filter((citizen) => citizen.recordType !== "admin");
    const citizen = window.WS_APP.getCitizenById?.(user?.citizenId);
    return citizen ? [citizen] : [];
  }

  function getMarketTargetCitizen(user = window.WS_APP.currentUser) {
    const citizens = getMarketCitizens(user);
    if (!citizens.length) return null;
    if (user?.role !== "admin") return citizens[0];
    const currentId = String(window.WS_APP.marketTargetCitizenId || window.WS_APP.currentCitizenCardsSelectedId || window.WS_APP.terminalTargetCitizenId || "").trim();
    const current = currentId ? citizens.find((citizen) => citizen.id === currentId) : null;
    const target = current || citizens[0];
    window.WS_APP.marketTargetCitizenId = target.id;
    return target;
  }

  function getCitizenHousingRecords(citizen = {}) {
    return window.WS_APP.getCitizenHousingRecords?.(citizen) || [];
  }

  function getMarketDeliveryHousingId(citizenId = "", records = []) {
    window.WS_APP.marketDeliveryHousingByCitizen = window.WS_APP.marketDeliveryHousingByCitizen || {};
    const storedId = String(window.WS_APP.marketDeliveryHousingByCitizen[citizenId] || "").trim();
    const record = records.find((entry) => entry.id === storedId) || records[0] || null;
    if (record) window.WS_APP.marketDeliveryHousingByCitizen[citizenId] = record.id;
    return record?.id || "";
  }

  function setMarketDeliveryHousingId(citizenId = "", housingId = "") {
    window.WS_APP.marketDeliveryHousingByCitizen = window.WS_APP.marketDeliveryHousingByCitizen || {};
    window.WS_APP.marketDeliveryHousingByCitizen[citizenId] = String(housingId || "").trim();
  }

  function getHousingPrimaryStorageUnit(record = null, requestedUnitId = "") {
    const units = Array.isArray(record?.storageUnits) ? record.storageUnits.filter(Boolean) : [];
    const requested = String(requestedUnitId || "").trim();
    return units.find((unit) => unit.id === requested)
      || units.find((unit) => unit.id === DEFAULT_STORAGE_UNIT_ID)
      || units[0]
      || null;
  }

  function getHousingActiveStorageTarget(citizen = {}) {
    const records = getCitizenHousingRecords(citizen);
    const activeRecordId = getMarketDeliveryHousingId(citizen.id, records);
    const activeRecord = records.find((record) => record.id === activeRecordId) || records[0] || null;
    const unit = getHousingPrimaryStorageUnit(activeRecord);
    return { records, activeRecord, unit };
  }

  function getCitizenEquipmentItems(citizen = {}) {
    const citizenId = String(citizen?.id || "").trim();
    if (!citizenId) return [];
    if (typeof window.WS_APP.getCitizenEquipmentItemInstanceViews === "function") {
      return window.WS_APP.getCitizenEquipmentItemInstanceViews(citizenId) || [];
    }
    if (typeof window.WS_APP.getCitizenItemInstanceViews === "function") {
      return window.WS_APP.getCitizenItemInstanceViews(citizenId) || [];
    }
    return Array.isArray(citizen.equipment?.items) ? citizen.equipment.items.filter(Boolean) : [];
  }

  function getEquipmentFootprintSize(item = {}) {
    if (typeof window.WS_APP.getEquipmentFootprintSize === "function") {
      return window.WS_APP.getEquipmentFootprintSize(item.footprint || item.size || `${item.width || item.w || 1}x${item.height || item.h || 1}`);
    }
    const value = String(item.footprint || item.size || `${item.width || item.w || 1}x${item.height || item.h || 1}`).toLowerCase();
    const match = value.match(/(\d+)\s*[x×]\s*(\d+)/);
    return {
      width: clampNumber(match?.[1] || item.width || item.w || 1, 1, 99),
      height: clampNumber(match?.[2] || item.height || item.h || 1, 1, 99)
    };
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
      etaIso: isIsoDate(source.etaIso) ? source.etaIso : addDaysIso(getCampaignDateIso(), MARKET_DEFAULT_SHIPPING_DAYS),
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
      etaIso: isIsoDate(source.etaIso) ? source.etaIso : addDaysIso(getCampaignDateIso(), MARKET_DEFAULT_SHIPPING_DAYS),
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

  function getCitizenMarketOrders(citizen = {}) {
    return Array.isArray(citizen.marketOrders)
      ? citizen.marketOrders.filter(Boolean).map((order, index) => normalizeMarketOrder(order, index))
      : [];
  }

  function getCitizenShipments(citizen = {}) {
    return Array.isArray(citizen.shipments)
      ? citizen.shipments.filter(Boolean).map((shipment, index) => normalizeShipment(shipment, index))
      : [];
  }

  function getHousingShipmentUnitContext(citizen = {}, shipment = {}, order = {}) {
    const records = getCitizenHousingRecords(citizen);
    const targetHousingId = String(shipment.destinationHousingId || shipment.targetHousingId || order.targetHousingId || order.destinationHousingId || "").trim();
    const targetUnitId = String(shipment.targetUnitId || order.targetUnitId || DEFAULT_STORAGE_UNIT_ID).trim();
    const record = (targetHousingId ? records.find((entry) => entry.id === targetHousingId) : null)
      || records.find((entry) => (entry.storageUnits || []).some((unit) => unit.id === targetUnitId))
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

  function renderHousingShipmentRow(order = {}, shipment = {}, citizen = {}) {
    const state = getHousingShipmentState(shipment, order);
    const statusClass = state.toLowerCase().replace(/_/g, "-");
    const context = getHousingShipmentUnitContext(citizen, shipment, order);
    const itemName = order.itemName || shipment.payload?.itemName || "Market item";
    const result = String(shipment.deliveryResult || order.deliveryResult || "").trim().toUpperCase();
    const deliveredItemId = shipment.deliveredItemId || order.deliveredItemId || "";
    return `
      <article class="housing-shipment-row is-${escapeHtml(statusClass)}">
        <div class="housing-shipment-row-main">
          <b>${escapeHtml(itemName)}</b>
          <small>${escapeHtml(`${formatHousingShipmentState(state)} / ETA ${formatIsoLabel(shipment.etaIso || order.etaIso)} / ${shipment.routeClass || "STANDARD"}`)}</small>
          <small>${escapeHtml(`${shipment.sourceLabel || order.vendorName || "Vendor"} → ${context.unitTitle} / ${context.unitLabel}`)}</small>
          ${result ? `<small class="housing-shipment-result">RESULT: ${escapeHtml(result.replace(/_/g, " "))}${deliveredItemId ? ` / ITEM ${escapeHtml(deliveredItemId)}` : ""}</small>` : ""}
        </div>
        <span class="module-status-badge">${escapeHtml(formatCredits(order.price || 0))}</span>
      </article>
    `;
  }

  function getMarketFeedback(citizenId = "") {
    window.WS_APP.marketFeedbackByCitizen = window.WS_APP.marketFeedbackByCitizen || {};
    return window.WS_APP.marketFeedbackByCitizen[citizenId] || null;
  }

  function setMarketFeedback(citizenId = "", message = "", type = "INFO") {
    window.WS_APP.marketFeedbackByCitizen = window.WS_APP.marketFeedbackByCitizen || {};
    if (!message) {
      delete window.WS_APP.marketFeedbackByCitizen[citizenId];
      return;
    }
    window.WS_APP.marketFeedbackByCitizen[citizenId] = {
      message: String(message),
      type: String(type || "INFO").toUpperCase()
    };
  }

  function renderHousingFeedback(citizenId = "") {
    const feedback = getMarketFeedback(citizenId);
    if (!feedback) return "";
    return `<div class="housing-feedback is-${escapeHtml(String(feedback.type || "INFO").toLowerCase())}">${escapeHtml(feedback.message)}</div>`;
  }

  function renderHousingMetric(label = "", value = "", note = "") {
    return `<div class="housing-metric"><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b>${note ? `<em>${escapeHtml(note)}</em>` : ""}</div>`;
  }

  function setMarketWorkspaceTab() {
    // Compatibility callback retained by the legacy storefront runtime.
  }

  function createMarketRuntime() {
    if (marketRuntime) return marketRuntime;
    const factory = window.WS_APP.createHousingMarketRuntime;
    if (typeof factory !== "function") throw new Error("MARKET_RUNTIME_FACTORY_UNAVAILABLE");
    marketRuntime = factory({
      DEFAULT_STORAGE_UNIT_ID,
      HOUSING_MARKET_DEFAULT_SHIPPING_DAYS: MARKET_DEFAULT_SHIPPING_DAYS,
      HOUSING_MARKET_DELIVERABLE_SHIPMENT_STATUSES: MARKET_DELIVERABLE_SHIPMENT_STATUSES,
      HOUSING_MARKET_DEPARTMENTS: MARKET_DEPARTMENTS,
      HOUSING_MARKET_MODES: MARKET_MODES,
      HOUSING_MARKET_ORDER_CLOSED_STATUSES: MARKET_ORDER_CLOSED_STATUSES,
      HOUSING_MARKET_ORDER_VIEWS: MARKET_ORDER_VIEWS,
      HOUSING_MARKET_PAGE_SIZE: MARKET_PAGE_SIZE,
      HOUSING_MARKET_PRODUCT_VISUAL_FALLBACKS: MARKET_PRODUCT_VISUAL_FALLBACKS,
      HOUSING_MARKET_SORTS: MARKET_SORTS,
      HOUSING_MARKET_STATUSES: MARKET_STATUSES,
      HOUSING_MARKET_VENDOR_DEFAULTS: MARKET_VENDOR_DEFAULTS,
      HOUSING_SHIPMENT_ACTIVE_STATUSES: MARKET_SHIPMENT_ACTIVE_STATUSES,
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
      renderHousingModule: renderMarketModule,
      renderHousingShipmentRow,
      rootSelector: "[data-market-module]",
      setHousingActiveTab: setMarketWorkspaceTab,
      setHousingFeedback: setMarketFeedback
    });
    window.WS_APP.marketRuntime = marketRuntime;
    window.WS_APP.housingMarketRuntime = marketRuntime;
    return marketRuntime;
  }

  function ensureMarketRuntime() {
    try {
      return Promise.resolve(createMarketRuntime());
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function renderMarketTargetSwitcher(user, selectedId) {
    if (user?.role !== "admin") return "";
    const citizens = getMarketCitizens(user);
    return `
      <section class="housing-target-panel terminal-admin-target">
        <label>
          <span>ADMIN TARGET MARKET</span>
          <select data-market-target-citizen>
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

  function renderMarketSession(user, citizen) {
    return `
      <section class="housing-module-session terminal-local-session" aria-label="Market Session">
        <div class="terminal-local-session-head">
          <p class="kicker">MARKET / COMMERCE ACCESS</p>
          <strong>MODULE STATUS: GLOBAL MARKET</strong>
        </div>
        <div class="terminal-local-session-line">
          <span>CITIZEN: <b>${escapeHtml(getCitizenName(citizen, user))}</b></span>
          <span>SHORT ID: <b>${escapeHtml(getCitizenShortId(citizen))}</b></span>
          <span>CREDITS: <b>${escapeHtml(formatCredits(parseCredits(citizen.credits)))}</b></span>
        </div>
      </section>
    `;
  }

  function renderMarketModule(user = window.WS_APP.currentUser) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    if (!container) return;
    const citizen = getMarketTargetCitizen(user);
    if (status) status.textContent = "MARKET / ACTIVE";

    if (!citizen) {
      container.innerHTML = `
        <section class="module-detail housing-module-view">
          <div class="module-detail-head">
            <div><p class="kicker">TERMINAL / MARKET</p><h4>Market</h4></div>
            <button class="module-back-button" type="button">Back</button>
          </div>
          <p class="file-empty">No citizen profile is linked to this market session.</p>
        </section>
      `;
      window.WS_APP.bindModuleBackButton?.(user, () => window.WS_APP.renderModules?.(user));
      return;
    }

    let runtime;
    try {
      runtime = createMarketRuntime();
    } catch (error) {
      container.innerHTML = `
        <section class="module-detail housing-module-view">
          <div class="module-detail-head">
            <div><p class="kicker">TERMINAL / MARKET</p><h4>Market</h4></div>
            <button class="module-back-button" type="button">Back</button>
          </div>
          <section class="housing-module-panel">
            <p class="kicker">MARKET RUNTIME</p>
            <p class="housing-storage-note">${escapeHtml(String(error?.message || error || "UNKNOWN").replace(/_/g, " "))}</p>
          </section>
        </section>
      `;
      window.WS_APP.bindModuleBackButton?.(user, () => window.WS_APP.renderModules?.(user));
      return;
    }

    container.innerHTML = `
      <section class="module-detail housing-module-view" data-market-module data-market-citizen-id="${escapeHtml(citizen.id)}">
        <div class="module-detail-head">
          <div><p class="kicker">TERMINAL / MARKET</p><h4>Market</h4></div>
          <button class="module-back-button" type="button">Back</button>
        </div>
        ${renderMarketSession(user, citizen)}
        ${renderMarketTargetSwitcher(user, citizen.id)}
        ${runtime.renderHousingMarketTab(citizen)}
      </section>
    `;

    window.WS_APP.bindModuleBackButton?.(user, () => {
      const root = document.querySelector("[data-market-module]");
      if (runtime.handleHousingMarketBackNavigation?.({ root, citizenId: citizen.id, user })) return;
      runtime.resetHousingMarketTransientUi?.(root, citizen.id);
      window.WS_APP.renderModules?.(user);
    });
    bindMarketModuleActions(user);
    runtime.syncHousingMarketModalState?.(document.querySelector("[data-market-module]"), citizen.id, { focus: true });
  }

  function bindMarketModuleActions(user = window.WS_APP.currentUser) {
    const root = document.querySelector("[data-market-module]");
    if (!root || !marketRuntime) return;
    const citizenId = String(root.getAttribute("data-market-citizen-id") || "").trim();

    root.querySelector("[data-market-target-citizen]")?.addEventListener("change", (event) => {
      marketRuntime.resetHousingMarketTransientUi?.(root, citizenId);
      window.WS_APP.marketTargetCitizenId = String(event.target.value || "").trim();
      renderMarketModule(user);
    });

    root.addEventListener("change", (event) => {
      marketRuntime.handleHousingMarketChange?.(event, { root, citizenId, user });
    });

    root.addEventListener("input", (event) => {
      marketRuntime.handleHousingMarketInput?.(event, { root, citizenId, user });
    });

    root.addEventListener("keydown", (event) => {
      marketRuntime.handleHousingMarketKeydown?.(event, { root, citizenId, user });
    });

    root.addEventListener("click", (event) => {
      const targetRecordButton = event.target.closest?.("[data-housing-record-id]");
      if (targetRecordButton) {
        setMarketDeliveryHousingId(citizenId, String(targetRecordButton.getAttribute("data-housing-record-id") || ""));
        setMarketFeedback(citizenId, "");
        renderMarketModule(user);
        return;
      }
      marketRuntime.handleHousingMarketClick?.(event, { root, citizenId, user });
    });
  }

  function getMarketModuleMetric(user = window.WS_APP.currentUser) {
    const citizens = getMarketCitizens(user);
    let orders = 0;
    let active = 0;
    citizens.forEach((citizen) => {
      const canonical = window.WS_APP.getCitizenMarketOrders?.(citizen.id) || [];
      orders += canonical.length;
      active += canonical.filter((order) => !MARKET_ORDER_CLOSED_STATUSES.has(String(order?.status || "").trim().toUpperCase())).length;
    });
    return { label: `${active} ACTIVE / ${orders} ORDER${orders === 1 ? "" : "S"}`, empty: orders === 0 };
  }

  window.addEventListener("ws:campaign-date-updated", () => {
    void ensureMarketRuntime().then((runtime) => {
      runtime.processDueHousingMarketShipments({ nowIso: getCampaignDateIso() });
      if (document.querySelector("[data-market-module]")) renderMarketModule(window.WS_APP.currentUser);
    }).catch((error) => console.error("Market shipment scheduler could not initialize.", error));
  });

  window.WS_APP.ensureMarketRuntime = ensureMarketRuntime;
  window.WS_APP.ensureHousingMarketRuntime = ensureMarketRuntime;
  window.WS_APP.processDueHousingMarketShipments = (...args) => ensureMarketRuntime().then((runtime) => runtime.processDueHousingMarketShipments(...args));
  window.WS_APP.processDueHousingMarketShipmentsForCitizen = (...args) => ensureMarketRuntime().then((runtime) => runtime.processDueHousingMarketShipmentsForCitizen(...args));
  window.WS_APP.renderMarketModule = renderMarketModule;
  window.WS_APP.getMarketModuleMetric = getMarketModuleMetric;
})();
