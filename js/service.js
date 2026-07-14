window.WS_APP = window.WS_APP || {};

let serviceViewportRestoreRevision = 0;
let serviceIncomePreloadPromise = null;
let serviceIncomePreloadScheduled = false;
let serviceRuntimeListenersBound = false;
const serviceOfferSyncScheduled = new Set();

const SERVICE_CONTRACT_PAGE_SIZE = 20;
const SERVICE_OFFER_CACHE_LIMIT = 18;
const serviceOfferCache = new Map();
const serviceOfferSyncKeys = new Map();
const serviceUiMetrics = {
  generateWeeklyOffersCalls: 0,
  sectionRenderCount: 0,
  activeTabNoopCount: 0,
  incomePreloadRequests: 0,
  lastRenderPanel: "",
  lastRenderDurationMs: 0
};

window.WS_APP.getServiceUiDiagnostics = function getServiceUiDiagnostics() {
  return {
    ...serviceUiMetrics,
    offerCacheEntries: serviceOfferCache.size,
    eligibility: window.ServiceRequirements?.getDiagnostics?.() || null,
    subscriptionEntitlement: window.WS_APP.getSubscriptionEntitlementCacheStats?.() || null
  };
};

window.WS_APP.resetServiceUiDiagnostics = function resetServiceUiDiagnostics() {
  Object.assign(serviceUiMetrics, {
    generateWeeklyOffersCalls: 0,
    sectionRenderCount: 0,
    activeTabNoopCount: 0,
    incomePreloadRequests: 0,
    lastRenderPanel: "",
    lastRenderDurationMs: 0
  });
  window.ServiceRequirements?.resetDiagnostics?.();
};

// Service module extracted from js/modules.js.
// Keep this file loaded after js/modules.js so shared terminal and card helpers remain available.

function getServiceActivePanel() {
  const value = String(window.WS_APP.serviceActivePanel || "contracts").toLowerCase();
  return ["income", "contracts", "experience", "offer", "log", "log-details"].includes(value) ? value : "contracts";
}

function getServicePrimaryTabId(activePanel = getServiceActivePanel()) {
  if (activePanel === "offer") return "contracts";
  if (activePanel === "log-details") return "log";
  return activePanel;
}


function getServiceContractSort() {
  const value = String(window.WS_APP.serviceContractSort || "PAYMENT_DESC").toUpperCase();
  const allowed = [
    "PAYMENT_DESC",
    "PAYMENT_ASC",
    "TITLE_ASC",
    "TITLE_DESC",
    "PROVIDER_ASC",
    "STATUS",
    "SOURCE",
    "LEVEL_DESC",
    "LEVEL_ASC",
    "DURATION_ASC",
    "DURATION_DESC",
    "TYPE"
  ];
  return allowed.includes(value) ? value : "PAYMENT_DESC";
}

function getServiceContractSearch() {
  return String(window.WS_APP.serviceContractSearch || "").trim();
}

function getServiceContractGroupTab() {
  const value = String(window.WS_APP.serviceContractGroupTab || "MANDATORY").toUpperCase();
  return ["MANDATORY", "REGULAR"].includes(value) ? value : "MANDATORY";
}

function getServiceEmployerDefinitionsForManualEntry(category = "REGULAR") {
  const mandatory = normalizeServiceCategoryLabel(category) === "MANDATORY";
  const allowedTypes = mandatory ? new Set(["SYSTEM"]) : new Set(["SYSTEM", "PRIVATE"]);
  return (getServiceDatabase().serviceEmployers || [])
    .filter((employer) => allowedTypes.has(String(employer.employerType || "").trim().toUpperCase()))
    .sort((left, right) => String(left.label || left.id || "").localeCompare(String(right.label || right.id || "")));
}

function getServiceProviderOptions(category = "REGULAR") {
  return Array.from(new Set(getServiceEmployerDefinitionsForManualEntry(category)
    .map((employer) => String(employer.label || employer.id || "").trim())
    .filter(Boolean)));
}

function findServiceEmployerByProvider(provider = "") {
  const value = String(provider || "").trim().toLowerCase();
  if (!value) return null;
  return (getServiceDatabase().serviceEmployers || []).find((employer) => (
    String(employer.id || "").trim().toLowerCase() === value
    || String(employer.label || "").trim().toLowerCase() === value
    || String(employer.providerId || "").trim().toLowerCase() === value
  )) || null;
}

function getServiceProviderKind(provider = "", category = "REGULAR") {
  const employer = findServiceEmployerByProvider(provider);
  if (employer?.employerType) return String(employer.employerType).trim().toUpperCase();
  return normalizeServiceCategoryLabel(category) === "MANDATORY" ? "SYSTEM" : "CUSTOM";
}

function getServiceProviderToneClass(provider = "") {
  const value = String(provider || "LOCAL SERVICE REGISTRY").trim().toLowerCase();
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return `service-provider-tone-${Math.abs(hash) % 12}`;
}

function getActiveServiceLogEntries(citizen = {}, serviceLog = null) {
  const entries = Array.isArray(serviceLog) ? serviceLog : normalizeServiceLogEntries(citizen);
  return entries.filter((entry) => String(entry.status || "").toUpperCase() === "ACTIVE");
}

function renderServiceActiveRoster(citizen = {}, user = {}, serviceLog = null) {
  const entries = getActiveServiceLogEntries(citizen, serviceLog);
  return `
    <section class="service-active-roster">
      <header>
        <div>
          <b>${escapeHtml(getCitizenNameLabel(citizen, { legal: true }))}</b>
          <span>Active Service</span>
        </div>
        <small>${escapeHtml(entries.length)} ACTIVE RECORD${entries.length === 1 ? "" : "S"}</small>
      </header>
      <div class="service-active-roster-list">
        ${entries.length ? entries.map((entry) => {
          const form = normalizeServiceFormLabel(entry.form);
          const started = entry.acceptedAt ? ` / START ${window.WS_APP.formatDateDisplay(entry.acceptedAt)}` : "";
          return `
            <article>
              <span>
                <b>${escapeHtml(entry.title || "Active Service")}</b>
                <small>${escapeHtml(entry.provider || "LOCAL SERVICE REGISTRY")} / ${escapeHtml(entry.typeLabel || getServiceTypeLabel(entry.category, form))}${escapeHtml(started)}</small>
                ${form === "COMMISSION" ? `<small>Pending payment: ${escapeHtml(formatCredits(entry.amount || 0))} / Completion</small>` : ""}
              </span>
              <strong>${escapeHtml(formatCredits(entry.amount || 0))}${form === "COMMISSION" ? " / COMPLETION" : " / WEEK"}</strong>
              ${user?.role === "admin" ? `<nav class="service-active-roster-actions"><button type="button" data-service-log-complete="${escapeHtml(entry.id)}">Complete</button></nav>` : ""}
            </article>
          `;
        }).join("") : '<p class="file-empty">No active service registered.</p>'}
      </div>
    </section>
  `;
}

function renderServiceProviderOptions(selected = "", category = "REGULAR") {
  const normalizedSelected = String(selected || "").trim();
  const options = getServiceProviderOptions(category);
  const hasSelected = options.some((item) => item.toLowerCase() === normalizedSelected.toLowerCase());
  return [
    ...options.map((provider) => `<option value="${escapeHtml(provider)}" ${provider.toLowerCase() === normalizedSelected.toLowerCase() ? "selected" : ""}>${escapeHtml(provider)}</option>`),
    `<option value="__CUSTOM__" ${normalizedSelected && !hasSelected ? "selected" : ""}>Custom provider</option>`
  ].join("");
}

function getActiveServiceSummary(citizen = {}) {
  const serviceRecords = getActiveServiceLogEntries(citizen)
    .map((entry) => `${entry.title || "Active Service"} / ${entry.provider || "LOCAL SERVICE REGISTRY"}`);
  if (serviceRecords.length) return serviceRecords.slice(0, 3).join(" + ");
  return "No active service registered";
}

function normalizeServiceCategoryLabel(value = "REGULAR") {
  return String(value || "REGULAR").toUpperCase() === "MANDATORY" ? "MANDATORY" : "REGULAR";
}

function normalizeServiceFormLabel(value = "AGREEMENT") {
  const form = String(value || "AGREEMENT").toUpperCase().replace(/[\s-]+/g, "_");
  if (["ONE_TIME", "COMMISSION", "ASSIGNMENT"].includes(form)) return "COMMISSION";
  if (["FIXED_TERM", "CONTRACT"].includes(form)) return "CONTRACT";
  return "AGREEMENT";
}

function getServiceTypeLabel(category = "REGULAR", form = "AGREEMENT") {
  const normalizedCategory = normalizeServiceCategoryLabel(category);
  const normalizedForm = normalizeServiceFormLabel(form);
  if (normalizedForm === "COMMISSION") return normalizedCategory === "MANDATORY" ? "MANDATORY SERVICE" : "REGULAR COMMISSION";
  if (normalizedForm === "CONTRACT") return normalizedCategory === "MANDATORY" ? "MANDATORY CONTRACT" : "REGULAR CONTRACT";
  return normalizedCategory === "MANDATORY" ? "MANDATORY AGREEMENT" : "REGULAR AGREEMENT";
}

function inferServiceFormFromLabel(label = "") {
  const value = String(label || "").toUpperCase();
  if (value.includes("ONE-TIME") || value.includes("COMMISSION") || value.includes("ASSIGNMENT")) return "COMMISSION";
  if (value.includes("CONTRACT")) return "CONTRACT";
  return "AGREEMENT";
}

function inferServiceCategoryFromLabel(label = "") {
  return String(label || "").toUpperCase().includes("MANDATORY") ? "MANDATORY" : "REGULAR";
}

function getServiceDurationLabel(typeLabel = "", record = {}) {
  const form = normalizeServiceFormLabel(record.form || inferServiceFormFromLabel(typeLabel));
  if (form === "COMMISSION") return "One-Time";
  if (form === "AGREEMENT") return "Indefinite";
  if (record.durationType) return record.durationType;
  if (record.durationWeeks) return `${record.durationWeeks} Weeks`;
  return "Fixed Term";
}

function formatServiceHistoryDate(value = "", fallback = "OPEN") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  const dateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) return `${dateMatch[3]}.${dateMatch[2]}.${dateMatch[1]}`;
  const monthMatch = text.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) return `${monthMatch[2]}.${monthMatch[1]}`;
  return text;
}

function getServiceHistoryEndLabel(entry = {}) {
  const status = String(entry.status || "ACTIVE").toUpperCase();
  if (status === "ACTIVE") return "ACTIVE";
  return formatServiceHistoryDate(entry.completedAt || entry.archivedAt || entry.updatedAt || entry.dueDate, status || "CLOSED");
}

function getServiceHistoryPaymentLabel(entry = {}) {
  const form = normalizeServiceFormLabel(entry.form);
  return `${formatCredits(entry.amount || entry.payment || 0)} / ${form === "COMMISSION" ? "COMPLETION" : "WEEK"}`;
}

function getServiceHistoryMetaLabel(entry = {}) {
  const form = normalizeServiceFormLabel(entry.form);
  const duration = form === "CONTRACT" && Number(entry.durationWeeks || 0) > 0
    ? ` / ${Number(entry.durationWeeks)} Weeks`
    : form === "COMMISSION" && entry.dueDate
      ? ` / Deadline ${formatServiceHistoryDate(entry.dueDate)}`
      : "";
  return `${entry.provider || "LOCAL SERVICE REGISTRY"} - ${entry.title || "Service Record"} - ${entry.typeLabel || getServiceTypeLabel(entry.category, form)}${duration}`;
}

function getServiceCompletedEntries(entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => String(entry.status || "").toUpperCase() === "COMPLETED");
}

function getServiceDateOnly(value = "") {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : text;
}

function getServiceCompletionRangeLabel(entry = {}) {
  const start = getServiceDateOnly(entry.acceptedAt || entry.startedAt || entry.createdAt || "");
  const end = getServiceDateOnly(entry.completedAt || entry.archivedAt || entry.updatedAt || entry.dueDate || "");
  if (start && end && start !== end) return `${formatServiceHistoryDate(start)} → ${formatServiceHistoryDate(end)}`;
  if (end) return formatServiceHistoryDate(end);
  if (start) return formatServiceHistoryDate(start);
  return "UNREGISTERED";
}

function getServiceWorkScopeItems(entry = {}) {
  if (Array.isArray(entry.scopeSnapshot) && entry.scopeSnapshot.length) {
    return entry.scopeSnapshot.map((item) => String(item || "").trim()).filter(Boolean);
  }
  if (Array.isArray(entry.workScope?.domains) && entry.workScope.domains.length) {
    return entry.workScope.domains.map((item) => String(item || "").trim()).filter(Boolean);
  }
  const database = window.APP_DATA?.serviceDatabase || {};
  const category = (database.serviceCategories || []).find((item) => normalizeServiceDictionaryKey(item.id) === normalizeServiceDictionaryKey(entry.categoryId));
  const description = String(category?.description || entry.details || "").trim();
  const parts = description
    .replace(/\.$/, "")
    .replace(/\s+and\s+/gi, ", ")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [getServiceWorkCharacterLabel(entry.workCharacterId) || getServiceCategoryLabel(entry.categoryId) || entry.details || "General service work"];
}

function getServiceWorkScopeLabel(entry = {}) {
  const category = getServiceCategoryLabel(entry.categoryId) || normalizeServiceCategoryLabel(entry.category);
  const work = getServiceWorkCharacterLabel(entry.workCharacterId);
  return [category, work].filter(Boolean).join(" / ") || entry.typeLabel || "Service Work";
}

function getServiceLogPaymentStatusLabel(entry = {}) {
  const status = String(entry.payoutStatus || "").toUpperCase();
  if (status === "SETTLED" || entry.payoutSettledAt) return "PAID";
  if (status === "APPROVED") return "READY";
  if (["READY_FOR_SETTLEMENT", "PENDING", "PENDING_COMPLETION"].includes(status)) return "PENDING";
  if (["REJECTED", "CANCELLED", "FORFEITED"].includes(status)) return "CANCELLED";
  return normalizeServiceFormLabel(entry.form) === "COMMISSION" ? "PENDING" : "ACTIVE";
}

function getServiceLogPaymentLabel(entry = {}) {
  const form = normalizeServiceFormLabel(entry.form);
  if (form === "COMMISSION") return `${formatCredits(entry.amount || entry.payment || 0)} / ${getServiceLogPaymentStatusLabel(entry)}`;
  return `${formatCredits(entry.amount || entry.payment || 0)} / WEEK`;
}

function findServiceLogEntryById(entries = [], id = "") {
  const target = String(id || window.WS_APP.serviceSelectedLogId || "").trim();
  return (Array.isArray(entries) ? entries : []).find((entry) => String(entry.id || "") === target) || null;
}


