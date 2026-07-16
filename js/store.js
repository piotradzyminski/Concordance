window.WS_APP = window.WS_APP || {};

(function initCitizenStoreModule() {
  const STORAGE_KEY = "ws_app_citizens_v1";
  const SERVICE_REQUESTS_STORAGE_KEY = "ws_app_service_requests_v1";
  const SERVICE_OFFERS_STORAGE_KEY = "ws_app_service_offers_v1";
  const BILLING_HISTORY_STORAGE_KEY = "ws_app_billing_history_v1";
  const SUBSCRIPTION_CONTRACT_SCHEMA_STORAGE_KEY = "ws_app_subscription_contracts_schema";
  const BILLING_DEBT_ACCOUNT_LIMIT = 20000;
  let citizenStore = [];
  let citizenStoreById = new Map();
  let citizenStoreSnapshot = [];
  let citizenStorePersistenceDirty = false;
  let citizenStorePersistenceTimer = 0;
  let citizenStorePersistenceIdleHandle = 0;
  const CITIZEN_STORE_PERSIST_DEBOUNCE_MS = 700;
  const normalizedArrayCaches = new Map();


  const storeUtils = window.WS_APP.storeUtils;
  if (!storeUtils) throw new Error("W&S store utilities must load before js/store.js.");
  const {
    clone,
    readStoredArray,
    writeStoredArray,
    makeStoreId,
    extractTimestampFromStoreId,
    getLocalCreatedAt,
    getNextSortIndex,
    resolveSortIndex,
    compareStoreRecordsByNewest,
    compareStoreRecordsByOldest,
    normalizeDefinitionKey,
    clampInteger,
    parseCreditNumber,
    formatCreditNumber,
    formatCreditLabel,
    formatSignedCreditLabel,
    formatChangeCreditLabel,
    buildFinanceAccountRows
  } = storeUtils;

  const serviceLogLifecycle = window.WS_APP.ServiceLogLifecycle;
  if (!serviceLogLifecycle) throw new Error("Citizen Service Log lifecycle registry must load before js/store.js.");

  const createTerminalEntryStore = window.WS_APP.createTerminalEntryStore;
  const createTerminalReminderStore = window.WS_APP.createTerminalReminderStore;
  if (typeof createTerminalEntryStore !== "function") throw new Error("Terminal Entry Store factory must load before js/store.js.");
  if (typeof createTerminalReminderStore !== "function") throw new Error("Terminal Reminder Store factory must load before js/store.js.");

  const terminalEntryStore = createTerminalEntryStore({
    clone,
    readStoredArray,
    writeStoredArray,
    makeStoreId,
    getLocalCreatedAt,
    getNextSortIndex,
    resolveSortIndex,
    compareStoreRecordsByNewest,
    normalizeEntry: normalizeTerminalEntry,
    normalizeToken: normalizeNotificationToken,
    getCampaignTimeIso: getTerminalCampaignTimeIso
  });

  const terminalReminderStore = createTerminalReminderStore({
    clone,
    readStoredArray,
    writeStoredArray,
    makeStoreId,
    parseCreditNumber,
    getTerminalDateIso,
    isIsoDate,
    addDaysIso: addDaysIsoLocal,
    compareIsoDates: compareIsoDatesLocal,
    getCitizenById: (citizenId) => window.WS_APP.getCitizenById?.(citizenId),
    emitCalendarNotification: (...args) => emitCalendarNotification(...args)
  });

  const readTerminalEntries = terminalEntryStore.readEntries;
  const normalizeCalendarReminder = terminalReminderStore.normalizeReminder;
  const readCalendarReminders = terminalReminderStore.readReminders;


  const CANONICAL_ABILITIES = {
    "ability-strength": { id: "ability-strength", label: "Siła" },
    "ability-endurance": { id: "ability-endurance", label: "Wytrzymałość" },
    "ability-reflex": { id: "ability-reflex", label: "Refleks" },
    "ability-dexterity": { id: "ability-dexterity", label: "Zręczność" },
    "ability-perception": { id: "ability-perception", label: "Percepcja" },
    "ability-composure": { id: "ability-composure", label: "Opanowanie" },
    "ability-charisma": { id: "ability-charisma", label: "Charyzma" },
    "ability-intellect": { id: "ability-intellect", label: "Intelekt" }
  };

  const ABILITY_ID_BY_LABEL = {
    "sila": "ability-strength",
    "siła": "ability-strength",
    "wytrzymalosc": "ability-endurance",
    "wytrzymałość": "ability-endurance",
    "refleks": "ability-reflex",
    "zrecznosc": "ability-dexterity",
    "zręczność": "ability-dexterity",
    "percepcja": "ability-perception",
    "opanowanie": "ability-composure",
    "charyzma": "ability-charisma",
    "intelekt": "ability-intellect"
  };

  const LEGACY_ABILITY_ID_MIGRATION = {
    "ability-resilience": "ability-endurance",
    "ability-motorics": "ability-dexterity",
    "ability-coordination": "ability-dexterity",
    "ability-stability": "ability-composure"
  };

  const SKILL_ID_BY_LABEL = {
    "administracja systemowa": "skill-system-administration",
    "korekta formularzy": "skill-form-correction",
    "analiza rejestrow": "skill-registry-analysis",
    "analiza rejestrów": "skill-registry-analysis",
    "procedury w&s": "skill-ws-procedures",
    "naprawy terenowe": "skill-field-repair",
    "obsluga linii technicznej": "skill-production-line",
    "obsługa linii technicznej": "skill-production-line",
    "czytanie schematow": "skill-schematic-reading",
    "czytanie schematów": "skill-schematic-reading",
    "improwizacja narzedziowa": "skill-tool-improvisation",
    "improwizacja narzędziowa": "skill-tool-improvisation",
    "database override": "skill-database-override",
    "campaign supervision": "skill-campaign-supervision",
    "local access routing": "skill-local-access-routing"
  };

  function resolveCanonicalAbilityId(ability = {}) {
    const rawId = typeof ability === "string" ? "" : String(ability?.abilityId || ability?.id || "").trim();
    const rawIdKey = rawId.toLowerCase();
    if (CANONICAL_ABILITIES[rawId]) return rawId;
    if (LEGACY_ABILITY_ID_MIGRATION[rawIdKey]) return LEGACY_ABILITY_ID_MIGRATION[rawIdKey];

    const label = typeof ability === "string"
      ? ability.trim()
      : String(ability?.label || ability?.name || "").trim();
    return ABILITY_ID_BY_LABEL[normalizeDefinitionKey(label)] || "";
  }

  function normalizeCitizenAbility(ability = {}) {
    const abilityId = resolveCanonicalAbilityId(ability);
    if (!abilityId || !CANONICAL_ABILITIES[abilityId]) return null;

    return {
      abilityId,
      label: CANONICAL_ABILITIES[abilityId].label,
      natural: clampInteger(ability?.natural ?? ability?.base ?? 1, 0, 7),
      cyberware: clampInteger(ability?.cyberware ?? 0, 0, 8),
      cyberwareActive: ability?.cyberwareActive !== false
    };
  }

  function normalizeCitizenSkill(skill = {}) {
    if (typeof skill === "string") {
      const label = skill.trim();
      return {
        skillId: SKILL_ID_BY_LABEL[normalizeDefinitionKey(label)] || "",
        label,
        value: 5
      };
    }

    const label = String(skill?.label || skill?.name || "Skill").trim();

    return {
      skillId: String(skill?.skillId || SKILL_ID_BY_LABEL[normalizeDefinitionKey(label)] || "").trim(),
      label,
      value: clampInteger(skill?.value ?? 1, 1, 10)
    };
  }

  window.WS_APP.formatCredits = formatCreditLabel;
  window.WS_APP.parseCredits = parseCreditNumber;
  window.WS_APP.parseCreditNumber = parseCreditNumber;
  window.WS_APP.parseCreditValue = parseCreditNumber;
  window.WS_APP.BILLING_DEBT_LIMIT = BILLING_DEBT_ACCOUNT_LIMIT;

  function normalizeBillingPaymentSource(value) {
    const source = String(value || "CREDITS").trim().toUpperCase();
    return source === "DEBT_ACCOUNT" ? "DEBT_ACCOUNT" : "CREDITS";
  }

  function getDebtAccountStatus(citizenOrId = {}) {
    const citizen = typeof citizenOrId === "string" ? window.WS_APP.getCitizenById?.(citizenOrId) : citizenOrId;
    const debt = parseCreditNumber(citizen?.debt);
    const limit = BILLING_DEBT_ACCOUNT_LIMIT;
    const capacity = Math.max(0, limit - debt);
    return {
      debt,
      limit,
      capacity,
      canCharge: capacity > 0
    };
  }

  window.WS_APP.getCitizenDebtCapacity = function getCitizenDebtCapacity(citizenOrId = {}) {
    return clone(getDebtAccountStatus(citizenOrId));
  };

  window.WS_APP.canChargeCitizenDebt = function canChargeCitizenDebt(citizenOrId = {}, amount = 0) {
    const requested = parseCreditNumber(amount);
    const status = getDebtAccountStatus(citizenOrId);
    return requested > 0 && requested <= status.capacity;
  };

  function normalizeFinancialStatus(value, fallback = "ACTIVE") {
    const status = String(value || fallback).trim().toUpperCase();
    return status || fallback;
  }

  function normalizeBiologicalProfile(value, fallback = "UNCLASSIFIED") {
    const profile = String(value || fallback).trim().toUpperCase();
    if (profile === "ALFA") return "ALPHA";
    if (["PODLUDZIE", "SUBHUMAN", "OUTSIDE", "NONE", "UNKNOWN", ""].includes(profile)) return "UNCLASSIFIED";
    if (["ALPHA", "BETA", "GAMMA", "UNCLASSIFIED"].includes(profile)) return profile;
    return profile || fallback;
  }

  function splitLegacyLegalName(value = "") {
    const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { firstName: "", middleName: "", surname: "" };
    if (parts.length === 1) return { firstName: parts[0], middleName: "", surname: "" };
    if (parts.length === 2) return { firstName: parts[0], middleName: "", surname: parts[1] };
    return { firstName: parts[0], middleName: parts.slice(1, -1).join(" "), surname: parts.at(-1) };
  }

  function composeLegalName(identity = {}) {
    return [identity.firstName, identity.middleName, identity.surname]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(" ") || String(identity.pseudonym || "").trim() || "UNKNOWN CITIZEN";
  }

  function normalizeNameRevealAccess(value, fallback = "CONFIDENTIAL") {
    const normalized = String(value || fallback).trim().toUpperCase();
    return ["PUBLIC", "RESTRICTED", "CONFIDENTIAL", "BLACK", "GAME_MASTER"].includes(normalized) ? normalized : fallback;
  }

  function normalizeCitizenIdentity(citizen = {}) {
    const source = citizen.identity && typeof citizen.identity === "object" ? citizen.identity : {};
    const legacy = splitLegacyLegalName(citizen.legalName || citizen.name || citizen.shortId || "");
    const identity = {
      firstName: String(source.firstName ?? citizen.firstName ?? legacy.firstName ?? "").trim(),
      middleName: String(source.middleName ?? citizen.middleName ?? legacy.middleName ?? "").trim(),
      surname: String(source.surname ?? citizen.surname ?? legacy.surname ?? "").trim(),
      pseudonym: String(source.pseudonym ?? citizen.pseudonym ?? "").trim(),
      encryptedName: Boolean(source.encryptedName ?? citizen.encryptedName ?? false),
      displayNameOverride: String(source.displayNameOverride ?? citizen.displayNameOverride ?? "").trim(),
      nameRevealAccess: normalizeNameRevealAccess(source.nameRevealAccess ?? citizen.nameRevealAccess ?? citizen.legalNameAccess, "CONFIDENTIAL")
    };

    if (!identity.firstName && !identity.surname && !identity.pseudonym) {
      identity.firstName = String(citizen.legalName || citizen.shortId || "UNKNOWN").trim();
    }

    return identity;
  }

  window.WS_APP.composeCitizenLegalName = composeLegalName;
  window.WS_APP.getCitizenIdentity = function getCitizenIdentity(citizen = {}) {
    return clone(normalizeCitizenIdentity(citizen));
  };

  window.WS_APP.canViewCitizenLegalName = function canViewCitizenLegalName(citizen = {}, user = window.WS_APP.currentUser) {
    const identity = normalizeCitizenIdentity(citizen);
    if (!identity.encryptedName) return true;
    if (user?.role === "admin") return true;
    if (!user) return false;
    return window.WS_APP.canAccessRecord
      ? window.WS_APP.canAccessRecord(user, { accessTags: [identity.nameRevealAccess || "CONFIDENTIAL"] })
      : false;
  };

  window.WS_APP.getCitizenDisplayName = function getCitizenDisplayName(citizen = {}, options = {}) {
    const identity = normalizeCitizenIdentity(citizen);
    const legalName = citizen.legalName || composeLegalName(identity);
    const canViewLegal = options.legal === true || window.WS_APP.canViewCitizenLegalName?.(citizen, options.user || window.WS_APP.currentUser);
    if (!canViewLegal && identity.encryptedName) return identity.displayNameOverride || "ENCRYPTED NAME";
    return legalName;
  };

  window.WS_APP.formatCitizenDisplayName = function formatCitizenDisplayName(citizen = {}, options = {}) {
    const identity = normalizeCitizenIdentity(citizen);
    const base = window.WS_APP.getCitizenDisplayName?.(citizen, options) || citizen.legalName || composeLegalName(identity);
    const pseudonym = String(identity.pseudonym || "").trim();
    if (!pseudonym || pseudonym.toLowerCase() === String(base || "").trim().toLowerCase()) return base;
    return `${base} "${pseudonym}"`;
  };

  function normalizeAccessTags(value, fallback = ["PUBLIC"]) {
    if (window.WS_APP.normalizeAccessTagList) return window.WS_APP.normalizeAccessTagList(value, fallback);
    const list = Array.isArray(value) ? value : String(value || "").split(/[\n,]/);
    const normalized = list.map((tag) => String(tag || "").trim().toUpperCase()).filter(Boolean);
    return normalized.length ? Array.from(new Set(normalized)) : fallback;
  }

  function normalizeSubscriptionEntry(subscription = {}, index = 0, citizenId = "") {
    if (typeof window.WS_APP.normalizeSubscriptionContract === "function") {
      const prepared = clone(subscription || {});
      const statusAlias = String(prepared.status || "").trim().toUpperCase();
      const billingStatus = String(prepared.billingStatus || "").trim().toUpperCase();
      if (statusAlias && statusAlias !== billingStatus) prepared.billingStatus = statusAlias;
      return window.WS_APP.normalizeSubscriptionContract(prepared, index, {
        citizenId: citizenId || prepared.citizenId || ""
      });
    }

    const subscriptionContractId = String(subscription?.subscriptionContractId || `subscription-contract-${index + 1}`).trim();
    const subscriptionCatalogId = String(subscription?.subscriptionCatalogId || "").trim();
    const normalizedCitizenId = String(subscription?.citizenId || citizenId || "").trim();
    const billingStatus = normalizeFinancialStatus(subscription?.billingStatus, "PENDING");
    const contractStatus = billingStatus === "CANCELLED" ? "CANCELLED" : "ACTIVE";
    const entitlementStatus = contractStatus === "CANCELLED"
      ? "CANCELLED"
      : billingStatus === "PAID"
        ? "ACTIVE"
        : billingStatus === "OVERDUE"
          ? "GRACE_PERIOD"
          : billingStatus;
    const entitled = ["ACTIVE", "GRACE_PERIOD"].includes(entitlementStatus);
    const displaySnapshot = subscription?.displaySnapshot && typeof subscription.displaySnapshot === "object"
      ? subscription.displaySnapshot
      : {};

    return {
      ...clone(subscription),
      subscriptionContractId,
      subscriptionCatalogId,
      citizenId: normalizedCitizenId,
      contractStatus,
      billingStatus,
      entitlementStatus,
      id: subscriptionContractId,
      catalogId: subscriptionCatalogId,
      title: String(displaySnapshot.title || "New Subscription").trim(),
      tierLabel: String(displaySnapshot.tierLabel || "").trim(),
      category: String(displaySnapshot.category || "OTHER").trim().toUpperCase(),
      provider: String(displaySnapshot.provider || "LOCAL LEDGER").trim(),
      market: String(displaySnapshot.market || "SYSTEM").trim().toUpperCase(),
      logo: String(displaySnapshot.logo || "").trim(),
      description: String(displaySnapshot.description || "").trim(),
      status: billingStatus,
      active: entitled,
      entitled,
      cycle: String(subscription?.billingCycle || "WEEKLY").trim().toUpperCase(),
      startDate: String(subscription?.startedAt || "").trim(),
      endDate: String(subscription?.currentPeriodEnd || "").trim(),
      renewalDate: String(subscription?.currentPeriodEnd || "").trim(),
      paidUntil: String(subscription?.currentPeriodEnd || "").trim()
    };
  }

  function getSubscriptionContractKey(subscription = {}) {
    const catalogId = String(subscription?.subscriptionCatalogId || subscription?.catalogId || "").trim();
    const targetType = String(subscription?.coverageTarget?.type || "CITIZEN").trim().toUpperCase();
    const targetId = String(subscription?.coverageTarget?.id || subscription?.citizenId || "").trim();
    return catalogId ? `catalog:${catalogId}:target:${targetType}:${targetId}` : "";
  }

  function isSubscriptionContractOpen(subscription = {}) {
    return String(subscription?.contractStatus || "ACTIVE").toUpperCase() === "ACTIVE";
  }

  function normalizeIncomeEntry(income = {}, index = 0) {
    const title = String(income?.title || income?.name || "Income Source").trim();

    return {
      id: String(income?.id || `income-${makeSlug(title)}-${index + 1}`).trim(),
      title,
      provider: String(income?.provider || "LOCAL LEDGER").trim(),
      amount: parseCreditNumber(income?.amount),
      cycle: String(income?.cycle || "WEEKLY").trim().toUpperCase(),
      status: normalizeFinancialStatus(income?.status, "ACTIVE"),
      reference: String(income?.reference || income?.contractRef || "").trim(),
      details: String(income?.details || income?.description || "").trim(),
      terms: String(income?.terms || "").trim(),
      createdBy: String(income?.createdBy || window.WS_APP.currentUser?.login || "SYSTEM").trim(),
      updatedAt: String(income?.updatedAt || "").trim(),
      archivedAt: String(income?.archivedAt || "").trim(),
      serviceRecordId: String(income?.serviceRecordId || "").trim(),
      generatedOfferId: String(income?.generatedOfferId || "").trim(),
      templateId: String(income?.templateId || "").trim(),
      serviceForm: String(income?.serviceForm || "").trim().toUpperCase(),
      serviceCategory: String(income?.serviceCategory || "").trim().toUpperCase(),
      oneTime: income?.oneTime === true || String(income?.serviceForm || income?.reference || "").toUpperCase().includes("ONE-TIME"),
      lastSettlementAt: String(income?.lastSettlementAt || "").trim()
    };
  }

  function normalizeServiceForm(value = "AGREEMENT") {
    const form = String(value || "AGREEMENT").trim().toUpperCase().replace(/\s+/g, "_");
    if (["ONE_TIME", "ONE-TIME", "COMMISSION", "ASSIGNMENT"].includes(form)) return "COMMISSION";
    if (["FIXED_TERM", "FIXED-TERM", "CONTRACT"].includes(form)) return "CONTRACT";
    if (["LONG_TERM", "LONG-TERM", "AGREEMENT"].includes(form)) return "AGREEMENT";
    return "AGREEMENT";
  }

  function normalizeServiceCategory(value = "REGULAR") {
    const category = String(value || "REGULAR").trim().toUpperCase();
    return category === "MANDATORY" ? "MANDATORY" : "REGULAR";
  }

  function getServiceTypeLabel(category = "REGULAR", form = "AGREEMENT") {
    const normalizedCategory = normalizeServiceCategory(category);
    const normalizedForm = normalizeServiceForm(form);
    if (normalizedForm === "COMMISSION") return `One-Time ${normalizedCategory === "MANDATORY" ? "Mandatory" : "Regular"} Commission`;
    if (normalizedForm === "CONTRACT") return `Fixed-Term ${normalizedCategory === "MANDATORY" ? "Mandatory" : "Regular"} Contract`;
    return `Long-Term ${normalizedCategory === "MANDATORY" ? "Mandatory" : "Regular"} Agreement`;
  }

  function normalizeServicePayoutStatus(record = {}, form = "") {
    const normalizedForm = normalizeServiceForm(form || record.form || record.serviceForm || record.type);
    if (normalizedForm !== "COMMISSION") return "";
    const explicit = String(record.payoutStatus || record.commissionPayoutStatus || "").trim().toUpperCase();
    if (explicit === "SETTLED" || String(record.payoutSettledAt || "").trim()) return "SETTLED";
    if (["NOT_READY", "PENDING", "PENDING_COMPLETION", "READY_FOR_SETTLEMENT", "APPROVED", "REJECTED", "CANCELLED", "FORFEITED"].includes(explicit)) return explicit;
    const status = normalizeFinancialStatus(record.status, "ACTIVE");
    if (String(record.serviceIncomeId || "").trim()) return "APPROVED";
    if (status === "COMPLETED") return "READY_FOR_SETTLEMENT";
    if (status === "ACTIVE") return "PENDING_COMPLETION";
    return "NOT_READY";
  }


  function normalizeServiceExperienceKey(value = "") {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function normalizeServiceExperienceGain(value = []) {
    const source = Array.isArray(value)
      ? value
      : value && typeof value === "object"
        ? Object.entries(value).map(([categoryId, amount]) => ({ categoryId, value: amount }))
        : [];

    return source
      .map((item) => {
        const categoryId = normalizeServiceExperienceKey(item?.categoryId || item?.id || item?.key || item?.category || "");
        const amount = parseCreditNumber(item?.value ?? item?.amount ?? item?.level ?? item?.gain ?? 0);
        return categoryId && amount > 0 ? { categoryId, value: amount } : null;
      })
      .filter(Boolean);
  }

  function normalizeServiceExperience(value = {}) {
    const result = {};
    const add = (categoryId, amount) => {
      const key = normalizeServiceExperienceKey(categoryId);
      const points = parseCreditNumber(amount);
      if (!key || points <= 0) return;
      result[key] = Math.max(0, (result[key] || 0) + points);
    };

    if (Array.isArray(value)) {
      value.forEach((item) => add(item?.categoryId || item?.id || item?.key || item?.category, item?.value ?? item?.amount ?? item?.level));
      return result;
    }

    if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, amount]) => add(key, amount));
    }

    return result;
  }

  function getServiceTemplateById(templateId = "") {
    const id = String(templateId || "").trim();
    if (!id) return null;
    const templates = window.APP_DATA?.serviceDatabase?.serviceOfferTemplates || [];
    return (Array.isArray(templates) ? templates : []).find((template) => String(template?.id || "") === id) || null;
  }

  function getServiceExperienceGainFromRecord(record = {}) {
    const direct = normalizeServiceExperienceGain(record.experienceGain || record.rewards?.experienceGain || []);
    if (direct.length) return direct;
    const template = getServiceTemplateById(record.templateId || record.serviceTemplateId || "");
    return normalizeServiceExperienceGain(template?.rewards?.experienceGain || []);
  }

  function mergeServiceExperienceGain(current = {}, gain = []) {
    const result = normalizeServiceExperience(current);
    normalizeServiceExperienceGain(gain).forEach((item) => {
      result[item.categoryId] = Math.max(0, parseCreditNumber(result[item.categoryId]) + parseCreditNumber(item.value));
    });
    return result;
  }

  function formatServiceExperienceGainLabel(gain = []) {
    return normalizeServiceExperienceGain(gain)
      .map((item) => `${item.categoryId} +${item.value}`)
      .join(" / ");
  }

  function normalizeServiceRecord(record = {}, index = 0) {
    const category = normalizeServiceCategory(record.category || record.serviceCategory);
    const form = normalizeServiceForm(record.form || record.serviceForm || record.type);
    const title = String(record.title || record.name || "Service Record").trim();
    const payoutStatus = normalizeServicePayoutStatus(record, form);
    const experienceGain = getServiceExperienceGainFromRecord(record);
    const rewards = {
      ...(record.rewards && typeof record.rewards === "object" && !Array.isArray(record.rewards) ? record.rewards : {}),
      experienceGain
    };
    return {
      id: String(record.id || `service-${makeSlug(title)}-${index + 1}`).trim(),
      offerId: String(record.offerId || "").trim(),
      generatedOfferId: String(record.generatedOfferId || record.offerId || "").trim(),
      templateId: String(record.templateId || record.serviceTemplateId || "").trim(),
      employerId: String(record.employerId || "").trim(),
      providerId: String(record.providerId || record.employerId || "").trim(),
      organizationId: String(record.organizationId || "").trim(),
      employerType: String(record.employerType || record.providerClass || "").trim(),
      categoryId: String(record.categoryId || record.workCategoryId || "").trim(),
      subcategoryId: String(record.subcategoryId || "").trim(),
      workCharacterId: String(record.workCharacterId || "").trim(),
      settlementWeek: String(record.settlementWeek || "").trim(),
      sourceType: String(record.sourceType || record.offerSourceType || record.source || "GENERATED_WEEKLY").trim().toUpperCase(),
      title,
      provider: String(record.provider || record.employer || record.commissioningParty || "LOCAL SERVICE REGISTRY").trim(),
      category,
      form,
      typeLabel: String(record.typeLabel || getServiceTypeLabel(category, form)).trim(),
      status: serviceLogLifecycle.normalizeStatus(record.status, "ACTIVE"),
      amount: parseCreditNumber(record.amount ?? record.payment),
      cycle: String(record.cycle || "WEEKLY").trim().toUpperCase(),
      durationWeeks: form === "CONTRACT" ? Math.max(1, parseCreditNumber(record.durationWeeks) || 1) : 0,
      durationType: String(record.durationType || (form === "COMMISSION" ? "One-Time" : form === "AGREEMENT" ? "Indefinite" : `${Math.max(1, parseCreditNumber(record.durationWeeks) || 1)} Weeks`)).trim(),
      dueDate: String(form === "COMMISSION" ? (record.dueDate || record.deadline || "") : "").trim(),
      providerClass: String(record.providerClass || "").trim(),
      details: String(record.details || record.description || "").trim(),
      result: String(record.result || "").trim().toUpperCase(),
      acceptedAt: String(record.acceptedAt || "").trim(),
      completedAt: String(record.completedAt || "").trim(),
      suspendedAt: String(record.suspendedAt || "").trim(),
      failedAt: String(record.failedAt || "").trim(),
      terminatedAt: String(record.terminatedAt || "").trim(),
      createdBy: String(record.createdBy || window.WS_APP.currentUser?.login || "SYSTEM").trim(),
      serviceIncomeId: String(record.serviceIncomeId || "").trim(),
      payoutStatus,
      payoutNote: String(record.payoutNote || record.commissionPayoutNote || "").trim(),
      payoutUpdatedAt: String(record.payoutUpdatedAt || "").trim(),
      payoutUpdatedBy: String(record.payoutUpdatedBy || "").trim(),
      payoutApprovedAt: String(record.payoutApprovedAt || "").trim(),
      payoutApprovedBy: String(record.payoutApprovedBy || "").trim(),
      payoutRejectedAt: String(record.payoutRejectedAt || "").trim(),
      payoutRejectedBy: String(record.payoutRejectedBy || "").trim(),
      payoutSettledAt: String(record.payoutSettledAt || "").trim(),
      payoutSettledBy: String(record.payoutSettledBy || "").trim(),
      archivedAt: String(record.archivedAt || "").trim(),
      revision: Math.max(1, clampInteger(record.revision ?? 1, 1, 999999999, 1)),
      lifecycleHistory: (Array.isArray(record.lifecycleHistory) ? record.lifecycleHistory : []).map((entry, entryIndex) => ({
        transitionId: String(entry?.transitionId || `service-transition-${record.id || record.offerId || "record"}-${entryIndex + 1}`).trim(),
        fromStatus: String(entry?.fromStatus || "").trim().toUpperCase(),
        toStatus: serviceLogLifecycle.normalizeStatus(entry?.toStatus || record.status || "ACTIVE", "ACTIVE"),
        resultCode: String(entry?.resultCode || `SERVICE_LOG_TRANSITION_${serviceLogLifecycle.normalizeStatus(entry?.toStatus || record.status || "ACTIVE", "ACTIVE")}`).trim().toUpperCase(),
        revisionBefore: Math.max(1, clampInteger(entry?.revisionBefore ?? entryIndex + 1, 1, 999999999, entryIndex + 1)),
        revisionAfter: Math.max(1, clampInteger(entry?.revisionAfter ?? entryIndex + 2, 1, 999999999, entryIndex + 2)),
        changedAt: String(entry?.changedAt || entry?.updatedAt || "").trim(),
        changedBy: String(entry?.changedBy || entry?.updatedBy || "SYSTEM").trim(),
        reason: String(entry?.reason || "").trim(),
        source: String(entry?.source || "SERVICE_STORE").trim().toUpperCase(),
        idempotencyKey: String(entry?.idempotencyKey || "").trim(),
        correlationId: String(entry?.correlationId || "").trim()
      })).filter((entry) => entry.toStatus),
      updatedAt: String(record.updatedAt || "").trim(),
      completedBy: String(record.completedBy || "").trim(),
      completionMode: String(record.completionMode || "").trim().toUpperCase(),
      lifecycleNote: String(record.lifecycleNote || "").trim(),
      rewards,
      experienceGain,
      experienceGrantedAt: String(record.experienceGrantedAt || "").trim(),
      experienceGrantedBy: String(record.experienceGrantedBy || "").trim()
    };
  }

  function normalizeServiceLog(value) {
    return (Array.isArray(value) ? value : [])
      .filter(Boolean)
      .map((record, index) => normalizeServiceRecord(record, index));
  }

  function isServiceStatusActive(status = "") {
    return normalizeFinancialStatus(status, "ACTIVE") === "ACTIVE";
  }

  function getServiceLinkedIncomeId(record = {}, existingIncome = null) {
    const explicit = String(record.serviceIncomeId || existingIncome?.id || "").trim();
    if (explicit) return explicit;
    return `income-service-${makeSlug(record.id || record.title || "service-record")}`;
  }

  function buildIncomeFromServiceRecord(record = {}, existingIncome = null, options = {}) {
    const form = normalizeServiceForm(record.form);
    const category = normalizeServiceCategory(record.category);
    const oneTime = options.oneTime === true || form === "COMMISSION";
    const incomeId = getServiceLinkedIncomeId(record, existingIncome);
    return normalizeIncomeEntry({
      ...(existingIncome || {}),
      id: incomeId,
      title: record.title || existingIncome?.title || "Service Income",
      provider: record.provider || existingIncome?.provider || "LOCAL SERVICE REGISTRY",
      amount: parseCreditNumber(record.amount),
      cycle: "WEEKLY",
      status: "ACTIVE",
      reference: record.typeLabel || getServiceTypeLabel(category, form),
      details: record.details || existingIncome?.details || "Service-linked income routed through weekly settlement.",
      terms: record.durationType || existingIncome?.terms || (form === "CONTRACT" ? `${record.durationWeeks || 1} Weeks` : form === "AGREEMENT" ? "Indefinite" : "One-Time"),
      serviceRecordId: record.id,
      generatedOfferId: record.generatedOfferId || record.offerId || "",
      templateId: record.templateId || "",
      serviceForm: form,
      serviceCategory: category,
      oneTime,
      createdBy: existingIncome?.createdBy || record.createdBy || window.WS_APP.currentUser?.login || "SYSTEM",
      updatedAt: getTerminalDateIso(),
      archivedAt: ""
    });
  }

  function syncIncomeWithServiceLog(incomeValue = [], serviceLogValue = []) {
    const serviceLog = normalizeServiceLog(serviceLogValue);
    const serviceIncomeIds = new Set(serviceLog
      .map((record) => String(record.serviceIncomeId || "").trim())
      .filter(Boolean));
    const income = normalizeIncome(incomeValue);
    const incomeById = new Map(income.map((entry, index) => [String(entry.id || ""), { entry, index }]));
    const incomeByServiceRecordId = new Map();

    income.forEach((entry, index) => {
      const recordId = String(entry.serviceRecordId || "").trim();
      if (recordId && !incomeByServiceRecordId.has(recordId)) incomeByServiceRecordId.set(recordId, { entry, index });
    });

    const upsertIncome = (entry) => {
      const id = String(entry.id || "").trim();
      const byId = incomeById.get(id);
      const byRecord = incomeByServiceRecordId.get(String(entry.serviceRecordId || "").trim());
      const target = byId || byRecord;
      if (target) {
        income[target.index] = normalizeIncomeEntry(entry);
        incomeById.set(id, { entry: income[target.index], index: target.index });
        if (entry.serviceRecordId) incomeByServiceRecordId.set(entry.serviceRecordId, { entry: income[target.index], index: target.index });
        return income[target.index];
      }
      const normalized = normalizeIncomeEntry(entry);
      income.push(normalized);
      const index = income.length - 1;
      incomeById.set(normalized.id, { entry: normalized, index });
      if (normalized.serviceRecordId) incomeByServiceRecordId.set(normalized.serviceRecordId, { entry: normalized, index });
      return normalized;
    };

    serviceLog.forEach((record) => {
      const form = normalizeServiceForm(record.form);
      const status = normalizeFinancialStatus(record.status, "ACTIVE");
      const linked = (record.serviceIncomeId && incomeById.get(record.serviceIncomeId)?.entry) || incomeByServiceRecordId.get(record.id)?.entry || null;
      const amount = parseCreditNumber(record.amount);

      if (["AGREEMENT", "CONTRACT"].includes(form) && isServiceStatusActive(status) && amount > 0) {
        const synced = upsertIncome(buildIncomeFromServiceRecord(record, linked, { oneTime: false }));
        record.serviceIncomeId = synced.id;
        return;
      }

      const payoutStatus = normalizeServicePayoutStatus(record, form);
      if (form === "COMMISSION" && linked?.lastSettlementAt) {
        record.serviceIncomeId = linked.id;
        record.payoutStatus = "SETTLED";
        record.payoutSettledAt = record.payoutSettledAt || linked.lastSettlementAt;
        record.payoutSettledBy = record.payoutSettledBy || linked.updatedBy || linked.createdBy || "SYSTEM";
        record.payoutUpdatedAt = record.payoutUpdatedAt || linked.updatedAt || linked.lastSettlementAt;
        record.payoutUpdatedBy = record.payoutUpdatedBy || record.payoutSettledBy;
        return;
      }

      if (form === "COMMISSION" && status === "COMPLETED" && payoutStatus === "APPROVED" && amount > 0) {
        if (["ARCHIVED", "TERMINATED"].includes(String(linked?.status || "").toUpperCase())) {
          record.serviceIncomeId = linked.id;
          return;
        }
        const synced = upsertIncome(buildIncomeFromServiceRecord(record, linked, { oneTime: true }));
        record.serviceIncomeId = synced.id;
        return;
      }

      if (linked) {
        const inactiveStatus = status === "SUSPENDED" ? "SUSPENDED" : "ARCHIVED";
        const synced = upsertIncome(normalizeIncomeEntry({
          ...linked,
          status: inactiveStatus,
          archivedAt: inactiveStatus === "ARCHIVED" ? (linked.archivedAt || getTerminalDateIso()) : "",
          updatedAt: getTerminalDateIso()
        }));
        record.serviceIncomeId = synced.id;
      }
    });

    return {
      income: normalizeIncome(income),
      serviceLog: normalizeServiceLog(serviceLog)
    };
  }

  function normalizeServiceOffer(offer = {}, index = 0) {
    const category = normalizeServiceCategory(offer.category || offer.serviceCategory);
    const form = normalizeServiceForm(offer.form || offer.serviceForm || offer.type);
    const title = String(offer.title || offer.name || "Service Offer").trim();
    const durationWeeks = Math.max(0, parseCreditNumber(offer.durationWeeks));
    const template = getServiceTemplateById(offer.templateId || "");
    const experienceGain = normalizeServiceExperienceGain(offer.experienceGain || offer.rewards?.experienceGain || template?.rewards?.experienceGain || []);
    const rewards = {
      ...(template?.rewards && typeof template.rewards === "object" ? template.rewards : {}),
      ...(offer.rewards && typeof offer.rewards === "object" && !Array.isArray(offer.rewards) ? offer.rewards : {}),
      experienceGain
    };
    return {
      id: String(offer.id || `service-offer-${makeSlug(title)}-${index + 1}`).trim(),
      generatedOfferId: String(offer.generatedOfferId || offer.id || "").trim(),
      templateId: String(offer.templateId || "").trim(),
      employerId: String(offer.employerId || "").trim(),
      providerId: String(offer.providerId || offer.employerId || "").trim(),
      organizationId: String(offer.organizationId || "").trim(),
      employerType: String(offer.employerType || offer.providerClass || "").trim(),
      categoryId: String(offer.categoryId || offer.workCategoryId || "").trim(),
      subcategoryId: String(offer.subcategoryId || "").trim(),
      workCharacterId: String(offer.workCharacterId || "").trim(),
      settlementWeek: String(offer.settlementWeek || "").trim(),
      sourceType: String(offer.sourceType || offer.offerSourceType || offer.source || "MANUAL_ADMIN").trim().toUpperCase(),
      targetCitizenId: String(offer.targetCitizenId || offer.citizenId || offer.characterId || "").trim(),
      title,
      provider: String(offer.provider || offer.employer || offer.commissioningParty || "LOCAL SERVICE REGISTRY").trim(),
      category,
      form,
      typeLabel: String(offer.typeLabel || getServiceTypeLabel(category, form)).trim(),
      status: normalizeFinancialStatus(offer.status, "AVAILABLE"),
      amount: parseCreditNumber(offer.amount ?? offer.payment),
      cycle: String(offer.cycle || "WEEKLY").trim().toUpperCase(),
      durationWeeks: form === "CONTRACT" ? Math.max(1, durationWeeks || 1) : 0,
      durationType: String(offer.durationType || (form === "COMMISSION" ? "One-Time" : form === "AGREEMENT" ? "Indefinite" : `${durationWeeks || 1} Weeks`)).trim(),
      dueDate: String(form === "COMMISSION" ? (offer.dueDate || offer.deadline || "") : "").trim(),
      providerClass: String(offer.providerClass || "").trim(),
      details: String(offer.details || offer.description || "").trim(),
      createdBy: String(offer.createdBy || window.WS_APP.currentUser?.login || "SYSTEM").trim(),
      createdAt: String(offer.createdAt || "").trim(),
      archivedAt: String(offer.archivedAt || "").trim(),
      lifecycleNote: String(offer.lifecycleNote || "").trim(),
      rewards,
      experienceGain
    };
  }

  function normalizeServiceOffers(value) {
    return (Array.isArray(value) ? value : [])
      .filter(Boolean)
      .map((offer, index) => normalizeServiceOffer(offer, index));
  }

  const SERVICE_OFFER_TERMINAL_STATUSES = new Set(["ACTIVE", "COMPLETED", "FAILED", "TERMINATED", "ARCHIVED", "REJECTED", "EXPIRED"]);

  function getServiceOfferStateKey(value = {}) {
    return String(value.generatedOfferId || value.offerId || value.id || value.templateId || "").trim();
  }

  function normalizeServiceOfferState(state = {}, fallbackKey = "") {
    const generatedOfferId = String(state.generatedOfferId || state.offerId || fallbackKey || state.id || "").trim();
    const status = normalizeFinancialStatus(state.status || "AVAILABLE", "AVAILABLE");
    return {
      generatedOfferId,
      offerId: String(state.offerId || generatedOfferId || "").trim(),
      templateId: String(state.templateId || "").trim(),
      employerId: String(state.employerId || "").trim(),
      providerId: String(state.providerId || state.employerId || "").trim(),
      organizationId: String(state.organizationId || "").trim(),
      employerType: String(state.employerType || "").trim(),
      categoryId: String(state.categoryId || "").trim(),
      workCharacterId: String(state.workCharacterId || "").trim(),
      settlementWeek: String(state.settlementWeek || "").trim(),
      sourceType: String(state.sourceType || state.source || "GENERATED_WEEKLY").trim().toUpperCase(),
      status,
      title: String(state.title || "").trim(),
      provider: String(state.provider || "").trim(),
      reason: String(state.reason || state.note || "").trim(),
      serviceRecordId: String(state.serviceRecordId || state.activeServiceId || "").trim(),
      incomeSourceId: String(state.incomeSourceId || state.serviceIncomeId || "").trim(),
      createdAt: String(state.createdAt || "").trim(),
      updatedAt: String(state.updatedAt || state.createdAt || "").trim(),
      updatedBy: String(state.updatedBy || state.createdBy || "SYSTEM").trim()
    };
  }

  function normalizeServiceOfferStates(value = {}) {
    const source = Array.isArray(value)
      ? Object.fromEntries(value.map((item) => [getServiceOfferStateKey(item), item]).filter(([key]) => key))
      : value && typeof value === "object"
        ? value
        : {};
    return Object.entries(source).reduce((acc, [key, state]) => {
      const normalized = normalizeServiceOfferState(state, key);
      const normalizedKey = normalized.generatedOfferId || key;
      if (normalizedKey) acc[normalizedKey] = normalized;
      return acc;
    }, {});
  }

  function normalizeServiceReputation(value = {}) {
    const source = value && typeof value === "object" ? value : {};
    return Object.entries(source).reduce((acc, [employerId, item]) => {
      const id = String(employerId || item?.employerId || "").trim();
      if (!id) return acc;
      const entry = item && typeof item === "object" ? item : { score: item };
      acc[id] = {
        employerId: id,
        score: Math.max(-10, Math.min(10, parseCreditNumber(entry.score ?? entry.value ?? 0))),
        completed: Math.max(0, parseCreditNumber(entry.completed ?? 0)),
        failed: Math.max(0, parseCreditNumber(entry.failed ?? 0)),
        rejected: Math.max(0, parseCreditNumber(entry.rejected ?? 0)),
        updatedAt: String(entry.updatedAt || "").trim()
      };
      return acc;
    }, {});
  }

  function applyServiceReputationDelta(current = {}, employerId = "", delta = 0, bucket = "completed", updatedAt = getTerminalDateIso()) {
    const id = String(employerId || "").trim();
    const next = normalizeServiceReputation(current);
    if (!id || !delta) return next;
    const entry = next[id] || { employerId: id, score: 0, completed: 0, failed: 0, rejected: 0, updatedAt: "" };
    entry.score = Math.max(-10, Math.min(10, parseCreditNumber(entry.score) + parseCreditNumber(delta)));
    if (bucket && Object.prototype.hasOwnProperty.call(entry, bucket)) entry[bucket] = Math.max(0, parseCreditNumber(entry[bucket]) + 1);
    entry.updatedAt = updatedAt;
    next[id] = entry;
    return next;
  }

  function upsertServiceOfferState(current = {}, patch = {}) {
    const states = normalizeServiceOfferStates(current);
    const key = getServiceOfferStateKey(patch);
    if (!key) return states;
    states[key] = normalizeServiceOfferState({ ...(states[key] || {}), ...patch }, key);
    return states;
  }

  function normalizeSubscriptions(value, citizenId = "") {
    const source = typeof window.WS_APP.cleanSubscriptionSeedContractList === "function"
      ? window.WS_APP.cleanSubscriptionSeedContractList(value)
      : (Array.isArray(value) ? value : []);
    return source
      .filter(Boolean)
      .map((subscription, index) => normalizeSubscriptionEntry(subscription, index, citizenId));
  }

  const EQUIPMENT_GRID_WIDTH = 4;
  const EQUIPMENT_BASE_ROWS = 3;
  const EQUIPMENT_BASE_CELLS = EQUIPMENT_GRID_WIDTH * EQUIPMENT_BASE_ROWS;
  const EQUIPMENT_FOOTPRINTS = {
    "1x1": { w: 1, h: 1 },
    "2x1": { w: 2, h: 1 },
    "3x1": { w: 3, h: 1 },
    "4x1": { w: 4, h: 1 },
    "1x2": { w: 1, h: 2 },
    "1x3": { w: 1, h: 3 },
    "2x2": { w: 2, h: 2 },
    "2x3": { w: 2, h: 3 },
    "2x4": { w: 2, h: 4 },
    "3x3": { w: 3, h: 3 }
  };

  function normalizeEquipmentLayerKey(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  const EQUIPMENT_BODY_REGION_KEYS = ["HEAD", "FACE", "NECK", "IMPLANT_PORT", "LEFT_SHOULDER", "RIGHT_SHOULDER", "TORSO", "BACK", "LEFT_FOREARM", "RIGHT_FOREARM", "HANDS", "LEFT_HAND", "RIGHT_HAND", "WAIST", "LEFT_THIGH", "RIGHT_THIGH", "LEGS", "FEET"];
  const EQUIPMENT_BODY_LAYER_KEYS = ["INNER", "OUTER", "OUTERWEAR", "ARMOR", "FACE", "FOOTWEAR", "HELD"];
  const EQUIPMENT_BODY_MOUNT_KEYS = ["IMPLANT_PORT", "LEFT_SHOULDER_CARRY", "RIGHT_SHOULDER_CARRY", "LEFT_FOREARM_ACCESSORY_1", "LEFT_FOREARM_ACCESSORY_2", "RIGHT_FOREARM_ACCESSORY_1", "RIGHT_FOREARM_ACCESSORY_2", "WAIST_CARRY", "BACK_CARRY", "LEFT_THIGH_HOLSTER", "RIGHT_THIGH_HOLSTER"];
  function normalizeEquipmentBodyRegionKey(value = "") {
    const canonical = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    return EQUIPMENT_BODY_REGION_KEYS.includes(canonical) ? canonical : "";
  }

  function normalizeEquipmentBodyAnchorForLayer(value = "") {
    return normalizeEquipmentBodyRegionKey(value);
  }

  function normalizeEquipmentBodyLayerKey(value = "", fallback = "") {
    const canonical = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    if (EQUIPMENT_BODY_LAYER_KEYS.includes(canonical)) return canonical;
    const fallbackToken = String(fallback || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    return EQUIPMENT_BODY_LAYER_KEYS.includes(fallbackToken) ? fallbackToken : "";
  }

  function inferEquipmentBodyLayer(source = {}) {
    const tokens = new Set([source.category, source.subtype, ...(Array.isArray(source.tags) ? source.tags : [])]
      .map((entry) => String(entry || "").trim().replace(/[\s-]+/g, "_").toUpperCase()).filter(Boolean));
    if (["WEAPON", "TOOLS", "TOOL", "MEDICAL"].some((token) => tokens.has(token))) return "HELD";
    if (["RESPIRATOR", "MASK", "FACE"].some((token) => tokens.has(token))) return "FACE";
    if (["BOOTS", "FOOTWEAR", "SHOES"].some((token) => tokens.has(token))) return "FOOTWEAR";
    if (["ARMOR", "VEST", "GUARD"].some((token) => tokens.has(token))) return "ARMOR";
    if (["OUTERWEAR", "ANORAK", "COAT"].some((token) => tokens.has(token))) return "OUTERWEAR";
    if (["SWEATSHIRT", "JACKET", "TROUSERS", "OUTER"].some((token) => tokens.has(token))) return "OUTER";
    if (["HEADGEAR", "HELMET", "HAT", "CAP"].some((token) => tokens.has(token))) return "OUTER";
    if (["CLOTHING", "GLOVES", "SOCKS", "UNDERSUIT"].some((token) => tokens.has(token))) return "INNER";
    return "";
  }

  function normalizeEquipmentConstraintList(value = []) {
    return (Array.isArray(value) ? value : []).map((entry) => {
      if (typeof entry === "string") {
        const [rawAnchor, rawLayer] = entry.split(":");
        const layer = normalizeEquipmentBodyLayerKey(rawLayer);
        const anchor = normalizeEquipmentBodyAnchorForLayer(rawAnchor, layer);
        return anchor && layer ? { anchor, layer } : null;
      }
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const layer = normalizeEquipmentBodyLayerKey(entry.layer);
      const anchor = normalizeEquipmentBodyAnchorForLayer(entry.anchor || entry.region || entry.slot, layer);
      return anchor && layer ? { anchor, layer } : null;
    }).filter(Boolean);
  }

  function normalizeEquipmentBodyMountSet(value = {}, index = 0) {
    const source = Array.isArray(value) ? { mountIds: value } : value && typeof value === "object" ? value : { mountIds: [value] };
    const mountIds = [...new Set((Array.isArray(source.mountIds) ? source.mountIds : []).map((entry) => String(entry || "").trim().replace(/[\s-]+/g, "_").toUpperCase()).filter((entry) => EQUIPMENT_BODY_MOUNT_KEYS.includes(entry)))];
    if (!mountIds.length) return null;
    return { id: String(source.id || source.key || mountIds.join("+") || `MOUNT_SET_${index + 1}`).trim().replace(/[\s-]+/g, "_").toUpperCase(), label: String(source.label || mountIds.join(" + ")).trim(), mountIds };
  }

  function inferEquipmentBodyMountSets(source = {}, allowedAnchors = []) {
    const tokens = new Set([source.category, source.subtype, ...(Array.isArray(source.tags) ? source.tags : [])].map((entry) => String(entry || "").trim().replace(/[\s-]+/g, "_").toUpperCase()).filter(Boolean));
    if (tokens.has("BACKPACK")) return [normalizeEquipmentBodyMountSet({ id: "BACKPACK", mountIds: ["BACK_CARRY", "LEFT_SHOULDER_CARRY", "RIGHT_SHOULDER_CARRY"] })];
    if (tokens.has("BELT") || tokens.has("WAIST_BAG")) return [normalizeEquipmentBodyMountSet({ id: "WAIST", mountIds: ["WAIST_CARRY"] })];
    if (tokens.has("HOLSTER")) {
      if (allowedAnchors.includes("LEFT_THIGH")) return [normalizeEquipmentBodyMountSet({ id: "LEFT_THIGH", mountIds: ["LEFT_THIGH_HOLSTER"] })];
      if (allowedAnchors.includes("RIGHT_THIGH")) return [normalizeEquipmentBodyMountSet({ id: "RIGHT_THIGH", mountIds: ["RIGHT_THIGH_HOLSTER"] })];
    }
    if (tokens.has("BAG") || tokens.has("SLING") || tokens.has("SCABBARD") || tokens.has("SHEATH")) return [
      normalizeEquipmentBodyMountSet({ id: "LEFT_SHOULDER", mountIds: ["LEFT_SHOULDER_CARRY"] }),
      normalizeEquipmentBodyMountSet({ id: "RIGHT_SHOULDER", mountIds: ["RIGHT_SHOULDER_CARRY"] })
    ];
    return [];
  }

  function normalizeEquipmentMountProfile(source = {}) {
    const raw = source.mountProfile && typeof source.mountProfile === "object" && !Array.isArray(source.mountProfile) ? source.mountProfile : {};
    const slots = (Array.isArray(raw.slots) ? raw.slots : []).map((entry, index) => {
      const slot = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
      const id = String(slot.id || slot.key || `MOUNT_${index + 1}`).trim().replace(/[\s-]+/g, "_").toUpperCase();
      const type = String(slot.type || slot.mountType || id).trim().replace(/[\s-]+/g, "_").toUpperCase();
      return id && type ? { id, type, label: String(slot.label || id).trim(), acceptedTags: Array.isArray(slot.acceptedTags) ? slot.acceptedTags.map((tag) => String(tag).trim().toUpperCase()).filter(Boolean) : [], blockedTags: Array.isArray(slot.blockedTags) ? slot.blockedTags.map((tag) => String(tag).trim().toUpperCase()).filter(Boolean) : [] } : null;
    }).filter(Boolean);
    return slots.length ? { slots } : null;
  }

  function normalizeEquipmentEquipProfile(source = {}) {
    const raw = source.equipProfile && typeof source.equipProfile === "object" && !Array.isArray(source.equipProfile)
      ? source.equipProfile
      : {};
    const layer = normalizeEquipmentBodyLayerKey(raw.layer, inferEquipmentBodyLayer(source));
    const allowedAnchors = Array.from(new Set((Array.isArray(raw.allowedAnchors) ? raw.allowedAnchors : [])
      .map((anchor) => normalizeEquipmentBodyAnchorForLayer(anchor, layer)).filter(Boolean)));
    const coverage = Array.from(new Set((Array.isArray(raw.coverage) ? raw.coverage : [])
      .map((anchor) => normalizeEquipmentBodyAnchorForLayer(anchor, layer)).filter(Boolean)));
    let bodyMountSets = (Array.isArray(raw.bodyMountSets) ? raw.bodyMountSets : []).map(normalizeEquipmentBodyMountSet).filter(Boolean);
    if (!bodyMountSets.length && !layer) bodyMountSets = inferEquipmentBodyMountSets(source, allowedAnchors);
    return {
      allowedAnchors,
      layer,
      coverage,
      bodyMountSets,
      itemMountTypes: Array.from(new Set((Array.isArray(raw.itemMountTypes) ? raw.itemMountTypes : []).map((entry) => String(entry || "").trim().replace(/[\s-]+/g, "_").toUpperCase()).filter(Boolean))),
      handsRequired: Math.max(1, Math.min(2, Math.round(Number(raw.handsRequired || 1)) || 1)),
      countsAsBulkyCarrier: raw.countsAsBulkyCarrier === true,
      requires: normalizeEquipmentConstraintList(raw.requires || []),
      blocks: normalizeEquipmentConstraintList(raw.blocks || [])
    };
  }

  function normalizeEquipmentEquippedLocation(source = {}, equipProfile = normalizeEquipmentEquipProfile(source)) {
    const raw = source.equippedLocation && typeof source.equippedLocation === "object" && !Array.isArray(source.equippedLocation)
      ? source.equippedLocation
      : null;
    if (!raw) return null;
    const kind = String(raw.kind || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    if (kind === "ITEM_MOUNT") {
      const ownerItemId = String(raw.ownerItemId || "").trim();
      const mountId = String(raw.mountId || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
      return ownerItemId && mountId ? { kind: "ITEM_MOUNT", ownerItemId, mountId } : null;
    }
    if (kind === "BODY_MOUNT") {
      const mountIds = Array.from(new Set((Array.isArray(raw.mountIds) ? raw.mountIds : [])
        .map((entry) => String(entry || "").trim().replace(/[\s-]+/g, "_").toUpperCase())
        .filter((entry) => EQUIPMENT_BODY_MOUNT_KEYS.includes(entry))));
      if (!mountIds.length) return null;
      const primaryMountId = String(raw.primaryMountId || mountIds[0]).trim().replace(/[\s-]+/g, "_").toUpperCase();
      return mountIds.includes(primaryMountId) ? { kind: "BODY_MOUNT", primaryMountId, mountIds } : null;
    }
    if (kind !== "LAYER") return null;
    const layer = normalizeEquipmentBodyLayerKey(raw.layer, equipProfile.layer || inferEquipmentBodyLayer(source));
    const anchor = normalizeEquipmentBodyAnchorForLayer(raw.anchor || raw.region, layer);
    const coverage = Array.from(new Set((Array.isArray(raw.coverage) ? raw.coverage : [])
      .map((entry) => normalizeEquipmentBodyAnchorForLayer(entry, layer)).filter(Boolean)));
    return anchor && layer ? { kind: "LAYER", anchor, layer, coverage } : null;
  }

  function normalizeEquipmentSupportSlots(value = []) {
    const source = Array.isArray(value)
      ? value
      : value !== undefined && value !== null && value !== ""
        ? String(value).split(/[\n,]/)
        : [];
    return source.map((entry, index) => {
      if (typeof entry === "string") return entry.trim();
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return "";
      const key = String(entry.key || entry.id || entry.slot || entry.name || `slot-${index + 1}`).trim();
      if (!key) return "";
      return {
        ...entry,
        key
      };
    }).filter(Boolean);
  }

  function equipmentRowsFromCells(value, fallback = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.trunc(number / EQUIPMENT_GRID_WIDTH);
  }

  function normalizeEquipmentCyberwareMeta(source = {}) {
    const cyberware = source.cyberware && typeof source.cyberware === "object" && !Array.isArray(source.cyberware) ? source.cyberware : {};
    const combined = { ...source, ...cyberware };
    const tags = Array.isArray(combined.tags) ? combined.tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
    const slots = Array.isArray(combined.slots)
      ? combined.slots.map((slot) => String(slot).trim()).filter(Boolean)
      : combined.slots !== undefined && combined.slots !== null && combined.slots !== ""
        ? [String(combined.slots).trim()].filter(Boolean)
        : [];
    const requiredBuses = Array.isArray(combined.requiredBuses)
      ? combined.requiredBuses.map((bus) => String(bus).trim()).filter(Boolean)
      : combined.requiredBuses !== undefined && combined.requiredBuses !== null && combined.requiredBuses !== ""
        ? [String(combined.requiredBuses).trim()].filter(Boolean)
        : [];
    const compatibleWith = Array.isArray(combined.compatibleWith)
      ? combined.compatibleWith.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const exposedSlots = Array.isArray(combined.exposedSlots)
      ? combined.exposedSlots.map((slot) => String(slot).trim()).filter(Boolean)
      : [];
    const lockedDescendants = Array.isArray(combined.lockedDescendants)
      ? combined.lockedDescendants.map((slot) => String(slot).trim()).filter(Boolean)
      : [];
    const acceptedChildGroups = Array.isArray(combined.acceptedChildGroups)
      ? combined.acceptedChildGroups.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const acceptedManufacturers = Array.isArray(combined.acceptedManufacturers)
      ? combined.acceptedManufacturers.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const acceptedStandards = Array.isArray(combined.acceptedStandards)
      ? combined.acceptedStandards.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const installLog = Array.isArray(combined.installLog)
      ? combined.installLog.filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry)).slice(-12).map((entry) => ({ ...entry }))
      : [];
    return {
      cyberwareCandidate: combined.cyberwareCandidate === true || combined.isCyberware === true || tags.map((tag) => tag.toUpperCase()).includes("CYBERWARE") || String(combined.category || "").trim().toUpperCase() === "CYBERWARE",
      cyberware: Object.keys(cyberware).length ? { ...cyberware } : null,
      implantId: String(combined.implantId || combined.cyberwareId || "").trim(),
      sourceCatalogId: String(combined.sourceCatalogId || combined.catalogId || combined.itemId || "").trim(),
      sourceType: String(combined.sourceType || combined.installSourceType || "EQUIPMENT").trim().toUpperCase(),
      manufacturer: String(combined.manufacturer || "").trim(),
      provider: String(combined.provider || combined.manufacturer || "").trim(),
      grade: String(combined.grade || combined.quality || "").trim().toUpperCase(),
      scale: String(combined.scale || combined.implantScale || combined.size || "").trim().toUpperCase(),
      primarySlot: String(combined.primarySlot || combined.slot || "").trim(),
      slot: String(combined.slot || combined.primarySlot || "").trim(),
      slots,
      slotLevel: String(combined.slotLevel || "").trim().toUpperCase(),
      descendantPolicy: String(combined.descendantPolicy || combined.childSlotPolicy || combined.subslotPolicy || "").trim().toUpperCase(),
      exposedSlots,
      lockedDescendants,
      acceptedChildGroups,
      acceptedManufacturers,
      acceptedStandards,
      slotCost: Number.isFinite(Number(combined.slotCost ?? combined.slotsUsed)) ? Math.max(0, Math.round(Number(combined.slotCost ?? combined.slotsUsed))) : 0,
      customizationSlots: Number.isFinite(Number(combined.customizationSlots ?? combined.customSlots)) ? Math.max(0, Math.round(Number(combined.customizationSlots ?? combined.customSlots))) : 0,
      neuroLoad: Number.isFinite(Number(combined.neuroLoad)) ? Math.max(0, Math.round(Number(combined.neuroLoad))) : 0,
      interfaceLoad: Number.isFinite(Number(combined.interfaceLoad)) ? Math.max(0, Math.round(Number(combined.interfaceLoad))) : 0,
      requiredBuses,
      requiresNeurochipTier: Number.isFinite(Number(combined.requiresNeurochipTier ?? combined.requiredNeurochipTier)) ? Math.max(0, Math.round(Number(combined.requiresNeurochipTier ?? combined.requiredNeurochipTier))) : 0,
      requiresInterfaceTier: Number.isFinite(Number(combined.requiresInterfaceTier ?? combined.requiredInterfaceTier)) ? Math.max(0, Math.round(Number(combined.requiresInterfaceTier ?? combined.requiredInterfaceTier))) : 0,
      processorRole: String(combined.processorRole || combined.role || "").trim().toUpperCase(),
      neurochipTier: Number.isFinite(Number(combined.neurochipTier)) ? Math.max(0, Math.round(Number(combined.neurochipTier))) : 0,
      interfaceTier: Number.isFinite(Number(combined.interfaceTier)) ? Math.max(0, Math.round(Number(combined.interfaceTier))) : 0,
      maxCyberwareGrade: String(combined.maxCyberwareGrade || combined.qualityCeiling || "").trim().toUpperCase(),
      maxScale: String(combined.maxScale || combined.maxImplantSize || "").trim().toUpperCase(),
      supportedBuses: Array.isArray(combined.supportedBuses) ? combined.supportedBuses.map((bus) => String(bus).trim()).filter(Boolean) : [],
      compatibilityGroup: String(combined.compatibilityGroup || "").trim(),
      compatibleWith,
      vendorLocked: combined.vendorLocked === true,
      isCoreProcessor: combined.isCoreProcessor === true,
      isCoreInterface: combined.isCoreInterface === true,
      isServicePort: combined.isServicePort === true || String(combined.processorRole || combined.role || "").trim().toUpperCase() === "SERVICE_PORT" || String(combined.subtype || "").trim().toUpperCase() === "SERVICE_PORT",
      servicePortTier: Number.isFinite(Number(combined.servicePortTier ?? combined.portTier)) ? Math.max(0, Math.round(Number(combined.servicePortTier ?? combined.portTier))) : 0,
      serviceAccess: Number.isFinite(Number(combined.serviceAccess)) ? Math.max(0, Math.round(Number(combined.serviceAccess))) : 0,
      diagnosticDepth: Number.isFinite(Number(combined.diagnosticDepth)) ? Math.max(0, Math.round(Number(combined.diagnosticDepth))) : 0,
      firmwareAccess: Number.isFinite(Number(combined.firmwareAccess)) ? Math.max(0, Math.round(Number(combined.firmwareAccess))) : 0,
      calibrationQuality: Number.isFinite(Number(combined.calibrationQuality)) ? Math.max(0, Math.round(Number(combined.calibrationQuality))) : 0,
      securityLock: Number.isFinite(Number(combined.securityLock)) ? Math.max(0, Math.round(Number(combined.securityLock))) : 0,
      emergencyAccess: Number.isFinite(Number(combined.emergencyAccess)) ? Math.max(0, Math.round(Number(combined.emergencyAccess))) : 0,
      traceability: Number.isFinite(Number(combined.traceability)) ? Math.max(0, Math.round(Number(combined.traceability))) : 0,
      physicalResilience: Number.isFinite(Number(combined.physicalResilience)) ? Math.max(0, Math.round(Number(combined.physicalResilience))) : 0,
      visualLocation: String(combined.visualLocation || "").trim(),
      compatibilityTags: Array.isArray(combined.compatibilityTags) ? combined.compatibilityTags.map((item) => String(item).trim()).filter(Boolean) : [],
      specialFeatures: Array.isArray(combined.specialFeatures) ? combined.specialFeatures.map((item) => String(item).trim()).filter(Boolean) : [],
      licenseRequired: combined.licenseRequired === true || combined.requiresLicense === true || combined.licenseActivationRequired === true || combined.licenseCodeRequired === true,
      licenseActivationRequired: combined.licenseActivationRequired === true || combined.activationRequired === true,
      licenseCodeRequired: combined.licenseCodeRequired === true || combined.requiresLicenseCode === true,
      licenseStatus: String(combined.licenseStatus || combined.licenseState || "").trim().toUpperCase(),
      licenseCode: String(combined.licenseCode || combined.activationCode || combined.licenseKey || "").trim(),
      licenseActivatedAt: String(combined.licenseActivatedAt || combined.activatedAt || "").trim(),
      subscriptionRequired: combined.subscriptionRequired === true || combined.requiresSubscription === true || combined.restrictions?.requiresSubscription === true,
      subscriptionCategory: String(combined.subscriptionCategory || combined.requiresSubscriptionCategory || "").trim().toUpperCase(),
      subscriptionTierRequired: Number.isFinite(Number(combined.subscriptionTierRequired ?? combined.requiresSubscriptionTier)) ? Math.max(0, Math.round(Number(combined.subscriptionTierRequired ?? combined.requiresSubscriptionTier))) : 0,
      subscriptionAvailableAfterPurchase: combined.subscriptionAvailableAfterPurchase !== undefined ? combined.subscriptionAvailableAfterPurchase === true : combined.availableAfterPurchase === true,
      firmwareRequired: combined.firmwareRequired === true || combined.requiresFirmware === true,
      firmwareChannel: String(combined.firmwareChannel || combined.firmwareSource || combined.updateChannel || "").trim().toUpperCase(),
      firmwareVersion: String(combined.firmwareVersion || combined.currentFirmwareVersion || combined.firmwareCurrentVersion || "").trim(),
      firmwareLatestVersion: String(combined.firmwareLatestVersion || combined.latestFirmwareVersion || "").trim(),
      firmwareStatus: String(combined.firmwareStatus || combined.firmwareState || combined.updateStatus || "").trim().toUpperCase(),
      firmwareUpdateRequired: combined.firmwareUpdateRequired === true || combined.requiresFirmwareUpdate === true,
      firmwareDownloadUrl: String(combined.firmwareDownloadUrl || combined.firmwareUrl || combined.updateUrl || "").trim(),
      lastImplantCheck: combined.lastImplantCheck && typeof combined.lastImplantCheck === "object" && !Array.isArray(combined.lastImplantCheck) ? { ...combined.lastImplantCheck } : null,
      installLog
    };
  }

  function getEquipmentCatalogFallback(source = {}) {
    const catalogId = String(source.catalogId || source.sourceCatalogId || source.itemId || "").trim();
    if (!catalogId || typeof window.WS_APP.getEquipmentCatalogItemById !== "function") return null;
    return window.WS_APP.getEquipmentCatalogItemById(catalogId) || null;
  }

  function normalizeEquipmentContainerProfileForStore(source = {}, catalogItem = null) {
    const sourceProfile = source.containerProfile && typeof source.containerProfile === "object" && !Array.isArray(source.containerProfile)
      ? source.containerProfile
      : null;
    const catalogProfile = catalogItem?.containerProfile && typeof catalogItem.containerProfile === "object" && !Array.isArray(catalogItem.containerProfile)
      ? catalogItem.containerProfile
      : null;
    const raw = sourceProfile || catalogProfile;
    if (!raw) return null;
    const acceptedTags = Array.isArray(raw.acceptedTags)
      ? raw.acceptedTags
      : Array.isArray(source.acceptedTags)
        ? source.acceptedTags
        : [];
    const blockedTags = Array.isArray(raw.blockedTags)
      ? raw.blockedTags
      : Array.isArray(source.blockedTags)
        ? source.blockedTags
        : [];
    const cellRules = Array.isArray(raw.cellRules) ? raw.cellRules.map((entry) => {
      const rule = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
      const column = clampInteger(rule.column ?? rule.col ?? rule.x ?? 0, 0, 12);
      const row = clampInteger(rule.row ?? rule.y ?? 0, 0, 24);
      if (!column || !row) return null;
      return {
        column,
        row,
        key: String(rule.key || rule.type || rule.label || "DEDICATED").trim().replace(/[\s-]+/g, "_").toUpperCase(),
        label: String(rule.label || rule.key || "DEDICATED").trim().toUpperCase(),
        acceptedTags: Array.isArray(rule.acceptedTags) ? rule.acceptedTags.map((tag) => String(tag || "").trim().toUpperCase()).filter(Boolean) : [],
        blockedTags: Array.isArray(rule.blockedTags) ? rule.blockedTags.map((tag) => String(tag || "").trim().toUpperCase()).filter(Boolean) : [],
        footprintMode: String(rule.footprintMode || "NATURAL").trim().toUpperCase() === "SLOT" ? "SLOT" : "NATURAL"
      };
    }).filter(Boolean) : [];
    return {
      ...clone(raw),
      label: String(raw.label || source.containerLabel || catalogItem?.containerProfile?.label || source.name || "Container").trim(),
      slotCapacity: clampInteger(raw.slotCapacity ?? raw.capacity ?? raw.capacitySlots ?? source.capacitySlots ?? source.storageSlots ?? catalogItem?.capacitySlots ?? 0, 0, 9999),
      gridColumns: clampInteger(raw.gridColumns ?? raw.columns ?? source.gridColumns ?? source.containerGridColumns ?? 0, 0, 12),
      gridRows: clampInteger(raw.gridRows ?? raw.rows ?? source.gridRows ?? source.containerGridRows ?? 0, 0, 24),
      isolatedCells: raw.isolatedCells === true,
      cellRules,
      acceptedTags: acceptedTags.map((tag) => String(tag || "").trim()).filter(Boolean),
      blockedTags: blockedTags.map((tag) => String(tag || "").trim()).filter(Boolean)
    };
  }

  function normalizeEquipmentContainerPlacementForStore(source = {}, containerHostId = "") {
    const hostId = String(containerHostId || "").trim();
    if (!hostId) return null;
    const raw = source.containerPlacement && typeof source.containerPlacement === "object" && !Array.isArray(source.containerPlacement)
      ? source.containerPlacement
      : null;
    if (!raw) return null;
    const placementContainerId = String(raw.containerId || raw.containerHostId || hostId).trim();
    const column = clampInteger(raw.column ?? raw.col ?? raw.x ?? 0, 0, 99);
    const row = clampInteger(raw.row ?? raw.y ?? 0, 0, 99);
    const rotation = ((Math.round(Number(raw.rotation) || 0) % 180) + 180) % 180;
    if (!column || !row || placementContainerId !== hostId) return null;
    return {
      containerId: hostId,
      column,
      row,
      rotation: rotation === 90 ? 90 : 0
    };
  }

  function normalizeEquipmentHousingPlacementForStore(source = {}, storageUnitId = "") {
    const unitId = String(storageUnitId || "").trim();
    if (!unitId) return null;
    const raw = source.housingPlacement && typeof source.housingPlacement === "object" && !Array.isArray(source.housingPlacement)
      ? source.housingPlacement
      : null;
    if (!raw) return null;
    const placementUnitId = String(raw.storageUnitId || unitId).trim();
    const column = clampInteger(raw.column ?? raw.col ?? raw.x ?? 0, 0, 999);
    const row = clampInteger(raw.row ?? raw.y ?? 0, 0, 999);
    const rotation = ((Math.round(Number(raw.rotation) || 0) % 180) + 180) % 180;
    if (!column || !row || placementUnitId !== unitId) return null;
    return { storageUnitId: unitId, column, row, rotation: rotation === 90 ? 90 : 0 };
  }

  function normalizeMassCompressionEquipmentIdentity(source = {}, catalogItem = null) {
    const combined = catalogItem ? { ...catalogItem, ...source } : source;
    const rawSubtype = String(combined.subtype || combined.itemType || "").trim().toUpperCase();
    const rawTags = Array.isArray(combined.tags) ? combined.tags.map((tag) => String(tag || "").trim().toUpperCase()).filter(Boolean) : [];
    const catalogId = String(combined.catalogId || combined.sourceCatalogId || combined.itemId || combined.id || "").trim().toLowerCase();
    const isCube = rawSubtype === "MASS_COMPRESSION_CUBE"
      || rawSubtype === "CAPACITY_MODULE"
      || rawTags.includes("MASS_COMPRESSION_CUBE")
      || rawTags.includes("MCC")
      || rawTags.includes("CAPACITY_MODULE")
      || catalogId.startsWith("eqcat-capacity-module-");
    if (!isCube) {
      return {
        isCube: false,
        name: String(combined.name || combined.title || "Equipment Item").trim(),
        subtype: rawSubtype,
        tags: rawTags
      };
    }

    const tier = clampInteger(combined.compressionTier ?? combined.capacityTier ?? combined.tier ?? 0, 0, 4);
    const romanTier = ["", "I", "II", "III", "IV"][tier] || String(tier || "");
    const rawName = String(combined.name || combined.title || "").trim();
    const name = !rawName || /^capacity\s+module(?:\s+[ivx]+)?$/i.test(rawName)
      ? `Mass Compression Cube${romanTier ? ` ${romanTier}` : ""}`
      : rawName;
    const tags = Array.from(new Set([
      ...rawTags,
      "CONTAINER",
      "MASS_COMPRESSION",
      "MCC",
      "MASS_COMPRESSION_CUBE",
      "CAPACITY_MODULE"
    ]));
    return { isCube: true, name, subtype: "MASS_COMPRESSION_CUBE", tags, tier };
  }

  window.WS_APP.normalizeMassCompressionEquipmentIdentity = normalizeMassCompressionEquipmentIdentity;

  function normalizeEquipmentItem(item = {}, index = 0) {
    const source = item && typeof item === "object" && !Array.isArray(item) ? item : {};
    const catalogItem = getEquipmentCatalogFallback(source);
    const combined = catalogItem ? { ...catalogItem, ...source } : source;
    const massCompressionIdentity = normalizeMassCompressionEquipmentIdentity(source, catalogItem);
    const footprintKey = String(combined.footprint || combined.size || "1x1").trim().toLowerCase();
    const footprint = EQUIPMENT_FOOTPRINTS[footprintKey] || EQUIPMENT_FOOTPRINTS["1x1"];
    const width = clampInteger(combined.width ?? combined.w ?? footprint.w, 1, EQUIPMENT_GRID_WIDTH);
    const height = clampInteger(combined.height ?? combined.h ?? footprint.h, 1, 999);
    const cyberwareMeta = normalizeEquipmentCyberwareMeta(combined);
    const equipProfile = normalizeEquipmentEquipProfile(combined);
    const equippedLocation = normalizeEquipmentEquippedLocation(combined, equipProfile);
    const containerHostId = String(combined.containerHostId || "").trim();
    const containerProfile = normalizeEquipmentContainerProfileForStore(source, catalogItem);
    const mountProfile = normalizeEquipmentMountProfile(combined);
    const containerPlacement = normalizeEquipmentContainerPlacementForStore(source, containerHostId);
    const storageUnitId = String(combined.storageUnitId || "").trim();
    const housingPlacement = normalizeEquipmentHousingPlacementForStore(source, storageUnitId);
    const rawLocation = String(combined.location || "").trim().toUpperCase();
    const location = equippedLocation
      ? "EQUIPPED"
      : containerHostId && containerPlacement
        ? "CONTAINER"
        : storageUnitId && housingPlacement && ["STORAGE", "HOUSING_STORAGE", "STORED", "SECURED_UNIT"].includes(rawLocation)
          ? "STORED"
          : "ORPHAN";
    const deprecatedKeys = new Set(["equippedSlot", "equippedLayer", "bodySlot", "bodyLayer", "equippedAnchor", "allowedSlots", "loadoutProfile", "requiredSlots", "containerItemId", "unitId", "parentItemId", "hostItemId", "gridPlacement", "storagePlacement"]);
    const preserved = Object.fromEntries(Object.entries(clone(source) || {}).filter(([key]) => !deprecatedKeys.has(key)));

    return {
      ...preserved,
      id: String(combined.id || combined.itemId || `eq-item-${index + 1}`).trim(),
      itemId: String(combined.itemId || "").trim(),
      catalogId: String(combined.catalogId || combined.sourceCatalogId || combined.itemId || "").trim(),
      name: massCompressionIdentity.name,
      category: String(combined.category || "MISC").trim().toUpperCase(),
      subtype: massCompressionIdentity.subtype,
      footprint: `${width}x${height}`,
      width,
      height,
      equipProfile,
      equippedLocation: location === "EQUIPPED" ? equippedLocation : null,
      storageUnitId: location === "STORED" ? storageUnitId : "",
      containerHostId: location === "CONTAINER" ? containerHostId : "",
      containerProfile,
      mountProfile,
      containerPlacement: location === "CONTAINER" ? containerPlacement : null,
      housingPlacement: location === "STORED" ? housingPlacement : null,
      location,
      status: String(combined.status || "OWNED").trim().toUpperCase(),
      operatingStatus: String(combined.operatingStatus || combined.operationStatus || "ACTIVE").trim().toUpperCase(),
      quantity: clampInteger(combined.quantity ?? 1, 1, 9999),
      condition: clampInteger(combined.condition ?? 100, 0, 100),
      legality: String(combined.legality || "UNREGISTERED").trim().toUpperCase(),
      value: parseCreditNumber(combined.value || 0),
      capacityTier: clampInteger(massCompressionIdentity.tier ?? combined.capacityTier ?? combined.tier ?? 0, 0, 99),
      compressionTier: clampInteger(massCompressionIdentity.tier ?? combined.compressionTier ?? combined.capacityTier ?? combined.tier ?? 0, 0, 99),
      capacitySlots: clampInteger(combined.capacitySlots ?? combined.storageSlots ?? 0, 0, 999),
      gridColumns: clampInteger(combined.gridColumns ?? combined.containerGridColumns ?? containerProfile?.gridColumns ?? 0, 0, 12),
      gridRows: clampInteger(combined.gridRows ?? combined.containerGridRows ?? containerProfile?.gridRows ?? 0, 0, 24),
      acceptedTags: Array.isArray(combined.acceptedTags) ? combined.acceptedTags.map((tag) => String(tag || "").trim()).filter(Boolean) : [],
      blockedTags: Array.isArray(combined.blockedTags) ? combined.blockedTags.map((tag) => String(tag || "").trim()).filter(Boolean) : [],
      requiresSubscriptionCategory: String(combined.requiresSubscriptionCategory || combined.subscriptionCategory || "").trim().toUpperCase(),
      requiresSubscriptionTier: clampInteger(combined.requiresSubscriptionTier ?? combined.subscriptionTier ?? 0, 0, 99),
      restrictions: combined.restrictions && typeof combined.restrictions === "object" && !Array.isArray(combined.restrictions) ? clone(combined.restrictions) : {},
      tags: massCompressionIdentity.tags,
      notes: String(combined.notes || combined.note || "").trim(),
      gmNote: String(combined.gmNote || "").trim(),
      ...cyberwareMeta,
      supportSlots: normalizeEquipmentSupportSlots(combined.supportSlots || combined.containerSlots || combined.exposedSlots || cyberwareMeta.exposedSlots || []),
      archived: combined.archived === true
    };
  }

  function normalizeCitizenEquipment(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const { items, ...config } = clone(source) || {};
    return {
      ...config,
      seedResetKey: String(source.seedResetKey || "").trim()
    };
  }

  function normalizeHousingStorageUnit(unit = {}, index = 0) {
    const source = unit && typeof unit === "object" && !Array.isArray(unit) ? unit : {};
    const legacyHeight = source.height ?? source.rows ?? source.h;
    const legacyWidth = source.width ?? source.columns ?? source.cols ?? source.w ?? 4;
    const fallbackCapacity = clampInteger(legacyHeight || 4, 1, 99) * clampInteger(legacyWidth || 4, 1, 99);
    const rawLabel = String(source.label || source.name || source.title || (index === 0 ? "Unit Storage" : `Housing Storage ${index + 1}`)).trim();
    const width = clampInteger(legacyWidth || 4, 1, 24);
    const slotCapacity = clampInteger(source.slotCapacity ?? source.capacitySlots ?? source.slots ?? source.capacity ?? fallbackCapacity, 0, 9999);
    const height = clampInteger(legacyHeight || Math.max(1, Math.ceil(Math.max(1, slotCapacity) / width)), 1, 999);
    return {
      id: String(source.id || source.unitId || source.storageUnitId || source.storageId || source.gridId || (index === 0 ? "housing-storage-main" : `housing-storage-${index + 1}`)).trim(),
      label: rawLabel.replace(/\bgrid\b/gi, "Storage"),
      width,
      height,
      slotCapacity
    };
  }

  function normalizeHousingStorageUnits(source = {}) {
    const candidates = [
      source.storageUnits,
      source.storageSlots,
      source.storage,
      source.units,
      source.storageGrids
    ];
    const rawUnits = candidates.find((candidate) => Array.isArray(candidate) && candidate.length) || [];
    const units = rawUnits
      .map((unit, unitIndex) => normalizeHousingStorageUnit(unit, unitIndex))
      .filter((unit) => unit && unit.id);
    return units.length ? units : [normalizeHousingStorageUnit({}, 0)];
  }

  function normalizeHousingRecord(record = {}, index = 0) {
    const source = record && typeof record === "object" && !Array.isArray(record) ? record : {};
    const storageUnits = normalizeHousingStorageUnits(source);

    return {
      id: String(source.id || `housing-${index + 1}`).trim(),
      title: String(source.title || source.name || "Housing Record").trim(),
      type: String(source.type || "UNIT").trim().toUpperCase(),
      status: String(source.status || "WIP").trim().toUpperCase(),
      isPrimary: source.isPrimary === true || index === 0,
      provider: String(source.provider || "Habitat Ledger").trim(),
      linkedSubscriptionId: String(
        typeof window.WS_APP.cleanRetiredSubscriptionReference === "function"
          ? window.WS_APP.cleanRetiredSubscriptionReference(source.linkedSubscriptionId || source.subscriptionId || "")
          : (source.linkedSubscriptionId || source.subscriptionId || "")
      ).trim(),
      standardCode: String(source.standardCode || source.housingStandard || "").trim().toUpperCase(),
      standardTierId: String(source.standardTierId || source.housingTierId || "").trim(),
      areaM2: source.areaM2 == null ? null : Number(source.areaM2),
      furnishingPolicy: String(source.furnishingPolicy || "").trim().toUpperCase(),
      parcelMaxFootprint: String(source.parcelMaxFootprint || "").trim(),
      disposalAccess: String(source.disposalAccess || "").trim().toUpperCase(),
      defaultFurnishingGrade: String(source.defaultFurnishingGrade || "").trim().toUpperCase(),
      maintenanceCoverage: String(source.maintenanceCoverage || "").trim().toUpperCase(),
      layoutPolicy: String(source.layoutPolicy || "").trim().toUpperCase(),
      layoutTemplateId: String(source.layoutTemplateId || source.household?.layoutTemplateId || "").trim(),
      layoutSeed: String(source.layoutSeed || source.household?.layoutSeed || "").trim(),
      layoutVariantFamily: String(source.layoutVariantFamily || source.household?.variantFamily || "").trim().toUpperCase(),
      visibleAddress: String(source.visibleAddress || source.address || "").trim(),
      traceAddress: String(source.traceAddress || source.trace || "").trim(),
      zone: String(source.zone || "").trim(),
      rentStatus: String(source.rentStatus || source.billingStatus || "UNKNOWN").trim().toUpperCase(),
      securityLevel: clampInteger(source.securityLevel ?? 0, 0, 99),
      privacyLevel: clampInteger(source.privacyLevel ?? 0, 0, 99),
      comfortLevel: clampInteger(source.comfortLevel ?? 0, 0, 99),
      storageUnits,
      household: source.household && typeof source.household === "object" && !Array.isArray(source.household) ? clone(source.household) : {},
      notes: String(source.notes || source.note || "").trim(),
      gmNote: String(source.gmNote || "").trim(),
      archived: source.archived === true
    };
  }

  function normalizeCitizenHousing(value = []) {
    const source = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
    return source
      .filter(Boolean)
      .map((record, index) => normalizeHousingRecord(record, index));
  }


  function normalizeIncome(value) {
    return (Array.isArray(value) ? value : [])
      .filter(Boolean)
      .map((income, index) => normalizeIncomeEntry(income, index));
  }

  function extractShortId(citizen = {}) {
    const explicit = String(citizen.shortId || "").trim();
    if (explicit) return explicit;

    const legacyDisplayName = String(citizen.displayName || "").trim();
    if (/^\d{8}\.[A-Z0-9]+$/i.test(legacyDisplayName)) return legacyDisplayName;

    const idNumber = String(citizen.idNumber || "").trim();
    const match = idNumber.match(/(\d{8}\.[A-Z0-9]+)$/i) || idNumber.match(/(\d{8}\.[A-Z0-9]+)/i);
    if (match) return match[1];

    return explicit || legacyDisplayName || idNumber || citizen.id || "";
  }

  function normalizeCitizen(citizen) {
    const normalized = clone(citizen || {});
    normalized.shortId = extractShortId(normalized);
    if (Object.prototype.hasOwnProperty.call(normalized, "displayName")) {
      delete normalized.displayName;
    }

    normalized.identity = normalizeCitizenIdentity(normalized);
    normalized.legalName = composeLegalName(normalized.identity);
    normalized.firstName = normalized.identity.firstName;
    normalized.middleName = normalized.identity.middleName;
    normalized.surname = normalized.identity.surname;
    normalized.pseudonym = normalized.identity.pseudonym;
    normalized.encryptedName = normalized.identity.encryptedName;
    normalized.displayNameOverride = normalized.identity.displayNameOverride;
    normalized.nameRevealAccess = normalized.identity.nameRevealAccess;
    normalized.biologicalProfile = window.WS_APP.normalizeCitizenBiologicalProfile
      ? window.WS_APP.normalizeCitizenBiologicalProfile(normalized.biologicalProfile || normalized.profile)
      : normalizeBiologicalProfile(normalized.biologicalProfile || normalized.profile);
    normalized.profile = normalized.biologicalProfile;
    normalized.recordSchemaVersion = window.WS_APP.CITIZEN_RECORD_SCHEMA_VERSION || "citizen_record_foundation_2_0x";
    normalized.recordState = window.WS_APP.normalizeCitizenRecordState
      ? window.WS_APP.normalizeCitizenRecordState(normalized.recordState, normalized)
      : String(normalized.recordState || "ACTIVE").trim().toUpperCase();
    normalized.characterType = window.WS_APP.normalizeCitizenCharacterType
      ? window.WS_APP.normalizeCitizenCharacterType(normalized.characterType, normalized)
      : (normalized.recordType === "npc" ? "NPC" : normalized.recordType === "admin" ? "SYSTEM" : "PLAYER");
    normalized.ownerUserId = String(normalized.ownerUserId || "").trim();
    normalized.ownerFullCardEdit = normalized.ownerFullCardEdit === true;
    normalized.ownerFullCardEditGrantedAt = String(normalized.ownerFullCardEditGrantedAt || "").trim();
    normalized.ownerFullCardEditGrantedBy = String(normalized.ownerFullCardEditGrantedBy || "").trim();
    normalized.createdAt = String(normalized.createdAt || "").trim();
    normalized.updatedAt = String(normalized.updatedAt || normalized.createdAt || "").trim();
    normalized.submittedAt = String(normalized.submittedAt || "").trim();
    normalized.activatedAt = String(normalized.activatedAt || "").trim();
    normalized.archivedAt = String(normalized.archivedAt || "").trim();
    normalized.reviewNote = String(normalized.reviewNote || "").trim();
    normalized.revision = Math.max(1, Number(normalized.revision || 1) || 1);
    normalized.playerNote = String(normalized.playerNote || "").trim();
    normalized.systemNote = String(normalized.systemNote ?? normalized.note ?? "").trim();
    normalized.note = normalized.systemNote;
    normalized.citizenAuditTrail = Array.isArray(normalized.citizenAuditTrail)
      ? normalized.citizenAuditTrail.filter(Boolean).slice(-100)
      : [];

    normalized.abilities = Array.isArray(normalized.abilities)
      ? normalized.abilities
        .map((ability) => normalizeCitizenAbility(ability))
        .filter(Boolean)
      : [];

    normalized.skills = Array.isArray(normalized.skills)
      ? normalized.skills.map((skill) => normalizeCitizenSkill(skill))
      : [];

    normalized.serviceExperience = normalizeServiceExperience(normalized.serviceExperience || normalized.serviceCategoryExperience || normalized.experience || {});
    normalized.serviceCategoryExperience = normalized.serviceExperience;
    normalized.serviceOfferStates = normalizeServiceOfferStates(normalized.serviceOfferStates || {});
    normalized.serviceReputation = normalizeServiceReputation(normalized.serviceReputation || normalized.serviceEmployerReputation || {});
    normalized.serviceEmployerReputation = normalized.serviceReputation;

    const subscriptionSanitization = typeof window.WS_APP.sanitizeCitizenSubscriptionContracts === "function"
      ? window.WS_APP.sanitizeCitizenSubscriptionContracts(normalized)
      : normalized;
    normalized.subscriptionContractSchemaVersion = subscriptionSanitization.subscriptionContractSchemaVersion || normalized.subscriptionContractSchemaVersion || "";
    normalized.subscriptions = normalizeSubscriptions(subscriptionSanitization.subscriptions || [], normalized.id);
    delete normalized.subscription;
    delete normalized.trauma;
    delete normalized.cyberwareList;
    delete normalized.cyberware;
    normalized.equipment = normalizeCitizenEquipment(normalized.equipment);
    normalized.housing = normalizeCitizenHousing(normalized.housing);
    delete normalized.occupation;
    delete normalized.occupations;
    delete normalized.activeService;
    delete normalized.incomeSources;
    const serviceSync = syncIncomeWithServiceLog(normalized.income, normalized.serviceLog);
    normalized.income = serviceSync.income;
    normalized.serviceLog = serviceSync.serviceLog;
    normalized.credits = parseCreditNumber(normalized.credits);
    normalized.playerVisible = normalized.playerVisible === true;
    normalized.accessTags = normalizeAccessTags(normalized.accessTags, ["PUBLIC"]);

    return normalized;
  }

  function normalizeCitizens(citizens) {
    return (Array.isArray(citizens) ? citizens : [])
      .filter(Boolean)
      .map((citizen) => normalizeCitizen(citizen));
  }

  function readBaseCitizens() {
    return normalizeCitizens(window.APP_DATA?.citizens || []);
  }

  function readStoredCitizens() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      console.warn("W&S citizen store could not read localStorage.", error);
      return null;
    }
  }

  function cancelScheduledCitizenStorePersistence() {
    if (citizenStorePersistenceTimer) {
      window.clearTimeout(citizenStorePersistenceTimer);
      citizenStorePersistenceTimer = 0;
    }
    if (citizenStorePersistenceIdleHandle) {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(citizenStorePersistenceIdleHandle);
      } else {
        window.clearTimeout(citizenStorePersistenceIdleHandle);
      }
      citizenStorePersistenceIdleHandle = 0;
    }
  }

  function serializeCitizensForPersistence(citizens = []) {
    return (Array.isArray(citizens) ? citizens : []).map((citizen) => {
      const next = clone(citizen || {});
      const citizenId = String(next.id || "").trim();
      next.subscriptionContractSchemaVersion = String(window.WS_APP.SUBSCRIPTION_CONTRACT_SCHEMA_VERSION || next.subscriptionContractSchemaVersion || "").trim();
      next.subscriptions = (Array.isArray(next.subscriptions) ? next.subscriptions : [])
        .map((subscription, index) => (
          typeof window.WS_APP.serializeSubscriptionContract === "function"
            ? window.WS_APP.serializeSubscriptionContract(subscription, index, { citizenId })
            : subscription
        ))
        .filter((subscription) => subscription && subscription.subscriptionContractId && subscription.subscriptionCatalogId);
      delete next.subscription;
      delete next.trauma;
      return next;
    });
  }

  function writeStoredCitizens(citizens) {
    cancelScheduledCitizenStorePersistence();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeCitizensForPersistence(citizens)));
      citizenStorePersistenceDirty = false;
      return true;
    } catch (error) {
      console.warn("W&S citizen store could not write localStorage.", error);
      return false;
    }
  }

  function flushScheduledCitizenStorePersistence() {
    if (!citizenStorePersistenceDirty) {
      cancelScheduledCitizenStorePersistence();
      return false;
    }
    return writeStoredCitizens(citizenStore);
  }

  function scheduleCitizenStorePersistence() {
    citizenStorePersistenceDirty = true;
    cancelScheduledCitizenStorePersistence();
    citizenStorePersistenceTimer = window.setTimeout(() => {
      citizenStorePersistenceTimer = 0;
      const flush = () => {
        citizenStorePersistenceIdleHandle = 0;
        flushScheduledCitizenStorePersistence();
      };
      if (typeof window.requestIdleCallback === "function") {
        citizenStorePersistenceIdleHandle = window.requestIdleCallback(flush, { timeout: 2000 });
      } else {
        citizenStorePersistenceIdleHandle = window.setTimeout(flush, 0);
      }
    }, CITIZEN_STORE_PERSIST_DEBOUNCE_MS);
  }

  function rebuildCitizenStoreCache() {
    citizenStoreById = new Map(citizenStore
      .filter((citizen) => citizen && citizen.id)
      .map((citizen) => [citizen.id, citizen]));
    citizenStoreSnapshot = clone(citizenStore);
  }

  function setCitizenStore(nextCitizens = []) {
    citizenStore = Array.isArray(nextCitizens) ? nextCitizens : [];
    rebuildCitizenStoreCache();
  }

  function clearNormalizedArrayCache(cacheKey = "") {
    const key = String(cacheKey || "").trim();
    if (key) {
      normalizedArrayCaches.delete(key);
      return;
    }
    normalizedArrayCaches.clear();
  }

  function readCachedNormalizedArray(storageKey = "", normalizer = (entry) => entry, options = {}) {
    const raw = readStoredArray(storageKey);
    const cacheKey = String(options.cacheKey || storageKey || "").trim();
    const cached = normalizedArrayCaches.get(cacheKey);
    if (cached?.raw === raw) return cached.value;

    const source = options.filterBoolean === true
      ? (Array.isArray(raw) ? raw : []).filter(Boolean)
      : (Array.isArray(raw) ? raw : []);
    const normalized = source.map((entry, index) => normalizer(entry, index));
    normalizedArrayCaches.set(cacheKey, { raw, value: normalized });
    return normalized;
  }

  function makeSlug(value) {
    const slug = String(value || "citizen")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 42);

    return slug || "citizen";
  }

  function makeUniqueCitizenId(seed) {
    const base = makeSlug(seed || "citizen");
    const existing = new Set(citizenStore.map((citizen) => citizen.id));

    if (!existing.has(base)) return base;

    let index = 2;
    while (existing.has(`${base}-${index}`)) index += 1;
    return `${base}-${index}`;
  }

  function randomAlphaNum(length) {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  function randomDigits(length) {
    return String(Math.floor(Math.random() * Math.pow(10, length))).padStart(length, "0");
  }

  function randomBirthDate() {
    const year = 2068 + Math.floor(Math.random() * 23);
    const month = 1 + Math.floor(Math.random() * 12);
    const day = 1 + Math.floor(Math.random() * 28);
    return `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  }

  function composeDefaultCitizenId() {
    return `03.51N00E.0A${randomDigits(2)}.${randomBirthDate()}.${randomAlphaNum(7)}`.toUpperCase();
  }

  function isMassCompressionSeedSubscription(subscription = {}) {
    return String(subscription.displaySnapshot?.category || subscription.category || "").toUpperCase() === "MASS_COMPRESSION"
      || String(subscription.subscriptionCatalogId || subscription.catalogId || "") === "sub-mass-compression-service";
  }


  function hasStoredRuntimeCleanupSection(storedCitizen = {}, sectionId = "") {
    const sections = Array.isArray(storedCitizen.runtimeCleanupMeta?.sections) ? storedCitizen.runtimeCleanupMeta.sections : [];
    return sections.map((section) => String(section || "").trim().toLowerCase()).includes(String(sectionId || "").trim().toLowerCase());
  }

  function mergeSeedRuntimeData(baseCitizen = {}, storedCitizen = {}, mergedCitizen = {}) {
    const next = clone(mergedCitizen || {});
    const skipSeedSubscriptions = hasStoredRuntimeCleanupSection(storedCitizen, "subscriptions");
    const currentSubscriptionSchema = String(window.WS_APP.SUBSCRIPTION_CONTRACT_SCHEMA_VERSION || "").trim();
    const storedSubscriptionSchema = String(storedCitizen.subscriptionContractSchemaVersion || "").trim();
    const subscriptionSchemaChanged = Boolean(currentSubscriptionSchema) && storedSubscriptionSchema !== currentSubscriptionSchema;
    const subscriptions = subscriptionSchemaChanged
      ? (skipSeedSubscriptions ? [] : clone(Array.isArray(baseCitizen.subscriptions) ? baseCitizen.subscriptions : []))
      : (Array.isArray(next.subscriptions) ? clone(next.subscriptions) : []);
    const subscriptionKeys = new Set(subscriptions.map((subscription) => String(
      subscription.subscriptionContractId
      || subscription.id
      || `${subscription.subscriptionCatalogId || subscription.catalogId || ""}:${subscription.tierId || ""}`
    ).trim()));

    if (!skipSeedSubscriptions && !subscriptionSchemaChanged) {
      (Array.isArray(baseCitizen.subscriptions) ? baseCitizen.subscriptions : [])
        .filter(isMassCompressionSeedSubscription)
        .forEach((subscription) => {
          const key = String(
            subscription.subscriptionContractId
            || subscription.id
            || `${subscription.subscriptionCatalogId || subscription.catalogId || ""}:${subscription.tierId || ""}`
          ).trim();
          if (!key || subscriptionKeys.has(key)) return;
          subscriptions.push(clone(subscription));
          subscriptionKeys.add(key);
        });
    }
    next.subscriptions = subscriptions;

    const baseEquipment = baseCitizen.equipment && typeof baseCitizen.equipment === "object" && !Array.isArray(baseCitizen.equipment)
      ? baseCitizen.equipment
      : {};
    const storedEquipment = storedCitizen.equipment && typeof storedCitizen.equipment === "object" && !Array.isArray(storedCitizen.equipment)
      ? storedCitizen.equipment
      : {};
    const equipmentResetKey = String(baseEquipment.seedResetKey || "").trim();
    if (equipmentResetKey && String(storedEquipment.seedResetKey || "").trim() !== equipmentResetKey) {
      next.equipment = clone(baseEquipment);
    }

    return next;
  }

  function shouldResetStoredCitizenFromBase(baseCitizen = {}, storedCitizen = {}) {
    const resetKey = String(baseCitizen?.seedStateResetKey || "").trim();
    if (!resetKey) return false;
    return String(storedCitizen?.seedStateResetKey || "").trim() !== resetKey;
  }


  const CITIZEN_RUNTIME_CLEANUP_SECTIONS = [
    { id: "equipment", label: "Equipment", description: "Owned equipment items and preserved loadout data." },
    { id: "cyberware", label: "Cyberware / Neural Core", description: "Installed cyberware, neurochip and interface records." },
    { id: "subscriptions", label: "Subscriptions", description: "Catalog-backed subscription contracts." },
    { id: "skills", label: "Skills / Abilities", description: "Skill records, ability values and service experience." },
    { id: "service", label: "Service Log", description: "Service log, offer states and service reputation runtime." },
    { id: "work", label: "Active Work", description: "Legacy/current active work and occupation payloads." },
    { id: "income", label: "Income Sources", description: "Weekly income records, including service-linked income." },
    { id: "files", label: "Files / Assignments", description: "Citizen file attachments and assignment records." },
    { id: "economy", label: "Credits / Debt", description: "Credit balance and debt account state." },
    { id: "status", label: "Risk / Status Notes", description: "Risk score, risk log, status text and operator note." }
  ];
  const CITIZEN_RUNTIME_CLEANUP_SECTION_IDS = CITIZEN_RUNTIME_CLEANUP_SECTIONS.map((section) => section.id);
  const CITIZEN_RUNTIME_CLEANUP_DEFAULT_SECTION_IDS = ["equipment", "cyberware", "subscriptions", "skills", "service", "work", "income", "files"];

  function normalizeCitizenCleanupMode(value = "CLEAR_SELECTED_SECTIONS") {
    const mode = String(value || "CLEAR_SELECTED_SECTIONS").trim().toUpperCase();
    return mode === "RESET_TO_IDENTITY_BASELINE" ? "RESET_TO_IDENTITY_BASELINE" : "CLEAR_SELECTED_SECTIONS";
  }

  function normalizeCitizenCleanupSections(value = [], fallback = CITIZEN_RUNTIME_CLEANUP_DEFAULT_SECTION_IDS) {
    const source = Array.isArray(value)
      ? value
      : String(value || "").split(/[\s,]+/);
    const valid = new Set(CITIZEN_RUNTIME_CLEANUP_SECTION_IDS);
    const sections = Array.from(new Set(source.map((item) => String(item || "").trim().toLowerCase()).filter((item) => valid.has(item))));
    return sections.length ? sections : [...fallback];
  }

  function countCleanupValue(value) {
    if (Array.isArray(value)) return value.filter(Boolean).length;
    if (value && typeof value === "object") return Object.keys(value).length;
    if (value === undefined || value === null || value === "" || value === "N/A" || value === "NONE") return 0;
    if (typeof value === "number") return value !== 0 ? 1 : 0;
    return String(value || "").trim() ? 1 : 0;
  }

  function countCitizenCleanupSection(citizen = {}, sectionId = "") {
    switch (sectionId) {
      case "equipment":
        return typeof window.WS_APP.getCitizenItemInstances === "function"
          ? window.WS_APP.getCitizenItemInstances(citizen.id, { includeBody: false }).length
          : 0;
      case "cyberware":
        return typeof window.WS_APP.getInstalledCyberwareInstances === "function"
          ? window.WS_APP.getInstalledCyberwareInstances(citizen.id).length
          : 0;
      case "subscriptions":
        return countCleanupValue(citizen.subscriptions);
      case "skills":
        return countCleanupValue(citizen.skills) + countCleanupValue(citizen.abilities) + countCleanupValue(citizen.serviceExperience);
      case "service":
        return countCleanupValue(citizen.serviceLog) + countCleanupValue(citizen.serviceOfferStates) + countCleanupValue(citizen.serviceReputation);
      case "work":
        return countCleanupValue(citizen.activeService) + countCleanupValue(citizen.activeJobs) + countCleanupValue(citizen.occupation) + countCleanupValue(citizen.occupations) + countCleanupValue(citizen.incomeSources);
      case "income":
        return countCleanupValue(citizen.income);
      case "files":
        return countCleanupValue(citizen.files) + countCleanupValue(citizen.assignments);
      case "economy":
        return countCleanupValue(citizen.credits) + countCleanupValue(citizen.debt);
      case "status":
        return countCleanupValue(citizen.risk) + countCleanupValue(citizen.riskLog) + countCleanupValue(citizen.status) + countCleanupValue(citizen.note);
      default:
        return 0;
    }
  }

  function buildCitizenRuntimeCleanupPatch(sections = [], options = {}) {
    const selected = new Set(sections);
    const patch = {
      runtimeCleanupMeta: {
        mode: normalizeCitizenCleanupMode(options.mode),
        sections: [...selected],
        cleanedAt: String(options.cleanedAt || new Date().toISOString()),
        cleanedBy: String(options.cleanedBy || options.createdBy || window.WS_APP.currentUser?.login || "ADMIN")
      }
    };

    if (selected.has("subscriptions")) {
      patch.subscriptions = [];
    }

    if (selected.has("skills")) {
      patch.skills = [];
      patch.abilities = [];
      patch.serviceExperience = {};
      patch.serviceCategoryExperience = {};
    }

    if (selected.has("service")) {
      patch.serviceLog = [];
      patch.serviceOfferStates = {};
      patch.serviceReputation = {};
      patch.serviceEmployerReputation = {};
    }

    if (selected.has("work")) {
      patch.activeService = [];
      patch.activeJobs = [];
      patch.occupation = "";
      patch.occupations = [];
      patch.incomeSources = [];
    }

    if (selected.has("income")) {
      patch.income = [];
    }

    if (selected.has("files")) {
      patch.files = [];
      patch.assignments = [];
    }

    if (selected.has("economy")) {
      patch.credits = 0;
      patch.debt = "0 ₡";
    }

    if (selected.has("status")) {
      patch.risk = 0;
      patch.riskLog = [];
      patch.status = "";
      patch.note = "";
    }

    return patch;
  }

  window.WS_APP.getCitizenRuntimeCleanupSections = function getCitizenRuntimeCleanupSections() {
    return clone(CITIZEN_RUNTIME_CLEANUP_SECTIONS);
  };

  window.WS_APP.buildCitizenRuntimeCleanupPreview = function buildCitizenRuntimeCleanupPreview(citizenOrId = {}, options = {}) {
    const citizen = typeof citizenOrId === "string" ? window.WS_APP.getCitizenById?.(citizenOrId) : citizenOrId;
    if (!citizen) return { ok: false, reason: "CITIZEN_NOT_FOUND", rows: [], totalRecords: 0, sections: [] };
    const mode = normalizeCitizenCleanupMode(options.mode);
    const sections = mode === "RESET_TO_IDENTITY_BASELINE"
      ? [...CITIZEN_RUNTIME_CLEANUP_SECTION_IDS]
      : normalizeCitizenCleanupSections(options.sections);
    const rows = sections.map((sectionId) => {
      const definition = CITIZEN_RUNTIME_CLEANUP_SECTIONS.find((section) => section.id === sectionId) || { id: sectionId, label: sectionId };
      return {
        id: sectionId,
        label: definition.label,
        description: definition.description || "",
        count: countCitizenCleanupSection(citizen, sectionId)
      };
    });
    return {
      ok: true,
      citizenId: String(citizen.id || ""),
      mode,
      sections,
      rows,
      totalRecords: rows.reduce((sum, row) => sum + row.count, 0)
    };
  };

  window.WS_APP.applyCitizenRuntimeCleanup = function applyCitizenRuntimeCleanup(citizenId = "", options = {}) {
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || citizen.recordType === "admin") return { ok: false, reason: "CITIZEN_NOT_FOUND_OR_ADMIN" };
    const preview = window.WS_APP.buildCitizenRuntimeCleanupPreview(citizen, options);
    if (!preview.ok || !preview.sections.length) return { ok: false, reason: preview.reason || "NO_CLEANUP_SECTIONS", preview };
    const patch = buildCitizenRuntimeCleanupPatch(preview.sections, {
      ...options,
      mode: preview.mode
    });
    patch.runtimeCleanupMeta.removedCounts = preview.rows.reduce((acc, row) => {
      acc[row.id] = row.count;
      return acc;
    }, {});
    patch.runtimeCleanupMeta.totalRecords = preview.totalRecords;
    const updated = window.WS_APP.updateCitizen?.(citizenId, patch, { source: "CITIZEN_CLEANUP" });
    if (updated && preview.sections.includes("equipment") && typeof window.WS_APP.replaceCitizenItemInstances === "function") {
      window.WS_APP.replaceCitizenItemInstances(citizenId, [], {
        scope: "NON_BODY",
        source: "CITIZEN_CLEANUP"
      });
    }
    if (updated && preview.sections.includes("cyberware") && typeof window.WS_APP.replaceCitizenInstalledCyberware === "function") {
      window.WS_APP.replaceCitizenInstalledCyberware(citizenId, [], {
        source: "CITIZEN_CLEANUP"
      });
    }
    return {
      ok: Boolean(updated),
      reason: updated ? "CLEANUP_APPLIED" : "CITIZEN_UPDATE_FAILED",
      preview,
      citizen: updated || null
    };
  };

  function mergeCitizens(baseCitizens, storedCitizens) {
    if (!Array.isArray(storedCitizens) || !storedCitizens.length) {
      return normalizeCitizens(baseCitizens);
    }

    const storedById = new Map(storedCitizens
      .filter((citizen) => citizen && citizen.id)
      .map((citizen) => [citizen.id, citizen]));

    const merged = baseCitizens.map((baseCitizen) => {
      const storedCitizen = storedById.get(baseCitizen.id);
      if (!storedCitizen) return normalizeCitizen(baseCitizen);
      if (shouldResetStoredCitizenFromBase(baseCitizen, storedCitizen)) {
        return normalizeCitizen(baseCitizen);
      }
      const mergedCitizen = { ...clone(baseCitizen), ...clone(storedCitizen) };
      return normalizeCitizen(mergeSeedRuntimeData(baseCitizen, storedCitizen, mergedCitizen));
    });

    storedCitizens.forEach((storedCitizen) => {
      if (!storedCitizen?.id) return;
      if (!merged.some((citizen) => citizen.id === storedCitizen.id)) {
        merged.push(normalizeCitizen(storedCitizen));
      }
    });

    return merged;
  }

  function emitCitizenUpdate(detail = {}) {
    window.dispatchEvent(new CustomEvent("ws:citizens-updated", { detail }));
  }

  window.WS_APP.getCitizenShortId = function getCitizenShortId(citizen) {
    return extractShortId(citizen);
  };
  window.WS_APP.makeUniqueCitizenStoreId = makeUniqueCitizenId;
  window.WS_APP.normalizeCitizenRecord = function normalizeCitizenRecord(record = {}) {
    return clone(normalizeCitizen(record));
  };

  window.WS_APP.initCitizenStore = function initCitizenStore() {
    setCitizenStore(mergeCitizens(readBaseCitizens(), readStoredCitizens()));
    const subscriptionSchemaVersion = String(window.WS_APP.SUBSCRIPTION_CONTRACT_SCHEMA_VERSION || "").trim();
    if (subscriptionSchemaVersion) {
      try {
        if (window.localStorage.getItem(SUBSCRIPTION_CONTRACT_SCHEMA_STORAGE_KEY) !== subscriptionSchemaVersion) {
          writeStoredCitizens(citizenStore);
          window.localStorage.setItem(SUBSCRIPTION_CONTRACT_SCHEMA_STORAGE_KEY, subscriptionSchemaVersion);
        }
      } catch (error) {
        console.warn("W&S subscription contract schema state could not be persisted.", error);
      }
    }
    return window.WS_APP.getCitizens();
  };

  window.WS_APP.getCitizens = function getCitizens(options = {}) {
    const includeArchived = options?.includeArchived === true;
    const records = includeArchived
      ? citizenStoreSnapshot
      : citizenStoreSnapshot.filter((citizen) => citizen.recordState !== "ARCHIVED");
    return clone(records);
  };

  window.WS_APP.getCitizenById = function getCitizenById(id) {
    const citizen = citizenStoreById.get(id);
    return citizen ? clone(citizen) : null;
  };

  window.WS_APP.createCitizen = function createCitizen(data = {}, options = {}) {
    const source = String(options?.source || "").trim().toUpperCase();
    if (source !== "CITIZEN_COMMAND_API") {
      window.WS_APP.lastCitizenMutationBoundaryError = {
        code: "CITIZEN_COMMAND_API_REQUIRED",
        operation: "CREATE",
        source: source || "UNSPECIFIED"
      };
      return null;
    }

    const citizen = normalizeCitizen({
      ...clone(data),
      id: data.id || makeUniqueCitizenId(data.legalName || data.shortId || "citizen")
    });

    citizenStore.push(citizen);
    window.WS_APP.saveCitizenStore();
    emitCitizenUpdate({ create: true, id: citizen.id, citizen: clone(citizen), source });
    return clone(citizen);
  };

  const SUBSCRIPTION_MUTATION_SOURCES = new Set([
    "SUBSCRIPTIONS_API",
    "SUBSCRIPTIONS_STORE",
    "SUBSCRIPTION_SETTLEMENT",
    "CITIZEN_CLEANUP"
  ]);
  const CITIZEN_COMMAND_MUTATION_SOURCES = new Set([
    "CITIZEN_COMMAND_API",
    "CITIZEN_CLEANUP",
    "ADMIN_ACCESS_CONTROL",
    "RISK_COMMAND"
  ]);
  const BILLING_MUTATION_SOURCES = new Set([
    "BILLING_BRIDGE",
    "BILLING_ADMIN_ADJUSTMENT",
    "BILLING_LEGACY",
    "BILLING_SETTLEMENT",
    "BILLING_TRANSFER",
    "SUBSCRIPTION_SETTLEMENT"
  ]);
  const SERVICE_MUTATION_SOURCES = new Set([
    "SERVICE_STORE",
    "SERVICE_COMMAND",
    "SERVICE_SETTLEMENT",
    "CITIZEN_CLEANUP"
  ]);
  const CITIZEN_COMMAND_FIELDS = new Set([
    "identity", "legalName", "firstName", "middleName", "surname", "pseudonym",
    "encryptedName", "displayNameOverride", "nameRevealAccess", "biologicalProfile", "profile",
    "idNumber", "shortId", "origin", "birthDate", "age", "portrait", "badges", "tags",
    "appearance", "playerNote", "systemNote", "note", "playerVisible", "accessTags",
    "recordState", "characterType", "ownerUserId", "ownerFullCardEdit", "ownerFullCardEditGrantedAt", "ownerFullCardEditGrantedBy",
    "reviewNote", "submittedAt", "activatedAt", "archivedAt", "revision", "updatedAt", "citizenAuditTrail", "abilities", "skills",
    "status", "clearance", "classProfile"
  ]);
  const BILLING_FIELDS = new Set(["credits", "debt"]);
  const SERVICE_FIELDS = new Set(["serviceLog", "income", "serviceOfferStates", "serviceExperience", "serviceReputation"]);

  function rejectCitizenMutationBoundary(id, source, code, fields = []) {
    window.WS_APP.lastCitizenMutationBoundaryError = {
      code,
      citizenId: String(id || ""),
      source: source || "UNSPECIFIED",
      fields: fields.map(String)
    };
    console.warn("W&S rejected citizen mutation outside canonical command boundary.", window.WS_APP.lastCitizenMutationBoundaryError);
    return null;
  }

  window.WS_APP.updateCitizen = function updateCitizen(id, patch = {}, options = {}) {
    if (!id || typeof patch !== "object" || Array.isArray(patch)) {
      return null;
    }

    const source = String(options?.source || "").trim().toUpperCase();
    const patchFields = Object.keys(patch);
    const citizenCommandFields = patchFields.filter((field) => CITIZEN_COMMAND_FIELDS.has(field));
    const billingFields = patchFields.filter((field) => BILLING_FIELDS.has(field));
    const serviceFields = patchFields.filter((field) => SERVICE_FIELDS.has(field));

    if (citizenCommandFields.length && !CITIZEN_COMMAND_MUTATION_SOURCES.has(source)) {
      return rejectCitizenMutationBoundary(id, source, "CITIZEN_COMMAND_API_REQUIRED", citizenCommandFields);
    }
    if (billingFields.length && !BILLING_MUTATION_SOURCES.has(source)) {
      return rejectCitizenMutationBoundary(id, source, "BILLING_COMMAND_API_REQUIRED", billingFields);
    }
    if (serviceFields.length && !SERVICE_MUTATION_SOURCES.has(source)) {
      return rejectCitizenMutationBoundary(id, source, "SERVICE_COMMAND_API_REQUIRED", serviceFields);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "subscriptions") && !SUBSCRIPTION_MUTATION_SOURCES.has(source)) {
      window.WS_APP.lastSubscriptionMutationBoundaryError = {
        code: "SUBSCRIPTION_COMMAND_API_REQUIRED",
        citizenId: String(id || ""),
        source: source || "UNSPECIFIED"
      };
      console.warn("W&S rejected direct citizen.subscriptions mutation. Use SubscriptionAPI command methods.", window.WS_APP.lastSubscriptionMutationBoundaryError);
      return null;
    }

    const index = citizenStore.findIndex((citizen) => citizen.id === id);

    if (index < 0) {
      return null;
    }

    const updatedCitizen = normalizeCitizen({
      ...citizenStore[index],
      ...clone(patch),
      id: citizenStore[index].id
    });

    citizenStore.splice(index, 1, updatedCitizen);
    window.WS_APP.saveCitizenStore();
    emitCitizenUpdate({
      id,
      citizen: clone(updatedCitizen),
      source: String(options?.source || "").trim().toUpperCase(),
      skipModuleRefresh: options?.skipModuleRefresh === true,
      skipProfileRefresh: options?.skipProfileRefresh === true
    });

    return clone(updatedCitizen);
  };


  window.WS_APP.commitCitizenEquipmentGridPlacement = function commitCitizenEquipmentGridPlacement(citizenId = "", itemId = "", placement = {}) {
    const commit = window.WS_APP.commitItemInstanceGridPlacement;
    return typeof commit === "function" ? commit(citizenId, itemId, placement) : null;
  };

  window.WS_APP.updateCitizenEquipment = function updateCitizenEquipment(id, equipment = {}, options = {}) {
    if (!id || !equipment || typeof equipment !== "object" || Array.isArray(equipment)) return null;
    const index = citizenStore.findIndex((citizen) => citizen.id === id);
    if (index < 0) return null;

    const source = String(options?.source || "EQUIPMENT").trim().toUpperCase();
    const { items, ...equipmentConfig } = clone(equipment) || {};
    if (Array.isArray(items) && typeof window.WS_APP.replaceCitizenItemInstances === "function") {
      const itemResult = window.WS_APP.replaceCitizenItemInstances(id, items, {
        scope: "EQUIPMENT",
        source,
        skipCitizenEvent: true,
        skipModuleRefresh: true,
        skipProfileRefresh: true
      });
      if (!itemResult?.ok) return null;
    }

    const current = citizenStore[index];
    const updatedCitizen = {
      ...current,
      equipment: normalizeCitizenEquipment({
        ...(current.equipment && typeof current.equipment === "object" && !Array.isArray(current.equipment) ? clone(current.equipment) : {}),
        ...equipmentConfig
      })
    };

    citizenStore.splice(index, 1, updatedCitizen);
    citizenStoreById.set(id, updatedCitizen);
    if (Array.isArray(citizenStoreSnapshot) && citizenStoreSnapshot.length === citizenStore.length) {
      citizenStoreSnapshot.splice(index, 1, clone(updatedCitizen));
    } else {
      rebuildCitizenStoreCache();
    }
    writeStoredCitizens(citizenStore);
    if (options?.skipCitizenEvent !== true) {
      emitCitizenUpdate({
        id,
        citizen: clone(updatedCitizen),
        source,
        skipModuleRefresh: options?.skipModuleRefresh !== false,
        skipProfileRefresh: options?.skipProfileRefresh !== false
      });
    }
    return clone(updatedCitizen);
  };


  window.WS_APP.addCitizenCredits = function addCitizenCredits(citizenId, transfer = {}) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    if (!citizen || citizen.recordType === "admin") return null;

    const amount = parseCreditNumber(transfer.amount);
    if (amount <= 0) return null;

    const currentCredits = parseCreditNumber(citizen.credits);
    const creditsAfter = currentCredits + amount;
    const debtBefore = parseCreditNumber(citizen.debt);
    const debtAfter = debtBefore;
    const createdBy = String(transfer.createdBy || window.WS_APP.currentUser?.login || "admin").trim();
    const sender = String(transfer.sender || "Admin").trim();
    const senderType = String(transfer.senderType || "").trim().toUpperCase();
    const isAdminSender = senderType === "ADMIN" || /^admin$/i.test(sender);
    const transferTitle = String(transfer.title || "").trim();
    const note = String(transfer.note || "").trim();
    const ledgerType = isAdminSender ? "ADMIN_ADJUSTMENT" : "TRANSFER_IN";
    const ledgerTitle = transferTitle || (isAdminSender ? "Credit adjustment" : sender || "Credit transfer");
    const inboxTitle = isAdminSender ? "Credit adjustment received" : (transferTitle || "Credit transfer");
    const updated = window.WS_APP.updateCitizen(citizenId, {
      credits: creditsAfter
    }, { source: "BILLING_LEGACY" });

    addBillingHistoryEntry(citizenId, {
      type: ledgerType,
      title: ledgerTitle,
      sourceLabel: sender,
      sender,
      amount,
      creditsAfter,
      debtAfter,
      note,
      createdBy
    });

    emitBillingNotification(citizenId, {
      subtype: isAdminSender ? "CREDIT_ADJUSTMENT" : "CREDIT_TRANSFER_IN",
      severity: isAdminSender ? "NOTICE" : "INFO",
      title: isAdminSender ? "Credit adjustment received" : (transferTitle || "Incoming transfer"),
      layout: "finance-transfer",
      panels: [
        { title: "TRANSFER", rows: [
          { label: "Sender", value: sender || "-" },
          { label: "Operation", value: isAdminSender ? "Credits change" : "Credits transfer" },
          { label: "Amount", value: formatCreditLabel(amount) },
          { label: "Note", value: normalizeFinanceNoteValue(note || transferTitle || "-") }
        ] },
        { title: "ACCOUNT", rows: buildFinanceAccountRows(currentCredits, creditsAfter) }
      ],
      createdBy: isAdminSender ? "SYSTEM" : sender || "SYSTEM"
    });

    return updated;
  };

  window.WS_APP.deductCitizenCredits = function deductCitizenCredits(citizenId, transfer = {}) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    if (!citizen || citizen.recordType === "admin") return null;

    const amount = parseCreditNumber(transfer.amount);
    if (amount <= 0) return null;

    const currentCredits = parseCreditNumber(citizen.credits);
    const deductedAmount = Math.min(currentCredits, amount);
    const creditsAfter = Math.max(0, currentCredits - amount);
    const debtBefore = parseCreditNumber(citizen.debt);
    const debtAfter = debtBefore;
    const createdBy = String(transfer.createdBy || window.WS_APP.currentUser?.login || "admin").trim();
    const sender = String(transfer.sender || "Admin").trim();
    const transferTitle = String(transfer.title || "").trim();
    const note = String(transfer.note || "").trim();
    const ledgerTitle = transferTitle || "Credit deduction";
    const updated = window.WS_APP.updateCitizen(citizenId, {
      credits: creditsAfter
    }, { source: "BILLING_LEGACY" });

    addBillingHistoryEntry(citizenId, {
      type: "ADMIN_ADJUSTMENT",
      title: ledgerTitle,
      sourceLabel: sender,
      sender,
      amount: -deductedAmount,
      creditsAfter,
      debtAfter,
      note,
      createdBy
    });

    emitBillingNotification(citizenId, {
      subtype: "CREDIT_ADJUSTMENT",
      severity: "NOTICE",
      title: transferTitle || "Credit deduction applied",
      layout: "finance-transfer",
      panels: [
        { title: "TRANSFER", rows: [
          { label: "Source", value: sender || "SYSTEM" },
          { label: "Operation", value: "Credit deduction" },
          { label: "Amount", value: formatSignedCreditLabel(-deductedAmount) },
          { label: "Note", value: normalizeFinanceNoteValue(note || transferTitle || "-") }
        ] },
        { title: "ACCOUNT", rows: buildFinanceAccountRows(currentCredits, creditsAfter) }
      ],
      createdBy: "SYSTEM"
    });

    return updated;
  };

  window.WS_APP.setCitizenRisk = function setCitizenRisk(citizenId, riskValue, options = {}) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    if (!citizen || citizen.recordType === "admin") return null;

    const previousRisk = clampInteger(citizen.risk ?? 0, 0, 100);
    const nextRisk = clampInteger(riskValue, 0, 100);
    const date = window.WS_APP.getCampaignDateIso?.() || window.WS_APP.CAMPAIGN_DATE_ISO || "2109-02-13";
    const entry = {
      id: `risk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      from: previousRisk,
      to: nextRisk,
      reason: String(options.reason || options.note || "Manual W&S risk adjustment.").trim(),
      createdBy: String(options.createdBy || window.WS_APP.currentUser?.login || "admin").trim()
    };

    const riskLog = Array.isArray(citizen.riskLog) ? clone(citizen.riskLog) : [];
    riskLog.push(entry);

    return window.WS_APP.updateCitizen(citizenId, {
      risk: nextRisk,
      riskLog
    }, { source: "RISK_COMMAND" });
  };

  window.WS_APP.clearCitizenRiskLog = function clearCitizenRiskLog(citizenId) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    if (!citizen || citizen.recordType === "admin") return null;
    return window.WS_APP.updateCitizen(citizenId, { riskLog: [] }, { source: "RISK_COMMAND" });
  };

  window.WS_APP.deleteCitizen = function deleteCitizen() {
    window.WS_APP.lastCitizenMutationBoundaryError = {
      code: "HARD_DELETE_DISABLED",
      operation: "DELETE"
    };
    return false;
  };

  window.WS_APP.createDefaultCitizen = function createDefaultCitizen(data = {}, actor = window.WS_APP.currentUser) {
    return window.WS_APP.CitizenCommandAPI?.createCitizenDraft?.(data, actor) || null;
  };

  window.WS_APP.duplicateCitizen = function duplicateCitizen() {
    window.WS_APP.lastCitizenMutationBoundaryError = {
      code: "DUPLICATE_CITIZEN_DISABLED",
      operation: "DUPLICATE"
    };
    return null;
  };

  function getSubscriptionStatusLabel(value = "") {
    const status = String(value || "PENDING").trim().toUpperCase();
    if (status === "PAID") return "Paid";
    if (status === "PENDING") return "Pending";
    if (status === "OVERDUE") return "Overdue";
    if (status === "SUSPENDED") return "Suspended";
    if (status === "CANCELLED") return "Cancelled";
    if (status === "TERMINATED") return "Terminated";
    return status.replace(/[_-]+/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function getSubscriptionSubtypeForStatus(status = "") {
    const normalized = String(status || "").trim().toUpperCase();
    if (normalized === "PAID") return "SUBSCRIPTION_RESTORED";
    if (normalized === "OVERDUE") return "SUBSCRIPTION_OVERDUE";
    if (normalized === "SUSPENDED") return "SUBSCRIPTION_SUSPENDED";
    if (normalized === "CANCELLED") return "SUBSCRIPTION_CANCELLED";
    if (normalized === "TERMINATED") return "SUBSCRIPTION_TERMINATED";
    return "SUBSCRIPTION_REQUIRES_ACTION";
  }

  function getSubscriptionSeverityForSubtype(subtype = "") {
    const normalized = String(subtype || "").trim().toUpperCase();
    if (["SUBSCRIPTION_SUSPENDED", "SUBSCRIPTION_TERMINATED"].includes(normalized)) return "CRITICAL";
    if (["SUBSCRIPTION_OVERDUE", "SUBSCRIPTION_PAYMENT_FAILED", "SUBSCRIPTION_REQUIRES_ACTION", "SUBSCRIPTION_LIMIT_REACHED"].includes(normalized)) return "WARNING";
    if (["SUBSCRIPTION_ACTIVATED", "SUBSCRIPTION_RENEWED", "SUBSCRIPTION_RESTORED"].includes(normalized)) return "INFO";
    return "NOTICE";
  }

  function normalizeNotificationRows(rows = []) {
    return (Array.isArray(rows) ? rows : [])
      .map((row) => {
        const source = Array.isArray(row) ? { label: row[0], value: row[1] } : row;
        const label = String(source?.label || source?.name || source?.title || "").trim();
        const value = String(source?.value ?? source?.amount ?? "").trim();
        return label && value ? { label, value } : null;
      })
      .filter(Boolean);
  }

  function getNotificationPanelRole(title = "NOTICE") {
    const panelTitle = String(title || "NOTICE").trim().toUpperCase();
    if (["BILLING", "CHARGE", "ACCOUNT", "PAYOUT", "PAYMENT", "EXPECTED", "FAILED PAYMENT"].includes(panelTitle)) return panelTitle === "FAILED PAYMENT" ? "warning" : "finance";
    if (["PLAN CHANGE", "STATUS CHANGE", "CHANGE", "DECISION", "CLASSIFICATION"].includes(panelTitle)) return "change";
    if (["STATUS", "DEADLINE", "SETTLEMENT"].includes(panelTitle)) return "status";
    if (panelTitle === "ACTION") return "action";
    if (["WARNING"].includes(panelTitle)) return "warning";
    if (["SYSTEM", "NOTICE", "SUMMARY"].includes(panelTitle)) return "metadata";
    return "subject";
  }

  function buildNotificationPanel(title = "NOTICE", rows = []) {
    const panelRows = normalizeNotificationRows(rows);
    const panelTitle = String(title || "NOTICE").trim().toUpperCase();
    return panelRows.length ? { title: panelTitle, role: getNotificationPanelRole(panelTitle), rows: panelRows } : null;
  }

  function createPanelList(...panels) {
    return panels.filter(Boolean);
  }

  function formatNotificationEnum(value = "", fallback = "-") {
    const raw = String(value || "").trim();
    if (!raw || raw === "-") return fallback;
    return raw
      .replace(/[_-]+/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function normalizeTerminalTagList(tags = [], type = "SYSTEM", severity = "INFO") {
    const source = Array.isArray(tags) && tags.length ? tags : [type, severity];
    return Array.from(new Set(source
      .map((tag) => String(tag || "").trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 5)));
  }

  function getExtraRowValue(rows = [], labels = [], fallback = "-") {
    const normalizedRows = normalizeNotificationRows(rows);
    const normalizedLabels = labels.map((label) => String(label || "").trim().toLowerCase());
    const row = normalizedRows.find((item) => normalizedLabels.includes(String(item.label || "").trim().toLowerCase()));
    return row?.value || fallback;
  }

  function getSubscriptionTagLabel(subtype = "", subscription = {}) {
    const normalized = String(subtype || "").toUpperCase();
    if (normalized.includes("TIER")) return "TIER CHANGE";
    if (normalized.includes("CANCEL")) return "CANCELLED";
    if (normalized.includes("PAYMENT_FAILED") || normalized.includes("OVERDUE") || normalized.includes("ACTION")) return "ACTION REQUIRED";
    if (normalized.includes("SUSPENDED")) return "SUSPENDED";
    if (normalized.includes("TERMINATED")) return "TERMINATED";
    if (normalized.includes("RESTORED")) return "RESTORED";
    return getSubscriptionStatusLabel(subscription.status || "PENDING").toUpperCase();
  }

  function getServiceFormLabel(value = "") {
    const form = normalizeServiceForm(value || "AGREEMENT");
    if (form === "COMMISSION") return "Commission";
    if (form === "CONTRACT") return "Contract";
    return "Agreement";
  }

  function getServiceSettlementLabel(record = {}) {
    const form = normalizeServiceForm(record.form);
    if (form === "COMMISSION") return "One-Time";
    const cycle = String(record.cycle || "WEEKLY").trim().toUpperCase();
    return cycle === "WEEKLY" ? "Weekly" : formatNotificationEnum(cycle);
  }

  function getServiceDeadlineLabel(record = {}) {
    const normalized = normalizeServiceRecord(record, 0);
    if (normalized.form === "COMMISSION" && normalized.dueDate) return normalized.dueDate;
    return "N/A";
  }

  function getServicePaymentLabel(record = {}) {
    const normalized = normalizeServiceRecord(record, 0);
    return normalized.form === "COMMISSION" ? "Payout" : "Payment";
  }

  function getServiceTagList(subtype = "", record = {}) {
    const normalized = normalizeServiceRecord(record, 0);
    const tags = ["SERVICE"];
    if (normalized.form === "COMMISSION") tags.push("COMMISSION");
    if (normalized.form === "CONTRACT") tags.push("CONTRACT");
    if (normalized.form === "AGREEMENT") tags.push("AGREEMENT");
    if (String(subtype || "").includes("PAYOUT")) tags.push("PAYOUT");
    tags.push(formatNotificationEnum(normalized.status || "ACTIVE").toUpperCase());
    return tags;
  }

  function getDefaultNotificationLinks(type = "SYSTEM") {
    const action = getInboxNotificationTypeDefinition(type)?.defaultAction;
    return action ? [action] : [{ label: "OPEN TERMINAL", module: "terminal-hub", panel: "inbox" }];
  }

  function isPlayerVisibleInboxNotification(type = "SYSTEM", subtype = "SYSTEM_NOTICE") {
    const subtypeDefinition = getInboxNotificationSubtypeDefinition(type, subtype);
    return subtypeDefinition?.playerVisible !== false && subtypeDefinition?.deprecated !== true;
  }

  function emitTerminalNotification(citizenId, notification = {}) {
    const id = String(citizenId || notification.citizenId || "").trim();
    if (!id || notification.notify === false) return false;

    const type = normalizeNotificationToken(notification.type, "SYSTEM");
    const typeDefinition = getInboxNotificationTypeDefinition(type);
    if (!typeDefinition) {
      window.WS_APP.reportNotificationDiagnostic?.("ERROR", "EVENT_TYPE_UNKNOWN", { type, notification });
      return false;
    }

    const hasExplicitSubtype = String(notification.subtype || "").trim() !== "";
    const subtype = hasExplicitSubtype
      ? normalizeNotificationToken(notification.subtype, "")
      : getDefaultTerminalSubtype(type);
    const subtypeDefinition = getInboxNotificationSubtypeDefinition(type, subtype);
    if (!subtypeDefinition) {
      window.WS_APP.reportNotificationDiagnostic?.("ERROR", "EVENT_CODE_UNKNOWN", { type, subtype, notification });
      return false;
    }

    const panels = normalizeTerminalFinancePanels(notification.panels);
    const finalRows = normalizeTerminalFinanceRows(notification.finalRows);
    const layout = normalizeTerminalFinanceLayout(notification.layout) || (panels.length ? "notice-system" : "");
    const audience = normalizeTerminalAudience(notification.audience || "PLAYER");
    const isPlayerAudience = audience.includes("PLAYER") || audience.includes("BOTH");
    if (isPlayerAudience && !isPlayerVisibleInboxNotification(type, subtype)) return false;

    const severity = notification.severity || normalizeTerminalSeverity("", type, subtype);
    const payload = {
      ...clone(notification),
      citizenId: id,
      type,
      subtype,
      severity,
      title: String(notification.title || subtypeDefinition.label || "Terminal entry").trim(),
      layout,
      panels,
      finalRows,
      tags: normalizeTerminalTagList(notification.tags, type, severity),
      date: notification.date,
      links: Array.isArray(notification.links) && notification.links.length ? notification.links : getDefaultNotificationLinks(type),
      read: notification.read === true,
      important: notification.important === true,
      createdBy: notification.createdBy || window.WS_APP.currentUser?.login || "SYSTEM",
      audience
    };

    if (typeof window.TerminalNotifications?.emitLegacy === "function" && notification.__skipNotificationApi !== true) {
      const result = window.TerminalNotifications.emitLegacy(payload);
      return result?.ok === true;
    }

    return Boolean(window.WS_APP.addTerminalEntry?.(id, payload));
  }

  function emitBillingNotification(citizenId, payload = {}) {
    return emitTerminalNotification(citizenId, {
      type: "BILLING",
      subtype: payload.subtype || "BILLING_STATEMENT",
      severity: payload.severity,
      title: payload.title || "Billing statement",
      layout: payload.layout || "finance-transfer",
      panels: payload.panels,
      finalRows: payload.finalRows,
      tags: payload.tags,
      links: payload.links || [{ label: "OPEN BILLING", module: "terminal-hub", panel: "billing", section: "transactions" }],
      date: payload.date,
      read: payload.read,
      important: payload.important,
      createdBy: payload.createdBy,
      notify: payload.notify,
      audience: payload.audience
    });
  }

  function buildSubscriptionNotificationPanels(subscription = {}, extraRows = [], event = {}) {
    const normalized = normalizeSubscriptionEntry(subscription, 0);
    const subtype = String(event.subtype || getSubscriptionSubtypeForStatus(normalized.status)).trim().toUpperCase();
    const nextCharge = normalized.renewalDate || normalized.paidUntil || normalized.endDate || getAlignedSubscriptionPeriodEndIso();
    const basePanel = buildNotificationPanel("SUBSCRIPTION", [
      ["Service", normalized.title || "Subscription"],
      ["Provider", normalized.provider || "SYSTEM"],
      ["Tier", normalized.tierLabel || "N/A"],
      ["Status", getSubscriptionStatusLabel(normalized.status)]
    ]);

    if (subtype === "SUBSCRIPTION_TIER_CHANGED") {
      const previousCost = getExtraRowValue(extraRows, ["Previous weekly cost", "Previous cost"], "-");
      const difference = previousCost && previousCost !== "-"
        ? formatChangeCreditLabel(normalized.amount - parseCreditNumber(previousCost))
        : "-";
      return createPanelList(
        buildNotificationPanel("SUBSCRIPTION", [
          ["Service", normalized.title || "Subscription"],
          ["Provider", normalized.provider || "SYSTEM"],
          ["Status", getSubscriptionStatusLabel(normalized.status)]
        ]),
        buildNotificationPanel("PLAN CHANGE", [
          ["Previous", getExtraRowValue(extraRows, ["Previous tier"], "N/A")],
          ["Current", normalized.tierLabel || "N/A"],
          ["Change", difference.startsWith("-") ? "Downgrade" : difference === "+0 ₡" || difference === "0 ₡" ? "No cost change" : "Upgrade"]
        ]),
        buildNotificationPanel("BILLING", [
          ["Previous cost", previousCost],
          ["Current cost", `${formatCreditLabel(normalized.amount)} / week`],
          ["Difference", difference]
        ])
      );
    }

    if (subtype === "SUBSCRIPTION_CANCELLED") {
      return createPanelList(
        buildNotificationPanel("SUBSCRIPTION", [
          ["Service", normalized.title || "Subscription"],
          ["Provider", normalized.provider || "SYSTEM"],
          ["Previous", getExtraRowValue(extraRows, ["Previous status"], "Active")],
          ["Current", "Cancelled"]
        ]),
        buildNotificationPanel("CHARGE", [
          ["Charge", getExtraRowValue(extraRows, ["Charge"], "None")],
          ["Paid", getExtraRowValue(extraRows, ["Paid from credits"], "0 ₡")],
          ["Debt", getExtraRowValue(extraRows, ["Debt increase"], "+0 ₡")]
        ]),
        buildNotificationPanel("ACCOUNT", [
          ["Credits after", getExtraRowValue(extraRows, ["Credits after"], "-")],
          ["Debt after", getExtraRowValue(extraRows, ["Debt after"], "-")],
          ["Rule", getExtraRowValue(extraRows, ["Charge rule"], "N/A")]
        ])
      );
    }

    if (["SUBSCRIPTION_PAYMENT_FAILED", "SUBSCRIPTION_OVERDUE", "SUBSCRIPTION_REQUIRES_ACTION", "SUBSCRIPTION_LIMIT_REACHED"].includes(subtype)) {
      return createPanelList(
        basePanel,
        buildNotificationPanel("FAILED PAYMENT", [
          ["Required", formatCreditLabel(normalized.amount)],
          ["Available", getExtraRowValue(extraRows, ["Available", "Credits"], "N/A")],
          ["Debt added", getExtraRowValue(extraRows, ["Debt increase", "Debt added"], normalized.lastDebtIncrease ? formatChangeCreditLabel(normalized.lastDebtIncrease) : "N/A")]
        ]),
        buildNotificationPanel("ACTION", [
          ["Required", getExtraRowValue(extraRows, ["Action", "Required"], "Restore balance before next settlement")],
          ["Deadline", nextCharge || "N/A"]
        ])
      );
    }

    if (["SUBSCRIPTION_STATUS_CHANGED", "SUBSCRIPTION_RESTORED", "SUBSCRIPTION_SUSPENDED", "SUBSCRIPTION_TERMINATED"].includes(subtype)) {
      return createPanelList(
        basePanel,
        buildNotificationPanel("STATUS", [
          ["Previous", getExtraRowValue(extraRows, ["Previous status"], "N/A")],
          ["Current", getSubscriptionStatusLabel(normalized.status)],
          ["Updated", getTerminalDateIso()]
        ])
      );
    }

    if (subtype === "SUBSCRIPTION_RECORDS_CLEARED") {
      return createPanelList(
        buildNotificationPanel("RECORDS", [
          ["Service", normalized.title || "Subscription records"],
          ["Result", getExtraRowValue(extraRows, ["Result"], "Cancelled records cleared")]
        ]),
        buildNotificationPanel("SYSTEM", [
          ["Action", "No action required"],
          ["Status", "Closed"]
        ])
      );
    }

    return createPanelList(
      basePanel,
      buildNotificationPanel("BILLING", [
        ["Weekly cost", formatCreditLabel(normalized.amount)],
        ["Settlement", normalized.cycle === "WEEKLY" ? "Weekly" : formatNotificationEnum(normalized.cycle)],
        ["Next charge", nextCharge || "N/A"]
      ]),
      buildNotificationPanel("UPDATE", extraRows)
    );
  }

  function emitSubscriptionTerminalEntry(citizenId, subscription = {}, event = {}) {
    const normalized = normalizeSubscriptionEntry(subscription, 0);
    const subtype = String(event.subtype || getSubscriptionSubtypeForStatus(normalized.status)).trim().toUpperCase();
    return emitTerminalNotification(citizenId, {
      type: "SUBSCRIPTION",
      subtype,
      severity: event.severity || getSubscriptionSeverityForSubtype(subtype),
      title: event.title || "Subscription updated",
      layout: "record-subscription",
      panels: buildSubscriptionNotificationPanels(normalized, event.rows, { ...event, subtype }),
      tags: ["SUBSCRIPTION", getSubscriptionTagLabel(subtype, normalized)],
      links: [
        { label: "OPEN SUBSCRIPTIONS", module: "subscriptions" },
        { label: "OPEN BILLING", module: "terminal-hub", panel: "billing" }
      ],
      createdBy: event.createdBy || normalized.provider || window.WS_APP.currentUser?.login || "SYSTEM",
      notify: event.notify,
      audience: event.audience
    });
  }

  function getRequestSubtypeForStatus(status = "") {
    const normalized = String(status || "PENDING").trim().toUpperCase();
    if (normalized === "PENDING") return "REQUEST_CREATED";
    if (normalized === "REVIEWED") return "REQUEST_UNDER_REVIEW";
    if (normalized === "APPROVED") return "REQUEST_APPROVED";
    if (normalized === "DENIED") return "REQUEST_DENIED";
    if (normalized === "ESCALATED") return "REQUEST_ESCALATED";
    if (normalized === "CLOSED") return "REQUEST_CLOSED";
    if (normalized === "CANCELLED" || normalized === "CANCELED") return "REQUEST_CANCELLED";
    return "REQUEST_UPDATED";
  }

  function getRequestDecisionPanelTitle(subtype = "") {
    const normalized = String(subtype || "").toUpperCase();
    if (["REQUEST_APPROVED", "REQUEST_DENIED", "REQUEST_CLOSED", "REQUEST_CANCELLED", "REQUEST_REMOVED"].includes(normalized)) return "DECISION";
    if (normalized === "REQUEST_ADDITIONAL_DATA_REQUIRED") return "ACTION";
    return "STATUS";
  }

  function buildRequestNotificationPanels(request = {}, event = {}) {
    const normalized = normalizeServiceRequest(request);
    const subtype = String(event.subtype || getRequestSubtypeForStatus(normalized.status)).trim().toUpperCase();
    const action = getExtraRowValue(event.rows, ["Required action", "Action", "Next step"],
      subtype === "REQUEST_ADDITIONAL_DATA_REQUIRED" ? "Submit additional data" : "No action required");
    const result = getExtraRowValue(event.rows, ["Result", "Decision"], formatNotificationEnum(subtype.replace(/^REQUEST_/, "")));
    const reason = getExtraRowValue(event.rows, ["Reason", "Resolution", "Resolution note"], normalized.resolutionNote || event.note || "N/A");
    const decisionRows = [
      ["Result", result],
      ["Action", action]
    ];
    if (reason !== "N/A") decisionRows.splice(1, 0, ["Reason", reason]);
    return createPanelList(
      buildNotificationPanel("REQUEST", [
        ["Type", normalized.type || "Request"],
        ["Submitted", normalized.createdAt || normalized.date || getTerminalDateIso()],
        ["Status", normalized.status || formatNotificationEnum(subtype)]
      ]),
      buildNotificationPanel(getRequestDecisionPanelTitle(subtype), decisionRows)
    );
  }

  function emitRequestNotification(citizenId, request = {}, event = {}) {
    const normalized = normalizeServiceRequest(request);
    const subtype = event.subtype || getRequestSubtypeForStatus(normalized.status);
    return emitTerminalNotification(citizenId, {
      type: "REQUEST",
      subtype,
      severity: event.severity,
      title: event.title || (subtype === "REQUEST_CREATED" ? "Request created" : formatNotificationEnum(subtype)),
      layout: "record-request",
      panels: buildRequestNotificationPanels(normalized, { ...event, subtype }),
      links: [{ label: "OPEN REQUESTS", module: "terminal-hub", panel: "requests" }],
      createdBy: event.createdBy || normalized.createdBy || "SYSTEM",
      notify: event.notify,
      audience: event.audience
    });
  }

  function getCalendarActionValue(rows = [], fallback = "Review linked record") {
    return getExtraRowValue(rows, ["Required action", "Action", "Next step"], fallback);
  }

  function buildCalendarNotificationPanels(reminder = {}, event = {}) {
    if (Array.isArray(event.panels) && event.panels.length) return event.panels;

    const normalized = normalizeCalendarReminder(reminder);
    const subtype = String(event.subtype || "CALENDAR_REMINDER_TRIGGERED").trim().toUpperCase();
    const rows = event.rows || [];
    const dueDate = getExtraRowValue(rows, ["Due date", "Date", "Deadline"], normalized.date);
    const remaining = getExtraRowValue(rows, ["Remaining"], normalized.notifyDaysBefore ? `${normalized.notifyDaysBefore} day(s)` : "Same day");

    if (subtype === "SERVICE_DEADLINE_WARNING") {
      return createPanelList(
        buildNotificationPanel("SERVICE", [
          ["Service", event.serviceTitle || normalized.title || "Linked service"],
          ["Provider", event.provider || getExtraRowValue(rows, ["Provider"], "N/A")],
          ["Form", event.form || getExtraRowValue(rows, ["Form"], "Commission")]
        ]),
        buildNotificationPanel("DEADLINE", [
          ["Due date", dueDate],
          ["Remaining", remaining],
          ["Consequence", getExtraRowValue(rows, ["Consequence"], "Payout may be rejected")]
        ]),
        buildNotificationPanel("ACTION", [
          ["Required", getCalendarActionValue(rows, "Complete service or cancel record")],
          ["Target", getExtraRowValue(rows, ["Target"], "Service Registry")],
          ["Payout", getExtraRowValue(rows, ["Payout", "Amount"], event.payout || "N/A")]
        ])
      );
    }

    if (subtype === "PAYMENT_DEADLINE_WARNING") {
      return createPanelList(
        buildNotificationPanel("PAYMENT", [
          ["Target", getExtraRowValue(rows, ["Target"], "Debt repayment")],
          ["Required", getExtraRowValue(rows, ["Required amount", "Amount", "Required"], "N/A")],
          ["Due date", dueDate]
        ]),
        buildNotificationPanel("ACCOUNT", [
          ["Current", getExtraRowValue(rows, ["Current", "Credits"], "N/A")],
          ["Missing", getExtraRowValue(rows, ["Missing"], "N/A")],
          ["Debt after", getExtraRowValue(rows, ["Debt after"], "N/A")]
        ]),
        buildNotificationPanel("ACTION", [
          ["Required", getCalendarActionValue(rows, "Add credits before settlement")],
          ["Risk", getExtraRowValue(rows, ["Risk", "Consequence"], "Payment may increase debt")]
        ])
      );
    }

    if (subtype === "SETTLEMENT_REMINDER") {
      return createPanelList(
        buildNotificationPanel("SETTLEMENT", [
          ["Date", dueDate],
          ["Cycle", getExtraRowValue(rows, ["Cycle"], "Weekly")],
          ["Window", getExtraRowValue(rows, ["Window"], "Monday 00:00")]
        ]),
        buildNotificationPanel("EXPECTED", [
          ["Income", getExtraRowValue(rows, ["Income"], "N/A")],
          ["Subscriptions", getExtraRowValue(rows, ["Subscriptions"], "N/A")],
          ["Debt payment", getExtraRowValue(rows, ["Debt payment"], "N/A")]
        ]),
        buildNotificationPanel("ACCOUNT", [
          ["Current", getExtraRowValue(rows, ["Current"], "N/A")],
          ["Projected", getExtraRowValue(rows, ["Projected"], "N/A")],
          ["Risk", getExtraRowValue(rows, ["Risk"], "No deficit expected")]
        ])
      );
    }

    if (subtype === "APPOINTMENT_REMINDER") {
      return createPanelList(
        buildNotificationPanel("APPOINTMENT", [
          ["Title", normalized.title || "Appointment"],
          ["Provider", getExtraRowValue(rows, ["Provider"], "N/A")],
          ["Date", dueDate],
          ["Time", getExtraRowValue(rows, ["Time"], "N/A")]
        ]),
        buildNotificationPanel("LOCATION", [
          ["Node", getExtraRowValue(rows, ["Node", "Location"], "N/A")],
          ["Zone", getExtraRowValue(rows, ["Zone"], "N/A")]
        ]),
        buildNotificationPanel("ACTION", [
          ["Required", getCalendarActionValue(rows, "Attend appointment")]
        ])
      );
    }

    if (subtype === "DEADLINE_WARNING") {
      return createPanelList(
        buildNotificationPanel("DEADLINE", [
          ["Target", getExtraRowValue(rows, ["Target"], "Linked record")],
          ["Subject", normalized.title || getExtraRowValue(rows, ["Subject"], "Scheduled item")],
          ["Due date", dueDate],
          ["Remaining", remaining]
        ]),
        buildNotificationPanel("ACTION", [
          ["Required", getCalendarActionValue(rows, normalized.body || "Review linked record")],
          ["Consequence", getExtraRowValue(rows, ["Consequence"], "Record may be flagged for review")]
        ])
      );
    }

    return createPanelList(
      buildNotificationPanel("REMINDER", [
        ["Title", normalized.title || "Calendar reminder"],
        ["Type", getExtraRowValue(rows, ["Type"], subtype.includes("EVENT") ? "Calendar event" : "Reminder")],
        ["Date", dueDate],
        ["Notice", normalized.notifyDaysBefore ? `${normalized.notifyDaysBefore} day(s) before` : "Same day"]
      ]),
      buildNotificationPanel("LINKED RECORD", [
        ["Module", getExtraRowValue(rows, ["Module"], "Terminal")],
        ["Target", getExtraRowValue(rows, ["Target"], normalized.title || "Scheduled item")]
      ]),
      buildNotificationPanel("ACTION", [
        ["Required", getCalendarActionValue(rows, subtype.includes("CANCELLED") ? "Review cancelled event" : "Review scheduled item")]
      ])
    );
  }

  function buildCalendarNotificationFinalRows(reminder = {}, event = {}) {
    const subtype = String(event.subtype || "").trim().toUpperCase();
    if (subtype !== "SETTLEMENT_REMINDER") return [];
    const rows = event.rows || [];
    return normalizeNotificationRows([
      ["Risk", getExtraRowValue(rows, ["Risk"], "No deficit expected")],
      ["Required", getExtraRowValue(rows, ["Required action", "Action"], "No action required")],
      ["Projected", getExtraRowValue(rows, ["Projected"], "N/A")],
      ["Window", getExtraRowValue(rows, ["Window"], "Monday 00:00")]
    ]);
  }

  function emitCalendarNotification(citizenId, reminder = {}, event = {}) {
    const normalized = normalizeCalendarReminder(reminder);
    const subtype = event.subtype || "CALENDAR_REMINDER_TRIGGERED";
    return emitTerminalNotification(citizenId, {
      type: "CALENDAR",
      subtype,
      severity: event.severity,
      title: event.title || normalized.title || "Calendar reminder",
      layout: "record-calendar",
      panels: buildCalendarNotificationPanels(normalized, { ...event, subtype }),
      finalRows: event.finalRows || buildCalendarNotificationFinalRows(normalized, { ...event, subtype }),
      tags: event.tags || ["CALENDAR", subtype.includes("WARNING") ? "WARNING" : subtype.includes("REMINDER") ? "REMINDER" : "NOTICE"],
      links: [{ label: "OPEN TERMINAL", module: "terminal-hub", panel: "inbox" }],
      createdBy: event.createdBy || normalized.createdBy || "CALENDAR",
      notify: event.notify,
      audience: event.audience
    });
  }

  function getServiceSubtypeForStatus(status = "") {
    const normalized = String(status || "ACTIVE").trim().toUpperCase();
    if (normalized === "COMPLETED") return "SERVICE_COMPLETED";
    if (normalized === "FAILED") return "SERVICE_FAILED";
    if (normalized === "CANCELLED" || normalized === "CANCELED") return "SERVICE_CANCELLED";
    if (normalized === "TERMINATED") return "SERVICE_TERMINATED";
    if (normalized === "ARCHIVED") return "SERVICE_ARCHIVED";
    return "SERVICE_STATUS_CHANGED";
  }

  function buildServiceNotificationPanels(record = {}, extraRows = [], event = {}) {
    const normalized = normalizeServiceRecord(record, 0);
    const subtype = String(event.subtype || getServiceSubtypeForStatus(normalized.status)).trim().toUpperCase();
    const paymentLabel = getServicePaymentLabel(normalized);
    const paymentValue = normalized.form === "COMMISSION"
      ? formatCreditLabel(normalized.amount)
      : `${formatCreditLabel(normalized.amount)} / week`;
    const detailsPanel = buildNotificationPanel("DETAILS", [
      ["Service", normalized.title || "Assigned service"],
      ["Provider", normalized.provider || "SYSTEM"],
      ["Form", getServiceFormLabel(normalized.form)]
    ]);
    const paymentPanel = buildNotificationPanel(normalized.form === "COMMISSION" ? "PAYOUT" : "PAYMENT", [
      [paymentLabel, paymentValue],
      ["Settlement", getServiceSettlementLabel(normalized)],
      ["Deadline", getServiceDeadlineLabel(normalized)]
    ]);

    if (["SERVICE_ACCEPTED", "SERVICE_ASSIGNED", "SERVICE_STARTED", "SERVICE_AVAILABLE"].includes(subtype)) {
      return createPanelList(detailsPanel, paymentPanel);
    }

    if (["COMMISSION_PAYOUT_PENDING", "COMMISSION_PAYOUT_APPROVED", "COMMISSION_PAYOUT_REJECTED"].includes(subtype)) {
      return createPanelList(
        buildNotificationPanel("SERVICE", [
          ["Service", normalized.title || "Assigned service"],
          ["Provider", normalized.provider || "SYSTEM"],
          ["Form", getServiceFormLabel(normalized.form)]
        ]),
        buildNotificationPanel("PAYOUT", [
          ["Amount", getExtraRowValue(extraRows, ["Payout", "Amount"], formatCreditLabel(normalized.amount))],
          ["Status", normalized.payoutStatus || getExtraRowValue(extraRows, ["Payout status"], "Pending")],
          ["Settlement", getServiceSettlementLabel(normalized)],
          ["Note", getExtraRowValue(extraRows, ["Note"], normalized.payoutNote || "N/A")]
        ])
      );
    }

    if (subtype === "SERVICE_RECORD_REMOVED") {
      return createPanelList(
        buildNotificationPanel("RECORD", [
          ["Service", normalized.title || "Assigned service"],
          ["Provider", normalized.provider || "SYSTEM"],
          ["Form", getServiceFormLabel(normalized.form)]
        ]),
        buildNotificationPanel("SYSTEM", [
          ["Result", getExtraRowValue(extraRows, ["Result"], "Record removed from active services")],
          ["Action", "No action required"]
        ])
      );
    }

    return createPanelList(
      buildNotificationPanel("SERVICE", [
        ["Service", normalized.title || "Assigned service"],
        ["Provider", normalized.provider || "SYSTEM"],
        ["Form", getServiceFormLabel(normalized.form)]
      ]),
      buildNotificationPanel("STATUS CHANGE", [
        ["Previous", getExtraRowValue(extraRows, ["Previous status"], "N/A")],
        ["Current", getExtraRowValue(extraRows, ["Current status"], normalized.status || "ACTIVE")],
        ["Result", getExtraRowValue(extraRows, ["Result"], normalized.result || formatNotificationEnum(normalized.status))],
        ["Payout", getExtraRowValue(extraRows, ["Payout status", "Payout"], normalized.payoutStatus || "N/A")]
      ]),
      normalized.form === "COMMISSION" ? buildNotificationPanel("PAYOUT", [
        ["Amount", formatCreditLabel(normalized.amount)],
        ["Status", normalized.payoutStatus || "N/A"],
        ["Settlement", getServiceSettlementLabel(normalized)]
      ]) : null
    );
  }

  function emitServiceNotification(citizenId, record = {}, event = {}) {
    const normalized = normalizeServiceRecord(record, 0);
    const subtype = String(event.subtype || getServiceSubtypeForStatus(normalized.status)).trim().toUpperCase();
    return emitTerminalNotification(citizenId, {
      type: "SERVICE",
      subtype,
      severity: event.severity,
      title: event.title || "Service status changed",
      layout: "record-service",
      panels: buildServiceNotificationPanels(normalized, event.rows, { ...event, subtype }),
      tags: getServiceTagList(subtype, normalized),
      links: [{ label: "OPEN SERVICE", module: "service" }],
      createdBy: event.createdBy || normalized.createdBy || "SYSTEM",
      notify: event.notify,
      audience: event.audience
    });
  }

  function emitProfileNotification(citizenId, payload = {}) {
    return emitTerminalNotification(citizenId, {
      type: "PROFILE",
      subtype: payload.subtype || "PROFILE_UPDATED",
      severity: payload.severity,
      title: payload.title || "Profile updated",
      layout: "record-profile",
      panels: payload.panels,
      links: payload.links || [{ label: "OPEN PROFILE", module: "citizen-card" }],
      createdBy: payload.createdBy,
      notify: payload.notify,
      audience: payload.audience
    });
  }

  function emitAccessNotification(citizenId, payload = {}) {
    return emitTerminalNotification(citizenId, {
      type: "ACCESS",
      subtype: payload.subtype || "ACCESS_UPDATED",
      severity: payload.severity,
      title: payload.title || "Access updated",
      layout: "record-access",
      panels: payload.panels || createPanelList(buildNotificationPanel("ACCESS", payload.rows || [])),
      links: payload.links || [{ label: "OPEN DATABASE", module: "database" }],
      createdBy: payload.createdBy,
      notify: payload.notify,
      audience: payload.audience
    });
  }

  function emitDatabaseNotification(citizenId, payload = {}) {
    return emitTerminalNotification(citizenId, {
      type: "DATABASE",
      subtype: payload.subtype || "RECORD_UPDATED",
      severity: payload.severity,
      title: payload.title || "Database record updated",
      layout: "record-database",
      panels: payload.panels || createPanelList(buildNotificationPanel("DATABASE", payload.rows || [])),
      links: payload.links || [{ label: "OPEN DATABASE", module: "database" }],
      createdBy: payload.createdBy,
      notify: payload.notify,
      audience: payload.audience
    });
  }

  function emitSystemNotification(citizenId, payload = {}) {
    return emitTerminalNotification(citizenId, {
      type: "SYSTEM",
      subtype: payload.subtype || "SYSTEM_NOTICE",
      severity: payload.severity,
      title: payload.title || "System notice",
      layout: "notice-system",
      panels: payload.panels || createPanelList(buildNotificationPanel("SYSTEM", payload.rows || [])),
      links: payload.links,
      createdBy: payload.createdBy,
      notify: payload.notify,
      audience: payload.audience
    });
  }

  window.WS_APP.emitTerminalNotification = emitTerminalNotification;
  window.WS_APP.emitBillingNotification = emitBillingNotification;
  window.WS_APP.emitSubscriptionNotification = emitSubscriptionTerminalEntry;
  window.WS_APP.emitServiceNotification = emitServiceNotification;
  window.WS_APP.emitRequestNotification = emitRequestNotification;
  window.WS_APP.emitCalendarNotification = emitCalendarNotification;
  window.WS_APP.emitProfileNotification = emitProfileNotification;
  window.WS_APP.emitAccessNotification = emitAccessNotification;
  window.WS_APP.emitDatabaseNotification = emitDatabaseNotification;
  window.WS_APP.emitSystemNotification = emitSystemNotification;









  function getTerminalDateIso() {
    return window.WS_APP.getCampaignDateIso?.() || window.WS_APP.CAMPAIGN_DATE_ISO || "2109-02-13";
  }

  function getTerminalCampaignTimeIso() {
    const explicit = String(window.WS_APP.getCampaignTimeIso?.() || window.WS_APP.CAMPAIGN_TIME_ISO || "").trim();
    if (explicit && Number.isFinite(Date.parse(explicit))) return new Date(explicit).toISOString();
    return `${getTerminalDateIso()}T00:00:00.000Z`;
  }

  function isIsoDate(value) {
    const iso = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const parsed = new Date(`${iso}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso;
  }

  function addDaysIsoLocal(iso, days = 0) {
    const safeIso = isIsoDate(iso) ? iso : getTerminalDateIso();
    const date = new Date(`${safeIso}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + (Number(days) || 0));
    return date.toISOString().slice(0, 10);
  }

  function getAlignedSubscriptionPeriodEndIso() {
    const settlementIso = String(window.WS_APP.getSettlementPeriodEndIso?.() || window.WS_APP.SETTLEMENT_PERIOD_END_ISO || "").trim();
    if (isIsoDate(settlementIso)) return settlementIso;

    const date = new Date(`${getTerminalDateIso()}T00:00:00Z`);
    const daysUntilSunday = (7 - date.getUTCDay()) % 7;
    date.setUTCDate(date.getUTCDate() + daysUntilSunday);
    return date.toISOString().slice(0, 10);
  }

  function compareIsoDatesLocal(a, b) {
    const left = isIsoDate(a) ? a : getTerminalDateIso();
    const right = isIsoDate(b) ? b : getTerminalDateIso();
    return left.localeCompare(right);
  }

  const TERMINAL_NOTIFICATION_SEVERITIES = ["INFO", "NOTICE", "WARNING", "CRITICAL"];

  function normalizeNotificationToken(value, fallback = "SYSTEM") {
    const normalized = String(value || fallback)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return normalized || fallback;
  }

  const TERMINAL_ENTRY_SCHEMA_VERSION = 4;

  function getNotificationEventCatalogRaw() {
    return Array.isArray(window.APP_DATA?.notificationEventCatalog)
      ? window.APP_DATA.notificationEventCatalog
      : [];
  }

  function getNotificationEventCatalogDefinition(eventCode = "") {
    const normalized = normalizeTerminalEventCode(eventCode);
    if (!normalized) return null;
    return getNotificationEventCatalogRaw().find((item) => normalizeTerminalEventCode(item?.eventCode) === normalized) || null;
  }

  function deriveLegacyTerminalCategory(type = "SYSTEM", subtype = "SYSTEM_NOTICE") {
    const normalizedType = normalizeNotificationToken(type, "SYSTEM");
    const normalizedSubtype = normalizeNotificationToken(subtype, "SYSTEM_NOTICE");
    const categoryByType = {
      BILLING: /DEBT/.test(normalizedSubtype) ? "DEBT" : (/PAYMENT|PAYOUT|SETTLEMENT|TRANSFER/.test(normalizedSubtype) ? "PAYMENT" : "BILLING"),
      SUBSCRIPTION: /PAYMENT|BILLING/.test(normalizedSubtype) ? "BILLING" : "CONTRACT",
      SERVICE: /INCOME_SOURCE|INCOME|PAYOUT/.test(normalizedSubtype) ? "INCOME" : "SERVICE",
      REQUEST: "REQUEST",
      CALENDAR: /DEADLINE/.test(normalizedSubtype) ? "DEADLINE" : (/REMINDER|APPOINTMENT/.test(normalizedSubtype) ? "REMINDER" : "CALENDAR"),
      PROFILE: /RISK|COMPLIANCE/.test(normalizedSubtype) ? "RISK" : (/INCOME_SOURCE|INCOME/.test(normalizedSubtype) ? "INCOME" : "PROFILE"),
      ACCESS: "ACCESS",
      DATABASE: "RECORD",
      SYSTEM: /ERROR/.test(normalizedSubtype) ? "ERROR" : (/WARNING/.test(normalizedSubtype) ? "WARNING" : "NOTICE")
    };
    return categoryByType[normalizedType] || normalizedType || "SYSTEM";
  }

  function resolveTerminalEntryIdentity(entry = {}, legacyType = "SYSTEM", legacySubtype = "SYSTEM_NOTICE") {
    const rawEventCode = normalizeTerminalEventCode(entry?.eventCode);
    const exactEvent = getNotificationEventCatalogDefinition(rawEventCode);
    const rawDomain = normalizeNotificationToken(entry?.domain, "");
    const eventDomain = normalizeNotificationToken(exactEvent?.domain, "");
    const domain = eventDomain || rawDomain || normalizeNotificationToken(legacyType, "SYSTEM");
    const eventCode = exactEvent?.eventCode
      ? normalizeTerminalEventCode(exactEvent.eventCode)
      : (rawEventCode.includes(".")
        ? rawEventCode
        : normalizeTerminalEventCode(`${domain}.${rawEventCode || legacySubtype || "UPDATED"}`));
    const category = normalizeNotificationToken(
      exactEvent?.category || entry?.category,
      deriveLegacyTerminalCategory(domain, legacySubtype)
    );
    return { domain, category, eventCode };
  }

  function getInboxNotificationTypesRaw() {
    return Array.isArray(window.APP_DATA?.inboxNotificationTypes)
      ? window.APP_DATA.inboxNotificationTypes
      : [];
  }

  function getInboxNotificationTypeDefinition(type) {
    const normalized = normalizeNotificationToken(type, "SYSTEM");
    return getInboxNotificationTypesRaw().find((item) => normalizeNotificationToken(item?.id, "") === normalized) || null;
  }

  function getInboxNotificationSubtypeDefinition(type, subtype) {
    const typeDefinition = getInboxNotificationTypeDefinition(type);
    const normalized = normalizeNotificationToken(subtype, "");
    if (!typeDefinition || !normalized || !Array.isArray(typeDefinition.subtypes)) return null;
    return typeDefinition.subtypes.find((item) => normalizeNotificationToken(item?.id, "") === normalized) || null;
  }

  function getDefaultTerminalSubtype(type = "SYSTEM") {
    const normalizedType = normalizeNotificationToken(type, "SYSTEM");
    const typeDefinition = getInboxNotificationTypeDefinition(normalizedType);
    const firstSubtype = Array.isArray(typeDefinition?.subtypes) && typeDefinition.subtypes.length
      ? normalizeNotificationToken(typeDefinition.subtypes[0]?.id, "")
      : "";
    if (firstSubtype) return firstSubtype;
    if (normalizedType === "SYSTEM") return "SYSTEM_NOTICE";
    return `${normalizedType}_UPDATED`;
  }

  function normalizeTerminalEntryType(value = "SYSTEM") {
    const normalizedType = normalizeNotificationToken(value, "SYSTEM");
    return getInboxNotificationTypeDefinition(normalizedType) ? normalizedType : "SYSTEM";
  }

  function normalizeTerminalEntrySubtype(value = "", type = "SYSTEM") {
    const normalizedType = normalizeTerminalEntryType(type);
    const fallback = getDefaultTerminalSubtype(normalizedType);
    const normalizedSubtype = normalizeNotificationToken(value, fallback);
    return getInboxNotificationSubtypeDefinition(normalizedType, normalizedSubtype)
      ? normalizedSubtype
      : fallback;
  }

  function normalizeTerminalSeverity(value, type, subtype) {
    const explicit = normalizeNotificationToken(value, "");
    if (TERMINAL_NOTIFICATION_SEVERITIES.includes(explicit)) return explicit;
    const subtypeDefinition = getInboxNotificationSubtypeDefinition(type, subtype);
    const subtypeSeverity = normalizeNotificationToken(subtypeDefinition?.severity, "");
    if (TERMINAL_NOTIFICATION_SEVERITIES.includes(subtypeSeverity)) return subtypeSeverity;
    const typeDefinition = getInboxNotificationTypeDefinition(type);
    const typeSeverity = normalizeNotificationToken(typeDefinition?.defaultSeverity, "");
    return TERMINAL_NOTIFICATION_SEVERITIES.includes(typeSeverity) ? typeSeverity : "INFO";
  }

  function normalizeTerminalEventCode(value = "") {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9.]+/g, "_")
      .replace(/^[_\.]+|[_\.]+$/g, "")
      .replace(/\.{2,}/g, ".");
  }

  function normalizeTerminalAudience(value = "PLAYER") {
    const source = Array.isArray(value) ? value : [value];
    const allowed = new Set(["PLAYER", "ADMIN", "BOTH", "SYSTEM_ONLY"]);
    const normalized = source
      .map((item) => normalizeNotificationToken(item, "PLAYER"))
      .map((item) => item === "INTERNAL" ? "SYSTEM_ONLY" : item)
      .filter((item) => allowed.has(item));
    return [...new Set(normalized.length ? normalized : ["PLAYER"])];
  }

  function normalizeTerminalAttention(value = "", severity = "INFO") {
    const fallback = severity === "CRITICAL" ? "BLOCKING" : severity === "WARNING" ? "INBOX" : "INBOX";
    const attention = normalizeNotificationToken(value, fallback);
    return ["SILENT", "BADGE", "INBOX", "BANNER", "BLOCKING"].includes(attention) ? attention : fallback;
  }

  function normalizeTerminalReference(reference = {}) {
    if (!reference || typeof reference !== "object" || Array.isArray(reference)) return null;
    const type = normalizeNotificationToken(reference.type, "");
    const id = String(reference.id || reference.entityId || "").trim();
    if (!type || !id) return null;
    return {
      ...clone(reference),
      type,
      id
    };
  }

  function normalizeTerminalSource(source = {}, createdBy = "SYSTEM") {
    const record = source && typeof source === "object" && !Array.isArray(source) ? source : {};
    return {
      kind: normalizeNotificationToken(record.kind, record.organizationId ? "ORGANIZATION" : "SYSTEM_PROCESS"),
      providerId: String(record.providerId || "").trim(),
      requestedProviderId: String(record.requestedProviderId || "").trim(),
      organizationId: String(record.organizationId || "").trim(),
      organizationLocationId: String(record.organizationLocationId || "").trim(),
      label: String(record.label || createdBy || "SYSTEM").trim()
    };
  }

  function normalizeTerminalTimestamp(value = "", fallback = "") {
    const raw = String(value || fallback || "").trim();
    if (!raw) return "";
    const expanded = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00.000Z` : raw;
    const parsed = Date.parse(expanded);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
  }

  function normalizeTerminalLifecycle(lifecycle = {}, read = false, createdAt = "", readAt = "") {
    const source = lifecycle && typeof lifecycle === "object" && !Array.isArray(lifecycle) ? lifecycle : {};
    const explicitStatus = normalizeNotificationToken(source.status, "");
    const terminalStatuses = ["NEW", "READ", "ACKNOWLEDGED", "RESOLVED", "EXPIRED", "ARCHIVED"];
    let status = terminalStatuses.includes(explicitStatus) ? explicitStatus : (read ? "READ" : "NEW");
    let normalizedRead = read === true;

    if (["ACKNOWLEDGED", "RESOLVED", "EXPIRED", "ARCHIVED"].includes(status)) normalizedRead = true;
    else status = normalizedRead ? "READ" : "NEW";

    return {
      status,
      createdAt: normalizeTerminalTimestamp(source.createdAt || createdAt),
      readAt: normalizedRead ? normalizeTerminalTimestamp(source.readAt || readAt || createdAt) : "",
      acknowledgedAt: normalizeTerminalTimestamp(source.acknowledgedAt),
      resolvedAt: normalizeTerminalTimestamp(source.resolvedAt),
      expiredAt: normalizeTerminalTimestamp(source.expiredAt),
      archivedAt: normalizeTerminalTimestamp(source.archivedAt)
    };
  }

  function normalizeTerminalLink(link = {}) {
    const entityRef = normalizeTerminalReference(link?.entityRef || link?.subjectRef || {});
    const params = link?.params && typeof link.params === "object" && !Array.isArray(link.params)
      ? clone(link.params)
      : {};
    return {
      label: String(link?.label || "OPEN").trim().toUpperCase(),
      routeId: String(link?.routeId || "").trim().toUpperCase(),
      module: String(link?.module || "terminal-hub").trim(),
      panel: String(link?.panel || "").trim(),
      section: String(link?.section || "").trim(),
      citizenId: String(link?.citizenId || "").trim(),
      entityRef,
      params
    };
  }


  function normalizeTerminalFinanceRow(row = {}) {
    const source = Array.isArray(row)
      ? { label: row[0], value: row[1] }
      : row;
    const label = String(source?.label || source?.name || source?.title || "").trim();
    const value = String(source?.value ?? source?.amount ?? "").trim();
    if (!label && !value) return null;
    return { label, value };
  }

  function normalizeTerminalFinanceRows(rows = []) {
    return (Array.isArray(rows) ? rows : [])
      .map(normalizeTerminalFinanceRow)
      .filter(Boolean);
  }

  function normalizeTerminalFinancePanel(panel = {}) {
    const title = String(panel?.title || panel?.label || "").trim();
    const rows = normalizeTerminalFinanceRows(panel?.rows);
    if (!title && !rows.length) return null;
    const role = String(panel?.role || "").trim().toLowerCase();
    const variant = String(panel?.variant || "").trim().toLowerCase();
    return {
      title,
      rows,
      ...(role ? { role } : {}),
      ...(variant ? { variant } : {})
    };
  }

  function normalizeTerminalFinancePanels(panels = []) {
    return (Array.isArray(panels) ? panels : [])
      .map(normalizeTerminalFinancePanel)
      .filter(Boolean);
  }

  function normalizeTerminalFinanceLayout(value = "") {
    const layout = String(value || "").trim().toLowerCase();
    return [
      "finance-settlement",
      "finance-transfer",
      "finance-debt",
      "finance-payment",
      "record-subscription",
      "record-service",
      "record-request",
      "record-calendar",
      "record-profile",
      "record-access",
      "record-database",
      "notice-system"
    ].includes(layout) ? layout : "";
  }

  function pickFinanceRow(rows = [], labels = [], fallback = "-") {
    const normalizedLabels = labels.map((label) => String(label || "").trim().toLowerCase());
    const row = rows.find((item) => normalizedLabels.includes(String(item?.label || "").trim().toLowerCase()));
    return row?.value || fallback;
  }

  function getFinancePanelRows(panels = [], titles = []) {
    const normalizedTitles = titles.map((title) => String(title || "").trim().toLowerCase());
    const panel = (Array.isArray(panels) ? panels : []).find((item) => normalizedTitles.includes(String(item?.title || "").trim().toLowerCase()));
    return Array.isArray(panel?.rows) ? panel.rows : [];
  }

  function getFinanceRowValue(rows = [], labels = [], fallback = "-") {
    return pickFinanceRow(rows, labels, fallback);
  }

  function normalizeFinanceChangeValue(value = "", fallback = "+0 ₡") {
    const raw = String(value || "").trim();
    if (!raw || raw === "-") return fallback;
    return formatChangeCreditLabel(parseCreditNumber(raw));
  }

  function normalizeFinanceOperationValue(value = "") {
    const normalized = String(value || "").trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ").toUpperCase();
    if (["CREDIT TRANSFER IN", "CREDIT TRANSFER OUT", "CREDITS TRANSFER", "TRANSFER IN", "TRANSFER OUT"].includes(normalized)) return "Credits transfer";
    if (["CREDITS CHANGE", "CREDIT ADJUSTMENT", "ADMIN ADJUSTMENT", "CREDITS SET", "CREDIT SET", "CREDITSSET"].includes(normalized)) return "Credits change";
    if (["CREDIT DEDUCTION", "CREDITS DEDUCTION"].includes(normalized)) return "Credit deduction";
    return normalized ? normalized.replace(/[_-]+/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Credits transfer";
  }

  function isTechnicalFinanceNote(value = "") {
    const normalized = String(value || "").trim().toLowerCase();
    return !normalized || ["test", "dev", "developer", "null", "undefined"].includes(normalized);
  }

  function normalizeFinanceNoteValue(value = "") {
    const raw = String(value || "").trim();
    return isTechnicalFinanceNote(raw) ? "-" : raw;
  }

  function parseFinanceRange(value = "") {
    const text = String(value || "").trim();
    const parts = text.split(/\s*(?:→|->|⇒|=>)\s*/);
    if (parts.length < 2) return null;
    const before = parseCreditNumber(parts[0]);
    const after = parseCreditNumber(parts.at(-1));
    return { before, after };
  }

  function buildFinanceAccountRowsFromRows(rows = [], options = {}) {
    const balanceValue = getFinanceRowValue(rows, ["Balance", "Credits", "Current balance", "Credits after"], "");
    const finalValue = getFinanceRowValue(rows, ["Final balance"], "");
    const changeValue = getFinanceRowValue(rows, ["Change"], "");
    const range = parseFinanceRange(balanceValue);
    if (range) return buildFinanceAccountRows(range.before, range.after);

    const balance = balanceValue || "0 ₡";
    const finalBalance = finalValue || balance;
    const change = changeValue ? normalizeFinanceChangeValue(changeValue) : formatChangeCreditLabel(parseCreditNumber(finalBalance) - parseCreditNumber(balance));
    return [
      { label: "Balance", value: formatCreditLabel(balance) },
      { label: "Change", value: change },
      { label: "Final balance", value: formatCreditLabel(finalBalance) }
    ];
  }

  function normalizeFinanceActiveCount(value = "") {
    const text = String(value || "").trim();
    if (!text || text === "-" || /^0(?:\s*\/\s*0?)?$/.test(text)) return "None";
    return text;
  }

  function normalizeFinanceDebtValue(value = "", fallback = "0 ₡") {
    const raw = String(value || "").trim();
    if (!raw || raw === "-") return fallback;
    return formatCreditLabel(raw);
  }


  function normalizeSubscriptionPaymentDetailLabel(label = "") {
    const text = String(label || "").trim().replace(/\s+/g, " ");
    return text.replace(/^(paid|skipped)\s+\d+\s+/i, "$1 ");
  }

  function isSubscriptionPaymentProviderLabel(label = "") {
    return /^(paid|skipped)?\s*(?:\d+\s*)?provider$/i.test(String(label || "").trim());
  }

  function normalizeSubscriptionPaymentPanelRows(rows = []) {
    const normalizedRows = normalizeTerminalFinanceRows(rows);
    const expandedRows = [];

    normalizedRows.forEach((row) => {
      const label = normalizeSubscriptionPaymentDetailLabel(row.label);
      const value = String(row.value || "").trim();
      if (isSubscriptionPaymentProviderLabel(label)) return;

      if (!/^(paid|skipped)(?:\s+\d+)?$/i.test(label) || !value.includes(" / ")) {
        expandedRows.push({ ...row, label });
        return;
      }

      const parts = value.split(" / ").map((part) => part.trim()).filter(Boolean);
      const costIndex = parts.findIndex((part) => /₡/.test(part));
      if (costIndex < 0 || parts.length < 2) {
        expandedRows.push({ ...row, label });
        return;
      }

      const status = label.toLowerCase().startsWith("skipped") ? "Skipped" : "Paid";
      const cost = parts[costIndex];
      const tier = parts[costIndex - 1] || "N/A";
      const service = parts.slice(0, Math.max(1, costIndex - 1)).join(" / ") || parts[0] || "Subscription";
      expandedRows.push({ label: `${status} service`, value: service });
      expandedRows.push({ label: `${status} tier`, value: tier });
      expandedRows.push({ label: `${status} cost`, value: cost });
    });

    const visibleRows = expandedRows
      .map((row) => ({
        ...row,
        label: normalizeSubscriptionPaymentDetailLabel(row.label)
      }))
      .filter((row) => !isSubscriptionPaymentProviderLabel(row.label));

    const labels = visibleRows.map((row) => String(row.label || "").trim().toLowerCase());
    const hasOnlyOneStatus = new Set(labels
      .map((label) => label.match(/^(paid|skipped)\s+(service|tier|cost)$/i)?.[1] || "")
      .filter(Boolean)).size === 1;

    if (hasOnlyOneStatus && visibleRows.length <= 3) {
      return visibleRows.map((row) => ({
        ...row,
        label: String(row.label || "").replace(/^(paid|skipped)\s+/i, "")
      }));
    }

    return visibleRows;
  }

  function normalizeTerminalFinancePayload(payload = {}, subtype = "") {
    const layout = normalizeTerminalFinanceLayout(payload?.layout);
    const panels = normalizeTerminalFinancePanels(payload?.panels);
    const finalRows = normalizeTerminalFinanceRows(payload?.finalRows);
    const normalizedSubtype = String(subtype || "").trim().toUpperCase();

    if (layout === "finance-settlement") {
      const incomeRows = getFinancePanelRows(panels, ["INCOME"]);
      const subscriptionRows = getFinancePanelRows(panels, ["SUBSCRIPTIONS", "SUBS"]);
      const debtRows = getFinancePanelRows(panels, ["DEBT"]);
      const serviceIncome = getFinanceRowValue(incomeRows, ["Service", "Service Income", "Income received"], "0 ₡");
      const otherIncome = getFinanceRowValue(incomeRows, ["Other"], "0 ₡");
      const totalIncome = getFinanceRowValue(incomeRows, ["Total", "Total Income"], formatCreditLabel(parseCreditNumber(serviceIncome) + parseCreditNumber(otherIncome)));
      const weeklyCost = getFinanceRowValue(subscriptionRows, ["Weekly cost", "Cost", "Subscription Cost", "Subscription charge"], "0 ₡");
      let due = getFinanceRowValue(subscriptionRows, ["Due", "Subscriptions Due"], weeklyCost);
      if (!/₡/.test(due)) due = weeklyCost;
      const beforeDebt = normalizeFinanceDebtValue(getFinanceRowValue(debtRows, ["Before", "Current", "Current Debt"], "0 ₡"));
      const debtChange = normalizeFinanceChangeValue(getFinanceRowValue(debtRows, ["Change", "Debt change", "Debt increased by"], "+0 ₡"));
      const remainingDebt = normalizeFinanceDebtValue(getFinanceRowValue(debtRows, ["Remaining", "Remaining debt"], getFinanceRowValue(finalRows, ["Remaining debt"], "0 ₡")));
      return {
        layout: "finance-settlement",
        panels: [
          { title: "INCOME", rows: [
            { label: "Service", value: serviceIncome },
            { label: "Other", value: otherIncome },
            { label: "Total", value: totalIncome }
          ] },
          { title: "SUBSCRIPTIONS", rows: [
            { label: "Active", value: normalizeFinanceActiveCount(getFinanceRowValue(subscriptionRows, ["Active", "Subscriptions Active"], "None")) },
            { label: "Weekly cost", value: weeklyCost },
            { label: "Due", value: due }
          ] },
          { title: "DEBT", rows: [
            { label: "Before", value: beforeDebt },
            { label: "Change", value: debtChange },
            { label: "Remaining", value: remainingDebt }
          ] }
        ],
        finalRows: [
          { label: "Change", value: normalizeFinanceChangeValue(getFinanceRowValue(finalRows, ["Change", "Credits used"], "+0 ₡")) },
          { label: "Debt change", value: normalizeFinanceChangeValue(getFinanceRowValue(finalRows, ["Debt change"], debtChange)) },
          { label: "Remaining debt", value: remainingDebt },
          { label: "Final balance", value: getFinanceRowValue(finalRows, ["Final balance"], "0 ₡") }
        ]
      };
    }

    if (layout === "finance-transfer") {
      const transferRows = getFinancePanelRows(panels, ["TRANSFER"]);
      const accountRows = getFinancePanelRows(panels, ["ACCOUNT"]);
      const isOutgoing = normalizedSubtype === "CREDIT_TRANSFER_OUT" || /OUT|DEDUCT/.test(getFinanceRowValue(transferRows, ["Operation"], ""));
      const entityLabel = isOutgoing ? "Recipient" : getFinanceRowValue(transferRows, ["Sender"], "") ? "Sender" : "Source";
      const amount = getFinanceRowValue(transferRows, ["Amount", "Value", "Received", "Sent", "Amount received", "Amount deducted"], "0 ₡");
      return {
        layout: "finance-transfer",
        panels: [
          { title: "TRANSFER", rows: [
            { label: entityLabel, value: getFinanceRowValue(transferRows, [entityLabel, "Sender", "Recipient", "Source"], "-") },
            { label: "Operation", value: normalizeFinanceOperationValue(getFinanceRowValue(transferRows, ["Operation"], isOutgoing ? "CREDIT TRANSFER OUT" : "CREDIT TRANSFER IN")) },
            { label: "Amount", value: amount },
            { label: "Note", value: normalizeFinanceNoteValue(getFinanceRowValue(transferRows, ["Note"], "-")) }
          ] },
          { title: "ACCOUNT", rows: buildFinanceAccountRowsFromRows(accountRows) }
        ],
        finalRows: []
      };
    }

    if (layout === "finance-debt") {
      const debtRows = getFinancePanelRows(panels, ["DEBT PAYMENT"]);
      const accountRows = getFinancePanelRows(panels, ["ACCOUNT"]);
      const debtBefore = getFinanceRowValue(debtRows, ["Debt", "Current", "Current debt"], "-");
      const currentDebt = getFinanceRowValue(debtRows, ["Current debt", "Remaining", "Remaining debt"], debtBefore);
      return {
        layout: "finance-debt",
        panels: [
          { title: "DEBT PAYMENT", rows: [
            { label: "Debt", value: debtBefore },
            { label: "Change", value: normalizeFinanceChangeValue(getFinanceRowValue(debtRows, ["Change", "Debt change"], "+0 ₡")) },
            { label: "Current debt", value: currentDebt }
          ] },
          { title: "ACCOUNT", rows: buildFinanceAccountRowsFromRows(accountRows) }
        ],
        finalRows: []
      };
    }

    if (layout === "finance-payment") {
      const paymentRows = getFinancePanelRows(panels, ["PAYMENT"]);
      const accountRows = getFinancePanelRows(panels, ["ACCOUNT"]);
      const subscriptionRows = getFinancePanelRows(panels, ["DETAILS", "SUBSCRIPTIONS", "SUBSCRIPTION", "SERVICES"]);
      const normalizedPanels = [
        { title: "PAYMENT", role: "finance", rows: [
          { label: "Paid", value: getFinanceRowValue(paymentRows, ["Paid"], "0 ₡") },
          { label: "Services paid", value: getFinanceRowValue(paymentRows, ["Services paid"], "0") },
          { label: "Skipped/Overdue", value: getFinanceRowValue(paymentRows, ["Skipped/Overdue", "Skipped", "Overdue", "Services skipped", "Services overdue"], "0") }
        ] },
        { title: "ACCOUNT", role: "finance", rows: buildFinanceAccountRowsFromRows(accountRows) }
      ];
      if (subscriptionRows.length) {
        normalizedPanels.push({ title: "DETAILS", role: "metadata", rows: normalizeSubscriptionPaymentPanelRows(subscriptionRows) });
      }
      return {
        layout: "finance-payment",
        panels: normalizedPanels,
        finalRows: []
      };
    }

    return { layout, panels, finalRows };
  }

  window.WS_APP.getInboxNotificationTypes = function getInboxNotificationTypes() {
    return clone(getInboxNotificationTypesRaw());
  };

  window.WS_APP.getInboxNotificationSubtypes = function getInboxNotificationSubtypes(type) {
    const definition = getInboxNotificationTypeDefinition(type);
    return clone(Array.isArray(definition?.subtypes) ? definition.subtypes : []);
  };

  window.WS_APP.getInboxNotificationTypeDefinition = function getInboxNotificationTypeDefinitionPublic(type) {
    return clone(getInboxNotificationTypeDefinition(type));
  };

  function normalizeTerminalEntry(entry = {}) {
    const folderRaw = String(entry?.folder || (entry?.trashed === true ? "TRASH" : "INBOX")).trim().toUpperCase();
    const folder = folderRaw === "TRASH" ? "TRASH" : "INBOX";
    const type = normalizeTerminalEntryType(entry?.type || entry?.domain);
    const subtype = normalizeTerminalEntrySubtype(entry?.subtype, type);
    const identity = resolveTerminalEntryIdentity(entry, type, subtype);
    const severity = normalizeTerminalSeverity(entry?.severity, type, subtype);
    const entryLayout = normalizeTerminalFinanceLayout(entry?.layout);
    const entryPanels = normalizeTerminalFinancePanels(entry?.panels);
    const entryFinalRows = normalizeTerminalFinanceRows(entry?.finalRows);
    const hasStructuredPayload = entryLayout || entryPanels.length || entryFinalRows.length;
    const structuredPayload = hasStructuredPayload
      ? (type === "BILLING" || /^finance-/.test(entryLayout)
        ? normalizeTerminalFinancePayload({ layout: entryLayout, panels: entryPanels, finalRows: entryFinalRows }, subtype)
        : { layout: entryLayout || "notice-system", panels: entryPanels, finalRows: entryFinalRows })
      : { layout: "", panels: [], finalRows: [] };

    const id = String(entry?.id || makeStoreId("entry")).trim();
    const legacyIdTimestamp = extractTimestampFromStoreId(entry?.id || "");
    const occurredAt = normalizeTerminalTimestamp(entry?.occurredAt || entry?.date);
    const createdAt = normalizeTerminalTimestamp(
      entry?.createdAt,
      legacyIdTimestamp ? getLocalCreatedAt(legacyIdTimestamp) : (occurredAt || getTerminalCampaignTimeIso())
    );
    const sentAt = normalizeTerminalTimestamp(entry?.sentAt, occurredAt || createdAt);
    const receivedAt = normalizeTerminalTimestamp(entry?.receivedAt, sentAt || createdAt);
    const hasExplicitImportant = Object.prototype.hasOwnProperty.call(entry || {}, "important");
    const important = hasExplicitImportant
      ? entry.important === true
      : entry?.userFlags?.important === true;
    const requestedReadAt = normalizeTerminalTimestamp(entry?.readAt || entry?.lifecycle?.readAt);
    const lifecycle = normalizeTerminalLifecycle(entry?.lifecycle, entry?.read === true, createdAt, requestedReadAt || receivedAt);
    const read = ["READ", "ACKNOWLEDGED", "RESOLVED", "EXPIRED", "ARCHIVED"].includes(lifecycle.status);
    const readAt = read ? lifecycle.readAt : "";
    const audience = normalizeTerminalAudience(entry?.audience || "PLAYER");
    const { domain, category, eventCode } = identity;
    const source = normalizeTerminalSource(entry?.source, entry?.createdBy || "SYSTEM");
    const subjectRef = normalizeTerminalReference(entry?.subjectRef || {});
    const relatedRefs = (Array.isArray(entry?.relatedRefs) ? entry.relatedRefs : [])
      .map(normalizeTerminalReference)
      .filter(Boolean);
    const actionSource = Array.isArray(entry?.actions) && entry.actions.length
      ? entry.actions
      : (Array.isArray(entry?.links) ? entry.links : []);
    const actions = actionSource
      .map((action) => {
        if (!action || typeof action !== "object" || Array.isArray(action)) return null;
        return {
          ...clone(action),
          actionId: normalizeNotificationToken(action.actionId || action.label, "OPEN"),
          label: String(action.label || action.actionId || "OPEN").trim().toUpperCase(),
          routeId: String(action.routeId || "").trim().toUpperCase(),
          module: String(action.module || "terminal-hub").trim(),
          panel: String(action.panel || "").trim(),
          section: String(action.section || "").trim(),
          citizenId: String(action.citizenId || entry?.citizenId || "").trim(),
          entityRef: normalizeTerminalReference(action.entityRef || action.subjectRef || {}),
          params: action.params && typeof action.params === "object" && !Array.isArray(action.params)
            ? clone(action.params)
            : {}
        };
      })
      .filter(Boolean);

    return {
      schemaVersion: TERMINAL_ENTRY_SCHEMA_VERSION,
      id,
      eventId: String(entry?.eventId || "").trim(),
      citizenId: String(entry?.citizenId || "").trim(),
      domain,
      eventCode,
      category,
      source,
      type,
      subtype,
      severity,
      attention: normalizeTerminalAttention(entry?.attention, severity),
      audience,
      lifecycle,
      userFlags: { important },
      subjectRef,
      relatedRefs,
      correlationId: String(entry?.correlationId || "").trim(),
      dedupeKey: String(entry?.dedupeKey || "").trim(),
      revision: Math.max(1, Number(entry?.revision || 1) || 1),
      title: String(entry?.title || getInboxNotificationSubtypeDefinition(type, subtype)?.label || "Terminal entry").trim(),
      summary: String(entry?.summary || "").trim(),
      body: String(entry?.body || entry?.message || "").trim(),
      templateId: String(entry?.templateId || "").trim(),
      templateData: entry?.templateData && typeof entry.templateData === "object" && !Array.isArray(entry.templateData)
        ? clone(entry.templateData)
        : {},
      occurredAt,
      createdAt,
      sentAt,
      receivedAt,
      readAt,
      effectiveAt: normalizeTerminalTimestamp(entry?.effectiveAt),
      dueAt: normalizeTerminalTimestamp(entry?.dueAt),
      expiresAt: normalizeTerminalTimestamp(entry?.expiresAt),
      actions,
      retentionPolicy: entry?.retentionPolicy && typeof entry.retentionPolicy === "object" && !Array.isArray(entry.retentionPolicy)
        ? clone(entry.retentionPolicy)
        : {},
      aggregationPolicy: entry?.aggregationPolicy && typeof entry.aggregationPolicy === "object" && !Array.isArray(entry.aggregationPolicy)
        ? clone(entry.aggregationPolicy)
        : {},
      layout: structuredPayload.layout,
      panels: normalizeTerminalFinancePanels(structuredPayload.panels),
      finalRows: normalizeTerminalFinanceRows(structuredPayload.finalRows),
      tags: normalizeTerminalTagList(entry?.tags, type, severity),
      date: String(entry?.date || receivedAt.slice(0, 10) || occurredAt.slice(0, 10) || getTerminalDateIso()).slice(0, 10),
      sortIndex: resolveSortIndex(entry, entry?.id || "") || Date.parse(receivedAt || createdAt || "") || 0,
      read,
      important,
      folder,
      createdBy: String(entry?.createdBy || source.label || "SYSTEM").trim(),
      links: actions.map((action) => normalizeTerminalLink(action))
    };
  }

  function buildDemoNotificationPayload(type = "SYSTEM", subtype = "SYSTEM_NOTICE", definition = {}) {
    const label = String(definition?.label || subtype || "Notification").trim();
    const severity = definition?.severity || normalizeTerminalSeverity("", type, subtype);
    const demoDate = getTerminalDateIso();

    if (type === "BILLING") {
      const layout = subtype === "WEEKLY_SETTLEMENT_REPORT" ? "finance-settlement" : subtype.includes("DEBT") ? "finance-debt" : subtype.includes("PAYMENT") ? "finance-payment" : "finance-transfer";
      return {
        type,
        subtype,
        severity,
        title: label,
        layout,
        tags: ["BILLING", severity],
        panels: [
          { title: subtype.includes("DEBT") ? "DEBT" : "ACCOUNT", rows: [["Balance", "4 200 ₡"], ["Change", subtype.includes("OUT") || subtype.includes("FAILED") ? "-800 ₡" : "+800 ₡"], ["Final balance", "5 000 ₡"]] },
          { title: "SOURCE", rows: [["Sender", "SYSTEM"], ["Operation", label], ["Note", "Generated admin inbox test entry"]] }
        ],
        finalRows: layout === "finance-settlement" ? [["Change", "+800 ₡"], ["Debt change", "+0 ₡"], ["Remaining debt", "0 ₡"], ["Final balance", "5 000 ₡"]] : []
      };
    }

    if (type === "SUBSCRIPTION") {
      const demoSubscription = normalizeSubscriptionEntry({
        title: "Live & Prevail",
        provider: "SYSTEM",
        tierLabel: subtype === "SUBSCRIPTION_TIER_CHANGED" ? "T2 Sustain" : "T1 Live",
        amount: subtype === "SUBSCRIPTION_TIER_CHANGED" ? 450 : 250,
        status: subtype.includes("CANCEL") ? "CANCELLED" : subtype.includes("OVERDUE") || subtype.includes("FAILED") ? "OVERDUE" : "PAID",
        renewalDate: addDaysIsoLocal(demoDate, 7)
      });
      const rows = subtype === "SUBSCRIPTION_TIER_CHANGED"
        ? [["Previous tier", "T1 Live"], ["Previous weekly cost", "250 ₡"]]
        : subtype === "SUBSCRIPTION_CANCELLED"
          ? [["Charge", "450 ₡"], ["Paid from credits", "150 ₡"], ["Debt increase", "+300 ₡"], ["Credits after", "0 ₡"], ["Debt after", "300 ₡"], ["Charge rule", "Full weekly tier cost"]]
          : subtype.includes("FAILED") || subtype.includes("OVERDUE") || subtype.includes("ACTION")
            ? [["Available", "120 ₡"], ["Debt increase", "+330 ₡"], ["Action", "Restore balance before next settlement"]]
            : [];
      return {
        type,
        subtype,
        severity,
        title: label,
        layout: "record-subscription",
        tags: ["SUBSCRIPTION", getSubscriptionTagLabel(subtype, demoSubscription)],
        panels: buildSubscriptionNotificationPanels(demoSubscription, rows, { subtype })
      };
    }

    if (type === "SERVICE") {
      const commission = subtype.includes("COMMISSION") || subtype.includes("PAYOUT");
      const demoRecord = normalizeServiceRecord({
        title: commission ? "Endpoint Audit Runner" : "Factory Commons Repair Shift",
        provider: commission ? "Kagami Kaisha" : "Factory Commons",
        form: commission ? "COMMISSION" : "CONTRACT",
        category: "REGULAR",
        amount: commission ? 5800 : 4200,
        dueDate: commission ? addDaysIsoLocal(demoDate, 3) : "",
        status: subtype.includes("FAILED") ? "FAILED" : subtype.includes("COMPLETED") || subtype.includes("PAYOUT") ? "COMPLETED" : "ACTIVE",
        payoutStatus: subtype.includes("APPROVED") ? "APPROVED" : subtype.includes("REJECTED") ? "REJECTED" : subtype.includes("PAYOUT") ? "PENDING" : "NOT_READY",
        acceptedAt: demoDate,
        updatedAt: demoDate
      });
      return {
        type,
        subtype,
        severity,
        title: label,
        layout: "record-service",
        tags: getServiceTagList(subtype, demoRecord),
        panels: buildServiceNotificationPanels(demoRecord, [["Previous status", "ACTIVE"], ["Current status", demoRecord.status], ["Payout status", demoRecord.payoutStatus], ["Updated", demoDate], ["Note", "Generated admin inbox test entry"]], { subtype })
      };
    }

    if (type === "CALENDAR") {
      const demoTitle = subtype === "SERVICE_DEADLINE_WARNING"
        ? "Endpoint Audit Runner"
        : subtype === "SETTLEMENT_REMINDER"
          ? "Weekly settlement"
          : subtype === "PAYMENT_DEADLINE_WARNING"
            ? "Debt payment deadline"
            : subtype === "APPOINTMENT_REMINDER"
              ? "TRAUMA consultation"
              : label;
      const demoReminder = normalizeCalendarReminder({
        title: demoTitle,
        body: "Player-facing scheduled terminal event.",
        date: addDaysIsoLocal(demoDate, subtype === "SERVICE_DEADLINE_WARNING" ? 1 : 3),
        notifyDaysBefore: subtype.includes("DEADLINE") ? 1 : 0
      });
      const rows = subtype === "SERVICE_DEADLINE_WARNING"
        ? [["Provider", "Kagami Kaisha"], ["Form", "Commission"], ["Payout", "5 800 ₡"], ["Remaining", "1 day"], ["Consequence", "Payout may be rejected"], ["Required action", "Complete service or cancel record"], ["Target", "Service Registry"]]
        : subtype === "SETTLEMENT_REMINDER"
          ? [["Income", "+4 200 ₡"], ["Subscriptions", "-1 150 ₡"], ["Debt payment", "-500 ₡"], ["Current", "2 300 ₡"], ["Projected", "4 850 ₡"], ["Risk", "No deficit expected"], ["Window", "Monday 00:00"], ["Required action", "No action required"]]
          : subtype === "PAYMENT_DEADLINE_WARNING"
            ? [["Target", "Debt repayment"], ["Required amount", "900 ₡"], ["Current", "300 ₡"], ["Missing", "600 ₡"], ["Debt after", "1 500 ₡"], ["Required action", "Add credits before settlement"], ["Risk", "Debt may increase after deadline"]]
            : subtype === "APPOINTMENT_REMINDER"
              ? [["Provider", "TRAUMA Team"], ["Time", "09:00"], ["Node", "03.51N00E.020.109::A4.001.001"], ["Zone", "Medical access node"], ["Required action", "Attend appointment"]]
              : subtype === "DEADLINE_WARNING"
                ? [["Target", "Service review"], ["Subject", "Endpoint Audit Runner"], ["Remaining", "1 day"], ["Required action", "Review linked service record"], ["Consequence", "Record may be flagged for review"]]
                : [["Type", subtype.includes("EVENT") ? "Calendar event" : "Reminder"], ["Module", "Terminal"], ["Target", demoTitle], ["Required action", "Review scheduled item"]];
      return {
        type,
        subtype,
        severity,
        title: label,
        layout: "record-calendar",
        tags: ["CALENDAR", subtype.includes("WARNING") ? "WARNING" : subtype.includes("REMINDER") ? "REMINDER" : severity],
        panels: buildCalendarNotificationPanels(demoReminder, {
          subtype,
          rows,
          serviceTitle: "Endpoint Audit Runner",
          provider: "Kagami Kaisha",
          form: "Commission",
          payout: "5 800 ₡"
        }),
        finalRows: buildCalendarNotificationFinalRows(demoReminder, { subtype, rows })
      };
    }

    const panelByType = {
      REQUEST: [
        { title: "REQUEST", rows: [["Type", "Billing correction"], ["Submitted", demoDate], ["Status", label]] },
        { title: subtype.includes("APPROVED") || subtype.includes("DENIED") ? "DECISION" : "DETAILS", rows: [["Result", label], ["Action", subtype.includes("DATA") ? "Additional data required" : "No action required"]] }
      ],
      PROFILE: [
        { title: subtype.includes("INCOME") ? "INCOME SOURCE" : "PROFILE FIELD", rows: [["Field", subtype.includes("RISK") ? "Risk score" : subtype.includes("COMPLIANCE") ? "Compliance status" : "Citizen profile"], ["Record", "Citizen profile"], ["Source", "SYSTEM"]] },
        { title: subtype.includes("RISK") || subtype.includes("FIELD") ? "CHANGE" : "VALUE", rows: [["Previous", subtype.includes("RISK") ? "Low" : "Unassigned"], ["Current", label], ["Effect", subtype.includes("RISK") ? "Access restrictions may change" : "Record synchronized"]] }
      ],
      ACCESS: [
        { title: "ACCESS", rows: [["Scope", "Service Registry"], ["Level", subtype.includes("DENIED") ? "Restricted" : "Public"], ["Record", "Active Services"]] },
        { title: "DECISION", rows: [["Result", label], ["Reason", subtype.includes("DENIED") ? "Insufficient clearance" : "Authorization verified"], ["Action", subtype.includes("DENIED") ? "Request authorization" : "No action required"]] }
      ],
      DATABASE: [
        { title: "RECORD", rows: [["Type", subtype.includes("CASE") ? "Case file" : "Citizen file"], ["Name", "Inbox notification test"], ["Access", subtype.includes("RECLASSIFIED") ? "Confidential" : "Restricted"]] },
        { title: subtype.includes("RECLASSIFIED") ? "CLASSIFICATION" : "CHANGE", rows: [["Operation", label], ["Source", "System Registry"], ["Result", "Record synchronized"]] }
      ],
      SYSTEM: [
        { title: subtype.includes("WARNING") || subtype.includes("ERROR") || subtype.includes("RESET") ? "WARNING" : "NOTICE", rows: [["Message", label], ["Result", "Internal terminal event generated"], ["Action", subtype.includes("RESET") || subtype.includes("ERROR") ? "Operator review required" : "No action required"]] }
      ]
    };

    const layoutByType = {
      REQUEST: "record-request",
      PROFILE: "record-profile",
      ACCESS: "record-access",
      DATABASE: "record-database",
      SYSTEM: "notice-system"
    };

    return {
      type,
      subtype,
      severity,
      title: label,
      layout: layoutByType[type] || "notice-system",
      tags: [type, severity],
      panels: panelByType[type] || panelByType.SYSTEM
    };
  }

  function shouldGenerateInboxSubtype(typeDefinition = {}, subtypeDefinition = {}, mode = "PLAYER") {
    const normalizedMode = String(mode || "PLAYER").trim().toUpperCase();
    if (subtypeDefinition?.deprecated === true) return false;
    if (normalizedMode === "INTERNAL") return subtypeDefinition?.playerVisible === false;
    return subtypeDefinition?.playerVisible !== false;
  }

  window.WS_APP.generateInboxNotifications = function generateInboxNotifications(citizenId, options = {}) {
    const id = String(citizenId || "").trim();
    const citizen = window.WS_APP.getCitizenById?.(id);
    if (!id || !citizen || citizen.recordType === "admin") return { ok: false, count: 0, message: "Citizen record not found." };

    const mode = String(options.mode || "PLAYER").trim().toUpperCase() === "INTERNAL" ? "INTERNAL" : "PLAYER";
    const definitions = Array.isArray(window.APP_DATA?.inboxNotificationTypes) ? window.APP_DATA.inboxNotificationTypes : [];
    let count = 0;

    definitions.forEach((typeDefinition) => {
      const type = String(typeDefinition?.id || "").trim().toUpperCase();
      (Array.isArray(typeDefinition?.subtypes) ? typeDefinition.subtypes : []).forEach((subtypeDefinition) => {
        const subtype = String(subtypeDefinition?.id || "").trim().toUpperCase();
        if (!type || !subtype || !shouldGenerateInboxSubtype(typeDefinition, subtypeDefinition, mode)) return;
        const payload = buildDemoNotificationPayload(type, subtype, subtypeDefinition);
        const recorded = emitTerminalNotification(id, {
          ...payload,
          date: options.date || getTerminalDateIso(),
          createdBy: options.createdBy || "ADMIN",
          read: false,
          notify: true,
          audience: mode === "INTERNAL" ? "INTERNAL" : "PLAYER"
        });
        if (recorded) count += 1;
      });
    });

    const label = mode === "INTERNAL" ? "internal/admin" : "player-visible";
    return { ok: true, count, mode, message: `${count} ${label} inbox notifications generated.` };
  };

  window.WS_APP.generateAllInboxNotifications = function generateAllInboxNotifications(citizenId, options = {}) {
    return window.WS_APP.generateInboxNotifications(citizenId, options);
  };

  function normalizeServiceRequest(request = {}) {
    return {
      id: String(request?.id || makeStoreId("request")).trim(),
      citizenId: String(request?.citizenId || "").trim(),
      type: String(request?.type || "MESSAGE_TO_ADMIN").trim().toUpperCase(),
      status: String(request?.status || "PENDING").trim().toUpperCase(),
      body: String(request?.body || "").trim(),
      date: String(request?.date || getTerminalDateIso()).trim(),
      createdBy: String(request?.createdBy || window.WS_APP.currentUser?.login || "SYSTEM").trim(),
      resolvedAt: String(request?.resolvedAt || "").trim(),
      resolvedBy: String(request?.resolvedBy || "").trim(),
      resolutionNote: String(request?.resolutionNote || "").trim()
    };
  }

  function readServiceRequests() {
    return readCachedNormalizedArray(SERVICE_REQUESTS_STORAGE_KEY, normalizeServiceRequest);
  }

  function writeServiceRequests(requests) {
    const normalized = (Array.isArray(requests) ? requests : []).map(normalizeServiceRequest).slice(-300);
    clearNormalizedArrayCache(SERVICE_REQUESTS_STORAGE_KEY);
    writeStoredArray(SERVICE_REQUESTS_STORAGE_KEY, normalized);
    window.dispatchEvent(new CustomEvent("ws:service-requests-updated", { detail: { requests: clone(normalized) } }));
    return normalized;
  }

  window.WS_APP.getServiceRequests = function getServiceRequests(citizenId) {
    const id = String(citizenId || "").trim();
    return clone(readServiceRequests()
      .filter((request) => !id || request.citizenId === id)
      .sort(compareStoreRecordsByNewest));
  };

  window.WS_APP.createServiceRequest = function createServiceRequest(citizenId, data = {}) {
    const id = String(citizenId || data.citizenId || "").trim();
    const citizen = window.WS_APP.getCitizenById(id);
    if (!id || !citizen || citizen.recordType === "admin") return null;

    const request = normalizeServiceRequest({
      ...clone(data),
      id: data.id || makeStoreId("request"),
      citizenId: id,
      status: "PENDING",
      date: data.date || getTerminalDateIso()
    });

    const requests = readServiceRequests();
    requests.push(request);
    writeServiceRequests(requests);

    emitRequestNotification(id, request, {
      subtype: "REQUEST_CREATED",
      title: "System request created",
      createdBy: "SYSTEM"
    });

    return clone(request);
  };

  window.WS_APP.updateServiceRequestStatus = function updateServiceRequestStatus(citizenId, requestId, status = "CLOSED", options = {}) {
    const id = String(citizenId || "").trim();
    const target = String(requestId || "").trim();
    const nextStatus = String(status || "CLOSED").trim().toUpperCase();
    const allowed = new Set(["PENDING", "REVIEWED", "APPROVED", "DENIED", "CLOSED"]);
    if (!id || !target || !allowed.has(nextStatus)) return null;

    const note = String(options.note || "").trim();
    const actor = String(options.createdBy || window.WS_APP.currentUser?.login || "SYSTEM").trim();
    const resolvedAt = ["APPROVED", "DENIED", "CLOSED"].includes(nextStatus) ? getTerminalDateIso() : "";
    let updated = null;
    const requests = readServiceRequests().map((request) => {
      if (request.citizenId === id && request.id === target) {
        updated = normalizeServiceRequest({
          ...request,
          status: nextStatus,
          resolvedAt: resolvedAt || request.resolvedAt,
          resolvedBy: resolvedAt ? actor : request.resolvedBy,
          resolutionNote: note || request.resolutionNote
        });
        return updated;
      }
      return request;
    });

    if (!updated) return null;
    writeServiceRequests(requests);

    emitRequestNotification(id, updated, {
      subtype: getRequestSubtypeForStatus(updated.status),
      title: "System request status changed",
      note,
      createdBy: actor
    });

    return clone(updated);
  };

  window.WS_APP.deleteServiceRequest = function deleteServiceRequest(citizenId, requestId) {
    const id = String(citizenId || "").trim();
    const target = String(requestId || "").trim();
    if (!id || !target) return false;

    const openStatuses = new Set(["PENDING", "REVIEWED", "APPROVED"]);
    const requests = readServiceRequests();
    const request = requests.find((entry) => entry.citizenId === id && entry.id === target);
    if (!request || openStatuses.has(String(request.status || "").toUpperCase())) return false;

    const next = requests.filter((entry) => !(entry.citizenId === id && entry.id === target));
    writeServiceRequests(next);
    return true;
  };

  function normalizeBillingHistoryEntry(entry = {}) {
    return {
      id: String(entry?.id || makeStoreId("billing")).trim(),
      citizenId: String(entry?.citizenId || "").trim(),
      date: String(entry?.date || getTerminalDateIso()).trim(),
      createdAt: entry?.createdAt
        ? getLocalCreatedAt(entry.createdAt)
        : (extractTimestampFromStoreId(entry?.id || "") ? getLocalCreatedAt(extractTimestampFromStoreId(entry?.id || "")) : ""),
      sortIndex: resolveSortIndex(entry, entry?.id || ""),
      type: String(entry?.type || "MANUAL").trim().toUpperCase(),
      title: String(entry?.title || "").trim(),
      sourceLabel: String(entry?.sourceLabel || entry?.sender || "").trim(),
      sender: String(entry?.sender || entry?.sourceLabel || "").trim(),
      amount: parseCreditNumber(entry?.amount),
      income: parseCreditNumber(entry?.income),
      subscriptionCharge: parseCreditNumber(entry?.subscriptionCharge),
      paidFromCredits: parseCreditNumber(entry?.paidFromCredits),
      debtPayment: parseCreditNumber(entry?.debtPayment),
      debtIncrease: parseCreditNumber(entry?.debtIncrease),
      debtRecovery: parseCreditNumber(entry?.debtRecovery),
      creditsAfter: parseCreditNumber(entry?.creditsAfter),
      debtAfter: parseCreditNumber(entry?.debtAfter),
      note: String(entry?.note || "").trim(),
      counterpartyCitizenId: String(entry?.counterpartyCitizenId || "").trim(),
      paymentSource: String(entry?.paymentSource || "").trim().toUpperCase(),
      billingIntentId: String(entry?.billingIntentId || "").trim(),
      billingTransactionId: String(entry?.billingTransactionId || "").trim(),
      sourceDomain: String(entry?.sourceDomain || "").trim().toUpperCase(),
      sourceRefId: String(entry?.sourceRefId || "").trim(),
      correlationId: String(entry?.correlationId || "").trim(),
      idempotencyKey: String(entry?.idempotencyKey || "").trim(),
      revision: Math.max(1, Number(entry?.revision || 1) || 1),
      createdBy: String(entry?.createdBy || window.WS_APP.currentUser?.login || "SYSTEM").trim()
    };
  }

  function readBillingHistory() {
    return readCachedNormalizedArray(BILLING_HISTORY_STORAGE_KEY, (entry, index) => {
      const stableSortIndex = resolveSortIndex(entry, entry?.id || "") || (index + 1);
      return normalizeBillingHistoryEntry({
        ...entry,
        sortIndex: entry?.sortIndex || stableSortIndex
      });
    });
  }

  function writeBillingHistory(history) {
    const normalized = (Array.isArray(history) ? history : []).map(normalizeBillingHistoryEntry).slice(-600);
    clearNormalizedArrayCache(BILLING_HISTORY_STORAGE_KEY);
    writeStoredArray(BILLING_HISTORY_STORAGE_KEY, normalized);
    window.dispatchEvent(new CustomEvent("ws:billing-history-updated", { detail: { history: clone(normalized) } }));
    return normalized;
  }

  function addBillingHistoryEntry(citizenId, entry = {}) {
    const id = String(citizenId || entry.citizenId || "").trim();
    if (!id) return null;
    const history = readBillingHistory();
    let normalized = normalizeBillingHistoryEntry({
      ...clone(entry),
      id: entry.id || makeStoreId("billing"),
      citizenId: id,
      date: entry.date || getTerminalDateIso(),
      createdAt: entry.createdAt || getLocalCreatedAt(),
      sortIndex: entry.sortIndex || getNextSortIndex()
    });

    if (entry.__skipBillingBridge !== true && typeof window.WS_APP.recordLegacyBillingHistoryEntry === "function") {
      const bridgeResult = window.WS_APP.recordLegacyBillingHistoryEntry(normalized);
      const transaction = bridgeResult?.billingTransaction;
      if (bridgeResult?.ok && transaction?.billingTransactionId) {
        normalized = normalizeBillingHistoryEntry({
          ...normalized,
          billingIntentId: transaction.billingIntentId || normalized.billingIntentId,
          billingTransactionId: transaction.billingTransactionId,
          sourceDomain: transaction.sourceDomain || normalized.sourceDomain,
          sourceRefId: transaction.sourceRefId || normalized.sourceRefId,
          correlationId: transaction.correlationId || normalized.correlationId,
          idempotencyKey: transaction.idempotencyKey || normalized.idempotencyKey,
          revision: transaction.revision || normalized.revision
        });
      }
    }

    history.push(normalized);
    writeBillingHistory(history);
    return clone(normalized);
  }

  window.WS_APP.addBillingHistoryEntry = addBillingHistoryEntry;

  window.WS_APP.getBillingHistory = function getBillingHistory(citizenId) {
    const id = String(citizenId || "").trim();
    return clone(readBillingHistory()
      .filter((entry) => !id || entry.citizenId === id)
      .sort(compareStoreRecordsByNewest));
  };

  window.WS_APP.clearBillingHistory = function clearBillingHistory(citizenId) {
    const id = String(citizenId || "").trim();
    if (!id) return false;
    const next = readBillingHistory().filter((entry) => entry.citizenId !== id);
    writeBillingHistory(next);
    emitBillingNotification(id, {
      subtype: "LEDGER_CLEARED",
      severity: "NOTICE",
      title: "Transaction ledger cleared",
      layout: "notice-system",
      panels: createPanelList(buildNotificationPanel("BILLING", [
        ["Ledger", "Cleared from terminal view"]
      ])),
      createdBy: window.WS_APP.currentUser?.login || "SYSTEM"
    });
    return true;
  };

  function hasSettlementBillingHistory(citizenOrId, settlementDateIso) {
    const citizenId = typeof citizenOrId === "string"
      ? String(citizenOrId || "").trim()
      : String(citizenOrId?.id || "").trim();
    const citizen = typeof citizenOrId === "string"
      ? (window.WS_APP.getCitizenById?.(citizenId) || null)
      : citizenOrId;
    const citizenSettlementLog = Array.isArray(citizen?.subscriptionBillingLog)
      ? citizen.subscriptionBillingLog
      : [];
    const alreadyLoggedOnCitizen = citizenSettlementLog.some((entry) => (
      String(entry?.date || "").trim() === settlementDateIso &&
      String(entry?.type || "").toUpperCase() === "WEEKLY_SUBSCRIPTION_SETTLEMENT"
    ));
    if (alreadyLoggedOnCitizen) return true;

    return readBillingHistory().some((entry) => (
      entry.citizenId === citizenId &&
      entry.date === settlementDateIso &&
      entry.type === "WEEKLY_SETTLEMENT"
    ));
  }

  function isIncomePayableInSettlement(income = {}, settlementDateIso = "") {
    if (income.status !== "ACTIVE" || income.cycle !== "WEEKLY") return false;
    if (!income.oneTime) return true;
    return !String(income.lastSettlementAt || "").trim();
  }

  function getWeeklyIncomeSources(citizen = {}, settlementDateIso = window.WS_APP.getSettlementPeriodEndIso?.() || "") {
    const serviceSync = syncIncomeWithServiceLog(citizen.income, citizen.serviceLog);
    return normalizeIncome(serviceSync.income)
      .filter((income) => isIncomePayableInSettlement(income, settlementDateIso));
  }

  function getWeeklyIncomeTotal(citizen = {}, settlementDateIso = window.WS_APP.getSettlementPeriodEndIso?.() || "") {
    return getWeeklyIncomeSources(citizen, settlementDateIso)
      .reduce((sum, income) => sum + parseCreditNumber(income.amount), 0);
  }

  function getWeeklyAdditionalCreditTotal(citizenId = "", settlementDateIso = "") {
    const id = String(citizenId || "").trim();
    const endIso = String(settlementDateIso || "").trim();
    if (!id || !isIsoDate(endIso)) return 0;

    const startIso = addDaysIsoLocal(endIso, -7);
    return readBillingHistory().reduce((sum, entry) => {
      if (String(entry?.citizenId || "").trim() !== id) return sum;
      const entryDate = String(entry?.date || "").trim();
      if (!entryDate || entryDate <= startIso || entryDate > endIso) return sum;

      const type = String(entry?.type || "").trim().toUpperCase();
      const amount = parseCreditNumber(entry?.amount);
      if (type === "TRANSFER_IN") return sum + Math.max(0, amount);
      if (type === "ADMIN_ADJUSTMENT" && amount > 0) return sum + amount;
      return sum;
    }, 0);
  }


  function getServicePaymentDisplayStatus(record = {}) {
    const form = normalizeServiceForm(record.form || record.serviceForm || record.type);
    const status = normalizeFinancialStatus(record.status, "ACTIVE");
    const payoutStatus = normalizeServicePayoutStatus(record, form);
    if (form !== "COMMISSION") return "";
    if (payoutStatus === "SETTLED" || String(record.payoutSettledAt || "").trim()) return "PAID";
    if (["REJECTED", "CANCELLED", "FORFEITED"].includes(payoutStatus) || ["FAILED", "TERMINATED", "ARCHIVED"].includes(status)) return "CANCELLED";
    if (status === "COMPLETED" || ["READY_FOR_SETTLEMENT", "APPROVED", "PENDING"].includes(payoutStatus)) return "READY_FOR_SETTLEMENT";
    if (status === "ACTIVE" || payoutStatus === "PENDING_COMPLETION") return "PENDING_COMPLETION";
    return "";
  }

  function isPendingServicePaymentRecord(record = {}) {
    const form = normalizeServiceForm(record.form || record.serviceForm || record.type);
    if (form !== "COMMISSION") return false;
    const amount = parseCreditNumber(record.amount ?? record.payment);
    if (amount <= 0) return false;
    return ["PENDING_COMPLETION", "READY_FOR_SETTLEMENT"].includes(getServicePaymentDisplayStatus(record));
  }

  function buildPendingServicePayment(record = {}) {
    const paymentStatus = getServicePaymentDisplayStatus(record);
    return {
      id: `pending-${String(record.id || record.generatedOfferId || record.offerId || "service").trim()}`,
      serviceRecordId: String(record.id || "").trim(),
      generatedOfferId: String(record.generatedOfferId || record.offerId || "").trim(),
      templateId: String(record.templateId || "").trim(),
      title: String(record.title || "Service Payment").trim(),
      provider: String(record.provider || "LOCAL SERVICE REGISTRY").trim(),
      providerClass: String(record.providerClass || record.employerType || "").trim(),
      amount: parseCreditNumber(record.amount ?? record.payment),
      currency: "ENCODED_CREDIT",
      payoutMode: "ON_COMPLETION",
      paymentStatus,
      serviceStatus: normalizeFinancialStatus(record.status, "ACTIVE"),
      serviceForm: normalizeServiceForm(record.form || record.serviceForm || record.type),
      serviceCategory: normalizeServiceCategory(record.category || record.serviceCategory),
      typeLabel: String(record.typeLabel || getServiceTypeLabel(record.category || record.serviceCategory, record.form || record.serviceForm || record.type)).trim(),
      details: String(record.details || record.description || "").trim(),
      acceptedAt: String(record.acceptedAt || record.startedAt || record.createdAt || "").trim(),
      completedAt: String(record.completedAt || "").trim(),
      dueDate: String(record.dueDate || record.deadline || "").trim(),
      settlementWeek: String(record.settlementWeek || "").trim(),
      payoutStatusRaw: normalizeServicePayoutStatus(record, record.form || record.serviceForm || record.type),
      serviceIncomeId: String(record.serviceIncomeId || "").trim()
    };
  }

  function getPendingServicePayments(citizen = {}) {
    return normalizeServiceLog(citizen.serviceLog || [])
      .filter(isPendingServicePaymentRecord)
      .map(buildPendingServicePayment);
  }

  window.WS_APP.getCitizenPendingServicePayments = function getCitizenPendingServicePayments(citizenOrId) {
    const citizen = typeof citizenOrId === "string" ? window.WS_APP.getCitizenById(citizenOrId) : citizenOrId;
    return clone(getPendingServicePayments(citizen || {}));
  };

  window.WS_APP.getCitizenWeeklyIncomeTotal = function getCitizenWeeklyIncomeTotal(citizenOrId, settlementDateIso) {
    const citizen = typeof citizenOrId === "string" ? window.WS_APP.getCitizenById(citizenOrId) : citizenOrId;
    return getWeeklyIncomeTotal(citizen || {}, settlementDateIso);
  };

  window.WS_APP.getCitizenWeeklyIncomeSources = function getCitizenWeeklyIncomeSources(citizenOrId, settlementDateIso) {
    const citizen = typeof citizenOrId === "string" ? window.WS_APP.getCitizenById(citizenOrId) : citizenOrId;
    return clone(getWeeklyIncomeSources(citizen || {}, settlementDateIso));
  };

  function calculateSubscriptionSettlementPaymentPlan(subscriptions = [], creditsAfterIncome = 0, debtBefore = 0, settlementDateIso = "") {
    let credits = parseCreditNumber(creditsAfterIncome);
    let debt = parseCreditNumber(debtBefore);
    let totalDue = 0;
    let paidFromCredits = 0;
    let debtIncrease = 0;
    let chargedSubscriptions = 0;
    let overdueSubscriptions = 0;
    const subscriptionPayments = [];

    normalizeSubscriptions(subscriptions).forEach((subscription) => {
      if (!isAutoBillableSubscription(subscription, settlementDateIso)) return;

      const amount = parseCreditNumber(subscription.amount);
      const creditPayment = Math.min(credits, amount);
      const settlementDebtIncrease = Math.max(0, amount - creditPayment);
      const paidInFull = amount > 0;

      totalDue += amount;
      chargedSubscriptions += 1;
      credits -= creditPayment;
      debt += settlementDebtIncrease;
      paidFromCredits += creditPayment;
      debtIncrease += settlementDebtIncrease;

      subscriptionPayments.push({
        id: subscription.id,
        amount,
        paidInFull,
        paidFromCredits: creditPayment,
        debtIncrease: settlementDebtIncrease,
        status: paidInFull ? "PAID" : "PENDING"
      });
    });

    return {
      creditsAfterSubscriptions: credits,
      debtAfterSubscriptions: debt,
      debtCapacityAfterSubscriptions: Math.max(0, BILLING_DEBT_ACCOUNT_LIMIT - debt),
      totalDue,
      paidFromCredits,
      debtIncrease,
      chargedSubscriptions,
      overdueSubscriptions,
      subscriptionPayments,
      debtLimit: BILLING_DEBT_ACCOUNT_LIMIT
    };
  }

  function getSettlementPreviewForCitizen(citizenOrId, options = {}) {
    const citizen = typeof citizenOrId === "string" ? window.WS_APP.getCitizenById(citizenOrId) : citizenOrId;
    if (!citizen || citizen.recordType === "admin") return null;

    const settlementDateIso = String(options.settlementDateIso || window.WS_APP.getSettlementPeriodEndIso?.() || "").trim();
    const subscriptions = normalizeSubscriptions(citizen.subscriptions);
    const billableSubscriptions = subscriptions.filter((subscription) => isAutoBillableSubscription(subscription, settlementDateIso));
    const creditsBefore = parseCreditNumber(citizen.credits);
    const debtBefore = parseCreditNumber(citizen.debt);
    const income = getWeeklyIncomeTotal(citizen, settlementDateIso);
    const creditsAfterIncome = creditsBefore + income;
    const paymentPlan = calculateSubscriptionSettlementPaymentPlan(subscriptions, creditsAfterIncome, debtBefore, settlementDateIso);
    const debtRecovery = Math.min(paymentPlan.creditsAfterSubscriptions, paymentPlan.debtAfterSubscriptions);
    const finalCredits = Math.max(0, paymentPlan.creditsAfterSubscriptions - debtRecovery);
    const finalDebt = Math.max(0, paymentPlan.debtAfterSubscriptions - debtRecovery);

    return {
      citizenId: citizen.id,
      settlementDateIso,
      creditsBefore,
      debtBefore,
      income,
      subscriptionCharge: paymentPlan.totalDue,
      billableSubscriptions: clone(billableSubscriptions),
      chargedSubscriptions: paymentPlan.chargedSubscriptions,
      overdueSubscriptions: paymentPlan.overdueSubscriptions,
      paidFromCredits: paymentPlan.paidFromCredits,
      debtIncrease: paymentPlan.debtIncrease,
      debtLimit: paymentPlan.debtLimit,
      debtCapacityAfterSubscriptions: paymentPlan.debtCapacityAfterSubscriptions,
      debtRecovery,
      finalCredits,
      finalDebt,
      status: paymentPlan.overdueSubscriptions > 0 ? "OVERDUE" : paymentPlan.debtIncrease > 0 ? "DEFICIT" : debtRecovery > 0 ? "DEBT_RECOVERY" : "CLEAR"
    };
  }

  window.WS_APP.previewWeeklySettlement = function previewWeeklySettlement(citizenOrId, options = {}) {
    return clone(getSettlementPreviewForCitizen(citizenOrId, options));
  };

  window.WS_APP.addCitizenIncomeSource = function addCitizenIncomeSource(citizenId, data = {}) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    if (!citizen || citizen.recordType === "admin") return null;
    if (!String(data.serviceRecordId || "").trim()) return null;

    const title = String(data.title || data.name || "Income Source").trim();
    const entry = normalizeIncomeEntry({
      id: data.id || makeStoreId("income-source"),
      title,
      provider: String(data.provider || "LOCAL LEDGER").trim(),
      amount: data.amount,
      cycle: String(data.cycle || "WEEKLY").trim().toUpperCase(),
      status: normalizeFinancialStatus(data.status, "ACTIVE"),
      reference: data.reference || data.contractRef || "",
      details: data.details || data.description || "",
      terms: data.terms || "",
      createdBy: data.createdBy || window.WS_APP.currentUser?.login || "SYSTEM",
      updatedAt: getTerminalDateIso()
    });

    if (!entry.title || entry.amount <= 0) return null;

    const income = normalizeIncome(citizen.income);
    income.push(entry);
    const updated = window.WS_APP.updateCitizen(citizenId, { income }, { source: "SERVICE_STORE" });

    emitProfileNotification(citizenId, {
      subtype: "INCOME_SOURCE_REGISTERED",
      title: "Income source registered",
      layout: "record-profile",
      panels: createPanelList(buildNotificationPanel("INCOME SOURCE", [
        ["Source", entry.title],
        ["Provider", entry.provider || "LOCAL LEDGER"],
        ["Amount", `${formatCreditLabel(entry.amount)} / ${entry.cycle}`],
        ["Status", entry.status]
      ])),
      links: [{ label: "OPEN BILLING", module: "terminal-hub", panel: "billing" }],
      createdBy: "SYSTEM"
    });

    return updated;
  };

  window.WS_APP.updateCitizenIncomeSource = function updateCitizenIncomeSource(citizenId, incomeSourceId, patch = {}) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    const sourceId = String(incomeSourceId || "").trim();
    if (!citizen || citizen.recordType === "admin" || !sourceId) return null;

    let changed = false;
    const income = normalizeIncome(citizen.income).map((entry) => {
      if (entry.id !== sourceId) return entry;
      changed = true;
      return normalizeIncomeEntry({
        ...entry,
        ...patch,
        id: entry.id,
        updatedAt: getTerminalDateIso()
      });
    });

    if (!changed) return null;
    const updated = window.WS_APP.updateCitizen(citizenId, { income }, { source: "SERVICE_STORE" });

    const source = normalizeIncome(updated?.income).find((entry) => entry.id === sourceId) || { id: sourceId };
    emitProfileNotification(citizenId, {
      subtype: "INCOME_SOURCE_UPDATED",
      title: "Income source updated",
      layout: "record-profile",
      panels: createPanelList(buildNotificationPanel("INCOME SOURCE", [
        ["Source", source.title || sourceId],
        ["Status", source.status || "-"],
        ["Amount", source.amount !== undefined ? `${formatCreditLabel(source.amount)} / ${source.cycle || "WEEKLY"}` : "-"]
      ])),
      links: [{ label: "OPEN BILLING", module: "terminal-hub", panel: "billing" }],
      createdBy: "SYSTEM"
    });

    return updated;
  };

  window.WS_APP.setCitizenIncomeSourceStatus = function setCitizenIncomeSourceStatus(citizenId, incomeSourceId, status = "ACTIVE") {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    const sourceId = String(incomeSourceId || "").trim();
    if (!citizen || citizen.recordType === "admin" || !sourceId) return null;

    const requestedStatus = normalizeFinancialStatus(status, "ACTIVE");
    const nextStatus = requestedStatus === "TERMINATED" ? "ARCHIVED" : requestedStatus;
    const nowIso = getTerminalDateIso();
    let changed = false;
    const income = normalizeIncome(citizen.income).map((entry) => {
      if (entry.id !== sourceId) return entry;
      changed = true;
      return normalizeIncomeEntry({
        ...entry,
        status: nextStatus,
        archivedAt: nextStatus === "ARCHIVED" ? (entry.archivedAt || nowIso) : "",
        updatedAt: nowIso
      });
    });
    if (!changed) return null;
    const updated = window.WS_APP.updateCitizen(citizenId, { income }, { source: "SERVICE_STORE" });

    const source = normalizeIncome(updated?.income).find((entry) => entry.id === sourceId) || { id: sourceId, status: nextStatus };
    emitProfileNotification(citizenId, {
      subtype: nextStatus === "ARCHIVED" ? "INCOME_SOURCE_ARCHIVED" : "INCOME_SOURCE_UPDATED",
      title: nextStatus === "ARCHIVED" ? "Income source archived" : "Income source status changed",
      layout: "record-profile",
      panels: createPanelList(buildNotificationPanel("INCOME SOURCE", [
        ["Source", source.title || sourceId],
        ["Status", nextStatus]
      ])),
      links: [{ label: "OPEN BILLING", module: "terminal-hub", panel: "billing" }],
      createdBy: "SYSTEM"
    });

    return updated;
  };

  window.WS_APP.deleteArchivedCitizenIncomeSource = function deleteArchivedCitizenIncomeSource(citizenId, incomeSourceId) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    const sourceId = String(incomeSourceId || "").trim();
    if (!citizen || citizen.recordType === "admin" || !sourceId) return null;

    const current = normalizeIncome(citizen.income);
    const target = current.find((entry) => entry.id === sourceId);
    if (!target || !["ARCHIVED", "TERMINATED"].includes(String(target.status || "").toUpperCase())) return null;

    const income = current.filter((entry) => entry.id !== sourceId);
    const updated = window.WS_APP.updateCitizen(citizenId, { income }, { source: "SERVICE_STORE" });

    emitProfileNotification(citizenId, {
      subtype: "INCOME_SOURCE_REMOVED",
      title: "Archived income source removed",
      layout: "record-profile",
      panels: createPanelList(buildNotificationPanel("INCOME SOURCE", [
        ["Source", target.title || sourceId],
        ["Record state", "Removed from local file"]
      ])),
      links: [{ label: "OPEN BILLING", module: "terminal-hub", panel: "billing" }],
      createdBy: "SYSTEM"
    });

    return updated;
  };

  function readServiceOffers() {
    return readCachedNormalizedArray(SERVICE_OFFERS_STORAGE_KEY, (offer, index) => normalizeServiceOffer(offer, index), { filterBoolean: true });
  }

  function writeServiceOffers(value) {
    clearNormalizedArrayCache(SERVICE_OFFERS_STORAGE_KEY);
    writeStoredArray(SERVICE_OFFERS_STORAGE_KEY, normalizeServiceOffers(value));
  }

  window.WS_APP.getServiceOffers = function getServiceOffers() {
    return clone(readServiceOffers().filter((offer) => !["ARCHIVED", "DELETED"].includes(offer.status)));
  };

  window.WS_APP.addServiceOffer = function addServiceOffer(data = {}) {
    const offer = normalizeServiceOffer({
      ...data,
      id: data.id || makeStoreId("service-offer"),
      status: data.status || "AVAILABLE",
      createdAt: data.createdAt || getTerminalDateIso(),
      createdBy: data.createdBy || window.WS_APP.currentUser?.login || "ADMIN"
    });
    if (!offer.title || offer.amount <= 0) return null;
    if (offer.form === "CONTRACT" && offer.durationWeeks <= 0) return null;
    if (offer.form === "COMMISSION" && !offer.dueDate) return null;
    const offers = readServiceOffers();
    offers.push(offer);
    writeServiceOffers(offers);
    return clone(offer);
  };

  window.WS_APP.getCitizenServiceLog = function getCitizenServiceLog(citizenOrId) {
    const citizen = typeof citizenOrId === "string" ? window.WS_APP.getCitizenById(citizenOrId) : citizenOrId;
    return clone(normalizeServiceLog(citizen?.serviceLog || []));
  };

  window.WS_APP.addCitizenServiceLogEntry = function addCitizenServiceLogEntry(citizenId, data = {}) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    if (!citizen || citizen.recordType === "admin") return null;
    const record = normalizeServiceRecord({
      ...data,
      id: data.id || makeStoreId("service-record"),
      status: data.status || "ACTIVE",
      acceptedAt: data.acceptedAt || getTerminalDateIso(),
      createdBy: data.createdBy || window.WS_APP.currentUser?.login || "ADMIN"
    });
    if (!record.title || record.amount < 0) return null;
    const serviceLog = normalizeServiceLog(citizen.serviceLog);
    serviceLog.unshift(record);
    return window.WS_APP.updateCitizen(citizenId, { serviceLog }, { source: "SERVICE_STORE" });
  };

  window.WS_APP.acceptCitizenServiceOffer = function acceptCitizenServiceOffer(citizenId, offerData = {}) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    if (!citizen || citizen.recordType === "admin") return null;
    const offer = normalizeServiceOffer(offerData);
    if (!offer.title || offer.amount <= 0 || offer.status === "ARCHIVED") return null;
    const recordId = makeStoreId("service-record");
    const serviceLog = normalizeServiceLog(citizen.serviceLog);
    const record = normalizeServiceRecord({
      id: recordId,
      offerId: offer.id,
      generatedOfferId: offer.generatedOfferId || offer.id,
      templateId: offer.templateId,
      employerId: offer.employerId,
      providerId: offer.providerId || offer.employerId,
      organizationId: offer.organizationId || "",
      employerType: offer.employerType || offer.providerClass,
      categoryId: offer.categoryId,
      subcategoryId: offer.subcategoryId,
      workCharacterId: offer.workCharacterId,
      settlementWeek: offer.settlementWeek,
      sourceType: offer.sourceType || "GENERATED_WEEKLY",
      title: offer.title,
      provider: offer.provider,
      providerClass: offer.providerClass,
      category: offer.category,
      form: offer.form,
      typeLabel: offer.typeLabel,
      status: "ACTIVE",
      amount: offer.amount,
      cycle: offer.cycle,
      durationWeeks: offer.form === "CONTRACT" ? offer.durationWeeks : 0,
      durationType: offer.durationType,
      dueDate: offer.dueDate,
      details: offer.details,
      acceptedAt: getTerminalDateIso(),
      createdBy: window.WS_APP.currentUser?.login || "SYSTEM",
      payoutStatus: normalizeServiceForm(offer.form) === "COMMISSION" ? "PENDING_COMPLETION" : ""
    });
    const income = normalizeIncome(citizen.income);
    if (record.form !== "COMMISSION") {
      const incomeEntry = normalizeIncomeEntry({
        id: makeStoreId("income-source"),
        title: record.title,
        provider: record.provider,
        amount: record.amount,
        cycle: "WEEKLY",
        status: "ACTIVE",
        reference: record.typeLabel,
        details: record.details,
        terms: record.durationType,
        serviceRecordId: record.id,
        generatedOfferId: record.generatedOfferId || record.offerId || "",
        templateId: record.templateId || "",
        serviceForm: record.form,
        serviceCategory: record.category,
        oneTime: false,
        createdBy: record.createdBy,
        updatedAt: getTerminalDateIso()
      });
      record.serviceIncomeId = incomeEntry.id;
      income.push(incomeEntry);
    }
    serviceLog.unshift(record);
    const serviceOfferStates = upsertServiceOfferState(citizen.serviceOfferStates, {
      generatedOfferId: record.generatedOfferId || record.offerId || offer.id,
      offerId: record.offerId || offer.id,
      templateId: record.templateId || offer.templateId,
      employerId: record.employerId || offer.employerId,
      providerId: record.providerId || offer.providerId || record.employerId || offer.employerId,
      organizationId: record.organizationId || offer.organizationId || "",
      employerType: record.employerType || offer.employerType,
      categoryId: record.categoryId || offer.categoryId,
      workCharacterId: record.workCharacterId || offer.workCharacterId,
      settlementWeek: record.settlementWeek || offer.settlementWeek,
      sourceType: record.sourceType || offer.sourceType || "GENERATED_WEEKLY",
      status: "ACTIVE",
      title: record.title,
      provider: record.provider,
      serviceRecordId: record.id,
      incomeSourceId: record.serviceIncomeId || "",
      reason: "Accepted by citizen",
      updatedAt: getTerminalDateIso(),
      updatedBy: record.createdBy
    });
    const updated = window.WS_APP.updateCitizen(citizenId, { serviceLog, income, serviceOfferStates }, { source: "SERVICE_STORE" });
    emitServiceNotification(citizenId, record, {
      subtype: "SERVICE_ACCEPTED",
      title: "Service accepted",
      createdBy: "SYSTEM"
    });
    return updated;
  };

  function getCitizenServiceRecordInternal(citizenOrId, recordId = "") {
    const citizen = typeof citizenOrId === "string" ? window.WS_APP.getCitizenById(citizenOrId) : citizenOrId;
    const id = String(recordId || "").trim();
    if (!citizen || citizen.recordType === "admin" || !id) return { citizen: null, record: null };
    const record = normalizeServiceLog(citizen.serviceLog).find((entry) => entry.id === id) || null;
    return { citizen, record };
  }

  window.WS_APP.getCitizenServiceRecord = function getCitizenServiceRecord(citizenOrId, recordId = "") {
    const { record } = getCitizenServiceRecordInternal(citizenOrId, recordId);
    return record ? clone(record) : null;
  };

  window.WS_APP.getCitizenServiceAllowedTransitions = function getCitizenServiceAllowedTransitions(citizenOrId, recordId = "") {
    const { record } = getCitizenServiceRecordInternal(citizenOrId, recordId);
    return record ? serviceLogLifecycle.getAllowedTransitions(record.status) : [];
  };

  window.WS_APP.previewCitizenServiceTransition = function previewCitizenServiceTransition(citizenId, recordId, status = "ACTIVE", options = {}) {
    const { citizen, record } = getCitizenServiceRecordInternal(citizenId, recordId);
    const rawStatus = String(status || "").trim().toUpperCase();
    if (!citizen) return { ok: false, status: "FAILED", resultCode: "SERVICE_LOG_CITIZEN_NOT_FOUND", reason: "SERVICE_LOG_CITIZEN_NOT_FOUND" };
    if (!record) return { ok: false, status: "FAILED", resultCode: "SERVICE_LOG_RECORD_NOT_FOUND", reason: "SERVICE_LOG_RECORD_NOT_FOUND" };
    if (!serviceLogLifecycle.statuses.includes(rawStatus)) {
      return {
        ok: false,
        status: "FAILED",
        resultCode: "SERVICE_LOG_STATUS_INVALID",
        reason: "SERVICE_LOG_STATUS_INVALID",
        record: clone(record),
        requestedStatus: rawStatus,
        allowedTransitions: serviceLogLifecycle.getAllowedTransitions(record.status)
      };
    }

    const idempotencyKey = String(options.idempotencyKey || "").trim();
    const replayEntry = idempotencyKey
      ? (record.lifecycleHistory || []).find((entry) => String(entry?.idempotencyKey || "") === idempotencyKey)
      : null;
    if (replayEntry) {
      const replayStatus = serviceLogLifecycle.normalizeStatus(replayEntry.toStatus);
      if (replayStatus !== rawStatus) {
        return {
          ok: false,
          status: "FAILED",
          resultCode: "SERVICE_LOG_IDEMPOTENCY_CONFLICT",
          reason: "SERVICE_LOG_IDEMPOTENCY_CONFLICT",
          replayed: false,
          changed: false,
          record: clone(record),
          previousStatus: replayEntry.fromStatus || record.status,
          nextStatus: rawStatus,
          revisionBefore: Number(replayEntry.revisionBefore || Math.max(1, Number(record.revision || 1) - 1)),
          revisionAfter: Number(replayEntry.revisionAfter || record.revision || 1),
          allowedTransitions: serviceLogLifecycle.getAllowedTransitions(record.status)
        };
      }
      return {
        ok: true,
        status: "SUCCEEDED",
        resultCode: String(replayEntry.resultCode || `SERVICE_LOG_TRANSITION_${replayStatus}`),
        reason: String(replayEntry.resultCode || `SERVICE_LOG_TRANSITION_${replayStatus}`),
        replayed: true,
        changed: false,
        record: clone(record),
        previousStatus: replayEntry.fromStatus || record.status,
        nextStatus: replayStatus,
        revisionBefore: Number(replayEntry.revisionBefore || Math.max(1, Number(record.revision || 1) - 1)),
        revisionAfter: Number(replayEntry.revisionAfter || record.revision || 1),
        allowedTransitions: serviceLogLifecycle.getAllowedTransitions(record.status)
      };
    }

    const expectedRevision = Number(options.expectedRevision);
    if (Number.isFinite(expectedRevision) && expectedRevision > 0 && expectedRevision !== Number(record.revision || 1)) {
      return {
        ok: false,
        status: "FAILED",
        resultCode: "SERVICE_LOG_REVISION_CONFLICT",
        reason: "SERVICE_LOG_REVISION_CONFLICT",
        record: clone(record),
        expectedRevision,
        actualRevision: Number(record.revision || 1),
        allowedTransitions: serviceLogLifecycle.getAllowedTransitions(record.status)
      };
    }

    const previousStatus = serviceLogLifecycle.normalizeStatus(record.status);
    const nextStatus = serviceLogLifecycle.normalizeStatus(rawStatus);
    if (previousStatus === nextStatus) {
      return {
        ok: true,
        status: "SUCCEEDED",
        resultCode: "SERVICE_LOG_STATUS_UNCHANGED",
        reason: "SERVICE_LOG_STATUS_UNCHANGED",
        replayed: false,
        changed: false,
        record: clone(record),
        previousStatus,
        nextStatus,
        revisionBefore: Number(record.revision || 1),
        revisionAfter: Number(record.revision || 1),
        allowedTransitions: serviceLogLifecycle.getAllowedTransitions(previousStatus)
      };
    }

    if (!serviceLogLifecycle.canTransition(previousStatus, nextStatus)) {
      return {
        ok: false,
        status: "FAILED",
        resultCode: "SERVICE_LOG_TRANSITION_INVALID",
        reason: "SERVICE_LOG_TRANSITION_INVALID",
        record: clone(record),
        previousStatus,
        nextStatus,
        revisionBefore: Number(record.revision || 1),
        revisionAfter: Number(record.revision || 1),
        allowedTransitions: serviceLogLifecycle.getAllowedTransitions(previousStatus)
      };
    }

    return {
      ok: true,
      status: "READY",
      resultCode: "SERVICE_LOG_TRANSITION_ALLOWED",
      reason: "SERVICE_LOG_TRANSITION_ALLOWED",
      replayed: false,
      changed: true,
      record: clone(record),
      previousStatus,
      nextStatus,
      revisionBefore: Number(record.revision || 1),
      revisionAfter: Number(record.revision || 1) + 1,
      allowedTransitions: serviceLogLifecycle.getAllowedTransitions(previousStatus)
    };
  };

  window.WS_APP.transitionCitizenServiceRecord = function transitionCitizenServiceRecord(citizenId, recordId, status = "ACTIVE", options = {}) {
    const preview = window.WS_APP.previewCitizenServiceTransition(citizenId, recordId, status, options);
    if (!preview.ok || preview.replayed || preview.changed === false) return preview;

    const citizen = window.WS_APP.getCitizenById(citizenId);
    const id = String(recordId || "").trim();
    const nextStatus = preview.nextStatus;
    const previousStatus = preview.previousStatus;
    const nowIso = getTerminalDateIso();
    const actor = String(options.createdBy || options.actorId || window.WS_APP.currentUser?.login || "SYSTEM").trim();
    const source = String(options.source || "SERVICE_STORE").trim().toUpperCase();
    const reason = String(options.reason || options.note || "").trim();
    const idempotencyKey = String(options.idempotencyKey || "").trim();
    const correlationId = String(options.correlationId || `service-log:${citizenId}:${id}:${preview.revisionAfter}`).trim();
    const completionMode = String(options.completionMode || options.mode || (nextStatus === "COMPLETED" ? "MANUAL_COMPLETION" : "LIFECYCLE_TRANSITION")).trim().toUpperCase();
    let targetRecord = null;
    let awardedExperience = [];

    const serviceLog = normalizeServiceLog(citizen.serviceLog).map((record) => {
      if (record.id !== id) return record;
      targetRecord = record;
      const isCommission = normalizeServiceForm(record.form) === "COMMISSION";
      const isCompletedCommission = isCommission && nextStatus === "COMPLETED";
      const isFailedCommission = isCommission && ["FAILED", "TERMINATED"].includes(nextStatus);
      const experienceGain = getServiceExperienceGainFromRecord(record);
      const shouldGrantExperience = nextStatus === "COMPLETED" && previousStatus !== "COMPLETED" && !record.experienceGrantedAt && experienceGain.length > 0;
      if (shouldGrantExperience) awardedExperience = experienceGain;
      const lifecycleHistory = [
        ...(Array.isArray(record.lifecycleHistory) ? record.lifecycleHistory : []),
        {
          transitionId: `service-transition-${citizenId}-${id}-${preview.revisionAfter}`,
          fromStatus: previousStatus,
          toStatus: nextStatus,
          resultCode: `SERVICE_LOG_TRANSITION_${nextStatus}`,
          revisionBefore: preview.revisionBefore,
          revisionAfter: preview.revisionAfter,
          changedAt: nowIso,
          changedBy: actor,
          reason,
          source,
          idempotencyKey,
          correlationId
        }
      ];

      return normalizeServiceRecord({
        ...record,
        status: nextStatus,
        revision: Number(record.revision || 1) + 1,
        lifecycleHistory,
        lifecycleNote: reason || record.lifecycleNote,
        result: ["COMPLETED", "FAILED", "TERMINATED"].includes(nextStatus) ? nextStatus : record.result,
        completedAt: nextStatus === "COMPLETED" ? (record.completedAt || nowIso) : record.completedAt,
        completedBy: nextStatus === "COMPLETED" ? (record.completedBy || actor) : record.completedBy,
        completionMode: nextStatus === "COMPLETED" ? completionMode : record.completionMode,
        suspendedAt: nextStatus === "SUSPENDED" ? nowIso : record.suspendedAt,
        failedAt: nextStatus === "FAILED" ? nowIso : record.failedAt,
        terminatedAt: nextStatus === "TERMINATED" ? nowIso : record.terminatedAt,
        payoutStatus: isCompletedCommission
          ? (normalizeServicePayoutStatus(record, record.form) === "SETTLED"
            ? "SETTLED"
            : String(record.payoutStatus || "").trim().toUpperCase() === "APPROVED"
              ? "APPROVED"
              : "READY_FOR_SETTLEMENT")
          : isFailedCommission
            ? (normalizeServicePayoutStatus(record, record.form) === "SETTLED" ? "SETTLED" : "REJECTED")
            : record.payoutStatus,
        payoutUpdatedAt: isCommission && nextStatus !== "ARCHIVED" ? nowIso : record.payoutUpdatedAt,
        payoutUpdatedBy: isCommission && nextStatus !== "ARCHIVED" ? actor : record.payoutUpdatedBy,
        archivedAt: nextStatus === "ARCHIVED" ? (record.archivedAt || nowIso) : record.archivedAt,
        updatedAt: nowIso,
        rewards: {
          ...(record.rewards || {}),
          experienceGain
        },
        experienceGain,
        experienceGrantedAt: shouldGrantExperience ? nowIso : record.experienceGrantedAt,
        experienceGrantedBy: shouldGrantExperience ? actor : record.experienceGrantedBy
      });
    });

    if (!targetRecord) {
      return { ok: false, status: "FAILED", resultCode: "SERVICE_LOG_RECORD_NOT_FOUND", reason: "SERVICE_LOG_RECORD_NOT_FOUND" };
    }

    const currentExperience = normalizeServiceExperience(citizen.serviceExperience || citizen.serviceCategoryExperience || citizen.experience || {});
    const serviceExperience = awardedExperience.length
      ? mergeServiceExperienceGain(currentExperience, awardedExperience)
      : currentExperience;

    const offerStatus = ["COMPLETED", "FAILED", "TERMINATED", "ARCHIVED"].includes(nextStatus) ? nextStatus : nextStatus === "SUSPENDED" ? "ACTIVE" : nextStatus;
    let serviceOfferStates = citizen.serviceOfferStates;
    serviceOfferStates = upsertServiceOfferState(serviceOfferStates, {
      generatedOfferId: targetRecord.generatedOfferId || targetRecord.offerId || targetRecord.id,
      offerId: targetRecord.offerId || targetRecord.generatedOfferId || "",
      templateId: targetRecord.templateId || "",
      employerId: targetRecord.employerId || "",
      providerId: targetRecord.providerId || targetRecord.employerId || "",
      organizationId: targetRecord.organizationId || "",
      employerType: targetRecord.employerType || targetRecord.providerClass || "",
      categoryId: targetRecord.categoryId || "",
      workCharacterId: targetRecord.workCharacterId || "",
      settlementWeek: targetRecord.settlementWeek || "",
      sourceType: targetRecord.sourceType || "GENERATED_WEEKLY",
      status: offerStatus,
      title: targetRecord.title || "Service Record",
      provider: targetRecord.provider || "LOCAL SERVICE REGISTRY",
      serviceRecordId: targetRecord.id || "",
      incomeSourceId: targetRecord.serviceIncomeId || "",
      reason: reason || `Service ${offerStatus.toLowerCase()}`,
      updatedAt: nowIso,
      updatedBy: actor
    });

    let serviceReputation = normalizeServiceReputation(citizen.serviceReputation || citizen.serviceEmployerReputation || {});
    if (targetRecord.employerId) {
      if (nextStatus === "COMPLETED" && previousStatus !== "COMPLETED") {
        serviceReputation = applyServiceReputationDelta(serviceReputation, targetRecord.employerId, 1, "completed", nowIso);
      } else if (["FAILED", "TERMINATED"].includes(nextStatus) && !["FAILED", "TERMINATED"].includes(previousStatus)) {
        serviceReputation = applyServiceReputationDelta(serviceReputation, targetRecord.employerId, -2, "failed", nowIso);
      }
    }

    const updated = window.WS_APP.updateCitizen(citizenId, {
      serviceLog,
      serviceExperience,
      serviceCategoryExperience: serviceExperience,
      serviceOfferStates,
      serviceReputation,
      serviceEmployerReputation: serviceReputation
    }, { source: "SERVICE_STORE" });

    if (!updated) {
      return {
        ok: false,
        status: "FAILED",
        resultCode: "SERVICE_LOG_TRANSITION_SAVE_FAILED",
        reason: "SERVICE_LOG_TRANSITION_SAVE_FAILED",
        previousStatus,
        nextStatus,
        revisionBefore: preview.revisionBefore,
        revisionAfter: preview.revisionBefore,
        correlationId,
        idempotencyKey
      };
    }

    const nextRecord = normalizeServiceLog(updated.serviceLog || serviceLog).find((record) => record.id === id) || null;
    emitServiceNotification(citizenId, nextRecord || { ...targetRecord, status: nextStatus }, {
      subtype: getServiceSubtypeForStatus(nextStatus),
      title: "Service lifecycle changed",
      rows: [
        ["Record domain", "CITIZEN SERVICE LOG"],
        ["Previous status", previousStatus],
        ["Current status", nextStatus],
        ["Result", nextRecord?.result || "-"],
        ["Payout status", nextRecord?.payoutStatus || "-"],
        ["Experience", formatServiceExperienceGainLabel(awardedExperience) || "-"],
        ["Reason", reason || "-"],
        ["Updated", nextRecord?.updatedAt || nowIso]
      ],
      createdBy: actor
    });

    return {
      ok: true,
      status: "SUCCEEDED",
      resultCode: `SERVICE_LOG_TRANSITION_${nextStatus}`,
      reason: `SERVICE_LOG_TRANSITION_${nextStatus}`,
      replayed: false,
      changed: true,
      citizen: clone(updated),
      record: clone(nextRecord),
      recordId: id,
      citizenId,
      previousStatus,
      nextStatus,
      revisionBefore: preview.revisionBefore,
      revisionAfter: preview.revisionAfter,
      correlationId,
      idempotencyKey,
      allowedTransitions: serviceLogLifecycle.getAllowedTransitions(nextStatus)
    };
  };

  window.WS_APP.setCitizenServiceStatus = function setCitizenServiceStatus(citizenId, recordId, status = "ACTIVE", options = {}) {
    const result = window.WS_APP.transitionCitizenServiceRecord(citizenId, recordId, status, options);
    if (options.returnResult === true) return result;
    return result?.ok ? (result.citizen || window.WS_APP.getCitizenById(citizenId)) : null;
  };

  window.WS_APP.completeActiveService = function completeActiveService(citizenId, recordId, options = {}) {
    return window.WS_APP.setCitizenServiceStatus?.(citizenId, recordId, "COMPLETED", {
      ...options,
      completionMode: options.completionMode || options.mode || "MANUAL_COMPLETION"
    });
  };

  window.WS_APP.rejectCitizenServiceOffer = function rejectCitizenServiceOffer(citizenId, offerData = {}, options = {}) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    if (!citizen || citizen.recordType === "admin") return null;
    const offer = normalizeServiceOffer(offerData);
    const key = offer.generatedOfferId || offer.id;
    if (!key || ["ACTIVE", "COMPLETED", "ARCHIVED"].includes(offer.status)) return null;
    const nowIso = getTerminalDateIso();
    const actor = String(options.createdBy || window.WS_APP.currentUser?.login || "SYSTEM").trim();
    const serviceOfferStates = upsertServiceOfferState(citizen.serviceOfferStates, {
      generatedOfferId: key,
      offerId: offer.id,
      templateId: offer.templateId,
      employerId: offer.employerId,
      providerId: offer.providerId || offer.employerId,
      organizationId: offer.organizationId || "",
      employerType: offer.employerType || offer.providerClass,
      categoryId: offer.categoryId,
      workCharacterId: offer.workCharacterId,
      settlementWeek: offer.settlementWeek,
      sourceType: offer.sourceType || "GENERATED_WEEKLY",
      status: "REJECTED",
      title: offer.title,
      provider: offer.provider,
      reason: options.reason || "Rejected by citizen",
      updatedAt: nowIso,
      updatedBy: actor
    });
    let serviceReputation = normalizeServiceReputation(citizen.serviceReputation || citizen.serviceEmployerReputation || {});
    if (offer.employerId) serviceReputation = applyServiceReputationDelta(serviceReputation, offer.employerId, -1, "rejected", nowIso);
    const updated = window.WS_APP.updateCitizen(citizenId, {
      serviceOfferStates,
      serviceReputation,
      serviceEmployerReputation: serviceReputation
    }, { source: "SERVICE_STORE" });
    emitServiceNotification(citizenId, { ...offer, status: "REJECTED" }, {
      subtype: "SERVICE_OFFER_REJECTED",
      title: "Service offer rejected",
      rows: [
        ["Offer", offer.title || key],
        ["Provider", offer.provider || "-"],
        ["Settlement week", offer.settlementWeek || "-"],
        ["Reputation", offer.employerId ? "-1" : "-"]
      ],
      createdBy: "SYSTEM"
    });
    return updated;
  };

  window.WS_APP.syncCitizenServiceMarketOffers = function syncCitizenServiceMarketOffers(citizenId, offers = [], currentSettlementWeek = "", options = {}) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    if (!citizen || citizen.recordType === "admin") return null;
    const nowIso = getTerminalDateIso();
    const settlementWeek = String(currentSettlementWeek || window.WS_APP.getSettlementPeriodEndIso?.() || window.WS_APP.SETTLEMENT_PERIOD_END_ISO || "").trim();
    let changed = false;
    let states = normalizeServiceOfferStates(citizen.serviceOfferStates || {});

    Object.entries(states).forEach(([key, state]) => {
      if (!["AVAILABLE", "LOCKED", "HIDDEN"].includes(state.status)) return;
      if (!["GENERATED_WEEKLY", "SYSTEM_MANDATORY", "BLACK_EVENT"].includes(state.sourceType)) return;
      if (settlementWeek && state.settlementWeek && state.settlementWeek !== settlementWeek) {
        states[key] = normalizeServiceOfferState({
          ...state,
          status: "EXPIRED",
          reason: "Settlement week elapsed",
          updatedAt: nowIso,
          updatedBy: "SYSTEM"
        }, key);
        changed = true;
      }
    });

    (Array.isArray(offers) ? offers : []).forEach((rawOffer) => {
      const offer = normalizeServiceOffer(rawOffer);
      const key = offer.generatedOfferId || offer.id;
      if (!key || ["ACTIVE", "COMPLETED", "REJECTED", "EXPIRED", "ARCHIVED"].includes(states[key]?.status)) return;
      const nextStatus = ["AVAILABLE", "LOCKED", "HIDDEN"].includes(offer.status) ? offer.status : "AVAILABLE";
      const previous = states[key] || {};
      states[key] = normalizeServiceOfferState({
        ...previous,
        generatedOfferId: key,
        offerId: offer.id,
        templateId: offer.templateId,
        employerId: offer.employerId,
        employerType: offer.employerType || offer.providerClass,
        categoryId: offer.categoryId,
        workCharacterId: offer.workCharacterId,
        settlementWeek: offer.settlementWeek || settlementWeek,
        sourceType: offer.sourceType || (offer.category === "MANDATORY" ? "SYSTEM_MANDATORY" : "GENERATED_WEEKLY"),
        status: nextStatus,
        title: offer.title,
        provider: offer.provider,
        reason: offer.lifecycleNote || previous.reason || "Generated for settlement week",
        updatedAt: previous.updatedAt || nowIso,
        updatedBy: previous.updatedBy || "SYSTEM"
      }, key);
      if (!previous.generatedOfferId || previous.status !== nextStatus) changed = true;
    });

    if (!changed) return null;
    return window.WS_APP.updateCitizen(citizenId, { serviceOfferStates: states }, {
      source: "SERVICE_STORE",
      skipModuleRefresh: options.skipModuleRefresh === true,
      skipProfileRefresh: options.skipProfileRefresh === true
    });
  };


  window.WS_APP.getCitizenServiceOfferStates = function getCitizenServiceOfferStates(citizenOrId) {
    const citizen = typeof citizenOrId === "string" ? window.WS_APP.getCitizenById(citizenOrId) : citizenOrId;
    return clone(normalizeServiceOfferStates(citizen?.serviceOfferStates || {}));
  };

  window.WS_APP.setCitizenServiceOfferState = function setCitizenServiceOfferState(citizenId, offerState = {}, options = {}) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    if (!citizen || citizen.recordType === "admin") return null;
    const key = String(offerState.generatedOfferId || offerState.offerId || offerState.id || offerState.templateId || "").trim();
    if (!key) return null;
    const actor = String(options.createdBy || window.WS_APP.currentUser?.login || "ADMIN").trim();
    const nowIso = getTerminalDateIso();
    const state = upsertServiceOfferState(citizen.serviceOfferStates || {}, {
      ...offerState,
      generatedOfferId: key,
      offerId: offerState.offerId || key,
      sourceType: offerState.sourceType || offerState.source || "GENERATED_WEEKLY",
      status: offerState.status || "AVAILABLE",
      reason: offerState.reason || options.reason || "Admin service offer state override",
      updatedAt: nowIso,
      updatedBy: actor
    });
    return window.WS_APP.updateCitizen(citizenId, { serviceOfferStates: state }, { source: "SERVICE_STORE" });
  };

  window.WS_APP.clearCitizenWeeklyServiceOfferStates = function clearCitizenWeeklyServiceOfferStates(citizenId, options = {}) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    if (!citizen || citizen.recordType === "admin") return null;
    const settlementWeek = String(options.settlementWeek || window.ServiceOfferGenerator?.getSettlementWeekKey?.() || window.WS_APP.getSettlementPeriodEndIso?.() || "").trim();
    const removableSources = new Set(["GENERATED_WEEKLY", "SYSTEM_MANDATORY", "BLACK_EVENT"]);
    const protectedStatuses = new Set(["ACTIVE", "COMPLETED", "FAILED", "TERMINATED", "ARCHIVED"]);
    const current = normalizeServiceOfferStates(citizen.serviceOfferStates || {});
    let changed = false;
    const next = {};
    Object.entries(current).forEach(([key, state]) => {
      const sourceType = String(state.sourceType || "GENERATED_WEEKLY").trim().toUpperCase();
      const status = normalizeFinancialStatus(state.status || "AVAILABLE", "AVAILABLE");
      const sameWeek = !settlementWeek || !state.settlementWeek || String(state.settlementWeek) === settlementWeek;
      if (sameWeek && removableSources.has(sourceType) && !protectedStatuses.has(status)) {
        changed = true;
        return;
      }
      next[key] = state;
    });
    if (!changed) return null;
    return window.WS_APP.updateCitizen(citizenId, { serviceOfferStates: next }, { source: "SERVICE_STORE" });
  };

  window.WS_APP.setCitizenServiceEmployerReputation = function setCitizenServiceEmployerReputation(citizenId, employerId, value = 0, options = {}) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    const id = String(employerId || "").trim();
    if (!citizen || citizen.recordType === "admin" || !id) return null;
    const mode = String(options.mode || "SET").trim().toUpperCase();
    const actor = String(options.createdBy || window.WS_APP.currentUser?.login || "ADMIN").trim();
    const nowIso = getTerminalDateIso();
    let serviceReputation = normalizeServiceReputation(citizen.serviceReputation || citizen.serviceEmployerReputation || {});
    if (mode === "CHANGE") {
      serviceReputation = applyServiceReputationDelta(serviceReputation, id, parseCreditNumber(value), "admin", nowIso);
    } else {
      const score = Math.max(-10, Math.min(10, parseCreditNumber(value)));
      serviceReputation[id] = {
        ...(serviceReputation[id] || {}),
        score,
        updatedAt: nowIso,
        updatedBy: actor
      };
    }
    return window.WS_APP.updateCitizen(citizenId, {
      serviceReputation,
      serviceEmployerReputation: serviceReputation
    }, { source: "SERVICE_STORE" });
  };

  window.WS_APP.updateCitizenServicePayout = function updateCitizenServicePayout(citizenId, recordId, action = "APPROVE", options = {}) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    const id = String(recordId || "").trim();
    if (!citizen || citizen.recordType === "admin" || !id) return null;

    const nextAction = String(action || "APPROVE").trim().toUpperCase();
    if (!["APPROVE", "REJECT", "PENDING"].includes(nextAction)) return null;

    const nowIso = getTerminalDateIso();
    const actor = String(options.createdBy || window.WS_APP.currentUser?.login || "ADMIN").trim();
    const note = String(options.note || "").trim();
    const income = normalizeIncome(citizen.income);
    let changed = false;
    let targetRecord = null;
    let incomeEntry = null;
    let blockedReason = "";
    let blockedIncomeId = "";

    const upsertIncome = (entry) => {
      const normalized = normalizeIncomeEntry(entry);
      const index = income.findIndex((item) => item.id === normalized.id || (normalized.serviceRecordId && item.serviceRecordId === normalized.serviceRecordId));
      if (index >= 0) income[index] = normalized;
      else income.push(normalized);
      return normalized;
    };

    const serviceLog = normalizeServiceLog(citizen.serviceLog).map((record) => {
      if (record.id !== id) return record;
      const form = normalizeServiceForm(record.form);
      const status = normalizeFinancialStatus(record.status, "ACTIVE");
      const amount = parseCreditNumber(record.amount);
      if (form !== "COMMISSION" || status !== "COMPLETED" || amount <= 0) return record;

      const linkedIncome = (record.serviceIncomeId && income.find((entry) => entry.id === record.serviceIncomeId))
        || income.find((entry) => entry.serviceRecordId === record.id)
        || null;
      const settledAt = String(record.payoutSettledAt || linkedIncome?.lastSettlementAt || "").trim();
      const payoutStatus = normalizeServicePayoutStatus(record, form);

      changed = true;
      targetRecord = record;

      if (payoutStatus === "SETTLED" || settledAt) {
        blockedReason = "PAYOUT_ALREADY_SETTLED";
        blockedIncomeId = linkedIncome?.id || record.serviceIncomeId || "";
        return normalizeServiceRecord({
          ...record,
          serviceIncomeId: blockedIncomeId || record.serviceIncomeId,
          payoutStatus: "SETTLED",
          payoutSettledAt: settledAt || record.payoutSettledAt,
          payoutSettledBy: record.payoutSettledBy || linkedIncome?.updatedBy || linkedIncome?.createdBy || "SYSTEM",
          payoutUpdatedAt: record.payoutUpdatedAt || settledAt || nowIso,
          payoutUpdatedBy: record.payoutUpdatedBy || record.payoutSettledBy || "SYSTEM",
          updatedAt: record.updatedAt || nowIso
        });
      }

      if (nextAction === "APPROVE") {
        incomeEntry = upsertIncome(buildIncomeFromServiceRecord(record, linkedIncome, { oneTime: true }));
        incomeEntry = upsertIncome({
          ...incomeEntry,
          status: "ACTIVE",
          archivedAt: "",
          details: note || incomeEntry.details || "Admin-approved one-time service commission queued for weekly settlement.",
          updatedAt: nowIso
        });
        return normalizeServiceRecord({
          ...record,
          serviceIncomeId: incomeEntry.id,
          payoutStatus: "APPROVED",
          payoutNote: note,
          payoutApprovedAt: nowIso,
          payoutApprovedBy: actor,
          payoutUpdatedAt: nowIso,
          payoutUpdatedBy: actor,
          updatedAt: nowIso
        });
      }

      if (linkedIncome) {
        upsertIncome({
          ...linkedIncome,
          status: "ARCHIVED",
          archivedAt: linkedIncome.archivedAt || nowIso,
          updatedAt: nowIso
        });
      }

      return normalizeServiceRecord({
        ...record,
        payoutStatus: nextAction === "REJECT" ? "REJECTED" : "PENDING",
        payoutNote: note,
        payoutRejectedAt: nextAction === "REJECT" ? nowIso : record.payoutRejectedAt,
        payoutRejectedBy: nextAction === "REJECT" ? actor : record.payoutRejectedBy,
        payoutUpdatedAt: nowIso,
        payoutUpdatedBy: actor,
        updatedAt: nowIso
      });
    });

    if (!changed || !targetRecord) return null;

    const updated = window.WS_APP.updateCitizen(citizenId, { serviceLog, income }, { source: "SERVICE_STORE" });
    if (blockedReason) {
      return {
        ok: false,
        reason: blockedReason,
        citizen: updated,
        recordId: id,
        action: nextAction,
        incomeId: blockedIncomeId,
        payoutStatus: "SETTLED"
      };
    }

    const payoutRecord = normalizeServiceLog(updated?.serviceLog || serviceLog).find((record) => record.id === id) || targetRecord;
    emitServiceNotification(citizenId, payoutRecord, {
      subtype: nextAction === "APPROVE" ? "COMMISSION_PAYOUT_APPROVED" : nextAction === "REJECT" ? "COMMISSION_PAYOUT_REJECTED" : "COMMISSION_PAYOUT_PENDING",
      title: nextAction === "APPROVE" ? "Commission payout approved" : nextAction === "REJECT" ? "Commission payout rejected" : "Commission payout pending",
      rows: [
        ["Payout action", nextAction],
        ["Payout", formatCreditLabel(payoutRecord.amount || targetRecord.amount)],
        ["Payout status", payoutRecord.payoutStatus || "-"],
        ["Income source", incomeEntry?.title || "-"],
        ["Note", note || "-"]
      ],
      createdBy: actor
    });

    return {
      ok: true,
      citizen: updated,
      recordId: id,
      action: nextAction,
      incomeId: incomeEntry?.id || "",
      payoutStatus: nextAction === "APPROVE" ? "APPROVED" : nextAction === "REJECT" ? "REJECTED" : "PENDING"
    };
  };



  window.WS_APP.setCitizenServiceStatuses = function setCitizenServiceStatuses(citizenId, recordIds = [], status = "ACTIVE", options = {}) {
    const ids = Array.from(new Set((Array.isArray(recordIds) ? recordIds : [recordIds])
      .map((id) => String(id || "").trim())
      .filter(Boolean)));
    if (!ids.length) return null;
    const results = [];
    const failures = [];
    ids.forEach((id) => {
      const baseKey = String(options.idempotencyKey || "").trim();
      const result = window.WS_APP.transitionCitizenServiceRecord?.(citizenId, id, status, {
        ...options,
        idempotencyKey: baseKey ? `${baseKey}:${id}` : ""
      });
      if (result?.ok) results.push(result);
      else failures.push({ recordId: id, resultCode: result?.resultCode || result?.reason || "SERVICE_LOG_TRANSITION_FAILED" });
    });
    if (!results.length) return { ok: false, count: 0, failures, results: [] };
    return {
      ok: failures.length === 0,
      partial: failures.length > 0,
      count: results.filter((result) => result.changed !== false).length,
      failures,
      results,
      citizen: clone(results.at(-1)?.citizen || window.WS_APP.getCitizenById(citizenId))
    };
  };

  window.WS_APP.deleteCitizenServiceLogEntry = function deleteCitizenServiceLogEntry(citizenId, recordId) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    const id = String(recordId || "").trim();
    if (!citizen || citizen.recordType === "admin" || !id) return null;
    const serviceLog = normalizeServiceLog(citizen.serviceLog);
    const target = serviceLog.find((record) => record.id === id);
    if (!target) return null;
    const linkedIncomeIds = new Set([String(target.serviceIncomeId || "").trim()].filter(Boolean));
    const nextServiceLog = serviceLog.filter((record) => record.id !== id);
    const income = normalizeIncome(citizen.income).filter((entry) => {
      const linkedRecord = String(entry.serviceRecordId || "").trim() === id;
      const linkedIncome = linkedIncomeIds.has(String(entry.id || "").trim());
      return !linkedRecord && !linkedIncome;
    });
    const updated = window.WS_APP.updateCitizen(citizenId, { serviceLog: nextServiceLog, income }, { source: "SERVICE_STORE" });
    emitServiceNotification(citizenId, { ...target, status: "TERMINATED" }, {
      subtype: "SERVICE_RECORD_REMOVED",
      title: "Service record removed",
      rows: [["Record state", "Removed from local file"]],
      createdBy: "SYSTEM"
    });
    return updated;
  };


  window.WS_APP.deleteCitizenServiceLogEntries = function deleteCitizenServiceLogEntries(citizenId, recordIds = []) {
    const ids = Array.from(new Set((Array.isArray(recordIds) ? recordIds : [recordIds])
      .map((id) => String(id || "").trim())
      .filter(Boolean)));
    if (!ids.length) return null;
    let updated = null;
    let deleted = 0;
    ids.forEach((id) => {
      const result = window.WS_APP.deleteCitizenServiceLogEntry?.(citizenId, id);
      if (result) {
        updated = result;
        deleted += 1;
      }
    });
    return deleted ? { ok: true, count: deleted, citizen: clone(updated) } : null;
  };

  window.WS_APP.payCitizenDebt = function payCitizenDebt(citizenId, amount, options = {}) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    if (!citizen || citizen.recordType === "admin") return { ok: false, reason: "NO_CITIZEN" };

    const requested = parseCreditNumber(amount);
    const credits = parseCreditNumber(citizen.credits);
    const debt = parseCreditNumber(citizen.debt);
    const paid = Math.min(requested, credits, debt);

    if (requested <= 0 || paid <= 0 || debt <= 0) {
      return { ok: false, reason: debt <= 0 ? "NO_DEBT" : "INVALID_AMOUNT", credits, debt };
    }

    if (requested > credits) {
      return { ok: false, reason: "INSUFFICIENT_CREDITS", credits, debt, missing: requested - credits };
    }

    const creditsAfter = credits - paid;
    const debtAfter = debt - paid;
    const updated = window.WS_APP.updateCitizen(citizenId, {
      credits: creditsAfter,
      debt: formatCreditLabel(debtAfter)
    }, { source: "BILLING_LEGACY" });

    const debtPaymentNote = String(options.note || "Debt payment through Terminal Billing.").trim();

    addBillingHistoryEntry(citizenId, {
      type: "DEBT_PAYMENT",
      amount: paid,
      debtPayment: paid,
      creditsAfter,
      debtAfter,
      note: debtPaymentNote,
      createdBy: options.createdBy || window.WS_APP.currentUser?.login || "SYSTEM"
    });

    emitBillingNotification(citizenId, {
      subtype: "DEBT_PAYMENT",
      severity: "INFO",
      title: "Debt payment completed",
      layout: "finance-debt",
      panels: [
        { title: "DEBT PAYMENT", rows: [
          { label: "Debt", value: formatCreditLabel(debt) },
          { label: "Change", value: formatChangeCreditLabel(debtAfter - debt) },
          { label: "Current debt", value: formatCreditLabel(debtAfter) }
        ] },
        { title: "ACCOUNT", rows: buildFinanceAccountRows(credits, creditsAfter) }
      ],
      createdBy: "SYSTEM"
    });

    return { ok: true, citizen: updated, amount: paid, creditsAfter, debtAfter };
  };

  window.WS_APP.chargeCitizenDebt = function chargeCitizenDebt(citizenId, amount, options = {}) {
    const citizen = window.WS_APP.getCitizenById(citizenId);
    if (!citizen || citizen.recordType === "admin") return { ok: false, reason: "NO_CITIZEN" };

    const requested = parseCreditNumber(amount);
    const debtStatus = getDebtAccountStatus(citizen);
    if (requested <= 0) return { ok: false, reason: "INVALID_AMOUNT", ...debtStatus };
    if (requested > debtStatus.capacity) {
      return {
        ok: false,
        reason: "DEBT_LIMIT_EXCEEDED",
        amount: requested,
        missing: requested - debtStatus.capacity,
        ...debtStatus
      };
    }

    const debtAfter = debtStatus.debt + requested;
    const updated = window.WS_APP.updateCitizen(citizenId, { debt: formatCreditLabel(debtAfter) }, { source: "BILLING_LEGACY" });
    if (!updated) return { ok: false, reason: "UPDATE_FAILED", amount: requested, ...debtStatus };

    const note = String(options.note || "Charge transferred to Debt Account.").trim();
    const creditsAfter = parseCreditNumber(updated.credits);
    addBillingHistoryEntry(citizenId, {
      type: options.type || "DEBT_ACCOUNT_CHARGE",
      amount: requested,
      paymentSource: "DEBT_ACCOUNT",
      debtIncrease: requested,
      creditsAfter,
      debtAfter,
      note,
      createdBy: options.createdBy || window.WS_APP.currentUser?.login || "SYSTEM"
    });

    return {
      ok: true,
      citizen: updated,
      amount: requested,
      paymentSource: "DEBT_ACCOUNT",
      debtBefore: debtStatus.debt,
      debtAfter,
      debtIncrease: requested,
      debtLimit: debtStatus.limit,
      debtCapacityAfter: Math.max(0, debtStatus.limit - debtAfter),
      creditsAfter
    };
  };

  window.WS_APP.transferCitizenCredits = function transferCitizenCredits(fromCitizenId, toCitizenId, amount, options = {}) {
    const from = window.WS_APP.getCitizenById(fromCitizenId);
    const to = window.WS_APP.getCitizenById(toCitizenId);
    const value = parseCreditNumber(amount);

    if (!from || !to || from.recordType === "admin" || to.recordType === "admin") return { ok: false, reason: "NO_CITIZEN" };
    if (from.id === to.id) return { ok: false, reason: "SAME_CITIZEN" };
    if (value <= 0) return { ok: false, reason: "INVALID_AMOUNT" };

    const fromCredits = parseCreditNumber(from.credits);
    const toCredits = parseCreditNumber(to.credits);
    if (fromCredits < value) return { ok: false, reason: "INSUFFICIENT_CREDITS", credits: fromCredits, missing: value - fromCredits };

    const fromAfter = fromCredits - value;
    const toAfter = toCredits + value;
    const note = String(options.note || "Terminal credit transfer.").trim();
    const createdBy = options.createdBy || window.WS_APP.currentUser?.login || "SYSTEM";

    const updatedFrom = window.WS_APP.updateCitizen(from.id, { credits: fromAfter }, { source: "BILLING_TRANSFER" });
    const updatedTo = window.WS_APP.updateCitizen(to.id, { credits: toAfter }, { source: "BILLING_TRANSFER" });

    addBillingHistoryEntry(from.id, {
      type: "TRANSFER_OUT",
      amount: value,
      paidFromCredits: value,
      creditsAfter: fromAfter,
      debtAfter: parseCreditNumber(from.debt),
      counterpartyCitizenId: to.id,
      note,
      createdBy
    });

    addBillingHistoryEntry(to.id, {
      type: "TRANSFER_IN",
      amount: value,
      creditsAfter: toAfter,
      debtAfter: parseCreditNumber(to.debt),
      counterpartyCitizenId: from.id,
      note,
      createdBy
    });

    emitBillingNotification(from.id, {
      subtype: "CREDIT_TRANSFER_OUT",
      severity: "INFO",
      title: "Outgoing transfer",
      layout: "finance-transfer",
      panels: [
        { title: "TRANSFER", rows: [
          { label: "Recipient", value: to.legalName || to.shortId || to.id },
          { label: "Operation", value: "Credits transfer" },
          { label: "Amount", value: formatSignedCreditLabel(-value) },
          { label: "Note", value: normalizeFinanceNoteValue(note || "-") }
        ] },
        { title: "ACCOUNT", rows: buildFinanceAccountRows(fromCredits, fromAfter) }
      ],
      createdBy: "SYSTEM"
    });

    emitBillingNotification(to.id, {
      subtype: "CREDIT_TRANSFER_IN",
      severity: "INFO",
      title: "Incoming transfer",
      layout: "finance-transfer",
      panels: [
        { title: "TRANSFER", rows: [
          { label: "Sender", value: from.legalName || from.shortId || from.id },
          { label: "Operation", value: "Credits transfer" },
          { label: "Amount", value: formatCreditLabel(value) },
          { label: "Note", value: normalizeFinanceNoteValue(note || "-") }
        ] },
        { title: "ACCOUNT", rows: buildFinanceAccountRows(toCredits, toAfter) }
      ],
      createdBy: "SYSTEM"
    });

    return { ok: true, from: updatedFrom, to: updatedTo, amount: value, fromAfter, toAfter };
  };



  function isAutoBillableSubscription(subscription = {}, settlementDateIso = "") {
    const status = String(subscription.status || "PENDING").trim().toUpperCase();
    if (status === "CANCELLED") return false;
    if (subscription.lastSettlementAt === settlementDateIso || subscription.lastBilledAt === settlementDateIso) return false;
    return parseCreditNumber(subscription.amount) > 0;
  }




  function addBillingPeriod(date, cycle) {
    const next = new Date(date.getTime());
    const normalizedCycle = String(cycle || "WEEKLY").trim().toUpperCase();

    if (normalizedCycle === "MONTHLY") {
      next.setUTCMonth(next.getUTCMonth() + 1);
    } else if (normalizedCycle === "CONTRACT") {
      next.setUTCDate(next.getUTCDate() + 30);
    } else {
      next.setUTCDate(next.getUTCDate() + 7);
    }

    return next.toISOString().slice(0, 10);
  }





  const createCitizenSubscriptionAdapter = window.WS_APP.createCitizenSubscriptionAdapter;
  if (typeof createCitizenSubscriptionAdapter !== "function") {
    throw new Error("Citizen Subscription Adapter factory must load before js/store.js.");
  }

  const citizenSubscriptionAdapter = createCitizenSubscriptionAdapter({
    clone,
    normalizeSubscriptions,
    normalizeSubscriptionEntry,
    getSubscriptionContractKey,
    isSubscriptionContractOpen,
    parseCreditNumber,
    formatCreditLabel,
    formatChangeCreditLabel,
    normalizeBillingPaymentSource,
    getDebtAccountStatus,
    addBillingHistoryEntry,
    emitSubscriptionTerminalEntry,
    emitBillingNotification,
    emitTerminalNotification,
    createPanelList,
    buildNotificationPanel,
    buildFinanceAccountRows,
    getSubscriptionSubtypeForStatus,
    getSubscriptionStatusLabel,
    getAlignedSubscriptionPeriodEndIso,
    getTerminalDateIso,
    addDaysIsoLocal,
    isAutoBillableSubscription,
    hasSettlementBillingHistory,
    getWeeklyIncomeSources,
    calculateSubscriptionSettlementPaymentPlan,
    getWeeklyAdditionalCreditTotal,
    normalizeIncome,
    normalizeIncomeEntry,
    normalizeServiceLog,
    normalizeServiceForm,
    normalizeServiceRecord,
    normalizeCitizen,
    getCitizenStore: () => citizenStore,
    replaceCitizenStore: (nextCitizens) => {
      if (!Array.isArray(nextCitizens)) throw new TypeError("Citizen Subscription Adapter returned an invalid Citizen Store snapshot.");
      citizenStore = nextCitizens;
      return citizenStore;
    },
    saveCitizenStore: () => window.WS_APP.saveCitizenStore?.(),
    emitCitizenUpdate,
    billingDebtAccountLimit: BILLING_DEBT_ACCOUNT_LIMIT
  });

  const subscriptionStoreCommands = Object.freeze({
    addCitizenSubscription: citizenSubscriptionAdapter.addCitizenSubscription,
    updateCitizenSubscription: citizenSubscriptionAdapter.updateCitizenSubscription,
    cancelCitizenSubscription: citizenSubscriptionAdapter.cancelCitizenSubscription,
    removeCitizenSubscription: citizenSubscriptionAdapter.deleteCitizenSubscription,
    clearCancelledCitizenSubscriptions: citizenSubscriptionAdapter.clearCancelledCitizenSubscriptions,
    payCitizenSubscriptions: citizenSubscriptionAdapter.payCitizenSubscriptions,
    processWeeklySubscriptionSettlement: citizenSubscriptionAdapter.processWeeklySubscriptionSettlement,
    updateCitizen: window.WS_APP.updateCitizen
  });

  window.WS_APP.SUBSCRIPTION_MUTATION_BOUNDARY_VERSION = "subscriptions_command_boundary_3_1x";
  Object.defineProperty(window.WS_APP, "__subscriptionStoreCommands", {
    value: subscriptionStoreCommands,
    configurable: false,
    enumerable: false,
    writable: false
  });

  [
    "addCitizenSubscription",
    "updateCitizenSubscription",
    "cancelCitizenSubscription",
    "deleteCitizenSubscription",
    "clearCancelledCitizenSubscriptions",
    "payCitizenSubscriptions",
    "processWeeklySubscriptionSettlement"
  ].forEach((name) => {
    try {
      delete window.WS_APP[name];
    } catch (error) {
      console.warn(`W&S could not hide internal Subscription store command: ${name}`, error);
    }
  });

  window.addEventListener?.("pagehide", flushScheduledCitizenStorePersistence);
  document.addEventListener?.("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushScheduledCitizenStorePersistence();
  });

  window.WS_APP.saveCitizenStore = function saveCitizenStore() {
    rebuildCitizenStoreCache();
    writeStoredCitizens(citizenStore);
  };

  window.WS_APP.resetCitizenStore = function resetCitizenStore() {
    cancelScheduledCitizenStorePersistence();
    citizenStorePersistenceDirty = false;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("W&S citizen store could not clear localStorage.", error);
    }

    setCitizenStore(readBaseCitizens());
    window.WS_APP.resetItemInstanceStore?.();
    emitCitizenUpdate({ reset: true });
    return window.WS_APP.getCitizens();
  };

  window.WS_APP.exportCitizens = function exportCitizens() {
    return JSON.stringify(serializeCitizensForPersistence(citizenStore), null, 2);
  };

  window.WS_APP.downloadCitizensExport = function downloadCitizensExport(filename = "citizens-export.json") {
    const blob = new Blob([window.WS_APP.exportCitizens()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  window.WS_APP.importCitizens = function importCitizens(citizens) {
    if (!Array.isArray(citizens)) return null;
    const normalized = normalizeCitizens(citizens);
    const ids = new Set();
    const shortIds = new Set();
    const idNumbers = new Set();
    for (const citizen of normalized) {
      if (!citizen.id || ids.has(citizen.id)) return null;
      ids.add(citizen.id);
      const shortId = String(citizen.shortId || "").trim().toUpperCase();
      const idNumber = String(citizen.idNumber || "").trim().toUpperCase();
      if (shortId && shortIds.has(shortId)) return null;
      if (idNumber && idNumbers.has(idNumber)) return null;
      if (shortId) shortIds.add(shortId);
      if (idNumber) idNumbers.add(idNumber);
    }
    setCitizenStore(normalized);
    window.WS_APP.saveCitizenStore();
    emitCitizenUpdate({ import: true, source: "CITIZEN_IMPORT" });
    return window.WS_APP.getCitizens({ includeArchived: true });
  };


  window.WS_APP.exportTerminalRuntimeData = function exportTerminalRuntimeData() {
    return {
      terminalEntries: readTerminalEntries(),
      serviceRequests: readServiceRequests(),
      billingHistory: readBillingHistory(),
      billingIntents: window.WS_APP.getBillingIntents?.() || [],
      billingTransactions: window.WS_APP.getBillingTransactions?.() || [],
      calendarReminders: readCalendarReminders()
    };
  };

  window.WS_APP.importServiceRequests = function importServiceRequests(requests) {
    if (!Array.isArray(requests)) return null;
    const normalized = requests.map(normalizeServiceRequest).filter((request) => request.citizenId && request.id);
    writeServiceRequests(normalized);
    return clone(normalized);
  };

  window.WS_APP.importBillingHistory = function importBillingHistory(history) {
    if (!Array.isArray(history)) return null;
    const normalized = history.map(normalizeBillingHistoryEntry).filter((entry) => entry.citizenId && entry.id);
    writeBillingHistory(normalized);
    return clone(normalized);
  };

  window.WS_APP.initCitizenStore();
})();
