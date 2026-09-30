<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { DayTotalsQuery } from '$lib/stores/day-totals.svelte';
	import { usePrefs } from '$lib/stores/prefs.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import { dayKeyDate } from '$lib/time/civil-days';
	import { totalsByDate, withLiveSession } from '$lib/time/day-totals';
	import { formatCompact, localDateKeyFromDate } from '$lib/time/duration';
	import { streaks } from '$lib/time/streaks';
	import { HEATMAP_WEEKS, heatmapModel, heatmapStart, type HeatLevel } from './heatmap';

	/**
	 * A year of tracked time from `/stats/days`, one square per day, shaded against
	 * the daily target. The squares scale with the card; a card too narrow for the
	 * smallest squares scrolls, starting at the newest week.
	 */

	let { class: className = '' }: { class?: string } = $props();

	const sessionStore = useSession();
	const prefsStore = usePrefs();
	const query = new DayTotalsQuery();

	const LEVEL_CLASS: Record<HeatLevel, string> = {
		0: 'bg-surface-container-highest',
		1: 'bg-primary/25',
		2: 'bg-primary/50',
		3: 'bg-primary/75',
		4: 'bg-primary'
	};
	const LEVELS: HeatLevel[] = [0, 1, 2, 3, 4];
	/** Month labels this close to the right edge end-align so they never spill past it. */
	const LAST_WEEKS = HEATMAP_WEEKS - 2;

	const today = $derived(
		localDateKeyFromDate(new Date(sessionStore.nowMs || Date.now()), sessionStore.timeZone)
	);
	const days = $derived({
		from: heatmapStart(today),
		to: today,
		timeZone: sessionStore.timeZone
	});

	// Refetch for a new day, and after a session write here or in another tab.
	$effect(() => {
		void sessionStore.revision;
		const range = days;
		untrack(() => void query.load(range, sessionStore.listDayTotals));
	});

	const byDate = $derived(
		totalsByDate(
			withLiveSession(query.rows ?? [], sessionStore.activeSession, days, sessionStore.nowMs)
		)
	);
	const model = $derived(heatmapModel(today, byDate, prefsStore.dailyTargetMs));
	const streak = $derived(streaks(byDate, days.from, today));
	const activeDays = $derived([...byDate.values()].filter((ms) => ms > 0).length);
	const totalMs = $derived([...byDate.values()].reduce((sum, ms) => sum + ms, 0));
	const ready = $derived(query.isFor(days));

	const monthFormat = $derived(
		new Intl.DateTimeFormat(getLocale(), { month: 'short', timeZone: 'UTC' })
	);
	const cellFormat = $derived(
		new Intl.DateTimeFormat(getLocale(), {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			timeZone: 'UTC'
		})
	);
	/** Mon, Wed, Fri, like most calendars' heatmaps; the rest stay blank. */
	const weekdayLabels = $derived.by(() => {
		const format = new Intl.DateTimeFormat(getLocale(), { weekday: 'short', timeZone: 'UTC' });
		// 2024-01-01 is a Monday.
		return [0, 1, 2, 3, 4, 5, 6].map((d) =>
			d % 2 === 0 && d < 6 ? format.format(dayKeyDate(`2024-01-0${d + 1}`)) : ''
		);
	});

	const stats = $derived([
		{ id: 'streak', label: m.dashboard_heatmap_streak(), value: dayCount(streak.current) },
		{ id: 'best', label: m.dashboard_heatmap_best(), value: dayCount(streak.longest) },
		{ id: 'active', label: m.dashboard_heatmap_active_days(), value: String(activeDays) },
		{ id: 'total', label: m.dashboard_heatmap_total(), value: formatCompact(totalMs) }
	]);

	function dayCount(count: number): string {
		return m.dashboard_heatmap_days({ count });
	}
</script>

<section
	class="rounded-lg border border-outline-variant bg-surface-container p-4 {className}"
	aria-labelledby="year-heatmap-title"
	data-testid="year-heatmap"
