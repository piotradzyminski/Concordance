window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.users = [
  {
    id: "user-admin",
    login: "Admin",
    password: "admin",
    role: "admin",
    citizenId: "admin",
    displayName: "Admin",
    accessTags: ["PUBLIC", "RESTRICTED", "CONFIDENTIAL", "BLACK", "GAME_MASTER", "W&S", "TRAUMA"],
    locked: true
  },
  {
    id: "user-citizen-a",
    login: "Obywatel A",
    password: "alpha",
    role: "citizen",
    citizenId: "citizen-a",
    displayName: "Obywatel A",
    accessTags: ["PUBLIC", "RESTRICTED"]
  },
  {
    id: "user-citizen-b",
    login: "Obywatel B",
    password: "beta",
    role: "citizen",
    citizenId: "citizen-b",
    displayName: "Obywatel B",
    accessTags: ["PUBLIC"]
  }
];