function normalizeServiceExperienceGainForUi(value = []) {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.entries(value).map(([categoryId, amount]) => ({ categoryId, value: amount }))
      : [];
  return source
    .map((item) => {
      const categoryId = String(item?.categoryId || item?.id || item?.key || item?.category || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      const value = Number(String(item?.value ?? item?.amount ?? item?.gain ?? item?.level ?? 0).replace(/[^0-9.-]/g, ""));
      return categoryId && Number.isFinite(value) && value > 0 ? { categoryId, value: Math.round(value) } : null;
    })
    .filter(Boolean);
}

function getServiceExperienceGainEntries(record = {}) {
  return normalizeServiceExperienceGainForUi(record.experienceGain || record.rewards?.experienceGain || []);
}

function getServiceExperienceGainLabel(record = {}) {
  return getServiceExperienceGainEntries(record)
    .map((item) => `${getServiceExperienceLabel(item.categoryId)} +${item.value}`)
    .join(" / ");
}

function renderServiceRewardPreview(record = {}) {
  const label = getServiceExperienceGainLabel(record);
  if (!label) return "";
  const granted = record.experienceGrantedAt ? ` / Granted ${window.WS_APP.formatDateDisplay(record.experienceGrantedAt)}` : "";
  return `<span class="service-contract-rewards"><i>Reward: ${escapeHtml(label)}${escapeHtml(granted)}</i></span>`;
}

function getServiceDatabase() {
  return window.APP_DATA?.serviceDatabase || {};
}

function normalizeServiceDictionaryKey(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function serviceHumanizeKey(value = "") {
  const key = String(value || "").trim();
  if (!key) return "-";
  return key
    .replace(/^ability[-_]/i, "")
    .replace(/^skill[-_]/i, "")
    .replace(/^source[:\s_-]*/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const SERVICE_ABILITY_LABELS = {
  ABILITY_STRENGTH: "Siła",
  ABILITY_ENDURANCE: "Wytrzymałość",
  ABILITY_REFLEX: "Refleks",
  ABILITY_DEXTERITY: "Zręczność",
  ABILITY_PERCEPTION: "Percepcja",
  ABILITY_COMPOSURE: "Opanowanie",
  ABILITY_CHARISMA: "Charyzma",
  ABILITY_INTELLECT: "Intelekt",
  ABILITY_MOTORICS: "Zręczność",
  ABILITY_COORDINATION: "Zręczność",
  ABILITY_RESILIENCE: "Wytrzymałość",
  ABILITY_STABILITY: "Opanowanie"
};

const SERVICE_SOURCE_TYPE_LABELS = {
  GENERATED_WEEKLY: "Generated Weekly",
  MANUAL_ADMIN: "Manual Admin",
  SYSTEM_MANDATORY: "System Mandatory",
  BLACK_EVENT: "Black Event",
  STORY_EVENT: "Story Event",
  SERVICE: "Service"
};

function getServiceAbilityLabel(abilityId = "") {
  const key = normalizeServiceDictionaryKey(abilityId);
  return SERVICE_ABILITY_LABELS[key] || serviceHumanizeKey(abilityId);
}

function getServiceExperienceLabel(categoryId = "") {
  const category = getServiceCategoryDefinition(categoryId);
  if (category?.label) return category.label;
  const workCharacter = getServiceWorkCharacterDefinition(categoryId);
  if (workCharacter?.label) return workCharacter.label;
  return serviceHumanizeKey(categoryId);
}

function normalizeServiceSourceType(value = "") {
  return normalizeServiceDictionaryKey(String(value || "SERVICE").replace(/^SOURCE[:\s_-]*/i, ""));
}

function getServiceSourceTypeLabel(value = "") {
  const key = normalizeServiceSourceType(value);
  return SERVICE_SOURCE_TYPE_LABELS[key] || serviceHumanizeKey(key || "SERVICE");
}

function getServiceCategoryDefinition(categoryId = "") {
  const key = normalizeServiceDictionaryKey(categoryId);
  return (getServiceDatabase().serviceCategories || [])
    .find((item) => normalizeServiceDictionaryKey(item.id) === key) || null;
}

function getServiceWorkCharacterDefinition(workCharacterId = "") {
  const key = String(workCharacterId || "").trim();
  const normalized = normalizeServiceDictionaryKey(workCharacterId);
  return (getServiceDatabase().serviceWorkCharacters || [])
    .find((item) => String(item.id || "") === key || normalizeServiceDictionaryKey(item.id) === normalized) || null;
}

function getServiceEmployerDefinition(employerId = "") {
  const key = String(employerId || "").trim();
  return (getServiceDatabase().serviceEmployers || [])
    .find((item) => String(item.id || "") === key) || null;
}

function getServiceInsuranceProfileDefinition(profileId = "") {
  const key = normalizeServiceDictionaryKey(profileId);
  return (getServiceDatabase().insuranceRequirementProfiles || [])
    .find((item) => normalizeServiceDictionaryKey(item.id) === key) || null;
}

function getServiceCategoryLabel(categoryId = "") {
  const item = getServiceCategoryDefinition(categoryId);
  return item?.label || serviceHumanizeKey(categoryId);
}

function getServiceWorkCharacterLabel(workCharacterId = "") {
  const item = getServiceWorkCharacterDefinition(workCharacterId);
  return item?.label || serviceHumanizeKey(workCharacterId);
}

function getServiceRequirementSubjectLabel(reason = {}) {
  const type = normalizeServiceDictionaryKey(reason.type || "REQUIREMENT");
  const key = reason.key || "";
  if (type === "MIN_EXPERIENCE") return `Experience: ${getServiceCategoryLabel(key)}`;
  if (type === "MIN_SKILL") return `Skill: ${serviceHumanizeKey(key)}`;
  if (type === "MIN_ABILITY") return `Ability: ${getServiceAbilityLabel(key)}`;
  if (type === "BIOLOGICAL_PROFILE") return "Biological Profile";
  if (type === "INSURANCE") {
    const profile = getServiceInsuranceProfileDefinition(key);
    return profile?.label ? `Insurance: ${profile.label}` : "Insurance";
  }
  if (type === "INSURANCE_DISALLOWED") return "Insurance Conflict";
  if (type === "CLEARANCE") return "Access Clearance";
  if (type === "RISK_SCORE") return "Civic Stability / Risk";
  return serviceHumanizeKey(type);
}

function formatServiceReasonValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value).replace(/_/g, " ");
}

function renderServiceEligibilityReasons(contract = {}, options = {}) {
  const reasons = contract.eligibility?.reasons || [];
  if (!Array.isArray(reasons) || !reasons.length) return "";
  const limit = Number(options.limit || 4);
  const visible = reasons.slice(0, limit);
  const overflow = reasons.length - visible.length;
  return `
    <span class="service-contract-requirements ${options.detailed ? "is-detailed" : ""}">
      ${visible.map((reason) => `
        <i>
          <b>${escapeHtml(getServiceRequirementSubjectLabel(reason))}</b>
          <span>${escapeHtml(formatServiceReasonValue(reason.current))} / REQ ${escapeHtml(formatServiceReasonValue(reason.required))}</span>
        </i>
      `).join("")}
      ${overflow > 0 ? `<i><b>Additional Requirements</b><span>${escapeHtml(overflow)} more blocked check${overflow === 1 ? "" : "s"}</span></i>` : ""}
    </span>
  `;
}

const SERVICE_REQUIREMENT_GROUPS = [
  { id: "PROFILE", label: "Profile", reasonTypes: ["BIOLOGICAL_PROFILE"] },
  { id: "ABILITIES", label: "Abilities", reasonTypes: ["MIN_ABILITY"] },
  { id: "SKILLS", label: "Skills", reasonTypes: ["MIN_SKILL"] },
  { id: "EXP", label: "EXP", reasonTypes: ["MIN_EXPERIENCE"] },
  { id: "INSURANCE", label: "Insurance", reasonTypes: ["INSURANCE", "INSURANCE_DISALLOWED"] },
  { id: "CLEARANCE", label: "Clearance", reasonTypes: ["CLEARANCE"] },
  { id: "RISK", label: "Risk", reasonTypes: ["RISK_SCORE"] }
];

function getServiceRequirementGroupIdForReason(reason = {}) {
  const type = normalizeServiceDictionaryKey(reason.type || "REQUIREMENT");
  const group = SERVICE_REQUIREMENT_GROUPS.find((item) => item.reasonTypes.includes(type));
  return group?.id || "";
}

function getServiceRequirementSnapshotState(contract = {}) {
  const reasons = Array.isArray(contract.eligibility?.reasons) ? contract.eligibility.reasons : [];
  const failed = new Set(reasons.map(getServiceRequirementGroupIdForReason).filter(Boolean));
  const groups = SERVICE_REQUIREMENT_GROUPS.map((group) => ({
    ...group,
    met: !failed.has(group.id)
  }));
  const metCount = groups.filter((group) => group.met).length;
  return {
    groups,
    metCount,
    total: groups.length,
    missing: groups.filter((group) => !group.met)
  };
}

function renderServiceContractRequirementStrip(contract = {}) {
  const snapshot = getServiceRequirementSnapshotState(contract);
  return `
    <div class="service-contract-requirement-block">
      <div class="service-contract-requirement-head">
        <span>Requirements</span>
        <strong>${escapeHtml(snapshot.metCount)} / ${escapeHtml(snapshot.total)} MET</strong>
      </div>
      <div class="service-contract-requirement-strip" aria-label="Service requirement groups">
        ${snapshot.groups.map((group) => `
          <i class="${group.met ? "is-met" : "is-missing"}">
            <span>${escapeHtml(group.label)}</span>
            <b>${group.met ? "✓" : "×"}</b>
          </i>
        `).join("")}
      </div>
    </div>
  `;
}

function getServiceContractReadinessLabel(contract = {}) {
  const status = String(contract.status || "AVAILABLE").toUpperCase();
  if (status === "ACTIVE") return "Assignment in progress";
  if (status === "REJECTED") return "Offer rejected";
  if (status === "EXPIRED") return "Offer expired";
  if (status === "COMPLETED") return "Service completed";
  const snapshot = getServiceRequirementSnapshotState(contract);
  if (snapshot.missing.length) return `Missing: ${snapshot.missing.map((group) => group.label).join(", ")}`;
  return status === "LOCKED" ? "Requirements not met" : "Ready for assignment";
}

function getServiceRequirementRows(citizen = {}, offer = {}) {
  const rows = [];
  const requirements = offer.requirements || {};
  const profile = String(citizen.biologicalProfile || citizen.profile || "NONE").toUpperCase();
  const allowed = Array.isArray(requirements.biologicalProfiles) ? requirements.biologicalProfiles.join(" / ") : "ANY";
  if (allowed !== "ANY") rows.push({ label: "Biological Profile", current: profile || "NONE", required: allowed });

  (requirements.minExperience || []).forEach((item) => {
    const categoryId = item.categoryId || item.id || item.key || item.category || "";
    rows.push({
      label: `Experience: ${getServiceCategoryLabel(categoryId)}`,
      current: window.ServiceRequirements?.getExperienceValue?.(citizen, categoryId) ?? 0,
      required: item.value ?? item.min ?? item.required ?? 0
    });
  });

  (requirements.minSkills || []).forEach((item) => {
    const skillId = item.id || item.skillId || item.key || "";
    rows.push({
      label: `Skill ${serviceHumanizeKey(skillId)}`,
      current: window.ServiceRequirements?.getSkillValue?.(citizen, skillId) ?? 0,
      required: item.value ?? item.min ?? item.required ?? 0
    });
  });

  (requirements.minAbilities || []).forEach((item) => {
    const abilityId = item.id || item.abilityId || item.key || "";
    rows.push({
      label: `Ability: ${getServiceAbilityLabel(abilityId)}`,
      current: window.ServiceRequirements?.getAbilityValue?.(citizen, abilityId) ?? 0,
      required: item.value ?? item.min ?? item.required ?? 0
    });
  });

  if (requirements.insurance) {
    const coverage = window.ServiceRequirements?.getInsuranceCoverage?.(citizen) || { labels: [] };
    const profileDef = requirements.insurance.profileId ? getServiceInsuranceProfileDefinition(requirements.insurance.profileId) : requirements.insurance;
    rows.push({
      label: "Insurance",
      current: coverage.labels?.length ? coverage.labels.join(" / ") : "none",
      required: window.ServiceRequirements?.describeInsuranceRequirement?.(profileDef) || "Insurance required"
    });
  }

  if (requirements.requiredClearance) rows.push({ label: "Clearance", current: citizen.clearance || (citizen.accessTags || []).join(" / ") || "PUBLIC", required: requirements.requiredClearance });
  if (requirements.maxRiskScore !== undefined && requirements.maxRiskScore !== null) rows.push({ label: "Risk Score", current: citizen.risk ?? citizen.riskScore ?? 0, required: `<= ${requirements.maxRiskScore}` });
  return rows;
}

function renderServiceRequirementSnapshot(citizen = {}, offer = {}) {
  const rows = getServiceRequirementRows(citizen, offer);
  if (!rows.length) return "";
  return `
    <section class="service-requirement-snapshot">
      <header>
        <p class="kicker">QUALIFICATION CHECK</p>
        <small>Current citizen record compared against offer requirements.</small>
      </header>
      <div class="service-requirement-grid">
        ${rows.map((row) => `
          <article>
            <span>${escapeHtml(row.label)}</span>
            <b>${escapeHtml(formatServiceReasonValue(row.current))}</b>
            <small>REQ ${escapeHtml(formatServiceReasonValue(row.required))}</small>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function getCitizenServiceExperienceMap(citizen = {}) {
  const raw = citizen.serviceExperience || citizen.serviceCategoryExperience || {};
  const map = {};
  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      const key = normalizeServiceDictionaryKey(item.categoryId || item.id || item.key || item.category || "");
      const value = Number(item.value ?? item.level ?? item.amount ?? 0);
      if (key && Number.isFinite(value) && value > 0) map[key] = Math.max(map[key] || 0, Math.round(value));
    });
    return map;
  }
  if (raw && typeof raw === "object") {
    Object.entries(raw).forEach(([key, value]) => {
      const normalized = normalizeServiceDictionaryKey(key);
      const number = Number(value || 0);
      if (normalized && Number.isFinite(number) && number > 0) map[normalized] = Math.round(number);
    });
  }
  return map;
}

function getServiceExperienceLastGrant(serviceLog = [], categoryId = "") {
  const key = normalizeServiceDictionaryKey(categoryId);
  const entries = Array.isArray(serviceLog) ? serviceLog : [];
  const matches = entries
    .filter((record) => record.experienceGrantedAt && getServiceExperienceGainEntries(record).some((item) => normalizeServiceDictionaryKey(item.categoryId) === key))
    .sort((a, b) => String(b.experienceGrantedAt || "").localeCompare(String(a.experienceGrantedAt || "")));
  return matches[0] || null;
}

function getServiceExperienceStats(serviceLog = [], categoryId = "") {
  const key = normalizeServiceDictionaryKey(categoryId);
  const entries = Array.isArray(serviceLog) ? serviceLog : [];
  return entries.reduce((acc, record) => {
    const recordCategory = normalizeServiceDictionaryKey(record.categoryId || "");
    const hasReward = getServiceExperienceGainEntries(record).some((item) => normalizeServiceDictionaryKey(item.categoryId) === key);
    if (recordCategory !== key && !hasReward) return acc;
    const status = String(record.status || "ACTIVE").toUpperCase();
    if (status === "ACTIVE") acc.active += 1;
    if (status === "COMPLETED") acc.completed += 1;
    return acc;
  }, { active: 0, completed: 0 });
}

const SERVICE_EXPERIENCE_THRESHOLDS = [0, 10, 25, 50, 100, 175, 275];

function getServiceExperienceProgress(value = 0) {
  const current = Math.max(0, Number(value || 0));
  let previous = SERVICE_EXPERIENCE_THRESHOLDS[0];
  let next = SERVICE_EXPERIENCE_THRESHOLDS[SERVICE_EXPERIENCE_THRESHOLDS.length - 1];
  for (let index = 1; index < SERVICE_EXPERIENCE_THRESHOLDS.length; index += 1) {
    if (current < SERVICE_EXPERIENCE_THRESHOLDS[index]) {
      previous = SERVICE_EXPERIENCE_THRESHOLDS[index - 1];
      next = SERVICE_EXPERIENCE_THRESHOLDS[index];
      break;
    }
    previous = SERVICE_EXPERIENCE_THRESHOLDS[index];
  }
  const cappedNext = current >= next ? Math.max(next, current) : next;
  const span = Math.max(1, cappedNext - previous);
  const percent = current >= next && next === previous ? 100 : Math.max(0, Math.min(100, ((current - previous) / span) * 100));
  return { previous, next: cappedNext, percent: Math.round(percent) };
}

function getServiceLastGrantLabel(record = null, categoryId = "") {
  if (!record) return "No grant trace";
  const key = normalizeServiceDictionaryKey(categoryId);
  const gain = getServiceExperienceGainEntries(record).find((item) => normalizeServiceDictionaryKey(item.categoryId) === key);
  const amount = gain ? `+${gain.value} ` : "";
  const title = record.title || "Service";
  const date = record.experienceGrantedAt ? ` / ${window.WS_APP.formatDateDisplay(record.experienceGrantedAt)}` : "";
  return `${amount}from ${title}${date}`;
}

function getCitizenServiceExperienceEntries(citizen = {}, serviceLog = normalizeServiceLogEntries(citizen)) {
  const experience = getCitizenServiceExperienceMap(citizen);
  const categories = getServiceDatabase().serviceCategories || [];
  return Object.entries(experience)
    .map(([categoryId, value]) => {
      const category = categories.find((item) => normalizeServiceDictionaryKey(item.id) === categoryId) || {};
      const lastGrant = getServiceExperienceLastGrant(serviceLog, categoryId);
      const stats = getServiceExperienceStats(serviceLog, categoryId);
      return {
        categoryId,
        label: category.label || getServiceCategoryLabel(categoryId),
        parentCategory: category.parentCategory || "",
        description: category.description || "No category description registered.",
        value,
        progress: getServiceExperienceProgress(value),
        lastGrant,
        active: stats.active,
        completed: stats.completed
      };
    })
    .sort((a, b) => Number(b.value || 0) - Number(a.value || 0) || String(a.label || "").localeCompare(String(b.label || "")));
}

