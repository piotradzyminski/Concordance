(function initCyberwareStore() {
  window.WS_APP = window.WS_APP || {};
  const runtime = window.WS_APP.cyberwareRuntime = window.WS_APP.cyberwareRuntime || {};
  const normalizedCyberwareEntries = new WeakSet();
  const normalizedCyberwareLists = new WeakSet();

  const HAND_FINGERS = ["Thumb", "IndexFinger", "MiddleFinger", "RingFinger", "LittleFinger"];
  const CYBERWARE_SLOT_LEVELS = ["SET", "BIG", "MEDIUM", "SMALL"];
  const CYBERWARE_DESCENDANT_POLICIES = ["LOCK_ALL", "LOCK_BY_DEFAULT", "PARTIAL_EDIT", "PASS_THROUGH"];
  const BODY_CYBERWARE_CATALOG_DOMAINS = new Set(["OCULAR", "AUDIO", "DERMAL", "RESPIRATORY", "CARDIAC", "ORGAN", "LIVER", "KIDNEY", "SPINE", "ARM", "FOREARM", "HAND", "PALM", "FINGER", "LEG", "FOOT", "FULL_SET", "MODULE", "BODY_IMPLANT", "IMPLANT", "BIOWARE"]);
  const CYBERWARE_PROTOCOL_TOKENS = new Set([
    "CIVIC", "UTILITY", "INDUSTRIAL", "MEDICAL", "TRAUMA", "BIOMETRIC", "BIOMONITORING",
    "SENSORY", "PRECISION", "PREMIUM", "SECURE", "NETRUNNER", "TACTICAL", "FULLSET",
    "EXPERIMENTAL", "GRIDLINK", "MULTIBUS", "EQUIPMENT_LAYOUT", "SERVICE", "SYSTEM", "COMPLIANCE"
  ]);
  const CYBERWARE_SLOT_DEFINITIONS = [
    { key: "neuralCoreSet", label: "CORE STACK", group: "CORE STACK", slotLevel: "SET", children: ["neural", "interface", "neckService"], accepts: ["NEURAL CORE", "CORE STACK", "CORE SET", "NEUROCORE", "SERVICE STACK"] },
    { key: "neural", label: "NEUROCHIP", group: "CORE STACK", slotLevel: "SMALL", parent: "neuralCoreSet", accepts: ["NEURAL", "NEUROCHIP", "COGNITIVE", "BRAIN"] },
    { key: "interface", label: "INTERFACE SOCKET", group: "CORE STACK", slotLevel: "SMALL", parent: "neuralCoreSet", accepts: ["INTERFACE", "OCCIPITAL", "OCCIPITAL SPINAL", "REAR HEAD", "BODY BUS", "MOTHERBOARD", "SENSOR"] },
    { key: "neckService", label: "SERVICE PORT", group: "CORE STACK", slotLevel: "SMALL", parent: "neuralCoreSet", accepts: ["SERVICE PORT", "SERVICE JACK", "DATA PORT", "DIAGNOSTIC PORT", "MAINTENANCE PORT", "NECK SERVICE", "NECK_HEAD", "NECK HEAD", "JACK", "CONNECTOR", "PORT SERWISOWY", "PORT RDZENIOWY"] },

    { key: "ocularSet", label: "OCULAR SET", group: "OCULAR", slotLevel: "SET", children: ["leftEye", "rightEye"], accepts: ["OCULAR SET", "EYES", "BOTH EYES", "EYE PAIR", "OPTIC SUITE", "OCULAR SUITE", "KOMPLET OCZU", "PARA OCZU", "OBIE OCZY"] },
    { key: "leftEye", label: "LEFT EYE", group: "OCULAR", slotLevel: "SMALL", parent: "ocularSet", side: "LEFT", accepts: ["LEFT EYE", "LEWE OKO", "LEFT OCULAR", "LEFT OPTIC", "OCULAR LEFT", "EYE LEFT"] },
    { key: "rightEye", label: "RIGHT EYE", group: "OCULAR", slotLevel: "SMALL", parent: "ocularSet", side: "RIGHT", accepts: ["RIGHT EYE", "PRAWE OKO", "RIGHT OCULAR", "RIGHT OPTIC", "OCULAR RIGHT", "EYE RIGHT"] },

    { key: "audioSet", label: "AUDIO SET", group: "AUDIO", slotLevel: "SET", children: ["leftEar", "rightEar"], accepts: ["AUDIO SET", "EARS", "BOTH EARS", "HEARING SUITE", "AUDIO SUITE", "KOMPLET USZU", "PARA USZU", "OBIE USZY"] },
    { key: "leftEar", label: "LEFT EAR", group: "AUDIO", slotLevel: "SMALL", parent: "audioSet", side: "LEFT", accepts: ["LEFT EAR", "LEWE UCHO", "LEFT AUDIO", "LEFT AUDITORY"] },
    { key: "rightEar", label: "RIGHT EAR", group: "AUDIO", slotLevel: "SMALL", parent: "audioSet", side: "RIGHT", accepts: ["RIGHT EAR", "PRAWE UCHO", "RIGHT AUDIO", "RIGHT AUDITORY"] },

    { key: "torsoSet", label: "TORSO / ORGANS", group: "TORSO", slotLevel: "SET", children: ["respiratory", "cardiac", "liver", "leftKidney", "rightKidney", "internal"], accepts: ["TORSO", "ORGANS", "INTERNAL SET", "ORGAN SET"] },
    { key: "respiratory", label: "RESPIRATORY", group: "TORSO", slotLevel: "MEDIUM", parent: "torsoSet", accepts: ["RESPIRATORY", "LUNG", "LUNGS", "BREATH", "AIR", "PLUCA", "PŁUCA"] },
    { key: "cardiac", label: "CARDIAC", group: "TORSO", slotLevel: "MEDIUM", parent: "torsoSet", accepts: ["CARDIAC", "HEART", "CIRCULATORY", "BLOOD", "SERCE"] },
    { key: "liver", label: "LIVER", group: "TORSO", slotLevel: "MEDIUM", parent: "torsoSet", accepts: ["LIVER", "WATROBA", "WĄTROBA"] },
    { key: "leftKidney", label: "LEFT KIDNEY", group: "TORSO", slotLevel: "MEDIUM", parent: "torsoSet", side: "LEFT", accepts: ["LEFT KIDNEY", "LEWA NERKA"] },
    { key: "rightKidney", label: "RIGHT KIDNEY", group: "TORSO", slotLevel: "MEDIUM", parent: "torsoSet", side: "RIGHT", accepts: ["RIGHT KIDNEY", "PRAWA NERKA"] },
    { key: "internal", label: "INTERNAL AUX", group: "TORSO", slotLevel: "SMALL", parent: "torsoSet", accepts: ["INTERNAL", "BIOMETRIC", "SENSOR", "ORGAN", "BIOCHIP"] },

    { key: "bodyFrameSet", label: "BODY FRAME", group: "BODY", slotLevel: "SET", children: ["dermal", "skeletal", "spineCore"], accepts: ["BODY FRAME", "BODY", "FRAME SET"] },
    { key: "dermal", label: "DERMAL LAYER", group: "BODY", slotLevel: "MEDIUM", parent: "bodyFrameSet", accepts: ["DERMAL", "SKIN", "SUBDERMAL", "ARMOR", "PANCERZ"] },
    { key: "skeletal", label: "SKELETAL FRAME", group: "BODY", slotLevel: "BIG", parent: "bodyFrameSet", accepts: ["SKELETAL", "BONE", "FRAME", "STRUCTURE"] },
    { key: "spineCore", label: "SPINE CORE", group: "SPINE", slotLevel: "BIG", parent: "bodyFrameSet", accepts: ["SPINE", "SPINAL", "BACKBONE", "RDZENIOWY", "KREG", "KRĘG"] },

    { key: "armsSet", label: "ARMS", group: "ARMS", slotLevel: "SET", children: ["leftArmCore", "rightArmCore"], accepts: ["ARMS", "BOTH ARMS", "TWO ARMS", "OBA RAMIONA", "DWA RAMIONA", "OBIE RECE", "OBIE RĘCE"] },
    { key: "leftArmCore", label: "LEFT ARM", group: "LEFT ARM", slotLevel: "BIG", parent: "armsSet", side: "LEFT", children: ["leftShoulder", "leftForearm", "leftHandCore"], accepts: ["LEFT ARM", "LEFT ARM CORE", "LEWA REKA", "LEWA RĘKA", "LEWE RAMIE", "LEWE RAMIĘ"] },
    { key: "leftShoulder", label: "LEFT SHOULDER", group: "LEFT ARM", slotLevel: "MEDIUM", parent: "leftArmCore", side: "LEFT", accepts: ["LEFT SHOULDER", "LEWY BARK", "LEWE RAMIE GORNE", "LEWE RAMIĘ GÓRNE"] },
    { key: "leftForearm", label: "LEFT FOREARM", group: "LEFT ARM", slotLevel: "MEDIUM", parent: "leftArmCore", side: "LEFT", accepts: ["LEFT FOREARM", "LEFT WRIST", "LEWE PRZEDRAMIE", "LEWE PRZEDRAMIĘ", "LEWY NADGARSTEK"] },
    { key: "leftHandCore", label: "LEFT HAND", group: "LEFT HAND", slotLevel: "MEDIUM", parent: "leftArmCore", side: "LEFT", children: ["leftPalm", "leftThumb", "leftIndexFinger", "leftMiddleFinger", "leftRingFinger", "leftLittleFinger"], accepts: ["LEFT HAND", "LEFT HAND CORE", "LEWA DLON", "LEWA DŁOŃ"] },
    { key: "leftPalm", label: "LEFT PALM", group: "LEFT HAND", slotLevel: "SMALL", parent: "leftHandCore", side: "LEFT", accepts: ["LEFT PALM", "LEFT METACARPUS", "LEWE SRODRECZE", "LEWE ŚRÓDRĘCZE", "LEWA WEWNETRZNA DLON", "LEWA WEWNĘTRZNA DŁOŃ"] },
    { key: "leftThumb", label: "LEFT THUMB", group: "LEFT HAND", slotLevel: "SMALL", parent: "leftHandCore", side: "LEFT", digit: "THUMB", accepts: ["LEFT THUMB", "LEWY KCIUK"] },
    { key: "leftIndexFinger", label: "LEFT INDEX", group: "LEFT HAND", slotLevel: "SMALL", parent: "leftHandCore", side: "LEFT", digit: "INDEX", accepts: ["LEFT INDEX", "LEFT INDEX FINGER", "LEWY WSKAZUJACY", "LEWY WSKAZUJĄCY"] },
    { key: "leftMiddleFinger", label: "LEFT MIDDLE", group: "LEFT HAND", slotLevel: "SMALL", parent: "leftHandCore", side: "LEFT", digit: "MIDDLE", accepts: ["LEFT MIDDLE", "LEFT MIDDLE FINGER", "LEWY SRODKOWY", "LEWY ŚRODKOWY"] },
    { key: "leftRingFinger", label: "LEFT RING", group: "LEFT HAND", slotLevel: "SMALL", parent: "leftHandCore", side: "LEFT", digit: "RING", accepts: ["LEFT RING", "LEFT RING FINGER", "LEWY SERDECZNY"] },
    { key: "leftLittleFinger", label: "LEFT LITTLE", group: "LEFT HAND", slotLevel: "SMALL", parent: "leftHandCore", side: "LEFT", digit: "LITTLE", accepts: ["LEFT LITTLE", "LEFT LITTLE FINGER", "LEFT PINKY", "LEWY MALY", "LEWY MAŁY"] },

    { key: "rightArmCore", label: "RIGHT ARM", group: "RIGHT ARM", slotLevel: "BIG", parent: "armsSet", side: "RIGHT", children: ["rightShoulder", "rightForearm", "rightHandCore"], accepts: ["RIGHT ARM", "RIGHT ARM CORE", "PRAWA REKA", "PRAWA RĘKA", "PRAWE RAMIE", "PRAWE RAMIĘ"] },
    { key: "rightShoulder", label: "RIGHT SHOULDER", group: "RIGHT ARM", slotLevel: "MEDIUM", parent: "rightArmCore", side: "RIGHT", accepts: ["RIGHT SHOULDER", "PRAWY BARK", "PRAWE RAMIE GORNE", "PRAWE RAMIĘ GÓRNE"] },
    { key: "rightForearm", label: "RIGHT FOREARM", group: "RIGHT ARM", slotLevel: "MEDIUM", parent: "rightArmCore", side: "RIGHT", accepts: ["RIGHT FOREARM", "RIGHT WRIST", "PRAWE PRZEDRAMIE", "PRAWE PRZEDRAMIĘ", "PRAWY NADGARSTEK"] },
    { key: "rightHandCore", label: "RIGHT HAND", group: "RIGHT HAND", slotLevel: "MEDIUM", parent: "rightArmCore", side: "RIGHT", children: ["rightPalm", "rightThumb", "rightIndexFinger", "rightMiddleFinger", "rightRingFinger", "rightLittleFinger"], accepts: ["RIGHT HAND", "RIGHT HAND CORE", "PRAWA DLON", "PRAWA DŁOŃ"] },
    { key: "rightPalm", label: "RIGHT PALM", group: "RIGHT HAND", slotLevel: "SMALL", parent: "rightHandCore", side: "RIGHT", accepts: ["RIGHT PALM", "RIGHT METACARPUS", "PRAWE SRODRECZE", "PRAWE ŚRÓDRĘCZE", "PRAWA WEWNETRZNA DLON", "PRAWA WEWNĘTRZNA DŁOŃ"] },
    { key: "rightThumb", label: "RIGHT THUMB", group: "RIGHT HAND", slotLevel: "SMALL", parent: "rightHandCore", side: "RIGHT", digit: "THUMB", accepts: ["RIGHT THUMB", "PRAWY KCIUK"] },
    { key: "rightIndexFinger", label: "RIGHT INDEX", group: "RIGHT HAND", slotLevel: "SMALL", parent: "rightHandCore", side: "RIGHT", digit: "INDEX", accepts: ["RIGHT INDEX", "RIGHT INDEX FINGER", "PRAWY WSKAZUJACY", "PRAWY WSKAZUJĄCY"] },
    { key: "rightMiddleFinger", label: "RIGHT MIDDLE", group: "RIGHT HAND", slotLevel: "SMALL", parent: "rightHandCore", side: "RIGHT", digit: "MIDDLE", accepts: ["RIGHT MIDDLE", "RIGHT MIDDLE FINGER", "PRAWY SRODKOWY", "PRAWY ŚRODKOWY"] },
    { key: "rightRingFinger", label: "RIGHT RING", group: "RIGHT HAND", slotLevel: "SMALL", parent: "rightHandCore", side: "RIGHT", digit: "RING", accepts: ["RIGHT RING", "RIGHT RING FINGER", "PRAWY SERDECZNY"] },
    { key: "rightLittleFinger", label: "RIGHT LITTLE", group: "RIGHT HAND", slotLevel: "SMALL", parent: "rightHandCore", side: "RIGHT", digit: "LITTLE", accepts: ["RIGHT LITTLE", "RIGHT LITTLE FINGER", "RIGHT PINKY", "PRAWY MALY", "PRAWY MAŁY"] },

    { key: "legsSet", label: "LEGS", group: "LEGS", slotLevel: "SET", children: ["leftLegCore", "rightLegCore"], accepts: ["LEGS", "BOTH LEGS", "TWO LEGS", "OBIE NOGI", "DWIE NOGI"] },
    { key: "leftLegCore", label: "LEFT LEG", group: "LEFT LEG", slotLevel: "BIG", parent: "legsSet", side: "LEFT", children: ["leftThigh", "leftLowerLeg", "leftFootCore"], accepts: ["LEFT LEG", "LEFT LEG CORE", "LEWA NOGA"] },
    { key: "leftThigh", label: "LEFT THIGH", group: "LEFT LEG", slotLevel: "MEDIUM", parent: "leftLegCore", side: "LEFT", accepts: ["LEFT THIGH", "LEWE UDO"] },
    { key: "leftLowerLeg", label: "LEFT LOWER LEG", group: "LEFT LEG", slotLevel: "MEDIUM", parent: "leftLegCore", side: "LEFT", accepts: ["LEFT LOWER LEG", "LEFT SHIN", "LEFT CALF", "LEWA LYDKA", "LEWA ŁYDKA", "LEWA GOLEN"] },
    { key: "leftFootCore", label: "LEFT FOOT", group: "LEFT LEG", slotLevel: "MEDIUM", parent: "leftLegCore", side: "LEFT", accepts: ["LEFT FOOT", "LEWA STOPA"] },
    { key: "rightLegCore", label: "RIGHT LEG", group: "RIGHT LEG", slotLevel: "BIG", parent: "legsSet", side: "RIGHT", children: ["rightThigh", "rightLowerLeg", "rightFootCore"], accepts: ["RIGHT LEG", "RIGHT LEG CORE", "PRAWA NOGA"] },
    { key: "rightThigh", label: "RIGHT THIGH", group: "RIGHT LEG", slotLevel: "MEDIUM", parent: "rightLegCore", side: "RIGHT", accepts: ["RIGHT THIGH", "PRAWE UDO"] },
    { key: "rightLowerLeg", label: "RIGHT LOWER LEG", group: "RIGHT LEG", slotLevel: "MEDIUM", parent: "rightLegCore", side: "RIGHT", accepts: ["RIGHT LOWER LEG", "RIGHT SHIN", "RIGHT CALF", "PRAWA LYDKA", "PRAWA ŁYDKA", "PRAWA GOLEN"] },
    { key: "rightFootCore", label: "RIGHT FOOT", group: "RIGHT LEG", slotLevel: "MEDIUM", parent: "rightLegCore", side: "RIGHT", accepts: ["RIGHT FOOT", "PRAWA STOPA"] }
  ];

  const CYBERWARE_SLOT_GROUP_DEFINITIONS = [
    { key: "NEURAL_CORE", label: "Core Stack", description: "neurochip, interface socket and external service port", rootSlotKeys: ["neuralCoreSet"], slotKeys: ["neuralCoreSet", "neural", "interface", "neckService"] },
    { key: "SENSORY", label: "Sensory", description: "vision and audio receivers", rootSlotKeys: ["ocularSet", "audioSet"], slotKeys: ["ocularSet", "leftEye", "rightEye", "audioSet", "leftEar", "rightEar"] },
    { key: "TORSO_ORGANS", label: "Torso / Organs", description: "respiration, heart, liver, kidneys and internal auxiliaries", rootSlotKeys: ["torsoSet"], slotKeys: ["torsoSet", "respiratory", "cardiac", "liver", "leftKidney", "rightKidney", "internal"] },
    { key: "BODY_FRAME", label: "Body Frame", description: "skin, skeleton and spine frame", rootSlotKeys: ["bodyFrameSet"], slotKeys: ["bodyFrameSet", "dermal", "skeletal", "spineCore"] },
    { key: "UPPER_LIMBS", label: "Arms", description: "both arms, hands, palms and fingers", rootSlotKeys: ["armsSet"], slotKeys: ["armsSet", "leftArmCore", "leftShoulder", "leftForearm", "leftHandCore", "leftPalm", "leftThumb", "leftIndexFinger", "leftMiddleFinger", "leftRingFinger", "leftLittleFinger", "rightArmCore", "rightShoulder", "rightForearm", "rightHandCore", "rightPalm", "rightThumb", "rightIndexFinger", "rightMiddleFinger", "rightRingFinger", "rightLittleFinger"] },
    { key: "LOWER_LIMBS", label: "Legs", description: "both legs and feet", rootSlotKeys: ["legsSet"], slotKeys: ["legsSet", "leftLegCore", "leftThigh", "leftLowerLeg", "leftFootCore", "rightLegCore", "rightThigh", "rightLowerLeg", "rightFootCore"] }
  ];

  const CYBERWARE_SLOT_PURPOSE_DEFINITIONS = [
    { key: "CORE_PROCESSING", label: "Processing", slotKeys: ["neural"] },
    { key: "BODY_BUS", label: "Body Bus", slotKeys: ["interface"] },
    { key: "SERVICE_ACCESS", label: "Service Access", slotKeys: ["neckService"] },
    { key: "VISION", label: "Vision", slotKeys: ["ocularSet", "leftEye", "rightEye"] },
    { key: "HEARING", label: "Hearing", slotKeys: ["audioSet", "leftEar", "rightEar"] },
    { key: "RESPIRATION", label: "Respiration", slotKeys: ["respiratory"] },
    { key: "CIRCULATION", label: "Circulation", slotKeys: ["cardiac"] },
    { key: "METABOLIC", label: "Metabolic", slotKeys: ["liver", "leftKidney", "rightKidney", "internal"] },
    { key: "PROTECTION", label: "Protection", slotKeys: ["dermal", "skeletal"] },
    { key: "SPINAL_CONTROL", label: "Spinal Control", slotKeys: ["spineCore"] },
    { key: "ARM_SET", label: "Arm Set", slotKeys: ["armsSet"] },
    { key: "ARM_CONTROL", label: "Arm Control", slotKeys: ["leftArmCore", "rightArmCore"] },
    { key: "SHOULDER_CONTROL", label: "Shoulder", slotKeys: ["leftShoulder", "rightShoulder"] },
    { key: "FOREARM_CONTROL", label: "Forearm", slotKeys: ["leftForearm", "rightForearm"] },
    { key: "HAND_CONTROL", label: "Hand Control", slotKeys: ["leftHandCore", "rightHandCore"] },
    { key: "PALM_CONTROL", label: "Palm", slotKeys: ["leftPalm", "rightPalm"] },
    { key: "FINE_MANIPULATION", label: "Fine Manipulation", slotKeys: ["leftThumb", "leftIndexFinger", "leftMiddleFinger", "leftRingFinger", "leftLittleFinger", "rightThumb", "rightIndexFinger", "rightMiddleFinger", "rightRingFinger", "rightLittleFinger"] },
    { key: "LOCOMOTION", label: "Locomotion", slotKeys: ["legsSet", "leftLegCore", "leftThigh", "leftLowerLeg", "leftFootCore", "rightLegCore", "rightThigh", "rightLowerLeg", "rightFootCore"] }
  ];

  const CYBERWARE_SLOT_BY_KEY = new Map(CYBERWARE_SLOT_DEFINITIONS.map((slot) => [slot.key, slot]));
  const CYBERWARE_SLOT_CHILDREN_BY_KEY = new Map(CYBERWARE_SLOT_DEFINITIONS.map((slot) => [slot.key, Array.isArray(slot.children) ? [...slot.children] : []]));
  const CYBERWARE_SLOT_PARENT_BY_KEY = new Map();
  CYBERWARE_SLOT_DEFINITIONS.forEach((slot) => {
    if (slot.parent) CYBERWARE_SLOT_PARENT_BY_KEY.set(slot.key, slot.parent);
    (slot.children || []).forEach((childKey) => CYBERWARE_SLOT_PARENT_BY_KEY.set(childKey, slot.key));
  });
  const SLOT_DISPLAY_GROUP_BY_KEY = new Map();
  const SLOT_PURPOSE_BY_KEY = new Map();
  CYBERWARE_SLOT_GROUP_DEFINITIONS.forEach((group) => {
    group.slotKeys.forEach((slotKey) => SLOT_DISPLAY_GROUP_BY_KEY.set(slotKey, group.key));
  });
  CYBERWARE_SLOT_PURPOSE_DEFINITIONS.forEach((purpose) => {
    purpose.slotKeys.forEach((slotKey) => SLOT_PURPOSE_BY_KEY.set(slotKey, purpose.key));
  });

  const CYBERWARE_SCALE_DEFINITIONS = [
    { key: "SMALL", label: "Small Implant", minSlotCost: 1, maxSlotCost: 1, defaultSlotCost: 1, defaultCustomizationSlots: 0 },
    { key: "MEDIUM", label: "Medium Implant", minSlotCost: 2, maxSlotCost: 3, defaultSlotCost: 2, defaultCustomizationSlots: 1 },
    { key: "LARGE", label: "Large Implant", minSlotCost: 3, maxSlotCost: 4, defaultSlotCost: 3, defaultCustomizationSlots: 2 },
    { key: "FULL_SET", label: "Integrated Set", minSlotCost: 4, maxSlotCost: 16, defaultSlotCost: 6, defaultCustomizationSlots: 3 }
  ];

  const CYBERWARE_GRADE_DEFINITIONS = [
    { key: "SCRAP", label: "Scrap", rank: 0, acceptanceFactor: 0.40 },
    { key: "CIVILIAN", label: "Civilian", rank: 1, acceptanceFactor: 0.70 },
    { key: "LICENSED", label: "Licensed", rank: 2, acceptanceFactor: 1.00 },
    { key: "CORPORATE", label: "Corporate", rank: 3, acceptanceFactor: 1.08 },
    { key: "MILITARY", label: "Military", rank: 4, acceptanceFactor: 1.12 },
    { key: "BLACK", label: "Black", rank: 5, acceptanceFactor: 0.85 },
    { key: "UNIQUE", label: "Unique", rank: 6, acceptanceFactor: 1.00 }
  ];
  const CYBERWARE_GRADE_RANK = CYBERWARE_GRADE_DEFINITIONS.reduce((next, grade) => ({ ...next, [grade.key]: grade.rank }), {});
  const CYBERWARE_SCALE_RANK = { SMALL: 1, MEDIUM: 2, LARGE: 3, FULL_SET: 4 };
  const CYBERWARE_SCALE_ACCEPTANCE_FACTOR = { SMALL: 1.00, MEDIUM: 0.85, LARGE: 0.65, FULL_SET: 0.45 };
  const CYBERWARE_PROFILE_ACCEPTANCE_BASE = { ALFA: 0.90, ALPHA: 0.90, BETA: 0.75, GAMMA: 0.50 };
  const CYBERWARE_NEUROCHIP_TIER_DEFINITIONS = [
    { tier: 0, label: "T0 / None", neuroCapacity: 0, maxCyberwareGrade: "CIVILIAN", maxScale: "SMALL", controlChannels: 0, firmwareSlots: 0, latencyClass: "NONE", acceptanceFactor: 0.60 },
    { tier: 1, label: "T1 / Basic", neuroCapacity: 6, maxCyberwareGrade: "CIVILIAN", maxScale: "SMALL", controlChannels: 4, firmwareSlots: 1, latencyClass: "BASIC", acceptanceFactor: 0.80 },
    { tier: 2, label: "T2 / Standard", neuroCapacity: 10, maxCyberwareGrade: "LICENSED", maxScale: "MEDIUM", controlChannels: 6, firmwareSlots: 2, latencyClass: "STANDARD", acceptanceFactor: 1.00 },
    { tier: 3, label: "T3 / Advanced", neuroCapacity: 14, maxCyberwareGrade: "CORPORATE", maxScale: "LARGE", controlChannels: 8, firmwareSlots: 3, latencyClass: "LOW_LATENCY", acceptanceFactor: 1.10 },
    { tier: 4, label: "T4 / Tactical", neuroCapacity: 18, maxCyberwareGrade: "MILITARY", maxScale: "FULL_SET", controlChannels: 10, firmwareSlots: 4, latencyClass: "TACTICAL", acceptanceFactor: 1.18 },
    { tier: 5, label: "T5 / Black", neuroCapacity: 24, maxCyberwareGrade: "BLACK", maxScale: "FULL_SET", controlChannels: 14, firmwareSlots: 5, latencyClass: "BLACK", acceptanceFactor: 1.25 },
    { tier: 6, label: "T6 / Unique", neuroCapacity: 32, maxCyberwareGrade: "UNIQUE", maxScale: "FULL_SET", controlChannels: 18, firmwareSlots: 7, latencyClass: "UNIQUE", acceptanceFactor: 1.32 }
  ];
  const CYBERWARE_INTERFACE_TIER_DEFINITIONS = [
    { tier: 0, label: "T0 / None", interfaceCapacity: 0, supportedBuses: [] },
    { tier: 1, label: "T1 / Civic", interfaceCapacity: 6, supportedBuses: ["STANDARD_BODY_BUS"] },
    { tier: 2, label: "T2 / Licensed", interfaceCapacity: 10, supportedBuses: ["STANDARD_BODY_BUS", "MEDICAL_BODY_BUS"] },
    { tier: 3, label: "T3 / Corporate", interfaceCapacity: 14, supportedBuses: ["STANDARD_BODY_BUS", "MEDICAL_BODY_BUS", "CORPORATE_BODY_BUS"] },
    { tier: 4, label: "T4 / Tactical", interfaceCapacity: 18, supportedBuses: ["STANDARD_BODY_BUS", "MEDICAL_BODY_BUS", "CORPORATE_BODY_BUS", "MILITARY_BODY_BUS"] },
    { tier: 5, label: "T5 / Black", interfaceCapacity: 24, supportedBuses: ["STANDARD_BODY_BUS", "MEDICAL_BODY_BUS", "CORPORATE_BODY_BUS", "MILITARY_BODY_BUS", "BLACK_BODY_BUS"] },
    { tier: 6, label: "T6 / Unique", interfaceCapacity: 32, supportedBuses: ["STANDARD_BODY_BUS", "MEDICAL_BODY_BUS", "CORPORATE_BODY_BUS", "MILITARY_BODY_BUS", "BLACK_BODY_BUS", "UNIQUE_BODY_BUS"] }
  ];
  const CYBERWARE_COMPATIBILITY_FACTOR = { MATCHED: 1.00, PARTIAL: 0.75, ADAPTED: 0.60, INCOMPATIBLE: 0.25, UNKNOWN: 0.50 };
  const CYBERWARE_MEDICAL_CARE_FACTOR = { STREET: 0.60, FIELD: 0.75, CLINIC: 1.00, CORPORATE_CLINIC: 1.10, TRAUMA: 1.20 };
  const CYBERWARE_SURGERY_PRESETS = [
    { key: "STREET_DOC", label: "Street Doc", provider: "STREET_DOC", procedureMode: "OFF_RECORD", surgeonSkill: 4, medicalCare: "STREET", compatibility: "UNKNOWN", costFactor: 0.45 },
    { key: "FIELD_CLINIC", label: "Field Clinic", provider: "FIELD_CLINIC", procedureMode: "EMERGENCY", surgeonSkill: 5, medicalCare: "FIELD", compatibility: "ADAPTED", costFactor: 0.65 },
    { key: "LOCAL_CLINIC", label: "Local Clinic", provider: "LOCAL_CLINIC", procedureMode: "STANDARD", surgeonSkill: 6, medicalCare: "CLINIC", compatibility: "PARTIAL", costFactor: 1.00 },
    { key: "LICENSED_CLINIC", label: "Licensed Clinic", provider: "LICENSED_CLINIC", procedureMode: "STANDARD", surgeonSkill: 7, medicalCare: "CLINIC", compatibility: "MATCHED", costFactor: 1.18 },
    { key: "CORPORATE_CLINIC", label: "Corporate Clinic", provider: "CORPORATE_CLINIC", procedureMode: "CONTROLLED", surgeonSkill: 8, medicalCare: "CORPORATE_CLINIC", compatibility: "MATCHED", costFactor: 1.65 },
    { key: "TRAUMA", label: "TRAUMA", provider: "TRAUMA", procedureMode: "HIGH_SECURITY", surgeonSkill: 9, medicalCare: "TRAUMA", compatibility: "MATCHED", costFactor: 2.15 }
  ];
  const CYBERWARE_SURGERY_PRESET_BY_KEY = new Map(CYBERWARE_SURGERY_PRESETS.map((preset) => [preset.key, preset]));
  const CYBERWARE_PROCEDURE_BASE_COST = { SMALL: 750, MEDIUM: 2600, LARGE: 7200, FULL_SET: 18000 };
  const CYBERWARE_PROCEDURE_GRADE_FACTOR = { SCRAP: 0.45, CIVILIAN: 0.75, LICENSED: 1.00, CORPORATE: 1.35, MILITARY: 1.75, BLACK: 2.30, UNIQUE: 3.00 };
  const CYBERWARE_ACCEPTANCE_MIN = 0.01;
  const CYBERWARE_ACCEPTANCE_MAX = 0.97;
  const CYBERWARE_CORE_PROCESSOR_ROLES = new Set(["NEUROCHIP", "CORE_PROCESSOR", "NEURAL_CORE"]);
  const CYBERWARE_CORE_INTERFACE_ROLES = new Set(["INTERFACE_BACKPLANE", "CORE_INTERFACE", "BODY_BUS", "MOTHERBOARD"]);
  const CYBERWARE_SERVICE_PORT_ROLES = new Set(["SERVICE_PORT", "SERVICE_ACCESS", "DIAGNOSTIC_PORT", "MAINTENANCE_PORT"]);
  const CYBERWARE_LICENSE_STATUSES = new Set(["NOT_REQUIRED", "CATALOG", "UNACTIVATED", "PENDING", "ACTIVE", "VALID", "SYNCED", "LICENSED", "SUSPENDED", "REVOKED", "EXPIRED", "INVALID", "MISSING"]);
  const CYBERWARE_ACTIVE_LICENSE_STATUSES = new Set(["ACTIVE", "VALID", "SYNCED", "LICENSED"]);
  const CYBERWARE_BLOCKING_LICENSE_STATUSES = new Set(["UNACTIVATED", "PENDING", "SUSPENDED", "REVOKED", "EXPIRED", "INVALID", "MISSING"]);
  const CYBERWARE_FIRMWARE_STATUSES = new Set(["NOT_REQUIRED", "CURRENT", "UPDATE_AVAILABLE", "OUTDATED", "MISSING", "BLOCKED", "CORRUPTED", "UNKNOWN"]);
  const CYBERWARE_BLOCKING_FIRMWARE_STATUSES = new Set(["OUTDATED", "MISSING", "BLOCKED", "CORRUPTED"]);
  const CYBERWARE_ACTIVE_SUBSCRIPTION_STATUSES = new Set(["PAID", "OVERDUE"]);
  const CYBERWARE_COMPLIANCE_ACTION_SOURCE = "CYBERWARE_LICENSE_FIRMWARE_ACTIONS_1.1x";

  const CYBERWARE_BAD_STATUSES = new Set(["BROKEN", "DAMAGED", "OFFLINE", "DISCONNECTED", "SUSPENDED"]);
  const CYBERWARE_REMOVED_STATUSES = new Set(["REMOVED", "REJECTED", "CONFISCATED", "LOST", "DESTROYED", "DEINSTALLED"]);
  const CYBERWARE_INVENTORY_STATUSES = new Set(["PACKAGED", "OWNED", "CATALOG", "PENDING_INSTALL", "PLANNED_INSTALL", "INSTALL_READY", "LICENSE_PENDING", "FIRMWARE_OUTDATED", "STORED", "DELIVERED"]);
  const CYBERWARE_INSTALLED_STATUSES = new Set(["INSTALLED", "ACTIVE", "REGISTERED", "SYNCED", "LICENSED"]);
  const CYBERWARE_ACTIVE_STATUSES = new Set(["INSTALLED", "ACTIVE", "REGISTERED", "SYNCED", "LICENSED"]);
  const CYBERWARE_DEINSTALLABLE_STATUSES = new Set(["INSTALLED", "ACTIVE", "REGISTERED", "SYNCED", "LICENSED", "OFFLINE", "DAMAGED", "BROKEN", "SUSPENDED", "DISCONNECTED"]);
  const SLOT_ALIASES = new Map();
  const SCALE_ALIASES = new Map([
    ["minor", "SMALL"],
    ["small", "SMALL"],
    ["micro", "SMALL"],
    ["single", "SMALL"],
    ["modular", "MEDIUM"],
    ["medium", "MEDIUM"],
    ["standard", "MEDIUM"],
    ["major", "LARGE"],
    ["large", "LARGE"],
    ["heavy", "LARGE"],
    ["full", "FULL_SET"],
    ["fullset", "FULL_SET"],
    ["set", "FULL_SET"],
    ["integrated", "FULL_SET"],
    ["integratedset", "FULL_SET"]
  ]);
  const GRADE_ALIASES = new Map([
    ["junk", "SCRAP"],
    ["scrap", "SCRAP"],
    ["civil", "CIVILIAN"],
    ["civilian", "CIVILIAN"],
    ["basic", "CIVILIAN"],
    ["licensed", "LICENSED"],
    ["license", "LICENSED"],
    ["standard", "LICENSED"],
    ["corp", "CORPORATE"],
    ["corporate", "CORPORATE"],
    ["mil", "MILITARY"],
    ["military", "MILITARY"],
    ["black", "BLACK"],
    ["experimental", "BLACK"],
    ["unique", "UNIQUE"],
    ["prototype", "UNIQUE"],
    ["sovereign", "UNIQUE"]
  ]);

  CYBERWARE_SLOT_DEFINITIONS.forEach((slot) => {
    [slot.key, slot.label, ...slot.accepts].forEach((value) => {
      const key = normalizeToken(value);
      if (key) SLOT_ALIASES.set(key, slot.key);
    });
  });

  Object.entries({
    ocular: "leftEye",
    optic: "leftEye",
    optics: "leftEye",
    eye: "leftEye",
    eyes: "ocularSet",
    sight: "leftEye",
    vision: "leftEye",
    wzrok: "leftEye",
    oko: "leftEye",
    oczy: "leftEye",
    audio: "leftEar",
    auditory: "leftEar",
    ear: "leftEar",
    ears: "audioSet",
    hearing: "leftEar",
    ucho: "leftEar",
    uszy: "leftEar",
    leftarm: "leftArmCore",
    rightarm: "rightArmCore",
    arm: "leftArmCore",
    arms: "armsSet",
    limb: "leftArmCore",
    prosthetic: "leftArmCore",
    leftapplegacy: "leftArmCore",
    rightapplegacy: "rightArmCore",
    lefthand: "leftHandCore",
    righthand: "rightHandCore",
    hand: "leftHandCore",
    hands: "leftHandCore",
    palm: "leftPalm",
    finger: "leftIndexFinger",
    fingers: "leftIndexFinger",
    dlon: "leftHandCore",
    dloni: "leftHandCore",
    palec: "leftIndexFinger",
    palce: "leftIndexFinger",
    leftleg: "leftLegCore",
    rightleg: "rightLegCore",
    leg: "leftLegCore",
    legs: "legsSet",
    knee: "leftLowerLeg",
    foot: "leftFootCore",
    feet: "leftFootCore",
    stopa: "leftFootCore",
    noga: "leftLegCore",
    spine: "spineCore",
    spinal: "spineCore",
    backbone: "spineCore",
    shoulder: "leftShoulder",
    bark: "leftShoulder",
    forearm: "leftForearm",
    wrist: "leftForearm",
    przedramie: "leftForearm",
    przedramię: "leftForearm",
    nadgarstek: "leftForearm",
    srodrecze: "leftPalm",
    śródręcze: "leftPalm",
    metacarpus: "leftPalm",
    thigh: "leftThigh",
    udo: "leftThigh",
    lowerleg: "leftLowerLeg",
    calf: "leftLowerLeg",
    shin: "leftLowerLeg",
    lydka: "leftLowerLeg",
    łydka: "leftLowerLeg"
  }).forEach(([alias, canonical]) => {
    const key = normalizeToken(alias);
    if (key && canonical) SLOT_ALIASES.set(key, canonical);
  });

  const compressCyberwareSlotFootprint = (...args) => runtime.compressCyberwareSlotFootprint(...args);
  const expandCyberwareAnatomicalFootprint = (...args) => runtime.expandCyberwareAnatomicalFootprint(...args);
  const expandCyberwareSlotFootprint = (...args) => runtime.expandCyberwareSlotFootprint(...args);
  const getCyberwareSlotDisplayGroupKey = (...args) => runtime.getCyberwareSlotDisplayGroupKey(...args);
  const getCyberwareSlotDisplayGroupLabel = (...args) => runtime.getCyberwareSlotDisplayGroupLabel(...args);
  const getCyberwareSlotDisplayLabel = (...args) => runtime.getCyberwareSlotDisplayLabel(...args);
  const getCyberwareSlotLabel = (...args) => runtime.getCyberwareSlotLabel(...args);
  const getCyberwareSlotLevel = (...args) => runtime.getCyberwareSlotLevel(...args);
  const getCyberwareSlotPurposeKey = (...args) => runtime.getCyberwareSlotPurposeKey(...args);
  const getCyberwareSlotPurposeLabel = (...args) => runtime.getCyberwareSlotPurposeLabel(...args);
  const getCyberwareSlotsLabel = (...args) => runtime.getCyberwareSlotsLabel(...args);
  const inferCyberwareSlots = (...args) => runtime.inferCyberwareSlots(...args);
  const normalizeCyberwareCompatibilityList = (...args) => runtime.normalizeCyberwareCompatibilityList(...args);
  const normalizeCyberwareDescendantPolicy = (...args) => runtime.normalizeCyberwareDescendantPolicy(...args);
  const normalizeCyberwareFirmwareStatus = (...args) => runtime.normalizeCyberwareFirmwareStatus(...args);
  const normalizeCyberwareInstallStatus = (...args) => runtime.normalizeCyberwareInstallStatus(...args);
  const normalizeCyberwareLicenseStatus = (...args) => runtime.normalizeCyberwareLicenseStatus(...args);
  const normalizeCyberwareSlotKey = (...args) => runtime.normalizeCyberwareSlotKey(...args);
  const normalizeCyberwareSlotLevel = (...args) => runtime.normalizeCyberwareSlotLevel(...args);
  const normalizeCyberwareSlotList = (...args) => runtime.normalizeCyberwareSlotList(...args);
  const normalizeCyberwareSubscriptionCategory = (...args) => runtime.normalizeCyberwareSubscriptionCategory(...args);
  const normalizeCyberwareSubscriptionTier = (...args) => runtime.normalizeCyberwareSubscriptionTier(...args);
  const normalizeCyberwareVersion = (...args) => runtime.normalizeCyberwareVersion(...args);
  const summarizeCyberwareSlotLabels = (...args) => runtime.summarizeCyberwareSlotLabels(...args);

  function normalizeToken(value = "") {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "")
      .toLowerCase();
  }

  function uniqueValues(values = []) {
    const seen = new Set();
    return values.filter((value) => {
      const key = String(value || "").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function clampNumber(value, min, max, fallback = min) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, Math.round(numeric)));
  }

  function normalizeCyberwareScaleKey(value = "") {
    const token = normalizeToken(value);
    if (!token) return "";
    return SCALE_ALIASES.get(token) || (CYBERWARE_SCALE_DEFINITIONS.some((scale) => scale.key === String(value).trim().toUpperCase()) ? String(value).trim().toUpperCase() : "");
  }

  function getCyberwareScaleDefinition(scaleKey = "") {
    const normalized = normalizeCyberwareScaleKey(scaleKey) || "SMALL";
    return CYBERWARE_SCALE_DEFINITIONS.find((scale) => scale.key === normalized) || CYBERWARE_SCALE_DEFINITIONS[0];
  }

  function getCyberwareScaleLabel(scaleKey = "") {
    return getCyberwareScaleDefinition(scaleKey).label;
  }

  function normalizeCyberwareGradeKey(value = "") {
    const token = normalizeToken(value);
    if (!token) return "LICENSED";
    const direct = String(value || "").trim().toUpperCase();
    return GRADE_ALIASES.get(token) || (CYBERWARE_GRADE_RANK[direct] !== undefined ? direct : "LICENSED");
  }

  function getCyberwareGradeDefinition(gradeKey = "") {
    const normalized = normalizeCyberwareGradeKey(gradeKey);
    return CYBERWARE_GRADE_DEFINITIONS.find((grade) => grade.key === normalized) || CYBERWARE_GRADE_DEFINITIONS[2];
  }

  function getCyberwareGradeLabel(gradeKey = "") {
    return getCyberwareGradeDefinition(gradeKey).label;
  }

  function getCyberwareGradeRank(gradeKey = "") {
    return getCyberwareGradeDefinition(gradeKey).rank;
  }

  function normalizeCyberwareTier(value = 0) {
    const match = String(value ?? "").match(/\d+/);
    return clampNumber(match ? match[0] : value, 0, 6, 0);
  }

  function getNeurochipTierDefinition(tier = 0) {
    const normalized = normalizeCyberwareTier(tier);
    return CYBERWARE_NEUROCHIP_TIER_DEFINITIONS.find((entry) => entry.tier === normalized) || CYBERWARE_NEUROCHIP_TIER_DEFINITIONS[0];
  }

  function getInterfaceTierDefinition(tier = 0) {
    const normalized = normalizeCyberwareTier(tier);
    return CYBERWARE_INTERFACE_TIER_DEFINITIONS.find((entry) => entry.tier === normalized) || CYBERWARE_INTERFACE_TIER_DEFINITIONS[0];
  }

  function normalizeCyberwareBusToken(value = "") {
    return String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  }

  function normalizeCyberwareBusList(value = []) {
    const source = Array.isArray(value)
      ? value
      : String(value || "").split(/[,+|;\n]+/).map((item) => item.trim()).filter(Boolean);
    return uniqueValues(source.map(normalizeCyberwareBusToken).filter(Boolean));
  }

  function classifyCyberwareRequirementTokens(value = []) {
    const tokens = normalizeCyberwareBusList(value);
    return {
      protocols: tokens.filter((token) => CYBERWARE_PROTOCOL_TOKENS.has(token)),
      buses: tokens.filter((token) => token.endsWith("_BUS")),
      componentStandards: tokens.filter((token) => !CYBERWARE_PROTOCOL_TOKENS.has(token) && !token.endsWith("_BUS"))
    };
  }

  function normalizeCyberwareRequirementDomains(source = {}, options = {}) {
    const legacy = classifyCyberwareRequirementTokens(source.requiredBuses || source.requiredBus || source.bus || source.bodyBus || []);
    const requiredProtocols = uniqueValues([
      ...normalizeCyberwareBusList(source.requiredProtocols || source.protocolRequirements || []),
      ...legacy.protocols
    ]);
    const requiredBuses = uniqueValues([
      ...legacy.buses,
      ...classifyCyberwareRequirementTokens(source.bodyBuses || []).buses
    ]);
    const requiredComponentStandards = uniqueValues([
      ...normalizeCyberwareBusList(source.requiredComponentStandards || source.requiredStandards || source.componentStandards || []),
      ...legacy.componentStandards
    ]);
    if (options.defaultBodyBus === true && !requiredBuses.length) requiredBuses.push("STANDARD_BODY_BUS");
    return { requiredProtocols, requiredBuses, requiredComponentStandards };
  }

  function inferCyberwareProductTier(source = {}, name = "") {
    const candidates = [source.productTier, source.tierLevel, source.hardwareTier, source.modelTier, source.tier];
    for (const candidate of candidates) {
      if (candidate === null || candidate === undefined || candidate === "") continue;
      if (/\d/.test(String(candidate))) return normalizeCyberwareTier(candidate);
    }
    const text = `${name || ""} ${source.model || ""} ${source.sku || ""}`;
    const match = text.match(/(?:^|[^A-Z0-9])(?:TIER[_ -]?|T|L|N|I|SP|F|C|M|V)?([1-6])(?:[^0-9]|$)/i);
    return match ? normalizeCyberwareTier(match[1]) : 0;
  }

  function inferCyberwareProcessorRole(source = {}, slots = []) {
    const explicit = String(source.processorRole || source.role || source.coreRole || "").trim().toUpperCase();
    if (CYBERWARE_CORE_PROCESSOR_ROLES.has(explicit) || CYBERWARE_CORE_INTERFACE_ROLES.has(explicit) || CYBERWARE_SERVICE_PORT_ROLES.has(explicit)) return explicit;
    const text = `${source.name || ""} ${source.title || ""} ${source.tags || ""} ${source.subtype || ""}`.toLowerCase();
    if (/neurochip|neuro chip|neural core|procesor/.test(text)) return "NEUROCHIP";
    if (/service port|service jack|diagnostic port|maintenance port|data port|port serwis|port rdzeni/.test(text)) return "SERVICE_PORT";
    if (/interface|backplane|body bus|motherboard/.test(text)) return "INTERFACE_BACKPLANE";
    if (slots.includes("neckService")) return "SERVICE_PORT";
    if (slots.includes("interface")) return "INTERFACE_BACKPLANE";
    return "";
  }

  function inferCyberwareNeurochipTier(source = {}, grade = "LICENSED") {
    const explicit = source.neurochipTier ?? source.processorTier ?? source.neuroTier;
    if (explicit !== undefined && explicit !== null && explicit !== "") return normalizeCyberwareTier(explicit);
    const rank = getCyberwareGradeRank(grade);
    if (rank >= 6) return 6;
    if (rank >= 5) return 5;
    if (rank >= 4) return 4;
    if (rank >= 3) return 3;
    if (rank >= 2) return 2;
    return 1;
  }

  function inferCyberwareInterfaceTier(source = {}, grade = "LICENSED") {
    const explicit = source.interfaceTier ?? source.backplaneTier ?? source.busTier;
    if (explicit !== undefined && explicit !== null && explicit !== "") return normalizeCyberwareTier(explicit);
    const rank = getCyberwareGradeRank(grade);
    if (rank >= 6) return 6;
    if (rank >= 5) return 5;
    if (rank >= 4) return 4;
    if (rank >= 3) return 3;
    if (rank >= 2) return 2;
    return 1;
  }

  function inferCyberwareRequiredNeurochipTier(source = {}, scale = "SMALL", grade = "LICENSED") {
    const explicit = source.requiresNeurochipTier ?? source.requiredNeurochipTier ?? source.minNeurochipTier;
    if (explicit !== undefined && explicit !== null && explicit !== "") return normalizeCyberwareTier(explicit);
    const scaleRank = CYBERWARE_SCALE_RANK[scale] || 1;
    const gradeRank = getCyberwareGradeRank(grade);
    return Math.max(1, Math.min(6, Math.max(scaleRank - 1, gradeRank - 1)));
  }

  function inferCyberwareRequiredInterfaceTier(source = {}, scale = "SMALL", grade = "LICENSED") {
    const explicit = source.requiresInterfaceTier ?? source.requiredInterfaceTier ?? source.minInterfaceTier;
    if (explicit !== undefined && explicit !== null && explicit !== "") return normalizeCyberwareTier(explicit);
    const scaleRank = CYBERWARE_SCALE_RANK[scale] || 1;
    const gradeRank = getCyberwareGradeRank(grade);
    return Math.max(1, Math.min(6, Math.max(scaleRank - 1, gradeRank - 2)));
  }

  function getProfileAcceptanceBase(citizen = {}, options = {}) {
    const explicit = Number(citizen.bioAcceptance ?? citizen.implantAcceptanceProfile ?? citizen.acceptanceProfile ?? options.profileBase);
    if (Number.isFinite(explicit)) return Math.max(0, Math.min(1, explicit));
    const profile = normalizeToken(citizen.biologicalProfile || citizen.classProfile || citizen.profile || citizen.socialClass || options.profile || "").toUpperCase();
    if (profile.includes("ALFA") || profile.includes("ALPHA")) return CYBERWARE_PROFILE_ACCEPTANCE_BASE.ALFA;
    if (profile.includes("BETA")) return CYBERWARE_PROFILE_ACCEPTANCE_BASE.BETA;
    if (profile.includes("GAMMA")) return CYBERWARE_PROFILE_ACCEPTANCE_BASE.GAMMA;
    const random = Number(options.outsystemRoll ?? citizen.outsystemAcceptanceRoll);
    if (Number.isFinite(random)) return Math.max(0, Math.min(0.8, random));
    return 0.5;
  }

  function normalizeCyberwareFlag(value, fallback = false) {
    if (value === true || value === false) return value;
    if (value === 1 || value === 0) return Boolean(value);
    const token = String(value ?? "").trim().toUpperCase();
    if (!token) return Boolean(fallback);
    if (["TRUE", "YES", "Y", "1", "REQUIRED", "ACTIVE", "ON"].includes(token)) return true;
    if (["FALSE", "NO", "N", "0", "NONE", "NOT_REQUIRED", "OFF"].includes(token)) return false;
    return Boolean(fallback);
  }

  function inferCyberwareScale(source = {}, slots = []) {
    const explicit = normalizeCyberwareScaleKey(source.scale || source.size || source.cyberwareScale || source.implantScale);
    if (explicit) return explicit;
    const slotCost = Number(source.slotCost || source.slotsRequired || source.implantSlots);
    if (Number.isFinite(slotCost)) {
      if (slotCost >= 4) return "FULL_SET";
      if (slotCost >= 3) return "LARGE";
      if (slotCost >= 2) return "MEDIUM";
      return "SMALL";
    }
    const text = `${source.name || ""} ${source.title || ""} ${source.implant || ""}`.toLowerCase();
    if (/full set|integrated set|suite|both arms|both legs|oba ramiona|obie nogi|zestaw/.test(text)) return "FULL_SET";
    if (/arm|ramie|leg|noga|lungs|pluca|spine|blade|ostrze/.test(text)) return "LARGE";
    if (/hand|dłoń|dlon|foot|stopa|heart|serce|liver|watrob|kidney|nerk|eyes|oczy/.test(text)) return "MEDIUM";
    return slots.length > 3 ? "FULL_SET" : slots.length > 2 ? "LARGE" : slots.length > 1 ? "MEDIUM" : "SMALL";
  }

  function normalizeCyberwareEntry(entry = {}, index = 0) {
    if (entry && typeof entry === "object" && !Array.isArray(entry) && normalizedCyberwareEntries.has(entry)) return entry;
    if (typeof entry === "string") {
      const name = entry.trim();
      if (!name || ["N/A", "NONE"].includes(name.toUpperCase())) return null;
      return normalizeCyberwareEntry({ name, slots: inferCyberwareSlots(name), provider: "LOCAL RECORD", status: "INSTALLED" }, index);
    }

    const source = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
    const playerLabel = String(source.playerLabel || "").trim();
    const catalogName = String(source.catalogName || source.name || source.title || source.implant || "Cyberware").trim();
    const name = playerLabel || String(source.displayName || "").trim() || catalogName;
    if (!catalogName || ["N/A", "NONE"].includes(catalogName.toUpperCase())) return null;

    const purposeText = [
      catalogName,
      source.title,
      source.implant,
      source.category,
      source.type,
      source.kind,
      source.purpose,
      source.side,
      source.slotPurpose,
      source.targetPurpose,
      source.targetRegion,
      source.bodyRegion,
      source.anatomicalTarget,
      source.installTarget,
      Array.isArray(source.tags) ? source.tags.join(" ") : source.tags
    ].map((value) => String(value || "")).join(" ");
    const inferredSlots = inferCyberwareSlots(purposeText);
    const primaryCandidate = normalizeCyberwareSlotKey(source.primarySlot || source.targetSlot || source.slotNode || source.slot || source.bodySlot || source.cyberwareSlot || source.location || source.installTarget);
    const declaredSlots = normalizeCyberwareSlotList(source.slots || source.occupiedSlots || source.slotKeys);
    const compatibleSlots = normalizeCyberwareSlotList(source.compatibleSlots || source.allowedSlots || source.installableSlots);
    const explicitSlots = uniqueValues([...declaredSlots, ...[primaryCandidate].filter(Boolean)]);
    const normalizedSlots = explicitSlots.length ? explicitSlots : normalizeCyberwareSlotList(inferredSlots);
    const slots = expandCyberwareAnatomicalFootprint(source, normalizedSlots);
    const primarySlot = primaryCandidate || compressCyberwareSlotFootprint(slots)[0] || slots[0] || "";
    const scale = inferCyberwareScale(source, slots);
    const scaleDefinition = getCyberwareScaleDefinition(scale);
    const explicitSlotCost = source.slotCost ?? source.slotsRequired ?? source.implantSlots;
    const slotCost = explicitSlotCost !== null && explicitSlotCost !== undefined && explicitSlotCost !== ""
      ? clampNumber(explicitSlotCost, 1, 32, Math.max(slots.length, scaleDefinition.defaultSlotCost))
      : Math.max(slots.length, scaleDefinition.defaultSlotCost);
    const explicitCustomizationSlots = source.customizationSlots ?? source.modSlots ?? source.moduleSlots;
    const customizationSlots = explicitCustomizationSlots !== null && explicitCustomizationSlots !== undefined && explicitCustomizationSlots !== ""
      ? clampNumber(explicitCustomizationSlots, 0, 32, scaleDefinition.defaultCustomizationSlots)
      : scaleDefinition.defaultCustomizationSlots;
    const status = normalizeCyberwareInstallStatus(source.status || source.installStatus || "INSTALLED", "INSTALLED");
    const tierToken = source.tier !== null && source.tier !== undefined && source.tier !== "" && !/\d/.test(String(source.tier)) ? source.tier : "";
    const grade = normalizeCyberwareGradeKey(source.grade || source.implantGrade || source.quality || tierToken || "LICENSED");
    const productTier = inferCyberwareProductTier(source, name);
    const processorRole = inferCyberwareProcessorRole(source, slots);
    const isCoreProcessor = source.isCoreProcessor === true || CYBERWARE_CORE_PROCESSOR_ROLES.has(processorRole);
    const isCoreInterface = source.isCoreInterface === true || CYBERWARE_CORE_INTERFACE_ROLES.has(processorRole);
    const isServicePort = source.isServicePort === true || CYBERWARE_SERVICE_PORT_ROLES.has(processorRole);
    const neurochipTier = isCoreProcessor ? inferCyberwareNeurochipTier(source, grade) : normalizeCyberwareTier(source.neurochipTier ?? source.processorTier ?? 0);
    const interfaceTier = isCoreInterface ? inferCyberwareInterfaceTier(source, grade) : normalizeCyberwareTier(source.interfaceTier ?? source.backplaneTier ?? 0);
    const neurochipDefinition = getNeurochipTierDefinition(neurochipTier);
    const interfaceDefinition = getInterfaceTierDefinition(interfaceTier);
    const defaultNeuroLoad = isCoreProcessor || isCoreInterface || isServicePort ? 0 : ({ SMALL: 1, MEDIUM: 2, LARGE: 4, FULL_SET: 8 }[scale] || 1);
    const defaultInterfaceLoad = isCoreProcessor || isCoreInterface || isServicePort ? 0 : ({ SMALL: 1, MEDIUM: 2, LARGE: 3, FULL_SET: 6 }[scale] || 1);
    const defaultNeuroChannels = isCoreProcessor || isCoreInterface || isServicePort ? 0 : 1;
    const neuroLoad = clampNumber(source.neuroLoad ?? source.neuralLoad ?? source.processorLoad, 0, 99, defaultNeuroLoad);
    const interfaceLoad = clampNumber(source.interfaceLoad ?? source.busLoad ?? source.backplaneLoad, 0, 99, defaultInterfaceLoad);
    const neuroChannels = clampNumber(source.neuroChannels ?? source.neuroChannelCost ?? source.controlChannelCost ?? source.channelCost, 0, 16, defaultNeuroChannels);
    const requirementDomains = normalizeCyberwareRequirementDomains(source, { defaultBodyBus: !isCoreProcessor && !isCoreInterface && !isServicePort });
    const requiredProtocols = requirementDomains.requiredProtocols;
    const requiredBuses = requirementDomains.requiredBuses;
    const requiredComponentStandards = requirementDomains.requiredComponentStandards;
    const supportedBuses = normalizeCyberwareBusList(source.supportedBuses || source.buses || (isCoreInterface ? interfaceDefinition.supportedBuses : []));
    const protocolSupport = normalizeCyberwareCompatibilityList(source.protocolSupport || source.supportedProtocols || source.protocols);
    const requiresNeurochipTier = isCoreProcessor || isServicePort ? 0 : inferCyberwareRequiredNeurochipTier(source, scale, grade);
    const requiresInterfaceTier = isCoreInterface || isServicePort ? 0 : inferCyberwareRequiredInterfaceTier(source, scale, grade);
    const compatibilityGroup = String(source.compatibilityGroup || source.compatibility || source.vendorGroup || source.series || "").trim();
    const slotLevel = normalizeCyberwareSlotLevel(source.slotLevel || source.slotSize || source.nodeLevel || getCyberwareSlotLevel(primarySlot)) || getCyberwareSlotLevel(primarySlot);
    const defaultDescendantPolicy = ["SET", "BIG", "MEDIUM"].includes(slotLevel) ? "LOCK_BY_DEFAULT" : "LOCK_ALL";
    const descendantPolicy = normalizeCyberwareDescendantPolicy(source.descendantPolicy || source.childSlotPolicy || source.subslotPolicy || source.childrenPolicy, defaultDescendantPolicy);
    const exposedSlots = expandCyberwareSlotFootprint(normalizeCyberwareSlotList(source.exposedSlots || source.editableSlots || source.moduleSlots || source.openDescendants));
    const lockedDescendants = expandCyberwareSlotFootprint(normalizeCyberwareSlotList(source.lockedDescendants || source.lockedSlots || source.blockedChildSlots));
    const acceptedChildGroups = normalizeCyberwareCompatibilityList(source.acceptedChildGroups || source.compatibleChildModules || source.childCompatibilityGroups || source.allowedChildGroups);
    const acceptedManufacturers = normalizeCyberwareCompatibilityList(source.acceptedManufacturers || source.allowedManufacturers || source.compatibleManufacturers);
    const acceptedStandards = normalizeCyberwareCompatibilityList(source.acceptedStandards || source.allowedStandards || source.compatibleStandards || source.protocolSupport || source.requiredStandards);
    const restrictions = source.restrictions && typeof source.restrictions === "object" && !Array.isArray(source.restrictions) ? source.restrictions : {};
    const licenseCategory = String(source.licenseCategory || source.requiredLicenseCategory || restrictions.licenseCategory || "").trim().toUpperCase();
    const licenseRequired = normalizeCyberwareFlag(source.licenseRequired ?? source.requiresLicense ?? restrictions.requiresLicense ?? source.licenseActivationRequired ?? source.licenseCodeRequired ?? Boolean(licenseCategory), false);
    const licenseActivationRequired = false;
    const licenseCodeRequired = false;
    const licenseStatus = normalizeCyberwareLicenseStatus(source.licenseStatus || source.licenseState || source.activationStatus, licenseRequired);
    const licenseCode = String(source.licenseCode || source.activationCode || source.licenseKey || "").trim();
    const licenseActivatedAt = String(source.licenseActivatedAt || source.activatedAt || "").trim();
    const subscriptionRequired = normalizeCyberwareFlag(source.subscriptionRequired ?? source.requiresSubscription ?? restrictions.requiresSubscription, false);
    const subscriptionCategory = normalizeCyberwareSubscriptionCategory(source.subscriptionCategory || source.requiresSubscriptionCategory || source.subscriptionDependency || restrictions.subscriptionCategory);
    const subscriptionTierRequired = normalizeCyberwareSubscriptionTier(source.subscriptionTierRequired ?? source.requiresSubscriptionTier ?? restrictions.subscriptionTierRequired ?? restrictions.requiresSubscriptionTier ?? 0);
    const subscriptionAvailableAfterPurchase = normalizeCyberwareFlag(source.subscriptionAvailableAfterPurchase ?? source.availableAfterPurchase ?? restrictions.subscriptionAvailableAfterPurchase, false);
    const firmwareRequired = normalizeCyberwareFlag(source.firmwareRequired ?? source.requiresFirmware ?? restrictions.requiresFirmware, false);
    const firmwareChannel = String(source.firmwareChannel || source.firmwareSource || source.updateChannel || "").trim().toUpperCase();
    const firmwareVersion = normalizeCyberwareVersion(source.firmwareVersion || source.currentFirmwareVersion || source.firmwareCurrentVersion);
    const firmwareLatestVersion = normalizeCyberwareVersion(source.firmwareLatestVersion || source.latestFirmwareVersion || firmwareVersion);
    const firmwareStatus = normalizeCyberwareFirmwareStatus(source.firmwareStatus || source.firmwareState || source.updateStatus, firmwareRequired);
    const firmwareUpdateRequired = normalizeCyberwareFlag(source.firmwareUpdateRequired ?? source.requiresFirmwareUpdate ?? restrictions.firmwareUpdateRequired, firmwareRequired && CYBERWARE_BLOCKING_FIRMWARE_STATUSES.has(firmwareStatus));
    const firmwareDownloadUrl = String(source.firmwareDownloadUrl || source.firmwareUrl || source.updateUrl || "").trim();

    const normalized = {
      id: String(source.id || source.implantId || `cyberware-${index + 1}`).trim(),
      implantId: String(source.implantId || source.id || "").trim(),
      playerLabel,
      catalogName,
      displayName: name,
      name,
      scale,
      scaleLabel: getCyberwareScaleLabel(scale),
      primarySlot,
      targetSlot: primarySlot,
      slot: primarySlot,
      slotLevel,
      descendantPolicy,
      exposedSlots,
      lockedDescendants,
      acceptedChildGroups,
      acceptedManufacturers,
      acceptedStandards,
      slots,
      compatibleSlots,
      slotLabel: primarySlot ? getCyberwareSlotLabel(primarySlot) : "UNASSIGNED",
      slotDisplayLabel: primarySlot ? getCyberwareSlotDisplayLabel(primarySlot) : "UNASSIGNED",
      slotPurpose: primarySlot ? getCyberwareSlotPurposeKey(primarySlot) : "GENERAL",
      slotPurposeLabel: primarySlot ? getCyberwareSlotPurposeLabel(primarySlot) : "General",
      slotDisplayGroup: primarySlot ? getCyberwareSlotDisplayGroupKey(primarySlot) : "OTHER",
      slotDisplayGroupLabel: primarySlot ? getCyberwareSlotDisplayGroupLabel(primarySlot) : "Other",
      slotsLabel: getCyberwareSlotsLabel(slots),
      slotsGroupedLabel: summarizeCyberwareSlotLabels(slots),
      instanceId: String(source.instanceId || source.id || source.implantId || `cyberware-${index + 1}`).trim(),
      ownerId: String(source.ownerId || source.characterId || "").trim(),
      lifecycleState: String(source.lifecycleState || (source.locationData?.type === "BODY" ? "INSTALLED" : "")).trim().toUpperCase(),
      locationType: String(source.locationData?.type || source.locationType || source.location || "").trim().toUpperCase(),
      operatingStatus: String(source.operatingStatus || source.operationStatus || source.runtimeMode || "ACTIVE").trim().toUpperCase(),
      operationalPriority: clampNumber(source.operationalPriority ?? source.runtimePriority ?? source.activationPriority, 0, 9999, 100),
      installedAt: String(source.installedAt || source.installDate || "").trim(),
      slotCost,
      customizationSlots,
      neuroLoad,
      interfaceLoad,
      neuroChannels,
      requiresNeurochipTier,
      requiresInterfaceTier,
      requiredProtocols,
      requiredBuses,
      requiredComponentStandards,
      supportedBuses,
      protocolSupport,
      processorRole,
      isCoreProcessor,
      isCoreInterface,
      isServicePort,
      servicePortTier: normalizeCyberwareTier(source.servicePortTier ?? source.portTier ?? 0),
      serviceAccess: clampNumber(source.serviceAccess, 0, 100, 0),
      diagnosticDepth: clampNumber(source.diagnosticDepth, 0, 100, 0),
      firmwareAccess: clampNumber(source.firmwareAccess, 0, 100, 0),
      calibrationQuality: clampNumber(source.calibrationQuality, 0, 100, 0),
      securityLock: clampNumber(source.securityLock, 0, 100, 0),
      emergencyAccess: clampNumber(source.emergencyAccess, 0, 100, 0),
      traceability: clampNumber(source.traceability, 0, 100, 0),
      physicalResilience: clampNumber(source.physicalResilience, 0, 100, 0),
      visualLocation: String(source.visualLocation || "").trim(),
      compatibilityTags: Array.isArray(source.compatibilityTags) ? source.compatibilityTags.map((item) => String(item).trim()).filter(Boolean) : [],
      specialFeatures: Array.isArray(source.specialFeatures) ? source.specialFeatures.map((item) => String(item).trim()).filter(Boolean) : [],
      neurochipTier,
      neuroCapacity: clampNumber(source.neuroCapacity, 0, 120, neurochipDefinition.neuroCapacity),
      maxCyberwareGrade: normalizeCyberwareGradeKey(source.maxCyberwareGrade || neurochipDefinition.maxCyberwareGrade),
      maxScale: normalizeCyberwareScaleKey(source.maxScale || neurochipDefinition.maxScale) || neurochipDefinition.maxScale,
      controlChannels: clampNumber(source.controlChannels, 0, 99, neurochipDefinition.controlChannels),
      firmwareSlots: clampNumber(source.firmwareSlots, 0, 99, neurochipDefinition.firmwareSlots),
      latencyClass: String(source.latencyClass || source.latency || neurochipDefinition.latencyClass || "STANDARD").trim().toUpperCase(),
      security: clampNumber(source.security, 0, 100, 0),
      stability: clampNumber(source.stability, 0, 100, 0),
      interfaceTier,
      interfaceCapacity: clampNumber(source.interfaceCapacity, 0, 120, interfaceDefinition.interfaceCapacity),
      interfaceLanes: clampNumber(source.interfaceLanes ?? source.bodyBusLanes, 0, 99, interfaceDefinition.interfaceLanes || 0),
      neurochipSocketRating: clampNumber(source.neurochipSocketRating ?? source.socketRating, 0, 10, interfaceTier),
      bodyBusRating: clampNumber(source.bodyBusRating, 0, 100, 0),
      signalIntegrity: clampNumber(source.signalIntegrity, 0, 100, 0),
      powerRouting: clampNumber(source.powerRouting, 0, 100, 0),
      thermalRouting: clampNumber(source.thermalRouting, 0, 100, 0),
      securityIsolation: clampNumber(source.securityIsolation, 0, 100, 0),
      redundancy: clampNumber(source.redundancy, 0, 100, 0),
      provider: String(source.provider || source.manufacturer || source.corporation || "LOCAL RECORD").trim(),
      manufacturer: String(source.manufacturer || source.provider || source.corporation || "LOCAL RECORD").trim(),
      compatibilityGroup,
      compatibleWith: normalizeCyberwareCompatibilityList(source.compatibleWith || source.compatibleGroups || source.compatibilityAllowlist),
      vendorLocked: source.vendorLocked === true || scale === "FULL_SET" && source.vendorLocked !== false,
      status,
      tier: productTier,
      productTier,
      grade,
      gradeLabel: getCyberwareGradeLabel(grade),
      licenseRequired,
      licenseCategory: licenseCategory || (licenseRequired ? "CYBERWARE" : ""),
      requiredLicenseCategory: licenseCategory || (licenseRequired ? "CYBERWARE" : ""),
      licenseActivationRequired,
      licenseCodeRequired,
      licenseStatus,
      licenseCode,
      licenseActivatedAt,
      licenseActivationSource: String(source.licenseActivationSource || source.activationSource || "").trim(),
      licenseLog: Array.isArray(source.licenseLog)
        ? source.licenseLog.filter((entry) => entry && typeof entry === "object").slice(-12).map((entry) => ({ ...entry }))
        : [],
      subscriptionRequired,
      subscriptionCategory,
      subscriptionTierRequired,
      subscriptionAvailableAfterPurchase,
      requiresSubscriptionCategory: subscriptionCategory,
      requiresSubscriptionTier: subscriptionTierRequired,
      subscriptionDependency: String(source.subscriptionDependency || source.subscription || source.requiresSubscription || subscriptionCategory || "").trim(),
      firmwareRequired,
      firmwareChannel,
      firmwareVersion,
      firmwareLatestVersion,
      firmwareStatus,
      firmwareUpdateRequired,
      firmwareDownloadUrl,
      firmwareUpdatedAt: String(source.firmwareUpdatedAt || source.updatedAt || "").trim(),
      firmwareLog: Array.isArray(source.firmwareLog)
        ? source.firmwareLog.filter((entry) => entry && typeof entry === "object").slice(-12).map((entry) => ({ ...entry }))
        : [],
      authorizationRefs: source.authorizationRefs && typeof source.authorizationRefs === "object" && !Array.isArray(source.authorizationRefs) ? { ...source.authorizationRefs } : null,
      cyberwareState: source.cyberwareState && typeof source.cyberwareState === "object" && !Array.isArray(source.cyberwareState) ? { ...source.cyberwareState } : null,
      condition: Number.isFinite(Number(source.condition)) ? Math.max(0, Math.min(100, Number(source.condition))) : null,
      legality: String(source.legality || "REGISTERED").trim().toUpperCase(),
      notes: String(source.notes || source.note || "").trim(),
      tags: Array.isArray(source.tags) ? source.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
      sourceType: String(source.sourceType || source.installSourceType || "").trim().toUpperCase(),
      installSourceType: String(source.installSourceType || source.sourceType || "").trim().toUpperCase(),
      sourceCatalogId: String(source.sourceCatalogId || source.catalogId || "").trim(),
      lastImplantCheck: source.lastImplantCheck && typeof source.lastImplantCheck === "object" && !Array.isArray(source.lastImplantCheck)
        ? { ...source.lastImplantCheck }
        : null,
      installLog: Array.isArray(source.installLog)
        ? source.installLog.filter((entry) => entry && typeof entry === "object").slice(-12).map((entry) => ({ ...entry }))
        : [],
      lastDeinstallCheck: source.lastDeinstallCheck && typeof source.lastDeinstallCheck === "object" && !Array.isArray(source.lastDeinstallCheck)
        ? { ...source.lastDeinstallCheck }
        : null,
      deinstallLog: Array.isArray(source.deinstallLog)
        ? source.deinstallLog.filter((entry) => entry && typeof entry === "object").slice(-12).map((entry) => ({ ...entry }))
        : [],
      removedAt: String(source.removedAt || source.deinstalledAt || "").trim(),
      replacedByCyberwareId: String(source.replacedByCyberwareId || source.replacedBy || "").trim(),
      replacedByItemInstanceId: String(source.replacedByItemInstanceId || "").trim(),
      archived: source.archived === true
    };
    normalizedCyberwareEntries.add(normalized);
    return normalized;
  }

  function normalizeCyberwareList(value = []) {
    if (Array.isArray(value) && normalizedCyberwareLists.has(value)) return value;
    const source = Array.isArray(value)
      ? value
      : String(value || "").split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
    const normalized = source
      .map((entry, index) => normalizeCyberwareEntry(entry, index))
      .filter(Boolean);
    normalizedCyberwareLists.add(normalized);
    return normalized;
  }

  function normalizeCyberwareEquipmentStatus(value = "OWNED") {
    const token = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    return token || "OWNED";
  }

  function getRawCitizenEquipmentItems(citizen = {}) {
    return typeof window.WS_APP.getCitizenEquipmentItemInstanceViews === "function"
      ? window.WS_APP.getCitizenEquipmentItemInstanceViews(citizen?.id || "")
      : [];
  }

  function isEquipmentItemCyberwareInstallCandidate(item = {}) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    if (item.archived === true) return false;
    const category = String(item.category || "").trim().toUpperCase();
    const subtype = String(item.subtype || item.itemType || "").trim().toUpperCase();
    if (subtype === "CYBERWARE_MODULE" || String(item.catalogDomain || "").trim().toUpperCase() === "CYBERWARE_MODULE") return false;
    const processorRole = String(item.processorRole || item.role || "").trim().toUpperCase();
    const tags = Array.isArray(item.tags) ? item.tags.map((tag) => String(tag).trim().toUpperCase()) : [];
    if (item.cyberwareCandidate === true || item.isCyberware === true) return true;
    if (category === "CYBERWARE") return true;
    if (["CYBERWARE", "IMPLANT", "NEUROCHIP", "INTERFACE", "BIOWARE"].some((tag) => tags.includes(tag))) return true;
    if (["NEUROCHIP", "CORE_PROCESSOR", "NEURAL_CORE", "INTERFACE_BACKPLANE", "CORE_INTERFACE", "BODY_BUS"].includes(processorRole)) return true;
    if (["NEUROCHIP", "INTERFACE", "IMPLANT", "CYBERWARE"].includes(subtype)) return true;
    if ((Array.isArray(item.slots) && item.slots.length) || item.slot || item.primarySlot) {
      if (item.neuroLoad !== undefined || item.interfaceLoad !== undefined || item.requiredBuses !== undefined || item.scale !== undefined || item.grade !== undefined) return true;
    }
    return false;
  }

  function buildCyberwareInstallCandidateFromEquipmentItem(item = {}, options = {}) {
    if (!isEquipmentItemCyberwareInstallCandidate(item)) return null;
    const rawId = String(item.id || item.itemId || item.catalogId || item.name || "equipment-cyberware").trim();
    const safeId = rawId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "equipment-cyberware";
    const instanceId = String(options.instanceId || options.id || item.instanceId || item.id || rawId || `item-${safeId}`).trim();
    const status = normalizeCyberwareEquipmentStatus(options.status || item.installStatus || item.status || "OWNED");
    const sourceCyberware = item.cyberware && typeof item.cyberware === "object" && !Array.isArray(item.cyberware) ? item.cyberware : {};
    const source = { ...item, ...sourceCyberware };
    const candidate = normalizeCyberwareEntry({
      ...source,
      id: instanceId,
      implantId: source.implantId || source.cyberwareId || source.catalogId || rawId,
      sourceCatalogId: source.sourceCatalogId || source.catalogId || source.itemId || rawId,
      instanceId,
      sourceType: "ITEM_INSTANCE",
      installSourceType: "ITEM_INSTANCE",
      provider: source.provider || source.manufacturer || source.category || "EQUIPMENT REGISTRY",
      status: ["INSTALLED", "REJECTED", "DAMAGED", "REMOVED"].includes(status) ? status : "PLANNED_INSTALL",
      condition: source.condition ?? 100,
      tags: uniqueValues(["CYBERWARE", "OWNED_ITEM", "EQUIPMENT_SOURCE", ...(Array.isArray(source.tags) ? source.tags : [])]),
      lastImplantCheck: source.lastImplantCheck || null,
      installLog: Array.isArray(source.installLog) ? source.installLog : []
    }, options.index || 0);
    if (!candidate) return null;
    return {
      ...candidate,
      sourceType: "ITEM_INSTANCE",
      installSourceType: "ITEM_INSTANCE",
      instanceId,
      sourceEquipmentStatus: status,
      equipmentLocation: String(item.location || "INVENTORY").trim().toUpperCase(),
      equipmentCondition: Number.isFinite(Number(item.condition)) ? Math.max(0, Math.min(100, Math.round(Number(item.condition)))) : 100,
      equipmentValue: Number.isFinite(Number(item.value)) ? Math.max(0, Math.round(Number(item.value))) : 0
    };
  }

  function getOwnedCyberwareEquipmentCandidates(citizen = {}) {
    return getRawCitizenEquipmentItems(citizen)
      .map((item, index) => buildCyberwareInstallCandidateFromEquipmentItem(item, { index }))
      .filter(Boolean)
      .filter((item) => !["INSTALLED", "REMOVED", "ARCHIVED", "CONSUMED"].includes(item.sourceEquipmentStatus));
  }


  Object.assign(runtime, {
    normalizeToken,
    uniqueValues,
    clampNumber,
    normalizeCyberwareScaleKey,
    getCyberwareScaleDefinition,
    getCyberwareScaleLabel,
    normalizeCyberwareGradeKey,
    getCyberwareGradeDefinition,
    getCyberwareGradeLabel,
    getCyberwareGradeRank,
    normalizeCyberwareTier,
    getNeurochipTierDefinition,
    getInterfaceTierDefinition,
    normalizeCyberwareBusToken,
    normalizeCyberwareBusList,
    classifyCyberwareRequirementTokens,
    normalizeCyberwareRequirementDomains,
    inferCyberwareProductTier,
    inferCyberwareProcessorRole,
    inferCyberwareNeurochipTier,
    inferCyberwareInterfaceTier,
    inferCyberwareRequiredNeurochipTier,
    inferCyberwareRequiredInterfaceTier,
    getProfileAcceptanceBase,
    normalizeCyberwareFlag,
    inferCyberwareScale,
    normalizeCyberwareEntry,
    normalizeCyberwareList,
    normalizeCyberwareEquipmentStatus,
    getRawCitizenEquipmentItems,
    isEquipmentItemCyberwareInstallCandidate,
    buildCyberwareInstallCandidateFromEquipmentItem,
    getOwnedCyberwareEquipmentCandidates,
    HAND_FINGERS,
    CYBERWARE_SLOT_LEVELS,
    CYBERWARE_DESCENDANT_POLICIES,
    BODY_CYBERWARE_CATALOG_DOMAINS,
    CYBERWARE_PROTOCOL_TOKENS,
    CYBERWARE_SLOT_DEFINITIONS,
    CYBERWARE_SLOT_GROUP_DEFINITIONS,
    CYBERWARE_SLOT_PURPOSE_DEFINITIONS,
    CYBERWARE_SLOT_BY_KEY,
    CYBERWARE_SLOT_CHILDREN_BY_KEY,
    CYBERWARE_SLOT_PARENT_BY_KEY,
    SLOT_DISPLAY_GROUP_BY_KEY,
    SLOT_PURPOSE_BY_KEY,
    CYBERWARE_SCALE_DEFINITIONS,
    CYBERWARE_GRADE_DEFINITIONS,
    CYBERWARE_GRADE_RANK,
    CYBERWARE_SCALE_RANK,
    CYBERWARE_SCALE_ACCEPTANCE_FACTOR,
    CYBERWARE_PROFILE_ACCEPTANCE_BASE,
    CYBERWARE_NEUROCHIP_TIER_DEFINITIONS,
    CYBERWARE_INTERFACE_TIER_DEFINITIONS,
    CYBERWARE_COMPATIBILITY_FACTOR,
    CYBERWARE_MEDICAL_CARE_FACTOR,
    CYBERWARE_SURGERY_PRESETS,
    CYBERWARE_SURGERY_PRESET_BY_KEY,
    CYBERWARE_PROCEDURE_BASE_COST,
    CYBERWARE_PROCEDURE_GRADE_FACTOR,
    CYBERWARE_ACCEPTANCE_MIN,
    CYBERWARE_ACCEPTANCE_MAX,
    CYBERWARE_CORE_PROCESSOR_ROLES,
    CYBERWARE_CORE_INTERFACE_ROLES,
    CYBERWARE_SERVICE_PORT_ROLES,
    CYBERWARE_LICENSE_STATUSES,
    CYBERWARE_ACTIVE_LICENSE_STATUSES,
    CYBERWARE_BLOCKING_LICENSE_STATUSES,
    CYBERWARE_FIRMWARE_STATUSES,
    CYBERWARE_BLOCKING_FIRMWARE_STATUSES,
    CYBERWARE_ACTIVE_SUBSCRIPTION_STATUSES,
    CYBERWARE_COMPLIANCE_ACTION_SOURCE,
    CYBERWARE_BAD_STATUSES,
    CYBERWARE_REMOVED_STATUSES,
    CYBERWARE_INVENTORY_STATUSES,
    CYBERWARE_INSTALLED_STATUSES,
    CYBERWARE_ACTIVE_STATUSES,
    CYBERWARE_DEINSTALLABLE_STATUSES,
    SLOT_ALIASES,
    SCALE_ALIASES,
    GRADE_ALIASES,
  });
})();
