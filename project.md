# PROJECT.md — FUTURE NOIR Web Terminal

## Status projektu

```text
phase: pre-alpha
runtime baseline: Parallel Scope Merge 15.23x
documentation baseline: Canonical Documentation 4.0x
target: desktop browser
persistence: client-side campaign data
```

FUTURE NOIR jest lokalną aplikacją webową do prowadzenia kampanii TTRPG. Aplikacja pełni jednocześnie rolę immersyjnego terminala gracza oraz panelu administracyjnego MG. Projekt działa jako statyczny HTML/CSS/JavaScript i nie wymaga produkcyjnego backendu.

W fazie pre-alpha priorytetem są architektura, funkcjonalność i spójność. Dane testowe, seedy oraz zapis runtime mogą być czyszczone lub migrowane, gdy upraszcza to model albo usuwa przestarzałe źródła prawdy.

## Tryby aplikacji

### Player Access Panel

Interfejs gracza reprezentuje ograniczony terminal Citizen. Udostępnia profil, moduły kampanii, Terminal, Service, Subscriptions, Equipment/CyberGrid, Cyberware, Housing, Knowledge i pozostałe funkcje zależne od uprawnień postaci.

### Admin Control Center

Panel MG jest osobnym workspace operatorskim. Używa stałego Command Band, Navigation Rail, globalnego Citizen Context oraz dedykowanych edytorów domenowych. Admin nie korzysta z playerowego Sidepanelu jako głównego interfejsu zarządzania.

## Kanoniczna własność domen

| Domena | Właściciel stanu i mutacji |
|---|---|
| Citizen | `CitizenCommandAPI` + Citizen Record Store |
| Admin audit | `Admin Audit Store` + adapter Campaign Snapshot v6 |
| Billing / Credits / Debt | Billing Store i publiczne komendy Billing |
| Subscriptions | `SubscriptionAPI`; `citizen.subscriptions[]` jako kolekcja trwała |
| Employment / income | `Citizen.serviceLog`; Active Service i Income Sources są projekcjami |
| Provider operations | Service Bridge definitions/offers/orders |
| Market fulfillment | Market Store + Service/Billing/ItemInstance public APIs |
| Physical items | jeden `ItemInstance Store` |
| Equipment placement | Equipment Store i kanoniczne lokacje ItemInstance |
| Housing storage | Housing Store + Housing Grid Engine Adapter |
| Cyberware runtime | Runtime/Planner/Core Stack/Authorization nad ItemInstance w `BODY` |
| Cross-domain cyberware operation | jeden Cyberware World Bridge orchestrator |
| Operation recovery | World Bridge Operation Store |
| Firmware releases | Firmware Registry |
| Notifications | Notification Registry/API i producenci domenowi |
| Campaign import/export | Campaign Data I/O v6 adapter registry |
| Campaign Time | `js/main.js` timestamp/revision store + stateless Event Windows + domain schedulers |
| Knowledge | Knowledge Pack Store v3 + registry-isolated stable relation IDs |

## Runtime 15.13x — aktywne rozszerzenia

