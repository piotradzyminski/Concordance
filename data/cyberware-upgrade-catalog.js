window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.cyberwareUpgradeSystem = Object.freeze({
  schemaVersion: 1,
  scalePolicies: Object.freeze({
    SMALL: Object.freeze({ upgradeCapacity: 0, moduleSlotCount: 0, firmwareCapacity: 0, permanentModificationCapacity: 0 }),
    MEDIUM: Object.freeze({ upgradeCapacity: 1, moduleSlotCount: 1, firmwareCapacity: 1, permanentModificationCapacity: 1 }),
    LARGE: Object.freeze({ upgradeCapacity: 2, moduleSlotCount: 2, firmwareCapacity: 2, permanentModificationCapacity: 1 }),
    FULL_SET: Object.freeze({ upgradeCapacity: 3, moduleSlotCount: 3, firmwareCapacity: 3, permanentModificationCapacity: 2 })
  }),
  domainSlotTemplates: Object.freeze({
    NEUROCHIP: ["MEMORY", "SECURITY", "COOLING"],
    INTERFACE: ["ROUTING", "SECURITY", "COOLING"],
    SERVICE_PORT: ["DIAGNOSTIC", "SECURITY", "UTILITY"],
    OCULAR: ["SENSOR", "PROCESSOR", "SECURITY"],
    AUDIO: ["SENSOR", "PROCESSOR", "SECURITY"],
    HEAD: ["SENSOR", "PROCESSOR", "SECURITY"],
    NEURAL: ["PROCESSOR", "MEMORY", "SECURITY"],
    ARM: ["MOTOR", "UTILITY", "TOOL"],
    FOREARM: ["TOOL", "UTILITY", "POWER"],
    HAND: ["TOOL", "MOTOR", "SENSOR"],
    FINGER: ["TOOL", "SENSOR", "UTILITY"],
    LEG: ["MOTOR", "POWER", "UTILITY"],
    FOOT: ["MOTOR", "SENSOR", "UTILITY"],
    TORSO: ["MEDICAL", "POWER", "SECURITY"],
    ORGAN: ["MEDICAL", "UTILITY", "SECURITY"],
    DERMAL: ["STRUCTURE", "SECURITY", "COOLING"],
    SKELETAL: ["STRUCTURE", "MOTOR", "COOLING"],
    SPINE: ["ROUTING", "STRUCTURE", "COOLING"],
    IMPLANT: ["UTILITY", "SECURITY", "PROCESSOR"]
  }),
  hostOverrides: Object.freeze({
    "mc-modular-arm-m3": Object.freeze({
      upgradeCapacity: 3,
      moduleSlots: [
        { slotId: "motor-1", slotType: "MOTOR" },
        { slotId: "utility-1", slotType: "UTILITY" },
        { slotId: "tool-1", slotType: "TOOL" }
      ]
    }),
    "mc-modular-hand-m3": Object.freeze({
      upgradeCapacity: 2,
      moduleSlots: [
        { slotId: "tool-1", slotType: "TOOL" },
        { slotId: "sensor-1", slotType: "SENSOR" }
      ]
    })
  }),
  moduleDefinitions: Object.freeze([
    {
      id: "cwmod-sensor-clarity-array",
      name: "Sensor Clarity Array",
      itemType: "CYBERWARE_MODULE",
      category: "CYBERWARE",
      subtype: "CYBERWARE_MODULE",
      catalogDomain: "CYBERWARE_MODULE",
      manufacturer: "CoreMed",
      grade: "LICENSED",
      scale: "SMALL",
      basePrice: 2200,
      equipmentFootprint: "1x1",
      moduleProfile: { slotType: "SENSOR", upgradeCapacityCost: 1, compatibleHostDomains: ["OCULAR", "AUDIO", "HEAD", "HAND", "FOOT"], effects: { security: 2, stability: 3 } },
      tags: ["CYBERWARE_MODULE", "SENSOR"]
    },
    {
      id: "cwmod-neuromotor-response-controller",
      name: "Neuromotor Response Controller",
      itemType: "CYBERWARE_MODULE",
      category: "CYBERWARE",
      subtype: "CYBERWARE_MODULE",
      catalogDomain: "CYBERWARE_MODULE",
      manufacturer: "Mass Compression",
      grade: "CORPORATE",
      scale: "SMALL",
      basePrice: 4800,
      equipmentFootprint: "1x1",
      moduleProfile: { slotType: "MOTOR", upgradeCapacityCost: 1, compatibleHostDomains: ["ARM", "FOREARM", "HAND", "LEG", "FOOT", "SKELETAL"], effects: { neurolatencyDelta: -1, neuroLoad: 1, stability: -2 } },
      tags: ["CYBERWARE_MODULE", "MOTOR"]
    },
    {
      id: "cwmod-secure-isolation-cell",
      name: "Secure Isolation Cell",
      itemType: "CYBERWARE_MODULE",
      category: "CYBERWARE",
      subtype: "CYBERWARE_MODULE",
      catalogDomain: "CYBERWARE_MODULE",
      manufacturer: "Kagami Kaisha",
      grade: "CORPORATE",
      scale: "SMALL",
      basePrice: 5200,
      equipmentFootprint: "1x1",
      moduleProfile: { slotType: "SECURITY", upgradeCapacityCost: 1, compatibleHostDomains: ["ANY"], requiredProtocols: ["SECURE"], effects: { security: 12, neuroLoad: 1 } },
      tags: ["CYBERWARE_MODULE", "SECURITY"]
    },
    {
      id: "cwmod-thermal-shunt",
      name: "Thermal Shunt",
      itemType: "CYBERWARE_MODULE",
      category: "CYBERWARE",
      subtype: "CYBERWARE_MODULE",
      catalogDomain: "CYBERWARE_MODULE",
      manufacturer: "Cortex Ladder",
      grade: "LICENSED",
      scale: "SMALL",
      basePrice: 3100,
      equipmentFootprint: "1x1",
      moduleProfile: { slotType: "COOLING", upgradeCapacityCost: 1, compatibleHostDomains: ["ANY"], effects: { stability: 8, interfaceLoad: 1 } },
      tags: ["CYBERWARE_MODULE", "COOLING"]
    },
    {
      id: "cwmod-memory-lane-expansion",
      name: "Memory Lane Expansion",
      itemType: "CYBERWARE_MODULE",
      category: "CYBERWARE",
      subtype: "CYBERWARE_MODULE",
      catalogDomain: "CYBERWARE_MODULE",
      manufacturer: "Cortex Ladder",
      grade: "CORPORATE",
      scale: "SMALL",
      basePrice: 6100,
      equipmentFootprint: "1x1",
      moduleProfile: { slotType: "MEMORY", upgradeCapacityCost: 1, compatibleHostDomains: ["NEUROCHIP", "NEURAL", "PROCESSOR"], effects: { firmwareCapacity: 1, neuroLoad: 1 } },
      tags: ["CYBERWARE_MODULE", "MEMORY"]
    },
    {
      id: "cwmod-medical-regulator",
      name: "Medical Regulator",
      itemType: "CYBERWARE_MODULE",
      category: "CYBERWARE",
      subtype: "CYBERWARE_MODULE",
      catalogDomain: "CYBERWARE_MODULE",
      manufacturer: "TRAUMA Team",
      grade: "CORPORATE",
      scale: "SMALL",
      basePrice: 5700,
      equipmentFootprint: "1x1",
      moduleProfile: { slotType: "MEDICAL", upgradeCapacityCost: 1, compatibleHostDomains: ["TORSO", "ORGAN", "DERMAL"], requiredProtocols: ["MEDICAL"], effects: { stability: 10, neuroLoad: 1 } },
      tags: ["CYBERWARE_MODULE", "MEDICAL"]
    },
    {
      id: "cwmod-utility-tool-bus",
      name: "Utility Tool Bus",
      itemType: "CYBERWARE_MODULE",
      category: "CYBERWARE",
      subtype: "CYBERWARE_MODULE",
      catalogDomain: "CYBERWARE_MODULE",
      manufacturer: "Factory Commons",
      grade: "LICENSED",
      scale: "SMALL",
      basePrice: 1900,
      equipmentFootprint: "1x1",
      moduleProfile: { slotType: "TOOL", upgradeCapacityCost: 1, compatibleHostDomains: ["ARM", "FOREARM", "HAND", "FINGER"], requiredProtocols: ["UTILITY"], effects: { interfaceLoad: 1 } },
      tags: ["CYBERWARE_MODULE", "TOOL", "UTILITY"]
    },
    {
      id: "cwmod-power-buffer",
      name: "Power Buffer",
      itemType: "CYBERWARE_MODULE",
      category: "CYBERWARE",
      subtype: "CYBERWARE_MODULE",
      catalogDomain: "CYBERWARE_MODULE",
      manufacturer: "Factory Commons",
      grade: "LICENSED",
      scale: "SMALL",
      basePrice: 2800,
      equipmentFootprint: "1x1",
      moduleProfile: { slotType: "POWER", upgradeCapacityCost: 1, compatibleHostDomains: ["ARM", "FOREARM", "LEG", "TORSO"], effects: { stability: 4, interfaceLoad: -1 } },
      tags: ["CYBERWARE_MODULE", "POWER"]
    },
    {
      id: "cwmod-routing-matrix",
      name: "Routing Matrix",
      itemType: "CYBERWARE_MODULE",
      category: "CYBERWARE",
      subtype: "CYBERWARE_MODULE",
      catalogDomain: "CYBERWARE_MODULE",
      manufacturer: "Mass Compression",
      grade: "CORPORATE",
      scale: "SMALL",
      basePrice: 6900,
      equipmentFootprint: "1x1",
      moduleProfile: { slotType: "ROUTING", upgradeCapacityCost: 1, compatibleHostDomains: ["INTERFACE", "SPINE", "SERVICE_PORT"], effects: { neuroChannels: 1, interfaceLoad: 1 } },
      tags: ["CYBERWARE_MODULE", "ROUTING"]
    },
    {
      id: "cwmod-structural-reinforcement",
      name: "Structural Reinforcement",
      itemType: "CYBERWARE_MODULE",
      category: "CYBERWARE",
      subtype: "CYBERWARE_MODULE",
      catalogDomain: "CYBERWARE_MODULE",
      manufacturer: "CoreMed",
      grade: "LICENSED",
      scale: "SMALL",
      basePrice: 3400,
      equipmentFootprint: "1x1",
      moduleProfile: { slotType: "STRUCTURE", upgradeCapacityCost: 1, compatibleHostDomains: ["DERMAL", "SKELETAL", "SPINE", "TORSO"], effects: { stability: 7 } },
      tags: ["CYBERWARE_MODULE", "STRUCTURE"]
    }
  ]),
  permanentModificationDefinitions: Object.freeze([
    { id: "cwmod-permanent-overclock", name: "Permanent Overclock", minimumScale: "MEDIUM", capacityCost: 1, effects: { neurolatencyDelta: -1, neuroLoad: 1, stability: -8 }, serviceCost: 4500, durationMinutes: 120 },
    { id: "cwmod-permanent-bus-hardening", name: "Bus Hardening", minimumScale: "MEDIUM", capacityCost: 1, effects: { security: 8, stability: 4, interfaceLoad: 1 }, serviceCost: 3800, durationMinutes: 100 },
    { id: "cwmod-permanent-reinforced-housing", name: "Reinforced Housing", minimumScale: "LARGE", capacityCost: 1, effects: { stability: 10 }, serviceCost: 5200, durationMinutes: 150 },
    { id: "cwmod-permanent-service-adapter", name: "Service Adapter", minimumScale: "LARGE", capacityCost: 1, effects: { upgradeCapacity: 1, firmwareCapacity: 1, stability: -4 }, serviceCost: 7600, durationMinutes: 180 }
  ])
});
