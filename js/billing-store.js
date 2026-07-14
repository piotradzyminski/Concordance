window.WS_APP = window.WS_APP || {};

(function initBillingBridgeStore() {
  const INTENTS_STORAGE_KEY = "ws_app_billing_intents_v2";
  const TRANSACTIONS_STORAGE_KEY = "ws_app_billing_transactions_v2";
  const TRANSFER_ACCOUNTS_STORAGE_KEY = "ws_app_billing_transfer_accounts_v1";
  const TRANSFERS_STORAGE_KEY = "ws_app_billing_transfers_v1";
  const SCHEMA_STORAGE_KEY = "ws_app_billing_bridge_schema";
  const SCHEMA_VERSION = "billing_bridge_schema_2_1x";
  const DEFAULT_CURRENCY = "CREDIT";
  const DEFAULT_DEBT_LIMIT = 20000;

  const clone = window.WS_APP.storeUtils?.clone || ((value) => {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  });

  const intentById = new Map();
  const intentByIdempotencyKey = new Map();
  const transactionById = new Map();
  const transactionByIdempotencyKey = new Map();
  const transferAccountById = new Map();
  const transferById = new Map();
  const transferByIdempotencyKey = new Map();
  let intents = [];
  let transactions = [];
  let transferAccounts = [];
  let transfers = [];
  let initialized = false;
  let legacyBackfillActive = false;

  const INTENT_STATUSES = new Set([
    "PENDING",
    "AUTHORIZED",
    "PARTIALLY_CAPTURED",
    "CAPTURED",
    "FAILED",
    "VOIDED",
    "EXPIRED",
    "PAYMENT_RECOVERY_REQUIRED"
  ]);

  const TRANSACTION_STATUSES = new Set([
    "CAPTURED",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
    "FAILED",
    "PAYMENT_RECOVERY_REQUIRED"
  ]);

  const PAYMENT_SOURCES = new Set([
    "CREDITS",
    "DEBT_ACCOUNT",
    "NOT_REQUIRED",
    "COVERED",
    "WAIVED",
    "EXTERNAL"
  ]);

  function nowIso() {
    return new Date().toISOString();
  }

  function campaignDateIso() {
    return String(window.WS_APP.getCampaignDateIso?.() || window.WS_APP.CAMPAIGN_DATE_ISO || nowIso().slice(0, 10)).trim();
  }

  function normalizeToken(value = "", fallback = "") {
    const normalized = String(value || fallback)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return normalized || fallback;
  }

  function normalizeAmount(value) {
    const parser = window.WS_APP.parseCredits || window.WS_APP.parseCreditNumber;
    const parsed = typeof parser === "function"
      ? Number(parser(value))
      : Number(String(value ?? 0).replace(/[^0-9,.-]/g, "").replace(",", "."));
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.round(parsed * 100) / 100);
  }

  function normalizeSignedAmount(value) {
    const parser = window.WS_APP.parseCredits || window.WS_APP.parseCreditNumber;
    const parsed = typeof parser === "function"
      ? Number(parser(value))
      : Number(String(value ?? 0).replace(/[^0-9,.-]/g, "").replace(",", "."));
    if (!Number.isFinite(parsed)) return 0;
    return Math.round(parsed * 100) / 100;
  }

  function makeId(prefix) {
    const stamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${stamp}_${random}`;
  }

  function readStoredArray(key) {
    try {
      const raw = window.localStorage?.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn(`W&S Billing Store could not read ${key}.`, error);
      return [];
    }
  }

  function writeStoredArray(key, value) {
    try {
      window.localStorage?.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`W&S Billing Store could not persist ${key}.`, error);
      return false;
    }
  }

  function normalizeCoverageBreakdown(value) {
    return (Array.isArray(value) ? value : [])
      .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
      .map((entry) => ({
        sourceType: normalizeToken(entry.sourceType, "UNKNOWN"),
        sourceId: String(entry.sourceId || "").trim(),
        coverageCode: normalizeToken(entry.coverageCode, ""),
        amount: normalizeAmount(entry.amount),
        metadata: entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata)
          ? clone(entry.metadata)
          : {}
      }));
  }

  function normalizeIntent(record = {}) {
    const amount = normalizeAmount(record.amount);
    const capturedAmount = Math.min(amount, normalizeAmount(record.capturedAmount));
    const status = normalizeToken(record.status, "PENDING");
    return {
      schemaVersion: 2,
      billingIntentId: String(record.billingIntentId || record.id || makeId("billing_intent")).trim(),
      citizenId: String(record.citizenId || "").trim(),
      sourceDomain: normalizeToken(record.sourceDomain, "BILLING"),
      sourceRefId: String(record.sourceRefId || "").trim(),
      amount,
      currency: normalizeToken(record.currency, DEFAULT_CURRENCY),
      descriptionCode: normalizeToken(record.descriptionCode, "PAYMENT"),
      paymentSource: PAYMENT_SOURCES.has(normalizeToken(record.paymentSource, "CREDITS"))
        ? normalizeToken(record.paymentSource, "CREDITS")
        : "CREDITS",
      coverageBreakdown: normalizeCoverageBreakdown(record.coverageBreakdown),
      status: INTENT_STATUSES.has(status) ? status : "PENDING",
      authorizedAmount: Math.min(amount, normalizeAmount(record.authorizedAmount)),
      capturedAmount,
      remainingAmount: Math.max(0, amount - capturedAmount),
      idempotencyKey: String(record.idempotencyKey || "").trim(),
      correlationId: String(record.correlationId || "").trim(),
      providerId: String(record.providerId || "").trim(),
      organizationId: String(record.organizationId || "").trim(),
      createdAt: String(record.createdAt || nowIso()).trim(),
      updatedAt: String(record.updatedAt || record.createdAt || nowIso()).trim(),
      authorizedAt: String(record.authorizedAt || "").trim(),
      capturedAt: String(record.capturedAt || "").trim(),
      failedAt: String(record.failedAt || "").trim(),
      voidedAt: String(record.voidedAt || "").trim(),
      failureCode: normalizeToken(record.failureCode, ""),
      failureMessage: String(record.failureMessage || "").trim(),
      revision: Math.max(1, Number(record.revision || 1) || 1),
      metadata: record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
        ? clone(record.metadata)
        : {}
    };
  }

  function normalizeAccountSnapshot(value = {}) {
    return {
      creditsBefore: normalizeSignedAmount(value.creditsBefore),
      creditsAfter: normalizeSignedAmount(value.creditsAfter),
      debtBefore: normalizeSignedAmount(value.debtBefore),
      debtAfter: normalizeSignedAmount(value.debtAfter)
    };
  }

  function normalizeAccountEffect(value = {}) {
    return {
      creditsDelta: normalizeSignedAmount(value.creditsDelta),
      debtDelta: normalizeSignedAmount(value.debtDelta)
    };
  }

  function normalizeTransaction(record = {}) {
    const status = normalizeToken(record.status, "CAPTURED");
    const amount = normalizeAmount(record.amount);
    const citizenId = String(record.citizenId || "").trim();
    const organizationId = String(record.organizationId || "").trim();
    const partyType = normalizeToken(record.partyType || (citizenId ? "CITIZEN" : organizationId ? "ORGANIZATION" : ""), "");
    const partyId = String(record.partyId || citizenId || organizationId || "").trim();
    return {
      schemaVersion: 2,
      billingTransactionId: String(record.billingTransactionId || record.id || makeId("billing_tx")).trim(),
      billingIntentId: String(record.billingIntentId || "").trim(),
      parentTransactionId: String(record.parentTransactionId || "").trim(),
      citizenId: partyType === "CITIZEN" ? partyId : citizenId,
      organizationId: partyType === "ORGANIZATION" ? partyId : organizationId,
      partyType,
      partyId,
      accountRef: partyType && partyId ? `${partyType}:${partyId}` : "",
      transactionType: normalizeToken(record.transactionType || record.type, "CAPTURE"),
      status: TRANSACTION_STATUSES.has(status) ? status : "CAPTURED",
      amount,
      refundedAmount: Math.min(amount, normalizeAmount(record.refundedAmount)),
      currency: normalizeToken(record.currency, DEFAULT_CURRENCY),
      paymentSource: PAYMENT_SOURCES.has(normalizeToken(record.paymentSource, "CREDITS"))
        ? normalizeToken(record.paymentSource, "CREDITS")
        : "CREDITS",
      sourceDomain: normalizeToken(record.sourceDomain, "BILLING"),
      sourceRefId: String(record.sourceRefId || "").trim(),
      idempotencyKey: String(record.idempotencyKey || "").trim(),
      correlationId: String(record.correlationId || "").trim(),
      providerId: String(record.providerId || "").trim(),
      externalCommit: record.externalCommit === true,
      accountEffect: normalizeAccountEffect(record.accountEffect),
      accountSnapshot: normalizeAccountSnapshot(record.accountSnapshot),
      createdAt: String(record.createdAt || nowIso()).trim(),
      capturedAt: String(record.capturedAt || record.createdAt || nowIso()).trim(),
      refundedAt: String(record.refundedAt || "").trim(),
      failedAt: String(record.failedAt || "").trim(),
      failureCode: normalizeToken(record.failureCode, ""),
      revision: Math.max(1, Number(record.revision || 1) || 1),
      metadata: record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
        ? clone(record.metadata)
        : {}
    };
  }


  function normalizePartyRef(value = {}) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const partyType = normalizeToken(source.partyType || source.type || (source.citizenId ? "CITIZEN" : source.organizationId ? "ORGANIZATION" : ""), "");
    const partyId = String(source.partyId || source.id || source.citizenId || source.organizationId || "").trim();
    return {
      partyType,
      partyId,
      accountId: partyType && partyId ? `${partyType}:${partyId}` : ""
    };
  }

  function normalizeTransferAccount(record = {}) {
    const source = record && typeof record === "object" && !Array.isArray(record) ? record : {};
    const party = normalizePartyRef(source);
    return {
      schemaVersion: 1,
      accountId: String(source.accountId || party.accountId || "").trim(),
      partyType: party.partyType,
      partyId: party.partyId,
      credits: normalizeSignedAmount(source.credits),
      debt: Math.max(0, normalizeSignedAmount(source.debt)),
      creditOverdraftAllowed: source.creditOverdraftAllowed === true || party.partyType === "ORGANIZATION",
      revision: Math.max(1, Number(source.revision || 1) || 1),
      createdAt: String(source.createdAt || nowIso()).trim(),
      updatedAt: String(source.updatedAt || source.createdAt || nowIso()).trim(),
      metadata: source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata) ? clone(source.metadata) : {}
    };
  }

  function normalizeTransfer(record = {}) {
    const source = record && typeof record === "object" && !Array.isArray(record) ? record : {};
    const sourceParty = normalizePartyRef(source.sourceParty || source.source || {});
    const targetParty = normalizePartyRef(source.targetParty || source.target || {});
    return {
      schemaVersion: 1,
      transferId: String(source.transferId || source.billingTransferId || source.id || makeId("billing_transfer")).trim(),
      transferType: normalizeToken(source.transferType, "ADMIN_TRANSFER"),
      asset: normalizeToken(source.asset, "CREDITS"),
      amount: normalizeAmount(source.amount),
      currency: normalizeToken(source.currency, DEFAULT_CURRENCY),
      sourceParty,
      targetParty,
      sourceTransactionId: String(source.sourceTransactionId || "").trim(),
      targetTransactionId: String(source.targetTransactionId || "").trim(),
      reversalOfTransferId: String(source.reversalOfTransferId || "").trim(),
      reversedByTransferId: String(source.reversedByTransferId || "").trim(),
      status: normalizeToken(source.status, "CAPTURED"),
      reason: String(source.reason || "").trim(),
      actor: source.actor && typeof source.actor === "object" && !Array.isArray(source.actor) ? clone(source.actor) : {},
      correlationId: String(source.correlationId || "").trim(),
      idempotencyKey: String(source.idempotencyKey || "").trim(),
      sourceAccountSnapshot: normalizeAccountSnapshot(source.sourceAccountSnapshot || {}),
      targetAccountSnapshot: normalizeAccountSnapshot(source.targetAccountSnapshot || {}),
      createdAt: String(source.createdAt || nowIso()).trim(),
      updatedAt: String(source.updatedAt || source.createdAt || nowIso()).trim(),
      revision: Math.max(1, Number(source.revision || 1) || 1),
      metadata: source.metadata && typeof source.metadata === "object" && !Array.isArray(source.metadata) ? clone(source.metadata) : {}
    };
  }

  function rebuildIndexes() {
    intentById.clear();
    intentByIdempotencyKey.clear();
    transactionById.clear();
    transactionByIdempotencyKey.clear();
    transferAccountById.clear();
    transferById.clear();
    transferByIdempotencyKey.clear();

    intents.forEach((record) => {
      intentById.set(record.billingIntentId, record);
      if (record.idempotencyKey) intentByIdempotencyKey.set(record.idempotencyKey, record);
    });

    transactions.forEach((record) => {
      transactionById.set(record.billingTransactionId, record);
      if (record.idempotencyKey) transactionByIdempotencyKey.set(record.idempotencyKey, record);
    });

    transferAccounts.forEach((record) => {
      if (record.accountId) transferAccountById.set(record.accountId, record);
    });

    transfers.forEach((record) => {
      transferById.set(record.transferId, record);
      if (record.idempotencyKey) transferByIdempotencyKey.set(record.idempotencyKey, record);
    });
  }

  function persistIntents() {
    const persisted = writeStoredArray(INTENTS_STORAGE_KEY, intents);
    if (persisted) rebuildIndexes();
    return persisted;
  }

  function persistTransactions() {
    const persisted = writeStoredArray(TRANSACTIONS_STORAGE_KEY, transactions);
    if (persisted) rebuildIndexes();
    return persisted;
  }

  function persistTransferAccounts() {
    const persisted = writeStoredArray(TRANSFER_ACCOUNTS_STORAGE_KEY, transferAccounts);
    if (persisted) rebuildIndexes();
    return persisted;
  }

  function persistTransfers() {
    const persisted = writeStoredArray(TRANSFERS_STORAGE_KEY, transfers);
    if (persisted) rebuildIndexes();
    return persisted;
  }

  function dispatchIntentEvent(intent, previousStatus = "") {
    window.dispatchEvent?.(new CustomEvent("ws:billing-intent-updated", {
      detail: {
        billingIntentId: intent.billingIntentId,
        citizenId: intent.citizenId,
        status: intent.status,
        previousStatus,
        sourceDomain: intent.sourceDomain,
        sourceRefId: intent.sourceRefId,
        correlationId: intent.correlationId,
        revision: intent.revision
      }
    }));
  }

  function dispatchTransactionEvent(transaction, previousStatus = "") {
    window.dispatchEvent?.(new CustomEvent("ws:billing-transaction-updated", {
      detail: {
        billingTransactionId: transaction.billingTransactionId,
        billingIntentId: transaction.billingIntentId,
        citizenId: transaction.citizenId,
        transactionType: transaction.transactionType,
        status: transaction.status,
        previousStatus,
        sourceDomain: transaction.sourceDomain,
        sourceRefId: transaction.sourceRefId,
        correlationId: transaction.correlationId,
        revision: transaction.revision
      }
    }));
  }

  function emitTerminalEvent(eventCode, subjectType, subjectId, record, options = {}) {
    if (options.notify === false || typeof window.TerminalNotifications?.emit !== "function") return false;
    const amountLabel = typeof window.WS_APP.formatCredits === "function"
      ? window.WS_APP.formatCredits(record.amount)
      : `${record.amount} ₡`;
    const result = window.TerminalNotifications.emit({
      eventCode,
      citizenId: record.citizenId,
      subjectRef: { type: subjectType, id: subjectId },
      correlationId: record.correlationId || record.sourceRefId || subjectId,
      revision: record.revision,
      title: options.title,
      summary: options.summary || `${record.descriptionCode || record.transactionType || "Payment"}: ${amountLabel}`,
      data: {
        amount: record.amount,
        currency: record.currency,
        paymentSource: record.paymentSource,
        sourceDomain: record.sourceDomain,
        sourceRefId: record.sourceRefId
      },
      createdBy: options.createdBy || "BILLING",
      audience: options.audience || ["PLAYER"]
    });
    return result?.ok === true;
  }

  function getCitizenAccount(citizenId) {
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || citizen.recordType === "admin") return null;
    const credits = normalizeSignedAmount(citizen.credits);
    const debt = normalizeSignedAmount(citizen.debt);
    const debtLimit = normalizeAmount(window.WS_APP.BILLING_DEBT_LIMIT || DEFAULT_DEBT_LIMIT);
    return { citizen, credits, debt, debtLimit };
  }

  function getReservedAmounts(citizenId, excludeIntentId = "") {
    return intents.reduce((result, intent) => {
      if (intent.citizenId !== citizenId || intent.billingIntentId === excludeIntentId) return result;
      if (!["AUTHORIZED", "PARTIALLY_CAPTURED"].includes(intent.status)) return result;
      const remaining = Math.max(0, intent.amount - intent.capturedAmount);
      if (intent.paymentSource === "CREDITS") result.credits += remaining;
      if (intent.paymentSource === "DEBT_ACCOUNT") result.debt += remaining;
      return result;
    }, { credits: 0, debt: 0 });
  }

  function getCitizenAvailableBalance(citizenId, options = {}) {
    const account = getCitizenAccount(citizenId);
    if (!account) return null;
    const reserved = getReservedAmounts(citizenId, String(options.excludeIntentId || "").trim());
    return {
      citizenId,
      credits: account.credits,
      reservedCredits: reserved.credits,
      availableCredits: Math.max(0, account.credits - reserved.credits),
      debt: account.debt,
      debtLimit: account.debtLimit,
      reservedDebtCapacity: reserved.debt,
      debtCapacity: Math.max(0, account.debtLimit - account.debt - reserved.debt)
    };
  }

  function normalizeAdminActorEnvelope(input = {}) {
    const actor = input.actor && typeof input.actor === "object" && !Array.isArray(input.actor)
      ? input.actor
      : {};
    const actorId = String(actor.actorId || actor.id || input.operatorId || "").trim();
    const actorRole = normalizeToken(actor.actorRole || actor.role, "");
    const source = normalizeToken(actor.source || input.source || "ADMIN_CONTROL", "ADMIN_CONTROL");
    const reason = String(input.reason || "").trim();
    const idempotencyKey = String(input.idempotencyKey || "").trim();

    if (!actorId) return { ok: false, error: { code: "ACTOR_REQUIRED" } };
    if (actorRole !== "ADMIN") return { ok: false, error: { code: "ADMIN_ROLE_REQUIRED" } };
    if (!reason) return { ok: false, error: { code: "REASON_REQUIRED" } };
    if (!idempotencyKey) return { ok: false, error: { code: "IDEMPOTENCY_KEY_REQUIRED" } };

    return {
      ok: true,
      actor: { actorId, actorRole, source },
      reason,
      idempotencyKey
    };
  }

  function getAdminBillingAdjustment(idOrKey = "") {
    const key = String(idOrKey || "").trim();
    if (!key) return null;
    const record = transactionById.get(key) || transactionByIdempotencyKey.get(key) || null;
    if (!record || record.transactionType !== "ADMIN_ADJUSTMENT") return null;
    return clone(record);
  }

  function previewAdminBillingAdjustment(input = {}) {
    const actorCheck = normalizeAdminActorEnvelope(input);
    if (!actorCheck.ok) return actorCheck;

    const citizenId = String(input.citizenId || "").trim();
    const target = normalizeToken(input.target, "");
    const mode = normalizeToken(input.mode, "");
    const rawAmount = normalizeSignedAmount(input.amount ?? input.delta);
    const account = getCitizenAccount(citizenId);

    if (!citizenId) return { ok: false, error: { code: "CITIZEN_ID_REQUIRED" } };
    if (!account) return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };
    if (!["CREDITS", "DEBT"].includes(target)) return { ok: false, error: { code: "ADMIN_ADJUSTMENT_TARGET_INVALID" } };
    if (!["SET", "CHANGE"].includes(mode)) return { ok: false, error: { code: "ADMIN_ADJUSTMENT_MODE_INVALID" } };
    if (mode === "SET" && rawAmount < 0) return { ok: false, error: { code: "ADMIN_ADJUSTMENT_NEGATIVE_SET" } };
    if (mode === "CHANGE" && rawAmount === 0) return { ok: false, error: { code: "ADMIN_ADJUSTMENT_ZERO_CHANGE" } };

    let creditsAfter = account.credits;
    let debtAfter = account.debt;
    if (target === "CREDITS" && mode === "SET") creditsAfter = rawAmount;
    if (target === "CREDITS" && mode === "CHANGE") creditsAfter = account.credits + rawAmount;
    if (target === "DEBT" && mode === "SET") debtAfter = rawAmount;
    if (target === "DEBT" && mode === "CHANGE") debtAfter = account.debt + rawAmount;

    if (creditsAfter < 0) return { ok: false, error: { code: "CREDITS_BELOW_ZERO" } };
    if (debtAfter < 0) return { ok: false, error: { code: "DEBT_BELOW_ZERO" } };

    const creditsDelta = normalizeSignedAmount(creditsAfter - account.credits);
    const debtDelta = normalizeSignedAmount(debtAfter - account.debt);
    if (creditsDelta === 0 && debtDelta === 0) return { ok: false, error: { code: "ADMIN_ADJUSTMENT_NO_CHANGE" } };

    return {
      ok: true,
      actor: actorCheck.actor,
      reason: actorCheck.reason,
      idempotencyKey: actorCheck.idempotencyKey,
      citizenId,
      target,
      mode,
      requestedAmount: rawAmount,
      accountEffect: { creditsDelta, debtDelta },
      accountSnapshot: {
        creditsBefore: account.credits,
        creditsAfter,
        debtBefore: account.debt,
        debtAfter
      }
    };
  }

  function applyAdminBillingAdjustment(input = {}) {
    const idempotencyKey = String(input.idempotencyKey || "").trim();
    const existing = idempotencyKey ? transactionByIdempotencyKey.get(idempotencyKey) : null;
    if (existing) {
      if (existing.transactionType !== "ADMIN_ADJUSTMENT") {
        return { ok: false, error: { code: "IDEMPOTENCY_KEY_CONFLICT" } };
      }
      return {
        ok: true,
        operation: "IDEMPOTENT_REPLAY",
        resultCode: "IDEMPOTENT_REPLAY",
        billingTransaction: clone(existing),
        account: clone(existing.accountSnapshot)
      };
    }

    const preview = previewAdminBillingAdjustment(input);
    if (!preview.ok) return preview;

    const adjustmentId = String(input.adjustmentId || makeId("admin_adjustment")).trim();
    const correlationId = String(input.correlationId || adjustmentId).trim();
    const sourceRefId = String(input.sourceRefId || adjustmentId).trim();
    const targetPatch = {};
    if (preview.accountEffect.creditsDelta !== 0) targetPatch.credits = preview.accountSnapshot.creditsAfter;
    if (preview.accountEffect.debtDelta !== 0) {
      targetPatch.debt = typeof window.WS_APP.formatCredits === "function"
        ? window.WS_APP.formatCredits(preview.accountSnapshot.debtAfter)
        : `${preview.accountSnapshot.debtAfter} ₡`;
    }

    const updatedCitizen = window.WS_APP.updateCitizen?.(preview.citizenId, targetPatch, {
      source: "BILLING_BRIDGE",
      skipModuleRefresh: true,
      skipProfileRefresh: true
    });
    if (!updatedCitizen) {
      return { ok: false, error: { code: "ACCOUNT_COMMIT_FAILED" }, recoveryRequired: false };
    }

    const transaction = normalizeTransaction({
      billingTransactionId: input.billingTransactionId,
      citizenId: preview.citizenId,
      transactionType: "ADMIN_ADJUSTMENT",
      status: "CAPTURED",
      amount: Math.abs(preview.accountEffect.creditsDelta || preview.accountEffect.debtDelta),
      currency: input.currency || DEFAULT_CURRENCY,
      paymentSource: "EXTERNAL",
      sourceDomain: "ADMIN",
      sourceRefId,
      idempotencyKey: preview.idempotencyKey,
      correlationId,
      externalCommit: false,
      accountEffect: preview.accountEffect,
      accountSnapshot: preview.accountSnapshot,
      metadata: {
        target: preview.target,
        mode: preview.mode,
        requestedAmount: preview.requestedAmount,
        reason: preview.reason,
        operatorId: preview.actor.actorId,
        actorRole: preview.actor.actorRole,
        actorSource: preview.actor.source,
        publicSender: String(input.publicSender || input.senderLabel || "ADMIN").trim(),
        visibility: normalizeToken(input.visibility, "ADMIN_CORRECTION"),
        ...(input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata) ? clone(input.metadata) : {})
      },
      createdAt: nowIso(),
      capturedAt: nowIso(),
      revision: 1
    });

    transactions.push(transaction);
    if (!persistTransactions()) {
      transactions = transactions.filter((record) => record.billingTransactionId !== transaction.billingTransactionId);
      rebuildIndexes();
      const rollbackPatch = {};
      if (preview.accountEffect.creditsDelta !== 0) rollbackPatch.credits = preview.accountSnapshot.creditsBefore;
      if (preview.accountEffect.debtDelta !== 0) {
        rollbackPatch.debt = typeof window.WS_APP.formatCredits === "function"
          ? window.WS_APP.formatCredits(preview.accountSnapshot.debtBefore)
          : `${preview.accountSnapshot.debtBefore} ₡`;
      }
      const rollbackCitizen = window.WS_APP.updateCitizen?.(preview.citizenId, rollbackPatch, {
        source: "BILLING_BRIDGE",
        skipModuleRefresh: true,
        skipProfileRefresh: true
      });
      if (!rollbackCitizen) {
        window.WS_APP.lastAdminBillingRecoveryError = {
          code: "ADMIN_BILLING_RECOVERY_REQUIRED",
          citizenId: preview.citizenId,
          billingTransactionId: transaction.billingTransactionId,
          idempotencyKey: preview.idempotencyKey,
          accountSnapshot: clone(preview.accountSnapshot)
        };
        return {
          ok: false,
          error: { code: "ADMIN_BILLING_RECOVERY_REQUIRED" },
          recoveryRequired: true,
          billingTransaction: clone(transaction)
        };
      }
      return { ok: false, error: { code: "TRANSACTION_PERSISTENCE_FAILED" }, recoveryRequired: false };
    }

    dispatchTransactionEvent(transaction, "");

    let historyEntry = null;
    if (input.recordHistory !== false && typeof window.WS_APP.addBillingHistoryEntry === "function") {
      const isCredits = preview.target === "CREDITS";
      historyEntry = window.WS_APP.addBillingHistoryEntry(preview.citizenId, {
        id: `billing-history-${transaction.billingTransactionId}`,
        type: normalizeToken(input.historyType, "ADMIN_ECONOMY_ADJUSTMENT"),
        title: String(input.historyTitle || `${preview.target}_${preview.mode}`).trim(),
        sourceLabel: String(input.publicSender || input.senderLabel || "ADMIN").trim(),
        sender: String(input.publicSender || input.senderLabel || "ADMIN").trim(),
        amount: isCredits ? preview.accountEffect.creditsDelta : preview.accountEffect.debtDelta,
        debtIncrease: preview.accountEffect.debtDelta > 0 ? preview.accountEffect.debtDelta : 0,
        debtRecovery: preview.accountEffect.debtDelta < 0 ? Math.abs(preview.accountEffect.debtDelta) : 0,
        creditsAfter: preview.accountSnapshot.creditsAfter,
        debtAfter: preview.accountSnapshot.debtAfter,
        note: preview.reason,
        billingTransactionId: transaction.billingTransactionId,
        sourceDomain: transaction.sourceDomain,
        sourceRefId: transaction.sourceRefId,
        correlationId: transaction.correlationId,
        idempotencyKey: transaction.idempotencyKey,
        revision: transaction.revision,
        createdBy: preview.actor.actorId,
        __skipBillingBridge: true
      });
    }

    return {
      ok: true,
      operation: "APPLIED",
      resultCode: "ADMIN_ADJUSTMENT_APPLIED",
      billingTransaction: clone(transaction),
      account: clone(transaction.accountSnapshot),
      citizen: clone(updatedCitizen),
      historyEntry: clone(historyEntry)
    };
  }


  function getTransferPartyLabel(party = {}) {
    const ref = normalizePartyRef(party);
    if (ref.partyType === "CITIZEN") {
      const citizen = window.WS_APP.getCitizenById?.(ref.partyId);
      return String(window.WS_APP.getCitizenDisplayName?.(citizen || {}, { legal: true }) || citizen?.legalName || citizen?.shortId || ref.partyId).trim();
    }
    if (ref.partyType === "ORGANIZATION") {
      const organization = window.WS_APP.getOrganizationById?.(ref.partyId);
      return String(organization?.name || organization?.shortName || ref.partyId).trim();
    }
    return ref.partyId || "UNKNOWN";
  }

  function getTransferAccountState(party = {}, options = {}) {
    const ref = normalizePartyRef(party);
    if (!ref.partyType || !ref.partyId) return null;
    if (ref.partyType === "CITIZEN") {
      const citizen = window.WS_APP.getCitizenById?.(ref.partyId);
      if (!citizen || citizen.recordType === "admin" || citizen.archived === true) return null;
      const account = getCitizenAccount(ref.partyId);
      if (!account) return null;
      return {
        ...ref,
        label: getTransferPartyLabel(ref),
        credits: account.credits,
        debt: account.debt,
        debtLimit: account.debtLimit,
        creditOverdraftAllowed: false,
        revision: Math.max(1, Number(citizen.revision || 1) || 1)
      };
    }
    if (ref.partyType === "ORGANIZATION") {
      const organization = window.WS_APP.getOrganizationById?.(ref.partyId);
      if (!organization || organization.archived === true) return null;
      let account = transferAccountById.get(ref.accountId) || null;
      if (!account && options.create === true) {
        account = normalizeTransferAccount({
          ...ref,
          credits: 0,
          debt: 0,
          creditOverdraftAllowed: true,
          metadata: { organizationName: organization.name || organization.shortName || ref.partyId }
        });
        transferAccounts.push(account);
        rebuildIndexes();
      }
      account ||= normalizeTransferAccount({ ...ref, credits: 0, debt: 0, creditOverdraftAllowed: true });
      return {
        ...ref,
        label: getTransferPartyLabel(ref),
        credits: account.credits,
        debt: account.debt,
        debtLimit: null,
        creditOverdraftAllowed: true,
        revision: account.revision
      };
    }
    return null;
  }

  function getBillingTransferAccount(partyTypeOrRef, partyId = "") {
    const ref = typeof partyTypeOrRef === "object"
      ? normalizePartyRef(partyTypeOrRef)
      : normalizePartyRef({ partyType: partyTypeOrRef, partyId });
    const account = getTransferAccountState(ref, { create: false });
    return account ? clone(account) : null;
  }

  function getBillingTransferAccounts(filters = {}) {
    const partyType = normalizeToken(filters.partyType, "");
    const records = [];
    (window.WS_APP.getCitizens?.({ includeArchived: false }) || []).forEach((citizen) => {
      if (!citizen || citizen.recordType === "admin") return;
      const account = getTransferAccountState({ partyType: "CITIZEN", partyId: citizen.id });
      if (account) records.push(account);
    });
    (window.WS_APP.getOrganizations?.({ includeArchived: false }) || []).forEach((organization) => {
      const account = getTransferAccountState({ partyType: "ORGANIZATION", partyId: organization.id });
      if (account) records.push(account);
    });
    return records
      .filter((record) => !partyType || record.partyType === partyType)
      .map(clone)
      .sort((a, b) => String(a.label).localeCompare(String(b.label), "pl", { sensitivity: "base" }));
  }

  function getAdminBillingTransfer(idOrKey = "") {
    const key = String(idOrKey || "").trim();
    if (!key) return null;
    const record = transferById.get(key) || transferByIdempotencyKey.get(key) || null;
    return record ? clone(record) : null;
  }

  function getAdminBillingTransfers(filters = {}) {
    const partyType = normalizeToken(filters.partyType, "");
    const partyId = String(filters.partyId || "").trim();
    const asset = normalizeToken(filters.asset, "");
    const status = normalizeToken(filters.status, "");
    return transfers
      .filter((record) => !asset || record.asset === asset)
      .filter((record) => !status || record.status === status)
      .filter((record) => !partyId || [record.sourceParty, record.targetParty].some((party) => party.partyId === partyId && (!partyType || party.partyType === partyType)))
      .map(clone)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function previewAdminBillingTransfer(input = {}) {
    const actorCheck = normalizeAdminActorEnvelope(input);
    if (!actorCheck.ok) return actorCheck;
    const sourceParty = normalizePartyRef(input.sourceParty || {
      partyType: input.sourcePartyType,
      partyId: input.sourcePartyId,
      citizenId: input.sourceCitizenId,
      organizationId: input.sourceOrganizationId
    });
    const targetParty = normalizePartyRef(input.targetParty || {
      partyType: input.targetPartyType,
      partyId: input.targetPartyId,
      citizenId: input.targetCitizenId,
      organizationId: input.targetOrganizationId
    });
    const asset = normalizeToken(input.asset, "CREDITS");
    const amount = normalizeAmount(input.amount);

    if (!sourceParty.partyType || !sourceParty.partyId) return { ok: false, error: { code: "TRANSFER_SOURCE_REQUIRED" } };
    if (!targetParty.partyType || !targetParty.partyId) return { ok: false, error: { code: "TRANSFER_TARGET_REQUIRED" } };
    if (!["CITIZEN", "ORGANIZATION"].includes(sourceParty.partyType)) return { ok: false, error: { code: "TRANSFER_SOURCE_TYPE_INVALID" } };
    if (!["CITIZEN", "ORGANIZATION"].includes(targetParty.partyType)) return { ok: false, error: { code: "TRANSFER_TARGET_TYPE_INVALID" } };
    if (sourceParty.accountId === targetParty.accountId) return { ok: false, error: { code: "TRANSFER_SAME_ACCOUNT" } };
    if (!["CREDITS", "DEBT"].includes(asset)) return { ok: false, error: { code: "TRANSFER_ASSET_INVALID" } };
    if (!(amount > 0)) return { ok: false, error: { code: "TRANSFER_AMOUNT_INVALID" } };

    const sourceAccount = getTransferAccountState(sourceParty, { create: false });
    const targetAccount = getTransferAccountState(targetParty, { create: false });
    if (!sourceAccount) return { ok: false, error: { code: "TRANSFER_SOURCE_NOT_FOUND" } };
    if (!targetAccount) return { ok: false, error: { code: "TRANSFER_TARGET_NOT_FOUND" } };

    const sourceAfter = { credits: sourceAccount.credits, debt: sourceAccount.debt };
    const targetAfter = { credits: targetAccount.credits, debt: targetAccount.debt };
    if (asset === "CREDITS") {
      sourceAfter.credits = normalizeSignedAmount(sourceAccount.credits - amount);
      targetAfter.credits = normalizeSignedAmount(targetAccount.credits + amount);
      if (!sourceAccount.creditOverdraftAllowed && sourceAfter.credits < 0) {
        return { ok: false, error: { code: "INSUFFICIENT_CREDITS" }, available: sourceAccount.credits, missing: normalizeAmount(amount - sourceAccount.credits) };
      }
    } else {
      sourceAfter.debt = normalizeSignedAmount(sourceAccount.debt - amount);
      targetAfter.debt = normalizeSignedAmount(targetAccount.debt + amount);
      if (sourceAfter.debt < 0) {
        return { ok: false, error: { code: "INSUFFICIENT_DEBT_BALANCE" }, available: sourceAccount.debt, missing: normalizeAmount(amount - sourceAccount.debt) };
      }
      if (targetAccount.partyType === "CITIZEN" && Number.isFinite(targetAccount.debtLimit) && targetAfter.debt > targetAccount.debtLimit) {
        return { ok: false, error: { code: "DEBT_LIMIT_EXCEEDED" }, debtLimit: targetAccount.debtLimit, requestedDebt: targetAfter.debt };
      }
    }

    return {
      ok: true,
      actor: actorCheck.actor,
      reason: actorCheck.reason,
      idempotencyKey: actorCheck.idempotencyKey,
      sourceParty,
      targetParty,
      sourceLabel: sourceAccount.label,
      targetLabel: targetAccount.label,
      asset,
      amount,
      sourceEffect: {
        creditsDelta: normalizeSignedAmount(sourceAfter.credits - sourceAccount.credits),
        debtDelta: normalizeSignedAmount(sourceAfter.debt - sourceAccount.debt)
      },
      targetEffect: {
        creditsDelta: normalizeSignedAmount(targetAfter.credits - targetAccount.credits),
        debtDelta: normalizeSignedAmount(targetAfter.debt - targetAccount.debt)
      },
      sourceAccountSnapshot: {
        creditsBefore: sourceAccount.credits,
        creditsAfter: sourceAfter.credits,
        debtBefore: sourceAccount.debt,
        debtAfter: sourceAfter.debt
      },
      targetAccountSnapshot: {
        creditsBefore: targetAccount.credits,
        creditsAfter: targetAfter.credits,
        debtBefore: targetAccount.debt,
        debtAfter: targetAfter.debt
      },
      sourceRevision: sourceAccount.revision,
      targetRevision: targetAccount.revision
    };
  }

  function commitTransferPartySnapshot(party, snapshot, expectedRevision = null) {
    const ref = normalizePartyRef(party);
    if (ref.partyType === "CITIZEN") {
      const current = getTransferAccountState(ref, { create: false });
      if (!current) return { ok: false, code: "TRANSFER_PARTY_NOT_FOUND" };
      if (expectedRevision != null && current.revision !== Number(expectedRevision)) return { ok: false, code: "TRANSFER_REVISION_CONFLICT" };
      if (normalizeSignedAmount(current.credits) !== normalizeSignedAmount(snapshot.creditsBefore) || normalizeSignedAmount(current.debt) !== normalizeSignedAmount(snapshot.debtBefore)) {
        return { ok: false, code: "TRANSFER_ACCOUNT_STATE_CONFLICT" };
      }
      const updated = window.WS_APP.updateCitizen?.(ref.partyId, {
        credits: normalizeSignedAmount(snapshot.creditsAfter),
        debt: typeof window.WS_APP.formatCredits === "function" ? window.WS_APP.formatCredits(snapshot.debtAfter) : `${snapshot.debtAfter} ₡`
      }, { source: "BILLING_TRANSFER", skipModuleRefresh: true, skipProfileRefresh: true });
      return updated ? { ok: true, record: clone(updated) } : { ok: false, code: "TRANSFER_ACCOUNT_COMMIT_FAILED" };
    }
    if (ref.partyType === "ORGANIZATION") {
      const current = getTransferAccountState(ref, { create: true });
      if (!current) return { ok: false, code: "TRANSFER_PARTY_NOT_FOUND" };
      if (expectedRevision != null && current.revision !== Number(expectedRevision)) return { ok: false, code: "TRANSFER_REVISION_CONFLICT" };
      if (normalizeSignedAmount(current.credits) !== normalizeSignedAmount(snapshot.creditsBefore) || normalizeSignedAmount(current.debt) !== normalizeSignedAmount(snapshot.debtBefore)) {
        return { ok: false, code: "TRANSFER_ACCOUNT_STATE_CONFLICT" };
      }
      const index = transferAccounts.findIndex((record) => record.accountId === ref.accountId);
      const next = normalizeTransferAccount({
        ...(index >= 0 ? transferAccounts[index] : ref),
        ...ref,
        credits: snapshot.creditsAfter,
        debt: snapshot.debtAfter,
        creditOverdraftAllowed: true,
        revision: current.revision + 1,
        updatedAt: nowIso()
      });
      if (index >= 0) transferAccounts.splice(index, 1, next);
      else transferAccounts.push(next);
      rebuildIndexes();
      return { ok: true, record: clone(next) };
    }
    return { ok: false, code: "TRANSFER_PARTY_TYPE_INVALID" };
  }

  function restoreTransferPartySnapshot(party, snapshot) {
    const ref = normalizePartyRef(party);
    if (ref.partyType === "CITIZEN") {
      const updated = window.WS_APP.updateCitizen?.(ref.partyId, {
        credits: normalizeSignedAmount(snapshot.creditsBefore),
        debt: typeof window.WS_APP.formatCredits === "function" ? window.WS_APP.formatCredits(snapshot.debtBefore) : `${snapshot.debtBefore} ₡`
      }, { source: "BILLING_TRANSFER_ROLLBACK", skipModuleRefresh: true, skipProfileRefresh: true });
      return !!updated;
    }
    if (ref.partyType === "ORGANIZATION") {
      const index = transferAccounts.findIndex((record) => record.accountId === ref.accountId);
      const current = index >= 0 ? transferAccounts[index] : null;
      const next = normalizeTransferAccount({
        ...(current || ref),
        ...ref,
        credits: snapshot.creditsBefore,
        debt: snapshot.debtBefore,
        creditOverdraftAllowed: true,
        revision: Math.max(1, Number(current?.revision || 1) + 1),
        updatedAt: nowIso()
      });
      if (index >= 0) transferAccounts.splice(index, 1, next);
      else transferAccounts.push(next);
      rebuildIndexes();
      return true;
    }
    return false;
  }

  function recordTransferHistory(preview, transfer, sourceTransaction, targetTransaction) {
    if (typeof window.WS_APP.addBillingHistoryEntry !== "function") return [];
    const entries = [];
    const add = (party, direction, transaction, snapshot, effect, counterpartyLabel) => {
      if (party.partyType !== "CITIZEN") return;
      const signedAmount = preview.asset === "CREDITS" ? effect.creditsDelta : effect.debtDelta;
      const entry = window.WS_APP.addBillingHistoryEntry(party.partyId, {
        id: `billing-history-${transaction.billingTransactionId}`,
        type: preview.asset === "CREDITS" ? `TRANSFER_${direction}` : `DEBT_TRANSFER_${direction}`,
        title: preview.asset === "CREDITS" ? "CREDITS_TRANSFER" : "DEBT_TRANSFER",
        amount: signedAmount,
        sourceLabel: counterpartyLabel,
        sender: direction === "IN" ? counterpartyLabel : getTransferPartyLabel(party),
        creditsAfter: snapshot.creditsAfter,
        debtAfter: snapshot.debtAfter,
        debtIncrease: effect.debtDelta > 0 ? effect.debtDelta : 0,
        debtRecovery: effect.debtDelta < 0 ? Math.abs(effect.debtDelta) : 0,
        note: preview.reason,
        billingTransactionId: transaction.billingTransactionId,
        billingTransferId: transfer.transferId,
        sourceDomain: transaction.sourceDomain,
        sourceRefId: transaction.sourceRefId,
        correlationId: transaction.correlationId,
        idempotencyKey: transaction.idempotencyKey,
        createdBy: preview.actor.actorId,
        __skipBillingBridge: true
      });
      if (entry) entries.push(entry);
    };
    add(preview.sourceParty, "OUT", sourceTransaction, preview.sourceAccountSnapshot, preview.sourceEffect, preview.targetLabel);
    add(preview.targetParty, "IN", targetTransaction, preview.targetAccountSnapshot, preview.targetEffect, preview.sourceLabel);
    return entries.map(clone);
  }

  function dispatchTransferEvent(transfer) {
    window.dispatchEvent?.(new CustomEvent("ws:billing-transfer-updated", {
      detail: {
        transferId: transfer.transferId,
        status: transfer.status,
        asset: transfer.asset,
        amount: transfer.amount,
        sourceParty: clone(transfer.sourceParty),
        targetParty: clone(transfer.targetParty),
        correlationId: transfer.correlationId,
        revision: transfer.revision
      }
    }));
  }

  function executeAdminBillingTransfer(input = {}) {
    const idempotencyKey = String(input.idempotencyKey || "").trim();
    const replay = idempotencyKey ? transferByIdempotencyKey.get(idempotencyKey) : null;
    if (replay) {
      return {
        ok: true,
        operation: "IDEMPOTENT_REPLAY",
        resultCode: "IDEMPOTENT_REPLAY",
        billingTransfer: clone(replay),
        sourceTransaction: getBillingTransaction(replay.sourceTransactionId),
        targetTransaction: getBillingTransaction(replay.targetTransactionId)
      };
    }

    const preview = previewAdminBillingTransfer(input);
    if (!preview.ok) return preview;
    const transferId = String(input.transferId || makeId("billing_transfer")).trim();
    const correlationId = String(input.correlationId || transferId).trim();
    const sourceTransactionId = String(input.sourceTransactionId || makeId("billing_tx")).trim();
    const targetTransactionId = String(input.targetTransactionId || makeId("billing_tx")).trim();
    const oldTransactions = transactions.map(clone);
    const oldTransferAccounts = transferAccounts.map(clone);
    const oldTransfers = transfers.map(clone);

    const sourceCommit = commitTransferPartySnapshot(preview.sourceParty, preview.sourceAccountSnapshot, input.sourceExpectedRevision ?? preview.sourceRevision);
    if (!sourceCommit.ok) return { ok: false, error: { code: sourceCommit.code || "TRANSFER_SOURCE_COMMIT_FAILED" } };
    const targetCommit = commitTransferPartySnapshot(preview.targetParty, preview.targetAccountSnapshot, input.targetExpectedRevision ?? preview.targetRevision);
    if (!targetCommit.ok) {
      const rollbackOk = restoreTransferPartySnapshot(preview.sourceParty, preview.sourceAccountSnapshot);
      if (!rollbackOk) {
        return { ok: false, error: { code: "ADMIN_TRANSFER_RECOVERY_REQUIRED" }, recoveryRequired: true };
      }
      return { ok: false, error: { code: targetCommit.code || "TRANSFER_TARGET_COMMIT_FAILED" } };
    }

    const transactionCommon = {
      billingIntentId: "",
      transactionType: "ADMIN_TRANSFER",
      status: "CAPTURED",
      amount: preview.amount,
      currency: input.currency || DEFAULT_CURRENCY,
      paymentSource: preview.asset === "CREDITS" ? "CREDITS" : "DEBT_ACCOUNT",
      sourceDomain: "ADMIN",
      sourceRefId: transferId,
      correlationId,
      externalCommit: false,
      createdAt: nowIso(),
      capturedAt: nowIso(),
      revision: 1
    };
    const sourceTransaction = normalizeTransaction({
      ...transactionCommon,
      billingTransactionId: sourceTransactionId,
      partyType: preview.sourceParty.partyType,
      partyId: preview.sourceParty.partyId,
      citizenId: preview.sourceParty.partyType === "CITIZEN" ? preview.sourceParty.partyId : "",
      organizationId: preview.sourceParty.partyType === "ORGANIZATION" ? preview.sourceParty.partyId : "",
      transactionType: "ADMIN_TRANSFER_DEBIT",
      idempotencyKey: `${preview.idempotencyKey}:source`,
      accountEffect: preview.sourceEffect,
      accountSnapshot: preview.sourceAccountSnapshot,
      metadata: {
        transferId,
        asset: preview.asset,
        direction: "OUT",
        counterparty: clone(preview.targetParty),
        reason: preview.reason,
        operatorId: preview.actor.actorId,
        actorRole: preview.actor.actorRole,
        actorSource: preview.actor.source
      }
    });
    const targetTransaction = normalizeTransaction({
      ...transactionCommon,
      billingTransactionId: targetTransactionId,
      partyType: preview.targetParty.partyType,
      partyId: preview.targetParty.partyId,
      citizenId: preview.targetParty.partyType === "CITIZEN" ? preview.targetParty.partyId : "",
      organizationId: preview.targetParty.partyType === "ORGANIZATION" ? preview.targetParty.partyId : "",
      transactionType: "ADMIN_TRANSFER_CREDIT",
      idempotencyKey: `${preview.idempotencyKey}:target`,
      accountEffect: preview.targetEffect,
      accountSnapshot: preview.targetAccountSnapshot,
      metadata: {
        transferId,
        asset: preview.asset,
        direction: "IN",
        counterparty: clone(preview.sourceParty),
        reason: preview.reason,
        operatorId: preview.actor.actorId,
        actorRole: preview.actor.actorRole,
        actorSource: preview.actor.source
      }
    });
    const transfer = normalizeTransfer({
      transferId,
      transferType: input.transferType || "ADMIN_TRANSFER",
      asset: preview.asset,
      amount: preview.amount,
      currency: input.currency || DEFAULT_CURRENCY,
      sourceParty: preview.sourceParty,
      targetParty: preview.targetParty,
      sourceTransactionId: sourceTransaction.billingTransactionId,
      targetTransactionId: targetTransaction.billingTransactionId,
      reversalOfTransferId: input.reversalOfTransferId || "",
      status: "CAPTURED",
      reason: preview.reason,
      actor: preview.actor,
      correlationId,
      idempotencyKey: preview.idempotencyKey,
      sourceAccountSnapshot: preview.sourceAccountSnapshot,
      targetAccountSnapshot: preview.targetAccountSnapshot,
      metadata: input.metadata,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      revision: 1
    });

    transactions.push(sourceTransaction, targetTransaction);
    transfers.push(transfer);
    const persisted = persistTransferAccounts() && persistTransactions() && persistTransfers();
    if (!persisted) {
      transactions = oldTransactions;
      transferAccounts = oldTransferAccounts;
      transfers = oldTransfers;
      rebuildIndexes();
      const sourceRollback = restoreTransferPartySnapshot(preview.sourceParty, preview.sourceAccountSnapshot);
      const targetRollback = restoreTransferPartySnapshot(preview.targetParty, preview.targetAccountSnapshot);
      const storageRollback = persistTransferAccounts() && persistTransactions() && persistTransfers();
      if (!sourceRollback || !targetRollback || !storageRollback) {
        window.WS_APP.lastAdminBillingTransferRecoveryError = {
          code: "ADMIN_TRANSFER_RECOVERY_REQUIRED",
          transferId,
          idempotencyKey: preview.idempotencyKey,
          sourceParty: clone(preview.sourceParty),
          targetParty: clone(preview.targetParty),
          sourceAccountSnapshot: clone(preview.sourceAccountSnapshot),
          targetAccountSnapshot: clone(preview.targetAccountSnapshot)
        };
        return { ok: false, error: { code: "ADMIN_TRANSFER_RECOVERY_REQUIRED" }, recoveryRequired: true, billingTransfer: clone(transfer) };
      }
      return { ok: false, error: { code: "TRANSFER_PERSISTENCE_FAILED" }, recoveryRequired: false };
    }

    dispatchTransactionEvent(sourceTransaction, "");
    dispatchTransactionEvent(targetTransaction, "");
    dispatchTransferEvent(transfer);
    const historyEntries = input.recordHistory === false ? [] : recordTransferHistory(preview, transfer, sourceTransaction, targetTransaction);
    return {
      ok: true,
      operation: "TRANSFERRED",
      resultCode: "ADMIN_TRANSFER_COMPLETED",
      billingTransfer: clone(transfer),
      sourceTransaction: clone(sourceTransaction),
      targetTransaction: clone(targetTransaction),
      sourceAccount: getBillingTransferAccount(preview.sourceParty),
      targetAccount: getBillingTransferAccount(preview.targetParty),
      historyEntries
    };
  }

  function retryAdminBillingTransfer(transferId, input = {}) {
    const existing = getAdminBillingTransfer(transferId);
    if (!existing) return { ok: false, error: { code: "TRANSFER_NOT_FOUND" } };
    if (existing.status === "CAPTURED" || existing.status === "REVERSED") {
      return { ok: true, operation: "IDEMPOTENT_REPLAY", resultCode: "IDEMPOTENT_REPLAY", billingTransfer: existing };
    }
    return executeAdminBillingTransfer({
      ...input,
      sourceParty: existing.sourceParty,
      targetParty: existing.targetParty,
      asset: existing.asset,
      amount: existing.amount,
      reason: input.reason || existing.reason,
      idempotencyKey: input.idempotencyKey || existing.idempotencyKey,
      correlationId: existing.correlationId || input.correlationId
    });
  }

  function reverseAdminBillingTransfer(transferId, input = {}) {
    const existing = getAdminBillingTransfer(transferId);
    if (!existing) return { ok: false, error: { code: "TRANSFER_NOT_FOUND" } };
    if (existing.reversedByTransferId) return { ok: false, error: { code: "TRANSFER_ALREADY_REVERSED" }, reversedByTransferId: existing.reversedByTransferId };
    const result = executeAdminBillingTransfer({
      ...input,
      sourceParty: existing.targetParty,
      targetParty: existing.sourceParty,
      asset: existing.asset,
      amount: existing.amount,
      transferType: "ADMIN_TRANSFER_REVERSAL",
      reversalOfTransferId: existing.transferId,
      correlationId: input.correlationId || `${existing.correlationId || existing.transferId}:reversal`,
      metadata: { ...(input.metadata || {}), reversalOfTransferId: existing.transferId }
    });
    if (!result.ok) return result;
    const index = transfers.findIndex((record) => record.transferId === existing.transferId);
    if (index >= 0) {
      transfers[index] = normalizeTransfer({
        ...transfers[index],
        status: "REVERSED",
        reversedByTransferId: result.billingTransfer.transferId,
        updatedAt: nowIso(),
        revision: Number(transfers[index].revision || 1) + 1
      });
      if (!persistTransfers()) {
        return { ok: false, error: { code: "TRANSFER_REVERSAL_LINK_PERSISTENCE_FAILED" }, recoveryRequired: true, billingTransfer: result.billingTransfer };
      }
    }
    return { ...result, resultCode: "ADMIN_TRANSFER_REVERSED", reversedTransfer: getAdminBillingTransfer(existing.transferId) };
  }

  function replaceIntent(nextIntent, previousStatus = "") {
    const index = intents.findIndex((record) => record.billingIntentId === nextIntent.billingIntentId);
    if (index < 0) intents.push(nextIntent);
    else intents.splice(index, 1, nextIntent);
    if (!persistIntents()) return false;
    dispatchIntentEvent(nextIntent, previousStatus);
    return true;
  }

  function replaceTransaction(nextTransaction, previousStatus = "") {
    const index = transactions.findIndex((record) => record.billingTransactionId === nextTransaction.billingTransactionId);
    if (index < 0) transactions.push(nextTransaction);
    else transactions.splice(index, 1, nextTransaction);
    if (!persistTransactions()) return false;
    dispatchTransactionEvent(nextTransaction, previousStatus);
    return true;
  }

  function failIntent(intent, code, message = "", options = {}) {
    const previousStatus = intent.status;
    const next = normalizeIntent({
      ...intent,
      status: options.recoveryRequired === true ? "PAYMENT_RECOVERY_REQUIRED" : "FAILED",
      failureCode: code,
      failureMessage: message,
      failedAt: nowIso(),
      updatedAt: nowIso(),
      revision: intent.revision + 1
    });
    replaceIntent(next, previousStatus);
    emitTerminalEvent(
      options.recoveryRequired === true ? "BILLING.PAYMENT_RECOVERY_REQUIRED" : "BILLING.PAYMENT.FAILED",
      options.recoveryRequired === true ? "WORLD_OPERATION" : "BILLING_INTENT",
      options.recoveryRequired === true ? (next.correlationId || next.billingIntentId) : next.billingIntentId,
      next,
      {
        ...options,
        title: options.recoveryRequired === true ? "Payment recovery required" : "Payment failed",
        summary: message || code
      }
    );
    return { ok: false, error: { code, message }, billingIntent: clone(next) };
  }

  function createBillingIntent(input = {}) {
    const citizenId = String(input.citizenId || "").trim();
    const sourceDomain = normalizeToken(input.sourceDomain, "");
    const sourceRefId = String(input.sourceRefId || "").trim();
    const idempotencyKey = String(input.idempotencyKey || "").trim();
    const amount = normalizeAmount(input.amount);

    if (!citizenId || !getCitizenAccount(citizenId)) return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };
    if (!sourceDomain) return { ok: false, error: { code: "SOURCE_DOMAIN_REQUIRED" } };
    if (!sourceRefId) return { ok: false, error: { code: "SOURCE_REF_REQUIRED" } };
    if (!idempotencyKey) return { ok: false, error: { code: "IDEMPOTENCY_KEY_REQUIRED" } };
    if (amount <= 0) return { ok: false, error: { code: "INVALID_AMOUNT" } };

    const existing = intentByIdempotencyKey.get(idempotencyKey);
    if (existing) {
      return { ok: true, operation: "IDEMPOTENT_REPLAY", billingIntent: clone(existing) };
    }

    const intent = normalizeIntent({
      billingIntentId: input.billingIntentId,
      citizenId,
      sourceDomain,
      sourceRefId,
      amount,
      currency: input.currency,
      descriptionCode: input.descriptionCode,
      paymentSource: input.paymentSource,
      coverageBreakdown: input.coverageBreakdown,
      status: "PENDING",
      idempotencyKey,
      correlationId: input.correlationId,
      providerId: input.providerId,
      organizationId: input.organizationId,
      metadata: input.metadata,
      createdAt: input.createdAt || nowIso(),
      updatedAt: input.createdAt || nowIso(),
      revision: 1
    });

    intents.push(intent);
    if (!persistIntents()) return { ok: false, error: { code: "PERSISTENCE_FAILED" } };
    dispatchIntentEvent(intent, "");
    return { ok: true, operation: "CREATED", billingIntent: clone(intent) };
  }

  function authorizeBillingIntent(intentId, options = {}) {
    const id = String(intentId || "").trim();
    const intent = intentById.get(id);
    if (!intent) return { ok: false, error: { code: "BILLING_INTENT_NOT_FOUND" } };
    if (["AUTHORIZED", "PARTIALLY_CAPTURED", "CAPTURED"].includes(intent.status)) {
      return { ok: true, operation: "IDEMPOTENT_REPLAY", billingIntent: clone(intent) };
    }
    if (intent.status !== "PENDING") return { ok: false, error: { code: "BILLING_INTENT_NOT_AUTHORIZABLE", status: intent.status } };

    const available = getCitizenAvailableBalance(intent.citizenId, { excludeIntentId: id });
    if (!available) return failIntent(intent, "CITIZEN_NOT_FOUND", "Citizen account is unavailable.", options);
    if (intent.paymentSource === "CREDITS" && available.availableCredits < intent.amount) {
      return failIntent(intent, "INSUFFICIENT_CREDITS", "Available credits are below the requested authorization.", options);
    }
    if (intent.paymentSource === "DEBT_ACCOUNT" && available.debtCapacity < intent.amount) {
      return failIntent(intent, "DEBT_LIMIT_EXCEEDED", "Debt Account capacity is below the requested authorization.", options);
    }

    const next = normalizeIntent({
      ...intent,
      status: "AUTHORIZED",
      authorizedAmount: intent.amount,
      authorizedAt: nowIso(),
      updatedAt: nowIso(),
      revision: intent.revision + 1
    });
    if (!replaceIntent(next, intent.status)) return { ok: false, error: { code: "PERSISTENCE_FAILED" } };
    emitTerminalEvent("BILLING.PAYMENT.AUTHORIZED", "BILLING_INTENT", next.billingIntentId, next, {
      ...options,
      title: "Payment authorized"
    });
    return { ok: true, operation: "AUTHORIZED", billingIntent: clone(next), availableBalance: available };
  }

  function writeCaptureHistory(transaction, intent, options = {}) {
    if (options.recordHistory === false || typeof window.WS_APP.addBillingHistoryEntry !== "function") return null;
    return window.WS_APP.addBillingHistoryEntry(transaction.citizenId, {
      id: `billing-history-${transaction.billingTransactionId}`,
      type: intent.descriptionCode || "PAYMENT",
      title: intent.descriptionCode || "Payment",
      amount: transaction.amount,
      paymentSource: transaction.paymentSource,
      paidFromCredits: transaction.paymentSource === "CREDITS" ? transaction.amount : 0,
      debtIncrease: transaction.paymentSource === "DEBT_ACCOUNT" ? transaction.amount : 0,
      creditsAfter: transaction.accountSnapshot.creditsAfter,
      debtAfter: transaction.accountSnapshot.debtAfter,
      note: String(options.note || "Billing intent captured.").trim(),
      billingIntentId: intent.billingIntentId,
      billingTransactionId: transaction.billingTransactionId,
      sourceDomain: intent.sourceDomain,
      sourceRefId: intent.sourceRefId,
      correlationId: intent.correlationId,
      idempotencyKey: transaction.idempotencyKey,
      revision: transaction.revision,
      createdBy: options.createdBy || "BILLING",
      __skipBillingBridge: true
    });
  }

  function captureBillingIntent(intentId, options = {}) {
    const id = String(intentId || "").trim();
    const intent = intentById.get(id);
    if (!intent) return { ok: false, error: { code: "BILLING_INTENT_NOT_FOUND" } };
    if (intent.status === "CAPTURED") {
      const existing = transactions.find((record) => record.billingIntentId === id && record.transactionType === "CAPTURE");
      return { ok: true, operation: "IDEMPOTENT_REPLAY", billingIntent: clone(intent), billingTransaction: existing ? clone(existing) : null };
    }
    if (!["AUTHORIZED", "PARTIALLY_CAPTURED"].includes(intent.status)) {
      return { ok: false, error: { code: "BILLING_INTENT_NOT_CAPTURABLE", status: intent.status } };
    }

    const remaining = Math.max(0, intent.amount - intent.capturedAmount);
    const requestedCapture = options.amount == null ? remaining : normalizeAmount(options.amount);
    if (requestedCapture <= 0 || requestedCapture > remaining) {
      return { ok: false, error: { code: "INVALID_CAPTURE_AMOUNT", remainingAmount: remaining } };
    }

    const captureIdempotencyKey = String(options.idempotencyKey || `${intent.idempotencyKey}:capture:${intent.capturedAmount + requestedCapture}`).trim();
    const existingTransaction = transactionByIdempotencyKey.get(captureIdempotencyKey);
    if (existingTransaction) {
      return { ok: true, operation: "IDEMPOTENT_REPLAY", billingIntent: clone(intentById.get(id) || intent), billingTransaction: clone(existingTransaction) };
    }

    const account = getCitizenAccount(intent.citizenId);
    if (!account) return failIntent(intent, "CITIZEN_NOT_FOUND", "Citizen account is unavailable.", options);

    let creditsAfter = account.credits;
    let debtAfter = account.debt;
    let creditsDelta = 0;
    let debtDelta = 0;

    if (intent.paymentSource === "CREDITS") {
      if (account.credits < requestedCapture) return failIntent(intent, "INSUFFICIENT_CREDITS", "Credits changed after authorization.", options);
      creditsAfter -= requestedCapture;
      creditsDelta = -requestedCapture;
    } else if (intent.paymentSource === "DEBT_ACCOUNT") {
      if (account.debt + requestedCapture > account.debtLimit) return failIntent(intent, "DEBT_LIMIT_EXCEEDED", "Debt Account capacity changed after authorization.", options);
      debtAfter += requestedCapture;
      debtDelta = requestedCapture;
    }

    const patch = {};
    if (creditsDelta !== 0) patch.credits = creditsAfter;
    if (debtDelta !== 0) patch.debt = typeof window.WS_APP.formatCredits === "function"
      ? window.WS_APP.formatCredits(debtAfter)
      : `${debtAfter} ₡`;

    if (Object.keys(patch).length) {
      const updatedCitizen = window.WS_APP.updateCitizen?.(intent.citizenId, patch, {
        source: "BILLING_BRIDGE",
        skipModuleRefresh: true,
        skipProfileRefresh: true
      });
      if (!updatedCitizen) {
        return failIntent(intent, "ACCOUNT_COMMIT_FAILED", "Citizen account mutation failed.", { ...options, recoveryRequired: true });
      }
    }

    const transaction = normalizeTransaction({
      billingIntentId: intent.billingIntentId,
      citizenId: intent.citizenId,
      transactionType: "CAPTURE",
      status: "CAPTURED",
      amount: requestedCapture,
      currency: intent.currency,
      paymentSource: intent.paymentSource,
      sourceDomain: intent.sourceDomain,
      sourceRefId: intent.sourceRefId,
      idempotencyKey: captureIdempotencyKey,
      correlationId: intent.correlationId,
      providerId: intent.providerId,
      organizationId: intent.organizationId,
      accountEffect: { creditsDelta, debtDelta },
      accountSnapshot: {
        creditsBefore: account.credits,
        creditsAfter,
        debtBefore: account.debt,
        debtAfter
      },
      metadata: options.metadata,
      createdAt: nowIso(),
      capturedAt: nowIso(),
      revision: 1
    });

    transactions.push(transaction);
    if (!persistTransactions()) {
      return failIntent(intent, "TRANSACTION_PERSISTENCE_FAILED", "Account changed but transaction record could not be persisted.", { ...options, recoveryRequired: true });
    }
    dispatchTransactionEvent(transaction, "");

    const capturedAmount = intent.capturedAmount + requestedCapture;
    const nextIntent = normalizeIntent({
      ...intent,
      status: capturedAmount >= intent.amount ? "CAPTURED" : "PARTIALLY_CAPTURED",
      capturedAmount,
      capturedAt: capturedAmount >= intent.amount ? nowIso() : intent.capturedAt,
      updatedAt: nowIso(),
      revision: intent.revision + 1
    });
    if (!replaceIntent(nextIntent, intent.status)) {
      return failIntent(intent, "INTENT_PERSISTENCE_FAILED", "Transaction committed but intent state could not be persisted.", { ...options, recoveryRequired: true });
    }

    writeCaptureHistory(transaction, nextIntent, options);
    emitTerminalEvent("BILLING.PAYMENT.CAPTURED", "BILLING_TRANSACTION", transaction.billingTransactionId, transaction, {
      ...options,
      title: "Payment captured"
    });

    return {
      ok: true,
      operation: nextIntent.status,
      billingIntent: clone(nextIntent),
      billingTransaction: clone(transaction),
      account: clone(transaction.accountSnapshot)
    };
  }

  function voidBillingIntent(intentId, options = {}) {
    const id = String(intentId || "").trim();
    const intent = intentById.get(id);
    if (!intent) return { ok: false, error: { code: "BILLING_INTENT_NOT_FOUND" } };
    if (intent.status === "VOIDED") return { ok: true, operation: "IDEMPOTENT_REPLAY", billingIntent: clone(intent) };
    if (!["PENDING", "AUTHORIZED"].includes(intent.status)) {
      return { ok: false, error: { code: "BILLING_INTENT_NOT_VOIDABLE", status: intent.status } };
    }
    const next = normalizeIntent({
      ...intent,
      status: "VOIDED",
      voidedAt: nowIso(),
      updatedAt: nowIso(),
      revision: intent.revision + 1,
      metadata: { ...intent.metadata, voidReason: String(options.reason || "").trim() }
    });
    if (!replaceIntent(next, intent.status)) return { ok: false, error: { code: "PERSISTENCE_FAILED" } };
    return { ok: true, operation: "VOIDED", billingIntent: clone(next) };
  }

  function refundBillingTransaction(transactionId, amount, options = {}) {
    const id = String(transactionId || "").trim();
    const original = transactionById.get(id);
    if (!original) return { ok: false, error: { code: "BILLING_TRANSACTION_NOT_FOUND" } };
    if (original.transactionType !== "CAPTURE" && original.externalCommit !== true) {
      return { ok: false, error: { code: "BILLING_TRANSACTION_NOT_REFUNDABLE" } };
    }

    const refundable = Math.max(0, original.amount - original.refundedAmount);
    const requested = amount == null ? refundable : normalizeAmount(amount);
    if (requested <= 0 || requested > refundable) {
      return { ok: false, error: { code: "INVALID_REFUND_AMOUNT", refundableAmount: refundable } };
    }

    const refundIdempotencyKey = String(options.idempotencyKey || `${original.idempotencyKey || original.billingTransactionId}:refund:${original.refundedAmount + requested}`).trim();
    const replay = transactionByIdempotencyKey.get(refundIdempotencyKey);
    if (replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", billingTransaction: clone(replay) };

    const account = getCitizenAccount(original.citizenId);
    if (!account) return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };

    let creditsAfter = account.credits;
    let debtAfter = account.debt;
    let creditsDelta = 0;
    let debtDelta = 0;

    if (original.paymentSource === "CREDITS") {
      creditsAfter += requested;
      creditsDelta = requested;
    } else if (original.paymentSource === "DEBT_ACCOUNT") {
      debtAfter = Math.max(0, debtAfter - requested);
      debtDelta = debtAfter - account.debt;
    }

    const patch = {};
    if (creditsDelta !== 0) patch.credits = creditsAfter;
    if (debtDelta !== 0) patch.debt = typeof window.WS_APP.formatCredits === "function"
      ? window.WS_APP.formatCredits(debtAfter)
      : `${debtAfter} ₡`;

    if (Object.keys(patch).length) {
      const updatedCitizen = window.WS_APP.updateCitizen?.(original.citizenId, patch, {
        source: "BILLING_BRIDGE",
        skipModuleRefresh: true,
        skipProfileRefresh: true
      });
      if (!updatedCitizen) return { ok: false, error: { code: "ACCOUNT_COMMIT_FAILED" } };
    }

    const refundTransaction = normalizeTransaction({
      billingIntentId: original.billingIntentId,
      parentTransactionId: original.billingTransactionId,
      citizenId: original.citizenId,
      transactionType: "REFUND",
      status: "CAPTURED",
      amount: requested,
      currency: original.currency,
      paymentSource: original.paymentSource,
      sourceDomain: original.sourceDomain,
      sourceRefId: original.sourceRefId,
      idempotencyKey: refundIdempotencyKey,
      correlationId: original.correlationId,
      providerId: original.providerId,
      organizationId: original.organizationId,
      accountEffect: { creditsDelta, debtDelta },
      accountSnapshot: {
        creditsBefore: account.credits,
        creditsAfter,
        debtBefore: account.debt,
        debtAfter
      },
      metadata: { reason: String(options.reason || "").trim(), ...clone(options.metadata || {}) },
      createdAt: nowIso(),
      capturedAt: nowIso(),
      revision: 1
    });

    transactions.push(refundTransaction);
    if (!persistTransactions()) return { ok: false, error: { code: "PERSISTENCE_FAILED" } };
    dispatchTransactionEvent(refundTransaction, "");

    const totalRefunded = original.refundedAmount + requested;
    const nextOriginal = normalizeTransaction({
      ...original,
      refundedAmount: totalRefunded,
      status: totalRefunded >= original.amount ? "REFUNDED" : "PARTIALLY_REFUNDED",
      refundedAt: nowIso(),
      revision: original.revision + 1
    });
    replaceTransaction(nextOriginal, original.status);

    if (options.recordHistory !== false && typeof window.WS_APP.addBillingHistoryEntry === "function") {
      window.WS_APP.addBillingHistoryEntry(original.citizenId, {
        id: `billing-history-${refundTransaction.billingTransactionId}`,
        type: "REFUND",
        title: "Payment refund",
        amount: requested,
        paymentSource: original.paymentSource,
        creditsAfter,
        debtAfter,
        note: String(options.reason || "Billing transaction refunded.").trim(),
        billingIntentId: original.billingIntentId,
        billingTransactionId: refundTransaction.billingTransactionId,
        sourceDomain: original.sourceDomain,
        sourceRefId: original.sourceRefId,
        correlationId: original.correlationId,
        idempotencyKey: refundIdempotencyKey,
        revision: refundTransaction.revision,
        createdBy: options.createdBy || "BILLING",
        __skipBillingBridge: true
      });
    }

    emitTerminalEvent("BILLING.PAYMENT.REFUNDED", "BILLING_TRANSACTION", refundTransaction.billingTransactionId, refundTransaction, {
      ...options,
      title: "Payment refunded"
    });

    return {
      ok: true,
      operation: nextOriginal.status,
      billingTransaction: clone(refundTransaction),
      originalTransaction: clone(nextOriginal),
      account: clone(refundTransaction.accountSnapshot)
    };
  }

  function createAndCaptureBillingIntent(input = {}, options = {}) {
    const created = createBillingIntent(input);
    if (!created.ok) return created;
    const intent = created.billingIntent;
    if (intent.status === "CAPTURED") {
      return { ok: true, operation: "IDEMPOTENT_REPLAY", billingIntent: intent };
    }
    const authorized = authorizeBillingIntent(intent.billingIntentId, options);
    if (!authorized.ok) return authorized;
    return captureBillingIntent(intent.billingIntentId, options);
  }

  function recordCommittedBillingTransaction(input = {}) {
    const citizenId = String(input.citizenId || "").trim();
    const idempotencyKey = String(input.idempotencyKey || "").trim();
    const sourceDomain = normalizeToken(input.sourceDomain, "BILLING");
    const sourceRefId = String(input.sourceRefId || "").trim();
    if (!citizenId) return { ok: false, error: { code: "CITIZEN_ID_REQUIRED" } };
    if (!idempotencyKey) return { ok: false, error: { code: "IDEMPOTENCY_KEY_REQUIRED" } };
    const existing = transactionByIdempotencyKey.get(idempotencyKey);
    if (existing) return { ok: true, operation: "IDEMPOTENT_REPLAY", billingTransaction: clone(existing) };

    const transaction = normalizeTransaction({
      billingTransactionId: input.billingTransactionId,
      billingIntentId: input.billingIntentId,
      parentTransactionId: input.parentTransactionId,
      citizenId,
      transactionType: input.transactionType || "LEGACY_COMMIT",
      status: input.status || "CAPTURED",
      amount: input.amount,
      refundedAmount: input.refundedAmount,
      currency: input.currency,
      paymentSource: input.paymentSource || "EXTERNAL",
      sourceDomain,
      sourceRefId,
      idempotencyKey,
      correlationId: input.correlationId,
      providerId: input.providerId,
      organizationId: input.organizationId,
      externalCommit: true,
      accountEffect: input.accountEffect,
      accountSnapshot: input.accountSnapshot,
      metadata: input.metadata,
      createdAt: input.createdAt || nowIso(),
      capturedAt: input.capturedAt || input.createdAt || nowIso(),
      revision: input.revision || 1
    });

    transactions.push(transaction);
    if (!persistTransactions()) return { ok: false, error: { code: "PERSISTENCE_FAILED" } };
    dispatchTransactionEvent(transaction, "");
    if (input.notify === true) {
      emitTerminalEvent("BILLING.PAYMENT.CAPTURED", "BILLING_TRANSACTION", transaction.billingTransactionId, transaction, {
        notify: true,
        title: input.title || "Payment recorded",
        summary: input.summary,
        createdBy: input.createdBy
      });
    }
    return { ok: true, operation: "RECORDED", billingTransaction: clone(transaction) };
  }

  function adminAdjustCitizenAccount(input = {}, actor = window.WS_APP.currentUser) {
    const actorRole = String(actor?.role || "").trim().toLowerCase();
    const actorId = String(actor?.id || actor?.login || "").trim();
    const creditsDelta = normalizeSignedAmount(input.creditsDelta);
    const debtDelta = normalizeSignedAmount(input.debtDelta);

    if (actorRole !== "admin") return { ok: false, error: { code: "ADMIN_REQUIRED" } };
    if (!actorId) return { ok: false, error: { code: "ACTOR_ID_REQUIRED" } };
    if (creditsDelta === 0 && debtDelta === 0) return { ok: false, error: { code: "NO_ACCOUNT_CHANGE" } };
    if (creditsDelta !== 0 && debtDelta !== 0) {
      return { ok: false, error: { code: "MULTI_TARGET_ADMIN_ADJUSTMENT_NOT_SUPPORTED" } };
    }

    const target = creditsDelta !== 0 ? "CREDITS" : "DEBT";
    const amount = creditsDelta !== 0 ? creditsDelta : debtDelta;
    return applyAdminBillingAdjustment({
      ...input,
      target,
      mode: "CHANGE",
      amount,
      actor: {
        actorId,
        actorRole: "ADMIN",
        source: String(input.source || "CITIZEN_RECORD").trim().toUpperCase()
      },
      publicSender: String(input.metadata?.senderLabel || actor?.login || actorId).trim(),
      visibility: String(input.metadata?.visibility || "ADMIN_CORRECTION").trim().toUpperCase(),
      historyType: "ADMIN_ECONOMY_ADJUSTMENT",
      historyTitle: String(input.title || `${target}_CHANGE`).trim()
    });
  }

  function mapLegacyHistoryToTransaction(entry = {}) {
    const type = normalizeToken(entry.type, "MANUAL");
    const amount = normalizeAmount(entry.amount || entry.income || entry.subscriptionCharge || entry.debtPayment || entry.debtIncrease || entry.debtRecovery);
    const sourceDomain = type.includes("SUBSCRIPTION") ? "SUBSCRIPTION"
      : type.includes("SERVICE") || type === "INCOME" ? "SERVICE"
        : type.includes("SETTLEMENT") ? "SETTLEMENT"
          : "BILLING";

    let creditsDelta = 0;
    let debtDelta = 0;
    if (["TRANSFER_OUT", "DEBT_PAYMENT", "DEBT_RECOVERY"].includes(type)) creditsDelta = -normalizeAmount(entry.paidFromCredits || entry.debtPayment || entry.debtRecovery || entry.amount);
    if (["TRANSFER_IN", "INCOME", "CREDITS_ADJUSTMENT", "CREDITS_TRANSFER"].includes(type)) creditsDelta = normalizeAmount(entry.income || entry.amount);
    if (type === "SUBSCRIPTION_BILLING") creditsDelta = -normalizeAmount(entry.paidFromCredits);
    if (["DEBT_INCREASE", "DEBT_ACCOUNT_CHARGE"].includes(type)) debtDelta = normalizeAmount(entry.debtIncrease || entry.amount);
    if (type === "SUBSCRIPTION_BILLING") debtDelta = normalizeAmount(entry.debtIncrease);
    if (["DEBT_PAYMENT", "DEBT_RECOVERY"].includes(type)) debtDelta = -normalizeAmount(entry.debtPayment || entry.debtRecovery || entry.amount);

    const creditsAfter = normalizeSignedAmount(entry.creditsAfter);
    const debtAfter = normalizeSignedAmount(entry.debtAfter);
    return {
      citizenId: String(entry.citizenId || "").trim(),
      billingIntentId: String(entry.billingIntentId || "").trim(),
      billingTransactionId: String(entry.billingTransactionId || "").trim(),
      transactionType: type === "WEEKLY_SETTLEMENT" ? "SETTLEMENT_SUMMARY" : type,
      amount,
      paymentSource: normalizeToken(entry.paymentSource, type.includes("DEBT") ? "DEBT_ACCOUNT" : "EXTERNAL"),
      sourceDomain: entry.sourceDomain || sourceDomain,
      sourceRefId: entry.sourceRefId || entry.id,
      idempotencyKey: entry.idempotencyKey || `billing-history:${entry.id}`,
      correlationId: entry.correlationId || "",
      accountEffect: type === "WEEKLY_SETTLEMENT" ? { creditsDelta: 0, debtDelta: 0 } : { creditsDelta, debtDelta },
      accountSnapshot: {
        creditsBefore: creditsAfter - creditsDelta,
        creditsAfter,
        debtBefore: debtAfter - debtDelta,
        debtAfter
      },
      createdAt: entry.createdAt || (entry.date ? `${entry.date}T00:00:00.000Z` : nowIso()),
      revision: entry.revision || 1,
      metadata: {
        legacyHistoryId: entry.id,
        title: entry.title || "",
        note: entry.note || "",
        counterpartyCitizenId: entry.counterpartyCitizenId || "",
        income: normalizeAmount(entry.income),
        subscriptionCharge: normalizeAmount(entry.subscriptionCharge),
        paidFromCredits: normalizeAmount(entry.paidFromCredits),
        debtIncrease: normalizeAmount(entry.debtIncrease),
        debtRecovery: normalizeAmount(entry.debtRecovery)
      }
    };
  }

  function recordLegacyBillingHistoryEntry(entry = {}) {
    if (!entry?.id || !entry?.citizenId) return { ok: false, error: { code: "LEGACY_HISTORY_INVALID" } };
    if (entry.billingTransactionId && transactionById.has(entry.billingTransactionId)) {
      return { ok: true, operation: "IDEMPOTENT_REPLAY", billingTransaction: clone(transactionById.get(entry.billingTransactionId)) };
    }
    return recordCommittedBillingTransaction(mapLegacyHistoryToTransaction(entry));
  }

  function backfillBillingTransactionsFromHistory(history) {
    if (legacyBackfillActive) return { ok: true, count: 0 };
    legacyBackfillActive = true;
    let count = 0;
    const added = [];
    try {
      (Array.isArray(history) ? history : []).forEach((entry) => {
        if (!entry?.id || !entry?.citizenId) return;
        if (entry.billingTransactionId && transactionById.has(entry.billingTransactionId)) return;
        const input = mapLegacyHistoryToTransaction(entry);
        if (!input.idempotencyKey || transactionByIdempotencyKey.has(input.idempotencyKey)) return;
        const transaction = normalizeTransaction({
          ...input,
          externalCommit: true,
          status: "CAPTURED"
        });
        transactions.push(transaction);
        transactionById.set(transaction.billingTransactionId, transaction);
        transactionByIdempotencyKey.set(transaction.idempotencyKey, transaction);
        added.push(transaction);
        count += 1;
      });
      if (count > 0) {
        persistTransactions();
        added.forEach((transaction) => dispatchTransactionEvent(transaction, ""));
      }
    } finally {
      legacyBackfillActive = false;
    }
    return { ok: true, count };
  }

  function getBillingIntent(intentId) {
    const record = intentById.get(String(intentId || "").trim());
    return record ? clone(record) : null;
  }

  function getBillingTransaction(transactionId) {
    const record = transactionById.get(String(transactionId || "").trim());
    return record ? clone(record) : null;
  }

  function getBillingIntents(filters = {}) {
    const citizenId = String(filters.citizenId || "").trim();
    const sourceDomain = normalizeToken(filters.sourceDomain, "");
    const status = normalizeToken(filters.status, "");
    return intents
      .filter((record) => !citizenId || record.citizenId === citizenId)
      .filter((record) => !sourceDomain || record.sourceDomain === sourceDomain)
      .filter((record) => !status || record.status === status)
      .map(clone)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function getBillingTransactions(filters = {}) {
    const citizenId = String(filters.citizenId || "").trim();
    const organizationId = String(filters.organizationId || "").trim();
    const partyType = normalizeToken(filters.partyType, "");
    const partyId = String(filters.partyId || "").trim();
    const sourceDomain = normalizeToken(filters.sourceDomain, "");
    const status = normalizeToken(filters.status, "");
    return transactions
      .filter((record) => !citizenId || record.citizenId === citizenId)
      .filter((record) => !organizationId || record.organizationId === organizationId)
      .filter((record) => !partyType || record.partyType === partyType)
      .filter((record) => !partyId || record.partyId === partyId)
      .filter((record) => !sourceDomain || record.sourceDomain === sourceDomain)
      .filter((record) => !status || record.status === status)
      .map(clone)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function importBillingIntents(records) {
    if (!Array.isArray(records)) return null;
    const next = [];
    const seenIds = new Set();
    const seenKeys = new Set();
    records.forEach((record) => {
      const normalized = normalizeIntent(record);
      if (!normalized.billingIntentId || !normalized.citizenId || !normalized.idempotencyKey) return;
      if (seenIds.has(normalized.billingIntentId) || seenKeys.has(normalized.idempotencyKey)) return;
      seenIds.add(normalized.billingIntentId);
      seenKeys.add(normalized.idempotencyKey);
      next.push(normalized);
    });
    intents = next;
    persistIntents();
    return getBillingIntents();
  }

  function importBillingTransactions(records) {
    if (!Array.isArray(records)) return null;
    const next = [];
    const seenIds = new Set();
    const seenKeys = new Set();
    records.forEach((record) => {
      const normalized = normalizeTransaction(record);
      if (!normalized.billingTransactionId || !(normalized.citizenId || normalized.organizationId || normalized.partyId) || !normalized.idempotencyKey) return;
      if (seenIds.has(normalized.billingTransactionId) || seenKeys.has(normalized.idempotencyKey)) return;
      seenIds.add(normalized.billingTransactionId);
      seenKeys.add(normalized.idempotencyKey);
      next.push(normalized);
    });
    transactions = next;
    persistTransactions();
    return getBillingTransactions();
  }


  function importBillingTransferAccounts(records) {
    if (!Array.isArray(records)) return null;
    const next = [];
    const seen = new Set();
    records.forEach((record) => {
      const normalized = normalizeTransferAccount(record);
      if (!normalized.accountId || normalized.partyType !== "ORGANIZATION" || !normalized.partyId || seen.has(normalized.accountId)) return;
      seen.add(normalized.accountId);
      next.push(normalized);
    });
    transferAccounts = next;
    persistTransferAccounts();
    return getBillingTransferAccounts({ partyType: "ORGANIZATION" });
  }

  function importAdminBillingTransfers(records) {
    if (!Array.isArray(records)) return null;
    const next = [];
    const seenIds = new Set();
    const seenKeys = new Set();
    records.forEach((record) => {
      const normalized = normalizeTransfer(record);
      if (!normalized.transferId || !normalized.idempotencyKey || !normalized.sourceParty.accountId || !normalized.targetParty.accountId) return;
      if (seenIds.has(normalized.transferId) || seenKeys.has(normalized.idempotencyKey)) return;
      seenIds.add(normalized.transferId);
      seenKeys.add(normalized.idempotencyKey);
      next.push(normalized);
    });
    transfers = next;
    persistTransfers();
    return getAdminBillingTransfers();
  }

  function exportBillingRuntimeData() {
    return {
      schemaVersion: 2,
      schema: SCHEMA_VERSION,
      billingIntents: getBillingIntents(),
      billingTransactions: getBillingTransactions(),
      billingTransferAccounts: transferAccounts.map(clone),
      billingTransfers: getAdminBillingTransfers()
    };
  }

  function validateBillingStore() {
    const errors = [];
    const seenIntentIds = new Set();
    const seenIntentKeys = new Set();
    const seenTransactionIds = new Set();
    const seenTransactionKeys = new Set();

    intents.forEach((record) => {
      if (seenIntentIds.has(record.billingIntentId)) errors.push({ code: "DUPLICATE_BILLING_INTENT_ID", id: record.billingIntentId });
      if (seenIntentKeys.has(record.idempotencyKey)) errors.push({ code: "DUPLICATE_BILLING_INTENT_IDEMPOTENCY", idempotencyKey: record.idempotencyKey });
      seenIntentIds.add(record.billingIntentId);
      seenIntentKeys.add(record.idempotencyKey);
      if (!record.citizenId) errors.push({ code: "BILLING_INTENT_CITIZEN_REQUIRED", id: record.billingIntentId });
      if (!record.sourceDomain || !record.sourceRefId) errors.push({ code: "BILLING_INTENT_SOURCE_REQUIRED", id: record.billingIntentId });
    });

    transactions.forEach((record) => {
      if (seenTransactionIds.has(record.billingTransactionId)) errors.push({ code: "DUPLICATE_BILLING_TRANSACTION_ID", id: record.billingTransactionId });
      if (seenTransactionKeys.has(record.idempotencyKey)) errors.push({ code: "DUPLICATE_BILLING_TRANSACTION_IDEMPOTENCY", idempotencyKey: record.idempotencyKey });
      seenTransactionIds.add(record.billingTransactionId);
      seenTransactionKeys.add(record.idempotencyKey);
      if (!(record.citizenId || record.organizationId || record.partyId)) errors.push({ code: "BILLING_TRANSACTION_PARTY_REQUIRED", id: record.billingTransactionId });
    });

    const seenTransferIds = new Set();
    const seenTransferKeys = new Set();
    transfers.forEach((record) => {
      if (seenTransferIds.has(record.transferId)) errors.push({ code: "DUPLICATE_BILLING_TRANSFER_ID", id: record.transferId });
      if (seenTransferKeys.has(record.idempotencyKey)) errors.push({ code: "DUPLICATE_BILLING_TRANSFER_IDEMPOTENCY", idempotencyKey: record.idempotencyKey });
      seenTransferIds.add(record.transferId);
      seenTransferKeys.add(record.idempotencyKey);
      if (!record.sourceParty?.accountId || !record.targetParty?.accountId) errors.push({ code: "BILLING_TRANSFER_PARTIES_REQUIRED", id: record.transferId });
      if (!(record.amount > 0)) errors.push({ code: "BILLING_TRANSFER_AMOUNT_INVALID", id: record.transferId });
      if (!record.sourceTransactionId || !record.targetTransactionId) errors.push({ code: "BILLING_TRANSFER_TRANSACTIONS_REQUIRED", id: record.transferId });
    });

    return {
      ok: errors.length === 0,
      counts: { intents: intents.length, transactions: transactions.length, transferAccounts: transferAccounts.length, transfers: transfers.length, errors: errors.length },
      errors
    };
  }

  function init() {
    if (initialized) return;
    initialized = true;
    intents = readStoredArray(INTENTS_STORAGE_KEY).map(normalizeIntent);
    transactions = readStoredArray(TRANSACTIONS_STORAGE_KEY).map(normalizeTransaction);
    transferAccounts = readStoredArray(TRANSFER_ACCOUNTS_STORAGE_KEY).map(normalizeTransferAccount).filter((record) => record.accountId && record.partyType === "ORGANIZATION");
    transfers = readStoredArray(TRANSFERS_STORAGE_KEY).map(normalizeTransfer);
    rebuildIndexes();
    try {
      window.localStorage?.setItem(SCHEMA_STORAGE_KEY, SCHEMA_VERSION);
    } catch (error) {
      console.warn("W&S Billing Store schema marker could not be persisted.", error);
    }

    const history = window.WS_APP.getBillingHistory?.() || [];
    backfillBillingTransactionsFromHistory(history);
  }

  const api = {
    schemaVersion: 2,
    schema: SCHEMA_VERSION,
    createBillingIntent,
    authorizeBillingIntent,
    captureBillingIntent,
    voidBillingIntent,
    refundBillingTransaction,
    createAndCaptureBillingIntent,
    recordCommittedBillingTransaction,
    adminAdjustCitizenAccount,
    recordLegacyBillingHistoryEntry,
    backfillBillingTransactionsFromHistory,
    getBillingIntent,
    getBillingTransaction,
    getBillingIntents,
    getBillingTransactions,
    getCitizenAvailableBalance,
    previewAdminBillingAdjustment,
    applyAdminBillingAdjustment,
    getAdminBillingAdjustment,
    previewAdminBillingTransfer,
    executeAdminBillingTransfer,
    retryAdminBillingTransfer,
    reverseAdminBillingTransfer,
    getAdminBillingTransfer,
    getAdminBillingTransfers,
    getBillingTransferAccount,
    getBillingTransferAccounts,
    importBillingIntents,
    importBillingTransactions,
    importBillingTransferAccounts,
    importAdminBillingTransfers,
    exportBillingRuntimeData,
    validateBillingStore
  };

  window.WS_APP.billingStore = api;
  Object.assign(window.WS_APP, api);

  window.addEventListener?.("ws:billing-history-updated", (event) => {
    const history = Array.isArray(event?.detail?.history) ? event.detail.history : [];
    backfillBillingTransactionsFromHistory(history);
  });

  init();
})();
