(function initCyberwareBodymapLayouts() {
  window.WS_APP_DATA = window.WS_APP_DATA || {};

  const region = (id, label, options = {}) => ({
    id,
    label,
    parentId: options.parentId || "",
    side: options.side || "",
    defaultOrientation: options.defaultOrientation || "FRONT",
    orientations: Array.isArray(options.orientations) ? options.orientations : [options.defaultOrientation || "FRONT"],
    direct: options.direct !== false,
    order: Number(options.order || 0)
  });

  const anchor = (id, label, x, y, options = {}) => ({
    id,
    label,
    x,
    y,
    kind: options.kind || "SLOT",
    targetRegionId: options.targetRegionId || "",
    slotIds: Array.isArray(options.slotIds) ? options.slotIds : [],
    labelX: Number.isFinite(options.labelX) ? options.labelX : null,
    labelY: Number.isFinite(options.labelY) ? options.labelY : null,
    labelSide: options.labelSide || "AUTO",
    continuityGroup: options.continuityGroup || ""
  });

  const view = (id, regionId, orientation, assetPath, anchors = []) => ({
    id,
    regionId,
    orientation,
    assetPath,
    anchors
  });

  const regions = [
    region("BODY", "Bodymap", { defaultOrientation: "FRONT", orientations: ["FRONT", "BACK"], order: 10 }),
    region("HEAD", "Head", { parentId: "BODY", defaultOrientation: "FRONT", orientations: ["FRONT", "BACK"], order: 20 }),
    region("NEURAL", "Neural", { parentId: "HEAD", defaultOrientation: "DETAIL", orientations: ["DETAIL"], order: 30 }),
    region("LEFT_EYE", "Left Eye", { parentId: "HEAD", side: "LEFT", defaultOrientation: "DETAIL", orientations: ["DETAIL"], order: 40 }),
    region("RIGHT_EYE", "Right Eye", { parentId: "HEAD", side: "RIGHT", defaultOrientation: "DETAIL", orientations: ["DETAIL"], order: 50 }),
    region("TORSO", "Torso", { parentId: "BODY", defaultOrientation: "FRONT", orientations: ["FRONT", "BACK"], order: 60 }),
    region("LEFT_ARM", "Left Arm", { parentId: "BODY", side: "LEFT", defaultOrientation: "DETAIL", orientations: ["DETAIL"], order: 70 }),
    region("LEFT_HAND", "Left Hand", { parentId: "LEFT_ARM", side: "LEFT", defaultOrientation: "DETAIL", orientations: ["DETAIL"], order: 80 }),
    region("RIGHT_ARM", "Right Arm", { parentId: "BODY", side: "RIGHT", defaultOrientation: "DETAIL", orientations: ["DETAIL"], order: 90 }),
    region("RIGHT_HAND", "Right Hand", { parentId: "RIGHT_ARM", side: "RIGHT", defaultOrientation: "DETAIL", orientations: ["DETAIL"], order: 100 }),
    region("LEFT_LEG", "Left Leg", { parentId: "BODY", side: "LEFT", defaultOrientation: "DETAIL", orientations: ["DETAIL"], order: 110 }),
    region("RIGHT_LEG", "Right Leg", { parentId: "BODY", side: "RIGHT", defaultOrientation: "DETAIL", orientations: ["DETAIL"], order: 120 })
  ];

  const views = [
    view("body_front", "BODY", "FRONT", "assets/bodymap/bodymap_front.avif", [
      anchor("body_head", "Head", 50, 10, { kind: "NAVIGATION", targetRegionId: "HEAD", slotIds: ["neuralCoreSet", "ocularSet", "audioSet"], labelX: 54, labelY: 7, continuityGroup: "BODY_HEAD" }),
      anchor("body_torso", "Torso", 50, 31, { kind: "NAVIGATION", targetRegionId: "TORSO", slotIds: ["torsoSet", "bodyFrameSet"], labelX: 55, labelY: 30, continuityGroup: "BODY_TORSO" }),
      anchor("body_left_arm", "Left Arm", 70, 31, { kind: "NAVIGATION", targetRegionId: "LEFT_ARM", slotIds: ["leftArmCore"], labelX: 75, labelY: 29, continuityGroup: "BODY_LEFT_ARM" }),
      anchor("body_right_arm", "Right Arm", 30, 31, { kind: "NAVIGATION", targetRegionId: "RIGHT_ARM", slotIds: ["rightArmCore"], labelX: 8, labelY: 29, continuityGroup: "BODY_RIGHT_ARM" }),
      anchor("body_left_hand", "Left Hand", 80, 51, { kind: "NAVIGATION", targetRegionId: "LEFT_HAND", slotIds: ["leftHandCore"], labelX: 82, labelY: 49, continuityGroup: "BODY_LEFT_HAND" }),
      anchor("body_right_hand", "Right Hand", 20, 51, { kind: "NAVIGATION", targetRegionId: "RIGHT_HAND", slotIds: ["rightHandCore"], labelX: 2, labelY: 49, continuityGroup: "BODY_RIGHT_HAND" }),
      anchor("body_left_leg", "Left Leg", 59, 69, { kind: "NAVIGATION", targetRegionId: "LEFT_LEG", slotIds: ["leftLegCore"], labelX: 64, labelY: 68, continuityGroup: "BODY_LEFT_LEG" }),
      anchor("body_right_leg", "Right Leg", 41, 69, { kind: "NAVIGATION", targetRegionId: "RIGHT_LEG", slotIds: ["rightLegCore"], labelX: 20, labelY: 68, continuityGroup: "BODY_RIGHT_LEG" })
    ]),
    view("body_back", "BODY", "BACK", "assets/bodymap/bodymap_back.avif", [
      anchor("body_back_head", "Head", 50, 10, { kind: "NAVIGATION", targetRegionId: "HEAD", slotIds: ["neuralCoreSet", "ocularSet", "audioSet"], labelX: 55, labelY: 8, continuityGroup: "BODY_HEAD" }),
      anchor("body_back_torso", "Torso / Spine", 50, 33, { kind: "NAVIGATION", targetRegionId: "TORSO", slotIds: ["torsoSet", "bodyFrameSet"], labelX: 55, labelY: 32, continuityGroup: "BODY_TORSO" }),
      anchor("body_back_left_arm", "Left Arm", 70, 30, { kind: "NAVIGATION", targetRegionId: "LEFT_ARM", slotIds: ["leftArmCore"], labelX: 75, labelY: 28, continuityGroup: "BODY_LEFT_ARM" }),
      anchor("body_back_right_arm", "Right Arm", 30, 30, { kind: "NAVIGATION", targetRegionId: "RIGHT_ARM", slotIds: ["rightArmCore"], labelX: 8, labelY: 28, continuityGroup: "BODY_RIGHT_ARM" }),
      anchor("body_back_left_leg", "Left Leg", 58, 70, { kind: "NAVIGATION", targetRegionId: "LEFT_LEG", slotIds: ["leftLegCore"], labelX: 63, labelY: 69, continuityGroup: "BODY_LEFT_LEG" }),
      anchor("body_back_right_leg", "Right Leg", 42, 70, { kind: "NAVIGATION", targetRegionId: "RIGHT_LEG", slotIds: ["rightLegCore"], labelX: 21, labelY: 69, continuityGroup: "BODY_RIGHT_LEG" })
    ]),

    view("head_front", "HEAD", "FRONT", "assets/bodymap/head_front.avif", [
      anchor("head_left_eye", "Left Eye", 59, 40, { kind: "NAVIGATION", targetRegionId: "LEFT_EYE", slotIds: ["leftEye"], labelX: 65, labelY: 39, continuityGroup: "HEAD_LEFT_EYE" }),
      anchor("head_right_eye", "Right Eye", 41, 40, { kind: "NAVIGATION", targetRegionId: "RIGHT_EYE", slotIds: ["rightEye"], labelX: 19, labelY: 39, continuityGroup: "HEAD_RIGHT_EYE" }),
      anchor("head_left_ear", "Left Ear", 71, 43, { slotIds: ["leftEar"], labelX: 77, labelY: 43 }),
      anchor("head_right_ear", "Right Ear", 29, 43, { slotIds: ["rightEar"], labelX: 7, labelY: 43 })
    ]),
    view("head_back", "HEAD", "BACK", "assets/bodymap/head_back.avif", [
      anchor("head_neural", "Neural", 50, 39, { kind: "NAVIGATION", targetRegionId: "NEURAL", slotIds: ["neuralCoreSet", "neural", "interface", "neckService"], labelX: 55, labelY: 37, continuityGroup: "HEAD_NEURAL" }),
      anchor("head_interface", "Interface", 50, 46, { slotIds: ["interface"], labelX: 55, labelY: 47 }),
      anchor("head_service_port", "Service Port", 66, 50, { slotIds: ["neckService"], labelX: 72, labelY: 51 })
    ]),
    view("neural", "NEURAL", "DETAIL", "assets/bodymap/brain.avif", [
      anchor("neural_neurochip", "Neurochip", 50, 36, { slotIds: ["neural"], labelX: 55, labelY: 33, continuityGroup: "HEAD_NEURAL" }),
      anchor("neural_interface", "Interface", 50, 49, { slotIds: ["interface"], labelX: 55, labelY: 50 }),
      anchor("neural_service", "Service Port", 37, 58, { slotIds: ["neckService"], labelX: 10, labelY: 58 }),
      anchor("neural_spine", "Spine Control", 50, 77, { slotIds: ["spineCore"], labelX: 55, labelY: 78 })
    ]),
    view("eye_left", "LEFT_EYE", "DETAIL", "assets/bodymap/eye_left.avif", [
      anchor("left_eye_slot", "Left Eye", 50, 48, { slotIds: ["leftEye"], labelX: 56, labelY: 48, continuityGroup: "HEAD_LEFT_EYE" })
    ]),
    view("eye_right", "RIGHT_EYE", "DETAIL", "assets/bodymap/eye_right.avif", [
      anchor("right_eye_slot", "Right Eye", 50, 48, { slotIds: ["rightEye"], labelX: 56, labelY: 48, continuityGroup: "HEAD_RIGHT_EYE" })
    ]),

    view("torso_front", "TORSO", "FRONT", "assets/bodymap/torso_front.avif", [
      anchor("torso_respiratory", "Respiratory", 50, 38, { slotIds: ["respiratory"], labelX: 27, labelY: 38 }),
      anchor("torso_cardiac", "Cardiac", 56, 34, { slotIds: ["cardiac"], labelX: 62, labelY: 32 }),
      anchor("torso_liver", "Liver", 40, 51, { slotIds: ["liver"], labelX: 17, labelY: 51 }),
      anchor("torso_left_kidney", "Left Kidney", 60, 60, { slotIds: ["leftKidney"], labelX: 66, labelY: 60 }),
      anchor("torso_right_kidney", "Right Kidney", 40, 60, { slotIds: ["rightKidney"], labelX: 13, labelY: 60 }),
      anchor("torso_internal", "Internal Aux", 50, 47, { slotIds: ["internal"], labelX: 55, labelY: 47 }),
      anchor("torso_dermal", "Dermal Layer", 25, 68, { slotIds: ["dermal"], labelX: 3, labelY: 68 }),
      anchor("torso_skeletal", "Skeletal Frame", 75, 68, { slotIds: ["skeletal"], labelX: 79, labelY: 68 })
    ]),
    view("torso_back", "TORSO", "BACK", "assets/bodymap/torso_back.avif", [
      anchor("torso_back_spine", "Spine Core", 50, 46, { slotIds: ["spineCore"], labelX: 55, labelY: 45 }),
      anchor("torso_back_dermal", "Dermal Layer", 25, 50, { slotIds: ["dermal"], labelX: 3, labelY: 50 }),
      anchor("torso_back_skeletal", "Skeletal Frame", 75, 50, { slotIds: ["skeletal"], labelX: 79, labelY: 50 }),
      anchor("torso_back_left_kidney", "Left Kidney", 60, 65, { slotIds: ["leftKidney"], labelX: 66, labelY: 65 }),
      anchor("torso_back_right_kidney", "Right Kidney", 40, 65, { slotIds: ["rightKidney"], labelX: 13, labelY: 65 }),
      anchor("torso_back_internal", "Internal Aux", 50, 73, { slotIds: ["internal"], labelX: 55, labelY: 73 })
    ]),

    view("arm_left", "LEFT_ARM", "DETAIL", "assets/bodymap/arm_left.avif", [
      anchor("left_arm_core", "Arm Core", 55, 31, { slotIds: ["leftArmCore"], labelX: 62, labelY: 31, continuityGroup: "BODY_LEFT_ARM" }),
      anchor("left_shoulder", "Shoulder", 54, 17, { slotIds: ["leftShoulder"], labelX: 61, labelY: 16 }),
      anchor("left_forearm", "Forearm", 56, 52, { slotIds: ["leftForearm"], labelX: 63, labelY: 52 }),
      anchor("left_hand_nav", "Left Hand", 55, 76, { kind: "NAVIGATION", targetRegionId: "LEFT_HAND", slotIds: ["leftHandCore"], labelX: 62, labelY: 76, continuityGroup: "LEFT_ARM_HAND" })
    ]),
    view("arm_right", "RIGHT_ARM", "DETAIL", "assets/bodymap/arm_right.avif", [
      anchor("right_arm_core", "Arm Core", 45, 31, { slotIds: ["rightArmCore"], labelX: 20, labelY: 31, continuityGroup: "BODY_RIGHT_ARM" }),
      anchor("right_shoulder", "Shoulder", 45, 17, { slotIds: ["rightShoulder"], labelX: 20, labelY: 16 }),
      anchor("right_forearm", "Forearm", 44, 52, { slotIds: ["rightForearm"], labelX: 18, labelY: 52 }),
      anchor("right_hand_nav", "Right Hand", 45, 76, { kind: "NAVIGATION", targetRegionId: "RIGHT_HAND", slotIds: ["rightHandCore"], labelX: 18, labelY: 76, continuityGroup: "RIGHT_ARM_HAND" })
    ]),
    view("hand_left", "LEFT_HAND", "DETAIL", "assets/bodymap/hand_left.avif", [
      anchor("left_hand_core", "Hand Core", 50, 19, { slotIds: ["leftHandCore"], labelX: 56, labelY: 18, continuityGroup: "LEFT_ARM_HAND" }),
      anchor("left_palm", "Palm", 50, 38, { slotIds: ["leftPalm"], labelX: 56, labelY: 37 }),
      anchor("left_thumb", "Thumb", 67, 47, { slotIds: ["leftThumb"], labelX: 72, labelY: 45 }),
      anchor("left_index", "Index", 58, 58, { slotIds: ["leftIndexFinger"], labelX: 64, labelY: 58 }),
      anchor("left_middle", "Middle", 50, 60, { slotIds: ["leftMiddleFinger"], labelX: 55, labelY: 65 }),
      anchor("left_ring", "Ring", 42, 59, { slotIds: ["leftRingFinger"], labelX: 18, labelY: 59 }),
      anchor("left_little", "Little", 34, 55, { slotIds: ["leftLittleFinger"], labelX: 7, labelY: 54 })
    ]),
    view("hand_right", "RIGHT_HAND", "DETAIL", "assets/bodymap/hand_right.avif", [
      anchor("right_hand_core", "Hand Core", 50, 19, { slotIds: ["rightHandCore"], labelX: 56, labelY: 18, continuityGroup: "RIGHT_ARM_HAND" }),
      anchor("right_palm", "Palm", 50, 38, { slotIds: ["rightPalm"], labelX: 56, labelY: 37 }),
      anchor("right_thumb", "Thumb", 33, 47, { slotIds: ["rightThumb"], labelX: 8, labelY: 45 }),
      anchor("right_index", "Index", 42, 58, { slotIds: ["rightIndexFinger"], labelX: 17, labelY: 58 }),
      anchor("right_middle", "Middle", 50, 60, { slotIds: ["rightMiddleFinger"], labelX: 55, labelY: 65 }),
      anchor("right_ring", "Ring", 58, 59, { slotIds: ["rightRingFinger"], labelX: 64, labelY: 59 }),
      anchor("right_little", "Little", 66, 55, { slotIds: ["rightLittleFinger"], labelX: 72, labelY: 54 })
    ]),

    view("leg_left", "LEFT_LEG", "DETAIL", "assets/bodymap/legl_left.avif", [
      anchor("left_leg_core", "Leg Core", 50, 43, { slotIds: ["leftLegCore"], labelX: 56, labelY: 43, continuityGroup: "BODY_LEFT_LEG" }),
      anchor("left_thigh", "Thigh", 50, 24, { slotIds: ["leftThigh"], labelX: 56, labelY: 24 }),
      anchor("left_lower_leg", "Lower Leg", 50, 62, { slotIds: ["leftLowerLeg"], labelX: 56, labelY: 62 }),
      anchor("left_foot", "Foot", 50, 82, { slotIds: ["leftFootCore"], labelX: 56, labelY: 82 })
    ]),
    view("leg_right", "RIGHT_LEG", "DETAIL", "assets/bodymap/leg_r.avif", [
      anchor("right_leg_core", "Leg Core", 50, 43, { slotIds: ["rightLegCore"], labelX: 56, labelY: 43, continuityGroup: "BODY_RIGHT_LEG" }),
      anchor("right_thigh", "Thigh", 50, 24, { slotIds: ["rightThigh"], labelX: 56, labelY: 24 }),
      anchor("right_lower_leg", "Lower Leg", 50, 62, { slotIds: ["rightLowerLeg"], labelX: 56, labelY: 62 }),
      anchor("right_foot", "Foot", 50, 82, { slotIds: ["rightFootCore"], labelX: 56, labelY: 82 })
    ])
  ];

  const preferredRegionBySlot = {
    neuralCoreSet: "NEURAL", neural: "NEURAL", interface: "NEURAL", neckService: "HEAD",
    ocularSet: "HEAD", leftEye: "LEFT_EYE", rightEye: "RIGHT_EYE",
    audioSet: "HEAD", leftEar: "HEAD", rightEar: "HEAD",
    torsoSet: "TORSO", respiratory: "TORSO", cardiac: "TORSO", liver: "TORSO", leftKidney: "TORSO", rightKidney: "TORSO", internal: "TORSO",
    bodyFrameSet: "TORSO", dermal: "TORSO", skeletal: "TORSO", spineCore: "TORSO",
    armsSet: "BODY", leftArmCore: "LEFT_ARM", leftShoulder: "LEFT_ARM", leftForearm: "LEFT_ARM",
    leftHandCore: "LEFT_HAND", leftPalm: "LEFT_HAND", leftThumb: "LEFT_HAND", leftIndexFinger: "LEFT_HAND", leftMiddleFinger: "LEFT_HAND", leftRingFinger: "LEFT_HAND", leftLittleFinger: "LEFT_HAND",
    rightArmCore: "RIGHT_ARM", rightShoulder: "RIGHT_ARM", rightForearm: "RIGHT_ARM",
    rightHandCore: "RIGHT_HAND", rightPalm: "RIGHT_HAND", rightThumb: "RIGHT_HAND", rightIndexFinger: "RIGHT_HAND", rightMiddleFinger: "RIGHT_HAND", rightRingFinger: "RIGHT_HAND", rightLittleFinger: "RIGHT_HAND",
    legsSet: "BODY", leftLegCore: "LEFT_LEG", leftThigh: "LEFT_LEG", leftLowerLeg: "LEFT_LEG", leftFootCore: "LEFT_LEG",
    rightLegCore: "RIGHT_LEG", rightThigh: "RIGHT_LEG", rightLowerLeg: "RIGHT_LEG", rightFootCore: "RIGHT_LEG"
  };

  window.WS_APP_DATA.CYBERWARE_BODYMAP_LAYOUTS = Object.freeze({
    schemaVersion: 1,
    regions: Object.freeze(regions),
    views: Object.freeze(views),
    preferredRegionBySlot: Object.freeze(preferredRegionBySlot)
  });
})();
