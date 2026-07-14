window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.accessTags = [
  {
    id: "PUBLIC",
    label: "Public",
    type: "classification",
    rank: 10,
    includes: [],
    exclusiveWith: [],
    requiresExplicitAssignment: false,
    adminOnly: false,
    description: "Dostęp podstawowy. Każdy aktywny użytkownik posiada ten tag.",
    locked: true,
    archived: false
  },
  {
    id: "RESTRICTED",
    label: "Restricted",
    type: "classification",
    rank: 20,
    includes: ["PUBLIC"],
    exclusiveWith: [],
    requiresExplicitAssignment: false,
    adminOnly: false,
    description: "Pracownicy systemu i osoby z podstawowym dostępem służbowym.",
    locked: false,
    archived: false
  },
  {
    id: "CONFIDENTIAL",
    label: "Confidential",
    type: "classification",
    rank: 30,
    includes: ["PUBLIC", "RESTRICTED"],
    exclusiveWith: [],
    requiresExplicitAssignment: false,
    adminOnly: false,
    description: "Tajne akta i wpisy wymagające jawnego przydziału dostępu.",
    locked: false,
    archived: false
  },
  {
    id: "BLACK",
    label: "Black",
    type: "classification",
    rank: 40,
    includes: ["PUBLIC", "RESTRICTED", "CONFIDENTIAL"],
    exclusiveWith: [],
    requiresExplicitAssignment: false,
    adminOnly: false,
    description: "Akta zagrażające systemowi. Widoczne wyłącznie dla użytkowników z przydziałem BLACK albo admina.",
    locked: false,
    archived: false
  },
  {
    id: "GAME_MASTER",
    label: "Game Master",
    type: "system",
    rank: 100,
    includes: ["PUBLIC", "RESTRICTED", "CONFIDENTIAL", "BLACK"],
    exclusiveWith: [],
    requiresExplicitAssignment: true,
    adminOnly: true,
    description: "Warstwa tylko dla administratora / MG.",
    locked: true,
    archived: false
  },
  {
    id: "W&S",
    label: "Watch & Secure",
    type: "organization",
    rank: null,
    includes: [],
    exclusiveWith: [],
    requiresExplicitAssignment: true,
    adminOnly: false,
    description: "Dostęp pracownika lub kontraktora Watch & Secure.",
    locked: false,
    archived: false
  },
  {
    id: "TRAUMA",
    label: "TRAUMA Team",
    type: "organization",
    rank: null,
    includes: [],
    exclusiveWith: [],
    requiresExplicitAssignment: true,
    adminOnly: false,
    description: "Dostęp pracownika lub kontraktora TRAUMA Team.",
    locked: false,
    archived: false
  }
];
