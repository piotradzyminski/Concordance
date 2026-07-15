window.WS_APP = window.WS_APP || {};

(function initNotificationContentResolver() {
  const app = window.WS_APP;
  const catalog = window.APP_DATA?.NOTIFICATION_CONTENT_TEMPLATES || { templates: {} };
  const diagnostics = [];

  function clone(value) {
    if (value === undefined) return undefined;
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function text(value = "") {
    return String(value ?? "").trim();
  }

  function token(value = "", fallback = "") {
    const normalized = text(value || fallback)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return normalized || fallback;
  }

  function normalizeEventCode(value = "") {
    return text(value)
      .split(".")
      .map((part) => token(part, ""))
      .filter(Boolean)
      .join(".");
  }

  function humanize(value = "", fallback = "") {
    const raw = text(value);
    if (!raw) return fallback;
    return raw
      .replace(/[_-]+/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function pushDiagnostic(level, code, detail = {}) {
    const record = {
      level: token(level, "WARNING"),
      code: token(code, "NOTIFICATION_CONTENT_WARNING"),
      detail: clone(detail),
      at: new Date().toISOString()
    };
    diagnostics.push(record);
    if (diagnostics.length > 300) diagnostics.splice(0, diagnostics.length - 300);
    return record;
  }

  function isTechnicalIdentifier(value = "") {
    const raw = text(value);
    if (!raw) return false;
    if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(raw)) return true;
    if (/^(item|instance|service_order|service_offer|market_order|market_offer|billing_intent|billing_tx|billing_transaction|world_operation|subscription_contract|subscription|shipment|housing_reservation|item_transaction)[_:-]/i.test(raw)) return true;
    if (/^[a-z0-9]+(?:[-_][a-z0-9]+){2,}$/i.test(raw) && (/[0-9]/.test(raw) || raw === raw.toLowerCase())) return true;
    return false;
  }

  function safeLabel(value = "", fallback = "Record") {
    const raw = text(value);
    if (!raw || isTechnicalIdentifier(raw)) return fallback;
    if (/^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(raw)) return humanize(raw, fallback);
    return raw;
  }

  function formatStatus(value = "", fallback = "Updated") {
    const normalized = token(value, "");
    return catalog.statusLabels?.[normalized] || humanize(normalized, fallback);
  }

  function formatReason(value = "", fallback = "The request requires review.") {
    const normalized = token(value, "");
    if (!normalized) return fallback;
    return catalog.reasonLabels?.[normalized] || `${humanize(normalized, "The request requires review")}.`;
  }

  function formatCredits(value = 0) {
    const number = Number(value || 0);
    if (typeof app.formatCredits === "function") return app.formatCredits(Number.isFinite(number) ? number : 0);
    return `${Number.isFinite(number) ? number : 0} ₡`;
  }

  function formatDate(value = "", fallback = "Not specified") {
    const raw = text(value);
    if (!raw) return fallback;
    if (typeof app.formatDateDisplay === "function") {
      try {
        return app.formatDateDisplay(raw) || fallback;
      } catch (error) {
        pushDiagnostic("WARNING", "NOTIFICATION_CONTENT_DATE_FORMAT_FAILED", { value: raw, message: error?.message || "" });
      }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const date = parsed.toISOString();
      return `${date.slice(0, 10)} ${date.slice(11, 16)}`;
    }
    return raw;
  }

  function row(label, value) {
    const normalizedLabel = text(label);
    const normalizedValue = text(value);
    return normalizedLabel && normalizedValue ? { label: normalizedLabel, value: normalizedValue } : null;
  }

  function panel(title, rows = [], role = "subject", variant = "") {
    const normalizedRows = rows.filter(Boolean);
    if (!normalizedRows.length) return null;
    return {
      title: text(title).toUpperCase(),
      role,
      ...(variant ? { variant } : {}),
      rows: normalizedRows
    };
  }

  function compactPanels(...panels) {
    return panels.filter(Boolean);
  }

  function normalizeReference(reference = {}) {
    if (!reference || typeof reference !== "object" || Array.isArray(reference)) return null;
    const type = token(reference.type, "");
    const id = text(reference.id || reference.entityId);
    return type && id ? { ...clone(reference), type, id } : null;
  }

  function getReferences(input = {}) {
    const refs = [];
    const add = (reference) => {
      const normalized = normalizeReference(reference);
      if (!normalized) return;
      if (!refs.some((item) => item.type === normalized.type && item.id === normalized.id)) refs.push(normalized);
    };
    add(input.subjectRef);
    (Array.isArray(input.relatedRefs) ? input.relatedRefs : []).forEach(add);
    return refs;
  }

  function findReference(input = {}, type = "") {
    const normalizedType = token(type, "");
    return getReferences(input).find((reference) => reference.type === normalizedType) || null;
  }

  function getOrganization(providerId = "", organizationId = "") {
    const provider = text(providerId);
    const organization = text(organizationId);
    return (provider && app.getOrganizationByProviderId?.(provider))
      || (organization && app.getOrganizationById?.(organization))
      || null;
  }

  function getProviderLabel(input = {}, fallback = "System provider") {
    const data = input.templateData || input.data || {};
    const providerId = text(
      data.providerId
      || data.notificationProviderId
      || input.providerId
      || input.source?.providerId
    );
    const organizationId = text(data.organizationId || input.source?.organizationId);
    const organization = getOrganization(providerId, organizationId);
    const sourceLabel = text(input.source?.label);
    return safeLabel(
      organization?.name
      || organization?.displayName
      || sourceLabel,
      fallback
    );
  }

  function getCitizenLabel(citizenId = "", fallback = "Citizen") {
    const citizen = text(citizenId) ? app.getCitizenById?.(citizenId) : null;
    const label = typeof app.getCitizenDisplayName === "function"
      ? app.getCitizenDisplayName(citizen || {}, { legal: true })
      : "";
    return safeLabel(label || citizen?.legalName || citizen?.name || citizen?.shortId, fallback);
  }

  function getItemRecord(instanceId = "") {
    return text(instanceId) ? app.getItemInstanceById?.(instanceId) || null : null;
  }

  function getItemDefinition(instance = {}, fallbackDefinitionId = "") {
    const definitionId = text(instance?.definitionId || instance?.catalogId || fallbackDefinitionId);
    if (!definitionId) return null;
    return app.getEquipmentCatalogItemById?.(definitionId)
      || app.getCyberwareCatalogItem?.(definitionId)
      || null;
  }

  function getItemLabel(instanceId = "", fallback = "Referenced item") {
    const instance = getItemRecord(instanceId);
    const definition = getItemDefinition(instance || {});
    return safeLabel(
      instance?.playerLabel
      || instance?.displayName
      || instance?.name
      || instance?.definitionSnapshot?.name
      || instance?.definitionSnapshot?.title
      || definition?.displayName
      || definition?.name
      || definition?.title
      || definition?.model,
      instance ? "Unnamed item" : fallback
    );
  }

  function getItemLabels(instanceIds = []) {
    const ids = [...new Set((Array.isArray(instanceIds) ? instanceIds : []).map(text).filter(Boolean))];
    return ids.map((instanceId) => getItemLabel(instanceId, "Referenced item unavailable"));
  }

  function formatItemList(labels = [], fallback = "No physical item recorded") {
    const values = (Array.isArray(labels) ? labels : []).map(text).filter(Boolean);
    if (!values.length) return fallback;
    if (values.length === 1) return values[0];
    if (values.length === 2) return values.join(" + ");
    return `${values[0]} + ${values.length - 1} more`;
  }

  function getServiceContext(input = {}) {
    const data = input.templateData || input.data || {};
    const reference = findReference(input, "SERVICE_ORDER");
    const serviceOrderId = text(data.serviceOrderId || reference?.id);
    const order = serviceOrderId ? app.getServiceOrder?.(serviceOrderId) || null : null;
    const serviceDefinitionId = text(order?.serviceDefinitionId || data.serviceDefinitionId);
    const definition = serviceDefinitionId ? app.getServiceDefinition?.(serviceDefinitionId) || null : null;
    const instanceIds = [...new Set([
      ...(Array.isArray(order?.subjectRefs?.instanceIds) ? order.subjectRefs.instanceIds : []),
      ...(Array.isArray(data.subjectInstanceIds) ? data.subjectInstanceIds : []),
      ...getReferences(input).filter((referenceItem) => referenceItem.type === "ITEM_INSTANCE").map((referenceItem) => referenceItem.id)
    ].map(text).filter(Boolean))];
    const providerId = text(order?.providerId || data.providerId || input.providerId || input.source?.providerId);
    const organization = getOrganization(providerId, data.organizationId || input.source?.organizationId);
    const name = safeLabel(
      definition?.displayName
      || definition?.title
      || definition?.name
      || definition?.serviceType
      || data.serviceType,
      "Service procedure"
    );
    return {
      serviceOrderId,
      order,
      definition,
      name: isTechnicalIdentifier(name) ? humanize(definition?.serviceType || data.serviceType, "Service procedure") : name,
      providerId,
      providerLabel: safeLabel(organization?.name || organization?.displayName || input.source?.label, "Service provider"),
      status: token(order?.status || data.status, "UPDATED"),
      paymentStatus: token(order?.paymentStatus || data.paymentStatus, ""),
      scheduledStartAt: text(order?.scheduledStartAt || data.scheduledStartAt),
      completedAt: text(order?.completedAt || data.completedAt),
      resultCode: token(order?.result?.resultCode || data.resultCode, ""),
      instanceIds,
      itemLabels: getItemLabels(instanceIds)
    };
  }

  function getMarketLineLabel(line = {}) {
    const definitionId = text(line.definitionId || line.catalogItemId);
    const definition = definitionId ? app.getEquipmentCatalogItemById?.(definitionId) || null : null;
    return safeLabel(
      line.displayName
      || line.name
      || line.title
      || definition?.displayName
      || definition?.name
      || definition?.title
      || definition?.model,
      "Market item"
    );
  }

  function getMarketContext(input = {}) {
    const data = input.templateData || input.data || {};
    const reference = findReference(input, "MARKET_ORDER");
    const marketOrderId = text(data.marketOrderId || reference?.id);
    const order = marketOrderId ? app.getMarketOrder?.(marketOrderId) || null : null;
    const providerId = text(order?.vendorProviderId || data.vendorProviderId || input.providerId || input.source?.providerId);
    const organization = getOrganization(providerId, input.source?.organizationId || "");
    const lines = Array.isArray(order?.lines) && order.lines.length
      ? order.lines
      : (Array.isArray(data.lineSummaries) ? data.lineSummaries : []);
    const lineInstanceIds = lines.flatMap((line) => Array.isArray(line.createdItemInstanceIds) ? line.createdItemInstanceIds : []);
    const instanceIds = [...new Set([
      ...(Array.isArray(order?.createdItemInstanceIds) ? order.createdItemInstanceIds : []),
      ...lineInstanceIds,
      ...(Array.isArray(data.instanceIds) ? data.instanceIds : [])
    ].map(text).filter(Boolean))];
    const itemLabels = getItemLabels(instanceIds);
    const lineItems = lines.map((line) => ({
      label: getMarketLineLabel(line),
      quantity: Math.max(1, Number(line.quantity || 1) || 1),
      fulfillmentMode: token(line.fulfillmentMode, "DELIVER_TO_HOUSING"),
      destinationRef: line.destinationRef && typeof line.destinationRef === "object" ? line.destinationRef : null
    }));
    const productLabels = itemLabels.length
      ? itemLabels
      : lineItems.flatMap((line) => Array.from({ length: Math.min(line.quantity, 20) }, () => line.label));
    const totalQuantity = lineItems.reduce((sum, line) => sum + line.quantity, 0) || itemLabels.length;
    const finalTotal = Number(order?.totals?.finalTotal ?? data.totalAmount ?? 0) || 0;
    const fulfillmentModes = [...new Set(lineItems.map((line) => line.fulfillmentMode).filter(Boolean))];
    const primaryMode = fulfillmentModes.length === 1 ? fulfillmentModes[0] : (fulfillmentModes.length ? "MIXED" : token(data.fulfillmentMode, ""));
    const shipment = order?.shipmentId ? app.getMarketShipment?.(order.shipmentId) || null : null;
    const storageId = text(
      order?.deliveryFulfillment?.destinationStorageId
      || shipment?.destinationStorageId
      || lines.find((line) => line.destinationRef?.housingStorageId)?.destinationRef?.housingStorageId
      || data.destinationStorageId
    );
    const storage = storageId && order?.citizenId ? app.getHousingStorage?.(storageId, order.citizenId) || null : null;
    const destinationLabel = safeLabel(
      storage?.unit?.name
      || storage?.unit?.title
      || storage?.record?.title
      || shipment?.destinationAddress
      || data.destinationLabel,
      primaryMode === "PICKUP" ? "Vendor pickup point" : primaryMode === "PURCHASE_WITH_SERVICE" ? "Service provider" : "Housing storage"
    );
    return {
      marketOrderId,
      order,
      providerId,
      vendorLabel: safeLabel(organization?.name || organization?.displayName || order?.lines?.[0]?.vendorDisplayName || input.source?.label, "Market vendor"),
      status: token(order?.status || data.status || data.marketStatus, "UPDATED"),
      previousStatus: token(data.previousStatus, ""),
      paymentStatus: token(order?.paymentStatus || data.paymentStatus || data.marketPaymentStatus, ""),
      cancellationStatus: token(order?.cancellation?.status || data.cancellationStatus, "NONE"),
      refundStatus: token(order?.refundRequest?.status || data.refundRequestStatus, "NONE"),
      deliveryStatus: token(order?.deliveryFulfillment?.status || shipment?.status || data.deliveryStatus, "NOT_REQUIRED"),
      pickupStatus: token(order?.pickupFulfillment?.status || data.pickupStatus, "NOT_REQUIRED"),
      serviceStatus: token(order?.serviceFulfillment?.status || data.serviceStatus, "NOT_REQUIRED"),
      compensationStatus: token(order?.compensationStatus || data.compensationStatus, "NOT_REQUIRED"),
      failureCode: token(order?.failureCode || shipment?.lastErrorCode || data.failureCode || data.reasonCode, ""),
      finalTotal,
      totalLabel: formatCredits(finalTotal),
      instanceIds,
      itemLabels: productLabels,
      itemSummary: formatItemList(productLabels, totalQuantity ? `${totalQuantity} market items` : "Market order"),
      lineCount: lines.length || Number(data.lineCount || 0),
      totalQuantity,
      fulfillmentMode: primaryMode,
      destinationLabel,
      shipment,
      requestedAt: text(order?.refundRequest?.requestedAt || data.refundRequestedAt),
      completedAt: text(order?.completedAt || data.completedAt)
    };
  }

  function getHousingShipmentContext(input = {}) {
    const data = input.templateData || input.data || {};
    const shipmentReference = findReference(input, "SHIPMENT") || findReference(input, "MARKET_SHIPMENT");
    const shipmentId = text(data.shipmentId || shipmentReference?.id);
    const shipment = shipmentId ? app.getMarketShipment?.(shipmentId) || null : null;
    const marketOrderId = text(shipment?.marketOrderId || data.marketOrderId || findReference(input, "MARKET_ORDER")?.id);
    const order = marketOrderId ? app.getMarketOrder?.(marketOrderId) || null : null;
    const citizenId = text(shipment?.citizenId || data.citizenId || input.citizenId);
    const providerId = text(shipment?.providerId || data.providerId || order?.vendorProviderId);
    const organization = getOrganization(providerId, "");
    const storageId = text(shipment?.destinationStorageId || data.destinationStorageId || findReference(input, "HOUSING_STORAGE")?.id);
    const storage = storageId && citizenId ? app.getHousingStorage?.(storageId, citizenId) || null : null;
    const instanceIds = [...new Set([
      ...(Array.isArray(shipment?.instanceIds) ? shipment.instanceIds : []),
      ...(Array.isArray(data.instanceIds) ? data.instanceIds : [])
    ].map(text).filter(Boolean))];
    const itemLabels = getItemLabels(instanceIds);
    const housingLabel = safeLabel(
      storage?.record?.title
      || storage?.record?.name
      || storage?.record?.label,
      "Assigned Housing Unit"
    );
    const storageLabel = safeLabel(
      storage?.unit?.name
      || storage?.unit?.title
      || storage?.unit?.label,
      "Housing storage"
    );
    const destinationAddress = safeLabel(
      shipment?.destinationAddress
      || data.destinationAddress
      || storage?.record?.addressLabel
      || storage?.record?.address,
      housingLabel
    );
    return {
      shipmentId,
      shipment,
      marketOrderId,
      order,
      citizenId,
      providerId,
      providerLabel: safeLabel(organization?.name || organization?.displayName, "Housing delivery service"),
      storageId,
      storage,
      housingLabel,
      storageLabel,
      destinationAddress,
      status: token(shipment?.status || data.status, "UPDATED"),
      previousStatus: token(data.previousStatus, ""),
      holdReason: token(shipment?.holdReason || data.holdReason, ""),
      lastErrorCode: token(shipment?.lastErrorCode || data.lastErrorCode, ""),
      routeClass: token(shipment?.routeClass || data.routeClass, ""),
      etaAt: text(shipment?.etaAt || data.etaAt),
      deliveredAt: text(shipment?.deliveredAt || data.deliveredAt),
      heldAt: text(shipment?.heldAt || data.heldAt),
      instanceIds,
      itemLabels,
      itemSummary: formatItemList(itemLabels, instanceIds.length ? `${instanceIds.length} delivered items` : "Shipment contents")
    };
  }

  function getBillingContext(input = {}) {
    const data = input.templateData || input.data || {};
    const transactionRef = findReference(input, "BILLING_TRANSACTION");
    const intentRef = findReference(input, "BILLING_INTENT");
    const transactionId = text(data.billingTransactionId || transactionRef?.id);
    const intentId = text(data.billingIntentId || intentRef?.id);
    const transaction = transactionId ? app.getBillingTransaction?.(transactionId) || null : null;
    const intent = (intentId ? app.getBillingIntent?.(intentId) : null)
      || (transaction?.billingIntentId ? app.getBillingIntent?.(transaction.billingIntentId) : null)
      || null;
    const record = transaction || intent || data;
    const providerId = text(record?.providerId || data.providerId || input.providerId || input.source?.providerId);
    const organizationId = text(record?.organizationId || data.organizationId || input.source?.organizationId);
    const organization = getOrganization(providerId, organizationId);
    const amount = Number(record?.amount ?? data.amount ?? 0) || 0;
    const status = token(record?.status || data.status, "");
    const failureCode = token(record?.failureCode || data.failureCode || data.reasonCode, "");
    const sourceDomain = token(record?.sourceDomain || data.sourceDomain, "BILLING");
    const sourceRefId = text(record?.sourceRefId || data.sourceRefId);
    return {
      transactionId,
      intentId: text(intent?.billingIntentId || intentId),
      transaction,
      intent,
      record,
      amount,
      amountLabel: formatCredits(amount),
      currency: token(record?.currency || data.currency, "CREDIT"),
      paymentSource: token(record?.paymentSource || data.paymentSource, "CREDITS"),
      status,
      failureCode,
      failureMessage: text(record?.failureMessage || data.failureMessage),
      sourceDomain,
      sourceRefId,
      providerId,
      providerLabel: safeLabel(organization?.name || organization?.displayName || input.source?.label, "Billing service")
    };
  }

  function getSubscriptionContext(input = {}) {
    const data = input.templateData || input.data || {};
    const reference = findReference(input, "SUBSCRIPTION_CONTRACT");
    const contractId = text(data.subscriptionContractId || reference?.id);
    const contract = contractId ? app.getSubscriptionContract?.(contractId) || null : null;
    const catalogId = text(
      contract?.subscriptionCatalogId
      || contract?.catalogId
      || data.subscriptionCatalogId
    );
    const definition = catalogId
      ? app.getSubscriptionCatalogEntry?.(catalogId)
        || app.getSubscriptionCatalogItemById?.(catalogId)
        || null
      : null;
    const tierId = text(contract?.tierId || data.tierId);
    const tier = catalogId && tierId ? app.getSubscriptionTierById?.(catalogId, tierId) || null : null;
    const target = contract?.coverageTarget || data.coverageTarget || null;
    let targetLabel = "Citizen account";
    if (target?.type === "ITEM_INSTANCE" && target?.id) targetLabel = getItemLabel(target.id, "Covered item unavailable");
    if (target?.type === "CITIZEN" && target?.id) targetLabel = getCitizenLabel(target.id, "Citizen");
    const providerId = text(contract?.providerId || data.providerId || input.providerId || input.source?.providerId);
    const organizationId = text(contract?.organizationId || data.organizationId || input.source?.organizationId);
    const organization = getOrganization(providerId, organizationId);
    return {
      contractId,
      contract,
      definition,
      tier,
      title: safeLabel(
        contract?.displaySnapshot?.title
        || contract?.title
        || definition?.title
        || definition?.displayName
        || definition?.name,
        "Subscription"
      ),
      tierLabel: safeLabel(
        tier?.title
        || tier?.displayName
        || tier?.name
        || tier?.label
        || tierId,
        tierId ? humanize(tierId, "Plan tier") : "Plan tier"
      ),
      providerLabel: safeLabel(organization?.name || organization?.displayName || input.source?.label, "Subscription provider"),
      contractStatus: token(data.contractStatus || contract?.contractStatus || contract?.status, ""),
      billingStatus: token(data.billingStatus || contract?.billingStatus, ""),
      entitlementStatus: token(data.entitlementStatus || contract?.entitlementStatus, ""),
      previousEntitlementStatus: token(data.previousEntitlementStatus, ""),
      allowed: data.allowed === true || contract?.entitled === true,
      reasonCode: token(data.reasonCode, ""),
      target,
      targetLabel,
      entitlementCodes: Array.isArray(data.entitlementCodes) ? data.entitlementCodes : []
    };
  }

  function getWorldOperationContext(input = {}) {
    const data = input.templateData || input.data || {};
    const reference = findReference(input, "WORLD_OPERATION");
    const operationId = text(data.operationId || input.correlationId || reference?.id);
    const operation = operationId ? app.getWorldBridgeOperation?.(operationId) || null : null;
    const refs = operation?.refs || {};
    const instanceIds = [...new Set([
      ...(Array.isArray(operation?.refs?.instanceIds) ? operation.refs.instanceIds : []),
      ...(Array.isArray(data.instanceIds) ? data.instanceIds : []),
      ...getReferences(input).filter((referenceItem) => referenceItem.type === "ITEM_INSTANCE").map((referenceItem) => referenceItem.id)
    ].map(text).filter(Boolean))];
    return {
      operationId,
      operation,
      operationType: token(operation?.operationType || data.operationType, "WORLD_OPERATION"),
      status: token(operation?.status || data.status, "UPDATED"),
      currentStep: token(operation?.currentStep || data.currentStep, ""),
      recoveryRequired: operation?.recovery?.required === true || data.recoveryRequired === true,
      compensationStatus: token(operation?.compensation?.status || data.compensationStatus, "NOT_REQUIRED"),
      refs: {
        marketOrderId: text(refs.marketOrderId || data.marketOrderId || findReference(input, "MARKET_ORDER")?.id),
        serviceOrderId: text(refs.serviceOrderId || data.serviceOrderId || findReference(input, "SERVICE_ORDER")?.id),
        billingIntentId: text(refs.billingIntentId || data.billingIntentId || findReference(input, "BILLING_INTENT")?.id),
        billingTransactionId: text(refs.billingTransactionId || data.billingTransactionId || findReference(input, "BILLING_TRANSACTION")?.id),
        itemTransactionId: text(refs.itemTransactionId || data.itemTransactionId || findReference(input, "ITEM_TRANSACTION")?.id),
        instanceIds
      },
      itemLabels: getItemLabels(instanceIds)
    };
  }

  function resolveSourceDescription(sourceDomain = "", sourceRefId = "", input = {}) {
    const domain = token(sourceDomain, "BILLING");
    if (domain === "SERVICE") {
      const serviceOrder = sourceRefId ? app.getServiceOrder?.(sourceRefId) : null;
      const definition = serviceOrder?.serviceDefinitionId ? app.getServiceDefinition?.(serviceOrder.serviceDefinitionId) : null;
      return safeLabel(definition?.displayName || definition?.title || definition?.serviceType, "Service payment");
    }
    if (domain === "MARKET") {
      const order = sourceRefId ? app.getMarketOrder?.(sourceRefId) : null;
      const labels = getItemLabels(order?.createdItemInstanceIds || []);
      return labels.length ? `Market purchase: ${formatItemList(labels)}` : "Market purchase";
    }
    if (domain === "SUBSCRIPTION") {
      const contract = sourceRefId ? app.getSubscriptionContract?.(sourceRefId) : null;
      const catalogId = contract?.subscriptionCatalogId || contract?.catalogId;
      const definition = catalogId ? app.getSubscriptionCatalogEntry?.(catalogId) || app.getSubscriptionCatalogItemById?.(catalogId) : null;
      return safeLabel(contract?.displaySnapshot?.title || definition?.title || definition?.name, "Subscription charge");
    }
    if (domain === "WORLD_BRIDGE" || domain === "CYBERWARE") {
      const operation = sourceRefId ? app.getWorldBridgeOperation?.(sourceRefId) : null;
      const operationType = token(operation?.operationType || input.templateData?.operationType, "");
      return catalog.operationLabels?.[operationType] || humanize(operationType, "Cyberware operation");
    }
    return humanize(domain, "Payment");
  }

  function buildWorldOperationContent(input = {}, template = {}) {
    const context = getWorldOperationContext(input);
    const operationLabel = catalog.operationLabels?.[context.operationType] || humanize(context.operationType, "World operation");
    const statusLabel = formatStatus(context.status);
    const serviceInput = {
      ...input,
      templateData: { ...(input.templateData || input.data || {}), serviceOrderId: context.refs.serviceOrderId }
    };
    const service = getServiceContext(serviceInput);
    const marketInput = {
      ...input,
      templateData: { ...(input.templateData || input.data || {}), marketOrderId: context.refs.marketOrderId }
    };
    const market = getMarketContext(marketInput);
    const billingInput = {
      ...input,
      templateData: {
        ...(input.templateData || input.data || {}),
        billingIntentId: context.refs.billingIntentId,
        billingTransactionId: context.refs.billingTransactionId
      }
    };
    const billing = getBillingContext(billingInput);

    const leadByStatus = {
      COMPLETED: `${operationLabel} completed successfully.`,
      FAILED: `${operationLabel} could not be completed.`,
      CANCELLED: `${operationLabel} was cancelled.`,
      SCHEDULED: `${operationLabel} has been scheduled.`,
      AUTHORIZED: `${operationLabel} has been authorized.`,
      IN_PROGRESS: `${operationLabel} is in progress.`,
      COMMITTING: `${operationLabel} is applying the approved physical changes.`,
      CAPTURING: `${operationLabel} is finalizing payment.`,
      RECOVERY_REQUIRED: `${operationLabel} requires recovery before it can continue.`,
      PAYMENT_RECOVERY_REQUIRED: `${operationLabel} requires payment recovery.`,
      COMPENSATION_REQUIRED: `${operationLabel} requires compensation before it can close.`
    };
    const actionRequired = ["FAILED", "RECOVERY_REQUIRED", "PAYMENT_RECOVERY_REQUIRED", "COMPENSATION_REQUIRED"].includes(context.status);
    const resultLabel = context.status === "COMPLETED"
      ? "Installed and operational"
      : context.status === "CANCELLED"
        ? "No further processing"
        : actionRequired
          ? "Review required"
          : statusLabel;

    const panels = compactPanels(
      panel("CYBERWARE", [
        row(context.itemLabels.length > 1 ? "Items" : "Item", formatItemList(context.itemLabels, "Referenced cyberware unavailable")),
        row("Operation", operationLabel),
        row("Status", statusLabel)
      ], "subject"),
      context.refs.serviceOrderId ? panel("SERVICE", [
        row("Procedure", service.name),
        row("Provider", service.providerLabel),
        row("Status", formatStatus(service.status, "Recorded")),
        service.scheduledStartAt ? row("Scheduled", formatDate(service.scheduledStartAt)) : null
      ], "status") : null,
      context.refs.marketOrderId ? panel("ORDER", [
        row("Vendor", market.vendorLabel),
        row("Items", formatItemList(market.itemLabels, market.lineCount ? `${market.lineCount} order line${market.lineCount === 1 ? "" : "s"}` : "Order recorded")),
        market.finalTotal > 0 ? row("Total", formatCredits(market.finalTotal)) : null,
        row("Status", formatStatus(market.status, "Recorded"))
      ], "subject") : null,
      (context.refs.billingIntentId || context.refs.billingTransactionId) ? panel("PAYMENT", [
        billing.amount > 0 ? row("Amount", billing.amountLabel) : null,
        row("Status", formatStatus(billing.status, context.status === "AUTHORIZED" ? "Authorized" : "Recorded")),
        row("Method", catalog.paymentSourceLabels?.[billing.paymentSource] || humanize(billing.paymentSource, "Credits")),
        row("Provider", billing.providerLabel)
      ], "finance") : null,
      panel(actionRequired ? "ACTION" : "RESULT", [
        row("Result", resultLabel),
        context.recoveryRequired ? row("Recovery", "Required") : null,
        context.compensationStatus && context.compensationStatus !== "NOT_REQUIRED"
          ? row("Compensation", formatStatus(context.compensationStatus))
          : null,
        actionRequired ? row("Next step", "Open the operation and review the recorded blockers.") : null
      ], actionRequired ? "action" : "status", "wide")
    );

    return {
      resolved: true,
      templateId: template.templateId,
      title: `${operationLabel}: ${statusLabel}`,
      lead: leadByStatus[context.status] || `${operationLabel} status changed to ${statusLabel.toLowerCase()}.`,
      body: actionRequired ? "The operation remains linked to its Market, Service and Billing records for recovery." : "",
      layout: "notice-system",
      panels,
      finalRows: [
        row("Result", resultLabel),
        actionRequired ? row("Action", "Review required") : null
      ].filter(Boolean),
      tags: ["WORLD BRIDGE", humanize(context.operationType).toUpperCase(), context.status, actionRequired ? "ACTION REQUIRED" : "CYBERWARE"],
      subjectLabel: formatItemList(context.itemLabels, "Cyberware operation"),
      providerLabel: service.providerLabel || market.vendorLabel || billing.providerLabel,
      statusLabel
    };
  }

  function buildServiceContent(input = {}, template = {}) {
    const context = getServiceContext(input);
    const eventCode = normalizeEventCode(input.eventCode);
    const statusLabel = formatStatus(context.status);
    const resultDescription = context.resultCode ? formatReason(context.resultCode, humanize(context.resultCode)) : "";
    const lead = eventCode.endsWith(".SCHEDULED")
      ? `${context.name} has been scheduled.`
      : eventCode.endsWith(".COMPLETED")
        ? `${context.name} completed successfully.`
        : eventCode.endsWith(".FAILED")
          ? `${context.name} could not be completed.`
          : eventCode.endsWith(".CANCELLED")
            ? `${context.name} was cancelled.`
            : `${context.name} was updated.`;
    const actionRequired = eventCode.endsWith(".FAILED");

    return {
      resolved: true,
      templateId: template.templateId,
      title: `${context.name}: ${statusLabel}`,
      lead,
      layout: "notice-system",
      panels: compactPanels(
        panel("SERVICE", [
          row("Procedure", context.name),
          row("Provider", context.providerLabel),
          row("Status", statusLabel)
        ], "subject"),
        context.itemLabels.length ? panel("SUBJECT", [
          row(context.itemLabels.length > 1 ? "Items" : "Item", formatItemList(context.itemLabels))
        ], "subject") : null,
        (context.scheduledStartAt || context.completedAt) ? panel("SCHEDULE", [
          context.scheduledStartAt ? row("Scheduled", formatDate(context.scheduledStartAt)) : null,
          context.completedAt ? row("Completed", formatDate(context.completedAt)) : null
        ], "status") : null,
        context.paymentStatus ? panel("PAYMENT", [
          row("Status", formatStatus(context.paymentStatus))
        ], "finance") : null,
        (context.resultCode || actionRequired) ? panel(actionRequired ? "ACTION" : "RESULT", [
          context.resultCode ? row("Outcome", resultDescription) : null,
          actionRequired ? row("Next step", "Open the service order and review the failure details.") : null
        ], actionRequired ? "action" : "status", "wide") : null
      ),
      finalRows: [
        row("Status", statusLabel),
        actionRequired ? row("Action", "Review required") : null
      ].filter(Boolean),
      tags: ["SERVICE", context.status, actionRequired ? "ACTION REQUIRED" : "ORDER"],
      actions: [{
        actionId: "OPEN_SERVICE_ORDER",
        label: "OPEN SERVICE",
        routeId: "SERVICE_ORDER",
        module: "service",
        entityRef: context.serviceOrderId ? { type: "SERVICE_ORDER", id: context.serviceOrderId } : null,
        params: context.serviceOrderId ? { serviceOrderId: context.serviceOrderId } : {}
      }],
      subjectLabel: formatItemList(context.itemLabels, context.name),
      providerLabel: context.providerLabel,
      statusLabel
    };
  }

  function getSubscriptionEffect(eventCode = "", context = {}) {
    if (eventCode === "SUBSCRIPTION.CONTRACT.CREATED") return "Coverage is active under the recorded contract terms.";
    if (eventCode === "SUBSCRIPTION.CONTRACT.CANCELLED") return "The contract no longer provides entitlement.";
    if (eventCode === "SUBSCRIPTION.BILLING.FAILED") return "Entitlement may be restricted until the outstanding payment is resolved.";
    if (eventCode === "SUBSCRIPTION.CONTRACT.SUSPENDED") return "The subscription entitlement is currently unavailable.";
    if (eventCode === "SUBSCRIPTION.CONTRACT.RESTORED") return "The subscription entitlement is available again.";
    if (context.allowed === false) return "The entitlement is currently unavailable for the covered target.";
    if (context.allowed === true) return "The entitlement is available for the covered target.";
    return "The entitlement terms have changed.";
  }

  function buildSubscriptionContent(input = {}, template = {}) {
    const context = getSubscriptionContext(input);
    const eventCode = normalizeEventCode(input.eventCode);
    const title = context.tierLabel && context.tierLabel !== "Plan tier"
      ? `${context.title} — ${context.tierLabel}`
      : context.title;
    const status = context.contractStatus || context.entitlementStatus || "UPDATED";
    const statusLabel = formatStatus(status);
    const actionRequired = [
      "SUBSCRIPTION.BILLING.FAILED",
      "SUBSCRIPTION.CONTRACT.SUSPENDED"
    ].includes(eventCode) || context.allowed === false;
    const effect = getSubscriptionEffect(eventCode, context);
    const leadByEvent = {
      "SUBSCRIPTION.CONTRACT.CREATED": `${title} contract was created.`,
      "SUBSCRIPTION.ENTITLEMENT.CHANGED": `${title} entitlement changed.`,
      "SUBSCRIPTION.CONTRACT.CANCELLED": `${title} contract was cancelled.`,
      "SUBSCRIPTION.BILLING.FAILED": `${title} could not be charged.`,
      "SUBSCRIPTION.CONTRACT.SUSPENDED": `${title} was suspended.`,
      "SUBSCRIPTION.CONTRACT.RESTORED": `${title} was restored.`
    };

    return {
      resolved: true,
      templateId: template.templateId,
      title,
      lead: leadByEvent[eventCode] || `${title} was updated.`,
      layout: "notice-system",
      panels: compactPanels(
        panel("CONTRACT", [
          row("Plan", context.title),
          context.tierLabel ? row("Tier", context.tierLabel) : null,
          row("Provider", context.providerLabel),
          row("Status", formatStatus(context.contractStatus, statusLabel))
        ], "subject"),
        panel("COVERAGE", [
          row("Target", context.targetLabel),
          context.entitlementStatus ? row("Entitlement", formatStatus(context.entitlementStatus)) : null,
          context.entitlementCodes.length ? row("Includes", context.entitlementCodes.map((code) => humanize(code)).slice(0, 3).join(", ")) : null
        ], "status"),
        (context.billingStatus || eventCode === "SUBSCRIPTION.BILLING.FAILED") ? panel("BILLING", [
          row("Status", formatStatus(context.billingStatus, eventCode === "SUBSCRIPTION.BILLING.FAILED" ? "Failed" : "Recorded")),
          context.reasonCode ? row("Reason", formatReason(context.reasonCode)) : null
        ], eventCode === "SUBSCRIPTION.BILLING.FAILED" ? "warning" : "finance") : null,
        panel(actionRequired ? "ACTION" : "EFFECT", [
          row("Effect", effect),
          actionRequired ? row("Next step", "Open Subscriptions and resolve the contract or billing issue.") : null
        ], actionRequired ? "action" : "status", "wide")
      ),
      finalRows: [
        row("Effect", effect),
        actionRequired ? row("Action", "Review required") : null
      ].filter(Boolean),
      tags: ["SUBSCRIPTION", eventCode.split(".").pop(), actionRequired ? "ACTION REQUIRED" : status],
      actions: [{
        actionId: "OPEN_SUBSCRIPTION_CONTRACT",
        label: "OPEN SUBSCRIPTIONS",
        routeId: "SUBSCRIPTION_CONTRACT",
        module: "subscriptions",
        entityRef: context.contractId ? { type: "SUBSCRIPTION_CONTRACT", id: context.contractId } : null,
        params: context.contractId ? { subscriptionContractId: context.contractId } : {}
      }],
      subjectLabel: context.targetLabel,
      providerLabel: context.providerLabel,
      statusLabel
    };
  }

  function buildMarketContent(input = {}, template = {}) {
    const context = getMarketContext(input);
    const eventCode = normalizeEventCode(input.eventCode);
    const titleByEvent = {
      "MARKET.ORDER.COMPLETED": "Market order completed",
      "MARKET.ORDER.CANCELLED": "Market order cancelled",
      "MARKET.ORDER.FAILED": "Market order failed",
      "MARKET.ORDER.REFUND_REQUESTED": "Refund request submitted",
      "MARKET.ORDER.REFUNDED": "Market order refunded",
      "MARKET.ORDER.RECOVERY_REQUIRED": "Market order recovery required"
    };
    const statusByEvent = {
      "MARKET.ORDER.COMPLETED": "Completed",
      "MARKET.ORDER.CANCELLED": "Cancelled",
      "MARKET.ORDER.FAILED": "Failed",
      "MARKET.ORDER.REFUND_REQUESTED": "Refund requested",
      "MARKET.ORDER.REFUNDED": "Refunded",
      "MARKET.ORDER.RECOVERY_REQUIRED": "Recovery required"
    };
    const fulfillmentLabels = {
      DELIVER_TO_HOUSING: "Housing delivery",
      PICKUP: "Vendor pickup",
      PURCHASE_WITH_SERVICE: "Purchase with service",
      MIXED: "Mixed fulfillment"
    };
    const actionRequired = ["MARKET.ORDER.REFUND_REQUESTED", "MARKET.ORDER.RECOVERY_REQUIRED", "MARKET.ORDER.FAILED"].includes(eventCode);
    const failureReason = formatReason(context.failureCode, eventCode === "MARKET.ORDER.RECOVERY_REQUIRED"
      ? "The order requires recovery before it can continue."
      : "The order could not be completed.");
    const lead = eventCode === "MARKET.ORDER.COMPLETED"
      ? `${context.itemSummary} was completed by ${context.vendorLabel}.`
      : eventCode === "MARKET.ORDER.CANCELLED"
        ? `${context.itemSummary} was cancelled.`
        : eventCode === "MARKET.ORDER.REFUND_REQUESTED"
          ? `A refund request was submitted for ${context.itemSummary}.`
          : eventCode === "MARKET.ORDER.REFUNDED"
            ? `${context.totalLabel} was refunded for ${context.itemSummary}.`
            : eventCode === "MARKET.ORDER.RECOVERY_REQUIRED"
              ? `${context.itemSummary} requires recovery.`
              : `${context.itemSummary} could not be completed.`;

    return {
      resolved: true,
      templateId: template.templateId,
      title: titleByEvent[eventCode] || "Market order update",
      lead,
      layout: "notice-system",
      panels: compactPanels(
        panel("ORDER", [
          row("Items", context.itemSummary),
          context.totalQuantity ? row("Quantity", String(context.totalQuantity)) : null,
          row("Vendor", context.vendorLabel),
          row("Total", context.totalLabel)
        ], "subject"),
        panel("FULFILLMENT", [
          row("Method", fulfillmentLabels[context.fulfillmentMode] || formatStatus(context.fulfillmentMode, "Standard fulfillment")),
          row("Destination", context.destinationLabel),
          context.deliveryStatus !== "NOT_REQUIRED" ? row("Delivery", formatStatus(context.deliveryStatus)) : null,
          context.pickupStatus !== "NOT_REQUIRED" ? row("Pickup", formatStatus(context.pickupStatus)) : null,
          context.serviceStatus !== "NOT_REQUIRED" ? row("Service", formatStatus(context.serviceStatus)) : null
        ], "status"),
        panel(eventCode === "MARKET.ORDER.RECOVERY_REQUIRED" ? "RECOVERY" : "RESULT", [
          row("Status", statusByEvent[eventCode] || formatStatus(context.status)),
          context.paymentStatus ? row("Payment", formatStatus(context.paymentStatus)) : null,
          eventCode === "MARKET.ORDER.REFUND_REQUESTED" ? row("Next step", "Open Market Orders to review or withdraw the request.") : null,
          eventCode === "MARKET.ORDER.RECOVERY_REQUIRED" ? row("Reason", failureReason) : null,
          eventCode === "MARKET.ORDER.RECOVERY_REQUIRED" ? row("Next step", "Open Market Orders and retry the interrupted action.") : null,
          eventCode === "MARKET.ORDER.FAILED" ? row("Reason", failureReason) : null
        ], actionRequired ? "warning" : "status", "wide")
      ),
      finalRows: [
        row("Result", statusByEvent[eventCode] || formatStatus(context.status)),
        actionRequired ? row("Action", "Review Market Orders") : null
      ].filter(Boolean),
      tags: ["MARKET", eventCode.split(".").pop(), actionRequired ? "ACTION REQUIRED" : "ORDER"],
      actions: [{
        actionId: "OPEN_MARKET_ORDER",
        label: "OPEN MARKET",
        routeId: "MARKET_ORDER",
        module: "market",
        panel: "orders",
        section: "orders",
        entityRef: context.marketOrderId ? { type: "MARKET_ORDER", id: context.marketOrderId } : null,
        params: context.marketOrderId ? { marketOrderId: context.marketOrderId } : {}
      }],
      subjectLabel: context.itemSummary,
      providerLabel: context.vendorLabel,
      statusLabel: statusByEvent[eventCode] || formatStatus(context.status)
    };
  }

  function buildHousingShipmentContent(input = {}, template = {}) {
    const context = getHousingShipmentContext(input);
    const eventCode = normalizeEventCode(input.eventCode);
    const isDelivered = eventCode === "HOUSING.SHIPMENT.DELIVERED";
    const isCapacityWarning = eventCode === "HOUSING.STORAGE.CAPACITY_WARNING";
    const actionRequired = !isDelivered;
    const statusLabel = isDelivered ? "Delivered" : isCapacityWarning ? "Storage capacity required" : "Held";
    const reasonCode = context.holdReason || context.lastErrorCode;
    const reason = formatReason(
      reasonCode,
      isCapacityWarning
        ? "The destination storage does not have enough free space for this shipment."
        : "The shipment cannot be delivered until the recorded Housing issue is resolved."
    );
    const title = isDelivered
      ? "Shipment delivered"
      : isCapacityWarning
        ? "Housing storage capacity required"
        : "Shipment held";
    const lead = isDelivered
      ? `${context.itemSummary} was delivered to ${context.storageLabel}.`
      : isCapacityWarning
        ? `Delivery of ${context.itemSummary} is waiting for free space in ${context.storageLabel}.`
        : `Delivery of ${context.itemSummary} has been held.`;
    const destinationSection = isCapacityWarning ? "STORAGE" : "DELIVERIES";

    return {
      resolved: true,
      templateId: template.templateId,
      title,
      lead,
      body: actionRequired ? "The shipment remains linked to its Market order and Housing destination." : "",
      layout: "notice-system",
      panels: compactPanels(
        panel("SHIPMENT", [
          row(context.itemLabels.length > 1 ? "Items" : "Item", context.itemSummary),
          row("Delivery service", context.providerLabel),
          row("Status", statusLabel)
        ], "subject"),
        panel("DESTINATION", [
          row("Housing", context.housingLabel),
          row("Storage", context.storageLabel),
          row("Address", context.destinationAddress)
        ], "status"),
        panel(actionRequired ? "ACTION" : "RESULT", [
          isDelivered && context.deliveredAt ? row("Delivered", formatDate(context.deliveredAt)) : null,
          !isDelivered && context.heldAt ? row("Held since", formatDate(context.heldAt)) : null,
          actionRequired ? row("Reason", reason) : row("Result", "Stored in the assigned Housing destination"),
          isCapacityWarning ? row("Next step", "Free storage space or select another valid Housing storage, then retry delivery.") : null,
          eventCode === "HOUSING.SHIPMENT.HELD" ? row("Next step", "Open Housing deliveries and review the blocked shipment.") : null
        ], actionRequired ? "action" : "status", "wide")
      ),
      finalRows: [
        row("Result", statusLabel),
        actionRequired ? row("Action", isCapacityWarning ? "Free Housing storage capacity" : "Review Housing delivery") : null
      ].filter(Boolean),
      tags: ["HOUSING", isCapacityWarning ? "STORAGE" : "SHIPMENT", actionRequired ? "ACTION REQUIRED" : "DELIVERED"],
      actions: [{
        actionId: isCapacityWarning ? "OPEN_HOUSING_STORAGE" : "OPEN_HOUSING_DELIVERIES",
        label: isCapacityWarning ? "OPEN STORAGE" : "OPEN HOUSING",
        routeId: isCapacityWarning ? "HOUSING_STORAGE" : "HOUSING_DELIVERY",
        module: "housing",
        section: destinationSection.toLowerCase(),
        entityRef: isCapacityWarning && context.storageId
          ? { type: "HOUSING_STORAGE", id: context.storageId }
          : context.shipmentId
            ? { type: "MARKET_SHIPMENT", id: context.shipmentId }
            : null,
        params: {
          housingTab: destinationSection,
          housingStorageId: context.storageId,
          shipmentId: context.shipmentId,
          marketOrderId: context.marketOrderId
        }
      }],
      subjectLabel: context.itemSummary,
      providerLabel: context.providerLabel,
      statusLabel
    };
  }

  function buildBillingContent(input = {}, template = {}) {
    const context = getBillingContext(input);
    const eventCode = normalizeEventCode(input.eventCode);
    const sourceDescription = resolveSourceDescription(context.sourceDomain, context.sourceRefId, input);
    const titleByEvent = {
      "BILLING.PAYMENT.AUTHORIZED": "Payment authorized",
      "BILLING.PAYMENT.CAPTURED": "Payment completed",
      "BILLING.PAYMENT.FAILED": "Payment failed",
      "BILLING.PAYMENT.REFUNDED": "Payment refunded",
      "BILLING.PAYMENT_RECOVERY_REQUIRED": "Payment recovery required"
    };
    const statusByEvent = {
      "BILLING.PAYMENT.AUTHORIZED": "Authorized",
      "BILLING.PAYMENT.CAPTURED": "Captured",
      "BILLING.PAYMENT.FAILED": "Failed",
      "BILLING.PAYMENT.REFUNDED": "Refunded",
      "BILLING.PAYMENT_RECOVERY_REQUIRED": "Recovery required"
    };
    const actionRequired = ["BILLING.PAYMENT.FAILED", "BILLING.PAYMENT_RECOVERY_REQUIRED"].includes(eventCode);
    const inputSummary = text(input.summary);
    const projectedInputReason = inputSummary
      ? (/^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(inputSummary) ? formatReason(inputSummary) : inputSummary)
      : "";
    const failureReason = context.failureMessage
      || projectedInputReason
      || formatReason(context.failureCode || input.templateData?.reasonCode, "The payment could not be completed.");
    const lead = eventCode === "BILLING.PAYMENT.AUTHORIZED"
      ? `${context.amountLabel} was reserved for ${sourceDescription}.`
      : eventCode === "BILLING.PAYMENT.CAPTURED"
        ? `${context.amountLabel} was paid for ${sourceDescription}.`
        : eventCode === "BILLING.PAYMENT.REFUNDED"
          ? `${context.amountLabel} was returned for ${sourceDescription}.`
          : eventCode === "BILLING.PAYMENT_RECOVERY_REQUIRED"
            ? `${sourceDescription} requires payment recovery.`
            : `${sourceDescription} could not be paid.`;

    return {
      resolved: true,
      templateId: template.templateId,
      title: titleByEvent[eventCode] || "Billing update",
      lead,
      layout: "notice-system",
      panels: compactPanels(
        panel("PAYMENT", [
          row("Amount", context.amountLabel),
          row("Status", statusByEvent[eventCode] || formatStatus(context.status, "Recorded")),
          row("Method", catalog.paymentSourceLabels?.[context.paymentSource] || humanize(context.paymentSource, "Credits"))
        ], "finance"),
        panel("DETAILS", [
          row("For", sourceDescription),
          row("Provider", context.providerLabel)
        ], "subject"),
        actionRequired ? panel(eventCode === "BILLING.PAYMENT_RECOVERY_REQUIRED" ? "RECOVERY" : "FAILED PAYMENT", [
          row("Reason", failureReason),
          row("Next step", "Open Billing and review the outstanding payment record.")
        ], "warning", "wide") : null
      ),
      finalRows: [
        row("Result", statusByEvent[eventCode] || formatStatus(context.status, "Recorded")),
        actionRequired ? row("Action", "Review required") : null
      ].filter(Boolean),
      tags: ["BILLING", eventCode.split(".").pop(), actionRequired ? "ACTION REQUIRED" : "PAYMENT"],
      actions: [{
        actionId: "OPEN_BILLING_RECORD",
        label: "OPEN BILLING",
        routeId: "BILLING_RECORD",
        module: "terminal-hub",
        panel: "billing",
        section: "transactions",
        entityRef: context.transactionId
          ? { type: "BILLING_TRANSACTION", id: context.transactionId }
          : context.intentId
            ? { type: "BILLING_INTENT", id: context.intentId }
            : null,
        params: {
          billingTransactionId: context.transactionId,
          billingIntentId: context.intentId
        }
      }],
      subjectLabel: sourceDescription,
      providerLabel: context.providerLabel,
      statusLabel: statusByEvent[eventCode] || formatStatus(context.status, "Recorded")
    };
  }

  function resolveNotificationContent(input = {}) {
    const eventCode = normalizeEventCode(input.eventCode);
    const template = catalog.templates?.[eventCode] || null;
    if (!template) return { ok: true, resolved: false, reason: "NOTIFICATION_CONTENT_TEMPLATE_NOT_FOUND", eventCode };

    try {
      let content = null;
      if (template.kind === "WORLD_OPERATION") content = buildWorldOperationContent(input, template);
      if (template.kind === "MARKET_ORDER") content = buildMarketContent(input, template);
      if (template.kind === "HOUSING_SHIPMENT") content = buildHousingShipmentContent(input, template);
      if (template.kind === "SERVICE_ORDER") content = buildServiceContent(input, template);
      if (template.kind === "SUBSCRIPTION") content = buildSubscriptionContent(input, template);
      if (template.kind === "BILLING") content = buildBillingContent(input, template);
      if (!content) return { ok: true, resolved: false, reason: "NOTIFICATION_CONTENT_TEMPLATE_KIND_UNSUPPORTED", eventCode, template: clone(template) };
      return { ok: true, ...content };
    } catch (error) {
      pushDiagnostic("ERROR", "NOTIFICATION_CONTENT_RESOLUTION_FAILED", {
        eventCode,
        templateId: template.templateId || "",
        message: error?.message || String(error)
      });
      return { ok: false, resolved: false, reason: "NOTIFICATION_CONTENT_RESOLUTION_FAILED", eventCode };
    }
  }

  function validateNotificationContentProjection(options = {}) {
    const eventCodes = Array.isArray(options.eventCodes) && options.eventCodes.length
      ? options.eventCodes.map((value) => normalizeEventCode(value)).filter(Boolean)
      : Object.keys(catalog.templates || {});
    const missingTemplates = eventCodes.filter((eventCode) => !catalog.templates?.[eventCode]);
    const invalidTemplates = eventCodes.filter((eventCode) => {
      const definition = catalog.templates?.[eventCode];
      return !definition?.templateId || !["WORLD_OPERATION", "MARKET_ORDER", "HOUSING_SHIPMENT", "SERVICE_ORDER", "SUBSCRIPTION", "BILLING"].includes(definition?.kind);
    });
    const result = {
      ok: missingTemplates.length === 0 && invalidTemplates.length === 0,
      version: catalog.version || "",
      schemaVersion: Number(catalog.schemaVersion || 0),
      templateCount: Object.keys(catalog.templates || {}).length,
      checkedEventCodes: eventCodes,
      missingTemplates,
      invalidTemplates,
      diagnostics: clone(diagnostics)
    };
    if (!result.ok) pushDiagnostic("ERROR", "NOTIFICATION_CONTENT_TEMPLATE_VALIDATION_FAILED", result);
    return result;
  }

  app.resolveNotificationContent = resolveNotificationContent;
  app.getNotificationContentTemplate = (eventCode = "") => clone(catalog.templates?.[normalizeEventCode(eventCode)] || null);
  app.getNotificationContentProjectionDiagnostics = () => clone(diagnostics);
  app.validateNotificationContentProjection = validateNotificationContentProjection;
  app.NOTIFICATION_CONTENT_PROJECTION_VERSION = catalog.version || "terminal_notification_content_projection_2_5x";
})();
