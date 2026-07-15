window.WS_APP = window.WS_APP || {};

// Subscription module extracted from js/modules.js.
// Keep this file loaded after js/modules.js so shared renderer helpers remain available.

const SUBSCRIPTION_CATEGORIES = [
  {
    "id": "INSURANCE",
    "title": "Insurance",
    "description": "Ubezpieczenie medyczne i ratunkowe",
    "tags": [
      "SYSTEM",
      "PRIVATE"
    ]
  },
  {
    "id": "CYBERSECURITY",
    "title": "Cybersecurity",
    "description": "Ubezpieczenie sieciowe, routing i ochrona sesji",
    "tags": [
      "SYSTEM",
      "PRIVATE"
    ]
  },
  {
    "id": "LIVESECURITY",
    "title": "Live Security",
    "description": "Ochrona mieszkań, dóbr lub osobista. Dostępna tylko dla ALPHA.",
    "tags": [
      "SYSTEM",
      "PRIVATE"
    ],
    "alphaOnly": true
  },
  {
    "id": "CYBERWARE",
    "title": "Cyberware",
    "description": "Przeglądy cyberware, subskrypcje licencji i aktualizacji",
    "tags": [
      "SYSTEM",
      "PRIVATE"
    ]
  },
  {
    "id": "MASS_COMPRESSION",
    "title": "Mass Compression",
    "description": "Software, kalibracja, synchronizacja i serwis Capacity Modules",
    "tags": [
      "PRIVATE"
    ]
  },
  {
    "id": "RENT",
    "title": "Rent",
    "description": "Wynajem komórek mieszkalnych, rachunki za prąd i wodę, wywóz śmieci",
    "tags": [
      "SYSTEM"
    ]
  },
  {
    "id": "FOOD",
    "title": "Food",
    "description": "Systemowe racje, katering, żywienie profilowane i prywatne pakiety dietetyczne",
    "tags": [
      "SYSTEM",
      "PRIVATE"
    ]
  },
  {
    "id": "HYGIENE",
    "title": "Hygiene",
    "description": "Pranie, sanityzacja, środki higieny, pielęgnacja i utrzymanie ciała",
    "tags": [
      "SYSTEM",
      "PRIVATE"
    ]
  },
  {
    "id": "TRANSPORT",
    "title": "Transport",
    "description": "Dostęp do transportu publicznego, tras prywatnych, bramek i przejazdów priorytetowych",
    "tags": [
      "SYSTEM",
      "PRIVATE"
    ]
  },
  {
    "id": "REST",
    "title": "Rest",
    "description": "Normy snu, kapsuły odpoczynku, regeneracja i prywatne pakiety głębokiego snu",
    "tags": [
      "SYSTEM",
      "PRIVATE"
    ]
  },
  {
    "id": "EDUCATION",
    "title": "Education",
    "description": "Kanały szkoleniowe, certyfikacje, kursy zawodowe i prywatne przyspieszone uczenie",
    "tags": [
      "SYSTEM",
      "PRIVATE"
    ]
  },
  {
    "id": "AFTERLIFE",
    "title": "Afterlife",
    "description": "Spalanie zwłok po śmierci, wydobycie narządów i cyberware",
    "tags": [
      "SYSTEM",
      "PRIVATE"
    ]
  },
  {
    "id": "OTHER",
    "title": "Other",
    "description": "Wynajem pojazdów, komórek magazynowych i inne usługi",
    "tags": []
  }
];

window.WS_APP.SUBSCRIPTION_CATEGORIES = SUBSCRIPTION_CATEGORIES;

function getSubscriptionCommandApi() {
  return window.WS_APP.SubscriptionAPI && typeof window.WS_APP.SubscriptionAPI === "object"
    ? window.WS_APP.SubscriptionAPI
    : null;
}

function getSubscriptionActionFeedback() {
  return window.WS_APP.SubscriptionActionFeedback && typeof window.WS_APP.SubscriptionActionFeedback === "object"
    ? window.WS_APP.SubscriptionActionFeedback
    : null;
}

function renderSubscriptionActionFeedbackSlot(scope = "PLAYER") {
  const key = subscriptionUiToken(scope || "PLAYER") || "PLAYER";
  return `<div class="subscription-action-feedback-slot" data-subscription-action-feedback-scope="${escapeHtml(key)}">${getSubscriptionActionFeedback()?.render?.(key) || ""}</div>`;
}

function presentSubscriptionActionResult(scope, action, result, context = {}) {
  const feedback = getSubscriptionActionFeedback();
  if (feedback?.present) return feedback.present(scope, action, result || { ok: false, resultCode: "SUBSCRIPTION_COMMAND_NO_RESULT" }, context);
  const code = result?.resultCode || result?.errorCode || result?.reason || "SUBSCRIPTION_COMMAND_FAILED";
  window.WS_APP.appendTerminalLogLine?.(`SUBSCRIPTION ${result?.ok ? "ACTION COMPLETE" : "ACTION FAILED"} / ${action} / ${code}`, { typed: true, speed: 8 });
  return { success: result?.ok === true, code, message: String(code), tone: result?.ok ? "success" : "error" };
}

function lockSubscriptionAction(control, label = "PROCESSING...") {
  return getSubscriptionActionFeedback()?.lock?.(control, label) || (() => {});
}

function subscriptionUiToken(value = "") {
  return String(value || "").trim().toUpperCase();
}

function getSubscriptionCatalogForUi(subscriptionOrCatalog = {}) {
  const catalogId = String(
    subscriptionOrCatalog.subscriptionCatalogId
    || subscriptionOrCatalog.catalogId
    || subscriptionOrCatalog.id
    || ""
  ).trim();
  if (!catalogId) return null;
  const api = getSubscriptionCommandApi();
  return api?.getSubscriptionCatalogEntry?.(catalogId)
    || window.WS_APP.getSubscriptionCatalogItemById?.(catalogId)
    || null;
}

function getSubscriptionCoverageTargetForUi(subscription = {}, citizenId = "") {
  const target = subscription.coverageTarget && typeof subscription.coverageTarget === "object"
    ? subscription.coverageTarget
    : { type: "CITIZEN", id: citizenId };
  const type = subscriptionUiToken(target.type || "CITIZEN") || "CITIZEN";
  return {
    type,
    id: String(target.id || (type === "CITIZEN" ? citizenId : "")).trim()
  };
}

function getSubscriptionTargetPolicyForUi(subscriptionOrCatalog = {}) {
  const catalog = subscriptionOrCatalog?.targetPolicy
    ? subscriptionOrCatalog
    : getSubscriptionCatalogForUi(subscriptionOrCatalog);
  const policy = catalog?.targetPolicy && typeof catalog.targetPolicy === "object"
    ? catalog.targetPolicy
    : { allowedTargetTypes: ["CITIZEN"], defaultTargetType: "CITIZEN", maximumTargets: 1, itemEligibility: {} };
  const allowedTargetTypes = Array.from(new Set((Array.isArray(policy.allowedTargetTypes) ? policy.allowedTargetTypes : ["CITIZEN"])
    .map(subscriptionUiToken)
    .filter((type) => ["CITIZEN", "ITEM_INSTANCE"].includes(type))));
  if (!allowedTargetTypes.length) allowedTargetTypes.push("CITIZEN");
  const defaultTargetType = allowedTargetTypes.includes(subscriptionUiToken(policy.defaultTargetType))
    ? subscriptionUiToken(policy.defaultTargetType)
    : allowedTargetTypes[0];
  return {
    ...policy,
    allowedTargetTypes,
    defaultTargetType,
    maximumTargets: Math.max(1, Number(policy.maximumTargets || 1) || 1)
  };
}

function getSubscriptionTargetItemView(targetId = "") {
  const item = window.WS_APP.getItemInstanceById?.(targetId) || null;
  if (!item) return null;
  return window.WS_APP.getItemInstanceView?.(item) || item;
}

function getSubscriptionTargetLocationLabel(item = {}) {
  const location = item.locationData || item.location || {};
  const type = subscriptionUiToken(typeof location === "string" ? location : location.type || item.location || "UNPLACED");
  const lifecycle = subscriptionUiToken(item.lifecycleState || item.status || "UNKNOWN");
  if (type === "BODY") return `BODY / ${lifecycle}`;
  if (type === "SERVICE") return `SERVICE / ${lifecycle}`;
  if (type === "HOUSING_STORAGE" || type === "STORED") return `HOUSING / ${lifecycle}`;
  if (type === "CONTAINER_GRID" || type === "CONTAINER") return `CONTAINER / ${lifecycle}`;
  if (type === "DESTROYED" || lifecycle === "DISPOSED") return `DISPOSED / ${lifecycle}`;
  return `${type || "UNPLACED"} / ${lifecycle}`;
}

function getSubscriptionTargetDisplay(subscription = {}, citizenId = "") {
  const target = getSubscriptionCoverageTargetForUi(subscription, citizenId);
  if (target.type === "CITIZEN") {
    const citizen = window.WS_APP.getCitizenById?.(target.id || citizenId) || null;
    return {
      target,
      exists: Boolean(citizen),
      title: citizen ? (getCitizenNameLabel(citizen, { legal: true }) || getCitizenShortId(citizen)) : (target.id || "UNKNOWN CITIZEN"),
      subtitle: `CITIZEN / ${citizen ? getCitizenShortId(citizen) : target.id || "MISSING"}`,
      state: citizen ? "AVAILABLE" : "MISSING",
      item: null
    };
  }

  const item = getSubscriptionTargetItemView(target.id);
  return {
    target,
    exists: Boolean(item),
    title: item?.title || item?.name || item?.displayName || item?.definitionId || target.id || "UNKNOWN ITEM",
    subtitle: item ? `${item.instanceId || target.id} / ${item.definitionId || "NO DEFINITION"}` : `${target.id || "NO ID"} / ITEM MISSING`,
    state: item ? getSubscriptionTargetLocationLabel(item) : "MISSING",
    item
  };
}

function getSubscriptionEntitlementEvaluationTime() {
  return String(
    window.WS_APP.getCampaignTimeIso?.()
    || window.WS_APP.CAMPAIGN_TIME_ISO
    || window.WS_APP.getCampaignDateIso?.()
    || window.WS_APP.CAMPAIGN_DATE_ISO
    || ""
  ).trim();
}

function getSubscriptionEntitlementSnapshotForUi(subscription = {}, citizenId = "") {
  const source = {
    ...subscription,
    citizenId: String(subscription.citizenId || citizenId || "").trim()
  };
  const atTime = getSubscriptionEntitlementEvaluationTime();
  if (typeof window.WS_APP.getSubscriptionContractEntitlementSnapshot === "function") {
    try {
      const snapshot = window.WS_APP.getSubscriptionContractEntitlementSnapshot(source, atTime) || null;
      if (snapshot && typeof snapshot === "object") return snapshot;
    } catch (error) {
      // Render paths remain read-only and fall back to persisted compatibility axes.
    }
  }

  const status = subscriptionUiToken(
    source.entitlementStatus
    || (source.contractStatus === "CANCELLED" ? "CANCELLED" : source.billingStatus || source.status || "PENDING")
  );
  return {
    allowed: ["ACTIVE", "GRACE_PERIOD"].includes(status),
    status,
    citizenId: source.citizenId,
    subscriptionContractId: source.subscriptionContractId || source.id || null,
    subscriptionCatalogId: source.subscriptionCatalogId || source.catalogId || null,
    coverageTarget: getSubscriptionCoverageTargetForUi(source, source.citizenId),
    reasons: [],
    evaluatedAt: atTime || null,
    currentPeriodEnd: source.currentPeriodEnd || source.endDate || source.renewalDate || null,
    gracePeriodEndsAt: source.gracePeriodEndsAt || null
  };
}

function getSubscriptionTargetDiagnostics(subscription = {}, citizenId = "") {
  const catalog = getSubscriptionCatalogForUi(subscription);
  const entitlementSnapshot = getSubscriptionEntitlementSnapshotForUi(subscription, citizenId);
  const target = entitlementSnapshot.coverageTarget && typeof entitlementSnapshot.coverageTarget === "object"
    ? entitlementSnapshot.coverageTarget
    : getSubscriptionCoverageTargetForUi(subscription, citizenId);
  const validation = typeof window.WS_APP.validateSubscriptionCoverageTarget === "function"
    ? window.WS_APP.validateSubscriptionCoverageTarget({
      citizenId,
      subscriptionCatalogId: subscription.subscriptionCatalogId || subscription.catalogId || catalog?.subscriptionCatalogId || catalog?.id || "",
      tierId: subscription.tierId || "",
      coverageTarget: target,
      catalog
    })
    : { valid: target.type === "CITIZEN", errors: target.type === "CITIZEN" ? [] : ["SUBSCRIPTION_TARGET_VALIDATOR_UNAVAILABLE"], reasons: [] };
  const codes = Array.from(new Set([
    ...(Array.isArray(entitlementSnapshot?.reasons) ? entitlementSnapshot.reasons.map((reason) => reason?.code || reason).filter(Boolean) : []),
    ...(Array.isArray(validation?.errors) ? validation.errors : []),
    ...(Array.isArray(validation?.reasons) ? validation.reasons.map((reason) => reason?.code).filter(Boolean) : [])
  ]));
  const entitlementStatus = subscriptionUiToken(entitlementSnapshot.status || "NOT_FOUND");
  return {
    catalog,
    target,
    validation,
    valid: validation?.valid === true,
    allowed: entitlementSnapshot.allowed === true,
    entitlementStatus,
    entitlementSnapshot,
    evaluatedAt: entitlementSnapshot.evaluatedAt || null,
    currentPeriodEnd: entitlementSnapshot.currentPeriodEnd || subscription.currentPeriodEnd || subscription.endDate || subscription.renewalDate || null,
    gracePeriodEndsAt: entitlementSnapshot.gracePeriodEndsAt || subscription.gracePeriodEndsAt || null,
    reasonCodes: codes
  };
}

function getSubscriptionEntitlementCodesForUi(subscription = {}, catalog = null) {
  const definition = catalog || getSubscriptionCatalogForUi(subscription) || {};
  const tier = (definition.tiers || []).find((candidate) => String(candidate.tierId || candidate.id || "") === String(subscription.tierId || "")) || null;
  return Array.from(new Set([
    ...(Array.isArray(definition.entitlementCodes) ? definition.entitlementCodes : []),
    ...(Array.isArray(tier?.entitlementCodes) ? tier.entitlementCodes : [])
  ].map((code) => String(code || "").trim()).filter(Boolean)));
}

function formatSubscriptionTargetCandidate(candidate = {}, citizenId = "") {
  const target = candidate.coverageTarget || { type: "CITIZEN", id: citizenId };
  const display = getSubscriptionTargetDisplay({ coverageTarget: target }, citizenId);
  const reasonCodes = Array.from(new Set([
    ...(Array.isArray(candidate.errors) ? candidate.errors : []),
    ...(Array.isArray(candidate.reasons) ? candidate.reasons.map((reason) => reason?.code).filter(Boolean) : [])
  ]));
  return {
    ...candidate,
    coverageTarget: target,
    value: `${target.type}::${target.id}`,
    label: target.type === "CITIZEN"
      ? `${display.title} / CITIZEN`
      : `${display.title} / ${display.state}`,
    reasonCodes,
    display
  };
}

function getSubscriptionTargetCandidatesForUi(input = {}) {
  const citizenId = String(input.citizenId || "").trim();
  const catalog = input.catalog || getSubscriptionCatalogForUi(input.subscription || input);
  const policy = getSubscriptionTargetPolicyForUi(catalog || input.subscription || input);
  const api = getSubscriptionCommandApi();
  const candidates = [];

  if (policy.allowedTargetTypes.includes("CITIZEN")) {
    const citizenContracts = api?.getSubscriptionContractsForTarget?.({
      citizenId,
      subscriptionCatalogId: catalog?.subscriptionCatalogId || catalog?.id || input.subscription?.subscriptionCatalogId || input.subscription?.catalogId || "",
      targetType: "CITIZEN",
      targetId: citizenId,
      includeCancelled: false
    }) || [];
    const openCitizenContracts = citizenContracts.filter((contract) => subscriptionUiToken(contract.contractStatus) !== "CANCELLED");
    candidates.push(formatSubscriptionTargetCandidate({
      coverageTarget: { type: "CITIZEN", id: citizenId },
      valid: Boolean(citizenId),
      available: Boolean(citizenId) && openCitizenContracts.length === 0,
      errors: citizenId ? [] : ["SUBSCRIPTION_CITIZEN_ID_REQUIRED"],
      reasons: [],
      existingSubscriptionContractIds: citizenContracts.map((contract) => contract.subscriptionContractId),
      openSubscriptionContractIds: openCitizenContracts.map((contract) => contract.subscriptionContractId)
    }, citizenId));
  }

  if (policy.allowedTargetTypes.includes("ITEM_INSTANCE")) {
    const itemCandidates = api?.getEligibleSubscriptionTargets?.({
      citizenId,
      subscriptionCatalogId: catalog?.subscriptionCatalogId || catalog?.id || input.subscription?.subscriptionCatalogId || input.subscription?.catalogId || "",
      tierId: input.tierId || input.subscription?.tierId || "",
      targetType: "ITEM_INSTANCE",
      includeIneligible: true,
      includeCancelled: false
    }) || [];
    candidates.push(...itemCandidates.map((candidate) => formatSubscriptionTargetCandidate(candidate, citizenId)));
  }

  return candidates;
}

function renderSubscriptionTargetSelector(subscription = {}, citizenId = "", options = {}) {
  const diagnostics = getSubscriptionTargetDiagnostics(subscription, citizenId);
  const policy = getSubscriptionTargetPolicyForUi(diagnostics.catalog || subscription);
  if (!policy.allowedTargetTypes.includes("ITEM_INSTANCE") && diagnostics.target.type !== "ITEM_INSTANCE") return "";

  const contractId = String(subscription.subscriptionContractId || subscription.id || "").trim();
  const candidates = getSubscriptionTargetCandidatesForUi({
    citizenId,
    subscription,
    catalog: diagnostics.catalog,
    tierId: subscription.tierId || ""
  });
  const currentValue = `${diagnostics.target.type}::${diagnostics.target.id}`;
  if (!candidates.some((candidate) => candidate.value === currentValue)) {
    candidates.unshift(formatSubscriptionTargetCandidate({
      coverageTarget: diagnostics.target,
      valid: diagnostics.valid,
      available: true,
      errors: diagnostics.reasonCodes,
      reasons: [],
      openSubscriptionContractIds: [contractId]
    }, citizenId));
  }

  const disabled = subscriptionUiToken(subscription.contractStatus) === "CANCELLED" || subscriptionUiToken(subscription.status) === "CANCELLED";
  return `
    <div class="subscription-target-control">
      <label>
        Coverage target
        <select data-subscription-target-select="${escapeHtml(contractId)}" ${disabled ? "disabled" : ""}>
          ${candidates.map((candidate) => {
            const current = candidate.value === currentValue;
            const blockedByOtherContract = Array.isArray(candidate.openSubscriptionContractIds)
              && candidate.openSubscriptionContractIds.some((id) => String(id) !== contractId);
            const selectable = current || (candidate.valid === true && candidate.available !== false && !blockedByOtherContract);
            const suffix = !candidate.valid
              ? ` / ${candidate.reasonCodes[0] || "INELIGIBLE"}`
              : blockedByOtherContract
                ? " / ALREADY COVERED"
                : "";
            return `<option value="${escapeHtml(candidate.value)}" ${current ? "selected" : ""} ${selectable ? "" : "disabled"}>${escapeHtml(candidate.label + suffix)}</option>`;
          }).join("")}
        </select>
      </label>
      <button type="button" data-subscription-target-apply="${escapeHtml(contractId)}" ${disabled ? "disabled" : ""}>${options.admin ? "Apply Target" : "Change Target"}</button>
    </div>
  `;
}

function renderSubscriptionAssetContractPanel(subscription = {}, citizenId = "", options = {}) {
  const diagnostics = getSubscriptionTargetDiagnostics(subscription, citizenId);
  const display = getSubscriptionTargetDisplay(subscription, citizenId);
  const entitlementCodes = getSubscriptionEntitlementCodesForUi(subscription, diagnostics.catalog);
  const stateClass = diagnostics.allowed ? "is-valid" : "is-revoked";
  const targetKind = diagnostics.target.type === "ITEM_INSTANCE" ? "ASSET CONTRACT" : "CITIZEN CONTRACT";

  return `
    <section class="subscription-asset-contract ${stateClass}">
      <header>
        <div>
          <p class="kicker">${escapeHtml(targetKind)}</p>
          <h5>${escapeHtml(display.title)}</h5>
          <small>${escapeHtml(display.subtitle)}</small>
        </div>
        <span class="subscription-entitlement-state ${escapeHtml(diagnostics.entitlementStatus.toLowerCase())}">${escapeHtml(diagnostics.entitlementStatus)}</span>
      </header>
      <div class="subscription-target-summary-grid">
        ${renderDataRow("TARGET TYPE", diagnostics.target.type)}
        ${renderDataRow("TARGET ID", diagnostics.target.id || "MISSING")}
        ${renderDataRow("TARGET STATE", display.state)}
        ${renderDataRow("TARGET VALID", diagnostics.valid ? "YES" : "NO")}
      </div>
      ${diagnostics.reasonCodes.length ? `
        <div class="subscription-target-diagnostics">
          <b>TARGET DIAGNOSTICS</b>
          ${diagnostics.reasonCodes.map((code) => `<span>${escapeHtml(code)}</span>`).join("")}
        </div>
      ` : ""}
      ${entitlementCodes.length ? `
        <div class="subscription-entitlement-targets">
          <b>EXACT ENTITLEMENT TARGET</b>
          <small>${escapeHtml(`${diagnostics.target.type}:${diagnostics.target.id}`)}</small>
          <div>${entitlementCodes.map((code) => `<span>${escapeHtml(code)}</span>`).join("")}</div>
        </div>
      ` : ""}
      ${renderSubscriptionTargetSelector(subscription, citizenId, options)}
    </section>
  `;
}

function parseSubscriptionTargetControlValue(value = "", citizenId = "") {
  const [typeValue, ...idParts] = String(value || "").split("::");
  const type = subscriptionUiToken(typeValue || "CITIZEN") || "CITIZEN";
  return {
    type,
    id: String(idParts.join("::") || (type === "CITIZEN" ? citizenId : "")).trim()
  };
}

