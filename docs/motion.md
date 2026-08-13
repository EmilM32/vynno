# Motion — Vynno

**Status:** Source of truth for animation taste  
**Last updated:** 2026-08-13

How motion feels in this product, when it is allowed, and which values to use. Brand voice is in [brand.md](./brand.md). Visual tokens are in [design-system.md](./design-system.md). This file is the motion half of that system.

Implementations live in `src/lib/theme/tokens.css` (curves and durations) and `src/routes/layout.css` (`.blink`, `.pulse-border`, `.press`).

---

## Personality

Vynno is a **crisp, dense, keyboard-first focus tracker**. The chrome is IDE-like — precise, not cute. Playfulness lives in the name, not in the motion.

Motion should feel like the interface is listening, not performing. A user who lives in Timer and Dashboard all day should never notice animation as a layer. They should notice that Start pressed, that the confirm dialog came from the middle of the screen, and that the live session is still running.

| This product is                            | This product is not                    |
| ------------------------------------------ | -------------------------------------- |
| Fast, quiet, functional                    | Bouncy, staggered, decorative          |
| Status that breathes (blink, pulse-border) | Charts that draw themselves            |
| One overlay that moves (confirm)           | Page transitions, palette choreography |
| Press feedback on chrome                   | Hover scale on every row               |

If a proposed animation would look at home on a marketing site or a consumer habit app, it is the wrong animation.

---

## The gate (run this first)

Every new motion answers these in order. Failing any one means **do not animate**.

### 1. How often will someone see it?

| Frequency                                                                     | Decision                                                 |
| ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| 100+ times/day — ⌘K, arrow-key highlight, ticking clock, keyboard focus jumps | **No animation. Ever.**                                  |
| Tens of times/day — nav, list hovers, Start/Pause/Stop, tabs, swatches        | Near-imperceptible only (press scale, color), or nothing |
| Occasional — confirm dialog, project form, error banners, tooltips            | Standard UI motion (≤ 300ms)                             |
| Rare / first-time — session-complete, empty-state first visit                 | The only place delight is allowed                        |

Keyboard-initiated actions are a disqualifier, not a judgment call. The command palette has no open/close motion. That is correct. Do not “improve” it.

### 2. Why does it animate?

Name one purpose:

- **Feedback** — the interface heard the press (`.press`)
- **State indication** — a live session is running (`.blink`, `.pulse-border`)
- **Preventing a jarring change** — confirm dialog appears/disappears
- **Spatial consistency** — something leaves the way it entered
- **Explanation** — marketing / onboarding only (we have none)
- **Delight** — rare tier only

“It looks cool” is not a purpose. If you cannot name one of the above, delete the motion.

### 3. Does it help someone act, or get in the way of reading?

Data the user is reading or comparing must not move for style. Insights bars, the project donut, KPI numbers, and the ticking clock snap. `tabular-nums` is the non-motion solution for changing digits.

### 4. Can it stay inside budget?

UI stays **under 300ms**. If it only works as a slow, showy piece, it fails.

---

## Tokens

