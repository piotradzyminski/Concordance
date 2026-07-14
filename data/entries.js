window.APP_DATA = window.APP_DATA || {};

window.APP_DATA.entries = [
  {
    "id": "term-service",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SERVICE",
    "term": "Service",
    "localTerm": "Służba",
    "title": "Service / Służba",
    "aliases": [
      "Work Assignment",
      "Zlecenie"
    ],
    "shortDefinition": "Praca lub zlecenie wykonywane dla Systemu albo Korporacji.",
    "body": "Service to praca lub zlecenie wykonywane dla Systemu albo Korporacji. W aplikacji jest podstawowym rekordem pracy: ma źródło, wymagania, czas trwania, zapłatę, ryzyko i status. Service dzieli się na Mandatory Service i Regular Service.",
    "relatedTerms": [
      "term-mandatory-service",
      "term-regular-service",
      "term-citizen",
      "term-system",
      "term-corporation"
    ],
    "archived": false
  },
  {
    "id": "term-mandatory-service",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SERVICE",
    "term": "Mandatory Service",
    "localTerm": "Służba obowiązkowa",
    "title": "Mandatory Service / Służba obowiązkowa",
    "aliases": [
      "Mandatory",
      "Obowiązkowa służba",
      "System Service Requirement"
    ],
    "shortDefinition": "Rodzaj Service wymagany od Citizen w danym okresie rozliczeniowym.",
    "body": "Mandatory Service to Service, który Citizen musi odbyć w określonej liczbie lub zakresie. Pochodzi wyłącznie z ofert Systemowych i jest traktowany jako obowiązek, nie jako dobrowolna praca dodatkowa.",
    "relatedTerms": [
      "term-service",
      "term-regular-service",
      "term-citizen",
      "term-system",
      "term-weekly-settlement"
    ],
    "archived": false
  },
  {
    "id": "term-regular-service",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SERVICE",
    "term": "Regular Service",
    "localTerm": "Służba regularna",
    "title": "Regular Service / Służba regularna",
    "aliases": [
      "Regular",
      "Dobrowolna służba"
    ],
    "shortDefinition": "Rodzaj Service podejmowany dobrowolnie przez Citizen.",
    "body": "Regular Service to dobrowolnie podjęte zlecenie. Może pochodzić z Systemu albo od Korporacji, jeśli Citizen spełnia wymagania oferty i posiada wymagany dostęp, status lub kwalifikacje.",
    "relatedTerms": [
      "term-service",
      "term-mandatory-service",
      "term-corporation",
      "term-credit"
    ],
    "archived": false
  },
  {
    "id": "term-work-assignment",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SERVICE",
    "term": "Work Assignment",
    "localTerm": "Przydział pracy",
    "title": "Work Assignment / Przydział pracy",
    "aliases": [
      "Assignment",
      "Job Assignment"
    ],
    "shortDefinition": "Przydzielony lub dostępny zakres pracy powiązany z Service.",
    "body": "Work Assignment określa, jaka praca jest przypisana do Citizen, z jakiego źródła pochodzi, jakie ma wymagania oraz jak może wpłynąć na zapłatę, ryzyko i historię obowiązków. W praktyce jest czytelną warstwą nad rekordem Service.",
    "relatedTerms": [
      "term-service",
      "term-mandatory-service",
      "term-regular-service",
      "term-citizen"
    ],
    "archived": false
  },
  {
    "id": "term-citizen",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "PEOPLE",
    "term": "Citizen",
    "localTerm": "Obywatel",
    "title": "Citizen / Obywatel",
    "aliases": [
      "Obywatel",
      "Jednostka obywatelska"
    ],
    "shortDefinition": "Osoba wpisana do rejestru Systemu i obsługiwana przez jego usługi, obowiązki i poziomy dostępu.",
    "body": "Citizen to osoba wpisana do rejestru Systemu. Posiada identyfikację, status, historię rozliczeń, dostęp do usług oraz obowiązki wynikające z profilu, subskrypcji, pracy i ryzyka.",
    "relatedTerms": [
      "term-citizen-id",
      "term-system",
      "term-service",
      "term-access",
      "term-risk-score"
    ],
    "archived": false
  },
  {
    "id": "term-citizen-id",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "PEOPLE",
    "term": "Citizen ID",
    "localTerm": "ID obywatela",
    "title": "Citizen ID / ID obywatela",
    "aliases": [
      "System ID",
      "Identyfikator obywatelski"
    ],
    "shortDefinition": "Administracyjny identyfikator osoby w rejestrach Systemu.",
    "body": "Citizen ID zapisuje miejsce urodzenia, chunk urodzenia, datę urodzenia i losowy blok różnicujący. Przykładowy format to 03510.0A04.20800123.A91B88. Dla gracza jest to identyfikator postaci w rejestrach i UI.",
    "relatedTerms": [
      "term-citizen",
      "term-system",
      "term-address",
      "term-trace"
    ],
    "archived": false
  },
  {
    "id": "term-alpha",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "PEOPLE",
    "term": "Alpha",
    "localTerm": "Alfa",
    "title": "Alpha / Alfa",
    "aliases": [
      "Alfa",
      "Alpha class"
    ],
    "shortDefinition": "Najwyższy systemowy standard człowieka, hodowany i integrowany od urodzenia.",
    "body": "Alfa jest najwyższym wzorcem człowieka systemowego. W publicznym języku oznacza jednostkę projektowaną do kierowania, nauki, administracji, kultury i funkcji wysokiej zgodności. W grze termin opisuje status społeczny i technologiczny, nie prostą przewagę moralną.",
    "relatedTerms": [
      "term-beta",
      "term-gamma",
      "term-citizen",
      "term-system"
    ],
    "archived": false
  },
  {
    "id": "term-beta",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "PEOPLE",
    "term": "Beta",
    "localTerm": "Beta",
    "title": "Beta",
    "aliases": [
      "Beta class"
    ],
    "shortDefinition": "Niższa, niepełna odmiana hodowlana standardu Alfa.",
    "body": "Beta pochodzi z porządku hodowlanego Alf, ale nie spełnia pełnej normy Alfa. Nadal może być wysoko kompetentna i użyteczna, lecz publiczny język Systemu opisuje ją jako jednostkę niższej zgodności.",
    "relatedTerms": [
      "term-alpha",
      "term-gamma",
      "term-citizen",
      "term-system"
    ],
    "archived": false
  },
  {
    "id": "term-gamma",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "PEOPLE",
    "term": "Gamma",
    "localTerm": "Gamma",
    "title": "Gamma",
    "aliases": [
      "Gamma class"
    ],
    "shortDefinition": "Organiczna większość populacji systemowej.",
    "body": "Gamma oznacza organiczną większość społeczeństwa. W praktyce to główna masa pracowników, techników, usług i utrzymania infrastruktury. Termin jest jawny i używany administracyjnie.",
    "relatedTerms": [
      "term-alpha",
      "term-beta",
      "term-citizen",
      "term-service"
    ],
    "archived": false
  },
  {
    "id": "term-podludzie",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "PEOPLE",
    "term": "Podludzie",
    "localTerm": "Podludzie",
    "title": "Podludzie",
    "aliases": [
      "Unregistered",
      "Zewnętrzni",
      "Niewpisani"
    ],
    "shortDefinition": "Systemowe określenie populacji pozasystemowych albo niewpisanych.",
    "body": "Podludzie to brutalna, oficjalna kategoria dla populacji pozasystemowych, niewpisanych albo poddanych izolacji. W Encyklopedii termin służy graczowi do rozumienia języka świata, nie jako neutralna ocena ludzi.",
    "relatedTerms": [
      "term-citizen",
      "term-system",
      "term-watch-and-secure",
      "term-access"
    ],
    "archived": false
  },
  {
    "id": "term-system",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SYSTEM",
    "term": "System",
    "localTerm": "System",
    "title": "System",
    "aliases": [
      "Porządek Systemowy"
    ],
    "shortDefinition": "Zbiór instytucji, procedur i rejestrów regulujących życie obywateli.",
    "body": "System to struktura administracyjna, techniczna i społeczna obsługująca identyfikację, dostęp, pracę, subskrypcje, bezpieczeństwo oraz status obywateli. W aplikacji słowo SYSTEM może oznaczać też suchą warstwę zasad gry.",
    "relatedTerms": [
      "term-citizen",
      "term-access",
      "term-watch-and-secure",
      "term-system-index"
    ],
    "archived": false
  },
  {
    "id": "term-system-index",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SYSTEM",
    "term": "System Index",
    "localTerm": "Indeks Systemu",
    "title": "System Index / Indeks Systemu",
    "aliases": [
      "Civic Manual",
      "Approved Civic Knowledge"
    ],
    "shortDefinition": "Oficjalny, zatwierdzony podręcznik pojęć obywatelskich.",
    "body": "System Index jest oficjalną narracją Systemu. Opisuje instytucje, obowiązki, bezpieczeństwo, pracę i dostęp językiem zatwierdzonym dla obywateli. Nie jest neutralną encyklopedią świata.",
    "relatedTerms": [
      "term-system",
      "term-citizen",
      "term-ministry",
      "term-watch-and-secure"
    ],
    "archived": false
  },
  {
    "id": "term-ministry",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SYSTEM",
    "term": "Ministry",
    "localTerm": "Ministerstwo",
    "title": "Ministry / Ministerstwo",
    "aliases": [
      "Resort",
      "Central Ministry"
    ],
    "shortDefinition": "Centralny organ Systemu zarządzający określoną domeną kontroli.",
    "body": "Ministerstwo to centralny organ Systemu. Do najważniejszych należą TruthMin, MemoryMin, CalmMin, SyncMin, SecurityMin, PerfectMin i PlentyMin. Wpisy ministerialne w System Index pokazują ich oficjalną wersję.",
    "relatedTerms": [
      "term-system",
      "term-system-index",
      "term-haven",
      "term-watch-and-secure"
    ],
    "archived": false
  },
  {
    "id": "term-access",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SYSTEM",
    "term": "Access",
    "localTerm": "Dostęp",
    "title": "Access / Dostęp",
    "aliases": [
      "Access Level",
      "Poziom dostępu"
    ],
    "shortDefinition": "Zakres usług, danych, miejsc lub funkcji dostępnych dla obywatela.",
    "body": "Access określa, do czego postać może wejść, czego może użyć albo jakie informacje może zobaczyć. Dostęp może zależeć od statusu, subskrypcji, pracy, ryzyka, roli lub decyzji scenariusza.",
    "relatedTerms": [
      "term-clearance",
      "term-risk-score",
      "term-system",
      "term-subscription"
    ],
    "archived": false
  },
  {
    "id": "term-address",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SYSTEM",
    "term": "Address",
    "localTerm": "Adres systemowy",
    "title": "Address / Adres systemowy",
    "aliases": [
      "Core Address",
      "Visible Address"
    ],
    "shortDefinition": "Jawny zapis lokalizacji administracyjnej, sieciowej lub obiektowej.",
    "body": "Adres systemowy opisuje lokalizację i sieć w porządku administracyjnym. Pełny przykład może zawierać kod miasta, geoadres, ID sieci, kod strefowo-kontrolny oraz lokalny chunk, budynek i komórkę.",
    "relatedTerms": [
      "term-trace",
      "term-citizen-id",
      "term-watch-and-secure",
      "term-system"
    ],
    "archived": false
  },
  {
    "id": "term-corporation",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "CORPORATIONS",
    "term": "Corporation",
    "localTerm": "Korporacja",
    "title": "Corporation / Korporacja",
    "aliases": [
      "Corp",
      "Megakorporacja"
    ],
    "shortDefinition": "Prywatny lub półprywatny podmiot oferujący pracę, usługi, ochronę, klinikę albo technologię.",
    "body": "Corporation działa w ramach porządku Systemu albo na jego styku. Może wystawiać oferty Regular Service, sprzedawać subskrypcje, utrzymywać usługi i kontrolować dostęp do produktów lub infrastruktury.",
    "relatedTerms": [
      "term-service",
      "term-regular-service",
      "term-subscription",
      "term-kagami-kaisha"
    ],
    "archived": false
  },
  {
    "id": "term-kagami-kaisha",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "CORPORATIONS",
    "term": "Kagami Kaisha",
    "localTerm": "Kagami Kaisha",
    "title": "Kagami Kaisha",
    "aliases": [
      "Kagami",
      "Kagami Kaisha Neural Defense"
    ],
    "shortDefinition": "Prywatna megakorporacja cyberbezpieczeństwa, zabezpieczeń neuralnych i technologii netrunnerskich.",
    "body": "Kagami Kaisha produkuje zabezpieczenia sieciowe, chipy antyhakerskie, firewalle, technologie netrunnerskie i ochronę neuralną. Publicznie jest partnerem bezpieczeństwa; strategicznie może konkurować o kontrolę nad bezpiecznym ruchem danych.",
    "relatedTerms": [
      "term-corporation",
      "term-cyberware",
      "term-blackwall",
      "term-netrunner"
    ],
    "archived": false
  },
  {
    "id": "term-subscription",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "ECONOMY",
    "term": "Subscription",
    "localTerm": "Subskrypcja",
    "title": "Subscription / Subskrypcja",
    "aliases": [
      "Pakiet",
      "Usługa cykliczna"
    ],
    "shortDefinition": "Cyklicznie opłacana usługa dająca dostęp do określonego pakietu funkcji, ochrony albo utrzymania.",
    "body": "Subscription to cyklicznie opłacana usługa przypisana do postaci. Może dotyczyć mieszkania, zdrowia, bezpieczeństwa, cyberware, transportu, edukacji lub innych usług kampanii.",
    "relatedTerms": [
      "term-credit",
      "term-live-and-prevail",
      "term-trauma",
      "term-cyberware"
    ],
    "archived": false
  },
  {
    "id": "term-credit",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "ECONOMY",
    "term": "Credit",
    "localTerm": "Kredyt",
    "title": "Credit / Kredyt",
    "aliases": [
      "₡",
      "Encoded Credit"
    ],
    "shortDefinition": "Podstawowa jednostka rozliczeniowa używana w płatnościach, karach, długach i subskrypcjach.",
    "body": "Credit jest walutą rozliczeniową używaną przy wypłatach, kosztach usług, opłatach subskrypcyjnych, długu oraz transakcjach zależnych od decyzji gracza.",
    "relatedTerms": [
      "term-subscription",
      "term-weekly-settlement",
      "term-service",
      "term-debt"
    ],
    "archived": false
  },
  {
    "id": "term-weekly-settlement",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "ECONOMY",
    "term": "Weekly Settlement",
    "localTerm": "Rozliczenie tygodniowe",
    "title": "Weekly Settlement / Rozliczenie tygodniowe",
    "aliases": [
      "Settlement",
      "Cycle rozliczeniowy"
    ],
    "shortDefinition": "Tygodniowy cykl przetwarzania dochodów, płatności, subskrypcji i długu.",
    "body": "Weekly Settlement to automatyczny cykl rozliczeniowy aplikacji. Legalne dochody i standardowe opłaty są przetwarzane systemowo, a gracz ręcznie rozstrzyga przede wszystkim przepływy nieregularne, awaryjne, nielegalne lub pozaoficjalne.",
    "relatedTerms": [
      "term-credit",
      "term-subscription",
      "term-service",
      "term-debt"
    ],
    "archived": false
  },
  {
    "id": "term-debt",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "ECONOMY",
    "term": "Debt",
    "localTerm": "Dług",
    "title": "Debt / Dług",
    "aliases": [
      "Zadłużenie",
      "Obciążenie"
    ],
    "shortDefinition": "Niespłacone obciążenie ekonomiczne postaci.",
    "body": "Debt oznacza niespłacone zobowiązanie finansowe. Może wynikać z usług, subskrypcji, kar, kredytów, nieudanych rozliczeń albo decyzji fabularnych. Dług jest częścią presji ekonomicznej na Citizen.",
    "relatedTerms": [
      "term-credit",
      "term-weekly-settlement",
      "term-subscription",
      "term-risk-score"
    ],
    "archived": false
  },
  {
    "id": "term-risk-score",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SECURITY",
    "term": "Risk Score",
    "localTerm": "Wskaźnik ryzyka",
    "title": "Risk Score / Wskaźnik ryzyka",
    "aliases": [
      "Risk",
      "Profil ryzyka"
    ],
    "shortDefinition": "Miara ryzyka przypisywana obywatelowi, zdarzeniu lub zachowaniu.",
    "body": "Risk Score opisuje poziom ryzyka związany z postacią lub rekordem. Może wpływać na dostęp, kwalifikację do usług, reakcję Watch and Secure, koszt błędu albo konsekwencje fabularne.",
    "relatedTerms": [
      "term-watch-and-secure",
      "term-access",
      "term-citizen",
      "term-clearance"
    ],
    "archived": false
  },
  {
    "id": "term-watch-and-secure",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SECURITY",
    "term": "Watch and Secure",
    "localTerm": "Watch and Secure",
    "title": "Watch and Secure",
    "aliases": [
      "W&S"
    ],
    "shortDefinition": "Aparat nadzoru, bezpieczeństwa i kontroli ryzyka w przestrzeni obywatelskiej.",
    "body": "Watch and Secure odpowiada za obserwację, kontrolę ryzyka, bezpieczeństwo i reakcję na naruszenia porządku. W aplikacji występuje jako źródło rekordów, komunikatów, audytów, usług i konsekwencji związanych z bezpieczeństwem.",
    "relatedTerms": [
      "term-risk-score",
      "term-access",
      "term-trace",
      "term-system"
    ],
    "archived": false
  },
  {
    "id": "term-clearance",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SECURITY",
    "term": "Clearance",
    "localTerm": "Poświadczenie dostępu",
    "title": "Clearance / Poświadczenie dostępu",
    "aliases": [
      "Uprawnienie",
      "Klirens"
    ],
    "shortDefinition": "Formalne uprawnienie do określonego rekordu, obszaru, usługi lub procedury.",
    "body": "Clearance oznacza poświadczenie dostępu. Może dotyczyć stanowiska, bazy danych, obszaru, usługi, poziomu informacji lub procedury. Nie jest tym samym co rzeczywista wiedza postaci.",
    "relatedTerms": [
      "term-access",
      "term-watch-and-secure",
      "term-system",
      "term-risk-score"
    ],
    "archived": false
  },
  {
    "id": "term-trace",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SECURITY",
    "term": "TRACE",
    "localTerm": "TRACE",
    "title": "TRACE",
    "aliases": [
      "Trace Address",
      "Adres namierzający"
    ],
    "shortDefinition": "Techniczny ślad lokalizacyjny konkretnej sesji, odczytu lub zdarzenia.",
    "body": "TRACE jest dokładniejszym od jawnego adresu śladem lokalizacyjnym używanym przez warstwy kontrolne. Dla gracza jest pojęciem przydatnym przy logach, audytach, W&S i śledzeniu zdarzeń.",
    "relatedTerms": [
      "term-address",
      "term-watch-and-secure",
      "term-citizen-id",
      "term-access"
    ],
    "archived": false
  },
  {
    "id": "term-trauma",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "MEDICAL",
    "term": "TRAUMA",
    "localTerm": "TRAUMA",
    "title": "TRAUMA",
    "aliases": [
      "TRAUMA Team"
    ],
    "shortDefinition": "Prywatna klinika ratunkowo-lecząca obsługująca interwencje, leczenie i medyczne pakiety premium.",
    "body": "TRAUMA to prywatny operator medyczny. Obsługuje ratunek, stabilizację, leczenie, biomonitoring, rekonstrukcje, przeszczepy oraz wybrane usługi implantologiczne zależne od kontraktu.",
    "relatedTerms": [
      "term-subscription",
      "term-live-and-prevail",
      "term-service-port",
      "term-biochip"
    ],
    "archived": false
  },
  {
    "id": "term-live-and-prevail",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "MEDICAL",
    "term": "Live & Prevail",
    "localTerm": "Live & Prevail",
    "title": "Live & Prevail",
    "aliases": [
      "L&P",
      "Live",
      "Sustain",
      "Prevail"
    ],
    "shortDefinition": "Trójpoziomowy systemowy pakiet zdrowotno-utrzymaniowy.",
    "body": "Live & Prevail obejmuje trzy poziomy: Live, Sustain i Prevail. Pakiet dotyczy podstawowej opieki, utrzymania ciała w stanie roboczym i wyższego priorytetu medycznego zależnego od tieru.",
    "relatedTerms": [
      "term-trauma",
      "term-subscription",
      "term-citizen",
      "term-biochip"
    ],
    "archived": false
  },
  {
    "id": "term-biochip",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "MEDICAL",
    "term": "Biochip",
    "localTerm": "Biochip",
    "title": "Biochip",
    "aliases": [
      "Medical Biochip",
      "Biomonitoring chip"
    ],
    "shortDefinition": "Implant lub moduł biomonitoringu zgłaszający stan ciała do uprawnionej usługi.",
    "body": "Biochip służy do odczytu stanu ciała, aktywacji wybranych interwencji i powiązania postaci z usługami medycznymi. Może mieć znaczenie dla TRAUMA, Live & Prevail i serwisu cyberware.",
    "relatedTerms": [
      "term-trauma",
      "term-live-and-prevail",
      "term-service-port",
      "term-cyberware"
    ],
    "archived": false
  },
  {
    "id": "term-cyberware",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SYSTEM",
    "term": "Cyberware",
    "localTerm": "Cyberware",
    "title": "Cyberware",
    "aliases": [
      "Implant",
      "Wszczep"
    ],
    "shortDefinition": "Implant lub system ciała podłączany do mechaniki postaci.",
    "body": "Cyberware obejmuje wszczepy, moduły i urządzenia połączone z ciałem postaci. Może dawać modyfikatory, odblokowywać działania, wymagać subskrypcji, generować ryzyko albo wchodzić w zależności z neurochipem, Interface i Service Port.",
    "relatedTerms": [
      "term-neurochip",
      "term-interface",
      "term-service-port",
      "term-firmware"
    ],
    "archived": false
  },
  {
    "id": "term-neurochip",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SYSTEM",
    "term": "Neurochip",
    "localTerm": "Neurochip",
    "title": "Neurochip",
    "aliases": [
      "CPU cyberware"
    ],
    "shortDefinition": "Główny procesor cyberware postaci.",
    "body": "Neurochip jest głównym procesorem cyberware. Nie jest zwykłym pojedynczym implantem użytkowym: definiuje, ile i jak złożonego cyberware postać może obsłużyć oraz jakie oprogramowanie i kanały kontroli są dostępne.",
    "relatedTerms": [
      "term-cyberware",
      "term-interface",
      "term-service-port",
      "term-firmware"
    ],
    "archived": false
  },
  {
    "id": "term-interface",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SYSTEM",
    "term": "Interface",
    "localTerm": "Interface",
    "title": "Interface",
    "aliases": [
      "Socket",
      "Body bus",
      "Magistrala ciała"
    ],
    "shortDefinition": "Mały socket i magistrala przy tylnej części głowy, do której wpina się neurochip.",
    "body": "Interface to mały implant przy tylnej części głowy i połączeniu z kręgosłupem. Neurochip wpina się w Interface, a tier Interface poprawia jakość połączenia, kanały, izolację, kompatybilność i stabilność sygnału.",
    "relatedTerms": [
      "term-neurochip",
      "term-cyberware",
      "term-service-port",
      "term-firmware"
    ],
    "archived": false
  },
  {
    "id": "term-service-port",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SYSTEM",
    "term": "Service Port",
    "localTerm": "Port serwisowy",
    "title": "Service Port / Port serwisowy",
    "aliases": [
      "Port diagnostyczny",
      "Neck service socket"
    ],
    "shortDefinition": "Fizyczne gniazdo serwisowe przy styku szyi i głowy.",
    "body": "Service Port to fizyczne gniazdo serwisowe przy styku szyi i głowy. Służy do diagnostyki, firmware, kalibracji, awaryjnego dostępu klinicznego i audytu. Nie trzyma neurochipa i nie zastępuje Interface.",
    "relatedTerms": [
      "term-interface",
      "term-neurochip",
      "term-cyberware",
      "term-trauma"
    ],
    "archived": false
  },
  {
    "id": "term-firmware",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SYSTEM",
    "term": "Firmware",
    "localTerm": "Firmware",
    "title": "Firmware",
    "aliases": [
      "Implant firmware",
      "Aktualizacja wszczepu"
    ],
    "shortDefinition": "Oprogramowanie niskiego poziomu wymagane przez część cyberware.",
    "body": "Firmware określa aktualność i zgodność oprogramowania wszczepu. Cyberware może wymagać aktywnej subskrypcji oraz aktualnego firmware. Aktualizacja może być pobierana ze strony producenta albo z panelu usługi.",
    "relatedTerms": [
      "term-cyberware",
      "term-neurochip",
      "term-service-port",
      "term-subscription"
    ],
    "archived": false
  },
  {
    "id": "term-wszechsiec",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "NETWORK",
    "term": "Wszechsieć",
    "localTerm": "Wszechsieć",
    "title": "Wszechsieć",
    "aliases": [
      "Net",
      "Sieć"
    ],
    "shortDefinition": "Systemowa nazwa kontrolowanej infrastruktury sieciowej i jej zatwierdzonych segmentów.",
    "body": "Wszechsieć to sieciowa warstwa świata dostępna przez zatwierdzone kanały. W praktyce obywatel korzysta przede wszystkim z bezpiecznych, certyfikowanych segmentów, a nie z dawnej wolnej sieci.",
    "relatedTerms": [
      "term-safe-wszechsiec",
      "term-haven",
      "term-blackwall",
      "term-netrunner"
    ],
    "archived": false
  },
  {
    "id": "term-safe-wszechsiec",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "NETWORK",
    "term": "Safe Wszechsieć",
    "localTerm": "Bezpieczna Wszechsieć",
    "title": "Safe Wszechsieć / Bezpieczna Wszechsieć",
    "aliases": [
      "Safe Net",
      "Certified Net"
    ],
    "shortDefinition": "Ocalała, chroniona i certyfikowana część dawnej sieci.",
    "body": "Bezpieczna Wszechsieć to zatwierdzona część infrastruktury danych. Dostęp do niej jest regulowany przez System i może zależeć od statusu, pracy, subskrypcji, ryzyka oraz lokalnej infrastruktury.",
    "relatedTerms": [
      "term-wszechsiec",
      "term-haven",
      "term-blackwall",
      "term-access"
    ],
    "archived": false
  },
  {
    "id": "term-haven",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "NETWORK",
    "term": "HAVEN",
    "localTerm": "HAVEN",
    "title": "HAVEN",
    "aliases": [
      "Przystań Bezpiecznej Sieci"
    ],
    "shortDefinition": "Projekt utrzymania bezpiecznej sieci, Blackwalla i infrastruktury kwarantanny danych.",
    "body": "HAVEN obejmuje infrastrukturę utrzymującą bezpieczną Wszechsieć: Blackwall, procedury odcięcia, kwarantanny, oczyszczanie ruchu, operatorów oraz zaplecze energetyczne i techniczne.",
    "relatedTerms": [
      "term-blackwall",
      "term-safe-wszechsiec",
      "term-ministry",
      "term-netrunner"
    ],
    "archived": false
  },
  {
    "id": "term-blackwall",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "NETWORK",
    "term": "Blackwall",
    "localTerm": "Blackwall",
    "title": "Blackwall",
    "aliases": [
      "Firewall graniczny",
      "Granica sieci"
    ],
    "shortDefinition": "Wielowarstwowy firewall oddzielający bezpieczną sieć od skażonych segmentów.",
    "body": "Blackwall oddziela bezpieczną Wszechsieć od stref opanowanych przez Dzikie AI i skażone dane. Dla gracza jest granicą fabularną, sieciową i medyczną: przekroczenie jej może zagrozić sprzętowi, neurochipowi i ciału operatora.",
    "relatedTerms": [
      "term-haven",
      "term-dzikie-ai",
      "term-safe-wszechsiec",
      "term-netrunner"
    ],
    "archived": false
  },
  {
    "id": "term-dzikie-ai",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "NETWORK",
    "term": "Dzikie AI",
    "localTerm": "Dzikie AI",
    "title": "Dzikie AI",
    "aliases": [
      "Wild AI",
      "Sieć dzika"
    ],
    "shortDefinition": "Zbiorcze określenie samorozwijającego się zagrożenia za Blackwallem.",
    "body": "Dzikie AI to publicznie znane określenie nieopanowanego ekosystemu danych powiązanego z upadkiem dawnego Internetu. Dla zwykłego Citizen funkcjonuje przede wszystkim jako uzasadnienie kwarantann, filtrów i zakazu nieautoryzowanych połączeń.",
    "relatedTerms": [
      "term-blackwall",
      "term-haven",
      "term-wszechsiec",
      "term-netrunner"
    ],
    "archived": false
  },
  {
    "id": "term-netrunner",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "NETWORK",
    "term": "Netrunner",
    "localTerm": "Netrunner",
    "title": "Netrunner",
    "aliases": [
      "Operator sieciowy",
      "Runner"
    ],
    "shortDefinition": "Wysokiego ryzyka operator pracujący na granicy bezpiecznej sieci i zagrożeń sieciowych.",
    "body": "Netrunner nie jest zwykłym hakerem. To operator sieciowy, technik, analityk i zasób wysokiego ryzyka, często połączony z cyberware, neurochipem i procedurami ochrony poznawczej.",
    "relatedTerms": [
      "term-blackwall",
      "term-haven",
      "term-kagami-kaisha",
      "term-neurochip"
    ],
    "archived": false
  },
  {
    "id": "term-housing",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "DAILY LIFE",
    "term": "Housing",
    "localTerm": "Mieszkanie",
    "title": "Housing / Mieszkanie",
    "aliases": [
      "Unit",
      "Habitat"
    ],
    "shortDefinition": "Przestrzeń mieszkalna lub jednostka przypisana postaci.",
    "body": "Housing oznacza miejsce zamieszkania, jednostkę, storage i powiązane usługi utrzymania. W aplikacji jest modułem codziennego zaplecza postaci: przechowywania, przesyłek i rynku wyposażenia.",
    "relatedTerms": [
      "term-subscription",
      "term-access",
      "term-credit",
      "term-citizen"
    ],
    "archived": false
  },
  {
    "id": "term-rations",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "DAILY LIFE",
    "term": "Rations",
    "localTerm": "Racje",
    "title": "Rations / Racje",
    "aliases": [
      "Przydział",
      "Supply allowance"
    ],
    "shortDefinition": "Przydział żywności, zasobów lub usług codziennego utrzymania.",
    "body": "Rations oznaczają przydzielane zasoby codziennego utrzymania. W świecie Systemu przydział jest przedstawiany jako opieka i stabilizacja, ale mechanicznie może działać jako koszt, ograniczenie, subskrypcja albo element statusu.",
    "relatedTerms": [
      "term-subscription",
      "term-credit",
      "term-access",
      "term-system-index"
    ],
    "archived": false
  }
  ,
  {
    "id": "term-abilities",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SYSTEM",
    "term": "Abilities",
    "localTerm": "Cechy bazowe",
    "title": "Abilities / Cechy bazowe",
    "aliases": [
      "Ability",
      "Cechy",
      "Atrybuty"
    ],
    "shortDefinition": "Bazowe parametry postaci używane przy testach i limitach mechanicznych.",
    "body": "Abilities opisują podstawowy potencjał postaci: ciało, refleks, percepcję, opanowanie, intelekt i inne stałe parametry. W mechanice są łączone ze Skills, modyfikatorami i wpływem cyberware.",
    "relatedTerms": [
      "term-skills",
      "term-cyberware",
      "term-neurochip",
      "term-risk-score"
    ],
    "archived": false
  },
  {
    "id": "term-skills",
    "registry": "encyclopedia",
    "type": "TERM",
    "category": "SYSTEM",
    "term": "Skills",
    "localTerm": "Umiejętności",
    "title": "Skills / Umiejętności",
    "aliases": [
      "Skill",
      "Kompetencje",
      "Wyszkolenie"
    ],
    "shortDefinition": "Wyszkolenie, wiedza i kompetencje operacyjne używane razem z Abilities.",
    "body": "Skills opisują to, czego postać się nauczyła albo do czego została przeszkolona. Nie są cechą biologiczną; podczas testu działają jako kwalifikacja, specjalizacja albo część pary Ability + Skill.",
    "relatedTerms": [
      "term-abilities",
      "term-service",
      "term-work-assignment",
      "term-cyberware"
    ],
    "archived": false
  }

];