function bindSubscriptionTargetControls(user, options = {}) {
  document.querySelectorAll("[data-subscription-target-apply]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (getSubscriptionActionFeedback()?.isBusy?.(button)) return;
      const contractId = String(button.dataset.subscriptionTargetApply || "").trim();
      const control = button.closest(".subscription-target-control");
      const select = control?.querySelector("[data-subscription-target-select]")
        || Array.from(document.querySelectorAll("[data-subscription-target-select]")).find((candidate) => String(candidate.dataset.subscriptionTargetSelect || "") === contractId)
        || null;
      const citizenId = String(options.citizenId || user?.citizenId || "").trim();
      const target = parseSubscriptionTargetControlValue(select?.value || "", citizenId);
      if (!contractId || !target.id) {
        presentSubscriptionActionResult(options.admin ? "ADMIN" : "PLAYER", "TARGET", { ok: false, resultCode: "SUBSCRIPTION_TARGET_REQUIRED" });
        return;
      }

      const confirmed = await window.WS_APP.confirmAction?.({
        title: "CHANGE SUBSCRIPTION TARGET",
        message: `Bind this contract to ${target.type}:${target.id}? Entitlement will be recalculated for the exact target.`,
        confirmLabel: "Apply Target",
        cancelLabel: "Cancel",
        tone: "default"
      });
      if (!confirmed) return;

      const release = lockSubscriptionAction(button, "REBINDING...");
      const api = getSubscriptionCommandApi();
      let result;
      try {
        result = api?.changeSubscriptionCoverageTarget?.(contractId, target, {
          createdBy: options.admin ? (user?.login || "ADMIN") : (user?.login || citizenId || "PLAYER"),
          reason: options.admin ? "ADMIN_SUBSCRIPTION_TARGET_CHANGED" : "PLAYER_SUBSCRIPTION_TARGET_CHANGED",
          idempotencyKey: `subscriptions-ui:target:${contractId}:${target.type}:${target.id}`
        }) || { ok: false, resultCode: "SUBSCRIPTION_API_UNAVAILABLE" };
      } catch (error) {
        result = { ok: false, resultCode: error?.code || "SUBSCRIPTION_TARGET_UPDATE_FAILED" };
      }

      presentSubscriptionActionResult(options.admin ? "ADMIN" : "PLAYER", "TARGET", result, {
        targetLabel: `${target.type}:${target.id}`
      });
      if (!result?.ok) {
        release();
        return;
      }

      options.onChanged?.(result);
    });
  });
}

function getSubscriptionTierIdForUi(tier = {}) {
  return String(tier?.tierId || tier?.id || "").trim();
}

function prepareSubscriptionProfileRender() {
  window.WS_APP.subscriptionWorkspace?.cancelScheduledRender?.();
  window.WS_APP.subscriptionWorkspace?.captureScroll?.();
}

function renderSubscriptionPurchaseTargetSelect(user, service = {}, tier = {}, options = {}) {
  const citizenId = String(options.citizenId || user?.citizenId || "").trim();
  const policy = getSubscriptionTargetPolicyForUi(service);
  if (!policy.allowedTargetTypes.includes("ITEM_INSTANCE")) return "";
  const candidates = getSubscriptionTargetCandidatesForUi({ citizenId, catalog: service, tierId: getSubscriptionTierIdForUi(tier) });
  const selectable = candidates.filter((candidate) => candidate.valid === true && candidate.available !== false);
  const defaultCandidate = selectable.find((candidate) => candidate.coverageTarget.type === policy.defaultTargetType)
    || selectable[0]
    || null;
  return `
    <label class="subscription-purchase-target">
      Contract target
      <select data-subscription-purchase-target>
        ${selectable.length ? selectable.map((candidate) => `<option value="${escapeHtml(candidate.value)}" ${candidate.value === defaultCandidate?.value ? "selected" : ""}>${escapeHtml(candidate.label)}</option>`).join("") : '<option value="" disabled selected>NO ELIGIBLE TARGET</option>'}
      </select>
      <small>${selectable.length ? "The contract entitlement is bound to this exact target." : "No eligible Citizen or ItemInstance target is available."}</small>
    </label>
  `;
}

function toSubscriptionUiCommandResult(result = {}) {
  if (result?.ok) {
    return {
      ...(result.billingResult || {}),
      ok: true,
      citizen: result.citizen || null,
      contract: result.contract || null,
      resultCode: result.resultCode || "OK",
      idempotentReplay: result.idempotentReplay === true
    };
  }
  return {
    ok: false,
    reason: result?.errorCode || result?.resultCode || "SUBSCRIPTION_COMMAND_FAILED",
    ...(result?.billingResult || {})
  };
}

function executeSubscriptionBillingCommand(citizenId, options = {}) {
  const api = getSubscriptionCommandApi();
  if (!api) return { ok: false, reason: "SUBSCRIPTION_API_UNAVAILABLE" };
  const result = options.subscriptionId && !options.category && !(Array.isArray(options.subscriptionIds) && options.subscriptionIds.length)
    ? api.processSubscriptionBilling?.(options.subscriptionId, options)
    : api.processCitizenSubscriptionBilling?.(citizenId, options);
  return toSubscriptionUiCommandResult(result);
}

function executeSubscriptionStatusCommand(subscriptionContractId, status, options = {}) {
  const api = getSubscriptionCommandApi();
  const normalizedStatus = String(status || "PENDING").trim().toUpperCase();
  if (!api) return { ok: false, errorCode: "SUBSCRIPTION_API_UNAVAILABLE" };
  if (normalizedStatus === "SUSPENDED") {
    return api.suspendSubscriptionContract?.(subscriptionContractId, options.reason || "ADMIN_STATUS_OVERRIDE", options);
  }
  if (normalizedStatus === "CANCELLED") {
    return api.cancelSubscriptionContract?.(subscriptionContractId, options.reason || "ADMIN_STATUS_OVERRIDE", {
      ...options,
      waiveCharge: options.waiveCharge === true
    });
  }
  if (["PAID", "PENDING", "OVERDUE"].includes(normalizedStatus)) {
    return api.setSubscriptionBillingStatus?.(subscriptionContractId, normalizedStatus, options);
  }
  return { ok: false, errorCode: "SUBSCRIPTION_BILLING_STATUS_INVALID" };
}

function getCatalogTierPrices(definition = {}) {
  return window.WS_APP.getSubscriptionCatalogTierPrices?.(definition) || [];
}

function getCatalogLowestTierAmount(definition = {}) {
  return window.WS_APP.getSubscriptionCatalogLowestTierAmount?.(definition) || 0;
}

function getCatalogWeeklyRangeLabel(definition = {}) {
  return window.WS_APP.getSubscriptionCatalogWeeklyRangeLabel?.(definition) || "NO PRICE";
}

function normalizeSubscriptionMarketInput(value) {
  const normalized = window.WS_APP.normalizeSubscriptionMarketInput?.(value);
  if (normalized) return normalized;
  const fallback = String(value || "SYSTEM").trim().toUpperCase();
  return fallback === "PRIVATE" ? "PRIVATE" : "SYSTEM";
}

function getVisibleSubscriptions(user) {
  const citizens = window.WS_APP.getCitizens();

  if (user.role === "admin") {
    return citizens
      .filter((citizen) => citizen.recordType !== "admin")
      .flatMap((citizen) => normalizeSubscriptions(citizen));
  }

  const citizen = window.WS_APP.getCitizenById(user.citizenId);
  return normalizeSubscriptions(citizen);
}

const normalizeSubscriptions = (...args) => window.WS_APP.normalizeSubscriptions(...args);
const getCitizenFinancialLedger = (...args) => window.WS_APP.getCitizenFinancialLedger(...args);
const getCitizenSubscriptionSummary = (...args) => window.WS_APP.getCitizenSubscriptionSummary(...args);
const getSubscriptionActivityStatus = (...args) => window.WS_APP.getSubscriptionActivityStatus(...args);
const isSubscriptionPayable = (...args) => window.WS_APP.isSubscriptionPayable(...args);
const sumPayableSubscriptions = (...args) => window.WS_APP.sumPayableSubscriptions(...args);
const formatDateDisplay = (...args) => window.WS_APP.formatDateDisplay(...args);

function resolveCitizenSubscriptionTileInput(input, options = {}) {
  if (Array.isArray(input)) return input;
  if (input && Array.isArray(input.activeSubscriptions)) return options.activeOnly === false ? (input.currentSubscriptions || input.subscriptions || []) : input.activeSubscriptions;
  if (input && Array.isArray(input.subscriptions) && typeof input.subscriptionTotal === "number") {
    const currentSubscriptions = input.subscriptions.filter((subscription) => String(subscription.status || "").toUpperCase() !== "CANCELLED");
    return options.activeOnly === false ? currentSubscriptions : currentSubscriptions.filter((subscription) => subscription.active);
  }
  const summary = getCitizenSubscriptionSummary(input || {});
  return options.activeOnly === false ? summary.currentSubscriptions : summary.activeSubscriptions;
}

function renderCitizenSubscriptionSummaryTiles(input = [], options = {}) {
  const subscriptions = resolveCitizenSubscriptionTileInput(input, options);
  const emptyLabel = options.emptyLabel || "No active subscriptions";

  if (!Array.isArray(subscriptions) || !subscriptions.length) {
    return `<p class="file-empty">${escapeHtml(emptyLabel)}</p>`;
  }

  return subscriptions.map((subscription) => {
    const tier = getSubscriptionTierLabel(subscription);
    const title = subscription.title || (tier && tier !== "No tier" ? tier : "Subscription");

    return `
      <button type="button" class="citizen-card-subscription-tile" data-view-subscription-id="${escapeHtml(subscription.id)}">
        ${renderSubscriptionLogo(subscription)}
        <span class="citizen-card-subscription-main">
          <b>${escapeHtml(title)}</b>
          <small>${escapeHtml(tier)}</small>
        </span>
        <span class="citizen-card-subscription-side">
          <strong>${escapeHtml(formatCredits(subscription.amount))}</strong>
          <small>${escapeHtml(String(subscription.cycle || "WEEKLY").toUpperCase())}</small>
        </span>
      </button>
    `;
  }).join("");
}

function getCitizenInsuranceLabel(citizen = {}) {
  const insuranceSubscriptions = normalizeSubscriptions(citizen)
    .filter((subscription) => subscription.category === "INSURANCE" && String(subscription.status || "").toUpperCase() !== "CANCELLED")
    .map((subscription) => {
      const tier = getSubscriptionTierLabel(subscription);
      return tier && tier !== "No tier"
        ? `${subscription.provider || subscription.title}: ${tier}`
        : (subscription.title || subscription.provider || "INSURANCE");
    });

  return insuranceSubscriptions.length ? insuranceSubscriptions.join(" / ") : "N/A";
}

function openCitizenSubscriptionFromSummary(user, citizen = {}, subscriptionId = "", options = {}) {
  const normalizedId = String(subscriptionId || "").trim();
  if (!normalizedId) return false;

  const summary = getCitizenSubscriptionSummary(citizen);
  const subscription = summary.subscriptions.find((item) => String(item.id || "") === normalizedId) || null;
  const returnView = typeof options.returnView === "function" ? options.returnView : null;

  if (returnView) {
    window.WS_APP.pushModuleView?.(returnView);
  }

  if (user?.role === "admin" && typeof renderAdminCitizenSubscriptionControl === "function") {
    renderAdminCitizenSubscriptionControl(user, citizen.id, {
      category: subscription?.category || "INSURANCE",
      selectedSubscriptionId: normalizedId
    });
    return true;
  }

  if (typeof renderPlayerSubscriptionProfile === "function") {
    renderPlayerSubscriptionProfile(user, normalizedId, options.returnViewId || "citizen-card");
    return true;
  }

  window.WS_APP.openModule?.("subscriptions", user, { skipLoader: true });
  return true;
}

function renderFinancialLedger(citizenOrLedger, options = {}) {
  const ledger = citizenOrLedger?.subscriptions && typeof citizenOrLedger.subscriptionTotal === "number"
    ? citizenOrLedger
    : getCitizenFinancialLedger(citizenOrLedger);
  const showSubscriptionDossier = options.showSubscriptionDossier === true;
  const showControlLink = options.showControlLink === true;
  const controlLabel = options.controlLabel || "Open Subscription Control";

  return `
    <div class="financial-ledger ${showSubscriptionDossier ? "has-subscription-dossier" : ""}">
      <div class="financial-ledger-summary compact-finance-summary">
        ${renderDataRow("CREDITS", formatCredits(ledger.credits))}
        ${renderDataRow("INCOME", formatCredits(ledger.incomeTotal))}
        ${renderDataRow("DEBT", ledger.debtLabel)}
        ${renderDataRow("NET CYCLE", formatCredits(ledger.netCycle))}
        ${renderDataRow("SUBSCRIPTION COST", formatCredits(ledger.subscriptionTotal))}
      </div>

      <div class="financial-ledger-columns finance-ledger-detail-grid">
        <section>
          <h5>Income</h5>
          ${ledger.income.length ? ledger.income.map((income) => `
            <div class="financial-ledger-item">
              <span>
                <b>${escapeHtml(income.title)}</b>
                <small>${escapeHtml(income.provider)} / ${escapeHtml(income.cycle)}</small>
              </span>
              <strong>${escapeHtml(formatCredits(income.amount))}</strong>
            </div>
          `).join("") : '<p class="file-empty">No income records</p>'}
        </section>

        ${showSubscriptionDossier ? `
          <section class="financial-subscription-section">
            <div class="financial-subscription-head">
              <h5>Subscription Dossier</h5>
              ${showControlLink ? `<button class="subscription-inline-link" type="button" data-open-citizen-subscriptions="1">${escapeHtml(controlLabel)}</button>` : ""}
            </div>
            ${renderCitizenSubscriptionDossier(ledger.subscriptions)}
          </section>
        ` : `
          <section>
            <h5>Subscriptions</h5>
            ${ledger.subscriptions.length ? ledger.subscriptions.map((subscription) => `
              <div class="financial-ledger-item">
                <span>
                  <b>${escapeHtml(subscription.title)}</b>
                  <small>${escapeHtml(subscription.provider)} / ${escapeHtml(subscription.category)}${subscription.tierLabel ? ` / ${escapeHtml(subscription.tierLabel)}` : ""}</small>
                </span>
                <strong>${escapeHtml(formatCredits(subscription.amount))}</strong>
              </div>
            `).join("") : '<p class="file-empty">No subscription records</p>'}
          </section>
        `}
      </div>
    </div>
  `;
}

