# Design System — Vynno

**Status:** Condensed from Google Stitch  
**Last updated:** 2026-08-14  
**Source of truth:** this document and the implemented tokens in `src/lib/theme/dark.css`, `src/lib/theme/light.css`, and `src/lib/theme/deep-dark.css`.

The palettes and rules were originally prototyped in Google Stitch. Those exports are no longer in the repo. When this doc and the CSS diverge, prefer the implemented CSS unless the change was an intentional product decision. Named theme implementation: [adr/0008-named-themes.md](./adr/0008-named-themes.md).

---

## 1. Brand & style

- **Aesthetic:** Minimalist-technical, high information density, terminal / IDE feel
- **Audience:** Engineers and power users
- **Mode:** Named color themes (`dark`, `light`, `deep-dark`). Not a boolean.
- **Elevation:** Tonal layers + 1px borders; avoid soft material shadows
- **Emotion:** Focused productivity, systemic reliability

---

## 2. Color tokens

Material-style names are **shared** across themes. Hex values live in `src/lib/theme/dark.css`, `src/lib/theme/light.css`, and `src/lib/theme/deep-dark.css` as `--dt-*`; Tailwind utilities (`bg-surface`, `text-primary`) resolve through `@theme inline`.

### Dark (Dev-Density)

| Role                      | Token                                          | Hex                   | Usage                                  |
| ------------------------- | ---------------------------------------------- | --------------------- | -------------------------------------- |
| Background / surface      | `surface`, `background`                        | `#0b1326`             | App background                         |
| Surface low               | `surface-container-low`                        | `#131b2e`             | Inputs, subtle panels                  |
| Surface container         | `surface-container`                            | `#171f33`             | Cards, nav chrome                      |
| Surface high              | `surface-container-high`                       | `#222a3d`             | Active nav, elevated rows              |
| Surface highest / variant | `surface-container-highest`, `surface-variant` | `#2d3449`             | Hover, chips base                      |
| On surface                | `on-surface`                                   | `#dae2fd`             | Primary text                           |
| On surface variant        | `on-surface-variant`                           | `#bdc8d1`             | Secondary text                         |
| Outline                   | `outline`                                      | `#87929a`             | Secondary borders                      |
| Outline variant           | `outline-variant`                              | `#3e484f`             | Default hairline borders               |
| **Primary**               | `primary`                                      | `#8ed5ff`             | Active focus, running timer, links     |
| Primary container         | `primary-container`                            | `#38bdf8`             | Stronger primary fills                 |
| On primary                | `on-primary`                                   | `#00354a`             | Text on primary buttons                |
| **Secondary**             | `secondary` / `secondary-fixed`                | `#4de082` / `#6dfe9c` | Active success, positive deltas        |
| **Tertiary**              | `tertiary`                                     | `#ffc42f`             | Warnings, idle/pending, amber chips    |
| Error                     | `error`                                        | `#ffb4ab`             | Destructive (Stop emphasis on desktop) |

### Light (High-Density Technical)

Originally from the Google Stitch light-theme token YAML.

| Role                      | Token                                          | Hex       |
| ------------------------- | ---------------------------------------------- | --------- |
| Background / surface      | `surface`, `background`                        | `#f8f9ff` |
| Surface lowest            | `surface-container-lowest`                     | `#ffffff` |
| Surface low               | `surface-container-low`                        | `#eff4ff` |
| Surface container         | `surface-container`                            | `#e5eeff` |
| Surface high              | `surface-container-high`                       | `#dce9ff` |
| Surface highest / variant | `surface-container-highest`, `surface-variant` | `#d3e4fe` |
| On surface                | `on-surface`                                   | `#0b1c30` |
| On surface variant        | `on-surface-variant`                           | `#3f4850` |
| Outline                   | `outline`                                      | `#707881` |
| Outline variant           | `outline-variant`                              | `#bfc7d2` |
| **Primary**               | `primary`                                      | `#006194` |
| Primary container         | `primary-container`                            | `#007bb9` |
| On primary                | `on-primary`                                   | `#ffffff` |
| **Secondary**             | `secondary`                                    | `#006e2d` |
| Secondary fixed           | `secondary-fixed`                              | `#7ffc97` |
| **Tertiary**              | `tertiary`                                     | `#8d4b00` |
| Error                     | `error`                                        | `#ba1a1a` |

