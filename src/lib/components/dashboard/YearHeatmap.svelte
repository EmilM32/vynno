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
	import { heatmapModel, heatmapStart, type HeatLevel } from './heatmap';

	/**
	 * A year of tracked time from `/stats/days`, one square per day, shaded against
	 * the daily target. Narrow screens clip the oldest weeks instead of scrolling.
	 */

	let { class: className = '' }: { class?: string } = $props();

	const sessionStore = useSession();
	const prefsStore = usePrefs();
	const query = new DayTotalsQuery();

	/** Column pitch: a 10px square plus a 3px gap. Month labels sit on it. */
	const PITCH_PX = 13;

	const LEVEL_CLASS: Record<HeatLevel, string> = {
		0: 'bg-surface-container-highest',
		1: 'bg-primary/25',
		2: 'bg-primary/50',
		3: 'bg-primary/75',
		4: 'bg-primary'
	};
	const LEVELS: HeatLevel[] = [0, 1, 2, 3, 4];

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
	<div class="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
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

	<div class="flex gap-2" aria-busy={!ready}>
		<div
			class="grid shrink-0 grid-rows-[16px_repeat(7,10px)] gap-[3px] font-mono text-[10px] leading-[10px] text-on-surface-variant"
			aria-hidden="true"
		>
			<span></span>
			{#each weekdayLabels as label, i (i)}
				<span>{label}</span>
			{/each}
		</div>
		<!-- A year is 686px wide. Narrower, the row reverses so the newest week stays on the
		     right edge and the oldest weeks are clipped on the left instead of scrolling. -->
		<div class="@container min-w-0 flex-1 overflow-hidden">
			<div class="flex @max-[686px]:flex-row-reverse">
				<div
					class="shrink-0"
					role="img"
					aria-label={m.dashboard_heatmap_summary({
						active: activeDays,
						total: formatCompact(totalMs)
					})}
				>
					<div
						class="relative mb-[3px] h-4 font-mono text-[10px] text-on-surface-variant"
						aria-hidden="true"
					>
						{#each model.months as month (month.date)}
							<span class="absolute top-0" style:left="{month.week * PITCH_PX}px">
								{monthFormat.format(dayKeyDate(month.date))}
							</span>
						{/each}
					</div>
					<div class="grid grid-flow-col grid-rows-7 gap-[3px]" aria-hidden="true">
						{#each model.weeks as week, w (w)}
							{#each week as cell (cell.date)}
								<span
									class="size-2.5 rounded-[2px] {cell.future
										? 'invisible'
										: LEVEL_CLASS[cell.level]}"
									data-level={cell.future ? undefined : cell.level}
									data-date={cell.date}
									title={cell.future
										? undefined
										: `${cellFormat.format(dayKeyDate(cell.date))} · ${formatCompact(cell.ms)}`}
								></span>
							{/each}
						{/each}
					</div>
				</div>
			</div>
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
