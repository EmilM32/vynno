# ADR-0009: Public product name is Vynno

**Status:** Accepted  
**Date:** 2026-08-13  
**Deciders:** Project owner

## Context

The UI and mockups shipped as **DevTime**. That name reads as a repo or internal tool (audience + category) and boxes the product as “developers only.” The product is a focus-time tracker for anyone; developers are the first users.

## Decision

1. The **public name** is **Vynno** (VIN-oh). Canonical spelling, meaning, and voice live in [brand.md](../brand.md).
2. This repository and the npm package are **`vynno`**. The companion API lives in [vynno-api](https://github.com/EmilM32/vynno-api).
3. Theme storage key is `vynno-theme` (the previous key is still read as a fallback). CSS prefix `--dt-*` stays until a deliberate token rename.
4. Changing the public name again follows [rename-process.md](../rename-process.md).

## Amendment (2026-08-14)

Repo, package, and theme storage key were aligned with the public name. Decision 2–3 above replace the earlier “leave plumbing as the old working name” clause.

## Consequences

### Positive

- User-facing chrome can say a product name, not a feature description.
- Brand copy has one source of truth.
- Repo name, package name, and public name match.

### Negative / tradeoffs

- CSS token prefix `--dt-*` still diverges from the product name.

## Alternatives considered

| Option                             | Why not                                                         |
| ---------------------------------- | --------------------------------------------------------------- |
| Keep DevTime                       | Feels like a library, not a product.                            |
| Rename the git repo and tokens now | Repo/package rename landed later; `--dt-*` is still deferred.   |
| Tockl / Wynlo                      | Considered; Vynno was chosen as the more finished coined brand. |