>
	<div class="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
		<h2 id="year-heatmap-title" class="text-headline-md">{m.dashboard_heatmap_title()}</h2>
		<dl class="flex flex-wrap gap-x-5 gap-y-1 font-mono text-code-label" aria-busy={!ready}>
			{#each stats as item (item.id)}
				<div class="flex items-baseline gap-1.5">
					<dt class="text-on-surface-variant">{item.label}</dt>
					<dd class="text-on-surface" data-testid="heatmap-{item.id}">
						{ready ? item.value : '—'}
					</dd>
				</div>
			{/each}
		</dl>
	</div>

	<!-- Row-reversed so a scrolling card opens on the newest week, with no script. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="heatmap-scroll focus-ring flex flex-row-reverse overflow-x-auto rounded"
		tabindex="0"
		role="region"
		aria-label={m.dashboard_heatmap_scroll_aria()}
		aria-busy={!ready}
	>
		<div
			class="heatmap-grid shrink-0 font-mono text-[10px] leading-none text-on-surface-variant"
			style:--weeks={HEATMAP_WEEKS}
			role="img"
			aria-label={m.dashboard_heatmap_summary({
				active: activeDays,
				total: formatCompact(totalMs)
			})}
		>
			<div class="weekdays sticky left-0 z-1 grid bg-surface-container" aria-hidden="true">
				<span></span>
				{#each weekdayLabels as label, i (i)}
					<span class="self-center">{label}</span>
				{/each}
			</div>
			{#each model.months as month (month.date)}
				<span
					class={[
						'row-start-1 self-end whitespace-nowrap',
						month.week >= LAST_WEEKS && 'justify-self-end'
					]}
					style:grid-column={month.week + 2}
					aria-hidden="true"
				>
					{monthFormat.format(dayKeyDate(month.date))}
				</span>
			{/each}
			{#each model.weeks as week, w (w)}
				<div class="week grid" style:grid-column={w + 2} aria-hidden="true">
					{#each week as cell (cell.date)}
						<span
							class="rounded-[2px] {cell.future ? 'invisible' : LEVEL_CLASS[cell.level]}"
							data-level={cell.future ? undefined : cell.level}
							data-date={cell.date}
							title={cell.future
								? undefined
								: `${cellFormat.format(dayKeyDate(cell.date))} · ${formatCompact(cell.ms)}`}
						></span>
					{/each}
				</div>
			{/each}
		</div>
	</div>

	<div
		class="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-body-sm text-on-surface-variant"
	>
		<p>{m.dashboard_heatmap_hint({ target: formatCompact(prefsStore.dailyTargetMs) })}</p>
		<div class="flex items-center gap-1 font-mono text-[10px]" aria-hidden="true">
			<span>{m.dashboard_heatmap_less()}</span>
			{#each LEVELS as level (level)}
				<span class="size-2.5 rounded-[2px] {LEVEL_CLASS[level]}"></span>
			{/each}
			<span>{m.dashboard_heatmap_more()}</span>
		</div>
	</div>
</section>

<style>
	.heatmap-scroll {
		container-type: inline-size;
	}

	/*
	 * One grid: a weekday column, then a column per week. A pitch is a square plus the gap
	 * after it, so the label column and the pitches fill the card exactly. Past the largest
	 * square the grid stops growing and centres; below the smallest the card scrolls.
	 */
	.heatmap-grid {
		--label-w: 1.75rem;
		--pitch: clamp(12px, (100cqi - var(--label-w)) / var(--weeks), 30px);
		--cell: calc(var(--pitch) * 0.8);
		--gap: calc(var(--pitch) * 0.2);
		display: grid;
		grid-template-columns: var(--label-w) repeat(var(--weeks), var(--cell));
		grid-template-rows: auto repeat(7, var(--cell));
		gap: var(--gap);
		margin-inline: auto;
	}

	/* Covers the gap too, so squares scrolled under it do not peek through. */
	.weekdays {
		grid-column: 1;
		grid-row: 1 / -1;
		grid-template-rows: subgrid;
		margin-right: calc(-1 * var(--gap));
		padding-right: var(--gap);
	}

	.week {
		grid-row: 2 / -1;
		grid-template-rows: subgrid;
	}
</style>