function renderCitizenSubscriptionDossier(subscriptions = []) {
  const current = subscriptions.filter((subscription) => String(subscription.status || "").toUpperCase() !== "CANCELLED");

  if (!current.length) {
    return '<p class="file-empty">No current subscriptions</p>';
  }

  return `
    <div class="citizen-subscription-dossier">
      ${getSubscriptionCategories().map((category) => {
        const items = current.filter((subscription) => subscription.category === category.id);
        if (!items.length) return "";

        return `
          <section class="citizen-subscription-category">
            <header>
              <span>${escapeHtml(category.title)}</span>
              <b>${escapeHtml(items.length)}</b>
            </header>
            <div class="citizen-subscription-banners">
              ${items.map((subscription) => renderCitizenSubscriptionBanner(subscription)).join("")}
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function renderCitizenSubscriptionBanner(subscription) {
  const status = String(subscription.status || (subscription.active ? "ACTIVE" : "INACTIVE")).toUpperCase();
  const tier = subscription.tierLabel || subscription.tier || "NO TIER";

  return `
    <div class="citizen-subscription-banner">
      ${renderSubscriptionLogo(subscription)}
      <span>
        <b>${escapeHtml(subscription.title || "Subscription")}</b>
        <small>${escapeHtml(subscription.provider || "LOCAL LEDGER")}</small>
      </span>
      <span>
        <strong>${escapeHtml(tier)}</strong>
        <small>${escapeHtml(formatCredits(subscription.amount))} / ${escapeHtml(subscription.cycle || "WEEKLY")}</small>
        ${subscription.paidUntil || subscription.renewalDate ? `<small>PAID UNTIL ${escapeHtml(formatDateDisplay(subscription.paidUntil || subscription.renewalDate))}</small>` : ""}
      </span>
      <i class="payment-tag ${escapeHtml(status.toLowerCase())}">${escapeHtml(status)}</i>
    </div>
  `;
}

function getSubscriptionCategories() {
  return window.WS_APP.getSubscriptionCatalogCategories?.() || SUBSCRIPTION_CATEGORIES;
}

function getSubscriptionCategory(category) {
  return getSubscriptionCategories().find((item) => item.id === String(category || "").toUpperCase()) || getSubscriptionCategories().find((item) => item.id === "OTHER");
}

function getSubscriptionCategoryTitle(category) {
  const entry = getSubscriptionCategory(category);
  return entry?.title || String(category || "OTHER").toUpperCase();
}

function getSubscriptionCatalog(category = null) {
  const options = category ? { category: String(category).toUpperCase() } : {};
  return window.WS_APP.getSubscriptionCatalog?.(options) || [];
}

function bindSubscriptionOverviewActions(user) {
  document.querySelectorAll("[data-view-subscription-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const returnView = button.dataset.returnView || "";
      const workspaceView = ["OVERVIEW", "CONTRACTS", "CATALOG", "PROVIDERS"].includes(String(returnView).toUpperCase())
        ? String(returnView).toUpperCase()
        : "";
      if (workspaceView && typeof window.WS_APP.renderPlayerSubscriptionsWorkspace === "function") {
        window.WS_APP.pushModuleView?.(() => window.WS_APP.renderPlayerSubscriptionsWorkspace(user, { view: workspaceView }));
      } else if (returnView === "buy") {
        window.WS_APP.pushModuleView?.(() => renderPlayerSubscriptionsModule(user, { panel: "buy" }));
      } else {
        window.WS_APP.pushModuleView?.(() => renderPlayerSubscriptionsModule(user, { panel: "my" }));
      }
      renderPlayerSubscriptionProfile(user, button.dataset.viewSubscriptionId, returnView);
    });
  });
}
function getSubscriptionStatusClass(status = "PENDING") {
  return `subscription-status-${String(status || "PENDING").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function getSubscriptionTierLabel(subscription = {}) {
  const explicit = String(subscription.tierLabel || subscription.tier || "").trim();
  if (explicit && explicit.toUpperCase() !== "NO TIER") return explicit;
  const service = window.WS_APP.getSubscriptionCatalogItemById?.(subscription.catalogId);
  const tiers = (service?.tiers || []).filter((item) => !item.archived);
  const tier = tiers.find((item) => item.id === subscription.tierId)
    || tiers.find((item) => parseCreditValue(item.amount) === parseCreditValue(subscription.amount) && String(item.cycle || "WEEKLY").toUpperCase() === String(subscription.cycle || "WEEKLY").toUpperCase())
    || tiers.find((item) => String(subscription.title || "").toUpperCase().includes(String(item.label || "").toUpperCase()));
  return tier?.label || "No tier";
}

function renderSubscriptionServiceTile(subscription, options = {}) {
  const title = subscription.title || getSubscriptionTierLabel(subscription) || "Subscription";
  const tier = getSubscriptionTierLabel(subscription);
  const status = String(subscription.status || "PENDING").toUpperCase();
  const returnView = options.returnView || "";
  const stateMarkup = options.showState ? renderSubscriptionStateTag("OWNED") : "";
  const statusMarkup = `<i class="payment-tag ${escapeHtml(status.toLowerCase())}">${escapeHtml(status)}</i>`;

  return `
    <button class="subscription-service-card subscription-owned-card ${escapeHtml(getSubscriptionStatusClass(status))}" type="button" data-view-subscription-id="${escapeHtml(subscription.id)}" ${returnView ? `data-return-view="${escapeHtml(returnView)}"` : ""}>
      <span class="subscription-service-main">
        <span class="subscription-service-header">
          ${renderSubscriptionLogo(subscription)}
          <span class="subscription-service-identity">
            <b>${escapeHtml(title)}</b>
            <small>${escapeHtml(subscription.provider || "LOCAL LEDGER")}</small>
          </span>
        </span>
        <em>${escapeHtml(tier)}</em>
      </span>
      <span class="subscription-service-side">
        <span class="subscription-service-tags">
          ${stateMarkup}
          ${statusMarkup}
        </span>
        <span class="subscription-service-billing">
          <strong>${escapeHtml(formatCredits(subscription.amount))}</strong>
          <small>${escapeHtml(subscription.cycle || "WEEKLY")}</small>
          <small>SET ${escapeHtml(window.WS_APP.getSettlementPeriodEndLabel?.() || window.WS_APP.SETTLEMENT_PERIOD_END_LABEL || "-")}</small>
        </span>
      </span>
    </button>
  `;
}

function getActiveCitizenSubscriptionsForUser(user) {
  const citizen = window.WS_APP.getCitizenById(user?.citizenId);
  return normalizeSubscriptions(citizen).filter((subscription) => subscription.active);
}

function getOpenCitizenSubscriptionsForUser(user) {
  const citizen = window.WS_APP.getCitizenById(user?.citizenId);
  return normalizeSubscriptions(citizen).filter((subscription) => String(subscription.status || "").toUpperCase() !== "CANCELLED");
}

function getCatalogServiceStateTag(user, service = {}) {
  const owned = getOpenCitizenSubscriptionsForUser(user).find((subscription) => subscription.catalogId === service.id);
  return owned ? "OWNED" : "NO SERVICE";
}

function getOwnedSubscriptionForService(user, service = {}) {
  return getOpenCitizenSubscriptionsForUser(user).find((subscription) => subscription.catalogId === service.id) || null;
}

function getOwnedSubscriptionForCategory(user, category) {
  const normalizedCategory = String(category || "OTHER").toUpperCase();
  return getOpenCitizenSubscriptionsForUser(user).find((subscription) => subscription.category === normalizedCategory) || null;
}

function canHoldMultipleInCategory(category) {
  return ["CYBERWARE", "OTHER"].includes(String(category || "").toUpperCase());
}

function isAlphaProfileForSubscriptions(user) {
  const citizen = window.WS_APP.getCitizenById(user?.citizenId);
  const profile = String(citizen?.biologicalProfile || citizen?.profile || "").toUpperCase();
  return profile.includes("ALPHA");
}

function getTierIndex(service = {}, tierId = "") {
  return (service.tiers || []).filter((tier) => !tier.archived).findIndex((tier) => getSubscriptionTierIdForUi(tier) === String(tierId || ""));
}

function getTierRelationTag(user, service = {}, tier = {}) {
  const owned = getOwnedSubscriptionForService(user, service);
  if (!owned) return "NO SERVICE";
  if (String(owned.tierId || "") === getSubscriptionTierIdForUi(tier)) return "OWNED";

  const currentIndex = getTierIndex(service, owned.tierId);
  const targetIndex = getTierIndex(service, getSubscriptionTierIdForUi(tier));

  if (currentIndex >= 0 && targetIndex >= 0) {
    return targetIndex > currentIndex ? "HIGHER TIER" : "LOWER TIER";
  }

  const ownedAmount = parseCreditValue(owned.amount);
  const targetAmount = parseCreditValue(tier.amount);
  return targetAmount > ownedAmount ? "HIGHER TIER" : "LOWER TIER";
}

function renderSubscriptionStateTag(state = "NO SERVICE") {
  const normalized = String(state || "NO SERVICE").toUpperCase();
  return `<i class="subscription-state-tag subscription-state-${escapeHtml(normalized.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}">${escapeHtml(normalized)}</i>`;
}

function renderCategorySourceTags(categoryOrService = {}, options = {}) {
  const isService = categoryOrService && typeof categoryOrService === "object" && (categoryOrService.id || categoryOrService.provider || categoryOrService.tiers);
  const category = typeof categoryOrService === "string" ? getSubscriptionCategory(categoryOrService) : getSubscriptionCategory(categoryOrService.category);
  const tags = isService ? getServiceMarketTags(categoryOrService) : (category?.tags || []);
  const visibleTags = options.omitMarketTags
    ? tags.filter((tag) => !["SYSTEM", "PRIVATE"].includes(String(tag || "").toUpperCase()))
    : tags;
  return visibleTags.length ? `<span class="subscription-source-tags">${visibleTags.map((tag) => `<i class="subscription-source-${escapeHtml(slugifySubscriptionTag(tag))}">${escapeHtml(tag)}</i>`).join("")}</span>` : "";
}

function slugifySubscriptionTag(tag = "") {
  return String(tag || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "tag";
}

function renderProviderDetailTags(provider = {}) {
  const tags = (provider.tags || [provider.type]).filter((tag) => !["SYSTEM", "PRIVATE"].includes(String(tag || "").toUpperCase()));
  return tags.length ? `<span class="subscription-source-tags">${tags.map((tag) => `<i class="subscription-source-${escapeHtml(slugifySubscriptionTag(tag))}">${escapeHtml(tag)}</i>`).join("")}</span>` : "";
}

function renderMySubscriptionsView(user) {
  if (typeof window.WS_APP.renderPlayerSubscriptionsWorkspace === "function") {
    window.WS_APP.renderPlayerSubscriptionsWorkspace(user, { view: "CONTRACTS" });
    return;
  }
  window.WS_APP.subscriptionControlPanel = "my";
  renderPlayerSubscriptionsModule(user, { panel: "my" });
}

function renderOwnedSubscriptionCategorySections(subscriptions = []) {
  return getSubscriptionCategories()
    .map((category) => ({ ...category, items: subscriptions.filter((subscription) => subscription.category === category.id) }))
    .filter((category) => category.items.length)
    .map((category) => `
      <section class="subscription-owned-category-section">
        <header>
          <span>${escapeHtml(category.title)}</span>
          <i>${escapeHtml(category.items.length)}</i>
        </header>
        <div class="subscription-library-grid">
          ${category.items.map((subscription) => renderSubscriptionServiceTile(subscription, { returnView: "my", showState: true })).join("")}
        </div>
      </section>
    `).join("");
}

function renderBuySubscriptionsView(user, options = {}) {
  if (typeof window.WS_APP.renderPlayerSubscriptionsWorkspace === "function") {
    const workspaceView = String(options.view || "").toUpperCase() === "PROVIDER_LIST" ? "PROVIDERS" : "CATALOG";
    window.WS_APP.renderPlayerSubscriptionsWorkspace(user, { view: workspaceView });
    return;
  }
  const activeView = options.view ? String(options.view).toUpperCase() : getSubscriptionPurchaseView();
  window.WS_APP.subscriptionPurchaseView = ["SUBSCRIPTION_LIST", "PROVIDER_LIST"].includes(activeView) ? activeView : "SUBSCRIPTION_LIST";
  window.WS_APP.subscriptionControlPanel = "buy";
  renderPlayerSubscriptionsModule(user, { panel: "buy" });
}

function getServiceMarketTags(service = {}) {
  const inferred = window.WS_APP.inferSubscriptionMarket?.(service);
  if (inferred) return [inferred];

  const explicit = String(service.market || service.marketType || service.sourceType || "").trim().toUpperCase();
  if (["SYSTEM", "PRIVATE"].includes(explicit)) return [explicit];

  const tags = Array.isArray(service.tags) ? service.tags : [];
  const marketTags = tags.map((tag) => String(tag || "").trim().toUpperCase()).filter((tag) => tag === "SYSTEM" || tag === "PRIVATE");
  if (marketTags.length === 1) return [marketTags[0]];
  return ["SYSTEM"];
}

function renderSubscriptionMarketSection(title, description, services, user) {
  return `
    <section class="subscription-market-section subscription-market-section--${escapeHtml(String(title || "").toLowerCase())}" data-market-section="${escapeHtml(title)}">
      <header class="subscription-market-section-head">
        <div>
          <p class="kicker">${escapeHtml(title)} SERVICES</p>
          <p class="subscription-section-description">${escapeHtml(description)}</p>
        </div>
        <small>${escapeHtml(services.length)} SERVICE${services.length === 1 ? "" : "S"}</small>
      </header>
      <div class="subscription-shop-grid subscription-market-grid">
        ${services.length ? services.map((service) => renderPlayerCatalogCard(user, service, title)).join("") : '<p class="file-empty">No services in this section.</p>'}
      </div>
    </section>
  `;
}


function renderPlayerCatalogCard(user, service = {}, marketSource = "") {
  const lowest = getCatalogLowestTierAmount(service);
  const weeklyRange = getCatalogWeeklyRangeLabel(service);
  const tierCount = (service.tiers || []).filter((tier) => !tier.archived).length;
  const searchText = [service.title, service.provider, service.category, service.summary, service.description, ...(service.tiers || []).map((tier) => `${tier.label} ${tier.amount}`)].join(" ").toLowerCase();
  const state = getCatalogServiceStateTag(user, service);
  const category = getSubscriptionCategory(service.category);

  return `
    <button class="subscription-shop-card subscription-market-card" type="button" data-player-catalog-service="${escapeHtml(service.id || "")}" data-shop-market="${escapeHtml(marketSource)}" data-shop-category="${escapeHtml(String(service.category || "OTHER").toUpperCase())}" data-shop-price="${escapeHtml(lowest)}" data-shop-search="${escapeHtml(searchText)}">
      <span class="subscription-shop-logo-wrap">${renderSubscriptionLogo({ title: service.title, provider: service.provider, logo: service.logo, category: service.category })}</span>
      <span class="subscription-shop-main">
        <span class="subscription-card-topline">
          <b>${escapeHtml(service.title || "Subscription")}</b>
          ${renderSubscriptionStateTag(state)}
        </span>
        <small>${escapeHtml(service.provider || "LOCAL LEDGER")}</small>
        <em>${escapeHtml(service.summary || service.description || category?.description || "No description.")}</em>
        ${renderCategorySourceTags(service, { omitMarketTags: true })}
      </span>
      <span class="subscription-shop-meta">
        <strong>${escapeHtml(weeklyRange)}</strong>
        <small>${escapeHtml(String(service.category || "OTHER").toUpperCase())} / ${escapeHtml(tierCount)} TIER${tierCount === 1 ? "" : "S"}</small>
      </span>
    </button>
  `;
}

function bindPlayerSubscriptionMarket(user) {
  document.querySelectorAll("[data-player-catalog-service]").forEach((button) => {
    button.addEventListener("click", () => {
      window.WS_APP.pushModuleView?.(() => renderBuySubscriptionsView(user, { view: "SUBSCRIPTION_LIST" }));
      renderPlayerCatalogServiceProfile(user, button.dataset.playerCatalogService);
    });
  });

  const shop = document.querySelector("[data-player-subscription-market]");
  if (!shop) return;

  const searchInput = shop.querySelector("[data-subscription-shop-search]");
  const categorySelect = shop.querySelector("[data-subscription-shop-category]");
  const priceInput = shop.querySelector("[data-subscription-shop-price]");
  const cards = Array.from(document.querySelectorAll("[data-player-catalog-service]"));

  const applyFilters = () => {
    const query = String(searchInput?.value || "").trim().toLowerCase();
    const category = String(categorySelect?.value || "ALL").toUpperCase();
    const maxPrice = Number(priceInput?.value || 0);

    cards.forEach((card) => {
      const matchesQuery = !query || String(card.dataset.shopSearch || "").includes(query);
      const matchesCategory = category === "ALL" || String(card.dataset.shopCategory || "").toUpperCase() === category;
      const price = Number(card.dataset.shopPrice || 0);
      const matchesPrice = !maxPrice || (price > 0 && price <= maxPrice);
      card.hidden = !(matchesQuery && matchesCategory && matchesPrice);
    });
  };

  searchInput?.addEventListener("input", applyFilters);
  categorySelect?.addEventListener("change", applyFilters);
  priceInput?.addEventListener("input", applyFilters);
}

function bindSubscriptionPurchaseViewActions(user) {
  document.querySelectorAll("[data-subscription-purchase-view]").forEach((button) => {
    button.addEventListener("click", () => {
      window.WS_APP.subscriptionPurchaseView = button.dataset.subscriptionPurchaseView || "SUBSCRIPTION_LIST";
      renderBuySubscriptionsView(user);
    });
  });
}

function bindSubscriptionProviderListActions(user) {
  document.querySelectorAll("[data-open-subscription-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const providerId = button.dataset.openSubscriptionProvider || "";
      window.WS_APP.pushModuleView?.(() => renderBuySubscriptionsView(user, { view: "PROVIDER_LIST" }));
      renderSubscriptionProviderProfile(user, providerId);
    });
  });

  const controls = document.querySelector("[data-subscription-provider-controls]");
  const searchInput = controls?.querySelector("[data-provider-search]");
  const typeSelect = controls?.querySelector("[data-provider-type]");
  const sortSelect = controls?.querySelector("[data-provider-sort]");
  const sections = Array.from(document.querySelectorAll("[data-provider-section]"));

  const applyProviderControls = () => {
    const query = String(searchInput?.value || "").trim().toLowerCase();
    const type = String(typeSelect?.value || "ALL").toUpperCase();
    const sort = String(sortSelect?.value || "NAME").toUpperCase();

    sections.forEach((section) => {
      const sectionType = String(section.dataset.providerSection || "").toUpperCase();
      const list = section.querySelector(".subscription-provider-list");
      const cards = Array.from(section.querySelectorAll(".subscription-provider-card"));
      const typeAllowed = type === "ALL" || type === sectionType;

      cards.sort((a, b) => {
        if (sort === "SERVICES") return Number(b.dataset.providerServices || 0) - Number(a.dataset.providerServices || 0) || String(a.dataset.providerName || "").localeCompare(String(b.dataset.providerName || ""), "pl");
        if (sort === "WEEKLY_RANGE") return Number(a.dataset.providerMinPrice || 0) - Number(b.dataset.providerMinPrice || 0) || String(a.dataset.providerName || "").localeCompare(String(b.dataset.providerName || ""), "pl");
        return String(a.dataset.providerName || "").localeCompare(String(b.dataset.providerName || ""), "pl");
      }).forEach((card) => list?.appendChild(card));

      let visibleCount = 0;
      cards.forEach((card) => {
        const matchesQuery = !query || String(card.dataset.providerSearch || "").includes(query);
        const visible = typeAllowed && matchesQuery;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });

      const count = section.querySelector("[data-provider-visible-count]");
      if (count) count.textContent = String(visibleCount);
      const empty = section.querySelector(".subscription-provider-filter-empty");
      if (empty) empty.hidden = visibleCount > 0 || !typeAllowed;
      section.hidden = !typeAllowed;
    });
  };

  searchInput?.addEventListener("input", applyProviderControls);
  typeSelect?.addEventListener("change", applyProviderControls);
  sortSelect?.addEventListener("change", applyProviderControls);
  applyProviderControls();
}

function bindSubscriptionProviderProfileActions(user, providerId) {
  document.querySelectorAll("[data-provider-catalog-service]").forEach((button) => {
    button.addEventListener("click", () => {
      window.WS_APP.pushModuleView?.(() => renderSubscriptionProviderProfile(user, providerId));
      renderPlayerCatalogServiceProfile(user, button.dataset.providerCatalogService, { returnProviderId: providerId });
    });
  });
}


function getSubscriptionProfileTier(service = {}, tierId = "") {
  const tiers = (Array.isArray(service.tiers) ? service.tiers : []).filter((tier) => tier && tier.archived !== true && tier.active !== false);
  return tiers.find((tier) => String(tier.tierId || tier.id || "") === String(tierId || "")) || null;
}

function getSubscriptionProfileTierEntitlements(service = {}, tier = {}) {
  return Array.from(new Set([
    ...(Array.isArray(service.entitlementCodes) ? service.entitlementCodes : []),
    ...(Array.isArray(tier.entitlementCodes) ? tier.entitlementCodes : [])
  ].map((code) => String(code || "").trim()).filter(Boolean)));
}


function normalizeSubscriptionPresentationTextList(value = []) {
  const source = Array.isArray(value) ? value : [value];
  return Array.from(new Set(source.map((item) => String(item || "").trim()).filter(Boolean)));
}

function getSubscriptionProductPresentation(service = {}) {
  const source = service.presentation && typeof service.presentation === "object" && !Array.isArray(service.presentation)
    ? service.presentation
    : {};
  return {
    overview: String(source.overview || service.description || service.summary || "").trim(),
    benefits: normalizeSubscriptionPresentationTextList(source.benefits?.length ? source.benefits : [service.summary]),
    limitations: normalizeSubscriptionPresentationTextList(source.limitations),
    usageNotes: normalizeSubscriptionPresentationTextList(source.usageNotes),
    comparisonAxes: normalizeSubscriptionPresentationTextList(source.comparisonAxes?.length
      ? source.comparisonAxes
      : ["INCLUDED SCOPE", "LIMITS", "PRIORITY", "TARGET", "PRICE / ACTION"])
  };
}

function getSubscriptionTierPresentation(service = {}, tier = {}) {
  const source = tier.presentation && typeof tier.presentation === "object" && !Array.isArray(tier.presentation)
    ? tier.presentation
    : {};
  const comparison = source.comparisonValues && typeof source.comparisonValues === "object" && !Array.isArray(source.comparisonValues)
    ? source.comparisonValues
    : {};
  const features = normalizeSubscriptionPresentationTextList(source.features?.length ? source.features : [tier.description]);
  const limits = normalizeSubscriptionPresentationTextList(source.limits);
  const priorityLabel = String(source.priorityLabel || comparison.priority || `LEVEL ${Number(tier.tierLevel || 0) || 1}`).trim();
  return {
    features,
    limits,
    priorityLabel,
    comparisonValues: {
      scope: String(comparison.scope || features[0] || tier.description || "").trim(),
      access: String(comparison.access || features.slice(1).join(" / ") || "").trim(),
      limit: String(comparison.limit || limits.join(" / ") || "").trim(),
      priority: String(comparison.priority || priorityLabel).trim()
    }
  };
}

function renderSubscriptionPresentationList(items = [], emptyLabel = "NO APPROVED PRESENTATION DATA") {
  const values = normalizeSubscriptionPresentationTextList(items);
  if (!values.length) return `<p class="subscription-presentation-empty-v44">${escapeHtml(emptyLabel)}</p>`;
  return `<ul class="subscription-presentation-list-v44">${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderSubscriptionProductPresentation(service = {}) {
  const presentation = getSubscriptionProductPresentation(service);
  return `
    <section class="subscription-profile-section subscription-product-presentation-v44">
      ${renderSubscriptionProfileSectionHead("SERVICE PRESENTATION", "Benefits, Limits & Use")}
      <div class="subscription-product-presentation-grid-v44">
        <article>
          <small>BENEFITS</small>
          ${renderSubscriptionPresentationList(presentation.benefits, "NO APPROVED BENEFITS REGISTERED")}
        </article>
        <article>
          <small>LIMITATIONS</small>
          ${renderSubscriptionPresentationList(presentation.limitations, "NO EXPLICIT LIMITATIONS REGISTERED")}
        </article>
        <article>
          <small>USAGE NOTES</small>
          ${renderSubscriptionPresentationList(presentation.usageNotes, "NO USAGE NOTES REGISTERED")}
        </article>
      </div>
    </section>
  `;
}

function renderSubscriptionTierPresentationSummary(service = {}, tier = {}) {
  if (!tier) return "";
  const presentation = getSubscriptionTierPresentation(service, tier);
  return `
    <div class="subscription-current-tier-presentation-v44">
      <article>
        <small>INCLUDED SCOPE</small>
        ${renderSubscriptionPresentationList(presentation.features, "NO APPROVED TIER FEATURES")}
      </article>
      <article>
        <small>LIMITS</small>
        ${renderSubscriptionPresentationList(presentation.limits, "NO ADDITIONAL EXPLICIT LIMIT")}
      </article>
      <article>
        <small>PRIORITY</small>
        <b>${escapeHtml(presentation.priorityLabel)}</b>
      </article>
    </div>
  `;
}

function formatSubscriptionCoverageBenefit(benefit = {}) {
  const calculation = subscriptionUiToken(benefit.calculation || "");
  if (calculation === "FULL") return "FULL COVERAGE";
  if (calculation === "PERCENT_CAP") {
    const percent = Number(benefit.percent || 0);
    const cap = parseCreditValue(benefit.maxAmount || 0);
    return `${percent || 0}%${cap > 0 ? ` / CAP ${formatCredits(cap)}` : ""}`;
  }
  if (calculation === "FIXED") {
    const amount = parseCreditValue(benefit.amount || benefit.fixedAmount || benefit.value || 0);
    return amount > 0 ? `FIXED ${formatCredits(amount)}` : "FIXED BENEFIT";
  }
  return calculation || "REGISTERED BENEFIT";
}

function getSubscriptionProfileTierCoverage(service = {}, tier = {}) {
  const tierId = String(tier.tierId || tier.id || "");
  return (Array.isArray(service.coverageRules) ? service.coverageRules : [])
    .map((rule) => {
      const benefit = rule?.benefitsByTierId?.[tierId];
      if (!benefit) return null;
      return {
        code: String(rule.coverageCode || rule.coverageRuleId || "COVERAGE").trim(),
        value: formatSubscriptionCoverageBenefit(benefit)
      };
    })
    .filter(Boolean);
}

function getSubscriptionProfileAvailability(user, service = {}) {
  const owned = getOwnedSubscriptionForService(user, service);
  if (owned) {
    return {
      code: "OWNED",
      tone: "ok",
      title: "Existing contract",
      detail: `${getSubscriptionTierLabel(owned)} / ${String(owned.status || "PENDING").toUpperCase()}`,
      owned
    };
  }

  if (String(service.category || "").toUpperCase() === "LIVESECURITY" && !isAlphaProfileForSubscriptions(user)) {
    return {
      code: "INELIGIBLE",
      tone: "danger",
      title: "Alpha profile required",
      detail: "The current Citizen profile does not meet this catalog restriction.",
      owned: null
    };
  }

  const sameCategory = getOwnedSubscriptionForCategory(user, service.category);
  if (sameCategory && sameCategory.catalogId !== service.id && !canHoldMultipleInCategory(service.category)) {
    return {
      code: "CATEGORY OCCUPIED",
      tone: "warn",
      title: "Category contract already exists",
      detail: `${sameCategory.title || getSubscriptionTierLabel(sameCategory)} must be changed or cancelled first.`,
      owned: null
    };
  }

  const policy = getSubscriptionTargetPolicyForUi(service);
  const requiresItem = policy.allowedTargetTypes.includes("ITEM_INSTANCE") && !policy.allowedTargetTypes.includes("CITIZEN");
  if (requiresItem) {
    const candidates = getSubscriptionTargetCandidatesForUi({ citizenId: user?.citizenId || "", catalog: service });
    const available = candidates.some((candidate) => candidate.valid === true && candidate.available !== false);
    if (!available) {
      return {
        code: "NO TARGET",
        tone: "warn",
        title: "No eligible asset target",
        detail: "The catalog requires an eligible ItemInstance target before purchase.",
        owned: null
      };
    }
  }

  return {
    code: "AVAILABLE",
    tone: "ok",
    title: "Available for purchase",
    detail: "Select a package and an eligible coverage target.",
    owned: null
  };
}

function focusSubscriptionProfileHeading(container = document) {
  const heading = container?.querySelector?.("[data-subscription-profile-heading]");
  if (!heading || typeof heading.focus !== "function") return;
  const focus = () => heading.focus({ preventScroll: true });
  if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(focus);
  else window.setTimeout(focus, 0);
}

function renderSubscriptionProfileBadge(label = "", tone = "neutral") {
  return `<span class="subscription-profile-badge subscription-profile-badge--${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
}

function renderSubscriptionProfileCodeList(codes = [], emptyLabel = "NO CODES REGISTERED") {
  const normalized = Array.from(new Set((Array.isArray(codes) ? codes : []).map((code) => String(code || "").trim()).filter(Boolean)));
  if (!normalized.length) return `<span class="subscription-profile-empty-code">${escapeHtml(emptyLabel)}</span>`;
  return `<div class="subscription-profile-code-list">${normalized.map((code) => `<span>${escapeHtml(code)}</span>`).join("")}</div>`;
}

function renderSubscriptionProfileSectionHead(kicker = "", title = "", meta = "") {
  return `
    <header class="subscription-profile-section-head">
      <div>
        <p class="kicker">${escapeHtml(kicker)}</p>
        <h5>${escapeHtml(title)}</h5>
      </div>
      ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
    </header>
  `;
}

function renderSubscriptionProfileTierRow(user, service = {}, tier = {}, referenceSubscription = null) {
  const targetPolicy = getSubscriptionTargetPolicyForUi(service);
  const assetScoped = targetPolicy.allowedTargetTypes.includes("ITEM_INSTANCE") && !referenceSubscription;
  const effectiveReference = referenceSubscription || (assetScoped ? null : getOwnedSubscriptionForService(user, service));
  const relation = effectiveReference
    ? getTierRelationForReference(service, tier, effectiveReference)
    : getTierRelationTag(user, service, tier);
  const tierId = String(tier.tierId || tier.id || "");
  const coverage = getSubscriptionProfileTierCoverage(service, tier);
  const entitlements = getSubscriptionProfileTierEntitlements(service, tier);
  const presentation = getSubscriptionTierPresentation(service, tier);
  const assignableTargetCount = assetScoped
    ? getSubscriptionTargetCandidatesForUi({ citizenId: user?.citizenId || "", catalog: service, tierId })
      .filter((candidate) => candidate.valid === true && candidate.available !== false).length
    : 0;

  let actionLabel = "Buy";
  let disabled = false;
  let disabledReason = "";
  if (assetScoped) {
    actionLabel = "Assign";
    disabled = assignableTargetCount === 0;
    disabledReason = disabled ? "No eligible unassigned ItemInstance target is available." : "";
  } else if (relation === "OWNED") {
    actionLabel = "Current";
    disabled = true;
    disabledReason = "This contract already uses the selected tier.";
  } else if (relation === "HIGHER TIER") {
    actionLabel = "Upgrade";
  } else if (relation === "LOWER TIER") {
    actionLabel = "Downgrade";
  }

  const level = Number(tier.tierLevel || 0) || ((service.tiers || []).findIndex((candidate) => candidate === tier) + 1);
  const current = relation === "OWNED";
  return `
    <article class="subscription-tier-comparison-row subscription-tier-option ${current ? "is-current" : ""}" role="row" aria-label="${escapeHtml(tier.label || "Tier")}">
      <div class="subscription-tier-comparison-package" role="cell">
        <small>TIER ${escapeHtml(level || "-")}</small>
        <b>${escapeHtml(tier.label || "Tier")}</b>
        <p>${escapeHtml(tier.description || "No package description registered.")}</p>
        <details class="subscription-tier-technical-v44">
          <summary>Technical access</summary>
          ${renderSubscriptionProfileCodeList(entitlements, "NO ENTITLEMENTS")}
        </details>
      </div>
      <div class="subscription-tier-comparison-cell subscription-tier-comparison-scope-v44" role="cell">
        <small>INCLUDED SCOPE</small>
        ${renderSubscriptionPresentationList(presentation.features, "NO APPROVED TIER FEATURES")}
        ${coverage.length
          ? `<div class="subscription-tier-coverage-lines">${coverage.map((item) => `<span><b>${escapeHtml(item.value)}</b><i>${escapeHtml(item.code)}</i></span>`).join("")}</div>`
          : ""}
      </div>
      <div class="subscription-tier-comparison-cell subscription-tier-comparison-limits-v44" role="cell">
        <small>LIMITS</small>
        ${renderSubscriptionPresentationList(presentation.limits, "NO ADDITIONAL EXPLICIT LIMIT")}
      </div>
      <div class="subscription-tier-comparison-target subscription-tier-priority-target-v44" role="cell">
        <small>PRIORITY / TARGET</small>
        <b class="subscription-tier-priority-v44">${escapeHtml(presentation.priorityLabel)}</b>
        ${!effectiveReference
          ? (renderSubscriptionPurchaseTargetSelect(user, service, tier) || `<span>${escapeHtml(targetPolicy.allowedTargetTypes.join(" / "))}</span>`)
          : `<span>${escapeHtml(getSubscriptionCoverageTargetForUi(effectiveReference, user?.citizenId || "").type)}</span>`}
      </div>
      <div class="subscription-tier-comparison-action" role="cell">
        <span class="subscription-tier-comparison-price"><b>${escapeHtml(formatCredits(tier.amount))}</b><small>${escapeHtml(tier.cycle || tier.billingCycle || "WEEKLY")}</small></span>
        <span class="subscription-tier-comparison-state">${renderSubscriptionStateTag(assetScoped ? "ASSET CONTRACT" : relation || "NO SERVICE")}</span>
        <button type="button" data-purchase-catalog-tier="${escapeHtml(service.id)}::${escapeHtml(tierId)}" ${disabled ? `disabled aria-disabled="true" title="${escapeHtml(disabledReason)}"` : ""}>${escapeHtml(actionLabel)}</button>
        ${disabledReason ? `<small class="subscription-action-unavailable">${escapeHtml(disabledReason)}</small>` : ""}
      </div>
    </article>
  `;
}

function renderSubscriptionProfileTierComparison(user, service = {}, referenceSubscription = null) {
  const tiers = (Array.isArray(service.tiers) ? service.tiers : []).filter((tier) => tier && tier.archived !== true && tier.active !== false);
  const axes = getSubscriptionProductPresentation(service).comparisonAxes;
  const labels = [
    "Package",
    axes[0] || "Included Scope",
    axes[1] || "Limits",
    `${axes[2] || "Priority"} / ${axes[3] || "Target"}`,
    axes[4] || "Price / Action"
  ];
  return `
    <section class="subscription-profile-section subscription-tier-comparison subscription-tier-comparison-v44" role="table" aria-label="Subscription tier comparison">
      ${renderSubscriptionProfileSectionHead("PACKAGE COMPARISON", "Compare Tiers", `${tiers.length} PACKAGE${tiers.length === 1 ? "" : "S"}`)}
      <div class="subscription-tier-comparison-head" role="row">
        ${labels.map((label) => `<span role="columnheader">${escapeHtml(label)}</span>`).join("")}
      </div>
      <div class="subscription-tier-comparison-list" role="rowgroup">
        ${tiers.length ? tiers.map((tier) => renderSubscriptionProfileTierRow(user, service, tier, referenceSubscription)).join("") : '<p class="subscription-workspace-empty subscription-workspace-empty--large">No active tiers registered.</p>'}
      </div>
    </section>
  `;
}

function bindSubscriptionProfileNavigationActions(user, options = {}) {
  document.querySelectorAll("[data-subscription-profile-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      renderSubscriptionProviderProfile(user, button.dataset.subscriptionProfileProvider || "", {
        returnView: options.returnView || "CATALOG",
        returnServiceId: options.serviceId || "",
        returnSubscriptionId: options.subscriptionId || ""
      });
    });
  });
}

function renderSubscriptionProviderProfile(user, providerId, options = {}) {
  prepareSubscriptionProfileRender();
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const groups = getSubscriptionProviderGroups(getSubscriptionCatalog());
  const group = groups.find((item) => item.provider.id === providerId || item.id === providerId || item.provider.catalogProviderId === providerId);

  if (!container || !group) {
    if (typeof window.WS_APP.renderPlayerSubscriptionsWorkspace === "function") return window.WS_APP.renderPlayerSubscriptionsWorkspace(user, { view: "PROVIDERS" });
    return renderBuySubscriptionsView(user, { view: "PROVIDER_LIST" });
  }

  const provider = group.provider;
  const services = group.services || [];
  const categories = Array.from(new Set(services.map((service) => String(service.category || "OTHER").toUpperCase())));
  const servicesByCategory = categories.map((categoryId) => ({
    categoryId,
    category: getSubscriptionCategory(categoryId),
    services: services.filter((service) => String(service.category || "OTHER").toUpperCase() === categoryId)
  }));

  if (status) status.textContent = `SUBSCRIPTIONS / PROVIDER / ${String(provider.name || provider.id).toUpperCase()}`;

  container.innerHTML = `
    <article class="module-detail subscriptions-view subscription-provider-profile-view subscription-profile-v41" aria-labelledby="subscription-provider-profile-title">
      <header class="subscription-profile-hero-v41">
        <div class="subscription-profile-hero-v41__identity">
          ${renderSubscriptionLogo({ provider: provider.name, title: provider.name, logo: provider.logo })}
          <span>
            <p class="kicker">SUBSCRIPTIONS / PROVIDER PROFILE</p>
            <h4 id="subscription-provider-profile-title" data-subscription-profile-heading tabindex="-1">${escapeHtml(provider.name)}</h4>
            <small>${escapeHtml(provider.mainScope || "SUBSCRIPTION SERVICES")}</small>
          </span>
        </div>
        <div class="subscription-profile-hero-v41__status">
          ${renderProviderBadge(provider.type)}
          ${renderSubscriptionProfileBadge(provider.organizationResolved ? "ORGANIZATION REGISTERED" : "NO ORGANIZATION RECORD", provider.organizationResolved ? "ok" : "warn")}
          <button class="module-back-button" type="button">Back</button>
        </div>
      </header>

      ${renderSubscriptionActionFeedbackSlot("PLAYER")}

      <div class="subscription-profile-layout-v41 subscription-provider-layout-v41">
        <main class="subscription-profile-main-v41" aria-label="Provider subscription services">
          <section class="subscription-profile-section subscription-provider-brief-v41">
            ${renderSubscriptionProfileSectionHead("PROVIDER BRIEF", "Provider Overview")}
            <p>${escapeHtml(provider.brief || "No provider brief registered.")}</p>
            ${renderProviderDetailTags(provider)}
          </section>

          <section class="subscription-profile-section subscription-provider-services-v41">
            ${renderSubscriptionProfileSectionHead("PROVIDER SERVICES", "Available Services", `${services.length} SERVICE${services.length === 1 ? "" : "S"}`)}
            <div class="subscription-provider-category-groups-v41">
              ${servicesByCategory.map((entry) => `
                <section class="subscription-provider-category-v41">
                  <header><div><p class="kicker">${escapeHtml(entry.categoryId)}</p><h6>${escapeHtml(entry.category?.title || entry.categoryId)}</h6></div><small>${escapeHtml(entry.services.length)}</small></header>
                  <div class="subscription-shop-grid subscription-market-grid subscription-provider-service-grid">
                    ${entry.services.map((service) => renderProviderCatalogCard(user, service, provider.id)).join("")}
                  </div>
                </section>
              `).join("") || '<p class="subscription-workspace-empty subscription-workspace-empty--large">No services registered for this provider.</p>'}
            </div>
          </section>
        </main>

        <aside class="subscription-profile-rail-v41" aria-label="Provider record summary">
          <section class="subscription-profile-rail-card-v41">
            ${renderSubscriptionProfileSectionHead("PROVIDER RECORD", "Organization Link")}
            <div class="subscription-profile-data-list-v41">
              ${renderDataRow("STATUS", provider.organizationResolved ? "REGISTERED" : "NOT REGISTERED")}
              ${renderDataRow("ORGANIZATION ID", provider.organizationId || "NOT AVAILABLE")}
              ${renderDataRow("PROVIDER ID", provider.catalogProviderId || provider.id || "NOT AVAILABLE")}
              ${renderDataRow("PRIMARY LOCATION", provider.organizationResolved ? (provider.headquarters || "NOT AVAILABLE") : "NOT AVAILABLE")}
              ${renderDataRow("LOCATION TYPE", provider.organizationResolved ? (provider.locationType || "NOT AVAILABLE") : "NOT AVAILABLE")}
              ${renderDataRow("NETWORK CLASS", provider.organizationResolved ? (provider.networkCode || "NOT AVAILABLE") : "NOT AVAILABLE")}
            </div>
          </section>
          <section class="subscription-profile-rail-card-v41">
            ${renderSubscriptionProfileSectionHead("CATALOG SUMMARY", "Provider Range")}
            <div class="subscription-profile-data-list-v41">
              ${renderDataRow("SERVICES", services.length)}
              ${renderDataRow("WEEKLY RANGE", getProviderWeeklyRangeValue(services))}
              ${renderDataRow("MARKET", provider.type || "PRIVATE")}
              ${renderDataRow("CATEGORIES", categories.length)}
            </div>
            ${renderSubscriptionProfileCodeList(categories, "NO CATEGORIES")}
          </section>
        </aside>
      </div>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => {
    if (options.returnServiceId) return renderPlayerCatalogServiceProfile(user, options.returnServiceId, { returnView: options.returnView || "CATALOG" });
    if (options.returnSubscriptionId) return renderPlayerSubscriptionProfile(user, options.returnSubscriptionId, options.returnView || "CONTRACTS");
    if (typeof window.WS_APP.renderPlayerSubscriptionsWorkspace === "function") return window.WS_APP.renderPlayerSubscriptionsWorkspace(user, { view: options.returnView || "PROVIDERS" });
    return renderBuySubscriptionsView(user, { view: "PROVIDER_LIST" });
  });
  bindSubscriptionProviderProfileActions(user, provider.id);
  focusSubscriptionProfileHeading(container);
}

function renderProviderCatalogCard(user, service = {}, providerId = "") {
  const markup = renderPlayerCatalogCard(user, service, getServiceMarketTags(service)[0] || "SYSTEM");
  return markup
    .replace("data-player-catalog-service=", "data-provider-catalog-service=")
    .replace("subscription-market-card", "subscription-market-card subscription-provider-service-card")
    .replace("data-shop-market=", `data-return-provider="${escapeHtml(providerId)}" data-shop-market=`);
}

function renderPlayerCatalogServiceProfile(user, serviceId, options = {}) {
  prepareSubscriptionProfileRender();
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const service = window.WS_APP.getSubscriptionCatalogItemById?.(serviceId);

  if (!container || !service) {
    if (typeof window.WS_APP.renderPlayerSubscriptionsWorkspace === "function") return window.WS_APP.renderPlayerSubscriptionsWorkspace(user, { view: options.returnView || "CATALOG" });
    return renderBuySubscriptionsView(user);
  }

  const category = getSubscriptionCategory(service.category);
  const availability = getSubscriptionProfileAvailability(user, service);
  const policy = getSubscriptionTargetPolicyForUi(service);
  const providerId = getSubscriptionProviderId(service.provider || "");
  const tiers = (service.tiers || []).filter((tier) => tier && tier.archived !== true && tier.active !== false);
  const market = String(service.market || getServiceMarketTags(service)[0] || "SYSTEM").toUpperCase();
  const sameCategory = getOwnedSubscriptionForCategory(user, service.category);
  const baseEntitlements = Array.isArray(service.entitlementCodes) ? service.entitlementCodes : [];
  const itemEligibility = policy.itemEligibility && typeof policy.itemEligibility === "object" ? policy.itemEligibility : {};
  const eligibilityCodes = [
    ...(Array.isArray(itemEligibility.allowedCategories) ? itemEligibility.allowedCategories : []),
    ...(Array.isArray(itemEligibility.requiredTagsAny) ? itemEligibility.requiredTagsAny : [])
  ];

  if (status) status.textContent = `SUBSCRIPTIONS / CATALOG / ${String(service.title || service.id).toUpperCase()}`;

  container.innerHTML = `
    <article class="module-detail subscriptions-view subscription-shop-profile-view subscription-profile-v41" aria-labelledby="subscription-product-profile-title">
      <header class="subscription-profile-hero-v41">
        <div class="subscription-profile-hero-v41__identity">
          ${renderSubscriptionLogo({ title: service.title, provider: service.provider, logo: service.logo, category: service.category })}
          <span>
            <p class="kicker">SUBSCRIPTIONS / CATALOG / ${escapeHtml(String(service.category || "OTHER").toUpperCase())}</p>
            <h4 id="subscription-product-profile-title" data-subscription-profile-heading tabindex="-1">${escapeHtml(service.title || "Subscription")}</h4>
            <small>${escapeHtml(service.provider || "LOCAL LEDGER")}</small>
          </span>
        </div>
        <div class="subscription-profile-hero-v41__status">
          ${renderSubscriptionProfileBadge(availability.code, availability.tone)}
          ${renderSubscriptionProfileBadge(market, market === "SYSTEM" ? "system" : "private")}
          <button class="module-back-button" type="button">Back</button>
        </div>
      </header>

      ${renderSubscriptionActionFeedbackSlot("PLAYER")}

      <div class="subscription-profile-layout-v41">
        <main class="subscription-profile-main-v41" aria-label="Subscription product details">
          <section class="subscription-profile-section subscription-product-overview-v41">
            ${renderSubscriptionProfileSectionHead("PRODUCT OVERVIEW", "Service Scope")}
            <p class="subscription-profile-lead-v41">${escapeHtml(getSubscriptionProductPresentation(service).overview || service.description || category?.description || "No catalog description registered.")}</p>
            ${service.summary ? `<p>${escapeHtml(service.summary)}</p>` : ""}
            <div class="subscription-profile-meta-grid-v41">
              ${renderDataRow("DOMAIN", service.domain || "GENERAL")}
              ${renderDataRow("CATEGORY", service.category || "OTHER")}
              ${renderDataRow("SOURCE", market)}
              ${renderDataRow("BILLING", service.billingCycle || service.cycle || "WEEKLY")}
            </div>
            ${renderCategorySourceTags(service, { omitMarketTags: true })}
            ${sameCategory && sameCategory.catalogId !== service.id && !canHoldMultipleInCategory(service.category) ? `<div class="subscription-warning-strip">You already have ${escapeHtml(sameCategory.title || getSubscriptionTierLabel(sameCategory))} in ${escapeHtml(service.category)}.</div>` : ""}
          </section>

          ${renderSubscriptionProductPresentation(service)}
          ${renderSubscriptionProfileTierComparison(user, service, null)}
        </main>

        <aside class="subscription-profile-rail-v41" aria-label="Subscription purchase and policy summary">
          <section class="subscription-profile-rail-card-v41 subscription-profile-availability-v41 is-${escapeHtml(availability.tone)}">
            ${renderSubscriptionProfileSectionHead("AVAILABILITY", availability.title)}
            <p>${escapeHtml(availability.detail)}</p>
            ${availability.owned ? `<button type="button" data-view-subscription-id="${escapeHtml(availability.owned.id)}" data-return-view="CATALOG">Open Contract</button>` : ""}
          </section>

          <section class="subscription-profile-rail-card-v41">
            ${renderSubscriptionProfileSectionHead("TARGET POLICY", "Coverage Target")}
            <div class="subscription-profile-data-list-v41">
              ${renderDataRow("ALLOWED", policy.allowedTargetTypes.join(" / "))}
              ${renderDataRow("DEFAULT", policy.defaultTargetType)}
              ${renderDataRow("MAX TARGETS", policy.maximumTargets)}
              ${renderDataRow("OWNERSHIP CHECK", itemEligibility.requireOwnedByCitizen ? "REQUIRED" : "STANDARD")}
            </div>
            ${renderSubscriptionProfileCodeList(eligibilityCodes, "NO ADDITIONAL ITEM FILTERS")}
          </section>

          <section class="subscription-profile-rail-card-v41">
            ${renderSubscriptionProfileSectionHead("PRODUCT RECORD", "Catalog Data")}
            <div class="subscription-profile-data-list-v41">
              ${renderDataRow("PRODUCT CODE", service.productCode || service.id)}
              ${renderDataRow("PROVIDER ID", service.providerId || "NOT AVAILABLE")}
              ${renderDataRow("PACKAGES", tiers.length)}
              ${renderDataRow("REVISION", service.revision || 1)}
            </div>
            <button type="button" data-subscription-profile-provider="${escapeHtml(providerId)}">View Provider</button>
          </section>

          <section class="subscription-profile-rail-card-v41">
            ${renderSubscriptionProfileSectionHead("BASE ENTITLEMENTS", "Service Access")}
            ${renderSubscriptionProfileCodeList(baseEntitlements, "NO BASE ENTITLEMENTS")}
          </section>
        </aside>
      </div>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => {
    if (options.returnProviderId) return renderSubscriptionProviderProfile(user, options.returnProviderId, { returnView: "PROVIDERS" });
    if (typeof window.WS_APP.renderPlayerSubscriptionsWorkspace === "function") return window.WS_APP.renderPlayerSubscriptionsWorkspace(user, { view: options.returnView || "CATALOG" });
    return renderBuySubscriptionsView(user, { view: "SUBSCRIPTION_LIST" });
  });
  bindCatalogTierPurchaseActions(user, { returnTo: "buy", returnProviderId: options.returnProviderId || "", returnView: options.returnView || "CATALOG" });
  bindSubscriptionOverviewActions(user);
  bindSubscriptionProfileNavigationActions(user, { serviceId: service.id, returnView: options.returnView || "CATALOG" });
  focusSubscriptionProfileHeading(container);
}

function renderSameSubscriptionTierPanel(user, service = {}, subscription = {}) {
  const tiers = (service.tiers || []).filter((tier) => !tier.archived);
  if (!tiers.length) return "";

  return `
    <section class="subscription-tier-change-panel">
      <header>
        <div>
          <p class="kicker">PACKAGE CONTROL</p>
          <h5>Change tier / same subscription</h5>
        </div>
      </header>
      <div class="subscription-tier-options is-shop-profile">
        ${tiers.map((tier) => renderCatalogTierOption(user, service, tier, subscription, { currentSubscription: subscription, allowOwnedStatusActions: true })).join("")}
      </div>
    </section>
  `;
}

function getTierRelationForReference(service = {}, tier = {}, referenceSubscription = null) {
  if (!referenceSubscription) return "NO SERVICE";
  if (String(referenceSubscription.tierId || "") === getSubscriptionTierIdForUi(tier)) return "OWNED";

  const currentIndex = getTierIndex(service, referenceSubscription.tierId);
  const targetIndex = getTierIndex(service, getSubscriptionTierIdForUi(tier));

  if (currentIndex >= 0 && targetIndex >= 0) {
    return targetIndex > currentIndex ? "HIGHER TIER" : "LOWER TIER";
  }

  const ownedAmount = parseCreditValue(referenceSubscription.amount);
  const targetAmount = parseCreditValue(tier.amount);
  return targetAmount > ownedAmount ? "HIGHER TIER" : "LOWER TIER";
}

function renderTierOptionAction(action = null) {
  if (!action) return "";
  const disabledAttributes = action.disabled
    ? `disabled aria-disabled="true"${action.disabledReason ? ` title="${escapeHtml(action.disabledReason)}"` : ""}`
    : "";
  return `
    <button type="button" class="${escapeHtml(action.className || "")}" ${escapeHtml(action.attribute)}="${escapeHtml(action.value)}" ${disabledAttributes}>${escapeHtml(action.label)}</button>
    ${action.disabledReason ? `<small class="subscription-action-unavailable">${escapeHtml(action.disabledReason)}</small>` : ""}
  `;
}

function renderCatalogTierOption(user, service = {}, tier = {}, owned = null, options = {}) {
  const targetPolicy = getSubscriptionTargetPolicyForUi(service);
  const assetScoped = targetPolicy.allowedTargetTypes.includes("ITEM_INSTANCE") && !options.currentSubscription;
  const referenceSubscription = options.currentSubscription || (assetScoped ? null : owned);
  const relation = referenceSubscription ? getTierRelationForReference(service, tier, referenceSubscription) : getTierRelationTag(user, service, tier);
  const tags = [];
  let action = null;
  const assignableTargetCount = assetScoped
    ? getSubscriptionTargetCandidatesForUi({ citizenId: user?.citizenId || "", catalog: service, tierId: getSubscriptionTierIdForUi(tier) })
      .filter((candidate) => candidate.valid === true && candidate.available !== false).length
    : 0;

  if (relation) {
    tags.push(renderSubscriptionStateTag(relation));
  }

  if (options.currentSubscription && relation === "OWNED") {
    const currentStatus = String(options.currentSubscription.status || "PENDING").toUpperCase();
    tags.push(`<i class="payment-tag ${escapeHtml(currentStatus.toLowerCase())}">${escapeHtml(currentStatus)}</i>`);

    if (isSubscriptionPayable(options.currentSubscription)) {
      action = {
        label: "Pay",
        attribute: "data-tier-pay-subscription",
        value: options.currentSubscription.id
      };
    } else if (currentStatus !== "CANCELLED") {
      action = {
        label: "Cancel",
        attribute: "data-tier-cancel-subscription",
        value: options.currentSubscription.id,
        className: "subscription-cancel-button"
      };
    }
  } else {
    const disabled = assetScoped ? assignableTargetCount === 0 : relation === "OWNED";
    const disabledReason = assetScoped && disabled
      ? "No eligible unassigned ItemInstance target is available."
      : relation === "OWNED"
        ? "This contract already uses the selected tier."
        : "";
    const actionLabel = assetScoped
      ? "Assign"
      : referenceSubscription
        ? (relation === "HIGHER TIER" ? "Upgrade" : relation === "LOWER TIER" ? "Downgrade" : "Owned")
        : "Buy";
    if (assetScoped) tags.push(renderSubscriptionStateTag("ASSET CONTRACT"));
    action = {
      label: actionLabel,
      attribute: "data-purchase-catalog-tier",
      value: `${service.id}::${getSubscriptionTierIdForUi(tier)}`,
      disabled,
      disabledReason
    };
  }

  return `
    <article class="subscription-tier-option subscription-tier-market-option">
      <div class="subscription-tier-option-main">
        <b>${escapeHtml(tier.label || "Tier")}</b>
        <small>${escapeHtml(tier.description || "No tier description.")}</small>
      </div>
      ${!referenceSubscription ? renderSubscriptionPurchaseTargetSelect(user, service, tier) : ""}
      <div class="subscription-tier-option-side">
        <div class="subscription-tier-option-meta">
          <span class="subscription-tier-option-tags">${tags.join("")}</span>
          <span class="subscription-tier-option-actions">${renderTierOptionAction(action)}</span>
        </div>
        <div class="subscription-tier-option-billing">
          <strong>${escapeHtml(formatCredits(tier.amount))} / ${escapeHtml(tier.cycle || "WEEKLY")}</strong>
        </div>
      </div>
    </article>
  `;
}

function bindCatalogTierPurchaseActions(user, options = {}) {
  document.querySelectorAll("[data-purchase-catalog-tier]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (getSubscriptionActionFeedback()?.isBusy?.(button)) return;
      const [serviceId, tierId] = String(button.dataset.purchaseCatalogTier || "").split("::");
      const targetValue = button.closest(".subscription-tier-option")?.querySelector("[data-subscription-purchase-target]")?.value || "";
      const coverageTarget = targetValue ? parseSubscriptionTargetControlValue(targetValue, user?.citizenId || "") : null;
      await handleCatalogTierPurchase(user, serviceId, tierId, { ...options, coverageTarget, actionControl: button });
    });
  });
}

function bindSubscriptionTierProfileActions(user, subscription, returnView = "") {
  document.querySelectorAll("[data-tier-pay-subscription]").forEach((button) => {
    button.addEventListener("click", () => {
      if (getSubscriptionActionFeedback()?.isBusy?.(button)) return;
      handleSubscriptionPayment(user, {
        subscriptionId: button.dataset.tierPaySubscription || subscription.id,
        category: subscription.category,
        returnTo: "profile",
        returnView,
        actionControl: button
      });
    });
  });

  document.querySelectorAll("[data-tier-cancel-subscription]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (getSubscriptionActionFeedback()?.isBusy?.(button)) return;
      const subscriptionId = button.dataset.tierCancelSubscription || subscription.id;
      const citizen = window.WS_APP.getCitizenById(user.citizenId);
      const confirmed = await confirmRegistryAction("CANCEL SUBSCRIPTION", getSubscriptionCancellationMessage(citizen, subscriptionId), "Cancel Subscription");
      if (!confirmed) return;

      const release = lockSubscriptionAction(button, "CANCELLING...");
      let result;
      try {
        result = getSubscriptionCommandApi()?.cancelSubscriptionContract?.(subscriptionId, "USER_CANCELLED", {
          idempotencyKey: `subscriptions-ui:cancel:${subscriptionId}`
        }) || { ok: false, resultCode: "SUBSCRIPTION_API_UNAVAILABLE" };
      } catch (error) {
        result = { ok: false, resultCode: error?.code || "SUBSCRIPTION_CANCEL_FAILED" };
      }
      presentSubscriptionActionResult("PLAYER", "CANCEL", result, { details: subscription.title || subscriptionId });
      if (!result?.ok) {
        release();
        return;
      }
      renderPlayerSubscriptionProfile(user, subscriptionId, returnView);
    });
  });
}

async function handleCatalogTierPurchase(user, serviceId, tierId, options = {}) {
  const service = window.WS_APP.getSubscriptionCatalogItemById?.(serviceId);
  const tier = (service?.tiers || []).find((item) => getSubscriptionTierIdForUi(item) === String(tierId || ""));
  if (!service) {
    presentSubscriptionActionResult("PLAYER", "PURCHASE", { ok: false, resultCode: "SUBSCRIPTION_CATALOG_NOT_FOUND" });
    return;
  }
  if (!tier) {
    presentSubscriptionActionResult("PLAYER", "PURCHASE", { ok: false, resultCode: "SUBSCRIPTION_TIER_NOT_FOUND" });
    return;
  }

  if (String(service.category || "").toUpperCase() === "LIVESECURITY" && !isAlphaProfileForSubscriptions(user)) {
    presentSubscriptionActionResult("PLAYER", "PURCHASE", { ok: false, resultCode: "SUBSCRIPTION_PROFILE_INELIGIBLE" }, {
      details: "Live Security requires an ALPHA profile."
    });
    return;
  }

  const policy = getSubscriptionTargetPolicyForUi(service);
  const selectedTarget = options.coverageTarget && options.coverageTarget.id
    ? options.coverageTarget
    : policy.defaultTargetType === "CITIZEN"
      ? { type: "CITIZEN", id: user.citizenId }
      : null;
  if (!selectedTarget?.id) {
    presentSubscriptionActionResult("PLAYER", "ASSIGN", { ok: false, resultCode: "SUBSCRIPTION_TARGET_REQUIRED" });
    return;
  }
  const ownedSameService = getOpenCitizenSubscriptionsForUser(user).find((subscription) => {
    if (subscription.catalogId !== service.id) return false;
    const target = getSubscriptionCoverageTargetForUi(subscription, user.citizenId);
    return target.type === selectedTarget.type && target.id === selectedTarget.id;
  }) || null;
  const ownedSameCategory = getOwnedSubscriptionForCategory(user, service.category);

  if (ownedSameCategory && !ownedSameService && !canHoldMultipleInCategory(service.category)) {
    const continueAnyway = await window.WS_APP.confirmAction?.({
      title: "CATEGORY PACKAGE ALREADY ACTIVE",
      message: `You already have ${ownedSameCategory.title || ownedSameCategory.tierLabel || "a package"} in ${service.category}. Continue and add another package anyway?`,
      confirmLabel: "Continue",
      cancelLabel: "Cancel",
      tone: "danger"
    });
    if (!continueAnyway) return;
  }

  const currentTierIndex = ownedSameService ? getTierIndex(service, ownedSameService.tierId) : -1;
  const targetTierIndex = getTierIndex(service, getSubscriptionTierIdForUi(tier));
  const action = ownedSameService
    ? (targetTierIndex > currentTierIndex ? "UPGRADE" : targetTierIndex < currentTierIndex ? "DOWNGRADE" : "TIER")
    : policy.allowedTargetTypes.includes("ITEM_INSTANCE") ? "ASSIGN" : "PURCHASE";
  const verb = ownedSameService ? "CHANGE TIER" : "BUY SUBSCRIPTION";
  const confirmed = await window.WS_APP.confirmAction?.({
    title: verb,
    message: `${ownedSameService ? "Change" : "Add"} ${service.title} / ${tier.label} for ${formatCredits(tier.amount)} per ${tier.cycle || tier.billingCycle || "WEEKLY"}? Target: ${selectedTarget.type}:${selectedTarget.id}.`,
    confirmLabel: ownedSameService ? "Change Tier" : policy.allowedTargetTypes.includes("ITEM_INSTANCE") ? "Assign" : "Buy",
    cancelLabel: "Cancel",
    tone: "default"
  });
  if (!confirmed) return;

  const release = lockSubscriptionAction(options.actionControl, ownedSameService ? "CHANGING..." : "CREATING...");
  const payload = createSubscriptionPayloadFromTier(service, tier);
  payload.coverageTarget = selectedTarget;
  const api = getSubscriptionCommandApi();
  let result;
  try {
    result = ownedSameService
      ? api?.changeSubscriptionTier?.(ownedSameService.subscriptionContractId || ownedSameService.id, getSubscriptionTierIdForUi(tier), {
        billingStatus: "PENDING",
        idempotencyKey: `subscriptions-ui:tier:${ownedSameService.subscriptionContractId || ownedSameService.id}:${getSubscriptionTierIdForUi(tier)}`
      })
      : api?.createSubscriptionContract?.({
        ...payload,
        citizenId: user.citizenId
      }, {
        idempotencyKey: `subscriptions-ui:create:${user.citizenId}:${service.id}:${getSubscriptionTierIdForUi(tier)}:${selectedTarget.type}:${selectedTarget.id}`
      });
  } catch (error) {
    result = { ok: false, resultCode: error?.code || "SUBSCRIPTION_COMMAND_EXCEPTION" };
  }
  result = result || { ok: false, resultCode: "SUBSCRIPTION_API_UNAVAILABLE" };
  presentSubscriptionActionResult("PLAYER", action, result, {
    packageLabel: `${service.title} / ${tier.label}`,
    targetLabel: `${selectedTarget.type}:${selectedTarget.id}`
  });

  if (!result?.ok) {
    release();
    return;
  }

  const contractId = result.contract?.subscriptionContractId || result.contract?.id || ownedSameService?.subscriptionContractId || ownedSameService?.id || "";
  if (options.returnTo === "owned" && contractId) return renderPlayerSubscriptionProfile(user, contractId, options.returnView || "");
  if (!ownedSameService) {
    if (typeof window.WS_APP.renderPlayerSubscriptionsWorkspace === "function") return window.WS_APP.renderPlayerSubscriptionsWorkspace(user, { view: "CONTRACTS" });
    return renderMySubscriptionsView(user);
  }
  return renderPlayerCatalogServiceProfile(user, service.id, { returnProviderId: options.returnProviderId || "", returnView: options.returnView || "CATALOG" });
}

function renderSubscriptionAddPanel(category, purchaseState = {}) {
  if (!purchaseState.open) return "";

  const catalog = getSubscriptionCatalog(category);
  const selected = purchaseState.selectedCatalogId
    ? catalog.find((item) => item.id === purchaseState.selectedCatalogId)
    : null;

  return `
    <section class="subscription-catalog-picker">
      <header>
        <div>
          <p class="kicker">ADD SUBSCRIPTION / AVAILABLE CATALOG</p>
          <h5>${escapeHtml(getSubscriptionCategoryTitle(category))}</h5>
        </div>
      </header>

      <div class="subscription-catalog-grid">
        ${catalog.length ? catalog.map((item) => `
          <button class="subscription-catalog-card ${selected?.id === item.id ? "is-selected" : ""}" type="button" data-select-catalog-subscription="${escapeHtml(item.id)}">
            ${renderSubscriptionLogo(item)}
            <span>
              <b>${escapeHtml(item.title)}</b>
              <small>${escapeHtml(item.provider)} / ${escapeHtml((item.tiers || []).length)} tier(s)</small>
            </span>
          </button>
        `).join("") : '<p class="file-empty">No available subscriptions in this category. Add them in SYSTEM / SUBSCRIPTION CATALOG.</p>'}
      </div>

      ${selected ? renderSubscriptionTierChooser(selected, purchaseState.citizenId || "") : ""}
    </section>
  `;
}

function renderSubscriptionTierChooser(service, citizenId = "") {
  const tiers = (service.tiers || []).filter((tier) => !tier.archived);

  return `
    <div class="subscription-tier-chooser">
      <header>
        <div>
          <p class="kicker">TIER SELECTION</p>
          <h5>${escapeHtml(service.title)}</h5>
        </div>
      </header>

      <div class="subscription-tier-options">
        ${tiers.length ? tiers.map((tier) => `
          <article class="subscription-tier-option">
            ${renderSubscriptionPurchaseTargetSelect({ citizenId }, service, tier, { citizenId })}
            <div class="subscription-tier-option-main">
              <b>${escapeHtml(tier.label)}</b>
              <small>${escapeHtml(tier.description || "No tier description.")}</small>
            </div>
            <div class="subscription-tier-option-side">
              <div class="subscription-tier-option-meta">
                <span class="subscription-tier-option-tags"></span>
                <span class="subscription-tier-option-actions">
                  <button type="button" data-confirm-subscription-tier="${escapeHtml(service.id)}::${escapeHtml(getSubscriptionTierIdForUi(tier))}">Confirm Tier</button>
                </span>
              </div>
              <div class="subscription-tier-option-billing">
                <strong>${escapeHtml(formatCredits(tier.amount))} / ${escapeHtml(tier.cycle || "WEEKLY")}</strong>
              </div>
            </div>
          </article>
        `).join("") : '<p class="file-empty">No active tiers for this subscription.</p>'}
      </div>
    </div>
  `;
}


function getSubscriptionCancellationMessage(citizen, subscriptionId, options = {}) {
  const subscriptions = normalizeSubscriptions(citizen);
  const subscription = subscriptions.find((item) => item.id === subscriptionId);
  if (!subscription) return "Cancel this subscription on the citizen card? Record will remain in files.";

  if (options.admin) {
    return `Cancel ${subscription.title || "this subscription"} on the selected citizen card? Admin cancellation applies no charge.`;
  }

  const campaignIso = window.WS_APP.getCampaignDateIso?.() || "2109-02-13";
  const startIso = String(subscription.startDate || "").slice(0, 10);
  const status = String(subscription.status || "PENDING").toUpperCase();
  const free = status === "PENDING" && startIso === campaignIso;
  if (free) {
    return `Cancel ${subscription.title || "this subscription"}? Pending subscription started today; no charge will be applied.`;
  }

  return `Cancel ${subscription.title || "this subscription"}? Cancellation charge: full weekly tier cost ${formatCredits(subscription.amount)}. Missing credits will be converted to debt.`;
}

function createSubscriptionPayloadFromTier(service, tier) {
  const startDate = new Date(`${window.WS_APP.getCampaignDateIso?.() || "2109-02-13"}T00:00:00Z`);
  const settlementDate = getAlignedSubscriptionSettlementIso();

  return {
    subscriptionCatalogId: service.id,
    tierId: getSubscriptionTierIdForUi(tier),
    tierLabel: tier.label,
    category: String(service.category || "OTHER").toUpperCase(),
    title: `${service.title} / ${tier.label}`,
    providerId: service.providerId || "",
    provider: service.provider || "LOCAL LEDGER",
    organizationId: service.organizationId || "",
    logo: service.logo || "",
    amount: parseCreditValue(tier.amount),
    billingStatus: "PENDING",
    billingCycle: String(tier.cycle || "WEEKLY").toUpperCase(),
    coverageTarget: { type: "CITIZEN", id: "" },
    startDate: startDate.toISOString().slice(0, 10),
    endDate: settlementDate,
    renewalDate: settlementDate,
    description: tier.description || service.description || ""
  };
}

function getAlignedSubscriptionSettlementIso() {
  const settlementIso = String(window.WS_APP.getSettlementPeriodEndIso?.() || window.WS_APP.SETTLEMENT_PERIOD_END_ISO || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(settlementIso)) return settlementIso;

  const campaignIso = window.WS_APP.getCampaignDateIso?.() || "2109-02-13";
  const date = new Date(`${campaignIso}T00:00:00Z`);
  const daysUntilSunday = (7 - date.getUTCDay()) % 7;
  date.setUTCDate(date.getUTCDate() + daysUntilSunday);
  return date.toISOString().slice(0, 10);
}

function addDaysToIsoDate(date, days) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function renderSubscriptionLogo(subscription = {}) {
  const rawValue = String(subscription.logo || subscription.logoImage || subscription.logoUrl || "").trim();
  const value = normalizeSubscriptionLogoPath(rawValue);
  const fallback = buildSubscriptionLogoFallback(subscription, rawValue);

  if (value && isSubscriptionLogoImage(value)) {
    return `<span class="subscription-logo has-image" data-fallback="${escapeHtml(fallback)}"><img src="${escapeHtml(value)}" alt="" onerror="this.parentElement.classList.remove('has-image'); this.parentElement.textContent=this.parentElement.dataset.fallback||'?';" /></span>`;
  }

  return `<span class="subscription-logo">${escapeHtml(fallback)}</span>`;
}

function buildSubscriptionLogoFallback(subscription = {}, rawValue = "") {
  const explicit = String(rawValue || "").trim();
  if (explicit && !isSubscriptionLogoImage(normalizeSubscriptionLogoPath(explicit))) {
    return explicit
      .replace(/^.*[\/]/, "")
      .replace(/\.[a-z0-9]+$/i, "")
      .slice(0, 4)
      .toUpperCase() || "?";
  }

  return String(subscription.provider || subscription.title || subscription.category || "?")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 3)
    .toUpperCase() || "?";
}

function normalizeSubscriptionLogoPath(value) {
  if (typeof window.WS_APP.normalizeSubscriptionLogoPath === "function") {
    return window.WS_APP.normalizeSubscriptionLogoPath(value);
  }

  return String(value || "").trim();
}

function isSubscriptionLogoImage(value) {
  const normalized = normalizeSubscriptionLogoPath(value);
  return /^(https?:|data:image\/|assets\/|\.\/|\/)/i.test(normalized) || /\.(png|jpe?g|webp|svg|gif)$/i.test(normalized);
}

function formatCredits(value) {
  return formatCreditNumber(parseCreditValue(value));
}

function renderPlayerSubscriptionProfile(user, subscriptionId, returnView = "") {
  prepareSubscriptionProfileRender();
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const citizen = window.WS_APP.getCitizenById(user.citizenId);
  const subscriptions = normalizeSubscriptions(citizen);
  const subscription = subscriptions.find((item) => item.id === subscriptionId);

  if (!container || !subscription) return renderPlayerSubscriptionsModule(user);

  const service = subscription.catalogId ? window.WS_APP.getSubscriptionCatalogItemById?.(subscription.catalogId) : null;
  const tier = service ? getSubscriptionProfileTier(service, subscription.tierId) : null;
  const statusLabel = String(subscription.status || (subscription.active ? "ACTIVE" : "INACTIVE")).toUpperCase();
  const diagnostics = getSubscriptionTargetDiagnostics(subscription, user.citizenId);
  const targetDisplay = getSubscriptionTargetDisplay(subscription, user.citizenId);
  const entitlementCodes = getSubscriptionEntitlementCodesForUi(subscription, service);
  const providerId = getSubscriptionProviderId(subscription.provider || service?.provider || "");
  const payable = isSubscriptionPayable(subscription);
  const cancelled = statusLabel === "CANCELLED";
  const currentTierLabel = getSubscriptionTierLabel(subscription);

  if (status) status.textContent = `SUBSCRIPTIONS / CONTRACT / ${String(subscription.title || subscription.id).toUpperCase()}`;

  container.innerHTML = `
    <article class="module-detail subscriptions-view subscription-profile-view subscription-profile-v41" aria-labelledby="subscription-contract-profile-title">
      <header class="subscription-profile-hero-v41">
        <div class="subscription-profile-hero-v41__identity">
          ${renderSubscriptionLogo(subscription)}
          <span>
            <p class="kicker">SUBSCRIPTIONS / CONTRACT / ${escapeHtml(subscription.category || "OTHER")}</p>
            <h4 id="subscription-contract-profile-title" data-subscription-profile-heading tabindex="-1">${escapeHtml(subscription.title || "Subscription")}</h4>
            <small>${escapeHtml(subscription.provider || "LOCAL LEDGER")}</small>
          </span>
        </div>
        <div class="subscription-profile-hero-v41__status">
          ${renderSubscriptionProfileBadge(statusLabel, ["OVERDUE", "SUSPENDED", "CANCELLED"].includes(statusLabel) ? "danger" : statusLabel === "PENDING" ? "warn" : "ok")}
          ${renderSubscriptionProfileBadge(
            diagnostics.entitlementStatus,
            diagnostics.allowed ? "ok" : diagnostics.entitlementStatus === "GRACE_PERIOD" ? "warn" : "danger"
          )}
          <button class="module-back-button" type="button">Back</button>
        </div>
      </header>

      ${renderSubscriptionActionFeedbackSlot("PLAYER")}

      <div class="subscription-profile-layout-v41">
        <main class="subscription-profile-main-v41" aria-label="Subscription contract details">
          <div class="subscription-contract-dashboard-v41">
            <section class="subscription-profile-section subscription-contract-card-v41">
              ${renderSubscriptionProfileSectionHead("CONTRACT STATUS", "Current State")}
              <div class="subscription-profile-data-list-v41">
                ${renderDataRow("STATUS", statusLabel)}
                ${renderDataRow("ENTITLEMENT", diagnostics.entitlementStatus)}
                ${renderDataRow("ACCESS", diagnostics.allowed ? "ALLOWED" : "BLOCKED")}
                ${renderDataRow("CONTRACT ID", subscription.id)}
                ${renderDataRow("TIER", currentTierLabel)}
              </div>
            </section>

            <section class="subscription-profile-section subscription-contract-card-v41">
              ${renderSubscriptionProfileSectionHead("BILLING", "Settlement")}
              <div class="subscription-profile-data-list-v41">
                ${renderDataRow("AMOUNT", formatCredits(subscription.amount))}
                ${renderDataRow("CYCLE", subscription.cycle || "WEEKLY")}
                ${renderDataRow("START", formatDateDisplay(subscription.startDate))}
                ${renderDataRow("PERIOD END", formatDateDisplay(diagnostics.currentPeriodEnd || subscription.endDate || subscription.renewalDate))}
                ${diagnostics.gracePeriodEndsAt ? renderDataRow("GRACE END", formatDateDisplay(diagnostics.gracePeriodEndsAt)) : ""}
                ${subscription.cancelledAt ? renderDataRow("CANCELLED", formatDateDisplay(subscription.cancelledAt)) : ""}
              </div>
            </section>

            <section class="subscription-profile-section subscription-contract-card-v41">
              ${renderSubscriptionProfileSectionHead("COVERAGE TARGET", targetDisplay.title)}
              <div class="subscription-profile-data-list-v41">
                ${renderDataRow("TYPE", diagnostics.target.type)}
                ${renderDataRow("TARGET ID", diagnostics.target.id || "MISSING")}
                ${renderDataRow("TARGET STATE", targetDisplay.state)}
                ${renderDataRow("VALIDATION", diagnostics.valid ? "VALID" : "REVOKED")}
              </div>
              ${diagnostics.reasonCodes.length ? renderSubscriptionProfileCodeList(diagnostics.reasonCodes, "NO FINDINGS") : ""}
            </section>

            <section class="subscription-profile-section subscription-contract-card-v41">
              ${renderSubscriptionProfileSectionHead(
                diagnostics.allowed ? "ACTIVE ENTITLEMENTS" : "ENTITLEMENT CODES",
                diagnostics.entitlementStatus,
                `${entitlementCodes.length} CODE${entitlementCodes.length === 1 ? "" : "S"}`
              )}
              ${renderSubscriptionProfileCodeList(entitlementCodes, "NO ENTITLEMENTS RESOLVED")}
            </section>
          </div>

          <section class="subscription-profile-section subscription-contract-package-v41">
            ${renderSubscriptionProfileSectionHead("PACKAGE DETAILS", currentTierLabel)}
            <p class="subscription-profile-lead-v41">${escapeHtml(tier?.description || subscription.description || service?.description || "No package description registered.")}</p>
            <div class="subscription-profile-meta-grid-v41">
              ${renderDataRow("PRODUCT CODE", service?.productCode || subscription.catalogId || "NOT AVAILABLE")}
              ${renderDataRow("DOMAIN", service?.domain || "GENERAL")}
              ${renderDataRow("CATEGORY", subscription.category || service?.category || "OTHER")}
              ${renderDataRow("PROVIDER", subscription.provider || service?.provider || "LOCAL LEDGER")}
            </div>
            ${service && tier ? renderSubscriptionTierPresentationSummary(service, tier) : ""}
          </section>

          ${service ? renderSubscriptionProductPresentation(service) : ""}
          ${service ? renderSubscriptionProfileTierComparison(user, service, subscription) : ""}
        </main>

        <aside class="subscription-profile-rail-v41 subscription-contract-management-v41" aria-label="Subscription contract management">
          <section class="subscription-profile-rail-card-v41">
            ${renderSubscriptionProfileSectionHead("CONTRACT MANAGEMENT", "Available Actions")}
            <div class="subscription-profile-action-stack-v41">
              <button type="button" data-tier-pay-subscription="${escapeHtml(subscription.id)}" ${payable ? "" : `disabled aria-disabled="true" title="${escapeHtml(cancelled ? "Cancelled contracts cannot be paid." : "The current period has no payable obligation.")}"`}>${payable ? "Pay Current Period" : "No Payment Due"}</button>
              <button type="button" class="subscription-cancel-button" data-tier-cancel-subscription="${escapeHtml(subscription.id)}" ${cancelled ? 'disabled aria-disabled="true" title="This contract is already cancelled."' : ""}>${cancelled ? "Contract Cancelled" : "Cancel Contract"}</button>
              <button type="button" data-subscription-profile-provider="${escapeHtml(providerId)}">View Provider</button>
            </div>
            ${!payable ? `<p class="subscription-action-unavailable">${escapeHtml(cancelled ? "Cancelled contracts have no payable current period." : "This contract is already paid or currently not payable.")}</p>` : ""}
            ${cancelled ? '<p class="subscription-profile-note-v41">This contract is archived. Purchase a new package from the Catalog to restore coverage.</p>' : ""}
          </section>

          <section class="subscription-profile-rail-card-v41">
            ${renderSubscriptionProfileSectionHead("TARGET MANAGEMENT", "Coverage Binding")}
            <div class="subscription-target-display-v41">
              <b>${escapeHtml(targetDisplay.title)}</b>
              <small>${escapeHtml(targetDisplay.subtitle)}</small>
              <span>${escapeHtml(targetDisplay.state)}</span>
            </div>
            ${renderSubscriptionTargetSelector(subscription, user.citizenId, { admin: false })}
            ${cancelled ? '<p class="subscription-action-unavailable">Cancelled contracts cannot be rebound.</p>' : ""}
          </section>

          <section class="subscription-profile-rail-card-v41">
            ${renderSubscriptionProfileSectionHead(
              "ENTITLEMENT RESOLUTION",
              diagnostics.allowed ? "Access Granted" : diagnostics.valid ? "Access Blocked" : "Target Invalid"
            )}
            <p>${escapeHtml(
              diagnostics.allowed
                ? "The canonical entitlement resolver grants access for the current campaign time and target."
                : diagnostics.valid
                  ? "The target remains valid, but the canonical entitlement resolver blocks access. Review the status and reason codes."
                  : "The current target does not satisfy the catalog policy. Review the reason codes and rebind the contract."
            )}</p>
            ${diagnostics.evaluatedAt ? renderDataRow("EVALUATED AT", formatDateDisplay(diagnostics.evaluatedAt)) : ""}
            ${renderSubscriptionProfileCodeList(diagnostics.reasonCodes, "NO ENTITLEMENT FINDINGS")}
          </section>
        </aside>
      </div>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => {
    const workspaceView = String(returnView || "").toUpperCase();
    if (["OVERVIEW", "CONTRACTS", "CATALOG", "PROVIDERS"].includes(workspaceView) && typeof window.WS_APP.renderPlayerSubscriptionsWorkspace === "function") {
      return window.WS_APP.renderPlayerSubscriptionsWorkspace(user, { view: workspaceView });
    }
    if (returnView === "buy") return renderPlayerSubscriptionsModule(user, { panel: "buy" });
    return renderPlayerSubscriptionsModule(user, { panel: "my" });
  });
  bindCatalogTierPurchaseActions(user, { returnTo: "owned", currentSubscriptionId: subscription.id, returnView });
  bindSubscriptionTierProfileActions(user, subscription, returnView);
  bindSubscriptionTargetControls(user, {
    citizenId: user.citizenId,
    onChanged: () => renderPlayerSubscriptionProfile(user, subscription.id, returnView)
  });
  bindSubscriptionProfileNavigationActions(user, { subscriptionId: subscription.id, returnView: returnView || "CONTRACTS" });
  focusSubscriptionProfileHeading(container);
}

