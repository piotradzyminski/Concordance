window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.serviceBridgeConfig = {
  schemaVersion: 1,
  storeSchemaVersion: 1,
  currency: "CREDIT",
  defaultAvailability: "AVAILABLE",
  subscriptionEntitlementBridgeVersion: "services_subscription_entitlement_bridge_2_2x"
};

window.APP_DATA.serviceProviderCapabilityManifests = [
  {
    providerId: "provider-coremed-service",
    aliases: ["coremed", "coremed-service"],
    organizationId: "coremed",
    providerType: "CLINIC",
    displayName: "CoreMed Clinical Services",
    capabilities: [
      "CYBERWARE_INSTALL",
      "CYBERWARE_DEINSTALL",
      "CYBERWARE_REPLACE",
      "CYBERWARE_REPAIR",
      "CYBERWARE_CALIBRATE",
      "CYBERWARE_CLEAN",
      "CYBERWARE_DIAGNOSTIC",
      "FIRMWARE_UPDATE",
      "LICENSE_REVIEW"
    ],
    active: true,
    revision: 1
  },
  {
    providerId: "provider-trauma-team",
    aliases: ["trauma-team"],
    organizationId: "trauma-team",
    providerType: "HOSPITAL",
    displayName: "TRAUMA Team",
    capabilities: [
      "CYBERWARE_INSTALL",
      "CYBERWARE_DEINSTALL",
      "CYBERWARE_REPLACE",
      "CYBERWARE_REPAIR",
      "CYBERWARE_CALIBRATE",
      "CYBERWARE_CLEAN",
      "CYBERWARE_DIAGNOSTIC",
      "FIRMWARE_UPDATE",
      "EMERGENCY_EXTRACTION",
      "BIOLOGICAL_RECOVERY"
    ],
    active: true,
    revision: 1
  },
  {
    providerId: "provider-live-prevail",
    aliases: ["live-prevail"],
    organizationId: "live-prevail",
    providerType: "SYSTEM_FACILITY",
    displayName: "Live & Prevail",
    capabilities: [
      "CYBERWARE_INSTALL",
      "CYBERWARE_DEINSTALL",
      "CYBERWARE_REPAIR",
      "CYBERWARE_CALIBRATE",
      "CYBERWARE_CLEAN",
      "CYBERWARE_DIAGNOSTIC"
    ],
    active: true,
    revision: 1
  },
  {
    providerId: "provider-kagami-kaisha",
    aliases: ["kagami-kaisha"],
    organizationId: "kagami-kaisha",
    providerType: "SERVICE_CENTER",
    displayName: "Kagami Kaisha Secure Service",
    capabilities: [
      "CYBERWARE_REPAIR",
      "CYBERWARE_CALIBRATE",
      "CYBERWARE_CLEAN",
      "CYBERWARE_DIAGNOSTIC",
      "FIRMWARE_UPDATE",
      "LICENSE_ISSUE",
      "LICENSE_REVIEW"
    ],
    active: true,
    revision: 1
  },
  {
    providerId: "provider-mass-compression-service",
    aliases: ["mass-compression", "mass-compression-service"],
    organizationId: "mass-compression",
    providerType: "SERVICE_CENTER",
    displayName: "Mass Compression Service",
    capabilities: [
      "CYBERWARE_INSTALL",
      "CYBERWARE_DEINSTALL",
      "CYBERWARE_REPLACE",
      "CYBERWARE_REPAIR",
      "CYBERWARE_CALIBRATE",
      "CYBERWARE_CLEAN",
      "CYBERWARE_DIAGNOSTIC",
      "FIRMWARE_UPDATE"
    ],
    active: true,
    revision: 1
  },
  {
    providerId: "provider-aurum-skinworks",
    aliases: ["aurum", "aurum-skinworks"],
    organizationId: "aurum",
    providerType: "CLINIC",
    displayName: "Aurum Skinworks",
    capabilities: [
      "CYBERWARE_INSTALL",
      "CYBERWARE_DEINSTALL",
      "CYBERWARE_REPLACE",
      "CYBERWARE_REPAIR",
      "CYBERWARE_CALIBRATE",
      "CYBERWARE_CLEAN",
      "CYBERWARE_DIAGNOSTIC"
    ],
    active: true,
    revision: 1
  },
  {
    providerId: "provider-somnacore",
    aliases: ["somnacore"],
    organizationId: "somnacore",
    providerType: "SERVICE_CENTER",
    displayName: "SomnaCore Clinical Service",
    capabilities: [
      "CYBERWARE_INSTALL",
      "CYBERWARE_DEINSTALL",
      "CYBERWARE_REPAIR",
      "CYBERWARE_CALIBRATE",
      "CYBERWARE_DIAGNOSTIC",
      "FIRMWARE_UPDATE"
    ],
    active: true,
    revision: 1
  },
  {
    providerId: "provider-cortex-ladder",
    aliases: ["cortex-ladder"],
    organizationId: "cortex-ladder",
    providerType: "SERVICE_CENTER",
    displayName: "Cortex Ladder Service",
    capabilities: [
      "CYBERWARE_INSTALL",
      "CYBERWARE_DEINSTALL",
      "CYBERWARE_REPLACE",
      "CYBERWARE_REPAIR",
      "CYBERWARE_CALIBRATE",
      "CYBERWARE_DIAGNOSTIC",
      "FIRMWARE_UPDATE",
      "LICENSE_REVIEW"
    ],
    active: true,
    revision: 1
  },
  {
    providerId: "provider-factory-commons",
    aliases: ["factory-commons"],
    organizationId: "factory-commons",
    providerType: "SYSTEM_FACILITY",
    displayName: "Factory Commons Utility Service",
    capabilities: [
      "CYBERWARE_INSTALL",
      "CYBERWARE_DEINSTALL",
      "CYBERWARE_REPAIR",
      "CYBERWARE_CALIBRATE",
      "CYBERWARE_CLEAN",
      "CYBERWARE_DIAGNOSTIC"
    ],
    active: true,
    revision: 1
  },
  {
    providerId: "provider-perfectmin-licensed-clinics",
    aliases: ["perfectmin", "perfectmin-licensed-clinics"],
    organizationId: "perfectmin",
    providerType: "SYSTEM_FACILITY",
    displayName: "PerfectMin Licensed Clinics",
    capabilities: [
      "CYBERWARE_INSTALL",
      "CYBERWARE_DEINSTALL",
      "CYBERWARE_REPLACE",
      "CYBERWARE_REPAIR",
      "CYBERWARE_CALIBRATE",
      "CYBERWARE_CLEAN",
      "CYBERWARE_DIAGNOSTIC",
      "FIRMWARE_UPDATE",
      "LICENSE_ISSUE",
      "LICENSE_REVIEW",
      "BIOLOGICAL_RECOVERY"
    ],
    active: true,
    revision: 1
  },
  {
    providerId: "provider-local-service-registry",
    aliases: ["local-service-registry"],
    organizationId: "system-authority",
    providerType: "SERVICE_CENTER",
    displayName: "Local Certified Service Registry",
    capabilities: [
      "CYBERWARE_REPAIR",
      "CYBERWARE_CALIBRATE",
      "CYBERWARE_CLEAN",
      "CYBERWARE_DIAGNOSTIC"
    ],
    active: true,
    revision: 1
  }
];

