/**
 * Client-only rendering for the mock session store (ADR-0004).
 * Timer lifecycle and fixtures live in a module singleton; SSR would
 * share that state across requests and risk hydration mismatches.
 */
export const ssr = false;
