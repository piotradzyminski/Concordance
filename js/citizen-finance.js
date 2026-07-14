window.WS_APP = window.WS_APP || {};

(function initCitizenFinanceModule(app) {
  function parseCreditValue(value) {
    if (typeof app.parseCreditValue === "function") return app.parseCreditValue(value);
    if (typeof app.parseCredits === "function") return app.parseCredits(value);
    if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);

    const cleaned = String(value || "")
      .replace(/[^0-9,.-]/g, "")
      .replace(/,/g, ".");
    const number = Number(cleaned);
    return Number.isFinite(number) ? Math.round(number) : 0;
  }

  function formatCredits(value) {
    if (typeof app.formatCredits === "function") return app.formatCredits(value);
    const rounded = Math.round(Number(value) || 0);
    const sign = rounded < 0 ? "-" : "";
    const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${sign}${digits} ₡`;
  }

  function formatDateDisplay(value = "") {
    const text = String(value || "").trim();
    if (!text) return "OPEN-ENDED";
    return text.length >= 10 ? text.slice(0, 10) : text;
  }

  function isSubscriptionStatusActive(status = "PENDING") {
    if (typeof app.resolveSubscriptionContractState === "function") {
      return app.resolveSubscriptionContractState({ status }).entitled;
    }
    return ["PAID", "OVERDUE"].includes(String(status || "PENDING").toUpperCase());
  }

  function isSubscriptionStatusPayable(status = "PENDING") {
    if (typeof app.resolveSubscriptionContractState === "function") {
      return app.resolveSubscriptionContractState({ status, amount: 1 }).payable;
    }
    return ["PENDING", "OVERDUE", "SUSPENDED"].includes(String(status || "PENDING").toUpperCase());
  }

  function normalizeSubscriptions(citizen = {}) {
    return (Array.isArray(citizen?.subscriptions) ? citizen.subscriptions : []).map((subscription, index) => {
      const normalized = typeof app.normalizeSubscriptionContract === "function"
        ? app.normalizeSubscriptionContract(subscription, index)
        : {
          ...subscription,
          id: subscription.id || `${String(subscription.category || "OTHER").toLowerCase()}-${index + 1}`,
          category: String(subscription.category || "OTHER").toUpperCase(),
          title: subscription.title || subscription.name || "Subscription",
          provider: subscription.provider || "LOCAL LEDGER",
          amount: parseCreditValue(subscription.amount),
          status: String(subscription.status || "PENDING").toUpperCase(),
          active: isSubscriptionStatusActive(subscription.status || "PENDING")
        };

      return {
        ...normalized,
        citizenId: citizen?.id || "",
        citizenName: citizen?.legalName || "UNKNOWN"
      };
    });
  }

  function normalizeIncomeEntries(citizen = {}) {
    return (Array.isArray(citizen?.income) ? citizen.income : [])
      .filter((income) => String(income?.serviceRecordId || "").trim())
      .map((income, index) => {
        const status = String(income.status || "ACTIVE").toUpperCase();
        const archivedAt = String(income.archivedAt || "").trim();
        return {
          id: income.id || `income-${index + 1}`,
          title: income.title || income.name || "Income Source",
          provider: income.provider || "LOCAL LEDGER",
          amount: parseCreditValue(income.amount),
          cycle: String(income.cycle || "WEEKLY").toUpperCase(),
          status,
          reference: String(income.reference || income.contractRef || "").trim(),
          details: String(income.details || income.description || "").trim(),
          terms: String(income.terms || "").trim(),
          serviceRecordId: String(income.serviceRecordId || "").trim(),
          serviceForm: String(income.serviceForm || "").trim().toUpperCase(),
          serviceCategory: String(income.serviceCategory || "").trim().toUpperCase(),
          oneTime: income.oneTime === true,
          createdBy: String(income.createdBy || "SYSTEM").trim(),
          updatedAt: String(income.updatedAt || "").trim(),
          archivedAt,
          active: !archivedAt && !["INACTIVE", "ARCHIVED", "SUSPENDED", "CANCELLED", "TERMINATED", "FAILED"].includes(status)
        };
      });
  }

  function getSubscriptionPaymentStatus(subscriptions = []) {
    const statuses = subscriptions.map((item) => String(item.status || "PENDING").toUpperCase());
    const currentStatuses = statuses.filter((status) => status !== "CANCELLED");

    if (!currentStatuses.length) return "CANCELLED";
    if (currentStatuses.includes("SUSPENDED")) return "SUSPENDED";
    if (currentStatuses.includes("OVERDUE")) return "OVERDUE";
    if (currentStatuses.includes("PENDING")) return "PENDING";
    return "PAID";
  }

  function getSubscriptionActivityStatus(subscriptions = []) {
    const activeCount = subscriptions.filter((item) => item.active).length;
    if (activeCount === 0) return "NONE ACTIVE";
    if (activeCount === subscriptions.length) return "ALL ACTIVE";
    return "PARTIALLY ACTIVE";
  }

  function isSubscriptionPayable(subscription = {}) {
    const status = String(subscription.status || "PENDING").toUpperCase();
    if (!isSubscriptionStatusPayable(status)) return false;
    return parseCreditValue(subscription.amount) > 0;
  }

  function sumPayableSubscriptions(subscriptions = []) {
    return subscriptions
      .filter(isSubscriptionPayable)
      .reduce((sum, item) => sum + parseCreditValue(item.amount), 0);
  }

  function sumActiveSubscriptions(subscriptions = []) {
    return subscriptions
      .filter((subscription) => subscription.active)
      .reduce((sum, item) => sum + parseCreditValue(item.amount), 0);
  }

  function sumActiveIncome(income = []) {
    return income
      .filter((item) => item.active && String(item.status || "").toUpperCase() === "ACTIVE" && String(item.cycle || "WEEKLY").toUpperCase() === "WEEKLY")
      .reduce((sum, item) => sum + parseCreditValue(item.amount), 0);
  }

  function getCitizenFinancialLedger(citizen = {}) {
    const subscriptions = normalizeSubscriptions(citizen);
    const income = normalizeIncomeEntries(citizen);
    const subscriptionTotal = sumActiveSubscriptions(subscriptions);
    const incomeTotal = sumActiveIncome(income);
    const credits = parseCreditValue(citizen.credits);
    const debt = parseCreditValue(citizen.debt);

    return {
      credits,
      debt,
      debtLabel: String(citizen.debt || formatCredits(debt)).trim() || "0 ₡",
      income,
      incomeTotal,
      subscriptions,
      subscriptionTotal,
      allSubscriptionTotal: subscriptions.reduce((sum, item) => sum + parseCreditValue(item.amount), 0),
      netCycle: incomeTotal - subscriptionTotal,
      paymentStatus: subscriptions.length ? getSubscriptionPaymentStatus(subscriptions) : "PAID",
      activityStatus: subscriptions.length ? getSubscriptionActivityStatus(subscriptions) : "NONE ACTIVE"
    };
  }

  function getCitizenSubscriptionSummary(citizen = {}) {
    const ledger = getCitizenFinancialLedger(citizen);
    const subscriptions = ledger.subscriptions || [];
    const currentSubscriptions = subscriptions.filter((subscription) => String(subscription.status || "").toUpperCase() !== "CANCELLED");
    const activeSubscriptions = currentSubscriptions.filter((subscription) => subscription.active);

    return {
      ledger,
      subscriptions,
      currentSubscriptions,
      activeSubscriptions,
      activeCount: activeSubscriptions.length,
      totalCount: subscriptions.length,
      currentCount: currentSubscriptions.length,
      subscriptionTotal: ledger.subscriptionTotal,
      allSubscriptionTotal: ledger.allSubscriptionTotal,
      paymentStatus: ledger.paymentStatus,
      activityStatus: ledger.activityStatus
    };
  }

  Object.assign(app, {
    formatDateDisplay,
    normalizeSubscriptions,
    normalizeCitizenIncomeEntries: normalizeIncomeEntries,
    getSubscriptionPaymentStatus,
    getSubscriptionActivityStatus,
    isSubscriptionStatusActive,
    isSubscriptionStatusPayable,
    isSubscriptionPayable,
    sumPayableSubscriptions,
    getCitizenFinancialLedger,
    getCitizenSubscriptionSummary
  });
})(window.WS_APP);
