window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.housingHouseholdHub = {
  schemaVersion: "housing_household_hub_5_0x",
  weatherCycleHours: 6,
  weatherProfiles: [
    { code: "DRY_HAZE", label: "Dry industrial haze", temperatureC: 9, precipitation: "NONE", visibilityPercent: 58, airQuality: "POOR", exteriorRisk: "LOW", note: "Fine particulate drift above the transport decks." },
    { code: "ACID_MIST", label: "Acid mist", temperatureC: 7, precipitation: "LIGHT", visibilityPercent: 41, airQuality: "HAZARDOUS", exteriorRisk: "MODERATE", note: "Protective outer layer recommended beyond sealed transit corridors." },
    { code: "COLD_RAIN", label: "Cold rain", temperatureC: 5, precipitation: "MODERATE", visibilityPercent: 49, airQuality: "POOR", exteriorRisk: "MODERATE", note: "Drainage pressure elevated on lower infrastructure levels." },
    { code: "STATIC_FRONT", label: "Static pressure front", temperatureC: 11, precipitation: "TRACE", visibilityPercent: 66, airQuality: "UNSTABLE", exteriorRisk: "LOW", note: "Local signal interference possible near exposed service lines." },
    { code: "DUST_SQUALL", label: "Dust squall", temperatureC: 13, precipitation: "NONE", visibilityPercent: 27, airQuality: "HAZARDOUS", exteriorRisk: "HIGH", note: "Unsealed exterior movement discouraged." },
    { code: "CLEAR_COLD", label: "Clear cold interval", temperatureC: 3, precipitation: "NONE", visibilityPercent: 81, airQuality: "CONTROLLED", exteriorRisk: "LOW", note: "Rare high-visibility window across upper decks." }
  ],
  ambientFeed: [
    { id: "hub-feed-air", category: "ENVIRONMENT", title: "Atmospheric intake", body: "Residential filtration remains within nominal load." },
    { id: "hub-feed-grid", category: "INFRASTRUCTURE", title: "Habitation grid", body: "No district-wide utility interruption is registered." },
    { id: "hub-feed-transit", category: "TRANSIT", title: "Transit visibility", body: "Exterior routing remains subject to current visibility and air-quality restrictions." },
    { id: "hub-feed-disposal", category: "LOGISTICS", title: "Disposal channel", body: "Citizen-owned items may be transferred to approved incineration for the fixed recovery credit." }
  ],
  collectionCategories: ["COLLECTIBLE", "MEMENTO", "TROPHY", "DOCUMENT", "MEDIA", "DISPLAY_ITEM", "DECORATION"],
  importantStorageTags: ["SECURE_STORAGE", "ARCHIVAL_STORAGE", "DOCUMENT_STORAGE", "HIDDEN_STORAGE"],
  displayDefaults: {
    railSlots: 2,
    shelfSlots: 4,
    cabinetSlots: 3
  }
};
