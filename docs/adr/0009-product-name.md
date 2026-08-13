# ADR-0009: Public product name is Vynno

**Status:** Accepted  
**Date:** 2026-08-13  
**Deciders:** Project owner

## Context

The UI and mockups shipped as **DevTime**. That name reads as a repo or internal tool (audience + category) and boxes the product as “developers only.” The product is a focus-time tracker for anyone; developers are the first users.

## Decision

1. The **public name** is **Vynno** (VIN-oh). Canonical spelling, meaning, and voice live in [brand.md](../brand.md).
2. **DevTime** remains the historical name and may still appear in older docs and Stitch assets.
3. Repository / package name stays `dev-time`. CSS prefix `--dt-*` and `devtime-theme` stay until a deliberate full rename.
4. Changing the public name again follows [rename-process.md](../rename-process.md).

## Consequences

### Positive

- User-facing chrome can say a product name, not a feature description.
- Brand copy has one source of truth.

### Negative / tradeoffs

- Repo name, token prefix, and product name diverge until a full rename.
- Older ADRs and mockups still say DevTime.

## Alternatives considered

| Option                             | Why not                                                         |
| ---------------------------------- | --------------------------------------------------------------- |
| Keep DevTime                       | Feels like a library, not a product.                            |
| Rename the git repo and tokens now | Out of scope; plumbing churn for no user benefit.               |
| Tockl / Wynlo                      | Considered; Vynno was chosen as the more finished coined brand. |
