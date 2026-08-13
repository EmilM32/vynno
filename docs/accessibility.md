# Accessibility — WCAG 2.2 AA

**Target:** [WCAG 2.2](https://www.w3.org/TR/WCAG22/) Level **AA**.  
**Last updated:** 2026-08-13

Vynno is a dense, keyboard-first focus tracker. Full AAA (7:1 contrast, 44×44 targets everywhere) would fight the product. Selected AAA extras that fit (visible labels, named colors, 40px mobile icon targets) are applied.

## How to verify

```bash
npm test                 # includes token contrast matrix
npm run check            # svelte-check a11y warnings
npm run test:e2e         # includes e2e/a11y.spec.ts (axe-core)
```

Axe runs every route under `dark`, `light`, and `deep-dark` against `wcag2a`, `wcag2aa`, `wcag21aa`, and `wcag22aa`.

## Patterns

| Widget             | Implementation                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Skip link          | `AppShell` → `#main-content`                                                                                                                                                   |
| Live status        | `announce()` in `src/lib/a11y/announce.ts` — session start/pause/resume/stop only. **Never** put `aria-live` on the ticking clock.                                             |
| Dialogs            | `trapFocus()` + `inert` on background; Escape; restore focus. Destructive confirm focuses **Cancel**.                                                                          |
| Command palette    | Combobox dialog: `role="combobox"` + `listbox` / `option`, `aria-activedescendant`. No nested buttons. Search-row `:focus-within` is the focus indicator (not an offset ring). |
| Focus indication   | Two-tier, `:focus-visible` only. Fields: on-border primary + 1px `box-shadow`. Chrome: 2px primary outline, 1px offset. Meets 2.4.7 + 1.4.11; 2.4.13 (AAA) is not a target.    |
| Projects tabs      | APG tabs: roving tabindex, arrows, one `tabpanel`.                                                                                                                             |
| Color radios       | Roving tabindex, arrow keys, named colors (not hex).                                                                                                                           |
| Insights breakdown | Semantic `<table>` with column headers.                                                                                                                                        |
| Weekly bars        | Focusable buttons; tooltip on focus and hover; Escape dismisses.                                                                                                               |

## Tokens

Use `on-surface` / `on-surface-variant` for text. Do **not** use `outline`, `outline-variant`, or `*-fixed` tints as small text (they fail 4.5:1 on light). Status ink is `secondary` / `tertiary` / `error`, not `secondary-fixed`.

Contrast pairs live in `src/lib/a11y/contrast.ts` and are unit-tested.

## N/A for this frontend-only mock

1.2 time-based media, 1.4.2 audio control, 2.2.1 session timeouts, 2.5.7 dragging, 3.1.2 language of parts (English only), 3.2.6 consistent help, 3.3.7 redundant entry, 3.3.8 accessible authentication (no login yet).

Re-audit when auth lands.

## Known AAA exclusions

- Contrast is AA (4.5:1), not AAA (7:1).
- Compact rows may be 24×24 (2.5.8) rather than 44×44 (2.5.5).
- No sign-language or extended audio descriptions (no media).