function renderSubscriptionsModule(user) {
  if (user.role === "admin") {
    renderAdminSubscriptionsModule(user);
    return;
  }

  renderPlayerSubscriptionsModule(user);
}

function getSubscriptionPolishFilter() {
  const value = String(window.WS_APP.subscriptionPolishFilter || "ALL").toUpperCase();
  if (value === "ACTIVE") return "PAID";
  return ["ALL", "PAID", "PENDING", "OVERDUE", "SUSPENDED", "CANCELLED"].includes(value) ? value : "ALL";
}

function getSubscriptionPolishSort() {
  const value = String(window.WS_APP.subscriptionPolishSort || "STATUS").toUpperCase();
  return ["STATUS", "PROVIDER", "PRICE", "TIER"].includes(value) ? value : "STATUS";
}

function filterAndSortSubscriptionsForPolish(subscriptions = [], filter = getSubscriptionPolishFilter(), sort = getSubscriptionPolishSort()) {
  const filtered = (Array.isArray(subscriptions) ? subscriptions : []).filter((subscription) => {
    const status = String(subscription.status || "PENDING").toUpperCase();
    if (filter === "ALL") return true;
    return status === filter;
  });

  const statusOrder = { SUSPENDED: 0, OVERDUE: 1, PENDING: 2, PAID: 3, CANCELLED: 4 };
  return filtered.sort((a, b) => {
    if (sort === "PROVIDER") return String(a.provider || "").localeCompare(String(b.provider || ""), "pl") || String(a.title || "").localeCompare(String(b.title || ""), "pl");
    if (sort === "PRICE") return parseCreditValue(b.amount) - parseCreditValue(a.amount);
    if (sort === "TIER") return String(getSubscriptionTierLabel(a) || "").localeCompare(String(getSubscriptionTierLabel(b) || ""), "pl");
    const aStatus = String(a.status || "PENDING").toUpperCase();
    const bStatus = String(b.status || "PENDING").toUpperCase();
    return (statusOrder[aStatus] ?? 9) - (statusOrder[bStatus] ?? 9);
  });
}

