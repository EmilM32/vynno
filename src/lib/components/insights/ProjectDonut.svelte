<script lang="ts">
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

	const gradient = $derived.by(() => {
		if (items.length === 0 || totalMs <= 0) {
			return 'conic-gradient(var(--color-surface-variant) 0deg 360deg)';
		}
		let acc = 0;
		const parts: string[] = [];
		for (const item of items) {
			const start = (acc / totalMs) * 360;
			acc += item.ms;
			const end = (acc / totalMs) * 360;
			parts.push(`${item.color} ${start}deg ${end}deg`);
		}
		return `conic-gradient(${parts.join(', ')})`;
	});
</script>

<section
	class="flex h-96 flex-col rounded-lg border border-outline-variant bg-surface-container p-6"
	aria-label={m.insights_time_by_project_aria()}
>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-headline-md text-on-surface">{m.insights_time_by_project()}</h2>
	</div>

	<div class="relative flex w-full flex-1 items-center justify-center pb-4">
		<div
			class="relative h-48 w-48 rounded-full"
			style:background={gradient}
			role="img"
			aria-label={m.insights_project_distribution_aria({ total: formatHoursMinutes(totalMs) })}
		>
			<div
				class="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-surface-container"
			>
				<span class="font-mono text-code-display text-on-surface"
					>{formatHoursMinutes(totalMs)}</span
				>
				<span class="font-mono text-code-label text-on-surface-variant">{m.insights_total()}</span>
			</div>
		</div>
	</div>

	<div class="mt-4 grid grid-cols-2 gap-2 border-t border-outline-variant pt-4">
		{#each items as item (item.id)}
			<div class="flex items-center gap-2">
				<div class="h-3 w-3 shrink-0 rounded-sm" style:background-color={item.color}></div>
				<span class="truncate font-mono text-code-label text-on-surface-variant">
					{item.label}
					<span class="text-on-surface-variant">· {item.percent}%</span>
				</span>
			</div>
		{/each}
		{#if items.length === 0}
			<span class="col-span-2 text-body-sm text-on-surface-variant">{m.insights_no_data()}</span>
		{/if}
	</div>
</section>