function renderServiceExperiencePanel(user, citizen = {}, serviceLog = normalizeServiceLogEntries(citizen), offerSummary = {}) {
  const entries = getCitizenServiceExperienceEntries(citizen, serviceLog);
  const active = serviceLog.filter((record) => String(record.status || "").toUpperCase() === "ACTIVE").length;
  const completed = serviceLog.filter((record) => String(record.status || "").toUpperCase() === "COMPLETED").length;
  const available = Math.max(0, Number(offerSummary.available || 0) || 0);
  const locked = Math.max(0, Number(offerSummary.locked || 0) || 0);
  return `
    <section class="service-experience-panel">
      <header class="service-contracts-head service-experience-head">
        <div>
          <h6>Service Experience</h6>
          <small>Category experience is granted by completed Service records and used by future offer requirements.</small>
        </div>
        <span>${escapeHtml(entries.length)} CATEGOR${entries.length === 1 ? "Y" : "IES"}</span>
      </header>
      <div class="service-experience-summary-grid">
        ${renderServiceExperienceMetric("Active Services", active)}
        ${renderServiceExperienceMetric("Completed Services", completed)}
        ${renderServiceExperienceMetric("Available Offers", available)}
        ${renderServiceExperienceMetric("Locked Offers", locked)}
      </div>
      <div class="service-experience-grid">
        ${entries.length ? entries.map((entry) => renderServiceExperienceCard(entry)).join("") : '<p class="file-empty">No service experience granted yet. Complete active service records to build category experience.</p>'}
      </div>
    </section>
  `;
}

function renderServiceExperienceMetric(label, value) {
  return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function renderServiceExperienceCard(entry = {}) {
  const progress = entry.progress || getServiceExperienceProgress(entry.value);
  const last = getServiceLastGrantLabel(entry.lastGrant, entry.categoryId);
  return `
    <article class="service-experience-card" style="--service-exp-progress: ${escapeHtml(progress.percent)}%">
      <header>
        <span>
          <b>${escapeHtml(entry.label)}</b>
          <small>${escapeHtml(entry.parentCategory ? `${entry.parentCategory} / ${entry.categoryId}` : entry.categoryId)}</small>
        </span>
        <strong>${escapeHtml(progress.percent)}%</strong>
      </header>
      <div class="service-experience-progress" aria-label="${escapeHtml(entry.label)} service experience progress">
        <span></span>
      </div>
      <p>${escapeHtml(entry.description)}</p>
      <div class="service-experience-card-meta">
        <i>Current ${escapeHtml(entry.value)} / Next ${escapeHtml(progress.next)}</i>
        <i>Active ${escapeHtml(entry.active)}</i>
        <i>Completed ${escapeHtml(entry.completed)}</i>
        <i>Last ${escapeHtml(last)}</i>
      </div>
    </article>
  `;
}

function renderServiceCvRecord(entry = {}, options = {}) {
  const compact = options.compact === true;
  const dateRange = getServiceCompletionRangeLabel(entry);
  const scope = getServiceWorkScopeLabel(entry);
  const payment = getServiceLogPaymentLabel(entry);
  return `
    <article class="service-cv-record is-positive ${compact ? "is-compact" : ""}">
      <time class="service-cv-date service-cv-date-range">${escapeHtml(dateRange)}</time>
      <div class="service-cv-main">
        <b>${escapeHtml(entry.title || "Completed Service")}</b>
        <small>${escapeHtml(entry.provider || "LOCAL SERVICE REGISTRY")} / ${escapeHtml(entry.providerClass || entry.employerType || getServiceProviderKind(entry.provider, entry.category))}</small>
        <small>${escapeHtml(scope)}</small>
      </div>
      <strong>${escapeHtml(payment)}</strong>
    </article>
  `;
}

function normalizeServiceLogEntries(citizen = {}) {
  const source = typeof window.WS_APP.getCitizenServiceLog === "function"
    ? window.WS_APP.getCitizenServiceLog(citizen.id)
    : (Array.isArray(citizen.serviceLog) ? citizen.serviceLog : []);

  return (Array.isArray(source) ? source : []).map((record, index) => {
    const category = normalizeServiceCategoryLabel(record.category || record.serviceCategory || inferServiceCategoryFromLabel(record.typeLabel));
    const form = normalizeServiceFormLabel(record.form || record.serviceForm || inferServiceFormFromLabel(record.typeLabel));
    const typeLabel = record.typeLabel || getServiceTypeLabel(category, form);
    return {
      id: record.id || `service-log-${index}`,
      offerId: record.offerId || "",
      generatedOfferId: record.generatedOfferId || record.offerId || "",
      templateId: record.templateId || "",
      employerId: record.employerId || "",
      providerId: record.providerId || record.employerId || "",
      organizationId: record.organizationId || "",
      employerType: record.employerType || record.providerClass || "",
      categoryId: record.categoryId || record.workCategoryId || "",
      subcategoryId: record.subcategoryId || "",
      workCharacterId: record.workCharacterId || "",
      settlementWeek: record.settlementWeek || "",
      sourceType: record.sourceType || record.offerSourceType || record.source || "SERVICE_LOG",
      title: record.title || record.name || "Service Record",
      provider: record.provider || "LOCAL SERVICE REGISTRY",
      category,
      form,
      typeLabel,
      status: String(record.status || "ACTIVE").toUpperCase(),
      amount: parseCreditValue(record.amount ?? record.payment),
      payment: parseCreditValue(record.amount ?? record.payment),
      cycle: String(record.cycle || "WEEKLY").toUpperCase(),
      durationWeeks: Number(record.durationWeeks || 0),
      durationType: getServiceDurationLabel(typeLabel, record),
      dueDate: record.dueDate || record.deadline || "",
      providerClass: record.providerClass || getServiceProviderKind(record.provider, category),
      details: record.details || record.description || "No service detail registered.",
      result: String(record.result || "").toUpperCase(),
      acceptedAt: record.acceptedAt || record.startedAt || record.createdAt || "",
      startedAt: record.startedAt || record.acceptedAt || "",
      completedAt: record.completedAt || "",
      archivedAt: record.archivedAt || "",
      updatedAt: record.updatedAt || "",
      serviceIncomeId: record.serviceIncomeId || "",
      payoutStatus: String(record.payoutStatus || record.commissionPayoutStatus || "").trim().toUpperCase(),
      payoutSettledAt: record.payoutSettledAt || "",
      payoutApprovedAt: record.payoutApprovedAt || "",
      payoutRejectedAt: record.payoutRejectedAt || "",
      payoutNote: record.payoutNote || "",
      scopeSnapshot: Array.isArray(record.scopeSnapshot) ? record.scopeSnapshot : [],
      workScope: record.workScope || null,
      createdBy: record.createdBy || "SYSTEM",
      source: record.source || "Service Log",
      compliance: record.compliance || "Neutral",
      rewards: record.rewards || {},
      experienceGain: normalizeServiceExperienceGainForUi(record.experienceGain || record.rewards?.experienceGain || []),
      experienceGrantedAt: record.experienceGrantedAt || "",
      experienceGrantedBy: record.experienceGrantedBy || "",
      completedBy: record.completedBy || "",
      completionMode: record.completionMode || ""
    };
  });
}

function getStoredServiceOffers() {
  const offers = typeof window.WS_APP.getServiceOffers === "function" ? window.WS_APP.getServiceOffers() : [];
  return (Array.isArray(offers) ? offers : []).map((offer) => normalizeServiceOfferForUi(offer, "Admin Offer"));
}

function normalizeServiceOfferForUi(offer = {}, source = "Service Offer") {
  const category = normalizeServiceCategoryLabel(offer.category || offer.serviceCategory);
  const form = normalizeServiceFormLabel(offer.form || offer.serviceForm || offer.type);
  const typeLabel = offer.typeLabel || getServiceTypeLabel(category, form);
  const durationWeeks = Number(offer.durationWeeks || 0);
  return {
    id: offer.id || `offer-${slugifyRecordId(offer.title || "service")}`,
    generatedOfferId: offer.generatedOfferId || offer.id || "",
    templateId: offer.templateId || "",
    employerId: offer.employerId || "",
    providerId: offer.providerId || offer.employerId || "",
    organizationId: offer.organizationId || "",
    employerType: offer.employerType || offer.providerClass || "",
    categoryId: offer.categoryId || offer.workCategoryId || "",
    subcategoryId: offer.subcategoryId || "",
    workCharacterId: offer.workCharacterId || "",
    settlementWeek: offer.settlementWeek || "",
    sourceType: String(offer.sourceType || offer.offerSourceType || offer.source || "MANUAL_ADMIN").trim().toUpperCase(),
    title: offer.title || offer.name || "Service Offer",
    provider: offer.provider || "LOCAL SERVICE REGISTRY",
    category,
    form,
    typeLabel,
    status: String(offer.status || "AVAILABLE").toUpperCase(),
    amount: parseCreditValue(offer.amount ?? offer.payment),
    payment: parseCreditValue(offer.amount ?? offer.payment),
    paymentLabel: `${formatCredits(offer.amount ?? offer.payment)} / ${form === "COMMISSION" ? "COMPLETION" : "WEEK"}`,
    durationWeeks,
    durationType: offer.durationType || (form === "COMMISSION" ? "One-Time" : form === "AGREEMENT" ? "Indefinite" : `${durationWeeks || 1} Weeks`),
    dueDate: offer.dueDate || offer.deadline || "",
    providerClass: offer.providerClass || getServiceProviderKind(offer.provider, category),
    source,
    details: offer.details || offer.description || "Official service offer available for acceptance.",
    compliance: offer.compliance || "Neutral",
    marketModifiers: Array.isArray(offer.marketModifiers) ? offer.marketModifiers : [],
    reputationScore: Number(offer.reputationScore || 0),
    lifecycleNote: offer.lifecycleNote || offer.lifecycleState?.reason || "",
    rewards: offer.rewards || {},
    experienceGain: normalizeServiceExperienceGainForUi(offer.experienceGain || offer.rewards?.experienceGain || []),
    eligibility: offer.eligibility || { eligible: true, status: "AVAILABLE", reasons: [] }
  };
}

function getServiceCitizenForUser(user) {
  return user?.role === "admin"
    ? (window.WS_APP.getCitizenById?.(window.WS_APP.serviceTargetCitizenId) || getVisibleCitizensForMetrics(user)[0])
    : window.WS_APP.getCitizenById?.(user?.citizenId);
}

function getServiceBaseContext(user) {
  const citizen = getServiceCitizenForUser(user);
  if (!citizen) return null;

  const serviceLog = normalizeServiceLogEntries(citizen);
  return {
    citizen,
    serviceLog,
    completedServiceLog: getServiceCompletedEntries(serviceLog)
  };
}

function getServiceContractsContext(user, baseContext = getServiceBaseContext(user)) {
  if (!baseContext) return null;
  const contracts = getCitizenServiceContracts(baseContext.citizen, baseContext.serviceLog);
  return {
    ...baseContext,
    contracts,
    offerSummary: getServiceOfferSummary(baseContext.citizen, contracts)
  };
}

function getServiceIncomeContext(user, baseContext = getServiceBaseContext(user)) {
  if (!baseContext) return null;
  const ledger = window.WS_APP.getCitizenFinancialLedger(baseContext.citizen);
  return {
    ...baseContext,
    ledger,
    incomeSources: window.WS_APP.getCitizenWeeklyIncomeSources?.(baseContext.citizen) || ledger.income,
    offerSummary: getServiceOfferSummary(baseContext.citizen)
  };
}

function getServiceLogContext(user, baseContext = getServiceBaseContext(user)) {
  if (!baseContext) return null;
  return {
    ...baseContext,
    offerSummary: getServiceOfferSummary(baseContext.citizen)
  };
}

function getServiceExperienceContext(user, baseContext = getServiceBaseContext(user)) {
  if (!baseContext) return null;
  return {
    ...baseContext,
    offerSummary: getServiceOfferSummary(baseContext.citizen)
  };
}

function getServicePanelContext(user, activePanel = getServiceActivePanel()) {
  const baseContext = getServiceBaseContext(user);
  if (!baseContext) return null;
  if (activePanel === "contracts" || activePanel === "offer") {
    return getServiceContractsContext(user, baseContext);
  }
  if (activePanel === "income") return getServiceIncomeContext(user, baseContext);
  if (activePanel === "experience") return getServiceExperienceContext(user, baseContext);
  return getServiceLogContext(user, baseContext);
}

function renderServiceSectionContent(user, context, activePanel = getServiceActivePanel()) {
  const { citizen, contracts = [], serviceLog, completedServiceLog, incomeSources = [], offerSummary = {} } = context;
  if (activePanel === "income") {
    if (typeof renderIncomeSourcesPanel !== "function") {
      return '<section class="service-panel-loading" role="status">Income Sources renderer is loading.</section>';
    }
    return renderIncomeSourcesPanel(user, citizen, incomeSources);
  }
  if (activePanel === "contracts") return renderServiceContractsPanel(user, citizen, contracts);
  if (activePanel === "experience") return renderServiceExperiencePanel(user, citizen, serviceLog, offerSummary);
  if (activePanel === "offer") return renderServiceOfferProfile(user, citizen, contracts);
  if (activePanel === "log") return renderServiceLogPanel(user, citizen, completedServiceLog);
  if (activePanel === "log-details") return renderServiceLogDetailsPanel(user, citizen, completedServiceLog);
  return "";
}

function syncServiceTabState(root, activePanel = getServiceActivePanel()) {
  const primaryTabId = getServicePrimaryTabId(activePanel);
  root.querySelector(".service-section-body")?.setAttribute("aria-labelledby", `service-tab-${primaryTabId}`);
  root.querySelectorAll("[data-service-panel]").forEach((button) => {
    const isActive = button.dataset.servicePanel === primaryTabId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.tabIndex = isActive ? 0 : -1;
  });
}

function syncServiceLogSelectionState(root) {
  if (!root) return;
  const selected = Array.from(root.querySelectorAll("[data-service-log-select]:checked"));
  const statusSelect = root.querySelector("[data-service-log-status-select]");
  const summary = root.querySelector("[data-service-log-selection-summary]");
  if (statusSelect && selected.length === 1 && selected[0]?.dataset?.currentStatus) {
    statusSelect.value = selected[0].dataset.currentStatus;
  }
  if (summary) {
    summary.textContent = `${selected.length} selected`;
    summary.classList.toggle("has-selection", selected.length > 0);
  }
}

function refreshServiceShellSummary(root, user, context) {
  const contextShell = root.querySelector("[data-service-citizen-context-shell]");
  if (contextShell) {
    contextShell.innerHTML = renderServiceCitizenContext(
      user,
      context.citizen,
      context.serviceLog,
      context.offerSummary || getServiceOfferSummary(context.citizen, context.contracts)
    );
  }
  const rosterShell = root.querySelector("[data-service-active-roster-shell]");
  if (rosterShell) rosterShell.innerHTML = renderServiceActiveRoster(context.citizen, user, context.serviceLog);
}

function getServiceViewportScrollTarget(root, viewport = {}) {
  const targetScrollY = Number(viewport.scrollY);
  if (!Number.isFinite(targetScrollY)) return window.scrollY;

  const tabs = root?.querySelector(".service-tabs");
  const currentDocumentTop = tabs
    ? window.scrollY + tabs.getBoundingClientRect().top
    : Number(viewport.tabsDocumentTop);
  const previousDocumentTop = Number(viewport.tabsDocumentTop);
  const documentDelta = Number.isFinite(currentDocumentTop) && Number.isFinite(previousDocumentTop)
    ? currentDocumentTop - previousDocumentTop
    : 0;
  return targetScrollY + documentDelta;
}

function restoreServiceViewportNow(root, viewport = {}, revision = serviceViewportRestoreRevision) {
  if (
    revision !== serviceViewportRestoreRevision
    || !root?.isConnected
    || window.WS_APP.currentModuleId !== "service"
  ) return false;

  const scrollingElement = document.scrollingElement || document.documentElement;
  const maxScrollY = Math.max(0, scrollingElement.scrollHeight - window.innerHeight);
  const targetScrollX = Number(viewport.scrollX);
  const targetScrollY = getServiceViewportScrollTarget(root, viewport);
  window.scrollTo(
    Number.isFinite(targetScrollX) ? targetScrollX : window.scrollX,
    Math.min(Math.max(0, targetScrollY), maxScrollY)
  );
  return true;
}

function scheduleServiceViewportRestore(root, body, viewport = {}) {
  const revision = ++serviceViewportRestoreRevision;
  restoreServiceViewportNow(root, viewport, revision);

  window.requestAnimationFrame(() => {
    if (
      revision !== serviceViewportRestoreRevision
      || !root?.isConnected
      || !body?.isConnected
      || window.WS_APP.currentModuleId !== "service"
    ) return;

    body.style.removeProperty("height");
    body.style.removeProperty("min-height");
    body.style.removeProperty("overflow");
    body.removeAttribute("data-service-height-locked");
    restoreServiceViewportNow(root, viewport, revision);

    window.requestAnimationFrame(() => {
      restoreServiceViewportNow(root, viewport, revision);
    });
  });
}

function replaceServiceSectionBody(user, options = {}) {
  const root = document.querySelector("[data-service-root]");
  const body = root?.querySelector(".service-section-body");
  if (!root || !body) return false;

  const transitionStartedAt = performance.now();
  const activePanel = getServiceActivePanel();
  if (options.skipIfUnchanged === true && root.dataset.serviceActivePanel === activePanel) {
    serviceUiMetrics.activeTabNoopCount += 1;
    return false;
  }

  const context = getServicePanelContext(user, activePanel);
  if (!context) return false;
  if (String(root.dataset.serviceCitizenId || "") !== String(context.citizen.id || "")) {
    renderServiceModule(user, { forceShell: true });
    return true;
  }

  const tabs = root.querySelector(".service-tabs");
  const tabsRect = tabs?.getBoundingClientRect();
  const viewportBefore = {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    tabsTop: tabsRect?.top,
    tabsDocumentTop: tabsRect ? window.scrollY + tabsRect.top : null
  };
  const lockedHeight = Math.max(0, Math.ceil(body.getBoundingClientRect().height));
  body.style.height = `${lockedHeight}px`;
  body.style.minHeight = `${lockedHeight}px`;
  body.style.overflow = "hidden";
  body.dataset.serviceHeightLocked = "true";

  body.innerHTML = renderServiceSectionContent(user, context, activePanel);
  root.dataset.serviceActivePanel = activePanel;
  syncServiceTabState(root, activePanel);
  if (options.refreshSummary !== false) refreshServiceShellSummary(root, user, context);
  syncServiceLogSelectionState(root);

  const focusTarget = options.focusSelector
    ? root.querySelector(options.focusSelector)
    : options.focusTab
      ? root.querySelector(`[data-service-panel="${getServicePrimaryTabId(activePanel)}"]`)
      : null;
  if (focusTarget instanceof HTMLElement) {
    focusTarget.focus({ preventScroll: true });
    if (focusTarget.matches("[data-service-contract-search]")) {
      const end = String(focusTarget.value || "").length;
      focusTarget.setSelectionRange?.(end, end);
    }
  }

  const renderDuration = performance.now() - transitionStartedAt;
  serviceUiMetrics.sectionRenderCount += 1;
  serviceUiMetrics.lastRenderPanel = activePanel;
  serviceUiMetrics.lastRenderDurationMs = Number(renderDuration.toFixed(3));
  root.dataset.serviceLastRenderPanel = activePanel;
  root.dataset.serviceLastRenderDurationMs = String(serviceUiMetrics.lastRenderDurationMs);

  scheduleServiceViewportRestore(root, body, viewportBefore);
  return true;
}

function renderServiceModule(user, options = {}) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");
  if (!container) return;

  terminalGrid?.classList.add("is-card-open");
  const previousModuleId = window.WS_APP.currentModuleId;
  const enteredService = previousModuleId !== "service";
  window.WS_APP.currentModuleId = "service";
  if (enteredService && !window.WS_APP.serviceSelectedOfferId) {
    window.WS_APP.serviceActivePanel = "contracts";
  }

  const activePanel = getServiceActivePanel();
  const citizen = getServiceCitizenForUser(user);
  if (!citizen) {
    renderModulePlaceholder(user, getModuleDefinition("service"));
    return;
  }

  window.WS_APP.serviceTargetCitizenId = citizen.id;
  if (status) status.textContent = `SERVICE / ${String(getCitizenNameLabel(citizen, { legal: true })).toUpperCase()}`;

  const existingRoot = container.querySelector("[data-service-root]");
  const sameCitizen = existingRoot
    && String(existingRoot.dataset.serviceCitizenId || "") === String(citizen.id || "");
  if (!options.forceShell && sameCitizen && replaceServiceSectionBody(user, { refreshSummary: true })) {
    existingRoot.__serviceActionContext = { user, citizenId: citizen.id };
    scheduleServiceIncomePreload(user);
    if (enteredService) scheduleServiceMarketOfferSync(citizen);
    return;
  }

  const context = getServicePanelContext(user, activePanel);
  if (!context) {
    renderModulePlaceholder(user, getModuleDefinition("service"));
    return;
  }
  const { contracts = [], serviceLog } = context;

  container.innerHTML = `
    <article class="module-detail service-module-view" data-service-root data-service-citizen-id="${escapeHtml(citizen.id)}" data-service-active-panel="${escapeHtml(activePanel)}">
      <div class="module-detail-head service-module-head">
        <div>
          <p class="kicker">SERVICE / WORK REGISTRY</p>
          <h4>Service</h4>
        </div>
        <div class="service-module-head-actions">
          <button class="module-back-button" type="button">Back</button>
        </div>
      </div>

      <div data-service-citizen-context-shell>
        ${renderServiceCitizenContext(user, citizen, serviceLog, context.offerSummary || getServiceOfferSummary(citizen, contracts))}
      </div>
      <div data-service-active-roster-shell>
        ${renderServiceActiveRoster(citizen, user, serviceLog)}
      </div>

      <nav class="service-tabs system-segment-tabs" aria-label="Service sections" role="tablist">
        ${renderServiceTab("contracts", "Contracts", activePanel)}
        ${renderServiceTab("income", "Income Sources", activePanel)}
        ${renderServiceTab("log", "Service Log", activePanel)}
        ${renderServiceTab("experience", "Experience", activePanel)}
      </nav>

      <div class="service-section-body" id="service-section-panel" role="tabpanel" aria-labelledby="service-tab-${escapeHtml(getServicePrimaryTabId(activePanel))}">
        ${renderServiceSectionContent(user, context, activePanel)}
      </div>
    </article>
  `;

  const root = container.querySelector("[data-service-root]");
  if (root) root.__serviceActionContext = { user, citizenId: citizen.id };
  window.WS_APP.bindModuleBackButton(user, () => window.WS_APP.renderModules(user));
  bindServiceModuleActions(user, citizen);
  syncServiceTabState(root, activePanel);
  syncServiceLogSelectionState(root);
  scheduleServiceIncomePreload(user);
  if (enteredService) scheduleServiceMarketOfferSync(citizen);
}

