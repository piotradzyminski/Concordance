window.WS_APP = window.WS_APP || {};
window.TerminalNotifications = window.TerminalNotifications || {};

(function initNotificationApi() {
  const registry = window.WS_APP.notificationRegistry;
  if (!registry) throw new Error("Notification Registry must load before Notification API.");

  const clone = window.WS_APP.storeUtils?.clone || ((value) => JSON.parse(JSON.stringify(value)));

  function normalizeTimestamp(value = "", fallback = "") {
    const raw = String(value || fallback || "").trim();
    if (!raw) return "";
    const expanded = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00.000Z` : raw;
    const parsed = Date.parse(expanded);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
  }

  function getCampaignTimestamp() {
    const campaignTime = normalizeTimestamp(window.WS_APP.getCampaignTimeIso?.() || window.WS_APP.CAMPAIGN_TIME_ISO);
    if (campaignTime) return campaignTime;
    const campaignDate = String(window.WS_APP.getCampaignDateIso?.() || window.WS_APP.CAMPAIGN_DATE_ISO || "").trim();
    return normalizeTimestamp(campaignDate) || new Date().toISOString();
  }

  function resolveNotificationTimestamps(input = {}) {
    const fallback = getCampaignTimestamp();
    const occurredAt = normalizeTimestamp(input.occurredAt || input.date, fallback);
    const createdAt = normalizeTimestamp(input.createdAt, occurredAt || fallback);
    const sentAt = normalizeTimestamp(input.sentAt, occurredAt || createdAt);
    const receivedAt = normalizeTimestamp(input.receivedAt, sentAt || createdAt);
    const readAt = input.read === true
      ? normalizeTimestamp(input.readAt || input.lifecycle?.readAt, receivedAt)
      : normalizeTimestamp(input.readAt || input.lifecycle?.readAt);
    return { occurredAt, createdAt, sentAt, receivedAt, readAt };
  }

  function normalizeToken(value = "", fallback = "") {
    const normalized = String(value || fallback)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return normalized || fallback;
  }

  function normalizeReference(reference = {}) {
    if (!reference || typeof reference !== "object" || Array.isArray(reference)) return null;
    const type = normalizeToken(reference.type, "");
    const id = String(reference.id || reference.entityId || "").trim();
    if (!type || !id) return null;
    return {
      ...clone(reference),
      type,
      id
    };
  }

  function getPathValue(source = {}, path = "") {
    return String(path || "")
      .split(".")
      .filter(Boolean)
      .reduce((value, key) => value == null ? undefined : value[key], source);
  }

  function buildDedupeKey(event, input, subjectRef) {
    if (input.dedupeKey) return String(input.dedupeKey).trim();
    const policy = event.aggregationPolicy || { mode: "CREATE_ALWAYS", keyFields: [] };
    if (policy.mode === "CREATE_ALWAYS") return "";

    const context = {
      ...input,
      eventCode: event.eventCode,
      subjectRef
    };
    const fields = policy.keyFields.length
      ? policy.keyFields
      : ["citizenId", "eventCode", "subjectRef.type", "subjectRef.id", "correlationId"];
    const values = fields.map((field) => String(getPathValue(context, field) ?? "").trim());
    if (!values.length || values.some((value) => !value)) return "";
    return values.join(":");
  }

  function validateRequiredData(event, data = {}) {
    const missing = (event.requiredData || []).filter((field) => {
      const value = getPathValue(data, field);
      return value === undefined || value === null || value === "";
    });
    return missing;
  }

  function resolveProviderSource(event, input = {}) {
    const providerId = String(input.providerId || input.source?.providerId || "").trim();
    if (!providerId) {
      if (event.providerRequired) {
        return { ok: false, error: { code: "PROVIDER_REQUIRED", eventCode: event.eventCode } };
      }
      return {
        ok: true,
        source: {
          kind: normalizeToken(input.source?.kind, "SYSTEM_PROCESS"),
          providerId: "",
          organizationId: "",
          organizationLocationId: String(input.organizationLocationId || input.source?.organizationLocationId || "").trim(),
          label: String(input.source?.label || input.createdBy || "SYSTEM").trim()
        }
      };
    }

    const resolution = registry.resolveProvider(providerId);
    if (!resolution) {
      return { ok: false, error: { code: "PROVIDER_UNKNOWN", providerId, eventCode: event.eventCode } };
    }
    if (!registry.providerSupportsEvent(resolution, event)) {
      return { ok: false, error: { code: "PROVIDER_EVENT_NOT_SUPPORTED", providerId, eventCode: event.eventCode } };
    }

    const organization = resolution.organization;
    return {
      ok: true,
      source: {
        kind: resolution.manifest.sourceKind || (organization ? "ORGANIZATION" : "SYSTEM_PROCESS"),
        providerId: resolution.providerId,
        requestedProviderId: resolution.requestedProviderId || providerId,
        organizationId: organization?.id || resolution.manifest.organizationId || "",
        organizationLocationId: String(input.organizationLocationId || input.source?.organizationLocationId || "").trim(),
        label: organization?.name || String(input.source?.label || providerId).trim()
      },
      provider: resolution
    };
  }

  function createFallbackPanels(event, input, subjectRef) {
    if (Array.isArray(input.panels) && input.panels.length) return input.panels;
    const rows = [];
    const summary = String(input.summary || input.body || "").trim();
    if (summary) rows.push(["Summary", summary]);
    if (subjectRef) rows.push(["Reference", `${subjectRef.type}:${subjectRef.id}`]);
    if (input.correlationId) rows.push(["Operation", String(input.correlationId)]);
    if (Number(input.revision || 0) > 0) rows.push(["Revision", String(input.revision)]);
    if (!rows.length) rows.push(["Event", event.label]);
    return [{ title: event.category || event.domain, rows }];
  }

  function normalizeActionLinks(actions = [], fallbackLinks = []) {
    if (Array.isArray(fallbackLinks) && fallbackLinks.length) return fallbackLinks;
    const links = (Array.isArray(actions) ? actions : []).map((action) => ({
      label: action.label || action.actionId || "OPEN",
      routeId: action.routeId || "",
      module: action.module || "terminal-hub",
      panel: action.panel || "inbox",
      section: action.section || "",
      entityRef: action.entityRef || null,
      params: action.params || {}
    }));
    return links.length ? links : [{ label: "OPEN TERMINAL", module: "terminal-hub", panel: "inbox" }];
  }

  function emit(input = {}) {
    const eventCode = registry.normalizeEventCode(input.eventCode);
    const event = registry.getEvent(eventCode);
    if (!event) {
      registry.pushDiagnostic("ERROR", "EVENT_CODE_UNKNOWN", { eventCode: input.eventCode || "" });
      return { ok: false, error: { code: "EVENT_CODE_UNKNOWN", eventCode: input.eventCode || "" } };
    }

    const citizenId = String(input.citizenId || "").trim();
    if (!citizenId) return { ok: false, error: { code: "CITIZEN_ID_REQUIRED", eventCode } };

    const subjectRef = normalizeReference(input.subjectRef);
    if (event.subjectTypes.length) {
      if (!subjectRef) return { ok: false, error: { code: "SUBJECT_REQUIRED", eventCode } };
      if (!event.subjectTypes.includes(subjectRef.type)) {
        return {
          ok: false,
          error: {
            code: "SUBJECT_TYPE_INVALID",
            eventCode,
            subjectType: subjectRef.type,
            allowedSubjectTypes: clone(event.subjectTypes)
          }
        };
      }
    }

    const missingData = validateRequiredData(event, input.data || input.templateData || {});
    if (missingData.length) {
      return { ok: false, error: { code: "REQUIRED_DATA_MISSING", eventCode, fields: missingData } };
    }

    const sourceResult = resolveProviderSource(event, input);
    if (!sourceResult.ok) return sourceResult;

    const providerOverride = sourceResult.provider?.manifest?.eventOverrides?.[event.eventCode] || {};
    const relatedRefs = (Array.isArray(input.relatedRefs) ? input.relatedRefs : []).map(normalizeReference).filter(Boolean);
    const templateData = clone(input.templateData || input.data || {});
    const baseCorrelationId = String(input.correlationId || "").trim();
    const baseRevision = Math.max(1, Number(input.revision || 1) || 1);
    let projectionPolicy = { ok: true, decision: "EMIT", reason: "POLICY_UNAVAILABLE" };
    if (input.__legacy !== true
      && input.__skipProjectionPolicy !== true
      && typeof window.WS_APP.resolveNotificationProjectionPolicy === "function") {
      try {
        projectionPolicy = window.WS_APP.resolveNotificationProjectionPolicy({
          ...clone(input),
          eventCode: event.eventCode,
          citizenId,
          subjectRef: clone(subjectRef),
          relatedRefs: clone(relatedRefs),
          correlationId: baseCorrelationId,
          revision: baseRevision,
          templateData: clone(templateData),
          data: clone(templateData)
        }) || projectionPolicy;
      } catch (error) {
        projectionPolicy = {
          ok: false,
          decision: "EMIT",
          reason: "NOTIFICATION_PROJECTION_POLICY_EXCEPTION",
          error: { message: String(error?.message || error) }
        };
      }
    }

    if (projectionPolicy?.ok === true && projectionPolicy.decision !== "EMIT") {
      return {
        ok: true,
        skipped: true,
        operation: projectionPolicy.decision === "PROJECT_TO_PARENT" ? "PROJECTED_TO_PARENT" : "SUPPRESSED_BY_POLICY",
        reason: projectionPolicy.reason || "NOTIFICATION_PROJECTION_POLICY",
        parentOperationId: String(projectionPolicy.parentOperationId || "").trim(),
        eventCode: event.eventCode
      };
    }
    if (projectionPolicy?.ok === false) {
      registry.pushDiagnostic("WARNING", "NOTIFICATION_PROJECTION_POLICY_FAILED", {
        eventCode: event.eventCode,
        error: clone(projectionPolicy.error || projectionPolicy.reason || null)
      });
    }

    const severity = normalizeToken(input.severity || projectionPolicy?.severity || providerOverride.severity, event.defaultSeverity);
    const attention = normalizeToken(input.attention || projectionPolicy?.attention || providerOverride.attention, event.defaultAttention);
    const audience = registry.normalizeAudience(input.audience || projectionPolicy?.audience || providerOverride.audience || event.defaultAudience);
    const correlationId = String(projectionPolicy?.correlationId || baseCorrelationId).trim();
    const revision = Math.max(1, Number(projectionPolicy?.revision || baseRevision) || 1);
    const dedupeKey = projectionPolicy && Object.prototype.hasOwnProperty.call(projectionPolicy, "dedupeKey")
      ? String(projectionPolicy.dedupeKey || "").trim()
      : buildDedupeKey(event, { ...input, citizenId, eventCode, correlationId }, subjectRef);
    const requestedTemplateId = String(input.templateId || providerOverride.templateId || event.templateId || "").trim();
    const hasExplicitPanels = Array.isArray(input.panels) && input.panels.length > 0;
    const shouldResolveContent = input.__legacy !== true
      && hasExplicitPanels === false
      && typeof window.WS_APP.resolveNotificationContent === "function";
    const contentProjection = shouldResolveContent
      ? window.WS_APP.resolveNotificationContent({
          ...clone(input),
          eventCode: event.eventCode,
          citizenId,
          providerId: sourceResult.source.providerId,
          source: clone(sourceResult.source),
          subjectRef: clone(subjectRef),
          relatedRefs: clone(relatedRefs),
          correlationId,
          revision,
          templateId: requestedTemplateId,
          templateData: clone(templateData),
          data: clone(templateData)
        })
      : null;
    const projected = contentProjection?.ok === true && contentProjection?.resolved === true
      ? contentProjection
      : {};
    const title = String(projected.title || input.title || event.label || event.eventCode).trim();
    const summary = String(projected.lead || projected.summary || input.summary || "").trim();
    const body = String(projected.body || input.body || "").trim();
    const actions = Array.isArray(input.actions) && input.actions.length
      ? clone(input.actions)
      : (Array.isArray(projected.actions) && projected.actions.length ? clone(projected.actions) : clone(event.actions || []));
    const legacyType = normalizeToken(input.type, event.legacyType || event.domain || "SYSTEM");
    const legacySubtype = normalizeToken(input.subtype, event.legacySubtype || "SYSTEM_NOTICE");
    const panels = input.__legacy === true
      ? (Array.isArray(input.panels) ? clone(input.panels) : [])
      : hasExplicitPanels
        ? clone(input.panels)
        : (Array.isArray(projected.panels) && projected.panels.length
            ? clone(projected.panels)
            : createFallbackPanels(event, { ...input, summary, body }, subjectRef));
    const finalRows = input.finalRows !== undefined ? clone(input.finalRows) : clone(projected.finalRows || []);
    const tags = Array.isArray(input.tags) && input.tags.length
      ? clone(input.tags)
      : (Array.isArray(projected.tags) && projected.tags.length ? clone(projected.tags) : [event.domain, event.category, severity]);
    const layout = input.layout || projected.layout || (panels.length ? "notice-system" : "");
    const effectiveTemplateId = String(projected.templateId || requestedTemplateId).trim();
    const links = normalizeActionLinks(actions, input.links);
    const timestamps = resolveNotificationTimestamps(input);

    const entry = {
      schemaVersion: 4,
      id: input.id,
      eventId: String(input.eventId || "").trim(),
      citizenId,
      domain: event.domain,
      eventCode: event.eventCode,
      category: event.category,
      source: sourceResult.source,
      severity,
      attention,
      audience,
      lifecycle: input.lifecycle,
      userFlags: input.userFlags,
      subjectRef,
      relatedRefs,
      correlationId,
      dedupeKey,
      revision,
      title,
      summary,
      body,
      templateId: effectiveTemplateId,
      templateData,
      occurredAt: timestamps.occurredAt,
      createdAt: timestamps.createdAt,
      sentAt: timestamps.sentAt,
      receivedAt: timestamps.receivedAt,
      readAt: timestamps.readAt,
      effectiveAt: normalizeTimestamp(input.effectiveAt),
      dueAt: normalizeTimestamp(input.dueAt),
      expiresAt: normalizeTimestamp(input.expiresAt),
      actions,
      retentionPolicy: clone(event.retentionPolicy),
      aggregationPolicy: clone(event.aggregationPolicy),

      type: legacyType,
      subtype: legacySubtype,
      layout,
      panels,
      finalRows,
      tags,
      links,
      date: String(input.date || timestamps.receivedAt.slice(0, 10) || timestamps.occurredAt.slice(0, 10)).slice(0, 10),
      read: input.read === true,
      important: input.important === true,
      folder: input.folder,
      createdBy: input.createdBy || sourceResult.source.label || "SYSTEM"
    };

    const mode = event.aggregationPolicy?.mode || "CREATE_ALWAYS";
    if (mode === "SILENT_LOG_ONLY" || attention === "SILENT") {
      const silentEntry = window.WS_APP.addTerminalEntry?.(citizenId, {
        ...entry,
        audience: ["SYSTEM_ONLY"],
        attention: "SILENT",
        read: true
      });
      return silentEntry
        ? { ok: true, operation: "SILENT_LOGGED", notificationId: silentEntry.id, entry: silentEntry }
        : { ok: false, error: { code: "TERMINAL_ENTRY_WRITE_FAILED" } };
    }

    if (["APPEND_TO_EXISTING", "AGGREGATE_WINDOW"].includes(mode)) {
      return { ok: false, error: { code: "AGGREGATION_MODE_NOT_IMPLEMENTED", eventCode, mode } };
    }

    if (typeof window.WS_APP.upsertTerminalEntry === "function" && (dedupeKey || entry.eventId || mode !== "CREATE_ALWAYS")) {
      const markUnreadOnUpdate = projectionPolicy && Object.prototype.hasOwnProperty.call(projectionPolicy, "markUnreadOnUpdate")
        ? projectionPolicy.markUnreadOnUpdate === true
        : input.markUnreadOnUpdate !== false;
      const result = window.WS_APP.upsertTerminalEntry(citizenId, entry, {
        aggregationMode: mode,
        markUnreadOnUpdate
      });
      return result || { ok: false, error: { code: "TERMINAL_ENTRY_WRITE_FAILED" } };
    }

    const created = window.WS_APP.addTerminalEntry?.(citizenId, entry);
    if (!created) return { ok: false, error: { code: "TERMINAL_ENTRY_WRITE_FAILED" } };
    return {
      ok: true,
      notificationId: created.id,
      operation: "CREATED",
      entry: created
    };
  }

  function emitLegacy(input = {}) {
    const type = normalizeToken(input.type, "SYSTEM");
    const subtype = normalizeToken(input.subtype, type === "SYSTEM" ? "SYSTEM_NOTICE" : "");
    const event = registry.getEvent(subtype);
    if (!event || event.legacyType !== type) {
      registry.pushDiagnostic("ERROR", "EVENT_CODE_UNKNOWN", { type, subtype, source: "LEGACY_EMITTER" });
      return { ok: false, error: { code: "EVENT_CODE_UNKNOWN", type, subtype } };
    }

    return emit({
      ...clone(input),
      eventCode: subtype,
      type,
      subtype,
      audience: input.audience || event.defaultAudience,
      source: input.source || {
        kind: "SYSTEM_PROCESS",
        label: input.createdBy || "SYSTEM"
      },
      __legacy: true
    });
  }

  function updateByEvent(input = {}) {
    const result = emit({ ...clone(input), markUnreadOnUpdate: input.markUnreadOnUpdate !== false });
    return result;
  }

  function emitDuringCampaignAdvance(eventOrDetail = {}, input = {}) {
    if (typeof window.WS_APP.resolveEventTimeFromCampaignEvent !== "function") {
      return { ok: false, error: { code: "WORLD_TIME_EVENT_WINDOWS_UNAVAILABLE" } };
    }

    const stableKey = String(
      input.eventId
      || input.idempotencyKey
      || input.dedupeKey
      || input.correlationId
      || ""
    ).trim();
    if (!stableKey) {
      return { ok: false, error: { code: "INBOX_EVENT_STABLE_KEY_REQUIRED" } };
    }

    const timeResolution = window.WS_APP.resolveEventTimeFromCampaignEvent(eventOrDetail, {
      eventId: stableKey,
      policy: input.timePolicy || input.policy || { type: "ANYTIME" }
    });

    if (!timeResolution?.ok) {
      return {
        ok: false,
        error: {
          code: timeResolution?.reason || "INBOX_EVENT_TIME_RESOLUTION_FAILED",
          timeResolution: clone(timeResolution || null)
        }
      };
    }

    if (timeResolution.deferred === true || timeResolution.withinAdvance !== true) {
      return {
        ok: true,
        operation: "DEFERRED",
        emitted: false,
        scheduledAt: timeResolution.scheduledAt || timeResolution.eventTimeIso || "",
        timeResolution: clone(timeResolution)
      };
    }

    const eventTimeIso = timeResolution.eventTimeIso;
    const result = emit({
      ...clone(input),
      occurredAt: input.occurredAt || eventTimeIso,
      createdAt: input.createdAt || eventTimeIso,
      sentAt: input.sentAt || eventTimeIso,
      receivedAt: input.receivedAt || eventTimeIso,
      date: input.date || eventTimeIso.slice(0, 10)
    });
    return {
      ...result,
      emitted: result?.ok === true,
      timeResolution: clone(timeResolution)
    };
  }

  function mutateLifecycle(input = {}, status = "READ") {
    const citizenId = String(input.citizenId || "").trim();
    const notificationId = String(input.notificationId || input.id || "").trim();
    if (!citizenId || !notificationId) {
      return { ok: false, error: { code: "NOTIFICATION_REFERENCE_REQUIRED" } };
    }

    const now = getCampaignTimestamp();
    const fieldByStatus = {
      READ: "readAt",
      ACKNOWLEDGED: "acknowledgedAt",
      RESOLVED: "resolvedAt",
      EXPIRED: "expiredAt",
      ARCHIVED: "archivedAt"
    };
    const dateField = fieldByStatus[status];
    const changes = {
      read: status !== "NEW",
      readAt: status !== "NEW" ? now : "",
      lifecycle: {
        status,
        ...(dateField ? { [dateField]: now } : {})
      }
    };

    const updated = window.WS_APP.updateTerminalEntryById?.(citizenId, notificationId, changes);
    if (!updated) return { ok: false, error: { code: "NOTIFICATION_NOT_FOUND", notificationId } };
    return { ok: true, operation: status, notificationId, entry: updated };
  }

  function registerPackage(packageDefinition = {}) {
    const results = {
      events: window.TerminalNotifications.registerEvents?.(packageDefinition.events || packageDefinition.eventDefinitions || []) || [],
      provider: null
    };
    if (packageDefinition.provider) {
      results.provider = window.TerminalNotifications.registerProvider?.(packageDefinition.provider) || null;
    }
    return results;
  }

  window.TerminalNotifications.registerPackage = registerPackage;
  window.TerminalNotifications.emit = emit;
  window.TerminalNotifications.emitLegacy = emitLegacy;
  window.TerminalNotifications.updateByEvent = updateByEvent;
  window.TerminalNotifications.emitDuringCampaignAdvance = emitDuringCampaignAdvance;
  window.TerminalNotifications.acknowledge = (input) => mutateLifecycle(input, "ACKNOWLEDGED");
  window.TerminalNotifications.resolve = (input) => mutateLifecycle(input, "RESOLVED");
  window.TerminalNotifications.expire = (input) => mutateLifecycle(input, "EXPIRED");
  window.TerminalNotifications.archive = (input) => mutateLifecycle(input, "ARCHIVED");

  window.WS_APP.emitNotification = emit;
  window.WS_APP.emitNotificationDuringCampaignAdvance = emitDuringCampaignAdvance;
})();
