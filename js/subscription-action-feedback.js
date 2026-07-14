window.WS_APP = window.WS_APP || {};

(function initSubscriptionActionFeedback(app) {
  "use strict";

  if (app.SubscriptionActionFeedback?.version === "subscriptions_actions_feedback_4_3") return;

  const VERSION = "subscriptions_actions_feedback_4_3";
  const DEFAULT_SCOPE = "PLAYER";
  const ACTION_LABELS = Object.freeze({
    PURCHASE: "Purchase",
    ASSIGN: "Assign contract",
    UPGRADE: "Upgrade",
    DOWNGRADE: "Downgrade",
    TIER: "Tier change",
    PAYMENT: "Payment",
    PAY: "Payment",
    BILLING: "Billing update",
    TARGET: "Target rebind",
    CANCEL: "Cancellation",
    SUSPEND: "Suspension",
    RESUME: "Resume",
    CLEAR_CANCELLED: "Archive cleanup"
  });

  const SUCCESS_MESSAGES = Object.freeze({
    SUBSCRIPTION_CONTRACT_CREATED: "The subscription contract was created and is ready for Billing processing.",
    SUBSCRIPTION_TIER_CHANGED: "The selected package tier was applied to the existing contract.",
    SUBSCRIPTION_TIER_UNCHANGED: "The contract already uses the selected tier. No data was changed.",
    SUBSCRIPTION_TARGET_CHANGED: "The contract was rebound and entitlement was recalculated for the selected target.",
    SUBSCRIPTION_TARGET_UNCHANGED: "The contract already uses the selected target. No data was changed.",
    SUBSCRIPTION_CONTRACT_CANCELLED: "The contract was cancelled and moved to the archived contract state.",
    SUBSCRIPTION_ALREADY_CANCELLED: "The contract was already cancelled. No additional charge or mutation was created.",
    SUBSCRIPTION_CONTRACT_SUSPENDED: "The contract was suspended. Billing and entitlement state will reflect the hold.",
    SUBSCRIPTION_CONTRACT_RESUMED: "The contract was resumed and returned to pending Billing state.",
    SUBSCRIPTION_BILLING_PROCESSED: "The selected subscription payment was processed.",
    CITIZEN_SUBSCRIPTION_BILLING_PROCESSED: "The selected subscription obligations were processed.",
    SUBSCRIPTION_BILLING_PAID: "Billing status was set to paid.",
    SUBSCRIPTION_BILLING_PENDING: "Billing status was set to pending.",
    SUBSCRIPTION_BILLING_OVERDUE: "Billing status was set to overdue.",
    SUBSCRIPTION_CANCELLED_RECORDS_CLEARED: "Cancelled subscription records were removed from the Citizen card."
  });

  const ERROR_MESSAGES = Object.freeze({
    SUBSCRIPTION_API_UNAVAILABLE: "Subscription commands are currently unavailable. Reopen the module after its bundle finishes loading.",
    SUBSCRIPTION_STORE_UNAVAILABLE: "The canonical subscription store is unavailable. No contract data was changed.",
    SUBSCRIPTION_CITIZEN_NOT_FOUND: "The Citizen assigned to this command could not be resolved.",
    SUBSCRIPTION_CATALOG_NOT_FOUND: "The selected subscription product no longer exists in the active catalog.",
    SUBSCRIPTION_CATALOG_INACTIVE: "The selected subscription product is inactive or archived.",
    SUBSCRIPTION_TIER_NOT_FOUND: "The selected package tier is unavailable.",
    SUBSCRIPTION_TIER_REQUIRED: "Select a package tier before continuing.",
    SUBSCRIPTION_TARGET_REQUIRED: "Select an eligible coverage target before continuing.",
    SUBSCRIPTION_TARGET_ID_REQUIRED: "The selected coverage target has no stable identifier.",
    SUBSCRIPTION_TARGET_INVALID: "The selected target does not satisfy the catalog target policy.",
    SUBSCRIPTION_TARGET_NOT_ALLOWED: "This product does not allow the selected coverage target type.",
    SUBSCRIPTION_TARGET_VALIDATOR_UNAVAILABLE: "Target eligibility could not be verified. No contract data was changed.",
    SUBSCRIPTION_ITEM_STORE_UNAVAILABLE: "ItemInstance eligibility could not be verified because the item store is unavailable.",
    SUBSCRIPTION_ITEM_TARGET_NOT_FOUND: "The selected ItemInstance no longer exists.",
    SUBSCRIPTION_ITEM_TARGET_OWNER_MISMATCH: "The selected ItemInstance is not owned by this Citizen.",
    SUBSCRIPTION_ITEM_TARGET_DESTROYED: "Destroyed ItemInstances cannot receive this subscription.",
    SUBSCRIPTION_ITEM_TARGET_LIFECYCLE_BLOCKED: "The selected ItemInstance is in a lifecycle state excluded by this product.",
    SUBSCRIPTION_ITEM_TARGET_POLICY_MISMATCH: "The selected ItemInstance does not satisfy the product coverage policy.",
    SUBSCRIPTION_ITEM_TARGET_DEFINITION_INELIGIBLE: "The selected ItemInstance definition is not eligible for this product.",
    SUBSCRIPTION_ITEM_TARGET_CATEGORY_INELIGIBLE: "The selected ItemInstance category is not eligible for this product.",
    SUBSCRIPTION_ITEM_TARGET_SUBTYPE_INELIGIBLE: "The selected ItemInstance subtype is not eligible for this product.",
    SUBSCRIPTION_ITEM_TARGET_TAG_INELIGIBLE: "The selected ItemInstance does not have an accepted coverage tag.",
    SUBSCRIPTION_ITEM_TARGET_TAGS_REQUIRED: "The selected ItemInstance is missing one or more required coverage tags.",
    SUBSCRIPTION_ITEM_TARGET_MANUFACTURER_INELIGIBLE: "The selected ItemInstance manufacturer is not covered by this product.",
    SUBSCRIPTION_ITEM_TARGET_PROVIDER_INELIGIBLE: "The selected ItemInstance provider is not covered by this product.",
    SUBSCRIPTION_TARGET_TYPE_NOT_ENABLED: "This subscription does not support the selected target type.",
    SUBSCRIPTION_CONTRACT_ALREADY_EXISTS: "An open contract already exists for this product and exact target.",
    SUBSCRIPTION_CONTRACT_ID_EXISTS: "A contract with the generated identifier already exists. Retry the operation.",
    SUBSCRIPTION_CONTRACT_NOT_FOUND: "The selected contract no longer exists.",
    SUBSCRIPTION_CONTRACT_CANCELLED: "Cancelled contracts cannot be modified. Purchase a new package from the catalog.",
    SUBSCRIPTION_CONTRACT_INVALID: "The contract failed canonical validation and was not saved.",
    SUBSCRIPTION_CREATE_FAILED: "The contract could not be created. No partial contract was retained.",
    SUBSCRIPTION_PROFILE_INELIGIBLE: "The current Citizen profile does not meet this product requirement.",
    SUBSCRIPTION_COMMAND_EXCEPTION: "The subscription command stopped unexpectedly. No unconfirmed UI state was retained.",
    SUBSCRIPTION_ADMIN_COMMAND_EXCEPTION: "The administrative subscription command stopped unexpectedly.",
    SUBSCRIPTION_UPDATE_FAILED: "The contract update could not be committed.",
    SUBSCRIPTION_CANCEL_FAILED: "The contract could not be cancelled.",
    SUBSCRIPTION_CANCELLED_CLEAR_FAILED: "Cancelled subscription records could not be cleared.",
    SUBSCRIPTION_RECORD_NOT_CANCELLED: "Only cancelled contracts can be removed from the archive.",
    SUBSCRIPTION_RECORD_REMOVE_FAILED: "The archived subscription record could not be removed.",
    SUBSCRIPTION_BILLING_UNAVAILABLE: "Subscription Billing is unavailable. No payment was recorded.",
    SUBSCRIPTION_BILLING_FAILED: "Subscription Billing rejected the operation. No payment was recorded.",
    SUBSCRIPTION_ENTITLEMENT_RESOLVER_UNAVAILABLE: "Entitlement could not be recalculated. No contract change was committed.",
    SUBSCRIPTION_BILLING_STATUS_INVALID: "The selected Billing status is not supported.",
    SUBSCRIPTION_RESUME_STATUS_INVALID: "The requested resume status is not supported.",
    INSUFFICIENT_CREDITS: "The Citizen does not have enough Credits for the selected payment.",
    DEBT_LIMIT_EXCEEDED: "The Debt Account does not have enough remaining capacity.",
    NO_PAYABLE: "No pending or overdue subscription obligation was found in the selected scope.",
    REASON_REQUIRED: "Enter an operator note before running an administrative command.",
    ACTOR_REQUIRED: "The administrative actor could not be resolved.",
    ADMIN_ROLE_REQUIRED: "This command requires an Admin session.",
    SUBSCRIPTION_ADMIN_ACTION_UNKNOWN: "The selected administrative command is not registered.",
    SUBSCRIPTION_ADMIN_COMMAND_NO_RESULT: "The command returned no result and was treated as failed."
  });

  function token(value = "") {
    return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9_:-]+/g, "_");
  }

  function escapeHtml(value = "") {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getResultCode(result = {}) {
    return token(result.resultCode || result.errorCode || result.error?.code || result.reason || result.billingResult?.reason || "SUBSCRIPTION_COMMAND_FAILED");
  }

  function getStateStore() {
    const state = app.subscriptionActionFeedbackState && typeof app.subscriptionActionFeedbackState === "object"
      ? app.subscriptionActionFeedbackState
      : {};
    app.subscriptionActionFeedbackState = state;
    return state;
  }

  function formatCredits(value = 0) {
    const number = Number(value || 0);
    const safe = Number.isFinite(number) ? Math.trunc(number) : 0;
    return `${String(safe).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₡`;
  }

  function describe(action = "", result = {}, context = {}) {
    const normalizedAction = token(action || "COMMAND") || "COMMAND";
    const actionLabel = ACTION_LABELS[normalizedAction] || String(action || "Subscription command");
    const code = getResultCode(result);
    const success = result?.ok === true;
    const billing = result?.billingResult && typeof result.billingResult === "object" ? result.billingResult : result;
    let message = success
      ? SUCCESS_MESSAGES[code] || `${actionLabel} completed successfully.`
      : ERROR_MESSAGES[code] || "The subscription command was rejected. No unconfirmed UI state was retained.";

    if (!success && code === "INSUFFICIENT_CREDITS") {
      message = `Payment denied. Required ${formatCredits(billing.total || context.amount || 0)}, available ${formatCredits(billing.credits || 0)}.`;
    } else if (!success && code === "DEBT_LIMIT_EXCEEDED") {
      message = `Payment denied. Remaining Debt Account capacity is ${formatCredits(billing.debtCapacity || 0)}; missing ${formatCredits(billing.missing || 0)}.`;
    } else if (success && billing.partial) {
      message = `Processed ${billing.paidCount || 0} contract(s) for ${formatCredits(billing.total || 0)}. ${billing.unpaidCount || 0} contract(s) remain unpaid.`;
    } else if (success && context.targetLabel && ["TARGET", "ASSIGN"].includes(normalizedAction)) {
      message = `${message} Target: ${context.targetLabel}.`;
    } else if (success && context.packageLabel && ["PURCHASE", "UPGRADE", "DOWNGRADE", "TIER"].includes(normalizedAction)) {
      message = `${message} Package: ${context.packageLabel}.`;
    }

    return {
      action: normalizedAction,
      code,
      success,
      tone: success ? (billing.partial ? "warning" : "success") : "error",
      title: success ? `${actionLabel} complete` : `${actionLabel} failed`,
      message,
      details: String(context.details || "").trim(),
      createdAt: new Date().toISOString()
    };
  }

  function set(scope = DEFAULT_SCOPE, descriptor = null) {
    const key = token(scope || DEFAULT_SCOPE) || DEFAULT_SCOPE;
    const store = getStateStore();
    if (!descriptor) delete store[key];
    else store[key] = { ...descriptor };
    return store[key] || null;
  }

  function get(scope = DEFAULT_SCOPE) {
    const key = token(scope || DEFAULT_SCOPE) || DEFAULT_SCOPE;
    return getStateStore()[key] || null;
  }

  function clear(scope = DEFAULT_SCOPE) {
    set(scope, null);
    mount(scope);
  }

  function render(scope = DEFAULT_SCOPE) {
    const feedback = get(scope);
    if (!feedback?.message) return "";
    const role = feedback.tone === "error" ? "alert" : "status";
    return `
      <section class="subscription-action-feedback is-${escapeHtml(feedback.tone || "info")}" role="${role}" aria-live="${feedback.tone === "error" ? "assertive" : "polite"}" aria-atomic="true">
        <div class="subscription-action-feedback__head">
          <span><small>${escapeHtml(feedback.action || "SUBSCRIPTION")}</small><b>${escapeHtml(feedback.title || "Subscription command")}</b></span>
          <code>${escapeHtml(feedback.code || "RESULT")}</code>
        </div>
        <p>${escapeHtml(feedback.message)}</p>
        ${feedback.details ? `<small class="subscription-action-feedback__details">${escapeHtml(feedback.details)}</small>` : ""}
      </section>
    `;
  }

  function mount(scope = DEFAULT_SCOPE, root = document) {
    const key = token(scope || DEFAULT_SCOPE) || DEFAULT_SCOPE;
    const host = root?.querySelector?.(`[data-subscription-action-feedback-scope="${key}"]`)
      || document?.querySelector?.(`[data-subscription-action-feedback-scope="${key}"]`)
      || null;
    if (host) host.innerHTML = render(key);
    return host;
  }

  function present(scope = DEFAULT_SCOPE, action = "", result = {}, context = {}) {
    const descriptor = describe(action, result, context);
    set(scope, descriptor);
    mount(scope);
    app.appendTerminalLogLine?.(`SUBSCRIPTION ${descriptor.success ? "ACTION COMPLETE" : "ACTION FAILED"} / ${descriptor.action} / ${descriptor.code}`, { typed: true, speed: 8 });
    return descriptor;
  }

  function getControlElement(control) {
    if (!control) return null;
    if (control.matches?.("form")) return control.querySelector("button[type='submit']") || control;
    return control;
  }

  function lock(control, label = "PROCESSING...") {
    const element = getControlElement(control);
    if (!element || element.dataset.subscriptionActionBusy === "true") return null;
    const state = {
      element,
      disabled: Boolean(element.disabled),
      ariaDisabled: element.getAttribute?.("aria-disabled"),
      html: element.innerHTML
    };
    element.dataset.subscriptionActionBusy = "true";
    element.setAttribute?.("aria-busy", "true");
    element.setAttribute?.("aria-disabled", "true");
    element.classList?.add("is-processing");
    if ("disabled" in element) element.disabled = true;
    if (typeof element.innerHTML === "string") element.innerHTML = escapeHtml(label);
    return () => {
      if (!state.element) return;
      delete state.element.dataset.subscriptionActionBusy;
      state.element.removeAttribute?.("aria-busy");
      if (state.ariaDisabled == null) state.element.removeAttribute?.("aria-disabled");
      else state.element.setAttribute?.("aria-disabled", state.ariaDisabled);
      state.element.classList?.remove("is-processing");
      if ("disabled" in state.element) state.element.disabled = state.disabled;
      if (typeof state.element.innerHTML === "string") state.element.innerHTML = state.html;
    };
  }

  function isBusy(control) {
    return getControlElement(control)?.dataset?.subscriptionActionBusy === "true";
  }

  app.SubscriptionActionFeedback = Object.freeze({
    version: VERSION,
    getResultCode,
    describe,
    set,
    get,
    clear,
    render,
    mount,
    present,
    lock,
    isBusy
  });
})(window.WS_APP);
