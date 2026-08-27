# ADR-0018: Atomic UI layer beyond buttons

**Status:** Accepted  
**Date:** 2026-08-26  
**Deciders:** Project owner

## Context

[ADR-0017](./0017-ui-primitives.md) extracted `Button`, `IconButton`, and `Icon` after Storybook made the missing atomic layer obvious. What remained under `UI/*` was still a handful of primitives plus composed widgets (`LogRow`, `ProjectRow`, shell chrome). Larger blocks kept copy-pasting field chrome, KPI tiles, colour swatches, and status marks — the same class of drift 0017 fixed for buttons (padding, typeface, size, a11y wiring).

[design-system.md](../design-system.md) §8 already named the leftover inventory and pointed at a follow-up in 0017 that was never written.

## Decision

1. **Extract only when the 0017 bar holds.** Same visual role at ≥3 call sites (or 2 that are already 1:1 copies); chrome that can drift; presentational (no session store, no `*View.svelte`); adopted on landing with a colocated `UI/*` story.

2. **Form primitives own field chrome.** `Field`, `Input`, and `Select` in `src/lib/components/ui/`. `Field` sets context so nested `Input` / `Select` inherit `id`, `aria-invalid`, and `aria-describedby`. Callers cannot ship a labelled field without that wiring. Focus stays the global on-border rule in `layout.css` — fields are not `.focus-ring`.

3. **Marks, metrics, and feedback are atoms too.** `KpiCard`, `SwatchPicker`, `ColorDot`, `StatusDot`, `Chip`, `ProgressBar`, `Banner`. Identity (project colour) and status (live / recording) stay separate. Colour swatches stay raw `<button role="radio">` inside `SwatchPicker`, allowlisted — they are not `Button`.

4. **Do not extract** the timer card, charts, `LogRow` / `ProjectRow` (they consume atoms), a generic `Card`, the command-palette flush field, the timer `TaskInput` note (command / quick input), or login checkboxes. Login and Projects tab strips stay APG tabs, not `PeriodToggle`.

5. **The guard extends to fields.** `primitives.guard.test.ts` fails on a raw `<input>` / `<select>` and on visual utilities in `class` on `Field` / `Input` / `Select`. Allowlist entries need a reason.

## Consequences

### Positive

- Form padding, typeface, and error wiring cannot diverge per screen.
- Insights and project KPI tiles share one metric card.
- Project colour marks converge on two sizes (8px circle, 14px square) instead of three.
- Status dots are 8px as the design system specified (timer/project live were 6px).
- Storybook `UI/*` is the workshop for the atomic layer, not a catalogue of page assemblies.

### Negative / tradeoffs

- Form fields that were `py-2` grow to `min-h-10` (`md`) or `min-h-8` (`sm`). Accepted, as with the button size unification.
- Error banners drop the ad-hoc mono treatment and the `/20` fill — Inter `body-sm` on `error-container/15`.
- Project chips keep `surface-container-high` rather than the design-system “primary tint”; the atom is the place that decision now lives.

## Alternatives considered

| Option                                              | Why not                                                                                              |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Monolithic `TextField` instead of `Field` + `Input` | Colour pickers, selects, and password would re-copy the label/error layout.                          |
| Generic `Card`                                      | Padding and header/body splits vary; it would become a dumping ground.                               |
| Merge `ColorDot` and `StatusDot`                    | Identity vs live/recording are different tokens.                                                     |
| Absorb `TaskInput` into `Input variant="command"`   | Bordered on mobile, flush on desktop — a different field. Revisit after the form chrome has settled. |

## Related

- [0016-storybook-workshop.md](./0016-storybook-workshop.md)
- [0017-ui-primitives.md](./0017-ui-primitives.md)
- [../design-system.md](../design-system.md) §8
