window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.marketOfferConfig = {
  schemaVersion: 1,
  defaultAvailability: "AVAILABLE",
  defaultStockMode: "UNLIMITED",
  defaultCurrency: "CREDIT",
  defaultFulfillmentOptions: ["DELIVER_TO_HOUSING", "PICKUP"],
  pickupFulfillment: {
    schemaVersion: 1,
    defaultReservationDays: 3,
    minReservationDays: 1,
    maxReservationDays: 30
  },
  deliveryFulfillment: {
    schemaVersion: 1,
    defaultShippingDays: 2,
    minShippingDays: 1,
    maxShippingDays: 30
  },
  serviceFulfillment: {
    schemaVersion: 1,
    defaultServiceDefinitionId: "svc-cyberware-install-standard",
    fallbackProviderIds: [
      "provider-perfectmin-licensed-clinics",
      "provider-coremed-service",
      "provider-trauma-team"
    ],
    manufacturerProviderIds: {
      "COREMED": ["provider-coremed-service", "provider-perfectmin-licensed-clinics"],
      "TRAUMA": ["provider-trauma-team", "provider-perfectmin-licensed-clinics"],
      "TRAUMA TEAM": ["provider-trauma-team", "provider-perfectmin-licensed-clinics"],
      "MASS COMPRESSION": ["provider-mass-compression-service", "provider-perfectmin-licensed-clinics"],
      "MASS COMPRESSION CORP": ["provider-mass-compression-service", "provider-perfectmin-licensed-clinics"],
      "AURUM": ["provider-aurum-skinworks", "provider-perfectmin-licensed-clinics"],
      "SOMNACORE": ["provider-somnacore", "provider-perfectmin-licensed-clinics"],
      "CORTEX LADDER": ["provider-cortex-ladder", "provider-perfectmin-licensed-clinics"],
      "FACTORY COMMONS": ["provider-factory-commons", "provider-perfectmin-licensed-clinics"],
      "KAGAMI KAISHA": ["provider-perfectmin-licensed-clinics", "provider-trauma-team"],
      "PERFECTMIN": ["provider-perfectmin-licensed-clinics"]
    }
  },
  categoryProviders: {
    MEDICAL: {
      providerId: "provider-trauma-team",
      organizationLocationId: "orgloc-trauma-local-medical-supply-n3-a4"
    },
    WEAPON: {
      providerId: "provider-watch-secure",
      organizationLocationId: "orgloc-ws-controlled-armory-n3-a4"
    },
    ARMOR: {
      providerId: "provider-watch-secure",
      organizationLocationId: "orgloc-ws-controlled-armory-n3-a4"
    },
    DOCUMENT: {
      providerId: "provider-system-access-desk",
      organizationLocationId: "orgloc-system-access-desk-n3-a4"
    },
    CONTAINER: {
      providerId: "provider-mass-compression-service",
      organizationLocationId: "orgloc-mass-compression-logistics-n3-b12"
    },
    TOOLS: {
      providerId: "provider-factory-commons",
      organizationLocationId: "orgloc-factory-commons-utility-depot-n3-c8"
    },
    DEFAULT: {
      providerId: "provider-habitat-ledger",
      organizationLocationId: "orgloc-habitat-market-fulfillment-n3-b12"
    }
  }
};

// Offer overrides hold commercial state only. Product definitions remain owned by
// Equipment Catalog and are referenced through catalogItemId / definitionId.
window.APP_DATA.marketOfferOverrides = [];
