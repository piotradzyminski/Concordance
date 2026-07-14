window.APP_DATA = window.APP_DATA || {};

(() => {
  const catalog = {
  "schemaVersion": "housing_rent_standards_catalog_3_0x",
  "cellAreaM2": 0.25,
  "pricingStatus": "PRE_ALPHA_PROVISIONAL",
  "furnishingGrades": [
    {
      "gradeId": "ECONOMY",
      "label": "Economy",
      "weeklyWearPercent": 4.0,
      "description": "Najtańsze wyposażenie zbiorowe i tymczasowe."
    },
    {
      "gradeId": "UTILITY",
      "label": "Utility",
      "weeklyWearPercent": 3.0,
      "description": "Masowy standard wyposażenia lokali Gamm."
    },
    {
      "gradeId": "STANDARD",
      "label": "Standard",
      "weeklyWearPercent": 1.5,
      "description": "Typowe wyposażenie prywatnych lokali kompaktowych."
    },
    {
      "gradeId": "QUALITY",
      "label": "Quality",
      "weeklyWearPercent": 1.0,
      "description": "Trwałe wyposażenie Bet i lokali premium."
    },
    {
      "gradeId": "PREMIUM",
      "label": "Premium",
      "weeklyWearPercent": 0.5,
      "description": "Wyposażenie wysokiego statusu i rezydencji systemowych."
    }
  ],
  "standards": [
    {
      "standardId": "HOUSING_STANDARD_H",
      "code": "H",
      "label": "Standard H — Shared Quarters",
      "subscriptionCatalogId": "sub-housing-standard-h",
      "maxAreaM2": null,
      "layoutPolicy": "ASSIGNED_BEDSPACE",
      "layoutVariantCount": 0,
      "typicalResidents": [
        "GAMMA",
        "TEMPORARY_WORKER"
      ],
      "tiers": [
        {
          "tierId": "housing-h-t1",
          "tierLevel": 1,
          "label": "T1 Shared Bed",
          "areaM2": null,
          "weeklyRent": 450,
          "occupancy": {
            "privateUnit": false,
            "recommendedAdults": 1,
            "maximumOccupants": 1
          },
          "defaultFurnishingGrade": "ECONOMY",
          "furnishingPolicy": "NONE",
          "fixedFixtures": [
            "COMMUNAL_SLEEP_ROOM",
            "COMMUNAL_HYGIENE_OUTSIDE_ROOM"
          ],
          "rentalFurnishings": [
            "ASSIGNED_BED"
          ],
          "storage": [
            {
              "storageId": "personal-crate",
              "label": "Personal Crate",
              "grid": {
                "width": 4,
                "height": 3
              },
              "storageType": "PERSONAL"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "1x1",
            "foodDelivery": true,
            "coldDelivery": false,
            "unattendedDelivery": false
          },
          "disposalAccess": "COMMUNAL_BUILDING_POINT",
          "fixtureReplacementPolicy": "NONE",
          "upgradeSlotPolicy": "NONE",
          "maintenanceCoverage": "PAID_REQUEST",
          "capabilities": [
            "SHARED_SLEEP",
            "PERSONAL_STORAGE",
            "FOOD_DELIVERY_PICKUP",
            "COMMUNAL_HYGIENE",
            "COMMUNAL_DISPOSAL"
          ],
          "notes": []
        },
        {
          "tierId": "housing-h-t2",
          "tierLevel": 2,
          "label": "T2 Shared Wet Room",
          "areaM2": null,
          "weeklyRent": 700,
          "occupancy": {
            "privateUnit": false,
            "recommendedAdults": 1,
            "maximumOccupants": 1
          },
          "defaultFurnishingGrade": "ECONOMY",
          "furnishingPolicy": "NONE",
          "fixedFixtures": [
            "COMMUNAL_SLEEP_ROOM",
            "ROOM_SHARED_WET_MODULE"
          ],
          "rentalFurnishings": [
            "ASSIGNED_BED"
          ],
          "storage": [
            {
              "storageId": "personal-crate",
              "label": "Personal Crate",
              "grid": {
                "width": 4,
                "height": 3
              },
              "storageType": "PERSONAL"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "1x1",
            "foodDelivery": true,
            "coldDelivery": false,
            "unattendedDelivery": false
          },
          "disposalAccess": "COMMUNAL_BUILDING_POINT",
          "fixtureReplacementPolicy": "NONE",
          "upgradeSlotPolicy": "NONE",
          "maintenanceCoverage": "OPERATOR_BASIC",
          "capabilities": [
            "SHARED_SLEEP",
            "PERSONAL_STORAGE",
            "FOOD_DELIVERY_PICKUP",
            "ROOM_SHARED_HYGIENE",
            "COMMUNAL_DISPOSAL"
          ],
          "notes": []
        }
      ]
    },
    {
      "standardId": "HOUSING_STANDARD_G",
      "code": "G",
      "label": "Standard G — Micro Unit",
      "subscriptionCatalogId": "sub-housing-standard-g",
      "maxAreaM2": 18,
      "layoutPolicy": "RANDOM_POOL",
      "layoutVariantCount": 4,
      "typicalResidents": [
        "GAMMA_SOLO"
      ],
      "tiers": [
        {
          "tierId": "housing-g-t1",
          "tierLevel": 1,
          "label": "T1 Private Microcell",
          "areaM2": 15,
          "weeklyRent": 900,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 1
          },
          "defaultFurnishingGrade": "UTILITY",
          "furnishingPolicy": "LIMITED_SMALL",
          "fixedFixtures": [
            "PRIVATE_TOILET_SECTION",
            "WASH_POINT",
            "SERVICE_WALL_BASIC"
          ],
          "rentalFurnishings": [
            "FOLDING_BED"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 4,
                "height": 3
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 2,
                "height": 2
              },
              "storageType": "WET"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "2x2",
            "foodDelivery": true,
            "coldDelivery": false,
            "unattendedDelivery": false
          },
          "disposalAccess": "COMMUNAL_BUILDING_POINT",
          "fixtureReplacementPolicy": "NONE",
          "upgradeSlotPolicy": "SINGLE_FUNCTIONAL_SLOT",
          "maintenanceCoverage": "PAID_REQUEST",
          "capabilities": [
            "PRIVATE_SLEEP",
            "PRIVATE_TOILET",
            "BASIC_HYGIENE",
            "FOOD_DELIVERY",
            "LIMITED_FURNISHING",
            "COMMUNAL_DISPOSAL"
          ],
          "notes": []
        },
        {
          "tierId": "housing-g-t2",
          "tierLevel": 2,
          "label": "T2 Service Wall",
          "areaM2": 15,
          "weeklyRent": 1200,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 1
          },
          "defaultFurnishingGrade": "UTILITY",
          "furnishingPolicy": "LIMITED_SMALL",
          "fixedFixtures": [
            "PRIVATE_TOILET_SECTION",
            "WASH_POINT",
            "SERVICE_WALL_REHEAT",
            "WATER_POINT"
          ],
          "rentalFurnishings": [
            "FOLDING_BED"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 4,
                "height": 3
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 2,
                "height": 2
              },
              "storageType": "WET"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "2x2",
            "foodDelivery": true,
            "coldDelivery": false,
            "unattendedDelivery": false
          },
          "disposalAccess": "COMMUNAL_BUILDING_POINT",
          "fixtureReplacementPolicy": "NONE",
          "upgradeSlotPolicy": "SINGLE_FUNCTIONAL_SLOT",
          "maintenanceCoverage": "PAID_REQUEST",
          "capabilities": [
            "PRIVATE_SLEEP",
            "PRIVATE_TOILET",
            "BASIC_HYGIENE",
            "FOOD_DELIVERY",
            "FOOD_REHEAT",
            "BASIC_FOOD_STORAGE",
            "LIMITED_FURNISHING",
            "COMMUNAL_DISPOSAL"
          ],
          "notes": []
        },
        {
          "tierId": "housing-g-t3",
          "tierLevel": 3,
          "label": "T3 Extended Microcell",
          "areaM2": 18,
          "weeklyRent": 1500,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 1
          },
          "defaultFurnishingGrade": "UTILITY",
          "furnishingPolicy": "STANDARD_SMALL",
          "fixedFixtures": [
            "PRIVATE_TOILET_SECTION",
            "WASH_POINT",
            "SERVICE_WALL_REHEAT",
            "WATER_POINT"
          ],
          "rentalFurnishings": [
            "FOLDING_BED",
            "COMPACT_REFRIGERATOR",
            "WARDROBE"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 4,
                "height": 3
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 2,
                "height": 2
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 3,
                "height": 2
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 3,
                "height": 2
              },
              "storageType": "COLD"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "2x2",
            "foodDelivery": true,
            "coldDelivery": false,
            "unattendedDelivery": true
          },
          "disposalAccess": "COMMUNAL_BUILDING_POINT",
          "fixtureReplacementPolicy": "NONE",
          "upgradeSlotPolicy": "LIMITED_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "PAID_REQUEST",
          "capabilities": [
            "PRIVATE_SLEEP",
            "PRIVATE_TOILET",
            "BASIC_HYGIENE",
            "FOOD_DELIVERY",
            "FOOD_REHEAT",
            "COLD_STORAGE",
            "WARDROBE_STORAGE",
            "STANDARD_SMALL_FURNISHING",
            "COMMUNAL_DISPOSAL"
          ],
          "notes": []
        },
        {
          "tierId": "housing-g-t4",
          "tierLevel": 4,
          "label": "T4 Complete Microcell",
          "areaM2": 18,
          "weeklyRent": 1800,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 1
          },
          "defaultFurnishingGrade": "STANDARD",
          "furnishingPolicy": "STANDARD_SMALL",
          "fixedFixtures": [
            "PRIVATE_WET_MODULE",
            "SERVICE_WALL_PREPARATION",
            "WATER_POINT"
          ],
          "rentalFurnishings": [
            "FOLDING_BED",
            "COMPACT_REFRIGERATOR",
            "WARDROBE",
            "FOLDING_TABLE"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 5,
                "height": 3
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 2,
                "height": 2
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 3,
                "height": 2
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 3,
                "height": 2
              },
              "storageType": "COLD"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "2x2",
            "foodDelivery": true,
            "coldDelivery": false,
            "unattendedDelivery": true
          },
          "disposalAccess": "LOCAL_SEGMENT_CHUTE",
          "fixtureReplacementPolicy": "MOVABLE_RENTAL_ONLY",
          "upgradeSlotPolicy": "LIMITED_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "OPERATOR_FIXTURES",
          "capabilities": [
            "PRIVATE_SLEEP",
            "PRIVATE_SHOWER",
            "PRIVATE_TOILET",
            "FOOD_DELIVERY",
            "FOOD_REHEAT",
            "SIMPLE_FOOD_PREPARATION",
            "COLD_STORAGE",
            "STANDARD_SMALL_FURNISHING",
            "LOCAL_DISPOSAL_CHUTE"
          ],
          "notes": []
        }
      ]
    },
    {
      "standardId": "HOUSING_STANDARD_F",
      "code": "F",
      "label": "Standard F — Compact Unit",
      "subscriptionCatalogId": "sub-housing-standard-f",
      "maxAreaM2": 22,
      "layoutPolicy": "RANDOM_POOL",
      "layoutVariantCount": 4,
      "typicalResidents": [
        "GAMMA_SOLO",
        "GAMMA_FAMILY"
      ],
      "tiers": [
        {
          "tierId": "housing-f-t1",
          "tierLevel": 1,
          "label": "T1 Compact Basic",
          "areaM2": 20,
          "weeklyRent": 2200,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 2
          },
          "defaultFurnishingGrade": "UTILITY",
          "furnishingPolicy": "LIMITED",
          "fixedFixtures": [
            "PRIVATE_WET_MODULE",
            "SERVICE_WALL_REHEAT",
            "WATER_POINT"
          ],
          "rentalFurnishings": [
            "DOUBLE_FOLDING_BED",
            "FOLDING_TABLE"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 5,
                "height": 3
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 2,
                "height": 2
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 3,
                "height": 2
              },
              "storageType": "WARDROBE"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "2x2",
            "foodDelivery": true,
            "coldDelivery": false,
            "unattendedDelivery": true
          },
          "disposalAccess": "COMMUNAL_BUILDING_POINT",
          "fixtureReplacementPolicy": "NONE",
          "upgradeSlotPolicy": "LIMITED_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "PAID_REQUEST",
          "capabilities": [
            "PRIVATE_SLEEP",
            "PRIVATE_WET_MODULE",
            "FOOD_DELIVERY",
            "FOOD_REHEAT",
            "LIMITED_FURNISHING",
            "COMMUNAL_DISPOSAL"
          ],
          "notes": []
        },
        {
          "tierId": "housing-f-t2",
          "tierLevel": 2,
          "label": "T2 Compact Family",
          "areaM2": 21,
          "weeklyRent": 2600,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 2,
            "maximumOccupants": 3,
            "childCapacity": 1
          },
          "defaultFurnishingGrade": "STANDARD",
          "furnishingPolicy": "STANDARD",
          "fixedFixtures": [
            "PRIVATE_WET_MODULE",
            "SERVICE_WALL_REHEAT",
            "WATER_POINT",
            "CHILD_SLEEP_ANCHOR"
          ],
          "rentalFurnishings": [
            "DOUBLE_FOLDING_BED",
            "CHILD_BERTH_MODULE",
            "COMPACT_REFRIGERATOR",
            "FOLDING_TABLE"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 5,
                "height": 4
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 2,
                "height": 2
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 3,
                "height": 2
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 3,
                "height": 2
              },
              "storageType": "COLD"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "3x2",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "COMMUNAL_BUILDING_POINT",
          "fixtureReplacementPolicy": "MOVABLE_RENTAL_ONLY",
          "upgradeSlotPolicy": "STANDARD_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "OPERATOR_FIXTURES",
          "capabilities": [
            "PRIVATE_SLEEP",
            "CHILD_SLEEP_SPACE",
            "PRIVATE_WET_MODULE",
            "FOOD_DELIVERY",
            "FOOD_REHEAT",
            "COLD_STORAGE",
            "STANDARD_FURNISHING",
            "COMMUNAL_DISPOSAL"
          ],
          "notes": []
        },
        {
          "tierId": "housing-f-t3",
          "tierLevel": 3,
          "label": "T3 Adaptive Compact",
          "areaM2": 22,
          "weeklyRent": 3000,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 2,
            "maximumOccupants": 3,
            "childCapacity": 1
          },
          "defaultFurnishingGrade": "STANDARD",
          "furnishingPolicy": "STANDARD",
          "fixedFixtures": [
            "PRIVATE_WET_MODULE",
            "SERVICE_WALL_PREPARATION",
            "SLIDING_SLEEP_PARTITION",
            "WATER_POINT"
          ],
          "rentalFurnishings": [
            "DOUBLE_FOLDING_BED",
            "CHILD_OR_GUEST_BERTH",
            "COMPACT_REFRIGERATOR",
            "FOLDING_TABLE",
            "WARDROBE"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 6,
                "height": 4
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 2,
                "height": 2
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 4,
                "height": 2
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 3,
                "height": 3
              },
              "storageType": "COLD"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "3x2",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "LOCAL_SEGMENT_CHUTE",
          "fixtureReplacementPolicy": "MOVABLE_RENTAL_AND_APPROVED_FIXTURES",
          "upgradeSlotPolicy": "STANDARD_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "OPERATOR_FIXTURES",
          "capabilities": [
            "PRIVATE_SLEEP",
            "SEPARABLE_SLEEP_ZONE",
            "CHILD_OR_GUEST_SPACE",
            "PRIVATE_WET_MODULE",
            "FOOD_DELIVERY",
            "SIMPLE_FOOD_PREPARATION",
            "COLD_STORAGE",
            "STANDARD_FURNISHING",
            "LOCAL_DISPOSAL_CHUTE"
          ],
          "notes": []
        }
      ]
    },
    {
      "standardId": "HOUSING_STANDARD_E",
      "code": "E",
      "label": "Standard E — Private Compact",
      "subscriptionCatalogId": "sub-housing-standard-e",
      "maxAreaM2": 25,
      "layoutPolicy": "RANDOM_POOL",
      "layoutVariantCount": 4,
      "typicalResidents": [
        "BETA_SOLO",
        "GAMMA_FAMILY_HIGH_ACCESS"
      ],
      "tiers": [
        {
          "tierId": "housing-e-t1",
          "tierLevel": 1,
          "label": "T1 Private Compact",
          "areaM2": 23,
          "weeklyRent": 3400,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 2
          },
          "defaultFurnishingGrade": "STANDARD",
          "furnishingPolicy": "STANDARD",
          "fixedFixtures": [
            "PRIVATE_WET_MODULE",
            "SERVICE_WALL_REHEAT",
            "SLEEPING_RECESS",
            "WATER_POINT"
          ],
          "rentalFurnishings": [
            "FIXED_OR_FOLDING_BED",
            "COMPACT_REFRIGERATOR",
            "WORK_SURFACE",
            "WARDROBE"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 6,
                "height": 4
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 3,
                "height": 2
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 4,
                "height": 2
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 3,
                "height": 3
              },
              "storageType": "COLD"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "3x2",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "LOCAL_SEGMENT_CHUTE",
          "fixtureReplacementPolicy": "MOVABLE_RENTAL_ONLY",
          "upgradeSlotPolicy": "STANDARD_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "OPERATOR_FIXTURES",
          "capabilities": [
            "PRIVATE_SLEEP",
            "SLEEPING_RECESS",
            "PRIVATE_WET_MODULE",
            "FOOD_DELIVERY",
            "FOOD_REHEAT",
            "COLD_STORAGE",
            "WORKSPACE",
            "STANDARD_FURNISHING",
            "LOCAL_DISPOSAL_CHUTE"
          ],
          "notes": []
        },
        {
          "tierId": "housing-e-t2",
          "tierLevel": 2,
          "label": "T2 Private Adaptive",
          "areaM2": 24,
          "weeklyRent": 3900,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 2,
            "temporaryGuestCapacity": 1
          },
          "defaultFurnishingGrade": "STANDARD",
          "furnishingPolicy": "STANDARD",
          "fixedFixtures": [
            "PRIVATE_WET_MODULE",
            "SERVICE_WALL_PREPARATION",
            "SLIDING_PARTITION",
            "WATER_POINT"
          ],
          "rentalFurnishings": [
            "BED",
            "COMPACT_REFRIGERATOR",
            "FOLDING_GUEST_BERTH",
            "WORK_SURFACE",
            "WARDROBE"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 6,
                "height": 4
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 3,
                "height": 2
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 4,
                "height": 3
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 3,
                "height": 3
              },
              "storageType": "COLD"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "3x3",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "LOCAL_SEGMENT_CHUTE",
          "fixtureReplacementPolicy": "MOVABLE_RENTAL_AND_APPROVED_FIXTURES",
          "upgradeSlotPolicy": "STANDARD_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "OPERATOR_FIXTURES",
          "capabilities": [
            "PRIVATE_SLEEP",
            "FLEXIBLE_GUEST_OR_WORK_ZONE",
            "PRIVATE_WET_MODULE",
            "FOOD_DELIVERY",
            "SIMPLE_FOOD_PREPARATION",
            "COLD_STORAGE",
            "WORKSPACE",
            "STANDARD_FURNISHING",
            "UNATTENDED_DELIVERY",
            "LOCAL_DISPOSAL_CHUTE"
          ],
          "notes": []
        },
        {
          "tierId": "housing-e-t3",
          "tierLevel": 3,
          "label": "T3 Private Complete",
          "areaM2": 25,
          "weeklyRent": 4500,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 2,
            "temporaryGuestCapacity": 1
          },
          "defaultFurnishingGrade": "QUALITY",
          "furnishingPolicy": "STANDARD",
          "fixedFixtures": [
            "FULL_PRIVATE_WET_MODULE",
            "SERVICE_WALL_PREPARATION",
            "CLOSABLE_SLEEP_ZONE",
            "WATER_POINT"
          ],
          "rentalFurnishings": [
            "BED",
            "REFRIGERATOR",
            "FOLDING_GUEST_BERTH",
            "WORK_SURFACE",
            "WARDROBE",
            "DISPLAY_RAIL"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 6,
                "height": 5
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 3,
                "height": 2
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 4,
                "height": 3
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 4,
                "height": 3
              },
              "storageType": "COLD"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "3x3",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "LOCAL_SEGMENT_CHUTE",
          "fixtureReplacementPolicy": "APPROVED_FIXTURES",
          "upgradeSlotPolicy": "STANDARD_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "OPERATOR_STANDARD",
          "capabilities": [
            "PRIVATE_SLEEP",
            "CLOSABLE_SLEEP_ZONE",
            "PRIVATE_SHOWER",
            "PRIVATE_TOILET",
            "FOOD_DELIVERY",
            "SIMPLE_FOOD_PREPARATION",
            "COLD_STORAGE",
            "WORKSPACE",
            "DISPLAY_SPACE",
            "STANDARD_FURNISHING",
            "COLD_DELIVERY",
            "LOCAL_DISPOSAL_CHUTE"
          ],
          "notes": []
        }
      ]
    },
    {
      "standardId": "HOUSING_STANDARD_D",
      "code": "D",
      "label": "Standard D — Professional Unit",
      "subscriptionCatalogId": "sub-housing-standard-d",
      "maxAreaM2": 30,
      "layoutPolicy": "RANDOM_POOL",
      "layoutVariantCount": 4,
      "typicalResidents": [
        "BETA_SOLO",
        "ALPHA_ENTRY"
      ],
      "tiers": [
        {
          "tierId": "housing-d-t1",
          "tierLevel": 1,
          "label": "T1 Professional Compact",
          "areaM2": 27,
          "weeklyRent": 5200,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 2
          },
          "defaultFurnishingGrade": "STANDARD",
          "furnishingPolicy": "STANDARD",
          "fixedFixtures": [
            "FULL_PRIVATE_WET_MODULE",
            "SERVICE_WALL_PREPARATION",
            "CLOSABLE_SLEEP_ZONE",
            "WORK_RECESS"
          ],
          "rentalFurnishings": [
            "BED",
            "REFRIGERATOR",
            "WORKSTATION",
            "WARDROBE",
            "DISPLAY_RAIL"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 7,
                "height": 5
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 3,
                "height": 2
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 4,
                "height": 3
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 4,
                "height": 3
              },
              "storageType": "COLD"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "3x3",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "LOCAL_SEGMENT_CHUTE",
          "fixtureReplacementPolicy": "APPROVED_FIXTURES",
          "upgradeSlotPolicy": "STANDARD_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "OPERATOR_STANDARD",
          "capabilities": [
            "SEPARATE_SLEEP_ZONE",
            "PRIVATE_WET_MODULE",
            "FOOD_DELIVERY",
            "SIMPLE_FOOD_PREPARATION",
            "COLD_STORAGE",
            "DEDICATED_WORKSPACE",
            "DISPLAY_SPACE",
            "STANDARD_FURNISHING",
            "SECURE_DELIVERY",
            "LOCAL_DISPOSAL_CHUTE"
          ],
          "notes": []
        },
        {
          "tierId": "housing-d-t2",
          "tierLevel": 2,
          "label": "T2 Professional Flex",
          "areaM2": 29,
          "weeklyRent": 6000,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 3,
            "temporaryGuestCapacity": 1
          },
          "defaultFurnishingGrade": "QUALITY",
          "furnishingPolicy": "STRUCTURED",
          "fixedFixtures": [
            "FULL_PRIVATE_WET_MODULE",
            "SERVICE_WALL_PREPARATION",
            "CLOSABLE_SLEEP_ZONE",
            "FLEX_RECESS",
            "WORK_RECESS"
          ],
          "rentalFurnishings": [
            "BED",
            "REFRIGERATOR",
            "WORKSTATION",
            "GUEST_OR_CHILD_BERTH",
            "WARDROBE",
            "DISPLAY_SYSTEM"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 7,
                "height": 5
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 3,
                "height": 3
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 5,
                "height": 3
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 4,
                "height": 3
              },
              "storageType": "COLD"
            },
            {
              "storageId": "secure",
              "label": "Secure Storage",
              "grid": {
                "width": 2,
                "height": 2
              },
              "storageType": "SECURE"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "4x3",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "LOCAL_SEGMENT_CHUTE",
          "fixtureReplacementPolicy": "APPROVED_FIXTURES",
          "upgradeSlotPolicy": "EXTENDED_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "OPERATOR_STANDARD",
          "capabilities": [
            "SEPARATE_SLEEP_ZONE",
            "FLEXIBLE_GUEST_CHILD_OR_WORK_ZONE",
            "PRIVATE_WET_MODULE",
            "FOOD_DELIVERY",
            "SIMPLE_FOOD_PREPARATION",
            "COLD_STORAGE",
            "DEDICATED_WORKSPACE",
            "SECURE_STORAGE",
            "DISPLAY_SPACE",
            "STRUCTURED_FURNISHING",
            "SECURE_COLD_DELIVERY",
            "LOCAL_DISPOSAL_CHUTE"
          ],
          "notes": []
        },
        {
          "tierId": "housing-d-t3",
          "tierLevel": 3,
          "label": "T3 Professional Complete",
          "areaM2": 30,
          "weeklyRent": 7000,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 3,
            "temporaryGuestCapacity": 1
          },
          "defaultFurnishingGrade": "QUALITY",
          "furnishingPolicy": "STRUCTURED",
          "fixedFixtures": [
            "FULL_PRIVATE_WET_MODULE",
            "COMPLETE_SERVICE_WALL",
            "SEPARATE_BEDROOM",
            "FLEX_RECESS",
            "WORK_RECESS"
          ],
          "rentalFurnishings": [
            "BED",
            "REFRIGERATOR",
            "COOKING_MODULE",
            "WORKSTATION",
            "GUEST_BERTH",
            "WARDROBE",
            "DISPLAY_SYSTEM"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 8,
                "height": 5
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 3,
                "height": 3
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 5,
                "height": 3
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 4,
                "height": 4
              },
              "storageType": "COLD"
            },
            {
              "storageId": "secure",
              "label": "Secure Storage",
              "grid": {
                "width": 3,
                "height": 2
              },
              "storageType": "SECURE"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "4x3",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "SEGMENT_RETURN_POINT",
          "fixtureReplacementPolicy": "STANDARD_FIXTURE_REPLACEMENT",
          "upgradeSlotPolicy": "EXTENDED_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "OPERATOR_PRIORITY",
          "capabilities": [
            "SEPARATE_BEDROOM",
            "GUEST_ACCESS",
            "PRIVATE_WET_MODULE",
            "FOOD_DELIVERY",
            "FULL_FOOD_PREPARATION",
            "COLD_STORAGE",
            "DEDICATED_WORKSPACE",
            "SECURE_STORAGE",
            "DISPLAY_SPACE",
            "STRUCTURED_FURNISHING",
            "SECURE_COLD_DELIVERY",
            "SEGMENT_DISPOSAL_RETURN"
          ],
          "notes": []
        }
      ]
    },
    {
      "standardId": "HOUSING_STANDARD_C",
      "code": "C",
      "label": "Standard C — Premium Unit",
      "subscriptionCatalogId": "sub-housing-standard-c",
      "maxAreaM2": 40,
      "layoutPolicy": "CHOICE_POOL",
      "layoutVariantCount": 3,
      "typicalResidents": [
        "ALPHA_SOLO",
        "BETA_HIGH_ACCESS"
      ],
      "tiers": [
        {
          "tierId": "housing-c-t1",
          "tierLevel": 1,
          "label": "T1 Premium Compact",
          "areaM2": 32,
          "weeklyRent": 8200,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 3,
            "temporaryGuestCapacity": 1
          },
          "defaultFurnishingGrade": "QUALITY",
          "furnishingPolicy": "STRUCTURED",
          "fixedFixtures": [
            "FULL_BATHROOM",
            "COMPLETE_SERVICE_WALL",
            "SEPARATE_BEDROOM",
            "WORK_RECESS"
          ],
          "rentalFurnishings": [
            "BED",
            "REFRIGERATOR",
            "COOKING_MODULE",
            "WORKSTATION",
            "GUEST_BERTH",
            "WARDROBE",
            "DISPLAY_SYSTEM"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 8,
                "height": 6
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "bath",
              "label": "Bathroom Storage",
              "grid": {
                "width": 4,
                "height": 3
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 5,
                "height": 4
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 4,
                "height": 4
              },
              "storageType": "COLD"
            },
            {
              "storageId": "secure",
              "label": "Secure Storage",
              "grid": {
                "width": 3,
                "height": 3
              },
              "storageType": "SECURE"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "4x3",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "SEGMENT_RETURN_POINT",
          "fixtureReplacementPolicy": "STANDARD_FIXTURE_REPLACEMENT",
          "upgradeSlotPolicy": "EXTENDED_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "OPERATOR_PRIORITY",
          "capabilities": [
            "SEPARATE_BEDROOM",
            "GUEST_ACCESS",
            "FULL_BATHROOM",
            "FULL_FOOD_PREPARATION",
            "COLD_STORAGE",
            "DEDICATED_WORKSPACE",
            "SECURE_STORAGE",
            "COLLECTION_DISPLAY",
            "STRUCTURED_FURNISHING",
            "SECURE_COLD_DELIVERY",
            "SEGMENT_DISPOSAL_RETURN"
          ],
          "notes": []
        },
        {
          "tierId": "housing-c-t2",
          "tierLevel": 2,
          "label": "T2 Premium Adaptive",
          "areaM2": 35,
          "weeklyRent": 9800,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 3,
            "temporaryGuestCapacity": 2
          },
          "defaultFurnishingGrade": "QUALITY",
          "furnishingPolicy": "EXTENDED",
          "fixedFixtures": [
            "FULL_BATHROOM",
            "COMPLETE_SERVICE_WALL",
            "SEPARATE_BEDROOM",
            "FLEX_ROOM",
            "PRIVATE_DELIVERY_LOCKER"
          ],
          "rentalFurnishings": [
            "BED",
            "REFRIGERATOR",
            "COOKING_MODULE",
            "WORKSTATION",
            "GUEST_BERTH",
            "WARDROBE",
            "DISPLAY_SYSTEM"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 9,
                "height": 6
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "bath",
              "label": "Bathroom Storage",
              "grid": {
                "width": 4,
                "height": 3
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 6,
                "height": 4
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 5,
                "height": 4
              },
              "storageType": "COLD"
            },
            {
              "storageId": "secure",
              "label": "Secure Storage",
              "grid": {
                "width": 4,
                "height": 3
              },
              "storageType": "SECURE"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "4x4",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "PRIVATE_RETURN_LOCKER",
          "fixtureReplacementPolicy": "EXTENDED_FIXTURE_REPLACEMENT",
          "upgradeSlotPolicy": "EXTENDED_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "OPERATOR_PRIORITY",
          "capabilities": [
            "SEPARATE_BEDROOM",
            "FLEXIBLE_GUEST_OR_WORK_ROOM",
            "FULL_BATHROOM",
            "FULL_FOOD_PREPARATION",
            "COLD_STORAGE",
            "DEDICATED_WORKSPACE",
            "PRIVATE_DELIVERY_LOCKER",
            "SECURE_STORAGE",
            "COLLECTION_DISPLAY",
            "EXTENDED_FURNISHING",
            "SECURE_COLD_DELIVERY",
            "PRIVATE_DISPOSAL_RETURN"
          ],
          "notes": []
        },
        {
          "tierId": "housing-c-t3",
          "tierLevel": 3,
          "label": "T3 Premium Suite",
          "areaM2": 40,
          "weeklyRent": 11800,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 4,
            "temporaryGuestCapacity": 2
          },
          "defaultFurnishingGrade": "QUALITY",
          "furnishingPolicy": "EXTENDED",
          "fixedFixtures": [
            "FULL_BATHROOM",
            "COMPLETE_KITCHEN_WALL",
            "SEPARATE_BEDROOM",
            "FLEX_ROOM",
            "PRIVATE_DELIVERY_LOCKER"
          ],
          "rentalFurnishings": [
            "BED",
            "FULL_REFRIGERATOR",
            "COOKING_MODULE",
            "WORKSTATION",
            "GUEST_BERTH",
            "WARDROBE",
            "DISPLAY_SYSTEM",
            "LOUNGE_FURNISHING"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 10,
                "height": 6
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "bath",
              "label": "Bathroom Storage",
              "grid": {
                "width": 4,
                "height": 4
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 6,
                "height": 4
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 5,
                "height": 5
              },
              "storageType": "COLD"
            },
            {
              "storageId": "secure",
              "label": "Secure Storage",
              "grid": {
                "width": 4,
                "height": 4
              },
              "storageType": "SECURE"
            },
            {
              "storageId": "archive",
              "label": "Archive Storage",
              "grid": {
                "width": 3,
                "height": 3
              },
              "storageType": "ARCHIVE"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "5x4",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "PRIVATE_RETURN_LOCKER",
          "fixtureReplacementPolicy": "EXTENDED_FIXTURE_REPLACEMENT",
          "upgradeSlotPolicy": "EXTENDED_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "OPERATOR_PRIORITY",
          "capabilities": [
            "SEPARATE_BEDROOM",
            "FLEX_ROOM",
            "GUEST_ACCESS",
            "FULL_BATHROOM",
            "FULL_COOKING",
            "COLD_STORAGE",
            "DEDICATED_WORKSPACE",
            "PRIVATE_DELIVERY_LOCKER",
            "SECURE_STORAGE",
            "ARCHIVE_STORAGE",
            "COLLECTION_DISPLAY",
            "EXTENDED_FURNISHING",
            "DIRECT_DELIVERY",
            "PRIVATE_DISPOSAL_RETURN"
          ],
          "notes": []
        }
      ]
    },
    {
      "standardId": "HOUSING_STANDARD_B",
      "code": "B",
      "label": "Standard B — High Status Unit",
      "subscriptionCatalogId": "sub-housing-standard-b",
      "maxAreaM2": 50,
      "layoutPolicy": "CHOICE_POOL",
      "layoutVariantCount": 3,
      "typicalResidents": [
        "ALPHA_HIGH_ACCESS"
      ],
      "tiers": [
        {
          "tierId": "housing-b-t1",
          "tierLevel": 1,
          "label": "T1 High Status Residence",
          "areaM2": 42,
          "weeklyRent": 14000,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 4,
            "temporaryGuestCapacity": 2
          },
          "defaultFurnishingGrade": "QUALITY",
          "furnishingPolicy": "EXTENDED",
          "fixedFixtures": [
            "FULL_BATHROOM",
            "GUEST_SANITARY_POINT",
            "COMPLETE_KITCHEN_WALL",
            "SEPARATE_BEDROOM",
            "OFFICE_OR_GUEST_RECESS",
            "CONTROLLED_DELIVERY_LOCKER"
          ],
          "rentalFurnishings": [
            "BED",
            "FULL_REFRIGERATOR",
            "COOKING_MODULE",
            "WORKSTATION",
            "GUEST_BERTH",
            "WARDROBE",
            "DISPLAY_SYSTEM",
            "LOUNGE_FURNISHING"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 10,
                "height": 7
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "bath",
              "label": "Bathroom Storage",
              "grid": {
                "width": 4,
                "height": 4
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 6,
                "height": 5
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 5,
                "height": 5
              },
              "storageType": "COLD"
            },
            {
              "storageId": "secure",
              "label": "Secure Storage",
              "grid": {
                "width": 5,
                "height": 4
              },
              "storageType": "SECURE"
            },
            {
              "storageId": "archive",
              "label": "Archive Storage",
              "grid": {
                "width": 4,
                "height": 3
              },
              "storageType": "ARCHIVE"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "5x4",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "PRIVATE_PICKUP",
          "fixtureReplacementPolicy": "EXTENDED_FIXTURE_REPLACEMENT",
          "upgradeSlotPolicy": "EXTENDED_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "OPERATOR_PRIORITY",
          "capabilities": [
            "SEPARATE_BEDROOM",
            "OFFICE_OR_GUEST_SPACE",
            "TWO_SANITARY_POINTS",
            "FULL_COOKING",
            "CONTROLLED_DELIVERY",
            "COLD_STORAGE",
            "SECURE_STORAGE",
            "ARCHIVE_STORAGE",
            "COLLECTION_DISPLAY",
            "EXTENDED_FURNISHING",
            "PRIVATE_DISPOSAL_PICKUP"
          ],
          "notes": []
        },
        {
          "tierId": "housing-b-t2",
          "tierLevel": 2,
          "label": "T2 Executive Residence",
          "areaM2": 46,
          "weeklyRent": 17000,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 4,
            "temporaryGuestCapacity": 2
          },
          "defaultFurnishingGrade": "PREMIUM",
          "furnishingPolicy": "EXTENDED",
          "fixedFixtures": [
            "FULL_BATHROOM",
            "SECOND_WET_POINT",
            "COMPLETE_KITCHEN",
            "SEPARATE_BEDROOM",
            "OFFICE_OR_GUEST_ROOM",
            "CONTROLLED_DELIVERY_LOCKER"
          ],
          "rentalFurnishings": [
            "BED",
            "FULL_REFRIGERATOR",
            "COOKING_MODULE",
            "WORKSTATION",
            "GUEST_BED",
            "WARDROBE",
            "DISPLAY_SYSTEM",
            "LOUNGE_FURNISHING"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 11,
                "height": 7
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "bath",
              "label": "Bathroom Storage",
              "grid": {
                "width": 5,
                "height": 4
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 7,
                "height": 5
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 6,
                "height": 5
              },
              "storageType": "COLD"
            },
            {
              "storageId": "secure",
              "label": "Secure Storage",
              "grid": {
                "width": 5,
                "height": 5
              },
              "storageType": "SECURE"
            },
            {
              "storageId": "archive",
              "label": "Archive Storage",
              "grid": {
                "width": 4,
                "height": 4
              },
              "storageType": "ARCHIVE"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "5x5",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "PRIVATE_PICKUP",
          "fixtureReplacementPolicy": "BROAD_FIXTURE_REPLACEMENT",
          "upgradeSlotPolicy": "EXTENDED_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "OPERATOR_PREVENTIVE",
          "capabilities": [
            "SEPARATE_BEDROOM",
            "OFFICE_OR_GUEST_ROOM",
            "TWO_SANITARY_POINTS",
            "FULL_COOKING",
            "CONTROLLED_DELIVERY",
            "COLD_STORAGE",
            "SECURE_STORAGE",
            "ARCHIVE_STORAGE",
            "COLLECTION_DISPLAY",
            "EXTENDED_FURNISHING",
            "PRIVATE_DISPOSAL_PICKUP",
            "PRIORITY_MAINTENANCE"
          ],
          "notes": []
        },
        {
          "tierId": "housing-b-t3",
          "tierLevel": 3,
          "label": "T3 Executive Suite",
          "areaM2": 50,
          "weeklyRent": 20500,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 5,
            "temporaryGuestCapacity": 3
          },
          "defaultFurnishingGrade": "PREMIUM",
          "furnishingPolicy": "EXTENDED",
          "fixedFixtures": [
            "FULL_BATHROOM",
            "SECOND_WET_POINT",
            "COMPLETE_KITCHEN",
            "SEPARATE_BEDROOM",
            "FLEX_ROOM",
            "VISITOR_ACCESS_ZONE",
            "DELIVERY_CHAMBER"
          ],
          "rentalFurnishings": [
            "BED",
            "FULL_REFRIGERATOR",
            "COOKING_MODULE",
            "WORKSTATION",
            "GUEST_BED",
            "WARDROBE",
            "DISPLAY_SYSTEM",
            "LOUNGE_FURNISHING"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 12,
                "height": 8
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "bath",
              "label": "Bathroom Storage",
              "grid": {
                "width": 5,
                "height": 4
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 7,
                "height": 5
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 6,
                "height": 5
              },
              "storageType": "COLD"
            },
            {
              "storageId": "secure",
              "label": "Secure Storage",
              "grid": {
                "width": 6,
                "height": 5
              },
              "storageType": "SECURE"
            },
            {
              "storageId": "archive",
              "label": "Archive Storage",
              "grid": {
                "width": 5,
                "height": 4
              },
              "storageType": "ARCHIVE"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "6x5",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "PRIVATE_PICKUP",
          "fixtureReplacementPolicy": "BROAD_FIXTURE_REPLACEMENT",
          "upgradeSlotPolicy": "EXTENDED_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "OPERATOR_PREVENTIVE",
          "capabilities": [
            "SEPARATE_BEDROOM",
            "FLEX_ROOM",
            "CONTROLLED_VISITOR_ACCESS",
            "TWO_SANITARY_POINTS",
            "FULL_COOKING",
            "DELIVERY_CHAMBER",
            "COLD_STORAGE",
            "SECURE_STORAGE",
            "ARCHIVE_STORAGE",
            "COLLECTION_DISPLAY",
            "EXTENDED_FURNISHING",
            "PRIVATE_DISPOSAL_PICKUP",
            "PREVENTIVE_MAINTENANCE"
          ],
          "notes": []
        }
      ]
    },
    {
      "standardId": "HOUSING_STANDARD_A",
      "code": "A",
      "label": "Standard A — System Residence",
      "subscriptionCatalogId": "sub-housing-standard-a",
      "maxAreaM2": 100,
      "layoutPolicy": "INDIVIDUAL_ASSIGNMENT",
      "layoutVariantCount": 0,
      "typicalResidents": [
        "ALPHA_ELITE",
        "SPECIAL_ASSIGNMENT"
      ],
      "tiers": [
        {
          "tierId": "housing-a-t1",
          "tierLevel": 1,
          "label": "T1 System Residence",
          "areaM2": 60,
          "weeklyRent": 25000,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 1,
            "maximumOccupants": 5,
            "temporaryGuestCapacity": 3
          },
          "defaultFurnishingGrade": "PREMIUM",
          "furnishingPolicy": "CUSTOM",
          "fixedFixtures": [
            "TWO_WET_MODULES",
            "COMPLETE_KITCHEN",
            "SEPARATE_BEDROOM",
            "GUEST_OR_WORK_ROOM",
            "PRIVATE_LOGISTICS_POINT"
          ],
          "rentalFurnishings": [
            "PREMIUM_BED",
            "FULL_REFRIGERATOR",
            "COOKING_SYSTEM",
            "WORKSTATION",
            "GUEST_BED",
            "WARDROBE_SYSTEM",
            "DISPLAY_SYSTEM",
            "LOUNGE_FURNISHING"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 14,
                "height": 8
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 6,
                "height": 5
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 8,
                "height": 6
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 7,
                "height": 6
              },
              "storageType": "COLD"
            },
            {
              "storageId": "secure",
              "label": "Secure Storage",
              "grid": {
                "width": 7,
                "height": 5
              },
              "storageType": "SECURE"
            },
            {
              "storageId": "archive",
              "label": "Archive Storage",
              "grid": {
                "width": 6,
                "height": 5
              },
              "storageType": "ARCHIVE"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "6x6",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "PRIVATE_PICKUP",
          "fixtureReplacementPolicy": "CUSTOM_FIXTURE_REPLACEMENT",
          "upgradeSlotPolicy": "CUSTOM_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "DEDICATED_SERVICE",
          "capabilities": [
            "SELECTED_LAYOUT",
            "SEPARATE_BEDROOM",
            "GUEST_OR_WORK_ROOM",
            "TWO_WET_MODULES",
            "FULL_COOKING",
            "PRIVATE_LOGISTICS",
            "SECURE_COLD_DELIVERY",
            "SECURE_STORAGE",
            "ARCHIVE_STORAGE",
            "COLLECTION_DISPLAY",
            "CUSTOM_FURNISHING",
            "PRIVATE_DISPOSAL_PICKUP",
            "PREVENTIVE_MAINTENANCE"
          ],
          "notes": []
        },
        {
          "tierId": "housing-a-t2",
          "tierLevel": 2,
          "label": "T2 System Residence Prime",
          "areaM2": 75,
          "weeklyRent": 35000,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 2,
            "maximumOccupants": 7,
            "temporaryGuestCapacity": 4
          },
          "defaultFurnishingGrade": "PREMIUM",
          "furnishingPolicy": "CUSTOM",
          "fixedFixtures": [
            "MULTIPLE_WET_MODULES",
            "COMPLETE_KITCHEN",
            "PRIMARY_BEDROOM",
            "GUEST_SUITE",
            "WORK_ROOM",
            "SERVICE_ROOM",
            "PRIVATE_LOGISTICS_POINT"
          ],
          "rentalFurnishings": [
            "PREMIUM_BED",
            "FULL_REFRIGERATOR",
            "COOKING_SYSTEM",
            "WORKSTATION",
            "GUEST_BED",
            "WARDROBE_SYSTEM",
            "DISPLAY_SYSTEM",
            "LOUNGE_FURNISHING"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 16,
                "height": 9
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 7,
                "height": 5
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 9,
                "height": 6
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 8,
                "height": 6
              },
              "storageType": "COLD"
            },
            {
              "storageId": "secure",
              "label": "Secure Storage",
              "grid": {
                "width": 8,
                "height": 6
              },
              "storageType": "SECURE"
            },
            {
              "storageId": "archive",
              "label": "Archive Storage",
              "grid": {
                "width": 7,
                "height": 5
              },
              "storageType": "ARCHIVE"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "8x6",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "PRIVATE_PICKUP",
          "fixtureReplacementPolicy": "CUSTOM_FIXTURE_REPLACEMENT",
          "upgradeSlotPolicy": "CUSTOM_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "DEDICATED_SERVICE",
          "capabilities": [
            "INDIVIDUAL_LAYOUT",
            "PRIMARY_BEDROOM",
            "GUEST_SUITE",
            "WORK_ROOM",
            "SERVICE_ROOM",
            "MULTIPLE_WET_MODULES",
            "FULL_COOKING",
            "PRIVATE_FREIGHT_LOGISTICS",
            "SECURE_STORAGE",
            "ARCHIVE_STORAGE",
            "COLLECTION_DISPLAY",
            "CUSTOM_FURNISHING",
            "PRIVATE_DISPOSAL_PICKUP",
            "DEDICATED_SERVICE"
          ],
          "notes": []
        },
        {
          "tierId": "housing-a-t3",
          "tierLevel": 3,
          "label": "T3 System Residence Sovereign",
          "areaM2": 100,
          "weeklyRent": 50000,
          "occupancy": {
            "privateUnit": true,
            "recommendedAdults": 2,
            "maximumOccupants": 10,
            "temporaryGuestCapacity": 6
          },
          "defaultFurnishingGrade": "PREMIUM",
          "furnishingPolicy": "CUSTOM",
          "fixedFixtures": [
            "INDIVIDUAL_INFRASTRUCTURE",
            "MULTIPLE_WET_MODULES",
            "COMPLETE_KITCHEN",
            "PRIMARY_SUITE",
            "GUEST_SUITE",
            "WORK_ROOMS",
            "SERVICE_ROOM",
            "DEDICATED_FREIGHT_ACCESS"
          ],
          "rentalFurnishings": [
            "CUSTOM_RENTAL_FURNISHING_SET"
          ],
          "storage": [
            {
              "storageId": "main",
              "label": "Main Storage",
              "grid": {
                "width": 20,
                "height": 10
              },
              "storageType": "GENERAL"
            },
            {
              "storageId": "wet",
              "label": "Wet Storage",
              "grid": {
                "width": 8,
                "height": 6
              },
              "storageType": "WET"
            },
            {
              "storageId": "wardrobe",
              "label": "Wardrobe",
              "grid": {
                "width": 10,
                "height": 8
              },
              "storageType": "WARDROBE"
            },
            {
              "storageId": "cold",
              "label": "Cold Storage",
              "grid": {
                "width": 10,
                "height": 7
              },
              "storageType": "COLD"
            },
            {
              "storageId": "secure",
              "label": "Secure Storage",
              "grid": {
                "width": 10,
                "height": 7
              },
              "storageType": "SECURE"
            },
            {
              "storageId": "archive",
              "label": "Archive Storage",
              "grid": {
                "width": 9,
                "height": 6
              },
              "storageType": "ARCHIVE"
            }
          ],
          "logistics": {
            "parcelMaxFootprint": "FREIGHT",
            "foodDelivery": true,
            "coldDelivery": true,
            "unattendedDelivery": true
          },
          "disposalAccess": "PRIVATE_PICKUP",
          "fixtureReplacementPolicy": "INDIVIDUAL_FIXTURE_PROGRAM",
          "upgradeSlotPolicy": "CUSTOM_FUNCTIONAL_SLOTS",
          "maintenanceCoverage": "DEDICATED_SERVICE",
          "capabilities": [
            "INDIVIDUAL_LAYOUT",
            "PRIMARY_SUITE",
            "GUEST_SUITE",
            "MULTIPLE_WORK_ROOMS",
            "SERVICE_ROOM",
            "MULTIPLE_WET_MODULES",
            "FULL_COOKING",
            "DEDICATED_FREIGHT_ACCESS",
            "SECURE_STORAGE",
            "ARCHIVE_STORAGE",
            "COLLECTION_DISPLAY",
            "CUSTOM_FURNISHING",
            "PRIVATE_DISPOSAL_PICKUP",
            "DEDICATED_SERVICE"
          ],
          "notes": []
        }
      ]
    }
  ]
};
  window.APP_DATA.housingRentStandards = catalog;
})();
