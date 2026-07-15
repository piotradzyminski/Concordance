window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.housingFurnishingLifecycle = {
  schemaVersion: "housing_furnishing_lifecycle_4_0x",
  disposalCreditValue: 5,
  ownershipTypes: ["FIXED_FIXTURE", "RENTAL_FURNISHING", "CITIZEN_FURNISHING"],
  conditionBands: [
    { state: "OPERATIONAL", min: 61, max: 100 },
    { state: "WORN", min: 31, max: 60 },
    { state: "DAMAGED", min: 1, max: 30 },
    { state: "BROKEN", min: 0, max: 0 }
  ],
  definitionProfiles: {
    "eqcat-household-rest-cot": {
      furnishingClass: "REST",
      defaultGrade: "UTILITY",
      essentialCapabilities: ["SLEEP"],
      optionalCapabilities: ["REST"],
      slots: [
        { slotId: "storage-1", slotType: "STORAGE", acceptedModuleIds: ["eqcat-household-underbed-storage-module"] },
        { slotId: "comfort-1", slotType: "COMFORT", acceptedModuleIds: ["eqcat-household-acoustic-canopy-module"] }
      ]
    },
    "eqcat-household-fold-table": {
      furnishingClass: "UTILITY_SURFACE",
      defaultGrade: "UTILITY",
      essentialCapabilities: ["SURFACE"],
      optionalCapabilities: ["FOOD_PREP"],
      slots: [
        { slotId: "utility-1", slotType: "UTILITY", acceptedModuleIds: ["eqcat-household-terminal-dock-module"] }
      ]
    },
    "eqcat-household-med-locker": {
      furnishingClass: "MEDICAL_STORAGE",
      defaultGrade: "STANDARD",
      essentialCapabilities: ["SECURE_STORAGE"],
      optionalCapabilities: ["MEDICAL_STORAGE"],
      slots: [
        { slotId: "utility-1", slotType: "UTILITY", acceptedModuleIds: ["eqcat-household-cold-compartment-module"] }
      ]
    },
    "eqcat-household-utility-chair": {
      furnishingClass: "SEATING",
      defaultGrade: "ECONOMY",
      essentialCapabilities: ["REST"],
      optionalCapabilities: [],
      slots: []
    },
    "eqcat-household-utility-locker": {
      furnishingClass: "STORAGE",
      defaultGrade: "UTILITY",
      essentialCapabilities: ["STORAGE"],
      optionalCapabilities: [],
      slots: [
        { slotId: "security-1", slotType: "SECURITY", acceptedModuleIds: ["eqcat-household-secure-lock-module"] },
        { slotId: "display-1", slotType: "DISPLAY", acceptedModuleIds: ["eqcat-household-display-rail-module"] }
      ]
    }
  },
  upgradeProfiles: {
    "eqcat-household-underbed-storage-module": {
      label: "Underbed Storage Module",
      slotType: "STORAGE",
      capabilities: ["STORAGE"],
      compatibleFurnishingClasses: ["REST"]
    },
    "eqcat-household-acoustic-canopy-module": {
      label: "Acoustic Privacy Canopy",
      slotType: "COMFORT",
      capabilities: ["SLEEP_PRIVACY"],
      compatibleFurnishingClasses: ["REST"]
    },
    "eqcat-household-terminal-dock-module": {
      label: "Terminal Work Dock",
      slotType: "UTILITY",
      capabilities: ["WORKSPACE"],
      compatibleFurnishingClasses: ["UTILITY_SURFACE"]
    },
    "eqcat-household-cold-compartment-module": {
      label: "Cold Compartment Module",
      slotType: "UTILITY",
      capabilities: ["COLD_STORAGE"],
      compatibleFurnishingClasses: ["MEDICAL_STORAGE", "STORAGE"]
    },
    "eqcat-household-secure-lock-module": {
      label: "Secure Lock Module",
      slotType: "SECURITY",
      capabilities: ["SECURE_STORAGE"],
      compatibleFurnishingClasses: ["STORAGE", "MEDICAL_STORAGE"]
    },
    "eqcat-household-display-rail-module": {
      label: "Display Rail Module",
      slotType: "DISPLAY",
      capabilities: ["DISPLAY"],
      compatibleFurnishingClasses: ["STORAGE", "DISPLAY"]
    }
  }
};
