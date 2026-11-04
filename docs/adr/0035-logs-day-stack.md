# ADR-0035: Logs days collapse into a card stack

**Status:** Accepted  
**Date:** 2026-11-03  
**Deciders:** Project owner

## Context

Logs lists completed sessions newest first, split by day: a mono date, a dashed divider, then the rows. A long day (ten or more rows) pushes the next days far down, and there was no way to put a day you are done reading out of the way. A plain show/hide would make the rows blink out and the days below jump.

Three directions were prototyped against the real `LogRow` (`/proto/logs-stack`, deleted after this decision).

## Decision

1. **Every day with more than one card gets a disclosure chevron** next to its date (`IconButton`, `aria-expanded`, `aria-controls` → the day's rows). It points down when open and rotates to the right when stacked, 200ms `--ease-in-out`, like the Settings disclosure.
2. **Collapsed, the day is a card stack.** The newest card stays on top at full size. The next two peek 8px below it, each one 4% smaller and dimmer (opacity 0.8, 0.55). Older cards sit hidden behind them. An expanded group in Grouped folds back as the day stacks, so the top card keeps its own height.
3. **The cards slide onto each other with a stagger.** Each card moves (`transform` + `opacity`) so its bottom edge lands on its stack position: `--duration-stack` 260ms, `--stagger-stack` 30ms per card, `--ease-out`. The fourth and later cards move with the third, so the longest run is 350ms. Expanding reverses the same transitions. Transitions retarget, so a click mid-move turns the stack around from where it is.
4. **The day's height animates.** The column under the date transitions `height` with the same curve, so the days below follow instead of jumping. This brings back a height exception in [motion.md](../motion.md), scoped to this component. The animation runs only while toggling, so a note expanding inside an open day does not tween.
5. **The collapsed stack is a pointer target too.** A full-surface hit area expands it. It is `tabindex="-1"` and `aria-hidden`, because the chevron is the one keyboard and screen-reader control. Collapsed rows are `inert`.
6. **Reduced motion** keeps the opacity fade. The cards and the height snap, and the chevron does not rotate.
7. **The divider always ends in the day summary** (`7 sessions · 6h 05m`), open or stacked, and on single-card days too.
8. The state is per day and per visit. It is not saved, and it survives switching between Entries and Grouped. A day filtered down to one card shows it open, and stacks again when the filter clears.

The stagger and the 350ms run are a deliberate exception to "no stagger on daily UI" in motion.md: the owner chose the stacking motion itself as the feedback, and stacking a day is an occasional action, not a 100-a-day one.

## Rejected

| Direction                                                                 | Why not                                                                                     |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Fold** — every card moves at once, 200ms `--ease-in-out`, 4px edges     | Inside motion.md, but the stack barely reads as cards landing on each other.                |
| **Summary** — the top card becomes a day summary (count, projects, range) | A new surface to design and keep in sync; the divider's `sessions · total` already says it. |
| Show/hide with no motion                                                  | The rows blink out and the following days jump by hundreds of pixels.                       |
