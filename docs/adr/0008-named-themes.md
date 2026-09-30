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
5. Persist `themeId` to `localStorage` (`vynno-theme`) and apply it in `app.html` before paint to avoid FOUC. Theme stays per device. Daily target and default project are account prefs (see the 2026-09-30 amendment).
6. Do not follow `prefers-color-scheme` in v1 (that would look like a third list item).
7. Do not use `dark:` / `light:` as the theming mechanism.

## Consequences

### Positive

- Third (and later) palettes do not touch the switcher.
- Existing `bg-surface` / `text-primary` classes follow the active theme.
- Default first paint remains dark.

### Negative / tradeoffs

- Theme is `localStorage` for FOUC, so it does not follow the user to another device. That is on purpose (see the amendment).
- Inline `app.html` script is a small string-match of the storage key, not the TypeScript registry.

## Alternatives considered

| Option                                  | Why not                                               |
| --------------------------------------- | ----------------------------------------------------- |
| `class="dark"` + `dark:` utilities      | Binary; breaks when a third theme is added.           |
| `prefers-color-scheme` only             | No explicit user choice; no room for a third palette. |
| Runtime JS that sets every CSS variable | Duplicates the design tokens outside CSS.             |

## Amendment (2026-09-30)

Daily target and default project moved from the `vynno_prefs` device cookie to the account (`GET` / `PATCH /v1/me/prefs`, vynno-api ADR-0017). The layout seed loads them, so first paint still matches ([0011](./0011-ssr-session-state.md) amendment). An old cookie is copied to an account with no prefs once, then deleted.

Theme stays per device. It must apply before first paint from `app.html`, and a light theme on one machine and dark on another is a feature. Syncing it would flash the device's last theme on load before switching.

## Related

- [../design-system.md](../design-system.md)
