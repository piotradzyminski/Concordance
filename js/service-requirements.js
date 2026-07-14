window.WS_APP = window.WS_APP || {};

(() => {
  const ACCESS_RANK = {
    PUBLIC: 0,
    RESTRICTED: 1,
    CONFIDENTIAL: 2,
    BLACK: 3,
    GAME_MASTER: 4
  };

  const serviceRequirementDiagnostics = {
    eligibilityContextsCreated: 0,
    insuranceCoverageComputations: 0,
    subscriptionEntitlementChecks: 0,
    installedCyberwareScans: 0
  };

  const CANONICAL_ABILITY_ALIASES = {
    "ability-strength": ["ability-strength", "sila", "siła"],
    "ability-endurance": ["ability-endurance", "wytrzymalosc", "wytrzymałość"],
    "ability-reflex": ["ability-reflex", "refleks"],
    "ability-dexterity": ["ability-dexterity", "zrecznosc", "zręczność"],
    "ability-perception": ["ability-perception", "percepcja"],
    "ability-composure": ["ability-composure", "opanowanie"],
    "ability-charisma": ["ability-charisma", "charyzma"],
    "ability-intellect": ["ability-intellect", "intelekt"]
  };

  function getAbilityAliasKeys(abilityId = "") {
    const normalized = normalizeId(abilityId);
    const direct = Object.keys(CANONICAL_ABILITY_ALIASES).find((key) => normalizeId(key) === normalized);
    if (direct) return CANONICAL_ABILITY_ALIASES[direct];
    const canonical = Object.keys(CANONICAL_ABILITY_ALIASES).find((key) => CANONICAL_ABILITY_ALIASES[key].some((alias) => normalizeId(alias) === normalized || normalizeKey(alias) === normalizeKey(abilityId)));
    return canonical ? CANONICAL_ABILITY_ALIASES[canonical] : [abilityId];
  }


  function normalizeKey(value = "") {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function normalizeId(value = "") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function parseNumber(value, fallback = 0) {
    const number = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(number) ? number : fallback;
  }

  function getDatabase() {
    return window.APP_DATA?.serviceDatabase || {};
  }

  function getInsuranceProfile(profileId = "") {
    const id = normalizeKey(profileId || "NONE");
    return (getDatabase().insuranceRequirementProfiles || []).find((profile) => normalizeKey(profile.id) === id) || null;
  }

  function getSkillValue(character = {}, skillId = "") {
    const target = normalizeId(skillId);
    const targetKey = normalizeKey(skillId);
    const skills = Array.isArray(character.skills) ? character.skills : [];
    const match = skills.find((skill) => {
      const values = [skill.skillId, skill.id, skill.label, skill.name].map((item) => [normalizeId(item), normalizeKey(item)]).flat();
      return values.includes(target) || values.includes(targetKey);
    });
    return parseNumber(match?.value ?? match?.rating ?? match?.level, 0);
  }

  function getAbilityValue(character = {}, abilityId = "") {
    const aliases = getAbilityAliasKeys(abilityId);
    const targetValues = new Set(aliases.map((alias) => [normalizeId(alias), normalizeKey(alias)]).flat());
    const abilities = Array.isArray(character.abilities) ? character.abilities : [];
    const matches = abilities.filter((ability) => {
      const values = [ability.abilityId, ability.id, ability.label, ability.name].map((item) => [normalizeId(item), normalizeKey(item)]).flat();
      return values.some((value) => targetValues.has(value));
    });
    if (!matches.length) return 0;
    return matches.reduce((maxValue, match) => {
      const natural = parseNumber(match.natural ?? match.value ?? match.rating ?? match.level, 0);
      const cyberware = match.cyberwareActive === false ? 0 : parseNumber(match.cyberware, 0);
      return Math.max(maxValue, natural + cyberware);
    }, 0);
  }

  function getExperienceValue(character = {}, categoryId = "") {
    const key = normalizeKey(categoryId);
    const raw = character.serviceExperience || character.experience || character.serviceCategoryExperience || {};
    if (Array.isArray(raw)) {
      const match = raw.find((item) => normalizeKey(item.categoryId || item.id || item.key || item.category) === key);
      return parseNumber(match?.value ?? match?.level ?? match?.amount, 0);
    }
    if (raw && typeof raw === "object") {
      const direct = raw[key] ?? raw[categoryId] ?? raw[categoryId?.toLowerCase?.()];
      if (direct !== undefined) return parseNumber(direct, 0);
    }

    const serviceLog = Array.isArray(character.serviceLog) ? character.serviceLog : [];
    return serviceLog.reduce((sum, record) => {
      const status = normalizeKey(record.status || "ACTIVE");
      if (!["COMPLETED", "ACTIVE"].includes(status)) return sum;
      const recordCategory = normalizeKey(record.categoryId || record.serviceCategoryId || record.workCategoryId || "");
      if (recordCategory !== key) return sum;
      return sum + (status === "COMPLETED" ? 2 : 1);
    }, 0);
  }

  function getCharacterAccessRank(character = {}) {
    const tags = new Set((Array.isArray(character.accessTags) ? character.accessTags : [])
      .map((tag) => normalizeKey(tag)));
    const clearance = normalizeKey(character.clearance || "");
    Object.keys(ACCESS_RANK).forEach((key) => {
      if (clearance.includes(key)) tags.add(key);
    });
    let rank = 0;
    tags.forEach((tag) => {
      if (ACCESS_RANK[tag] !== undefined) rank = Math.max(rank, ACCESS_RANK[tag]);
    });
    return rank;
  }

  function getRequiredAccessRank(clearance = "PUBLIC") {
    const key = normalizeKey(clearance || "PUBLIC");
    return ACCESS_RANK[key] ?? 0;
  }

  function isSubscriptionUsable(subscription = {}) {
    if (typeof window.WS_APP.isSubscriptionEntitled === "function") {
      serviceRequirementDiagnostics.subscriptionEntitlementChecks += 1;
      return window.WS_APP.isSubscriptionEntitled(subscription);
    }
    if (subscription.active === false) return false;
    const status = normalizeKey(subscription.billingStatus || subscription.status || "PENDING");
    return ["PAID", "OVERDUE", "ACTIVE", "GRACE_PERIOD"].includes(status);
  }

  function getTierFromText(value = "") {
    const text = String(value || "").toUpperCase();
    const match = text.match(/\bT\s*([1-5])\b/) || text.match(/\b(TIER|LEVEL)\s*([1-5])\b/);
    if (match) return parseNumber(match[1] || match[2], 0);
    if (text.includes("PREVAIL")) return 3;
    if (text.includes("SUSTAIN")) return 2;
    if (text.includes("LIVE")) return 1;
    return 0;
  }

  function computeInsuranceCoverage(character = {}) {
    serviceRequirementDiagnostics.insuranceCoverageComputations += 1;
    const result = {
      LIVE_AND_PREVAIL: 0,
      TRAUMA: 0,
      hasBiochip: false,
      labels: []
    };

    const subscriptions = Array.isArray(character.subscriptions) ? character.subscriptions : [];
    subscriptions.filter(isSubscriptionUsable).forEach((subscription) => {
      const source = [
        subscription.subscriptionCatalogId,
        subscription.catalogId,
        subscription.providerId,
        subscription.provider,
        subscription.title,
        subscription.tierId,
        subscription.tierLabel,
        subscription.displaySnapshot?.title,
        subscription.displaySnapshot?.tierLabel,
        subscription.displaySnapshot?.provider
      ].join(" ").toUpperCase();
      const tier = typeof window.WS_APP.getSubscriptionTierLevel === "function"
        ? window.WS_APP.getSubscriptionTierLevel(subscription)
        : getTierFromText([subscription.tierId, subscription.tierLabel, subscription.title, subscription.displaySnapshot?.tierLabel].join(" "));
      if (source.includes("LIVE") || source.includes("PREVAIL") || source.includes("SUB-LIVE-PREVAIL") || source.includes("LP-")) {
        result.LIVE_AND_PREVAIL = Math.max(result.LIVE_AND_PREVAIL, tier || 1);
      }
      if (source.includes("TRAUMA")) {
        result.TRAUMA = Math.max(result.TRAUMA, tier || 1);
      }
    });

    if (result.LIVE_AND_PREVAIL > 0) result.labels.push(`L&P T${result.LIVE_AND_PREVAIL}`);
    if (result.TRAUMA > 0) result.labels.push(`TRAUMA T${result.TRAUMA}`);

    serviceRequirementDiagnostics.installedCyberwareScans += 1;
    const installedCyberware = typeof window.WS_APP.getInstalledCyberwareInstanceViews === "function"
      ? window.WS_APP.getInstalledCyberwareInstanceViews(character.id)
      : [];
    result.hasBiochip = result.TRAUMA >= 2 || result.LIVE_AND_PREVAIL >= 3 || installedCyberware.some((item) => {
      const tokens = [item.name, item.shortName, item.category, item.subtype, item.processorRole, ...(Array.isArray(item.tags) ? item.tags : [])];
      return tokens.some((value) => String(value || "").toUpperCase().includes("BIOCHIP"));
    });
    return result;
  }

  function getInsuranceCoverage(character = {}, context = {}) {
    if (context && context.insuranceCoverage) return context.insuranceCoverage;
    const coverage = computeInsuranceCoverage(character);
    if (context && typeof context === "object") context.insuranceCoverage = coverage;
    return coverage;
  }

  function createEligibilityContext(character = {}, options = {}) {
    serviceRequirementDiagnostics.eligibilityContextsCreated += 1;
    const context = {
      characterId: String(character.id || character.citizenId || ""),
      hiddenReasonTypes: Array.isArray(options.hiddenReasonTypes) ? options.hiddenReasonTypes.slice() : undefined
    };
    return context;
  }

  function describeInsuranceRequirement(profile = {}) {
    if (!profile || ["NONE", "WAIVED"].includes(normalizeKey(profile.mode))) return "No official insurance required";
    if (normalizeKey(profile.mode) === "DISALLOWED") return profile.label || "Insurance response disallowed";
    const parts = Object.entries(profile.minTierByProvider || {}).map(([provider, tier]) => `${provider === "LIVE_AND_PREVAIL" ? "L&P" : provider} T${tier}+`);
    return parts.join(" / ") || profile.label || "Insurance required";
  }

  function checkInsurance(character = {}, requirement = {}, context = {}) {
    const inline = requirement && (requirement.profileId ? getInsuranceProfile(requirement.profileId) : requirement);
    const profile = inline || getInsuranceProfile("NONE") || { mode: "NONE" };
    const mode = normalizeKey(profile.mode || "NONE");
    if (["NONE", "WAIVED"].includes(mode)) return null;

    const coverage = getInsuranceCoverage(character, context);
    if (mode === "DISALLOWED") {
      const disallowed = (profile.disallowedProviders || []).filter((provider) => parseNumber(coverage[provider], 0) > 0);
      if (!disallowed.length) return null;
      return {
        type: "INSURANCE_DISALLOWED",
        key: profile.id || "INSURANCE",
        required: profile.reason || profile.label || "No official coverage allowed",
        current: disallowed.join(", ")
      };
    }

    const accepted = profile.acceptedProviders || Object.keys(profile.minTierByProvider || {});
    const matched = accepted.some((provider) => {
      const requiredTier = parseNumber(profile.minTierByProvider?.[provider], 1);
      return parseNumber(coverage[provider], 0) >= requiredTier;
    });
    const missingBiochip = profile.requiresBiochip === true && !coverage.hasBiochip;

    if (matched && !missingBiochip) return null;
    return {
      type: "INSURANCE",
      key: profile.id || "INSURANCE",
      required: `${describeInsuranceRequirement(profile)}${profile.requiresBiochip ? " + biochip" : ""}`,
      current: coverage.labels.length ? coverage.labels.join(" / ") : "none"
    };
  }

  function checkOfferEligibility(character = {}, offer = {}, context = {}) {
    const requirements = offer.requirements || {};
    const reasons = [];
    const profile = normalizeKey(character.biologicalProfile || character.profile || "NONE");
    const allowedProfiles = Array.isArray(requirements.biologicalProfiles) ? requirements.biologicalProfiles.map(normalizeKey) : [];
    const profileAllowed = allowedProfiles.includes(profile) || (profile === "UNCLASSIFIED" && allowedProfiles.includes("NONE"));
    if (allowedProfiles.length && !profileAllowed) {
      reasons.push({ type: "BIOLOGICAL_PROFILE", key: "biologicalProfile", required: allowedProfiles.join(" / "), current: profile || "NONE" });
    }

    (requirements.minAbilities || []).forEach((item) => {
      const current = getAbilityValue(character, item.id || item.abilityId || item.key);
      const required = parseNumber(item.value ?? item.min ?? item.required, 0);
      if (current < required) reasons.push({ type: "MIN_ABILITY", key: item.id || item.abilityId || item.key, required, current });
    });

    (requirements.minSkills || []).forEach((item) => {
      const current = getSkillValue(character, item.id || item.skillId || item.key);
      const required = parseNumber(item.value ?? item.min ?? item.required, 0);
      if (current < required) reasons.push({ type: "MIN_SKILL", key: item.id || item.skillId || item.key, required, current });
    });

    (requirements.minExperience || []).forEach((item) => {
      const categoryId = item.categoryId || item.id || item.key || item.category;
      const current = getExperienceValue(character, categoryId);
      const required = parseNumber(item.value ?? item.min ?? item.required, 0);
      if (current < required) reasons.push({ type: "MIN_EXPERIENCE", key: categoryId, required, current });
    });

    if (requirements.insurance) {
      const issue = checkInsurance(character, requirements.insurance, context);
      if (issue) reasons.push(issue);
    }

    if (requirements.requiredClearance) {
      const current = getCharacterAccessRank(character);
      const required = getRequiredAccessRank(requirements.requiredClearance);
      if (current < required) reasons.push({ type: "CLEARANCE", key: "accessTags", required: requirements.requiredClearance, current });
    }

    if (requirements.maxRiskScore !== undefined && requirements.maxRiskScore !== null) {
      const current = parseNumber(character.risk ?? character.riskScore ?? 0, 0);
      const required = parseNumber(requirements.maxRiskScore, 100);
      if (current > required) reasons.push({ type: "RISK_SCORE", key: "risk", required: `<= ${required}`, current });
    }

    const hiddenTypes = new Set(context.hiddenReasonTypes || ["BIOLOGICAL_PROFILE_HIDDEN"]);
    const status = reasons.some((reason) => hiddenTypes.has(reason.type)) ? "HIDDEN" : reasons.length ? "LOCKED" : "AVAILABLE";
    return {
      eligible: reasons.length === 0,
      status,
      reasons
    };
  }

  function getDiagnostics() {
    return { ...serviceRequirementDiagnostics };
  }

  function resetDiagnostics() {
    Object.keys(serviceRequirementDiagnostics).forEach((key) => {
      serviceRequirementDiagnostics[key] = 0;
    });
  }

  window.ServiceRequirements = {
    checkOfferEligibility,
    createEligibilityContext,
    getAbilityValue,
    getSkillValue,
    getExperienceValue,
    getInsuranceCoverage,
    describeInsuranceRequirement,
    getDiagnostics,
    resetDiagnostics
  };
})();
