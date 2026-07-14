window.WS_APP = window.WS_APP || {};

(function initSubscriptionNotificationProducer() {
  const app = window.WS_APP;
  const diagnostics = [];

  function clone(value) {
    if (value === undefined) return undefined;
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function token(value = "", fallback = "") {
    const normalized = String(value || fallback)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return normalized || fallback;
  }

  function pushDiagnostic(level, code, detail = {}) {
    const record = {
      level: token(level, "WARNING"),
      code: token(code, "SUBSCRIPTION_NOTIFICATION_WARNING"),
      detail: clone(detail),
      at: new Date().toISOString()
    };
    diagnostics.push(record);
    if (diagnostics.length > 200) diagnostics.splice(0, diagnostics.length - 200);
    return record;
  }

  function getContract(detail = {}) {
    return app.getSubscriptionContract?.(detail.subscriptionContractId) || null;
  }

  function getContractTitle(contract = {}, detail = {}) {
    return String(
      contract.displaySnapshot?.title
      || contract.title
      || detail.subscriptionCatalogId
      || "Subscription"
    ).trim();
  }

  function getEventCode(eventName = "", detail = {}) {
    if (eventName === "ws:subscription-created") return "SUBSCRIPTION.CONTRACT.CREATED";
    if (eventName === "ws:subscription-billing-failed") return "SUBSCRIPTION.BILLING.FAILED";
    if (eventName === "ws:subscription-cancelled") return "SUBSCRIPTION.CONTRACT.CANCELLED";
    if (eventName !== "ws:subscription-entitlement-changed") return "";

    const previousStatus = token(detail.previousEntitlementStatus, "NOT_FOUND");
    const status = token(detail.entitlementStatus, "NOT_FOUND");
    if (previousStatus === "NOT_FOUND") return "";
    if (status === "CANCELLED") return "";
    if (status === "SUSPENDED") return "SUBSCRIPTION.CONTRACT.SUSPENDED";
    if (previousStatus === "SUSPENDED" && detail.allowed === true) return "SUBSCRIPTION.CONTRACT.RESTORED";
    return "SUBSCRIPTION.ENTITLEMENT.CHANGED";
  }

  function getSummary(eventCode = "", contract = {}, detail = {}) {
    const title = getContractTitle(contract, detail);
    if (eventCode === "SUBSCRIPTION.CONTRACT.CREATED") {
      return `${title} contract created.`;
    }
    if (eventCode === "SUBSCRIPTION.CONTRACT.CANCELLED") {
      return `${title} contract cancelled.`;
    }
    if (eventCode === "SUBSCRIPTION.BILLING.FAILED") {
      return `${title} billing failed: ${token(detail.reasonCode, "SUBSCRIPTION_BILLING_FAILED")}.`;
    }
    if (eventCode === "SUBSCRIPTION.CONTRACT.SUSPENDED") {
      return `${title} contract suspended. Entitlement is unavailable.`;
    }
    if (eventCode === "SUBSCRIPTION.CONTRACT.RESTORED") {
      return `${title} entitlement restored.`;
    }
    return `${title} entitlement changed from ${token(detail.previousEntitlementStatus, "NOT_FOUND")} to ${token(detail.entitlementStatus, "NOT_FOUND")}.`;
  }

  function getSeverity(eventCode = "", detail = {}) {
    if (eventCode === "SUBSCRIPTION.BILLING.FAILED") return "WARNING";
    if (eventCode === "SUBSCRIPTION.CONTRACT.SUSPENDED") return "CRITICAL";
    if (eventCode === "SUBSCRIPTION.CONTRACT.CANCELLED") return "NOTICE";
    if (detail.allowed === false && detail.previousAllowed === true) return "WARNING";
    return "";
  }

  function emitSubscriptionNotification(eventName = "", detail = {}) {
    if (app.__subscriptionSuppressNotifications === true) {
      return { ok: true, skipped: true, reason: "SUBSCRIPTION_NOTIFICATION_SUPPRESSED" };
    }

    const eventCode = getEventCode(eventName, detail);
    if (!eventCode) return { ok: true, skipped: true, reason: "SUBSCRIPTION_EVENT_NOT_MAPPED" };
    if (typeof window.TerminalNotifications?.emit !== "function") {
      pushDiagnostic("WARNING", "SUBSCRIPTION_NOTIFICATION_API_UNAVAILABLE", {
        eventName,
        eventCode,
        subscriptionContractId: detail.subscriptionContractId || ""
      });
      return { ok: false, reason: "SUBSCRIPTION_NOTIFICATION_API_UNAVAILABLE" };
    }

    const contract = getContract(detail) || {};
    const providerId = String(detail.providerId || contract.providerId || "").trim();
    const citizenId = String(detail.citizenId || contract.citizenId || "").trim();
    const subscriptionContractId = String(detail.subscriptionContractId || contract.subscriptionContractId || "").trim();
    if (!providerId || !citizenId || !subscriptionContractId) {
      pushDiagnostic("ERROR", "SUBSCRIPTION_NOTIFICATION_IDENTITY_INCOMPLETE", {
        eventName,
        eventCode,
        providerId,
        citizenId,
        subscriptionContractId
      });
      return { ok: false, reason: "SUBSCRIPTION_NOTIFICATION_IDENTITY_INCOMPLETE" };
    }

    const target = detail.coverageTarget || contract.coverageTarget || null;
    const relatedRefs = target?.type === "ITEM_INSTANCE" && target?.id
      ? [{ type: "ITEM_INSTANCE", id: target.id }]
      : [];
    const result = window.TerminalNotifications.emit({
      eventCode,
      eventId: String(detail.eventId || "").trim(),
      citizenId,
      providerId,
      subjectRef: { type: "SUBSCRIPTION_CONTRACT", id: subscriptionContractId },
      relatedRefs,
      correlationId: subscriptionContractId,
      revision: Math.max(1, Number(detail.revision || contract.revision || 1)),
      title: getContractTitle(contract, detail),
      summary: getSummary(eventCode, contract, detail),
      severity: getSeverity(eventCode, detail) || undefined,
      occurredAt: detail.occurredAt || "",
      data: {
        subscriptionContractId,
        subscriptionCatalogId: detail.subscriptionCatalogId || contract.subscriptionCatalogId || "",
        providerId,
        organizationId: detail.organizationId || contract.organizationId || "",
        tierId: contract.tierId || "",
        contractStatus: detail.contractStatus || contract.contractStatus || "",
        previousContractStatus: detail.previousContractStatus || "",
        billingStatus: detail.billingStatus || contract.billingStatus || "",
        previousBillingStatus: detail.previousBillingStatus || "",
        entitlementStatus: detail.entitlementStatus || contract.entitlementStatus || "",
        previousEntitlementStatus: detail.previousEntitlementStatus || "",
        allowed: detail.allowed === true,
        previousAllowed: detail.previousAllowed === true,
        entitlementCodes: clone(detail.entitlementCodes || []),
        coverageRuleIds: clone(detail.coverageRuleIds || []),
        coverageTarget: clone(target),
        changedFields: clone(detail.changedFields || []),
        reasonCode: detail.reasonCode || "",
        contractRevision: Number(detail.revision || contract.revision || 0),
        catalogRevision: Number(detail.catalogRevision || 0),
        tierRevision: Number(detail.tierRevision || 0)
      },
      links: [{
        label: "OPEN SUBSCRIPTIONS",
        module: "subscriptions",
        panel: ""
      }],
      createdBy: "SUBSCRIPTIONS",
      audience: ["PLAYER"]
    });

    if (!result?.ok) {
      pushDiagnostic("ERROR", "SUBSCRIPTION_NOTIFICATION_EMIT_FAILED", {
        eventName,
        eventCode,
        subscriptionContractId,
        providerId,
        error: result?.error || null
      });
    }
    return result || { ok: false, reason: "SUBSCRIPTION_NOTIFICATION_EMIT_FAILED" };
  }

  function handleDomainEvent(event) {
    emitSubscriptionNotification(event?.type || "", event?.detail || {});
  }

  function installListeners() {
    if (app.__subscriptionNotificationProducerInstalled === true) return false;
    [
      "ws:subscription-created",
      "ws:subscription-entitlement-changed",
      "ws:subscription-billing-failed",
      "ws:subscription-cancelled"
    ].forEach((eventName) => window.addEventListener?.(eventName, handleDomainEvent));
    app.__subscriptionNotificationProducerInstalled = true;
    return true;
  }

  app.emitSubscriptionNotification = emitSubscriptionNotification;
  app.getSubscriptionNotificationProducerDiagnostics = () => clone(diagnostics);
  installListeners();
})();
