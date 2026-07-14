# Market Cart Navigation Contract

## Scope

This contract owns presentation semantics for the Housing Market draft cart, Product Inspector and the shared Housing `Back` command.

It does not own cart, quote, order, Billing, stock, shipment or ItemInstance state.

## Cart counters

`getHousingMarketCartContext()` exposes two independent counters:

```text
lineCount = cart.lines.length
itemCount = sum(cart.lines[].quantity)
```

UI labels must preserve the distinction:

```text
LINES = distinct cart lines
ITEMS = total purchased units
```

The compact command bar may summarize item quantity and total value, but it must not label `itemCount` as line count.

## Overlay hierarchy

Market overlays are transient UI state. Interaction priority is:

```text
Product Inspector
Market Cart
Market workspace content
Housing module navigation
```

Only one overlay is treated as active for focus isolation. Product Inspector has priority if malformed state exposes both layers.

## Modal semantics

Product Inspector and Market Cart must:

- render a `role="dialog"` surface;
- use `aria-modal="true"`;
- expose `aria-hidden` on the layer;
- remove backdrop controls from sequential focus;
- trap `Tab` and `Shift+Tab` inside the active dialog;
- close on `Escape` in overlay-priority order;
- restore focus to the relevant Market trigger;
- mark non-active Market workspace siblings as `inert`;
- lock document scrolling while a Market dialog is active.

Closing an overlay must not reset Catalog filters, pagination, selected Housing target or workspace scroll.

## Back hierarchy

The shared Housing `Back` command resolves locally before leaving the module:

```text
1. open Product Inspector -> close Product Inspector
2. open Market Cart -> close Market Cart
3. Orders or Delivered -> switch to Catalog
4. Catalog with no overlay -> exit Housing to Access Panel
```

Switching away from Market, changing target Citizen or leaving Housing clears transient Market overlay state so a later entry cannot reopen a stale cart or inspector.

## Ownership

```text
Market Store
  owns cart lines, quantities, quotes and checkout state

Housing Market Runtime
  owns Market presentation state, overlay state and local navigation

Housing shell
  owns module-level Back delegation and final exit to Access Panel
```

No additional cart store, navigation store or browser-history dependency is introduced.
