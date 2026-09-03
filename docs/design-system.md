# Design System — Vynno

**Status:** Living  
**Last updated:** 2026-08-27  
**Hex values live in CSS:** `src/lib/theme/dark.css`, `light.css`, `deep-dark.css`. When this doc and the CSS diverge, prefer the CSS unless the change was an intentional product decision. Named themes: [adr/0008-named-themes.md](./adr/0008-named-themes.md).

---

## 1. Brand & style

- **Aesthetic:** Minimalist-technical, high information density, terminal / IDE feel
- **Audience:** Engineers and power users
- **Mode:** Named color themes (`dark`, `light`, `deep-dark`). Not a boolean.
- **Elevation:** Tonal layers + 1px borders; avoid soft material shadows
- **Emotion:** Focused productivity, systemic reliability

---

## 2. Color

Material-style names are **shared** across themes. Hex lives in the palette CSS files as `--dt-*`; Tailwind utilities (`bg-surface`, `text-primary`) resolve through `@theme inline`. Do not copy hex from this doc into new CSS — copy from an existing palette file.

| Semantic                   | Color                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Active timer / focus       | Primary (sky / electric cyan). Pulse border on Timer only; Current Focus uses a solid primary / tertiary / outline border by status |
| Success / active indicator | Terminal / neon green (`secondary`)                                                                                                 |
| Paused / warning           | Soft amber (`dark`, `light`) or lavender (`deep-dark`) — `tertiary`                                                                 |
| Stopped / neutral status   | Slate / outline                                                                                                                     |
| Destructive                | `error` / `error-container`                                                                                                         |

**Do not** use `outline`, `outline-variant`, or `*-fixed` tints as small text (they fail 4.5:1 on light). Status ink is `secondary` / `tertiary` / `error`, not `secondary-fixed`.

Project colors are per-project hex from a fixed UI palette (not design-system tokens): blue `#3b82f6`, purple `#8b5cf6`, green `#10b981`, plus primary/secondary/tertiary for charts.

---

## 3. Typography

| Family             | Use                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Inter**          | Labels, headers, instructional UI text. Self-hosted variable latin + latin-ext (`src/lib/theme/fonts.css`) |
| **JetBrains Mono** | Timestamps, durations, project codes, ticket ids, numerical data, “command” inputs. Same files             |

| Token          | Family         | Size / line / weight                                  |
| -------------- | -------------- | ----------------------------------------------------- |
| `headline-lg`  | Inter          | 24px / 32px / 600, letter-spacing -0.02em             |
| `headline-md`  | Inter          | 18px / 24px / 600, letter-spacing -0.01em             |
| `body-md`      | Inter          | 14px / 20px / 400                                     |
| `body-sm`      | Inter          | 12px / 16px / 400                                     |
| `code-display` | JetBrains Mono | 28px / 32px / 500 (Timer mobile uses larger ~48–80px) |
| `code-label`   | JetBrains Mono | 13px / 18px / 400                                     |
| `code-data`    | JetBrains Mono | 14px / 20px / 500                                     |

**Rule:** Mobile may scale Inter headlines ~15% down; **keep mono data sizes** for alignment. Button labels are Inter — mono belongs _inside_ a button when the content is a duration or code.

---

## 4. Layout & spacing

| Token              | Value                                             |
| ------------------ | ------------------------------------------------- |
| Spacing unit       | 4px                                               |
| Gutter             | 12px                                              |
| Margin mobile      | 16px                                              |
| Margin desktop     | 24px                                              |
| Container max      | 1200px (token kept; not applied to the app shell) |
| Sidebar width      | 240px                                             |
| Compact row height | 32–40px                                           |

- Desktop: main column is full remaining width beside the sidebar (24px margin); page headers stick and collapse the subtitle
- Mobile: single column
- Prefer density over large empty regions; define regions with 1px borders

---

## 5. Shape

| Element              | Radius                                                                |
| -------------------- | --------------------------------------------------------------------- |
| Buttons & inputs     | ~4px                                                                  |
| Cards                | 4px or 8px                                                            |
| Status pills / chips | ~2px (near-square)                                                    |
| Full pills           | Avoid for status; use for mobile nav active tab if matching the shell |

---

## 6. Elevation (flat terminal)

