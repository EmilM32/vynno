# P2 Backlog — Vynno Frontend

**Last updated:** 2026-08-12  
**Context:** Phase 4 exit criteria require P0+P1 done and remaining P2 items listed here.

These are intentionally **not** built yet. Prioritize when polishing for power users or before API integration.

| ID        | Item                               | Notes                                                                                                                                                                                                                                                                     |
| --------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TMR-9     | Session target duration + progress | Optional goal on timer card; domain field `targetDurationMs` already exists                                                                                                                                                                                               |
| TMR-10    | Desktop Quick Command panel        | CLI-style `switch task` / `tag` / `note` from Stitch desktop timer                                                                                                                                                                                                        |
| TMR-11+   | Rich command palette               | Current CMD+K only navigates routes; add fuzzy recent tasks + project switch                                                                                                                                                                                              |
| SHELL-5+  | Desktop top bar chrome             | Search/notifications exist on mobile TopBar; full desktop header optional                                                                                                                                                                                                 |
| LOG-6     | Edit / delete log entries          | Needs repository mutations + confirmation UI                                                                                                                                                                                                                              |
| LOG-7     | Manual time entry                  | Form without running timer                                                                                                                                                                                                                                                |
| PRJ-6     | Task list management               | Separate task entity beyond session notes                                                                                                                                                                                                                                 |
| SET-3+    | Persist daily target               | Prefs are in-memory only today                                                                                                                                                                                                                                            |
| SET-4+    | Full preferences                   | Theme list is local (`dark`, `light`, `deep-dark`); notifications, default activity type still open                                                                                                                                                                       |
| DATA      | localStorage hydrate               | Optional convenience before real API                                                                                                                                                                                                                                      |
| **SSR-1** | **Enable SvelteKit SSR**           | **Done.** Request-scoped seed + context stores + time/locale contract. See [ssr-enablement.md](./ssr-enablement.md) and [ADR-0011](./adr/0011-ssr-session-state.md). |
| CHART     | Chart library                      | **Done.** LayerChart for hours histogram + project donut. See [adr/0013-charts-layerchart.md](./adr/0013-charts-layerchart.md).                                                                                                                                             |

## Done in Phase 4 (light P2)

- SET-1 / SET-2 — Settings page + profile display
- SET-3 (local) — Daily hour target in Settings → Insights vs target
- SET-4 (partial) — Default project preference; named theme list (local only)
- TMR-11 (shell) — CMD+K route palette
- SHELL-5 (partial) — Mobile search affordance + live recording indicator

## In progress / implemented post–Phase 4

- **PRJ-5** — Project management page (`/projects`): create, edit, archive, restore, hard delete (unused only); primary nav; mock repository mutations — see [adr/0006-project-lifecycle.md](./adr/0006-project-lifecycle.md)
- **A11Y (WCAG 2.2 AA)** — Live-region discipline, focus trap, combobox palette, APG tabs/radios, contrast remaps, axe e2e. See [accessibility.md](./accessibility.md).

## Related

- [prd.md](./prd.md) §8 priorities
- [roadmap.md](./roadmap.md) Phase 4–5
