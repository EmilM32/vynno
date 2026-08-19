<script lang="ts">
	import { BarChart, Tooltip } from 'layerchart';
	import { m } from '$lib/paraglide/messages.js';
	import { useSession } from '$lib/stores/session.svelte';
	import { hoursScale, type WeekDayTotal } from '$lib/time/aggregates';
	import { formatHoursDecimal } from '$lib/time/duration';

	type ChartPoint = WeekDayTotal & { hours: number };

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

	const days = $derived(daysProp ?? sessionStore.weekDayTotals);
	const title = $derived(heading ?? m.dashboard_weekly_overview());
	const regionLabel = $derived(ariaLabel ?? m.dashboard_weekly_overview_aria());
	const chartData = $derived(days.map((d) => ({ ...d, hours: d.ms / 3_600_000 })));
	const maxMs = $derived(Math.max(0, ...days.map((d) => d.ms)));
	const scaleHours = $derived(hoursScale(maxMs));
	const fillToday = $derived(barColor ?? 'var(--color-primary)');
	const fillOther = $derived(
		barColor ? `${barColor}33` : 'color-mix(in oklab, var(--color-primary) 20%, transparent)'
	);
	const labelByKey = $derived(new Map(days.map((d) => [d.key, d.label])));

	function xTick(key: string): string {
		return labelByKey.get(key) ?? key;
	}

	function yTick(hours: number): string {
		return `${hours}h`;
	}
</script>

<section
	class={[
		'vynno-chart flex flex-col rounded-lg border border-outline-variant bg-surface-container p-4',
		className ?? 'h-[300px]'
	]}
	aria-label={regionLabel}
>
	<div class="mb-4 flex shrink-0 items-center justify-between">
		<h2 class="text-headline-md">{title}</h2>
		<div class="flex items-center gap-2">
			<span
				class="h-2 w-2 rounded-sm {barColor ? '' : 'bg-primary'}"
				style:background-color={barColor}
				aria-hidden="true"
			></span>
			<span class="text-body-sm text-on-surface-variant">{m.dashboard_hours()}</span>
		</div>
	</div>

	<ul class="sr-only">
		{#each days as day (day.key)}
			<li>
				{day.label}: {formatHoursDecimal(day.ms)}{day.isToday ? m.dashboard_today_paren() : ''}
			</li>
		{/each}
	</ul>

	<div class="min-h-0 flex-1">
		<BarChart
			class="h-full min-h-0 w-full text-on-surface-variant"
			data={chartData}
			x="key"
			y="hours"
			yDomain={[0, scaleHours]}
			c={(d: ChartPoint) => (d.isToday ? 'today' : 'other')}
			cDomain={['today', 'other']}
			cRange={[fillToday, fillOther]}
			motion="none"
			legend={false}
			rule={true}
			grid={{ x: false, y: true }}
			bandPadding={days.length > 14 ? 0.18 : 0.32}
			padding={{ top: 8, right: 4, bottom: 0, left: 28 }}
			series={[{ key: 'hours', label: m.dashboard_hours(), value: 'hours' }]}
			props={{
				bars: { radius: 2, strokeWidth: 0, stroke: 'transparent' },
				xAxis: { format: xTick, tickMarks: false, tickLength: 0 },
				yAxis: { format: yTick, tickMarks: false, tickLength: 0 },
				grid: { x: false, y: { stroke: 'var(--color-outline-variant)', opacity: 0.7 } }
			}}
		>
			{#snippet tooltip({ context })}
				<Tooltip.Root {context}>
					{#snippet children({ data }: { data: ChartPoint })}
						<Tooltip.Header value="{data.label}{data.isToday ? m.dashboard_today_paren() : ''}" />
						<Tooltip.List>
							<Tooltip.Item label={m.dashboard_hours()} value={formatHoursDecimal(data.ms)} />
						</Tooltip.List>
					{/snippet}
				</Tooltip.Root>
			{/snippet}
		</BarChart>
	</div>
</section>