| Level        | Treatment                                                  |
| ------------ | ---------------------------------------------------------- |
| 0 Background | Theme `surface` / `background`                             |
| 1 Cards      | Slightly lighter fill + `1px` `outline-variant` border     |
| 2 Modals     | Lighter fill + stronger border; hard shadow only if needed |

Active element: **border color → primary**, not lift/shadow.

Focus is two-tier (always `:focus-visible`):

- **Fields** (`input` / `select` / `textarea`): on-border — `border-color` + 1px `box-shadow` in `primary`. No offset outline.
- **Chrome** (buttons, links, tabs): 2px `primary` outline, 1px offset (gap keeps the ring visible on primary-filled controls).
- **Flush / borderless fields** (command palette): parent `:focus-within` recolors the row hairline. Do not put an offset ring on the input.

---

## 7. Motion

Personality, the frequency gate, tokens, and do/don’t: **[motion.md](./motion.md)**. That file is the source of truth.

| Effect                | Use                                         |
| --------------------- | ------------------------------------------- |
| Border pulse          | Active timer card                           |
| Blink / pulse dot     | ACTIVE status, recording indicator          |
| Hover row highlight   | Logs, recent tasks (`surface-variant` tint) |
| Press scale           | Primary chrome (`.press`)                   |
| Confirm / form dialog | Centered scale + fade, 200ms                |

---

## 8. Component inventory

### Primitives (built)

Live in `src/lib/components/ui/`. Browse them in Storybook under `UI/*`. These own their chrome classes — `.press`, `.focus-ring`, hover/disabled tokens, radius, and the size scale come from the component, never from the call site. Decisions: [adr/0017-ui-primitives.md](./adr/0017-ui-primitives.md), [adr/0018-atomic-ui-layer.md](./adr/0018-atomic-ui-layer.md).

**`Button`** — renders `<button>`, or `<a>` when given `href`.

| Variant         | Look                                        | `.press` | Used for                          |
| --------------- | ------------------------------------------- | -------- | --------------------------------- |
| `primary`       | Solid primary fill                          | yes      | The one main action on a screen   |
| `neutral`       | Solid neutral fill                          | yes      | Pause / Resume in the transport   |
| `secondary`     | Bordered, no fill                           | yes      | Row actions, form cancels         |
| `tonal`         | `primary/10` fill + `primary/30` border     | yes      | An accent action that is not main |
| `danger`        | Bordered error                              | yes      | Destructive row actions           |
| `danger-filled` | Solid `error-container`                     | yes      | Destructive confirm in a dialog   |
| `quiet`         | Borderless, hover tint, inherits ink        | yes      | Quiet chrome (⌘K row, clock)      |
| `inline`        | Underlined text, inherits ink               | no       | “Dismiss” inside a banner         |
| `link`          | Underlined text in `primary`                | no       | A text CTA in running copy        |
| `tab`           | Segment; `selected` drives the active state | no       | Tab strips, segmented controls    |

| Size | Box                     | Type          | Used for                        |
| ---- | ----------------------- | ------------- | ------------------------------- |
| `xs` | `min-h-6 px-2 py-1`     | `body-sm`     | Row actions (24px = WCAG 2.5.8) |
| `sm` | `min-h-8 px-2.5 py-1.5` | `body-sm`     | Compact forms, tabs             |
| `md` | `min-h-10 px-4 py-2`    | `body-md`     | Default — forms, CTAs, dialogs  |
| `lg` | `min-h-10 px-4 py-2`    | `headline-md` | Timer transport                 |

`inline` and `link` take the type scale only, not the box metrics — they sit in a sentence.

**`IconButton`** — icon-only, requires `label` (becomes `aria-label`). Variants `ghost` | `bordered`; sizes `sm` (24px) | `md` (40px). Deliberately no `.press` ([motion.md](./motion.md)).

**`Icon`** — the only place `material-symbols-outlined` appears. Sizes `xs`–`2xl` (14/16/18/20/22/24px); `fill` drives the FILL axis for active nav items and transport glyphs.

**`Dialog`** / **`ConfirmDialog`** — centered overlay, focus-trapped. **`ActivityChip`** — near-square pill with type colour.

