# ADR-0033: `DatePicker` is a themed calendar popover on a fine pointer, native on touch

**Status:** Accepted  
**Date:** 2026-11-03  
**Deciders:** Project owner  
**Amends:** [ADR-0021](./0021-insights-range.md) and [ADR-0022](./0022-logs-filters.md) ("no calendar widget")

## Context

Every date in the app was a native `input type="date"` or `type="datetime-local"`: the Insights and Logs custom ranges, the session form, the Timer start time and the long-session Stop at… dialog. Closed, they matched Dev-Density Dark. Open, the OS drew the picker: system font, light chrome in dark themes, nothing from the six palettes. The closed field also differed per browser (`28.10.2026` in Chrome with a Polish locale, `2026-10-28` elsewhere). ADR-0021 and ADR-0022 accepted this to avoid a calendar widget; `Select` (ADR-0032) has since shown that a themed popover with a native fallback on touch is affordable.

Four directions were prototyped side by side (`/proto/date-picker`, deleted after this decision), each in two real scenes: the Custom range dialog and the session form, with a range across a month boundary and a session across midnight.

## Decision

1. **Popover.** A field-shaped trigger (`button`, `aria-haspopup="dialog"`) shows the value in mono — `2026-10-28 wed` for a date, `2026-11-02 23:40` for a date and time — and opens a calendar of one month under it. A date commits on click / Enter and closes. A date and time keeps a draft: the day and the `HH` : `MM` fields edit it, **Done** (or Enter in a time field) commits and closes, Escape throws it away. A Timer-style `onchange` therefore fires once per decision, not once per click.
2. **Two renderings, one primitive** — the same split as `Select`. On `(pointer: coarse)` it renders `Input type="date" | "datetime-local"` unchanged, so phones keep the OS picker.
3. **APG date picker dialog.** Focus moves into the grid on open (selected day, else today, else the last allowed day). Arrows move by day / week, Home / End to the week's ends, PageUp / PageDown by month (Shift: year). Days outside `min` / `max` stay focusable but cannot be picked (`aria-disabled`). Escape closes and stops propagation so a surrounding `Dialog` stays open; focus returns to the trigger. Tab cycles inside the panel, so a `datetime` draft is left only by Done or Escape. The trigger's value is its `aria-describedby` (spoken as a full date), since `<label for>` replaces its text as the name. On a touch laptop (`any-pointer: coarse`) day cells grow to 40px.
4. **The panel is `popover="manual"`** in the top layer, positioned `fixed` from the trigger and flipped above when there is more room — `Dialog` panels scroll and would clip an `absolute` one. Outside pointer-down closes it.
5. **Value format is the native one** (`YYYY-MM-DD`, `YYYY-MM-DDTHH:MM`), as are `min` / `max`, so call sites and validation (`customInsightRange`, `SessionForm`) keep working unchanged.
6. **Weeks start on Monday** (as `startOfWeekMonday`); month and weekday names come from `Intl` in the Paraglide locale.
7. **No enter animation**, as `Select` and `Menu`: [motion.md](../motion.md)'s frequency gate.

## Rejected

| Direction                                                                               | Why not                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Keep native everywhere                                                                  | The open picker ignores the theme — the reason for this change.                                                                                                                                                                |
| **Segments** — typed `yyyy-mm-dd hh:mm` spinbuttons, calendar behind an icon            | Fastest for typists, but six spinbuttons are the most custom accessibility to keep; clicking the `Field` label cannot focus a group; the mouse becomes second-class in a mostly-mouse app.                                     |
| **One surface** — a two-month range calendar, and a calendar with hour / minute columns | Two clicks per range is nice, but the range panel is ~540px wide (wider than an `md` dialog), it changes the Insights / Logs dialogs from two fields to one, and the time columns are a lot of code for a value usually typed. |

## Consequences

### Positive

- The open picker follows the theme in all six palettes; the closed value reads the same in every browser.
- Out-of-range days are visibly unavailable instead of being rejected after the fact.

### Negative / tradeoffs

- No typing on desktop: a date is picked, not entered. Year jumps are Shift+PageUp, not four digits.
- Two code paths, both to test (desktop and `pointer: coarse` emulation).
- e2e cannot `.fill()` a date on desktop viewports; `e2e/helpers.ts` gains `setDate` / `expectDate`.
- A custom calendar is ours to keep accessible.
