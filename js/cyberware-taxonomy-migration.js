(function initCyberwareTaxonomyMigration() {
  window.WS_APP = window.WS_APP || {};
  const app = window.WS_APP;
  const taxonomy = app.cyberwareTaxonomy;
  const data = window.WS_APP_DATA?.CYBERWARE_TAXONOMY || {};
  const token = (value) => String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
  const unique = (values) => [...new Set((Array.isArray(values) ? values : [values]).map(token).filter(Boolean))];

  const slotsById = new Map((data.bodySlots || []).map((slot) => [slot.id, slot]));
  const groupsById = new Map((data.slotGroups || []).map((group) => [group.id, group]));

  const synthetic = [
    { key: "CORE_STACK", label: "CORE STACK", group: "CORE STACK", slotLevel: "SET", children: ["NEURAL", "OCCIPITAL_INTERFACE", "NECK_SERVICE_PORT"] },
    { key: "OCULAR_SET", label: "OCULAR SET", group: "OCULAR", slotLevel: "SET", children: ["LEFT_EYE", "RIGHT_EYE"] },
    { key: "EARS", label: "EARS", group: "EARS", slotLevel: "SET", children: ["LEFT_EAR", "RIGHT_EAR"], presentation: "TWO_COLUMN" },
    { key: "TORSO_SET", label: "TORSO / ORGANS", group: "TORSO", slotLevel: "SET", children: ["HEART", "LUNGS", "LIVER", "STOMACH", "KIDNEYS", "CHEST_INTERNAL", "ABDOMEN_INTERNAL", "PELVIS", "SPINE"] },
    { key: "LUNGS", label: "LUNGS", group: "TORSO", slotLevel: "SET", parent: "TORSO_SET", children: ["LEFT_LUNG", "RIGHT_LUNG"], presentation: "TWO_COLUMN" },
    { key: "KIDNEYS", label: "KIDNEYS", group: "TORSO", slotLevel: "SET", parent: "TORSO_SET", children: ["LEFT_KIDNEY", "RIGHT_KIDNEY"], presentation: "TWO_COLUMN" },
    { key: "SYSTEMIC_LAYERS", label: "SYSTEMIC LAYERS", group: "BODY", slotLevel: "SET", children: ["DERMAL", "SKELETAL", "NERVOUS", "VASCULAR"], systemic: true },
    { key: "ARMS_SET", label: "ARMS", group: "ARMS", slotLevel: "SET", children: ["LEFT_ARM_SET", "RIGHT_ARM_SET"] },
    { key: "LEFT_ARM_SET", label: "LEFT ARM", group: "LEFT ARM", slotLevel: "BIG", parent: "ARMS_SET", side: "LEFT", children: ["LEFT_SHOULDER", "LEFT_UPPER_ARM", "LEFT_ELBOW", "LEFT_FOREARM", "LEFT_HAND_SET"] },
    { key: "RIGHT_ARM_SET", label: "RIGHT ARM", group: "RIGHT ARM", slotLevel: "BIG", parent: "ARMS_SET", side: "RIGHT", children: ["RIGHT_SHOULDER", "RIGHT_UPPER_ARM", "RIGHT_ELBOW", "RIGHT_FOREARM", "RIGHT_HAND_SET"] },
    { key: "LEFT_HAND_SET", label: "LEFT HAND", group: "LEFT HAND", slotLevel: "MEDIUM", parent: "LEFT_ARM_SET", side: "LEFT", children: ["LEFT_WRIST", "LEFT_PALM", "LEFT_THUMB", "LEFT_INDEX", "LEFT_MIDDLE", "LEFT_RING", "LEFT_LITTLE"] },
    { key: "RIGHT_HAND_SET", label: "RIGHT HAND", group: "RIGHT HAND", slotLevel: "MEDIUM", parent: "RIGHT_ARM_SET", side: "RIGHT", children: ["RIGHT_WRIST", "RIGHT_PALM", "RIGHT_THUMB", "RIGHT_INDEX", "RIGHT_MIDDLE", "RIGHT_RING", "RIGHT_LITTLE"] },
    { key: "LEGS_SET", label: "LEGS", group: "LEGS", slotLevel: "SET", children: ["LEFT_LEG_SET", "RIGHT_LEG_SET"] },
    { key: "LEFT_LEG_SET", label: "LEFT LEG", group: "LEFT LEG", slotLevel: "BIG", parent: "LEGS_SET", side: "LEFT", children: ["LEFT_HIP", "LEFT_THIGH", "LEFT_KNEE", "LEFT_SHIN", "LEFT_CALF", "LEFT_ANKLE", "LEFT_FOOT"] },
    { key: "RIGHT_LEG_SET", label: "RIGHT LEG", group: "RIGHT LEG", slotLevel: "BIG", parent: "LEGS_SET", side: "RIGHT", children: ["RIGHT_HIP", "RIGHT_THIGH", "RIGHT_KNEE", "RIGHT_SHIN", "RIGHT_CALF", "RIGHT_ANKLE", "RIGHT_FOOT"] }
  ];

  const parentBySlot = new Map();
  synthetic.forEach((node) => (node.children || []).forEach((child) => parentBySlot.set(child, node.key)));
  const slotDefinitions = [
    ...synthetic,
    ...(data.bodySlots || []).map((slot) => ({
      key: slot.id,
      label: String(slot.label || slot.id).toUpperCase(),
      group: slot.regionId || "BODY",
      slotLevel: slot.level || "SMALL",
      parent: parentBySlot.get(slot.id) || "",
      side: slot.side || "",
      cardinality: slot.cardinality || "",
      coreStack: !!slot.coreStack,
      accepts: [slot.id, slot.label]
    })),
    ...(data.systemicLayers || []).map((layer) => ({
      key: layer.id,
      label: String(layer.label || layer.id).toUpperCase(),
      group: "SYSTEMIC LAYERS",
      slotLevel: "BIG",
      parent: "SYSTEMIC_LAYERS",
      systemic: true,
      accepts: [layer.id, layer.label]
    }))
  ];

  const slotGroups = [
    { key: "NEURAL_CORE", label: "Core Stack", rootSlotKeys: ["CORE_STACK"], slotKeys: ["CORE_STACK", "NEURAL", "OCCIPITAL_INTERFACE", "NECK_SERVICE_PORT"] },
    { key: "SENSORY", label: "Sensory", rootSlotKeys: ["OCULAR_SET", "EARS"], slotKeys: ["OCULAR_SET", "LEFT_EYE", "RIGHT_EYE", "EARS", "LEFT_EAR", "RIGHT_EAR"] },
    { key: "TORSO_ORGANS", label: "Torso / Organs", rootSlotKeys: ["TORSO_SET"], slotKeys: ["TORSO_SET", "HEART", "LUNGS", "LEFT_LUNG", "RIGHT_LUNG", "LIVER", "STOMACH", "KIDNEYS", "LEFT_KIDNEY", "RIGHT_KIDNEY", "CHEST_INTERNAL", "ABDOMEN_INTERNAL", "PELVIS", "SPINE"] },
    { key: "SYSTEMIC", label: "Systemic Layers", rootSlotKeys: ["SYSTEMIC_LAYERS"], slotKeys: ["SYSTEMIC_LAYERS", "DERMAL", "SKELETAL", "NERVOUS", "VASCULAR"] },
    { key: "UPPER_LIMBS", label: "Arms", rootSlotKeys: ["ARMS_SET"], slotKeys: slotDefinitions.filter((slot) => /ARM|HAND|SHOULDER|ELBOW|FOREARM|WRIST|PALM|THUMB|INDEX|MIDDLE|RING|LITTLE/.test(slot.key)).map((slot) => slot.key) },
    { key: "LOWER_LIMBS", label: "Legs", rootSlotKeys: ["LEGS_SET"], slotKeys: slotDefinitions.filter((slot) => /LEG|HIP|THIGH|KNEE|SHIN|CALF|ANKLE|FOOT/.test(slot.key)).map((slot) => slot.key) }
  ];

  const purposes = [
    { key: "CORE_PROCESSING", label: "Processing", slotKeys: ["NEURAL"] },
    { key: "BODY_BUS", label: "Body Bus", slotKeys: ["OCCIPITAL_INTERFACE"] },
    { key: "SERVICE_ACCESS", label: "Service Access", slotKeys: ["NECK_SERVICE_PORT"] },
    { key: "VISION", label: "Vision", slotKeys: ["LEFT_EYE", "RIGHT_EYE"] },
    { key: "HEARING", label: "Hearing", slotKeys: ["LEFT_EAR", "RIGHT_EAR"] },
    { key: "RESPIRATION", label: "Respiration", slotKeys: ["LEFT_LUNG", "RIGHT_LUNG"] },
    { key: "CIRCULATION", label: "Circulation", slotKeys: ["HEART", "VASCULAR"] },
    { key: "METABOLIC", label: "Metabolic", slotKeys: ["LIVER", "STOMACH", "LEFT_KIDNEY", "RIGHT_KIDNEY", "CHEST_INTERNAL", "ABDOMEN_INTERNAL"] },
    { key: "PROTECTION", label: "Protection", slotKeys: ["DERMAL", "SKELETAL"] },
    { key: "SPINAL_CONTROL", label: "Spinal Control", slotKeys: ["SPINE", "NERVOUS"] },
    { key: "LOCOMOTION", label: "Locomotion", slotKeys: slotDefinitions.filter((slot) => /LEG|HIP|THIGH|KNEE|SHIN|CALF|ANKLE|FOOT/.test(slot.key)).map((slot) => slot.key) }
  ];

  const legacyAliasMap = {
    neural: "NEURAL", interface: "OCCIPITAL_INTERFACE", neckService: "NECK_SERVICE_PORT",
    ocularSet: "OCULAR_SET", leftEye: "LEFT_EYE", rightEye: "RIGHT_EYE",
    audioSet: "EARS", leftEar: "LEFT_EAR", rightEar: "RIGHT_EAR",
    respiratory: "LUNGS", cardiac: "HEART", liver: "LIVER", leftKidney: "LEFT_KIDNEY", rightKidney: "RIGHT_KIDNEY",
    torsoSet: "TORSO_SET", bodyFrameSet: "SYSTEMIC_LAYERS", dermal: "DERMAL", skeletal: "SKELETAL", spineCore: "SPINE",
    armsSet: "ARMS_SET", leftArmCore: "LEFT_ARM_SET", rightArmCore: "RIGHT_ARM_SET",
    leftShoulder: "LEFT_SHOULDER", rightShoulder: "RIGHT_SHOULDER", leftForearm: "LEFT_FOREARM", rightForearm: "RIGHT_FOREARM",
    leftHandCore: "LEFT_HAND_SET", rightHandCore: "RIGHT_HAND_SET", leftPalm: "LEFT_PALM", rightPalm: "RIGHT_PALM",
    leftThumb: "LEFT_THUMB", rightThumb: "RIGHT_THUMB", leftIndexFinger: "LEFT_INDEX", rightIndexFinger: "RIGHT_INDEX",
    leftMiddleFinger: "LEFT_MIDDLE", rightMiddleFinger: "RIGHT_MIDDLE", leftRingFinger: "LEFT_RING", rightRingFinger: "RIGHT_RING",
    leftLittleFinger: "LEFT_LITTLE", rightLittleFinger: "RIGHT_LITTLE",
    legsSet: "LEGS_SET", leftLegCore: "LEFT_LEG_SET", rightLegCore: "RIGHT_LEG_SET", leftThigh: "LEFT_THIGH", rightThigh: "RIGHT_THIGH",
    leftLowerLeg: "LEFT_SHIN", rightLowerLeg: "RIGHT_SHIN", leftFootCore: "LEFT_FOOT", rightFootCore: "RIGHT_FOOT"
  };

  Object.entries({ ...legacyAliasMap }).forEach(([legacyKey, canonical]) => {
    legacyAliasMap[token(legacyKey)] = canonical;
    legacyAliasMap[token(legacyKey).replace(/_/g, "")] = canonical;
  });

  function inferFootprint(definition = {}) {
    const raw = unique(definition.bodySlots || definition.slots || definition.installationSlots || definition.slot || definition.primarySlot);
    const out = [];
    const blockers = [];
    raw.forEach((slot) => {
      const original = String(slot || "");
      const direct = slotsById.has(slot) ? slot : legacyAliasMap[original] || legacyAliasMap[original.replace(/[\s-]+/g, "")];
      if (direct === "LUNGS") out.push("LEFT_LUNG", "RIGHT_LUNG");
      else if (direct === "OCULAR_SET") out.push("LEFT_EYE", "RIGHT_EYE");
      else if (direct === "EARS") out.push("LEFT_EAR", "RIGHT_EAR");
      else if (direct === "LEFT_ARM_SET") out.push("LEFT_SHOULDER", "LEFT_UPPER_ARM", "LEFT_ELBOW", "LEFT_FOREARM", "LEFT_WRIST");
      else if (direct === "RIGHT_ARM_SET") out.push("RIGHT_SHOULDER", "RIGHT_UPPER_ARM", "RIGHT_ELBOW", "RIGHT_FOREARM", "RIGHT_WRIST");
      else if (direct === "LEFT_HAND_SET") out.push("LEFT_WRIST", "LEFT_PALM", "LEFT_THUMB", "LEFT_INDEX", "LEFT_MIDDLE", "LEFT_RING", "LEFT_LITTLE");
      else if (direct === "RIGHT_HAND_SET") out.push("RIGHT_WRIST", "RIGHT_PALM", "RIGHT_THUMB", "RIGHT_INDEX", "RIGHT_MIDDLE", "RIGHT_RING", "RIGHT_LITTLE");
      else if (direct === "LEFT_LEG_SET") out.push("LEFT_HIP", "LEFT_THIGH", "LEFT_KNEE", "LEFT_SHIN", "LEFT_CALF", "LEFT_ANKLE", "LEFT_FOOT");
      else if (direct === "RIGHT_LEG_SET") out.push("RIGHT_HIP", "RIGHT_THIGH", "RIGHT_KNEE", "RIGHT_SHIN", "RIGHT_CALF", "RIGHT_ANKLE", "RIGHT_FOOT");
      else if (direct && slotsById.has(direct)) out.push(direct);
      else if (["DERMAL", "SKELETAL"].includes(direct)) blockers.push("CYBERWARE_SYSTEMIC_COVERAGE_UNDEFINED");
      else if (direct === "SYSTEMIC_LAYERS" || !direct) blockers.push("CYBERWARE_BODY_FOOTPRINT_UNRESOLVED");
      else out.push(direct);
    });
    return { bodySlots: unique(out), blockers: unique(blockers) };
  }

  function inferTaxonomy(definition = {}, bodySlots = []) {
    const text = `${definition.subtype || ""} ${definition.type || ""} ${definition.domain || ""} ${(definition.tags || []).join(" ")} ${definition.name || ""}`.toUpperCase();
    let family = "INTERNAL", subtype = "CHEST_AUXILIARY";
    if (/NEUROCHIP|NEURAL CORE/.test(text)) [family, subtype] = ["CORE", "NEUROCHIP"];
    else if (/INTERFACE|BODY BUS/.test(text)) [family, subtype] = ["CORE", "INTERFACE"];
    else if (/SERVICE PORT|SERVICE JACK|PORT RDZENIOWY/.test(text)) [family, subtype] = ["CORE", "SERVICE_PORT"];
    else if (/OCULAR|EYE|VISION|OPTIC/.test(text)) [family, subtype] = ["SENSORY", "OCULAR"];
    else if (/AUDIO|AUDITORY|EAR|HEARING/.test(text)) [family, subtype] = ["SENSORY", "AUDITORY"];
    else if (/RESPIRATORY|LUNG/.test(text)) [family, subtype] = ["ORGAN", "RESPIRATORY"];
    else if (/CARDIAC|HEART/.test(text)) [family, subtype] = ["ORGAN", "CARDIAC"];
    else if (/LIVER|HEPATIC/.test(text)) [family, subtype] = ["ORGAN", "HEPATIC"];
    else if (/KIDNEY|RENAL/.test(text)) [family, subtype] = ["ORGAN", "RENAL"];
    else if (/STOMACH|DIGEST/.test(text)) [family, subtype] = ["ORGAN", "DIGESTIVE"];
    else if (/HAND|PALM|FINGER|THUMB/.test(text)) [family, subtype] = ["LIMB", "HAND"];
    else if (/ARM|FOREARM|SHOULDER/.test(text)) [family, subtype] = ["LIMB", "ARM"];
    else if (/FOOT/.test(text)) [family, subtype] = ["LIMB", "FOOT"];
    else if (/LEG|THIGH|KNEE|SHIN|CALF/.test(text)) [family, subtype] = ["LIMB", "LEG"];
    else if (/SPINE|SPINAL/.test(text)) [family, subtype] = ["STRUCTURAL", "SPINAL"];
    else if (/DERMAL|SKIN/.test(text)) [family, subtype] = ["SYSTEMIC_LAYER", "DERMAL"];
    else if (/SKELETAL|BONE/.test(text)) [family, subtype] = ["SYSTEMIC_LAYER", "SKELETAL"];
    else if (/JAW/.test(text)) [family, subtype] = ["CRANIOFACIAL", "JAW"];
    return { family, subtype, capabilities: unique(definition.capabilities || []) };
  }

  function migrateDefinition(definition = {}) {
    const footprint = inferFootprint(definition);
    const taxonomyValue = inferTaxonomy(definition, footprint.bodySlots);
    const systemicLayer = taxonomyValue.family === "SYSTEMIC_LAYER" ? taxonomyValue.subtype : "";
    const slotGroupId = footprint.bodySlots.every((slot) => ["LEFT_EAR", "RIGHT_EAR"].includes(slot)) ? "EARS"
      : footprint.bodySlots.every((slot) => ["LEFT_LUNG", "RIGHT_LUNG"].includes(slot)) ? "LUNGS"
      : footprint.bodySlots.every((slot) => ["LEFT_KIDNEY", "RIGHT_KIDNEY"].includes(slot)) ? "KIDNEYS" : "";
    const regionId = footprint.bodySlots.length ? (slotsById.get(footprint.bodySlots[0])?.regionId || "BODY") : (systemicLayer ? "SYSTEMIC_LAYERS" : "");
    const installation = {
      anatomySchemaVersion: 2,
      mode: systemicLayer ? "COVERAGE" : (footprint.bodySlots.length > 1 ? "MULTI_PART" : "SINGLE"),
      regionId,
      slotGroupId,
      bodySlots: footprint.bodySlots,
      systemicLayer,
      coverageRegions: unique(definition.coverageRegions || (systemicLayer ? [] : [])),
      taxonomyBlockers: unique(footprint.blockers)
    };
    definition.taxonomy = { ...(definition.taxonomy || {}), ...taxonomyValue };
    definition.installation = installation;
    definition.bodySlots = [...installation.bodySlots];
    definition.slots = [...installation.bodySlots];
    definition.primarySlot = installation.bodySlots[0] || "";
    definition.anatomySchemaVersion = 2;
    if (installation.taxonomyBlockers.length) definition.taxonomyReview = { required: true, codes: [...installation.taxonomyBlockers] };
    return definition;
  }

  function migrateCatalogs() {
    const collections = [
      window.APP_DATA?.bodyCyberware,
      window.APP_DATA?.bodyCyberwareCatalog?.bodyCyberware,
      window.APP_DATA?.equipmentCatalog,
      window.APP_DATA?.servicePortCatalog,
      window.APP_DATA?.neurochipCatalog,
      window.APP_DATA?.interfaceCatalog
    ].filter(Array.isArray);
    const seen = new Set();
    collections.forEach((collection) => collection.forEach((definition) => {
      if (!definition || seen.has(definition)) return;
      seen.add(definition);
      migrateDefinition(definition);
    }));
    return { migratedDefinitions: seen.size };
  }

  const api = Object.freeze({ schemaVersion: 2, slotDefinitions, slotGroups, purposes, legacyAliasMap, inferFootprint, migrateDefinition, migrateCatalogs });
  app.cyberwareTaxonomyMigration = api;
  app.migrateCyberwareTaxonomyCatalogs = migrateCatalogs;
  migrateCatalogs();
})();
