# ADR-0007: i18n with Paraglide JS

## Status

Accepted

## Context

UI copy was hardcoded English in Svelte components. We need type-safe, tree-shakable translations and an easy path to add languages without coupling locale to routes.

## Decision

Use **Paraglide JS** (`@inlang/paraglide-js`) — SvelteKit’s recommended i18n library.

- Message source: `messages/{locale}.json`
- Generated runtime: `src/lib/paraglide/` (gitignored; produced by Vite plugin)
- Locale strategy: `cookie` → `localStorage` → `preferredLanguage` → `baseLocale` (**no URL strategy**). Cookie is first so SSR and the first HTML agree ([ADR-0011](./0011-ssr-session-state.md)).
- Language switcher lives in Settings; `setLocale()` reloads the document
- Translate **typical product UI copy** (labels, buttons, headings, empty states, dialogs, validation/errors shown in UI)
- Do **not** translate technical identifiers (Material icon ligatures, test ids, routes) or user content (project names, session notes)

## Consequences

- Adding a language: extend `project.inlang` locales + add `messages/<tag>.json`
- Locale change reloads the document (in-memory prefs other than theme reset)
- e2e continues to assert English (base locale)