function renderServiceCitizenSwitcher(selectedId) {
  const citizens = getVisibleCitizensForMetrics(window.WS_APP.currentUser);
  return `
    <label class="service-citizen-context-selector">
      <span>Admin Target</span>
      <select data-service-target-citizen>
        ${citizens.map((citizen) => `
          <option value="${escapeHtml(citizen.id)}" ${citizen.id === selectedId ? "selected" : ""}>${escapeHtml(getCitizenNameLabel(citizen, { legal: true }))} / ${escapeHtml(getCitizenShortId(citizen) || citizen.id)}</option>
        `).join("")}
      </select>
    </label>
  `;
}

function renderServiceCitizenContext(user, citizen = {}, serviceLog = normalizeServiceLogEntries(citizen), offerSummary = {}) {
  if (user?.role !== "admin") return "";

  const activeServices = serviceLog.filter((entry) => String(entry.status || "").toUpperCase() === "ACTIVE").length;
  const completedServices = getServiceCompletedEntries(serviceLog).length;
  const pendingPayments = window.WS_APP.getCitizenPendingServicePayments?.(citizen) || [];
  const experienceEntries = getCitizenServiceExperienceEntries(citizen, serviceLog);
  const profile = citizen.biologicalProfile || citizen.profile || "UNCLASSIFIED";
  const risk = citizen.riskScore ?? citizen.risk ?? citizen.civicRisk ?? "—";
  return `
    <section class="service-citizen-context">
      <div class="service-citizen-context__identity">
        <p class="kicker">ADMIN SERVICE TARGET</p>
        <h5>${escapeHtml(getCitizenNameLabel(citizen, { legal: true }))}</h5>
        <small>${escapeHtml(getCitizenShortId(citizen) || citizen.id || "NO ID")} / ${escapeHtml(profile)}</small>
      </div>
      <div class="service-citizen-context__metrics">
        ${renderServiceContextMetric("Risk", risk)}
        ${renderServiceContextMetric("Active", activeServices)}
        ${renderServiceContextMetric("Completed", completedServices)}
        ${renderServiceContextMetric("Pending Pay", pendingPayments.length)}
        ${renderServiceContextMetric("Offers", Math.max(0, Number(offerSummary.total || 0) || 0))}
        ${renderServiceContextMetric("EXP Fields", experienceEntries.length)}
      </div>
      ${user.role === "admin" ? renderServiceCitizenSwitcher(citizen.id) : ""}
    </section>
  `;
}

function renderServiceContextMetric(label, value) {
  return `
    <article class="service-citizen-context-metric">
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(value)}</b>
    </article>
  `;
}

function renderServiceTab(id, label, activePanel) {
  const descriptions = {
    contracts: "Browse available duties, contracts and commissions.",
    income: "Review active service income routed to settlement.",
    experience: "Track service category experience and qualification growth.",
    log: "Inspect completed work record and verified service history."
  };
  const isActive = getServicePrimaryTabId(activePanel) === id;
  return `
    <button class="service-tab system-segment-tile system-segment-tile--card ${isActive ? "is-active" : ""}" type="button" role="tab" id="service-tab-${escapeHtml(id)}" aria-controls="service-section-panel" aria-selected="${isActive ? "true" : "false"}" tabindex="${isActive ? "0" : "-1"}" data-service-panel="${escapeHtml(id)}">
      <span class="system-segment-tile__body">
        <b class="system-segment-tile__title">${escapeHtml(label)}</b>
        <small class="system-segment-tile__description">${escapeHtml(descriptions[id] || "Open service section.")}</small>
      </span>
    </button>
  `;
}

function createServiceCacheToken(value) {
  let serialized = "";
  try {
    serialized = JSON.stringify(value ?? null);
  } catch (_error) {
    serialized = String(value ?? "");
  }
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getServiceEligibilityRevisionSnapshot(citizen = {}) {
  let installedCyberware = [];
  try {
    installedCyberware = window.WS_APP.getInstalledCyberwareInstanceViews?.(citizen.id) || [];
  } catch (_error) {
    installedCyberware = [];
  }

  return {
    revision: citizen.revision || 0,
    updatedAt: citizen.updatedAt || "",
    biologicalProfile: citizen.biologicalProfile || citizen.profile || "",
    classProfile: citizen.classProfile || "",
    clearance: citizen.clearance || "",
    accessTags: citizen.accessTags || [],
    riskScore: citizen.riskScore ?? citizen.risk ?? citizen.civicRisk ?? null,
    abilities: citizen.abilities || [],
    skills: citizen.skills || [],
    serviceExperience: citizen.serviceExperience || {},
    serviceReputation: citizen.serviceReputation || citizen.serviceEmployerReputation || {},
    subscriptions: citizen.subscriptions || [],
    installedCyberware: installedCyberware.map((item) => ({
      instanceId: item.instanceId || item.id || "",
      definitionId: item.definitionId || item.catalogId || "",
      revision: item.revision || item.schemaVersion || 0,
      status: item.operationalState || item.status || ""
    }))
  };
}

function buildServiceOfferCacheKey(citizen = {}, serviceLog = [], manualOffers = [], settlementWeek = "") {
  const database = window.APP_DATA?.serviceDatabase || {};
  const serviceOfferStatesRevision = createServiceCacheToken(citizen.serviceOfferStates || {});
  const serviceLogRevision = createServiceCacheToken(serviceLog.map((record) => ({
    id: record.id,
    status: record.status,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt,
    payoutStatus: record.payoutStatus,
    experienceGrantedAt: record.experienceGrantedAt
  })));
  const eligibilityRevision = createServiceCacheToken(getServiceEligibilityRevisionSnapshot(citizen));
  const serviceDatabaseRevision = createServiceCacheToken({
    version: database.version || database.revision || "",
    status: database.status || "",
    templates: Array.isArray(database.serviceOfferTemplates) ? database.serviceOfferTemplates.length : 0,
    employers: Array.isArray(database.serviceEmployers) ? database.serviceEmployers.length : 0
  });
  const manualOffersRevision = createServiceCacheToken(manualOffers.map((offer) => ({
    id: offer.id,
    status: offer.status,
    updatedAt: offer.updatedAt,
    targetCitizenId: offer.targetCitizenId,
    amount: offer.amount
  })));

  return [
    citizen.id || "",
    settlementWeek,
    serviceOfferStatesRevision,
    serviceLogRevision,
    eligibilityRevision,
    serviceDatabaseRevision,
    manualOffersRevision
  ].join("|");
}

function rememberServiceOfferCache(key, entry) {
  serviceOfferCache.set(key, entry);
  while (serviceOfferCache.size > SERVICE_OFFER_CACHE_LIMIT) {
    const oldestKey = serviceOfferCache.keys().next().value;
    serviceOfferCache.delete(oldestKey);
  }
  return entry;
}

function getServiceOfferCacheEntry(citizen = {}, serviceLog = normalizeServiceLogEntries(citizen)) {
  const manualOffers = getStoredServiceOffers();
  const settlementWeek = window.ServiceOfferGenerator?.getSettlementWeekKey?.() || "";
  const key = buildServiceOfferCacheKey(citizen, serviceLog, manualOffers, settlementWeek);
  const cached = serviceOfferCache.get(key);
  if (cached) return cached;

  let offers;
  if (window.ServiceOfferGenerator?.generateWeeklyOffers && window.APP_DATA?.serviceDatabase) {
    serviceUiMetrics.generateWeeklyOffersCalls += 1;
    offers = window.ServiceOfferGenerator.generateWeeklyOffers({
      character: citizen,
      citizen,
      database: window.APP_DATA.serviceDatabase,
      manualOffers,
      settlementWeek
    });
  } else {
    offers = [
      ...getServiceOfferTemplates(citizen),
      ...manualOffers
    ];
  }

  return rememberServiceOfferCache(key, {
    key,
    citizenId: String(citizen.id || ""),
    settlementWeek,
    offers,
    contracts: null,
    summary: null
  });
}

function getCitizenServiceContracts(citizen = {}, serviceLog = normalizeServiceLogEntries(citizen)) {
  const cacheEntry = getServiceOfferCacheEntry(citizen, serviceLog);
  if (Array.isArray(cacheEntry.contracts)) return cacheEntry.contracts;

  const generatedOffers = cacheEntry.offers;
  const activeRecords = serviceLog.filter((record) => String(record.status || "").toUpperCase() === "ACTIVE");
  const closedRecords = serviceLog.filter((record) => !["ACTIVE", "SUSPENDED"].includes(String(record.status || "").toUpperCase()));
  const closedKeys = getClosedServiceIdentityKeySet(closedRecords);
  const activeByKey = getServiceIdentityRecordMap(activeRecords);
  const renderedIds = new Set();

  const contracts = generatedOffers
    .filter((offer) => !hasAnyServiceIdentityKey(offer, closedKeys))
    .map((offer) => {
      const activeRecord = findServiceRecordForOffer(offer, activeByKey);
      const merged = activeRecord ? mergeActiveServiceOffer(offer, activeRecord) : offer;
      renderedIds.add(String(merged.id || ""));
      return merged;
    });

  activeRecords.forEach((record) => {
    const activeOffer = buildActiveServiceOfferFromRecord(record);
    if (!activeOffer.id || renderedIds.has(activeOffer.id)) return;
    renderedIds.add(activeOffer.id);
    contracts.push(activeOffer);
  });

  cacheEntry.contracts = contracts;
  cacheEntry.summary = getServiceOfferSummary(citizen, contracts);
  return contracts;
}

function getServiceMarketOffers(citizen = {}, options = {}) {
  const serviceLog = Array.isArray(options.serviceLog) ? options.serviceLog : normalizeServiceLogEntries(citizen);
  return getServiceOfferCacheEntry(citizen, serviceLog).offers;
}

function getServiceOfferSummary(citizen = {}, contracts = null) {
  if (Array.isArray(contracts)) {
    return {
      total: contracts.length,
      available: contracts.filter((offer) => String(offer.status || "").toUpperCase() === "AVAILABLE").length,
      locked: contracts.filter((offer) => String(offer.status || "").toUpperCase() === "LOCKED").length
    };
  }

  const cachedEntries = Array.from(serviceOfferCache.values()).reverse();
  const cached = cachedEntries.find((entry) => entry.citizenId === String(citizen.id || "") && entry.summary);
  if (cached?.summary) return cached.summary;

  const states = Object.values(window.WS_APP.getCitizenServiceOfferStates?.(citizen) || citizen.serviceOfferStates || {});
  const manualOffers = getStoredServiceOffers().filter((offer) => {
    const targetCitizenId = String(offer.targetCitizenId || offer.citizenId || offer.characterId || "").trim();
    return !targetCitizenId || targetCitizenId === String(citizen.id || "");
  });
  const records = [...states, ...manualOffers];
  return {
    total: records.length,
    available: records.filter((offer) => String(offer.status || "AVAILABLE").toUpperCase() === "AVAILABLE").length,
    locked: records.filter((offer) => String(offer.status || "").toUpperCase() === "LOCKED").length
  };
}

function runServiceIdleTask(callback, timeout = 800) {
  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(callback, { timeout });
  }
  return window.setTimeout(callback, 0);
}

