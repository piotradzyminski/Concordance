# Cyberware World Bridge — Performance, CyberGrid and Equipment Contract

## 0. Current status

```text
Cyberware World Bridge 14.0x: installed
Stability 14.1x: installed cumulatively
Compensation 14.2x: installed
Housing Grid Engine 4.6x: installed
Project Test Harness 1.0x: installed
Campaign Data I/O v6: installed
```

This contract defines the continuing performance and invalidation invariants for the installed Cyberware World Bridge runtime. The canonical functional contracts are:

```text
docs/contracts/world_bridge/cyberware_world_bridge_contract.md
docs/contracts/world_bridge/cyberware_world_bridge_stability_contract.md
docs/contracts/world_bridge/cyberware_world_bridge_compensation_contract.md
```

Primary risk areas remain:

```text
EquipmentState rebuilds
ItemInstance projection cost
CyberGrid invalidation
full DOM replacement
event storms
synchronous persistence
duplicate cross-domain mutations
```

# 1. Główny cel techniczny

World Bridge ma łączyć domeny bez uruchamiania pełnych resolverów Equipment przy każdym kroku operacji.

Docelowy przebieg:

```text
Market / Service / Billing / Subscription update
→ precyzyjna zmiana domenowa
→ oznaczenie wybranych cache jako dirty
→ końcowy event operacji
→ jeden lokalny refresh aktywnego widoku
```

Zabroniony przebieg:

```text
Market update
→ full EquipmentState
→ Service update
→ full EquipmentState
→ Billing update
→ full EquipmentState
→ ItemInstance commit
→ full EquipmentState
→ full module rerender
```

World Bridge nie może traktować każdego eventu domenowego jako powodu do pełnego odświeżenia Equipment.

---

# 2. Nienaruszalne inwarianty wydajności

## 2.1 Zmiana statusu operacji nie przebudowuje Equipment

Zmiany takie jak:

```text
DRAFT
QUOTED
AUTHORIZED
SCHEDULED
IN_PROGRESS
```

nie zmieniają fizycznego położenia przedmiotów.

Nie mogą więc uruchamiać:

```text
getEquipmentState()
getCitizenEquipmentItemInstanceViews()
full catalog projection
CyberGrid rebuild
Bodymap rebuild
container grid rebuild
```

## 2.2 Jeden fizyczny commit = jedna invalidacja

Operacja zakończona sukcesem może zmienić `ItemInstance`, ale cały bridge powinien zakończyć się jednym kontrolowanym odświeżeniem.

```text
Market
→ Billing
→ Service
→ ItemInstance commit
→ one final invalidation
```

Nie emitować osobnych pełnych refreshy po każdym etapie.

## 2.3 Brak pełnego skanowania katalogu przy lookupie po ID

Każde:

```text
definitionId
catalogItemId
instanceId
providerId
serviceDefinitionId
marketOfferId
```

musi być obsługiwane przez indeks lub mapę po stabilnym ID.

Zabronione w hot path:

```text
build entire catalog
→ clone all entries
→ find one definition
```

## 2.4 Brak pełnej projekcji ItemInstance przy prostym odczycie

Read API wykorzystywane przez bridge powinno zwracać minimalny rekord wymagany do danej operacji.

Przykład:

```js
getItemInstanceLocation(instanceId)
getItemInstanceOwner(instanceId)
getItemInstanceDefinitionId(instanceId)
getItemInstanceLifecycle(instanceId)
```

Nie używać pełnego legacy Equipment view, jeśli potrzebne są tylko:

```text
ownerId
location
definitionId
lifecycleState
```

## 2.5 Persistence pozostaje odroczone

Commit fizycznego położenia przedmiotu nie może ponownie uruchamiać pełnej synchronicznej serializacji całego store’a.

Wymagane:

```text
in-memory commit
→ snapshot update
→ deferred persistence
→ flush on idle / pagehide / controlled boundary
```

---

# 3. Ochrona istniejących fast pathów CyberGrid

World Bridge nie może modyfikować ani omijać istniejących zoptymalizowanych ścieżek:

```text
same-grid placement
cross-container transfer
grid hover targeting
workspace switch cache
deferred ItemInstance persistence
```

## 3.1 Same-grid placement

Przeniesienie itemu w obrębie tego samego grida pozostaje lokalną operacją Equipment.

Nie może przechodzić przez:

```text
World Bridge
Services
Market
Billing
Subscriptions
Cyberware Runtime
Planner
```

World Bridge nie przechwytuje zwykłych operacji użytkownika na gridzie.

## 3.2 Cross-container transfer

Transfer pomiędzy istniejącymi kontenerami pozostaje domeną Equipment / ItemInstance.

Bridge może zlecić transfer tylko wtedy, gdy jest to końcowy rezultat operacji świata, np.:

```text
vendor custody
→ Housing storage

Housing storage
→ Service custody

Service custody
→ BODY
```

Nie powinien duplikować generycznej logiki transferu.

## 3.3 Grid DOM

Eventy bridge’a nie mogą powodować pełnej rekonstrukcji wszystkich aktywnych gridów.

Po operacji dotyczącej jednego itemu preferowane jest:

```text
patch one item node
patch source occupancy
patch destination occupancy
update local counters
```

Pełny rebuild grida jest fallbackiem wyłącznie po wykrytej niespójności.

## 3.4 Brak eventów per pointer / selection

Bridge nie może podpinać globalnych listenerów, które reagują na:

```text
hover
pointermove
grid selection
container selection
Bodymap selection
Cyberware tab switch
```

Jego eventy dotyczą wyłącznie zmian domenowych i statusów operacji świata.

---

# 4. Zasady budowania EquipmentState

## 4.1 EquipmentState wyłącznie wtedy, gdy jest potrzebny

Pełny `EquipmentState` może być budowany po:

```text
realnej zmianie lokalizacji
equip / unequip
instalacji / demontażu / replace
zmianie occupancy
zmianie danych wpływających na reguły slotów
```

Nie może być budowany po:

```text
quote
provider selection
coverage preview
billing authorization
service scheduling
status polling
event retry
opening linked record
```

## 4.2 Jedno budowanie na refresh

Każda ścieżka, która naprawdę wymaga nowego `EquipmentState`, może zbudować go maksymalnie raz.

Prawidłowo:

```text
refreshEquipmentWorkspace()
→ build state once
→ pass state to all dependent renderers
```

Nieprawidłowo:

```text
refreshEquipmentWorkspace()
→ getEquipmentState()

renderEquipmentModule()
→ getEquipmentState()

renderBodymap()
→ getEquipmentState()
```

## 4.3 State przekazywany do rendererów

Renderer nie powinien samodzielnie pobierać pełnego stanu, jeśli caller już go posiada.

Preferowany kontrakt:

```js
renderEquipmentModule({
  citizen,
  equipmentState,
  cyberwareRuntime,
  invalidationContext
})
```

## 4.4 Brak EquipmentState w background/status flows

Obsługa eventów:

```text
ws:service-order-updated
ws:billing-transaction-updated
ws:market-order-updated
ws:subscription-entitlement-changed
```

nie może domyślnie pobierać pełnego EquipmentState.

---

# 5. ItemInstance jako jedyne źródło fizycznego przedmiotu

World Bridge musi zachować:

```text
1 instanceId
= 1 fizyczny egzemplarz
= 1 owner
= 1 lifecycle
= 1 aktualna lokalizacja
```

Zabronione:

- tworzenie kopii itemu w Service;
- tworzenie kopii itemu w Market;
- tworzenie kopii itemu w Cyberware;
- zapisywanie osobnego rekordu instalowanego implantu;
- tworzenie tymczasowego `cyberwareList`;
- zachowywanie drugiej lokalizacji w polach kompatybilności.

## 5.1 Minimalne mutacje

Bridge zleca zmianę przez kanoniczne API ItemInstance.

Przykładowe operacje:

```js
createItemInstanceFromMarketOrder(input)
moveItemInstanceToService(instanceId, serviceOrderId)
commitItemInstanceBodyPlacement(instanceId, bodyPlacement)
commitItemInstanceHousingPlacement(instanceId, housingPlacement)
commitItemInstanceReplacement(oldInstanceId, newInstanceId, input)
```

## 5.2 Brak bezpośredniego zapisu pól legacy

World Bridge nie zapisuje bezpośrednio:

```text
containerPlacement
housingPlacement
equippedLocation
cyberwareList
installedCyberwareId
sourceEquipmentItemId
equipmentItemId
```

Jeżeli pola kompatybilności nadal istnieją, aktualizuje je kanoniczny ItemInstance Store.

## 5.3 Atomowość replace

Replace musi blokować obie instancje i oba miejsca docelowe.

```text
old BODY
new STORAGE
→ atomic transaction
→ old STORAGE
new BODY
```

Po błędzie:

```text
old remains BODY
new remains STORAGE
```

Nie dopuszczać połowicznego commitu.

---

# 6. Lokalizacje World Bridge

Bridge powinien korzystać wyłącznie z kanonicznych lokalizacji projektu.

Wymagane obsługiwane stany przepływu:

```text
MARKET / VENDOR CUSTODY
SERVICE
HOUSING STORAGE
CONTAINER GRID
BODY
DESTROYED / DISPOSED
```

Każda lokalizacja tymczasowa musi posiadać właściciela kontekstu:

```js
{
  type: "SERVICE",
  serviceOrderId: "service_order_...",
  providerId: "provider_..."
}
```

Nie tworzyć anonimowych stanów:

```text
PENDING
TEMP
CYBERWARE_STORAGE
SURGERY
UNKNOWN
ORPHAN
```

## 6.1 Powrót z Service

Każda operacja demontażu, replace albo nieudanej instalacji musi posiadać jawny `returnLocation`.

Brak prawidłowego miejsca docelowego powinien blokować operację przed rozpoczęciem:

```text
RETURN_LOCATION_REQUIRED
HOUSING_DESTINATION_REQUIRED
CONTAINER_DESTINATION_REQUIRED
```

Nie wolno po błędzie pozostawić itemu w pustym `SERVICE`.

---

# 7. Cache model wymagany przed implementacją bridge’a

## 7.1 Osobne cache domenowe

Minimalny podział:

```text
Equipment runtime cache
Cyberware runtime cache
Planner context cache
Maintenance context cache
Subscription entitlement cache
Provider capability cache
Market offer cache
Service order projection cache
Coverage quote cache
Firmware eligibility cache
```

## 7.2 Klucze cache

Cache powinny być kluczowane po stabilnych identyfikatorach i revision.

Przykład:

```text
equipment:{citizenId}:{equipmentRevision}
cyberware:{citizenId}:{cyberwareRevision}
entitlement:{citizenId}:{providerId}:{subscriptionRevision}
provider:{providerId}:{providerRevision}
marketOffer:{marketOfferId}:{offerRevision}
serviceOrder:{serviceOrderId}:{orderRevision}
```

## 7.3 Brak invalidacji globalnej

Zabronione:

```text
clear all caches
rerender all modules
rebuild all citizens
```

po jednej operacji jednego gracza.

Event musi wskazywać:

```text
citizenId
instanceIds
providerId
changedDomains
revision
```

## 7.4 Lazy recompute

Cache dirty nie oznacza natychmiastowego przeliczenia.

Prawidłowo:

```text
event marks cache dirty
→ active panel requests data
→ recompute once
```

Nieprawidłowo:

```text
event marks cache dirty
→ immediate recompute Equipment
→ immediate recompute Cyberware
→ immediate recompute Planner
→ immediate recompute Maintenance
```

---

# 8. Eventy i kontrola refreshu

## 8.1 Event końcowy bridge’a

Główny event:

```text
ws:cyberware-world-operation-updated
```

powinien być emitowany po zmianie statusu operacji.

Pełny refresh UI powinien być dopuszczony tylko dla statusów końcowych:

