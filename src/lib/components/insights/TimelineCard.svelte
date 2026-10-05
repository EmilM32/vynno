<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { SessionWindowQuery } from '$lib/stores/session-window.svelte';
	import { useSession } from '$lib/stores/session.svelte';
	import { formatCompact, isOpenInsightRange, type InsightRange } from '$lib/time/duration';
	import {
		clockWindow,
		dayTotals,
		formatDayKey,
		projectTotals,
		sessionWindowForDays,
		timelineDays,
		timelineSegments,
		type ClockSpan
	} from '$lib/time/timeline';
	import { addDaysInTimeZone } from '$lib/time/timezone';
	import PeriodToggle from './PeriodToggle.svelte';
	import TimelineDays from './TimelineDays.svelte';
	import TimelineLegend from './TimelineLegend.svelte';
	import TimelineProjects from './TimelineProjects.svelte';
	import TimelineRhythm from './TimelineRhythm.svelte';

	/**
	 * When and on what time was logged (ADR-0028): three views of the same per-day segments.
	 * A range that includes today reads the loaded history (InsightsView drains it); a closed
	 * range reads its own window from `GET /sessions?from&to` instead of paging back.
	 */
	let { range }: { range: InsightRange } = $props();

	type View = 'days' | 'projects' | 'rhythm';

	/**
	 * Days and Projects draw one bar per session. Past two months that is unreadable, and a
	 * year (thousands of SVG bars) blocks the main thread for most of a second (EMI-59 budget),
	 * so long ranges show Rhythm only.
	 */
	const MAX_SESSION_VIEW_DAYS = 62;

	const sessionStore = useSession();
	const locale = getLocale();

	let view = $state<View>('days');
	let span = $state<ClockSpan>('fit');

	/** Same reasoning as WeeklyOverview: layerchart loads after mount, off the critical path. */
	let lc = $state.raw<typeof import('$lib/components/charts/lazy-timeline') | null>(null);
	onMount(async () => {
		lc = await import('$lib/components/charts/lazy-timeline');
	});

	const timeZone = $derived(sessionStore.timeZone);
	const active = $derived(sessionStore.activeSession);
	/** The live bar grows once a minute, not on every elapsed-clock tick. */
	const liveNowMs = $derived(
		Math.floor(
			(active
				? Date.parse(active.startedAt) + sessionStore.elapsedMs
				: sessionStore.nowMs || Date.now()) / 60_000
		) * 60_000
	);

	const days = $derived(timelineDays(range, liveNowMs, timeZone));
	const open = $derived(isOpenInsightRange(range, timeZone));
	/** A session can run up to 7 days, so one that began before the range may reach into it. */
	const reachMs = $derived(addDaysInTimeZone(range.start, -7, timeZone).getTime());
	const fromServer = $derived(!open && !sessionStore.coversSince(reachMs));
	const apiWindow = $derived(sessionWindowForDays(days));

	const query = new SessionWindowQuery();

	// Refetch when the range changes, and after a session write here or in another tab.
	$effect(() => {
		void sessionStore.revision;
		if (fromServer && apiWindow) {
			const w = apiWindow;
			untrack(() => void query.load(w, sessionStore.listSessionsBetween));
		}
	});

	const sessions = $derived.by(() => {
		if (fromServer) return query.sessions ?? [];
		const loaded = sessionStore.sessions;
		// The live session may sit outside the loaded window (`GET /sessions/active`).
		return active && !loaded.some((s) => s.id === active.id) ? [...loaded, active] : loaded;
	});
	const stale = $derived(fromServer && !!apiWindow && !query.isFor(apiWindow));

	const segments = $derived(
		timelineSegments(sessions, sessionStore.allProjects, days, liveNowMs, timeZone)
	);
	const totals = $derived(dayTotals(segments));
	const projects = $derived(projectTotals(segments));
	const totalMs = $derived(projects.reduce((sum, p) => sum + p.ms, 0));
	const clock = $derived(clockWindow(segments, span));
	const sessionViews = $derived(days.length <= MAX_SESSION_VIEW_DAYS);
	/** The picked view survives a long range and comes back with a short one. */
	const shown = $derived<View>(sessionViews ? view : 'rhythm');
	const todayKey = $derived(days.find((d) => d.isToday)?.key);

	function dayLabel(key: string): string {
		return key === todayKey ? m.common_today() : formatDayKey(key, locale);
	}
</script>

<section
	class={[
		'vynno-chart flex flex-col gap-4 rounded-lg border border-outline-variant bg-surface-container p-6 transition-opacity',
		stale && 'opacity-60'
	]}
	aria-label={m.insights_timeline_aria()}
	aria-busy={stale}
	data-testid="insights-timeline"
>
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="flex flex-col gap-1">
			<h2 class="text-headline-md text-on-surface">{m.insights_timeline_title()}</h2>
			<p class="text-body-sm text-on-surface-variant">
				{m.insights_timeline_summary({
					total: formatCompact(totalMs),
					active: totals.size,
					count: days.length
				})}
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<PeriodToggle
				bind:value={span}
				ariaLabel={m.insights_timeline_span_aria()}
				options={[
					{ id: 'fit', label: m.insights_timeline_span_fit() },
					{ id: 'day', label: m.insights_timeline_span_day() }
				]}
			/>
			{#if sessionViews}
				<PeriodToggle
					bind:value={view}
					ariaLabel={m.insights_timeline_view_aria()}
					options={[
						{ id: 'days', label: m.insights_timeline_view_days() },
						{ id: 'projects', label: m.insights_timeline_view_projects() },
						{ id: 'rhythm', label: m.insights_timeline_view_rhythm() }
					]}
				/>
			{/if}
		</div>
	</div>

	{#if fromServer && query.error}
		<p class="text-body-sm text-error" role="alert">{query.error}</p>
	{:else if stale}
		<p class="text-body-sm text-on-surface-variant" role="status">
			{m.insights_timeline_loading()}
		</p>
	{/if}

	{#if !sessionViews}
		<p class="text-body-sm text-on-surface-variant">{m.insights_timeline_long_range()}</p>
	{/if}

	{#if segments.length === 0}
		<p class="py-10 text-center text-body-sm text-on-surface-variant">{m.insights_no_data()}</p>
	{:else if shown === 'days'}
		<TimelineDays {lc} {segments} {days} {clock} {timeZone} {dayLabel} />
	{:else if shown === 'projects'}
		<TimelineProjects {lc} {segments} {days} {clock} {timeZone} {locale} {dayLabel} />
	{:else}
		<TimelineRhythm {lc} {segments} {days} {clock} />
	{/if}

	{#if segments.length > 0 && shown !== 'projects'}
		<div class="border-t border-outline-variant pt-4">
			<TimelineLegend totals={projects} />
		</div>
	{/if}
</section>
