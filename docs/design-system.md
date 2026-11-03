# Design System — Vynno

**Status:** Living · **Last updated:** 2026-11-02

Dev-Density Dark: a flat, dense, terminal-feeling UI for engineers. Regions are tonal layers split by 1px hairlines, never shadows; numbers are JetBrains Mono, words are Inter. Six named themes swap the palette only — layout, type and components are shared.

Read the topic file for the task in front of you. Each one is short on purpose.

## Four rules that apply to every change

1. **Primitives own chrome.** Every button, icon, input, select and date picker goes through `src/lib/components/ui/`. A raw `<button>`, `<input>`, `<select>` or `material-symbols-outlined` span fails `primitives.guard.test.ts`. The `class` prop on a primitive takes layout (flex, width, margin, order, visibility), plus ink colour on `Button variant="quiet"` / `"inline"` and on `Icon` — nowhere else. Plain elements (`<p>`, `<span>`, `<div>`) take any semantic colour. Padding, radius, border, background and type size come from `variant` / `size` / `tone`. Why: one place decides how a control looks, so six themes and the a11y fixes stay in sync. → [buttons.md](./design-system/buttons.md), [forms.md](./design-system/forms.md)
2. **Semantic colour utilities only.** Write `bg-surface-container`, `text-on-surface-variant`, `border-outline-variant`. Never a hex, never `var(--dt-*)`, never a Tailwind palette colour (`bg-slate-800`, `text-sky-400`), never `dark:` / `light:`. Why: a hex is correct in one theme and wrong in five. The only hex in components is a project's own colour from `src/lib/projects/palette.ts`. → [colors.md](./design-system/colors.md)
3. **The type scale is closed.** Use `text-headline-lg`, `text-headline-md`, `text-body-md`, `text-body-sm`, `text-code-display`, `text-code-data`, `text-code-label`. Arbitrary sizes are limited to the two micro-label sizes in [typography.md](./design-system/typography.md). → [typography.md](./design-system/typography.md)
4. **Every user-visible string is a Paraglide message** (`m.some_key()` from `$lib/paraglide/messages.js`, added to both `messages/en.json` and `messages/pl.json`). Never a string literal in markup, including `aria-label` and `label` props. Decision: [ADR-0007](./adr/0007-i18n-paraglide.md).

## Index

| File                                           | Read it when you…                                                           |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| [colors.md](./design-system/colors.md)         | pick a background, text, border or status colour; colour a project          |
| [typography.md](./design-system/typography.md) | set any text size, or choose Inter vs mono                                  |
| [layout.md](./design-system/layout.md)         | build a card, panel, list row or empty state; pick spacing or radius        |
| [buttons.md](./design-system/buttons.md)       | add any clickable control or icon (`Button`, `IconButton`, `Icon`)          |
| [forms.md](./design-system/forms.md)           | add a form field (`Field`, `Input`, `Select`, `DatePicker`, `SwatchPicker`) |
| [overlays.md](./design-system/overlays.md)     | open a dialog, confirm, bottom sheet, "…" menu, or collapsible section      |
| [display.md](./design-system/display.md)       | show status, a metric, progress, a chip or a banner                         |
| [shell.md](./design-system/shell.md)           | start a new screen (`PageHeader`, `PageTitle`, `ErrorState`), touch nav     |
| [themes.md](./design-system/themes.md)         | add or change a theme palette                                               |
| [motion.md](./motion.md)                       | add any transition or animation — run its gate first                        |
| [accessibility.md](./accessibility.md)         | need the WCAG 2.2 AA target, focus rules, or how to run axe                 |

## Where the truth lives

| What                          | File                                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Semantic colour utilities     | `src/lib/theme/tokens.css` (`@theme inline`)                                                                                                    |
| Hex per theme                 | `src/lib/theme/<theme>.css` (`--dt-*`)                                                                                                          |
| Type, radius, spacing, ease   | `src/lib/theme/tokens.css` (`@theme`)                                                                                                           |
| Focus, `.press`, touch target | `src/routes/layout.css`                                                                                                                         |
| Variant and size unions       | the `export type …Variant` / `…Size` at the top of each `ui/*.svelte`                                                                           |
| Live examples                 | Storybook (`npm run storybook`): `Foundations/*` (colours, type, layout, icons, motion), `Patterns` (composed recipes), `UI/*` (each primitive) |

When a doc and a union type disagree, the union type wins and the doc is the bug. Decisions: [ADR-0017](./adr/0017-ui-primitives.md) (primitives), [ADR-0018](./adr/0018-atomic-ui-layer.md) (what is and is not a primitive), [ADR-0008](./adr/0008-named-themes.md) (themes).
