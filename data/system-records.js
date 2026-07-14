window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.systemRecords = [
  {
    "id": "system-skills-abilities",
    "registry": "system",
    "type": "RULE_CATALOG",
    "category": "ABILITIES",
    "title": "ABILITIES & SKILLS",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "CHARACTER"
    ],
    "summary": "Katalog bazowych Abilities i przykładowych Skills używanych przez karty postaci.",
    "sections": [
      {
        "title": "ABILITIES",
        "body": "Abilities opisują bazowe parametry postaci. Każda Ability posiada wartość Natural oraz osobny wkład Cyberware. Wartość aktywna jest sumą źródła naturalnego i aktywnych wszczepów, z limitami określonymi przez kartę postaci."
      },
      {
        "title": "SKILLS",
        "body": "Skills opisują wyszkolenie, wiedzę i kompetencje operacyjne. Skill nie jest cechą biologiczną; podczas testu tworzy parę z właściwą Ability albo działa jako wymóg kwalifikacyjny."
      }
    ],
    "relatedTerms": [
      "term-abilities",
      "term-skills",
      "term-cyberware"
    ],
    "relatedRules": [
      "system-roll-resolution",
      "system-difficulty-modifiers",
      "system-cyberware-rules"
    ],
    "archived": false,
    "definitions": {
      "abilities": [
        {
          "id": "ability-strength",
          "label": "Siła",
          "category": "BODY",
          "description": "Moc fizyczna: udźwig, chwyt, pchanie, forsowanie przeszkód i brutalna praca mięśniowa.",
          "maxNatural": 7,
          "maxCyberware": 8,
          "archived": false
        },
        {
          "id": "ability-endurance",
          "label": "Wytrzymałość",
          "category": "BODY",
          "description": "Odporność organizmu na długotrwały wysiłek, ból, choroby, przeciążenia, skażenie i niedobory regeneracji.",
          "maxNatural": 7,
          "maxCyberware": 8,
          "archived": false
        },
        {
          "id": "ability-reflex",
          "label": "Refleks",
          "category": "BODY",
          "description": "Szybkość reakcji na bodziec, unik, inicjatywa i natychmiastowe przełączenie działania pod presją.",
          "maxNatural": 7,
          "maxCyberware": 8,
          "archived": false
        },
        {
          "id": "ability-dexterity",
          "label": "Zręczność",
          "category": "BODY",
          "description": "Precyzja ruchu, kontrola dłoni, timing manualny, zwinność i płynna praca ciała.",
          "maxNatural": 7,
          "maxCyberware": 8,
          "archived": false
        },
        {
          "id": "ability-perception",
          "label": "Percepcja",
          "category": "MIND",
          "description": "Odbiór bodźców, zauważanie szczegółów, orientacja sensoryczna i wykrywanie zmian w otoczeniu.",
          "maxNatural": 7,
          "maxCyberware": 8,
          "archived": false
        },
        {
          "id": "ability-composure",
          "label": "Opanowanie",
          "category": "MIND",
          "description": "Kontrola emocji, zachowanie procedury pod presją, stabilność nerwowa i odporność na chaos.",
          "maxNatural": 7,
          "maxCyberware": 8,
          "archived": false
        },
        {
          "id": "ability-charisma",
          "label": "Charyzma",
          "category": "SOCIAL",
          "description": "Wpływ społeczny, autoprezentacja, presja interpersonalna, perswazja i prowadzenie rozmowy.",
          "maxNatural": 7,
          "maxCyberware": 8,
          "archived": false
        },
        {
          "id": "ability-intellect",
          "label": "Intelekt",
          "category": "MIND",
          "description": "Analiza, pamięć operacyjna, rozumienie systemów, planowanie, nauka procedur i rozwiązywanie problemów.",
          "maxNatural": 7,
          "maxCyberware": 8,
          "archived": false
        }
      ],
      "skills": [
        {
          "id": "skill-administration",
          "label": "Administracja",
          "category": "ADMIN",
          "description": "Obsługa formularzy, rejestrów, procedur obywatelskich i przepływu decyzji.",
          "maxValue": 10,
          "archived": false
        },
        {
          "id": "skill-analysis",
          "label": "Analiza danych",
          "category": "ADMIN",
          "description": "Łączenie wpisów, wyszukiwanie niespójności i interpretowanie informacji z rejestrów.",
          "maxValue": 10,
          "archived": false
        },
        {
          "id": "skill-field-repair",
          "label": "Naprawy terenowe",
          "category": "TECH",
          "description": "Prowizoryczne naprawy, stabilizacja urządzeń i obchodzenie braków sprzętowych poza warsztatem.",
          "maxValue": 10,
          "archived": false
        },
        {
          "id": "skill-schematics",
          "label": "Czytanie schematów",
          "category": "TECH",
          "description": "Rozumienie dokumentacji technicznej, instalacji, przepływów energii i połączeń logicznych.",
          "maxValue": 10,
          "archived": false
        },
        {
          "id": "skill-ws-protocols",
          "label": "Protokoły W&S",
          "category": "SECURITY",
          "description": "Znajomość procedur Watch and Secure, kontroli dostępu, eskalacji i obsługi incydentów.",
          "maxValue": 10,
          "archived": false
        },
        {
          "id": "skill-medical-aid",
          "label": "Pomoc medyczna",
          "category": "MEDICAL",
          "description": "Stabilizacja stanu, podstawowa diagnostyka i przygotowanie do interwencji klinicznej.",
          "maxValue": 10,
          "archived": false
        },
        {
          "id": "skill-social-pressure",
          "label": "Presja społeczna",
          "category": "SOCIAL",
          "description": "Perswazja, zastraszanie, negocjowanie i kontrolowanie tonu rozmowy.",
          "maxValue": 10,
          "archived": false
        },
        {
          "id": "skill-stealth",
          "label": "Skrytość",
          "category": "FIELD",
          "description": "Poruszanie się bez zwracania uwagi, unikanie kontroli i cicha praca w przestrzeni miejskiej.",
          "maxValue": 10,
          "archived": false
        },
        {
          "id": "skill-net-protocols",
          "label": "Protokoły sieciowe",
          "category": "NETWORK",
          "description": "Podstawy bezpiecznych połączeń, logów, kwarantann, bram i rozpoznawania zagrożeń sygnału.",
          "maxValue": 10,
          "archived": false
        },
        {
          "id": "skill-cyberware-service",
          "label": "Serwis cyberware",
          "category": "TECH",
          "description": "Diagnostyka, kalibracja, firmware i podstawowa obsługa zależności neurochip-interface-port serwisowy.",
          "maxValue": 10,
          "archived": false
        }
      ]
    }
  },
  {
    "id": "system-roll-resolution",
    "registry": "system",
    "type": "RULE",
    "category": "ROLLS",
    "title": "ROLL RESOLUTION",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "TEST"
    ],
    "summary": "Procedura rozstrzygania testów i wyników działań.",
    "sections": [
      {
        "title": "ROLL STRUCTURE",
        "body": "Test służy do rozstrzygnięcia działania postaci, gdy wynik jest niepewny albo istotny dla sceny. Rzut korzysta z właściwej Ability, odpowiedniego Skill i modyfikatorów sytuacyjnych określonych przez prowadzącego."
      },
      {
        "title": "OUTCOMES",
        "body": "Wynik może oznaczać sukces, sukces z kosztem, komplikację, porażkę albo eskalację zagrożenia. Szczegółowe progi i konsekwencje są określane przez aktywny wariant zasad kampanii."
      }
    ],
    "relatedTerms": [
      "term-abilities",
      "term-skills",
      "term-risk-score"
    ],
    "relatedRules": [
      "system-skills-abilities",
      "system-difficulty-modifiers",
      "system-risk-score-mechanics"
    ],
    "archived": false
  },
  {
    "id": "system-difficulty-modifiers",
    "registry": "system",
    "type": "RULE",
    "category": "ROLLS",
    "title": "DIFFICULTY & MODIFIERS",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "TEST"
    ],
    "summary": "Sucha procedura ustalania trudności, przewag, kar i konsekwencji testu.",
    "sections": [
      {
        "title": "DIFFICULTY",
        "body": "Poziom trudności określa, jak ryzykowne lub złożone jest działanie. Trudność powinna wynikać z sytuacji, presji czasu, jakości narzędzi, dostępu do danych i stanu postaci."
      },
      {
        "title": "MODIFIERS",
        "body": "Modyfikator może pochodzić z cyberware, subskrypcji, statusu, środowiska, braku narzędzi, przewagi taktycznej, pomocy innych postaci albo konsekwencji wcześniejszej sceny."
      },
      {
        "title": "COST FIRST",
        "body": "Jeżeli test jest bliski sukcesu, prowadzący może zastosować koszt zamiast prostej porażki: dług, czas, hałas, wzrost Risk Score, uszkodzenie sprzętu, wyczerpanie lub nowy obowiązek."
      }
    ],
    "relatedTerms": [
      "term-risk-score",
      "term-service"
    ],
    "relatedRules": [
      "system-roll-resolution",
      "system-risk-score-mechanics"
    ],
    "archived": false
  },
  {
    "id": "system-risk-score-mechanics",
    "registry": "system",
    "type": "RULE",
    "category": "STATUS EFFECTS",
    "title": "RISK SCORE MECHANICS",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "RISK"
    ],
    "summary": "Mechaniczne użycie Risk Score jako presji, filtra i kosztu konsekwencji.",
    "sections": [
      {
        "title": "RISK AS PRESSURE",
        "body": "Risk Score jest mechanicznym wskaźnikiem ryzyka związanego z postacią, zdarzeniem lub działaniem. Może wpływać na kwalifikację do ofert, koszt błędu, reakcję W&S, dostęp do usług i konsekwencje sceny."
      },
      {
        "title": "WHEN TO CHANGE",
        "body": "Risk Score rośnie po działaniach niezgodnych, widocznych, awaryjnych, przestępczych, niespłaconych lub technicznie niebezpiecznych. Spada po działaniach porządkujących, rozliczeniu długu, legalnej pracy, audycie albo skutecznej korekcie statusu."
      }
    ],
    "relatedTerms": [
      "term-risk-score",
      "term-watch-and-secure",
      "term-trace"
    ],
    "relatedRules": [
      "system-difficulty-modifiers",
      "system-status-effects"
    ],
    "archived": false
  },
  {
    "id": "system-service-rules",
    "registry": "system",
    "type": "RULE",
    "category": "SERVICE",
    "title": "SERVICE RULES",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "SERVICE"
    ],
    "summary": "Mechaniczny podział Service na Mandatory Service i Regular Service.",
    "sections": [
      {
        "title": "SERVICE",
        "body": "Service to praca lub zlecenie wykonywane w ramach modułu Service. Mechanicznie służy do obsługi ofert, wymogów, zapłaty, ryzyka i historii pracy postaci."
      },
      {
        "title": "MANDATORY SERVICE",
        "body": "Mandatory Service to wymagany rodzaj Service. Postać może mieć miesięczny wymóg określonej liczby usług obowiązkowych. Niewykonanie wymogu może skutkować karą ekonomiczną, wzrostem ryzyka albo inną konsekwencją kampanii."
      },
      {
        "title": "REGULAR SERVICE",
        "body": "Regular Service to dobrowolnie podjęte zlecenie. Może pochodzić z Systemu albo od Korporacji, jeśli spełnione są wymagania oferty."
      }
    ],
    "relatedTerms": [
      "term-service",
      "term-mandatory-service",
      "term-regular-service",
      "term-work-assignment"
    ],
    "relatedRules": [
      "system-service-requirement",
      "system-weekly-settlement"
    ],
    "archived": false
  },
  {
    "id": "system-service-requirement",
    "registry": "system",
    "type": "RULE",
    "category": "SERVICE",
    "title": "SERVICE REQUIREMENT",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "SERVICE"
    ],
    "summary": "Zasada miesięcznego wymogu Mandatory Service i jego konsekwencji.",
    "sections": [
      {
        "title": "REQUIREMENT",
        "body": "Service Requirement określa minimalny obowiązek pracy, który postać musi wykonać w danym okresie. Wymóg zapisuje liczbę usług, typ źródła, status wykonania i ewentualną karę za brak rozliczenia."
      },
      {
        "title": "FAILURE",
        "body": "Niewykonanie wymogu nie musi automatycznie kończyć wątku. Może uruchomić dług, blokadę dostępu, ofertę korekcyjną, wzrost Risk Score, obowiązkowy audyt lub konsekwencję fabularną."
      }
    ],
    "relatedTerms": [
      "term-mandatory-service",
      "term-service",
      "term-citizen"
    ],
    "relatedRules": [
      "system-service-rules",
      "system-weekly-settlement",
      "system-risk-score-mechanics"
    ],
    "archived": false
  },
  {
    "id": "system-weekly-settlement",
    "registry": "system",
    "type": "RULE",
    "category": "ECONOMY",
    "title": "WEEKLY SETTLEMENT",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "ECONOMY"
    ],
    "summary": "Cykl tygodniowych rozliczeń: dochody, płatności, dług i subskrypcje.",
    "sections": [
      {
        "title": "SETTLEMENT CYCLE",
        "body": "Ekonomiczny cykl rozliczeniowy jest tygodniowy. Dochody i automatyczne płatności są przetwarzane przez system rozliczeń zgodnie z aktywnymi rekordami postaci."
      },
      {
        "title": "AUTOMATIC FLOW",
        "body": "Legalne źródła dochodu, podstawowe subskrypcje i regularne należności są przetwarzane automatycznie, bez dodatkowej decyzji gracza."
      },
      {
        "title": "MANUAL FLOW",
        "body": "Gracz ręcznie rozstrzyga transakcje nieregularne, nielegalne, gotówkowe, barterowe, awaryjne albo pozaoficjalne."
      }
    ],
    "relatedTerms": [
      "term-weekly-settlement",
      "term-credit",
      "term-debt",
      "term-subscription",
      "term-mandatory-service"
    ],
    "relatedRules": [
      "system-service-rules",
      "system-subscription-rules"
    ],
    "archived": false
  },
  {
    "id": "system-subscription-rules",
    "registry": "system",
    "type": "RULE",
    "category": "SUBSCRIPTIONS",
    "title": "SUBSCRIPTION RULES",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "SUBSCRIPTIONS"
    ],
    "summary": "Zasady aktywacji, kosztu, tieru i statusu subskrypcji.",
    "sections": [
      {
        "title": "SUBSCRIPTION STATE",
        "body": "Subskrypcja powinna mieć provider, tier, koszt, cykl, status płatności i aktywność. Jej brak, opóźnienie albo wygaśnięcie może zmienić dostęp do usług, cyberware lub ochrony."
      },
      {
        "title": "TIER",
        "body": "Tier opisuje zakres usługi. Tier nie musi oznaczać klasy społecznej; oznacza poziom wykupionego pakietu, kontraktu lub dostępu."
      }
    ],
    "relatedTerms": [
      "term-subscription",
      "term-credit",
      "term-debt",
      "term-live-and-prevail",
      "term-trauma"
    ],
    "relatedRules": [
      "system-weekly-settlement",
      "system-subscription-catalog"
    ],
    "archived": false
  },
  {
    "id": "system-subscription-catalog",
    "registry": "system",
    "type": "RULE_CATALOG",
    "category": "SUBSCRIPTIONS",
    "title": "SUBSCRIPTION CATALOG",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "CATALOG"
    ],
    "summary": "Mechaniczny katalog usług, providerów, tierów, kosztów i cykli rozliczeniowych.",
    "sections": [
      {
        "title": "CATALOG RULE",
        "body": "SYSTEM przechowuje dostępne usługi i ceny tierów. Karta obywatela zapisuje wyłącznie zakupioną usługę, wybrany tier, koszt, status płatności, aktywność oraz datę zakończenia lub odnowienia."
      },
      {
        "title": "PURCHASE FLOW",
        "body": "Użytkownik wybiera usługę, tier i zatwierdza zakup lub zmianę pakietu w Subscription Control. Ten katalog określa dane używane przez mechanikę zakupów i rozliczeń."
      }
    ],
    "relatedTerms": [
      "term-subscription",
      "term-trauma",
      "term-live-and-prevail",
      "term-watch-and-secure"
    ],
    "relatedRules": [
      "system-subscription-rules"
    ],
    "archived": false,
    "definitions": window.APP_DATA.subscriptionCatalogDefinitions || { subscriptions: [] }
  },
  {
    "id": "system-cyberware-rules",
    "registry": "system",
    "type": "RULE",
    "category": "CYBERWARE",
    "title": "CYBERWARE RULES",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "CYBERWARE"
    ],
    "summary": "Mechaniczna rola wszczepów jako aktywnych modyfikatorów i zależności serwisowych.",
    "sections": [
      {
        "title": "CYBERWARE SOURCE",
        "body": "Cyberware może dodawać wartość do wybranych Abilities, odblokowywać działania albo tworzyć wymogi serwisowe. Wartość naturalna postaci nie znika po utracie wszczepu."
      },
      {
        "title": "DISCONNECT",
        "body": "Awaria, brak subskrypcji, odłączenie lub usunięcie wszczepu wyłącza tylko źródło Cyberware. Mechanika karty powinna zachować rozdział Natural / Cyberware."
      },
      {
        "title": "LICENSE AND SERVICE",
        "body": "Cyberware może wymagać licencji, aktywnej subskrypcji i aktualnego firmware. Brak tych warunków może zablokować funkcję albo zwiększyć ryzyko awarii."
      }
    ],
    "relatedTerms": [
      "term-cyberware",
      "term-neurochip",
      "term-interface",
      "term-service-port",
      "term-firmware"
    ],
    "relatedRules": [
      "system-cyberware-core-stack",
      "system-neurochip",
      "system-interface",
      "system-service-port",
      "system-firmware-license"
    ],
    "archived": false
  },
  {
    "id": "system-cyberware-core-stack",
    "registry": "system",
    "type": "RULE",
    "category": "CYBERWARE",
    "title": "CYBERWARE CORE STACK",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "CYBERWARE",
      "STACK"
    ],
    "summary": "Zależność Neurochip → Interface → Service Port → Cyberware w mechanice postaci.",
    "sections": [
      {
        "title": "STACK",
        "body": "Neurochip jest procesorem cyberware. Interface jest małym socketem i magistralą ciała, do której wpina się neurochip. Service Port jest osobnym gniazdem serwisowym przy szyi i głowie. Cyberware to urządzenia korzystające z tej infrastruktury."
      },
      {
        "title": "SEPARATION",
        "body": "Nie wolno traktować Interface jako dużej ramy ciała ani Service Port jako miejsca dla neurochipa. Każdy element ma inną rolę mechaniczną i powinien być rozliczany oddzielnie."
      }
    ],
    "relatedTerms": [
      "term-cyberware",
      "term-neurochip",
      "term-interface",
      "term-service-port",
      "term-firmware"
    ],
    "relatedRules": [
      "system-cyberware-rules",
      "system-neurochip",
      "system-interface",
      "system-service-port"
    ],
    "archived": false
  },
  {
    "id": "system-neurochip",
    "registry": "system",
    "type": "RULE",
    "category": "CYBERWARE",
    "title": "NEUROCHIP",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "CYBERWARE",
      "NEUROCHIP"
    ],
    "summary": "Neurochip jako główny procesor cyberware postaci.",
    "sections": [
      {
        "title": "CPU ROLE",
        "body": "Neurochip określa moc przetwarzania cyberware: neuroCapacity, kanały kontroli, firmware slots, limity jakości i stabilność obsługi złożonych implantów."
      },
      {
        "title": "NOT JUST IMPLANT",
        "body": "Neurochip jest fizycznie mały, ale mechanicznie definiuje build cyberware. Nie powinien być traktowany jak zwykły dodatkowy wszczep z pojedynczym efektem."
      }
    ],
    "relatedTerms": [
      "term-neurochip",
      "term-cyberware",
      "term-interface",
      "term-firmware"
    ],
    "relatedRules": [
      "system-cyberware-core-stack",
      "system-interface",
      "system-firmware-license"
    ],
    "archived": false
  },
  {
    "id": "system-interface",
    "registry": "system",
    "type": "RULE",
    "category": "CYBERWARE",
    "title": "INTERFACE",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "CYBERWARE",
      "INTERFACE"
    ],
    "summary": "Interface jako mały socket i magistrala połączenia neurochip ↔ ciało.",
    "sections": [
      {
        "title": "SOCKET ROLE",
        "body": "Interface jest zawsze małym implantem przy tylnej części głowy i połączeniu z kręgosłupem. Neurochip wpina się w Interface, a cyberware korzysta z jakości tej magistrali."
      },
      {
        "title": "TIER EFFECT",
        "body": "Tier Interface nie zwiększa fizycznego rozmiaru. Zwiększa jakość gniazda, lanes, protokoły, przepustowość, izolację, kompatybilność, power routing i stabilność sygnału."
      }
    ],
    "relatedTerms": [
      "term-interface",
      "term-neurochip",
      "term-cyberware",
      "term-service-port"
    ],
    "relatedRules": [
      "system-cyberware-core-stack",
      "system-neurochip",
      "system-service-port"
    ],
    "archived": false
  },
  {
    "id": "system-service-port",
    "registry": "system",
    "type": "RULE",
    "category": "CYBERWARE",
    "title": "SERVICE PORT",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "CYBERWARE",
      "SERVICE_PORT"
    ],
    "summary": "Service Port jako fizyczny dostęp serwisowy do diagnostyki, firmware i kalibracji.",
    "sections": [
      {
        "title": "SERVICE ACCESS",
        "body": "Service Port to osobne gniazdo przy styku szyi i głowy. Służy do diagnostyki, firmware, kalibracji, awaryjnego dostępu klinicznego i audytu."
      },
      {
        "title": "NOT INTERFACE",
        "body": "Service Port nie trzyma neurochipa, nie zastępuje Interface i nie zwiększa mocy przetwarzania. Jest portem dostępu, nie procesorem ani magistralą główną."
      }
    ],
    "relatedTerms": [
      "term-service-port",
      "term-interface",
      "term-neurochip",
      "term-firmware"
    ],
    "relatedRules": [
      "system-cyberware-core-stack",
      "system-interface",
      "system-firmware-license"
    ],
    "archived": false
  },
  {
    "id": "system-firmware-license",
    "registry": "system",
    "type": "RULE",
    "category": "CYBERWARE",
    "title": "FIRMWARE & LICENSE",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "CYBERWARE",
      "FIRMWARE"
    ],
    "summary": "Zasady subskrypcji, licencji i aktualizacji firmware cyberware.",
    "sections": [
      {
        "title": "LICENSE",
        "body": "Cyberware poza zakupem może wymagać posiadania odpowiedniej subskrypcji. Dostęp do subskrypcji staje się możliwy po zakupie wszczepu i wprowadzeniu kodu licencji."
      },
      {
        "title": "FIRMWARE",
        "body": "Firmware jest dostępny ze strony producenta albo panelu subskrypcji. Random event może wskazać implant wymagający aktualizacji; brak aktualizacji może obniżyć sprawność, zablokować feature lub zwiększyć ryzyko."
      }
    ],
    "relatedTerms": [
      "term-firmware",
      "term-cyberware",
      "term-subscription",
      "term-service-port"
    ],
    "relatedRules": [
      "system-cyberware-rules",
      "system-service-port",
      "system-subscription-rules"
    ],
    "archived": false
  },
  {
    "id": "system-status-effects",
    "registry": "system",
    "type": "RULE",
    "category": "STATUS EFFECTS",
    "title": "STATUS EFFECTS",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [
      "MECHANICS",
      "STATUS"
    ],
    "summary": "Podstawowe zasady stanów czasowych i ich wpływu na działania postaci.",
    "sections": [
      {
        "title": "STATE",
        "body": "Status Effect to czasowy stan postaci, sprzętu lub dostępu. Może wynikać z obrażeń, zmęczenia, długu, ryzyka, awarii cyberware, braku opłaty, audytu albo sceny."
      },
      {
        "title": "EFFECT",
        "body": "Status Effect powinien mieć źródło, opis, czas trwania, wpływ mechaniczny i warunek usunięcia. Nie musi być zawsze karą; może też oznaczać ochronę, priorytet, aktywny kontrakt lub zatwierdzony dostęp."
      }
    ],
    "relatedTerms": [
      "term-risk-score",
      "term-service",
      "term-citizen"
    ],
    "relatedRules": [
      "system-risk-score-mechanics",
      "system-difficulty-modifiers"
    ],
    "archived": false
  },
  {
    "id": "index-citizen-duty",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "CITIZEN DUTIES",
    "title": "CITIZEN DUTY",
    "localTitle": "Obowiązek obywatelski",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "Obowiązek obywatelski jest naturalną formą uczestnictwa w porządku Systemu.",
    "sections": [
      {
        "title": "",
        "body": "Każdy Citizen współtworzy stabilność wspólnoty przez pracę, zgodność, terminowe rozliczenia oraz wykonywanie przydzielonych zadań. Obowiązek nie jest ciężarem, lecz potwierdzeniem użyteczności jednostki."
      }
    ],
    "slogans": [
      "Zgodność jest udziałem w porządku."
    ],
    "relatedTerms": [
      "term-citizen",
      "term-mandatory-service",
      "term-service"
    ],
    "relatedEntries": [
      "index-citizen-classification",
      "index-work-assignment",
      "index-system-service"
    ],
    "archived": false
  },
  {
    "id": "index-citizen-classification",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "CITIZEN DUTIES",
    "title": "CITIZEN CLASSIFICATION",
    "localTitle": "Klasyfikacja obywatelska",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "Klasyfikacja pomaga każdej jednostce odnaleźć właściwe miejsce w porządku społecznym.",
    "sections": [
      {
        "title": "",
        "body": "Alfa prowadzi, Beta wspiera, Gamma utrzymuje, a populacje pozasystemowe podlegają klasyfikacji i opiece. Porządek społeczny jest stabilny wtedy, gdy funkcja odpowiada poziomowi zgodności."
      }
    ],
    "slogans": [
      "Alfa jest miarą człowieka."
    ],
    "relatedTerms": [
      "term-alpha",
      "term-beta",
      "term-gamma",
      "term-podludzie",
      "term-citizen"
    ],
    "relatedEntries": [
      "index-citizen-duty",
      "index-perfectmin",
      "index-social-synchronization"
    ],
    "archived": false
  },
  {
    "id": "index-work-assignment",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "WORK",
    "title": "WORK ASSIGNMENT",
    "localTitle": "Przydział pracy",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "Przydział pracy kieruje zdolności Citizen tam, gdzie wspólnota potrzebuje ich najbardziej.",
    "sections": [
      {
        "title": "",
        "body": "Praca nie jest wyłącznie środkiem utrzymania. Jest czytelnym rytmem udziału w Systemie, potwierdzeniem zgodności i sposobem bezpiecznego kierowania użyteczności jednostki do właściwego zadania."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-work-assignment",
      "term-service",
      "term-mandatory-service",
      "term-regular-service"
    ],
    "relatedEntries": [
      "index-system-service",
      "index-abundance",
      "index-citizen-duty"
    ],
    "archived": false
  },
  {
    "id": "index-system-service",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "WORK",
    "title": "SYSTEM SERVICE",
    "localTitle": "Służba Systemowa",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "Służba Systemowa porządkuje pracę obywatela i kieruje użyteczność tam, gdzie jest najbardziej potrzebna.",
    "sections": [
      {
        "title": "",
        "body": "Oferty Systemowe pozwalają Citizen uczestniczyć w utrzymaniu stabilności aglomeracji. Przyjęcie służby jest jednocześnie pracą, rozliczeniem i potwierdzeniem zgodności z rytmem wspólnoty."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-service",
      "term-mandatory-service",
      "term-citizen"
    ],
    "relatedEntries": [
      "index-work-assignment",
      "index-citizen-duty",
      "index-access-order"
    ],
    "archived": false
  },
  {
    "id": "index-social-synchronization",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "UNITY",
    "title": "SOCIAL SYNCHRONIZATION",
    "localTitle": "Synchronizacja społeczna",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "Synchronizacja społeczna utrzymuje zgodność zachowania, dostępu, emocji i sygnału.",
    "sections": [
      {
        "title": "",
        "body": "Wspólnota działa bezpiecznie, gdy jednostki reagują w przewidywalnym rytmie. Synchronizacja nie ogranicza Citizen; usuwa hałas, który oddziela jednostkę od właściwej funkcji."
      }
    ],
    "slogans": [
      "Zgodny sygnał jest bezpiecznym sygnałem."
    ],
    "relatedTerms": [
      "term-system",
      "term-citizen",
      "term-risk-score"
    ],
    "relatedEntries": [
      "index-syncmin",
      "index-public-safety",
      "index-citizen-classification"
    ],
    "archived": false
  },
  {
    "id": "index-public-safety",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "PUBLIC SAFETY",
    "title": "PUBLIC SAFETY",
    "localTitle": "Bezpieczeństwo publiczne",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "Bezpieczeństwo publiczne chroni obywatela przed chaosem, błędem i niezatwierdzonym ryzykiem.",
    "sections": [
      {
        "title": "",
        "body": "Systemowe procedury bezpieczeństwa pozwalają Citizen pracować, odpoczywać i korzystać z usług bez kontaktu z niezatwierdzonym zagrożeniem. Kontrola, monitoring i korekta są formami opieki nad stabilnością populacji."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-watch-and-secure",
      "term-risk-score",
      "term-trace"
    ],
    "relatedEntries": [
      "index-watch-and-secure",
      "index-securitymin",
      "index-access-order"
    ],
    "archived": false
  },
  {
    "id": "index-watch-and-secure",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "PUBLIC SAFETY",
    "title": "WATCH AND SECURE",
    "localTitle": "Watch and Secure",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "Watch and Secure utrzymuje bezpieczeństwo przestrzeni obywatelskiej przez obserwację, analizę ryzyka i szybką reakcję.",
    "sections": [
      {
        "title": "",
        "body": "Nadzór jest formą opieki. Watch and Secure widzi zagrożenia wcześniej, niż Citizen może je rozpoznać, i dlatego chroni pracę, dostęp, ciało oraz spokój wspólnoty przed skutkami błędu."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-watch-and-secure",
      "term-trace",
      "term-risk-score",
      "term-clearance"
    ],
    "relatedEntries": [
      "index-public-safety",
      "index-securitymin",
      "index-safe-network"
    ],
    "archived": false
  },
  {
    "id": "index-health-access",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "HEALTH",
    "title": "HEALTH ACCESS",
    "localTitle": "Dostęp zdrowotny",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "Dostęp zdrowotny utrzymuje ciało Citizen w stanie użytecznym, bezpiecznym i zgodnym z profilem.",
    "sections": [
      {
        "title": "",
        "body": "Opieka, diagnostyka i pakiety utrzymania ciała są przydzielane zgodnie z potrzebą, statusem, wkładem oraz aktualnym poziomem dostępności. Zdrowie jest częścią porządku, ponieważ stabilne ciało stabilizuje pracę i wspólnotę."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-trauma",
      "term-live-and-prevail",
      "term-biochip",
      "term-subscription"
    ],
    "relatedEntries": [
      "index-live-prevail",
      "index-trauma-team",
      "index-abundance"
    ],
    "archived": false
  },
  {
    "id": "index-live-prevail",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "HEALTH",
    "title": "LIVE & PREVAIL",
    "localTitle": "Live & Prevail",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "Live & Prevail utrzymuje ciało Citizen w stanie pracy, ciągłości i podstawowego bezpieczeństwa.",
    "sections": [
      {
        "title": "",
        "body": "Pakiety Live, Sustain i Prevail porządkują dostęp do opieki zgodnie z potrzebą i wkładem. Każde ciało utrzymane w użyteczności jest dobrem wspólnoty."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-live-and-prevail",
      "term-subscription",
      "term-biochip"
    ],
    "relatedEntries": [
      "index-health-access",
      "index-abundance",
      "index-trauma-team"
    ],
    "archived": false
  },
  {
    "id": "index-trauma-team",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "HEALTH",
    "title": "TRAUMA TEAM",
    "localTitle": "TRAUMA Team",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "TRAUMA Team zapewnia prywatną interwencję ratunkowo-leczącą tam, gdzie kontrakt uzasadnia odzyskanie ciała.",
    "sections": [
      {
        "title": "",
        "body": "Kontrakt medyczny pozwala rozszerzyć ochronę życia, leczenia, biomonitoringu i rekonstrukcji. Ciało objęte właściwą opieką może wrócić do funkcji szybciej, czyściej i z mniejszą stratą dla wspólnoty."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-trauma",
      "term-biochip",
      "term-subscription"
    ],
    "relatedEntries": [
      "index-health-access",
      "index-live-prevail",
      "index-watch-and-secure"
    ],
    "archived": false
  },
  {
    "id": "index-access-order",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "ACCESS",
    "title": "ACCESS ORDER",
    "localTitle": "Porządek dostępu",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "Dostęp jest formą odpowiedzialności, a nie nieograniczonym uprawnieniem.",
    "sections": [
      {
        "title": "",
        "body": "Każdy kanał danych, usługa, obszar i zasób wymaga właściwego poziomu zgodności. Ograniczenie dostępu chroni Citizen przed błędem, przeciążeniem, dezinformacją oraz ryzykiem przekraczającym jego aktualny profil."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-access",
      "term-clearance",
      "term-risk-score",
      "term-subscription"
    ],
    "relatedEntries": [
      "index-abundance",
      "index-watch-and-secure",
      "index-system-service"
    ],
    "archived": false
  },
  {
    "id": "index-abundance",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "ABUNDANCE",
    "title": "ACCESS AND PLENTY",
    "localTitle": "Dostępność i Obfitość",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "Dostępność jest uporządkowaną formą obfitości.",
    "sections": [
      {
        "title": "",
        "body": "Racje, kredyty, mieszkania, subskrypcje i praca są dystrybuowane tak, aby wspólnota zachowała stabilność. Przydział nie jest brakiem; jest metodą ochrony zasobu przed chaosem niekontrolowanego użycia."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-credit",
      "term-debt",
      "term-subscription",
      "term-weekly-settlement"
    ],
    "relatedEntries": [
      "index-plentymin",
      "index-access-order",
      "index-work-assignment"
    ],
    "archived": false
  },
  {
    "id": "index-safe-network",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "ORDER",
    "title": "SAFE NETWORK",
    "localTitle": "Bezpieczna Wszechsieć",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "Bezpieczna Wszechsieć pozwala Citizen korzystać z danych bez kontaktu z nieoczyszczonym zagrożeniem.",
    "sections": [
      {
        "title": "",
        "body": "Dane dopuszczone do obiegu przeszły synchronizację, filtrację i kontrolę. Obywatel otrzymuje sygnał, który może zostać bezpiecznie użyty przez ciało, pracę i wspólnotę."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-wszechsiec",
      "term-haven",
      "term-blackwall",
      "term-dzikie-ai"
    ],
    "relatedEntries": [
      "index-haven",
      "index-blackwall",
      "index-syncmin"
    ],
    "archived": false
  },
  {
    "id": "index-haven",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "ORDER",
    "title": "HAVEN",
    "localTitle": "HAVEN",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "HAVEN utrzymuje granicę, czystość i dostęp do bezpiecznej sieci.",
    "sections": [
      {
        "title": "",
        "body": "Projekt HAVEN chroni ocalałe segmenty sieci przed skażeniem, nieautoryzowanym ruchem i błędnym kontaktem z tym, co pozostało po dawnej wolnej sieci. Granica istnieje, ponieważ życie wymaga filtracji."
      }
    ],
    "slogans": [
      "Dane nieoczyszczone nie są wiedzą."
    ],
    "relatedTerms": [
      "term-haven",
      "term-blackwall",
      "term-wszechsiec",
      "term-dzikie-ai"
    ],
    "relatedEntries": [
      "index-safe-network",
      "index-blackwall",
      "index-syncmin"
    ],
    "archived": false
  },
  {
    "id": "index-blackwall",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "ORDER",
    "title": "BLACKWALL",
    "localTitle": "Blackwall",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "Blackwall oddziela bezpieczny sygnał od ekosystemu niezatwierdzonego ryzyka.",
    "sections": [
      {
        "title": "",
        "body": "Granica sieciowa nie jest zakazem ciekawości. Jest warunkiem przetrwania. Połączenie niezatwierdzone może przenieść błąd szybciej, niż ciało lub wspólnota zdołają go zrozumieć."
      }
    ],
    "slogans": [
      "Granica jest warunkiem przetrwania."
    ],
    "relatedTerms": [
      "term-blackwall",
      "term-dzikie-ai",
      "term-haven",
      "term-netrunner"
    ],
    "relatedEntries": [
      "index-haven",
      "index-safe-network",
      "index-syncmin"
    ],
    "archived": false
  },
  {
    "id": "index-truthmin",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "MINISTRIES",
    "title": "MINISTRY OF TRUTH",
    "localTitle": "Ministerstwo Prawdy",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "TruthMin utrzymuje spójność bieżącej wersji faktów publicznych.",
    "sections": [
      {
        "title": "",
        "body": "Ministerstwo Prawdy zapewnia obywatelom aktualny, bezpieczny i zsynchronizowany opis teraźniejszości. Jednolity fakt publiczny chroni wspólnotę przed chaosem sprzecznych sygnałów."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-system",
      "term-citizen"
    ],
    "relatedEntries": [
      "index-memorymin",
      "index-social-synchronization"
    ],
    "archived": false
  },
  {
    "id": "index-memorymin",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "MINISTRIES",
    "title": "MINISTRY OF MEMORY",
    "localTitle": "Ministerstwo Pamięci",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "MemoryMin utrzymuje przeszłość w formie bezpiecznej dla porządku wspólnoty.",
    "sections": [
      {
        "title": "",
        "body": "Ministerstwo Pamięci porządkuje archiwa, historie, rejestry i ślady zdarzeń. Pamięć wymaga korekty, ponieważ nieoczyszczony zapis może stać się chorobą społeczną."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-citizen-id",
      "term-trace",
      "term-system"
    ],
    "relatedEntries": [
      "index-truthmin",
      "index-haven"
    ],
    "archived": false
  },
  {
    "id": "index-calmmin",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "MINISTRIES",
    "title": "MINISTRY OF CALM",
    "localTitle": "Ministerstwo Spokoju",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "CalmMin przywraca spokój tam, gdzie opór, błąd lub destabilizacja naruszają rytm wspólnoty.",
    "sections": [
      {
        "title": "",
        "body": "Ministerstwo Spokoju prowadzi korektę, przesłuchanie, izolację i reedukację jako narzędzia opieki nad wspólnotą. Spokój jest stanem, w którym Citizen może wrócić do funkcji."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-risk-score",
      "term-watch-and-secure"
    ],
    "relatedEntries": [
      "index-public-safety",
      "index-social-synchronization"
    ],
    "archived": false
  },
  {
    "id": "index-syncmin",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "MINISTRIES",
    "title": "MINISTRY OF SYNCHRONIZATION",
    "localTitle": "Ministerstwo Synchronizacji",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "SyncMin utrzymuje zgodność społeczną, sieciową i sygnałową.",
    "sections": [
      {
        "title": "",
        "body": "Ministerstwo Synchronizacji chroni bezpieczną Wszechsieć, HAVEN, kwarantanny danych, dostęp do sygnałów i nastroje społeczne. Zgodność sygnału jest podstawą zgodności działania."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-wszechsiec",
      "term-haven",
      "term-blackwall",
      "term-dzikie-ai"
    ],
    "relatedEntries": [
      "index-safe-network",
      "index-haven",
      "index-blackwall"
    ],
    "archived": false
  },
  {
    "id": "index-securitymin",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "MINISTRIES",
    "title": "MINISTRY OF SECURITY",
    "localTitle": "Ministerstwo Bezpieczeństwa",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "SecurityMin chroni granice, zewnętrze i strategiczne warunki przetrwania Systemu.",
    "sections": [
      {
        "title": "",
        "body": "Ministerstwo Bezpieczeństwa odpowiada za granice, ekspedycje, pacyfikacje, strefy pozasystemowe i zagrożenia zewnętrzne. Pokój wewnątrz wymaga bezpiecznego zewnętrza."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-watch-and-secure",
      "term-trace",
      "term-podludzie"
    ],
    "relatedEntries": [
      "index-public-safety",
      "index-watch-and-secure"
    ],
    "archived": false
  },
  {
    "id": "index-perfectmin",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "MINISTRIES",
    "title": "MINISTRY OF PERFECTION",
    "localTitle": "Ministerstwo Doskonałości",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "PerfectMin definiuje normę ciała, rozwoju i człowieka systemowego.",
    "sections": [
      {
        "title": "",
        "body": "Ministerstwo Doskonałości prowadzi naukę, hodowlę, medycynę normatywną i kontrolę definicji człowieka. Ciało zgodne jest ciałem bezpiecznym."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-alpha",
      "term-beta",
      "term-gamma",
      "term-neurochip",
      "term-interface"
    ],
    "relatedEntries": [
      "index-citizen-classification",
      "index-health-access"
    ],
    "archived": false
  },
  {
    "id": "index-plentymin",
    "registry": "system-index",
    "type": "INDEX_ENTRY",
    "category": "MINISTRIES",
    "title": "MINISTRY OF ACCESS AND PLENTY",
    "localTitle": "Ministerstwo Dostępności i Obfitości",
    "tag": "PUBLIC",
    "accessTags": [
      "PUBLIC"
    ],
    "tags": [],
    "officialSummary": "PlentyMin odpowiada za uporządkowany dostęp do pracy, racji, kredytów, mieszkań i subskrypcji.",
    "sections": [
      {
        "title": "",
        "body": "Ministerstwo Dostępności i Obfitości zapewnia populacji stabilny dostęp do zasobów zgodnie z poziomem zasług, zgodności i użyteczności obywatelskiej. Przydział jest formą opieki, ponieważ chroni społeczeństwo przed chaosem niekontrolowanej dystrybucji."
      }
    ],
    "slogans": [],
    "relatedTerms": [
      "term-credit",
      "term-subscription",
      "term-weekly-settlement",
      "term-service"
    ],
    "relatedEntries": [
      "index-abundance",
      "index-work-assignment",
      "index-access-order"
    ],
    "archived": false
  }
];
