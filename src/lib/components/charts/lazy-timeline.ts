/**
 * Dynamic-import target for the Insights timeline (see `lazy-bar.ts`): static re-exports let
 * Rollup shake the layerchart barrel, so the chunk holds only what the timeline renders.
 */
export { BarChart, Text, Tooltip } from 'layerchart';