function renderSubscriptionFilterToolbar(filter = getSubscriptionPolishFilter(), sort = getSubscriptionPolishSort()) {
  return `
    <section class="subscription-polish-toolbar" data-subscription-polish-toolbar>
      <label>Status
        <select data-subscription-filter>
          ${["ALL", "PAID", "PENDING", "OVERDUE", "SUSPENDED", "CANCELLED"].map((option) => `<option value="${option}" ${filter === option ? "selected" : ""}>${option}</option>`).join("")}
        </select>
      </label>
      <label>Sort
        <select data-subscription-sort>
          ${["STATUS", "PROVIDER", "PRICE", "TIER"].map((option) => `<option value="${option}" ${sort === option ? "selected" : ""}>${option}</option>`).join("")}
        </select>
      </label>
    </section>
  `;
}

function getSubscriptionPurchaseView() {
  const value = String(window.WS_APP.subscriptionPurchaseView || "SUBSCRIPTION_LIST").toUpperCase();
  return ["SUBSCRIPTION_LIST", "PROVIDER_LIST"].includes(value) ? value : "SUBSCRIPTION_LIST";
}

function renderSubscriptionPurchaseTabs(activeView = getSubscriptionPurchaseView()) {
  const tabs = [
    ["SUBSCRIPTION_LIST", "Subscription List"],
    ["PROVIDER_LIST", "Provider List"]
  ];

  return `
    <nav class="subscription-purchase-tabs system-inline-tabs" role="tablist" aria-label="Subscription purchase view">
      ${tabs.map(([id, label]) => `<button type="button" class="subscription-purchase-tab system-inline-tab ${activeView === id ? "is-active" : ""}" role="tab" aria-selected="${activeView === id ? "true" : "false"}" data-subscription-purchase-view="${escapeHtml(id)}">${escapeHtml(label)}</button>`).join("")}
    </nav>
  `;
}

