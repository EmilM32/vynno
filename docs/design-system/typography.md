# Typography

## The scale (closed)

| Utility             | Family         | Size / line / weight   | Use                                                                                         |
| ------------------- | -------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| `text-headline-lg`  | Inter          | 24 / 32 / 600, −0.02em | Page title (`PageHeader` sets it — do not set it yourself)                                  |
| `text-headline-md`  | Inter          | 18 / 24 / 600, −0.01em | Card and section headings (`text-headline-md text-on-surface`). `Dialog` sets its own title |
| `text-body-md`      | Inter          | 14 / 20 / 400          | Default body. `<body>` already has it                                                       |
| `text-body-sm`      | Inter          | 12 / 16 / 400          | Hints, captions, secondary lines, compact buttons                                           |
| `text-code-display` | JetBrains Mono | 28 / 32 / 500          | The big number in `KpiCard` (≥ `sm`); large durations                                       |
| `text-code-data`    | JetBrains Mono | 14 / 20 / 500          | Durations, counts, times in rows and inputs                                                 |
| `text-code-label`   | JetBrains Mono | 13 / 18 / 400          | Project codes, ids, dates, mono meta                                                        |

`text-code-*` sets the size only — always pair it with `font-mono`. Never use Tailwind's `text-xs`/`text-sm`/`text-lg`…: they are off-scale and ignore the line heights above.

Body text is 14px. Nothing that is read as a sentence goes below 12px (`text-body-sm`).

## The micro-label exception

Two arbitrary sizes exist in the codebase and are the only ones allowed:

- `font-mono text-[10px] uppercase tracking-wider` — eyebrow labels over a metric (`KpiCard` on mobile), keyboard hints (`⌘K` in `SideNav` / `CommandPalette`), the app version line, `ActivityChip`. One or two words, never a sentence, never interactive text.
- `text-[11px]` — chart axis ticks (`TimelineDays`, `TimelineProjects`) and `BottomNav` tab labels, where the space is fixed by the layout.

Nothing below 10px. `text-label-caps` (in `SecuritySection`) is **not** a token — it is undefined and silently does nothing; never copy it. Do not stack an arbitrary size on a scale utility (`text-code-label text-[10px]`) — two sizes on one element resolve by stylesheet order, not by what you wrote last.

## Inter or mono?

```
Is the content a number, a duration, a time, a date, a code, an id, or something typed as a command?
 ├── Yes → font-mono + text-code-data (rows, inputs) / text-code-label (meta) / text-code-display (hero metric)
 └── No → Inter (the default — write nothing)
```

Mono also gets `tabular-nums` whenever the value changes in place (a ticking clock, a running total) so the digits do not jitter.

**Button labels are Inter**, even in the timer. When a button contains data, wrap only the data in a mono span:

```svelte
<!-- Correct — src/lib/components/projects/ProjectsView.svelte: Inter label, mono count -->
<Button variant="tab" size="sm" selected={tab === 'active'} role="tab" …>
	{m.projects_tab_active()}
	<span class="ml-1 font-mono text-code-label">({activeList.length})</span>
</Button>

<!-- Incorrect — fails the guard: `font-` is banned in a primitive's class -->
<Button class="font-mono text-code-data">{m.timer_start()}</Button>
```

Inputs pick mono through `Input tone="data"` / `tone="code"`, never through `class` — see [forms.md](./forms.md).

## Formatting durations

Never hand-roll a duration string. Use `src/lib/time/duration.ts`, which handles locale (`1,2h` in Polish):

| Need                               | Function                 | Output     |
| ---------------------------------- | ------------------------ | ---------- |
| Running clock                      | `formatClock(ms)`        | `01:42:05` |
| Compact duration (rows, chips)     | `formatCompact(ms)`      | `1h 42m`   |
| Dashboard total                    | `formatHoursMinutes(ms)` | `06h 42m`  |
| Fractional hours (targets, deltas) | `formatHoursDecimal(ms)` | `1.2h`     |

All take milliseconds — convert hours with `h * 3_600_000`.

## Mobile

Headlines may drop one step on phones (`text-headline-md md:text-headline-lg`). Mono data keeps its size at every width — columns of numbers must line up.

On a coarse pointer, `input` / `select` / `textarea` are forced to ≥16px by `src/routes/layout.css` so iOS Safari does not zoom. Do not fight it with `!` utilities.
