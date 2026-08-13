# Design System — DevTime

**Status:** Condensed from Stitch  
**Last updated:** 2026-08-13  
**Source of truth:**

- Dark: `stitch_personal_dev_tracker/dev_density_dark/DESIGN.md` + screen mockups
- Light: `stitch_personal_dev_tracker_light/high_density_technical_light/DESIGN.md` + screen mockups

When Stitch and this doc diverge, prefer **screenshots** for layout and **DESIGN.md YAML** for tokens; update this doc after intentional product decisions. Named theme implementation: [adr/0008-named-themes.md](./adr/0008-named-themes.md).

---

## 1. Brand & style

- **Aesthetic:** Minimalist-technical, high information density, terminal / IDE feel  
- **Audience:** Engineers and power users  
- **Mode:** Named color themes (`dark`, `light`; list is open for a third palette). Not a boolean.  
- **Elevation:** Tonal layers + 1px borders; avoid soft material shadows  
- **Emotion:** Focused productivity, systemic reliability  

---

## 2. Color tokens

Material-style names are **shared** across themes. Hex values live in `src/lib/theme/dark.css` and `src/lib/theme/light.css` as `--dt-*`; Tailwind utilities (`bg-surface`, `text-primary`) resolve through `@theme inline`.

### Dark (Dev-Density)

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| Background / surface | `surface`, `background` | `#0b1326` | App background |
| Surface low | `surface-container-low` | `#131b2e` | Inputs, subtle panels |
| Surface container | `surface-container` | `#171f33` | Cards, nav chrome |
| Surface high | `surface-container-high` | `#222a3d` | Active nav, elevated rows |
| Surface highest / variant | `surface-container-highest`, `surface-variant` | `#2d3449` | Hover, chips base |
| On surface | `on-surface` | `#dae2fd` | Primary text |
| On surface variant | `on-surface-variant` | `#bdc8d1` | Secondary text |
| Outline | `outline` | `#87929a` | Secondary borders |
| Outline variant | `outline-variant` | `#3e484f` | Default hairline borders |
| **Primary** | `primary` | `#8ed5ff` | Active focus, running timer, links |
| Primary container | `primary-container` | `#38bdf8` | Stronger primary fills |
| On primary | `on-primary` | `#00354a` | Text on primary buttons |
| **Secondary** | `secondary` / `secondary-fixed` | `#4de082` / `#6dfe9c` | Active success, positive deltas |
| **Tertiary** | `tertiary` | `#ffc42f` | Warnings, idle/pending, amber chips |
| Error | `error` | `#ffb4ab` | Destructive (Stop emphasis on desktop) |

### Light (High-Density Technical)

YAML from `high_density_technical_light/DESIGN.md` (prefer YAML over prose hexes in that file).

| Role | Token | Hex |
|------|-------|-----|
| Background / surface | `surface`, `background` | `#f8f9ff` |
| Surface lowest | `surface-container-lowest` | `#ffffff` |
| Surface low | `surface-container-low` | `#eff4ff` |
| Surface container | `surface-container` | `#e5eeff` |
| Surface high | `surface-container-high` | `#dce9ff` |
| Surface highest / variant | `surface-container-highest`, `surface-variant` | `#d3e4fe` |
| On surface | `on-surface` | `#0b1c30` |
| On surface variant | `on-surface-variant` | `#3f4850` |
| Outline | `outline` | `#707881` |
| Outline variant | `outline-variant` | `#bfc7d2` |
| **Primary** | `primary` | `#006194` |
| Primary container | `primary-container` | `#007bb9` |
| On primary | `on-primary` | `#ffffff` |
| **Secondary** | `secondary` | `#006e2d` |
| Secondary fixed | `secondary-fixed` | `#7ffc97` |
| **Tertiary** | `tertiary` | `#8d4b00` |
| Error | `error` | `#ba1a1a` |

### Semantic mapping

| Semantic | Color |
|----------|-------|
| Active timer / focus | Primary blue + pulse border |
| Success / active indicator | Terminal green |
| Paused / warning | Soft amber |
| Stopped / neutral status | Slate / outline |

### Project colors (examples from mockups)

Not design-system tokens — per-project:

- Blue `#3b82f6`, Purple `#8b5cf6`, Green `#10b981`, plus primary/secondary/tertiary for charts  

---

## 3. Typography

### Fonts

| Family | Use |
|--------|-----|
| **Inter** | Labels, headers, instructional UI text |
| **JetBrains Mono** | Timestamps, durations, project codes, ticket ids, numerical data, “command” inputs |

### Scale (from DESIGN.md)

