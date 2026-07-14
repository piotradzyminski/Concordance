window.APP_DATA = window.APP_DATA || {};

(() => {
  const manufacturers = [
  {
    "id": "coremed-interface-systems",
    "name": "CoreMed Interface Systems",
    "market": "PRIVATE",
    "role": "CIVILIAN_SOCKET",
    "specialization": "Low-cost legal sockets, stable service routing and broad civilian compatibility.",
    "mechanicalProfile": "Civilian socket standard for legal neurochip and cyberware integration.",
    "bestFor": [
      "Gamma",
      "civilians",
      "technicians",
      "medics",
      "starter builds"
    ],
    "strengths": [
      "LOW_SERVICE_COST",
      "LOW_OPERATION_RISK",
      "LEGAL_CYBERWARE_COMPATIBILITY",
      "COREMED_NEUROCHIP_STABILITY"
    ],
    "weaknesses": [
      "AVERAGE_BANDWIDTH",
      "AVERAGE_CHANNEL_ISOLATION",
      "NO_ADVANCED_PROTOCOLS"
    ]
  },
  {
    "id": "trauma-biosocket",
    "name": "TRAUMA BioSocket",
    "market": "PRIVATE",
    "role": "MEDICAL_EMERGENCY_SOCKET",
    "specialization": "Emergency cutoff, biomonitoring, neurocrash survival and clinical signal stabilization.",
    "mechanicalProfile": "Medical socket that keeps the neurochip-brain link alive during overload.",
    "bestFor": [
      "TRAUMA patients",
      "medics",
      "medical cyberware users",
      "post-trauma characters"
    ],
    "strengths": [
      "EMERGENCY_CUTOFF",
      "NEUROCRASH_SURVIVAL",
      "BIOMONITORING_SYNC",
      "TRAUMA_SERVICE_COMPATIBILITY"
    ],
    "weaknesses": [
      "EXPENSIVE",
      "TRAUMA_SERVICE_DEPENDENCY",
      "NOT_MAX_LANES"
    ]
  },
  {
    "id": "kagami-kaisha-secure-socket",
    "name": "Kagami Kaisha Secure Socket",
    "market": "PRIVATE",
    "role": "SECURITY_SOCKET",
    "specialization": "Protected interface lanes, anti-hijack isolation and contaminated-signal cutoff.",
    "mechanicalProfile": "Secure socket for bodies that must not be taken over through their cyberware bus.",
    "bestFor": [
      "netrunners",
      "agents",
      "network operators",
      "high-value cyberware users"
    ],
    "strengths": [
      "SECURITY_ISOLATION",
      "PROTECTED_INTERFACE_LANES",
      "IMPLANT_INTRUSION_CUTOFF",
      "KAGAMI_PROTOCOLS"
    ],
    "weaknesses": [
      "VERY_EXPENSIVE",
      "REQUIRES_SECURITY_UPDATES",
      "KAGAMI_INFRASTRUCTURE_DEPENDENCY"
    ]
  },
  {
    "id": "mass-compression-socketbus",
    "name": "Mass Compression SocketBus",
    "market": "PRIVATE",
    "role": "MULTI_DEVICE_SOCKET",
    "specialization": "Interface lanes, dynamic routing, multibus mapping and equipment layout synchronization.",
    "mechanicalProfile": "Routing socket for many simultaneous cyberware links.",
    "bestFor": [
      "modular cyberware builds",
      "many-implant users",
      "equipment layout builds",
      "multi-device operators"
    ],
    "strengths": [
      "INTERFACE_LANES",
      "MULTIBUS_ROUTING",
      "HOT_SWAP_PROTOCOLS",
      "EQUIPMENT_SYNC"
    ],
    "weaknesses": [
      "AVERAGE_SECURITY",
      "CASCADE_FAILURE_RISK",
      "NEEDS_STRONG_NEUROCHIP"
    ]
  },
  {
    "id": "aurum-signal-socket",
    "name": "Aurum Signal Socket",
    "market": "PRIVATE",
    "role": "PREMIUM_SIGNAL_SOCKET",
    "specialization": "Signal purity, precision, low-latency sensory routing and comfort.",
    "mechanicalProfile": "Luxury socket for clean, comfortable and precise cyberware signal flow.",
    "bestFor": [
      "upper classes",
      "surgeons",
      "performers",
      "snipers",
      "precision builds"
    ],
    "strengths": [
      "SIGNAL_INTEGRITY",
      "LOW_LATENCY",
      "PHANTOM_FEEDBACK_REDUCTION",
      "PRECISE_CONTROL"
    ],
    "weaknesses": [
      "VERY_EXPENSIVE",
      "NOT_MAX_LANES",
      "NOT_INDUSTRIAL"
    ]
  },
  {
    "id": "factory-commons-interface-works",
    "name": "Factory Commons Interface Works",
    "market": "PRIVATE",
    "role": "INDUSTRIAL_SOCKET",
    "specialization": "Power routing, physical resilience, heavy utility implants and long work cycles.",
    "mechanicalProfile": "Industrial socket for cheap durable labor cyberware.",
    "bestFor": [
      "workers",
      "mechanics",
      "technicians",
      "Gamma laborers",
      "utility limb users"
    ],
    "strengths": [
      "POWER_ROUTING",
      "PHYSICAL_RESILIENCE",
      "INDUSTRIAL_TOOL_SUPPORT",
      "CHEAP_SERVICE"
    ],
    "weaknesses": [
      "HIGH_LATENCY",
      "POOR_SENSORY_SIGNAL",
      "WEAK_SECURITY",
      "UNCOMFORTABLE_FEEDBACK"
    ]
  },
  {
    "id": "perfectmin-biointerface",
    "name": "PerfectMin BioInterface",
    "market": "SYSTEM",
    "role": "SYSTEM_COMPLIANCE_SOCKET",
    "specialization": "Biological compatibility, spinal-port compliance and low rejection risk for system-standard humans.",
    "mechanicalProfile": "System-standard socket for biologically compliant Alpha/Beta integration.",
    "bestFor": [
      "Alpha",
      "high-compliance Beta",
      "system profiles",
      "PerfectMin laboratories"
    ],
    "strengths": [
      "BIOLOGICAL_COMPATIBILITY",
      "LOW_REJECTION_RISK",
      "SPINAL_PORT_STABILITY",
      "BIOMETRIC_SENSOR_SUPPORT"
    ],
    "weaknesses": [
      "SYSTEM_VISIBILITY",
      "LICENSE_LOCKED",
      "HARD_TO_MODIFY_OUTSIDE_APPROVED_PROTOCOLS"
    ]
  }
];

  const interfaces = [
  {
    "id": "interface-cm-i1-civic-socket",
    "manufacturerId": "coremed-interface-systems",
    "manufacturer": "CoreMed Interface Systems",
    "line": "CoreMed",
    "model": "CM-I1 Civic Socket",
    "name": "CM-I1 Civic Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "CIVILIAN_SOCKET",
    "mainFeature": "Basic neurochip socket.",
    "localFeature": "podstawowe gniazdo neurochipa",
    "tier": 1,
    "interfaceTier": 1,
    "grade": "CIVILIAN",
    "legality": "LEGAL",
    "availability": "COMMON",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 3,
    "interfaceCapacity": 6,
    "neurochipSocketRating": 1,
    "bodyBusRating": 24,
    "signalIntegrity": 54,
    "powerRouting": 47,
    "thermalRouting": 41,
    "securityIsolation": 43,
    "redundancy": 28,
    "latency": "HIGH",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "WORKLINE",
      "SERVICE"
    ],
    "bestPairedWith": [
      "CoreMed NeuroSystems"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "LOW",
    "basePrice": 550,
    "specialFeatures": [
      "LOW_OPERATION_RISK",
      "LEGAL_COMPATIBILITY",
      "COREMED_SOCKET_STABILITY"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "CIVILIAN_SOCKET",
      "CIVILIAN",
      "COMMON"
    ]
  },
  {
    "id": "interface-cm-i2-workline-socket",
    "manufacturerId": "coremed-interface-systems",
    "manufacturer": "CoreMed Interface Systems",
    "line": "CoreMed",
    "model": "CM-I2 Workline Socket",
    "name": "CM-I2 Workline Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "CIVILIAN_SOCKET",
    "mainFeature": "Better routing for simple work implants.",
    "localFeature": "lepsza obsługa prostych wszczepów roboczych",
    "tier": 2,
    "interfaceTier": 2,
    "grade": "CIVILIAN",
    "legality": "LEGAL",
    "availability": "COMMON",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 4,
    "interfaceCapacity": 10,
    "neurochipSocketRating": 2,
    "bodyBusRating": 38,
    "signalIntegrity": 61,
    "powerRouting": 54,
    "thermalRouting": 48,
    "securityIsolation": 50,
    "redundancy": 38,
    "latency": "MEDIUM",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "WORKLINE",
      "SERVICE"
    ],
    "bestPairedWith": [
      "CoreMed NeuroSystems"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "MEDIUM",
    "basePrice": 1200,
    "specialFeatures": [
      "LOW_OPERATION_RISK",
      "LEGAL_COMPATIBILITY",
      "COREMED_SOCKET_STABILITY"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "CIVILIAN_SOCKET",
      "CIVILIAN",
      "COMMON"
    ]
  },
  {
    "id": "interface-cm-i3-service-socket",
    "manufacturerId": "coremed-interface-systems",
    "manufacturer": "CoreMed Interface Systems",
    "line": "CoreMed",
    "model": "CM-I3 Service Socket",
    "name": "CM-I3 Service Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "CIVILIAN_SOCKET",
    "mainFeature": "Stable neurochip-to-cyberware communication.",
    "localFeature": "stabilna komunikacja neurochip ↔ cyberware",
    "tier": 3,
    "interfaceTier": 3,
    "grade": "LICENSED",
    "legality": "LICENSED",
    "availability": "COMMON",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 6,
    "interfaceCapacity": 14,
    "neurochipSocketRating": 3,
    "bodyBusRating": 54,
    "signalIntegrity": 68,
    "powerRouting": 61,
    "thermalRouting": 55,
    "securityIsolation": 57,
    "redundancy": 48,
    "latency": "MEDIUM",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "WORKLINE",
      "SERVICE"
    ],
    "bestPairedWith": [
      "CoreMed NeuroSystems"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "MEDIUM",
    "basePrice": 3200,
    "specialFeatures": [
      "LOW_OPERATION_RISK",
      "LEGAL_COMPATIBILITY",
      "COREMED_SOCKET_STABILITY"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "CIVILIAN_SOCKET",
      "LICENSED",
      "COMMON"
    ]
  },
  {
    "id": "interface-cm-i4-pro-utility-socket",
    "manufacturerId": "coremed-interface-systems",
    "manufacturer": "CoreMed Interface Systems",
    "line": "CoreMed",
    "model": "CM-I4 Pro Utility Socket",
    "name": "CM-I4 Pro Utility Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "CIVILIAN_SOCKET",
    "mainFeature": "Improved bandwidth and civilian compatibility.",
    "localFeature": "lepsza przepustowość i kompatybilność",
    "tier": 4,
    "interfaceTier": 4,
    "grade": "LICENSED",
    "legality": "LICENSED",
    "availability": "CONTROLLED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 8,
    "interfaceCapacity": 18,
    "neurochipSocketRating": 4,
    "bodyBusRating": 72,
    "signalIntegrity": 75,
    "powerRouting": 68,
    "thermalRouting": 62,
    "securityIsolation": 64,
    "redundancy": 58,
    "latency": "LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "WORKLINE",
      "SERVICE"
    ],
    "bestPairedWith": [
      "CoreMed NeuroSystems"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "HIGH",
    "basePrice": 6800,
    "specialFeatures": [
      "LOW_OPERATION_RISK",
      "LEGAL_COMPATIBILITY",
      "COREMED_SOCKET_STABILITY"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "CIVILIAN_SOCKET",
      "LICENSED",
      "CONTROLLED"
    ]
  },
  {
    "id": "interface-cm-i5-civic-prime-socket",
    "manufacturerId": "coremed-interface-systems",
    "manufacturer": "CoreMed Interface Systems",
    "line": "CoreMed",
    "model": "CM-I5 Civic Prime Socket",
    "name": "CM-I5 Civic Prime Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "CIVILIAN_SOCKET",
    "mainFeature": "Highest CoreMed civilian socket standard.",
    "localFeature": "najwyższy cywilny standard CoreMed",
    "tier": 5,
    "interfaceTier": 5,
    "grade": "CORPORATE",
    "legality": "LICENSED",
    "availability": "CONTROLLED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 10,
    "interfaceCapacity": 24,
    "neurochipSocketRating": 5,
    "bodyBusRating": 86,
    "signalIntegrity": 82,
    "powerRouting": 75,
    "thermalRouting": 69,
    "securityIsolation": 71,
    "redundancy": 68,
    "latency": "LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "WORKLINE",
      "SERVICE"
    ],
    "bestPairedWith": [
      "CoreMed NeuroSystems"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "VERY_HIGH",
    "basePrice": 20300,
    "specialFeatures": [
      "LOW_OPERATION_RISK",
      "LEGAL_COMPATIBILITY",
      "COREMED_SOCKET_STABILITY"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "CIVILIAN_SOCKET",
      "CORPORATE",
      "CONTROLLED"
    ]
  },
  {
    "id": "interface-tr-i1-life-socket",
    "manufacturerId": "trauma-biosocket",
    "manufacturer": "TRAUMA BioSocket",
    "line": "TRAUMA BioSocket",
    "model": "TR-I1 Life Socket",
    "name": "TR-I1 Life Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "MEDICAL_EMERGENCY_SOCKET",
    "mainFeature": "Emergency neural-state readout.",
    "localFeature": "awaryjny odczyt stanu neuralnego",
    "tier": 1,
    "interfaceTier": 1,
    "grade": "LICENSED",
    "legality": "LICENSED",
    "availability": "CONTROLLED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 3,
    "interfaceCapacity": 6,
    "neurochipSocketRating": 1,
    "bodyBusRating": 24,
    "signalIntegrity": 58,
    "powerRouting": 45,
    "thermalRouting": 49,
    "securityIsolation": 47,
    "redundancy": 46,
    "latency": "HIGH",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS",
      "TRAUMA_MEDICAL_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "MEDICAL",
      "TRAUMA",
      "BIOMONITORING"
    ],
    "bestPairedWith": [
      "TRAUMA NeuroRecovery"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "LOW",
    "basePrice": 900,
    "specialFeatures": [
      "EMERGENCY_CUTOFF",
      "BIOMONITORING_SYNC",
      "NEUROCRASH_SIGNAL_SURVIVAL"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "MEDICAL_EMERGENCY_SOCKET",
      "LICENSED",
      "CONTROLLED"
    ]
  },
  {
    "id": "interface-tr-i2-clinical-socket",
    "manufacturerId": "trauma-biosocket",
    "manufacturer": "TRAUMA BioSocket",
    "line": "TRAUMA BioSocket",
    "model": "TR-I2 Clinical Socket",
    "name": "TR-I2 Clinical Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "MEDICAL_EMERGENCY_SOCKET",
    "mainFeature": "Stable biochip and biomonitoring communication.",
    "localFeature": "stabilniejsza komunikacja z biochipem i monitoringiem",
    "tier": 2,
    "interfaceTier": 2,
    "grade": "LICENSED",
    "legality": "LICENSED",
    "availability": "CONTROLLED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 4,
    "interfaceCapacity": 10,
    "neurochipSocketRating": 2,
    "bodyBusRating": 38,
    "signalIntegrity": 65,
    "powerRouting": 52,
    "thermalRouting": 56,
    "securityIsolation": 54,
    "redundancy": 56,
    "latency": "MEDIUM",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS",
      "TRAUMA_MEDICAL_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "MEDICAL",
      "TRAUMA",
      "BIOMONITORING"
    ],
    "bestPairedWith": [
      "TRAUMA NeuroRecovery"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "MEDIUM",
    "basePrice": 1900,
    "specialFeatures": [
      "EMERGENCY_CUTOFF",
      "BIOMONITORING_SYNC",
      "NEUROCRASH_SIGNAL_SURVIVAL"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "MEDICAL_EMERGENCY_SOCKET",
      "LICENSED",
      "CONTROLLED"
    ]
  },
  {
    "id": "interface-tr-i3-recovery-socket",
    "manufacturerId": "trauma-biosocket",
    "manufacturer": "TRAUMA BioSocket",
    "line": "TRAUMA BioSocket",
    "model": "TR-I3 Recovery Socket",
    "name": "TR-I3 Recovery Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "MEDICAL_EMERGENCY_SOCKET",
    "mainFeature": "Reduced neuroLoad overload consequences.",
    "localFeature": "mniejsze skutki przeciążenia neuroLoad",
    "tier": 3,
    "interfaceTier": 3,
    "grade": "CORPORATE",
    "legality": "LICENSED",
    "availability": "CONTROLLED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 6,
    "interfaceCapacity": 14,
    "neurochipSocketRating": 3,
    "bodyBusRating": 54,
    "signalIntegrity": 72,
    "powerRouting": 59,
    "thermalRouting": 63,
    "securityIsolation": 61,
    "redundancy": 66,
    "latency": "MEDIUM",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS",
      "TRAUMA_MEDICAL_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "MEDICAL",
      "TRAUMA",
      "BIOMONITORING"
    ],
    "bestPairedWith": [
      "TRAUMA NeuroRecovery"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "MEDIUM",
    "basePrice": 5800,
    "specialFeatures": [
      "EMERGENCY_CUTOFF",
      "BIOMONITORING_SYNC",
      "NEUROCRASH_SIGNAL_SURVIVAL"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "MEDICAL_EMERGENCY_SOCKET",
      "CORPORATE",
      "CONTROLLED"
    ]
  },
  {
    "id": "interface-tr-i4-traumasync-socket",
    "manufacturerId": "trauma-biosocket",
    "manufacturer": "TRAUMA BioSocket",
    "line": "TRAUMA BioSocket",
    "model": "TR-I4 TraumaSync Socket",
    "name": "TR-I4 TraumaSync Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "MEDICAL_EMERGENCY_SOCKET",
    "mainFeature": "Automatic cutoff of faulty cyberware.",
    "localFeature": "automatyczne odcięcie wadliwego cyberware",
    "tier": 4,
    "interfaceTier": 4,
    "grade": "CORPORATE",
    "legality": "LICENSED",
    "availability": "RESTRICTED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 8,
    "interfaceCapacity": 18,
    "neurochipSocketRating": 4,
    "bodyBusRating": 72,
    "signalIntegrity": 79,
    "powerRouting": 66,
    "thermalRouting": 70,
    "securityIsolation": 68,
    "redundancy": 76,
    "latency": "LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS",
      "TRAUMA_MEDICAL_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "MEDICAL",
      "TRAUMA",
      "BIOMONITORING"
    ],
    "bestPairedWith": [
      "TRAUMA NeuroRecovery"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "HIGH",
    "basePrice": 12300,
    "specialFeatures": [
      "EMERGENCY_CUTOFF",
      "BIOMONITORING_SYNC",
      "NEUROCRASH_SIGNAL_SURVIVAL"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "MEDICAL_EMERGENCY_SOCKET",
      "CORPORATE",
      "RESTRICTED"
    ]
  },
  {
    "id": "interface-tr-i5-lazarus-socket",
    "manufacturerId": "trauma-biosocket",
    "manufacturer": "TRAUMA BioSocket",
    "line": "TRAUMA BioSocket",
    "model": "TR-I5 Lazarus Socket",
    "name": "TR-I5 Lazarus Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "MEDICAL_EMERGENCY_SOCKET",
    "mainFeature": "Critical-crash signal survival.",
    "localFeature": "podtrzymanie sygnału przy krytycznym crashu",
    "tier": 5,
    "interfaceTier": 5,
    "grade": "CORPORATE",
    "legality": "RESTRICTED",
    "availability": "RESTRICTED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 10,
    "interfaceCapacity": 24,
    "neurochipSocketRating": 5,
    "bodyBusRating": 86,
    "signalIntegrity": 86,
    "powerRouting": 73,
    "thermalRouting": 77,
    "securityIsolation": 75,
    "redundancy": 86,
    "latency": "LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS",
      "TRAUMA_MEDICAL_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "MEDICAL",
      "TRAUMA",
      "BIOMONITORING"
    ],
    "bestPairedWith": [
      "TRAUMA NeuroRecovery"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "VERY_HIGH",
    "basePrice": 25400,
    "specialFeatures": [
      "EMERGENCY_CUTOFF",
      "BIOMONITORING_SYNC",
      "NEUROCRASH_SIGNAL_SURVIVAL"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "MEDICAL_EMERGENCY_SOCKET",
      "CORPORATE",
      "RESTRICTED"
    ]
  },
  {
    "id": "interface-tr-i6-regenerative-socket",
    "manufacturerId": "trauma-biosocket",
    "manufacturer": "TRAUMA BioSocket",
    "line": "TRAUMA BioSocket",
    "model": "TR-I6 Regenerative Socket",
    "name": "TR-I6 Regenerative Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "MEDICAL_EMERGENCY_SOCKET",
    "mainFeature": "Nanobot repair of interface-path microdamage.",
    "localFeature": "nanobotyczna naprawa mikrouszkodzeń ścieżki interface'u",
    "tier": 6,
    "interfaceTier": 6,
    "grade": "UNIQUE",
    "legality": "RESTRICTED",
    "availability": "RARE",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 13,
    "interfaceCapacity": 32,
    "neurochipSocketRating": 6,
    "bodyBusRating": 98,
    "signalIntegrity": 93,
    "powerRouting": 80,
    "thermalRouting": 84,
    "securityIsolation": 82,
    "redundancy": 96,
    "latency": "VERY_LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS",
      "TRAUMA_MEDICAL_BUS",
      "CORPORATE_BODY_BUS",
      "UNIQUE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "MEDICAL",
      "TRAUMA",
      "BIOMONITORING"
    ],
    "bestPairedWith": [
      "TRAUMA NeuroRecovery"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "EXTREME",
    "basePrice": 128000,
    "specialFeatures": [
      "EMERGENCY_CUTOFF",
      "BIOMONITORING_SYNC",
      "NEUROCRASH_SIGNAL_SURVIVAL",
      "TIER_6_UNIQUE_SOCKET"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "MEDICAL_EMERGENCY_SOCKET",
      "UNIQUE",
      "RARE"
    ]
  },
  {
    "id": "interface-k-i1-guard-socket",
    "manufacturerId": "kagami-kaisha-secure-socket",
    "manufacturer": "Kagami Kaisha Secure Socket",
    "line": "Kagami Kaisha Secure Socket",
    "model": "K-I1 Guard Socket",
    "name": "K-I1 Guard Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "SECURITY_SOCKET",
    "mainFeature": "Basic socket isolation.",
    "localFeature": "podstawowa izolacja gniazda",
    "tier": 1,
    "interfaceTier": 1,
    "grade": "LICENSED",
    "legality": "LICENSED",
    "availability": "CONTROLLED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 3,
    "interfaceCapacity": 6,
    "neurochipSocketRating": 1,
    "bodyBusRating": 24,
    "signalIntegrity": 56,
    "powerRouting": 45,
    "thermalRouting": 41,
    "securityIsolation": 63,
    "redundancy": 36,
    "latency": "HIGH",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "SECURE_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SECURE",
      "NETRUNNER",
      "TORII",
      "SENMON"
    ],
    "bestPairedWith": [
      "Kagami Kaisha Neural Defense"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "LOW",
    "basePrice": 900,
    "specialFeatures": [
      "PROTECTED_INTERFACE_LANES",
      "TORII_CHANNEL_ISOLATION",
      "IMPLANT_INTRUSION_CUTOFF"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "SECURITY_SOCKET",
      "LICENSED",
      "CONTROLLED"
    ]
  },
  {
    "id": "interface-k-i2-torii-socket",
    "manufacturerId": "kagami-kaisha-secure-socket",
    "manufacturer": "Kagami Kaisha Secure Socket",
    "line": "Kagami Kaisha Secure Socket",
    "model": "K-I2 Torii Socket",
    "name": "K-I2 Torii Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "SECURITY_SOCKET",
    "mainFeature": "Segmented signal inputs.",
    "localFeature": "segmentowane wejścia sygnału",
    "tier": 2,
    "interfaceTier": 2,
    "grade": "LICENSED",
    "legality": "LICENSED",
    "availability": "CONTROLLED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 4,
    "interfaceCapacity": 10,
    "neurochipSocketRating": 2,
    "bodyBusRating": 38,
    "signalIntegrity": 63,
    "powerRouting": 52,
    "thermalRouting": 48,
    "securityIsolation": 70,
    "redundancy": 46,
    "latency": "MEDIUM",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "SECURE_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SECURE",
      "NETRUNNER",
      "TORII",
      "SENMON"
    ],
    "bestPairedWith": [
      "Kagami Kaisha Neural Defense"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "MEDIUM",
    "basePrice": 1900,
    "specialFeatures": [
      "PROTECTED_INTERFACE_LANES",
      "TORII_CHANNEL_ISOLATION",
      "IMPLANT_INTRUSION_CUTOFF"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "SECURITY_SOCKET",
      "LICENSED",
      "CONTROLLED"
    ]
  },
  {
    "id": "interface-k-i3-yata-socket",
    "manufacturerId": "kagami-kaisha-secure-socket",
    "manufacturer": "Kagami Kaisha Secure Socket",
    "line": "Kagami Kaisha Secure Socket",
    "model": "K-I3 Yata Socket",
    "name": "K-I3 Yata Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "SECURITY_SOCKET",
    "mainFeature": "Reflective bus intrusion response.",
    "localFeature": "odbicie prób wejścia do magistrali",
    "tier": 3,
    "interfaceTier": 3,
    "grade": "CORPORATE",
    "legality": "LICENSED",
    "availability": "RESTRICTED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 6,
    "interfaceCapacity": 14,
    "neurochipSocketRating": 3,
    "bodyBusRating": 54,
    "signalIntegrity": 70,
    "powerRouting": 59,
    "thermalRouting": 55,
    "securityIsolation": 77,
    "redundancy": 56,
    "latency": "MEDIUM",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "SECURE_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SECURE",
      "NETRUNNER",
      "TORII",
      "SENMON"
    ],
    "bestPairedWith": [
      "Kagami Kaisha Neural Defense"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "MEDIUM",
    "basePrice": 5800,
    "specialFeatures": [
      "PROTECTED_INTERFACE_LANES",
      "TORII_CHANNEL_ISOLATION",
      "IMPLANT_INTRUSION_CUTOFF"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "SECURITY_SOCKET",
      "CORPORATE",
      "RESTRICTED"
    ]
  },
  {
    "id": "interface-k-i4-senmon-socket",
    "manufacturerId": "kagami-kaisha-secure-socket",
    "manufacturer": "Kagami Kaisha Secure Socket",
    "line": "Kagami Kaisha Secure Socket",
    "model": "K-I4 Senmon Socket",
    "name": "K-I4 Senmon Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "SECURITY_SOCKET",
    "mainFeature": "Multilayer channel isolation.",
    "localFeature": "wielowarstwowa izolacja kanałów",
    "tier": 4,
    "interfaceTier": 4,
    "grade": "CORPORATE",
    "legality": "RESTRICTED",
    "availability": "RESTRICTED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 8,
    "interfaceCapacity": 18,
    "neurochipSocketRating": 4,
    "bodyBusRating": 72,
    "signalIntegrity": 77,
    "powerRouting": 66,
    "thermalRouting": 62,
    "securityIsolation": 84,
    "redundancy": 66,
    "latency": "LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "SECURE_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SECURE",
      "NETRUNNER",
      "TORII",
      "SENMON"
    ],
    "bestPairedWith": [
      "Kagami Kaisha Neural Defense"
    ],
    "hotSwapSupport": true,
    "maintenanceCost": "HIGH",
    "basePrice": 12300,
    "specialFeatures": [
      "PROTECTED_INTERFACE_LANES",
      "TORII_CHANNEL_ISOLATION",
      "IMPLANT_INTRUSION_CUTOFF"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "SECURITY_SOCKET",
      "CORPORATE",
      "RESTRICTED"
    ]
  },
  {
    "id": "interface-k-i5-blackwall-socket",
    "manufacturerId": "kagami-kaisha-secure-socket",
    "manufacturer": "Kagami Kaisha Secure Socket",
    "line": "Kagami Kaisha Secure Socket",
    "model": "K-I5 Blackwall Socket",
    "name": "K-I5 Blackwall Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "SECURITY_SOCKET",
    "mainFeature": "Cuts contaminated signal away from neurochip.",
    "localFeature": "odcięcie skażonego sygnału od neurochipa",
    "tier": 5,
    "interfaceTier": 5,
    "grade": "MILITARY",
    "legality": "RESTRICTED",
    "availability": "RARE",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 10,
    "interfaceCapacity": 24,
    "neurochipSocketRating": 5,
    "bodyBusRating": 86,
    "signalIntegrity": 84,
    "powerRouting": 73,
    "thermalRouting": 69,
    "securityIsolation": 91,
    "redundancy": 76,
    "latency": "LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "SECURE_BODY_BUS",
      "CORPORATE_BODY_BUS",
      "MILITARY_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SECURE",
      "NETRUNNER",
      "TORII",
      "SENMON"
    ],
    "bestPairedWith": [
      "Kagami Kaisha Neural Defense"
    ],
    "hotSwapSupport": true,
    "maintenanceCost": "VERY_HIGH",
    "basePrice": 36750,
    "specialFeatures": [
      "PROTECTED_INTERFACE_LANES",
      "TORII_CHANNEL_ISOLATION",
      "IMPLANT_INTRUSION_CUTOFF"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "SECURITY_SOCKET",
      "MILITARY",
      "RARE"
    ]
  },
  {
    "id": "interface-k-i6-thousand-gate-socket",
    "manufacturerId": "kagami-kaisha-secure-socket",
    "manufacturer": "Kagami Kaisha Secure Socket",
    "line": "Kagami Kaisha Secure Socket",
    "model": "K-I6 Thousand Gate Socket",
    "name": "K-I6 Thousand Gate Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "SECURITY_SOCKET",
    "mainFeature": "Micro-Torii gates between neurochip and body.",
    "localFeature": "mikrobramy Torii między neurochipem a ciałem",
    "tier": 6,
    "interfaceTier": 6,
    "grade": "UNIQUE",
    "legality": "RESTRICTED",
    "availability": "RARE",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 13,
    "interfaceCapacity": 32,
    "neurochipSocketRating": 6,
    "bodyBusRating": 98,
    "signalIntegrity": 91,
    "powerRouting": 80,
    "thermalRouting": 76,
    "securityIsolation": 98,
    "redundancy": 86,
    "latency": "VERY_LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "SECURE_BODY_BUS",
      "CORPORATE_BODY_BUS",
      "MILITARY_BODY_BUS",
      "UNIQUE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SECURE",
      "NETRUNNER",
      "TORII",
      "SENMON"
    ],
    "bestPairedWith": [
      "Kagami Kaisha Neural Defense"
    ],
    "hotSwapSupport": true,
    "maintenanceCost": "EXTREME",
    "basePrice": 128000,
    "specialFeatures": [
      "PROTECTED_INTERFACE_LANES",
      "TORII_CHANNEL_ISOLATION",
      "IMPLANT_INTRUSION_CUTOFF",
      "TIER_6_UNIQUE_SOCKET"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "SECURITY_SOCKET",
      "UNIQUE",
      "RARE"
    ]
  },
  {
    "id": "interface-mc-i1-slotline-socket",
    "manufacturerId": "mass-compression-socketbus",
    "manufacturer": "Mass Compression SocketBus",
    "line": "Mass Compression SocketBus",
    "model": "MC-I1 Slotline Socket",
    "name": "MC-I1 Slotline Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "MULTI_DEVICE_SOCKET",
    "mainFeature": "Additional simple lane.",
    "localFeature": "dodatkowy prosty lane",
    "tier": 1,
    "interfaceTier": 1,
    "grade": "CIVILIAN",
    "legality": "LEGAL",
    "availability": "COMMON",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 4,
    "interfaceCapacity": 8,
    "neurochipSocketRating": 1,
    "bodyBusRating": 24,
    "signalIntegrity": 52,
    "powerRouting": 49,
    "thermalRouting": 41,
    "securityIsolation": 37,
    "redundancy": 28,
    "latency": "HIGH",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MASS_COMPRESSION_BUS",
      "EQUIPMENT_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "GRIDLINK",
      "MULTIBUS",
      "EQUIPMENT_LAYOUT"
    ],
    "bestPairedWith": [
      "Mass Compression Neural Logistics"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "LOW",
    "basePrice": 550,
    "specialFeatures": [
      "MULTIBUS_ROUTING",
      "EQUIPMENT_SYNC",
      "DYNAMIC_CHANNEL_MAPPING"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "MULTI_DEVICE_SOCKET",
      "CIVILIAN",
      "COMMON"
    ]
  },
  {
    "id": "interface-mc-i2-slotlink-socket",
    "manufacturerId": "mass-compression-socketbus",
    "manufacturer": "Mass Compression SocketBus",
    "line": "Mass Compression SocketBus",
    "model": "MC-I2 Slotlink Socket",
    "name": "MC-I2 Slotlink Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "MULTI_DEVICE_SOCKET",
    "mainFeature": "Better implant mapping.",
    "localFeature": "lepsze mapowanie podłączonych wszczepów",
    "tier": 2,
    "interfaceTier": 2,
    "grade": "LICENSED",
    "legality": "LICENSED",
    "availability": "COMMON",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 6,
    "interfaceCapacity": 14,
    "neurochipSocketRating": 2,
    "bodyBusRating": 38,
    "signalIntegrity": 59,
    "powerRouting": 56,
    "thermalRouting": 48,
    "securityIsolation": 44,
    "redundancy": 38,
    "latency": "MEDIUM",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MASS_COMPRESSION_BUS",
      "EQUIPMENT_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "GRIDLINK",
      "MULTIBUS",
      "EQUIPMENT_LAYOUT"
    ],
    "bestPairedWith": [
      "Mass Compression Neural Logistics"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "MEDIUM",
    "basePrice": 1500,
    "specialFeatures": [
      "MULTIBUS_ROUTING",
      "EQUIPMENT_SYNC",
      "DYNAMIC_CHANNEL_MAPPING"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "MULTI_DEVICE_SOCKET",
      "LICENSED",
      "COMMON"
    ]
  },
  {
    "id": "interface-mc-i3-multibus-socket",
    "manufacturerId": "mass-compression-socketbus",
    "manufacturer": "Mass Compression SocketBus",
    "line": "Mass Compression SocketBus",
    "model": "MC-I3 Multibus Socket",
    "name": "MC-I3 Multibus Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "MULTI_DEVICE_SOCKET",
    "mainFeature": "More parallel active channels.",
    "localFeature": "więcej aktywnych kanałów równolegle",
    "tier": 3,
    "interfaceTier": 3,
    "grade": "LICENSED",
    "legality": "LICENSED",
    "availability": "CONTROLLED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 9,
    "interfaceCapacity": 20,
    "neurochipSocketRating": 3,
    "bodyBusRating": 54,
    "signalIntegrity": 66,
    "powerRouting": 63,
    "thermalRouting": 55,
    "securityIsolation": 51,
    "redundancy": 48,
    "latency": "MEDIUM",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MASS_COMPRESSION_BUS",
      "EQUIPMENT_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "GRIDLINK",
      "MULTIBUS",
      "EQUIPMENT_LAYOUT"
    ],
    "bestPairedWith": [
      "Mass Compression Neural Logistics"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "MEDIUM",
    "basePrice": 3200,
    "specialFeatures": [
      "MULTIBUS_ROUTING",
      "EQUIPMENT_SYNC",
      "DYNAMIC_CHANNEL_MAPPING"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "MULTI_DEVICE_SOCKET",
      "LICENSED",
      "CONTROLLED"
    ]
  },
  {
    "id": "interface-mc-i4-array-socket",
    "manufacturerId": "mass-compression-socketbus",
    "manufacturer": "Mass Compression SocketBus",
    "line": "Mass Compression SocketBus",
    "model": "MC-I4 Array Socket",
    "name": "MC-I4 Array Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "MULTI_DEVICE_SOCKET",
    "mainFeature": "Command queueing and routing.",
    "localFeature": "kolejkowanie i routing komend",
    "tier": 4,
    "interfaceTier": 4,
    "grade": "CORPORATE",
    "legality": "LICENSED",
    "availability": "CONTROLLED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 12,
    "interfaceCapacity": 26,
    "neurochipSocketRating": 4,
    "bodyBusRating": 72,
    "signalIntegrity": 73,
    "powerRouting": 70,
    "thermalRouting": 62,
    "securityIsolation": 58,
    "redundancy": 58,
    "latency": "LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MASS_COMPRESSION_BUS",
      "EQUIPMENT_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "GRIDLINK",
      "MULTIBUS",
      "EQUIPMENT_LAYOUT"
    ],
    "bestPairedWith": [
      "Mass Compression Neural Logistics"
    ],
    "hotSwapSupport": true,
    "maintenanceCost": "HIGH",
    "basePrice": 9850,
    "specialFeatures": [
      "MULTIBUS_ROUTING",
      "EQUIPMENT_SYNC",
      "DYNAMIC_CHANNEL_MAPPING"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "MULTI_DEVICE_SOCKET",
      "CORPORATE",
      "CONTROLLED"
    ]
  },
  {
    "id": "interface-mc-i5-fullset-socket",
    "manufacturerId": "mass-compression-socketbus",
    "manufacturer": "Mass Compression SocketBus",
    "line": "Mass Compression SocketBus",
    "model": "MC-I5 Fullset Socket",
    "name": "MC-I5 Fullset Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "MULTI_DEVICE_SOCKET",
    "mainFeature": "High-throughput full-set bus support.",
    "localFeature": "obsługa dużych zestawów przez wydajną magistralę",
    "tier": 5,
    "interfaceTier": 5,
    "grade": "CORPORATE",
    "legality": "RESTRICTED",
    "availability": "RESTRICTED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 15,
    "interfaceCapacity": 34,
    "neurochipSocketRating": 5,
    "bodyBusRating": 86,
    "signalIntegrity": 80,
    "powerRouting": 77,
    "thermalRouting": 69,
    "securityIsolation": 65,
    "redundancy": 68,
    "latency": "LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MASS_COMPRESSION_BUS",
      "EQUIPMENT_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "GRIDLINK",
      "MULTIBUS",
      "EQUIPMENT_LAYOUT"
    ],
    "bestPairedWith": [
      "Mass Compression Neural Logistics"
    ],
    "hotSwapSupport": true,
    "maintenanceCost": "VERY_HIGH",
    "basePrice": 20300,
    "specialFeatures": [
      "MULTIBUS_ROUTING",
      "EQUIPMENT_SYNC",
      "DYNAMIC_CHANNEL_MAPPING"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "MULTI_DEVICE_SOCKET",
      "CORPORATE",
      "RESTRICTED"
    ]
  },
  {
    "id": "interface-mc-i6-singularity-socket",
    "manufacturerId": "mass-compression-socketbus",
    "manufacturer": "Mass Compression SocketBus",
    "line": "Mass Compression SocketBus",
    "model": "MC-I6 Singularity Socket",
    "name": "MC-I6 Singularity Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "MULTI_DEVICE_SOCKET",
    "mainFeature": "Dynamic routing for extreme connection counts.",
    "localFeature": "dynamiczne routowanie ekstremalnej liczby połączeń",
    "tier": 6,
    "interfaceTier": 6,
    "grade": "UNIQUE",
    "legality": "RESTRICTED",
    "availability": "RARE",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 19,
    "interfaceCapacity": 44,
    "neurochipSocketRating": 6,
    "bodyBusRating": 98,
    "signalIntegrity": 87,
    "powerRouting": 84,
    "thermalRouting": 76,
    "securityIsolation": 72,
    "redundancy": 78,
    "latency": "VERY_LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MASS_COMPRESSION_BUS",
      "EQUIPMENT_BODY_BUS",
      "CORPORATE_BODY_BUS",
      "UNIQUE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "GRIDLINK",
      "MULTIBUS",
      "EQUIPMENT_LAYOUT"
    ],
    "bestPairedWith": [
      "Mass Compression Neural Logistics"
    ],
    "hotSwapSupport": true,
    "maintenanceCost": "EXTREME",
    "basePrice": 102400,
    "specialFeatures": [
      "MULTIBUS_ROUTING",
      "EQUIPMENT_SYNC",
      "DYNAMIC_CHANNEL_MAPPING",
      "TIER_6_UNIQUE_SOCKET"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "MULTI_DEVICE_SOCKET",
      "UNIQUE",
      "RARE"
    ]
  },
  {
    "id": "interface-aurum-i1-grace-socket",
    "manufacturerId": "aurum-signal-socket",
    "manufacturer": "Aurum Signal Socket",
    "line": "Aurum Signal Socket",
    "model": "Aurum I1 Grace Socket",
    "name": "Aurum I1 Grace Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "PREMIUM_SIGNAL_SOCKET",
    "mainFeature": "Connection comfort.",
    "localFeature": "komfort podłączenia",
    "tier": 1,
    "interfaceTier": 1,
    "grade": "LICENSED",
    "legality": "LEGAL",
    "availability": "CONTROLLED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 3,
    "interfaceCapacity": 6,
    "neurochipSocketRating": 1,
    "bodyBusRating": 24,
    "signalIntegrity": 72,
    "powerRouting": 42,
    "thermalRouting": 41,
    "securityIsolation": 43,
    "redundancy": 28,
    "latency": "MEDIUM",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "SENSORY_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SENSORY",
      "PRECISION",
      "PREMIUM"
    ],
    "bestPairedWith": [
      "Aurum NeuroLuxury"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "LOW",
    "basePrice": 900,
    "specialFeatures": [
      "SIGNAL_PURITY",
      "PHANTOM_FEEDBACK_REDUCTION",
      "PRECISION_CONTROL"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "PREMIUM_SIGNAL_SOCKET",
      "LICENSED",
      "CONTROLLED"
    ]
  },
  {
    "id": "interface-aurum-i2-silk-socket",
    "manufacturerId": "aurum-signal-socket",
    "manufacturer": "Aurum Signal Socket",
    "line": "Aurum Signal Socket",
    "model": "Aurum I2 Silk Socket",
    "name": "Aurum I2 Silk Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "PREMIUM_SIGNAL_SOCKET",
    "mainFeature": "Cleaner sensory signal.",
    "localFeature": "czystszy sygnał sensoryczny",
    "tier": 2,
    "interfaceTier": 2,
    "grade": "LICENSED",
    "legality": "LICENSED",
    "availability": "CONTROLLED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 4,
    "interfaceCapacity": 10,
    "neurochipSocketRating": 2,
    "bodyBusRating": 38,
    "signalIntegrity": 79,
    "powerRouting": 49,
    "thermalRouting": 48,
    "securityIsolation": 50,
    "redundancy": 38,
    "latency": "LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "SENSORY_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SENSORY",
      "PRECISION",
      "PREMIUM"
    ],
    "bestPairedWith": [
      "Aurum NeuroLuxury"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "MEDIUM",
    "basePrice": 1900,
    "specialFeatures": [
      "SIGNAL_PURITY",
      "PHANTOM_FEEDBACK_REDUCTION",
      "PRECISION_CONTROL"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "PREMIUM_SIGNAL_SOCKET",
      "LICENSED",
      "CONTROLLED"
    ]
  },
  {
    "id": "interface-aurum-i3-precision-socket",
    "manufacturerId": "aurum-signal-socket",
    "manufacturer": "Aurum Signal Socket",
    "line": "Aurum Signal Socket",
    "model": "Aurum I3 Precision Socket",
    "name": "Aurum I3 Precision Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "PREMIUM_SIGNAL_SOCKET",
    "mainFeature": "Low-latency fine motor control.",
    "localFeature": "niska latencja drobnej motoryki",
    "tier": 3,
    "interfaceTier": 3,
    "grade": "CORPORATE",
    "legality": "LICENSED",
    "availability": "CONTROLLED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 6,
    "interfaceCapacity": 14,
    "neurochipSocketRating": 3,
    "bodyBusRating": 54,
    "signalIntegrity": 86,
    "powerRouting": 56,
    "thermalRouting": 55,
    "securityIsolation": 57,
    "redundancy": 48,
    "latency": "LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "SENSORY_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SENSORY",
      "PRECISION",
      "PREMIUM"
    ],
    "bestPairedWith": [
      "Aurum NeuroLuxury"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "MEDIUM",
    "basePrice": 5800,
    "specialFeatures": [
      "SIGNAL_PURITY",
      "PHANTOM_FEEDBACK_REDUCTION",
      "PRECISION_CONTROL"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "PREMIUM_SIGNAL_SOCKET",
      "CORPORATE",
      "CONTROLLED"
    ]
  },
  {
    "id": "interface-aurum-i4-executive-socket",
    "manufacturerId": "aurum-signal-socket",
    "manufacturer": "Aurum Signal Socket",
    "line": "Aurum Signal Socket",
    "model": "Aurum I4 Executive Socket",
    "name": "Aurum I4 Executive Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "PREMIUM_SIGNAL_SOCKET",
    "mainFeature": "Premium sensory and precision implants.",
    "localFeature": "premium sensory i precyzyjne implanty",
    "tier": 4,
    "interfaceTier": 4,
    "grade": "CORPORATE",
    "legality": "LICENSED",
    "availability": "RESTRICTED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 8,
    "interfaceCapacity": 18,
    "neurochipSocketRating": 4,
    "bodyBusRating": 72,
    "signalIntegrity": 93,
    "powerRouting": 63,
    "thermalRouting": 62,
    "securityIsolation": 64,
    "redundancy": 58,
    "latency": "VERY_LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "SENSORY_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SENSORY",
      "PRECISION",
      "PREMIUM"
    ],
    "bestPairedWith": [
      "Aurum NeuroLuxury"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "HIGH",
    "basePrice": 12300,
    "specialFeatures": [
      "SIGNAL_PURITY",
      "PHANTOM_FEEDBACK_REDUCTION",
      "PRECISION_CONTROL"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "PREMIUM_SIGNAL_SOCKET",
      "CORPORATE",
      "RESTRICTED"
    ]
  },
  {
    "id": "interface-aurum-i5-goldline-socket",
    "manufacturerId": "aurum-signal-socket",
    "manufacturer": "Aurum Signal Socket",
    "line": "Aurum Signal Socket",
    "model": "Aurum I5 Goldline Socket",
    "name": "Aurum I5 Goldline Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "PREMIUM_SIGNAL_SOCKET",
    "mainFeature": "Extremely smooth control.",
    "localFeature": "ekstremalnie płynna kontrola",
    "tier": 5,
    "interfaceTier": 5,
    "grade": "CORPORATE",
    "legality": "RESTRICTED",
    "availability": "RARE",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 10,
    "interfaceCapacity": 24,
    "neurochipSocketRating": 5,
    "bodyBusRating": 86,
    "signalIntegrity": 100,
    "powerRouting": 70,
    "thermalRouting": 69,
    "securityIsolation": 71,
    "redundancy": 68,
    "latency": "VERY_LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "SENSORY_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SENSORY",
      "PRECISION",
      "PREMIUM"
    ],
    "bestPairedWith": [
      "Aurum NeuroLuxury"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "VERY_HIGH",
    "basePrice": 25400,
    "specialFeatures": [
      "SIGNAL_PURITY",
      "PHANTOM_FEEDBACK_REDUCTION",
      "PRECISION_CONTROL"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "PREMIUM_SIGNAL_SOCKET",
      "CORPORATE",
      "RARE"
    ]
  },
  {
    "id": "interface-aurum-i6-imperial-socket",
    "manufacturerId": "aurum-signal-socket",
    "manufacturer": "Aurum Signal Socket",
    "line": "Aurum Signal Socket",
    "model": "Aurum I6 Imperial Socket",
    "name": "Aurum I6 Imperial Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "PREMIUM_SIGNAL_SOCKET",
    "mainFeature": "Near-organic signal quality.",
    "localFeature": "niemal organiczna jakość sygnału",
    "tier": 6,
    "interfaceTier": 6,
    "grade": "UNIQUE",
    "legality": "RESTRICTED",
    "availability": "RARE",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 13,
    "interfaceCapacity": 32,
    "neurochipSocketRating": 6,
    "bodyBusRating": 98,
    "signalIntegrity": 100,
    "powerRouting": 77,
    "thermalRouting": 76,
    "securityIsolation": 78,
    "redundancy": 78,
    "latency": "VERY_LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "SENSORY_BODY_BUS",
      "CORPORATE_BODY_BUS",
      "UNIQUE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SENSORY",
      "PRECISION",
      "PREMIUM"
    ],
    "bestPairedWith": [
      "Aurum NeuroLuxury"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "EXTREME",
    "basePrice": 128000,
    "specialFeatures": [
      "SIGNAL_PURITY",
      "PHANTOM_FEEDBACK_REDUCTION",
      "PRECISION_CONTROL",
      "TIER_6_UNIQUE_SOCKET"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "PREMIUM_SIGNAL_SOCKET",
      "UNIQUE",
      "RARE"
    ]
  },
  {
    "id": "interface-fc-i1-labor-socket",
    "manufacturerId": "factory-commons-interface-works",
    "manufacturer": "Factory Commons Interface Works",
    "line": "Factory Commons",
    "model": "FC-I1 Labor Socket",
    "name": "FC-I1 Labor Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "INDUSTRIAL_SOCKET",
    "mainFeature": "Cheap labor socket.",
    "localFeature": "tani socket roboczy",
    "tier": 1,
    "interfaceTier": 1,
    "grade": "SCRAP",
    "legality": "LEGAL",
    "availability": "COMMON",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 3,
    "interfaceCapacity": 6,
    "neurochipSocketRating": 1,
    "bodyBusRating": 24,
    "signalIntegrity": 38,
    "powerRouting": 63,
    "thermalRouting": 51,
    "securityIsolation": 27,
    "redundancy": 28,
    "latency": "HIGH",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "INDUSTRIAL_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "INDUSTRIAL",
      "UTILITY",
      "LOADLINE"
    ],
    "bestPairedWith": [
      "CoreMed NeuroSystems",
      "Mass Compression Neural Logistics"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "LOW",
    "basePrice": 300,
    "specialFeatures": [
      "POWER_ROUTING",
      "INDUSTRIAL_RESILIENCE",
      "TOOL_PORT_SUPPORT"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "INDUSTRIAL_SOCKET",
      "SCRAP",
      "COMMON"
    ]
  },
  {
    "id": "interface-fc-i2-loadline-socket",
    "manufacturerId": "factory-commons-interface-works",
    "manufacturer": "Factory Commons Interface Works",
    "line": "Factory Commons",
    "model": "FC-I2 Loadline Socket",
    "name": "FC-I2 Loadline Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "INDUSTRIAL_SOCKET",
    "mainFeature": "Improved power routing.",
    "localFeature": "lepsze power routing",
    "tier": 2,
    "interfaceTier": 2,
    "grade": "CIVILIAN",
    "legality": "LEGAL",
    "availability": "COMMON",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 4,
    "interfaceCapacity": 10,
    "neurochipSocketRating": 2,
    "bodyBusRating": 38,
    "signalIntegrity": 45,
    "powerRouting": 70,
    "thermalRouting": 58,
    "securityIsolation": 34,
    "redundancy": 38,
    "latency": "HIGH",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "INDUSTRIAL_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "INDUSTRIAL",
      "UTILITY",
      "LOADLINE"
    ],
    "bestPairedWith": [
      "CoreMed NeuroSystems",
      "Mass Compression Neural Logistics"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "MEDIUM",
    "basePrice": 900,
    "specialFeatures": [
      "POWER_ROUTING",
      "INDUSTRIAL_RESILIENCE",
      "TOOL_PORT_SUPPORT"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "INDUSTRIAL_SOCKET",
      "CIVILIAN",
      "COMMON"
    ]
  },
  {
    "id": "interface-fc-i3-utility-socket",
    "manufacturerId": "factory-commons-interface-works",
    "manufacturer": "Factory Commons Interface Works",
    "line": "Factory Commons",
    "model": "FC-I3 Utility Socket",
    "name": "FC-I3 Utility Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "INDUSTRIAL_SOCKET",
    "mainFeature": "Utility limb and tool-port support.",
    "localFeature": "obsługa kończyn i portów narzędziowych",
    "tier": 3,
    "interfaceTier": 3,
    "grade": "CIVILIAN",
    "legality": "LICENSED",
    "availability": "COMMON",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 6,
    "interfaceCapacity": 14,
    "neurochipSocketRating": 3,
    "bodyBusRating": 54,
    "signalIntegrity": 52,
    "powerRouting": 77,
    "thermalRouting": 65,
    "securityIsolation": 41,
    "redundancy": 48,
    "latency": "MEDIUM",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "INDUSTRIAL_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "INDUSTRIAL",
      "UTILITY",
      "LOADLINE"
    ],
    "bestPairedWith": [
      "CoreMed NeuroSystems",
      "Mass Compression Neural Logistics"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "MEDIUM",
    "basePrice": 1900,
    "specialFeatures": [
      "POWER_ROUTING",
      "INDUSTRIAL_RESILIENCE",
      "TOOL_PORT_SUPPORT"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "INDUSTRIAL_SOCKET",
      "CIVILIAN",
      "COMMON"
    ]
  },
  {
    "id": "interface-fc-i4-heavy-duty-socket",
    "manufacturerId": "factory-commons-interface-works",
    "manufacturer": "Factory Commons Interface Works",
    "line": "Factory Commons",
    "model": "FC-I4 Heavy Duty Socket",
    "name": "FC-I4 Heavy Duty Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "INDUSTRIAL_SOCKET",
    "mainFeature": "Heavy industrial implant support.",
    "localFeature": "ciężkie implanty przemysłowe",
    "tier": 4,
    "interfaceTier": 4,
    "grade": "LICENSED",
    "legality": "LICENSED",
    "availability": "CONTROLLED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 8,
    "interfaceCapacity": 18,
    "neurochipSocketRating": 4,
    "bodyBusRating": 72,
    "signalIntegrity": 59,
    "powerRouting": 84,
    "thermalRouting": 72,
    "securityIsolation": 48,
    "redundancy": 58,
    "latency": "MEDIUM",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "INDUSTRIAL_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "INDUSTRIAL",
      "UTILITY",
      "LOADLINE"
    ],
    "bestPairedWith": [
      "CoreMed NeuroSystems",
      "Mass Compression Neural Logistics"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "HIGH",
    "basePrice": 5100,
    "specialFeatures": [
      "POWER_ROUTING",
      "INDUSTRIAL_RESILIENCE",
      "TOOL_PORT_SUPPORT"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "INDUSTRIAL_SOCKET",
      "LICENSED",
      "CONTROLLED"
    ]
  },
  {
    "id": "interface-fc-i5-workhorse-socket",
    "manufacturerId": "factory-commons-interface-works",
    "manufacturer": "Factory Commons Interface Works",
    "line": "Factory Commons",
    "model": "FC-I5 Workhorse Socket",
    "name": "FC-I5 Workhorse Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "INDUSTRIAL_SOCKET",
    "mainFeature": "High overload and damage resistance.",
    "localFeature": "wysoka odporność na uszkodzenia i przeciążenia",
    "tier": 5,
    "interfaceTier": 5,
    "grade": "CORPORATE",
    "legality": "RESTRICTED",
    "availability": "RESTRICTED",
    "market": "PRIVATE",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 10,
    "interfaceCapacity": 24,
    "neurochipSocketRating": 5,
    "bodyBusRating": 86,
    "signalIntegrity": 66,
    "powerRouting": 91,
    "thermalRouting": 79,
    "securityIsolation": 55,
    "redundancy": 68,
    "latency": "MEDIUM",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "INDUSTRIAL_BODY_BUS",
      "CORPORATE_BODY_BUS",
      "MILITARY_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "INDUSTRIAL",
      "UTILITY",
      "LOADLINE"
    ],
    "bestPairedWith": [
      "CoreMed NeuroSystems",
      "Mass Compression Neural Logistics"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "VERY_HIGH",
    "basePrice": 15200,
    "specialFeatures": [
      "POWER_ROUTING",
      "INDUSTRIAL_RESILIENCE",
      "TOOL_PORT_SUPPORT"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "INDUSTRIAL_SOCKET",
      "CORPORATE",
      "RESTRICTED"
    ]
  },
  {
    "id": "interface-pm-i1-civic-compliance-socket",
    "manufacturerId": "perfectmin-biointerface",
    "manufacturer": "PerfectMin BioInterface",
    "line": "PerfectMin BioInterface",
    "model": "PM-I1 Civic Compliance Socket",
    "name": "PM-I1 Civic Compliance Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "SYSTEM_COMPLIANCE_SOCKET",
    "mainFeature": "Basic system compliance.",
    "localFeature": "podstawowa zgodność systemowa",
    "tier": 1,
    "interfaceTier": 1,
    "grade": "LICENSED",
    "legality": "LICENSED",
    "availability": "CONTROLLED",
    "market": "SYSTEM",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 3,
    "interfaceCapacity": 6,
    "neurochipSocketRating": 1,
    "bodyBusRating": 24,
    "signalIntegrity": 64,
    "powerRouting": 45,
    "thermalRouting": 47,
    "securityIsolation": 53,
    "redundancy": 36,
    "latency": "HIGH",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS",
      "SYSTEM_BODY_BUS",
      "BIOMETRIC_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SYSTEM",
      "PERFECTMIN",
      "BIOMETRIC",
      "COMPLIANCE"
    ],
    "bestPairedWith": [
      "PerfectMin system neurochip profiles",
      "CoreMed NeuroSystems"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "LOW",
    "basePrice": 900,
    "specialFeatures": [
      "BIOLOGICAL_COMPATIBILITY",
      "SPINAL_PORT_STABILITY",
      "BIOMETRIC_SENSOR_SUPPORT"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "SYSTEM_COMPLIANCE_SOCKET",
      "LICENSED",
      "CONTROLLED"
    ]
  },
  {
    "id": "interface-pm-i2-beta-socket",
    "manufacturerId": "perfectmin-biointerface",
    "manufacturer": "PerfectMin BioInterface",
    "line": "PerfectMin BioInterface",
    "model": "PM-I2 Beta Socket",
    "name": "PM-I2 Beta Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "SYSTEM_COMPLIANCE_SOCKET",
    "mainFeature": "Beta integration-defect correction.",
    "localFeature": "korekta defektów integracji",
    "tier": 2,
    "interfaceTier": 2,
    "grade": "LICENSED",
    "legality": "LICENSED",
    "availability": "CONTROLLED",
    "market": "SYSTEM",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 4,
    "interfaceCapacity": 10,
    "neurochipSocketRating": 2,
    "bodyBusRating": 38,
    "signalIntegrity": 71,
    "powerRouting": 52,
    "thermalRouting": 54,
    "securityIsolation": 60,
    "redundancy": 46,
    "latency": "MEDIUM",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS",
      "SYSTEM_BODY_BUS",
      "BIOMETRIC_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SYSTEM",
      "PERFECTMIN",
      "BIOMETRIC",
      "COMPLIANCE"
    ],
    "bestPairedWith": [
      "PerfectMin system neurochip profiles",
      "CoreMed NeuroSystems"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "MEDIUM",
    "basePrice": 1900,
    "specialFeatures": [
      "BIOLOGICAL_COMPATIBILITY",
      "SPINAL_PORT_STABILITY",
      "BIOMETRIC_SENSOR_SUPPORT"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "SYSTEM_COMPLIANCE_SOCKET",
      "LICENSED",
      "CONTROLLED"
    ]
  },
  {
    "id": "interface-pm-i3-beta-prime-socket",
    "manufacturerId": "perfectmin-biointerface",
    "manufacturer": "PerfectMin BioInterface",
    "line": "PerfectMin BioInterface",
    "model": "PM-I3 Beta Prime Socket",
    "name": "PM-I3 Beta Prime Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "SYSTEM_COMPLIANCE_SOCKET",
    "mainFeature": "Stable spinal-port compliance.",
    "localFeature": "stabilna zgodność z portem rdzeniowym",
    "tier": 3,
    "interfaceTier": 3,
    "grade": "CORPORATE",
    "legality": "LICENSED",
    "availability": "RESTRICTED",
    "market": "SYSTEM",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 6,
    "interfaceCapacity": 14,
    "neurochipSocketRating": 3,
    "bodyBusRating": 54,
    "signalIntegrity": 78,
    "powerRouting": 59,
    "thermalRouting": 61,
    "securityIsolation": 67,
    "redundancy": 56,
    "latency": "MEDIUM",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS",
      "SYSTEM_BODY_BUS",
      "BIOMETRIC_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SYSTEM",
      "PERFECTMIN",
      "BIOMETRIC",
      "COMPLIANCE"
    ],
    "bestPairedWith": [
      "PerfectMin system neurochip profiles",
      "CoreMed NeuroSystems"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "MEDIUM",
    "basePrice": 5800,
    "specialFeatures": [
      "BIOLOGICAL_COMPATIBILITY",
      "SPINAL_PORT_STABILITY",
      "BIOMETRIC_SENSOR_SUPPORT"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "SYSTEM_COMPLIANCE_SOCKET",
      "CORPORATE",
      "RESTRICTED"
    ]
  },
  {
    "id": "interface-pm-i4-alpha-standard-socket",
    "manufacturerId": "perfectmin-biointerface",
    "manufacturer": "PerfectMin BioInterface",
    "line": "PerfectMin BioInterface",
    "model": "PM-I4 Alpha Standard Socket",
    "name": "PM-I4 Alpha Standard Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "SYSTEM_COMPLIANCE_SOCKET",
    "mainFeature": "Full integration with system profile.",
    "localFeature": "pełna integracja z profilem systemowym",
    "tier": 4,
    "interfaceTier": 4,
    "grade": "CORPORATE",
    "legality": "RESTRICTED",
    "availability": "RESTRICTED",
    "market": "SYSTEM",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 8,
    "interfaceCapacity": 18,
    "neurochipSocketRating": 4,
    "bodyBusRating": 72,
    "signalIntegrity": 85,
    "powerRouting": 66,
    "thermalRouting": 68,
    "securityIsolation": 74,
    "redundancy": 66,
    "latency": "LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS",
      "SYSTEM_BODY_BUS",
      "BIOMETRIC_BODY_BUS",
      "CORPORATE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SYSTEM",
      "PERFECTMIN",
      "BIOMETRIC",
      "COMPLIANCE"
    ],
    "bestPairedWith": [
      "PerfectMin system neurochip profiles",
      "CoreMed NeuroSystems"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "HIGH",
    "basePrice": 12300,
    "specialFeatures": [
      "BIOLOGICAL_COMPATIBILITY",
      "SPINAL_PORT_STABILITY",
      "BIOMETRIC_SENSOR_SUPPORT"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "SYSTEM_COMPLIANCE_SOCKET",
      "CORPORATE",
      "RESTRICTED"
    ]
  },
  {
    "id": "interface-pm-i5-alpha-sovereign-socket",
    "manufacturerId": "perfectmin-biointerface",
    "manufacturer": "PerfectMin BioInterface",
    "line": "PerfectMin BioInterface",
    "model": "PM-I5 Alpha Sovereign Socket",
    "name": "PM-I5 Alpha Sovereign Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "SYSTEM_COMPLIANCE_SOCKET",
    "mainFeature": "Very high throughput with low rejection risk.",
    "localFeature": "bardzo wysoka przepustowość przy niskim odrzucie",
    "tier": 5,
    "interfaceTier": 5,
    "grade": "CORPORATE",
    "legality": "RESTRICTED",
    "availability": "RARE",
    "market": "SYSTEM",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 10,
    "interfaceCapacity": 24,
    "neurochipSocketRating": 5,
    "bodyBusRating": 86,
    "signalIntegrity": 92,
    "powerRouting": 73,
    "thermalRouting": 75,
    "securityIsolation": 81,
    "redundancy": 76,
    "latency": "LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS",
      "SYSTEM_BODY_BUS",
      "BIOMETRIC_BODY_BUS",
      "CORPORATE_BODY_BUS",
      "MILITARY_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SYSTEM",
      "PERFECTMIN",
      "BIOMETRIC",
      "COMPLIANCE"
    ],
    "bestPairedWith": [
      "PerfectMin system neurochip profiles",
      "CoreMed NeuroSystems"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "VERY_HIGH",
    "basePrice": 25400,
    "specialFeatures": [
      "BIOLOGICAL_COMPATIBILITY",
      "SPINAL_PORT_STABILITY",
      "BIOMETRIC_SENSOR_SUPPORT"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "SYSTEM_COMPLIANCE_SOCKET",
      "CORPORATE",
      "RARE"
    ]
  },
  {
    "id": "interface-pm-i6-origin-socket",
    "manufacturerId": "perfectmin-biointerface",
    "manufacturer": "PerfectMin BioInterface",
    "line": "PerfectMin BioInterface",
    "model": "PM-I6 Origin Socket",
    "name": "PM-I6 Origin Socket",
    "category": "CYBERWARE",
    "subtype": "INTERFACE",
    "role": "SYSTEM_COMPLIANCE_SOCKET",
    "mainFeature": "Developmental socket for Alpha-standard origin integration.",
    "localFeature": "rozwojowy socket dla wzorcowej integracji Alfa",
    "tier": 6,
    "interfaceTier": 6,
    "grade": "UNIQUE",
    "legality": "RESTRICTED",
    "availability": "RARE",
    "market": "SYSTEM",
    "processorRole": "INTERFACE_BACKPLANE",
    "isCoreInterface": true,
    "size": "SMALL",
    "scale": "SMALL",
    "slot": "interface",
    "slots": [
      "interface"
    ],
    "physicalSlot": "occipital_spinal",
    "slotsUsed": 1,
    "slotCost": 1,
    "location": "rear_head_spine_junction",
    "bodyLocation": "rear_head_spine_junction",
    "interfaceLanes": 13,
    "interfaceCapacity": 32,
    "neurochipSocketRating": 6,
    "bodyBusRating": 98,
    "signalIntegrity": 99,
    "powerRouting": 80,
    "thermalRouting": 82,
    "securityIsolation": 88,
    "redundancy": 86,
    "latency": "VERY_LOW",
    "supportedBuses": [
      "STANDARD_BODY_BUS",
      "MEDICAL_BODY_BUS",
      "SYSTEM_BODY_BUS",
      "BIOMETRIC_BODY_BUS",
      "CORPORATE_BODY_BUS",
      "MILITARY_BODY_BUS",
      "UNIQUE_BODY_BUS"
    ],
    "protocolSupport": [
      "CIVIC",
      "SYSTEM",
      "PERFECTMIN",
      "BIOMETRIC",
      "COMPLIANCE"
    ],
    "bestPairedWith": [
      "PerfectMin system neurochip profiles",
      "CoreMed NeuroSystems"
    ],
    "hotSwapSupport": false,
    "maintenanceCost": "EXTREME",
    "basePrice": 128000,
    "specialFeatures": [
      "BIOLOGICAL_COMPATIBILITY",
      "SPINAL_PORT_STABILITY",
      "BIOMETRIC_SENSOR_SUPPORT",
      "TIER_6_UNIQUE_SOCKET"
    ],
    "tags": [
      "CYBERWARE",
      "INTERFACE",
      "SYSTEM_COMPLIANCE_SOCKET",
      "UNIQUE",
      "RARE"
    ]
  }
];

  window.APP_DATA.interfaceCatalog = { manufacturers, interfaces };
  window.APP_DATA.interfaceManufacturers = manufacturers;
  window.APP_DATA.interfaces = interfaces;
})();
