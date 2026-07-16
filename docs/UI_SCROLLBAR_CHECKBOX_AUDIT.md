# Audyt i standard UI: jeden scrollbar i jeden checkbox

## Status dokumentu

Ten dokument jest audytem oraz wiążącą specyfikacją docelową. Nie wprowadza jeszcze zmian w CSS ani HTML/JS.

Cel:

- jeden globalny wygląd scrollbara w całej aplikacji;
- jeden globalny wygląd natywnego checkboxa;
- jeden właściciel CSS dla obu komponentów;
- zakaz tworzenia lokalnych wariantów w modułach i lazy bundle'ach;
- automatyczna kontrola regresji w testach kontraktowych.

## Decyzja właścicielska

Docelowym i jedynym właścicielem wyglądu obu kontrolek powinien być nowy eager stylesheet:

```text
css/ui-controls.css
```

Plik powinien być ładowany dokładnie raz z `index.html`, po `css/modules.css`, analogicznie do `css/system-tabs.css`. Nie może być ponownie dołączany przez żaden lazy bundle.

Po migracji:

- inne pliki mogą ustalać `overflow`, `max-height`, `overscroll-behavior`, położenie i layout kontenera;
- `scrollbar-gutter` może pozostać regułą layoutową;
- wrapper checkboxa może ustalać grid/flex, gap, tekst i rozmieszczenie labela;
- żaden inny plik nie może definiować wyglądu scrollbara ani samego pola checkboxa.

---

## 1. Kanoniczny scrollbar

### Wzorzec referencyjny

Wymaganym wyglądem jest obecny scrollbar paneli Admin z:

```text
css/admin-control.css:1056-1078
```

Ten sam blok jest obecnie zduplikowany w:

```text
css/admin-control.css:1720-1742
```

### Stałe wartości

```text
Firefox width: thin
WebKit width: 10px
WebKit height: 10px

Firefox thumb: rgba(143, 189, 180, 0.42)
Firefox track: rgba(0, 0, 0, 0.28)

WebKit track background: rgba(0, 0, 0, 0.28)
WebKit track border: 1px solid rgba(143, 189, 180, 0.08)

WebKit thumb background: rgba(143, 189, 180, 0.36)
WebKit thumb border: 1px solid rgba(143, 189, 180, 0.16)
```

### Docelowa reguła

Scrollbar ma być globalny, a nie aktywowany dodatkową klasą. Każdy widoczny scrollbar aplikacji powinien automatycznie otrzymać ten sam wygląd.

Docelowa definicja w `css/ui-controls.css`:

```css
:root {
  --ui-scrollbar-size: 10px;
  --ui-scrollbar-thumb-firefox: rgba(143, 189, 180, 0.42);
  --ui-scrollbar-thumb: rgba(143, 189, 180, 0.36);
  --ui-scrollbar-thumb-border: rgba(143, 189, 180, 0.16);
  --ui-scrollbar-track: rgba(0, 0, 0, 0.28);
  --ui-scrollbar-track-border: rgba(143, 189, 180, 0.08);
}

* {
  scrollbar-width: thin;
  scrollbar-color: var(--ui-scrollbar-thumb-firefox) var(--ui-scrollbar-track);
}

*::-webkit-scrollbar {
  width: var(--ui-scrollbar-size);
  height: var(--ui-scrollbar-size);
}

*::-webkit-scrollbar-track {
  background: var(--ui-scrollbar-track);
  border: 1px solid var(--ui-scrollbar-track-border);
}

*::-webkit-scrollbar-thumb {
  background: var(--ui-scrollbar-thumb);
  border: 1px solid var(--ui-scrollbar-thumb-border);
}

*::-webkit-scrollbar-corner {
  background: var(--ui-scrollbar-track);
}
```

Nie należy dodawać lokalnych kolorów hover, innych szerokości ani wariantów `thin/auto/none`.

### `scrollbar-gutter`

Obecna reguła powinna pozostać:

```text
css/base.css:93-95
```

```css
html {
  scrollbar-gutter: stable;
}
```

Jest to reguła stabilności layoutu, a nie wyglądu scrollbara. Lokalne użycie `scrollbar-gutter` jest dozwolone tylko wtedy, gdy zapobiega zmianie geometrii konkretnego workspace. Nie może zmieniać kolorów ani szerokości scrollbara.

### Obecne lokalne implementacje do migracji