```text
COMPLETED
FAILED
CANCELLED
PAYMENT_RECOVERY_REQUIRED
```

Statusy pośrednie aktualizują lokalny panel operacji.

## 8.2 Event fizycznej mutacji

Po udanym commicie ItemInstance potrzebny jest jeden event niskopoziomowy zawierający:

```js
{
  citizenId,
  instanceIds,
  previousLocations,
  nextLocations,
  changedDomains: ["ITEM_INSTANCE", "EQUIPMENT", "CYBERWARE"],
  revision
}
```

Bridge nie powinien emitować kilku semantycznie równoważnych eventów dla tego samego commitu.

## 8.3 Deduplikacja eventów

Event handler powinien ignorować:

```text
revision <= lastProcessedRevision
duplicate operationId + revision
duplicate idempotencyKey
```

## 8.4 Brak pełnego refreshu po eventach technicznych

Eventy takie jak:

```text
billing intent authorized
stock reserved
service order scheduled
coverage resolved
```

nie zmieniają CyberGrid ani Equipment.

Nie mogą ich odświeżać.

---

# 9. UI integration z Cyberware UI 13.0x

World Bridge ma użyć istniejącego UI 13.0x bez przebudowy modułu.

## 9.1 Workspace switching

Bridge nie może naruszyć zoptymalizowanego przełączania:

```text
CYBERGRID ↔ CYBERWARE
```

Kliknięcie zakładki pozostaje zmianą UI:

```text
toggle mounted workspace
→ no full EquipmentState
→ no Planner rebuild
→ no module root innerHTML replacement
```

## 9.2 Overview

Overview może pokazywać lekkie summary:

```text
active entitlement count
next service status
coverage status
firmware warning count
payment warning count
```

Summary nie może pobierać pełnego EquipmentState.

## 9.3 Planner

Planner może korzystać z bridge’a do:

```text
provider selection
quote
coverage
service order creation
```

Ale:

- wybór providera nie przebudowuje wszystkich ItemInstance;
- zmiana selecta nie przebudowuje katalogu;
- quote jest pure/read-only;
- preview nie zapisuje danych;
- order powstaje wyłącznie po explicit confirm;
- Planner cache jest unieważniany tylko po zmianie kandydatów, occupancy albo provider capability.

## 9.4 Maintenance

Maintenance nie może po każdym statusie Service:

```text
rebuild Cyberware Runtime
rebuild EquipmentState
rebuild Planner
```

Dopiero potwierdzony wynik mutacji ItemInstance unieważnia odpowiednie cache.

## 9.5 History

History korzysta z referencji:

```text
serviceOrderId
billingTransactionId
providerId
operationId
```

Nie powinna łączyć rekordów przez pełne skanowanie wszystkich domen podczas renderu.

---

# 10. Wymagania wobec Market

Market przed 14.0x musi zapewnić:

```text
indexed offer lookup
indexed vendor lookup
stock reservation
idempotent checkout
explicit destination
one ItemInstance creation
one final order event
```

## 10.1 Zakup do Housing

Przed autoryzacją Billing należy zweryfikować:

```text
Housing destination exists
storage belongs to citizen
space can be reserved
item dimensions are known
placement can be committed
```

Nie tworzyć ItemInstance przed potwierdzeniem, że operacja ma kontrolowany fallback.

## 10.2 Purchase with Service

Item po zakupie powinien otrzymać kontrolowaną lokalizację:

```text
SERVICE
```

z referencją do:

```text
serviceOrderId
providerId
marketOrderId
```

Nie powinien pojawić się tymczasowo w CyberGridzie ani Housing tylko po to, aby zaraz zostać przeniesiony.

## 10.3 Market UI nie odświeża Equipment

Dodanie do koszyka, quote i checkout pending nie zmieniają Equipment.

Dopiero `ItemInstance created + placement committed` unieważnia Equipment.

---

# 11. Wymagania wobec Services

Services przed 14.0x musi zapewnić:

```text
service definition
offer
order
result
revision
idempotencyKey
subjectRefs.instanceIds
returnLocation
providerId
billingRefs
```

