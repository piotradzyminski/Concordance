window.WS_APP = window.WS_APP || {};

(function initDatabaseRelationsModule(app) {
  "use strict";

  const SCHEMA_VERSION = "database_record_relations_1_0x";

  function clone(value) {
    if (value === undefined) return undefined;
    try { return structuredClone(value); }
    catch (error) { return JSON.parse(JSON.stringify(value ?? null)); }
  }

  function normalizeId(value = "") {
    return String(value || "").trim();
  }

  function normalizeIds(value) {
    const source = Array.isArray(value)
      ? value
      : String(value || "").split(/[\n,]/g);
    return Array.from(new Set(source.map(normalizeId).filter(Boolean)));
  }

  function getAllCitizens() {
    return app.getCitizens?.({ includeArchived: true }) || window.APP_DATA?.citizens || [];
  }

  function getAllCitizenFiles() {
    return app.getCitizenFiles?.({ includeArchived: true, enforceAccess: false }) || [];
  }

  function getAllCaseFiles() {
    return app.getCaseFiles?.({ includeArchived: true }) || [];
  }

  function indexRecords(records, keySelector) {
    const index = new Map();
    (Array.isArray(records) ? records : []).forEach((record) => {
      const key = normalizeId(keySelector(record));
      if (key) index.set(key, record);
    });
    return index;
  }

  function buildIndexes() {
    const citizens = getAllCitizens();
    const citizenFiles = getAllCitizenFiles();
    const caseFiles = getAllCaseFiles();
    return {
      citizens,
      citizenFiles,
      caseFiles,
      citizenById: indexRecords(citizens, (record) => record?.id),
      citizenFileById: indexRecords(citizenFiles, (record) => record?.fileId || record?.id),
      caseFileById: indexRecords(caseFiles, (record) => record?.id || record?.caseFileId)
    };
  }

  function canReadCitizen(user, citizen) {
    if (!citizen) return false;
    if (String(user?.role || "").toLowerCase() === "admin") return true;
    if (citizen.id === user?.citizenId) return true;
    if (citizen.playerVisible !== true) return false;
    return typeof app.canAccessRecord === "function" ? app.canAccessRecord(user, citizen) : true;
  }

  function canReadCitizenFile(user, record) {
    if (!record) return false;
    if (typeof app.canAccessCitizenFile === "function") return app.canAccessCitizenFile(user, record);
    return String(user?.role || "").toLowerCase() === "admin" || record.citizenId === user?.citizenId;
  }

  function canReadCaseFile(user, record) {
    if (!record) return false;
    if (String(user?.role || "").toLowerCase() === "admin") return true;
    if (record.archived === true) return false;
    if (typeof app.canAccessRecord === "function" && app.canAccessRecord(user, record)) return true;
    const relatedCitizenIds = normalizeIds(record.relatedCitizens);
    const clearance = String(record.clearance || "RESTRICTED").toUpperCase();
    return relatedCitizenIds.includes(user?.citizenId)
      && !["BLACK", "GM", "GAME_MASTER"].includes(clearance);
  }

  function resolveCitizenRelations(citizenId, options = {}) {
    const id = normalizeId(citizenId);
    const user = options.user || app.currentUser;
    const includeArchived = options.includeArchived === true;
    const indexes = buildIndexes();
    const citizen = indexes.citizenById.get(id) || null;
    const citizenFiles = indexes.citizenFiles
      .filter((record) => record.citizenId === id)
      .filter((record) => includeArchived || !record.archived)
      .filter((record) => canReadCitizenFile(user, record));
    const citizenFileIds = new Set(citizenFiles.map((record) => record.fileId));
    const caseFiles = indexes.caseFiles
      .filter((record) => includeArchived || !record.archived)
      .filter((record) => {
        const direct = normalizeIds(record.relatedCitizens).includes(id);
        const viaFile = normalizeIds(record.relatedCitizenFileIds).some((fileId) => citizenFileIds.has(fileId));
        const inbound = citizenFiles.some((file) => normalizeIds(file.relatedCaseFileIds).includes(record.id));
        return direct || viaFile || inbound;
      })
      .filter((record) => canReadCaseFile(user, record));

    return clone({
      schemaVersion: SCHEMA_VERSION,
      citizen: canReadCitizen(user, citizen) ? citizen : null,
      citizenFiles,
      caseFiles
    });
  }

  function resolveCitizenFileRelations(fileId, options = {}) {
    const id = normalizeId(fileId);
    const user = options.user || app.currentUser;
    const includeArchived = options.includeArchived === true;
    const indexes = buildIndexes();
    const citizenFile = indexes.citizenFileById.get(id) || null;
    if (!citizenFile || !canReadCitizenFile(user, citizenFile)) {
      return clone({ schemaVersion: SCHEMA_VERSION, citizenFile: null, citizen: null, caseFiles: [], missingCaseFileIds: [] });
    }

    const directCaseIds = normalizeIds(citizenFile.relatedCaseFileIds);
    const inboundCaseIds = indexes.caseFiles
      .filter((record) => normalizeIds(record.relatedCitizenFileIds).includes(id))
      .map((record) => record.id);
    const caseIds = normalizeIds([...directCaseIds, ...inboundCaseIds]);
    const caseFiles = caseIds
      .map((caseId) => indexes.caseFileById.get(caseId))
      .filter(Boolean)
      .filter((record) => includeArchived || !record.archived)
      .filter((record) => canReadCaseFile(user, record));
    const missingCaseFileIds = caseIds.filter((caseId) => !indexes.caseFileById.has(caseId));
    const citizen = indexes.citizenById.get(citizenFile.citizenId) || null;

    return clone({
      schemaVersion: SCHEMA_VERSION,
      citizenFile,
      citizen: canReadCitizen(user, citizen) ? citizen : null,
      caseFiles,
      missingCaseFileIds
    });
  }

  function resolveCaseFileRelations(caseFileId, options = {}) {
    const id = normalizeId(caseFileId);
    const user = options.user || app.currentUser;
    const includeArchived = options.includeArchived === true;
    const indexes = buildIndexes();
    const caseFile = indexes.caseFileById.get(id) || null;
    if (!caseFile || !canReadCaseFile(user, caseFile)) {
      return clone({ schemaVersion: SCHEMA_VERSION, caseFile: null, citizens: [], citizenFiles: [], missingCitizenIds: [], missingCitizenFileIds: [] });
    }

    const directFileIds = normalizeIds(caseFile.relatedCitizenFileIds);
    const inboundFileIds = indexes.citizenFiles
      .filter((record) => normalizeIds(record.relatedCaseFileIds).includes(id))
      .map((record) => record.fileId);
    const citizenFileIds = normalizeIds([...directFileIds, ...inboundFileIds]);
    const citizenFiles = citizenFileIds
      .map((fileId) => indexes.citizenFileById.get(fileId))
      .filter(Boolean)
      .filter((record) => includeArchived || !record.archived)
      .filter((record) => canReadCitizenFile(user, record));

    const directCitizenIds = normalizeIds(caseFile.relatedCitizens);
    const inferredCitizenIds = citizenFiles.map((record) => record.citizenId);
    const citizenIds = normalizeIds([...directCitizenIds, ...inferredCitizenIds]);
    const citizens = citizenIds
      .map((citizenId) => indexes.citizenById.get(citizenId))
      .filter(Boolean)
      .filter((record) => canReadCitizen(user, record));

    return clone({
      schemaVersion: SCHEMA_VERSION,
      caseFile,
      citizens,
      citizenFiles,
      missingCitizenIds: citizenIds.filter((citizenId) => !indexes.citizenById.has(citizenId)),
      missingCitizenFileIds: citizenFileIds.filter((fileId) => !indexes.citizenFileById.has(fileId))
    });
  }

  function getDatabaseRecordRelationDiagnostics() {
    const indexes = buildIndexes();
    const errors = [];
    const warnings = [];

    indexes.citizenFiles.forEach((record) => {
      if (!indexes.citizenById.has(record.citizenId)) {
        errors.push({ code: "DATABASE_RELATION_CITIZEN_MISSING", sourceType: "CITIZEN_FILE", sourceId: record.fileId, targetId: record.citizenId });
      }
      normalizeIds(record.relatedCaseFileIds).forEach((caseId) => {
        if (!indexes.caseFileById.has(caseId)) {
          errors.push({ code: "DATABASE_RELATION_CASE_FILE_MISSING", sourceType: "CITIZEN_FILE", sourceId: record.fileId, targetId: caseId });
          return;
        }
        const caseFile = indexes.caseFileById.get(caseId);
        if (!normalizeIds(caseFile.relatedCitizenFileIds).includes(record.fileId)) {
          warnings.push({ code: "DATABASE_RELATION_RECIPROCAL_CASE_LINK_MISSING", sourceType: "CITIZEN_FILE", sourceId: record.fileId, targetId: caseId });
        }
      });
    });

    indexes.caseFiles.forEach((record) => {
      normalizeIds(record.relatedCitizens).forEach((citizenId) => {
        if (!indexes.citizenById.has(citizenId)) {
          errors.push({ code: "DATABASE_RELATION_CITIZEN_MISSING", sourceType: "CASE_FILE", sourceId: record.id, targetId: citizenId });
        }
      });
      normalizeIds(record.relatedCitizenFileIds).forEach((fileId) => {
        if (!indexes.citizenFileById.has(fileId)) {
          errors.push({ code: "DATABASE_RELATION_CITIZEN_FILE_MISSING", sourceType: "CASE_FILE", sourceId: record.id, targetId: fileId });
          return;
        }
        const citizenFile = indexes.citizenFileById.get(fileId);
        if (!normalizeIds(citizenFile.relatedCaseFileIds).includes(record.id)) {
          warnings.push({ code: "DATABASE_RELATION_RECIPROCAL_FILE_LINK_MISSING", sourceType: "CASE_FILE", sourceId: record.id, targetId: fileId });
        }
      });
    });

    return clone({
      ready: errors.length === 0,
      schemaVersion: SCHEMA_VERSION,
      citizenCount: indexes.citizens.length,
      citizenFileCount: indexes.citizenFiles.length,
      caseFileCount: indexes.caseFiles.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      errors,
      warnings
    });
  }

  Object.assign(app, {
    DATABASE_RECORD_RELATION_SCHEMA_VERSION: SCHEMA_VERSION,
    normalizeDatabaseRelationIds: normalizeIds,
    getCitizenRecordRelations: resolveCitizenRelations,
    getCitizenFileRelations: resolveCitizenFileRelations,
    getCaseFileRelations: resolveCaseFileRelations,
    getDatabaseRecordRelationDiagnostics
  });
})(window.WS_APP);
