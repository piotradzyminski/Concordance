(function initCyberwareTaxonomyApi() {
  window.WS_APP = window.WS_APP || {};
  const app = window.WS_APP;
  const data = window.WS_APP_DATA?.CYBERWARE_TAXONOMY || {};

  const token = (value) => String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  const id = (value) => String(value || "").trim();
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const indexById = (records = []) => new Map(records.map((record) => [record.id, record]));

  const regionById = indexById(data.bodyRegions);
  const slotById = indexById(data.bodySlots);
  const groupById = indexById(data.slotGroups);
  const layerById = indexById(data.systemicLayers);
  const familyById = indexById(data.implantFamilies);
  const subtypeById = indexById(data.implantSubtypes);
  const bodySlotIds = new Set(slotById.keys());
  const regionIds = new Set(regionById.keys());
  const groupIds = new Set(groupById.keys());
  const layerIds = new Set(layerById.keys());

  function getCyberwareTaxonomy() { return clone(data); }
  function getCyberwareBodyRegion(regionId) { return clone(regionById.get(token(regionId)) || null); }
  function getCyberwareBodySlot(slotId) { return clone(slotById.get(token(slotId)) || null); }
  function getCyberwareSlotGroup(groupId) { return clone(groupById.get(token(groupId)) || null); }
  function getCyberwareSystemicLayer(layerId) { return clone(layerById.get(token(layerId)) || null); }
  function getCyberwareImplantFamily(familyId) { return clone(familyById.get(token(familyId)) || null); }
  function getCyberwareImplantSubtype(subtypeId) { return clone(subtypeById.get(token(subtypeId)) || null); }

  function resolveLegacyCyberwareSlotId(slotId) {
    const raw = id(slotId);
    if (!raw) return { ok: false, source: raw, reason: "CYBERWARE_BODY_SLOT_REQUIRED" };
    const canonical = token(raw);
    if (bodySlotIds.has(canonical)) return { ok: true, source: raw, bodySlotId: canonical, migrated: false };
    const alias = data.legacySlotAliases?.[raw];
    if (alias) return { ok: true, source: raw, bodySlotId: alias, migrated: true };
    const reviewCode = data.legacyReviewCodes?.[raw];
    if (reviewCode) return { ok: false, source: raw, reason: reviewCode, reviewRequired: true };
    return { ok: false, source: raw, reason: "CYBERWARE_BODY_SLOT_UNKNOWN" };
  }

  function resolveLegacyCyberwareSlotIds(slotIds = []) {
    const results = (Array.isArray(slotIds) ? slotIds : [slotIds]).map(resolveLegacyCyberwareSlotId);
    const bodySlots = [...new Set(results.filter((result) => result.ok).map((result) => result.bodySlotId))];
    const blockers = [...new Set(results.filter((result) => !result.ok).map((result) => result.reason))];
    return { ok: blockers.length === 0, bodySlots, blockers, results };
  }

  function normalizeCyberwareInstallation(installation = {}) {
    const sourceSlots = installation.bodySlots || installation.slotIds || installation.slots || [];
    const resolved = resolveLegacyCyberwareSlotIds(sourceSlots);
    const mode = token(installation.mode || (resolved.bodySlots.length > 1 ? "MULTI_PART" : "SINGLE"));
    const regionId = token(installation.regionId || "");
    const slotGroupId = token(installation.slotGroupId || "");
    const systemicLayer = token(installation.systemicLayer || "");
    const coverageRegions = [...new Set((Array.isArray(installation.coverageRegions) ? installation.coverageRegions : []).map(token).filter(Boolean))];
    return {
      anatomySchemaVersion: Number(installation.anatomySchemaVersion || data.schemaVersion || 2),
      mode,
      regionId,
      slotGroupId,
      bodySlots: resolved.bodySlots,
      systemicLayer,
      coverageRegions,
      taxonomyBlockers: resolved.blockers
    };
  }

  function validateCyberwareDefinitionTaxonomy(definition = {}) {
    const errors = [];
    const warnings = [];
    const taxonomy = definition.taxonomy || {};
    const installation = normalizeCyberwareInstallation(definition.installation || {
      bodySlots: definition.bodySlots || definition.slots || [],
      regionId: definition.regionId,
      slotGroupId: definition.slotGroupId,
      systemicLayer: definition.systemicLayer,
      coverageRegions: definition.coverageRegions
    });
    const family = token(taxonomy.family || definition.implantFamily || definition.family);
    const subtype = token(taxonomy.subtype || definition.implantSubtype || definition.subtype);
    const capabilities = [...new Set((taxonomy.capabilities || definition.capabilities || []).map(token).filter(Boolean))];

    if (family && !familyById.has(family)) errors.push("CYBERWARE_IMPLANT_FAMILY_UNKNOWN");
    if (subtype && !subtypeById.has(subtype)) errors.push("CYBERWARE_IMPLANT_SUBTYPE_UNKNOWN");
    if (family && subtype && subtypeById.get(subtype)?.familyId !== family) errors.push("CYBERWARE_IMPLANT_FAMILY_SUBTYPE_MISMATCH");
    if (installation.regionId && !regionIds.has(installation.regionId)) errors.push("CYBERWARE_BODY_REGION_UNKNOWN");
    if (installation.slotGroupId && !groupIds.has(installation.slotGroupId)) errors.push("CYBERWARE_SLOT_GROUP_UNKNOWN");
    if (installation.systemicLayer && !layerIds.has(installation.systemicLayer)) errors.push("CYBERWARE_SYSTEMIC_LAYER_UNKNOWN");
    errors.push(...installation.taxonomyBlockers);

    const capabilityCollisions = capabilities.filter((capability) => bodySlotIds.has(capability) || groupIds.has(capability));
    if (capabilityCollisions.length) errors.push("CYBERWARE_CAPABILITY_USES_ANATOMY_ID");

    if (installation.slotGroupId) {
      const group = groupById.get(installation.slotGroupId);
      const allowed = new Set((group?.columns || []).map((column) => column.bodySlotId));
      if (installation.bodySlots.some((slotId) => !allowed.has(slotId))) errors.push("CYBERWARE_SLOT_GROUP_FOOTPRINT_MISMATCH");
    }

    if (installation.systemicLayer) {
      if (!installation.coverageRegions.length) errors.push("CYBERWARE_SYSTEMIC_COVERAGE_UNDEFINED");
      if (installation.bodySlots.length) warnings.push("CYBERWARE_SYSTEMIC_LAYER_SHOULD_USE_COVERAGE");
      if (subtype && subtype !== installation.systemicLayer) warnings.push("CYBERWARE_SYSTEMIC_SUBTYPE_LAYER_MISMATCH");
    } else if (!installation.bodySlots.length) {
      warnings.push("CYBERWARE_BODY_FOOTPRINT_UNDEFINED");
    }

    if (installation.bodySlots.includes("LEFT_EYE") && installation.bodySlots.includes("RIGHT_EYE") && installation.slotGroupId === "EYES") {
      errors.push("CYBERWARE_EYES_MUST_REMAIN_SEPARATE_REGIONS");
    }

    return {
      ok: errors.length === 0,
      schemaVersion: data.schemaVersion || 2,
      family,
      subtype,
      capabilities,
      installation,
      errors: [...new Set(errors)],
      warnings: [...new Set(warnings)]
    };
  }

  function getCyberwareTaxonomyMigrationReport(definitions = []) {
    const records = (Array.isArray(definitions) ? definitions : []).map((definition) => ({
      definitionId: id(definition.definitionId || definition.id || definition.catalogId),
      ...validateCyberwareDefinitionTaxonomy(definition)
    }));
    return {
      schemaVersion: data.schemaVersion || 2,
      total: records.length,
      valid: records.filter((record) => record.ok).length,
      reviewRequired: records.filter((record) => !record.ok || record.warnings.length).length,
      records
    };
  }

  const api = Object.freeze({
    schemaVersion: data.schemaVersion || 2,
    getCyberwareTaxonomy,
    getCyberwareBodyRegion,
    getCyberwareBodySlot,
    getCyberwareSlotGroup,
    getCyberwareSystemicLayer,
    getCyberwareImplantFamily,
    getCyberwareImplantSubtype,
    resolveLegacyCyberwareSlotId,
    resolveLegacyCyberwareSlotIds,
    normalizeCyberwareInstallation,
    validateCyberwareDefinitionTaxonomy,
    getCyberwareTaxonomyMigrationReport
  });

  app.cyberwareTaxonomy = api;
  Object.assign(app, api);
})();