### Deep Dark

Originally from the Google Stitch Deep Dark token YAML. Surfaces and outlines copy those values 1:1. Accent roles use the saturated container tones (`primary-container`, `secondary-container`, `tertiary-container`) so `text-primary` / `text-secondary` / `text-tertiary` stay readable — the raw `primary` / `secondary` / `tertiary` values are near-white and collide with `on-surface`.

| Role                      | Token                                          | Hex                   | Usage                                  |
| ------------------------- | ---------------------------------------------- | --------------------- | -------------------------------------- |
| Background / surface      | `surface`, `background`                        | `#131313`             | OLED charcoal (no navy cast)           |
| Surface low               | `surface-container-low`                        | `#1c1b1b`             | Inputs, subtle panels                  |
| Surface container         | `surface-container`                            | `#201f1f`             | Cards, nav chrome                      |
| Surface high              | `surface-container-high`                       | `#2a2a2a`             | Active nav, elevated rows              |
| Surface highest / variant | `surface-container-highest`, `surface-variant` | `#353534`             | Hover, chips base                      |
| On surface                | `on-surface`                                   | `#e5e2e1`             | Primary text                           |
| On surface variant        | `on-surface-variant`                           | `#bac9cc`             | Secondary text                         |
| Outline                   | `outline`                                      | `#849396`             | Secondary borders                      |
| Outline variant           | `outline-variant`                              | `#3b494c`             | Default hairline borders               |
| **Primary**               | `primary`                                      | `#00e5ff`             | Electric cyan — focus, timer, links    |
| Primary container         | `primary-container`                            | `#c3f5ff`             | Ice hover / lighter fill               |
| On primary                | `on-primary`                                   | `#00363d`             | Text on primary buttons                |
| **Secondary**             | `secondary` / `secondary-fixed`                | `#34ff8d` / `#60ff99` | Neon success, live dots                |
| **Tertiary**              | `tertiary`                                     | `#dfc6ff`             | Paused / warning (lavender, not amber) |
| Error                     | `error`                                        | `#ffb4ab`             | Destructive                            |

### Semantic mapping

| Semantic                   | Color                                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Active timer / focus       | Primary (sky / electric cyan). Pulse border on Timer only; Current Focus uses a solid primary / tertiary / outline border by status |
| Success / active indicator | Terminal / neon green                                                                                                               |
| Paused / warning           | Soft amber (`dark`, `light`) or lavender (`deep-dark`)                                                                              |
| Stopped / neutral status   | Slate / outline                                                                                                                     |

### Project colors (examples from mockups)

Not design-system tokens — per-project:

- Blue `#3b82f6`, Purple `#8b5cf6`, Green `#10b981`, plus primary/secondary/tertiary for charts

---

## 3. Typography

### Fonts

| Family             | Use                                                                                |
| ------------------ | ---------------------------------------------------------------------------------- |
| **Inter**          | Labels, headers, instructional UI text                                             |
| **JetBrains Mono** | Timestamps, durations, project codes, ticket ids, numerical data, “command” inputs |

### Scale (from original Stitch tokens)

| Token          | Family         | Size / line / weight                                          |
| -------------- | -------------- | ------------------------------------------------------------- |
| `headline-lg`  | Inter          | 24px / 32px / 600, letter-spacing -0.02em                     |
| `headline-md`  | Inter          | 18px / 24px / 600, letter-spacing -0.01em                     |
| `body-md`      | Inter          | 14px / 20px / 400                                             |
| `body-sm`      | Inter          | 12px / 16px / 400                                             |
| `code-display` | JetBrains Mono | 28px / 32px / 500 (Timer mobile uses larger ~48–80px in HTML) |
| `code-label`   | JetBrains Mono | 13px / 18px / 400                                             |
| `code-data`    | JetBrains Mono | 14px / 20px / 500                                             |

**Rule:** Mobile may scale Inter headlines ~15% down; **keep mono data sizes** for alignment.

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

| Element              | Radius                                                               |
| -------------------- | -------------------------------------------------------------------- |
| Buttons & inputs     | ~4px (`DEFAULT` in mock Tailwind is tighter; aim soft-technical 4px) |
| Cards                | 4px or 8px                                                           |
| Status pills / chips | ~2px (near-square)                                                   |
| Full pills           | Avoid for status; use for mobile nav active tab if matching mockups  |

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
| Cursor blink          | Optional on active text fields              |
| Hover row highlight   | Logs, recent tasks (`surface-variant` tint) |
| Press scale           | Primary chrome (`.press`)                   |
| Confirm / form dialog | Centered scale + fade, 200ms                |

