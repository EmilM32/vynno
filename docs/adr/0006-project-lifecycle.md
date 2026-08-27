# ADR-0006: Project lifecycle (archive + optional hard delete)

**Status:** Accepted  
**Date:** 2026-08-12  
**Deciders:** Project owner

## Context

Sessions always reference a `projectId`. The UI needs create/edit/remove flows without breaking historical logs or leaving Timer without a selectable project. The API enforces the same lifecycle.

## Decision

1. **Primary remove path is archive** (`isArchived = true`). Archived projects are excluded from default `listProjects()` (pickers, Dashboard active strip) but remain available via `getProject(id)` for Logs/Insights labels.
2. **Hard delete** permanently removes a project only when **zero** sessions reference it. If sessions exist, delete fails with a user-facing message suggesting archive.
3. **Last active project** cannot be archived or hard-deleted.
4. **Code uniqueness** applies only when `code` is non-empty (case-insensitive among all non-deleted projects).
5. **Colors** come from a fixed palette in the UI (not free-form hex) for a11y and consistency.
6. Mutations go over HTTP (`POST`/`PATCH`/`DELETE` on `/projects`).
7. Dedicated route **`/projects`** in primary navigation (ADR-0005).

## Consequences

### Positive

- Historical sessions keep resolvable project identity after archive.
- Timer/Settings pickers stay clean.
- Repository contract matches the API’s archive / hard-delete rules.

### Negative / tradeoffs

- Insights that join only on active `listProjects()` may under-show archived project series until a later “include archived” option.
- Hard-delete of unused projects is permanent (no trash beyond archive).

## Alternatives considered

| Option                      | Why not                                                                |
| --------------------------- | ---------------------------------------------------------------------- |
| Hard delete only            | Breaks or orphans historical logs unless cascade/reassign UI is built. |
| Archive only                | Simpler, but unused projects cannot be purged.                         |
| Reassign sessions on delete | Higher scope; not in the contract.                                     |

## Related

- [../domain-model.md](../domain-model.md)
- [0005-routing-and-app-shell.md](./0005-routing-and-app-shell.md)
- [0010-http-json-contract.md](./0010-http-json-contract.md)
