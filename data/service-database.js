window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.serviceDatabase = {
  "version": "2.7.3",
  "scope": "service_market",
  "status": "service_subscription_contract_identity_ready",
  "serviceCategories": [
    {
      "id": "SECURITY",
      "label": "Security",
      "parentCategory": "",
      "description": "Physical and civic security, protection, escorts, and public-order support.",
      "defaultProfiles": [
        "ALPHA",
        "BETA",
        "GAMMA"
      ],
      "defaultAbilityWeights": [
        "ability-reflex",
        "ability-composure",
        "ability-strength"
      ]
    },
    {
      "id": "NETWORK_SECURITY",
      "label": "Network Security",
      "parentCategory": "SECURITY",
      "description": "Endpoint protection, access routing, intrusion trace, packet quarantine and safe-network diagnostics.",
      "defaultProfiles": [
        "ALPHA",
        "BETA"
      ],
      "defaultAbilityWeights": [
        "ability-intellect",
        "ability-perception",
        "ability-reflex"
      ]
    },
    {
      "id": "ADMINISTRATION",
      "label": "Administration",
      "parentCategory": "",
      "description": "Registry correction, form processing, ledger review, civic desk routing and procedural control.",
      "defaultProfiles": [
        "ALPHA",
        "BETA"
      ],
      "defaultAbilityWeights": [
        "ability-intellect",
        "ability-composure",
        "ability-charisma"
      ]
    },
    {
      "id": "BIOMEDICAL",
      "label": "Biomedical",
      "parentCategory": "",
      "description": "Clinical assistance, biomonitoring, tissue handling, implant support and body-maintenance work.",
      "defaultProfiles": [
        "ALPHA",
        "BETA"
      ],
      "defaultAbilityWeights": [
        "ability-intellect",
        "ability-dexterity",
        "ability-perception"
      ]
    },
    {
      "id": "INDUSTRIAL",
      "label": "Industrial",
      "parentCategory": "",
      "description": "Factory work, repair shifts, line maintenance, machine handling and technical infrastructure support.",
      "defaultProfiles": [
        "BETA",
        "GAMMA"
      ],
      "defaultAbilityWeights": [
        "ability-strength",
        "ability-endurance",
        "ability-dexterity"
      ]
    },
    {
      "id": "TRANSPORT",
      "label": "Transport",
      "parentCategory": "LOGISTICS",
      "description": "Metro, cargo, dispatch, platform handling and local route-control services.",
      "defaultProfiles": [
        "BETA",
        "GAMMA"
      ],
      "defaultAbilityWeights": [
        "ability-reflex",
        "ability-perception",
        "ability-dexterity"
      ]
    },
    {
      "id": "WASTE_PROCESSING",
      "label": "Waste Processing",
      "parentCategory": "INDUSTRIAL",
      "description": "Sorting, disposal, toxic handling, biowaste and lower-zone sanitation work.",
      "defaultProfiles": [
        "GAMMA",
        "BETA"
      ],
      "defaultAbilityWeights": [
        "ability-endurance",
        "ability-strength",
        "ability-composure"
      ]
    },
    {
      "id": "DATA_PROCESSING",
      "label": "Data Processing",
      "parentCategory": "ADMINISTRATION",
      "description": "Data cleaning, indexing, safe archive preparation and registry harmonization.",
      "defaultProfiles": [
        "ALPHA",
        "BETA",
        "GAMMA"
      ],
      "defaultAbilityWeights": [
        "ability-intellect",
        "ability-perception",
        "ability-dexterity"
      ]
    },
    {
      "id": "SOCIAL_SYNCHRONIZATION",
      "label": "Social Synchronization",
      "parentCategory": "ADMINISTRATION",
      "description": "Mood sampling, civic alignment, queue behavior reporting and synchronized public feedback work.",
      "defaultProfiles": [
        "ALPHA",
        "BETA"
      ],
      "defaultAbilityWeights": [
        "ability-charisma",
        "ability-composure",
        "ability-perception"
      ]
    },
    {
      "id": "SURVEILLANCE",
      "label": "Surveillance",
      "parentCategory": "SECURITY",
      "description": "Observation, W&S auxiliary monitoring, camera review and incident tagging.",
      "defaultProfiles": [
        "ALPHA",
        "BETA",
        "GAMMA"
      ],
      "defaultAbilityWeights": [
        "ability-perception",
        "ability-reflex",
        "ability-intellect"
      ]
    },
    {
      "id": "FIELD_OPERATIONS",
      "label": "Field Operations",
      "parentCategory": "SECURITY",
      "description": "Exterior work, site escort, hazard approach, dispatch support and intervention logistics.",
      "defaultProfiles": [
        "BETA",
        "GAMMA"
      ],
      "defaultAbilityWeights": [
        "ability-reflex",
        "ability-endurance",
        "ability-strength"
      ]
    },
    {
      "id": "MAINTENANCE",
      "label": "Maintenance",
      "parentCategory": "INDUSTRIAL",
      "description": "Habitat, utility, factory, cable, sensor and device maintenance.",
      "defaultProfiles": [
        "BETA",
        "GAMMA"
      ],
      "defaultAbilityWeights": [
        "ability-dexterity",
        "ability-intellect",
        "ability-endurance"
      ]
    },
    {
      "id": "LOGISTICS",
      "label": "Logistics",
      "parentCategory": "",
      "description": "Supply routing, warehouse flow, ration movement, service transfer and cargo handling.",
      "defaultProfiles": [
        "BETA",
        "GAMMA"
      ],
      "defaultAbilityWeights": [
        "ability-intellect",
        "ability-dexterity",
        "ability-perception"
      ]
    },
    {
      "id": "BLACK_MARKET",
      "label": "Black Market",
      "parentCategory": "",
      "description": "Off-record work, courier activity, illegal procurement and unsynchronized contracts.",
      "defaultProfiles": [
        "BETA",
        "GAMMA",
        "NONE"
      ],
      "defaultAbilityWeights": [
        "ability-reflex",
        "ability-charisma",
        "ability-composure"
      ]
    },
    {
      "id": "DOMESTIC_SERVICE",
      "label": "Domestic Service",
      "parentCategory": "",
      "description": "Household support, elite unit maintenance, low-clearance care, cleaning and personal logistics.",
      "defaultProfiles": [
        "GAMMA",
        "BETA"
      ],
      "defaultAbilityWeights": [
        "ability-composure",
        "ability-dexterity",
        "ability-charisma"
      ]
    },
    {
      "id": "PROPAGANDA_MEDIA",
      "label": "Propaganda Media",
      "parentCategory": "ADMINISTRATION",
      "description": "Script support, approved broadcast labor, visual registry, statement relay and mood-facing content.",
      "defaultProfiles": [
        "ALPHA",
        "BETA"
      ],
      "defaultAbilityWeights": [
        "ability-charisma",
        "ability-intellect",
        "ability-composure"
      ]
    },
    {
      "id": "RESEARCH_ASSISTANCE",
      "label": "Research Assistance",
      "parentCategory": "BIOMEDICAL",
      "description": "Lab support, sample preparation, restricted testing and approved observation roles.",
      "defaultProfiles": [
        "ALPHA",
        "BETA"
      ],
      "defaultAbilityWeights": [
        "ability-intellect",
        "ability-perception",
        "ability-dexterity"
      ]
    },
    {
      "id": "CITIZEN_CARE",
      "label": "Citizen Care",
      "parentCategory": "BIOMEDICAL",
      "description": "Care desk service, patient handling, L&P support and basic stabilisation workflow.",
      "defaultProfiles": [
        "BETA",
        "GAMMA"
      ],
      "defaultAbilityWeights": [
        "ability-composure",
        "ability-charisma",
        "ability-perception"
      ]
    },
    {
      "id": "SUBSCRIPTION_SALES",
      "label": "Subscription Sales",
      "parentCategory": "ADMINISTRATION",
      "description": "Subscription recovery, tier upsell, debt-linked service routing and citizen access conversion.",
      "defaultProfiles": [
        "ALPHA",
        "BETA",
        "GAMMA"
      ],
      "defaultAbilityWeights": [
        "ability-charisma",
        "ability-intellect",
        "ability-composure"
      ]
    }
  ],
  "serviceWorkCharacters": [
    {
      "id": "ENDPOINT_AUDIT",
      "categoryId": "NETWORK_SECURITY",
      "label": "Endpoint Audit",
      "defaultLevel": 3,
      "tags": [
        "network",
        "audit",
        "endpoint"
      ]
    },
    {
      "id": "INTRUSION_TRACE",
      "categoryId": "NETWORK_SECURITY",
      "label": "Intrusion Trace",
      "defaultLevel": 4,
      "tags": [
        "network",
        "trace",
        "security"
      ]
    },
    {
      "id": "FIREWALL_CALIBRATION",
      "categoryId": "NETWORK_SECURITY",
      "label": "Firewall Calibration",
      "defaultLevel": 3,
      "tags": [
        "network",
        "firewall"
      ]
    },
    {
      "id": "PACKET_QUARANTINE",
      "categoryId": "NETWORK_SECURITY",
      "label": "Packet Quarantine",
      "defaultLevel": 4,
      "tags": [
        "network",
        "quarantine"
      ]
    },
    {
      "id": "BLACKWALL_DIAGNOSTIC",
      "categoryId": "NETWORK_SECURITY",
      "label": "Blackwall-adjacent Diagnostic",
      "defaultLevel": 5,
      "tags": [
        "network",
        "blackwall",
        "restricted"
      ]
    },
    {
      "id": "FORM_CORRECTION",
      "categoryId": "ADMINISTRATION",
      "label": "Form Correction",
      "defaultLevel": 2,
      "tags": [
        "forms",
        "registry"
      ]
    },
    {
      "id": "REGISTRY_REVIEW",
      "categoryId": "ADMINISTRATION",
      "label": "Registry Review",
      "defaultLevel": 2,
      "tags": [
        "registry",
        "review"
      ]
    },
    {
      "id": "LEDGER_CLEANUP",
      "categoryId": "ADMINISTRATION",
      "label": "Ledger Cleanup",
      "defaultLevel": 2,
      "tags": [
        "ledger",
        "credits"
      ]
    },
    {
      "id": "ACCESS_DESK_SHIFT",
      "categoryId": "ADMINISTRATION",
      "label": "Access Desk Shift",
      "defaultLevel": 1,
      "tags": [
        "desk",
        "access"
      ]
    },
    {
      "id": "CIVIC_QUEUE_AUDIT",
      "categoryId": "ADMINISTRATION",
      "label": "Civic Queue Audit",
      "defaultLevel": 1,
      "tags": [
        "queue",
        "civic"
      ]
    },
    {
      "id": "BIOMETRIC_SAMPLE_PREP",
      "categoryId": "BIOMEDICAL",
      "label": "Biometric Sample Prep",
      "defaultLevel": 3,
      "tags": [
        "bio",
        "sample"
      ]
    },
    {
      "id": "IMPLANT_SERVICE_ASSIST",
      "categoryId": "BIOMEDICAL",
      "label": "Implant Service Assist",
      "defaultLevel": 3,
      "tags": [
        "implant",
        "clinic"
      ]
    },
    {
      "id": "TRAUMA_STABILIZATION_AUX",
      "categoryId": "BIOMEDICAL",
      "label": "TRAUMA Stabilization Auxiliary",
      "defaultLevel": 4,
      "tags": [
        "trauma",
        "clinic",
        "risk"
      ]
    },
    {
      "id": "BIOWASTE_SORTING",
      "categoryId": "WASTE_PROCESSING",
      "label": "Biowaste Sorting",
      "defaultLevel": 1,
      "tags": [
        "waste",
        "hazard"
      ]
    },
    {
      "id": "TOXIC_LINE_CLEANOUT",
      "categoryId": "WASTE_PROCESSING",
      "label": "Toxic Line Cleanout",
      "defaultLevel": 2,
      "tags": [
        "waste",
        "toxic"
      ]
    },
    {
      "id": "SANITATION_BLOCK",
      "categoryId": "WASTE_PROCESSING",
      "label": "Sanitation Block",
      "defaultLevel": 1,
      "tags": [
        "sanitation",
        "mandatory"
      ]
    },
    {
      "id": "FACTORY_LINE_SHIFT",
      "categoryId": "INDUSTRIAL",
      "label": "Factory Line Shift",
      "defaultLevel": 1,
      "tags": [
        "factory",
        "line"
      ]
    },
    {
      "id": "MACHINE_REPAIR",
      "categoryId": "INDUSTRIAL",
      "label": "Machine Repair",
      "defaultLevel": 2,
      "tags": [
        "repair",
        "machine"
      ]
    },
    {
      "id": "SCHEMATIC_DIAGNOSTIC",
      "categoryId": "INDUSTRIAL",
      "label": "Schematic Diagnostic",
      "defaultLevel": 3,
      "tags": [
        "schematic",
        "diagnostic"
      ]
    },
    {
      "id": "PLATFORM_LOADING",
      "categoryId": "LOGISTICS",
      "label": "Platform Loading",
      "defaultLevel": 1,
      "tags": [
        "cargo",
        "platform"
      ]
    },
    {
      "id": "RATION_ROUTE_SORT",
      "categoryId": "LOGISTICS",
      "label": "Ration Route Sort",
      "defaultLevel": 1,
      "tags": [
        "ration",
        "logistics"
      ]
    },
    {
      "id": "CARGO_DISPATCH",
      "categoryId": "TRANSPORT",
      "label": "Cargo Dispatch",
      "defaultLevel": 2,
      "tags": [
        "transport",
        "dispatch"
      ]
    },
    {
      "id": "METROGRID_INSPECTION",
      "categoryId": "TRANSPORT",
      "label": "MetroGrid Inspection",
      "defaultLevel": 2,
      "tags": [
        "metro",
        "route"
      ]
    },
    {
      "id": "CAMERA_REVIEW",
      "categoryId": "SURVEILLANCE",
      "label": "Camera Review",
      "defaultLevel": 1,
      "tags": [
        "surveillance",
        "camera"
      ]
    },
    {
      "id": "INCIDENT_TAGGING",
      "categoryId": "SURVEILLANCE",
      "label": "Incident Tagging",
      "defaultLevel": 2,
      "tags": [
        "incident",
        "watch"
      ]
    },
    {
      "id": "CROWD_CONTROL",
      "categoryId": "SECURITY",
      "label": "Crowd Control Auxiliary",
      "defaultLevel": 2,
      "tags": [
        "crowd",
        "security"
      ]
    },
    {
      "id": "SITE_GUARD",
      "categoryId": "SECURITY",
      "label": "Controlled Site Guard",
      "defaultLevel": 2,
      "tags": [
        "guard",
        "site"
      ]
    },
    {
      "id": "FIELD_ESCORT",
      "categoryId": "FIELD_OPERATIONS",
      "label": "Field Escort",
      "defaultLevel": 3,
      "tags": [
        "field",
        "escort"
      ]
    },
    {
      "id": "HAZARD_RETRIEVAL",
      "categoryId": "FIELD_OPERATIONS",
      "label": "Hazard Retrieval",
      "defaultLevel": 4,
      "tags": [
        "hazard",
        "retrieval"
      ]
    },
    {
      "id": "HABITAT_MAINTENANCE",
      "categoryId": "MAINTENANCE",
      "label": "Habitat Maintenance",
      "defaultLevel": 1,
      "tags": [
        "habitat",
        "maintenance"
      ]
    },
    {
      "id": "SENSOR_RESEAT",
      "categoryId": "MAINTENANCE",
      "label": "Sensor Reseat",
      "defaultLevel": 2,
      "tags": [
        "sensor",
        "maintenance"
      ]
    },
    {
      "id": "BROADCAST_SCRIPT_SUPPORT",
      "categoryId": "PROPAGANDA_MEDIA",
      "label": "Broadcast Script Support",
      "defaultLevel": 2,
      "tags": [
        "truthmin",
        "media"
      ]
    },
    {
      "id": "MOOD_SAMPLE_CALL",
      "categoryId": "SOCIAL_SYNCHRONIZATION",
      "label": "Mood Sample Call",
      "defaultLevel": 2,
      "tags": [
        "sync",
        "mood"
      ]
    },
    {
      "id": "SUBSCRIPTION_RECOVERY",
      "categoryId": "SUBSCRIPTION_SALES",
      "label": "Subscription Recovery",
      "defaultLevel": 1,
      "tags": [
        "subscription",
        "debt"
      ]
    },
    {
      "id": "TIER_UPSELL_DESK",
      "categoryId": "SUBSCRIPTION_SALES",
      "label": "Tier Upsell Desk",
      "defaultLevel": 2,
      "tags": [
        "subscription",
        "sales"
      ]
    },
    {
      "id": "DOMESTIC_UNIT_CLEANING",
      "categoryId": "DOMESTIC_SERVICE",
      "label": "Domestic Unit Cleaning",
      "defaultLevel": 1,
      "tags": [
        "domestic",
        "service"
      ]
    },
    {
      "id": "PRIVATE_COURIER_DROP",
      "categoryId": "BLACK_MARKET",
      "label": "Private Courier Drop",
      "defaultLevel": 2,
      "tags": [
        "black",
        "courier"
      ]
    },
    {
      "id": "UNLICENSED_REPAIR",
      "categoryId": "BLACK_MARKET",
      "label": "Unlicensed Repair",
      "defaultLevel": 3,
      "tags": [
        "black",
        "repair"
      ]
    },
    {
      "id": "ARCHIVE_INDEXING",
      "categoryId": "DATA_PROCESSING",
      "label": "Archive Indexing",
      "defaultLevel": 2,
      "tags": [
        "archive",
        "data"
      ]
    },
    {
      "id": "DATA_SANITIZATION",
      "categoryId": "DATA_PROCESSING",
      "label": "Data Sanitization",
      "defaultLevel": 3,
      "tags": [
        "data",
        "sync"
      ]
    },
    {
      "id": "LAB_OBSERVATION",
      "categoryId": "RESEARCH_ASSISTANCE",
      "label": "Lab Observation",
      "defaultLevel": 3,
      "tags": [
        "lab",
        "research"
      ]
    },
    {
      "id": "CITIZEN_CARE_DESK",
      "categoryId": "CITIZEN_CARE",
      "label": "Citizen Care Desk",
      "defaultLevel": 1,
      "tags": [
        "care",
        "desk"
      ]
    }
  ],
  "serviceEmployers": [
    {
      "id": "plentymin-labor-node",
      "label": "PlentyMin Labor Node",
      "providerId": "plentymin-labor-node",
      "organizationId": "plentymin",
      "employerType": "SYSTEM",
      "categories": [
        "WASTE_PROCESSING",
        "INDUSTRIAL",
        "LOGISTICS",
        "SUBSCRIPTION_SALES"
      ],
      "riskPolicy": "SYSTEMIC"
    },
    {
      "id": "watch-secure-civic-desk",
      "label": "Watch & Secure Civic Desk",
      "providerId": "watch-secure-civic-desk",
      "organizationId": "watch-secure",
      "employerType": "SYSTEM",
      "categories": [
        "SECURITY",
        "SURVEILLANCE",
        "ADMINISTRATION",
        "SOCIAL_SYNCHRONIZATION"
      ],
      "riskPolicy": "STRICT"
    },
    {
      "id": "syncmin-assignment-node",
      "label": "SyncMin Assignment Node",
      "providerId": "syncmin-assignment-node",
      "organizationId": "system-authority",
      "employerType": "SYSTEM",
      "categories": [
        "NETWORK_SECURITY",
        "DATA_PROCESSING",
        "SOCIAL_SYNCHRONIZATION"
      ],
      "riskPolicy": "STRICT"
    },
    {
      "id": "securitymin-auxiliary-desk",
      "label": "SecurityMin Auxiliary Desk",
      "providerId": "securitymin-auxiliary-desk",
      "organizationId": "system-authority",
      "employerType": "SYSTEM",
      "categories": [
        "SECURITY",
        "FIELD_OPERATIONS",
        "TRANSPORT"
      ],
      "riskPolicy": "STRICT"
    },
    {
      "id": "truthmin-media-allocation",
      "label": "TruthMin Media Allocation",
      "providerId": "truthmin-media-allocation",
      "organizationId": "system-authority",
      "employerType": "SYSTEM",
      "categories": [
        "PROPAGANDA_MEDIA",
        "DATA_PROCESSING",
        "ADMINISTRATION"
      ],
      "riskPolicy": "STRICT"
    },
    {
      "id": "memorymin-archive-desk",
      "label": "MemoryMin Archive Desk",
      "providerId": "memorymin-archive-desk",
      "organizationId": "system-authority",
      "employerType": "SYSTEM",
      "categories": [
        "DATA_PROCESSING",
        "ADMINISTRATION",
        "RESEARCH_ASSISTANCE"
      ],
      "riskPolicy": "STRICT"
    },
    {
      "id": "perfectmin-lab-allocation",
      "label": "PerfectMin Lab Allocation",
      "providerId": "perfectmin-lab-allocation",
      "organizationId": "perfectmin",
      "employerType": "SYSTEM",
      "categories": [
        "BIOMEDICAL",
        "RESEARCH_ASSISTANCE",
        "CITIZEN_CARE"
      ],
      "riskPolicy": "STRICT"
    },
    {
      "id": "metrogrid-access",
      "label": "MetroGrid Access",
      "providerId": "metrogrid-access",
      "organizationId": "metrogrid-access",
      "employerType": "SYSTEM",
      "categories": [
        "TRANSPORT",
        "MAINTENANCE",
        "LOGISTICS"
      ],
      "riskPolicy": "SYSTEMIC"
    },
    {
      "id": "habitat-ledger",
      "label": "Habitat Ledger",
      "providerId": "habitat-ledger",
      "organizationId": "habitat-market",
      "employerType": "SYSTEM",
      "categories": [
        "MAINTENANCE",
        "DOMESTIC_SERVICE",
        "ADMINISTRATION"
      ],
      "riskPolicy": "SYSTEMIC"
    },
    {
      "id": "cleanstate-utility",
      "label": "CleanState Utility",
      "providerId": "cleanstate-utility",
      "organizationId": "cleanstate-utility",
      "employerType": "SYSTEM",
      "categories": [
        "WASTE_PROCESSING",
        "MAINTENANCE",
        "INDUSTRIAL"
      ],
      "riskPolicy": "SYSTEMIC"
    },
    {
      "id": "factory-commons",
      "label": "Factory Commons",
      "providerId": "factory-commons",
      "organizationId": "factory-commons",
      "employerType": "SYSTEM",
      "categories": [
        "INDUSTRIAL",
        "MAINTENANCE",
        "LOGISTICS"
      ],
      "riskPolicy": "STANDARD"
    },
    {
      "id": "kagami-kaisha",
      "label": "Kagami Kaisha",
      "providerId": "kagami-kaisha",
      "organizationId": "kagami-kaisha",
      "employerType": "PRIVATE",
      "categories": [
        "NETWORK_SECURITY",
        "DATA_PROCESSING",
        "RESEARCH_ASSISTANCE"
      ],
      "riskPolicy": "STRICT"
    },
    {
      "id": "trauma-team",
      "label": "TRAUMA Team",
      "providerId": "trauma-team",
      "organizationId": "trauma-team",
      "employerType": "PRIVATE",
      "categories": [
        "BIOMEDICAL",
        "FIELD_OPERATIONS",
        "CITIZEN_CARE"
      ],
      "riskPolicy": "STRICT"
    },
    {
      "id": "live-prevail",
      "label": "Live & Prevail",
      "providerId": "live-prevail",
      "organizationId": "live-prevail",
      "employerType": "SYSTEM",
      "categories": [
        "CITIZEN_CARE",
        "BIOMEDICAL",
        "SUBSCRIPTION_SALES"
      ],
      "riskPolicy": "SYSTEMIC"
    },
    {
      "id": "coremed-service",
      "label": "CoreMed Service",
      "providerId": "coremed-service",
      "organizationId": "coremed",
      "employerType": "PRIVATE",
      "categories": [
        "BIOMEDICAL",
        "MAINTENANCE",
        "CITIZEN_CARE"
      ],
      "riskPolicy": "STANDARD"
    },
    {
      "id": "vector-cabline",
      "label": "Vector Cabline",
      "providerId": "vector-cabline",
      "organizationId": "vector-cabline",
      "employerType": "PRIVATE",
      "categories": [
        "TRANSPORT",
        "FIELD_OPERATIONS",
        "LOGISTICS"
      ],
      "riskPolicy": "STANDARD"
    },
    {
      "id": "helix-table",
      "label": "Helix Table",
      "providerId": "helix-table",
      "organizationId": "helix-table",
      "employerType": "PRIVATE",
      "categories": [
        "DOMESTIC_SERVICE",
        "CITIZEN_CARE",
        "SUBSCRIPTION_SALES"
      ],
      "riskPolicy": "STANDARD"
    },
    {
      "id": "aurum-skinworks",
      "label": "Aurum Skinworks",
      "providerId": "aurum-skinworks",
      "organizationId": "aurum",
      "employerType": "PRIVATE",
      "categories": [
        "BIOMEDICAL",
        "DOMESTIC_SERVICE",
        "SUBSCRIPTION_SALES"
      ],
      "riskPolicy": "STANDARD"
    },
    {
      "id": "cortex-ladder",
      "label": "Cortex Ladder",
      "providerId": "cortex-ladder",
      "organizationId": "cortex-ladder",
      "employerType": "PRIVATE",
      "categories": [
        "RESEARCH_ASSISTANCE",
        "DATA_PROCESSING",
        "NETWORK_SECURITY"
      ],
      "riskPolicy": "STRICT"
    },
    {
      "id": "somnacore",
      "label": "SomnaCore",
      "providerId": "somnacore",
      "organizationId": "somnacore",
      "employerType": "PRIVATE",
      "categories": [
        "CITIZEN_CARE",
        "BIOMEDICAL",
        "DATA_PROCESSING"
      ],
      "riskPolicy": "STANDARD"
    },
    {
      "id": "local-service-registry",
      "label": "LOCAL SERVICE REGISTRY",
      "providerId": "local-service-registry",
      "organizationId": "system-authority",
      "employerType": "SYSTEM",
      "categories": [
        "ADMINISTRATION",
        "LOGISTICS",
        "MAINTENANCE",
        "WASTE_PROCESSING"
      ],
      "riskPolicy": "SYSTEMIC"
    },
    {
      "id": "offrecord-broker",
      "label": "Off-Record Broker",
      "providerId": "offrecord-broker",
      "organizationId": "",
      "employerType": "BLACK",
      "categories": [
        "BLACK_MARKET",
        "FIELD_OPERATIONS",
        "MAINTENANCE"
      ],
      "riskPolicy": "NONE"
    },
    {
      "id": "greyline-couriers",
      "label": "Greyline Couriers",
      "providerId": "greyline-couriers",
      "organizationId": "",
      "employerType": "BLACK",
      "categories": [
        "BLACK_MARKET",
        "TRANSPORT",
        "FIELD_OPERATIONS"
      ],
      "riskPolicy": "NONE"
    },
    {
      "id": "private-habitat-clients",
      "label": "Private Habitat Clients",
      "providerId": "private-habitat-clients",
      "organizationId": "",
      "employerType": "PRIVATE",
      "categories": [
        "DOMESTIC_SERVICE",
        "MAINTENANCE",
        "CITIZEN_CARE"
      ],
      "riskPolicy": "STANDARD"
    },
    {
      "id": "archive-salvage-circle",
      "label": "Archive Salvage Circle",
      "providerId": "archive-salvage-circle",
      "organizationId": "",
      "employerType": "MIXED",
      "categories": [
        "DATA_PROCESSING",
        "BLACK_MARKET",
        "RESEARCH_ASSISTANCE"
      ],
      "riskPolicy": "RISK"
    }
  ],
  "requirementTypes": [
    {
      "id": "BIOLOGICAL_PROFILE",
      "label": "Biological Profile",
      "description": "Allowed systemic biological profiles."
    },
    {
      "id": "MIN_ABILITY",
      "label": "Minimum Ability",
      "description": "Required ability value from the character sheet."
    },
    {
      "id": "MIN_SKILL",
      "label": "Minimum Skill",
      "description": "Required skill value from the character sheet."
    },
    {
      "id": "MIN_EXPERIENCE",
      "label": "Minimum Experience",
      "description": "Required Service category experience."
    },
    {
      "id": "INSURANCE",
      "label": "Insurance Coverage",
      "description": "Required Live & Prevail or TRAUMA coverage."
    },
    {
      "id": "CLEARANCE",
      "label": "Clearance",
      "description": "Required access tag / clearance band."
    },
    {
      "id": "RISK_SCORE",
      "label": "Risk Score",
      "description": "Maximum allowed W&S risk index."
    },
    {
      "id": "SUBSCRIPTION",
      "label": "Subscription",
      "description": "Required non-insurance subscription."
    },
    {
      "id": "LICENSE",
      "label": "License",
      "description": "Required certification or license marker."
    }
  ],
  "insuranceRequirementProfiles": [
    {
      "id": "NONE",
      "mode": "NONE",
      "coverage": "NONE",
      "label": "No insurance requirement"
    },
    {
      "id": "BASIC_COVERAGE",
      "mode": "REQUIRED",
      "coverage": "BASIC",
      "label": "Basic Coverage",
      "acceptedProviders": [
        "LIVE_AND_PREVAIL",
        "TRAUMA"
      ],
      "minTierByProvider": {
        "LIVE_AND_PREVAIL": 1,
        "TRAUMA": 1
      }
    },
    {
      "id": "MEDICAL_COVERAGE",
      "mode": "REQUIRED",
      "coverage": "MEDICAL",
      "label": "Medical Coverage",
      "acceptedProviders": [
        "LIVE_AND_PREVAIL",
        "TRAUMA"
      ],
      "minTierByProvider": {
        "LIVE_AND_PREVAIL": 2,
        "TRAUMA": 2
      }
    },
    {
      "id": "TRAUMA_RESPONSE",
      "mode": "REQUIRED",
      "coverage": "TRAUMA_RESPONSE",
      "label": "TRAUMA Response",
      "acceptedProviders": [
        "TRAUMA"
      ],
      "minTierByProvider": {
        "TRAUMA": 3
      }
    },
    {
      "id": "BIOCHIP_MONITORED",
      "mode": "REQUIRED",
      "coverage": "BIOCHIP_MONITORED",
      "label": "Biochip Monitored",
      "acceptedProviders": [
        "LIVE_AND_PREVAIL",
        "TRAUMA"
      ],
      "minTierByProvider": {
        "LIVE_AND_PREVAIL": 3,
        "TRAUMA": 2
      },
      "requiresBiochip": true
    },
    {
      "id": "PREFERRED_BASIC",
      "mode": "PREFERRED",
      "coverage": "BASIC",
      "label": "Preferred Basic Coverage",
      "acceptedProviders": [
        "LIVE_AND_PREVAIL",
        "TRAUMA"
      ],
      "minTierByProvider": {
        "LIVE_AND_PREVAIL": 1,
        "TRAUMA": 1
      },
      "missingPenalty": {
        "paymentMultiplier": 0.85,
        "riskScoreImpact": 3
      }
    },
    {
      "id": "OFF_RECORD_WAIVED",
      "mode": "WAIVED",
      "coverage": "NONE",
      "label": "Off-record waiver"
    },
    {
      "id": "BIOCHIP_DISALLOWED",
      "mode": "DISALLOWED",
      "coverage": "NO_BIOCHIP",
      "label": "Biochip response disallowed",
      "disallowedProviders": [
        "TRAUMA"
      ],
      "reason": "Biochip response may expose off-record operation."
    }
  ],
  "serviceWeeklyDemandModifiers": [
    {
      "id": "security_alert",
      "label": "Security Alert",
      "chance": 0.35,
      "categoryIds": [
        "SECURITY",
        "SURVEILLANCE",
        "FIELD_OPERATIONS"
      ],
      "tags": [
        "security",
        "watch",
        "escort",
        "crowd"
      ],
      "spawnMultiplier": 1.35,
      "paymentMultiplier": 1.08
    },
    {
      "id": "haven_packet_incident",
      "label": "HAVEN Packet Incident",
      "chance": 0.28,
      "categoryIds": [
        "NETWORK_SECURITY",
        "DATA_PROCESSING",
        "SOCIAL_SYNCHRONIZATION"
      ],
      "tags": [
        "network",
        "sync",
        "data",
        "quarantine"
      ],
      "spawnMultiplier": 1.45,
      "paymentMultiplier": 1.12
    },
    {
      "id": "industrial_shortage",
      "label": "Industrial Shortage",
      "chance": 0.32,
      "categoryIds": [
        "INDUSTRIAL",
        "MAINTENANCE",
        "LOGISTICS",
        "TRANSPORT"
      ],
      "tags": [
        "industrial",
        "factory",
        "repair",
        "cargo"
      ],
      "spawnMultiplier": 1.3,
      "paymentMultiplier": 1.06
    },
    {
      "id": "trauma_overflow",
      "label": "TRAUMA Overflow",
      "chance": 0.22,
      "categoryIds": [
        "BIOMEDICAL",
        "CITIZEN_CARE"
      ],
      "employerIds": [
        "trauma-team",
        "coremed-service"
      ],
      "tags": [
        "medical",
        "biomonitoring",
        "clinic"
      ],
      "spawnMultiplier": 1.38,
      "paymentMultiplier": 1.1
    },
    {
      "id": "subscription_debt_wave",
      "label": "Subscription Debt Wave",
      "chance": 0.4,
      "categoryIds": [
        "SUBSCRIPTION_SALES",
        "ADMINISTRATION",
        "DATA_PROCESSING"
      ],
      "tags": [
        "subscription",
        "debt",
        "ledger",
        "registry"
      ],
      "spawnMultiplier": 1.32,
      "paymentMultiplier": 1.04
    },
    {
      "id": "lower_zone_sanitation_pressure",
      "label": "Lower-zone Sanitation Pressure",
      "chance": 0.3,
      "categoryIds": [
        "WASTE_PROCESSING",
        "MAINTENANCE",
        "INDUSTRIAL"
      ],
      "tags": [
        "waste",
        "sanitation",
        "lower-zone",
        "hazard"
      ],
      "spawnMultiplier": 1.42,
      "paymentMultiplier": 1.07
    }
  ],
  "serviceOfferTemplates": [
    {
      "id": "tpl-plentymin-labor-node-biowaste-sorting-l1",
      "title": "Biowaste Sorting",
      "employerId": "plentymin-labor-node",
      "employerType": "SYSTEM",
      "provider": "PlentyMin Labor Node",
      "category": "MANDATORY",
      "categoryId": "WASTE_PROCESSING",
      "subcategoryId": "BIOWASTE_SORTING",
      "workCharacterId": "BIOWASTE_SORTING",
      "complexity": "BASIC",
      "level": 1,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "GAMMA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-endurance",
            "value": 2
          },
          {
            "id": "ability-strength",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "WASTE_PROCESSING",
            "value": 1
          },
          {
            "categoryId": "BIOWASTE_SORTING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "waste",
        "hazard",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-plentymin-labor-node-toxic-line-cleanout-l2",
      "title": "Toxic Line Cleanout",
      "employerId": "plentymin-labor-node",
      "employerType": "SYSTEM",
      "provider": "PlentyMin Labor Node",
      "category": "MANDATORY",
      "categoryId": "WASTE_PROCESSING",
      "subcategoryId": "TOXIC_LINE_CLEANOUT",
      "workCharacterId": "TOXIC_LINE_CLEANOUT",
      "complexity": "STANDARD",
      "level": 2,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "GAMMA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-endurance",
            "value": 3
          },
          {
            "id": "ability-strength",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-production-line",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "WASTE_PROCESSING",
            "value": 1
          },
          {
            "categoryId": "TOXIC_LINE_CLEANOUT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.43,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "waste",
        "toxic",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-plentymin-labor-node-sanitation-block-l1",
      "title": "Sanitation Block",
      "employerId": "plentymin-labor-node",
      "employerType": "SYSTEM",
      "provider": "PlentyMin Labor Node",
      "category": "MANDATORY",
      "categoryId": "WASTE_PROCESSING",
      "subcategoryId": "SANITATION_BLOCK",
      "workCharacterId": "SANITATION_BLOCK",
      "complexity": "BASIC",
      "level": 1,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "GAMMA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-endurance",
            "value": 2
          },
          {
            "id": "ability-strength",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "WASTE_PROCESSING",
            "value": 1
          },
          {
            "categoryId": "SANITATION_BLOCK",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "sanitation",
        "mandatory",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-plentymin-labor-node-factory-line-shift-l1",
      "title": "Factory Line Shift",
      "employerId": "plentymin-labor-node",
      "employerType": "SYSTEM",
      "provider": "PlentyMin Labor Node",
      "category": "REGULAR",
      "categoryId": "INDUSTRIAL",
      "subcategoryId": "FACTORY_LINE_SHIFT",
      "workCharacterId": "FACTORY_LINE_SHIFT",
      "complexity": "BASIC",
      "level": 1,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-strength",
            "value": 2
          },
          {
            "id": "ability-endurance",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "INDUSTRIAL",
            "value": 1
          },
          {
            "categoryId": "FACTORY_LINE_SHIFT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "factory",
        "line",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-plentymin-labor-node-machine-repair-l2",
      "title": "Machine Repair",
      "employerId": "plentymin-labor-node",
      "employerType": "SYSTEM",
      "provider": "PlentyMin Labor Node",
      "category": "MANDATORY",
      "categoryId": "INDUSTRIAL",
      "subcategoryId": "MACHINE_REPAIR",
      "workCharacterId": "MACHINE_REPAIR",
      "complexity": "STANDARD",
      "level": 2,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-strength",
            "value": 3
          },
          {
            "id": "ability-endurance",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "INDUSTRIAL",
            "value": 1
          },
          {
            "categoryId": "MACHINE_REPAIR",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.43,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "repair",
        "machine",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-plentymin-labor-node-schematic-diagnostic-l3",
      "title": "Schematic Diagnostic",
      "employerId": "plentymin-labor-node",
      "employerType": "SYSTEM",
      "provider": "PlentyMin Labor Node",
      "category": "REGULAR",
      "categoryId": "INDUSTRIAL",
      "subcategoryId": "SCHEMATIC_DIAGNOSTIC",
      "workCharacterId": "SCHEMATIC_DIAGNOSTIC",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-strength",
            "value": 4
          },
          {
            "id": "ability-endurance",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "INDUSTRIAL",
            "value": 2
          },
          {
            "categoryId": "SCHEMATIC_DIAGNOSTIC",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "schematic",
        "diagnostic",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-plentymin-labor-node-platform-loading-l1",
      "title": "Platform Loading",
      "employerId": "plentymin-labor-node",
      "employerType": "SYSTEM",
      "provider": "PlentyMin Labor Node",
      "category": "MANDATORY",
      "categoryId": "LOGISTICS",
      "subcategoryId": "PLATFORM_LOADING",
      "workCharacterId": "PLATFORM_LOADING",
      "complexity": "BASIC",
      "level": 1,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 2
          },
          {
            "id": "ability-dexterity",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "LOGISTICS",
            "value": 1
          },
          {
            "categoryId": "PLATFORM_LOADING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "cargo",
        "platform",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-plentymin-labor-node-ration-route-sort-l1",
      "title": "Ration Route Sort",
      "employerId": "plentymin-labor-node",
      "employerType": "SYSTEM",
      "provider": "PlentyMin Labor Node",
      "category": "MANDATORY",
      "categoryId": "LOGISTICS",
      "subcategoryId": "RATION_ROUTE_SORT",
      "workCharacterId": "RATION_ROUTE_SORT",
      "complexity": "BASIC",
      "level": 1,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 2
          },
          {
            "id": "ability-dexterity",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "LOGISTICS",
            "value": 1
          },
          {
            "categoryId": "RATION_ROUTE_SORT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "ration",
        "logistics",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-plentymin-labor-node-subscription-recovery-l1",
      "title": "Subscription Recovery",
      "employerId": "plentymin-labor-node",
      "employerType": "SYSTEM",
      "provider": "PlentyMin Labor Node",
      "category": "MANDATORY",
      "categoryId": "SUBSCRIPTION_SALES",
      "subcategoryId": "SUBSCRIPTION_RECOVERY",
      "workCharacterId": "SUBSCRIPTION_RECOVERY",
      "complexity": "BASIC",
      "level": 1,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-charisma",
            "value": 2
          },
          {
            "id": "ability-intellect",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SUBSCRIPTION_SALES",
            "value": 1
          },
          {
            "categoryId": "SUBSCRIPTION_RECOVERY",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "subscription",
        "debt",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-plentymin-labor-node-tier-upsell-desk-l2",
      "title": "Tier Upsell Desk",
      "employerId": "plentymin-labor-node",
      "employerType": "SYSTEM",
      "provider": "PlentyMin Labor Node",
      "category": "REGULAR",
      "categoryId": "SUBSCRIPTION_SALES",
      "subcategoryId": "TIER_UPSELL_DESK",
      "workCharacterId": "TIER_UPSELL_DESK",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-charisma",
            "value": 3
          },
          {
            "id": "ability-intellect",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-form-correction",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SUBSCRIPTION_SALES",
            "value": 1
          },
          {
            "categoryId": "TIER_UPSELL_DESK",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "subscription",
        "sales",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-watch-secure-civic-desk-crowd-control-l3",
      "title": "Crowd Control Auxiliary",
      "employerId": "watch-secure-civic-desk",
      "employerType": "SYSTEM",
      "provider": "Watch & Secure Civic Desk",
      "category": "MANDATORY",
      "categoryId": "SECURITY",
      "subcategoryId": "CROWD_CONTROL",
      "workCharacterId": "CROWD_CONTROL",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-composure",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-ws-procedures",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SECURITY",
            "value": 2
          },
          {
            "categoryId": "CROWD_CONTROL",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "crowd",
        "security",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-watch-secure-civic-desk-site-guard-l3",
      "title": "Controlled Site Guard",
      "employerId": "watch-secure-civic-desk",
      "employerType": "SYSTEM",
      "provider": "Watch & Secure Civic Desk",
      "category": "MANDATORY",
      "categoryId": "SECURITY",
      "subcategoryId": "SITE_GUARD",
      "workCharacterId": "SITE_GUARD",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-composure",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-ws-procedures",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SECURITY",
            "value": 2
          },
          {
            "categoryId": "SITE_GUARD",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "guard",
        "site",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-watch-secure-civic-desk-camera-review-l1",
      "title": "Camera Review",
      "employerId": "watch-secure-civic-desk",
      "employerType": "SYSTEM",
      "provider": "Watch & Secure Civic Desk",
      "category": "REGULAR",
      "categoryId": "SURVEILLANCE",
      "subcategoryId": "CAMERA_REVIEW",
      "workCharacterId": "CAMERA_REVIEW",
      "complexity": "BASIC",
      "level": 1,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-perception",
            "value": 2
          },
          {
            "id": "ability-reflex",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SURVEILLANCE",
            "value": 1
          },
          {
            "categoryId": "CAMERA_REVIEW",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "surveillance",
        "camera",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-watch-secure-civic-desk-incident-tagging-l3",
      "title": "Incident Tagging",
      "employerId": "watch-secure-civic-desk",
      "employerType": "SYSTEM",
      "provider": "Watch & Secure Civic Desk",
      "category": "REGULAR",
      "categoryId": "SURVEILLANCE",
      "subcategoryId": "INCIDENT_TAGGING",
      "workCharacterId": "INCIDENT_TAGGING",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-perception",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-ws-procedures",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SURVEILLANCE",
            "value": 2
          },
          {
            "categoryId": "INCIDENT_TAGGING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "incident",
        "watch",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-watch-secure-civic-desk-form-correction-l2",
      "title": "Form Correction",
      "employerId": "watch-secure-civic-desk",
      "employerType": "SYSTEM",
      "provider": "Watch & Secure Civic Desk",
      "category": "MANDATORY",
      "categoryId": "ADMINISTRATION",
      "subcategoryId": "FORM_CORRECTION",
      "workCharacterId": "FORM_CORRECTION",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-composure",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-system-administration",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "ADMINISTRATION",
            "value": 1
          },
          {
            "categoryId": "FORM_CORRECTION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.43,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "forms",
        "registry",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-watch-secure-civic-desk-registry-review-l3",
      "title": "Registry Review",
      "employerId": "watch-secure-civic-desk",
      "employerType": "SYSTEM",
      "provider": "Watch & Secure Civic Desk",
      "category": "REGULAR",
      "categoryId": "ADMINISTRATION",
      "subcategoryId": "REGISTRY_REVIEW",
      "workCharacterId": "REGISTRY_REVIEW",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-system-administration",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "ADMINISTRATION",
            "value": 2
          },
          {
            "categoryId": "REGISTRY_REVIEW",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "registry",
        "review",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-watch-secure-civic-desk-ledger-cleanup-l2",
      "title": "Ledger Cleanup",
      "employerId": "watch-secure-civic-desk",
      "employerType": "SYSTEM",
      "provider": "Watch & Secure Civic Desk",
      "category": "REGULAR",
      "categoryId": "ADMINISTRATION",
      "subcategoryId": "LEDGER_CLEANUP",
      "workCharacterId": "LEDGER_CLEANUP",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-composure",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-system-administration",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "ADMINISTRATION",
            "value": 1
          },
          {
            "categoryId": "LEDGER_CLEANUP",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "ledger",
        "credits",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-watch-secure-civic-desk-mood-sample-call-l2",
      "title": "Mood Sample Call",
      "employerId": "watch-secure-civic-desk",
      "employerType": "SYSTEM",
      "provider": "Watch & Secure Civic Desk",
      "category": "REGULAR",
      "categoryId": "SOCIAL_SYNCHRONIZATION",
      "subcategoryId": "MOOD_SAMPLE_CALL",
      "workCharacterId": "MOOD_SAMPLE_CALL",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-charisma",
            "value": 3
          },
          {
            "id": "ability-composure",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-ws-procedures",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SOCIAL_SYNCHRONIZATION",
            "value": 1
          },
          {
            "categoryId": "MOOD_SAMPLE_CALL",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "sync",
        "mood",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-syncmin-assignment-node-endpoint-audit-l3",
      "title": "Endpoint Audit",
      "employerId": "syncmin-assignment-node",
      "employerType": "SYSTEM",
      "provider": "SyncMin Assignment Node",
      "category": "MANDATORY",
      "categoryId": "NETWORK_SECURITY",
      "subcategoryId": "ENDPOINT_AUDIT",
      "workCharacterId": "ENDPOINT_AUDIT",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2500,
          5000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-local-access-routing",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "NETWORK_SECURITY",
            "value": 2
          },
          {
            "categoryId": "ENDPOINT_AUDIT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "network",
        "audit",
        "endpoint",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-syncmin-assignment-node-intrusion-trace-l4",
      "title": "Intrusion Trace",
      "employerId": "syncmin-assignment-node",
      "employerType": "SYSTEM",
      "provider": "SyncMin Assignment Node",
      "category": "REGULAR",
      "categoryId": "NETWORK_SECURITY",
      "subcategoryId": "INTRUSION_TRACE",
      "workCharacterId": "INTRUSION_TRACE",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 5
          },
          {
            "id": "ability-dexterity",
            "value": 6
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-local-access-routing",
            "value": 6
          },
          {
            "id": "skill-ws-procedures",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "NETWORK_SECURITY",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 55
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "NETWORK_SECURITY",
            "value": 3
          },
          {
            "categoryId": "INTRUSION_TRACE",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "network",
        "trace",
        "security",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-syncmin-assignment-node-firewall-calibration-l3",
      "title": "Firewall Calibration",
      "employerId": "syncmin-assignment-node",
      "employerType": "SYSTEM",
      "provider": "SyncMin Assignment Node",
      "category": "REGULAR",
      "categoryId": "NETWORK_SECURITY",
      "subcategoryId": "FIREWALL_CALIBRATION",
      "workCharacterId": "FIREWALL_CALIBRATION",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2500,
          5000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-local-access-routing",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "NETWORK_SECURITY",
            "value": 2
          },
          {
            "categoryId": "FIREWALL_CALIBRATION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "network",
        "firewall",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-syncmin-assignment-node-archive-indexing-l3",
      "title": "Archive Indexing",
      "employerId": "syncmin-assignment-node",
      "employerType": "SYSTEM",
      "provider": "SyncMin Assignment Node",
      "category": "REGULAR",
      "categoryId": "DATA_PROCESSING",
      "subcategoryId": "ARCHIVE_INDEXING",
      "workCharacterId": "ARCHIVE_INDEXING",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DATA_PROCESSING",
            "value": 2
          },
          {
            "categoryId": "ARCHIVE_INDEXING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "archive",
        "data",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-syncmin-assignment-node-data-sanitization-l3",
      "title": "Data Sanitization",
      "employerId": "syncmin-assignment-node",
      "employerType": "SYSTEM",
      "provider": "SyncMin Assignment Node",
      "category": "MANDATORY",
      "categoryId": "DATA_PROCESSING",
      "subcategoryId": "DATA_SANITIZATION",
      "workCharacterId": "DATA_SANITIZATION",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DATA_PROCESSING",
            "value": 2
          },
          {
            "categoryId": "DATA_SANITIZATION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "data",
        "sync",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-syncmin-assignment-node-mood-sample-call-l3",
      "title": "Mood Sample Call",
      "employerId": "syncmin-assignment-node",
      "employerType": "SYSTEM",
      "provider": "SyncMin Assignment Node",
      "category": "REGULAR",
      "categoryId": "SOCIAL_SYNCHRONIZATION",
      "subcategoryId": "MOOD_SAMPLE_CALL",
      "workCharacterId": "MOOD_SAMPLE_CALL",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-charisma",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-ws-procedures",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SOCIAL_SYNCHRONIZATION",
            "value": 2
          },
          {
            "categoryId": "MOOD_SAMPLE_CALL",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "sync",
        "mood",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-securitymin-auxiliary-desk-crowd-control-l3",
      "title": "Crowd Control Auxiliary",
      "employerId": "securitymin-auxiliary-desk",
      "employerType": "SYSTEM",
      "provider": "SecurityMin Auxiliary Desk",
      "category": "MANDATORY",
      "categoryId": "SECURITY",
      "subcategoryId": "CROWD_CONTROL",
      "workCharacterId": "CROWD_CONTROL",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-composure",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-ws-procedures",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SECURITY",
            "value": 2
          },
          {
            "categoryId": "CROWD_CONTROL",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "crowd",
        "security",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-securitymin-auxiliary-desk-site-guard-l2",
      "title": "Controlled Site Guard",
      "employerId": "securitymin-auxiliary-desk",
      "employerType": "SYSTEM",
      "provider": "SecurityMin Auxiliary Desk",
      "category": "MANDATORY",
      "categoryId": "SECURITY",
      "subcategoryId": "SITE_GUARD",
      "workCharacterId": "SITE_GUARD",
      "complexity": "STANDARD",
      "level": 2,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 3
          },
          {
            "id": "ability-composure",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-ws-procedures",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SECURITY",
            "value": 1
          },
          {
            "categoryId": "SITE_GUARD",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.43,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "guard",
        "site",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-securitymin-auxiliary-desk-field-escort-l3",
      "title": "Field Escort",
      "employerId": "securitymin-auxiliary-desk",
      "employerType": "SYSTEM",
      "provider": "SecurityMin Auxiliary Desk",
      "category": "REGULAR",
      "categoryId": "FIELD_OPERATIONS",
      "subcategoryId": "FIELD_ESCORT",
      "workCharacterId": "FIELD_ESCORT",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2500,
          5000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-endurance",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "FIELD_OPERATIONS",
            "value": 2
          },
          {
            "categoryId": "FIELD_ESCORT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "field",
        "escort",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-securitymin-auxiliary-desk-hazard-retrieval-l4",
      "title": "Hazard Retrieval",
      "employerId": "securitymin-auxiliary-desk",
      "employerType": "SYSTEM",
      "provider": "SecurityMin Auxiliary Desk",
      "category": "REGULAR",
      "categoryId": "FIELD_OPERATIONS",
      "subcategoryId": "HAZARD_RETRIEVAL",
      "workCharacterId": "HAZARD_RETRIEVAL",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 5
          },
          {
            "id": "ability-endurance",
            "value": 6
          },
          {
            "id": "ability-strength",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 6
          },
          {
            "id": "skill-tool-improvisation",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "FIELD_OPERATIONS",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "TRAUMA_RESPONSE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 55
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "FIELD_OPERATIONS",
            "value": 3
          },
          {
            "categoryId": "HAZARD_RETRIEVAL",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "hazard",
        "retrieval",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-securitymin-auxiliary-desk-cargo-dispatch-l2",
      "title": "Cargo Dispatch",
      "employerId": "securitymin-auxiliary-desk",
      "employerType": "SYSTEM",
      "provider": "SecurityMin Auxiliary Desk",
      "category": "MANDATORY",
      "categoryId": "TRANSPORT",
      "subcategoryId": "CARGO_DISPATCH",
      "workCharacterId": "CARGO_DISPATCH",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 3
          },
          {
            "id": "ability-perception",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "TRANSPORT",
            "value": 1
          },
          {
            "categoryId": "CARGO_DISPATCH",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.43,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "transport",
        "dispatch",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-securitymin-auxiliary-desk-metrogrid-inspection-l2",
      "title": "MetroGrid Inspection",
      "employerId": "securitymin-auxiliary-desk",
      "employerType": "SYSTEM",
      "provider": "SecurityMin Auxiliary Desk",
      "category": "REGULAR",
      "categoryId": "TRANSPORT",
      "subcategoryId": "METROGRID_INSPECTION",
      "workCharacterId": "METROGRID_INSPECTION",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 3
          },
          {
            "id": "ability-perception",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "TRANSPORT",
            "value": 1
          },
          {
            "categoryId": "METROGRID_INSPECTION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "metro",
        "route",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-truthmin-media-allocation-broadcast-script-support-l2",
      "title": "Broadcast Script Support",
      "employerId": "truthmin-media-allocation",
      "employerType": "SYSTEM",
      "provider": "TruthMin Media Allocation",
      "category": "MANDATORY",
      "categoryId": "PROPAGANDA_MEDIA",
      "subcategoryId": "BROADCAST_SCRIPT_SUPPORT",
      "workCharacterId": "BROADCAST_SCRIPT_SUPPORT",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-charisma",
            "value": 3
          },
          {
            "id": "ability-intellect",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-form-correction",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "PROPAGANDA_MEDIA",
            "value": 1
          },
          {
            "categoryId": "BROADCAST_SCRIPT_SUPPORT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.43,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "truthmin",
        "media",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-truthmin-media-allocation-archive-indexing-l2",
      "title": "Archive Indexing",
      "employerId": "truthmin-media-allocation",
      "employerType": "SYSTEM",
      "provider": "TruthMin Media Allocation",
      "category": "REGULAR",
      "categoryId": "DATA_PROCESSING",
      "subcategoryId": "ARCHIVE_INDEXING",
      "workCharacterId": "ARCHIVE_INDEXING",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-perception",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DATA_PROCESSING",
            "value": 1
          },
          {
            "categoryId": "ARCHIVE_INDEXING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "archive",
        "data",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-truthmin-media-allocation-data-sanitization-l3",
      "title": "Data Sanitization",
      "employerId": "truthmin-media-allocation",
      "employerType": "SYSTEM",
      "provider": "TruthMin Media Allocation",
      "category": "REGULAR",
      "categoryId": "DATA_PROCESSING",
      "subcategoryId": "DATA_SANITIZATION",
      "workCharacterId": "DATA_SANITIZATION",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DATA_PROCESSING",
            "value": 2
          },
          {
            "categoryId": "DATA_SANITIZATION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "data",
        "sync",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-truthmin-media-allocation-form-correction-l2",
      "title": "Form Correction",
      "employerId": "truthmin-media-allocation",
      "employerType": "SYSTEM",
      "provider": "TruthMin Media Allocation",
      "category": "REGULAR",
      "categoryId": "ADMINISTRATION",
      "subcategoryId": "FORM_CORRECTION",
      "workCharacterId": "FORM_CORRECTION",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-composure",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-system-administration",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "ADMINISTRATION",
            "value": 1
          },
          {
            "categoryId": "FORM_CORRECTION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "forms",
        "registry",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-truthmin-media-allocation-registry-review-l2",
      "title": "Registry Review",
      "employerId": "truthmin-media-allocation",
      "employerType": "SYSTEM",
      "provider": "TruthMin Media Allocation",
      "category": "MANDATORY",
      "categoryId": "ADMINISTRATION",
      "subcategoryId": "REGISTRY_REVIEW",
      "workCharacterId": "REGISTRY_REVIEW",
      "complexity": "STANDARD",
      "level": 2,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-composure",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-system-administration",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "ADMINISTRATION",
            "value": 1
          },
          {
            "categoryId": "REGISTRY_REVIEW",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.43,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "registry",
        "review",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-truthmin-media-allocation-ledger-cleanup-l2",
      "title": "Ledger Cleanup",
      "employerId": "truthmin-media-allocation",
      "employerType": "SYSTEM",
      "provider": "TruthMin Media Allocation",
      "category": "REGULAR",
      "categoryId": "ADMINISTRATION",
      "subcategoryId": "LEDGER_CLEANUP",
      "workCharacterId": "LEDGER_CLEANUP",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-composure",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-system-administration",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "ADMINISTRATION",
            "value": 1
          },
          {
            "categoryId": "LEDGER_CLEANUP",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "ledger",
        "credits",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-memorymin-archive-desk-archive-indexing-l2",
      "title": "Archive Indexing",
      "employerId": "memorymin-archive-desk",
      "employerType": "SYSTEM",
      "provider": "MemoryMin Archive Desk",
      "category": "MANDATORY",
      "categoryId": "DATA_PROCESSING",
      "subcategoryId": "ARCHIVE_INDEXING",
      "workCharacterId": "ARCHIVE_INDEXING",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-perception",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DATA_PROCESSING",
            "value": 1
          },
          {
            "categoryId": "ARCHIVE_INDEXING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.43,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "archive",
        "data",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-memorymin-archive-desk-data-sanitization-l3",
      "title": "Data Sanitization",
      "employerId": "memorymin-archive-desk",
      "employerType": "SYSTEM",
      "provider": "MemoryMin Archive Desk",
      "category": "REGULAR",
      "categoryId": "DATA_PROCESSING",
      "subcategoryId": "DATA_SANITIZATION",
      "workCharacterId": "DATA_SANITIZATION",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DATA_PROCESSING",
            "value": 2
          },
          {
            "categoryId": "DATA_SANITIZATION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "data",
        "sync",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-memorymin-archive-desk-form-correction-l2",
      "title": "Form Correction",
      "employerId": "memorymin-archive-desk",
      "employerType": "SYSTEM",
      "provider": "MemoryMin Archive Desk",
      "category": "REGULAR",
      "categoryId": "ADMINISTRATION",
      "subcategoryId": "FORM_CORRECTION",
      "workCharacterId": "FORM_CORRECTION",
      "complexity": "STANDARD",
      "level": 2,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-composure",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-system-administration",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "ADMINISTRATION",
            "value": 1
          },
          {
            "categoryId": "FORM_CORRECTION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "forms",
        "registry",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-memorymin-archive-desk-registry-review-l3",
      "title": "Registry Review",
      "employerId": "memorymin-archive-desk",
      "employerType": "SYSTEM",
      "provider": "MemoryMin Archive Desk",
      "category": "REGULAR",
      "categoryId": "ADMINISTRATION",
      "subcategoryId": "REGISTRY_REVIEW",
      "workCharacterId": "REGISTRY_REVIEW",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-system-administration",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "ADMINISTRATION",
            "value": 2
          },
          {
            "categoryId": "REGISTRY_REVIEW",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "registry",
        "review",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-memorymin-archive-desk-ledger-cleanup-l3",
      "title": "Ledger Cleanup",
      "employerId": "memorymin-archive-desk",
      "employerType": "SYSTEM",
      "provider": "MemoryMin Archive Desk",
      "category": "MANDATORY",
      "categoryId": "ADMINISTRATION",
      "subcategoryId": "LEDGER_CLEANUP",
      "workCharacterId": "LEDGER_CLEANUP",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-system-administration",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "ADMINISTRATION",
            "value": 2
          },
          {
            "categoryId": "LEDGER_CLEANUP",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "ledger",
        "credits",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-memorymin-archive-desk-lab-observation-l4",
      "title": "Lab Observation",
      "employerId": "memorymin-archive-desk",
      "employerType": "SYSTEM",
      "provider": "MemoryMin Archive Desk",
      "category": "REGULAR",
      "categoryId": "RESEARCH_ASSISTANCE",
      "subcategoryId": "LAB_OBSERVATION",
      "workCharacterId": "LAB_OBSERVATION",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        5
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 5
          },
          {
            "id": "ability-endurance",
            "value": 6
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 6
          },
          {
            "id": "skill-schematic-reading",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "RESEARCH_ASSISTANCE",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 55
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "RESEARCH_ASSISTANCE",
            "value": 3
          },
          {
            "categoryId": "LAB_OBSERVATION",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "lab",
        "research",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-perfectmin-lab-allocation-biometric-sample-prep-l3",
      "title": "Biometric Sample Prep",
      "employerId": "perfectmin-lab-allocation",
      "employerType": "SYSTEM",
      "provider": "PerfectMin Lab Allocation",
      "category": "MANDATORY",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "BIOMETRIC_SAMPLE_PREP",
      "workCharacterId": "BIOMETRIC_SAMPLE_PREP",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2500,
          5000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 2
          },
          {
            "categoryId": "BIOMETRIC_SAMPLE_PREP",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "bio",
        "sample",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-perfectmin-lab-allocation-implant-service-assist-l4",
      "title": "Implant Service Assist",
      "employerId": "perfectmin-lab-allocation",
      "employerType": "SYSTEM",
      "provider": "PerfectMin Lab Allocation",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "IMPLANT_SERVICE_ASSIST",
      "workCharacterId": "IMPLANT_SERVICE_ASSIST",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        5
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 5
          },
          {
            "id": "ability-endurance",
            "value": 6
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 6
          },
          {
            "id": "skill-schematic-reading",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 55
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 3
          },
          {
            "categoryId": "IMPLANT_SERVICE_ASSIST",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "implant",
        "clinic",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-perfectmin-lab-allocation-trauma-stabilization-aux-l5",
      "title": "TRAUMA Stabilization Auxiliary",
      "employerId": "perfectmin-lab-allocation",
      "employerType": "SYSTEM",
      "provider": "PerfectMin Lab Allocation",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "TRAUMA_STABILIZATION_AUX",
      "workCharacterId": "TRAUMA_STABILIZATION_AUX",
      "complexity": "ELITE",
      "level": 5,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3500,
          7000
        ]
      },
      "durationWeeksRange": [
        1,
        6
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 6
          },
          {
            "id": "ability-endurance",
            "value": 7
          },
          {
            "id": "ability-intellect",
            "value": 5
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 7
          },
          {
            "id": "skill-schematic-reading",
            "value": 8
          }
        ],
        "minExperience": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 2
          }
        ],
        "insurance": {
          "profileId": "BIOCHIP_MONITORED"
        },
        "requiredClearance": "CONFIDENTIAL",
        "maxRiskScore": 45
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 4
          },
          {
            "categoryId": "TRAUMA_STABILIZATION_AUX",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.24,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "trauma",
        "clinic",
        "risk",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-perfectmin-lab-allocation-lab-observation-l3",
      "title": "Lab Observation",
      "employerId": "perfectmin-lab-allocation",
      "employerType": "SYSTEM",
      "provider": "PerfectMin Lab Allocation",
      "category": "REGULAR",
      "categoryId": "RESEARCH_ASSISTANCE",
      "subcategoryId": "LAB_OBSERVATION",
      "workCharacterId": "LAB_OBSERVATION",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2500,
          5000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "RESEARCH_ASSISTANCE",
            "value": 2
          },
          {
            "categoryId": "LAB_OBSERVATION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "lab",
        "research",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-perfectmin-lab-allocation-citizen-care-desk-l1",
      "title": "Citizen Care Desk",
      "employerId": "perfectmin-lab-allocation",
      "employerType": "SYSTEM",
      "provider": "PerfectMin Lab Allocation",
      "category": "MANDATORY",
      "categoryId": "CITIZEN_CARE",
      "subcategoryId": "CITIZEN_CARE_DESK",
      "workCharacterId": "CITIZEN_CARE_DESK",
      "complexity": "BASIC",
      "level": 1,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-composure",
            "value": 2
          },
          {
            "id": "ability-charisma",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "CITIZEN_CARE",
            "value": 1
          },
          {
            "categoryId": "CITIZEN_CARE_DESK",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "care",
        "desk",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-metrogrid-access-cargo-dispatch-l2",
      "title": "Cargo Dispatch",
      "employerId": "metrogrid-access",
      "employerType": "SYSTEM",
      "provider": "MetroGrid Access",
      "category": "MANDATORY",
      "categoryId": "TRANSPORT",
      "subcategoryId": "CARGO_DISPATCH",
      "workCharacterId": "CARGO_DISPATCH",
      "complexity": "STANDARD",
      "level": 2,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 3
          },
          {
            "id": "ability-perception",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "TRANSPORT",
            "value": 1
          },
          {
            "categoryId": "CARGO_DISPATCH",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.43,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "transport",
        "dispatch",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-metrogrid-access-metrogrid-inspection-l2",
      "title": "MetroGrid Inspection",
      "employerId": "metrogrid-access",
      "employerType": "SYSTEM",
      "provider": "MetroGrid Access",
      "category": "REGULAR",
      "categoryId": "TRANSPORT",
      "subcategoryId": "METROGRID_INSPECTION",
      "workCharacterId": "METROGRID_INSPECTION",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 3
          },
          {
            "id": "ability-perception",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "TRANSPORT",
            "value": 1
          },
          {
            "categoryId": "METROGRID_INSPECTION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "metro",
        "route",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-metrogrid-access-habitat-maintenance-l1",
      "title": "Habitat Maintenance",
      "employerId": "metrogrid-access",
      "employerType": "SYSTEM",
      "provider": "MetroGrid Access",
      "category": "REGULAR",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "HABITAT_MAINTENANCE",
      "workCharacterId": "HABITAT_MAINTENANCE",
      "complexity": "BASIC",
      "level": 1,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 2
          },
          {
            "id": "ability-intellect",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "HABITAT_MAINTENANCE",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "habitat",
        "maintenance",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-metrogrid-access-sensor-reseat-l2",
      "title": "Sensor Reseat",
      "employerId": "metrogrid-access",
      "employerType": "SYSTEM",
      "provider": "MetroGrid Access",
      "category": "REGULAR",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "SENSOR_RESEAT",
      "workCharacterId": "SENSOR_RESEAT",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 3
          },
          {
            "id": "ability-intellect",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "SENSOR_RESEAT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "sensor",
        "maintenance",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-metrogrid-access-platform-loading-l1",
      "title": "Platform Loading",
      "employerId": "metrogrid-access",
      "employerType": "SYSTEM",
      "provider": "MetroGrid Access",
      "category": "MANDATORY",
      "categoryId": "LOGISTICS",
      "subcategoryId": "PLATFORM_LOADING",
      "workCharacterId": "PLATFORM_LOADING",
      "complexity": "BASIC",
      "level": 1,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 2
          },
          {
            "id": "ability-dexterity",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "LOGISTICS",
            "value": 1
          },
          {
            "categoryId": "PLATFORM_LOADING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "cargo",
        "platform",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-metrogrid-access-ration-route-sort-l1",
      "title": "Ration Route Sort",
      "employerId": "metrogrid-access",
      "employerType": "SYSTEM",
      "provider": "MetroGrid Access",
      "category": "MANDATORY",
      "categoryId": "LOGISTICS",
      "subcategoryId": "RATION_ROUTE_SORT",
      "workCharacterId": "RATION_ROUTE_SORT",
      "complexity": "BASIC",
      "level": 1,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 2
          },
          {
            "id": "ability-dexterity",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "LOGISTICS",
            "value": 1
          },
          {
            "categoryId": "RATION_ROUTE_SORT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "ration",
        "logistics",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-habitat-ledger-habitat-maintenance-l1",
      "title": "Habitat Maintenance",
      "employerId": "habitat-ledger",
      "employerType": "SYSTEM",
      "provider": "Habitat Ledger",
      "category": "MANDATORY",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "HABITAT_MAINTENANCE",
      "workCharacterId": "HABITAT_MAINTENANCE",
      "complexity": "BASIC",
      "level": 1,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 2
          },
          {
            "id": "ability-intellect",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "HABITAT_MAINTENANCE",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "habitat",
        "maintenance",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-habitat-ledger-sensor-reseat-l2",
      "title": "Sensor Reseat",
      "employerId": "habitat-ledger",
      "employerType": "SYSTEM",
      "provider": "Habitat Ledger",
      "category": "REGULAR",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "SENSOR_RESEAT",
      "workCharacterId": "SENSOR_RESEAT",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 3
          },
          {
            "id": "ability-intellect",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "SENSOR_RESEAT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "sensor",
        "maintenance",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-habitat-ledger-domestic-unit-cleaning-l1",
      "title": "Domestic Unit Cleaning",
      "employerId": "habitat-ledger",
      "employerType": "SYSTEM",
      "provider": "Habitat Ledger",
      "category": "REGULAR",
      "categoryId": "DOMESTIC_SERVICE",
      "subcategoryId": "DOMESTIC_UNIT_CLEANING",
      "workCharacterId": "DOMESTIC_UNIT_CLEANING",
      "complexity": "BASIC",
      "level": 1,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "GAMMA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-composure",
            "value": 2
          },
          {
            "id": "ability-dexterity",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DOMESTIC_SERVICE",
            "value": 1
          },
          {
            "categoryId": "DOMESTIC_UNIT_CLEANING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "domestic",
        "service",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-habitat-ledger-form-correction-l2",
      "title": "Form Correction",
      "employerId": "habitat-ledger",
      "employerType": "SYSTEM",
      "provider": "Habitat Ledger",
      "category": "REGULAR",
      "categoryId": "ADMINISTRATION",
      "subcategoryId": "FORM_CORRECTION",
      "workCharacterId": "FORM_CORRECTION",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-composure",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-system-administration",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "ADMINISTRATION",
            "value": 1
          },
          {
            "categoryId": "FORM_CORRECTION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "forms",
        "registry",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-habitat-ledger-registry-review-l2",
      "title": "Registry Review",
      "employerId": "habitat-ledger",
      "employerType": "SYSTEM",
      "provider": "Habitat Ledger",
      "category": "MANDATORY",
      "categoryId": "ADMINISTRATION",
      "subcategoryId": "REGISTRY_REVIEW",
      "workCharacterId": "REGISTRY_REVIEW",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-composure",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-system-administration",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "ADMINISTRATION",
            "value": 1
          },
          {
            "categoryId": "REGISTRY_REVIEW",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.43,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "registry",
        "review",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-habitat-ledger-ledger-cleanup-l2",
      "title": "Ledger Cleanup",
      "employerId": "habitat-ledger",
      "employerType": "SYSTEM",
      "provider": "Habitat Ledger",
      "category": "REGULAR",
      "categoryId": "ADMINISTRATION",
      "subcategoryId": "LEDGER_CLEANUP",
      "workCharacterId": "LEDGER_CLEANUP",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-composure",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-system-administration",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "ADMINISTRATION",
            "value": 1
          },
          {
            "categoryId": "LEDGER_CLEANUP",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "ledger",
        "credits",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-cleanstate-utility-biowaste-sorting-l1",
      "title": "Biowaste Sorting",
      "employerId": "cleanstate-utility",
      "employerType": "SYSTEM",
      "provider": "CleanState Utility",
      "category": "MANDATORY",
      "categoryId": "WASTE_PROCESSING",
      "subcategoryId": "BIOWASTE_SORTING",
      "workCharacterId": "BIOWASTE_SORTING",
      "complexity": "BASIC",
      "level": 1,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "GAMMA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-endurance",
            "value": 2
          },
          {
            "id": "ability-strength",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "WASTE_PROCESSING",
            "value": 1
          },
          {
            "categoryId": "BIOWASTE_SORTING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "waste",
        "hazard",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-cleanstate-utility-toxic-line-cleanout-l2",
      "title": "Toxic Line Cleanout",
      "employerId": "cleanstate-utility",
      "employerType": "SYSTEM",
      "provider": "CleanState Utility",
      "category": "MANDATORY",
      "categoryId": "WASTE_PROCESSING",
      "subcategoryId": "TOXIC_LINE_CLEANOUT",
      "workCharacterId": "TOXIC_LINE_CLEANOUT",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "GAMMA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-endurance",
            "value": 3
          },
          {
            "id": "ability-strength",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-production-line",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "WASTE_PROCESSING",
            "value": 1
          },
          {
            "categoryId": "TOXIC_LINE_CLEANOUT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.43,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "waste",
        "toxic",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-cleanstate-utility-sanitation-block-l1",
      "title": "Sanitation Block",
      "employerId": "cleanstate-utility",
      "employerType": "SYSTEM",
      "provider": "CleanState Utility",
      "category": "MANDATORY",
      "categoryId": "WASTE_PROCESSING",
      "subcategoryId": "SANITATION_BLOCK",
      "workCharacterId": "SANITATION_BLOCK",
      "complexity": "BASIC",
      "level": 1,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "GAMMA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-endurance",
            "value": 2
          },
          {
            "id": "ability-strength",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "WASTE_PROCESSING",
            "value": 1
          },
          {
            "categoryId": "SANITATION_BLOCK",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "sanitation",
        "mandatory",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-cleanstate-utility-habitat-maintenance-l1",
      "title": "Habitat Maintenance",
      "employerId": "cleanstate-utility",
      "employerType": "SYSTEM",
      "provider": "CleanState Utility",
      "category": "REGULAR",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "HABITAT_MAINTENANCE",
      "workCharacterId": "HABITAT_MAINTENANCE",
      "complexity": "BASIC",
      "level": 1,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 2
          },
          {
            "id": "ability-intellect",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "HABITAT_MAINTENANCE",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "habitat",
        "maintenance",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-cleanstate-utility-sensor-reseat-l2",
      "title": "Sensor Reseat",
      "employerId": "cleanstate-utility",
      "employerType": "SYSTEM",
      "provider": "CleanState Utility",
      "category": "MANDATORY",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "SENSOR_RESEAT",
      "workCharacterId": "SENSOR_RESEAT",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 3
          },
          {
            "id": "ability-intellect",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "SENSOR_RESEAT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.43,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "sensor",
        "maintenance",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-cleanstate-utility-factory-line-shift-l1",
      "title": "Factory Line Shift",
      "employerId": "cleanstate-utility",
      "employerType": "SYSTEM",
      "provider": "CleanState Utility",
      "category": "REGULAR",
      "categoryId": "INDUSTRIAL",
      "subcategoryId": "FACTORY_LINE_SHIFT",
      "workCharacterId": "FACTORY_LINE_SHIFT",
      "complexity": "BASIC",
      "level": 1,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-strength",
            "value": 2
          },
          {
            "id": "ability-endurance",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "INDUSTRIAL",
            "value": 1
          },
          {
            "categoryId": "FACTORY_LINE_SHIFT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "factory",
        "line",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-cleanstate-utility-machine-repair-l2",
      "title": "Machine Repair",
      "employerId": "cleanstate-utility",
      "employerType": "SYSTEM",
      "provider": "CleanState Utility",
      "category": "REGULAR",
      "categoryId": "INDUSTRIAL",
      "subcategoryId": "MACHINE_REPAIR",
      "workCharacterId": "MACHINE_REPAIR",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-strength",
            "value": 3
          },
          {
            "id": "ability-endurance",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "INDUSTRIAL",
            "value": 1
          },
          {
            "categoryId": "MACHINE_REPAIR",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "repair",
        "machine",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-cleanstate-utility-schematic-diagnostic-l3",
      "title": "Schematic Diagnostic",
      "employerId": "cleanstate-utility",
      "employerType": "SYSTEM",
      "provider": "CleanState Utility",
      "category": "REGULAR",
      "categoryId": "INDUSTRIAL",
      "subcategoryId": "SCHEMATIC_DIAGNOSTIC",
      "workCharacterId": "SCHEMATIC_DIAGNOSTIC",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-strength",
            "value": 4
          },
          {
            "id": "ability-endurance",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "INDUSTRIAL",
            "value": 2
          },
          {
            "categoryId": "SCHEMATIC_DIAGNOSTIC",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "schematic",
        "diagnostic",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-factory-commons-factory-line-shift-l1",
      "title": "Factory Line Shift",
      "employerId": "factory-commons",
      "employerType": "PRIVATE",
      "provider": "Factory Commons",
      "category": "REGULAR",
      "categoryId": "INDUSTRIAL",
      "subcategoryId": "FACTORY_LINE_SHIFT",
      "workCharacterId": "FACTORY_LINE_SHIFT",
      "complexity": "BASIC",
      "level": 1,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-strength",
            "value": 2
          },
          {
            "id": "ability-endurance",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "INDUSTRIAL",
            "value": 1
          },
          {
            "categoryId": "FACTORY_LINE_SHIFT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "factory",
        "line",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-factory-commons-machine-repair-l2",
      "title": "Machine Repair",
      "employerId": "factory-commons",
      "employerType": "PRIVATE",
      "provider": "Factory Commons",
      "category": "REGULAR",
      "categoryId": "INDUSTRIAL",
      "subcategoryId": "MACHINE_REPAIR",
      "workCharacterId": "MACHINE_REPAIR",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-strength",
            "value": 3
          },
          {
            "id": "ability-endurance",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "INDUSTRIAL",
            "value": 1
          },
          {
            "categoryId": "MACHINE_REPAIR",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "repair",
        "machine",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-factory-commons-schematic-diagnostic-l3",
      "title": "Schematic Diagnostic",
      "employerId": "factory-commons",
      "employerType": "PRIVATE",
      "provider": "Factory Commons",
      "category": "REGULAR",
      "categoryId": "INDUSTRIAL",
      "subcategoryId": "SCHEMATIC_DIAGNOSTIC",
      "workCharacterId": "SCHEMATIC_DIAGNOSTIC",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2500,
          5000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-strength",
            "value": 4
          },
          {
            "id": "ability-endurance",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "INDUSTRIAL",
            "value": 2
          },
          {
            "categoryId": "SCHEMATIC_DIAGNOSTIC",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "schematic",
        "diagnostic",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-factory-commons-habitat-maintenance-l1",
      "title": "Habitat Maintenance",
      "employerId": "factory-commons",
      "employerType": "PRIVATE",
      "provider": "Factory Commons",
      "category": "REGULAR",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "HABITAT_MAINTENANCE",
      "workCharacterId": "HABITAT_MAINTENANCE",
      "complexity": "BASIC",
      "level": 1,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 2
          },
          {
            "id": "ability-intellect",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "HABITAT_MAINTENANCE",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "habitat",
        "maintenance",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-factory-commons-sensor-reseat-l2",
      "title": "Sensor Reseat",
      "employerId": "factory-commons",
      "employerType": "PRIVATE",
      "provider": "Factory Commons",
      "category": "REGULAR",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "SENSOR_RESEAT",
      "workCharacterId": "SENSOR_RESEAT",
      "complexity": "STANDARD",
      "level": 2,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 3
          },
          {
            "id": "ability-intellect",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "SENSOR_RESEAT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "sensor",
        "maintenance",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-factory-commons-platform-loading-l1",
      "title": "Platform Loading",
      "employerId": "factory-commons",
      "employerType": "PRIVATE",
      "provider": "Factory Commons",
      "category": "REGULAR",
      "categoryId": "LOGISTICS",
      "subcategoryId": "PLATFORM_LOADING",
      "workCharacterId": "PLATFORM_LOADING",
      "complexity": "BASIC",
      "level": 1,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 2
          },
          {
            "id": "ability-dexterity",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "LOGISTICS",
            "value": 1
          },
          {
            "categoryId": "PLATFORM_LOADING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "cargo",
        "platform",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-factory-commons-ration-route-sort-l1",
      "title": "Ration Route Sort",
      "employerId": "factory-commons",
      "employerType": "PRIVATE",
      "provider": "Factory Commons",
      "category": "REGULAR",
      "categoryId": "LOGISTICS",
      "subcategoryId": "RATION_ROUTE_SORT",
      "workCharacterId": "RATION_ROUTE_SORT",
      "complexity": "BASIC",
      "level": 1,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 2
          },
          {
            "id": "ability-dexterity",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "LOGISTICS",
            "value": 1
          },
          {
            "categoryId": "RATION_ROUTE_SORT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "ration",
        "logistics",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-kagami-kaisha-endpoint-audit-l4",
      "title": "Endpoint Audit",
      "employerId": "kagami-kaisha",
      "employerType": "PRIVATE",
      "provider": "Kagami Kaisha",
      "category": "REGULAR",
      "categoryId": "NETWORK_SECURITY",
      "subcategoryId": "ENDPOINT_AUDIT",
      "workCharacterId": "ENDPOINT_AUDIT",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3500,
          6500
        ]
      },
      "durationWeeksRange": [
        1,
        5
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 5
          },
          {
            "id": "ability-dexterity",
            "value": 6
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-local-access-routing",
            "value": 6
          },
          {
            "id": "skill-ws-procedures",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "NETWORK_SECURITY",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 55
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "NETWORK_SECURITY",
            "value": 3
          },
          {
            "categoryId": "ENDPOINT_AUDIT",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "network",
        "audit",
        "endpoint",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-kagami-kaisha-intrusion-trace-l5",
      "title": "Intrusion Trace",
      "employerId": "kagami-kaisha",
      "employerType": "PRIVATE",
      "provider": "Kagami Kaisha",
      "category": "REGULAR",
      "categoryId": "NETWORK_SECURITY",
      "subcategoryId": "INTRUSION_TRACE",
      "workCharacterId": "INTRUSION_TRACE",
      "complexity": "ELITE",
      "level": 5,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          4000,
          7500
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 6
          },
          {
            "id": "ability-dexterity",
            "value": 7
          },
          {
            "id": "ability-intellect",
            "value": 5
          }
        ],
        "minSkills": [
          {
            "id": "skill-local-access-routing",
            "value": 7
          },
          {
            "id": "skill-ws-procedures",
            "value": 8
          }
        ],
        "minExperience": [
          {
            "categoryId": "NETWORK_SECURITY",
            "value": 2
          }
        ],
        "insurance": {
          "profileId": "BIOCHIP_MONITORED"
        },
        "requiredClearance": "CONFIDENTIAL",
        "maxRiskScore": 45
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "NETWORK_SECURITY",
            "value": 4
          },
          {
            "categoryId": "INTRUSION_TRACE",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.24,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "network",
        "trace",
        "security",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-kagami-kaisha-firewall-calibration-l3",
      "title": "Firewall Calibration",
      "employerId": "kagami-kaisha",
      "employerType": "PRIVATE",
      "provider": "Kagami Kaisha",
      "category": "REGULAR",
      "categoryId": "NETWORK_SECURITY",
      "subcategoryId": "FIREWALL_CALIBRATION",
      "workCharacterId": "FIREWALL_CALIBRATION",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-local-access-routing",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "NETWORK_SECURITY",
            "value": 2
          },
          {
            "categoryId": "FIREWALL_CALIBRATION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "network",
        "firewall",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-kagami-kaisha-archive-indexing-l3",
      "title": "Archive Indexing",
      "employerId": "kagami-kaisha",
      "employerType": "PRIVATE",
      "provider": "Kagami Kaisha",
      "category": "REGULAR",
      "categoryId": "DATA_PROCESSING",
      "subcategoryId": "ARCHIVE_INDEXING",
      "workCharacterId": "ARCHIVE_INDEXING",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2500,
          5000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DATA_PROCESSING",
            "value": 2
          },
          {
            "categoryId": "ARCHIVE_INDEXING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "archive",
        "data",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-kagami-kaisha-data-sanitization-l3",
      "title": "Data Sanitization",
      "employerId": "kagami-kaisha",
      "employerType": "PRIVATE",
      "provider": "Kagami Kaisha",
      "category": "REGULAR",
      "categoryId": "DATA_PROCESSING",
      "subcategoryId": "DATA_SANITIZATION",
      "workCharacterId": "DATA_SANITIZATION",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2500,
          5000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DATA_PROCESSING",
            "value": 2
          },
          {
            "categoryId": "DATA_SANITIZATION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "data",
        "sync",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-kagami-kaisha-lab-observation-l3",
      "title": "Lab Observation",
      "employerId": "kagami-kaisha",
      "employerType": "PRIVATE",
      "provider": "Kagami Kaisha",
      "category": "REGULAR",
      "categoryId": "RESEARCH_ASSISTANCE",
      "subcategoryId": "LAB_OBSERVATION",
      "workCharacterId": "LAB_OBSERVATION",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "RESEARCH_ASSISTANCE",
            "value": 2
          },
          {
            "categoryId": "LAB_OBSERVATION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "lab",
        "research",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-trauma-team-biometric-sample-prep-l3",
      "title": "Biometric Sample Prep",
      "employerId": "trauma-team",
      "employerType": "PRIVATE",
      "provider": "TRAUMA Team",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "BIOMETRIC_SAMPLE_PREP",
      "workCharacterId": "BIOMETRIC_SAMPLE_PREP",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 2
          },
          {
            "categoryId": "BIOMETRIC_SAMPLE_PREP",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "bio",
        "sample",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-trauma-team-implant-service-assist-l3",
      "title": "Implant Service Assist",
      "employerId": "trauma-team",
      "employerType": "PRIVATE",
      "provider": "TRAUMA Team",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "IMPLANT_SERVICE_ASSIST",
      "workCharacterId": "IMPLANT_SERVICE_ASSIST",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 2
          },
          {
            "categoryId": "IMPLANT_SERVICE_ASSIST",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "implant",
        "clinic",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-trauma-team-trauma-stabilization-aux-l4",
      "title": "TRAUMA Stabilization Auxiliary",
      "employerId": "trauma-team",
      "employerType": "PRIVATE",
      "provider": "TRAUMA Team",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "TRAUMA_STABILIZATION_AUX",
      "workCharacterId": "TRAUMA_STABILIZATION_AUX",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3500,
          6500
        ]
      },
      "durationWeeksRange": [
        1,
        5
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 5
          },
          {
            "id": "ability-endurance",
            "value": 6
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 6
          },
          {
            "id": "skill-schematic-reading",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 55
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 3
          },
          {
            "categoryId": "TRAUMA_STABILIZATION_AUX",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "trauma",
        "clinic",
        "risk",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-trauma-team-field-escort-l3",
      "title": "Field Escort",
      "employerId": "trauma-team",
      "employerType": "PRIVATE",
      "provider": "TRAUMA Team",
      "category": "REGULAR",
      "categoryId": "FIELD_OPERATIONS",
      "subcategoryId": "FIELD_ESCORT",
      "workCharacterId": "FIELD_ESCORT",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-endurance",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "FIELD_OPERATIONS",
            "value": 2
          },
          {
            "categoryId": "FIELD_ESCORT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "field",
        "escort",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-trauma-team-hazard-retrieval-l5",
      "title": "Hazard Retrieval",
      "employerId": "trauma-team",
      "employerType": "PRIVATE",
      "provider": "TRAUMA Team",
      "category": "REGULAR",
      "categoryId": "FIELD_OPERATIONS",
      "subcategoryId": "HAZARD_RETRIEVAL",
      "workCharacterId": "HAZARD_RETRIEVAL",
      "complexity": "ELITE",
      "level": 5,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          4000,
          7500
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 6
          },
          {
            "id": "ability-endurance",
            "value": 7
          },
          {
            "id": "ability-strength",
            "value": 5
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 7
          },
          {
            "id": "skill-tool-improvisation",
            "value": 8
          }
        ],
        "minExperience": [
          {
            "categoryId": "FIELD_OPERATIONS",
            "value": 2
          }
        ],
        "insurance": {
          "profileId": "BIOCHIP_MONITORED"
        },
        "requiredClearance": "CONFIDENTIAL",
        "maxRiskScore": 45
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "FIELD_OPERATIONS",
            "value": 4
          },
          {
            "categoryId": "HAZARD_RETRIEVAL",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.24,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "hazard",
        "retrieval",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-trauma-team-citizen-care-desk-l2",
      "title": "Citizen Care Desk",
      "employerId": "trauma-team",
      "employerType": "PRIVATE",
      "provider": "TRAUMA Team",
      "category": "REGULAR",
      "categoryId": "CITIZEN_CARE",
      "subcategoryId": "CITIZEN_CARE_DESK",
      "workCharacterId": "CITIZEN_CARE_DESK",
      "complexity": "STANDARD",
      "level": 2,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-composure",
            "value": 3
          },
          {
            "id": "ability-charisma",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-form-correction",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "CITIZEN_CARE",
            "value": 1
          },
          {
            "categoryId": "CITIZEN_CARE_DESK",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "care",
        "desk",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-live-prevail-citizen-care-desk-l1",
      "title": "Citizen Care Desk",
      "employerId": "live-prevail",
      "employerType": "SYSTEM",
      "provider": "Live & Prevail",
      "category": "MANDATORY",
      "categoryId": "CITIZEN_CARE",
      "subcategoryId": "CITIZEN_CARE_DESK",
      "workCharacterId": "CITIZEN_CARE_DESK",
      "complexity": "BASIC",
      "level": 1,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-composure",
            "value": 2
          },
          {
            "id": "ability-charisma",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "CITIZEN_CARE",
            "value": 1
          },
          {
            "categoryId": "CITIZEN_CARE_DESK",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "care",
        "desk",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-live-prevail-biometric-sample-prep-l3",
      "title": "Biometric Sample Prep",
      "employerId": "live-prevail",
      "employerType": "SYSTEM",
      "provider": "Live & Prevail",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "BIOMETRIC_SAMPLE_PREP",
      "workCharacterId": "BIOMETRIC_SAMPLE_PREP",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2500,
          5000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 2
          },
          {
            "categoryId": "BIOMETRIC_SAMPLE_PREP",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "bio",
        "sample",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-live-prevail-implant-service-assist-l3",
      "title": "Implant Service Assist",
      "employerId": "live-prevail",
      "employerType": "SYSTEM",
      "provider": "Live & Prevail",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "IMPLANT_SERVICE_ASSIST",
      "workCharacterId": "IMPLANT_SERVICE_ASSIST",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2500,
          5000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 2
          },
          {
            "categoryId": "IMPLANT_SERVICE_ASSIST",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "implant",
        "clinic",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-live-prevail-trauma-stabilization-aux-l4",
      "title": "TRAUMA Stabilization Auxiliary",
      "employerId": "live-prevail",
      "employerType": "SYSTEM",
      "provider": "Live & Prevail",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "TRAUMA_STABILIZATION_AUX",
      "workCharacterId": "TRAUMA_STABILIZATION_AUX",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 5
          },
          {
            "id": "ability-endurance",
            "value": 6
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 6
          },
          {
            "id": "skill-schematic-reading",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 55
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 3
          },
          {
            "categoryId": "TRAUMA_STABILIZATION_AUX",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "trauma",
        "clinic",
        "risk",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-live-prevail-subscription-recovery-l1",
      "title": "Subscription Recovery",
      "employerId": "live-prevail",
      "employerType": "SYSTEM",
      "provider": "Live & Prevail",
      "category": "MANDATORY",
      "categoryId": "SUBSCRIPTION_SALES",
      "subcategoryId": "SUBSCRIPTION_RECOVERY",
      "workCharacterId": "SUBSCRIPTION_RECOVERY",
      "complexity": "BASIC",
      "level": 1,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-charisma",
            "value": 2
          },
          {
            "id": "ability-intellect",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SUBSCRIPTION_SALES",
            "value": 1
          },
          {
            "categoryId": "SUBSCRIPTION_RECOVERY",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "subscription",
        "debt",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-live-prevail-tier-upsell-desk-l2",
      "title": "Tier Upsell Desk",
      "employerId": "live-prevail",
      "employerType": "SYSTEM",
      "provider": "Live & Prevail",
      "category": "REGULAR",
      "categoryId": "SUBSCRIPTION_SALES",
      "subcategoryId": "TIER_UPSELL_DESK",
      "workCharacterId": "TIER_UPSELL_DESK",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-charisma",
            "value": 3
          },
          {
            "id": "ability-intellect",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-form-correction",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SUBSCRIPTION_SALES",
            "value": 1
          },
          {
            "categoryId": "TIER_UPSELL_DESK",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "subscription",
        "sales",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-coremed-service-biometric-sample-prep-l3",
      "title": "Biometric Sample Prep",
      "employerId": "coremed-service",
      "employerType": "PRIVATE",
      "provider": "CoreMed Service",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "BIOMETRIC_SAMPLE_PREP",
      "workCharacterId": "BIOMETRIC_SAMPLE_PREP",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 2
          },
          {
            "categoryId": "BIOMETRIC_SAMPLE_PREP",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "bio",
        "sample",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-coremed-service-implant-service-assist-l3",
      "title": "Implant Service Assist",
      "employerId": "coremed-service",
      "employerType": "PRIVATE",
      "provider": "CoreMed Service",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "IMPLANT_SERVICE_ASSIST",
      "workCharacterId": "IMPLANT_SERVICE_ASSIST",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 2
          },
          {
            "categoryId": "IMPLANT_SERVICE_ASSIST",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "implant",
        "clinic",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-coremed-service-trauma-stabilization-aux-l4",
      "title": "TRAUMA Stabilization Auxiliary",
      "employerId": "coremed-service",
      "employerType": "PRIVATE",
      "provider": "CoreMed Service",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "TRAUMA_STABILIZATION_AUX",
      "workCharacterId": "TRAUMA_STABILIZATION_AUX",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3500,
          6500
        ]
      },
      "durationWeeksRange": [
        1,
        5
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 5
          },
          {
            "id": "ability-endurance",
            "value": 6
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 6
          },
          {
            "id": "skill-schematic-reading",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 55
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 3
          },
          {
            "categoryId": "TRAUMA_STABILIZATION_AUX",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "trauma",
        "clinic",
        "risk",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-coremed-service-habitat-maintenance-l1",
      "title": "Habitat Maintenance",
      "employerId": "coremed-service",
      "employerType": "PRIVATE",
      "provider": "CoreMed Service",
      "category": "REGULAR",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "HABITAT_MAINTENANCE",
      "workCharacterId": "HABITAT_MAINTENANCE",
      "complexity": "BASIC",
      "level": 1,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 2
          },
          {
            "id": "ability-intellect",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "HABITAT_MAINTENANCE",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "habitat",
        "maintenance",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-coremed-service-sensor-reseat-l2",
      "title": "Sensor Reseat",
      "employerId": "coremed-service",
      "employerType": "PRIVATE",
      "provider": "CoreMed Service",
      "category": "REGULAR",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "SENSOR_RESEAT",
      "workCharacterId": "SENSOR_RESEAT",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 3
          },
          {
            "id": "ability-intellect",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "SENSOR_RESEAT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "sensor",
        "maintenance",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-coremed-service-citizen-care-desk-l1",
      "title": "Citizen Care Desk",
      "employerId": "coremed-service",
      "employerType": "PRIVATE",
      "provider": "CoreMed Service",
      "category": "REGULAR",
      "categoryId": "CITIZEN_CARE",
      "subcategoryId": "CITIZEN_CARE_DESK",
      "workCharacterId": "CITIZEN_CARE_DESK",
      "complexity": "BASIC",
      "level": 1,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-composure",
            "value": 2
          },
          {
            "id": "ability-charisma",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "CITIZEN_CARE",
            "value": 1
          },
          {
            "categoryId": "CITIZEN_CARE_DESK",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "care",
        "desk",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-vector-cabline-cargo-dispatch-l2",
      "title": "Cargo Dispatch",
      "employerId": "vector-cabline",
      "employerType": "PRIVATE",
      "provider": "Vector Cabline",
      "category": "REGULAR",
      "categoryId": "TRANSPORT",
      "subcategoryId": "CARGO_DISPATCH",
      "workCharacterId": "CARGO_DISPATCH",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 3
          },
          {
            "id": "ability-perception",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "TRANSPORT",
            "value": 1
          },
          {
            "categoryId": "CARGO_DISPATCH",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "transport",
        "dispatch",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-vector-cabline-metrogrid-inspection-l2",
      "title": "MetroGrid Inspection",
      "employerId": "vector-cabline",
      "employerType": "PRIVATE",
      "provider": "Vector Cabline",
      "category": "REGULAR",
      "categoryId": "TRANSPORT",
      "subcategoryId": "METROGRID_INSPECTION",
      "workCharacterId": "METROGRID_INSPECTION",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 3
          },
          {
            "id": "ability-perception",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "TRANSPORT",
            "value": 1
          },
          {
            "categoryId": "METROGRID_INSPECTION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "metro",
        "route",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-vector-cabline-field-escort-l3",
      "title": "Field Escort",
      "employerId": "vector-cabline",
      "employerType": "PRIVATE",
      "provider": "Vector Cabline",
      "category": "REGULAR",
      "categoryId": "FIELD_OPERATIONS",
      "subcategoryId": "FIELD_ESCORT",
      "workCharacterId": "FIELD_ESCORT",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-endurance",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "FIELD_OPERATIONS",
            "value": 2
          },
          {
            "categoryId": "FIELD_ESCORT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "field",
        "escort",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-vector-cabline-hazard-retrieval-l4",
      "title": "Hazard Retrieval",
      "employerId": "vector-cabline",
      "employerType": "PRIVATE",
      "provider": "Vector Cabline",
      "category": "REGULAR",
      "categoryId": "FIELD_OPERATIONS",
      "subcategoryId": "HAZARD_RETRIEVAL",
      "workCharacterId": "HAZARD_RETRIEVAL",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3500,
          6500
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 5
          },
          {
            "id": "ability-endurance",
            "value": 6
          },
          {
            "id": "ability-strength",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 6
          },
          {
            "id": "skill-tool-improvisation",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "FIELD_OPERATIONS",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "TRAUMA_RESPONSE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 55
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "FIELD_OPERATIONS",
            "value": 3
          },
          {
            "categoryId": "HAZARD_RETRIEVAL",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "hazard",
        "retrieval",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-vector-cabline-platform-loading-l1",
      "title": "Platform Loading",
      "employerId": "vector-cabline",
      "employerType": "PRIVATE",
      "provider": "Vector Cabline",
      "category": "REGULAR",
      "categoryId": "LOGISTICS",
      "subcategoryId": "PLATFORM_LOADING",
      "workCharacterId": "PLATFORM_LOADING",
      "complexity": "BASIC",
      "level": 1,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 2
          },
          {
            "id": "ability-dexterity",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "LOGISTICS",
            "value": 1
          },
          {
            "categoryId": "PLATFORM_LOADING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "cargo",
        "platform",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-vector-cabline-ration-route-sort-l1",
      "title": "Ration Route Sort",
      "employerId": "vector-cabline",
      "employerType": "PRIVATE",
      "provider": "Vector Cabline",
      "category": "REGULAR",
      "categoryId": "LOGISTICS",
      "subcategoryId": "RATION_ROUTE_SORT",
      "workCharacterId": "RATION_ROUTE_SORT",
      "complexity": "BASIC",
      "level": 1,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 2
          },
          {
            "id": "ability-dexterity",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "LOGISTICS",
            "value": 1
          },
          {
            "categoryId": "RATION_ROUTE_SORT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "ration",
        "logistics",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-helix-table-domestic-unit-cleaning-l1",
      "title": "Domestic Unit Cleaning",
      "employerId": "helix-table",
      "employerType": "PRIVATE",
      "provider": "Helix Table",
      "category": "REGULAR",
      "categoryId": "DOMESTIC_SERVICE",
      "subcategoryId": "DOMESTIC_UNIT_CLEANING",
      "workCharacterId": "DOMESTIC_UNIT_CLEANING",
      "complexity": "BASIC",
      "level": 1,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "GAMMA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-composure",
            "value": 2
          },
          {
            "id": "ability-dexterity",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DOMESTIC_SERVICE",
            "value": 1
          },
          {
            "categoryId": "DOMESTIC_UNIT_CLEANING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "domestic",
        "service",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-helix-table-citizen-care-desk-l1",
      "title": "Citizen Care Desk",
      "employerId": "helix-table",
      "employerType": "PRIVATE",
      "provider": "Helix Table",
      "category": "REGULAR",
      "categoryId": "CITIZEN_CARE",
      "subcategoryId": "CITIZEN_CARE_DESK",
      "workCharacterId": "CITIZEN_CARE_DESK",
      "complexity": "BASIC",
      "level": 1,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-composure",
            "value": 2
          },
          {
            "id": "ability-charisma",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "CITIZEN_CARE",
            "value": 1
          },
          {
            "categoryId": "CITIZEN_CARE_DESK",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "care",
        "desk",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-helix-table-subscription-recovery-l1",
      "title": "Subscription Recovery",
      "employerId": "helix-table",
      "employerType": "PRIVATE",
      "provider": "Helix Table",
      "category": "REGULAR",
      "categoryId": "SUBSCRIPTION_SALES",
      "subcategoryId": "SUBSCRIPTION_RECOVERY",
      "workCharacterId": "SUBSCRIPTION_RECOVERY",
      "complexity": "BASIC",
      "level": 1,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-charisma",
            "value": 2
          },
          {
            "id": "ability-intellect",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SUBSCRIPTION_SALES",
            "value": 1
          },
          {
            "categoryId": "SUBSCRIPTION_RECOVERY",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "subscription",
        "debt",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-helix-table-tier-upsell-desk-l2",
      "title": "Tier Upsell Desk",
      "employerId": "helix-table",
      "employerType": "PRIVATE",
      "provider": "Helix Table",
      "category": "REGULAR",
      "categoryId": "SUBSCRIPTION_SALES",
      "subcategoryId": "TIER_UPSELL_DESK",
      "workCharacterId": "TIER_UPSELL_DESK",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-charisma",
            "value": 3
          },
          {
            "id": "ability-intellect",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-form-correction",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SUBSCRIPTION_SALES",
            "value": 1
          },
          {
            "categoryId": "TIER_UPSELL_DESK",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "subscription",
        "sales",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-aurum-skinworks-biometric-sample-prep-l3",
      "title": "Biometric Sample Prep",
      "employerId": "aurum-skinworks",
      "employerType": "PRIVATE",
      "provider": "Aurum Skinworks",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "BIOMETRIC_SAMPLE_PREP",
      "workCharacterId": "BIOMETRIC_SAMPLE_PREP",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 2
          },
          {
            "categoryId": "BIOMETRIC_SAMPLE_PREP",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "bio",
        "sample",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-aurum-skinworks-implant-service-assist-l3",
      "title": "Implant Service Assist",
      "employerId": "aurum-skinworks",
      "employerType": "PRIVATE",
      "provider": "Aurum Skinworks",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "IMPLANT_SERVICE_ASSIST",
      "workCharacterId": "IMPLANT_SERVICE_ASSIST",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 2
          },
          {
            "categoryId": "IMPLANT_SERVICE_ASSIST",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "implant",
        "clinic",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-aurum-skinworks-trauma-stabilization-aux-l4",
      "title": "TRAUMA Stabilization Auxiliary",
      "employerId": "aurum-skinworks",
      "employerType": "PRIVATE",
      "provider": "Aurum Skinworks",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "TRAUMA_STABILIZATION_AUX",
      "workCharacterId": "TRAUMA_STABILIZATION_AUX",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3500,
          6500
        ]
      },
      "durationWeeksRange": [
        1,
        5
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 5
          },
          {
            "id": "ability-endurance",
            "value": 6
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 6
          },
          {
            "id": "skill-schematic-reading",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 55
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 3
          },
          {
            "categoryId": "TRAUMA_STABILIZATION_AUX",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "trauma",
        "clinic",
        "risk",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-aurum-skinworks-domestic-unit-cleaning-l1",
      "title": "Domestic Unit Cleaning",
      "employerId": "aurum-skinworks",
      "employerType": "PRIVATE",
      "provider": "Aurum Skinworks",
      "category": "REGULAR",
      "categoryId": "DOMESTIC_SERVICE",
      "subcategoryId": "DOMESTIC_UNIT_CLEANING",
      "workCharacterId": "DOMESTIC_UNIT_CLEANING",
      "complexity": "BASIC",
      "level": 1,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "GAMMA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-composure",
            "value": 2
          },
          {
            "id": "ability-dexterity",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DOMESTIC_SERVICE",
            "value": 1
          },
          {
            "categoryId": "DOMESTIC_UNIT_CLEANING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "domestic",
        "service",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-aurum-skinworks-subscription-recovery-l1",
      "title": "Subscription Recovery",
      "employerId": "aurum-skinworks",
      "employerType": "PRIVATE",
      "provider": "Aurum Skinworks",
      "category": "REGULAR",
      "categoryId": "SUBSCRIPTION_SALES",
      "subcategoryId": "SUBSCRIPTION_RECOVERY",
      "workCharacterId": "SUBSCRIPTION_RECOVERY",
      "complexity": "BASIC",
      "level": 1,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-charisma",
            "value": 2
          },
          {
            "id": "ability-intellect",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SUBSCRIPTION_SALES",
            "value": 1
          },
          {
            "categoryId": "SUBSCRIPTION_RECOVERY",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "subscription",
        "debt",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-aurum-skinworks-tier-upsell-desk-l2",
      "title": "Tier Upsell Desk",
      "employerId": "aurum-skinworks",
      "employerType": "PRIVATE",
      "provider": "Aurum Skinworks",
      "category": "REGULAR",
      "categoryId": "SUBSCRIPTION_SALES",
      "subcategoryId": "TIER_UPSELL_DESK",
      "workCharacterId": "TIER_UPSELL_DESK",
      "complexity": "STANDARD",
      "level": 2,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-charisma",
            "value": 3
          },
          {
            "id": "ability-intellect",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-form-correction",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "SUBSCRIPTION_SALES",
            "value": 1
          },
          {
            "categoryId": "TIER_UPSELL_DESK",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "subscription",
        "sales",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-cortex-ladder-lab-observation-l4",
      "title": "Lab Observation",
      "employerId": "cortex-ladder",
      "employerType": "PRIVATE",
      "provider": "Cortex Ladder",
      "category": "REGULAR",
      "categoryId": "RESEARCH_ASSISTANCE",
      "subcategoryId": "LAB_OBSERVATION",
      "workCharacterId": "LAB_OBSERVATION",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3500,
          6500
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 5
          },
          {
            "id": "ability-endurance",
            "value": 6
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 6
          },
          {
            "id": "skill-schematic-reading",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "RESEARCH_ASSISTANCE",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 55
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "RESEARCH_ASSISTANCE",
            "value": 3
          },
          {
            "categoryId": "LAB_OBSERVATION",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "lab",
        "research",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-cortex-ladder-archive-indexing-l2",
      "title": "Archive Indexing",
      "employerId": "cortex-ladder",
      "employerType": "PRIVATE",
      "provider": "Cortex Ladder",
      "category": "REGULAR",
      "categoryId": "DATA_PROCESSING",
      "subcategoryId": "ARCHIVE_INDEXING",
      "workCharacterId": "ARCHIVE_INDEXING",
      "complexity": "STANDARD",
      "level": 2,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-perception",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DATA_PROCESSING",
            "value": 1
          },
          {
            "categoryId": "ARCHIVE_INDEXING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "archive",
        "data",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-cortex-ladder-data-sanitization-l4",
      "title": "Data Sanitization",
      "employerId": "cortex-ladder",
      "employerType": "PRIVATE",
      "provider": "Cortex Ladder",
      "category": "REGULAR",
      "categoryId": "DATA_PROCESSING",
      "subcategoryId": "DATA_SANITIZATION",
      "workCharacterId": "DATA_SANITIZATION",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 5
          },
          {
            "id": "ability-reflex",
            "value": 6
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 6
          },
          {
            "id": "skill-system-administration",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "DATA_PROCESSING",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 55
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DATA_PROCESSING",
            "value": 3
          },
          {
            "categoryId": "DATA_SANITIZATION",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "data",
        "sync",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-cortex-ladder-endpoint-audit-l4",
      "title": "Endpoint Audit",
      "employerId": "cortex-ladder",
      "employerType": "PRIVATE",
      "provider": "Cortex Ladder",
      "category": "REGULAR",
      "categoryId": "NETWORK_SECURITY",
      "subcategoryId": "ENDPOINT_AUDIT",
      "workCharacterId": "ENDPOINT_AUDIT",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3500,
          6500
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 5
          },
          {
            "id": "ability-dexterity",
            "value": 6
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-local-access-routing",
            "value": 6
          },
          {
            "id": "skill-ws-procedures",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "NETWORK_SECURITY",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 55
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "NETWORK_SECURITY",
            "value": 3
          },
          {
            "categoryId": "ENDPOINT_AUDIT",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "network",
        "audit",
        "endpoint",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-cortex-ladder-intrusion-trace-l4",
      "title": "Intrusion Trace",
      "employerId": "cortex-ladder",
      "employerType": "PRIVATE",
      "provider": "Cortex Ladder",
      "category": "REGULAR",
      "categoryId": "NETWORK_SECURITY",
      "subcategoryId": "INTRUSION_TRACE",
      "workCharacterId": "INTRUSION_TRACE",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3500,
          6500
        ]
      },
      "durationWeeksRange": [
        1,
        5
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 5
          },
          {
            "id": "ability-dexterity",
            "value": 6
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-local-access-routing",
            "value": 6
          },
          {
            "id": "skill-ws-procedures",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "NETWORK_SECURITY",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 55
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "NETWORK_SECURITY",
            "value": 3
          },
          {
            "categoryId": "INTRUSION_TRACE",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "network",
        "trace",
        "security",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-cortex-ladder-firewall-calibration-l3",
      "title": "Firewall Calibration",
      "employerId": "cortex-ladder",
      "employerType": "PRIVATE",
      "provider": "Cortex Ladder",
      "category": "REGULAR",
      "categoryId": "NETWORK_SECURITY",
      "subcategoryId": "FIREWALL_CALIBRATION",
      "workCharacterId": "FIREWALL_CALIBRATION",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-local-access-routing",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "NETWORK_SECURITY",
            "value": 2
          },
          {
            "categoryId": "FIREWALL_CALIBRATION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "network",
        "firewall",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-somnacore-citizen-care-desk-l1",
      "title": "Citizen Care Desk",
      "employerId": "somnacore",
      "employerType": "PRIVATE",
      "provider": "SomnaCore",
      "category": "REGULAR",
      "categoryId": "CITIZEN_CARE",
      "subcategoryId": "CITIZEN_CARE_DESK",
      "workCharacterId": "CITIZEN_CARE_DESK",
      "complexity": "BASIC",
      "level": 1,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-composure",
            "value": 2
          },
          {
            "id": "ability-charisma",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "CITIZEN_CARE",
            "value": 1
          },
          {
            "categoryId": "CITIZEN_CARE_DESK",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "care",
        "desk",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-somnacore-biometric-sample-prep-l3",
      "title": "Biometric Sample Prep",
      "employerId": "somnacore",
      "employerType": "PRIVATE",
      "provider": "SomnaCore",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "BIOMETRIC_SAMPLE_PREP",
      "workCharacterId": "BIOMETRIC_SAMPLE_PREP",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 2
          },
          {
            "categoryId": "BIOMETRIC_SAMPLE_PREP",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "bio",
        "sample",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-somnacore-implant-service-assist-l3",
      "title": "Implant Service Assist",
      "employerId": "somnacore",
      "employerType": "PRIVATE",
      "provider": "SomnaCore",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "IMPLANT_SERVICE_ASSIST",
      "workCharacterId": "IMPLANT_SERVICE_ASSIST",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          6000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 2
          },
          {
            "categoryId": "IMPLANT_SERVICE_ASSIST",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "implant",
        "clinic",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-somnacore-trauma-stabilization-aux-l4",
      "title": "TRAUMA Stabilization Auxiliary",
      "employerId": "somnacore",
      "employerType": "PRIVATE",
      "provider": "SomnaCore",
      "category": "REGULAR",
      "categoryId": "BIOMEDICAL",
      "subcategoryId": "TRAUMA_STABILIZATION_AUX",
      "workCharacterId": "TRAUMA_STABILIZATION_AUX",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3500,
          6500
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 5
          },
          {
            "id": "ability-endurance",
            "value": 6
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 6
          },
          {
            "id": "skill-schematic-reading",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "MEDICAL_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 55
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BIOMEDICAL",
            "value": 3
          },
          {
            "categoryId": "TRAUMA_STABILIZATION_AUX",
            "value": 1
          }
        ],
        "riskScoreImpact": 1
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "trauma",
        "clinic",
        "risk",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-somnacore-archive-indexing-l2",
      "title": "Archive Indexing",
      "employerId": "somnacore",
      "employerType": "PRIVATE",
      "provider": "SomnaCore",
      "category": "REGULAR",
      "categoryId": "DATA_PROCESSING",
      "subcategoryId": "ARCHIVE_INDEXING",
      "workCharacterId": "ARCHIVE_INDEXING",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-perception",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DATA_PROCESSING",
            "value": 1
          },
          {
            "categoryId": "ARCHIVE_INDEXING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "archive",
        "data",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-somnacore-data-sanitization-l3",
      "title": "Data Sanitization",
      "employerId": "somnacore",
      "employerType": "PRIVATE",
      "provider": "SomnaCore",
      "category": "REGULAR",
      "categoryId": "DATA_PROCESSING",
      "subcategoryId": "DATA_SANITIZATION",
      "workCharacterId": "DATA_SANITIZATION",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2500,
          5000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DATA_PROCESSING",
            "value": 2
          },
          {
            "categoryId": "DATA_SANITIZATION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "data",
        "sync",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-local-service-registry-form-correction-l2",
      "title": "Form Correction",
      "employerId": "local-service-registry",
      "employerType": "SYSTEM",
      "provider": "LOCAL SERVICE REGISTRY",
      "category": "MANDATORY",
      "categoryId": "ADMINISTRATION",
      "subcategoryId": "FORM_CORRECTION",
      "workCharacterId": "FORM_CORRECTION",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-composure",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-system-administration",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "ADMINISTRATION",
            "value": 1
          },
          {
            "categoryId": "FORM_CORRECTION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.43,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "forms",
        "registry",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-local-service-registry-registry-review-l2",
      "title": "Registry Review",
      "employerId": "local-service-registry",
      "employerType": "SYSTEM",
      "provider": "LOCAL SERVICE REGISTRY",
      "category": "REGULAR",
      "categoryId": "ADMINISTRATION",
      "subcategoryId": "REGISTRY_REVIEW",
      "workCharacterId": "REGISTRY_REVIEW",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-composure",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-system-administration",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "ADMINISTRATION",
            "value": 1
          },
          {
            "categoryId": "REGISTRY_REVIEW",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "registry",
        "review",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-local-service-registry-ledger-cleanup-l2",
      "title": "Ledger Cleanup",
      "employerId": "local-service-registry",
      "employerType": "SYSTEM",
      "provider": "LOCAL SERVICE REGISTRY",
      "category": "REGULAR",
      "categoryId": "ADMINISTRATION",
      "subcategoryId": "LEDGER_CLEANUP",
      "workCharacterId": "LEDGER_CLEANUP",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-composure",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-system-administration",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "ADMINISTRATION",
            "value": 1
          },
          {
            "categoryId": "LEDGER_CLEANUP",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "ledger",
        "credits",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-local-service-registry-platform-loading-l1",
      "title": "Platform Loading",
      "employerId": "local-service-registry",
      "employerType": "SYSTEM",
      "provider": "LOCAL SERVICE REGISTRY",
      "category": "MANDATORY",
      "categoryId": "LOGISTICS",
      "subcategoryId": "PLATFORM_LOADING",
      "workCharacterId": "PLATFORM_LOADING",
      "complexity": "BASIC",
      "level": 1,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 2
          },
          {
            "id": "ability-dexterity",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "LOGISTICS",
            "value": 1
          },
          {
            "categoryId": "PLATFORM_LOADING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "cargo",
        "platform",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-local-service-registry-ration-route-sort-l1",
      "title": "Ration Route Sort",
      "employerId": "local-service-registry",
      "employerType": "SYSTEM",
      "provider": "LOCAL SERVICE REGISTRY",
      "category": "MANDATORY",
      "categoryId": "LOGISTICS",
      "subcategoryId": "RATION_ROUTE_SORT",
      "workCharacterId": "RATION_ROUTE_SORT",
      "complexity": "BASIC",
      "level": 1,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 2
          },
          {
            "id": "ability-dexterity",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "LOGISTICS",
            "value": 1
          },
          {
            "categoryId": "RATION_ROUTE_SORT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "ration",
        "logistics",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-local-service-registry-habitat-maintenance-l1",
      "title": "Habitat Maintenance",
      "employerId": "local-service-registry",
      "employerType": "SYSTEM",
      "provider": "LOCAL SERVICE REGISTRY",
      "category": "REGULAR",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "HABITAT_MAINTENANCE",
      "workCharacterId": "HABITAT_MAINTENANCE",
      "complexity": "BASIC",
      "level": 1,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 2
          },
          {
            "id": "ability-intellect",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "HABITAT_MAINTENANCE",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "habitat",
        "maintenance",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-local-service-registry-sensor-reseat-l2",
      "title": "Sensor Reseat",
      "employerId": "local-service-registry",
      "employerType": "SYSTEM",
      "provider": "LOCAL SERVICE REGISTRY",
      "category": "REGULAR",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "SENSOR_RESEAT",
      "workCharacterId": "SENSOR_RESEAT",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 3
          },
          {
            "id": "ability-intellect",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "SENSOR_RESEAT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "sensor",
        "maintenance",
        "system",
        "regular"
      ]
    },
    {
      "id": "tpl-local-service-registry-biowaste-sorting-l1",
      "title": "Biowaste Sorting",
      "employerId": "local-service-registry",
      "employerType": "SYSTEM",
      "provider": "LOCAL SERVICE REGISTRY",
      "category": "MANDATORY",
      "categoryId": "WASTE_PROCESSING",
      "subcategoryId": "BIOWASTE_SORTING",
      "workCharacterId": "BIOWASTE_SORTING",
      "complexity": "BASIC",
      "level": 1,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "GAMMA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-endurance",
            "value": 2
          },
          {
            "id": "ability-strength",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "WASTE_PROCESSING",
            "value": 1
          },
          {
            "categoryId": "BIOWASTE_SORTING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "waste",
        "hazard",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-local-service-registry-toxic-line-cleanout-l2",
      "title": "Toxic Line Cleanout",
      "employerId": "local-service-registry",
      "employerType": "SYSTEM",
      "provider": "LOCAL SERVICE REGISTRY",
      "category": "MANDATORY",
      "categoryId": "WASTE_PROCESSING",
      "subcategoryId": "TOXIC_LINE_CLEANOUT",
      "workCharacterId": "TOXIC_LINE_CLEANOUT",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "GAMMA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-endurance",
            "value": 3
          },
          {
            "id": "ability-strength",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-production-line",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "WASTE_PROCESSING",
            "value": 1
          },
          {
            "categoryId": "TOXIC_LINE_CLEANOUT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.43,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "waste",
        "toxic",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-local-service-registry-sanitation-block-l1",
      "title": "Sanitation Block",
      "employerId": "local-service-registry",
      "employerType": "SYSTEM",
      "provider": "LOCAL SERVICE REGISTRY",
      "category": "MANDATORY",
      "categoryId": "WASTE_PROCESSING",
      "subcategoryId": "SANITATION_BLOCK",
      "workCharacterId": "SANITATION_BLOCK",
      "complexity": "BASIC",
      "level": 1,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1000,
          2000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "GAMMA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-endurance",
            "value": 2
          },
          {
            "id": "ability-strength",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "WASTE_PROCESSING",
            "value": 1
          },
          {
            "categoryId": "SANITATION_BLOCK",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.47,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "sanitation",
        "mandatory",
        "system",
        "mandatory"
      ]
    },
    {
      "id": "tpl-offrecord-broker-private-courier-drop-l2",
      "title": "Private Courier Drop",
      "employerId": "offrecord-broker",
      "employerType": "BLACK",
      "provider": "Off-Record Broker",
      "category": "REGULAR",
      "categoryId": "BLACK_MARKET",
      "subcategoryId": "PRIVATE_COURIER_DROP",
      "workCharacterId": "PRIVATE_COURIER_DROP",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4500
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA",
          "NONE"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 3
          },
          {
            "id": "ability-charisma",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-tool-improvisation",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "OFF_RECORD_WAIVED"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 100
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BLACK_MARKET",
            "value": 1
          },
          {
            "categoryId": "PRIVATE_COURIER_DROP",
            "value": 1
          }
        ],
        "riskScoreImpact": 3
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "black",
        "courier",
        "black",
        "regular"
      ]
    },
    {
      "id": "tpl-offrecord-broker-unlicensed-repair-l3",
      "title": "Unlicensed Repair",
      "employerId": "offrecord-broker",
      "employerType": "BLACK",
      "provider": "Off-Record Broker",
      "category": "REGULAR",
      "categoryId": "BLACK_MARKET",
      "subcategoryId": "UNLICENSED_REPAIR",
      "workCharacterId": "UNLICENSED_REPAIR",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          5500
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA",
          "NONE"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-charisma",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-tool-improvisation",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BIOCHIP_DISALLOWED"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 100
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BLACK_MARKET",
            "value": 2
          },
          {
            "categoryId": "UNLICENSED_REPAIR",
            "value": 1
          }
        ],
        "riskScoreImpact": 3
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "black",
        "repair",
        "black",
        "regular"
      ]
    },
    {
      "id": "tpl-offrecord-broker-field-escort-l3",
      "title": "Field Escort",
      "employerId": "offrecord-broker",
      "employerType": "BLACK",
      "provider": "Off-Record Broker",
      "category": "REGULAR",
      "categoryId": "FIELD_OPERATIONS",
      "subcategoryId": "FIELD_ESCORT",
      "workCharacterId": "FIELD_ESCORT",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3500,
          6500
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA",
          "NONE"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-endurance",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BIOCHIP_DISALLOWED"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 100
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "FIELD_OPERATIONS",
            "value": 2
          },
          {
            "categoryId": "FIELD_ESCORT",
            "value": 1
          }
        ],
        "riskScoreImpact": 3
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "field",
        "escort",
        "black",
        "regular"
      ]
    },
    {
      "id": "tpl-offrecord-broker-hazard-retrieval-l4",
      "title": "Hazard Retrieval",
      "employerId": "offrecord-broker",
      "employerType": "BLACK",
      "provider": "Off-Record Broker",
      "category": "REGULAR",
      "categoryId": "FIELD_OPERATIONS",
      "subcategoryId": "HAZARD_RETRIEVAL",
      "workCharacterId": "HAZARD_RETRIEVAL",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          4000,
          7000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA",
          "NONE"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 5
          },
          {
            "id": "ability-endurance",
            "value": 6
          },
          {
            "id": "ability-strength",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 6
          },
          {
            "id": "skill-tool-improvisation",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "FIELD_OPERATIONS",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "BIOCHIP_DISALLOWED"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 100
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "FIELD_OPERATIONS",
            "value": 3
          },
          {
            "categoryId": "HAZARD_RETRIEVAL",
            "value": 1
          }
        ],
        "riskScoreImpact": 3
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "hazard",
        "retrieval",
        "black",
        "regular"
      ]
    },
    {
      "id": "tpl-offrecord-broker-habitat-maintenance-l2",
      "title": "Habitat Maintenance",
      "employerId": "offrecord-broker",
      "employerType": "BLACK",
      "provider": "Off-Record Broker",
      "category": "REGULAR",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "HABITAT_MAINTENANCE",
      "workCharacterId": "HABITAT_MAINTENANCE",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4500
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA",
          "NONE"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 3
          },
          {
            "id": "ability-intellect",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "OFF_RECORD_WAIVED"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 100
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "HABITAT_MAINTENANCE",
            "value": 1
          }
        ],
        "riskScoreImpact": 3
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "habitat",
        "maintenance",
        "black",
        "regular"
      ]
    },
    {
      "id": "tpl-offrecord-broker-sensor-reseat-l2",
      "title": "Sensor Reseat",
      "employerId": "offrecord-broker",
      "employerType": "BLACK",
      "provider": "Off-Record Broker",
      "category": "REGULAR",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "SENSOR_RESEAT",
      "workCharacterId": "SENSOR_RESEAT",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4500
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA",
          "NONE"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 3
          },
          {
            "id": "ability-intellect",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "OFF_RECORD_WAIVED"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 100
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "SENSOR_RESEAT",
            "value": 1
          }
        ],
        "riskScoreImpact": 3
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "sensor",
        "maintenance",
        "black",
        "regular"
      ]
    },
    {
      "id": "tpl-greyline-couriers-private-courier-drop-l2",
      "title": "Private Courier Drop",
      "employerId": "greyline-couriers",
      "employerType": "BLACK",
      "provider": "Greyline Couriers",
      "category": "REGULAR",
      "categoryId": "BLACK_MARKET",
      "subcategoryId": "PRIVATE_COURIER_DROP",
      "workCharacterId": "PRIVATE_COURIER_DROP",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4500
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA",
          "NONE"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 3
          },
          {
            "id": "ability-charisma",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-tool-improvisation",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "OFF_RECORD_WAIVED"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 100
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BLACK_MARKET",
            "value": 1
          },
          {
            "categoryId": "PRIVATE_COURIER_DROP",
            "value": 1
          }
        ],
        "riskScoreImpact": 3
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "black",
        "courier",
        "black",
        "regular"
      ]
    },
    {
      "id": "tpl-greyline-couriers-unlicensed-repair-l3",
      "title": "Unlicensed Repair",
      "employerId": "greyline-couriers",
      "employerType": "BLACK",
      "provider": "Greyline Couriers",
      "category": "REGULAR",
      "categoryId": "BLACK_MARKET",
      "subcategoryId": "UNLICENSED_REPAIR",
      "workCharacterId": "UNLICENSED_REPAIR",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3000,
          5500
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA",
          "NONE"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-charisma",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-tool-improvisation",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BIOCHIP_DISALLOWED"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 100
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BLACK_MARKET",
            "value": 2
          },
          {
            "categoryId": "UNLICENSED_REPAIR",
            "value": 1
          }
        ],
        "riskScoreImpact": 3
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "black",
        "repair",
        "black",
        "regular"
      ]
    },
    {
      "id": "tpl-greyline-couriers-cargo-dispatch-l2",
      "title": "Cargo Dispatch",
      "employerId": "greyline-couriers",
      "employerType": "BLACK",
      "provider": "Greyline Couriers",
      "category": "REGULAR",
      "categoryId": "TRANSPORT",
      "subcategoryId": "CARGO_DISPATCH",
      "workCharacterId": "CARGO_DISPATCH",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4500
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA",
          "NONE"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 3
          },
          {
            "id": "ability-perception",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "OFF_RECORD_WAIVED"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 100
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "TRANSPORT",
            "value": 1
          },
          {
            "categoryId": "CARGO_DISPATCH",
            "value": 1
          }
        ],
        "riskScoreImpact": 3
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "transport",
        "dispatch",
        "black",
        "regular"
      ]
    },
    {
      "id": "tpl-greyline-couriers-metrogrid-inspection-l2",
      "title": "MetroGrid Inspection",
      "employerId": "greyline-couriers",
      "employerType": "BLACK",
      "provider": "Greyline Couriers",
      "category": "REGULAR",
      "categoryId": "TRANSPORT",
      "subcategoryId": "METROGRID_INSPECTION",
      "workCharacterId": "METROGRID_INSPECTION",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4500
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA",
          "NONE"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 3
          },
          {
            "id": "ability-perception",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "OFF_RECORD_WAIVED"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 100
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "TRANSPORT",
            "value": 1
          },
          {
            "categoryId": "METROGRID_INSPECTION",
            "value": 1
          }
        ],
        "riskScoreImpact": 3
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "metro",
        "route",
        "black",
        "regular"
      ]
    },
    {
      "id": "tpl-greyline-couriers-field-escort-l3",
      "title": "Field Escort",
      "employerId": "greyline-couriers",
      "employerType": "BLACK",
      "provider": "Greyline Couriers",
      "category": "REGULAR",
      "categoryId": "FIELD_OPERATIONS",
      "subcategoryId": "FIELD_ESCORT",
      "workCharacterId": "FIELD_ESCORT",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          3500,
          6500
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA",
          "NONE"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-endurance",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BIOCHIP_DISALLOWED"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 100
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "FIELD_OPERATIONS",
            "value": 2
          },
          {
            "categoryId": "FIELD_ESCORT",
            "value": 1
          }
        ],
        "riskScoreImpact": 3
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "field",
        "escort",
        "black",
        "regular"
      ]
    },
    {
      "id": "tpl-greyline-couriers-hazard-retrieval-l4",
      "title": "Hazard Retrieval",
      "employerId": "greyline-couriers",
      "employerType": "BLACK",
      "provider": "Greyline Couriers",
      "category": "REGULAR",
      "categoryId": "FIELD_OPERATIONS",
      "subcategoryId": "HAZARD_RETRIEVAL",
      "workCharacterId": "HAZARD_RETRIEVAL",
      "complexity": "RESTRICTED",
      "level": 4,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          4000,
          7000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA",
          "NONE"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 5
          },
          {
            "id": "ability-endurance",
            "value": 6
          },
          {
            "id": "ability-strength",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 6
          },
          {
            "id": "skill-tool-improvisation",
            "value": 7
          }
        ],
        "minExperience": [
          {
            "categoryId": "FIELD_OPERATIONS",
            "value": 1
          }
        ],
        "insurance": {
          "profileId": "BIOCHIP_DISALLOWED"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 100
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "FIELD_OPERATIONS",
            "value": 3
          },
          {
            "categoryId": "HAZARD_RETRIEVAL",
            "value": 1
          }
        ],
        "riskScoreImpact": 3
      },
      "spawn": {
        "baseChance": 0.28,
        "weeklySlotsRange": [
          1,
          1
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "hazard",
        "retrieval",
        "black",
        "regular"
      ]
    },
    {
      "id": "tpl-private-habitat-clients-domestic-unit-cleaning-l1",
      "title": "Domestic Unit Cleaning",
      "employerId": "private-habitat-clients",
      "employerType": "PRIVATE",
      "provider": "Private Habitat Clients",
      "category": "REGULAR",
      "categoryId": "DOMESTIC_SERVICE",
      "subcategoryId": "DOMESTIC_UNIT_CLEANING",
      "workCharacterId": "DOMESTIC_UNIT_CLEANING",
      "complexity": "BASIC",
      "level": 1,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "GAMMA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-composure",
            "value": 2
          },
          {
            "id": "ability-dexterity",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DOMESTIC_SERVICE",
            "value": 1
          },
          {
            "categoryId": "DOMESTIC_UNIT_CLEANING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "domestic",
        "service",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-private-habitat-clients-habitat-maintenance-l1",
      "title": "Habitat Maintenance",
      "employerId": "private-habitat-clients",
      "employerType": "PRIVATE",
      "provider": "Private Habitat Clients",
      "category": "REGULAR",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "HABITAT_MAINTENANCE",
      "workCharacterId": "HABITAT_MAINTENANCE",
      "complexity": "BASIC",
      "level": 1,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        2
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 2
          },
          {
            "id": "ability-intellect",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "HABITAT_MAINTENANCE",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "habitat",
        "maintenance",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-private-habitat-clients-sensor-reseat-l2",
      "title": "Sensor Reseat",
      "employerId": "private-habitat-clients",
      "employerType": "PRIVATE",
      "provider": "Private Habitat Clients",
      "category": "REGULAR",
      "categoryId": "MAINTENANCE",
      "subcategoryId": "SENSOR_RESEAT",
      "workCharacterId": "SENSOR_RESEAT",
      "complexity": "STANDARD",
      "level": 2,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 3
          },
          {
            "id": "ability-intellect",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-field-repair",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "MAINTENANCE",
            "value": 1
          },
          {
            "categoryId": "SENSOR_RESEAT",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "sensor",
        "maintenance",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-private-habitat-clients-citizen-care-desk-l1",
      "title": "Citizen Care Desk",
      "employerId": "private-habitat-clients",
      "employerType": "PRIVATE",
      "provider": "Private Habitat Clients",
      "category": "REGULAR",
      "categoryId": "CITIZEN_CARE",
      "subcategoryId": "CITIZEN_CARE_DESK",
      "workCharacterId": "CITIZEN_CARE_DESK",
      "complexity": "BASIC",
      "level": 1,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-composure",
            "value": 2
          },
          {
            "id": "ability-charisma",
            "value": 2
          }
        ],
        "minSkills": [],
        "minExperience": [],
        "insurance": {
          "profileId": "NONE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 90
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "CITIZEN_CARE",
            "value": 1
          },
          {
            "categoryId": "CITIZEN_CARE_DESK",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.39,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "care",
        "desk",
        "private",
        "regular"
      ]
    },
    {
      "id": "tpl-archive-salvage-circle-archive-indexing-l2",
      "title": "Archive Indexing",
      "employerId": "archive-salvage-circle",
      "employerType": "MIXED",
      "provider": "Archive Salvage Circle",
      "category": "REGULAR",
      "categoryId": "DATA_PROCESSING",
      "subcategoryId": "ARCHIVE_INDEXING",
      "workCharacterId": "ARCHIVE_INDEXING",
      "complexity": "STANDARD",
      "level": 2,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        3
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-intellect",
            "value": 3
          },
          {
            "id": "ability-perception",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DATA_PROCESSING",
            "value": 1
          },
          {
            "categoryId": "ARCHIVE_INDEXING",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "archive",
        "data",
        "mixed",
        "regular"
      ]
    },
    {
      "id": "tpl-archive-salvage-circle-data-sanitization-l3",
      "title": "Data Sanitization",
      "employerId": "archive-salvage-circle",
      "employerType": "MIXED",
      "provider": "Archive Salvage Circle",
      "category": "REGULAR",
      "categoryId": "DATA_PROCESSING",
      "subcategoryId": "DATA_SANITIZATION",
      "workCharacterId": "DATA_SANITIZATION",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA",
          "GAMMA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "DATA_PROCESSING",
            "value": 2
          },
          {
            "categoryId": "DATA_SANITIZATION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "data",
        "sync",
        "mixed",
        "regular"
      ]
    },
    {
      "id": "tpl-archive-salvage-circle-private-courier-drop-l2",
      "title": "Private Courier Drop",
      "employerId": "archive-salvage-circle",
      "employerType": "MIXED",
      "provider": "Archive Salvage Circle",
      "category": "REGULAR",
      "categoryId": "BLACK_MARKET",
      "subcategoryId": "PRIVATE_COURIER_DROP",
      "workCharacterId": "PRIVATE_COURIER_DROP",
      "complexity": "STANDARD",
      "level": 2,
      "form": "COMMISSION",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          1500,
          3000
        ]
      },
      "durationWeeksRange": [
        1,
        1
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA",
          "NONE"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 3
          },
          {
            "id": "ability-charisma",
            "value": 3
          }
        ],
        "minSkills": [
          {
            "id": "skill-tool-improvisation",
            "value": 4
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "PUBLIC",
        "maxRiskScore": 75
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BLACK_MARKET",
            "value": 1
          },
          {
            "categoryId": "PRIVATE_COURIER_DROP",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.35,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "black",
        "courier",
        "mixed",
        "regular"
      ]
    },
    {
      "id": "tpl-archive-salvage-circle-unlicensed-repair-l3",
      "title": "Unlicensed Repair",
      "employerId": "archive-salvage-circle",
      "employerType": "MIXED",
      "provider": "Archive Salvage Circle",
      "category": "REGULAR",
      "categoryId": "BLACK_MARKET",
      "subcategoryId": "UNLICENSED_REPAIR",
      "workCharacterId": "UNLICENSED_REPAIR",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "AGREEMENT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2000,
          4000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "BETA",
          "GAMMA",
          "NONE"
        ],
        "minAbilities": [
          {
            "id": "ability-reflex",
            "value": 4
          },
          {
            "id": "ability-charisma",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-tool-improvisation",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "BLACK_MARKET",
            "value": 2
          },
          {
            "categoryId": "UNLICENSED_REPAIR",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "black",
        "repair",
        "mixed",
        "regular"
      ]
    },
    {
      "id": "tpl-archive-salvage-circle-lab-observation-l3",
      "title": "Lab Observation",
      "employerId": "archive-salvage-circle",
      "employerType": "MIXED",
      "provider": "Archive Salvage Circle",
      "category": "REGULAR",
      "categoryId": "RESEARCH_ASSISTANCE",
      "subcategoryId": "LAB_OBSERVATION",
      "workCharacterId": "LAB_OBSERVATION",
      "complexity": "ADVANCED",
      "level": 3,
      "form": "CONTRACT",
      "payment": {
        "currency": "ENCODED_CREDIT",
        "amountRange": [
          2500,
          5000
        ]
      },
      "durationWeeksRange": [
        1,
        4
      ],
      "requirements": {
        "biologicalProfiles": [
          "ALPHA",
          "BETA"
        ],
        "minAbilities": [
          {
            "id": "ability-dexterity",
            "value": 4
          },
          {
            "id": "ability-intellect",
            "value": 4
          }
        ],
        "minSkills": [
          {
            "id": "skill-registry-analysis",
            "value": 5
          }
        ],
        "minExperience": [],
        "insurance": {
          "profileId": "BASIC_COVERAGE"
        },
        "requiredClearance": "RESTRICTED",
        "maxRiskScore": 65
      },
      "rewards": {
        "experienceGain": [
          {
            "categoryId": "RESEARCH_ASSISTANCE",
            "value": 2
          },
          {
            "categoryId": "LAB_OBSERVATION",
            "value": 1
          }
        ],
        "riskScoreImpact": 0
      },
      "spawn": {
        "baseChance": 0.31,
        "weeklySlotsRange": [
          1,
          2
        ],
        "profiles": [
          "standard_week"
        ]
      },
      "tags": [
        "lab",
        "research",
        "mixed",
        "regular"
      ]
    }
  ],
  "serviceAbilities": [
    {
      "id": "ability-strength",
      "label": "Siła"
    },
    {
      "id": "ability-endurance",
      "label": "Wytrzymałość"
    },
    {
      "id": "ability-reflex",
      "label": "Refleks"
    },
    {
      "id": "ability-dexterity",
      "label": "Zręczność"
    },
    {
      "id": "ability-perception",
      "label": "Percepcja"
    },
    {
      "id": "ability-composure",
      "label": "Opanowanie"
    },
    {
      "id": "ability-charisma",
      "label": "Charyzma"
    },
    {
      "id": "ability-intellect",
      "label": "Intelekt"
    }
  ]
};