window.APP_DATA.serviceDefinitions = [
  {
    serviceDefinitionId: "svc-cyberware-diagnostic-standard",
    displayName: "Cyberware Diagnostic",
    serviceType: "CYBERWARE_DIAGNOSTIC",
    domain: "CYBERWARE",
    requiredCapabilities: ["CYBERWARE_DIAGNOSTIC"],
    entitlementPolicy: {
      targetStrategy: "SUBJECT_OR_CITIZEN",
      providerRules: [
        { providerId: "provider-coremed-service", entitlementCode: "COREMED_CERTIFIED_SERVICE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-mass-compression-service", entitlementCode: "MC_CERTIFIED_SERVICE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-mass-compression-service", entitlementCode: "MC_PRIORITY_DIAGNOSTICS", requirement: "OPTIONAL" },
        { providerId: "provider-kagami-kaisha", entitlementCode: "KAGAMI_CERTIFIED_SECURITY", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-trauma-team", entitlementCode: "TRAUMA_MEDICAL_COVERAGE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-live-prevail", entitlementCode: "LIVE_PREVAIL_MEDICAL_COVERAGE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-aurum-skinworks", entitlementCode: "AURUM_BODY_MAINTENANCE_ACCESS", requirement: "COVERAGE_ONLY" }
      ]
    },
    subjectPolicy: { minInstanceCount: 1, maxInstanceCount: 12, returnLocationRequired: false },
    durationModel: { type: "FORMULA", formulaId: "cyberware_diagnostic_duration_v1", baseMinutes: 45, perInstanceMinutes: 15 },
    pricingModel: { type: "FORMULA", formulaId: "cyberware_diagnostic_price_v1", basePrice: 500, perInstancePrice: 150 },
    riskModel: { formulaId: "cyberware_diagnostic_risk_v1" },
    active: true,
    revision: 2
  },
  {
    serviceDefinitionId: "svc-cyberware-install-standard",
    displayName: "Cyberware Installation",
    serviceType: "CYBERWARE_INSTALL",
    domain: "CYBERWARE",
    requiredCapabilities: ["CYBERWARE_INSTALL"],
    entitlementPolicy: {
      targetStrategy: "SUBJECT_OR_CITIZEN",
      providerRules: [
        { providerId: "provider-coremed-service", entitlementCode: "COREMED_CERTIFIED_SERVICE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-mass-compression-service", entitlementCode: "MC_CERTIFIED_SERVICE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-trauma-team", entitlementCode: "TRAUMA_MEDICAL_COVERAGE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-live-prevail", entitlementCode: "LIVE_PREVAIL_MEDICAL_COVERAGE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-aurum-skinworks", entitlementCode: "AURUM_BODY_MAINTENANCE_ACCESS", requirement: "COVERAGE_ONLY" }
      ]
    },
    subjectPolicy: { minInstanceCount: 1, maxInstanceCount: 4, returnLocationRequired: false },
    durationModel: { type: "FORMULA", formulaId: "cyberware_install_duration_v1", baseMinutes: 120, perInstanceMinutes: 90 },
    pricingModel: { type: "FORMULA", formulaId: "cyberware_install_price_v1", basePrice: 1500, perInstancePrice: 1500 },
    riskModel: { formulaId: "cyberware_install_risk_v1" },
    active: true,
    revision: 2
  },
  {
    serviceDefinitionId: "svc-cyberware-deinstall-standard",
    displayName: "Cyberware Deinstallation",
    serviceType: "CYBERWARE_DEINSTALL",
    domain: "CYBERWARE",
    requiredCapabilities: ["CYBERWARE_DEINSTALL"],
    entitlementPolicy: {
      targetStrategy: "SUBJECT_OR_CITIZEN",
      providerRules: [
        { providerId: "provider-coremed-service", entitlementCode: "COREMED_CERTIFIED_SERVICE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-mass-compression-service", entitlementCode: "MC_CERTIFIED_SERVICE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-trauma-team", entitlementCode: "TRAUMA_MEDICAL_COVERAGE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-live-prevail", entitlementCode: "LIVE_PREVAIL_MEDICAL_COVERAGE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-aurum-skinworks", entitlementCode: "AURUM_BODY_MAINTENANCE_ACCESS", requirement: "COVERAGE_ONLY" }
      ]
    },
    subjectPolicy: { minInstanceCount: 1, maxInstanceCount: 4, returnLocationRequired: true },
    durationModel: { type: "FORMULA", formulaId: "cyberware_deinstall_duration_v1", baseMinutes: 90, perInstanceMinutes: 75 },
    pricingModel: { type: "FORMULA", formulaId: "cyberware_deinstall_price_v1", basePrice: 1200, perInstancePrice: 1000 },
    riskModel: { formulaId: "cyberware_deinstall_risk_v1" },
    active: true,
    revision: 2
  },
  {
    serviceDefinitionId: "svc-cyberware-replace-standard",
    displayName: "Cyberware Replacement",
    serviceType: "CYBERWARE_REPLACE",
    domain: "CYBERWARE",
    requiredCapabilities: ["CYBERWARE_REPLACE"],
    entitlementPolicy: {
      targetStrategy: "SUBJECT_OR_CITIZEN",
      providerRules: [
        { providerId: "provider-coremed-service", entitlementCode: "COREMED_CERTIFIED_SERVICE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-mass-compression-service", entitlementCode: "MC_CERTIFIED_SERVICE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-trauma-team", entitlementCode: "TRAUMA_MEDICAL_COVERAGE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-aurum-skinworks", entitlementCode: "AURUM_BODY_MAINTENANCE_ACCESS", requirement: "COVERAGE_ONLY" }
      ]
    },
    subjectPolicy: { minInstanceCount: 2, maxInstanceCount: 2, returnLocationRequired: true },
    durationModel: { type: "FORMULA", formulaId: "cyberware_replace_duration_v1", baseMinutes: 180, perInstanceMinutes: 90 },
    pricingModel: { type: "FORMULA", formulaId: "cyberware_replace_price_v1", basePrice: 2500, perInstancePrice: 1250 },
    riskModel: { formulaId: "cyberware_replace_risk_v1" },
    active: true,
    revision: 2
  },
  {
    serviceDefinitionId: "svc-cyberware-repair-standard",
    displayName: "Cyberware Repair",
    serviceType: "CYBERWARE_REPAIR",
    domain: "CYBERWARE",
    requiredCapabilities: ["CYBERWARE_REPAIR"],
    entitlementPolicy: {
      targetStrategy: "SUBJECT_OR_CITIZEN",
      providerRules: [
        { providerId: "provider-coremed-service", entitlementCode: "COREMED_CERTIFIED_SERVICE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-mass-compression-service", entitlementCode: "MC_CERTIFIED_SERVICE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-kagami-kaisha", entitlementCode: "KAGAMI_CERTIFIED_SECURITY", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-trauma-team", entitlementCode: "TRAUMA_MEDICAL_COVERAGE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-live-prevail", entitlementCode: "LIVE_PREVAIL_MEDICAL_COVERAGE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-aurum-skinworks", entitlementCode: "AURUM_BODY_MAINTENANCE_ACCESS", requirement: "COVERAGE_ONLY" }
      ]
    },
    subjectPolicy: { minInstanceCount: 1, maxInstanceCount: 8, returnLocationRequired: false },
    durationModel: { type: "FORMULA", formulaId: "cyberware_repair_duration_v1", baseMinutes: 60, perInstanceMinutes: 45 },
    pricingModel: { type: "FORMULA", formulaId: "cyberware_repair_price_v1", basePrice: 800, perInstancePrice: 700 },
    riskModel: { formulaId: "cyberware_repair_risk_v1" },
    active: true,
    revision: 2
  },
  {
    serviceDefinitionId: "svc-cyberware-calibrate-standard",
    displayName: "Cyberware Calibration",
    serviceType: "CYBERWARE_CALIBRATE",
    domain: "CYBERWARE",
    requiredCapabilities: ["CYBERWARE_CALIBRATE"],
    entitlementPolicy: {
      targetStrategy: "SUBJECT_OR_CITIZEN",
      providerRules: [
        { providerId: "provider-coremed-service", entitlementCode: "COREMED_CERTIFIED_SERVICE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-mass-compression-service", entitlementCode: "MC_CERTIFIED_SERVICE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-kagami-kaisha", entitlementCode: "KAGAMI_CERTIFIED_SECURITY", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-trauma-team", entitlementCode: "TRAUMA_MEDICAL_COVERAGE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-live-prevail", entitlementCode: "LIVE_PREVAIL_MEDICAL_COVERAGE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-aurum-skinworks", entitlementCode: "AURUM_BODY_MAINTENANCE_ACCESS", requirement: "COVERAGE_ONLY" }
      ]
    },
    subjectPolicy: { minInstanceCount: 1, maxInstanceCount: 8, returnLocationRequired: false },
    durationModel: { type: "FORMULA", formulaId: "cyberware_calibrate_duration_v1", baseMinutes: 45, perInstanceMinutes: 30 },
    pricingModel: { type: "FORMULA", formulaId: "cyberware_calibrate_price_v1", basePrice: 600, perInstancePrice: 500 },
    riskModel: { formulaId: "cyberware_calibrate_risk_v1" },
    active: true,
    revision: 2
  },
  {
    serviceDefinitionId: "svc-cyberware-clean-standard",
    displayName: "Cyberware Cleaning",
    serviceType: "CYBERWARE_CLEAN",
    domain: "CYBERWARE",
    requiredCapabilities: ["CYBERWARE_CLEAN"],
    entitlementPolicy: {
      targetStrategy: "SUBJECT_OR_CITIZEN",
      providerRules: [
        { providerId: "provider-coremed-service", entitlementCode: "COREMED_CERTIFIED_SERVICE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-mass-compression-service", entitlementCode: "MC_CERTIFIED_SERVICE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-kagami-kaisha", entitlementCode: "KAGAMI_CERTIFIED_SECURITY", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-trauma-team", entitlementCode: "TRAUMA_MEDICAL_COVERAGE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-live-prevail", entitlementCode: "LIVE_PREVAIL_MEDICAL_COVERAGE", requirement: "COVERAGE_ONLY" },
        { providerId: "provider-aurum-skinworks", entitlementCode: "AURUM_BODY_MAINTENANCE_ACCESS", requirement: "COVERAGE_ONLY" }
      ]
    },
    subjectPolicy: { minInstanceCount: 1, maxInstanceCount: 12, returnLocationRequired: false },
    durationModel: { type: "FORMULA", formulaId: "cyberware_clean_duration_v1", baseMinutes: 30, perInstanceMinutes: 20 },
    pricingModel: { type: "FORMULA", formulaId: "cyberware_clean_price_v1", basePrice: 300, perInstancePrice: 250 },
    riskModel: { formulaId: "cyberware_clean_risk_v1" },
    active: true,
    revision: 2
  },
  {
    serviceDefinitionId: "svc-firmware-update-standard",
    displayName: "Firmware Update",
    serviceType: "FIRMWARE_UPDATE",
    domain: "CYBERWARE",
    requiredCapabilities: ["FIRMWARE_UPDATE"],
    entitlementPolicy: {
      targetStrategy: "SUBJECT_OR_CITIZEN",
      providerRules: [
        { providerId: "provider-coremed-service", entitlementCode: "COREMED_FIRMWARE_ACCESS", requirement: "REQUIRED" },
        { providerId: "provider-mass-compression-service", entitlementCode: "MC_FIRMWARE_ACCESS", requirement: "REQUIRED" },
        { providerId: "provider-kagami-kaisha", entitlementCode: "KAGAMI_FIRMWARE_SECURITY_UPDATES", requirement: "REQUIRED" }
      ]
    },
    subjectPolicy: { minInstanceCount: 1, maxInstanceCount: 8, returnLocationRequired: false },
    durationModel: { type: "FORMULA", formulaId: "firmware_update_duration_v1", baseMinutes: 30, perInstanceMinutes: 20 },
    pricingModel: { type: "FORMULA", formulaId: "firmware_update_price_v1", basePrice: 400, perInstancePrice: 300 },
    riskModel: { formulaId: "firmware_update_risk_v1" },
    active: true,
    revision: 2
  },
  {
    serviceDefinitionId: "svc-license-review-standard",
    displayName: "License Review",
    serviceType: "LICENSE_REVIEW",
    domain: "CYBERWARE",
    requiredCapabilities: ["LICENSE_REVIEW"],
    entitlementPolicy: {
      targetStrategy: "SUBJECT_OR_CITIZEN",
      providerRules: [
        { providerId: "provider-coremed-service", entitlementCode: "COREMED_CERTIFIED_SERVICE", requirement: "OPTIONAL" },
        { providerId: "provider-kagami-kaisha", entitlementCode: "KAGAMI_CERTIFIED_SECURITY", requirement: "OPTIONAL" }
      ]
    },
    subjectPolicy: { minInstanceCount: 1, maxInstanceCount: 12, returnLocationRequired: false },
    durationModel: { type: "FORMULA", formulaId: "license_review_duration_v1", baseMinutes: 60, perInstanceMinutes: 10 },
    pricingModel: { type: "FORMULA", formulaId: "license_review_price_v1", basePrice: 750, perInstancePrice: 100 },
    riskModel: { formulaId: "license_review_risk_v1" },
    active: true,
    revision: 2
  },
  {
    serviceDefinitionId: "svc-emergency-extraction-standard",
    displayName: "Emergency Extraction",
    serviceType: "EMERGENCY_EXTRACTION",
    domain: "MEDICAL",
    requiredCapabilities: ["EMERGENCY_EXTRACTION"],
    entitlementPolicy: {
      targetStrategy: "CITIZEN_ONLY",
      providerRules: [
        { providerId: "provider-trauma-team", entitlementCode: "TRAUMA_EMERGENCY_RESPONSE", requirement: "REQUIRED" }
      ]
    },
    subjectPolicy: { minInstanceCount: 0, maxInstanceCount: 12, returnLocationRequired: false },
    durationModel: { type: "FORMULA", formulaId: "emergency_extraction_duration_v1", baseMinutes: 30, perInstanceMinutes: 10 },
    pricingModel: { type: "FORMULA", formulaId: "emergency_extraction_price_v1", basePrice: 5000, perInstancePrice: 500 },
    riskModel: { formulaId: "emergency_extraction_risk_v1" },
    active: true,
    revision: 2
  }
];
