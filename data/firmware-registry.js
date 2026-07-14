window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.firmwareRegistry = {
  schemaVersion: 1,
  registryRevision: 1,
  channels: ["STABLE", "SECURITY", "BETA", "LEGACY"],
  products: [
    {
      firmwareProductId: "fw-product-coremed-basicsight-l2",
      providerId: "provider-coremed-service",
      displayName: "CoreMed BasicSight L2 Firmware",
      defaultChannel: "STABLE",
      supportedDefinitionIds: [
        "coremed-basicsight-l2-left",
        "coremed-basicsight-l2-right"
      ],
      authorizedServiceProviderIds: [
        "provider-coremed-service",
        "provider-trauma-team",
        "provider-perfectmin-licensed-clinics"
      ],
      entitlementProviderId: "provider-coremed-service",
      requiredEntitlementCodes: ["COREMED_FIRMWARE_ACCESS"],
      enforceInstalledFirmware: true,
      active: true,
      revision: 1
    },
    {
      firmwareProductId: "fw-product-coremed-assisted-heart-c2",
      providerId: "provider-coremed-service",
      displayName: "CoreMed Assisted Heart C2 Firmware",
      defaultChannel: "STABLE",
      supportedDefinitionIds: ["coremed-assisted-heart-c2"],
      authorizedServiceProviderIds: [
        "provider-coremed-service",
        "provider-trauma-team",
        "provider-perfectmin-licensed-clinics"
      ],
      entitlementProviderId: "provider-coremed-service",
      requiredEntitlementCodes: ["COREMED_FIRMWARE_ACCESS"],
      enforceInstalledFirmware: true,
      active: true,
      revision: 1
    },
    {
      firmwareProductId: "fw-product-factory-tool-forearm-f2",
      providerId: "provider-factory-commons",
      displayName: "Factory Commons Tool Forearm F2 Firmware",
      defaultChannel: "STABLE",
      supportedDefinitionIds: [
        "factory-tool-forearm-left-f2",
        "factory-tool-forearm-right-f2"
      ],
      authorizedServiceProviderIds: [
        "provider-mass-compression-service",
        "provider-perfectmin-licensed-clinics"
      ],
      preferredServiceProviderId: "provider-mass-compression-service",
      entitlementProviderId: "provider-mass-compression-service",
      requiredEntitlementCodes: ["MC_FIRMWARE_ACCESS"],
      enforceInstalledFirmware: true,
      active: true,
      revision: 1
    },
    {
      firmwareProductId: "fw-product-mass-compression-m3-modular-bus",
      providerId: "provider-mass-compression-service",
      displayName: "Mass Compression M3 Modular Bus Firmware",
      defaultChannel: "STABLE",
      supportedDefinitionIds: [
        "mc-spine-bus-m3",
        "mc-modular-arm-left-m3",
        "mc-modular-arm-right-m3",
        "mc-modular-hand-left-m3",
        "mc-modular-hand-right-m3",
        "mc-index-finger-left-m3",
        "mc-index-finger-right-m3",
        "mc-thumb-left-m3"
      ],
      authorizedServiceProviderIds: [
        "provider-mass-compression-service",
        "provider-perfectmin-licensed-clinics"
      ],
      entitlementProviderId: "provider-mass-compression-service",
      requiredEntitlementCodes: ["MC_FIRMWARE_ACCESS"],
      enforceInstalledFirmware: true,
      active: true,
      revision: 1
    },
    {
      firmwareProductId: "fw-product-mass-compression-grid-port",
      providerId: "provider-mass-compression-service",
      displayName: "Mass Compression Grid Port Firmware",
      defaultChannel: "STABLE",
      supportedDefinitionIds: [
        "service-port-mc-sp1-slotline-port",
        "service-port-mc-sp2-slotlink-port",
        "service-port-mc-sp3-array-port"
      ],
      authorizedServiceProviderIds: [
        "provider-mass-compression-service",
        "provider-perfectmin-licensed-clinics"
      ],
      entitlementProviderId: "provider-mass-compression-service",
      requiredEntitlementCodes: ["MC_FIRMWARE_ACCESS"],
      enforceInstalledFirmware: true,
      active: true,
      revision: 1
    }
  ],
  releases: [
    {
      firmwareReleaseId: "fw-release-coremed-basicsight-l2-1.0.0",
      firmwareProductId: "fw-product-coremed-basicsight-l2",
      version: "1.0.0",
      channel: "STABLE",
      releasedAt: "2108-11-01",
      mandatory: false,
      securitySeverity: "LOW",
      compatibility: {
        supportedDefinitionIds: [
          "coremed-basicsight-l2-left",
          "coremed-basicsight-l2-right"
        ],
        minimumItemSchemaVersion: 1
      },
      supersedesReleaseIds: [],
      active: true,
      revision: 1
    },
    {
      firmwareReleaseId: "fw-release-coremed-assisted-heart-c2-1.4.0",
      firmwareProductId: "fw-product-coremed-assisted-heart-c2",
      version: "1.4.0",
      channel: "STABLE",
      releasedAt: "2108-12-12",
      mandatory: false,
      securitySeverity: "MEDIUM",
      compatibility: {
        supportedDefinitionIds: ["coremed-assisted-heart-c2"],
        minimumItemSchemaVersion: 1
      },
      supersedesReleaseIds: [],
      active: true,
      revision: 1
    },
    {
      firmwareReleaseId: "fw-release-factory-tool-forearm-f2-2.0.0",
      firmwareProductId: "fw-product-factory-tool-forearm-f2",
      version: "2.0.0",
      channel: "STABLE",
      releasedAt: "2108-09-20",
      mandatory: false,
      securitySeverity: "LOW",
      compatibility: {
        supportedDefinitionIds: [
          "factory-tool-forearm-left-f2",
          "factory-tool-forearm-right-f2"
        ],
        minimumItemSchemaVersion: 1
      },
      supersedesReleaseIds: [],
      active: true,
      revision: 1
    },
    {
      firmwareReleaseId: "fw-release-factory-tool-forearm-f2-2.1.0",
      firmwareProductId: "fw-product-factory-tool-forearm-f2",
      version: "2.1.0",
      channel: "STABLE",
      releasedAt: "2109-01-28",
      mandatory: false,
      securitySeverity: "MEDIUM",
      compatibility: {
        supportedDefinitionIds: [
          "factory-tool-forearm-left-f2",
          "factory-tool-forearm-right-f2"
        ],
        minimumItemSchemaVersion: 1
      },
      supersedesReleaseIds: ["fw-release-factory-tool-forearm-f2-2.0.0"],
      active: true,
      revision: 1
    },
    {
      firmwareReleaseId: "fw-release-mass-compression-m3-modular-bus-3.0.0",
      firmwareProductId: "fw-product-mass-compression-m3-modular-bus",
      version: "3.0.0",
      channel: "STABLE",
      releasedAt: "2108-12-05",
      mandatory: false,
      securitySeverity: "LOW",
      compatibility: {
        supportedDefinitionIds: [
          "mc-spine-bus-m3",
          "mc-modular-arm-left-m3",
          "mc-modular-arm-right-m3",
          "mc-modular-hand-left-m3",
          "mc-modular-hand-right-m3",
          "mc-index-finger-left-m3",
          "mc-index-finger-right-m3",
          "mc-thumb-left-m3"
        ],
        minimumItemSchemaVersion: 1
      },
      supersedesReleaseIds: [],
      active: true,
      revision: 1
    },
    {
      firmwareReleaseId: "fw-release-mass-compression-grid-port-3.0.0",
      firmwareProductId: "fw-product-mass-compression-grid-port",
      version: "3.0.0",
      channel: "STABLE",
      releasedAt: "2108-10-14",
      mandatory: false,
      securitySeverity: "LOW",
      compatibility: {
        supportedDefinitionIds: [
          "service-port-mc-sp1-slotline-port",
          "service-port-mc-sp2-slotlink-port",
          "service-port-mc-sp3-array-port"
        ],
        minimumItemSchemaVersion: 1
      },
      supersedesReleaseIds: [],
      active: true,
      revision: 1
    },
    {
      firmwareReleaseId: "fw-release-mass-compression-grid-port-3.1.0",
      firmwareProductId: "fw-product-mass-compression-grid-port",
      version: "3.1.0",
      channel: "STABLE",
      releasedAt: "2109-02-01",
      mandatory: true,
      securitySeverity: "HIGH",
      compatibility: {
        supportedDefinitionIds: [
          "service-port-mc-sp1-slotline-port",
          "service-port-mc-sp2-slotlink-port",
          "service-port-mc-sp3-array-port"
        ],
        minimumItemSchemaVersion: 1
      },
      supersedesReleaseIds: ["fw-release-mass-compression-grid-port-3.0.0"],
      active: true,
      revision: 1
    }
  ]
};