| Token | Family | Size / line / weight |
|-------|--------|----------------------|
| `headline-lg` | Inter | 24px / 32px / 600, letter-spacing -0.02em |
| `headline-md` | Inter | 18px / 24px / 600, letter-spacing -0.01em |
| `body-md` | Inter | 14px / 20px / 400 |
| `body-sm` | Inter | 12px / 16px / 400 |
| `code-display` | JetBrains Mono | 28px / 32px / 500 (Timer mobile uses larger ~48–80px in HTML) |
| `code-label` | JetBrains Mono | 13px / 18px / 400 |
| `code-data` | JetBrains Mono | 14px / 20px / 500 |

**Rule:** Mobile may scale Inter headlines ~15% down; **keep mono data sizes** for alignment.

---

## 4. Layout & spacing

| Token | Value |
|-------|-------|
| Spacing unit | 4px |
| Gutter | 12px |
| Margin mobile | 16px |
| Margin desktop | 24px |
| Container max | 1200px |
| Sidebar width | 240px |
| Compact row height | 32–40px |

- Desktop: 12-column fluid grid, narrow gutters  
- Mobile: single column  
- Prefer density over large empty regions; define regions with 1px borders  

---

## 5. Shape

| Element | Radius |
|---------|--------|
| Buttons & inputs | ~4px (`DEFAULT` in mock Tailwind is tighter; aim soft-technical 4px) |
| Cards | 4px or 8px |
| Status pills / chips | ~2px (near-square) |
| Full pills | Avoid for status; use for mobile nav active tab if matching mockups |

---

## 6. Elevation (flat terminal)

| Level | Treatment |
|-------|-----------|
| 0 Background | Theme `surface` / `background` |
| 1 Cards | Slightly lighter fill + `1px` `outline-variant` border |
| 2 Modals | Lighter fill + stronger border; hard shadow only if needed |

Active element: **border color → primary**, not lift/shadow.

---

## 7. Motion

| Effect | Use |
|--------|-----|
| Border pulse | Active timer card |
| Blink / pulse dot | ACTIVE status, recording indicator |
| Cursor blink | Optional on active text fields |
| Hover row highlight | Logs, recent tasks (`surface-variant` tint) |

Keep motion subtle; respect `prefers-reduced-motion` at implementation time.

---

## 8. Component inventory

### Shell

- **SideNav** (desktop): brand + version, nav links with left border active state, CTA, profile  
- **BottomNav** (mobile): 5 tabs, active filled/tinted  
- **TopAppBar**: brand, search, notifications, live indicator  

### Core

- **Timer card** — largest mono display; primary pulse when active  
- **Primary button** — solid primary fill, dark text  
- **Ghost / secondary button** — bordered, Pause style  
- **Destructive-tinged Stop** — error border/fill on desktop mock  
- **Text input** — dark field, primary focus ring  
- **Command / quick input** — mono, terminal prompt aesthetic  
- **Project chip** — short code, primary tint background  
- **Activity chip** — near-square pill with type color  
- **Status dot** — 8px circle (green / amber / slate)  
- **Log row** — project dot, note, range, duration  
- **KPI card** — label + large mono metric + delta  
- **Progress bar** — thin track for project % or session target  
- **Charts** — donut + bar; mono tooltips; no heavy decoration  

### Icons

Material Symbols Outlined (FILL variation for active nav items).

---

## 9. Tailwind + named themes

Implemented:

1. Shared type/radius/spacing in `src/lib/theme/tokens.css` (`@theme`).  
2. Color utilities via `@theme inline` → `--dt-*`.  
3. Each palette is `[data-theme='<id>']` in its own CSS file. Default first paint is `data-theme="dark"` on `<html>`.  
4. Switcher iterates `THEMES` in `src/lib/theme/themes.ts` (Settings → Appearance). Not a light/dark toggle.  
5. Theme id is persisted to `localStorage` (`devtime-theme`) to avoid FOUC. Other prefs stay in-memory.  
6. Do **not** use `dark:` / `light:` variants as the theming mechanism.

### Adding a third theme

1. Add a `ThemeDefinition` to `THEMES`.  
2. Add `src/lib/theme/<id>.css` with the full `--dt-*` set (copy `dark.css` or `light.css`).  
3. `@import` it from `src/routes/layout.css`.  
4. Add a Paraglide message for `labelKey`.  
5. No switcher or component changes.

---

## 10. Accessibility notes

- Maintain contrast of primary text (`on-surface` on `surface`).  
- Do not rely on color alone for project identity (include name).  
- Ensure Pause/Stop hit targets ≥ 40px where possible on mobile.  
- Timer updates: avoid aggressive live-region spam; optional polite updates on pause/stop only.

---

## 11. Related documents

- [prd.md](./prd.md)  
- [screens-and-flows.md](./screens-and-flows.md)  
- [adr/0003-design-system-source.md](./adr/0003-design-system-source.md)  
