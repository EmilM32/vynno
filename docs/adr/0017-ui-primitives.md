# ADR-0017: UI primitives own their chrome classes

**Status:** Accepted  
**Date:** 2026-08-24  
**Deciders:** Project owner

## Context

Running the Storybook workshop ([0016](./0016-storybook-workshop.md)) made the shape of `src/lib/components/` obvious: almost everything in it is a composed component (`ProjectRow`, `LogRow`, shell chrome). The atomic layer barely existed — `ui/` held only `Dialog`, `ConfirmDialog`, and `ActivityChip`.

Buttons were therefore hand-written at every call site. Measured across `src/`:

|                                                |                                            |
| ---------------------------------------------- | ------------------------------------------ |
| Raw `<button>` elements                        | **65**                                     |
| …carrying `.press`                             | **28 (43%)**                               |
| Raw `<span class="material-symbols-outlined">` | **29**, across 5 ad-hoc `text-[Npx]` sizes |

The `.press` gaps were **categorical, not random**: 100% of bordered-secondary buttons (11), tabs (5), inline text buttons (6), icon-only actions (4) and destructive buttons (2) were missing it. `ProjectRow`'s Edit / Archive / Restore / Delete were the reported example.

Alongside that, one visual role shipped with divergent tokens — `hover:bg-primary-container` (9 sites) vs `hover:bg-primary-fixed-dim` (5), `disabled:opacity-40|50|60|70`, twelve padding permutations — plus two outright bugs: `SideNav`'s CTA used `text-background` instead of `text-on-primary`, and `CurrentFocus`'s CTA link had no `focus-ring` at all.

[design-system.md](../design-system.md) §8 already _declared_ this inventory ("Primary button", "Ghost / secondary button", "Text input", "Status dot", "KPI card"). The code never built it, and [0001](./0001-frontend-stack.md) had warned: _"Tailwind can encourage one-off utility soup; mitigate with design tokens and small presentational components."_

## Decision

1. **`Button`, `IconButton`, and `Icon` in `src/lib/components/ui/` own the chrome.** `.press`, `.focus-ring`, hover and disabled tokens, radius, and the size scale are properties of the component, not of the call site. A caller cannot omit them.

2. **`.press` is mapped per variant, not per call site.** The `PRESS` record in `Button.svelte` is the single place that decision lives. It honours [motion.md](../motion.md) rather than overriding it: `secondary` and `danger` are text buttons — chrome — so they press; `tab`, `inline`, and `link` do not, and `IconButton` never does ("icon-only table actions"). This is what gives `ProjectRow`'s row actions their press.

3. **Tokens are normalized; small visual differences are accepted.** One hover token (`primary-container`), one disabled treatment (`cursor-not-allowed` + `opacity-60`), one four-step size scale. Verified in the `UI/Button` → `Matrix` story across all three palettes.

4. **Button labels are Inter, not JetBrains Mono.** [design-system.md](../design-system.md) §3 assigns Inter to "labels, headers, instructional UI text" and mono to "timestamps, durations, project codes, numerical data". 15 buttons that had drifted to `font-mono text-code-data` moved back. Mono still belongs _inside_ a button when the content is data — see `CurrentFocus`, where the elapsed clock is a mono `<span>` within an Inter-labelled button.

5. **`class` on a primitive takes layout and colour only** — flex, width, margin, responsive visibility, and recolouring the ink-inheriting variants. Never padding, radius, border, background, or type scale. No `tailwind-merge`: the repo has two runtime dependencies and conflict-resolution would make overriding easy, which is the drift we are removing. Where a layout need genuinely collides with the base (`justify-*`), it is an explicit prop instead.

6. **A guard test enforces it.** `src/lib/components/ui/primitives.guard.test.ts` fails on a raw `<button>`, on visual utilities passed through `class`, on `text-[Npx]` on an `Icon`, and on `material-symbols-outlined` outside `Icon.svelte`. It runs in `npm test`, which is what the husky pre-commit and pre-push hooks execute — the only automation in this repo.

7. **Not everything interactive is a `Button`.** Dismiss scrims, list rows, and colour swatches stay raw markup and sit on an allowlist in the guard test, each with a reason. `motion.md` already treats these as a different category. Nav links stay `<a>` elements.

## Consequences

### Positive

- `.press` coverage is now a property of the variant. It cannot be forgotten.
- Two latent bugs fixed by construction (`text-background`, the missing `focus-ring`).
- `ProjectView`'s duplicated desktop/mobile action set collapsed into one snippet.
- `svelte/button-has-type` becomes redundant — `Button` defaults `type="button"`.

### Negative / tradeoffs

- Visual diffs to eyeball: 15 buttons change typeface, the timer transport's hover token changes, `ConfirmDialog`'s cancel loses its fill, `ProjectRow`'s buttons grow 30px → 32px.
- The variant list is 10 entries. Each maps to a role that actually exists in the app; adding an eleventh should require the same justification.
- The guard test is regex-based, not AST-based. It is deliberately blunt: false negatives are possible, false positives are cheap to read.

## Alternatives considered

| Option                                    | Why not                                                                                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `.press` on every variant unconditionally | Contradicts [motion.md](../motion.md), which excludes row and icon-only actions. Rejected in favour of honouring the existing rule. |
| Add `tailwind-merge`                      | A third runtime dependency, and real conflict resolution makes per-site overriding easy — reintroducing the drift.                  |
| Closed API, no `class` prop               | Every layout need becomes a new prop. Too rigid for `w-full` / `hidden md:inline-flex`.                                             |
| Preserve every current appearance exactly | Encodes the inconsistency into the variant matrix instead of removing it.                                                           |
| ESLint rule instead of a test             | Lint is not run by the husky hooks; `npm test` is.                                                                                  |

## Related

- [0016-storybook-workshop.md](./0016-storybook-workshop.md)
- [0003-design-system-source.md](./0003-design-system-source.md)
- [../design-system.md](../design-system.md) §8
- [../motion.md](../motion.md)
- [0018-atomic-ui-layer.md](./0018-atomic-ui-layer.md) — form, metric, and mark primitives that followed this one