- Citizen Files są utrzymywane w niezależnym `Citizen File Store`; relacje z Case Files są projekcją stabilnych identyfikatorów obsługiwaną przez `Database Relations`.
- Item Type Operations wykonują atomowe komendy magazynka, komory, bezpiecznika, trybu ognia, granatu i zużycia ilościowego przez ItemInstance Transaction Store. Inspector jest wyłącznie warstwą poleceń i projekcji.
- Market obsługuje dostawę, `PURCHASE_WITH_SERVICE`, `PICKUP`, pełne refundy oraz zwrot wybranych fizycznych instancji. Pickup przechowuje zakupione ItemInstance w custody vendora do potwierdzenia odbioru. Partial return przenosi tylko wskazane `instanceId` do vendora, odtwarza właściwą ilość stocku i zleca proporcjonalny refund przez Billing. Drawer koszyka ma niezależne tło i sticky summary.
- Player Subscriptions są ładowane wyłącznie przez lazy bundle. Housing korzysta z read-only Cyberware Market Projection zamiast pełnego runtime UI Cyberware.
- Cyberware Operations łączy planner, maintenance, historię i Inspector ItemInstance bez drugiej ścieżki commitu.
- Citizen Service Log używa jawnego rejestru lifecycle, allowed-next transitions, revision i idempotency. Service Bridge zachowuje odrębny lifecycle.
- Notification Content Resolver mapuje eventy domenowe na treść terminalową bez zmiany własności Notification Registry/API.
- Notification Projection Policy utrzymuje jedną główną kartę Inbox na operację World Bridge, wycisza techniczne kroki pośrednie i nie zmienia lifecycle domen źródłowych.
- Citizen Creator i Admin Editor posiadają kontrakty browser validation oraz dedykowany runner Playwright.
- Terminal Inbox korzysta z rozbudowanej projekcji treści, filtrów katalogu zdarzeń i akcji lifecycle; dane techniczne są ujawniane wyłącznie w kontekście administracyjnym.
- Admin Operations Workspace jest dedykowanym lazy rendererem operacji World Bridge i wywołuje wyłącznie kanoniczne komendy claim/release/retry/reconcile.
- Subscriptions Catalog prezentuje znormalizowane benefits, limitations, usage, tier comparison i coverage bez heurystycznego dzielenia opisów.
- Wspólny kontrakt zakładek udostępnia rodziny segment, inline i mode przez eager `css/system-tabs.css`; moduły nie utrzymują lokalnych kopii podstawowego komponentu.
- Housing posiada osobny `Household Store` dla floor planu, safe-space readiness i lokacji `HOUSING_ROOM`. Storage i Household pozostają poza lazy runtime Market.
- Market workspace jest wydzielony do `js/market-workspace-runtime.js`; bundle Housing nigdy go nie ładuje, a moduł Market ładuje go wyłącznie na wejściu do Market. Delivery utrzymuje ItemInstance w custody vendora do ETA, rezerwuje docelowe Housing przy realizacji i zachowuje te same `instanceId`.
- Item Grid Presentation 1.0.1x jest finalnym właścicielem czytelnych pustych komórek, footprintów i etykiet gridu w Equipment oraz Housing Storage.
- Terminal Entry Store i Terminal Reminder Store są jedynymi właścicielami trwałych wpisów Inbox oraz przypomnień; `js/store.js` pozostaje adapterem integracyjnym i zachowuje publiczne API.
- Zamontowany Terminal reaguje na `ws:terminal-entries-updated` i `ws:calendar-reminders-updated` przez odseparowane projekcje Inbox/cards oraz Calendar. Reaktywność nie tworzy drugiego store’a ani nie interpretuje payloadu zdarzenia jako źródła prawdy.
- Cyberware Index jest read-only katalogiem definicji, oddzielonym od fizycznych ItemInstance i operacji instalacyjnych.
- Household Furnishing Workspace używa `Household Store`, kanonicznych lokacji `HOUSING_ROOM` i walidacji footprintu bez drugiej listy mebli.
- Market Cart rozróżnia liczbę linii od liczby sztuk, utrzymuje lokalną hierarchię Back/Escape oraz modalny focus trap bez przebudowy Housing shell.
- Market Notification Producer projektuje utrwalone stany MarketOrder do jednej karty Inbox i deleguje operacje World Bridge do karty nadrzędnej.
- Subscriptions 4.5 dodaje responsywne layouty, roving keyboard navigation, semantyczne tabpanele/listboxy i focus restoration bez nowego UI store.
- `css/system-tabs.css?v=8` zawiera finalny visual polish wspólnych rodzin segment, inline i mode.
- Housing Grid Engine Parity Audit 4.6.3x jest kontraktowym quality gate; nie zmienia runtime i potwierdza lokalny DOM patch po dropie bez pełnego renderu.
- Global Market jest osobnym modułem i lazy bundle. Housing zachowuje Unit, Household, Storage i delivery intake, ale nie jest właścicielem storefrontu, koszyka ani zamówień.
- Admin Catalog Management udostępnia kanoniczne authoring Equipment definitions: draft, preview, publish, archive/restore i export data pack bez tworzenia ItemInstance.
- Campaign Time jest pełnym timestampem UTC z revision, idempotency i kompatybilną projekcją daty; domenowe schedulery obserwują czas, ale nie oddają mu własności swoich rekordów.
- Campaign Time Event Windows rozwiązuje deterministyczne minuty zdarzeń wewnątrz skoku czasu, respektuje dzienne/tygodniowe godziny działania oraz może odroczyć zdarzenie do następnego otwartego okna. Resolver jest bezstanowy; timestamp utrwala domena będąca właścicielem zdarzenia.
- Housing Rent Standards Catalog definiuje standardy H–A, konkretne możliwości tierów, area limits, fixtures, storage, logistykę, furnishing grade i politykę maintenance. Subscriptions pozostaje właścicielem kontraktu i Billing, a Housing właścicielem przypisanej jednostki i jej runtime.
- Knowledge Pack schema v3 rozdziela relacje rejestrów: Encyclopedia pozostaje glossary, System rulebookiem, a System Index zatwierdzoną narracją. Aktualne rekordy bazowe nie zostały zastąpione treścią z patcha źródłowego.


## Runtime 15.14x — merged extensions

- Cyberware is now a standalone player module and lazy bundle. Equipment owns Cybergrid and physical equipment placement; Cyberware owns installed body systems, Neural Core, planner, maintenance, diagnostics, history and the definition index. Equipment loads only the navigation bridge and no longer hosts a `CYBERWARE` workspace.
- Terminal Inbox records use schema v3 timestamps (`createdAt`, `sentAt`, `receivedAt`, `readAt`) sourced from Campaign Time. `emitDuringCampaignAdvance()` resolves deterministic delivery time through World Time Event Windows and persists it on the Terminal Entry record.
- Housing Layout Pools provide deterministic non-rectangular floor templates for Rent standards G–A, with Standard H remaining assigned bedspace without a private furnishing grid. Household placement validates explicit active-cell masks rather than rectangular bounds.
- Knowledge detail relations render in a desktop sidecar rail while preserving current schema v3 registry separation. The merge does not import source-patch records, lore or outdated Encyclopedia/System/System Index content.

## Nienaruszalne inwarianty