function scheduleServiceIncomePreload(user) {
  if (
    typeof renderIncomeSourcesPanel === "function"
    || serviceIncomePreloadPromise
    || serviceIncomePreloadScheduled
  ) return;

  serviceIncomePreloadScheduled = true;
  serviceUiMetrics.incomePreloadRequests += 1;
  runServiceIdleTask(() => {
    serviceIncomePreloadScheduled = false;
    if (typeof renderIncomeSourcesPanel === "function") return;
    serviceIncomePreloadPromise = Promise.resolve(window.WS_APP.loadModuleBundle?.("service-income", user))
      .catch((error) => {
        console.warn("W&S Service income preload failed.", error);
      })
      .finally(() => {
        serviceIncomePreloadPromise = null;
      });
  }, 1200);
}

function scheduleServiceMarketOfferSync(citizen = {}, options = {}) {
  const citizenId = String(citizen.id || "").trim();
  if (
    !citizenId
    || typeof window.WS_APP.syncCitizenServiceMarketOffers !== "function"
    || serviceOfferSyncScheduled.has(citizenId)
  ) return;

  serviceOfferSyncScheduled.add(citizenId);
  runServiceIdleTask(() => {
    serviceOfferSyncScheduled.delete(citizenId);
    const currentCitizen = window.WS_APP.getCitizenById?.(citizenId) || citizen;
    const serviceLog = normalizeServiceLogEntries(currentCitizen);
    const cacheEntry = getServiceOfferCacheEntry(currentCitizen, serviceLog);
    const syncKey = `${cacheEntry.settlementWeek}|${cacheEntry.key}`;
    if (options.force !== true && serviceOfferSyncKeys.get(citizenId) === syncKey) return;
    serviceOfferSyncKeys.set(citizenId, syncKey);
    window.WS_APP.syncCitizenServiceMarketOffers(
      citizenId,
      cacheEntry.offers,
      cacheEntry.settlementWeek,
      { skipModuleRefresh: true, skipProfileRefresh: true }
    );
  }, 1000);
}

function invalidateServiceOfferCache(citizenId = "") {
  const normalizedCitizenId = String(citizenId || "").trim();
  Array.from(serviceOfferCache.entries()).forEach(([key, entry]) => {
    if (!normalizedCitizenId || entry.citizenId === normalizedCitizenId) serviceOfferCache.delete(key);
  });
  if (normalizedCitizenId) serviceOfferSyncKeys.delete(normalizedCitizenId);
  else serviceOfferSyncKeys.clear();
}

function bindServiceRuntimeListeners() {
  if (serviceRuntimeListenersBound) return;
  serviceRuntimeListenersBound = true;

  window.addEventListener("ws:campaign-date-updated", () => {
    invalidateServiceOfferCache();
    if (window.WS_APP.currentModuleId !== "service") return;
    const citizen = getServiceCitizenForUser(window.WS_APP.currentUser);
    if (citizen) scheduleServiceMarketOfferSync(citizen, { force: true });
  });

  window.addEventListener("ws:settlement-period-processed", () => {
    invalidateServiceOfferCache();
    if (window.WS_APP.currentModuleId !== "service") return;
    const citizen = getServiceCitizenForUser(window.WS_APP.currentUser);
    if (citizen) scheduleServiceMarketOfferSync(citizen, { force: true });
  });

  window.addEventListener("ws:citizens-updated", (event) => {
    const citizenId = String(event.detail?.id || "").trim();
    if (citizenId) invalidateServiceOfferCache(citizenId);
  });
}

function getServiceIdentityKeys(record = {}) {
  return [
    record.id,
    record.offerId,
    record.generatedOfferId,
    record.templateId,
    record.serviceTemplateId
  ].map((value) => String(value || "").trim()).filter(Boolean);
}

function getServiceIdentityKeySet(records = []) {
  const set = new Set();
  records.forEach((record) => getServiceIdentityKeys(record).forEach((key) => set.add(key)));
  return set;
}

function hasAnyServiceIdentityKey(record = {}, keySet = new Set()) {
  return getServiceIdentityKeys(record).some((key) => keySet.has(key));
}


function getClosedServiceIdentityKeySet(records = []) {
  const set = new Set();
  records.forEach((record) => {
    [record.id, record.offerId, record.generatedOfferId].map((value) => String(value || "").trim()).filter(Boolean).forEach((key) => set.add(key));
  });
  return set;
}

function getServiceIdentityRecordMap(records = []) {
  const map = new Map();
  records.forEach((record) => {
    getServiceIdentityKeys(record).forEach((key) => {
      if (!map.has(key)) map.set(key, record);
    });
  });
  return map;
}

function findServiceRecordForOffer(offer = {}, map = new Map()) {
  for (const key of getServiceIdentityKeys(offer)) {
    if (map.has(key)) return map.get(key);
  }
  return null;
}

function mergeActiveServiceOffer(offer = {}, record = {}) {
  return {
    ...offer,
    id: offer.id || record.offerId || record.id,
    status: "ACTIVE",
    isAccepted: true,
    activeServiceId: record.id,
    serviceIncomeId: record.serviceIncomeId || offer.serviceIncomeId || "",
    sourceType: record.sourceType || offer.sourceType || "GENERATED_WEEKLY",
    acceptedAt: record.acceptedAt || offer.acceptedAt || "",
    amount: record.amount || offer.amount,
    payment: record.payment || offer.payment || offer.amount,
    paymentLabel: getServiceHistoryPaymentLabel(record),
    durationWeeks: record.durationWeeks || offer.durationWeeks,
    durationType: record.durationType || offer.durationType,
    dueDate: record.dueDate || offer.dueDate,
    details: record.details || offer.details,
    rewards: record.rewards || offer.rewards || {},
    experienceGain: normalizeServiceExperienceGainForUi(record.experienceGain || record.rewards?.experienceGain || offer.experienceGain || offer.rewards?.experienceGain || []),
    experienceGrantedAt: record.experienceGrantedAt || "",
    experienceGrantedBy: record.experienceGrantedBy || "",
    eligibility: { eligible: false, status: "ACTIVE", reasons: [] },
    source: "ACTIVE SERVICE"
  };
}

function buildActiveServiceOfferFromRecord(record = {}) {
  const form = normalizeServiceFormLabel(record.form);
  return {
    id: record.offerId || record.generatedOfferId || record.id,
    generatedOfferId: record.generatedOfferId || record.offerId || "",
    templateId: record.templateId || "",
    title: record.title || "Active Service",
    provider: record.provider || "LOCAL SERVICE REGISTRY",
    providerClass: record.providerClass || getServiceProviderKind(record.provider, record.category),
    category: normalizeServiceCategoryLabel(record.category),
    categoryId: record.categoryId || "",
    subcategoryId: record.subcategoryId || "",
    workCharacterId: record.workCharacterId || "",
    form,
    typeLabel: record.typeLabel || getServiceTypeLabel(record.category, form),
    status: "ACTIVE",
    isAccepted: true,
    activeServiceId: record.id,
    serviceIncomeId: record.serviceIncomeId || "",
    amount: record.amount || record.payment || 0,
    payment: record.payment || record.amount || 0,
    paymentLabel: getServiceHistoryPaymentLabel(record),
    durationWeeks: record.durationWeeks || 0,
    durationType: record.durationType || getServiceDurationLabel(record.typeLabel, record),
    dueDate: record.dueDate || "",
    details: record.details || "Accepted service remains visible until completion.",
    settlementWeek: record.settlementWeek || "",
    sourceType: record.sourceType || "GENERATED_WEEKLY",
    source: "ACTIVE SERVICE",
    compliance: record.compliance || "Neutral",
    rewards: record.rewards || {},
    experienceGain: normalizeServiceExperienceGainForUi(record.experienceGain || record.rewards?.experienceGain || []),
    experienceGrantedAt: record.experienceGrantedAt || "",
    experienceGrantedBy: record.experienceGrantedBy || "",
    eligibility: { eligible: false, status: "ACTIVE", reasons: [] }
  };
}

function getServiceOfferTemplates(citizen = {}) {
  const profile = String(citizen.profile || citizen.biologicalProfile || "").toUpperCase();
  const betaBonus = profile.includes("BETA") || profile.includes("ALPHA") ? 600 : 0;
  return [
    normalizeServiceOfferForUi({
      id: "mandatory-sanitation-shift",
      title: "Sanitation Line Emergency Block",
      provider: "PlentyMin Labor Node",
      category: "MANDATORY",
      form: "CONTRACT",
      status: "AVAILABLE",
      durationWeeks: 2,
      amount: 1600 + betaBonus,
      details: "Fixed-duration mandatory service contract routed through weekly settlement.",
      compliance: "Positive"
    }, "Voluntary Mandatory Service"),
    normalizeServiceOfferForUi({
      id: "mandatory-queue-control",
      title: "Queue Control Auxiliary",
      provider: "Watch & Secure Civic Desk",
      category: "MANDATORY",
      form: "COMMISSION",
      status: "AVAILABLE",
      amount: 900,
      dueDate: "2109-02-24",
      details: "One-time public order commission. Admin completion converts it into settlement income.",
      compliance: "Positive"
    }, "Civic Duty Offer"),
    normalizeServiceOfferForUi({
      id: "regular-factory-repair",
      title: "Factory Commons Repair Shift",
      provider: "Factory Commons",
      category: "REGULAR",
      form: "CONTRACT",
      status: "AVAILABLE",
      durationWeeks: 4,
      amount: 3600 + betaBonus,
      details: "Fixed-duration private maintenance contract paid through official weekly settlement.",
      compliance: "Neutral"
    }, "Private Offer"),
    normalizeServiceOfferForUi({
      id: "regular-kagami-audit",
      title: "Endpoint Audit Runner",
      provider: "Kagami Kaisha",
      category: "REGULAR",
      form: "COMMISSION",
      status: "AVAILABLE",
      amount: 5200 + betaBonus,
      dueDate: "2109-02-24",
      details: "One-time controlled endpoint inspection. Admin completion converts it into settlement income.",
      compliance: "Neutral"
    }, "Private Offer")
  ];
}

function sortServiceContracts(contracts = [], sort = getServiceContractSort()) {
  const list = [...contracts];
  const payment = (item) => Number(item.payment || item.amount || 0);
  const duration = (item) => Number(item.durationWeeks || 0);
  const level = (item) => Number(item.level || 0);
  const title = (item) => String(item.title || "");
  const provider = (item) => String(item.provider || "LOCAL SERVICE REGISTRY");
  const status = (item) => String(item.status || "AVAILABLE");
  const source = (item) => getServiceSourceTypeLabel(item.sourceType || item.source || "SERVICE");
  const type = (item) => String(item.contractType || item.typeLabel || item.form || "");
  list.sort((a, b) => {
    if (sort === "PAYMENT_ASC") return payment(a) - payment(b) || title(a).localeCompare(title(b));
    if (sort === "TITLE_ASC") return title(a).localeCompare(title(b)) || payment(b) - payment(a);
    if (sort === "TITLE_DESC") return title(b).localeCompare(title(a)) || payment(b) - payment(a);
    if (sort === "PROVIDER_ASC") return provider(a).localeCompare(provider(b)) || title(a).localeCompare(title(b));
    if (sort === "STATUS") return status(a).localeCompare(status(b)) || payment(b) - payment(a);
    if (sort === "SOURCE") return source(a).localeCompare(source(b)) || provider(a).localeCompare(provider(b));
    if (sort === "LEVEL_ASC") return level(a) - level(b) || payment(a) - payment(b);
    if (sort === "LEVEL_DESC") return level(b) - level(a) || payment(b) - payment(a);
    if (sort === "DURATION_ASC") return duration(a) - duration(b) || title(a).localeCompare(title(b));
    if (sort === "DURATION_DESC") return duration(b) - duration(a) || title(a).localeCompare(title(b));
    if (sort === "TYPE") return type(a).localeCompare(type(b)) || payment(b) - payment(a);
    return payment(b) - payment(a) || title(a).localeCompare(title(b));
  });
  return list;
}

function renderServiceContractsPanel(user, citizen = {}, contracts = []) {
  const sort = getServiceContractSort();
  const search = getServiceContractSearch();
  const activeGroup = getServiceContractGroupTab();
  const filteredContracts = filterServiceContractsBySearch(contracts, search);
  const mandatory = sortServiceContracts(filteredContracts.filter((contract) => contract.category === "MANDATORY"), sort);
  const regular = sortServiceContracts(filteredContracts.filter((contract) => contract.category === "REGULAR"), sort);
  const activeContracts = activeGroup === "REGULAR" ? regular : mandatory;
  const activeTitle = activeGroup === "REGULAR" ? "Regular Services" : "Mandatory Services";
  const activeDescription = activeGroup === "REGULAR"
    ? "Regular employment and private work offers."
    : "System call-ups and voluntary duties credited as mandatory service.";

  return `
    <section class="service-contracts-panel">
      <header class="service-contracts-head">
        <div>
          <h6>Contracts</h6>
          <small>Available commissions, fixed-term contracts and long-term agreements routed into official settlement income.</small>
        </div>
        <div class="service-contract-controls">
          <label>
            <span>Search</span>
            <input type="search" data-service-contract-search placeholder="Name / provider / category" value="${escapeHtml(search)}" />
          </label>
          <label>
            <span>Sort</span>
            <select data-service-contract-sort>
              <option value="PAYMENT_DESC" ${sort === "PAYMENT_DESC" ? "selected" : ""}>Payment high to low</option>
              <option value="PAYMENT_ASC" ${sort === "PAYMENT_ASC" ? "selected" : ""}>Payment low to high</option>
              <option value="TITLE_ASC" ${sort === "TITLE_ASC" ? "selected" : ""}>Name A-Z</option>
              <option value="TITLE_DESC" ${sort === "TITLE_DESC" ? "selected" : ""}>Name Z-A</option>
              <option value="PROVIDER_ASC" ${sort === "PROVIDER_ASC" ? "selected" : ""}>Provider A-Z</option>
              <option value="STATUS" ${sort === "STATUS" ? "selected" : ""}>Status</option>
              <option value="SOURCE" ${sort === "SOURCE" ? "selected" : ""}>Source</option>
              <option value="LEVEL_DESC" ${sort === "LEVEL_DESC" ? "selected" : ""}>Level high to low</option>
              <option value="LEVEL_ASC" ${sort === "LEVEL_ASC" ? "selected" : ""}>Level low to high</option>
              <option value="DURATION_ASC" ${sort === "DURATION_ASC" ? "selected" : ""}>Duration short to long</option>
              <option value="DURATION_DESC" ${sort === "DURATION_DESC" ? "selected" : ""}>Duration long to short</option>
              <option value="TYPE" ${sort === "TYPE" ? "selected" : ""}>Type</option>
            </select>
          </label>
        </div>
      </header>
      <nav class="service-contract-group-tabs system-segment-tabs" aria-label="Service contract categories">
        ${renderServiceContractGroupTab("MANDATORY", "Mandatory Services", "System call-ups and civic duties.", mandatory.length, activeGroup)}
        ${renderServiceContractGroupTab("REGULAR", "Regular Services", "Regular and private work offers.", regular.length, activeGroup)}
      </nav>
      <div class="service-contract-groups service-contract-active-panel">
        ${renderServiceContractGroup(user, activeTitle, activeDescription, activeContracts, activeGroup)}
      </div>
    </section>
  `;
}

function renderServiceContractGroupTab(category, title, description, count, activeGroup) {
  const normalizedCategory = normalizeServiceCategoryLabel(category);
  const isActive = normalizedCategory === activeGroup;
  return `
    <button class="service-contract-group-tab service-contract-group-tab--${escapeHtml(normalizedCategory.toLowerCase())} system-segment-tile system-segment-tile--card ${normalizedCategory === "MANDATORY" ? "system-segment-tile--alert" : ""} ${isActive ? "is-active" : ""}" type="button" data-service-contract-group-tab="${escapeHtml(normalizedCategory)}" aria-pressed="${isActive ? "true" : "false"}">
      <span class="system-segment-tile__body">
        <b class="system-segment-tile__title">${escapeHtml(title)}</b>
        <small class="system-segment-tile__description">${escapeHtml(description)}</small>
      </span>
      <strong class="system-segment-tile__meta">${escapeHtml(count)} RECORD${count === 1 ? "" : "S"}</strong>
    </button>
  `;
}

