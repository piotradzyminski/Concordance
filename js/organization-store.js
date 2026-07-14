window.WS_APP = window.WS_APP || {};

(function initOrganizationStoreModule() {
  let organizationStore = [];
  let organizationLocationStore = [];

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value ?? null));
    }
  }

  function normalizeKey(value = "") {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function parseList(value) {
    if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
    return String(value || "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeAccessTag(value = "PUBLIC") {
    const tag = String(value || "PUBLIC").trim().toUpperCase();
    return ["PUBLIC", "RESTRICTED", "CONFIDENTIAL", "BLACK", "GAME_MASTER", "GM"].includes(tag) ? tag : "PUBLIC";
  }

  function normalizeOrganization(record = {}) {
    const source = record && typeof record === "object" && !Array.isArray(record) ? record : {};
    const name = String(source.name || source.title || source.id || "Organization").trim();
    const id = String(source.id || normalizeKey(name) || "organization").trim();

    return {
      ...source,
      id,
      name,
      shortName: String(source.shortName || source.abbreviation || name).trim(),
      type: String(source.type || "ORGANIZATION").trim().toUpperCase(),
      status: String(source.status || source.type || "ORGANIZATION").trim().toUpperCase(),
      accessTag: normalizeAccessTag(source.accessTag || source.clearance || "PUBLIC"),
      providerIds: parseList(source.providerIds).map(normalizeKey).filter(Boolean),
      tags: parseList(source.tags).map((tag) => tag.toUpperCase()),
      domains: parseList(source.domains),
      primaryLocationId: String(source.primaryLocationId || "").trim(),
      knownHeadquartersLocationId: String(source.knownHeadquartersLocationId || source.headquartersLocationId || "").trim(),
      sourceStatus: String(source.sourceStatus || "CANONICAL").trim().toUpperCase(),
      notes: String(source.notes || source.note || "").trim(),
      archived: source.archived === true
    };
  }

  function getAddressVisibleAddress(addressId = "") {
    if (!addressId || typeof window.WS_APP.getAddressById !== "function") return "";
    return String(window.WS_APP.getAddressById(addressId)?.visibleAddress || "").trim();
  }

  function normalizeOrganizationLocation(record = {}) {
    const source = record && typeof record === "object" && !Array.isArray(record) ? record : {};
    const name = String(source.name || source.title || source.id || "Organization Location").trim();
    const id = String(source.id || normalizeKey(`${source.organizationId || "org"}-${name}`) || "organization-location").trim();
    const addressId = String(source.addressId || "").trim();
    const visibleAddress = String(source.visibleAddress || getAddressVisibleAddress(addressId) || "").trim().toUpperCase();

    return {
      ...source,
      id,
      organizationId: String(source.organizationId || "").trim(),
      name,
      locationType: String(source.locationType || "LOCATION").trim().toUpperCase(),
      facilityStatus: String(source.facilityStatus || "LOCAL_NODE").trim().toUpperCase(),
      addressId,
      visibleAddress,
      accessTag: normalizeAccessTag(source.accessTag || source.clearance || "RESTRICTED"),
      functions: parseList(source.functions),
      linkedSystems: parseList(source.linkedSystems).map((entry) => entry.toUpperCase()),
      marketVendorId: String(source.marketVendorId || source.vendorId || "").trim(),
      sourceInstitutionId: String(source.sourceInstitutionId || source.institutionId || id).trim(),
      isPrimary: source.isPrimary === true,
      isHeadquarters: source.isHeadquarters === true,
      sourceStatus: String(source.sourceStatus || "CANONICAL").trim().toUpperCase(),
      sourceNote: String(source.sourceNote || source.note || "").trim(),
      archived: source.archived === true
    };
  }

  function getBaseOrganizations() {
    return (Array.isArray(window.APP_DATA?.organizations) ? window.APP_DATA.organizations : [])
      .filter(Boolean)
      .map((record) => normalizeOrganization(record));
  }

  function getBaseOrganizationLocations() {
    return (Array.isArray(window.APP_DATA?.organizationLocations) ? window.APP_DATA.organizationLocations : [])
      .filter(Boolean)
      .map((record) => normalizeOrganizationLocation(record));
  }

  function matchesOrganization(record = {}, query = "") {
    const key = normalizeKey(query);
    if (!key) return false;
    const candidates = [
      record.id,
      record.name,
      record.shortName,
      ...(record.providerIds || []),
      ...(record.tags || []),
      ...(record.domains || [])
    ].map(normalizeKey).filter(Boolean);
    return candidates.includes(key);
  }

  window.WS_APP.initOrganizationStore = function initOrganizationStore() {
    organizationStore = getBaseOrganizations();
    organizationLocationStore = getBaseOrganizationLocations();
    return {
      organizations: window.WS_APP.getOrganizations({ includeArchived: true }),
      locations: window.WS_APP.getOrganizationLocations({ includeArchived: true })
    };
  };

  window.WS_APP.getOrganizations = function getOrganizations(options = {}) {
    const includeArchived = options.includeArchived === true;
    const records = includeArchived ? organizationStore : organizationStore.filter((record) => !record.archived);
    return clone(records);
  };

  window.WS_APP.getOrganizationLocations = function getOrganizationLocations(options = {}) {
    const includeArchived = options.includeArchived === true;
    const records = includeArchived ? organizationLocationStore : organizationLocationStore.filter((record) => !record.archived);
    return clone(records);
  };

  window.WS_APP.getOrganizationById = function getOrganizationById(id = "") {
    const key = String(id || "").trim();
    const record = organizationStore.find((item) => item.id === key);
    return record ? clone(record) : null;
  };

  window.WS_APP.getOrganizationByProviderId = function getOrganizationByProviderId(providerId = "") {
    const key = normalizeKey(providerId);
    const record = organizationStore.find((item) => (item.providerIds || []).map(normalizeKey).includes(key));
    return record ? clone(record) : null;
  };

  window.WS_APP.findOrganization = function findOrganization(query = "") {
    const record = organizationStore.find((item) => matchesOrganization(item, query));
    return record ? clone(record) : null;
  };

  window.WS_APP.getOrganizationLocationById = function getOrganizationLocationById(id = "") {
    const key = String(id || "").trim();
    const record = organizationLocationStore.find((item) => item.id === key);
    return record ? clone(record) : null;
  };

  window.WS_APP.getOrganizationLocationsByOrganizationId = function getOrganizationLocationsByOrganizationId(organizationId = "", options = {}) {
    const includeArchived = options.includeArchived === true;
    const records = organizationLocationStore.filter((item) => item.organizationId === organizationId && (includeArchived || !item.archived));
    return clone(records);
  };

  window.WS_APP.getPrimaryOrganizationLocation = function getPrimaryOrganizationLocation(organizationId = "", options = {}) {
    const organization = organizationStore.find((item) => item.id === organizationId);
    if (!organization) return null;

    const locations = organizationLocationStore.filter((item) => item.organizationId === organization.id && !item.archived);
    const headquartersId = String(organization.knownHeadquartersLocationId || "").trim();
    const primaryId = String(organization.primaryLocationId || "").trim();
    const strictHeadquarters = options.strictHeadquarters === true;

    const byHeadquarters = headquartersId ? locations.find((item) => item.id === headquartersId) : null;
    if (byHeadquarters) return clone(byHeadquarters);
    if (strictHeadquarters) return null;

    const byPrimary = primaryId ? locations.find((item) => item.id === primaryId) : null;
    const byFlag = locations.find((item) => item.isPrimary || item.isHeadquarters);
    return clone(byPrimary || byFlag || locations[0] || null);
  };

  window.WS_APP.resolveOrganizationLocationForProvider = function resolveOrganizationLocationForProvider(providerIdOrName = "", options = {}) {
    const organization = window.WS_APP.getOrganizationByProviderId(providerIdOrName)
      || window.WS_APP.findOrganization(providerIdOrName);
    if (!organization) return null;
    return window.WS_APP.getPrimaryOrganizationLocation(organization.id, options);
  };

  window.WS_APP.resolveOrganizationLocationSource = function resolveOrganizationLocationSource(locationId = "") {
    const location = window.WS_APP.getOrganizationLocationById(locationId);
    if (!location) return null;
    const organization = location.organizationId ? window.WS_APP.getOrganizationById(location.organizationId) : null;
    return {
      organizationId: organization?.id || location.organizationId || "",
      organizationName: organization?.name || "",
      organizationLocationId: location.id,
      locationName: location.name,
      locationType: location.locationType,
      marketVendorId: location.marketVendorId || "",
      sourceInstitutionId: location.sourceInstitutionId || location.id,
      sourceAddress: location.visibleAddress || "",
      accessTag: location.accessTag || "RESTRICTED",
      sourceStatus: location.sourceStatus || "CANONICAL"
    };
  };

  window.WS_APP.initOrganizationStore();
})();
