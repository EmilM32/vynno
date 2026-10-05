<script lang="ts">
	import { OTHER_ID, topNWithOther } from '$lib/components/insights/legend';
	import { m } from '$lib/paraglide/messages.js';
	import { formatCompact } from '$lib/time/duration';
	import {
		formatMinuteOfDay,
		hourlyByProject,
		projectTotals,
		type TimelineDay,
		type TimelineSegment
	} from '$lib/time/timeline';

	/** Typical day: minutes per hour of day, stacked by project, averaged over the range. */
	let {
		lc,
		segments,
		days,
		clock
	}: {
		lc: typeof import('$lib/components/charts/lazy-timeline') | null;
		segments: TimelineSegment[];
		days: TimelineDay[];
		clock: [number, number];
	} = $props();

	const CHART_PX = 260;

	const projects = $derived(projectTotals(segments));
	const keyed = $derived(
		topNWithOther(projects).map((p) =>
			p.id === OTHER_ID ? { ...p, label: m.insights_other_projects() } : p
		)
	);
	const topIds = $derived(new Set(keyed.map((p) => p.id)));
	const hourly = $derived(hourlyByProject(segments));
	const dayCount = $derived(Math.max(1, days.length));

	type Row = { hour: number; totalMin: number } & Record<string, number>;

	/** Minutes per calendar day in each hour, one column per legend entry. */
	const rows = $derived(
		hourly.map((h) => {
			const row = { hour: h.hour, totalMin: h.totalMin } as Row;
			for (const p of keyed) row[p.id] = 0;
			for (const [id, min] of Object.entries(h.byProject)) {
				row[topIds.has(id) ? id : OTHER_ID] += min / dayCount;
			}
			return row;
		})
	);

	const visibleHours = $derived(
		Array.from({ length: (clock[1] - clock[0]) / 60 }, (_, i) => clock[0] / 60 + i)
	);
	const data = $derived(rows.filter((r) => visibleHours.includes(r.hour)));
	/** Per-day minutes in an hour, all legend entries together (the stack height). */
	const stackMin = (row: Row) => keyed.reduce((sum, p) => sum + row[p.id], 0);
	/** Stacked segments, bottom to top in legend order, for the plain-SVG marks below. */
	const stacks = $derived(
		data.flatMap((row) => {
			let y0 = 0;
			return keyed.flatMap((p) => {
				const min = row[p.id];
				if (min <= 0) return [];
				const seg = {
					key: `${row.hour}:${p.id}`,
					hour: row.hour,
					y0,
					y1: y0 + min,
					color: p.color
				};
				y0 += min;
				return [seg];
			});
		})
	);
	const maxAvg = $derived(Math.max(1, ...rows.map(stackMin)));
	const yMax = $derived(maxAvg <= 15 ? 15 : maxAvg <= 30 ? 30 : 60);
	const xTicks = $derived(
		visibleHours.length > 12 ? visibleHours.filter((h) => h % 2 === 0) : visibleHours
	);
	const totalMin = $derived(hourly.reduce((sum, h) => sum + h.totalMin, 0));

	/** Two consecutive hours holding the most time. */
	const peak = $derived.by(() => {
		let best = -1;
		let at = 0;
		for (let h = 0; h < 23; h++) {
			const sum = hourly[h].totalMin + hourly[h + 1].totalMin;
			if (sum > best) {
				best = sum;
				at = h;
			}
		}
		return { from: at * 60, to: (at + 2) * 60, share: totalMin ? best / totalMin : 0 };
	});

	const beforeNoon = $derived(
		totalMin ? hourly.slice(0, 12).reduce((sum, h) => sum + h.totalMin, 0) / totalMin : 0
	);

	function median(values: number[]): number {
		const sorted = [...values].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
	}

	/** Median first start and last end over days with any work. */
	const usual = $derived.by(() => {
		const firsts: Record<string, number> = {};
		const lasts: Record<string, number> = {};
		for (const s of segments) {
			firsts[s.dateKey] = Math.min(firsts[s.dateKey] ?? Infinity, s.startMin);
			lasts[s.dateKey] = Math.max(lasts[s.dateKey] ?? -Infinity, s.endMin);
		}
		const starts = Object.values(firsts);
		if (starts.length === 0) return null;
		return { start: median(starts), end: median(Object.values(lasts)) };
	});

	const pct = (x: number) => `${Math.round(x * 100)}%`;
	const hourLabel = (h: number) => String(h).padStart(2, '0');
	const minLabel = (n: number) => `${Math.round(n)}m`;
</script>

