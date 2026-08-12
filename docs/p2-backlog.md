# P2 Backlog — DevTime Frontend

**Last updated:** 2026-08-12  
**Context:** Phase 4 exit criteria require P0+P1 done and remaining P2 items listed here.

These are intentionally **not** built yet. Prioritize when polishing for power users or before API integration.

| ID | Item | Notes |
|----|------|--------|
| TMR-9 | Session target duration + progress | Optional goal on timer card; domain field `targetDurationMs` already exists |
| TMR-10 | Desktop Quick Command panel | CLI-style `switch task` / `tag` / `note` from Stitch desktop timer |
| TMR-11+ | Rich command palette | Current CMD+K only navigates routes; add fuzzy recent tasks + project switch |
| SHELL-5+ | Desktop top bar chrome | Search/notifications exist on mobile TopBar; full desktop header optional |
| LOG-6 | Edit / delete log entries | Needs repository mutations + confirmation UI |
| LOG-7 | Manual time entry | Form without running timer |
| PRJ-5 | Project CRUD UI | Create/rename/archive/color picker |
| PRJ-6 | Task list management | Separate task entity beyond session notes |
| SET-3+ | Persist daily target | Prefs are in-memory only today |
| SET-4+ | Full preferences | Theme (N/A dark-only), notifications, default activity type |
| DATA | localStorage hydrate | Optional convenience before real API |
| CHART | Chart.js / library | CSS charts sufficient for mock; revisit if product wants interaction |
| A11Y | Full focus trap in palette | Light dialog today; roving tabindex / focus trap libraries later |

## Done in Phase 4 (light P2)

- SET-1 / SET-2 — Settings page + profile display  
- SET-3 (local) — Daily hour target in Settings → Insights vs target  
- SET-4 (partial) — Default project preference  
- TMR-11 (shell) — CMD+K route palette  
- SHELL-5 (partial) — Mobile search affordance + live recording indicator  

## Related

- [prd.md](./prd.md) §8 priorities  
- [roadmap.md](./roadmap.md) Phase 4–5  