Do not invent a second curve or duration. Add to this set, or use it.

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1); /* enter, exit, press */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* something already on screen, morphing */
--duration-press: 160ms;
--duration-tooltip: 150ms;
--duration-ui: 200ms; /* dialogs, header collapse */
```

Defined in `src/lib/theme/tokens.css` (`@theme`).

| Situation                      | Easing                  | Duration                            |
| ------------------------------ | ----------------------- | ----------------------------------- |
| Entering or exiting            | `--ease-out`            | 200ms (dialog), 125–160ms (tooltip) |
| Moving / morphing on screen    | `--ease-in-out`         | 200ms                               |
| Hover / color change           | Tailwind default `ease` | ~150ms — do not retokenize          |
| Constant motion (blink, pulse) | `linear`                | loop; not a UI duration             |
| Press                          | `--ease-out`            | 160ms                               |

**Never `ease-in` on UI.** It delays the moment the user is watching. Built-in CSS `ease-out` is too weak for deliberate motion — use the token.

Color hovers (`transition-colors` on rows, inputs, nav) stay on Tailwind’s default `ease`. They are not “deliberate motion.”

---

## What ships today

| Surface                                        | Motion                                                                    | Purpose                | Notes                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------- |
| Active Timer card / TimerView                  | `.pulse-border` (2s loop)                                                 | State indication       | Brand signature. Paint cost accepted.                    |
| Current Focus (Dashboard)                      | None (solid border)                                                       | State indication       | Primary / tertiary / outline by session status.          |
| Active status dot, TopBar record icon          | `.blink` (1s linear)                                                      | State indication       | Design-system live indicator.                            |
| Primary / secondary chrome buttons, bottom nav | `.press` → `scale(0.97)`                                                  | Feedback               | Pointer-down, not click.                                 |
| Confirm dialog                                 | `@starting-style` scale 0.96 + opacity, 200ms `--ease-out`, same path out | Prevent jarring change | Origin **center** (modals are not trigger-anchored).     |
| Page header description                        | `grid-template-rows` + opacity, 200ms `--ease-in-out`                     | Prevent jarring change | Accordion exception: height-family is allowed here only. |
| List / nav / field hovers                      | `transition-colors`                                                       | Feedback               | Tens/day; keep.                                          |
| Command palette                                | **None**                                                                  | —                      | Keyboard, 100+/day.                                      |
| Insights bars, donut, KPIs, clock              | **None**                                                                  | —                      | Functional data.                                         |
| Route / page content                           | **None**                                                                  | —                      | Core nav.                                                |

A toast is mentioned in [screens-and-flows.md](./screens-and-flows.md) but does not exist. When it is built, enter and exit the **same edge** with a CSS transition (not keyframes), `translateY(100%)`, `--ease-out`, 200–300ms.

---

## Recipes for new work

Cheapest tool that works: CSS transition → `@starting-style` for mount → WAAPI if you need programmatic control. Do **not** add a motion library for a fade.

Animate **`transform` and `opacity` only.** `width` / `height` / `margin` / `padding` / `top` / `left` are forbidden except the header collapse (and future accordions, if any). Never `transition: all`.

Never `scale(0)`. Start from `scale(0.95–0.97)` plus opacity. Nothing in the real world appears from nothing.

Popovers, menus, and tooltips scale from their **trigger** (`transform-origin` at the source). **Modals stay centered.**

Exit the way it entered. A dialog that scales in from center scales out to center. A future toast that rises from the bottom leaves through the bottom.

Rapidly triggered UI (toasts, toggles) uses **transitions**, not keyframes — transitions retarget; keyframes restart from zero.

Pressable chrome uses the shared `.press` class. Do not sprinkle a new scale on a one-off button. Do **not** put `.press` on nav rows, list rows, or icon-only table actions.

```css
/* Already in layout.css — use the class, do not fork */
.press:active:not(:disabled) {
	transform: scale(0.97);
}
```

Group entrances (stagger 30–80ms) are decorative and must never block input. Daily screens (Dashboard, Insights, Timer) do not stagger.

---

## Reduced motion

Reduced motion means **fewer and gentler**, not zero.

| Keep                                      | Drop                                |
| ----------------------------------------- | ----------------------------------- |
| Color and opacity that aid comprehension  | Transform / position / scale        |
| Instant state changes that replace a loop | `.blink`, `.pulse-border`           |
| Press with no scale                       | `.press:active { transform: none }` |

Do not restore a global `* { transition-duration: 0.01ms }` hammer. Scope reduced-motion to the thing that moves.

Gate hover _transforms_ with `@media (hover: hover) and (pointer: fine)`. Touch fires a false hover and leaves the element scaled. Color hovers do not need this gate.

---

## Do not

| Don’t                                                     | Why                                          |
| --------------------------------------------------------- | -------------------------------------------- |
| Animate ⌘K or any 100+/day keyboard action                | Feels slow and disconnected                  |
| Animate route changes                                     | Core nav, tens-to-hundreds/day               |
| Tween chart widths, draw the donut, tick KPI/clock digits | Functional data; decoration hinders          |
| Theme-crossfade by transitioning CSS variables            | Recalculates the whole tree                  |
| `scale(0)`, `ease-in`, `transition: all`                  | Automatic review blocks                      |
| Press scale outside `0.95–0.98`                           | `0.90` is squash, not feedback               |
| Bounce, spring overshoot, or stagger on daily UI          | Wrong personality                            |
| Install Motion / GSAP / Framer for a fade                 | CSS is enough                                |
| A second easing scale “just for this component”           | Cohesion finding                             |
| Hold-to-confirm on Delete                                 | `ConfirmDialog` is the confirmation language |
| Page-load stagger on Dashboard or Insights                | Those screens are daily, not rare            |

---

## How to add something later

1. Run the gate. Write the frequency tier and the named purpose in the PR description, one line each.
2. Use existing tokens and, if it is pressable chrome, `.press`.
3. Ship reduced-motion and hover gating with the animation, not as a follow-up.
4. Feel-check: play it at 2–5× in the Animations panel, then look again the next day. If you are unsure whether it feels right, **delete it**.

Optional follow-ups that already passed the gate and are not built: project-form enter (`translateY(-4px)` + fade, 200ms `--ease-out`), error-banner enter (same recipe), weekly-bar tooltips (125–160ms, origin bottom, instant after the first in the group). Everything else in the “Do not” table stays out.
