window.WS_APP = window.WS_APP || {};

(function initKnowledgeRelationsModule() {
  const RELATION_SCHEMA = "future-noir.knowledge-relations";
  const RELATION_SCHEMA_VERSION = 1;
  const TARGET_REGISTRIES = new Set(["encyclopedia", "system", "system-index"]);
  const FIELD_TARGETS = {
    encyclopedia: {
      relatedTerms: "encyclopedia"
    },
    system: {
      relatedTerms: "encyclopedia",
      relatedRules: "system"
    },
    "system-index": {
      relatedTerms: "encyclopedia",
      relatedEntries: "system-index"
    }
  };

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function normalizeKey(value = "") {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function parseList(value) {
    const source = Array.isArray(value)
      ? value
      : String(value || "").split(/[\n,]/);

    return source
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  function normalizeRegistry(value) {
    const registry = String(value || "").trim().toLowerCase();
    if (registry === "systemindex" || registry === "system_index") return "system-index";
    return TARGET_REGISTRIES.has(registry) ? registry : "";
  }

  function isTombstone(record) {
    return record?.tombstone === true || record?._delete === true || record?.deleted === true;
  }

  function registryForRecord(record = {}, fallback = "") {
    const explicit = normalizeRegistry(record.registry);
    if (explicit) return explicit;
    return normalizeRegistry(fallback) || "encyclopedia";
  }

  function getPrimaryLabels(record = {}, registry = "") {
    if (registry === "encyclopedia") {
      return [record.term, record.localTerm, record.title];
    }
    return [record.title, record.localTitle];
  }

  function getAliasLabels(record = {}, registry = "") {
    return registry === "encyclopedia"
      ? (Array.isArray(record.aliases) ? record.aliases : [])
      : [];
  }

  function displayLabel(record = {}, registry = "") {
    if (registry === "encyclopedia") {
      return String(record.term || record.title || record.localTerm || record.id || "").trim();
    }
    return String(record.title || record.localTitle || record.id || "").trim();
  }

  function uniqueRecordsById(primary = [], fallback = []) {
    const byId = new Map();

    (Array.isArray(primary) ? primary : []).forEach((record) => {
      const id = String(record?.id || "").trim();
      if (id) byId.set(id, clone(record));
    });

    (Array.isArray(fallback) ? fallback : []).forEach((record) => {
      const id = String(record?.id || "").trim();
      if (id && !byId.has(id)) byId.set(id, clone(record));
    });

    return Array.from(byId.values());
  }

  function currentRegistries() {
    const systemRecords = window.WS_APP.getSystemRecords?.({ includeArchived: true }) || [];
    return {
      encyclopedia: window.WS_APP.getEntries?.({ includeArchived: true }) || [],
      system: systemRecords.filter((record) => registryForRecord(record, "system") === "system"),
      systemIndex: systemRecords.filter((record) => registryForRecord(record, "system-index") === "system-index")
    };
  }

  function normalizeRegistrySource(source = {}) {
    const systemRecords = Array.isArray(source.systemRecords) ? source.systemRecords : [];
    return {
      encyclopedia: Array.isArray(source.encyclopedia) ? source.encyclopedia : [],
      system: Array.isArray(source.system)
        ? source.system
        : systemRecords.filter((record) => registryForRecord(record, "system") === "system"),
      systemIndex: Array.isArray(source.systemIndex)
        ? source.systemIndex
        : systemRecords.filter((record) => registryForRecord(record, "system-index") === "system-index")
    };
  }

  function pushIndex(map, key, record) {
    if (!key) return;
    const bucket = map.get(key) || [];
    if (!bucket.some((item) => String(item.id) === String(record.id))) bucket.push(record);
    map.set(key, bucket);
  }

  function buildRegistryIndex(records, registry) {
    const index = {
      registry,
      byExactId: new Map(),
      byNormalizedId: new Map(),
      byPrimary: new Map(),
      byAlias: new Map()
    };

    (Array.isArray(records) ? records : []).forEach((record) => {
      if (!record || typeof record !== "object" || isTombstone(record)) return;
      const id = String(record.id || "").trim();
      if (!id) return;

      const normalized = clone(record);
      normalized.registry = registry;
      index.byExactId.set(id, normalized);
      pushIndex(index.byNormalizedId, normalizeKey(id), normalized);

      getPrimaryLabels(normalized, registry).forEach((label) => {
        pushIndex(index.byPrimary, normalizeKey(label), normalized);
      });

      getAliasLabels(normalized, registry).forEach((label) => {
        pushIndex(index.byAlias, normalizeKey(label), normalized);
      });
    });

    return index;
  }

  function createKnowledgeRelationResolver(source = {}, options = {}) {
    const supplied = normalizeRegistrySource(source);
    const fallback = options.includeCurrent === false
      ? { encyclopedia: [], system: [], systemIndex: [] }
      : normalizeRegistrySource(options.fallbackRegistries || currentRegistries());

    const registries = {
      encyclopedia: uniqueRecordsById(supplied.encyclopedia, fallback.encyclopedia),
      system: uniqueRecordsById(supplied.system, fallback.system),
      systemIndex: uniqueRecordsById(supplied.systemIndex, fallback.systemIndex)
    };

    return {
      schema: RELATION_SCHEMA,
      schemaVersion: RELATION_SCHEMA_VERSION,
      registries,
      indexes: {
        encyclopedia: buildRegistryIndex(registries.encyclopedia, "encyclopedia"),
        system: buildRegistryIndex(registries.system, "system"),
        "system-index": buildRegistryIndex(registries.systemIndex, "system-index")
      }
    };
  }

  function uniqueMatches(matches) {
    const byId = new Map();
    (Array.isArray(matches) ? matches : []).forEach((record) => {
      const id = String(record?.id || "").trim();
      if (id) byId.set(id, record);
    });
    return Array.from(byId.values());
  }

  function resolutionResult(reference, targetRegistry, record, method, candidates = []) {
    const raw = String(reference || "").trim();
    return {
      reference: raw,
      targetRegistry,
      resolved: Boolean(record),
      id: record ? String(record.id || "").trim() : "",
      label: record ? displayLabel(record, targetRegistry) : raw,
      method,
      ambiguous: !record && candidates.length > 1,
      candidates: candidates.map((candidate) => ({
        id: String(candidate.id || "").trim(),
        label: displayLabel(candidate, targetRegistry)
      })),
      record: record ? clone(record) : null
    };
  }

  function resolveKnowledgeRelation(reference, targetRegistry, options = {}) {
    const raw = String(reference || "").trim();
    const registry = normalizeRegistry(targetRegistry);
    if (!raw || !registry) return resolutionResult(raw, registry, null, "INVALID");

    const resolver = options.resolver || createKnowledgeRelationResolver(options.source || {}, options);
    const index = resolver.indexes?.[registry];
    if (!index) return resolutionResult(raw, registry, null, "REGISTRY_UNAVAILABLE");

    const exactId = index.byExactId.get(raw);
    if (exactId) return resolutionResult(raw, registry, exactId, "ID");

    const key = normalizeKey(raw);
    const normalizedId = uniqueMatches(index.byNormalizedId.get(key));
    if (normalizedId.length === 1) return resolutionResult(raw, registry, normalizedId[0], "NORMALIZED_ID");
    if (normalizedId.length > 1) return resolutionResult(raw, registry, null, "NORMALIZED_ID_AMBIGUOUS", normalizedId);

    const primary = uniqueMatches(index.byPrimary.get(key));
    if (primary.length === 1) return resolutionResult(raw, registry, primary[0], "PRIMARY_LABEL");
    if (primary.length > 1) return resolutionResult(raw, registry, null, "PRIMARY_LABEL_AMBIGUOUS", primary);

    const aliases = uniqueMatches(index.byAlias.get(key));
    if (aliases.length === 1) return resolutionResult(raw, registry, aliases[0], "ALIAS");
    if (aliases.length > 1) return resolutionResult(raw, registry, null, "ALIAS_AMBIGUOUS", aliases);

    return resolutionResult(raw, registry, null, "UNRESOLVED");
  }

  function normalizeKnowledgeRelationRefs(references, targetRegistry, options = {}) {
    const resolver = options.resolver || createKnowledgeRelationResolver(options.source || {}, options);
    const preserveUnresolved = options.preserveUnresolved !== false;
    const output = [];
    const report = options.report || null;

    parseList(references).forEach((reference) => {
      const resolution = resolveKnowledgeRelation(reference, targetRegistry, { resolver });
      let value = "";

      if (resolution.resolved) {
        value = resolution.id;
        if (report) {
          report.total += 1;
          if (String(reference) === resolution.id) report.alreadyCanonical += 1;
          else report.converted += 1;
        }
      } else {
        value = preserveUnresolved ? String(reference || "").trim() : "";
        if (report) {
          report.total += 1;
          const finding = {
            reference: String(reference || "").trim(),
            targetRegistry: normalizeRegistry(targetRegistry),
            reason: resolution.ambiguous ? "AMBIGUOUS" : "UNRESOLVED",
            candidates: resolution.candidates
          };
          if (resolution.ambiguous) {
            report.ambiguous += 1;
            report.ambiguousRefs.push(finding);
          } else {
            report.unresolved += 1;
            report.unresolvedRefs.push(finding);
          }
          if (value) report.preservedLegacy += 1;
        }
      }

      if (value && !output.includes(value)) output.push(value);
    });

    return output;
  }

  function createRelationReport() {
    return {
      total: 0,
      converted: 0,
      alreadyCanonical: 0,
      preservedLegacy: 0,
      unresolved: 0,
      ambiguous: 0,
      changedRecords: 0,
      unresolvedRefs: [],
      ambiguousRefs: []
    };
  }

  function stableSignature(value) {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value ?? "");
    }
  }

  function migrateRecordRelations(record, sourceRegistry, resolver, report) {
    const registry = registryForRecord(record, sourceRegistry);
    const targets = FIELD_TARGETS[registry] || {};
    const migrated = clone(record);
    const before = {};

    Object.entries(targets).forEach(([field, targetRegistry]) => {
      before[field] = clone(migrated[field] || (field === "relatedTerms" ? migrated.related : []) || []);
      const fieldReport = createRelationReport();
      migrated[field] = normalizeKnowledgeRelationRefs(
        migrated[field] || (field === "relatedTerms" ? migrated.related : []),
        targetRegistry,
        {
          resolver,
          preserveUnresolved: true,
          report: fieldReport
        }
      );

      report.total += fieldReport.total;
      report.converted += fieldReport.converted;
      report.alreadyCanonical += fieldReport.alreadyCanonical;
      report.preservedLegacy += fieldReport.preservedLegacy;
      report.unresolved += fieldReport.unresolved;
      report.ambiguous += fieldReport.ambiguous;
      fieldReport.unresolvedRefs.forEach((finding) => {
        report.unresolvedRefs.push({
          ...finding,
          sourceRegistry: registry,
          sourceId: String(migrated.id || "").trim(),
          field
        });
      });
      fieldReport.ambiguousRefs.forEach((finding) => {
        report.ambiguousRefs.push({
          ...finding,
          sourceRegistry: registry,
          sourceId: String(migrated.id || "").trim(),
          field
        });
      });
    });

    if (Object.prototype.hasOwnProperty.call(targets, "relatedTerms")) {
      migrated.related = migrated.relatedTerms;
    }

    const changed = Object.keys(targets).some((field) => (
      stableSignature(before[field]) !== stableSignature(migrated[field])
    ));

    if (changed) report.changedRecords += 1;
    return migrated;
  }

  function migrateKnowledgeRegistries(registries = {}, options = {}) {
    const source = normalizeRegistrySource(registries);
    const resolver = options.resolver || createKnowledgeRelationResolver(source, {
      includeCurrent: options.includeCurrent !== false,
      fallbackRegistries: options.fallbackRegistries
    });
    const report = createRelationReport();

    const migrated = {
      encyclopedia: source.encyclopedia.map((record) => (
        isTombstone(record)
          ? clone(record)
          : migrateRecordRelations(record, "encyclopedia", resolver, report)
      )),
      system: source.system.map((record) => (
        isTombstone(record)
          ? clone(record)
          : migrateRecordRelations(record, "system", resolver, report)
      )),
      systemIndex: source.systemIndex.map((record) => (
        isTombstone(record)
          ? clone(record)
          : migrateRecordRelations(record, "system-index", resolver, report)
      ))
    };

    return {
      schema: RELATION_SCHEMA,
      schemaVersion: RELATION_SCHEMA_VERSION,
      registries: migrated,
      report
    };
  }

  function validateKnowledgeRelations(registries = null, options = {}) {
    const source = normalizeRegistrySource(registries || currentRegistries());
    const resolver = options.resolver || createKnowledgeRelationResolver(source, {
      includeCurrent: options.includeCurrent !== false,
      fallbackRegistries: options.fallbackRegistries
    });
    const report = createRelationReport();

    [
      ["encyclopedia", source.encyclopedia],
      ["system", source.system],
      ["system-index", source.systemIndex]
    ].forEach(([sourceRegistry, records]) => {
      (Array.isArray(records) ? records : []).forEach((record) => {
        if (!record || isTombstone(record)) return;
        const targets = FIELD_TARGETS[sourceRegistry] || {};
        Object.entries(targets).forEach(([field, targetRegistry]) => {
          parseList(record[field] || (field === "relatedTerms" ? record.related : [])).forEach((reference) => {
            const resolution = resolveKnowledgeRelation(reference, targetRegistry, { resolver });
            report.total += 1;
            if (resolution.resolved) {
              if (String(reference) === resolution.id) report.alreadyCanonical += 1;
              else report.converted += 1;
              return;
            }

            const finding = {
              sourceRegistry,
              sourceId: String(record.id || "").trim(),
              field,
              reference: String(reference || "").trim(),
              targetRegistry,
              reason: resolution.ambiguous ? "AMBIGUOUS" : "UNRESOLVED",
              candidates: resolution.candidates
            };
            report.preservedLegacy += 1;
            if (resolution.ambiguous) {
              report.ambiguous += 1;
              report.ambiguousRefs.push(finding);
            } else {
              report.unresolved += 1;
              report.unresolvedRefs.push(finding);
            }
          });
        });
      });
    });

    return {
      ok: report.unresolved === 0 && report.ambiguous === 0,
      schema: RELATION_SCHEMA,
      schemaVersion: RELATION_SCHEMA_VERSION,
      report
    };
  }

  function getKnowledgeRelationLabels(references, targetRegistry, options = {}) {
    const resolver = options.resolver || createKnowledgeRelationResolver(options.source || {}, options);
    return parseList(references).map((reference) => {
      const resolution = resolveKnowledgeRelation(reference, targetRegistry, { resolver });
      return resolution.resolved ? resolution.label : String(reference || "").trim();
    }).filter(Boolean);
  }

  function formatKnowledgeRelationRefsForEditor(references, targetRegistry, options = {}) {
    return getKnowledgeRelationLabels(references, targetRegistry, options);
  }

  function migrateRuntimeRelations() {
    if (
      typeof window.WS_APP.getEntries !== "function"
      || typeof window.WS_APP.getSystemRecords !== "function"
      || typeof window.WS_APP.importEntries !== "function"
      || typeof window.WS_APP.importSystemRecords !== "function"
    ) {
      return {
        ok: false,
        error: "KNOWLEDGE_RELATION_STORES_UNAVAILABLE"
      };
    }

    const current = currentRegistries();
    const migration = migrateKnowledgeRegistries(current, { includeCurrent: false });
    const report = migration.report;

    if (report.changedRecords > 0) {
      window.WS_APP.importEntries(migration.registries.encyclopedia, {
        mode: "replace",
        source: "knowledge-relation-id-migration"
      });
      window.WS_APP.importSystemRecords([
        ...migration.registries.system,
        ...migration.registries.systemIndex
      ], {
        mode: "replace",
        source: "knowledge-relation-id-migration"
      });
    }

    const result = {
      ok: report.unresolved === 0 && report.ambiguous === 0,
      changed: report.changedRecords > 0,
      report
    };

    window.dispatchEvent(new CustomEvent("ws:knowledge-relations-migrated", {
      detail: clone(result)
    }));

    return result;
  }

  window.WS_APP.KNOWLEDGE_RELATION_SCHEMA = RELATION_SCHEMA;
  window.WS_APP.KNOWLEDGE_RELATION_SCHEMA_VERSION = RELATION_SCHEMA_VERSION;
  window.WS_APP.createKnowledgeRelationResolver = createKnowledgeRelationResolver;
  window.WS_APP.resolveKnowledgeRelation = resolveKnowledgeRelation;
  window.WS_APP.normalizeKnowledgeRelationRefs = normalizeKnowledgeRelationRefs;
  window.WS_APP.migrateKnowledgeRegistries = migrateKnowledgeRegistries;
  window.WS_APP.validateKnowledgeRelations = validateKnowledgeRelations;
  window.WS_APP.getKnowledgeRelationLabels = getKnowledgeRelationLabels;
  window.WS_APP.formatKnowledgeRelationRefsForEditor = formatKnowledgeRelationRefsForEditor;
  window.WS_APP.migrateRuntimeKnowledgeRelations = migrateRuntimeRelations;

  migrateRuntimeRelations();
})();
