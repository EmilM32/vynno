# ADR-0034: `PageHeader` is a toolbar row with live context

**Status:** Accepted  
**Date:** 2026-11-03  
**Deciders:** Project owner

## Context

Every screen opened with a 24px title, a sentence of description and a hairline under both: about 130px on desktop. The title repeated the active sidebar item and the tab title; descriptions such as the dashboard's "Today's total, current focus, and this week." only named the cards below them. The hairline stopped at the content padding instead of the shell edges and was drawn even when nothing scrolled under it. Next to the dense, ruled cards it read as a document heading, not as part of the app.

Directions were prototyped on the live dashboard (`/proto/page-header`, deleted after this decision) in two rounds.

## Decision

1. **One toolbar row.** `PageHeader` lays out `eyebrow` → `leading` + `<h1>` + `titleExtra` → context → `actions` (right) in one row, at least 56px tall on desktop. The title drops to `text-headline-md`.
2. **Live context over static copy.** A new `meta` snippet renders mono context after a 1px divider. The dashboard shows the date and ISO week (`wt., 3 lis · tydz. 45`) and drops its description. `description` still works and renders inline in the same place; other screens keep theirs for now.
3. **Full-bleed, hairline on scroll.** On desktop the header bleeds to the edges of `#main-content`, pins, and draws its bottom hairline only while content is scrolled under it (`data-compact`): a 200ms `border-color` fade. The description no longer collapses, so the height-family accordion exception in [motion.md](../motion.md) is gone.
4. **The dashboard's right edge is the running session only** (`SessionHeaderChip`: live dot, project, clock, link to the Timer). Idle, it is empty.
5. **Narrow desktop gives way in order.** Too narrow for title and actions in one row (about 768–1100px with Logs or Insights controls), the actions wrap to a second row. In the title row the description or `meta` truncates first, then the title; both carry the full text in `title`.
6. Phones keep the stacked layout under `TopBar`, without a hairline.

## Rejected

| Direction                                                     | Why not                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Wrap the header in a card                                     | A box above boxes; the design system separates regions with tones and hairlines, not more frames.       |
| Today vs daily goal meter (`45m / 8h`, bar, %) on the right   | The owner did not want the goal percentage in the header; it also repeats the Today card.               |
| **Data** — page name as a mono eyebrow, the date as headline  | The date became the loudest thing on every screen; other screens have no natural "dateline".            |
| **Bez nagłówka** — no header at rest, a strip on scroll       | At rest nothing says where you are except the sidebar; adds an enter animation to a frequent scroll.    |
| **Rozdzielony** — title left, all context right               | The week total repeats the weekly chart; each screen would need its own right-side readout.             |
| **Ścieżka** — `vynno / Pulpit / …` path                       | `vynno /` carries nothing on top-level screens; a 14px title is too quiet.                              |
| **Pas tonalny** — toolbar on its own tonal band, always ruled | Reads as a window toolbar, but the always-on hairline is the divider with nothing to divide we removed. |

## Consequences

- `text-headline-lg` has no user in screens now; it stays in the scale.
- Static descriptions on Logs, Projects, Insights, Timer and Settings remain; replacing them with `meta` is a per-screen content decision.
- e2e that asserted the description collapsing on scroll now asserts the hairline state and a visible description instead.
