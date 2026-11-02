# ADR-0032: `Select` is a themed listbox on a fine pointer, native on touch

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Project owner

## Context

`Select` wrapped a native `<select>` with a themed chevron ([forms.md](../design-system/forms.md)). Closed, it matched Dev-Density Dark. Open, the OS drew the option list: system font, system colours, light chrome in dark themes, nothing from the six palettes. It is the most-used picker in the app (Timer project and activity, the session form, four Settings rows), so the mismatch shows up on every screen that takes input.

On a phone the native picker is the better control: thumb-sized, accessible, and familiar. Only the desktop list is the problem.

## Decision

1. **Two renderings, one primitive.** `Select` reads `(pointer: coarse)` (`MediaQuery` from `svelte/reactivity`, `false` on the server). On a coarse pointer it renders the native `<select>` exactly as before. Otherwise it renders a `<button role="combobox">` trigger and a `role="listbox"` list. Closed, the two look identical, so the hydration switch on a phone is invisible.
2. **APG select-only combobox.** Focus never leaves the trigger; `aria-activedescendant` points at the active option, and the list cancels `pointerdown` so clicking an option does not blur the trigger. Arrows, Home / End, and typeahead move; Enter / Space / Tab / Alt+Arrow commit; Escape closes and stops propagation so a surrounding `Dialog` stays open. Disabled options are skipped.
3. **The trigger is a raw `<button>`**, allowlisted in `primitives.guard.test.ts`. A button is labelable, so `Field`'s `<label for>` and TaskInput's bare `<label for>` keep naming it without a new label-id in the field context. It takes field focus (on-border, `layout.css`), not the chrome ring or `.press`.
4. **The list is `popover="manual"`** in the top layer, positioned `fixed` from the trigger rect, flipping above when there is more room there. `Dialog`'s panel is `overflow-y-auto`, and an `absolute` list would be clipped by it. Dismissal is ours (Escape, outside pointer-down, blur), not light-dismiss.
5. **Options are data, not children.** `options: { value, label, disabled? }[]`, with an optional `option` snippet for row content. A custom list cannot reuse `<option>` children, and data lets typeahead and the native fallback share one source. `onchange` receives the new value string.
6. **No enter animation.** The list opens as often as the user changes their mind; [motion.md](../motion.md)'s frequency gate says no, as with `Menu`.

## Consequences

### Positive

- The open list follows the theme in all six palettes and uses the mono type scale.
- Room for row content (project colour dot) that a native `<option>` cannot show.
- Phones keep the OS picker, so the touch and screen-reader story there is unchanged.

### Negative / tradeoffs

- Two code paths in one file. The native one is small, but both need testing (desktop and `pointer: coarse` emulation).
- e2e can no longer call `selectOption` on desktop viewports; `e2e/helpers.ts` gains `pickOption` / `selectValue`.
- A custom listbox is ours to keep accessible. The native one was the browser's.

## Alternatives considered

| Option                                          | Why not                                                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Keep native everywhere                          | The open list ignores the theme — the reason for this change.                                        |
| Custom listbox on every device                  | Worse than the OS picker on a phone; more surface to keep accessible for no gain.                    |
| `<select>` with `appearance: base-select`       | Customisable select is not in every browser the app supports yet; revisit when it is, and drop this. |
| `SelectOption` children via context (like Menu) | More API for the same data; typeahead and the native fallback would have to read rendered children.  |
| Third-party (Bits UI / Melt)                    | A new dependency for one primitive; its styling would still have to be rewritten onto our tokens.    |

## Related

- [0018-atomic-ui-layer.md](./0018-atomic-ui-layer.md)
- [0031-menu-primitive.md](./0031-menu-primitive.md)
- [../design-system/forms.md](../design-system/forms.md)
