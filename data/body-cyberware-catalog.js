window.APP_DATA = window.APP_DATA || {};

(() => {
  const bodyCyberware = [
  {
    "id": "coremed-basicsight-l2",
    "name": "CoreMed BasicSight L2 Eye",
    "subtype": "OCULAR",
    "manufacturer": "CoreMed",
    "line": "BasicSight L2",
    "grade": "CIVILIAN",
    "scale": "SMALL",
    "primarySlot": "leftEye",
    "slots": [
      "leftEye"
    ],
    "slotLevel": "SMALL",
    "neuroLoad": 1,
    "interfaceLoad": 1,
    "requiresNeurochipTier": 1,
    "requiresInterfaceTier": 1,
    "requiredProtocols": [
      "CIVIC"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 1800,
    "availability": "COMMON",
    "legality": "REGISTERED",
    "equipmentFootprint": "1x1",
    "summary": "Civilian-grade ocular replacement with basic low-light correction.",
    "tags": [
      "OCULAR",
      "VISION",
      "CIVILIAN"
    ],
    "compatibleSlots": [
      "leftEye",
      "rightEye"
    ]
  },
  {
    "id": "aurum-silkeye-a3",
    "name": "Aurum SilkEye A3 Eye",
    "subtype": "OCULAR",
    "manufacturer": "Aurum",
    "line": "SilkEye A3",
    "grade": "CORPORATE",
    "scale": "SMALL",
    "primarySlot": "leftEye",
    "slots": [
      "leftEye"
    ],
    "slotLevel": "SMALL",
    "neuroLoad": 2,
    "interfaceLoad": 1,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "CIVIC",
      "SENSORY"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 5600,
    "availability": "CONTROLLED",
    "legality": "LICENSED",
    "equipmentFootprint": "1x1",
    "summary": "Premium ocular implant focused on clean signal and fine visual precision.",
    "specialFeatures": [
      "LOW_LATENCY_VISUAL_FEED",
      "PRECISION_COLOR_FILTER"
    ],
    "tags": [
      "OCULAR",
      "VISION",
      "AURUM",
      "PRECISION"
    ],
    "compatibleSlots": [
      "leftEye",
      "rightEye"
    ]
  },
  {
    "id": "kagami-watcheye-k3-pair",
    "name": "Kagami WatchEye K3 Pair Suite",
    "subtype": "OCULAR",
    "manufacturer": "Kagami Kaisha",
    "line": "WatchEye K3",
    "grade": "CORPORATE",
    "scale": "MEDIUM",
    "primarySlot": "ocularSet",
    "slots": [
      "ocularSet"
    ],
    "slotLevel": "SET",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 5,
    "interfaceLoad": 3,
    "requiresNeurochipTier": 3,
    "requiresInterfaceTier": 3,
    "requiredProtocols": [
      "SECURE",
      "SENSORY"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 16800,
    "availability": "RARE",
    "legality": "RESTRICTED",
    "equipmentFootprint": "1x1",
    "summary": "Paired secure ocular suite with protected visual signal path.",
    "specialFeatures": [
      "SECURE_VISUAL_CHANNEL",
      "TAMPER_DETECTION"
    ],
    "tags": [
      "OCULAR",
      "PAIR",
      "VISION",
      "KAGAMI",
      "SECURE"
    ]
  },
  {
    "id": "coremed-civic-ear",
    "name": "CoreMed Civic Ear",
    "subtype": "AUDIO",
    "manufacturer": "CoreMed",
    "line": "Civic Ear",
    "grade": "CIVILIAN",
    "scale": "SMALL",
    "primarySlot": "leftEar",
    "slots": [
      "leftEar"
    ],
    "slotLevel": "SMALL",
    "neuroLoad": 1,
    "interfaceLoad": 1,
    "requiresNeurochipTier": 1,
    "requiresInterfaceTier": 1,
    "requiredProtocols": [
      "CIVIC"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 1200,
    "availability": "COMMON",
    "legality": "REGISTERED",
    "equipmentFootprint": "1x1",
    "tags": [
      "AUDIO",
      "HEARING",
      "CIVILIAN"
    ],
    "summary": "",
    "compatibleSlots": [
      "leftEar",
      "rightEar"
    ]
  },
  {
    "id": "kagami-secure-audio",
    "name": "Kagami Secure Audio",
    "subtype": "AUDIO",
    "manufacturer": "Kagami Kaisha",
    "line": "Secure Audio",
    "grade": "CORPORATE",
    "scale": "SMALL",
    "primarySlot": "leftEar",
    "slots": [
      "leftEar"
    ],
    "slotLevel": "SMALL",
    "neuroLoad": 2,
    "interfaceLoad": 2,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "SECURE",
      "SENSORY"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 4200,
    "availability": "CONTROLLED",
    "legality": "LICENSED",
    "equipmentFootprint": "1x1",
    "specialFeatures": [
      "AUDIO_SPOOF_FILTER",
      "SECURE_AUDIO_CHANNEL"
    ],
    "tags": [
      "AUDIO",
      "KAGAMI",
      "SECURE"
    ],
    "summary": "",
    "compatibleSlots": [
      "leftEar",
      "rightEar"
    ]
  },
  {
    "id": "coremed-dermal-mesh-c1",
    "name": "CoreMed Dermal Mesh C1",
    "subtype": "DERMAL",
    "manufacturer": "CoreMed",
    "line": "Dermal Mesh",
    "grade": "CIVILIAN",
    "scale": "MEDIUM",
    "primarySlot": "dermal",
    "slots": [
      "dermal"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 2,
    "interfaceLoad": 2,
    "requiresNeurochipTier": 1,
    "requiresInterfaceTier": 1,
    "requiredProtocols": [
      "CIVIC"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 3600,
    "availability": "COMMON",
    "legality": "REGISTERED",
    "equipmentFootprint": "1x1",
    "tags": [
      "DERMAL",
      "SKIN",
      "PROTECTION",
      "CIVILIAN"
    ]
  },
  {
    "id": "factory-workskin-layer-f2",
    "name": "Factory Commons Workskin Layer F2",
    "subtype": "DERMAL",
    "manufacturer": "Factory Commons",
    "line": "Workskin Layer",
    "grade": "LICENSED",
    "scale": "MEDIUM",
    "primarySlot": "dermal",
    "slots": [
      "dermal"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 2,
    "interfaceLoad": 3,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "UTILITY",
      "INDUSTRIAL"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 6200,
    "availability": "COMMON",
    "legality": "LICENSED",
    "equipmentFootprint": "2x1",
    "specialFeatures": [
      "ABRASION_RESISTANCE",
      "THERMAL_WORK_LAYER"
    ],
    "tags": [
      "DERMAL",
      "FACTORY_COMMONS",
      "WORK",
      "PROTECTION"
    ]
  },
  {
    "id": "trauma-burnseal-dermal-t2",
    "name": "TRAUMA BurnSeal Dermal T2",
    "subtype": "DERMAL",
    "manufacturer": "TRAUMA",
    "line": "BurnSeal Dermal",
    "grade": "LICENSED",
    "scale": "MEDIUM",
    "primarySlot": "dermal",
    "slots": [
      "dermal"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 2,
    "interfaceLoad": 2,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "MEDICAL"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 7400,
    "availability": "CONTROLLED",
    "legality": "LICENSED",
    "equipmentFootprint": "2x1",
    "specialFeatures": [
      "BURN_STABILIZATION",
      "WOUND_SEALING"
    ],
    "tags": [
      "DERMAL",
      "TRAUMA",
      "MEDICAL",
      "PROTECTION"
    ]
  },
  {
    "id": "kagami-signal-damp-skin-k2",
    "name": "Kagami Signal-Damp Skin K2",
    "subtype": "DERMAL",
    "manufacturer": "Kagami Kaisha",
    "line": "Signal-Damp Skin",
    "grade": "CORPORATE",
    "scale": "MEDIUM",
    "primarySlot": "dermal",
    "slots": [
      "dermal"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 3,
    "interfaceLoad": 3,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 3,
    "requiredProtocols": [
      "SECURE"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 11800,
    "availability": "RARE",
    "legality": "RESTRICTED",
    "equipmentFootprint": "2x1",
    "specialFeatures": [
      "SIGNAL_DAMPING",
      "IMPLANT_SCAN_NOISE"
    ],
    "tags": [
      "DERMAL",
      "KAGAMI",
      "SECURE",
      "COUNTER_SURVEILLANCE"
    ]
  },
  {
    "id": "coremed-assisted-heart-c2",
    "name": "CoreMed Assisted Heart C2",
    "subtype": "CARDIAC",
    "manufacturer": "CoreMed",
    "line": "Assisted Heart",
    "grade": "LICENSED",
    "scale": "MEDIUM",
    "primarySlot": "cardiac",
    "slots": [
      "cardiac"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 2,
    "interfaceLoad": 2,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 1,
    "requiredProtocols": [
      "CIVIC",
      "MEDICAL"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 9200,
    "availability": "CONTROLLED",
    "legality": "LICENSED",
    "equipmentFootprint": "2x1",
    "tags": [
      "CARDIAC",
      "ORGAN",
      "HEART",
      "MEDICAL"
    ]
  },
  {
    "id": "trauma-clinical-heart-t3",
    "name": "TRAUMA Clinical Heart T3",
    "subtype": "CARDIAC",
    "manufacturer": "TRAUMA",
    "line": "Clinical Heart",
    "grade": "CORPORATE",
    "scale": "MEDIUM",
    "primarySlot": "cardiac",
    "slots": [
      "cardiac"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 3,
    "interfaceLoad": 2,
    "requiresNeurochipTier": 3,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "MEDICAL",
      "TRAUMA"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 18200,
    "availability": "RARE",
    "legality": "LICENSED",
    "equipmentFootprint": "2x1",
    "specialFeatures": [
      "EMERGENCY_CARDIAC_TELEMETRY",
      "TRAUMA_BIOMONITOR_READY"
    ],
    "tags": [
      "CARDIAC",
      "ORGAN",
      "TRAUMA",
      "MEDICAL"
    ]
  },
  {
    "id": "coremed-filter-liver-c2",
    "name": "CoreMed Filter Liver C2",
    "subtype": "ORGAN",
    "manufacturer": "CoreMed",
    "line": "Filter Liver",
    "grade": "LICENSED",
    "scale": "MEDIUM",
    "primarySlot": "liver",
    "slots": [
      "liver"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 2,
    "interfaceLoad": 1,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 1,
    "requiredProtocols": [
      "CIVIC",
      "MEDICAL"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 8400,
    "availability": "COMMON",
    "legality": "LICENSED",
    "equipmentFootprint": "2x1",
    "tags": [
      "ORGAN",
      "LIVER",
      "FILTER",
      "MEDICAL"
    ]
  },
  {
    "id": "trauma-regen-liver-t3",
    "name": "TRAUMA Regen Liver T3",
    "subtype": "ORGAN",
    "manufacturer": "TRAUMA",
    "line": "Regen Liver",
    "grade": "CORPORATE",
    "scale": "MEDIUM",
    "primarySlot": "liver",
    "slots": [
      "liver"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 3,
    "interfaceLoad": 2,
    "requiresNeurochipTier": 3,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "MEDICAL",
      "TRAUMA"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 16400,
    "availability": "RARE",
    "legality": "LICENSED",
    "equipmentFootprint": "2x1",
    "specialFeatures": [
      "TOXIN_RECOVERY",
      "TRAUMA_BIOMONITOR_READY"
    ],
    "tags": [
      "ORGAN",
      "LIVER",
      "TRAUMA",
      "MEDICAL"
    ]
  },
  {
    "id": "coremed-synthetic-kidney-pair-c2",
    "name": "CoreMed Synthetic Kidney Pair C2",
    "subtype": "ORGAN",
    "manufacturer": "CoreMed",
    "line": "Synthetic Kidney Pair",
    "grade": "LICENSED",
    "scale": "MEDIUM",
    "primarySlot": "leftKidney",
    "slots": [
      "leftKidney",
      "rightKidney"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 2,
    "interfaceLoad": 2,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 1,
    "requiredProtocols": [
      "CIVIC",
      "MEDICAL"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 11200,
    "availability": "COMMON",
    "legality": "LICENSED",
    "equipmentFootprint": "2x1",
    "tags": [
      "ORGAN",
      "KIDNEY",
      "PAIR",
      "MEDICAL"
    ],
    "summary": "",
    "compatibleSlots": [
      "leftKidney",
      "rightKidney"
    ]
  },
  {
    "id": "factory-utility-lungs-f2",
    "name": "Factory Commons Utility Lungs F2",
    "subtype": "RESPIRATORY",
    "manufacturer": "Factory Commons",
    "line": "Utility Lungs",
    "grade": "LICENSED",
    "scale": "MEDIUM",
    "primarySlot": "respiratory",
    "slots": [
      "respiratory"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 2,
    "interfaceLoad": 3,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "UTILITY",
      "INDUSTRIAL"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 9800,
    "availability": "COMMON",
    "legality": "LICENSED",
    "equipmentFootprint": "2x1",
    "specialFeatures": [
      "DUST_FILTERING",
      "LOW_OXYGEN_WORK_SUPPORT"
    ],
    "tags": [
      "RESPIRATORY",
      "ORGAN",
      "LUNGS",
      "FACTORY_COMMONS"
    ]
  },
  {
    "id": "trauma-clinical-lungs-t3",
    "name": "TRAUMA Clinical Lungs T3",
    "subtype": "RESPIRATORY",
    "manufacturer": "TRAUMA",
    "line": "Clinical Lungs",
    "grade": "CORPORATE",
    "scale": "MEDIUM",
    "primarySlot": "respiratory",
    "slots": [
      "respiratory"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 3,
    "interfaceLoad": 2,
    "requiresNeurochipTier": 3,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "MEDICAL",
      "TRAUMA"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 18800,
    "availability": "RARE",
    "legality": "LICENSED",
    "equipmentFootprint": "2x1",
    "specialFeatures": [
      "RESPIRATORY_STABILIZATION",
      "TRAUMA_BIOMONITOR_READY"
    ],
    "tags": [
      "RESPIRATORY",
      "ORGAN",
      "LUNGS",
      "TRAUMA"
    ]
  },
  {
    "id": "coremed-spinal-relay-c2",
    "name": "CoreMed Spinal Relay C2",
    "subtype": "SPINE",
    "manufacturer": "CoreMed",
    "line": "Spinal Relay",
    "grade": "LICENSED",
    "scale": "LARGE",
    "primarySlot": "spineCore",
    "slots": [
      "spineCore"
    ],
    "slotLevel": "BIG",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 4,
    "interfaceLoad": 3,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "CIVIC"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 14800,
    "availability": "CONTROLLED",
    "legality": "LICENSED",
    "equipmentFootprint": "2x2",
    "tags": [
      "SPINE",
      "RELAY",
      "BODY_BUS"
    ]
  },
  {
    "id": "mc-spine-bus-m3",
    "name": "Mass Compression Spine Bus M3",
    "subtype": "SPINE",
    "manufacturer": "Mass Compression",
    "line": "Spine Bus M3",
    "grade": "CORPORATE",
    "scale": "LARGE",
    "primarySlot": "spineCore",
    "slots": [
      "spineCore"
    ],
    "slotLevel": "BIG",
    "descendantPolicy": "LOCK_BY_DEFAULT",
    "exposedSlots": [
      "armsSet",
      "legsSet"
    ],
    "acceptedManufacturers": [
      "Mass Compression"
    ],
    "acceptedStandards": [
      "MC_BODY_BUS_M3"
    ],
    "compatibilityGroup": "MC_SPINE_M3",
    "neuroLoad": 5,
    "interfaceLoad": 5,
    "requiresNeurochipTier": 3,
    "requiresInterfaceTier": 3,
    "requiredProtocols": [
      "UTILITY"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "requiredComponentStandards": [
      "MC_BODY_BUS_M3"
    ],
    "basePrice": 24200,
    "availability": "RARE",
    "legality": "LICENSED",
    "equipmentFootprint": "2x2",
    "tags": [
      "SPINE",
      "MASS_COMPRESSION",
      "MODULAR",
      "BODY_BUS"
    ]
  },
  {
    "id": "factory-load-spine-f3",
    "name": "Factory Commons Load Spine F3",
    "subtype": "SPINE",
    "manufacturer": "Factory Commons",
    "line": "Load Spine",
    "grade": "LICENSED",
    "scale": "LARGE",
    "primarySlot": "spineCore",
    "slots": [
      "spineCore"
    ],
    "slotLevel": "BIG",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 4,
    "interfaceLoad": 4,
    "requiresNeurochipTier": 3,
    "requiresInterfaceTier": 3,
    "requiredProtocols": [
      "INDUSTRIAL"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 17600,
    "availability": "CONTROLLED",
    "legality": "LICENSED",
    "equipmentFootprint": "2x2",
    "tags": [
      "SPINE",
      "FACTORY_COMMONS",
      "LOAD",
      "WORK"
    ]
  },
  {
    "id": "kagami-spine-isolation-k3",
    "name": "Kagami Spine Isolation Relay K3",
    "subtype": "SPINE",
    "manufacturer": "Kagami Kaisha",
    "line": "Spine Isolation Relay",
    "grade": "CORPORATE",
    "scale": "LARGE",
    "primarySlot": "spineCore",
    "slots": [
      "spineCore"
    ],
    "slotLevel": "BIG",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 5,
    "interfaceLoad": 4,
    "requiresNeurochipTier": 3,
    "requiresInterfaceTier": 3,
    "requiredProtocols": [
      "SECURE"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 28600,
    "availability": "RARE",
    "legality": "RESTRICTED",
    "equipmentFootprint": "2x2",
    "specialFeatures": [
      "SPINAL_SIGNAL_ISOLATION",
      "HIJACK_CUTOFF"
    ],
    "tags": [
      "SPINE",
      "KAGAMI",
      "SECURE",
      "ISOLATION"
    ]
  },
  {
    "id": "factory-labor-arm-f2",
    "name": "Factory Commons Labor Arm F2",
    "subtype": "ARM",
    "manufacturer": "Factory Commons",
    "line": "Labor Arm F2",
    "grade": "LICENSED",
    "scale": "LARGE",
    "primarySlot": "leftArmCore",
    "slots": [
      "leftArmCore"
    ],
    "slotLevel": "BIG",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 4,
    "interfaceLoad": 4,
    "requiresNeurochipTier": 3,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "INDUSTRIAL",
      "UTILITY"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 12800,
    "availability": "COMMON",
    "legality": "LICENSED",
    "equipmentFootprint": "2x2",
    "tags": [
      "ARM",
      "FACTORY_COMMONS",
      "WORK"
    ],
    "summary": "",
    "compatibleSlots": [
      "leftArmCore",
      "rightArmCore"
    ]
  },
  {
    "id": "mc-modular-arm-m3",
    "name": "Mass Compression Modular Arm M3",
    "subtype": "ARM",
    "manufacturer": "Mass Compression",
    "line": "Modular Arm M3",
    "grade": "CORPORATE",
    "scale": "LARGE",
    "primarySlot": "leftArmCore",
    "slots": [
      "leftArmCore"
    ],
    "slotLevel": "BIG",
    "descendantPolicy": "LOCK_BY_DEFAULT",
    "exposedSlots": [
      "leftHandCore"
    ],
    "acceptedChildGroups": [
      "MC_HAND_M3_L"
    ],
    "acceptedManufacturers": [
      "Mass Compression"
    ],
    "acceptedStandards": [
      "MC_ARM_M3_L"
    ],
    "compatibilityGroup": "MC_ARM_M3_L",
    "neuroLoad": 5,
    "interfaceLoad": 5,
    "requiresNeurochipTier": 3,
    "requiresInterfaceTier": 3,
    "requiredProtocols": [
      "UTILITY"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "requiredComponentStandards": [
      "MC_ARM_M3_L"
    ],
    "basePrice": 22400,
    "availability": "RARE",
    "legality": "LICENSED",
    "equipmentFootprint": "2x2",
    "tags": [
      "ARM",
      "MASS_COMPRESSION",
      "MODULAR"
    ],
    "summary": "",
    "compatibleSlots": [
      "leftArmCore",
      "rightArmCore"
    ]
  },
  {
    "id": "factory-tool-forearm-f2",
    "name": "Factory Commons Tool Forearm F2",
    "subtype": "FOREARM",
    "manufacturer": "Factory Commons",
    "line": "Tool Forearm F2",
    "grade": "LICENSED",
    "scale": "MEDIUM",
    "primarySlot": "leftForearm",
    "slots": [
      "leftForearm"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 3,
    "interfaceLoad": 3,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "UTILITY",
      "INDUSTRIAL"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 8200,
    "availability": "COMMON",
    "legality": "LICENSED",
    "equipmentFootprint": "1x2",
    "specialFeatures": [
      "INTEGRATED_TOOL_MOUNT"
    ],
    "tags": [
      "FOREARM",
      "FACTORY_COMMONS",
      "TOOL"
    ],
    "summary": "",
    "compatibleSlots": [
      "leftForearm",
      "rightForearm"
    ]
  },
  {
    "id": "coremed-civic-hand-c2",
    "name": "CoreMed Civic Hand C2",
    "subtype": "HAND",
    "manufacturer": "CoreMed",
    "line": "Civic Hand C2",
    "grade": "LICENSED",
    "scale": "MEDIUM",
    "primarySlot": "leftHandCore",
    "slots": [
      "leftHandCore"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 3,
    "interfaceLoad": 2,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "CIVIC"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 7600,
    "availability": "COMMON",
    "legality": "LICENSED",
    "equipmentFootprint": "1x2",
    "tags": [
      "HAND",
      "COREMED",
      "CIVIC"
    ],
    "summary": "",
    "compatibleSlots": [
      "leftHandCore",
      "rightHandCore"
    ]
  },
  {
    "id": "mc-modular-hand-m3",
    "name": "Mass Compression Modular Hand M3",
    "subtype": "HAND",
    "manufacturer": "Mass Compression",
    "line": "Modular Hand M3",
    "grade": "CORPORATE",
    "scale": "MEDIUM",
    "primarySlot": "leftHandCore",
    "slots": [
      "leftHandCore"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "PARTIAL_EDIT",
    "lockedDescendants": [
      "leftPalm"
    ],
    "exposedSlots": [
      "leftThumb",
      "leftIndexFinger",
      "leftMiddleFinger",
      "leftRingFinger",
      "leftLittleFinger"
    ],
    "acceptedChildGroups": [
      "MC_FINGER_M3_L",
      "MC_TOOL_FINGER_M3_L"
    ],
    "acceptedManufacturers": [
      "Mass Compression"
    ],
    "acceptedStandards": [
      "MC_HAND_M3_L"
    ],
    "compatibilityGroup": "MC_HAND_M3_L",
    "compatibleWith": [
      "MC_ARM_M3_L"
    ],
    "neuroLoad": 4,
    "interfaceLoad": 4,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "UTILITY"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "requiredComponentStandards": [
      "MC_HAND_M3_L"
    ],
    "basePrice": 13400,
    "availability": "CONTROLLED",
    "legality": "LICENSED",
    "equipmentFootprint": "1x2",
    "tags": [
      "HAND",
      "MASS_COMPRESSION",
      "MODULAR"
    ],
    "summary": "",
    "compatibleSlots": [
      "leftHandCore",
      "rightHandCore"
    ]
  },
  {
    "id": "mc-index-finger-m3",
    "name": "Mass Compression Index Finger M3",
    "subtype": "FINGER",
    "manufacturer": "Mass Compression",
    "line": "M3 Finger",
    "grade": "LICENSED",
    "scale": "SMALL",
    "primarySlot": "leftIndexFinger",
    "slots": [
      "leftIndexFinger"
    ],
    "slotLevel": "SMALL",
    "compatibilityGroup": "MC_FINGER_M3_L",
    "compatibleWith": [
      "MC_HAND_M3_L"
    ],
    "neuroLoad": 1,
    "interfaceLoad": 1,
    "requiresNeurochipTier": 1,
    "requiresInterfaceTier": 1,
    "requiredProtocols": [
      "UTILITY"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "requiredComponentStandards": [
      "MC_HAND_M3_L"
    ],
    "basePrice": 1700,
    "availability": "COMMON",
    "legality": "LICENSED",
    "equipmentFootprint": "1x1",
    "tags": [
      "FINGER",
      "INDEX",
      "MASS_COMPRESSION",
      "MODULAR"
    ],
    "summary": "",
    "compatibleSlots": [
      "leftIndexFinger",
      "rightIndexFinger"
    ]
  },
  {
    "id": "mc-thumb-m3",
    "name": "Mass Compression Thumb M3",
    "subtype": "FINGER",
    "manufacturer": "Mass Compression",
    "line": "M3 Finger",
    "grade": "LICENSED",
    "scale": "SMALL",
    "primarySlot": "leftThumb",
    "slots": [
      "leftThumb"
    ],
    "slotLevel": "SMALL",
    "compatibilityGroup": "MC_FINGER_M3_L",
    "compatibleWith": [
      "MC_HAND_M3_L"
    ],
    "neuroLoad": 1,
    "interfaceLoad": 1,
    "requiresNeurochipTier": 1,
    "requiresInterfaceTier": 1,
    "requiredProtocols": [
      "UTILITY"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "requiredComponentStandards": [
      "MC_HAND_M3_L"
    ],
    "basePrice": 1800,
    "availability": "COMMON",
    "legality": "LICENSED",
    "equipmentFootprint": "1x1",
    "tags": [
      "FINGER",
      "THUMB",
      "MASS_COMPRESSION",
      "MODULAR"
    ],
    "summary": "",
    "compatibleSlots": [
      "leftThumb"
    ]
  },
  {
    "id": "factory-tool-finger-f2",
    "name": "Factory Commons Tool Finger F2",
    "subtype": "FINGER",
    "manufacturer": "Factory Commons",
    "line": "Tool Finger F2",
    "grade": "LICENSED",
    "scale": "SMALL",
    "primarySlot": "rightIndexFinger",
    "slots": [
      "rightIndexFinger"
    ],
    "slotLevel": "SMALL",
    "neuroLoad": 1,
    "interfaceLoad": 2,
    "requiresNeurochipTier": 1,
    "requiresInterfaceTier": 1,
    "requiredProtocols": [
      "UTILITY",
      "INDUSTRIAL"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 1500,
    "availability": "COMMON",
    "legality": "LICENSED",
    "equipmentFootprint": "1x1",
    "specialFeatures": [
      "MICRO_TOOL_TIP"
    ],
    "tags": [
      "FINGER",
      "TOOL",
      "FACTORY_COMMONS"
    ],
    "summary": "",
    "compatibleSlots": [
      "rightIndexFinger"
    ]
  },
  {
    "id": "factory-labor-leg-f2",
    "name": "Factory Commons Labor Leg F2",
    "subtype": "LEG",
    "manufacturer": "Factory Commons",
    "line": "Labor Leg F2",
    "grade": "LICENSED",
    "scale": "LARGE",
    "primarySlot": "leftLegCore",
    "slots": [
      "leftLegCore"
    ],
    "slotLevel": "BIG",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 4,
    "interfaceLoad": 4,
    "requiresNeurochipTier": 3,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "INDUSTRIAL",
      "UTILITY"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 12600,
    "availability": "COMMON",
    "legality": "LICENSED",
    "equipmentFootprint": "2x2",
    "tags": [
      "LEG",
      "FACTORY_COMMONS",
      "WORK"
    ],
    "summary": "",
    "compatibleSlots": [
      "leftLegCore",
      "rightLegCore"
    ]
  },
  {
    "id": "coremed-civic-leg-c2",
    "name": "CoreMed Civic Leg C2",
    "subtype": "LEG",
    "manufacturer": "CoreMed",
    "line": "Civic Leg C2",
    "grade": "LICENSED",
    "scale": "LARGE",
    "primarySlot": "leftLegCore",
    "slots": [
      "leftLegCore"
    ],
    "slotLevel": "BIG",
    "descendantPolicy": "LOCK_BY_DEFAULT",
    "exposedSlots": [
      "leftFootCore"
    ],
    "acceptedManufacturers": [
      "CoreMed"
    ],
    "acceptedStandards": [
      "CIVIC"
    ],
    "neuroLoad": 4,
    "interfaceLoad": 3,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "CIVIC"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 11800,
    "availability": "COMMON",
    "legality": "LICENSED",
    "equipmentFootprint": "2x2",
    "tags": [
      "LEG",
      "COREMED",
      "CIVIC"
    ],
    "summary": "",
    "compatibleSlots": [
      "leftLegCore",
      "rightLegCore"
    ]
  },
  {
    "id": "factory-grip-foot-f2",
    "name": "Factory Commons Grip Foot F2",
    "subtype": "FOOT",
    "manufacturer": "Factory Commons",
    "line": "Grip Foot F2",
    "grade": "LICENSED",
    "scale": "MEDIUM",
    "primarySlot": "leftFootCore",
    "slots": [
      "leftFootCore"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 2,
    "interfaceLoad": 2,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 1,
    "requiredProtocols": [
      "UTILITY",
      "INDUSTRIAL"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 5200,
    "availability": "COMMON",
    "legality": "LICENSED",
    "equipmentFootprint": "1x2",
    "tags": [
      "FOOT",
      "FACTORY_COMMONS",
      "GRIP"
    ],
    "summary": "",
    "compatibleSlots": [
      "leftFootCore",
      "rightFootCore"
    ]
  },
  {
    "id": "aurum-balance-foot-a2",
    "name": "Aurum Balance Foot A2",
    "subtype": "FOOT",
    "manufacturer": "Aurum",
    "line": "Balance Foot A2",
    "grade": "CORPORATE",
    "scale": "MEDIUM",
    "primarySlot": "leftFootCore",
    "slots": [
      "leftFootCore"
    ],
    "slotLevel": "MEDIUM",
    "descendantPolicy": "LOCK_ALL",
    "neuroLoad": 2,
    "interfaceLoad": 2,
    "requiresNeurochipTier": 2,
    "requiresInterfaceTier": 2,
    "requiredProtocols": [
      "CIVIC",
      "SENSORY"
    ],
    "requiredBuses": [
      "STANDARD_BODY_BUS"
    ],
    "basePrice": 9800,
    "availability": "CONTROLLED",
    "legality": "LICENSED",
    "equipmentFootprint": "1x2",
    "tags": [
      "FOOT",
      "AURUM",
      "BALANCE",
      "PRECISION"
    ],
    "summary": "",
    "compatibleSlots": [
      "leftFootCore",
      "rightFootCore"
    ]
  }
];
  const bodyCyberwareDefinitionAliases = {
  "coremed-basicsight-l2": "coremed-basicsight-l2",
  "coremed-basicsight-l2-left": "coremed-basicsight-l2",
  "coremed-basicsight-l2-right": "coremed-basicsight-l2",
  "aurum-silkeye-a3": "aurum-silkeye-a3",
  "aurum-silkeye-a3-left": "aurum-silkeye-a3",
  "aurum-silkeye-a3-right": "aurum-silkeye-a3",
  "coremed-civic-ear": "coremed-civic-ear",
  "coremed-civic-ear-left": "coremed-civic-ear",
  "coremed-civic-ear-right": "coremed-civic-ear",
  "kagami-secure-audio": "kagami-secure-audio",
  "kagami-secure-audio-left": "kagami-secure-audio",
  "kagami-secure-audio-right": "kagami-secure-audio",
  "coremed-synthetic-kidney-pair-c2": "coremed-synthetic-kidney-pair-c2",
  "factory-labor-arm-f2": "factory-labor-arm-f2",
  "factory-labor-arm-left-f2": "factory-labor-arm-f2",
  "factory-labor-arm-right-f2": "factory-labor-arm-f2",
  "mc-modular-arm-m3": "mc-modular-arm-m3",
  "mc-modular-arm-left-m3": "mc-modular-arm-m3",
  "mc-modular-arm-right-m3": "mc-modular-arm-m3",
  "factory-tool-forearm-f2": "factory-tool-forearm-f2",
  "factory-tool-forearm-left-f2": "factory-tool-forearm-f2",
  "factory-tool-forearm-right-f2": "factory-tool-forearm-f2",
  "coremed-civic-hand-c2": "coremed-civic-hand-c2",
  "coremed-civic-hand-left-c2": "coremed-civic-hand-c2",
  "coremed-civic-hand-right-c2": "coremed-civic-hand-c2",
  "mc-modular-hand-m3": "mc-modular-hand-m3",
  "mc-modular-hand-left-m3": "mc-modular-hand-m3",
  "mc-modular-hand-right-m3": "mc-modular-hand-m3",
  "mc-index-finger-m3": "mc-index-finger-m3",
  "mc-index-finger-left-m3": "mc-index-finger-m3",
  "mc-index-finger-right-m3": "mc-index-finger-m3",
  "mc-thumb-m3": "mc-thumb-m3",
  "mc-thumb-left-m3": "mc-thumb-m3",
  "factory-tool-finger-f2": "factory-tool-finger-f2",
  "factory-tool-finger-right-f2": "factory-tool-finger-f2",
  "factory-labor-leg-f2": "factory-labor-leg-f2",
  "factory-labor-leg-left-f2": "factory-labor-leg-f2",
  "factory-labor-leg-right-f2": "factory-labor-leg-f2",
  "coremed-civic-leg-c2": "coremed-civic-leg-c2",
  "coremed-civic-leg-left-c2": "coremed-civic-leg-c2",
  "coremed-civic-leg-right-c2": "coremed-civic-leg-c2",
  "factory-grip-foot-f2": "factory-grip-foot-f2",
  "factory-grip-foot-left-f2": "factory-grip-foot-f2",
  "factory-grip-foot-right-f2": "factory-grip-foot-f2",
  "aurum-balance-foot-a2": "aurum-balance-foot-a2",
  "aurum-balance-foot-left-a2": "aurum-balance-foot-a2",
  "aurum-balance-foot-right-a2": "aurum-balance-foot-a2"
};
  window.APP_DATA.bodyCyberwareCatalog = { bodyCyberware, definitionAliases: bodyCyberwareDefinitionAliases };
  window.APP_DATA.bodyCyberware = bodyCyberware;
  window.APP_DATA.bodyCyberwareDefinitionAliases = bodyCyberwareDefinitionAliases;
})();
