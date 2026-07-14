window.WS_APP = window.WS_APP || {};

(function initCampaignDataIoV6(app) {
  "use strict";

  const SNAPSHOT_SCHEMA = "ws-local-campaign-data-v6";
  const SNAPSHOT_SCHEMA_VERSION = 6;
  const BACKUP_STORAGE_KEY = "ws_app_last_import_backup_v6";
  const PROJECT_STATE_VERSION = "Parallel Scope + Cyberware World Bridge Merge 14.0x + Campaign Data I/O v6 1.0x";
  const C = app.CAMPAIGN_DATA_DOMAIN_CLASSIFICATIONS || {};

  function clone(value) {
    if (value == null) return value;
    if (typeof structuredClone === "function") {
      try { return structuredClone(value); } catch (error) {}
    }
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function errorResult(code, detail = {}) {
    return { ok: false, error: { code, ...detail } };
  }

  function parseInput(input) {
    if (typeof input === "string") {
      try { return { ok: true, value: JSON.parse(input) }; }
      catch (error) { return errorResult("SNAPSHOT_PARSE_FAILED", { message: String(error?.message || error) }); }
    }
    if (!input || typeof input !== "object" || Array.isArray(input)) return errorResult("SNAPSHOT_PARSE_FAILED", { message: "Snapshot must be a JSON object." });
    return { ok: true, value: input };
  }

  function persistentAdapters() {
    return app.getCampaignDataDomainAdapters?.({ classification: C.CAMPAIGN_PERSISTENT }) || [];
  }

  function omittedAdapters() {
    return (app.getCampaignDataDomainAdapters?.() || []).filter((adapter) => adapter.classification !== C.CAMPAIGN_PERSISTENT);
  }

  function flushCampaignDataIoSourceStores() {
    const errors = [];
    const calls = [
      ["saveCitizenStore", false],
      ["flushScheduledItemStorePersistence", false],
      ["flushServiceBridgePersistence", true],
      ["flushMarketCartPersistence", true],
      ["flushMarketOrderPersistence", true],
      ["flushHousingPlacementPersistence", true],
      ["flushWorldBridgeOperationPersistence", true],
      ["flushWorldTimeServiceSchedulerPersistence", true]
    ];
    calls.forEach(([name, falseMeansFailure]) => {
      const fn = app[name];
      if (typeof fn !== "function") return;
      try {
        const result = fn();
        if (falseMeansFailure && result === false) errors.push({ code: "CAMPAIGN_DATA_SOURCE_FLUSH_FAILED", api: name });
      } catch (error) {
        errors.push({ code: "CAMPAIGN_DATA_SOURCE_FLUSH_FAILED", api: name, message: String(error?.message || error) });
      }
    });
    return { ok: errors.length === 0, errors };
  }

  function manifestEntry(adapter, state) {
    const summary = adapter.summarizeState(state) || {};
    return {
      domainId: adapter.domainId,
      schemaVersion: adapter.schemaVersion,
      classification: adapter.classification,
      recordCount: Math.max(0, Number(summary.recordCount || 0)),
      checksum: app.checksumCampaignData(state),
      required: adapter.required === true,
      ...(Number.isFinite(Number(summary.activeOperationCount)) ? { activeOperationCount: Number(summary.activeOperationCount) } : {})
    };
  }

  function exportCampaignSnapshotV6(options = {}) {
    if (options.flush !== false) {
      const flushed = flushCampaignDataIoSourceStores();
      if (!flushed.ok) throw new Error(`CAMPAIGN_DATA_SOURCE_FLUSH_FAILED:${flushed.errors.map((entry) => entry.api).join(",")}`);
    }
    const data = {};
    const domains = [];
    let activeOperationCount = 0;
    let activeOperationIds = [];

    persistentAdapters().forEach((adapter) => {
      const state = adapter.exportState();
      const summary = adapter.summarizeState(state) || {};
      data[adapter.domainId] = { schemaVersion: adapter.schemaVersion, state };
      domains.push(manifestEntry(adapter, state));
      if (adapter.domainId === "world-bridge-operations") {
        activeOperationCount = Number(summary.activeOperationCount || 0);
        activeOperationIds = Array.isArray(summary.activeOperationIds) ? [...summary.activeOperationIds] : [];
      }
    });

    return {
      schema: SNAPSHOT_SCHEMA,
      snapshotSchemaVersion: SNAPSHOT_SCHEMA_VERSION,
      exportedAt: nowIso(),
      projectStateVersion: PROJECT_STATE_VERSION,
      campaignId: String(options.campaignId || app.CAMPAIGN_ID || "local-campaign").trim() || "local-campaign",
      campaign: {
        campaignTimeIso: app.getCampaignTimeIso?.() || app.CAMPAIGN_TIME_ISO || "2109-02-13T00:00:00.000Z",
        campaignTimeRevision: Number(app.getCampaignTimeRevision?.() || app.CAMPAIGN_TIME_REVISION || 0),
        campaignDateIso: app.getCampaignDateIso?.() || app.CAMPAIGN_DATE_ISO || "2109-02-13",
        nextSettlementPeriodIso: app.getSettlementPeriodEndIso?.() || app.SETTLEMENT_PERIOD_END_ISO || ""
      },
      domains,
      omittedDomains: omittedAdapters().map((adapter) => ({
        domainId: adapter.domainId,
        classification: adapter.classification,
        reason: adapter.classification === C.LOCAL_UI_ONLY
          ? "LOCAL_UI_STATE_NOT_PART_OF_CAMPAIGN"
          : adapter.classification === C.DERIVED
            ? "DERIVED_FROM_CANONICAL_CAMPAIGN_STATE"
            : "SEED_OR_RUNTIME_DEFINITION_NOT_PERSISTED"
      })),
      activeOperations: {
        policy: "EXPORT_AND_RESUME",
        count: activeOperationCount,
        operationIds: activeOperationIds
      },
      data
    };
  }

  function isCampaignSnapshotV6(input) {
    const parsed = parseInput(input);
    if (!parsed.ok) return false;
    return parsed.value?.schema === SNAPSHOT_SCHEMA || Number(parsed.value?.snapshotSchemaVersion) === SNAPSHOT_SCHEMA_VERSION;
  }

  function validateCampaignSnapshotV6(input, options = {}) {
    const parsed = parseInput(input);
    if (!parsed.ok) return parsed;
    const snapshot = parsed.value;
    if (snapshot.schema !== SNAPSHOT_SCHEMA || Number(snapshot.snapshotSchemaVersion) !== SNAPSHOT_SCHEMA_VERSION) {
      return errorResult("SNAPSHOT_MANIFEST_INVALID", {
        reason: "SNAPSHOT_SCHEMA_UNSUPPORTED",
        expectedSchema: SNAPSHOT_SCHEMA,
        actualSchema: snapshot.schema || "",
        actualVersion: snapshot.snapshotSchemaVersion ?? snapshot.schemaVersion ?? null
      });
    }
    if (!Array.isArray(snapshot.domains) || !snapshot.data || typeof snapshot.data !== "object" || Array.isArray(snapshot.data)) {
      return errorResult("SNAPSHOT_MANIFEST_INVALID", { reason: "SNAPSHOT_DOMAINS_REQUIRED" });
    }

    const adapters = persistentAdapters();
    const adapterById = new Map(adapters.map((adapter) => [adapter.domainId, adapter]));
    const manifestById = new Map();
    const errors = [];

    snapshot.domains.forEach((entry, index) => {
      const domainId = String(entry?.domainId || "").trim();
      if (!domainId) {
        errors.push({ code: "SNAPSHOT_MANIFEST_DOMAIN_ID_REQUIRED", index });
        return;
      }
      if (manifestById.has(domainId)) errors.push({ code: "SNAPSHOT_MANIFEST_DOMAIN_DUPLICATE", domainId });
      manifestById.set(domainId, entry);
      if (!adapterById.has(domainId)) errors.push({ code: "SNAPSHOT_DOMAIN_UNSUPPORTED", domainId });
    });

    Object.keys(snapshot.data).forEach((domainId) => {
      if (!adapterById.has(domainId)) errors.push({ code: "SNAPSHOT_DOMAIN_UNSUPPORTED", domainId });
      if (!manifestById.has(domainId)) errors.push({ code: "SNAPSHOT_MANIFEST_DOMAIN_MISSING", domainId });
    });

    adapters.forEach((adapter) => {
      if (adapter.required && (!manifestById.has(adapter.domainId) || !snapshot.data[adapter.domainId])) {
        errors.push({ code: "SNAPSHOT_REQUIRED_DOMAIN_MISSING", domainId: adapter.domainId });
      }
    });

    if (errors.length) return errorResult("SNAPSHOT_MANIFEST_INVALID", { errors });

    const staged = new Map();
    for (const adapter of adapters) {
      const payload = snapshot.data[adapter.domainId];
      if (!payload) continue;
      const manifest = manifestById.get(adapter.domainId);
      if (String(payload.schemaVersion || "") !== String(adapter.schemaVersion) || String(manifest?.schemaVersion || "") !== String(adapter.schemaVersion)) {
        errors.push({
          code: "SNAPSHOT_DOMAIN_SCHEMA_UNSUPPORTED",
          domainId: adapter.domainId,
          expectedSchemaVersion: adapter.schemaVersion,
          payloadSchemaVersion: payload.schemaVersion,
          manifestSchemaVersion: manifest?.schemaVersion
        });
        continue;
      }
      const validation = adapter.validateState(payload.state);
      if (!validation?.ok) {
        errors.push({ code: "SNAPSHOT_DOMAIN_VALIDATION_FAILED", domainId: adapter.domainId, errors: validation?.errors || [] });
        continue;
      }
      const checksum = app.checksumCampaignData(payload.state);
      if (checksum !== manifest.checksum) {
        errors.push({ code: "SNAPSHOT_DOMAIN_CHECKSUM_MISMATCH", domainId: adapter.domainId, expected: manifest.checksum, actual: checksum });
        continue;
      }
      const summary = adapter.summarizeState(payload.state) || {};
      if (Number(manifest.recordCount || 0) !== Number(summary.recordCount || 0)) {
        errors.push({ code: "SNAPSHOT_DOMAIN_RECORD_COUNT_MISMATCH", domainId: adapter.domainId, expected: manifest.recordCount, actual: summary.recordCount || 0 });
        continue;
      }
      const stage = adapter.stageImport(payload.state);
      if (!stage?.ok) {
        errors.push({ code: "SNAPSHOT_STAGE_FAILED", domainId: adapter.domainId, errors: stage?.errors || [] });
        continue;
      }
      staged.set(adapter.domainId, stage.staged);
    }

    if (errors.length) return errorResult("SNAPSHOT_DOMAIN_VALIDATION_FAILED", { errors });

    return {
      ok: true,
      snapshot,
      staged,
      summary: {
        domainCount: snapshot.domains.length,
        recordCount: snapshot.domains.reduce((sum, entry) => sum + Number(entry.recordCount || 0), 0),
        activeOperationCount: Number(snapshot.activeOperations?.count || 0),
        requiredDomainCount: adapters.filter((adapter) => adapter.required).length
      }
    };
  }

  function previewCampaignSnapshotV6(input) {
    const validation = validateCampaignSnapshotV6(input);
    if (!validation.ok) return validation;
    return {
      ok: true,
      schema: SNAPSHOT_SCHEMA,
      snapshotSchemaVersion: SNAPSHOT_SCHEMA_VERSION,
      exportedAt: validation.snapshot.exportedAt,
      projectStateVersion: validation.snapshot.projectStateVersion,
      campaignId: validation.snapshot.campaignId,
      summary: validation.summary,
      domains: validation.snapshot.domains.map(clone),
      omittedDomains: Array.isArray(validation.snapshot.omittedDomains) ? validation.snapshot.omittedDomains.map(clone) : [],
      activeOperations: clone(validation.snapshot.activeOperations || { policy: "EXPORT_AND_RESUME", count: 0, operationIds: [] })
    };
  }

  function persistBackup(snapshot, reason = "PRE_IMPORT_BACKUP") {
    const backup = {
      schema: `${SNAPSHOT_SCHEMA}-backup`,
      snapshotSchemaVersion: SNAPSHOT_SCHEMA_VERSION,
      createdAt: nowIso(),
      reason,
      payload: snapshot
    };
    try {
      window.localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backup));
      return { ok: true, backup };
    } catch (error) {
      return errorResult("SNAPSHOT_STAGE_FAILED", { reason: "PRE_IMPORT_BACKUP_PERSISTENCE_FAILED", message: String(error?.message || error) });
    }
  }

  function createCampaignImportBackupV6(reason = "PRE_IMPORT_BACKUP") {
    return persistBackup(exportCampaignSnapshotV6(), reason);
  }

  function getLastCampaignImportBackupV6() {
    try {
      const raw = window.localStorage.getItem(BACKUP_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function verifyStagedState(stagedById, expectedSnapshot = null) {
    const errors = [];
    persistentAdapters().forEach((adapter) => {
      const expectedState = stagedById.get(adapter.domainId);
      if (!expectedState) return;
      const actualState = adapter.exportState();
      const expectedChecksum = app.checksumCampaignData(expectedState);
      const actualChecksum = app.checksumCampaignData(actualState);
      if (expectedChecksum !== actualChecksum) {
        errors.push({ code: "SNAPSHOT_DOMAIN_VERIFY_FAILED", domainId: adapter.domainId, expected: expectedChecksum, actual: actualChecksum });
      }
      if (expectedSnapshot) {
        const manifest = expectedSnapshot.domains.find((entry) => entry.domainId === adapter.domainId);
        if (manifest && manifest.checksum !== actualChecksum) errors.push({ code: "SNAPSHOT_MANIFEST_VERIFY_FAILED", domainId: adapter.domainId, expected: manifest.checksum, actual: actualChecksum });
      }
    });
    return { ok: errors.length === 0, errors };
  }

  function rollbackToBackup(backupValidation) {
    const errors = [];
    const adapters = persistentAdapters();
    for (const adapter of adapters) {
      const staged = backupValidation.staged.get(adapter.domainId);
      if (!staged) continue;
      try {
        const result = adapter.restoreBackup(staged);
        if (result?.ok === false) errors.push({ code: "SNAPSHOT_ROLLBACK_DOMAIN_FAILED", domainId: adapter.domainId, result });
      } catch (error) {
        errors.push({ code: "SNAPSHOT_ROLLBACK_DOMAIN_FAILED", domainId: adapter.domainId, message: String(error?.message || error) });
      }
    }
    const verification = verifyStagedState(backupValidation.staged, backupValidation.snapshot);
    if (!verification.ok) errors.push(...verification.errors);
    return { ok: errors.length === 0, errors };
  }

  function importCampaignSnapshotV6(input, options = {}) {
    const flushed = flushCampaignDataIoSourceStores();
    if (!flushed.ok) return errorResult("SNAPSHOT_STAGE_FAILED", { reason: "SOURCE_STORE_FLUSH_FAILED", errors: flushed.errors });
    const validation = validateCampaignSnapshotV6(input, options);
    if (!validation.ok) return validation;

    const backupSnapshot = exportCampaignSnapshotV6({ flush: false });
    const backupValidation = validateCampaignSnapshotV6(backupSnapshot);
    if (!backupValidation.ok) return errorResult("SNAPSHOT_STAGE_FAILED", { reason: "PRE_IMPORT_BACKUP_INVALID", errors: backupValidation.error?.errors || [backupValidation.error] });
    const persistedBackup = persistBackup(backupSnapshot, "PRE_IMPORT_BACKUP");
    if (!persistedBackup.ok) return persistedBackup;

    const committedDomains = [];
    try {
      for (const adapter of persistentAdapters()) {
        const staged = validation.staged.get(adapter.domainId);
        if (!staged) continue;
        if (options.failCommitDomainId === adapter.domainId) throw new Error(`INJECTED_COMMIT_FAILURE:${adapter.domainId}`);
        const result = adapter.commitImport(staged);
        if (result?.ok === false) throw new Error(`DOMAIN_COMMIT_FAILED:${adapter.domainId}`);
        committedDomains.push(adapter.domainId);
      }
    } catch (error) {
      const rollback = rollbackToBackup(backupValidation);
      if (!rollback.ok) return errorResult("SNAPSHOT_ROLLBACK_FAILED", { originalCode: "SNAPSHOT_COMMIT_FAILED", committedDomains, rollbackErrors: rollback.errors, message: String(error?.message || error), reloadRequired: true });
      return errorResult("SNAPSHOT_COMMIT_FAILED", { committedDomains, rolledBack: true, message: String(error?.message || error), reloadRequired: true });
    }

    const verification = verifyStagedState(validation.staged, validation.snapshot);
    if (!verification.ok) {
      const rollback = rollbackToBackup(backupValidation);
      if (!rollback.ok) return errorResult("SNAPSHOT_ROLLBACK_FAILED", { originalCode: "SNAPSHOT_VERIFY_FAILED", verifyErrors: verification.errors, rollbackErrors: rollback.errors, reloadRequired: true });
      return errorResult("SNAPSHOT_VERIFY_FAILED", { errors: verification.errors, rolledBack: true, reloadRequired: true });
    }

    const reconcileErrors = [];
    for (const adapter of persistentAdapters()) {
      if (!validation.staged.has(adapter.domainId)) continue;
      if (options.failReconcileDomainId === adapter.domainId) {
        reconcileErrors.push({ code: "INJECTED_RECONCILIATION_FAILURE", domainId: adapter.domainId });
        break;
      }
      try {
        const result = adapter.reconcileState(validation.staged.get(adapter.domainId));
        if (result?.ok === false) reconcileErrors.push({ code: "SNAPSHOT_DOMAIN_RECONCILIATION_FAILED", domainId: adapter.domainId, errors: result.errors || [] });
      } catch (error) {
        reconcileErrors.push({ code: "SNAPSHOT_DOMAIN_RECONCILIATION_FAILED", domainId: adapter.domainId, message: String(error?.message || error) });
      }
    }

    if (reconcileErrors.length) {
      const rollback = rollbackToBackup(backupValidation);
      if (!rollback.ok) return errorResult("SNAPSHOT_ROLLBACK_FAILED", { originalCode: "SNAPSHOT_RECONCILIATION_FAILED", reconciliationErrors: reconcileErrors, rollbackErrors: rollback.errors, reloadRequired: true });
      return errorResult("SNAPSHOT_RECONCILIATION_FAILED", { errors: reconcileErrors, rolledBack: true, reloadRequired: true });
    }

    app.CAMPAIGN_DATA_IO_RELOAD_PENDING = true;
    return {
      ok: true,
      code: "SNAPSHOT_IMPORT_COMPLETE",
      importedDomains: committedDomains,
      domainCount: committedDomains.length,
      recordCount: validation.summary.recordCount,
      activeOperationCount: validation.summary.activeOperationCount,
      backupCreatedAt: persistedBackup.backup.createdAt,
      reloadRequired: true,
      reconciliationMode: "STARTUP_RELOAD"
    };
  }

  function resetCampaignStateV6(options = {}) {
    const flushed = flushCampaignDataIoSourceStores();
    if (!flushed.ok) return errorResult("SNAPSHOT_STAGE_FAILED", { reason: "SOURCE_STORE_FLUSH_FAILED", errors: flushed.errors });
    const backupSnapshot = exportCampaignSnapshotV6({ flush: false });
    const backupValidation = validateCampaignSnapshotV6(backupSnapshot);
    if (!backupValidation.ok) return errorResult("SNAPSHOT_STAGE_FAILED", { reason: "PRE_RESET_BACKUP_INVALID", errors: backupValidation.error?.errors || [backupValidation.error] });
    const persistedBackup = persistBackup(backupSnapshot, "PRE_RESET_BACKUP");
    if (!persistedBackup.ok) return persistedBackup;

    const resetDomains = [];
    try {
      for (const adapter of persistentAdapters()) {
        if (options.failResetDomainId === adapter.domainId) throw new Error(`INJECTED_RESET_FAILURE:${adapter.domainId}`);
        const result = adapter.resetState();
        if (result?.ok === false) throw new Error(`DOMAIN_RESET_FAILED:${adapter.domainId}`);
        resetDomains.push(adapter.domainId);
      }
    } catch (error) {
      const rollback = rollbackToBackup(backupValidation);
      if (!rollback.ok) return errorResult("SNAPSHOT_ROLLBACK_FAILED", { originalCode: "SNAPSHOT_COMMIT_FAILED", resetDomains, rollbackErrors: rollback.errors, message: String(error?.message || error), reloadRequired: true });
      return errorResult("SNAPSHOT_COMMIT_FAILED", { reason: "CAMPAIGN_RESET_FAILED", resetDomains, rolledBack: true, message: String(error?.message || error), reloadRequired: true });
    }

    app.CAMPAIGN_DATA_IO_RELOAD_PENDING = true;
    return {
      ok: true,
      code: "CAMPAIGN_STATE_RESET_COMPLETE",
      resetDomains,
      backupCreatedAt: persistedBackup.backup.createdAt,
      reloadRequired: true
    };
  }

  function getCampaignDataIoReadiness() {
    const registry = app.getCampaignDataIoRegistryDiagnostics?.() || { ready: false, errors: [{ code: "CAMPAIGN_DATA_REGISTRY_REQUIRED" }] };
    const required = persistentAdapters().filter((adapter) => adapter.required);
    let snapshotValidation = null;
    try { snapshotValidation = validateCampaignSnapshotV6(exportCampaignSnapshotV6({ flush: false })); }
    catch (error) { snapshotValidation = errorResult("SNAPSHOT_VERIFY_FAILED", { message: String(error?.message || error) }); }
    return {
      ready: registry.ready === true && snapshotValidation?.ok === true,
      snapshotSchema: SNAPSHOT_SCHEMA,
      snapshotSchemaVersion: SNAPSHOT_SCHEMA_VERSION,
      projectStateVersion: PROJECT_STATE_VERSION,
      adapterCount: registry.adapterCount || 0,
      campaignPersistentDomainCount: persistentAdapters().length,
      requiredDomainCount: required.length,
      activeOperationPolicy: "EXPORT_AND_RESUME",
      atomicImport: true,
      rollback: true,
      reloadAfterCommit: true,
      registry,
      selfSnapshotValid: snapshotValidation?.ok === true,
      errors: [
        ...(Array.isArray(registry.errors) ? registry.errors : []),
        ...(snapshotValidation?.ok ? [] : [snapshotValidation?.error || { code: "SNAPSHOT_VERIFY_FAILED" }])
      ]
    };
  }

  Object.assign(app, {
    CAMPAIGN_SNAPSHOT_SCHEMA: SNAPSHOT_SCHEMA,
    CAMPAIGN_SNAPSHOT_SCHEMA_VERSION: SNAPSHOT_SCHEMA_VERSION,
    exportCampaignSnapshotV6,
    previewCampaignSnapshotV6,
    validateCampaignSnapshotV6,
    importCampaignSnapshotV6,
    resetCampaignStateV6,
    getCampaignDataIoReadiness,
    isCampaignSnapshotV6,
    createCampaignImportBackupV6,
    getLastCampaignImportBackupV6,
    flushCampaignDataIoSourceStores
  });
})(window.WS_APP);