const SUBSCRIPTION_PROVIDER_DEFINITIONS = {
  "watch-secure": {
    name: "Watch & Secure",
    type: "SYSTEM",
    logo: "W&S",
    brief: "Watch & Secure maintains local access routing, risk visibility and civic compliance infrastructure. Continued service access supports synchronized participation in the local system.",
    tags: ["SYSTEM", "ACCESS", "ROUTING"],
    mainScope: "ACCESS / ROUTING",
    networkCode: "002"
  },
  "live-prevail": {
    name: "Live & Prevail",
    type: "SYSTEM",
    logo: "L&P",
    brief: "Live & Prevail maintains personal survivability coverage through tiered care access and controlled medical priority. Active coverage supports continuity of function through the weekly settlement cycle.",
    tags: ["SYSTEM", "MEDICAL", "CARE"],
    mainScope: "MEDICAL / CARE",
    networkCode: "121"
  },
  "trauma-team": {
    name: "TRAUMA Team",
    type: "PRIVATE",
    logo: "TRM",
    brief: "TRAUMA Team provides emergency response, stabilization and premium clinical recovery for covered citizens. Service priority depends on the active contract tier.",
    tags: ["PRIVATE", "EMERGENCY", "CLINICAL"],
    mainScope: "EMERGENCY / CLINICAL",
    networkCode: "120"
  },
  "kagami-kaisha": {
    name: "Kagami Kaisha",
    type: "PRIVATE",
    logo: "KG",
    brief: "Kagami Kaisha provides network security, anti-intrusion layers and certified access protection for compatible devices and operators.",
    tags: ["PRIVATE", "SECURITY", "NETWORK"],
    mainScope: "SECURITY / NETWORK",
    networkCode: "130"
  },
  "coremed": {
    name: "CoreMed",
    type: "PRIVATE",
    logo: "CM",
    brief: "CoreMed maintains private clinical support and scheduled medical service continuity for subscribed citizens.",
    tags: ["PRIVATE", "MEDICAL"],
    mainScope: "MEDICAL / CLINICAL",
    networkCode: "121"
  },
  "afterlife": {
    name: "Afterlife",
    type: "PRIVATE",
    logo: "AFL",
    brief: "Afterlife manages post-mortem handling, service continuity records and authorized final-procedure options according to active contract state.",
    tags: ["PRIVATE", "POST-LIFE"],
    mainScope: "POST-LIFE / RECORDS",
    networkCode: "190"
  },
  "habitat-authority": {
    name: "Habitat Authority",
    type: "SYSTEM",
    logo: "HAB",
    brief: "Habitat Authority maintains assigned residential access, unit continuity and civic housing compliance through scheduled billing periods.",
    tags: ["SYSTEM", "HOUSING"],
    mainScope: "HOUSING / CIVIC ACCESS",
    networkCode: "160"
  },
  "factory-commons": {
    name: "Factory Commons",
    type: "SYSTEM",
    logo: "FC",
    brief: "Factory Commons maintains labor-linked service access, production continuity and basic workplace allocations for registered citizens.",
    tags: ["SYSTEM", "LABOR", "CIVIC"],
    mainScope: "LABOR / CIVIC SERVICES",
    networkCode: "101"
  },
  "perfectmin-licensed-clinics": {
    name: "Perfectmin / Licensed Clinics",
    type: "PRIVATE",
    logo: "LC",
    brief: "Perfectmin and associated licensed clinics provide elective, corrective and scheduled private clinical services under active subscription coverage.",
    tags: ["PRIVATE", "MEDICAL", "CLINICAL"],
    mainScope: "MEDICAL / LICENSED CLINICS",
    networkCode: "121"
  }
};

function normalizeProviderName(value = "") {
  return String(value || "LOCAL LEDGER").trim() || "LOCAL LEDGER";
}

function getSubscriptionProviderId(value = "") {
  const name = normalizeProviderName(value);
  const lower = name.toLowerCase();
  if (lower.includes("watch") || lower.includes("w&s")) return "watch-secure";
  if (lower.includes("live") && (lower.includes("prevail") || lower.includes("life"))) return "live-prevail";
  if (lower.includes("trauma")) return "trauma-team";
  if (lower.includes("kagami")) return "kagami-kaisha";
  if (lower.includes("coremed") || lower.includes("core med")) return "coremed";
  if (lower.includes("afterlife")) return "afterlife";
  if (lower.includes("habitat") || lower.includes("housing")) return "habitat-authority";
  if (lower.includes("factory") || lower.includes("common")) return "factory-commons";
  if (lower.includes("perfectmin") || lower.includes("licensed clinic")) return "perfectmin-licensed-clinics";
  return slugifyRecordId(name || "local-ledger");
}

function getNetworkCodeFromVisibleAddress(address = "") {
  const parts = String(address || "").trim().split("::")[0].split(".");
  return String(parts[2] || "").trim().toUpperCase();
}

function resolveSubscriptionProviderOrganizationProfile(providerId = "", providerName = "", organizationId = "") {
  const organization = window.WS_APP.getOrganizationById?.(organizationId)
    || window.WS_APP.getOrganizationByProviderId?.(providerId)
    || window.WS_APP.getOrganizationByProviderId?.(`provider-${providerId}`)
    || window.WS_APP.findOrganization?.(providerName)
    || null;

  if (!organization) {
    return {
      organizationResolved: false,
      organizationId: "",
      organizationName: "",
      organizationType: "",
      primaryLocationId: "",
      headquarters: "",
      networkCode: "",
      locationType: ""
    };
  }

  const headquarters = window.WS_APP.getPrimaryOrganizationLocation?.(organization.id, { strictHeadquarters: true });
  const primaryLocation = headquarters || window.WS_APP.getPrimaryOrganizationLocation?.(organization.id);
  const visibleAddress = String(primaryLocation?.visibleAddress || "").trim();

  return {
    organizationResolved: true,
    organizationId: organization.id,
    organizationName: organization.name || providerName || organization.id,
    organizationType: organization.type || organization.organizationType || "REGISTERED",
    primaryLocationId: primaryLocation?.id || "",
    headquarters: visibleAddress,
    networkCode: getNetworkCodeFromVisibleAddress(visibleAddress),
    locationType: primaryLocation?.locationType || ""
  };
}

function getSubscriptionProviderDefinition(providerName = "", services = []) {
  const id = getSubscriptionProviderId(providerName);
  const known = SUBSCRIPTION_PROVIDER_DEFINITIONS[id] || {};
  const serviceMarketTags = services.flatMap((service) => getServiceMarketTags(service));
  const type = known.type || (serviceMarketTags.includes("SYSTEM") && !serviceMarketTags.includes("PRIVATE") ? "SYSTEM" : "PRIVATE");
  const name = known.name || normalizeProviderName(providerName);
  const catalogProviderId = String(services.find((service) => service?.providerId)?.providerId || "").trim();
  const organizationId = String(services.find((service) => service?.organizationId)?.organizationId || "").trim();
  const organizationProfile = resolveSubscriptionProviderOrganizationProfile(catalogProviderId || id, name, organizationId);

  return {
    id,
    catalogProviderId,
    name,
    type,
    logo: known.logo || buildProviderLogoFallback(name),
    brief: known.brief || `${name} maintains subscribed services through the local billing cycle. Available packages are listed below according to current access and provider records.`,
    tags: known.tags || [type],
    mainScope: known.mainScope || buildProviderMainScope(type, services, known.tags),
    organizationResolved: organizationProfile.organizationResolved,
    organizationId: organizationProfile.organizationId,
    organizationName: organizationProfile.organizationName,
    organizationType: organizationProfile.organizationType,
    primaryLocationId: organizationProfile.primaryLocationId,
    headquarters: organizationProfile.headquarters,
    locationType: organizationProfile.locationType,
    networkCode: organizationProfile.networkCode
  };
}

function buildProviderLogoFallback(name = "") {
  const words = normalizeProviderName(name).split(/\s+|&|\+/).filter(Boolean);
  return words.length > 1
    ? words.map((word) => word[0]).join("").slice(0, 4).toUpperCase()
    : normalizeProviderName(name).slice(0, 4).toUpperCase();
}

function getSubscriptionProviderGroups(catalog = getSubscriptionCatalog()) {
  const groups = new Map();
  (Array.isArray(catalog) ? catalog : []).forEach((service) => {
    const providerName = normalizeProviderName(service.provider || service.company || "LOCAL LEDGER");
    const id = getSubscriptionProviderId(providerName);
    if (!groups.has(id)) groups.set(id, { id, providerName, services: [] });
    groups.get(id).services.push(service);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      provider: getSubscriptionProviderDefinition(group.providerName, group.services)
    }))
    .sort((a, b) => {
      const aType = a.provider.type === "SYSTEM" ? 0 : 1;
      const bType = b.provider.type === "SYSTEM" ? 0 : 1;
      return aType - bType || a.provider.name.localeCompare(b.provider.name, "pl");
    });
}

function getProviderWeeklyRangeValue(services = []) {
  const prices = services.flatMap((service) => getCatalogTierPrices(service)).filter((value) => Number.isFinite(value) && value > 0);
  if (!prices.length) return "NO PRICE";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatCredits(min) : `${formatCredits(min)} - ${formatCredits(max)}`;
}

function getProviderWeeklyRangeLabel(services = []) {
  const value = getProviderWeeklyRangeValue(services);
  if (value === "NO PRICE") return value;
  return value.includes(" - ") ? `WEEKLY RANGE: ${value}` : `WEEKLY COST: ${value}`;
}

function getProviderMinWeeklyPrice(services = []) {
  const prices = (Array.isArray(services) ? services : [])
    .flatMap((service) => getCatalogTierPrices(service))
    .filter((value) => Number.isFinite(value) && value > 0);
  return prices.length ? Math.min(...prices) : 0;
}

function buildProviderSearchIndex(group = {}) {
  const provider = group.provider || getSubscriptionProviderDefinition(group.providerName, group.services || []);
  const serviceText = (group.services || []).map((service) => [
    service.id,
    service.title,
    service.label,
    service.name,
    service.provider,
    service.category,
    service.description,
    Array.isArray(service.tags) ? service.tags.join(" ") : ""
  ].filter(Boolean).join(" ")).join(" ");

  return [
    provider.name,
    provider.type,
    provider.mainScope,
    provider.headquarters,
    provider.networkCode,
    Array.isArray(provider.tags) ? provider.tags.join(" ") : "",
    serviceText
  ].filter(Boolean).join(" ").toLowerCase();
}

function buildProviderMainScope(type = "PRIVATE", services = [], tags = []) {
  const serviceCategories = (Array.isArray(services) ? services : [])
    .map((service) => String(service.category || service.group || "").trim().toUpperCase())
    .filter(Boolean);
  const visibleTags = (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag || "").trim().toUpperCase())
    .filter((tag) => tag && !["SYSTEM", "PRIVATE"].includes(tag));
  const source = visibleTags.length ? visibleTags : serviceCategories;
  if (source.length) return Array.from(new Set(source)).slice(0, 2).join(" / ");
  return String(type || "PRIVATE").toUpperCase() === "SYSTEM" ? "CIVIC SERVICES" : "PRIVATE SERVICES";
}

function renderProviderBadge(type = "PRIVATE") {
  const normalized = String(type || "PRIVATE").toUpperCase();
  return `<i class="subscription-provider-type-badge subscription-provider-type-${escapeHtml(normalized.toLowerCase())}">${escapeHtml(normalized)}</i>`;
}

function renderSubscriptionProviderList(user, catalog = getSubscriptionCatalog()) {
  const groups = getSubscriptionProviderGroups(catalog);
  const systemGroups = groups.filter((group) => String(group.provider?.type || "PRIVATE").toUpperCase() === "SYSTEM");
  const privateGroups = groups.filter((group) => String(group.provider?.type || "PRIVATE").toUpperCase() !== "SYSTEM");

  return `
    <section class="subscription-provider-controls" data-subscription-provider-controls>
      <label>Search Provider<input type="search" data-provider-search placeholder="Name / scope / network code" /></label>
      <label>Type<select data-provider-type>
        <option value="ALL">ALL</option>
        <option value="SYSTEM">SYSTEM</option>
        <option value="PRIVATE">PRIVATE</option>
      </select></label>
      <label>Sort<select data-provider-sort>
        <option value="NAME">NAME</option>
        <option value="SERVICES">SERVICES</option>
        <option value="WEEKLY_RANGE">WEEKLY RANGE</option>
      </select></label>
    </section>
    <div class="subscription-provider-group-list" data-provider-list-view>
      ${renderSubscriptionProviderTypeSection("SYSTEM PROVIDERS", "System-controlled mandatory and civic providers.", systemGroups, "SYSTEM")}
      ${renderSubscriptionProviderTypeSection("PRIVATE PROVIDERS", "Private corporate services and premium contracts.", privateGroups, "PRIVATE")}
    </div>
  `;
}

