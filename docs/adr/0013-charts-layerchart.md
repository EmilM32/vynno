# ADR-0013: Charts use LayerChart

**Status:** Accepted  
**Date:** 2026-08-19  
**Deciders:** Project owner

## Context

Hours histograms were hand-rolled CSS bars. Y-axis ticks were absolute hours, but bar height was a percentage of a column with no definite height, so a 5h day sat under the 3h tick. The project dossier also needed week / month / all buckets (7 vs ~31 vs N bars) with a real scale.

[shadcn-svelte charts](https://www.shadcn-svelte.com/charts/bar) are LayerChart plus a token wrapper. This repo has no shadcn kit.

## Decision

Use **LayerChart** (`BarChart`, `PieChart`) directly, styled with Vynno `--dt-*` tokens. Do not init shadcn-svelte.

| Chart                               | Library                              |
| ----------------------------------- | ------------------------------------ |
| Dashboard + project hours histogram | LayerChart `BarChart`                |
| Insights time-by-project donut      | LayerChart `PieChart`                |
| Time-by-activity meters             | CSS tracks (ranked list, not a plot) |

Motion is off (`motion="none"`) per [motion.md](../motion.md). Axis / tooltip / grid colors map to `on-surface-variant` and `outline-variant`.

## Consequences

### Positive

- Y-axis is a real hours scale.
- Month and all-time histograms get tick thinning and tooltips for free.
- Svelte 5 native; no Chart.js canvas wrapper.

### Negative / tradeoffs

- Adds `layerchart` (and its d3 tree).
- SVG tooltips are weaker on keyboard than the old focusable bar buttons; the region keeps a visually hidden text list.

## Alternatives considered

| Option                  | Why not                                                |
| ----------------------- | ------------------------------------------------------ |
| Fix CSS `%` height only | Still homemade axes for 31-day / multi-month views.    |
| Chart.js                | Canvas; poorer Svelte 5 fit.                           |
| Full shadcn-svelte kit  | Would fight the existing token system for one feature. |
