window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.citizenTemplates = Object.freeze([
  {
    id: "template-balanced-citizen",
    label: "Balanced Citizen",
    summary: "General-purpose profile for a player character or background NPC.",
    allowedCharacterTypes: ["PLAYER", "NPC"],
    biologicalProfile: "GAMMA",
    classProfile: "GENERAL",
    abilities: {
      "ability-strength": 3,
      "ability-endurance": 3,
      "ability-reflex": 3,
      "ability-dexterity": 3,
      "ability-perception": 3,
      "ability-composure": 3,
      "ability-charisma": 3,
      "ability-intellect": 3
    },
    skills: [
      { skillId: "skill-administration", value: 2 },
      { skillId: "skill-field-repair", value: 2 },
      { skillId: "skill-social-pressure", value: 2 },
      { skillId: "skill-stealth", value: 2 }
    ]
  },
  {
    id: "template-technical-specialist",
    label: "Technical Specialist",
    summary: "Diagnostics, repair, schematics and cyberware service.",
    allowedCharacterTypes: ["PLAYER", "NPC"],
    biologicalProfile: "GAMMA",
    classProfile: "TECHNICAL",
    abilities: {
      "ability-strength": 2,
      "ability-endurance": 3,
      "ability-reflex": 3,
      "ability-dexterity": 4,
      "ability-perception": 3,
      "ability-composure": 3,
      "ability-charisma": 2,
      "ability-intellect": 5
    },
    skills: [
      { skillId: "skill-field-repair", value: 5 },
      { skillId: "skill-schematics", value: 5 },
      { skillId: "skill-cyberware-service", value: 4 },
      { skillId: "skill-analysis", value: 3 }
    ]
  },
  {
    id: "template-administrative-specialist",
    label: "Administrative Specialist",
    summary: "Records, analysis, procedure and controlled social pressure.",
    allowedCharacterTypes: ["PLAYER", "NPC"],
    biologicalProfile: "BETA",
    classProfile: "ADMINISTRATIVE",
    abilities: {
      "ability-strength": 1,
      "ability-endurance": 2,
      "ability-reflex": 2,
      "ability-dexterity": 3,
      "ability-perception": 4,
      "ability-composure": 5,
      "ability-charisma": 4,
      "ability-intellect": 5
    },
    skills: [
      { skillId: "skill-administration", value: 5 },
      { skillId: "skill-analysis", value: 5 },
      { skillId: "skill-social-pressure", value: 4 },
      { skillId: "skill-ws-protocols", value: 3 }
    ]
  },
  {
    id: "template-field-operative",
    label: "Field Operative",
    summary: "Mobile field work, observation, procedure and emergency response.",
    allowedCharacterTypes: ["PLAYER", "NPC"],
    biologicalProfile: "BETA",
    classProfile: "FIELD",
    abilities: {
      "ability-strength": 3,
      "ability-endurance": 4,
      "ability-reflex": 5,
      "ability-dexterity": 4,
      "ability-perception": 5,
      "ability-composure": 4,
      "ability-charisma": 2,
      "ability-intellect": 3
    },
    skills: [
      { skillId: "skill-ws-protocols", value: 5 },
      { skillId: "skill-stealth", value: 4 },
      { skillId: "skill-medical-aid", value: 3 },
      { skillId: "skill-analysis", value: 2 }
    ]
  },
  {
    id: "template-medical-specialist",
    label: "Medical Specialist",
    summary: "Stabilization, diagnostics and clinical cyberware support.",
    allowedCharacterTypes: ["PLAYER", "NPC"],
    biologicalProfile: "BETA",
    classProfile: "MEDICAL",
    abilities: {
      "ability-strength": 2,
      "ability-endurance": 4,
      "ability-reflex": 4,
      "ability-dexterity": 5,
      "ability-perception": 4,
      "ability-composure": 5,
      "ability-charisma": 3,
      "ability-intellect": 5
    },
    skills: [
      { skillId: "skill-medical-aid", value: 5 },
      { skillId: "skill-cyberware-service", value: 4 },
      { skillId: "skill-analysis", value: 4 },
      { skillId: "skill-administration", value: 2 }
    ]
  },
  {
    id: "template-netrunner",
    label: "Netrunner",
    summary: "Network protocols, analysis and controlled work near hostile systems.",
    allowedCharacterTypes: ["PLAYER", "NPC"],
    biologicalProfile: "BETA",
    classProfile: "NETWORK",
    abilities: {
      "ability-strength": 1,
      "ability-endurance": 3,
      "ability-reflex": 4,
      "ability-dexterity": 4,
      "ability-perception": 5,
      "ability-composure": 4,
      "ability-charisma": 2,
      "ability-intellect": 5
    },
    skills: [
      { skillId: "skill-net-protocols", value: 5 },
      { skillId: "skill-analysis", value: 5 },
      { skillId: "skill-schematics", value: 3 },
      { skillId: "skill-stealth", value: 2 }
    ]
  },
  {
    id: "template-gamma-worker",
    label: "Gamma Worker",
    summary: "Durable utility worker for fast NPC creation.",
    allowedCharacterTypes: ["NPC"],
    biologicalProfile: "GAMMA",
    classProfile: "LABOR",
    abilities: {
      "ability-strength": 4,
      "ability-endurance": 5,
      "ability-reflex": 2,
      "ability-dexterity": 3,
      "ability-perception": 2,
      "ability-composure": 3,
      "ability-charisma": 1,
      "ability-intellect": 2
    },
    skills: [
      { skillId: "skill-field-repair", value: 3 },
      { skillId: "skill-schematics", value: 2 }
    ]
  },
  {
    id: "template-unregistered-person",
    label: "Unregistered Person",
    summary: "Fast outside-system NPC with survival and concealment competence.",
    allowedCharacterTypes: ["NPC"],
    biologicalProfile: "UNCLASSIFIED",
    classProfile: "OUTSIDE_SYSTEM",
    abilities: {
      "ability-strength": 3,
      "ability-endurance": 4,
      "ability-reflex": 4,
      "ability-dexterity": 4,
      "ability-perception": 4,
      "ability-composure": 3,
      "ability-charisma": 2,
      "ability-intellect": 2
    },
    skills: [
      { skillId: "skill-stealth", value: 5 },
      { skillId: "skill-field-repair", value: 3 },
      { skillId: "skill-medical-aid", value: 2 }
    ]
  }
]);

window.APP_DATA.citizenCompetencePresets = Object.freeze([
  { id: "STANDARD", label: "Standard", abilityDelta: 0, skillDelta: 0 },
  { id: "EXPERT", label: "Expert", abilityDelta: 0, skillDelta: 1 },
  { id: "ELITE", label: "Elite", abilityDelta: 1, skillDelta: 2 }
]);
