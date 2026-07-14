# UI Tabs Component Contract

## Ownership

`css/system-tabs.css` is the single visual owner of reusable tab chrome across FUTURE NOIR.

It is loaded eagerly from `index.html` after `css/modules.css`. Lazy bundles must not load a second copy.

Module styles may define only:

- grid column count;
- width and placement;
- margins and surrounding layout;
- responsive collapse rules;
- content-specific maximum widths.

Module styles must not redefine the shared border, background, active underline, hover/focus state, disabled opacity or typography of migrated tab components.

## Component families

### Large module/workspace navigation

```html
<nav class="system-segment-tabs" role="tablist">
  <button class="system-segment-tile system-segment-tile--card is-active" role="tab" aria-selected="true">
    <span class="system-segment-tile__body">
      <b class="system-segment-tile__title">Command Line</b>
      <small class="system-segment-tile__description">Text interface for terminal shortcuts.</small>
    </span>
  </button>
</nav>
```

The `Command Line` card in Terminal is the reference presentation. The same contract is used by Terminal, Service, Equipment, Housing and Subscriptions.

Available modifiers:

```text
system-segment-tile--card
system-segment-tile--compact
system-segment-tile--alert
```

### Compact section tabs and filters

```html
<nav class="system-inline-tabs" role="tablist">
  <button class="system-inline-tab is-active" role="tab" aria-selected="true">Overview</button>
</nav>
```

Optional count:

```html
<b class="system-inline-tab__count">4</b>
```

This family is used for compact navigation such as Billing sections, Terminal Inbox filters, Subscription purchase views and Admin Command sections.

### Mutually exclusive form modes

```html
<div class="system-mode-switch" role="tablist">
  <button class="system-mode-switch__option is-active" aria-pressed="true">One-time</button>
  <button class="system-mode-switch__option" aria-pressed="false">Standing order</button>
</div>
```

This family is used for transaction type, payment scope, payment source and similar form-state choices. It must not be used for module-level navigation.

## Active state

Shared CSS recognizes:

```text
.is-active
aria-selected="true"
aria-pressed="true"
aria-current="page"
```

Controls that change state without rerendering must update the matching ARIA state together with `.is-active`.

## Visual and responsive rules

Large card labels may wrap to two lines and descriptions are limited to three visible lines. This prevents long localized labels from forcing one navigation row to dominate the workspace while preserving the complete accessible name in the DOM.

Responsive module navigation follows the same density sequence:

```text
4 columns -> 2 columns -> 1 column
2 columns -> 1 column
```

A module may choose the applicable sequence based on its number of tabs, but must not jump from four cards directly to one while sufficient horizontal space remains. Housing Unit / Household / Storage / Market therefore uses four desktop columns.

The shared component owns visible keyboard focus. Disabled controls, including `aria-disabled="true"`, must not receive hover presentation.

## Scope exclusions

The contract does not automatically restyle every element whose class contains `tab`. The following remain separate until explicitly classified and migrated:

- radio-label tab systems on Citizen Card;
- data table selectors;
- dialog-local step controls;
- action buttons that only happen to use `.is-active`;
- Admin Navigation Rail items;
- Equipment/Housing grid filters with domain-specific interaction behavior.

New tab UI must select one of the three component families instead of adding another local chrome implementation.
