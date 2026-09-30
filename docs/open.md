# Open work

What is **not** built yet. If it is not on this list, assume it shipped.

## Product polish (P2)

| Item                        | Notes                                                     |
| --------------------------- | --------------------------------------------------------- |
| Desktop Quick Command panel | CLI-style switch-task / tag / note on Timer               |
| Desktop top bar             | Search / notifications exist on mobile TopBar only        |
| Task list entity            | Sessions carry a free-text `note`; no separate Task table |
| Default activity type       | Settings extra still open                                 |

## Not open

Live API, cookie auth, SSR, log edit/delete, manual entry, Storybook, local production (`scripts/start`), named themes including light, project CRUD, per-project view, Insights range (grain + custom), tab/device sync, live tab title, action ⌘K palette.

## Removed on purpose

Per-session target (Timer `Target` toggle, progress, and "target reached" notification): removed in EMI-147; the daily hour target covers the need. The API dropped `targetDurationMs` as well (EMI-152). Do not re-add without the owner asking.
