window.WS_APP = window.WS_APP || {};

(function initCitizenCommandAPI() {
  const RECEIPT_STORAGE_KEY = "ws_citizen_command_receipts_v1";
  const PRE_ACTIVATION_MODULES = new Set([
    "system",
    "system-index",
    "encyclopedia",
    "character-creator",
    "application-status"
  ]);
  const DRAFT_STATES = new Set(["DRAFT", "CHANGES_REQUESTED"]);
  const SELF_PROFILE_FIELDS = Object.freeze(["pseudonym", "portrait", "appearance", "playerNote"]);
  const DRAFT_FIELDS = Object.freeze([
    "identity", "firstName", "middleName", "surname", "pseudonym", "encryptedName",
    "displayNameOverride", "nameRevealAccess", "biologicalProfile", "profile", "origin",
    "birthDate", "portrait", "appearance", "playerNote", "abilities", "skills", "characterType", "classProfile"
  ]);
  const ADMIN_RECORD_FIELDS = Object.freeze([
    ...DRAFT_FIELDS,
    "badges", "tags", "playerVisible", "accessTags", "systemNote", "status", "clearance", "classProfile"
  ]);
  const ADMIN_ACCESS_FIELDS = Object.freeze(["playerVisible", "accessTags", "systemNote"]);
  const OWNER_FULL_CARD_FIELDS = Object.freeze([
    ...ADMIN_RECORD_FIELDS,
    ...ADMIN_ACCESS_FIELDS
  ]);

  const clone = window.WS_APP.storeUtils?.clone || ((value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeActor(actor = window.WS_APP.currentUser) {
    if (!actor) return null;
    return {
      id: String(actor.id || actor.userId || actor.login || "").trim(),
      login: String(actor.login || actor.displayName || actor.id || "").trim(),
      role: String(actor.role || "").trim().toLowerCase(),
      citizenId: String(actor.citizenId || "").trim()
    };
  }

  function isAdmin(actor) {
    return normalizeActor(actor)?.role === "admin";
  }

  function isOwner(citizen, actor) {
    const normalizedActor = normalizeActor(actor);
    if (!citizen || !normalizedActor) return false;
    if (normalizedActor.role === "admin") return true;
    if (citizen.ownerUserId && citizen.ownerUserId === normalizedActor.id) return true;
    return Boolean(normalizedActor.citizenId && normalizedActor.citizenId === citizen.id);
  }

  function hasOwnerFullCardEditGrant(citizen, actor = window.WS_APP.currentUser) {
    const normalizedActor = normalizeActor(actor);
    if (!citizen || !normalizedActor || normalizedActor.role !== "citizen") return false;
    if (!isOwner(citizen, normalizedActor)) return false;
    return citizen.ownerFullCardEdit === true;
  }

  function canUseAdminLikeCitizenCommands(citizen, actor) {
    return isAdmin(actor) || hasOwnerFullCardEditGrant(citizen, actor);
  }

  function readReceipts() {
    try {
      const parsed = JSON.parse(window.localStorage?.getItem(RECEIPT_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function findReceipt(idempotencyKey) {
    const key = String(idempotencyKey || "").trim();
    return key ? readReceipts().find((entry) => entry.idempotencyKey === key) || null : null;
  }

  function writeReceipt(receipt) {
    try {
      const receipts = readReceipts().filter((entry) => entry.idempotencyKey !== receipt.idempotencyKey);
      receipts.push(receipt);
      window.localStorage?.setItem(RECEIPT_STORAGE_KEY, JSON.stringify(receipts.slice(-300)));
      return true;
    } catch (error) {
      console.warn("W&S Citizen command receipt could not be persisted.", error);
      return false;
    }
  }

  function requireCommandContext(input = {}, actor, options = {}) {
    const normalizedActor = normalizeActor(actor);
    const idempotencyKey = String(input.idempotencyKey || options.idempotencyKey || "").trim();
    const reason = String(input.reason || options.reason || "").trim();
    if (!normalizedActor?.id || !normalizedActor.role) return { ok: false, error: { code: "ACTOR_REQUIRED" } };
    if (!idempotencyKey) return { ok: false, error: { code: "IDEMPOTENCY_KEY_REQUIRED" } };
    if (options.requireReason === true && !reason) return { ok: false, error: { code: "REASON_REQUIRED" } };
    const replay = findReceipt(idempotencyKey);
    if (replay) {
      return {
        ok: true,
        replay: true,
        actor: normalizedActor,
        idempotencyKey,
        reason,
        receipt: replay,
        citizen: replay.citizenId ? window.WS_APP.getCitizenById?.(replay.citizenId) || null : null
      };
    }
    return { ok: true, replay: false, actor: normalizedActor, idempotencyKey, reason };
  }

  function pickFields(source = {}, allowed = []) {
    const next = {};
    allowed.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(source || {}, field)) next[field] = clone(source[field]);
    });
    return next;
  }

  function normalizeIdentityPatch(current, patch = {}) {
    const identitySource = patch.identity && typeof patch.identity === "object" ? patch.identity : {};
    const currentIdentity = current.identity && typeof current.identity === "object" ? current.identity : {};
    const identity = {
      ...currentIdentity,
      ...clone(identitySource)
    };
    ["firstName", "middleName", "surname", "pseudonym", "encryptedName", "displayNameOverride", "nameRevealAccess"].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(patch, field)) identity[field] = clone(patch[field]);
    });
    const next = { ...patch, identity };
    delete next.firstName;
    delete next.middleName;
    delete next.surname;
    delete next.encryptedName;
    delete next.displayNameOverride;
    delete next.nameRevealAccess;
    return next;
  }

  function appendAuditTrail(citizen, command, context, metadata = {}) {
    const trail = Array.isArray(citizen.citizenAuditTrail) ? clone(citizen.citizenAuditTrail) : [];
    trail.push({
      auditId: `citizen_audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      command,
      citizenId: citizen.id,
      actorId: context.actor.id,
      actorLogin: context.actor.login,
      actorRole: context.actor.role,
      reason: context.reason || "",
      idempotencyKey: context.idempotencyKey,
      createdAt: nowIso(),
      metadata: clone(metadata || {})
    });
    return trail.slice(-100);
  }

  function commitCitizenPatch(citizen, patch, command, context, metadata = {}) {
    const beforeRevision = Math.max(1, Number(citizen.revision || 1) || 1);
    const updatedAt = nowIso();
    const nextPatch = normalizeIdentityPatch(citizen, {
      ...clone(patch),
      revision: beforeRevision + 1,
      updatedAt,
      citizenAuditTrail: appendAuditTrail(citizen, command, context, metadata)
    });
    const updated = window.WS_APP.updateCitizen?.(citizen.id, nextPatch, { source: "CITIZEN_COMMAND_API" });
    if (!updated) {
      return {
        ok: false,
        error: clone(window.WS_APP.lastCitizenMutationBoundaryError || { code: "CITIZEN_UPDATE_FAILED" })
      };
    }
    writeReceipt({
      idempotencyKey: context.idempotencyKey,
      command,
      citizenId: updated.id,
      revision: updated.revision,
      createdAt: updatedAt
    });
    return { ok: true, operation: command, citizen: updated };
  }

  function createCitizenDraft(input = {}, actor = window.WS_APP.currentUser) {
    const context = requireCommandContext(input, actor);
    if (!context.ok) return context;
    if (context.replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", citizen: context.citizen };
    if (context.actor.role !== "admin" && context.actor.role !== "citizen") return { ok: false, error: { code: "ROLE_NOT_ALLOWED" } };

    if (context.actor.role === "citizen") {
      const owned = (window.WS_APP.getCitizens?.({ includeArchived: true }) || []).find((citizen) => isOwner(citizen, context.actor) && citizen.recordState !== "ARCHIVED");
      if (owned) return { ok: false, error: { code: "CITIZEN_RECORD_ALREADY_EXISTS", citizenId: owned.id } };
    }

    const now = nowIso();
    const characterType = context.actor.role === "citizen"
      ? "PLAYER"
      : String(input.characterType || "PLAYER").trim().toUpperCase();
    const internalId = window.WS_APP.generateCitizenInternalId?.(characterType === "NPC" ? "npc" : "citizen")
      || `citizen_${Date.now().toString(36)}`;
    const identity = input.identity && typeof input.identity === "object"
      ? clone(input.identity)
      : {
          firstName: String(input.firstName || "").trim(),
          middleName: String(input.middleName || "").trim(),
          surname: String(input.surname || "").trim(),
          pseudonym: String(input.pseudonym || "").trim()
        };

    const record = {
      id: window.WS_APP.makeUniqueCitizenStoreId?.(internalId) || internalId,
      recordType: characterType === "NPC" ? "npc" : "citizen",
      recordState: "DRAFT",
      characterType,
      ownerUserId: context.actor.role === "citizen" ? context.actor.id : String(input.ownerUserId || "").trim(),
      playerVisible: false,
      accessTags: ["PUBLIC"],
      shortId: "",
      idNumber: "",
      identity,
      biologicalProfile: input.biologicalProfile || input.profile || "GAMMA",
      profile: input.biologicalProfile || input.profile || "GAMMA",
      classProfile: input.classProfile || "UNASSIGNED",
      origin: input.origin || "NE3:51.00",
      birthDate: input.birthDate || "",
      status: "PENDING REGISTRATION",
      clearance: "CIVIL-LIMITED",
      portrait: input.portrait || "",
      debt: 0,
      credits: 0,
      income: [],
      serviceLog: [],
      subscriptions: [],
      risk: 0,
      tags: ["DRAFT"],
      badges: [],
      appearance: input.appearance || "",
      playerNote: input.playerNote || "",
      systemNote: context.reason || "Created as Citizen draft.",
      ownerFullCardEdit: false,
      ownerFullCardEditGrantedAt: "",
      ownerFullCardEditGrantedBy: "",
      files: [],
      abilities: Array.isArray(input.abilities) ? clone(input.abilities) : [],
      skills: Array.isArray(input.skills) ? clone(input.skills) : [],
      createdAt: now,
      updatedAt: now,
      revision: 1,
      citizenAuditTrail: []
    };
    record.citizenAuditTrail = appendAuditTrail(record, "CREATE_DRAFT", context, { characterType });
    const created = window.WS_APP.createCitizen?.(record, { source: "CITIZEN_COMMAND_API" });
    if (!created) return { ok: false, error: { code: "CITIZEN_CREATE_FAILED" } };
    writeReceipt({ idempotencyKey: context.idempotencyKey, command: "CREATE_DRAFT", citizenId: created.id, revision: created.revision, createdAt: now });
    return { ok: true, operation: "CREATE_DRAFT", citizen: created };
  }

  function createQuickNpc(input = {}, actor = window.WS_APP.currentUser) {
    const context = requireCommandContext(input, actor, { requireReason: true });
    if (!context.ok) return context;
    if (context.replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", citizen: context.citizen };
    if (!isAdmin(context.actor)) return { ok: false, error: { code: "ADMIN_REQUIRED" } };

    const draftResult = createCitizenDraft({
      characterType: "NPC",
      identity: clone(input.identity || {}),
      biologicalProfile: input.biologicalProfile || input.profile || "GAMMA",
      profile: input.biologicalProfile || input.profile || "GAMMA",
      classProfile: input.classProfile || "UNASSIGNED",
      origin: input.origin || "NE3:51.00",
      birthDate: input.birthDate || "",
      portrait: input.portrait || "",
      appearance: input.appearance || "",
      playerNote: input.playerNote || "",
      abilities: Array.isArray(input.abilities) ? clone(input.abilities) : [],
      skills: Array.isArray(input.skills) ? clone(input.skills) : [],
      reason: context.reason,
      source: input.source || "QUICK_NPC_CREATOR",
      idempotencyKey: `${context.idempotencyKey}:draft`
    }, context.actor);
    if (!draftResult?.ok || !draftResult.citizen) return draftResult || { ok: false, error: { code: "QUICK_NPC_DRAFT_FAILED" } };

    const validation = window.WS_APP.validateCitizenIdentity?.({
      ...draftResult.citizen,
      recordState: "ACTIVE"
    }, {
      requireComplete: true,
      excludeCitizenId: draftResult.citizen.id
    }) || { ok: true, errors: [] };
    if (!validation.ok) {
      return {
        ok: false,
        error: {
          code: "QUICK_NPC_VALIDATION_FAILED",
          errors: clone(validation.errors || []),
          draftCitizenId: draftResult.citizen.id
        },
        citizen: draftResult.citizen
      };
    }

    const activationResult = activateCitizenDraft(draftResult.citizen.id, {
      reason: context.reason,
      source: input.source || "QUICK_NPC_CREATOR",
      idempotencyKey: `${context.idempotencyKey}:activate`
    }, context.actor);
    if (!activationResult?.ok) return activationResult || { ok: false, error: { code: "QUICK_NPC_ACTIVATION_FAILED" } };

    writeReceipt({
      idempotencyKey: context.idempotencyKey,
      command: "CREATE_QUICK_NPC",
      citizenId: activationResult.citizen.id,
      revision: activationResult.citizen.revision,
      createdAt: nowIso()
    });
    return { ok: true, operation: "CREATE_QUICK_NPC", citizen: activationResult.citizen };
  }

  function updateCitizenDraft(citizenId, input = {}, actor = window.WS_APP.currentUser) {
    const context = requireCommandContext(input, actor);
    if (!context.ok) return context;
    if (context.replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", citizen: context.citizen };
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen) return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };
    if (!DRAFT_STATES.has(citizen.recordState)) return { ok: false, error: { code: "CITIZEN_DRAFT_NOT_EDITABLE", recordState: citizen.recordState } };
    if (!isOwner(citizen, context.actor)) return { ok: false, error: { code: "CITIZEN_EDIT_DENIED" } };
    const patch = pickFields(input.patch || input, DRAFT_FIELDS);
    patch.recordState = "DRAFT";
    patch.reviewNote = "";
    return commitCitizenPatch(citizen, patch, "UPDATE_DRAFT", context);
  }

  function submitCitizenDraft(citizenId, input = {}, actor = window.WS_APP.currentUser) {
    const context = requireCommandContext(input, actor);
    if (!context.ok) return context;
    if (context.replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", citizen: context.citizen };
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen) return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };
    if (!DRAFT_STATES.has(citizen.recordState)) return { ok: false, error: { code: "CITIZEN_NOT_SUBMITTABLE", recordState: citizen.recordState } };
    if (!isOwner(citizen, context.actor)) return { ok: false, error: { code: "CITIZEN_SUBMIT_DENIED" } };
    const validation = window.WS_APP.validateCitizenIdentity?.(citizen, { requireComplete: true, excludeCitizenId: citizen.id }) || { ok: true, errors: [] };
    if (!validation.ok) return { ok: false, error: { code: "CITIZEN_VALIDATION_FAILED", errors: validation.errors } };
    return commitCitizenPatch(citizen, {
      recordState: "READY_FOR_REVIEW",
      submittedAt: nowIso(),
      reviewNote: ""
    }, "SUBMIT_FOR_REVIEW", context);
  }

  function requestCitizenChanges(citizenId, input = {}, actor = window.WS_APP.currentUser) {
    const context = requireCommandContext(input, actor, { requireReason: true });
    if (!context.ok) return context;
    if (context.replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", citizen: context.citizen };
    if (!isAdmin(context.actor)) return { ok: false, error: { code: "ADMIN_REQUIRED" } };
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen) return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };
    if (citizen.recordState !== "READY_FOR_REVIEW") return { ok: false, error: { code: "INVALID_RECORD_STATE", recordState: citizen.recordState } };
    return commitCitizenPatch(citizen, {
      recordState: "CHANGES_REQUESTED",
      reviewNote: context.reason
    }, "REQUEST_CHANGES", context);
  }

  function rejectCitizenDraft(citizenId, input = {}, actor = window.WS_APP.currentUser) {
    const context = requireCommandContext(input, actor, { requireReason: true });
    if (!context.ok) return context;
    if (context.replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", citizen: context.citizen };
    if (!isAdmin(context.actor)) return { ok: false, error: { code: "ADMIN_REQUIRED" } };
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen) return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };
    if (!["DRAFT", "CHANGES_REQUESTED", "READY_FOR_REVIEW"].includes(citizen.recordState)) {
      return { ok: false, error: { code: "CITIZEN_NOT_REJECTABLE", recordState: citizen.recordState } };
    }
    return commitCitizenPatch(citizen, {
      recordState: "REJECTED",
      reviewNote: context.reason,
      playerVisible: false
    }, "REJECT_APPLICATION", context);
  }

  function activateCitizenDraft(citizenId, input = {}, actor = window.WS_APP.currentUser) {
    const context = requireCommandContext(input, actor, { requireReason: true });
    if (!context.ok) return context;
    if (context.replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", citizen: context.citizen };
    if (!isAdmin(context.actor)) return { ok: false, error: { code: "ADMIN_REQUIRED" } };
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen) return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };
    if (!["DRAFT", "CHANGES_REQUESTED", "READY_FOR_REVIEW"].includes(citizen.recordState)) {
      return { ok: false, error: { code: "CITIZEN_NOT_ACTIVATABLE", recordState: citizen.recordState } };
    }
    const validation = window.WS_APP.validateCitizenIdentity?.(citizen, { requireComplete: true, excludeCitizenId: citizen.id }) || { ok: true, errors: [] };
    if (!validation.ok) return { ok: false, error: { code: "CITIZEN_VALIDATION_FAILED", errors: validation.errors } };
    const finalized = window.WS_APP.finalizeCitizenIdentity?.(citizen, { excludeCitizenId: citizen.id });
    if (!finalized?.ok) return finalized || { ok: false, error: { code: "CITIZEN_ID_FINALIZATION_FAILED" } };
    return commitCitizenPatch(citizen, {
      idNumber: finalized.idNumber,
      shortId: finalized.shortId,
      recordState: "ACTIVE",
      status: "ACTIVE",
      activatedAt: nowIso(),
      archivedAt: "",
      reviewNote: "",
      tags: (Array.isArray(citizen.tags) ? citizen.tags : []).filter((tag) => String(tag).toUpperCase() !== "DRAFT")
    }, "ACTIVATE", context, { idNumber: finalized.idNumber, shortId: finalized.shortId });
  }

  function updateCitizenSelfProfile(citizenId, input = {}, actor = window.WS_APP.currentUser) {
    const context = requireCommandContext(input, actor);
    if (!context.ok) return context;
    if (context.replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", citizen: context.citizen };
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen) return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };
    if (citizen.recordState !== "ACTIVE") return { ok: false, error: { code: "ACTIVE_CITIZEN_REQUIRED" } };
    if (!isOwner(citizen, context.actor) || context.actor.role !== "citizen") return { ok: false, error: { code: "SELF_EDIT_DENIED" } };
    return commitCitizenPatch(citizen, pickFields(input.patch || input, SELF_PROFILE_FIELDS), "SELF_PROFILE_UPDATE", context);
  }

  function adminUpdateCitizenRecord(citizenId, input = {}, actor = window.WS_APP.currentUser) {
    const context = requireCommandContext(input, actor, { requireReason: true });
    if (!context.ok) return context;
    if (context.replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", citizen: context.citizen };
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || citizen.recordType === "admin") return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };
    if (!canUseAdminLikeCitizenCommands(citizen, context.actor)) return { ok: false, error: { code: "ADMIN_OR_OWNER_FULL_EDIT_REQUIRED" } };
    const allowedFields = isAdmin(context.actor) ? ADMIN_RECORD_FIELDS : OWNER_FULL_CARD_FIELDS;
    const sourcePatch = input.patch || input;
    const patch = pickFields(sourcePatch, allowedFields);
    delete patch.recordState;
    const identityBasisChanged = ["origin", "birthDate"].some((field) => Object.prototype.hasOwnProperty.call(sourcePatch, field));
    const currentShortId = window.WS_APP.extractCitizenShortIdFromIdNumber?.(citizen.idNumber) || "";
    const identityCodesOutOfSync = Boolean(citizen.idNumber) && currentShortId !== String(citizen.shortId || "").trim().toUpperCase();
    if (identityBasisChanged || identityCodesOutOfSync) {
      const identityCodes = window.WS_APP.recalculateCitizenIdentityCodes?.({ ...citizen, ...patch }, {
        excludeCitizenId: citizen.id,
        validateUniqueness: true
      });
      if (!identityCodes?.ok) return { ok: false, error: identityCodes?.error || { code: "CITIZEN_ID_RECALCULATION_FAILED" } };
      patch.idNumber = identityCodes.idNumber;
      patch.shortId = identityCodes.shortId;
    } else {
      delete patch.idNumber;
      delete patch.shortId;
    }
    return commitCitizenPatch(citizen, patch, isAdmin(context.actor) ? "ADMIN_RECORD_UPDATE" : "OWNER_FULL_CARD_UPDATE", context, {
      delegated: !isAdmin(context.actor),
      identityCodesRecalculated: identityBasisChanged || identityCodesOutOfSync
    });
  }

  function adminUpdateCitizenAccess(citizenId, input = {}, actor = window.WS_APP.currentUser) {
    const context = requireCommandContext(input, actor, { requireReason: true });
    if (!context.ok) return context;
    if (context.replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", citizen: context.citizen };
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || citizen.recordType === "admin") return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };
    if (!canUseAdminLikeCitizenCommands(citizen, context.actor)) return { ok: false, error: { code: "ADMIN_OR_OWNER_FULL_EDIT_REQUIRED" } };
    return commitCitizenPatch(citizen, pickFields(input.patch || input, ADMIN_ACCESS_FIELDS), isAdmin(context.actor) ? "ADMIN_ACCESS_UPDATE" : "OWNER_FULL_ACCESS_UPDATE", context, { delegated: !isAdmin(context.actor) });
  }

  function adminCorrectCitizenMechanics(citizenId, input = {}, actor = window.WS_APP.currentUser) {
    const context = requireCommandContext(input, actor, { requireReason: true });
    if (!context.ok) return context;
    if (context.replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", citizen: context.citizen };
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || citizen.recordType === "admin") return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };
    if (!canUseAdminLikeCitizenCommands(citizen, context.actor)) return { ok: false, error: { code: "ADMIN_OR_OWNER_FULL_EDIT_REQUIRED" } };
    return commitCitizenPatch(citizen, pickFields(input.patch || input, ["abilities", "skills"]), isAdmin(context.actor) ? "ADMIN_MECHANICS_CORRECTION" : "OWNER_FULL_MECHANICS_UPDATE", context, { delegated: !isAdmin(context.actor) });
  }

  function adminAssignCitizenOwner(citizenId, input = {}, actor = window.WS_APP.currentUser) {
    const context = requireCommandContext(input, actor, { requireReason: true });
    if (!context.ok) return context;
    if (context.replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", citizen: context.citizen };
    if (!isAdmin(context.actor)) return { ok: false, error: { code: "ADMIN_REQUIRED" } };
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || citizen.recordType === "admin") return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };
    const ownerUserId = String(input.ownerUserId || input.patch?.ownerUserId || "").trim();
    if (ownerUserId) {
      const owner = (window.WS_APP.getUsers?.({ includeDisabled: true }) || window.APP_DATA?.users || []).find((entry) => entry.id === ownerUserId && entry.role === "citizen");
      if (!owner) return { ok: false, error: { code: "CITIZEN_OWNER_USER_NOT_FOUND" } };
      const conflicting = (window.WS_APP.getCitizens?.({ includeArchived: true }) || []).find((entry) => entry.id !== citizen.id && entry.ownerUserId === ownerUserId && entry.recordState !== "ARCHIVED");
      if (conflicting) return { ok: false, error: { code: "CITIZEN_OWNER_ALREADY_ASSIGNED", citizenId: conflicting.id } };
    }
    const previousOwnerUserId = String(citizen.ownerUserId || "").trim();
    const result = commitCitizenPatch(citizen, { ownerUserId }, "ASSIGN_OWNER", context, { ownerUserId, previousOwnerUserId });
    if (!result?.ok) return result;
    if (previousOwnerUserId && previousOwnerUserId !== ownerUserId) {
      const previousOwner = window.WS_APP.getUserById?.(previousOwnerUserId);
      if (previousOwner?.citizenId === citizen.id) window.WS_APP.updateUser?.(previousOwnerUserId, { citizenId: "" });
    }
    if (ownerUserId) window.WS_APP.updateUser?.(ownerUserId, { citizenId: citizen.id });
    return result;
  }

  function adminSetOwnerFullCardEdit(citizenId, input = {}, actor = window.WS_APP.currentUser) {
    const context = requireCommandContext(input, actor, { requireReason: true });
    if (!context.ok) return context;
    if (context.replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", citizen: context.citizen };
    if (!isAdmin(context.actor)) return { ok: false, error: { code: "ADMIN_REQUIRED" } };
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || citizen.recordType === "admin") return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };
    const enabled = input.enabled === true || input.patch?.enabled === true;
    if (enabled && !String(citizen.ownerUserId || "").trim()) return { ok: false, error: { code: "CITIZEN_OWNER_REQUIRED" } };
    return commitCitizenPatch(citizen, {
      ownerFullCardEdit: enabled,
      ownerFullCardEditGrantedAt: enabled ? nowIso() : "",
      ownerFullCardEditGrantedBy: enabled ? context.actor.id : ""
    }, "SET_OWNER_FULL_CARD_EDIT", context, { enabled });
  }

  function archiveCitizen(citizenId, input = {}, actor = window.WS_APP.currentUser) {
    const context = requireCommandContext(input, actor, { requireReason: true });
    if (!context.ok) return context;
    if (context.replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", citizen: context.citizen };
    if (!isAdmin(context.actor)) return { ok: false, error: { code: "ADMIN_REQUIRED" } };
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || citizen.recordType === "admin") return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };
    if (citizen.recordState === "ARCHIVED") return { ok: true, operation: "ALREADY_ARCHIVED", citizen };
    return commitCitizenPatch(citizen, { recordState: "ARCHIVED", archivedAt: nowIso(), playerVisible: false }, "ARCHIVE", context);
  }

  function restoreCitizen(citizenId, input = {}, actor = window.WS_APP.currentUser) {
    const context = requireCommandContext(input, actor, { requireReason: true });
    if (!context.ok) return context;
    if (context.replay) return { ok: true, operation: "IDEMPOTENT_REPLAY", citizen: context.citizen };
    if (!isAdmin(context.actor)) return { ok: false, error: { code: "ADMIN_REQUIRED" } };
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    if (!citizen || citizen.recordType === "admin") return { ok: false, error: { code: "CITIZEN_NOT_FOUND" } };
    if (citizen.recordState !== "ARCHIVED") return { ok: false, error: { code: "CITIZEN_NOT_ARCHIVED" } };
    const nextState = citizen.activatedAt ? "ACTIVE" : "DRAFT";
    return commitCitizenPatch(citizen, { recordState: nextState, archivedAt: "" }, "RESTORE", context);
  }

  function canEditCitizen(citizenId, actor = window.WS_APP.currentUser) {
    const citizen = window.WS_APP.getCitizenById?.(citizenId);
    const normalizedActor = normalizeActor(actor);
    if (!citizen || !normalizedActor || citizen.recordType === "admin") return false;
    if (normalizedActor.role === "admin") return true;
    if (!isOwner(citizen, normalizedActor)) return false;
    return citizen.recordState === "ACTIVE" || DRAFT_STATES.has(citizen.recordState);
  }

  function getUserCitizen(actor = window.WS_APP.currentUser) {
    const normalizedActor = normalizeActor(actor);
    if (!normalizedActor || normalizedActor.role !== "citizen") return null;
    const direct = normalizedActor.citizenId ? window.WS_APP.getCitizenById?.(normalizedActor.citizenId) : null;
    if (direct) return direct;
    return (window.WS_APP.getCitizens?.({ includeArchived: true }) || []).find((citizen) => citizen.ownerUserId === normalizedActor.id) || null;
  }

  function canAccessCitizenModule(moduleId, actor = window.WS_APP.currentUser) {
    const normalizedActor = normalizeActor(actor);
    if (!normalizedActor) return false;
    if (normalizedActor.role === "admin") return true;
    if (normalizedActor.role !== "citizen") return false;
    const citizen = getUserCitizen(normalizedActor);
    const normalizedModuleId = String(moduleId || "").trim().toLowerCase();
    if (citizen?.recordState === "ACTIVE") {
      return !["character-creator", "application-status"].includes(normalizedModuleId);
    }
    return PRE_ACTIVATION_MODULES.has(normalizedModuleId);
  }

  function resetCitizenRuntimeData(options = {}) {
    try {
      (window.WS_APP.CITIZEN_PRE_ALPHA_RESET_KEYS || []).forEach((key) => window.localStorage?.removeItem(key));
      window.localStorage?.removeItem("ws_app_citizen_record_schema");
      if (options.reload !== false) window.location?.reload?.();
      return { ok: true, reloadRequired: options.reload === false };
    } catch (error) {
      return { ok: false, error: { code: "CITIZEN_RUNTIME_RESET_FAILED", message: String(error?.message || error) } };
    }
  }

  const api = Object.freeze({
    schema: "citizen_command_api_2_3x",
    createCitizenDraft,
    createQuickNpc,
    updateCitizenDraft,
    submitCitizenDraft,
    requestCitizenChanges,
    rejectCitizenDraft,
    activateCitizenDraft,
    updateCitizenSelfProfile,
    adminUpdateCitizenRecord,
    adminUpdateCitizenAccess,
    adminCorrectCitizenMechanics,
    adminAssignCitizenOwner,
    adminSetOwnerFullCardEdit,
    archiveCitizen,
    restoreCitizen,
    canEditCitizen,
    hasOwnerFullCardEditGrant,
    getUserCitizen,
    canAccessCitizenModule,
    resetCitizenRuntimeData
  });

  window.WS_APP.CitizenCommandAPI = api;
  Object.assign(window.WS_APP, {
    canEditCitizen,
    hasOwnerFullCardEditGrant,
    getUserCitizen,
    canAccessCitizenModule,
    resetCitizenRuntimeData
  });
})();
