<script lang="ts">
	import { untrack } from 'svelte';
	import PageHeader from '$lib/components/shell/PageHeader.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { DayTotalsQuery } from '$lib/stores/day-totals.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import { periodStats, periodStatsFromTotals, rangeTotalMs } from '$lib/time/aggregates';
	import { withLiveSession } from '$lib/time/day-totals';
	import { addDaysInTimeZone } from '$lib/time/timezone';
	import {
		civilDayRange,
		insightRangeForGrain,
		isOpenInsightRange,
		previousInsightRange,
		type InsightRange
	} from '$lib/time/duration';
	import ActivityBars from './ActivityBars.svelte';
	import BreakdownTable from './BreakdownTable.svelte';
	import InsightRangeControl from './InsightRangeControl.svelte';
	import ProjectDonut from './ProjectDonut.svelte';
	import TimelineCard from './TimelineCard.svelte';

	/**
	 * A range that includes today is computed from loaded sessions: the history drain
	 * reaches back to the previous window, which is cut to the same elapsed time of
	 * day (ADR-0021 §8). A closed range reads `/stats/days` unless its sessions are
	 * already loaded, so looking at last year does not page through everything since.
	 */

	const sessionStore = useSession();

	const initialNow = new Date(sessionStore.nowMs || Date.now());
	let range = $state.raw<InsightRange>(
		insightRangeForGrain('week', initialNow, initialNow, sessionStore.timeZone)
	);

	const now = $derived(new Date(sessionStore.nowMs || Date.now()));
	const open = $derived(isOpenInsightRange(range, sessionStore.timeZone));
	const previous = $derived(previousInsightRange(range, now, sessionStore.timeZone));

	const currentDays = $derived(civilDayRange(range, sessionStore.timeZone));
	const previousDays = $derived(civilDayRange(previous, sessionStore.timeZone));

	const currentFromServer = $derived(!open && !sessionStore.coversSince(range.start.getTime()));
	const previousFromServer = $derived(!open && !sessionStore.coversSince(previous.start.getTime()));

	const current = new DayTotalsQuery();
	const prior = new DayTotalsQuery();

	function serverRows(query: DayTotalsQuery, days: typeof currentDays) {
		if (!query.rows) return null;
		return withLiveSession(query.rows, sessionStore.activeSession, days, now.getTime());
	}

	const stats = $derived.by(() => {
		if (!currentFromServer) {
			return periodStats(
				sessionStore.sessions,
				sessionStore.projects,
				sessionStore.activityTypes,
				range,
				now
			);
		}
		const rows = serverRows(current, currentDays) ?? [];
		return periodStatsFromTotals(rows, sessionStore.projects, sessionStore.activityTypes);
	});

	/** `undefined` hides the delta until the previous window is known. */
	const previousMs = $derived.by(() => {
		if (!previousFromServer) return rangeTotalMs(sessionStore.sessions, previous, now);
		if (!prior.isFor(previousDays)) return undefined;
		const rows = serverRows(prior, previousDays) ?? [];
		return rows.reduce((sum, row) => sum + row.durationMs, 0);
	});

	/** Server rows for another range are on screen until the new ones arrive. */
	const stale = $derived(currentFromServer && !current.isFor(currentDays));

	// Track only the range: the drain's own commits must not re-run this (EMI-81).
	// Only open ranges drain; closed ones read totals from the server. The drain also reaches
	// 7 days before the range, so the timeline sees a session that began earlier and runs into
	// it (sessions last at most 7 days) even on a short custom range.
	$effect(() => {
		const shown = range;
		untrack(() => {
			const tz = sessionStore.timeZone;
			if (!isOpenInsightRange(shown, tz)) return;
			const previousMs = previousInsightRange(shown, now, tz).start.getTime();
			const reachMs = addDaysInTimeZone(shown.start, -7, tz).getTime();
			void sessionStore.ensureThrough(Math.min(previousMs, reachMs));
		});
	});

	// Refetch when the range changes, and after a session write here or in another tab.
	$effect(() => {
		void sessionStore.revision;
		if (currentFromServer) {
			const days = currentDays;
			untrack(() => void current.load(days, sessionStore.listDayTotals));
		}
	});

	$effect(() => {
		void sessionStore.revision;
		if (previousFromServer) {
			const days = previousDays;
			untrack(() => void prior.load(days, sessionStore.listDayTotals));
		}
	});
</script>

<div class="flex w-full flex-col gap-6" data-testid="page-view">
	<PageHeader title={m.insights_title()} description={m.insights_subtitle()}>
		{#snippet actions()}
			<InsightRangeControl bind:range {now} timeZone={sessionStore.timeZone} />
		{/snippet}
	</PageHeader>

	{#if current.error && currentFromServer}
		<p class="text-body-sm text-error" role="alert">{current.error}</p>
	{:else if stale || (open && sessionStore.loadingMore)}
		<p class="text-body-sm text-on-surface-variant" role="status">
			{open ? m.insights_loading_earlier() : m.insights_loading_totals()}
		</p>
	{/if}

	<div
		class="flex flex-col gap-6 transition-opacity {stale ? 'opacity-60' : ''}"
		aria-busy={stale}
		data-testid="insights-charts"
	>
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<ProjectDonut items={stats.byProject} totalMs={stats.totalMs} {previousMs} />
			<ActivityBars items={stats.byActivity} />
		</div>

		<TimelineCard {range} />

		<BreakdownTable rows={stats.breakdown} />
	</div>
</div>
