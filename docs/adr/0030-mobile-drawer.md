# ADR-0030: Dialogs become bottom drawers on phones

**Status:** Accepted  
**Date:** 2026-10-30  
**Deciders:** Project owner

## Context

Every modal in the app (12 call sites: forms, filters, pickers, confirms) goes through `Dialog`, a centered panel that scales in. On desktop that is right. On a phone it floats mid-screen, out of thumb reach, with a gap below it, and the action row ends up wherever the content stops. [motion.md](../motion.md) said "modals stay centered" with no phone exception.

## Decision

1. **New atom: `Drawer`** (`src/lib/components/ui/Drawer.svelte`, story `UI/Drawer`). A bottom sheet with the same props and `children({ close })` contract as `Dialog`, minus `size`.
2. **`Dialog` renders `Drawer` below 40rem** (the breakpoint its `dialog-actions` rules already used), through `MediaQuery` from `svelte/reactivity`. Call sites do not change. `mobile="dialog"` opts a single dialog out.
3. **Shared overlay logic** (focus trap, touch-aware initial focus, delayed close that reads the exit token) moves to `overlay.svelte.ts` so the two presentations cannot drift.
4. **Motion:** in and out through the bottom edge, `--duration-sheet` 260ms / `--duration-sheet-exit` 200ms on `--ease-out`. The handle row (handle + title) follows the finger; release past 30% of the sheet height or a >0.5px/ms downward flick dismisses, anything else snaps back. Reduced motion: opacity only.
5. **Mobile platform details:** the sheet pads its body and sticky `dialog-actions` by `env(safe-area-inset-bottom)`, keeps clear of the notch at the top, uses `overscroll-behavior: contain` on its scroller and `touch-action: none` on the scrim and handle row. Actions are 44px tall. `app.html` adds `interactive-widget=resizes-content` so Android's keyboard shrinks the layout and the sheet rises above it, as on iOS.

## Consequences

- Every existing modal becomes a drawer on phones with no call-site edits.
- Rotating a phone across 40rem with a dialog open swaps the presentation and remounts the body (form state inside the dialog resets). Accepted: rare, and the breakpoint is already a phone/tablet split.
- `interactive-widget=resizes-content` applies app-wide on Android Chrome: the layout viewport now shrinks with the keyboard. The shell already sizes with `dvh`, so this matches iOS.
- Drag-to-dismiss and safe-area padding are verified in emulation only until checked on hardware.

## Alternatives considered

| Option                                     | Why not                                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Opt-in `ResponsiveDialog` per call site    | The owner wanted drawers as the default; 12 edits that every future dialog must remember. |
| CSS-only: restyle the same panel on phones | No room for the drag gesture or a different header; mixes two layouts in one stylesheet.  |
| A sheet library (vaul-svelte, bits-ui)     | One component, no other consumer; motion.md bars libraries for what CSS covers.           |

## Related

- [0017-ui-primitives.md](./0017-ui-primitives.md), [0018-atomic-ui-layer.md](./0018-atomic-ui-layer.md)
- [../motion.md](../motion.md)
