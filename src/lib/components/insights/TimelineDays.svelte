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
		ticksThatFit,
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
	/** Stacked lanes: the label rides in the band padding above the bar (ADR-0028 §10). */
	const STACKED_LANE_PX = 42;
	/** Past a month, stacked rows would make the card thousands of pixels tall. */
	const STACKED_MAX_DAYS = 31;

	const lanes = $derived(laneCounts(segments));
	/** One band per lane; a day with overlapping sessions gets more than one. */
	const rows = $derived(
		days.flatMap((d) => Array.from({ length: lanes.get(d.key) ?? 1 }, (_, i) => `${d.key}:${i}`))
	);
	const data = $derived(segments.map((s) => ({ ...s, row: `${s.dateKey}:${s.lane}` })));
	const totals = $derived(dayTotals(segments));
	/** `HH:MM` in the 10px mono axis face, plus a gap. */
	const HOUR_LABEL_PX = 44;

	let boxWidth = $state(0);
	/**
	 * Phones stack the day label and total above the day's first lane, so the clock gets the
	 * full width instead of ~170px between two gutters (ADR-0028 §10).
	 */
	const stacked = $derived(boxWidth > 0 && boxWidth < 480 && days.length <= STACKED_MAX_DAYS);
	const PAD = $derived(
		stacked
			? { top: 6, right: 14, bottom: 24, left: 14 }
			: { top: 4, right: 64, bottom: 24, left: 60 }
	);
	const BAND_PADDING = $derived(stacked ? 0.5 : 0.3);
	const xTicks = $derived(
		hourTicks(clock, ticksThatFit(boxWidth - PAD.left - PAD.right, HOUR_LABEL_PX))
	);
	const lanePx = $derived(
		stacked
			? STACKED_LANE_PX
			: Math.max(MIN_LANE_PX, Math.min(LANE_PX, MAX_PLOT_PX / Math.max(1, rows.length)))
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
	bind:clientWidth={boxWidth}
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
				yAxis: stacked
					? { ticks: [], format: () => '' }
					: { ticks: yTicks, format: rowLabel, tickMarks: false, tickLength: 0 },
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
				{#if stacked}
					<!-- A track per lane, so a quiet stretch of the day still reads as that day. -->
					{#each rows as row (row)}
						<rect
							y={context.yScale(row)}
							width={context.width}
							height={bandwidth}
							rx="3"
							fill="var(--color-surface-container-high)"
						/>
					{/each}
				{/if}
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
					{const total = $derived(ms > 0 ? formatCompact(ms) : '—')}
					{#if stacked}
						<!-- Day and total on one line in the band padding above the first lane. -->
						<Text
							x={0}
							y={first - 6}
							value={dayLabel(day.key)}
							class="fill-on-surface text-[12px] font-medium"
						/>
						<Text
							x={context.width}
							y={first - 6}
							textAnchor="end"
							value={total}
							class="fill-on-surface-variant font-mono text-[11px] tabular-nums"
						/>
					{:else}
						<!-- Day total in the right padding, centred on its lanes; dropped when lanes are too thin. -->
						<Text
							x={context.width + 12}
							y={(first + last + bandwidth) / 2}
							value={total}
							verticalAnchor="middle"
							class="fill-on-surface-variant font-mono text-[11px] tabular-nums"
						/>
					{/if}
				{/each}
			{/snippet}
			{#snippet tooltip({ context })}
				<TimelineTooltip {Tooltip} {context} {timeZone} {dayLabel} />
			{/snippet}
		</BarChart>
	{/if}
</div>
