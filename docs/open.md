# Open work

What is **not** built yet. If it is not on this list, assume it shipped.

## Product polish (P2)

| Item | Notes |
| ---- | ----- |
| Session target duration | Domain field `targetDurationMs` exists; no Timer UI |
| Desktop Quick Command panel | CLI-style switch-task / tag / note on Timer |
| Richer command palette | ⌘K is route navigation only; no fuzzy recent-task / project switch |
| Desktop top bar | Search / notifications exist on mobile TopBar only |
| Task list entity | Sessions carry a free-text `note`; no separate Task table |
| Persist daily target + default project | Theme is `localStorage`; other prefs are in-memory |
| Notifications / default activity type | Settings extras still open |

## Native desktop

Packaged macOS `.app` (Tauri 2) as a **second target**. Browser local production stays. Architecture and sequence: [tauri.md](./tauri.md), [ADR-0015](./adr/0015-native-desktop-tauri.md).

## Not open

Live API, cookie auth, SSR, log edit/delete, manual entry, Storybook, local production (`scripts/start`), named themes including light, project CRUD, per-project view.
