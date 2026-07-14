window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.caseFiles = [
  {
    id: "case-haven-signal-deviation",
    caseNumber: "CF-2109-0001",
    title: "HAVEN Signal Deviation",
    type: "NETWORK INCIDENT",
    status: "OPEN",
    priority: "BLACK",
    clearance: "GM",
    summary: "Local Watch & Secure cache detected a malformed TRACE echo near a HAVEN-filtered address segment.",
    publicText: "Public layer unavailable. Incident classified as routine synchronization hygiene.",
    restrictedText: "TRACE pattern contains repeated session residue consistent with failed spoofing or external echo contamination.",
    gmText: "The signal can be tied to an unauthorized Kagami-style gate reflection. Use as a hook for HAVEN / Blackwall / Kagami escalation.",
    relatedCitizens: ["citizen-b"],
    relatedCitizenFileIds: [],
    relatedAddresses: ["03.51N00E.002.109::A4.001.001"],
    relatedEntries: ["HAVEN", "BLACKWALL", "KAGAMI KAISHA"],
    tags: ["HAVEN", "TRACE", "GM LAYER"],
    timeline: [
      {
        at: "2109-01-01 21:37",
        title: "TRACE ECHO CAPTURED",
        body: "Session token K7X9Q2 returned with delayed packet signature F91A."
      },
      {
        at: "2109-01-02 00:12",
        title: "LOCAL CACHE SEALED",
        body: "Incident packet copied to isolated W&S node. SyncMin notification withheld in local campaign layer."
      }
    ],
    tasks: [
      { title: "Identify source address", status: "PENDING" },
      { title: "Interview technical profile linked to C12 workline", status: "OPEN" }
    ],
    archived: false,
    createdAt: "2109-01-02T00:12:00.000Z",
    updatedAt: "2109-01-02T00:12:00.000Z"
  },
  {
    id: "case-subscription-pressure-node",
    caseNumber: "CF-2109-0002",
    title: "Subscription Pressure Node",
    type: "CIVIL COMPLIANCE",
    status: "PENDING",
    priority: "NORMAL",
    clearance: "CIVIL",
    summary: "A local citizen profile shows partial subscription failure and cyberware service lapse.",
    publicText: "Billing instability may limit non-essential services until synchronization is restored.",
    restrictedText: "Overdue cyberware plan can be used as leverage for soft compliance and interview scheduling.",
    gmText: "Useful low-intensity pressure case. Escalate only if the player ignores billing, maintenance, or W&S contact.",
    relatedCitizens: ["citizen-b"],
    relatedCitizenFileIds: [],
    relatedAddresses: ["05.521.101.309::C12.044.018"],
    relatedEntries: ["LIVE & PREVAIL", "SUBSCRIPTIONS"],
    tags: ["SOFT WATCH", "SUBSCRIPTION", "CYBERWARE"],
    timeline: [
      {
        at: "2109-01-03 06:00",
        title: "PAYMENT STATUS FLAGGED",
        body: "BasicSight v2 service plan returned OVERDUE in local billing view."
      }
    ],
    tasks: [
      { title: "Confirm current payment status", status: "OPEN" }
    ],
    archived: false,
    createdAt: "2109-01-03T06:00:00.000Z",
    updatedAt: "2109-01-03T06:00:00.000Z"
  }
];
