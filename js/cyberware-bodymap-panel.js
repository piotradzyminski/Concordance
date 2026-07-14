(function initCyberwareBodymap() {
  window.WS_APP = window.WS_APP || {};
  const runtime = window.WS_APP.cyberwareRuntime = window.WS_APP.cyberwareRuntime || {};
  const normalizeCyberwareEntry = (...args) => runtime.normalizeCyberwareEntry(...args);
  const normalizeCyberwareScaleKey = (...args) => runtime.normalizeCyberwareScaleKey(...args);
  const normalizeToken = (...args) => runtime.normalizeToken(...args);
  const uniqueValues = (...args) => runtime.uniqueValues(...args);
  const CYBERWARE_DESCENDANT_POLICIES = runtime.CYBERWARE_DESCENDANT_POLICIES;
  const CYBERWARE_SLOT_CHILDREN_BY_KEY = runtime.CYBERWARE_SLOT_CHILDREN_BY_KEY;
  const CYBERWARE_SLOT_DEFINITIONS = runtime.CYBERWARE_SLOT_DEFINITIONS;
  const CYBERWARE_SLOT_GROUP_DEFINITIONS = runtime.CYBERWARE_SLOT_GROUP_DEFINITIONS;
  const CYBERWARE_SLOT_LEVELS = runtime.CYBERWARE_SLOT_LEVELS;
  const CYBERWARE_SLOT_PARENT_BY_KEY = runtime.CYBERWARE_SLOT_PARENT_BY_KEY;
  const CYBERWARE_SLOT_PURPOSE_DEFINITIONS = runtime.CYBERWARE_SLOT_PURPOSE_DEFINITIONS;
  const HAND_FINGERS = runtime.HAND_FINGERS;
  const SLOT_ALIASES = runtime.SLOT_ALIASES;
  const SLOT_DISPLAY_GROUP_BY_KEY = runtime.SLOT_DISPLAY_GROUP_BY_KEY;
  const SLOT_PURPOSE_BY_KEY = runtime.SLOT_PURPOSE_BY_KEY;

  function normalizeCyberwareSlotKey(value = "") {
    const token = normalizeToken(value);
    return token ? SLOT_ALIASES.get(token) || "" : "";
  }

  function getCyberwareSlotDefinition(slotKey = "") {
    const normalized = normalizeCyberwareSlotKey(slotKey);
    return CYBERWARE_SLOT_DEFINITIONS.find((slot) => slot.key === normalized) || null;
  }

  function getCyberwareSlotLabel(slotKey = "") {
    return getCyberwareSlotDefinition(slotKey)?.label || "UNASSIGNED";
  }

  function getCyberwareSlotsLabel(slots = []) {
    const normalized = normalizeCyberwareSlotList(slots);
    return normalized.length ? normalized.map(getCyberwareSlotLabel).join(" + ") : "UNASSIGNED";
  }

  function inferCyberwareSlot(value = "") {
    return inferCyberwareSlots(value)[0] || "";
  }

  function getCyberwareSlotGroup(slotKey = "") {
    return getCyberwareSlotDefinition(slotKey)?.group || "UNASSIGNED";
  }

  function getCyberwareSlotSide(slotKey = "") {
    return getCyberwareSlotDefinition(slotKey)?.side || "";
  }

  function getCyberwareSlotDisplayGroupDefinition(groupKey = "") {
    const normalized = String(groupKey || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    return CYBERWARE_SLOT_GROUP_DEFINITIONS.find((group) => group.key === normalized) || null;
  }

  function getCyberwareSlotDisplayGroupKey(slotKey = "") {
    const normalized = normalizeCyberwareSlotKey(slotKey);
    return normalized ? SLOT_DISPLAY_GROUP_BY_KEY.get(normalized) || "OTHER" : "OTHER";
  }

  function getCyberwareSlotDisplayGroupLabel(slotKey = "") {
    const group = getCyberwareSlotDisplayGroupDefinition(getCyberwareSlotDisplayGroupKey(slotKey));
    return group?.label || getCyberwareSlotGroup(slotKey) || "Other";
  }

  function getCyberwareSlotPurposeDefinition(purposeKey = "") {
    const normalized = String(purposeKey || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    return CYBERWARE_SLOT_PURPOSE_DEFINITIONS.find((purpose) => purpose.key === normalized) || null;
  }

  function getCyberwareSlotPurposeKey(slotKey = "") {
    const normalized = normalizeCyberwareSlotKey(slotKey);
    return normalized ? SLOT_PURPOSE_BY_KEY.get(normalized) || "GENERAL" : "GENERAL";
  }

  function getCyberwareSlotPurposeLabel(slotKey = "") {
    const purpose = getCyberwareSlotPurposeDefinition(getCyberwareSlotPurposeKey(slotKey));
    return purpose?.label || getCyberwareSlotGroup(slotKey) || "General";
  }

  function normalizeCyberwareSlotLevel(value = "") {
    const normalized = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    return CYBERWARE_SLOT_LEVELS.includes(normalized) ? normalized : "";
  }

  function normalizeCyberwareDescendantPolicy(value = "", fallback = "LOCK_ALL") {
    const normalized = String(value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
    return CYBERWARE_DESCENDANT_POLICIES.includes(normalized) ? normalized : fallback;
  }

  function getCyberwareSlotLevel(slotKey = "") {
    const definition = getCyberwareSlotDefinition(slotKey);
    return normalizeCyberwareSlotLevel(definition?.slotLevel) || "SMALL";
  }

  function getCyberwareSlotChildren(slotKey = "") {
    const normalized = normalizeCyberwareSlotKey(slotKey);
    return normalized ? [...(CYBERWARE_SLOT_CHILDREN_BY_KEY.get(normalized) || [])] : [];
  }

  function getCyberwareSlotParent(slotKey = "") {
    const normalized = normalizeCyberwareSlotKey(slotKey);
    return normalized ? CYBERWARE_SLOT_PARENT_BY_KEY.get(normalized) || "" : "";
  }

  function getCyberwareSlotAncestors(slotKey = "") {
    const ancestors = [];
    let cursor = getCyberwareSlotParent(slotKey);
    const guard = new Set();
    while (cursor && !guard.has(cursor)) {
      guard.add(cursor);
      ancestors.push(cursor);
      cursor = getCyberwareSlotParent(cursor);
    }
    return ancestors;
  }

  function getCyberwareSlotDescendants(slotKey = "", includeSelf = false) {
    const normalized = normalizeCyberwareSlotKey(slotKey);
    if (!normalized) return [];
    const result = includeSelf ? [normalized] : [];
    const walk = (key) => {
      getCyberwareSlotChildren(key).forEach((childKey) => {
        result.push(childKey);
        walk(childKey);
      });
    };
    walk(normalized);
    return uniqueValues(result);
  }

  function isCyberwareSlotAncestor(ancestorSlot = "", descendantSlot = "") {
    const ancestor = normalizeCyberwareSlotKey(ancestorSlot);
    const descendant = normalizeCyberwareSlotKey(descendantSlot);
    return Boolean(ancestor && descendant && getCyberwareSlotAncestors(descendant).includes(ancestor));
  }

  function expandCyberwareSlotFootprint(slots = []) {
    const normalized = normalizeCyberwareSlotList(slots);
    return uniqueValues(normalized.flatMap((slotKey) => getCyberwareSlotDescendants(slotKey, true)));
  }

  function compressCyberwareSlotFootprint(slots = []) {
    const normalized = normalizeCyberwareSlotList(slots);
    return normalized.filter((slotKey) => !getCyberwareSlotAncestors(slotKey).some((ancestor) => normalized.includes(ancestor)));
  }

  function getCyberwareSlotHierarchyPath(slotKey = "") {
    const normalized = normalizeCyberwareSlotKey(slotKey);
    return normalized ? [...getCyberwareSlotAncestors(normalized)].reverse().concat(normalized) : [];
  }

  function getCyberwareSlotHierarchyLabel(slotKey = "") {
    const path = getCyberwareSlotHierarchyPath(slotKey);
    return path.length ? path.map(getCyberwareSlotLabel).join(" / ") : "UNASSIGNED";
  }

  function getCyberwareSlotDisplayLabel(slotKey = "") {
    const label = getCyberwareSlotLabel(slotKey);
    const purpose = getCyberwareSlotPurposeLabel(slotKey);
    return purpose && purpose !== label ? `${purpose} / ${label}` : label;
  }

  function summarizeCyberwareSlotLabels(slots = []) {
    const normalized = compressCyberwareSlotFootprint(slots);
    if (!normalized.length) return "UNASSIGNED";
    const byGroup = new Map();
    normalized.forEach((slotKey) => {
      const groupKey = getCyberwareSlotDisplayGroupKey(slotKey);
      const group = getCyberwareSlotDisplayGroupDefinition(groupKey);
      const entry = byGroup.get(groupKey) || {
        key: groupKey,
        label: group?.label || getCyberwareSlotGroup(slotKey) || "Other",
        labels: []
      };
      entry.labels.push(`${getCyberwareSlotLabel(slotKey)} [${getCyberwareSlotLevel(slotKey)}]`);
      byGroup.set(groupKey, entry);
    });
    return [...byGroup.values()].map((group) => {
      if (group.labels.length > 3) return `${group.label}: ${group.labels.slice(0, 2).join(" + ")} +${group.labels.length - 2}`;
      return `${group.label}: ${group.labels.join(" + ")}`;
    }).join(" / ");
  }

  function buildCyberwareSlotTreeNode(slot = {}, slotByKey = new Map(), depth = 0, displayGroup = {}) {
    const children = getCyberwareSlotChildren(slot.key)
      .map((childKey) => slotByKey.get(childKey))
      .filter(Boolean)
      .map((child) => buildCyberwareSlotTreeNode(child, slotByKey, depth + 1, displayGroup));
    const descendantKeys = getCyberwareSlotDescendants(slot.key, false).filter((slotKey) => slotByKey.has(slotKey));
    const subtreeKeys = [slot.key, ...descendantKeys];
    const subtreeSlots = subtreeKeys.map((slotKey) => slotByKey.get(slotKey)).filter(Boolean);
    const occupiedSlots = subtreeSlots.filter((entry) => entry.item || (Array.isArray(entry.items) && entry.items.length));
    const conflictSlots = subtreeSlots.filter((entry) => Array.isArray(entry.conflicts) && entry.conflicts.length);
    return {
      ...slot,
      level: getCyberwareSlotLevel(slot.key),
      slotLevel: getCyberwareSlotLevel(slot.key),
      depth,
      displayGroup: displayGroup.key || getCyberwareSlotDisplayGroupKey(slot.key),
      displayGroupLabel: displayGroup.label || getCyberwareSlotDisplayGroupLabel(slot.key),
      purpose: getCyberwareSlotPurposeKey(slot.key),
      purposeLabel: getCyberwareSlotPurposeLabel(slot.key),
      displayLabel: getCyberwareSlotDisplayLabel(slot.key),
      hierarchyLabel: getCyberwareSlotHierarchyLabel(slot.key),
      children,
      descendantKeys,
      subtreeKeys,
      subtreeSlotCount: subtreeSlots.length,
      occupiedCount: occupiedSlots.length,
      conflictCount: conflictSlots.length,
      occupiedSlots: occupiedSlots.map((entry) => entry.key),
      conflictSlots: conflictSlots.map((entry) => entry.key)
    };
  }

  function buildCyberwareSlotGroups(slots = []) {
    const slotByKey = new Map((Array.isArray(slots) ? slots : []).map((slot) => [slot.key, slot]));
    return CYBERWARE_SLOT_GROUP_DEFINITIONS.map((group) => {
      const groupSlots = group.slotKeys
        .map((slotKey) => slotByKey.get(slotKey))
        .filter(Boolean)
        .map((slot) => ({
          ...slot,
          level: getCyberwareSlotLevel(slot.key),
          slotLevel: getCyberwareSlotLevel(slot.key),
          displayGroup: group.key,
          displayGroupLabel: group.label,
          purpose: getCyberwareSlotPurposeKey(slot.key),
          purposeLabel: getCyberwareSlotPurposeLabel(slot.key),
          displayLabel: getCyberwareSlotDisplayLabel(slot.key),
          hierarchyLabel: getCyberwareSlotHierarchyLabel(slot.key),
          children: getCyberwareSlotChildren(slot.key)
        }));
      const rootKeys = Array.isArray(group.rootSlotKeys) && group.rootSlotKeys.length
        ? group.rootSlotKeys
        : group.slotKeys.filter((slotKey) => !getCyberwareSlotParent(slotKey) || !group.slotKeys.includes(getCyberwareSlotParent(slotKey)));
      const treeSlots = rootKeys.map((slotKey) => slotByKey.get(slotKey)).filter(Boolean).map((slot) => buildCyberwareSlotTreeNode(slot, slotByKey, 0, group));
      const occupiedSlots = groupSlots.filter((slot) => slot.item || (Array.isArray(slot.items) && slot.items.length));
      const conflictSlots = groupSlots.filter((slot) => Array.isArray(slot.conflicts) && slot.conflicts.length);
      return {
        key: group.key,
        label: group.label,
        description: group.description,
        slots: groupSlots,
        treeSlots,
        rootSlotKeys: rootKeys,
        slotCount: groupSlots.length,
        occupiedCount: occupiedSlots.length,
        conflictCount: conflictSlots.length,
        emptyCount: Math.max(0, groupSlots.length - occupiedSlots.length),
        occupiedSlots: occupiedSlots.map((slot) => slot.key),
        conflictSlots: conflictSlots.map((slot) => slot.key)
      };
    }).filter((group) => group.slots.length || group.treeSlots.length);
  }

  function getHandFingerSlots(side = "left") {
    const prefix = String(side || "left").toLowerCase() === "right" ? "right" : "left";
    return HAND_FINGERS.map((suffix) => `${prefix}${suffix}`);
  }

  function getHandFootprint(side = "left") {
    const prefix = String(side || "left").toLowerCase() === "right" ? "right" : "left";
    return [`${prefix}HandCore`, `${prefix}Palm`, ...getHandFingerSlots(prefix)];
  }

  function getArmFootprint(side = "left") {
    const prefix = String(side || "left").toLowerCase() === "right" ? "right" : "left";
    return [`${prefix}ArmCore`, `${prefix}Shoulder`, `${prefix}Forearm`, ...getHandFootprint(prefix)];
  }

  function getLegFootprint(side = "left") {
    const prefix = String(side || "left").toLowerCase() === "right" ? "right" : "left";
    return [`${prefix}LegCore`, `${prefix}Thigh`, `${prefix}LowerLeg`, `${prefix}FootCore`];
  }

  function hasLeftHint(text = "") {
    return /\bleft\b|(?:^|\s|[-_])l(?:$|\s|[-_])|lewa|lewe|lewy/.test(text);
  }

  function hasRightHint(text = "") {
    return /\bright\b|(?:^|\s|[-_])r(?:$|\s|[-_])|prawa|prawe|prawy/.test(text);
  }

  function inferFingerSlots(text = "") {
    const side = hasRightHint(text) ? "right" : "left";
    const prefix = side === "right" ? "right" : "left";
    if (/thumb|kciuk/.test(text)) return [`${prefix}Thumb`];
    if (/index|wskazuj/.test(text)) return [`${prefix}IndexFinger`];
    if (/middle|srodk|środk/.test(text)) return [`${prefix}MiddleFinger`];
    if (/ring|serdecz/.test(text)) return [`${prefix}RingFinger`];
    if (/little|pinky|maly|mały/.test(text)) return [`${prefix}LittleFinger`];
    if (/finger|palec/.test(text)) return [`${prefix}IndexFinger`];
    return [];
  }

  function inferCyberwareSlots(value = "") {
    const text = String(value || "").toLowerCase();
    if (!text || text === "n/a" || text === "none") return [];

    if (/service port|service jack|diagnostic port|maintenance port|data port|port serwis|port rdzeni|\bjack\b|connector/.test(text)) return ["neckService"];
    if (/interface|backplane|body bus|motherboard|occipital/.test(text)) return ["interface"];
    if (/neuro|chip|brain|cognitive/.test(text)) return ["neural"];

    if (/both eyes|two eyes|eye pair|ocular suite|optic suite|visual suite|vision suite|komplet oczu|para oczu|obie oczy|\beyes\b|\boczy\b/.test(text)) return ["ocularSet"];
    if (/right eye|right vision|right optic|prawe oko/.test(text)) return ["rightEye"];
    if (/left eye|left vision|left optic|lewe oko/.test(text)) return ["leftEye"];
    if (/sight|eye|optic|ocular|vision|visual|camera|thermal|nightvision|lowlight|wzrok|oko/.test(text)) return [hasRightHint(text) ? "rightEye" : "leftEye"];

    if (/both ears|two ears|audio suite|auditory suite|hearing suite|komplet uszu|para uszu|obie uszy|\bears\b|\buszy\b/.test(text)) return ["audioSet"];
    if (/right ear|prawe ucho/.test(text)) return ["rightEar"];
    if (/left ear|lewe ucho/.test(text)) return ["leftEar"];
    if (/\baudio\b|\bear\b|\bhearing\b|\bauditory\b|\bbalance\b|\bsonar\b|\bucho\b/.test(text)) return [hasRightHint(text) ? "rightEar" : "leftEar"];

    const fingerSlots = inferFingerSlots(text);
    if (fingerSlots.length) return fingerSlots;

    if (/both arms|two arms|arms set|oba ramiona|dwa ramiona|obie rece|obie ręce/.test(text)) return ["armsSet"];
    if (/right shoulder|prawy bark|prawe ramie gorne|prawe ramię górne/.test(text)) return ["rightShoulder"];
    if (/left shoulder|lewy bark|lewe ramie gorne|lewe ramię górne/.test(text)) return ["leftShoulder"];
    if (/right forearm|right wrist|prawe przedramie|prawe przedramię|prawy nadgarstek/.test(text)) return ["rightForearm"];
    if (/left forearm|left wrist|lewe przedramie|lewe przedramię|lewy nadgarstek/.test(text)) return ["leftForearm"];
    if (/wrist blade|forearm blade|hidden blade|retractable blade|ostrze|nadgarstk|przedram/.test(text)) return [hasRightHint(text) ? "rightForearm" : "leftForearm"];
    if (/right arm|prawa reka|prawa ręka|prawe ramie|prawe ramię/.test(text)) return ["rightArmCore"];
    if (/left arm|lewa reka|lewa ręka|lewe ramie|lewe ramię/.test(text)) return ["leftArmCore"];

    if (/both hands|two hands|obie dlonie|obie dłonie|dwie dlonie|dwie dłonie/.test(text)) return ["leftHandCore", "rightHandCore"];
    if (/right palm|prawe srodrecze|prawe śródręcze/.test(text)) return ["rightPalm"];
    if (/left palm|lewe srodrecze|lewe śródręcze/.test(text)) return ["leftPalm"];
    if (/right hand|prawa dlon|prawa dłoń/.test(text)) return ["rightHandCore"];
    if (/left hand|lewa dlon|lewa dłoń/.test(text)) return ["leftHandCore"];

    if (/right foot|prawa stopa/.test(text)) return ["rightFootCore"];
    if (/left foot|lewa stopa/.test(text)) return ["leftFootCore"];
    if (/both legs|two legs|legs set|obie nogi|dwie nogi/.test(text)) return ["legsSet"];
    if (/right thigh|prawe udo/.test(text)) return ["rightThigh"];
    if (/left thigh|lewe udo/.test(text)) return ["leftThigh"];
    if (/right lower leg|right shin|right calf|prawa lydka|prawa łydka|prawa golen/.test(text)) return ["rightLowerLeg"];
    if (/left lower leg|left shin|left calf|lewa lydka|lewa łydka|lewa golen/.test(text)) return ["leftLowerLeg"];
    if (/right leg|prawa noga/.test(text)) return ["rightLegCore"];
    if (/left leg|lewa noga/.test(text)) return ["leftLegCore"];

    if (/palm|metacarpus|srodrecze|śródręcze/.test(text)) return [hasRightHint(text) ? "rightPalm" : "leftPalm"];
    if (/hand|dłoń|dlon|grip|haptic|manual|manipulation/.test(text)) return [hasRightHint(text) ? "rightHandCore" : "leftHandCore"];
    if (/shoulder|bark/.test(text)) return [hasRightHint(text) ? "rightShoulder" : "leftShoulder"];
    if (/forearm|wrist|przedramie|przedramię|nadgarstek/.test(text)) return [hasRightHint(text) ? "rightForearm" : "leftForearm"];
    if (/arm|ramie|ramię|reka|ręka|limb|prosthetic|lift|strength|industrial/.test(text)) return [hasRightHint(text) ? "rightArmCore" : "leftArmCore"];
    if (/leg|noga/.test(text)) return [hasRightHint(text) ? "rightLegCore" : "leftLegCore"];
    if (/foot|stopa/.test(text)) return [hasRightHint(text) ? "rightFootCore" : "leftFootCore"];

    if (/respir|lung|lungs|breath|oxygen|airflow|pluc|płuc/.test(text)) return ["respiratory"];
    if (/cardiac|heart|circulatory|blood|pulse|serce/.test(text)) return ["cardiac"];
    if (/liver|detox|metabolic|metabolism|watrob|wątrob/.test(text)) return ["liver"];
    if (/right kidney|prawa nerk/.test(text)) return ["rightKidney"];
    if (/left kidney|lewa nerk/.test(text)) return ["leftKidney"];
    if (/kidney|nerk/.test(text)) return ["leftKidney"];
    if (/dermal|skin|subdermal|armor|armour|protection|pancerz/.test(text)) return ["dermal"];
    if (/skelet|bone|frame|structure|reinforcement/.test(text)) return ["skeletal"];
    if (/spine|spinal|rdzeni|kr[eę]g/.test(text)) return ["spineCore"];
    if (/biometric|sensor|biochip|organ/.test(text)) return ["internal"];
    return [];
  }

  function normalizeCyberwareSlotList(value = [], fallback = []) {
    const source = Array.isArray(value)
      ? value
      : String(value || "").split(/[,+|;/\n]+/).map((item) => item.trim()).filter(Boolean);
    const normalized = source.map(normalizeCyberwareSlotKey).filter(Boolean);
    const fallbackList = Array.isArray(fallback) ? fallback.map(normalizeCyberwareSlotKey).filter(Boolean) : [normalizeCyberwareSlotKey(fallback)].filter(Boolean);
    return uniqueValues([...normalized, ...fallbackList]);
  }

  function expandCyberwareAnatomicalFootprint(source = {}, slots = []) {
    const rawSlots = [source.primarySlot, source.slot, source.bodySlot, source.cyberwareSlot, source.location, source.slots, source.occupiedSlots, source.slotKeys]
      .flatMap((value) => Array.isArray(value) ? value : String(value || "").split(/[,+|;/\n]+/))
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    const rawSlotText = rawSlots.join(" ").toLowerCase();
    const text = `${source.name || ""} ${source.title || ""} ${source.implant || ""} ${(source.tags || []).toString?.() || ""} ${rawSlotText}`.toLowerCase();
    const scale = normalizeCyberwareScaleKey(source.scale || source.size || source.cyberwareScale || source.implantScale) || "";
    let next = [...slots];
    const add = (items = []) => { next = uniqueValues([...next, ...items.map(normalizeCyberwareSlotKey).filter(Boolean)]); };
    const has = (slotKey) => next.includes(slotKey);

    if (has("leftEye") && /both eyes|two eyes|eye pair|ocular suite|optic suite|komplet oczu|para oczu|obie oczy|\beyes\b|\boczy\b/.test(text)) add(["rightEye"]);
    if (has("rightEye") && /both eyes|two eyes|eye pair|ocular suite|optic suite|komplet oczu|para oczu|obie oczy|\beyes\b|\boczy\b/.test(text)) add(["leftEye"]);
    if (has("leftEar") && /both ears|two ears|audio suite|auditory suite|komplet uszu|para uszu|obie uszy|\bears\b|\buszy\b/.test(text)) add(["rightEar"]);
    if (has("rightEar") && /both ears|two ears|audio suite|auditory suite|komplet uszu|para uszu|obie uszy|\bears\b|\buszy\b/.test(text)) add(["leftEar"]);

    if (has("leftArmCore") && (/leftarm|left arm|lewa reka|lewa ręka|lewe ramie|lewe ramię/.test(text) || ["LARGE", "FULL_SET"].includes(scale))) add(getArmFootprint("left"));
    if (has("rightArmCore") && (/rightarm|right arm|prawa reka|prawa ręka|prawe ramie|prawe ramię/.test(text) || ["LARGE", "FULL_SET"].includes(scale))) add(getArmFootprint("right"));
    if (has("leftHandCore") && (/lefthand|left hand|lewa dlon|lewa dłoń/.test(text) || ["MEDIUM", "LARGE", "FULL_SET"].includes(scale))) add(getHandFootprint("left"));
    if (has("rightHandCore") && (/righthand|right hand|prawa dlon|prawa dłoń/.test(text) || ["MEDIUM", "LARGE", "FULL_SET"].includes(scale))) add(getHandFootprint("right"));
    if (has("leftLegCore") && (/leftleg|left leg|lewa noga/.test(text) || ["LARGE", "FULL_SET"].includes(scale))) add(getLegFootprint("left"));
    if (has("rightLegCore") && (/rightleg|right leg|prawa noga/.test(text) || ["LARGE", "FULL_SET"].includes(scale))) add(getLegFootprint("right"));

    return expandCyberwareSlotFootprint(uniqueValues(next));
  }

  function getMirroredCyberwareSlotKey(slotKey = "") {
    const normalized = normalizeCyberwareSlotKey(slotKey);
    if (!normalized) return "";
    if (normalized.startsWith("left")) return normalizeCyberwareSlotKey(`right${normalized.slice(4)}`);
    if (normalized.startsWith("right")) return normalizeCyberwareSlotKey(`left${normalized.slice(5)}`);
    return "";
  }

  function mirrorCyberwareSlotsToSide(slots = [], side = "left") {
    const wantRight = String(side || "left").toLowerCase() === "right";
    return slots.map((slotKey) => {
      const normalized = normalizeCyberwareSlotKey(slotKey);
      if (!normalized) return "";
      if (wantRight && normalized.startsWith("left")) return normalizeCyberwareSlotKey(`right${normalized.slice(4)}`) || normalized;
      if (!wantRight && normalized.startsWith("right")) return normalizeCyberwareSlotKey(`left${normalized.slice(5)}`) || normalized;
      return normalized;
    }).filter(Boolean);
  }

  function resolveCyberwareCandidateSlotsForDrop(item = {}, slotKey = "") {
    const normalized = normalizeCyberwareEntry(item, 0);
    const target = normalizeCyberwareSlotKey(slotKey);
    if (!normalized) return [];
    if (!target) return [...normalized.slots];

    const targetFootprint = getCyberwareSlotDescendants(target, true);
    if (normalized.slots.includes(target) || targetFootprint.some((slot) => normalized.slots.includes(slot))) {
      return [...normalized.slots];
    }

    const targetDefinition = getCyberwareSlotDefinition(target);
    const targetSide = targetDefinition?.side || "";
    const sourceSides = uniqueValues(normalized.slots.map(getCyberwareSlotSide).filter(Boolean));
    if (sourceSides.length === 1 && targetSide && sourceSides[0] !== targetSide) {
      const mirrored = expandCyberwareSlotFootprint(mirrorCyberwareSlotsToSide(compressCyberwareSlotFootprint(normalized.slots), targetSide.toLowerCase()));
      if (mirrored.includes(target) || getCyberwareSlotDescendants(target, true).some((slot) => mirrored.includes(slot))) return mirrored;
    }

    const compressed = compressCyberwareSlotFootprint(normalized.slots);
    const sourcePurposes = uniqueValues(compressed.map(getCyberwareSlotPurposeKey));
    const sourceLevels = uniqueValues(compressed.map(getCyberwareSlotLevel));
    const targetPurpose = getCyberwareSlotPurposeKey(target);
    const targetLevel = getCyberwareSlotLevel(target);
    if (normalized.scale === "SMALL" && compressed.length === 1 && sourcePurposes.includes(targetPurpose) && targetLevel === "SMALL") {
      return [target];
    }
    if (compressed.length === 1 && sourcePurposes.includes(targetPurpose) && sourceLevels.includes(targetLevel)) {
      return expandCyberwareSlotFootprint([target]);
    }

    return [...normalized.slots];
  }

  function normalizeCyberwareCompatibilityList(value = []) {
    const source = Array.isArray(value)
      ? value
      : String(value || "").split(/[,+|;/\n]+/).map((item) => item.trim()).filter(Boolean);
    return uniqueValues(source.map((item) => String(item || "").trim()).filter(Boolean));
  }

  Object.assign(runtime, {
    normalizeCyberwareSlotKey,
    getCyberwareSlotDefinition,
    getCyberwareSlotLabel,
    getCyberwareSlotsLabel,
    inferCyberwareSlot,
    getCyberwareSlotGroup,
    getCyberwareSlotSide,
    getCyberwareSlotDisplayGroupDefinition,
    getCyberwareSlotDisplayGroupKey,
    getCyberwareSlotDisplayGroupLabel,
    getCyberwareSlotPurposeDefinition,
    getCyberwareSlotPurposeKey,
    getCyberwareSlotPurposeLabel,
    normalizeCyberwareSlotLevel,
    normalizeCyberwareDescendantPolicy,
    getCyberwareSlotLevel,
    getCyberwareSlotChildren,
    getCyberwareSlotParent,
    getCyberwareSlotAncestors,
    getCyberwareSlotDescendants,
    isCyberwareSlotAncestor,
    expandCyberwareSlotFootprint,
    compressCyberwareSlotFootprint,
    getCyberwareSlotHierarchyPath,
    getCyberwareSlotHierarchyLabel,
    getCyberwareSlotDisplayLabel,
    summarizeCyberwareSlotLabels,
    buildCyberwareSlotTreeNode,
    buildCyberwareSlotGroups,
    getHandFingerSlots,
    getHandFootprint,
    getArmFootprint,
    getLegFootprint,
    hasLeftHint,
    hasRightHint,
    inferFingerSlots,
    inferCyberwareSlots,
    normalizeCyberwareSlotList,
    expandCyberwareAnatomicalFootprint,
    getMirroredCyberwareSlotKey,
    mirrorCyberwareSlotsToSide,
    resolveCyberwareCandidateSlotsForDrop,
    normalizeCyberwareCompatibilityList,
  });
})();