```text
one physical item = one ItemInstance
one ItemInstance = one current owner and one canonical location
playerLabel changes presentation only; catalog/model identity remains immutable
no loose/unpacked/orphan state outside supported locations
Cyberware is a projection of installed ItemInstance records
LEFT/RIGHT belongs to anatomy or placement, never to product definition
Service Log and transactional Service Bridge are separate domains
Billing and Subscriptions are mutated only through their command boundaries
cross-domain operations use stable IDs, idempotency and revision guards
Campaign Snapshot remains schema v6
Admin Audit is campaign-persistent
no second orchestrator, alternate ItemInstance store or duplicate Citizen persistence path
```

## Citizen i edytory

Citizen Creator obsługuje rekordy przed aktywacją, Citizen Profile Editor udostępnia wąski self-edit, a Admin Citizen Editor zarządza sekcjami Identity, Mechanics i Access. Delegowane `ownerFullCardEdit` daje właścicielowi karty ten sam zakres Citizen-owned pól bez prawa do bezpośredniej mutacji Billing, Subscriptions, Service, Housing, Equipment lub Cyberware.

Mechanics zawsze pokazuje komplet zarejestrowanych Abilities i Skills oraz rekordy legacy obecne wyłącznie na karcie Citizen. Natural Ability jest edytowalne, wkład Cyberware pozostaje read-only, a Total jest projekcją. Citizen ID i Short ID są polami pochodnymi; zmiana origin lub birthDate przechodzi przez `recalculateCitizenIdentityCodes()`. Każda edytowalna sekcja posiada persistent Save/Discard, sticky Save i skrót Ctrl/Cmd+S.

## Admin Workspace Runtime

Admin Control Center zachowuje stałą powłokę Command Band, Navigation Rail, Workspace i Inspector. Definicje workspace’ów oraz ich renderery posiada `AdminWorkspaceRegistry`; `admin-control.js` udostępnia wspólny renderer context, routing i delegowane akcje, ale nie wybiera widoku przez centralny łańcuch warunków. Dashboard jest częścią bazowego bundle Admina, a pozostałe workspace’y rejestrują własne renderery z dedykowanych lazy bundle. `AdminWorkspaceLoader` uznaje workspace za gotowy dopiero po zarejestrowaniu renderera.


## Admin Record Lifecycle

Administrative record lifecycle uses one command boundary for `ARCHIVE`, `RESTORE`, `DISPOSE` and `HARD_DELETE`. Archive is reversible and preserves identity plus domain state. ItemInstance Archive changes only `recordState`; it does not change owner, location, physical lifecycle or durability. Physical terminal removal is the separate Dispose command, which writes `lifecycleState = DISPOSED` and `location.type = DESTROYED`.

Encyclopedia, System/System Index, Address, Case Files and Citizen Files use structured dependency preview before lifecycle commands. Active structured references are blockers; archived references are warnings and block Hard Delete. Every mutation requires Admin actor, operator note and idempotency key. Dispose and Hard Delete additionally require the exact record ID typed by the operator. Results are written to Admin Audit. Citizen archive/restore remains owned by CitizenCommandAPI; Citizen hard delete remains outside the active scope.

## Admin Billing

Admin rozdziela korektę jednego konta od transferu między kontami. `ADMIN_ADJUSTMENT` zmienia jedno konto, natomiast `ADMIN_TRANSFER` jest atomową operacją Billing Store: tworzy jeden rekord transferu, dwie przeciwne BillingTransactions oraz aktualizuje source i target z kontrolą revision, idempotency i rollback. Transfery obsługują Citizen i Organization oraz aktywa Credits i Debt. Reversal jest drugim transferem, nie edycją historii.

## Admin Subscriptions

Admin Control Center posiada osobny leniwy workspace Subscriptions. `js/admin-subscriptions-control.js` buduje jeden indeks kontraktów wszystkich nieadministracyjnych Citizenów, filtruje dane przed renderem i pokazuje jeden profil administracyjny z Contract Status, Billing, Coverage Target, Active Entitlements, Package Details, History oraz Administrative Actions. Wszystkie mutacje pozostają pod granicą `SubscriptionAPI`, wymagają notatki operatora i zapisują wynik w Admin Audit. Każda komenda ma jawne potwierdzenie, blokadę ponownego uruchomienia podczas przetwarzania, widoczny powód niedostępności oraz wynik mapowany przez wspólny `SubscriptionActionFeedback`. Billing, Citizen, Organization Store i ItemInstance są zależnościami read-only.

## Subscriptions

Playerowy moduł Subscriptions posiada jeden workspace Overview, Contracts, Catalog i Providers. `js/subscriptions-workspace.js` jest właścicielem nawigacji i wspólnego `subscriptionUiState`, a `js/subscriptions.js` jest właścicielem profili produktu, kontraktu i providera. Search i filtry są rozwiązywane przed renderem; UI nie tworzy drugiego katalogu, resolvera entitlement ani ścieżki persistence. Cztery główne widoki używają niezależnych terminalowych kart `system-segment-tile` z tytułem i krótkim opisem; dynamiczne liczniki pozostają w statusbarze oraz nagłówkach sekcji.