| Plik | Obecna sekcja | Działanie docelowe |
|---|---|---|
| `css/admin-control.css` | `1056-1078` | użyć jako wzorca, następnie usunąć po przeniesieniu |
| `css/admin-control.css` | `1720-1742` | usunąć duplikat |
| `css/billing.css` | `597-611` | usunąć lokalny WebKit scrollbar |
| `css/equipment.css` | `2418-2439` | usunąć lokalny Inspector scrollbar |
| `css/equipment.css` | okolice `3571`, `4813`, `4845` | usunąć lokalne kolory i szerokości |
| `css/modules.css` | `1545-1546` | usunąć lokalny Tag Picker scrollbar |
| `css/terminal-effects.css` | `571-590` | usunąć lokalny Terminal Log scrollbar |
| `css/cyberware-anatomy-bodymap.css` | `25` | usunąć lokalne kolory i szerokość |

Kontenery zachowują swoje `overflow`, `max-height`, sticky positioning i `overscroll-behavior`.

---

## 2. Kanoniczny checkbox

### Wzorzec referencyjny

Obecny kanoniczny wygląd znajduje się w:

```text
css/modules.css:885-947
```

Właścicielem checkboxa pozostaje nazwa klasy:

```text
ui-select-control
```

Docelowy selektor powinien jawnie obejmować wyłącznie checkbox:

```css
input[type="checkbox"].ui-select-control
```

Radio button nie jest checkboxem i po migracji nie może dziedziczyć tej samej kwadratowej prezentacji. Standaryzacja radio pozostaje osobnym zadaniem.

### Stałe wartości checkboxa

```text
size: 18px x 18px
border: 1px solid rgba(143, 189, 180, 0.42)
background: rgba(0, 0, 0, 0.42)
inner shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.68)
mark size: 8px x 8px
mark color: var(--ok)
mark glow: 0 0 10px rgba(143, 189, 180, 0.38)
focus outline: 1px solid rgba(143, 189, 180, 0.75)
focus offset: 2px
disabled opacity: 0.45
```

### Docelowa definicja

```css
input[type="checkbox"].ui-select-control {
  appearance: none;
  box-sizing: border-box;
  width: 18px;
  height: 18px;
  min-width: 18px;
  min-height: 18px;
  max-width: 18px;
  max-height: 18px;
  aspect-ratio: 1 / 1;
  flex: 0 0 18px;
  margin: 0;
  padding: 0;
  border: 1px solid rgba(143, 189, 180, 0.42);
  background: rgba(0, 0, 0, 0.42);
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.68);
  display: inline-grid;
  cursor: pointer;
  vertical-align: middle;
}

input[type="checkbox"].ui-select-control::after {
  content: "";
  width: 8px;
  height: 8px;
  display: block;
  justify-self: end;
  align-self: end;
  margin: 0 2px 2px 0;
  background: transparent;
  transition: background 120ms ease, box-shadow 120ms ease;
}

input[type="checkbox"].ui-select-control:checked {
  border-color: rgba(143, 189, 180, 0.62);
  background: rgba(143, 189, 180, 0.13);
}

input[type="checkbox"].ui-select-control:checked::after {
  background: var(--ok);
  box-shadow: 0 0 10px rgba(143, 189, 180, 0.38);
}

input[type="checkbox"].ui-select-control:focus-visible {
  outline: 1px solid rgba(143, 189, 180, 0.75);
  outline-offset: 2px;
}

input[type="checkbox"].ui-select-control:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
```

### Jedyny dozwolony markup

```html
<label class="module-specific-layout-wrapper">
  <input class="ui-select-control" type="checkbox" name="example">
  <span>Example</span>
</label>
```

Wrapper może mieć nazwę modułową, ale nie może stylować `width`, `height`, `appearance`, `accent-color`, border, background, markera, focusu ani disabled samego inputa.

### Obecne odstępstwa w CSS

| Plik | Obecna sekcja | Problem |
|---|---|---|
| `css/citizen-admin-editor.css` | `189-194` | lokalny rozmiar i `accent-color` |
| `css/citizen-admin-editor.css` | `315-319` | drugi rozmiar `16px` i `accent-color` |
| `css/admin-control.css` | `1216-1220`, `1674-1677`, `1880+` | wyjątki dla inputów bez klasy kanonicznej |
| `css/modules.css` | `885-947` | obecny właściciel do przeniesienia do `ui-controls.css` |

Style labeli, np. `.admin-form-checkbox`, `.toggle-field` lub `.citizen-admin-checkbox`, mogą zostać tylko jako układ i typografia wrappera.

### Obecny markup bez klasy kanonicznej

Do migracji należy co najmniej:

```text
js/access-control.js:490, 559
js/case-files.js:534
js/citizen-admin-editor.js:238, 272, 338, 363
js/citizen-creator.js:286
js/citizen-database.js:238, 527
js/citizen-records.js:72
js/housing-market-runtime.js:1989
js/market-workspace-runtime.js:1721
```

Każdy z tych checkboxów powinien otrzymać `class="ui-select-control"`. Audyt wdrożeniowy musi ponownie przeskanować całe repozytorium, ponieważ numery linii mogą zmienić się przed implementacją.

