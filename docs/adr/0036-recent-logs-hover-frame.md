# ADR-0036: Recent Logs hover — a travelling frame

**Status:** Accepted  
**Date:** 2026-11-06  
**Deciders:** Project owner

## Context

Dashboard → Recent Logs lit each row with a plain `transition-colors` background on hover. The owner asked for a richer hover in the Majer style (soft scene, sharp data).

## Decision

1. **One frame for the whole list.** A single `surface-container-high` frame glides between rows (`translateY`, `--duration-travel` 240ms, `--ease-in-out`) instead of each row lighting up. Its first appearance and keyboard focus land on the row with no glide; leaving fades it out (`--duration-ui-exit`).
2. **The restart icon follows the frame, not the pointer.** It shows on the row the frame is on (`data-current`), and fades on the frame's own duration and curve, so the icon and the background arrive together. When the frame only fades (first entry, keyboard, leaving), the icon fades with it at `--duration-ui-exit`.
3. **A readout in the header** (desktop only, `aria-hidden`): `range: 14:08–14:17 // Mon, Oct 5` in mono — key in `primary`, value in `on-surface`, comment muted. It updates when the highlighted row changes and fades with the frame.
4. **Reduced motion**: the frame jumps between rows; the fades stay. Touch pointers are ignored, so phones keep the static list.
5. New token `--duration-travel: 240ms` in `tokens.css`.

This is a deliberate exception to "list hovers: colour only" in [motion.md](../motion.md): the owner chose the travelling frame as the hover itself. It moves only `transform` and `opacity`, stays under 300ms, and never runs from the keyboard.

## Rejected

| Direction                                    | Why not                                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Per-row hover scale / lift                   | "Hover scale on every row" is on the motion.md _not_ list.                               |
| A 0–24h axis under each row (day-span ruler) | Built and tried; the owner found the ticks and marks at the row's bottom edge untidy.    |
| Icon on `group-hover` (150ms)                | Appeared before the gliding background reached the row; the two read as separate events. |
| Readout pinned over the list's bottom corner | The list scrolls; a pad there would cover the last visible row.                          |