Profile Subscriptions korzystają z jednego układu terminalowego. Profil produktu pokazuje dostępność, target policy, porównanie tierów, coverage rules i entitlement codes. Profil kontraktu rozdziela status kontraktu, Billing, target, entitlementy, package details i management. Profil providera grupuje usługi według kategorii i pokazuje lokalizację lub sieć wyłącznie wtedy, gdy istnieje rzeczywisty rekord Organization Store. Wszystkie akcje zakupu, zmiany tieru, płatności, anulowania i rebindu pozostają pod granicą `SubscriptionAPI`. `js/subscription-action-feedback.js` jest wspólną, nietrwałą warstwą prezentacji wyników dla gracza i Admina: mapuje kody domenowe na komunikaty, blokuje wielokrotne kliknięcia, pokazuje stan przetwarzania oraz odświeża wyłącznie właściwy widok po sukcesie.

## Item Type Framework i dane QA

Funkcjonalna rodzina przedmiotu jest oddzielona od kategorii sklepowej i subtype. `data/item-type-catalog.js` oraz `js/item-type-registry.js` definiują `itemType`, capabilities, `itemTypeProfile` i normalizowany per-instance `itemState`. Właściciel, lokalizacja, durability, quantity i `playerLabel` pozostają w ItemInstance; Billing nadal jest jedynym właścicielem Credits i Debt. Fundament obejmuje m.in. broń palną, broń białą, granaty, magazynki, amunicję, portfele, kontenery, przedmioty medyczne, narzędzia, urządzenia, cyberware i consumables. Operacje load/unload, chamber, safety, fire mode, arm/disarm i quantity-use przechodzą przez ItemInstance Transaction Store. Zużycie consumable zmienia wyłącznie quantity i pozostawia dzienny wpis w ItemInstance Transaction Store. Webapp nie utrzymuje efektów, statusów, czasu działania ani automatycznych konsekwencji mechanicznych. Combat resolution, damage, detonation, HP, rany oraz pełna symulacja głodu i nawodnienia pozostają poza zakresem.

Seed Equipment używa dwóch deterministycznych zestawów QA: Citizen A testuje mobilne mounty, coverage, held/item mounts i condition edge cases; Citizen B testuje pełne warstwy, ciężkie zagnieżdżenia, rotację i Housing storage. Seed może zastępować wcześniejsze dane testowe w pre-alpha.

## Equipment i Cyberware

Equipment posiada dwa docelowe obszary użytkowe: CyberGrid oraz Cyberware. Oba główne przełączniki używają terminalowych kart o stałej proporcji. Item Inspector udostępnia kontekst przedmiotu, regionu lub kontenera, a Quick Equip zachowuje dokładny docelowy slot. Jeden delegowany tooltip portal prezentuje maksymalnie trzy krótkie linie i korzysta z tych samych formatterów co Inspector. Puste sloty pokazują jedną wyśrodkowaną etykietę ghost; etykieta nie jest powtarzana w narożnym bloku identity.

Każdy `ItemInstance` może posiadać opcjonalny `playerLabel`. Etykieta zmienia wyłącznie nazwę wyświetlaną konkretnego egzemplarza; katalogowa nazwa modelu pozostaje niezmienna i jest zachowana w kontekście technicznym. Rename i clear przechodzą przez `renameItemInstance`, z kontrolą właściciela i normalizacją wejścia. W Item Inspectorze edytor nazwy jest domyślnie zwinięty pod `Item Description`; przycisk `RENAME` rozwija formularz, a zapis lub wyczyszczenie etykiety wraca do zwartego widoku bez zmiany modelowej tożsamości przedmiotu.

Kompaktowe karty Inspectora korzystają z jednego player-facing formattera dla kategorii, subtype, regionów, slotów, mountów i typów kontenerów. Surowe enumy, takie jak `FOREARM_GUARD`, `RIGHT_FOREARM`, `CHEST_RIG` i `MASS_COMPRESSION_CUBE`, nie są renderowane w UI gracza. Formatter może skracać nazwę lokalnie, np. `FOREARM_GUARD` do `ARMOR` w slocie przedramienia oraz `MASS_COMPRESSION_CUBE` do `C-CUBE`, bez mutowania katalogu ani ItemInstance. Kompaktowe karty nie pokazują tekstu ani procentu condition; stan pozostaje widoczny przez klasy ramki. `DAMAGED` otrzymuje czerwony akcent, a `BROKEN` obejmuje condition 0–14, wygasza kartę i blokuje nowe operacje equip bez blokowania zdjęcia już wyposażonego przedmiotu. Nagłówki CyberGridu opisują fizyczną relację regionu i typu kontenera zamiast technicznych etykiet `BODY`, `MOUNT` i `NESTED`.

Cyberware korzysta z sekcji Systems, Neural Core i Operations. Overview jest projekcją read-only stanu Capacity, Readiness i Attention. Neural Core łączy Core Stack i Diagnostics w jeden workspace z trwałym kontekstem Neuroload, Neurochannels, Interface Load, Stability, Security, Neurolatency, statusów Neurochipa/Interface/Service Portu oraz ostatniego zapisanego skanu. Szczegółowa diagnostyka pozostaje lazy i nie tworzy drugiego store’a.

Operacje instalacji, demontażu, wymiany, firmware i maintenance przechodzą przez istniejące API domenowe. Market nie zapisuje itemu bezpośrednio do `BODY`, a Services nie przejmuje własności ItemInstance.