## 11.1 Service nie mutuje Equipment bez bridge’a

Service generuje wynik:

```js
{
  itemMutations: [],
  conditionChanges: [],
  firmwareChanges: []
}
```

Bridge waliduje wynik i wywołuje kanoniczne API ItemInstance / Cyberware.

## 11.2 Service status nie zmienia gridów

Statusy:

```text
SCHEDULED
IN_PROGRESS
```

nie powinny automatycznie usuwać itemu z aktywnego grida, chyba że start usługi jest jawnie zdefiniowany jako moment przekazania itemu do provider custody.

Moment fizycznego transferu musi być jednoznaczny:

```text
on order authorization
on service start
or on controlled execute step
```

Nie może zależeć od renderu UI.

## 11.3 Result commit

Service order może zostać oznaczony jako `COMPLETED` dopiero po udanym commicie ItemInstance.

---

# 12. Wymagania wobec Subscriptions i Coverage

Subscriptions i coverage nie mogą wpływać na Equipment podczas zwykłego renderu.

Resolver entitlement:

```js
resolveSubscriptionEntitlement(...)
```

musi być:

- read-only;
- deterministyczny;
- cache’owalny;
- indeksowany po citizen/provider/entitlement/revision;
- bez pełnego skanowania Equipment;
- bez emisji eventów mutacyjnych.

Coverage preview nie może:

```text
modyfikować salda
tworzyć Billing intent
tworzyć Service order
zmieniać ItemInstance
invalidować Equipment
```

---

# 13. Wymagania wobec Billing

Billing nie może emitować eventów powodujących pełny refresh Equipment.

Dla operacji świata:

```text
PENDING
AUTHORIZED
CAPTURED
FAILED
REFUNDED
```

Equipment reaguje wyłącznie wtedy, gdy Billing failure powoduje kompensację już zatwierdzonej mutacji fizycznej.

W standardowym flow:

```text
Billing authorized
→ no Equipment refresh

ItemInstance committed
→ one Equipment invalidation

Billing captured
→ local payment/status update only
```

---

# 14. Wymagania wobec Housing

Housing musi udostępnić lekkie API:

```js
getHousingStorage(housingStorageId)
validateHousingPlacement(input)
reserveHousingPlacement(input)
commitHousingPlacement(input)
releaseHousingPlacementReservation(reservationId)
```

Walidacja miejsca nie powinna budować całego EquipmentState wszystkich obywateli.

Dla jednego itemu potrzebne są:

```text
target storage dimensions
current occupancy target storage
item dimensions
owner validation
reservation revision
```

## 14.1 Reservation

W operacjach wielodomenowych miejsce powinno być rezerwowane przed finalnym commitem.

To ogranicza race condition:

```text
quote valid
→ another item fills storage
→ final placement fails after Billing
```

---

# 15. Transakcje i blokady

World Bridge powinien utrzymywać minimalne locki:

```text
instance lock
market stock reservation
housing placement reservation
service order revision lock
billing intent state lock
```

## 15.1 Zakres locka

Nie blokować całego store’a ani całego citizen Equipment.

Lock powinien dotyczyć:

```text
konkretnego instanceId
konkretnego storage
konkretnego marketOfferId
konkretnej operationId
```

## 15.2 Czas locka

Lock nie może pozostawać aktywny po:

```text
COMPLETED
FAILED
CANCELLED
EXPIRED
```

## 15.3 Idempotency

Każda komenda tworząca rekord musi przyjmować `idempotencyKey`.

Powtórzenie nie może tworzyć:

```text
drugiego ItemInstance
drugiego market order
drugiego service order
drugiej płatności
drugiego serviceHistory entry
drugiego firmware entry
```

---

# 16. Persistence i serializacja

## 16.1 Brak pełnej serializacji po każdym etapie

Operacja wielodomenowa nie powinna zapisywać całego stanu aplikacji po:

```text
quote
reserve
authorize
schedule
start
commit
capture
complete
```

Wymagany model:

```text
small in-memory mutations
→ deferred domain persistence
→ controlled flush at transaction boundary
```