function renderSubscriptionProviderTypeSection(title, description, groups = [], type = "PRIVATE") {
  return `
    <section class="subscription-provider-group-section" data-provider-section="${escapeHtml(type)}">
      <header>
        <div>
          <p class="kicker">${escapeHtml(title)}</p>
          <p class="subscription-section-description">${escapeHtml(description)}</p>
        </div>
        <small><span data-provider-visible-count>${escapeHtml(groups.length)}</span> PROVIDER${groups.length === 1 ? "" : "S"}</small>
      </header>
      <div class="subscription-provider-list">
        ${groups.length ? groups.map((group) => renderSubscriptionProviderCard(group)).join("") : '<p class="file-empty">No providers in this group.</p>'}
      </div>
      <p class="file-empty subscription-provider-filter-empty" hidden>No providers match current filters.</p>
    </section>
  `;
}

function renderSubscriptionProviderCard(group = {}) {
  const provider = group.provider || getSubscriptionProviderDefinition(group.providerName, group.services || []);
  const services = group.services || [];
  return `
    <button
      type="button"
      class="subscription-provider-card"
      data-open-subscription-provider="${escapeHtml(provider.id)}"
      data-provider-search="${escapeHtml(buildProviderSearchIndex({ ...group, provider }))}"
      data-provider-type="${escapeHtml(String(provider.type || "PRIVATE").toUpperCase())}"
      data-provider-name="${escapeHtml(String(provider.name || "").toLowerCase())}"
      data-provider-services="${escapeHtml(services.length)}"
      data-provider-min-price="${escapeHtml(getProviderMinWeeklyPrice(services))}"
    >
      <span class="subscription-provider-logo-wrap">${renderSubscriptionLogo({ provider: provider.name, title: provider.name, logo: provider.logo })}</span>
      <span class="subscription-provider-main">
        <span class="subscription-card-topline"><b>${escapeHtml(provider.name)}</b></span>
        <em>${escapeHtml(getProviderWeeklyRangeLabel(services))}</em>
      </span>
      <span class="subscription-provider-side">
        <strong>${escapeHtml(services.length)}</strong>
        <small>SERVICES</small>
      </span>
    </button>
  `;
}

function renderSubscriptionOverviewList(subscriptions = [], filter = getSubscriptionPolishFilter(), sort = getSubscriptionPolishSort()) {
  const visible = filterAndSortSubscriptionsForPolish(subscriptions, filter, sort);
  return `
    <section class="subscription-overview-list-section">
      <header>
        <div>
          <p class="kicker">SUBSCRIPTION OVERVIEW</p>
          <h5>Current Subscriptions</h5>
        </div>
        <small>${escapeHtml(visible.length)} / ${escapeHtml(subscriptions.length)}</small>
      </header>
      <div class="subscription-overview-list">
        ${visible.length ? visible.map((subscription) => renderSubscriptionServiceTile(subscription, { returnView: "overview", showState: true })).join("") : '<p class="file-empty">No subscriptions match this filter.</p>'}
      </div>
    </section>
  `;
}

function bindSubscriptionPolishToolbar(user, rerender = () => renderPlayerSubscriptionsModule(user)) {
  const toolbar = document.querySelector("[data-subscription-polish-toolbar]");
  if (!toolbar) return;
  toolbar.querySelector("[data-subscription-filter]")?.addEventListener("change", (event) => {
    window.WS_APP.subscriptionPolishFilter = event.target.value || "ALL";
    rerender();
  });
  toolbar.querySelector("[data-subscription-sort]")?.addEventListener("change", (event) => {
    window.WS_APP.subscriptionPolishSort = event.target.value || "STATUS";
    rerender();
  });
}

function renderSubscriptionFinancialMetricRows(ledger) {
  return [
    ["CREDITS", formatCredits(ledger.credits)],
    ["INCOME", formatCredits(ledger.incomeTotal)],
    ["DEBT", ledger.debtLabel],
    ["NET CYCLE", formatCredits(ledger.netCycle)]
  ].map(([label, value]) => renderDataRow(label, value)).join("");
}


function getSubscriptionControlPanel(panel = window.WS_APP.subscriptionControlPanel || "my") {
  const value = String(panel || "my").toLowerCase();
  return ["my", "buy"].includes(value) ? value : "my";
}

function renderSubscriptionControlPanelCards(ledger = {}, activePanel = "my") {
  const paidSubscriptions = (ledger.subscriptions || []).filter((item) => String(item.status || "").toUpperCase() === "PAID");
  const catalogCount = getSubscriptionCatalog().length;
  const panels = [
    { id: "my", title: "My Subscriptions", meta: `${paidSubscriptions.length} paid`, description: "Manage current services, payment, cancellation and tier changes." },
    { id: "buy", title: "Buy Subscriptions", meta: `${catalogCount} available`, description: "Buy new services or upgrade an existing subscription." }
  ];

  return `
    <section class="subscription-hub-panels system-segment-tabs" role="tablist" aria-label="Subscription control panels">
      ${panels.map((panel) => `
        <button class="subscription-hub-panel system-segment-tile system-segment-tile--card ${activePanel === panel.id ? "is-active" : ""}" type="button" role="tab" aria-selected="${activePanel === panel.id ? "true" : "false"}" data-subscription-control-panel="${escapeHtml(panel.id)}">
          <span class="system-segment-tile__body">
            <b class="system-segment-tile__title">${escapeHtml(panel.title)}</b>
            <small class="system-segment-tile__description">${escapeHtml(panel.description)}</small>
          </span>
          <strong class="system-segment-tile__meta">${escapeHtml(panel.meta)}</strong>
        </button>
      `).join("")}
    </section>
  `;
}

function renderSubscriptionControlPanelBody(user, ledger = {}, activePanel = "my") {
  if (activePanel === "buy") return renderBuySubscriptionsPanelContent(user);

  const current = (ledger.subscriptions || []).filter((subscription) => String(subscription.status || "").toUpperCase() !== "CANCELLED");
  const subscriptionFilter = getSubscriptionPolishFilter();
  const subscriptionSort = getSubscriptionPolishSort();
  const visibleCurrent = filterAndSortSubscriptionsForPolish(current, subscriptionFilter, subscriptionSort);

  return `
    ${renderSubscriptionFilterToolbar(subscriptionFilter, subscriptionSort)}
    <section class="subscription-library-sections">
      ${visibleCurrent.length ? renderOwnedSubscriptionCategorySections(visibleCurrent) : '<p class="file-empty">No owned subscriptions match this filter.</p>'}
    </section>
  `;
}

function renderBuySubscriptionsPanelContent(user) {
  const catalog = getSubscriptionCatalog();
  const categories = getSubscriptionCategories();
  const minPrices = catalog.map((definition) => getCatalogLowestTierAmount(definition)).filter((value) => Number.isFinite(value));
  const maxPrice = minPrices.length ? Math.max(...minPrices) : 0;
  const activeView = getSubscriptionPurchaseView();
  window.WS_APP.subscriptionPurchaseView = activeView;
  const selectedCategory = String(window.WS_APP.subscriptionShopCategory || "ALL").toUpperCase();
  const systemServices = catalog.filter((service) => getServiceMarketTags(service).includes("SYSTEM"));
  const privateServices = catalog.filter((service) => getServiceMarketTags(service).includes("PRIVATE"));

  return `
    <section class="subscription-market-view" data-subscription-control-body="buy">
      ${renderSubscriptionPurchaseTabs(activeView)}

      ${activeView === "SUBSCRIPTION_LIST" ? `
        <section class="subscription-shop-controls subscription-market-controls" data-player-subscription-market>
          <label>
            Search
            <input type="search" data-subscription-shop-search placeholder="Filter by name or provider" />
          </label>
          <label>
            Category
            <select data-subscription-shop-category>
              <option value="ALL" ${selectedCategory === "ALL" ? "selected" : ""}>ALL</option>
              ${categories.map((category) => `<option value="${escapeHtml(category.id)}" ${selectedCategory === category.id ? "selected" : ""}>${escapeHtml(category.title)}</option>`).join("")}
            </select>
          </label>
          <label>
            Max price
            <span class="currency-input-wrap compact"><input type="number" min="0" step="50" data-subscription-shop-price placeholder="${escapeHtml(maxPrice || "any")}" /><b>???</b></span>
          </label>
        </section>

        ${renderSubscriptionMarketSection("SYSTEM", "Public/system-controlled mandatory and civic services.", systemServices, user)}
        ${renderSubscriptionMarketSection("PRIVATE", "Private corporate services and premium contracts.", privateServices, user)}
      ` : renderSubscriptionProviderList(user, catalog)}
    </section>
  `;
}


function normalizeSubscriptionPaymentSource(value) {
  const source = String(value || "CREDITS").trim().toUpperCase();
  return source === "DEBT_ACCOUNT" ? "DEBT_ACCOUNT" : "CREDITS";
}

function getSubscriptionDebtAccountStatus(citizenOrLedger = {}) {
  if (typeof window.WS_APP?.getCitizenDebtCapacity === "function") {
    const status = window.WS_APP.getCitizenDebtCapacity(citizenOrLedger);
    if (status) {
      const debt = parseCreditValue(status.debt);
      const limit = parseCreditValue(status.limit || window.WS_APP?.BILLING_DEBT_LIMIT || 20000);
      const capacity = Math.max(0, parseCreditValue(status.capacity ?? (limit - debt)));
      return {
        debt,
        limit,
        capacity,
        canCharge: capacity > 0
      };
    }
  }

  const debt = parseCreditValue(citizenOrLedger?.debt);
  const limit = parseCreditValue(window.WS_APP?.BILLING_DEBT_LIMIT || 20000);
  const capacity = Math.max(0, limit - debt);
  return {
    debt,
    limit,
    capacity,
    canCharge: capacity > 0
  };
}

function renderPlayerSubscriptionsModule(user, options = {}) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");
  const citizen = window.WS_APP.getCitizenById(user.citizenId);
  const ledger = getCitizenFinancialLedger(citizen);
  const subscriptions = ledger.subscriptions;
  const paidSubscriptions = subscriptions.filter((item) => String(item.status || "").toUpperCase() === "PAID");
  const cancelledSubscriptions = subscriptions.filter((item) => String(item.status || "").toUpperCase() === "CANCELLED");
  const payableAmount = sumPayableSubscriptions(subscriptions);
  const debtStatus = getSubscriptionDebtAccountStatus(citizen);
  const canPayCurrentPeriod = payableAmount > 0;
  const canChargeCurrentPeriodToDebt = canPayCurrentPeriod && debtStatus.capacity > 0;
  const nextSettlement = window.WS_APP.getSettlementPeriodEndLabel?.() || window.WS_APP.SETTLEMENT_PERIOD_END_LABEL || "-";
  const activePanel = getSubscriptionControlPanel(options.panel || window.WS_APP.subscriptionControlPanel || "my");

  if (!container) return;

  window.WS_APP.subscriptionControlPanel = activePanel;
  terminalGrid?.classList.add("is-card-open");

  if (status) {
    status.textContent = `SUBSCRIPTIONS / ${paidSubscriptions.length} OF ${subscriptions.length} PAID`;
  }

  container.innerHTML = `
    <article class="module-detail subscriptions-view subscription-control-hub">
      <div class="module-detail-head">
        <div>
          <p class="kicker">SUBSCRIPTIONS / LOCAL BILLING</p>
          <h4>Subscription Control</h4>
        </div>
        <button class="module-back-button" type="button">Back</button>
      </div>

      <section class="subscription-summary financial-control-summary">
        <div class="subscription-summary-cluster subscription-summary-cluster--financial">
          ${renderSubscriptionFinancialMetricRows(ledger)}
        </div>

        <div class="subscription-summary-cluster subscription-summary-cluster--meta">
          <div class="data-row">
            <b>PAID SUBSCRIPTIONS</b>
            <span class="subscription-summary-stack">
              <span class="subscription-summary-inline">
                ${escapeHtml(paidSubscriptions.length)} / ${escapeHtml(subscriptions.length)}
                <strong class="payment-tag ${escapeHtml(ledger.paymentStatus.toLowerCase())}">${escapeHtml(ledger.paymentStatus)}</strong>
                <button class="subscription-pay-button" type="button" data-pay-subscriptions="ALL" data-pay-subscriptions-source="CREDITS" ${canPayCurrentPeriod ? "" : "disabled aria-disabled=\"true\""}>Pay Current Period</button>
                <button class="subscription-pay-button" type="button" data-pay-subscriptions="ALL" data-pay-subscriptions-source="DEBT_ACCOUNT" ${canChargeCurrentPeriodToDebt ? "" : "disabled aria-disabled=\"true\""}>Charge to Debt</button>
              </span>
              ${cancelledSubscriptions.length ? `
                <span class="subscription-summary-actions">
                  <button class="subscription-clear-button" type="button" data-clear-cancelled-subscriptions="ALL">Clear Cancelled Subscriptions</button>
                </span>
              ` : ""}
            </span>
          </div>

          <div class="data-row">
            <b>SUBSCRIPTION COST</b>
            <span>
              ${escapeHtml(formatCredits(ledger.subscriptionTotal))}
            </span>
          </div>

          ${renderDataRow("NEXT SETTLEMENT PERIOD", nextSettlement)}
        </div>
      </section>

      ${renderSubscriptionControlPanelCards(ledger, activePanel)}
      ${renderSubscriptionControlPanelBody(user, ledger, activePanel)}
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => window.WS_APP.renderModules(user));

  document.querySelectorAll("[data-subscription-control-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      window.WS_APP.subscriptionControlPanel = button.dataset.subscriptionControlPanel || "my";
      renderPlayerSubscriptionsModule(user, { panel: window.WS_APP.subscriptionControlPanel });
    });
  });

  if (activePanel === "my") {
    bindSubscriptionPolishToolbar(user, () => renderPlayerSubscriptionsModule(user, { panel: "my" }));
    bindSubscriptionOverviewActions(user);
  }

  if (activePanel === "buy") {
    const purchaseView = getSubscriptionPurchaseView();
    bindSubscriptionPurchaseViewActions(user);
    if (purchaseView === "SUBSCRIPTION_LIST") bindPlayerSubscriptionMarket(user);
    if (purchaseView === "PROVIDER_LIST") bindSubscriptionProviderListActions(user);
  }

  document.querySelector("[data-clear-cancelled-subscriptions='ALL']")?.addEventListener("click", async () => {
    const confirmed = await confirmRegistryAction("CLEAR CANCELLED SUBSCRIPTIONS", "Remove all cancelled subscriptions from your card? Paid, pending, overdue and suspended services will not be changed.", "Clear Cancelled");
    if (!confirmed) return;

    const result = getSubscriptionCommandApi()?.clearCancelledSubscriptionContracts?.(user.citizenId, {
      createdBy: user.login || "CITIZEN"
    });
    if (!result?.ok) return;

    window.WS_APP.appendTerminalLogLine?.("CANCELLED SUBSCRIPTIONS CLEARED", { typed: true, speed: 8 });
    renderPlayerSubscriptionsModule(user, { panel: activePanel });
  });

  document.querySelectorAll("[data-pay-subscriptions='ALL']").forEach((button) => {
    button.addEventListener("click", () => handleSubscriptionPayment(user, {
      returnTo: "overview",
      paymentSource: button.dataset.paySubscriptionsSource || "CREDITS"
    }));
  });
}


async function handleSubscriptionPayment(user, options = {}) {
  const citizenId = user?.citizenId;
  if (!citizenId) {
    presentSubscriptionActionResult("PLAYER", "PAYMENT", { ok: false, resultCode: "SUBSCRIPTION_CITIZEN_NOT_FOUND" });
    return;
  }
  if (getSubscriptionActionFeedback()?.isBusy?.(options.actionControl)) return;

  const citizen = window.WS_APP.getCitizenById?.(citizenId);
  const ledger = getCitizenFinancialLedger(citizen);
  const scopeLabel = options.subscriptionId ? "this subscription" : options.category ? `${options.category} subscriptions` : "all active subscriptions";
  const expectedAmount = options.subscriptionId
    ? ledger.subscriptions.filter((item) => item.id === options.subscriptionId && isSubscriptionPayable(item)).reduce((sum, item) => sum + parseCreditValue(item.amount), 0)
    : options.category
      ? ledger.subscriptions.filter((item) => item.category === options.category && isSubscriptionPayable(item)).reduce((sum, item) => sum + parseCreditValue(item.amount), 0)
      : sumPayableSubscriptions(ledger.subscriptions);

  if (expectedAmount <= 0) {
    presentSubscriptionActionResult("PLAYER", "PAYMENT", { ok: false, resultCode: "NO_PAYABLE" });
    return;
  }

  const paymentSource = normalizeSubscriptionPaymentSource(options.paymentSource);
  const debtStatus = getSubscriptionDebtAccountStatus(citizen);
  const debtChargePreview = Math.min(expectedAmount, debtStatus.capacity);
  const debtCapacityWarning = paymentSource === "DEBT_ACCOUNT" && expectedAmount > debtStatus.capacity
    ? " Only obligations within remaining Debt Account capacity will be charged."
    : "";
  const sourceLine = paymentSource === "DEBT_ACCOUNT"
    ? `Source: Debt Account. Debt after payable charges: ${formatCredits(debtStatus.debt + debtChargePreview)} / ${formatCredits(debtStatus.limit)}.${debtCapacityWarning}`
    : "Source: Credits. Credits will be deducted from the citizen card.";
  const confirmed = await window.WS_APP.confirmAction?.({
    title: "PAY SUBSCRIPTIONS",
    message: `Pay ${scopeLabel} for ${formatCredits(expectedAmount)}? ${sourceLine}`,
    confirmLabel: paymentSource === "DEBT_ACCOUNT" ? "Charge to Debt" : "Pay",
    cancelLabel: "Cancel",
    tone: "default"
  });
  if (!confirmed) return;

  const release = lockSubscriptionAction(options.actionControl, paymentSource === "DEBT_ACCOUNT" ? "CHARGING..." : "PAYING...");
  let result;
  try {
    result = executeSubscriptionBillingCommand(citizenId, { ...options, paymentSource });
  } catch (error) {
    result = { ok: false, reason: error?.code || "SUBSCRIPTION_BILLING_FAILED" };
  }
  result = result || { ok: false, reason: "SUBSCRIPTION_BILLING_FAILED" };
  presentSubscriptionActionResult("PLAYER", "PAYMENT", result, { amount: expectedAmount, details: `Source: ${paymentSource}` });
  if (!result?.ok) {
    release();
    return;
  }

  window.WS_APP.recordBillingSubscriptionPayment?.(citizenId, result, ledger, {
    note: result.partial ? "Partial subscription control payment." : "Subscription control payment.",
    createdBy: "SYSTEM"
  });

  if (options.returnTo === "profile" && options.subscriptionId) return renderPlayerSubscriptionProfile(user, options.subscriptionId, options.returnView || "");
  if (options.returnTo === "workspace" && typeof window.WS_APP.renderPlayerSubscriptionsWorkspace === "function") {
    return window.WS_APP.renderPlayerSubscriptionsWorkspace(user, { view: options.returnView || "OVERVIEW" });
  }
  if (typeof window.WS_APP.renderPlayerSubscriptionsWorkspace === "function") {
    return window.WS_APP.renderPlayerSubscriptionsWorkspace(user, { view: "OVERVIEW" });
  }
  return renderPlayerSubscriptionsModule(user);
}

function renderAdminSubscriptionsModule(user) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");
  const groups = getAdminSubscriptionGroups();

  if (!container) return;

  terminalGrid?.classList.add("is-card-open");

  if (status) {
    status.textContent = "SUBSCRIPTIONS / ADMIN OVERVIEW";
  }

  container.innerHTML = `
    <article class="module-detail subscriptions-view">
      <div class="module-detail-head">
        <div>
          <p class="kicker">SUBSCRIPTIONS / ADMIN OVERVIEW</p>
          <h4>Subscription Registry</h4>
        </div>

        <button class="module-back-button" type="button">Back</button>
      </div>

      <section class="admin-subscription-groups">
        ${groups.map((group) => renderAdminSubscriptionGroup(group)).join("")}
      </section>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => window.WS_APP.renderModules(user));
  bindAdminSubscriptionOverviewActions(user);
}

function getAdminSubscriptionGroups() {
  const citizens = window.WS_APP.getCitizens()
    .filter((citizen) => citizen.recordType !== "admin")
    .map((citizen) => ({
      ...citizen,
      subscriptions: normalizeSubscriptions(citizen)
    }));

  const groups = [
    { id: "alpha", title: "ALPHA", profiles: ["ALPHA"] },
    { id: "beta", title: "BETA", profiles: ["BETA"] },
    { id: "gamma", title: "GAMMA", profiles: ["GAMMA"] },
    { id: "unclassified", title: "UNCLASSIFIED", profiles: ["UNCLASSIFIED", "SUBHUMAN", "OUTSIDE", "NONE", "UNKNOWN", ""] }
  ];

  return groups.map((group) => {
    const entries = citizens
      .filter((citizen) => {
        const profile = String(citizen.biologicalProfile || citizen.profile || "").toUpperCase();
        return group.profiles.includes(profile) || (group.id === "unclassified" && !profile);
      })
      .sort((a, b) => String(a.legalName || "").localeCompare(String(b.legalName || ""), "pl"));

    return { ...group, entries };
  });
}

function renderAdminSubscriptionGroup(group) {
  return `
    <details class="admin-subscription-group">
      <summary>
        <span>${escapeHtml(group.title)}</span>
        <b>${escapeHtml(group.entries.length)}</b>
      </summary>

      <div class="admin-subscription-list">
        ${group.entries.length
          ? group.entries.map((citizen) => renderAdminSubscriptionCitizen(citizen)).join("")
          : '<p class="file-empty">No profiles in this group</p>'}
      </div>
    </details>
  `;
}