Housing Rent używa ośmiu osobnych produktów subskrypcyjnych dla standardów H–A. `data/housing-rent-standards.js` i `js/housing-rent-standards-store.js` są źródłem semantyki tierów, storage, dostaw, wyposażenia, disposal i maintenance. `SubscriptionAPI` zarządza kontraktem oraz opłatą tygodniową. Eager `js/housing-rent-subscription-bridge.js` projektuje aktywny kontrakt do jednego konkretnego rekordu `citizen.housing`, zachowuje identyfikator jednostki oraz layout przy modernizacji o tym samym metrażu i przygotowuje trwały manifest relokacji albo zwolnienia bez mutowania lokalizacji ItemInstance. Legacy `sub-habitat-ledger` pozostaje wyłącznie read-only aliasem migracyjnym.

Housing functional furniture uses the canonical ItemInstance lifecycle rather than a parallel furniture collection. Every functional furnishing projects an ownership class (`FIXED_FIXTURE`, `RENTAL_FURNISHING`, `CITIZEN_FURNISHING`), grade, condition, effective capabilities and bounded functional slots. Modules remain separate ItemInstances installed through `INSTALLED_IN_ITEM`. Grade determines one simple weekly wear rate while the item is placed in `HOUSING_ROOM`; storage does not accumulate wear. Citizen furniture may be repaired, replaced by a stored same-class furnishing or disposed through the system incinerator for `5 ₡`. Operator fixtures and rental furnishings remain with the Housing Unit and are excluded from relocation manifests. No wear-reduction build, material simulation or consumable-effect runtime belongs to Housing.


## Market storefront

Global Market jest osobnym, widocznym modułem Terminala i playerowym storefrontem nad kanonicznym Market Store. Udostępnia sekcje Catalog, Orders i Delivered, filtruje oferty według działów i generowanych podkategorii oraz renderuje maksymalnie sześć produktów na stronę w układzie dwukolumnowym. Katalog startowy obejmuje wyposażenie, cyberware oraz dziewiętnaście produktów zużywalnych w działach Medical, Food i Household; ich package/dose/duration/shelf-life metadata oraz opcjonalny `visualProfile` pozostają częścią kanonicznych definicji Equipment Catalog. Dziewiętnaście produktów zużywalnych posiada dedykowane lokalne SVG, a produkty bez własnego artworku korzystają z prezentacyjnego fallbacku działu. Ten sam resolver zasila miniaturę karty i pełny widok Product Inspector; Market Offer nie przechowuje konkurencyjnego pola grafiki ani osobnego rejestru assetów. Nawigacja Unit / Storage / Market oraz Catalog / Orders / Delivered korzysta ze wspólnego kontraktu terminalowych kart `system-segment-tile`. Szczegóły zamówienia pozwalają wskazać konkretne, nadal nieużywane ItemInstance do zwrotu; Market zapisuje line receipts, wykonuje jedną transakcję fizyczną, częściowo przywraca stock i zleca Billingowi proporcjonalny refund. UI nie posiada własnego store’a ofert, koszyka, zamówień, zwrotów ani artworku; wszystkie mutacje przechodzą przez publiczne API Market, Billing, Housing, Services i ItemInstance.

Housing Unit i Storage posiadają osobny runtime `js/housing-storage-runtime.js`. Runtime odpowiada za filtry i wybór Storage, projekcje Equipment/ItemInstance, transfery między kontenerami i jednostkami, renderery Unit/Storage oraz pointer-grid fast path. `js/housing.js` pozostaje właścicielem powłoki Housing, Household, Storage i delivery intake oraz read-only prezentacji przygotowanej relokacji lub zwolnienia jednostki. `js/market.js` oraz `js/market-workspace-runtime.js` posiadają globalny storefront, koszyk oraz projekcję/komendy zamówień i zwrotów. Scheduler oraz fulfillment pozostają wyłącznie w `js/market-store.js`. Rozdzielenie nie tworzy drugiego store’a Housing, Market ani ItemInstance.

## Stabilność UI i wydajność

- pointer move oraz preview grida nie wykonują pełnego rerenderu modułu;
- Front/Back Bodymap używa kanonicznych masterów `assets/bodymap/bodymap_front.avif` i `assets/bodymap/bodymap_back.avif` oraz przełącza dwa już zamontowane drzewa przez lokalny fast path, bez rekonstrukcji EquipmentState i bez refreshu workspace;
- zaznaczenie itemu w CyberGridzie, Bodymapie lub Item Indexie używa cache EquipmentState i aktualizuje lokalnie klasy selekcji, summary Bodymapu, action bar grida oraz body command raila; pełny refresh pozostaje wyłącznie fallbackiem;
- listowe projekcje ItemInstance dla Equipment i Cyberware filtrują kanoniczne rekordy wewnątrz store, wykorzystują revision-aware cache view i przygotowują go w małych idle slices; publiczne gettery rekordów nadal zwracają defensywne klony;
- Housing i Equipment korzystają ze wspólnej sesji pointera i lokalnych aktualizacji DOM;
- Services zachowuje stały shell dla tego samego Citizen, używa panelowych kontekstów, cache/paginacji Contracts i podmienia wyłącznie body sekcji; zimna generacja tygodniowych ofert tworzy jeden współdzielony eligibility context, a revision-aware entitlement snapshot cache eliminuje wielokrotne przeliczenia kontraktów;
- Admin Workspace ładuje ciężkie workspace’y leniwie i zachowuje stałą powłokę;
- zmiana samego statusu World Bridge nie przebudowuje EquipmentState;
- jeden fizyczny commit powoduje jedną kontrolowaną invalidację właściwego widoku.
- współdzielone `getCitizenFinancialLedger()`, `getCitizenSubscriptionSummary()` i `formatDateDisplay()` należą do eager `js/citizen-finance.js`; Citizen Card i Service nie zależą od wcześniejszego otwarcia Subscriptions;
- System, System Index, Encyclopedia i placeholder modułu korzystają z `window.WS_APP.bindModuleBackButton()`;
- router modułów zwalnia `is-module-transitioning` i `is-module-loading` w `finally`, a błąd renderera pozostawia działający przycisk Back i lokalny ekran diagnostyczny.