**`Field`** — label + optional hint/error. Layouts `stack` (dialogs) and `split` (Settings rows). Sets context so nested `Input` / `Select` inherit `id`, `aria-invalid`, and `aria-describedby`.

**`Input`** — owns the `<input>` chrome. Tones `ui` (Inter) / `data` (mono `code-data`) / `code` (mono `code-label`); sizes `sm` / `md`. Optional `leading` / `trailing` snippets own the extra padding. Focus is the global on-border treatment, not `.focus-ring`.

**`Select`** — owns `<select>` plus the inset chevron (`.native-select`). Same surface as `Input tone="code"`.

**`KpiCard`** — label + large mono metric + optional caption. **`ProgressBar`** — thin track; `label` is the accessible name. **`Banner`** — error strip; optional dismiss action. **`Chip`** — `code` (project code), `tag` (session tag), `ticket`. **`ColorDot`** — project identity (`sm` 8px circle, `md` 14px square). **`StatusDot`** — 8px live mark (`live` / `paused` / `idle`). **`SwatchPicker`** — colour radiogroup; domain wrappers stay in Projects / Settings.

**Rules.** The `class` prop takes layout and colour only; padding, radius, border, background and type scale come from `variant` and `size`. `primitives.guard.test.ts` fails the build on a raw `<button>`, a raw `<input>`/`<select>`, or a visual utility in `class`.

Non-chrome interactive surfaces are **not** `Button`: dismiss scrims, list rows, colour swatches and nav links stay raw markup, allowlisted with a reason in the guard test.

### Shell

- **SideNav** (desktop): brand + version, nav links with left border active state, CTA, profile
- **BottomNav** (mobile): six tabs, active filled/tinted
- **TopBar**: brand, command-palette trigger, live indicator (mobile)

### Intentionally not extracted

Composed widgets, store-owned screens, and one-off fields. See [ADR-0018](./adr/0018-atomic-ui-layer.md).

- **Command / quick input** — timer `TaskInput` note and the command-palette flush field
- **Timer card** — largest mono display; primary pulse when active
- **Log row / project row** — consume `ColorDot`, `Chip`, `ActivityChip`; stay composed
- **Charts** — donut + bar; LayerChart wrappers; no heavy decoration
- **Generic card / panel** — padding and header splits vary too much to own

---

## 9. Tailwind + named themes

1. Shared type/radius/spacing in `src/lib/theme/tokens.css` (`@theme`).
2. Color utilities via `@theme inline` → `--dt-*`.
3. Each palette is `[data-theme='<id>']` in its own CSS file. Default first paint is `data-theme="dark"` on `<html>`.
4. Switcher iterates `THEMES` in `src/lib/theme/themes.ts` (Settings → Appearance). Not a light/dark toggle.
5. Theme id is persisted to `localStorage` (`vynno-theme`) to avoid FOUC. Daily target and default project use the `vynno_prefs` cookie so SSR and hydrate agree.
6. Do **not** use `dark:` / `light:` variants as the theming mechanism.

### Adding another theme

1. Add a `ThemeDefinition` to `THEMES`.
2. Add `src/lib/theme/<id>.css` with the full `--dt-*` set (copy `dark.css` or `light.css`).
3. `@import` it from `src/routes/layout.css`.
4. Add a Paraglide message for `labelKey`.
5. No switcher or component changes.

---

## 10. Accessibility notes

Conformance target: **WCAG 2.2 AA**. Full statement: [accessibility.md](./accessibility.md).

- Maintain contrast of primary text (`on-surface` on `surface`) and secondary text (`on-surface-variant`).
- Status / recording / today-glow ink is `secondary` (not `secondary-fixed`).
- Do not rely on color alone for project identity (include name). Color swatches have named accessible labels.
- Ensure Pause/Stop and other primary mobile actions ≥ 40px where possible; other controls ≥ 24×24 (WCAG 2.5.8).
- Timer updates: **never** put `aria-live` on the ticking clock. Announce start / pause / resume / stop via `announce()`.
- Focus is global and two-tier (`:focus-visible`). Do not use `outline-none` without a replacement (`.focus-flush` is only valid when a parent `:focus-within` indicator exists).
- Dialogs use `trapFocus()`; destructive confirms focus Cancel first.
