/**
 * Client-only rendering for the mock session store (ADR-0004).
 * Timer lifecycle and fixtures live in a module singleton; SSR would
 * share that state across requests and risk hydration mismatches.
 *
 * Deferred: enable SSR after real API integration (backlog SSR-1).
 * Full analysis, risks, and enablement plan: docs/ssr-enablement.md
 */
export const ssr = false;
