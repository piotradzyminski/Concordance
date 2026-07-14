window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.notificationProviderCapabilities = [
  {
    providerId: "provider-system",
    organizationId: "system-authority",
    supportedDomains: ["SYSTEM", "BILLING", "SUBSCRIPTION", "SERVICE", "MARKET", "HOUSING", "CYBERWARE", "WORLD_BRIDGE"]
  },
  {
    providerId: "provider-watch-secure",
    organizationId: "watch-secure",
    supportedDomains: ["SECURITY", "ACCESS", "DATABASE", "PROFILE", "CASE", "SYSTEM", "SUBSCRIPTION"]
  },
  {
    providerId: "provider-trauma-team",
    organizationId: "trauma-team",
    supportedDomains: ["MEDICAL", "CYBERWARE", "SERVICE", "SUBSCRIPTION", "MARKET", "WORLD_BRIDGE"]
  },
  {
    providerId: "provider-live-prevail",
    organizationId: "live-prevail",
    supportedDomains: ["MEDICAL", "CYBERWARE", "SERVICE", "SUBSCRIPTION", "WORLD_BRIDGE"]
  },
  {
    providerId: "provider-kagami-kaisha",
    organizationId: "kagami-kaisha",
    supportedDomains: ["CYBERWARE", "SECURITY", "SERVICE", "MARKET", "SUBSCRIPTION", "WORLD_BRIDGE"]
  },
  {
    providerId: "provider-coremed-service",
    organizationId: "coremed",
    supportedDomains: ["CYBERWARE", "MEDICAL", "SERVICE", "MARKET", "SUBSCRIPTION", "WORLD_BRIDGE"]
  },
  {
    providerId: "provider-mass-compression-service",
    organizationId: "mass-compression",
    supportedDomains: ["CYBERWARE", "SERVICE", "MARKET", "HOUSING", "SUBSCRIPTION", "WORLD_BRIDGE"]
  },
  {
    providerId: "provider-aurum-skinworks",
    organizationId: "aurum",
    supportedDomains: ["CYBERWARE", "MEDICAL", "SERVICE", "MARKET", "SUBSCRIPTION", "WORLD_BRIDGE"]
  },
  {
    providerId: "provider-somnacore",
    organizationId: "somnacore",
    supportedDomains: ["CYBERWARE", "MEDICAL", "SERVICE", "SUBSCRIPTION", "WORLD_BRIDGE"]
  },
  {
    providerId: "provider-cortex-ladder",
    organizationId: "cortex-ladder",
    supportedDomains: ["CYBERWARE", "SERVICE", "MARKET", "SUBSCRIPTION", "WORLD_BRIDGE"]
  },
  {
    providerId: "provider-local-service-registry",
    organizationId: "system-authority",
    supportedDomains: ["SERVICE", "SYSTEM", "WORLD_BRIDGE"]
  },
  {
    providerId: "provider-habitat-ledger",
    organizationId: "habitat-market",
    supportedDomains: ["HOUSING", "MARKET", "BILLING", "SUBSCRIPTION", "WORLD_BRIDGE"]
  },
  {
    providerId: "provider-factory-commons",
    organizationId: "factory-commons",
    supportedDomains: ["SERVICE", "CYBERWARE", "MARKET", "SUBSCRIPTION", "WORLD_BRIDGE"]
  },
  {
    providerId: "provider-perfectmin-licensed-clinics",
    organizationId: "perfectmin",
    supportedDomains: ["CYBERWARE", "MEDICAL", "SERVICE", "SECURITY", "SUBSCRIPTION", "WORLD_BRIDGE"]
  },
  {
    providerId: "provider-plentymin-nutrient-access",
    organizationId: "plentymin",
    supportedDomains: ["SUBSCRIPTION", "FOOD", "SYSTEM"]
  },
  {
    providerId: "provider-helix-table",
    organizationId: "helix-table",
    supportedDomains: ["SUBSCRIPTION", "FOOD", "MEDICAL"]
  },
  {
    providerId: "provider-cleanstate-utility",
    organizationId: "cleanstate-utility",
    supportedDomains: ["SUBSCRIPTION", "SYSTEM"]
  },
  {
    providerId: "provider-metrogrid-access",
    organizationId: "metrogrid-access",
    supportedDomains: ["SUBSCRIPTION", "TRANSPORT", "SYSTEM"]
  },
  {
    providerId: "provider-vector-cabline",
    organizationId: "vector-cabline",
    supportedDomains: ["SUBSCRIPTION", "TRANSPORT"]
  },
  {
    providerId: "provider-sleepstandard",
    organizationId: "sleepstandard",
    supportedDomains: ["SUBSCRIPTION", "MEDICAL"]
  },
  {
    providerId: "provider-learnmin-access",
    organizationId: "learnmin-access",
    supportedDomains: ["SUBSCRIPTION", "EDUCATION", "SYSTEM"]
  },
  {
    providerId: "system-runtime",
    sourceKind: "SYSTEM_PROCESS",
    supportedDomains: ["SYSTEM", "CYBERWARE", "WORLD_BRIDGE"]
  },
  {
    providerId: "settlement-engine",
    sourceKind: "SYSTEM_PROCESS",
    supportedDomains: ["BILLING", "SUBSCRIPTION", "SERVICE", "SYSTEM"]
  },
  {
    providerId: "calendar-engine",
    sourceKind: "SYSTEM_PROCESS",
    supportedDomains: ["CALENDAR", "SYSTEM"]
  }
];
