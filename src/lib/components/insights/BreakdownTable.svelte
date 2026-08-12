<script lang="ts">
	import { formatCompact } from '$lib/time/duration';
	import type { BreakdownRow } from '$lib/time/aggregates';

	let { rows }: { rows: BreakdownRow[] } = $props();
</script>

<section
	class="mt-0 overflow-hidden rounded-lg border border-outline-variant bg-surface-container"
	aria-label="Activity breakdown"
>
	<div class="border-b border-outline-variant p-4">
		<h2 class="text-headline-md text-on-surface">Activity Breakdown</h2>
	</div>

	<div class="flex flex-col">
		<div
			class="grid grid-cols-12 gap-4 border-b border-outline-variant bg-surface-container-low px-4 py-2 font-mono text-code-label text-on-surface-variant uppercase"
		>
			<div class="col-span-6 md:col-span-4">Project</div>
			<div class="col-span-4 hidden md:col-span-3 md:block">Activity</div>
			<div class="col-span-4 md:col-span-3">Duration</div>
			<div class="col-span-2 text-right md:col-span-2">%</div>
		</div>

		{#if rows.length === 0}
			<p class="p-4 text-body-sm text-on-surface-variant">No rows for this period.</p>
		{:else}
			{#each rows as row, i (row.projectId + row.activityType)}
				<div
					class="grid grid-cols-12 items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-container-high {i <
					rows.length - 1
						? 'border-b border-outline-variant'
						: ''}"
				>
					<div
						class="col-span-6 flex items-center gap-2 font-mono text-code-data text-on-surface md:col-span-4"
					>
						<div
							class="h-2 w-2 shrink-0 rounded-full"
							style:background-color={row.projectColor}
							aria-hidden="true"
						></div>
						<span class="truncate">{row.projectName}</span>
					</div>
					<div
						class="col-span-4 hidden font-mono text-code-label text-on-surface-variant md:col-span-3 md:block"
					>
						{row.activityLabel}
					</div>
					<div class="col-span-4 font-mono text-code-data text-on-surface md:col-span-3">
						{formatCompact(row.ms)}
					</div>
					<div
						class="col-span-2 text-right font-mono text-code-data text-on-surface-variant md:col-span-2"
					>
						{row.percent}%
					</div>
				</div>
			{/each}
		{/if}
	</div>
</section>