## Knowledge

```text
SYSTEM       = techniczny rulebook mechanik
ENCYCLOPEDIA = słownik pojęć gracza
SYSTEM INDEX = zatwierdzona, propagandowa wiedza świata
```

Zawartość Knowledge Pack używa schema v3, `stable-id-v2` i jawnej izolacji relacji między rejestrami. Dane lore w seedach aplikacji nie stanowią samodzielnego źródła kanonu przed fazą beta.

## Testy

```text
npm test
npm run test:unit
npm run test:contracts
npm run test:data-io
npm run test:e2e
npm run test:e2e:smoke
npm run test:e2e:world-bridge
npm run test:e2e:critical
```

Node harness wykonuje rekursywny syntax check oraz deterministyczne testy unit/contract/data-I/O. Playwright odpowiada za zachowanie w prawdziwej przeglądarce, focus, viewport, drag/drop i scenariusze reload/retry.

## Dokumentacja

Kolejność autorytetu:

```text
project.md
docs/PATCH_STATE.md
docs/FILE_MAP.md
docs/ROADMAP.md
docs/contracts/**
```

`PATCH_STATE.md` i `FILE_MAP.md` w katalogu głównym są krótkimi wskaźnikami do wersji kanonicznych w `docs/`.

Repozytorium nie przechowuje wykonanych patch notes, zakończonych audytów ani zrealizowanych planów. Git zachowuje historię zmian. Nowy dokument poza zestawem kanonicznym powinien mieć aktywną funkcję: kontrakt, aktualny stan, mapa plików albo rekomendowany roadmap scope.

## Workflow patchowania

- pełny ZIP lub repozytorium jest aktualnym baseline;
- replacement patch zawiera wyłącznie zmienione/dodane pliki oraz manifest usunięć, jeżeli jest potrzebny;
- nie wykonuje się prostego overlayu konfliktujących patchy;
- dla wspólnego pliku scala się logiczne bloki z aktualną bazą;
- nie dodaje się warstw `legacyFix`, `compat`, drugiego store’a ani fallback direct commit;
- bugfix opiera się na błędzie, stack trace, teście lub pomiarze, nie na hipotezie;
- każdy zmieniony JS przechodzi `node --check`, a dostępny harness musi przejść przed wydaniem;
- `index.html` w raporcie jest opisany jako cache-bust albo zmiana strukturalna;
- cross-scope dependency jest jawnie oznaczona wraz z powodem i ryzykiem duplikacji;
- rekomendowany follow-up nie jest nadrzędnym poleceniem i pozostaje zależny od bieżących wyników testów.

## Poufność i publikacja

Projekt nie zawiera danych wymagających prywatnego repozytorium. Kod, dokumentacja i dane testowe mogą być rozwijane publicznie. Nie należy wprowadzać sztucznych ograniczeń migracyjnych ani zachowywać przestarzałego modelu wyłącznie ze względu na kompatybilność zapisów pre-alpha.

## Runtime 15.15x — merged extensions

- Housing Rent Subscription Bridge 3.2x wiąże aktywny kontrakt Rent z maksymalnie jednym fizycznym rekordem Housing. Modernizacja o tym samym metrażu zachowuje unit ID, `layoutTemplateId` i `layoutSeed`; zmiana standardu lub metrażu przygotowuje relokację oraz manifest ItemInstance, ale nie wykonuje transferu.
- Anulowanie kontraktu zwalnia pustą jednostkę albo pozostawia ją w `RELEASE_PENDING` do czasu opróżnienia kanonicznych lokacji Housing.
- Global Market pozostaje osobnym modułem i jest jawnie widoczny w sekcji Terminal dla Admina oraz Citizena.
- Knowledge Relation Sidecar Layering 1.3x jest wyłącznie korektą warstwy prezentacyjnej: rail znajduje się pod nieprzezroczystym panelem artykułu, bez connector lines. Dane, relacje stable-ID, rejestry i podział SYSTEM / ENCYCLOPEDIA / SYSTEM INDEX pozostają niezmienione.


## Runtime 15.16x — merged extensions

