window.WS_APP = window.WS_APP || {};

(() => {
  function normalizeText(value = "") {
    return String(value || "").trim();
  }

  function normalizeKey(value = "") {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function makeSlug(value = "") {
    return String(value || "service")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "service";
  }

  function hashString(value = "") {
    let hash = 2166136261;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function parseNumber(value, fallback = 0) {
    const number = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(number) ? number : fallback;
  }

  function getSettlementWeekKey() {
    return String(window.WS_APP.getSettlementPeriodEndIso?.() || window.WS_APP.SETTLEMENT_PERIOD_END_ISO || window.WS_APP.CAMPAIGN_DATE_ISO || "2109-02-16").trim();
  }

  function addDaysIso(iso = "", days = 0) {
    const date = new Date(`${iso || "2109-02-16"}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return "";
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function getEmployer(database = {}, employerId = "") {
    return (database.serviceEmployers || []).find((employer) => String(employer.id || "") === String(employerId || "")) || null;
  }

  function getWorkCharacter(database = {}, workCharacterId = "") {
    return (database.serviceWorkCharacters || []).find((item) => String(item.id || "") === String(workCharacterId || "")) || null;
  }

  function getCategory(database = {}, categoryId = "") {
    return (database.serviceCategories || []).find((item) => String(item.id || "") === String(categoryId || "")) || null;
  }

  function getOfferState(character = {}, offerId = "", templateId = "") {
    const states = character.serviceOfferStates && typeof character.serviceOfferStates === "object" ? character.serviceOfferStates : {};
    return states[offerId] || states[templateId] || null;
  }

  function getEmployerReputation(character = {}, employerId = "") {
    const id = String(employerId || "").trim();
    const reputation = character.serviceReputation || character.serviceEmployerReputation || {};
    const entry = reputation?.[id];
    const score = typeof entry === "number" ? entry : parseNumber(entry?.score, 0);
    return Math.max(-10, Math.min(10, score));
  }

  function getTemplateTags(template = {}) {
    return new Set([
      template.categoryId,
      template.subcategoryId,
      template.workCharacterId,
      template.employerId,
      template.employerType,
      ...(Array.isArray(template.tags) ? template.tags : [])
    ].map(normalizeKey).filter(Boolean));
  }

  function getWeeklyDemandProfile(database = {}, settlementWeek = "") {
    const modifiers = Array.isArray(database.serviceWeeklyDemandModifiers) ? database.serviceWeeklyDemandModifiers : [];
    if (!modifiers.length) return [];
    return modifiers.filter((modifier) => {
      if (modifier.week && String(modifier.week) !== String(settlementWeek)) return false;
      const seed = hashString(`demand|${settlementWeek}|${modifier.id || modifier.label || "modifier"}`);
      const random = seededRandom(seed);
      const chance = Math.max(0, Math.min(1, parseNumber(modifier.chance, 1)));
      return random() <= chance;
    });
  }

  function getDemandEffect(template = {}, context = {}) {
    const tags = getTemplateTags(template);
    const demandProfile = context.demandProfile || [];
    return demandProfile.reduce((acc, modifier) => {
      const match = [
        ...(modifier.categoryIds || []),
        ...(modifier.employerIds || []),
        ...(modifier.workCharacterIds || []),
        ...(modifier.tags || [])
      ].map(normalizeKey).some((key) => tags.has(key));
      if (!match) return acc;
      acc.spawnMultiplier *= Math.max(0, parseNumber(modifier.spawnMultiplier, 1));
      acc.paymentMultiplier *= Math.max(0, parseNumber(modifier.paymentMultiplier, 1));
      acc.labels.push(modifier.label || modifier.id || "Demand modifier");
      return acc;
    }, { spawnMultiplier: 1, paymentMultiplier: 1, labels: [] });
  }

  function getOfferSourceType(template = {}, employer = {}) {
    const explicit = normalizeKey(template.sourceType || template.offerSourceType || "");
    if (explicit) return explicit;
    if (normalizeKey(template.category || template.marketCategory) === "MANDATORY") return "SYSTEM_MANDATORY";
    if (normalizeKey(employer.employerType || template.employerType) === "BLACK") return "BLACK_EVENT";
    return "GENERATED_WEEKLY";
  }

  function applyStoredOfferState(offer = {}, character = {}) {
    const state = getOfferState(character, offer.generatedOfferId || offer.id, offer.templateId);
    if (!state) return offer;
    const status = normalizeKey(state.status || "");
    if (!["ACTIVE", "COMPLETED", "FAILED", "TERMINATED", "ARCHIVED", "REJECTED", "EXPIRED"].includes(status)) return { ...offer, lifecycleState: state };
    return {
      ...offer,
      status,
      lifecycleState: state,
      lifecycleNote: state.reason || offer.lifecycleNote || "Stored service lifecycle state",
      isRejected: status === "REJECTED",
      isExpired: status === "EXPIRED",
      isAccepted: status === "ACTIVE" || offer.isAccepted
    };
  }

  function rollRange(random, range = [], fallback = 0) {
    const min = parseNumber(range?.[0], fallback);
    const max = parseNumber(range?.[1], min);
    if (max <= min) return Math.round(min);
    return Math.round(min + random() * (max - min));
  }

  function getPaymentRoundingStep(value = 0, level = 1) {
    const amount = Math.abs(parseNumber(value, 0));
    const offerLevel = parseNumber(level, 1);
    if (amount >= 10000 || offerLevel >= 5) return 1000;
    return 500;
  }

  function roundServicePayment(value = 0, level = 1) {
    const amount = parseNumber(value, 0);
    const step = getPaymentRoundingStep(amount, level);
    return Math.max(step, Math.round(amount / step) * step);
  }

  function normalizeTemplateOffer(template = {}, context = {}) {
    const database = context.database || window.APP_DATA?.serviceDatabase || {};
    const week = context.settlementWeek || getSettlementWeekKey();
    const employer = getEmployer(database, template.employerId) || {};
    const workCharacter = getWorkCharacter(database, template.workCharacterId) || {};
    const category = getCategory(database, template.categoryId) || {};
    const seed = hashString(`${week}|${context.characterId || ""}|${template.id || ""}`);
    const random = seededRandom(seed);
    const form = normalizeKey(template.form || "AGREEMENT");
    const demandEffect = getDemandEffect(template, context);
    const reputationScore = getEmployerReputation(context.character || {}, template.employerId || employer.id || "");
    const reputationPaymentMultiplier = Math.max(0.75, Math.min(1.25, 1 + reputationScore * 0.02));
    const rawAmount = rollRange(random, template.payment?.amountRange || template.amountRange || [template.amount || 0, template.amount || 0], template.amount || 0) * demandEffect.paymentMultiplier * reputationPaymentMultiplier;
    const amount = roundServicePayment(rawAmount, template.level);
    const durationWeeks = form === "CONTRACT" ? Math.max(1, rollRange(random, template.durationWeeksRange || [1, 1], 1)) : 0;
    const generatedId = `${makeSlug(week)}-${makeSlug(template.id || workCharacter.id || "offer")}`;
    const dueDate = form === "COMMISSION" ? addDaysIso(week, 6 + Math.max(0, rollRange(random, [0, 5], 0))) : "";
    const eligibility = window.ServiceRequirements?.checkOfferEligibility?.(
      context.character || {},
      template,
      context.eligibilityContext || { database }
    ) || { eligible: true, status: "AVAILABLE", reasons: [] };
    const marketCategory = normalizeKey(template.category || template.marketCategory || (employer.employerType === "SYSTEM" ? "MANDATORY" : "REGULAR")) === "MANDATORY" ? "MANDATORY" : "REGULAR";
    const typeLabel = form === "COMMISSION"
      ? (marketCategory === "MANDATORY" ? "MANDATORY SERVICE" : "REGULAR COMMISSION")
      : form === "CONTRACT"
        ? (marketCategory === "MANDATORY" ? "MANDATORY CONTRACT" : "REGULAR CONTRACT")
        : (marketCategory === "MANDATORY" ? "MANDATORY AGREEMENT" : "REGULAR AGREEMENT");

    const normalized = {
      id: generatedId,
      generatedOfferId: generatedId,
      templateId: template.id || "",
      title: template.title || workCharacter.label || "Service Offer",
      providerId: employer.providerId || template.providerId || employer.id || "",
      provider: template.provider || employer.label || "LOCAL SERVICE REGISTRY",
      organizationId: employer.organizationId || template.organizationId || "",
      employerId: template.employerId || employer.id || "",
      employerType: employer.employerType || template.employerType || "SYSTEM",
      providerClass: employer.employerType || template.employerType || "SYSTEM",
      category: marketCategory,
      categoryId: template.categoryId || category.id || "",
      subcategoryId: template.subcategoryId || "",
      workCharacterId: template.workCharacterId || workCharacter.id || "",
      workCharacterLabel: workCharacter.label || template.workCharacterId || "",
      complexity: template.complexity || "STANDARD",
      level: parseNumber(template.level, 1),
      form,
      typeLabel,
      status: eligibility.status || "AVAILABLE",
      sourceType: getOfferSourceType(template, employer),
      amount,
      payment: amount,
      paymentLabel: `${formatCreditsSafe(amount)} / ${form === "COMMISSION" ? "COMPLETION" : "WEEK"}`,
      cycle: "WEEKLY",
      durationWeeks,
      durationType: form === "COMMISSION" ? "One-Time" : form === "AGREEMENT" ? "Indefinite" : `${durationWeeks} Weeks`,
      dueDate,
      details: template.details || category.description || workCharacter.label || "Generated service offer.",
      requirements: template.requirements || {},
      rewards: template.rewards || {},
      eligibility,
      marketModifiers: demandEffect.labels,
      reputationScore,
      settlementWeek: week,
      source: "WEEKLY SERVICE MARKET",
      section: "SERVICE MARKET",
      compliance: template.employerType === "BLACK" || employer.employerType === "BLACK" ? "Negative" : marketCategory === "MANDATORY" ? "Positive" : "Neutral",
      tags: Array.isArray(template.tags) ? template.tags : []
    };
    return applyStoredOfferState(normalized, context.character || {});
  }

  function formatCreditsSafe(value = 0) {
    if (typeof window.WS_APP?.formatCredits === "function") return window.WS_APP.formatCredits(value);
    return window.WS_APP?.storeUtils?.formatCreditLabel?.(value) || "0 ₡";
  }

  function shouldSpawnTemplate(template = {}, context = {}) {
    const week = context.settlementWeek || getSettlementWeekKey();
    const seed = hashString(`spawn|${week}|${context.characterId || ""}|${template.id || ""}`);
    const random = seededRandom(seed);
    const demandEffect = getDemandEffect(template, context);
    const reputationScore = getEmployerReputation(context.character || {}, template.employerId || "");
    const reputationSpawnMultiplier = Math.max(0.5, Math.min(1.5, 1 + reputationScore * 0.03));
    const chance = Math.max(0, Math.min(1, parseNumber(template.spawn?.baseChance, 0.25) * demandEffect.spawnMultiplier * reputationSpawnMultiplier));
    return random() <= chance;
  }

  function normalizeManualOffer(offer = {}, context = {}) {
    const eligibility = window.ServiceRequirements?.checkOfferEligibility?.(
      context.character || {},
      offer,
      context.eligibilityContext || {}
    ) || { eligible: true, status: offer.status || "AVAILABLE", reasons: [] };
    const normalized = {
      ...offer,
      generatedOfferId: offer.generatedOfferId || offer.id,
      templateId: offer.templateId || "",
      status: normalizeKey(offer.status || eligibility.status || "AVAILABLE"),
      sourceType: normalizeKey(offer.sourceType || "MANUAL_ADMIN"),
      eligibility,
      source: offer.source || "ADMIN SERVICE OFFER",
      settlementWeek: context.settlementWeek || getSettlementWeekKey()
    };
    return applyStoredOfferState(normalized, context.character || {});
  }

  function generateWeeklyOffers(options = {}) {
    const character = options.character || options.citizen || {};
    const database = options.database || window.APP_DATA?.serviceDatabase || {};
    const settlementWeek = options.settlementWeek || getSettlementWeekKey();
    const templates = Array.isArray(database.serviceOfferTemplates) ? database.serviceOfferTemplates : [];
    const characterId = character.id || options.characterId || "citizen";
    const demandProfile = getWeeklyDemandProfile(database, settlementWeek);
    const eligibilityContext = window.ServiceRequirements?.createEligibilityContext?.(character, { database }) || { database };
    const context = { character, characterId, database, settlementWeek, demandProfile, eligibilityContext };

    const generated = templates
      .filter((template) => shouldSpawnTemplate(template, context))
      .map((template) => normalizeTemplateOffer(template, context))
      .filter((offer) => offer.status !== "HIDDEN");

    const mandatory = generated.filter((offer) => offer.category === "MANDATORY");
    const regular = generated.filter((offer) => offer.category !== "MANDATORY");
    if (mandatory.length < 2) {
      templates
        .filter((template) => normalizeKey(template.category || template.marketCategory) === "MANDATORY")
        .slice(0, 4)
        .map((template) => normalizeTemplateOffer(template, context))
        .forEach((offer) => {
          if (!generated.some((item) => item.id === offer.id)) generated.push(offer);
        });
    }
    if (regular.length < 4) {
      templates
        .filter((template) => normalizeKey(template.category || template.marketCategory) !== "MANDATORY")
        .slice(0, 8)
        .map((template) => normalizeTemplateOffer(template, context))
        .forEach((offer) => {
          if (!generated.some((item) => item.id === offer.id)) generated.push(offer);
        });
    }

    const manual = (Array.isArray(options.manualOffers) ? options.manualOffers : [])
      .filter((offer) => {
        const targetCitizenId = normalizeText(offer.targetCitizenId || offer.citizenId || offer.characterId || "");
        return !targetCitizenId || targetCitizenId === String(characterId || "");
      })
      .map((offer) => normalizeManualOffer(offer, context));
    return [...generated, ...manual];
  }

  window.ServiceOfferGenerator = {
    generateWeeklyOffers,
    normalizeTemplateOffer,
    getSettlementWeekKey,
    getWeeklyDemandProfile
  };
})();
