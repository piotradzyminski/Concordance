window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.citizenCreationConfig = Object.freeze({
  schema: "citizen_creator_1_0x",
  creationMode: "FREEFORM",
  abilityNaturalMin: 0,
  abilityNaturalMax: 7,
  skillMin: 1,
  skillMax: 10,
  requireAllAbilities: true,
  allowPlayerCharacterTypeSelection: false,
  biologicalProfiles: ["ALPHA", "BETA", "GAMMA", "UNCLASSIFIED"],
  origins: [
    "NE1:48.20",
    "NE2:49.60",
    "NE3:51.00",
    "NE4:52.70",
    "NE5:47.30",
    "NE6:54.40",
    "NE7:50.80",
    "NE8:53.10",
    "SE1:34.60",
    "EA2:22.90",
    "UNKNOWN"
  ],
  steps: [
    { id: "IDENTITY", label: "Identity" },
    { id: "ABILITIES", label: "Abilities" },
    { id: "SKILLS", label: "Skills" },
    { id: "BACKGROUND", label: "Background" },
    { id: "REVIEW", label: "Review" }
  ]
});