function getServiceContractPage(category = "REGULAR") {
  const normalizedCategory = normalizeServiceCategoryLabel(category);
  const state = window.WS_APP.serviceContractPages && typeof window.WS_APP.serviceContractPages === "object"
    ? window.WS_APP.serviceContractPages
    : {};
  return Math.max(1, Number(state[normalizedCategory] || 1) || 1);
}

function setServiceContractPage(category = "REGULAR", page = 1) {
  const normalizedCategory = normalizeServiceCategoryLabel(category);
  const state = window.WS_APP.serviceContractPages && typeof window.WS_APP.serviceContractPages === "object"
    ? window.WS_APP.serviceContractPages
    : {};
  window.WS_APP.serviceContractPages = {
    ...state,
    [normalizedCategory]: Math.max(1, Number(page || 1) || 1)
  };
}

function resetServiceContractPages() {
  window.WS_APP.serviceContractPages = { MANDATORY: 1, REGULAR: 1 };
}

function renderServiceContractPager(category = "REGULAR", page = 1, pageCount = 1, total = 0, start = 0, end = 0) {
  if (total <= 0) return "";
  return `
    <nav class="service-contract-pager" aria-label="${escapeHtml(category)} contract pages">
      <span>Showing ${escapeHtml(start + 1)}–${escapeHtml(end)} of ${escapeHtml(total)}</span>
      <div>
        <button type="button" data-service-contract-page="${escapeHtml(Math.max(1, page - 1))}" data-service-contract-page-category="${escapeHtml(category)}" ${page <= 1 ? "disabled" : ""}>Previous</button>
        <strong>Page ${escapeHtml(page)} / ${escapeHtml(pageCount)}</strong>
        <button type="button" data-service-contract-page="${escapeHtml(Math.min(pageCount, page + 1))}" data-service-contract-page-category="${escapeHtml(category)}" ${page >= pageCount ? "disabled" : ""}>Next</button>
      </div>
    </nav>
  `;
}

function renderServiceContractGroup(user, title, description, contracts = [], category = "REGULAR") {
  const normalizedCategory = normalizeServiceCategoryLabel(category);
  const pageCount = Math.max(1, Math.ceil(contracts.length / SERVICE_CONTRACT_PAGE_SIZE));
  const page = Math.min(getServiceContractPage(normalizedCategory), pageCount);
  if (page !== getServiceContractPage(normalizedCategory)) setServiceContractPage(normalizedCategory, page);
  const start = (page - 1) * SERVICE_CONTRACT_PAGE_SIZE;
  const end = Math.min(contracts.length, start + SERVICE_CONTRACT_PAGE_SIZE);
  const visibleContracts = contracts.slice(start, end);

  return `
    <section class="service-contract-group service-contract-panel-card service-contract-panel-card--${escapeHtml(normalizedCategory.toLowerCase())}">
      <header>
        <div>
          <p class="kicker">${escapeHtml(title)}</p>
          <small>${escapeHtml(description)}</small>
        </div>
      </header>
      ${renderServiceContractPager(normalizedCategory, page, pageCount, contracts.length, start, end)}
      <div class="service-contract-grid">
        ${visibleContracts.length ? visibleContracts.map((contract) => renderServiceContractTile(user, contract)).join("") : `<p class="file-empty">${getServiceContractSearch() ? "No contracts match current search." : "No contracts registered."}</p>`}
      </div>
      ${pageCount > 1 ? renderServiceContractPager(normalizedCategory, page, pageCount, contracts.length, start, end) : ""}
    </section>
  `;
}

function renderServiceActiveNotice(contract = {}) {
  if (String(contract.status || "").toUpperCase() !== "ACTIVE") return "";
  const income = contract.serviceIncomeId ? ` / Income Source linked` : "";
  const accepted = contract.acceptedAt ? ` / START ${window.WS_APP.formatDateDisplay(contract.acceptedAt)}` : "";
  return `<span class="service-contract-active-note">ACTIVE SERVICE${escapeHtml(income)}${escapeHtml(accepted)}</span>`;
}

function buildServiceContractSearchIndex(contract = {}) {
  return [
    contract.title,
    contract.provider,
    contract.providerClass,
    contract.employerType,
    contract.details,
    contract.status,
    contract.compliance,
    getServiceSourceTypeLabel(contract.sourceType || contract.source),
    getServiceCategoryLabel(contract.categoryId),
    getServiceWorkCharacterLabel(contract.workCharacterId),
    contract.typeLabel,
    contract.contractType,
    contract.durationType,
    ...(Array.isArray(contract.tags) ? contract.tags : []),
    ...(Array.isArray(contract.marketModifiers) ? contract.marketModifiers : [])
  ].join(" ").toLowerCase();
}

function filterServiceContractsBySearch(contracts = [], query = "") {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return [...contracts];
  return contracts.filter((contract) => buildServiceContractSearchIndex(contract).includes(normalized));
}

function getServiceContractStatusClass(status = "AVAILABLE") {
  const normalized = String(status || "AVAILABLE").toUpperCase();
  if (normalized === "ACTIVE") return "is-active";
  if (normalized === "LOCKED") return "is-locked";
  if (normalized === "REJECTED") return "is-rejected";
  if (normalized === "EXPIRED") return "is-expired";
  if (normalized === "AVAILABLE") return "is-available";
  return "is-muted";
}

function renderServiceContractActionAttributes(contract = {}, providerKind = "SYSTEM", form = "AGREEMENT") {
  return `
            data-offer-id="${escapeHtml(contract.id)}"
            data-generated-offer-id="${escapeHtml(contract.generatedOfferId || contract.id || "")}"
            data-template-id="${escapeHtml(contract.templateId || "")}"
            data-employer-id="${escapeHtml(contract.employerId || "")}"
            data-provider-id="${escapeHtml(contract.providerId || contract.employerId || "")}"
            data-organization-id="${escapeHtml(contract.organizationId || "")}"
            data-employer-type="${escapeHtml(contract.employerType || providerKind)}"
            data-category-id="${escapeHtml(contract.categoryId || "")}"
            data-subcategory-id="${escapeHtml(contract.subcategoryId || "")}"
            data-work-character-id="${escapeHtml(contract.workCharacterId || "")}"
            data-settlement-week="${escapeHtml(contract.settlementWeek || "")}"
            data-source-type="${escapeHtml(contract.sourceType || "GENERATED_WEEKLY")}"
            data-title="${escapeHtml(contract.title || "")}"
            data-provider="${escapeHtml(contract.provider || "")}"
            data-provider-class="${escapeHtml(providerKind)}"
            data-category="${escapeHtml(contract.category || "REGULAR")}"
            data-form="${escapeHtml(form)}"
            data-amount="${escapeHtml(contract.amount || contract.payment || 0)}"
            data-duration-weeks="${escapeHtml(contract.durationWeeks || 0)}"
            data-duration-type="${escapeHtml(contract.durationType || "")}"
            data-due-date="${escapeHtml(contract.dueDate || "")}"
            data-details="${escapeHtml(contract.details || "")}"`;
}

function getServiceContractPaymentLabel(contract = {}, form = "AGREEMENT") {
  return contract.paymentLabel || `${formatCredits(contract.payment || contract.amount || 0)} / ${form === "COMMISSION" ? "COMPLETION" : "WEEK"}`;
}

function renderServiceContractTile(user, contract = {}) {
  const status = String(contract.status || "AVAILABLE").toUpperCase();
  const statusClass = getServiceContractStatusClass(status);
  const form = normalizeServiceFormLabel(contract.form || inferServiceFormFromLabel(contract.typeLabel || contract.contractType));
  const canAccept = status === "AVAILABLE" && !contract.isAccepted;
  const canReject = ["AVAILABLE", "LOCKED"].includes(status) && !contract.isAccepted;
  const due = form === "COMMISSION" && contract.dueDate ? ` / DUE ${window.WS_APP.formatDateDisplay(contract.dueDate)}` : "";
  const providerToneClass = getServiceProviderToneClass(contract.provider);
  const providerKind = contract.providerClass || contract.employerType || getServiceProviderKind(contract.provider, contract.category);
  const actionAttrs = renderServiceContractActionAttributes(contract, providerKind, form);
  const typeLabel = getServiceTypeLabel(contract.category, form);
  const paymentLabel = getServiceContractPaymentLabel(contract, form);
  return `
    <article class="service-contract-tile ${statusClass} ${escapeHtml(providerToneClass)}" data-service-contract-id="${escapeHtml(contract.id)}" data-service-provider-kind="${escapeHtml(providerKind)}" data-service-contract-search-index="${escapeHtml(buildServiceContractSearchIndex(contract))}">
      <div class="service-contract-content">
        <header class="service-contract-title-row">
          <b>${escapeHtml(contract.title || "Service Contract")}</b>
          <span>${escapeHtml(status)}</span>
        </header>
        <div class="service-contract-subtitle-row">
          <small>${escapeHtml(contract.provider || "LOCAL SERVICE REGISTRY")} / ${escapeHtml(providerKind)}</small>
          <small>${escapeHtml(typeLabel)}${escapeHtml(due)}</small>
        </div>
        <em>${escapeHtml(contract.details || "No contract details registered.")}</em>
        ${renderServiceActiveNotice(contract)}
        ${renderServiceContractRequirementStrip(contract)}
        <span class="service-contract-readiness">${escapeHtml(getServiceContractReadinessLabel(contract))}</span>
      </div>
      <aside class="service-contract-side">
        <nav class="service-contract-actions" aria-label="Service offer actions">
          <button type="button" data-service-offer-details="${escapeHtml(contract.id)}">Details</button>
          ${canAccept ? `<button type="button" data-service-offer-accept ${actionAttrs}>Accept</button>` : `<button type="button" disabled>${status === "ACTIVE" ? "Active" : status === "LOCKED" ? "Locked" : "Unavailable"}</button>`}
          ${canReject ? `<button type="button" data-service-offer-reject ${actionAttrs}>Reject</button>` : ""}
        </nav>
        <strong class="service-contract-payment">${escapeHtml(paymentLabel)}</strong>
      </aside>
    </article>
  `;
}

function findServiceOfferById(contracts = [], offerId = "") {
  const id = String(offerId || window.WS_APP.serviceSelectedOfferId || "").trim();
  return (contracts || []).find((offer) => String(offer.id || "") === id) || null;
}


function getServiceOfferDueLabel(offer = {}, form = "AGREEMENT") {
  const normalizedForm = normalizeServiceFormLabel(form || offer.form);
  if (normalizedForm === "COMMISSION") return offer.dueDate ? `Due: ${window.WS_APP.formatDateDisplay(offer.dueDate)}` : "Due: Not set";
  if (Number(offer.durationWeeks || 0) > 0) return `Duration: ${Number(offer.durationWeeks)} Weeks`;
  if (offer.durationType) return `Duration: ${offer.durationType}`;
  return normalizedForm === "AGREEMENT" ? "Duration: Indefinite" : "Duration: Open";
}

function getServiceRequirementReasonsByGroup(offer = {}, groupId = "") {
  const group = SERVICE_REQUIREMENT_GROUPS.find((item) => item.id === groupId);
  if (!group) return [];
  const reasons = Array.isArray(offer.eligibility?.reasons) ? offer.eligibility.reasons : [];
  return reasons.filter((reason) => group.reasonTypes.includes(normalizeServiceDictionaryKey(reason.type || "")));
}

function hasServiceRequirementFailure(offer = {}, type = "", key = "") {
  const normalizedType = normalizeServiceDictionaryKey(type);
  const normalizedKey = normalizeServiceDictionaryKey(key);
  const reasons = Array.isArray(offer.eligibility?.reasons) ? offer.eligibility.reasons : [];
  return reasons.some((reason) => {
    if (normalizeServiceDictionaryKey(reason.type || "") !== normalizedType) return false;
    if (!normalizedKey) return true;
    return normalizeServiceDictionaryKey(reason.key || reason.id || reason.categoryId || reason.skillId || reason.abilityId || "") === normalizedKey;
  });
}

function getServiceRequirementStatusLabel(failed = false) {
  return failed ? "FAILED" : "MET";
}

function renderServiceDetailField(label = "", value = "") {
  const displayValue = value === null || value === undefined || value === "" ? "-" : value;
  return `
    <article class="service-offer-detail-field">
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(displayValue)}</b>
    </article>
  `;
}

function getServiceRequirementGroupNote(citizen = {}, offer = {}, group = {}) {
  const requirements = offer.requirements || {};
  if (group.id === "PROFILE") {
    const allowed = Array.isArray(requirements.biologicalProfiles) && requirements.biologicalProfiles.length
      ? requirements.biologicalProfiles.join(" / ")
      : "Any profile";
    const current = citizen.biologicalProfile || citizen.profile || "No profile";
    return `${current} / ${allowed}`;
  }
  if (group.id === "ABILITIES") return requirements.minAbilities?.length ? `${requirements.minAbilities.length} ability check${requirements.minAbilities.length === 1 ? "" : "s"}` : "No ability threshold";
  if (group.id === "SKILLS") return requirements.minSkills?.length ? `${requirements.minSkills.length} skill check${requirements.minSkills.length === 1 ? "" : "s"}` : "No skill threshold";
  if (group.id === "EXP") return requirements.minExperience?.length ? `${requirements.minExperience.length} experience check${requirements.minExperience.length === 1 ? "" : "s"}` : "No experience threshold";
  if (group.id === "INSURANCE") {
    if (!requirements.insurance) return "No insurance threshold";
    const profileDef = requirements.insurance.profileId ? getServiceInsuranceProfileDefinition(requirements.insurance.profileId) : requirements.insurance;
    return window.ServiceRequirements?.describeInsuranceRequirement?.(profileDef) || "Insurance required";
  }
  if (group.id === "CLEARANCE") return requirements.requiredClearance ? `Requires ${requirements.requiredClearance}` : "No clearance threshold";
  if (group.id === "RISK") return requirements.maxRiskScore !== undefined && requirements.maxRiskScore !== null ? `Max Risk ${requirements.maxRiskScore}` : "No risk threshold";
  return "No threshold";
}