## 16.2 Krytyczny flush

Jawny flush może być wymagany po:

```text
final ItemInstance commit
Billing capture
operation completion
pagehide
```

Nadal nie powinien serializować niezmienionych domen bez potrzeby.

## 16.3 Recovery record

Przed krytycznym commitem bridge powinien posiadać mały rekord operacji wystarczający do recovery:

```text
operationId
currentStep
instanceIds
reservations
billingIntentId
serviceOrderId
marketOrderId
lastRevision
```

Nie należy kopiować do niego całych rekordów katalogowych ani pełnego EquipmentState.

---

# 17. Migracja i cleanup

Dopuszczalne jest świadome wyczyszczenie:

```text
starych danych Equipment
starych Subscriptions
starych Service runtime records
starych Market runtime orders
nieistotnych danych seedowych
```

jeśli pozwala to usunąć:

```text
legacy projections
duplicate item records
orphan locations
records without providerId
records without stable IDs
parallel subscription state
```

Nie przywracać compatibility layerów wyłącznie po to, aby zachować niekrytyczne dane pre-alpha.

## 17.1 Warunek cleanupu Equipment

Cleanup nie może usuwać:

```text
aktualnych definicji katalogowych
kanonicznych ItemInstance potrzebnych do testów
Core Stack definitions
Bodymap region model
CyberGrid layout rules
```

Można zresetować instancje i seed runtime, ale nie strukturę mechaniki.

---

# 18. Diagnostyka wydajności

Przed finalnym ZIP-em dodać tymczasowe liczniki:

```text
equipmentStateBuildCount
itemInstanceFullProjectionCount
catalogFullBuildCount
cyberwareRuntimeBuildCount
plannerBuildCount
equipmentRootReplaceCount
cyberGridRebuildCount
domainEventCount
finalRefreshCount
localStorageFullSerializeCount
```

## 18.1 Oczekiwane wyniki

### Quote

```text
equipmentStateBuildCount: 0
itemInstanceFullProjectionCount: 0
cyberGridRebuildCount: 0
finalRefreshCount: 0
```

### Provider selection

```text
equipmentStateBuildCount: 0
catalogFullBuildCount: 0
plannerBuildCount: 0 or targeted
```

### Service status update

```text
equipmentStateBuildCount: 0
cyberGridRebuildCount: 0
```

### Successful purchase to Housing

```text
ItemInstance create: 1
Housing placement commit: 1
Equipment invalidation: 1
finalRefreshCount: 1
```

### Successful install

```text
ItemInstance BODY commit: 1
Cyberware Runtime invalidation: 1
Equipment invalidation: 1
Planner invalidation: 1
finalRefreshCount: 1
```

### Repeated operation event

```text
duplicate commit: 0
duplicate ItemInstance: 0
duplicate history entry: 0
duplicate refresh: 0
```

---

# 19. Minimalne scenariusze testowe

## 19.1 Purchase to Housing

```text
offer
→ checkout
→ one ItemInstance
→ one Housing placement
→ one Equipment refresh
→ item visible in correct storage
```

Sprawdzić:

- brak pełnego skanu wszystkich ItemInstance;
- brak duplikatu po ponowieniu eventu;
- brak synchronicznego pełnego store serialization;
- brak odbudowy nieaktywnych gridów.

## 19.2 Purchase with Service

```text
offer
→ quote
→ coverage
→ Billing authorization
→ one ItemInstance in SERVICE
→ Service completion
→ same instance BODY
→ one final refresh
```

Sprawdzić:

- item nie pojawia się przejściowo w CyberGrid;
- Planner nie przebudowuje się na każdym statusie;
- Runtime powstaje dopiero po BODY commit;
- instanceId pozostaje ten sam.

## 19.3 Deinstall

```text
BODY
→ Service order
→ same instance
→ Housing storage
```

Sprawdzić:

- brak pustego `SERVICE`;
- jeden Equipment refresh;
- brak zmiany liczby itemów;
- brak nowej legacy kopii.

## 19.4 Replace

