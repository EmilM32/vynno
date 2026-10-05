<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { formatShare } from '$lib/time/aggregates';
	import { formatCompact, formatTimeRange } from '$lib/time/duration';
	import {
		barAt,
		colorPaths,
		formatDayKey,
		formatMonthDay,
		groupBy,
		projectTotals,
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

	type Lc = typeof import('$lib/components/charts/lazy-timeline');
	let chart = $state<ComponentProps<Lc['BarChart']>['context']>();

	const byRow = $derived(groupBy(data, (seg) => seg.projectId));

	/**
	 * The tooltip runs in LayerChart's manual mode: its bounds mode adds a hit area per
	 * session, which undid the single-path drawing (ADR-0028 §7). Plot pixels → the bar.
	 */
	function onpointermove(e: PointerEvent) {
		const ctx = chart;
		if (!ctx) return;
		const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const hit = barAt(
			byRow,
			rows,
			(row) => ctx.yScale(row) ?? -1,
			ctx.yScale.bandwidth?.() ?? 0,
			(seg) => [ctx.xScale(seg.x0), ctx.xScale(seg.x1)],
			e.clientX - box.left - PAD.left,
			e.clientY - box.top - PAD.top
		);
		if (hit) ctx.tooltip.show(e, hit);
		else ctx.tooltip.hide();
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

<div
	class="w-full"
	style:height="{chartHeight}px"
	bind:clientWidth={plotWidth}
	aria-hidden="true"
	{onpointermove}
	onpointerleave={() => chart?.tooltip.hide()}
>
	{#if lc}
		{const BarChart = $derived(lc.BarChart)}
		{const Text = $derived(lc.Text)}
		{const Tooltip = $derived(lc.Tooltip)}
		<BarChart
			bind:context={chart}
			class="w-full text-on-surface-variant"
			height={chartHeight}
			{data}
			x={['x0', 'x1']}
			y="projectId"
			yDomain={rows}
			xDomain={domain}
			xNice={false}
			orientation="horizontal"
			bandPadding={0.3}
			padding={PAD}
			grid={{ x: true, y: false }}
			rule={false}
			highlight={false}
			legend={false}
			props={{
				xAxis: { ticks: xTicks, format: xTick, tickMarks: false, tickLength: 0 },
				yAxis: { format: rowLabel, tickMarks: false, tickLength: 0 },
				grid: { xTicks: dayLines, x: { stroke: 'var(--color-outline-variant)', opacity: 0.5 } },
				tooltip: { context: { mode: 'manual' } }
			}}
		>
			{#snippet marks({ context })}
				<!--
					One path per project colour, not a LayerChart Bar or <rect> per session: two busy
					months are ~900 bars, and per-bar nodes made the first draw a long main-thread task
					(ADR-0028 §7). Tooltips are computed from the data, not from these shapes.
				-->
				{const bandwidth = $derived(context.yScale.bandwidth?.() ?? 0)}
				{const paths = $derived(
					colorPaths(data, (seg) => {
						const left = context.xScale(seg.x0);
						return {
							x: left,
							y: context.yScale(seg.projectId),
							width: Math.max(1, context.xScale(seg.x1) - left),
							height: bandwidth
						};
					})
				)}
				<g data-testid="timeline-bars" data-count={data.length}>
					{#each paths as path (path.color)}
						<path
							d={path.d}
							fill={path.color}
							stroke="var(--color-surface-container)"
							stroke-width="1"
						/>
					{/each}
				</g>
			{/snippet}
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
