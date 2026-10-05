<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { formatCompact, formatTimeRange } from '$lib/time/duration';
	import {
		barAt,
		colorPaths,
		dayTotals,
		formatMinuteOfDay,
		groupBy,
		hourTicks,
		laneCounts,
		type TimelineDay,
		type TimelineSegment
	} from '$lib/time/timeline';
	import TimelineTooltip from './TimelineTooltip.svelte';

	/** Days × clock: one strip per day, sessions where they fell, overlaps on sub-lanes. */
	let {
		lc,
		segments,
		days,
		clock,
		timeZone,
		dayLabel
	}: {
		lc: typeof import('$lib/components/charts/lazy-timeline') | null;
		segments: TimelineSegment[];
		days: TimelineDay[];
		clock: [number, number];
		timeZone: string;
		dayLabel: (key: string) => string;
	} = $props();

	const LANE_PX = 26;
	/** Long ranges shrink the lanes instead of growing past this (a year would be ~9,500px). */
	const MAX_PLOT_PX = 720;
	const MIN_LANE_PX = 6;
	/** Below this a lane is too thin for a label beside it. */
	const LABEL_LANE_PX = 14;
	const BAND_PADDING = 0.3;
	const PAD = { top: 4, right: 64, bottom: 24, left: 60 };

	const lanes = $derived(laneCounts(segments));
	/** One band per lane; a day with overlapping sessions gets more than one. */
	const rows = $derived(
		days.flatMap((d) => Array.from({ length: lanes.get(d.key) ?? 1 }, (_, i) => `${d.key}:${i}`))
	);
	const data = $derived(segments.map((s) => ({ ...s, row: `${s.dateKey}:${s.lane}` })));
	const totals = $derived(dayTotals(segments));
	const xTicks = $derived(hourTicks(clock));
	const lanePx = $derived(
		Math.max(MIN_LANE_PX, Math.min(LANE_PX, MAX_PLOT_PX / Math.max(1, rows.length)))
	);
	const chartHeight = $derived(rows.length * lanePx + PAD.top + PAD.bottom);
	/** Every day is labelled while lanes are tall enough; otherwise one day in seven. */
	const labelled = $derived(lanePx >= LABEL_LANE_PX ? days : days.filter((_, i) => i % 7 === 0));
	const yTicks = $derived(labelled.map((d) => `${d.key}:0`));

	function rowLabel(row: string): string {
		const [key, lane] = row.split(':');
		return lane === '0' ? dayLabel(key) : '';
	}

	type Lc = typeof import('$lib/components/charts/lazy-timeline');
	let chart = $state<ComponentProps<Lc['BarChart']>['context']>();

	const byRow = $derived(groupBy(data, (seg) => seg.row));

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
			(seg) => [ctx.xScale(seg.startMin), ctx.xScale(seg.endMin)],
			e.clientX - box.left - PAD.left,
			e.clientY - box.top - PAD.top
		);
		if (hit) ctx.tooltip.show(e, hit);
		else ctx.tooltip.hide();
	}

	const iso = (ms: number) => new Date(ms).toISOString();
</script>

<ul class="sr-only">
	{#each days as day (day.key)}
		<li>
			{dayLabel(day.key)}: {formatCompact(totals.get(day.key) ?? 0)}
			<ul>
				{#each segments.filter((s) => s.dateKey === day.key) as seg (seg.id)}
					<li>
						{seg.projectName}, {formatTimeRange(iso(seg.startMs), iso(seg.endMs), timeZone)}
					</li>
				{/each}
			</ul>
		</li>
	{/each}
</ul>

<div
	class="w-full"
	style:height="{chartHeight}px"
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
			x={['startMin', 'endMin']}
			y="row"
			yDomain={rows}
			xDomain={clock}
			xNice={false}
			orientation="horizontal"
			bandPadding={BAND_PADDING}
			padding={PAD}
			grid={{ x: true, y: false }}
			rule={false}
			highlight={false}
			legend={false}
			props={{
				xAxis: { ticks: xTicks, format: formatMinuteOfDay, tickMarks: false, tickLength: 0 },
				yAxis: { ticks: yTicks, format: rowLabel, tickMarks: false, tickLength: 0 },
				grid: { xTicks, x: { stroke: 'var(--color-outline-variant)', opacity: 0.5 } },
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
						const left = context.xScale(seg.startMin);
						return {
							x: left,
							y: context.yScale(seg.row),
							width: Math.max(1, context.xScale(seg.endMin) - left),
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
				{#each lanePx >= LABEL_LANE_PX ? days : [] as day (day.key)}
					{const first = $derived(context.yScale(`${day.key}:0`) ?? 0)}
					{const last = $derived(
						context.yScale(`${day.key}:${(lanes.get(day.key) ?? 1) - 1}`) ?? first
					)}
					{const ms = $derived(totals.get(day.key) ?? 0)}
					<!-- Day total in the right padding, centred on its lanes; dropped when lanes are too thin. -->
					<Text
						x={context.width + 12}
						y={(first + last + bandwidth) / 2}
						value={ms > 0 ? formatCompact(ms) : '—'}
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
