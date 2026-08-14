# ADR-0006: Project lifecycle (archive + optional hard delete)

**Status:** Accepted  
**Date:** 2026-08-12  
**Deciders:** Project owner  

## Context

Sessions always reference a `projectId`. The UI needs create/edit/remove flows (PRJ-5) without breaking historical logs or leaving Timer without a selectable project. A real API will later map to soft-delete semantics; the mock repository should mirror that.

## Decision

1. **Primary remove path is archive** (`isArchived = true`). Archived projects are excluded from default `listProjects()` (pickers, Dashboard active strip) but remain available via `getProject(id)` for Logs/Insights labels.
2. **Hard delete** permanently removes a project only when **zero** sessions reference it. If sessions exist, delete fails with a user-facing message suggesting archive.
3. **Last active project** cannot be archived or hard-deleted.
4. **Code uniqueness** applies only when `code` is non-empty (case-insensitive among all non-deleted projects).
5. **Colors** come from a fixed palette in the UI (not free-form hex) for a11y and consistency.
6. Mutations go over HTTP (`POST`/`PATCH`/`DELETE` on `/projects`). On the mock, a full reload still resets because the mock workspace is SPA-scoped (ADR-0010).
7. Dedicated route **`/projects`** in primary navigation (ADR-0005 updated).

## Consequences

### Positive

- Historical sessions keep resolvable project identity after archive.  
- Timer/Settings pickers stay clean.  
- Repository contract maps cleanly to a future soft-delete API.  

### Negative / tradeoffs

- Insights that join only on active `listProjects()` may under-show archived project series until a later “include archived” option.  
- Hard-delete of unused projects is permanent in-session (no trash beyond archive).  

## Alternatives considered

| Option | Why not |
|--------|---------|
| Hard delete only | Breaks or orphans historical logs unless cascade/reassign UI is built. |
| Archive only | Simpler, but unused mock projects cannot be purged during demos. |
| Reassign sessions on delete | Higher scope; defer until API. |

## Related

- [../domain-model.md](../domain-model.md)  
- [../prd.md](../prd.md) §8.6 PRJ-5  
- [0004-state-and-data-strategy.md](./0004-state-and-data-strategy.md)  
- [0005-routing-and-app-shell.md](./0005-routing-and-app-shell.md)  
