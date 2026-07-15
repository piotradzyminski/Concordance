window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.itemTypeCatalog = [
  {
    id: "GENERIC_ITEM",
    label: "Generic Item",
    family: "GENERAL",
    capabilities: [],
    matches: {},
    profileFields: [],
    stateFields: []
  },
  {
    id: "CREDENTIAL",
    label: "Credential",
    family: "PERSONAL",
    capabilities: ["IDENTITY_CARRIER", "ACCESS_CARRIER"],
    matches: { subtypes: ["ACCESS_CARD", "CREDENTIAL", "ID_CARD"] },
    profileFields: [
      { key: "credentialKind", type: "TOKEN", default: "ACCESS" }
    ],
    stateFields: [
      { key: "revoked", type: "BOOLEAN", default: false }
    ]
  },
  {
    id: "WALLET",
    label: "Wallet",
    family: "PERSONAL",
    capabilities: ["CONTAINER", "CREDENTIAL_STORAGE", "TOKEN_STORAGE"],
    matches: { subtypes: ["WALLET"] },
    profileFields: [
      { key: "credentialSlots", type: "INTEGER", default: 6, min: 0, max: 64 },
      { key: "tokenSlots", type: "INTEGER", default: 2, min: 0, max: 64 },
      { key: "acceptsPhysicalCurrency", type: "BOOLEAN", default: true }
    ],
    stateFields: [
      { key: "locked", type: "BOOLEAN", default: false }
    ]
  },
  {
    id: "FIREARM",
    label: "Firearm",
    family: "WEAPON",
    capabilities: ["WEAPON", "RANGED_WEAPON", "ACCEPTS_MAGAZINE", "MAGAZINE_WELL", "CAN_CHAMBER", "SAFETY_CONTROL", "FIRE_MODE_CONTROL", "CAN_JAM"],
    matches: { subtypes: ["SIDEARM", "PISTOL", "REVOLVER", "SMG", "RIFLE", "SHOTGUN", "FIREARM"] },
    profileFields: [
      { key: "weaponClass", type: "TOKEN", default: "FIREARM" },
      { key: "magazineType", type: "TOKEN", default: "" },
      { key: "ammunitionType", type: "TOKEN", default: "" },
      { key: "fireModes", type: "LIST", default: ["SINGLE"] },
      { key: "chamberCapacity", type: "INTEGER", default: 1, min: 0, max: 10 },
      { key: "handsRequired", type: "INTEGER", default: 1, min: 1, max: 2 }
    ],
    stateFields: [
      { key: "safety", type: "ENUM", default: "SAFE", values: ["SAFE", "FIRE"] },
      { key: "fireMode", type: "TOKEN", default: "SINGLE" },
      { key: "chamberedRounds", type: "INTEGER", default: 0, min: 0, max: 10 },
      { key: "jammed", type: "BOOLEAN", default: false }
    ]
  },
  {
    id: "MELEE_WEAPON",
    label: "Melee Weapon",
    family: "WEAPON",
    capabilities: ["WEAPON", "MELEE_WEAPON"],
    matches: { subtypes: ["BATON", "BLADE", "SWORD", "KNIFE", "CLUB", "MELEE_WEAPON"] },
    profileFields: [
      { key: "weaponClass", type: "TOKEN", default: "MELEE" },
      { key: "reachClass", type: "ENUM", default: "SHORT", values: ["CONTACT", "SHORT", "MEDIUM", "LONG"] },
      { key: "handsRequired", type: "INTEGER", default: 1, min: 1, max: 2 }
    ],
    stateFields: []
  },
  {
    id: "GRENADE",
    label: "Grenade",
    family: "WEAPON",
    capabilities: ["WEAPON", "THROWN_WEAPON", "CONSUMABLE", "ARMABLE", "DISARMABLE"],
    matches: { subtypes: ["GRENADE", "FRAGMENTATION_GRENADE", "SMOKE_GRENADE", "EMP_GRENADE"] },
    profileFields: [
      { key: "grenadeClass", type: "TOKEN", default: "GENERAL" },
      { key: "triggerModes", type: "LIST", default: ["MANUAL"] },
      { key: "defaultFuseSeconds", type: "INTEGER", default: 4, min: 0, max: 3600 },
      { key: "effectTags", type: "LIST", default: [] },
      { key: "singleUse", type: "BOOLEAN", default: true }
    ],
    stateFields: [
      { key: "armed", type: "BOOLEAN", default: false },
      { key: "triggerMode", type: "TOKEN", default: "MANUAL" },
      { key: "fuseSeconds", type: "INTEGER", default: 0, min: 0, max: 3600 },
      { key: "spent", type: "BOOLEAN", default: false }
    ]
  },
  {
    id: "MAGAZINE",
    label: "Magazine",
    family: "AMMUNITION",
    capabilities: ["AMMO_CONTAINER", "INSTALLABLE_IN_ITEM", "LOADABLE", "UNLOADABLE"],
    matches: { subtypes: ["MAGAZINE", "PISTOL_MAGAZINE", "RIFLE_MAGAZINE", "AMMO_CELL"] },
    profileFields: [
      { key: "magazineType", type: "TOKEN", default: "GENERAL" },
      { key: "ammunitionType", type: "TOKEN", default: "" },
      { key: "capacity", type: "INTEGER", default: 1, min: 1, max: 999 }
    ],
    stateFields: [
      { key: "ammunitionDefinitionId", type: "STRING", default: "" },
      { key: "roundsCurrent", type: "INTEGER", default: 0, min: 0, max: 999 }
    ]
  },
  {
    id: "AMMUNITION",
    label: "Ammunition",
    family: "AMMUNITION",
    capabilities: ["AMMUNITION", "STACKABLE", "LOADABLE_AMMUNITION"],
    matches: { categories: ["AMMUNITION"], subtypes: ["AMMUNITION", "ROUNDS", "SHELLS", "CARTRIDGES", "CELLS"] },
    profileFields: [
      { key: "ammunitionType", type: "TOKEN", default: "GENERAL" },
      { key: "unit", type: "ENUM", default: "ROUND", values: ["ROUND", "SHELL", "CELL", "CHARGE"] },
      { key: "stackLimit", type: "INTEGER", default: 100, min: 1, max: 9999 }
    ],
    stateFields: []
  },
  {
    id: "CYBERWARE_MODULE",
    label: "Cyberware Module",
    family: "CYBERWARE",
    capabilities: ["CYBERWARE_MODULE", "INSTALLABLE_IN_ITEM"],
    matches: { subtypes: ["CYBERWARE_MODULE"], tags: ["CYBERWARE_MODULE"] },
    profileFields: [
      { key: "slotType", type: "TOKEN", default: "UTILITY" },
      { key: "upgradeCapacityCost", type: "INTEGER", default: 1, min: 1, max: 16 }
    ],
    stateFields: []
  },
  {
    id: "CONTAINER",
    label: "Container",
    family: "CARRY",
    capabilities: ["CONTAINER"],
    matches: { categories: ["CONTAINER"] },
    profileFields: [],
    stateFields: [
      { key: "locked", type: "BOOLEAN", default: false }
    ]
  },
  {
    id: "MEDICAL_ITEM",
    label: "Medical Item",
    family: "MEDICAL",
    capabilities: ["MEDICAL_ITEM"],
    matches: { categories: ["MEDICAL"], subtypes: ["MEDKIT", "MEDICAL_ITEM"] },
    profileFields: [],
    stateFields: []
  },
  {
    id: "TOOL",
    label: "Tool",
    family: "UTILITY",
    capabilities: ["TOOL"],
    matches: { categories: ["TOOLS"], subtypes: ["TOOL", "TOOL_CASE"] },
    profileFields: [],
    stateFields: []
  },
  {
    id: "SURVIVAL_GEAR",
    label: "Survival Gear",
    family: "UTILITY",
    capabilities: ["SURVIVAL_GEAR"],
    matches: { categories: ["SURVIVAL"] },
    profileFields: [],
    stateFields: []
  },
  {
    id: "ARMOR",
    label: "Armor",
    family: "WEARABLE",
    capabilities: ["WEARABLE", "PROTECTIVE"],
    matches: { categories: ["ARMOR"] },
    profileFields: [],
    stateFields: []
  },
  {
    id: "CLOTHING",
    label: "Clothing",
    family: "WEARABLE",
    capabilities: ["WEARABLE"],
    matches: { categories: ["CLOTHING"] },
    profileFields: [],
    stateFields: []
  },
  {
    id: "ACCESSORY",
    label: "Accessory",
    family: "WEARABLE",
    capabilities: ["WEARABLE", "ACCESSORY"],
    matches: { categories: ["ACCESSORY"] },
    profileFields: [],
    stateFields: []
  },
  {
    id: "DEVICE",
    label: "Device",
    family: "DEVICE",
    capabilities: ["DEVICE"],
    matches: { categories: ["DEVICE"] },
    profileFields: [],
    stateFields: []
  },
  {
    id: "CYBERWARE",
    label: "Cyberware",
    family: "CYBERWARE",
    capabilities: ["CYBERWARE", "INSTALLABLE_IN_BODY"],
    matches: { categories: ["CYBERWARE"], subtypes: ["IMPLANT", "NEUROCHIP", "INTERFACE", "SERVICE_PORT", "BIOWARE"] },
    profileFields: [],
    stateFields: []
  },
  {
    id: "CONSUMABLE",
    label: "Consumable",
    family: "CONSUMABLE",
    capabilities: ["CONSUMABLE", "STACKABLE", "USABLE"],
    matches: { categories: ["CONSUMABLE", "FOOD", "HOUSEHOLD"], subtypes: ["FOOD", "DRINK", "MEDICINE", "DRUG", "CONSUMABLE", "HYGIENE", "CLEANING", "UTILITY_SUPPLIES"] },
    profileFields: [
      { key: "consumableKind", type: "TOKEN", default: "GENERAL" },
      { key: "stackLimit", type: "INTEGER", default: 20, min: 1, max: 9999 }
    ],
    stateFields: []
  },
{
  "id": "HOUSEHOLD_FURNISHING",
  "label": "Household Furnishing",
  "family": "HOUSEHOLD",
  "capabilities": [
    "HOUSEHOLD_PLACEABLE"
  ],
  "matches": {
    "categories": [
      "HOUSEHOLD",
      "FURNITURE"
    ],
    "subtypes": [
      "REST_COT",
      "FOLD_TABLE",
      "MEDICAL_LOCKER",
      "UTILITY_CHAIR",
      "UTILITY_LOCKER"
    ],
    "tags": [
      "HOUSEHOLD_PLACEABLE",
      "FURNITURE",
      "APPLIANCE",
      "FIXTURE"
    ]
  },
  "profileFields": [
    {
      "key": "furnishingClass",
      "type": "TOKEN",
      "default": "GENERAL"
    },
    {
      "key": "fixedInstallation",
      "type": "BOOLEAN",
      "default": false
    }
  ],
  "stateFields": []
}
];
