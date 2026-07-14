window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.equipmentCatalog = [
  {
    "id": "eqcat-access-card",
    "name": "Access Card",
    "category": "DOCUMENT",
    "subtype": "ACCESS_CARD",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 25,
    "tags": [
      "DOCUMENT",
      "ACCESS"
    ],
    "notes": "Standard local access credential.",
    "equipProfile": {},
    "itemType": "CREDENTIAL",
    "itemTypeProfile": {
      "credentialKind": "ACCESS"
    }
  },
  {
    "id": "eqcat-personal-wallet",
    "name": "Personal Wallet",
    "category": "PERSONAL",
    "subtype": "WALLET",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 40,
    "tags": [
      "PERSONAL",
      "CREDITS",
      "CONTAINER",
      "WALLET",
      "CREDENTIAL_STORAGE"
    ],
    "notes": "Small personal carry item for cards, chips and local currency tokens.",
    "equipProfile": {},
    "itemType": "WALLET",
    "itemTypeProfile": {
      "credentialSlots": 6,
      "tokenSlots": 2,
      "acceptsPhysicalCurrency": true
    },
    "containerProfile": {
      "slotCapacity": 6,
      "gridColumns": 2,
      "gridRows": 3,
      "isolatedCells": true,
      "label": "PERSONAL WALLET",
      "acceptedTags": [
        "DOCUMENT",
        "ACCESS",
        "CREDENTIAL",
        "TOKEN",
        "CURRENCY_TOKEN"
      ]
    }
  },
  {
    "id": "eqcat-compact-pistol",
    "name": "Compact Pistol",
    "category": "WEAPON",
    "subtype": "SIDEARM",
    "footprint": "1x2",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "RESTRICTED",
    "condition": 88,
    "value": 1200,
    "tags": [
      "WEAPON",
      "SIDEARM"
    ],
    "notes": "Compact sidearm profile for holster and hand slot validation.",
    "equipProfile": {
      "allowedAnchors": [
        "LEFT_HAND",
        "RIGHT_HAND"
      ],
      "layer": "HELD",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [
        "HOLSTER"
      ],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "FIREARM",
    "itemTypeProfile": {
      "weaponClass": "SIDEARM",
      "magazineType": "COMPACT_PISTOL",
      "ammunitionType": "PISTOL_STANDARD",
      "fireModes": [
        "SINGLE"
      ],
      "chamberCapacity": 1,
      "handsRequired": 1
    }
  },
  {
    "id": "eqcat-service-baton",
    "name": "Service Baton",
    "category": "WEAPON",
    "subtype": "BATON",
    "footprint": "3x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "LICENSED",
    "condition": 92,
    "value": 450,
    "tags": [
      "WEAPON",
      "MELEE",
      "SERVICE"
    ],
    "notes": "Rigid service weapon sized for equipment layout placement and hand/belt slot checks.",
    "equipProfile": {
      "allowedAnchors": [
        "LEFT_HAND",
        "RIGHT_HAND"
      ],
      "layer": "HELD",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [
        "HOLSTER"
      ],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "MELEE_WEAPON",
    "itemTypeProfile": {
      "weaponClass": "BATON",
      "reachClass": "SHORT",
      "handsRequired": 1
    }
  },
  {
    "id": "eqcat-cyberkatana",
    "name": "Cyberkatana",
    "category": "WEAPON",
    "subtype": "BLADE",
    "footprint": "4x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "RESTRICTED",
    "condition": 84,
    "value": 6400,
    "tags": [
      "WEAPON",
      "BLADE",
      "LONG"
    ],
    "notes": "Long melee weapon template for large-item equipment placement.",
    "equipProfile": {
      "allowedAnchors": [
        "LEFT_HAND",
        "RIGHT_HAND"
      ],
      "layer": "HELD",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [
        "SHEATH"
      ],
      "handsRequired": 2,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "MELEE_WEAPON",
    "itemTypeProfile": {
      "weaponClass": "SWORD",
      "reachClass": "LONG",
      "handsRequired": 2
    }
  },
  {
    "id": "eqcat-weapon-bag-slim",
    "name": "Slim Weapon Bag",
    "category": "CONTAINER",
    "subtype": "WEAPON_BAG",
    "footprint": "1x4",
    "containerProfile": {
      "slotCapacity": 4,
      "label": "WEAPON BAG 1x4",
      "acceptedTags": [
        "WEAPON",
        "SIDEARM",
        "BLADE",
        "MELEE",
        "LONG"
      ]
    },
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "LICENSED",
    "condition": 90,
    "value": 740,
    "tags": [
      "CONTAINER",
      "WEAPON_BAG",
      "WEAPON",
      "CARRY"
    ],
    "notes": "Slim weapon bag host. Can be carried in either hand or worn on BACK; exposes a 4-slot weapon container capacity.",
    "equipProfile": {
      "allowedAnchors": [],
      "layer": "",
      "coverage": [],
      "bodyMountSets": [
        {
          "id": "LEFT_SHOULDER_CARRY",
          "mountIds": [
            "LEFT_SHOULDER_CARRY"
          ]
        },
        {
          "id": "RIGHT_SHOULDER_CARRY",
          "mountIds": [
            "RIGHT_SHOULDER_CARRY"
          ]
        }
      ],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": true,
      "requires": [],
      "blocks": []
    },
    "itemType": "CONTAINER"
  },
  {
    "id": "eqcat-weapon-bag-wide",
    "name": "Wide Weapon Bag",
    "category": "CONTAINER",
    "subtype": "WEAPON_BAG",
    "footprint": "2x4",
    "containerProfile": {
      "slotCapacity": 8,
      "label": "WEAPON BAG 2x4",
      "acceptedTags": [
        "WEAPON",
        "SIDEARM",
        "BLADE",
        "MELEE",
        "LONG"
      ]
    },
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "LICENSED",
    "condition": 88,
    "value": 980,
    "tags": [
      "CONTAINER",
      "WEAPON_BAG",
      "WEAPON",
      "CARRY"
    ],
    "notes": "Wide weapon bag host. Can be carried in either hand or worn on BACK; exposes a 8-slot weapon container capacity.",
    "equipProfile": {
      "allowedAnchors": [],
      "layer": "",
      "coverage": [],
      "bodyMountSets": [
        {
          "id": "LEFT_SHOULDER_CARRY",
          "mountIds": [
            "LEFT_SHOULDER_CARRY"
          ]
        },
        {
          "id": "RIGHT_SHOULDER_CARRY",
          "mountIds": [
            "RIGHT_SHOULDER_CARRY"
          ]
        }
      ],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": true,
      "requires": [],
      "blocks": []
    },
    "itemType": "CONTAINER"
  },
  {
    "id": "eqcat-sword-scabbard-belt",
    "name": "Belt Sword Scabbard",
    "category": "CONTAINER",
    "subtype": "SWORD_SCABBARD",
    "footprint": "1x4",
    "containerProfile": {
      "slotCapacity": 4,
      "label": "SCABBARD 1x4",
      "acceptedTags": [
        "WEAPON",
        "BLADE",
        "MELEE",
        "LONG"
      ]
    },
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "LICENSED",
    "condition": 91,
    "value": 520,
    "tags": [
      "CONTAINER",
      "SCABBARD",
      "WEAPON",
      "BLADE"
    ],
    "notes": "Belt-mounted sword scabbard host. Exposes a 4-slot blade container capacity when equipped at WAIST / CARRIER.",
    "equipProfile": {
      "allowedAnchors": [],
      "layer": "",
      "coverage": [],
      "bodyMountSets": [
        {
          "id": "LEFT_SHOULDER_CARRY",
          "mountIds": [
            "LEFT_SHOULDER_CARRY"
          ]
        },
        {
          "id": "RIGHT_SHOULDER_CARRY",
          "mountIds": [
            "RIGHT_SHOULDER_CARRY"
          ]
        }
      ],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "mountProfile": {
      "slots": [
        {
          "id": "SHEATH",
          "type": "SHEATH",
          "label": "BLADE SHEATH",
          "acceptedTags": [
            "WEAPON",
            "BLADE",
            "LONG"
          ],
          "blockedTags": []
        }
      ]
    },
    "itemType": "CONTAINER"
  },
  {
    "id": "eqcat-compact-medkit",
    "name": "Compact Medkit",
    "category": "MEDICAL",
    "subtype": "MEDKIT",
    "footprint": "2x2",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 95,
    "value": 780,
    "tags": [
      "MEDICAL",
      "UTILITY"
    ],
    "notes": "Compact medical kit for field stabilization and utility slot validation.",
    "equipProfile": {
      "allowedAnchors": [
        "LEFT_HAND",
        "RIGHT_HAND"
      ],
      "layer": "HELD",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "MEDICAL_ITEM"
  },
  {
    "id": "eqcat-field-tool-case",
    "name": "Field Tool Case",
    "category": "TOOLS",
    "subtype": "TOOL_CASE",
    "footprint": "2x2",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 90,
    "value": 950,
    "tags": [
      "TOOLS",
      "UTILITY"
    ],
    "notes": "Field tool case for technical service work.",
    "equipProfile": {
      "allowedAnchors": [
        "LEFT_HAND",
        "RIGHT_HAND"
      ],
      "layer": "HELD",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "TOOL"
  },
  {
    "id": "eqcat-compressed-sleeping-bag",
    "name": "Compressed Sleeping Bag",
    "category": "SURVIVAL",
    "subtype": "SLEEPING_BAG",
    "footprint": "2x3",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 78,
    "value": 280,
    "tags": [
      "SURVIVAL",
      "SOFT_CONTAINER"
    ],
    "notes": "Large survival item used to test equipment layout oversized placement.",
    "equipProfile": {
      "allowedAnchors": [],
      "layer": "",
      "coverage": [],
      "bodyMountSets": [
        {
          "id": "LEFT_SHOULDER_CARRY",
          "mountIds": [
            "LEFT_SHOULDER_CARRY"
          ]
        },
        {
          "id": "RIGHT_SHOULDER_CARRY",
          "mountIds": [
            "RIGHT_SHOULDER_CARRY"
          ]
        }
      ],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": true,
      "requires": [],
      "blocks": []
    },
    "itemType": "SURVIVAL_GEAR"
  },
  {
    "id": "eqcat-armor-vest",
    "name": "Armored Vest",
    "category": "ARMOR",
    "subtype": "VEST",
    "footprint": "2x3",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "LICENSED",
    "condition": 90,
    "value": 2400,
    "tags": [
      "ARMOR",
      "TORSO"
    ],
    "notes": "Body-slot armor template for torso / outerwear assignment.",
    "equipProfile": {
      "allowedAnchors": [
        "TORSO"
      ],
      "layer": "ARMOR",
      "coverage": [
        "BACK"
      ],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "mountProfile": {
      "slots": [
        {
          "id": "CHEST_RIG",
          "type": "CHEST_RIG",
          "label": "CHEST RIG",
          "acceptedTags": [
            "CHEST_RIG"
          ],
          "blockedTags": []
        }
      ]
    },
    "itemType": "ARMOR"
  },
  {
    "id": "eqcat-standard-belt",
    "name": "Standard Belt",
    "category": "CONTAINER",
    "subtype": "BELT",
    "footprint": "2x1",
    "containerProfile": {
      "slotCapacity": 3,
      "gridColumns": 3,
      "gridRows": 1,
      "label": "STANDARD BELT",
      "isolatedCells": true,
      "cellRules": [
        {
          "column": 1,
          "row": 1,
          "key": "HOLSTER_OR_TOOL",
          "label": "HOLSTER / TOOL",
          "acceptedTags": [
            "WEAPON",
            "SIDEARM",
            "BLADE",
            "MELEE",
            "TOOL",
            "TOOLS"
          ],
          "footprintMode": "SLOT"
        }
      ],
      "acceptedTags": [
        "DOCUMENT",
        "PERSONAL",
        "MEDICAL",
        "TOOLS",
        "TOOL",
        "UTILITY",
        "MISC",
        "WEAPON",
        "SIDEARM",
        "BLADE",
        "MELEE"
      ]
    },
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 94,
    "value": 320,
    "tags": [
      "CONTAINER",
      "BELT",
      "UTILITY"
    ],
    "notes": "Wearable belt mounted at WAIST. Exposes one dedicated holster/tool cell and two isolated 1x1 pockets.",
    "equipProfile": {
      "allowedAnchors": [],
      "layer": "",
      "coverage": [],
      "bodyMountSets": [
        {
          "id": "WAIST_CARRY",
          "mountIds": [
            "WAIST_CARRY"
          ]
        }
      ],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "CONTAINER"
  },
  {
    "id": "eqcat-thigh-holster",
    "name": "Thigh Holster",
    "category": "CONTAINER",
    "subtype": "HOLSTER",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "LICENSED",
    "condition": 90,
    "value": 260,
    "tags": [
      "CONTAINER",
      "HOLSTER",
      "SIDEARM"
    ],
    "notes": "Universal thigh holster body mount. Holds one compatible weapon/tool in its item-owned HOLSTER mount.",
    "equipProfile": {
      "allowedAnchors": [],
      "layer": "",
      "coverage": [],
      "bodyMountSets": [
        {
          "id": "LEFT_THIGH_HOLSTER",
          "mountIds": [
            "LEFT_THIGH_HOLSTER"
          ]
        },
        {
          "id": "RIGHT_THIGH_HOLSTER",
          "mountIds": [
            "RIGHT_THIGH_HOLSTER"
          ]
        }
      ],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "mountProfile": {
      "slots": [
        {
          "id": "HOLSTER",
          "type": "HOLSTER",
          "label": "HOLSTER",
          "acceptedTags": [
            "WEAPON",
            "SIDEARM",
            "TOOL"
          ],
          "blockedTags": [
            "LONG"
          ]
        }
      ]
    },
    "itemType": "CONTAINER"
  },
  {
    "id": "eqcat-backpack-small",
    "name": "Small Utility Backpack",
    "category": "CONTAINER",
    "subtype": "BACKPACK",
    "footprint": "2x2",
    "containerProfile": {
      "slotCapacity": 6,
      "label": "BACKPACK SMALL 2x3",
      "acceptedTags": [
        "DOCUMENT",
        "PERSONAL",
        "WEAPON",
        "MEDICAL",
        "TOOLS",
        "SURVIVAL",
        "UTILITY",
        "MISC",
        "MASS_COMPRESSION",
        "CAPACITY_MODULE",
        "CYBERWARE",
        "IMPLANT",
        "PACKAGED_CYBERWARE",
        "INSTALL_CANDIDATE"
      ]
    },
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 88,
    "value": 640,
    "tags": [
      "CONTAINER",
      "BACKPACK",
      "UTILITY"
    ],
    "notes": "Backpack host. Exposes a 6-slot carry capacity when equipped on BACK.",
    "equipProfile": {
      "allowedAnchors": [],
      "layer": "",
      "coverage": [],
      "bodyMountSets": [
        {
          "id": "BACK_CARRY",
          "mountIds": [
            "BACK_CARRY",
            "LEFT_SHOULDER_CARRY",
            "RIGHT_SHOULDER_CARRY"
          ]
        }
      ],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": true,
      "requires": [],
      "blocks": []
    },
    "itemType": "CONTAINER"
  },
  {
    "id": "eqcat-backpack-medium",
    "name": "Medium Utility Backpack",
    "category": "CONTAINER",
    "subtype": "BACKPACK",
    "footprint": "2x2",
    "containerProfile": {
      "slotCapacity": 8,
      "label": "BACKPACK MEDIUM 2x4",
      "acceptedTags": [
        "DOCUMENT",
        "PERSONAL",
        "WEAPON",
        "MEDICAL",
        "TOOLS",
        "SURVIVAL",
        "UTILITY",
        "MISC",
        "MASS_COMPRESSION",
        "CAPACITY_MODULE",
        "CYBERWARE",
        "IMPLANT",
        "PACKAGED_CYBERWARE",
        "INSTALL_CANDIDATE"
      ]
    },
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 86,
    "value": 860,
    "tags": [
      "CONTAINER",
      "BACKPACK",
      "UTILITY"
    ],
    "notes": "Backpack host. Exposes a 8-slot carry capacity when equipped on BACK.",
    "equipProfile": {
      "allowedAnchors": [],
      "layer": "",
      "coverage": [],
      "bodyMountSets": [
        {
          "id": "BACK_CARRY",
          "mountIds": [
            "BACK_CARRY",
            "LEFT_SHOULDER_CARRY",
            "RIGHT_SHOULDER_CARRY"
          ]
        }
      ],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": true,
      "requires": [],
      "blocks": []
    },
    "itemType": "CONTAINER"
  },
  {
    "id": "eqcat-backpack-large",
    "name": "Large Utility Backpack",
    "category": "CONTAINER",
    "subtype": "BACKPACK",
    "footprint": "2x3",
    "containerProfile": {
      "slotCapacity": 10,
      "label": "BACKPACK LARGE 2x5",
      "acceptedTags": [
        "DOCUMENT",
        "PERSONAL",
        "WEAPON",
        "MEDICAL",
        "TOOLS",
        "SURVIVAL",
        "UTILITY",
        "MISC",
        "MASS_COMPRESSION",
        "CAPACITY_MODULE",
        "CYBERWARE",
        "IMPLANT",
        "PACKAGED_CYBERWARE",
        "INSTALL_CANDIDATE"
      ]
    },
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 84,
    "value": 1180,
    "tags": [
      "CONTAINER",
      "BACKPACK",
      "UTILITY"
    ],
    "notes": "Backpack host. Exposes a 10-slot carry capacity when equipped on BACK.",
    "equipProfile": {
      "allowedAnchors": [],
      "layer": "",
      "coverage": [],
      "bodyMountSets": [
        {
          "id": "BACK_CARRY",
          "mountIds": [
            "BACK_CARRY",
            "LEFT_SHOULDER_CARRY",
            "RIGHT_SHOULDER_CARRY"
          ]
        }
      ],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": true,
      "requires": [],
      "blocks": []
    },
    "itemType": "CONTAINER"
  },
  {
    "id": "eqcat-capacity-module-i",
    "name": "Mass Compression Cube I",
    "category": "CONTAINER",
    "subtype": "MASS_COMPRESSION_CUBE",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 4200,
    "capacityTier": 1,
    "capacitySlots": 2,
    "containerProfile": {
      "slotCapacity": 8,
      "label": "MCC I 4x2",
      "acceptedTags": [
        "DOCUMENT",
        "PERSONAL",
        "WEAPON",
        "MEDICAL",
        "TOOLS",
        "SURVIVAL",
        "UTILITY",
        "MISC",
        "CYBERWARE",
        "IMPLANT",
        "PACKAGED_CYBERWARE",
        "INSTALL_CANDIDATE"
      ],
      "blockedTags": [
        "MASS_COMPRESSION",
        "CAPACITY_MODULE"
      ]
    },
    "requiresSubscriptionCategory": "MASS_COMPRESSION",
    "requiresSubscriptionTier": 1,
    "restrictions": {
      "noCapacityModuleNesting": true,
      "requiresSubscription": true,
      "requiresServiceSync": true
    },
    "tags": [
      "CONTAINER",
      "MASS_COMPRESSION",
      "MCC",
      "MASS_COMPRESSION_CUBE",
      "CAPACITY_MODULE"
    ],
    "notes": "Mass Compression Cube I. Physical footprint is 1x1; exposes 8 compressed grid cells when service coverage is active. Cube-in-cube nesting is blocked.",
    "equipProfile": {},
    "itemType": "CONTAINER"
  },
  {
    "id": "eqcat-capacity-module-ii",
    "name": "Mass Compression Cube II",
    "category": "CONTAINER",
    "subtype": "MASS_COMPRESSION_CUBE",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "LICENSED",
    "condition": 100,
    "value": 9600,
    "capacityTier": 2,
    "capacitySlots": 3,
    "containerProfile": {
      "slotCapacity": 12,
      "label": "MCC II 4x3",
      "acceptedTags": [
        "DOCUMENT",
        "PERSONAL",
        "WEAPON",
        "MEDICAL",
        "TOOLS",
        "SURVIVAL",
        "UTILITY",
        "MISC",
        "CYBERWARE",
        "IMPLANT",
        "PACKAGED_CYBERWARE",
        "INSTALL_CANDIDATE"
      ],
      "blockedTags": [
        "MASS_COMPRESSION",
        "CAPACITY_MODULE"
      ]
    },
    "requiresSubscriptionCategory": "MASS_COMPRESSION",
    "requiresSubscriptionTier": 2,
    "restrictions": {
      "noCapacityModuleNesting": true,
      "requiresSubscription": true,
      "requiresServiceSync": true
    },
    "tags": [
      "CONTAINER",
      "MASS_COMPRESSION",
      "MCC",
      "MASS_COMPRESSION_CUBE",
      "CAPACITY_MODULE"
    ],
    "notes": "Mass Compression Cube II. Physical footprint is 1x1; exposes 12 compressed grid cells when service coverage is active. Cube-in-cube nesting is blocked.",
    "equipProfile": {},
    "itemType": "CONTAINER"
  },
  {
    "id": "eqcat-capacity-module-iii",
    "name": "Mass Compression Cube III",
    "category": "CONTAINER",
    "subtype": "MASS_COMPRESSION_CUBE",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "RESTRICTED",
    "condition": 100,
    "value": 21400,
    "capacityTier": 3,
    "capacitySlots": 4,
    "containerProfile": {
      "slotCapacity": 16,
      "label": "MCC III 4x4",
      "acceptedTags": [
        "DOCUMENT",
        "PERSONAL",
        "WEAPON",
        "MEDICAL",
        "TOOLS",
        "SURVIVAL",
        "UTILITY",
        "MISC",
        "CYBERWARE",
        "IMPLANT",
        "PACKAGED_CYBERWARE",
        "INSTALL_CANDIDATE"
      ],
      "blockedTags": [
        "MASS_COMPRESSION",
        "CAPACITY_MODULE"
      ]
    },
    "requiresSubscriptionCategory": "MASS_COMPRESSION",
    "requiresSubscriptionTier": 3,
    "restrictions": {
      "noCapacityModuleNesting": true,
      "requiresSubscription": true,
      "requiresServiceSync": true
    },
    "tags": [
      "CONTAINER",
      "MASS_COMPRESSION",
      "MCC",
      "MASS_COMPRESSION_CUBE",
      "CAPACITY_MODULE"
    ],
    "notes": "Mass Compression Cube III. Physical footprint is 1x1; exposes 16 compressed grid cells when service coverage is active. Cube-in-cube nesting is blocked.",
    "equipProfile": {},
    "itemType": "CONTAINER"
  },
  {
    "id": "eqcat-capacity-module-iv",
    "name": "Mass Compression Cube IV",
    "category": "CONTAINER",
    "subtype": "MASS_COMPRESSION_CUBE",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "CORPORATE",
    "condition": 100,
    "value": 48000,
    "capacityTier": 4,
    "capacitySlots": 6,
    "containerProfile": {
      "slotCapacity": 24,
      "label": "MCC IV 4x6",
      "acceptedTags": [
        "DOCUMENT",
        "PERSONAL",
        "WEAPON",
        "MEDICAL",
        "TOOLS",
        "SURVIVAL",
        "UTILITY",
        "MISC",
        "CYBERWARE",
        "IMPLANT",
        "PACKAGED_CYBERWARE",
        "INSTALL_CANDIDATE"
      ],
      "blockedTags": [
        "MASS_COMPRESSION",
        "CAPACITY_MODULE"
      ]
    },
    "requiresSubscriptionCategory": "MASS_COMPRESSION",
    "requiresSubscriptionTier": 4,
    "restrictions": {
      "noCapacityModuleNesting": true,
      "requiresSubscription": true,
      "requiresServiceSync": true
    },
    "tags": [
      "CONTAINER",
      "MASS_COMPRESSION",
      "MCC",
      "MASS_COMPRESSION_CUBE",
      "CAPACITY_MODULE"
    ],
    "notes": "Mass Compression Cube IV. Physical footprint is 1x1; exposes 24 compressed grid cells when service coverage is active. Cube-in-cube nesting is blocked.",
    "equipProfile": {},
    "itemType": "CONTAINER"
  },
  {
    "id": "eqcat-owned-cyberware-basicsight-v2",
    "name": "BasicSight v2 Implant Kit",
    "category": "CYBERWARE",
    "subtype": "IMPLANT",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "PACKAGED",
    "legality": "LICENSED",
    "condition": 100,
    "value": 2200,
    "cyberwareCandidate": true,
    "installOnlyCandidate": true,
    "notWearable": true,
    "provider": "CoreMed NeuroSystems",
    "grade": "LICENSED",
    "scale": "SMALL",
    "purpose": "VISION",
    "side": "LEFT",
    "slot": "leftEye",
    "slots": [
      "leftEye"
    ],
    "slotCost": 1,
    "customizationSlots": 0,
    "neuroLoad": 1,
    "interfaceLoad": 1,
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "requiresNeurochipTier": 1,
    "requiresInterfaceTier": 1,
    "tags": [
      "CYBERWARE",
      "PACKAGED_CYBERWARE",
      "INSTALL_CANDIDATE",
      "IMPLANT",
      "OCULAR",
      "LICENSED"
    ],
    "notes": "Packaged ocular implant kit. Equipment source for Cyberware install planner.",
    "equipProfile": {},
    "itemType": "CYBERWARE"
  },
  {
    "id": "eqcat-owned-cyberware-cyber-arm",
    "name": "Cyber Arm Implant Kit",
    "category": "CYBERWARE",
    "subtype": "IMPLANT",
    "footprint": "2x2",
    "status": "OWNED",
    "operatingStatus": "PACKAGED",
    "legality": "LICENSED",
    "condition": 100,
    "value": 11800,
    "cyberwareCandidate": true,
    "installOnlyCandidate": true,
    "notWearable": true,
    "provider": "CoreMed NeuroSystems",
    "grade": "LICENSED",
    "scale": "LARGE",
    "primarySlot": "rightArmCore",
    "slot": "leftArmCore",
    "slots": [
      "leftArmCore"
    ],
    "slotLevel": "BIG",
    "descendantPolicy": "LOCK_BY_DEFAULT",
    "exposedSlots": [
      "rightHandCore"
    ],
    "acceptedManufacturers": [
      "CoreMed NeuroSystems"
    ],
    "acceptedStandards": [
      "STANDARD_BODY_BUS"
    ],
    "slotCost": 2,
    "customizationSlots": 2,
    "neuroLoad": 3,
    "interfaceLoad": 2,
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "requiresNeurochipTier": 3,
    "requiresInterfaceTier": 2,
    "tags": [
      "CYBERWARE",
      "PACKAGED_CYBERWARE",
      "INSTALL_CANDIDATE",
      "IMPLANT",
      "LIMB",
      "LICENSED"
    ],
    "notes": "Packaged cyber arm implant kit. Equipment source for Cyberware install planner.",
    "equipProfile": {},
    "compatibleSlots": [
      "leftArmCore",
      "rightArmCore"
    ],
    "itemType": "CYBERWARE"
  },
  {
    "id": "eqcat-service-bandana",
    "name": "Service Bandana",
    "category": "CLOTHING",
    "subtype": "BANDANA",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 35,
    "tags": [
      "CLOTHING",
      "HEAD_INNER",
      "TEST_LOADOUT"
    ],
    "notes": "Inner head layer test item.",
    "equipProfile": {
      "allowedAnchors": [
        "HEAD"
      ],
      "layer": "INNER",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "CLOTHING"
  },
  {
    "id": "eqcat-beta-service-cap",
    "name": "Beta Service Cap",
    "category": "CLOTHING",
    "subtype": "SERVICE_CAP",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 90,
    "tags": [
      "CLOTHING",
      "HEADGEAR",
      "TEST_LOADOUT"
    ],
    "notes": "Outer headwear test item.",
    "equipProfile": {
      "allowedAnchors": [
        "HEAD"
      ],
      "layer": "OUTER",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "CLOTHING"
  },
  {
    "id": "eqcat-service-respirator",
    "name": "Service Respirator",
    "category": "CLOTHING",
    "subtype": "RESPIRATOR",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 180,
    "tags": [
      "CLOTHING",
      "FACE",
      "TEST_LOADOUT"
    ],
    "notes": "Single face layer test item.",
    "equipProfile": {
      "allowedAnchors": [
        "FACE"
      ],
      "layer": "FACE",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "CLOTHING"
  },
  {
    "id": "eqcat-service-neck-gaiter",
    "name": "Service Neck Gaiter",
    "category": "CLOTHING",
    "subtype": "NECK_GAITER",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 60,
    "tags": [
      "CLOTHING",
      "NECK_INNER",
      "TEST_LOADOUT"
    ],
    "notes": "Scarf/gaiter layer on the neck.",
    "equipProfile": {
      "allowedAnchors": [
        "NECK"
      ],
      "layer": "INNER",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "CLOTHING"
  },
  {
    "id": "eqcat-light-neck-guard",
    "name": "Light Neck Guard",
    "category": "ARMOR",
    "subtype": "NECK_GUARD",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 220,
    "tags": [
      "ARMOR",
      "NECK_ARMOR",
      "TEST_LOADOUT"
    ],
    "notes": "Protective neck layer.",
    "equipProfile": {
      "allowedAnchors": [
        "NECK"
      ],
      "layer": "ARMOR",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "ARMOR"
  },
  {
    "id": "eqcat-official-white-shirt",
    "name": "Official White Shirt",
    "category": "CLOTHING",
    "subtype": "OFFICIAL_SHIRT",
    "footprint": "1x2",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 170,
    "tags": [
      "CLOTHING",
      "SHIRT",
      "TEST_LOADOUT"
    ],
    "notes": "Standard long-sleeve shirt. Uses the TORSO / INNER clothing slot; sleeves are implicit and do not duplicate shoulder or forearm occupancy.",
    "equipProfile": {
      "allowedAnchors": [
        "TORSO"
      ],
      "layer": "INNER",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "CLOTHING"
  },
  {
    "id": "eqcat-service-sweatshirt",
    "name": "Service Sweatshirt",
    "category": "CLOTHING",
    "subtype": "SWEATSHIRT",
    "footprint": "2x2",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 260,
    "tags": [
      "CLOTHING",
      "SWEATSHIRT",
      "TEST_LOADOUT"
    ],
    "notes": "Standard sweatshirt. Uses the TORSO / OUTER clothing slot; sleeves are implicit.",
    "equipProfile": {
      "allowedAnchors": [
        "TORSO"
      ],
      "layer": "OUTER",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "CLOTHING"
  },
  {
    "id": "eqcat-service-anorak",
    "name": "Service Anorak",
    "category": "CLOTHING",
    "subtype": "ANORAK",
    "footprint": "2x3",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 520,
    "tags": [
      "CLOTHING",
      "OUTERWEAR",
      "TEST_LOADOUT"
    ],
    "notes": "Standard outerwear. Uses the TORSO / OUTERWEAR slot without duplicating ordinary sleeve or waist occupancy.",
    "equipProfile": {
      "allowedAnchors": [
        "TORSO"
      ],
      "layer": "OUTERWEAR",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "CLOTHING"
  },
  {
    "id": "eqcat-thermal-leggings",
    "name": "Thermal Leggings",
    "category": "CLOTHING",
    "subtype": "LEGGINGS",
    "footprint": "1x2",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 120,
    "tags": [
      "CLOTHING",
      "LEG_INNER",
      "TEST_LOADOUT"
    ],
    "notes": "Inner leg garment. Uses the aggregate LEGS / INNER clothing slot.",
    "equipProfile": {
      "allowedAnchors": [
        "LEGS"
      ],
      "layer": "INNER",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "CLOTHING"
  },
  {
    "id": "eqcat-utility-trousers",
    "name": "Utility Trousers",
    "category": "CLOTHING",
    "subtype": "TROUSERS",
    "footprint": "2x2",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 240,
    "tags": [
      "CLOTHING",
      "TROUSERS",
      "TEST_LOADOUT"
    ],
    "notes": "Trousers. Uses the aggregate LEGS / OUTER clothing slot.",
    "equipProfile": {
      "allowedAnchors": [
        "LEGS"
      ],
      "layer": "OUTER",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "CLOTHING"
  },
  {
    "id": "eqcat-beta-work-gloves",
    "name": "Beta Work Gloves",
    "category": "CLOTHING",
    "subtype": "WORK_GLOVES",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 110,
    "tags": [
      "CLOTHING",
      "GLOVES",
      "TEST_LOADOUT"
    ],
    "notes": "Paired gloves on HANDS / INNER.",
    "equipProfile": {
      "allowedAnchors": [
        "HANDS"
      ],
      "layer": "INNER",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "CLOTHING"
  },
  {
    "id": "eqcat-armored-gloves",
    "name": "Armored Gloves",
    "category": "ARMOR",
    "subtype": "ARMORED_GLOVES",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 280,
    "tags": [
      "ARMOR",
      "GLOVES",
      "TEST_LOADOUT"
    ],
    "notes": "Paired protective gloves on HANDS / ARMOR.",
    "equipProfile": {
      "allowedAnchors": [
        "HANDS"
      ],
      "layer": "ARMOR",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "ARMOR"
  },
  {
    "id": "eqcat-service-socks",
    "name": "Service Socks",
    "category": "CLOTHING",
    "subtype": "SOCKS",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 35,
    "tags": [
      "CLOTHING",
      "SOCKS",
      "TEST_LOADOUT"
    ],
    "notes": "Paired socks on FEET / INNER.",
    "equipProfile": {
      "allowedAnchors": [
        "FEET"
      ],
      "layer": "INNER",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "CLOTHING"
  },
  {
    "id": "eqcat-reinforced-service-boots",
    "name": "Reinforced Service Boots",
    "category": "CLOTHING",
    "subtype": "SERVICE_BOOTS",
    "footprint": "1x2",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 240,
    "tags": [
      "CLOTHING",
      "BOOTS",
      "FOOTWEAR",
      "TEST_LOADOUT"
    ],
    "notes": "Single footwear pair; blocks a second footwear item.",
    "equipProfile": {
      "allowedAnchors": [
        "FEET"
      ],
      "layer": "FOOTWEAR",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "CLOTHING"
  },
  {
    "id": "eqcat-light-chest-plate",
    "name": "Light Chest Plate",
    "category": "ARMOR",
    "subtype": "CHEST_PLATE",
    "footprint": "2x2",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "LICENSED",
    "condition": 96,
    "value": 650,
    "tags": [
      "ARMOR",
      "TORSO",
      "TEST_LOADOUT"
    ],
    "notes": "Torso armor with an item-owned CHEST_RIG mount.",
    "equipProfile": {
      "allowedAnchors": [
        "TORSO"
      ],
      "layer": "ARMOR",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "mountProfile": {
      "slots": [
        {
          "id": "CHEST_RIG",
          "type": "CHEST_RIG",
          "label": "CHEST RIG",
          "acceptedTags": [
            "CHEST_RIG"
          ],
          "blockedTags": []
        }
      ]
    },
    "itemType": "ARMOR"
  },
  {
    "id": "eqcat-shoulder-guard",
    "name": "Shoulder Guard",
    "category": "ARMOR",
    "subtype": "SHOULDER_GUARD",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "LICENSED",
    "condition": 96,
    "value": 180,
    "tags": [
      "ARMOR",
      "SHOULDER",
      "TEST_LOADOUT"
    ],
    "notes": "Independent shoulder armor.",
    "equipProfile": {
      "allowedAnchors": [
        "LEFT_SHOULDER",
        "RIGHT_SHOULDER"
      ],
      "layer": "ARMOR",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "ARMOR"
  },
  {
    "id": "eqcat-forearm-guard",
    "name": "Forearm Guard",
    "category": "ARMOR",
    "subtype": "FOREARM_GUARD",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "LICENSED",
    "condition": 96,
    "value": 160,
    "tags": [
      "ARMOR",
      "FOREARM",
      "TEST_LOADOUT"
    ],
    "notes": "Independent forearm armor.",
    "equipProfile": {
      "allowedAnchors": [
        "LEFT_FOREARM",
        "RIGHT_FOREARM"
      ],
      "layer": "ARMOR",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "ARMOR"
  },
  {
    "id": "eqcat-light-leg-armor",
    "name": "Light Leg Armor",
    "category": "ARMOR",
    "subtype": "LEG_ARMOR",
    "footprint": "2x2",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "LICENSED",
    "condition": 96,
    "value": 760,
    "tags": [
      "ARMOR",
      "LEGS",
      "TEST_LOADOUT"
    ],
    "notes": "Single leg armor item using the aggregate LEGS / ARMOR slot.",
    "equipProfile": {
      "allowedAnchors": [
        "LEGS"
      ],
      "layer": "ARMOR",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "ARMOR"
  },
  {
    "id": "eqcat-service-chest-rig",
    "name": "Service Chest Rig",
    "category": "CONTAINER",
    "subtype": "CHEST_RIG",
    "footprint": "2x2",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 430,
    "tags": [
      "CONTAINER",
      "CHEST_RIG",
      "UTILITY",
      "TEST_LOADOUT"
    ],
    "notes": "Can be worn as TORSO / OUTER or mounted into an armor CHEST_RIG slot.",
    "equipProfile": {
      "allowedAnchors": [
        "TORSO"
      ],
      "layer": "OUTER",
      "coverage": [
        "BACK"
      ],
      "bodyMountSets": [],
      "itemMountTypes": [
        "CHEST_RIG"
      ],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "containerProfile": {
      "slotCapacity": 4,
      "gridColumns": 2,
      "gridRows": 2,
      "label": "SERVICE CHEST RIG",
      "acceptedTags": [
        "DOCUMENT",
        "PERSONAL",
        "MEDICAL",
        "TOOLS",
        "TOOL",
        "UTILITY",
        "MISC"
      ]
    },
    "itemType": "CONTAINER"
  },
  {
    "id": "eqcat-service-watch",
    "name": "Service Watch",
    "category": "ACCESSORY",
    "subtype": "WATCH",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 160,
    "tags": [
      "ACCESSORY",
      "WATCH",
      "FOREARM_ACCESSORY",
      "TEST_LOADOUT"
    ],
    "notes": "Forearm accessory mount item.",
    "equipProfile": {
      "allowedAnchors": [],
      "layer": "",
      "coverage": [],
      "bodyMountSets": [
        {
          "id": "LEFT_FOREARM_ACCESSORY_1",
          "mountIds": [
            "LEFT_FOREARM_ACCESSORY_1"
          ]
        },
        {
          "id": "LEFT_FOREARM_ACCESSORY_2",
          "mountIds": [
            "LEFT_FOREARM_ACCESSORY_2"
          ]
        },
        {
          "id": "RIGHT_FOREARM_ACCESSORY_1",
          "mountIds": [
            "RIGHT_FOREARM_ACCESSORY_1"
          ]
        },
        {
          "id": "RIGHT_FOREARM_ACCESSORY_2",
          "mountIds": [
            "RIGHT_FOREARM_ACCESSORY_2"
          ]
        }
      ],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "ACCESSORY"
  },
  {
    "id": "eqcat-wrist-terminal",
    "name": "Wrist Terminal",
    "category": "ACCESSORY",
    "subtype": "WRIST_TERMINAL",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 460,
    "tags": [
      "ACCESSORY",
      "DEVICE",
      "FOREARM_ACCESSORY",
      "TEST_LOADOUT"
    ],
    "notes": "Forearm-mounted device.",
    "equipProfile": {
      "allowedAnchors": [],
      "layer": "",
      "coverage": [],
      "bodyMountSets": [
        {
          "id": "LEFT_FOREARM_ACCESSORY_1",
          "mountIds": [
            "LEFT_FOREARM_ACCESSORY_1"
          ]
        },
        {
          "id": "LEFT_FOREARM_ACCESSORY_2",
          "mountIds": [
            "LEFT_FOREARM_ACCESSORY_2"
          ]
        },
        {
          "id": "RIGHT_FOREARM_ACCESSORY_1",
          "mountIds": [
            "RIGHT_FOREARM_ACCESSORY_1"
          ]
        },
        {
          "id": "RIGHT_FOREARM_ACCESSORY_2",
          "mountIds": [
            "RIGHT_FOREARM_ACCESSORY_2"
          ]
        }
      ],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "ACCESSORY"
  },
  {
    "id": "eqcat-port-diagnostic-key",
    "name": "Port Diagnostic Key",
    "category": "DEVICE",
    "subtype": "IMPLANT_PORT_DEVICE",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 520,
    "tags": [
      "DEVICE",
      "IMPLANT_PORT_DEVICE",
      "PORT_DEVICE",
      "TEST_LOADOUT"
    ],
    "notes": "Device physically connected to the rear implant port.",
    "equipProfile": {
      "allowedAnchors": [],
      "layer": "",
      "coverage": [],
      "bodyMountSets": [
        {
          "id": "IMPLANT_PORT",
          "mountIds": [
            "IMPLANT_PORT"
          ]
        }
      ],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "DEVICE"
  },
  {
    "id": "eqcat-sling-utility-bag",
    "name": "Sling Utility Bag",
    "category": "CONTAINER",
    "subtype": "SLING_BAG",
    "footprint": "2x2",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 420,
    "tags": [
      "CONTAINER",
      "BAG",
      "SLING",
      "UTILITY",
      "TEST_LOADOUT"
    ],
    "notes": "Single-shoulder bag used to test multi-carrier penalties.",
    "equipProfile": {
      "allowedAnchors": [],
      "layer": "",
      "coverage": [],
      "bodyMountSets": [
        {
          "id": "LEFT_SHOULDER_CARRY",
          "mountIds": [
            "LEFT_SHOULDER_CARRY"
          ]
        },
        {
          "id": "RIGHT_SHOULDER_CARRY",
          "mountIds": [
            "RIGHT_SHOULDER_CARRY"
          ]
        }
      ],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": true,
      "requires": [],
      "blocks": []
    },
    "containerProfile": {
      "slotCapacity": 4,
      "gridColumns": 2,
      "gridRows": 2,
      "label": "SLING UTILITY BAG",
      "acceptedTags": [
        "DOCUMENT",
        "PERSONAL",
        "MEDICAL",
        "TOOLS",
        "UTILITY",
        "MISC"
      ]
    },
    "itemType": "CONTAINER"
  },
  {
    "id": "eqcat-netrunner-undersuit",
    "name": "Netrunner Undersuit",
    "category": "CLOTHING",
    "subtype": "FULL_BODY_SUIT",
    "footprint": "2x3",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 980,
    "tags": [
      "CLOTHING",
      "UNDERSUIT",
      "NETRUNNER",
      "TEST_LOADOUT"
    ],
    "notes": "Mechanically full-body inner suit. Occupies TORSO / INNER and additionally blocks HEAD / INNER plus LEGS / INNER.",
    "equipProfile": {
      "allowedAnchors": [
        "TORSO"
      ],
      "layer": "INNER",
      "coverage": [
        "HEAD",
        "LEGS"
      ],
      "bodyMountSets": [],
      "itemMountTypes": [],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    },
    "itemType": "CLOTHING"
  },
  {
    "id": "eqcat-coremed-analgesic-tablets",
    "name": "Analgesic Tablets",
    "category": "MEDICAL",
    "subtype": "MEDICINE",
    "marketDepartment": "MEDICAL",
    "marketSubcategory": "MEDICINE",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 45,
    "manufacturer": "CoreMed",
    "provider": "CoreMed",
    "visualProfile": {
      "thumbnail": "assets/market/products/coremed-analgesic-tablets.svg",
      "detail": "assets/market/products/coremed-analgesic-tablets.svg",
      "alt": "Sealed blister pack of analgesic tablets",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 12,
      "dose": "1 TABLET",
      "shelfLife": "24 MONTHS"
    },
    "tags": [
      "MEDICAL",
      "MEDICINE",
      "PHARMA",
      "CONSUMABLE"
    ],
    "notes": "General-purpose pain relief tablets in a sealed civil package.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-coremed-antiseptic-ampoules",
    "name": "Antiseptic Ampoules",
    "category": "MEDICAL",
    "subtype": "TRAUMA_CARE",
    "marketDepartment": "MEDICAL",
    "marketSubcategory": "TRAUMA_CARE",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 90,
    "manufacturer": "CoreMed",
    "provider": "CoreMed",
    "visualProfile": {
      "thumbnail": "assets/market/products/coremed-antiseptic-ampoules.svg",
      "detail": "assets/market/products/coremed-antiseptic-ampoules.svg",
      "alt": "Sterile antiseptic ampoules in a sealed tray",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 4,
      "dose": "1 AMPOULE",
      "shelfLife": "30 MONTHS"
    },
    "tags": [
      "MEDICAL",
      "TRAUMA_CARE",
      "FIRST_AID",
      "CONSUMABLE"
    ],
    "notes": "Sterile topical antiseptic ampoules for wound preparation.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-coremed-coagulant-patches",
    "name": "Coagulant Patches",
    "category": "MEDICAL",
    "subtype": "TRAUMA_CARE",
    "marketDepartment": "MEDICAL",
    "marketSubcategory": "TRAUMA_CARE",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 120,
    "manufacturer": "CoreMed",
    "provider": "CoreMed",
    "visualProfile": {
      "thumbnail": "assets/market/products/coremed-coagulant-patches.svg",
      "detail": "assets/market/products/coremed-coagulant-patches.svg",
      "alt": "Three sealed coagulant patches",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 3,
      "dose": "1 PATCH",
      "shelfLife": "18 MONTHS"
    },
    "tags": [
      "MEDICAL",
      "TRAUMA_CARE",
      "FIRST_AID",
      "CONSUMABLE"
    ],
    "notes": "Single-use clotting patches for temporary hemorrhage control.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-coremed-antibiotic-course",
    "name": "Antibiotic Course",
    "category": "MEDICAL",
    "subtype": "MEDICINE",
    "marketDepartment": "MEDICAL",
    "marketSubcategory": "MEDICINE",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "LICENSED",
    "condition": 100,
    "value": 180,
    "manufacturer": "CoreMed",
    "provider": "CoreMed",
    "visualProfile": {
      "thumbnail": "assets/market/products/coremed-antibiotic-course.svg",
      "detail": "assets/market/products/coremed-antibiotic-course.svg",
      "alt": "Sealed antibiotic capsule course",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 10,
      "dose": "1 CAPSULE / 12 H",
      "shelfLife": "18 MONTHS"
    },
    "tags": [
      "MEDICAL",
      "MEDICINE",
      "PHARMA",
      "CONSUMABLE"
    ],
    "notes": "Sealed broad-spectrum antibiotic treatment course.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-somnacore-alertness-tablets",
    "name": "Alertness Tablets",
    "category": "MEDICAL",
    "subtype": "STIMULANT",
    "marketDepartment": "MEDICAL",
    "marketSubcategory": "STIMULANTS",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "LICENSED",
    "condition": 100,
    "value": 160,
    "manufacturer": "SomnaCore",
    "provider": "SomnaCore",
    "visualProfile": {
      "thumbnail": "assets/market/products/somnacore-alertness-tablets.svg",
      "detail": "assets/market/products/somnacore-alertness-tablets.svg",
      "alt": "Regulated alertness tablets in a sealed blister",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 6,
      "dose": "1 TABLET",
      "shelfLife": "20 MONTHS"
    },
    "tags": [
      "MEDICAL",
      "STIMULANT",
      "PHARMA",
      "CONSUMABLE"
    ],
    "notes": "Regulated alertness support tablets for extended duty periods.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-coremed-nausea-suppressant",
    "name": "Nausea Suppressant",
    "category": "MEDICAL",
    "subtype": "SUPPRESSANT",
    "marketDepartment": "MEDICAL",
    "marketSubcategory": "SUPPRESSANTS",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 75,
    "manufacturer": "CoreMed",
    "provider": "CoreMed",
    "visualProfile": {
      "thumbnail": "assets/market/products/coremed-nausea-suppressant.svg",
      "detail": "assets/market/products/coremed-nausea-suppressant.svg",
      "alt": "Compact blister pack of nausea suppressant tablets",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 8,
      "dose": "1 TABLET",
      "shelfLife": "24 MONTHS"
    },
    "tags": [
      "MEDICAL",
      "SUPPRESSANT",
      "PHARMA",
      "CONSUMABLE"
    ],
    "notes": "Civil anti-nausea tablets in a compact blister package.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-coremed-first-aid-pouch",
    "name": "First Aid Pouch",
    "category": "MEDICAL",
    "subtype": "MEDICAL_KIT",
    "marketDepartment": "MEDICAL",
    "marketSubcategory": "MEDICAL_KITS",
    "footprint": "2x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 240,
    "manufacturer": "CoreMed",
    "provider": "CoreMed",
    "visualProfile": {
      "thumbnail": "assets/market/products/coremed-first-aid-pouch.svg",
      "detail": "assets/market/products/coremed-first-aid-pouch.svg",
      "alt": "Sealed CoreMed first aid pouch",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 1,
      "packageLabel": "1 SEALED KIT",
      "shelfLife": "36 MONTHS"
    },
    "tags": [
      "MEDICAL",
      "MEDICAL_KIT",
      "FIRST_AID",
      "CONSUMABLE"
    ],
    "notes": "Compact sealed pouch with basic wound-care consumables.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-habitat-standard-ration-pack",
    "name": "Standard Nutrient Ration",
    "category": "FOOD",
    "subtype": "RATIONS",
    "marketDepartment": "FOOD",
    "marketSubcategory": "RATIONS",
    "footprint": "1x2",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 60,
    "manufacturer": "Habitat Market",
    "provider": "Habitat Market",
    "visualProfile": {
      "thumbnail": "assets/market/products/habitat-standard-ration-pack.svg",
      "detail": "assets/market/products/habitat-standard-ration-pack.svg",
      "alt": "Sealed standard nutrient ration pack",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 4,
      "mealUnits": 4,
      "rationClass": "STANDARD",
      "shelfLife": "18 MONTHS"
    },
    "tags": [
      "FOOD",
      "RATIONS",
      "RATION",
      "EDIBLE",
      "CONSUMABLE"
    ],
    "notes": "Four sealed nutrient portions for routine household storage.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-habitat-protein-meal-bricks",
    "name": "Protein Meal Bricks",
    "category": "FOOD",
    "subtype": "MEALS",
    "marketDepartment": "FOOD",
    "marketSubcategory": "MEALS",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 45,
    "manufacturer": "Habitat Market",
    "provider": "Habitat Market",
    "visualProfile": {
      "thumbnail": "assets/market/products/habitat-protein-meal-bricks.svg",
      "detail": "assets/market/products/habitat-protein-meal-bricks.svg",
      "alt": "Two packaged protein meal bricks",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 2,
      "mealUnits": 2,
      "rationClass": "UTILITY",
      "quality": "UTILITY",
      "shelfLife": "12 MONTHS"
    },
    "tags": [
      "FOOD",
      "MEAL",
      "NUTRITION",
      "EDIBLE",
      "CONSUMABLE"
    ],
    "notes": "Dense protein meal bricks intended for quick preparation.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-habitat-heat-sealed-meal-tray",
    "name": "Heat-Sealed Meal Tray",
    "category": "FOOD",
    "subtype": "MEALS",
    "marketDepartment": "FOOD",
    "marketSubcategory": "MEALS",
    "footprint": "2x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 55,
    "manufacturer": "Habitat Market",
    "provider": "Habitat Market",
    "visualProfile": {
      "thumbnail": "assets/market/products/habitat-heat-sealed-meal-tray.svg",
      "detail": "assets/market/products/habitat-heat-sealed-meal-tray.svg",
      "alt": "Heat-sealed prepared meal tray",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 1,
      "mealUnits": 1,
      "rationClass": "STANDARD",
      "quality": "STANDARD",
      "shelfLife": "9 MONTHS"
    },
    "tags": [
      "FOOD",
      "MEAL",
      "EDIBLE",
      "CONSUMABLE"
    ],
    "notes": "Single heat-ready meal tray for domestic terminals.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-habitat-hydration-pouches",
    "name": "Hydration Pouches",
    "category": "FOOD",
    "subtype": "DRINKS",
    "marketDepartment": "FOOD",
    "marketSubcategory": "DRINKS",
    "footprint": "1x2",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 35,
    "manufacturer": "Habitat Market",
    "provider": "Habitat Market",
    "visualProfile": {
      "thumbnail": "assets/market/products/habitat-hydration-pouches.svg",
      "detail": "assets/market/products/habitat-hydration-pouches.svg",
      "alt": "Set of sealed hydration pouches",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 6,
      "quality": "FILTERED",
      "shelfLife": "12 MONTHS"
    },
    "tags": [
      "FOOD",
      "DRINK",
      "BEVERAGE",
      "CONSUMABLE"
    ],
    "notes": "Six sealed filtered-water pouches for daily use.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-habitat-electrolyte-concentrate",
    "name": "Electrolyte Concentrate",
    "category": "FOOD",
    "subtype": "SUPPLEMENTS",
    "marketDepartment": "FOOD",
    "marketSubcategory": "SUPPLEMENTS",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 70,
    "manufacturer": "Habitat Market",
    "provider": "Habitat Market",
    "visualProfile": {
      "thumbnail": "assets/market/products/habitat-electrolyte-concentrate.svg",
      "detail": "assets/market/products/habitat-electrolyte-concentrate.svg",
      "alt": "Electrolyte concentrate sachets",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 8,
      "dose": "1 SACHET",
      "quality": "STANDARD",
      "shelfLife": "20 MONTHS"
    },
    "tags": [
      "FOOD",
      "NUTRITION",
      "SUPPLEMENT",
      "DRINK",
      "CONSUMABLE"
    ],
    "notes": "Water-soluble electrolyte sachets for routine hydration support.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-habitat-insect-protein-crisps",
    "name": "Insect Protein Crisps",
    "category": "FOOD",
    "subtype": "SNACKS",
    "marketDepartment": "FOOD",
    "marketSubcategory": "SNACKS",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 28,
    "manufacturer": "Habitat Market",
    "provider": "Habitat Market",
    "visualProfile": {
      "thumbnail": "assets/market/products/habitat-insect-protein-crisps.svg",
      "detail": "assets/market/products/habitat-insect-protein-crisps.svg",
      "alt": "Sealed insect-protein crisp package",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 3,
      "quality": "STANDARD",
      "shelfLife": "10 MONTHS"
    },
    "tags": [
      "FOOD",
      "EDIBLE",
      "NUTRITION",
      "CONSUMABLE"
    ],
    "notes": "Three sealed portions of seasoned insect-protein crisps.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-habitat-personal-hygiene-pack",
    "name": "Personal Hygiene Pack",
    "category": "HOUSEHOLD",
    "subtype": "HYGIENE",
    "marketDepartment": "HOUSEHOLD",
    "marketSubcategory": "HYGIENE",
    "footprint": "2x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 85,
    "manufacturer": "Habitat Market",
    "provider": "Habitat Market",
    "visualProfile": {
      "thumbnail": "assets/market/products/habitat-personal-hygiene-pack.svg",
      "detail": "assets/market/products/habitat-personal-hygiene-pack.svg",
      "alt": "Sealed personal hygiene supply pack",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 1,
      "packageLabel": "1 HOUSEHOLD PACK"
    },
    "tags": [
      "HOUSEHOLD",
      "HYGIENE",
      "HABITAT_SUPPLY",
      "CONSUMABLE"
    ],
    "notes": "Basic sealed hygiene supplies for one resident.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-habitat-surface-cleaning-concentrate",
    "name": "Surface Cleaning Concentrate",
    "category": "HOUSEHOLD",
    "subtype": "CLEANING",
    "marketDepartment": "HOUSEHOLD",
    "marketSubcategory": "CLEANING",
    "footprint": "1x2",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 65,
    "manufacturer": "Habitat Market",
    "provider": "Habitat Market",
    "visualProfile": {
      "thumbnail": "assets/market/products/habitat-surface-cleaning-concentrate.svg",
      "detail": "assets/market/products/habitat-surface-cleaning-concentrate.svg",
      "alt": "Two bottles of surface cleaning concentrate",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 2,
      "packageLabel": "2 REFILL BOTTLES"
    },
    "tags": [
      "HOUSEHOLD",
      "CLEANING",
      "HABITAT_SUPPLY",
      "CONSUMABLE"
    ],
    "notes": "Two refill bottles of domestic surface-cleaning concentrate.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-habitat-laundry-sheets",
    "name": "Laundry Sheets",
    "category": "HOUSEHOLD",
    "subtype": "CLEANING",
    "marketDepartment": "HOUSEHOLD",
    "marketSubcategory": "CLEANING",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 40,
    "manufacturer": "Habitat Market",
    "provider": "Habitat Market",
    "visualProfile": {
      "thumbnail": "assets/market/products/habitat-laundry-sheets.svg",
      "detail": "assets/market/products/habitat-laundry-sheets.svg",
      "alt": "Pack of pre-dosed laundry sheets",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 12,
      "packageLabel": "12 WASH SHEETS"
    },
    "tags": [
      "HOUSEHOLD",
      "CLEANING",
      "HYGIENE",
      "CONSUMABLE"
    ],
    "notes": "Pre-dosed sheets for compact housing laundry units.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-habitat-water-filter-cartridges",
    "name": "Water Filter Cartridges",
    "category": "HOUSEHOLD",
    "subtype": "UTILITY_SUPPLIES",
    "marketDepartment": "HOUSEHOLD",
    "marketSubcategory": "UTILITY_SUPPLIES",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 110,
    "manufacturer": "Habitat Market",
    "provider": "Habitat Market",
    "visualProfile": {
      "thumbnail": "assets/market/products/habitat-water-filter-cartridges.svg",
      "detail": "assets/market/products/habitat-water-filter-cartridges.svg",
      "alt": "Pair of domestic water filter cartridges",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 2,
      "packageLabel": "2 CARTRIDGES"
    },
    "tags": [
      "HOUSEHOLD",
      "UTILITY",
      "HABITAT_SUPPLY",
      "CONSUMABLE"
    ],
    "notes": "Replacement cartridges for standard domestic water terminals.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-habitat-waste-liner-roll",
    "name": "Waste Liner Roll",
    "category": "HOUSEHOLD",
    "subtype": "UTILITY_SUPPLIES",
    "marketDepartment": "HOUSEHOLD",
    "marketSubcategory": "UTILITY_SUPPLIES",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 30,
    "manufacturer": "Habitat Market",
    "provider": "Habitat Market",
    "visualProfile": {
      "thumbnail": "assets/market/products/habitat-waste-liner-roll.svg",
      "detail": "assets/market/products/habitat-waste-liner-roll.svg",
      "alt": "Roll of sealed domestic waste liners",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 20,
      "packageLabel": "20 LINERS"
    },
    "tags": [
      "HOUSEHOLD",
      "UTILITY",
      "HABITAT_SUPPLY",
      "CONSUMABLE"
    ],
    "notes": "Roll of sealed liners sized for standard unit waste ports.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-habitat-utility-sealant-tape",
    "name": "Utility Sealant Tape",
    "category": "HOUSEHOLD",
    "subtype": "UTILITY_SUPPLIES",
    "marketDepartment": "HOUSEHOLD",
    "marketSubcategory": "UTILITY_SUPPLIES",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 52,
    "manufacturer": "Habitat Market",
    "provider": "Habitat Market",
    "visualProfile": {
      "thumbnail": "assets/market/products/habitat-utility-sealant-tape.svg",
      "detail": "assets/market/products/habitat-utility-sealant-tape.svg",
      "alt": "Two rolls of utility sealant tape",
      "fit": "CONTAIN"
    },
    "consumable": true,
    "consumableProfile": {
      "packageQuantity": 2,
      "packageLabel": "2 ROLLS"
    },
    "tags": [
      "HOUSEHOLD",
      "UTILITY",
      "HABITAT_SUPPLY",
      "CONSUMABLE"
    ],
    "notes": "Two compact rolls of general domestic sealant tape.",
    "equipProfile": {}
  },
  {
    "id": "eqcat-fragmentation-grenade",
    "name": "Fragmentation Grenade",
    "category": "WEAPON",
    "subtype": "FRAGMENTATION_GRENADE",
    "itemType": "GRENADE",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "RESTRICTED",
    "condition": 100,
    "value": 280,
    "tags": [
      "WEAPON",
      "GRENADE",
      "THROWABLE",
      "EXPLOSIVE"
    ],
    "notes": "Functional grenade type skeleton. Damage and blast resolution are intentionally not implemented.",
    "itemTypeProfile": {
      "grenadeClass": "FRAGMENTATION",
      "triggerModes": [
        "MANUAL"
      ],
      "defaultFuseSeconds": 4,
      "effectTags": [
        "FRAGMENTATION"
      ],
      "singleUse": true
    },
    "equipProfile": {
      "allowedAnchors": [
        "LEFT_HAND",
        "RIGHT_HAND"
      ],
      "layer": "HELD",
      "coverage": [],
      "bodyMountSets": [],
      "itemMountTypes": [
        "GRENADE_POUCH"
      ],
      "handsRequired": 1,
      "countsAsBulkyCarrier": false,
      "requires": [],
      "blocks": []
    }
  },
  {
    "id": "eqcat-compact-pistol-magazine",
    "name": "Compact Pistol Magazine",
    "category": "AMMUNITION",
    "subtype": "PISTOL_MAGAZINE",
    "itemType": "MAGAZINE",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 45,
    "tags": [
      "MAGAZINE",
      "PISTOL_MAGAZINE",
      "COMPACT_PISTOL",
      "AMMUNITION"
    ],
    "notes": "Detachable magazine skeleton for future load, unload and reload operations.",
    "itemTypeProfile": {
      "magazineType": "COMPACT_PISTOL",
      "ammunitionType": "PISTOL_STANDARD",
      "capacity": 12
    },
    "equipProfile": {}
  },
  {
    "id": "eqcat-standard-pistol-rounds",
    "name": "Standard Pistol Rounds",
    "category": "AMMUNITION",
    "subtype": "ROUNDS",
    "itemType": "AMMUNITION",
    "footprint": "1x1",
    "status": "OWNED",
    "operatingStatus": "ACTIVE",
    "legality": "REGISTERED",
    "condition": 100,
    "value": 36,
    "tags": [
      "AMMUNITION",
      "ROUNDS",
      "PISTOL_STANDARD"
    ],
    "notes": "Ammunition stack skeleton. Ballistics and damage modifiers are intentionally not implemented.",
    "itemTypeProfile": {
      "ammunitionType": "PISTOL_STANDARD",
      "unit": "ROUND",
      "stackLimit": 100
    },
    "equipProfile": {}
  },
{
  "id": "eqcat-household-rest-cot",
  "name": "Fold-Frame Rest Cot",
  "category": "HOUSEHOLD",
  "subtype": "REST_COT",
  "itemType": "HOUSEHOLD_FURNISHING",
  "footprint": "2x3",
  "status": "OWNED",
  "operatingStatus": "ACTIVE",
  "legality": "REGISTERED",
  "condition": 100,
  "value": 420,
  "tags": [
    "HOUSEHOLD",
    "FURNITURE",
    "HOUSEHOLD_PLACEABLE",
    "REST",
    "SLEEP"
  ],
  "notes": "Compact fold-frame cot for basic safe-space rest and sleep.",
  "itemTypeProfile": {
    "furnishingClass": "REST",
    "fixedInstallation": false
  },
  "equipProfile": {},
  "householdProfile": {
    "placeable": true,
    "footprint": "2x3",
    "capabilities": [
      "REST",
      "SLEEP"
    ],
    "allowedRoomTypes": [
      "MULTIPURPOSE",
      "LIVING",
      "SLEEPING",
      "SAFE_ROOM"
    ],
    "blockedRoomTypes": [
      "HYGIENE",
      "KITCHEN"
    ]
  }
},
{
  "id": "eqcat-household-fold-table",
  "name": "Modular Fold Table",
  "category": "HOUSEHOLD",
  "subtype": "FOLD_TABLE",
  "itemType": "HOUSEHOLD_FURNISHING",
  "footprint": "2x2",
  "status": "OWNED",
  "operatingStatus": "ACTIVE",
  "legality": "REGISTERED",
  "condition": 100,
  "value": 280,
  "tags": [
    "HOUSEHOLD",
    "FURNITURE",
    "HOUSEHOLD_PLACEABLE",
    "CONSUMABLE_USE"
  ],
  "notes": "Utility table for food, medication and general household use.",
  "itemTypeProfile": {
    "furnishingClass": "UTILITY_SURFACE",
    "fixedInstallation": false
  },
  "equipProfile": {},
  "householdProfile": {
    "placeable": true,
    "footprint": "2x2",
    "capabilities": [
      "CONSUMABLE_USE",
      "FOOD_PREP"
    ],
    "allowedRoomTypes": [
      "MULTIPURPOSE",
      "LIVING",
      "KITCHEN",
      "SAFE_ROOM"
    ]
  }
},
{
  "id": "eqcat-household-med-locker",
  "name": "Sealed Medical Locker",
  "category": "HOUSEHOLD",
  "subtype": "MEDICAL_LOCKER",
  "itemType": "HOUSEHOLD_FURNISHING",
  "footprint": "1x2",
  "status": "OWNED",
  "operatingStatus": "ACTIVE",
  "legality": "REGISTERED",
  "condition": 100,
  "value": 760,
  "tags": [
    "HOUSEHOLD",
    "FURNITURE",
    "FIXTURE",
    "HOUSEHOLD_PLACEABLE",
    "MEDICAL",
    "SECURE_STORAGE"
  ],
  "notes": "Locking cabinet prepared for controlled medication and clinical consumables.",
  "itemTypeProfile": {
    "furnishingClass": "MEDICAL_STORAGE",
    "fixedInstallation": false
  },
  "equipProfile": {},
  "householdProfile": {
    "placeable": true,
    "footprint": "1x2",
    "capabilities": [
      "MEDICAL_CONSUMABLE_USE",
      "SECURE_CONSUMABLE_STORAGE"
    ],
    "allowedRoomTypes": [
      "MEDICAL",
      "SAFE_ROOM"
    ]
  }
},
{
  "id": "eqcat-household-utility-chair",
  "name": "Utility Rest Chair",
  "category": "HOUSEHOLD",
  "subtype": "UTILITY_CHAIR",
  "itemType": "HOUSEHOLD_FURNISHING",
  "footprint": "1x1",
  "status": "OWNED",
  "operatingStatus": "ACTIVE",
  "legality": "REGISTERED",
  "condition": 100,
  "value": 95,
  "tags": [
    "HOUSEHOLD",
    "FURNITURE",
    "HOUSEHOLD_PLACEABLE",
    "REST"
  ],
  "notes": "Compact standardized chair for short rest cycles.",
  "itemTypeProfile": {
    "furnishingClass": "SEATING",
    "fixedInstallation": false
  },
  "equipProfile": {},
  "householdProfile": {
    "placeable": true,
    "footprint": "1x1",
    "capabilities": [
      "REST"
    ],
    "allowedRoomTypes": [
      "MULTIPURPOSE",
      "LIVING",
      "SAFE_ROOM",
      "WORKSHOP"
    ]
  }
},
{
  "id": "eqcat-household-utility-locker",
  "name": "Household Utility Locker",
  "category": "HOUSEHOLD",
  "subtype": "UTILITY_LOCKER",
  "itemType": "HOUSEHOLD_FURNISHING",
  "footprint": "1x2",
  "status": "OWNED",
  "operatingStatus": "ACTIVE",
  "legality": "REGISTERED",
  "condition": 100,
  "value": 210,
  "tags": [
    "HOUSEHOLD",
    "FURNITURE",
    "HOUSEHOLD_PLACEABLE",
    "STORAGE"
  ],
  "notes": "General-purpose locker for household equipment and packaged goods.",
  "itemTypeProfile": {
    "furnishingClass": "STORAGE",
    "fixedInstallation": false
  },
  "equipProfile": {},
  "householdProfile": {
    "placeable": true,
    "footprint": "1x2",
    "capabilities": [
      "STORAGE"
    ],
    "allowedRoomTypes": [
      "MULTIPURPOSE",
      "LIVING",
      "STORAGE",
      "SAFE_ROOM",
      "WORKSHOP",
      "ENTRY"
    ]
  }
}
];
window.APP_DATA.equipmentDefinitionAliases = {
  "eqcat-thigh-holster-left": "eqcat-thigh-holster",
  "eqcat-thigh-holster-right": "eqcat-thigh-holster",
  "eqcat-left-shoulder-guard": "eqcat-shoulder-guard",
  "eqcat-right-shoulder-guard": "eqcat-shoulder-guard",
  "eqcat-left-forearm-guard": "eqcat-forearm-guard",
  "eqcat-right-forearm-guard": "eqcat-forearm-guard",
  "eqcat-owned-cyberware-cyber-arm-r": "eqcat-owned-cyberware-cyber-arm"
};
