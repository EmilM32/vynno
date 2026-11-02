# Themes

Six named themes: `dark` (default first paint), `light`, `deep-dark`, `ember`, `newsprint`, `zen`. A theme is a palette only — it changes the hex behind `--dt-*` and nothing else. Type, spacing, radius and components are shared. Decision: [ADR-0008](../adr/0008-named-themes.md).

## Rules for component code

- Never branch on the theme in a component. No `dark:` / `light:` variants, no `[data-theme=…]` selectors in a `.svelte` file, no `if (theme === 'light')`. Why: there are six themes, not two, and the next one must not touch components.
- If something looks wrong in one theme, the fix is in that theme's `--dt-*` values or in which semantic token the component uses — never a per-theme override in the component.
- Check every visual change in at least `dark` and `light` (Storybook's theme toolbar, or Settings → Appearance). `light` and `newsprint` are where low-contrast tokens fail first.

The only per-theme CSS outside the palette files is the `.native-select` chevron in `src/routes/layout.css` — a data-URL SVG cannot use `currentColor`, so each light-ish theme repeats it.

## Adding a theme

1. Add a `ThemeDefinition` to `THEMES` in `src/lib/theme/themes.ts` (`id`, `colorScheme`, `themeColor`, `labelKey`).
2. Add `src/lib/theme/<id>.css` defining the **full** `--dt-*` set under `[data-theme='<id>']`. Copy `dark.css` or `light.css` — a missing variable silently falls back to nothing.
3. `@import` it from `src/routes/layout.css`.
4. Add the `labelKey` message to `messages/en.json` and `messages/pl.json`.
5. Add the theme's swatch to `src/lib/a11y/contrast.ts`; `contrast.test.ts` fails if text tokens drop below AA.
6. If the theme is light, add its `.native-select` chevron colour in `layout.css`.

No switcher or component changes. The theme id is stored per device in `localStorage` (`vynno-theme`) and applied in `src/app.html` before paint.
