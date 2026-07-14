window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.modules = [
  {
    id: "system",
    title: "System",
    description: "Mechanika gry: abilities, skills, rzuty, katalogi i suche zasady aplikacji.",
    status: "READY",
    column: "left",
    roles: ["admin", "citizen"]
  },
  {
    id: "system-index",
    title: "System Index",
    description: "Autoryzowany indeks Systemu: oficjalne pojęcia, hasła, doktryna i opisy instytucji.",
    status: "READY",
    column: "left",
    roles: ["admin", "citizen"]
  },


  {
    id: "terminal-hub",
    title: "Terminal",
    description: "Inbox, billing and system requests.",
    status: "READY",
    column: "left",
    roles: ["admin", "citizen"]
  },
  {
    id: "service",
    title: "Service",
    description: "Work assignments, income sources and civic or corporate service contracts.",
    status: "READY",
    column: "left",
    roles: ["admin", "citizen"]
  },
  {
    id: "equipment",
    title: "Equipment",
    description: "Preserved item data and future personal loadout module for the selected citizen.",
    status: "READY",
    column: "left",
    roles: ["admin", "citizen"]
  },
  {
    id: "housing",
    title: "Housing",
    description: "Housing ledger, assigned unit access, storage, item market and shipment tracking.",
    status: "READY",
    column: "left",
    roles: ["admin", "citizen"]
  },

  {
    id: "encyclopedia",
    title: "Encyclopedia",
    description: "Słowniczek gracza: ogólnie znane pojęcia świata, usług, statusów i modułów.",
    status: "READY",
    column: "left",
    roles: ["admin", "citizen"]
  },
  {
    id: "character-creator",
    title: "Character Creator",
    description: "Tworzenie i korekta draftu postaci przed zatwierdzeniem przez Admina.",
    status: "READY",
    column: "left",
    roles: ["admin", "citizen"]
  },
  {
    id: "application-status",
    title: "Application Status",
    description: "Status zgłoszenia postaci, uwagi Admina i dostęp do wymaganych poprawek.",
    status: "READY",
    column: "left",
    roles: ["citizen"]
  },
  {
    id: "database",
    title: "Database",
    description: "Hub lokalnych rekordów: profile obywateli, akta i sprawy.",
    status: "READY",
    column: "left",
    roles: ["admin", "citizen"]
  },

  {
    id: "citizen-database",
    title: "Citizen Database",
    description: "Indeks skróconych profili obywateli z przejściem do dossier i karty postaci.",
    status: "READY",
    column: "left",
    roles: ["admin", "citizen"]
  },
  {
    id: "gm-layer",
    title: "GM Layer",
    description: "Sekrety kampanii, prawdziwe wersje zdarzeń i ukryte notatki.",
    status: "BLACK",
    column: "left",
    roles: ["admin"]
  },



  {
    id: "access-control",
    title: "Access Control",
    description: "Panel użytkowników, haseł i tagów dostępu dla całego uniwersum.",
    status: "ADMIN",
    column: "right",
    roles: ["admin"]
  },

  {
    id: "tag-registry",
    title: "Tag Registry",
    description: "Edytowalny słownik tagów: typ, widoczność, waga ryzyka i notatki GM.",
    status: "READY",
    column: "right",
    roles: ["admin"]
  },
  {
    id: "address-core",
    title: "Address Core",
    description: "Generator i rejestr adresów: VISIBLE, TRACE, Citizen ID, Short ID i tokeny sesji.",
    status: "READY",
    column: "right",
    roles: ["admin"]
  },
  {
    id: "citizen-cards",
    title: "Citizen Cards",
    description: "Pełny rejestr kart postaci. Dostęp GM do wszystkich profili obywatelskich.",
    status: "READY",
    column: "right",
    roles: ["admin"]
  },
  {
    id: "citizen-card",
    title: "Citizen Card",
    description: "Pełna karta zalogowanego obywatela.",
    status: "READY",
    column: "right",
    roles: ["citizen"]
  },
  {
    id: "citizen-files",
    title: "Citizen Files",
    description: "Akta przypisane do profili obywateli, grupowane według klasy biologicznej.",
    status: "READY",
    column: "right",
    roles: ["admin", "citizen"]
  },
  {
    id: "case-files",
    title: "Case Files",
    description: "Lokalny rejestr spraw, incydentów, relacji, śladów, timeline i zadań.",
    status: "READY",
    column: "right",
    roles: ["admin", "citizen"]
  },
  {
    id: "subscriptions",
    title: "Subscriptions",
    description: "Panel usług postaci: zakup, płatności, pakiety i statusy subskrypcji.",
    status: "READY",
    column: "right",
    roles: ["admin", "citizen"]
  }
];