```text
old BODY
new STORAGE
→ atomic replace
→ old STORAGE
new BODY
```

Sprawdzić:

- brak stanu pośredniego widocznego w UI;
- brak podwójnego Runtime rebuild;
- jeden końcowy refresh;
- oba instanceId zachowane.

## 19.5 Maintenance

```text
same instance
→ Service
→ condition / calibration / firmware mutation
→ same location unless operation requires custody
```

Sprawdzić:

- CyberGrid nie przebudowuje się, jeśli location się nie zmieniła;
- EquipmentState nie powstaje dla samego wpisu historii;
- Runtime unieważnia się tylko, jeśli zmiana wpływa na działanie.

## 19.6 Failure and compensation

```text
Billing authorized
→ Service fails
→ no ItemInstance physical commit
→ Billing void/refund
→ no Equipment refresh
```

---

# 20. Kryteria gotowości modułów przed 14.0x

## Subscriptions

```text
[ ] indexed contract lookup
[ ] indexed catalog lookup
[ ] one entitlement resolver
[ ] resolver revision
[ ] no Equipment dependency
[ ] no render-time mutations
[ ] targeted entitlement event
```

## Services

```text
[ ] subjectRefs.instanceIds
[ ] providerId
[ ] explicit returnLocation
[ ] idempotencyKey
[ ] revision
[ ] result object
[ ] no direct Equipment mutation
[ ] no direct cyberwareList mutation
```

## Market

```text
[ ] indexed marketOfferId
[ ] stock reservation
[ ] explicit fulfillment destination
[ ] one ItemInstance creation
[ ] purchase-with-service custody state
[ ] no BODY commit
[ ] targeted completion event
```

## Billing

```text
[ ] idempotent intent
[ ] authorize/capture separation
[ ] no direct citizen balance edits outside Billing
[ ] targeted events
[ ] no Equipment refresh side effects
```

## Housing

```text
[ ] placement validation API
[ ] reservation API
[ ] commit API
[ ] targeted storage occupancy read
[ ] no global Equipment rebuild
```

---

# 21. Zalecana kolejność implementacji 14.0x

```text
1. Audit installed public APIs, revisions and prerequisite versions.
2. Bind Cyberware operations to the installed World Bridge operation record.
3. Implement quote-only projections without EquipmentState builds.
4. Route purchase-to-Housing through existing Market checkout.
5. Route purchase-and-install through existing Market-Service fulfillment.
6. Implement install/deinstall through existing Service and ItemInstance transaction APIs.
7. Implement atomic replace through the existing transaction boundary.
8. Implement maintenance and firmware through Services and Firmware Registry.
9. Register explicit retry/recovery handlers.
10. Add UI bindings without full rerenders.
11. Remove temporary diagnostics.
12. Run performance, recovery and duplicate-event tests.
```

Nie zaczynać od UI. Najpierw muszą istnieć:

```text
stable IDs
indexed reads
transactions
idempotency
targeted invalidation
```

---

# 22. Przewidywany zakres plików

Dokładna lista zależy od stanu projektu po aktualizacjach Market, Services i Subscriptions.

Prawdopodobny zakres:

```text
js/cyberware-world-bridge.js
js/item-instance-store.js
js/equipment-store.js
js/equipment-inventory.js
js/equipment-actions.js
js/cyberware-workspace.js
js/cyberware-runtime.js
js/cyberware-planner.js
js/cyberware-maintenance.js
js/subscription-api.js
js/subscription-entitlement.js
js/service-bridge-store.js
js/market-store.js
js/billing-store.js
js/housing-bridge-store.js
js/modules.js
index.html
docs/PATCH_STATE.md
docs/FILE_MAP.md
docs/contracts/world_bridge/cyberware_world_bridge_contract.md
```

Zmieniać wyłącznie pliki wymagane przez rzeczywistą integrację. Nie dotykać grid rendererów, jeśli bridge może korzystać z istniejących publicznych API.

---

# 23. Non-goals

Poza zakresem performance/EQ contract:

- nowy wygląd CyberGrid;
- nowy drag-and-drop;
- nowa Bodymapa;
- przebudowa Core Stack;
- balans cen;
- rozbudowana ekonomia stocku;
- pełne admin tools;
- nowe typy implantów;
- szeroki refaktor UI;
- refaktor Housing niezwiązany z placement API;
- przywracanie legacy danych pre-alpha.

---

# 24. Blokery dla rozpoczęcia 14.0x

Patch nie powinien rozpocząć pełnej implementacji, jeśli brakuje któregoś z poniższych elementów:

```text
BLOCKER:
Market nie posiada rezerwacji stocku.

BLOCKER:
Housing nie posiada placement reservation.

BLOCKER:
Service nie posiada instanceId w subjectRefs.

BLOCKER:
Service completion zapisuje bezpośrednio cyberwareList.

BLOCKER:
Billing nie posiada authorize/capture separation.

BLOCKER:
Subscription entitlement wymaga pełnego skanu nieindeksowanych rekordów.

BLOCKER:
Catalog lookup buduje i klonuje cały katalog dla jednego ID.

BLOCKER:
Eventy domenowe nie posiadają revision.

BLOCKER:
ItemInstance commit nadal wykonuje synchroniczną pełną serializację.

BLOCKER:
Zmiana statusu Service powoduje pełny Equipment refresh.
```

---

# 25. Acceptance criteria — performance, CyberGrid and Equipment

World Bridge 14.0x spełnia kontrakt, gdy:

```text
[ ] zwykły quote nie buduje EquipmentState
[ ] wybór providera nie projektuje wszystkich ItemInstance
[ ] lookup definicji nie buduje całego katalogu
[ ] status Service nie przebudowuje CyberGrid
[ ] status Billing nie przebudowuje CyberGrid
[ ] purchase tworzy dokładnie jeden ItemInstance
[ ] install zachowuje ten sam instanceId
[ ] deinstall zachowuje ten sam instanceId
[ ] replace jest atomowy
[ ] Housing placement jest rezerwowany przed commitem
[ ] ItemInstance persistence pozostaje deferred
[ ] zakończona operacja emituje jeden kontrolowany refresh
[ ] nieaktywne workspace’y nie są przebudowywane
[ ] CYBERGRID ↔ CYBERWARE pozostaje bez pełnego rerenderu
[ ] same-grid drag/drop pozostaje bez freeza
[ ] cross-container transfer pozostaje poprawny
[ ] Bodymap i anchor layout nie są przebudowywane przy status updates
[ ] Planner nie jest przebudowywany przy każdym evencie
[ ] duplicate event nie tworzy drugiego itemu ani drugiego wpisu historii
[ ] failure compensation nie pozostawia orphan itemu
[ ] brak powrotu legacy cyberwareList jako źródła prawdy
```

---

# 26. Installed stability baseline and continuing verification

Stability 14.1x and Compensation 14.2x are installed. Remaining verification is findings-driven and uses the existing test harness. Continuing scope:

- profiling rzeczywistych operacji;
- audyt liczby `EquipmentState` buildów;
- audyt pełnych projekcji ItemInstance;
- audyt katalog lookupów;
- audyt event storms;
- audyt podwójnych refreshy;
- testy idempotency;
- testy race condition stock/Housing/Service;
- testy compensation;
- testy stale Planner context;
- testy retry Billing capture;
- usunięcie pozostałych legacy adapterów;
- sprawdzenie, czy żaden status update nie rekonstruuje CyberGrid;
- sprawdzenie, czy localStorage nie jest synchronicznie serializowany w hot path.

---

# 27. Finalna zasada implementacyjna

```text
World Bridge ma koordynować domeny.
Nie może stać się nowym monolitycznym store’em.
```

```text
CyberGrid i Equipment reagują na fizyczny commit ItemInstance.
Nie reagują na każdy status operacji świata.
```

```text
Jedna operacja wielodomenowa
→ jedna fizyczna mutacja
→ jedna precyzyjna invalidacja
→ jeden kontrolowany refresh UI.
```