- Knowledge Relation Article Index Tabs 1.4x refines only the desktop relation presentation. Stable IDs, registry isolation and the canonical SYSTEM / ENCYCLOPEDIA / SYSTEM INDEX split remain unchanged; no source-patch records or prose are imported.
- Cyberware Anatomy Bodymap 16.0x adds a hierarchical, asset-driven anatomy browser owned by the standalone Cyberware module. It projects installed BODY ItemInstances without creating another occupancy or persistence store.
- Housing Rent Relocation Runtime 3.3x executes prepared Rent relocations atomically through ItemInstance transactions, preserving instance IDs and storing compensation/recovery context.
- World Time Scheduled Events 2.3x adds one campaign-persistent, domain-neutral exact-time queue with stable handler IDs, idempotency, receipts and Campaign Snapshot v6 support.
- Market Product Card UI Reset 6.4x removes the retired artwork layer and visualProfile metadata. Compact product cards use neutral terminal chrome and exactly three actions: DETAILS, WISHLIST and ADD TO CART.

## Runtime 15.17x — merged extensions

- Housing Furnishing Lifecycle 4.0x adds one lifecycle projection over canonical furnishing ItemInstances: ownership class, grade, condition, weekly Campaign Time wear while placed, bounded functional slots, repair, Citizen replacement and disposal. Installed modules remain separate ItemInstances and do not modify wear.
- Market Workspace Extraction 6.4x replaces the retired `js/housing-market-runtime.js` path with `js/market-workspace-runtime.js`. The Market shell and workspace remain renderer/command layers; Market Store is the sole commerce lifecycle owner, and Housing does not load the Market workspace runtime.
- Knowledge Relation Article Index Tabs 1.5x is presentation-only. Fixed-depth desktop tabs sit beneath the opaque article plane and use deterministic multi-line label wrapping. No Knowledge records, lore, stable IDs, registry boundaries or schema ownership are changed.

## Runtime 15.18x — merged extensions

- Housing Notification Events 2.6x keeps Market Store as the sole MarketShipment lifecycle and persistence owner. A read-only bridge converts persisted shipment updates into semantic Housing delivery, hold and storage-capacity events; the Housing producer then projects one Terminal notification identity per shipment through the existing Notification Registry/API.
- Subscriptions Entitlement Projection 4.6 gives player and Admin views one canonical exact-time entitlement snapshot. Derived `ACTIVE`, `GRACE_PERIOD`, `EXPIRED`, `REVOKED` and target-loss states are read projections only; render paths do not mutate contracts, Billing or catalog records.

## Runtime 15.19x — merged extensions

- Market Datetime Scheduler 6.5x normalizes Market lifecycle fields to exact Campaign Time timestamps and delegates activation, expiry, pickup expiry and shipment ETA envelopes to the canonical World Time Scheduled Events queue. Market Store remains the only owner of offer, order, shipment and fulfillment mutation.
- Market Secondary Listing Foundation 7.0x adds one persistent simulation store for system-generated used-item listings, deterministic condition-based pricing, seller strategies, exact price review/expiry/demand events and simulated `WORLD_BUYER` sales. Player purchasing, seller escrow and marketplace settlement remain outside this foundation.
- Market Modal and Wishlist 6.5x adds named persistent wishlists, a modal Product Inspector and atomic transfer of wishlist lines into the existing delivery cart. Wishlist persistence does not create a second cart or order model.
- Housing Household Hub 5.0x projects one Household overview over canonical Housing, Terminal and ItemInstance state. Global weather is deterministic from Campaign Time; collection metadata stays on the physical ItemInstance; display placement uses `INSTALLED_IN_ITEM`; protection derives from real secure/archive containers; history remains read-only.
- Cyberware Upgrade System 16.1x models typed hardware slots, firmware, calibration and permanent modifications without a second cyberware store. Physical hardware modules remain separate ItemInstances installed in the host through `INSTALLED_IN_ITEM`; player operations execute through Service and Cyberware World Bridge.
- Knowledge Relation Article Index Tabs 1.6x is a presentation-only clipping correction for the existing desktop article tabs. Knowledge records, stable relation IDs, registries and the SYSTEM / ENCYCLOPEDIA / SYSTEM INDEX split are unchanged.


## Runtime 15.20x — merged extensions

- Citizen Card Projection Boundary 1.0x replaces the full Cyberware UI dependency in Citizen Card, Citizen Cards, Citizen Files and Citizen Database bundles with three read-only Equipment, Subscriptions and Cyberware projection adapters. The adapters read canonical eager state and expose only `window.WS_APP.citizenCardProjection`; they do not own commands, persistence, planner state, diagnostics or maintenance.
- Registry UI Dependency Foundation 1.0x introduces eager `js/registry-ui.js` as the owner of shared registry confirmation, form controls, list parsing and query normalization. System, System Index, Encyclopedia, Citizen Records and Subscriptions use the explicit `WS_APP.registryUI` API instead of relying on globals created by unrelated lazy bundles.
- Terminal Store Reactivity 1.0x makes the mounted Terminal observe canonical Entry and Reminder store events through microtask-coalesced, panel-specific refresh boundaries. Inbox/card updates and Calendar updates preserve local UI state, focus and scroll without creating another store.
- Subscriptions Catalog Cleanup 4.7x removes LearnMin, Skill Channel and three technical seed contracts from normal campaign data. The 26 remaining products are explicitly `CANONICAL` or `PROVISIONAL`; catalog persistence advances to v5 and discards the retired v4 overlay. Declarative bridge fixtures remain diagnostics only.


