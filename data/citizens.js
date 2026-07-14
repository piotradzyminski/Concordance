window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.citizens = [
  {
    "id": "admin",
    "recordSchemaVersion": "citizen_record_foundation_2_0x",
    "recordState": "ACTIVE",
    "characterType": "SYSTEM",
    "ownerUserId": "user-admin",
    "revision": 1,
    "activatedAt": "2109-01-01T00:00:00.000Z",
    "recordType": "admin",
    "playerVisible": false,
    "accessTags": [
      "GAME_MASTER"
    ],
    "shortId": "W&S-LOCAL-000",
    "legalName": "Operator lokalny",
    "profile": "Operator",
    "classProfile": "Watch & Secure / GM Operator",
    "biologicalProfile": "NONE",
    "idNumber": "W&S-LOCAL-000",
    "origin": "Local campaign node",
    "tags": [
      "FULL LOCAL",
      "GM LAYER",
      "W&S OVERRIDE",
      "UNSYNCED"
    ],
    "portrait": "",
    "status": "Game Master / Watch & Secure local operator",
    "clearance": "Full Local Access",
    "address": "05.521.002.309::LOCAL.000.001",
    "trace": "0.5.521004.021998.21090101.2137.ADMIN.F91A",
    "subscriptions": [],
    "skills": [
      {
        "skillId": "skill-database-override",
        "label": "Database override",
        "value": 10
      },
      {
        "skillId": "skill-campaign-supervision",
        "label": "Campaign supervision",
        "value": 10
      },
      {
        "skillId": "skill-local-access-routing",
        "label": "Local access routing",
        "value": 9
      }
    ],
    "abilities": [],
    "files": [],
    "appearance": "Profil administracyjny bez karty obywatela.",
    "debt": "N/A",
    "risk": 0,
    "note": "Tryb administratora kampanii. Warstwa lokalna nie jest widoczna dla użytkowników obywatelskich.",
    "credits": 0,
    "income": [],
    "subscriptionContractSchemaVersion": "subscription_contracts_bridge_schema_2_0x"
  },
  {
    "id": "citizen-a",
    "recordSchemaVersion": "citizen_record_foundation_2_0x",
    "recordState": "ACTIVE",
    "characterType": "PLAYER",
    "ownerUserId": "user-citizen-a",
    "revision": 1,
    "activatedAt": "2109-01-01T00:00:00.000Z",
    "recordType": "citizen",
    "playerVisible": true,
    "accessTags": [
      "PUBLIC",
      "RESTRICTED"
    ],
    "seedStateResetKey": "citizen-player-test-loadout-20260707-a",
    "shortId": "20800623.A91B880",
    "legalName": "Iris Vale",
    "profile": "BETA",
    "biologicalProfile": "BETA",
    "idNumber": "03.51N00E.0A04.20800623.A91B880",
    "origin": "NE3:51.00",
    "portrait": "",
    "address": "03.510.003.109::A4.019.204",
    "trace": "0.3.513410.002131.21090101.2137.M4P2C8",
    "credits": 10000,
    "debt": "0 ₡",
    "status": "EQ test set A / mobile mounts",
    "note": "Pre-alpha EQ test set A: coverage reservations, direct-worn containers, bilateral mounts, held equipment, item-owned holster/sheath and condition edge cases.",
    "subscriptions": [
      {
        "subscriptionContractId": "sub-citizen-a-mass-compression-capacity-licensed",
        "subscriptionCatalogId": "sub-mass-compression-service",
        "citizenId": "citizen-a",
        "providerId": "provider-mass-compression-service",
        "organizationId": "mass-compression",
        "tierId": "capacity-licensed",
        "contractStatus": "ACTIVE",
        "billingStatus": "PAID",
        "entitlementStatus": "ACTIVE",
        "coverageTarget": {
          "type": "CITIZEN",
          "id": "citizen-a"
        },
        "startedAt": "2109-02-13",
        "currentPeriodStart": "2109-02-13",
        "currentPeriodEnd": "2109-02-20",
        "gracePeriodEndsAt": null,
        "cancelledAt": null,
        "suspendedAt": null,
        "billingAccountId": "billing-account-citizen-a",
        "lastBillingTransactionId": null,
        "amount": 800,
        "currency": "CREDIT",
        "billingCycle": "WEEKLY",
        "lastPaidAt": "2109-02-13",
        "lastSettlementAt": null,
        "lastBilledAt": null,
        "lastBilledAmount": 0,
        "lastDebtIncrease": 0,
        "billingHistory": [],
        "displaySnapshot": {
          "title": "Mass Compression Service",
          "tierLabel": "T2 Licensed",
          "category": "MASS_COMPRESSION",
          "provider": "Mass Compression Service",
          "market": "PRIVATE",
          "logo": "CAPACITY_MODULE",
          "description": "Seeded test coverage for Mass Compression Cube runtime validation."
        },
        "revision": 1,
        "metadata": {
          "seeded": true
        }
      }
    ],
    "equipment": {
      "seedResetKey": "equipment-dual-test-loadouts-1.4.0x-a"
    },
    "skills": [],
    "abilities": [],
    "serviceLog": [],
    "income": [],
    "files": [],
    "serviceOfferStates": {},
    "serviceReputation": {},
    "serviceEmployerReputation": {},
    "subscriptionContractSchemaVersion": "subscription_contracts_bridge_schema_2_0x"
  },
  {
    "id": "citizen-b",
    "recordSchemaVersion": "citizen_record_foundation_2_0x",
    "recordState": "ACTIVE",
    "characterType": "PLAYER",
    "ownerUserId": "user-citizen-b",
    "revision": 1,
    "activatedAt": "2109-01-01T00:00:00.000Z",
    "recordType": "citizen",
    "playerVisible": true,
    "accessTags": [
      "PUBLIC"
    ],
    "seedStateResetKey": "citizen-cyberware-authorization-10.0x-b",
    "shortId": "20720121.B91X410",
    "legalName": "Kamigaeri Nagato",
    "profile": "BETA",
    "biologicalProfile": "BETA",
    "idNumber": "03.51N00E.0A04.20720121.B91X410",
    "origin": "NE3:51.00",
    "portrait": "",
    "address": "05.521.101.309::C12.044.018",
    "trace": "0.5.521004.021998.21090101.2137.K7X9Q2",
    "credits": 10000,
    "debt": "0 ₡",
    "status": "EQ test set B / heavy nested",
    "note": "Pre-alpha EQ test set B: complete independent wear layers, bilateral armor, blocked mounts, item-mounted chest rig, multi-level container nesting, rotation and Housing transfer coverage.",
    "subscriptions": [
      {
        "subscriptionContractId": "sub-citizen-b-mass-compression-capacity-corporate",
        "subscriptionCatalogId": "sub-mass-compression-service",
        "citizenId": "citizen-b",
        "providerId": "provider-mass-compression-service",
        "organizationId": "mass-compression",
        "tierId": "capacity-corporate",
        "contractStatus": "ACTIVE",
        "billingStatus": "PAID",
        "entitlementStatus": "ACTIVE",
        "coverageTarget": {
          "type": "CITIZEN",
          "id": "citizen-b"
        },
        "startedAt": "2109-02-13",
        "currentPeriodStart": "2109-02-13",
        "currentPeriodEnd": "2109-02-20",
        "gracePeriodEndsAt": null,
        "cancelledAt": null,
        "suspendedAt": null,
        "billingAccountId": "billing-account-citizen-b",
        "lastBillingTransactionId": null,
        "amount": 4200,
        "currency": "CREDIT",
        "billingCycle": "WEEKLY",
        "lastPaidAt": "2109-02-13",
        "lastSettlementAt": null,
        "lastBilledAt": null,
        "lastBilledAmount": 0,
        "lastDebtIncrease": 0,
        "billingHistory": [],
        "displaySnapshot": {
          "title": "Mass Compression Service",
          "tierLabel": "T4 Corporate",
          "category": "MASS_COMPRESSION",
          "provider": "Mass Compression Service",
          "market": "PRIVATE",
          "logo": "CAPACITY_MODULE",
          "description": "Seeded test coverage for Mass Compression Cube runtime validation."
        },
        "revision": 1,
        "metadata": {
          "seeded": true
        }
      },
      {
        "subscriptionContractId": "sub-citizen-b-habitat-secured",
        "subscriptionCatalogId": "sub-housing-standard-c",
        "citizenId": "citizen-b",
        "providerId": "provider-habitat-ledger",
        "organizationId": "habitat-market",
        "tierId": "housing-c-t2",
        "contractStatus": "ACTIVE",
        "billingStatus": "PAID",
        "entitlementStatus": "ACTIVE",
        "coverageTarget": {
          "type": "CITIZEN",
          "id": "citizen-b"
        },
        "startedAt": "2109-02-13",
        "currentPeriodStart": "2109-02-13",
        "currentPeriodEnd": "2109-02-20",
        "gracePeriodEndsAt": null,
        "cancelledAt": null,
        "suspendedAt": null,
        "billingAccountId": "billing-account-citizen-b",
        "lastBillingTransactionId": null,
        "amount": 9800,
        "currency": "CREDIT",
        "billingCycle": "WEEKLY",
        "lastPaidAt": "2109-02-13",
        "lastSettlementAt": null,
        "lastBilledAt": null,
        "lastBilledAmount": 0,
        "lastDebtIncrease": 0,
        "billingHistory": [],
        "displaySnapshot": {
          "title": "Housing Standard C",
          "tierLabel": "T2 Premium Adaptive",
          "category": "RENT",
          "provider": "Habitat Ledger",
          "market": "SYSTEM",
          "logo": "HAB",
          "description": "Premium adaptive Housing tier seeded for Rent catalog and Household integration tests."
        },
        "revision": 1,
        "metadata": {
          "seeded": true
        }
      }
    ],
    "equipment": {
      "seedResetKey": "equipment-dual-test-loadouts-1.4.0x-b"
    },
    "skills": [],
    "abilities": [],
    "serviceLog": [],
    "income": [],
    "files": [],
    "serviceOfferStates": {},
    "serviceReputation": {},
    "serviceEmployerReputation": {},
    "cyberwareLicenses": [
      {
        "id": "license-citizen-b-civic",
        "category": "CIVIC",
        "label": "Civic Cyberware License",
        "status": "ACTIVE",
        "permanent": true,
        "grantedAt": "2109-02-13",
        "grantedBy": "PerfectMin / Civic Registry",
        "reason": "Permanent civilian cyberware entitlement.",
        "manufacturers": [],
        "protocols": [
          "CIVIC"
        ],
        "grades": [
          "CIVILIAN",
          "LICENSED"
        ],
        "tags": [
          "CYBERWARE",
          "CIVIC",
          "LIFETIME"
        ],
        "log": []
      },
      {
        "id": "license-citizen-b-industrial",
        "category": "INDUSTRIAL",
        "label": "Industrial Cyberware License",
        "status": "ACTIVE",
        "permanent": true,
        "grantedAt": "2109-02-13",
        "grantedBy": "Factory Commons Certification Office",
        "reason": "Permanent industrial and utility cyberware entitlement.",
        "manufacturers": [],
        "protocols": [
          "UTILITY",
          "INDUSTRIAL",
          "MASS_COMPRESSION",
          "MC_HAND_M3_R",
          "MULTIBUS",
          "EQUIPMENT_LAYOUT"
        ],
        "grades": [
          "CIVILIAN",
          "LICENSED",
          "CORPORATE"
        ],
        "tags": [
          "CYBERWARE",
          "INDUSTRIAL",
          "LIFETIME"
        ],
        "log": []
      },
      {
        "id": "license-citizen-b-medical",
        "category": "MEDICAL",
        "label": "Medical Cyberware License",
        "status": "SUSPENDED",
        "permanent": true,
        "grantedAt": "2109-02-13",
        "grantedBy": "CoreMed Clinical Registry",
        "suspendedAt": "2109-02-13",
        "reason": "Suspended test entitlement for authorization validation.",
        "manufacturers": [],
        "protocols": [
          "CIVIC",
          "MEDICAL"
        ],
        "grades": [
          "CIVILIAN",
          "LICENSED"
        ],
        "tags": [
          "CYBERWARE",
          "MEDICAL",
          "LIFETIME",
          "TEST_SUSPENDED"
        ],
        "log": []
      }
    ],
    "housing": [
      {
        "id": "housing-citizen-b-secured-test",
        "title": "Secured Unit / Authorization Test",
        "type": "HOUSING_STANDARD_C",
        "status": "ACTIVE",
        "isPrimary": true,
        "provider": "Habitat Ledger",
        "linkedSubscriptionId": "sub-citizen-b-habitat-secured",
        "standardCode": "C",
        "standardTierId": "housing-c-t2",
        "areaM2": 35,
        "furnishingPolicy": "EXTENDED",
        "parcelMaxFootprint": "4x4",
        "disposalAccess": "PRIVATE_RETURN_LOCKER",
        "defaultFurnishingGrade": "QUALITY",
        "maintenanceCoverage": "OPERATOR_PRIORITY",
        "layoutPolicy": "CHOICE_POOL",
        "layoutTemplateId": "housing-c-t2-layout-alcove-02",
        "layoutSeed": "LAYOUT-CITIZEN-B-C2",
        "layoutVariantFamily": "ALCOVE",
        "visibleAddress": "03.51N00E.060.HAB2.209::B12.044.018",
        "traceAddress": "03.51N3410.00E2131.21090213.1200.HAB2B2.A10X",
        "zone": "ZONE_2",
        "rentStatus": "PAID",
        "securityLevel": 9,
        "privacyLevel": 8,
        "comfortLevel": 8,
        "household": {
          "schemaVersion": "household_foundation_2_0x",
          "layoutSchemaVersion": "housing_layout_pools_3_1x",
          "layoutTemplateId": "housing-c-t2-layout-alcove-02",
          "layoutSeed": "LAYOUT-CITIZEN-B-C2",
          "layoutPolicy": "CHOICE_POOL",
          "variantFamily": "ALCOVE",
          "residentIds": ["citizen-b"]
        },
        "storageUnits": [
          {
            "id": "housing-storage-citizen-b-secured",
            "label": "Secured Unit Storage",
            "width": 4,
            "height": 4,
            "slotCapacity": 16
          },
          {
            "id": "housing-storage-citizen-b-furnishing",
            "label": "Furnishing Staging",
            "width": 6,
            "height": 4,
            "slotCapacity": 24
          }
        ],
        "notes": "Top currently catalogued Housing tier seeded for player B test workflows.",
        "gmNote": "Pre-alpha test record. May be reset or replaced without migration."
      }
    ],
    "subscriptionContractSchemaVersion": "subscription_contracts_bridge_schema_2_0x"
  },
  {
    "id": "mara-chen",
    "recordSchemaVersion": "citizen_record_foundation_2_0x",
    "recordState": "ACTIVE",
    "characterType": "NPC",
    "ownerUserId": "",
    "revision": 1,
    "activatedAt": "2109-01-01T00:00:00.000Z",
    "recordType": "npc",
    "shortId": "20770614.MCHEN44",
    "legalName": "Mara Chen",
    "profile": "Alfa",
    "classProfile": "Medical contractor",
    "biologicalProfile": "ALPHA",
    "idNumber": "03.51N00E.0C12.20770614.MCHEN44",
    "origin": "Klinika prywatna / pierścień centralny",
    "tags": [
      "MEDICAL",
      "L&P T3",
      "CONTACT"
    ],
    "portrait": "",
    "status": "Kontrakt medyczny",
    "clearance": "Medical-Civil",
    "address": "N/A",
    "trace": "0.8.771204.004112.21090101.2137.MCHEN.44A",
    "subscriptions": [
      {
        "subscriptionContractId": "sub-mara-chen-live-prevail",
        "subscriptionCatalogId": "sub-live-prevail",
        "citizenId": "mara-chen",
        "providerId": "provider-live-prevail",
        "organizationId": "live-prevail",
        "tierId": "lp-prevail",
        "contractStatus": "ACTIVE",
        "billingStatus": "PAID",
        "entitlementStatus": "ACTIVE",
        "coverageTarget": {
          "type": "CITIZEN",
          "id": "mara-chen"
        },
        "startedAt": "2109-02-13",
        "currentPeriodStart": "2109-02-13",
        "currentPeriodEnd": null,
        "gracePeriodEndsAt": null,
        "cancelledAt": null,
        "suspendedAt": null,
        "billingAccountId": "billing-account-mara-chen",
        "lastBillingTransactionId": null,
        "amount": 4200,
        "currency": "CREDIT",
        "billingCycle": "WEEKLY",
        "lastPaidAt": "2109-02-13",
        "lastSettlementAt": null,
        "lastBilledAt": null,
        "lastBilledAmount": 0,
        "lastDebtIncrease": 0,
        "billingHistory": [],
        "displaySnapshot": {
          "title": "Live & Prevail",
          "tierLabel": "T3 Prevail",
          "category": "INSURANCE",
          "provider": "Live & Prevail",
          "market": "SYSTEM",
          "logo": "assets/logos/corp/lp.png",
          "description": "Zaawansowana opieka, 1 przeszczep, interwencja darmowa, wysoki priorytet, biochip."
        },
        "revision": 1,
        "metadata": {
          "seeded": true
        }
      }
    ],
    "skills": [],
    "abilities": [],
    "files": [],
    "appearance": "Lekarka kontraktowa powiązana z prywatnymi pakietami medycznymi i obsługą urazową.",
    "debt": "0 ₡",
    "risk": 22,
    "note": "Utrzymuje nieformalne kontakty z ubezpieczycielami. Może znać ukryte warunki polis.",
    "credits": 12500,
    "income": [
      {
        "id": "income-medical-contract",
        "title": "Medical contractor payout",
        "provider": "MedRing Access",
        "amount": 9000,
        "cycle": "WEEKLY",
        "status": "ACTIVE"
      }
    ],
    "subscriptionContractSchemaVersion": "subscription_contracts_bridge_schema_2_0x"
  },
  {
    "id": "noah-strake",
    "recordSchemaVersion": "citizen_record_foundation_2_0x",
    "recordState": "ACTIVE",
    "characterType": "NPC",
    "ownerUserId": "",
    "revision": 1,
    "activatedAt": "2109-01-01T00:00:00.000Z",
    "recordType": "npc",
    "shortId": "20791108.NSTRAKE",
    "legalName": "Noah Strake",
    "profile": "None",
    "classProfile": "Unregistered / case-linked",
    "biologicalProfile": "NONE",
    "idNumber": "03.51N00E.ZZ99.20791108.NSTRAKE",
    "origin": "Niepotwierdzone",
    "tags": [
      "UNREGISTERED",
      "CASE LINK",
      "WATCH"
    ],
    "portrait": "",
    "status": "Niepełny wpis",
    "clearance": "Unknown",
    "address": "N/A",
    "trace": "NO_STABLE_TRACE",
    "subscriptions": [],
    "skills": [],
    "abilities": [],
    "files": [],
    "appearance": "Osoba pojawiająca się w pobocznych raportach incydentów. Dane publiczne niepełne.",
    "debt": "N/A",
    "risk": 64,
    "note": "Powiązany z kilkoma śladami spraw. Nie pokazywać graczom pełnego zakresu powiązań.",
    "credits": 120,
    "income": [],
    "subscriptionContractSchemaVersion": "subscription_contracts_bridge_schema_2_0x"
  }
];
