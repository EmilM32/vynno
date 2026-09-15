<script lang="ts">
	import { onMount } from 'svelte';
	import { thinHistogramTicks } from '$lib/components/charts/histogramTicks';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { histogramScale, type WeekDayTotal } from '$lib/time/aggregates';
	import { formatCompact } from '$lib/time/duration';

	type ChartPoint = WeekDayTotal & { value: number };

	let {
		days: daysProp,
		barColor,
		heading,
		ariaLabel,
		class: className
	}: {
		days?: WeekDayTotal[];
		/** Hex fill for bars (project view). Dashboard keeps the primary track. */
		barColor?: string;
		heading?: string;
		ariaLabel?: string;
		class?: string;
	} = $props();

	const sessionStore = useSession();

	/**
	 * LayerChart pulls ~12 render-blocking CSS chunks and most of this route's hydration work.
	 * Importing it after mount keeps it off the critical path. Everything outside the chart box
	 * below stays server-rendered on purpose: the `<h2>` is the LCP element on /projects/{id},
	 * and the `sr-only` list is what screen readers read instead of the bars.
	 */
	let lc = $state.raw<typeof import('$lib/components/charts/lazy-bar') | null>(null);

	onMount(async () => {
		lc = await import('$lib/components/charts/lazy-bar');
	});

	const days = $derived(daysProp ?? sessionStore.weekDayTotals);
	const title = $derived(heading ?? m.dashboard_weekly_overview());
	const regionLabel = $derived(ariaLabel ?? m.dashboard_weekly_overview_aria());
	const maxMs = $derived(Math.max(0, ...days.map((d) => d.ms)));
	const empty = $derived(maxMs === 0);
	const scale = $derived(histogramScale(maxMs));
	const chartData = $derived(
		days.map((d) => ({
			...d,
			value: scale.unit === 'min' ? d.ms / 60_000 : d.ms / 3_600_000
		}))
	);
	const unitLabel = $derived(scale.unit === 'min' ? m.dashboard_minutes() : m.dashboard_hours());
	const fillToday = $derived(barColor ?? 'var(--color-primary)');
	const fillOther = $derived(
		barColor ? `${barColor}33` : 'color-mix(in oklab, var(--color-primary) 20%, transparent)'
	);
	const labelByKey = $derived(new Map(days.map((d) => [d.key, d.label])));
	const xTicks = $derived(thinHistogramTicks(days.map((d) => d.key)));

	function xTick(key: string): string {
		return labelByKey.get(key) ?? key;
	}

	function yTick(n: number): string {
		return scale.unit === 'min' ? `${n}m` : `${n}h`;
	}
</script>

<section
	class={[
		'vynno-chart flex flex-col rounded-lg border border-outline-variant bg-surface-container p-4',
		className ?? 'h-64 lg:h-[300px]'
	]}
	aria-label={regionLabel}
>
	<div class="mb-4 flex shrink-0 items-center justify-between">
		<h2 class="text-headline-md">{title}</h2>
		{#if !empty}
			<div class="flex items-center gap-2">
				<span
					class="h-2 w-2 rounded-sm {barColor ? '' : 'bg-primary'}"
					style:background-color={barColor}
					aria-hidden="true"
				></span>
				<span class="text-body-sm text-on-surface-variant">{unitLabel}</span>
			</div>
		{/if}
	</div>

	<ul class="sr-only">
		{#each days as day (day.key)}
			<li>
				{day.label}: {formatCompact(day.ms)}{day.isToday ? m.dashboard_today_paren() : ''}
			</li>
		{/each}
	</ul>

	<div class="min-h-0 flex-1">
		{#if empty}
			<p
				class="flex h-full items-center justify-center text-center text-body-sm text-on-surface-variant"
			>
				{m.dashboard_not_enough_data()}
			</p>
		{:else if lc}
			{const BarChart = $derived(lc.BarChart)}
			{const Tooltip = $derived(lc.Tooltip)}
			<BarChart
				class="h-full min-h-0 w-full text-on-surface-variant"
				data={chartData}
				x="key"
				y="value"
				yDomain={[0, scale.domainMax]}
				c={(d: ChartPoint) => (d.isToday ? 'today' : 'other')}
				cDomain={['today', 'other']}
				cRange={[fillToday, fillOther]}
				motion="none"
				legend={false}
				rule={true}
				grid={{ x: false, y: true }}
				bandPadding={days.length > 14 ? 0.18 : 0.32}
				padding={{ top: 8, right: 4, bottom: 0, left: 28 }}
				series={[{ key: 'value', label: unitLabel, value: 'value' }]}
				props={{
					bars: { radius: 2, strokeWidth: 0, stroke: 'transparent' },
					xAxis: { format: xTick, ticks: xTicks, tickMarks: false, tickLength: 0 },
					yAxis: { format: yTick, tickMarks: false, tickLength: 0 },
					grid: { x: false, y: { stroke: 'var(--color-outline-variant)', opacity: 0.7 } }
				}}
			>
				{#snippet tooltip({ context })}
					<Tooltip.Root {context}>
						{#snippet children({ data }: { data: ChartPoint })}
							<Tooltip.Header value="{data.label}{data.isToday ? m.dashboard_today_paren() : ''}" />
							<Tooltip.List>
								<Tooltip.Item label={unitLabel} value={formatCompact(data.ms)} />
							</Tooltip.List>
						{/snippet}
					</Tooltip.Root>
				{/snippet}
			</BarChart>
		{/if}
	</div>
</section>
