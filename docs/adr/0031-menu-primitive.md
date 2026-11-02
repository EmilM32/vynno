# ADR-0031: Overflow action menus use the `Menu` primitive

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Project owner

## Context

[overlays.md](../design-system/overlays.md) said there is no popover primitive and not to hand-build one, but two had already been hand-built: the "…" overflow in `ProjectRow` (phone layout: Archive, Delete) and in `LogRow` (stacked layout: Delete). They were near copies — same `more_horiz` bordered trigger, same `role="menu"` popover with `shadow-xl`, each with its own `<svelte:window>` pointer-down and Escape listeners — and had already drifted:

|                  | `ProjectRow`          | `LogRow`                      |
| ---------------- | --------------------- | ----------------------------- |
| Popover width    | `min-w-36`            | `min-w-32`                    |
| "Outside" click  | outside the whole row | outside the trigger + popover |
| Focus on close   | lost to `<body>`      | lost to `<body>`              |
| Keyboard in menu | Tab only              | Tab only                      |

Two 1:1 copies of chrome that can drift meets the extraction bar in [ADR-0018](./0018-atomic-ui-layer.md) point 1. `NoteSuggestions` (the Timer note dropdown) also floats with `shadow-xl`, but it is an APG listbox whose focus stays in the input (`aria-activedescendant`) — a different pattern.

## Decision

1. **`Menu` + `MenuItem` in `src/lib/components/ui/`** own the overflow menu: trigger, popover chrome, `role="menu"` / `menuitem` wiring, outside pointer-down, Escape, and focus return. The API is closed — the trigger is always the bordered `sm` `more_horiz` `IconButton`, the popover always opens under its right edge, `MenuItem` has `tone` `neutral | danger` and no `class`.
2. **Focus returns to the trigger** on Escape (when focus was inside the menu) and on selecting an item, before the item's handler runs — so a `ConfirmDialog` opened from Delete restores focus to the trigger rather than to `<body>`. Up / Down / Home / End move between enabled items. Items stay in the Tab order; focus is not moved into the menu on open, matching the previous behaviour.
3. **"Outside" is the `Menu` root** (trigger + popover). For `ProjectRow` this is narrower than the old whole-row check, but every other control in that row either closes the menu itself (Edit, Restore) or navigates (the stretched link), so the outcome is unchanged.
4. **One popover width, `min-w-36`.** `LogRow`'s grows from 128px to 144px — accepted, as with the size unifications in [ADR-0017](./0017-ui-primitives.md).
5. **`shadow-*` is allowed on `Menu`** as an overlay primitive ([layout.md](../design-system/layout.md), level 2).
6. **`NoteSuggestions` stays as is.** It is a listbox, not a menu.
7. **The guard extends.** `primitives.guard.test.ts` fails on `role="menu"` / `role="menuitem"` outside `Menu.svelte` / `MenuItem.svelte`, and on visual utilities in `class` on `Menu`.

## Consequences

### Positive

- The two copies collapse to one; `ProjectRow` drops its window listeners and `inMenu` snippet flags.
- Keyboard and screen-reader users keep their place after closing the menu.
- A third row that needs a "…" gets the behaviour for free and cannot hand-build it.

### Negative / tradeoffs

- `LogRow`'s popover is 16px wider.
- No portal: the popover is `absolute`, so a row whose next sibling stacks above it still raises its action group while open (`ProjectRow` uses `bind:open` for that). Acceptable while the only call sites are list rows.

## Alternatives considered

| Option                                      | Why not                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Generic `Popover` with any content          | Becomes a dumping ground for tooltips and pickers — exactly what overlays.md forbids.                    |
| Fold `NoteSuggestions` in                   | Listbox with focus in the input vs a menu with focus on items; one API would have to fake both.          |
| Items as `Button role="menuitem"` by caller | Leaves size, width and close-then-run to each call site — the drift being removed.                       |
| Full APG menu (focus first item on open)    | Changes what pointer users see on open; kept to the previous behaviour plus focus return and arrow keys. |

## Related

- [0017-ui-primitives.md](./0017-ui-primitives.md)
- [0018-atomic-ui-layer.md](./0018-atomic-ui-layer.md)
- [../design-system/overlays.md](../design-system/overlays.md)
