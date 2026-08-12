# Design System — Dev-Density Dark

**Status:** Condensed from Stitch  
**Last updated:** 2026-08-12  
**Source of truth:** `stitch_personal_dev_tracker/dev_density_dark/DESIGN.md` + screen mockups  

When Stitch and this doc diverge, prefer **screenshots** for layout and **DESIGN.md** for tokens; update this doc after intentional product decisions.

---

## 1. Brand & style

- **Aesthetic:** Minimalist-technical, high information density, terminal / IDE feel  
- **Audience:** Engineers and power users  
- **Mode:** Dark only  
- **Elevation:** Tonal layers + 1px borders; avoid soft material shadows  
- **Emotion:** Focused productivity, systemic reliability  

---

## 2. Color tokens

From design export (Material-style naming). Primary brand accents:

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
| 0 Background | `#0b1326` / deep slate |
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

## 9. Tailwind implementation notes (future)

When scaffolding:

1. Map tokens into Tailwind theme `colors`, `fontFamily`, `fontSize`, `spacing`, `borderRadius`.  
2. Enable `class` dark mode or hard-code dark (dark-only product).  
3. Load Inter + JetBrains Mono (fontsource or Google Fonts).  
4. Do not ship Stitch CDN Tailwind config as production; rewrite cleanly in CSS variables if preferred.

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
