# ADR-0008: Named color themes

**Status:** Accepted  
**Date:** 2026-08-13  
**Deciders:** Project owner

## Context

The app shipped with a single hardcoded dark `@theme` block. Light mockups use the same Material token names with different hex values, and a third palette (`deep-dark`) is now registered the same way.

A sun/moon toggle or Tailwind `dark:` variants would have to be rewritten when the third theme arrives.

## Decision

1. Themes are a **named list** (`THEMES` in `src/lib/theme/themes.ts`), not `isDark: boolean`.
2. Each theme has `id`, `colorScheme` (`light` | `dark` for native controls), `themeColor`, and a Paraglide `labelKey`.
3. `<html data-theme="<id>">` selects CSS. Palette files set `--dt-*`; `@theme inline` maps those to `--color-*` utilities.
4. The Settings switcher **iterates `THEMES`**. Adding a theme is a registry row + CSS file.
5. Persist `themeId` to `localStorage` (`vynno-theme`) and apply it in `app.html` before paint to avoid FOUC. Daily target and default project use a `vynno_prefs` cookie (same first-paint pattern as `vynno_tz`).
6. Do not follow `prefers-color-scheme` in v1 (that would look like a third list item).
7. Do not use `dark:` / `light:` as the theming mechanism.

## Consequences

### Positive

- Third (and later) palettes do not touch the switcher.
- Existing `bg-surface` / `text-primary` classes follow the active theme.
- Default first paint remains dark.

### Negative / tradeoffs

- Theme is `localStorage` for FOUC; daily target and default project are a `vynno_prefs` cookie so layout load can serialize them (see [0011](./0011-ssr-session-state.md)).
- Inline `app.html` script is a small string-match of the storage key, not the TypeScript registry.

## Alternatives considered

| Option                                  | Why not                                               |
| --------------------------------------- | ----------------------------------------------------- |
| `class="dark"` + `dark:` utilities      | Binary; breaks when a third theme is added.           |
| `prefers-color-scheme` only             | No explicit user choice; no room for a third palette. |
| Runtime JS that sets every CSS variable | Duplicates the design tokens outside CSS.             |

## Related

- [../design-system.md](../design-system.md)
