window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.itemEffectCatalog = [
  {
    id: "COREMED_ANALGESIC",
    label: "Analgesic Relief",
    targetScope: "CITIZEN",
    matches: { definitionIds: ["eqcat-coremed-analgesic-tablets"] },
    resultLabel: "Pain relief active",
    statusEffects: [
      {
        statusId: "PAIN_RELIEF",
        label: "Pain Relief",
        category: "MEDICAL",
        durationSeconds: 14400,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["MEDICAL", "PAIN", "SUPPRESSANT"],
        modifiers: { painPenalty: -1 }
      }
    ]
  },
  {
    id: "COREMED_ANTISEPTIC",
    label: "Wound Antisepsis",
    targetScope: "CITIZEN",
    matches: { definitionIds: ["eqcat-coremed-antiseptic-ampoules"] },
    resultLabel: "Wound antisepsis active",
    statusEffects: [
      {
        statusId: "WOUND_ANTISEPSIS",
        label: "Wound Antisepsis",
        category: "MEDICAL",
        durationSeconds: 21600,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["MEDICAL", "FIRST_AID", "ANTISEPTIC"],
        modifiers: { infectionRiskModifier: -1 }
      }
    ]
  },
  {
    id: "COREMED_COAGULANT",
    label: "Hemorrhage Control",
    targetScope: "CITIZEN",
    matches: { definitionIds: ["eqcat-coremed-coagulant-patches"] },
    resultLabel: "Temporary hemorrhage control active",
    statusEffects: [
      {
        statusId: "HEMORRHAGE_CONTROL",
        label: "Hemorrhage Control",
        category: "MEDICAL",
        durationSeconds: 900,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["MEDICAL", "FIRST_AID", "BLEEDING_CONTROL"],
        modifiers: { bleedingSeverityModifier: -1 }
      }
    ]
  },
  {
    id: "COREMED_ANTIBIOTIC_COURSE",
    label: "Antibiotic Course",
    targetScope: "CITIZEN",
    matches: { definitionIds: ["eqcat-coremed-antibiotic-course"] },
    resultLabel: "Antibiotic course active",
    statusEffects: [
      {
        statusId: "ANTIBIOTIC_COURSE",
        label: "Antibiotic Course",
        category: "MEDICAL",
        durationSeconds: 432000,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["MEDICAL", "PHARMA", "ANTIBIOTIC"],
        modifiers: { infectionRecoveryModifier: 1 }
      }
    ]
  },
  {
    id: "SOMNACORE_ALERTNESS",
    label: "Alertness Support",
    targetScope: "CITIZEN",
    matches: { definitionIds: ["eqcat-somnacore-alertness-tablets"] },
    resultLabel: "Alertness support active",
    statusEffects: [
      {
        statusId: "ALERTNESS_SUPPORT",
        label: "Alertness Support",
        category: "STIMULANT",
        durationSeconds: 21600,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["MEDICAL", "STIMULANT", "ALERTNESS"],
        modifiers: { fatiguePenalty: -1 }
      }
    ]
  },
  {
    id: "COREMED_NAUSEA_SUPPRESSION",
    label: "Nausea Suppression",
    targetScope: "CITIZEN",
    matches: { definitionIds: ["eqcat-coremed-nausea-suppressant"] },
    resultLabel: "Nausea suppression active",
    statusEffects: [
      {
        statusId: "NAUSEA_SUPPRESSION",
        label: "Nausea Suppression",
        category: "MEDICAL",
        durationSeconds: 14400,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["MEDICAL", "SUPPRESSANT", "NAUSEA"],
        modifiers: { nauseaPenalty: -1 }
      }
    ]
  },
  {
    id: "COREMED_FIRST_AID",
    label: "First Aid Stabilization",
    targetScope: "CITIZEN",
    matches: { definitionIds: ["eqcat-coremed-first-aid-pouch"] },
    resultLabel: "First aid stabilization recorded",
    statusEffects: [
      {
        statusId: "FIRST_AID_STABILIZED",
        label: "First Aid Stabilized",
        category: "MEDICAL",
        durationSeconds: 3600,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["MEDICAL", "FIRST_AID", "STABILIZED"],
        modifiers: { stabilizationModifier: 1 }
      }
    ]
  },
  {
    id: "HABITAT_STANDARD_RATION",
    label: "Standard Nutrition",
    targetScope: "CITIZEN",
    matches: { definitionIds: ["eqcat-habitat-standard-ration-pack"] },
    resultLabel: "Standard nutrition active",
    statusEffects: [
      {
        statusId: "NOURISHED",
        label: "Nourished",
        category: "NUTRITION",
        durationSeconds: 28800,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["FOOD", "NUTRITION", "RATION"],
        modifiers: { hungerPenalty: -1 }
      }
    ]
  },
  {
    id: "HABITAT_UTILITY_MEAL",
    label: "Utility Nutrition",
    targetScope: "CITIZEN",
    matches: { definitionIds: ["eqcat-habitat-protein-meal-bricks"] },
    resultLabel: "Utility nutrition active",
    statusEffects: [
      {
        statusId: "NOURISHED",
        label: "Nourished",
        category: "NUTRITION",
        durationSeconds: 21600,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["FOOD", "NUTRITION", "MEAL"],
        modifiers: { hungerPenalty: -1 }
      }
    ]
  },
  {
    id: "HABITAT_MEAL_TRAY",
    label: "Prepared Meal",
    targetScope: "CITIZEN",
    matches: { definitionIds: ["eqcat-habitat-heat-sealed-meal-tray"] },
    resultLabel: "Prepared meal nutrition active",
    statusEffects: [
      {
        statusId: "NOURISHED",
        label: "Nourished",
        category: "NUTRITION",
        durationSeconds: 28800,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["FOOD", "NUTRITION", "MEAL"],
        modifiers: { hungerPenalty: -1 }
      }
    ]
  },
  {
    id: "HABITAT_HYDRATION",
    label: "Hydration",
    targetScope: "CITIZEN",
    matches: { definitionIds: ["eqcat-habitat-hydration-pouches"] },
    resultLabel: "Hydration active",
    statusEffects: [
      {
        statusId: "HYDRATED",
        label: "Hydrated",
        category: "NUTRITION",
        durationSeconds: 21600,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["FOOD", "DRINK", "HYDRATION"],
        modifiers: { dehydrationPenalty: -1 }
      }
    ]
  },
  {
    id: "HABITAT_ELECTROLYTES",
    label: "Electrolyte Support",
    targetScope: "CITIZEN",
    matches: { definitionIds: ["eqcat-habitat-electrolyte-concentrate"] },
    resultLabel: "Electrolyte support active",
    statusEffects: [
      {
        statusId: "ELECTROLYTE_SUPPORT",
        label: "Electrolyte Support",
        category: "NUTRITION",
        durationSeconds: 28800,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["FOOD", "DRINK", "ELECTROLYTES"],
        modifiers: { exertionPenalty: -1 }
      }
    ]
  },
  {
    id: "HABITAT_LIGHT_NUTRITION",
    label: "Light Nutrition",
    targetScope: "CITIZEN",
    matches: { definitionIds: ["eqcat-habitat-insect-protein-crisps"] },
    resultLabel: "Light nutrition active",
    statusEffects: [
      {
        statusId: "NOURISHED",
        label: "Nourished",
        category: "NUTRITION",
        durationSeconds: 10800,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["FOOD", "NUTRITION", "SNACK"],
        modifiers: { hungerPenalty: -1 }
      }
    ]
  },
  {
    id: "GENERIC_DRINK",
    label: "Generic Hydration",
    targetScope: "CITIZEN",
    priority: 10,
    matches: { tagsAny: ["DRINK", "BEVERAGE"] },
    resultLabel: "Hydration active",
    statusEffects: [
      {
        statusId: "HYDRATED",
        label: "Hydrated",
        category: "NUTRITION",
        durationSeconds: 14400,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["DRINK", "HYDRATION"],
        modifiers: { dehydrationPenalty: -1 }
      }
    ]
  },
  {
    id: "GENERIC_FOOD",
    label: "Generic Nutrition",
    targetScope: "CITIZEN",
    priority: 5,
    matches: { tagsAny: ["FOOD", "EDIBLE", "RATION", "MEAL"] },
    resultLabel: "Nutrition active",
    statusEffects: [
      {
        statusId: "NOURISHED",
        label: "Nourished",
        category: "NUTRITION",
        durationSeconds: 14400,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["FOOD", "NUTRITION"],
        modifiers: { hungerPenalty: -1 }
      }
    ]
  },
  {
    id: "GENERIC_MEDICAL",
    label: "Generic Treatment",
    targetScope: "CITIZEN",
    priority: 1,
    matches: { tagsAny: ["MEDICAL", "MEDICINE", "FIRST_AID"] },
    resultLabel: "Treatment status recorded",
    statusEffects: [
      {
        statusId: "TREATMENT_APPLIED",
        label: "Treatment Applied",
        category: "MEDICAL",
        durationSeconds: 3600,
        stackMode: "REFRESH",
        magnitude: 1,
        maxStacks: 1,
        tags: ["MEDICAL", "TREATMENT"],
        modifiers: {}
      }
    ]
  },
  {
    id: "HOUSEHOLD_EXTERNAL_USE",
    label: "Household Use",
    targetScope: "EXTERNAL",
    priority: 1,
    matches: { tagsAny: ["HOUSEHOLD", "HABITAT_SUPPLY"] },
    resultLabel: "Household use recorded",
    statusEffects: []
  }
];
