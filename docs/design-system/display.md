# Status, data and feedback

`Banner`, `Chip`, `ActivityChip`, `ColorDot`, `StatusDot`, `KpiCard`, `ProgressBar` in `src/lib/components/ui/`. Browse them in Storybook under `UI/*`.

## Which one?

```
Is it a message about something that went wrong or needs attention?
 └── Banner
Is it a single headline number with a label (total time, sessions, streak)?
 └── KpiCard
Is it progress toward a target?
 └── ProgressBar
Is it identifying something?
 ├── A project → ColorDot + the project name (never the dot alone)
 ├── A project code or the app version → Chip (variant "code")
 ├── A ticket id → Chip variant="ticket"
 └── An activity type → ActivityChip
Is it "is a session running right now"?
 └── StatusDot
```

## Banner

Tones: `error` (default — `role="alert"`, interrupts) and `notice` (`role="status"`, polite). Nothing else — there is no `success` or `warning` banner. Put it at the top of the screen's content, under `PageHeader`. A dismiss action goes in the `action` snippet as `Button variant="inline" size="xs"`.

```svelte
<!-- Correct — src/lib/components/projects/ProjectsView.svelte -->
<Banner>
	{sessionStore.error}
	{#snippet action()}
		<Button variant="inline" size="xs" onclick={() => sessionStore.clearError()}
			>{m.common_dismiss_capital()}</Button
		>
	{/snippet}
</Banner>

<!-- Incorrect — hand-built alert: no role, hard-coded colours -->
<div class="bg-red-900 p-4 text-red-200">{error}</div>
```

Banner is for errors from the session/store layer that affect the whole screen (`sessionStore.error`). A screen's own failed query is an inline alert line in place of the content ([shell.md](./shell.md)), never `ErrorState` — that renders its own `<h1>`. A field error goes on `Field error=…`; a failed form submit is an inline `role="alert"` line in the form; a success confirmation is a `role="status"` line beside the button — all three in [forms.md](./forms.md).

## KpiCard

`label`, `value` (pre-formatted string), `caption?`, `valueTone` (`default` | `primary`), `captionTone` (`muted` default | `positive` | `negative`). `primary` value tone is for the one headline metric of a row; the rest stay `default`. Lay several out in `grid grid-cols-2 gap-gutter md:grid-cols-3` (`ProjectKpis`); `class` takes grid spans only.

```svelte
<!-- src/lib/components/project/ProjectKpis.svelte -->
<KpiCard
	label={m.insights_kpi_total_time()}
	value={totalLabel}
	caption={periodPhrase}
	valueTone="primary"
/>
```

## ProgressBar

`value` (0–100, clamped), `label` (required — the accessible name), `size` (`md` default | `sm` in dense rows), `fill` (`primary` default | `secondary` when the target is met | a project hex from `PROJECT_COLOR_PALETTE`).

## Chip and ActivityChip

`Chip` variants: `code` (default — project code, app version) and `ticket` (bordered, `primary` ink, truncates; pass `title` with the full text). `ActivityChip` takes the whole `ActivityType` and resolves its colour itself — never pass it classes for colour or build your own activity pill.

## ColorDot and StatusDot

`ColorDot color={project.color}` — `sm` (8px circle, lists and tables, default) or `md` (14px square, row headers, legends). `StatusDot tone="live" | "idle"` — the only glowing element in the app; `live` means a session is running right now, nothing else. Never use `StatusDot` for project identity or a generic bullet.
