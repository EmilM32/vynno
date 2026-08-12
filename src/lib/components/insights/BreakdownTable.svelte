<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { formatCompact } from '$lib/time/duration';
	import type { BreakdownRow } from '$lib/time/aggregates';

	let { rows }: { rows: BreakdownRow[] } = $props();
</script>

<section
	class="mt-0 overflow-hidden rounded-lg border border-outline-variant bg-surface-container"
	aria-label={m.insights_breakdown_aria()}
>
	<div class="border-b border-outline-variant p-4">
		<h2 class="text-headline-md text-on-surface">{m.insights_breakdown()}</h2>
	</div>

	<div class="flex flex-col">
		<div
			class="grid grid-cols-12 gap-4 border-b border-outline-variant bg-surface-container-low px-4 py-2 font-mono text-code-label text-on-surface-variant uppercase"
		>
			<div class="col-span-6 md:col-span-4">{m.insights_col_project()}</div>
			<div class="col-span-4 hidden md:col-span-3 md:block">{m.insights_col_activity()}</div>
			<div class="col-span-4 md:col-span-3">{m.insights_col_duration()}</div>
			<div class="col-span-2 text-right md:col-span-2">%</div>
		</div>

		{#if rows.length === 0}
			<p class="p-4 text-body-sm text-on-surface-variant">{m.insights_no_rows()}</p>
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
