window.APP_DATA = window.APP_DATA || {};

(() => {
  const SERVICE_PORT_FIXED_ROLE = [
    "external diagnostics",
    "firmware service",
    "implant calibration",
    "authorized maintenance access",
    "emergency clinical access"
  ];
  const SERVICE_PORT_NOT_ROLE = [
    "does not host neurochip",
    "does not replace interface",
    "does not increase processing power"
  ];
  const SERVICE_PORT_FIXED_ANATOMY = {
    type: "SERVICE_PORT",
    category: "CYBERWARE",
    subtype: "SERVICE_PORT",
    processorRole: "SERVICE_PORT",
    isServicePort: true,
    cyberwareCandidate: true,
    size: "SMALL",
    scale: "SMALL",
    slot: "neckService",
    primarySlot: "neckService",
    slots: ["neckService"],
    physicalSlot: "neck_service",
    slotsUsed: 1,
    slotCost: 1,
    neuroLoad: 0,
    interfaceLoad: 0,
    requiresNeurochipTier: 0,
    requiresInterfaceTier: 0,
    requiredBuses: [],
    supportedBuses: [],
    location: "neck_head_junction",
    bodyLocation: "neck_head_junction",
    visualLocation: "rear neck Matrix-like cable socket",
    roleDescription: SERVICE_PORT_FIXED_ROLE,
    notRole: SERVICE_PORT_NOT_ROLE
  };

  const manufacturers = [
    {
      id: "coremed-service-port",
      name: "CoreMed Service Port",
      market: "PRIVATE",
      role: "CIVILIAN_SERVICE_ACCESS",
      specialization: "Low-cost legal diagnostics, firmware service and basic calibration.",
      mechanicalProfile: "Standard legal cable service port for civilian cyberware.",
      bestFor: ["Gamma", "civilians", "basic cyberware", "cheap implants"],
      strengths: ["CHEAP_SERVICE", "CIVILIAN_COMPATIBILITY", "LOW_SURGERY_COMPLEXITY"],
      weaknesses: ["AVERAGE_SECURITY", "FULL_SERVICE_TRACE", "WEAK_ADVANCED_IMPLANT_SUPPORT"],
      compatibilityTags: ["CIVIC", "COREMED", "SERVICE", "LEGAL"]
    },
    {
      id: "trauma-emergency-access-port",
      name: "TRAUMA Emergency Access Port",
      market: "PRIVATE",
      role: "MEDICAL_EMERGENCY_ACCESS",
      specialization: "Emergency clinical access, biomonitoring, faulty-implant cutoff and stabilization.",
      mechanicalProfile: "Clinical access port used to keep the body stable before cyberware failure propagates.",
      bestFor: ["TRAUMA patients", "medical cyberware", "neurocrash risk builds"],
      strengths: ["EMERGENCY_ACCESS", "BIOCHIP_COMPATIBILITY", "IMPLANT_CRASH_CUTOFF"],
      weaknesses: ["EXPENSIVE", "DEEP_CLINIC_ACCESS", "TRAUMA_CONTRACT_DEPENDENCY"],
      compatibilityTags: ["MEDICAL", "TRAUMA", "BIOCHIP", "EMERGENCY"]
    },
    {
      id: "live-prevail-maintenance-port",
      name: "Live & Prevail Maintenance Port",
      market: "SYSTEM",
      role: "SYSTEM_MAINTENANCE_ACCESS",
      specialization: "Mass medical maintenance, routine body readout and worker-body service cycles.",
      mechanicalProfile: "Maintenance port for keeping a citizen body useful and medically readable.",
      bestFor: ["Gamma", "workers", "Live & Prevail subscribers", "mass care profiles"],
      strengths: ["MASS_MONITORING", "WORKER_BODY_MAINTENANCE", "L_AND_P_COMPATIBILITY"],
      weaknesses: ["LOWER_PRIORITY_THAN_TRAUMA", "LOW_PRIVACY", "UTILITY_OVER_COMFORT"],
      compatibilityTags: ["SYSTEM", "LIVE_PREVAIL", "MAINTENANCE", "WORKER"]
    },
    {
      id: "kagami-secure-service-port",
      name: "Kagami Secure Service Port",
      market: "PRIVATE",
      role: "SECURE_SERVICE_ACCESS",
      specialization: "Encrypted service access, technician authorization and contaminated-cable cutoff.",
      mechanicalProfile: "Service port that treats every cable as a possible intrusion vector.",
      bestFor: ["netrunners", "agents", "expensive cyberware", "anti-hijack builds"],
      strengths: ["SECURITY_LOCK", "AUTHORIZED_TECHNICIAN_CHECK", "SERVICE_INTRUSION_FIREWALL"],
      weaknesses: ["EXPENSIVE", "CERTIFIED_TOOLS_REQUIRED", "KAGAMI_SERVICE_DEPENDENCY"],
      compatibilityTags: ["SECURE", "NETRUNNER", "KAGAMI", "CORP"]
    },
    {
      id: "mass-compression-grid-port",
      name: "Mass Compression Grid Port",
      market: "PRIVATE",
      role: "MULTI_IMPLANT_SERVICE_ACCESS",
      specialization: "Implant map readout, routing diagnostics, mass calibration and equipment layout reconfiguration.",
      mechanicalProfile: "Service port for bodies with many connected devices.",
      bestFor: ["many-implant builds", "equipment layout users", "modular cyberware", "multiple small implants"],
      strengths: ["IMPLANT_MAP_READOUT", "MULTI_MODULE_DIAGNOSTICS", "HOT_SERVICE_RECONFIGURATION"],
      weaknesses: ["AVERAGE_SECURITY", "FULL_IMPLANT_MAP_EXPOSURE", "CASCADE_CONFIG_FAILURE_RISK"],
      compatibilityTags: ["MASS_COMPRESSION", "EQUIPMENT_LAYOUT", "MULTIBUS", "MODULAR"]
    },
    {
      id: "factory-commons-utility-port",
      name: "Factory Commons Utility Port",
      market: "PRIVATE",
      role: "INDUSTRIAL_SERVICE_ACCESS",
      specialization: "Cheap repair, mechanical resilience and service access in dirty industrial environments.",
      mechanicalProfile: "Workshop cable port for labor cyberware and utility limbs.",
      bestFor: ["workers", "technicians", "lower zones", "utility implants"],
      strengths: ["CHEAP_REPAIR", "MECHANICAL_RESILIENCE", "DIRTY_ENVIRONMENT_SERVICE"],
      weaknesses: ["LOW_SIGNAL_CULTURE", "WEAK_SECURITY", "LOW_PLUGIN_COMFORT"],
      compatibilityTags: ["INDUSTRIAL", "FACTORY", "UTILITY", "LABOR"]
    },
    {
      id: "perfectmin-compliance-port",
      name: "PerfectMin Compliance Port",
      market: "SYSTEM",
      role: "BIOLOGICAL_COMPLIANCE_ACCESS",
      specialization: "Biological audit, implant compliance and unauthorized-modification detection.",
      mechanicalProfile: "System port for checking whether the body still conforms to the human standard.",
      bestFor: ["Alpha", "Beta", "officials", "high-compliance profiles"],
      strengths: ["BIOLOGICAL_COMPLIANCE_AUDIT", "LOW_REJECTION_AFTER_SERVICE", "UNAUTHORIZED_IMPLANT_DETECTION"],
      weaknesses: ["EXTREME_TRACEABILITY", "LOW_PRIVACY", "NONCOMPLIANT_IMPLANT_BLOCKING"],
      compatibilityTags: ["SYSTEM", "PERFECTMIN", "COMPLIANCE", "ALPHA"]
    },
    {
      id: "aurum-discreet-port",
      name: "Aurum Discreet Port",
      market: "PRIVATE",
      role: "LUXURY_DISCREET_ACCESS",
      specialization: "Aesthetic concealment, comfort and precise calibration for premium implants.",
      mechanicalProfile: "Luxury hidden service port that should remain almost invisible even during use.",
      bestFor: ["upper classes", "performers", "diplomats", "precision implants"],
      strengths: ["DISCREET_ACCESS", "PLUGIN_COMFORT", "PRECISION_CALIBRATION"],
      weaknesses: ["EXPENSIVE", "POOR_INDUSTRIAL_SUPPORT", "NOT_HEAVY_SERVICE"],
      compatibilityTags: ["AURUM", "PREMIUM", "DISCREET", "PRECISION"]
    },
    {
      id: "watch-secure-audit-port",
      name: "Watch & Secure Audit Port",
      market: "SYSTEM",
      role: "SECURITY_AUDIT_ACCESS",
      specialization: "Cyberware log readout, TRACE integration, legality checks and operational locks.",
      mechanicalProfile: "Service-issued port used by security services to audit the body as a device.",
      bestFor: ["agents", "informants", "system personnel", "supervised units"],
      strengths: ["CYBERWARE_AUDIT", "TRACE_INTEGRATION", "RISK_IMPLANT_LOCKOUT"],
      weaknesses: ["SURVEILLANCE_EXPOSURE", "CAN_WORK_AGAINST_OWNER", "NOT_PRIVATE"],
      compatibilityTags: ["WATCH_SECURE", "AUDIT", "TRACE", "SECURITY"]
    }
  ];

  const tierDefaults = {
    1: { grade: "CIVILIAN", availability: "COMMON", serviceAccess: 38, diagnosticDepth: 34, firmwareAccess: 28, calibrationQuality: 32, securityLock: 30, emergencyAccess: 26, traceability: 50, basePrice: 450 },
    2: { grade: "LICENSED", availability: "CONTROLLED", serviceAccess: 58, diagnosticDepth: 56, firmwareAccess: 52, calibrationQuality: 55, securityLock: 52, emergencyAccess: 48, traceability: 66, basePrice: 1450 },
    3: { grade: "CORPORATE", availability: "RESTRICTED", serviceAccess: 78, diagnosticDepth: 76, firmwareAccess: 74, calibrationQuality: 76, securityLock: 74, emergencyAccess: 70, traceability: 82, basePrice: 4200 }
  };

  const lines = [
    {
      manufacturerId: "coremed-service-port",
      line: "Service Port",
      models: ["CM-SP1 Civic Socket", "CM-SP2 Workline Socket", "CM-SP3 ServicePlus Socket"],
      features: ["BASIC_DIAGNOSTIC_READOUT", "WORKLINE_IMPLANT_CALIBRATION", "LEGAL_FIRMWARE_SERVICE"],
      tune: { serviceAccess: 4, diagnosticDepth: 3, firmwareAccess: 2, calibrationQuality: 4, securityLock: -4, emergencyAccess: -5, traceability: 8, basePrice: -100 }
    },
    {
      manufacturerId: "trauma-emergency-access-port",
      line: "Emergency Access Port",
      models: ["TR-SP1 Life Access", "TR-SP2 Clinical Access", "TR-SP3 Lazarus Access"],
      features: ["EMERGENCY_BODY_READOUT", "BIOCHIP_DIAGNOSTICS", "FAULTY_IMPLANT_CUTOFF"],
      tune: { serviceAccess: 6, diagnosticDepth: 8, firmwareAccess: 0, calibrationQuality: 6, securityLock: 4, emergencyAccess: 20, traceability: 12, basePrice: 850 }
    },
    {
      manufacturerId: "live-prevail-maintenance-port",
      line: "Maintenance Port",
      models: ["L&P-SP1 Live Port", "L&P-SP2 Sustain Port", "L&P-SP3 Prevail Port"],
      features: ["BASIC_BODY_READOUT", "ROUTINE_BIOLOGICAL_SERVICE", "PREVAIL_MEDICAL_ACCESS"],
      tune: { serviceAccess: 2, diagnosticDepth: 4, firmwareAccess: -6, calibrationQuality: 0, securityLock: -2, emergencyAccess: 4, traceability: 18, basePrice: 50 }
    },
    {
      manufacturerId: "kagami-secure-service-port",
      line: "Secure Service Port",
      models: ["K-SP1 Guard Socket", "K-SP2 Torii Socket", "K-SP3 Senmon Socket"],
      features: ["ENCRYPTED_SERVICE_ACCESS", "AUTHORIZED_TECHNICIAN_CHECK", "CONTAMINATED_CABLE_CUTOFF"],
      tune: { serviceAccess: 4, diagnosticDepth: 6, firmwareAccess: 12, calibrationQuality: 6, securityLock: 24, emergencyAccess: -8, traceability: -2, basePrice: 1250 }
    },
    {
      manufacturerId: "mass-compression-grid-port",
      line: "Grid Port",
      models: ["MC-SP1 Slotline Port", "MC-SP2 Slotlink Port", "MC-SP3 Array Port"],
      features: ["IMPLANT_MAP_READOUT", "MODULE_CONFLICT_DIAGNOSTICS", "EQUIPMENT_LAYOUT_RECONFIGURATION"],
      tune: { serviceAccess: 10, diagnosticDepth: 14, firmwareAccess: 8, calibrationQuality: 14, securityLock: -2, emergencyAccess: 0, traceability: 8, basePrice: 700 }
    },
    {
      manufacturerId: "factory-commons-utility-port",
      line: "Utility Port",
      models: ["FC-SP1 Labor Socket", "FC-SP2 Loadline Socket", "FC-SP3 Workhorse Socket"],
      features: ["WORKSHOP_SERVICE_ACCESS", "LOADLINE_REPAIR_ACCESS", "INDUSTRIAL_TOOL_CALIBRATION"],
      tune: { serviceAccess: 6, diagnosticDepth: -2, firmwareAccess: -8, calibrationQuality: -4, securityLock: -12, emergencyAccess: -2, traceability: 10, physicalResilience: 24, basePrice: -180 }
    },
    {
      manufacturerId: "perfectmin-compliance-port",
      line: "Compliance Port",
      models: ["PM-SP1 Civic Compliance Socket", "PM-SP2 Beta Correction Socket", "PM-SP3 Alpha Standard Socket"],
      features: ["CIVIC_COMPLIANCE_AUDIT", "BETA_INTEGRATION_CORRECTION", "ALPHA_STANDARD_BODY_SERVICE"],
      tune: { serviceAccess: 4, diagnosticDepth: 12, firmwareAccess: 6, calibrationQuality: 12, securityLock: 10, emergencyAccess: 2, traceability: 26, basePrice: 900 }
    },
    {
      manufacturerId: "aurum-discreet-port",
      line: "Discreet Port",
      models: ["Aurum SP1 Grace Socket", "Aurum SP2 Silk Socket", "Aurum SP3 Imperial Socket"],
      features: ["DISCREET_SERVICE_SOCKET", "COMFORT_SENSORY_CALIBRATION", "IMPERIAL_LOW_TRACE_SURGERY"],
      tune: { serviceAccess: 0, diagnosticDepth: 5, firmwareAccess: 6, calibrationQuality: 18, securityLock: 8, emergencyAccess: -8, traceability: -14, basePrice: 1600 }
    },
    {
      manufacturerId: "watch-secure-audit-port",
      line: "Audit Port",
      models: ["W&S-SP1 Audit Socket", "W&S-SP2 Trace Socket", "W&S-SP3 BlackBadge Socket"],
      features: ["CYBERWARE_LOG_READOUT", "TRACE_ACTIVITY_AUDIT", "BLACKBADGE_OPERATIONAL_LOCKS"],
      tune: { serviceAccess: 8, diagnosticDepth: 16, firmwareAccess: 8, calibrationQuality: 4, securityLock: 18, emergencyAccess: -4, traceability: 30, basePrice: 1100 }
    }
  ];

  const manufacturerById = new Map(manufacturers.map((manufacturer) => [manufacturer.id, manufacturer]));
  const servicePorts = lines.flatMap((line) => {
    const manufacturer = manufacturerById.get(line.manufacturerId);
    return line.models.map((model, index) => {
      const tier = index + 1;
      const defaults = tierDefaults[tier];
      const clamp = (key) => Math.max(0, Math.min(100, Math.round(Number(defaults[key] || 0) + Number(line.tune[key] || 0))));
      const basePrice = Math.max(100, Math.round((defaults.basePrice + Number(line.tune.basePrice || 0)) / 50) * 50);
      const id = `service-port-${model.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
      return {
        ...SERVICE_PORT_FIXED_ANATOMY,
        id,
        catalogId: id,
        manufacturerId: line.manufacturerId,
        manufacturer: manufacturer.name,
        provider: manufacturer.name,
        market: manufacturer.market,
        line: line.line,
        model,
        name: model,
        summary: line.features[index].replace(/_/g, " ").toLowerCase(),
        mainFeature: line.features[index],
        description: `${model}. ${manufacturer.mechanicalProfile}`,
        tier,
        servicePortTier: tier,
        grade: defaults.grade,
        legality: manufacturer.market === "SYSTEM" ? "SERVICE_ISSUED" : tier === 1 ? "REGISTERED" : tier === 2 ? "LICENSED" : "RESTRICTED",
        availability: defaults.availability,
        value: basePrice,
        basePrice,
        serviceAccess: clamp("serviceAccess"),
        diagnosticDepth: clamp("diagnosticDepth"),
        firmwareAccess: clamp("firmwareAccess"),
        calibrationQuality: clamp("calibrationQuality"),
        securityLock: clamp("securityLock"),
        emergencyAccess: clamp("emergencyAccess"),
        traceability: clamp("traceability"),
        physicalResilience: Math.max(0, Math.min(100, Math.round(40 + tier * 10 + Number(line.tune.physicalResilience || 0)))) ,
        compatibilityTags: [...manufacturer.compatibilityTags],
        bestFor: [...manufacturer.bestFor],
        strengths: [...manufacturer.strengths],
        weaknesses: [...manufacturer.weaknesses],
        specialFeatures: [line.features[index], ...manufacturer.strengths.slice(0, 2)],
        tags: [
          "CYBERWARE",
          "SERVICE_PORT",
          "PORT",
          defaults.grade,
          defaults.availability,
          manufacturer.role,
          ...manufacturer.compatibilityTags
        ],
        notes: `${model}. Service Port is always SMALL, one neck_service slot, neck-head junction, external diagnostics and service access only.`
      };
    });
  });

  window.APP_DATA.servicePortCatalog = { manufacturers, servicePorts };
  window.APP_DATA.servicePortManufacturers = manufacturers;
  window.APP_DATA.servicePorts = servicePorts;
})();
