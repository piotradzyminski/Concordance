window.WS_APP = window.WS_APP || {};

(function initAdminOperationsCommand(app) {
  "use strict";

  if (app.AdminOperationsCommand) return;

  const ACTIONS = Object.freeze({
    RETRY: "RETRY",
    RECONCILE: "RECONCILE",
    CLAIM: "CLAIM",
    RELEASE_CLAIM: "RELEASE_CLAIM"
  });
  const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "CANCELLED"]);
  const RECOVERY_STATUSES = new Set(["RECOVERY_REQUIRED", "PAYMENT_RECOVERY_REQUIRED", "COMPENSATION_REQUIRED"]);

  function clone(value) {
    if (value == null) return value;
    if (typeof structuredClone === "function") {
      try { return structuredClone(value); } catch (error) {}
    }
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeString(value = "") {
    return String(value ?? "").trim();
  }

  function normalizeToken(value = "") {
    return normalizeString(value).toUpperCase().replace(/[\s-]+/g, "_");
  }

  function normalizeActor(actor = {}) {
    const current = app.currentUser || {};
    return {
      actorId: normalizeString(actor.actorId || actor.id || actor.login || current.id || current.login),
      actorRole: normalizeToken(actor.actorRole || actor.role || current.role),
      displayName: normalizeString(actor.displayName || actor.name || actor.login || current.displayName || current.login || "ADMIN")
    };
  }

  function normalizeClaims(values = []) {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
      .map((claim) => {
        if (typeof claim === "string") {
          const [resourceType, ...rest] = claim.split(":");
          return { resourceType: normalizeToken(resourceType), resourceId: normalizeString(rest.join(":")) };
        }
        const source = claim && typeof claim === "object" && !Array.isArray(claim) ? claim : {};
        return {
          resourceType: normalizeToken(source.resourceType || source.type),
          resourceId: normalizeString(source.resourceId || source.id)
        };
      })
      .filter((claim) => claim.resourceType && claim.resourceId)
      .filter((claim) => {
        const key = `${claim.resourceType}:${claim.resourceId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function actionCommand(action = "") {
    return `ADMIN_WORLD_BRIDGE_${normalizeToken(action) || "ACTION"}`;
  }

  function collectDomainRefs(operation = {}) {
    const refs = operation.refs || {};
    return {
      operationId: normalizeString(operation.operationId),
      marketOrderId: normalizeString(refs.marketOrderId),
      serviceOrderId: normalizeString(refs.serviceOrderId),
      billingIntentId: normalizeString(refs.billingIntentId),
      billingTransactionId: normalizeString(refs.billingTransactionId),
      itemTransactionId: normalizeString(refs.itemTransactionId),
      instanceIds: Array.isArray(refs.instanceIds) ? refs.instanceIds.map(normalizeString).filter(Boolean) : [],
      housingReservationIds: Array.isArray(refs.housingReservationIds) ? refs.housingReservationIds.map(normalizeString).filter(Boolean) : [],
      marketStockReservationIds: Array.isArray(refs.marketStockReservationIds) ? refs.marketStockReservationIds.map(normalizeString).filter(Boolean) : []
    };
  }

  function findAuditReplay(action, operationId, idempotencyKey) {
    const key = normalizeString(idempotencyKey);
    if (!key || typeof app.getAdminAuditEvents !== "function") return { replay: null, conflict: null };
    const events = app.getAdminAuditEvents({ category: "WORLD_BRIDGE" }) || [];
    const matching = events.find((event) => normalizeString(event.request?.idempotencyKey) === key) || null;
    if (!matching) return { replay: null, conflict: null };
    const expectedCommand = actionCommand(action);
    const targetMatches = (matching.targetRefs || []).some((ref) => normalizeToken(ref.type) === "WORLD_BRIDGE" && normalizeString(ref.id) === normalizeString(operationId));
    if (matching.sourceCommand !== expectedCommand || !targetMatches) return { replay: null, conflict: matching };
    return { replay: matching, conflict: null };
  }

  function getAdminWorldBridgeOperationActionAvailability(operationOrId = "") {
    const operation = typeof operationOrId === "object" && operationOrId
      ? clone(operationOrId)
      : app.getWorldBridgeOperation?.(operationOrId);
    if (!operation) {
      return {
        ok: false,
        resultCode: "WORLD_BRIDGE_OPERATION_NOT_FOUND",
        operation: null,
        actions: {}
      };
    }

    const terminal = TERMINAL_STATUSES.has(normalizeToken(operation.status));
    const recoveryRequired = operation.recovery?.required === true || RECOVERY_STATUSES.has(normalizeToken(operation.status));
    const retryLimitReached = Number(operation.retry?.count || 0) >= Number(operation.retry?.maxAttempts || 5);
    const hasClaims = Array.isArray(operation.claims) && operation.claims.length > 0;

    return {
      ok: true,
      resultCode: "ADMIN_WORLD_BRIDGE_ACTIONS_RESOLVED",
      operation,
      actions: {
        RETRY: {
          allowed: !terminal && recoveryRequired && !retryLimitReached,
          blockers: [
            ...(terminal ? ["WORLD_BRIDGE_OPERATION_TERMINAL"] : []),
            ...(!recoveryRequired ? ["WORLD_BRIDGE_OPERATION_RETRY_NOT_REQUIRED"] : []),
            ...(retryLimitReached ? ["WORLD_BRIDGE_OPERATION_RETRY_LIMIT_REACHED"] : [])
          ]
        },
        RECONCILE: {
          allowed: true,
          blockers: []
        },
        CLAIM: {
          allowed: !terminal,
          blockers: terminal ? ["WORLD_BRIDGE_OPERATION_TERMINAL"] : []
        },
        RELEASE_CLAIM: {
          allowed: !terminal && hasClaims,
          blockers: [
            ...(terminal ? ["WORLD_BRIDGE_OPERATION_TERMINAL"] : []),
            ...(!hasClaims ? ["WORLD_BRIDGE_OPERATION_CLAIMS_EMPTY"] : [])
          ]
        }
      }
    };
  }

  function previewAdminWorldBridgeOperationAction(input = {}) {
    const actor = normalizeActor(input.actor || {});
    const action = normalizeToken(input.action);
    const operationId = normalizeString(input.operationId);
    if (!actor.actorId) return { ok: false, resultCode: "ACTOR_REQUIRED", blockers: ["ACTOR_REQUIRED"] };
    if (actor.actorRole !== "ADMIN") return { ok: false, resultCode: "ADMIN_ROLE_REQUIRED", blockers: ["ADMIN_ROLE_REQUIRED"] };
    if (!Object.values(ACTIONS).includes(action)) return { ok: false, resultCode: "ADMIN_WORLD_BRIDGE_ACTION_INVALID", blockers: ["ADMIN_WORLD_BRIDGE_ACTION_INVALID"] };
    const availability = getAdminWorldBridgeOperationActionAvailability(operationId);
    if (!availability.ok) return { ...availability, action, actor, blockers: [availability.resultCode] };

    const claims = action === ACTIONS.RELEASE_CLAIM && !normalizeClaims(input.claims).length
      ? normalizeClaims(availability.operation.claims)
      : normalizeClaims(input.claims);
    const blockers = [...(availability.actions[action]?.blockers || [])];
    const warnings = [];
    const requiredApi = {
      RETRY: "retryWorldBridgeOperation",
      RECONCILE: "reconcileWorldBridgeOperation",
      CLAIM: "claimWorldBridgeOperationResources",
      RELEASE_CLAIM: "releaseWorldBridgeOperationClaims"
    }[action];
    if (requiredApi && typeof app[requiredApi] !== "function") blockers.push("WORLD_BRIDGE_OPERATION_API_UNAVAILABLE");
    if (typeof app.appendAdminAuditResult !== "function") blockers.push("ADMIN_AUDIT_STORE_UNAVAILABLE");

    if (action === ACTIONS.CLAIM && !claims.length) blockers.push("WORLD_BRIDGE_OPERATION_CLAIMS_REQUIRED");
    if (action === ACTIONS.CLAIM) {
      claims.forEach((claim) => {
        const owner = app.getWorldBridgeOperationClaimOwner?.(claim.resourceType, claim.resourceId);
        if (owner && owner.operationId !== availability.operation.operationId) blockers.push(`WORLD_BRIDGE_OPERATION_CLAIM_CONFLICT:${claim.resourceType}:${claim.resourceId}:${owner.operationId}`);
      });
    }
    if (action === ACTIONS.RELEASE_CLAIM && !claims.length) blockers.push("WORLD_BRIDGE_OPERATION_CLAIMS_EMPTY");
    if (action === ACTIONS.RECONCILE && TERMINAL_STATUSES.has(normalizeToken(availability.operation.status))) warnings.push("WORLD_BRIDGE_OPERATION_TERMINAL_RECONCILE_READ_ONLY");

    return {
      ok: blockers.length === 0,
      resultCode: blockers.length ? blockers[0].split(":")[0] : "ADMIN_WORLD_BRIDGE_ACTION_PREVIEW_READY",
      action,
      actor,
      operation: availability.operation,
      claims,
      blockers: [...new Set(blockers)],
      warnings: [...new Set(warnings)],
      expectedRevision: Number(availability.operation.revision || 0),
      availability: availability.actions[action]
    };
  }

  function auditResult(actor, input, action, operation, domainResult, status, resultCode, message) {
    return app.appendAdminAuditResult?.({
      actor,
      workspace: "OPERATIONS",
      category: "WORLD_BRIDGE",
      sourceCommand: actionCommand(action),
      citizenId: operation?.citizenId || "",
      targetRefs: [{ type: "WORLD_BRIDGE", id: operation?.operationId || input.operationId }],
      request: {
        idempotencyKey: normalizeString(input.idempotencyKey),
        correlationId: normalizeString(input.correlationId || `admin-world-bridge:${input.operationId}:${action}:${input.idempotencyKey}`)
      },
      result: {
        status,
        resultCode,
        message
      },
      domainRefs: collectDomainRefs(operation || {}),
      previousRevision: Number(input.expectedRevision || operation?.revision || 0) || null,
      nextRevision: Number(domainResult?.operation?.revision || operation?.revision || 0) || null,
      summary: message,
      metadata: {
        action,
        operatorNote: normalizeString(input.operatorNote),
        claims: normalizeClaims(input.claims),
        domainReason: normalizeString(domainResult?.reason),
        operationType: normalizeString(operation?.operationType),
        statusBefore: normalizeString(operation?.status),
        statusAfter: normalizeString(domainResult?.operation?.status || operation?.status),
        currentStep: normalizeString(domainResult?.operation?.currentStep || operation?.currentStep)
      }
    }, { actor });
  }

  async function executeAdminWorldBridgeOperationAction(input = {}) {
    const action = normalizeToken(input.action);
    const operationId = normalizeString(input.operationId);
    const idempotencyKey = normalizeString(input.idempotencyKey);
    const replayCheck = findAuditReplay(action, operationId, idempotencyKey);
    if (replayCheck.conflict) {
      return {
        ok: false,
        status: "FAILED",
        resultCode: "ADMIN_WORLD_BRIDGE_IDEMPOTENCY_CONFLICT",
        operation: app.getWorldBridgeOperation?.(operationId) || null,
        auditEvent: replayCheck.conflict
      };
    }
    if (replayCheck.replay) {
      return {
        ok: replayCheck.replay.result?.status === "SUCCEEDED",
        replay: true,
        status: replayCheck.replay.result?.status || "FAILED",
        resultCode: replayCheck.replay.result?.resultCode || "ADMIN_WORLD_BRIDGE_IDEMPOTENT_REPLAY",
        operation: app.getWorldBridgeOperation?.(operationId) || null,
        auditEvent: replayCheck.replay
      };
    }

    const preview = previewAdminWorldBridgeOperationAction(input);
    const actor = preview.actor || normalizeActor(input.actor || {});
    if (!idempotencyKey) return { ok: false, status: "FAILED", resultCode: "IDEMPOTENCY_KEY_REQUIRED", operation: preview.operation || null };
    if (!normalizeString(input.operatorNote)) return { ok: false, status: "FAILED", resultCode: "OPERATOR_NOTE_REQUIRED", operation: preview.operation || null };
    if (!preview.ok) {
      const failureCode = preview.resultCode || "ADMIN_WORLD_BRIDGE_ACTION_BLOCKED";
      const audit = auditResult(actor, input, action, preview.operation, { reason: failureCode, operation: preview.operation }, "FAILED", failureCode, `Admin World Bridge ${action} blocked: ${failureCode}.`);
      return { ok: false, status: "FAILED", resultCode: failureCode, operation: preview.operation || null, blockers: preview.blockers || [], auditEvent: audit?.event || null };
    }

    const expectedRevision = Number(input.expectedRevision);
    if (!Number.isFinite(expectedRevision) || expectedRevision !== Number(preview.operation.revision)) {
      const resultCode = "WORLD_BRIDGE_OPERATION_STALE_REVISION";
      const audit = auditResult(actor, input, action, preview.operation, { reason: resultCode, operation: preview.operation }, "FAILED", resultCode, `Admin World Bridge ${action} rejected because the operation revision changed.`);
      return { ok: false, status: "FAILED", resultCode, operation: preview.operation, auditEvent: audit?.event || null };
    }

    let domainResult;
    if (action === ACTIONS.RETRY) {
      domainResult = await app.retryWorldBridgeOperation?.(operationId, { force: input.force === true, adminActor: actor, operatorNote: input.operatorNote });
    } else if (action === ACTIONS.RECONCILE) {
      domainResult = app.reconcileWorldBridgeOperation?.(operationId, { flush: true, expectedRevision });
    } else if (action === ACTIONS.CLAIM) {
      domainResult = app.claimWorldBridgeOperationResources?.(operationId, preview.claims, { expectedRevision, flush: true, source: "ADMIN_WORLD_BRIDGE_CLAIMS_ACQUIRED" });
    } else if (action === ACTIONS.RELEASE_CLAIM) {
      domainResult = app.releaseWorldBridgeOperationClaims?.(operationId, preview.claims, { expectedRevision, flush: true, source: "ADMIN_WORLD_BRIDGE_CLAIMS_RELEASED" });
    } else {
      domainResult = { ok: false, reason: "ADMIN_WORLD_BRIDGE_ACTION_INVALID", operation: preview.operation };
    }

    domainResult = domainResult && typeof domainResult === "object" ? domainResult : { ok: false, reason: "WORLD_BRIDGE_OPERATION_API_UNAVAILABLE", operation: preview.operation };
    const operation = domainResult.operation || app.getWorldBridgeOperation?.(operationId) || preview.operation;
    const resultCode = domainResult.ok
      ? `${actionCommand(action)}_SUCCEEDED`
      : normalizeToken(domainResult.reason || "ADMIN_WORLD_BRIDGE_ACTION_FAILED");
    const recoveryRequired = !domainResult.ok && (operation?.recovery?.required === true || RECOVERY_STATUSES.has(normalizeToken(operation?.status)) || /RECOVERY|PERSISTENCE|COMPENSATION/.test(resultCode));
    const status = domainResult.ok ? "SUCCEEDED" : recoveryRequired ? "RECOVERY_REQUIRED" : "FAILED";
    const message = domainResult.ok
      ? `Admin World Bridge ${action} completed for ${operationId}.`
      : `Admin World Bridge ${action} failed for ${operationId}: ${resultCode}.`;
    const audit = auditResult(actor, input, action, preview.operation, domainResult, status, resultCode, message);

    if (domainResult.ok && audit && audit.ok === false) {
      return {
        ok: false,
        status: "RECOVERY_REQUIRED",
        resultCode: "ADMIN_AUDIT_RECOVERY_REQUIRED",
        operation,
        domainResult,
        auditEvent: audit.event || null
      };
    }

    return {
      ok: domainResult.ok === true,
      status,
      resultCode,
      operation,
      domainResult,
      auditEvent: audit?.event || null
    };
  }

  app.AdminOperationsCommand = Object.freeze({
    ACTIONS,
    getAvailability: getAdminWorldBridgeOperationActionAvailability,
    preview: previewAdminWorldBridgeOperationAction,
    execute: executeAdminWorldBridgeOperationAction
  });
  app.getAdminWorldBridgeOperationActionAvailability = getAdminWorldBridgeOperationActionAvailability;
  app.previewAdminWorldBridgeOperationAction = previewAdminWorldBridgeOperationAction;
  app.executeAdminWorldBridgeOperationAction = executeAdminWorldBridgeOperationAction;
})(window.WS_APP);
