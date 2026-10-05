<script lang="ts">
	import { formatShare } from '$lib/time/aggregates';
	import { formatCompact, formatTimeRange } from '$lib/time/duration';
	import {
		formatDayKey,
		formatMonthDay,
		projectTotals,
		segmentColors,
		type TimelineDay,
		type TimelineSegment
	} from '$lib/time/timeline';
	import TimelineTooltip from './TimelineTooltip.svelte';

	/** Projects × calendar: one row per project, each session placed in its day column. */
	let {
		lc,
		segments,
		days,
		clock,
		timeZone,
		locale,
		dayLabel
	}: {
		lc: typeof import('$lib/components/charts/lazy-timeline') | null;
		segments: TimelineSegment[];
		days: TimelineDay[];
		clock: [number, number];
		timeZone: string;
		locale: string;
		dayLabel: (key: string) => string;
	} = $props();

	const ROW_PX = 40;
	const PAD = { top: 4, right: 84, bottom: 24, left: 128 };
	/** Narrowest drawn bar, so a 10-minute session is still visible on a month. */
	const MIN_BAR_PX = 3;
	const NAME_CHARS = 18;

	let plotWidth = $state(0);

	const projects = $derived(projectTotals(segments));
	const rows = $derived(projects.map((p) => p.id));
	const nameById = $derived(new Map(projects.map((p) => [p.id, p.label])));
	/**
	 * Each day is a column of the clock window only, so nights don't eat the width and a
	 * one-hour session stays readable on a week.
	 */
	const span = $derived(clock[1] - clock[0]);
	const dayIndex = $derived(new Map(days.map((d, i) => [d.key, i])));
	const domain = $derived<[number, number]>([0, Math.max(1, days.length) * span]);
	const minBar = $derived(plotWidth > 0 ? (domain[1] / plotWidth) * MIN_BAR_PX : 0);
	const data = $derived(
		segments.map((s) => {
			const base = (dayIndex.get(s.dateKey) ?? 0) * span;
			const x0 = base + Math.max(0, s.startMin - clock[0]);
			const x1 = base + Math.min(span, s.endMin - clock[0]);
			return { ...s, x0, x1: Math.max(x1, x0 + minBar) };
		})
	);
	/** Labels centred in each day column; thinned to about 8 on longer ranges. */
	const tickStep = $derived(Math.max(1, Math.ceil(days.length / 8)));
	const xTicks = $derived(
		days.flatMap((_, i) => (i % tickStep === 0 ? [i * span + span / 2] : []))
	);
	const dayLines = $derived(days.map((_, i) => i * span));
	const colors = $derived(segmentColors(segments));
	const chartHeight = $derived(Math.max(1, rows.length) * ROW_PX + PAD.top + PAD.bottom);

	function xTick(x: number): string {
		const key = days[Math.floor(x / span)]?.key;
		if (!key) return '';
		return days.length > 14 ? formatMonthDay(key, locale) : formatDayKey(key, locale);
	}

	/** Project names on the band axis; the bars on that row carry its colour. */
	function rowLabel(id: string): string {
		const name = nameById.get(id) ?? id;
		return name.length > NAME_CHARS ? `${name.slice(0, NAME_CHARS - 1)}…` : name;
	}

	const iso = (ms: number) => new Date(ms).toISOString();
</script>

<ul class="sr-only">
	{#each projects as p (p.id)}
		<li>
			{p.label}: {formatCompact(p.ms)}
			<ul>
				{#each segments.filter((s) => s.projectId === p.id) as seg (seg.id)}
					<li>
						{dayLabel(seg.dateKey)}, {formatTimeRange(iso(seg.startMs), iso(seg.endMs), timeZone)}
					</li>
				{/each}
			</ul>
		</li>
	{/each}
</ul>

<div class="w-full" style:height="{chartHeight}px" bind:clientWidth={plotWidth} aria-hidden="true">
	{#if lc}
		{const BarChart = $derived(lc.BarChart)}
		{const Text = $derived(lc.Text)}
		{const Tooltip = $derived(lc.Tooltip)}
		<BarChart
			class="w-full text-on-surface-variant"
			height={chartHeight}
			{data}
			x={['x0', 'x1']}
			y="projectId"
			yDomain={rows}
			xDomain={domain}
			xNice={false}
			orientation="horizontal"
			c="color"
			cDomain={colors}
			cRange={colors}
			bandPadding={0.3}
			padding={PAD}
			grid={{ x: true, y: false }}
			rule={false}
			highlight={false}
			legend={false}
			props={{
				bars: { radius: 2, strokeWidth: 1, stroke: 'var(--color-surface-container)' },
				xAxis: { ticks: xTicks, format: xTick, tickMarks: false, tickLength: 0 },
				yAxis: { format: rowLabel, tickMarks: false, tickLength: 0 },
				grid: { xTicks: dayLines, x: { stroke: 'var(--color-outline-variant)', opacity: 0.5 } },
				tooltip: { context: { mode: 'bounds' } }
			}}
		>
			{#snippet aboveMarks({ context })}
				{const bandwidth = $derived(context.yScale.bandwidth?.() ?? 0)}
				{#each projects as p (p.id)}
					<Text
						x={context.width + 12}
						y={(context.yScale(p.id) ?? 0) + bandwidth / 2}
						value="{formatCompact(p.ms)} · {formatShare(p)}"
						verticalAnchor="middle"
						class="fill-on-surface-variant font-mono text-[11px] tabular-nums"
					/>
				{/each}
			{/snippet}
			{#snippet tooltip({ context })}
				<TimelineTooltip {Tooltip} {context} {timeZone} {dayLabel} />
			{/snippet}
		</BarChart>
	{/if}
</div>