function renderAdminSubscriptionCitizen(citizen) {
  const subscriptions = normalizeSubscriptions(citizen);
  const activeCount = subscriptions.filter((item) => item.active).length;
  const activityStatus = getSubscriptionActivityStatus(subscriptions);
  const ledger = getCitizenFinancialLedger(citizen);

  return `
    <details class="admin-subscription-citizen">
      <summary>
        <span>
          <b>${escapeHtml(getCitizenNameLabel(citizen, { legal: true }))}</b>
          <small>${escapeHtml(citizen.idNumber)}</small>
        </span>

        <span class="admin-subscription-count">
          ${escapeHtml(activeCount)} / ${escapeHtml(subscriptions.length)} · ${escapeHtml(formatCredits(ledger.subscriptionTotal))}
        </span>

        <strong class="activity-tag ${escapeHtml(activityStatus.toLowerCase().replaceAll(" ", "-"))}">${escapeHtml(activityStatus)}</strong>
        <button class="admin-subscription-manage-button" type="button" data-admin-subscription-citizen="${escapeHtml(citizen.id)}">Manage</button>
      </summary>

      <div class="admin-subscription-records">
        ${subscriptions.length
          ? subscriptions
            .slice()
            .sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "pl"))
            .map((subscription) => renderAdminSubscriptionRecord(subscription, citizen.id, { allowActions: false }))
            .join("")
          : '<p class="file-empty">No subscriptions</p>'}
      </div>
    </details>
  `;
}

function bindAdminSubscriptionOverviewActions(user) {
  document.querySelectorAll("[data-admin-subscription-citizen]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.WS_APP.pushModuleView?.(() => renderAdminSubscriptionsModule(user));
      renderAdminCitizenSubscriptionControl(user, button.dataset.adminSubscriptionCitizen);
    });
  });
}

function renderAdminCitizenSubscriptionControl(user, citizenId, adminState = {}) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const citizen = window.WS_APP.getCitizenById(citizenId);
  if (!container || !citizen) return renderAdminSubscriptionsModule(user);

  const ledger = getCitizenFinancialLedger(citizen);
  const subscriptions = ledger.subscriptions;
  const activeSubscriptions = subscriptions.filter((item) => item.active);
  const cancelledSubscriptions = subscriptions.filter((item) => String(item.status || "").toUpperCase() === "CANCELLED");
  const selectedSubscriptionId = String(adminState.selectedSubscriptionId || "").trim();
  const selectedSubscription = selectedSubscriptionId ? subscriptions.find((item) => String(item.id || "") === selectedSubscriptionId) || null : null;
  const selectedCategory = String(adminState.category || selectedSubscription?.category || "INSURANCE").toUpperCase();

  if (status) {
    status.textContent = `SUBSCRIPTIONS / ADMIN / ${getCitizenShortId(citizen)}`;
  }

  container.innerHTML = `
    <article class="module-detail subscriptions-view admin-subscription-control-view">
      <div class="module-detail-head">
        <div>
          <p class="kicker">SUBSCRIPTIONS / ADMIN CONTROL</p>
          <h4>${escapeHtml(getCitizenNameLabel(citizen, { legal: true }) || getCitizenShortId(citizen))}</h4>
        </div>

        <button class="module-back-button" type="button">Back</button>
      </div>

      <section class="subscription-summary financial-control-summary">
        <div class="subscription-summary-cluster subscription-summary-cluster--financial">
          ${renderSubscriptionFinancialMetricRows(ledger)}
        </div>

        <div class="subscription-summary-cluster subscription-summary-cluster--meta">
          ${renderDataRow("CITIZEN", citizen.idNumber || citizen.shortId || citizen.id)}
          ${renderDataRow("ACTIVE", `${activeSubscriptions.length} / ${subscriptions.length}`)}
          ${renderDataRow("SUBSCRIPTION COST", formatCredits(ledger.subscriptionTotal))}
        </div>
      </section>

      <section class="admin-subscription-control-panel">
        <header>
          <div>
            <p class="kicker">ADD SUBSCRIPTION TO CITIZEN</p>
            <h5>Catalog assignment</h5>
          </div>
          ${cancelledSubscriptions.length ? `<button class="subscription-clear-button" type="button" data-admin-clear-cancelled="${escapeHtml(citizen.id)}">Clear Cancelled</button>` : ""}
        </header>

        <div class="admin-subscription-category-switcher">
          ${getSubscriptionCategories().map((category) => `
            <button class="${category.id === selectedCategory ? "is-selected" : ""}" type="button" data-admin-subscription-category="${escapeHtml(category.id)}">
              ${escapeHtml(category.title)}
            </button>
          `).join("")}
        </div>

        ${renderSubscriptionAddPanel(selectedCategory, { open: true, selectedCatalogId: adminState.selectedCatalogId, citizenId })}
      </section>

      <section class="admin-subscription-record-sections">
        ${getSubscriptionCategories().map((category) => renderAdminCitizenSubscriptionCategory(citizen, category, subscriptions, { selectedSubscriptionId })).join("")}
      </section>
    </article>
  `;

  window.WS_APP.bindModuleBackButton(user, () => renderAdminSubscriptionsModule(user));
  bindAdminCitizenSubscriptionActions(user, citizen.id, selectedCategory);
}

function renderAdminCitizenSubscriptionCategory(citizen, category, subscriptions, options = {}) {
  const selectedSubscriptionId = String(options.selectedSubscriptionId || "").trim();
  const items = subscriptions.filter((subscription) => subscription.category === category.id);
  const isSelectedCategory = selectedSubscriptionId && items.some((subscription) => String(subscription.id || "") === selectedSubscriptionId);

  return `
    <details class="admin-subscription-category-section ${isSelectedCategory ? "is-selected-category" : ""}" ${isSelectedCategory ? "open" : ""}>
      <summary>
        <span>${escapeHtml(category.title)}</span>
        <b>${escapeHtml(items.length)}</b>
      </summary>
      <div class="admin-subscription-records">
        ${items.length
          ? renderAdminSubscriptionStatusSections(items, citizen.id, { selectedSubscriptionId })
          : '<p class="file-empty">No subscriptions in this category</p>'}
      </div>
    </details>
  `;
}

function renderAdminSubscriptionStatusSections(subscriptions, citizenId, options = {}) {
  const selectedSubscriptionId = String(options.selectedSubscriptionId || "").trim();
  const groups = [
    { id: "PAID", title: "PAID", filter: (item) => String(item.status || "").toUpperCase() === "PAID" },
    { id: "PENDING", title: "PENDING", filter: (item) => String(item.status || "").toUpperCase() === "PENDING" },
    { id: "OVERDUE", title: "OVERDUE", filter: (item) => String(item.status || "").toUpperCase() === "OVERDUE" },
    { id: "SUSPENDED", title: "SUSPENDED", filter: (item) => String(item.status || "").toUpperCase() === "SUSPENDED" },
    { id: "CANCELLED", title: "CANCELLED", filter: (item) => String(item.status || "").toUpperCase() === "CANCELLED" }
  ];

  return groups
    .map((group) => ({ ...group, items: subscriptions.filter(group.filter) }))
    .filter((group) => group.items.length)
    .map((group) => `
      <section class="subscription-status-section subscription-status-${escapeHtml(group.id.toLowerCase())}">
        <header>
          <p class="kicker">${escapeHtml(group.title)}</p>
          <span>${escapeHtml(group.items.length)}</span>
        </header>
        <div class="subscription-status-list">
          ${group.items.map((subscription) => renderAdminSubscriptionRecord(subscription, citizenId, { allowActions: true, selected: String(subscription.id || "") === selectedSubscriptionId })).join("")}
        </div>
      </section>
    `).join("");
}

function bindAdminCitizenSubscriptionActions(user, citizenId, category) {
  document.querySelectorAll("[data-admin-subscription-category]").forEach((button) => {
    button.addEventListener("click", () => {
      renderAdminCitizenSubscriptionControl(user, citizenId, { category: button.dataset.adminSubscriptionCategory });
    });
  });

  document.querySelectorAll("[data-select-catalog-subscription]").forEach((button) => {
    button.addEventListener("click", () => {
      renderAdminCitizenSubscriptionControl(user, citizenId, { category, selectedCatalogId: button.dataset.selectCatalogSubscription });
    });
  });

  document.querySelectorAll("[data-confirm-subscription-tier]").forEach((button) => {
    button.addEventListener("click", async () => {
      const citizen = window.WS_APP.getCitizenById(citizenId);
      const [serviceId, tierId] = String(button.dataset.confirmSubscriptionTier || "").split("::");
      const service = window.WS_APP.getSubscriptionCatalogItemById?.(serviceId);
      const tier = (service?.tiers || []).find((item) => getSubscriptionTierIdForUi(item) === String(tierId || ""));
      if (!citizen || !service || !tier) return;

      const confirmed = await window.WS_APP.confirmAction?.({
        title: "ADD SUBSCRIPTION TO CITIZEN",
        message: `Add ${service.title} / ${tier.label} to ${getCitizenNameLabel(citizen, { legal: true }) || getCitizenShortId(citizen)} for ${formatCredits(tier.amount)} per ${tier.cycle || "WEEKLY"}?`,
        confirmLabel: "Assign",
        cancelLabel: "Cancel",
        tone: "default"
      });
      if (!confirmed) return;

      const payload = createSubscriptionPayloadFromTier(service, tier);
      const targetValue = button.closest(".subscription-tier-option")?.querySelector("[data-subscription-purchase-target]")?.value || "";
      payload.coverageTarget = targetValue
        ? parseSubscriptionTargetControlValue(targetValue, citizenId)
        : { type: "CITIZEN", id: citizenId };
      const result = getSubscriptionCommandApi()?.createSubscriptionContract?.({
        ...payload,
        citizenId
      }, {
        createdBy: user.login || "ADMIN",
        idempotencyKey: `subscriptions-admin:create:${citizenId}:${service.id}:${getSubscriptionTierIdForUi(tier)}:${payload.coverageTarget.type}:${payload.coverageTarget.id}`
      });
      if (!result?.ok) return;

      window.WS_APP.appendTerminalLogLine?.(`ADMIN SUBSCRIPTION ADDED / ${getCitizenShortId(citizen)} / ${payload.title}`, { typed: true, speed: 8 });
      renderAdminCitizenSubscriptionControl(user, citizenId, { category });
    });
  });

  document.querySelectorAll("[data-admin-change-subscription-tier]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [targetCitizenId, subscriptionId, serviceId, tierId] = String(button.dataset.adminChangeSubscriptionTier || "").split("::");
      const citizen = window.WS_APP.getCitizenById(targetCitizenId);
      const service = window.WS_APP.getSubscriptionCatalogItemById?.(serviceId);
      const tier = (service?.tiers || []).find((item) => getSubscriptionTierIdForUi(item) === String(tierId || ""));
      if (!citizen || !service || !tier) return;

      const confirmed = await window.WS_APP.confirmAction?.({
        title: "CHANGE SUBSCRIPTION TIER",
        message: `Change ${service.title} to ${tier.label} for ${getCitizenNameLabel(citizen, { legal: true }) || getCitizenShortId(citizen)}? New cost: ${formatCredits(tier.amount)} / ${tier.cycle || "WEEKLY"}.`,
        confirmLabel: "Apply Tier",
        cancelLabel: "Cancel",
        tone: "default"
      });
      if (!confirmed) return;

      const result = getSubscriptionCommandApi()?.changeSubscriptionTier?.(subscriptionId, getSubscriptionTierIdForUi(tier), {
        billingStatus: "PENDING",
        createdBy: user.login || "ADMIN",
        idempotencyKey: `subscriptions-admin:tier:${subscriptionId}:${getSubscriptionTierIdForUi(tier)}`
      });
      if (!result?.ok) return;

      window.WS_APP.appendTerminalLogLine?.(`ADMIN SUBSCRIPTION TIER / ${subscriptionId} / ${tier.label}`, { typed: true, speed: 8 });
      renderAdminCitizenSubscriptionControl(user, citizenId, { category });
    });
  });

  document.querySelectorAll("[data-admin-apply-subscription-status]").forEach((button) => {
    button.addEventListener("click", () => {
      const [targetCitizenId, subscriptionId] = String(button.dataset.adminApplySubscriptionStatus || "").split("::");
      const select = document.querySelector(`[data-admin-status-select="${CSS.escape(button.dataset.adminApplySubscriptionStatus || "")}"]`);
      const nextStatus = String(select?.value || "PENDING").toUpperCase();
      const result = executeSubscriptionStatusCommand(subscriptionId, nextStatus, {
        reason: "ADMIN_STATUS_OVERRIDE",
        createdBy: user.login || "ADMIN",
        waiveCharge: true
      });
      if (!result?.ok) return;
      window.WS_APP.appendTerminalLogLine?.(`ADMIN SUBSCRIPTION STATUS / ${subscriptionId} / ${nextStatus}`, { typed: true, speed: 8 });
      renderAdminCitizenSubscriptionControl(user, citizenId, { category });
    });
  });

  document.querySelectorAll("[data-admin-suspend-subscription]").forEach((button) => {
    button.addEventListener("click", () => {
      const [targetCitizenId, subscriptionId] = String(button.dataset.adminSuspendSubscription || "").split("::");
      const result = getSubscriptionCommandApi()?.suspendSubscriptionContract?.(subscriptionId, "ADMIN_SUSPENDED", {
        createdBy: user.login || "ADMIN"
      });
      if (!result?.ok) return;
      window.WS_APP.appendTerminalLogLine?.(`ADMIN SUBSCRIPTION SUSPENDED / ${subscriptionId}`, { typed: true, speed: 8 });
      renderAdminCitizenSubscriptionControl(user, citizenId, { category });
    });
  });

  document.querySelectorAll("[data-admin-reactivate-subscription]").forEach((button) => {
    button.addEventListener("click", () => {
      const [targetCitizenId, subscriptionId] = String(button.dataset.adminReactivateSubscription || "").split("::");
      const result = getSubscriptionCommandApi()?.resumeSubscriptionContract?.(subscriptionId, {
        billingStatus: "PENDING",
        createdBy: user.login || "ADMIN"
      });
      if (!result?.ok) return;
      window.WS_APP.appendTerminalLogLine?.(`ADMIN SUBSCRIPTION SET TO PENDING / ${subscriptionId}`, { typed: true, speed: 8 });
      renderAdminCitizenSubscriptionControl(user, citizenId, { category });
    });
  });

  document.querySelectorAll("[data-admin-cancel-subscription]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [targetCitizenId, subscriptionId] = String(button.dataset.adminCancelSubscription || "").split("::");
      const citizen = window.WS_APP.getCitizenById(targetCitizenId);
      const confirmed = await confirmRegistryAction("ADMIN CANCEL SUBSCRIPTION", getSubscriptionCancellationMessage(citizen, subscriptionId, { admin: true }), "Cancel Subscription");
      if (!confirmed) return;

      const result = getSubscriptionCommandApi()?.cancelSubscriptionContract?.(subscriptionId, "ADMIN_CANCELLED", {
        waiveCharge: true,
        createdBy: user.login || "ADMIN",
        idempotencyKey: `subscriptions-admin:cancel:${subscriptionId}`
      });
      if (!result?.ok) return;

      window.WS_APP.appendTerminalLogLine?.(`ADMIN SUBSCRIPTION CANCELLED / ${subscriptionId}`, { typed: true, speed: 8 });
      renderAdminCitizenSubscriptionControl(user, citizenId, { category });
    });
  });

  document.querySelectorAll("[data-admin-remove-subscription]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [targetCitizenId, subscriptionId] = String(button.dataset.adminRemoveSubscription || "").split("::");
      const confirmed = await confirmRegistryAction("REMOVE SUBSCRIPTION", "Permanently remove this subscription from the selected citizen card?", "Remove");
      if (!confirmed) return;

      const result = getSubscriptionCommandApi()?.removeSubscriptionContractRecord?.(subscriptionId, {
        createdBy: user.login || "ADMIN"
      });
      if (!result?.ok) return;

      window.WS_APP.appendTerminalLogLine?.(`ADMIN SUBSCRIPTION REMOVED / ${subscriptionId}`, { typed: true, speed: 8 });
      renderAdminCitizenSubscriptionControl(user, citizenId, { category });
    });
  });

  bindSubscriptionTargetControls(user, {
    citizenId,
    admin: true,
    onChanged: () => renderAdminCitizenSubscriptionControl(user, citizenId, { category })
  });

  document.querySelector("[data-admin-clear-cancelled]")?.addEventListener("click", async () => {
    const confirmed = await confirmRegistryAction("CLEAR CANCELLED SUBSCRIPTIONS", "Remove all cancelled subscriptions from this citizen card?", "Clear Cancelled");
    if (!confirmed) return;

    const result = getSubscriptionCommandApi()?.clearCancelledSubscriptionContracts?.(citizenId, {
      createdBy: user.login || "ADMIN"
    });
    if (!result?.ok) return;

    window.WS_APP.appendTerminalLogLine?.(`ADMIN CANCELLED SUBSCRIPTIONS CLEARED / ${citizenId}`, { typed: true, speed: 8 });
    renderAdminCitizenSubscriptionControl(user, citizenId, { category });
  });
}


function renderAdminSubscriptionTierControl(subscription = {}, citizenId = "") {
  const service = subscription.catalogId ? window.WS_APP.getSubscriptionCatalogItemById?.(subscription.catalogId) : null;
  const tiers = (service?.tiers || []).filter((tier) => !tier.archived);
  if (!tiers.length) return "";

  return `
    <section class="admin-subscription-tier-control">
      <header>
        <p class="kicker">TIER CONTROL</p>
        <span>${escapeHtml(service.title || subscription.title || "Subscription")}</span>
      </header>
      <div class="admin-subscription-tier-grid">
        ${tiers.map((tier) => {
          const isCurrent = getSubscriptionTierIdForUi(tier) === String(subscription.tierId || "");
          return `
            <button type="button" class="admin-subscription-tier-button ${isCurrent ? "is-current" : ""}" data-admin-change-subscription-tier="${escapeHtml(citizenId)}::${escapeHtml(subscription.id)}::${escapeHtml(service.id)}::${escapeHtml(getSubscriptionTierIdForUi(tier))}" ${isCurrent ? "disabled" : ""}>
              <b>${escapeHtml(tier.label || "Tier")}</b>
              <small>${escapeHtml(formatCredits(tier.amount))} / ${escapeHtml(tier.cycle || "WEEKLY")}</small>
              <i>${isCurrent ? "CURRENT" : "APPLY"}</i>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderAdminSubscriptionRecord(subscription, citizenId = "", options = {}) {
  const allowActions = Boolean(options.allowActions);
  const selected = options.selected === true;
  const key = `${citizenId}::${subscription.id}`;

  return `
    <details class="admin-subscription-record ${selected ? "is-selected" : ""}" ${selected ? "open" : ""}>
      <summary>
        ${renderSubscriptionLogo(subscription)}

        <span>
          <b>${escapeHtml(subscription.title)}</b>
          <small>${escapeHtml(subscription.category)} / ${escapeHtml(subscription.provider)}</small>
        </span>

        <strong class="payment-tag ${escapeHtml(String(subscription.status || "").toLowerCase())}">${escapeHtml(subscription.status)}</strong>
      </summary>

      <div class="subscription-record-body">
        ${renderDataRow("TIER", getSubscriptionTierLabel(subscription))}
        ${renderDataRow("AMOUNT", formatCredits(subscription.amount))}
        ${renderDataRow("CYCLE", subscription.cycle || "WEEKLY")}
        ${renderDataRow("ACTIVE", subscription.active ? "YES" : "NO")}
        ${renderDataRow("PAYMENT", subscription.status)}
        ${renderDataRow("START", formatDateDisplay(subscription.startDate))}
        ${renderDataRow("END / RENEWAL", formatDateDisplay(subscription.endDate || subscription.renewalDate))}
        ${subscription.cancelledAt ? renderDataRow("CANCELLED", formatDateDisplay(subscription.cancelledAt)) : ""}
        ${subscription.description ? `<p class="subscription-record-note">${escapeHtml(subscription.description)}</p>` : ""}
        ${renderSubscriptionAssetContractPanel(subscription, citizenId, { admin: allowActions })}
        ${allowActions ? renderAdminSubscriptionTierControl(subscription, citizenId) : ""}
        ${allowActions ? `
          <div class="admin-subscription-status-control">
            <label>Status
              <select data-admin-status-select="${escapeHtml(key)}">
                ${["PAID", "PENDING", "OVERDUE", "SUSPENDED", "CANCELLED"].map((statusOption) => `<option value="${statusOption}" ${String(subscription.status || "").toUpperCase() === statusOption ? "selected" : ""}>${statusOption}</option>`).join("")}
              </select>
            </label>
            <button type="button" data-admin-apply-subscription-status="${escapeHtml(key)}">Apply Status</button>
          </div>
          <div class="admin-subscription-record-actions">
            ${subscription.active ? `<button type="button" data-admin-suspend-subscription="${escapeHtml(key)}">Suspend</button>` : `<button type="button" data-admin-reactivate-subscription="${escapeHtml(key)}">Set Pending</button>`}
            ${subscription.active ? `<button type="button" data-admin-cancel-subscription="${escapeHtml(key)}">Cancel Without Penalty</button>` : ""}
            <button type="button" data-admin-remove-subscription="${escapeHtml(key)}">Remove From Citizen</button>
          </div>
        ` : ""}
      </div>
    </details>
  `;
}

window.WS_APP.renderCitizenSubscriptionSummaryTiles = renderCitizenSubscriptionSummaryTiles;
window.WS_APP.openCitizenSubscriptionFromSummary = openCitizenSubscriptionFromSummary;
window.WS_APP.getCitizenInsuranceLabel = getCitizenInsuranceLabel;
window.WS_APP.renderSubscriptionsModule = renderSubscriptionsModule;
window.WS_APP.subscriptionProfiles = Object.freeze({
  version: "subscriptions_catalog_presentation_4_4",
  getAvailability: getSubscriptionProfileAvailability,
  getTierCoverage: getSubscriptionProfileTierCoverage,
  getTierEntitlements: getSubscriptionProfileTierEntitlements,
  getProductPresentation: getSubscriptionProductPresentation,
  getTierPresentation: getSubscriptionTierPresentation,
  getTierId: getSubscriptionTierIdForUi
});

window.WS_APP.renderPlayerSubscriptionProfile = renderPlayerSubscriptionProfile;
window.WS_APP.renderPlayerCatalogServiceProfile = renderPlayerCatalogServiceProfile;
window.WS_APP.renderSubscriptionProviderProfile = renderSubscriptionProviderProfile;
window.WS_APP.handleSubscriptionPayment = handleSubscriptionPayment;
window.WS_APP.renderAdminCitizenSubscriptionControl = renderAdminCitizenSubscriptionControl;
