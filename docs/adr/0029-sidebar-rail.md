# ADR-0029: Collapsible sidebar (icon rail)

**Status:** Accepted  
**Date:** 2026-10-30  
**Amended:** 2026-10-30 (§2, toggle placement)  
**Deciders:** Project owner

## Context

The desktop sidebar was always 240px ([0005](./0005-routing-and-app-shell.md)). On Logs and Insights that width belongs to the data. The owner wanted to collapse and expand it.

Three directions were prototyped behind a picker on dev data, in the real shell:

- **Rail**: docked; collapses to an icon rail and the content takes the space.
- **Peek**: hides completely; an edge handle or hover slides it over the content; Pin docks it again.
- **Float**: always a rail; hover or keyboard focus unfolds it over the content; Pin docks it wide.

The owner kept **Rail**.

## Decision

1. **Two states, both docked.** Expanded is 240px (`--spacing-sidebar`). Collapsed is a 72px rail (`--spacing-sidebar-rail`). The main column offset follows. Nothing ever floats over the content.
2. **Toggle: the border line ("grip").** The sidebar's right border is the button: a 12px-wide hit strip centred on the line, full height. At rest it is just the border. On hover or `:focus-visible` the line turns `primary` and a round 24px handle with the chevron appears on the line, level with the logo (150ms colour/opacity fade, none under reduced motion). The cursor shows the direction (`w-resize` to collapse, `e-resize` to expand). The tooltip (Collapse / Expand menu ⌘B) sits beside the handle. **⌘B / Ctrl+B** works anywhere. Desktop only. Phones keep the bottom tabs. The brand row holds only the logo (and the name when expanded); nothing below it moves when toggling.
3. **The rail keeps everything.** Brand mark, the session chip, all six nav icons, Commands (search icon) and the profile avatar. Nothing moves to another menu.
4. **Session chip in the rail.** Live: a 48px bordered tile with the live dot and `formatCompact` elapsed time (`12s`, `45m`, `2h 15m`). Idle: a primary play button. The full status, time and project are in the accessible name and the tooltip.
5. **Labels become tooltips.** Each rail control gets a tooltip to the right of the rail. The first one waits 400ms; the next one opens at once while warm (300ms). It shows on `:focus-visible` too. The visible label is replaced by an `sr-only` one, so the accessible name does not change.
6. **No width animation.** The rail and the content snap ([motion.md](../motion.md): width and margin are not animated). The toggle is frequent and often from the keyboard.
7. **Per device, in a cookie.** `vynno_sidebar=rail` is read in `+layout.server.ts`, so SSR renders the right width and markup with no flash. A wide monitor and a laptop can differ. This is not an account pref.

## Consequences

### Positive

- Logs and Insights get 168px back without losing one-click navigation.
- The live session stays visible when collapsed.
- No overlay means no focus, scrim or stacking questions.

### Negative / tradeoffs

- The content jumps on toggle (no transition).
- In the rail, labels are only in tooltips. A new user has to hover the icons once.
- The toggle is invisible at rest. It is found by hovering the border, by the `resize` cursor, or through ⌘B. The handle is a raw `<button>` (allowlisted in `primitives.guard.test.ts`): a border strip, not chrome.

## Alternatives considered

| Option                                                  | Why not                                                                                                                                                               |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Peek** (hide fully, slide over on hover or handle)    | Most room, but the live session disappears and navigating takes two steps (show, then click). The edge hover zone fires by accident.                                  |
| **Float** (rail that unfolds over the content on hover) | No reflow, but passing the pointer across the rail unfolds it. Hover intent needs a delay, which makes deliberate use feel slow.                                      |
| Animate the rail width                                  | Width and margin animation are banned outside the header accordion ([motion.md](../motion.md)). The toggle is a keyboard-frequent action, and those don't animate.    |
| Toggle in the brand row (first build)                   | In the rail it sat under the logo and pushed the session tile and nav down. The owner did not want it there.                                                          |
| Toggle as a bordered button on the border ("Edge")      | Always visible and placed well, but a permanent element half over the content edge.                                                                                   |
| The logo becomes the toggle on hover ("Logo swap")      | Tidy rail, but the expanded chevron appears only on sidebar hover, and two different controls for one action.                                                         |
| `localStorage` + `app.html` script (like the theme)     | The markup differs between the states, not only the CSS. SSR would render expanded markup into a 72px nav until hydration. A cookie lets SSR render the final markup. |

## Related

- [0005](./0005-routing-and-app-shell.md) app shell
- [../design-system.md](../design-system.md) SideNav
- [../motion.md](../motion.md)
