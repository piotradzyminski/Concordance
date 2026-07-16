window.WS_APP = window.WS_APP || {};

(function initCitizenSubscriptionAdapterFactory() {
  const app = window.WS_APP;
  const ADAPTER_VERSION = "citizen_subscription_adapter_1_2x";

  if (typeof app.createCitizenSubscriptionAdapter === "function") return;

  function requireFunction(dependencies, name) {
    const value = dependencies?.[name];
    if (typeof value !== "function") {
      throw new Error(`Citizen Subscription Adapter requires dependency: ${name}.`);
    }
    return value;
  }

  function createCitizenSubscriptionAdapter(dependencies = {}) {
    const clone = requireFunction(dependencies, "clone");
    const normalizeSubscriptions = requireFunction(dependencies, "normalizeSubscriptions");
    const normalizeSubscriptionEntry = requireFunction(dependencies, "normalizeSubscriptionEntry");
    const getSubscriptionContractKey = requireFunction(dependencies, "getSubscriptionContractKey");
    const isSubscriptionContractOpen = requireFunction(dependencies, "isSubscriptionContractOpen");
    const parseCreditNumber = requireFunction(dependencies, "parseCreditNumber");
    const formatCreditLabel = requireFunction(dependencies, "formatCreditLabel");
    const formatChangeCreditLabel = requireFunction(dependencies, "formatChangeCreditLabel");
    const normalizeBillingPaymentSource = requireFunction(dependencies, "normalizeBillingPaymentSource");
    const getDebtAccountStatus = requireFunction(dependencies, "getDebtAccountStatus");
    const addBillingHistoryEntry = requireFunction(dependencies, "addBillingHistoryEntry");
    const emitSubscriptionTerminalEntry = requireFunction(dependencies, "emitSubscriptionTerminalEntry");
    const emitBillingNotification = requireFunction(dependencies, "emitBillingNotification");
    const emitTerminalNotification = requireFunction(dependencies, "emitTerminalNotification");
    const createPanelList = requireFunction(dependencies, "createPanelList");
    const buildNotificationPanel = requireFunction(dependencies, "buildNotificationPanel");
    const buildFinanceAccountRows = requireFunction(dependencies, "buildFinanceAccountRows");
    const getSubscriptionSubtypeForStatus = requireFunction(dependencies, "getSubscriptionSubtypeForStatus");
    const getSubscriptionStatusLabel = requireFunction(dependencies, "getSubscriptionStatusLabel");
    const getAlignedSubscriptionPeriodEndIso = requireFunction(dependencies, "getAlignedSubscriptionPeriodEndIso");
    const getTerminalDateIso = requireFunction(dependencies, "getTerminalDateIso");
    const addDaysIsoLocal = requireFunction(dependencies, "addDaysIsoLocal");
    const isAutoBillableSubscription = requireFunction(dependencies, "isAutoBillableSubscription");
    const hasSettlementBillingHistory = requireFunction(dependencies, "hasSettlementBillingHistory");
    const getWeeklyIncomeSources = requireFunction(dependencies, "getWeeklyIncomeSources");
    const calculateSubscriptionSettlementPaymentPlan = requireFunction(dependencies, "calculateSubscriptionSettlementPaymentPlan");
    const getWeeklyAdditionalCreditTotal = requireFunction(dependencies, "getWeeklyAdditionalCreditTotal");
    const normalizeIncome = requireFunction(dependencies, "normalizeIncome");
    const normalizeIncomeEntry = requireFunction(dependencies, "normalizeIncomeEntry");
    const normalizeServiceLog = requireFunction(dependencies, "normalizeServiceLog");
    const normalizeServiceForm = requireFunction(dependencies, "normalizeServiceForm");
    const normalizeServiceRecord = requireFunction(dependencies, "normalizeServiceRecord");
    const normalizeCitizen = requireFunction(dependencies, "normalizeCitizen");
    const getCitizenStore = requireFunction(dependencies, "getCitizenStore");
    const replaceCitizenStore = requireFunction(dependencies, "replaceCitizenStore");
    const saveCitizenStore = requireFunction(dependencies, "saveCitizenStore");
    const emitCitizenUpdate = requireFunction(dependencies, "emitCitizenUpdate");
    const BILLING_DEBT_ACCOUNT_LIMIT = Math.max(0, Number(dependencies.billingDebtAccountLimit) || 0);

    function getSubscriptionPaymentServiceTitle(subscription = {}) {
      const catalogTitle = window.WS_APP.getSubscriptionCatalogItemById?.(subscription.catalogId)?.title;
      const title = String(catalogTitle || subscription.title || subscription.service || subscription.catalogId || "Subscription").trim();
      const tier = String(subscription.tierLabel || subscription.tierName || subscription.tierId || "").trim();
      if (tier && title.toLowerCase().endsWith(` / ${tier}`.toLowerCase())) {
        return title.slice(0, -(` / ${tier}`).length).trim() || title;
      }
      return title;
    }
    function buildSubscriptionPaymentDetailRows(citizen = {}, result = {}) {
      const subscriptions = normalizeSubscriptions(citizen.subscriptions);
      const byId = new Map(subscriptions.map((subscription) => [String(subscription.id || "").trim(), subscription]));
      const paidIds = (Array.isArray(result.paidIds) ? result.paidIds : []).map((item) => String(item || "").trim()).filter(Boolean);
      const unpaidIds = (Array.isArray(result.unpaidIds) ? result.unpaidIds : []).map((item) => String(item || "").trim()).filter(Boolean);
      const totalItems = paidIds.length + unpaidIds.length;
      const rows = [];

      const appendRows = (subscriptionId, status) => {
        const subscription = byId.get(subscriptionId);
        if (!subscription) return;
        const prefix = totalItems > 1 ? `${status} ` : "";
        const title = getSubscriptionPaymentServiceTitle(subscription);
        const tier = String(subscription.tierLabel || subscription.tierName || subscription.tierId || "N/A").trim() || "N/A";
        const amount = parseCreditNumber(subscription.amount);
        rows.push({ label: `${prefix}Service`, value: title });
        rows.push({ label: `${prefix}Tier`, value: tier });
        rows.push({ label: `${prefix}Cost`, value: amount > 0 ? formatCreditLabel(amount) : "0 ₡" });
      };

      paidIds.forEach((subscriptionId) => appendRows(subscriptionId, "Paid"));
      unpaidIds.forEach((subscriptionId) => appendRows(subscriptionId, "Skipped"));

      return rows;
    }
    function emitSubscriptionPaymentTerminalEntry(citizenId, result = {}, options = {}) {
      const id = String(citizenId || "").trim();
      if (!id || !result?.ok || options.notify === false) return false;

      const total = parseCreditNumber(result.total);
      if (total <= 0) return false;

      const updatedCitizen = result.citizen || window.WS_APP.getCitizenById?.(id) || {};
      const paymentSource = normalizeBillingPaymentSource(result.paymentSource);
      const creditsBefore = parseCreditNumber(options.creditsBefore);
      const creditsAfter = parseCreditNumber(result.credits ?? updatedCitizen.credits);
      const debtIncrease = parseCreditNumber(result.debtIncrease);
      const paidFromCredits = parseCreditNumber(result.paidFromCredits ?? (paymentSource === "DEBT_ACCOUNT" ? 0 : total));
      const debtAfter = parseCreditNumber(result.debtAfter ?? updatedCitizen.debt);
      const debtBefore = parseCreditNumber(result.debtBefore ?? (debtAfter - debtIncrease));
      const paidCount = Number(result.paidCount || 0);
      const unpaidCount = Number(result.unpaidCount || 0);
      const partial = Boolean(result.partial || unpaidCount > 0);
      const actor = String(options.createdBy || window.WS_APP.currentUser?.login || "SYSTEM").trim();

      if (options.recordHistory !== false) {
        addBillingHistoryEntry(id, {
          type: "SUBSCRIPTION_PAYMENT",
          amount: total,
          subscriptionCharge: total,
          paymentSource,
          paidFromCredits,
          debtIncrease,
          creditsAfter,
          debtAfter,
          note: options.note || (paymentSource === "DEBT_ACCOUNT" ? "Subscription payment charged to Debt Account." : partial ? "Partial subscription payment." : "Subscription payment."),
          createdBy: actor
        });
      }

      const subscriptionRows = buildSubscriptionPaymentDetailRows(updatedCitizen, result);
      const paymentRows = [
        { label: "Paid", value: formatCreditLabel(total) },
        { label: "Source", value: paymentSource === "DEBT_ACCOUNT" ? "Debt Account" : "Credits" },
        { label: "Services paid", value: String(paidCount) },
        { label: "Skipped/Overdue", value: String(unpaidCount) }
      ];

      emitBillingNotification(id, {
        subtype: "SUBSCRIPTION_PAYMENT",
        severity: partial ? "WARNING" : "INFO",
        title: partial ? "Subscription payment partially completed" : "Subscription payment completed",
        layout: "record-subscription",
        panels: createPanelList(
          { title: "PAYMENT", rows: paymentRows },
          { title: "ACCOUNT", rows: buildFinanceAccountRows(creditsBefore, creditsAfter) },
          paymentSource === "DEBT_ACCOUNT" ? { title: "DEBT ACCOUNT", rows: [
            { label: "Before", value: formatCreditLabel(debtBefore) },
            { label: "Change", value: formatChangeCreditLabel(debtIncrease) },
            { label: "After", value: `${formatCreditLabel(debtAfter)} / ${formatCreditLabel(BILLING_DEBT_ACCOUNT_LIMIT)}` }
          ] } : null,
          subscriptionRows.length ? { title: "DETAILS", role: "metadata", rows: subscriptionRows } : null
        ),
        links: [
          { label: "OPEN BILLING", module: "terminal-hub", panel: "billing" },
          { label: "OPEN SUBSCRIPTIONS", module: "subscriptions" }
        ],
        createdBy: actor
      });

      return true;
    }
    function addCitizenSubscription(citizenId, subscription = {}) {
      const citizen = window.WS_APP.getCitizenById(citizenId);
      if (!citizen || citizen.recordType === "admin") return null;

      const subscriptions = normalizeSubscriptions(citizen.subscriptions);
      const normalized = normalizeSubscriptionEntry({
        ...clone(subscription),
        citizenId,
        renewalDate: subscription.renewalDate || getAlignedSubscriptionPeriodEndIso(),
        paidUntil: subscription.paidUntil || "",
        endDate: subscription.endDate || getAlignedSubscriptionPeriodEndIso()
      }, subscriptions.length, citizenId);
      const contractValidation = normalized.contractValidation || window.WS_APP.validateSubscriptionContract?.(normalized);
      if (contractValidation && contractValidation.valid === false) {
        window.WS_APP.lastSubscriptionContractError = clone(contractValidation);
        console.warn("W&S rejected invalid subscription contract.", contractValidation, normalized);
        return null;
      }
      window.WS_APP.lastSubscriptionContractError = null;
      const contractKey = getSubscriptionContractKey(normalized);
      const existingIndex = subscriptions.findIndex((item) => (
        isSubscriptionContractOpen(item)
        && getSubscriptionContractKey(item) === contractKey
      ));
      const previousSubscription = existingIndex >= 0 ? subscriptions[existingIndex] : null;
      const nextSubscriptions = existingIndex >= 0
        ? subscriptions
          .filter((item, index) => (
            index === existingIndex
            || !isSubscriptionContractOpen(item)
            || getSubscriptionContractKey(item) !== contractKey
          ))
          .map((item, index) => (
            index === existingIndex
              ? normalizeSubscriptionEntry({
                ...item,
                ...normalized,
                subscriptionContractId: item.subscriptionContractId || item.id,
                id: item.id,
                citizenId,
                startedAt: item.startedAt || item.startDate || normalized.startedAt || normalized.startDate,
                startDate: item.startDate || normalized.startDate,
                cancelledAt: ""
              }, index)
              : item
          ))
        : [...subscriptions, normalized];

      const updated = window.WS_APP.updateCitizen(citizenId, {
        subscriptions: nextSubscriptions
      }, { source: "SUBSCRIPTIONS_STORE" });

      if (updated) {
        const nextSubscription = existingIndex >= 0
          ? normalizeSubscriptions(updated.subscriptions).find((item) => item.id === previousSubscription?.id) || normalized
          : normalized;
        const eventType = existingIndex >= 0 ? "SUBSCRIPTION_TIER_CHANGE" : "SUBSCRIPTION_ACTIVATION";
        const eventTitle = existingIndex >= 0 ? "Subscription tier changed" : "Subscription activated";
        addBillingHistoryEntry(citizenId, {
          type: eventType,
          amount: parseCreditNumber(normalized.amount),
          subscriptionCharge: parseCreditNumber(normalized.amount),
          creditsAfter: parseCreditNumber(updated.credits),
          debtAfter: parseCreditNumber(updated.debt),
          subscriptionId: existingIndex >= 0 ? subscriptions[existingIndex].id : normalized.id,
          note: existingIndex >= 0
            ? `${normalized.title} / ${normalized.tierLabel || "Tier"} applied to existing contract.`
            : `${normalized.title} / ${normalized.tierLabel || "Tier"} activated.`,
          createdBy: normalized.provider || "SYSTEM"
        });

        emitSubscriptionTerminalEntry(citizenId, nextSubscription, {
          subtype: existingIndex >= 0 ? "SUBSCRIPTION_TIER_CHANGED" : "SUBSCRIPTION_ACTIVATED",
          title: eventTitle,
          rows: existingIndex >= 0 && previousSubscription
            ? [["Previous tier", previousSubscription.tierLabel || "-"], ["Previous weekly cost", formatCreditLabel(previousSubscription.amount)]]
            : [],
          createdBy: normalized.provider || "SYSTEM"
        });
      }

      return updated;
    };
    function updateCitizenSubscription(citizenId, subscriptionId, patch = {}, options = {}) {
      const citizen = window.WS_APP.getCitizenById(citizenId);
      if (!citizen || !subscriptionId) return null;

      const normalizedPatch = clone(patch);
      const sourceSubscriptions = normalizeSubscriptions(citizen.subscriptions);
      const targetSource = sourceSubscriptions.find((subscription) => subscription.id === subscriptionId);
      const targetPreview = targetSource
        ? normalizeSubscriptionEntry({
          ...targetSource,
          ...normalizedPatch,
          subscriptionContractId: targetSource.subscriptionContractId || targetSource.id,
          id: targetSource.id,
          citizenId
        }, 0, citizenId)
        : null;
      const targetValidation = targetPreview?.contractValidation || (targetPreview ? window.WS_APP.validateSubscriptionContract?.(targetPreview) : null);
      if (targetValidation && targetValidation.valid === false) {
        window.WS_APP.lastSubscriptionContractError = clone(targetValidation);
        console.warn("W&S rejected invalid subscription contract update.", targetValidation, targetPreview);
        return null;
      }
      window.WS_APP.lastSubscriptionContractError = null;
      const targetContractKey = targetPreview ? getSubscriptionContractKey(targetPreview) : "";

      const subscriptions = sourceSubscriptions
        .filter((subscription) => (
          subscription.id === subscriptionId
          || !targetContractKey
          || !isSubscriptionContractOpen(targetPreview)
          || !isSubscriptionContractOpen(subscription)
          || getSubscriptionContractKey(subscription) !== targetContractKey
        ))
        .map((subscription, index) => (
          subscription.id === subscriptionId
            ? normalizeSubscriptionEntry({
              ...subscription,
              ...normalizedPatch,
              subscriptionContractId: subscription.subscriptionContractId || subscription.id,
              id: subscription.id,
              citizenId
            }, index, citizenId)
            : subscription
        ));

      const updated = window.WS_APP.updateCitizen(citizenId, { subscriptions }, { source: "SUBSCRIPTIONS_STORE" });
      if (!updated || !targetSource || options.notify === false) return updated;

      const targetNext = normalizeSubscriptions(updated.subscriptions).find((subscription) => subscription.id === subscriptionId);
      if (!targetNext) return updated;

      const previousStatus = String(targetSource.status || "").trim().toUpperCase();
      const nextStatus = String(targetNext.status || "").trim().toUpperCase();
      const tierChanged = String(targetSource.tierId || "") !== String(targetNext.tierId || "")
        || String(targetSource.tierLabel || "") !== String(targetNext.tierLabel || "")
        || parseCreditNumber(targetSource.amount) !== parseCreditNumber(targetNext.amount)
        || String(targetSource.title || "") !== String(targetNext.title || "");
      const statusChanged = previousStatus !== nextStatus || targetSource.active !== targetNext.active;

      if (tierChanged) {
        emitSubscriptionTerminalEntry(citizenId, targetNext, {
          subtype: "SUBSCRIPTION_TIER_CHANGED",
          title: "Subscription tier changed",
          rows: [["Previous tier", targetSource.tierLabel || "-"], ["Previous weekly cost", formatCreditLabel(targetSource.amount)]],
          createdBy: options.createdBy || window.WS_APP.currentUser?.login || targetNext.provider || "SYSTEM"
        });
      } else if (statusChanged) {
        const subtype = getSubscriptionSubtypeForStatus(nextStatus);
        emitSubscriptionTerminalEntry(citizenId, targetNext, {
          subtype,
          title: subtype === "SUBSCRIPTION_RESTORED" ? "Subscription restored" : `Subscription ${getSubscriptionStatusLabel(nextStatus).toLowerCase()}`,
          rows: [["Previous status", getSubscriptionStatusLabel(previousStatus)]],
          createdBy: options.createdBy || window.WS_APP.currentUser?.login || targetNext.provider || "SYSTEM"
        });
      }

      return updated;
    };
    function cancelCitizenSubscription(citizenId, subscriptionId, options = {}) {
      const citizen = window.WS_APP.getCitizenById(citizenId);
      if (!citizen || !subscriptionId || citizen.recordType === "admin") return null;

      const subscriptions = normalizeSubscriptions(citizen.subscriptions);
      const target = subscriptions.find((subscription) => subscription.id === subscriptionId);
      if (!target) return null;

      const campaignIso = getTerminalDateIso();
      const status = String(target.status || "PENDING").toUpperCase();
      const startIso = String(target.startDate || "").slice(0, 10);
      const sameDayPendingCancellation = status === "PENDING" && startIso === campaignIso;
      const waiveCharge = options.waiveCharge === true || String(options.source || options.createdBy || "").toUpperCase().includes("ADMIN");
      const cancellationCharge = waiveCharge || sameDayPendingCancellation ? 0 : parseCreditNumber(target.amount);

      let credits = parseCreditNumber(citizen.credits);
      let debt = parseCreditNumber(citizen.debt);
      const paidFromCredits = Math.min(credits, cancellationCharge);
      const debtIncrease = Math.max(0, cancellationCharge - paidFromCredits);
      credits -= paidFromCredits;
      debt += debtIncrease;

      const cancelledSubscriptions = subscriptions.map((subscription, index) => {
        if (subscription.id !== subscriptionId) return subscription;
        return normalizeSubscriptionEntry({
          ...subscription,
          active: false,
          status: "CANCELLED",
          cancelledAt: campaignIso,
          cancellationCharge,
          lastDebtIncrease: debtIncrease
        }, index);
      });

      const updated = window.WS_APP.updateCitizen(citizenId, {
        credits,
        debt,
        subscriptions: cancelledSubscriptions
      }, { source: "SUBSCRIPTION_SETTLEMENT" });

      if (!updated) return null;

      addBillingHistoryEntry(citizenId, {
        type: "SUBSCRIPTION_CANCELLATION",
        amount: cancellationCharge,
        subscriptionCharge: cancellationCharge,
        paidFromCredits,
        debtIncrease,
        creditsAfter: credits,
        debtAfter: debt,
        subscriptionId: target.id,
        note: cancellationCharge > 0
          ? "Subscription cancellation charge: full weekly tier cost."
          : waiveCharge
            ? "Subscription cancelled by admin without cancellation charge."
            : "Pending subscription cancelled on activation day. No charge applied.",
        createdBy: options.createdBy || window.WS_APP.currentUser?.login || "SYSTEM"
      });

      emitSubscriptionTerminalEntry(citizenId, { ...target, status: "CANCELLED", active: false }, {
        subtype: "SUBSCRIPTION_CANCELLED",
        title: cancellationCharge > 0 ? "Subscription cancelled: charge applied" : "Subscription cancelled",
        rows: cancellationCharge > 0
          ? [
            ["Charge", formatCreditLabel(cancellationCharge)],
            ["Paid from credits", formatCreditLabel(paidFromCredits)],
            ["Debt increase", formatChangeCreditLabel(debtIncrease)],
            ["Credits after", formatCreditLabel(credits)],
            ["Debt after", formatCreditLabel(debt)],
            ["Charge rule", "Full weekly tier cost"]
          ]
          : [
            ["Charge", "None"],
            ["Charge rule", waiveCharge ? "Administrative waiver" : "Activation-day pending cancellation"],
            ["Credits after", formatCreditLabel(credits)],
            ["Debt after", formatCreditLabel(debt)]
          ],
        createdBy: options.createdBy || target.provider || "SYSTEM"
      });

      return updated;
    };
    function deleteCitizenSubscription(citizenId, subscriptionId, options = {}) {
      const citizen = window.WS_APP.getCitizenById(citizenId);
      if (!citizen || !subscriptionId) return null;

      const subscriptions = normalizeSubscriptions(citizen.subscriptions);
      const target = subscriptions.find((subscription) => subscription.id === subscriptionId);
      const retained = subscriptions.filter((subscription) => subscription.id !== subscriptionId);

      const updated = window.WS_APP.updateCitizen(citizenId, { subscriptions: retained }, { source: "SUBSCRIPTIONS_STORE" });
      if (updated && target && options.notify !== false) {
        emitSubscriptionTerminalEntry(citizenId, { ...target, status: "TERMINATED", active: false }, {
          subtype: "SUBSCRIPTION_TERMINATED",
          title: "Subscription record removed",
          rows: [["Record state", "Removed from active file"]],
          createdBy: options.createdBy || window.WS_APP.currentUser?.login || "SYSTEM"
        });
      }

      return updated;
    };
    function clearCancelledCitizenSubscriptions(citizenId, options = {}) {
      const citizen = window.WS_APP.getCitizenById(citizenId);
      if (!citizen || citizen.recordType === "admin") return null;

      const subscriptions = normalizeSubscriptions(citizen.subscriptions);
      const removed = subscriptions.filter((subscription) => String(subscription.status || "").toUpperCase() === "CANCELLED");
      const retained = subscriptions.filter((subscription) => String(subscription.status || "").toUpperCase() !== "CANCELLED");

      if (retained.length === subscriptions.length) return citizen;

      const updated = window.WS_APP.updateCitizen(citizenId, { subscriptions: retained }, { source: "SUBSCRIPTIONS_STORE" });
      if (updated && options.notify !== false) {
        emitTerminalNotification(citizenId, {
          type: "SUBSCRIPTION",
          subtype: "SUBSCRIPTION_RECORDS_CLEARED",
          severity: "NOTICE",
          title: "Cancelled subscription records cleared",
          layout: "record-subscription",
          panels: createPanelList(buildNotificationPanel("SUBSCRIPTION", [
            ["Removed records", String(removed.length)],
            ["Record state", "Cleared from local file"]
          ])),
          links: [
            { label: "OPEN SUBSCRIPTIONS", module: "subscriptions" },
            { label: "OPEN BILLING", module: "terminal-hub", panel: "billing" }
          ],
          createdBy: options.createdBy || window.WS_APP.currentUser?.login || "SYSTEM"
        });
      }

      return updated;
    };
    function isPlayerBillingCitizen(citizen = {}, playerCitizenIds = new Set()) {
      if (!citizen || citizen.recordType === "admin") return false;
      if (citizen.playerVisible === true) return true;
      return playerCitizenIds.has(citizen.id);
    }
    function getPlayerBillingCitizenIds() {
      const users = window.WS_APP.getUsers?.({ includeDisabled: false }) || window.APP_DATA?.users || [];
      return new Set((Array.isArray(users) ? users : [])
        .filter((user) => String(user?.role || "").toLowerCase() === "citizen")
        .map((user) => String(user?.citizenId || "").trim())
        .filter(Boolean));
    }
    function processWeeklySubscriptionSettlement(options = {}) {
      const settlementDateIso = String(options.settlementDateIso || window.WS_APP.getSettlementPeriodEndIso?.() || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(settlementDateIso)) {
        return { ok: false, reason: "INVALID_SETTLEMENT_DATE", settlementDateIso };
      }

      const playerCitizenIds = getPlayerBillingCitizenIds();
      const summaries = [];
      let totalIncomeAll = 0;
      let totalDueAll = 0;
      let paidFromCreditsAll = 0;
      let debtIncreaseAll = 0;
      let debtRecoveryAll = 0;
      let chargedSubscriptionsAll = 0;
      let overdueSubscriptionsAll = 0;
      let changed = false;

      const nextCitizenStore = getCitizenStore().map((citizen) => {
        if (!isPlayerBillingCitizen(citizen, playerCitizenIds)) return citizen;
        if (hasSettlementBillingHistory(citizen, settlementDateIso)) return citizen;

        const subscriptions = normalizeSubscriptions(citizen.subscriptions);
        let credits = parseCreditNumber(citizen.credits);
        let debt = parseCreditNumber(citizen.debt);
        let totalDue = 0;
        let paidFromCredits = 0;
        let debtIncrease = 0;
        let debtRecovery = 0;
        let chargedSubscriptions = 0;
        let overdueSubscriptions = 0;
        const settlementIncomeSources = getWeeklyIncomeSources(citizen, settlementDateIso);
        const incomePaid = settlementIncomeSources.reduce((sum, income) => sum + parseCreditNumber(income.amount), 0);
        const creditsBeforeIncome = credits;
        const debtBeforeSettlement = debt;

        if (incomePaid > 0) {
          credits += incomePaid;
          addBillingHistoryEntry(citizen.id, {
            id: `income-${settlementDateIso}-${citizen.id}`,
            date: settlementDateIso,
            type: "INCOME",
            amount: incomePaid,
            income: incomePaid,
            creditsAfter: credits,
            debtAfter: debt,
            note: "Weekly income sources credited during settlement.",
            createdBy: options.source || "SYSTEM"
          });
        }

        const paymentPlan = calculateSubscriptionSettlementPaymentPlan(subscriptions, credits, debt, settlementDateIso);
        const paymentBySubscriptionId = new Map(paymentPlan.subscriptionPayments.map((payment) => [String(payment.id || "").trim(), payment]));
        credits = paymentPlan.creditsAfterSubscriptions;
        debt = paymentPlan.debtAfterSubscriptions;
        totalDue = paymentPlan.totalDue;
        paidFromCredits = paymentPlan.paidFromCredits;
        debtIncrease = paymentPlan.debtIncrease;
        chargedSubscriptions = paymentPlan.chargedSubscriptions;
        overdueSubscriptions = paymentPlan.overdueSubscriptions;

        const updatedSubscriptions = subscriptions.map((subscription, index) => {
          if (!isAutoBillableSubscription(subscription, settlementDateIso)) return subscription;

          const payment = paymentBySubscriptionId.get(String(subscription.id || "").trim()) || {};
          const amount = parseCreditNumber(subscription.amount);
          const paidAmount = parseCreditNumber(payment.paidFromCredits);
          const debtCharge = parseCreditNumber(payment.debtIncrease);
          const paidInFull = payment.paidInFull === true;
          const nextBillingDate = addDaysIsoLocal(settlementDateIso, 7);
          const history = Array.isArray(subscription.billingHistory) ? clone(subscription.billingHistory) : [];
          const unpaidStatus = String(payment.status || (["PENDING", "SUSPENDED"].includes(String(subscription.status || "PENDING").toUpperCase()) ? "SUSPENDED" : "OVERDUE")).toUpperCase();

          history.push({
            id: `bill-${settlementDateIso}-${subscription.id}`,
            date: settlementDateIso,
            campaignDate: String(options.campaignDateIso || window.WS_APP.getCampaignDateIso?.() || settlementDateIso),
            amount,
            paidFromCredits: paidAmount,
            debtIncrease: debtCharge,
            status: paidInFull ? "PAID" : unpaidStatus,
            type: "WEEKLY_SETTLEMENT"
          });

          return normalizeSubscriptionEntry({
            ...subscription,
            status: paidInFull ? "PAID" : unpaidStatus,
            lastPaidAt: paidInFull ? settlementDateIso : subscription.lastPaidAt,
            paidUntil: paidInFull ? nextBillingDate : subscription.paidUntil,
            renewalDate: nextBillingDate,
            endDate: paidInFull ? nextBillingDate : subscription.endDate,
            lastSettlementAt: settlementDateIso,
            lastBilledAt: settlementDateIso,
            lastBilledAmount: amount,
            lastDebtIncrease: debtCharge,
            billingHistory: history.slice(-20),
            revision: Number(subscription.revision || 1) + 1,
            metadata: {
              ...(subscription.metadata && typeof subscription.metadata === "object" && !Array.isArray(subscription.metadata) ? clone(subscription.metadata) : {}),
              lastCommand: "PROCESS_WEEKLY_SUBSCRIPTION_SETTLEMENT",
              lastCommandAt: settlementDateIso,
              lastCommandBy: options.source || "SYSTEM"
            }
          }, index);
        });

        if (totalDue > 0) {
          addBillingHistoryEntry(citizen.id, {
            id: `subscription-charge-${settlementDateIso}-${citizen.id}`,
            date: settlementDateIso,
            type: "SUBSCRIPTION_BILLING",
            amount: totalDue,
            subscriptionCharge: totalDue,
            paidFromCredits,
            debtIncrease,
            creditsAfter: credits,
            debtAfter: debt,
            note: "Automatic weekly subscription charge.",
            createdBy: options.source || "SYSTEM"
          });
        }

        if (debtIncrease > 0) {
          addBillingHistoryEntry(citizen.id, {
            id: `debt-increase-${settlementDateIso}-${citizen.id}`,
            date: settlementDateIso,
            type: "DEBT_INCREASE",
            amount: debtIncrease,
            debtIncrease,
            creditsAfter: credits,
            debtAfter: debt,
            note: "Subscription deficit converted to debt.",
            createdBy: options.source || "SYSTEM"
          });
        }

        if (credits > 0 && debt > 0) {
          debtRecovery = Math.min(credits, debt);
          credits -= debtRecovery;
          debt -= debtRecovery;
          addBillingHistoryEntry(citizen.id, {
            id: `debt-recovery-${settlementDateIso}-${citizen.id}`,
            date: settlementDateIso,
            type: "DEBT_RECOVERY",
            amount: debtRecovery,
            debtRecovery,
            debtPayment: debtRecovery,
            creditsAfter: credits,
            debtAfter: debt,
            note: "Automatic debt recovery from settlement surplus.",
            createdBy: options.source || "SYSTEM"
          });
        }

        if (!chargedSubscriptions && incomePaid <= 0 && debtRecovery <= 0) return citizen;

        const additionalIncome = getWeeklyAdditionalCreditTotal(citizen.id, settlementDateIso);
        const totalIncome = incomePaid + additionalIncome;
        const debtChange = debt - debtBeforeSettlement;
        const activeSubscriptions = updatedSubscriptions.filter((subscription) => (
          typeof window.WS_APP.isSubscriptionEntitled === "function"
            ? window.WS_APP.isSubscriptionEntitled(subscription)
            : ["PAID", "OVERDUE"].includes(String(subscription?.status || "PENDING").trim().toUpperCase())
        )).length;

        const subscriptionBillingLog = Array.isArray(citizen.subscriptionBillingLog) ? clone(citizen.subscriptionBillingLog) : [];
        subscriptionBillingLog.push({
          id: `settlement-${settlementDateIso}-${citizen.id}`,
          date: settlementDateIso,
          campaignDate: String(options.campaignDateIso || window.WS_APP.getCampaignDateIso?.() || settlementDateIso),
          type: "WEEKLY_SUBSCRIPTION_SETTLEMENT",
          creditsBeforeIncome,
          debtBeforeSettlement,
          income: incomePaid,
          totalIncome,
          totalDue,
          paidFromCredits,
          debtIncrease,
          debtRecovery,
          chargedSubscriptions,
          overdueSubscriptions,
          creditsAfter: credits,
          debtAfter: debt
        });

        addBillingHistoryEntry(citizen.id, {
          id: `weekly-${settlementDateIso}-${citizen.id}`,
          date: settlementDateIso,
          type: "WEEKLY_SETTLEMENT",
          income: incomePaid,
          subscriptionCharge: totalDue,
          paidFromCredits,
          debtIncrease,
          debtRecovery,
          creditsAfter: credits,
          debtAfter: debt,
          note: "Automatic weekly income, subscription and debt settlement.",
          createdBy: options.source || "SYSTEM"
        });

        const accountChange = credits - (creditsBeforeIncome - additionalIncome);
        const activeSubscriptionsLabel = activeSubscriptions > 0 ? `${activeSubscriptions}/${updatedSubscriptions.length}` : "None";
        const entryTitle = debtIncrease > 0
          ? "Weekly settlement report: Deficit"
          : debtRecovery > 0
            ? "Weekly settlement report: Debt recovery"
            : "Weekly settlement report";
        emitBillingNotification(citizen.id, {
          subtype: "WEEKLY_SETTLEMENT_REPORT",
          severity: debtIncrease > 0 ? "WARNING" : "NOTICE",
          title: entryTitle,
          layout: "finance-settlement",
          panels: [
            { title: "INCOME", rows: [
              { label: "Service", value: formatCreditLabel(incomePaid) },
              { label: "Other", value: formatCreditLabel(additionalIncome) },
              { label: "Total", value: formatCreditLabel(totalIncome) }
            ] },
            { title: "SUBSCRIPTIONS", rows: [
              { label: "Active", value: activeSubscriptionsLabel },
              { label: "Weekly cost", value: formatCreditLabel(totalDue) },
              { label: "Due", value: formatCreditLabel(totalDue) }
            ] },
            { title: "DEBT", rows: [
              { label: "Before", value: formatCreditLabel(debtBeforeSettlement) },
              { label: "Change", value: formatChangeCreditLabel(debtChange) },
              { label: "Remaining", value: formatCreditLabel(debt) }
            ] }
          ],
          finalRows: [
            { label: "Change", value: formatChangeCreditLabel(accountChange) },
            { label: "Debt change", value: formatChangeCreditLabel(debtChange) },
            { label: "Remaining debt", value: formatCreditLabel(debt) },
            { label: "Final balance", value: formatCreditLabel(credits) }
          ],
          date: settlementDateIso,
          links: [
            { label: "OPEN BILLING", module: "terminal-hub", panel: "billing" },
            { label: "OPEN SUBSCRIPTIONS", module: "subscriptions" }
          ],
          createdBy: "SYSTEM"
        });

        summaries.push({
          citizenId: citizen.id,
          citizenName: citizen.legalName || citizen.shortId || citizen.id,
          creditsBeforeIncome,
          debtBeforeSettlement,
          income: incomePaid,
          totalIncome,
          totalDue,
          paidFromCredits,
          debtIncrease,
          debtRecovery,
          chargedSubscriptions,
          overdueSubscriptions,
          creditsAfter: credits,
          debtAfter: debt
        });

        totalIncomeAll += totalIncome;
        totalDueAll += totalDue;
        paidFromCreditsAll += paidFromCredits;
        debtIncreaseAll += debtIncrease;
        debtRecoveryAll += debtRecovery;
        chargedSubscriptionsAll += chargedSubscriptions;
        overdueSubscriptionsAll += overdueSubscriptions;
        changed = true;

        const oneTimeIncomeSources = settlementIncomeSources.filter((income) => income.oneTime);
        const oneTimeIncomeIds = new Set(oneTimeIncomeSources.map((income) => income.id));
        const oneTimeServiceRecordIds = new Set(oneTimeIncomeSources
          .map((income) => String(income.serviceRecordId || "").trim())
          .filter(Boolean));
        const oneTimeIncomeByRecordId = new Map(oneTimeIncomeSources
          .filter((income) => String(income.serviceRecordId || "").trim())
          .map((income) => [String(income.serviceRecordId || "").trim(), income]));
        const updatedIncome = normalizeIncome(citizen.income).map((income) => {
          if (!oneTimeIncomeIds.has(income.id)) return income;
          return normalizeIncomeEntry({
            ...income,
            status: "ARCHIVED",
            lastSettlementAt: settlementDateIso,
            archivedAt: settlementDateIso,
            updatedAt: settlementDateIso
          });
        });
        const updatedServiceLog = normalizeServiceLog(citizen.serviceLog).map((record) => {
          if (normalizeServiceForm(record.form) !== "COMMISSION") return record;
          const linkedIncome = oneTimeIncomeByRecordId.get(String(record.id || "").trim());
          const paidByIncomeId = oneTimeIncomeIds.has(String(record.serviceIncomeId || "").trim());
          if (!linkedIncome && !paidByIncomeId && !oneTimeServiceRecordIds.has(String(record.id || "").trim())) return record;
          return normalizeServiceRecord({
            ...record,
            serviceIncomeId: linkedIncome?.id || record.serviceIncomeId,
            payoutStatus: "SETTLED",
            payoutSettledAt: record.payoutSettledAt || settlementDateIso,
            payoutSettledBy: record.payoutSettledBy || options.source || "SYSTEM",
            payoutUpdatedAt: settlementDateIso,
            payoutUpdatedBy: options.source || "SYSTEM",
            updatedAt: settlementDateIso
          });
        });

        return normalizeCitizen({
          ...citizen,
          credits,
          debt: formatCreditLabel(debt),
          subscriptions: updatedSubscriptions,
          serviceLog: updatedServiceLog,
          income: updatedIncome,
          subscriptionBillingLog: subscriptionBillingLog.slice(-30)
        });
      });

      replaceCitizenStore(nextCitizenStore);

      if (changed) {
        saveCitizenStore();
        emitCitizenUpdate({
          settlement: true,
          settlementDateIso,
          income: totalIncomeAll,
          totalDue: totalDueAll,
          paidFromCredits: paidFromCreditsAll,
          debtIncrease: debtIncreaseAll,
          debtRecovery: debtRecoveryAll,
          chargedSubscriptions: chargedSubscriptionsAll,
          overdueSubscriptions: overdueSubscriptionsAll,
          citizens: clone(summaries)
        });
      }

      return {
        ok: true,
        settlementDateIso,
        income: totalIncomeAll,
        totalDue: totalDueAll,
        paidFromCredits: paidFromCreditsAll,
        debtIncrease: debtIncreaseAll,
        debtRecovery: debtRecoveryAll,
        chargedSubscriptions: chargedSubscriptionsAll,
        overdueSubscriptions: overdueSubscriptionsAll,
        citizens: summaries
      };
    };
    function getCampaignDateForBilling() {
      const iso = window.WS_APP.getCampaignDateIso?.() || window.WS_APP.CAMPAIGN_DATE_ISO || "2109-02-13";
      const parsed = new Date(`${iso}T00:00:00Z`);
      return Number.isFinite(parsed.getTime()) ? parsed : new Date("2109-02-13T00:00:00Z");
    }
    function getSubscriptionBillingMarket(subscription = {}) {
      const catalog = window.WS_APP.getSubscriptionCatalogItemById?.(subscription.catalogId);
      return String(catalog?.market || subscription.market || "PRIVATE").toUpperCase() === "SYSTEM" ? "SYSTEM" : "PRIVATE";
    }
    function sortSubscriptionsForPayment(items = []) {
      return items.slice().sort((a, b) => {
        const marketA = getSubscriptionBillingMarket(a) === "SYSTEM" ? 0 : 1;
        const marketB = getSubscriptionBillingMarket(b) === "SYSTEM" ? 0 : 1;
        if (marketA !== marketB) return marketA - marketB;
        const amountA = parseCreditNumber(a.amount);
        const amountB = parseCreditNumber(b.amount);
        if (amountA !== amountB) return amountA - amountB;
        return String(a.title || "").localeCompare(String(b.title || ""), "pl");
      });
    }
    function payCitizenSubscriptions(citizenId, options = {}) {
      const citizen = window.WS_APP.getCitizenById(citizenId);
      if (!citizen || citizen.recordType === "admin") return { ok: false, reason: "NO_CITIZEN" };

      const category = String(options.category || "").trim().toUpperCase();
      const subscriptionId = String(options.subscriptionId || "").trim();
      const subscriptionIdSet = new Set((Array.isArray(options.subscriptionIds) ? options.subscriptionIds : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean));
      const payAll = !category && !subscriptionId && !subscriptionIdSet.size;
      const paymentSource = normalizeBillingPaymentSource(options.paymentSource);
      const subscriptions = normalizeSubscriptions(citizen.subscriptions);
      const candidates = subscriptions.filter((subscription) => {
        const status = String(subscription.status || "").toUpperCase();
        if (!["PENDING", "OVERDUE", "SUSPENDED"].includes(status)) return false;
        if (category && subscription.category !== category) return false;
        if (subscriptionId && subscription.id !== subscriptionId) return false;
        if (subscriptionIdSet.size && !subscriptionIdSet.has(subscription.id)) return false;
        return true;
      });

      const payable = payAll ? sortSubscriptionsForPayment(candidates) : candidates;
      const requestedTotal = payable.reduce((sum, subscription) => sum + parseCreditNumber(subscription.amount), 0);
      const creditsBefore = parseCreditNumber(citizen.credits);
      const debtStatusBefore = getDebtAccountStatus(citizen);
      let remainingCredits = creditsBefore;
      let remainingDebtCapacity = debtStatusBefore.capacity;
      let debtAfter = debtStatusBefore.debt;

      if (!payable.length || requestedTotal <= 0) {
        return { ok: false, reason: "NO_PAYABLE", total: 0, credits: remainingCredits, paymentSource };
      }

      if (paymentSource === "CREDITS" && !payAll && remainingCredits < requestedTotal) {
        return { ok: false, reason: "INSUFFICIENT_CREDITS", total: requestedTotal, credits: remainingCredits, missing: requestedTotal - remainingCredits, paymentSource };
      }

      if (paymentSource === "DEBT_ACCOUNT" && !payAll && remainingDebtCapacity < requestedTotal) {
        return {
          ok: false,
          reason: "DEBT_LIMIT_EXCEEDED",
          total: requestedTotal,
          debt: debtStatusBefore.debt,
          debtLimit: debtStatusBefore.limit,
          debtCapacity: remainingDebtCapacity,
          missing: requestedTotal - remainingDebtCapacity,
          paymentSource
        };
      }

      const paidIds = new Set();
      const unpaidIds = new Set();
      const unpaidStatusCounts = { overdue: 0, suspended: 0 };
      let paidTotal = 0;
      let paidFromCredits = 0;
      let debtIncrease = 0;

      payable.forEach((subscription) => {
        const amount = parseCreditNumber(subscription.amount);
        if (paymentSource === "DEBT_ACCOUNT") {
          if (amount <= remainingDebtCapacity) {
            remainingDebtCapacity -= amount;
            debtAfter += amount;
            paidTotal += amount;
            debtIncrease += amount;
            paidIds.add(subscription.id);
          } else if (payAll) {
            unpaidIds.add(subscription.id);
          }
          return;
        }

        if (amount <= remainingCredits) {
          remainingCredits -= amount;
          paidTotal += amount;
          paidFromCredits += amount;
          paidIds.add(subscription.id);
        } else if (payAll) {
          unpaidIds.add(subscription.id);
        }
      });

      if (!paidIds.size) {
        return paymentSource === "DEBT_ACCOUNT"
          ? { ok: false, reason: "DEBT_LIMIT_EXCEEDED", total: requestedTotal, debt: debtStatusBefore.debt, debtLimit: debtStatusBefore.limit, debtCapacity: debtStatusBefore.capacity, missing: requestedTotal, paymentSource }
          : { ok: false, reason: "INSUFFICIENT_CREDITS", total: requestedTotal, credits: parseCreditNumber(citizen.credits), missing: requestedTotal, paymentSource };
      }

      const paidAtDate = getCampaignDateForBilling();
      const paidAt = paidAtDate.toISOString().slice(0, 10);
      const alignedPaidUntil = getAlignedSubscriptionPeriodEndIso();
      const updatedSubscriptions = subscriptions.map((subscription, index) => {
        if (paidIds.has(subscription.id)) {
          return normalizeSubscriptionEntry({
            ...subscription,
            status: "PAID",
            lastPaidAt: paidAt,
            paidUntil: alignedPaidUntil,
            renewalDate: alignedPaidUntil,
            endDate: alignedPaidUntil
          }, index);
        }

        if (unpaidIds.has(subscription.id)) {
          const unpaidStatus = ["PENDING", "SUSPENDED"].includes(String(subscription.status || "PENDING").toUpperCase()) ? "SUSPENDED" : "OVERDUE";
          unpaidStatusCounts[unpaidStatus === "SUSPENDED" ? "suspended" : "overdue"] += 1;
          return normalizeSubscriptionEntry({
            ...subscription,
            status: unpaidStatus
          }, index);
        }

        return subscription;
      });

      const updatePatch = paymentSource === "DEBT_ACCOUNT"
        ? { debt: formatCreditLabel(debtAfter), subscriptions: updatedSubscriptions }
        : { credits: remainingCredits, subscriptions: updatedSubscriptions };
      const updated = window.WS_APP.updateCitizen(citizenId, updatePatch, { source: "SUBSCRIPTION_SETTLEMENT" });

      if (!updated) {
        return { ok: false, reason: "UPDATE_FAILED", total: paidTotal, credits: creditsBefore, paymentSource };
      }

      const result = {
        ok: true,
        citizen: updated,
        total: paidTotal,
        requestedTotal,
        paymentSource,
        paidFromCredits,
        debtIncrease,
        debtBefore: debtStatusBefore.debt,
        debtAfter: paymentSource === "DEBT_ACCOUNT" ? debtAfter : debtStatusBefore.debt,
        debtLimit: debtStatusBefore.limit,
        debtCapacityAfter: paymentSource === "DEBT_ACCOUNT" ? remainingDebtCapacity : debtStatusBefore.capacity,
        paidCount: paidIds.size,
        unpaidCount: unpaidIds.size,
        unpaidStatusCounts,
        credits: paymentSource === "DEBT_ACCOUNT" ? creditsBefore : remainingCredits,
        partial: unpaidIds.size > 0,
        paidUntil: updatedSubscriptions.find((subscription) => paidIds.has(subscription.id))?.paidUntil || alignedPaidUntil,
        paidIds: Array.from(paidIds),
        unpaidIds: Array.from(unpaidIds)
      };

      result.notificationRecorded = emitSubscriptionPaymentTerminalEntry(citizenId, result, {
        creditsBefore,
        note: options.note || (paymentSource === "DEBT_ACCOUNT" ? "Subscription payment charged to Debt Account." : result.partial ? "Partial subscription payment." : "Subscription payment."),
        createdBy: options.createdBy || "SYSTEM",
        notify: options.notify
      });

      return result;
    };

    return Object.freeze({
      version: ADAPTER_VERSION,
      addCitizenSubscription,
      updateCitizenSubscription,
      cancelCitizenSubscription,
      deleteCitizenSubscription,
      clearCancelledCitizenSubscriptions,
      payCitizenSubscriptions,
      processWeeklySubscriptionSettlement
    });
  }

  app.CITIZEN_SUBSCRIPTION_ADAPTER_VERSION = ADAPTER_VERSION;
  app.createCitizenSubscriptionAdapter = createCitizenSubscriptionAdapter;
})();