<p class="text-body-sm text-on-surface-variant">{m.insights_rhythm_caption()}</p>

<dl class="grid grid-cols-1 gap-3 sm:grid-cols-3">
	<div class="flex flex-col gap-0.5 rounded-DEFAULT bg-surface-container-low px-3 py-2">
		<dt class="text-body-sm text-on-surface-variant">{m.insights_rhythm_peak()}</dt>
		<dd class="font-mono text-on-surface tabular-nums">
			{formatMinuteOfDay(peak.from)}–{formatMinuteOfDay(peak.to)}
			<span class="text-code-label text-on-surface-variant"
				>· {m.insights_rhythm_peak_share({ share: pct(peak.share) })}</span
			>
		</dd>
	</div>
	<div class="flex flex-col gap-0.5 rounded-DEFAULT bg-surface-container-low px-3 py-2">
		<dt class="text-body-sm text-on-surface-variant">{m.insights_rhythm_usual()}</dt>
		<dd class="font-mono text-on-surface tabular-nums">
			{#if usual}
				{formatMinuteOfDay(usual.start)} → {formatMinuteOfDay(usual.end)}
			{/if}
		</dd>
	</div>
	<div class="flex flex-col gap-0.5 rounded-DEFAULT bg-surface-container-low px-3 py-2">
		<dt class="text-body-sm text-on-surface-variant">{m.insights_rhythm_before_noon()}</dt>
		<dd class="font-mono text-on-surface tabular-nums">
			{pct(beforeNoon)}
			<span class="text-code-label text-on-surface-variant"
				>· {m.insights_rhythm_total({ total: formatCompact(totalMin * 60_000) })}</span
			>
		</dd>
	</div>
</dl>

<ul class="sr-only">
	{#each data as row (row.hour)}
		<li>
			{m.insights_rhythm_hour_aria({
				hour: formatMinuteOfDay(row.hour * 60),
				minutes: minLabel(stackMin(row))
			})}
		</li>
	{/each}
</ul>

<div class="w-full" style:height="{CHART_PX}px" aria-hidden="true">
	{#if lc}
		{const BarChart = $derived(lc.BarChart)}
		{const Tooltip = $derived(lc.Tooltip)}
		<BarChart
			class="w-full text-on-surface-variant"
			height={CHART_PX}
			{data}
			x="hour"
			y={stackMin}
			xDomain={visibleHours}
			yDomain={[0, yMax]}
			bandPadding={0.2}
			padding={{ top: 8, right: 4, bottom: 24, left: 36 }}
			grid={{ x: false, y: true }}
			rule={true}
			legend={false}
			props={{
				xAxis: { ticks: xTicks, format: hourLabel, tickMarks: false, tickLength: 0 },
				yAxis: { ticks: [yMax / 2, yMax], format: minLabel, tickMarks: false, tickLength: 0 },
				grid: { y: { stroke: 'var(--color-outline-variant)', opacity: 0.7 } }
			}}
		>
			{#snippet marks({ context })}
				<!--
					Plain rects, not LayerChart's Bars: one Bar component per segment costs about 1 ms
					to mount, which made the first draw a long main-thread task (ADR-0028 §7).
				-->
				{const bandwidth = $derived(context.xScale.bandwidth?.() ?? 0)}
				{#each stacks as seg (seg.key)}
					{const top = $derived(context.yScale(seg.y1))}
					<rect
						x={context.xScale(seg.hour)}
						y={top}
						width={bandwidth}
						height={Math.max(0, context.yScale(seg.y0) - top)}
						rx="2"
						fill={seg.color}
						stroke="var(--color-surface-container)"
						stroke-width="1"
					/>
				{/each}
			{/snippet}
			{#snippet tooltip({ context })}
				<Tooltip.Root {context}>
					{#snippet children({ data: row }: { data: Row })}
						<Tooltip.Header
							value="{formatMinuteOfDay(row.hour * 60)}–{formatMinuteOfDay((row.hour + 1) * 60)}"
						/>
						<Tooltip.List>
							{#each keyed.filter((p) => row[p.id] > 0) as p (p.id)}
								<Tooltip.Item
									label={p.label}
									value={m.insights_rhythm_per_day({ minutes: minLabel(row[p.id]) })}
									color={p.color}
								/>
							{/each}
							<Tooltip.Separator />
							<Tooltip.Item
								label={m.insights_rhythm_in_range()}
								value={formatCompact(row.totalMin * 60_000)}
								valueAlign="right"
							/>
						</Tooltip.List>
					{/snippet}
				</Tooltip.Root>
			{/snippet}
		</BarChart>
	{/if}
</div>
