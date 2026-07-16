(function initCyberwareTaxonomyData() {
  window.WS_APP_DATA = window.WS_APP_DATA || {};

  const SCHEMA_VERSION = 2;

  const BODY_REGIONS = [
    { id: "BODY", label: "Body", parentId: "", kind: "ROOT" },
    { id: "HEAD", label: "Head", parentId: "BODY", kind: "REGION" },
    { id: "NEURAL", label: "Neural", parentId: "HEAD", kind: "DETAIL" },
    { id: "LEFT_EYE", label: "Left Eye", parentId: "HEAD", side: "LEFT", kind: "DETAIL" },
    { id: "RIGHT_EYE", label: "Right Eye", parentId: "HEAD", side: "RIGHT", kind: "DETAIL" },
    { id: "TORSO", label: "Torso", parentId: "BODY", kind: "REGION" },
    { id: "LEFT_ARM", label: "Left Arm", parentId: "BODY", side: "LEFT", kind: "REGION" },
    { id: "LEFT_HAND", label: "Left Hand", parentId: "LEFT_ARM", side: "LEFT", kind: "DETAIL" },
    { id: "RIGHT_ARM", label: "Right Arm", parentId: "BODY", side: "RIGHT", kind: "REGION" },
    { id: "RIGHT_HAND", label: "Right Hand", parentId: "RIGHT_ARM", side: "RIGHT", kind: "DETAIL" },
    { id: "LEFT_LEG", label: "Left Leg", parentId: "BODY", side: "LEFT", kind: "REGION" },
    { id: "RIGHT_LEG", label: "Right Leg", parentId: "BODY", side: "RIGHT", kind: "REGION" },
    { id: "SYSTEMIC_LAYERS", label: "Systemic Layers", parentId: "BODY", kind: "SYSTEMIC" }
  ];

  const BODY_SLOTS = [
    { id: "SKULL", label: "Skull", regionId: "HEAD", level: "MEDIUM" },
    { id: "LEFT_EYE", label: "Left Eye", regionId: "LEFT_EYE", side: "LEFT", level: "SMALL" },
    { id: "RIGHT_EYE", label: "Right Eye", regionId: "RIGHT_EYE", side: "RIGHT", level: "SMALL" },
    { id: "LEFT_EAR", label: "Left Ear", regionId: "HEAD", side: "LEFT", level: "SMALL", groupId: "EARS" },
    { id: "RIGHT_EAR", label: "Right Ear", regionId: "HEAD", side: "RIGHT", level: "SMALL", groupId: "EARS" },
    { id: "NOSE", label: "Nose", regionId: "HEAD", level: "SMALL" },
    { id: "MOUTH", label: "Mouth", regionId: "HEAD", level: "SMALL" },
    { id: "TEETH", label: "Teeth", regionId: "HEAD", level: "SMALL" },
    { id: "JAW", label: "Jaw", regionId: "HEAD", level: "MEDIUM" },
    { id: "LARYNX", label: "Larynx", regionId: "HEAD", level: "SMALL" },
    { id: "NECK", label: "Neck", regionId: "HEAD", level: "MEDIUM" },

    { id: "NEURAL", label: "Neurochip", regionId: "NEURAL", level: "SMALL", cardinality: "0..1", coreStack: true },
    { id: "OCCIPITAL_INTERFACE", label: "Occipital Interface", regionId: "NEURAL", level: "SMALL", cardinality: "0..1", coreStack: true },
    { id: "NECK_SERVICE_PORT", label: "Neck Service Port", regionId: "HEAD", level: "SMALL", cardinality: "0..1", coreStack: true },

    { id: "HEART", label: "Heart", regionId: "TORSO", level: "MEDIUM" },
    { id: "LEFT_LUNG", label: "Left Lung", regionId: "TORSO", side: "LEFT", level: "MEDIUM", groupId: "LUNGS" },
    { id: "RIGHT_LUNG", label: "Right Lung", regionId: "TORSO", side: "RIGHT", level: "MEDIUM", groupId: "LUNGS" },
    { id: "LIVER", label: "Liver", regionId: "TORSO", level: "MEDIUM" },
    { id: "STOMACH", label: "Stomach", regionId: "TORSO", level: "MEDIUM" },
    { id: "LEFT_KIDNEY", label: "Left Kidney", regionId: "TORSO", side: "LEFT", level: "MEDIUM", groupId: "KIDNEYS" },
    { id: "RIGHT_KIDNEY", label: "Right Kidney", regionId: "TORSO", side: "RIGHT", level: "MEDIUM", groupId: "KIDNEYS" },
    { id: "CHEST_INTERNAL", label: "Chest Internal", regionId: "TORSO", level: "SMALL" },
    { id: "ABDOMEN_INTERNAL", label: "Abdomen Internal", regionId: "TORSO", level: "SMALL" },
    { id: "PELVIS", label: "Pelvis", regionId: "TORSO", level: "MEDIUM" },
    { id: "SPINE", label: "Spine", regionId: "TORSO", level: "BIG" },

    ...["LEFT", "RIGHT"].flatMap((side) => {
      const prefix = side + "_";
      const armRegion = side + "_ARM";
      const handRegion = side + "_HAND";
      return [
        { id: prefix + "SHOULDER", label: `${side === "LEFT" ? "Left" : "Right"} Shoulder`, regionId: armRegion, side, level: "MEDIUM" },
        { id: prefix + "UPPER_ARM", label: `${side === "LEFT" ? "Left" : "Right"} Upper Arm`, regionId: armRegion, side, level: "MEDIUM" },
        { id: prefix + "ELBOW", label: `${side === "LEFT" ? "Left" : "Right"} Elbow`, regionId: armRegion, side, level: "SMALL" },
        { id: prefix + "FOREARM", label: `${side === "LEFT" ? "Left" : "Right"} Forearm`, regionId: armRegion, side, level: "MEDIUM" },
        { id: prefix + "WRIST", label: `${side === "LEFT" ? "Left" : "Right"} Wrist`, regionId: handRegion, side, level: "SMALL" },
        { id: prefix + "PALM", label: `${side === "LEFT" ? "Left" : "Right"} Palm`, regionId: handRegion, side, level: "SMALL" },
        { id: prefix + "THUMB", label: `${side === "LEFT" ? "Left" : "Right"} Thumb`, regionId: handRegion, side, level: "SMALL" },
        { id: prefix + "INDEX", label: `${side === "LEFT" ? "Left" : "Right"} Index`, regionId: handRegion, side, level: "SMALL" },
        { id: prefix + "MIDDLE", label: `${side === "LEFT" ? "Left" : "Right"} Middle`, regionId: handRegion, side, level: "SMALL" },
        { id: prefix + "RING", label: `${side === "LEFT" ? "Left" : "Right"} Ring`, regionId: handRegion, side, level: "SMALL" },
        { id: prefix + "LITTLE", label: `${side === "LEFT" ? "Left" : "Right"} Little`, regionId: handRegion, side, level: "SMALL" }
      ];
    }),

    ...["LEFT", "RIGHT"].flatMap((side) => {
      const prefix = side + "_";
      const regionId = side + "_LEG";
      const label = side === "LEFT" ? "Left" : "Right";
      return [
        { id: prefix + "HIP", label: `${label} Hip`, regionId, side, level: "MEDIUM" },
        { id: prefix + "THIGH", label: `${label} Thigh`, regionId, side, level: "MEDIUM" },
        { id: prefix + "KNEE", label: `${label} Knee`, regionId, side, level: "SMALL" },
        { id: prefix + "SHIN", label: `${label} Shin`, regionId, side, level: "MEDIUM" },
        { id: prefix + "CALF", label: `${label} Calf`, regionId, side, level: "MEDIUM" },
        { id: prefix + "ANKLE", label: `${label} Ankle`, regionId, side, level: "SMALL" },
        { id: prefix + "FOOT", label: `${label} Foot`, regionId, side, level: "MEDIUM" }
      ];
    })
  ];

  const SLOT_GROUPS = [
    {
      id: "EARS",
      label: "Ears",
      regionId: "HEAD",
      presentation: "TWO_COLUMN",
      columns: [
        { id: "LEFT", bodySlotId: "LEFT_EAR" },
        { id: "RIGHT", bodySlotId: "RIGHT_EAR" }
      ],
      supportedInstallationModes: ["SINGLE_SIDE", "TWO_INDEPENDENT", "BILATERAL_SINGLE_INSTANCE"]
    },
    {
      id: "LUNGS",
      label: "Lungs",
      regionId: "TORSO",
      presentation: "TWO_COLUMN",
      columns: [
        { id: "LEFT", bodySlotId: "LEFT_LUNG" },
        { id: "RIGHT", bodySlotId: "RIGHT_LUNG" }
      ],
      supportedInstallationModes: ["SINGLE_SIDE", "TWO_INDEPENDENT", "BILATERAL_SINGLE_INSTANCE"]
    },
    {
      id: "KIDNEYS",
      label: "Kidneys",
      regionId: "TORSO",
      presentation: "TWO_COLUMN",
      columns: [
        { id: "LEFT", bodySlotId: "LEFT_KIDNEY" },
        { id: "RIGHT", bodySlotId: "RIGHT_KIDNEY" }
      ],
      supportedInstallationModes: ["SINGLE_SIDE", "TWO_INDEPENDENT", "BILATERAL_SINGLE_INSTANCE"]
    }
  ];

  const SYSTEMIC_LAYERS = [
    { id: "DERMAL", label: "Dermal", regionId: "SYSTEMIC_LAYERS" },
    { id: "SKELETAL", label: "Skeletal", regionId: "SYSTEMIC_LAYERS" },
    { id: "NERVOUS", label: "Nervous", regionId: "SYSTEMIC_LAYERS" },
    { id: "VASCULAR", label: "Vascular", regionId: "SYSTEMIC_LAYERS" }
  ];

  const IMPLANT_FAMILIES = [
    { id: "CORE", label: "Core" },
    { id: "SENSORY", label: "Sensory" },
    { id: "CRANIOFACIAL", label: "Craniofacial" },
    { id: "ORGAN", label: "Organ" },
    { id: "INTERNAL", label: "Internal" },
    { id: "LIMB", label: "Limb" },
    { id: "STRUCTURAL", label: "Structural" },
    { id: "SYSTEMIC_LAYER", label: "Systemic Layer" }
  ];

  const IMPLANT_SUBTYPES = [
    { id: "NEUROCHIP", familyId: "CORE" },
    { id: "INTERFACE", familyId: "CORE" },
    { id: "SERVICE_PORT", familyId: "CORE" },
    { id: "OCULAR", familyId: "SENSORY" },
    { id: "AUDITORY", familyId: "SENSORY" },
    { id: "OLFACTORY", familyId: "SENSORY" },
    { id: "CRANIAL", familyId: "CRANIOFACIAL" },
    { id: "ORAL", familyId: "CRANIOFACIAL" },
    { id: "DENTAL", familyId: "CRANIOFACIAL" },
    { id: "JAW", familyId: "CRANIOFACIAL" },
    { id: "LARYNGEAL", familyId: "CRANIOFACIAL" },
    { id: "CERVICAL", familyId: "CRANIOFACIAL" },
    { id: "CARDIAC", familyId: "ORGAN" },
    { id: "RESPIRATORY", familyId: "ORGAN" },
    { id: "HEPATIC", familyId: "ORGAN" },
    { id: "DIGESTIVE", familyId: "ORGAN" },
    { id: "RENAL", familyId: "ORGAN" },
    { id: "CHEST_AUXILIARY", familyId: "INTERNAL" },
    { id: "ABDOMINAL_AUXILIARY", familyId: "INTERNAL" },
    { id: "ARM", familyId: "LIMB" },
    { id: "HAND", familyId: "LIMB" },
    { id: "LEG", familyId: "LIMB" },
    { id: "FOOT", familyId: "LIMB" },
    { id: "JOINT", familyId: "STRUCTURAL" },
    { id: "SPINAL", familyId: "STRUCTURAL" },
    { id: "DERMAL", familyId: "SYSTEMIC_LAYER" },
    { id: "SKELETAL", familyId: "SYSTEMIC_LAYER" },
    { id: "NERVOUS", familyId: "SYSTEMIC_LAYER" },
    { id: "VASCULAR", familyId: "SYSTEMIC_LAYER" }
  ];

  const LEGACY_SLOT_ALIASES = {
    neural: "NEURAL",
    interface: "OCCIPITAL_INTERFACE",
    neckService: "NECK_SERVICE_PORT",
    leftEye: "LEFT_EYE",
    rightEye: "RIGHT_EYE",
    leftEar: "LEFT_EAR",
    rightEar: "RIGHT_EAR",
    cardiac: "HEART",
    liver: "LIVER",
    leftKidney: "LEFT_KIDNEY",
    rightKidney: "RIGHT_KIDNEY",
    spineCore: "SPINE",
    leftShoulder: "LEFT_SHOULDER",
    rightShoulder: "RIGHT_SHOULDER",
    leftForearm: "LEFT_FOREARM",
    rightForearm: "RIGHT_FOREARM",
    leftPalm: "LEFT_PALM",
    rightPalm: "RIGHT_PALM",
    leftThumb: "LEFT_THUMB",
    rightThumb: "RIGHT_THUMB",
    leftIndexFinger: "LEFT_INDEX",
    rightIndexFinger: "RIGHT_INDEX",
    leftMiddleFinger: "LEFT_MIDDLE",
    rightMiddleFinger: "RIGHT_MIDDLE",
    leftRingFinger: "LEFT_RING",
    rightRingFinger: "RIGHT_RING",
    leftLittleFinger: "LEFT_LITTLE",
    rightLittleFinger: "RIGHT_LITTLE"
  };

  const LEGACY_REVIEW_CODES = {
    respiratory: "CYBERWARE_BODY_FOOTPRINT_UNRESOLVED",
    ocularSet: "CYBERWARE_BODY_FOOTPRINT_UNRESOLVED",
    audioSet: "CYBERWARE_BODY_FOOTPRINT_UNRESOLVED",
    internal: "CYBERWARE_TAXONOMY_REVIEW_REQUIRED",
    leftArmCore: "CYBERWARE_BODY_FOOTPRINT_UNRESOLVED",
    rightArmCore: "CYBERWARE_BODY_FOOTPRINT_UNRESOLVED",
    leftLegCore: "CYBERWARE_BODY_FOOTPRINT_UNRESOLVED",
    rightLegCore: "CYBERWARE_BODY_FOOTPRINT_UNRESOLVED",
    leftLowerLeg: "CYBERWARE_BODY_FOOTPRINT_UNRESOLVED",
    rightLowerLeg: "CYBERWARE_BODY_FOOTPRINT_UNRESOLVED",
    dermal: "CYBERWARE_SYSTEMIC_COVERAGE_UNDEFINED",
    skeletal: "CYBERWARE_SYSTEMIC_COVERAGE_UNDEFINED"
  };

  window.WS_APP_DATA.CYBERWARE_TAXONOMY = Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    bodyRegions: BODY_REGIONS,
    bodySlots: BODY_SLOTS,
    slotGroups: SLOT_GROUPS,
    systemicLayers: SYSTEMIC_LAYERS,
    implantFamilies: IMPLANT_FAMILIES,
    implantSubtypes: IMPLANT_SUBTYPES,
    legacySlotAliases: LEGACY_SLOT_ALIASES,
    legacyReviewCodes: LEGACY_REVIEW_CODES
  });
})();