---

## 3. Reguły bez wyjątków dla nowych zmian

### Scrollbar

Nowy kod nie może dodawać poza `css/ui-controls.css`:

```text
scrollbar-width
scrollbar-color
::-webkit-scrollbar
::-webkit-scrollbar-track
::-webkit-scrollbar-thumb
::-webkit-scrollbar-corner
```

Dozwolone lokalnie pozostają:

```text
overflow
overflow-x
overflow-y
overscroll-behavior
scrollbar-gutter
max-height
```

### Checkbox

Nowy checkbox musi:

- być natywnym `input[type="checkbox"]`;
- posiadać klasę `ui-select-control`;
- mieć dostępny label albo `aria-label`;
- korzystać z natywnych stanów `checked`, `disabled` i `focus-visible`;
- nie posiadać lokalnej klasy zmieniającej jego wygląd.

Poza `css/ui-controls.css` zabronione są reguły zmieniające wygląd checkboxa, w szczególności:

```text
appearance
accent-color
width / height inputa
border inputa
background inputa
box-shadow inputa
checked marker
focus outline inputa
disabled opacity inputa
```

Wyjątkiem dostępności jest systemowy tryb `forced-colors`. Ewentualna reguła dla niego nadal musi znajdować się w `css/ui-controls.css`.

---

## 4. Wymagane zabezpieczenie kontraktowe

Należy dodać test, np.:

```text
tests/contracts/ui-controls-single-owner.test.cjs
```

Test powinien wymuszać:

1. `css/ui-controls.css` jest eager-loaded dokładnie raz.
2. Każdy `input[type="checkbox"]` w `index.html` oraz generowanym markupie JS zawiera `ui-select-control`.
3. Żaden plik CSS poza `css/ui-controls.css` nie zawiera pseudo-elementów `::-webkit-scrollbar*`.
4. Żaden plik CSS poza `css/ui-controls.css` nie ustawia `scrollbar-width` ani `scrollbar-color`.
5. Żaden plik CSS poza `css/ui-controls.css` nie ustawia `accent-color` dla checkboxa.
6. Nie istnieje lokalny selektor `input[type="checkbox"]` zmieniający wygląd kontrolki.
7. `css/ui-controls.css` zachowuje ustalone wartości rozmiaru, kolorów, focusu i disabled.

Test powinien używać jawnej allowlisty wyłącznie dla `css/ui-controls.css`. Nie należy tworzyć allowlist per moduł, ponieważ odtworzyłoby to obecny problem wyjątków.

---

## 5. Walidacja wizualna po implementacji

### Scrollbar

Sprawdzić w Chromium i Firefox:

- główny dokument;
- Admin Data Table;
- Admin Record List;
- Terminal Log;
- Billing Ledger;
- Equipment/Cybergrid Inspector;
- Cyberware Index i Inspector;
- Tag Picker;
- modal oraz panel z przewijaniem poziomym.

W każdym miejscu scrollbar musi mieć ten sam rozmiar i kolory. Moduł może różnić się wysokością kontenera, ale nie wyglądem scrollbara.

### Checkbox

Sprawdzić:

- unchecked;
- checked;
- keyboard focus;
- disabled unchecked;
- disabled checked;
- długi label i zawijanie tekstu;
- checkbox w gridzie, formularzu, tabeli i modalu;
- sterowanie klawiszem Space.

Checkbox musi zachować geometrię `18px x 18px` w każdym kontekście.

---

## 6. Kolejność wdrożenia

1. Utworzyć `css/ui-controls.css` z obiema definicjami kanonicznymi.
2. Załadować plik dokładnie raz z `index.html`.
3. Dodać `ui-select-control` do wszystkich checkboxów.
4. Oddzielić radio buttony korzystające obecnie z `ui-select-control`.
5. Usunąć lokalne style checkboxów i `accent-color`.
6. Usunąć wszystkie lokalne style scrollbarów.
7. Pozostawić lokalny layout kontenerów i labeli.
8. Dodać test `ui-controls-single-owner.test.cjs`.
9. Wykonać testy kontraktowe i wizualną kontrolę Chromium/Firefox.

## Kryterium zakończenia

Migracja jest kompletna dopiero wtedy, gdy:

```text
liczba właścicieli wyglądu scrollbara = 1
liczba właścicieli wyglądu checkboxa = 1
checkboxy bez ui-select-control = 0
lokalne pseudo-elementy scrollbarów = 0
lokalne kolory/szerokości scrollbarów = 0
lokalne wizualne reguły checkboxów = 0
```

Od tego momentu każda próba dodania drugiego wariantu musi powodować błąd testu kontraktowego.
