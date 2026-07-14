window.APP_DATA = window.APP_DATA || {};

(() => {
  const categories = [
  {
    "id": "INSURANCE",
    "label": "Insurance"
  },
  {
    "id": "CYBERSECURITY",
    "label": "Cybersecurity"
  },
  {
    "id": "LIVESECURITY",
    "label": "Live Security"
  },
  {
    "id": "CYBERWARE",
    "label": "Cyberware"
  },
  {
    "id": "MASS_COMPRESSION",
    "label": "Mass Compression"
  },
  {
    "id": "RENT",
    "label": "Rent"
  },
  {
    "id": "FOOD",
    "label": "Food"
  },
  {
    "id": "HYGIENE",
    "label": "Hygiene"
  },
  {
    "id": "TRANSPORT",
    "label": "Transport"
  },
  {
    "id": "REST",
    "label": "Rest"
  },
  {
    "id": "EDUCATION",
    "label": "Education"
  },
  {
    "id": "AFTERLIFE",
    "label": "Afterlife"
  },
  {
    "id": "OTHER",
    "label": "Other"
  }
];

  const providers = [
  {
    "id": "provider-live-prevail",
    "name": "Live & Prevail",
    "organizationId": "live-prevail",
    "market": "SYSTEM"
  },
  {
    "id": "provider-trauma-team",
    "name": "TRAUMA Team",
    "organizationId": "trauma-team",
    "market": "PRIVATE"
  },
  {
    "id": "provider-kagami-kaisha",
    "name": "Kagami Kaisha",
    "organizationId": "kagami-kaisha",
    "market": "PRIVATE"
  },
  {
    "id": "provider-watch-secure",
    "name": "Watch & Secure",
    "organizationId": "watch-secure",
    "market": "SYSTEM"
  },
  {
    "id": "provider-coremed-service",
    "name": "CoreMed Service",
    "organizationId": "coremed",
    "market": "PRIVATE"
  },
  {
    "id": "provider-habitat-ledger",
    "name": "Habitat Ledger",
    "organizationId": "habitat-market",
    "market": "SYSTEM"
  },
  {
    "id": "provider-perfectmin-licensed-clinics",
    "name": "PerfectMin / Licensed Clinics",
    "organizationId": "perfectmin",
    "market": "PRIVATE"
  },
  {
    "id": "provider-factory-commons",
    "name": "Factory Commons",
    "organizationId": "factory-commons",
    "market": "SYSTEM"
  },
  {
    "id": "provider-mass-compression-service",
    "name": "Mass Compression Service",
    "organizationId": "mass-compression",
    "market": "PRIVATE"
  },
  {
    "id": "provider-plentymin-nutrient-access",
    "name": "PlentyMin Nutrient Access",
    "organizationId": "plentymin",
    "market": "SYSTEM"
  },
  {
    "id": "provider-helix-table",
    "name": "Helix Table",
    "organizationId": "helix-table",
    "market": "PRIVATE"
  },
  {
    "id": "provider-cleanstate-utility",
    "name": "CleanState Utility",
    "organizationId": "cleanstate-utility",
    "market": "SYSTEM"
  },
  {
    "id": "provider-aurum-skinworks",
    "name": "Aurum Skinworks",
    "organizationId": "aurum",
    "market": "PRIVATE"
  },
  {
    "id": "provider-metrogrid-access",
    "name": "MetroGrid Access",
    "organizationId": "metrogrid-access",
    "market": "SYSTEM"
  },
  {
    "id": "provider-vector-cabline",
    "name": "Vector Cabline",
    "organizationId": "vector-cabline",
    "market": "PRIVATE"
  },
  {
    "id": "provider-sleepstandard",
    "name": "SleepStandard",
    "organizationId": "sleepstandard",
    "market": "SYSTEM"
  },
  {
    "id": "provider-somnacore",
    "name": "SomnaCore",
    "organizationId": "somnacore",
    "market": "PRIVATE"
  },
  {
    "id": "provider-learnmin-access",
    "name": "LearnMin Access",
    "organizationId": "learnmin-access",
    "market": "SYSTEM"
  },
  {
    "id": "provider-cortex-ladder",
    "name": "Cortex Ladder",
    "organizationId": "cortex-ladder",
    "market": "PRIVATE"
  }
];

  const subscriptions = [
  {
    "subscriptionCatalogId": "sub-live-prevail",
    "providerId": "provider-live-prevail",
    "organizationId": "live-prevail",
    "productCode": "LP-CARE",
    "title": "Live & Prevail",
    "provider": "Live & Prevail",
    "category": "INSURANCE",
    "market": "SYSTEM",
    "domain": "MEDICAL",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "LIVE_PREVAIL_MEDICAL_COVERAGE"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [],
    "tags": [
      "SYSTEM"
    ],
    "logo": "assets/logos/corp/lp.png",
    "summary": "Systemowa opieka zdrowotna i utrzymanie ciała roboczego.",
    "description": "System zdrowotno-subskrypcyjny z trzema tierami: minimum przeżycia, utrzymanie ciała roboczego i priorytetowa opieka systemowa.",
    "tiers": [
      {
        "tierId": "lp-live",
        "tierLevel": 1,
        "label": "T1 Live",
        "amount": 1200,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Podstawowa opieka, płatni specjaliści, niski priorytet.",
        "entitlementCodes": [
          "LIVE_PREVAIL_MEDICAL_COVERAGE_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "lp-sustain",
        "tierLevel": 2,
        "label": "T2 Sustain",
        "amount": 2600,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Opieka standardowa, płatni specjaliści, karetka 1 raz w miesiącu.",
        "entitlementCodes": [
          "LIVE_PREVAIL_MEDICAL_COVERAGE_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "lp-prevail",
        "tierLevel": 3,
        "label": "T3 Prevail",
        "amount": 4200,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Zaawansowana opieka, 1 przeszczep, interwencja darmowa, wysoki priorytet, biochip.",
        "entitlementCodes": [
          "LIVE_PREVAIL_MEDICAL_COVERAGE_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 1
  },
  {
    "subscriptionCatalogId": "sub-trauma-team",
    "providerId": "provider-trauma-team",
    "organizationId": "trauma-team",
    "productCode": "TRM-COVERAGE",
    "title": "TRAUMA Team",
    "provider": "TRAUMA Team",
    "category": "INSURANCE",
    "market": "PRIVATE",
    "domain": "MEDICAL",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "TRAUMA_MEDICAL_COVERAGE",
      "TRAUMA_EMERGENCY_RESPONSE"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [
      {
            "coverageRuleId": "COVERAGE_TRAUMA_SERVICE",
            "sourceType": "TRAUMA",
            "coverageCode": "TRAUMA_SERVICE_COVERAGE",
            "stackGroup": "SERVICE_PRIMARY_COVERAGE",
            "stackMode": "EXCLUSIVE_HIGHEST",
            "priority": 500,
            "appliesTo": {
                  "sourceDomains": [
                        "SERVICE"
                  ],
                  "providerIds": [
                        "provider-trauma-team"
                  ],
                  "serviceDefinitionIds": [
                        "svc-cyberware-diagnostic-standard",
                        "svc-cyberware-install-standard",
                        "svc-cyberware-deinstall-standard",
                        "svc-cyberware-replace-standard",
                        "svc-cyberware-repair-standard",
                        "svc-cyberware-calibrate-standard",
                        "svc-cyberware-clean-standard"
                  ],
                  "catalogItemIds": []
            },
            "benefitsByTierId": {
                  "trauma-t2": {
                        "calculation": "PERCENT_CAP",
                        "percent": 5,
                        "maxAmount": 1000
                  },
                  "trauma-t3": {
                        "calculation": "PERCENT_CAP",
                        "percent": 10,
                        "maxAmount": 2500
                  },
                  "trauma-t4": {
                        "calculation": "PERCENT_CAP",
                        "percent": 15,
                        "maxAmount": 5000
                  },
                  "trauma-t5": {
                        "calculation": "FULL"
                  }
            },
            "active": true,
            "revision": 1,
            "metadata": {
                  "balanceStage": "LORE_BASELINE"
            }
      },
      {
            "coverageRuleId": "COVERAGE_TRAUMA_REPLACEMENT",
            "sourceType": "TRAUMA",
            "coverageCode": "IMPLANT_REPLACEMENT",
            "stackGroup": "SERVICE_PRIMARY_COVERAGE",
            "stackMode": "EXCLUSIVE_HIGHEST",
            "priority": 520,
            "appliesTo": {
                  "sourceDomains": [
                        "SERVICE"
                  ],
                  "providerIds": [
                        "provider-trauma-team"
                  ],
                  "serviceDefinitionIds": [
                        "svc-cyberware-replace-standard"
                  ],
                  "catalogItemIds": []
            },
            "benefitsByTierId": {
                  "trauma-t4": {
                        "calculation": "FIXED",
                        "fixedAmount": 10000
                  },
                  "trauma-t5": {
                        "calculation": "FIXED",
                        "fixedAmount": 25000
                  }
            },
            "active": true,
            "revision": 1,
            "metadata": {
                  "balanceStage": "LORE_CANON"
            }
      },
      {
            "coverageRuleId": "COVERAGE_TRAUMA_INCLUDED_INTERVENTION",
            "sourceType": "TRAUMA",
            "coverageCode": "EMERGENCY_INTERVENTION",
            "stackGroup": "SERVICE_PRIMARY_COVERAGE",
            "stackMode": "EXCLUSIVE_HIGHEST",
            "priority": 700,
            "appliesTo": {
                  "sourceDomains": [
                        "SERVICE"
                  ],
                  "providerIds": [
                        "provider-trauma-team"
                  ],
                  "serviceDefinitionIds": [
                        "svc-emergency-extraction-standard"
                  ],
                  "catalogItemIds": []
            },
            "benefitsByTierId": {
                  "trauma-t1": {
                        "calculation": "FULL",
                        "authorizationCode": "TRAUMA_INTERVENTION_AVAILABLE"
                  },
                  "trauma-t2": {
                        "calculation": "FULL",
                        "authorizationCode": "TRAUMA_INTERVENTION_AVAILABLE"
                  },
                  "trauma-t3": {
                        "calculation": "FULL",
                        "authorizationCode": "TRAUMA_INTERVENTION_AVAILABLE"
                  },
                  "trauma-t4": {
                        "calculation": "FULL",
                        "authorizationCode": "TRAUMA_INTERVENTION_AVAILABLE"
                  },
                  "trauma-t5": {
                        "calculation": "FULL",
                        "authorizationCode": "TRAUMA_INTERVENTION_AVAILABLE"
                  }
            },
            "active": true,
            "revision": 1,
            "metadata": {
                  "requiresUsageLedger": true,
                  "balanceStage": "LORE_CANON"
            }
      }
],
    "tags": [
      "PRIVATE"
    ],
    "logo": "TRM",
    "summary": "Prywatny kontrakt ratunkowy i kliniczny premium.",
    "description": "Prywatny kontrakt ratunkowo-leczący obejmujący interwencje, biochip, biomonitoring, przeszczepy i usługi premium.",
    "tiers": [
      {
        "tierId": "trauma-t1",
        "tierLevel": 1,
        "label": "T1",
        "amount": 3500,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Karetka i stabilizacja. Jedna interwencja manualna w okresie umowy.",
        "entitlementCodes": [
          "TRAUMA_MEDICAL_COVERAGE_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "trauma-t2",
        "tierLevel": 2,
        "label": "T2",
        "amount": 6200,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "T1 + biochip, opieka medyczna, pobór próbki tkanki, 2 interwencje.",
        "entitlementCodes": [
          "TRAUMA_MEDICAL_COVERAGE_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "trauma-t3",
        "tierLevel": 3,
        "label": "T3",
        "amount": 9800,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "T2 + przeszczep, ewakuacja z zagrożonej strefy, 3 interwencje biochipowe.",
        "entitlementCodes": [
          "TRAUMA_MEDICAL_COVERAGE_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "trauma-t4",
        "tierLevel": 4,
        "label": "T4",
        "amount": 15500,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "T3 + biomonitoring 24/7, ewakuacja z ochroną i obsługa wymiany wszczepów.",
        "entitlementCodes": [
          "TRAUMA_MEDICAL_COVERAGE_T4"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "trauma-t5",
        "tierLevel": 5,
        "label": "T5",
        "amount": 25000,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Pełen kontrakt premium bez dopłat, klonowanie organów i najwyższy priorytet kliniczny.",
        "entitlementCodes": [
          "TRAUMA_MEDICAL_COVERAGE_T5"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 2
  },
  {
    "subscriptionCatalogId": "sub-kagami-sentinel",
    "providerId": "provider-kagami-kaisha",
    "organizationId": "kagami-kaisha",
    "productCode": "KGM-SENTINEL",
    "title": "Kagami Sentinel",
    "provider": "Kagami Kaisha",
    "category": "CYBERSECURITY",
    "market": "PRIVATE",
    "domain": "CYBERWARE",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "KAGAMI_SENTINEL_ACCESS",
      "KAGAMI_CERTIFIED_SECURITY"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN",
        "ITEM_INSTANCE"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1,
      "itemEligibility": {
        "requireOwnedByCitizen": true,
        "blockedLifecycleStates": [
          "DISPOSED"
        ],
        "allowedDefinitionIds": [],
        "allowedCategories": [
          "CYBERWARE"
        ],
        "allowedSubtypes": [],
        "requiredTagsAny": [
          "CYBERWARE",
          "IMPLANT",
          "NEUROCHIP",
          "INTERFACE",
          "SERVICE_PORT",
          "BIOWARE"
        ],
        "requiredTagsAll": [],
        "allowedManufacturerIds": [],
        "allowedProviderIds": []
      }
    },
    "coverageRules": [
      {
            "coverageRuleId": "COVERAGE_KAGAMI_SENTINEL_SERVICE",
            "sourceType": "SUBSCRIPTION",
            "coverageCode": "KAGAMI_CERTIFIED_SERVICE_COVERAGE",
            "stackGroup": "SERVICE_PRIMARY_COVERAGE",
            "stackMode": "EXCLUSIVE_HIGHEST",
            "priority": 340,
            "appliesTo": {
                  "sourceDomains": [
                        "SERVICE"
                  ],
                  "providerIds": [
                        "provider-kagami-kaisha"
                  ],
                  "serviceDefinitionIds": [
                        "svc-cyberware-diagnostic-standard",
                        "svc-cyberware-repair-standard",
                        "svc-cyberware-calibrate-standard",
                        "svc-cyberware-clean-standard",
                        "svc-firmware-update-standard",
                        "svc-license-review-standard"
                  ],
                  "catalogItemIds": []
            },
            "benefitsByTierId": {
                  "kagami-mirror": {
                        "calculation": "PERCENT_CAP",
                        "percent": 10,
                        "maxAmount": 500
                  },
                  "kagami-torii": {
                        "calculation": "PERCENT_CAP",
                        "percent": 30,
                        "maxAmount": 2500
                  },
                  "kagami-yata": {
                        "calculation": "PERCENT_CAP",
                        "percent": 50,
                        "maxAmount": 5000
                  }
            },
            "active": true,
            "revision": 1,
            "metadata": {
                  "balanceStage": "BRIDGE_BASELINE"
            }
      }
],
    "tags": [
      "PRIVATE"
    ],
    "logo": "KGM",
    "summary": "Ochrona sieciowa neurochipów, portów i sesji.",
    "description": "Ubezpieczenie sieciowe i aktywna ochrona neurochipów, portów rdzeniowych oraz lokalnego ruchu danych.",
    "tiers": [
      {
        "tierId": "kagami-mirror",
        "tierLevel": 1,
        "label": "Mirror Guard",
        "amount": 800,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Podstawowy filtr antyhakerski i zapis incydentów.",
        "entitlementCodes": [
          "KAGAMI_SENTINEL_ACCESS_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "kagami-torii",
        "tierLevel": 2,
        "label": "Torii Gate",
        "amount": 1900,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Wielowarstwowa brama sesji, izolacja podejrzanych pakietów i szybszy reset kanału.",
        "entitlementCodes": [
          "KAGAMI_SENTINEL_ACCESS_T2",
          "KAGAMI_FIRMWARE_SECURITY_UPDATES"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "kagami-yata",
        "tierLevel": 3,
        "label": "Yata Reflection",
        "amount": 4300,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Aktywne odbicie ataku, kontrinfekcja i priorytetowy support netrunnerów Kagami.",
        "entitlementCodes": [
          "KAGAMI_SENTINEL_ACCESS_T3",
          "KAGAMI_FIRMWARE_SECURITY_UPDATES"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 2
  },
  {
    "subscriptionCatalogId": "sub-ws-network-fee",
    "providerId": "provider-watch-secure",
    "organizationId": "watch-secure",
    "productCode": "WS-NETWORK",
    "title": "W&S Network Fee",
    "provider": "Watch & Secure",
    "category": "CYBERSECURITY",
    "market": "SYSTEM",
    "domain": "NETWORK",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "WS_NETWORK_ACCESS"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [],
    "tags": [
      "SYSTEM"
    ],
    "logo": "assets/logos/corp/ws.png",
    "summary": "Obowiązkowy routing, weryfikacja i ślad sesji.",
    "description": "Opłata za lokalne kanały dostępu, administracyjny routing, weryfikację i przechowywanie śladów sesji.",
    "tiers": [
      {
        "tierId": "ws-basic",
        "tierLevel": 1,
        "label": "Basic Routing",
        "amount": 300,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Minimalne utrzymanie wpisu dostępowego i routingu lokalnego.",
        "entitlementCodes": [
          "WS_NETWORK_ACCESS_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "ws-stable",
        "tierLevel": 2,
        "label": "Stable Routing",
        "amount": 650,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Stabilniejszy dostęp, mniej ręcznych kontroli i szybsze odświeżenie uprawnień.",
        "entitlementCodes": [
          "WS_NETWORK_ACCESS_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "ws-priority",
        "tierLevel": 3,
        "label": "Priority Routing",
        "amount": 1200,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Priorytetowe przetwarzanie dostępu i mniejsza liczba opóźnień proceduralnych.",
        "entitlementCodes": [
          "WS_NETWORK_ACCESS_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 1
  },
  {
    "subscriptionCatalogId": "sub-ws-liveguard",
    "providerId": "provider-watch-secure",
    "organizationId": "watch-secure",
    "productCode": "WS-LIVEGUARD",
    "title": "W&S LiveGuard",
    "provider": "Watch & Secure",
    "category": "LIVESECURITY",
    "market": "SYSTEM",
    "domain": "SECURITY",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "WS_LIVEGUARD_COVERAGE"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [],
    "tags": [
      "SYSTEM"
    ],
    "logo": "W&S",
    "summary": "Ochrona mieszkania, dóbr i ciała dla profilu ALPHA.",
    "description": "Ochrona mieszkań, dóbr i ciała dostępna wyłącznie dla profilu ALPHA albo uprawnionych wyjątków systemowych.",
    "tiers": [
      {
        "tierId": "liveguard-home",
        "tierLevel": 1,
        "label": "Home Seal",
        "amount": 5200,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Monitoring mieszkania, reakcja patrolu i blokada dostępu lokalnego.",
        "entitlementCodes": [
          "WS_LIVEGUARD_COVERAGE_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "liveguard-asset",
        "tierLevel": 2,
        "label": "Asset Guard",
        "amount": 9800,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Ochrona dóbr, zasobów i transportu osobistego.",
        "entitlementCodes": [
          "WS_LIVEGUARD_COVERAGE_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "liveguard-personal",
        "tierLevel": 3,
        "label": "Personal Detail",
        "amount": 21000,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Osobista ochrona, priorytetowe przejęcie strefy i eskorty proceduralne.",
        "entitlementCodes": [
          "WS_LIVEGUARD_COVERAGE_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 1
  },
  {
    "subscriptionCatalogId": "sub-coremed-service",
    "providerId": "provider-coremed-service",
    "organizationId": "coremed",
    "productCode": "CMS-SERVICE",
    "title": "CoreMed Service",
    "provider": "CoreMed Service",
    "category": "CYBERWARE",
    "market": "PRIVATE",
    "domain": "CYBERWARE",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "COREMED_CERTIFIED_SERVICE"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN",
        "ITEM_INSTANCE"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1,
      "itemEligibility": {
        "requireOwnedByCitizen": true,
        "blockedLifecycleStates": [
          "DISPOSED"
        ],
        "allowedDefinitionIds": [],
        "allowedCategories": [
          "CYBERWARE"
        ],
        "allowedSubtypes": [],
        "requiredTagsAny": [
          "CYBERWARE",
          "IMPLANT",
          "NEUROCHIP",
          "INTERFACE",
          "SERVICE_PORT",
          "BIOWARE"
        ],
        "requiredTagsAll": [],
        "allowedManufacturerIds": [],
        "allowedProviderIds": []
      }
    },
    "coverageRules": [
      {
            "coverageRuleId": "COVERAGE_COREMED_SERVICE",
            "sourceType": "SUBSCRIPTION",
            "coverageCode": "COREMED_SERVICE_COVERAGE",
            "stackGroup": "SERVICE_PRIMARY_COVERAGE",
            "stackMode": "EXCLUSIVE_HIGHEST",
            "priority": 300,
            "appliesTo": {
                  "sourceDomains": [
                        "SERVICE"
                  ],
                  "providerIds": [
                        "provider-coremed-service"
                  ],
                  "serviceDefinitionIds": [
                        "svc-cyberware-diagnostic-standard",
                        "svc-cyberware-install-standard",
                        "svc-cyberware-deinstall-standard",
                        "svc-cyberware-replace-standard",
                        "svc-cyberware-repair-standard",
                        "svc-cyberware-calibrate-standard",
                        "svc-cyberware-clean-standard",
                        "svc-firmware-update-standard",
                        "svc-license-review-standard"
                  ],
                  "catalogItemIds": []
            },
            "benefitsByTierId": {
                  "cms-basic": {
                        "calculation": "PERCENT_CAP",
                        "percent": 15,
                        "maxAmount": 750
                  },
                  "cms-field": {
                        "calculation": "PERCENT_CAP",
                        "percent": 30,
                        "maxAmount": 2500
                  },
                  "cms-priority": {
                        "calculation": "PERCENT_CAP",
                        "percent": 50,
                        "maxAmount": 5000
                  }
            },
            "active": true,
            "revision": 1,
            "metadata": {
                  "balanceStage": "BRIDGE_BASELINE"
            }
      }
],
    "tags": [
      "PRIVATE"
    ],
    "logo": "CMS",
    "summary": "Serwis implantów, sensorów, portów i neurochipów.",
    "description": "Serwis implantów, portów, sensorów i neurochipów utrzymywany jako płatna usługa cykliczna.",
    "tiers": [
      {
        "tierId": "cms-basic",
        "tierLevel": 1,
        "label": "Basic Maintenance",
        "amount": 700,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Podstawowa diagnostyka i utrzymanie zgodności wszczepu.",
        "entitlementCodes": [
          "COREMED_CERTIFIED_SERVICE_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "cms-field",
        "tierLevel": 2,
        "label": "Field Support",
        "amount": 1400,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Serwis terenowy, awaryjne obejścia i szybsza diagnostyka.",
        "entitlementCodes": [
          "COREMED_CERTIFIED_SERVICE_T2",
          "COREMED_FIRMWARE_ACCESS"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "cms-priority",
        "tierLevel": 3,
        "label": "Priority Sync",
        "amount": 2800,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Priorytet serwisowy, stabilizacja po zakłóceniach i szybka wymiana modułu.",
        "entitlementCodes": [
          "COREMED_CERTIFIED_SERVICE_T3",
          "COREMED_FIRMWARE_ACCESS"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 2
  },
  {
    "subscriptionCatalogId": "sub-habitat-ledger",
    "providerId": "provider-habitat-ledger",
    "organizationId": "habitat-market",
    "productCode": "HAB-LEDGER",
    "title": "Habitat Ledger",
    "provider": "Habitat Ledger",
    "category": "RENT",
    "market": "SYSTEM",
    "domain": "HOUSING",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "HABITAT_LEDGER_ACCESS"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [],
    "tags": [
      "SYSTEM"
    ],
    "logo": "HAB",
    "summary": "Najem komórki, media, odpady i utrzymanie adresu.",
    "description": "System najmu komórek mieszkalnych, rachunków za prąd i wodę, wywozu śmieci oraz administracyjnego utrzymania adresu. Brak nieruchomości prywatnych.",
    "tiers": [
      {
        "tierId": "hab-cell",
        "tierLevel": 1,
        "label": "Cell Access",
        "amount": 900,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Minimalna komórka mieszkalna i wpis adresowy.",
        "entitlementCodes": [
          "HABITAT_LEDGER_ACCESS_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "hab-standard",
        "tierLevel": 2,
        "label": "Standard Unit",
        "amount": 1800,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Standardowa jednostka mieszkalna z dostępem do podstawowej infrastruktury.",
        "entitlementCodes": [
          "HABITAT_LEDGER_ACCESS_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "hab-secured",
        "tierLevel": 3,
        "label": "Secured Unit",
        "amount": 3600,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Jednostka z lepszym nadzorem, stabilniejszym dostępem i niższym ryzykiem eksmisji.",
        "entitlementCodes": [
          "HABITAT_LEDGER_ACCESS_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 1
  },
  {
    "subscriptionCatalogId": "sub-afterlife-ledger",
    "providerId": "provider-perfectmin-licensed-clinics",
    "organizationId": "perfectmin",
    "productCode": "AFL-LEDGER",
    "title": "Afterlife Ledger",
    "provider": "PerfectMin / Licensed Clinics",
    "category": "AFTERLIFE",
    "market": "PRIVATE",
    "domain": "MEDICAL",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "AFTERLIFE_LEDGER_ACCESS"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [],
    "tags": [
      "PRIVATE"
    ],
    "logo": "AFL",
    "summary": "Pośmiertne spalanie, odzysk organów i cyberware.",
    "description": "Procedury pośmiertne: spalanie zwłok, wydobycie organów, odzysk cyberware i czyszczenie długu biologicznego.",
    "tiers": [
      {
        "tierId": "afterlife-burn",
        "tierLevel": 1,
        "label": "Clean Burn",
        "amount": 400,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Spalenie zwłok i podstawowa rejestracja zgonu.",
        "entitlementCodes": [
          "AFTERLIFE_LEDGER_ACCESS_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "afterlife-extract",
        "tierLevel": 2,
        "label": "Organ Extract",
        "amount": 1100,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Wydobycie narządów i częściowa kompensacja długu medycznego.",
        "entitlementCodes": [
          "AFTERLIFE_LEDGER_ACCESS_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "afterlife-reclaim",
        "tierLevel": 3,
        "label": "Cyberware Reclaim",
        "amount": 1900,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Odzysk cyberware, organów i zamknięcie wpisów serwisowych.",
        "entitlementCodes": [
          "AFTERLIFE_LEDGER_ACCESS_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 1
  },
  {
    "subscriptionCatalogId": "sub-mass-compression-service",
    "providerId": "provider-mass-compression-service",
    "organizationId": "mass-compression",
    "productCode": "MC-SERVICE",
    "title": "Mass Compression Service",
    "provider": "Mass Compression Service",
    "category": "MASS_COMPRESSION",
    "market": "PRIVATE",
    "domain": "CYBERWARE",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "MC_CERTIFIED_SERVICE"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN",
        "ITEM_INSTANCE"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1,
      "itemEligibility": {
        "requireOwnedByCitizen": true,
        "blockedLifecycleStates": [
          "DISPOSED"
        ],
        "allowedDefinitionIds": [],
        "allowedCategories": [
          "CONTAINER"
        ],
        "allowedSubtypes": [
          "MASS_COMPRESSION_CUBE"
        ],
        "requiredTagsAny": [
          "MASS_COMPRESSION",
          "CAPACITY_MODULE"
        ],
        "requiredTagsAll": [],
        "allowedManufacturerIds": [],
        "allowedProviderIds": []
      }
    },
    "coverageRules": [
      {
            "coverageRuleId": "COVERAGE_MASS_COMPRESSION_SERVICE",
            "sourceType": "SUBSCRIPTION",
            "coverageCode": "MC_SERVICE_COVERAGE",
            "stackGroup": "SERVICE_PRIMARY_COVERAGE",
            "stackMode": "EXCLUSIVE_HIGHEST",
            "priority": 320,
            "appliesTo": {
                  "sourceDomains": [
                        "SERVICE"
                  ],
                  "providerIds": [
                        "provider-mass-compression-service"
                  ],
                  "serviceDefinitionIds": [
                        "svc-cyberware-diagnostic-standard",
                        "svc-cyberware-install-standard",
                        "svc-cyberware-deinstall-standard",
                        "svc-cyberware-replace-standard",
                        "svc-cyberware-repair-standard",
                        "svc-cyberware-calibrate-standard",
                        "svc-cyberware-clean-standard",
                        "svc-firmware-update-standard"
                  ],
                  "catalogItemIds": []
            },
            "benefitsByTierId": {
                  "capacity-basic": {
                        "calculation": "PERCENT_CAP",
                        "percent": 10,
                        "maxAmount": 750
                  },
                  "capacity-licensed": {
                        "calculation": "PERCENT_CAP",
                        "percent": 25,
                        "maxAmount": 2500
                  },
                  "capacity-restricted": {
                        "calculation": "PERCENT_CAP",
                        "percent": 40,
                        "maxAmount": 5000
                  },
                  "capacity-corporate": {
                        "calculation": "PERCENT_CAP",
                        "percent": 60,
                        "maxAmount": 10000
                  }
            },
            "active": true,
            "revision": 1,
            "metadata": {
                  "balanceStage": "BRIDGE_BASELINE"
            }
      }
],
    "tags": [
      "PRIVATE"
    ],
    "logo": "CAPACITY_MODULE",
    "summary": "Software, kalibracja, synchronizacja i serwis capacity modules.",
    "description": "Subskrypcja utrzymująca działanie capacity modules. Fizyczna kostka bez aktywnego pokrycia serwisowego pozostaje przedmiotem, ale nie dodaje rzędów equipment layoutu.",
    "tiers": [
      {
        "tierId": "capacity-basic",
        "tierLevel": 1,
        "label": "T1 Basic",
        "amount": 300,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Pokrycie software i kalibracji dla Capacity-I. Obsługuje do +1 rzędu equipment layoutu.",
        "entitlementCodes": [
          "MC_CERTIFIED_SERVICE_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "capacity-licensed",
        "tierLevel": 2,
        "label": "T2 Licensed",
        "amount": 800,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Pokrycie dla Capacity-I oraz Capacity-II. Obsługuje do +2 rzędów equipment layoutu z pojedynczej kostki.",
        "entitlementCodes": [
          "MC_CERTIFIED_SERVICE_T2",
          "MC_FIRMWARE_ACCESS"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "capacity-restricted",
        "tierLevel": 3,
        "label": "T3 Restricted",
        "amount": 1800,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Pokrycie dla Capacity-I do Capacity-III. Obsługuje do +4 rzędów equipment layoutu z pojedynczej kostki.",
        "entitlementCodes": [
          "MC_CERTIFIED_SERVICE_T3",
          "MC_FIRMWARE_ACCESS",
          "MC_PRIORITY_DIAGNOSTICS"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "capacity-corporate",
        "tierLevel": 4,
        "label": "T4 Corporate",
        "amount": 4200,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Korporacyjne pokrycie dla Capacity-I do Capacity-IV. Obsługuje do +6 rzędów equipment layoutu z pojedynczej kostki.",
        "entitlementCodes": [
          "MC_CERTIFIED_SERVICE_T4",
          "MC_FIRMWARE_ACCESS",
          "MC_PRIORITY_DIAGNOSTICS",
          "MC_FIRMWARE_ACCESS_T4"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 2
  },
  {
    "subscriptionCatalogId": "sub-common-lease",
    "providerId": "provider-factory-commons",
    "organizationId": "factory-commons",
    "productCode": "FC-COMMON-LEASE",
    "title": "Common Lease",
    "provider": "Factory Commons",
    "category": "OTHER",
    "market": "SYSTEM",
    "domain": "EQUIPMENT",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "FACTORY_COMMONS_LEASE_ACCESS"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN",
        "ITEM_INSTANCE"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1,
      "itemEligibility": {
        "requireOwnedByCitizen": true,
        "blockedLifecycleStates": [
          "DISPOSED"
        ],
        "allowedDefinitionIds": [],
        "allowedCategories": [
          "CONTAINER",
          "VEHICLE",
          "EQUIPMENT"
        ],
        "allowedSubtypes": [],
        "requiredTagsAny": [
          "FACTORY_COMMONS",
          "LEASED",
          "VEHICLE",
          "STORAGE"
        ],
        "requiredTagsAll": [],
        "allowedManufacturerIds": [],
        "allowedProviderIds": []
      }
    },
    "coverageRules": [],
    "tags": [
      "SYSTEM"
    ],
    "logo": "COM",
    "summary": "Wynajem pojazdów, magazynów i usług pomocniczych.",
    "description": "Wynajem pojazdów, komórek magazynowych, szafek narzędziowych i pozostałych usług pomocniczych.",
    "tiers": [
      {
        "tierId": "common-locker",
        "tierLevel": 1,
        "label": "Tool Locker",
        "amount": 180,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Szafka narzędziowa albo mała komórka magazynowa.",
        "entitlementCodes": [
          "FACTORY_COMMONS_LEASE_ACCESS_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "common-storage",
        "tierLevel": 2,
        "label": "Storage Cell",
        "amount": 500,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Większa komórka magazynowa z ograniczonym monitoringiem.",
        "entitlementCodes": [
          "FACTORY_COMMONS_LEASE_ACCESS_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "common-vehicle",
        "tierLevel": 3,
        "label": "Vehicle Slot",
        "amount": 1200,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Wynajem podstawowego pojazdu lub miejsca transportowego.",
        "entitlementCodes": [
          "FACTORY_COMMONS_LEASE_ACCESS_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 1
  },
  {
    "subscriptionCatalogId": "sub-civic-meal-line",
    "providerId": "provider-plentymin-nutrient-access",
    "organizationId": "plentymin",
    "productCode": "PM-NUTRIENT",
    "title": "Civic Meal Line",
    "provider": "PlentyMin Nutrient Access",
    "category": "FOOD",
    "market": "SYSTEM",
    "domain": "FOOD",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "PLENTYMIN_NUTRIENT_ACCESS"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [],
    "tags": [
      "SYSTEM"
    ],
    "logo": "CML",
    "summary": "Systemowe dostawy jedzenia, racji i pakietów kalorycznych.",
    "description": "Państwowo-systemowa linia żywieniowa. Zapewnia dostęp do kalorii, tacki, makro i priorytet żywieniowy zależnie od tieru.",
    "tiers": [
      {
        "tierId": "civic-meal-paste",
        "tierLevel": 1,
        "label": "T1 Paste",
        "amount": 320,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Pasta odżywcza albo koncentrat kaloryczny. Minimum przeżycia, brak wyboru i niska różnorodność.",
        "entitlementCodes": [
          "PLENTYMIN_NUTRIENT_ACCESS_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "civic-meal-tray",
        "tierLevel": 2,
        "label": "T2 Tray",
        "amount": 620,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Standardowe tacki żywnościowe, regularna dostawa i ograniczony wybór wariantu.",
        "entitlementCodes": [
          "PLENTYMIN_NUTRIENT_ACCESS_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "civic-meal-balanced",
        "tierLevel": 3,
        "label": "T3 Balanced",
        "amount": 1100,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Pełniejszy jadłospis, kontrola makro i podstawowe dopasowanie do pracy oraz stanu zdrowia.",
        "entitlementCodes": [
          "PLENTYMIN_NUTRIENT_ACCESS_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "civic-meal-priority",
        "tierLevel": 4,
        "label": "T4 Priority",
        "amount": 1900,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Stabilniejsze dostawy, dodatki funkcjonalne i priorytet przy lokalnych niedoborach.",
        "entitlementCodes": [
          "PLENTYMIN_NUTRIENT_ACCESS_T4"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "civic-meal-optimal",
        "tierLevel": 5,
        "label": "T5 Optimal",
        "amount": 3400,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Dieta profilowana biologicznie pod pracę, implanty, leczenie i utrzymanie wydajności.",
        "entitlementCodes": [
          "PLENTYMIN_NUTRIENT_ACCESS_T5"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 1
  },
  {
    "subscriptionCatalogId": "sub-helix-table-nutrition",
    "providerId": "provider-helix-table",
    "organizationId": "helix-table",
    "productCode": "HLX-NUTRITION",
    "title": "Helix Table Nutrition",
    "provider": "Helix Table",
    "category": "FOOD",
    "market": "PRIVATE",
    "domain": "FOOD",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "HELIX_TABLE_NUTRITION_ACCESS"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [],
    "tags": [
      "PRIVATE"
    ],
    "logo": "HLX",
    "summary": "Prywatny katering i dieta profilowana biologicznie.",
    "description": "Prywatny katering korporacyjno-medyczny. Sprzedaje żywienie jako przewagę ciała, stabilność nastroju i kontrolę wydajności.",
    "tiers": [
      {
        "tierId": "helix-pack",
        "tierLevel": 1,
        "label": "T1 Pack",
        "amount": 900,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Gotowe paczki żywieniowe lepsze od systemowych tacek, nadal masowe i ograniczone.",
        "entitlementCodes": [
          "HELIX_TABLE_NUTRITION_ACCESS_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "helix-fresh",
        "tierLevel": 2,
        "label": "T2 Fresh",
        "amount": 1700,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Świeższe posiłki, większy wybór i dostawa według harmonogramu.",
        "entitlementCodes": [
          "HELIX_TABLE_NUTRITION_ACCESS_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "helix-profile",
        "tierLevel": 3,
        "label": "T3 Profile",
        "amount": 3200,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Dieta pod profil biologiczny, pracę, sen, implanty i niedobory.",
        "entitlementCodes": [
          "HELIX_TABLE_NUTRITION_ACCESS_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "helix-executive",
        "tierLevel": 4,
        "label": "T4 Executive",
        "amount": 6200,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Wysokiej jakości składniki i szybka korekta składu pod stres oraz obciążenie.",
        "entitlementCodes": [
          "HELIX_TABLE_NUTRITION_ACCESS_T4"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "helix-bespoke",
        "tierLevel": 5,
        "label": "T5 Bespoke",
        "amount": 11000,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Prywatny plan żywieniowy, monitoring reakcji organizmu i pełna personalizacja.",
        "entitlementCodes": [
          "HELIX_TABLE_NUTRITION_ACCESS_T5"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 1
  },
  {
    "subscriptionCatalogId": "sub-hygiene-cycle",
    "providerId": "provider-cleanstate-utility",
    "organizationId": "cleanstate-utility",
    "productCode": "CSU-HYGIENE",
    "title": "Hygiene Cycle",
    "provider": "CleanState Utility",
    "category": "HYGIENE",
    "market": "SYSTEM",
    "domain": "GENERAL",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "CLEANSTATE_HYGIENE_ACCESS"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [],
    "tags": [
      "SYSTEM"
    ],
    "logo": "CSU",
    "summary": "Systemowa higiena, pranie i sanityzacja użytkowa.",
    "description": "Systemowa subskrypcja higieny: środki czystości, pranie, sanityzacja i procedury dekontaminacyjne zależne od dostępu.",
    "tiers": [
      {
        "tierId": "cleanstate-wash-token",
        "tierLevel": 1,
        "label": "T1 Wash Token",
        "amount": 180,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Minimalny dostęp do wspólnych punktów mycia i podstawowych środków higieny.",
        "entitlementCodes": [
          "CLEANSTATE_HYGIENE_ACCESS_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "cleanstate-clean-kit",
        "tierLevel": 2,
        "label": "T2 Clean Kit",
        "amount": 380,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Cotygodniowy pakiet higieniczny i ograniczony dostęp do pralni wspólnej.",
        "entitlementCodes": [
          "CLEANSTATE_HYGIENE_ACCESS_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "cleanstate-laundry-block",
        "tierLevel": 3,
        "label": "T3 Laundry Block",
        "amount": 720,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Regularne pranie odzieży roboczej, wymiana podstawowych filtrów i dezynfekcja.",
        "entitlementCodes": [
          "CLEANSTATE_HYGIENE_ACCESS_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "cleanstate-sanitary-priority",
        "tierLevel": 4,
        "label": "T4 Sanitary Priority",
        "amount": 1300,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Priorytetowe sloty sanitarne, lepsze środki czystości i szybsze czyszczenie po skażeniu miejskim.",
        "entitlementCodes": [
          "CLEANSTATE_HYGIENE_ACCESS_T4"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "cleanstate-contamination-clear",
        "tierLevel": 5,
        "label": "T5 Contamination Clear",
        "amount": 2400,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Rozszerzona dekontaminacja, sanityzacja osobista i szybka obsługa po ekspozycji środowiskowej.",
        "entitlementCodes": [
          "CLEANSTATE_HYGIENE_ACCESS_T5"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 1
  },
  {
    "subscriptionCatalogId": "sub-body-maintenance",
    "providerId": "provider-aurum-skinworks",
    "organizationId": "aurum",
    "productCode": "AUR-BODY",
    "title": "Body Maintenance",
    "provider": "Aurum Skinworks",
    "category": "HYGIENE",
    "market": "PRIVATE",
    "domain": "MEDICAL",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "AURUM_BODY_MAINTENANCE_ACCESS"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [
      {
            "coverageRuleId": "COVERAGE_AURUM_BODY_MAINTENANCE",
            "sourceType": "SUBSCRIPTION",
            "coverageCode": "AURUM_BODY_SERVICE_COVERAGE",
            "stackGroup": "SERVICE_PRIMARY_COVERAGE",
            "stackMode": "EXCLUSIVE_HIGHEST",
            "priority": 280,
            "appliesTo": {
                  "sourceDomains": [
                        "SERVICE"
                  ],
                  "providerIds": [
                        "provider-aurum-skinworks"
                  ],
                  "serviceDefinitionIds": [
                        "svc-cyberware-diagnostic-standard",
                        "svc-cyberware-install-standard",
                        "svc-cyberware-deinstall-standard",
                        "svc-cyberware-replace-standard",
                        "svc-cyberware-repair-standard",
                        "svc-cyberware-calibrate-standard",
                        "svc-cyberware-clean-standard"
                  ],
                  "catalogItemIds": []
            },
            "benefitsByTierId": {
                  "aurum-surface": {
                        "calculation": "PERCENT_CAP",
                        "percent": 10,
                        "maxAmount": 500
                  },
                  "aurum-skinline": {
                        "calculation": "PERCENT_CAP",
                        "percent": 20,
                        "maxAmount": 1000
                  },
                  "aurum-groomed": {
                        "calculation": "PERCENT_CAP",
                        "percent": 30,
                        "maxAmount": 2000
                  },
                  "aurum-executive-form": {
                        "calculation": "PERCENT_CAP",
                        "percent": 45,
                        "maxAmount": 4000
                  },
                  "aurum-perfected-body": {
                        "calculation": "PERCENT_CAP",
                        "percent": 60,
                        "maxAmount": 7500
                  }
            },
            "active": true,
            "revision": 1,
            "metadata": {
                  "balanceStage": "BRIDGE_BASELINE"
            }
      }
],
    "tags": [
      "PRIVATE"
    ],
    "logo": "AUR",
    "summary": "Prywatna pielęgnacja, estetyka i utrzymanie ciała.",
    "description": "Prywatny pakiet pielęgnacji ciała, skóry, włosów i estetycznej zgodności biologicznej dla klientów premium.",
    "tiers": [
      {
        "tierId": "aurum-surface",
        "tierLevel": 1,
        "label": "T1 Surface",
        "amount": 800,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Podstawowa pielęgnacja skóry, włosów i widocznych objawów zużycia.",
        "entitlementCodes": [
          "AURUM_BODY_MAINTENANCE_ACCESS_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "aurum-skinline",
        "tierLevel": 2,
        "label": "T2 Skinline",
        "amount": 1800,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Stabilizacja skóry, mikroregeneracja i korekta efektów pracy w złych warunkach.",
        "entitlementCodes": [
          "AURUM_BODY_MAINTENANCE_ACCESS_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "aurum-groomed",
        "tierLevel": 3,
        "label": "T3 Groomed",
        "amount": 3200,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Regularna obsługa wyglądu, zapachu, włosów, skóry i prezentacji ciała.",
        "entitlementCodes": [
          "AURUM_BODY_MAINTENANCE_ACCESS_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "aurum-executive-form",
        "tierLevel": 4,
        "label": "T4 Executive Form",
        "amount": 5600,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Pielęgnacja pod funkcje reprezentacyjne, stres, status i zgodność z normą wysokiego profilu.",
        "entitlementCodes": [
          "AURUM_BODY_MAINTENANCE_ACCESS_T4"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "aurum-perfected-body",
        "tierLevel": 5,
        "label": "T5 Perfected Body",
        "amount": 9800,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Pełna prywatna obsługa estetyczna, biologiczna i regeneracyjna poza standardem systemowym.",
        "entitlementCodes": [
          "AURUM_BODY_MAINTENANCE_ACCESS_T5"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 2
  },
  {
    "subscriptionCatalogId": "sub-transit-pass",
    "providerId": "provider-metrogrid-access",
    "organizationId": "metrogrid-access",
    "productCode": "MTR-PASS",
    "title": "Transit Pass",
    "provider": "MetroGrid Access",
    "category": "TRANSPORT",
    "market": "SYSTEM",
    "domain": "TRANSPORT",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "METROGRID_TRANSIT_ACCESS"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [],
    "tags": [
      "SYSTEM"
    ],
    "logo": "MTR",
    "summary": "Systemowy dostęp do metra, bramek i tras pracy.",
    "description": "Systemowa subskrypcja transportu: bramki, metro, korytarze pracy i ograniczona mobilność między strefami.",
    "tiers": [
      {
        "tierId": "metrogrid-walklink",
        "tierLevel": 1,
        "label": "T1 Walklink",
        "amount": 120,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Podstawowa autoryzacja pieszych przejść kontrolnych i minimalnych bramek lokalnych.",
        "entitlementCodes": [
          "METROGRID_TRANSIT_ACCESS_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "metrogrid-zone-pass",
        "tierLevel": 2,
        "label": "T2 Zone Pass",
        "amount": 380,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Dostęp do wybranych linii w jednej strefie i standardowa kolejka bramkowa.",
        "entitlementCodes": [
          "METROGRID_TRANSIT_ACCESS_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "metrogrid-workline",
        "tierLevel": 3,
        "label": "T3 Workline",
        "amount": 750,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Trasy dom-praca, przesiadki robocze i stabilniejszy dostęp w godzinach zmian.",
        "entitlementCodes": [
          "METROGRID_TRANSIT_ACCESS_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "metrogrid-priority-gate",
        "tierLevel": 4,
        "label": "T4 Priority Gate",
        "amount": 1400,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Szybsze bramki, mniej kontroli manualnych i krótsze opóźnienia proceduralne.",
        "entitlementCodes": [
          "METROGRID_TRANSIT_ACCESS_T4"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "metrogrid-citywide-sync",
        "tierLevel": 5,
        "label": "T5 Citywide Sync",
        "amount": 2600,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Rozszerzona mobilność miejska, priorytet tras i lepsza zgodność z harmonogramem pracy.",
        "entitlementCodes": [
          "METROGRID_TRANSIT_ACCESS_T5"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 1
  },
  {
    "subscriptionCatalogId": "sub-priority-transit",
    "providerId": "provider-vector-cabline",
    "organizationId": "vector-cabline",
    "productCode": "VCL-PRIORITY",
    "title": "Priority Transit",
    "provider": "Vector Cabline",
    "category": "TRANSPORT",
    "market": "PRIVATE",
    "domain": "TRANSPORT",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "VECTOR_PRIORITY_TRANSIT_ACCESS"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [],
    "tags": [
      "PRIVATE"
    ],
    "logo": "VCL",
    "summary": "Prywatne przejazdy, trasy szybkie i kontrolowane transfery.",
    "description": "Prywatny transport na żądanie: kabiny, eskortowane trasy, szybkie przejazdy i ograniczone obejścia kolejek systemowych.",
    "tiers": [
      {
        "tierId": "vector-call-slot",
        "tierLevel": 1,
        "label": "T1 Call Slot",
        "amount": 900,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Rezerwowany slot przejazdu prywatnego z długim czasem oczekiwania.",
        "entitlementCodes": [
          "VECTOR_PRIORITY_TRANSIT_ACCESS_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "vector-secure-ride",
        "tierLevel": 2,
        "label": "T2 Secure Ride",
        "amount": 1900,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Bezpieczniejszy przejazd z monitoringiem trasy i podstawowym buforem opóźnień.",
        "entitlementCodes": [
          "VECTOR_PRIORITY_TRANSIT_ACCESS_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "vector-fast-lane",
        "tierLevel": 3,
        "label": "T3 Fast Lane",
        "amount": 3600,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Szybsze trasy, lepsze okna przejazdu i mniejsze ryzyko porzucenia zlecenia.",
        "entitlementCodes": [
          "VECTOR_PRIORITY_TRANSIT_ACCESS_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "vector-black-route",
        "tierLevel": 4,
        "label": "T4 Black Route",
        "amount": 7200,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Trasy prywatne, ograniczony ślad publiczny i priorytet w korkach proceduralnych.",
        "entitlementCodes": [
          "VECTOR_PRIORITY_TRANSIT_ACCESS_T4"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "vector-personal",
        "tierLevel": 5,
        "label": "T5 Personal Vector",
        "amount": 13500,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Stały prywatny kanał transportowy, dedykowane okna i obsługa wysokiego ryzyka.",
        "entitlementCodes": [
          "VECTOR_PRIORITY_TRANSIT_ACCESS_T5"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 1
  },
  {
    "subscriptionCatalogId": "sub-rest-compliance",
    "providerId": "provider-sleepstandard",
    "organizationId": "sleepstandard",
    "productCode": "SLP-REST",
    "title": "Rest Compliance",
    "provider": "SleepStandard",
    "category": "REST",
    "market": "SYSTEM",
    "domain": "REST",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "SLEEPSTANDARD_REST_ACCESS"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [],
    "tags": [
      "SYSTEM"
    ],
    "logo": "SLP",
    "summary": "Systemowe normy snu, odpoczynku i regeneracji roboczej.",
    "description": "Systemowa subskrypcja snu i odpoczynku. Utrzymuje minimalną zgodność biologiczną pracownika z normami wydajności.",
    "tiers": [
      {
        "tierId": "sleepstandard-cot",
        "tierLevel": 1,
        "label": "T1 Cot",
        "amount": 220,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Dostęp do podstawowego miejsca odpoczynku i minimalnego slotu snu.",
        "entitlementCodes": [
          "SLEEPSTANDARD_REST_ACCESS_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "sleepstandard-quiet-slot",
        "tierLevel": 2,
        "label": "T2 Quiet Slot",
        "amount": 500,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Cichszy slot odpoczynku, ograniczona izolacja bodźców i prosty monitoring snu.",
        "entitlementCodes": [
          "SLEEPSTANDARD_REST_ACCESS_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "sleepstandard-regulated",
        "tierLevel": 3,
        "label": "T3 Regulated Sleep",
        "amount": 950,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Kontrola długości snu, harmonogram regeneracji i podstawowa redukcja zakłóceń.",
        "entitlementCodes": [
          "SLEEPSTANDARD_REST_ACCESS_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "sleepstandard-recovery",
        "tierLevel": 4,
        "label": "T4 Recovery Block",
        "amount": 1700,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Lepsza izolacja, stabilizacja rytmu i priorytet po zmianach wysokiego obciążenia.",
        "entitlementCodes": [
          "SLEEPSTANDARD_REST_ACCESS_T4"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "sleepstandard-compliance",
        "tierLevel": 5,
        "label": "T5 Compliance Suite",
        "amount": 3000,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Zaawansowany systemowy pakiet odpoczynku zgodny z profilem pracy i wymogami biologicznymi.",
        "entitlementCodes": [
          "SLEEPSTANDARD_REST_ACCESS_T5"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 1
  },
  {
    "subscriptionCatalogId": "sub-deep-rest-plan",
    "providerId": "provider-somnacore",
    "organizationId": "somnacore",
    "productCode": "SOM-DEEP-REST",
    "title": "Deep Rest Plan",
    "provider": "SomnaCore",
    "category": "REST",
    "market": "PRIVATE",
    "domain": "REST",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "SOMNACORE_REST_ACCESS"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [],
    "tags": [
      "PRIVATE"
    ],
    "logo": "SOM",
    "summary": "Prywatna neuroregeneracja i głęboki sen premium.",
    "description": "Prywatna usługa snu, neurociszy i regeneracji. Sprzedaje odpoczynek jako płatną wydajność ciała i układu nerwowego.",
    "tiers": [
      {
        "tierId": "somna-calm-dose",
        "tierLevel": 1,
        "label": "T1 Calm Dose",
        "amount": 1100,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Podstawowe wyciszenie, redukcja bodźców i wsparcie zasypiania.",
        "entitlementCodes": [
          "SOMNACORE_REST_ACCESS_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "somna-sleep-sync",
        "tierLevel": 2,
        "label": "T2 Sleep Sync",
        "amount": 2300,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Synchronizacja rytmu snu, czystsze wybudzanie i monitoring zmienności stresu.",
        "entitlementCodes": [
          "SOMNACORE_REST_ACCESS_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "somna-neural-quiet",
        "tierLevel": 3,
        "label": "T3 Neural Quiet",
        "amount": 4400,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Głębsza redukcja szumu poznawczego i regeneracja po przeciążeniu informacyjnym.",
        "entitlementCodes": [
          "SOMNACORE_REST_ACCESS_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "somna-regeneration-pod",
        "tierLevel": 4,
        "label": "T4 Regeneration Pod",
        "amount": 8500,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Kapsuła regeneracyjna, kontrolowana temperatura, tlen i wsparcie hormonalne.",
        "entitlementCodes": [
          "SOMNACORE_REST_ACCESS_T4"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "somna-deep-reset",
        "tierLevel": 5,
        "label": "T5 Deep Reset",
        "amount": 16000,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Pełny prywatny reset snu, stresu i wybranych markerów neurologicznych.",
        "entitlementCodes": [
          "SOMNACORE_REST_ACCESS_T5"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 1
  },
  {
    "subscriptionCatalogId": "sub-skill-channel",
    "providerId": "provider-learnmin-access",
    "organizationId": "learnmin-access",
    "productCode": "LRN-SKILL",
    "title": "Skill Channel",
    "provider": "LearnMin Access",
    "category": "EDUCATION",
    "market": "SYSTEM",
    "domain": "EDUCATION",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "LEARNMIN_EDUCATION_ACCESS"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [],
    "tags": [
      "SYSTEM"
    ],
    "logo": "LRN",
    "summary": "Systemowe kursy, szkolenia i certyfikacje zawodowe.",
    "description": "Systemowy kanał edukacyjny: szkolenia zawodowe, certyfikacje i dostęp do materiałów zależny od przydatności profilu.",
    "tiers": [
      {
        "tierId": "learnmin-public-feed",
        "tierLevel": 1,
        "label": "T1 Public Feed",
        "amount": 260,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Publiczne materiały edukacyjne, powtórki i podstawowe testy zgodności.",
        "entitlementCodes": [
          "LEARNMIN_EDUCATION_ACCESS_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "learnmin-work-skill",
        "tierLevel": 2,
        "label": "T2 Work Skill",
        "amount": 700,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Kursy robocze powiązane z aktualnym profilem zatrudnienia.",
        "entitlementCodes": [
          "LEARNMIN_EDUCATION_ACCESS_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "learnmin-cert-track",
        "tierLevel": 3,
        "label": "T3 Certification Track",
        "amount": 1500,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Ścieżki certyfikacyjne, egzaminy i potwierdzenia kompetencji zawodowych.",
        "entitlementCodes": [
          "LEARNMIN_EDUCATION_ACCESS_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "learnmin-priority-exam",
        "tierLevel": 4,
        "label": "T4 Priority Exam",
        "amount": 2900,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Priorytetowe terminy egzaminów, szybsza weryfikacja i lepszy dostęp do materiałów.",
        "entitlementCodes": [
          "LEARNMIN_EDUCATION_ACCESS_T4"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "learnmin-function-ladder",
        "tierLevel": 5,
        "label": "T5 Function Ladder",
        "amount": 5200,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Systemowy program podnoszenia funkcji, awansu użytkowego i korekty profilu pracy.",
        "entitlementCodes": [
          "LEARNMIN_EDUCATION_ACCESS_T5"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 1
  },
  {
    "subscriptionCatalogId": "sub-executive-learning",
    "providerId": "provider-cortex-ladder",
    "organizationId": "cortex-ladder",
    "productCode": "CTX-LEARNING",
    "title": "Executive Learning",
    "provider": "Cortex Ladder",
    "category": "EDUCATION",
    "market": "PRIVATE",
    "domain": "EDUCATION",
    "billingCycle": "WEEKLY",
    "currency": "CREDIT",
    "entitlementCodes": [
      "CORTEX_LEARNING_ACCESS"
    ],
    "targetPolicy": {
      "allowedTargetTypes": [
        "CITIZEN"
      ],
      "defaultTargetType": "CITIZEN",
      "maximumTargets": 1
    },
    "coverageRules": [],
    "tags": [
      "PRIVATE"
    ],
    "logo": "CTX",
    "summary": "Prywatne przyspieszone uczenie i coaching kompetencyjny.",
    "description": "Prywatny pakiet nauki, tutorów i przyspieszonych ścieżek kompetencyjnych dla klientów korporacyjnych i wysokiego profilu.",
    "tiers": [
      {
        "tierId": "cortex-briefing",
        "tierLevel": 1,
        "label": "T1 Briefing",
        "amount": 1400,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Krótkie prywatne briefingi, streszczenia i selekcja materiałów.",
        "entitlementCodes": [
          "CORTEX_LEARNING_ACCESS_T1"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "cortex-tutor-feed",
        "tierLevel": 2,
        "label": "T2 Tutor Feed",
        "amount": 3200,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Tutor prywatny, feedback i dopasowanie materiałów do stylu pracy.",
        "entitlementCodes": [
          "CORTEX_LEARNING_ACCESS_T2"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "cortex-skill-sprint",
        "tierLevel": 3,
        "label": "T3 Skill Sprint",
        "amount": 6200,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Intensywny sprint kompetencyjny z testami, feedbackiem i szybkim zamknięciem luk.",
        "entitlementCodes": [
          "CORTEX_LEARNING_ACCESS_T3"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "cortex-executive-track",
        "tierLevel": 4,
        "label": "T4 Executive Track",
        "amount": 12000,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Ścieżka wysokiego profilu: negocjacje, procedury, przywództwo i dostęp do zamkniętych materiałów.",
        "entitlementCodes": [
          "CORTEX_LEARNING_ACCESS_T4"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      },
      {
        "tierId": "cortex-cognitive-ladder",
        "tierLevel": 5,
        "label": "T5 Cognitive Ladder",
        "amount": 22000,
        "billingCycle": "WEEKLY",
        "durationDays": 7,
        "description": "Najwyższy prywatny program rozwoju poznawczego, tutorzy premium i stała korekta wyników.",
        "entitlementCodes": [
          "CORTEX_LEARNING_ACCESS_T5"
        ],
        "coverageRuleIds": [],
        "active": true,
        "revision": 1
      }
    ],
    "active": true,
    "revision": 1
  }
];


  const subscriptionPresentationById = {
    "sub-live-prevail": {
      overview: "Systemowa opieka zdrowotna utrzymująca podstawową przeżywalność, sprawność roboczą i dostęp do wyższych procedur medycznych.",
      benefits: [
        "Dostęp do systemowej opieki zdrowotnej.",
        "Trzy poziomy ochrony: Live, Sustain i Prevail.",
        "Wyższe tiery rozszerzają interwencje, priorytet oraz procedury kliniczne."
      ],
      limitations: ["Płatni specjaliści pozostają częścią T1 i T2.", "Pełny zakres interwencji i biochip występuje dopiero w T3."],
      usageNotes: ["Pakiet jest przypisany do Citizen.", "Zakres świadczeń należy odczytywać z aktywnego tieru."]
    },
    "sub-trauma-team": {
      overview: "Prywatny kontrakt ratunkowo-kliniczny obejmujący interwencje, stabilizację, biomonitoring, przeszczepy i procedury premium.",
      benefits: [
        "Prywatna odpowiedź ratunkowa i opieka kliniczna.",
        "Rosnąca liczba interwencji oraz procedur biochipowych.",
        "Najwyższe tiery obejmują biomonitoring, wymianę wszczepów i klonowanie organów."
      ],
      limitations: ["Liczba i tryb interwencji zależą od tieru.", "Brak dopłat jest zapisany wyłącznie dla T5."],
      usageNotes: ["Kontrakt obejmuje jednego Citizen.", "Przed zakupem należy porównać manualną i biochipową aktywację interwencji."]
    },
    "sub-kagami-sentinel": {
      overview: "Prywatna ochrona sieciowa neurochipów, portów, implantów i sesji lokalnego ruchu danych.",
      benefits: [
        "Filtrowanie prób przejęcia i rejestrowanie incydentów.",
        "Izolacja podejrzanych pakietów oraz reset kanałów.",
        "Wyższy tier udostępnia aktywne odbicie ataku i support Kagami."
      ],
      limitations: ["Zakres może być przypisany do Citizen albo jednego kwalifikującego się ItemInstance.", "Ochrona firmware pojawia się od Torii Gate."],
      usageNotes: ["Dla targetu ITEM_INSTANCE kontrakt pozostaje związany z dokładną instancją.", "Utrata kwalifikacji targetu może zablokować entitlement bez usuwania kontraktu."]
    },
    "sub-ws-network-fee": {
      overview: "Systemowa opłata za lokalny routing, weryfikację dostępu i przechowywanie śladu sesji.",
      benefits: [
        "Utrzymanie wpisu dostępowego i routingu lokalnego.",
        "Wyższe tiery skracają procedury oraz przyspieszają odświeżanie uprawnień."
      ],
      limitations: ["Kontrakt dotyczy jednego Citizen.", "Zakres obejmuje routing i weryfikację zgodnie z wybranym tierem."],
      usageNotes: ["Priorytet przetwarzania rośnie wraz z tierem."]
    },
    "sub-ws-liveguard": {
      overview: "Systemowa ochrona mieszkania, dóbr i ciała przeznaczona dla profilu ALPHA oraz zatwierdzonych wyjątków.",
      benefits: [
        "Monitoring i reakcja patrolu dla mieszkania.",
        "Rozszerzenie ochrony na dobra, transport i osobistą eskortę.",
        "Najwyższy tier zapewnia priorytetowe przejęcie strefy."
      ],
      limitations: ["Dostęp wymaga profilu ALPHA albo uprawnionego wyjątku systemowego.", "Kontrakt obejmuje jednego Citizen."],
      usageNotes: ["Profil dostępności jest sprawdzany przed zakupem."]
    },
    "sub-coremed-service": {
      overview: "Cykliczny prywatny serwis implantów, sensorów, portów i neurochipów.",
      benefits: [
        "Diagnostyka i utrzymanie zgodności cyberware.",
        "Wyższe tiery dodają wsparcie terenowe, firmware i priorytet serwisowy."
      ],
      limitations: ["Kontrakt może obejmować Citizen albo jedną kwalifikującą się instancję cyberware.", "Dostęp do firmware zaczyna się od Field Support."],
      usageNotes: ["Target ITEM_INSTANCE musi pozostać własnością Citizen i zachować kwalifikację katalogową."]
    },
    "sub-habitat-ledger": {
      overview: "Systemowy najem komórki mieszkalnej wraz z mediami, odpadami i administracyjnym utrzymaniem adresu.",
      benefits: [
        "Aktywny wpis adresowy i dostęp do jednostki mieszkalnej.",
        "Wyższe tiery zwiększają standard infrastruktury i stabilność najmu."
      ],
      limitations: ["Model katalogowy nie przewiduje prywatnej własności nieruchomości.", "Kontrakt obejmuje jednego Citizen."],
      usageNotes: ["Tier określa standard jednostki i poziom zabezpieczenia najmu."]
    },
    "sub-afterlife-ledger": {
      overview: "Prywatne procedury pośmiertne obejmujące rejestrację zgonu, spalanie, ekstrakcję organów i odzysk cyberware.",
      benefits: [
        "Zamknięcie podstawowej dokumentacji pośmiertnej.",
        "Wyższe tiery rozszerzają odzysk organów, cyberware i wpisów serwisowych."
      ],
      limitations: ["Zakres procedury zależy od wybranego tieru.", "Kontrakt jest przypisany do jednego Citizen."],
      usageNotes: ["Pakiet określa procedurę wykonywaną po śmierci Citizen."]
    },
    "sub-mass-compression-service": {
      overview: "Serwis software, kalibracji i synchronizacji wymagany do aktywnego działania capacity modules.",
      benefits: [
        "Utrzymanie działania kwalifikującej się kostki Mass Compression.",
        "Wyższe tiery zwiększają obsługiwany poziom modułu i liczbę rzędów equipment layoutu.",
        "Firmware i priorytetowa diagnostyka pojawiają się w wyższych pakietach."
      ],
      limitations: ["Bez aktywnego pokrycia kostka pozostaje przedmiotem, ale nie dodaje rzędów layoutu.", "Kontrakt ITEM_INSTANCE obejmuje jedną kwalifikującą się kostkę."],
      usageNotes: ["Tier kontraktu musi odpowiadać klasie używanego capacity module.", "Przeniesienie lub utylizacja targetu może unieważnić entitlement."]
    },
    "sub-common-lease": {
      overview: "Systemowy wynajem pojazdów, komórek magazynowych, szafek narzędziowych i usług pomocniczych.",
      benefits: [
        "Dostęp do podstawowych zasobów pomocniczych bez zakupu własności.",
        "Wyższe tiery rozszerzają rodzaj i priorytet wynajmowanego zasobu."
      ],
      limitations: ["Kontrakt może zostać przypisany do Citizen albo jednej kwalifikującej się instancji.", "Dokładny zasób wynika z tieru i targetu."],
      usageNotes: ["Dla ITEM_INSTANCE entitlement pozostaje związany z dokładnym wynajmowanym zasobem."]
    },
    "sub-civic-meal-line": {
      overview: "Systemowa linia żywieniowa zapewniająca kalorie, racje, tacki i priorytet dostaw zależnie od tieru.",
      benefits: [
        "Regularny dostęp do żywności systemowej.",
        "Wyższe tiery poprawiają różnorodność, makro i priorytet wydania."
      ],
      limitations: ["Zakres i częstotliwość dostaw wynikają z opisu tieru.", "Kontrakt obejmuje jednego Citizen."],
      usageNotes: ["Pakiet żywieniowy jest rozliczany w cyklu tygodniowym."]
    },
    "sub-helix-table-nutrition": {
      overview: "Prywatny catering i dieta profilowana biologicznie pod stabilność, nastrój i wydajność ciała.",
      benefits: [
        "Prywatne posiłki o rosnącym poziomie personalizacji.",
        "Wyższe tiery dodają monitoring reakcji organizmu i planowanie biologiczne."
      ],
      limitations: ["Personalizacja i monitoring zależą od tieru.", "Kontrakt obejmuje jednego Citizen."],
      usageNotes: ["Najwyższe pakiety należy porównywać pod kątem zakresu monitoringu i personalizacji."]
    },
    "sub-hygiene-cycle": {
      overview: "Systemowa higiena obejmująca środki czystości, pranie, sanityzację i dekontaminację.",
      benefits: [
        "Dostęp do punktów mycia i podstawowych środków higieny.",
        "Wyższe tiery rozszerzają pranie, dezynfekcję i procedury po ekspozycji."
      ],
      limitations: ["Priorytet sanitarny i dekontaminacja są dostępne dopiero w wyższych tierach.", "Kontrakt obejmuje jednego Citizen."],
      usageNotes: ["Tier określa dostępne punkty, pakiety i szybkość obsługi."]
    },
    "sub-body-maintenance": {
      overview: "Prywatna pielęgnacja skóry, włosów, wyglądu i biologicznej prezentacji ciała.",
      benefits: [
        "Regularna pielęgnacja i korekta widocznych efektów zużycia.",
        "Wyższe tiery rozszerzają mikroregenerację, prezentację i obsługę premium."
      ],
      limitations: ["Zakres biologiczny i regeneracyjny zależy od tieru.", "Kontrakt obejmuje jednego Citizen."],
      usageNotes: ["Pakiet dotyczy utrzymania estetycznego i biologicznego ciała."]
    },
    "sub-transit-pass": {
      overview: "Systemowy dostęp do bramek, metra, tras pracy i mobilności między strefami.",
      benefits: [
        "Autoryzacja przejść i linii transportu systemowego.",
        "Wyższe tiery poprawiają zasięg, priorytet bramek i zgodność z harmonogramem pracy."
      ],
      limitations: ["Zasięg tras oraz stref zależy od tieru.", "Kontrakt obejmuje jednego Citizen."],
      usageNotes: ["Pakiet powinien odpowiadać codziennej trasie i wymaganym strefom."]
    },
    "sub-priority-transit": {
      overview: "Prywatny transport na żądanie obejmujący rezerwowane kabiny, szybkie trasy i kontrolowane transfery.",
      benefits: [
        "Rezerwowane przejazdy poza standardową kolejką systemową.",
        "Wyższe tiery zwiększają bezpieczeństwo, szybkość i dostępność kanału transportowego."
      ],
      limitations: ["Czas oczekiwania, ślad publiczny i priorytet zależą od tieru.", "Kontrakt obejmuje jednego Citizen."],
      usageNotes: ["Pakiet nie zmienia targetu; wszystkie przejazdy są przypisane do aktywnego Citizen."]
    },
    "sub-rest-compliance": {
      overview: "Systemowy dostęp do snu i odpoczynku utrzymujący zgodność biologiczną z profilem pracy.",
      benefits: [
        "Dostęp do miejsca odpoczynku i podstawowego slotu snu.",
        "Wyższe tiery zwiększają izolację, monitoring i priorytet regeneracji."
      ],
      limitations: ["Standard odpoczynku oraz monitoring zależą od tieru.", "Kontrakt obejmuje jednego Citizen."],
      usageNotes: ["Pakiet jest powiązany z normami pracy i regeneracji Citizen."]
    },
    "sub-deep-rest-plan": {
      overview: "Prywatna usługa neurociszy, głębokiego snu i regeneracji układu nerwowego.",
      benefits: [
        "Redukcja bodźców i wsparcie zasypiania.",
        "Wyższe tiery dodają synchronizację snu, kapsułę regeneracyjną i głęboki reset."
      ],
      limitations: ["Zakres monitoringu i procedur fizjologicznych zależy od tieru.", "Kontrakt obejmuje jednego Citizen."],
      usageNotes: ["Pakiety należy porównać pod kątem regeneracji neurologicznej i używanej infrastruktury."]
    },
    "sub-skill-channel": {
      overview: "Systemowy kanał kursów, certyfikacji i materiałów zawodowych zależny od przydatności profilu.",
      benefits: [
        "Dostęp do materiałów i testów systemowych.",
        "Wyższe tiery dodają kursy robocze, egzaminy, certyfikacje i ścieżkę funkcji."
      ],
      limitations: ["Zakres materiałów pozostaje zależny od profilu i wybranego tieru.", "Kontrakt obejmuje jednego Citizen."],
      usageNotes: ["Pakiet powinien odpowiadać wymaganej ścieżce kompetencji lub certyfikacji."]
    },
    "sub-executive-learning": {
      overview: "Prywatne przyspieszone uczenie, tutorzy i coaching kompetencyjny dla klientów korporacyjnych i wysokiego profilu.",
      benefits: [
        "Selekcja materiałów i prywatny feedback.",
        "Wyższe tiery dodają intensywne sprinty, ścieżki executive i stałą korektę wyników."
      ],
      limitations: ["Zakres tutorów, materiałów zamkniętych i korekty zależy od tieru.", "Kontrakt obejmuje jednego Citizen."],
      usageNotes: ["Pakiety należy porównać pod kątem intensywności, dostępu i czasu pracy tutora."]
    }
  };

  function uniquePresentationText(items = []) {
    return Array.from(new Set((Array.isArray(items) ? items : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)));
  }

  function splitTierPresentationFeatures(description = "") {
    const normalized = String(description || "")
      .trim()
      .replace(/^T\d+\s*\+\s*/i, "")
      .replace(/\.$/, "");
    if (!normalized) return [];
    return uniquePresentationText(normalized
      .split(/\s*;\s*|\s*,\s*/g)
      .map((fragment) => fragment.trim())
      .filter(Boolean));
  }

  function extractTierPresentationLimits(description = "") {
    const source = String(description || "");
    const patterns = [
      /\b(?:jedna|1)\s+interwencja[^,.]*/i,
      /\b1\s+raz\s+w\s+miesiącu\b/i,
      /\bdo\s+\+?\d+\s+rzędów[^,.]*/i,
      /\bniski\s+priorytet\b/i,
      /\bdługi\s+czas\s+oczekiwania\b/i,
      /\bograniczon(?:y|a|e|ą)[^,.]*/i,
      /\bwyłącznie[^,.]*/i,
      /\bminimaln(?:y|a|e|ą)[^,.]*/i
    ];
    return uniquePresentationText(patterns
      .map((pattern) => source.match(pattern)?.[0] || "")
      .filter(Boolean)
      .map((value) => value.charAt(0).toUpperCase() + value.slice(1)));
  }

  function inferTierPriorityLabel(tier = {}, description = "") {
    const source = `${tier.label || ""} ${description || ""}`.toLowerCase();
    if (/najwyższ|personal vector|cognitive ladder|perfected|deep reset|citywide|compliance suite/.test(source)) return "HIGHEST";
    if (/priorytet|priority|executive|corporate|restricted|fast lane|recovery|regeneration/.test(source)) return "PRIORITY";
    if (/standard|stable|sustain|regulated|licensed|groomed|workline|certification/.test(source)) return "STANDARD";
    if (/basic|live\b|minimal|public|cot\b|surface|walklink|token|briefing/.test(source)) return "BASE";
    return `LEVEL ${Number(tier.tierLevel || 0) || 1}`;
  }

  subscriptions.forEach((subscription) => {
    const custom = subscriptionPresentationById[subscription.subscriptionCatalogId] || {};
    const policy = subscription.targetPolicy || {};
    const allowedTargets = Array.isArray(policy.allowedTargetTypes) && policy.allowedTargetTypes.length
      ? policy.allowedTargetTypes.join(" / ")
      : "CITIZEN";
    const genericLimitations = [
      `Dozwolone targety: ${allowedTargets}.`,
      `Maksymalna liczba targetów kontraktu: ${Number(policy.maximumTargets || 1)}.`
    ];
    const genericUsageNotes = [
      `Cykl rozliczeniowy: ${subscription.billingCycle || "WEEKLY"}.`,
      "Aktywny zakres wynika z wybranego tieru, ważnego targetu i stanu entitlementu."
    ];
    if ((policy.allowedTargetTypes || []).includes("ITEM_INSTANCE")) {
      genericUsageNotes.push("Kontrakt przypisany do ItemInstance pozostaje związany z dokładnym instanceId.");
    }

    subscription.presentation = {
      overview: String(custom.overview || subscription.description || subscription.summary || "").trim(),
      benefits: uniquePresentationText(custom.benefits || [subscription.summary]),
      limitations: uniquePresentationText([...(custom.limitations || []), ...genericLimitations]),
      usageNotes: uniquePresentationText([...(custom.usageNotes || []), ...genericUsageNotes]),
      comparisonAxes: ["INCLUDED SCOPE", "LIMITS", "PRIORITY", "TARGET", "PRICE / ACTION"]
    };

    subscription.tiers = (subscription.tiers || []).map((tier) => {
      const features = splitTierPresentationFeatures(tier.description);
      const limits = extractTierPresentationLimits(tier.description);
      const priorityLabel = inferTierPriorityLabel(tier, tier.description);
      return {
        ...tier,
        presentation: {
          features: features.length ? features : [tier.description || tier.label || "Tier scope"],
          limits,
          priorityLabel,
          comparisonValues: {
            scope: features[0] || tier.description || tier.label || "Tier scope",
            access: features.slice(1).join(" / ") || "Zakres podstawowy opisany przez tier.",
            limit: limits.join(" / ") || "Brak dodatkowego jawnego limitu w opisie tieru.",
            priority: priorityLabel
          }
        }
      };
    });
  });

  window.APP_DATA.subscriptionCatalog = {
    schemaVersion: "subscription_catalog_asset_targets_3_0x",
    categories,
    providers,
    subscriptions
  };

  window.APP_DATA.subscriptionCatalogDefinitions = {
    schemaVersion: "subscription_catalog_asset_targets_3_0x",
    subscriptions
  };
})();
