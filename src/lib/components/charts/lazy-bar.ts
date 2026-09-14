/**
 * Dynamic-import target for the bar chart.
 *
 * `import('layerchart')` at a call site pulls the whole package barrel into one async chunk,
 * because Rollup cannot tree-shake a runtime namespace request. Re-exporting the two components
 * statically here lets it shake the barrel at build time, so `import('./lazy-bar')` emits a chunk
 * holding only what WeeklyOverview renders.
 */
export { BarChart, Tooltip } from 'layerchart';