function renderServiceOfferQualificationCheck(citizen = {}, offer = {}) {
  const snapshot = getServiceRequirementSnapshotState(offer);
  return `
    <section class="service-offer-sheet-block service-offer-qualification">
      <header>
        <div>
          <p class="kicker">QUALIFICATION CHECK</p>
          <h6>${escapeHtml(snapshot.metCount)} / ${escapeHtml(snapshot.total)} MET</h6>
        </div>
        <small>Citizen record compared with offer thresholds.</small>
      </header>
      <div class="service-offer-qualification-grid">
        ${snapshot.groups.map((group) => {
          const failed = !group.met;
          const reasons = getServiceRequirementReasonsByGroup(offer, group.id);
          const note = failed && reasons.length
            ? reasons.map(getServiceRequirementSubjectLabel).join(" / ")
            : getServiceRequirementGroupNote(citizen, offer, group);
          return `
            <article class="${failed ? "is-failed" : "is-met"}">
              <span>${escapeHtml(group.label)}</span>
              <b>${escapeHtml(getServiceRequirementStatusLabel(failed))}</b>
              <small>${escapeHtml(note)}</small>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function makeServiceBreakdownRow(label = "", current = "-", required = "-", failed = false) {
  return {
    label,
    current: formatServiceReasonValue(current),
    required: formatServiceReasonValue(required),
    status: getServiceRequirementStatusLabel(failed),
    failed
  };
}

function getServiceRequirementBreakdownGroups(citizen = {}, offer = {}) {
  const requirements = offer.requirements || {};
  const groups = [];
  const profile = String(citizen.biologicalProfile || citizen.profile || "NONE").toUpperCase();
  const allowedProfiles = Array.isArray(requirements.biologicalProfiles) && requirements.biologicalProfiles.length
    ? requirements.biologicalProfiles.map((item) => String(item || "").toUpperCase())
    : [];
  groups.push({
    title: "Profile",
    rows: [makeServiceBreakdownRow(
      "Biological Profile",
      profile || "NONE",
      allowedProfiles.length ? allowedProfiles.join(" / ") : "ANY",
      hasServiceRequirementFailure(offer, "BIOLOGICAL_PROFILE")
    )]
  });

  const abilityRows = (requirements.minAbilities || []).map((item) => {
    const abilityId = item.id || item.abilityId || item.key || "";
    const current = window.ServiceRequirements?.getAbilityValue?.(citizen, abilityId) ?? 0;
    const required = item.value ?? item.min ?? item.required ?? 0;
    return makeServiceBreakdownRow(getServiceAbilityLabel(abilityId), current, required, hasServiceRequirementFailure(offer, "MIN_ABILITY", abilityId) || Number(current) < Number(required));
  });
  groups.push({ title: "Abilities", rows: abilityRows.length ? abilityRows : [makeServiceBreakdownRow("Ability Threshold", "Not required", "None", false)] });

  const skillRows = (requirements.minSkills || []).map((item) => {
    const skillId = item.id || item.skillId || item.key || "";
    const current = window.ServiceRequirements?.getSkillValue?.(citizen, skillId) ?? 0;
    const required = item.value ?? item.min ?? item.required ?? 0;
    return makeServiceBreakdownRow(serviceHumanizeKey(skillId), current, required, hasServiceRequirementFailure(offer, "MIN_SKILL", skillId) || Number(current) < Number(required));
  });
  groups.push({ title: "Skills", rows: skillRows.length ? skillRows : [makeServiceBreakdownRow("Skill Threshold", "Not required", "None", false)] });

  const experienceRows = (requirements.minExperience || []).map((item) => {
    const categoryId = item.categoryId || item.id || item.key || item.category || "";
    const current = window.ServiceRequirements?.getExperienceValue?.(citizen, categoryId) ?? 0;
    const required = item.value ?? item.min ?? item.required ?? 0;
    return makeServiceBreakdownRow(getServiceCategoryLabel(categoryId), current, required, hasServiceRequirementFailure(offer, "MIN_EXPERIENCE", categoryId) || Number(current) < Number(required));
  });
  groups.push({ title: "Experience", rows: experienceRows.length ? experienceRows : [makeServiceBreakdownRow("Experience Threshold", "Not required", "None", false)] });

  if (requirements.insurance) {
    const coverage = window.ServiceRequirements?.getInsuranceCoverage?.(citizen) || { labels: [] };
    const profileDef = requirements.insurance.profileId ? getServiceInsuranceProfileDefinition(requirements.insurance.profileId) : requirements.insurance;
    groups.push({
      title: "Insurance",
      rows: [makeServiceBreakdownRow(
        "Insurance Coverage",
        coverage.labels?.length ? coverage.labels.join(" / ") : "none",
        window.ServiceRequirements?.describeInsuranceRequirement?.(profileDef) || "Insurance required",
        hasServiceRequirementFailure(offer, "INSURANCE") || hasServiceRequirementFailure(offer, "INSURANCE_DISALLOWED")
      )]
    });
  } else {
    groups.push({ title: "Insurance", rows: [makeServiceBreakdownRow("Insurance Coverage", "Not required", "None", false)] });
  }

  groups.push({
    title: "Clearance",
    rows: [makeServiceBreakdownRow(
      "Access Clearance",
      citizen.clearance || (citizen.accessTags || []).join(" / ") || "PUBLIC",
      requirements.requiredClearance || "PUBLIC",
      hasServiceRequirementFailure(offer, "CLEARANCE")
    )]
  });

  groups.push({
    title: "Risk",
    rows: [makeServiceBreakdownRow(
      "Risk Score",
      citizen.risk ?? citizen.riskScore ?? 0,
      requirements.maxRiskScore !== undefined && requirements.maxRiskScore !== null ? `<= ${requirements.maxRiskScore}` : "No maximum",
      hasServiceRequirementFailure(offer, "RISK_SCORE")
    )]
  });

  return groups;
}

function renderServiceRequirementBreakdown(citizen = {}, offer = {}) {
  const groups = getServiceRequirementBreakdownGroups(citizen, offer);
  return `
    <section class="service-offer-sheet-block service-offer-breakdown">
      <header>
        <div>
          <p class="kicker">REQUIREMENT BREAKDOWN</p>
          <h6>Current / Required</h6>
        </div>
        <small>Exact checks are grouped by requirement type.</small>
      </header>
      <div class="service-offer-breakdown-grid">
        ${groups.map((group) => `
          <article class="service-offer-breakdown-card">
            <h6>${escapeHtml(group.title)}</h6>
            <ul>
              ${group.rows.map((row) => `
                <li class="${row.failed ? "is-failed" : "is-met"}">
                  <span>${escapeHtml(row.label)}</span>
                  <small>${escapeHtml(row.current)} / ${escapeHtml(row.required)}</small>
                  <b>${escapeHtml(row.status)}</b>
                </li>
              `).join("")}
            </ul>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function getServiceRewardRows(offer = {}, form = "AGREEMENT") {
  const rows = [
    { label: "Payment", value: offer.paymentLabel || `${formatCredits(offer.amount || offer.payment || 0)} / ${form === "COMMISSION" ? "COMPLETION" : "WEEK"}` }
  ];
  const experience = getServiceExperienceGainLabel(offer);
  if (experience) rows.push({ label: "Experience", value: experience });
  if (offer.rewards?.riskScoreImpact !== undefined) rows.push({ label: "Risk Impact", value: String(offer.rewards.riskScoreImpact) });
  if (offer.experienceGrantedAt) rows.push({ label: "Experience Granted", value: window.WS_APP.formatDateDisplay(offer.experienceGrantedAt) });
  return rows;
}

function renderServiceOfferRewards(offer = {}, form = "AGREEMENT") {
  const rows = getServiceRewardRows(offer, form);
  return `
    <section class="service-offer-sheet-block service-offer-rewards">
      <header>
        <div>
          <p class="kicker">REWARDS</p>
          <h6>Compensation</h6>
        </div>
      </header>
      <div class="service-offer-detail-fields">
        ${rows.map((row) => renderServiceDetailField(row.label, row.value)).join("")}
      </div>
    </section>
  `;
}

function renderServiceOfferLifecycle(offer = {}, status = "AVAILABLE", form = "AGREEMENT") {
  const rows = [
    { label: "Offer Status", value: status },
    { label: "Source", value: getServiceSourceTypeLabel(offer.sourceType || offer.source || "SERVICE") },
    { label: "Settlement Week", value: offer.settlementWeek || "-" },
    { label: "Timing", value: getServiceOfferDueLabel(offer, form) }
  ];
  if (offer.lifecycleNote) rows.push({ label: "Lifecycle Note", value: offer.lifecycleNote });
  if (offer.acceptedAt) rows.push({ label: "Accepted At", value: window.WS_APP.formatDateDisplay(offer.acceptedAt) });
  if (offer.activeServiceId) rows.push({ label: "Linked Service Log", value: "Active" });
  if (offer.serviceIncomeId) rows.push({ label: "Linked Income Source", value: "Active" });
  return `
    <section class="service-offer-sheet-block service-offer-lifecycle">
      <header>
        <div>
          <p class="kicker">LIFECYCLE</p>
          <h6>Offer State</h6>
        </div>
      </header>
      <div class="service-offer-detail-fields">
        ${rows.map((row) => renderServiceDetailField(row.label, row.value)).join("")}
      </div>
    </section>
  `;
}

function getServiceReputationLabel(score = 0) {
  const value = Number(score || 0);
  if (value >= 5) return `Favorable (${value})`;
  if (value <= -5) return `Hostile (${value})`;
  if (value > 0) return `Positive (${value})`;
  if (value < 0) return `Negative (${value})`;
  return "Neutral (0)";
}

function renderServiceOfferMarketContext(offer = {}) {
  const modifiers = Array.isArray(offer.marketModifiers) ? offer.marketModifiers : [];
  return `
    <section class="service-offer-sheet-block service-offer-market-context">
      <header>
        <div>
          <p class="kicker">MARKET CONTEXT</p>
          <h6>Demand / Reputation</h6>
        </div>
      </header>
      <div class="service-offer-detail-fields">
        ${renderServiceDetailField("Employer Reputation", getServiceReputationLabel(offer.reputationScore || 0))}
        ${renderServiceDetailField("Weekly Demand", modifiers.length ? modifiers.join(" / ") : "No active modifier")}
        ${offer.compliance ? renderServiceDetailField("Compliance", offer.compliance) : ""}
      </div>
    </section>
  `;
}

function renderServiceOfferTechnicalDiagnostics(offer = {}) {
  const rows = [
    ["Template ID", offer.templateId || "-"],
    ["Generated Offer ID", offer.generatedOfferId || offer.id || "-"],
    ["Employer ID", offer.employerId || "-"],
    ["Category ID", offer.categoryId || "-"],
    ["Subcategory ID", offer.subcategoryId || "-"],
    ["Work Character ID", offer.workCharacterId || "-"],
    ["Source Type", normalizeServiceSourceType(offer.sourceType || offer.source || "SERVICE")],
    ["Active Service ID", offer.activeServiceId || "-"],
    ["Income Source ID", offer.serviceIncomeId || "-"]
  ];
  return `
    <details class="service-offer-technical-diagnostics">
      <summary>Technical Diagnostics</summary>
      <div class="service-offer-detail-fields">
        ${rows.map(([label, value]) => renderServiceDetailField(label, value)).join("")}
      </div>
    </details>
  `;
}

function renderServiceOfferProfileActions(offer = {}, status = "AVAILABLE", form = "AGREEMENT") {
  const providerKind = offer.providerClass || offer.employerType || getServiceProviderKind(offer.provider, offer.category);
  const actionAttrs = renderServiceContractActionAttributes(offer, providerKind, form);
  const canAccept = status === "AVAILABLE" && !offer.isAccepted;
  const canReject = ["AVAILABLE", "LOCKED"].includes(status) && !offer.isAccepted;
  return `
    <nav class="service-offer-sheet-actions" aria-label="Service offer actions">
      <button type="button" data-service-offer-back>Back</button>
      ${canAccept ? `<button type="button" data-service-offer-accept ${actionAttrs}>Accept Service</button>` : `<button type="button" disabled>${status === "ACTIVE" ? "Active Service" : status === "LOCKED" ? "Locked by Requirements" : "Unavailable"}</button>`}
      ${canReject ? `<button type="button" data-service-offer-reject ${actionAttrs}>Reject Offer</button>` : ""}
    </nav>
  `;
}

function renderServiceOfferProfile(user, citizen = {}, contracts = []) {
  const offer = findServiceOfferById(contracts);
  if (!offer) {
    window.WS_APP.serviceActivePanel = "contracts";
    return renderServiceContractsPanel(user, citizen, contracts);
  }
  const status = String(offer.status || "AVAILABLE").toUpperCase();
  const statusClass = getServiceContractStatusClass(status);
  const form = normalizeServiceFormLabel(offer.form || inferServiceFormFromLabel(offer.typeLabel || offer.contractType));
  const providerKind = offer.providerClass || offer.employerType || getServiceProviderKind(offer.provider, offer.category);
  const serviceType = getServiceTypeLabel(offer.category, form);
  const paymentLabel = getServiceContractPaymentLabel(offer, form);
  const dueLabel = getServiceOfferDueLabel(offer, form);
  return `
    <section class="service-offer-sheet ${escapeHtml(statusClass)}">
      <header class="service-offer-sheet-head">
        <div class="service-offer-sheet-title">
          <p class="kicker">SERVICE / OFFER DETAILS</p>
          <h5>${escapeHtml(offer.title || "Service Offer")}</h5>
          <small>${escapeHtml(offer.provider || "LOCAL SERVICE REGISTRY")} / ${escapeHtml(providerKind)} — ${escapeHtml(serviceType)}</small>
        </div>
        <div class="service-offer-sheet-status">
          <span>${escapeHtml(status)}</span>
          <b>${escapeHtml(paymentLabel)}</b>
          <small>${escapeHtml(dueLabel)}</small>
        </div>
        ${renderServiceOfferProfileActions(offer, status, form)}
      </header>

      <section class="service-offer-sheet-block service-offer-description">
        <header>
          <div>
            <p class="kicker">DESCRIPTION</p>
            <h6>Service Brief</h6>
          </div>
        </header>
        <p>${escapeHtml(offer.details || "No service detail registered.")}</p>
      </section>

      ${renderServiceOfferQualificationCheck(citizen, offer)}
      ${renderServiceRequirementBreakdown(citizen, offer)}

      <div class="service-offer-sheet-grid">
        ${renderServiceOfferRewards(offer, form)}
        ${renderServiceOfferLifecycle(offer, status, form)}
        ${renderServiceOfferMarketContext(offer)}
      </div>

      ${renderServiceOfferTechnicalDiagnostics(offer)}
    </section>
  `;
}

function renderServiceLogPanel(user, citizen = {}, entries = getServiceCompletedEntries(normalizeServiceLogEntries(citizen))) {
  const isAdmin = user.role === "admin";
  const completedEntries = getServiceCompletedEntries(entries);
  return `
    <section class="service-log-panel service-work-record-panel">
      <header class="service-contracts-head">
        <div>
          <h6>Service Log / Work Record</h6>
          <small>Completed services only. This is the citizen's verified work history and qualification trace.</small>
        </div>
        <span>${escapeHtml(completedEntries.length)} COMPLETED</span>
      </header>
      <div class="service-log-list service-cv-list">
        ${completedEntries.length ? completedEntries.map((entry, index) => renderServiceLogEntry(user, entry, index)).join("") : '<p class="file-empty">No completed service records registered.</p>'}
      </div>
      ${isAdmin ? renderAdminServiceLogForm() : ""}
    </section>
  `;
}

function renderServiceLogEntry(user, entry = {}, index = 0) {
  void user;
  void index;
  return `
    <div class="service-log-entry-wrap service-work-record-wrap">
      ${renderServiceCvRecord(entry)}
      <nav class="service-log-actions service-log-inline-actions" aria-label="Completed service record actions">
        <button type="button" data-service-log-details="${escapeHtml(entry.id)}">Details</button>
      </nav>
    </div>
  `;
}

function renderServiceLogDetailsPanel(user, citizen = {}, entries = getServiceCompletedEntries(normalizeServiceLogEntries(citizen))) {
  void user;
  const entry = findServiceLogEntryById(entries);
  if (!entry) {
    window.WS_APP.serviceSelectedLogId = "";
    window.WS_APP.serviceActivePanel = "log";
    return renderServiceLogPanel(user, citizen, entries);
  }
  const providerKind = entry.providerClass || entry.employerType || getServiceProviderKind(entry.provider, entry.category);
  const scopeItems = getServiceWorkScopeItems(entry);
  const experience = getServiceExperienceGainLabel(entry) || "No experience grant registered";
  const completionRange = getServiceCompletionRangeLabel(entry);
  const paymentStatus = getServiceLogPaymentStatusLabel(entry);
  return `
    <section class="service-work-record-sheet">
      <header class="service-work-record-sheet-head">
        <div>
          <p class="kicker">SERVICE / WORK RECORD DETAILS</p>
          <h5>${escapeHtml(entry.title || "Completed Service")}</h5>
          <small>${escapeHtml(entry.provider || "LOCAL SERVICE REGISTRY")} / ${escapeHtml(providerKind)} — ${escapeHtml(entry.typeLabel || getServiceTypeLabel(entry.category, entry.form))}</small>
        </div>
        <div class="service-work-record-sheet-status">
          <span>COMPLETED</span>
          <b>${escapeHtml(completionRange)}</b>
          <small>${escapeHtml(getServiceWorkScopeLabel(entry))}</small>
        </div>
        <nav class="service-offer-sheet-actions" aria-label="Completed service details actions">
          <button type="button" data-service-log-details-back>Back</button>
        </nav>
      </header>

      <section class="service-offer-sheet-block service-work-scope-block">
        <header>
          <div>
            <p class="kicker">SCOPE OF WORK</p>
            <h6>Verified work scope</h6>
          </div>
        </header>
        <ul class="service-work-scope-list">
          ${scopeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>

      <div class="service-offer-sheet-grid service-work-record-grid">
        <section class="service-offer-sheet-block">
          <header><div><p class="kicker">COMPLETION</p><h6>Execution Window</h6></div></header>
          <div class="service-offer-detail-fields">
            ${renderServiceDetailField("Completed", entry.completedAt ? window.WS_APP.formatDateDisplay(entry.completedAt) : completionRange)}
            ${entry.acceptedAt ? renderServiceDetailField("Started", window.WS_APP.formatDateDisplay(entry.acceptedAt)) : ""}
            ${renderServiceDetailField("Range", completionRange)}
            ${entry.completedBy ? renderServiceDetailField("Completed By", entry.completedBy) : ""}
          </div>
        </section>
        <section class="service-offer-sheet-block">
          <header><div><p class="kicker">PAYMENT</p><h6>Settlement Trace</h6></div></header>
          <div class="service-offer-detail-fields">
            ${renderServiceDetailField("Payment", getServiceLogPaymentLabel(entry))}
            ${renderServiceDetailField("Payment Status", paymentStatus)}
            ${entry.payoutSettledAt ? renderServiceDetailField("Paid At", window.WS_APP.formatDateDisplay(entry.payoutSettledAt)) : ""}
            ${entry.settlementWeek ? renderServiceDetailField("Settlement Week", entry.settlementWeek) : ""}
          </div>
        </section>
        <section class="service-offer-sheet-block">
          <header><div><p class="kicker">EXPERIENCE GRANTED</p><h6>Qualification Trace</h6></div></header>
          <div class="service-offer-detail-fields">
            ${renderServiceDetailField("Experience", experience)}
            ${entry.experienceGrantedAt ? renderServiceDetailField("Granted At", window.WS_APP.formatDateDisplay(entry.experienceGrantedAt)) : ""}
            ${entry.experienceGrantedBy ? renderServiceDetailField("Granted By", entry.experienceGrantedBy) : ""}
          </div>
        </section>
      </div>

      <details class="service-offer-technical-diagnostics">
        <summary>Technical Diagnostics</summary>
        <div class="service-offer-detail-fields">
          ${renderServiceDetailField("Service Log ID", entry.id || "-")}
          ${renderServiceDetailField("Template ID", entry.templateId || "-")}
          ${renderServiceDetailField("Generated Offer ID", entry.generatedOfferId || entry.offerId || "-")}
          ${renderServiceDetailField("Category ID", entry.categoryId || "-")}
          ${renderServiceDetailField("Work Character ID", entry.workCharacterId || "-")}
          ${renderServiceDetailField("Income Source ID", entry.serviceIncomeId || "-")}
        </div>
      </details>
    </section>
  `;
}

function renderAdminServiceLogForm() {
  return `
    <form class="terminal-income-source-form service-log-form" data-service-log-form>
      <h6>Add Completed Work Record</h6>
      <label><span>Title</span><input name="title" type="text" placeholder="Manual Completed Service" required /></label>
      <label><span>Provider</span><input name="provider" type="text" placeholder="LOCAL SERVICE REGISTRY" /></label>
      <label><span>Category</span><select name="category"><option value="REGULAR">Regular Service</option><option value="MANDATORY">Mandatory Service</option></select></label>
      <label><span>Form</span><select name="form"><option value="COMMISSION">One-Time Commission</option><option value="CONTRACT">Fixed-Term Contract</option><option value="AGREEMENT">Long-Term Agreement</option></select></label>
      <label><span>Completed</span><input name="completedAt" type="date" /></label>
      <label><span>Started</span><input name="acceptedAt" type="date" /></label>
      <label><span>Income</span><span class="currency-input-wrap compact"><input name="amount" type="number" min="0" step="1" placeholder="1200" /><b>₡</b></span></label>
      <label><span>Duration Weeks</span><input name="durationWeeks" type="number" min="0" step="1" placeholder="0" /></label>
      <label class="is-wide"><span>Details</span><input name="details" type="text" maxlength="180" placeholder="Completed service scope or short work note." /></label>
      <button type="submit">Add Completed Record</button>
    </form>
  `;
}

function collectServiceOfferFromButton(button) {
  return {
    id: button.dataset.offerId,
    offerId: button.dataset.offerId,
    generatedOfferId: button.dataset.generatedOfferId || button.dataset.offerId,
    templateId: button.dataset.templateId || "",
    employerId: button.dataset.employerId || "",
    providerId: button.dataset.providerId || button.dataset.employerId || "",
    organizationId: button.dataset.organizationId || "",
    employerType: button.dataset.employerType || button.dataset.providerClass || "",
    categoryId: button.dataset.categoryId || "",
    subcategoryId: button.dataset.subcategoryId || "",
    workCharacterId: button.dataset.workCharacterId || "",
    settlementWeek: button.dataset.settlementWeek || "",
    sourceType: button.dataset.sourceType || "GENERATED_WEEKLY",
    title: button.dataset.title,
    provider: button.dataset.provider,
    providerClass: button.dataset.providerClass,
    category: button.dataset.category,
    form: button.dataset.form,
    amount: button.dataset.amount,
    durationWeeks: button.dataset.durationWeeks,
    durationType: button.dataset.durationType,
    dueDate: button.dataset.dueDate,
    details: button.dataset.details,
    status: "AVAILABLE"
  };
}

function bindServiceModuleActions(user, citizen) {
  const root = document.querySelector("[data-service-root]");
  if (!root) return;
  root.__serviceActionContext = { user, citizenId: citizen.id };
  if (root.dataset.serviceDelegatedActionsBound === "true") return;
  root.dataset.serviceDelegatedActionsBound = "true";

  const getContext = () => {
    const boundUser = root.__serviceActionContext?.user || window.WS_APP.currentUser || user;
    const boundCitizenId = root.__serviceActionContext?.citizenId || root.dataset.serviceCitizenId || citizen.id;
    return {
      user: boundUser,
      citizen: window.WS_APP.getCitizenById?.(boundCitizenId) || citizen
    };
  };
  const getSelectedLogInputs = () => Array.from(root.querySelectorAll("[data-service-log-select]:checked"));

  root.addEventListener("click", async (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const { user: activeUser, citizen: activeCitizen } = getContext();

    const panelButton = target.closest("[data-service-panel]");
    if (panelButton && root.contains(panelButton)) {
      event.preventDefault();
      window.clearTimeout(window.WS_APP.serviceContractSearchTimer);
      const nextPanel = panelButton.dataset.servicePanel || "contracts";
      if (getServiceActivePanel() === nextPanel && root.dataset.serviceActivePanel === nextPanel) {
        panelButton.focus({ preventScroll: true });
        serviceUiMetrics.activeTabNoopCount += 1;
        return;
      }
      if (nextPanel === "income" && typeof renderIncomeSourcesPanel !== "function") {
        try {
          await window.WS_APP.loadModuleBundle?.("service-income", activeUser);
        } catch (error) {
          console.warn("W&S Service income view load failed.", error);
          return;
        }
      }
      window.WS_APP.serviceActivePanel = nextPanel;
      replaceServiceSectionBody(activeUser, { focusTab: true, refreshSummary: false });
      return;
    }

    const groupButton = target.closest("[data-service-contract-group-tab]");
    if (groupButton && root.contains(groupButton)) {
      event.preventDefault();
      const group = normalizeServiceCategoryLabel(groupButton.dataset.serviceContractGroupTab || "MANDATORY");
      if (getServiceContractGroupTab() === group) {
        groupButton.focus({ preventScroll: true });
        return;
      }
      window.WS_APP.serviceContractGroupTab = group;
      replaceServiceSectionBody(activeUser, {
        focusSelector: `[data-service-contract-group-tab="${group}"]`,
        refreshSummary: false
      });
      return;
    }

    const pageButton = target.closest("[data-service-contract-page]");
    if (pageButton && root.contains(pageButton)) {
      event.preventDefault();
      if (pageButton.disabled) return;
      const category = normalizeServiceCategoryLabel(pageButton.dataset.serviceContractPageCategory || getServiceContractGroupTab());
      const page = Math.max(1, Number(pageButton.dataset.serviceContractPage || 1) || 1);
      setServiceContractPage(category, page);
      replaceServiceSectionBody(activeUser, {
        focusSelector: `[data-service-contract-page="${page}"][data-service-contract-page-category="${category}"]`,
        refreshSummary: false
      });
      return;
    }

    const rejectButton = target.closest("[data-service-offer-reject]");
    if (rejectButton && root.contains(rejectButton)) {
      event.preventDefault();
      const result = window.WS_APP.rejectCitizenServiceOffer?.(activeCitizen.id, collectServiceOfferFromButton(rejectButton));
      await window.WS_APP.confirmAction?.({
        title: result ? "SERVICE OFFER REJECTED" : "SERVICE REJECT FAILED",
        message: result ? "Service offer has been rejected for this citizen." : "The service offer could not be rejected.",
        confirmLabel: "OK",
        cancelLabel: null,
        hideCancel: true,
        tone: result ? "default" : "danger"
      });
      window.WS_APP.serviceSelectedOfferId = "";
      window.WS_APP.serviceActivePanel = "contracts";
      renderServiceModule(activeUser);
      return;
    }

    const acceptButton = target.closest("[data-service-offer-accept]");
    if (acceptButton && root.contains(acceptButton)) {
      event.preventDefault();
      const result = window.WS_APP.acceptCitizenServiceOffer?.(activeCitizen.id, collectServiceOfferFromButton(acceptButton));
      await window.WS_APP.confirmAction?.({
        title: result ? "SERVICE ACCEPTED" : "SERVICE FAILED",
        message: result ? "Service record has been activated." : "The service offer could not be accepted.",
        confirmLabel: "OK",
        cancelLabel: null,
        hideCancel: true,
        tone: result ? "default" : "danger"
      });
      renderServiceModule(activeUser);
      return;
    }

    const completeButton = target.closest("[data-service-log-complete]");
    if (completeButton && root.contains(completeButton)) {
      event.preventDefault();
      const recordId = completeButton.dataset.serviceLogComplete || "";
      if (!recordId) return;
      const result = window.WS_APP.completeActiveService?.(activeCitizen.id, recordId, { createdBy: activeUser.login || activeUser.displayName || "ADMIN" });
      await window.WS_APP.confirmAction?.({
        title: result ? "SERVICE COMPLETED" : "SERVICE COMPLETION FAILED",
        message: result ? "Active service has been completed, linked income was synchronized, and experience rewards were applied when configured." : "The selected active service could not be completed.",
        confirmLabel: "OK",
        cancelLabel: null,
        hideCancel: true,
        tone: result ? "default" : "danger"
      });
      renderServiceModule(activeUser);
      return;
    }

    const hardDeleteButton = target.closest("[data-service-log-hard-delete]");
    if (hardDeleteButton && root.contains(hardDeleteButton)) {
      event.preventDefault();
      const selected = getSelectedLogInputs();
      const recordIds = selected.map((input) => input.value).filter(Boolean);
      const labels = selected.map((input) => input.dataset?.recordLabel || input.value).filter(Boolean);
      if (!recordIds.length) {
        await window.WS_APP.confirmAction?.({ title: "NO SERVICE SELECTED", message: "Select one or more Service Log records first.", confirmLabel: "OK", cancelLabel: null, hideCancel: true, tone: "danger" });
        return;
      }
      const confirmed = await window.WS_APP.confirmAction?.({
        title: "HARD DELETE SERVICE",
        message: `Permanently delete ${recordIds.length} Service Log record${recordIds.length === 1 ? "" : "s"}? ${labels.slice(0, 4).join("; ")}${labels.length > 4 ? "; ..." : ""}`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        tone: "danger"
      });
      if (!confirmed) return;
      const result = window.WS_APP.deleteCitizenServiceLogEntries?.(activeCitizen.id, recordIds)
        || (recordIds.length === 1 ? window.WS_APP.deleteCitizenServiceLogEntry?.(activeCitizen.id, recordIds[0]) : null);
      const deletedCount = result?.count || recordIds.length;
      await window.WS_APP.confirmAction?.({
        title: result ? "SERVICE DELETED" : "SERVICE DELETE FAILED",
        message: result ? `${deletedCount} Service Log record${deletedCount === 1 ? "" : "s"} and linked settlement income have been removed.` : "The selected service records could not be deleted.",
        confirmLabel: "OK",
        cancelLabel: null,
        hideCancel: true,
        tone: result ? "default" : "danger"
      });
      renderServiceModule(activeUser);
      return;
    }

    const logBackButton = target.closest("[data-service-log-details-back]");
    if (logBackButton && root.contains(logBackButton)) {
      event.preventDefault();
      window.WS_APP.serviceSelectedLogId = "";
      window.WS_APP.serviceActivePanel = "log";
      replaceServiceSectionBody(activeUser, { focusTab: true, refreshSummary: false });
      return;
    }

    const logDetailsButton = target.closest("[data-service-log-details]");
    if (logDetailsButton && root.contains(logDetailsButton)) {
      event.preventDefault();
      window.WS_APP.serviceSelectedLogId = logDetailsButton.dataset.serviceLogDetails || "";
      window.WS_APP.serviceActivePanel = "log-details";
      replaceServiceSectionBody(activeUser, { refreshSummary: false });
      return;
    }

    const offerBackButton = target.closest("[data-service-offer-back]");
    if (offerBackButton && root.contains(offerBackButton)) {
      event.preventDefault();
      window.WS_APP.serviceSelectedOfferId = "";
      window.WS_APP.serviceActivePanel = "contracts";
      replaceServiceSectionBody(activeUser, { focusTab: true, refreshSummary: false });
      return;
    }

    const offerDetailsButton = target.closest("[data-service-offer-details]");
    if (offerDetailsButton && root.contains(offerDetailsButton)) {
      event.preventDefault();
      window.WS_APP.serviceSelectedOfferId = offerDetailsButton.dataset.serviceOfferDetails || "";
      window.WS_APP.serviceActivePanel = "offer";
      replaceServiceSectionBody(activeUser, { refreshSummary: false });
    }
  });

  root.addEventListener("change", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const { user: activeUser } = getContext();

    if (target.matches("[data-service-target-citizen]")) {
      window.WS_APP.serviceTargetCitizenId = target.value;
      renderServiceModule(activeUser, { forceShell: true });
      return;
    }
    if (target.matches("[data-service-contract-sort]")) {
      window.WS_APP.serviceContractSort = target.value || "PAYMENT_DESC";
      setServiceContractPage(getServiceContractGroupTab(), 1);
      replaceServiceSectionBody(activeUser, { focusSelector: "[data-service-contract-sort]", refreshSummary: false });
      return;
    }
    if (target.matches("[data-service-log-select]")) syncServiceLogSelectionState(root);
  });

  root.addEventListener("input", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.matches("[data-service-contract-search]")) return;
    const { user: activeUser } = getContext();
    window.WS_APP.serviceContractSearch = target.value || "";
    resetServiceContractPages();
    window.clearTimeout(window.WS_APP.serviceContractSearchTimer);
    window.WS_APP.serviceContractSearchTimer = window.setTimeout(() => {
      if (window.WS_APP.currentModuleId !== "service" || !root.isConnected) return;
      replaceServiceSectionBody(activeUser, { focusSelector: "[data-service-contract-search]", refreshSummary: false });
    }, 140);
  });

  root.addEventListener("submit", async (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (!form || !root.contains(form)) return;
    const { user: activeUser, citizen: activeCitizen } = getContext();

    if (form.matches("[data-service-log-form]")) {
      event.preventDefault();
      const result = window.WS_APP.addCitizenServiceLogEntry?.(activeCitizen.id, {
        title: form.elements.title?.value,
        provider: form.elements.provider?.value || "LOCAL SERVICE REGISTRY",
        category: form.elements.category?.value || "REGULAR",
        form: form.elements.form?.value || "AGREEMENT",
        status: "COMPLETED",
        amount: form.elements.amount?.value || 0,
        durationWeeks: form.elements.durationWeeks?.value || 0,
        details: form.elements.details?.value || "",
        acceptedAt: form.elements.acceptedAt?.value || form.elements.completedAt?.value || "",
        completedAt: form.elements.completedAt?.value || form.elements.acceptedAt?.value || "",
        createdBy: activeUser.login || activeUser.displayName || "ADMIN",
        completedBy: activeUser.login || activeUser.displayName || "ADMIN",
        completionMode: "MANUAL_WORK_RECORD"
      });
      await window.WS_APP.confirmAction?.({
        title: result ? "SERVICE LOG UPDATED" : "SERVICE LOG FAILED",
        message: result ? "Manual service record has been added." : "The service record could not be added.",
        confirmLabel: "OK",
        cancelLabel: null,
        hideCancel: true,
        tone: result ? "default" : "danger"
      });
      renderServiceModule(activeUser);
      return;
    }

    if (form.matches("[data-service-log-status-form]")) {
      event.preventDefault();
      const selected = getSelectedLogInputs();
      const recordIds = selected.map((input) => input.value).filter(Boolean);
      const nextStatus = root.querySelector("[data-service-log-status-select]")?.value || "ACTIVE";
      if (!recordIds.length) {
        await window.WS_APP.confirmAction?.({ title: "NO SERVICE SELECTED", message: "Select one or more Service Log records first.", confirmLabel: "OK", cancelLabel: null, hideCancel: true, tone: "danger" });
        return;
      }
      const result = window.WS_APP.setCitizenServiceStatuses?.(activeCitizen.id, recordIds, nextStatus)
        || (recordIds.length === 1 ? window.WS_APP.setCitizenServiceStatus?.(activeCitizen.id, recordIds[0], nextStatus) : null);
      const changedCount = result?.count || recordIds.length;
      await window.WS_APP.confirmAction?.({
        title: result ? "SERVICE STATUS UPDATED" : "SERVICE STATUS FAILED",
        message: result ? `${changedCount} record${changedCount === 1 ? "" : "s"} changed to ${nextStatus}.` : "The selected service records could not be updated.",
        confirmLabel: "OK",
        cancelLabel: null,
        hideCancel: true,
        tone: result ? "default" : "danger"
      });
      renderServiceModule(activeUser);
    }
  });
}


bindServiceRuntimeListeners();

window.WS_APP.renderServiceModule = renderServiceModule;
