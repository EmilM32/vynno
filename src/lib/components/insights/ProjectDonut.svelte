<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { OTHER_ID, topNWithOther } from '$lib/components/insights/legend';
	import { formatHoursMinutes } from '$lib/time/duration';
	import type { NamedTotal } from '$lib/time/aggregates';

	let {
		items,
		totalMs
	}: {
		items: NamedTotal[];
		totalMs: number;
	} = $props();

	type Slice = NamedTotal;

	/**
	 * Same reasoning as WeeklyOverview: layerchart is ~12 render-blocking CSS chunks and the bulk
	 * of this route's hydration work, so it loads after mount. The heading and the centre total
	 * stay server-rendered.
	 */
	let lc = $state.raw<typeof import('$lib/components/charts/lazy-pie') | null>(null);

	const rows = $derived(
		topNWithOther(items).map((item) =>
			item.id === OTHER_ID ? { ...item, label: m.insights_other_projects() } : item
		)
	);

	/**
	 * Layerchart's root uses `height: 100%` unless given a pixel `height`.
	 * A percentage of a flex slot collapses, so the ring is this tall on purpose
	 * (192px, above the 140px floor after the chart's own padding).
	 */
	const chartPx = 192;

	onMount(async () => {
		lc = await import('$lib/components/charts/lazy-pie');
	});
</script>

{#snippet centerTotal()}
	<div class="pointer-events-none absolute inset-0 grid place-items-center">
		<div
			class="flex aspect-square h-[58%] max-h-full flex-col items-center justify-center text-center"
		>
			<span class="font-mono text-xl font-medium whitespace-nowrap text-on-surface tabular-nums"
				>{formatHoursMinutes(totalMs)}</span
			>
			<span class="font-mono text-code-label text-on-surface-variant">{m.insights_total()}</span>
		</div>
	</div>
{/snippet}

<section
	class="vynno-chart flex min-h-64 flex-col rounded-lg border border-outline-variant bg-surface-container p-6 lg:min-h-96"
	aria-label={m.insights_time_by_project_aria()}
>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-headline-md text-on-surface">{m.insights_time_by_project()}</h2>
	</div>

	<div
		class="relative w-full shrink-0"
		style:height={chartPx + 'px'}
		style:min-height={chartPx + 'px'}
		role="img"
		aria-label={m.insights_project_distribution_aria({ total: formatHoursMinutes(totalMs) })}
	>
		{#if items.length === 0 || totalMs <= 0}
			<div class="absolute inset-0 flex items-center justify-center" aria-hidden="true">
				<div class="aspect-square h-[calc(100%-1rem)] rounded-full bg-surface-variant"></div>
			</div>
		{:else if lc}
			{const PieChart = $derived(lc.PieChart)}
			{const Tooltip = $derived(lc.Tooltip)}
			<PieChart
				class="w-full"
				height={chartPx}
				data={rows}
				key="id"
				label="label"
				value="ms"
				c="color"
				innerRadius={0.68}
				padAngle={0.02}
				legend={false}
				padding={8}
			>
				{#snippet tooltip({ context })}
					<Tooltip.Root {context}>
						{#snippet children({ data }: { data: Slice })}
							<Tooltip.Header value={data.label} color={data.color} />
							<Tooltip.List>
								<Tooltip.Item
									label={m.insights_total()}
									value="{formatHoursMinutes(data.ms)} · {data.percent}%"
									color={data.color}
								/>
							</Tooltip.List>
						{/snippet}
					</Tooltip.Root>
				{/snippet}
			</PieChart>
		{/if}
		{@render centerTotal()}
	</div>

	<div class="mt-4 grid min-w-0 grid-cols-2 gap-2 border-t border-outline-variant pt-4">
		{#each rows as item (item.id)}
			{#if item.id === OTHER_ID}
				<div class="flex min-w-0 items-center gap-2">
					<div class="h-3 w-3 shrink-0 rounded-sm" style:background-color={item.color}></div>
					<span class="truncate font-mono text-code-label text-on-surface-variant">
						<bdi>{item.label}</bdi>
						<span class="text-on-surface-variant">· {item.percent}%</span>
					</span>
				</div>
			{:else}
				<a
					href={resolve(`/projects/${encodeURIComponent(item.id)}`)}
					class="focus-ring flex min-w-0 items-center gap-2 rounded-sm"
					aria-label={m.insights_open_project({ name: item.label })}
				>
					<div class="h-3 w-3 shrink-0 rounded-sm" style:background-color={item.color}></div>
					<span class="truncate font-mono text-code-label text-on-surface-variant">
						<bdi>{item.label}</bdi>
						<span class="text-on-surface-variant">· {item.percent}%</span>
					</span>
				</a>
			{/if}
		{/each}
		{#if items.length === 0}
			<span class="col-span-2 text-body-sm text-on-surface-variant">{m.insights_no_data()}</span>
		{/if}
	</div>
</section>