## Runtime 15.21x — merged extensions

- Terminal Render Scope 2.0x establishes explicit navigation, active-content, Inbox, Billing, Requests, Command and Calendar projections. Store-driven refreshes remain microtask-coalesced and preserve panel-local state; `renderTerminalPanelPartial()` is now a compatibility router rather than a full Terminal owner.
- Registry Controls CSS Extraction 1.0x retires `css/encyclopedia.css` and moves shared registry controls to eager `css/registry-controls.css`. Knowledge-specific article/relation layout remains in `css/knowledge-sections.css`.
- Citizen Card Renderer Split 2.0x separates shared card renderers, card shell/controller and the GM-only Citizen Cards registry. Player Citizen Card, Citizen Files and Citizen Database do not load the GM registry renderer.
- Equipment Contract Cleanup 6.0x reduces Equipment to the canonical CyberGrid screen and retires the obsolete Equipment-to-Cyberware navigation bridge. Equipment/Cyberware Stylesheet Boundary 6.1x makes both lazy modules CSS-independent: Equipment loads only `css/equipment.css`, Cyberware loads only `css/cyberware.css` plus Anatomy Bodymap CSS.
- Subscriptions Catalog Authoring 4.8x extends Admin Catalog Management with draft/edit/publish/archive/restore authoring for canonical Subscription definitions. It reuses the Subscription Catalog Store and does not create contracts or Billing records during preview.
- Admin Cyberware Runtime 1.0x adds one lazy Admin workspace with PLAYER WORLD and ADMIN DIRECT execution modes over existing Cyberware World Bridge, Planner and Maintenance APIs. It never writes raw BODY state or `citizen.cyberwareList`.
- Knowledge Relation Index Layout 2.0 is presentation-only. Desktop relations use an explicit two-column grid and deterministic overflow viewport; Knowledge records, stable IDs, registry separation and the SYSTEM / ENCYCLOPEDIA / SYSTEM INDEX model remain unchanged.
- Market Orders Catalog Structure 7.1x merges Ordered and Delivered under one ORDERS workspace and groups Catalog presentation into Household, Cyberware and General without rewriting definitions. Market Secondary Fulfillment 7.1x reserves one concrete used ItemInstance, moves the same instance through delivery custody and reopens the listing on eligible return. Market Store remains the sole owner of carts, orders, shipments and returns.


## Runtime 15.22x — merged extensions

- Housing Household UI Consolidation 5.1x reduces the Citizen-facing Housing shell to `OVERVIEW`, `HOUSEHOLD`, `STORAGE` and `DELIVERIES`. Unit and History are composed into Overview; collection metadata remains on ItemInstance while display placement remains in Household. Storage owns one transient Item Index drawer that locates canonical physical items without creating another inventory or persistence store.
- UI Controls Single Owner 1.0x introduces eager `css/ui-controls.css` as the sole visual owner of application scrollbars and native checkboxes. Module CSS retains overflow, wrapper layout and button-based selection only. Every native checkbox uses `ui-select-control`; radio appearance remains outside this scope.
- The Housing consolidation consumes the global control contract rather than preserving its source patch's temporary scrollbar theme in `css/modules.css`. Market remains a separate module and no retired `housing-market-runtime.js` dependency is restored.


## Runtime 15.23x — merged extensions

- Terminal Inbox Canonical Model 3.0x upgrades every normalized Inbox record to schema v4 with canonical `domain`, `category`, `eventCode`, lifecycle timestamps and `actions[]`. Legacy `type`, `subtype` and `links` remain migration inputs only. Terminal Inbox Scalability 4.0x adds a deterministic 50-entry render window, incremental `LOAD MORE` paging and delegated card actions without creating another Inbox store.
- Cyberware Taxonomy Foundation 16.2x and Migration 16.3x establish `data/cyberware-taxonomy.js` as the canonical vocabulary for body regions, mechanical body slots, grouped paired slots, implant families/subtypes, capabilities and module slots. Existing ItemInstance BODY locations migrate idempotently through aliases; eyes remain separate, Jaw is supported, Temple is retired, and paired Ears/Lungs/Kidneys use grouped left/right presentation without collapsing mechanical occupancy.
- Equipment CSS Consolidation 6.2 removes residual workspace and Cyberware branches from `css/equipment.css`. Equipment owns only CyberGrid presentation; Cyberware remains visually independent in its own stylesheets.
- Citizen Card Interaction Fast Path 2.1x updates Full/Compact mode and Equipment summary selection by replacing only the mounted card section. Presentation changes preserve section state, focus and scroll and do not rerender the full module shell or mutate domain state.
- Billing Marketplace Settlement 1.0x adds Billing-owned, idempotent fixed-price marketplace settlement with buyer debit, seller credit, platform fee, proportional refunds, recovery state and Campaign Data I/O. Market continues to own listings, orders, custody and fulfillment.
- Citizen Store Subscription Adapter 1.2x extracts low-level Subscription contract commands from the monolithic Citizen Store into `js/citizen-subscription-adapter.js`. Citizen Store remains the sole owner of `citizen.subscriptions` persistence, while `SubscriptionAPI` remains the only public command surface.
