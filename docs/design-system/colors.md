# Colors

## The layer rule

```
--dt-primary: #8ed5ff        ← primitive, per theme (src/lib/theme/<theme>.css). Never reference.
--color-primary              ← semantic, shared (src/lib/theme/tokens.css). Only via utilities.
bg-primary / text-primary    ← what components write.
```

Components use the Tailwind utility for a semantic name. Nothing else.

```svelte
<!-- Correct — src/lib/components/projects/ProjectRow.svelte -->
<div class="rounded-DEFAULT border border-outline-variant bg-surface-container-low p-3">

<!-- Incorrect — hex is right in `dark`, wrong in `light`, `newsprint`, `zen`… -->
<div class="rounded-DEFAULT border border-[#3e484f] bg-[#131b2e] p-3">

<!-- Incorrect — Tailwind's palette is not themed -->
<div class="border-slate-700 bg-slate-900">
```

The one place a component reads a raw custom property is inline SVG / chart fills, which take `var(--color-*)` (never `--dt-*`) — see `ACTIVITY_CHART_COLOR` in `src/lib/time/activity-styles.ts`. Opacity modifiers (`bg-primary/10`, `border-error/40`) are allowed on any semantic colour.

## What background do I use?

```
Is it the page itself?
 ├── Yes → nothing. <body> already has bg-surface.
 └── No
      Is it a card or panel on the page?
       ├── Yes → bg-surface-container  (+ border-outline-variant, see layout.md)
       └── No
            Is it a tile, row or well inside a card / list?
             ├── Yes → bg-surface-container-low
             └── No
                  Is it a raised, selected or hovered element (active tab, code chip, popover)?
                   ├── Yes → bg-surface-container-high
                   └── Is it a row hover?
                        ├── Yes → hover:bg-surface-variant
                        └── Default → bg-surface-container
```

Never set `bg-surface` on a nested element — it disappears into the page. `surface-container-lowest`, `surface-dim`, `surface-bright` and `surface-tint` exist for edge cases (charts, the sheet scrim); do not reach for them in new screens. Accent fills (`bg-primary`, `bg-error-container`) belong to `Button` and the status primitives — a section background is never a status colour.

## What text colour do I use?

```
Is it the main content of the element (a name, a value, a title)?
 ├── Yes → text-on-surface
 └── No
      Is it meta, a label, a caption, a hint, a timestamp?
       ├── Yes → text-on-surface-variant   (the most-used ink in the app)
       └── No
            Is it an error message or destructive state?
             ├── Yes → text-error
             └── No
                  Is it success / live / "running" / a positive delta?
                   ├── Yes → text-secondary
                   └── No
                        Is it paused / warning / a negative-but-not-error delta?
                         ├── Yes → text-tertiary
                         └── Is it an accent: active nav, selected tab, link, a highlighted metric?
                              ├── Yes → text-primary
                              └── Default → text-on-surface
```

**Never use `text-outline`, `text-outline-variant` or any `*-fixed` / `*-fixed-dim` as text.** They fail 4.5:1 in `light` and `newsprint`. Text on a filled accent is the paired `on-*` token (`bg-primary text-on-primary`, `bg-error-container text-on-error-container`) — never `text-white`.

## Borders

| Use                                 | Utility                                |
| ----------------------------------- | -------------------------------------- |
| Every card, panel, row, divider     | `border-outline-variant`               |
| Hovered card / row                  | `hover:border-outline`                 |
| Active / selected / current element | `border-primary`                       |
| Empty state                         | `border-dashed border-outline-variant` |

An active element changes its **border colour to primary**. It never lifts, grows a shadow or scales.

## Status colours

| State                                 | Token                                                  | Where it shows                                                         |
| ------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| Active timer, focus, selection        | `primary`                                              | Timer border, selected tab, links                                      |
| Running / target met / positive delta | `secondary`                                            | `StatusDot tone="live"`, positive KPI caption, `ProgressBar` at target |
| Paused / warning                      | `tertiary`                                             | Paused session, negative trend arrow                                   |
| Stopped / neutral                     | `outline-variant` (fill) / `on-surface-variant` (text) | `StatusDot tone="idle"`                                                |
| Destructive / error                   | `error`, `error-container`                             | `Banner`, `danger` buttons, field errors                               |

There is no status chip. A status word (On track, Behind, Met) is plain `text-body-sm` in the role's ink; a neutral or on-track status is `text-on-surface-variant`.

A "Saved" / "Password changed" confirmation line is `text-primary` with `role="status"`, not `secondary` — `secondary` means _running_ or _on target_, never "your click worked".

Each theme maps these to different hues (amber primary in `ember`, lavender tertiary in `deep-dark`). Name the role, never the hue: "make it green" means `secondary`.

## Project colours (the one hex exception)

A project's colour is user data, stored as hex, from the fixed 10-colour list `PROJECT_COLOR_PALETTE` in `src/lib/projects/palette.ts`. It is the only hex a component renders, and only through these doors:

- `ColorDot color={project.color}` — identity mark
- `ProgressBar fill={project.color}` — progress in that project's colour
- `ProjectColorPicker` — choosing one

Never invent a hex outside that list, and never use a project colour for chrome (borders, text, buttons). Always show the project name next to its colour — colour alone is not identification (WCAG 1.4.1).

## Activity-type colours

Activity types store a token id, not hex: one of the 8 in `ACTIVITY_COLOR_TOKENS` (`src/lib/time/activity-styles.ts`). The ids `primary-container` / `secondary-container` render as **indigo** / **coral** (`bg-indigo`, `text-coral`) — the stored id is legacy, the colour is not a Material container. Render through `ActivityChip`, `activitySwatchClass()` or `activityChartColor()`; never map the id to classes yourself.
