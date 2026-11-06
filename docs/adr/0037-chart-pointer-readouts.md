# ADR-0037: Chart pointer readouts — heatmap day, donut centre, clock needle

**Status:** Accepted  
**Date:** 2026-11-06  
**Deciders:** Project owner

## Context

After the Recent Logs frame ([0036](./0036-recent-logs-hover-frame.md)) the owner asked for a Majer-style pass over the charts: the hand acts on the drawing itself, and a mono readout names what is under it, updating in the same frame. Three charts answered a pointer with a native `title` or a floating LayerChart tooltip that appeared and disappeared per mark, and the year heatmap could not be read from the keyboard at all (a known minus of [0027](./0027-year-heatmap-streaks.md)).

The data itself still never moves: bars, arcs and squares snap, as [motion.md](../motion.md) requires. Only the marker that says "this one" moves, under the pointer.

## Decision

1. **Year heatmap (Dashboard).**
   - One 1px `primary` frame travels between squares under the pointer on a 380/34 spring (`$lib/motion/spring`, `SPRING_FRAME`). Its state lives in plain variables and is written to `style.transform` from a `requestAnimationFrame` loop that stops at rest.
   - The footer hint and a day readout share one slot: `Thu, Nov 5, 2026: 2h 45m // 34% of target` (key `primary`, value `on-surface`, comment muted). It replaces the per-square `title`.
   - The scroll region's arrow keys move a day cursor (±1 day / ±1 week, Shift ×4 weeks, Home / End, Escape clears). Keyboard moves jump with no travel, scroll the square into view, and turn on `aria-live="polite"` for the readout. Pointer moves leave it off.
   - A resize hides the frame. Touch pointers are ignored.
2. **Project donut (Insights).** The slice under the pointer, or the legend row under the pointer or focus, takes over the centre (`5h 40m` / `Northwind · 25%`). The other arcs dim through LayerChart's own `series.highlightKey`. There is no floating tooltip.
3. **Timeline Days (Insights).** A 1px `primary` needle follows the pointer across every day (`crosshair` cursor), with no travel. A readout under the chart says `12:16: days with a session 3/5`, or the clock window and the days with any time at rest. The per-session tooltip stays.
4. **Reduced motion.** The heatmap frame jumps, and the fades stay. The needle never had travel.

This extends 0036's exception to "list and chart hovers: colour only". Each piece moves only `transform` and `opacity`, never runs by itself, and the keyboard path has no animation.

## Rejected

| Direction                                     | Why not                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| CSS `--duration-travel` for the heatmap frame | 240ms per square lags across a 53-column field; the spring retargets smoothly.   |
| A floating tooltip that follows the heatmap   | Covers the neighbouring squares the eye is comparing.                            |
| Snapping the needle to 5 or 15 minutes        | The readout would lie about the minute under the pointer.                        |
| Hatching the TodaySummary overage             | `secondary` means "target met" in [colors.md](../design-system/colors.md); open. |
