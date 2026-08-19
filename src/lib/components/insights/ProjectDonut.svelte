<script lang="ts">
	import { resolve } from '$app/paths';
	import { PieChart, Tooltip } from 'layerchart';
	import { m } from '$lib/paraglide/messages.js';
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
</script>

<section
	class="vynno-chart flex h-96 flex-col rounded-lg border border-outline-variant bg-surface-container p-6"
	aria-label={m.insights_time_by_project_aria()}
>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-headline-md text-on-surface">{m.insights_time_by_project()}</h2>
	</div>

	<div
		class="relative flex min-h-0 w-full flex-1 items-center justify-center"
		role="img"
		aria-label={m.insights_project_distribution_aria({ total: formatHoursMinutes(totalMs) })}
	>
		{#if items.length === 0 || totalMs <= 0}
			<div class="h-48 w-48 rounded-full bg-surface-variant" aria-hidden="true"></div>
			<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
				<span class="font-mono text-code-display text-on-surface"
					>{formatHoursMinutes(totalMs)}</span
				>
				<span class="font-mono text-code-label text-on-surface-variant">{m.insights_total()}</span>
			</div>
		{:else}
			<PieChart
				class="h-full w-full"
				data={items}
				key="id"
				label="label"
				value="ms"
				c="color"
				innerRadius={0.64}
				padAngle={0.02}
				motion="none"
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
			<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
				<span class="font-mono text-code-display text-on-surface"
					>{formatHoursMinutes(totalMs)}</span
				>
				<span class="font-mono text-code-label text-on-surface-variant">{m.insights_total()}</span>
			</div>
		{/if}
	</div>

	<div class="mt-4 grid grid-cols-2 gap-2 border-t border-outline-variant pt-4">
		{#each items as item (item.id)}
			<a
				href={resolve(`/projects/${encodeURIComponent(item.id)}`)}
				class="focus-ring flex items-center gap-2 rounded-sm"
				aria-label={m.insights_open_project({ name: item.label })}
			>
				<div class="h-3 w-3 shrink-0 rounded-sm" style:background-color={item.color}></div>
				<span class="truncate font-mono text-code-label text-on-surface-variant">
					{item.label}
					<span class="text-on-surface-variant">· {item.percent}%</span>
				</span>
			</a>
		{/each}
		{#if items.length === 0}
			<span class="col-span-2 text-body-sm text-on-surface-variant">{m.insights_no_data()}</span>
		{/if}
	</div>
</section>
