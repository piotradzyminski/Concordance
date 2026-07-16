# UI Controls Single-Owner Contract

## Scope

This contract owns the visual presentation of application scrollbars and native checkboxes.

```text
canonical owner: css/ui-controls.css
load mode: eager
load count: exactly once
```

## Scrollbar

All visible application scrollbars inherit the global definition from `css/ui-controls.css`.

Local CSS may own only layout behavior:

```text
overflow
overflow-x
overflow-y
overscroll-behavior
scrollbar-gutter
max-height
```

No stylesheet other than `css/ui-controls.css` may contain:

```text
scrollbar-width
scrollbar-color
::-webkit-scrollbar
::-webkit-scrollbar-track
::-webkit-scrollbar-thumb
::-webkit-scrollbar-corner
```

## Checkbox

Every visible native checkbox must use:

```html
<input class="ui-select-control" type="checkbox">
```

The input must have an accessible label through a wrapping/associated `label` or `aria-label`.

`css/ui-controls.css` is the only owner of checkbox geometry, border, background, checked marker, focus and disabled appearance.

Radio inputs must not use `ui-select-control`. Radio standardization is outside this contract.

Module CSS may style wrapper layout and text, but must not redefine checkbox appearance.

## Fixed presentation

```text
checkbox: 18px x 18px
marker: 8px x 8px
focus: 1px outline, 2px offset
disabled opacity: 0.45
scrollbar WebKit size: 10px
Firefox scrollbar width: thin
```

## Regression gate

`tests/contracts/ui-controls-single-owner.test.cjs` must fail when:

- `css/ui-controls.css` is not eager-loaded exactly once;
- a checkbox markup tag lacks `ui-select-control`;
- a radio tag uses `ui-select-control`;
- another stylesheet defines scrollbar appearance;
- another stylesheet uses `accent-color`;
- another stylesheet explicitly targets `input[type="checkbox"]`;
- canonical fixed values are removed or changed.