---

## 8. Component inventory

### Primitives (built)

Live in `src/lib/components/ui/`. Browse them in Storybook under `UI/*`. These own their
chrome classes — `.press`, `.focus-ring`, hover/disabled tokens, radius, and the size scale
come from the component, never from the call site. Decision: [adr/0017-ui-primitives.md](./adr/0017-ui-primitives.md).

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

**`IconButton`** — icon-only, requires `label` (becomes `aria-label`). Variants `ghost` |
`bordered`; sizes `sm` (24px) | `md` (40px). Deliberately no `.press` ([motion.md](./motion.md)).

**`Icon`** — the only place `material-symbols-outlined` appears. Sizes `xs`–`2xl`
(14/16/18/20/22/24px); `fill` drives the FILL axis for active nav items and transport glyphs.

**`Dialog`** / **`ConfirmDialog`** — centered overlay, focus-trapped. **`ActivityChip`** —
near-square pill with type colour.

**Rules.** Button labels are Inter (§3: mono is for data, not labels) — mono belongs _inside_
a button when the content is a duration or code. The `class` prop takes layout and colour
only; padding, radius, border, background and type scale come from `variant` and `size`.
`primitives.guard.test.ts` fails the build on a raw `<button>` or a visual utility in `class`.

Non-chrome interactive surfaces are **not** `Button`: dismiss scrims, list rows, colour
swatches and nav links stay raw markup, allowlisted with a reason in the guard test.

### Shell

- **SideNav** (desktop): brand + version, nav links with left border active state, CTA, profile
- **BottomNav** (mobile): 5 tabs, active filled/tinted
- **TopAppBar**: brand, command-palette trigger, live indicator

### Not yet extracted

Still hand-written at each call site; see the Phase 2/3 backlog in ADR-0017.

- **Text input** — dark field, primary on-border focus (not an offset ring)
- **Command / quick input** — mono, terminal prompt aesthetic
- **Project chip** — short code, primary tint background
- **Status dot** — 8px circle (green / amber / slate)
- **Timer card** — largest mono display; primary pulse when active
- **Log row** — project dot, note, range, duration
- **KPI card** — label + large mono metric + delta
- **Progress bar** — thin track for project % or session target
- **Charts** — donut + bar; mono tooltips; no heavy decoration

---

## 9. Tailwind + named themes

Implemented:

1. Shared type/radius/spacing in `src/lib/theme/tokens.css` (`@theme`).
2. Color utilities via `@theme inline` → `--dt-*`.
3. Each palette is `[data-theme='<id>']` in its own CSS file. Default first paint is `data-theme="dark"` on `<html>`.
4. Switcher iterates `THEMES` in `src/lib/theme/themes.ts` (Settings → Appearance). Not a light/dark toggle.
5. Theme id is persisted to `localStorage` (`vynno-theme`) to avoid FOUC. Other prefs stay in-memory.
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

- Maintain contrast of primary text (`on-surface` on `surface`) and secondary text (`on-surface-variant`). Never use `outline`, `outline-variant`, or `*-fixed` as small text — those fail 4.5:1 on light.
- Status / recording / today-glow ink is `secondary` (not `secondary-fixed`).
- Do not rely on color alone for project identity (include name). Color swatches have named accessible labels.
- Ensure Pause/Stop and other primary mobile actions ≥ 40px where possible; other controls ≥ 24×24 (WCAG 2.5.8).
- Timer updates: **never** put `aria-live` on the ticking clock. Announce start / pause / resume / stop via `announce()`.
- Focus is global and two-tier (`:focus-visible`): fields use an on-border primary edge; chrome uses a 2px primary outline at 1px offset. Do not use `outline-none` without a replacement (`.focus-flush` is only valid when a parent `:focus-within` indicator exists).
- Dialogs use `trapFocus()`; destructive confirms focus Cancel first.

---

## 11. Related documents

- [prd.md](./prd.md)
- [screens-and-flows.md](./screens-and-flows.md)
- [adr/0003-design-system-source.md](./adr/0003-design-system-source.md)
